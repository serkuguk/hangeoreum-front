import {FormField, form, min} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
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
    TranslatePipe,
  ],
  templateUrl: './admin-media-page.component.html',
  styleUrl: '../_admin.scss',
  styles: `
    section.panel { margin-bottom: 16px; }
    section.panel--select { overflow: visible; z-index: 1; }

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

      app-textarea { width: 100%; }
    }

    .media-picker { width: 2.75rem; max-width: 2.75rem; height: 2.75rem; }
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

  // сигнал: наполняется асинхронно из getSubtitles, иначе zoneless CD не перерисует textarea
  readonly subsDraft = signal('');
  readonly subtitlesReady = signal(false);
  readonly subtitlesSaving = signal(false);
  private subtitlesRequest = 0;
  readonly subsField = form(this.subsDraft);

  readonly newSpeakerName = signal('');
  readonly newSpeakerNameField = form(this.newSpeakerName);
  readonly newClipKind = signal<string>(AdminClipKind.Immerse);
  readonly newClipKindField = form(this.newClipKind);
  readonly speakerDraft = signal('');
  readonly speakerDraftField = form(this.speakerDraft);
  readonly clipDraft = signal<{kind: string; title: string; position: number | null; speakerId: string | null; wordId: string | null; unitId: string | null; durationMs: number | null}>(
    {kind: AdminClipKind.Immerse, title: '', position: null, speakerId: null, wordId: null, unitId: null, durationMs: null});
  readonly clipFields = form(this.clipDraft, path => min(path.durationMs, 0));
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
    this.subsDraft.set('');
    this.api.getSubtitles(clip.id).subscribe({
      next: subtitles => {
        if (request !== this.subtitlesRequest || this.subtitlesFor() !== clip.id) return;
        this.subsDraft.set(JSON.stringify(
          subtitles.map(({lang, position, text, startMs, endMs}) => ({lang, position, text, startMs, endMs})),
          null, 2));
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
    if (!this.subtitlesReady() || this.subtitlesSaving() || this.subtitlesFor() !== clip.id) return;
    let subtitles: {lang: string; position: number; text: string; startMs: number; endMs: number}[];
    try {
      subtitles = JSON.parse(this.subsDraft());
    } catch {
      this.error.set(this.translate.instant('admin.media.errors.subtitlesJson'));
      return;
    }
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
