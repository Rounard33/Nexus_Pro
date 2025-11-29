import {Injectable} from '@angular/core';
import {LoyaltyReward} from '../models/clients.model';

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
   * @returns Notes formatées avec les récompenses (préserve les autres blocs comme les ventes additionnelles)
   */
  formatNotesWithRewards(originalNotes: string | undefined, rewards: LoyaltyReward[]): string {
    let notes = originalNotes || '';
    
    // Supprimer uniquement l'ancien bloc de récompenses s'il existe
    const regex = new RegExp(
      `\\${this.LOYALTY_TAG_START}.*?\\${this.LOYALTY_TAG_END}`,
      's'
    );
    notes = notes.replace(regex, '').trim();
    
    // Ajouter le nouveau bloc de récompenses
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

  /**
   * Compte le nombre de cycles de fidélité complétés
   * Un cycle est complet quand les 2 récompenses (discount + gift) ont été données
   * @param rewards Liste des récompenses
   * @returns Nombre de cycles complétés
   */
  countCompletedCycles(rewards: LoyaltyReward[]): number {
    const discountCount = rewards.filter(r => r.type === 'discount').length;
    const giftCount = rewards.filter(r => r.type === 'gift').length;
    // Un cycle complet = 1 discount + 1 gift
    return Math.min(discountCount, giftCount);
  }

  /**
   * Calcule les points de fidélité disponibles après déduction des cycles complétés
   * @param totalPoints Total des points (séances + parrainages)
   * @param rewards Liste des récompenses
   * @param threshold Seuil pour un cycle (défaut: 10)
   * @returns Points disponibles dans le cycle actuel
   */
  getAvailablePoints(totalPoints: number, rewards: LoyaltyReward[], threshold: number = 10): number {
    const completedCycles = this.countCompletedCycles(rewards);
    const usedPoints = completedCycles * threshold;
    return Math.max(0, totalPoints - usedPoints);
  }

  /**
   * Vérifie si le cycle actuel a une récompense en attente
   * @param rewards Liste des récompenses
   * @returns 'discount' si la réduction est en attente, 'gift' si le cadeau est en attente, null si rien
   */
  getPendingRewardInCurrentCycle(rewards: LoyaltyReward[]): 'discount' | 'gift' | null {
    const discountCount = rewards.filter(r => r.type === 'discount').length;
    const giftCount = rewards.filter(r => r.type === 'gift').length;
    
    // Si discount > gift, c'est le cadeau qui est en attente
    if (discountCount > giftCount) return 'gift';
    // Si gift > discount, c'est la réduction qui est en attente
    if (giftCount > discountCount) return 'discount';
    // Sinon, rien n'est en attente (soit les deux sont faits, soit aucun)
    return null;
  }
}