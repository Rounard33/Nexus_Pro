import {Injectable} from '@angular/core';
import {AppointmentStats} from '../models/statistics.model';
import {appointmentUnitPortionEur} from '../utils/accounting-revenue.utils';
import {Appointment, Prestation} from './content.service';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  /**
   * Calcule les statistiques à partir d'une liste de rendez-vous
   * @param appointments Liste des rendez-vous
   * @returns Statistiques calculées
   */
  calculateStats(appointments: Appointment[]): AppointmentStats {
    const accepted = appointments.filter(a => a.status === 'accepted').length;
    const completed = appointments.filter(a => a.status === 'completed').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const rejected = appointments.filter(a => a.status === 'rejected').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    // Total = acceptés + terminés (RDV confirmés)
    const total = accepted + completed;
    
    const acceptanceRate = this.calculateAcceptanceRate(accepted + completed, rejected);

    return {
      total,
      accepted,
      completed,
      pending,
      rejected,
      cancelled,
      acceptanceRate
    };
  }

  /**
   * Calcule le taux d'acceptation
   * @param accepted Nombre de rendez-vous acceptés
   * @param rejected Nombre de rendez-vous refusés
   * @returns Taux d'acceptation en pourcentage (0-100)
   */
  calculateAcceptanceRate(accepted: number, rejected: number): number {
    const total = accepted + rejected;
    if (total === 0) return 0;
    return Math.round((accepted / total) * 100);
  }

  /**
   * Calcule les statistiques des prestations
   * @param appointments Liste des rendez-vous
   * @returns Tableau des prestations avec leur nombre d'occurrences, trié par ordre décroissant
   */
  calculatePrestationStats(appointments: Appointment[]): Array<{prestation: string; count: number}> {
    const prestationCounts: {[key: string]: number} = {};

    appointments.forEach(appointment => {
      const prestationName = appointment.prestations?.name || 'Inconnue';
      prestationCounts[prestationName] = (prestationCounts[prestationName] || 0) + 1;
    });

    return Object.entries(prestationCounts)
      .map(([prestation, count]) => ({prestation, count}))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Calcule la répartition des méthodes de paiement
   * @param appointments Liste des rendez-vous acceptés
   * @returns Objet avec le nombre pour chaque méthode de paiement
   */
  calculatePaymentMethods(appointments: Appointment[]): {
    espèces: number;
    carte: number;
    virement: number;
    chèque: number;
  } {
    // Inclure accepted et completed pour les paiements
    const confirmed = appointments.filter(a => a.status === 'accepted' || a.status === 'completed');
    const stats = {
      espèces: 0,
      carte: 0,
      virement: 0,
      chèque: 0,
    };

    confirmed.forEach(appointment => {
      const method = appointment.payment_method;
      if (method === 'espèces') {
        stats.espèces++;
      } else if (method === 'carte') {
        stats.carte++;
      } else if (method === 'virement') {
        stats.virement++;
      } else if (method === 'chèque') {
        stats.chèque++;
      }
    });

    return stats;
  }

  /**
   * Calcule le nombre moyen de visites par client dans l'année en cours
   * @param appointments Liste des rendez-vous acceptés
   * @returns Nombre moyen de visites par client
   */
  calculateAverageClientVisits(appointments: Appointment[]): number {
    const currentYear = new Date().getFullYear();
    const accepted = appointments.filter(a => {
      if (a.status !== 'accepted' || !a.appointment_date) return false;
      const appointmentYear = new Date(a.appointment_date).getFullYear();
      return appointmentYear === currentYear;
    });

    // Compter les visites par client (par email)
    const clientVisits: {[email: string]: number} = {};
    accepted.forEach(appointment => {
      const email = appointment.client_email.toLowerCase();
      clientVisits[email] = (clientVisits[email] || 0) + 1;
    });

    const totalClients = Object.keys(clientVisits).length;
    if (totalClients === 0) return 0;

    const totalVisits = Object.values(clientVisits).reduce((sum, count) => sum + count, 0);
    return Math.round((totalVisits / totalClients) * 10) / 10; // Arrondir à 1 décimale
  }

  /**
   * Panier moyen (montant moyen par RDV payé à l’unité, après forfait et partie carte cadeau).
   */
  calculateAverageBasket(
    appointments: Appointment[],
    prestations: Prestation[],
    forfaitCountedAppointmentIds?: Set<string>,
    giftCoverageByAppointment?: Map<string, number>
  ): number {
    const forfaitIds = forfaitCountedAppointmentIds ?? new Set<string>();
    const giftMap = giftCoverageByAppointment ?? new Map<string, number>();
    const confirmed = appointments.filter(
      (a) => a.status === 'accepted' || a.status === 'completed'
    );

    let totalUnit = 0;
    let n = 0;
    for (const a of confirmed) {
      const unit = appointmentUnitPortionEur(a, prestations, forfaitIds, giftMap);
      if (unit > 0) {
        totalUnit += unit;
        n++;
      }
    }

    if (n === 0) {
      return 0;
    }
    return Math.round((totalUnit / n) * 100) / 100;
  }

  calculateTimeSlotStats(appointments: Appointment[]): Array<{
    time: string;
    count: number;
    percentage: number;
  }> {
    const confirmed = appointments.filter(a => 
      a.status === 'accepted' || a.status === 'completed'
    );

    if (confirmed.length === 0) {
      return [];
    }

    const timeSlotCounts: {[key: string]: number} = {};

    confirmed.forEach(appointment => {
      if (appointment.appointment_time) {
        const time = appointment.appointment_time.substring(0, 5);
        timeSlotCounts[time] = (timeSlotCounts[time] || 0) + 1;
      }
    });

    const total = confirmed.length;
    return Object.entries(timeSlotCounts)
      .map(([time, count]) => ({
        time,
        count,
        percentage: Math.round((count / total) * 100 * 10) / 10
      }))
      .sort((a, b) => b.count - a.count);
  }
}