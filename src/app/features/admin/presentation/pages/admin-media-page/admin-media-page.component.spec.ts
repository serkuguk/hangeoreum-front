import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, Subject} from 'rxjs';
import {AdminApi, AdminClip, Speaker} from '@features/admin/infrastructure/admin.api';
import {AdminMediaPageComponent} from './admin-media-page.component';

const speaker: Speaker = {id: 'speaker', name: 'test', avatarUrl: null, bio: null};
const clip: AdminClip = {
  id: 'clip1234-5678', kind: 'IMMERSE', speakerId: speaker.id, wordId: null,
  videoUrl: null, audioUrl: null, thumbnailUrl: null, durationMs: null, published: false,
};

describe.each(['speaker', 'clip'] as const)('AdminMediaPageComponent deleting %s', kind => {
  let component: AdminMediaPageComponent;
  let api: {speakers: jest.Mock; clips: jest.Mock; deleteSpeaker: jest.Mock; deleteClip: jest.Mock};
  const open = () => kind === 'speaker' ? component.removeSpeaker(speaker) : component.removeClip(clip);
  const selectedApi = () => kind === 'speaker' ? api.deleteSpeaker : api.deleteClip;
  const expectOriginal = () => {
    expect(component.speakers()).toEqual([speaker]);
    expect(component.clips()).toEqual([clip]);
  };
  const prepareRefresh = () => {
    api.speakers.mockReturnValue(of(kind === 'speaker' ? [] : [speaker]));
    api.clips.mockReturnValue(of(kind === 'clip' ? [] : [{...clip, speakerId: null}]));
  };
  const expectRefreshed = () => {
    expect(api.speakers).toHaveBeenCalledTimes(2);
    expect(api.clips).toHaveBeenCalledTimes(2);
    expect(component.speakers()).toEqual(kind === 'speaker' ? [] : [speaker]);
    expect(component.clips()).toEqual(kind === 'clip' ? [] : [{...clip, speakerId: null}]);
  };

  beforeEach(() => {
    api = {
      speakers: jest.fn().mockReturnValue(of([speaker])), clips: jest.fn().mockReturnValue(of([clip])),
      deleteSpeaker: jest.fn(), deleteClip: jest.fn(),
    };
    TestBed.configureTestingModule({providers: [{provide: AdminApi, useValue: api}]});
    component = TestBed.runInInjectionContext(() => new AdminMediaPageComponent());
  });

  afterEach(() => TestBed.resetTestingModule());

  it('identifies the object in a confirmation and cancels without sending a request', () => {
    open();
    expect(component.deletionTitle()).toBe(kind === 'speaker' ? 'Удалить спикера' : 'Удалить клип');
    expect(component.deletionMessage()).toContain(kind === 'speaker' ? speaker.name : component.mediaSummary(clip));
    if (kind === 'clip') {
      expect(component.deletionMessage()).toContain(clip.kind);
      expect(component.deletionMessage()).toContain(clip.id.slice(0, 8));
    }
    expect(api.deleteSpeaker).not.toHaveBeenCalled();
    expect(api.deleteClip).not.toHaveBeenCalled();
    component.onDeletionVisibleChange(false);
    component.confirmDeletion();
    expect(component.pendingDeletion()).toBeNull();
    expect(api.deleteSpeaker).not.toHaveBeenCalled();
    expect(api.deleteClip).not.toHaveBeenCalled();
    expect(api.speakers).toHaveBeenCalledTimes(1);
    expect(api.clips).toHaveBeenCalledTimes(1);
    expectOriginal();
  });

  it('locks submission and closing and refreshes both lists only after successful deletion', () => {
    const request = new Subject<void>();
    selectedApi().mockReturnValue(request);
    open();
    const action = component.pendingDeletion();
    component.confirmDeletion();
    expect(selectedApi()).toHaveBeenCalledWith(kind === 'speaker' ? speaker.id : clip.id);
    expect(component.deletionSaving()).toBe(true);
    expect(component.subtitlesSaving()).toBe(false);
    expectOriginal();
    component.confirmDeletion();
    component.closeDeletion();
    component.onDeletionVisibleChange(false);
    component.removeSpeaker({...speaker, id: 'replacement'});
    component.removeClip({...clip, id: 'replacement'});
    expect(component.pendingDeletion()).toBe(action);
    expect(selectedApi()).toHaveBeenCalledTimes(1);
    expect(kind === 'speaker' ? api.deleteClip : api.deleteSpeaker).not.toHaveBeenCalled();
    expect(api.speakers).toHaveBeenCalledTimes(1);
    expect(api.clips).toHaveBeenCalledTimes(1);
    prepareRefresh();
    request.next();
    request.complete();
    expectRefreshed();
    expect(component.deletionSaving()).toBe(false);
    expect(component.pendingDeletion()).toBeNull();
  });

  it('shows API error detail within the dialog and allows retry without losing the object', () => {
    const request = new Subject<void>();
    const retry = new Subject<void>();
    selectedApi().mockReturnValueOnce(request).mockReturnValueOnce(retry);
    open();
    const action = component.pendingDeletion();
    component.confirmDeletion();
    request.error({error: {message: 'unavailable'}, status: 503});
    expectOriginal();
    expect(api.speakers).toHaveBeenCalledTimes(1);
    expect(api.clips).toHaveBeenCalledTimes(1);
    expect(component.pendingDeletion()).toBe(action);
    expect(component.deletionError()).toBe(kind === 'speaker'
      ? 'Не получилось удалить спикера: unavailable' : 'Не получилось удалить клип: unavailable');
    expect(component.error()).toBeNull();
    expect(component.deletionSaving()).toBe(false);
    component.confirmDeletion();
    expect(component.deletionError()).toBeNull();
    expect(component.deletionSaving()).toBe(true);
    expect(selectedApi()).toHaveBeenCalledTimes(2);
    prepareRefresh();
    retry.next();
    retry.complete();
    expectRefreshed();
    expect(component.pendingDeletion()).toBeNull();
    expect(component.deletionError()).toBeNull();
  });
});
