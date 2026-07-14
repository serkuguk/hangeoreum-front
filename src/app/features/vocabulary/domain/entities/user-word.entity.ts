import {Word} from './word.entity';

export interface UserWord {
  id: string;
  word: Word;
  level: number;        // 0–5 звёзд знания
  isDifficult: boolean;
  dueDate: string;      // ISO date
  repetitions: number;
  easeFactor: number;
}

/** Самооценка SM-2: Снова=1 · Трудно=3 · Хорошо=4 · Легко=5. */
export type SrsQuality = 0 | 1 | 2 | 3 | 4 | 5;
