import {HttpErrorResponse} from '@angular/common/http';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {jest} from '@jest/globals';
import {AuthResponse, AuthService, AuthUser} from '@core/auth/auth.service';
import {Subject, of, tap} from 'rxjs';
import {ME_REPOSITORY} from '../me-repository.token';
import {AuthFacade} from './auth.facade';

describe('AuthFacade', () => {
  const user: AuthUser = {
    id: 'user-1', name: 'Mina', email: 'mina@example.com', avatarUrl: null,
    role: 'USER', startLevel: 'BEGINNER', createdAt: '2026-07-31T00:00:00Z',
  };

  let facade: AuthFacade;
  let auth: {
    currentUser: ReturnType<typeof signal<AuthUser | null>>;
    login: jest.Mock;
    register: jest.Mock;
    logout: jest.Mock;
    requestPasswordReset: jest.Mock;
    confirmPasswordReset: jest.Mock;
    updateStoredUser: jest.Mock;
  };
  let router: {navigate: jest.Mock};

  beforeEach(() => {
    auth = {
      currentUser: signal<AuthUser | null>(null),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn().mockReturnValue(of(null)),
      requestPasswordReset: jest.fn(),
      confirmPasswordReset: jest.fn(),
      updateStoredUser: jest.fn(),
    };
    router = {navigate: jest.fn()};
    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        {provide: AuthService, useValue: auth},
        {provide: Router, useValue: router},
        {provide: ME_REPOSITORY, useValue: {completeOnboarding: jest.fn()}},
      ],
    });
    facade = TestBed.inject(AuthFacade);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('blocks duplicate login while the first request is pending', () => {
    const response$ = new Subject<AuthResponse>();
    auth.login.mockReturnValue(response$);

    facade.login('mina@example.com', 'secret');
    facade.login('mina@example.com', 'secret');

    expect(auth.login).toHaveBeenCalledTimes(1);
    expect(facade.loading()).toBe(true);

    response$.next({accessToken: 'token', user});

    expect(facade.loading()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('maps an API error and allows retrying', () => {
    const failedRequest = new Subject<AuthResponse>();
    auth.login
      .mockReturnValueOnce(failedRequest)
      .mockReturnValueOnce(of({accessToken: 'token', user}));
    facade.login('bad@example.com', 'bad');
    failedRequest.error(new HttpErrorResponse({status: 401}));

    expect(facade.error()).toBe('Неверный email или пароль');
    expect(facade.loading()).toBe(false);

    facade.login('mina@example.com', 'secret');
    expect(auth.login).toHaveBeenCalledTimes(2);
  });

  it('shows password recovery only after two credential failures', () => {
    auth.login.mockReturnValue(new Subject<AuthResponse>());

    facade.login('bad@example.com', 'bad');
    auth.login.mock.results[0].value.error(new HttpErrorResponse({
      status: 401,
      error: {code: 'INVALID_CREDENTIALS'},
    }));
    expect(facade.showPasswordRecovery()).toBe(false);

    facade.login('bad@example.com', 'bad');
    auth.login.mock.results[1].value.error(new HttpErrorResponse({
      status: 401,
      error: {code: 'INVALID_CREDENTIALS'},
    }));
    expect(facade.showPasswordRecovery()).toBe(true);
  });

  it('does not count network, validation, or unrelated 401 errors', () => {
    for (const error of [
      new HttpErrorResponse({status: 0}),
      new HttpErrorResponse({status: 400, error: {code: 'VALIDATION'}}),
      new HttpErrorResponse({status: 401, error: {code: 'TOKEN_EXPIRED'}}),
    ]) {
      const request = new Subject<AuthResponse>();
      auth.login.mockReturnValueOnce(request);
      facade.login('bad@example.com', 'bad');
      request.error(error);
    }

    expect(facade.showPasswordRecovery()).toBe(false);
  });

  it('resets credential failures for a new login page and after success', () => {
    const fail = () => {
      const request = new Subject<AuthResponse>();
      auth.login.mockReturnValueOnce(request);
      facade.login('bad@example.com', 'bad');
      request.error(new HttpErrorResponse({status: 401, error: {code: 'INVALID_CREDENTIALS'}}));
    };
    fail();
    fail();
    expect(facade.showPasswordRecovery()).toBe(true);

    facade.beginLogin();
    expect(facade.showPasswordRecovery()).toBe(false);

    fail();
    fail();
    auth.login.mockReturnValueOnce(of({accessToken: 'token', user}));
    facade.login('mina@example.com', 'secret');
    expect(facade.showPasswordRecovery()).toBe(false);
  });

  it('ignores a late failure from a destroyed login page', () => {
    const staleRequest = new Subject<AuthResponse>();
    auth.login.mockReturnValue(staleRequest);
    facade.beginLogin();
    facade.login('bad@example.com', 'bad');

    facade.endLogin();
    facade.beginLogin();
    staleRequest.error(new HttpErrorResponse({
      status: 401,
      error: {code: 'INVALID_CREDENTIALS'},
    }));

    expect(facade.showPasswordRecovery()).toBe(false);
    expect(facade.error()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('ignores a late success from a destroyed login page', () => {
    const staleRequest = new Subject<AuthResponse>();
    const sessionSideEffect = jest.fn();
    auth.login.mockReturnValue(staleRequest.pipe(tap(sessionSideEffect)));
    facade.beginLogin();
    facade.login('mina@example.com', 'secret');

    facade.endLogin();
    expect(staleRequest.observed).toBe(false);
    facade.beginLogin();
    staleRequest.next({accessToken: 'token', user});

    expect(sessionSideEffect).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalledWith(['/dashboard']);
    expect(facade.error()).toBeNull();
    expect(facade.loading()).toBe(false);
  });

  it('maps an invalid reset token and redirects after successful confirmation', () => {
    const failed = new Subject<void>();
    auth.confirmPasswordReset
      .mockReturnValueOnce(failed)
      .mockReturnValueOnce(of(undefined));

    facade.confirmPasswordReset('invalid', 'new-password');
    failed.error(new HttpErrorResponse({status: 400, error: {code: 'INVALID_RESET_TOKEN'}}));
    expect(facade.error()).toBe('Ссылка недействительна или устарела. Запроси новую.');

    facade.confirmPasswordReset('valid', 'new-password');
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login'], {state: {passwordReset: true}});
  });
});
