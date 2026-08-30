import {InjectionToken} from '@angular/core';
import {MeRepository} from '../domain/repositories/me.repository';

export const ME_REPOSITORY = new InjectionToken<MeRepository>('MeRepository');
