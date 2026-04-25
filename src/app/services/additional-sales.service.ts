import {Injectable} from '@angular/core';
import {AdditionalSale} from '../models/clients.model';

export type CreateSaleParams =
  | {
      type: 'creation';
      creationId: string;
      creationName: string;
      creationAmountEur: number;
      notes?: string;
    }
  | {
      type: 'gift_card';
      giftCardAmount: number;
      notes?: string;
    }
  | {
      type: 'forfait';
      forfaitId: string;
      forfaitName: string;
      forfaitPriceLabel?: string;
      /** Nombre de séances (depuis le catalogue) */
      sessionsTotal: number;
      notes?: string;
    };

@Injectable({ providedIn: 'root' })
export class AdditionalSalesService {
  private readonly SALES_TAG_START = '[ADDITIONAL_SALES]';
  private readonly SALES_TAG_END = '[/ADDITIONAL_SALES]';

  /**
   * Parse les ventes additionnelles depuis les notes du client
   * @param notes Notes du client contenant potentiellement les ventes
   * @returns Tableau des ventes additionnelles
   */
  parseAdditionalSales(notes: string | undefined): AdditionalSale[] {
    if (!notes) return [];

    try {
      const regex = new RegExp(
        `\\${this.SALES_TAG_START}(.*?)\\${this.SALES_TAG_END}`,
        's'
      );
      const match = notes.match(regex);
      if (match) {
        const parsed = JSON.parse(match[1]) as AdditionalSale[];
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // Erreur de parsing silencieuse
    }

    return [];
  }

  /**
   * Formate les notes avec les ventes additionnelles
   * @param originalNotes Notes originales du client
   * @param sales Liste des ventes à inclure
   * @returns Notes formatées avec les ventes (préserve les autres blocs comme les récompenses de fidélité)
   */
  formatNotesWithSales(originalNotes: string | undefined, sales: AdditionalSale[]): string {
    let notes = originalNotes || '';

    // Supprimer uniquement l'ancien bloc de ventes s'il existe
    const regex = new RegExp(
      `\\${this.SALES_TAG_START}.*?\\${this.SALES_TAG_END}`,
      's'
    );
    notes = notes.replace(regex, '').trim();

    // Ajouter le nouveau bloc de ventes
    if (sales.length > 0) {
      const salesJson = JSON.stringify(sales);
      const salesBlock = `${this.SALES_TAG_START}${salesJson}${this.SALES_TAG_END}`;
      notes = notes ? `${notes}\n\n${salesBlock}` : salesBlock;
    }

    return notes;
  }

  createSale(params: CreateSaleParams): AdditionalSale {
    const sale: AdditionalSale = {
      date: new Date().toISOString().split('T')[0],
      type: params.type
    };

    if (params.type === 'creation') {
      sale.creationId = params.creationId;
      sale.creationName = params.creationName;
      sale.creationAmountEur = Math.max(0, Math.round(params.creationAmountEur * 100) / 100);
    } else if (params.type === 'gift_card') {
      if (params.giftCardAmount != null && params.giftCardAmount > 0) {
        sale.giftCardAmount = params.giftCardAmount;
        sale.gift_card_remaining_eur = Math.round(params.giftCardAmount * 100) / 100;
        sale.gift_card_consumptions = [];
      }
    } else {
      sale.forfaitId = params.forfaitId;
      sale.forfaitName = params.forfaitName;
      if (params.forfaitPriceLabel) {
        sale.forfaitPriceLabel = params.forfaitPriceLabel;
      }
      sale.forfait_sessions_total = Math.max(1, params.sessionsTotal);
      sale.forfait_sessions_used = 0;
      sale.forfait_counted_appointment_ids = [];
    }

    if (params.notes?.trim()) {
      sale.notes = params.notes.trim();
    }

    return sale;
  }
}
