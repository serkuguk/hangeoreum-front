import {Injectable, signal} from '@angular/core';

/**
 * Глобальный триггер paywall-диалога: interceptor поднимает флаг на 403
 * PRO_REQUIRED / LIMIT_REACHED, диалог (features/billing) слушает и показывается.
 */
@Injectable({providedIn: 'root'})
export class PaywallService {
  readonly reason = signal<'PRO_REQUIRED' | 'LIMIT_REACHED' | null>(null);

  open(reason: 'PRO_REQUIRED' | 'LIMIT_REACHED'): void {
    this.reason.set(reason);
  }

  close(): void {
    this.reason.set(null);
  }
}
