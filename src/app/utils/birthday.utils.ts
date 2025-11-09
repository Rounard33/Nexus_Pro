export interface BirthdayInfo {
  nextBirthday: string | null;
  age: number | null;
}

export class BirthdayUtils {
  /**
   * Calcule l'âge et le prochain anniversaire à partir d'une date de naissance
   * @param birthdate Date de naissance au format YYYY-MM-DD
   * @returns Objet contenant l'âge et la date du prochain anniversaire
   */
  static calculateBirthdayInfo(birthdate: string | null | undefined): BirthdayInfo {
    if (!birthdate) {
      return { nextBirthday: null, age: null };
    }

    // Parser la date de naissance directement (format YYYY-MM-DD)
    const [birthYear, birthMonth, birthDay] = birthdate.split('-').map(Number);
    
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // getMonth() retourne 0-11
    const currentDay = today.getDate();
    
    // Calculer l'âge
    let age = currentYear - birthYear;
    if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
      age--;
    }

    // Calculer le prochain anniversaire (en utilisant directement les composantes)
    let nextBirthdayYear = currentYear;
    
    // Si l'anniversaire de cette année est déjà passé, prendre l'année prochaine
    if (currentMonth > birthMonth || (currentMonth === birthMonth && currentDay >= birthDay)) {
      nextBirthdayYear = currentYear + 1;
    }

    // Formater la date au format YYYY-MM-DD (sans conversion de fuseau horaire)
    const nextBirthday = `${nextBirthdayYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;

    return {
      nextBirthday,
      age
    };
  }
}