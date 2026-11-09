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
import {ADMIN_PAGE_SIZE, AdminApi, AdminWord, Topic, WordMediaKind, WordRequest} from '@features/admin/infrastructure/admin.api';

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
  templateUrl: './admin-words-page.component.html',
  styleUrls: ['../_admin.scss', './admin-words-page.component.scss'],
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

  readonly pageSize = ADMIN_PAGE_SIZE;
  readonly totalPages = computed(() => Math.ceil(this.total() / this.pageSize));
  readonly canSave = computed(() => {
    const draft = this.draft();
    return !this.saving() && !!draft.hangul.trim() && !!draft.romanization.trim() && !!draft.translation.trim();
  });
  readonly dialogTitleKey = computed(() => this.editing() ? 'admin.words.editTitle' : 'admin.words.create');
  readonly saveLabelKey = computed(() => this.saving() ? 'admin.words.saving' : 'admin.words.save');

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
    if (!this.canSave()) return;
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
        return image ? this.api.uploadWordMedia(word.id, image, WordMediaKind.Image) : of(word);
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

  onAudioPicked(word: AdminWord, files: File[]): void {
    if (files[0]) this.upload(word, files[0], WordMediaKind.Audio);
  }

  onImagePicked(files: File[]): void {
    if (files[0]) this.onImageSelected(files[0]);
  }

  onDialogVisibleChange(visible: boolean): void {
    if (!visible) this.closeDialog();
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

  upload(word: AdminWord, file: File, kind: WordMediaKind): void {
    this.api.uploadWordMedia(word.id, file, kind).subscribe({
      next: () => this.load(),
      error: () => this.error.set(this.translate.instant('admin.words.uploadError')),
    });
  }
}
