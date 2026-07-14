import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AuthFacade} from '@features/identity/application/facades/auth.facade';
import {HgAudioButtonComponent, HgProgressRingComponent} from '@shared/components/hg';
import {DashboardFacade} from '../../../application/dashboard.facade';
import {DASHBOARD_REPOSITORY} from '../../../domain/dashboard.model';
import {DashboardHttpRepository} from '../../../infrastructure/dashboard.http-repository';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

@Component({
  selector: 'hg-dashboard-page',
  imports: [RouterLink, HgAudioButtonComponent, HgProgressRingComponent],
  providers: [
    {provide: DASHBOARD_REPOSITORY, useClass: DashboardHttpRepository},
    DashboardFacade,
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPageComponent {
  readonly facade = inject(DashboardFacade);
  readonly auth = inject(AuthFacade);

  readonly today = new Intl.DateTimeFormat('ru-RU', {weekday: 'long', day: 'numeric', month: 'long'})
    .format(new Date());

  readonly goalPercent = computed(() => {
    const goal = this.facade.data()?.goal;
    if (!goal || goal.goalXp === 0) return 0;
    return Math.min(100, Math.round(goal.earnedXp / goal.goalXp * 100));
  });

  /** Бары графика XP: высота в % от максимума недели, подписи Пн–Вс от сегодняшнего дня. */
  readonly weekBars = computed(() => {
    const week = this.facade.data()?.weekXp ?? [];
    const max = Math.max(1, ...week);
    const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Пн
    return week.map((xp, i) => ({
      xp,
      height: Math.max(4, Math.round(xp / max * 100)),
      label: WEEKDAYS[(todayIdx - (week.length - 1 - i) + 14) % 7],
      isToday: i === week.length - 1,
    }));
  });

  constructor() {
    this.facade.load();
  }
}
