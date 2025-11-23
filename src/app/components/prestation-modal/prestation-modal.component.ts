import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, inject, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
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

  private router = inject(Router);

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  onBook(): void {
    if (this.prestation) {
      if (this.prestation.requiresContact) {
        this.closeModal();
        this.router.navigate(['/contact']);
      } else {
        this.book.emit(this.prestation);
        this.closeModal();
      }
    }
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }
}
