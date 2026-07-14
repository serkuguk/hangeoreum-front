export interface Word {
  id: string;
  hangul: string;
  romanization: string;
  translation: string;
  partOfSpeech: string | null;
  topicId: string | null;
  exampleKo: string | null;
  exampleTranslation: string | null;
  grammarNote: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}
