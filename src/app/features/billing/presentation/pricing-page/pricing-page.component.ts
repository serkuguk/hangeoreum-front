import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {ButtonComponent} from 'springest';
import {BillingFacade} from '../../application/billing.facade';
import {CheckoutResult, Plan, PlanInterval} from '../../domain/billing.model';
import {TranslatePipe} from '@ngx-translate/core';

const INTERVAL_LABEL: Record<PlanInterval, string> = {
  MONTH: 'billing.month',
  YEAR: 'billing.year',
  LIFETIME: 'billing.lifetime',
};

@Component({
  selector: 'hg-pricing-page',
  imports: [ButtonComponent, TranslatePipe],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingPageComponent {
  /** /billing?result=success|cancel — возврат из Stripe Checkout. */
  readonly result = input<string | undefined>();
  readonly facade = inject(BillingFacade);

  readonly paymentSucceeded = computed(() => this.result() === CheckoutResult.SUCCESS);
  readonly paymentCancelled = computed(() => this.result() === CheckoutResult.CANCEL);
  readonly checkoutLabel = computed(() => this.facade.redirecting() ? 'billing.openingCheckout' : 'billing.select');

  constructor() {
    this.facade.load();
  }

  isBest(plan: Plan): boolean {
    return plan.interval === PlanInterval.YEAR;
  }

  periodEndDate(isoDate: string): string {
    return isoDate.slice(0, 10);
  }

  price(plan: Plan): string {
    const amount = plan.priceCents / 100;
    const currency = plan.currency === 'EUR' ? '€' : plan.currency;
    return `${amount % 1 === 0 ? amount : amount.toFixed(2)} ${currency}`;
  }

  intervalLabel(plan: Plan): string {
    return INTERVAL_LABEL[plan.interval] ?? '';
  }
}
