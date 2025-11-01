import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {createClient, SupabaseClient, User} from '@supabase/supabase-js';
import {BehaviorSubject, Observable} from 'rxjs';
import {environment} from '../../environments/environment';

/**
 * Vérifie si Supabase est correctement configuré
 */
export function isSupabaseConfigured(): boolean {
  const url = environment.supabaseUrl?.trim() || '';
  const key = environment.supabaseAnonKey?.trim() || '';
  return !!(url && key);
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient | null = null;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();
  private isConfigured = false;

  constructor(private router: Router) {
    const url = environment.supabaseUrl?.trim() || '';
    const key = environment.supabaseAnonKey?.trim() || '';
    
    if (!url || !key) {
      console.warn('⚠️ Supabase URL ou Anon Key manquants. Configurez-les dans environment.ts');
      this.isConfigured = false;
      return;
    }
    
    try {
      this.supabase = createClient(url, key);
      this.isConfigured = true;
      
      // Écouter les changements de session
      this.supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          this.currentUserSubject.next(session.user);
        } else {
          this.currentUserSubject.next(null);
        }
      });

      // Initialiser la session actuelle
      this.initSession();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Supabase:', error);
      this.isConfigured = false;
    }
  }

  private async initSession(): Promise<void> {
    if (!this.supabase || !this.isConfigured) {
      return;
    }
    
    try {
      const {data: {session}} = await this.supabase.auth.getSession();
      if (session?.user) {
        this.currentUserSubject.next(session.user);
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la session:', error);
    }
  }

  async login(email: string, password: string): Promise<{success: boolean; error?: string}> {
    if (!this.supabase || !this.isConfigured) {
      const isDev = !environment.production;
      const configFile = isDev ? 'src/environments/environment.ts' : 'environment variables';
      return {
        success: false, 
        error: `Configuration Supabase manquante. Veuillez configurer supabaseUrl et supabaseAnonKey dans ${configFile}. Voir SECURITY_SETUP.md pour les instructions.`
      };
    }
    
    try {
      const {data, error} = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        return {success: false, error: error.message};
      }

      if (data.user) {
        this.currentUserSubject.next(data.user);
        return {success: true};
      }

      return {success: false, error: 'Erreur de connexion'};
    } catch (error: any) {
      return {success: false, error: error.message || 'Erreur lors de la connexion'};
    }
  }

  async logout(): Promise<void> {
    if (this.supabase && this.isConfigured) {
      try {
        await this.supabase.auth.signOut();
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
      }
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/admin/login']);
  }

  async isAuthenticated(): Promise<boolean> {
    if (!this.supabase || !this.isConfigured) {
      return false;
    }
    
    try {
      const {data: {session}} = await this.supabase.auth.getSession();
      return !!session?.user;
    } catch {
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getAccessToken(): string | null {
    // Cette méthode sera utilisée pour obtenir le token pour les requêtes API
    // On récupère la session synchrone si disponible
    // Sinon on doit utiliser getSession() de manière asynchrone
    return null; // Sera géré de manière asynchrone dans les requêtes
  }

  async getSessionToken(): Promise<string | null> {
    if (!this.supabase || !this.isConfigured) {
      return null;
    }
    
    try {
      const {data: {session}} = await this.supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }
}

