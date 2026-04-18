import {CommonModule} from '@angular/common';
import {Component, EventEmitter, HostListener, inject, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
import {Prestation, PrestationGroup, reikiTabLabel} from '../services/services.component';

@Component({
  selector: 'app-reiki-session-choice-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './reiki-session-choice-modal.component.html',
  styleUrl: './reiki-session-choice-modal.component.scss'
})
export class ReikiSessionChoiceModalComponent {
  @Input() group: PrestationGroup | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() choose = new EventEmitter<Prestation>();

  private router = inject(Router);

  readonly tabLabel = reikiTabLabel;

  get isOpen(): boolean {
    return this.group != null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.close.emit();
  }

  pickVariant(p: Prestation): void {
    if (p.requiresContact) {
      this.closeModal();
      void this.router.navigate(['/contact']);
      return;
    }
    this.choose.emit(p);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }
}
