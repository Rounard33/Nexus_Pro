import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AnimationService {
  private observer: IntersectionObserver | null = null;

  constructor() {
    this.initScrollAnimations();
  }

  private initScrollAnimations(): void {
    if (typeof window === 'undefined') return;

    try {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('animate-in');
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '0px 0px -50px 0px'
        }
      );

      // Observe all elements with 'animate-on-scroll' class
      setTimeout(() => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(el => {
          if (this.observer) {
            this.observer.observe(el);
          }
        });
      }, 100);
    } catch (error) {
      // Silently handle errors to prevent breaking the animation system
      // In production, you might want to log this to a monitoring service
    }
  }

  observeElement(element: Element): void {
    this.observer?.observe(element);
  }

  unobserveElement(element: Element): void {
    this.observer?.unobserve(element);
  }
}
