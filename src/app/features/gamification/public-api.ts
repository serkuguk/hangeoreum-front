import {Provider} from '@angular/core';
import {GamificationFacade} from './application/gamification.facade';
import {GAMIFICATION_REPOSITORY} from './application/gamification-repository.token';
import {GamificationHttpRepository} from './infrastructure/gamification.http-repository';

export {GamificationFacade};

export function provideGamification(): Provider[] {
  return [{provide: GAMIFICATION_REPOSITORY, useClass: GamificationHttpRepository}, GamificationFacade];
}
