import {HttpClient, HttpHeaders} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {from, Observable, of, throwError} from 'rxjs';
import {catchError, map, switchMap} from 'rxjs/operators';
import {environment} from '../../environments/environment';
import {AuthService} from './auth.service';

const API_URL = environment.apiUrl;

/** Unifie la clé de montant (API / intermédiaires) pour le front. */
function mapAppointmentResponse(row: Appointment | any): Appointment {
  if (row == null) {
    return row;
  }
  const s = (row as any).session_amount_eur ?? (row as any).sessionAmountEur;
  if (s !== undefined && s !== null) {
    return {...row, session_amount_eur: s} as Appointment;
  }
  return row as Appointment;
}

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
  image_url?: string | null;
  /** Faux = masqué sur le site (liste admin inchangée). */
  is_active?: boolean;
  display_order?: number;
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

export interface BlockedSlot {
  id?: string;
  blocked_date: string;
  start_time: string;
  reason?: string;
  created_at?: string;
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
  status: 'pending' | 'accepted' | 'completed' | 'rejected' | 'cancelled';
  /** `carte_cadeau` = séance entièrement couverte par solde carte ; `mixte` = partie carte + complément (cf. prélèvement en notes client). */
  payment_method?: 'espèces' | 'carte' | 'virement' | 'chèque' | 'carte_cadeau' | 'mixte' | null;
  /** Moyen de paiement du complément hors solde carte lorsque `payment_method` = `mixte`. Colonne Supabase : `mixte_complement_payment_method`. */
  mixte_complement_payment_method?:
    | 'espèces'
    | 'carte'
    | 'virement'
    | 'chèque'
    | null;
  /**
   * Montant de la séance pour ce RDV (€). NULL/undefined = prix issu de la prestation.
   */
  session_amount_eur?: number | null;
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

export interface GiftCard {
  id?: string;
  buyer_name: string;
  recipient_name: string;
  /** Stockés en base pour relier la carte aux fiches clients (ventes additionnelles). */
  buyer_email?: string | null;
  recipient_email?: string | null;
  purchase_date: string;
  valid_until: string;
  service_label: string;
  used: boolean;
  notes?: string | null;
  created_at?: string;
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

  // Créations (site public : actives uniquement)
  getCreations(): Observable<Creation[]> {
    return this.http.get<Creation[]>(`${API_URL}/creations`);
  }

