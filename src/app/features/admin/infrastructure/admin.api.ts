import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {Word} from '@features/vocabulary/domain/entities/word.entity';
import {LessonType} from '@features/learning/domain/entities/course-map.entity';
import {ExerciseKind} from '@features/learning/domain/entities/exercise.entity';

// ---- типы админки (сырые JPA-сущности бэка: Lombok isXxx → JSON "xxx") ----

export interface AdminMetrics {
  totalUsers: number;
  dau: number;
  lessonsCompletedToday: number;
  activeSubscriptions: number;
  conversion: number;
}

export interface AdminPage<T> {
  content: T[];
  totalElements: number;
  page: number;
}

export interface WordRequest {
  hangul: string;
  romanization: string;
  translation: string;
  partOfSpeech?: string | null;
  topicId?: string | null;
  exampleKo?: string | null;
  exampleTranslation?: string | null;
  grammarNote?: string | null;
}

export interface Topic {
  id: string;
  code: string;
  title: string;
  icon: string | null;
}

export interface AdminCourse {
  id: string;
  lang: string;
  title: string;
  description: string | null;
  published: boolean;
}

export interface AdminUnit {
  id: string;
  courseId: string;
  position: number;
  title: string;
  description: string | null;
  color: string | null;
  published: boolean;
}

export interface AdminLesson {
  id: string;
  unitId: string;
  position: number;
  type: string;
  title: string;
  xpReward: number;
  free: boolean;
  published: boolean;
}

export interface AdminExercise {
  id: string;
  position: number;
  kind: string;
  payload: unknown;
}

export interface AdminTip {
  id: string;
  title: string;
  bodyMd: string;
  examples: unknown;
}

export interface AdminLessonFull {
  lesson: AdminLesson;
  tip: AdminTip | null;
  exercises: AdminExercise[];
  words: Word[];
}

export interface AdminLetter {
  id: string;
  jamo: string;
  romanization: string;
  letterGroup: string;
  position: number;
  audioUrl: string | null;
}

export interface Speaker {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
}

export interface AdminClip {
  id: string;
  kind: 'WORD' | 'STORY' | 'IMMERSE';
  speakerId: string | null;
  wordId: string | null;
  videoUrl: string | null;
  audioUrl: string | null;
  thumbnailUrl: string | null;
  durationMs: number | null;
  published: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  startLevel: string;
  createdAt: string;
}

@Injectable()
export class AdminApi {
  private http = inject(HttpClient);
  private base = `${inject<EnvironmentInterface>(ENV).server_url}/admin`;

  // ---- метрики ----
  metrics(): Observable<AdminMetrics> {
    return this.http.get<AdminMetrics>(`${this.base}/metrics`);
  }

  // ---- слова ----
  words(search: string, page: number): Observable<AdminPage<Word>> {
    let params = new HttpParams().set('page', page).set('size', 20);
    if (search) params = params.set('search', search);
    return this.http.get<AdminPage<Word>>(`${this.base}/words`, {params});
  }

  createWord(request: WordRequest): Observable<Word> {
    return this.http.post<Word>(`${this.base}/words`, request);
  }

  updateWord(id: string, request: WordRequest): Observable<Word> {
    return this.http.put<Word>(`${this.base}/words/${id}`, request);
  }

