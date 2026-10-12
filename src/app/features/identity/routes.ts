import {Routes} from '@angular/router';
import {authGuard, redirectLoggedInGuard} from '@core/auth/auth.guard';
import {AuthLayoutComponent} from './presentation/layout/auth-layout.component';

export const identityRoutes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [redirectLoggedInGuard],
    children: [
      {path: '', redirectTo: 'login', pathMatch: 'full'},
      {
        path: 'login',
        loadComponent: () => import('./presentation/pages/login-page/login-page.component').then(c => c.LoginPageComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./presentation/pages/register-page/register-page.component').then(c => c.RegisterPageComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./presentation/pages/forgot-password-page/forgot-password-page.component').then(c => c.ForgotPasswordPageComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./presentation/pages/reset-password-page/reset-password-page.component').then(c => c.ResetPasswordPageComponent),
      },
    ],
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./presentation/pages/onboarding-page/onboarding-page.component').then(c => c.OnboardingPageComponent),
  },
];
