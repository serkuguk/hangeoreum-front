import {Routes} from '@angular/router';
import {AdminApi} from './infrastructure/admin.api';
import {AdminLayoutComponent} from './presentation/layout/admin-layout.component';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    providers: [AdminApi],
    children: [
      {
        path: '',
        loadComponent: () => import('./presentation/pages/admin-metrics-page.component')
          .then(c => c.AdminMetricsPageComponent),
      },
      {
        path: 'words',
        loadComponent: () => import('./presentation/pages/admin-words-page.component')
          .then(c => c.AdminWordsPageComponent),
      },
      {
        path: 'topics',
        loadComponent: () => import('./presentation/pages/admin-topics-page.component')
          .then(c => c.AdminTopicsPageComponent),
      },
      {
        path: 'course',
        loadComponent: () => import('./presentation/pages/admin-course-page.component')
          .then(c => c.AdminCoursePageComponent),
      },
      {
        path: 'course/lessons/:id',
        loadComponent: () => import('./presentation/pages/admin-lesson-builder-page.component')
          .then(c => c.AdminLessonBuilderPageComponent),
      },
      {
        path: 'alphabet',
        loadComponent: () => import('./presentation/pages/admin-alphabet-page.component')
          .then(c => c.AdminAlphabetPageComponent),
      },
      {
        path: 'grammar',
        loadComponent: () => import('./presentation/pages/admin-grammar-page.component')
          .then(c => c.AdminGrammarPageComponent),
      },
      {
        path: 'media',
        loadComponent: () => import('./presentation/pages/admin-media-page.component')
          .then(c => c.AdminMediaPageComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./presentation/pages/admin-users-page.component')
          .then(c => c.AdminUsersPageComponent),
      },
      {
        path: 'notifications',
        loadComponent: () => import('./presentation/pages/admin-notifications-page.component')
          .then(c => c.AdminNotificationsPageComponent),
      },
    ],
  },
];
