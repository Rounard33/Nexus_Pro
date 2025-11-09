import {Injectable} from '@angular/core';
import {ClientDetail, ClientProfile} from '../models/client.model';
import {BirthdayUtils} from '../utils/birthday.utils';
import {Appointment} from './content.service';

@Injectable({ providedIn: 'root' })
export class ClientService {
  /**
   * Groupe les rendez-vous par client et calcule les statistiques
   * @param appointments Liste de tous les rendez-vous
   * @returns Liste des profils clients avec leurs statistiques
   */
  groupAppointmentsByClient(appointments: Appointment[]): ClientProfile[] {
    const clientsMap = new Map<string, ClientProfile>();

    appointments.forEach(apt => {
      const email = apt.client_email.toLowerCase().trim();
      
      if (!clientsMap.has(email)) {
        clientsMap.set(email, this.createEmptyClientProfile(apt));
      }
      
      const client = clientsMap.get(email)!;
      client.appointments.push(apt);
      this.updateClientStats(client, apt);
    });

    return this.sortClients(Array.from(clientsMap.values()));
  }

  /**
   * Construit un objet ClientDetail complet à partir des rendez-vous et données client
   * @param appointments Liste de tous les rendez-vous
   * @param clientData Données du client depuis la table clients
   * @param email Email du client
   * @returns ClientDetail ou null si aucun rendez-vous
   */
  buildClientDetail(
    appointments: Appointment[],
    clientData: any,
    email: string
  ): ClientDetail | null {
    const clientAppointments = appointments.filter(
      apt => apt.client_email.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (clientAppointments.length === 0) return null;

    const acceptedAppointments = clientAppointments.filter(a => a.status === 'accepted');
    const { nextBirthday, age } = BirthdayUtils.calculateBirthdayInfo(clientData?.birthdate);

    return {
      email: clientAppointments[0].client_email,
      name: clientAppointments[0].client_name,
      phone: clientAppointments[0].client_phone || clientData?.phone,
      birthdate: clientData?.birthdate,
      notes: clientData?.notes,
      appointments: this.sortAppointments(clientAppointments),
      totalAppointments: acceptedAppointments.length,
      acceptedAppointments: acceptedAppointments.length,
      pendingAppointments: clientAppointments.filter(a => a.status === 'pending').length,
      rejectedAppointments: clientAppointments.filter(a => a.status === 'rejected').length,
      cancelledAppointments: clientAppointments.filter(a => a.status === 'cancelled').length,
      lastAppointmentDate: this.getLastAppointmentDate(acceptedAppointments),
      firstAppointmentDate: this.getFirstAppointmentDate(acceptedAppointments),
      nextBirthday,
      age,
      eligibleTreatments: acceptedAppointments.length
    };
  }

  /**
   * Crée un profil client vide
   */
  private createEmptyClientProfile(firstAppt: Appointment): ClientProfile {
    return {
      email: firstAppt.client_email,
      name: firstAppt.client_name,
      phone: firstAppt.client_phone,
      appointments: [],
      totalAppointments: 0,
      acceptedAppointments: 0,
      pendingAppointments: 0,
      lastAppointmentDate: null,
      firstAppointmentDate: null,
      nextBirthday: null,
      age: null
    };
  }

  /**
   * Met à jour les statistiques d'un client avec un nouveau rendez-vous
   */
  private updateClientStats(client: ClientProfile, apt: Appointment): void {
    if (apt.status === 'accepted') {
      client.totalAppointments++;
      client.acceptedAppointments++;
      this.updateAppointmentDates(client, apt);
    } else if (apt.status === 'pending') {
      client.pendingAppointments++;
    }
  }

  /**
   * Met à jour les dates de premier et dernier rendez-vous
   */
  private updateAppointmentDates(client: ClientProfile, apt: Appointment): void {
    if (!client.lastAppointmentDate || apt.appointment_date > client.lastAppointmentDate) {
      client.lastAppointmentDate = apt.appointment_date;
    }
    if (!client.firstAppointmentDate || apt.appointment_date < client.firstAppointmentDate) {
      client.firstAppointmentDate = apt.appointment_date;
    }
  }

  /**
   * Récupère la date du dernier rendez-vous accepté
   */
  private getLastAppointmentDate(appointments: Appointment[]): string | null {
    if (appointments.length === 0) return null;
    return appointments.reduce((latest, apt) => 
      !latest || apt.appointment_date > latest ? apt.appointment_date : latest, 
      null as string | null
    );
  }

  /**
   * Récupère la date du premier rendez-vous accepté
   */
  private getFirstAppointmentDate(appointments: Appointment[]): string | null {
    if (appointments.length === 0) return null;
    return appointments.reduce((earliest, apt) => 
      !earliest || apt.appointment_date < earliest ? apt.appointment_date : earliest, 
      null as string | null
    );
  }

  /**
   * Trie les rendez-vous par date décroissante (plus récent en premier)
   */
  private sortAppointments(appointments: Appointment[]): Appointment[] {
    return appointments.sort((a, b) => {
      const dateCompare = b.appointment_date.localeCompare(a.appointment_date);
      return dateCompare !== 0 ? dateCompare : b.appointment_time.localeCompare(a.appointment_time);
    });
  }

  /**
   * Trie les clients par date du dernier rendez-vous accepté
   */
  private sortClients(clients: ClientProfile[]): ClientProfile[] {
    return clients.sort((a, b) => {
      // Priorité 1 : Date du dernier RDV accepté
      if (a.lastAppointmentDate && b.lastAppointmentDate) {
        return b.lastAppointmentDate.localeCompare(a.lastAppointmentDate);
      }
      if (a.lastAppointmentDate) return -1;
      if (b.lastAppointmentDate) return 1;
      
      // Priorité 2 : Nombre de RDV acceptés
      return b.totalAppointments - a.totalAppointments;
    });
  }
}

