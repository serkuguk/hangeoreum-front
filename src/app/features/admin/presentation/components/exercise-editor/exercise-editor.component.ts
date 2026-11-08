import {ChangeDetectionStrategy, Component, computed, input, model} from '@angular/core';
import {FormField, form} from '@angular/forms/signals';
import {TranslatePipe} from '@ngx-translate/core';
import {BasicInputComponent, ButtonComponent} from 'springest';
import {ExerciseKind} from '@features/learning/domain/entities/exercise.entity';
import {ExerciseDraft, OPTION_KINDS, emptyOption, emptyPair} from './exercise-payload.mapper';

let nextId = 0;

/** Форма payload упражнения по его kind — вместо ручного JSON. */
@Component({
  selector: 'hg-exercise-editor',
  imports: [FormField, TranslatePipe, BasicInputComponent, ButtonComponent],
  templateUrl: './exercise-editor.component.html',
  styleUrl: './exercise-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseEditorComponent {
  readonly kind = input.required<ExerciseKind>();
  readonly draft = model.required<ExerciseDraft>();

  readonly f = form(this.draft);
  readonly radioName = `hg-correct-${nextId++}`;

  readonly hasOptions = computed(() =>
    OPTION_KINDS.includes(this.kind()),
  );
  readonly isPairs = computed(() => this.kind() === 'MATCH_PAIRS');
  readonly optionsWithIcon = computed(() => this.kind() !== 'FILL_BLANK');
  readonly optionsWithHint = computed(() => this.kind() === 'FILL_BLANK');

  setCorrect(index: number): void {
    this.draft.update((d) => ({...d, correctIndex: index}));
  }

  addOption(): void {
    this.draft.update((d) => ({...d, options: [...d.options, emptyOption()]}));
  }

  removeOption(index: number): void {
    this.draft.update((d) => ({
      ...d,
      options: d.options.filter((_, i) => i !== index),
      correctIndex: index === d.correctIndex ? -1 : d.correctIndex - (index < d.correctIndex ? 1 : 0),
    }));
  }

  addPair(): void {
    this.draft.update((d) => ({...d, pairs: [...d.pairs, emptyPair()]}));
  }

  removePair(index: number): void {
    this.draft.update((d) => ({...d, pairs: d.pairs.filter((_, i) => i !== index)}));
  }
}
