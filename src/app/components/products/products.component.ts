import {CommonModule} from '@angular/common';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild} from '@angular/core';
import {gsap} from 'gsap';
import {SectionHeaderComponent} from '../section-header/section-header.component';

export interface Creation {
  name: string;
  price: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, SectionHeaderComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() creations: Creation[] = [];
  @ViewChild('track', {static: false}) trackRef!: ElementRef;
  
  // Dupliquer les créations pour l'effet infini
  duplicatedCreations: Creation[] = [];
  isPaused = false;
  private animationTween: any;
  private initAttempts = 0;
  private maxInitAttempts = 10;
  private isInitialized = false;
  isMobile = false;
  private resizeListener?: () => void;

  constructor(private cdr: ChangeDetectorRef) {
    this.checkMobile();
    // Écouter les changements de taille d'écran
    if (typeof window !== 'undefined') {
      this.resizeListener = () => this.checkMobile();
      window.addEventListener('resize', this.resizeListener);
    }
  }

  private checkMobile(): void {
    if (typeof window !== 'undefined') {
      const wasMobile = this.isMobile;
      this.isMobile = window.innerWidth < 768; // Breakpoint mobile
      
      // Si on passe en mode mobile et que l'animation tourne, l'arrêter
      if (this.isMobile && this.animationTween) {
        this.animationTween.kill();
        this.animationTween = null;
        const track = document.querySelector('.creations-track') as HTMLElement;
        if (track) {
          gsap.set(track, {x: 0, clearProps: 'transform'});
        }
      }
      
      // Si on change de mode (mobile ↔ desktop), réinitialiser les créations
      if (wasMobile !== this.isMobile && this.creations.length > 0) {
        this.initializeCarousel();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['creations'] && !changes['creations'].firstChange && this.creations.length > 0) {
      this.initializeCarousel();
    }
  }

  ngAfterViewInit() {
    if (this.creations.length > 0) {
      this.initializeCarousel();
    }
  }

  private initializeCarousel() {
    // Réinitialiser si nécessaire
    if (this.animationTween) {
      this.animationTween.kill();
      this.animationTween = null;
    }
    this.isInitialized = false;
    
    // Sur mobile, ne pas dupliquer les créations
    // Sur desktop, dupliquer pour l'effet infini (minimum 2 copies pour un effet fluide)
    if (this.isMobile) {
      this.duplicatedCreations = [...this.creations];
    } else {
      const copies = this.creations.length < 4 ? 3 : 2;
      this.duplicatedCreations = Array(copies).fill(this.creations).flat();
    }
    this.cdr.detectChanges();
    
    // Attendre que les éléments soient rendus dans le DOM
    this.initAttempts = 0;
    this.waitForElementsAndInit();
  }

  ngOnDestroy() {
    if (this.animationTween) {
      this.animationTween.kill();
    }
    if (typeof window !== 'undefined' && this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private waitForElementsAndInit() {
    const checkElements = () => {
      const track = document.querySelector('.creations-track') as HTMLElement;
      const cards = document.querySelectorAll('.creation-card') as NodeListOf<HTMLElement>;
      
      if (track && cards.length > 0) {
        const firstCard = cards[0];
        const cardWidth = firstCard.getBoundingClientRect().width;
        
        if (cardWidth > 0 && !this.isInitialized) {
          this.initInfiniteCarousel();
          this.isInitialized = true;
        } else if (this.initAttempts < this.maxInitAttempts) {
          this.initAttempts++;
          setTimeout(checkElements, 150);
        }
      } else if (this.initAttempts < this.maxInitAttempts) {
        this.initAttempts++;
        setTimeout(checkElements, 150);
      } else {
        console.warn('Carousel initialization failed: elements not found after', this.maxInitAttempts, 'attempts');
      }
    };
    
    // Démarrer après un petit délai pour laisser Angular rendre
    setTimeout(checkElements, 50);
  }

  private initInfiniteCarousel() {
    // Ne pas lancer l'animation sur mobile
    if (this.isMobile) {
      return;
    }

    const track = document.querySelector('.creations-track') as HTMLElement;
    if (!track) {
      console.error('Track element not found');
      return;
    }

    const cards = Array.from(document.querySelectorAll('.creation-card')) as HTMLElement[];
    if (cards.length === 0 || this.creations.length === 0) {
      console.error('No cards found or no creations');
      return;
    }

    // Calculer la largeur d'une carte + gap
    const firstCard = cards[0];
    const cardWidth = firstCard.getBoundingClientRect().width || 280;
    const gap = 32; // gap du flex (2rem)
    const singleSetWidth = (cardWidth + gap) * this.creations.length;

    // Position initiale
    gsap.set(track, {x: 0});

    // Animation infinie - défilement continu (uniquement sur desktop)
    this.animationTween = gsap.to(track, {
      x: -singleSetWidth,
      duration: this.creations.length * 5, // 5 secondes par carte (ajustable) - réduire à 3 pour plus rapide
      ease: "none",
      repeat: -1,
      immediateRender: true
    });
  }

  pauseCarousel(): void {
    if (this.animationTween) {
      this.animationTween.pause();
      this.isPaused = true;
    }
  }

  resumeCarousel(): void {
    if (this.animationTween) {
      this.animationTween.resume();
      this.isPaused = false;
    }
  }
}
