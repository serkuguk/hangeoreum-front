import {ButtonComponent} from 'springest';
import {ChangeDetectionStrategy, Component, computed, effect, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {HgAudioButtonComponent, HgSessionResultCardComponent, HgSessionStat} from '@shared/components/hg';
import {FinishResult} from '../../../domain/repositories/vocabulary.repository';
import {AnswerResult, GameMode, GamesFacade, MatchCell, MatchSide} from '../../../application/facades/games.facade';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-games-page',
  imports: [RouterLink, HgAudioButtonComponent, ButtonComponent, HgSessionResultCardComponent, TranslatePipe],
  templateUrl: './games-page.component.html',
  styleUrl: './games-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamesPageComponent {
  readonly facade = inject(GamesFacade);
  private tts = inject(KoreanTtsService);
  private translate = inject(TranslateService);
  private lastAutoplayWordId: string | null = null;

  gameAria(game: {title: string; hint: string}): Record<string, string> {
    return {'aria-label': `${game.title}: ${game.hint}`};
  }

  readonly games: {mode: GameMode; icon: string; title: string; hint: string}[] = [
    {mode: 'MATCH', icon: '🧩', title: this.translate.instant('vocabulary.games.match.title'), hint: this.translate.instant('vocabulary.games.match.hint')},
    {mode: 'LISTEN', icon: '🎧', title: this.translate.instant('vocabulary.games.listen.title'), hint: this.translate.instant('vocabulary.games.listen.hint')},
    {mode: 'SPELL', icon: '⌨️', title: this.translate.instant('vocabulary.games.spell.title'), hint: this.translate.instant('vocabulary.games.spell.hint')},
  ];

  readonly clock = computed(() => {
    const t = Math.max(0, this.facade.timeLeft());
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  });

  readonly isTimeLow = computed(() => this.facade.timeLeft() < 15);
  readonly isAnswerOk = computed(() => this.facade.lastAnswer() === AnswerResult.OK);
  readonly isAnswerBad = computed(() => this.facade.lastAnswer() === AnswerResult.BAD);

  cellClass(cell: MatchCell): string {
    const f = this.facade;
    return [
      'hg-native-button mcell',
      cell.side === MatchSide.KO && 'kr',
      f.matchHits().has(cell.wordId + cell.side) && 'hit',
      f.matchSelected() === cell && 'sel',
      f.matchMiss() === cell && 'miss',
    ].filter(Boolean).join(' ');
  }

  optionClass(option: string, correctAnswer: string): string {
    const isCorrect = option === correctAnswer;
    return [
      'hg-native-button mcell',
      isCorrect && this.isAnswerOk() && 'hit',
      isCorrect && this.isAnswerBad() && 'miss',
    ].filter(Boolean).join(' ');
  }

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
      {label: this.translate.instant('vocabulary.games.stats.score'), value: this.facade.score(), tone: 'reward'},
      {label: this.translate.instant('vocabulary.games.stats.words'), value: result?.total ?? '—', tone: 'info'},
      {label: this.translate.instant('vocabulary.games.stats.correct'), value: result?.correct ?? '—', tone: 'success'},
      {label: 'XP', value: result ? `+${result.xp}` : '—', tone: 'danger'},
    ];
  }
}
