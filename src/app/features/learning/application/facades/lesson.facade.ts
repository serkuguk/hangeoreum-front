import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Exercise, Lesson, Tip} from '../../domain/entities/exercise.entity';
import {LessonSession} from '../../domain/services/lesson-session';
import {
  CompleteRequest,
  CompleteResult,
  LEARNING_REPOSITORY,
} from '../../domain/repositories/learning.repository';
import {LearnMapFacade} from './learn-map.facade';

export interface Feedback {
  correct: boolean;
  expected?: string;
  note?: string;
}

export type LessonPhase = 'idle' | 'loading' | 'active' | 'saving' | 'save-error' | 'completed' | 'load-error';

interface PendingCompletion extends CompleteRequest {
  lessonId: string;
}

const PENDING_COMPLETION_KEY = 'hangeoreum.pending-lesson-completion';

@Injectable()
export class LessonFacade {
  private readonly repository = inject(LEARNING_REPOSITORY);
  private readonly map = inject(LearnMapFacade);
  private readonly destroyRef = inject(DestroyRef);
  private session: LessonSession | null = null;
  private pendingCompletion: PendingCompletion | null = null;
  private nextTimer: ReturnType<typeof setTimeout> | null = null;

  readonly lesson = signal<Lesson | null>(null);
  readonly tip = signal<Tip | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly phase = signal<LessonPhase>('idle');

  readonly current = signal<Exercise | null>(null);
  readonly solved = signal(0);
  readonly total = signal(0);
  readonly feedback = signal<Feedback | null>(null);
  readonly result = signal<CompleteResult | null>(null);
  readonly finishing = signal(false);
  readonly saveError = signal(false);

  readonly progressSegments = computed(() =>
    Array.from({length: this.total()}, (_, i) => i < this.solved()));

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.nextTimer) clearTimeout(this.nextTimer);
    });
  }

  /** Есть незавершённая сессия (для confirm при выходе). */
  get inProgress(): boolean {
    return this.result() === null && (!!this.pendingCompletion || (!!this.session && !this.session.done));
  }

  start(lessonId: string): void {
    this.resetForStart();
    this.loading.set(true);
    this.phase.set('loading');
    this.repository.lesson(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: lesson => this.beginLesson(lesson, lessonId),
      error: () => {
        this.error.set('Не получилось загрузить урок.');
        this.loading.set(false);
        this.phase.set('load-error');
      },
    });
  }

  loadTip(lessonId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.phase.set('loading');
    this.repository.tip(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: tip => {
        this.tip.set(tip);
        this.loading.set(false);
        this.phase.set('idle');
      },
      error: () => {
        this.error.set('Подсказка недоступна.');
        this.loading.set(false);
        this.phase.set('load-error');
      },
    });
  }

  /** Компонент упражнения сообщил результат — показываем фидбек, очередь двигается по next(). */
  answered(feedback: Feedback): void {
    if (this.phase() !== 'active') return;
    this.feedback.set(feedback);
  }

  next(): void {
    const session = this.session;
    const feedback = this.feedback();
    if (!session || !feedback || this.phase() !== 'active') return;

    session.submit(feedback.correct);
    this.solved.set(session.solvedCount);
    this.feedback.set(null);

    if (session.done) {
      this.finish();
      return;
    }

    // Null-кадр пересоздаёт dumb-компонент и очищает его локальное состояние.
    this.current.set(null);
    this.nextTimer = setTimeout(() => this.current.set(session.current));
  }

  retryFinish(): void {
    if (!this.pendingCompletion) return;
    this.complete(this.pendingCompletion);
  }

  private beginLesson(lesson: Lesson, lessonId: string): void {
    this.lesson.set(lesson);
    const pending = this.readPendingCompletion(lessonId);
    if (pending) {
      this.pendingCompletion = pending;
      this.total.set(lesson.exercises.length);
      this.loading.set(false);
      this.saveError.set(true);
      this.phase.set('save-error');
      return;
    }
    if (lesson.exercises.length === 0) {
      this.error.set('В уроке пока нет упражнений. Попробуйте позже.');
      this.loading.set(false);
      this.phase.set('load-error');
      return;
    }

    this.session = new LessonSession(lesson.exercises);
    this.total.set(this.session.total);
    this.solved.set(0);
    this.current.set(this.session.current);
    this.loading.set(false);
    this.phase.set('active');
  }

  private finish(): void {
    const lesson = this.lesson();
    const session = this.session;
    if (!lesson || !session) return;
    this.pendingCompletion = {
      lessonId: lesson.id,
      attemptId: crypto.randomUUID(),
      score: session.score,
      accuracy: session.accuracy,
    };
    this.complete(this.pendingCompletion);
  }

  private complete(pending: PendingCompletion): void {
    this.finishing.set(true);
    this.saveError.set(false);
    this.phase.set('saving');
    this.repository.complete(pending.lessonId, pending).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: result => {
        this.result.set(result);
        this.finishing.set(false);
        this.session = null;
        this.pendingCompletion = null;
        this.clearPendingCompletion();
        this.map.invalidate();
        this.phase.set('completed');
      },
      error: () => {
        this.finishing.set(false);
        this.saveError.set(true);
        this.persistPendingCompletion(pending);
        this.phase.set('save-error');
      },
    });
  }

  private resetForStart(): void {
    if (this.nextTimer) clearTimeout(this.nextTimer);
    this.session = null;
    this.pendingCompletion = null;
    this.lesson.set(null);
    this.result.set(null);
    this.feedback.set(null);
    this.current.set(null);
    this.solved.set(0);
    this.total.set(0);
    this.error.set(null);
    this.saveError.set(false);
    this.finishing.set(false);
  }

  private readPendingCompletion(lessonId: string): PendingCompletion | null {
    try {
      const raw = sessionStorage.getItem(PENDING_COMPLETION_KEY);
      const pending = raw ? JSON.parse(raw) as PendingCompletion : null;
      return pending?.lessonId === lessonId ? pending : null;
    } catch {
      return null;
    }
  }

  private persistPendingCompletion(pending: PendingCompletion): void {
    try {
      sessionStorage.setItem(PENDING_COMPLETION_KEY, JSON.stringify(pending));
    } catch {
      // Хранилище может быть выключено: retry в живой сессии всё равно использует тот же UUID.
    }
  }

  private clearPendingCompletion(): void {
    try {
      sessionStorage.removeItem(PENDING_COMPLETION_KEY);
    } catch {
      // Нет хранилища — нечего очищать.
    }
  }
}
