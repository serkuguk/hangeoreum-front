import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {AdminApi, AdminMetrics} from '../../infrastructure/admin.api';

@Component({
  selector: 'hg-admin-metrics-page',
  template: `
    <h2 class="pagettl">Админ · Дашборд</h2>
    <p class="pagesub">Ключевые метрики продукта.</p>
    @if (error()) {
      <div class="errbar">Не получилось загрузить метрики.</div>
    } @else if (metrics(); as m) {
      <div class="grid">
        <div class="panel stat"><b>{{ m.totalUsers }}</b><span>пользователей</span></div>
        <div class="panel stat"><b class="j">{{ m.dau }}</b><span>DAU</span></div>
        <div class="panel stat"><b class="bl">{{ m.lessonsCompletedToday }}</b><span>уроков сегодня</span></div>
        <div class="panel stat"><b class="y">{{ m.activeSubscriptions }}</b><span>активных Pro</span></div>
        <div class="panel stat"><b class="r">{{ (m.conversion * 100).toFixed(1) }}%</b><span>конверсия в Pro</span></div>
      </div>
    } @else {
      <div class="empty">Загружаем…</div>
    }
  `,
  styleUrl: './_admin.scss',
  styles: `
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 14px; }

    .stat {
      text-align: center;
      padding: 26px 14px;

      b { font-size: 30px; font-weight: 700; display: block; }
      span { font-size: 12px; color: var(--hg-muted); }
    }

    .j { color: var(--hg-jade); }
    .y { color: var(--hg-yellow); }
    .r { color: var(--hg-red); }
    .bl { color: var(--hg-blue); }
  `,
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
