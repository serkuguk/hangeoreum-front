import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {HgButtonComponent} from '@shared/components/controls';
import {HgAudioButtonComponent, HgSessionResultCardComponent, HgSessionStat} from '@shared/components/hg';
import {FinishResult} from '../../../domain/repositories/vocabulary.repository';
import {GameMode, GamesFacade} from '../../../application/facades/games.facade';

@Component({
  selector: 'hg-games-page',
  imports: [RouterLink, HgAudioButtonComponent, HgButtonComponent, HgSessionResultCardComponent],
  templateUrl: './games-page.component.html',
  styleUrl: './games-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesPageComponent {
  readonly facade = inject(GamesFacade);
  private tts = inject(KoreanTtsService);
  private lastAutoplayWordId: string | null = null;

  readonly games: {mode: GameMode; icon: string; title: string; hint: string}[] = [
    {mode: 'MATCH', icon: '🧩', title: 'Match', hint: 'Соедини слово и перевод'},
    {mode: 'LISTEN', icon: '🎧', title: 'Listen', hint: 'Услышь и выбери'},
    {mode: 'SPELL', icon: '⌨️', title: 'Spell', hint: 'Собери слово из слогов'},
  ];

  readonly clock = computed(() => {
    const t = Math.max(0, this.facade.timeLeft());
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });

  constructor() {
    effect(() => {
      const word = this.facade.currentWord();
      if (this.facade.mode() !== 'LISTEN' || this.facade.phase() !== 'playing' || !word) {
        this.lastAutoplayWordId = null;
        return;
      }
      if (this.lastAutoplayWordId === word.id) return;
      this.lastAutoplayWordId = word.id;
      this.tts.speak(word.word.hangul, word.word.audioUrl);
    });
  }

  start(mode: GameMode): void {
    this.facade.start(mode);
  }

  resultStats(result: FinishResult | null): readonly HgSessionStat[] {
    return [
      {label: 'очков', value: this.facade.score(), tone: 'reward'},
      {label: 'слов', value: result?.total ?? '—', tone: 'info'},
      {label: 'верно', value: result?.correct ?? '—', tone: 'success'},
      {label: 'XP', value: result ? `+${result.xp}` : '—', tone: 'danger'},
    ];
  }
}
