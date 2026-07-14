export type LetterGroup = 'VOWEL_BASIC' | 'VOWEL_COMPOUND' | 'CONSONANT_BASIC' | 'CONSONANT_DOUBLE';

export interface AlphabetLetter {
  id: string;
  jamo: string;
  romanization: string;
  group: LetterGroup;
  position: number;
  audioUrl: string | null;
  learned: boolean;
}

export interface Alphabet {
  letters: AlphabetLetter[];
  learnedCount: number;
  total: number;
}

export const LETTER_GROUPS: {group: LetterGroup; title: string}[] = [
  {group: 'VOWEL_BASIC', title: 'Гласные базовые'},
  {group: 'VOWEL_COMPOUND', title: 'Гласные составные'},
  {group: 'CONSONANT_BASIC', title: 'Согласные базовые'},
  {group: 'CONSONANT_DOUBLE', title: 'Согласные двойные'},
];
