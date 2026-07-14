import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {Achievement, GamificationRepository, Profile} from '../domain/gamification.model';

@Injectable()
export class GamificationHttpRepository implements GamificationRepository {
  private http = inject(HttpClient);
  private base = `${inject<EnvironmentInterface>(ENV).server_url}/me`;

  profile(): Observable<Profile> {
    return this.http.get<Profile>(`${this.base}/profile`);
  }

  achievements(): Observable<Achievement[]> {
    return this.http.get<Achievement[]>(`${this.base}/achievements`);
  }
}
