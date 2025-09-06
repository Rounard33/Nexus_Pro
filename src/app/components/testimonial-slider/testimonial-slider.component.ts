import {CommonModule} from '@angular/common';
import {Component, OnDestroy, OnInit} from '@angular/core';

@Component({
  selector: 'app-testimonial-slider',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './testimonial-slider.component.html',
  styleUrl: './testimonial-slider.component.scss'
})
export class TestimonialSliderComponent implements OnInit, OnDestroy {
  currentIndex = 0;
  private autoSlideInterval: any;

  testimonials = [
    {
      id: 1,
      name: 'Marie Dubois',
      role: 'CEO, TechCorp',
      content: 'NexusPro a transformé notre présence digitale. Le design est exceptionnel et les performances sont remarquables.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      company: 'TechCorp'
    },
    {
      id: 2,
      name: 'Jean Martin',
      role: 'Directeur Marketing, InnovateLab',
      content: 'Un thème professionnel et moderne qui correspond parfaitement à notre image de marque. Je le recommande vivement !',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      company: 'InnovateLab'
    },
    {
      id: 3,
      name: 'Sophie Laurent',
      role: 'Fondatrice, CreativeStudio',
      content: 'La personnalisation est incroyablement facile. En quelques heures, nous avions un site parfaitement adapté à nos besoins.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      company: 'CreativeStudio'
    },
    {
      id: 4,
      name: 'Pierre Moreau',
      role: 'CTO, DigitalAgency',
      content: 'Code propre, documentation excellente, et support réactif. Tout ce qu\'on peut attendre d\'un thème premium.',
      rating: 5,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      company: 'DigitalAgency'
    }
  ];

  ngOnInit(): void {
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    this.stopAutoSlide();
  }

  startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  stopAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  nextSlide(): void {
    this.currentIndex = (this.currentIndex + 1) % this.testimonials.length;
  }

  previousSlide(): void {
    this.currentIndex = this.currentIndex === 0 ? this.testimonials.length - 1 : this.currentIndex - 1;
  }

  goToSlide(index: number): void {
    this.currentIndex = index;
  }

  onImageError(event: any): void {
    event.target.style.display = 'none';
  }

  getStars(rating: number): number[] {
    return Array(rating).fill(0);
  }
}
