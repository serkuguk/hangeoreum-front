import {jest} from '@jest/globals';
import {DEFAULT_THEME, THEME_RADII, ThemeService} from './theme.service';

describe('ThemeService radius persistence', () => {
  const matchMediaDescriptor = Object.getOwnPropertyDescriptor(window, 'matchMedia');

  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: jest.fn().mockReturnValue({matches: false, addEventListener: jest.fn()}),
    });
  });

  afterEach(() => {
    localStorage.clear();
    const root = document.documentElement;
    for (const property of ['--hg-blue', '--hg-fs-base', '--hg-radius-lg', 'color-scheme']) {
      root.style.removeProperty(property);
    }
    root.removeAttribute('data-theme');
    root.classList.remove('hg-dark');
    if (matchMediaDescriptor) Object.defineProperty(window, 'matchMedia', matchMediaDescriptor);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  it.each(THEME_RADII)('applies, caches and restores radius $value on init', ({value}) => {
    const theme = {...DEFAULT_THEME, radius: value};
    new ThemeService().apply(theme);

    expect(document.documentElement.style.getPropertyValue('--hg-radius-lg')).toBe(value);
    expect(JSON.parse(localStorage.getItem('hg_theme')!)).toEqual(theme);

    document.documentElement.style.removeProperty('--hg-radius-lg');
    const restored = new ThemeService();
    restored.init();

    expect(document.documentElement.style.getPropertyValue('--hg-radius-lg')).toBe(value);
    expect(restored.stored()).toEqual(theme);
  });
});
