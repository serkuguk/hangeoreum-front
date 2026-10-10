import {ButtonComponent, SegmentedControlComponent} from 'springest';
import {ChangeDetectionStrategy, Component, OnInit, computed, inject, input} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {StoryFacade, StoryMode} from '../../../application/facades/story.facade';
import {StoryLine} from '../../../domain/entities/story.entity';
import {WordAdditionFacade} from '@features/vocabulary/public-api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-story-page',
  imports: [RouterLink, ButtonComponent, SegmentedControlComponent, TranslatePipe],
  templateUrl: './story-page.component.html',
  styleUrl: './story-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoryPageComponent implements OnInit {
  readonly id = input.required<string>();

  readonly facade = inject(StoryFacade);
  readonly vocabulary = inject(WordAdditionFacade);
  private readonly translate = inject(TranslateService);
  private router = inject(Router);

  readonly modeOptions = computed(() => {
    const story = this.facade.story();
    return [
      ...(this.facade.hasVideo() ? [{value: StoryMode.WATCH, label: '▶ ' + this.translate.instant('learning.story.watch')}] : []),
      {value: StoryMode.READ, label: '📖 ' + this.translate.instant('learning.story.read')},
      ...((story?.clip?.audioUrl || this.facade.hasVideo())
        ? [{value: StoryMode.LISTEN, label: '🎧 ' + this.translate.instant('learning.story.listen')}]
        : []),
    ];
  });


  readonly isWatchMode = computed(() => this.facade.mode() === StoryMode.WATCH);
  readonly isListenMode = computed(() => this.facade.mode() === StoryMode.LISTEN);
  readonly completeLabel = computed(() =>
    this.facade.completionError() ? 'learning.story.retrySaving' : 'learning.story.complete');

  retryOrAddLabel(wordId: string): string {
    return this.vocabulary.isFailed(wordId) ? 'common.retry' : 'learning.story.addToVocabulary';
  }

  ngOnInit(): void {
    this.facade.load(this.id());
  }

  setMode(value: unknown): void {
    if (Object.values<unknown>(StoryMode).includes(value)) this.facade.mode.set(value as StoryMode);
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
