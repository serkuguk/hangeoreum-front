import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {jest} from '@jest/globals';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {ThemeService} from '@core/services/theme.service';
import {Subject, of} from 'rxjs';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../application/me-repository.token';
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
  let repository: {settings: jest.Mock; updateSettings: jest.Mock; changePassword: jest.Mock};

  beforeEach(() => {
    jest.useFakeTimers();
    repository = {
      settings: jest.fn().mockReturnValue(of(initialSettings)),
      updateSettings: jest.fn(),
      changePassword: jest.fn(),
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

  it('saves the name on every inner-input blur, including already touched fields', () => {
    const fixture = TestBed.createComponent(SettingsPageComponent);
    fixture.detectChanges();
    const saveName = jest.spyOn(fixture.componentInstance, 'saveName').mockImplementation(() => {});
    const input: HTMLInputElement = fixture.nativeElement.querySelector('app-basic-input input');
    for (const name of ['Mina', 'Sora']) {
      input.value = name;
      input.dispatchEvent(new Event('input', {bubbles: true}));
      input.dispatchEvent(new FocusEvent('blur'));
      input.dispatchEvent(new FocusEvent('focusout', {bubbles: true}));
      fixture.detectChanges();
      expect(fixture.componentInstance.nameDraft()).toBe(name);
    }
    expect(saveName).toHaveBeenCalledTimes(2);
  });

  it('validates password fields, prevents duplicate saves and permits retry after error', () => {
    component.passwordModel.set({current: '', next: 'short'});
    component.changePassword();
    expect(repository.changePassword).not.toHaveBeenCalled();
    const change$ = new Subject<void>();
    repository.changePassword.mockReturnValue(change$);
    component.passwordModel.set({current: 'old-password', next: 'new-password'});
    component.changePassword();
    component.changePassword();
    expect(repository.changePassword).toHaveBeenCalledTimes(1);
    expect(repository.changePassword).toHaveBeenCalledWith('old-password', 'new-password');
    change$.error(new Error('network'));
    expect(component.passwordSaving()).toBe(false);
    expect(component.passwordModel().next).toBe('new-password');
    repository.changePassword.mockReturnValue(of(undefined));
    component.changePassword();
    expect(repository.changePassword).toHaveBeenCalledTimes(2);
    expect(component.passwordModel()).toEqual({current: '', next: ''});
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
