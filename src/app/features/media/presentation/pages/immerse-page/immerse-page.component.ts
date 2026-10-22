import {ButtonComponent, SegmentedControlComponent} from 'springest';
import {
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
import {ImmerseFacade} from '@features/media/application/immerse.facade';
import {Clip} from '@features/media/domain/clip.entity';
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
export class ImmersePageComponent implements OnDestroy {
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
  private observerRoot: Element | null = null;
  private wheelLockedUntil = 0;

  constructor() {
    this.facade.load();
    // после каждого дозаполнения ленты навешиваем observer на новые карточки
    effect(() => {
      this.facade.clips();
      afterNextRender(() => this.observeClips(), {injector: this.injector});
    });
  }

  // активна карточка, пересекающая центральную полосу ленты: она играет, остальные на паузе
  private observeClips(): void {
    const feed = this.host.nativeElement.querySelector('.feed');
    if (!feed) return;
    if (this.observerRoot !== feed) {
      this.observer?.disconnect();
      this.observerRoot = feed;
      this.observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const section = entry.target as HTMLElement;
          const video = section.querySelector('video');
          if (!entry.isIntersecting) {
            video?.pause();
            continue;
          }
          video?.play().catch(() => {});
          const index = Number(section.dataset['index']);
          const clips = this.facade.clips();
          const clip = clips[index];
          if (!clip) continue;
          this.currentClipIndex.set(index);
          this.facade.markViewed(clip);
          // подгрузка следующей страницы у хвоста
          if (index >= clips.length - 2) this.facade.loadMore();
        }
      }, {root: feed, rootMargin: '0px -45% 0px -45%'});
    }
    feed.querySelectorAll('section.clip').forEach((section: Element) => this.observer?.observe(section));
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
    this.focusClip(this.currentClipIndex() + (direction === 'next' ? 1 : -1));
  }

  focusClip(index: number): void {
    // клики по кнопкам активной карточки всплывают сюда — её не трогаем
    if (index === this.currentClipIndex() || index < 0 || index >= this.facade.clips().length) return;
    this.currentClipIndex.set(index);
    this.host.nativeElement.querySelectorAll('section.clip')[index]
      ?.scrollIntoView({behavior: 'smooth', inline: 'center', block: 'nearest'});
  }

  // вертикальное колесо листает карусель по одной карточке; тачпад шлёт пачку событий — гасим её
  onWheel(event: WheelEvent): void {
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    if (Date.now() < this.wheelLockedUntil) return;
    this.wheelLockedUntil = Date.now() + 450;
    this.scrollClip(event.deltaY > 0 ? 'next' : 'prev');
  }

  isActive(index: number): boolean {
    return index === this.currentClipIndex();
  }

  // визуальный вариант карточки по удалённости от центральной
  clipClass(index: number): string {
    const offset = index - this.currentClipIndex();
    const distance = Math.abs(offset);
    if (distance === 0) return 'is-active';
    if (distance === 1) return 'is-near';
    return offset < 0 ? 'is-far is-before' : 'is-far';
  }

  togglePlay(event: Event): void {
    const video = event.currentTarget as HTMLVideoElement;
    video.paused ? video.play() : video.pause();
  }
}
