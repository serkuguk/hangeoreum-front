import {Routes} from '@angular/router';
import {LEARNING_REPOSITORY} from './domain/repositories/learning.repository';
import {LearningHttpRepository} from './infrastructure/learning.http-repository';
import {LearnMapFacade} from './application/facades/learn-map.facade';
import {AlphabetFacade} from './application/facades/alphabet.facade';
import {LessonFacade} from './application/facades/lesson.facade';

export const learningRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: LEARNING_REPOSITORY, useClass: LearningHttpRepository},
      LearnMapFacade,
      AlphabetFacade,
      LessonFacade,
    ],
    children: [
      {
        path: '',
        loadComponent: () => import('./presentation/pages/learn-map-page/learn-map-page.component')
          .then(c => c.LearnMapPageComponent),
      },
      {
        path: 'alphabet',
        loadComponent: () => import('./presentation/pages/alphabet-page/alphabet-page.component')
          .then(c => c.AlphabetPageComponent),
      },
      {
        path: ':id/tip',
        loadComponent: () => import('./presentation/pages/lesson-tip-page/lesson-tip-page.component')
          .then(c => c.LessonTipPageComponent),
      },
      {
        path: ':id/story',
        loadComponent: () => import('./presentation/pages/story-page/story-page.component')
          .then(c => c.StoryPageComponent),
      },
      {
        path: ':id',
        loadComponent: () => import('./presentation/pages/lesson-page/lesson-page.component')
          .then(c => c.LessonPageComponent),
      },
    ],
  },
];
