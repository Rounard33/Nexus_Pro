import {inject} from '@angular/core';
import {Router, CanActivateFn} from '@angular/router';
import {AuthService} from '../services/auth.service';

export const adminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAuthenticated = await authService.isAuthenticated();

  if (!isAuthenticated) {
    router.navigate(['/admin/login'], {
      queryParams: {returnUrl: state.url}
    });
    return false;
  }

  return true;
};

