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
  styles: `
    :host { display: block; }

    .q-kind {
      color: var(--hg-muted);
      font-size: 12.5px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .taskpanel { padding: 18px 20px; margin-bottom: 14px; font-size: 15px; }

    .krinput {
      width: 100%;
      background: var(--hg-card);
      border: 2px solid var(--hg-line);
      border-radius: 16px;
      padding: 18px 20px;
      color: var(--hg-txt);
      font-size: 26px;
      text-align: center;
      transition: .2s;

      &:focus {
        outline: none;
        border-color: var(--hg-blue);
        box-shadow: 0 0 0 3px rgba(59, 107, 255, .18);
      }
    }

    .checkbtn { margin-top: 22px; }
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
