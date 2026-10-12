import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { AuthFacade } from '@features/identity/application/facades/auth.facade';
import { DAILY_GOAL_XP, REMINDER_TIMES, StartLevel } from '@features/identity/domain/user.entity';
import {
  ButtonComponent,
  SegmentedControlComponent,
  ToggleComponent,
} from 'springest';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

interface LevelOption {
  value: StartLevel;
  han: string;
  color: 'jade' | 'blue' | 'yellow';
  title: string;
  hint: string;
}

interface GoalOption {
  xp: number;
  icon: string;
  color: 'jade' | 'blue' | 'yellow';
  title: string;
  hint: string;
}

@Component({
  selector: 'hg-onboarding-page',
  imports: [
    FormField,
    ButtonComponent,
    SegmentedControlComponent,
    ToggleComponent,
    TranslatePipe,
  ],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPageComponent {
  private facade = inject(AuthFacade);
  private translate = inject(TranslateService);

  readonly levels: LevelOption[] = [
    {
      value: 'BEGINNER',
      han: '가',
      color: 'jade',
      title: this.translate.instant(
        'identity.onboarding.levels.beginner.title',
      ),
      hint: this.translate.instant('identity.onboarding.levels.beginner.hint'),
    },
    {
      value: 'KNOWS_HANGUL',
      han: '한',
      color: 'blue',
      title: this.translate.instant('identity.onboarding.levels.hangul.title'),
      hint: this.translate.instant('identity.onboarding.levels.hangul.hint'),
    },
    {
      value: 'INTERMEDIATE',
      han: '말',
      color: 'yellow',
      title: this.translate.instant(
        'identity.onboarding.levels.intermediate.title',
      ),
      hint: this.translate.instant(
        'identity.onboarding.levels.intermediate.hint',
      ),
    },
  ];

  readonly goals: GoalOption[] = [
    {
      xp: DAILY_GOAL_XP.Calm,
      icon: '🌱',
      color: 'jade',
      title: this.translate.instant('identity.onboarding.goals.calm.title'),
      hint: this.translate.instant('identity.onboarding.goals.calm.hint'),
    },
    {
      xp: DAILY_GOAL_XP.Confident,
      icon: '🎯',
      color: 'blue',
      title: this.translate.instant(
        'identity.onboarding.goals.confident.title',
      ),
      hint: this.translate.instant('identity.onboarding.goals.confident.hint'),
    },
    {
      xp: DAILY_GOAL_XP.Serious,
      icon: '🔥',
      color: 'yellow',
      title: this.translate.instant('identity.onboarding.goals.serious.title'),
      hint: this.translate.instant('identity.onboarding.goals.serious.hint'),
    },
  ];

  readonly times = REMINDER_TIMES;
  readonly levelOptions = this.levels.map((option) => ({
    value: option.value,
    label: `${option.han} ${option.title}`,
    description: option.hint,
  }));
  readonly goalOptions = this.goals.map((option) => ({
    value: option.xp,
    label: `${option.icon} ${option.title} · ${option.xp} XP`,
    description: option.hint,
  }));
  readonly timeOptions = this.times.map((value) => ({ value, label: value }));

  readonly step = signal(1);
  readonly model = signal({
    level: 'BEGINNER' as StartLevel,
    goal: DAILY_GOAL_XP.Confident as number,
    remindersEnabled: true,
    time: '19:00',
  });
  readonly form = form(this.model);
  readonly saving = signal(false);

  isActiveStep(dot: number): boolean {
    return this.step() === dot;
  }

  finish(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.facade.completeOnboarding({
      startLevel: this.model().level,
      dailyGoalXp: this.model().goal,
      remindersEnabled: this.model().remindersEnabled,
      reminderTime: this.model().remindersEnabled ? this.model().time : null,
    });
  }
}
