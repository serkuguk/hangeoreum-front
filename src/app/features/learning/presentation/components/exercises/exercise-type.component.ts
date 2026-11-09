import {FormField, disabled, form, required} from '@angular/forms/signals';
import {ButtonComponent, BasicInputComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {TypeWordPayload} from '@features/learning/domain/entities/exercise.entity';
import {Feedback, gradeTypedAnswer} from '@features/learning/domain/services/exercise-grading';
import {KoreanKeyboardComponent} from '@shared/components/hg/korean-keyboard/korean-keyboard.component';
import {appendJamo, deleteLastJamo, jamoForCode} from '@shared/utils/hangul-input';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'hg-exercise-type',
  imports: [FormField, ButtonComponent, BasicInputComponent, KoreanKeyboardComponent, TranslatePipe],
  templateUrl: './exercise-type.component.html',
  styleUrl: './exercise-shared.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseTypeComponent {
  readonly payload = input.required<TypeWordPayload>();
  readonly result = output<Feedback>();

  readonly value = signal('');
  readonly answered = signal(false);
  readonly keyboardOpen = signal(false);
  readonly toggleClass = computed(() => `hg-native-button kbdtoggle${this.keyboardOpen() ? ' is-on' : ''}`);
  readonly answerForm = form(this.value, path => {
    required(path);
    disabled(path, () => this.answered());
  });

  check(): void {
    if (this.answered() || !this.value().trim()) return;
    this.answered.set(true);
    this.result.emit(gradeTypedAnswer(this.value(), this.payload().answer));
  }

  toggleKeyboard(): void {
    this.keyboardOpen.update(open => !open);
  }

  type(jamo: string): void {
    if (!this.answered()) this.value.update(text => appendJamo(text, jamo));
  }

  erase(): void {
    if (!this.answered()) this.value.update(deleteLastJamo);
  }

  /** Пока экранная клавиатура открыта, физические клавиши тоже печатают хангыль (по event.code). */
  onKeydown(event: KeyboardEvent): void {
    if (!this.keyboardOpen() || event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.isComposing || event.key === 'Process') return; // у пользователя свой корейский IME
    const jamo = jamoForCode(event.code, event.shiftKey);
    if (jamo) {
      event.preventDefault();
      this.type(jamo);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      this.erase();
    }
  }
}
