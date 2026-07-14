import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {Word} from '@features/vocabulary/domain/entities/word.entity';

export interface DashboardGoal {
  goalXp: number;
  earnedXp: number;
  reached: boolean;
}

export interface NextLesson {
  id: string;
  title: string;
  type: string;
}

export interface Dashboard {
  goal: DashboardGoal;
  wordOfDay: Word | null;
  dueWords: number;
  nextLessons: NextLesson[];
  weekXp: number[];
  streak: number;
  totalXp: number;
  wordsLearned: number;
  lessonsCompleted: number;
}

export interface DashboardRepository {
  load(): Observable<Dashboard>;
}

export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DashboardRepository');
