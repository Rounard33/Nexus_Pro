import {CommonModule} from '@angular/common';
import {Component} from '@angular/core';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
}

@Component({
  selector: 'app-portfolio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio.component.html',
  styleUrl: './portfolio.component.scss'
})
export class PortfolioComponent {
  selectedCategory = 'all';
  
  categories = [
    { id: 'all', name: 'Tous' },
    { id: 'web', name: 'Web' },
    { id: 'mobile', name: 'Mobile' },
    { id: 'desktop', name: 'Desktop' },
    { id: 'design', name: 'Design' }
  ];

  portfolioItems: PortfolioItem[] = [
    {
      id: '1',
      title: 'E-commerce Platform',
      category: 'web',
      description: 'Plateforme e-commerce complète avec gestion des commandes, paiements et inventaire.',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
      technologies: ['Angular', 'Node.js', 'MongoDB', 'Stripe'],
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      id: '2',
      title: 'Mobile Banking App',
      category: 'mobile',
      description: 'Application mobile de banque avec authentification biométrique et transferts sécurisés.',
      image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop',
      technologies: ['React Native', 'TypeScript', 'Firebase'],
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      id: '3',
      title: 'Dashboard Analytics',
      category: 'web',
      description: 'Tableau de bord analytique avec visualisations interactives et rapports en temps réel.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
      technologies: ['Angular', 'D3.js', 'Chart.js', 'WebSocket'],
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      id: '4',
      title: 'Desktop Music Player',
      category: 'desktop',
      description: 'Lecteur de musique desktop avec égaliseur, playlists et synchronisation cloud.',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=400&fit=crop',
      technologies: ['Electron', 'Vue.js', 'Web Audio API'],
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      id: '5',
      title: 'UI/UX Design System',
      category: 'design',
      description: 'Système de design complet avec composants, guidelines et outils de développement.',
      image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&h=400&fit=crop',
      technologies: ['Figma', 'Storybook', 'CSS', 'JavaScript'],
      liveUrl: '#',
      githubUrl: '#'
    },
    {
      id: '6',
      title: 'Real-time Chat App',
      category: 'web',
      description: 'Application de chat en temps réel avec salons privés et partage de fichiers.',
      image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=600&h=400&fit=crop',
      technologies: ['Angular', 'Socket.io', 'Express', 'Redis'],
      liveUrl: '#',
      githubUrl: '#'
    }
  ];

  get filteredItems(): PortfolioItem[] {
    if (this.selectedCategory === 'all') {
      return this.portfolioItems;
    }
    return this.portfolioItems.filter(item => item.category === this.selectedCategory);
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  openProject(item: PortfolioItem): void {
    // Ici vous pouvez ajouter la logique pour ouvrir le projet
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : categoryId;
  }
}
