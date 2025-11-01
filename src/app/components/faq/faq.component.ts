import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface FaqItem {
  question: string;
  answer: string;
  isOpen: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './faq.component.html',
  styleUrl: './faq.component.scss'
})
export class FaqComponent {
  @Input() faqs: FaqItem[] = [];

  toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }
}
