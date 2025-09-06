import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {AnimatedCounterComponent} from '../../components/animated-counter/animated-counter.component';
import {AnimatedStatsComponent} from '../../components/animated-stats/animated-stats.component';
import {CtaSectionComponent} from '../../components/cta-section/cta-section.component';
import {ParticlesComponent} from '../../components/particles/particles.component';
import {PortfolioComponent} from '../../components/portfolio/portfolio.component';
import {PricingComponent} from '../../components/pricing/pricing.component';
import {TestimonialSliderComponent} from '../../components/testimonial-slider/testimonial-slider.component';
import {AnimationService} from '../../services/animation.service';
import {ParallaxService} from '../../services/parallax.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, ParticlesComponent, AnimatedCounterComponent, AnimatedStatsComponent, CtaSectionComponent, TestimonialSliderComponent, PricingComponent, PortfolioComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, AfterViewInit {
  constructor(
    private animationService: AnimationService,
    private parallaxService: ParallaxService
  ) {}

  ngOnInit(): void {
    // Initialization logic
  }

  ngAfterViewInit(): void {
    // Initialize animations after view is ready
    setTimeout(() => {
      this.initAnimations();
    }, 100);
  }

  private initAnimations(): void {
    // Initialize scroll animations
    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    scrollElements.forEach(el => {
      this.animationService.observeElement(el);
    });

    // Initialize stagger animations
    const staggerElements = document.querySelectorAll('.stagger-item');
    staggerElements.forEach(el => {
      this.animationService.observeElement(el);
    });

    // Initialize parallax elements
    const parallaxElements = document.querySelectorAll('.parallax-element');
    parallaxElements.forEach(el => {
      this.parallaxService.addParallaxElement(el);
    });
  }

  features = [
    {
      icon: 'design',
      title: 'Design Moderne',
      description: 'Des interfaces élégantes et intuitives qui captivent vos utilisateurs dès le premier regard.'
    },
    {
      icon: 'responsive',
      title: '100% Responsive',
      description: 'Parfaitement adapté à tous les écrans, de mobile à desktop, pour une expérience optimale.'
    },
    {
      icon: 'performance',
      title: 'Performance',
      description: 'Optimisé pour la vitesse et les performances, garantissant un chargement rapide.'
    },
    {
      icon: 'seo',
      title: 'SEO Optimisé',
      description: 'Structure et code optimisés pour les moteurs de recherche et un meilleur référencement.'
    },
    {
      icon: 'customizable',
      title: 'Personnalisable',
      description: 'Facilement personnalisable avec des variables CSS et des composants modulaires.'
    },
    {
      icon: 'support',
      title: 'Support 24/7',
      description: 'Documentation complète et support technique pour vous accompagner dans vos projets.'
    }
  ];

  testimonials = [
    {
      name: 'Marie Dubois',
      role: 'CEO, TechStart',
      content: 'NexusPro a transformé notre présence en ligne. Le design est magnifique et les performances exceptionnelles.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Jean Martin',
      role: 'Directeur Marketing, InnovCorp',
      content: 'Un thème professionnel et facile à personnaliser. Parfait pour nos besoins commerciaux.',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
    },
    {
      name: 'Sophie Laurent',
      role: 'Designer UX, CreativeStudio',
      content: 'La qualité du code et l\'attention aux détails sont remarquables. Je le recommande vivement.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face'
    }
  ];

  stats = [
    { number: '500+', label: 'Projets réalisés' },
    { number: '50+', label: 'Clients satisfaits' },
    { number: '99%', label: 'Taux de satisfaction' },
    { number: '24/7', label: 'Support disponible' }
  ];

  getFeatureIcon(iconType: string): string {
    const iconMap: { [key: string]: string } = {
      'design': '🎨',
      'responsive': '📱',
      'performance': '⚡',
      'seo': '🔍',
      'customizable': '⚙️',
      'support': '🛠️'
    };
    return iconMap[iconType] || '🛠️';
  }
}
