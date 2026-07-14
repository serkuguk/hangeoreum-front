import {ChangeDetectionStrategy, Component, computed, input, output, signal} from '@angular/core';
import {shuffle} from '@shared/utils/shuffle';
import {MatchPairsPayload} from '../../../domain/entities/exercise.entity';
import {Feedback} from '../../../application/facades/lesson.facade';

interface MatchCell {
  pairIndex: number;
  side: 'left' | 'right';
  text: string;
}

@Component({
  selector: 'hg-exercise-match',
  template: `
    <div class="q-kind">Сопоставь пары</div>
    <div class="match">
      @for (cell of cells(); track cell.side + cell.pairIndex) {
        <button type="button" class="mcell"
                [class.kr]="cell.side === 'left'"
                [class.hit]="isHit(cell)"
                [class.sel]="selected() === cell"
                [class.miss]="missCell() === cell"
                [disabled]="isHit(cell)"
                (click)="pick(cell)">
          {{ cell.text }}
        </button>
      }
    </div>
  `,
  styles: `
    :host { display: block; }

    .q-kind {
      color: var(--hg-muted);
      font-size: 12.5px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 12px;
    }

    .match { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    .mcell {
      background: var(--hg-card);
      border: 2px solid var(--hg-line);
      border-radius: 16px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: .18s;
      font-size: 16px;
      color: var(--hg-txt);

      &.kr { font-family: var(--hg-font-display); font-size: 26px; }
      &:hover:not(:disabled) { border-color: rgba(255, 255, 255, .22); }
      &.hit { border-color: var(--hg-jade); background: rgba(31, 199, 155, .1); opacity: .55; cursor: default; }
      &.sel { border-color: var(--hg-blue); }
      &.miss { border-color: var(--hg-red); animation: shake .3s; }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExerciseMatchComponent {
  readonly payload = input.required<MatchPairsPayload>();
  readonly result = output<Feedback>();

  readonly cells = computed<MatchCell[]>(() => shuffle(
    this.payload().pairs.flatMap((pair, pairIndex): MatchCell[] => [
      {pairIndex, side: 'left', text: pair.left},
      {pairIndex, side: 'right', text: pair.right},
    ]),
  ));

  readonly selected = signal<MatchCell | null>(null);
  readonly missCell = signal<MatchCell | null>(null);
  private hits = signal<Set<number>>(new Set());
  private mistakes = 0;

  isHit(cell: MatchCell): boolean {
    return this.hits().has(cell.pairIndex);
  }

  pick(cell: MatchCell): void {
    const selected = this.selected();
    if (!selected) {
      this.selected.set(cell);
      return;
    }
    if (selected === cell) {
      this.selected.set(null);
      return;
    }
    if (selected.pairIndex === cell.pairIndex && selected.side !== cell.side) {
      this.hits.update(set => new Set(set).add(cell.pairIndex));
      this.selected.set(null);
      if (this.hits().size === this.payload().pairs.length) {
        this.result.emit({correct: this.mistakes === 0});
      }
    } else {
      this.mistakes++;
      this.missCell.set(cell);
      this.selected.set(null);
      setTimeout(() => this.missCell.set(null), 350);
    }
  }
}
