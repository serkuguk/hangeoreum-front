import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideTranslateService} from '@ngx-translate/core';
import {jest} from '@jest/globals';
import {of} from 'rxjs';
import {FilePickerComponent, PaginationComponent} from 'springest';
import {AdminApi, AdminClip} from '../../infrastructure/admin.api';
import {AdminAlphabetPageComponent} from './admin-alphabet-page.component';
import {AdminCoursePageComponent} from './admin-course-page.component';
import {AdminMediaPageComponent} from './admin-media-page.component';
import {AdminNotificationsPageComponent} from './admin-notifications-page.component';
import {AdminTopicsPageComponent} from './admin-topics-page.component';
import {AdminWordsPageComponent} from './admin-words-page.component';

const letter = {id: 'letter', jamo: '가', romanization: 'ga', letterGroup: 'VOWEL', position: 1, audioUrl: null};
const clip: AdminClip = {id: 'clip', kind: 'IMMERSE', speakerId: null, wordId: null, durationMs: null, published: false, videoUrl: null, audioUrl: null, thumbnailUrl: null};

describe('admin springest controls', () => {
  let api: Record<string, jest.Mock>;
  let fixture: ComponentFixture<unknown>;

  beforeEach(() => {
    api = {
      letters: jest.fn().mockReturnValue(of([letter])), uploadLetterAudio: jest.fn().mockReturnValue(of(letter)),
      clips: jest.fn().mockReturnValue(of([clip])), speakers: jest.fn().mockReturnValue(of([])),
      updateClip: jest.fn().mockReturnValue(of(clip)), courses: jest.fn().mockReturnValue(of([])),
      topics: jest.fn().mockReturnValue(of([])), words: jest.fn().mockReturnValue(of({content: [], totalElements: 45, page: 0})),
    };
    TestBed.configureTestingModule({providers: [provideTranslateService(), {provide: AdminApi, useValue: api}]});
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it.each([AdminCoursePageComponent, AdminNotificationsPageComponent, AdminTopicsPageComponent])('renders the creation fields in %p', page => {
    fixture = TestBed.createComponent(page);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-basic-input input')).not.toBeNull();
  });

  it('passes numeric zero and nullable select values from the clip Signal Form to the existing API', async () => {
    const media = TestBed.createComponent(AdminMediaPageComponent);
    fixture = media;
    media.componentInstance.openEdit(clip);
    media.detectChanges();
    const input: HTMLInputElement = media.nativeElement.querySelector('app-basic-input input[type=number]');
    input.value = '0';
    input.dispatchEvent(new Event('input', {bubbles: true}));
    media.detectChanges();
    expect(media.componentInstance.clipDraft().durationMs).toBe(0);
    media.componentInstance.saveClip(clip);
    expect(api['updateClip']).toHaveBeenCalledWith('clip', {kind: 'IMMERSE', speakerId: null, wordId: null, durationMs: 0});
  });

  it('explains invalid clip duration and keeps zero or empty duration valid', () => {
    const media = TestBed.createComponent(AdminMediaPageComponent);
    fixture = media;
    media.componentInstance.openEdit(clip);
    media.componentInstance.clipDraft.update(draft => ({...draft, durationMs: -1}));
    media.componentInstance.saveClip(clip);
    expect(api['updateClip']).not.toHaveBeenCalled();
    expect(media.componentInstance.error()).toBe('Длительность должна быть не меньше 0 мс.');
    media.componentInstance.clipDraft.update(draft => ({...draft, durationMs: null}));
    media.componentInstance.saveClip(clip);
    expect(api['updateClip']).toHaveBeenCalledWith('clip', expect.objectContaining({durationMs: null}));
    expect(media.componentInstance.error()).toBeNull();
  });

  it('clears an uploaded picker so the same local file can be chosen twice', async () => {
    const alphabet = TestBed.createComponent(AdminAlphabetPageComponent);
    fixture = alphabet;
    alphabet.detectChanges();
    const file = new File(['audio'], 'letter.mp3', {type: 'audio/mpeg'});
    const input: HTMLInputElement = alphabet.nativeElement.querySelector('input[type=file]');
    Object.defineProperty(input, 'files', {configurable: true, value: [file]});
    input.dispatchEvent(new Event('change', {bubbles: true}));
    alphabet.detectChanges();
    await alphabet.whenStable();
    expect(alphabet.debugElement.query(By.directive(FilePickerComponent)).componentInstance.value()).toEqual([]);
    input.dispatchEvent(new Event('change', {bubbles: true}));
    expect(api['uploadLetterAudio']).toHaveBeenCalledTimes(2);
  });

  it('uses the real total and zero-based paginator page in the existing request', () => {
    const words = TestBed.createComponent(AdminWordsPageComponent);
    fixture = words;
    words.detectChanges();
    const pagination = words.debugElement.query(By.directive(PaginationComponent)).componentInstance as PaginationComponent;
    expect(pagination.rows()).toBe(20);
    expect(pagination.totalRecords()).toBe(45);
    pagination.pageChange.emit({page: 2, first: 40, rows: 20});
    words.detectChanges();
    expect(words.componentInstance.page()).toBe(2);
    expect(pagination.first()).toBe(40);
    expect(api['words']).toHaveBeenLastCalledWith('', 2);
    words.componentInstance.onSearch('가');
    expect(words.componentInstance.page()).toBe(0);
  });
});
