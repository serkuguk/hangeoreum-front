import {SrsQuality} from '../entities/user-word.entity';

export type GameMode = 'MATCH' | 'LISTEN' | 'SPELL';

export interface GameAnswer {
  wordId: string;
  quality: SrsQuality;
}

const FAST_MS = 3000;
const BASE_POINTS = 10;
const MAX_COMBO = 5;

/**
 * Движок мини-игр (Drops-механика): очки, комбо, маппинг ответа в SM-2 quality.
 * Чистый TS — таймер и раунды живут в фасаде.
 * Верно и быстро (< 3с) = 5 · верно = 4 · ошибка = 1.
 */
export class GameEngine {
  private comboValue = 0;
  private scoreValue = 0;
  private answersByWord = new Map<string, SrsQuality>();

  get score(): number {
    return this.scoreValue;
  }

  get combo(): number {
    return this.comboValue;
  }

  /** Итоговые ответы для review-сессии: по слову берётся худшее качество. */
  get answers(): GameAnswer[] {
    return [...this.answersByWord].map(([wordId, quality]) => ({wordId, quality}));
  }

  registerAnswer(wordId: string, correct: boolean, elapsedMs: number): void {
    const quality: SrsQuality = correct ? (elapsedMs < FAST_MS ? 5 : 4) : 1;

    const previous = this.answersByWord.get(wordId);
    if (previous === undefined || quality < previous) {
      this.answersByWord.set(wordId, quality);
    }

    if (correct) {
      this.comboValue = Math.min(MAX_COMBO, this.comboValue + 1);
      this.scoreValue += BASE_POINTS * this.comboValue;
    } else {
      this.comboValue = 0;
    }
  }
}

/** Слоги слова для Spell (собери из слогов). */
export function syllables(hangul: string): string[] {
  return [...hangul.normalize('NFC')].filter(ch => ch.trim().length > 0);
}
