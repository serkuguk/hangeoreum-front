import {HttpErrorResponse} from '@angular/common/http';
import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap} from '@angular/router';
import {jest} from '@jest/globals';
import {BehaviorSubject, Subject} from 'rxjs';
import {AdminApi, MonitoringHistoryKind, MonitoringSessionDetail, UserMonitoring} from '../../../infrastructure/admin.api';
import {AdminUserMonitoringPageComponent} from './admin-user-monitoring-page.component';

const summary: UserMonitoring = {
  user: {id: 'u', name: 'Ученик', email: 'u@test.com', avatarUrl: null, role: 'USER',
    isActive: false, startLevel: 'BEGINNER', createdAt: '2026-01-01T00:00:00Z'},
  generatedAt: '2026-11-04T12:00:00Z',
  course: {id: null, title: null, units: [], completed: 0, total: 0, percent: null},
  alphabet: {learned: 0, total: 0}, lastLessonSession: null,
  counts: {sessions: 0, completions: 0, progress: 0, reviews: 0, difficultWords: 0},
  difficultWords: {content: [], totalElements: 0, hasMore: false},
  activity: {serverDate: '2026-11-04', days: [], currentStreak: 0, longestStreak: 0, lastActiveDate: null},
  firstTrackedAt: null, coverage: 'Partial',
};
const emptyPage = {content: [], totalElements: 0, page: 0};

