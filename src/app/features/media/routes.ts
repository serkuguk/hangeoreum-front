import {provideWordAddition} from '../vocabulary/public-api';
import {Routes} from '@angular/router';
import {CLIP_REPOSITORY} from './application/clip-repository.token';
import {ClipHttpRepository} from './infrastructure/clip.http-repository';
import {ImmerseFacade} from './application/immerse.facade';

export const mediaRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: CLIP_REPOSITORY, useClass: ClipHttpRepository},
      ImmerseFacade,
      ...provideWordAddition(),
    ],
    loadComponent: () => import('./presentation/pages/immerse-page/immerse-page.component')
      .then(c => c.ImmersePageComponent),
  },
];
