import {Observable, Subscription, defer, retry, throwError, timer} from 'rxjs';
import {ExerciseResultRequest, LearningRepository} from '../domain/repositories/learning.repository';

/** Learning-only, best-effort delivery; completion never waits for this queue. */
export class LessonTracking {
  private requests = new Subscription();
  private pending: Array<() => Observable<void>> = [];
  private active = false;
  private enabled = false;

  constructor(private readonly repository: LearningRepository) {}

  start(lessonId: string, sessionId: string): void {
    this.reset();
    this.enabled = true;
    this.send(() => this.repository.startSession(lessonId, {sessionId}), true);
  }

  record(lessonId: string, sessionId: string, result: ExerciseResultRequest): void {
    // ponytail: at most 100 waiting events, lost on overflow/teardown; use a durable queue only if required.
    if (!this.enabled || this.pending.length >= 100) return;
    this.pending.push(() => this.repository.recordExerciseResult(lessonId, sessionId, result));
    this.drain();
  }

  reset(): void {
    this.enabled = false;
    this.requests.unsubscribe();
    this.requests = new Subscription();
    this.pending = [];
    this.active = false;
  }

  private drain(): void {
    if (!this.enabled || this.active) return;
    const request = this.pending.shift();
    if (request) this.send(request, false);
  }

  private send(request: () => Observable<void>, start: boolean): void {
    this.active = true;
    this.requests.add(defer(request).pipe(retry({
      count: 2,
      delay: error => error?.status === 0 || (error?.status >= 500 && error?.status < 600)
        ? timer(250)
        : throwError(() => error),
    })).subscribe({
      complete: () => {
        this.active = false;
        this.drain();
      },
      error: () => {
        this.active = false;
        if (start) this.reset();
        else this.drain();
      },
    }));
  }
}
