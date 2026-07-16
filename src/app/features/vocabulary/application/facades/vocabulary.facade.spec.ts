import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {UserWord} from '../../domain/entities/user-word.entity';
import {VOCABULARY_REPOSITORY, VocabularyRepository} from '../../domain/repositories/vocabulary.repository';
import {VocabularyFacade} from './vocabulary.facade';

describe('VocabularyFacade', () => {
  let facade: VocabularyFacade;
  let repository: jest.Mocked<Pick<VocabularyRepository, 'addWord'>>;

  beforeEach(() => {
    repository = {addWord: jest.fn()};
    TestBed.configureTestingModule({
      providers: [
        VocabularyFacade,
        {provide: VOCABULARY_REPOSITORY, useValue: repository},
      ],
    });
    facade = TestBed.inject(VocabularyFacade);
  });

  afterEach(() => TestBed.resetTestingModule());

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
});
