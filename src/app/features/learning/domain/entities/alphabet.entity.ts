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

export const LETTER_GROUPS: {group: LetterGroup; titleKey: string}[] = [
  {group: 'VOWEL_BASIC', titleKey: 'learning.alphabet.groups.VOWEL_BASIC'},
  {group: 'VOWEL_COMPOUND', titleKey: 'learning.alphabet.groups.VOWEL_COMPOUND'},
  {group: 'CONSONANT_BASIC', titleKey: 'learning.alphabet.groups.CONSONANT_BASIC'},
  {group: 'CONSONANT_DOUBLE', titleKey: 'learning.alphabet.groups.CONSONANT_DOUBLE'},
];
