import {InjectionToken} from '@angular/core';
import {VocabularyRepository} from '../domain/repositories/vocabulary.repository';

export const VOCABULARY_REPOSITORY = new InjectionToken<VocabularyRepository>('VocabularyRepository');
