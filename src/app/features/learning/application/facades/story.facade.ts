import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subscription, filter, switchMap, take, timer} from 'rxjs';
import {LEARNING_REPOSITORY} from '../learning-repository.token';
import {Story, StoryLine} from '../../domain/entities/story.entity';
import {LearnMapFacade} from './learn-map.facade';

export type StoryMode = 'watch' | 'read' | 'listen';

/** Владеет load/playback/completion Story. Добавление слов остаётся во WordAdditionFacade. */
@Injectable()
export class StoryFacade {
  private readonly repository = inject(LEARNING_REPOSITORY);
  private readonly map = inject(LearnMapFacade);
  private readonly destroyRef = inject(DestroyRef);
  private attemptId: string | null = null;
  private completionPolling: Subscription | null = null;

  readonly story = signal<Story | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<StoryMode>('watch');
  readonly openLine = signal<number | null>(null);
  readonly activeLine = signal<number | null>(null);
  readonly completed = signal(false);
  readonly completing = signal(false);
  readonly completionError = signal<string | null>(null);

  readonly hasVideo = computed(() => !!this.story()?.clip?.videoUrl);

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelCompletionPolling());
  }

  load(lessonId: string): void {
    this.cancelCompletionPolling();
    this.loading.set(true);
    this.error.set(null);
    this.completed.set(false);
    this.completing.set(false);
    this.completionError.set(null);
    this.attemptId = null;
    this.repository.story(lessonId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: story => {
        this.story.set(story);
        this.loading.set(false);
        if (!story.clip?.videoUrl) this.mode.set('read');
      },
      error: err => {
        this.error.set(err?.status === 403
          ? 'Story — Pro-фича. Открой все истории с подпиской.'
          : 'Не получилось загрузить story.');
        this.loading.set(false);
      },
    });
  }

  toggleLine(line: StoryLine): void {
    this.openLine.update(current => current === line.position ? null : line.position);
  }

  /** timeupdate видео/аудио → активная строка по start/end (строк немного, линейный поиск). */
  onTime(currentTimeSec: number): void {
    const ms = currentTimeSec * 1000;
    const line = this.story()?.lines.find(l =>
      l.startMs !== null && l.endMs !== null && ms >= l.startMs && ms < l.endMs);
    this.activeLine.set(line?.position ?? null);
  }

  complete(lessonId: string): void {
    if (this.completing() || this.completed()) return;
    this.attemptId ??= crypto.randomUUID();
    this.completing.set(true);
    this.completionError.set(null);
    this.repository.complete(lessonId, {
      attemptId: this.attemptId,
      score: 100,
      accuracy: 100,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: accepted => this.pollCompletion(accepted.attemptId),
      error: () => {
        this.completing.set(false);
        this.completionError.set('Не получилось сохранить прогресс Story. Повторите попытку.');
      },
    });
  }

  private pollCompletion(attemptId: string): void {
    this.completionPolling = timer(0, 500).pipe(
      switchMap(() => this.repository.getCompletionStatus(attemptId)),
      filter(response => response.status === 'COMPLETED'),
      take(1),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe({
      next: () => {
        this.completed.set(true);
        this.completing.set(false);
        this.map.invalidate();
      },
      error: () => {
        this.completing.set(false);
        this.completionError.set('Не получилось сохранить прогресс Story. Повторите попытку.');
      },
    });
  }

  private cancelCompletionPolling(): void {
    this.completionPolling?.unsubscribe();
    this.completionPolling = null;
  }
}
