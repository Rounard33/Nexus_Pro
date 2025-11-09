import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterModule} from '@angular/router';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, debounceTime, distinctUntilChanged, takeUntil} from 'rxjs/operators';
import {Appointment, ContentService} from '../../../services/content.service';

export interface ClientProfile {
  email: string;
  name: string;
  phone?: string;
  birthdate?: string;
  appointments: Appointment[];
  totalAppointments: number;
  acceptedAppointments: number;
  pendingAppointments: number;
  lastAppointmentDate: string | null;
  firstAppointmentDate: string | null;
  nextBirthday?: string | null;
  age?: number | null;
}

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
        this.clients = this.groupAppointmentsByClient(appointments);
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
              const {nextBirthday, age} = this.calculateBirthdayInfo(clientData.birthdate);
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

  private groupAppointmentsByClient(appointments: Appointment[]): ClientProfile[] {
    const clientsMap = new Map<string, ClientProfile>();

    appointments.forEach(apt => {
      const email = apt.client_email.toLowerCase().trim();
      
      if (!clientsMap.has(email)) {
        clientsMap.set(email, {
          email: apt.client_email,
          name: apt.client_name,
          phone: apt.client_phone,
          appointments: [],
          totalAppointments: 0,
          acceptedAppointments: 0,
          pendingAppointments: 0,
          lastAppointmentDate: null,
          firstAppointmentDate: null,
          nextBirthday: null,
          age: null
        });
      }
      
      const client = clientsMap.get(email)!;
      client.appointments.push(apt);
      
      // Compter seulement les rendez-vous acceptés dans totalAppointments
      if (apt.status === 'accepted') {
        client.totalAppointments++;
        client.acceptedAppointments++;
        
        // Mettre à jour les dates seulement pour les rendez-vous acceptés
        if (!client.lastAppointmentDate || apt.appointment_date > client.lastAppointmentDate) {
          client.lastAppointmentDate = apt.appointment_date;
        }
        
        if (!client.firstAppointmentDate || apt.appointment_date < client.firstAppointmentDate) {
          client.firstAppointmentDate = apt.appointment_date;
        }
      } else if (apt.status === 'pending') {
        client.pendingAppointments++;
      }
    });

    // Convertir en tableau et trier par dernier RDV accepté (plus récent en premier)
    // Si pas de RDV accepté, trier par total de RDV acceptés
    return Array.from(clientsMap.values()).sort((a, b) => {
      // Priorité 1 : Date du dernier RDV accepté
      if (a.lastAppointmentDate && b.lastAppointmentDate) {
        return b.lastAppointmentDate.localeCompare(a.lastAppointmentDate);
      }
      if (a.lastAppointmentDate) return -1;
      if (b.lastAppointmentDate) return 1;
      
      // Priorité 2 : Nombre de RDV acceptés
      return b.totalAppointments - a.totalAppointments;
    });
  }

  private calculateBirthdayInfo(birthdate: string | null | undefined): {nextBirthday: string | null; age: number | null} {
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
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}

