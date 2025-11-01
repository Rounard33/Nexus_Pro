import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Input, Output} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Prestation {
  name: string;
  price: string;
  atHome?: string;
  duration?: string;
  priceOption?: string;
  shortDescription?: string;
  description: string;
  image: string;
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
}
