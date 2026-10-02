import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {Router} from '@angular/router';
import {adminGuard, adminOnlyGuard} from './auth.guard';
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
