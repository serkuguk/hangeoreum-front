import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {StoryFacade, StoryMode} from '../../../application/facades/story.facade';
import {StoryLine} from '../../../domain/entities/story.entity';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {HgSegmentedControlComponent, HgSegmentedOption} from '@shared/components/controls/hg-segmented-control.component';

@Component({
  selector: 'hg-story-page',
  imports: [FormsModule, RouterLink, HgButtonComponent, HgSegmentedControlComponent],
  templateUrl: './story-page.component.html',
  styleUrl: './story-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryPageComponent {
  readonly id = input.required<string>();

  readonly facade = inject(StoryFacade);
  readonly vocabulary = inject(VocabularyFacade);
  private router = inject(Router);

  readonly modeOptions = computed<readonly HgSegmentedOption<StoryMode>[]>(() => {
    const story = this.facade.story();
    return [
      ...(this.facade.hasVideo() ? [{value: 'watch' as const, label: '▶ Смотреть'}] : []),
      {value: 'read' as const, label: '📖 Читать'},
      ...((story?.clip?.audioUrl || this.facade.hasVideo())
        ? [{value: 'listen' as const, label: '🎧 Слушать'}]
        : []),
    ];
  });


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
