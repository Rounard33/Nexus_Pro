import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {Appointment, ContentService} from '../../../services/content.service';
import {StatisticsService} from '../../../services/statistics.service';
import {DateUtils} from '../../../utils/date.utils';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  stats = {
    totalThisMonth: 0,
    pending: 0,
    acceptedThisMonth: 0,
    rejectedThisMonth: 0
  };
  recentAppointments: Appointment[] = [];
  isLoading = true;

  constructor(
    private contentService: ContentService,
    private statisticsService: StatisticsService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentAppointments();
  }

  private loadStats(): void {
    this.contentService.getAppointments(
      undefined,
      DateUtils.getFirstDayOfMonth(),
      DateUtils.getLastDayOfMonth()
    ).subscribe({
      next: (appointments) => {
        const stats = this.statisticsService.calculateStats(appointments);
        this.stats.totalThisMonth = stats.total;
        this.stats.acceptedThisMonth = stats.accepted;
        this.stats.rejectedThisMonth = stats.rejected;
      },
      error: () => {
        // Erreur silencieuse
      }
    });

    this.contentService.getAppointments('pending').subscribe({
      next: (appointments) => {
        this.stats.pending = appointments.length;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadRecentAppointments(): void {
    this.contentService.getAppointments(
      undefined,
      DateUtils.getTodayISO(),
      DateUtils.getDateInDays(7)
    ).subscribe({
      next: (appointments) => {
        this.recentAppointments = appointments
          .sort((a, b) => {
            const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
            const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
            return dateA.getTime() - dateB.getTime();
          })
          .slice(0, 5);
      },
      error: () => {
        // Erreur silencieuse
      }
    });
  }

  getAcceptanceRate(): number {
    return this.statisticsService.calculateAcceptanceRate(
      this.stats.acceptedThisMonth,
      this.stats.rejectedThisMonth
    );
  }

  openDetails(type: string): void {
    switch (type) {
      case 'total':
        // Tous les rendez-vous du mois
        this.router.navigate(['/admin/appointments'], {
          queryParams: { dateFilter: 'month' }
        });
        break;
      case 'pending':
        // Rendez-vous en attente
        this.router.navigate(['/admin/appointments'], {
          queryParams: { statusFilter: 'pending' }
        });
        break;
      case 'accepted':
        // Rendez-vous acceptés ce mois
        this.router.navigate(['/admin/appointments'], {
          queryParams: { statusFilter: 'accepted', dateFilter: 'month' }
        });
        break;
      case 'rejected':
        // Rendez-vous refusés ce mois
        this.router.navigate(['/admin/appointments'], {
          queryParams: { statusFilter: 'rejected', dateFilter: 'month' }
        });
        break;
      case 'rate':
        // Aller vers les statistiques
        this.router.navigate(['/admin/statistics']);
        break;
    }
  }
}