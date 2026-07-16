import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {Word} from '@features/vocabulary/domain/entities/word.entity';
import {CourseMap} from '../entities/course-map.entity';
import {Lesson, Tip} from '../entities/exercise.entity';
import {Alphabet} from '../entities/alphabet.entity';
import {Story} from '../entities/story.entity';

export interface CompleteResult {
  attemptId: string;
  savedAt: string;
  xp: number;
  newWords: Word[];
  streak: number;
  goalReached: boolean;
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
  complete(lessonId: string, request: CompleteRequest): Observable<CompleteResult>;
  story(lessonId: string): Observable<Story>;
  alphabet(): Observable<Alphabet>;
  markLetterLearned(letterId: string): Observable<LetterLearnedResult>;
}

export const LEARNING_REPOSITORY = new InjectionToken<LearningRepository>('LearningRepository');
