import {HttpClient, HttpHeaders} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {from, Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {environment} from '../../environments/environment';
import {AuthService} from './auth.service';

const API_URL = environment.apiUrl;

export interface Prestation {
  id?: string;
  name: string;
  price?: string;
  at_home?: string;
  price_option?: string;
  duration?: string;
  short_description?: string;
  description: string;
  image_url?: string;
  requires_contact?: boolean;
}

export interface OpeningHours {
  id?: string;
  day_of_week: number;
  day_name: string;
  periods: string;
  last_appointment?: string;
  is_active?: boolean;
  display_order?: number;
}

export interface Creation {
  id?: string;
  name: string;
  price: string;
  description: string;
  image_url?: string;
}

export interface Testimonial {
  id?: string;
  name: string;
  role?: string;
  text: string;
  avatar_url?: string;
  age?: number;
}

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  isOpen?: boolean;
}

export interface AboutContent {
  id?: string;
  section_key: string;
  title?: string;
  content: string;
  image_url?: string;
  display_order?: number;
}

export interface AvailableSlot {
  id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active?: boolean;
}

export interface BlockedDate {
  id?: string;
  blocked_date: string;
  reason?: string;
}

export interface Client {
  id?: string;
  clientId?: string; // Identifiant opaque pour les URLs
  email: string;
  name: string;
  phone?: string;
  birthdate?: string; // Format: YYYY-MM-DD
  notes?: string;
  referrals_count?: number; // Nombre de parrainages (personnes venues de sa part)
  created_at?: string;
  updated_at?: string;
}

export interface Appointment {
  id?: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  prestation_id: string | null; // Peut être null si non renseigné
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  payment_method?: 'espèces' | 'carte' | 'virement' | 'chèque' | null;
  notes?: string;
  referral_source?: string; // Source de référence : search, social, friend, advertisement, other
  referral_friend_name?: string; // Nom de la personne qui a recommandé (si referral_source = friend)
  child_age?: number; // Âge de l'enfant (obligatoire pour soins energetique maman bebe)
  created_at?: string;
  updated_at?: string;
  prestations?: {
    name: string;
    duration?: string;
  } | null; // Peut être null si la relation n'est pas chargée ou si la prestation n'existe plus
}

@Injectable({
  providedIn: 'root'
})
export class ContentService {
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  // Prestations
  getPrestations(): Observable<Prestation[]> {
    return this.http.get<Prestation[]>(`${API_URL}/prestations`);
  }

  // Créations
  getCreations(): Observable<Creation[]> {
    return this.http.get<Creation[]>(`${API_URL}/creations`);
  }

  // Témoignages
  getTestimonials(): Observable<Testimonial[]> {
    return this.http.get<Testimonial[]>(`${API_URL}/testimonials`);
  }

  // FAQ
  getFaqs(): Observable<FaqItem[]> {
    return this.http.get<FaqItem[]>(`${API_URL}/faqs`);
  }

  // About
  getAboutContent(): Observable<AboutContent[]> {
    return this.http.get<AboutContent[]>(`${API_URL}/about`);
  }

  // Horaires d'ouverture
  getOpeningHours(): Observable<OpeningHours[]> {
    return this.http.get<OpeningHours[]>(`${API_URL}/opening-hours`);
  }

  // Créneaux disponibles
  getAvailableSlots(dayOfWeek?: number): Observable<AvailableSlot[]> {
    const params: any = {};
    if (dayOfWeek !== undefined) {
      params.day_of_week = dayOfWeek.toString();
    }
    return this.http.get<AvailableSlot[]>(`${API_URL}/available-slots`, { params });
  }

  // Dates bloquées
  getBlockedDates(): Observable<BlockedDate[]> {
    return this.http.get<BlockedDate[]>(`${API_URL}/blocked-dates`);
  }

  // Rendez-vous
  getAppointments(status?: string, startDate?: string, endDate?: string): Observable<Appointment[]> {
    const params: any = {};
    if (status) params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http.get<Appointment[]>(`${API_URL}/appointments`, { params });
  }

  // Créer un rendez-vous
  createAppointment(appointment: Partial<Appointment>): Observable<Appointment> {
    return this.http.post<Appointment>(`${API_URL}/appointments`, appointment);
  }

  // Mettre à jour un rendez-vous (requiert authentification)
  updateAppointment(id: string, updates: Partial<Appointment>): Observable<Appointment> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.patch<Appointment>(`${API_URL}/appointments?id=${id}`, updates, {headers});
      })
    );
  }

  // Mettre à jour les horaires d'ouverture (requiert authentification)
  updateOpeningHours(id: string, updates: Partial<OpeningHours>): Observable<OpeningHours> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.patch<OpeningHours>(`${API_URL}/opening-hours?id=${id}`, updates, {headers});
      })
    );
  }

  // Clients
  getClientByEmail(email: string): Observable<Client> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Client>(`${API_URL}/clients?email=${encodeURIComponent(email)}`, {headers});
      })
    );
  }

  getClientById(id: string): Observable<Client> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        // Utiliser clientId (identifiant opaque) au lieu de l'UUID
        return this.http.get<Client>(`${API_URL}/clients?clientId=${encodeURIComponent(id)}`, {headers});
      })
    );
  }

  // Créer ou mettre à jour un client (requiert authentification)
  createOrUpdateClient(client: Partial<Client>): Observable<Client> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.post<Client>(`${API_URL}/clients`, client, {headers});
      })
    );
  }

  // Mettre à jour un client (requiert authentification)
  updateClient(email: string, updates: Partial<Client>): Observable<Client> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.patch<Client>(`${API_URL}/clients?email=${encodeURIComponent(email)}`, updates, {headers});
      })
    );
  }
}

