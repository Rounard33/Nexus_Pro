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
          if (clientData && clientData.birthdate) {
            const client = this.clients[index];
            if (client) {
              client.birthdate = clientData.birthdate;
              const {nextBirthday, age} = BirthdayUtils.calculateBirthdayInfo(clientData.birthdate);
              client.nextBirthday = nextBirthday;
              client.age = age;
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
    this.router.navigate(['/admin/clients', encodeURIComponent(client.email)]);
  }

  formatDate(dateString: string | null): string {
    return FormatUtils.formatShortDate(dateString);
  }
}