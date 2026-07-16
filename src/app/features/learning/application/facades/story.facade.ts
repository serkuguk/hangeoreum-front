import {Injectable, computed, inject, signal} from '@angular/core';
import {LEARNING_REPOSITORY} from '../../domain/repositories/learning.repository';
import {Story, StoryLine} from '../../domain/entities/story.entity';

export type StoryMode = 'watch' | 'read' | 'listen';

/** Владеет load/playback/completion Story. Добавление слов остаётся во VocabularyFacade — не дублируется здесь. */
@Injectable()
export class StoryFacade {
  private repository = inject(LEARNING_REPOSITORY);

  readonly story = signal<Story | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<StoryMode>('watch');
  readonly openLine = signal<number | null>(null);
  readonly activeLine = signal<number | null>(null); // подсветка по таймкодам
  readonly completed = signal(false);

  readonly hasVideo = computed(() => !!this.story()?.clip?.videoUrl);

  load(lessonId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.story(lessonId).subscribe({
      next: story => {
        this.story.set(story);
        this.loading.set(false);
        if (!story.clip?.videoUrl) this.mode.set('read'); // fallback без видео
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
    // story завершается «просмотром» — очков нет
    this.repository.complete(lessonId, 100, 100).subscribe({
      next: () => this.completed.set(true),
      error: () => this.completed.set(true),
    });
  }
}
