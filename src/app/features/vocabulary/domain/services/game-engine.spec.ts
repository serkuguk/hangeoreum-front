import {GameEngine, syllables} from './game-engine';

describe('GameEngine', () => {
  it('очки растут с комбо-множителем, ошибка сбрасывает комбо', () => {
    const engine = new GameEngine();
    engine.registerAnswer('a', true, 1000);  // combo 1 → +10
    engine.registerAnswer('b', true, 1000);  // combo 2 → +20
    expect(engine.score).toBe(30);
    expect(engine.combo).toBe(2);

    engine.registerAnswer('c', false, 1000); // сброс
    expect(engine.combo).toBe(0);
    expect(engine.score).toBe(30);

    engine.registerAnswer('d', true, 1000);  // combo 1 → +10
    expect(engine.score).toBe(40);
  });

  it('маппинг в quality: быстро=5, верно=4, ошибка=1', () => {
    const engine = new GameEngine();
    engine.registerAnswer('fast', true, 1500);
    engine.registerAnswer('slow', true, 5000);
    engine.registerAnswer('miss', false, 1000);
    expect(engine.answers).toEqual(expect.arrayContaining([
      {wordId: 'fast', quality: 5},
      {wordId: 'slow', quality: 4},
      {wordId: 'miss', quality: 1},
    ]));
  });

  it('по слову сохраняется худшее качество (ошибка не перекрывается успехом)', () => {
    const engine = new GameEngine();
    engine.registerAnswer('w', false, 1000);
    engine.registerAnswer('w', true, 1000);
    expect(engine.answers).toEqual([{wordId: 'w', quality: 1}]);
  });

  it('комбо не превышает максимум ×5', () => {
    const engine = new GameEngine();
    for (let i = 0; i < 8; i++) engine.registerAnswer(`w${i}`, true, 1000);
    expect(engine.combo).toBe(5);
  });
});

describe('syllables', () => {
  it('разбивает слово на слоги', () => {
    expect(syllables('행복')).toEqual(['행', '복']);
    expect(syllables('안녕하세요')).toEqual(['안', '녕', '하', '세', '요']);
  });
});
