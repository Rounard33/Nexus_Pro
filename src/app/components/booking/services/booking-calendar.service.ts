import {Injectable} from '@angular/core';
import {OpeningHours} from '../../../services/content.service';

/**
 * Service gérant la logique du calendrier pour les réservations
 */
@Injectable({
  providedIn: 'root'
})
export class BookingCalendarService {
  
  // Constantes
  readonly MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  readonly WEEK_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  /**
   * Génère tous les jours à afficher dans le calendrier pour un mois donné
   * Inclut les jours des mois précédent/suivant pour compléter les semaines
   */
  getDaysInMonth(currentMonth: Date): Date[] {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Jours du mois précédent pour compléter la première semaine
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Jours du mois courant
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Jours du mois suivant pour compléter la dernière semaine (6 lignes = 42 jours)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  }

  /**
   * Vérifie si une date est disponible pour la réservation
   */
  isDateAvailable(
    date: Date,
    blockedDates: string[],
    openingHours: OpeningHours[]
  ): boolean {
    const dateStr = this.formatDateLocal(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ne pas permettre les RDV pour le jour même ou les dates passées
    if (date <= today) return false;
    
    // Ne pas afficher les dates bloquées
    if (blockedDates.includes(dateStr)) return false;
    
    // Si les horaires ne sont pas encore chargés, permettre la sélection
    if (openingHours.length === 0) return true;
    
    // Vérifier s'il y a des horaires d'ouverture pour ce jour
    const dayOfWeek = date.getDay();
    return openingHours.some(h => h.day_of_week === dayOfWeek && h.is_active !== false);
  }

  /**
   * Vérifie si une date est sélectionnée
   */
  isDateSelected(date: Date, selectedDate: Date | null): boolean {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  }

  /**
   * Vérifie si une date appartient au mois courant
   */
  isCurrentMonth(date: Date, currentMonth: Date): boolean {
    return date.getMonth() === currentMonth.getMonth() &&
           date.getFullYear() === currentMonth.getFullYear();
  }

  /**
   * Navigue vers le mois précédent
   */
  getPreviousMonth(currentMonth: Date): Date {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  }

  /**
   * Navigue vers le mois suivant
   */
  getNextMonth(currentMonth: Date): Date {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  }

  /**
   * Formate une date en YYYY-MM-DD en heure locale
   */
  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Génère les dates disponibles pour les N prochains jours
   */
  generateAvailableDates(
    daysAhead: number,
    blockedDates: string[],
    openingHours: OpeningHours[]
  ): Date[] {
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      if (this.isDateAvailable(date, blockedDates, openingHours)) {
        dates.push(date);
      }
    }
    
    return dates;
  }
}

