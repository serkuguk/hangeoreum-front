import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {ClipSubtitle} from '@shared/models/clip-subtitle';

export type {ClipSubtitle} from '@shared/models/clip-subtitle';

export interface Clip {
  id: string;
  kind: string;
  speakerId: string | null;
  wordId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  subtitles: ClipSubtitle[];
  watched: boolean;
  liked: boolean;
}

export interface Feed {
  content: Clip[];
  nextCursor: string | null;
}

export interface ClipRepository {
  feed(cursor?: string | null): Observable<Feed>;
  markViewed(clipId: string): Observable<void>;
  toggleLike(clipId: string): Observable<{liked: boolean}>;
}

export const CLIP_REPOSITORY = new InjectionToken<ClipRepository>('ClipRepository');
