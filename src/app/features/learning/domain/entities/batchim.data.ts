/** Контент урока 받침 (прототип docs/uploads/hangeoreum-grammar.html) — статичный, бэкенд не нужен. */

export interface BatchimExample {
  word: string;
  ipa: string;
  meaning: string;
}

/** Семья простых патчимов: несколько букв — один звук в конце слога. */
export interface BatchimFamily {
  ghost: string;
  /** строки букв семьи (длинную семью ㄷ… рисуем в две строки) */
  rows: string[][];
  sound: string;
  soundNote: string;
  /** акцентный цвет карточки — CSS-переменная палитры */
  accent: string;
  examples: BatchimExample[];
}

export interface ComplexBatchim extends BatchimExample {
  combo: string;
}

export interface LinkingExample {
  first: string;
  second: string;
  result: string;
  description: string;
  spoken: string;
}

export const BATCHIM_FAMILIES: BatchimFamily[] = [
  {
    ghost: '윽', rows: [['ㄱ', 'ㅋ', 'ㄲ']], sound: 'к̚', soundNote: 'глухой, без выдоха', accent: 'var(--hg-jade)',
    examples: [
      {word: '국', ipa: 'кук', meaning: 'суп'},
      {word: '부엌', ipa: 'пуок', meaning: 'кухня (받침 ㅋ)'},
    ],
  },
  {
    ghost: '은', rows: [['ㄴ']], sound: 'н', soundNote: 'как в русском', accent: 'var(--hg-blue)',
    examples: [
      {word: '눈', ipa: 'нун', meaning: 'снег / глаза'},
      {word: '손', ipa: 'сон', meaning: 'рука'},
    ],
  },
  {
    ghost: '읃', rows: [['ㄷ', 'ㅅ', 'ㅆ'], ['ㅈ', 'ㅊ', 'ㅌ']], sound: 'т̚', soundNote: 'глухой, без выдоха', accent: 'var(--hg-yellow)',
    examples: [
      {word: '옷', ipa: 'от', meaning: 'одежда (받침 ㅅ)'},
      {word: '꽃', ipa: 'ккот', meaning: 'цветок (받침 ㅊ)'},
      {word: '밑', ipa: 'мит', meaning: 'низ (받침 ㅌ)'},
    ],
  },
  {
    ghost: '을', rows: [['ㄹ']], sound: 'ль', soundNote: 'мягче русского «л»', accent: 'var(--hg-red)',
    examples: [
      {word: '물', ipa: 'муль', meaning: 'вода'},
      {word: '길', ipa: 'киль', meaning: 'дорога'},
    ],
  },
  {
    ghost: '음', rows: [['ㅁ']], sound: 'м', soundNote: 'как в русском', accent: 'var(--hg-jade)',
    examples: [
      {word: '밤', ipa: 'пам', meaning: 'ночь / каштан'},
      {word: '김', ipa: 'ким', meaning: 'водоросли / пар'},
    ],
  },
  {
    ghost: '읍', rows: [['ㅂ', 'ㅍ']], sound: 'п̚', soundNote: 'глухой, без выдоха', accent: 'var(--hg-blue)',
    examples: [
      {word: '밥', ipa: 'пап', meaning: 'рис / еда'},
      {word: '앞', ipa: 'ап', meaning: 'перед (받침 ㅍ)'},
    ],
  },
  {
    ghost: '응', rows: [['ㅇ']], sound: 'нг', soundNote: 'носовое, как в «song»', accent: 'var(--hg-yellow)',
    examples: [
      {word: '방', ipa: 'пан', meaning: 'комната'},
      {word: '강', ipa: 'кан', meaning: 'река'},
    ],
  },
];

export const COMPLEX_BATCHIM: ComplexBatchim[] = [
  {combo: 'ㄳ', word: '몫', ipa: 'мок', meaning: 'доля, часть — звучит ㄱ'},
  {combo: 'ㄵ', word: '앉다', ipa: 'анта', meaning: 'садиться — звучит ㄴ'},
  {combo: 'ㄶ', word: '많다', ipa: 'мантха', meaning: 'много — звучит ㄴ + придыхание'},
  {combo: 'ㄺ', word: '닭', ipa: 'так', meaning: 'курица — звучит ㄱ'},
  {combo: 'ㄻ', word: '삶', ipa: 'сам', meaning: 'жизнь — звучит ㅁ'},
  {combo: 'ㄼ', word: '밟다', ipa: 'папта', meaning: 'топтать — звучит ㅂ'},
  {combo: 'ㄽ', word: '외곬', ipa: 'вэголь', meaning: 'единственный путь — звучит ㄹ'},
  {combo: 'ㄾ', word: '핥다', ipa: 'хальта', meaning: 'лизать — звучит ㄹ + т'},
  {combo: 'ㄿ', word: '읊다', ipa: 'ыпта', meaning: 'декламировать — звучит ㅂ'},
  {combo: 'ㅀ', word: '싫다', ipa: 'шильтха', meaning: 'не нравиться — звучит ㄹ'},
  {combo: 'ㅄ', word: '없다', ipa: 'опта', meaning: 'не иметь — звучит ㅂ'},
];

export const LINKING_EXAMPLES: LinkingExample[] = [
  {first: '책', second: '이', result: '채기', spoken: '책이',
    description: '책 (книга) + 이 (именительный падеж) — ㄱ съезжает на 이 и читается как обычное [г/к].'},
  {first: '밥', second: '을', result: '바블', spoken: '밥을',
    description: '밥 (рис) + 을 (винительный падеж) — ㅂ переезжает и звучит как [б].'},
  {first: '앉', second: '아요', result: '안자요', spoken: '앉아요',
    description: '앉다 (садиться) — из сложного 받침 ㄵ переезжает именно ㅈ, а ㄴ остаётся.'},
];
