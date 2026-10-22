import {ButtonComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {BATCHIM_FAMILIES, COMPLEX_BATCHIM, LINKING_EXAMPLES} from '@features/learning/domain/entities/batchim.data';
import {BatchimQuestion, nextBatchimQuestion} from '@features/learning/domain/services/batchim-quiz';

export const BatchimTab = {SIMPLE: 'simple', COMPLEX: 'complex', LINK: 'link', QUIZ: 'quiz'} as const;
export type BatchimTab = typeof BatchimTab[keyof typeof BatchimTab];

const TAB_BASE = 'hg-native-button btab';
const OPTION_BASE = 'hg-native-button qopt';

@Component({
  selector: 'hg-batchim-page',
  imports: [ButtonComponent, RouterLink, TranslatePipe],
  templateUrl: './batchim-page.component.html',
  styleUrl: './batchim-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchimPageComponent {
  private readonly tts = inject(KoreanTtsService);

  readonly families = BATCHIM_FAMILIES;
  readonly complex = COMPLEX_BATCHIM;
  readonly linking = LINKING_EXAMPLES;
  readonly tabs = Object.values(BatchimTab);

  readonly tab = signal<BatchimTab>(BatchimTab.SIMPLE);
  readonly isSimple = computed(() => this.tab() === BatchimTab.SIMPLE);
  readonly isComplex = computed(() => this.tab() === BatchimTab.COMPLEX);
  readonly isLink = computed(() => this.tab() === BatchimTab.LINK);
  readonly isQuiz = computed(() => this.tab() === BatchimTab.QUIZ);

  readonly question = signal<BatchimQuestion>(nextBatchimQuestion());
  readonly picked = signal<string | null>(null);
  readonly correct = signal(0);
  readonly total = signal(0);
  readonly streak = signal(0);
  readonly answered = computed(() => this.picked() !== null);
  readonly isRight = computed(() => this.picked() === this.question().answer);

  tabClass(tab: BatchimTab): string {
    return tab === this.tab() ? `${TAB_BASE} on` : TAB_BASE;
  }

  tabAria(tab: BatchimTab): Record<string, string | boolean> {
    return {role: 'tab', 'aria-selected': tab === this.tab()};
  }

  optionClass(option: string): string {
    const picked = this.picked();
    if (picked === null) return OPTION_BASE;
    if (option === this.question().answer) return `${OPTION_BASE} correct`;
    return option === picked ? `${OPTION_BASE} wrong` : OPTION_BASE;
  }

  speak(text: string): void {
    this.tts.speak(text);
  }

  answer(option: string): void {
    if (this.answered()) return;
    this.picked.set(option);
    this.total.update(n => n + 1);
    if (option === this.question().answer) {
      this.correct.update(n => n + 1);
      this.streak.update(n => n + 1);
    } else {
      this.streak.set(0);
    }
  }

  next(): void {
    this.picked.set(null);
    this.question.set(nextBatchimQuestion());
  }
}
