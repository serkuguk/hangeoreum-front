import {Injectable, inject} from '@angular/core';
import {Store} from '@ngrx/store';
import {Router} from '@angular/router';
import {AuthService} from '@core/auth/auth.service';
import {ME_REPOSITORY} from '../../domain/repositories/me.repository';
import {OnboardingData, User} from '../../domain/user.entity';
import {authActions, authFeature} from '../store/auth.store';

/** Единая точка identity для presentation-слоя. */
@Injectable({providedIn: 'root'})
export class AuthFacade {
  private store = inject(Store);
  private authService = inject(AuthService);
  private router = inject(Router);
  private meRepository = inject(ME_REPOSITORY);

  readonly loading = this.store.selectSignal(authFeature.selectLoading);
  readonly error = this.store.selectSignal(authFeature.selectError);
  /** Пользователь: из стора после login, иначе восстановленная сессия из localStorage. */
  readonly user = this.authService.currentUser;

  login(email: string, password: string): void {
    this.store.dispatch(authActions.login({email, password}));
  }

  register(name: string, email: string, password: string): void {
    this.store.dispatch(authActions.register({name, email, password}));
  }

  logout(): void {
    this.store.dispatch(authActions.logout());
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
    this.store.dispatch(authActions.userUpdated({user}));
  }
}
