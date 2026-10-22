import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {ENV} from '@core/tokens/environment.token';
import {ImmersePageComponent} from './presentation/pages/immerse-page/immerse-page.component';
import {mediaRoutes} from './routes';

describe('Immerse route composition', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{path: 'immerse', children: mediaRoutes}]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: ENV, useValue: {server_url: '/api'}},
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('resolves Vocabulary providers and retries add-word through its repository', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/immerse', ImmersePageComponent);
    http.expectOne(request => request.url === '/api/immerse/feed' && request.params.get('size') === '10').flush({
      content: [{
        id: 'clip-1',
        kind: 'WORD', title: 'Приветствие', position: 0,
        speakerId: null,
        wordId: 'word-2',
        videoUrl: null,
        audioUrl: null,
        thumbnailUrl: null,
        durationMs: null,
        subtitles: [
          {lang: 'ko', text: '안녕하세요', position: 0, startMs: 0, endMs: 1000},
          {lang: 'ko', text: '반갑습니다', position: 1, startMs: 1000, endMs: 2000},
        ],
        watched: false,
        liked: false,
      }],
      nextCursor: null, selectedUnit: {id: 'u', title: 'Unit', description: null, position: 0}, units: [],
    });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('안녕하세요');
    const video = harness.routeNativeElement!.querySelector('video')!;
    expect(video.autoplay).toBe(false);
    expect(video.loop).toBe(false);
    http.expectNone('/api/immerse/clip-1/view');
    video.currentTime = 1;
    video.dispatchEvent(new Event('timeupdate'));
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('반갑습니다');
    expect(harness.routeNativeElement!.textContent).not.toContain('안녕하세요');
    video.currentTime = 0.5;
    video.dispatchEvent(new Event('seeked'));
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('안녕하세요');
    video.dispatchEvent(new Event('ended'));
    http.expectOne('/api/immerse/clip-1/view').flush(null);
    expect(component.ended()).toBe(true);

    const addButton = harness.routeNativeElement!.querySelector('[aria-label="Слово в словарь"]') as HTMLButtonElement;
    addButton.click();
    expect(component.vocabulary.addState('word-2')).toBe('saving');
    http.expectOne('/api/vocabulary/words/word-2/add').flush(null, {status: 500, statusText: 'Server Error'});
    harness.detectChanges();
    expect(component.vocabulary.addState('word-2')).toBe('error');
    expect(addButton.disabled).toBe(false);

    addButton.click();
    expect(component.vocabulary.addState('word-2')).toBe('saving');
    http.expectOne('/api/vocabulary/words/word-2/add').flush({});
    harness.detectChanges();
    expect(component.vocabulary.addState('word-2')).toBe('saved');
    expect(addButton.textContent).toContain('✓');
  });
});
