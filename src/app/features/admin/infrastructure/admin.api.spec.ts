import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ENV} from '@core/tokens/environment.token';
import {AdminApi} from './admin.api';

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
