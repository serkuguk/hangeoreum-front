import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminLetter} from '../../infrastructure/admin.api';
import {FilePickerComponent} from 'springest';

@Component({
  selector: 'hg-admin-alphabet-page',
  imports: [FilePickerComponent],
  template: `
    <h2 class="pagettl">Алфавит</h2>
    <p class="pagesub">40 букв 자모: озвучка и порядок. Буквы создаются миграцией БД.</p>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>Jamo</th><th>Романизация</th><th>Группа</th><th>Позиция</th><th>Аудио</th></tr></thead>
        <tbody>
          @for (letter of letters(); track letter.id) {
            <tr>
              <td class="kr">{{ letter.jamo }}</td>
              <td>{{ letter.romanization }}</td>
              <td>{{ letter.letterGroup }}</td>
              <td>{{ letter.position }}</td>
              <td>
                <app-file-picker #picker1 [label]="letter.audioUrl ? '🔊 Заменить' : '⬆ Загрузить'"
                                accept="audio/*" (changed)="$event[0] && upload(letter, $event[0]); picker1.value.set([])" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Букв нет — прогони миграцию/сид БД.</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './_admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAlphabetPageComponent {
  private api = inject(AdminApi);

  readonly letters = signal<AdminLetter[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.letters().subscribe({
      next: letters => this.letters.set(letters),
      error: () => this.error.set('Не получилось загрузить алфавит.'),
    });
  }

  upload(letter: AdminLetter, file: File): void {
    this.api.uploadLetterAudio(letter.id, file).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось загрузить аудио.'),
    });
  }
}
