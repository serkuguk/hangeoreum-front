import {HttpErrorResponse} from '@angular/common/http';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {jest} from '@jest/globals';
import {AuthResponse, AuthService, AuthUser} from '@core/auth/auth.service';
import {Subject, of} from 'rxjs';
import {ME_REPOSITORY} from '../../domain/repositories/me.repository';
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
    updateStoredUser: jest.Mock;
  };
  let router: {navigate: jest.Mock};

  beforeEach(() => {
    auth = {
      currentUser: signal<AuthUser | null>(null),
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn().mockReturnValue(of(null)),
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
});
