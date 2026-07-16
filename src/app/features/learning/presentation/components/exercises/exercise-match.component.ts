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
  styleUrl: './exercise-shared.scss',
  styles: `
    .match { display: grid; grid-template-columns: 1fr 1fr; gap: var(--hg-space-3); }

    .mcell {
      background: var(--hg-surface);
      border: 2px solid var(--hg-border);
      border-radius: var(--hg-radius-block);
      padding: var(--hg-space-5);
      min-height: var(--hg-touch-min);
      text-align: center;
      cursor: pointer;
      transition: border-color var(--hg-motion-feedback);
      font-size: var(--hg-fs-md);
      color: var(--hg-text);

      &.kr { font-family: var(--hg-font-display); font-size: 26px; }
      &:hover:not(:disabled) { border-color: var(--hg-route); }
      // matched — permanently correct
      &.hit { border-color: var(--hg-success); background: var(--hg-success-soft); opacity: .55; cursor: default; }
      // selected — waiting for second pick
      &.sel { border-color: var(--hg-route); }
      // incorrect pair
      &.miss { border-color: var(--hg-danger); animation: shake .3s; }
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
