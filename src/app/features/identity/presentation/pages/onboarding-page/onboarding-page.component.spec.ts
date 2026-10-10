import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {provideTranslateService} from '@ngx-translate/core';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {OnboardingPageComponent} from './onboarding-page.component';

describe('Onboarding signal model', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('keeps numeric goals, null disabled reminders and submits once', () => {
    const completeOnboarding = jest.fn();
    TestBed.configureTestingModule({providers: [
      provideTranslateService({lang: 'ru', fallbackLang: 'ru'}),
      {provide: AuthFacade, useValue: {completeOnboarding}},
    ]});
    const component = TestBed.runInInjectionContext(() => new OnboardingPageComponent());
    component.form.goal().value.set(50);
    component.form.remindersEnabled().value.set(false);
    component.finish();
    component.finish();
    expect(completeOnboarding).toHaveBeenCalledTimes(1);
    expect(completeOnboarding).toHaveBeenCalledWith({
      startLevel: 'BEGINNER', dailyGoalXp: 50, remindersEnabled: false, reminderTime: null,
    });
  });
});
