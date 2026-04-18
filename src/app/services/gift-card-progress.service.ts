import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {AdditionalSale} from '../models/clients.model';
import {Appointment, ContentService, Prestation} from './content.service';
import {AdditionalSalesService} from './additional-sales.service';
import {parseEuroAmountFromLabel} from '../utils/accounting-revenue.utils';

export type GiftCardCompleteOptions = {
  /** Montant saisi pour le mode « mixte » (€ prélevés sur carte). */
  mixteGiftEur?: number;
};

function normalizeGiftCardSale(s: AdditionalSale): AdditionalSale {
  if (s.type !== 'gift_card') {
    return s;
  }
  const amt = Math.round((s.giftCardAmount ?? 0) * 100) / 100;
  const cons = [...(s.gift_card_consumptions || [])];
  const sumConsumed = cons.reduce((a, c) => a + (c.amount_eur || 0), 0);
  let remaining = s.gift_card_remaining_eur;
  if (remaining == null) {
    remaining = Math.max(0, Math.round((amt - sumConsumed) * 100) / 100);
  } else {
    remaining = Math.max(0, Math.round(remaining * 100) / 100);
  }
  return {...s, gift_card_consumptions: cons, gift_card_remaining_eur: remaining};
}

function isAppointmentInForfaitCount(sales: AdditionalSale[], apptId: string): boolean {
  for (const s of sales) {
    if (s.type !== 'forfait') {
      continue;
    }
    if ((s.forfait_counted_appointment_ids || []).includes(apptId)) {
      return true;
    }
  }
  return false;
}

@Injectable({providedIn: 'root'})
export class GiftCardProgressService {
  constructor(
    private contentService: ContentService,
    private additionalSalesService: AdditionalSalesService
  ) {}

  /**
   * À appeler après forfait (mise à jour notes client).
   * Consomme le solde carte cadeau selon le mode de paiement du RDV terminé.
   */
  syncAfterAppointmentStatusChange(
    appointment: Appointment,
    previousStatus: Appointment['status'],
    newStatus: Appointment['status'],
    opts?: GiftCardCompleteOptions
  ): Observable<{updated: boolean; message?: string}> {
    const email = (appointment.client_email || '').trim().toLowerCase();
    const apptId = appointment.id;
    if (!email || !apptId) {
      return of({updated: false});
    }

    const becameCompleted = newStatus === 'completed' && previousStatus !== 'completed';
    const leftCompleted = previousStatus === 'completed' && newStatus !== 'completed';

    if (!becameCompleted && !leftCompleted) {
      return of({updated: false});
    }

    return this.contentService.getPrestations().pipe(
      switchMap((prestations) =>
        this.contentService.getClientByEmail(email).pipe(
          switchMap((client) => {
            let sales = this.additionalSalesService
              .parseAdditionalSales(client.notes)
              .map((s) => normalizeGiftCardSale(s));

            if (becameCompleted) {
              const pm = appointment.payment_method;
              if (pm !== 'carte_cadeau' && pm !== 'mixte') {
                return of({updated: false});
              }

              const result = this.applyGiftCardCompletionToSales(
                sales,
                apptId,
                appointment,
                prestations,
                pm,
                opts?.mixteGiftEur
              );
              sales = result.sales;
              if (!result.changed) {
                return of({updated: false});
              }
              const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
              return this.contentService.updateClient(email, {notes: newNotes}).pipe(
                map(() => ({updated: true, message: result.message}))
              );
            }

            const result = this.revertGiftCardCompletionFromSales(sales, apptId);
            sales = result.sales;
            if (!result.changed) {
              return of({updated: false});
            }
            const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
            return this.contentService.updateClient(email, {notes: newNotes}).pipe(
              map(() => ({updated: true, message: result.message}))
            );
          })
        )
      ),
      catchError(() => of({updated: false}))
    );
  }

