import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Appointment, ContentService, OpeningHours, Prestation} from '../../services/content.service';
import {CaptchaComponent} from '../captcha/captcha.component';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CaptchaComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit, OnChanges {
  @Input() prestation: Prestation | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<Appointment>();
  @ViewChild(CaptchaComponent) captchaComponent!: CaptchaComponent;

  bookingForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  
  // Captcha anti-spam
  isCaptchaValid = false;
  captchaToken: string = '';
  errorMessage: string | null = null;

  // Calendrier
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  availableDates: Date[] = [];
  blockedDates: string[] = [];
  openingHours: OpeningHours[] = [];
  selectedTime: string | null = null;
  availableTimes: string[] = [];
  allTimes: string[] = []; // Tous les créneaux (disponibles et non disponibles)
  existingAppointments: Appointment[] = [];

  // Mois et jours
  months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService
  ) {
    // Création du formulaire avec validation stricte
    this.bookingForm = this.fb.group({
      client_name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        // Validation : seulement lettres, espaces, tirets, apostrophes
        Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
      ]],
      client_email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(255)
      ]],
      client_phone: ['', [
        Validators.pattern(/^(?:(?:\+|00)33|0)[1-9](?:[\s.-]?[0-9]{2}){4}$/), // Format français
        Validators.maxLength(20)
      ]],
      referral_source: [''], // Source de référence
      referral_friend_name: [''], // Nom de l'ami (conditionnel)
      child_age: [''], // Âge de l'enfant (obligatoire pour soins energetique maman bebe)
      child_age_unit: ['mois'], // Unité : 'mois' ou 'années'
      notes: ['', [
        Validators.maxLength(500)
      ]]
    });

    // Ajouter une validation conditionnelle pour referral_friend_name
    this.bookingForm.get('referral_source')?.valueChanges.subscribe(value => {
      const friendNameControl = this.bookingForm.get('referral_friend_name');
      if (value === 'friend') {
        friendNameControl?.setValidators([
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100),
          Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
        ]);
      } else {
        friendNameControl?.clearValidators();
        friendNameControl?.setValue(''); // Réinitialiser le champ
      }
      friendNameControl?.updateValueAndValidity();
    });

    // Ajouter une validation conditionnelle pour child_age (obligatoire pour soins energetique maman bebe)
    // Cette validation sera mise à jour quand la prestation change
    this.updateChildAgeValidation();
  }

  ngOnInit(): void {
    this.resetFormState();
    this.loadInitialData();
    this.initializeCalendar();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Quand la prestation change, réinitialiser l'état du formulaire
    if (changes['prestation'] && !changes['prestation'].firstChange) {
      this.resetFormState();
    }
    // Mettre à jour la validation de child_age quand la prestation change
    if (changes['prestation']) {
      this.updateChildAgeValidation();
    }
  }

  // Réinitialiser l'état du formulaire et des messages
  private resetFormState(): void {
    this.errorMessage = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.availableTimes = [];
    this.isSubmitting = false;
    this.bookingForm.reset();
    // Réinitialiser l'unité d'âge à 'mois' par défaut
    this.bookingForm.patchValue({ child_age_unit: 'mois' });
    // Mettre à jour la validation de child_age après reset
    this.updateChildAgeValidation();
    // Réinitialiser le captcha
    this.isCaptchaValid = false;
    this.captchaToken = '';
    if (this.captchaComponent) {
      this.captchaComponent.refresh();
    }
  }

  // Vérifier si la prestation nécessite l'âge de l'enfant
  private isMamanBebePrestation(): boolean {
    if (!this.prestation || !this.prestation.name) {
      return false;
    }
    const name = this.prestation.name.toLowerCase();
    return name.includes('maman') && name.includes('bebe') || 
           name.includes('maman') && name.includes('bébé') ||
           name.includes('mère') && name.includes('bébé') ||
           name.includes('mere') && name.includes('bebe');
  }

  // Mettre à jour la validation du champ child_age selon la prestation
  private updateChildAgeValidation(): void {
    const childAgeControl = this.bookingForm.get('child_age');
    const childAgeUnitControl = this.bookingForm.get('child_age_unit');
    if (!childAgeControl || !childAgeUnitControl) return;

    if (this.isMamanBebePrestation()) {
      // Validation dynamique selon l'unité choisie
      const updateValidation = () => {
        const unit = childAgeUnitControl.value || 'mois';
        if (unit === 'mois') {
          childAgeControl.setValidators([
            Validators.required,
            Validators.min(0),
            Validators.max(24) // Jusqu'à 24 mois (2 ans)
          ]);
        } else {
          childAgeControl.setValidators([
            Validators.required,
            Validators.min(0),
            Validators.max(2) // Jusqu'à 2 ans pour les bébés
          ]);
        }
        childAgeControl.updateValueAndValidity();
      };

      // Mettre à jour la validation quand l'unité change
      childAgeUnitControl.valueChanges.subscribe(() => {
        updateValidation();
        childAgeControl.setValue(''); // Réinitialiser l'âge quand on change d'unité
      });

      updateValidation();
    } else {
      childAgeControl.clearValidators();
      childAgeControl.setValue(''); // Réinitialiser le champ
      childAgeUnitControl.setValue('mois'); // Réinitialiser l'unité
    }
    childAgeControl.updateValueAndValidity();
  }

  // Gestion du captcha
  onCaptchaValidationChange(isValid: boolean): void {
    this.isCaptchaValid = isValid;
  }

  onCaptchaTokenReceived(token: string): void {
    this.captchaToken = token;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    this.closeModal();
  }

  private loadInitialData(): void {
    this.isLoading = true;

    // Charger les dates bloquées
    this.contentService.getBlockedDates().subscribe({
      next: (dates) => {
        this.blockedDates = dates.map(d => d.blocked_date);
        this.initializeCalendar();
      },
      error: () => {
        this.isLoading = false;
      }
    });

    // Charger les horaires d'ouverture
    this.contentService.getOpeningHours().subscribe({
      next: (hours) => {
        this.openingHours = hours.filter(h => h.is_active !== false);
        this.isLoading = false;
        this.updateAvailableDates();
      },
      error: () => {
        this.isLoading = false;
        // Même en cas d'erreur, permettre la sélection de dates
        this.openingHours = [];
      }
    });

    // Charger les rendez-vous existants pour éviter les doublons
    // On charge 60 jours à l'avance pour couvrir les mois suivants
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 60); // 60 jours à l'avance
    this.contentService.getAppointments(
      undefined,
      this.formatDateLocal(today),
      this.formatDateLocal(endDate)
    ).subscribe({
      next: (appointments) => {
        this.existingAppointments = appointments.filter(a => 
          a.status === 'pending' || a.status === 'accepted'
        );
      },
      error: () => {
        // Erreur silencieuse - les créneaux seront tous disponibles
      }
    });
  }

  private initializeCalendar(): void {
    this.updateAvailableDates();
  }

  private updateAvailableDates(): void {
    // Cette méthode n'est plus nécessaire car on utilise isDateAvailable directement dans le template
    // On garde juste pour compatibilité, mais on peut la simplifier
    const dates: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Générer les 60 prochains jours
    for (let i = 0; i < 60; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      
      // Vérifier si la date est disponible (utilise isDateAvailable)
      if (this.isDateAvailable(date)) {
        dates.push(date);
      }
    }
    
    this.availableDates = dates;
  }

  // Navigation du calendrier
  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.updateAvailableDates();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.updateAvailableDates();
  }

  // Sélectionner une date
  selectDate(date: Date): void {
    // Vérifier que la date est disponible
    if (!this.isDateAvailable(date)) {
      return;
    }

    this.selectedDate = date;
    this.selectedTime = null;
    this.errorMessage = null;
    this.updateAvailableTimes();
  }

  // Générer les heures disponibles pour la date sélectionnée
  private updateAvailableTimes(): void {
    if (!this.selectedDate) return;

    const dayOfWeek = this.selectedDate.getDay();
    const dateStr = this.formatDateLocal(this.selectedDate);
    
    // Si les horaires ne sont pas encore chargés, attendre
    if (this.openingHours.length === 0) {
      this.availableTimes = [];
      // Recharger les horaires si nécessaire
      if (!this.isLoading) {
        this.contentService.getOpeningHours().subscribe({
          next: (hours) => {
            this.openingHours = hours.filter(h => h.is_active !== false);
            this.updateAvailableTimes(); // Rappeler après le chargement
          },
          error: () => {
            // Erreur silencieuse
          }
        });
      }
      return;
    }
    
    // Récupérer les horaires pour ce jour
    const dayHours = this.openingHours.find(h => h.day_of_week === dayOfWeek && h.is_active !== false);
    
    if (!dayHours || !dayHours.periods) {
      this.availableTimes = [];
      this.errorMessage = 'Aucun créneau disponible pour ce jour.';
      return;
    }

    // Parser les périodes (ex: "9h-13h | 14h-17h")
    const periods = dayHours.periods.split('|').map((p: string) => p.trim());
    const times: string[] = [];
    
    periods.forEach((period: string) => {
      // Parser "9h-13h" ou "9h-19h30"
      const periodMatch = period.match(/(\d{1,2})h(?:(\d{2}))?\s*-\s*(\d{1,2})h(?:(\d{2}))?/);
      
      if (periodMatch) {
        const startHour = parseInt(periodMatch[1]);
        const startMin = periodMatch[2] ? parseInt(periodMatch[2]) : 0;
        const endHour = parseInt(periodMatch[3]);
        const endMin = periodMatch[4] ? parseInt(periodMatch[4]) : 0;
        
        // Créer les dates pour calculer les heures
        const startTime = new Date();
        startTime.setHours(startHour, startMin, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);
        
        // Déterminer le dernier créneau possible
        let lastAppointmentTime = endTime;
        if (dayHours.last_appointment) {
          const lastMatch = dayHours.last_appointment.match(/(\d{1,2})h(?:(\d{2}))?/);
          if (lastMatch) {
            const lastHour = parseInt(lastMatch[1]);
            const lastMin = lastMatch[2] ? parseInt(lastMatch[2]) : 0;
            lastAppointmentTime = new Date();
            lastAppointmentTime.setHours(lastHour, lastMin, 0, 0);
            // Ne pas dépasser l'heure de fin de la période
            if (lastAppointmentTime > endTime) {
              lastAppointmentTime = endTime;
            }
          }
        }
        
        // Générer les heures disponibles (créneaux de 15 minutes)
        // last_appointment est inclus comme dernier créneau valide
        let current = new Date(startTime);
        while (current <= lastAppointmentTime && current < endTime) {
          const timeStr = this.formatTime(current);
          
          // Vérifier si ce créneau est dans une plage bloquée (1h30 autour d'un rendez-vous)
          const isInBlockedSlot = this.isTimeInBlockedSlot(dateStr, timeStr);

          if (!isInBlockedSlot) {
            times.push(timeStr);
          }

          // Ajouter 15 minutes pour le prochain créneau
          current.setMinutes(current.getMinutes() + 15);
          
          // Si le prochain créneau dépasse lastAppointmentTime ou endTime, arrêter
          if (current > lastAppointmentTime || current >= endTime) {
            break;
          }
        }
      }
    });

    this.availableTimes = [...new Set(times)].sort(); // Supprimer les doublons et trier
    
    // Générer tous les créneaux (y compris ceux non disponibles) pour les griser
    this.generateAllTimeSlots(dayOfWeek, dateStr);
  }

  // Générer tous les créneaux possibles pour une date (y compris ceux non disponibles)
  private generateAllTimeSlots(dayOfWeek: number, dateStr: string): void {
    const dayHours = this.openingHours.find(h => h.day_of_week === dayOfWeek && h.is_active !== false);
    
    if (!dayHours || !dayHours.periods) {
      this.allTimes = [];
      return;
    }

    const periods = dayHours.periods.split('|').map((p: string) => p.trim());
    const allTimesList: string[] = [];
    
    periods.forEach((period: string) => {
      const periodMatch = period.match(/(\d{1,2})h(?:(\d{2}))?\s*-\s*(\d{1,2})h(?:(\d{2}))?/);
      
      if (periodMatch) {
        const startHour = parseInt(periodMatch[1]);
        const startMin = periodMatch[2] ? parseInt(periodMatch[2]) : 0;
        const endHour = parseInt(periodMatch[3]);
        const endMin = periodMatch[4] ? parseInt(periodMatch[4]) : 0;
        
        const startTime = new Date();
        startTime.setHours(startHour, startMin, 0, 0);
        
        const endTime = new Date();
        endTime.setHours(endHour, endMin, 0, 0);
        
        // Déterminer le dernier créneau possible : 1h30 avant l'heure de fermeture
        let lastAppointmentTime = new Date(endTime);
        lastAppointmentTime.setMinutes(lastAppointmentTime.getMinutes() - 90); // -1h30

        // Si last_appointment est défini et plus restrictif, l'utiliser
        if (dayHours.last_appointment) {
          const lastMatch = dayHours.last_appointment.match(/(\d{1,2})h(?:(\d{2}))?/);
          if (lastMatch) {
            const lastHour = parseInt(lastMatch[1]);
            const lastMin = lastMatch[2] ? parseInt(lastMatch[2]) : 0;
            const customLastTime = new Date();
            customLastTime.setHours(lastHour, lastMin, 0, 0);
            // Utiliser le plus restrictif entre (endTime - 1h30) et last_appointment
            if (customLastTime < lastAppointmentTime) {
              lastAppointmentTime = customLastTime;
            }
          }
        }
        
        // Générer tous les créneaux de 15 minutes
        let current = new Date(startTime);
        while (current <= lastAppointmentTime && current < endTime) {
          const timeStr = this.formatTime(current);
          allTimesList.push(timeStr);
          
          current.setMinutes(current.getMinutes() + 15);
          
          if (current > lastAppointmentTime || current >= endTime) {
            break;
          }
        }
      }
    });
    
    this.allTimes = [...new Set(allTimesList)].sort();
  }

  // Vérifier si un créneau est disponible
  isTimeAvailable(time: string): boolean {
    return this.availableTimes.includes(time);
  }

  // Sélectionner une heure
  selectTime(time: string): void {
    this.selectedTime = time;
    this.errorMessage = null;
  }

  // Utilitaires pour les heures
  private parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes || 0, 0, 0);
    return date;
  }

  private formatTime(date: Date): string {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  // Formater une date en YYYY-MM-DD en heure locale (évite les problèmes de fuseau horaire)
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Convertit une durée texte en minutes (ex: "1h30" → 90, "45min" → 45)
  private parseDurationToMinutes(duration: string | null | undefined): number {
    if (!duration) return 90; // Durée par défaut
    
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
    
    // Pattern pour "45min", "30 min", etc. (si pas déjà inclus dans heures)
    if (!hourMatch) {
      const minMatch = normalized.match(/(\d+)\s*min/);
      if (minMatch) {
        totalMinutes += parseInt(minMatch[1]);
      }
    }
    
    return totalMinutes > 0 ? totalMinutes : 90; // 90 min par défaut si parsing échoue
  }

  // Vérifier si un créneau est dans une plage bloquée (basée sur la durée réelle des soins)
  private isTimeInBlockedSlot(dateStr: string, timeStr: string): boolean {
    const BUFFER_MINUTES = 15; // 15 min de pause entre les rendez-vous
    
    // Seuls les rendez-vous pending ou accepted bloquent les créneaux
    const blockingAppointments = this.existingAppointments.filter(apt => 
      apt.appointment_date === dateStr &&
      (apt.status === 'pending' || apt.status === 'accepted')
    );

    if (blockingAppointments.length === 0) {
      return false;
    }

    // Convertir le créneau à vérifier en minutes depuis minuit
    const [checkHour, checkMin] = timeStr.split(':').map(Number);
    const checkTime = checkHour * 60 + checkMin;
    
    // Durée de la prestation qu'on veut réserver (+ buffer pour la fin)
    const newPrestationDuration = this.parseDurationToMinutes(this.prestation?.duration);
    const checkEndTime = checkTime + newPrestationDuration + BUFFER_MINUTES;

    // Pour chaque rendez-vous bloquant, vérifier si le créneau doit être bloqué
    for (const apt of blockingAppointments) {
      const [aptHour, aptMin] = apt.appointment_time.split(':').map(Number);
      const aptTime = aptHour * 60 + aptMin;

      // Durée du rendez-vous existant (récupérée via la prestation liée)
      const aptDuration = this.parseDurationToMinutes(apt.prestations?.duration);

      // Plage bloquée : durée du RDV existant + buffer de 15 min
      const blockStart = Math.max(0, aptTime - newPrestationDuration - BUFFER_MINUTES);
      const blockEnd = aptTime + aptDuration + BUFFER_MINUTES;

      // Bloquer si :
      // 1. Le créneau commence dans la plage bloquée (inclus le début, exclu la fin)
      // 2. OU le créneau se termine après le début du RDV existant
      const startsInBlockedRange = checkTime >= blockStart && checkTime < blockEnd;
      const endsTooCloseBefore = checkTime < blockStart && checkEndTime > aptTime;

      if (startsInBlockedRange || endsTooCloseBefore) {
        return true;
      }
    }

    return false;
  }

  // Validation et soumission
  onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedDate || !this.selectedTime || !this.prestation) {
      this.markFormGroupTouched(this.bookingForm);
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires et sélectionner une date et une heure.';
      return;
    }

    // Vérifier le captcha anti-spam
    if (!this.isCaptchaValid) {
      this.errorMessage = 'Veuillez compléter la vérification anti-spam.';
      return;
    }

    // Vérifier que la prestation a un ID
    if (!this.prestation.id) {
      this.errorMessage = 'Erreur: Prestation invalide. Veuillez réessayer.';
      return;
    }

    // Validation supplémentaire de sécurité
    if (!this.validateFormData()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;

    const formValue = this.bookingForm.value;

    // Nettoyer les données avant envoi (Angular gère déjà la protection XSS côté affichage)
    const appointment: any = {
      client_name: formValue.client_name.trim(),
      client_email: formValue.client_email.trim().toLowerCase(),
      prestation_id: this.prestation.id, // ID vérifié ci-dessus
      appointment_date: this.formatDateLocal(this.selectedDate),
      appointment_time: this.selectedTime,
      status: 'pending'
    };

    // Ajouter les champs optionnels seulement s'ils ont une valeur
    if (formValue.client_phone && formValue.client_phone.trim() !== '') {
      appointment.client_phone = formValue.client_phone.trim();
    }

    if (formValue.notes && formValue.notes.trim() !== '') {
      appointment.notes = formValue.notes.trim();
    }

    if (formValue.referral_source && formValue.referral_source.trim() !== '') {
      appointment.referral_source = formValue.referral_source.trim();
    }

    if (formValue.referral_source === 'friend' && formValue.referral_friend_name && formValue.referral_friend_name.trim() !== '') {
      appointment.referral_friend_name = formValue.referral_friend_name.trim();
    }

    // Ajouter l'âge de l'enfant si fourni (obligatoire pour soins energetique maman bebe)
    // Convertir en mois pour le stockage (plus précis pour les bébés)
    // Même logique que referral_friend_name : toujours ajouter si présent
    if (formValue.child_age !== undefined && formValue.child_age !== null && formValue.child_age !== '') {
      const age = parseFloat(formValue.child_age);
      if (!isNaN(age) && age >= 0) {
        const unit = formValue.child_age_unit || 'mois';
        if (unit === 'années') {
          // Convertir les années en mois (arrondi)
          appointment.child_age = Math.round(age * 12);
        } else {
          // Déjà en mois
          appointment.child_age = Math.round(age);
        }
      }
    }

    // Ajouter le token captcha pour la validation côté serveur
    if (this.captchaToken) {
      appointment.captcha_token = this.captchaToken;
    }

    this.contentService.createAppointment(appointment).subscribe({
      next: (createdAppointment) => {
        this.isSubmitting = false;
        
        // Ajouter le nouveau RDV à la liste des rendez-vous existants
        // pour que les créneaux soient immédiatement bloqués
        this.existingAppointments.push(createdAppointment);
        
        // Afficher la notification de succès
        this.showSuccessNotification();
        
        // Rafraîchir les créneaux disponibles si une date est sélectionnée
        if (this.selectedDate) {
          this.updateAvailableTimes();
        }
        
        // Réinitialiser le formulaire pour une nouvelle réservation
        this.resetFormState();
        
        // Émettre l'événement de succès
        this.success.emit(createdAppointment);
      },
      error: (error) => {
        this.isSubmitting = false;
        
        if (error.status === 409) {
          this.errorMessage = 'Ce créneau est déjà réservé. Veuillez en sélectionner un autre.';
          this.selectedTime = null;
          this.updateAvailableTimes();
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
        }
      }
    });
  }

  // Validation stricte des données
  private validateFormData(): boolean {
    const formValue = this.bookingForm.value;

    // Validation du nom
    if (!formValue.client_name || formValue.client_name.trim().length < 2) {
      this.errorMessage = 'Le nom doit contenir au moins 2 caractères.';
      return false;
    }

    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formValue.client_email)) {
      this.errorMessage = 'Veuillez entrer une adresse email valide.';
      return false;
    }

    // Validation du téléphone si fourni
    if (formValue.client_phone) {
      const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]?[0-9]{2}){4}$/;
      if (!phoneRegex.test(formValue.client_phone)) {
        this.errorMessage = 'Veuillez entrer un numéro de téléphone valide (format français).';
        return false;
      }
    }

    return true;
  }

  // Note : La protection XSS est déjà gérée automatiquement par Angular
  // via le data binding sécurisé dans les templates

  // Afficher une notification de succès (comme le formulaire de contact)
  private showSuccessNotification(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, var(--primary-700), var(--primary-800));
      color: white;
      padding: 1.5rem 2rem;
      border-radius: 50px;
      box-shadow: 0 10px 40px rgba(139, 122, 98, 0.3);
      z-index: 10001;
      font-family: inherit;
      font-size: 1rem;
      max-width: 350px;
      animation: slideIn 0.4s ease-out;
    `;
    
    // Créer le contenu de manière sûre (sans innerHTML pour éviter XSS)
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 1.5rem;';
    iconSpan.textContent = '✓';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = 'Votre demande de réservation a été envoyée avec succès ! Je vous confirmerai rapidement.';
    
    contentDiv.appendChild(iconSpan);
    contentDiv.appendChild(messageSpan);
    notification.appendChild(contentDiv);
    
    // Vérifier si le style existe déjà (pour éviter les doublons)
    let style = document.getElementById('booking-notification-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'booking-notification-style';
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Supprimer après 5 secondes
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.4s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 5000);
  }

  // Marquer tous les champs comme touchés pour afficher les erreurs
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // Utilitaires pour le calendrier
  getDaysInMonth(): Date[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Jours du mois précédent pour compléter la première semaine
    const startDay = firstDay.getDay();
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push(date);
    }

    // Jours du mois
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Jours du mois suivant pour compléter la dernière semaine
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  }

  isDateAvailable(date: Date): boolean {
    const dateStr = this.formatDateLocal(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ne pas permettre les RDV pour le jour même ou les dates passées
    if (date <= today) return false;
    
    // Ne pas afficher les dates bloquées
    if (this.blockedDates.includes(dateStr)) return false;
    
    // Si les horaires ne sont pas encore chargés, permettre la sélection (ils se chargeront après)
    if (this.openingHours.length === 0) {
      return true;
    }
    
    // Vérifier s'il y a des horaires d'ouverture pour ce jour
    const dayOfWeek = date.getDay();
    return this.openingHours.some(h => h.day_of_week === dayOfWeek && h.is_active !== false);
  }

  isDateSelected(date: Date): boolean {
    if (!this.selectedDate) return false;
    return date.toDateString() === this.selectedDate.toDateString();
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth() &&
           date.getFullYear() === this.currentMonth.getFullYear();
  }

  closeModal(): void {
    // Réinitialiser l'état avant de fermer
    this.resetFormState();
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  // Getters pour les erreurs de formulaire
  get clientNameError(): string {
    const control = this.bookingForm.get('client_name');
    if (control?.hasError('required') && control?.touched) {
      return 'Le nom est obligatoire.';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'Le nom doit contenir au moins 2 caractères.';
    }
    if (control?.hasError('pattern') && control?.touched) {
      return 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes.';
    }
    return '';
  }

  get clientEmailError(): string {
    const control = this.bookingForm.get('client_email');
    if (control?.hasError('required') && control?.touched) {
      return 'L\'email est obligatoire.';
    }
    if (control?.hasError('email') && control?.touched) {
      return 'Veuillez entrer une adresse email valide.';
    }
    return '';
  }

  get clientPhoneError(): string {
    const control = this.bookingForm.get('client_phone');
    if (control?.hasError('pattern') && control?.touched) {
      return 'Veuillez entrer un numéro de téléphone valide (format français).';
    }
    return '';
  }

  get showFriendNameField(): boolean {
    return this.bookingForm.get('referral_source')?.value === 'friend';
  }

  get referralFriendNameError(): string {
    const control = this.bookingForm.get('referral_friend_name');
    if (control?.hasError('required') && control?.touched) {
      return 'Le nom de la personne est obligatoire.';
    }
    if (control?.hasError('minlength') && control?.touched) {
      return 'Le nom doit contenir au moins 2 caractères.';
    }
    if (control?.hasError('pattern') && control?.touched) {
      return 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes.';
    }
    return '';
  }

  get showChildAgeField(): boolean {
    return this.isMamanBebePrestation();
  }

  get childAgeError(): string {
    const control = this.bookingForm.get('child_age');
    const unitControl = this.bookingForm.get('child_age_unit');
    const unit = unitControl?.value || 'mois';
    const maxValue = unit === 'mois' ? 24 : 2;
    const unitLabel = unit === 'mois' ? 'mois' : 'années';

    if (control?.hasError('required') && control?.touched) {
      return `L'âge de l'enfant est obligatoire.`;
    }
    if (control?.hasError('min') && control?.touched) {
      return `L'âge doit être supérieur ou égal à 0 ${unitLabel}.`;
    }
    if (control?.hasError('max') && control?.touched) {
      return `L'âge doit être inférieur ou égal à ${maxValue} ${unitLabel}.`;
    }
    return '';
  }
}

