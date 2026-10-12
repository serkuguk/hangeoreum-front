import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {jest} from '@jest/globals';
import {DashboardFacade} from '@features/dashboard/application/dashboard.facade';
import {DashboardPageComponent} from './dashboard-page.component';
import {CoursePathComponent} from '@features/learning/course-path';

describe('Dashboard course access', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('allows selecting a Pro node and routes to billing while progression locks remain disabled', () => {
    const lesson = {id: 'pro', title: 'Lesson', type: 'LESSON', status: 'AVAILABLE', hasAccess: false, score: null, xpReward: 10};
    const navigate = jest.fn();
    TestBed.configureTestingModule({providers: [
      {provide: Router, useValue: {navigate}},
      {provide: DashboardFacade, useValue: {data: signal(null), courseMap: signal({units: [{id: 'u', title: 'Unit', lessons: [lesson]}]}), load: jest.fn(), loadCourseMap: jest.fn()}},
    ]});
    const dashboard = TestBed.runInInjectionContext(() => new DashboardPageComponent());
    const path = TestBed.createComponent(CoursePathComponent);
    path.componentRef.setInput('nodes', dashboard.path().nodes);
    path.componentRef.setInput('chapters', dashboard.path().chapters);
    path.detectChanges();
    path.componentInstance.nodeSelected.subscribe(node => dashboard.openLesson(node));
    const node = path.componentInstance.placed()[0];
    path.componentInstance.select(node);
    expect(navigate).toHaveBeenCalledWith(['/billing']);
    navigate.mockClear();
    path.componentInstance.select({...node, state: 'locked'});
    expect(navigate).not.toHaveBeenCalled();
  });
});
