import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {ClientProfile} from '../../../models/clients.model';
import {ClientService} from '../../../services/client.service';
import {Client, ContentService} from '../../../services/content.service';
import {BirthdayUtils} from '../../../utils/birthday.utils';
import {generateTemporaryClientId} from '../../../utils/client-id-helper';
import {BodyScrollLockDirective} from '../../../directives/body-scroll-lock.directive';
import {FormatUtils} from '../../../utils/format.utils';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, BodyScrollLockDirective],
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss'
})
export class ClientsComponent implements OnInit, OnDestroy {
  clients: ClientProfile[] = [];
  filteredClients: ClientProfile[] = [];
  isLoading = false;
  searchTerm: string = '';

  // Modal création client
  showCreateModal = false;
  isCreating = false;
  newClient = { name: '', email: '', phone: '', notes: '' };
  
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

    forkJoin({
      appointments: this.contentService.getAppointments().pipe(catchError(() => of([]))),
      dbClients: this.contentService.getAllClients().pipe(catchError(() => of([] as Client[])))
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: ({ appointments, dbClients }) => {
        // 1) Clients issus des rendez-vous
        const fromAppointments = this.clientService.groupAppointmentsByClient(appointments);

        // 2) Indexer par email pour la fusion
        const clientsMap = new Map<string, ClientProfile>();
        for (const c of fromAppointments) {
          clientsMap.set(c.email.toLowerCase().trim(), c);
        }

        // 3) Ajouter les clients de la base qui n'ont pas de rendez-vous
        for (const dbClient of dbClients) {
          const email = dbClient.email.toLowerCase().trim();
          if (clientsMap.has(email)) {
            // Le client existe déjà via les RDV, on enrichit avec les données de la base
            const existing = clientsMap.get(email)!;
            this.enrichClientFromDb(existing, dbClient);
          } else {
            // Client sans rendez-vous : créer un profil vide
            const profile: ClientProfile = {
              id: dbClient.id,
              clientId: dbClient.clientId || generateTemporaryClientId(email),
              email: dbClient.email,
              name: dbClient.name || email,
              phone: dbClient.phone,
              birthdate: dbClient.birthdate,
              appointments: [],
              totalAppointments: 0,
              acceptedAppointments: 0,
              pendingAppointments: 0,
              lastAppointmentDate: null,
              firstAppointmentDate: null,
              eligibleTreatments: 0,
              referralsCount: dbClient.referrals_count || 0
            };
            if (dbClient.birthdate) {
              const { nextBirthday, age } = BirthdayUtils.calculateBirthdayInfo(dbClient.birthdate);
              profile.nextBirthday = nextBirthday;
              profile.age = age;
            }
            clientsMap.set(email, profile);
          }
        }

        // 4) Pour les clients issus des RDV sans données en base, générer un clientId temporaire
        for (const client of clientsMap.values()) {
          if (!client.clientId) {
            client.clientId = generateTemporaryClientId(client.email);
          }
          // Calculer eligibleTreatments
          const eligible = client.appointments.filter(apt => {
            if (apt.status !== 'completed') return false;
            const name = apt.prestations?.name?.toLowerCase() || '';
            return !name.includes('tirage') && !name.includes('carte');
          });
          client.eligibleTreatments = eligible.length;
        }

        this.clients = Array.from(clientsMap.values());
        this.sortClientsList();
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private enrichClientFromDb(client: ClientProfile, dbClient: Client): void {
    client.id = dbClient.id;
    client.clientId = dbClient.clientId || client.clientId;
    client.referralsCount = dbClient.referrals_count || 0;
    if (dbClient.birthdate) {
      client.birthdate = dbClient.birthdate;
      const { nextBirthday, age } = BirthdayUtils.calculateBirthdayInfo(dbClient.birthdate);
      client.nextBirthday = nextBirthday;
      client.age = age;
    }
  }

  private sortClientsList(): void {
    this.clients.sort((a, b) => {
      if (a.lastAppointmentDate && b.lastAppointmentDate) {
        return b.lastAppointmentDate.localeCompare(a.lastAppointmentDate);
      }
      if (a.lastAppointmentDate) return -1;
      if (b.lastAppointmentDate) return 1;
      return (a.name || '').localeCompare(b.name || '');
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
      error: () => {
        // Fallback: navigation impossible sans clientId valide
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

  // ==================== Création manuelle de client ====================

  openCreateClientModal(): void {
    this.newClient = { name: '', email: '', phone: '', notes: '' };
    this.showCreateModal = true;
  }

  closeCreateClientModal(): void {
    this.showCreateModal = false;
  }

  submitNewClient(): void {
    if (!this.newClient.name.trim()) {
      return;
    }

    this.isCreating = true;

    const clientData: any = {
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

    // L'API clients requiert un email, on génère un placeholder si absent
    if (!clientData.email) {
      clientData.email = `client-${Date.now()}@manuel.local`;
    }

    this.contentService.createOrUpdateClient(clientData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.isCreating = false;
          this.closeCreateClientModal();
          this.loadClients();
        },
        error: () => {
          this.isCreating = false;
        }
      });
  }
}