// Сборка хангыля из отдельных чамо по раскладке 두벌식 (как корейский IME).
// ponytail: работает только с концом строки — позиция каретки не учитывается;
// если понадобится ввод в середину, резать строку по selectionStart.

const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ';
/** Индекс 0 — «нет патчима». */
const JONG = ' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';

/** Составные гласные и патчимы: пара чамо → один символ. */
const PAIRS: Record<string, string> = {
  'ㅗㅏ': 'ㅘ', 'ㅗㅐ': 'ㅙ', 'ㅗㅣ': 'ㅚ', 'ㅜㅓ': 'ㅝ', 'ㅜㅔ': 'ㅞ', 'ㅜㅣ': 'ㅟ', 'ㅡㅣ': 'ㅢ',
  'ㄱㅅ': 'ㄳ', 'ㄴㅈ': 'ㄵ', 'ㄴㅎ': 'ㄶ', 'ㄹㄱ': 'ㄺ', 'ㄹㅁ': 'ㄻ', 'ㄹㅂ': 'ㄼ',
  'ㄹㅅ': 'ㄽ', 'ㄹㅌ': 'ㄾ', 'ㄹㅍ': 'ㄿ', 'ㄹㅎ': 'ㅀ', 'ㅂㅅ': 'ㅄ',
};
const SPLIT: Record<string, string> = Object.fromEntries(Object.entries(PAIRS).map(([pair, joined]) => [joined, pair]));

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;

interface Syllable {
  l: number;
  v: number;
  t: number;
}

function decompose(char: string): Syllable | null {
  const code = char.charCodeAt(0) - SYLLABLE_BASE;
  if (!char || code < 0 || code >= SYLLABLE_COUNT) return null;
  return {l: Math.floor(code / 588), v: Math.floor((code % 588) / 28), t: code % 28};
}

function compose(l: number, v: number, t = 0): string {
  return String.fromCharCode(SYLLABLE_BASE + (l * 21 + v) * 28 + t);
}

/** Дописывает чамо (или любой символ) в конец текста, собирая слоги. */
export function appendJamo(text: string, jamo: string): string {
  const head = text.slice(0, -1);
  const last = text.slice(-1);
  const syllable = decompose(last);
  const vowel = JUNG.indexOf(jamo);

  if (jamo && vowel >= 0) {
    if (syllable?.t) {
      // 각 + ㅏ → 가가, 닭 + ㅏ → 달가: патчим уходит в начало нового слога.
      const pair = SPLIT[JONG[syllable.t]];
      const keep = pair ? JONG.indexOf(pair[0]) : 0;
      const move = pair ? pair[1] : JONG[syllable.t];
      return head + compose(syllable.l, syllable.v, keep) + compose(CHO.indexOf(move), vowel);
    }
    if (syllable) {
      const joined = PAIRS[JUNG[syllable.v] + jamo];
      if (joined) return head + compose(syllable.l, JUNG.indexOf(joined));
    }
    const lead = CHO.indexOf(last);
    if (last && lead >= 0) return head + compose(lead, vowel);
    return text + jamo;
  }

  if (syllable && jamo) {
    if (!syllable.t) {
      const tail = JONG.indexOf(jamo);
      if (tail > 0) return head + compose(syllable.l, syllable.v, tail);
    } else {
      const joined = PAIRS[JONG[syllable.t] + jamo];
      if (joined) return head + compose(syllable.l, syllable.v, JONG.indexOf(joined));
    }
  }
  return text + jamo;
}

/** Backspace по одной чамо: 닭 → 달 → 다 → ㄷ → ''. */
export function deleteLastJamo(text: string): string {
  const head = text.slice(0, -1);
  const syllable = decompose(text.slice(-1));
  if (!syllable) return head;
  if (syllable.t) {
    const pair = SPLIT[JONG[syllable.t]];
    return head + compose(syllable.l, syllable.v, pair ? JONG.indexOf(pair[0]) : 0);
  }
  const pair = SPLIT[JUNG[syllable.v]];
  if (pair) return head + compose(syllable.l, JUNG.indexOf(pair[0]));
  return head + CHO[syllable.l];
}

export interface HangulKey {
  /** KeyboardEvent.code — не зависит от раскладки ОС. */
  code: string;
  base: string;
  shift: string;
}

const ROWS: [codes: string, base: string, shift: string][] = [
  ['QWERTYUIOP', 'ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ', 'ㅃㅉㄸㄲㅆㅛㅕㅑㅒㅖ'],
  ['ASDFGHJKL', 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ', 'ㅁㄴㅇㄹㅎㅗㅓㅏㅣ'],
  ['ZXCVBNM', 'ㅋㅌㅊㅍㅠㅜㅡ', 'ㅋㅌㅊㅍㅠㅜㅡ'],
];

/** Раскладка 두벌식 по рядам физической клавиатуры. */
export const HANGUL_LAYOUT: readonly HangulKey[][] = ROWS.map(([codes, base, shift]) =>
  [...codes].map((letter, i) => ({code: `Key${letter}`, base: base[i], shift: shift[i]})),
);

const KEYS_BY_CODE = new Map(HANGUL_LAYOUT.flat().map(key => [key.code, key]));

/** Чамо для физической клавиши или undefined, если клавиша не буквенная. */
export function jamoForCode(code: string, shift: boolean): string | undefined {
  const key = KEYS_BY_CODE.get(code);
  return key && (shift ? key.shift : key.base);
}
