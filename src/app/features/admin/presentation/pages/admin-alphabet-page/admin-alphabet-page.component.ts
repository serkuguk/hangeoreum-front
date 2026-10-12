import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminLetter} from '@features/admin/infrastructure/admin.api';
import {FilePickerComponent} from 'springest';

@Component({
  selector: 'hg-admin-alphabet-page',
  imports: [TranslatePipe, FilePickerComponent],
  template: `
    <h2 class="pagettl">{{ 'admin.alphabet.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.alphabet.subtitle' | translate }}</p>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead><tr><th>Jamo</th><th>{{ 'admin.alphabet.romanization' | translate }}</th><th>{{ 'admin.alphabet.group' | translate }}</th><th>{{ 'admin.alphabet.position' | translate }}</th><th>{{ 'admin.alphabet.audio' | translate }}</th></tr></thead>
        <tbody>
          @for (letter of letters(); track letter.id) {
            <tr>
              <td class="kr">{{ letter.jamo }}</td>
              <td>{{ letter.romanization }}</td>
              <td>{{ letter.letterGroup }}</td>
              <td>{{ letter.position }}</td>
              <td>
                <app-file-picker #picker1 [label]="(letter.audioUrl ? 'admin.alphabet.replaceAudio' : 'admin.alphabet.uploadAudio') | translate"
                                accept="audio/*" (changed)="$event[0] && upload(letter, $event[0]); picker1.value.set([])" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">{{ 'admin.alphabet.empty' | translate }}</td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: '../_admin.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminAlphabetPageComponent {
  private api = inject(AdminApi);
  private translate = inject(TranslateService);

  readonly letters = signal<AdminLetter[]>([]);
  readonly error = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.api.letters().subscribe({
      next: letters => this.letters.set(letters),
      error: () => this.error.set(this.translate.instant('admin.alphabet.loadError')),
    });
  }

  upload(letter: AdminLetter, file: File): void {
    this.api.uploadLetterAudio(letter.id, file).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.alphabet.uploadError')),
    });
  }
}
