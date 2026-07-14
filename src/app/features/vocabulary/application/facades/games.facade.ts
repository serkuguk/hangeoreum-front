import {Injectable, computed, inject, signal} from '@angular/core';
import {DestroyRef} from '@angular/core';
import {shuffle} from '@shared/utils/shuffle';
import {UserWord} from '../../domain/entities/user-word.entity';
import {GameEngine, syllables} from '../../domain/services/game-engine';
import {ReviewMode} from '../../domain/repositories/vocabulary.repository';
import {ReviewFacade} from './review.facade';

export type GameMode = Extract<ReviewMode, 'MATCH' | 'LISTEN' | 'SPELL'>;

const ROUND_SECONDS = 90;
const MATCH_BATCH = 6;

export interface MatchCell {
  wordId: string;
  side: 'ko' | 'ru';
  text: string;
}

@Injectable()
export class GamesFacade {
  private review = inject(ReviewFacade);
  private destroyRef = inject(DestroyRef);

  private engine = new GameEngine();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private answerStart = 0;
  private pool: UserWord[] = [];

  readonly mode = signal<GameMode | null>(null);
  readonly phase = signal<'pick' | 'playing' | 'done'>('pick');
  readonly timeLeft = signal(ROUND_SECONDS);
  readonly score = signal(0);
  readonly combo = signal(0);

  // MATCH
  readonly matchCells = signal<MatchCell[]>([]);
  readonly matchHits = signal<Set<string>>(new Set());
  readonly matchSelected = signal<MatchCell | null>(null);
  readonly matchMiss = signal<MatchCell | null>(null);
  private matchQueue: UserWord[] = [];

  // LISTEN / SPELL — одно слово за раз
  readonly currentWord = signal<UserWord | null>(null);
  readonly options = signal<string[]>([]);       // LISTEN: переводы
  readonly bank = signal<string[]>([]);          // SPELL: слоги
  readonly typed = signal<string[]>([]);         // SPELL: собранное
  readonly lastAnswer = signal<'ok' | 'bad' | null>(null);
  private wordQueue: UserWord[] = [];

  readonly result = this.review.result;
  readonly loadError = this.review.error;
  readonly loading = this.review.loading;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopTimer());
  }

  start(mode: GameMode): void {
    this.mode.set(mode);
    this.review.start(mode, {limit: 20});
    // ждём загрузку очереди
    const wait = setInterval(() => {
      if (this.review.loading()) return;
      clearInterval(wait);
      const cards = this.review.queue();
      if (cards.length === 0) return; // пусто — remain in pick, страница покажет сообщение
      this.pool = cards;
      this.engine = new GameEngine();
      this.score.set(0);
      this.combo.set(0);
      this.phase.set('playing');
      this.timeLeft.set(ROUND_SECONDS);
      this.startTimer();
      if (mode === 'MATCH') {
        this.matchQueue = [...cards];
        this.dealMatch();
      } else {
        this.wordQueue = shuffle(cards);
        this.nextWord();
      }
    }, 100);
  }

  // ---------- MATCH ----------
  private dealMatch(): void {
    const batch = this.matchQueue.splice(0, MATCH_BATCH);
    if (batch.length === 0) {
      this.finish();
      return;
    }
    this.matchHits.set(new Set());
    this.matchSelected.set(null);
    this.matchCells.set(shuffle(batch.flatMap((uw): MatchCell[] => [
      {wordId: uw.word.id, side: 'ko', text: uw.word.hangul},
      {wordId: uw.word.id, side: 'ru', text: uw.word.translation},
    ])));
    this.answerStart = Date.now();
  }

  pickMatch(cell: MatchCell): void {
    if (this.matchHits().has(cell.wordId + cell.side)) return;
    const selected = this.matchSelected();
    if (!selected) {
      this.matchSelected.set(cell);
      return;
    }
    if (selected === cell) {
      this.matchSelected.set(null);
      return;
    }
    const hit = selected.wordId === cell.wordId && selected.side !== cell.side;
    this.registerAnswer(cell.wordId, hit);
    this.matchSelected.set(null);
    if (hit) {
      this.matchHits.update(set => {
        const next = new Set(set);
        next.add(cell.wordId + 'ko').add(cell.wordId + 'ru');
        return next;
      });
      this.answerStart = Date.now();
      if (this.matchHits().size === this.matchCells().length) {
        this.dealMatch();
      }
    } else {
      this.matchMiss.set(cell);
      setTimeout(() => this.matchMiss.set(null), 350);
    }
  }

  // ---------- LISTEN / SPELL ----------
  private nextWord(): void {
    const word = this.wordQueue.shift() ?? null;
    this.currentWord.set(word);
    this.lastAnswer.set(null);
    this.typed.set([]);
    if (!word) {
      this.finish();
      return;
    }
    if (this.mode() === 'LISTEN') {
      const distractors = shuffle(this.pool.filter(w => w.id !== word.id))
        .slice(0, 3).map(w => w.word.translation);
      this.options.set(shuffle([word.word.translation, ...distractors]));
    } else {
      const own = syllables(word.word.hangul);
      const extra = shuffle(this.pool.filter(w => w.id !== word.id).flatMap(w => syllables(w.word.hangul)))
        .slice(0, Math.min(3, own.length));
      this.bank.set(shuffle([...own, ...extra]));
    }
    this.answerStart = Date.now();
  }

  pickOption(translation: string): void {
    const word = this.currentWord();
    if (!word || this.lastAnswer()) return;
    const correct = translation === word.word.translation;
    this.registerAnswer(word.word.id, correct);
    this.lastAnswer.set(correct ? 'ok' : 'bad');
    setTimeout(() => this.nextWord(), correct ? 500 : 1100);
  }

  pickSyllable(index: number): void {
    const word = this.currentWord();
    if (!word || this.lastAnswer()) return;
    const syllable = this.bank()[index];
    this.typed.update(list => [...list, syllable]);
    this.bank.update(list => list.filter((_, i) => i !== index));

    const target = syllables(word.word.hangul);
    const typed = this.typed();
    if (typed.length === target.length) {
      const correct = typed.join('') === target.join('');
      this.registerAnswer(word.word.id, correct);
      this.lastAnswer.set(correct ? 'ok' : 'bad');
      setTimeout(() => this.nextWord(), correct ? 500 : 1100);
    }
  }

  resetTyped(): void {
    const word = this.currentWord();
    if (!word || this.lastAnswer()) return;
    const own = syllables(word.word.hangul);
    const extra = this.bank().filter(s => !own.includes(s));
    this.typed.set([]);
    this.bank.set(shuffle([...own, ...extra]));
  }

  // ---------- общее ----------
  private registerAnswer(wordId: string, correct: boolean): void {
    this.engine.registerAnswer(wordId, correct, Date.now() - this.answerStart);
    this.score.set(this.engine.score);
    this.combo.set(this.engine.combo);
  }

  private startTimer(): void {
    this.stopTimer();
    this.timerId = setInterval(() => {
      this.timeLeft.update(t => t - 1);
      if (this.timeLeft() <= 0) this.finish();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = null;
  }

  private finish(): void {
    if (this.phase() !== 'playing') return;
    this.stopTimer();
    this.phase.set('done');
    this.review.finishWithAnswers(this.engine.answers);
  }

  backToPick(): void {
    this.stopTimer();
    this.phase.set('pick');
    this.mode.set(null);
  }
}
