import {Injectable, inject, signal} from '@angular/core';
import {BILLING_REPOSITORY, Plan, Subscription} from '../domain/billing.model';

@Injectable({providedIn: 'root'})
export class BillingFacade {
  private repository = inject(BILLING_REPOSITORY);

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
        this.error.set('Не получилось загрузить тарифы.');
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
        this.error.set('Оплата временно недоступна. Попробуй позже.');
        this.redirecting.set(false);
      },
    });
  }

  openPortal(): void {
    this.redirecting.set(true);
    this.repository.portal().subscribe({
      next: ({portalUrl}) => window.location.href = portalUrl,
      error: () => {
        this.error.set('Портал управления временно недоступен.');
        this.redirecting.set(false);
      },
    });
  }
}
