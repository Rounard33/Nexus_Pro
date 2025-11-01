/**
 * Utilitaires pour la manipulation de dates
 */
export class DateUtils {
  /**
   * Obtient la date du jour au format YYYY-MM-DD
   */
  static getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Vérifie si une date est dans la période spécifiée
   */
  static isDateInRange(date: string, startDate: string, endDate: string): boolean {
    const dateObj = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return dateObj >= start && dateObj <= end;
  }

  /**
   * Obtient la date de fin de la semaine (7 jours à partir d'aujourd'hui)
   */
  static getWeekEndDate(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    return weekEnd;
  }

  /**
   * Obtient la date de fin du mois en cours
   */
  static getMonthEndDate(): Date {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  /**
   * Compare deux dates/heures pour le tri
   */
  static compareDateTime(dateA: string, timeA: string, dateB: string, timeB: string): number {
    const dateTimeA = new Date(`${dateA}T${timeA}`);
    const dateTimeB = new Date(`${dateB}T${timeB}`);
    return dateTimeB.getTime() - dateTimeA.getTime(); // Plus récent en premier
  }
}

