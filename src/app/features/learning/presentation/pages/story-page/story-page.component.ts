import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {LEARNING_REPOSITORY} from '../../../domain/repositories/learning.repository';
import {Story, StoryLine} from '../../../domain/entities/story.entity';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {VOCABULARY_REPOSITORY} from '@features/vocabulary/domain/repositories/vocabulary.repository';
import {VocabularyHttpRepository} from '@features/vocabulary/infrastructure/vocabulary.http-repository';

type StoryMode = 'watch' | 'read' | 'listen';

@Component({
  selector: 'hg-story-page',
  imports: [RouterLink],
  providers: [
    // ACL: слова добавляются через фасад контекста vocabulary
    {provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository},
    VocabularyFacade,
  ],
  templateUrl: './story-page.component.html',
  styleUrl: './story-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryPageComponent {
  readonly id = input.required<string>();

  private repository = inject(LEARNING_REPOSITORY);
  private vocabulary = inject(VocabularyFacade);
  private router = inject(Router);

  readonly story = signal<Story | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly mode = signal<StoryMode>('watch');
  readonly openLine = signal<number | null>(null);
  readonly activeLine = signal<number | null>(null); // подсветка по таймкодам
  readonly completed = signal(false);
  readonly addedWords = signal<Set<string>>(new Set());

  readonly hasVideo = computed(() => !!this.story()?.clip?.videoUrl);

  constructor() {
    setTimeout(() => this.load());
  }

  private load(): void {
    this.repository.story(this.id()).subscribe({
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
  onTime(event: Event): void {
    const ms = (event.target as HTMLMediaElement).currentTime * 1000;
    const line = this.story()?.lines.find(l =>
      l.startMs !== null && l.endMs !== null && ms >= l.startMs && ms < l.endMs);
    this.activeLine.set(line?.position ?? null);
  }

  addWord(wordId: string): void {
    this.vocabulary.addWordToVocabulary(wordId);
    this.addedWords.update(set => new Set(set).add(wordId));
  }

  complete(): void {
    // story завершается «просмотром» — очков нет
    this.repository.complete(this.id(), 100, 100).subscribe({
      next: () => this.completed.set(true),
      error: () => this.completed.set(true),
    });
  }

  back(): void {
    this.router.navigate(['/learn']);
  }
}
