import {GamificationFacade, provideGamification} from '@features/gamification/public-api';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../application/me-repository.token';
import {ButtonComponent, FilePickerComponent} from 'springest';

@Component({
  selector: 'hg-profile-page',
  imports: [RouterLink, DatePipe, ButtonComponent, FilePickerComponent],
  providers: provideGamification(),
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePageComponent {
  readonly facade = inject(GamificationFacade);
  readonly auth = inject(AuthFacade);
  private meRepository = inject(ME_REPOSITORY);

  readonly uploading = signal(false);
  readonly avatarFiles = signal<File[]>([]);

  readonly avatarTitle = computed(() => this.uploading() ? 'Загружаем…' : 'Аватар');

  readonly levelLabel = computed(() => {
    const profile = this.facade.profile();
    return profile?.levelTitle || `Уровень ${profile?.level}`;
  });

  readonly xpTarget = computed(() => {
    const profile = this.facade.profile();
    return profile && profile.xpToNext !== null ? profile.totalXp + profile.xpToNext : null;
  });

  readonly defaultAchievementIcon = '🏅';

  constructor() {
    this.facade.load();
  }

  selectAvatar(files: File[]): void {
    if (files[0]) this.onAvatar(files[0]);
  }

  onAvatar(file: File): void {
    if (this.uploading()) return;
    this.uploading.set(true);
    this.meRepository.uploadAvatar(file).subscribe({
      next: ({avatarUrl}) => {
        const user = this.auth.user();
        if (user) this.auth.syncUser({...user, avatarUrl});
        this.facade.updateAvatar(avatarUrl);
        this.avatarFiles.set([]);
        this.uploading.set(false);
      },
      error: () => {
        this.avatarFiles.set([]);
        this.uploading.set(false);
      },
    });
  }
}
