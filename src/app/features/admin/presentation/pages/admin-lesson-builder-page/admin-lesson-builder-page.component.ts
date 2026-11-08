import { FormField, form } from '@angular/forms/signals';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  of,
  switchMap,
} from 'rxjs';
import {
  AdminApi,
  AdminExercise,
  AdminLessonFull,
  AdminWord,
} from '@features/admin/infrastructure/admin.api';
import {
  ButtonComponent,
  BasicInputComponent,
  BasicSelectComponent,
  TextareaComponent,
} from 'springest';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  ExerciseKind,
  TipExample,
} from '@features/learning/domain/entities/exercise.entity';
import { ExerciseEditorComponent } from '../../components/exercise-editor/exercise-editor.component';
import {
  ExerciseDraft,
  emptyDraft,
  toDraft,
  toPayload,
  validateDraft,
} from '../../components/exercise-editor/exercise-payload.mapper';

const KINDS: readonly ExerciseKind[] = [
  'CHOICE',
  'LISTEN_CHOICE',
  'WORD_ORDER',
  'FILL_BLANK',
  'MATCH_PAIRS',
  'TYPE_WORD',
];

/** Строка примера tip в форме; highlight — через запятую. */
interface TipExampleDraft {
  ko: string;
  translation: string;
  highlight: string;
  note?: string;
}

const emptyTipExample = (): TipExampleDraft => ({ko: '', translation: '', highlight: ''});

