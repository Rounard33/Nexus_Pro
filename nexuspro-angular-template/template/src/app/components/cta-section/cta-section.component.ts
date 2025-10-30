import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';

@Component({
  selector: 'app-cta-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cta-section.component.html',
  styleUrl: './cta-section.component.scss'
})
export class CtaSectionComponent {
  ctaData = {
    title: 'Prêt à transformer votre vision en réalité ?',
    subtitle: 'Rejoignez des centaines d\'entreprises qui nous font confiance',
    primaryButton: {
      text: 'Commencer maintenant',
      link: '/contact',
      icon: '🚀'
    },
    secondaryButton: {
      text: 'Voir nos réalisations',
      link: '/portfolio',
      icon: '✨'
    },
    features: [
      'Développement sur mesure',
      'Support 24/7',
      'Garantie de satisfaction',
      'Livraison rapide'
    ]
  };
}
