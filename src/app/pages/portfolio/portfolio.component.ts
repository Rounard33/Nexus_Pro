import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {AnimationService} from '../../services/animation.service';
import {ParallaxService} from '../../services/parallax.service';

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss'
})
export class PortfolioComponent implements OnInit, AfterViewInit {
  imageLoadedStates: { [key: number]: boolean } = {};
  
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

  selectedCategory = 'all';

  categories = [
    { id: 'all', name: 'Tous les projets' },
    { id: 'web', name: 'Développement Web' },
    { id: 'mobile', name: 'Applications Mobile' },
    { id: 'design', name: 'Design UI/UX' },
    { id: 'ecommerce', name: 'E-commerce' }
  ];

  projects = [
    {
      id: 1,
      title: 'E-commerce Moderne',
      category: 'ecommerce',
      description: 'Plateforme e-commerce complète avec panier, paiement et gestion des commandes.',
      image: 'https://via.placeholder.com/600x400/667eea/ffffff?text=E-commerce+Moderne',
      technologies: ['Angular', 'Node.js', 'MongoDB', 'Stripe'],
      link: '#',
      featured: true
    },
    {
      id: 2,
      title: 'Application Mobile Fitness',
      category: 'mobile',
      description: 'App mobile pour le suivi des entraînements et la nutrition.',
      image: 'https://via.placeholder.com/600x400/764ba2/ffffff?text=Fitness+App',
      technologies: ['React Native', 'Firebase', 'Redux'],
      link: '#',
      featured: false
    },
    {
      id: 3,
      title: 'Dashboard Analytics',
      category: 'web',
      description: 'Interface de tableau de bord pour l\'analyse de données en temps réel.',
      image: 'https://via.placeholder.com/600x400/f093fb/ffffff?text=Dashboard+Analytics',
      technologies: ['Vue.js', 'D3.js', 'Express', 'PostgreSQL'],
      link: '#',
      featured: true
    },
    {
      id: 4,
      title: 'Design System',
      category: 'design',
      description: 'Système de design complet avec composants réutilisables.',
      image: 'https://via.placeholder.com/600x400/4facfe/ffffff?text=Design+System',
      technologies: ['Figma', 'Storybook', 'CSS'],
      link: '#',
      featured: false
    },
    {
      id: 5,
      title: 'Plateforme SaaS',
      category: 'web',
      description: 'Application SaaS de gestion de projet avec collaboration en temps réel.',
      image: 'https://via.placeholder.com/600x400/00d2ff/ffffff?text=SaaS+Platform',
      technologies: ['Angular', 'Socket.io', 'Redis', 'AWS'],
      link: '#',
      featured: true
    },
    {
      id: 6,
      title: 'App de Livraison',
      category: 'mobile',
      description: 'Application mobile pour la livraison de repas avec géolocalisation.',
      image: 'https://via.placeholder.com/600x400/ff9a9e/ffffff?text=Delivery+App',
      technologies: ['Flutter', 'Google Maps', 'Firebase'],
      link: '#',
      featured: false
    }
  ];

  get filteredProjects() {
    if (this.selectedCategory === 'all') {
      return this.projects;
    }
    return this.projects.filter(project => project.category === this.selectedCategory);
  }

  get featuredProjects() {
    return this.projects.filter(project => project.featured);
  }

  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }

  onImageError(event: any, projectId: number): void {
    this.imageLoadedStates[projectId] = false;
    event.target.style.display = 'none';
  }

  isImageLoaded(projectId: number): boolean {
    return this.imageLoadedStates[projectId] !== false;
  }

  onImageLoad(projectId: number): void {
    this.imageLoadedStates[projectId] = true;
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  }
}
