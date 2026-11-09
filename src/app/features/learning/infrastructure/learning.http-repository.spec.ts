import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {ENV} from '@core/tokens/environment.token';
import {CompletionAccepted, CompletionStatus, ExerciseResultRequest} from '../domain/repositories/learning.repository';
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

  it.each([201, 200])('отправляет стабильный sessionId при старте с HTTP %i', status => {
    const body = {sessionId: 'session-1'};
    const received = jest.fn();
    repository.startSession('lesson-1', body).subscribe(received);

    const request = http.expectOne('/api/v1/lessons/lesson-1/sessions');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(null, {status, statusText: status === 201 ? 'Created' : 'OK'});

    expect(received).toHaveBeenCalledWith(null);
  });

  it.each<{status: number; body: ExerciseResultRequest}>([
    {status: 201, body: {sequence: 1, exerciseId: 'exercise-1', correct: false, expected: '안녕'}},
    {status: 200, body: {sequence: 1, exerciseId: 'exercise-1', correct: false, mistakes: 2}},
    {status: 201, body: {sequence: 2, exerciseId: 'exercise-1', correct: true}},
  ])('отправляет sequence и только итоговые данные результата с HTTP $status', ({status, body}) => {
    const received = jest.fn();
    repository.recordExerciseResult('lesson-1', 'session-1', body).subscribe(received);

    const request = http.expectOne('/api/v1/lessons/lesson-1/sessions/session-1/results');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(null, {status, statusText: status === 201 ? 'Created' : 'OK'});

    expect(received).toHaveBeenCalledWith(null);
  });

  it.each([403, 409, 500])('передаёт ошибку tracking HTTP %i вызывающему коду без retry', status => {
    const startError = jest.fn();
    const resultError = jest.fn();
    repository.startSession('lesson-1', {sessionId: 'session-1'}).subscribe({error: startError});
    repository.recordExerciseResult('lesson-1', 'session-1', {
      sequence: 1, exerciseId: 'exercise-1', correct: true,
    }).subscribe({error: resultError});

    http.expectOne('/api/v1/lessons/lesson-1/sessions')
      .flush(null, {status, statusText: 'Tracking error'});
    http.expectOne('/api/v1/lessons/lesson-1/sessions/session-1/results')
      .flush(null, {status, statusText: 'Tracking error'});

    expect(startError).toHaveBeenCalledWith(expect.objectContaining({status}));
    expect(resultError).toHaveBeenCalledWith(expect.objectContaining({status}));
  });

  it('принимает receipt из POST completion с HTTP 202', () => {
    let received: CompletionAccepted | undefined;
    repository.complete('lesson-1', {attemptId: 'attempt-1', score: 80, accuracy: 90})
      .subscribe(response => received = response);

    const request = http.expectOne('/api/v1/lessons/lesson-1/complete');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({attemptId: 'attempt-1', score: 80, accuracy: 90});
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
