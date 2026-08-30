import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {StartLevel} from '../../../domain/user.entity';
import {HgButtonComponent, HgSegmentedControlComponent, HgToggleComponent} from '@shared/components/controls';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

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
  imports: [FormsModule, HgButtonComponent, HgSegmentedControlComponent, HgToggleComponent, TranslatePipe],
  templateUrl: './onboarding-page.component.html',
  styleUrl: './onboarding-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingPageComponent {
  private facade = inject(AuthFacade);
  private translate = inject(TranslateService);

  readonly levels: LevelOption[] = [
    {value: 'BEGINNER', han: '가', color: 'jade', title: this.translate.instant('identity.onboarding.levels.beginner.title'), hint: this.translate.instant('identity.onboarding.levels.beginner.hint')},
    {value: 'KNOWS_HANGUL', han: '한', color: 'blue', title: this.translate.instant('identity.onboarding.levels.hangul.title'), hint: this.translate.instant('identity.onboarding.levels.hangul.hint')},
    {value: 'INTERMEDIATE', han: '말', color: 'yellow', title: this.translate.instant('identity.onboarding.levels.intermediate.title'), hint: this.translate.instant('identity.onboarding.levels.intermediate.hint')},
  ];

  readonly goals: GoalOption[] = [
    {xp: 10, icon: '🌱', color: 'jade', title: this.translate.instant('identity.onboarding.goals.calm.title'), hint: this.translate.instant('identity.onboarding.goals.calm.hint')},
    {xp: 20, icon: '🎯', color: 'blue', title: this.translate.instant('identity.onboarding.goals.confident.title'), hint: this.translate.instant('identity.onboarding.goals.confident.hint')},
    {xp: 50, icon: '🔥', color: 'yellow', title: this.translate.instant('identity.onboarding.goals.serious.title'), hint: this.translate.instant('identity.onboarding.goals.serious.hint')},
  ];

  readonly times = ['09:00', '12:00', '19:00', '21:00'];
  readonly levelOptions = this.levels.map(option => ({
    value: option.value,
    label: `${option.han} ${option.title}`,
    description: option.hint,
  }));
  readonly goalOptions = this.goals.map(option => ({
    value: option.xp,
    label: `${option.icon} ${option.title} · ${option.xp} XP`,
    description: option.hint,
  }));
  readonly timeOptions = this.times.map(value => ({value, label: value}));

  readonly step = signal(1);
  readonly level = signal<StartLevel>('BEGINNER');
  readonly goal = signal(20);
  readonly remindersEnabled = signal(true);
  readonly time = signal('19:00');
  readonly saving = signal(false);

  finish(): void {
    this.saving.set(true);
    this.facade.completeOnboarding({
      startLevel: this.level(),
      dailyGoalXp: this.goal(),
      remindersEnabled: this.remindersEnabled(),
      reminderTime: this.remindersEnabled() ? this.time() : null,
    });
  }
}
