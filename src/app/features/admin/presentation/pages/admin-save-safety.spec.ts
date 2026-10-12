import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {provideRouter} from '@angular/router';
import {of, Subject} from 'rxjs';
import {AdminApi, AdminClip, AdminExercise, AdminLesson, AdminLessonFull, AdminUnit, AdminWord} from '@features/admin/infrastructure/admin.api';
import {AdminMediaPageComponent} from './admin-media-page/admin-media-page.component';
import {AdminCoursePageComponent} from './admin-course-page/admin-course-page.component';
import {AdminLessonBuilderPageComponent} from './admin-lesson-builder-page/admin-lesson-builder-page.component';

const clip: AdminClip = {id: 'clip', kind: 'IMMERSE', speakerId: null, wordId: null, durationMs: null, published: false, videoUrl: null, audioUrl: null, thumbnailUrl: null};
const unit: AdminUnit = {id: 'unit', courseId: 'course', position: 1, title: 'Unit', description: null, color: null, published: false};
const lesson: AdminLesson = {id: 'lesson', unitId: unit.id, position: 1, title: 'Lesson', type: 'LESSON', xpReward: 10, free: false, published: false};
const word: AdminWord = {id: 'word', hangul: '가', romanization: 'ga', translation: 'a', imageUrl: null, audioUrl: null, partOfSpeech: null, topicId: null, exampleKo: null, exampleTranslation: null, grammarNote: null};
const data: AdminLessonFull = {lesson, tip: null, words: [], exercises: []};

