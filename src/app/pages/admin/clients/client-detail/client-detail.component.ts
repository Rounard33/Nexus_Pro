import {CommonModule} from '@angular/common';
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
  clientId: string = '';
  birthdateInput: string = '';
  
  // Ventes additionnelles
  creations: Creation[] = [];
  isAddingSale = false;
  saleType: 'creation' | 'gift_card' = 'creation';
  selectedCreationId: string = '';
  giftCardAmount: number = 0;
  saleNotes: string = '';

  // Modal de confirmation de suppression
  showDeleteConfirmModal = false;
  saleToDelete: AdditionalSale | null = null;

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

  loadCreations(): void {
    this.contentService.getCreations().subscribe({
      next: (creations) => {
        this.creations = creations;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des créations:', error);
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
      error: (error) => {
        console.error('Erreur lors du chargement des prestations:', error);
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
          error: (error) => {
            console.error('Erreur lors du chargement des rendez-vous:', error);
            this.isLoading = false;
          }
        });
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
      error: (error) => {
        console.error('Erreur lors de l\'enregistrement de la récompense:', error);
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
    this.giftCardAmount = 0;
    this.saleNotes = '';
  }

  cancelAddSale(): void {
    this.isAddingSale = false;
    this.saleType = 'creation';
    this.selectedCreationId = '';
    this.giftCardAmount = 0;
    this.saleNotes = '';
  }

  saveSale(): void {
    if (!this.client) return;

    // Validation
    if (this.saleType === 'creation' && !this.selectedCreationId) {
      this.notificationService.error('Veuillez sélectionner une création');
      return;
    }

    if (this.saleType === 'gift_card' && (!this.giftCardAmount || this.giftCardAmount <= 0)) {
      this.notificationService.error('Veuillez saisir un montant valide pour la carte cadeau');
      return;
    }

    const selectedCreation = this.creations.find(c => c.id === this.selectedCreationId);
    const newSale = this.additionalSalesService.createSale(
      this.saleType,
      this.saleType === 'creation' ? this.selectedCreationId : undefined,
      this.saleType === 'creation' ? selectedCreation?.name : undefined,
      this.saleType === 'gift_card' ? this.giftCardAmount : undefined,
      this.saleNotes || undefined
    );

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
      error: (error) => {
        console.error('Erreur lors de l\'enregistrement de la vente:', error);
        this.isSaving = false;
        this.notificationService.error('Erreur lors de l\'enregistrement de la vente');
      }
    });
  }

  getSaleDescription(sale: AdditionalSale): string {
    if (sale.type === 'creation') {
      return sale.creationName || 'Création';
    } else {
      return `Carte cadeau - ${sale.giftCardAmount}€`;
    }
  }

  // Statistiques client
  calculateClientStats(): void {
    if (!this.client || !this.prestations.length) return;

    // Calculer le panier moyen pour ce client
    const clientAppointments = this.client.appointments.filter(a => a.status === 'accepted');
    this.clientAverageBasket = this.statisticsService.calculateAverageBasket(clientAppointments, this.prestations);
  }

  getClientVisitsCount(): number {
    return this.client?.acceptedAppointments || 0;
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
      error: (error) => {
        console.error('Erreur lors de la suppression de la vente:', error);
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
}