import {Observable} from 'rxjs';
import {ClipSubtitle} from '@shared/models/clip-subtitle';

export type {ClipSubtitle} from '@shared/models/clip-subtitle';

export interface Clip {
  id: string;
  title: string | null;
  position: number;
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

export interface ImmerseUnit {
  id: string;
  title: string;
  description: string | null;
  position: number;
}

export interface Feed {
  content: Clip[];
  nextCursor: string | null;
  selectedUnit: ImmerseUnit | null;
  units: ImmerseUnit[];
}

export interface ClipRepository {
  feed(cursor?: string | null, unitId?: string | null): Observable<Feed>;
  markViewed(clipId: string): Observable<void>;
  toggleLike(clipId: string): Observable<{liked: boolean}>;
}
