import {Routes} from '@angular/router';
import {CLIP_REPOSITORY} from './domain/clip.entity';
import {ClipHttpRepository} from './infrastructure/clip.http-repository';
import {ImmerseFacade} from './application/immerse.facade';

export const mediaRoutes: Routes = [
  {
    path: '',
    providers: [
      {provide: CLIP_REPOSITORY, useClass: ClipHttpRepository},
      ImmerseFacade,
    ],
    loadComponent: () => import('./presentation/pages/immerse-page/immerse-page.component')
      .then(c => c.ImmersePageComponent),
  },
];
