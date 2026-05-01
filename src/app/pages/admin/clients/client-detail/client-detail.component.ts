import {CommonModule} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router, RouterModule} from '@angular/router';
import {of} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {
    APPOINTMENT_STATUS_CLASSES,
    APPOINTMENT_STATUS_LABELS,
    AppointmentStatus
} from '../../../../models/appointment-status.enum';
import {AdditionalSale, ClientDetail, LoyaltyReward} from '../../../../models/clients.model';
import {AdditionalSalesService} from '../../../../services/additional-sales.service';
import {ClientService} from '../../../../services/client.service';
import {Appointment, Client, ContentService, Creation, Prestation} from '../../../../services/content.service';
import {LoyaltyService} from '../../../../services/loyalty.service';
import {NotificationService} from '../../../../services/notification.service';
import {StatisticsService} from '../../../../services/statistics.service';
import {
  collectForfaitCountedAppointmentIds,
  collectGiftCardCoverageEuroByAppointment
} from '../../../../utils/accounting-revenue.utils';
import {BirthdayUtils} from '../../../../utils/birthday.utils';
import {FormatUtils} from '../../../../utils/format.utils';
import {BodyScrollLockDirective} from '../../../../directives/body-scroll-lock.directive';
import {GiftCardFormModalComponent} from '../../../../components/gift-card-form-modal/gift-card-form-modal.component';
import {FORFAITS_CATALOG} from '../../../../data/forfaits.catalog';

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, GiftCardFormModalComponent, BodyScrollLockDirective],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.scss'
})
export class ClientDetailComponent implements OnInit {
  client: ClientDetail | null = null;
  clientData: Client | null = null; // Données depuis la table clients
  isLoading = false;
  isSaving = false;
  isEditingBirthdate = false;
  isEditingContact = false;
  clientId: string = '';
  birthdateInput: string = '';
  contactNameInput = '';
  contactPhoneInput = '';
  contactEmailInput = '';
  
  // Ventes additionnelles
  creations: Creation[] = [];
  readonly forfaitsCatalog = FORFAITS_CATALOG;
  isAddingSale = false;
  saleType: 'creation' | 'gift_card' | 'forfait' = 'creation';
  selectedCreationId: string = '';
  selectedForfaitId: string = '';
  /** Montant encaissé pour une vente « création » (€). */
  creationAmountEur = 0;
  saleNotes: string = '';
  showGiftCardModal = false;

  // Modal de confirmation de suppression de vente
  showDeleteConfirmModal = false;
  saleToDelete: AdditionalSale | null = null;

  // Modal de confirmation de suppression client
  showDeleteClientModal = false;

  // Statistiques client
  prestations: Prestation[] = [];
  clientAverageBasket: number = 0;

