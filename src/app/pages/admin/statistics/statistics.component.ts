import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {PrestationStats, StatCard} from '../../../models/statistics.model';
import {Appointment, ContentService, Prestation} from '../../../services/content.service';
import {StatisticsService} from '../../../services/statistics.service';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit {
  stats: StatCard[] = [];
  topPrestations: PrestationStats[] = [];
  paymentMethods: {[key: string]: number} = {};
  averageClientVisits: number = 0;
  averageBasket: number = 0;
  timeSlotStats: Array<{time: string; count: number; percentage: number}> = [];
  isLoading = true;

  constructor(
    private contentService: ContentService,
    private statisticsService: StatisticsService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  private loadStatistics(): void {
    // Charger tous les rendez-vous de l'année en cours
    const currentYear = new Date().getFullYear();
    const startOfYear = `${currentYear}-01-01`;
    const endOfYear = `${currentYear}-12-31`;

    // Charger les rendez-vous et les prestations en parallèle
    this.contentService.getAppointments(undefined, startOfYear, endOfYear).subscribe({
      next: (appointments) => {
        this.contentService.getPrestations().subscribe({
          next: (prestations) => {
            this.calculateStats(appointments);
            this.calculateTopPrestations(appointments);
            this.calculatePaymentMethods(appointments);
            this.calculateAverageClientVisits(appointments);
            this.calculateAverageBasket(appointments, prestations);
            this.calculateTimeSlotStats(appointments);
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

  private calculateStats(appointments: Appointment[]): void {
    const stats = this.statisticsService.calculateStats(appointments);

    this.stats = [
      {
        title: 'Total acceptés ce mois',
        value: stats.total,
        label: 'rendez-vous',
        icon: 'calendar',
        color: 'primary'
      },
      {
        title: 'En attente',
        value: stats.pending,
        label: 'rendez-vous',
        icon: 'clock',
        color: 'warning'
      },
      {
        title: 'Acceptés',
        value: stats.accepted,
        label: 'rendez-vous',
        icon: 'check',
        color: 'success'
      },
      {
        title: 'Refusés',
        value: stats.rejected,
        label: 'rendez-vous',
        icon: 'x',
        color: 'danger'
      },
      {
        title: 'Taux d\'acceptation',
        value: stats.acceptanceRate,
        label: '%',
        icon: 'chart',
        color: 'info'
      }
    ];
  }

  private calculateTopPrestations(appointments: Appointment[]): void {
    this.topPrestations = this.statisticsService
      .calculatePrestationStats(appointments)
      .slice(0, 5);
  }

  private calculatePaymentMethods(appointments: Appointment[]): void {
    const paymentStats = this.statisticsService.calculatePaymentMethods(appointments);
    this.paymentMethods = paymentStats;
  }

  private calculateAverageClientVisits(appointments: Appointment[]): void {
    this.averageClientVisits = this.statisticsService.calculateAverageClientVisits(appointments);
  }

  private calculateAverageBasket(appointments: Appointment[], prestations: Prestation[]): void {
    this.averageBasket = this.statisticsService.calculateAverageBasket(appointments, prestations);
  }

  getPaymentMethodLabel(method: string): string {
    const labels: {[key: string]: string} = {
      'espèces': 'Espèces',
      'carte': 'Carte bancaire',
      'virement': 'Virement',
      'chèque': 'Chèque'
    };
    return labels[method] || method;
  }

  getPaymentMethodPercentage(method: string): number {
    const total = Object.values(this.paymentMethods).reduce((sum, count) => sum + count, 0);
    if (total === 0) return 0;
    const count = this.paymentMethods[method] || 0;
    return (count / total) * 100;
  }

  getPaymentMethodsSorted(): Array<{key: string; count: number; percentage: number}> {
    if (!this.paymentMethods) return [];
    
    const total = this.getTotalPayments();
    const methods = ['espèces', 'carte', 'virement', 'chèque'];
    
    return methods
      .map(key => ({
        key,
        count: this.paymentMethods[key] || 0,
        percentage: total > 0 ? (this.paymentMethods[key] || 0) / total * 100 : 0
      }))
      .sort((a, b) => b.count - a.count); // Trier par nombre décroissant
  } 

  getTotalPayments(): number {
    if (!this.paymentMethods) return 0;
    return Object.values(this.paymentMethods).reduce((sum, count) => sum + count, 0);
  }

   private calculateTimeSlotStats(appointments: Appointment[]): void {
    this.timeSlotStats = this.statisticsService.calculateTimeSlotStats(appointments);
  }

  getTopTimeSlots(count: number = 5): Array<{time: string; count: number; percentage: number}> {
    return this.timeSlotStats.slice(0, count);
  }

  getLeastUsedTimeSlots(count: number = 5): Array<{time: string; count: number; percentage: number}> {
    const withReservations = this.timeSlotStats.filter(ts => ts.count > 0);
    return withReservations.slice(-count).reverse();
  }

  getTotalTimeSlots(): number {
    return this.timeSlotStats.length;
  }

  getTotalReservations(): number {
    return this.timeSlotStats.reduce((sum, ts) => sum + ts.count, 0);
  }
}