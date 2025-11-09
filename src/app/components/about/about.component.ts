import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {RouterModule} from '@angular/router';
import {AboutContent, ContentService} from '../../services/content.service';
import {getAboutImageUrl} from '../../utils/supabase-storage.utils';
import {SectionHeaderComponent} from '../section-header/section-header.component';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterModule, SectionHeaderComponent],
  templateUrl: './about.component.html',
  styleUrl: './about.component.scss'
})
export class AboutComponent implements OnInit {
  aboutContent: AboutContent[] = [];
  isLoading = true;

  constructor(private contentService: ContentService) {}

  ngOnInit() {
    this.contentService.getAboutContent().subscribe({
      next: (data) => {
        // Trier par display_order
        this.aboutContent = data.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du contenu About:', error);
        this.aboutContent = [];
        this.isLoading = false;
      }
    });
  }

  getAboutImage(): string {
    // Récupérer l'image du premier élément ou utiliser l'image par défaut
    const imageUrl = this.aboutContent.find(item => item.image_url)?.image_url;
    if (imageUrl) {
      return getAboutImageUrl(imageUrl);
    }
    return 'assets/img/pauline.jpg';
  }
}
