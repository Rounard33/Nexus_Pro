import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {AboutComponent} from '../../components/about/about.component';
import {BookingComponent} from '../../components/booking/booking.component';
import {CtaComponent} from '../../components/cta/cta.component';
import {FaqComponent, FaqItem} from '../../components/faq/faq.component';
import {LocationComponent} from '../../components/location/location.component';
import {PrestationModalComponent} from '../../components/prestation-modal/prestation-modal.component';
import {Creation, ProductsComponent} from '../../components/products/products.component';
import {ScrollToTopComponent} from '../../components/scroll-to-top/scroll-to-top.component';
import {Prestation, ServicesComponent} from '../../components/services/services.component';
import {Testimonial, TestimonialsComponent} from '../../components/testimonials/testimonials.component';
import {WelcomeComponent} from '../../components/welcome/welcome.component';
import {Appointment, ContentService} from '../../services/content.service';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    WelcomeComponent,
    AboutComponent,
    ServicesComponent,
    PrestationModalComponent,
    ProductsComponent,
    LocationComponent,
    TestimonialsComponent,
    FaqComponent,
    CtaComponent,
    ScrollToTopComponent,
    BookingComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  selectedPrestation: Prestation | null = null;
  selectedPrestationForBooking: Prestation | null = null;
  
  // Données chargées depuis l'API
  prestations: Prestation[] = [];
  creations: Creation[] = [];
  testimonials: Testimonial[] = [];
  faqs: FaqItem[] = [];
  
  isLoading = true;

  constructor(private contentService: ContentService) {}

  ngOnInit() {
    // Écouter la touche Escape pour fermer la modal
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    
    // Charger les données depuis l'API
    this.loadContent();
  }

  // Charger tout le contenu depuis l'API
  private loadContent() {
    this.isLoading = true;
    
    // Charger les prestations
    this.contentService.getPrestations().subscribe({
      next: (data) => {
        // Transformer les données de la DB vers le format attendu
        this.prestations = data.map(p => ({
          name: p.name,
          price: p.price || '',
          atHome: p.at_home,
          priceOption: p.price_option,
          duration: p.duration,
          shortDescription: p.short_description,
          description: p.description,
          image: p.image_url || ''
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des prestations:', error);
        this.prestations = [];
      }
    });

    // Charger les créations
    this.contentService.getCreations().subscribe({
      next: (data) => {
        this.creations = data.map(c => ({
          name: c.name,
          price: c.price,
          description: c.description,
          image: c.image_url || ''
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des créations:', error);
        this.creations = [];
      }
    });

    // Charger les témoignages
    this.contentService.getTestimonials().subscribe({
      next: (data) => {
        this.testimonials = data.map(t => ({
          name: t.name,
          role: t.role || '',
          text: t.text,
          avatar: t.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=f5f1e8&color=6f5f4e&size=150`
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des témoignages:', error);
        this.testimonials = [];
      }
    });

    // Charger les FAQ
    this.contentService.getFaqs().subscribe({
      next: (data) => {
        this.faqs = data.map(f => ({
          question: f.question,
          answer: f.answer,
          isOpen: false
        }));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des FAQ:', error);
        this.faqs = [];
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit() {
    // Attendre que les données soient chargées avant d'initialiser les animations
    setTimeout(() => {
      this.initScrollAnimations();
    }, 500);
    
    // Empêcher le scroll du body quand la modal est ouverte
    if (this.selectedPrestation) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy() {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    document.removeEventListener('keydown', this.handleEscapeKey.bind(this));
    document.body.style.overflow = '';
  }
  
  private handleEscapeKey(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.selectedPrestation) {
      this.closeDetailsModal();
    }
  }


  // Méthode pour ouvrir la modal de détails
  openDetailsModal(prestation: Prestation): void {
    this.selectedPrestation = prestation;
    document.body.style.overflow = 'hidden';
  }

  // Méthode pour fermer la modal de détails
  closeDetailsModal(): void {
    this.selectedPrestation = null;
    document.body.style.overflow = '';
  }

  // Méthode pour ouvrir la modal de réservation
  openBookingModal(prestation: Prestation): void {
    // Fermer la modal de détails si elle est ouverte
    if (this.selectedPrestation) {
      this.closeDetailsModal();
    }
    this.selectedPrestationForBooking = prestation;
    document.body.style.overflow = 'hidden';
  }

  // Fermer la modal de réservation
  closeBookingModal(): void {
    this.selectedPrestationForBooking = null;
    document.body.style.overflow = '';
  }

  // Gérer le succès de la réservation
  onBookingSuccess(appointment: Appointment): void {
    console.log('Réservation créée avec succès:', appointment);
    // Vous pouvez ajouter ici une notification de succès
    this.closeBookingModal();
  }

  /**
   * Effectue un scroll smooth vers une section de la page
   */
  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  private initScrollAnimations() {
    // Animation des cartes au scroll
    gsap.utils.toArray('.prestation-card, .creation-card, .testimonial-card').forEach((element: any) => {
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

    // Animation des titres de section
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

    // Animation des badges de section
    gsap.utils.toArray('.section-badge').forEach((element: any) => {
      gsap.fromTo(element, {
        y: -20,
        opacity: 0
      }, {
        y: 0,
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: element,
          start: "top 90%",
          toggleActions: "play none none reverse"
        }
      });
    });
  }
}
