import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {NavigationService} from '../../services/navigation.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
  isMenuOpen = false;
  currentRoute = '';

  constructor(
    private navigationService: NavigationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentRoute = event.url;
      }
    });
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  onNavClick() {
    this.closeMenu();
  }

  onPortfolioClick() {
    this.closeMenu();
    // Navigation normale vers la page portfolio
  }

  isActiveRoute(route: string): boolean {
    if (route === '/home') {
      return this.currentRoute === '/home' || this.currentRoute === '/';
    }
    return this.currentRoute === route;
  }

  /**
   * Effectue un scroll smooth vers une section de la page
   * @param sectionId L'ID de la section vers laquelle scroll (ex: 'home', 'about', 'prestations')
   */
  smoothScrollToSection(sectionId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    this.closeMenu();

    // Si on est déjà sur la page home, on scroll directement
    if (this.currentRoute === '/home' || this.currentRoute === '/') {
      this.scrollToElement(sectionId);
    } else {
      // Sinon, on navigue d'abord vers home puis on scroll
      this.router.navigate(['/home']).then(() => {
        // Petit délai pour s'assurer que la page est chargée
        setTimeout(() => {
          this.scrollToElement(sectionId);
        }, 100);
      });
    }
  }

  /**
   * Scroll vers un élément spécifique de la page
   * @param elementId L'ID de l'élément
   */
  private scrollToElement(elementId: string): void {
    const element = document.getElementById(elementId);
    if (element) {
      // Calcule la position de l'élément en tenant compte du header fixe
      const headerHeight = 80; // Hauteur approximative du header
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  }
}
