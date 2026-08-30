import {InjectionToken} from '@angular/core';
import {GamificationRepository} from '../domain/gamification.model';

export const GAMIFICATION_REPOSITORY = new InjectionToken<GamificationRepository>('GamificationRepository');
