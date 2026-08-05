import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {UserWord} from '../../domain/entities/user-word.entity';
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
  it('starts from review signals without polling and clears the round timer on destroy', () => {
    jest.useFakeTimers();
    const review = {
      loading: signal(false),
      error: signal<string | null>(null),
      queue: signal<UserWord[]>([]),
      result: signal(null),
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
