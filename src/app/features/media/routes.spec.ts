import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {ENV} from '@core/tokens/environment.token';
import {ImmersePageComponent} from './presentation/pages/immerse-page/immerse-page.component';
import {mediaRoutes} from './routes';

class IntersectionObserverMock {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: readonly number[] = [];
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
}

describe('Immerse route composition', () => {
  let http: HttpTestingController;
  let originalIntersectionObserver: typeof IntersectionObserver;

  beforeEach(() => {
    originalIntersectionObserver = globalThis.IntersectionObserver;
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: IntersectionObserverMock,
    });
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
    Object.defineProperty(globalThis, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: originalIntersectionObserver,
    });
    TestBed.resetTestingModule();
  });

  it('resolves Vocabulary providers and retries add-word through its repository', async () => {
    const harness = await RouterTestingHarness.create();
    const component = await harness.navigateByUrl('/immerse', ImmersePageComponent);
    http.expectOne(request => request.url === '/api/immerse/feed' && request.params.get('size') === '10').flush({
      content: [{
        id: 'clip-1',
        kind: 'WORD',
        speakerId: null,
        wordId: 'word-2',
        videoUrl: null,
        audioUrl: null,
        thumbnailUrl: null,
        durationMs: null,
        subtitles: [{lang: 'ko', text: '안녕하세요'}],
        watched: false,
        liked: false,
      }],
      nextCursor: null,
    });
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('안녕하세요');

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
