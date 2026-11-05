import {DatePipe} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
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

const I18N = 'admin.monitoring';

const ERROR_KEYS: Record<number, string> = {
  400: `${I18N}.errors.badRequest`,
  401: `${I18N}.errors.unauthorized`,
  403: `${I18N}.errors.forbidden`,
  404: `${I18N}.errors.notFound`,
};

// Responses that mean the target user is gone or not ours to see: drop everything loaded.
const RESET_STATUSES = new Set([401, 403, 404]);

interface HistoryState {
  page: number;
  data: Page<MonitoringHistoryRows[MonitoringHistoryKind]> | null;
  loading: boolean;
  error: string | null;
}

@Component({
  selector: 'app-admin-user-monitoring-page',
  standalone: true,
  imports: [ButtonComponent, ChartsComponent, DatePipe, PaginationComponent, TranslatePipe],
  templateUrl: './admin-user-monitoring-page.component.html',
  styleUrls: ['../_admin.scss', './admin-user-monitoring-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserMonitoringPageComponent {
  private readonly api = inject(AdminApi);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
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
  readonly activeHistory = signal<MonitoringHistoryKind | null>(null);
  readonly histories = signal<Partial<Record<MonitoringHistoryKind, HistoryState>>>({});
  readonly history = computed(() => {
    const kind = this.activeHistory();
    return kind ? this.histories()[kind] ?? null : null;
  });
  readonly historyLoading = computed(() => this.history()?.loading === true);
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
    {kind: MonitoringHistoryKind.Sessions, label: `${I18N}.tabs.sessions`},
    {kind: MonitoringHistoryKind.Completions, label: `${I18N}.tabs.completions`},
    {kind: MonitoringHistoryKind.Progress, label: `${I18N}.tabs.progress`},
    {kind: MonitoringHistoryKind.Reviews, label: `${I18N}.tabs.reviews`},
    {kind: MonitoringHistoryKind.DifficultWords, label: `${I18N}.tabs.difficultWords`},
  ];
  readonly historyTitle = computed(() =>
    this.historyTabs.find(tab => tab.kind === this.activeHistory())?.label ?? `${I18N}.history.fallbackTitle`);
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
  readonly hasActivityPages = computed(() => (this.summary()?.activity.days.length ?? 0) > this.activityPageSize);
  readonly activityDays = computed(() => {
    const start = this.activityPage() * this.activityPageSize;
    return this.summary()?.activity.days.slice(start, start + this.activityPageSize) ?? [];
  });
  readonly courseChart = computed(() => {
    const course = this.summary()?.course;
    return course?.total ? this.pie([this.t('chart.completed'), this.t('chart.remaining')], [course.completed, course.total - course.completed], ChartColor.done) : null;
  });
  readonly alphabetChart = computed(() => {
    const alphabet = this.summary()?.alphabet;
    return alphabet?.total ? this.pie([this.t('chart.learned'), this.t('chart.remaining')], [alphabet.learned, alphabet.total - alphabet.learned], ChartColor.done) : null;
  });
  readonly lessonChart = computed(() => {
    const detail = this.lessonDetail();
    return detail?.session.savedAnswers
      ? this.pie([this.t('correct'), this.t('incorrect')], [this.savedCorrectCount(), detail.observedIncorrectCount], ChartColor.done, ChartColor.wrong)
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

  receiptKey(status: string | null, savedAt: string | null): string {
    if (status === ReceiptStatus.Completed) return `${I18N}.completed`;
    return savedAt ? `${I18N}.receipt.pending` : `${I18N}.receipt.notRegistered`;
  }

  progressKey(status: string): string { return this.completionKey(status === ReceiptStatus.Completed); }
  completionKey(completed: boolean): string { return completed ? `${I18N}.completed` : `${I18N}.notCompleted`; }
  courseLocationKey(inMap: boolean): string { return inMap ? `${I18N}.courseLocation.inMap` : `${I18N}.courseLocation.outOfMap`; }
  difficultKey(isDifficult: boolean): string { return isDifficult ? `${I18N}.markedDifficult` : `${I18N}.notMarkedDifficult`; }
  correctnessKey(correct: boolean): string { return correct ? `${I18N}.correct` : `${I18N}.incorrect`; }

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
      this.error.set(this.t('errors.badRequest'));
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
    if (RESET_STATUSES.has(error.status)) {
      this.cancelRequests();
      this.summary.set(null); this.lastSuccessfulAt.set(null); this.histories.set({});
      this.activeHistory.set(null); this.loading.set(false); this.resetDetails();
    }
    const message = this.translate.instant(ERROR_KEYS[error.status] ?? `${I18N}.errors.generic`);
    if (!this.summary()) this.error.set(message);
    return message;
  }

  private t(key: string): string {
    return this.translate.instant(`${I18N}.${key}`);
  }
}