  /** Liste complète (admin) : toutes les lignes, Bearer requis. */
  getCreationsForAdmin(): Observable<Creation[]> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });
        return this.http.get<Creation[]>(`${API_URL}/creations`, {headers});
      })
    );
  }

  createCreation(row: {
    name: string;
    price: string;
    description: string;
    image_url?: string | null;
    is_active?: boolean;
    display_order?: number;
  }): Observable<Creation> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<Creation>(`${API_URL}/creations`, row, {headers});
      })
    );
  }

  updateCreation(
    id: string,
    updates: Partial<Pick<Creation, 'name' | 'price' | 'description' | 'image_url' | 'is_active' | 'display_order'>>
  ): Observable<Creation> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.patch<Creation>(`${API_URL}/creations?id=${encodeURIComponent(id)}`, updates, {headers});
      })
    );
  }

  deleteCreation(id: string): Observable<void> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap((token) => {
        const headers = new HttpHeaders({
          Authorization: `Bearer ${token}`
        });
        return this.http.delete<void>(`${API_URL}/creations?id=${encodeURIComponent(id)}`, {headers});
      })
    );
  }

  /**
   * Téléverse une image (admin) via l’API : vérification JWT + table `admin` côté serveur,
   * écriture Storage avec le service role (pas de RLS navigateur).
   */
  uploadCreationImage(file: File): Observable<{ path: string }> {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif']);
    if (!file.type || !allowed.has(file.type)) {
      return throwError(
        () => new Error("Format d'image non pris en charge (JPG, PNG, WebP, GIF, AVIF).")
      );
    }
    if (file.size > 6 * 1024 * 1024) {
      return throwError(() => new Error('Fichier trop volumineux (6 Mo max.).'));
    }
    return from(
      new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          const s = r.result as string;
          const i = s.indexOf(',');
          resolve(i >= 0 ? s.slice(i + 1) : s);
        };
        r.onerror = () => reject(new Error('Lecture du fichier impossible'));
        r.readAsDataURL(file);
      })
    ).pipe(
      switchMap((content_base64) =>
        from(this.authService.getSessionToken()).pipe(
          switchMap((token) => {
            if (!token) {
              return throwError(() => new Error('Session expirée. Reconnectez-vous.'));
            }
            const headers = new HttpHeaders({
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            });
            return this.http.post<{ path: string }>(
              `${API_URL}/creations/upload`,
              {
                content_base64,
                content_type: file.type
              },
              { headers }
            );
          })
        )
      )
    );
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

  // Créneaux bloqués
  getBlockedSlots(startDate?: string, endDate?: string): Observable<BlockedSlot[]> {
    const params: Record<string, string> = {};
    if (startDate) params['startDate'] = startDate;
    if (endDate) params['endDate'] = endDate;
    return this.http.get<BlockedSlot[]>(`${API_URL}/blocked-slots`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  createBlockedSlot(slot: { blocked_date: string; start_time: string; reason?: string }): Observable<BlockedSlot> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<BlockedSlot>(`${API_URL}/blocked-slots`, slot, { headers });
      })
    );
  }

  deleteBlockedSlot(id: string): Observable<void> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(`${API_URL}/blocked-slots?id=${id}`, { headers });
      })
    );
  }

  deleteAppointment(id: string): Observable<void> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(`${API_URL}/appointments?id=${id}`, { headers });
      })
    );
  }

  deleteClient(id: string): Observable<void> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(`${API_URL}/clients?id=${id}`, { headers });
      })
    );
  }

  // Rendez-vous
  getAppointments(status?: string, startDate?: string, endDate?: string): Observable<Appointment[]> {
    const params: any = {};
    if (status) params.status = status;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    return this.http
      .get<Appointment[]>(`${API_URL}/appointments`, { params })
      .pipe(map((rows) => (rows || []).map((r) => mapAppointmentResponse(r))));
  }

  // Créer un rendez-vous (public, nécessite captcha)
  createAppointment(appointment: Partial<Appointment>): Observable<Appointment> {
    return this.http.post<Appointment>(`${API_URL}/appointments`, appointment);
  }

  // Créer un rendez-vous depuis l'admin (pas de captcha, email optionnel)
  createAdminAppointment(appointment: Partial<Appointment>): Observable<Appointment> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<Appointment>(`${API_URL}/appointments`, appointment, { headers });
      })
    );
  }

  // Mettre à jour un rendez-vous (requiert authentification)
  updateAppointment(id: string, updates: Partial<Appointment>): Observable<Appointment> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http
          .patch<Appointment>(`${API_URL}/appointments?id=${id}`, updates, { headers })
          .pipe(map((row) => mapAppointmentResponse(row)));
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
  getAllClients(): Observable<Client[]> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Client[]>(`${API_URL}/clients`, { headers });
      })
    );
  }

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

  // Cartes cadeaux (admin)
  getGiftCards(): Observable<GiftCard[]> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<GiftCard[]>(`${API_URL}/gift-cards`, { headers });
      })
    );
  }

  /** buyer_email / recipient_email / amount_eur : optionnels, pour mettre à jour les fiches clients (création uniquement côté API). */
  createGiftCard(
    card: Partial<GiftCard> & {
      buyer_email?: string | null;
      recipient_email?: string | null;
      amount_eur?: number | null;
    }
  ): Observable<GiftCard> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<GiftCard>(`${API_URL}/gift-cards`, card, { headers });
      })
    );
  }

  updateGiftCard(id: string, updates: Partial<GiftCard>): Observable<GiftCard> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.patch<GiftCard>(`${API_URL}/gift-cards?id=${id}`, updates, { headers });
      })
    );
  }

  deleteGiftCard(id: string): Observable<void> {
    return from(this.authService.getSessionToken()).pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(`${API_URL}/gift-cards?id=${id}`, { headers });
      })
    );
  }
}

