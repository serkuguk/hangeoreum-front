import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AdminApi, AdminCourse, AdminLesson, AdminUnit} from '../../infrastructure/admin.api';
import {HgButtonComponent, HgInputComponent, HgSelectComponent} from '@shared/components/controls';

@Component({
  selector: 'hg-admin-course-page',
  imports: [FormsModule, RouterLink, HgButtonComponent, HgInputComponent, HgSelectComponent],
  templateUrl: './admin-course-page.component.html',
  styleUrl: './_admin.scss',
  styles: `
    .coursehead {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 18px 22px;
      margin-bottom: 16px;

      h3 { flex: 1; font-size: 17px; }
    }

    .unit {
      margin-bottom: 14px;
      padding: 18px 22px;

      .uhead {
        display: flex;
        align-items: center;
        gap: 10px;

        b { flex: 1; font-size: 15px; }
      }

      .lessons { margin-top: 12px; display: flex; flex-direction: column; gap: 6px; }

      .lrow {
        display: flex;
        align-items: center;
        gap: 10px;
        background: var(--hg-card-2);
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13.5px;

        .ttl { flex: 1; }
        .meta { color: var(--hg-muted); font-size: 11.5px; }
        a { color: var(--hg-blue); text-decoration: none; font-size: 12.5px; }
      }
    }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCoursePageComponent {
  private api = inject(AdminApi);

  readonly course = signal<AdminCourse | null>(null);
  readonly units = signal<AdminUnit[]>([]);
  readonly lessonsByUnit = signal<Record<string, AdminLesson[]>>({});
  readonly error = signal<string | null>(null);

  newCourseTitle = '';
  newUnitTitle = '';
  newLessonTitle: Record<string, string> = {};
  newLessonType: Record<string, string> = {};
  readonly lessonTypes = ['LESSON', 'GRAMMAR', 'STORY', 'ALPHABET'].map(value => ({value, label: value}));

  constructor() {
    this.load();
  }

  load(): void {
    this.api.courses().subscribe({
      next: courses => {
        const course = courses[0] ?? null; // единственный курс корейского
        this.course.set(course);
        if (course) this.loadUnits(course.id);
      },
      error: () => this.error.set('Не получилось загрузить курс.'),
    });
  }

  private loadUnits(courseId: string): void {
    this.api.units(courseId).subscribe(units => {
      this.units.set(units);
      for (const unit of units) {
        this.api.lessons(unit.id).subscribe(lessons =>
          this.lessonsByUnit.update(map => ({...map, [unit.id]: lessons})));
      }
    });
  }

  createCourse(): void {
    if (!this.newCourseTitle.trim()) return;
    this.api.createCourse({title: this.newCourseTitle.trim()}).subscribe(() => this.load());
  }

  toggleCoursePublish(): void {
    const course = this.course();
    if (!course) return;
    this.api.publishCourse(course.id, !course.published).subscribe(updated => this.course.set(updated));
  }

  addUnit(): void {
    const course = this.course();
    const title = this.newUnitTitle.trim();
    if (!course || !title) return;
    this.api.createUnit({courseId: course.id, position: this.units().length + 1, title})
      .subscribe(() => {
        this.newUnitTitle = '';
        this.loadUnits(course.id);
      });
  }

  toggleUnitPublish(unit: AdminUnit): void {
    this.api.publishUnit(unit.id, !unit.published).subscribe(updated =>
      this.units.update(list => list.map(u => u.id === unit.id ? updated : u)));
  }

  removeUnit(unit: AdminUnit): void {
    if (!confirm(`Удалить юнит «${unit.title}» со всеми уроками?`)) return;
    this.api.deleteUnit(unit.id).subscribe(() =>
      this.units.update(list => list.filter(u => u.id !== unit.id)));
  }

  moveUnit(unit: AdminUnit, delta: -1 | 1): void {
    const previous = this.units();
    const list = [...previous];
    const index = list.indexOf(unit);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.units.set(list);
    this.api.reorderUnits(list.map((u, i) => ({id: u.id, position: i + 1}))).subscribe({
      error: () => {
        this.units.set(previous);
        this.error.set('Не получилось изменить порядок юнитов.');
      },
    });
  }

  addLesson(unit: AdminUnit): void {
    const title = (this.newLessonTitle[unit.id] ?? '').trim();
    if (!title) return;
    const lessons = this.lessonsByUnit()[unit.id] ?? [];
    this.api.createLesson({
      unitId: unit.id,
      position: lessons.length + 1,
      type: this.newLessonType[unit.id] || 'LESSON',
      title,
      xpReward: 10,
      isFree: false,
    }).subscribe(created => {
      this.newLessonTitle[unit.id] = '';
      this.lessonsByUnit.update(map => ({...map, [unit.id]: [...lessons, created]}));
    });
  }

  toggleLessonPublish(unit: AdminUnit, lesson: AdminLesson): void {
    this.api.publishLesson(lesson.id, !lesson.published).subscribe(updated =>
      this.patchLesson(unit.id, updated));
  }

  toggleLessonFree(unit: AdminUnit, lesson: AdminLesson): void {
    this.api.updateLesson(lesson.id, {
      unitId: lesson.unitId, position: lesson.position, type: lesson.type,
      title: lesson.title, xpReward: lesson.xpReward, isFree: !lesson.free,
    }).subscribe(updated => this.patchLesson(unit.id, updated));
  }

  removeLesson(unit: AdminUnit, lesson: AdminLesson): void {
    if (!confirm(`Удалить урок «${lesson.title}»?`)) return;
    this.api.deleteLesson(lesson.id).subscribe(() =>
      this.lessonsByUnit.update(map => ({
        ...map,
        [unit.id]: (map[unit.id] ?? []).filter(l => l.id !== lesson.id),
      })));
  }

  moveLesson(unit: AdminUnit, lesson: AdminLesson, delta: -1 | 1): void {
    const previous = this.lessonsByUnit()[unit.id] ?? [];
    const list = [...previous];
    const index = list.indexOf(lesson);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    this.lessonsByUnit.update(map => ({...map, [unit.id]: list}));
    this.api.reorderLessons(list.map((l, i) => ({id: l.id, position: i + 1}))).subscribe({
      error: () => {
        this.lessonsByUnit.update(map => ({...map, [unit.id]: previous}));
        this.error.set('Не получилось изменить порядок уроков.');
      },
    });
  }

  private patchLesson(unitId: string, lesson: AdminLesson): void {
    this.lessonsByUnit.update(map => ({
      ...map,
      [unitId]: (map[unitId] ?? []).map(l => l.id === lesson.id ? lesson : l),
    }));
  }
}
