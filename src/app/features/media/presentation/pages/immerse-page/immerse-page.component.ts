import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImmerseFacade} from '../../../application/immerse.facade';
import {Clip} from '../../../domain/clip.entity';
import {VocabularyFacade} from '@features/vocabulary/application/facades/vocabulary.facade';
import {VOCABULARY_REPOSITORY} from '@features/vocabulary/domain/repositories/vocabulary.repository';
import {VocabularyHttpRepository} from '@features/vocabulary/infrastructure/vocabulary.http-repository';

type SubMode = 'ko' | 'ru' | 'both';

@Component({
  selector: 'hg-immerse-page',
  imports: [RouterLink],
  providers: [
    {provide: VOCABULARY_REPOSITORY, useClass: VocabularyHttpRepository},
    VocabularyFacade,
  ],
  templateUrl: './immerse-page.component.html',
  styleUrl: './immerse-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmersePageComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(ImmerseFacade);
  private vocabulary = inject(VocabularyFacade);
  private host = inject(ElementRef<HTMLElement>);

  readonly subMode = signal<SubMode>('both');
  readonly addedWords = signal<Set<string>>(new Set());

  private observer: IntersectionObserver | null = null;

  constructor() {
    this.facade.load();
    // после каждого дозаполнения ленты навешиваем observer на новые видео
    effect(() => {
      this.facade.clips();
      setTimeout(() => this.observeVideos());
    });
  }

  ngAfterViewInit(): void {
    // play/pause по видимости; не держим >2 играющих
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
          const clip = this.facade.clips().find(c => c.id === video.dataset['clipId']);
          if (clip) this.facade.markViewed(clip);
          // подгрузка следующей страницы у хвоста
          const clips = this.facade.clips();
          if (clip && clips.indexOf(clip) >= clips.length - 2) this.facade.loadMore();
        } else {
          video.pause();
        }
      }
    }, {threshold: [0, .6]});
    this.observeVideos();
  }

  private observeVideos(): void {
    this.host.nativeElement.querySelectorAll('video[data-clip-id]')
      .forEach((v: Element) => this.observer?.observe(v));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  subtitle(clip: Clip, lang: string): string | null {
    return clip.subtitles.find(s => s.lang === lang)?.text ?? null;
  }

  addWord(clip: Clip): void {
    if (!clip.wordId) return;
    const wordId = clip.wordId;
    this.vocabulary.addWordToVocabulary(wordId).subscribe({
      next: () => this.addedWords.update(set => new Set(set).add(wordId)),
    });
  }

  togglePlay(event: Event): void {
    const video = event.currentTarget as HTMLVideoElement;
    video.paused ? video.play() : video.pause();
  }
}
