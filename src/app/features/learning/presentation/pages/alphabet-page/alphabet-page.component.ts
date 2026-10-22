import {ButtonComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {AlphabetFacade} from '@features/learning/application/facades/alphabet.facade';
import {ALPHABET_PART_GROUPS, AlphabetLetter, isAlphabetPart} from '@features/learning/domain/entities/alphabet.entity';

@Component({
  selector: 'hg-alphabet-page',
  imports: [ButtonComponent, RouterLink, TranslatePipe],
  templateUrl: './alphabet-page.component.html',
  styleUrl: './alphabet-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlphabetPageComponent {
  readonly facade = inject(AlphabetFacade);
  private tts = inject(KoreanTtsService);

  /** `?part=vowels|consonants` — показываем только эту часть; без параметра — весь алфавит. */
  readonly part = input<string>();
  private readonly activePart = computed(() => {
    const part = this.part();
    return isAlphabetPart(part) ? part : null;
  });

  readonly titleKey = computed(() => {
    const part = this.activePart();
    return part ? `learning.alphabet.parts.${part}` : 'learning.alphabet.title';
  });

  readonly visibleGroups = computed(() => {
    const part = this.activePart();
    const groups = this.facade.groups();
    return part ? groups.filter(g => ALPHABET_PART_GROUPS[part].includes(g.group)) : groups;
  });

  readonly progress = computed(() => {
    const part = this.activePart();
    const alphabet = this.facade.alphabet();
    if (part) return this.facade.progressFor(part);
    return {learned: alphabet?.learnedCount ?? 0, total: alphabet?.total ?? 0};
  });

  readonly percent = computed(() => {
    const {learned, total} = this.progress();
    return total === 0 ? 0 : Math.round(learned / total * 100);
  });

  tileClass(letter: AlphabetLetter): string {
    return letter.learned ? 'hg-native-button tile learned' : 'hg-native-button tile';
  }

  letterAria(letter: AlphabetLetter): string {
    return `${letter.jamo}, ${letter.romanization}`;
  }

  constructor() {
    this.facade.load();
  }

  tap(letter: AlphabetLetter): void {
    this.tts.speak(letter.jamo, letter.audioUrl);
    this.facade.markLearned(letter);
  }
}
