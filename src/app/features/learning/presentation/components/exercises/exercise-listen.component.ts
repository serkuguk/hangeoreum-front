import {ChangeDetectionStrategy, Component, computed, inject, input, output, signal} from '@angular/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {shuffle} from '@shared/utils/shuffle';
import {ChoiceOption, ListenChoicePayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

@Component({
  selector: 'hg-exercise-listen',
  template: `
    <div class="q-kind">Слушай и выбери</div>
    <div class="q-word">
      <button type="button" class="bigsnd" (click)="play()" aria-label="Прослушать ещё раз">🔊</button>
      <div class="r">Нажми, чтобы прослушать ещё раз</div>
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
export class ExerciseListenComponent {
  readonly payload = input.required<ListenChoicePayload>();
  readonly result = output<Feedback>();

  private tts = inject(KoreanTtsService);

  readonly options = computed(() => shuffle(this.payload().options));
  readonly picked = signal<ChoiceOption | null>(null);
  readonly answered = signal(false);

  constructor() {
    // автопроигрывание при появлении упражнения
    setTimeout(() => this.play());
  }

  play(): void {
    this.tts.speak(this.payload().text ?? '', this.payload().audioUrl);
  }

  pick(option: ChoiceOption): void {
    if (this.answered()) return;
    this.picked.set(option);
    this.answered.set(true);
    const correct = !!option.correct;
    const expected = this.payload().options.find(o => o.correct)?.text;
    this.result.emit({correct, expected: correct ? undefined : expected});
  }
}
