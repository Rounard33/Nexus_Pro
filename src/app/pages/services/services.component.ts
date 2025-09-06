import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {AnimationService} from '../../services/animation.service';
import {ParallaxService} from '../../services/parallax.service';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './services.component.html',
  styleUrl: './services.component.scss'
})
export class ServicesComponent implements OnInit, AfterViewInit {
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
  }

  services = [
    {
      icon: '💻',
      title: 'Développement Web',
      description: 'Création de sites web modernes et performants avec les dernières technologies.',
      features: ['Angular', 'React', 'Vue.js', 'Node.js', 'TypeScript'],
      price: 'À partir de 2000€'
    },
    {
      icon: '📱',
      title: 'Applications Mobile',
      description: 'Développement d\'applications mobiles natives et cross-platform.',
      features: ['React Native', 'Flutter', 'Ionic', 'iOS', 'Android'],
      price: 'À partir de 5000€'
    },
    {
      icon: '🎨',
      title: 'Design UX/UI',
      description: 'Conception d\'interfaces utilisateur intuitives et esthétiques.',
      features: ['Figma', 'Adobe XD', 'Sketch', 'Prototypage', 'User Research'],
      price: 'À partir de 1500€'
    },
    {
      icon: '⚡',
      title: 'Optimisation SEO',
      description: 'Amélioration du référencement et des performances de votre site.',
      features: ['Audit SEO', 'Optimisation', 'Analytics', 'Google Ads', 'Content Marketing'],
      price: 'À partir de 800€'
    },
    {
      icon: '🔧',
      title: 'Maintenance',
      description: 'Support technique et maintenance continue de vos applications.',
      features: ['Support 24/7', 'Mises à jour', 'Monitoring', 'Backup', 'Sécurité'],
      price: 'À partir de 300€/mois'
    },
    {
      icon: '☁️',
      title: 'Hébergement Cloud',
      description: 'Solutions d\'hébergement sécurisées et scalables.',
      features: ['AWS', 'Google Cloud', 'Azure', 'CDN', 'SSL'],
      price: 'À partir de 50€/mois'
    }
  ];

  process = [
    {
      step: '01',
      title: 'Analyse',
      description: 'Nous analysons vos besoins et définissons les objectifs du projet.'
    },
    {
      step: '02',
      title: 'Conception',
      description: 'Création des maquettes et de l\'architecture technique.'
    },
    {
      step: '03',
      title: 'Développement',
      description: 'Développement itératif avec des tests réguliers.'
    },
    {
      step: '04',
      title: 'Déploiement',
      description: 'Mise en production et formation de votre équipe.'
    }
  ];
}
