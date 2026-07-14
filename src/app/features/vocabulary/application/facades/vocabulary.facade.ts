import {Injectable, inject, signal} from '@angular/core';
import {Subject, switchMap, debounceTime} from 'rxjs';
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

  readonly words = signal<UserWord[]>([]);
  readonly totalElements = signal(0);
  readonly page = signal(0);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly decks = signal<Deck[]>([]);

  private query$ = new Subject<VocabularyQuery>();

  constructor() {
    this.query$.pipe(
      debounceTime(300),
      switchMap(query => {
        this.loading.set(true);
        return this.repository.vocabulary(query);
      }),
      takeUntilDestroyed(),
    ).subscribe({
      next: result => {
        this.words.set(result.content);
        this.totalElements.set(result.totalElements);
        this.page.set(result.page);
        this.loading.set(false);
        this.error.set(null);
      },
      error: () => {
        this.error.set('Не получилось загрузить словарь.');
        this.loading.set(false);
      },
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

  addWordToVocabulary(wordId: string): void {
    this.repository.addWord(wordId).subscribe();
  }

  loadDecks(): void {
    this.repository.decks().subscribe(decks => this.decks.set(decks));
  }

  createDeck(title: string): void {
    this.repository.createDeck(title).subscribe(deck => this.decks.update(list => [...list, deck]));
  }

  renameDeck(deck: Deck, title: string): void {
    this.repository.renameDeck(deck.id, title).subscribe(updated =>
      this.decks.update(list => list.map(d => d.id === deck.id ? updated : d)));
  }

  deleteDeck(deck: Deck): void {
    this.repository.deleteDeck(deck.id).subscribe(() =>
      this.decks.update(list => list.filter(d => d.id !== deck.id)));
  }

  addToDeck(deckId: string, wordId: string): void {
    this.repository.addDeckWord(deckId, wordId).subscribe(() => this.loadDecks());
  }
}
