import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {
  DEFAULT_THEME,
  THEME_ACCENTS,
  THEME_FONT_SCALES,
  THEME_RADII,
  ThemeChoice,
  ThemeService,
} from '@core/services/theme.service';
import {KoreanTtsService} from '@core/services/korean-tts.service';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../domain/repositories/me.repository';
import {UserSettings} from '../../../domain/user.entity';

@Component({
  selector: 'hg-settings-page',
  imports: [FormsModule],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  readonly auth = inject(AuthFacade);
  private meRepository = inject(ME_REPOSITORY);
  private themeService = inject(ThemeService);
  private tts = inject(KoreanTtsService);

  readonly settings = signal<UserSettings | null>(null);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  // тема
  readonly accents = THEME_ACCENTS;
  readonly fontScales = THEME_FONT_SCALES;
  readonly radii = THEME_RADII;
  readonly theme = signal<ThemeChoice>(this.themeService.stored());

  // смена имени/пароля
  readonly nameDraft = signal('');
  readonly showPassword = signal(false);
  readonly passwordCurrent = signal('');
  readonly passwordNext = signal('');
  readonly passwordError = signal<string | null>(null);

  readonly goals = [10, 20, 50];
  readonly speeds = [0.75, 1.0, 1.25];
  readonly times = ['09:00', '12:00', '19:00', '21:00'];

  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.nameDraft.set(this.auth.user()?.name ?? '');
    this.meRepository.settings().subscribe({
      next: settings => {
        this.settings.set(settings);
        // тема с сервера главнее локальной (синк между устройствами)
        const serverTheme = settings.theme as Partial<ThemeChoice> | null;
        if (serverTheme && typeof serverTheme === 'object') {
          const merged = {...DEFAULT_THEME, ...serverTheme};
          this.theme.set(merged);
          this.themeService.apply(merged);
        }
        this.tts.setRate(settings.playbackSpeed);
      },
      error: () => this.error.set('Не получилось загрузить настройки.'),
    });
  }

  patch(patch: Partial<UserSettings>): void {
    const current = this.settings();
    if (!current) return;
    const next = {...current, ...patch};
    this.settings.set(next);
    if (patch.playbackSpeed) this.tts.setRate(patch.playbackSpeed);
    this.scheduleSave();
  }

  setTheme(patch: Partial<ThemeChoice>): void {
    const next = {...this.theme(), ...patch};
    this.theme.set(next);
    this.themeService.apply(next);
    this.patch({theme: next});
  }

  /** Автосохранение с дебаунсом 600мс. */
  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      const settings = this.settings();
      if (!settings) return;
      this.meRepository.updateSettings(settings).subscribe({
        next: () => {
          this.saved.set(true);
          setTimeout(() => this.saved.set(false), 1600);
        },
        error: () => this.error.set('Не удалось сохранить. Проверь соединение.'),
      });
    }, 600);
  }

  saveName(): void {
    const name = this.nameDraft().trim();
    const user = this.auth.user();
    if (!name || !user || name === user.name) return;
    this.meRepository.update({name}).subscribe(updated => this.auth.syncUser(updated));
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
        this.saved.set(true);
        setTimeout(() => this.saved.set(false), 1600);
      },
      error: () => this.passwordError.set('Не получилось — проверь текущий пароль'),
    });
  }

  deleteAccount(): void {
    if (!confirm('Удалить аккаунт навсегда? Прогресс, слова и подписка будут стёрты.')) return;
    this.meRepository.deleteAccount().subscribe(() => this.auth.logout());
  }

  logout(): void {
    this.auth.logout();
  }
}
