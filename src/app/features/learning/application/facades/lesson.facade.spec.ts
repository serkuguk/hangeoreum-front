import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {Subject, delay, of, throwError} from 'rxjs';
import {Lesson} from '@features/learning/domain/entities/exercise.entity';
import {CompletionAccepted, CompletionStatus, CompleteResult, LearningRepository} from '@features/learning/domain/repositories/learning.repository';
import {LEARNING_REPOSITORY} from '../learning-repository.token';
import {LearnMapFacade} from './learn-map.facade';
import {LessonFacade} from './lesson.facade';

const lesson: Lesson = {
  id: 'lesson-1',
  title: 'Приветствие',
  type: 'LESSON',
  xpReward: 10,
  exercises: [{
    id: 'exercise-1',
    kind: 'CHOICE',
    position: 1,
    payload: {question: '안녕', options: [{text: 'Привет', correct: true}]},
  }],
};

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

describe('LessonFacade', () => {
  let facade: LessonFacade;
  let repository: jest.Mocked<Pick<LearningRepository, 'lesson' | 'complete' | 'getCompletionStatus' | 'startSession' | 'recordExerciseResult'>>;
  let map: {invalidate: jest.Mock};

  beforeEach(() => {
    sessionStorage.clear();
    jest.useFakeTimers();
    repository = {
      startSession: jest.fn<LearningRepository['startSession']>().mockReturnValue(of(undefined)),
      recordExerciseResult: jest.fn<LearningRepository['recordExerciseResult']>().mockReturnValue(of(undefined)),
      lesson: jest.fn<LearningRepository['lesson']>().mockReturnValue(of(lesson)),
      complete: jest.fn<LearningRepository['complete']>().mockReturnValue(of(accepted)),
      getCompletionStatus: jest.fn<LearningRepository['getCompletionStatus']>().mockReturnValue(of({status: 'COMPLETED', result})),
    };
    map = {invalidate: jest.fn()};

    TestBed.configureTestingModule({
      providers: [
        LessonFacade,
        {provide: LEARNING_REPOSITORY, useValue: repository},
        {provide: LearnMapFacade, useValue: map},
      ],
    });
    facade = TestBed.inject(LessonFacade);
  });

  it('waits for completion responses slower than the polling interval', () => {
    repository.complete.mockReturnValue(of(accepted));
    repository.getCompletionStatus.mockReturnValue(of({status: 'COMPLETED' as const, result}).pipe(delay(600)));
    finishLesson();
    jest.advanceTimersByTime(600);
    expect(facade.result()).toEqual(result);
    expect(repository.getCompletionStatus).toHaveBeenCalledTimes(1);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    jest.useRealTimers();
  });

  it('stops the lesson when the server refuses the session for the daily free limit', () => {
    repository.startSession.mockReturnValue(throwError(() => ({status: 403, error: {code: 'LIMIT_REACHED'}})));
    facade.start('lesson-1');
    expect(facade.blockedBy()).toBe('LIMIT_REACHED');
    expect(facade.phase()).toBe('load-error');
    expect(facade.current()).toBeNull();
  });

  it('keeps the lesson going when session tracking fails for other reasons', () => {
    repository.startSession.mockReturnValue(throwError(() => ({status: 400, error: {code: 'VALIDATION'}})));
    facade.start('lesson-1');
    expect(facade.blockedBy()).toBeNull();
    expect(facade.phase()).toBe('active');
  });

  it('сохраняет результат только после успешного ответа сервера', () => {
    finishLesson();

    expect(facade.current()).toBeNull();
    expect(facade.finishing()).toBe(true);
    jest.advanceTimersByTime(0);

    expect(repository.complete).toHaveBeenCalledWith(
      lesson.id,
      expect.objectContaining({attemptId: expect.any(String), score: 100, accuracy: 100}),
    );
    expect(facade.result()).toEqual(result);
    expect(facade.phase()).toBe('completed');
    expect(facade.saveError()).toBe(false);
    expect(map.invalidate).toHaveBeenCalledTimes(1);
  });

  it('повторяет неудачное сохранение с тем же attemptId', () => {
    repository.complete
      .mockReturnValueOnce(throwError(() => new Error('network')))
      .mockReturnValueOnce(of(accepted));

    finishLesson();

    const initialAttemptId = repository.complete.mock.calls[0][1].attemptId;
    expect(facade.result()).toBeNull();
    expect(facade.phase()).toBe('save-error');
    expect(facade.saveError()).toBe(true);

    facade.retryFinish();
    jest.advanceTimersByTime(0);

    expect(repository.complete.mock.calls[1][1].attemptId).toBe(initialAttemptId);
    expect(facade.result()).toEqual(result);
    expect(facade.phase()).toBe('completed');
  });

  it('не публикует pending receipt и завершает polling при первом completed', () => {
    const status = new Subject<CompletionStatus>();
    repository.getCompletionStatus.mockReturnValue(status);

    finishLesson();
    jest.advanceTimersByTime(0);
    status.next({status: 'PENDING', result: null});
    status.complete();
    repository.getCompletionStatus.mockReturnValue(of({status: 'COMPLETED', result}));

    expect(facade.result()).toBeNull();
    expect(facade.finishing()).toBe(true);

    jest.advanceTimersByTime(500);
    status.next({status: 'COMPLETED', result});

    expect(facade.result()).toEqual(result);
    expect(repository.getCompletionStatus).toHaveBeenCalledTimes(2);
  });

  it('отменяет polling при уничтожении facade', () => {
    repository.getCompletionStatus.mockReturnValue(new Subject<CompletionStatus>());

    finishLesson();
    jest.advanceTimersByTime(0);
    expect(repository.getCompletionStatus).toHaveBeenCalledTimes(1);

    TestBed.resetTestingModule();
    jest.advanceTimersByTime(500);

    expect(repository.getCompletionStatus).toHaveBeenCalledTimes(1);
  });

  it('не начинает пустой урок', () => {
    repository.lesson.mockReturnValue(of({...lesson, exercises: []}));

    facade.start(lesson.id);

    expect(repository.complete).not.toHaveBeenCalled();
    expect(facade.phase()).toBe('load-error');
    expect(facade.error()).toContain('нет упражнений');
  });

  it.each(['CHOICE', 'LISTEN_CHOICE', 'WORD_ORDER', 'FILL_BLANK', 'MATCH_PAIRS', 'TYPE_WORD'] as const)(
    'captures only first feedback per presentation for %s', kind => {
      repository.lesson.mockReturnValue(of({...lesson, exercises: [{...lesson.exercises[0], kind}]}));
      facade.start(lesson.id);
      const sessionId = repository.startSession.mock.calls[0][1].sessionId;
      facade.answered({correct: false, expected: 'expected', mistakes: 2});
      facade.answered({correct: true});
      expect(facade.feedback()?.correct).toBe(false);
      expect(repository.recordExerciseResult.mock.calls).toEqual([[lesson.id, sessionId, {
        sequence: 1, exerciseId: 'exercise-1', correct: false, expected: 'expected',
        ...(kind === 'MATCH_PAIRS' ? {mistakes: 2} : {}),
      }]]);
      facade.next();
      facade.answered({correct: true});
      jest.advanceTimersByTime(0);
      facade.answered({correct: true});
      facade.next();
      expect(repository.recordExerciseResult.mock.calls[1][2].sequence).toBe(2);
      expect(repository.complete.mock.calls[0][1]).toEqual({lessonId: lesson.id, attemptId: sessionId, score: 0, accuracy: 50});
    });

  it('restores legacy completion without a fabricated start', () => {
    sessionStorage.setItem('hangeoreum.pending-lesson-completion', JSON.stringify({lessonId: lesson.id, attemptId: 'legacy', score: 75, accuracy: 80}));
    facade.start(lesson.id);
    facade.retryFinish();
    expect(repository.startSession).not.toHaveBeenCalled();
    expect(repository.complete.mock.calls[0][1].attemptId).toBe('legacy');
  });

  it('serializes start before results and retries results with stable sequences', () => {
    const start = new Subject<void>();
    repository.startSession.mockReturnValue(start);
    repository.recordExerciseResult.mockReturnValueOnce(throwError(() => ({status: 0})))
      .mockReturnValueOnce(throwError(() => ({status: 500}))).mockReturnValue(of(undefined));
    facade.start(lesson.id);
    facade.answered({correct: false});
    facade.next();
    jest.advanceTimersByTime(0);
    facade.answered({correct: true});
    expect(repository.recordExerciseResult).not.toHaveBeenCalled();
    start.complete();
    expect(repository.recordExerciseResult).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(repository.recordExerciseResult.mock.calls.map(call => call[2].sequence)).toEqual([1, 1, 1, 2]);
  });

  it('limits transient start retries to three without blocking completion', () => {
    repository.startSession.mockReturnValue(throwError(() => ({status: 503})));
    finishLesson();
    expect(repository.complete).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(500);
    expect(repository.startSession).toHaveBeenCalledTimes(3);
    expect(repository.recordExerciseResult).not.toHaveBeenCalled();
    expect(facade.result()).toEqual(result);
  });

  it('caps pending events at 100 and cancels retained events on reset', () => {
    const start = new Subject<void>();
    repository.startSession.mockReturnValueOnce(start);
    facade.start(lesson.id);
    for (let i = 0; i < 101; i++) {
      facade.answered({correct: false});
      facade.next();
      jest.advanceTimersByTime(0);
    }
    start.complete();
    expect(repository.recordExerciseResult).toHaveBeenCalledTimes(100);
    const held = new Subject<void>();
    repository.recordExerciseResult.mockReturnValueOnce(held);
    facade.answered({correct: false});
    facade.next();
    jest.advanceTimersByTime(0);
    facade.answered({correct: false});
    facade.start('next-lesson');
    expect(held.observed).toBe(false);
    held.complete();
    expect(repository.recordExerciseResult).toHaveBeenCalledTimes(101);
  });

  it.each([400, 401, 403, 404, 409])('never retries %s and cancels tracking retries on teardown', status => {
    repository.startSession.mockReturnValue(throwError(() => ({status})));
    finishLesson();
    jest.advanceTimersByTime(1000);
    expect(repository.startSession).toHaveBeenCalledTimes(1);
    repository.startSession.mockReturnValue(throwError(() => ({status: 0})));
    facade.start(lesson.id);
    TestBed.resetTestingModule();
    jest.advanceTimersByTime(1000);
    expect(repository.startSession).toHaveBeenCalledTimes(2);
    expect(repository.recordExerciseResult).not.toHaveBeenCalled();
  });

  it('cancels a superseded load before starting tracking', () => {
    const old = new Subject<Lesson>();
    repository.lesson.mockReturnValueOnce(old);
    facade.start('old');
    facade.start(lesson.id);
    old.next(lesson);
    expect(old.observed).toBe(false);
    expect(repository.startSession).toHaveBeenCalledTimes(1);
  });

  function finishLesson(): void {
    facade.start(lesson.id);
    facade.answered({correct: true});
    facade.next();
  }
});
