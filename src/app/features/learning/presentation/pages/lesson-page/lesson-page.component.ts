import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Router} from '@angular/router';
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

@Component({
  selector: 'hg-lesson-page',
  imports: [
    ExerciseChoiceComponent,
    ExerciseListenComponent,
    ExerciseWordOrderComponent,
    ExerciseFillBlankComponent,
    ExerciseMatchComponent,
    ExerciseTypeComponent,
  ],
  templateUrl: './lesson-page.component.html',
  styleUrl: './lesson-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPageComponent {
  readonly id = input.required<string>();

  readonly facade = inject(LessonFacade);
  private router = inject(Router);

  constructor() {
    setTimeout(() => this.facade.start(this.id()));
  }

  exit(): void {
    if (this.facade.inProgress && !confirm('Выйти из урока? Прогресс этой сессии не сохранится.')) {
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
}
