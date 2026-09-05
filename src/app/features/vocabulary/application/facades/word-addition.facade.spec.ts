import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {Subject, of, throwError} from 'rxjs';
import {UserWord} from '../../domain/entities/user-word.entity';
import {VocabularyRepository} from '../../domain/repositories/vocabulary.repository';
import {VOCABULARY_REPOSITORY} from '../vocabulary-repository.token';
import {WordAdditionFacade} from './word-addition.facade';

describe('WordAdditionFacade', () => {
  let facade: WordAdditionFacade;
  let repository: jest.Mocked<Pick<VocabularyRepository, 'addWord' | 'vocabulary'>>;

  beforeEach(() => {
    repository = {addWord: jest.fn(), vocabulary: jest.fn()};
    TestBed.configureTestingModule({
      providers: [
        WordAdditionFacade,
        {provide: VOCABULARY_REPOSITORY, useValue: repository},
      ],
    });
    facade = TestBed.inject(WordAdditionFacade);
  });

  afterEach(() => {
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('показывает saved только после успешного добавления слова и не дублирует запрос', () => {
    repository.addWord.mockReturnValue(of({} as UserWord));

    facade.addWordToVocabulary('word-1');
    facade.addWordToVocabulary('word-1');

    expect(repository.addWord).toHaveBeenCalledTimes(1);
    expect(facade.addState('word-1')).toBe('saved');
  });

  it('разрешает повторную попытку после ошибки и хранит состояние отдельно для каждого слова', () => {
    repository.addWord
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of({} as UserWord));

    facade.addWordToVocabulary('word-1');
    expect(facade.addState('word-1')).toBe('error');
    expect(facade.addState('word-2')).toBe('idle');

    facade.addWordToVocabulary('word-1');

    expect(repository.addWord).toHaveBeenCalledTimes(2);
    expect(facade.addState('word-1')).toBe('saved');
  });

  it('deduplicates pending requests and cancels them on destroy', () => {
    const pending = new Subject<UserWord>();
    repository.addWord.mockReturnValue(pending);
    facade.addWordToVocabulary('word-1');
    facade.addWordToVocabulary('word-1');
    expect(repository.addWord).toHaveBeenCalledTimes(1);
    expect(facade.addState('word-1')).toBe('saving');
    expect(pending.observed).toBe(true);
    TestBed.resetTestingModule();
    expect(pending.observed).toBe(false);
    expect(repository.vocabulary).not.toHaveBeenCalled();
  });
});
