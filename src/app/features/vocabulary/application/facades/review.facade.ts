import {DestroyRef, Injectable, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SrsQuality, UserWord} from '../../domain/entities/user-word.entity';
import {previewLabel} from '../../domain/services/srs';
import {
  FinishResult,
  ReviewMode,
  ReviewSummary,
  VOCABULARY_REPOSITORY,
} from '../../domain/repositories/vocabulary.repository';

@Injectable()
export class ReviewFacade {
  private repository = inject(VOCABULARY_REPOSITORY);
  private destroyRef = inject(DestroyRef);

  readonly summary = signal<ReviewSummary | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private sessionId: string | null = null;
  private answers: {wordId: string; quality: number}[] = [];

  readonly queue = signal<UserWord[]>([]);
  readonly index = signal(0);
  readonly current = computed<UserWord | null>(() => this.queue()[this.index()] ?? null);
  readonly total = computed(() => this.queue().length);
  readonly correctCount = signal(0);
  readonly hardWords = signal<UserWord[]>([]);
  readonly result = signal<FinishResult | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  loadSummary(): void {
    this.loading.set(true);
    this.repository.summary().subscribe({
      next: summary => {
        this.summary.set(summary);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить сводку повторения.');
        this.loading.set(false);
      },
    });
  }

  start(mode: ReviewMode, opts?: {limit?: number; difficultOnly?: boolean; deckId?: string}): void {
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.saving.set(false);
    this.saveError.set(null);
    this.answers = [];
    this.correctCount.set(0);
    this.hardWords.set([]);
    this.index.set(0);
    this.repository.startSession(mode, opts).subscribe({
      next: session => {
        this.sessionId = session.id;
        this.queue.set(session.cards);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err?.error?.code === 'LIMIT_REACHED'
          ? 'Дневной лимит бесплатных игр исчерпан.'
          : 'Не получилось начать сессию.');
        this.loading.set(false);
      },
    });
  }

  /** Подписи интервалов на кнопках оценки для текущей карточки. */
  intervalLabel(quality: SrsQuality): string {
    const word = this.current();
    if (!word) return '';
    // interval приближаем из dueDate (бэк не отдаёт его в DTO) — подписи ориентировочные
    const approxInterval = Math.max(1, Math.round(
      (new Date(word.dueDate).getTime() - Date.now()) / 86_400_000));
    return previewLabel(
      {repetitions: word.repetitions, easeFactor: word.easeFactor, interval: approxInterval},
      quality,
    );
  }

  rate(quality: SrsQuality): void {
    const word = this.current();
    if (!word || this.saving()) return;

    this.answers.push({wordId: word.word.id, quality});
    if (quality >= 3) {
      this.correctCount.update(n => n + 1);
    } else {
      this.hardWords.update(list => [...list, word]);
    }

    if (this.index() + 1 >= this.total()) {
      this.finish();
    } else {
      this.index.update(i => i + 1);
    }
  }

  /** Игровая сессия: ответы приходят пачкой из GameEngine. */
  finishWithAnswers(answers: {wordId: string; quality: number}[]): void {
    this.answers = answers;
    this.correctCount.set(answers.filter(a => a.quality >= 3).length);
    this.finish();
  }

  retryFinish(): void {
    this.finish();
  }

  private finish(): void {
    const sessionId = this.sessionId;
    if (!sessionId || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.repository.submitAnswers(sessionId, this.answers).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.repository.finishSession(sessionId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: result => {
            this.result.set(result);
            this.saving.set(false);
            this.sessionId = null;
          },
          error: () => this.failFinish(),
        });
      },
      error: () => this.failFinish(),
    });
  }

  private failFinish(): void {
    this.saving.set(false);
    this.saveError.set('Не получилось сохранить повторение. Повторите попытку.');
  }
}
