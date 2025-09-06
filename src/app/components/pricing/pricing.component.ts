import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  isPopular: boolean;
  buttonText: string;
  buttonVariant: 'primary' | 'outline';
}

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  plans: PricingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 29,
      period: 'mois',
      description: 'Parfait pour les projets personnels et les petits sites',
      features: [
        'Thème complet NexusPro',
        'Support par email',
        'Documentation complète',
        'Mises à jour gratuites',
        'Licence pour 1 projet',
        'Accès à la communauté'
      ],
      isPopular: false,
      buttonText: 'Commencer',
      buttonVariant: 'outline'
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 79,
      period: 'mois',
      description: 'Idéal pour les agences et développeurs professionnels',
      features: [
        'Tout du plan Starter',
        'Support prioritaire',
        'Composants premium',
        'Thèmes supplémentaires',
        'Licence pour 5 projets',
        'Formation en ligne',
        'Intégration personnalisée'
      ],
      isPopular: true,
      buttonText: 'Choisir Professional',
      buttonVariant: 'primary'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      period: 'mois',
      description: 'Solution complète pour les grandes entreprises',
      features: [
        'Tout du plan Professional',
        'Support 24/7',
        'Développement sur mesure',
        'Licence illimitée',
        'Formation sur site',
        'Développeur dédié',
        'SLA garanti'
      ],
      isPopular: false,
      buttonText: 'Nous contacter',
      buttonVariant: 'outline'
    }
  ];

  selectPlan(plan: PricingPlan): void {
    console.log('Plan sélectionné:', plan);
    // Ici vous pouvez ajouter la logique de sélection de plan
  }
}
