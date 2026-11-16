import {HttpErrorResponse} from '@angular/common/http';
import {computed, Injectable, inject, signal} from '@angular/core';
import {Router} from '@angular/router';
import {AuthService} from '@core/auth/auth.service';
import {ME_REPOSITORY} from '../me-repository.token';
import {OnboardingData, User} from '@features/identity/domain/user.entity';
import {TranslateService} from '@ngx-translate/core';
import {Subscription} from 'rxjs';

/** Единая точка identity для presentation-слоя. */
@Injectable({providedIn: 'root'})
export class AuthFacade {
  private authService = inject(AuthService);
  private router = inject(Router);
  private meRepository = inject(ME_REPOSITORY);
  private translate = inject(TranslateService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly user = this.authService.currentUser;
  readonly passwordResetRequested = signal(false);
  /** Email, на который отправлено письмо с подтверждением и который ещё не подтверждён. */
  readonly pendingVerificationEmail = signal<string | null>(null);
  readonly verificationResent = signal(false);
  private readonly credentialFailureCount = signal(0);
  private loginSubscription: Subscription | null = null;
  private loginScope = 0;
  readonly showPasswordRecovery = computed(() => this.credentialFailureCount() >= 2);

  beginLogin(): void {
    this.cancelLogin();
    this.loading.set(false);
    this.credentialFailureCount.set(0);
    this.error.set(null);
    this.resetVerification();
  }

  beginRegistration(): void {
    this.loading.set(false);
    this.error.set(null);
    this.resetVerification();
  }

  endLogin(): void {
    this.cancelLogin();
    this.loading.set(false);
    this.error.set(null);
  }

  beginPasswordRecovery(): void {
    this.error.set(null);
    this.passwordResetRequested.set(false);
  }

  /**
   * firstLogin: вход сразу после подтверждения email — ведём на онбординг, как раньше вела регистрация.
   * Флага «онбординг пройден» на сервере нет: при входе с другого устройства он пропускается,
   * настройки остаются по умолчанию и меняются в профиле.
   */
  login(email: string, password: string, firstLogin = false): void {
    if (this.loading()) return;
    const scope = this.loginScope;
    const request = new Subscription();
    this.loginSubscription = request;
    this.loading.set(true);
    this.error.set(null);
    request.add(this.authService.login(email, password).subscribe({
      next: () => {
        if (scope !== this.loginScope) return;
        this.loginSubscription = null;
        this.loading.set(false);
        this.credentialFailureCount.set(0);
        this.router.navigate([firstLogin ? '/onboarding' : '/dashboard']);
      },
      error: (error: HttpErrorResponse) => {
        if (scope !== this.loginScope) return;
        this.loginSubscription = null;
        if (isInvalidCredentials(error)) this.credentialFailureCount.update(count => count + 1);
        if (errorCode(error) === 'EMAIL_NOT_VERIFIED') this.pendingVerificationEmail.set(email);
        this.failAuth(error);
      },
    }));
  }

  register(name: string, email: string, password: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.register(name, email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.pendingVerificationEmail.set(email);
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  resendEmailVerification(): void {
    const email = this.pendingVerificationEmail();
    if (!email || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.resendEmailVerification(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.verificationResent.set(true);
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  confirmEmail(token: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.confirmEmail(token).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/login'], {state: {emailVerified: true}});
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => this.router.navigate(['/']));
  }

  requestPasswordReset(email: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.requestPasswordReset(email).subscribe({
      next: () => {
        this.loading.set(false);
        this.passwordResetRequested.set(true);
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
  }

  confirmPasswordReset(token: string, newPassword: string): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.authService.confirmPasswordReset(token, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/auth/login'], {state: {passwordReset: true}});
      },
      error: (error: HttpErrorResponse) => this.failAuth(error),
    });
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
    this.error.set(humanizeError(error, this.translate));
  }

  private resetVerification(): void {
    this.pendingVerificationEmail.set(null);
    this.verificationResent.set(false);
  }

  private cancelLogin(): void {
    this.loginSubscription?.unsubscribe();
    this.loginSubscription = null;
    this.loginScope++;
  }
}

function humanizeError(error: HttpErrorResponse, translate: TranslateService): string {
  const body = error.error as {code?: string; message?: string} | null;
  if (body?.code === 'EMAIL_NOT_VERIFIED') return translate.instant('identity.errors.emailNotVerified');
  if (body?.code === 'INVALID_VERIFICATION_TOKEN') return translate.instant('identity.verifyEmail.invalidToken');
  if (error.status === 401 || body?.code === 'INVALID_CREDENTIALS') return translate.instant('identity.errors.invalidCredentials');
  if (body?.code === 'INVALID_RESET_TOKEN') return translate.instant('identity.passwordReset.invalidToken');
  if (body?.code === 'EMAIL_TAKEN' || error.status === 409) return translate.instant('identity.errors.emailTaken');
  if (body?.code === 'VALIDATION') return translate.instant('identity.errors.validation');
  if (error.status === 429) return translate.instant('identity.errors.tooManyAttempts');
  if (error.status === 0) return translate.instant('common.errors.serverUnavailable');
  return body?.message || translate.instant('common.errors.generic');
}

function isInvalidCredentials(error: HttpErrorResponse): boolean {
  return error.status === 401 && errorCode(error) === 'INVALID_CREDENTIALS';
}

function errorCode(error: HttpErrorResponse): string | undefined {
  return (error.error as {code?: string} | null)?.code;
}
