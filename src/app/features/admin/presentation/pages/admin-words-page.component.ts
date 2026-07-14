import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {Word} from '@features/vocabulary/domain/entities/word.entity';
import {AdminApi, Topic, WordRequest} from '../../infrastructure/admin.api';

const EMPTY_DRAFT: WordRequest = {
  hangul: '', romanization: '', translation: '',
  partOfSpeech: '', topicId: null, exampleKo: '', exampleTranslation: '', grammarNote: '',
};

@Component({
  selector: 'hg-admin-words-page',
  imports: [FormsModule],
  template: `
    <h2 class="pagettl">Слова</h2>
    <p class="pagesub">{{ total() }} слов в базе.</p>

    <div class="toolbar">
      <input class="search" type="search" placeholder="Поиск: хангыль или перевод…"
             [ngModel]="search()" (ngModelChange)="onSearch($event)">
      <button type="button" class="cta addbtn" (click)="openCreate()">+ Новое слово</button>
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
                <label class="rowbtn" [class.on]="word.audioUrl">
                  🔊 <input type="file" accept="audio/*" hidden (change)="upload(word, $event, 'audio')">
                </label>
                <label class="rowbtn" [class.on]="word.imageUrl">
                  🖼 <input type="file" accept="image/*" hidden (change)="upload(word, $event, 'image')">
                </label>
              </td>
              <td>
                <button type="button" class="rowbtn" (click)="openEdit(word)">Изменить</button>
                <button type="button" class="rowbtn danger" (click)="remove(word)">Удалить</button>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5" class="empty">Слов пока нет — добавь первое.</td></tr>
          }
        </tbody>
      </table>
      @if (totalPages() > 1) {
        <div class="pager">
          <button type="button" class="rowbtn" [disabled]="page() === 0" (click)="page.set(page() - 1); load()">←</button>
          {{ page() + 1 }} / {{ totalPages() }}
          <button type="button" class="rowbtn" [disabled]="page() + 1 >= totalPages()" (click)="page.set(page() + 1); load()">→</button>
        </div>
      }
    </div>

    @if (dialogOpen()) {
      <div class="modal-backdrop" (click)="dialogOpen.set(false)"></div>
      <div class="modal panel" role="dialog">
        <h3>{{ editing() ? 'Изменить слово' : 'Новое слово' }}</h3>
        <label>Хангыль *<input class="kr" [(ngModel)]="draft.hangul" lang="ko"></label>
        <label>Романизация *<input [(ngModel)]="draft.romanization"></label>
        <label>Перевод *<input [(ngModel)]="draft.translation"></label>
        <label>Часть речи<input [(ngModel)]="draft.partOfSpeech" placeholder="существительное"></label>
        <label>Тема
          <select [(ngModel)]="draft.topicId">
            <option [ngValue]="null">— без темы —</option>
            @for (topic of topics(); track topic.id) {
              <option [ngValue]="topic.id">{{ topic.title }}</option>
            }
          </select>
        </label>
        <label>Пример (ko)<input class="kr" [(ngModel)]="draft.exampleKo" lang="ko"></label>
        <label>Перевод примера<input [(ngModel)]="draft.exampleTranslation"></label>
        <label>Грамматическая пометка<input [(ngModel)]="draft.grammarNote"></label>
        <div class="btns">
          <button type="button" class="cta" [disabled]="!draft.hangul || !draft.romanization || !draft.translation"
                  (click)="save()">Сохранить</button>
          <button type="button" class="ghostbtn" (click)="dialogOpen.set(false)">Отмена</button>
        </div>
      </div>
    }
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

  readonly dialogOpen = signal(false);
  readonly editing = signal<Word | null>(null);
  draft: WordRequest = {...EMPTY_DRAFT};

  readonly totalPages = computed(() => Math.ceil(this.total() / 20));

  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
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
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.load(), 300);
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

  upload(word: Word, event: Event, kind: 'audio' | 'image'): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.api.uploadWordMedia(word.id, file, kind).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось загрузить файл.'),
    });
  }
}
