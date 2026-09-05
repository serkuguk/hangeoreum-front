import {ChoiceOption} from '../entities/exercise.entity';

export interface Feedback {
  correct: boolean;
  expected?: string;
  note?: string;
}

export function gradeChoice(option: ChoiceOption, options: ChoiceOption[]): Feedback {
  const correct = !!option.correct;
  return {correct, expected: correct ? undefined : options.find(o => o.correct)?.text};
}

export function gradeExactAnswer(actual: string, expected: string): Feedback {
  const correct = actual === expected;
  return {correct, expected: correct ? undefined : expected};
}

export function gradeWordOrder(actual: string[], expected: string[]): Feedback {
  return gradeExactAnswer(actual.join(' '), expected.join(' '));
}

export function gradeTypedAnswer(actual: string, expected: string): Feedback {
  // NFC keeps decomposed Hangul from IME equivalent to composed syllables.
  const normalize = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim();
  const correct = normalize(actual) === normalize(expected);
  return {correct, expected: correct ? undefined : expected};
}

export function isMatchingPair(
  first: {pairIndex: number; side: 'left' | 'right'},
  second: {pairIndex: number; side: 'left' | 'right'},
): boolean {
  return first.pairIndex === second.pairIndex && first.side !== second.side;
}

export function gradeMatch(mistakes: number): Feedback {
  return {correct: mistakes === 0};
}
