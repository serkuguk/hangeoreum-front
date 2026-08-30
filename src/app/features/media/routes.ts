import {Routes} from '@angular/router';
import {CLIP_REPOSITORY} from './application/clip-repository.token';
import {ClipHttpRepository} from './infrastructure/clip.http-repository';
import {ImmerseFacade} from './application/immerse.facade';
import {VOCABULARY_REPOSITORY} from '../vocabulary/application/vocabulary-repository.token';
import {VocabularyFacade} from '../vocabulary/application/facades/vocabulary.facade';
import {VocabularyHttpRepository} from '../vocabulary/infrastructure/vocabulary.http-repository';

export const mediaRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: CLIP_REPOSITORY, useClass: ClipHttpRepository},
      ImmerseFacade,
      {provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository},
      VocabularyFacade,
    ],
    loadComponent: () => import('./presentation/pages/immerse-page/immerse-page.component')
      .then(c => c.ImmersePageComponent),
  },
];
