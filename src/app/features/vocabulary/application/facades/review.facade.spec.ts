import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {UserWord} from '../../domain/entities/user-word.entity';
import {VOCABULARY_REPOSITORY, VocabularyRepository} from '../../domain/repositories/vocabulary.repository';
import {ReviewFacade} from './review.facade';

const word: UserWord = {
  id: 'user-word-1',
  word: {
    id: 'word-1', hangul: '커피', romanization: 'keopi', translation: 'кофе',
    partOfSpeech: null, topicId: null, exampleKo: null, exampleTranslation: null,
    grammarNote: null, audioUrl: null, imageUrl: null,
  },
  level: 0,
  isDifficult: false,
  dueDate: '2026-07-17T00:00:00Z',
  repetitions: 0,
  easeFactor: 2.5,
};

describe('ReviewFacade', () => {
  let facade: ReviewFacade;
  let repository: jest.Mocked<Pick<VocabularyRepository, 'startSession' | 'submitAnswers' | 'finishSession'>>;

  beforeEach(() => {
    repository = {
      startSession: jest.fn().mockReturnValue(of({id: 'review-1', mode: 'FLASHCARDS', cards: [word]})),
      submitAnswers: jest.fn().mockReturnValue(of(undefined)),
      finishSession: jest.fn()
        .mockReturnValueOnce(throwError(() => new Error('network')))
        .mockReturnValueOnce(of({total: 1, correct: 1, xp: 5, streak: 2})),
    };
    TestBed.configureTestingModule({
      providers: [
        ReviewFacade,
        {provide: VOCABULARY_REPOSITORY, useValue: repository},
      ],
    });
    facade = TestBed.inject(ReviewFacade);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('не фабрикует результат при ошибке и повторяет ту же сессию', () => {
    facade.start('FLASHCARDS');
    facade.finishWithAnswers([{wordId: word.word.id, quality: 4}]);

    expect(facade.result()).toBeNull();
    expect(facade.saving()).toBe(false);
    expect(facade.saveError()).toContain('Не получилось сохранить');
    expect(repository.finishSession).toHaveBeenCalledWith('review-1');

    facade.retryFinish();

    expect(repository.submitAnswers).toHaveBeenCalledTimes(2);
    expect(repository.submitAnswers).toHaveBeenLastCalledWith('review-1', [{wordId: word.word.id, quality: 4}]);
    expect(facade.result()).toEqual({total: 1, correct: 1, xp: 5, streak: 2});
    expect(facade.saveError()).toBeNull();
  });
});
