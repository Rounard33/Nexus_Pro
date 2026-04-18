import {Injectable} from '@angular/core';
import {Observable, of} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {getForfaitCatalogEntry, ForfaitCatalogEntry} from '../data/forfaits.catalog';
import {AdditionalSale} from '../models/clients.model';
import {Appointment, ContentService} from './content.service';
import {AdditionalSalesService} from './additional-sales.service';

/**
 * Indique si la prestation du RDV est éligible pour un forfait donné (ids OU sous-chaînes sur le nom).
 */
export function prestationMatchesForfait(
  entry: ForfaitCatalogEntry,
  prestationId: string | null | undefined,
  prestationName: string | undefined
): boolean {
  const name = (prestationName || '').toLowerCase();
  const pid = (prestationId || '').trim();

  const ids = entry.eligiblePrestationIds || [];
  if (ids.length > 0 && pid && ids.includes(pid)) {
    return true;
  }

  const subs = (entry.eligibleNameSubstrings || []).map((s) => s.toLowerCase());
  if (subs.length === 0) {
    return false;
  }
  return subs.some((s) => name.includes(s));
}

function sessionsCap(sale: AdditionalSale): number {
  if (sale.type !== 'forfait' || !sale.forfaitId) return 0;
  if (sale.forfait_sessions_total != null && sale.forfait_sessions_total > 0) {
    return sale.forfait_sessions_total;
  }
  const cat = getForfaitCatalogEntry(sale.forfaitId);
  return cat?.sessionsTotal ?? 0;
}

function sessionsUsed(sale: AdditionalSale): number {
  if (sale.type !== 'forfait') return 0;
  return Math.max(0, sale.forfait_sessions_used ?? 0);
}

@Injectable({providedIn: 'root'})
export class ForfaitProgressService {
  constructor(
    private contentService: ContentService,
    private additionalSalesService: AdditionalSalesService
  ) {}

  /**
   * À appeler après mise à jour du statut d’un rendez-vous.
   * Passe à terminé : +1 sur le premier forfait actif éligible (FIFO dans la liste des ventes).
   * Quitte terminé : annule la contribution de ce RDV si elle avait été comptée.
   */
  syncAfterAppointmentStatusChange(
    appointment: Appointment,
    previousStatus: Appointment['status'],
    newStatus: Appointment['status']
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

    const prestationName = appointment.prestations?.name;
    const prestationId = appointment.prestation_id ?? null;

    return this.contentService.getClientByEmail(email).pipe(
      switchMap((client) => {
        let sales = this.additionalSalesService.parseAdditionalSales(client.notes);

        if (becameCompleted) {
          const result = this.applyCompletionToSales(sales, apptId, prestationId, prestationName);
          sales = result.sales;
          if (!result.changed) {
            return of({updated: false});
          }
          const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
          return this.contentService.updateClient(email, {notes: newNotes}).pipe(
            map(() => ({
              updated: true,
              message: result.message
            }))
          );
        }

        const result = this.revertCompletionFromSales(sales, apptId);
        sales = result.sales;
        if (!result.changed) {
          return of({updated: false});
        }
        const newNotes = this.additionalSalesService.formatNotesWithSales(client.notes, sales);
        return this.contentService.updateClient(email, {notes: newNotes}).pipe(
          map(() => ({
            updated: true,
            message: result.message
          }))
        );
      }),
      catchError(() => of({updated: false}))
    );
  }

  /** Applique le forfait sur une copie des ventes (sans I/O). */
  applyCompletionToSales(
    sales: AdditionalSale[],
    apptId: string,
    prestationId: string | null,
    prestationName: string | undefined
  ): {sales: AdditionalSale[]; changed: boolean; message?: string} {
    const next = sales.map((s) => ({...s}));
    for (let i = 0; i < next.length; i++) {
      const s = next[i];
      if (s.type !== 'forfait' || !s.forfaitId) continue;

      const counted = s.forfait_counted_appointment_ids || [];
      if (counted.includes(apptId)) {
        return {sales: next, changed: false};
      }

      const cap = sessionsCap(s);
      const used = sessionsUsed(s);
      if (cap <= 0 || used >= cap) {
        continue;
      }

      const entry = getForfaitCatalogEntry(s.forfaitId);
      if (!entry || !prestationMatchesForfait(entry, prestationId, prestationName)) {
        continue;
      }

      s.forfait_sessions_used = used + 1;
      s.forfait_counted_appointment_ids = [...counted, apptId];
      if (s.forfait_sessions_total == null || s.forfait_sessions_total <= 0) {
        s.forfait_sessions_total = cap;
      }

      const label = s.forfaitName || 'Forfait';
      return {
        sales: next,
        changed: true,
        message: `Forfait « ${label} » : ${s.forfait_sessions_used}/${s.forfait_sessions_total} séance(s).`
      };
    }

    return {sales: next, changed: false};
  }

  revertCompletionFromSales(
    sales: AdditionalSale[],
    apptId: string
  ): {sales: AdditionalSale[]; changed: boolean; message?: string} {
    const next = sales.map((s) => ({...s}));
    for (const s of next) {
      if (s.type !== 'forfait') continue;
      const counted = s.forfait_counted_appointment_ids || [];
      if (!counted.includes(apptId)) continue;

      s.forfait_counted_appointment_ids = counted.filter((id) => id !== apptId);
      s.forfait_sessions_used = Math.max(0, sessionsUsed(s) - 1);
      const label = s.forfaitName || 'Forfait';
      return {
        sales: next,
        changed: true,
        message: `Forfait « ${label} » : compteur ajusté (RDV plus terminé).`
      };
    }
    return {sales: next, changed: false};
  }
}
