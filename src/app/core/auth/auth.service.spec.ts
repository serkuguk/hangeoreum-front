import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {JwtHelperService} from '@auth0/angular-jwt';
import {AuthService} from './auth.service';
import {AuthTokenStorageService} from '@core/services/auth-token-storage.service';
import {ENV} from '@core/tokens/environment.token';

const user = {
  id: 'u1', name: 'Тест', email: 't@t.t', avatarUrl: null,
  role: 'USER' as const, startLevel: 'BEGINNER', createdAt: '2026-01-01T00:00:00Z',
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: ENV, useValue: {production: false, server_url: '/api/v1'}},
        {provide: JwtHelperService, useValue: new JwtHelperService()},
        AuthTokenStorageService,
        AuthService,
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login сохраняет access-токен и пользователя, шлёт withCredentials', () => {
    service.login('t@t.t', 'password').subscribe();
    const req = http.expectOne('/api/v1/auth/login');
    expect(req.request.withCredentials).toBe(true);
    req.flush({accessToken: 'jwt-token', user});

    expect(localStorage.getItem('access_token')).toBe('jwt-token');
    expect(service.currentUser()?.email).toBe('t@t.t');
  });

  it('refresh — один in-flight запрос на параллельные вызовы', () => {
    service.refreshAccessToken().subscribe();
    service.refreshAccessToken().subscribe();
    const requests = http.match('/api/v1/auth/refresh');
    expect(requests.length).toBe(1);
    requests[0].flush({accessToken: 'new-token', user});
    expect(localStorage.getItem('access_token')).toBe('new-token');
  });

  it('провал refresh чистит сессию', () => {
    localStorage.setItem('access_token', 'old');
    service.refreshAccessToken().subscribe({error: () => {}});
    http.expectOne('/api/v1/auth/refresh').flush(null, {status: 401, statusText: 'Unauthorized'});
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });
});
