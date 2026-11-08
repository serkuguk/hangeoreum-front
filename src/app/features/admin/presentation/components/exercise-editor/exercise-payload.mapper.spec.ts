import {ExerciseKind} from '@features/learning/public-api';
import {emptyDraft, toDraft, toPayload, validateDraft} from './exercise-payload.mapper';

const samples: Record<ExerciseKind, unknown> = {
  CHOICE: {
    question: '안녕하세요',
    romanization: 'annyeonghaseyo',
    options: [
      {text: 'здравствуйте', icon: '👋', correct: true},
      {text: 'спасибо', icon: '🙏'},
      {text: 'до свидания'},
    ],
  },
  LISTEN_CHOICE: {
    audioUrl: '',
    text: '안녕하세요',
    options: [{text: 'здравствуйте'}, {text: 'спасибо', correct: true}],
  },
  WORD_ORDER: {translation: 'Я — студент', tokens: ['저는', '학생', '이에요'], extra: ['친구는']},
  FILL_BLANK: {
    sentence: '저 ___ 학생이에요.',
    translation: 'Я — студент',
    hint: '저 кончается на гласную',
    options: [{text: '는', hint: 'после гласной'}, {text: '은'}],
    correct: '은',
  },
  MATCH_PAIRS: {pairs: [{left: '친구', right: 'друг'}, {left: '학교', right: 'школа'}]},
  TYPE_WORD: {translation: 'друг', answer: '친구', romanization: 'chingu'},
};

describe('exercise payload mapper', () => {
  it.each(Object.keys(samples) as ExerciseKind[])('round-trips %s without changes', (kind) => {
    const draft = toDraft(kind, samples[kind]);
    expect(validateDraft(kind, draft)).toEqual([]);
    expect(toPayload(kind, draft)).toEqual(samples[kind]);
  });

  it('moves the correct flag when another option is picked', () => {
    const draft = {...toDraft('CHOICE', samples.CHOICE), correctIndex: 2};
    const payload = toPayload('CHOICE', draft) as {options: {correct?: boolean}[]};
    expect(payload.options.map((o) => o.correct === true)).toEqual([false, false, true]);
  });

  it('reports what a blank new exercise is missing', () => {
    const draft = emptyDraft();
    expect(validateDraft('CHOICE', draft)).toEqual([
      'admin.builder.validation.question',
      'admin.builder.validation.optionText',
    ]);
    expect(validateDraft('FILL_BLANK', {...draft, options: [], correctIndex: -1})).toEqual([
      'admin.builder.validation.sentence',
      'admin.builder.validation.minOptions',
      'admin.builder.validation.noCorrect',
    ]);
    expect(validateDraft('WORD_ORDER', {...draft, translation: 'x', tokens: '저는'})).toEqual([
      'admin.builder.validation.tokens',
    ]);
  });
});
