import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {Word} from '@features/vocabulary/domain/entities/word.entity';
import {
  HgButtonComponent,
  HgDialogComponent,
  HgFilePickerComponent,
  HgInputComponent,
  HgPaginationComponent,
  HgSelectComponent,
  HgSelectOption,
} from '@shared/components/controls';
import {AdminApi, Topic, WordRequest} from '../../infrastructure/admin.api';

const EMPTY_DRAFT: WordRequest = {
  hangul: '', romanization: '', translation: '',
  partOfSpeech: '', topicId: null, exampleKo: '', exampleTranslation: '', grammarNote: '',
};

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
          <tr><th>Хангыль</th><th>Романизация</th><th>Перевод</th><th>Медиа</th><th></th></tr>
        </thead>
        <tbody>
          @for (word of words(); track word.id) {
            <tr>
              <td class="kr">{{ word.hangul }}</td>
              <td>{{ word.romanization }}</td>
              <td>{{ word.translation }}</td>
              <td>
                <hg-file-picker label="🔊" ariaLabel="Загрузить аудио слова"
                                accept="audio/*" (fileSelected)="upload(word, $event, 'audio')" />
                <hg-file-picker label="🖼" ariaLabel="Загрузить изображение слова"
                                accept="image/*" (fileSelected)="upload(word, $event, 'image')" />
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

    <hg-dialog [visible]="dialogOpen()" (visibleChange)="dialogOpen.set($event)"
               [title]="editing() ? 'Изменить слово' : 'Новое слово'">
      <hg-input label="Хангыль" [(ngModel)]="draft.hangul" lang="ko" required />
      <hg-input label="Романизация" [(ngModel)]="draft.romanization" required />
      <hg-input label="Перевод" [(ngModel)]="draft.translation" required />
      <hg-input label="Часть речи" [(ngModel)]="draft.partOfSpeech" placeholder="существительное" />
      <hg-select label="Тема" placeholder="" [options]="topicOptions()" [(ngModel)]="draft.topicId" />
      <hg-input label="Пример (ko)" [(ngModel)]="draft.exampleKo" lang="ko" />
      <hg-input label="Перевод примера" [(ngModel)]="draft.exampleTranslation" />
      <hg-input label="Грамматическая пометка" [(ngModel)]="draft.grammarNote" />
      <div dialog-actions class="btns">
        <hg-button label="Сохранить" [disabled]="!draft.hangul || !draft.romanization || !draft.translation"
                   (pressed)="save()" />
        <hg-button label="Отмена" variant="ghost" (pressed)="dialogOpen.set(false)" />
      </div>
    </hg-dialog>
  `,
  styleUrl: './_admin.scss',
  styles: `.addbtn { padding: 11px 20px; font-size: 14px; }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWordsPageComponent {
  private api = inject(AdminApi);

  readonly words = signal<Word[]>([]);
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
  readonly editing = signal<Word | null>(null);
  draft: WordRequest = {...EMPTY_DRAFT};

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private readonly search$ = new Subject<string>();

  constructor() {
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
    this.api.topics().subscribe(topics => this.topics.set(topics));
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
    this.editing.set(null);
    this.draft = {...EMPTY_DRAFT};
    this.dialogOpen.set(true);
  }

  openEdit(word: Word): void {
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
    const editing = this.editing();
    const request$ = editing
      ? this.api.updateWord(editing.id, this.draft)
      : this.api.createWord(this.draft);
    request$.subscribe({
      next: () => {
        this.dialogOpen.set(false);
        this.load();
      },
      error: () => this.error.set('Не получилось сохранить слово.'),
    });
  }

  remove(word: Word): void {
    if (!confirm(`Удалить «${word.hangul}»?`)) return;
    this.api.deleteWord(word.id).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось удалить (слово может использоваться в уроках).'),
    });
  }

  upload(word: Word, file: File, kind: 'audio' | 'image'): void {
    this.api.uploadWordMedia(word.id, file, kind).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось загрузить файл.'),
    });
  }
}
