import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';
import {OnboardingData, User, UserSettings} from '../user.entity';

export interface MeRepository {
  me(): Observable<User>;
  update(patch: {name?: string; startLevel?: string}): Observable<User>;
  settings(): Observable<UserSettings>;
  updateSettings(settings: UserSettings): Observable<UserSettings>;
  completeOnboarding(data: OnboardingData): Observable<void>;
  changePassword(current: string, next: string): Observable<void>;
  uploadAvatar(file: File): Observable<{avatarUrl: string}>;
  deleteAccount(): Observable<void>;
  unlinkOauth(provider: 'GOOGLE' | 'KAKAO'): Observable<void>;
}

export const ME_REPOSITORY = new InjectionToken<MeRepository>('MeRepository');
