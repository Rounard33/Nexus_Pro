import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {AboutComponent} from '../../components/about/about.component';
import {BookingComponent} from '../../components/booking/booking.component';
import {CtaComponent} from '../../components/cta/cta.component';
import {FaqComponent, FaqItem} from '../../components/faq/faq.component';
import {ForfaitsComponent} from '../../components/forfaits/forfaits.component';
import {LocationComponent} from '../../components/location/location.component';
import {LoyaltyComponent} from '../../components/loyalty/loyalty.component';
import {PrestationModalComponent} from '../../components/prestation-modal/prestation-modal.component';
import {ReikiSessionChoiceModalComponent} from '../../components/reiki-session-choice-modal/reiki-session-choice-modal.component';
import {Creation, ProductsComponent} from '../../components/products/products.component';
import {ScrollToTopComponent} from '../../components/scroll-to-top/scroll-to-top.component';
import {
  buildPrestationCards,
  isPrestationGroup,
  Prestation,
  PrestationGroup,
  ServicesComponent
} from '../../components/services/services.component';
import {Testimonial, TestimonialsComponent} from '../../components/testimonials/testimonials.component';
import {WelcomeComponent} from '../../components/welcome/welcome.component';
import {Appointment, ContentService} from '../../services/content.service';
import {LoadingService} from '../../services/loading.service';
import {getCreationImageUrl, getPrestationImageUrl, getTestimonialAvatarUrl} from '../../utils/supabase-storage.utils';

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
    ReikiSessionChoiceModalComponent,
    ProductsComponent,
    ForfaitsComponent,
    LocationComponent,
    TestimonialsComponent,
    FaqComponent,
    CtaComponent,
    ScrollToTopComponent,
    BookingComponent,
    LoyaltyComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  selectedPrestation: Prestation | PrestationGroup | null = null;
  /** Onglet Reiki initial pour la modale (liens forfaits / FAQ). */
  modalInitialReikiTab: number | null = null;
  selectedPrestationForBooking: Prestation | null = null;
  /** Modale « Choisir votre séance » (carte Reiki). */
  reikiSessionChoiceGroup: PrestationGroup | null = null;
  
  // Données chargées depuis l'API
  prestations: Prestation[] = [];
  /** Grille : Reiki fusionné en une carte si ≥ 2 variantes. */
  prestationCards: (Prestation | PrestationGroup)[] = [];
  creations: Creation[] = [];
  testimonials: Testimonial[] = [];
  faqs: FaqItem[] = [];
  
  isLoading = true;

  constructor(
    private contentService: ContentService,
    private loadingService: LoadingService
  ) {}

  ngOnInit() {
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
    
    this.loadContent();
  }

  private loadContent() {
    this.isLoading = true;
    this.loadingService.reset(); // Réinitialiser le compteur
    
    this.contentService.getPrestations().subscribe({
      next: (data) => {
        this.prestations = data.map(p => {
          const isCranialMassage = p.name.toLowerCase().includes('crânien') || 
                                    p.name.toLowerCase().includes('cranien');
          const nameLower = p.name.toLowerCase();
          
          let forfaitSuggestion: string | undefined;
          if (nameLower.includes('pnl')) {
            forfaitSuggestion = 'Pensez au forfait Accompagnement Global';
          } else if (nameLower.includes('reiki usui')) {
            forfaitSuggestion = 'Pensez à consulter nos forfaits pour une continuité dans les soins et un travail plus complet et durable, et une économie sur le prix des séances';
          } else if (isCranialMassage) {
            forfaitSuggestion = 'Pensez au forfait "Accompagnement Global" ou "Déconnexion à Soi" pour un travail plus en profondeur et une économie sur le prix des séances';
          }

          return {
            id: p.id,
            name: p.name,
            price: p.price || '',
            atHome: p.at_home,
            priceOption: p.price_option,
            duration: p.duration,
            shortDescription: p.short_description,
            description: p.description,
            image: getPrestationImageUrl(p.image_url),
            requiresContact: p.requires_contact || false,
            hasContraindications: isCranialMassage,
            contraindications: isCranialMassage ? this.getCranialMassageContraindications() : undefined,
            forfaitSuggestion
          };
        });
        this.prestationCards = buildPrestationCards(this.prestations);
        this.loadingService.markDataLoaded();
      },
      error: () => {
        this.prestations = [];
        this.prestationCards = [];
        this.loadingService.markDataLoaded();
      }
    });

    // Charger les créations
    this.contentService.getCreations().subscribe({
      next: (data) => {
        this.creations = data.map(c => ({
          name: c.name,
          price: c.price,
          description: c.description,
          image: getCreationImageUrl(c.image_url)
        }));
        this.loadingService.markDataLoaded();
      },
      error: () => {
        this.creations = [];
        this.loadingService.markDataLoaded();
      }
    });

    this.contentService.getTestimonials().subscribe({
      next: (data) => {
        this.testimonials = data.map(t => ({
          name: t.name,
          role: t.role || '',
          text: t.text,
          avatar: t.avatar_url ? getTestimonialAvatarUrl(t.avatar_url) : `https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=f5f1e8&color=6f5f4e&size=150`,
          age: t.age,
        }));
        this.loadingService.markDataLoaded();
      },
      error: () => {
        this.testimonials = [];
        this.loadingService.markDataLoaded();
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
        this.loadingService.markDataLoaded(); // Signaler que les FAQs sont chargées
      },
      error: () => {
        this.faqs = [];
        this.isLoading = false;
        this.loadingService.markDataLoaded(); // Signaler même en cas d'erreur
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
    if (event.key !== 'Escape') {
      return;
    }
    if (this.selectedPrestation) {
      this.closeDetailsModal();
      return;
    }
    if (this.reikiSessionChoiceGroup) {
      this.closeReikiSessionChoice();
    }
  }


  // Méthode pour ouvrir la modal de détails
  openDetailsModal(prestation: Prestation | PrestationGroup, initialReikiTab?: number): void {
    this.reikiSessionChoiceGroup = null;
    this.selectedPrestation = prestation;
    this.modalInitialReikiTab =
      isPrestationGroup(prestation) && initialReikiTab !== undefined ? initialReikiTab : null;
    document.body.style.overflow = 'hidden';
  }

  // Méthode pour fermer la modal de détails
  closeDetailsModal(): void {
    this.selectedPrestation = null;
    this.modalInitialReikiTab = null;
    this.syncBodyScrollLock();
  }

  /** Réserver sur la carte Reiki : choix de variante puis réservation. */
  openReikiSessionChoice(group: PrestationGroup): void {
    this.selectedPrestation = null;
    this.modalInitialReikiTab = null;
    this.reikiSessionChoiceGroup = group;
    document.body.style.overflow = 'hidden';
  }

  closeReikiSessionChoice(): void {
    this.reikiSessionChoiceGroup = null;
    this.syncBodyScrollLock();
  }

  /** Choix dans la modale Reiki → ouverture du flux réservation avec la bonne prestation. */
  onReikiSessionChosen(prestation: Prestation): void {
    this.openBookingModal(prestation);
  }

  private syncBodyScrollLock(): void {
    document.body.style.overflow =
      this.selectedPrestation || this.selectedPrestationForBooking || this.reikiSessionChoiceGroup
        ? 'hidden'
        : '';
  }

  // Méthode pour ouvrir la modal de réservation
  openBookingModal(prestation: Prestation): void {
    if (this.selectedPrestation) {
      this.selectedPrestation = null;
      this.modalInitialReikiTab = null;
    }
    this.reikiSessionChoiceGroup = null;
    this.selectedPrestationForBooking = prestation;
    document.body.style.overflow = 'hidden';
  }

  // Fermer la modal de réservation
  closeBookingModal(): void {
    this.selectedPrestationForBooking = null;
    this.syncBodyScrollLock();
  }

  // Gérer le succès de la réservation
  onBookingSuccess(appointment: Appointment): void {
    this.closeBookingModal();
  }

  /**
   * Ouvre la modal de détails d'une prestation en recherchant par mot-clé
   */
  openPrestationByKeyword(keyword: string): void {
    const kw = keyword.toLowerCase();
    for (const item of this.prestationCards) {
      if (!isPrestationGroup(item) || item.groupKey !== 'reiki') {
        continue;
      }
      const idx = item.variants.findIndex(v => v.name.toLowerCase().includes(kw));
      if (idx >= 0) {
        this.openDetailsModal(item, idx);
        return;
      }
    }
    const prestation = this.prestations.find(p => p.name.toLowerCase().includes(kw));
    if (prestation) {
      this.openDetailsModal(prestation);
    }
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
    gsap.utils.toArray('.prestation-card, .creation-card, .testimonial-card, .forfait-card').forEach((element: any) => {
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

  /**
   * Retourne les contre-indications pour le massage crânien
   */
  private getCranialMassageContraindications(): string {
    return `⚠️ Contre-indications :

• Blessures : brûlures, coupures, plaies, ampoules
• Problèmes de peau : psoriasis, eczéma, éruptions cutanées, ecchymoses
• Conditions médicales :
  - Traumatisme cervical
  - Infarctus, AVC (moins de 3 mois)
  - Chirurgie crânienne récente (moins de 3 mois)
  - Inflammations, nausées
  - Phlébite, hémophilie, fièvre ou infections
  - Maladies contagieuses
  - Cancers (accord médical requis)
  - Troubles cardiaques, circulatoires ou nerveux
• Grossesse

En cas de doute, consultez votre médecin avant la séance.`;
  }
}
