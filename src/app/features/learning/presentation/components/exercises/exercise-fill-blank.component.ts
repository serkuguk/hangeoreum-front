import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {shuffle} from '@shared/utils/shuffle';
import {FillBlankPayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

@Component({
  selector: 'hg-exercise-fill-blank',
  template: `
    <div class="q-kind">Заполни пропуск</div>
    <div class="panel gapcard">
      <div class="gapline kr">
        {{ parts().before }}<span class="gap"
          [class.is-ok]="answered() && pickedCorrect()"
          [class.is-bad]="answered() && !pickedCorrect()">{{ picked() || ' ' }}</span>{{ parts().after }}
      </div>
      @if (payload().translation) {
        <div class="gaptr">«{{ payload().translation }}»@if (payload().hint) { · Подсказка: {{ payload().hint }}}</div>
      }
      <div class="gapopts">
        @for (option of options(); track option.text) {
          <button type="button" data-domain-control class="gapopt kr"
                  [attr.aria-pressed]="picked() === option.text"
                  [class.is-ok]="answered() && option.text === payload().correct"
                  [class.is-bad]="answered() && picked() === option.text && option.text !== payload().correct"
                  [disabled]="answered()"
                  (click)="pick(option.text)">
            {{ option.text }}
            @if (option.hint) {
              <small>{{ option.hint }}</small>
            }
          </button>
        }
      </div>
    </div>
  `,
  styleUrl: './exercise-shared.scss',
  styles: `
    .gapcard { padding: var(--hg-space-6) var(--hg-space-7); }

    .gapline {
      font-family: var(--hg-font-display);
      font-size: 36px;
      line-height: 1.5;
      text-align: center;
      margin: 6px 0 4px;
    }

    .gap {
      display: inline-grid;
      place-items: center;
      min-width: 74px;
      height: 52px;
      margin: 0 6px;
      border-radius: var(--hg-radius-block);
      border: 2px dashed var(--hg-border);
      background: var(--hg-surface-muted);
      font-size: 30px;
      vertical-align: middle;
      transition: border-color var(--hg-motion-feedback), background var(--hg-motion-feedback);
      padding: 0 var(--hg-space-3);

      // correct
      &.is-ok { border: 2px solid var(--hg-success); background: var(--hg-success-soft); color: var(--hg-success); animation: pop .3s; }
      // incorrect
      &.is-bad { border: 2px solid var(--hg-danger); background: var(--hg-danger-soft); color: var(--hg-danger); animation: shake .3s; }
    }

    @keyframes pop {
      0% { transform: scale(.8); }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    .gaptr { text-align: center; color: var(--hg-text-muted); font-size: var(--hg-fs-base); margin-bottom: var(--hg-space-6); }

    .gapopts { display: flex; gap: var(--hg-space-3); justify-content: center; flex-wrap: wrap; }

    .gapopt {
      font-family: var(--hg-font-display);
      font-size: 26px;
      min-width: 84px;
      min-height: var(--hg-touch-min);
      padding: var(--hg-space-3) var(--hg-space-4);
      border-radius: var(--hg-radius-block);
      background: var(--hg-surface);
      border: 2px solid var(--hg-border);
      color: var(--hg-text);
      cursor: pointer;
      transition: border-color var(--hg-motion-feedback), transform var(--hg-motion-feedback);

      small {
        display: block;
        font-family: var(--hg-font-ui);
        font-size: var(--hg-fs-2xs);
        color: var(--hg-text-muted);
        margin-top: 3px;
      }

      &:hover:not(:disabled) { border-color: var(--hg-route); transform: translateY(-2px); }
      &:disabled { cursor: default; opacity: .45; }
      // correct
      &.is-ok { border-color: var(--hg-success); background: var(--hg-success-soft); color: var(--hg-success); }
      // incorrect
      &.is-bad { border-color: var(--hg-danger); background: var(--hg-danger-soft); color: var(--hg-danger); animation: shake .3s; }
      &.is-ok:disabled, &.is-bad:disabled { opacity: 1; }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseFillBlankComponent {
  readonly payload = input.required<FillBlankPayload>();
  readonly result = output<Feedback>();

  readonly options = computed(() => shuffle(this.payload().options));
  readonly parts = computed(() => {
    const [before = '', after = ''] = this.payload().sentence.split('___');
    return {before, after};
  });

  readonly picked = signal<string | null>(null);
  readonly answered = signal(false);
  readonly pickedCorrect = computed(() => this.picked() === this.payload().correct);

  pick(text: string): void {
    if (this.answered()) return;
    this.picked.set(text);
    this.answered.set(true);
    const correct = text === this.payload().correct;
    this.result.emit({correct, expected: correct ? undefined : this.payload().correct});
  }
}
