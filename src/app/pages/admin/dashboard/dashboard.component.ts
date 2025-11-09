import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {Router, RouterModule} from '@angular/router';
import {Appointment, ContentService} from '../../../services/content.service';

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
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadRecentAppointments();
  }

  private loadStats(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    this.contentService.getAppointments(
      undefined,
      firstDayOfMonth.toISOString().split('T')[0],
      lastDayOfMonth.toISOString().split('T')[0]
    ).subscribe({
      next: (appointments) => {
        // totalThisMonth ne compte que les rendez-vous acceptés (pas les pending)
        const acceptedAppointments = appointments.filter(a => a.status === 'accepted');
        this.stats.totalThisMonth = acceptedAppointments.length;
        this.stats.acceptedThisMonth = acceptedAppointments.length;
        this.stats.rejectedThisMonth = appointments.filter(a => a.status === 'rejected').length;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
      }
    });

    this.contentService.getAppointments('pending').subscribe({
      next: (appointments) => {
        this.stats.pending = appointments.length;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rendez-vous en attente:', error);
        this.isLoading = false;
      }
    });
  }

  private loadRecentAppointments(): void {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    this.contentService.getAppointments(
      undefined,
      today.toISOString().split('T')[0],
      nextWeek.toISOString().split('T')[0]
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
      error: (error) => {
        console.error('Erreur lors du chargement des rendez-vous récents:', error);
      }
    });
  }

  getAcceptanceRate(): number {
    const total = this.stats.acceptedThisMonth + this.stats.rejectedThisMonth;
    if (total === 0) return 0;
    return Math.round((this.stats.acceptedThisMonth / total) * 100);
  }

  openDetails(type: string): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startDate = firstDayOfMonth.toISOString().split('T')[0];
    const endDate = lastDayOfMonth.toISOString().split('T')[0];

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

