import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AvailableSlot, BlockedSlot, ContentService} from '../../../services/content.service';

@Component({
  selector: 'app-blocked-slots',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blocked-slots.component.html',
  styleUrl: './blocked-slots.component.scss'
})
export class BlockedSlotsComponent implements OnInit {
  availableSlots: AvailableSlot[] = [];
  blockedSlots: BlockedSlot[] = [];
  selectedDate: string = '';
  isLoading = false;
  isSaving = false;
  saveSuccess = false;
  saveError: string | null = null;

  dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  get todayStr(): string {
    return new Date().toISOString().split('T')[0];
  }

  constructor(private contentService: ContentService) {}

  ngOnInit(): void {
    this.initSelectedDate();
    this.loadData();
  }

  private initSelectedDate(): void {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    this.selectedDate = `${year}-${month}-${day}`;
  }

  loadData(): void {
    this.isLoading = true;
    this.contentService.getAvailableSlots().subscribe({
      next: (slots) => {
        this.availableSlots = slots;
        this.loadBlockedSlots();
      },
      error: () => {
        this.availableSlots = [];
        this.isLoading = false;
      }
    });
  }

  private loadBlockedSlots(): void {
    const start = this.selectedDate || new Date().toISOString().split('T')[0];
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 60);
    const end = endDate.toISOString().split('T')[0];

    this.contentService.getBlockedSlots(start, end).subscribe({
      next: (slots) => {
        this.blockedSlots = slots;
        this.isLoading = false;
      },
      error: () => {
        this.blockedSlots = [];
        this.isLoading = false;
      }
    });
  }

  onDateChange(): void {
    this.loadBlockedSlots();
  }

  getSlotsForSelectedDate(): { time: string; label: string }[] {
    if (!this.selectedDate) return [];
    const date = new Date(this.selectedDate + 'T12:00:00');
    const dayOfWeek = date.getDay();
    const daySlots = this.availableSlots.filter(
      s => s.day_of_week === dayOfWeek && s.is_active !== false
    );
    return daySlots.map(s => ({
      time: s.start_time.substring(0, 5),
      label: `${s.start_time.substring(0, 5)} - ${s.end_time.substring(0, 5)}`
    })).sort((a, b) => a.time.localeCompare(b.time));
  }

  isSlotBlocked(time: string): boolean {
    return this.blockedSlots.some(
      bs => bs.blocked_date === this.selectedDate && bs.start_time.substring(0, 5) === time
    );
  }

  getBlockedSlot(time: string): BlockedSlot | undefined {
    return this.blockedSlots.find(
      bs => bs.blocked_date === this.selectedDate && bs.start_time.substring(0, 5) === time
    );
  }

  blockSlot(time: string): void {
    if (!this.selectedDate || this.isSaving) return;
    this.isSaving = true;
    this.saveError = null;
    this.contentService.createBlockedSlot({
      blocked_date: this.selectedDate,
      start_time: time.length === 5 ? time + ':00' : time,
      reason: ''
    }).subscribe({
      next: () => {
        this.loadBlockedSlots();
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => {
        this.saveError = 'Erreur lors du blocage du créneau.';
        this.isSaving = false;
      }
    });
  }

  unblockSlot(slot: BlockedSlot): void {
    if (!slot.id || this.isSaving) return;
    this.isSaving = true;
    this.saveError = null;
    this.contentService.deleteBlockedSlot(slot.id).subscribe({
      next: () => {
        this.blockedSlots = this.blockedSlots.filter(bs => bs.id !== slot.id);
        this.isSaving = false;
        this.saveSuccess = true;
        setTimeout(() => this.saveSuccess = false, 3000);
      },
      error: () => {
        this.saveError = 'Erreur lors du déblocage du créneau.';
        this.isSaving = false;
      }
    });
  }

  getDayName(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return this.dayNames[date.getDay()];
  }

  formatDateDisplay(dateStr: string): string {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
}
