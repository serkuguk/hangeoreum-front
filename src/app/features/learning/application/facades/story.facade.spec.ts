import {TestBed} from '@angular/core/testing';
import {of, throwError} from 'rxjs';
import {Story} from '../../domain/entities/story.entity';
import {CompleteResult, LEARNING_REPOSITORY, LearningRepository} from '../../domain/repositories/learning.repository';
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

describe('StoryFacade', () => {
  let facade: StoryFacade;
  let repository: jest.Mocked<Pick<LearningRepository, 'story' | 'complete'>>;
  let map: {invalidate: jest.Mock};

  beforeEach(() => {
    repository = {
      story: jest.fn().mockReturnValue(of(story)),
      complete: jest.fn(),
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

  afterEach(() => TestBed.resetTestingModule());

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
      .mockReturnValueOnce(of(result));

    facade.complete(story.id);
    const initialAttemptId = repository.complete.mock.calls[0][1].attemptId;

    facade.complete(story.id);

    expect(repository.complete.mock.calls[1][1].attemptId).toBe(initialAttemptId);
    expect(facade.completed()).toBe(true);
    expect(facade.completionError()).toBeNull();
    expect(map.invalidate).toHaveBeenCalledTimes(1);
  });
});
