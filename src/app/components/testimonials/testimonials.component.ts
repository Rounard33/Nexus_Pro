import {CommonModule} from '@angular/common';
import {Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges} from '@angular/core';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar: string;
  age?: number;
}

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './testimonials.component.html',
  styleUrl: './testimonials.component.scss'
})
export class TestimonialsComponent implements OnInit, OnDestroy, OnChanges {
  @Input() testimonials: Testimonial[] = [];
  
  currentIndex = 0;
  isTransitioning = false;
  private autoSlideInterval: any;
  private readonly autoSlideDelay = 5000;

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['testimonials']) {
      this.stopAutoSlide();
      this.currentIndex = 0;
      setTimeout(() => {
        this.startAutoSlide();
      }, 100);
    }
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

  next(): void {
    if (this.isTransitioning || this.testimonials.length === 0) return;
    
    this.isTransitioning = true;
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
    
    setTimeout(() => {
      this.isTransitioning = false;
    }, 300);
  }

  get currentTestimonial(): Testimonial | null {
    if (this.testimonials.length === 0) return null;
    return this.testimonials[this.currentIndex] || this.testimonials[0];
  }

  onImageError(event: any, name: string): void {
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f5f1e8&color=6f5f4e&size=150`;
  }

  onMouseEnter(): void {
    this.stopAutoSlide();
  }

  onMouseLeave(): void {
    this.startAutoSlide();
  }
}

