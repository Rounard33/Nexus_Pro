import {Injectable} from '@angular/core';
import {AppointmentStats} from '../models/statistics.model';
import {Appointment} from './content.service';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
  /**
   * Calcule les statistiques à partir d'une liste de rendez-vous
   * @param appointments Liste des rendez-vous
   * @returns Statistiques calculées
   */
  calculateStats(appointments: Appointment[]): AppointmentStats {
    const accepted = appointments.filter(a => a.status === 'accepted').length;
    const pending = appointments.filter(a => a.status === 'pending').length;
    const rejected = appointments.filter(a => a.status === 'rejected').length;
    const cancelled = appointments.filter(a => a.status === 'cancelled').length;
    const total = accepted; // Seulement les acceptés comptent
    
    const acceptanceRate = this.calculateAcceptanceRate(accepted, rejected);

    return {
      total,
      accepted,
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
}