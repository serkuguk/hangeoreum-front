import {AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {LearnMapFacade} from '../../../application/facades/learn-map.facade';
import {LessonNode} from '../../../domain/entities/course-map.entity';

@Component({
  selector: 'hg-learn-map-page',
  imports: [RouterLink],
  templateUrl: './learn-map-page.component.html',
  styleUrl: './learn-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnMapPageComponent implements AfterViewInit {
  readonly facade = inject(LearnMapFacade);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    this.facade.load();
  }

  ngAfterViewInit(): void {
    // автоскролл к первому доступному узлу после отрисовки данных
    setTimeout(() => {
      this.host.nativeElement.querySelector('.node.now')
        ?.scrollIntoView({block: 'center', behavior: 'smooth'});
    }, 300);
  }

  open(lesson: LessonNode): void {
    if (lesson.status === 'LOCKED') return;
    if (!lesson.hasAccess) {
      this.router.navigate(['/billing']);
      return;
    }
    if (lesson.type === 'STORY') {
      this.router.navigate(['/learn', lesson.id, 'story']);
    } else if (lesson.status === 'COMPLETED') {
      this.router.navigate(['/learn', lesson.id]); // повторить урок
    } else {
      this.router.navigate(['/learn', lesson.id, 'tip']);
    }
  }

  unitProgress(lessons: LessonNode[]): string {
    const done = lessons.filter(l => l.status === 'COMPLETED').length;
    return `${done} / ${lessons.length}`;
  }

  statusLabel(lesson: LessonNode): string {
    if (!lesson.hasAccess) return '🔒 Pro';
    switch (lesson.status) {
      case 'COMPLETED': return lesson.score !== null ? `✓ ${lesson.score}%` : '✓';
      case 'AVAILABLE': return 'Начать';
      default: return '🔒';
    }
  }
}
