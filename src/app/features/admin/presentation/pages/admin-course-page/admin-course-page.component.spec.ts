import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, Subject} from 'rxjs';
import {AdminApi, AdminLesson, AdminUnit} from '@features/admin/infrastructure/admin.api';
import {AdminCoursePageComponent} from './admin-course-page.component';

const unit: AdminUnit = {
  id: 'unit', courseId: 'course', position: 1, title: 'Приветствия',
  description: null, color: null, published: false,
};
const lesson: AdminLesson = {
  id: 'lesson', unitId: unit.id, position: 1, type: 'LESSON', title: 'test',
  xpReward: 10, free: false, published: false,
};
const otherLesson = {...lesson, id: 'other'};

describe.each(['unit', 'lesson'] as const)('AdminCoursePageComponent deleting %s', kind => {
  let component: AdminCoursePageComponent;
  let api: {clips: jest.Mock; courses: jest.Mock; deleteUnit: jest.Mock; deleteLesson: jest.Mock};
  const open = () => kind === 'unit' ? component.removeUnit(unit) : component.removeLesson(unit, lesson);
  const remaining = () => kind === 'unit' ? component.units() : component.lessonsByUnit()[unit.id];
  const expectedRemaining = () => kind === 'unit' ? [] : [otherLesson];
  const original = () => kind === 'unit' ? [unit] : [lesson, otherLesson];

  beforeEach(() => {
    api = {clips: jest.fn().mockReturnValue(of([])), courses: jest.fn().mockReturnValue(of([])), deleteUnit: jest.fn(), deleteLesson: jest.fn()};
    TestBed.configureTestingModule({providers: [{provide: AdminApi, useValue: api}]});
    component = TestBed.runInInjectionContext(() => new AdminCoursePageComponent());
    component.units.set([unit]);
    component.lessonsByUnit.set({[unit.id]: [lesson, otherLesson]});
  });

  afterEach(() => TestBed.resetTestingModule());

  it('opens a named confirmation and cancels without sending a request', () => {
    open();
    expect(component.deletionTitle()).toBe(kind === 'unit' ? 'Удалить юнит' : 'Удалить урок');
    expect(component.deletionMessage()).toContain(kind === 'unit' ? unit.title : lesson.title);
    if (kind === 'unit') expect(component.deletionMessage()).toContain('со всеми уроками');
    expect(api.deleteUnit).not.toHaveBeenCalled();
    expect(api.deleteLesson).not.toHaveBeenCalled();
    component.onDeletionVisibleChange(false);
    component.confirmDeletion();
    expect(component.pendingDeletion()).toBeNull();
    expect(api.deleteUnit).not.toHaveBeenCalled();
    expect(api.deleteLesson).not.toHaveBeenCalled();
    expect(remaining()).toEqual(original());
  });

  it('locks submission, closing and action replacement until deletion succeeds', () => {
    const request = new Subject<void>();
    const selectedApi = kind === 'unit' ? api.deleteUnit : api.deleteLesson;
    selectedApi.mockReturnValue(request);
    open();
    const action = component.pendingDeletion();
    component.confirmDeletion();
    expect(selectedApi).toHaveBeenCalledWith(kind === 'unit' ? unit.id : lesson.id);
    expect(component.saving()).toBe(true);
    expect(remaining()).toEqual(original());
    component.confirmDeletion();
    component.closeDeletion();
    component.onDeletionVisibleChange(false);
    component.removeUnit({...unit, id: 'replacement'});
    component.removeLesson(unit, otherLesson);
    expect(component.pendingDeletion()).toBe(action);
    expect(selectedApi).toHaveBeenCalledTimes(1);
    expect(kind === 'unit' ? api.deleteLesson : api.deleteUnit).not.toHaveBeenCalled();
    request.next();
    request.complete();
    expect(remaining()).toEqual(expectedRemaining());
    expect(component.saving()).toBe(false);
    expect(component.pendingDeletion()).toBeNull();
  });

  it('preserves the object on failure and allows retry in the same dialog', () => {
    const request = new Subject<void>();
    const retry = new Subject<void>();
    const selectedApi = kind === 'unit' ? api.deleteUnit : api.deleteLesson;
    selectedApi.mockReturnValueOnce(request).mockReturnValueOnce(retry);
    open();
    const action = component.pendingDeletion();
    component.confirmDeletion();
    request.error(new Error('unavailable'));
    expect(remaining()).toEqual(original());
    expect(component.pendingDeletion()).toBe(action);
    expect(component.deletionError()).toBe(kind === 'unit'
      ? 'Не получилось удалить юнит. Попробуйте ещё раз.'
      : 'Не получилось удалить урок. Попробуйте ещё раз.');
    expect(component.saving()).toBe(false);
    component.confirmDeletion();
    expect(component.deletionError()).toBeNull();
    expect(component.saving()).toBe(true);
    expect(selectedApi).toHaveBeenCalledTimes(2);
    retry.next();
    retry.complete();
    expect(remaining()).toEqual(expectedRemaining());
    expect(component.pendingDeletion()).toBeNull();
    expect(component.deletionError()).toBeNull();
  });
});


describe('admin unit practice', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('counts only published immerse clips and preserves unit metadata across failed save and retry', () => {
    const save = new Subject<AdminUnit>();
    const api = {
      clips: jest.fn().mockReturnValue(of([
        {kind: 'IMMERSE', published: true, unitId: unit.id},
        {kind: 'IMMERSE', published: false, unitId: unit.id},
        {kind: 'STORY', published: true, unitId: unit.id},
        {kind: 'IMMERSE', published: true, unitId: null},
      ])),
      courses: jest.fn().mockReturnValue(of([{id: unit.courseId}])),
      units: jest.fn().mockReturnValue(of([unit])), lessons: jest.fn().mockReturnValue(of([])),
      updateUnit: jest.fn().mockReturnValue(save),
    };
    TestBed.configureTestingModule({providers: [{provide: AdminApi, useValue: api}]});
    const component = TestBed.runInInjectionContext(() => new AdminCoursePageComponent());
    expect(component.publishedVideos()).toEqual({unit: 1});
    component.practiceDrafts.set({unit: '  Представиться  '});
    component.savePractice(unit);
    component.savePractice(unit);
    expect(api.updateUnit).toHaveBeenCalledTimes(1);
    expect(api.updateUnit).toHaveBeenCalledWith(unit.id, {
      courseId: unit.courseId, position: unit.position, title: unit.title, color: unit.color,
      description: 'Представиться',
    });
    save.error(new Error('failed'));
    expect(component.units()[0].description).toBeNull();
    expect(component.practiceDrafts().unit).toBe('  Представиться  ');
    expect(component.practiceSaving().unit).toBe(false);
    api.updateUnit.mockReturnValue(of({...unit, description: 'Представиться'}));
    component.savePractice(unit);
    expect(component.units()[0].description).toBe('Представиться');
  });
});
