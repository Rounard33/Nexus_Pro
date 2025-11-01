import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnDestroy, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {AboutComponent} from '../../components/about/about.component';
import {CtaComponent} from '../../components/cta/cta.component';
import {FaqComponent, FaqItem} from '../../components/faq/faq.component';
import {LocationComponent} from '../../components/location/location.component';
import {PrestationModalComponent} from '../../components/prestation-modal/prestation-modal.component';
import {Creation, ProductsComponent} from '../../components/products/products.component';
import {ScrollToTopComponent} from '../../components/scroll-to-top/scroll-to-top.component';
import {Prestation, ServicesComponent} from '../../components/services/services.component';
import {Testimonial, TestimonialsComponent} from '../../components/testimonials/testimonials.component';
import {WelcomeComponent} from '../../components/welcome/welcome.component';

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
    ScrollToTopComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  selectedPrestation: Prestation | null = null;

  constructor() {}

  ngOnInit() {
    // Écouter la touche Escape pour fermer la modal
    document.addEventListener('keydown', this.handleEscapeKey.bind(this));
  }

  ngAfterViewInit() {
    this.initScrollAnimations();
    
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

  // Données pour les prestations
  prestations: Prestation[] = [
    {
      name: 'Reiki Usui',
      price: '50€',
      atHome: '60€ à domicile',
      duration: 'Environ 1h15',
      shortDescription: 'Méthode de soin par apposition des mains permettant de faire circuler l\'énergie. Agit sur 3 niveaux : physique, psychologique et inconscient.',
      description: 'Autorisez-vous une pause et venez retrouver votre sérénité intérieure. Parfois nos émotions se font trop pesantes et notre corps manque de vitalité. Je vous accompagne avec l\'énergie Reiki afin de vous aider à retrouver harmonie et équilibre. Le Reiki est une méthode de soin par apposition des mains sur différentes parties du corps, permettant de faire circuler l\'énergie. L\'énergie Reiki nettoie (élimine les toxines), booste et comble les vides. Elle agit sur 3 niveaux : les maux physiques (douleurs, anciennes blessures...), psychologiques (agit sur le stress, la fatigue, la colère...) et inconscients. La séance de Reiki permet un bien-être total, une harmonisation du corps et de l\'esprit. Déroulement : scanner corporel pour connaître les trous d\'énergie dans l\'aura de la personne puis les 19 positions allant de la tête jusqu\'aux pieds.',
      image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop'
    },
    {
      name: 'Reiki à distance',
      price: '30€ (4 jours)',
      priceOption: '45€ (7 jours)',
      shortDescription: 'Envoi de Reiki à distance pour vous accompagner lors de moments importants ou lorsque vous êtes loin.',
      description: 'Pour vous accompagner dans des moments de vie particuliers ou lorsque vous êtes loin, il est possible d\'envoyer du Reiki à distance. Après une séance pour compléter un soin, ou à une personne qui est loin, ou à un moment important à venir (entretien d\'embauche, opération, passage d\'examen, etc.), l\'énergie Reiki peut vous accompagner même à distance.',
      image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop'
    },
    {
      name: 'Reiki sur les animaux',
      price: '60€',
      duration: '20 à 40 min (selon l\'animal et le besoin)',
      shortDescription: 'Soin énergétique adapté aux animaux pour réduire leur stress et soulager leurs douleurs physiques et psychologiques.',
      description: 'Nous pouvons aussi en faire profiter nos compagnons à 4 pattes. Le Reiki pourra les aider dans la gestion de leurs maux physiques et psychologiques. Les aider à réduire leur stress, se sentir mieux dans leurs pattes et soulager leurs douleurs. Animaux concernés : chiens, chats, chevaux, lapins.',
      image: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800&h=600&fit=crop'
    },
    {
      name: 'Alignement des chakras',
      price: '30€',
      atHome: '40€ à domicile',
      duration: '15 à 20 min',
      shortDescription: 'Harmonisation des centres énergétiques pour retrouver l\'équilibre et recharger vos batteries.',
      description: 'Venez recharger vos batteries et retrouver l\'harmonie dans votre corps et votre esprit. Les chakras sont les centres énergétiques de notre corps. Ils sont comme de petites roues qui tournent dans un sens et à une vitesse qui nous est propre. Parfois ils se dérèglent et cela entraîne une désharmonie dans notre corps et notre mental. L\'harmonisation des chakras permet de retrouver le bien-être, de recharger les batteries.',
      image: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=800&h=600&fit=crop'
    },
    {
      name: 'Massage crânien énergétique',
      price: '65€',
      duration: '1h30',
      shortDescription: 'Libération des tensions mentales pour retrouver l\'apaisement, le sommeil et une meilleure concentration.',
      description: 'Une invitation au lâcher-prise. Le massage crânien énergétique permet de libérer les tensions de votre mental. Il est souvent difficile de déconnecter, de réellement lâcher prise, d\'évacuer nos pensées et notre stress de la vie quotidienne. Le massage crânien énergétique est votre meilleur allié pour ça. Il permet également d\'obtenir un apaisement global, du corps et de l\'esprit, de retrouver le sommeil et d\'être plus efficace au travail en retrouvant une bonne capacité de concentration.',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop'
    },
    {
      name: 'Harmonisation des lieux de vie',
      price: '80€',
      shortDescription: 'Purification et harmonisation énergétique de votre espace de vie pour créer un environnement bienveillant.',
      description: 'Quoi de plus important que de se sentir bien chez soi ? Je propose de purifier votre lieu de vie en le nettoyant des mauvaises énergies, en augmentant son taux vibratoire (niveau d\'énergie dégagé) afin de ressentir du bien-être et enfin de le protéger des mauvaises énergies. Nettoyage au Palo Santo (le Palo Santo purifie l\'air et évacue les mauvaises énergies), nettoyage et protection de l\'espace avec l\'énergie Reiki SHK, augmentation du taux vibratoire du lieu avec le CKR.',
      image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop'
    },
    {
      name: 'PNL (Programmation NeuroLinguistique)',
      price: '50€ (1h)',
      priceOption: '60€ (1h30)',
      duration: '1h ou 1h30',
      shortDescription: 'Technique de développement personnel pour activer vos ressources et mieux gérer vos situations de vie.',
      description: 'Vous avez en vous des ressources insoupçonnées pour faire face à des situations de vie qui vous semblent difficiles. La PNL vous donne les techniques et vous aide à trouver en vous les ressources nécessaires que ce soit pour guérir d\'une situation passée ou changer ses comportements afin de mieux appréhender une situation future. Une approche de développement personnel qui s\'appuie sur la communication verbale et non verbale afin d\'aider une personne à s\'épanouir dans son environnement personnel et professionnel. Améliorer la communication, prendre de la distance avec des situations passées, améliorer la confiance en soi, activer de nouvelles ressources.',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop'
    },
    {
      name: 'Tirage de cartes',
      price: '40€',
      duration: 'Environ 1h',
      shortDescription: 'Tirage d\'oracle pour éclairer votre chemin de vie et vous aider dans vos prises de décisions importantes.',
      description: 'Les cartes ont quelque chose de magique qui attirent ou qui rendent curieux, même les plus sceptiques. Elles nous ouvrent les yeux sur ce qu\'on savait déjà, nous réconfortent, nous alertent et peuvent parfois nous aider dans nos prises de décisions. Tirage du chemin de vie avec l\'oracle : événements passés, présents ou futurs qui ont ou vont marquer votre vie et la personne que vous êtes. La personne peut également poser des questions précises (travail, vie sentimentale, vie spirituelle). Tirage avec un deuxième jeu pour comparer (autre oracle ou tarot de Marseille). Possibilité de préciser les réponses au pendule. Tarif pour 3 tirages (3 questions ou 3 jeux différents).',
      image: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=600&fit=crop'
    }
  ];

  // Données pour les créations
  creations: Creation[] = [
    {
      name: 'Petites bougies - Les Roses',
      price: '8€',
      description: 'Parfumées à la fleur de coton avec pierre de quartz rose.',
      image: 'assets/img/bougie_2.jpg'
    },
    {
      name: 'Grandes bougies',
      price: '14€',
      description: 'Pot fait main, parfumée avec pierres énergétiques.',
      image: 'assets/img/bougie_1.jpg'
    },
    {
      name: 'Bracelets énergétiques',
      price: '8€',
      description: 'Bracelets avec les pierres utilisées dans les soins énergétiques.',
      image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=600&h=600&fit=crop'
    }
  ];

  // Données pour les témoignages
  testimonials: Testimonial[] = [
    {
      name: 'Marie D.',
      role: 'Cliente',
      text: 'Je recommande vivement les séances de la couleur de l\'Aura. Une personne bienveillante et à l\'écoute. J\'ai ressenti un réel apaisement dès la première séance.',
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
  faqs: FaqItem[] = [
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
    console.log('Ouverture modal de réservation pour:', prestation.name);
    alert(`Réservation pour "${prestation.name}" - Fonctionnalité à venir avec le calendrier`);
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
