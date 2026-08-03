import {TestBed} from '@angular/core/testing';
import {Subject, of, throwError} from 'rxjs';
import {UserWord} from '../../domain/entities/user-word.entity';
import {VOCABULARY_REPOSITORY, VocabularyRepository} from '../../domain/repositories/vocabulary.repository';
import {VocabularyFacade} from './vocabulary.facade';

describe('VocabularyFacade', () => {
  let facade: VocabularyFacade;
  let repository: jest.Mocked<Pick<VocabularyRepository, 'addWord' | 'vocabulary'>>;

  beforeEach(() => {
    repository = {addWord: jest.fn(), vocabulary: jest.fn()};
    TestBed.configureTestingModule({
      providers: [
        VocabularyFacade,
        {provide: VOCABULARY_REPOSITORY, useValue: repository},
      ],
    });
    facade = TestBed.inject(VocabularyFacade);
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

  it('continues searching after a failed request', () => {
    jest.useFakeTimers();
    repository.vocabulary
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of({content: [], totalElements: 2, page: 0}));

    facade.search({search: 'bad'});
    jest.advanceTimersByTime(300);
    expect(facade.error()).toContain('Не получилось загрузить');

    facade.search({search: 'good'});
    jest.advanceTimersByTime(300);

    expect(repository.vocabulary).toHaveBeenCalledTimes(2);
    expect(facade.totalElements()).toBe(2);
    expect(facade.error()).toBeNull();
  });

  it('keeps only the latest search response', () => {
    jest.useFakeTimers();
    const first$ = new Subject<{content: UserWord[]; totalElements: number; page: number}>();
    const second$ = new Subject<{content: UserWord[]; totalElements: number; page: number}>();
    repository.vocabulary.mockReturnValueOnce(first$).mockReturnValueOnce(second$);

    facade.search({search: 'first'});
    jest.advanceTimersByTime(300);
    facade.search({search: 'second'});
    jest.advanceTimersByTime(300);
    second$.next({content: [], totalElements: 2, page: 0});
    first$.next({content: [], totalElements: 1, page: 0});

    expect(facade.totalElements()).toBe(2);
  });
});
