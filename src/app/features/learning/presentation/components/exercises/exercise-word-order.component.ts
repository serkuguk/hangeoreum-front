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
  styles: `
    :host { display: block; }

    .q-kind {
      color: var(--hg-muted);
      font-size: 12.5px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .taskpanel { padding: 18px 20px; margin-bottom: 14px; color: var(--hg-muted); font-size: 14px; }

    .assembled {
      min-height: 62px;
      border: 2px dashed rgba(255, 255, 255, .18);
      border-radius: 16px;
      padding: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-bottom: 16px;

      .placeholder { color: var(--hg-muted); font-size: 13px; padding-left: 6px; }
    }

    .wbank { display: flex; flex-wrap: wrap; gap: 10px; }

    .wtok {
      background: var(--hg-card);
      border: 1px solid var(--hg-line);
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 15px;
      color: var(--hg-txt);
      cursor: pointer;
      transition: .15s;

      &:hover:not(:disabled) { border-color: rgba(255, 255, 255, .25); }
      &:disabled { cursor: default; opacity: .7; }
    }

    .checkbtn { margin-top: 22px; }
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
