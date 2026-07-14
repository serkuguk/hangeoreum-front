import {Feature, Subscription} from './billing.model';

/**
 * Единственная точка free/pro-решений на фронте (UI-скрытие; авторитетная проверка — бэк).
 * ponytail: как и на бэке — сейчас все Pro-фичи требуют подписку;
 * матрица по фичам появится, когда free-доступ начнёт различаться.
 */
export function canAccess(_feature: Feature, subscription: Subscription | null): boolean {
  return !!subscription?.isActive;
}
