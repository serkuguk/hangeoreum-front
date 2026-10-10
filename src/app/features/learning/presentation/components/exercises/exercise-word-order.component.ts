import {ButtonComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {shuffle} from '@shared/utils/shuffle';
import {WordOrderPayload} from '../../../domain/entities/exercise.entity';
import {Feedback, gradeWordOrder} from '../../../domain/services/exercise-grading';
import {TranslatePipe} from '@ngx-translate/core';

interface BankToken {
  id: number;
  text: string;
}

@Component({
  selector: 'hg-exercise-word-order',
  imports: [ButtonComponent, TranslatePipe],
  template: `
    <div class="q-kind">{{ 'learning.exercise.buildSentence' | translate }}</div>
    <div class="panel taskpanel">{{ payload().translation }}</div>

    <div class="assembled" [class.empty]="chosen().length === 0" [attr.aria-label]="'learning.exercise.assembledSentence' | translate">
      @if (chosen().length === 0) {
        <span class="placeholder">{{ 'learning.exercise.chooseWords' | translate }}</span>
      }
      @for (token of chosen(); track token.id) {
        <app-button class="hg-native-host" styleClass="hg-native-button wtok kr" type="button" [disabled]="answered()"
                (click)="remove(token)" [aria]="{'aria-label': ('learning.exercise.removeWord' | translate:{word: token.text})}">{{ token.text }}</app-button>
      }
    </div>

    <div class="wbank">
      @for (token of bank(); track token.id) {
        @if (!isChosen(token)) {
          <app-button class="hg-native-host" styleClass="hg-native-button wtok kr" type="button" [disabled]="answered()"
                  (click)="add(token)" [aria]="{'aria-label': ('learning.exercise.addWord' | translate:{word: token.text})}">{{ token.text }}</app-button>
        }
      }
    </div>

    <app-button styleClass="hg-button" class="checkbtn" [label]="'common.check' | translate"
               [disabled]="chosen().length === 0 || answered()" (click)="check()"/>
  `,
  styleUrl: './exercise-shared.scss',
  styles: `
    :host ::ng-deep {

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
    }
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
    this.result.emit(gradeWordOrder(this.chosen().map(t => t.text), this.payload().tokens));
  }
}
