import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {ButtonComponent} from 'springest';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-audio-button',
  imports: [ButtonComponent, TranslatePipe],
  template: `<app-button class="hg-native-host" [styleClass]="'hg-native-button snd ' + size()"
    (click)="play($event)" [aria]="{'aria-label': ('common.listen' | translate)}">@if (icon() === 'speaker') {<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16 9.5a4 4 0 0 1 0 5M18.5 7a7.5 7.5 0 0 1 0 10"/></svg>} @else {🔊}</app-button>`,
  styles: `
    :host ::ng-deep button.hg-native-button.hg-native-button.hg-native-button.snd {min-width:0;width:52px;height:52px;padding:0;border-radius:16px;border:none;background:linear-gradient(135deg,var(--hg-blue),#5a2bcf);color:#fff;font-size:20px;cursor:pointer;transition:.2s;flex-shrink:0}
    :host ::ng-deep button.hg-native-button.hg-native-button.hg-native-button.snd svg {width:24px;height:24px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
    :host ::ng-deep button.hg-native-button.hg-native-button.hg-native-button.snd:hover {transform:scale(1.05);background:linear-gradient(135deg,var(--hg-blue),#5a2bcf)}
    :host ::ng-deep button.hg-native-button.hg-native-button.hg-native-button.snd.sm {width:34px;height:34px;border-radius:10px;font-size:14px;background:var(--hg-card-2)}
    :host ::ng-deep button.hg-native-button.hg-native-button.hg-native-button.snd.lg {width:68px;height:68px;border-radius:20px;font-size:28px}
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HgAudioButtonComponent {
  readonly text = input.required<string>();
  readonly audioUrl = input<string | null>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly icon = input<'emoji' | 'speaker'>('emoji');
  private readonly tts = inject(KoreanTtsService);

  play(event: Event): void {
    event.stopPropagation();
    this.tts.speak(this.text(), this.audioUrl());
  }
}
