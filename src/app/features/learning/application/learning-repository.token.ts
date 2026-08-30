import {InjectionToken} from '@angular/core';
import {LearningRepository} from '../domain/repositories/learning.repository';

export const LEARNING_REPOSITORY = new InjectionToken<LearningRepository>('LearningRepository');
