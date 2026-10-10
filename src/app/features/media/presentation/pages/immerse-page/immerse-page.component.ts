import {ButtonComponent, SegmentedControlComponent} from 'springest';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImmerseFacade} from '../../../application/immerse.facade';
import {Clip} from '../../../domain/clip.entity';
import {WordAdditionFacade} from '@features/vocabulary/public-api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

const SubMode = {KO: 'ko', RU: 'ru', BOTH: 'both'} as const;
type SubMode = typeof SubMode[keyof typeof SubMode];

@Component({
  selector: 'hg-immerse-page',
  imports: [RouterLink, ButtonComponent, SegmentedControlComponent, TranslatePipe],
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

  readonly subMode = signal<SubMode>(SubMode.BOTH);
  readonly subModeOptions = [
    {value: SubMode.KO, label: this.translate.instant('media.subtitles.korean')},
    {value: SubMode.RU, label: this.translate.instant('media.subtitles.translation')},
    {value: SubMode.BOTH, label: this.translate.instant('media.subtitles.both')},
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

  setSubMode(value: unknown): void {
    if (Object.values<unknown>(SubMode).includes(value)) this.subMode.set(value as SubMode);
  }

  readonly showKo = computed(() => this.subMode() !== SubMode.RU);
  readonly showRu = computed(() => this.subMode() !== SubMode.KO);

  koSubtitle(clip: Clip): string | null {
    return this.showKo() ? this.subtitle(clip, 'ko') : null;
  }

  ruSubtitle(clip: Clip): string | null {
    return this.showRu() ? this.subtitle(clip, 'ru') : null;
  }

  clipTitle(clip: Clip): string {
    return this.subtitle(clip, 'ru') ?? this.subtitle(clip, 'ko') ?? this.translate.instant('media.clipFallback');
  }

  likeClass(clip: Clip): string {
    return clip.liked ? 'hg-native-button liked' : 'hg-native-button';
  }

  likeIcon(clip: Clip): string {
    return clip.liked ? '❤️' : '🤍';
  }

  likeLabel(clip: Clip): string {
    return clip.liked ? 'media.unlike' : 'media.like';
  }

  saveIcon(clip: Clip): string {
    return clip.wordId && this.vocabulary.isSaved(clip.wordId) ? '✓' : '＋';
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
