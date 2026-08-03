import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {UserWord} from '../entities/user-word.entity';
import {Page} from '@shared/types/page';

export type ReviewMode = 'FLASHCARDS' | 'MATCH' | 'LISTEN' | 'SPELL' | 'QUICK';

export interface ReviewSummary {
  dueCount: number;
  difficultCount: number;
  totalWords: number;
}

export interface ReviewSession {
  id: string;
  mode: ReviewMode;
  cards: UserWord[];
}

export interface FinishResult {
  total: number;
  correct: number;
  xp: number;
  streak: number;
}

export type VocabularyPage = Page<UserWord>;

export interface VocabularyQuery {
  search?: string;
  level?: number;
  topicId?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export interface Deck {
  id: string;
  title: string;
  wordCount: number;
}

export interface VocabularyRepository {
  summary(): Observable<ReviewSummary>;
  startSession(mode: ReviewMode, opts?: {limit?: number; deckId?: string; difficultOnly?: boolean}): Observable<ReviewSession>;
  submitAnswers(sessionId: string, answers: {wordId: string; quality: number}[]): Observable<void>;
  finishSession(sessionId: string): Observable<FinishResult>;

  vocabulary(query: VocabularyQuery): Observable<VocabularyPage>;
  setDifficult(userWordId: string, isDifficult: boolean): Observable<UserWord>;
  addWord(wordId: string): Observable<UserWord>;

  decks(): Observable<Deck[]>;
  createDeck(title: string): Observable<Deck>;
  renameDeck(id: string, title: string): Observable<Deck>;
  deleteDeck(id: string): Observable<void>;
  addDeckWord(deckId: string, wordId: string): Observable<void>;
}

export const VOCABULARY_REPOSITORY = new InjectionToken<VocabularyRepository>('VocabularyRepository');
