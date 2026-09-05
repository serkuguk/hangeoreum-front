import {Provider} from '@angular/core';
import {WordAdditionFacade} from './application/facades/word-addition.facade';
import {VOCABULARY_REPOSITORY} from './application/vocabulary-repository.token';
import {VocabularyHttpRepository} from './infrastructure/vocabulary.http-repository';

export {WordAdditionFacade};
export type {WordAdditionState} from './application/facades/word-addition.facade';

export function provideWordAddition(): Provider[] {
  return [{provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository}, WordAdditionFacade];
}
