import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, throwError} from 'rxjs';
import {ImmerseFacade} from './immerse.facade';
import {CLIP_REPOSITORY} from './clip-repository.token';
import {Clip, ClipRepository} from '../domain/clip.entity';

const clip: Clip = {id: 'clip', kind: 'STORY', speakerId: null, wordId: null, videoUrl: null, audioUrl: null, thumbnailUrl: null, durationMs: null, subtitles: [], watched: false, liked: false};
describe('ImmerseFacade', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([403, 500])('clears feed errors and access state on retry after %s', status => {
    const feed = jest.fn<ClipRepository['feed']>().mockReturnValueOnce(throwError(() => ({status}))).mockReturnValueOnce(of({content: [clip], nextCursor: null}));
    TestBed.configureTestingModule({providers: [ImmerseFacade, {provide: CLIP_REPOSITORY, useValue: {feed}}]});
    const facade = TestBed.inject(ImmerseFacade);
    facade.load();
    expect(facade.proRequired() || facade.error()).toBeTruthy();
    facade.load();
    expect(facade.error()).toBeNull();
    expect(facade.proRequired()).toBe(false);
    expect(facade.clips()).toEqual([clip]);
  });
  it('keeps the feed visible and rolls optimistic actions back on failure', () => {
    TestBed.configureTestingModule({providers: [ImmerseFacade, {provide: CLIP_REPOSITORY, useValue: {
      feed: () => of({content: [clip], nextCursor: null}),
      toggleLike: () => throwError(() => new Error('network')),
      markViewed: () => throwError(() => new Error('network')),
    }}]});
    const facade = TestBed.inject(ImmerseFacade);
    facade.load();
    facade.toggleLike(clip);
    facade.markViewed(clip);
    expect(facade.error()).toBeNull();
    expect(facade.actionError()).toBeTruthy();
    expect(facade.clips()).toEqual([clip]);
  });
});
