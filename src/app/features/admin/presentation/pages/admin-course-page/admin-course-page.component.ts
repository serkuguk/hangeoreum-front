import {FormField, form, required} from '@angular/forms/signals';
import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AdminApi, AdminCourse, AdminLesson, AdminUnit} from '@features/admin/infrastructure/admin.api';
import {ButtonComponent, BasicInputComponent, BasicSelectComponent, DialogComponent} from 'springest';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';

enum DeletionKind { Unit = 'unit', Lesson = 'lesson' }
type PendingDeletion = {kind: DeletionKind.Unit; unit: AdminUnit}
  | {kind: DeletionKind.Lesson; unit: AdminUnit; lesson: AdminLesson};

@Component({
  selector: 'hg-admin-course-page',
  imports: [FormField, RouterLink, ButtonComponent, BasicInputComponent, BasicSelectComponent, DialogComponent, TranslatePipe],
  templateUrl: './admin-course-page.component.html',
  styleUrl: '../_admin.scss',
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

    .unit--lesson { overflow: visible; z-index: 1; }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminCoursePageComponent {
  private api = inject(AdminApi);
  private translate = inject(TranslateService);

  readonly course = signal<AdminCourse | null>(null);
  readonly units = signal<AdminUnit[]>([]);

  readonly publishLabel = computed(() => this.course()?.published
    ? this.translate.instant('admin.course.published')
    : this.translate.instant('admin.course.draft'));

  publishIcon(entity: {published: boolean}): string {
    return entity.published ? '👁' : '🚫';
  }

  accessLabel(lesson: AdminLesson): string {
    return this.translate.instant(lesson.free ? 'admin.course.free' : 'admin.course.pro');
  }
  readonly lessonsByUnit = signal<Partial<Record<string, AdminLesson[]>>>({});
  readonly error = signal<string | null>(null);
  readonly pendingDeletion = signal<PendingDeletion | null>(null);
  readonly saving = signal(false);
  readonly deletionError = signal<string | null>(null);
  readonly deletionTitle = computed(() => {
    const action = this.pendingDeletion();
    if (!action) return '';
    return this.translate.instant(action.kind === DeletionKind.Unit ? 'admin.course.deleteUnit' : 'admin.course.deleteLesson');
  });
  readonly deletionMessage = computed(() => {
    const action = this.pendingDeletion();
    if (!action) return '';
    return action.kind === DeletionKind.Unit
      ? this.translate.instant('admin.course.confirm.deleteUnit', {title: action.unit.title})
      : this.translate.instant('admin.course.confirm.deleteLesson', {title: action.lesson.title});
  });

  readonly newCourseTitle = signal('');
  readonly newCourseTitleField = form(this.newCourseTitle, path => required(path));
  readonly newUnitTitle = signal('');
  readonly newUnitTitleField = form(this.newUnitTitle, path => required(path));
  readonly lessonDrafts = signal<Record<string, {title: string; type: string}>>({});
  readonly lessonFields = form(this.lessonDrafts);
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
      error: () => this.error.set(this.translate.instant('admin.course.errors.loadCourse')),
    });
  }

  private loadUnits(courseId: string): void {
    this.api.units(courseId).subscribe(units => {
      this.units.set(units);
      this.lessonDrafts.update(drafts => Object.fromEntries(units.map(unit => [unit.id, drafts[unit.id] ?? {title: '', type: 'LESSON'}])));
      for (const unit of units) {
        this.api.lessons(unit.id).subscribe(lessons =>
          this.lessonsByUnit.update(map => ({...map, [unit.id]: lessons})));
      }
    });
  }

  createCourse(): void {
    if (!this.newCourseTitle().trim()) return;
    this.api.createCourse({title: this.newCourseTitle().trim()}).subscribe(() => this.load());
  }

  toggleCoursePublish(): void {
    const course = this.course();
    if (!course) return;
    this.api.publishCourse(course.id, !course.published).subscribe(updated => this.course.set(updated));
  }

  addUnit(): void {
    const course = this.course();
    const title = this.newUnitTitle().trim();
    if (!course || !title) return;
    this.api.createUnit({courseId: course.id, position: Math.max(0, ...this.units().map(unit => unit.position)) + 1, title})
      .subscribe(() => {
        this.newUnitTitle.set('');
        this.loadUnits(course.id);
      });
  }

  toggleUnitPublish(unit: AdminUnit): void {
    this.api.publishUnit(unit.id, !unit.published).subscribe(updated =>
      this.units.update(list => list.map(u => u.id === unit.id ? updated : u)));
  }

  removeUnit(unit: AdminUnit): void {
    if (this.saving()) return;
    this.deletionError.set(null);
    this.pendingDeletion.set({kind: DeletionKind.Unit, unit});
  }

  moveUnit(unit: AdminUnit, delta: -1 | 1): void {
    const previous = this.units();
    const list = [...previous];
    const index = list.indexOf(unit);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    list.forEach((item, i) => list[i] = {...item, position: i + 1});
    this.units.set(list);
    this.api.reorderUnits(list.map((u, i) => ({id: u.id, position: i + 1}))).subscribe({
      error: () => {
        this.units.set(previous);
        this.error.set(this.translate.instant('admin.course.errors.reorderUnits'));
      },
    });
  }

  addLesson(unit: AdminUnit): void {
    const title = this.lessonDrafts()[unit.id].title.trim();
    if (!title) return;
    const lessons = this.lessonsByUnit()[unit.id] ?? [];
    this.api.createLesson({
      unitId: unit.id,
      position: Math.max(0, ...lessons.map(lesson => lesson.position)) + 1,
      type: this.lessonDrafts()[unit.id].type,
      title,
      xpReward: 10,
      isFree: false,
    }).subscribe(created => {
      this.lessonFields[unit.id].title().reset('');
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
    if (this.saving()) return;
    this.deletionError.set(null);
    this.pendingDeletion.set({kind: DeletionKind.Lesson, unit, lesson});
  }

  onDeletionVisibleChange(visible: boolean): void {
    if (!visible) this.closeDeletion();
  }

  closeDeletion(): void {
    if (this.saving()) return;
    this.pendingDeletion.set(null);
    this.deletionError.set(null);
  }

  confirmDeletion(): void {
    const action = this.pendingDeletion();
    if (!action || this.saving()) return;
    this.saving.set(true);
    this.deletionError.set(null);
    const request$ = action.kind === DeletionKind.Unit
      ? this.api.deleteUnit(action.unit.id)
      : this.api.deleteLesson(action.lesson.id);
    request$.subscribe({
      next: () => {
        if (action.kind === DeletionKind.Unit) {
          this.units.update(list => list.filter(unit => unit.id !== action.unit.id));
        } else {
          this.lessonsByUnit.update(map => ({
            ...map,
            [action.unit.id]: (map[action.unit.id] ?? []).filter(lesson => lesson.id !== action.lesson.id),
          }));
        }
        this.saving.set(false);
        this.closeDeletion();
      },
      error: () => {
        this.saving.set(false);
        this.deletionError.set(this.translate.instant(action.kind === DeletionKind.Unit
          ? 'admin.course.errors.deleteUnit' : 'admin.course.errors.deleteLesson'));
      },
    });
  }

  moveLesson(unit: AdminUnit, lesson: AdminLesson, delta: -1 | 1): void {
    const previous = this.lessonsByUnit()[unit.id] ?? [];
    const list = [...previous];
    const index = list.indexOf(lesson);
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    [list[index], list[target]] = [list[target], list[index]];
    list.forEach((item, i) => list[i] = {...item, position: i + 1});
    this.lessonsByUnit.update(map => ({...map, [unit.id]: list}));
    this.api.reorderLessons(list.map((l, i) => ({id: l.id, position: i + 1}))).subscribe({
      error: () => {
        this.lessonsByUnit.update(map => ({...map, [unit.id]: previous}));
        this.error.set(this.translate.instant('admin.course.errors.reorderLessons'));
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
