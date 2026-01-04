import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DOCUMENT } from '@angular/common';
import { Inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrl: './loader.component.scss'
})
export class LoaderComponent implements OnInit, AfterViewInit, OnDestroy {
  isLoading = true;
  private timeoutId?: number;
  private hideLoaderTimeoutId?: number;
  private destroy$ = new Subject<void>();
  private minDisplayTime = 1500; // Temps minimum d'affichage du loader (1.5 secondes)
  private startTime = Date.now();

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private loadingService: LoadingService
  ) {}

  ngOnInit(): void {
    this.startTime = Date.now();
    
    // Écouter le service de chargement pour savoir quand les données sont prêtes
    this.loadingService.dataLoaded$.pipe(
      takeUntil(this.destroy$)
    ).subscribe((dataLoaded) => {
      if (dataLoaded) {
        this.hideLoaderWhenReady();
      }
    });
    
    // Timeout de sécurité (max 8 secondes)
    this.timeoutId = window.setTimeout(() => {
      this.hideLoader();
    }, 8000);
  }

  ngAfterViewInit(): void {
    // Vérifier que le contenu de base est rendu (welcome)
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Le welcome doit être visible
        const welcomeSection = this.document.querySelector('app-welcome');
        if (welcomeSection) {
          const element = welcomeSection as HTMLElement;
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
        }
      }, 100);
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    if (this.hideLoaderTimeoutId) {
      clearTimeout(this.hideLoaderTimeoutId);
    }
  }

  private hideLoaderWhenReady(): void {
    // S'assurer que le loader s'affiche au moins le temps minimum
    const elapsed = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.minDisplayTime - elapsed);
    
    this.hideLoaderTimeoutId = window.setTimeout(() => {
      this.hideLoader();
    }, remainingTime);
  }

  private hideLoader(): void {
    if (!this.isLoading) return; // Éviter les appels multiples
    
    this.isLoading = false;
    
    // Révéler le contenu immédiatement - d'abord retirer app-loading puis ajouter app-loaded
    this.document.body.classList.remove('app-loading');
    
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est à jour
    requestAnimationFrame(() => {
      this.document.body.classList.add('app-loaded');
      
      // Forcer l'affichage du contenu avec plusieurs méthodes
      const revealContent = () => {
        const appLayout = this.document.querySelector('app-root .app-layout');
        if (appLayout) {
          const element = appLayout as HTMLElement;
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
          element.style.removeProperty('display');
        }
        
        // Forcer aussi les éléments enfants (welcome, etc.)
        const allSections = this.document.querySelectorAll('app-welcome, app-about, app-services');
        allSections.forEach((section) => {
          const element = section as HTMLElement;
          element.style.setProperty('opacity', '1', 'important');
          element.style.setProperty('visibility', 'visible', 'important');
        });
      };
      
      // Révéler immédiatement
      revealContent();
      
      // Et après un court délai pour être sûr
      setTimeout(() => {
        revealContent();
        // Double vérification après la transition
        setTimeout(revealContent, 300);
      }, 100);
    });
  }
}

