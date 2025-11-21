import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Subject, debounceTime, distinctUntilChanged, takeUntil} from 'rxjs';
import {
  APPOINTMENT_STATUS_CLASSES,
  APPOINTMENT_STATUS_LABELS,
  AppointmentStatus
} from '../../../models/appointment-status.enum';
import {Appointment, ContentService} from '../../../services/content.service';
import {NotificationService} from '../../../services/notification.service';
import {DateUtils} from '../../../utils/date.utils';

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = false;
  updatingAppointmentId: string | null = null; // Pour afficher le loader sur le bon bouton
  
  // Filtres
  statusFilter: string = 'all';
  dateFilter: string = 'all';
  searchTerm: string = '';
  
  // Date personnalisée
  customStartDate: string = '';
  customEndDate: string = '';
  
  // Modal détails
  selectedAppointment: Appointment | null = null;
  showDetailsModal = false;

  // Gestion des désabonnements
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private contentService: ContentService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    
    // Lire les query params pour appliquer les filtres depuis le dashboard
    this.route.queryParams.subscribe(params => {
      if (params['statusFilter']) {
        this.statusFilter = params['statusFilter'];
      }
      if (params['dateFilter']) {
        this.dateFilter = params['dateFilter'];
      }
      
      // Charger les rendez-vous après avoir appliqué les filtres
      this.loadAppointments();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchSubject$.complete();
  }

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.applyFilters();
      });
  }

  onSearchChange(): void {
    this.searchSubject$.next(this.searchTerm);
  }

  loadAppointments(): void {
    this.isLoading = true;
    this.contentService.getAppointments()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.appointments = data;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des rendez-vous:', error);
          this.isLoading = false;
          this.notificationService.error(
            'Impossible de charger les rendez-vous. Veuillez réessayer.'
          );
        }
      });
  }

  applyFilters(): void {
    let filtered = [...this.appointments];

    // Filtre par statut
    if (this.statusFilter !== 'all') {
      filtered = this.filterByStatus(filtered, this.statusFilter);
    }

    // Filtre par date
    filtered = this.filterByDate(filtered);

    // Recherche par nom/email
    if (this.searchTerm.trim()) {
      filtered = this.filterBySearchTerm(filtered, this.searchTerm);
    }

    // Tri par date/heure
    filtered.sort((a, b) =>
      DateUtils.compareDateTime(
        a.appointment_date,
        a.appointment_time,
        b.appointment_date,
        b.appointment_time
      )
    );

    this.filteredAppointments = filtered;
  }

  private filterByStatus(appointments: Appointment[], status: string): Appointment[] {
    return appointments.filter(a => a.status === status);
  }

  private filterByDate(appointments: Appointment[]): Appointment[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (this.dateFilter) {
      case 'today': {
        const todayStr = DateUtils.getToday();
        return appointments.filter(a => a.appointment_date === todayStr);
      }
      case 'week': {
        const weekEnd = DateUtils.getWeekEndDate();
        return appointments.filter(a => {
          const date = new Date(a.appointment_date);
          return date >= today && date <= weekEnd;
        });
      }
      case 'month': {
        const monthEnd = DateUtils.getMonthEndDate();
        return appointments.filter(a => {
          const date = new Date(a.appointment_date);
          return date >= today && date <= monthEnd;
        });
      }
      case 'custom': {
        if (this.customStartDate && this.customEndDate) {
          return appointments.filter(a =>
            DateUtils.isDateInRange(a.appointment_date, this.customStartDate, this.customEndDate)
          );
        }
        return appointments;
      }
      default:
        return appointments;
    }
  }

  private filterBySearchTerm(appointments: Appointment[], term: string): Appointment[] {
    const lowerTerm = term.toLowerCase().trim();
    return appointments.filter(a =>
      a.client_name.toLowerCase().includes(lowerTerm) ||
      a.client_email.toLowerCase().includes(lowerTerm)
    );
  }

  updateStatus(appointment: Appointment, status: 'accepted' | 'rejected'): void {
    if (!appointment.id) {
      this.notificationService.error('Erreur: Rendez-vous invalide (ID manquant)');
      return;
    }

    this.updatingAppointmentId = appointment.id;

    this.contentService.updateAppointment(appointment.id, {status})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          appointment.status = status;
          this.applyFilters();
          this.updatingAppointmentId = null;
          
          const statusLabel = APPOINTMENT_STATUS_LABELS[status];
          this.notificationService.success(`Rendez-vous ${statusLabel.toLowerCase()} avec succès`);
          
          // Fermer la modal si ouverte
          if (this.showDetailsModal && this.selectedAppointment?.id === appointment.id) {
            this.closeDetails();
          }
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour:', error);
          this.updatingAppointmentId = null;
          
          const errorMessage = error.error?.error || error.error?.details || error.message || 
            'Erreur lors de la mise à jour du rendez-vous';
          this.notificationService.error(`Erreur: ${errorMessage}`);
        }
      });
  }

  openDetails(appointment: Appointment): void {
    this.selectedAppointment = appointment;
    this.showDetailsModal = true;
  }

  closeDetails(): void {
    this.selectedAppointment = null;
    this.showDetailsModal = false;
  }

  getStatusClass(status: string): string {
    return APPOINTMENT_STATUS_CLASSES[status as AppointmentStatus] || '';
  }

  getStatusLabel(status: string): string {
    return APPOINTMENT_STATUS_LABELS[status as AppointmentStatus] || status;
  }

  getReferralSourceLabel(source: string | undefined): string {
    if (!source) return '';
    const labels: Record<string, string> = {
      'search': 'Recherche sur Internet',
      'social': 'Réseaux sociaux',
      'friend': 'Par un ami / une connaissance',
      'advertisement': 'Publicité',
      'other': 'Autre'
    };
    return labels[source] || source;
  }

  /**
   * Obtient le nom d'affichage d'une prestation
   */
  getPrestationDisplayName(appointment: Appointment): string {
    if (appointment.prestations?.name) {
      return appointment.prestations.name;
    }
    if (appointment.prestation_id) {
      return `Prestation supprimée (ID: ${appointment.prestation_id})`;
    }
    return 'Non renseignée';
  }

  /**
   * Vérifie si une prestation est disponible
   */
  hasPrestation(appointment: Appointment): boolean {
    return !!appointment.prestations?.name;
  }

  /**
   * Vérifie si un rendez-vous est en cours de mise à jour
   */
  isUpdating(appointment: Appointment): boolean {
    return this.updatingAppointmentId === appointment.id;
  }

  /**
   * Met à jour le mode de paiement d'un rendez-vous
   */
  updatePaymentMethod(appointment: Appointment): void {
    if (!appointment.id) {
      this.notificationService.error('Erreur: Rendez-vous invalide (ID manquant)');
      return;
    }

    this.updatingAppointmentId = appointment.id;

    this.contentService.updateAppointment(appointment.id, {payment_method: appointment.payment_method})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          // Mettre à jour l'appointment dans la liste
          const index = this.appointments.findIndex(a => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index].payment_method = updated.payment_method;
          }
          this.applyFilters();
          this.updatingAppointmentId = null;
          
          this.notificationService.success('Mode de paiement mis à jour avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du mode de paiement:', error);
          this.updatingAppointmentId = null;
          
          const errorMessage = error.error?.error || error.error?.details || error.message || 
            'Erreur lors de la mise à jour du mode de paiement';
          this.notificationService.error(`Erreur: ${errorMessage}`);
          
          // Recharger les rendez-vous pour restaurer l'état précédent
          this.loadAppointments();
        }
      });
  }

  /**
   * Obtient le libellé du mode de paiement
   */
  getPaymentMethodLabel(method: string | null | undefined): string {
    if (!method) return 'Non renseigné';
    const labels: {[key: string]: string} = {
      'espèces': 'Espèces',
      'carte': 'Carte bancaire',
      'virement': 'Virement',
      'chèque': 'Chèque'
    };
    return labels[method] || method;
  }
}

