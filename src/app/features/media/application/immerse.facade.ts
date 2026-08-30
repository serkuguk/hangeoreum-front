import {Injectable, inject, signal} from '@angular/core';
import {Clip} from '../domain/clip.entity';
import {CLIP_REPOSITORY} from './clip-repository.token';
import {TranslateService} from '@ngx-translate/core';

@Injectable()
export class ImmerseFacade {
  private repository = inject(CLIP_REPOSITORY);
  private translate = inject(TranslateService);

  readonly clips = signal<Clip[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly proRequired = signal(false);

  private cursor: string | null = null;
  private exhausted = false;

  load(): void {
    this.cursor = null;
    this.exhausted = false;
    this.clips.set([]);
    this.loadMore();
  }

  loadMore(): void {
    if (this.loading() || this.exhausted) return;
    this.loading.set(true);
    this.repository.feed(this.cursor).subscribe({
      next: feed => {
        this.clips.update(list => [...list, ...feed.content]);
        this.cursor = feed.nextCursor;
        this.exhausted = !feed.nextCursor || feed.content.length === 0;
        this.loading.set(false);
      },
      error: err => {
        if (err?.status === 403) this.proRequired.set(true);
        else this.error.set(this.translate.instant('media.errors.load'));
        this.loading.set(false);
      },
    });
  }

  markViewed(clip: Clip): void {
    if (clip.watched) return;
    this.clips.update(list => list.map(c => c.id === clip.id ? {...c, watched: true} : c));
    this.repository.markViewed(clip.id).subscribe({
      error: () => {
        this.clips.update(list => list.map(c => c.id === clip.id ? {...c, watched: false} : c));
        this.error.set(this.translate.instant('media.errors.view'));
      },
    });
  }

  toggleLike(clip: Clip): void {
    // optimistic
    this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: !c.liked} : c));
    this.repository.toggleLike(clip.id).subscribe({
      next: res => this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: res.liked} : c)),
      error: () => {
        this.clips.update(list => list.map(c => c.id === clip.id ? {...c, liked: clip.liked} : c));
        this.error.set(this.translate.instant('media.errors.like'));
      },
    });
  }

}
