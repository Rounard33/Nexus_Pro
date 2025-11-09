import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {forkJoin, of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {
    APPOINTMENT_STATUS_CLASSES,
    APPOINTMENT_STATUS_LABELS,
    AppointmentStatus
} from '../../../../models/appointment-status.enum';
import {Appointment, Client, ContentService} from '../../../../services/content.service';
import {NotificationService} from '../../../../services/notification.service';

export interface LoyaltyReward {
  date: string;
  type: 'discount' | 'gift';
  description: string;
}

export interface ClientDetail {
  email: string;
  name: string;
  phone?: string;
  birthdate?: string;
  notes?: string;
  appointments: Appointment[];
  totalAppointments: number;
  acceptedAppointments: number;
  pendingAppointments: number;
  rejectedAppointments: number;
  cancelledAppointments: number;
  lastAppointmentDate: string | null;
  firstAppointmentDate: string | null;
  nextBirthday?: string | null;
  age?: number | null;
  // Fidélité
  eligibleTreatments: number; // Nombre de soins éligibles (acceptés)
  loyaltyRewards?: LoyaltyReward[]; // Historique des récompenses
  lastRewardDate?: string | null; // Date de la dernière récompense
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent implements OnInit {
  client: ClientDetail | null = null;
  clientData: Client | null = null; // Données depuis la table clients
  isLoading = false;
  isSaving = false;
  isEditingBirthdate = false;
  clientEmail: string = '';
  birthdateInput: string = '';

  constructor(
    private contentService: ContentService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clientEmail = decodeURIComponent(params['email']);
      this.loadClientDetails();
    });
  }

  loadClientDetails(): void {
    this.isLoading = true;
    
    // Charger les rendez-vous et les données client en parallèle
    const appointments$ = this.contentService.getAppointments();
    const client$ = this.contentService.getClientByEmail(this.clientEmail).pipe(
      // Si le client n'existe pas encore, créer une entrée vide
      catchError(() => {
        // Client non trouvé, on continuera sans données client
        return of(null);
      })
    );

    forkJoin({
      appointments: appointments$,
      client: client$
    }).subscribe({
      next: ({appointments, client}) => {
        const clientAppointments = appointments.filter(
          apt => apt.client_email.toLowerCase().trim() === this.clientEmail.toLowerCase().trim()
        );

        if (clientAppointments.length === 0) {
          this.router.navigate(['/admin/clients']);
          return;
        }

        // Stocker les données client
        this.clientData = client;

        // Créer la fiche client
        const firstAppt = clientAppointments[0];
        const birthdate = client?.birthdate || null;
        const {nextBirthday, age} = this.calculateBirthdayInfo(birthdate);

        // Calculer les soins éligibles pour la carte de fidélité (seulement les acceptés)
        const eligibleTreatments = clientAppointments.filter(a => a.status === 'accepted').length;
        
        // Parser les récompenses depuis les notes (format JSON ou texte)
        const loyaltyRewards = this.parseLoyaltyRewards(client?.notes);
        const lastRewardDate = loyaltyRewards.length > 0 
          ? loyaltyRewards.sort((a, b) => b.date.localeCompare(a.date))[0].date 
          : null;

        // Filtrer seulement les rendez-vous acceptés pour les statistiques
        const acceptedAppointments = clientAppointments.filter(a => a.status === 'accepted');
        const acceptedAppointmentsCount = acceptedAppointments.length;

        this.client = {
          email: firstAppt.client_email,
          name: firstAppt.client_name,
          phone: firstAppt.client_phone || client?.phone,
          birthdate: birthdate || undefined,
          notes: client?.notes,
          appointments: clientAppointments.sort((a, b) => {
            // Trier par date décroissante (plus récent en premier)
            const dateCompare = b.appointment_date.localeCompare(a.appointment_date);
            if (dateCompare !== 0) return dateCompare;
            return b.appointment_time.localeCompare(a.appointment_time);
          }),
          // totalAppointments ne compte que les acceptés (pas les pending)
          totalAppointments: acceptedAppointmentsCount,
          acceptedAppointments: acceptedAppointmentsCount,
          pendingAppointments: clientAppointments.filter(a => a.status === 'pending').length,
          rejectedAppointments: clientAppointments.filter(a => a.status === 'rejected').length,
          cancelledAppointments: clientAppointments.filter(a => a.status === 'cancelled').length,
          // Calculer les dates seulement pour les rendez-vous acceptés
          lastAppointmentDate: acceptedAppointments.length > 0 
            ? acceptedAppointments.reduce((latest, apt) => 
                !latest || apt.appointment_date > latest ? apt.appointment_date : latest, 
                null as string | null
              )
            : null,
          firstAppointmentDate: acceptedAppointments.length > 0
            ? acceptedAppointments.reduce((earliest, apt) => 
                !earliest || apt.appointment_date < earliest ? apt.appointment_date : earliest, 
                null as string | null
              )
            : null,
          nextBirthday,
          age,
          eligibleTreatments,
          loyaltyRewards,
          lastRewardDate
        };

        // Initialiser le champ d'édition
        this.birthdateInput = birthdate || '';

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails du client:', error);
        this.isLoading = false;
      }
    });
  }

  calculateBirthdayInfo(birthdate: string | null | undefined): {nextBirthday: string | null; age: number | null} {
    if (!birthdate) {
      return {nextBirthday: null, age: null};
    }

    // Parser la date de naissance directement (format YYYY-MM-DD)
    const [birthYear, birthMonth, birthDay] = birthdate.split('-').map(Number);
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // getMonth() retourne 0-11
    const currentDay = today.getDate();
    
    // Calculer l'âge
    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--;
    }

    // Calculer le prochain anniversaire (en utilisant directement les composantes)
    let nextBirthdayYear = currentYear;
    let nextBirthdayMonth = birthMonth;
    let nextBirthdayDay = birthDay;
    
    // Si l'anniversaire de cette année est déjà passé, prendre l'année prochaine
    if (currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)) {
      nextBirthdayYear = currentYear + 1;
    }

    // Formater la date au format YYYY-MM-DD (sans conversion de fuseau horaire)
    const nextBirthday = `${nextBirthdayYear}-${String(nextBirthdayMonth).padStart(2, '0')}-${String(nextBirthdayDay).padStart(2, '0')}`;

    return {
      nextBirthday,
      age
    };
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  formatTime(timeString: string): string {
    return timeString.substring(0, 5); // Format HH:mm
  }

  getStatusClass(status: string): string {
    return APPOINTMENT_STATUS_CLASSES[status as AppointmentStatus] || '';
  }

  getStatusLabel(status: string): string {
    return APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] || status;
  }

  goBack(): void {
    this.router.navigate(['/admin/clients']);
  }

  hasPrestation(appointment: Appointment): boolean {
    return appointment.prestations !== null && appointment.prestations !== undefined;
  }

  startEditingBirthdate(): void {
    this.isEditingBirthdate = true;
    this.birthdateInput = this.client?.birthdate || '';
  }

  cancelEditingBirthdate(): void {
    this.isEditingBirthdate = false;
    this.birthdateInput = this.client?.birthdate || '';
  }

  saveBirthdate(): void {
    if (!this.client) return;

    this.isSaving = true;
    const updates: Partial<Client> = {
      email: this.client.email,
      name: this.client.name,
      phone: this.client.phone,
      birthdate: this.birthdateInput || undefined
    };

    this.contentService.createOrUpdateClient(updates).subscribe({
      next: (updatedClient) => {
        this.clientData = updatedClient;
        const {nextBirthday, age} = this.calculateBirthdayInfo(updatedClient.birthdate || null);
        
        if (this.client) {
          this.client.birthdate = updatedClient.birthdate;
          this.client.nextBirthday = nextBirthday;
          this.client.age = age;
        }

        this.isEditingBirthdate = false;
        this.isSaving = false;
        this.notificationService.success('Date de naissance mise à jour avec succès');
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour de la date de naissance:', error);
        this.isSaving = false;
        this.notificationService.error('Erreur lors de la mise à jour de la date de naissance');
      }
    });
  }

  formatBirthdate(dateString: string | null | undefined): string {
    if (!dateString) return 'Non renseignée';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  formatNextBirthday(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return "Aujourd'hui !";
    } else if (diffDays === 1) {
      return 'Demain';
    } else if (diffDays < 7) {
      return `Dans ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'long' 
      });
    }
  }

  getMaxDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // Parser les récompenses depuis les notes
  private parseLoyaltyRewards(notes: string | undefined): LoyaltyReward[] {
    if (!notes) return [];
    
    try {
      // Essayer de parser un JSON dans les notes
      const jsonMatch = notes.match(/\[LOYALTY_REWARDS\](.*?)\[\/LOYALTY_REWARDS\]/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
    } catch (e) {
      console.warn('Erreur lors du parsing des récompenses:', e);
    }
    
    return [];
  }

  // Formater les notes avec les récompenses
  private formatNotesWithRewards(originalNotes: string | undefined, rewards: LoyaltyReward[]): string {
    let notes = originalNotes || '';
    
    // Supprimer l'ancien bloc de récompenses s'il existe
    notes = notes.replace(/\[LOYALTY_REWARDS\].*?\[\/LOYALTY_REWARDS\]/s, '').trim();
    
    // Ajouter le nouveau bloc
    if (rewards.length > 0) {
      const rewardsJson = JSON.stringify(rewards);
      if (notes) {
        notes += '\n\n[LOYALTY_REWARDS]' + rewardsJson + '[/LOYALTY_REWARDS]';
      } else {
        notes = '[LOYALTY_REWARDS]' + rewardsJson + '[/LOYALTY_REWARDS]';
      }
    }
    
    return notes;
  }

  // Vérifier si le client a atteint 5 soins
  hasReachedLoyaltyThreshold(): boolean {
    return this.client ? this.client.eligibleTreatments >= 5 : false;
  }

  // Calculer le nombre de soins restants avant la récompense
  getRemainingTreatments(): number {
    if (!this.client) return 0;
    if (this.client.eligibleTreatments >= 5) return 0;
    return 5 - this.client.eligibleTreatments;
  }

  // Enregistrer une récompense
  recordReward(type: 'discount' | 'gift', description: string): void {
    if (!this.client) return;

    const newReward: LoyaltyReward = {
      date: new Date().toISOString().split('T')[0],
      type,
      description
    };

    const updatedRewards = [...(this.client.loyaltyRewards || []), newReward];
    const updatedNotes = this.formatNotesWithRewards(this.client.notes, updatedRewards);

    this.isSaving = true;
    this.contentService.updateClient(this.client.email, { notes: updatedNotes }).subscribe({
      next: (updatedClient) => {
        if (this.client) {
          this.client.notes = updatedClient.notes;
          this.client.loyaltyRewards = updatedRewards;
          this.client.lastRewardDate = newReward.date;
        }
        this.isSaving = false;
        this.notificationService.success('Récompense enregistrée avec succès');
      },
      error: (error) => {
        console.error('Erreur lors de l\'enregistrement de la récompense:', error);
        this.isSaving = false;
        this.notificationService.error('Erreur lors de l\'enregistrement de la récompense');
      }
    });
  }
}

