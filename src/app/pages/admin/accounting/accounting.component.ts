import {CommonModule, registerLocaleData} from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {Component, LOCALE_ID, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {forkJoin} from 'rxjs';
import {Appointment, ContentService, Prestation} from '../../../services/content.service';

registerLocaleData(localeFr);

interface MonthlyStats {
  revenue: number;
  revenueLastMonth: number;
  revenueChange: number;
  completedAppointments: number;
  newClients: number;
  averageBasket: number;
  cancellationRate: number;
  topPrestation: { name: string; count: number } | null;
  paymentMethods: { method: string; amount: number; percentage: number }[];
}

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [CommonModule, RouterModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'fr-FR' }
  ],
  templateUrl: './accounting.component.html',
  styleUrl: './accounting.component.scss'
})
export class AccountingComponent implements OnInit {
  currentMonth: Date = new Date();
  stats: MonthlyStats = {
    revenue: 0,
    revenueLastMonth: 0,
    revenueChange: 0,
    completedAppointments: 0,
    newClients: 0,
    averageBasket: 0,
    cancellationRate: 0,
    topPrestation: null,
    paymentMethods: []
  };
  isLoading = true;

  private appointments: Appointment[] = [];
  private prestations: Prestation[] = [];
  private allClients: Set<string> = new Set();

  constructor(private contentService: ContentService) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const startOfLastMonth = this.getFirstDayOfMonth(-1);
    const endOfCurrentMonth = this.getLastDayOfMonth(0);

