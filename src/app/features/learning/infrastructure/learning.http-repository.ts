import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {CourseMap} from '../domain/entities/course-map.entity';
import {Alphabet} from '../domain/entities/alphabet.entity';
import {Lesson, Tip} from '../domain/entities/exercise.entity';
import {Story} from '../domain/entities/story.entity';
import {
  CompleteResult,
  LearningRepository,
  LetterLearnedResult,
} from '../domain/repositories/learning.repository';

// @JsonRawValue на бэке — payload/examples приходят готовыми JSON-объектами, маппинг 1:1
@Injectable()
export class LearningHttpRepository implements LearningRepository {
  private http = inject(HttpClient);
  private base = inject<EnvironmentInterface>(ENV).server_url;

  courseMap(): Observable<CourseMap> {
    return this.http.get<CourseMap>(`${this.base}/courses/current/map`);
  }

  lesson(id: string): Observable<Lesson> {
    return this.http.get<Lesson>(`${this.base}/lessons/${id}`);
  }

  tip(lessonId: string): Observable<Tip> {
    return this.http.get<Tip>(`${this.base}/lessons/${lessonId}/tip`);
  }

  complete(lessonId: string, score: number, accuracy: number): Observable<CompleteResult> {
    return this.http.post<CompleteResult>(`${this.base}/lessons/${lessonId}/complete`, {score, accuracy});
  }

  story(lessonId: string): Observable<Story> {
    return this.http.get<Story>(`${this.base}/lessons/${lessonId}/story`);
  }

  alphabet(): Observable<Alphabet> {
    return this.http.get<Alphabet>(`${this.base}/alphabet`);
  }

  markLetterLearned(letterId: string): Observable<LetterLearnedResult> {
    return this.http.post<LetterLearnedResult>(`${this.base}/alphabet/${letterId}/learned`, null);
  }
}
