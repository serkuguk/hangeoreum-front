import {LessonType} from './course-map.entity';

export type ExerciseKind = 'CHOICE' | 'LISTEN_CHOICE' | 'WORD_ORDER' | 'FILL_BLANK' | 'MATCH_PAIRS' | 'TYPE_WORD';

// Конвенция payload по kind (бэк проверяет только обязательные ключи,
// admin/lesson-builder создаёт эти же формы)
export interface ChoiceOption {
  text: string;
  icon?: string;
  correct?: boolean;
}

export interface ChoicePayload {
  question: string;        // хангыль-слово/фраза
  romanization?: string;
  audioUrl?: string;
  options: ChoiceOption[];
}

export interface ListenChoicePayload {
  audioUrl: string;
  text?: string;           // фраза для TTS-fallback
  options: ChoiceOption[];
}

export interface WordOrderPayload {
  translation: string;     // «Мой друг — студент»
  tokens: string[];        // правильный порядок
  extra?: string[];        // дистракторы
}

export interface FillBlankPayload {
  sentence: string;        // «저 ___ 학생이에요.»
  translation?: string;
  hint?: string;
  options: {text: string; hint?: string}[];
  correct: string;
}

export interface MatchPairsPayload {
  pairs: {left: string; right: string}[]; // left — хангыль, right — перевод/эмодзи
}

export interface TypeWordPayload {
  translation: string;
  answer: string;          // хангыль
  romanization?: string;
}

export type ExercisePayload =
  | ChoicePayload
  | ListenChoicePayload
  | WordOrderPayload
  | FillBlankPayload
  | MatchPairsPayload
  | TypeWordPayload;

export interface Exercise {
  id: string;
  kind: ExerciseKind;
  position: number;
  payload: ExercisePayload;
}

export interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  xpReward: number;
  exercises: Exercise[];
}

export interface TipExample {
  ko: string;
  translation: string;
  note?: string;
  highlight?: string[];
}

export interface Tip {
  id: string;
  title: string;
  bodyMd: string;
  examples: TipExample[] | null;
}
