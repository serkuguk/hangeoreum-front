import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {Subject, delay, of, throwError} from 'rxjs';
import {Story} from '@features/learning/domain/entities/story.entity';
import {CompletionAccepted, CompleteResult, LearningRepository} from '@features/learning/domain/repositories/learning.repository';
import {LEARNING_REPOSITORY} from '../learning-repository.token';
import {LearnMapFacade} from './learn-map.facade';
import {StoryFacade} from './story.facade';

const story: Story = {id: 'story-1', title: 'Кофе', clip: null, lines: []};
const result: CompleteResult = {
  attemptId: 'server-attempt',
  savedAt: '2026-07-16T12:00:00Z',
  xp: 10,
  newWords: [],
  streak: 1,
  goalReached: false,
};

const accepted: CompletionAccepted = {
  attemptId: 'server-attempt',
  acceptedAt: '2026-07-16T12:00:00Z',
  status: 'PENDING',
};

describe('StoryFacade', () => {
  let facade: StoryFacade;
  let repository: jest.Mocked<Pick<LearningRepository, 'story' | 'complete' | 'getCompletionStatus' | 'startSession' | 'recordExerciseResult'>>;
  let map: {invalidate: jest.Mock};

  beforeEach(() => {
    jest.useFakeTimers();
    repository = {
      startSession: jest.fn<LearningRepository['startSession']>().mockReturnValue(of(undefined)),
      recordExerciseResult: jest.fn<LearningRepository['recordExerciseResult']>().mockReturnValue(of(undefined)),
      story: jest.fn<LearningRepository['story']>().mockReturnValue(of(story)),
      complete: jest.fn(),
      getCompletionStatus: jest.fn<LearningRepository['getCompletionStatus']>().mockReturnValue(of({status: 'COMPLETED', result})),
    };
    map = {invalidate: jest.fn()};
    TestBed.configureTestingModule({
      providers: [
        StoryFacade,
        {provide: LEARNING_REPOSITORY, useValue: repository},
        {provide: LearnMapFacade, useValue: map},
      ],
    });
    facade = TestBed.inject(StoryFacade);
    facade.load(story.id);
  });

  it('waits for completion responses slower than the polling interval', () => {
    repository.complete.mockReturnValue(of(accepted));
    repository.getCompletionStatus.mockReturnValue(of({status: 'COMPLETED' as const, result}).pipe(delay(600)));
    facade.complete(story.id);
    jest.advanceTimersByTime(600);
    expect(facade.completed()).toBe(true);
    expect(repository.getCompletionStatus).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.useRealTimers();
  });

  it('не показывает Story завершённой, если сервер не сохранил прогресс', () => {
    repository.complete.mockReturnValue(throwError(() => new Error('network')));

    facade.complete(story.id);

    expect(facade.completed()).toBe(false);
    expect(facade.completing()).toBe(false);
    expect(facade.completionError()).toContain('Не получилось сохранить');
    expect(map.invalidate).not.toHaveBeenCalled();
  });

  it('повторяет завершение Story с тем же attemptId', () => {
    repository.complete
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(accepted));

    facade.complete(story.id);
    const initialAttemptId = repository.complete.mock.calls[0][1].attemptId;
    expect(initialAttemptId).toBe(repository.startSession.mock.calls[0][1].sessionId);
    expect(repository.complete.mock.calls[0][1]).toEqual({attemptId: initialAttemptId, score: 100, accuracy: 100});

    facade.complete(story.id);

    expect(repository.complete.mock.calls[1][1].attemptId).toBe(initialAttemptId);
    jest.advanceTimersByTime(0);
    expect(facade.completed()).toBe(true);
    expect(facade.completionError()).toBeNull();
    expect(map.invalidate).toHaveBeenCalledTimes(1);
  });

  it('cancels stale loads and teardown retries, while start failure never blocks completion', () => {
    expect(repository.startSession).toHaveBeenCalledTimes(1);
    const old = new Subject<Story>();
    repository.story.mockReturnValueOnce(old);
    facade.load('old');
    repository.story.mockReturnValueOnce(throwError(() => ({status: 404})));
    facade.load('missing');
    old.next(story);
    expect(old.observed).toBe(false);
    expect(repository.startSession).toHaveBeenCalledTimes(1);
    facade.complete('missing');
    expect(repository.complete).not.toHaveBeenCalled();
    repository.startSession.mockReturnValue(throwError(() => ({status: 0})));
    facade.load(story.id);
    repository.complete.mockReturnValue(of(accepted));
    facade.complete(story.id);
    jest.advanceTimersByTime(500);
    expect(repository.startSession).toHaveBeenCalledTimes(4);
    expect(facade.completed()).toBe(true);
    facade.load(story.id);
    TestBed.resetTestingModule();
    jest.advanceTimersByTime(500);
    expect(repository.startSession).toHaveBeenCalledTimes(5);
  });
});
