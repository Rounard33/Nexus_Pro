import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, Input, Output} from '@angular/core';
import {Prestation} from '../services/services.component';

@Component({
  selector: 'app-prestation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './prestation-modal.component.html',
  styleUrl: './prestation-modal.component.scss'
})
export class PrestationModalComponent {
  @Input() prestation: Prestation | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() book = new EventEmitter<Prestation>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  onBook(): void {
    if (this.prestation) {
      this.book.emit(this.prestation);
      this.closeModal();
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }
}
