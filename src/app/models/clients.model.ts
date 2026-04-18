import {Appointment} from '../services/content.service';

export interface LoyaltyReward {
  date: string;
  type: 'discount' | 'gift';
  description: string;
}

export interface AdditionalSale {
  date: string;
  type: 'creation' | 'gift_card' | 'forfait';
  creationId?: string; // ID de la création si type = 'creation'
  creationName?: string; // Nom de la création
  /** ID du forfait (catalogue) si type = 'forfait' */
  forfaitId?: string;
  /** Libellé affiché si type = 'forfait' */
  forfaitName?: string;
  /** Prix affiché (ex. « 165 € »), optionnel */
  forfaitPriceLabel?: string;
  /** Séances prévues (catalogue) — rempli à la vente */
  forfait_sessions_total?: number;
  /** Séances attribuées automatiquement aux RDV terminés éligibles */
  forfait_sessions_used?: number;
  /** IDs des RDV déjà comptés pour ce forfait (évite doublon / permet annulation) */
  forfait_counted_appointment_ids?: string[];
  giftCardAmount?: number; // Montant de la carte cadeau si type = 'gift_card'
  /** Solde restant utilisable (déduit à chaque séance terminée « carte cadeau »). */
  gift_card_remaining_eur?: number;
  /** Détail des prélèvements par RDV (compta + annulation). */
  gift_card_consumptions?: Array<{ appointment_id: string; amount_eur: number }>;
  /** UUID de la ligne `gift_cards` (mise à jour « utilisée » sur la même vente) */
  gift_card_id?: string;
  /** Date d’utilisation (YYYY-MM-DD), renseignée quand la carte est cochée utilisée */
  used_at?: string | null;
  notes?: string; // Notes optionnelles
}

export interface ClientProfile {
  id?: string; // UUID de la base (pour référence interne)
  clientId?: string; // Identifiant opaque pour les URLs
  email: string;
  name: string;
  phone?: string;
  birthdate?: string;
  appointments: Appointment[];
  totalAppointments: number;
  acceptedAppointments: number;
  completedAppointments?: number; // RDV terminés (comptent pour la fidélité)
  pendingAppointments: number;
  lastAppointmentDate: string | null;
  firstAppointmentDate: string | null;
  nextBirthday?: string | null;
  age?: number | null;
  eligibleTreatments?: number; // Nombre de séances pour la fidélité (= completed)
  referralsCount?: number; // Nombre de parrainages (personnes venues de sa part)
  loyaltyRewards?: LoyaltyReward[];
  lastRewardDate?: string | null;
  additionalSales?: AdditionalSale[];
  notes?: string;
}

export interface ClientDetail extends ClientProfile {
  completedAppointments: number;
  rejectedAppointments: number;
  cancelledAppointments: number;
  eligibleTreatments: number;
}
