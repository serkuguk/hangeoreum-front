import {Exercise} from '../entities/exercise.entity';

/**
 * Движок урока: чистый TS, без Angular.
 * Очередь упражнений; ошибочное упражнение возвращается в конец очереди (LingoDeer, без жизней).
 * score = % упражнений, решённых с первой попытки; accuracy = верные ответы / все ответы.
 */
export class LessonSession {
  private queue: Exercise[];
  private readonly totalCount: number;
  private firstTry = new Map<string, boolean>(); // id → решено с первой попытки
  private answers = 0;
  private correctAnswers = 0;

  constructor(exercises: Exercise[]) {
    this.queue = [...exercises].sort((a, b) => a.position - b.position);
    this.totalCount = this.queue.length;
  }

  get current(): Exercise | null {
    return this.queue[0] ?? null;
  }

  get done(): boolean {
    return this.queue.length === 0;
  }

  /** Решено упражнений (без повторов в очереди). */
  get solvedCount(): number {
    return [...this.firstTry.keys()].filter(id => !this.queue.some(e => e.id === id)).length;
  }

  get total(): number {
    return this.totalCount;
  }

  /** Ответ на текущее упражнение; при ошибке оно уходит в конец очереди. */
  submit(correct: boolean): void {
    const exercise = this.queue.shift();
    if (!exercise) return;

    this.answers++;
    if (correct) this.correctAnswers++;

    if (!this.firstTry.has(exercise.id)) {
      this.firstTry.set(exercise.id, correct);
    }
    if (!correct) {
      this.queue.push(exercise);
    }
  }

  /** % решённых с первой попытки, 0–100. */
  get score(): number {
    if (this.totalCount === 0) return 0;
    const first = [...this.firstTry.values()].filter(Boolean).length;
    return Math.round(first / this.totalCount * 100);
  }

  /** % верных ответов среди всех данных, 0–100. */
  get accuracy(): number {
    if (this.answers === 0) return 0;
    return Math.round(this.correctAnswers / this.answers * 100);
  }
}
