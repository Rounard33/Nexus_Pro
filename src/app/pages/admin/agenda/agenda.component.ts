import {CommonModule, registerLocaleData} from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import {ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, LOCALE_ID, OnInit} from '@angular/core';
import {
    CalendarA11y,
    CalendarDateFormatter,
    CalendarEvent,
    CalendarEventTitleFormatter,
    CalendarModule,
    CalendarUtils,
    CalendarView,
    DateAdapter
} from 'angular-calendar';
import {adapterFactory} from 'angular-calendar/date-adapters/date-fns';
import {
    addMonths,
    addWeeks,
    format,
    isSameDay,
    isSameMonth,
    subMonths,
    subWeeks
} from 'date-fns';
import {fr} from 'date-fns/locale';
import {Subject} from 'rxjs';
import {Appointment, ContentService} from '../../../services/content.service';

// Register the French locale
registerLocaleData(localeFr);

// Couleurs par statut
const colors: Record<string, { primary: string; secondary: string }> = {
  pending: {
    primary: '#f59e0b',
    secondary: '#fef3c7',
  },
  accepted: {
    primary: '#10b981',
    secondary: '#d1fae5',
  },
  completed: {
    primary: '#047857',
    secondary: '#a7f3d0',
  },
  rejected: {
    primary: '#ef4444',
    secondary: '#fee2e2',
  },
  cancelled: {
    primary: '#6b7280',
    secondary: '#f3f4f6',
  },
};

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, CalendarModule],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: DateAdapter,
      useFactory: adapterFactory,
    },
    {
      provide: LOCALE_ID,
      useValue: 'fr-FR',
    },
    CalendarUtils,
    CalendarA11y,
    CalendarDateFormatter,
    CalendarEventTitleFormatter,
  ],
})
export class AgendaComponent implements OnInit {
  view: CalendarView = CalendarView.Month;
  CalendarView = CalendarView;
  viewDate: Date = new Date();
  
  refresh = new Subject<void>();
  events: CalendarEvent[] = [];
  appointments: Appointment[] = [];
  
  selectedDayAppointments: Appointment[] = [];
  selectedDate: Date | null = null;
  
  isLoading = true;
  locale = 'fr';
  isMobile = false;

  // Jours de la semaine en français
  weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  constructor(
    private contentService: ContentService,
    private cdr: ChangeDetectorRef
  ) {
    this.checkMobile();
  }

  ngOnInit(): void {
    this.loadAppointments();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth <= 768;
    // Force month view on mobile
    if (this.isMobile && this.view === CalendarView.Week) {
      this.view = CalendarView.Month;
      this.cdr.markForCheck();
    }
  }

