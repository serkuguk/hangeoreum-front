import {computeNextReview} from './srs';

describe('SM-2 computeNextReview', () => {
  const fresh = {repetitions: 0, easeFactor: 2.5, interval: 0};

  it('q<3 сбрасывает повторения и ставит интервал 1', () => {
    const state = computeNextReview({repetitions: 5, easeFactor: 2.5, interval: 30}, 1);
    expect(state.repetitions).toBe(0);
    expect(state.interval).toBe(1);
  });

  it('первый успешный повтор → 1 день, второй → 6 дней', () => {
    const first = computeNextReview(fresh, 4);
    expect(first).toMatchObject({repetitions: 1, interval: 1});
    const second = computeNextReview(first, 4);
    expect(second).toMatchObject({repetitions: 2, interval: 6});
  });

  it('третий и далее → round(interval × EF)', () => {
    let state = computeNextReview(fresh, 5);     // rep 1, interval 1, EF 2.6
    state = computeNextReview(state, 5);         // rep 2, interval 6, EF 2.7
    state = computeNextReview(state, 5);         // rep 3
    expect(state.repetitions).toBe(3);
    expect(state.interval).toBe(Math.round(6 * state.easeFactor));
  });

  it('EF корректируется по q и не падает ниже 1.3', () => {
    expect(computeNextReview(fresh, 5).easeFactor).toBeCloseTo(2.6);
    expect(computeNextReview(fresh, 4).easeFactor).toBeCloseTo(2.5);
    expect(computeNextReview(fresh, 3).easeFactor).toBeCloseTo(2.36);

    let state = {...fresh};
    for (let i = 0; i < 20; i++) state = computeNextReview(state, 0);
    expect(state.easeFactor).toBeCloseTo(1.3);
  });
});
