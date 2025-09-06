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
      avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMF8xKSIvPgo8Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIyMCIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC45Ii8+CjxyZWN0IHg9IjUwIiB5PSI5MCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzBfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iMTUwIiB5Mj0iMTUwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM2NjdlZWEiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNzY0YmEyIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
    },
    {
      name: 'Jean Martin',
      role: 'Directeur Marketing, InnovCorp',
      content: 'Un thème professionnel et facile à personnaliser. Parfait pour nos besoins commerciaux.',
      avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMF8xKSIvPgo8Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIyMCIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC45Ii8+CjxyZWN0IHg9IjUwIiB5PSI5MCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzBfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iMTUwIiB5Mj0iMTUwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiM3NjRiYTIiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjZjA5M2ZiIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
    },
    {
      name: 'Sophie Laurent',
      role: 'Designer UX, CreativeStudio',
      content: 'La qualité du code et l\'attention aux détails sont remarquables. Je le recommande vivement.',
      avatar: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTUwIiBmaWxsPSJ1cmwoI3BhaW50MF9saW5lYXJfMF8xKSIvPgo8Y2lyY2xlIGN4PSI3NSIgY3k9IjYwIiByPSIyMCIgZmlsbD0id2hpdGUiIGZpbGwtb3BhY2l0eT0iMC45Ii8+CjxyZWN0IHg9IjUwIiB5PSI5MCIgd2lkdGg9IjUwIiBoZWlnaHQ9IjIwIiByeD0iMTAiIGZpbGw9IndoaXRlIiBmaWxsLW9wYWNpdHk9IjAuOSIvPgo8ZGVmcz4KPGxpbmVhckdyYWRpZW50IGlkPSJwYWludDBfbGluZWFyXzBfMSIgeDE9IjAiIHkxPSIwIiB4Mj0iMTUwIiB5Mj0iMTUwIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+CjxzdG9wIHN0b3AtY29sb3I9IiNmMDkzZmIiLz4KPHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjNGZhY2ZlIi8+CjwvbGluZWFyR3JhZGllbnQ+CjwvZGVmcz4KPC9zdmc+Cg=='
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
