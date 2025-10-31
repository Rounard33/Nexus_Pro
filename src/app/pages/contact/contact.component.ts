import {CommonModule} from '@angular/common';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, NavigationEnd, Router, RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {filter} from 'rxjs/operators';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroTitle') heroTitle!: ElementRef;
  @ViewChild('heroDescription') heroDescription!: ElementRef;

  isSubmitting = false;

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    window.addEventListener('scroll', this.onWindowScroll.bind(this));
    this.onWindowScroll();
    
    // Gérer le scroll vers les fragments d'URL uniquement lors de la navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.handleFragment(), 100);
      });
  }

  ngAfterViewInit(): void {
    this.initHeroAnimations();
    this.initScrollAnimations();
    // Vérifier le fragment au chargement initial (uniquement si présent)
    setTimeout(() => this.handleFragment(), 300);
  }
  
  private handleFragment(): void {
    // Récupérer le fragment directement depuis l'URL sans créer d'abonnement
    const fragment = this.router.url.split('#')[1];
    
    // Ne scroller QUE si le fragment est explicitement "horaires"
    if (fragment === 'horaires') {
      setTimeout(() => {
        const element = document.getElementById('horaires');
        if (element) {
          const headerHeight = 80;
          const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
          const offsetPosition = elementPosition - headerHeight;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }

  ngOnDestroy(): void {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    window.removeEventListener('scroll', this.onWindowScroll.bind(this));
  }

  private onWindowScroll(): void {
    // Scroll handling if needed
  }

  contactInfo = {
    email: 'contact@lacouleurdelaura.com',
    phone: '+33 6 12 34 56 78',
    address: 'Adresse à définir, France'
  };

  socialLinks = [
    { name: 'Facebook', url: '#', icon: 'assets/icons/facebook.png' },
    { name: 'Instagram', url: '#', icon: 'assets/icons/instagram.png' }
  ];

  contactForm = {
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  };

  onSubmit(): void {
    if (this.isSubmitting) return;
    
    this.isSubmitting = true;
    this.cdr.detectChanges();
    
    // Simulate form submission
    setTimeout(() => {
      this.showSuccessMessage();
      
      // Reset form
      this.contactForm = {
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      };
      
      this.isSubmitting = false;
      this.cdr.detectChanges();
    }, 1500);
  }

  private showSuccessMessage(): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, var(--primary-700), var(--primary-800));
      color: white;
      padding: 1.5rem 2rem;
      border-radius: 50px;
      box-shadow: 0 10px 40px rgba(139, 122, 98, 0.3);
      z-index: 10000;
      font-family: inherit;
      font-size: 1rem;
      max-width: 350px;
      animation: slideIn 0.4s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <span style="font-size: 1.5rem;">✓</span>
        <span>Merci pour votre message ! Je vous répondrai dans les plus brefs délais.</span>
      </div>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.4s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
        if (style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 400);
    }, 5000);
  }

  private initHeroAnimations(): void {
    if (!this.heroTitle || !this.heroDescription) return;

    const tl = gsap.timeline({ delay: 0.5 });
    
    tl.from('.hero-badge', {
      duration: 0.8,
      y: -30,
      opacity: 0,
      ease: "power2.out"
    });

    tl.from(this.heroTitle.nativeElement.querySelectorAll('.title-line'), {
      duration: 1.2,
      y: 50,
      opacity: 0,
      ease: "power3.out",
      stagger: 0.2
    }, "-=0.4");

    tl.from(this.heroDescription.nativeElement, {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: "power2.out"
    }, "-=0.6");
  }

  private initScrollAnimations(): void {
    gsap.utils.toArray('.contact-form-wrapper, .contact-info-card, .hours-card').forEach((element: any) => {
      gsap.fromTo(element, {
        y: 50,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      });
    });

    gsap.utils.toArray('.section-title').forEach((element: any) => {
      gsap.fromTo(element, {
        x: -50,
        opacity: 0
      }, {
        x: 0,
        opacity: 1,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 85%",
          toggleActions: "play none none reverse"
        }
      });
    });
  }
}
