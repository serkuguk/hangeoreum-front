import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, throwError} from 'rxjs';
import {Lesson} from '../../domain/entities/exercise.entity';
import {CompleteResult, LEARNING_REPOSITORY, LearningRepository} from '../../domain/repositories/learning.repository';
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

describe('LessonFacade', () => {
  let facade: LessonFacade;
  let repository: jest.Mocked<Pick<LearningRepository, 'lesson' | 'complete'>>;
  let map: {invalidate: jest.Mock};

  beforeEach(() => {
    sessionStorage.clear();
    repository = {
      lesson: jest.fn().mockReturnValue(of(lesson)),
      complete: jest.fn().mockReturnValue(of(result)),
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

  afterEach(() => TestBed.resetTestingModule());

  it('сохраняет результат только после успешного ответа сервера', () => {
    finishLesson();

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
      .mockReturnValueOnce(of(result));

    finishLesson();

    const initialAttemptId = repository.complete.mock.calls[0][1].attemptId;
    expect(facade.result()).toBeNull();
    expect(facade.phase()).toBe('save-error');
    expect(facade.saveError()).toBe(true);

    facade.retryFinish();

    expect(repository.complete.mock.calls[1][1].attemptId).toBe(initialAttemptId);
    expect(facade.result()).toEqual(result);
    expect(facade.phase()).toBe('completed');
  });

  it('не начинает пустой урок', () => {
    repository.lesson.mockReturnValue(of({...lesson, exercises: []}));

    facade.start(lesson.id);

    expect(repository.complete).not.toHaveBeenCalled();
    expect(facade.phase()).toBe('load-error');
    expect(facade.error()).toContain('нет упражнений');
  });

  function finishLesson(): void {
    facade.start(lesson.id);
    facade.answered({correct: true});
    facade.next();
  }
});
