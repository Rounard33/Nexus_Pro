import {Injectable} from '@angular/core';

/**
 * Verrouille le scroll du document (body) avec compteur d’empilement :
 * sidebar mobile + modales peuvent s’empiler sans casser la restauration du scroll.
 */
@Injectable({providedIn: 'root'})
export class BodyScrollLockService {
  private depth = 0;
  private savedScrollY = 0;

  push(): void {
    if (this.depth === 0) {
      this.savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
      const body = document.body;
      body.style.overflow = 'hidden';
      body.style.position = 'fixed';
      body.style.top = `-${this.savedScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
    }
    this.depth++;
  }

  pop(): void {
    if (this.depth === 0) {
      return;
    }
    this.depth--;
    if (this.depth > 0) {
      return;
    }
    const body = document.body;
    body.style.removeProperty('overflow');
    body.style.removeProperty('position');
    body.style.removeProperty('top');
    body.style.removeProperty('left');
    body.style.removeProperty('right');
    body.style.removeProperty('width');
    window.scrollTo(0, this.savedScrollY);
  }
}
