import {HttpErrorResponse} from '@angular/common/http';
import {Injectable, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '@core/auth/auth.service';
import {ME_REPOSITORY} from '../../domain/repositories/me.repository';
import {OnboardingData, User} from '../../domain/user.entity';

/** Единая точка identity для presentation-слоя. */
@Injectable({providedIn: 'root'})
export class AuthFacade {
  private authService = inject(AuthService);
  private router = inject(Router);
  private meRepository = inject(ME_REPOSITORY);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = this.authService.currentUser;

  login(email: string, password: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  register(name: string, email: string, password: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.register(name, email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/onboarding']);
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/']));
  }

  loginWithProvider(provider: 'google' | 'kakao'): void {
    // Spring Security OAuth2: уводим на бэк, он вернёт с токенами
    window.location.href = `/oauth2/authorization/${provider}`;
  }

  completeOnboarding(data: OnboardingData): void {
    this.meRepository.completeOnboarding(data).subscribe({
      next: () => {
        const user = this.user();
        if (user) this.syncUser({...user, startLevel: data.startLevel});
        this.router.navigate(['/dashboard']);
      },
      // Онбординг не должен блокировать вход — при ошибке всё равно пускаем
      error: () => this.router.navigate(['/dashboard']),
    });
  }

  syncUser(user: User): void {
    this.authService.updateStoredUser(user);
  }

  private failAuth(error: HttpErrorResponse): void {
    this.loading.set(false);
    this.error.set(humanizeError(error));
  }
}

function humanizeError(error: HttpErrorResponse): string {
  const body = error.error as {code?: string; message?: string} | null;
  if (error.status === 401 || body?.code === 'INVALID_CREDENTIALS') return 'Неверный email или пароль';
  if (body?.code === 'EMAIL_TAKEN' || error.status === 409) return 'Такой email уже зарегистрирован';
  if (body?.code === 'VALIDATION') return 'Проверь правильность заполнения полей';
  if (error.status === 0) return 'Сервер недоступен. Попробуй позже';
  return body?.message || 'Что-то пошло не так. Попробуй ещё раз';
}
