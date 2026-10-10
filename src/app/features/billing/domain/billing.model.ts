import {Observable} from 'rxjs';

export type Feature = 'LESSON_PRO' | 'STORY' | 'IMMERSE' | 'UNLIMITED_REVIEW' | 'AI_DIALOG';

export const PlanInterval = {MONTH: 'MONTH', YEAR: 'YEAR', LIFETIME: 'LIFETIME'} as const;
export type PlanInterval = typeof PlanInterval[keyof typeof PlanInterval];

export const CheckoutResult = {SUCCESS: 'success', CANCEL: 'cancel'} as const;

export interface Plan {
  id: string;
  code: string;
  name: string;
  interval: PlanInterval;
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
