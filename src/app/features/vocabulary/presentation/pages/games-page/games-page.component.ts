import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {GameMode, GamesFacade} from '../../../application/facades/games.facade';
import {ReviewFacade} from '../../../application/facades/review.facade';

@Component({
  selector: 'hg-games-page',
  imports: [RouterLink],
  templateUrl: './games-page.component.html',
  styleUrl: './games-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesPageComponent {
  readonly facade = inject(GamesFacade);
  readonly review = inject(ReviewFacade);
  private tts = inject(KoreanTtsService);

  readonly games: {mode: GameMode; icon: string; title: string; hint: string}[] = [
    {mode: 'MATCH', icon: '🧩', title: 'Match', hint: 'Соедини слово и перевод'},
    {mode: 'LISTEN', icon: '🎧', title: 'Listen', hint: 'Услышь и выбери'},
    {mode: 'SPELL', icon: '⌨️', title: 'Spell', hint: 'Собери слово из слогов'},
  ];

  readonly clock = computed(() => {
    const t = Math.max(0, this.facade.timeLeft());
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });

  play(): void {
    const word = this.facade.currentWord();
    if (word) this.tts.speak(word.word.hangul, word.word.audioUrl);
  }

  start(mode: GameMode): void {
    this.facade.start(mode);
    if (mode === 'LISTEN') {
      // озвучиваем первое слово после загрузки
      const wait = setInterval(() => {
        if (this.facade.phase() === 'playing') {
          clearInterval(wait);
          this.play();
        }
      }, 150);
    }
  }
}
