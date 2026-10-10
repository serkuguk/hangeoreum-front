import {ButtonComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {HgAudioButtonComponent} from '@shared/components/hg';
import {shuffle} from '@shared/utils/shuffle';
import {ChoiceOption, ChoicePayload} from '../../../domain/entities/exercise.entity';
import {Feedback, gradeChoice} from '../../../domain/services/exercise-grading';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-exercise-choice',
  imports: [ButtonComponent, HgAudioButtonComponent, TranslatePipe],
  template: `
    <div class="q-kind">{{ 'learning.exercise.chooseTranslation' | translate }}</div>
    <div class="q-word">
      <hg-audio-button [text]="payload().question" [audioUrl]="payload().audioUrl ?? null"/>
      <div>
        <div class="w kr">{{ payload().question }}</div>
        @if (payload().romanization) {
          <div class="r">{{ payload().romanization }}</div>
        }
      </div>
    </div>
    <div class="opts">
      @for (option of options(); track option.text) {
        <app-button class="hg-native-host" [styleClass]="'hg-native-button opt' + (answered() && option.correct ? ' pick' : '') + (answered() && picked() === option && !option.correct ? ' wrong' : '')" type="button"

                [disabled]="answered()"
                (click)="pick(option)" [aria]="{'aria-pressed': (picked() === option)}">
          @if (option.icon) {
            <span class="oi">{{ option.icon }}</span>
          }
          {{ option.text }}
        </app-button>
      }
    </div>
  `,
  styleUrl: './exercise-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseChoiceComponent {
  readonly payload = input.required<ChoicePayload>();
  readonly result = output<Feedback>();

  readonly options = computed(() => shuffle(this.payload().options));
  readonly picked = signal<ChoiceOption | null>(null);
  readonly answered = signal(false);

  pick(option: ChoiceOption): void {
    if (this.answered()) return;
    this.picked.set(option);
    this.answered.set(true);
    this.result.emit(gradeChoice(option, this.payload().options));
  }
}
