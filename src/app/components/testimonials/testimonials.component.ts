import {CommonModule} from '@angular/common';
import {Component, Input} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar: string;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss'
})
export class TestimonialsComponent {
  @Input() testimonials: Testimonial[] = [];

  onImageError(event: any, name: string): void {
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f5f1e8&color=6f5f4e&size=150`;
  }
}
