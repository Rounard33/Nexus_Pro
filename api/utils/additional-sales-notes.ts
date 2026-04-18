/**
 * Même logique que `AdditionalSalesService` (Angular) — notes clients avec bloc JSON des ventes additionnelles.
 */

export const ADDITIONAL_SALES_TAG_START = '[ADDITIONAL_SALES]';
export const ADDITIONAL_SALES_TAG_END = '[/ADDITIONAL_SALES]';

export interface AdditionalSaleRecord {
  date: string;
  type: 'creation' | 'gift_card' | 'forfait';
  creationId?: string;
  creationName?: string;
  forfaitId?: string;
  forfaitName?: string;
  forfaitPriceLabel?: string;
  forfait_sessions_total?: number;
  forfait_sessions_used?: number;
  forfait_counted_appointment_ids?: string[];
  giftCardAmount?: number;
  gift_card_remaining_eur?: number;
  gift_card_consumptions?: Array<{ appointment_id: string; amount_eur: number }>;
  gift_card_id?: string;
  used_at?: string | null;
  notes?: string;
}

export function parseAdditionalSalesFromNotes(notes: string | undefined): AdditionalSaleRecord[] {
  if (!notes) return [];
  try {
    const regex = new RegExp(
      `\\[ADDITIONAL_SALES\\](.*?)\\[/ADDITIONAL_SALES\\]`,
      's'
    );
    const match = notes.match(regex);
    if (match) {
      const parsed = JSON.parse(match[1]);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore
  }
  return [];
}

/**
 * Remplace le bloc ventes additionnelles ; préserve le reste (fidélité, texte libre).
 */
export function formatNotesWithAdditionalSales(
  originalNotes: string | undefined,
  sales: AdditionalSaleRecord[]
): string {
  let notes = originalNotes || '';
  const regex = new RegExp(`\\[ADDITIONAL_SALES\\].*?\\[/ADDITIONAL_SALES\\]`, 's');
  notes = notes.replace(regex, '').trim();
  if (sales.length > 0) {
    const salesJson = JSON.stringify(sales);
    const salesBlock = `${ADDITIONAL_SALES_TAG_START}${salesJson}${ADDITIONAL_SALES_TAG_END}`;
    notes = notes ? `${notes}\n\n${salesBlock}` : salesBlock;
  }
  return notes;
}

