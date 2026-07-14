import {Injectable, inject, signal} from '@angular/core';
import {CourseMap} from '../../domain/entities/course-map.entity';
import {LEARNING_REPOSITORY} from '../../domain/repositories/learning.repository';

@Injectable()
export class LearnMapFacade {
  private repository = inject(LEARNING_REPOSITORY);

  readonly map = signal<CourseMap | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Кэш на время жизни роута; invalidate() после завершения урока. */
  load(force = false): void {
    if (this.map() && !force) return;
    this.loading.set(true);
    this.error.set(null);
    this.repository.courseMap().subscribe({
      next: map => {
        this.map.set(map);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Не получилось загрузить карту курса.');
        this.loading.set(false);
      },
    });
  }

  invalidate(): void {
    this.load(true);
  }
}
