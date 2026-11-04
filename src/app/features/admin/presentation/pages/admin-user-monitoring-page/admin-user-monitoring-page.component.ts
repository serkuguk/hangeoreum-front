import {DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {distinctUntilChanged, map, Subscription} from 'rxjs';
import {ButtonComponent, ChartData, ChartOptionsInput, ChartsComponent, PaginationComponent} from 'springest';
import {Page} from '@shared/types/page';
import {
  AdminApi, MONITORING_PAGE_SIZE, MonitoringHistoryKind, MonitoringHistoryRows, MonitoringReviewAnswer,
  MonitoringSessionDetail, UserMonitoring,
} from '../../../infrastructure/admin.api';

// Admin-owned receipt display value; preserve the serialized API status.
const ReceiptStatus = {Completed: 'COMPLETED'} as const;

// Same button variants as the admin users page.
const ACTION_BUTTON = 'hg-button hg-button--danger hg-button--sm';
const TAB_BUTTON = 'hg-button hg-button--secondary hg-button--sm';

// ponytail: chart.js draws on canvas and can't read CSS vars; hex copies of $hg-* tokens.
const ChartColor = {done: '#1FC79B', rest: '#9A96AE', wrong: '#FF4D5E', border: '#211F2E', legend: '#9A96AE'} as const;

interface HistoryState {
  page: number;
  data: Page<MonitoringHistoryRows[MonitoringHistoryKind]> | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-admin-user-monitoring-page',
  standalone: true,
  imports: [ButtonComponent, ChartsComponent, DatePipe, PaginationComponent],
  template: `
    <header class="mon-head">
      <div>
        <h1 class="pagettl">Мониторинг обучения</h1>
        @if (summary(); as data) {
          <h2>{{ data.user.name }} — {{ data.user.email }}</h2>
          <p class="note">{{ data.user.isActive ? 'Активен' : 'Заблокирован' }} · {{ data.user.role }}</p>
          <p class="note">Последняя успешная загрузка: {{ lastSuccessfulAt() | date: dateTimeFormat }}</p>
        }
      </div>
      <app-button label="Обновить" [styleClass]="actionButton" [disabled]="loading()" (click)="refresh()" />
    </header>
    @if (loading()) { <p role="status">Загрузка…</p> }
    @if (error()) { <p class="errbar" role="alert">{{ error() }}</p> }
    @if (summary(); as data) {
      <section class="panel">
        <h2>Текущий курс</h2>
        <div class="cards">
          <div class="card">
            <p>Первый опубликованный курс: {{ data.course.title ?? 'Нет опубликованного курса' }}</p>
            <p>Завершено опубликованных уроков: {{ data.course.completed }} / {{ data.course.total }}</p>
            @if (data.course.percent !== null) { <p class="big">Прогресс: {{ data.course.percent }}%</p> }
            @else { <p>Нет опубликованных уроков</p> }
            @if (courseChart(); as chart) { <app-charts [data]="chart" [options]="chartOptions" /> }
          </div>
          <div class="card">
            <h3>Алфавит</h3>
            <p>Изучено: {{ data.alphabet.learned }} / {{ data.alphabet.total }}. Учитывается отдельно от курса.</p>
            @if (alphabetChart(); as chart) { <app-charts [data]="chart" [options]="chartOptions" /> }
          </div>
        </div>
        @for (unit of data.course.units; track unit.id) {
          <h3>{{ unit.title }} — {{ unit.completed ? 'Завершён' : 'Не завершён' }}</h3>
          <ul>@for (lesson of unit.lessons; track lesson.id) {
            <li>{{ lesson.title }} — {{ lesson.completed ? 'Завершён' : 'Не завершён' }}</li>
          }</ul>
        }
        <h2>Последний начатый урок</h2>
        @if (data.lastLessonSession; as session) {
          <p>{{ session.lessonTitle }} · {{ courseLocation(session.inCurrentCourseMap) }}</p>
          <p class="note">Начало: {{ session.startedAt | date: dateTimeFormat }} · Последнее полученное действие: {{ session.lastReceivedAt | date: dateTimeFormat }}</p>
          <p>{{ receiptLabel(session.receiptStatus, session.receiptSavedAt) }}</p>
          <app-button label="Результаты последнего занятия" [styleClass]="actionButton" [disabled]="loading() || lessonLoading()" (click)="openLesson(session.id)" />
        } @else { <p>Нет данных о начале урока</p> }
        <p class="note">Сохранённые сессии: {{ data.counts.sessions }} · Квитанции завершения: {{ data.counts.completions }} · Последние результаты уроков: {{ data.counts.progress }} · Повторения: {{ data.counts.reviews }}</p>
      </section>
      <section class="panel">
        <h2>Активность за последние 30 календарных дней</h2>
        <p class="note">Серверная дата: {{ data.activity.serverDate | date: dateFormat }} · Текущая серия: {{ data.activity.currentStreak }} · Максимальная серия: {{ data.activity.longestStreak }} · Последняя активность: {{ (data.activity.lastActiveDate | date: dateFormat) ?? 'Нет данных' }}</p>
        <table class="atable"><caption>Дневная активность</caption><thead><tr><th>Дата</th><th>XP</th><th>Завершения уроков</th><th>Повторения</th><th>Цель XP</th></tr></thead><tbody>
          @for (day of activityDays(); track day.date) { <tr><td>{{ day.date | date: dateFormat }}</td><td>{{ day.xpEarned }}</td><td>{{ day.lessonsCompleted }}</td><td>{{ day.reviewsDone }}</td><td>{{ day.goalXp ?? 'Нет данных' }}</td></tr> }
          @empty { <tr><td colspan="5">Нет сохранённой активности</td></tr> }
        </tbody></table>
        @if (data.activity.days.length > activityPageSize) {
          <app-pagination [rows]="activityPageSize" [first]="activityPage() * activityPageSize" [totalRecords]="data.activity.days.length" aria-label="Страницы активности" (pageChange)="activityPage.set($event.page ?? 0)" />
        }
      </section>
      <section class="panel">
        <h2>Трудные слова</h2><p class="note">Всего: {{ data.difficultWords.totalElements }}. Флаг трудности может быть установлен вручную и не является числом ошибок.</p>
        <ul>@for (word of data.difficultWords.content; track word.id) { <li>{{ word.hangul }} — {{ word.translation }} · EF {{ word.easeFactor }} · Повторений: {{ word.repetitions }} · Срок: {{ word.dueDate | date: dateFormat }} · {{ word.isDifficult ? 'Отмечено трудным' : 'Не отмечено трудным' }}</li> } @empty { <li>Нет трудных слов</li> }</ul>
        @if (data.difficultWords.hasMore) { <p class="note">Показаны первые {{ data.difficultWords.content.length }} слов. Полный список — в истории.</p> }
      </section>
      <section class="panel">
        <h2>Истории</h2>
        <p class="note">Страницы — живой срез; новые записи могут сдвигать строки. «Обновить» сбрасывает страницы в начало.</p>
        <div class="toolbar" aria-label="Виды истории">
          @for (tab of historyTabs; track tab.kind) { <app-button [label]="tab.label" [styleClass]="tabClass(tab.kind)" [disabled]="loading() || history()?.loading === true" (click)="loadHistory(tab.kind)" /> }
        </div>
        @if (history(); as state) {
          <h3>{{ historyTitle() }}</h3>
          @if (state.loading) { <p role="status">Загрузка истории…</p> }
          @if (state.error) { <p class="errbar" role="alert">{{ state.error }}</p><app-button label="Повторить загрузку истории" [styleClass]="actionButton" (click)="retryHistory()" /> }
          @if (state.data; as page) {
            <table class="atable"><caption>{{ historyTitle() }}</caption><thead><tr><th>Занятие / слово</th><th>Сохранённые данные</th><th>Подробности</th></tr></thead><tbody>
              @for (row of sessionRows(); track row.id) { <tr><td>{{ row.lessonTitle }}<p>{{ courseLocation(row.inCurrentCourseMap) }}</p></td><td>Начало: {{ row.startedAt | date: dateTimeFormat }} · Последнее действие: {{ row.lastReceivedAt | date: dateTimeFormat }}<p>Запланировано: {{ row.plannedExercises }} · Сохранено ответов: {{ row.savedAnswers }} · Повторных предъявлений: {{ row.repeatedExercises }}</p>{{ receiptLabel(row.receiptStatus, row.receiptSavedAt) }}</td><td><app-button label="Результаты" [styleClass]="actionButton" [disabled]="lessonLoading() || loading()" (click)="openLesson(row.id)" /></td></tr> }
              @for (row of completionRows(); track row.id) { <tr><td>{{ row.lessonTitle ?? row.lessonId }}<p>{{ courseLocation(row.inCurrentCourseMap) }}</p></td><td>Score: {{ row.score }} · Accuracy: {{ row.accuracy }}<p>{{ receiptLabel(row.status, row.savedAt) }}</p>Создано: {{ row.createdAt | date: dateTimeFormat }} · Сохранено: {{ (row.savedAt | date: dateTimeFormat) ?? 'Нет данных' }}</td><td>Источник: {{ row.source }} · Квитанция: {{ row.id }}<p>Результат, сообщённый клиентом</p></td></tr> }
              @for (row of progressRows(); track row.lessonId) { <tr><td>{{ row.lessonTitle ?? row.lessonId }}<p>{{ courseLocation(row.inCurrentCourseMap) }}</p></td><td>{{ progressLabel(row.status) }} · Score: {{ row.score ?? 'Нет данных' }} · Accuracy: {{ row.accuracy ?? 'Нет данных' }}<p>Сохранённый счётчик попыток: {{ row.attempts }} · Завершено: {{ (row.completedAt | date: dateTimeFormat) ?? 'Нет данных' }} · Обновлено: {{ row.updatedAt | date: dateTimeFormat }}</p></td><td>Источник: {{ row.source }}<p>Результат, сообщённый клиентом</p></td></tr> }
              @for (row of reviewRows(); track row.id) { <tr><td>Повторение: {{ row.mode }}</td><td>Начало: {{ row.startedAt | date: dateTimeFormat }} · {{ row.finishedAt ? 'Завершено: ' + (row.finishedAt | date: dateTimeFormat) : 'Повторение не завершено' }}<p>Выдано: {{ row.issuedCount }} · Отвечено: {{ row.answeredCount }} · Верных: {{ row.correctCount }} / {{ row.answeredCount }}</p>Сохранённый итог: {{ row.correct }} / {{ row.total }} · XP: {{ row.xpEarned }} · Серия: {{ row.streakAfter ?? 'Нет данных' }}</td><td><app-button label="Ответы" [styleClass]="actionButton" [disabled]="reviewLoading() || loading()" (click)="openReview(row.id)" /></td></tr> }
              @for (word of wordRows(); track word.id) { <tr><td>{{ word.hangul }} — {{ word.translation }}</td><td>EF: {{ word.easeFactor }} · Повторений: {{ word.repetitions }} · Срок: {{ word.dueDate | date: dateFormat }}</td><td>{{ word.isDifficult ? 'Отмечено трудным' : 'Не отмечено трудным' }}</td></tr> }
              @if (!page.content.length) { <tr><td colspan="3">Нет сохранённых записей</td></tr> }
            </tbody></table>
            <app-pagination [rows]="pageSize" [first]="state.page * pageSize" [totalRecords]="page.totalElements" aria-label="Страницы истории" (pageChange)="changeHistoryPage($event.page ?? 0)" />
          }
        }
        <p class="note">Последний сохранённый результат по урокам — состояние LessonProgress, а не отдельные прохождения. Счётчики попыток не суммируются с квитанциями завершения.</p>
      </section>
      <section class="panel">
        <h2>Полнота данных</h2>
        <p>Начало сбора: {{ (data.firstTrackedAt | date: dateTimeFormat) ?? 'Нет сохранённого старта' }}</p>
        @if (!data.firstTrackedAt) { <p>Подробные результаты упражнений ранее не собирались</p> }
        <p class="note">Показаны сохранённые ответы; полнота не гарантируется. Отсутствие ошибок не означает отсутствие трудностей.</p><p class="note">{{ data.coverage }}</p>
      </section>
    }
    @if (lessonLoading()) { <p role="status">Загрузка результатов занятия…</p> }
    @if (lessonError()) { <p class="errbar" role="alert">{{ lessonError() }}</p><app-button label="Повторить загрузку результатов" [styleClass]="actionButton" (click)="retryLesson()" /> }
    @if (lessonDetail(); as detail) {
      <section class="panel"><h2>Результаты занятия: {{ detail.session.lessonTitle }}</h2>
        <p class="note">Сессия: {{ detail.session.id }} · {{ receiptLabel(detail.session.receiptStatus, detail.session.receiptSavedAt) }}</p>
        <p class="note">Результат, сообщённый клиентом. Показаны сохранённые ответы; полнота не гарантируется.</p>
        <div class="cards">
          <div class="card">
            <p>Неверных: {{ detail.observedIncorrectCount }} / {{ detail.session.savedAnswers }} · Доля неверных: {{ detail.observedIncorrectRatio ?? 'Нет данных' }}</p>
            <p>Верных: {{ savedCorrectCount() }} / {{ detail.session.savedAnswers }} · Доля верных: {{ savedCorrectRatio() ?? 'Нет данных' }}</p>
            @if (lessonChart(); as chart) { <app-charts [data]="chart" [options]="chartOptions" /> }
          </div>
        </div>
        <h3>Состав упражнений</h3><ol>@for (exercise of detail.exercises; track exercise.exerciseId) { <li>{{ exercise.position }} · {{ exercise.exerciseId }} · {{ exercise.kind }} · {{ exercise.context }}</li> }</ol>
        <h3>Нет сохранённого правильного результата</h3><p class="note">Это не доказывает, что упражнение не решено.</p><ul>@for (id of detail.exercisesWithoutSavedCorrect; track id) { <li>{{ id }}</li> } @empty { <li>Не обнаружено</li> }</ul>
        <h3>Пропуски последовательности</h3><ul>@for (gap of detail.sequenceGaps; track gap.firstSequence) { <li>{{ gap.firstSequence }}–{{ gap.lastSequence }}</li> } @empty { <li>Не обнаружены</li> }</ul>
        <table class="atable"><caption>Сохранённые результаты упражнений</caption><thead><tr><th>Предъявление / упражнение</th><th>Результат</th><th>Время / источник</th></tr></thead><tbody>
        @for (result of detail.results.content; track result.id) { <tr><td>{{ result.sequence }} · {{ result.exerciseId }} · {{ result.kind }}<p>{{ result.context }}</p></td><td>{{ result.correct ? 'Верно' : 'Неверно' }}<p>Ожидаемый ответ: {{ result.expected ?? 'Не сохранён' }} · Ошибки пар: {{ result.mistakes ?? 'Не собирались' }}</p></td><td>{{ result.receivedAt | date: dateTimeFormat }} · {{ result.source }}</td></tr> } @empty { <tr><td colspan="3">Нет сохранённых результатов</td></tr> }
        </tbody></table><p class="note">{{ detail.coverage }}</p>
        <app-pagination [rows]="pageSize" [first]="lessonPage() * pageSize" [totalRecords]="detail.results.totalElements" aria-label="Страницы результатов занятия" (pageChange)="changeLessonPage($event.page ?? 0)" />
      </section>
    }
    @if (reviewLoading()) { <p role="status">Загрузка ответов повторения…</p> }
    @if (reviewError()) { <p class="errbar" role="alert">{{ reviewError() }}</p><app-button label="Повторить загрузку ответов" [styleClass]="actionButton" (click)="retryReview()" /> }
    @if (reviewAnswers(); as answers) {
      <section class="panel"><h2>Ответы повторения</h2><p class="note">SRS quality ≥ 3 — оценка повторения, не серверная проверка текста.</p>
      <table class="atable"><caption>Сохранённые ответы повторения</caption><thead><tr><th>Слово</th><th>Оценка</th><th>Время / источник</th></tr></thead><tbody>
      @for (answer of answers.content; track answer.id) { <tr><td>{{ answer.hangul }} — {{ answer.translation }}</td><td>{{ answer.quality }} · {{ answer.isCorrect ? 'Верно' : 'Неверно' }}</td><td>{{ answer.answeredAt | date: dateTimeFormat }} · {{ answer.source }}</td></tr> } @empty { <tr><td colspan="3">Нет сохранённых ответов</td></tr> }
      </tbody></table><app-pagination [rows]="pageSize" [first]="reviewPage() * pageSize" [totalRecords]="answers.totalElements" aria-label="Страницы ответов повторения" (pageChange)="changeReviewPage($event.page ?? 0)" /></section>
    }
  `,
  styleUrl: '../_admin.scss',
  styles: `
    .mon-head {
      display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem;
      flex-wrap: wrap; margin-bottom: 1.5rem;
      h2 { margin: .5rem 0 .25rem; }
    }
    :host .panel { overflow-x: auto; margin-block: 1.25rem; padding: 1.25rem 1.5rem; }
    section > * + * { margin-top: .75rem; }
    h2 { margin: 0; font-size: 1.15rem; }
    h3 { margin: 1.25rem 0 .5rem; font-size: 1rem; }
    p { margin: .4rem 0; line-height: 1.5; }
    .note { color: var(--hg-muted); font-size: 13px; }
    .big { font-size: 1.25rem; font-weight: 700; }
    ul, ol { margin: .5rem 0; padding-left: 1.25rem; }
    li + li { margin-top: .35rem; }
    app-button { display: inline-block; margin-top: .5rem; }
    .toolbar { margin-top: 1rem; app-button { margin-top: 0; } }
    .atable { margin-top: 1rem; caption { text-align: left; color: var(--hg-muted); font-size: 12px; padding-bottom: .5rem; } }
    .atable td p { margin: .25rem 0 0; color: var(--hg-muted); font-size: 12.5px; }
    .atable td app-button { margin-top: 0; }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 1rem; margin-top: 1rem; }
    .card { background: var(--hg-card-2); border-radius: 16px; padding: 1rem 1.25rem; h3 { margin-top: 0; } }
    app-charts { display: block; max-width: 14rem; margin: 1rem auto 0; }
    app-pagination { display: block; margin-top: 1rem; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserMonitoringPageComponent {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly actionButton = ACTION_BUTTON;
  readonly dateFormat = 'dd-MM-yyyy';
  readonly dateTimeFormat = 'dd-MM-yyyy HH:mm';
  readonly chartOptions: ChartOptionsInput = {
    maintainAspectRatio: true,
    plugins: {legend: {labels: {color: ChartColor.legend}}},
  };
  readonly userId = signal<string | null>(null);
  readonly summary = signal<UserMonitoring | null>(null);
  readonly lastSuccessfulAt = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly historyKinds = MonitoringHistoryKind;
  readonly activeHistory = signal<MonitoringHistoryKind | null>(null);
  readonly histories = signal<Partial<Record<MonitoringHistoryKind, HistoryState>>>({});
  readonly history = computed(() => {
    const kind = this.activeHistory();
    return kind ? this.histories()[kind] ?? null : null;
  });
  readonly lessonSessionId = signal<string | null>(null);
  readonly lessonPage = signal(0);
  readonly lessonDetail = signal<MonitoringSessionDetail | null>(null);
  readonly lessonLoading = signal(false);
  readonly lessonError = signal<string | null>(null);
  readonly reviewSessionId = signal<string | null>(null);
  readonly reviewPage = signal(0);
  readonly reviewAnswers = signal<Page<MonitoringReviewAnswer> | null>(null);
  readonly reviewLoading = signal(false);
  readonly reviewError = signal<string | null>(null);
  readonly pageSize = MONITORING_PAGE_SIZE;
  readonly historyTabs = [
    {kind: MonitoringHistoryKind.Sessions, label: 'Учебные сессии'},
    {kind: MonitoringHistoryKind.Completions, label: 'Квитанции завершения'},
    {kind: MonitoringHistoryKind.Progress, label: 'Последний сохранённый результат по урокам'},
    {kind: MonitoringHistoryKind.Reviews, label: 'Повторения'},
    {kind: MonitoringHistoryKind.DifficultWords, label: 'Все трудные слова'},
  ];
  readonly historyTitle = computed(() => this.historyTabs.find(tab => tab.kind === this.activeHistory())?.label ?? 'История');
  readonly sessionRows = computed(() => this.rows(MonitoringHistoryKind.Sessions));
  readonly completionRows = computed(() => this.rows(MonitoringHistoryKind.Completions));
  readonly progressRows = computed(() => this.rows(MonitoringHistoryKind.Progress));
  readonly reviewRows = computed(() => this.rows(MonitoringHistoryKind.Reviews));
  readonly wordRows = computed(() => this.rows(MonitoringHistoryKind.DifficultWords));
  readonly savedCorrectCount = computed(() => {
    const detail = this.lessonDetail();
    return detail ? detail.session.savedAnswers - detail.observedIncorrectCount : 0;
  });
  readonly savedCorrectRatio = computed(() => {
    const count = this.lessonDetail()?.session.savedAnswers ?? 0;
    return count ? this.savedCorrectCount() / count : null;
  });
  readonly activityPageSize = 10;
  readonly activityPage = signal(0);
  readonly activityDays = computed(() => {
    const start = this.activityPage() * this.activityPageSize;
    return this.summary()?.activity.days.slice(start, start + this.activityPageSize) ?? [];
  });
  readonly courseChart = computed(() => {
    const course = this.summary()?.course;
    return course?.total ? this.pie(['Завершено', 'Осталось'], [course.completed, course.total - course.completed], ChartColor.done) : null;
  });
  readonly alphabetChart = computed(() => {
    const alphabet = this.summary()?.alphabet;
    return alphabet?.total ? this.pie(['Изучено', 'Осталось'], [alphabet.learned, alphabet.total - alphabet.learned], ChartColor.done) : null;
  });
  readonly lessonChart = computed(() => {
    const detail = this.lessonDetail();
    return detail?.session.savedAnswers
      ? this.pie(['Верно', 'Неверно'], [this.savedCorrectCount(), detail.observedIncorrectCount], ChartColor.done, ChartColor.wrong)
      : null;
  });

  private pie(labels: string[], data: number[], first: string, second: string = ChartColor.rest): ChartData {
    return {
      labels,
      datasets: [{label: '', data, backgroundColor: [first, second], borderColor: [ChartColor.border, ChartColor.border], borderWidth: 2}],
    };
  }

  tabClass(kind: MonitoringHistoryKind): string {
    return this.activeHistory() === kind ? ACTION_BUTTON : TAB_BUTTON;
  }

  private rows<K extends MonitoringHistoryKind>(kind: K): MonitoringHistoryRows[K][] {
    return this.activeHistory() === kind
      ? (this.history()?.data?.content ?? []) as MonitoringHistoryRows[K][] : [];
  }

  receiptLabel(status: string | null, savedAt: string | null): string {
    if (status === ReceiptStatus.Completed) return 'Завершён';
    return savedAt ? 'Результат сохранён, обработка завершения ожидается' : 'Завершение не зарегистрировано';
  }

  progressLabel(status: string): string {
    return status === ReceiptStatus.Completed ? 'Завершён' : 'Не завершён';
  }

  courseLocation(inMap: boolean): string { return inMap ? 'В текущей карте курса' : 'Вне текущей карты курса'; }
  retryHistory(): void { const kind = this.activeHistory(); if (kind) this.loadHistory(kind, this.history()?.page ?? 0); }
  changeHistoryPage(page: number): void { const kind = this.activeHistory(); if (kind) this.loadHistory(kind, page); }
  retryLesson(): void { this.changeLessonPage(this.lessonPage()); }
  changeLessonPage(page: number): void { const id = this.lessonSessionId(); if (id) this.openLesson(id, page); }
  retryReview(): void { this.changeReviewPage(this.reviewPage()); }
  changeReviewPage(page: number): void { const id = this.reviewSessionId(); if (id) this.openReview(id, page); }

  private summaryRequest?: Subscription;
  private historyRequest?: Subscription;
  private lessonRequest?: Subscription;
  private reviewRequest?: Subscription;

  constructor() {
    inject(ActivatedRoute).paramMap.pipe(
      map(params => params.get('id')), distinctUntilChanged(), takeUntilDestroyed(),
    ).subscribe(id => {
      this.cancelRequests();
      this.userId.set(id);
      this.summary.set(null);
      this.lastSuccessfulAt.set(null);
      this.refresh();
    });
    this.destroyRef.onDestroy(() => this.cancelRequests());
  }

  refresh(): void {
    this.cancelRequests();
    this.resetDetails();
    this.activeHistory.set(null);
    this.histories.set({});
    this.activityPage.set(0);
    this.error.set(null);
    const id = this.userId();
    if (!id) {
      this.loading.set(false);
      this.error.set('Неверный ID или параметры запроса');
      return;
    }
    this.loading.set(true);
    this.summaryRequest = this.api.monitoring(id).subscribe({
      next: data => {
        this.summary.set(data);
        this.lastSuccessfulAt.set(data.generatedAt);
        this.loading.set(false);
      },
      error: error => {
        this.loading.set(false);
        this.error.set(this.failure(error));
      },
    });
  }

  loadHistory(kind: MonitoringHistoryKind, page = 0): void {
    const id = this.userId();
    if (!id || !this.summary() || this.loading()) return;
    this.historyRequest?.unsubscribe();
    const previousKind = this.activeHistory();
    if (previousKind) this.histories.update(states => {
      const previous = states[previousKind];
      return previous ? {...states, [previousKind]: {...previous, loading: false}} : states;
    });
    this.resetDetails();
    this.activeHistory.set(kind);
    this.histories.update(states => ({...states, [kind]: {page, data: null, loading: true, error: null}}));
    this.historyRequest = this.api.monitoringHistory(id, kind, page).subscribe({
      next: data => this.histories.update(states => ({...states, [kind]: {page, data, loading: false, error: null}})),
      error: error => {
        const message = this.failure(error);
        if (this.summary()) this.histories.update(states => ({...states, [kind]: {page, data: null, loading: false, error: message}}));
      },
    });
  }

  openLesson(sessionId: string, page = 0): void {
    const id = this.userId();
    if (!id || !this.summary() || this.loading()) return;
    this.lessonRequest?.unsubscribe();
    this.lessonSessionId.set(sessionId);
    this.lessonPage.set(page);
    this.lessonDetail.set(null);
    this.lessonError.set(null);
    this.lessonLoading.set(true);
    this.lessonRequest = this.api.monitoringSession(id, sessionId, page).subscribe({
      next: data => { this.lessonDetail.set(data); this.lessonLoading.set(false); },
      error: error => { this.lessonLoading.set(false); this.lessonError.set(this.failure(error)); },
    });
  }

  openReview(sessionId: string, page = 0): void {
    const id = this.userId();
    if (!id || !this.summary() || this.loading()) return;
    this.reviewRequest?.unsubscribe();
    this.reviewSessionId.set(sessionId);
    this.reviewPage.set(page);
    this.reviewAnswers.set(null);
    this.reviewError.set(null);
    this.reviewLoading.set(true);
    this.reviewRequest = this.api.monitoringReviewAnswers(id, sessionId, page).subscribe({
      next: data => { this.reviewAnswers.set(data); this.reviewLoading.set(false); },
      error: error => { this.reviewLoading.set(false); this.reviewError.set(this.failure(error)); },
    });
  }

  private resetDetails(): void {
    this.lessonRequest?.unsubscribe();
    this.reviewRequest?.unsubscribe();
    this.lessonSessionId.set(null); this.lessonPage.set(0); this.lessonDetail.set(null);
    this.lessonLoading.set(false); this.lessonError.set(null);
    this.reviewSessionId.set(null); this.reviewPage.set(0); this.reviewAnswers.set(null);
    this.reviewLoading.set(false); this.reviewError.set(null);
  }

  private cancelRequests(): void {
    this.summaryRequest?.unsubscribe(); this.historyRequest?.unsubscribe();
    this.lessonRequest?.unsubscribe(); this.reviewRequest?.unsubscribe();
  }

  private failure(error: HttpErrorResponse): string {
    if (error.status === 404 || error.status === 403 || error.status === 401) {
      this.cancelRequests();
      this.summary.set(null); this.lastSuccessfulAt.set(null); this.histories.set({});
      this.activeHistory.set(null); this.loading.set(false); this.resetDetails();
    }
    const message = error.status === 400 ? 'Неверный ID или параметры запроса'
      : error.status === 401 ? 'Необходима авторизация'
      : error.status === 403 ? 'Нет доступа'
      : error.status === 404 ? 'Пользователь не найден'
      : 'Не удалось загрузить данные. Повторите запрос';
    if (!this.summary()) this.error.set(message);
    return message;
  }
}
