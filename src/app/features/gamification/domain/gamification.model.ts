import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export interface Profile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  memberSince: string;
  level: number;
  levelTitle: string;
  totalXp: number;
  xpToNext: number | null;
  streak: number;
  longestStreak: number;
  wordsLearned: number;
  lessonsCompleted: number;
  achievementsEarned: number;
}

export interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string | null; // null → ещё закрыта
}

export interface GamificationRepository {
  profile(): Observable<Profile>;
  achievements(): Observable<Achievement[]>;
}

export const GAMIFICATION_REPOSITORY = new InjectionToken<GamificationRepository>('GamificationRepository');