  loadAppointments(): void {
    this.isLoading = true;
    
    // Charger les rendez-vous des 3 derniers mois et 6 prochains mois
    const startDate = format(subMonths(new Date(), 3), 'yyyy-MM-dd');
    const endDate = format(addMonths(new Date(), 6), 'yyyy-MM-dd');
    
    this.contentService.getAppointments(undefined, startDate, endDate).subscribe({
      next: (appointments) => {
        this.appointments = appointments;
        this.events = this.appointmentsToEvents(appointments);
        this.isLoading = false;
        this.refresh.next();
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private appointmentsToEvents(appointments: Appointment[]): CalendarEvent[] {
    const BUFFER_MINUTES = 15; // 15 min de pause entre les rendez-vous
    const DEFAULT_DURATION = 90; // Durée par défaut si non spécifiée (en minutes)

    return appointments
      .filter(apt => apt.status !== 'cancelled') // Exclure les annulés par défaut
      .map(apt => {
        const [hours, minutes] = apt.appointment_time.split(':').map(Number);
        const startDate = new Date(apt.appointment_date);
        startDate.setHours(hours, minutes, 0, 0);
        
        // Calculer la durée : durée de la prestation + buffer
        const prestationDuration = this.parseDuration(apt.prestations?.duration);
        const totalDuration = (prestationDuration || DEFAULT_DURATION) + BUFFER_MINUTES;
        
        const endDate = new Date(startDate);
        endDate.setMinutes(endDate.getMinutes() + totalDuration);
        
        return {
          id: apt.id,
          start: startDate,
          end: endDate,
          title: `${apt.appointment_time} - ${apt.client_name}${apt.prestations?.name ? ' (' + apt.prestations.name + ')' : ''}`,
          color: colors[apt.status] || colors['pending'],
          meta: apt,
        };
      });
  }

  /**
   * Parse une durée au format texte et retourne le nombre de minutes
   * Formats supportés: "1h30", "1h 30", "1h30min", "90 min", "90min", "1h", "2h", etc.
   */
  private parseDuration(duration: string | undefined): number | null {
    if (!duration) return null;
    
    // Nettoyer la chaîne
    const cleaned = duration.toLowerCase().trim();
    
    // Format "Xh" ou "XhYY" ou "Xh YY" ou "Xh YYmin"
    const hourMinuteMatch = cleaned.match(/(\d+)\s*h\s*(\d*)\s*(min)?/);
    if (hourMinuteMatch) {
      const hours = parseInt(hourMinuteMatch[1], 10) || 0;
      const mins = parseInt(hourMinuteMatch[2], 10) || 0;
      return hours * 60 + mins;
    }
    
    // Format "XX min" ou "XXmin"
    const minuteMatch = cleaned.match(/(\d+)\s*min/);
    if (minuteMatch) {
      return parseInt(minuteMatch[1], 10);
    }
    
    // Si c'est juste un nombre, on considère que c'est en minutes
    const numberMatch = cleaned.match(/^(\d+)$/);
    if (numberMatch) {
      return parseInt(numberMatch[1], 10);
    }
    
    return null;
  }

  // Navigation
  previousPeriod(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = subMonths(this.viewDate, 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = subWeeks(this.viewDate, 1);
    }
    this.selectedDate = null;
    this.selectedDayAppointments = [];
  }

  nextPeriod(): void {
    if (this.view === CalendarView.Month) {
      this.viewDate = addMonths(this.viewDate, 1);
    } else if (this.view === CalendarView.Week) {
      this.viewDate = addWeeks(this.viewDate, 1);
    }
    this.selectedDate = null;
    this.selectedDayAppointments = [];
  }

  today(): void {
    this.viewDate = new Date();
    this.selectedDate = null;
    this.selectedDayAppointments = [];
  }

  setView(view: CalendarView): void {
    // Prevent week view on mobile
    if (this.isMobile && view === CalendarView.Week) {
      return;
    }
    this.view = view;
  }

  // Clic sur un jour
  dayClicked({ date, events }: { date: Date; events: CalendarEvent[] }): void {
    if (isSameMonth(date, this.viewDate)) {
      this.selectedDate = date;
      this.selectedDayAppointments = this.appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return isSameDay(aptDate, date);
      }).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
  }

  // Clic sur un événement
  eventClicked(event: CalendarEvent): void {
    const apt = event.meta as Appointment;
    if (apt) {
      this.selectedDate = new Date(apt.appointment_date);
      this.selectedDayAppointments = this.appointments.filter(a => {
        const aDate = new Date(a.appointment_date);
        return isSameDay(aDate, this.selectedDate!);
      }).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
    }
  }

  // Formatage
  formatDate(date: Date): string {
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  }

  formatMonthYear(date: Date): string {
    return format(date, 'MMMM yyyy', { locale: fr });
  }

  formatTime(time: string): string {
    return time.substring(0, 5);
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Accepté',
      completed: 'Terminé',
      rejected: 'Refusé',
      cancelled: 'Annulé'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  // Nombre de RDV par jour (pour le badge)
  getEventsForDay(date: Date): CalendarEvent[] {
    return this.events.filter(event => isSameDay(event.start, date));
  }

  closeDetail(): void {
    this.selectedDate = null;
    this.selectedDayAppointments = [];
  }
}