  deleteWord(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/words/${id}`);
  }

  uploadWordMedia(id: string, file: File, kind: 'audio' | 'image'): Observable<Word> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return this.http.post<Word>(`${this.base}/words/${id}/media`, form);
  }

  // ---- темы ----
  topics(): Observable<Topic[]> {
    return this.http.get<Topic[]>(`${this.base}/topics`);
  }

  createTopic(request: Omit<Topic, 'id'>): Observable<Topic> {
    return this.http.post<Topic>(`${this.base}/topics`, request);
  }

  updateTopic(id: string, request: Omit<Topic, 'id'>): Observable<Topic> {
    return this.http.put<Topic>(`${this.base}/topics/${id}`, request);
  }

  deleteTopic(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/topics/${id}`);
  }

  // ---- курс / юниты / уроки ----
  courses(): Observable<AdminCourse[]> {
    return this.http.get<AdminCourse[]>(`${this.base}/courses`);
  }

  createCourse(request: {title: string; description?: string}): Observable<AdminCourse> {
    return this.http.post<AdminCourse>(`${this.base}/courses`, request);
  }

  publishCourse(id: string, isPublished: boolean): Observable<AdminCourse> {
    return this.http.patch<AdminCourse>(`${this.base}/courses/${id}/publish`, {isPublished});
  }

  units(courseId: string): Observable<AdminUnit[]> {
    return this.http.get<AdminUnit[]>(`${this.base}/courses/${courseId}/units`);
  }

  createUnit(request: {courseId: string; position: number; title: string; description?: string; color?: string}): Observable<AdminUnit> {
    return this.http.post<AdminUnit>(`${this.base}/units`, request);
  }

  updateUnit(id: string, request: {courseId: string; position: number; title: string; description?: string; color?: string}): Observable<AdminUnit> {
    return this.http.put<AdminUnit>(`${this.base}/units/${id}`, request);
  }

  deleteUnit(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/units/${id}`);
  }

  publishUnit(id: string, isPublished: boolean): Observable<AdminUnit> {
    return this.http.patch<AdminUnit>(`${this.base}/units/${id}/publish`, {isPublished});
  }

  reorderUnits(items: {id: string; position: number}[]): Observable<void> {
    return this.http.post<void>(`${this.base}/units/reorder`, items);
  }

  lessons(unitId: string): Observable<AdminLesson[]> {
    return this.http.get<AdminLesson[]>(`${this.base}/units/${unitId}/lessons`);
  }

  createLesson(request: {unitId: string; position: number; type: LessonType | string; title: string; xpReward: number; isFree: boolean}): Observable<AdminLesson> {
    return this.http.post<AdminLesson>(`${this.base}/lessons`, request);
  }

  updateLesson(id: string, request: {unitId: string; position: number; type: LessonType | string; title: string; xpReward: number; isFree: boolean}): Observable<AdminLesson> {
    return this.http.put<AdminLesson>(`${this.base}/lessons/${id}`, request);
  }

  deleteLesson(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lessons/${id}`);
  }

  publishLesson(id: string, isPublished: boolean): Observable<AdminLesson> {
    return this.http.patch<AdminLesson>(`${this.base}/lessons/${id}/publish`, {isPublished});
  }

  reorderLessons(items: {id: string; position: number}[]): Observable<void> {
    return this.http.post<void>(`${this.base}/lessons/reorder`, items);
  }

  // ---- конструктор урока ----
  lessonFull(id: string): Observable<AdminLessonFull> {
    return this.http.get<AdminLessonFull>(`${this.base}/lessons/${id}/full`);
  }

  createExercise(lessonId: string, request: {position: number; kind: ExerciseKind | string; payload: unknown}): Observable<AdminExercise> {
    return this.http.post<AdminExercise>(`${this.base}/lessons/${lessonId}/exercises`, request);
  }

  updateExercise(lessonId: string, exerciseId: string, request: {position: number; kind: ExerciseKind | string; payload: unknown}): Observable<AdminExercise> {
    return this.http.put<AdminExercise>(`${this.base}/lessons/${lessonId}/exercises/${exerciseId}`, request);
  }

  deleteExercise(lessonId: string, exerciseId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lessons/${lessonId}/exercises/${exerciseId}`);
  }

  putTip(lessonId: string, request: {title: string; bodyMd: string; examples: unknown}): Observable<AdminTip> {
    return this.http.put<AdminTip>(`${this.base}/lessons/${lessonId}/tip`, request);
  }

  tips(): Observable<AdminTip[]> {
    return this.http.get<AdminTip[]>(`${this.base}/tips`);
  }

  putLessonWords(lessonId: string, wordIds: string[]): Observable<Word[]> {
    return this.http.put<Word[]>(`${this.base}/lessons/${lessonId}/words`, wordIds);
  }

  // ---- алфавит ----
  letters(): Observable<AdminLetter[]> {
    return this.http.get<AdminLetter[]>(`${this.base}/alphabet`);
  }

  updateLetter(id: string, request: {position?: number; audioUrl?: string}): Observable<AdminLetter> {
    return this.http.put<AdminLetter>(`${this.base}/alphabet/${id}`, request);
  }

  uploadLetterAudio(id: string, file: File): Observable<AdminLetter> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<AdminLetter>(`${this.base}/alphabet/${id}/audio`, form);
  }

  // ---- медиа ----
  speakers(): Observable<Speaker[]> {
    return this.http.get<Speaker[]>(`${this.base}/speakers`);
  }

  createSpeaker(request: {name: string; avatarUrl?: string; bio?: string}): Observable<Speaker> {
    return this.http.post<Speaker>(`${this.base}/speakers`, request);
  }

  deleteSpeaker(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/speakers/${id}`);
  }

  clips(): Observable<AdminClip[]> {
    return this.http.get<AdminClip[]>(`${this.base}/clips`);
  }

  createClip(request: {kind: string; speakerId?: string | null; wordId?: string | null; durationMs?: number | null}): Observable<AdminClip> {
    return this.http.post<AdminClip>(`${this.base}/clips`, request);
  }

  deleteClip(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/clips/${id}`);
  }

  uploadClipMedia(id: string, file: File, kind: 'video' | 'audio' | 'thumbnail'): Observable<AdminClip> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    return this.http.post<AdminClip>(`${this.base}/clips/${id}/media`, form);
  }

  publishClip(id: string, isPublished: boolean): Observable<AdminClip> {
    return this.http.patch<AdminClip>(`${this.base}/clips/${id}/publish`, {isPublished});
  }

  putSubtitles(clipId: string, subtitles: {lang: string; position: number; text: string; startMs: number; endMs: number}[]): Observable<void> {
    return this.http.put<void>(`${this.base}/clips/${clipId}/subtitles`, subtitles);
  }

  putStory(lessonId: string, request: {title: string; clipId?: string | null; lines: unknown[]}): Observable<void> {
    return this.http.put<void>(`${this.base}/lessons/${lessonId}/story`, request);
  }

  // ---- пользователи / уведомления ----
  users(search: string, page: number): Observable<AdminPage<AdminUser>> {
    let params = new HttpParams().set('page', page).set('size', 20);
    if (search) params = params.set('search', search);
    return this.http.get<AdminPage<AdminUser>>(`${this.base}/users`, {params});
  }

  patchUser(id: string, patch: {role?: string; isActive?: boolean}): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.base}/users/${id}`, patch);
  }

  broadcast(title: string, body: string): Observable<void> {
    return this.http.post<void>(`${this.base}/notifications/broadcast`, {title, body});
  }
}
