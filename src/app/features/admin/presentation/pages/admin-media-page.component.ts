import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subject, catchError, debounceTime, distinctUntilChanged, of, switchMap} from 'rxjs';
import {Word} from '@features/vocabulary/domain/entities/word.entity';
import {
  HgButtonComponent,
  HgFilePickerComponent,
  HgInputComponent,
  HgSelectComponent,
  HgSelectOption,
  HgTextareaComponent,
} from '@shared/components/controls';
import {AdminApi, AdminClip, Speaker} from '../../infrastructure/admin.api';

const CLIP_KIND_OPTIONS: readonly HgSelectOption<string>[] = ['IMMERSE', 'STORY', 'WORD']
  .map(value => ({label: value, value}));

@Component({
  selector: 'hg-admin-media-page',
  imports: [
    FormsModule,
    HgButtonComponent,
    HgFilePickerComponent,
    HgInputComponent,
    HgSelectComponent,
    HgTextareaComponent,
  ],
  templateUrl: './admin-media-page.component.html',
  styleUrl: './_admin.scss',
  styles: `
    section.panel { margin-bottom: 16px; }

    .sprow, .cliprow {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--hg-line);
      font-size: 13.5px;

      &:last-child { border: none; }

      .grow { flex: 1; }
      .muted { color: var(--hg-muted); font-size: 12px; }
    }

    .editbox {
      flex-basis: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 8px;

      .wordpick {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
      }
    }

    .subsbox {
      flex-basis: 100%;
      margin-top: 8px;

      hg-textarea { width: 100%; }
    }

    .media-picker { max-width: 5rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMediaPageComponent {
  private api = inject(AdminApi);

  readonly speakers = signal<Speaker[]>([]);
  readonly clips = signal<AdminClip[]>([]);
  readonly error = signal<string | null>(null);
  readonly flash = signal<string | null>(null);
  readonly subtitlesFor = signal<string | null>(null); // clipId с открытым редактором сабов
  readonly editingClip = signal<string | null>(null); // clipId с открытым редактором полей
  readonly editingSpeaker = signal<string | null>(null);
  readonly foundWords = signal<Word[]>([]);
  readonly clipKindOptions = CLIP_KIND_OPTIONS;
  readonly speakerOptions = computed<readonly HgSelectOption<string | null>[]>(() => [
    {label: 'без спикера', value: null},
    ...this.speakers().map(speaker => ({label: speaker.name, value: speaker.id})),
  ]);

  // сигнал: наполняется асинхронно из getSubtitles, иначе zoneless CD не перерисует textarea
  readonly subsDraft = signal('');

  newSpeakerName = '';
  newClipKind = 'IMMERSE';
  speakerDraft = '';
  clipDraft: {kind: string; speakerId: string | null; wordId: string | null; durationMs: number | null} =
    {kind: 'IMMERSE', speakerId: null, wordId: null, durationMs: null};
  clipWordLabel = '';
  wordSearch = '';
  private readonly wordSearch$ = new Subject<string>();

  constructor() {
    this.wordSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => value.trim()
        ? this.api.words(value, 0).pipe(
          catchError(() => {
            this.error.set('Не получилось найти слова.');
            return of(null);
          }),
        )
        : of(null)),
      takeUntilDestroyed(),
    ).subscribe(result => this.foundWords.set(result?.content ?? []));
    this.load();
  }

  load(): void {
    this.api.speakers().subscribe({
      next: speakers => this.speakers.set(speakers),
      error: () => this.error.set('Не получилось загрузить спикеров.'),
    });
    this.api.clips().subscribe({
      next: clips => this.clips.set(clips),
      error: () => this.error.set('Не получилось загрузить клипы.'),
    });
  }

  addSpeaker(): void {
    const name = this.newSpeakerName.trim();
    if (!name) return;
    this.api.createSpeaker({name}).subscribe({
      next: () => {
        this.newSpeakerName = '';
        this.load();
      },
      error: err => this.fail('Не получилось добавить спикера', err),
    });
  }

  removeSpeaker(speaker: Speaker): void {
    if (!confirm(`Удалить спикера «${speaker.name}»?`)) return;
    this.api.deleteSpeaker(speaker.id).subscribe({
      next: () => this.load(),
      error: err => this.fail('Не получилось удалить спикера', err),
    });
  }

  startEditSpeaker(speaker: Speaker): void {
    this.editingSpeaker.set(speaker.id);
    this.speakerDraft = speaker.name;
  }

  saveSpeaker(speaker: Speaker): void {
    const name = this.speakerDraft.trim();
    if (!name) return;
    // avatarUrl/bio отправляем как есть — PUT перезаписывает все поля
    this.api.updateSpeaker(speaker.id, {name, avatarUrl: speaker.avatarUrl, bio: speaker.bio}).subscribe({
      next: () => {
        this.editingSpeaker.set(null);
        this.showFlash('Спикер обновлён');
        this.load();
      },
      error: err => this.fail('Не получилось обновить спикера', err),
    });
  }

  speakerName(id: string | null): string {
    return this.speakers().find(s => s.id === id)?.name ?? '—';
  }

  addClip(): void {
    this.api.createClip({kind: this.newClipKind}).subscribe({
      next: () => this.load(),
      error: err => this.fail('Не получилось добавить клип', err),
    });
  }

  removeClip(clip: AdminClip): void {
    if (!confirm('Удалить клип?')) return;
    this.api.deleteClip(clip.id).subscribe({
      next: () => this.load(),
      error: err => this.fail('Не получилось удалить клип', err),
    });
  }

  togglePublish(clip: AdminClip): void {
    this.api.publishClip(clip.id, !clip.published).subscribe({
      next: updated =>
        this.clips.update(list => list.map(c => c.id === clip.id ? updated : c)),
      error: err => this.fail('Не получилось изменить публикацию', err),
    });
  }

  openEdit(clip: AdminClip): void {
    if (this.editingClip() === clip.id) {
      this.editingClip.set(null);
      return;
    }
    this.editingClip.set(clip.id);
    this.clipDraft = {kind: clip.kind, speakerId: clip.speakerId, wordId: clip.wordId, durationMs: clip.durationMs};
    this.clipWordLabel = clip.wordId ? `ID ${clip.wordId.slice(0, 8)}…` : '';
    this.wordSearch = '';
    this.foundWords.set([]);
  }

  searchWords(value: string): void {
    this.wordSearch = value;
    this.wordSearch$.next(value);
  }

  pickWord(word: Word): void {
    this.clipDraft.wordId = word.id;
    this.clipWordLabel = `${word.hangul} — ${word.translation}`;
    this.wordSearch = '';
    this.foundWords.set([]);
  }

  clearWord(): void {
    this.clipDraft.wordId = null;
    this.clipWordLabel = '';
  }

  saveClip(clip: AdminClip): void {
    this.api.updateClip(clip.id, this.clipDraft).subscribe({
      next: () => {
        this.editingClip.set(null);
        this.showFlash('Клип обновлён');
        this.load();
      },
      error: err => this.fail('Не получилось обновить клип', err),
    });
  }

  upload(clip: AdminClip, file: File, kind: 'video' | 'audio' | 'thumbnail'): void {
    this.showFlash('Загружаем файл…');
    this.api.uploadClipMedia(clip.id, file, kind).subscribe({
      next: () => {
        this.showFlash('Файл загружен');
        this.load();
      },
      error: () => this.error.set('Не получилось загрузить файл.'),
    });
  }

  openSubtitles(clip: AdminClip): void {
    if (this.subtitlesFor() === clip.id) {
      this.subtitlesFor.set(null);
      return;
    }
    this.subtitlesFor.set(clip.id);
    // шаблон-заглушка; заменяется реальными сабами, когда они есть
    this.subsDraft.set(JSON.stringify([
      {lang: 'ko', position: 1, text: '오늘 날씨가 진짜 좋아요!', startMs: 0, endMs: 3000},
      {lang: 'ru', position: 1, text: 'Сегодня погода правда отличная!', startMs: 0, endMs: 3000},
    ], null, 2));
    this.api.getSubtitles(clip.id).subscribe(subtitles => {
      if (subtitles.length && this.subtitlesFor() === clip.id) {
        this.subsDraft.set(JSON.stringify(
          subtitles.map(({lang, position, text, startMs, endMs}) => ({lang, position, text, startMs, endMs})),
          null, 2));
      }
    });
  }

  saveSubtitles(clip: AdminClip): void {
    let subtitles: {lang: string; position: number; text: string; startMs: number; endMs: number}[];
    try {
      subtitles = JSON.parse(this.subsDraft());
    } catch {
      this.error.set('Субтитры — некорректный JSON.');
      return;
    }
    this.api.putSubtitles(clip.id, subtitles).subscribe({
      next: () => {
        this.showFlash('Субтитры сохранены');
        this.subtitlesFor.set(null);
      },
      error: err => this.fail('Не получилось сохранить субтитры', err),
    });
  }

  private showFlash(text: string): void {
    this.flash.set(text);
    setTimeout(() => this.flash.set(null), 1600);
  }

  private fail(prefix: string, err: {error?: {message?: string}; status?: number}): void {
    this.error.set(`${prefix}: ${err?.error?.message ?? err?.status ?? 'ошибка'}`);
  }
}
