import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {VOCABULARY_REPOSITORY} from '../vocabulary-repository.token';

export type WordAdditionState = 'idle' | 'saving' | 'saved' | 'error';

@Injectable()
export class WordAdditionFacade {
  private readonly repository = inject(VOCABULARY_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wordAddStates = signal<Record<string, WordAdditionState>>({});

  addState(wordId: string): WordAdditionState {
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

}