describe('admin save safety', () => {
  let api: Record<string, jest.Mock>;
  beforeEach(() => {
    jest.useFakeTimers();
    api = Object.fromEntries(['speakers', 'clips', 'courses', 'getSubtitles', 'putSubtitles', 'createUnit', 'createLesson', 'reorderUnits', 'reorderLessons', 'createExercise', 'putLessonWords'].map(name => [name, jest.fn().mockReturnValue(of([]))]));
    api['lessonFull'] = jest.fn().mockReturnValue(of(data));
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: AdminApi, useValue: api}]});
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('blocks PUT during slow or failed subtitle GET and permits an empty successful result', () => {
    const pending = new Subject<never[]>();
    api['getSubtitles'].mockReturnValue(pending);
    const fixture = TestBed.createComponent(AdminMediaPageComponent);
    const component = fixture.componentInstance;
    component.openSubtitles(clip);
    component.clips.set([clip]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.subsbox app-button button').disabled).toBe(true);
    component.saveSubtitles(clip);
    expect(api['putSubtitles']).not.toHaveBeenCalled();
    expect(component.subsDraft()).toBe('');
    pending.error(new Error('failed'));
    component.saveSubtitles(clip);
    expect(api['putSubtitles']).not.toHaveBeenCalled();
    component.openSubtitles(clip);
    api['getSubtitles'].mockReturnValue(of([]));
    component.openSubtitles(clip);
    component.saveSubtitles(clip);
    expect(api['putSubtitles']).toHaveBeenCalledWith(clip.id, []);
  });

  it('ignores stale subtitle responses even after reopening the same clip', () => {
    const stale = new Subject<never[]>();
    const current = new Subject<never[]>();
    api['getSubtitles'].mockReturnValueOnce(stale).mockReturnValueOnce(current);
    const component = TestBed.createComponent(AdminMediaPageComponent).componentInstance;
    component.openSubtitles(clip);
    component.openSubtitles(clip);
    component.openSubtitles(clip);
    stale.next([]);
    component.saveSubtitles(clip);
    expect(api['putSubtitles']).not.toHaveBeenCalled();
    current.next([]);
    expect(component.subtitlesReady()).toBe(true);
  });

  it('blocks duplicate subtitle PUT and preserves the loaded draft after save failure', () => {
    const pending = new Subject<never[]>();
    api['putSubtitles'].mockReturnValue(pending);
    const component = TestBed.createComponent(AdminMediaPageComponent).componentInstance;
    component.openSubtitles(clip);
    component.saveSubtitles(clip);
    component.saveSubtitles(clip);
    expect(api['putSubtitles']).toHaveBeenCalledTimes(1);
    pending.error(new Error('failed'));
    expect(component.subtitlesReady()).toBe(true);
    expect(component.subtitlesSaving()).toBe(false);
    expect(component.subsDraft()).toBe('[]');
  });

  it('blocks overlapping word changes, uses the latest response, and unlocks after failure', () => {
    const pending = new Subject<AdminWord[]>();
    api['putLessonWords'].mockReturnValueOnce(pending);
    const fixture = TestBed.createComponent(AdminLessonBuilderPageComponent);
    fixture.componentRef.setInput('id', lesson.id);
    jest.runOnlyPendingTimers();
    const component = fixture.componentInstance;
    component.foundWords.set([word, {...word, id: 'second'}]);
    component.toggleWord(word);
    fixture.detectChanges();
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.wordpick button');
    expect(buttons.length).toBe(2);
    expect(Array.from(buttons).every(button => button.disabled)).toBe(true);
    component.toggleWord({...word, id: 'second'});
    expect(api['putLessonWords']).toHaveBeenCalledTimes(1);
    component.data.update(current => current ? {...current, lesson: {...current.lesson, title: 'Updated'}} : current);
    pending.next([word]);
    pending.complete();
    component.toggleWord({...word, id: 'second'});
    expect(api['putLessonWords']).toHaveBeenLastCalledWith(lesson.id, [word.id, 'second']);
    expect(component.data()?.lesson.title).toBe('Updated');
    const failed = new Subject<AdminWord[]>();
    api['putLessonWords'].mockReturnValue(failed);
    component.toggleWord(word);
    failed.error(new Error('failed'));
    expect(component.wordsSaving()).toBe(false);
  });

  it('appends units and lessons after maximum positions and updates positions on reorder', () => {
    const component = TestBed.createComponent(AdminCoursePageComponent).componentInstance;
    component.course.set({id: 'course', lang: 'ko', title: 'Course', description: null, published: false});
    component.units.set([unit, {...unit, id: 'third', position: 3}]);
    component.newUnitTitle.set('New unit');
    api['createUnit'].mockReturnValue(new Subject());
    component.addUnit();
    expect(api['createUnit']).toHaveBeenCalledWith(expect.objectContaining({position: 4}));
    component.lessonsByUnit.set({[unit.id]: [lesson, {...lesson, id: 'third', position: 3}]});
    component.lessonDrafts.set({[unit.id]: {title: 'New lesson', type: 'LESSON'}});
    api['createLesson'].mockReturnValue(new Subject());
    component.addLesson(unit);
    expect(api['createLesson']).toHaveBeenCalledWith(expect.objectContaining({position: 4}));
    component.moveUnit(unit, 1);
    expect(component.units().map(value => value.position)).toEqual([1, 2]);
    component.moveLesson(unit, lesson, 1);
    expect(component.lessonsByUnit()[unit.id]?.map(value => value.position)).toEqual([1, 2]);
    component.addUnit();
    component.addLesson(unit);
    expect(api['createUnit']).toHaveBeenLastCalledWith(expect.objectContaining({position: 3}));
    expect(api['createLesson']).toHaveBeenLastCalledWith(expect.objectContaining({position: 3}));
  });

  it('appends exercises after the maximum position including gaps', () => {
    const fixture = TestBed.createComponent(AdminLessonBuilderPageComponent);
    fixture.componentRef.setInput('id', lesson.id);
    jest.runOnlyPendingTimers();
    const exercise: AdminExercise = {id: 'exercise', position: 3, kind: 'CHOICE', payload: {}};
    fixture.componentInstance.data.set({...data, exercises: [{...exercise, position: 1}, exercise]});
    fixture.componentInstance.addExercise();
    expect(api['createExercise']).toHaveBeenCalledWith(lesson.id, expect.objectContaining({position: 4}));
  });
});
