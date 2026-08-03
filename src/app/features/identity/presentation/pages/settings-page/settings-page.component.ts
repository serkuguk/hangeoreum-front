import {ChangeDetectionStrategy, Component, DestroyRef, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormsModule} from '@angular/forms';
import {
  ReplaySubject,
  Subject,
  catchError,
  debounce,
  finalize,
  firstValueFrom,
  map,
  of,
  switchMap,
  timer,
} from 'rxjs';
import {
  ColorMode,
  DEFAULT_THEME,
  THEME_ACCENTS,
  THEME_FONT_SCALES,
  THEME_RADII,
  ThemeChoice,
  ThemeService,
} from '@core/services/theme.service';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {
  HgButtonComponent,
  HgInputComponent,
  HgSegmentedControlComponent,
  HgSegmentedOption,
  HgToggleComponent,
} from '@shared/components/controls';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../domain/repositories/me.repository';
import {UserSettings} from '../../../domain/user.entity';

interface SettingsSaveRequest {
  settings: UserSettings;
  immediate: boolean;
  completion?: ReplaySubject<boolean>;
}

@Component({
  selector: 'hg-settings-page',
  imports: [FormsModule, HgButtonComponent, HgInputComponent, HgToggleComponent, HgSegmentedControlComponent],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  host: {'(window:beforeunload)': 'warnBeforeUnload($event)'},
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  readonly auth = inject(AuthFacade);
  private meRepository = inject(ME_REPOSITORY);
  private themeService = inject(ThemeService);
  private tts = inject(KoreanTtsService);
  private destroyRef = inject(DestroyRef);

  readonly settings = signal<UserSettings | null>(null);
  readonly saved = signal(false);
  readonly saving = signal(false);
  readonly dirty = signal(false);
  readonly error = signal<string | null>(null);

  // тема
  readonly accents = THEME_ACCENTS;
  readonly fontScales = THEME_FONT_SCALES;
  readonly radii = THEME_RADII;
  readonly theme = signal<ThemeChoice>(this.themeService.stored());
  readonly mode = signal<ColorMode>(this.themeService.storedMode());

  // смена имени/пароля
  readonly nameDraft = signal('');
  readonly showPassword = signal(false);
  readonly passwordCurrent = signal('');
  readonly passwordNext = signal('');
  readonly passwordError = signal<string | null>(null);

  readonly goals = [10, 20, 50];
  readonly speeds = [0.75, 1.0, 1.25];
  readonly times = ['09:00', '12:00', '19:00', '21:00'];
  readonly goalOptions: readonly HgSegmentedOption<number>[] = this.goals.map(goal =>
    ({value: goal, label: `${goal} XP`}));
  readonly speedOptions: readonly HgSegmentedOption<number>[] = this.speeds.map(speed =>
    ({value: speed, label: `${speed}×`}));
  readonly timeOptions: readonly HgSegmentedOption<string>[] = this.times.map(time =>
    ({value: time, label: time}));
  readonly modeOptions: readonly HgSegmentedOption<ColorMode>[] = [
    {value: 'light', label: 'Светлая'},
    {value: 'dark', label: 'Тёмная'},
    {value: 'system', label: 'Системная'},
  ];
  readonly accentOptions: readonly HgSegmentedOption<string>[] = this.accents.map(accent =>
    ({value: accent.value, label: accent.name}));
  readonly fontScaleOptions: readonly HgSegmentedOption<number>[] = this.fontScales.map(scale =>
    ({value: scale.value, label: scale.name}));
  readonly radiusOptions: readonly HgSegmentedOption<string>[] = this.radii.map(radius =>
    ({value: radius.value, label: radius.name}));

  private readonly saveRequests$ = new Subject<SettingsSaveRequest>();
  private readonly pendingCompletions = new Set<ReplaySubject<boolean>>();
  private savedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.saveRequests$.pipe(
      debounce(request => request.immediate ? of(0) : timer(600)),
      switchMap(request => {
        this.saving.set(true);
        return this.meRepository.updateSettings(request.settings).pipe(
          map(() => ({request, success: true})),
          catchError(() => of({request, success: false})),
          finalize(() => {
            if (request.completion && !request.completion.closed) {
              this.resolveCompletion(request.completion, false);
            }
          }),
        );
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({request, success}) => {
      this.saving.set(false);
      const savedLatestValue = success && sameSettings(this.settings(), request.settings);
      if (savedLatestValue) this.dirty.set(false);
      this.error.set(success ? null : 'Не удалось сохранить. Проверь соединение.');
      if (success) this.showSaved();
      if (request.completion) this.resolveCompletion(request.completion, savedLatestValue);
    });

    this.destroyRef.onDestroy(() => {
      if (this.savedTimer) clearTimeout(this.savedTimer);
      this.pendingCompletions.forEach(completion => this.resolveCompletion(completion, false));
    });

    this.nameDraft.set(this.auth.user()?.name ?? '');
    this.meRepository.settings().subscribe({
      next: settings => {
        this.settings.set(settings);
        // тема с сервера главнее локальной (синк между устройствами)
        const serverTheme = settings.theme as (Partial<ThemeChoice> & {mode?: ColorMode}) | null;
        if (serverTheme && typeof serverTheme === 'object') {
          const merged = {...DEFAULT_THEME, ...serverTheme};
          this.theme.set(merged);
          this.themeService.apply(merged);
          if (serverTheme.mode) {
            this.mode.set(serverTheme.mode);
            this.themeService.setMode(serverTheme.mode);
          }
        }
        this.tts.setRate(settings.playbackSpeed);
        this.dirty.set(false);
      },
      error: () => this.error.set('Не получилось загрузить настройки.'),
    });
  }

  patch(patch: Partial<UserSettings>): void {
    const current = this.settings();
    if (!current) return;
    const next = {...current, ...patch};
    this.settings.set(next);
    this.dirty.set(true);
    this.error.set(null);
    if (patch.playbackSpeed) this.tts.setRate(patch.playbackSpeed);
    this.saveRequests$.next({settings: next, immediate: false});
  }

  setTheme(patch: Partial<ThemeChoice>): void {
    const next = {...this.theme(), ...patch};
    this.theme.set(next);
    this.themeService.apply(next);
    this.patch({theme: {...next, mode: this.mode()}});
  }

  setMode(mode: ColorMode): void {
    this.mode.set(mode);
    this.themeService.setMode(mode);
    this.patch({theme: {...this.theme(), mode}});
  }

  updateGoal(goal: number | null): void {
    if (goal !== null) this.patch({dailyGoalXp: goal});
  }

  updateReminderTime(time: string | null): void {
    if (time !== null) this.patch({reminderTime: time});
  }

  updatePlaybackSpeed(speed: number | null): void {
    if (speed !== null) this.patch({playbackSpeed: speed});
  }

  updateMode(mode: ColorMode | null): void {
    if (mode !== null) this.setMode(mode);
  }

  updateAccent(accent: string | null): void {
    if (accent !== null) this.setTheme({accent});
  }

  updateFontScale(fontScale: number | null): void {
    if (fontScale !== null) this.setTheme({fontScale});
  }

  updateRadius(radius: string | null): void {
    if (radius !== null) this.setTheme({radius});
  }

  canDeactivate(): boolean | Promise<boolean> {
    if (!this.dirty()) return true;
    if (!confirm('Настройки ещё не сохранены. Сохранить их перед выходом?')) return false;
    return this.saveLatestSettings();
  }

  warnBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.dirty()) return;
    event.preventDefault();
    event.returnValue = '';
  }

  saveName(): void {
    const name = this.nameDraft().trim();
    const user = this.auth.user();
    if (!name || !user || name === user.name) return;
    this.meRepository.update({name}).subscribe({
      next: updated => this.auth.syncUser(updated),
      error: () => this.error.set('Не получилось изменить имя.'),
    });
  }

  changePassword(): void {
    this.passwordError.set(null);
    if (this.passwordNext().length < 8) {
      this.passwordError.set('Новый пароль — минимум 8 символов');
      return;
    }
    this.meRepository.changePassword(this.passwordCurrent(), this.passwordNext()).subscribe({
      next: () => {
        this.showPassword.set(false);
        this.passwordCurrent.set('');
        this.passwordNext.set('');
        this.showSaved();
      },
      error: () => this.passwordError.set('Не получилось — проверь текущий пароль'),
    });
  }

  deleteAccount(): void {
    if (!confirm('Удалить аккаунт навсегда? Прогресс, слова и подписка будут стёрты.')) return;
    this.meRepository.deleteAccount().subscribe({
      next: () => this.auth.logout(),
      error: () => this.error.set('Не получилось удалить аккаунт.'),
    });
  }

  logout(): void {
    this.auth.logout();
  }

  private saveLatestSettings(): Promise<boolean> {
    const settings = this.settings();
    if (!settings) return Promise.resolve(!this.dirty());

    const completion = new ReplaySubject<boolean>(1);
    this.pendingCompletions.add(completion);
    const result = firstValueFrom(completion);
    this.saveRequests$.next({settings, immediate: true, completion});
    return result.finally(() => this.pendingCompletions.delete(completion));
  }

  private resolveCompletion(completion: ReplaySubject<boolean>, result: boolean): void {
    if (completion.closed) return;
    completion.next(result);
    completion.complete();
    this.pendingCompletions.delete(completion);
  }

  private showSaved(): void {
    this.saved.set(true);
    if (this.savedTimer) clearTimeout(this.savedTimer);
    this.savedTimer = setTimeout(() => this.saved.set(false), 1600);
  }
}

function sameSettings(current: UserSettings | null, saved: UserSettings): boolean {
  return current !== null && JSON.stringify(current) === JSON.stringify(saved);
}
