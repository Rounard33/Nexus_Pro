import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private dataLoadedSubject = new BehaviorSubject<boolean>(false);
  public dataLoaded$: Observable<boolean> = this.dataLoadedSubject.asObservable();

  private loadedDataCount = 0;
  private totalDataToLoad = 4; // prestations, creations, testimonials, faqs

  constructor() {}

  /**
   * Signale qu'une donnée a été chargée
   */
  markDataLoaded(): void {
    this.loadedDataCount++;
    if (this.loadedDataCount >= this.totalDataToLoad) {
      this.dataLoadedSubject.next(true);
    }
  }

  /**
   * Réinitialise le compteur (utile pour les rechargements)
   */
  reset(): void {
    this.loadedDataCount = 0;
    this.dataLoadedSubject.next(false);
  }

  /**
   * Force le chargement comme terminé (en cas d'erreur)
   */
  forceComplete(): void {
    this.dataLoadedSubject.next(true);
  }
}

