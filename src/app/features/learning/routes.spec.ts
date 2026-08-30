import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, withComponentInputBinding} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {ENV} from '@core/tokens/environment.token';
import {StoryPageComponent} from './presentation/pages/story-page/story-page.component';
import {learningRoutes} from './routes';

describe('Story route composition', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{path: 'learn', children: learningRoutes}], withComponentInputBinding()),
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
    const component = await harness.navigateByUrl('/learn/lesson-1/story', StoryPageComponent);
    http.expectOne('/api/lessons/lesson-1/story').flush({
      id: 'story-1',
      title: 'Кофе',
      clip: null,
      lines: [{
        position: 1,
        speaker: '민수',
        textKo: '커피 주세요',
        textTranslation: 'Кофе, пожалуйста',
        breakdown: [{token: '커피', note: 'кофе', wordId: 'word-1'}],
        startMs: null,
        endMs: null,
      }],
    });
    harness.detectChanges();

    (harness.routeNativeElement!.querySelector('.dline-toggle') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(harness.routeNativeElement!.textContent).toContain('커피');

    (harness.routeNativeElement!.querySelector('.addw button') as HTMLButtonElement).click();
    expect(component.vocabulary.addState('word-1')).toBe('saving');
    http.expectOne('/api/vocabulary/words/word-1/add').flush(null, {status: 500, statusText: 'Server Error'});
    harness.detectChanges();
    expect(component.vocabulary.addState('word-1')).toBe('error');
    expect(harness.routeNativeElement!.textContent).toContain('Повторить');

    (harness.routeNativeElement!.querySelector('.addw button') as HTMLButtonElement).click();
    expect(component.vocabulary.addState('word-1')).toBe('saving');
    http.expectOne('/api/vocabulary/words/word-1/add').flush({});
    harness.detectChanges();
    expect(component.vocabulary.addState('word-1')).toBe('saved');
    expect(harness.routeNativeElement!.textContent).toContain('в словаре');
  });
});