@Component({
  selector: 'hg-admin-lesson-builder-page',
  imports: [
    FormField,
    RouterLink,
    ButtonComponent,
    BasicInputComponent,
    BasicSelectComponent,
    TextareaComponent,
    TranslatePipe,
    ExerciseEditorComponent,
  ],
  templateUrl: './admin-lesson-builder-page.component.html',
  styleUrls: ['../_admin.scss', './admin-lesson-builder-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLessonBuilderPageComponent {
  readonly id = input.required<string>();

  private api = inject(AdminApi);
  private translate = inject(TranslateService);

  removeWordAria(word: AdminWord): string {
    return this.translate.instant('admin.builder.removeWordAria', {
      hangul: word.hangul,
      translation: word.translation,
    });
  }

  bindWordAria(word: AdminWord): string {
    return this.translate.instant('admin.builder.bindWordAria', {
      hangul: word.hangul,
      translation: word.translation,
    });
  }

  readonly data = signal<AdminLessonFull | null>(null);
  readonly error = signal<string | null>(null);
  readonly savedFlash = signal<string | null>(null);
  readonly wordsSaving = signal(false);

  readonly kindOptions = KINDS.map((value) => ({
    label: this.translate.instant(`admin.builder.kinds.${value}`),
    value,
  }));
  readonly newKind = signal<ExerciseKind>('CHOICE');
  readonly newKindField = form(this.newKind);

  // черновики форм упражнений по id; JSON собирается только при сохранении
  readonly drafts = signal<Record<string, ExerciseDraft>>({});
  readonly draftErrors = signal<Record<string, string[]>>({});

  readonly tipTitle = signal('');
  readonly tipTitleField = form(this.tipTitle);
  readonly tipBody = signal('');
  readonly tipBodyField = form(this.tipBody);
  readonly tipExamples = signal<TipExampleDraft[]>([]);
  readonly tipExamplesField = form(this.tipExamples);

  // поиск слов для привязки
  wordSearch = '';
  readonly foundWords = signal<AdminWord[]>([]);
  private readonly wordSearch$ = new Subject<string>();

  constructor() {
    this.wordSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((value) =>
          this.api.words(value, 0).pipe(
            catchError(() => {
              this.error.set(this.translate.instant('admin.builder.errors.findWords'));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => this.foundWords.set(result?.content ?? []));
    setTimeout(() => this.load());
  }

  load(): void {
    this.api.lessonFull(this.id()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.drafts.set(
          Object.fromEntries(
            data.exercises.map((e) => [e.id, toDraft(this.kindOf(e), e.payload)]),
          ),
        );
        this.draftErrors.set({});
        this.tipTitle.set(data.tip?.title ?? '');
        this.tipBody.set(data.tip?.bodyMd ?? '');
        const examples = (data.tip?.examples ?? []) as TipExample[];
        this.tipExamples.set(
          examples.length
            ? examples.map((e) => ({...e, highlight: (e.highlight ?? []).join(', ')}))
            : [emptyTipExample()],
        );
      },
      error: () =>
        this.error.set(this.translate.instant('admin.builder.errors.loadLesson')),
    });
  }

  addExercise(): void {
    const data = this.data();
    if (!data) return;
    this.api
      .createExercise(this.id(), {
        position: Math.max(0, ...data.exercises.map(exercise => exercise.position)) + 1,
        kind: this.newKind(),
        payload: toPayload(this.newKind(), emptyDraft()),
      })
      .subscribe({
        next: () => this.load(),
        error: () =>
          this.error.set(this.translate.instant('admin.builder.errors.addExercise')),
      });
  }

  kindOf(exercise: AdminExercise): ExerciseKind {
    return exercise.kind as ExerciseKind;
  }

  setDraft(id: string, draft: ExerciseDraft): void {
    this.drafts.update((all) => ({...all, [id]: draft}));
  }

  saveExercise(exercise: AdminExercise): void {
    const kind = this.kindOf(exercise);
    const draft = this.drafts()[exercise.id];
    const errors = validateDraft(kind, draft);
    this.draftErrors.update((all) => ({...all, [exercise.id]: errors}));
    if (errors.length) return;
    const payload = toPayload(kind, draft);
    this.api
      .updateExercise(this.id(), exercise.id, {
        position: exercise.position,
        kind: exercise.kind,
        payload,
      })
      .subscribe({
        next: () =>
          this.flash(this.translate.instant('admin.builder.flash.exerciseSaved')),
        error: () =>
          this.error.set(this.translate.instant('admin.builder.errors.payloadRejected')),
      });
  }

  removeExercise(exercise: AdminExercise): void {
    if (!confirm(this.translate.instant('admin.builder.errors.deleteConfirm'))) return;
    this.api.deleteExercise(this.id(), exercise.id).subscribe({
      next: () => this.load(),
      error: () =>
        this.error.set(this.translate.instant('admin.builder.errors.deleteExercise')),
    });
  }

  addTipExample(): void {
    this.tipExamples.update((rows) => [...rows, emptyTipExample()]);
  }

  removeTipExample(index: number): void {
    this.tipExamples.update((rows) => rows.filter((_, i) => i !== index));
  }

  saveTip(): void {
    const rows = this.tipExamples().filter((row) => row.ko.trim());
    const examples: TipExample[] | null = rows.length
      ? rows.map(({highlight, ...row}) => {
          const parts = highlight.split(',').map((h) => h.trim()).filter(Boolean);
          return {
            ...row,
            ko: row.ko.trim(),
            translation: row.translation.trim(),
            ...(parts.length ? {highlight: parts} : {}),
          };
        })
      : null;
    this.api
      .putTip(this.id(), {
        title: this.tipTitle(),
        bodyMd: this.tipBody(),
        examples,
      })
      .subscribe({
        next: () => this.flash(this.translate.instant('admin.builder.flash.tipSaved')),
        error: () =>
          this.error.set(this.translate.instant('admin.builder.errors.saveTip')),
      });
  }

  searchWords(value: string): void {
    this.wordSearch = value;
    this.wordSearch$.next(value);
  }

  isLinked(word: AdminWord): boolean {
    return !!this.data()?.words.some((w) => w.id === word.id);
  }

  toggleWord(word: AdminWord): void {
    const data = this.data();
    if (!data || this.wordsSaving()) return;
    const ids = this.isLinked(word)
      ? data.words.filter((w) => w.id !== word.id).map((w) => w.id)
      : [...data.words.map((w) => w.id), word.id];
    this.wordsSaving.set(true);
    this.api.putLessonWords(this.id(), ids).pipe(
      finalize(() => this.wordsSaving.set(false)),
    ).subscribe({
      next: (words) => {
        this.data.update(current => current ? { ...current, words } : current);
        this.flash(this.translate.instant('admin.builder.flash.wordsSaved'));
      },
      error: () =>
        this.error.set(this.translate.instant('admin.builder.errors.saveWords')),
    });
  }

  private flash(text: string): void {
    this.savedFlash.set(text);
    setTimeout(() => this.savedFlash.set(null), 1500);
  }
}
