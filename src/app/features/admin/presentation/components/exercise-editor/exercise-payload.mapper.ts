import {
  ChoiceOption,
  ExerciseKind,
  ExercisePayload,
  FillBlankPayload,
  ListenChoicePayload,
  MatchPairsPayload,
  TypeWordPayload,
  WordOrderPayload,
  ChoicePayload,
} from '@features/learning/domain/entities/exercise.entity';

export interface DraftOption {
  text: string;
  icon: string;
  hint: string;
}

export interface DraftPair {
  left: string;
  right: string;
}

/**
 * Плоский черновик формы — надмножество полей всех kind.
 * Каждый kind берёт из него только свои поля (см. toPayload).
 */
export interface ExerciseDraft {
  question: string;
  romanization: string;
  audioUrl: string;
  text: string;
  sentence: string;
  translation: string;
  hint: string;
  answer: string;
  tokens: string;
  extra: string;
  options: DraftOption[];
  correctIndex: number;
  pairs: DraftPair[];
}

export const BLANK_MARK = '___';
export const OPTION_KINDS: readonly ExerciseKind[] = ['CHOICE', 'LISTEN_CHOICE', 'FILL_BLANK'];

export const emptyOption = (): DraftOption => ({text: '', icon: '', hint: ''});
export const emptyPair = (): DraftPair => ({left: '', right: ''});

/** Черновик нового упражнения: пустые поля, 4 варианта / 4 пары. */
export function emptyDraft(): ExerciseDraft {
  return {
    question: '',
    romanization: '',
    audioUrl: '',
    text: '',
    sentence: '',
    translation: '',
    hint: '',
    answer: '',
    tokens: '',
    extra: '',
    options: [emptyOption(), emptyOption(), emptyOption(), emptyOption()],
    correctIndex: 0,
    pairs: [emptyPair(), emptyPair(), emptyPair(), emptyPair()],
  };
}

// ponytail: токены через пробел — токен с пробелом внутри не выразить; перейти на чипы, если понадобится
const splitWords = (value: string): string[] => value.trim().split(/\s+/).filter(Boolean);

type Loose = Record<string, unknown>;
const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const list = (value: unknown): Loose[] => (Array.isArray(value) ? (value as Loose[]) : []);

export function toDraft(kind: ExerciseKind, payload: unknown): ExerciseDraft {
  const p = (payload ?? {}) as Loose;
  const draft = emptyDraft();
  const options = list(p['options']).map((o) => ({
    text: str(o['text']),
    icon: str(o['icon']),
    hint: str(o['hint']),
  }));
  const correctIndex = kind === 'FILL_BLANK'
    ? options.findIndex((o) => o.text === str(p['correct']))
    : list(p['options']).findIndex((o) => o['correct'] === true);
  const tokens = (value: unknown): string =>
    (Array.isArray(value) ? value.map(str) : []).join(' ');

  return {
    ...draft,
    question: str(p['question']),
    romanization: str(p['romanization']),
    audioUrl: str(p['audioUrl']),
    text: str(p['text']),
    sentence: str(p['sentence']),
    translation: str(p['translation']),
    hint: str(p['hint']),
    answer: str(p['answer']),
    tokens: tokens(p['tokens']),
    extra: tokens(p['extra']),
    options: OPTION_KINDS.includes(kind) ? options : draft.options,
    correctIndex,
    pairs: kind === 'MATCH_PAIRS'
      ? list(p['pairs']).map((pair) => ({left: str(pair['left']), right: str(pair['right'])}))
      : draft.pairs,
  };
}

/** Добавляет key только для непустой строки — необязательные поля не засоряют payload. */
function optional<K extends string>(key: K, value: string): Partial<Record<K, string>> {
  const trimmed = value.trim();
  return trimmed ? ({[key]: trimmed} as Record<K, string>) : {};
}

function choiceOptions(draft: ExerciseDraft): ChoiceOption[] {
  return draft.options.map((o, index) => ({
    text: o.text.trim(),
    ...optional('icon', o.icon),
    ...(index === draft.correctIndex ? {correct: true} : {}),
  }));
}

export function toPayload(kind: ExerciseKind, draft: ExerciseDraft): ExercisePayload {
  switch (kind) {
    case 'CHOICE':
      return {
        question: draft.question.trim(),
        ...optional('romanization', draft.romanization),
        ...optional('audioUrl', draft.audioUrl),
        options: choiceOptions(draft),
      } satisfies ChoicePayload;
    case 'LISTEN_CHOICE':
      return {
        audioUrl: draft.audioUrl.trim(),
        ...optional('text', draft.text),
        options: choiceOptions(draft),
      } satisfies ListenChoicePayload;
    case 'WORD_ORDER': {
      const extra = splitWords(draft.extra);
      return {
        translation: draft.translation.trim(),
        tokens: splitWords(draft.tokens),
        ...(extra.length ? {extra} : {}),
      } satisfies WordOrderPayload;
    }
    case 'FILL_BLANK':
      return {
        sentence: draft.sentence.trim(),
        ...optional('translation', draft.translation),
        ...optional('hint', draft.hint),
        options: draft.options.map((o) => ({text: o.text.trim(), ...optional('hint', o.hint)})),
        correct: draft.options[draft.correctIndex]?.text.trim() ?? '',
      } satisfies FillBlankPayload;
    case 'MATCH_PAIRS':
      return {
        pairs: draft.pairs.map((pair) => ({left: pair.left.trim(), right: pair.right.trim()})),
      } satisfies MatchPairsPayload;
    case 'TYPE_WORD':
      return {
        translation: draft.translation.trim(),
        answer: draft.answer.trim(),
        ...optional('romanization', draft.romanization),
      } satisfies TypeWordPayload;
  }
}

const blank = (value: string): boolean => !value.trim();
const E = 'admin.builder.validation.';

/** Возвращает i18n-ключи ошибок; пустой массив — можно сохранять. */
export function validateDraft(kind: ExerciseKind, draft: ExerciseDraft): string[] {
  const errors: string[] = [];
  const need = (condition: boolean, key: string): void => {
    if (condition) errors.push(E + key);
  };

  switch (kind) {
    case 'CHOICE':
      need(blank(draft.question), 'question');
      break;
    case 'LISTEN_CHOICE':
      need(blank(draft.audioUrl) && blank(draft.text), 'listenSource');
      break;
    case 'WORD_ORDER':
      need(blank(draft.translation), 'translation');
      need(splitWords(draft.tokens).length < 2, 'tokens');
      break;
    case 'FILL_BLANK':
      need(!draft.sentence.includes(BLANK_MARK), 'sentence');
      break;
    case 'MATCH_PAIRS':
      need(draft.pairs.length < 2, 'minPairs');
      need(draft.pairs.some((p) => blank(p.left) || blank(p.right)), 'pairText');
      break;
    case 'TYPE_WORD':
      need(blank(draft.translation), 'translation');
      need(blank(draft.answer), 'answer');
      break;
  }

  if (OPTION_KINDS.includes(kind)) {
    need(draft.options.length < 2, 'minOptions');
    need(draft.options.some((o) => blank(o.text)), 'optionText');
    need(!draft.options[draft.correctIndex], 'noCorrect');
  }
  return errors;
}
