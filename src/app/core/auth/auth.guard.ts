import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthTokenStorageService} from '@core/services/auth-token-storage.service';

export const authGuard = () => {
  const router = inject(Router);
  return inject(AuthTokenStorageService).isAuthenticate()
    ? true
    : router.createUrlTree(['/auth/login']);
};

export const redirectLoggedInGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthTokenStorageService).isAuthenticate()
    ? router.createUrlTree(['/dashboard'])
    : true;
};

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const role = inject(AuthTokenStorageService).decodeToken()?.role;
  return role === 'ADMIN' ? true : router.createUrlTree(['/dashboard']);
};
