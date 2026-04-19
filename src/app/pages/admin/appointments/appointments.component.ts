import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { Component, HostListener, LOCALE_ID, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import {
    APPOINTMENT_STATUS_CLASSES,
    APPOINTMENT_STATUS_LABELS,
    AppointmentStatus
} from '../../../models/appointment-status.enum';
import { AdditionalSalesService } from '../../../services/additional-sales.service';
import { Appointment, Client, ContentService, Prestation } from '../../../services/content.service';
import { AppointmentClientNotesSyncService } from '../../../services/appointment-client-notes-sync.service';
import { NotificationService } from '../../../services/notification.service';
import { parseEuroAmountFromLabel } from '../../../utils/accounting-revenue.utils';
import { BodyScrollLockDirective } from '../../../directives/body-scroll-lock.directive';
import { DateUtils } from '../../../utils/date.utils';

registerLocaleData(localeFr);

@Component({
  selector: 'app-appointments',
  standalone: true,
  imports: [CommonModule, FormsModule, BodyScrollLockDirective],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
  templateUrl: './appointments.component.html',
  styleUrl: './appointments.component.scss'
})
export class AppointmentsComponent implements OnInit, OnDestroy {
  appointments: Appointment[] = [];
  filteredAppointments: Appointment[] = [];
  isLoading = false;
  updatingAppointmentId: string | null = null;
  
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

  // Modal création manuelle
  showCreateModal = false;
  isCreating = false;
  prestations: Prestation[] = [];
  allClients: Client[] = [];
  clientPickerOpen = false;
  clientFilter = '';
  showNewClientModal = false;
  isCreatingClient = false;
  newClient = { name: '', email: '', phone: '', notes: '' };
  newAppointment = {
    client_name: '',
    client_email: '',
    client_phone: '',
    prestation_id: '',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  };

  // Suppression
  showDeleteModal = false;
  appointmentToDelete: Appointment | null = null;
  isDeletingAppointment = false;

  /** Modale « Terminer » avec mode de paiement (carte cadeau / mixte). */
  showCompleteModal = false;
  completeTarget: Appointment | null = null;
  completeForm: {
    payment_method: string;
    mixteGiftEur: number;
    mixteComplementMethod: 'espèces' | 'carte' | 'virement' | 'chèque';
  } = {
    payment_method: 'espèces',
    mixteGiftEur: 0,
    mixteComplementMethod: 'espèces'
  };
  /** Somme des soldes cartes cadeau sur la fiche client (indicatif). */
  giftBalanceHint: number | null = null;

  // Gestion des désabonnements
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private contentService: ContentService,
    private additionalSalesService: AdditionalSalesService,
    private appointmentClientNotesSync: AppointmentClientNotesSyncService,
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(ev: MouseEvent): void {
    if (!this.showCreateModal) return;
    const t = ev.target as HTMLElement;
    if (!t.closest('.client-picker')) {
      this.clientPickerOpen = false;
    }
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
        error: () => {
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

  updateStatus(appointment: Appointment, status: 'accepted' | 'completed' | 'rejected'): void {
    if (status === 'completed') {
      this.openCompleteModal(appointment);
      return;
    }

    if (!appointment.id) {
      this.notificationService.error('Erreur: Rendez-vous invalide (ID manquant)');
      return;
    }

    const previousStatus = appointment.status;

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
          
          if (this.showDetailsModal && this.selectedAppointment?.id === appointment.id) {
            this.closeDetails();
          }
        },
        error: (error) => {
          this.updatingAppointmentId = null;
          
          const errorMessage = error.error?.error || error.error?.details || error.message || 
            'Erreur lors de la mise à jour du rendez-vous';
          this.notificationService.error(`Erreur: ${errorMessage}`);
        }
      });
  }

  openCompleteModal(appointment: Appointment): void {
    if (!appointment.id) {
      this.notificationService.error('Erreur: Rendez-vous invalide (ID manquant)');
      return;
    }
    if (this.prestations.length === 0) {
      this.contentService
        .getPrestations()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => (this.prestations = data),
          error: () => this.notificationService.error('Impossible de charger les prestations')
        });
    }
    this.completeTarget = appointment;
    const comp = appointment.mixte_complement_payment_method;
    const mixteComplementMethod =
      comp === 'carte' || comp === 'virement' || comp === 'chèque' || comp === 'espèces'
        ? comp
        : 'espèces';
    this.completeForm = {
      payment_method: appointment.payment_method || 'espèces',
      mixteGiftEur: 0,
      mixteComplementMethod
    };
    this.showCompleteModal = true;
    this.loadGiftBalanceHint(appointment);
  }

  private loadGiftBalanceHint(appointment: Appointment): void {
    const email = (appointment.client_email || '').trim().toLowerCase();
    if (!email) {
      this.giftBalanceHint = null;
      return;
    }
    this.contentService.getClientByEmail(email)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (client) => {
          const sales = this.additionalSalesService.parseAdditionalSales(client.notes);
          let sum = 0;
          for (const s of sales) {
            if (s.type !== 'gift_card') {
              continue;
            }
            const rem = s.gift_card_remaining_eur ?? s.giftCardAmount ?? 0;
            sum += Math.max(0, rem);
          }
          this.giftBalanceHint = Math.round(sum * 100) / 100;
        },
        error: () => {
          this.giftBalanceHint = null;
        }
      });
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    this.completeTarget = null;
    this.giftBalanceHint = null;
  }

  getCompletePrestationPriceEuro(): number {
    if (!this.completeTarget?.prestation_id) {
      return 0;
    }
    const p = this.prestations.find((x) => x.id === this.completeTarget!.prestation_id);
    return p?.price ? parseEuroAmountFromLabel(p.price) : 0;
  }

  /** Montant qui sera prélevé sur les cartes (estimation FIFO = solde global). */
  getPlannedGiftDeductionEur(): number {
    const hint = this.giftBalanceHint;
    if (hint == null || hint <= 0) {
      return 0;
    }
    const price = this.getCompletePrestationPriceEuro();
    const pm = this.completeForm.payment_method;
    if (pm === 'carte_cadeau') {
      return Math.round(Math.min(price, hint) * 100) / 100;
    }
    if (pm === 'mixte') {
      const g = this.completeForm.mixteGiftEur ?? 0;
      return Math.round(Math.min(Math.min(g, price), hint) * 100) / 100;
    }
    return 0;
  }

  /** Solde total cartes après ce RDV (indicatif). */
  getProjectedGiftRemainingTotalEur(): number | null {
    const hint = this.giftBalanceHint;
    if (hint == null) {
      return null;
    }
    const ded = this.getPlannedGiftDeductionEur();
    return Math.max(0, Math.round((hint - ded) * 100) / 100);
  }

  /** Affiche prélèvement estimé + solde cartes après (mixte : seulement si montant saisi). */
  canShowGiftCardProjection(): boolean {
    const hint = this.giftBalanceHint;
    if (hint == null || hint <= 0) {
      return false;
    }
    const pm = this.completeForm.payment_method;
    if (pm === 'carte_cadeau') {
      return true;
    }
    if (pm === 'mixte') {
      const g = this.completeForm.mixteGiftEur ?? 0;
      return g > 0;
    }
    return false;
  }

  /**
   * Bloque l’enregistrement si carte / mixte ne peut pas couvrir le montant attendu.
   */
  getCompleteModalPaymentError(): string | null {
    const pm = this.completeForm.payment_method;
    if (pm !== 'carte_cadeau' && pm !== 'mixte') {
      return null;
    }

    const price = this.getCompletePrestationPriceEuro();
    if (price <= 0) {
      return 'Prix de la prestation introuvable : impossible de valider le paiement carte.';
    }

    if (this.giftBalanceHint == null) {
      return 'Solde cartes indisponible : vérifiez l’e-mail du rendez-vous ou réessayez après chargement.';
    }

    if (pm === 'carte_cadeau') {
      if (this.giftBalanceHint + 0.005 < price) {
        return `Solde cartes insuffisant pour cette séance (${price.toFixed(2)} € nécessaires, ${this.giftBalanceHint.toFixed(2)} € au total). Choisissez le mode mixte ou un autre paiement.`;
      }
      return null;
    }

    const g = this.completeForm.mixteGiftEur ?? 0;
    if (g <= 0) {
      return 'Indiquez le montant prélevé sur la carte cadeau (€).';
    }
    if (g > price + 1e-6) {
      return 'Le montant carte ne peut pas dépasser le prix de la séance.';
    }
    if (g > this.giftBalanceHint + 0.005) {
      return `Montant supérieur au solde disponible (${this.giftBalanceHint.toFixed(2)} €).`;
    }
    return null;
  }

  isCompleteModalPaymentBlocked(): boolean {
    return this.getCompleteModalPaymentError() !== null;
  }

  submitComplete(): void {
    const apt = this.completeTarget;
    if (!apt?.id) {
      return;
    }

    const paymentErr = this.getCompleteModalPaymentError();
    if (paymentErr) {
      this.notificationService.error(paymentErr);
      return;
    }

    const pm = this.completeForm.payment_method;

    const previousStatus = apt.status;
    this.updatingAppointmentId = apt.id;

    const patch: Partial<Appointment> = {
      status: 'completed',
      payment_method: pm as Appointment['payment_method'],
      mixte_complement_payment_method:
        pm === 'mixte' ? this.completeForm.mixteComplementMethod : null
    };

    this.contentService
      .updateAppointment(apt.id, patch)
      .pipe(
        switchMap((updated) => {
          const pmResolved = (updated.payment_method ?? pm) as Appointment['payment_method'];
          const merged: Appointment = {
            ...apt,
            ...updated,
            status: 'completed',
            payment_method: pmResolved,
            mixte_complement_payment_method: updated.mixte_complement_payment_method ?? null
          };
          return this.appointmentClientNotesSync
            .syncAfterAppointmentStatusChange(merged, previousStatus, 'completed', {
              mixteGiftEur: pm === 'mixte' ? this.completeForm.mixteGiftEur : undefined
            })
            .pipe(map((sync) => ({ merged, fp: sync.forfait, gc: sync.gift })));
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: ({ merged, fp, gc }) => {
          apt.status = 'completed';
          apt.payment_method = merged.payment_method;
          apt.mixte_complement_payment_method = merged.mixte_complement_payment_method;
          const idx = this.appointments.findIndex((a) => a.id === apt.id);
          if (idx !== -1) {
            this.appointments[idx] = { ...this.appointments[idx], ...merged };
          }
          const selected = this.selectedAppointment;
          if (selected != null && selected.id === apt.id) {
            selected.status = 'completed';
            selected.payment_method = merged.payment_method;
            selected.mixte_complement_payment_method = merged.mixte_complement_payment_method;
          }

          this.applyFilters();
          this.updatingAppointmentId = null;
          this.closeCompleteModal();

          let msg = 'Rendez-vous marqué comme terminé';
          if (fp.updated && fp.message) {
            msg += ` — ${fp.message}`;
          }
          if (gc.updated && gc.message) {
            msg += ` ${gc.message}`;
          }

          if (gc.message && !gc.updated) {
            this.notificationService.warning(
              `${msg}. ${gc.message} (vérifiez la fiche client / mode de paiement.)`
            );
          } else {
            this.notificationService.success(msg);
          }

          if (this.showDetailsModal && this.selectedAppointment?.id === apt.id) {
            this.closeDetails();
          }
        },
        error: (error) => {
          this.updatingAppointmentId = null;
          const errorMessage =
            error.error?.error || error.error?.details || error.message || 'Erreur lors de la mise à jour';
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
   * Vérifie si un rendez-vous est dans le passé (date + heure)
   */
  isAppointmentPast(appointment: Appointment): boolean {
    const now = new Date();
    const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
    const appointmentDate = new Date(appointment.appointment_date);
    appointmentDate.setHours(hours, minutes, 0, 0);
    return appointmentDate < now;
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

    if (appointment.payment_method === 'mixte' && !appointment.mixte_complement_payment_method) {
      appointment.mixte_complement_payment_method = 'espèces';
    }

    const payload: Partial<Appointment> = {
      payment_method: appointment.payment_method,
      mixte_complement_payment_method:
        appointment.payment_method === 'mixte'
          ? appointment.mixte_complement_payment_method ?? 'espèces'
          : null
    };

    this.contentService.updateAppointment(appointment.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          // Mettre à jour l'appointment dans la liste
          const index = this.appointments.findIndex(a => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index].payment_method = updated.payment_method;
            this.appointments[index].mixte_complement_payment_method = updated.mixte_complement_payment_method;
          }
          const selPay = this.selectedAppointment;
          if (selPay != null && selPay.id === appointment.id) {
            selPay.payment_method = updated.payment_method;
            selPay.mixte_complement_payment_method = updated.mixte_complement_payment_method;
          }
          this.applyFilters();
          this.updatingAppointmentId = null;
          
          this.notificationService.success('Mode de paiement mis à jour avec succès');
        },
        error: (error) => {
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
      'chèque': 'Chèque',
      'carte_cadeau': 'Carte cadeau (solde)',
      'mixte': 'Mixte (carte + autre)'
    };
    return labels[method] || method;
  }

  /** Libellé tableau : précise le moyen du complément si mixte. */
  getPaymentMethodDisplay(apt: Appointment): string {
    const m = apt.payment_method;
    if (!m) return 'Non renseigné';
    if (m === 'mixte') {
      const c = apt.mixte_complement_payment_method || 'espèces';
      const short: Record<string, string> = {
        espèces: 'espèces',
        carte: 'CB',
        virement: 'virement',
        chèque: 'chèque'
      };
      return `Mixte (carte + ${short[c] ?? c})`;
    }
    return this.getPaymentMethodLabel(m);
  }

  /** Second sélecteur : uniquement le complément hors solde carte. */
  updateMixteComplementOnly(appointment: Appointment, value: string): void {
    if (!appointment.id || appointment.payment_method !== 'mixte') {
      return;
    }
    const v = value as NonNullable<Appointment['mixte_complement_payment_method']>;
    appointment.mixte_complement_payment_method = v;
    this.updatingAppointmentId = appointment.id;
    this.contentService
      .updateAppointment(appointment.id, { mixte_complement_payment_method: v })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          const index = this.appointments.findIndex((a) => a.id === appointment.id);
          if (index !== -1) {
            this.appointments[index].mixte_complement_payment_method = updated.mixte_complement_payment_method;
          }
          const selMixte = this.selectedAppointment;
          if (selMixte != null && selMixte.id === appointment.id) {
            selMixte.mixte_complement_payment_method = updated.mixte_complement_payment_method;
          }
          this.applyFilters();
          this.updatingAppointmentId = null;
          this.notificationService.success('Complément de paiement mis à jour');
        },
        error: () => {
          this.updatingAppointmentId = null;
          this.notificationService.error('Impossible de mettre à jour le complément.');
          this.loadAppointments();
        }
      });
  }

  /**
   * Formate l'âge de l'enfant pour l'affichage
   * L'âge est stocké en mois dans la base de données
   * Affiche intelligemment : en mois si < 12 mois, en années sinon
   */
  formatChildAge(ageInMonths: number | null | undefined): string {
    if (ageInMonths === null || ageInMonths === undefined) {
      return '-';
    }

    // Si moins de 12 mois, afficher en mois
    if (ageInMonths < 12) {
      return `${ageInMonths} mois`;
    }

    // Si 12 mois ou plus, convertir en années
    const years = ageInMonths / 12;
    
    // Si c'est un nombre entier, afficher sans décimales
    if (years % 1 === 0) {
      return `${years} an${years > 1 ? 's' : ''}`;
    }
    
    // Sinon, afficher avec une décimale
    return `${years.toFixed(1)} an${years > 1 ? 's' : ''}`;
  }

  /**
   * Vérifie si un rendez-vous a un âge d'enfant renseigné
   */
  hasChildAge(appointment: Appointment): boolean {
    return appointment.child_age !== null && appointment.child_age !== undefined;
  }

  // ==================== Suppression ====================

  confirmDeleteAppointment(appointment: Appointment): void {
    this.appointmentToDelete = appointment;
    this.showDeleteModal = true;
    if (this.showDetailsModal) {
      this.closeDetails();
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.appointmentToDelete = null;
  }

  executeDeleteAppointment(): void {
    if (!this.appointmentToDelete?.id) return;

    this.isDeletingAppointment = true;
    this.contentService.deleteAppointment(this.appointmentToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isDeletingAppointment = false;
          this.appointments = this.appointments.filter(a => a.id !== this.appointmentToDelete?.id);
          this.applyFilters();
          this.closeDeleteModal();
          this.notificationService.success('Rendez-vous supprimé avec succès');
        },
        error: (error) => {
          this.isDeletingAppointment = false;
          const msg = error.error?.error || 'Erreur lors de la suppression du rendez-vous';
          this.notificationService.error(msg);
        }
      });
  }

  // ==================== Création manuelle ====================

  openCreateModal(): void {
    this.resetNewAppointment();
    this.loadClientsList();
    if (this.prestations.length === 0) {
      this.contentService.getPrestations()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (data) => this.prestations = data,
          error: () => this.notificationService.error('Impossible de charger les prestations')
        });
    }
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.showNewClientModal = false;
    this.resetNewAppointment();
  }

  private loadClientsList(): void {
    this.contentService.getAllClients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.allClients = (list || []).slice().sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'fr', { sensitivity: 'base' })
          );
        },
        error: () => {
          this.allClients = [];
        }
      });
  }

  private resetNewAppointment(): void {
    this.clientPickerOpen = false;
    this.clientFilter = '';
    this.showNewClientModal = false;
    this.newClient = { name: '', email: '', phone: '', notes: '' };
    this.newAppointment = {
      client_name: '',
      client_email: '',
      client_phone: '',
      prestation_id: '',
      appointment_date: '',
      appointment_time: '',
      notes: ''
    };
  }

  clientLabel(c: Client): string {
    const name = (c.name || '').trim() || c.email || '—';
    const e = (c.email || '').trim();
    return e ? `${name} — ${e}` : name;
  }

  get filteredCreateClients(): Client[] {
    const t = this.clientFilter.trim().toLowerCase();
    const src = this.allClients;
    if (!t) return src.slice(0, 80);
    return src
      .filter(
        (c) =>
          (c.name || '').toLowerCase().includes(t) ||
          (c.email || '').toLowerCase().includes(t) ||
          (c.phone && c.phone.replace(/\s/g, '').includes(t.replace(/\s/g, '')))
      )
      .slice(0, 80);
  }

  toggleClientPicker(ev: MouseEvent): void {
    ev.stopPropagation();
    this.clientPickerOpen = !this.clientPickerOpen;
    if (this.clientPickerOpen) {
      this.clientFilter = '';
    }
  }

  selectClientForAppointment(c: Client, ev: MouseEvent): void {
    ev.stopPropagation();
    this.newAppointment.client_name = (c.name || '').trim();
    this.newAppointment.client_email = c.email ? c.email.trim() : '';
    this.newAppointment.client_phone = c.phone ? c.phone.trim() : '';
    this.clientPickerOpen = false;
  }

  clearSelectedClient(): void {
    this.newAppointment.client_name = '';
    this.newAppointment.client_email = '';
    this.newAppointment.client_phone = '';
  }

  openNewClientModal(ev: MouseEvent): void {
    ev.stopPropagation();
    this.clientPickerOpen = false;
    this.newClient = { name: '', email: '', phone: '', notes: '' };
    this.showNewClientModal = true;
  }

  closeNewClientModal(): void {
    this.showNewClientModal = false;
  }

  submitNewClient(): void {
    if (!this.newClient.name.trim()) {
      return;
    }
    this.isCreatingClient = true;
    const clientData: Partial<Client> = {
      name: this.newClient.name.trim()
    };
    if (this.newClient.email.trim()) {
      clientData.email = this.newClient.email.trim().toLowerCase();
    }
    if (this.newClient.phone.trim()) {
      clientData.phone = this.newClient.phone.trim();
    }
    if (this.newClient.notes.trim()) {
      clientData.notes = this.newClient.notes.trim();
    }
    if (!clientData.email) {
      clientData.email = `client-${Date.now()}@manuel.local`;
    }

    this.contentService.createOrUpdateClient(clientData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (created) => {
          this.isCreatingClient = false;
          this.newAppointment.client_name = (created.name || '').trim();
          this.newAppointment.client_email = created.email ? created.email.trim() : '';
          this.newAppointment.client_phone = created.phone ? created.phone.trim() : '';
          this.loadClientsList();
          this.closeNewClientModal();
          this.notificationService.success(
            'Client créé. Vous pourrez compléter sa fiche depuis la section Clients.'
          );
        },
        error: () => {
          this.isCreatingClient = false;
          this.notificationService.error('Impossible de créer le client.');
        }
      });
  }

  submitNewAppointment(): void {
    if (!this.newAppointment.client_name.trim() || !this.newAppointment.prestation_id ||
        !this.newAppointment.appointment_date || !this.newAppointment.appointment_time) {
      this.notificationService.error(
        'Veuillez sélectionner ou créer un client, puis renseigner la prestation, la date et l’heure.'
      );
      return;
    }

    this.isCreating = true;

    const appointmentData: Partial<Appointment> = {
      client_name: this.newAppointment.client_name.trim(),
      prestation_id: this.newAppointment.prestation_id,
      appointment_date: this.newAppointment.appointment_date,
      appointment_time: this.newAppointment.appointment_time,
    };

    if (this.newAppointment.client_email.trim()) {
      appointmentData.client_email = this.newAppointment.client_email.trim();
    }
    if (this.newAppointment.client_phone.trim()) {
      appointmentData.client_phone = this.newAppointment.client_phone.trim();
    }
    if (this.newAppointment.notes.trim()) {
      appointmentData.notes = this.newAppointment.notes.trim();
    }

    this.contentService.createAdminAppointment(appointmentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isCreating = false;
          this.closeCreateModal();
          this.loadAppointments();
          this.notificationService.success('Rendez-vous créé avec succès');
        },
        error: (error) => {
          this.isCreating = false;
          const msg = error.error?.error || error.error?.details?.[0] || 'Erreur lors de la création';
          this.notificationService.error(msg);
        }
      });
  }
}

