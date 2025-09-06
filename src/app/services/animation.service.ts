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

    // Observer tous les éléments avec la classe 'animate-on-scroll'
    setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        this.observer?.observe(el);
      });
    }, 100);
  }

  observeElement(element: Element): void {
    this.observer?.observe(element);
  }

  unobserveElement(element: Element): void {
    this.observer?.unobserve(element);
  }
}
