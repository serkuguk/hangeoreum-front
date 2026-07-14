import {HttpClient} from '@angular/common/http';
import {Injectable, inject} from '@angular/core';
import {Observable} from 'rxjs';
import {ENV} from '@core/tokens/environment.token';
import {EnvironmentInterface} from '@core/interfaces/environment.interface';
import {MeRepository} from '../../domain/repositories/me.repository';
import {OnboardingData, User, UserSettings} from '../../domain/user.entity';

// DTO бэка совпадают с доменными типами 1:1 — отдельный маппер не нужен.
@Injectable()
export class MeHttpRepository implements MeRepository {
  private http = inject(HttpClient);
  private base = `${inject<EnvironmentInterface>(ENV).server_url}/me`;

  me(): Observable<User> {
    return this.http.get<User>(this.base);
  }

  update(patch: {name?: string; startLevel?: string}): Observable<User> {
    return this.http.patch<User>(this.base, patch);
  }

  settings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.base}/settings`);
  }

  updateSettings(settings: UserSettings): Observable<UserSettings> {
    return this.http.put<UserSettings>(`${this.base}/settings`, settings);
  }

  completeOnboarding(data: OnboardingData): Observable<void> {
    return this.http.post<void>(`${this.base}/onboarding`, data);
  }

  changePassword(current: string, next: string): Observable<void> {
    return this.http.post<void>(`${this.base}/password`, {current, next});
  }

  uploadAvatar(file: File): Observable<{avatarUrl: string}> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{avatarUrl: string}>(`${this.base}/avatar`, form);
  }

  deleteAccount(): Observable<void> {
    return this.http.delete<void>(this.base);
  }

  unlinkOauth(provider: 'GOOGLE' | 'KAKAO'): Observable<void> {
    return this.http.delete<void>(`${this.base}/oauth/${provider}`);
  }
}
