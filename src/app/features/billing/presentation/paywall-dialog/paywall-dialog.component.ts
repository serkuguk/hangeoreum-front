import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {PaywallService} from '@core/services/paywall.service';
import {HgButtonComponent, HgDialogComponent} from '@shared/components/controls';
import {TranslatePipe} from '@ngx-translate/core';

/** Один на приложение (рендерится в main-layout), открывается interceptor'ом на 403. */
@Component({
  selector: 'hg-paywall-dialog',
  imports: [HgButtonComponent, HgDialogComponent, TranslatePipe],
  template: `
    @if (paywall.reason(); as reason) {
      <hg-dialog [visible]="true" (visibleChange)="!$event && paywall.close()"
                 [title]="'billing.title' | translate" dismissableMask>
        <div class="ghost kr">{{ 'billing.ghost' | translate }}</div>
        <h3>
          @if (reason === 'LIMIT_REACHED') {
            {{ 'billing.limitReachedTitle' | translate }}
          } @else {
            {{ 'billing.proFeatureTitle' | translate }}
          }
        </h3>
        <p>
          @if (reason === 'LIMIT_REACHED') {
            {{ 'billing.limitReachedText' | translate }}
          } @else {
            {{ 'billing.proFeatureText' | translate }}
          }
        </p>
        <div dialog-actions class="btns">
          <hg-button [label]="'billing.viewPlans' | translate" (pressed)="toPricing()"/>
          <hg-button [label]="'billing.later' | translate" variant="ghost" (pressed)="paywall.close()"/>
        </div>
      </hg-dialog>
    }
  `,
  styles: `
    .ghost { font-size: 180px; right: -30px; bottom: -60px; }
    h3 { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
    p { color: var(--hg-muted); font-size: 14px; line-height: 1.6; margin-bottom: 22px; }
    .btns { display: flex; gap: 10px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaywallDialogComponent {
  readonly paywall = inject(PaywallService);
  private router = inject(Router);

  toPricing(): void {
    this.paywall.close();
    this.router.navigate(['/billing']);
  }
}
