import {inject} from '@angular/core';
import {HttpErrorResponse, HttpHandlerFn, HttpInterceptorFn, HttpRequest} from '@angular/common/http';
import {Router} from '@angular/router';
import {catchError, switchMap, throwError} from 'rxjs';
import {AuthTokenStorageService} from '../services/auth-token-storage.service';
import {AuthService} from '@core/auth/auth.service';
import {PaywallService} from '@core/services/paywall.service';

const isAuthEndpoint = (url: string): boolean => url.includes('/auth/');

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const tokenStorage = inject(AuthTokenStorageService);
  const authService = inject(AuthService);
  const paywall = inject(PaywallService);
  const router = inject(Router);

  const token = tokenStorage.getToken('access_token');
  const authorized = token && !isAuthEndpoint(req.url)
    ? req.clone({setHeaders: {Authorization: `Bearer ${token}`}})
    : req;

  return next(authorized).pipe(
    catchError((err: HttpErrorResponse) => {
      // Протух access-токен → один общий refresh (httpOnly-cookie) и повтор запроса.
      if (err.status === 401 && !isAuthEndpoint(req.url)) {
        return authService.refreshAccessToken().pipe(
          switchMap(res => next(req.clone({setHeaders: {Authorization: `Bearer ${res.accessToken}`}}))),
          catchError(refreshErr => {
            router.navigate(['/auth/login']);
            return throwError(() => refreshErr);
          }),
        );
      }

      const code = (err.error as { code?: string } | null)?.code;
      if (err.status === 403 && (code === 'PRO_REQUIRED' || code === 'LIMIT_REACHED')) {
        paywall.open(code);
      }

      return throwError(() => err);
    }),
  );
};
