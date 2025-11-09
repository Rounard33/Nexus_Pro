import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {Appointment, ContentService} from '../../../services/content.service';

interface StatCard {
  title: string;
  value: number;
  label: string;
  icon: string;
  color: string;
}

interface PrestationStats {
  prestation: string;
  count: number;
}

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
  isLoading = true;

  constructor(private contentService: ContentService) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  private loadStatistics(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Charger tous les rendez-vous du mois
    this.contentService.getAppointments(
      undefined,
      firstDayOfMonth.toISOString().split('T')[0],
      lastDayOfMonth.toISOString().split('T')[0]
    ).subscribe({
      next: (appointments) => {
        this.calculateStats(appointments);
        this.calculateTopPrestations(appointments);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.isLoading = false;
      }
    });
  }

  private calculateStats(appointments: Appointment[]): void {
    const pending = appointments.filter(a => a.status === 'pending').length;
    const accepted = appointments.filter(a => a.status === 'accepted').length;
    const rejected = appointments.filter(a => a.status === 'rejected').length;
    // total ne compte que les rendez-vous acceptés (pas les pending)
    const total = accepted;
    const acceptanceRate = (accepted + rejected) > 0 ? Math.round((accepted / (accepted + rejected)) * 100) : 0;

    this.stats = [
      {
        title: 'Total acceptés ce mois',
        value: total,
        label: 'rendez-vous',
        icon: 'calendar',
        color: 'primary'
      },
      {
        title: 'En attente',
        value: pending,
        label: 'rendez-vous',
        icon: 'clock',
        color: 'warning'
      },
      {
        title: 'Acceptés',
        value: accepted,
        label: 'rendez-vous',
        icon: 'check',
        color: 'success'
      },
      {
        title: 'Refusés',
        value: rejected,
        label: 'rendez-vous',
        icon: 'x',
        color: 'danger'
      },
      {
        title: 'Taux d\'acceptation',
        value: acceptanceRate,
        label: '%',
        icon: 'chart',
        color: 'info'
      }
    ];
  }

  private calculateTopPrestations(appointments: Appointment[]): void {
    const prestationCounts: {[key: string]: number} = {};

    appointments.forEach(appointment => {
      const prestationName = appointment.prestations?.name || 'Inconnue';
      prestationCounts[prestationName] = (prestationCounts[prestationName] || 0) + 1;
    });

    this.topPrestations = Object.entries(prestationCounts)
      .map(([prestation, count]) => ({prestation, count}))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }
}

