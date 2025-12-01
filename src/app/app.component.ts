import {Component, OnInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {FooterComponent} from './components/footer/footer.component';
import {HeaderComponent} from './components/header/header.component';
import {NotificationContainerComponent} from './components/notification-container/notification-container.component';
import {ThemeService} from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'NexusPro';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // Force theme initialization on app start
    this.initializeTheme();
    
    // Listen for system theme changes
    this.setupThemeListener();
    
    // Marquer l'app comme chargée pour le fallback CSS
    this.markAppAsLoaded();
  }
  
  /**
   * Ajoute une classe au body pour indiquer que JS est chargé
   * Sert de fallback si les animations GSAP échouent
   */
  private markAppAsLoaded(): void {
    // Ajouter immédiatement la classe de chargement
    document.body.classList.add('app-loading');
    
    // Après un court délai, marquer comme complètement chargé
    setTimeout(() => {
      document.body.classList.remove('app-loading');
      document.body.classList.add('app-loaded');
    }, 100);
  }

  private initializeTheme(): void {
    // Use system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.applyTheme(prefersDark);
  }

  private applyTheme(isDark: boolean): void {
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add new theme class
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    
    // Set data-theme attribute
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  private setupThemeListener(): void {
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.applyTheme(e.matches);
    });
  }
}
