export type LessonType = 'ALPHABET' | 'GRAMMAR' | 'LESSON' | 'STORY';
export type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'COMPLETED';

export interface LessonNode {
  id: string;
  title: string;
  type: LessonType;
  position: number;
  xpReward: number;
  isFree: boolean;
  hasAccess: boolean;
  status: LessonStatus;
  score: number | null;
}

export interface UnitNode {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  position: number;
  lessons: LessonNode[];
}

export interface CourseMap {
  courseId: string | null;
  title: string | null;
  isPro: boolean;
  units: UnitNode[];
}
