import {CourseMap, LessonNode, UnitNode} from '../../../domain/entities/course-map.entity';
import {CourseChapter, CourseNode} from './course-path.model';

// ponytail: статический маппинг сцен первого курса по позиции юнита;
// серверное поле situation появится вместе с read model из lessons plan
const CHAPTER_SCENES = ['intro', 'cafe', 'metro', 'shop', 'home', 'university'];

export function chapterSceneUrl(unitIndex: number): string | null {
  const scene = CHAPTER_SCENES[unitIndex];
  return scene ? `assets/illustrations/chapters/${scene}.svg` : null;
}

export interface CoursePathView {
  chapters: CourseChapter[];
  nodes: CourseNode[];
}

/** `available` — промежуточное состояние: toCoursePath решает, какой из них станет «current». */
type RawNode = Omit<CourseNode, 'state'> & {state: CourseNode['state'] | 'available'};

/**
 * Раскладывает карту курса в змейку: юнит → глава, урок → узел.
 * `limit` обрезает список до окна вокруг текущего урока — дашборд показывает фрагмент,
 * карта курса передаёт весь путь.
 */
export function toCoursePath(map: CourseMap | null, limit?: number): CoursePathView {
  if (!map) return {chapters: [], nodes: []};

  const chapters = map.units.map((unit, index) => chapterOf(unit, index));
  const all = map.units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, i) => nodeOf(lesson, unit, i === 0 ? unitIndex : null)));

  // Первый доступный урок — единственный «current», остальные доступные идут как «bonus».
  const currentId = all.find(node => node.state === 'available')?.id;
  const nodes = takeWindow(all, all.findIndex(node => node.state === 'available'), limit)
    .map(node => ({...node, state: settle(node, currentId)}));

  const used = new Set(nodes.map(node => node.chapterId));
  return {chapters: chapters.filter(chapter => used.has(chapter.id)), nodes};
}

function settle(node: RawNode, currentId: string | undefined): CourseNode['state'] {
  if (node.state !== 'available') return node.state;
  return node.id === currentId ? 'current' : 'bonus';
}

/** Окно из `limit` узлов так, чтобы текущий был вторым сверху и оставался контекст пройденного. */
function takeWindow(all: RawNode[], currentIndex: number, limit?: number): RawNode[] {
  if (!limit || all.length <= limit) return all;
  const start = Math.min(Math.max(currentIndex - 1, 0), all.length - limit);
  return all.slice(start, start + limit);
}

function chapterOf(unit: UnitNode, index: number): CourseChapter {
  const done = unit.lessons.every(l => l.status === 'COMPLETED');
  return {
    id: unit.id,
    title: `ГЛАВА ${index + 1} · ${unit.title.toUpperCase()}${done ? ' · ЗАВЕРШЕНА' : ''}`,
    icon: chapterSceneUrl(index),
    state: chapterState(unit, done),
    // ponytail: TEST OUT ждёт бэкенда — плашку рисуем, когда в CourseMap появится флаг
  };
}

function chapterState(unit: UnitNode, done: boolean): CourseChapter['state'] {
  if (done) return 'done';
  return unit.lessons.some(l => l.status !== 'LOCKED') ? 'current' : 'locked';
}

/** `sceneIndex` не null только у первого урока главы — иллюстрация ставится один раз. */
function nodeOf(lesson: LessonNode, unit: UnitNode, sceneIndex: number | null): RawNode {
  return {
    id: lesson.id,
    chapterId: unit.id,
    glyph: lesson.type === 'STORY' ? '▶' : lesson.title.charAt(0),
    title: lesson.title,
    subtitle: subtitleOf(lesson),
    state: rawState(lesson),
    icon: sceneIndex === null ? undefined : chapterSceneUrl(sceneIndex) ?? undefined,
  };
}

function rawState(lesson: LessonNode): RawNode['state'] {
  if (lesson.status === 'COMPLETED') return 'done';
  return lesson.status === 'LOCKED' || !lesson.hasAccess ? 'locked' : 'available';
}

function subtitleOf(lesson: LessonNode): string {
  if (lesson.status === 'COMPLETED') {
    return lesson.score !== null ? `✓ Пройдено · ${lesson.score}%` : '✓ Пройдено';
  }
  if (!lesson.hasAccess) return '🔒 Доступно по подписке Pro';
  if (lesson.status === 'LOCKED') return 'Откроется после предыдущего урока';
  return lesson.type === 'STORY' ? 'Видео носителя · финал главы' : `+${lesson.xpReward} XP`;
}
