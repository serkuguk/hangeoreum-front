import {LessonNode} from '../domain/entities/course-map.entity';

/** Куда ведёт узел курса: Pro-замок → тариф, Story → плеер, пройденный урок → повтор, иначе → подсказка. */
export function lessonRoute(lesson: LessonNode): string[] {
  if (!lesson.hasAccess) return ['/billing'];
  if (lesson.type === 'STORY') return ['/learn', lesson.id, 'story'];
  return lesson.status === 'COMPLETED' ? ['/learn', lesson.id] : ['/learn', lesson.id, 'tip'];
}
