import {HttpClient, HttpParams} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {Clip, ClipRepository, Feed} from '../domain/clip.entity';

@Injectable()
export class ClipHttpRepository implements ClipRepository {
  private http = inject(HttpClient);
  private base = `${inject<EnvironmentInterface>(ENV).server_url}/immerse`;

  feed(cursor?: string | null): Observable<Feed> {
    let params = new HttpParams().set('size', 10);
    if (cursor) params = params.set('cursor', cursor);
    return this.http.get<Feed>(`${this.base}/feed`, {params});
  }

  markViewed(clipId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${clipId}/view`, null);
  }

  toggleLike(clipId: string): Observable<{liked: boolean}> {
    return this.http.post<{liked: boolean}>(`${this.base}/${clipId}/like`, null);
  }
}
