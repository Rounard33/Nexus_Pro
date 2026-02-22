import {Injectable} from '@angular/core';
import {Appointment, AvailableSlot, BlockedSlot, OpeningHours, Prestation} from '../../../services/content.service';
import {DateUtils} from '../../../utils/date.utils';

export interface TimeSlotResult {
  availableTimes: string[];
  allTimes: string[];
  errorMessage: string | null;
}

/**
 * Service gérant la logique des créneaux horaires pour les réservations
 */
@Injectable({
  providedIn: 'root'
})
export class BookingTimeSlotService {
  
  private readonly BUFFER_MINUTES = 15; // Pause entre les rendez-vous
  private readonly TIME_SLOT_INTERVAL = 15; // Intervalle entre créneaux (en minutes)
  private readonly DEFAULT_DURATION = 90; // Durée par défaut si non spécifiée

  /**
   * Génère les créneaux disponibles pour une date donnée
   */
  generateTimeSlots(
    selectedDate: Date,
    openingHours: OpeningHours[],
    existingAppointments: Appointment[],
    prestation: Prestation | null
  ): TimeSlotResult {
    const dayOfWeek = selectedDate.getDay();
    const dateStr = DateUtils.formatDateLocal(selectedDate);
    
    // Récupérer les horaires pour ce jour
    const dayHours = openingHours.find(
      h => h.day_of_week === dayOfWeek && h.is_active !== false
    );
    
    if (!dayHours || !dayHours.periods) {
      return {
        availableTimes: [],
        allTimes: [],
        errorMessage: 'Aucun créneau disponible pour ce jour.'
      };
    }

    const availableTimes = this.generateAvailableTimesForDay(
      dayHours,
      dateStr,
      existingAppointments,
      prestation
    );
    
    const allTimes = this.generateAllTimeSlotsForDay(dayHours);

    return {
      availableTimes,
      allTimes,
      errorMessage: null
    };
  }

  /**
   * Génère les créneaux à partir de la table available_slots (1 ligne = 1 créneau de 1h30)
   */
  generateTimeSlotsFromAvailableSlots(
    selectedDate: Date,
    availableSlots: AvailableSlot[],
    existingAppointments: Appointment[],
    prestation: Prestation | null,
    blockedSlots: BlockedSlot[] = []
  ): TimeSlotResult {
    const dayOfWeek = selectedDate.getDay();
    const dateStr = DateUtils.formatDateLocal(selectedDate);

    const daySlots = availableSlots.filter(
      s => s.day_of_week === dayOfWeek && s.is_active !== false
    );

    if (daySlots.length === 0) {
      return {
        availableTimes: [],
        allTimes: [],
        errorMessage: 'Aucun créneau disponible pour ce jour.'
      };
    }

    const allTimes: string[] = [];
    const availableTimes: string[] = [];

    for (const slot of daySlots) {
      // start_time peut être "12:30:00" -> extraire "12:30"
      const timeStr = slot.start_time.substring(0, 5);
      allTimes.push(timeStr);

      const blockedByAppointment = this.isTimeInBlockedSlot(
        dateStr,
        timeStr,
        existingAppointments,
        prestation
      );
      const blockedBySlot = this.isTimeInBlockedSlotsList(dateStr, timeStr, blockedSlots);
      if (!blockedByAppointment && !blockedBySlot) {
        availableTimes.push(timeStr);
      }
    }

    return {
      availableTimes: [...new Set(availableTimes)].sort(),
      allTimes: [...new Set(allTimes)].sort(),
      errorMessage: null
    };
  }

  /**
   * Vérifie si un créneau est bloqué manuellement (indisponibilité)
   */
  private isTimeInBlockedSlotsList(
    dateStr: string,
    timeStr: string,
    blockedSlots: BlockedSlot[]
  ): boolean {
    return blockedSlots.some(bs => {
      if (bs.blocked_date !== dateStr) return false;
      const bsTime = bs.start_time.substring(0, 5);
      return bsTime === timeStr;
    });
  }

