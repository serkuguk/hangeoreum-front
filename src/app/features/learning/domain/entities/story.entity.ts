export interface Subtitle {
  lang: string;
  position: number;
  text: string;
  startMs: number;
  endMs: number;
}

export interface StoryClip {
  id: string;
  kind: string;
  speakerId: string | null;
  wordId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  subtitles: Subtitle[];
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
