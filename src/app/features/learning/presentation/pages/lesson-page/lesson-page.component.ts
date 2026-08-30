import {ChangeDetectionStrategy, Component, OnInit, inject, input} from '@angular/core';
import {Router} from '@angular/router';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {HgSessionResultCardComponent, HgSessionStat} from '@shared/components/hg';
import {LessonFacade} from '../../../application/facades/lesson.facade';
import {
  ChoicePayload,
  FillBlankPayload,
  ListenChoicePayload,
  MatchPairsPayload,
  TypeWordPayload,
  WordOrderPayload,
} from '../../../domain/entities/exercise.entity';
import {ExerciseChoiceComponent} from '../../components/exercises/exercise-choice.component';
import {ExerciseListenComponent} from '../../components/exercises/exercise-listen.component';
import {ExerciseWordOrderComponent} from '../../components/exercises/exercise-word-order.component';
import {ExerciseFillBlankComponent} from '../../components/exercises/exercise-fill-blank.component';
import {ExerciseMatchComponent} from '../../components/exercises/exercise-match.component';
import {ExerciseTypeComponent} from '../../components/exercises/exercise-type.component';
import {CompleteResult} from '../../../domain/repositories/learning.repository';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

@Component({
  selector: 'hg-lesson-page',
  imports: [
    ExerciseChoiceComponent,
    ExerciseListenComponent,
    ExerciseWordOrderComponent,
    ExerciseFillBlankComponent,
    ExerciseMatchComponent,
    ExerciseTypeComponent,
    HgButtonComponent,
    HgSessionResultCardComponent,
    TranslatePipe,
  ],
  templateUrl: './lesson-page.component.html',
  styleUrl: './lesson-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPageComponent implements OnInit {
  readonly id = input.required<string>();

  readonly facade = inject(LessonFacade);
  private router = inject(Router);
  private translate = inject(TranslateService);

  ngOnInit(): void {
    this.facade.start(this.id());
  }

  exit(): void {
    if (this.facade.inProgress && !confirm(this.translate.instant('learning.lesson.exitConfirmation'))) {
      return;
    }
    this.router.navigate(['/learn']);
  }

  // помощники типизации payload для шаблона
  asChoice = (p: unknown) => p as ChoicePayload;
  asListen = (p: unknown) => p as ListenChoicePayload;
  asWordOrder = (p: unknown) => p as WordOrderPayload;
  asFillBlank = (p: unknown) => p as FillBlankPayload;
  asMatch = (p: unknown) => p as MatchPairsPayload;
  asType = (p: unknown) => p as TypeWordPayload;

  resultStats(result: CompleteResult): readonly HgSessionStat[] {
    return [
      {label: 'XP', value: `+${result.xp}`, tone: 'reward'},
      {label: this.translate.instant('learning.lesson.newWords'), value: `+${result.newWords.length}`, tone: 'info'},
      {label: this.translate.instant('learning.lesson.streakDays'), value: `🔥 ${result.streak}`, tone: 'danger'},
      {label: this.translate.instant('learning.lesson.dailyGoal'), value: result.goalReached ? '✓' : '…', tone: 'success'},
    ];
  }
}