describe('AdminUserMonitoringPageComponent read state', () => {
  let component: AdminUserMonitoringPageComponent;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let api: {monitoring: jest.Mock; monitoringHistory: jest.Mock; monitoringSession: jest.Mock; monitoringReviewAnswers: jest.Mock};
  let summaries: Subject<UserMonitoring>[];
  let histories: Subject<typeof emptyPage>[];
  let lessons: Subject<MonitoringSessionDetail>[];
  let reviews: Subject<typeof emptyPage>[];

  beforeEach(() => {
    summaries = []; histories = []; lessons = []; reviews = [];
    api = {
      monitoring: jest.fn().mockImplementation(() => { const s = new Subject<UserMonitoring>(); summaries.push(s); return s; }),
      monitoringHistory: jest.fn().mockImplementation(() => { const s = new Subject<typeof emptyPage>(); histories.push(s); return s; }),
      monitoringSession: jest.fn().mockImplementation(() => { const s = new Subject<MonitoringSessionDetail>(); lessons.push(s); return s; }),
      monitoringReviewAnswers: jest.fn().mockImplementation(() => { const s = new Subject<typeof emptyPage>(); reviews.push(s); return s; }),
    };
    params = new BehaviorSubject(convertToParamMap({id: 'u'}));
    TestBed.configureTestingModule({providers: [
      {provide: AdminApi, useValue: api}, {provide: ActivatedRoute, useValue: {paramMap: params}},
    ]});
    component = TestBed.runInInjectionContext(() => new AdminUserMonitoringPageComponent());
  });
  afterEach(() => TestBed.resetTestingModule());

  it('renders empty legacy data, separate course/alphabet and honest coverage with escaped identity', () => {
    const fixture = TestBed.createComponent(AdminUserMonitoringPageComponent);
    summaries[summaries.length - 1].next({...summary, user: {...summary.user, name: '<img src=x onerror=alert(1)>'}});
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Нет данных о начале урока');
    expect(text).toContain('Нет опубликованных уроков');
    expect(text).toContain('Подробные результаты упражнений ранее не собирались');
    expect(text).toContain('Показаны сохранённые ответы; полнота не гарантируется');
    expect(text).toContain('Алфавит');
    expect(text).toContain('Заблокирован');
    expect(text).toContain('<img src=x onerror=alert(1)>');
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('app-button').length).toBeGreaterThanOrEqual(6);
  });

  it('renders pending/completed receipts, repeated results, explicit denominator and sequence gaps', () => {
    const fixture = TestBed.createComponent(AdminUserMonitoringPageComponent);
    const page = fixture.componentInstance;
    const session = {id: 'session', lessonId: 'lesson', courseId: null, lessonTitle: 'Урок', lessonType: 'PRACTICE',
      startedAt: '2026-11-01T10:00:00Z', lastReceivedAt: '2026-11-01T10:05:00Z', plannedExercises: 1, savedAnswers: 2, repeatedExercises: 1,
      receiptStatus: 'PENDING', receiptCreatedAt: '2026-11-01T10:06:00Z', receiptSavedAt: '2026-11-01T10:06:00Z', inCurrentCourseMap: false};
    summaries[summaries.length - 1].next({...summary, lastLessonSession: session});
    page.lessonDetail.set({session, exercises: [{exerciseId: 'exercise', kind: 'MATCH_PAIRS', position: 1, context: 'Контекст'}],
      results: {page: 0, totalElements: 2, content: [
        {id: 'one', sequence: 1, exerciseId: 'exercise', kind: 'MATCH_PAIRS', context: 'Контекст', correct: false, expected: 'Ответ', mistakes: 2, receivedAt: '2026-11-01T10:05:00Z', source: 'CLIENT'},
        {id: 'two', sequence: 3, exerciseId: 'exercise', kind: 'MATCH_PAIRS', context: 'Контекст', correct: true, expected: null, mistakes: 0, receivedAt: '2026-11-01T10:05:00Z', source: 'CLIENT'},
      ]}, observedIncorrectCount: 1, observedIncorrectRatio: 0.5, exercisesWithoutSavedCorrect: ['other'],
      sequenceGaps: [{firstSequence: 2, lastSequence: 2}], coverage: 'Partial'});
    fixture.detectChanges();
    let text = fixture.nativeElement.textContent;
    expect(text).toContain('Результат сохранён, обработка завершения ожидается');
    expect(text).toContain('Вне текущей карты курса');
    expect(text).toContain('Верных: 1 / 2');
    expect(text).toContain('2–2');
    expect(text).toContain('Ошибки пар: 2');
    expect(text).toContain('Результат, сообщённый клиентом');
    expect(text).toContain('Это не доказывает, что упражнение не решено');
    expect(fixture.nativeElement.querySelectorAll('caption').length).toBeGreaterThan(1);
    page.summary.set({...summary, lastLessonSession: {...session, receiptStatus: 'COMPLETED'}});
    fixture.detectChanges();
    text = fixture.nativeElement.textContent;
    expect(text).toContain('Завершён');
    expect(page.receiptLabel(null, null)).toBe('Завершение не зарегистрировано');
  });

  it('loads only the summary initially and timestamps only successful responses', () => {
    expect(api.monitoring).toHaveBeenCalledWith('u');
    expect(api.monitoringHistory).not.toHaveBeenCalled();
    expect(component.loading()).toBe(true);
    expect(component.lastSuccessfulAt()).toBeNull();
    summaries[0].next(summary);
    expect(component.summary()).toBe(summary);
    expect(component.lastSuccessfulAt()).toBe(summary.generatedAt);
    expect(component.loading()).toBe(false);
    expect(api.monitoring).toHaveBeenCalledTimes(1);
  });

  it('retries an initial failure and retains successful data and timestamp after refresh 500', () => {
    summaries[0].error(new HttpErrorResponse({status: 500}));
    expect(component.error()).toContain('Повторите');
    component.refresh();
    summaries[1].next(summary);
    component.loadHistory(MonitoringHistoryKind.Sessions, 2);
    component.openLesson('session', 3);
    component.openReview('review', 4);
    component.refresh();
    expect(component.histories()).toEqual({});
    expect(component.lessonSessionId()).toBeNull();
    expect(component.reviewSessionId()).toBeNull();
    expect(component.lessonPage()).toBe(0);
    expect(component.reviewPage()).toBe(0);
    expect(histories[0].observed).toBe(false);
    expect(lessons[0].observed).toBe(false);
    expect(reviews[0].observed).toBe(false);
    summaries[2].error(new HttpErrorResponse({status: 500}));
    expect(component.summary()).toBe(summary);
    expect(component.lastSuccessfulAt()).toBe(summary.generatedAt);
    expect(component.error()).toContain('Повторите');
  });

  it('cancels stale summary requests across refresh and exact route ID changes', () => {
    component.refresh();
    expect(summaries[0].observed).toBe(false);
    summaries[0].next(summary);
    expect(component.summary()).toBeNull();
    summaries[1].next(summary);
    params.next(convertToParamMap({id: 'other'}));
    expect(component.summary()).toBeNull();
    expect(component.lastSuccessfulAt()).toBeNull();
    expect(api.monitoring).toHaveBeenLastCalledWith('other');
    summaries[1].next(summary);
    expect(component.summary()).toBeNull();
    const other = {...summary, user: {...summary.user, id: 'other'}};
    summaries[2].next(other);
    expect(component.summary()).toBe(other);
    params.next(convertToParamMap({id: 'other'}));
    expect(api.monitoring).toHaveBeenCalledTimes(3);
  });

  it('loads histories lazily, cancels old pages and resets detail when history changes', () => {
    summaries[0].next(summary);
    component.loadHistory(MonitoringHistoryKind.Sessions);
    component.loadHistory(MonitoringHistoryKind.Sessions, 1);
    expect(histories[0].observed).toBe(false);
    histories[0].next(emptyPage);
    expect(component.history()?.data).toBeNull();
    histories[1].next({...emptyPage, page: 1});
    expect(component.history()?.page).toBe(1);
    component.openLesson('session');
    component.loadHistory(MonitoringHistoryKind.Progress);
    expect(lessons[0].observed).toBe(false);
    expect(component.lessonSessionId()).toBeNull();
    expect(api.monitoringHistory).toHaveBeenLastCalledWith('u', MonitoringHistoryKind.Progress, 0);
    histories[2].error(new HttpErrorResponse({status: 500}));
    expect(component.history()?.error).toContain('Повторите');
    component.loadHistory(MonitoringHistoryKind.Progress);
    histories[3].next(emptyPage);
    expect(component.history()?.error).toBeNull();
  });

  it('pages lesson and review details independently and cancels stale detail selections', () => {
    summaries[0].next(summary);
    component.openLesson('first', 1);
    component.openReview('review', 2);
    component.openLesson('second');
    expect(lessons[0].observed).toBe(false);
    expect(reviews[0].observed).toBe(true);
    expect(component.lessonPage()).toBe(0);
    expect(component.reviewPage()).toBe(2);
    component.openReview('review', 3);
    expect(reviews[0].observed).toBe(false);
    expect(api.monitoringSession).toHaveBeenLastCalledWith('u', 'second', 0);
    expect(api.monitoringReviewAnswers).toHaveBeenLastCalledWith('u', 'review', 3);
    reviews[0].next(emptyPage);
    expect(component.reviewAnswers()).toBeNull();
    reviews[1].next({...emptyPage, page: 3});
    expect(component.reviewAnswers()?.page).toBe(3);
    lessons[1].error(new HttpErrorResponse({status: 500}));
    expect(component.lessonError()).toContain('Повторите');
    expect(component.summary()).toBe(summary);
  });

  it.each([
    [400, 'Неверный ID'], [401, 'Необходима авторизация'], [403, 'Нет доступа'], [404, 'Пользователь не найден'],
  ])('handles HTTP %s without implementing another authentication flow', (status, message) => {
    summaries[0].next(summary);
    component.refresh();
    summaries[1].error(new HttpErrorResponse({status: Number(status)}));
    expect(component.error()).toContain(message);
    expect(component.loading()).toBe(false);
    if (status !== 400) {
      expect(component.summary()).toBeNull();
      expect(component.lastSuccessfulAt()).toBeNull();
    }
  });

  it('clears target and all outstanding reads on detail 404 and destroys subscriptions', () => {
    summaries[0].next(summary);
    component.loadHistory(MonitoringHistoryKind.Reviews);
    component.openLesson('missing');
    component.openReview('review');
    lessons[0].error(new HttpErrorResponse({status: 404}));
    expect(component.summary()).toBeNull();
    expect(component.error()).toBe('Пользователь не найден');
    expect(component.histories()).toEqual({});
    expect(reviews[0].observed).toBe(false);
    expect(histories[0].observed).toBe(false);
    component.refresh();
    TestBed.resetTestingModule();
    expect(summaries[1].observed).toBe(false);
    expect(params.observed).toBe(false);
  });
});
