import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string;
}

@Component({
  selector: 'app-testimonial-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial-carousel.component.html',
  styleUrl: './testimonial-carousel.component.scss'
})
export class TestimonialCarouselComponent {
  @Input() testimonials: Testimonial[] = [];
  
  currentIndex = 0;
  isTransitioning = false;
  imageLoaded = true;

  get currentTestimonial(): Testimonial {
    return this.testimonials[this.currentIndex] || this.testimonials[0];
  }

  next(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  previous(): void {
    if (this.isTransitioning) return;
    
    this.isTransitioning = true;
    this.currentIndex = this.currentIndex === 0 
      ? this.testimonials.length - 1 
      : this.currentIndex - 1;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  goToSlide(index: number): void {
    if (this.isTransitioning || index === this.currentIndex) return;
    
    this.isTransitioning = true;
    this.currentIndex = index;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  onImageError(event: any): void {
    this.imageLoaded = false;
  }
}
