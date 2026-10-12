import {TestBed} from '@angular/core/testing';
import {HttpClient, provideHttpClient, withInterceptors} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Router} from '@angular/router';
import {jest} from '@jest/globals';
import {AuthService} from '@core/auth/auth.service';
import {AuthTokenStorageService} from '@core/services/auth-token-storage.service';
import {PaywallService} from '@core/services/paywall.service';
import {of, throwError} from 'rxjs';
import {authInterceptor} from './auth.interceptor';

describe('authInterceptor retry errors', () => {
  const auth = {refreshAccessToken: jest.fn()};
  const router = {navigate: jest.fn()};
  let http: HttpTestingController;
  let client: HttpClient;
  let paywall: PaywallService;

  beforeEach(() => {
    auth.refreshAccessToken.mockReset().mockReturnValue(of({accessToken: 'fresh'}));
    router.navigate.mockReset();
    TestBed.configureTestingModule({providers: [
      provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting(),
      {provide: AuthService, useValue: auth},
      {provide: AuthTokenStorageService, useValue: {getToken: () => 'old'}},
      {provide: Router, useValue: router},
    ]});
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    paywall = TestBed.inject(PaywallService);
  });

  afterEach(() => http.verify());

  it.each(['PRO_REQUIRED', 'LIMIT_REACHED'] as const)('opens paywall on retry %s and preserves the session', code => {
    const errors: number[] = [];
    client.get('/api/v1/lesson').subscribe({error: error => errors.push(error.status)});
    http.expectOne('/api/v1/lesson').flush(null, {status: 401, statusText: 'Unauthorized'});
    const retry = http.expectOne('/api/v1/lesson');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer fresh');
    retry.flush({code}, {status: 403, statusText: 'Forbidden'});
    expect(paywall.reason()).toBe(code);
    expect(errors).toEqual([403]);
    expect(router.navigate).not.toHaveBeenCalled();
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it('propagates retry server failure without login redirect', () => {
    const errors: number[] = [];
    client.get('/api/v1/lesson').subscribe({error: error => errors.push(error.status)});
    http.expectOne('/api/v1/lesson').flush(null, {status: 401, statusText: 'Unauthorized'});
    http.expectOne('/api/v1/lesson').flush(null, {status: 500, statusText: 'Server error'});
    expect(errors).toEqual([500]);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('redirects to login only when refresh fails', () => {
    const failure = new Error('expired cookie');
    auth.refreshAccessToken.mockReturnValue(throwError(() => failure));
    const errors: unknown[] = [];
    client.get('/api/v1/lesson').subscribe({error: error => errors.push(error)});
    http.expectOne('/api/v1/lesson').flush(null, {status: 401, statusText: 'Unauthorized'});
    expect(errors).toEqual([failure]);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    http.expectNone('/api/v1/lesson');
  });
});