  /**
   * Génère les créneaux disponibles (non bloqués) pour un jour
   */
  private generateAvailableTimesForDay(
    dayHours: OpeningHours,
    dateStr: string,
    existingAppointments: Appointment[],
    prestation: Prestation | null
  ): string[] {
    const periods = dayHours.periods.split('|').map((p: string) => p.trim());
    const times: string[] = [];
    
    periods.forEach((period: string) => {
      const periodTimes = this.generateTimesForPeriod(
        period,
        dayHours,
        dateStr,
        existingAppointments,
        prestation
      );
      times.push(...periodTimes);
    });

    return [...new Set(times)].sort();
  }

  /**
   * Génère les créneaux pour une période donnée (ex: "9h-13h")
   */
  private generateTimesForPeriod(
    period: string,
    dayHours: OpeningHours,
    dateStr: string,
    existingAppointments: Appointment[],
    prestation: Prestation | null
  ): string[] {
    const times: string[] = [];
    const periodMatch = period.match(/(\d{1,2})h(?:(\d{2}))?\s*-\s*(\d{1,2})h(?:(\d{2}))?/);
    
    if (!periodMatch) return times;

    const { startTime, endTime, lastAppointmentTime } = this.parsePeriodBounds(
      periodMatch,
      dayHours
    );
    
    let current = new Date(startTime);
    
    while (current <= lastAppointmentTime && current < endTime) {
      const timeStr = DateUtils.formatTime(current);
      
      const isBlocked = this.isTimeInBlockedSlot(
        dateStr,
        timeStr,
        existingAppointments,
        prestation
      );

      if (!isBlocked) {
        times.push(timeStr);
      }

      current.setMinutes(current.getMinutes() + this.TIME_SLOT_INTERVAL);
      
      if (current > lastAppointmentTime || current >= endTime) {
        break;
      }
    }

    return times;
  }

  /**
   * Parse les limites d'une période horaire
   */
  private parsePeriodBounds(
    periodMatch: RegExpMatchArray,
    dayHours: OpeningHours
  ): { startTime: Date; endTime: Date; lastAppointmentTime: Date } {
    const startHour = parseInt(periodMatch[1]);
    const startMin = periodMatch[2] ? parseInt(periodMatch[2]) : 0;
    const endHour = parseInt(periodMatch[3]);
    const endMin = periodMatch[4] ? parseInt(periodMatch[4]) : 0;
    
    const startTime = new Date();
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);
    
    let lastAppointmentTime = new Date(endTime);
    
    if (dayHours.last_appointment) {
      const lastMatch = dayHours.last_appointment.match(/(\d{1,2})h(?:(\d{2}))?/);
      if (lastMatch) {
        const lastHour = parseInt(lastMatch[1]);
        const lastMin = lastMatch[2] ? parseInt(lastMatch[2]) : 0;
        lastAppointmentTime = new Date();
        lastAppointmentTime.setHours(lastHour, lastMin, 0, 0);
        
        if (lastAppointmentTime > endTime) {
          lastAppointmentTime = new Date(endTime);
        }
      }
    }

