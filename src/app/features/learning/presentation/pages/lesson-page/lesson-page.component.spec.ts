import {TestBed} from '@angular/core/testing';
import {Router, provideRouter} from '@angular/router';
import {jest} from '@jest/globals';
import {LessonFacade} from '@features/learning/application/facades/lesson.facade';
import {LessonPageComponent} from './lesson-page.component';

describe('LessonPageComponent exit', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(inProgress: boolean) {
    const facade = {start: jest.fn(), inProgress};
    TestBed.configureTestingModule({
      imports: [LessonPageComponent],
      providers: [provideRouter([]), {provide: LessonFacade, useValue: facade}],
    });
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const confirmSpy = jest.spyOn(window, 'confirm');
    const fixture = TestBed.createComponent(LessonPageComponent);
    fixture.componentRef.setInput('id', 'lesson-1');
    return {component: fixture.componentInstance, navigate, confirmSpy};
  }

  it('opens the dialog instead of navigating while a lesson is in progress', () => {
    const {component, navigate, confirmSpy} = setup(true);
    component.exit();
    expect(component.exitConfirmOpen()).toBe(true);
    expect(navigate).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('navigates to the map after the dialog is confirmed', () => {
    const {component, navigate} = setup(true);
    component.exit();
    component.confirmExit();
    expect(component.exitConfirmOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/learn']);
  });

  it('navigates directly when nothing is in progress', () => {
    const {component, navigate} = setup(false);
    component.exit();
    expect(component.exitConfirmOpen()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/learn']);
  });
});
