import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ENV} from '@core/tokens/environment.token';
import {AdminApi, MonitoringHistoryKind} from './admin.api';

describe('AdminApi word media contract', () => {
  let api: AdminApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [
      provideHttpClient(), provideHttpClientTesting(), AdminApi,
      {provide: ENV, useValue: {server_url: '/api'}},
    ]});
    api = TestBed.inject(AdminApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('loads monitoring without the legacy user detail or payments', () => {
    let result: unknown;
    api.monitoring('user-id').subscribe(value => result = value);
    const request = http.expectOne('/api/admin/users/user-id/monitoring');
    expect(request.request.method).toBe('GET');
    request.flush({generatedAt: '2026-11-04T12:00:00Z'});
    expect(result).toEqual({generatedAt: '2026-11-04T12:00:00Z'});
  });

  it.each(Object.values(MonitoringHistoryKind))('loads the typed %s history with bounded page parameters', kind => {
    api.monitoringHistory('user-id', kind, 2, 50).subscribe();
    const request = http.expectOne(req => req.url === '/api/admin/users/user-id/monitoring/history');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['kind', 'page', 'size']);
    expect(request.request.params.get('kind')).toBe(kind);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('50');
    request.flush({content: [], totalElements: 0, page: 2});
  });

  it('uses default pages and keeps lesson and review detail contracts separate', () => {
    api.monitoringHistory('u', MonitoringHistoryKind.Sessions).subscribe();
    let request = http.expectOne(req => req.url.endsWith('/monitoring/history'));
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({content: [], totalElements: 0, page: 0});
    api.monitoringSession('u', 'lesson-session', 3, 10).subscribe();
    request = http.expectOne(req => req.url.endsWith('/monitoring/sessions/lesson-session'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('page')).toBe('3');
    expect(request.request.params.get('size')).toBe('10');
    request.flush({results: {content: [], totalElements: 0, page: 3}});
    api.monitoringReviewAnswers('u', 'review-session', 4).subscribe();
    request = http.expectOne(req => req.url.endsWith('/monitoring/history'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('kind')).toBe('reviews');
    expect(request.request.params.get('sessionId')).toBe('review-session');
    expect(request.request.params.get('page')).toBe('4');
    expect(request.request.params.get('size')).toBe('20');
    request.flush({content: [], totalElements: 0, page: 4});
  });

  it.each(['image', 'audio'] as const)('sends %s using the backend multipart type field', kind => {
    const file = new File(['media'], kind === 'image' ? 'word.png' : 'word.mp3', {
      type: kind === 'image' ? 'image/png' : 'audio/mpeg',
    });
    let result: unknown;
    api.uploadWordMedia('word-1', file, kind).subscribe(word => result = word);

    const request = http.expectOne('/api/admin/words/word-1/media');
    expect(request.request.method).toBe('POST');
    const body = request.request.body as FormData;
    expect(body.get('file')).toBe(file);
    expect(body.get('type')).toBe(kind);
    expect(body.has('kind')).toBe(false);
    // The browser must set the multipart boundary.
    expect(request.request.headers.has('Content-Type')).toBe(false);
    request.flush({id: 'word-1', imageUrl: '/uploads/word.png'});
    expect(result).toEqual({id: 'word-1', imageUrl: '/uploads/word.png'});
  });
});
