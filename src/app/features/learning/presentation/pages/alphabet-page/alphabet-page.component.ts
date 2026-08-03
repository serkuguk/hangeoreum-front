import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {AlphabetFacade} from '../../../application/facades/alphabet.facade';
import {AlphabetLetter} from '../../../domain/entities/alphabet.entity';

@Component({
  selector: 'hg-alphabet-page',
  imports: [HgButtonComponent],
  templateUrl: './alphabet-page.component.html',
  styleUrl: './alphabet-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlphabetPageComponent {
  readonly facade = inject(AlphabetFacade);
  private tts = inject(KoreanTtsService);

  readonly percent = computed(() => {
    const alphabet = this.facade.alphabet();
    if (!alphabet || alphabet.total === 0) return 0;
    return Math.round(alphabet.learnedCount / alphabet.total * 100);
  });

  constructor() {
    this.facade.load();
  }

  tap(letter: AlphabetLetter): void {
    this.tts.speak(letter.jamo, letter.audioUrl);
    this.facade.markLearned(letter);
  }
}
