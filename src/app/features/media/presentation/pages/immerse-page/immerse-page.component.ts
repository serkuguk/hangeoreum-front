import {BasicSelectComponent, ButtonComponent, SegmentedControlComponent} from 'springest';
import {
  ChangeDetectionStrategy, Component, ElementRef, Injector, OnDestroy, afterNextRender, computed, effect, inject, signal, viewChild,
} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImmerseFacade} from '@features/media/application/immerse.facade';
import {Clip} from '@features/media/domain/clip.entity';
import {WordAdditionFacade} from '@features/vocabulary/public-api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {YoutubePlayerComponent} from '@features/media/presentation/components/youtube-player/youtube-player.component';
import {youtubeId, youtubeThumbnail} from '@shared/utils';

const SubMode = {KO: 'ko', RU: 'ru', BOTH: 'both'} as const;
type SubMode = typeof SubMode[keyof typeof SubMode];

@Component({
  selector: 'hg-immerse-page',
  imports: [RouterLink, ButtonComponent, BasicSelectComponent, SegmentedControlComponent, TranslatePipe, YoutubePlayerComponent],
  templateUrl: './immerse-page.component.html',
  styleUrl: './immerse-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmersePageComponent implements OnDestroy {
  readonly facade = inject(ImmerseFacade);
  readonly vocabulary = inject(WordAdditionFacade);
  private readonly translate = inject(TranslateService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly youtubePlayer = viewChild(YoutubePlayerComponent);
  readonly subMode = signal<SubMode>(SubMode.BOTH);
  readonly subModeOptions = [
    {value: SubMode.KO, label: this.translate.instant('media.subtitles.korean')},
    {value: SubMode.RU, label: this.translate.instant('media.subtitles.translation')},
    {value: SubMode.BOTH, label: this.translate.instant('media.subtitles.both')},
  ];
  readonly currentClipIndex = signal(0);
  readonly currentClip = computed(() => this.facade.clips()[this.currentClipIndex()] ?? null);
  readonly hasSubtitles = computed(() => !!this.currentClip()?.subtitles.length);
  readonly timeMs = signal(0);
  readonly ended = signal(false);
  readonly playbackError = signal(false);
  readonly playbackErrorKey = computed(() => this.youtubeId(this.currentClip())
    ? 'media.errors.youtubeUnavailable' : 'media.errors.playback');
  // подгрузка следующей страницы не должна вставлять статус над лентой и сдвигать её
  readonly initialLoading = computed(() => this.facade.loading() && !this.facade.clips().length);
  readonly hasNext =computed(() => this.currentClipIndex() + 1 < this.facade.clips().length);
  readonly koSubtitle = computed(() => this.subMode() !== SubMode.RU ? this.subtitle(SubMode.KO) : null);
  readonly ruSubtitle = computed(() => this.subMode() !== SubMode.KO ? this.subtitle(SubMode.RU) : null);

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

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.facade.cancel();
  }

  // свайп/тачпад: активной становится карточка в центральной полосе ленты; видео не запускаем — только по клику
  private observeClips(): void {
    const feed = this.host.nativeElement.querySelector('.feed');
    if (!feed || typeof IntersectionObserver === 'undefined') return;
    if (this.observerRoot !== feed) {
      this.observer?.disconnect();
      this.observerRoot = feed;
      this.observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number((entry.target as HTMLElement).dataset['index']);
          this.selectClip(index);
          // подгрузка следующей страницы у хвоста
          if (index >= this.facade.clips().length - 2 && this.facade.hasMore() && !this.facade.error()) this.facade.loadMore();
        }
      }, {root: feed, rootMargin: '0px -45% 0px -45%'});
    }
    feed.querySelectorAll('section.clip').forEach(section => this.observer?.observe(section));
  }

  selectUnit(value: unknown): void {
    if (typeof value !== 'string' || !this.facade.units().some(unit => unit.id === value)) return;
    this.resetPlayback();
    this.currentClipIndex.set(0);
    this.facade.load(value);
  }

  selectClip(index: number): void {
    if (index < 0 || index >= this.facade.clips().length || index === this.currentClipIndex()) return;
    this.resetPlayback();
    this.currentClipIndex.set(index);
  }

  focusClip(index: number): void {
    // клик по контролам активного видео всплывает сюда — страницу не прокручиваем
    if (index === this.currentClipIndex()) return;
    this.selectClip(index);
    this.host.nativeElement.querySelectorAll('section.clip')[index]
      ?.scrollIntoView?.({behavior: 'smooth', inline: 'center', block: 'nearest'});
  }

  canScrollClip(direction: 'prev' | 'next'): boolean {
    return direction === 'prev' ? this.currentClipIndex() > 0 : this.hasNext();
  }

  scrollClip(direction: 'prev' | 'next'): void {
    this.focusClip(this.currentClipIndex() + (direction === 'next' ? 1 : -1));
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
    const side = offset < 0 ? ' is-before' : '';
    return (distance === 1 ? 'is-near' : 'is-far') + side;
  }

  private resetPlayback(): void {
    const video = this.activeVideo();
    video?.pause();
    if (video) video.currentTime = 0;
    this.youtubePlayer()?.pause();
    this.timeMs.set(0);
    this.ended.set(false);
    this.playbackError.set(false);
  }

  setSubMode(value: unknown): void {
    if (Object.values<unknown>(SubMode).includes(value)) this.subMode.set(value as SubMode);
  }

  // события превью (неактивных <video>) игнорируем — плеер у ленты один, активный
  updateTime(index: number, event: Event): void {
    if (this.isActive(index)) this.timeMs.set((event.target as HTMLVideoElement).currentTime * 1000);
  }

  onVideoEnded(index: number, clip: Clip): void {
    if (this.isActive(index)) this.onEnded(clip);
  }

  onVideoError(index: number): void {
    if (this.isActive(index)) this.playbackError.set(true);
  }

  private activeVideo(): HTMLVideoElement | null {
    return this.host.nativeElement.querySelector<HTMLVideoElement>('.clip.is-active video');
  }

  onEnded(clip: Clip): void {
    this.ended.set(true);
    this.facade.markViewed(clip);
  }

  repeat(): void {
    const youtube = this.youtubePlayer();
    const video = this.activeVideo();
    if (!youtube && !video) return;
    this.timeMs.set(0);
    this.ended.set(false);
    this.playbackError.set(false);
    if (youtube) {
      youtube.restart();
      return;
    }
    video!.currentTime = 0;
    void video!.play().catch(() => this.playbackError.set(true));
  }

  youtubeId(clip: Clip | null): string | null {
    return youtubeId(clip?.videoUrl);
  }

  // своя обложка админа важнее; без неё YouTube отдаёт превью сам
  poster(clip: Clip): string {
    const id = this.youtubeId(clip);
    return clip.thumbnailUrl ?? (id ? youtubeThumbnail(id) : '');
  }

  private subtitle(lang: string): string | null {
    const time = this.timeMs();
    return this.currentClip()?.subtitles.filter(s => s.lang === lang && s.startMs <= time && time < s.endMs)
      .sort((a, b) => a.position - b.position).map(s => s.text).join('\n') || null;
  }

  clipTitle(clip: Clip): string { return clip.title || this.translate.instant('media.clipFallback'); }
  addWordLabelKey(clip: Clip): string {
    return clip.wordId && this.vocabulary.isSaved(clip.wordId) ? 'media.wordSaved' : 'media.addWordAria';
  }

  addWord(clip: Clip): void {
    if (clip.wordId) this.vocabulary.addWordToVocabulary(clip.wordId);
  }
}
