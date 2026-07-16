import {Routes} from '@angular/router';
import {LEARNING_REPOSITORY} from './domain/repositories/learning.repository';
import {LearningHttpRepository} from './infrastructure/learning.http-repository';
import {LearnMapFacade} from './application/facades/learn-map.facade';
import {AlphabetFacade} from './application/facades/alphabet.facade';
import {LessonFacade} from './application/facades/lesson.facade';
import {StoryFacade} from './application/facades/story.facade';
import {VOCABULARY_REPOSITORY} from '@features/vocabulary/domain/repositories/vocabulary.repository';
import {VocabularyHttpRepository} from '@features/vocabulary/infrastructure/vocabulary.http-repository';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';

export const learningRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: LEARNING_REPOSITORY, useClass: LearningHttpRepository},
      LearnMapFacade,
    ],
    children: [
      {
        path: '',
        loadComponent: () => import('./presentation/pages/learn-map-page/learn-map-page.component')
          .then(c => c.LearnMapPageComponent),
      },
      {
        path: 'alphabet',
        providers: [AlphabetFacade],
        loadComponent: () => import('./presentation/pages/alphabet-page/alphabet-page.component')
          .then(c => c.AlphabetPageComponent),
      },
      {
        path: ':id/tip',
        providers: [LessonFacade],
        loadComponent: () => import('./presentation/pages/lesson-tip-page/lesson-tip-page.component')
          .then(c => c.LessonTipPageComponent),
      },
      {
        path: ':id/story',
        providers: [
          StoryFacade,
          {provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository},
          VocabularyFacade,
        ],
        loadComponent: () => import('./presentation/pages/story-page/story-page.component')
          .then(c => c.StoryPageComponent),
      },
      {
        path: ':id',
        providers: [LessonFacade],
        loadComponent: () => import('./presentation/pages/lesson-page/lesson-page.component')
          .then(c => c.LessonPageComponent),
      },
    ],
  },
];
