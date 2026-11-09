export interface ClipSubtitle {
  lang: string;
  position: number;
  text: string;
  startMs: number;
  endMs: number;
}

export enum SubtitleLang {
  Ko = 'ko',
  Ru = 'ru',
}
