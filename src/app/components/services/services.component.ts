import {CommonModule} from '@angular/common';
import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Prestation {
  id?: string; // ID nécessaire pour la réservation
  name: string;
  price: string;
  atHome?: string;
  duration?: string;
  priceOption?: string;
  shortDescription?: string;
  description: string;
  image: string;
  requiresContact?: boolean;
}

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent {
  @Input() prestations: Prestation[] = [];
  @Output() openDetails = new EventEmitter<Prestation>();
  @Output() openBooking = new EventEmitter<Prestation>();

  private router = inject(Router);

  onBookingClick(prestation: Prestation): void {
    if (prestation.requiresContact) {
      this.router.navigate(['/contact']);
    } else {
      this.openBooking.emit(prestation);
    }
  }
}
