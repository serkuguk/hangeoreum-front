import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AdminApi, AdminExercise, AdminLessonFull} from '../../infrastructure/admin.api';
import {Word} from '@features/vocabulary/domain/entities/word.entity';

/** Шаблоны payload по kind — подставляются в JSON-редактор при добавлении. */
const PAYLOAD_TEMPLATES: Record<string, unknown> = {
  CHOICE: {question: '친구', romanization: 'chingu', options: [
    {text: 'друг', icon: '🧑‍🤝‍🧑', correct: true}, {text: 'школа', icon: '🏫'},
    {text: 'время', icon: '⏰'}, {text: 'любовь', icon: '❤️'}]},
  LISTEN_CHOICE: {audioUrl: '', text: '안녕하세요', options: [
    {text: 'здравствуйте', correct: true}, {text: 'до свидания'}, {text: 'спасибо'}, {text: 'извините'}]},
  WORD_ORDER: {translation: 'Я — студент', tokens: ['저는', '학생', '이에요'], extra: ['친구는']},
  FILL_BLANK: {sentence: '저 ___ 학생이에요.', translation: 'Я — студент', hint: '저 кончается на гласную',
    options: [{text: '는', hint: 'после гласной'}, {text: '은', hint: 'после согласной'}], correct: '는'},
  MATCH_PAIRS: {pairs: [{left: '친구', right: 'друг'}, {left: '학교', right: 'школа'},
    {left: '사랑', right: 'любовь'}, {left: '시간', right: 'время'}]},
  TYPE_WORD: {translation: 'друг', answer: '친구', romanization: 'chingu'},
};

const KINDS = Object.keys(PAYLOAD_TEMPLATES);

@Component({
  selector: 'hg-admin-lesson-builder-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-lesson-builder-page.component.html',
  styleUrl: './_admin.scss',
  styles: `
    .exrow {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--hg-line);

      &:last-child { border: none; }

      .kind { font-weight: 700; font-size: 13px; min-width: 120px; padding-top: 4px; }

      textarea {
        flex: 1;
        min-height: 84px;
        background: var(--hg-card-2);
        border: 1px solid var(--hg-line);
        border-radius: 10px;
        padding: 10px;
        color: var(--hg-txt);
        font-family: monospace;
        font-size: 12px;

        &.badjson { border-color: var(--hg-red); }
      }
    }

    .addex {
      display: flex;
      gap: 8px;
      margin-top: 14px;

      select {
        background: var(--hg-card-2);
        border: 1px solid var(--hg-line);
        border-radius: 10px;
        padding: 9px 12px;
        color: var(--hg-txt);
      }
    }

    .tipform {
      display: flex;
      flex-direction: column;
      gap: 10px;

      input, textarea {
        background: var(--hg-card-2);
        border: 1px solid var(--hg-line);
        border-radius: 10px;
        padding: 10px 12px;
        color: var(--hg-txt);
        font-size: 13.5px;
        font-family: inherit;
      }

      textarea { min-height: 90px; }
      .mono { font-family: monospace; font-size: 12px; }
    }

    .wordpick {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;

      .wchip {
        background: var(--hg-card-2);
        border: 1px solid var(--hg-line);
        border-radius: 99px;
        padding: 6px 12px;
        font-size: 13px;
        cursor: pointer;
        color: var(--hg-txt);

        &.on { border-color: var(--hg-jade); background: rgba(31, 199, 155, .12); }
      }
    }

    .savedmark { color: var(--hg-jade); font-size: 12.5px; margin-left: 8px; }
    section.panel { margin-bottom: 16px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLessonBuilderPageComponent {
  readonly id = input.required<string>();

  private api = inject(AdminApi);

  readonly data = signal<AdminLessonFull | null>(null);
  readonly error = signal<string | null>(null);
  readonly savedFlash = signal<string | null>(null);

  readonly kinds = KINDS;
  newKind = 'CHOICE';

  // черновики payload как JSON-строки по id упражнения
  payloadDrafts: Record<string, string> = {};
  badJson: Record<string, boolean> = {};

  tipTitle = '';
  tipBody = '';
  tipExamples = '';

  // поиск слов для привязки
  wordSearch = '';
  readonly foundWords = signal<Word[]>([]);
  private searchTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    setTimeout(() => this.load());
  }

  load(): void {
    this.api.lessonFull(this.id()).subscribe({
      next: data => {
        this.data.set(data);
        this.payloadDrafts = Object.fromEntries(
          data.exercises.map(e => [e.id, JSON.stringify(e.payload, null, 2)]));
        this.tipTitle = data.tip?.title ?? '';
        this.tipBody = data.tip?.bodyMd ?? '';
        this.tipExamples = data.tip?.examples ? JSON.stringify(data.tip.examples, null, 2)
          : JSON.stringify([{ko: '저는 학생이에요.', translation: 'Я — студент', highlight: ['는']}], null, 2);
      },
      error: () => this.error.set('Не получилось загрузить урок.'),
    });
  }

  addExercise(): void {
    const data = this.data();
    if (!data) return;
    this.api.createExercise(this.id(), {
      position: data.exercises.length + 1,
      kind: this.newKind,
      payload: PAYLOAD_TEMPLATES[this.newKind],
    }).subscribe({
      next: () => this.load(),
      error: () => this.error.set('Не получилось добавить упражнение.'),
    });
  }

  saveExercise(exercise: AdminExercise): void {
    let payload: unknown;
    try {
      payload = JSON.parse(this.payloadDrafts[exercise.id]);
      this.badJson[exercise.id] = false;
    } catch {
      this.badJson[exercise.id] = true;
      return;
    }
    this.api.updateExercise(this.id(), exercise.id, {
      position: exercise.position,
      kind: exercise.kind,
      payload,
    }).subscribe({
      next: () => this.flash('Упражнение сохранено'),
      error: () => this.error.set('Бэк отклонил payload — проверь обязательные поля.'),
    });
  }

  removeExercise(exercise: AdminExercise): void {
    if (!confirm('Удалить упражнение?')) return;
    this.api.deleteExercise(this.id(), exercise.id).subscribe(() => this.load());
  }

  saveTip(): void {
    let examples: unknown = null;
    if (this.tipExamples.trim()) {
      try {
        examples = JSON.parse(this.tipExamples);
      } catch {
        this.error.set('Examples — некорректный JSON.');
        return;
      }
    }
    this.api.putTip(this.id(), {title: this.tipTitle, bodyMd: this.tipBody, examples})
      .subscribe({
        next: () => this.flash('Tip сохранён'),
        error: () => this.error.set('Не получилось сохранить tip.'),
      });
  }

  searchWords(value: string): void {
    this.wordSearch = value;
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.api.words(value, 0).subscribe(result => this.foundWords.set(result.content));
    }, 300);
  }

  isLinked(word: Word): boolean {
    return !!this.data()?.words.some(w => w.id === word.id);
  }

  toggleWord(word: Word): void {
    const data = this.data();
    if (!data) return;
    const ids = this.isLinked(word)
      ? data.words.filter(w => w.id !== word.id).map(w => w.id)
      : [...data.words.map(w => w.id), word.id];
    this.api.putLessonWords(this.id(), ids).subscribe(words => {
      this.data.set({...data, words});
      this.flash('Слова урока обновлены');
    });
  }

  private flash(text: string): void {
    this.savedFlash.set(text);
    setTimeout(() => this.savedFlash.set(null), 1500);
  }
}
