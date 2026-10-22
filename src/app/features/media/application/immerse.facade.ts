import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subscription, finalize} from 'rxjs';
import {Clip, ImmerseUnit} from '../domain/clip.entity';
import {CLIP_REPOSITORY} from './clip-repository.token';
import {TranslateService} from '@ngx-translate/core';

@Injectable()
export class ImmerseFacade {
  private readonly repository = inject(CLIP_REPOSITORY);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  readonly clips = signal<Clip[]>([]);
  readonly units = signal<ImmerseUnit[]>([]);
  readonly selectedUnit = signal<ImmerseUnit | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly proRequired = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly hasMore = signal(false);
  private cursor: string | null = null;
  private requestedUnitId: string | null = null;
  private request?: Subscription;
  private actions = new Subscription();
  private readonly viewed = new Set<string>();
  private readonly liking = new Set<string>();

  constructor() {
    this.destroyRef.onDestroy(() => this.cancel());
  }

  cancel(): void {
    this.request?.unsubscribe();
    this.actions.unsubscribe();
    this.actions = new Subscription();
    this.liking.clear();
    this.loading.set(false);
  }

  load(unitId: string | null = null): void {
    this.cancel();
    this.requestedUnitId = unitId;
    this.selectedUnit.set(this.units().find(unit => unit.id === unitId) ?? null);
    this.cursor = null;
    this.hasMore.set(true);
    this.clips.set([]);
    this.loadMore();
  }

  loadMore(): void {
    if (this.loading() || !this.hasMore()) return;
    this.error.set(null);
    this.proRequired.set(false);
    this.actionError.set(null);
    this.loading.set(true);
    this.request = this.repository.feed(this.cursor, this.requestedUnitId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: feed => {
        this.clips.update(list => [...list, ...feed.content]);
        this.units.set(feed.units);
        this.selectedUnit.set(feed.selectedUnit);
        this.requestedUnitId = feed.selectedUnit?.id ?? null;
        this.cursor = feed.nextCursor;
        this.hasMore.set(!!feed.nextCursor && feed.content.length > 0);
        this.loading.set(false);
      },
      error: err => {
        if (err?.status === 403 && !this.requestedUnitId) this.proRequired.set(true);
        else this.error.set(this.translate.instant('media.errors.load'));
        this.loading.set(false);
      },
    });
  }

  markViewed(clip: Clip): void {
    // Historical watched includes likes; only deduplicate actual completions in this session.
    if (this.viewed.has(clip.id)) return;
    this.viewed.add(clip.id);
    let saved = false;
    this.actions.add(this.repository.markViewed(clip.id).pipe(finalize(() => {
      if (!saved) this.viewed.delete(clip.id);
    })).subscribe({
      next: () => { saved = true; },
      error: () => {
        this.viewed.delete(clip.id);
        this.actionError.set(this.translate.instant('media.errors.view'));
      },
    }));
  }

  toggleLike(clip: Clip): void {
    if (this.liking.has(clip.id)) return;
    this.liking.add(clip.id);
    this.actionError.set(null);
    this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: !c.liked} : c));
    this.actions.add(this.repository.toggleLike(clip.id).subscribe({
      next: res => {
        this.liking.delete(clip.id);
        this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: res.liked} : c));
      },
      error: () => {
        this.liking.delete(clip.id);
        this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: clip.liked} : c));
        this.actionError.set(this.translate.instant('media.errors.like'));
      },
    }));
  }
}
