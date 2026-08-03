import {ChangeDetectionStrategy, Component, input, output, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {HgInputComponent} from '@shared/components/controls/hg-input.component';
import {TypeWordPayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

@Component({
  selector: 'hg-exercise-type',
  imports: [FormsModule, HgButtonComponent, HgInputComponent],
  template: `
    <div class="q-kind">Напечатай по-корейски</div>
    <div class="panel taskpanel">«{{ payload().translation }}»</div>
    <hg-input class="krinput kr" type="text" label="Ответ по-корейски" [(ngModel)]="value"
              [disabled]="answered()" lang="ko" autocomplete="off" autocapitalize="off"
              [spellcheck]="false" placeholder="한국어로…" (keydown.enter)="check()"/>
    <hg-button class="checkbtn" label="Проверить"
               [disabled]="!value().trim() || answered()" (pressed)="check()"/>
  `,
  styleUrl: './exercise-shared.scss',
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
