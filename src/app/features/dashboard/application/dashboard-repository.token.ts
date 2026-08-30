import {InjectionToken} from '@angular/core';
import {DashboardRepository} from '../domain/dashboard.model';

export const DASHBOARD_REPOSITORY = new InjectionToken<DashboardRepository>('DashboardRepository');
