/**
 * Interface pour le payload de création d'un rendez-vous
 * Utilisé lors de la soumission du formulaire de réservation
 */
export interface AppointmentPayload {
  // Champs obligatoires
  client_name: string;
  client_email: string;
  prestation_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'accepted' | 'completed' | 'rejected';
  
  // Champs optionnels
  client_phone?: string;
  notes?: string;
  referral_source?: string;
  referral_friend_name?: string;
  child_age?: number;
  captcha_token?: string;
}

