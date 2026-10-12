import {ClipSubtitle} from '@shared/models/clip-subtitle';

export interface StoryClip {
  id: string;
  kind: string;
  speakerId: string | null;
  wordId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  subtitles: ClipSubtitle[];
}

export interface StoryBreakdownItem {
  token: string;
  note: string;
  wordId?: string;
}

export interface StoryLine {
  position: number;
  speaker: string | null;
  textKo: string;
  textTranslation: string | null;
  breakdown: StoryBreakdownItem[] | null;
  startMs: number | null;
  endMs: number | null;
}

export interface Story {
  id: string;
  title: string;
  clip: StoryClip | null;
  lines: StoryLine[];
}
