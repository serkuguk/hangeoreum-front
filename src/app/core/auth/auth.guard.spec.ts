import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {Router} from '@angular/router';
import {adminGuard, adminOnlyGuard, authGuard} from './auth.guard';
import {AuthService} from './auth.service';
import {firstValueFrom, of, throwError} from 'rxjs';
import {AuthTokenStorageService} from '@core/services/auth-token-storage.service';

describe('admin route permissions', () => {
  let role: 'ADMIN' | 'EDITOR' | 'USER';
  const router = {createUrlTree: jest.fn((segments: string[]) => segments)};
  const tokens = {decodeToken: jest.fn(() => ({role}))};

  beforeEach(() => {
    role = 'ADMIN';
    router.createUrlTree.mockClear();
    TestBed.configureTestingModule({providers: [
      {provide: Router, useValue: router},
      {provide: AuthTokenStorageService, useValue: tokens},
    ]});
  });

  afterEach(() => TestBed.resetTestingModule());

  it('admits admins and editors to the admin area', () => {
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toBe(true);
    role = 'EDITOR';
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toBe(true);
    role = 'USER';
    expect(TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never))).toEqual(['/dashboard']);
  });

  it('redirects editors away from users and metrics', () => {
    role = 'EDITOR';
    expect(TestBed.runInInjectionContext(() => adminOnlyGuard({} as never, {} as never))).toEqual(['/admin/words']);
    role = 'ADMIN';
    expect(TestBed.runInInjectionContext(() => adminOnlyGuard({} as never, {} as never))).toBe(true);
  });
});

describe('auth route session recovery', () => {
  const router = {createUrlTree: jest.fn((segments: string[]) => segments)};
  const tokens = {isAuthenticate: jest.fn()};
  const auth = {refreshAccessToken: jest.fn()};

  beforeEach(() => {
    tokens.isAuthenticate.mockReturnValue(false);
    auth.refreshAccessToken.mockReset();
    TestBed.configureTestingModule({providers: [
      {provide: Router, useValue: router},
      {provide: AuthTokenStorageService, useValue: tokens},
      {provide: AuthService, useValue: auth},
    ]});
  });

  it('allows a valid access token without refresh', () => {
    tokens.isAuthenticate.mockReturnValue(true);
    expect(TestBed.runInInjectionContext(authGuard)).toBe(true);
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
  });

  it('allows navigation after refresh', async () => {
    auth.refreshAccessToken.mockReturnValue(of({accessToken: 'fresh'}));
    const result = TestBed.runInInjectionContext(authGuard);
    expect(result).not.toBe(true);
    if (result !== true) expect(await firstValueFrom(result)).toBe(true);
  });

  it('returns login UrlTree when refresh fails', async () => {
    auth.refreshAccessToken.mockReturnValue(throwError(() => new Error('expired cookie')));
    const result = TestBed.runInInjectionContext(authGuard);
    if (result !== true) expect(await firstValueFrom(result)).toEqual(['/auth/login']);
  });
});
