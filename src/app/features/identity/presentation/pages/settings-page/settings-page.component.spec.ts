import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {ThemeService} from '@core/services/theme.service';
import {Subject, of} from 'rxjs';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../domain/repositories/me.repository';
import {UserSettings} from '../../../domain/user.entity';
import {SettingsPageComponent} from './settings-page.component';

const initialSettings: UserSettings = {
  dailyGoalXp: 10,
  remindersEnabled: false,
  reminderTime: null,
  soundEnabled: true,
  autoplayAudio: true,
  showRomanization: true,
  playbackSpeed: 1,
  theme: null,
};

describe('SettingsPage pending changes', () => {
  let component: SettingsPageComponent;
  let repository: {settings: jest.Mock; updateSettings: jest.Mock};

  beforeEach(() => {
    jest.useFakeTimers();
    repository = {
      settings: jest.fn().mockReturnValue(of(initialSettings)),
      updateSettings: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        {provide: ME_REPOSITORY, useValue: repository},
        {provide: AuthFacade, useValue: {user: signal(null), logout: jest.fn(), syncUser: jest.fn()}},
        {
          provide: ThemeService,
          useValue: {
            stored: () => ({accent: '#00a67d', fontScale: 1, radius: 12}),
            storedMode: () => 'system',
            apply: jest.fn(),
            setMode: jest.fn(),
          },
        },
        {provide: KoreanTtsService, useValue: {setRate: jest.fn()}},
      ],
    });
    component = TestBed.runInInjectionContext(() => new SettingsPageComponent());
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('leaves a clean page immediately', () => {
    const confirmSpy = jest.spyOn(window, 'confirm');

    expect(component.canDeactivate()).toBe(true);
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('stays when the user cancels', () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    component.patch({dailyGoalXp: 20});

    expect(component.canDeactivate()).toBe(false);
    expect(repository.updateSettings).not.toHaveBeenCalled();
  });

  it('saves the latest snapshot and leaves only after success', async () => {
    const update$ = new Subject<UserSettings>();
    repository.updateSettings.mockReturnValue(update$);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    component.patch({dailyGoalXp: 20});

    const canLeave = component.canDeactivate() as Promise<boolean>;
    expect(repository.updateSettings).toHaveBeenCalledWith({...initialSettings, dailyGoalXp: 20});

    update$.next({...initialSettings, dailyGoalXp: 20});
    update$.complete();

    await expect(canLeave).resolves.toBe(true);
    expect(component.dirty()).toBe(false);
  });

  it('blocks navigation when saving fails', async () => {
    const update$ = new Subject<UserSettings>();
    repository.updateSettings.mockReturnValue(update$);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    component.patch({dailyGoalXp: 50});

    const canLeave = component.canDeactivate() as Promise<boolean>;
    update$.error(new Error('network'));

    await expect(canLeave).resolves.toBe(false);
    expect(component.dirty()).toBe(true);
    expect(component.error()).toContain('Не удалось сохранить');
  });
});
