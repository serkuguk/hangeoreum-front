import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {FormField, form, required, disabled} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, finalize, of, switchMap} from 'rxjs';
import {
  ButtonComponent,
  DialogComponent,
  FilePickerComponent,
  BasicInputComponent,
  PaginationComponent,
  BasicSelectComponent,
} from 'springest';
import {AdminApi, AdminWord, Topic, WordRequest} from '@features/admin/infrastructure/admin.api';

const EMPTY_DRAFT = {
  hangul: '', romanization: '', translation: '',
  partOfSpeech: '', topicId: null as string | null, exampleKo: '', exampleTranslation: '', grammarNote: '',
} satisfies WordRequest;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Component({
  selector: 'hg-admin-words-page',
  imports: [
    TranslatePipe,
    FormField,
    ButtonComponent,
    DialogComponent,
    FilePickerComponent,
    BasicInputComponent,
    PaginationComponent,
    BasicSelectComponent,
  ],
  template: `
    <h2 class="pagettl">{{ 'admin.words.title' | translate }}</h2>
    <p class="pagesub">{{ 'admin.words.count' | translate: {count: total()} }}</p>

    <div class="toolbar">
      <app-basic-input class="search" type="search" [label]="'admin.words.search' | translate"
                [placeholder]="'admin.words.searchPlaceholder' | translate" [value]="search()"
                (valueChange)="onSearch($event)" />
      <app-button [label]="'admin.words.create' | translate" (click)="openCreate()" styleClass="hg-button"><span aria-hidden="true">+</span></app-button>
    </div>

    @if (error()) {
      <div class="errbar">{{ error() }}</div>
    }

    <div class="panel">
      <div class="words-table-scroll">
      <table class="atable admin-words-table">
        <thead>
          <tr><th>{{ 'admin.words.hangul' | translate }}</th><th>{{ 'admin.words.romanization' | translate }}</th><th>{{ 'admin.words.translation' | translate }}</th><th>{{ 'admin.words.media' | translate }}</th><th></th></tr>
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
                <app-file-picker class="audio-picker" #picker1 label="🔊" [ariaLabel]="'admin.words.uploadAudio' | translate"
                                accept="audio/*" (changed)="$event[0] && upload(word, $event[0], 'audio'); picker1.value.set([])" />
                </div>
              </td>
              <td>
                <div class="word-actions">
                  <app-button [label]="'admin.words.edit' | translate" (click)="openEdit(word)" styleClass="hg-button hg-button--ghost hg-button--sm"></app-button>
                  <app-button [label]="'admin.words.delete' | translate" (click)="remove(word)" styleClass="hg-button hg-button--danger hg-button--sm"></app-button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">{{ 'admin.words.empty' | translate }}</td></tr>
          }
        </tbody>
      </table>
      </div>
      @if (totalPages() > 1) {
        <app-pagination [rows]="20" [first]="page() * 20" [totalRecords]="total()"
                       [attr.aria-label]="'admin.words.pagination' | translate" (pageChange)="goToPage($event.page ?? 0)" />
      }
    </div>

    @if (dialogOpen()) {
    <app-dialog [closeAriaLabel]="'admin.words.close' | translate" [visible]="true" (visibleChange)="!$event && closeDialog()"
               [closable]="!saving()" [closeOnEscape]="!saving()" [dismissableMask]="false"
               [header]="(editing() ? 'admin.words.editTitle' : 'admin.words.create') | translate">
      <div class="word-image-field">
        <img class="word-preview" [src]="previewImage()" (error)="onImageError($event)"
             alt="" width="96" height="96" decoding="async" />
        <div>
          <app-file-picker #picker2 [label]="'admin.words.chooseImage' | translate" [ariaLabel]="'admin.words.image' | translate"
                          accept="image/png,image/jpeg,image/webp" ariaDescribedBy="image-picker-hint"
                          [disabled]="saving()" (changed)="$event[0] && onImageSelected($event[0]); picker2.value.set([])" />
          <p id="image-picker-hint">{{ 'admin.words.imageHint' | translate }}</p>
          @if (imageError()) { <p class="image-error" role="alert">{{ imageError() }}</p> }
        </div>
      </div>
      @if (saveError()) { <div class="errbar" role="alert">{{ saveError() }}</div> }
      <app-basic-input [label]="'admin.words.hangul' | translate" [formField]="fields.hangul" lang="ko" />
      <app-basic-input [label]="'admin.words.romanizationLabel' | translate" [placeholder]="'admin.words.romanizationPlaceholder' | translate" [formField]="fields.romanization" />
      <app-basic-input [label]="'admin.words.translation' | translate" [formField]="fields.translation" />
      <app-basic-input [label]="'admin.words.partOfSpeech' | translate" [formField]="fields.partOfSpeech" [placeholder]="'admin.words.partOfSpeechPlaceholder' | translate" />
      <app-basic-select [ariaLabel]="'admin.words.topic' | translate" [placeholder]="'admin.words.topic' | translate" [items]="topicOptions()" [formField]="fields.topicId" optionLabel="label" optionValue="value" />
      <app-basic-input [label]="'admin.words.exampleKo' | translate" [formField]="fields.exampleKo" lang="ko" />
      <app-basic-input [label]="'admin.words.exampleTranslation' | translate" [formField]="fields.exampleTranslation" />
      <app-basic-input [label]="'admin.words.grammarNote' | translate" [formField]="fields.grammarNote" />
      <div dialogActions class="btns">
        <app-button [label]="(saving() ? 'admin.words.saving' : 'admin.words.save') | translate"
                   [disabled]="saving() || !draft().hangul.trim() || !draft().romanization.trim() || !draft().translation.trim()"
                   (click)="save()" styleClass="hg-button"></app-button>
        <app-button [label]="'admin.words.cancel' | translate" [disabled]="saving()" (click)="closeDialog()" styleClass="hg-button hg-button--ghost"></app-button>
      </div>
    </app-dialog>
    }
  `,
  styleUrl: '../_admin.scss',
  styles: `
    .word-media, .word-image-field { display: flex; align-items: center; gap: 1rem; }
    .words-table-scroll { overflow-x: auto; }
    .admin-words-table { min-width: 42rem; }
    .word-media { flex-wrap: nowrap; gap: .5rem; }
    .word-media app-file-picker.audio-picker { width: auto; flex: 0 0 auto; }
    .word-actions { display: flex; align-items: center; gap: .5rem; white-space: nowrap; }
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
  private translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly words = signal<AdminWord[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly search = signal('');
  readonly error = signal<string | null>(null);
  readonly topics = signal<Topic[]>([]);
  readonly topicOptions = computed<{label: string; value: string | null}[]>(() => [
    {label: this.translate.instant('admin.words.noTopic'), value: null},
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
  readonly draft = signal({...EMPTY_DRAFT});
  readonly fields = form(this.draft, path => {
    required(path.hangul);
    required(path.romanization);
    required(path.translation);
    disabled(path, () => this.saving());
  });

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private readonly search$ = new Subject<string>();

  constructor() {
    this.destroyRef.onDestroy(() => this.clearImage());
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => this.api.words(search, 0).pipe(
        catchError(() => {
          this.error.set(this.translate.instant('admin.words.loadError'));
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
      error: () => this.error.set(this.translate.instant('admin.words.topicsError')),
    });
  }

  load(): void {
    this.api.words(this.search(), this.page()).subscribe({
      next: result => {
        this.words.set(result.content);
        this.total.set(result.totalElements);
      },
      error: () => this.error.set(this.translate.instant('admin.words.loadError')),
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
    this.fields().reset({...EMPTY_DRAFT});
    this.dialogOpen.set(true);
  }

  openEdit(word: AdminWord): void {
    if (this.saving()) return;
    this.resetImageForm();
    this.editing.set(word);
    this.fields().reset({
      hangul: word.hangul, romanization: word.romanization, translation: word.translation,
      partOfSpeech: word.partOfSpeech ?? '', topicId: word.topicId,
      exampleKo: word.exampleKo ?? '', exampleTranslation: word.exampleTranslation ?? '',
      grammarNote: word.grammarNote ?? '',
    });
    this.dialogOpen.set(true);
  }

  save(): void {
    if (this.saving() || !this.draft().hangul.trim() || !this.draft().romanization.trim() || !this.draft().translation.trim()) return;
    const editing = this.editing();
    const draft = {...this.draft()};
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
        this.fields().reset({...EMPTY_DRAFT});
        this.resetImageForm();
        this.load();
      },
      error: () => {
        this.saveError.set(wordSaved
          ? this.translate.instant('admin.words.imageSaveError')
          : this.translate.instant('admin.words.saveError'));
        if (wordSaved) this.load();
      },
    });
  }

  onImageSelected(file: File): void {
    if (this.saving()) return;
    this.clearImage();
    if (!IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_SIZE) {
      this.imageError.set(this.translate.instant('admin.words.invalidImage'));
      return;
    }
    this.imageError.set(null);
    this.selectedImage.set(file);
    this.imagePreviewUrl.set(URL.createObjectURL(file));
  }

  closeDialog(): void {
    if (this.saving()) return;
    this.dialogOpen.set(false);
    this.fields().reset({...EMPTY_DRAFT});
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
    if (!confirm(this.translate.instant('admin.words.deleteConfirm', {hangul: word.hangul}))) return;
    this.api.deleteWord(word.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.words.deleteError')),
    });
  }

  upload(word: AdminWord, file: File, kind: 'audio' | 'image'): void {
    this.api.uploadWordMedia(word.id, file, kind).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.words.uploadError')),
    });
  }
}
