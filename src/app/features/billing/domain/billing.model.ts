import {InjectionToken} from '@angular/core';
import {Observable} from 'rxjs';

export type Feature = 'LESSON_PRO' | 'STORY' | 'IMMERSE' | 'UNLIMITED_REVIEW' | 'AI_DIALOG';

export interface Plan {
  id: string;
  code: string;
  name: string;
  interval: 'MONTH' | 'YEAR' | 'LIFETIME';
  priceCents: number;
  currency: string;
}

export interface Subscription {
  id: string;
  planCode: string;
  status: string;
  currentPeriodEnd: string | null;
  isActive: boolean;
}

export interface BillingRepository {
  plans(): Observable<Plan[]>;
  subscription(): Observable<Subscription | null>;
  checkout(planCode: string): Observable<{checkoutUrl: string}>;
  portal(): Observable<{portalUrl: string}>;
}

export const BILLING_REPOSITORY = new InjectionToken<BillingRepository>('BillingRepository');
