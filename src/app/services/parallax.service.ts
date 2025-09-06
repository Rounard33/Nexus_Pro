import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ParallaxService {
  private parallaxElements: Element[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initParallax();
    }
  }

  private initParallax(): void {
    window.addEventListener('scroll', () => {
      this.updateParallax();
    });
  }

  private updateParallax(): void {
    const scrolled = window.pageYOffset;
    const rate = scrolled * -0.5;

    this.parallaxElements.forEach(element => {
      try {
        const rect = element.getBoundingClientRect();
        const speed = element.getAttribute('data-parallax-speed') || '0.5';
        const speedValue = parseFloat(speed);
        
        if (!isNaN(speedValue)) {
          const offset = (scrolled - rect.top) * speedValue;
          (element as HTMLElement).style.setProperty('--parallax-offset', `${offset}px`);
        }
      } catch (error) {
        // Silently handle errors to prevent breaking the parallax effect
        // In production, you might want to log this to a monitoring service
      }
    });
  }

  addParallaxElement(element: Element): void {
    this.parallaxElements.push(element);
  }

  removeParallaxElement(element: Element): void {
    const index = this.parallaxElements.indexOf(element);
    if (index > -1) {
      this.parallaxElements.splice(index, 1);
    }
  }
}
