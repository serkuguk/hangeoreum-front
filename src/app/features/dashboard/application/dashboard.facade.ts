import {Injectable, inject, signal} from '@angular/core';
import {DASHBOARD_REPOSITORY, Dashboard} from '../domain/dashboard.model';

@Injectable()
export class DashboardFacade {
  private repository = inject(DASHBOARD_REPOSITORY);

  readonly data = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.load().subscribe({
      next: dashboard => {
        this.data.set(dashboard);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить дашборд. Проверь соединение и попробуй ещё раз.');
        this.loading.set(false);
      },
    });
  }
}
