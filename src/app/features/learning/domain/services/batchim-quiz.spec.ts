import {BATCHIM_FAMILIES} from '../entities/batchim.data';
import {nextBatchimQuestion} from './batchim-quiz';

describe('nextBatchimQuestion', () => {
  it('always offers 4 distinct sounds including the right one from the letter family', () => {
    for (let i = 0; i < 200; i++) {
      const q = nextBatchimQuestion();
      expect(q.options).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.options).toContain(q.answer);
      const family = BATCHIM_FAMILIES.find(f => f.rows.flat().includes(q.letter))!;
      expect(family.sound.startsWith(q.answer)).toBe(true);
      expect(q.family.split(' ')).toContain(q.letter);
    }
  });

  it('reads ㅅ as т', () => {
    // LETTERS order: ㄱ ㅋ ㄲ ㄴ ㄷ ㅅ … → index 5 of 15 letters
    const q = nextBatchimQuestion(() => 5.5 / 15);
    expect(q.letter).toBe('ㅅ');
    expect(q.answer).toBe('т');
  });
});
