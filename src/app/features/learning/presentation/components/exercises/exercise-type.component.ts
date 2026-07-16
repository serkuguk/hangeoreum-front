import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TypeWordPayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

@Component({
  selector: 'hg-exercise-type',
  imports: [FormsModule],
  template: `
    <div class="q-kind">Напечатай по-корейски</div>
    <div class="panel taskpanel">«{{ payload().translation }}»</div>
    <input class="krinput kr" type="text" [(ngModel)]="value" [disabled]="answered()"
           lang="ko" autocomplete="off" autocapitalize="off" spellcheck="false"
           placeholder="한국어로…" (keydown.enter)="check()">
    <button type="button" class="cta checkbtn" [disabled]="!value().trim() || answered()" (click)="check()">
      Проверить
    </button>
  `,
  styleUrl: './exercise-shared.scss',
  styles: `
    .krinput {
      width: 100%;
      min-height: var(--hg-touch-min);
      background: var(--hg-surface);
      border: 2px solid var(--hg-border);
      border-radius: var(--hg-radius-block);
      padding: var(--hg-space-4) var(--hg-space-5);
      color: var(--hg-text);
      font-size: 26px;
      text-align: center;
      transition: border-color var(--hg-motion-feedback), box-shadow var(--hg-motion-feedback);

      &:focus-visible {
        outline: none;
        border-color: var(--hg-focus);
        box-shadow: 0 0 0 3px var(--hg-route-soft);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseTypeComponent {
  readonly payload = input.required<TypeWordPayload>();
  readonly result = output<Feedback>();

  readonly value = signal('');
  readonly answered = signal(false);

  check(): void {
    if (this.answered() || !this.value().trim()) return;
    this.answered.set(true);
    // NFC-нормализация: составные хангыль-слоги из IME могут приходить в NFD
    const normalize = (s: string) => s.normalize('NFC').replace(/\s+/g, ' ').trim();
    const correct = normalize(this.value()) === normalize(this.payload().answer);
    this.result.emit({correct, expected: correct ? undefined : this.payload().answer});
  }
}
