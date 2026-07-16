import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {shuffle} from '@shared/utils/shuffle';
import {WordOrderPayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

interface BankToken {
  id: number;
  text: string;
}

@Component({
  selector: 'hg-exercise-word-order',
  template: `
    <div class="q-kind">Собери предложение</div>
    <div class="panel taskpanel">{{ payload().translation }}</div>

    <div class="assembled" [class.empty]="chosen().length === 0" aria-label="Собранное предложение">
      @if (chosen().length === 0) {
        <span class="placeholder">Нажимай на слова внизу</span>
      }
      @for (token of chosen(); track token.id) {
        <button type="button" class="wtok kr" [disabled]="answered()" (click)="remove(token)">{{ token.text }}</button>
      }
    </div>

    <div class="wbank">
      @for (token of bank(); track token.id) {
        @if (!isChosen(token)) {
          <button type="button" class="wtok kr" [disabled]="answered()" (click)="add(token)">{{ token.text }}</button>
        }
      }
    </div>

    <button type="button" class="cta checkbtn" [disabled]="chosen().length === 0 || answered()" (click)="check()">
      Проверить
    </button>
  `,
  styleUrl: './exercise-shared.scss',
  styles: `
    .assembled {
      min-height: var(--hg-touch-min);
      border: 2px dashed var(--hg-border);
      border-radius: var(--hg-radius-block);
      padding: var(--hg-space-2);
      display: flex;
      flex-wrap: wrap;
      gap: var(--hg-space-2);
      align-items: center;
      margin-bottom: var(--hg-space-4);

      .placeholder { color: var(--hg-text-muted); font-size: var(--hg-fs-sm); padding-left: var(--hg-space-2); }
    }

    .wbank { display: flex; flex-wrap: wrap; gap: var(--hg-space-3); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseWordOrderComponent {
  readonly payload = input.required<WordOrderPayload>();
  readonly result = output<Feedback>();

  readonly bank = computed<BankToken[]>(() =>
    shuffle([...this.payload().tokens, ...(this.payload().extra ?? [])])
      .map((text, id) => ({id, text})));

  readonly chosen = signal<BankToken[]>([]);
  readonly answered = signal(false);

  isChosen(token: BankToken): boolean {
    return this.chosen().some(t => t.id === token.id);
  }

  add(token: BankToken): void {
    this.chosen.update(list => [...list, token]);
  }

  remove(token: BankToken): void {
    this.chosen.update(list => list.filter(t => t.id !== token.id));
  }

  check(): void {
    if (this.answered()) return;
    this.answered.set(true);
    const expected = this.payload().tokens.join(' ');
    const actual = this.chosen().map(t => t.text).join(' ');
    const correct = actual === expected;
    this.result.emit({correct, expected: correct ? undefined : expected});
  }
}
