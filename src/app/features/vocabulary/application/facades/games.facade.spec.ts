import {Subject, of, throwError} from 'rxjs';
import {VocabularyRepository} from '../../domain/repositories/vocabulary.repository';
import {VOCABULARY_REPOSITORY} from '../vocabulary-repository.token';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {UserWord} from '@features/vocabulary/domain/entities/user-word.entity';
import {GamesFacade} from './games.facade';
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
  dueDate: '2026-07-31T00:00:00Z',
  repetitions: 0,
  easeFactor: 2.5,
};

describe('GamesFacade', () => {
  it.each(['submitAnswers', 'finishSession'] as const)('preserves the round after %s failure and permits retry', failing => {
    jest.useFakeTimers();
    const repository = {
      startSession: jest.fn<VocabularyRepository['startSession']>().mockReturnValue(of({id: 'session', mode: 'LISTEN', cards: [word]})),
      submitAnswers: jest.fn<VocabularyRepository['submitAnswers']>().mockReturnValue(of(undefined)),
      finishSession: jest.fn<VocabularyRepository['finishSession']>().mockReturnValue(of({total: 1, correct: 1, xp: 5, streak: 1})),
    };
    const pending = new Subject<void>();
    repository.submitAnswers.mockReturnValueOnce(pending);
    if (failing === 'finishSession') repository.finishSession.mockReturnValueOnce(throwError(() => new Error('network')));
    TestBed.configureTestingModule({providers: [GamesFacade, ReviewFacade, {provide: VOCABULARY_REPOSITORY, useValue: repository}]});
    const facade = TestBed.inject(GamesFacade);
    facade.start('LISTEN');
    TestBed.flushEffects();
    facade.pickOption(word.word.translation);
    jest.advanceTimersByTime(500);
    expect(facade.saving()).toBe(true);
    facade.backToPick();
    expect(facade.phase()).toBe('done');
    if (failing === 'submitAnswers') pending.error(new Error('network'));
    else { pending.next(); pending.complete(); }
    expect(facade.saveError()).toBeTruthy();
    facade.backToPick();
    expect(facade.phase()).toBe('done');
    facade.retryFinish();
    expect(facade.saveError()).toBeNull();
    expect(facade.result()?.xp).toBe(5);
    expect(repository.submitAnswers).toHaveBeenLastCalledWith('session', [{wordId: word.word.id, quality: 5}]);
    facade.backToPick();
    expect(facade.phase()).toBe('pick');
    TestBed.resetTestingModule();
    jest.useRealTimers();
  });

  it('starts from review signals without polling and clears the round timer on destroy', () => {
    jest.useFakeTimers();
    const review = {
      loading: signal(false),
      error: signal<string | null>(null),
      queue: signal<UserWord[]>([]),
      result: signal(null),
      saving: signal(false),
      saveError: signal<string | null>(null),
      start: jest.fn(),
      finishWithAnswers: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        GamesFacade,
        {provide: ReviewFacade, useValue: review},
      ],
    });
    const facade = TestBed.inject(GamesFacade);
    const initialTimers = jest.getTimerCount();

    review.start.mockImplementation(() => review.loading.set(true));
    facade.start('LISTEN');
    facade.start('LISTEN');

    expect(review.start).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(initialTimers);

    review.queue.set([word]);
    review.loading.set(false);
    TestBed.flushEffects();

    expect(facade.phase()).toBe('playing');
    expect(jest.getTimerCount()).toBe(1);

    TestBed.resetTestingModule();
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });
});
