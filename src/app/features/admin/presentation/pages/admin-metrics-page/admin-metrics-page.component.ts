import {PercentPipe} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminMetrics} from '@features/admin/infrastructure/admin.api';

@Component({
  selector: 'hg-admin-metrics-page',
  imports: [TranslatePipe, PercentPipe],
  templateUrl: './admin-metrics-page.component.html',
  styleUrls: ['../_admin.scss', './admin-metrics-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMetricsPageComponent {
  private api = inject(AdminApi);

  readonly metrics = signal<AdminMetrics | null>(null);
  readonly error = signal(false);

  constructor() {
    this.api.metrics().subscribe({
      next: metrics => this.metrics.set(metrics),
      error: () => this.error.set(true),
    });
  }
}
