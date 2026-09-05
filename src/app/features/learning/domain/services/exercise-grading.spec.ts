import {gradeChoice, gradeExactAnswer, gradeMatch, gradeTypedAnswer, gradeWordOrder, isMatchingPair} from './exercise-grading';

describe('exercise grading', () => {
  it('grades choice and listen choice against the marked answer', () => {
    const options = [{text: 'yes', correct: true}, {text: 'no', correct: false}];
    expect(gradeChoice(options[0], options)).toEqual({correct: true, expected: undefined});
    expect(gradeChoice(options[1], options)).toEqual({correct: false, expected: 'yes'});
    expect(gradeChoice(options[1], [])).toEqual({correct: false, expected: undefined});
  });

  it('preserves exact fill-blank comparison, including spaces and Unicode representation', () => {
    expect(gradeExactAnswer('한', '한').correct).toBe(true);
    expect(gradeExactAnswer('한 ', '한')).toEqual({correct: false, expected: '한'});
    expect(gradeExactAnswer('한'.normalize('NFD'), '한').correct).toBe(false);
  });

  it('compares word order as joined sentences without normalization', () => {
    expect(gradeWordOrder(['가', '나'], ['가', '나']).correct).toBe(true);
    expect(gradeWordOrder(['나', '가'], ['가', '나'])).toEqual({correct: false, expected: '가 나'});
    expect(gradeWordOrder(['가 ', '나'], ['가', '나']).correct).toBe(false);
  });

  it('normalizes NFC and whitespace only for typed answers and preserves expected text', () => {
    expect(gradeTypedAnswer('  한'.normalize('NFD') + '\t\n글 ', '한 글').correct).toBe(true);
    expect(gradeTypedAnswer('한 글', ' 한  글 ').correct).toBe(true);
    expect(gradeTypedAnswer('wrong', ' 한 글 ')).toEqual({correct: false, expected: ' 한 글 '});
    expect(gradeTypedAnswer('A', 'a').correct).toBe(false);
  });

  it('matches only opposite sides of the same pair and requires zero mistakes', () => {
    expect(isMatchingPair({pairIndex: 1, side: 'left'}, {pairIndex: 1, side: 'right'})).toBe(true);
    expect(isMatchingPair({pairIndex: 1, side: 'left'}, {pairIndex: 1, side: 'left'})).toBe(false);
    expect(isMatchingPair({pairIndex: 1, side: 'left'}, {pairIndex: 2, side: 'right'})).toBe(false);
    expect(gradeMatch(0)).toEqual({correct: true});
    expect(gradeMatch(1)).toEqual({correct: false});
  });
});
