import {canAccess} from './access-policy';
import {Subscription} from './billing.model';

const sub = (isActive: boolean): Subscription =>
  ({id: '1', planCode: 'pro-month', status: 'ACTIVE', currentPeriodEnd: null, isActive});

describe('AccessPolicy', () => {
  it('без подписки Pro-фичи закрыты', () => {
    expect(canAccess('STORY', null)).toBe(false);
    expect(canAccess('IMMERSE', sub(false))).toBe(false);
  });

  it('активная подписка открывает Pro-фичи', () => {
    expect(canAccess('STORY', sub(true))).toBe(true);
    expect(canAccess('AI_DIALOG', sub(true))).toBe(true);
  });
});