  /** Prélève la carte cadeau sur une copie des ventes (sans I/O). */
  applyGiftCardCompletionToSales(
    sales: AdditionalSale[],
    apptId: string,
    appointment: Appointment,
    prestations: Prestation[],
    paymentMethod: 'carte_cadeau' | 'mixte',
    mixteGiftEur?: number
  ): {sales: AdditionalSale[]; changed: boolean; message?: string} {
    if (isAppointmentInForfaitCount(sales, apptId)) {
      return {sales, changed: false};
    }

    const next = sales.map((s) => normalizeGiftCardSale({...s}));
    for (const s of next) {
      if (s.type === 'gift_card' && (s.gift_card_consumptions || []).some((c) => c.appointment_id === apptId)) {
        return {sales: next, changed: false};
      }
    }

    const prestationPrice = this.getPrestationPrice(appointment, prestations);
    if (prestationPrice <= 0) {
      return {sales: next, changed: false};
    }

    let targetFromCard = 0;
    if (paymentMethod === 'carte_cadeau') {
      targetFromCard = prestationPrice;
    } else {
      const g = mixteGiftEur ?? 0;
      targetFromCard = Math.min(prestationPrice, Math.max(0, Math.round(g * 100) / 100));
    }

    if (targetFromCard <= 0) {
      return {sales: next, changed: false};
    }

    const giftSorted = next
      .map((s, idx) => ({s, idx}))
      .filter((x) => x.s.type === 'gift_card');
    giftSorted.sort((a, b) => (a.s.date || '').localeCompare(b.s.date || ''));

    let need = Math.round(targetFromCard * 100) / 100;
    for (const {s} of giftSorted) {
      const rem = normalizeGiftCardSale(s).gift_card_remaining_eur ?? 0;
      const take = Math.min(rem, need);
      need = Math.round((need - take) * 100) / 100;
      if (need <= 0) {
        break;
      }
    }
    if (need > 0.009) {
      return {
        sales: next,
        changed: false,
        message: `Solde carte cadeau insuffisant (il manque ${need.toFixed(2)}€).`
      };
    }

    let toCover = Math.round(targetFromCard * 100) / 100;
    const messages: string[] = [];

    for (const {s, idx} of giftSorted) {
      if (toCover <= 0) {
        break;
      }
      const sale = normalizeGiftCardSale({...next[idx]});
      let rem = sale.gift_card_remaining_eur ?? 0;
      if (rem <= 0) {
        continue;
      }
      const take = Math.round(Math.min(rem, toCover) * 100) / 100;
      if (take <= 0) {
        continue;
      }
      const cons = [...(sale.gift_card_consumptions || [])];
      cons.push({appointment_id: apptId, amount_eur: take});
      const newRemaining = Math.round((rem - take) * 100) / 100;
      next[idx] = {
        ...sale,
        gift_card_consumptions: cons,
        gift_card_remaining_eur: Math.max(0, newRemaining)
      };
      toCover = Math.round((toCover - take) * 100) / 100;
      messages.push(`${take}€`);
    }

    if (messages.length === 0 || toCover > 0.009) {
      return {sales: next, changed: false};
    }

    return {
      sales: next.map((s) => normalizeGiftCardSale(s)),
      changed: true,
      message: `Carte cadeau : ${messages.join(' + ')} prélevé(s).`
    };
  }

  revertGiftCardCompletionFromSales(
    sales: AdditionalSale[],
    apptId: string
  ): {sales: AdditionalSale[]; changed: boolean; message?: string} {
    const next = sales.map((s) => normalizeGiftCardSale({...s}));
    let changed = false;
    const messages: string[] = [];

    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s.type !== 'gift_card') {
        continue;
      }
      const cons = s.gift_card_consumptions || [];
      const found = cons.find((c) => c.appointment_id === apptId);
      if (!found) {
        continue;
      }
      const amount = found.amount_eur || 0;
      const newCons = cons.filter((c) => c.appointment_id !== apptId);
      const rem = s.gift_card_remaining_eur ?? 0;
      const cap = s.giftCardAmount ?? 0;
      const newRemaining = Math.min(cap, Math.round((rem + amount) * 100) / 100);
      next[i] = {
        ...s,
        gift_card_consumptions: newCons,
        gift_card_remaining_eur: newRemaining
      };
      changed = true;
      messages.push(`${amount}€ rétabli(s)`);
    }

    if (!changed) {
      return {sales: next, changed: false};
    }

    return {
      sales: next.map((s) => normalizeGiftCardSale(s)),
      changed: true,
      message: messages.length ? `Carte cadeau : ${messages.join(', ')}.` : undefined
    };
  }

  private getPrestationPrice(appointment: Appointment, prestations: Prestation[]): number {
    const pid = appointment.prestation_id?.trim();
    if (!pid) {
      return 0;
    }
    const p = prestations.find((x) => x.id === pid);
    if (!p?.price) {
      return 0;
    }
    return parseEuroAmountFromLabel(p.price);
  }
}