    return { startTime, endTime, lastAppointmentTime };
  }

  /**
   * Génère tous les créneaux possibles pour un jour (y compris non disponibles)
   */
  private generateAllTimeSlotsForDay(dayHours: OpeningHours): string[] {
    const periods = dayHours.periods.split('|').map((p: string) => p.trim());
    const allTimesList: string[] = [];
    
    periods.forEach((period: string) => {
      const periodMatch = period.match(/(\d{1,2})h(?:(\d{2}))?\s*-\s*(\d{1,2})h(?:(\d{2}))?/);
      
      if (periodMatch) {
        const times = this.generateAllTimesForPeriod(periodMatch, dayHours);
        allTimesList.push(...times);
      }
    });
    
    return [...new Set(allTimesList)].sort();
  }

  /**
   * Génère tous les créneaux pour une période (sans filtrage)
   */
  private generateAllTimesForPeriod(
    periodMatch: RegExpMatchArray,
    dayHours: OpeningHours
  ): string[] {
    const times: string[] = [];
    const startHour = parseInt(periodMatch[1]);
    const startMin = periodMatch[2] ? parseInt(periodMatch[2]) : 0;
    const endHour = parseInt(periodMatch[3]);
    const endMin = periodMatch[4] ? parseInt(periodMatch[4]) : 0;
    
    const startTime = new Date();
    startTime.setHours(startHour, startMin, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);
    
    // Dernier créneau : 1h30 avant fermeture
    let lastAppointmentTime = new Date(endTime);
    lastAppointmentTime.setMinutes(lastAppointmentTime.getMinutes() - 90);

    // Utiliser last_appointment si plus restrictif
    if (dayHours.last_appointment) {
      const lastMatch = dayHours.last_appointment.match(/(\d{1,2})h(?:(\d{2}))?/);
      if (lastMatch) {
        const customLastTime = new Date();
        customLastTime.setHours(
          parseInt(lastMatch[1]),
          lastMatch[2] ? parseInt(lastMatch[2]) : 0,
          0, 0
        );
        if (customLastTime < lastAppointmentTime) {
          lastAppointmentTime = customLastTime;
        }
      }
    }
    
    let current = new Date(startTime);
    while (current <= lastAppointmentTime && current < endTime) {
      times.push(DateUtils.formatTime(current));
      current.setMinutes(current.getMinutes() + this.TIME_SLOT_INTERVAL);
      
      if (current > lastAppointmentTime || current >= endTime) {
        break;
      }
    }

    return times;
  }

  /**
   * Vérifie si un créneau est bloqué par un RDV existant
   */
  private isTimeInBlockedSlot(
    dateStr: string,
    timeStr: string,
    existingAppointments: Appointment[],
    prestation: Prestation | null
  ): boolean {
    const blockingAppointments = existingAppointments.filter(apt => 
      apt.appointment_date === dateStr &&
      (apt.status === 'pending' || apt.status === 'accepted')
    );

    if (blockingAppointments.length === 0) return false;

    const [checkHour, checkMin] = timeStr.split(':').map(Number);
    const checkTime = checkHour * 60 + checkMin;
    
    const newPrestationDuration = this.parseDurationToMinutes(prestation?.duration);
    const checkEndTime = checkTime + newPrestationDuration + this.BUFFER_MINUTES;

    for (const apt of blockingAppointments) {
      const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
      const aptTime = aptHour * 60 + aptMin;
      const aptDuration = this.parseDurationToMinutes(apt.prestations?.duration);

      const blockStart = Math.max(0, aptTime - newPrestationDuration - this.BUFFER_MINUTES);
      const blockEnd = aptTime + aptDuration + this.BUFFER_MINUTES;

      const startsInBlockedRange = checkTime >= blockStart && checkTime < blockEnd;
      const endsTooCloseBefore = checkTime < blockStart && checkEndTime > aptTime;

      if (startsInBlockedRange || endsTooCloseBefore) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convertit une durée texte en minutes
   */
  parseDurationToMinutes(duration: string | null | undefined): number {
    if (!duration) return this.DEFAULT_DURATION;
    
    const normalized = duration.toLowerCase().trim();
    let totalMinutes = 0;
    
    // Pattern pour "1h30", "1h", "2h15", etc.
    const hourMatch = normalized.match(/(\d+)\s*h(?:(\d+))?/);
    if (hourMatch) {
      totalMinutes += parseInt(hourMatch[1]) * 60;
      if (hourMatch[2]) {
        totalMinutes += parseInt(hourMatch[2]);
      }
    }
    
    // Pattern pour "45min", "30 min"
    if (!hourMatch) {
      const minMatch = normalized.match(/(\d+)\s*min/);
      if (minMatch) {
        totalMinutes += parseInt(minMatch[1]);
      }
    }
    
    return totalMinutes > 0 ? totalMinutes : this.DEFAULT_DURATION;
  }

  /**
   * Vérifie si un créneau est disponible
   */
  isTimeAvailable(time: string, availableTimes: string[]): boolean {
    return availableTimes.includes(time);
  }
}

