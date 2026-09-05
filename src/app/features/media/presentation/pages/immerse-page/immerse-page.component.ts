import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {ImmerseFacade} from '../../../application/immerse.facade';
import {Clip} from '../../../domain/clip.entity';
import {HgButtonComponent, HgSegmentedControlComponent} from '@shared/components/controls';
import {WordAdditionFacade} from '@features/vocabulary/public-api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

type SubMode = 'ko' | 'ru' | 'both';

@Component({
  selector: 'hg-immerse-page',
  imports: [FormsModule, RouterLink, HgButtonComponent, HgSegmentedControlComponent, TranslatePipe],
  templateUrl: './immerse-page.component.html',
  styleUrl: './immerse-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmersePageComponent implements AfterViewInit, OnDestroy {
  readonly facade = inject(ImmerseFacade);
  readonly vocabulary = inject(WordAdditionFacade);
  private host = inject(ElementRef<HTMLElement>);
  private injector = inject(Injector);
  private translate = inject(TranslateService);

  readonly subMode = signal<SubMode>('both');
  readonly subModeOptions = [
    {value: 'ko' as const, label: this.translate.instant('media.subtitles.korean')},
    {value: 'ru' as const, label: this.translate.instant('media.subtitles.translation')},
    {value: 'both' as const, label: this.translate.instant('media.subtitles.both')},
  ];
  readonly currentClipIndex = signal(0);

  private observer: IntersectionObserver | null = null;

  constructor() {
    this.facade.load();
    // после каждого дозаполнения ленты навешиваем observer на новые видео
    effect(() => {
      this.facade.clips();
      afterNextRender(() => this.observeVideos(), {injector: this.injector});
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
          if (clip) {
            this.currentClipIndex.set(this.facade.clips().indexOf(clip));
            this.facade.markViewed(clip);
          }
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
    this.vocabulary.addWordToVocabulary(clip.wordId);
  }

  canScrollClip(direction: 'prev' | 'next'): boolean {
    const index = this.currentClipIndex();
    return direction === 'prev'
      ? index > 0
      : index < this.facade.clips().length - 1;
  }

  scrollClip(direction: 'prev' | 'next'): void {
    const nextIndex = this.currentClipIndex() + (direction === 'next' ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= this.facade.clips().length) return;
    this.currentClipIndex.set(nextIndex);
    const feed = this.host.nativeElement.querySelector('.feed') as HTMLElement | null;
    const clips = this.host.nativeElement.querySelectorAll('.clip') as NodeListOf<HTMLElement>;
    const clip = clips[nextIndex];
    if (!feed || !clip) return;
    const top = clip.getBoundingClientRect().top - feed.getBoundingClientRect().top + feed.scrollTop;
    feed.scrollTo({top, behavior: 'smooth'});
  }

  togglePlay(event: Event): void {
    const video = event.currentTarget as HTMLVideoElement;
    video.paused ? video.play() : video.pause();
  }
}
