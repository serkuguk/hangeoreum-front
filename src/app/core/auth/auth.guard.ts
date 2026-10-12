import {inject} from '@angular/core';
import {CanActivateFn, Router} from '@angular/router';
import {AuthTokenStorageService} from '@core/services/auth-token-storage.service';
import {AuthService, UserRole} from './auth.service';
import {catchError, map, of} from 'rxjs';

export const authGuard = () => {
  const router = inject(Router);
  if (inject(AuthTokenStorageService).isAuthenticate()) return true;
  return inject(AuthService).refreshAccessToken().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/auth/login']))),
  );
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
  return role === UserRole.Admin || role === UserRole.Editor ? true : router.createUrlTree(['/dashboard']);
};

export const adminOnlyGuard: CanActivateFn = () => {
  const router = inject(Router);
  return inject(AuthTokenStorageService).decodeToken()?.role === UserRole.Admin
    ? true : router.createUrlTree(['/admin/words']);
};
