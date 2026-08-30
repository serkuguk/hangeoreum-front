import {Observable} from 'rxjs';
import {CourseMap} from '../entities/course-map.entity';
import {Lesson, Tip} from '../entities/exercise.entity';
import {Alphabet} from '../entities/alphabet.entity';
import {Story} from '../entities/story.entity';

export interface CompleteResult {
  attemptId: string;
  savedAt: string;
  xp: number;
  newWords: Array<{
    id: string;
    hangul: string;
    romanization: string;
    translation: string;
  }>;
  streak: number;
  goalReached: boolean;
}

export interface CompletionAccepted {
  attemptId: string;
  acceptedAt: string;
  status: 'PENDING' | 'COMPLETED';
}

export interface CompletionStatus {
  status: 'PENDING' | 'COMPLETED';
  result: CompleteResult | null;
}

export interface CompleteRequest {
  attemptId: string;
  score: number;
  accuracy: number;
}

export interface LetterLearnedResult {
  learnedCount: number;
  total: number;
  alphabetCompleted: boolean;
}

export interface LearningRepository {
  courseMap(): Observable<CourseMap>;
  lesson(id: string): Observable<Lesson>;
  tip(lessonId: string): Observable<Tip>;
  complete(lessonId: string, request: CompleteRequest): Observable<CompletionAccepted>;
  getCompletionStatus(attemptId: string): Observable<CompletionStatus>;
  story(lessonId: string): Observable<Story>;
  alphabet(): Observable<Alphabet>;
  markLetterLearned(letterId: string): Observable<LetterLearnedResult>;
}
