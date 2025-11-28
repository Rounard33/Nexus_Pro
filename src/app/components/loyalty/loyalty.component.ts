import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss'
})
export class LoyaltyComponent {
}

