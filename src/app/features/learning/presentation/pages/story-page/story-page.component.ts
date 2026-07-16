import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {StoryFacade} from '../../../application/facades/story.facade';
import {StoryLine} from '../../../domain/entities/story.entity';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {VOCABULARY_REPOSITORY} from '@features/vocabulary/domain/repositories/vocabulary.repository';
import {VocabularyHttpRepository} from '@features/vocabulary/infrastructure/vocabulary.http-repository';

@Component({
  selector: 'hg-story-page',
  imports: [RouterLink],
  providers: [
    StoryFacade,
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

  readonly facade = inject(StoryFacade);
  private vocabulary = inject(VocabularyFacade);
  private router = inject(Router);

  readonly addedWords = signal<Set<string>>(new Set());

  constructor() {
    setTimeout(() => this.facade.load(this.id()));
  }

  toggleLine(line: StoryLine): void {
    this.facade.toggleLine(line);
  }

  onTime(event: Event): void {
    this.facade.onTime((event.target as HTMLMediaElement).currentTime);
  }

  /** "Добавлено в словарь" помечается только после успешного ответа сервера — не оптимистично. */
  addWord(wordId: string): void {
    this.vocabulary.addWordToVocabulary(wordId).subscribe({
      next: () => this.addedWords.update(set => new Set(set).add(wordId)),
    });
  }

  complete(): void {
    this.facade.complete(this.id());
  }

  back(): void {
    this.router.navigate(['/learn']);
  }
}
