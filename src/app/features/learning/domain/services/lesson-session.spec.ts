import {LessonSession} from './lesson-session';
import {Exercise} from '../entities/exercise.entity';

const exercise = (id: string, position: number): Exercise => ({
  id,
  kind: 'CHOICE',
  position,
  payload: {question: 'q', options: [{text: 'a', correct: true}]},
});

describe('LessonSession', () => {
  it('идёт по очереди в порядке position и завершается', () => {
    const session = new LessonSession([exercise('b', 2), exercise('a', 1)]);
    expect(session.current?.id).toBe('a');
    session.submit(true);
    expect(session.current?.id).toBe('b');
    session.submit(true);
    expect(session.done).toBe(true);
    expect(session.score).toBe(100);
    expect(session.accuracy).toBe(100);
  });

  it('возвращает ошибочное упражнение в конец очереди', () => {
    const session = new LessonSession([exercise('a', 1), exercise('b', 2)]);
    session.submit(false); // a → в конец
    expect(session.current?.id).toBe('b');
    session.submit(true);
    expect(session.current?.id).toBe('a'); // вернулось
    session.submit(true);
    expect(session.done).toBe(true);
  });

  it('score считает только первую попытку, accuracy — все ответы', () => {
    const session = new LessonSession([exercise('a', 1), exercise('b', 2)]);
    session.submit(false); // a неверно (первая попытка)
    session.submit(true);  // b верно
    session.submit(true);  // a верно (вторая попытка)
    expect(session.score).toBe(50);      // 1 из 2 с первой попытки
    expect(session.accuracy).toBe(67);   // 2 из 3 ответов
  });

  it('solvedCount не учитывает упражнения, ждущие повтора', () => {
    const session = new LessonSession([exercise('a', 1), exercise('b', 2)]);
    session.submit(false);
    expect(session.solvedCount).toBe(0); // a ещё в очереди
    session.submit(true);
    expect(session.solvedCount).toBe(1); // b решено
  });

  it('пустой урок сразу done со score 0', () => {
    const session = new LessonSession([]);
    expect(session.done).toBe(true);
    expect(session.score).toBe(0);
  });
});
