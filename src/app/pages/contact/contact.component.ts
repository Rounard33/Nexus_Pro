import {CommonModule} from '@angular/common';
import {HttpClient} from '@angular/common/http';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, NavigationEnd, Router, RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {filter} from 'rxjs/operators';
import {ContentService, OpeningHours} from '../../services/content.service';
import {environment} from '../../../environments/environment';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.scss'
})
export class ContactComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('title') title!: ElementRef;
  @ViewChild('description') description!: ElementRef;

  isSubmitting = false;
  openingHours: OpeningHours[] = [];
  isLoadingHours = true;

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
    private contentService: ContentService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    window.addEventListener('scroll', this.onWindowScroll.bind(this));
    this.onWindowScroll();

     this.contentService.getOpeningHours().subscribe({
      next: (data) => {
        this.openingHours = data;
        this.isLoadingHours = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des horaires:', error);
        this.openingHours = [];
        this.isLoadingHours = false;
        this.cdr.detectChanges();
      }
    });
    
    // Gérer le scroll vers les fragments d'URL uniquement lors de la navigation
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => this.handleFragment(), 100);
      });
  }

  ngAfterViewInit(): void {
    this.initWelcomeAnimations();
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
    address: '132 route de Capian - 33550 Langoiran'
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
    
    const apiUrl = `${environment.apiUrl}/contact`;
    
    this.http.post<{ success: boolean; message: string }>(apiUrl, this.contactForm)
      .subscribe({
        next: (response) => {
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
        },
        error: (error) => {
          console.error('Erreur lors de l\'envoi du message:', error);
          this.showErrorMessage(
            error.error?.message || 
            'Une erreur est survenue lors de l\'envoi. Veuillez réessayer.'
          );
          this.isSubmitting = false;
          this.cdr.detectChanges();
        }
      });
  }
  
  private showErrorMessage(message: string): void {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #c0392b, #a93226);
      color: white;
      padding: 1.5rem 2rem;
      border-radius: 50px;
      box-shadow: 0 10px 40px rgba(192, 57, 43, 0.3);
      z-index: 10000;
      font-family: inherit;
      font-size: 1rem;
      max-width: 350px;
      animation: slideIn 0.4s ease-out;
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 1.5rem;';
    iconSpan.textContent = '✗';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    
    contentDiv.appendChild(iconSpan);
    contentDiv.appendChild(messageSpan);
    notification.appendChild(contentDiv);
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'slideIn 0.4s ease-out reverse';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 400);
    }, 5000);
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
    
    // Créer le contenu de manière sûre (sans innerHTML pour éviter XSS)
    const contentDiv = document.createElement('div');
    contentDiv.style.cssText = 'display: flex; align-items: center; gap: 0.75rem;';
    
    const iconSpan = document.createElement('span');
    iconSpan.style.cssText = 'font-size: 1.5rem;';
    iconSpan.textContent = '✓';
    
    const messageSpan = document.createElement('span');
    messageSpan.textContent = 'Merci pour votre message ! Je vous répondrai dans les plus brefs délais.';
    
    contentDiv.appendChild(iconSpan);
    contentDiv.appendChild(messageSpan);
    notification.appendChild(contentDiv);
    
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

  private initWelcomeAnimations(): void {
    if (!this.title || !this.description) return;

    const tl = gsap.timeline({ delay: 0.5 });
    
    tl.from('.badge', {
      duration: 0.8,
      y: -30,
      opacity: 0,
      ease: "power2.out"
    });

    tl.from(this.title.nativeElement.querySelectorAll('.title-line'), {
      duration: 1.2,
      y: 50,
      opacity: 0,
      ease: "power3.out",
      stagger: 0.2
    }, "-=0.4");

    tl.from(this.description.nativeElement, {
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
