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
          <button type="button" class="gapopt kr"
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
  styles: `
    :host { display: block; }

    .q-kind {
      color: var(--hg-muted);
      font-size: 12.5px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .gapcard { padding: 26px 28px; }

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
      border-radius: 14px;
      border: 2px dashed rgba(255, 255, 255, .25);
      background: var(--hg-card-2);
      font-size: 30px;
      vertical-align: middle;
      transition: .2s;
      padding: 0 10px;

      &.is-ok { border: 2px solid var(--hg-jade); background: rgba(31, 199, 155, .14); color: var(--hg-jade); animation: pop .3s; }
      &.is-bad { border: 2px solid var(--hg-red); background: rgba(255, 77, 94, .12); color: var(--hg-red); animation: shake .3s; }
    }

    @keyframes pop {
      0% { transform: scale(.8); }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .gaptr { text-align: center; color: var(--hg-muted); font-size: 14px; margin-bottom: 22px; }

    .gapopts { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }

    .gapopt {
      font-family: var(--hg-font-display);
      font-size: 26px;
      min-width: 84px;
      padding: 14px 20px;
      border-radius: 16px;
      background: var(--hg-card);
      border: 2px solid var(--hg-line);
      color: var(--hg-txt);
      cursor: pointer;
      transition: .18s;

      small {
        display: block;
        font-family: var(--hg-font-ui);
        font-size: 10.5px;
        color: var(--hg-muted);
        margin-top: 3px;
      }

      &:hover:not(:disabled) { border-color: rgba(255, 255, 255, .25); transform: translateY(-2px); }
      &:disabled { cursor: default; opacity: .45; }
      &.is-ok { border-color: var(--hg-jade); background: rgba(31, 199, 155, .12); color: var(--hg-jade); }
      &.is-bad { border-color: var(--hg-red); background: rgba(255, 77, 94, .1); color: var(--hg-red); animation: shake .3s; }
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
