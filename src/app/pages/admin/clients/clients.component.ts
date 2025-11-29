import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {ClientProfile} from '../../../models/clients.model';
import {ClientService} from '../../../services/client.service';
import {ContentService} from '../../../services/content.service';
import {BirthdayUtils} from '../../../utils/birthday.utils';
import {generateTemporaryClientId} from '../../../utils/client-id-helper';
import {FormatUtils} from '../../../utils/format.utils';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit, OnDestroy {
  clients: ClientProfile[] = [];
  filteredClients: ClientProfile[] = [];
  isLoading = false;
  searchTerm: string = '';
  
  // Gestion des désabonnements
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private contentService: ContentService,
    private clientService: ClientService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.setupSearchDebounce();
    this.loadClients();
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
      .subscribe(term => {
        this.searchTerm = term;
        this.applyFilters();
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchSubject$.next(target.value);
  }

  loadClients(): void {
    this.isLoading = true;
    
    this.contentService.getAppointments().subscribe({
      next: (appointments) => {
        this.clients = this.clientService.groupAppointmentsByClient(appointments);
        this.loadClientData();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des clients:', error);
        this.isLoading = false;
      }
    });
  }

  private loadClientData(): void {
    // Charger les données clients (date de naissance) pour chaque client
    const clientDataObservables = this.clients.map(client => 
      this.contentService.getClientByEmail(client.email).pipe(
        catchError(() => of(null)) // Si le client n'existe pas dans la table clients, continuer
      )
    );

    if (clientDataObservables.length === 0) return;

    forkJoin(clientDataObservables).subscribe({
      next: (clientDataArray) => {
        clientDataArray.forEach((clientData, index) => {
          const client = this.clients[index];
          if (client) {
            // Calculer eligibleTreatments en filtrant les tirages de cartes
            const eligibleAppointments = client.appointments.filter(apt => {
              if (apt.status !== 'accepted') return false;
              const prestationName = apt.prestations?.name?.toLowerCase() || '';
              // Exclure les tirages de cartes
              return !prestationName.includes('tirage') && !prestationName.includes('carte');
            });
            client.eligibleTreatments = eligibleAppointments.length;

            if (clientData) {
              // Stocker l'ID et le clientId (identifiant opaque) du client depuis l'API
              client.id = clientData.id;
              client.clientId = clientData.clientId;
              // Récupérer le compteur de parrainages
              client.referralsCount = clientData.referrals_count || 0;
              if (clientData.birthdate) {
                client.birthdate = clientData.birthdate;
                const {nextBirthday, age} = BirthdayUtils.calculateBirthdayInfo(clientData.birthdate);
                client.nextBirthday = nextBirthday;
                client.age = age;
              }
            } else {
              // Si le client n'existe pas encore dans la table clients,
              // on ne peut pas générer le vrai clientId (nécessite le secret serveur)
              // On va créer le client dans la table lors de la première navigation
              // Pour l'instant, on utilise un identifiant temporaire basé sur l'email
              // ⚠️ IMPORTANT: Ce clientId temporaire ne fonctionnera pas avec l'API
              // Il faut créer le client dans la table d'abord
              client.clientId = generateTemporaryClientId(client.email);
              client.referralsCount = 0;
            }
          }
        });
        this.applyFilters(); // Réappliquer les filtres après chargement des données
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données clients:', error);
      }
    });
  }

  private applyFilters(): void {
    let filtered = [...this.clients];

    // Filtre de recherche
    if (this.searchTerm.trim()) {
      const lowerTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(client =>
        client.name.toLowerCase().includes(lowerTerm) ||
        client.email.toLowerCase().includes(lowerTerm) ||
        (client.phone && client.phone.includes(lowerTerm))
      );
    }

    this.filteredClients = filtered;
  }

  viewClientDetails(client: ClientProfile): void {
    // Toujours récupérer le client depuis l'API pour obtenir le vrai clientId
    // Cela garantit qu'on a toujours le bon clientId même si le client vient d'être créé
    this.contentService.getClientByEmail(client.email).pipe(
      catchError(() => {
        // Si le client n'existe pas, le créer d'abord
        return this.contentService.createOrUpdateClient({
          email: client.email,
          name: client.name,
          phone: client.phone
        });
      })
    ).subscribe({
      next: (clientData) => {
        // Utiliser le clientId de l'API (vrai hash) ou générer depuis l'email si nécessaire
        const finalClientId = clientData.clientId || this.generateClientIdFromEmail(client.email);
        client.clientId = finalClientId;
        this.router.navigate(['/admin/clients', finalClientId]);
      },
      error: (error) => {
        console.error('Erreur lors de la récupération/création du client:', error);
        // Fallback: utiliser l'email directement si tout échoue
        // Mais il faudra modifier la route pour accepter les emails aussi
        console.warn('Impossible de récupérer le clientId, navigation impossible');
      }
    });
  }

  private generateClientIdFromEmail(email: string): string {
    // Cette fonction ne génère pas le vrai hash (nécessite le secret serveur)
    // Mais on va forcer la récupération depuis l'API qui retournera le vrai clientId
    // Pour l'instant, on retourne un placeholder qui sera remplacé
    return 'temp-' + email.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  }

  formatDate(dateString: string | null): string {
    return FormatUtils.formatShortDate(dateString);
  }

  // Calcule le pourcentage de progression vers la récompense fidélité
  getLoyaltyProgress(client: ClientProfile): number {
    const total = (client.eligibleTreatments || 0) + (client.referralsCount || 0);
    return Math.min((total / 10) * 100, 100);
  }

  // Vérifie si le client est proche de la récompense (8 ou 9 séances)
  isCloseToReward(client: ClientProfile): boolean {
    const total = (client.eligibleTreatments || 0) + (client.referralsCount || 0);
    return total >= 8 && total < 10;
  }

  // Vérifie si le client a atteint la récompense
  hasReachedReward(client: ClientProfile): boolean {
    const total = (client.eligibleTreatments || 0) + (client.referralsCount || 0);
    return total >= 10;
  }
}