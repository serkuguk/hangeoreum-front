import {appendJamo, deleteLastJamo, jamoForCode} from './hangul-input';

const type = (jamos: string, start = '') => [...jamos].reduce(appendJamo, start);

describe('hangul-input', () => {
  it('composes syllables like a 두벌식 IME', () => {
    expect(type('ㅊㅣㄴㄱㅜ')).toBe('친구');
    expect(type('ㄱㅏㅁㅅㅏㅎㅏㅂㄴㅣㄷㅏ')).toBe('감사합니다');
    expect(type('ㄷㅏㄹㄱ')).toBe('닭');
    expect(type('ㄱㅗㅐㄴㅊㅏㄴㅎㅇㅏ')).toBe('괜찮아');
    expect(type('ㅇㅡㅣㅈㅏ')).toBe('의자');
    expect(type('ㄱㅏㄱㅏ')).toBe('가가');
    expect(type('ㄷㅏㄹㄱㅏ')).toBe('달가');
    expect(type('ㅇㅏㄴ ㄴㅕㅇ')).toBe('안 녕');
    expect(type('ㅏ')).toBe('ㅏ');
  });

  it('deletes one jamo at a time', () => {
    const steps = ['닭'];
    while (steps.at(-1)) steps.push(deleteLastJamo(steps.at(-1)!));
    expect(steps).toEqual(['닭', '달', '다', 'ㄷ', '']);
    expect(deleteLastJamo('과')).toBe('고');
    expect(deleteLastJamo('a ')).toBe('a');
  });

  it('maps physical keys regardless of OS layout', () => {
    expect([...'clsrn'].map(c => jamoForCode(`Key${c.toUpperCase()}`, false)).join('')).toBe('ㅊㅣㄴㄱㅜ');
    expect(jamoForCode('KeyQ', true)).toBe('ㅃ');
    expect(jamoForCode('Digit1', false)).toBeUndefined();
  });
});
