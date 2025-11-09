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

  /**
   * Retourne le premier jour du mois actuel au format YYYY-MM-DD
   */
  static getFirstDayOfMonth(): string {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  }

  /**
   * Retourne le dernier jour du mois actuel au format YYYY-MM-DD
   */
  static getLastDayOfMonth(): string {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return lastDay.toISOString().split('T')[0];
  }

  /**
   * Retourne la date d'aujourd'hui au format YYYY-MM-DD
   */
  static getTodayISO(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Retourne la date dans X jours au format YYYY-MM-DD
   * @param days Nombre de jours à ajouter (peut être négatif)
   */
  static getDateInDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}