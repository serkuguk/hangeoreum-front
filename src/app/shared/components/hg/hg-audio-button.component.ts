import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';

@Component({
  selector: 'hg-audio-button',
  template: `
    <button type="button" class="snd" [class.small]="size() === 'sm'"
            (click)="play($event)" aria-label="Прослушать">🔊</button>
  `,
  styles: `
    .snd {
      width: 52px;
      height: 52px;
      border-radius: 16px;
      border: none;
      background: linear-gradient(135deg, var(--hg-blue), #5a2bcf);
      color: #fff;
      font-size: 20px;
      cursor: pointer;
      transition: .2s;
      flex-shrink: 0;

      &:hover { transform: scale(1.05); }

      &.small {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        font-size: 14px;
        background: var(--hg-card-2);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HgAudioButtonComponent {
  readonly text = input.required<string>();
  readonly audioUrl = input<string | null>(null);
  readonly size = input<'md' | 'sm'>('md');

  private tts = inject(KoreanTtsService);

  play(event: Event): void {
    event.stopPropagation();
    this.tts.speak(this.text(), this.audioUrl());
  }
}
