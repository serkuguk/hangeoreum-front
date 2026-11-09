import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminLetter} from '@features/admin/infrastructure/admin.api';
import {FilePickerComponent} from 'springest';

@Component({
  selector: 'hg-admin-alphabet-page',
  imports: [TranslatePipe, FilePickerComponent],
  templateUrl: './admin-alphabet-page.component.html',
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

  audioLabelKey(letter: AdminLetter): string {
    return letter.audioUrl ? 'admin.alphabet.replaceAudio' : 'admin.alphabet.uploadAudio';
  }

  onAudioPicked(letter: AdminLetter, files: File[]): void {
    if (files[0]) this.upload(letter, files[0]);
  }

  upload(letter: AdminLetter, file: File): void {
    this.api.uploadLetterAudio(letter.id, file).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.alphabet.uploadError')),
    });
  }
}
