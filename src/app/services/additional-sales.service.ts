import {Injectable} from '@angular/core';
import {AdditionalSale} from '../models/clients.model';

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
        return JSON.parse(match[1]);
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

  /**
   * Crée une nouvelle vente additionnelle
   * @param type Type de vente ('creation' ou 'gift_card')
   * @param creationId ID de la création (si type = 'creation')
   * @param creationName Nom de la création (si type = 'creation')
   * @param giftCardAmount Montant de la carte cadeau (si type = 'gift_card')
   * @param notes Notes optionnelles
   * @returns Nouvelle vente additionnelle
   */
  createSale(
    type: 'creation' | 'gift_card',
    creationId?: string,
    creationName?: string,
    giftCardAmount?: number,
    notes?: string
  ): AdditionalSale {
    const sale: AdditionalSale = {
      date: new Date().toISOString().split('T')[0],
      type
    };

    if (type === 'creation' && creationId && creationName) {
      sale.creationId = creationId;
      sale.creationName = creationName;
    }

    if (type === 'gift_card' && giftCardAmount) {
      sale.giftCardAmount = giftCardAmount;
    }

    if (notes) {
      sale.notes = notes;
    }

    return sale;
  }
}

