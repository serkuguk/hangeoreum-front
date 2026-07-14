import {HttpClient} from "@angular/common/http";
import {Injectable, inject, signal} from "@angular/core";
import {Observable, of, shareReplay, tap} from "rxjs";
import {catchError, finalize} from "rxjs/operators";
import {AuthTokenStorageService} from "@core/services/auth-token-storage.service";
import {EnvironmentInterface} from "@core/interfaces/environment.interface";
import {ENV} from "@core/tokens/environment.token";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  startLevel: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

const USER_KEY = 'auth_user';

/**
 * Auth против coreano-api: access-токен в localStorage,
 * refresh — httpOnly-cookie (path /api/v1/auth), поэтому все auth-запросы с withCredentials.
 */
@Injectable()
export class AuthService {
  private http = inject(HttpClient);
  private tokenStorage = inject(AuthTokenStorageService);
  private env = inject<EnvironmentInterface>(ENV);
  private base = `${this.env.server_url}/auth`;

  readonly currentUser = signal<AuthUser | null>(readStoredUser());

  private refreshInFlight$: Observable<AuthResponse> | null = null;

  public login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, {email, password}, {withCredentials: true})
      .pipe(tap(res => this.saveSession(res)));
  }

  public register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, {name, email, password}, {withCredentials: true})
      .pipe(tap(res => this.saveSession(res)));
  }

  /** Единственный in-flight refresh на всё приложение (interceptor + guards). */
  public refreshAccessToken(): Observable<AuthResponse> {
    if (!this.refreshInFlight$) {
      this.refreshInFlight$ = this.http.post<AuthResponse>(`${this.base}/refresh`, null, {withCredentials: true})
        .pipe(
          tap(res => this.saveSession(res)),
          catchError(err => {
            this.clearSession();
            throw err;
          }),
          finalize(() => this.refreshInFlight$ = null),
          shareReplay(1),
        );
    }
    return this.refreshInFlight$;
  }

  public logout(): Observable<unknown> {
    return this.http.post(`${this.base}/logout`, null, {withCredentials: true}).pipe(
      catchError(() => of(null)),
      tap(() => this.clearSession()),
    );
  }

  public get isAuth(): boolean {
    return this.tokenStorage.isAuthenticate();
  }

  public updateStoredUser(user: AuthUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  private saveSession(res: AuthResponse): void {
    this.tokenStorage.setToken(res.accessToken);
    this.updateStoredUser(res.user);
  }

  private clearSession(): void {
    this.tokenStorage.logOut();
    this.currentUser.set(null);
  }
}

function readStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) as AuthUser : null;
  } catch {
    return null;
  }
}
