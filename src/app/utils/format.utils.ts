export class FormatUtils {
  /**
   * Formate une date selon les options fournies
   * @param dateString Date au format ISO string
   * @param options Options de formatage Intl.DateTimeFormat
   * @returns Date formatée en français ou 'N/A' si invalide
   */
  static formatDate(dateString: string | null, options?: Intl.DateTimeFormatOptions): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', options || defaultOptions);
  }

  /**
   * Formate une date complète avec le jour de la semaine
   * @param dateString Date au format ISO string
   * @returns Date formatée avec jour de la semaine
   */
  static formatFullDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'long',
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  /**
   * Formate une date courte (DD/MM/YYYY)
   * @param dateString Date au format ISO string
   * @returns Date formatée en format court
   */
  static formatShortDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  }

  /**
   * Formate une heure (HH:mm)
   * @param timeString Heure au format HH:mm:ss ou HH:mm
   * @returns Heure formatée en HH:mm
   */
  static formatTime(timeString: string): string {
    return timeString.substring(0, 5); // Format HH:mm
  }

  /**
   * Formate une date de naissance
   * @param dateString Date de naissance au format ISO string
   * @returns Date formatée ou 'Non renseignée'
   */
  static formatBirthdate(dateString: string | null | undefined): string {
    if (!dateString) return 'Non renseignée';
    return this.formatDate(dateString);
  }

  /**
   * Formate le prochain anniversaire avec un message relatif
   * @param dateString Date du prochain anniversaire au format ISO string
   * @returns Message formaté (Aujourd'hui, Demain, Dans X jours, ou date)
   */
  static formatNextBirthday(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const birthday = new Date(date);
    birthday.setHours(0, 0, 0, 0);
    
    const diffTime = birthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Aujourd'hui !";
    if (diffDays === 1) return 'Demain';
    if (diffDays < 7) return `Dans ${diffDays} jours`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long' 
    });
  }

  /**
   * Retourne la date maximale pour un input date (aujourd'hui)
   * @returns Date au format YYYY-MM-DD
   */
  static getMaxDate(): string {
    return new Date().toISOString().split('T')[0];
  }
}