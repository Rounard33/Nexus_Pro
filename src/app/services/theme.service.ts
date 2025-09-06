import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkMode = new BehaviorSubject<boolean>(false);
  public isDarkMode$ = this.isDarkMode.asObservable();

  constructor() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      this.setDarkMode(true);
    }
  }

  toggleTheme(): void {
    console.log('Toggling theme from', this.isDarkMode.value, 'to', !this.isDarkMode.value);
    this.setDarkMode(!this.isDarkMode.value);
  }

  setDarkMode(isDark: boolean): void {
    console.log('Setting dark mode to:', isDark);
    this.isDarkMode.next(isDark);
    
    // Remove existing theme classes
    document.documentElement.classList.remove('light', 'dark');
    
    // Add new theme class
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
    
    // Also set data-theme for backward compatibility
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    console.log('Theme class set to:', document.documentElement.className);
  }

  getCurrentTheme(): boolean {
    return this.isDarkMode.value;
  }
}
