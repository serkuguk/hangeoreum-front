import {FormField, form, min} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TooltipModule} from 'primeng/tooltip';
import {Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, map, of, switchMap} from 'rxjs';
import {
  ButtonComponent,
  DialogComponent,
  FilePickerComponent,
  BasicInputComponent,
  BasicSelectComponent,
  TextareaComponent,
} from 'springest';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AdminApi, AdminClip, AdminClipKind, AdminUnit, AdminWord, MediaUploadKind, Speaker} from '@features/admin/infrastructure/admin.api';
import {ClipSubtitle, SubtitleLang} from '@shared/models/clip-subtitle';
import {parseSrt, toSrt} from './subtitle-srt';

// больше пары ошибок подряд обычно значит «вставили не тот файл» — длинный список не помогает
const SUBTITLE_ERRORS_SHOWN = 3;

const CLIP_KIND_OPTIONS: {label: string; value: string}[] = Object.values(AdminClipKind)
  .map(value => ({label: value, value}));

enum DeletionKind { Speaker = 'speaker', Clip = 'clip' }
type PendingDeletion = {kind: DeletionKind.Speaker; speaker: Speaker}
  | {kind: DeletionKind.Clip; clip: AdminClip};

@Component({
  selector: 'hg-admin-media-page',
  imports: [
    FormField,
    ButtonComponent,
    DialogComponent,
    FilePickerComponent,
    BasicInputComponent,
    BasicSelectComponent,
    TextareaComponent,
    TooltipModule,
    TranslatePipe,
  ],
  templateUrl: './admin-media-page.component.html',
  styleUrl: '../_admin.scss',
  styles: `
    section.panel { margin-bottom: 16px; }
    section.panel--select { overflow: visible; z-index: 1; }
    section.panel--select > app-basic-select { margin-top: 12px; }

    .clip-create {
      margin-top: 20px;

      h3 {
        font-size: 14px;
        margin: 0;
      }
    }

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

    .sprow:has(app-basic-input) { align-items: flex-end; }

    .editbox {
      flex-basis: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 16px 12px;
      margin-top: 12px;

      .wordpick {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px;
        max-width: 32rem;
      }

      .wordhint {
        flex-basis: 100%;
        margin: 0;
      }
    }

    .subsbox {
      flex-basis: 100%;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
      gap: 12px 16px;
      margin-top: 8px;

      .subshint,
      .subsactions {
        grid-column: 1 / -1;
      }

      .substrack {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .subserr {
        margin: 0;
        color: var(--hg-red);
        font-size: 12px;
      }

      app-textarea {
        width: 100%;
      }
    }

    .media-picker { width: 2.75rem; max-width: 2.75rem; height: 2.75rem; }

    .media-picker--done {
      position: relative;
      border-radius: 8px;
      box-shadow: 0 0 0 2px var(--hg-jade);

      &::after {
        content: '✓';
        position: absolute;
        top: -6px;
        right: -6px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--hg-jade);
        color: #fff;
        font-size: 11px;
        line-height: 16px;
        text-align: center;
        pointer-events: none;
      }
    }

    .videobox {
      flex-basis: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;

      p {
        margin: 0;
        word-break: break-all;
      }

      video {
        width: 12rem;
        max-height: 7rem;
        border-radius: 8px;
        background: #000;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMediaPageComponent {
  private api = inject(AdminApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private translate = inject(TranslateService);

  readonly speakers = signal<Speaker[]>([]);
  readonly clips = signal<AdminClip[]>([]);
  readonly selectedUnitId = signal<string | null>(null);
  readonly filteredClips = computed(() => this.clips().filter(clip => !this.selectedUnitId() || clip.unitId === this.selectedUnitId()));
  readonly filterOptions = computed(() => [
    {label: this.translate.instant('admin.media.allUnits'), value: null},
    ...this.units().map(unit => ({label: unit.title, value: unit.id})),
  ]);
  readonly error = signal<string | null>(null);
  readonly pendingDeletion = signal<PendingDeletion | null>(null);
  readonly deletionSaving = signal(false);
  readonly deletionError = signal<string | null>(null);
  readonly deletionTitle = computed(() => {
    const action = this.pendingDeletion();
    if (!action) return '';
    return this.translate.instant(action.kind === DeletionKind.Speaker
      ? 'admin.media.deleteSpeakerTitle' : 'admin.media.deleteClipAria');
  });
  readonly deletionMessage = computed(() => {
    const action = this.pendingDeletion();
    if (!action) return '';
    if (action.kind === DeletionKind.Speaker) {
      return this.translate.instant('admin.media.confirm.deleteSpeaker', {name: action.speaker.name});
    }
    const clip = action.clip;
    return `${this.translate.instant('admin.media.confirm.deleteClip')} ${clip.kind} · ${this.mediaSummary(clip)} · ${clip.id.slice(0, 8)}`;
  });
  readonly flash = signal<string | null>(null);
  readonly subtitlesFor = signal<string | null>(null); // clipId с открытым редактором сабов
  readonly editingClip = signal<string | null>(null); // clipId с открытым редактором полей
  readonly editingSpeaker = signal<string | null>(null);
  readonly foundWords = signal<AdminWord[]>([]);
  readonly clipKindOptions = CLIP_KIND_OPTIONS;
  readonly speakerOptions = computed<{label: string; value: string | null}[]>(() => [
    {label: this.translate.instant('admin.media.noSpeaker'), value: null},
    ...this.speakers().map(speaker => ({label: speaker.name, value: speaker.id})),
  ]);
  readonly units = signal<AdminUnit[]>([]);
  readonly unitOptions = computed<{label: string; value: string | null}[]>(() => [
    {label: this.translate.instant('admin.media.noUnit'), value: null},
    ...this.units().map(unit => ({label: unit.title, value: unit.id})),
  ]);

  // сигналы: наполняются асинхронно (getSubtitles, file.text()), иначе zoneless CD не перерисует textarea
  readonly koDraft = signal('');
  readonly ruDraft = signal('');
  readonly koField = form(this.koDraft);
  readonly ruField = form(this.ruDraft);
  readonly subtitlesReady = signal(false);
  readonly subtitlesSaving = signal(false);
  private subtitlesRequest = 0;
  // дорожки других языков редактор не показывает, но PUT заменяет всё — возвращаем их как были
  private otherSubtitles: ClipSubtitle[] = [];
  private readonly koParsed = computed(() => parseSrt(this.koDraft(), SubtitleLang.Ko));
  private readonly ruParsed = computed(() => parseSrt(this.ruDraft(), SubtitleLang.Ru));
  readonly subtitleTracks = computed(() => [
    {lang: SubtitleLang.Ko, labelKey: 'admin.media.subtitlesKo', field: this.koField, parsed: this.koParsed()},
    {lang: SubtitleLang.Ru, labelKey: 'admin.media.subtitlesRu', field: this.ruField, parsed: this.ruParsed()},
  ].map(track => ({
    ...track,
    count: track.parsed.subtitles.length,
    errors: track.parsed.errors.slice(0, SUBTITLE_ERRORS_SHOWN),
    hasErrors: track.parsed.errors.length > 0,
  })));
  readonly canSaveSubtitles = computed(() => this.subtitlesReady() && !this.subtitlesSaving()
    && !this.subtitleTracks().some(track => track.hasErrors));

  readonly newSpeakerName = signal('');
  readonly newSpeakerNameField = form(this.newSpeakerName);
  readonly newClipKind = signal<string>(AdminClipKind.Immerse);
  readonly newClipKindField = form(this.newClipKind);
  readonly speakerDraft = signal('');
  readonly speakerDraftField = form(this.speakerDraft);
  readonly clipDraft = signal<{kind: string; title: string; position: number | null; speakerId: string | null; wordId: string | null; unitId: string | null; durationMs: number | null}>(
    {kind: AdminClipKind.Immerse, title: '', position: null, speakerId: null, wordId: null, unitId: null, durationMs: null});
  readonly clipFields = form(this.clipDraft, path => min(path.durationMs, 0));
  readonly wordHintKey = computed(() => this.clipDraft().wordId ? 'admin.media.wordLinkedHint' : 'admin.media.wordSearchHint');
  clipWordLabel = '';
  wordSearch = '';
  private readonly wordSearch$ = new Subject<string>();

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe(params => this.selectedUnitId.set(params.get('unitId')));
    this.wordSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(value => value.trim()
        ? this.api.words(value, 0).pipe(
          catchError(() => {
            this.error.set(this.translate.instant('admin.media.errors.findWords'));
            return of(null);
          }),
        )
        : of(null)),
      takeUntilDestroyed(),
    ).subscribe(result => this.foundWords.set(result?.content ?? []));
    this.loadUnits();
    this.load();
  }

  load(): void {
    this.api.speakers().subscribe({
      next: speakers => this.speakers.set(speakers),
      error: () => this.error.set(this.translate.instant('admin.media.errors.loadSpeakers')),
    });
    this.api.clips().subscribe({
      next: clips => this.clips.set(clips),
      error: () => this.error.set(this.translate.instant('admin.media.errors.loadClips')),
    });
  }

  // юниты не меняются на этой странице — грузим один раз, не в load()
  private loadUnits(): void {
    this.api.courses().pipe(
      switchMap(courses => courses.length ? forkJoin(courses.map(course => this.api.units(course.id))) : of([])),
      map(unitsByCourse => unitsByCourse.flat()),
    ).subscribe({
      next: units => this.units.set(units),
      error: () => this.error.set(this.translate.instant('admin.media.errors.loadUnits')),
    });
  }

  addSpeaker(): void {
    const name = this.newSpeakerName().trim();
    if (!name) return;
    this.api.createSpeaker({name}).subscribe({
      next: () => {
        this.newSpeakerName.set('');
        this.load();
      },
      error: err => this.fail('admin.media.errors.addSpeaker', err),
    });
  }

  removeSpeaker(speaker: Speaker): void {
    if (this.deletionSaving()) return;
    this.deletionError.set(null);
    this.pendingDeletion.set({kind: DeletionKind.Speaker, speaker});
  }

  startEditSpeaker(speaker: Speaker): void {
    this.editingSpeaker.set(speaker.id);
    this.speakerDraft.set(speaker.name);
  }

  saveSpeaker(speaker: Speaker): void {
    const name = this.speakerDraft().trim();
    if (!name) return;
    // avatarUrl/bio отправляем как есть — PUT перезаписывает все поля
    this.api.updateSpeaker(speaker.id, {name, avatarUrl: speaker.avatarUrl, bio: speaker.bio}).subscribe({
      next: () => {
        this.editingSpeaker.set(null);
        this.showFlash(this.translate.instant('admin.media.flash.speakerUpdated'));
        this.load();
      },
      error: err => this.fail('admin.media.errors.updateSpeaker', err),
    });
  }

  filterUnit(unitId: unknown): void {
    if (unitId !== null && (typeof unitId !== 'string' || !this.units().some(unit => unit.id === unitId))) return;
    void this.router.navigate([], {relativeTo: this.route, queryParams: {unitId}, queryParamsHandling: 'merge'});
  }

  isUnboundImmerse(clip: AdminClip): boolean {
    return clip.kind === AdminClipKind.Immerse && !clip.unitId;
  }

  unitName(id: string | null): string | null {
    return this.units().find(u => u.id === id)?.title ?? null;
  }

  speakerName(id: string | null): string {
    return this.speakers().find(s => s.id === id)?.name ?? '—';
  }

  addClip(): void {
    this.api.createClip({kind: this.newClipKind(), unitId: this.selectedUnitId()}).subscribe({
      next: () => this.load(),
      error: err => this.fail('admin.media.errors.addClip', err),
    });
  }

  removeClip(clip: AdminClip): void {
    if (this.deletionSaving()) return;
    this.deletionError.set(null);
    this.pendingDeletion.set({kind: DeletionKind.Clip, clip});
  }

  onDeletionVisibleChange(visible: boolean): void {
    if (!visible) this.closeDeletion();
  }

  closeDeletion(): void {
    if (this.deletionSaving()) return;
    this.pendingDeletion.set(null);
    this.deletionError.set(null);
  }

  confirmDeletion(): void {
    const action = this.pendingDeletion();
    if (!action || this.deletionSaving()) return;
    this.deletionSaving.set(true);
    this.deletionError.set(null);
    const request$ = action.kind === DeletionKind.Speaker
      ? this.api.deleteSpeaker(action.speaker.id)
      : this.api.deleteClip(action.clip.id);
    request$.subscribe({
      next: () => {
        this.load();
        this.deletionSaving.set(false);
        this.closeDeletion();
      },
      error: err => {
        this.deletionSaving.set(false);
        this.deletionError.set(this.translate.instant('admin.media.errors.errorWithDetail', {
          prefix: this.translate.instant(action.kind === DeletionKind.Speaker
            ? 'admin.media.errors.deleteSpeaker' : 'admin.media.errors.deleteClip'),
          detail: err?.error?.message ?? err?.status ?? this.translate.instant('admin.media.errors.unknownDetail'),
        }));
      },
    });
  }

  togglePublish(clip: AdminClip): void {
    this.api.publishClip(clip.id, !clip.published).subscribe({
      next: updated =>
        this.clips.update(list => list.map(c => c.id === clip.id ? updated : c)),
      error: err => this.fail('admin.media.errors.publishClip', err),
    });
  }

  openEdit(clip: AdminClip): void {
    if (this.editingClip() === clip.id) {
      this.editingClip.set(null);
      return;
    }
    this.editingClip.set(clip.id);
    this.clipFields().reset({kind: clip.kind, title: clip.title ?? '', position: clip.position ?? null, speakerId: clip.speakerId, wordId: clip.wordId, unitId: clip.unitId ?? null, durationMs: clip.durationMs});
    this.clipWordLabel = clip.wordId
      ? this.translate.instant('admin.media.wordIdLabel', {id: clip.wordId.slice(0, 8)})
      : '';
    this.wordSearch = '';
    this.foundWords.set([]);
  }

  searchWords(value: string): void {
    this.wordSearch = value;
    this.wordSearch$.next(value);
  }

  pickWord(word: AdminWord): void {
    this.clipDraft.update(draft => ({...draft, wordId: word.id}));
    this.clipWordLabel = this.translate.instant('admin.media.wordLabel', {hangul: word.hangul, translation: word.translation});
    this.wordSearch = '';
    this.foundWords.set([]);
  }

  clearWord(): void {
    this.clipDraft.update(draft => ({...draft, wordId: null}));
    this.clipWordLabel = '';
  }

  saveClip(clip: AdminClip): void {
    if (this.clipFields().invalid()) {
      this.error.set(this.translate.instant('admin.media.errors.durationNegative'));
      return;
    }
    const position = this.clipDraft().position;
    if (position !== null && (!Number.isInteger(position) || position < 0)) {
      this.error.set(this.translate.instant('admin.media.errors.invalidNumbers'));
      return;
    }
    this.error.set(null);
    this.api.updateClip(clip.id, this.clipDraft()).subscribe({
      next: () => {
        this.editingClip.set(null);
        this.showFlash(this.translate.instant('admin.media.flash.clipUpdated'));
        this.load();
      },
      error: err => this.fail('admin.media.errors.updateClip', err),
    });
  }

  readonly uploadKind = MediaUploadKind;

  isEditing(clip: AdminClip): boolean {
    return this.editingClip() === clip.id;
  }

  editButtonClass(clip: AdminClip): string {
    return `hg-button hg-button--sm hg-button--${this.isEditing(clip) ? 'secondary' : 'ghost'}`;
  }

  publishButtonClass(clip: AdminClip): string {
    return `hg-button hg-button--sm hg-button--${clip.published ? 'secondary' : 'ghost'}`;
  }

  publishIcon(clip: AdminClip): string {
    return clip.published ? '👁' : '🚫';
  }

  publishAria(clip: AdminClip): string {
    return this.translate.instant(clip.published ? 'admin.media.unpublishClip' : 'admin.media.publishClip');
  }

  mediaSummary(clip: AdminClip): string {
    const video = this.translate.instant(clip.videoUrl ? 'admin.media.videoPresent' : 'admin.media.videoAbsent');
    const audio = this.translate.instant(clip.audioUrl ? 'admin.media.audioPresent' : 'admin.media.audioAbsent');
    return this.translate.instant('admin.media.summary', {speaker: this.speakerName(clip.speakerId), video, audio});
  }

  // до V19 бэкенд не сохранял имя — UUID из URL ничего не говорит админу, показываем подсказку
  videoName(clip: AdminClip): string {
    return clip.videoName ?? this.translate.instant('admin.media.unknownVideoName');
  }

  hasMedia(clip: AdminClip, kind: MediaUploadKind): boolean {
    const url = {[MediaUploadKind.VIDEO]: clip.videoUrl, [MediaUploadKind.AUDIO]: clip.audioUrl, [MediaUploadKind.THUMBNAIL]: clip.thumbnailUrl}[kind];
    return !!url;
  }

  mediaTooltip(clip: AdminClip, kind: MediaUploadKind): string {
    const keys = {
      [MediaUploadKind.VIDEO]: ['admin.media.replaceVideoTooltip', 'admin.media.uploadVideoTooltip'],
      [MediaUploadKind.AUDIO]: ['admin.media.replaceAudioTooltip', 'admin.media.uploadAudioTooltip'],
      [MediaUploadKind.THUMBNAIL]: ['admin.media.replaceThumbnailTooltip', 'admin.media.uploadThumbnailTooltip'],
    }[kind];
    return this.translate.instant(this.hasMedia(clip, kind) ? keys[0] : keys[1], {name: this.videoName(clip)});
  }

  wordAria(word: AdminWord): string {
    return this.translate.instant('admin.builder.bindWordAria', {hangul: word.hangul, translation: word.translation});
  }

  upload(clip: AdminClip, file: File, kind: MediaUploadKind): void {
    this.showFlash(this.translate.instant('admin.media.uploading'));
    this.api.uploadClipMedia(clip.id, file, kind).subscribe({
      next: () => {
        this.showFlash(this.translate.instant('admin.media.uploaded'));
        this.load();
      },
      error: () => this.error.set(this.translate.instant('admin.media.errors.uploadFile')),
    });
  }

  openSubtitles(clip: AdminClip): void {
    if (this.subtitlesSaving()) return;
    const request = ++this.subtitlesRequest;
    this.subtitlesReady.set(false);
    if (this.subtitlesFor() === clip.id) {
      this.subtitlesFor.set(null);
      return;
    }
    this.subtitlesFor.set(clip.id);
    this.error.set(null);
    this.koDraft.set('');
    this.ruDraft.set('');
    this.otherSubtitles = [];
    this.api.getSubtitles(clip.id).subscribe({
      next: subtitles => {
        if (request !== this.subtitlesRequest || this.subtitlesFor() !== clip.id) return;
        const byLang = (lang: SubtitleLang) => subtitles.filter(sub => sub.lang === lang);
        this.koDraft.set(toSrt(byLang(SubtitleLang.Ko)));
        this.ruDraft.set(toSrt(byLang(SubtitleLang.Ru)));
        this.otherSubtitles = subtitles
          .filter(sub => sub.lang !== SubtitleLang.Ko && sub.lang !== SubtitleLang.Ru)
          .map(({lang, position, text, startMs, endMs}) => ({lang, position, text, startMs, endMs}));
        this.subtitlesReady.set(true);
      },
      error: err => {
        if (request === this.subtitlesRequest && this.subtitlesFor() === clip.id) {
          this.fail('admin.media.errors.loadSubtitles', err);
        }
      },
    });
  }

  saveSubtitles(clip: AdminClip): void {
    if (!this.canSaveSubtitles() || this.subtitlesFor() !== clip.id) return;
    const subtitles = [...this.koParsed().subtitles, ...this.ruParsed().subtitles, ...this.otherSubtitles];
    this.subtitlesSaving.set(true);
    this.api.putSubtitles(clip.id, subtitles).subscribe({
      next: () => {
        this.subtitlesSaving.set(false);
        this.subtitlesReady.set(false);
        this.showFlash(this.translate.instant('admin.media.flash.subtitlesSaved'));
        this.subtitlesFor.set(null);
      },
      error: err => {
        this.subtitlesSaving.set(false);
        this.fail('admin.media.errors.saveSubtitles', err);
      },
    });
  }

  loadSubtitlesFile(lang: SubtitleLang, file: File | undefined): void {
    if (!file) return;
    const draft = lang === SubtitleLang.Ko ? this.koDraft : this.ruDraft;
    file.text().then(
      text => draft.set(text),
      () => this.error.set(this.translate.instant('admin.media.errors.readSubtitlesFile')),
    );
  }

  private showFlash(text: string): void {
    this.flash.set(text);
    setTimeout(() => this.flash.set(null), 1600);
  }

  private fail(messageKey: string, err: {error?: {message?: string}; status?: number}): void {
    this.error.set(this.translate.instant('admin.media.errors.errorWithDetail', {
      prefix: this.translate.instant(messageKey),
      detail: err?.error?.message ?? err?.status ?? this.translate.instant('admin.media.errors.unknownDetail'),
    }));
  }
}
