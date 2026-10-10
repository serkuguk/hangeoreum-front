import {FormField, disabled, form, required} from '@angular/forms/signals';
import {ButtonComponent, BasicInputComponent} from 'springest';
import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {TypeWordPayload} from '../../../domain/entities/exercise.entity';
import {Feedback, gradeTypedAnswer} from '../../../domain/services/exercise-grading';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-exercise-type',
  imports: [FormField, ButtonComponent, BasicInputComponent, TranslatePipe],
  template: `
    <div class="q-kind">{{ 'learning.exercise.typeKorean' | translate }}</div>
    <div class="panel taskpanel">«{{ payload().translation }}»</div>
    <form novalidate (submit)="$event.preventDefault(); check()">
      <app-basic-input class="krinput kr" type="text" [label]="'learning.exercise.answerKorean' | translate" [formField]="answerForm"
              lang="ko" autocomplete="off" autocapitalize="off"
              [spellcheck]="false" [placeholder]="'learning.exercise.koreanPlaceholder' | translate"/>
      <app-button styleClass="hg-button" class="checkbtn" [label]="'common.check' | translate"
               [disabled]="!value().trim() || answered()" type="submit"/>
    </form>
  `,
  styleUrl: './exercise-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseTypeComponent {
  readonly payload = input.required<TypeWordPayload>();
  readonly result = output<Feedback>();

  readonly value = signal('');
  readonly answered = signal(false);
  readonly answerForm = form(this.value, path => {
    required(path);
    disabled(path, () => this.answered());
  });

  check(): void {
    if (this.answered() || !this.value().trim()) return;
    this.answered.set(true);
    this.result.emit(gradeTypedAnswer(this.value(), this.payload().answer));
  }
}
