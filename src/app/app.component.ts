import {Component, OnInit, AfterViewInit} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {FooterComponent} from './components/footer/footer.component';
import {HeaderComponent} from './components/header/header.component';
import {NotificationContainerComponent} from './components/notification-container/notification-container.component';
import {LoaderComponent} from './components/loader/loader.component';
import {ThemeService} from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, NotificationContainerComponent, LoaderComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewInit {
  title = 'NexusPro';

  constructor(private themeService: ThemeService) {}

  ngOnInit(): void {
    // Force theme initialization on app start
    this.initializeTheme();
    
    // Listen for system theme changes
    this.setupThemeListener();
  }

  ngAfterViewInit(): void {
    // S'assurer que le contenu est visible une fois qu'Angular a fini de rendre
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est à jour
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.ensureContentVisible();
      }, 100);
    });
  }

  private ensureContentVisible(): void {
    // Si le loader est fermé, s'assurer que le contenu est visible
    const body = document.body;
    if (!body.classList.contains('app-loading') || body.classList.contains('app-loaded')) {
      const appLayout = document.querySelector('app-root .app-layout');
      if (appLayout) {
        const element = appLayout as HTMLElement;
        element.style.setProperty('opacity', '1', 'important');
        element.style.setProperty('visibility', 'visible', 'important');
      }
    }
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
