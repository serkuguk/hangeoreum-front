export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  startLevel: string;
  createdAt: string;
}

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
