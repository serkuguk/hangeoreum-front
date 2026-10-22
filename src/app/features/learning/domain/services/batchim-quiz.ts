import {BATCHIM_FAMILIES} from '../entities/batchim.data';

export interface BatchimQuestion {
  letter: string;
  answer: string;
  /** все буквы семьи — для текста фидбека */
  family: string;
  options: string[];
}

/** Звук без диакритики непроизносимого взрыва — так его выбирает пользователь. */
const plain = (sound: string): string => sound.replace('\u031A', '');

const SOUNDS = BATCHIM_FAMILIES.map(f => plain(f.sound));

const LETTERS = BATCHIM_FAMILIES.flatMap(f => {
  const letters = f.rows.flat();
  return letters.map(letter => ({letter, answer: plain(f.sound), family: letters.join(' ')}));
});

function shuffle<T>(items: T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Случайный патчим + 4 варианта звука (верный и 3 других семьи). */
export function nextBatchimQuestion(random: () => number = Math.random): BatchimQuestion {
  const picked = LETTERS[Math.floor(random() * LETTERS.length)];
  const distractors = shuffle(SOUNDS.filter(s => s !== picked.answer), random).slice(0, 3);
  return {...picked, options: shuffle([picked.answer, ...distractors], random)};
}
