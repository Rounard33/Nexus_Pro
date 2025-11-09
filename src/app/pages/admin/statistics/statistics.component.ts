import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {Appointment, ContentService} from '../../../services/content.service';
import {StatCard, PrestationStats} from '../../../models/statistics.model';
import {StatisticsService} from '../../../services/statistics.service';
import {DateUtils} from '../../../utils/date.utils';

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

  constructor(
    private contentService: ContentService,
    private statisticsService: StatisticsService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  private loadStatistics(): void {
    // Charger tous les rendez-vous du mois
    this.contentService.getAppointments(
      undefined,
      DateUtils.getFirstDayOfMonth(),
      DateUtils.getLastDayOfMonth()
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
}

