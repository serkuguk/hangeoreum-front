import {SrsQuality} from '../entities/user-word.entity';

export interface SrsState {
  repetitions: number;
  easeFactor: number;
  interval: number; // дни
}

/**
 * SM-2 (как Anki), чистая функция — фронт считает локально для мгновенного UI,
 * бэк авторитетно пересчитывает те же формулы.
 * q < 3 → сброс: repetitions=0, interval=1.
 * q ≥ 3 → 1 → 6 → round(interval × EF); EF' = max(1.3, EF + (0.1 − (5−q)(0.08 + (5−q)·0.02))).
 */
export function computeNextReview(state: SrsState, quality: SrsQuality): SrsState {
  const easeFactor = Math.max(
    1.3,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (quality < 3) {
    return {repetitions: 0, interval: 1, easeFactor};
  }

  const repetitions = state.repetitions + 1;
  const interval =
    repetitions === 1 ? 1 :
    repetitions === 2 ? 6 :
    Math.round(state.interval * easeFactor);

  return {repetitions, interval, easeFactor};
}
