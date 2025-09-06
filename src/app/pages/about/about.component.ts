import {CommonModule} from '@angular/common';
import {AfterViewInit, Component, OnInit} from '@angular/core';
import {AnimatedStatsComponent} from '../../components/animated-stats/animated-stats.component';
import {AnimationService} from '../../services/animation.service';
import {ParallaxService} from '../../services/parallax.service';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, AnimatedStatsComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit, AfterViewInit {
  imageLoaded = true; // Par défaut, on assume que l'image se charge

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

  onImageError(event: any): void {
    this.imageLoaded = false;
    event.target.style.display = 'none';
  }

  team = [
    {
      name: 'Marie Dubois',
      role: 'Développeuse Frontend',
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face',
      description: 'Spécialiste Angular avec 5 ans d\'expérience'
    },
    {
      name: 'Jean Martin',
      role: 'Designer UX/UI',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
      description: 'Créateur d\'interfaces intuitives et élégantes'
    },
    {
      name: 'Sophie Laurent',
      role: 'Développeuse Backend',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
      description: 'Architecte de solutions robustes et scalables'
    }
  ];

  stats = [
    { number: '50+', label: 'Projets réalisés' },
    { number: '3', label: 'Années d\'expérience' },
    { number: '100%', label: 'Clients satisfaits' },
    { number: '24/7', label: 'Support technique' }
  ];
}
