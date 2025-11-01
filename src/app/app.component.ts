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
  }

  private initializeTheme(): void {
    // Check for saved theme preference or default to system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Apply theme immediately
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.applyTheme(true);
    } else {
      this.applyTheme(false);
    }
  }

  private applyTheme(isDark: boolean): void {
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add new theme class
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    
    // Set data-theme attribute
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // Save to localStorage
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  private setupThemeListener(): void {
    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      // Only auto-switch if no theme preference is saved
      if (!localStorage.getItem('theme')) {
        this.applyTheme(e.matches);
      }
    });
  }
}
