import {GamificationFacade, provideGamification} from '@features/gamification/public-api';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '../../../application/facades/auth.facade';
import {ME_REPOSITORY} from '../../../application/me-repository.token';
import {HgButtonComponent, HgFilePickerComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-profile-page',
  imports: [RouterLink, DatePipe, HgButtonComponent, HgFilePickerComponent],
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

  constructor() {
    this.facade.load();
  }

  onAvatar(file: File): void {
    this.uploading.set(true);
    this.meRepository.uploadAvatar(file).subscribe({
      next: ({avatarUrl}) => {
        const user = this.auth.user();
        if (user) this.auth.syncUser({...user, avatarUrl});
        this.facade.updateAvatar(avatarUrl);
        this.uploading.set(false);
      },
      error: () => this.uploading.set(false),
    });
  }
}
