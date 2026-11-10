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
  const auth = inject(AuthService);
  const dashboard = router.createUrlTree(['/dashboard']);
  if (inject(AuthTokenStorageService).isAuthenticate()) return dashboard;
  // access-токен живёт минуты, refresh-cookie — недели: вернувшегося пользователя пускаем без повторного входа.
  // Анонимных посетителей (нет сохранённого профиля) на /auth/refresh не гоняем.
  if (!auth.currentUser()) return true;
  return auth.refreshAccessToken().pipe(
    map(() => dashboard),
    catchError(() => of(true as const)),
  );
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
