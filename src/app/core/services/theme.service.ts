import {Injectable} from '@angular/core';

export interface ThemeChoice {
  accent: string;      // hex из accentOptions
  fontScale: number;   // 0.9 | 1.0 | 1.15 | 1.3
  radius: string;      // '10px' | '22px' | '30px'
}

export const THEME_ACCENTS = [
  {name: 'Синий (основной)', value: '#3B6BFF'},
  {name: 'Красный', value: '#FF4D5E'},
  {name: 'Жёлтый', value: '#FFC23C'},
  {name: 'Нефрит', value: '#1FC79B'},
];

export const THEME_FONT_SCALES = [
  {name: 'Компактно', value: 0.9},
  {name: 'Обычно', value: 1.0},
  {name: 'Крупно', value: 1.15},
  {name: 'Очень крупно', value: 1.3},
];

export const THEME_RADII = [
  {name: 'Острые', value: '10px'},
  {name: 'Обычные', value: '22px'},
  {name: 'Мягкие', value: '30px'},
];

export const DEFAULT_THEME: ThemeChoice = {accent: '#3B6BFF', fontScale: 1.0, radius: '22px'};

const THEME_KEY = 'hg_theme';

/**
 * Пишет варианты из hangeoreum-theme-config.json в --hg-* custom properties.
 * Локально кэшируется в localStorage; сервер (user_settings.theme) — источник
 * между устройствами, применяется через apply() после загрузки настроек.
 */
@Injectable({providedIn: 'root'})
export class ThemeService {

  init(): void {
    this.apply(this.stored());
  }

  apply(theme: ThemeChoice): void {
    const root = document.documentElement.style;
    root.setProperty('--hg-blue', theme.accent);
    root.setProperty('--hg-fs-base', `${15 * theme.fontScale}px`);
    root.setProperty('--hg-radius-lg', theme.radius);
    localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  }

  stored(): ThemeChoice {
    try {
      const raw = localStorage.getItem(THEME_KEY);
      return raw ? {...DEFAULT_THEME, ...JSON.parse(raw)} : DEFAULT_THEME;
    } catch {
      return DEFAULT_THEME;
    }
  }
}
