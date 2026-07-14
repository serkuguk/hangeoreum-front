import {Injectable, computed, inject, signal} from '@angular/core';
import {Exercise, Lesson, Tip} from '../../domain/entities/exercise.entity';
import {LessonSession} from '../../domain/services/lesson-session';
import {CompleteResult, LEARNING_REPOSITORY} from '../../domain/repositories/learning.repository';

export interface Feedback {
  correct: boolean;
  expected?: string;
  note?: string;
}

@Injectable()
export class LessonFacade {
  private repository = inject(LEARNING_REPOSITORY);
  private session: LessonSession | null = null;

  readonly lesson = signal<Lesson | null>(null);
  readonly tip = signal<Tip | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly current = signal<Exercise | null>(null);
  readonly solved = signal(0);
  readonly total = signal(0);
  readonly feedback = signal<Feedback | null>(null);
  readonly result = signal<CompleteResult | null>(null);
  readonly finishing = signal(false);

  readonly progressSegments = computed(() =>
    Array.from({length: this.total()}, (_, i) => i < this.solved()));

  /** Есть незавершённая сессия (для confirm при выходе). */
  get inProgress(): boolean {
    return !!this.session && !this.session.done && this.result() === null;
  }

  start(lessonId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.feedback.set(null);
    this.repository.lesson(lessonId).subscribe({
      next: lesson => {
        this.lesson.set(lesson);
        this.session = new LessonSession(lesson.exercises);
        this.total.set(this.session.total);
        this.solved.set(0);
        this.current.set(this.session.current);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить урок.');
        this.loading.set(false);
      },
    });
  }

  loadTip(lessonId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.tip(lessonId).subscribe({
      next: tip => {
        this.tip.set(tip);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Подсказка недоступна.');
        this.loading.set(false);
      },
    });
  }

  /** Компонент упражнения сообщил результат — показываем фидбек, очередь двигается по next(). */
  answered(feedback: Feedback): void {
    this.feedback.set(feedback);
  }

  next(): void {
    const session = this.session;
    const feedback = this.feedback();
    if (!session || !feedback) return;

    session.submit(feedback.correct);
    this.solved.set(session.solvedCount);
    this.feedback.set(null);

    if (session.done) {
      this.finish();
    } else {
      // null-кадр между упражнениями: компонент гарантированно пересоздаётся
      // с чистым состоянием (в т.ч. когда то же упражнение вернулось из очереди)
      this.current.set(null);
      setTimeout(() => this.current.set(session.current));
    }
  }

  private finish(): void {
    const lesson = this.lesson();
    const session = this.session;
    if (!lesson || !session) return;

    this.finishing.set(true);
    this.repository.complete(lesson.id, session.score, session.accuracy).subscribe({
      next: result => {
        this.result.set(result);
        this.finishing.set(false);
        this.session = null;
      },
      error: () => {
        // результат не сохранился — показываем экран награды без серверных цифр
        this.result.set({xp: 0, newWords: [], streak: 0, goalReached: false});
        this.finishing.set(false);
        this.session = null;
      },
    });
  }
}
