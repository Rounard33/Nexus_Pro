import {CommonModule} from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges
} from '@angular/core';
import {Router} from '@angular/router';
import {
  isPrestationGroup,
  Prestation,
  PrestationGroup,
  reikiTabLabel
} from '../services/services.component';
import {BodyScrollLockDirective} from '../../directives/body-scroll-lock.directive';

@Component({
  selector: 'app-prestation-modal',
  standalone: true,
  imports: [CommonModule, BodyScrollLockDirective],
  templateUrl: './prestation-modal.component.html',
  styleUrl: './prestation-modal.component.scss'
})
export class PrestationModalComponent implements OnChanges {
  @Input() prestation: Prestation | PrestationGroup | null = null;
  /** Onglet Reiki initial (ex. lien depuis les forfaits). */
  @Input() initialReikiTab: number | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() book = new EventEmitter<Prestation>();

  activeReikiTab = 0;

  readonly reikiTabLabel = reikiTabLabel;

  private router = inject(Router);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['prestation'] && this.prestation) {
      if (isPrestationGroup(this.prestation)) {
        const n = this.initialReikiTab;
        const v = this.prestation.variants;
        if (n !== null && n !== undefined && n >= 0 && n < v.length) {
          this.activeReikiTab = n;
        } else {
          this.activeReikiTab = 0;
        }
      } else {
        this.activeReikiTab = 0;
      }
    }
  }

  get isGroup(): boolean {
    return this.prestation != null && isPrestationGroup(this.prestation);
  }

  get activeVariant(): Prestation | null {
    if (!this.prestation) {
      return null;
    }
    if (isPrestationGroup(this.prestation)) {
      return this.prestation.variants[this.activeReikiTab] ?? null;
    }
    return this.prestation;
  }

  get modalHeadline(): string {
    if (!this.prestation) {
      return '';
    }
    return isPrestationGroup(this.prestation) ? this.prestation.cardTitle : this.prestation.name;
  }

  get groupVariants(): Prestation[] {
    return this.prestation && isPrestationGroup(this.prestation) ? this.prestation.variants : [];
  }

  get forfaitSuggestionText(): string | undefined {
    if (!this.prestation) {
      return undefined;
    }
    if (isPrestationGroup(this.prestation)) {
      return this.prestation.forfaitSuggestion;
    }
    return this.prestation.forfaitSuggestion;
  }

  setReikiTab(index: number): void {
    if (this.prestation && isPrestationGroup(this.prestation)) {
      const v = this.prestation.variants;
      if (index >= 0 && index < v.length) {
        this.activeReikiTab = index;
      }
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.close.emit();
  }

  onBook(): void {
    const p = this.activeVariant;
    if (p) {
      if (p.requiresContact) {
        this.closeModal();
        this.router.navigate(['/contact']);
      } else {
        this.book.emit(p);
        this.closeModal();
      }
    }
  }

  scrollToForfaits(): void {
    this.closeModal();
    setTimeout(() => {
      const element = document.getElementById('forfaits');
      if (element) {
        const headerHeight = 80;
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        window.scrollTo({ top: elementPosition - headerHeight, behavior: 'smooth' });
      }
    }, 300);
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.closeModal();
    }
  }
}
