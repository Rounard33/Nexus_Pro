import {CommonModule, registerLocaleData} from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {Component, LOCALE_ID, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {forkJoin} from 'rxjs';
import {AdditionalSalesService} from '../../../services/additional-sales.service';
import {Appointment, Client, ContentService, Prestation} from '../../../services/content.service';
import {
  appointmentUnitPortionEur,
  collectForfaitCountedAppointmentIds,
  collectGiftCardCoverageEuroByAppointment,
  sumAdditionalSalesInDateRange,
  sumAppointmentUnitRevenue
} from '../../../utils/accounting-revenue.utils';

registerLocaleData(localeFr);

interface MonthlyStats {
  revenue: number;
  /** CA séances à l’unité (hors séances prépayées via forfait). */
  revenueAppointmentsUnit: number;
  /** Ventes de forfaits encaissées ce mois (date de vente). */
  revenueForfaits: number;
  /** Ventes de cartes cadeaux ce mois (date de vente). */
  revenueGiftCards: number;
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
    revenueAppointmentsUnit: 0,
    revenueForfaits: 0,
    revenueGiftCards: 0,
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
  /** RDV dont le prix est déjà couvert par un forfait vendu. */
  private forfaitCountedAppointmentIds = new Set<string>();
  /** Montants prélevés sur cartes cadeaux par ID de RDV. */
  private giftCoverageByAppointment = new Map<string, number>();

  constructor(
    private contentService: ContentService,
    private additionalSalesService: AdditionalSalesService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  private loadData(): void {
    const startOfLastMonth = this.getFirstDayOfMonth(-1);
    const endOfCurrentMonth = this.getLastDayOfMonth(0);

    forkJoin({
      appointments: this.contentService.getAppointments(undefined, startOfLastMonth, endOfCurrentMonth),
      prestations: this.contentService.getPrestations(),
      allAppointments: this.contentService.getAppointments(),
      clients: this.contentService.getAllClients()
    }).subscribe({
      next: ({ appointments, prestations, allAppointments, clients }) => {
        this.appointments = appointments;
        this.prestations = prestations;
        this.forfaitCountedAppointmentIds = collectForfaitCountedAppointmentIds(
          (notes) => this.additionalSalesService.parseAdditionalSales(notes),
          clients
        );
        this.giftCoverageByAppointment = collectGiftCardCoverageEuroByAppointment(
          (notes) => this.additionalSalesService.parseAdditionalSales(notes),
          clients
        );
        
        // Collecter tous les emails clients historiques
        allAppointments.forEach(apt => {
          if (apt.status === 'completed' || apt.status === 'accepted') {
            this.allClients.add(apt.client_email.toLowerCase().trim());
          }
        });

        this.calculateStats(clients);
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private calculateStats(clients: Client[]): void {
    const currentMonthStart = this.getFirstDayOfMonth(0);
    const currentMonthEnd = this.getLastDayOfMonth(0);
    const lastMonthStart = this.getFirstDayOfMonth(-1);
    const lastMonthEnd = this.getLastDayOfMonth(-1);

    const parseSales = (notes: string | undefined) =>
      this.additionalSalesService.parseAdditionalSales(notes);

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

    const salesCurrent = sumAdditionalSalesInDateRange(parseSales, clients, currentMonthStart, currentMonthEnd);
    const salesLast = sumAdditionalSalesInDateRange(parseSales, clients, lastMonthStart, lastMonthEnd);

    const giftCov = this.giftCoverageByAppointment;

    const unitRevThis = sumAppointmentUnitRevenue(
      completedThisMonth,
      this.prestations,
      this.forfaitCountedAppointmentIds,
      giftCov
    );
    const unitRevLast = sumAppointmentUnitRevenue(
      completedLastMonth,
      this.prestations,
      this.forfaitCountedAppointmentIds,
      giftCov
    );

    this.stats.revenueAppointmentsUnit = unitRevThis;
    this.stats.revenueForfaits = salesCurrent.forfaits;
    this.stats.revenueGiftCards = salesCurrent.giftCards;
    this.stats.revenue = Math.round((unitRevThis + salesCurrent.total) * 100) / 100;

    const revLastTotal = Math.round((unitRevLast + salesLast.total) * 100) / 100;
    this.stats.revenueLastMonth = revLastTotal;
    this.stats.revenueChange = revLastTotal > 0
      ? Math.round(((this.stats.revenue - revLastTotal) / revLastTotal) * 100)
      : (this.stats.revenue > 0 ? 100 : 0);

    // RDV terminés
    this.stats.completedAppointments = completedThisMonth.length;

    // Nouveaux clients ce mois
    this.stats.newClients = this.countNewClients(currentMonthApts, currentMonthStart);

    const completedUnitCount = completedThisMonth.filter((apt) =>
      appointmentUnitPortionEur(apt, this.prestations, this.forfaitCountedAppointmentIds, giftCov) > 0
    ).length;

    this.stats.averageBasket =
      completedUnitCount > 0 ? Math.round(unitRevThis / completedUnitCount) : 0;

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

    // Modes de paiement (séances à l’unité + lignes forfaits / cartes)
    this.stats.paymentMethods = this.calculatePaymentMethods(completedThisMonth, salesCurrent, giftCov);
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

  private calculatePaymentMethods(
    appointments: Appointment[],
    salesMonth: { forfaits: number; giftCards: number },
    giftCoverageByAppointment: Map<string, number>
  ): { method: string; amount: number; percentage: number }[] {
    const methods: { [key: string]: number } = {
      carte: 0,
      espèces: 0,
      virement: 0,
      chèque: 0,
      forfaits: salesMonth.forfaits,
      cartes_cadeaux: salesMonth.giftCards
    };

    appointments.forEach((apt) => {
      const alloc = appointmentUnitPortionEur(
        apt,
        this.prestations,
        this.forfaitCountedAppointmentIds,
        giftCoverageByAppointment
      );
      if (alloc <= 0) {
        return;
      }
      const raw = apt.payment_method?.toLowerCase() || 'espèces';
      let bucket: 'carte' | 'espèces' | 'virement' | 'chèque';
      if (raw === 'mixte') {
        const comp = (apt.mixte_complement_payment_method || 'espèces').toLowerCase();
        if (['carte', 'espèces', 'virement', 'chèque'].includes(comp)) {
          bucket = comp as 'carte' | 'espèces' | 'virement' | 'chèque';
        } else {
          bucket = 'espèces';
        }
      } else if (raw === 'carte_cadeau') {
        bucket = 'espèces';
      } else if (['carte', 'espèces', 'virement', 'chèque'].includes(raw)) {
        bucket = raw as 'carte' | 'espèces' | 'virement' | 'chèque';
      } else {
        bucket = 'espèces';
      }
      methods[bucket] += alloc;
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
      case 'forfaits': return '📦';
      case 'cartes_cadeaux': return '🎁';
      default: return '💰';
    }
  }

  getPaymentLabel(method: string): string {
    switch (method) {
      case 'carte': return 'Carte bancaire';
      case 'espèces': return 'Espèces';
      case 'virement': return 'Virement';
      case 'chèque': return 'Chèque';
      case 'forfaits': return 'Ventes forfaits';
      case 'cartes_cadeaux': return 'Cartes cadeaux';
      default: return method;
    }
  }
}

