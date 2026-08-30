import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {HgButtonComponent} from '@shared/components/controls/hg-button.component';
import {BillingFacade} from '../../application/billing.facade';
import {Plan} from '../../domain/billing.model';
import {TranslatePipe} from '@ngx-translate/core';

const INTERVAL_LABEL: Record<Plan['interval'], string> = {
  MONTH: 'billing.month',
  YEAR: 'billing.year',
  LIFETIME: 'billing.lifetime',
};

@Component({
  selector: 'hg-pricing-page',
  imports: [HgButtonComponent, TranslatePipe],
  templateUrl: './pricing-page.component.html',
  styleUrl: './pricing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PricingPageComponent {
  /** /billing?result=success|cancel — возврат из Stripe Checkout. */
  readonly result = input<string | undefined>();
  readonly facade = inject(BillingFacade);

  constructor() {
    this.facade.load();
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
