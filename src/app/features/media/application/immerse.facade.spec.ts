import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {of, Subject, throwError} from 'rxjs';
import {ImmerseFacade} from './immerse.facade';
import {CLIP_REPOSITORY} from './clip-repository.token';
import {Clip, ClipRepository, Feed} from '../domain/clip.entity';

const clip: Clip = {id: 'clip', title: 'Greeting', position: 0, kind: 'IMMERSE', speakerId: null, wordId: null, videoUrl: null, audioUrl: null, thumbnailUrl: null, durationMs: null, subtitles: [], watched: false, liked: false};
const unit = {id: 'unit', title: 'Unit', description: null, position: 0};
const page: Feed = {content: [clip], nextCursor: null, selectedUnit: unit, units: [unit]};
function setup(repository: Partial<ClipRepository>): ImmerseFacade {
  TestBed.configureTestingModule({providers: [ImmerseFacade, {provide: CLIP_REPOSITORY, useValue: repository}]});
  return TestBed.inject(ImmerseFacade);
}
describe('ImmerseFacade', () => {
  afterEach(() => TestBed.resetTestingModule());
  it.each([403, 500])('clears feed errors and access state on retry after %s', status => {
    const feed = jest.fn<ClipRepository['feed']>().mockReturnValueOnce(throwError(() => ({status}))).mockReturnValueOnce(of(page));
    const facade = setup({feed});
    facade.load();
    expect(facade.proRequired() || facade.error()).toBeTruthy();
    facade.loadMore();
    expect(facade.error()).toBeNull();
    expect(facade.proRequired()).toBe(false);
    expect(facade.clips()).toEqual([clip]);
  });
  it('cancels stale initial loads, binds pagination to chosen unit and preserves retry cursor', () => {
    const initial = new Subject<Feed>();
    const feed = jest.fn<ClipRepository['feed']>().mockReturnValueOnce(initial)
      .mockReturnValueOnce(of({...page, nextCursor: 'cursor'}))
      .mockReturnValueOnce(throwError(() => ({status: 500}))).mockReturnValueOnce(of({...page, content: []}));
    const facade = setup({feed});
    facade.load();
    facade.load(unit.id);
    expect(initial.observed).toBe(false);
    initial.next({...page, content: []});
    expect(facade.clips()).toEqual([clip]);
    facade.loadMore();
    facade.loadMore();
    expect(feed.mock.calls).toEqual([[null, null], [null, unit.id], ['cursor', unit.id], ['cursor', unit.id]]);
    expect(facade.hasMore()).toBe(false);
  });
  it('keeps the feed visible and rolls optimistic actions back on failure', () => {
    const facade = setup({feed: () => of(page), toggleLike: () => throwError(() => new Error('network')), markViewed: () => throwError(() => new Error('network'))});
    facade.load(); facade.toggleLike(clip); facade.markViewed(clip);
    expect(facade.error()).toBeNull(); expect(facade.actionError()).toBeTruthy(); expect(facade.clips()).toEqual([clip]);
  });
  it('ignores historical watched, retries canceled view and deduplicates successful completions', () => {
    const pending = new Subject<void>();
    const markViewed = jest.fn<ClipRepository['markViewed']>().mockReturnValueOnce(pending).mockReturnValue(of(undefined));
    const facade = setup({feed: () => of(page), markViewed});
    const watched = {...clip, watched: true};
    facade.markViewed(watched); facade.cancel(); facade.markViewed(watched); facade.markViewed(watched);
    expect(markViewed).toHaveBeenCalledTimes(2);
    expect(pending.observed).toBe(false);
  });
  it('cancels pending requests on destroy', () => {
    const pending = new Subject<Feed>(); const facade = setup({feed: () => pending});
    facade.load(); TestBed.resetTestingModule(); expect(pending.observed).toBe(false);
  });
});
