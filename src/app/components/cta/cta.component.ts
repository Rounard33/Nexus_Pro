import {CommonModule} from '@angular/common';
import {Component, EventEmitter, Output} from '@angular/core';
import {RouterModule} from '@angular/router';

@Component({
  selector: 'app-cta',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './cta.component.html',
  styleUrl: './cta.component.scss'
})
export class CtaComponent {
  @Output() scrollToSection = new EventEmitter<string>();

  onScrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    this.scrollToSection.emit(sectionId);
  }
}
