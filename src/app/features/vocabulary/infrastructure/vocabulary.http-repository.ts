import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {UserWord} from '../domain/entities/user-word.entity';
import {
  Deck,
  FinishResult,
  ReviewMode,
  ReviewSession,
  ReviewSummary,
  VocabularyPage,
  VocabularyQuery,
  VocabularyRepository,
} from '../domain/repositories/vocabulary.repository';

@Injectable()
export class VocabularyHttpRepository implements VocabularyRepository {
  private http = inject(HttpClient);
  private base = inject<EnvironmentInterface>(ENV).server_url;

  summary(): Observable<ReviewSummary> {
    return this.http.get<ReviewSummary>(`${this.base}/review/summary`);
  }

  startSession(mode: ReviewMode, opts?: {limit?: number; deckId?: string; difficultOnly?: boolean}): Observable<ReviewSession> {
    return this.http.post<ReviewSession>(`${this.base}/review/sessions`, {
      mode,
      limit: opts?.limit ?? null,
      deckId: opts?.deckId ?? null,
      difficultOnly: opts?.difficultOnly ?? false,
    });
  }

  submitAnswers(sessionId: string, answers: {wordId: string; quality: number}[]): Observable<void> {
    return this.http.post<void>(`${this.base}/review/sessions/${sessionId}/answers`, answers);
  }

  finishSession(sessionId: string): Observable<FinishResult> {
    return this.http.post<FinishResult>(`${this.base}/review/sessions/${sessionId}/finish`, null);
  }

  vocabulary(query: VocabularyQuery): Observable<VocabularyPage> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 20);
    if (query.search) params = params.set('search', query.search);
    if (query.level !== undefined) params = params.set('level', query.level);
    if (query.topicId) params = params.set('topicId', query.topicId);
    if (query.sort) params = params.set('sort', query.sort);
    return this.http.get<VocabularyPage>(`${this.base}/vocabulary`, {params});
  }

  setDifficult(userWordId: string, isDifficult: boolean): Observable<UserWord> {
    return this.http.patch<UserWord>(`${this.base}/vocabulary/${userWordId}`, {isDifficult});
  }

  addWord(wordId: string): Observable<UserWord> {
    return this.http.post<UserWord>(`${this.base}/vocabulary/words/${wordId}/add`, null);
  }

  decks(): Observable<Deck[]> {
    return this.http.get<Deck[]>(`${this.base}/decks`);
  }

  createDeck(title: string): Observable<Deck> {
    return this.http.post<Deck>(`${this.base}/decks`, {title});
  }

  renameDeck(id: string, title: string): Observable<Deck> {
    return this.http.put<Deck>(`${this.base}/decks/${id}`, {title});
  }

  deleteDeck(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/decks/${id}`);
  }

  addDeckWord(deckId: string, wordId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/decks/${deckId}/words/${wordId}`, null);
  }

}