  constructor(
    private contentService: ContentService,
    private clientService: ClientService,
    private loyaltyService: LoyaltyService,
    private additionalSalesService: AdditionalSalesService,
    private statisticsService: StatisticsService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.clientId = params['id'];
      this.loadClientDetails();
    });
    
    // Charger les créations pour le formulaire de vente
    this.loadCreations();
    
    // Charger les prestations pour calculer le panier moyen
    this.loadPrestations();
  }

  /**
   * Toutes les créations (y compris non visibles sur le site) pour saisir une vente
   * depuis le panneau admin — requiert le même JWT que le reste de l’admin.
   */
  loadCreations(): void {
    this.contentService.getCreationsForAdmin().subscribe({
      next: (list) => {
        this.creations = (list || []).sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
        );
      },
      error: () => {
        this.creations = [];
        this.notificationService.error('Impossible de charger le catalogue des créations.');
      }
    });
  }

  loadPrestations(): void {
    this.contentService.getPrestations().subscribe({
      next: (prestations) => {
        this.prestations = prestations;
        // Recalculer les stats si le client est déjà chargé
        if (this.client) {
          this.calculateClientStats();
        }
      },
      error: () => {
        // Erreur silencieuse
      }
    });
  }

  loadClientDetails(): void {
    this.isLoading = true;
    
    // D'abord récupérer le client par ID pour obtenir l'email
    this.contentService.getClientById(this.clientId).pipe(
      catchError(() => {
        this.router.navigate(['/admin/clients']);
        return of(null);
      })
    ).subscribe({
      next: (clientData) => {
        if (!clientData) {
          this.router.navigate(['/admin/clients']);
          return;
        }

        this.clientData = clientData;
        const email = clientData.email;

        // Ensuite charger les rendez-vous et construire la fiche client
        this.contentService.getAppointments().subscribe({
          next: (appointments) => {
            this.client = this.clientService.buildClientDetail(
              appointments,
              clientData,
              email
            );

            if (!this.client) {
              this.router.navigate(['/admin/clients']);
              return;
            }

            this.isEditingContact = false;
            this.isEditingBirthdate = false;

            // Ajouter les données de fidélité
            this.client.loyaltyRewards = this.loyaltyService.parseLoyaltyRewards(clientData?.notes);
            this.client.lastRewardDate = this.client.loyaltyRewards.length > 0 
              ? this.client.loyaltyRewards.sort((a: LoyaltyReward, b: LoyaltyReward) => b.date.localeCompare(a.date))[0].date 
              : null;

            // Ajouter les ventes additionnelles
            this.client.additionalSales = this.additionalSalesService.parseAdditionalSales(clientData?.notes);

            // Calculer les statistiques client
            this.calculateClientStats();

            // Initialiser le champ d'édition
            this.birthdateInput = clientData?.birthdate || '';

            this.isLoading = false;
          },
          error: () => {
            this.isLoading = false;
          }
        });
      },
      error: () => {
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

  startEditingContact(): void {
    if (!this.client) return;
    this.isEditingContact = true;
    this.contactNameInput = this.client.name?.trim() ? this.client.name : '';
    this.contactPhoneInput = this.client.phone || '';
    this.contactEmailInput = (this.client.email || '').trim();
  }

  cancelEditingContact(): void {
    this.isEditingContact = false;
  }

  saveContact(): void {
    if (!this.client) return;
    const name = this.contactNameInput.trim();
    if (!name) {
      this.notificationService.error('Le nom est obligatoire');
      return;
    }

    const emailTrim = this.contactEmailInput.trim().toLowerCase();
    if (!emailTrim || !emailTrim.includes('@')) {
      this.notificationService.error('Adresse e-mail invalide');
      return;
    }

    const anchorEmail = this.client.email.trim().toLowerCase();

    const phoneTrim = this.contactPhoneInput.trim();
    const payload: Partial<Client> = {
      name,
      phone: phoneTrim === '' ? '' : phoneTrim
    };
    if (emailTrim !== anchorEmail) {
      payload.email = emailTrim;
    }

    this.isSaving = true;
    this.contentService.updateClient(this.client.email, payload).subscribe({
      next: (updated) => {
        const emailChanged =
          anchorEmail !== (updated.email || '').trim().toLowerCase();
        const nextClientId =
          typeof updated.clientId === 'string' ? updated.clientId : undefined;

        if (emailChanged && nextClientId && nextClientId !== this.clientId) {
          this.isSaving = false;
          this.isEditingContact = false;
          this.router.navigate(['/admin/clients', nextClientId], {replaceUrl: true});
          return;
        }

        this.clientData = updated;
        this.client!.name = updated.name || name;
        this.client!.phone = updated.phone ?? undefined;
        this.client!.email = updated.email || emailTrim;
        this.isEditingContact = false;
        this.isSaving = false;
        this.notificationService.success('Coordonnées mises à jour');
      },
      error: (err: unknown) => {
        this.isSaving = false;
        let msg = 'Erreur lors de la mise à jour';
        if (
          err instanceof HttpErrorResponse &&
          err.error?.error &&
          typeof err.error.error === 'string'
        ) {
          msg = err.error.error;
        }
        this.notificationService.error(msg);
      }
    });
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
      error: () => {
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

  // Calcule le total brut des points de fidélité (séances + parrainages)
  private getTotalRawPoints(): number {
    const treatments = this.client?.eligibleTreatments || 0;
    const referrals = this.client?.referralsCount || 0;
    return treatments + referrals;
  }

  // Calcule les points disponibles dans le cycle actuel (après déduction des cycles complétés)
  getTotalLoyaltyPoints(): number {
    const totalRaw = this.getTotalRawPoints();
    const rewards = this.client?.loyaltyRewards || [];
    return this.loyaltyService.getAvailablePoints(totalRaw, rewards, 10);
  }

  hasReachedLoyaltyThreshold(): boolean {
    // Seuil de 10 points dans le cycle actuel
    return this.getTotalLoyaltyPoints() >= 10;
  }

  getRemainingTreatments(): number {
    const total = this.getTotalLoyaltyPoints();
    return Math.max(0, 10 - total);
  }

  // Retourne le nombre de cycles de fidélité complétés
  getCompletedCycles(): number {
    return this.loyaltyService.countCompletedCycles(this.client?.loyaltyRewards || []);
  }

  // Vérifie si une récompense est en attente dans le cycle actuel
  getPendingReward(): 'discount' | 'gift' | null {
    return this.loyaltyService.getPendingRewardInCurrentCycle(this.client?.loyaltyRewards || []);
  }

  // Vérifie si une récompense spécifique a déjà été donnée dans le cycle actuel
  isRewardGivenInCurrentCycle(type: 'discount' | 'gift'): boolean {
    const pending = this.getPendingReward();
    // Si rien n'est en attente, soit les deux sont faits, soit aucun n'est fait
    if (pending === null) {
      // Si on a atteint le seuil et qu'aucune récompense n'est en attente, aucune n'est encore donnée
      return false;
    }
    // Si c'est l'autre type qui est en attente, alors ce type a été donné
    return pending !== type;
  }

  // Enregistrer une récompense
  recordReward(type: 'discount' | 'gift', description: string): void {
    if (!this.client) return;

    const newReward = this.loyaltyService.createReward(type, description);
    const updatedRewards = [...(this.client.loyaltyRewards || []), newReward];
    
    // Préserver les ventes additionnelles lors de la mise à jour
    const currentSales = this.client.additionalSales || [];
    let updatedNotes = this.loyaltyService.formatNotesWithRewards(this.client.notes, updatedRewards);
    updatedNotes = this.additionalSalesService.formatNotesWithSales(updatedNotes, currentSales);

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
      error: () => {
        this.isSaving = false;
        this.notificationService.error('Erreur lors de l\'enregistrement de la récompense');
      }
    });
  }

  // Ventes additionnelles
  openAddSaleForm(): void {
    this.isAddingSale = true;
    this.saleType = 'creation';
    this.selectedCreationId = '';
    this.selectedForfaitId = '';
    this.creationAmountEur = 0;
    this.saleNotes = '';
    this.showGiftCardModal = false;
  }

  cancelAddSale(): void {
    this.isAddingSale = false;
    this.saleType = 'creation';
    this.selectedCreationId = '';
    this.selectedForfaitId = '';
    this.creationAmountEur = 0;
    this.saleNotes = '';
    this.showGiftCardModal = false;
  }

  selectCreationSale(): void {
    this.saleType = 'creation';
    this.showGiftCardModal = false;
  }

  selectForfaitSale(): void {
    this.saleType = 'forfait';
    this.showGiftCardModal = false;
  }

  openGiftCardSale(): void {
    this.saleType = 'gift_card';
    this.showGiftCardModal = true;
  }

  onGiftCardModalClosed(): void {
    this.showGiftCardModal = false;
  }

  onGiftCardModalSaved(): void {
    this.showGiftCardModal = false;
    this.loadClientDetails();
    this.cancelAddSale();
  }

  get giftCardFixedBuyer(): { name: string; email: string } | null {
    if (!this.client) return null;
    return { name: this.client.name, email: this.client.email };
  }

  saveSale(): void {
    if (!this.client) return;

    if (this.saleType === 'creation' && !this.selectedCreationId) {
      this.notificationService.error('Veuillez sélectionner une création');
      return;
    }
    if (this.saleType === 'creation') {
      const amt = Number(this.creationAmountEur);
      if (!Number.isFinite(amt) || amt <= 0) {
        this.notificationService.error('Indiquez un prix de vente supérieur à 0');
        return;
      }
    }
    if (this.saleType === 'forfait' && !this.selectedForfaitId) {
      this.notificationService.error('Veuillez sélectionner un forfait');
      return;
    }

    const newSale =
      this.saleType === 'creation'
        ? this.additionalSalesService.createSale({
            type: 'creation',
            creationId: this.selectedCreationId,
            creationName: this.creations.find((c) => c.id === this.selectedCreationId)?.name || '',
            creationAmountEur: Number(this.creationAmountEur),
            notes: this.saleNotes || undefined
          })
        : this.additionalSalesService.createSale({
            type: 'forfait',
            forfaitId: this.selectedForfaitId,
            forfaitName:
              this.forfaitsCatalog.find((f) => f.id === this.selectedForfaitId)?.name || '',
            forfaitPriceLabel: this.forfaitsCatalog.find((f) => f.id === this.selectedForfaitId)?.price,
            sessionsTotal:
              this.forfaitsCatalog.find((f) => f.id === this.selectedForfaitId)?.sessionsTotal ?? 1,
            notes: this.saleNotes || undefined
          });

    const updatedSales = [...(this.client.additionalSales || []), newSale];
    
    // Préserver les récompenses de fidélité lors de la mise à jour
    const currentRewards = this.client.loyaltyRewards || [];
    let updatedNotes = this.additionalSalesService.formatNotesWithSales(this.client.notes, updatedSales);
    updatedNotes = this.loyaltyService.formatNotesWithRewards(updatedNotes, currentRewards);

    this.isSaving = true;
    this.contentService.updateClient(this.client.email, { notes: updatedNotes }).subscribe({
      next: (updatedClient) => {
        if (this.client) {
          this.client.notes = updatedClient.notes;
          this.client.additionalSales = updatedSales;
        }
        this.isSaving = false;
        this.isAddingSale = false;
        this.notificationService.success('Vente additionnelle enregistrée avec succès');
        this.cancelAddSale();
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.error('Erreur lors de l\'enregistrement de la vente');
      }
    });
  }

  getSaleDescription(sale: AdditionalSale): string {
    if (sale.type === 'creation') {
      const name = sale.creationName || 'Création';
      if (sale.creationAmountEur != null && sale.creationAmountEur > 0) {
        return `${name} — ${sale.creationAmountEur} €`;
      }
      return name;
    }
    if (sale.type === 'forfait') {
      const name = sale.forfaitName || 'Forfait';
      const price = sale.forfaitPriceLabel ? ` — ${sale.forfaitPriceLabel}` : '';
      const cap = sale.forfait_sessions_total;
      const used = sale.forfait_sessions_used;
      const progress =
        cap != null && cap > 0 && used != null
          ? ` (${used}/${cap} séance${cap > 1 ? 's' : ''})`
          : '';
      return `Forfait : ${name}${price}${progress}`;
    }
    const initial = sale.giftCardAmount;
    const rem =
      sale.gift_card_remaining_eur != null
        ? Math.max(0, Math.round(sale.gift_card_remaining_eur * 100) / 100)
        : initial != null && initial > 0
          ? initial
          : null;
    if (initial != null && initial > 0) {
      if (rem != null && Math.abs(rem - initial) > 0.005) {
        return `${initial} € → reste ${rem} €`;
      }
      return `${initial} €`;
    }
    return rem != null ? `Solde ${rem} €` : 'Carte cadeau';
  }

  // Statistiques client
  calculateClientStats(): void {
    if (!this.client || !this.prestations.length) return;

    // Calculer le panier moyen pour ce client (basé sur les RDV terminés)
    const clientAppointments = this.client.appointments.filter(a => a.status === 'completed');
    const forfaitIds = collectForfaitCountedAppointmentIds(
      (notes) => this.additionalSalesService.parseAdditionalSales(notes),
      [{notes: this.client.notes}]
    );
    const giftCov = collectGiftCardCoverageEuroByAppointment(
      (notes) => this.additionalSalesService.parseAdditionalSales(notes),
      [{notes: this.client.notes}]
    );
    this.clientAverageBasket = this.statisticsService.calculateAverageBasket(
      clientAppointments,
      this.prestations,
      forfaitIds,
      giftCov
    );
  }

  getClientVisitsCount(): number {
    // Nombre de venues = RDV terminés uniquement
    return this.client?.completedAppointments || 0;
  }

  getConfirmedAppointmentsCount(): number {
    // RDV confirmés = acceptés + terminés
    return (this.client?.acceptedAppointments || 0) + (this.client?.completedAppointments || 0);
  }

  deleteSale(sale: AdditionalSale): void {
    if (!this.client || !this.client.additionalSales) return;
    this.saleToDelete = sale;
    this.showDeleteConfirmModal = true;
  }

  confirmDeleteSale(): void {
    if (!this.client || !this.client.additionalSales || !this.saleToDelete) return;

    const updatedSales = this.client.additionalSales.filter(s => s !== this.saleToDelete);
    
    // Préserver les récompenses de fidélité lors de la mise à jour
    const currentRewards = this.client.loyaltyRewards || [];
    let updatedNotes = this.additionalSalesService.formatNotesWithSales(this.client.notes, updatedSales);
    updatedNotes = this.loyaltyService.formatNotesWithRewards(updatedNotes, currentRewards);

    this.isSaving = true;
    this.contentService.updateClient(this.client.email, { notes: updatedNotes }).subscribe({
      next: (updatedClient) => {
        if (this.client) {
          this.client.notes = updatedClient.notes;
          this.client.additionalSales = updatedSales;
        }
        this.isSaving = false;
        this.closeDeleteConfirmModal();
        this.notificationService.success('Vente additionnelle supprimée avec succès');
      },
      error: () => {
        this.isSaving = false;
        this.notificationService.error('Erreur lors de la suppression de la vente');
      }
    });
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.saleToDelete = null;
  }

  onDeleteModalOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeDeleteConfirmModal();
    }
  }

  confirmDeleteClient(): void {
    this.showDeleteClientModal = true;
  }

  closeDeleteClientModal(): void {
    this.showDeleteClientModal = false;
  }

  onDeleteClientModalOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeDeleteClientModal();
    }
  }

  executeDeleteClient(): void {
    if (!this.clientData?.id) return;

    this.isSaving = true;
    this.contentService.deleteClient(this.clientData.id).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeDeleteClientModal();
        this.notificationService.success('Fiche client supprimée avec succès');
        this.router.navigate(['/admin/clients']);
      },
      error: (error) => {
        this.isSaving = false;
        const msg = error.error?.error || 'Erreur lors de la suppression du client';
        this.notificationService.error(msg);
      }
    });
  }
}