    forkJoin({
      appointments: this.contentService.getAppointments(undefined, startOfLastMonth, endOfCurrentMonth),
      prestations: this.contentService.getPrestations(),
      allAppointments: this.contentService.getAppointments()
    }).subscribe({
      next: ({ appointments, prestations, allAppointments }) => {
        this.appointments = appointments;
        this.prestations = prestations;
        
        // Collecter tous les emails clients historiques
        allAppointments.forEach(apt => {
          if (apt.status === 'completed' || apt.status === 'accepted') {
            this.allClients.add(apt.client_email.toLowerCase().trim());
          }
        });

        this.calculateStats();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateStats(): void {
    const currentMonthStart = this.getFirstDayOfMonth(0);
    const currentMonthEnd = this.getLastDayOfMonth(0);
    const lastMonthStart = this.getFirstDayOfMonth(-1);
    const lastMonthEnd = this.getLastDayOfMonth(-1);

    // Filtrer les RDV du mois courant et du mois précédent
    const currentMonthApts = this.appointments.filter(apt => 
      apt.appointment_date >= currentMonthStart && apt.appointment_date <= currentMonthEnd
    );
    const lastMonthApts = this.appointments.filter(apt => 
      apt.appointment_date >= lastMonthStart && apt.appointment_date <= lastMonthEnd
    );

    // RDV terminés ce mois
    const completedThisMonth = currentMonthApts.filter(apt => apt.status === 'completed');
    const completedLastMonth = lastMonthApts.filter(apt => apt.status === 'completed');

    // Calcul du CA
    this.stats.revenue = this.calculateRevenue(completedThisMonth);
    this.stats.revenueLastMonth = this.calculateRevenue(completedLastMonth);
    this.stats.revenueChange = this.stats.revenueLastMonth > 0
      ? Math.round(((this.stats.revenue - this.stats.revenueLastMonth) / this.stats.revenueLastMonth) * 100)
      : (this.stats.revenue > 0 ? 100 : 0);

    // RDV terminés
    this.stats.completedAppointments = completedThisMonth.length;

    // Nouveaux clients ce mois
    this.stats.newClients = this.countNewClients(currentMonthApts, currentMonthStart);

    // Panier moyen
    this.stats.averageBasket = completedThisMonth.length > 0
      ? Math.round(this.stats.revenue / completedThisMonth.length)
      : 0;

    // Taux d'annulation
    const totalBooked = currentMonthApts.filter(apt => 
      apt.status === 'accepted' || apt.status === 'completed' || apt.status === 'cancelled'
    ).length;
    const cancelled = currentMonthApts.filter(apt => apt.status === 'cancelled').length;
    this.stats.cancellationRate = totalBooked > 0
      ? Math.round((cancelled / totalBooked) * 100)
      : 0;

    // Top prestation
    this.stats.topPrestation = this.getTopPrestation(completedThisMonth);

    // Modes de paiement
    this.stats.paymentMethods = this.calculatePaymentMethods(completedThisMonth);
  }

  private calculateRevenue(appointments: Appointment[]): number {
    let total = 0;
    appointments.forEach(apt => {
      if (apt.prestation_id) {
        const prestation = this.prestations.find(p => p.id === apt.prestation_id);
        if (prestation?.price) {
          const price = parseFloat(prestation.price.replace(/[^\d,.]/g, '').replace(',', '.'));
          if (!isNaN(price)) {
            total += price;
          }
        }
      }
    });
    return total;
  }

  private countNewClients(monthApts: Appointment[], monthStart: string): number {
    const newClients = new Set<string>();
    
    monthApts.forEach(apt => {
      if (apt.status === 'completed' || apt.status === 'accepted') {
        const email = apt.client_email.toLowerCase().trim();
        // Vérifier si c'est leur premier RDV ce mois
        const hasEarlierApt = this.appointments.some(a => 
          a.client_email.toLowerCase().trim() === email &&
          a.appointment_date < monthStart &&
          (a.status === 'completed' || a.status === 'accepted')
        );
        if (!hasEarlierApt) {
          newClients.add(email);
        }
      }
    });
    
    return newClients.size;
  }

  private getTopPrestation(appointments: Appointment[]): { name: string; count: number } | null {
    const prestationCounts: { [key: string]: { name: string; count: number } } = {};
    
    appointments.forEach(apt => {
      const name = apt.prestations?.name || 'Autre';
      if (!prestationCounts[name]) {
        prestationCounts[name] = { name, count: 0 };
      }
      prestationCounts[name].count++;
    });

    const sorted = Object.values(prestationCounts).sort((a, b) => b.count - a.count);
    return sorted.length > 0 ? sorted[0] : null;
  }

  private calculatePaymentMethods(appointments: Appointment[]): { method: string; amount: number; percentage: number }[] {
    const methods: { [key: string]: number } = {
      'carte': 0,
      'espèces': 0,
      'virement': 0,
      'chèque': 0
    };

    appointments.forEach(apt => {
      const method = apt.payment_method?.toLowerCase() || 'espèces';
      if (apt.prestation_id) {
        const prestation = this.prestations.find(p => p.id === apt.prestation_id);
        if (prestation?.price) {
          const price = parseFloat(prestation.price.replace(/[^\d,.]/g, '').replace(',', '.'));
          if (!isNaN(price)) {
            if (methods[method] !== undefined) {
              methods[method] += price;
            } else {
              methods['espèces'] += price;
            }
          }
        }
      }
    });

    const total = Object.values(methods).reduce((sum, val) => sum + val, 0);
    
    return Object.entries(methods)
      .map(([method, amount]) => ({
        method,
        amount: Math.round(amount),
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0
      }))
      .filter(m => m.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }

  private getFirstDayOfMonth(offset: number = 0): string {
    const date = new Date(this.currentMonth);
    date.setMonth(date.getMonth() + offset);
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  private getLastDayOfMonth(offset: number = 0): string {
    const date = new Date(this.currentMonth);
    date.setMonth(date.getMonth() + offset + 1);
    date.setDate(0);
    return date.toISOString().split('T')[0];
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() - 1));
    this.isLoading = true;
    this.loadData();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.setMonth(this.currentMonth.getMonth() + 1));
    this.isLoading = true;
    this.loadData();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentMonth.getMonth() === now.getMonth() && 
           this.currentMonth.getFullYear() === now.getFullYear();
  }

  getPaymentIcon(method: string): string {
    switch (method) {
      case 'carte': return '💳';
      case 'espèces': return '💵';
      case 'virement': return '🏦';
      case 'chèque': return '📝';
      default: return '💰';
    }
  }

  getPaymentLabel(method: string): string {
    switch (method) {
      case 'carte': return 'Carte bancaire';
      case 'espèces': return 'Espèces';
      case 'virement': return 'Virement';
      case 'chèque': return 'Chèque';
      default: return method;
    }
  }
}

