import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap} from 'rxjs';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {UserWord} from '../../domain/entities/user-word.entity';
import {
  Deck,
  VOCABULARY_REPOSITORY,
  VocabularyQuery,
} from '../../domain/repositories/vocabulary.repository';

@Injectable()
export class VocabularyFacade {
  private repository = inject(VOCABULARY_REPOSITORY);
  private destroyRef = inject(DestroyRef);

  readonly words = signal<UserWord[]>([]);
  readonly totalElements = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly decks = signal<Deck[]>([]);
  readonly wordAddStates = signal<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({});

  private query$ = new Subject<VocabularyQuery>();

  constructor() {
    this.query$.pipe(
      debounceTime(300),
      distinctUntilChanged((previous, current) => JSON.stringify(previous) === JSON.stringify(current)),
      switchMap(query => {
        this.loading.set(true);
        this.error.set(null);
        return this.repository.vocabulary(query).pipe(
          catchError(() => {
            this.error.set('Не получилось загрузить словарь.');
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
      takeUntilDestroyed(),
    ).subscribe(result => {
      this.words.set(result.content);
      this.totalElements.set(result.totalElements);
      this.page.set(result.page);
      this.loading.set(false);
      this.error.set(null);
    });
  }

  search(query: VocabularyQuery): void {
    this.loading.set(true);
    this.query$.next(query);
  }

  toggleDifficult(word: UserWord): void {
    const flag = !word.isDifficult;
    // optimistic
    this.words.update(list => list.map(w => w.id === word.id ? {...w, isDifficult: flag} : w));
    this.repository.setDifficult(word.id, flag).subscribe({
      error: () => this.words.update(list => list.map(w => w.id === word.id ? {...w, isDifficult: !flag} : w)),
    });
  }

  addState(wordId: string): 'idle' | 'saving' | 'saved' | 'error' {
    return this.wordAddStates()[wordId] ?? 'idle';
  }

  /** Состояние принадлежит фасаду: успех показывается только после ответа API. */
  addWordToVocabulary(wordId: string): void {
    if (this.addState(wordId) === 'saving' || this.addState(wordId) === 'saved') return;
    this.wordAddStates.update(states => ({...states, [wordId]: 'saving'}));
    this.repository.addWord(wordId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.wordAddStates.update(states => ({...states, [wordId]: 'saved'})),
      error: () => this.wordAddStates.update(states => ({...states, [wordId]: 'error'})),
    });
  }

  loadDecks(): void {
    this.repository.decks().subscribe({
      next: decks => this.decks.set(decks),
      error: () => this.error.set('Не получилось загрузить колоды.'),
    });
  }

  createDeck(title: string): void {
    this.repository.createDeck(title).subscribe({
      next: deck => this.decks.update(list => [...list, deck]),
      error: () => this.error.set('Не получилось создать колоду.'),
    });
  }

  renameDeck(deck: Deck, title: string): void {
    this.repository.renameDeck(deck.id, title).subscribe({
      next: updated => this.decks.update(list => list.map(d => d.id === deck.id ? updated : d)),
      error: () => this.error.set('Не получилось переименовать колоду.'),
    });
  }

  deleteDeck(deck: Deck): void {
    this.repository.deleteDeck(deck.id).subscribe({
      next: () => this.decks.update(list => list.filter(d => d.id !== deck.id)),
      error: () => this.error.set('Не получилось удалить колоду.'),
    });
  }

  addToDeck(deckId: string, wordId: string): void {
    this.repository.addDeckWord(deckId, wordId).subscribe({
      next: () => this.loadDecks(),
      error: () => this.error.set('Не получилось добавить слово в колоду.'),
    });
  }
}
