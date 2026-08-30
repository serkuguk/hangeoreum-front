import {Injectable, inject, signal} from '@angular/core';
import {Plan, Subscription} from '../domain/billing.model';
import {BILLING_REPOSITORY} from './billing-repository.token';
import {TranslateService} from '@ngx-translate/core';

@Injectable({providedIn: 'root'})
export class BillingFacade {
  private repository = inject(BILLING_REPOSITORY);
  private translate = inject(TranslateService);

  readonly plans = signal<Plan[]>([]);
  readonly subscription = signal<Subscription | null>(null);
  readonly loading = signal(false);
  readonly redirecting = signal(false);
  readonly error = signal<string | null>(null);

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.repository.plans().subscribe({
      next: plans => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(this.translate.instant('billing.loadError'));
        this.loading.set(false);
      },
    });
    this.refreshSubscription();
  }

  refreshSubscription(): void {
    this.repository.subscription().subscribe(sub => this.subscription.set(sub));
  }

  checkout(planCode: string): void {
    this.redirecting.set(true);
    this.repository.checkout(planCode).subscribe({
      next: ({checkoutUrl}) => window.location.href = checkoutUrl,
      error: () => {
        this.error.set(this.translate.instant('billing.checkoutError'));
        this.redirecting.set(false);
      },
    });
  }

  openPortal(): void {
    this.redirecting.set(true);
    this.repository.portal().subscribe({
      next: ({portalUrl}) => window.location.href = portalUrl,
      error: () => {
        this.error.set(this.translate.instant('billing.portalError'));
        this.redirecting.set(false);
      },
    });
  }
}
