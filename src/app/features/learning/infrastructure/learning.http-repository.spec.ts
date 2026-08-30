import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {ENV} from '@core/tokens/environment.token';
import {CompletionAccepted, CompletionStatus} from '../domain/repositories/learning.repository';
import {LearningHttpRepository} from './learning.http-repository';

describe('LearningHttpRepository', () => {
  let repository: LearningHttpRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: ENV, useValue: {server_url: '/api/v1'}},
        LearningHttpRepository,
      ],
    });
    repository = TestBed.inject(LearningHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('принимает receipt из POST completion с HTTP 202', () => {
    let received: CompletionAccepted | undefined;
    repository.complete('lesson-1', {attemptId: 'attempt-1', score: 80, accuracy: 90})
      .subscribe(response => received = response);

    const request = http.expectOne('/api/v1/lessons/lesson-1/complete');
    expect(request.request.method).toBe('POST');
    request.flush(
      {attemptId: 'attempt-1', acceptedAt: '2026-08-28T12:00:00Z', status: 'PENDING'},
      {status: 202, statusText: 'Accepted'},
    );

    expect(received).toEqual({attemptId: 'attempt-1', acceptedAt: '2026-08-28T12:00:00Z', status: 'PENDING'});
  });

  it.each<CompletionStatus>([
    {status: 'PENDING', result: null},
    {
      status: 'COMPLETED',
      result: {
        attemptId: 'attempt-1', savedAt: '2026-08-28T12:00:01Z', xp: 20,
        newWords: [{id: 'word-1', hangul: '안녕', romanization: 'annyeong', translation: 'привет'}],
        streak: 3, goalReached: true,
      },
    },
  ])('читает status $status', response => {
    let received: CompletionStatus | undefined;
    repository.getCompletionStatus('attempt-1').subscribe(status => received = status);

    http.expectOne('/api/v1/lessons/attempts/attempt-1').flush(response);

    expect(received).toEqual(response);
  });
});
