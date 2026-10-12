import {CoursePathInput} from './course-path-input';
type UnitNode = CoursePathInput['units'][number];
type LessonNode = UnitNode['lessons'][number];
import {ChapterState, CourseChapter, CourseNode, CourseNodeState} from './course-path.model';

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
export function toCoursePath(map: CoursePathInput | null, translate: (key: string, params?: Record<string, unknown>) => string, limit?: number): CoursePathView {
  if (!map) return {chapters: [], nodes: []};

  const chapters = map.units.map((unit, index) => chapterOf(unit, index, translate));
  const all = map.units.flatMap((unit, unitIndex) =>
    unit.lessons.map((lesson, i) => nodeOf(lesson, unit, i === 0 ? unitIndex : null, translate)));

  // Первый доступный урок — единственный «current», остальные доступные идут как «bonus».
  const currentId = all.find(node => node.state === 'available')?.id;
  const nodes = takeWindow(all, all.findIndex(node => node.state === 'available'), limit)
    .map(node => ({...node, state: settle(node, currentId)}));

  const used = new Set(nodes.map(node => node.chapterId));
  return {chapters: chapters.filter(chapter => used.has(chapter.id)), nodes};
}

function settle(node: RawNode, currentId: string | undefined): CourseNode['state'] {
  if (node.state !== 'available') return node.state;
  return node.id === currentId ? CourseNodeState.CURRENT : CourseNodeState.BONUS;
}

/** Окно из `limit` узлов так, чтобы текущий был вторым сверху и оставался контекст пройденного. */
function takeWindow(all: RawNode[], currentIndex: number, limit?: number): RawNode[] {
  if (!limit || all.length <= limit) return all;
  const start = Math.min(Math.max(currentIndex - 1, 0), all.length - limit);
  return all.slice(start, start + limit);
}

function chapterOf(unit: UnitNode, index: number, translate: (key: string, params?: Record<string, unknown>) => string): CourseChapter {
  const done = unit.lessons.every(l => l.status === 'COMPLETED');
  return {
    id: unit.id,
    title: translate(done ? 'learning.map.chapterDone' : 'learning.map.chapter', {number: index + 1, title: unit.title.toUpperCase()}),
    icon: chapterSceneUrl(index),
    state: chapterState(unit, done),
    // ponytail: TEST OUT ждёт бэкенда — плашку рисуем, когда в CourseMap появится флаг
  };
}

function chapterState(unit: UnitNode, done: boolean): CourseChapter['state'] {
  if (done) return ChapterState.DONE;
  return unit.lessons.some(l => l.status !== 'LOCKED') ? ChapterState.CURRENT : ChapterState.LOCKED;
}

/** `sceneIndex` не null только у первого урока главы — иллюстрация ставится один раз. */
function nodeOf(lesson: LessonNode, unit: UnitNode, sceneIndex: number | null, translate: (key: string, params?: Record<string, unknown>) => string): RawNode {
  return {
    id: lesson.id,
    chapterId: unit.id,
    glyph: lesson.type === 'STORY' ? '▶' : lesson.title.charAt(0),
    title: lesson.title,
    subtitle: subtitleOf(lesson, translate),
    state: rawState(lesson),
    icon: sceneIndex === null ? undefined : chapterSceneUrl(sceneIndex) ?? undefined,
  };
}

function rawState(lesson: LessonNode): RawNode['state'] {
  if (lesson.status === 'COMPLETED') return CourseNodeState.DONE;
  if (lesson.status === 'LOCKED') return CourseNodeState.LOCKED;
  return !lesson.hasAccess ? CourseNodeState.PRO : 'available';
}

function subtitleOf(lesson: LessonNode, translate: (key: string, params?: Record<string, unknown>) => string): string {
  if (lesson.status === 'COMPLETED') {
    return lesson.score !== null ? translate('learning.map.nodeScore', {score: lesson.score}) : translate('learning.map.done');
  }
  if (!lesson.hasAccess) return translate('learning.map.nodePro');
  if (lesson.status === 'LOCKED') return translate('learning.map.nodeLocked');
  return lesson.type === 'STORY' ? translate('learning.map.nodeStory') : translate('learning.map.nodeXp', {xp: lesson.xpReward});
}
