import {CommonModule} from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Appointment, ContentService, OpeningHours, Prestation} from '../../services/content.service';
import {CaptchaComponent} from '../captcha/captcha.component';
import {BookingCalendarService, BookingTimeSlotService} from './services';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, CaptchaComponent],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.scss'
})
export class BookingComponent implements OnInit, OnChanges {
  // === Inputs/Outputs ===
  @Input() prestation: Prestation | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<Appointment>();
  @ViewChild(CaptchaComponent) captchaComponent!: CaptchaComponent;

  // === Form ===
  bookingForm: FormGroup;
  isLoading = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  // === Captcha ===
  isCaptchaValid = false;
  captchaToken = '';

  // === Calendar State ===
  currentMonth = new Date();
  selectedDate: Date | null = null;
  availableDates: Date[] = [];
  blockedDates: string[] = [];
  openingHours: OpeningHours[] = [];

  // === Time Slots State ===
  selectedTime: string | null = null;
  availableTimes: string[] = [];
  allTimes: string[] = [];
  existingAppointments: Appointment[] = [];

  // === Constants (délégués aux services) ===
  get months(): string[] { return this.calendarService.MONTHS; }
  get weekDays(): string[] { return this.calendarService.WEEK_DAYS; }

  constructor(
    private fb: FormBuilder,
    private contentService: ContentService,
    private calendarService: BookingCalendarService,
    private timeSlotService: BookingTimeSlotService
  ) {
    this.bookingForm = this.createForm();
    this.setupFormValidation();
  }

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    this.resetFormState();
    this.loadInitialData();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prestation']) {
      if (!changes['prestation'].firstChange) {
        this.resetFormState();
      }
      this.updateChildAgeValidation();
    }
  }

  // ============================================================
  // FORM CREATION & VALIDATION
  // ============================================================

  private createForm(): FormGroup {
    return this.fb.group({
      client_name: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.maxLength(100),
        Validators.pattern(/^[a-zA-ZÀ-ÿ\s'-]+$/)
      ]],
      client_email: ['', [
        Validators.required,
        Validators.email,
        Validators.maxLength(255)
      ]],
      client_phone: ['', [
        Validators.pattern(/^(?:(?:\+|00)33|0)[1-9](?:[\s.-]?[0-9]{2}){4}$/),
        Validators.maxLength(20)
      ]],
      referral_source: [''],
      referral_friend_name: [''],
      child_age: [''],
      child_age_unit: ['mois'],
      notes: ['', [Validators.maxLength(500)]]
    });
  }

  private setupFormValidation(): void {
    // Validation conditionnelle pour referral_friend_name
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
        friendNameControl?.setValue('');
      }
      friendNameControl?.updateValueAndValidity();
    });

    this.updateChildAgeValidation();
  }

  private updateChildAgeValidation(): void {
    const childAgeControl = this.bookingForm.get('child_age');
    const childAgeUnitControl = this.bookingForm.get('child_age_unit');
    if (!childAgeControl || !childAgeUnitControl) return;

    if (this.isMamanBebePrestation()) {
      const updateValidation = () => {
        const unit = childAgeUnitControl.value || 'mois';
        const maxAge = unit === 'mois' ? 24 : 2;
        childAgeControl.setValidators([
          Validators.required,
          Validators.min(0),
          Validators.max(maxAge)
        ]);
        childAgeControl.updateValueAndValidity();
      };

      childAgeUnitControl.valueChanges.subscribe(() => {
        updateValidation();
        childAgeControl.setValue('');
      });

      updateValidation();
    } else {
      childAgeControl.clearValidators();
      childAgeControl.setValue('');
      childAgeUnitControl.setValue('mois');
    }
    childAgeControl.updateValueAndValidity();
  }

  private isMamanBebePrestation(): boolean {
    if (!this.prestation?.name) return false;
    const name = this.prestation.name.toLowerCase();
    return (name.includes('maman') && name.includes('bebe')) ||
           (name.includes('maman') && name.includes('bébé')) ||
           (name.includes('mère') && name.includes('bébé')) ||
           (name.includes('mere') && name.includes('bebe'));
  }

  // ============================================================
  // DATA LOADING
  // ============================================================

  private loadInitialData(): void {
    this.isLoading = true;
    this.loadBlockedDates();
    this.loadOpeningHours();
    this.loadExistingAppointments();
  }

  private loadBlockedDates(): void {
    this.contentService.getBlockedDates().subscribe({
      next: (dates) => {
        this.blockedDates = dates.map(d => d.blocked_date);
        this.updateAvailableDates();
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private loadOpeningHours(): void {
    this.contentService.getOpeningHours().subscribe({
      next: (hours) => {
        this.openingHours = hours.filter(h => h.is_active !== false);
        this.isLoading = false;
        this.updateAvailableDates();
      },
      error: () => {
        this.isLoading = false;
        this.openingHours = [];
      }
    });
  }

  private loadExistingAppointments(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 60);

    this.contentService.getAppointments(
      undefined,
      this.calendarService.formatDateLocal(today),
      this.calendarService.formatDateLocal(endDate)
    ).subscribe({
      next: (appointments) => {
        this.existingAppointments = appointments.filter(
          a => a.status === 'pending' || a.status === 'accepted'
        );
      },
      error: () => {
        // Erreur silencieuse
      }
    });
  }

  // ============================================================
  // CALENDAR LOGIC (délégué au service)
  // ============================================================

  private updateAvailableDates(): void {
    this.availableDates = this.calendarService.generateAvailableDates(
      60,
      this.blockedDates,
      this.openingHours
    );
  }

  previousMonth(): void {
    this.currentMonth = this.calendarService.getPreviousMonth(this.currentMonth);
    this.updateAvailableDates();
  }

  nextMonth(): void {
    this.currentMonth = this.calendarService.getNextMonth(this.currentMonth);
    this.updateAvailableDates();
  }

  getDaysInMonth(): Date[] {
    return this.calendarService.getDaysInMonth(this.currentMonth);
  }

  isDateAvailable(date: Date): boolean {
    return this.calendarService.isDateAvailable(date, this.blockedDates, this.openingHours);
  }

  isDateSelected(date: Date): boolean {
    return this.calendarService.isDateSelected(date, this.selectedDate);
  }

  isCurrentMonth(date: Date): boolean {
    return this.calendarService.isCurrentMonth(date, this.currentMonth);
  }

  selectDate(date: Date): void {
    if (!this.isDateAvailable(date)) return;

    this.selectedDate = date;
    this.selectedTime = null;
    this.errorMessage = null;
    this.updateAvailableTimes();
  }

  // ============================================================
  // TIME SLOTS LOGIC (délégué au service)
  // ============================================================

  private updateAvailableTimes(): void {
    if (!this.selectedDate) return;

    if (this.openingHours.length === 0) {
      this.availableTimes = [];
      if (!this.isLoading) {
        this.loadOpeningHours();
      }
      return;
    }

    const result = this.timeSlotService.generateTimeSlots(
      this.selectedDate,
      this.openingHours,
      this.existingAppointments,
      this.prestation
    );

    this.availableTimes = result.availableTimes;
    this.allTimes = result.allTimes;
    
    if (result.errorMessage) {
      this.errorMessage = result.errorMessage;
    }
  }

  isTimeAvailable(time: string): boolean {
    return this.timeSlotService.isTimeAvailable(time, this.availableTimes);
  }

  selectTime(time: string): void {
    this.selectedTime = time;
    this.errorMessage = null;
  }

  // ============================================================
  // CAPTCHA
  // ============================================================

  onCaptchaValidationChange(isValid: boolean): void {
    this.isCaptchaValid = isValid;
  }

  onCaptchaTokenReceived(token: string): void {
    this.captchaToken = token;
  }

  // ============================================================
  // FORM SUBMISSION
  // ============================================================

  onSubmit(): void {
    if (!this.validateBeforeSubmit()) return;

    this.isSubmitting = true;
    this.errorMessage = null;

    const appointment = this.buildAppointmentPayload();

    this.contentService.createAppointment(appointment).subscribe({
      next: (createdAppointment) => this.handleSubmitSuccess(createdAppointment),
      error: (error) => this.handleSubmitError(error)
    });
  }

  private validateBeforeSubmit(): boolean {
    if (this.bookingForm.invalid || !this.selectedDate || !this.selectedTime || !this.prestation) {
      this.markFormGroupTouched(this.bookingForm);
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires et sélectionner une date et une heure.';
      return false;
    }

    if (!this.isCaptchaValid) {
      this.errorMessage = 'Veuillez compléter la vérification anti-spam.';
      return false;
    }

    if (!this.prestation.id) {
      this.errorMessage = 'Erreur: Prestation invalide. Veuillez réessayer.';
      return false;
    }

    if (!this.validateFormData()) {
      return false;
    }

    return true;
  }

  private buildAppointmentPayload(): any {
    const formValue = this.bookingForm.value;

    const appointment: any = {
      client_name: formValue.client_name.trim(),
      client_email: formValue.client_email.trim().toLowerCase(),
      prestation_id: this.prestation!.id,
      appointment_date: this.calendarService.formatDateLocal(this.selectedDate!),
      appointment_time: this.selectedTime,
      status: 'pending'
    };

    // Champs optionnels
    if (formValue.client_phone?.trim()) {
      appointment.client_phone = formValue.client_phone.trim();
    }

    if (formValue.notes?.trim()) {
      appointment.notes = formValue.notes.trim();
    }

    if (formValue.referral_source?.trim()) {
      appointment.referral_source = formValue.referral_source.trim();
    }

    if (formValue.referral_source === 'friend' && formValue.referral_friend_name?.trim()) {
      appointment.referral_friend_name = formValue.referral_friend_name.trim();
    }

    // Âge de l'enfant (conversion en mois)
    if (formValue.child_age !== undefined && formValue.child_age !== null && formValue.child_age !== '') {
      const age = parseFloat(formValue.child_age);
      if (!isNaN(age) && age >= 0) {
        const unit = formValue.child_age_unit || 'mois';
        appointment.child_age = unit === 'années' ? Math.round(age * 12) : Math.round(age);
      }
    }

    if (this.captchaToken) {
      appointment.captcha_token = this.captchaToken;
    }

    return appointment;
  }

  private handleSubmitSuccess(createdAppointment: Appointment): void {
    this.isSubmitting = false;
    this.existingAppointments.push(createdAppointment);
    this.showSuccessNotification();

    if (this.selectedDate) {
      this.updateAvailableTimes();
    }

    this.resetFormState();
    this.success.emit(createdAppointment);
  }

  private handleSubmitError(error: any): void {
    this.isSubmitting = false;

    if (error.status === 409) {
      this.errorMessage = 'Ce créneau est déjà réservé. Veuillez en sélectionner un autre.';
      this.selectedTime = null;
      this.updateAvailableTimes();
    } else {
      this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
    }
  }

  private validateFormData(): boolean {
    const formValue = this.bookingForm.value;

    if (!formValue.client_name || formValue.client_name.trim().length < 2) {
      this.errorMessage = 'Le nom doit contenir au moins 2 caractères.';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formValue.client_email)) {
      this.errorMessage = 'Veuillez entrer une adresse email valide.';
      return false;
    }

    if (formValue.client_phone) {
      const phoneRegex = /^(?:(?:\+|00)33|0)[1-9](?:[\s.-]?[0-9]{2}){4}$/;
      if (!phoneRegex.test(formValue.client_phone)) {
        this.errorMessage = 'Veuillez entrer un numéro de téléphone valide (format français).';
        return false;
      }
    }

    return true;
  }

  // ============================================================
  // UI HELPERS
  // ============================================================

  private resetFormState(): void {
    this.errorMessage = null;
    this.selectedDate = null;
    this.selectedTime = null;
    this.availableTimes = [];
    this.isSubmitting = false;
    this.bookingForm.reset();
    this.bookingForm.patchValue({ child_age_unit: 'mois' });
    this.updateChildAgeValidation();
    this.isCaptchaValid = false;
    this.captchaToken = '';
    this.captchaComponent?.refresh();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

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

    setTimeout(() => {
      notification.style.animation = 'slideIn 0.4s ease-out reverse';
      setTimeout(() => notification.parentNode?.removeChild(notification), 400);
    }, 5000);
  }

  // ============================================================
  // MODAL MANAGEMENT
  // ============================================================

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.resetFormState();
    this.close.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }

  // ============================================================
  // FORM ERROR GETTERS
  // ============================================================

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
