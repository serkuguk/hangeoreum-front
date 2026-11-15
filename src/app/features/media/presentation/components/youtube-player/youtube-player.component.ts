import {
  ChangeDetectionStrategy, Component, ElementRef, OnDestroy, afterNextRender, input, output, viewChild,
} from '@angular/core';
import {YOUTUBE_EMBED_HOST, YoutubePlayer, loadYoutubeApi} from '@shared/utils';

// YouTube не шлёт timeupdate — во время игры сами опрашиваем getCurrentTime() для субтитров
const TIME_POLL_MS = 250;

@Component({
  selector: 'hg-youtube-player',
  templateUrl: './youtube-player.component.html',
  styleUrl: './youtube-player.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YoutubePlayerComponent implements OnDestroy {
  readonly videoId = input.required<string>();
  readonly timeChange = output<number>();
  readonly ended = output<void>();
  readonly failed = output<void>();

  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');
  private player: YoutubePlayer | null = null;
  private timer: ReturnType<typeof setInterval> | undefined;
  private destroyed = false;

  constructor() {
    afterNextRender(() => void this.create());
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.stopTimer();
    this.player?.destroy();
  }

  pause(): void {
    this.player?.pauseVideo();
  }

  restart(): void {
    this.player?.seekTo(0, true);
    this.player?.playVideo();
    this.timeChange.emit(0);
  }

  private async create(): Promise<void> {
    let yt;
    try {
      yt = await loadYoutubeApi();
    } catch {
      if (!this.destroyed) this.failed.emit();
      return;
    }
    if (this.destroyed) return;
    // YT.Player заменяет элемент на iframe — отдаём ему свой div, а не узел из шаблона Angular
    const target = document.createElement('div');
    this.frame().nativeElement.appendChild(target);
    this.player = new yt.Player(target, {
      videoId: this.videoId(),
      host: YOUTUBE_EMBED_HOST,
      playerVars: {playsinline: 1, rel: 0, modestbranding: 1},
      events: {
        onStateChange: ({data}) => {
          this.emitTime();
          if (data === yt.PlayerState.PLAYING) this.startTimer();
          else this.stopTimer();
          if (data === yt.PlayerState.ENDED) this.ended.emit();
        },
        onError: () => this.failed.emit(),
      },
    });
  }

  private startTimer(): void {
    this.stopTimer();
    this.timer = setInterval(() => this.emitTime(), TIME_POLL_MS);
  }

  private stopTimer(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }

  private emitTime(): void {
    const seconds = this.player?.getCurrentTime?.();
    if (typeof seconds === 'number') this.timeChange.emit(seconds * 1000);
  }
}
