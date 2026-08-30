import {Injectable, inject, signal} from '@angular/core';
import {AuthService} from '@core/auth/auth.service';
import {Dashboard, DashboardCourseMap} from '../domain/dashboard.model';
import {DASHBOARD_REPOSITORY} from './dashboard-repository.token';
import {TranslateService} from '@ngx-translate/core';

@Injectable()
export class DashboardFacade {
  private readonly repository = inject(DASHBOARD_REPOSITORY);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly courseMap = signal<DashboardCourseMap | null>(null);
  readonly courseLoading = signal(false);
  readonly courseError = signal<string | null>(null);
  readonly user = this.authService.currentUser;

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.load().subscribe({
      next: dashboard => {
        this.data.set(dashboard);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('dashboard.errors.load'));
        this.loading.set(false);
      },
    });
  }

  loadCourseMap(force = false): void {
    if (this.courseMap() && !force) return;
    this.courseLoading.set(true);
    this.courseError.set(null);
    this.repository.courseMap().subscribe({
      next: map => {
        this.courseMap.set(map);
        this.courseLoading.set(false);
      },
      error: () => {
        this.courseError.set(this.translate.instant('dashboard.errors.courseMap'));
        this.courseLoading.set(false);
      },
    });
  }
}
