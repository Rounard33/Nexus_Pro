import {Appointment} from '../services/content.service';

export interface LoyaltyReward {
  date: string;
  type: 'discount' | 'gift';
  description: string;
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
  pendingAppointments: number;
  lastAppointmentDate: string | null;
  firstAppointmentDate: string | null;
  nextBirthday?: string | null;
  age?: number | null;
  eligibleTreatments?: number;
  loyaltyRewards?: LoyaltyReward[];
  lastRewardDate?: string | null;
  notes?: string;
}

export interface ClientDetail extends ClientProfile {
  rejectedAppointments: number;
  cancelledAppointments: number;
  eligibleTreatments: number;
}
