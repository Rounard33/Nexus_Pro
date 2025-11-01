import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';

// URL de base de votre API
// En local avec Vercel CLI : http://localhost:3000/api
// En production : remplacez par votre URL Vercel
// Pour tester en local, vous pouvez utiliser : 'http://localhost:3000/api'
// En production après déploiement Vercel : 'https://votre-app.vercel.app/api'
const API_URL = 'http://localhost:3000/api'; // TODO: À remplacer par votre URL Vercel en production

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

@Injectable({
  providedIn: 'root'
})
export class ContentService {
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
}

