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

  describe('SPELL', () => {
    const spellWord = (hangul: string): UserWord => ({...word, word: {...word.word, hangul}});

    function setup(hangul = '하나둘') {
      jest.useFakeTimers();
      const review = {
        loading: signal(false),
        error: signal<string | null>(null),
        queue: signal<UserWord[]>([spellWord(hangul)]),
        result: signal(null),
        saving: signal(false),
        saveError: signal<string | null>(null),
        start: jest.fn(),
        finishWithAnswers: jest.fn(),
      };
      TestBed.configureTestingModule({providers: [GamesFacade, {provide: ReviewFacade, useValue: review}]});
      const facade = TestBed.inject(GamesFacade);
      facade.start('SPELL');
      TestBed.flushEffects();
      return facade;
    }

    afterEach(() => {
      TestBed.resetTestingModule();
      jest.useRealTimers();
    });

    it('returns the clicked syllable to the end of the bank', () => {
      const facade = setup();
      facade.bank.set(['x']);
      facade.typed.set(['하', '나']);
      facade.returnSyllable(0);
      expect(facade.typed()).toEqual(['나']);
      expect(facade.bank()).toEqual(['x', '하']);
    });

    it('ignores returnSyllable out of range and after the answer', () => {
      const facade = setup();
      facade.bank.set([]);
      facade.typed.set(['하', '나', '둘']);
      facade.returnSyllable(-1);
      facade.returnSyllable(5);
      facade.checkAnswer();
      facade.returnSyllable(0);
      expect(facade.typed()).toEqual(['하', '나', '둘']);
      expect(facade.bank()).toEqual([]);
    });

    it('moves a syllable inside the field with a new array and leaves the bank untouched', () => {
      const facade = setup();
      facade.bank.set(['x']);
      const before = ['a', 'b', 'c'];
      facade.typed.set(before);
      facade.moveSyllable(0, 2);
      expect(facade.typed()).toEqual(['b', 'c', 'a']);
      expect(facade.typed()).not.toBe(before);
      expect(before).toEqual(['a', 'b', 'c']);
      expect(facade.bank()).toEqual(['x']);
    });

    it('ignores moveSyllable for equal or out-of-range indexes and after the answer', () => {
      const facade = setup();
      facade.typed.set(['하', '나', '둘']);
      facade.moveSyllable(1, 1);
      facade.moveSyllable(-1, 1);
      facade.moveSyllable(0, 3);
      expect(facade.typed()).toEqual(['하', '나', '둘']);
      facade.checkAnswer();
      facade.moveSyllable(0, 2);
      expect(facade.typed()).toEqual(['하', '나', '둘']);
    });

    it('checkAnswer accepts the right order, scores and moves on after 500 ms', () => {
      const facade = setup();
      facade.typed.set(['하', '나', '둘']);
      facade.checkAnswer();
      expect(facade.lastAnswer()).toBe('ok');
      expect(facade.score()).toBeGreaterThan(0);
      expect(facade.combo()).toBe(1);
      jest.advanceTimersByTime(499);
      expect(facade.phase()).toBe('playing');
      jest.advanceTimersByTime(1);
      expect(facade.phase()).toBe('done');
    });

    it('checkAnswer rejects a wrong order, keeps the score and waits 1100 ms', () => {
      const facade = setup();
      facade.typed.set(['나', '하', '둘']);
      facade.checkAnswer();
      expect(facade.lastAnswer()).toBe('bad');
      expect(facade.score()).toBe(0);
      expect(facade.combo()).toBe(0);
      jest.advanceTimersByTime(1099);
      expect(facade.phase()).toBe('playing');
      jest.advanceTimersByTime(1);
      expect(facade.phase()).toBe('done');
    });

    it('checkAnswer is a no-op for a partial field and registers an answer only once', () => {
      const facade = setup();
      facade.typed.set(['하', '나']);
      facade.checkAnswer();
      expect(facade.lastAnswer()).toBeNull();
      facade.typed.set(['하', '나', '둘']);
      facade.checkAnswer();
      const score = facade.score();
      facade.checkAnswer();
      expect(facade.score()).toBe(score);
      expect(facade.combo()).toBe(1);
    });

    it('canCheck is true only when the field is full and unanswered', () => {
      const facade = setup();
      const seen: boolean[] = [];
      for (const typed of [[], ['하', '나'], ['하', '나', '둘']]) {
        facade.typed.set(typed);
        seen.push(facade.canCheck());
      }
      facade.checkAnswer();
      seen.push(facade.canCheck());
      expect(seen).toEqual([false, false, true, false]);
    });

    it('pickSyllable moves a bank syllable to the end of the field without checking', () => {
      const facade = setup('하나');
      facade.bank.set(['하', '나', 'x']);
      facade.typed.set([]);
      facade.pickSyllable(1);
      facade.pickSyllable(0);
      expect(facade.typed()).toEqual(['나', '하']);
      expect(facade.bank()).toEqual(['x']);
      expect(facade.lastAnswer()).toBeNull();
      expect(jest.getTimerCount()).toBe(1); // round timer only, no scheduled nextWord
    });

    it('pickSyllable is a no-op when the field is already full', () => {
      const facade = setup('하나');
      facade.bank.set(['x']);
      facade.typed.set(['하', '나']);
      facade.pickSyllable(0);
      expect(facade.typed()).toEqual(['하', '나']);
      expect(facade.bank()).toEqual(['x']);
    });

    it('resetTyped sends every syllable back to the bank', () => {
      const facade = setup();
      facade.bank.set(['둘', 'x']);
      facade.typed.set(['하', '나']);
      facade.resetTyped();
      expect(facade.typed()).toEqual([]);
      expect([...facade.bank()].sort()).toEqual(['x', '나', '둘', '하'].sort());
    });

    it('tracks repeated syllables by index', () => {
      const facade = setup('아아');
      facade.bank.set(['아']);
      facade.typed.set(['아', '아']);
      facade.returnSyllable(1);
      expect(facade.typed()).toEqual(['아']);
      expect(facade.bank()).toEqual(['아', '아']);
      facade.pickSyllable(1);
      facade.moveSyllable(0, 1);
      expect(facade.typed()).toEqual(['아', '아']);
      expect(facade.bank()).toEqual(['아']);
    });
  });
});
