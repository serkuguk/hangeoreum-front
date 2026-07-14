import {Injectable, computed, inject, signal} from '@angular/core';
import {Alphabet, AlphabetLetter, LETTER_GROUPS} from '../../domain/entities/alphabet.entity';
import {LEARNING_REPOSITORY} from '../../domain/repositories/learning.repository';

@Injectable()
export class AlphabetFacade {
  private repository = inject(LEARNING_REPOSITORY);

  readonly alphabet = signal<Alphabet | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly justCompleted = signal(false); // 40/40 → конфетти

  readonly groups = computed(() => {
    const letters = this.alphabet()?.letters ?? [];
    return LETTER_GROUPS
      .map(g => ({...g, letters: letters.filter(l => l.group === g.group)}))
      .filter(g => g.letters.length > 0);
  });

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.alphabet().subscribe({
      next: alphabet => {
        this.alphabet.set(alphabet);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить алфавит.');
        this.loading.set(false);
      },
    });
  }

  /** Optimistic: помечаем локально сразу, бэк — авторитетный счётчик. */
  markLearned(letter: AlphabetLetter): void {
    if (letter.learned) return;
    const current = this.alphabet();
    if (!current) return;

    this.alphabet.set({
      ...current,
      learnedCount: current.learnedCount + 1,
      letters: current.letters.map(l => l.id === letter.id ? {...l, learned: true} : l),
    });

    this.repository.markLetterLearned(letter.id).subscribe({
      next: result => {
        const alphabet = this.alphabet();
        if (alphabet) this.alphabet.set({...alphabet, learnedCount: result.learnedCount, total: result.total});
        if (result.alphabetCompleted) this.justCompleted.set(true);
      },
      error: () => {
        // откат отметки
        const alphabet = this.alphabet();
        if (!alphabet) return;
        this.alphabet.set({
          ...alphabet,
          learnedCount: Math.max(0, alphabet.learnedCount - 1),
          letters: alphabet.letters.map(l => l.id === letter.id ? {...l, learned: false} : l),
        });
      },
    });
  }
}
