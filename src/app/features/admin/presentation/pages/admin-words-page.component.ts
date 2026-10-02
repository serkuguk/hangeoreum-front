import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap} from 'rxjs';
import {
  HgButtonComponent,
  HgDialogComponent,
  HgFilePickerComponent,
  HgInputComponent,
  HgPaginationComponent,
  HgSelectComponent,
  HgSelectOption,
} from '@shared/components/controls';
import {AdminApi, AdminWord, Topic, WordRequest} from '@features/admin/infrastructure/admin.api';

const EMPTY_DRAFT: WordRequest = {
  hangul: '', romanization: '', translation: '',
  partOfSpeech: '', topicId: null, exampleKo: '', exampleTranslation: '', grammarNote: '',
};
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'hg-admin-words-page',
  imports: [
    FormsModule,
    HgButtonComponent,
    HgDialogComponent,
    HgFilePickerComponent,
    HgInputComponent,
    HgPaginationComponent,
    HgSelectComponent,
  ],
  template: `
    <h2 class="pagettl">Слова</h2>
    <p class="pagesub">{{ total() }} слов в базе.</p>

    <div class="toolbar">
      <hg-input class="search" type="search" label="Поиск слов"
                placeholder="Хангыль или перевод…" [ngModel]="search()"
                (ngModelChange)="onSearch($event)" />
      <hg-button label="Новое слово" icon="+" (pressed)="openCreate()" />
    </div>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <table class="atable">
        <thead>
          <tr><th>Хангыль</th><th>Транскрипция</th><th>Перевод</th><th>Медиа</th><th></th></tr>
        </thead>
        <tbody>
          @for (word of words(); track word.id) {
            <tr>
              <td class="kr">{{ word.hangul }}</td>
              <td>{{ word.romanization }}</td>
              <td>{{ word.translation }}</td>
              <td>
                <div class="word-media">
                  <img class="word-thumbnail" [src]="imageUrl(word.imageUrl)" (error)="onImageError($event)"
                       alt="" width="48" height="48" loading="lazy" decoding="async" />
                <hg-file-picker label="🔊" ariaLabel="Загрузить аудио слова"
                                accept="audio/*" (fileSelected)="upload(word, $event, 'audio')" />
                </div>
              </td>
              <td>
                <hg-button size="sm" variant="ghost" label="Изменить" (pressed)="openEdit(word)" />
                <hg-button size="sm" variant="danger" label="Удалить" (pressed)="remove(word)" />
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Слов пока нет — добавь первое.</td></tr>
          }
        </tbody>
      </table>
      @if (totalPages() > 1) {
        <hg-pagination [page]="page()" [totalPages]="totalPages()"
                       ariaLabel="Страницы слов" (pageChange)="goToPage($event)" />
      }
    </div>

    @if (dialogOpen()) {
    <hg-dialog [visible]="true" (visibleChange)="!$event && closeDialog()"
               [closable]="!saving()" [closeOnEscape]="!saving()" [dismissableMask]="false"
               [title]="editing() ? 'Изменить слово' : 'Новое слово'">
      <div class="word-image-field">
        <img class="word-preview" [src]="previewImage()" (error)="onImageError($event)"
             alt="" width="96" height="96" decoding="async" />
        <div>
          <hg-file-picker label="Выбрать изображение" ariaLabel="Изображение слова"
                          accept="image/png,image/jpeg,image/webp" hint="PNG, JPEG или WebP, до 5 МиБ."
                          [disabled]="saving()" (fileSelected)="onImageSelected($event)" />
          @if (imageError()) { <p class="image-error" role="alert">{{ imageError() }}</p> }
        </div>
      </div>
      @if (saveError()) { <div class="errbar" role="alert">{{ saveError() }}</div> }
      <hg-input label="Хангыль" [(ngModel)]="draft.hangul" lang="ko" required [disabled]="saving()" />
      <hg-input label="Транскрипция (латиницей)" placeholder="Например, keopi" [(ngModel)]="draft.romanization" required [disabled]="saving()" />
      <hg-input label="Перевод" [(ngModel)]="draft.translation" required [disabled]="saving()" />
      <hg-input label="Часть речи" [(ngModel)]="draft.partOfSpeech" placeholder="существительное" [disabled]="saving()" />
      <hg-select label="Тема" placeholder="" [options]="topicOptions()" [(ngModel)]="draft.topicId" [disabled]="saving()" />
      <hg-input label="Пример (ko)" [(ngModel)]="draft.exampleKo" lang="ko" [disabled]="saving()" />
      <hg-input label="Перевод примера" [(ngModel)]="draft.exampleTranslation" [disabled]="saving()" />
      <hg-input label="Грамматическая пометка" [(ngModel)]="draft.grammarNote" [disabled]="saving()" />
      <div dialog-actions class="btns">
        <hg-button [label]="saving() ? 'Сохранение…' : 'Сохранить'"
                   [disabled]="saving() || !draft.hangul.trim() || !draft.romanization.trim() || !draft.translation.trim()"
                   (pressed)="save()" />
        <hg-button label="Отмена" variant="ghost" [disabled]="saving()" (pressed)="closeDialog()" />
      </div>
    </hg-dialog>
    }
  `,
  styleUrl: './_admin.scss',
  styles: `
    .word-media, .word-image-field { display: flex; align-items: center; gap: 1rem; }
    .word-media { flex-wrap: wrap; gap: .5rem; }
    .word-thumbnail, .word-preview { object-fit: contain; flex-shrink: 0; border-radius: var(--hg-radius-control); }
    .word-thumbnail { width: 48px; height: 48px; }
    .word-preview { width: 96px; height: 96px; }
    .word-image-field > div { min-width: 0; overflow-wrap: anywhere; }
    .image-error { color: var(--hg-danger); font-size: .85rem; margin-top: .5rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWordsPageComponent {
  private api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly words = signal<AdminWord[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly search = signal('');
  readonly error = signal<string | null>(null);
  readonly topics = signal<Topic[]>([]);
  readonly topicOptions = computed<readonly HgSelectOption<string | null>[]>(() => [
    {label: '— без темы —', value: null},
    ...this.topics().map(topic => ({label: topic.title, value: topic.id})),
  ]);

  readonly dialogOpen = signal(false);
  readonly editing = signal<AdminWord | null>(null);
  readonly saving = signal(false);
  readonly selectedImage = signal<File | null>(null);
  readonly imagePreviewUrl = signal<string | null>(null);
  readonly imageError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly defaultWordImage = '/assets/illustrations/word-default.svg';
  readonly previewImage = computed(() => this.imagePreviewUrl() ?? this.imageUrl(this.editing()?.imageUrl ?? null));
  draft: WordRequest = {...EMPTY_DRAFT};

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private readonly search$ = new Subject<string>();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearImage());
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => this.api.words(search, 0).pipe(
        catchError(() => {
          this.error.set('Не получилось загрузить слова.');
          return EMPTY;
        }),
      )),
      takeUntilDestroyed(),
    ).subscribe(result => {
      this.words.set(result.content);
      this.total.set(result.totalElements);
      this.error.set(null);
    });
    this.load();
    this.api.topics().pipe(takeUntilDestroyed()).subscribe({
      next: topics => this.topics.set(topics),
      error: () => this.error.set('Не получилось загрузить темы.'),
    });
  }

  load(): void {
    this.api.words(this.search(), this.page()).subscribe({
      next: result => {
        this.words.set(result.content);
        this.total.set(result.totalElements);
      },
      error: () => this.error.set('Не получилось загрузить слова.'),
    });
  }

  onSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
    this.search$.next(value);
  }

  goToPage(page: number): void {
    this.page.set(page);
    this.load();
  }

  openCreate(): void {
    if (this.saving()) return;
    this.resetImageForm();
    this.editing.set(null);
    this.draft = {...EMPTY_DRAFT};
    this.dialogOpen.set(true);
  }

  openEdit(word: AdminWord): void {
    if (this.saving()) return;
    this.resetImageForm();
    this.editing.set(word);
    this.draft = {
      hangul: word.hangul, romanization: word.romanization, translation: word.translation,
      partOfSpeech: word.partOfSpeech ?? '', topicId: word.topicId,
      exampleKo: word.exampleKo ?? '', exampleTranslation: word.exampleTranslation ?? '',
      grammarNote: word.grammarNote ?? '',
    };
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.saving() || !this.draft.hangul.trim() || !this.draft.romanization.trim() || !this.draft.translation.trim()) return;
    const editing = this.editing();
    const draft = {...this.draft};
    const image = this.selectedImage();
    let wordSaved = false;
    this.saving.set(true);
    this.saveError.set(null);
    const request$ = editing
      ? this.api.updateWord(editing.id, draft)
      : this.api.createWord(draft);
    request$.pipe(
      switchMap(word => {
        wordSaved = true;
        // Keep the saved ID so retrying a failed image upload updates this word instead of creating a duplicate.
        this.editing.set(word);
        return image ? this.api.uploadWordMedia(word.id, image, 'image') : of(word);
      }),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.saving.set(false)),
    ).subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.resetImageForm();
        this.load();
      },
      error: () => {
        this.saveError.set(wordSaved
          ? 'Слово сохранено, изображение не загружено. Попробуйте ещё раз.'
          : 'Не получилось сохранить слово. Попробуйте ещё раз.');
        if (wordSaved) this.load();
      },
    });
  }

  onImageSelected(file: File): void {
    if (this.saving()) return;
    this.clearImage();
    if (!IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      this.imageError.set('Выберите непустой PNG, JPEG или WebP размером до 5 МиБ.');
      return;
    }
    this.imageError.set(null);
    this.selectedImage.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogOpen.set(false);
    this.resetImageForm();
  }

  imageUrl(url: string | null): string {
    return url?.trim() || this.defaultWordImage;
  }

  onImageError(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.getAttribute('src') !== this.defaultWordImage) image.src = this.defaultWordImage;
  }

  private clearImage(): void {
    const preview = this.imagePreviewUrl();
    if (preview) URL.revokeObjectURL(preview);
    this.imagePreviewUrl.set(null);
    this.selectedImage.set(null);
  }

  private resetImageForm(): void {
    this.clearImage();
    this.imageError.set(null);
    this.saveError.set(null);
  }

  remove(word: AdminWord): void {
    if (!confirm(`Удалить «${word.hangul}»?`)) return;
    this.api.deleteWord(word.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось удалить (слово может использоваться в уроках).'),
    });
  }

  upload(word: AdminWord, file: File, kind: 'audio' | 'image'): void {
    this.api.uploadWordMedia(word.id, file, kind).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось загрузить файл.'),
    });
  }
}
