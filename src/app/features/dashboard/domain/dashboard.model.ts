import {Observable} from 'rxjs';

export interface DashboardWord {
  hangul: string;
  romanization: string;
  translation: string;
  audioUrl: string | null;
  exampleKo: string | null;
  exampleTranslation: string | null;
}

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

export interface DashboardLesson {
  id: string;
  title: string;
  type: 'ALPHABET' | 'GRAMMAR' | 'LESSON' | 'STORY';
  position: number;
  xpReward: number;
  hasAccess: boolean;
  status: 'LOCKED' | 'AVAILABLE' | 'COMPLETED';
  score: number | null;
}

export interface DashboardCourseMap {
  title: string | null;
  units: Array<{id: string; title: string; lessons: DashboardLesson[]}>;
}

export interface Dashboard {
  goal: DashboardGoal;
  wordOfDay: DashboardWord | null;
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
  courseMap(): Observable<DashboardCourseMap>;
}
