import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminLetter} from '../../infrastructure/admin.api';
import {HgFilePickerComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-admin-alphabet-page',
  imports: [HgFilePickerComponent],
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
                <hg-file-picker [label]="letter.audioUrl ? '🔊 Заменить' : '⬆ Загрузить'"
                                accept="audio/*" (fileSelected)="upload(letter, $event)"/>
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
