import {getForfaitCatalogEntry} from '../data/forfaits.catalog';
import {AdditionalSale} from '../models/clients.model';
import {Appointment, Client} from '../services/content.service';

/** Extrait un montant en € depuis un libellé type « 165 € » ou « 165,00 ». */
export function parseEuroAmountFromLabel(label: string | undefined | null): number {
  if (label == null || String(label).trim() === '') {
    return 0;
  }
  const n = parseFloat(String(label).replace(/[^\d,.]/g, '').replace(',', '.'));
  return !isNaN(n) && n >= 0 ? n : 0;
}

/**
 * IDs des RDV déjà rattachés à un forfait (séances prépayées, ne font pas partie du CA « à l’acte »).
 */
export function collectForfaitCountedAppointmentIds(
  parseSales: (notes: string | undefined) => AdditionalSale[],
  clients: Pick<Client, 'notes'>[]
): Set<string> {
  const ids = new Set<string>();
  for (const c of clients) {
    const sales = parseSales(c.notes);
    for (const s of sales) {
      if (s.type !== 'forfait') {
        continue;
      }
      for (const id of s.forfait_counted_appointment_ids || []) {
        const t = String(id).trim();
        if (t) {
          ids.add(t);
        }
      }
    }
  }
  return ids;
}

/**
 * Montant prélevé sur cartes cadeaux par RDV (agrégé si plusieurs cartes).
 */
export function collectGiftCardCoverageEuroByAppointment(
  parseSales: (notes: string | undefined) => AdditionalSale[],
  clients: Pick<Client, 'notes'>[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of clients) {
    const sales = parseSales(c.notes);
    for (const s of sales) {
      if (s.type !== 'gift_card') {
        continue;
      }
      for (const row of s.gift_card_consumptions || []) {
        const id = String(row.appointment_id || '').trim();
        if (!id) {
          continue;
        }
        const amt = Math.round((row.amount_eur || 0) * 100) / 100;
        m.set(id, Math.round(((m.get(id) || 0) + amt) * 100) / 100);
      }
    }
  }
  return m;
}

/** CA reconnu pour une vente additionnelle (forfait ou carte cadeau), à la date de vente. */
export function revenueFromAdditionalSale(s: AdditionalSale): number {
  if (s.type === 'gift_card' && s.giftCardAmount != null && s.giftCardAmount > 0) {
    return Math.round(s.giftCardAmount * 100) / 100;
  }
  if (s.type === 'forfait') {
    let amt = parseEuroAmountFromLabel(s.forfaitPriceLabel);
    if (amt <= 0 && s.forfaitId) {
      const cat = getForfaitCatalogEntry(s.forfaitId);
      if (cat?.price) {
        amt = parseEuroAmountFromLabel(cat.price);
      }
    }
    return Math.round(amt * 100) / 100;
  }
  return 0;
}

export function sumAdditionalSalesInDateRange(
  parseSales: (notes: string | undefined) => AdditionalSale[],
  clients: Pick<Client, 'notes'>[],
  startInclusive: string,
  endInclusive: string
): { forfaits: number; giftCards: number; total: number } {
  let forfaits = 0;
  let giftCards = 0;
  for (const c of clients) {
    const sales = parseSales(c.notes);
    for (const s of sales) {
      if (!s.date || s.date < startInclusive || s.date > endInclusive) {
        continue;
      }
      if (s.type === 'forfait') {
        forfaits += revenueFromAdditionalSale(s);
      } else if (s.type === 'gift_card') {
        giftCards += revenueFromAdditionalSale(s);
      }
    }
  }
  forfaits = Math.round(forfaits * 100) / 100;
  giftCards = Math.round(giftCards * 100) / 100;
  return { forfaits, giftCards, total: Math.round((forfaits + giftCards) * 100) / 100 };
}

/**
 * Part « à l’unité » du prix d’un RDV (après forfait intégral et partie carte cadeau).
 */
export function appointmentUnitPortionEur(
  apt: Appointment,
  prestations: { id?: string; price?: string | null }[],
  forfaitCountedIds: Set<string>,
  giftCoverageByAppointment: Map<string, number>
): number {
  const aid = apt.id?.trim();
  if (aid && forfaitCountedIds.has(aid)) {
    return 0;
  }
  if (!apt.prestation_id) {
    return 0;
  }
  const prestation = prestations.find((p) => p.id === apt.prestation_id);
  if (!prestation?.price) {
    return 0;
  }
  const price = parseEuroAmountFromLabel(prestation.price);
  const giftPart = aid ? giftCoverageByAppointment.get(aid) ?? 0 : 0;
  return Math.max(0, Math.round((price - giftPart) * 100) / 100);
}

/**
 * CA des séances facturées à l’unité (hors forfait ; après déduction de la partie carte cadeau).
 */
export function sumAppointmentUnitRevenue(
  appointments: Appointment[],
  prestations: { id?: string; price?: string | null }[],
  forfaitCountedIds: Set<string>,
  giftCoverageByAppointment?: Map<string, number>
): number {
  const giftMap = giftCoverageByAppointment ?? new Map<string, number>();
  let total = 0;
  for (const apt of appointments) {
    total += appointmentUnitPortionEur(apt, prestations, forfaitCountedIds, giftMap);
  }
  return Math.round(total * 100) / 100;
}
