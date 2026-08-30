import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {HgAudioButtonComponent, HgProgressRingComponent, MascotComponent} from '@shared/components/hg';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {CoursePathComponent} from '@features/learning/presentation/components/course-path/course-path.component';
import {toCoursePath} from '@features/learning/presentation/components/course-path/course-path.mapper';
import {DashboardFacade} from '../../../application/dashboard.facade';
import {DASHBOARD_REPOSITORY} from '../../../application/dashboard-repository.token';
import {DashboardHttpRepository} from '../../../infrastructure/dashboard.http-repository';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

const WEEKDAY_KEYS = ['dashboard.weekdays.mon', 'dashboard.weekdays.tue', 'dashboard.weekdays.wed', 'dashboard.weekdays.thu', 'dashboard.weekdays.fri', 'dashboard.weekdays.sat', 'dashboard.weekdays.sun'];

/** Сколько узлов курса показываем на дашборде — дальше пользователь идёт на карту курса. */
const PATH_WINDOW = 6;

@Component({
  selector: 'hg-dashboard-page',
  imports: [
    RouterLink,
    HgAudioButtonComponent,
    HgProgressRingComponent,
    HgButtonComponent,
    MascotComponent,
    CoursePathComponent,
    TranslatePipe,
  ],
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
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly today = new Intl.DateTimeFormat('ru-RU', {weekday: 'long', day: 'numeric', month: 'long'})
    .format(new Date());

  readonly goalPercent = computed(() => {
    const goal = this.facade.data()?.goal;
    if (!goal || goal.goalXp === 0) return 0;
    return Math.min(100, Math.round(goal.earnedXp / goal.goalXp * 100));
  });

  readonly xpLeft = computed(() => {
    const goal = this.facade.data()?.goal;
    return goal ? Math.max(goal.goalXp - goal.earnedXp, 0) : 0;
  });

  readonly path = computed(() => toCoursePath(
    this.facade.courseMap() as Parameters<typeof toCoursePath>[0], PATH_WINDOW));

  /** Узел, на который ведёт главный CTA героя. */
  readonly currentNode = computed(() => this.path().nodes.find(node => node.state === 'current'));

  private readonly lessons = computed(() =>
    new Map((this.facade.courseMap()?.units ?? []).flatMap(unit => unit.lessons).map(l => [l.id, l])));

  /** Бары графика XP: высота в % от максимума недели, подписи Пн–Вс от сегодняшнего дня. */
  readonly weekBars = computed(() => {
    const week = this.facade.data()?.weekXp ?? [];
    const max = Math.max(1, ...week);
    const todayIdx = (new Date().getDay() + 6) % 7; // 0 = Пн
    return week.map((xp, i) => ({
      xp,
      height: Math.max(4, Math.round(xp / max * 100)),
      label: this.translate.instant(WEEKDAY_KEYS[(todayIdx - (week.length - 1 - i) + 14) % 7]),
      isToday: i === week.length - 1,
    }));
  });

  constructor() {
    this.facade.load();
    this.facade.loadCourseMap();
  }

  openLesson(node: {id: string}): void {
    const lesson = this.lessons().get(node.id);
    if (!lesson || lesson.status === 'LOCKED') return;
    if (!lesson.hasAccess) {
      void this.router.navigate(['/billing']);
      return;
    }
    void this.router.navigate(lesson.type === 'STORY'
      ? ['/learn', lesson.id, 'story']
      : lesson.status === 'COMPLETED' ? ['/learn', lesson.id] : ['/learn', lesson.id, 'tip']);
  }

  retry(): void {
    this.facade.load();
    this.facade.loadCourseMap(true);
  }
}
