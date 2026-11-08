import {ChangeDetectionStrategy, Component, computed, output, signal} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {ButtonComponent} from 'springest';
import {HANGUL_LAYOUT} from '@shared/utils/hangul-input';

/** Экранная клавиатура 두벌식: отдаёт чамо, сборку слогов делает вызывающий (appendJamo). */
@Component({
  selector: 'hg-korean-keyboard',
  imports: [ButtonComponent, TranslatePipe],
  templateUrl: './korean-keyboard.component.html',
  styleUrl: './korean-keyboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KoreanKeyboardComponent {
  readonly jamo = output<string>();
  readonly backspace = output<void>();

  readonly shift = signal(false);
  readonly rows = computed(() => HANGUL_LAYOUT.map(row => row.map(key => (this.shift() ? key.shift : key.base))));
  readonly shiftClass = computed(() => `hg-native-button kbd-key kbd-key--wide${this.shift() ? ' is-on' : ''}`);

  press(jamo: string): void {
    this.jamo.emit(jamo);
    this.shift.set(false);
  }

  toggleShift(): void {
    this.shift.update(on => !on);
  }
}
