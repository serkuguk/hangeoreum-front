import {CourseMap, LessonNode, LessonStatus, LessonType} from '../../../domain/entities/course-map.entity';
import {toCoursePath} from './course-path.mapper';
import {CoursePathInput} from './course-path-input';
import {DashboardCourseMap} from '@features/dashboard/domain/dashboard.model';

function lesson(id: string, status: LessonStatus, over: Partial<LessonNode> = {}): LessonNode {
  return {
    id, title: `Урок ${id}`, type: 'LESSON' as LessonType, position: 1,
    xpReward: 20, isFree: true, hasAccess: true, status, score: null, ...over,
  };
}

function map(...units: Array<{id: string; lessons: LessonNode[]}>): CourseMap {
  return {
    courseId: 'c1', title: 'Курс', isPro: false,
    units: units.map((u, i) => ({...u, title: `Юнит ${i}`, description: null, color: null, position: i + 1})),
  };
}

describe('toCoursePath', () => {
  it('accepts the minimal public contract and dashboard model without casts', () => {
    const minimal: CoursePathInput = {units: [{id: 'u', title: 'Unit', lessons: [
      {id: 'l', title: 'Lesson', type: 'LESSON', status: 'AVAILABLE', hasAccess: true, score: null, xpReward: 10},
    ]}]};
    const dashboard: DashboardCourseMap = {title: null, units: [{id: 'u', title: 'Unit', lessons: [
      {id: 'l', title: 'Lesson', type: 'LESSON', status: 'AVAILABLE', hasAccess: true, score: null, xpReward: 10, position: 0},
    ]}]};
    expect(toCoursePath(minimal)).toEqual(toCoursePath(dashboard));
    expect(toCoursePath({units: []})).toEqual({chapters: [], nodes: []});
  });

  it('keeps the current lesson second in a six-lesson dashboard window', () => {
    const lessons = Array.from({length: 10}, (_, i) => lesson(String(i), i < 4 ? 'COMPLETED' : i === 4 ? 'AVAILABLE' : 'LOCKED'));
    const view = toCoursePath(map({id: 'u', lessons}), 6);
    expect(view.nodes.map(node => node.id)).toEqual(['3', '4', '5', '6', '7', '8']);
    expect(view.nodes[1].state).toBe('current');
  });

  it('делает «current» только первым доступным уроком, остальные доступные — бонусные', () => {
    const view = toCoursePath(map({
      id: 'u1',
      lessons: [lesson('a', 'COMPLETED'), lesson('b', 'AVAILABLE'), lesson('c', 'AVAILABLE'), lesson('d', 'LOCKED')],
    }));

    expect(view.nodes.map(n => n.state)).toEqual(['done', 'current', 'bonus', 'locked']);
  });

  it('считает урок без доступа заблокированным', () => {
    const view = toCoursePath(map({id: 'u1', lessons: [lesson('a', 'AVAILABLE', {hasAccess: false})]}));

    expect(view.nodes[0].state).toBe('locked');
    expect(view.nodes[0].subtitle).toContain('Pro');
  });

  it('обрезает путь до окна вокруг текущего урока и оставляет только его главы', () => {
    const view = toCoursePath(map(
      {id: 'u1', lessons: [lesson('a', 'COMPLETED'), lesson('b', 'COMPLETED'), lesson('c', 'COMPLETED')]},
      {id: 'u2', lessons: [lesson('d', 'AVAILABLE'), lesson('e', 'LOCKED')]},
    ), 3);

    expect(view.nodes.map(n => n.id)).toEqual(['c', 'd', 'e']);
    expect(view.chapters.map(c => c.id)).toEqual(['u1', 'u2']);
  });

  it('помечает главу завершённой, когда все её уроки пройдены', () => {
    const view = toCoursePath(map(
      {id: 'u1', lessons: [lesson('a', 'COMPLETED')]},
      {id: 'u2', lessons: [lesson('b', 'LOCKED')]},
    ));

    expect(view.chapters.map(c => c.state)).toEqual(['done', 'locked']);
    expect(view.chapters[0].title).toContain('ЗАВЕРШЕНА');
  });

  it('возвращает пустой путь без карты', () => {
    expect(toCoursePath(null)).toEqual({chapters: [], nodes: []});
  });
});
