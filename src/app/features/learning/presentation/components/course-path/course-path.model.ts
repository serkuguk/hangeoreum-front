export type CourseNodeState =
  | 'done'     // урок пройден
  | 'current'  // следующий шаг (пульс + карточка «Сейчас проходишь»)
  | 'open'     // доступен, но не следующий по порядку
  | 'locked'   // закрыт прогрессом
  | 'pro'      // доступен по подписке (hasAccess === false)
  | 'bonus'    // Story-финал главы
  | 'final';   // финиш курса, не кликается

export interface CourseNode {
  /** id урока для роутинга */
  id: string;
  /** крупный хангыль/ханча-глиф на кнопке */
  glyph: string;
  title: string;
  subtitle: string;
  state: CourseNodeState;
  /** ровно один узел на карте: пульсирующее кольцо + расширенная подпись */
  now?: boolean;
  /** 0..100 — рисуется только если задан */
  progress?: number;
  /** иллюстрация главы (assets/illustrations/chapters/*.svg) — показывается у now-узла */
  icon?: string;
  /** id главы, к которой относится узел */
  chapterId: string;
}

export interface CourseChapter {
  id: string;
  title: string;
  icon: string | null;
  state: 'done' | 'current' | 'locked';
  /** «3 / 6» рядом с названием главы */
  counter?: string;
  /** условие открытия для locked-главы */
  hint?: string;
  /** плашка «Проверка главы · TEST OUT» после последнего узла главы */
  testOut?: boolean;
}

/** Внутренняя, посчитанная раскладка одного узла */
export interface PlacedNode extends CourseNode {
  x: number;
  y: number;
  size: number;
  side: 'left' | 'right';
}

export interface ChapterDivider {
  chapter: CourseChapter;
  y: number;
}
