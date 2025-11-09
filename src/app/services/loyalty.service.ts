import {Injectable} from '@angular/core';
import {LoyaltyReward} from '../models/client.model';

@Injectable({ providedIn: 'root' })
export class LoyaltyService {
  private readonly LOYALTY_TAG_START = '[LOYALTY_REWARDS]';
  private readonly LOYALTY_TAG_END = '[/LOYALTY_REWARDS]';
  private readonly DEFAULT_THRESHOLD = 5;

  /**
   * Parse les récompenses de fidélité depuis les notes du client
   * @param notes Notes du client contenant potentiellement les récompenses
   * @returns Tableau des récompenses de fidélité
   */
  parseLoyaltyRewards(notes: string | undefined): LoyaltyReward[] {
    if (!notes) return [];
    
    try {
      const regex = new RegExp(
        `\\${this.LOYALTY_TAG_START}(.*?)\\${this.LOYALTY_TAG_END}`,
        's'
      );
      const match = notes.match(regex);
      if (match) {
        return JSON.parse(match[1]);
      }
    } catch (e) {
      console.warn('Erreur lors du parsing des récompenses:', e);
    }
    
    return [];
  }

  /**
   * Formate les notes avec les récompenses de fidélité
   * @param originalNotes Notes originales du client
   * @param rewards Liste des récompenses à inclure
   * @returns Notes formatées avec les récompenses
   */
  formatNotesWithRewards(originalNotes: string | undefined, rewards: LoyaltyReward[]): string {
    let notes = originalNotes || '';
    
    // Supprimer l'ancien bloc de récompenses s'il existe
    const regex = new RegExp(
      `\\${this.LOYALTY_TAG_START}.*?\\${this.LOYALTY_TAG_END}`,
      's'
    );
    notes = notes.replace(regex, '').trim();
    
    // Ajouter le nouveau bloc
    if (rewards.length > 0) {
      const rewardsJson = JSON.stringify(rewards);
      const rewardsBlock = `${this.LOYALTY_TAG_START}${rewardsJson}${this.LOYALTY_TAG_END}`;
      notes = notes ? `${notes}\n\n${rewardsBlock}` : rewardsBlock;
    }
    
    return notes;
  }

  /**
   * Vérifie si le client a atteint le seuil de fidélité
   * @param eligibleTreatments Nombre de soins éligibles
   * @param threshold Seuil à atteindre (défaut: 5)
   * @returns true si le seuil est atteint
   */
  hasReachedThreshold(eligibleTreatments: number, threshold: number = this.DEFAULT_THRESHOLD): boolean {
    return eligibleTreatments >= threshold;
  }

  /**
   * Calcule le nombre de soins restants avant la récompense
   * @param eligibleTreatments Nombre de soins éligibles
   * @param threshold Seuil à atteindre (défaut: 5)
   * @returns Nombre de soins restants
   */
  getRemainingTreatments(eligibleTreatments: number, threshold: number = this.DEFAULT_THRESHOLD): number {
    if (eligibleTreatments >= threshold) return 0;
    return threshold - eligibleTreatments;
  }

  /**
   * Crée une nouvelle récompense
   * @param type Type de récompense (discount ou gift)
   * @param description Description de la récompense
   * @returns Nouvelle récompense
   */
  createReward(type: 'discount' | 'gift', description: string): LoyaltyReward {
    return {
      date: new Date().toISOString().split('T')[0],
      type,
      description
    };
  }
}

