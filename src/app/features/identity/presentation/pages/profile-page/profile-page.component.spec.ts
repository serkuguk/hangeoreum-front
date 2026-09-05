import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Subject} from 'rxjs';
import {jest} from '@jest/globals';
import {ENV} from '@core/tokens/environment.token';
import {Profile} from '@features/gamification/domain/gamification.model';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../application/me-repository.token';
import {User} from '../../../domain/user.entity';
import {ProfilePageComponent} from './profile-page.component';

describe('Profile avatar update', () => {
  const profile: Profile = {
    id: 'u', name: 'User', email: 'user@example.com', avatarUrl: 'old', memberSince: '2026-01-01',
    level: 1, levelTitle: 'Beginner', totalXp: 10, xpToNext: 90, streak: 0, longestStreak: 0,
    wordsLearned: 0, lessonsCompleted: 0, achievementsEarned: 0,
  };
  let upload: Subject<{avatarUrl: string}>;
  let http: HttpTestingController;
  const user = signal<User | null>(null);
  const syncUser = jest.fn((updated: User) => user.set(updated));

  beforeEach(() => {
    upload = new Subject();
    syncUser.mockClear();
    user.set({id: 'u', name: 'User', email: profile.email, avatarUrl: 'old', role: 'USER', startLevel: 'BEGINNER', createdAt: profile.memberSince});
    TestBed.configureTestingModule({providers: [
      provideHttpClient(), provideHttpClientTesting(),
      {provide: ENV, useValue: {server_url: '/api'}},
      {provide: AuthFacade, useValue: {user, syncUser}},
      {provide: ME_REPOSITORY, useValue: {uploadAvatar: () => upload}},
    ]}).overrideComponent(ProfilePageComponent, {set: {template: '', imports: []}});
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  function page(loadProfile = true): ProfilePageComponent {
    const component = TestBed.createComponent(ProfilePageComponent).componentInstance;
    const request = http.expectOne('/api/me/profile');
    if (loadProfile) request.flush(profile);
    else request.flush(null, {status: 500, statusText: 'Server Error'});
    http.expectOne('/api/me/achievements').flush([]);
    return component;
  }

  it('updates identity and readonly gamification state only after upload success', () => {
    const component = page();
    component.onAvatar(new File(['avatar'], 'avatar.png'));
    expect(component.uploading()).toBe(true);
    expect(component.facade.profile()).toEqual(profile);
    expect(syncUser).not.toHaveBeenCalled();
    upload.next({avatarUrl: 'new'});
    expect(user()?.avatarUrl).toBe('new');
    expect(component.facade.profile()).toEqual({...profile, avatarUrl: 'new'});
    expect(component.uploading()).toBe(false);
    expect('set' in component.facade.profile).toBe(false);
  });

  it('preserves both profiles when upload fails', () => {
    const component = page();
    component.onAvatar(new File([], 'avatar.png'));
    upload.error(new Error('upload failed'));
    expect(component.facade.profile()).toEqual(profile);
    expect(user()?.avatarUrl).toBe('old');
    expect(syncUser).not.toHaveBeenCalled();
    expect(component.uploading()).toBe(false);
  });

  it('does not fabricate a gamification profile when it has not loaded', () => {
    const component = page(false);
    component.onAvatar(new File([], 'avatar.png'));
    upload.next({avatarUrl: 'new'});
    expect(component.facade.profile()).toBeNull();
    expect(user()?.avatarUrl).toBe('new');
  });
});
