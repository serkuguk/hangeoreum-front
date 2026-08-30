import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {LessonFacade} from '../../application/facades/lesson.facade';
import {StoryFacade} from '../../application/facades/story.facade';
import {LessonPageComponent} from './lesson-page/lesson-page.component';
import {LessonTipPageComponent} from './lesson-tip-page/lesson-tip-page.component';
import {StoryPageComponent} from './story-page/story-page.component';

describe('learning route input lifecycle', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('starts Lesson once with the bound route id', () => {
    const facade = {start: jest.fn()};
    TestBed.configureTestingModule({
      imports: [LessonPageComponent],
      providers: [provideRouter([]), {provide: LessonFacade, useValue: facade}],
    });
    const fixture = TestBed.createComponent(LessonPageComponent);
    fixture.componentRef.setInput('id', 'lesson-1');

    fixture.componentInstance.ngOnInit();

    expect(facade.start).toHaveBeenCalledTimes(1);
    expect(facade.start).toHaveBeenCalledWith('lesson-1');
  });

  it('loads Lesson Tip once with the bound route id', () => {
    const facade = {loadTip: jest.fn()};
    TestBed.configureTestingModule({
      imports: [LessonTipPageComponent],
      providers: [provideRouter([]), {provide: LessonFacade, useValue: facade}],
    });
    const fixture = TestBed.createComponent(LessonTipPageComponent);
    fixture.componentRef.setInput('id', 'lesson-2');

    fixture.componentInstance.ngOnInit();

    expect(facade.loadTip).toHaveBeenCalledTimes(1);
    expect(facade.loadTip).toHaveBeenCalledWith('lesson-2');
  });

  it('loads Story once with the bound route id', () => {
    const facade = {load: jest.fn()};
    TestBed.configureTestingModule({
      imports: [StoryPageComponent],
      providers: [
        provideRouter([]),
        {provide: StoryFacade, useValue: facade},
        {provide: VocabularyFacade, useValue: {}},
      ],
    });
    const fixture = TestBed.createComponent(StoryPageComponent);
    fixture.componentRef.setInput('id', 'lesson-3');

    fixture.componentInstance.ngOnInit();

    expect(facade.load).toHaveBeenCalledTimes(1);
    expect(facade.load).toHaveBeenCalledWith('lesson-3');
  });
});
