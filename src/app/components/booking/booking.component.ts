import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Appointment, ContentService, OpeningHours, Prestation} from '../../services/content.service';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit, OnChanges {
  @Input() prestation: Prestation | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<Appointment>();

  bookingForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  // Calendrier
  currentMonth: Date = new Date();
  selectedDate: Date | null = null;
  availableDates: Date[] = [];
  blockedDates: string[] = [];
  openingHours: OpeningHours[] = [];
  selectedTime: string | null = null;
  availableTimes: string[] = [];
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
      notes: ['', [
        Validators.maxLength(500)
      ]]
    });
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
  }

  // Réinitialiser l'état du formulaire et des messages
  private resetFormState(): void {
    this.errorMessage = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.availableTimes = [];
    this.isSubmitting = false;
    this.bookingForm.reset();
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
      error: (error) => {
        console.error('Erreur lors du chargement des dates bloquées:', error);
        this.isLoading = false;
      }
    });

    // Charger les horaires d'ouverture
    this.contentService.getOpeningHours().subscribe({
      next: (hours) => {
        this.openingHours = hours.filter(h => h.is_active !== false);
        this.isLoading = false;
        console.log('Horaires d\'ouverture chargés:', this.openingHours.length);
        // Réinitialiser le calendrier avec les horaires d'ouverture
        this.updateAvailableDates();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des horaires d\'ouverture:', error);
        this.isLoading = false;
        // Même en cas d'erreur, permettre la sélection de dates
        this.openingHours = [];
      }
    });

    // Charger les rendez-vous existants pour éviter les doublons
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    this.contentService.getAppointments(
      undefined,
      today.toISOString().split('T')[0],
      nextMonth.toISOString().split('T')[0]
    ).subscribe({
      next: (appointments) => {
        this.existingAppointments = appointments.filter(a => 
          a.status === 'pending' || a.status === 'accepted'
        );
      },
      error: (error) => {
        console.error('Erreur lors du chargement des rendez-vous:', error);
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
    const dateStr = this.selectedDate.toISOString().split('T')[0];
    
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
          error: (error) => {
            console.error('Erreur lors du chargement des horaires:', error);
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
        
        // Générer les heures disponibles (créneaux de 1h)
        // last_appointment est inclus comme dernier créneau valide
        let current = new Date(startTime);
        while (current <= lastAppointmentTime && current < endTime) {
          const timeStr = this.formatTime(current);
          
          // Vérifier si ce créneau n'est pas déjà réservé
          const isReserved = this.existingAppointments.some(apt => 
            apt.appointment_date === dateStr &&
            apt.appointment_time === timeStr &&
            (apt.status === 'pending' || apt.status === 'accepted')
          );

          if (!isReserved) {
            times.push(timeStr);
          }

          // Ajouter 1 heure pour le prochain créneau
          current.setHours(current.getHours() + 1);
          
          // Si le prochain créneau dépasse lastAppointmentTime ou endTime, arrêter
          if (current > lastAppointmentTime || current >= endTime) {
            break;
          }
        }
      }
    });

    this.availableTimes = [...new Set(times)].sort(); // Supprimer les doublons et trier
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

  // Validation et soumission
  onSubmit(): void {
    if (this.bookingForm.invalid || !this.selectedDate || !this.selectedTime || !this.prestation) {
      this.markFormGroupTouched(this.bookingForm);
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires et sélectionner une date et une heure.';
      return;
    }

    // Vérifier que la prestation a un ID
    if (!this.prestation.id) {
      console.error('Erreur: La prestation n\'a pas d\'ID', this.prestation);
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
    const appointment: Partial<Appointment> = {
      client_name: formValue.client_name.trim(),
      client_email: formValue.client_email.trim().toLowerCase(),
      client_phone: formValue.client_phone ? formValue.client_phone.trim() : undefined,
      prestation_id: this.prestation.id, // ID vérifié ci-dessus
      appointment_date: this.selectedDate.toISOString().split('T')[0],
      appointment_time: this.selectedTime,
      status: 'pending',
      notes: formValue.notes ? formValue.notes.trim() : undefined
    };

    this.contentService.createAppointment(appointment).subscribe({
      next: (createdAppointment) => {
        this.isSubmitting = false;
        
        // Réinitialiser le formulaire
        this.resetFormState();
        
        // Fermer la modal immédiatement
        this.closeModal();
        
        // Afficher la notification de succès (comme le formulaire de contact)
        this.showSuccessNotification();
        
        // Émettre l'événement de succès
        this.success.emit(createdAppointment);
      },
      error: (error) => {
        console.error('Erreur lors de la création du rendez-vous:', error);
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
    const dateStr = date.toISOString().split('T')[0];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Ne pas afficher les dates passées
    if (date < today) return false;
    
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
}

