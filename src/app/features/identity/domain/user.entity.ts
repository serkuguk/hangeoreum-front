// ponytail: единый тип пользователя живёт в core (нужен interceptor'у/AuthService),
// identity реэкспортирует его как доменную сущность.
export type {AuthUser as User} from '@core/auth/auth.service';

export type StartLevel = 'BEGINNER' | 'KNOWS_HANGUL' | 'INTERMEDIATE';

export interface UserSettings {
  dailyGoalXp: number;
  remindersEnabled: boolean;
  reminderTime: string | null; // 'HH:mm'
  soundEnabled: boolean;
  autoplayAudio: boolean;
  showRomanization: boolean;
  playbackSpeed: number;
  theme: unknown | null;
}

export interface OnboardingData {
  startLevel: StartLevel;
  dailyGoalXp: number;
  remindersEnabled: boolean;
  reminderTime: string | null;
}
