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
import {ClientDetail} from '../../../../models/client.model';
import {ClientService} from '../../../../services/client.service';
import {Appointment, Client, ContentService} from '../../../../services/content.service';
import {LoyaltyService} from '../../../../services/loyalty.service';
import {NotificationService} from '../../../../services/notification.service';
import {BirthdayUtils} from '../../../../utils/birthday.utils';
import {FormatUtils} from '../../../../utils/format.utils';

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
    private clientService: ClientService,
    private loyaltyService: LoyaltyService,
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
      catchError(() => of(null))
    );

    forkJoin({
      appointments: appointments$,
      client: client$
    }).subscribe({
      next: ({appointments, client}) => {
        // Stocker les données client
        this.clientData = client;

        // Construire la fiche client avec le service
        this.client = this.clientService.buildClientDetail(
          appointments,
          client,
          this.clientEmail
        );

        if (!this.client) {
          this.router.navigate(['/admin/clients']);
          return;
        }

        // Ajouter les données de fidélité
        this.client.loyaltyRewards = this.loyaltyService.parseLoyaltyRewards(client?.notes);
        this.client.lastRewardDate = this.client.loyaltyRewards.length > 0 
          ? this.client.loyaltyRewards.sort((a, b) => b.date.localeCompare(a.date))[0].date 
          : null;

        // Initialiser le champ d'édition
        this.birthdateInput = client?.birthdate || '';

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails du client:', error);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string | null): string {
    return FormatUtils.formatFullDate(dateString);
  }

  formatTime(timeString: string): string {
    return FormatUtils.formatTime(timeString);
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
        const {nextBirthday, age} = BirthdayUtils.calculateBirthdayInfo(updatedClient.birthdate || null);
        
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
    return FormatUtils.formatBirthdate(dateString);
  }

  formatNextBirthday(dateString: string | null | undefined): string {
    return FormatUtils.formatNextBirthday(dateString);
  }

  getMaxDate(): string {
    return FormatUtils.getMaxDate();
  }

  hasReachedLoyaltyThreshold(): boolean {
    return this.loyaltyService.hasReachedThreshold(
      this.client?.eligibleTreatments || 0
    );
  }

  getRemainingTreatments(): number {
    return this.loyaltyService.getRemainingTreatments(
      this.client?.eligibleTreatments || 0
    );
  }

  // Enregistrer une récompense
  recordReward(type: 'discount' | 'gift', description: string): void {
    if (!this.client) return;

    const newReward = this.loyaltyService.createReward(type, description);
    const updatedRewards = [...(this.client.loyaltyRewards || []), newReward];
    const updatedNotes = this.loyaltyService.formatNotesWithRewards(this.client.notes, updatedRewards);

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

