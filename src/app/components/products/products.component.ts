import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Creation {
  name: string;
  price: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
  @Input() creations: Creation[] = [];
}
