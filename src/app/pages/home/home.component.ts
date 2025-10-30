import {CommonModule} from '@angular/common';
import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('heroTitle') heroTitle!: ElementRef;
  @ViewChild('heroDescription') heroDescription!: ElementRef;
  @ViewChild('heroActions') heroActions!: ElementRef;

  showScrollTopButton = false;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    // Initialisation des animations au chargement
    // Écoute du scroll pour afficher/masquer le bouton
    window.addEventListener('scroll', this.onWindowScroll.bind(this));
    // Vérifier la position au chargement initial
    this.onWindowScroll();
  }

  ngAfterViewInit() {
    this.initHeroAnimations();
    this.initScrollAnimations();
  }

  ngOnDestroy() {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    window.removeEventListener('scroll', this.onWindowScroll.bind(this));
  }

  /**
   * Gère l'affichage du bouton scroll to top selon la position du scroll
   */
  private onWindowScroll(): void {
    const scrollPosition = window.pageYOffset || document.documentElement.scrollTop;
    const shouldShow = scrollPosition > 300;
    if (this.showScrollTopButton !== shouldShow) {
      this.showScrollTopButton = shouldShow;
      this.cdr.detectChanges(); // Force la détection de changement pour les événements hors zone Angular
    }
  }

  /**
   * Remonte en haut de la page avec un scroll smooth
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // Données pour les prestations
  prestations = [
    {
      name: 'Séance de Reiki Usui',
      price: '60€',
      description: 'Une séance complète de Reiki Usui pour harmoniser votre énergie et retrouver la sérénité. Séance d\'environ 60 minutes.',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop'
    },
    {
      name: 'Séance de Reiki à distance',
      price: '50€',
      description: 'Bénéficiez des bienfaits du Reiki depuis votre domicile. Une séance énergétique à distance adaptée à vos besoins.',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'
    },
    {
      name: 'Séance de Reiki enfant',
      price: '40€',
      description: 'Une approche douce et adaptée pour les enfants. Séance plus courte et ludique pour aider votre enfant à se détendre.',
      image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop'
    },
    {
      name: 'Soin Reiki approfondi',
      price: '80€',
      description: 'Une séance intensive et complète de Reiki pour un travail en profondeur sur vos blocages énergétiques. Durée: 90 minutes.',
      image: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&h=600&fit=crop'
    }
  ];

  // Données pour les créations
  creations = [
    {
      name: 'Bougies parfumées',
      price: '15€',
      description: 'Bougies artisanales aux senteurs apaisantes, fabriquées à la main avec des produits naturels.',
      image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&h=600&fit=crop'
    },
    {
      name: 'Encens naturels',
      price: '12€',
      description: 'Sticks d\'encens 100% naturels aux essences choisies pour leur vertus apaisantes et purifiantes.',
      image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&h=600&fit=crop'
    },
    {
      name: 'Pochons de relaxation',
      price: '18€',
      description: 'Petits pochons en tissu naturel remplis de plantes séchées pour favoriser la détente et le sommeil.',
      image: 'https://images.unsplash.com/photo-1600224219102-611363f4170e?w=600&h=600&fit=crop'
    }
  ];

  // Données pour les témoignages
  testimonials = [
    {
      name: 'Marie D.',
      role: 'Cliente',
      text: 'Je recommande vivement les séances de Reiki avec Pauline. Une personne bienveillante et à l\'écoute. J\'ai ressenti un réel apaisement dès la première séance.',
      avatar: 'https://ui-avatars.com/api/?name=Marie+D&background=f5f1e8&color=6f5f4e&size=150'
    },
    {
      name: 'Sophie L.',
      role: 'Cliente',
      text: 'Excellente praticienne ! Les séances m\'ont permis de mieux gérer mon stress et de retrouver un équilibre au quotidien. L\'environnement est vraiment apaisant.',
      avatar: 'https://ui-avatars.com/api/?name=Sophie+L&background=f5f1e8&color=6f5f4e&size=150'
    },
    {
      name: 'Claire M.',
      role: 'Cliente',
      text: 'Ma fille de 8 ans a beaucoup apprécié sa séance de Reiki. Pauline a su s\'adapter avec douceur. Merci pour cette approche bienveillante envers les enfants.',
      avatar: 'https://ui-avatars.com/api/?name=Claire+M&background=f5f1e8&color=6f5f4e&size=150'
    }
  ];

  // Données pour la FAQ
  faqs = [
    {
      question: 'Qu\'est-ce que le Reiki ?',
      answer: 'Le Reiki est une méthode de guérison énergétique d\'origine japonaise qui vise à harmoniser le corps et l\'esprit par l\'apposition des mains. Il favorise la détente et aide à libérer les blocages énergétiques.',
      isOpen: false
    },
    {
      question: 'Comment se déroule une séance ?',
      answer: 'Une séance de Reiki dure généralement entre 60 et 90 minutes. Vous restez habillé et allongé sur une table de massage. Le praticien pose délicatement ses mains sur différentes parties du corps pour transmettre l\'énergie Reiki.',
      isOpen: false
    },
    {
      question: 'Le Reiki est-il douloureux ?',
      answer: 'Non, le Reiki est une pratique douce et non invasive. Il n\'y a pas de manipulation, juste un toucher léger qui transmet l\'énergie. La plupart des personnes ressentent une profonde détente.',
      isOpen: false
    },
    {
      question: 'Combien de séances sont nécessaires ?',
      answer: 'Cela dépend de vos besoins et de vos objectifs. Certaines personnes ressentent un bienfait dès la première séance, d\'autres préfèrent un suivi régulier. Nous pouvons discuter ensemble de ce qui vous convient le mieux.',
      isOpen: false
    },
    {
      question: 'Le Reiki peut-il remplacer la médecine traditionnelle ?',
      answer: 'Le Reiki est une pratique complémentaire qui ne remplace pas la médecine conventionnelle. Il peut être utilisé en complément pour favoriser le bien-être et la détente.',
      isOpen: false
    },
    {
      question: 'Comment réserver une séance ?',
      answer: 'Vous pouvez réserver directement en ligne en cliquant sur "Réserver un créneau" sur la prestation qui vous intéresse. Je vous confirmerai ensuite la réservation par email.',
      isOpen: false
    }
  ];

  // Méthode pour ouvrir la modal de réservation
  openBookingModal(prestation: any): void {
    // TODO: Implémenter l'ouverture de la modal avec le calendrier
    console.log('Ouverture modal de réservation pour:', prestation.name);
    // Cette fonctionnalité sera implémentée avec FullCalendar plus tard
    alert(`Réservation pour "${prestation.name}" - Fonctionnalité à venir avec le calendrier`);
  }

  // Méthode pour toggle FAQ
  toggleFaq(index: number): void {
    this.faqs[index].isOpen = !this.faqs[index].isOpen;
  }

  // Méthode pour gérer les erreurs d'image
  onImageError(event: any, name: string): void {
    event.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f5f1e8&color=6f5f4e&size=150`;
  }

  /**
   * Effectue un scroll smooth vers une section de la page
   * @param sectionId L'ID de la section vers laquelle scroll
   * @param event L'événement de clic (optionnel)
   */
  scrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }

    const element = document.getElementById(sectionId);
    if (element) {
      // Calcule la position de l'élément en tenant compte du header fixe
      const headerHeight = 80;
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }

  private initHeroAnimations() {
    if (!this.heroTitle || !this.heroDescription || !this.heroActions) return;

    const tl = gsap.timeline({ delay: 0.5 });
    
    // Animation du badge
    tl.from('.hero-badge', {
      duration: 0.8,
      y: -30,
      opacity: 0,
      ease: "power2.out"
    });

    // Animation du titre
    tl.from(this.heroTitle.nativeElement.querySelectorAll('.title-line'), {
      duration: 1.2,
      y: 50,
      opacity: 0,
      ease: "power3.out",
      stagger: 0.2
    }, "-=0.4");

    // Animation de la description
    tl.from(this.heroDescription.nativeElement, {
      duration: 1,
      y: 30,
      opacity: 0,
      ease: "power2.out"
    }, "-=0.6");

    // Animation des boutons
    tl.from(this.heroActions.nativeElement, {
      duration: 0.8,
      y: 30,
      opacity: 0,
      ease: "power2.out"
    }, "-=0.4");
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
