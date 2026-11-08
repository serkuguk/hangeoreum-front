import {Injectable, signal} from '@angular/core';

/** API error codes (403 body.code) that mean "needs Pro" — shared by the interceptor and features that react to them. */
export const PAYWALL_CODES = ['PRO_REQUIRED', 'LIMIT_REACHED'] as const;
export type PaywallReason = typeof PAYWALL_CODES[number];

export function paywallReasonOf(error: unknown): PaywallReason | null {
  const status = (error as {status?: number} | null)?.status;
  const code = (error as {error?: {code?: string} | null} | null)?.error?.code;
  return status === 403 && PAYWALL_CODES.includes(code as PaywallReason) ? code as PaywallReason : null;
}

/**
 * Глобальный триггер paywall-диалога: interceptor поднимает флаг на 403
 * PRO_REQUIRED / LIMIT_REACHED, диалог (features/billing) слушает и показывается.
 */
@Injectable({providedIn: 'root'})
export class PaywallService {
  readonly reason = signal<PaywallReason | null>(null);

  open(reason: PaywallReason): void {
    this.reason.set(reason);
  }

  close(): void {
    this.reason.set(null);
  }
}
