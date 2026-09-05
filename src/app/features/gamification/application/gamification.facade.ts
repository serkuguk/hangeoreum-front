import {Injectable, computed, inject, signal} from '@angular/core';
import {Achievement, Profile} from '../domain/gamification.model';
import {GAMIFICATION_REPOSITORY} from './gamification-repository.token';

@Injectable()
export class GamificationFacade {
  private repository = inject(GAMIFICATION_REPOSITORY);

  private readonly profileState = signal<Profile | null>(null);
  readonly profile = this.profileState.asReadonly();
  readonly achievements = signal<Achievement[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Прогресс до следующего уровня, 0–100. */
  readonly levelPercent = computed(() => {
    const profile = this.profile();
    if (!profile || profile.xpToNext === null) return 100;
    const span = profile.totalXp + profile.xpToNext;
    return span === 0 ? 0 : Math.round(profile.totalXp / span * 100);
  });

  updateAvatar(avatarUrl: string): void {
    this.profileState.update(profile => profile ? {...profile, avatarUrl} : null);
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.profile().subscribe({
      next: profile => {
        this.profileState.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить профиль.');
        this.loading.set(false);
      },
    });
    this.repository.achievements().subscribe(list => this.achievements.set(list));
  }
}
