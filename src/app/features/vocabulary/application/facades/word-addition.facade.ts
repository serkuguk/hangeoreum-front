import {DestroyRef, Injectable, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {VOCABULARY_REPOSITORY} from '../vocabulary-repository.token';

export const WordAdditionState = {IDLE: 'idle', SAVING: 'saving', SAVED: 'saved', ERROR: 'error'} as const;
export type WordAdditionState = typeof WordAdditionState[keyof typeof WordAdditionState];

@Injectable()
export class WordAdditionFacade {
  private readonly repository = inject(VOCABULARY_REPOSITORY);
  private readonly destroyRef = inject(DestroyRef);
  private readonly wordAddStates = signal<Record<string, WordAdditionState>>({});

  addState(wordId: string): WordAdditionState {
    return this.wordAddStates()[wordId] ?? WordAdditionState.IDLE;
  }

  isSaving(wordId: string): boolean {
    return this.addState(wordId) === WordAdditionState.SAVING;
  }

  isSaved(wordId: string): boolean {
    return this.addState(wordId) === WordAdditionState.SAVED;
  }

  isFailed(wordId: string): boolean {
    return this.addState(wordId) === WordAdditionState.ERROR;
  }

  isAddBlocked(wordId: string): boolean {
    return this.isSaving(wordId) || this.isSaved(wordId);
  }

  /** Состояние принадлежит фасаду: успех показывается только после ответа API. */
  addWordToVocabulary(wordId: string): void {
    if (this.isAddBlocked(wordId)) return;
    this.wordAddStates.update(states => ({...states, [wordId]: WordAdditionState.SAVING}));
    this.repository.addWord(wordId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.wordAddStates.update(states => ({...states, [wordId]: WordAdditionState.SAVED})),
      error: () => this.wordAddStates.update(states => ({...states, [wordId]: WordAdditionState.ERROR})),
    });
  }

}
