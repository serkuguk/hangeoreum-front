import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {StoryFacade} from '../../../application/facades/story.facade';
import {StoryLine} from '../../../domain/entities/story.entity';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';

@Component({
  selector: 'hg-story-page',
  imports: [RouterLink],
  templateUrl: './story-page.component.html',
  styleUrl: './story-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryPageComponent {
  readonly id = input.required<string>();

  readonly facade = inject(StoryFacade);
  readonly vocabulary = inject(VocabularyFacade);
  private router = inject(Router);


  constructor() {
    setTimeout(() => this.facade.load(this.id()));
  }

  toggleLine(line: StoryLine): void {
    this.facade.toggleLine(line);
  }

  onTime(event: Event): void {
    this.facade.onTime((event.target as HTMLMediaElement).currentTime);
  }

  addWord(wordId: string): void {
    this.vocabulary.addWordToVocabulary(wordId);
  }

  complete(): void {
    this.facade.complete(this.id());
  }

  back(): void {
    this.router.navigate(['/learn']);
  }
}
