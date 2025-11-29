import {Appointment} from '../services/content.service';

export interface LoyaltyReward {
  date: string;
  type: 'discount' | 'gift';
  description: string;
}

export interface AdditionalSale {
  date: string;
  type: 'creation' | 'gift_card';
  creationId?: string; // ID de la création si type = 'creation'
  creationName?: string; // Nom de la création
  giftCardAmount?: number; // Montant de la carte cadeau si type = 'gift_card'
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
  rejectedAppointments: number;
  cancelledAppointments: number;
  eligibleTreatments: number;
}
