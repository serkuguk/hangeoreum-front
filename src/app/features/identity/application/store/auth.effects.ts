import {inject} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {Router} from '@angular/router';
import {of} from 'rxjs';
import {catchError, exhaustMap, map, tap} from 'rxjs/operators';
import {HttpErrorResponse} from '@angular/common/http';
import {AuthService} from '@core/auth/auth.service';
import {authActions} from './auth.store';

function humanizeError(err: HttpErrorResponse): string {
  const body = err.error as {code?: string; message?: string} | null;
  if (err.status === 401 || body?.code === 'INVALID_CREDENTIALS') return 'Неверный email или пароль';
  if (body?.code === 'EMAIL_TAKEN' || err.status === 409) return 'Такой email уже зарегистрирован';
  if (body?.code === 'VALIDATION') return 'Проверь правильность заполнения полей';
  if (err.status === 0) return 'Сервер недоступен. Попробуй позже';
  return body?.message || 'Что-то пошло не так. Попробуй ещё раз';
}

export const login = createEffect(
  (actions$ = inject(Actions), auth = inject(AuthService)) =>
    actions$.pipe(
      ofType(authActions.login),
      exhaustMap(({email, password}) =>
        auth.login(email, password).pipe(
          map(res => authActions.authSuccess({user: res.user, isNew: false})),
          catchError((err: HttpErrorResponse) => of(authActions.authFailure({error: humanizeError(err)}))),
        ),
      ),
    ),
  {functional: true},
);

export const register = createEffect(
  (actions$ = inject(Actions), auth = inject(AuthService)) =>
    actions$.pipe(
      ofType(authActions.register),
      exhaustMap(({name, email, password}) =>
        auth.register(name, email, password).pipe(
          map(res => authActions.authSuccess({user: res.user, isNew: true})),
          catchError((err: HttpErrorResponse) => of(authActions.authFailure({error: humanizeError(err)}))),
        ),
      ),
    ),
  {functional: true},
);

export const redirectAfterAuth = createEffect(
  (actions$ = inject(Actions), router = inject(Router)) =>
    actions$.pipe(
      ofType(authActions.authSuccess),
      tap(({isNew}) => router.navigate([isNew ? '/onboarding' : '/dashboard'])),
    ),
  {functional: true, dispatch: false},
);

export const logout = createEffect(
  (actions$ = inject(Actions), auth = inject(AuthService), router = inject(Router)) =>
    actions$.pipe(
      ofType(authActions.logout),
      exhaustMap(() =>
        auth.logout().pipe(
          tap(() => router.navigate(['/'])),
          map(() => authActions.logoutDone()),
        ),
      ),
    ),
  {functional: true},
);
