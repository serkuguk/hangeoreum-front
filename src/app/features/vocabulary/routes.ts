import {Routes} from '@angular/router';
import {VOCABULARY_REPOSITORY} from './domain/repositories/vocabulary.repository';
import {VocabularyHttpRepository} from './infrastructure/vocabulary.http-repository';
import {ReviewFacade} from './application/facades/review.facade';
import {GamesFacade} from './application/facades/games.facade';
import {VocabularyFacade} from './application/facades/vocabulary.facade';

export const reviewRoutes: Routes = [
  {
    path: '',
    providers: [{provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository}],
    children: [
      {
        path: '',
        providers: [ReviewFacade],
        loadComponent: () => import('./presentation/pages/review-hub-page/review-hub-page.component')
          .then(c => c.ReviewHubPageComponent),
      },
      {
        path: 'flashcards',
        providers: [ReviewFacade],
        loadComponent: () => import('./presentation/pages/flashcards-page/flashcards-page.component')
          .then(c => c.FlashcardsPageComponent),
      },
      {
        path: 'games',
        providers: [ReviewFacade, GamesFacade],
        loadComponent: () => import('./presentation/pages/games-page/games-page.component')
          .then(c => c.GamesPageComponent),
      },
    ],
  },
];

export const vocabularyRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository},
      VocabularyFacade,
    ],
    loadComponent: () => import('./presentation/pages/vocabulary-page/vocabulary-page.component')
      .then(c => c.VocabularyPageComponent),
  },
];
