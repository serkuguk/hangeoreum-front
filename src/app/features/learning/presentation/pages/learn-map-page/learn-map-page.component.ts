import {ChangeDetectionStrategy, Component, ElementRef, afterNextRender, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {LearnMapFacade} from '../../../application/facades/learn-map.facade';
import {LessonNode, UnitNode} from '../../../domain/entities/course-map.entity';

type UnitState = 'completed' | 'current' | 'locked';

@Component({
  selector: 'hg-learn-map-page',
  imports: [RouterLink],
  templateUrl: './learn-map-page.component.html',
  styleUrl: './learn-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnMapPageComponent {
  readonly facade = inject(LearnMapFacade);
  private router = inject(Router);
  private host = inject(ElementRef<HTMLElement>);

  constructor() {
    this.facade.load();
    // Скроллит к текущему узлу как только он реально появится в DOM —
    // без гадания с фиксированной задержкой под сетевую задержку загрузки карты.
    afterNextRender(() => {
      this.host.nativeElement.querySelector('.node.now')
        ?.scrollIntoView({block: 'center', behavior: 'smooth'});
    });
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

  /** Состояние юнита целиком — какую главу раскрывать, какую сворачивать, какую блокировать. */
  unitState(unit: UnitNode): UnitState {
    if (unit.lessons.every(l => l.status === 'COMPLETED')) return 'completed';
    if (unit.lessons.some(l => l.status === 'AVAILABLE' || l.status === 'COMPLETED')) return 'current';
    return 'locked';
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

  /** Условие открытия locked-юнита — почему он закрыт, не просто иконка замка. */
  lockedReason(unit: UnitNode, previous: UnitNode | undefined): string {
    if (!previous) return 'Пока недоступно';
    return `Заверши «${previous.title}», чтобы открыть`;
  }

  // ponytail: статический маппинг сцен первого курса по позиции юнита;
  // серверное поле situation появится вместе с read model из lessons plan
  private static readonly CHAPTER_SCENES = ['intro', 'cafe', 'metro', 'shop', 'home', 'university'];

  sceneUrl(index: number): string | null {
    const scene = LearnMapPageComponent.CHAPTER_SCENES[index];
    return scene ? `assets/illustrations/chapters/${scene}.svg` : null;
  }
}
