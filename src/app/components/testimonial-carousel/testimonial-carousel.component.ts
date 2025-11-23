import {CommonModule} from '@angular/common';
import {Component, Input, OnDestroy, OnInit} from '@angular/core';

interface Testimonial {
  name: string;
  role: string;
  content: string;
  avatar: string;
  age?: number;
}

@Component({
  selector: 'app-testimonial-carousel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial-carousel.component.html',
  styleUrl: './testimonial-carousel.component.scss'
})
export class TestimonialCarouselComponent implements OnInit, OnDestroy {
  @Input() testimonials: Testimonial[] = [];
  @Input() autoSlideDelay: number = 5000; // Délai en millisecondes (5 secondes par défaut)
  
  currentIndex = 0;
  isTransitioning = false;
  imageLoaded = true;
  private autoSlideInterval: any;

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  startAutoSlide(): void {
    if (this.testimonials.length > 1) {
      this.autoSlideInterval = setInterval(() => {
        this.next();
      }, this.autoSlideDelay);
    }
  }

  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
      this.autoSlideInterval = null;
    }
  }

  get currentTestimonial(): Testimonial {
    return this.testimonials[this.currentIndex] || this.testimonials[0];
  }

  next(): void {
    if (this.isTransitioning || this.testimonials.length === 0) return;
    
    this.isTransitioning = true;
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  onImageError(event: any): void {
    this.imageLoaded = false;
  }

  // Pause le défilement automatique au survol
  onMouseEnter(): void {
    this.stopAutoSlide();
  }

  // Reprend le défilement automatique quand la souris quitte
  onMouseLeave(): void {
    this.startAutoSlide();
  }
}
