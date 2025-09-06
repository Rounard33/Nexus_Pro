import {CommonModule} from '@angular/common';
import {Component, OnInit} from '@angular/core';
import {NavigationEnd, Router, RouterModule} from '@angular/router';
import {NavigationService} from '../../services/navigation.service';
import {ThemeToggleComponent} from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, ThemeToggleComponent],
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
    // Le scroll vers le haut sera géré automatiquement par le NavigationService
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
}
