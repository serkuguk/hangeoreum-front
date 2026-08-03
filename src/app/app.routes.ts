import {Routes} from '@angular/router';
import {adminGuard, authGuard, redirectLoggedInGuard} from '@core/auth/auth.guard';
import {MainLayoutComponent} from './layouts/main-layout/main-layout.component';
import {identityRoutes} from '@features/identity/routes';
import {settingsPendingChangesGuard} from '@features/identity/presentation/pages/settings-page/settings-pending-changes.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [redirectLoggedInGuard],
    loadComponent: () => import('@features/landing/landing-page.component').then(c => c.LandingPageComponent),
  },
  ...identityRoutes,
  {
    path: '',
    component: MainLayoutComponent,
    canMatch: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('@features/dashboard/presentation/pages/dashboard-page/dashboard-page.component')
          .then(c => c.DashboardPageComponent),
      },
      {
        path: 'learn',
        loadChildren: () => import('@features/learning/routes').then(m => m.learningRoutes),
      },
      {
        path: 'review',
        loadChildren: () => import('@features/vocabulary/routes').then(m => m.reviewRoutes),
      },
      {
        path: 'vocabulary',
        loadChildren: () => import('@features/vocabulary/routes').then(m => m.vocabularyRoutes),
      },
      {
        path: 'immerse',
        loadChildren: () => import('@features/media/routes').then(m => m.mediaRoutes),
      },
      {
        path: 'profile',
        loadComponent: () => import('@features/identity/presentation/pages/profile-page/profile-page.component')
          .then(c => c.ProfilePageComponent),
      },
      {
        path: 'settings',
        canDeactivate: [settingsPendingChangesGuard],
        loadComponent: () => import('@features/identity/presentation/pages/settings-page/settings-page.component')
          .then(c => c.SettingsPageComponent),
      },
      {
        path: 'billing',
        loadComponent: () => import('@features/billing/presentation/pricing-page/pricing-page.component')
          .then(c => c.PricingPageComponent),
      },
    ],
  },
  {
    path: 'admin',
    canMatch: [authGuard],
    canActivate: [adminGuard],
    loadChildren: () => import('@features/admin/routes').then(m => m.adminRoutes),
  },
  {
    path: '**',
    loadComponent: () => import('@features/notfound-page/notfound-page.component').then(c => c.NotfoundPageComponent),
  },
];
