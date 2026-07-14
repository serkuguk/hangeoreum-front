import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {HgAudioButtonComponent} from '@shared/components/hg';
import {shuffle} from '@shared/utils/shuffle';
import {ChoiceOption, ChoicePayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

@Component({
  selector: 'hg-exercise-choice',
  imports: [HgAudioButtonComponent],
  template: `
    <div class="q-kind">Выбери перевод</div>
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
        <button type="button" class="opt"
                [class.pick]="answered() && option.correct"
                [class.wrong]="answered() && picked() === option && !option.correct"
                [disabled]="answered()"
                (click)="pick(option)">
          @if (option.icon) {
            <span class="oi">{{ option.icon }}</span>
          }
          {{ option.text }}
        </button>
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
    const correct = !!option.correct;
    const expected = this.payload().options.find(o => o.correct)?.text;
    this.result.emit({correct, expected: correct ? undefined : expected});
  }
}
