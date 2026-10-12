import {CoursePathInput} from './components/course-path/course-path-input';

/** Куда ведёт узел курса: Pro-замок → тариф, Story → плеер, пройденный урок → повтор, иначе → подсказка. */
export function lessonRoute(lesson: Pick<CoursePathInput['units'][number]['lessons'][number], 'id' | 'type' | 'status' | 'hasAccess'>): string[] {
  if (!lesson.hasAccess) return ['/billing'];
  if (lesson.type === 'STORY') return ['/learn', lesson.id, 'story'];
  return lesson.status === 'COMPLETED' ? ['/learn', lesson.id] : ['/learn', lesson.id, 'tip'];
}
