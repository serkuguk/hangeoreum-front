import {BasicSelectComponent, ButtonComponent, SegmentedControlComponent} from 'springest';
import {ChangeDetectionStrategy, Component, ElementRef, OnDestroy, computed, inject, signal, viewChild} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImmerseFacade} from '@features/media/application/immerse.facade';
import {Clip} from '@features/media/domain/clip.entity';
import {WordAdditionFacade} from '@features/vocabulary/public-api';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

const SubMode = {KO: 'ko', RU: 'ru', BOTH: 'both'} as const;
type SubMode = typeof SubMode[keyof typeof SubMode];

@Component({
  selector: 'hg-immerse-page',
  imports: [RouterLink, ButtonComponent, BasicSelectComponent, SegmentedControlComponent, TranslatePipe],
  templateUrl: './immerse-page.component.html',
  styleUrl: './immerse-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmersePageComponent implements OnDestroy {
  readonly facade = inject(ImmerseFacade);
  readonly vocabulary = inject(WordAdditionFacade);
  private readonly translate = inject(TranslateService);
  readonly player = viewChild<ElementRef<HTMLVideoElement>>('player');
  readonly subMode = signal<SubMode>(SubMode.BOTH);
  readonly subModeOptions = [
    {value: SubMode.KO, label: this.translate.instant('media.subtitles.korean')},
    {value: SubMode.RU, label: this.translate.instant('media.subtitles.translation')},
    {value: SubMode.BOTH, label: this.translate.instant('media.subtitles.both')},
  ];
  readonly currentClipIndex = signal(0);
  readonly currentClip = computed(() => this.facade.clips()[this.currentClipIndex()] ?? null);
  readonly activeClips = computed(() => this.currentClip() ? [this.currentClip()!] : []);
  readonly timeMs = signal(0);
  readonly ended = signal(false);
  readonly playbackError = signal(false);
  readonly hasNext = computed(() => this.currentClipIndex() + 1 < this.facade.clips().length);
  readonly koSubtitle = computed(() => this.subMode() !== SubMode.RU ? this.subtitle(SubMode.KO) : null);
  readonly ruSubtitle = computed(() => this.subMode() !== SubMode.KO ? this.subtitle(SubMode.RU) : null);

  constructor() { this.facade.load(); }

  ngOnDestroy(): void { this.facade.cancel(); }

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

  private resetPlayback(): void {
    this.player()?.nativeElement.pause();
    this.timeMs.set(0);
    this.ended.set(false);
    this.playbackError.set(false);
  }

  setSubMode(value: unknown): void {
    if (Object.values<unknown>(SubMode).includes(value)) this.subMode.set(value as SubMode);
  }

  updateTime(event: Event): void {
    this.timeMs.set((event.target as HTMLVideoElement).currentTime * 1000);
  }

  onEnded(clip: Clip): void {
    this.ended.set(true);
    this.facade.markViewed(clip);
  }

  repeat(): void {
    const video = this.player()?.nativeElement;
    if (!video) return;
    video.currentTime = 0;
    this.timeMs.set(0);
    this.ended.set(false);
    this.playbackError.set(false);
    void video.play().catch(() => this.playbackError.set(true));
  }

  private subtitle(lang: string): string | null {
    const time = this.timeMs();
    return this.currentClip()?.subtitles.filter(s => s.lang === lang && s.startMs <= time && time < s.endMs)
      .sort((a, b) => a.position - b.position).map(s => s.text).join('\n') || null;
  }

  clipTitle(clip: Clip): string { return clip.title || this.translate.instant('media.clipFallback'); }
  likeLabel(clip: Clip): string { return clip.liked ? 'media.unlike' : 'media.like'; }
  addWord(clip: Clip): void {
    if (clip.wordId) this.vocabulary.addWordToVocabulary(clip.wordId);
  }
}
