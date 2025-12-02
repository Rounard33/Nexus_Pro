import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { environment } from '../../environments/environment';

/**
 * Guard qui vérifie si le mode maintenance est activé.
 * Si oui, redirige vers la page de maintenance.
 * Laisse passer les routes admin pour permettre la gestion du site.
 */
export const maintenanceGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  
  // Si le mode maintenance n'est pas activé, laisser passer
  if (!environment.maintenanceMode) {
    return true;
  }
  
  // Permettre l'accès aux routes admin même en mode maintenance
  if (state.url.startsWith('/admin')) {
    return true;
  }
  
  // Permettre l'accès à la page de maintenance elle-même
  if (state.url === '/maintenance') {
    return true;
  }
  
  // Rediriger vers la page de maintenance
  router.navigate(['/maintenance']);
  return false;
};

/**
 * Guard inverse : empêche d'accéder à la page maintenance si le mode n'est pas activé
 */
export const maintenancePageGuard: CanActivateFn = () => {
  const router = inject(Router);
  
  // Si le mode maintenance est activé, permettre l'accès à la page
  if (environment.maintenanceMode) {
    return true;
  }
  
  // Sinon, rediriger vers la page d'accueil
  router.navigate(['/home']);
  return false;
};

