import {InjectionToken} from '@angular/core';
import {BillingRepository} from '../domain/billing.model';

export const BILLING_REPOSITORY = new InjectionToken<BillingRepository>('BillingRepository');
