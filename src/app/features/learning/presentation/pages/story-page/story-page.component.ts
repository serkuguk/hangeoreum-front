import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Router, RouterLink} from '@angular/router';
import {StoryFacade, StoryMode} from '../../../application/facades/story.facade';
import {StoryLine} from '../../../domain/entities/story.entity';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {HgSegmentedControlComponent, HgSegmentedOption} from '@shared/components/controls/hg-segmented-control.component';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-story-page',
  imports: [FormsModule, RouterLink, HgButtonComponent, HgSegmentedControlComponent, TranslatePipe],
  templateUrl: './story-page.component.html',
  styleUrl: './story-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryPageComponent implements OnInit {
  readonly id = input.required<string>();

  readonly facade = inject(StoryFacade);
  readonly vocabulary = inject(VocabularyFacade);
  private readonly translate = inject(TranslateService);
  private router = inject(Router);

  readonly modeOptions = computed<readonly HgSegmentedOption<StoryMode>[]>(() => {
    const story = this.facade.story();
    return [
      ...(this.facade.hasVideo() ? [{value: 'watch' as const, label: '▶ ' + this.translate.instant('learning.story.watch')}] : []),
      {value: 'read' as const, label: '📖 ' + this.translate.instant('learning.story.read')},
      ...((story?.clip?.audioUrl || this.facade.hasVideo())
        ? [{value: 'listen' as const, label: '🎧 ' + this.translate.instant('learning.story.listen')}]
        : []),
    ];
  });


  ngOnInit(): void {
    this.facade.load(this.id());
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
