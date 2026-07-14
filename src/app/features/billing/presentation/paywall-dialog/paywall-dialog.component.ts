import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {PaywallService} from '@core/services/paywall.service';

/** Один на приложение (рендерится в main-layout), открывается interceptor'ом на 403. */
@Component({
  selector: 'hg-paywall-dialog',
  template: `
    @if (paywall.reason(); as reason) {
      <div class="backdrop" (click)="paywall.close()"></div>
      <div class="panel dialog" role="dialog" aria-modal="true" aria-label="Hangeoreum Pro">
        <div class="ghost kr">프로</div>
        <h3>
          @if (reason === 'LIMIT_REACHED') {
            Дневной лимит Free исчерпан
          } @else {
            Это Pro-фича
          }
        </h3>
        <p>
          @if (reason === 'LIMIT_REACHED') {
            Бесплатный план — 1 урок и 3 игры в день. С Pro лимитов нет: занимайся сколько хочешь.
          } @else {
            Story носителей, лента Immerse и повторение без ограничений — всё открывается с Pro.
          }
        </p>
        <div class="btns">
          <button type="button" class="cta" (click)="toPricing()">Смотреть тарифы</button>
          <button type="button" class="ghostbtn" (click)="paywall.close()">Позже</button>
        </div>
      </div>
    }
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, .6);
      z-index: 80;
    }

    .dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 81;
      width: min(92vw, 440px);
      padding: 32px;
      text-align: center;

      .ghost { font-size: 180px; right: -30px; bottom: -60px; }

      h3 { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
      p { color: var(--hg-muted); font-size: 14px; line-height: 1.6; margin-bottom: 22px; }

      .btns {
        display: flex;
        gap: 10px;

        .cta { flex: 1; }
      }
    }
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
