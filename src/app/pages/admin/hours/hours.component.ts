import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ContentService, OpeningHours} from '../../../services/content.service';

@Component({
  selector: 'app-hours',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hours.component.html',
  styleUrl: './hours.component.scss'
})
export class HoursComponent implements OnInit {
  openingHours: OpeningHours[] = [];
  editedHours: {[key: string]: {periods: string; last_appointment: string; is_active: boolean}} = {};
  isLoading = false;
  isSaving = false;
  saveSuccess = false;
  saveError: string | null = null;

  dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  constructor(private contentService: ContentService) {}

  ngOnInit(): void {
    this.loadOpeningHours();
  }

  loadOpeningHours(): void {
    this.isLoading = true;
    this.contentService.getOpeningHours().subscribe({
      next: (hours) => {
        // Créer un tableau pour chaque jour de la semaine (0-6)
        const hoursMap: {[key: number]: OpeningHours} = {};
        hours.forEach(h => {
          hoursMap[h.day_of_week] = h;
        });

        // Initialiser tous les jours
        for (let day = 0; day < 7; day++) {
          if (!hoursMap[day]) {
            // Créer un jour vide s'il n'existe pas
            hoursMap[day] = {
              day_of_week: day,
              day_name: this.dayNames[day],
              periods: '',
              last_appointment: '',
              is_active: false,
              display_order: day
            };
          }
        }

        this.openingHours = Object.values(hoursMap).sort((a, b) => 
          (a.day_of_week || 0) - (b.day_of_week || 0)
        );

        // Initialiser editedHours
        this.openingHours.forEach(day => {
          this.editedHours[day.day_of_week.toString()] = {
            periods: day.periods || '',
            last_appointment: day.last_appointment || '',
            is_active: day.is_active !== false
          };
        });

        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des horaires:', error);
        this.isLoading = false;
      }
    });
  }

  saveDay(day: OpeningHours): void {
    if (!day.id) {
      this.saveError = 'Ce jour n\'existe pas encore en base. Veuillez le créer d\'abord dans Supabase.';
      return;
    }

    this.isSaving = true;
    this.saveSuccess = false;
    this.saveError = null;

    const updates = this.editedHours[day.day_of_week.toString()];

    this.contentService.updateOpeningHours(day.id, {
      periods: updates.periods,
      last_appointment: updates.last_appointment || undefined,
      is_active: updates.is_active
    }).subscribe({
      next: () => {
        // Mettre à jour les données locales
        day.periods = updates.periods;
        day.last_appointment = updates.last_appointment || undefined;
        day.is_active = updates.is_active;
        this.saveSuccess = true;
        this.isSaving = false;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde:', error);
        this.saveError = 'Erreur lors de la sauvegarde. Veuillez réessayer.';
        this.isSaving = false;
      }
    });
  }

  saveAll(): void {
    this.saveError = null;
    this.saveSuccess = false;
    
    const savePromises = this.openingHours
      .filter(day => day.id && this.hasChanges(day))
      .map(day => {
        const updates = this.editedHours[day.day_of_week.toString()];
        return this.contentService.updateOpeningHours(day.id!, {
          periods: updates.periods,
          last_appointment: updates.last_appointment || undefined,
          is_active: updates.is_active
        }).toPromise();
      });

    if (savePromises.length === 0) {
      this.saveError = 'Aucune modification à sauvegarder';
      return;
    }

    this.isSaving = true;
    Promise.all(savePromises).then(() => {
      this.loadOpeningHours(); // Recharger pour avoir les dernières données
      this.saveSuccess = true;
      this.isSaving = false;
      setTimeout(() => this.saveSuccess = false, 3000);
    }).catch(error => {
      console.error('Erreur lors de la sauvegarde:', error);
      this.saveError = 'Erreur lors de la sauvegarde. Veuillez réessayer.';
      this.isSaving = false;
    });
  }

  hasChanges(day: OpeningHours): boolean {
    const edited = this.editedHours[day.day_of_week.toString()];
    if (!edited) return false;
    return edited.periods !== day.periods ||
           edited.last_appointment !== (day.last_appointment || '') ||
           edited.is_active !== (day.is_active !== false);
  }

  getDayName(dayOfWeek: number): string {
    return this.dayNames[dayOfWeek] || `Jour ${dayOfWeek}`;
  }

  hasAnyChanges(): boolean {
    return this.openingHours.some(d => this.hasChanges(d));
  }
}

