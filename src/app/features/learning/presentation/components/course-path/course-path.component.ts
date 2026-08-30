import {ChangeDetectionStrategy, Component, booleanAttribute, computed, input, output} from '@angular/core';
import {ChapterDivider, CourseChapter, CourseNode, CourseNodeState, PlacedNode} from './course-path.model';

/**
 * Геометрия змейки задана долями ширины холста, а не абсолютными x:
 * один и тот же рисунок пути живёт и на дашборде (760px), и на карте курса (880px),
 * и в компактном режиме телефона — страница передаёт [width], компонент считает остальное.
 */
const LANE = [0.237, 0.434, 0.684, 0.789, 0.618, 0.368, 0.224, 0.421, 0.684];
const TOP = 90;
const NODE = 88;
const CURRENT_NODE = 96;
const NODE_COMPACT = 64;
const CURRENT_COMPACT = 72;
const COMPACT_MAX = 660;
const DEAD = new Set<CourseNodeState>(['locked', 'final']);

@Component({
  selector: 'hg-course-path',
  templateUrl: './course-path.component.html',
  styleUrl: './course-path.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoursePathComponent {
  readonly nodes = input.required<CourseNode[]>();
  readonly chapters = input.required<CourseChapter[]>();

  /** Ширина холста: дашборд — 760, карта курса — 880, телефон — ширина контейнера. */
  readonly width = input(760, {transform: (value: number) => Math.max(320, value || 760)});
  /** Вертикальный шаг между узлами. */
  readonly step = input(160);
  /** Дополнительный отбив на границе глав — чтобы разделитель не наезжал на подписи. */
  readonly chapterGap = input(76);
  /** Короткий сплошной отрезок сверху: путь «выходит» из блока над картой (алфавит). */
  readonly startStub = input(false, {transform: booleanAttribute});

  readonly nodeSelected = output<CourseNode>();
  readonly testOutSelected = output<CourseChapter>();

  readonly compact = computed(() => this.width() < COMPACT_MAX);

  readonly placed = computed<PlacedNode[]>(() => {
    const nodes = this.nodes();
    const width = this.width();
    const step = this.step();
    const gap = this.chapterGap();
    const compact = this.compact();
    let gaps = 0;

    return nodes.map((node, index) => {
      if (index > 0 && nodes[index - 1].chapterId !== node.chapterId) gaps += gap;
      const current = node.state === 'current' || !!node.now;
      const sizes = compact ? [NODE_COMPACT, CURRENT_COMPACT] : [NODE, CURRENT_NODE];
      const size = sizes[current ? 1 : 0];
      const x = Math.round(LANE[index % LANE.length] * width);
      return {...node, x, y: TOP + index * step + gaps, size, side: x > width / 2 ? 'left' : 'right'};
    });
  });

  /** Высота холста — последняя точка + запас на подпись */
  readonly canvasHeight = computed(() => {
    const placed = this.placed();
    const last = placed.length ? placed[placed.length - 1] : null;
    return (last ? last.y + last.size : TOP) + 110;
  });

  /** Отрезок от блока над картой к первому узлу */
  readonly stubPath = computed(() => {
    const first = this.placed()[0];
    return first ? `M${first.x} 0 L${first.x} ${first.y + first.size / 2}` : '';
  });

  /** Пройденный участок трассы (сплошная зелёная линия) */
  readonly donePath = computed(() => buildPath(this.trackPoints().slice(0, this.doneIndex() + 1)));

  /** Непройденный участок (пунктир) */
  readonly restPath = computed(() => buildPath(this.trackPoints().slice(Math.max(this.doneIndex(), 0))));

  /** Разделители глав: над первым узлом каждой главы */
  readonly dividers = computed<ChapterDivider[]>(() => {
    const seen = new Set<string>();
    const out: ChapterDivider[] = [];

    for (const node of this.placed()) {
      if (seen.has(node.chapterId)) continue;
      seen.add(node.chapterId);
      const chapter = this.chapters().find(item => item.id === node.chapterId);
      if (chapter) out.push({chapter, y: node.y - 62});
    }
    return out;
  });

  /** Плашки TEST OUT — под последним узлом главы */
  readonly testOuts = computed<ChapterDivider[]>(() => {
    const placed = this.placed();
    return this.chapters()
      .filter(chapter => chapter.testOut)
      .flatMap(chapter => {
        const last = [...placed].reverse().find(node => node.chapterId === chapter.id);
        return last ? [{chapter, y: last.y + last.size + 22}] : [];
      });
  });

  readonly testOutLeft = computed(() => Math.round(this.width() * 0.08));
  readonly testOutWidth = computed(() => Math.round(this.width() * 0.84));

  private readonly trackPoints = computed(() => this.placed().map(node => ({x: node.x, y: node.y + node.size / 2})));

  private readonly doneIndex = computed(() => {
    let index = -1;
    this.placed().forEach((node, i) => { if (node.state === 'done') index = i; });
    return index;
  });

  isDead(node: PlacedNode): boolean { return DEAD.has(node.state); }
  /** Пульс и расширенная подпись: явный флаг now либо состояние current (совместимость с дашбордом). */
  isNow(node: PlacedNode): boolean { return node.now ?? node.state === 'current'; }
  isMuted(node: PlacedNode): boolean { return this.isDead(node) || node.state === 'pro'; }

  labelLeft(node: PlacedNode): number | null {
    return node.side === 'right' ? node.x + node.size / 2 + 26 : null;
  }

  labelRight(node: PlacedNode): number | null {
    return node.side === 'left' ? this.width() - node.x + node.size / 2 + 26 : null;
  }

  select(node: PlacedNode): void {
    if (this.isDead(node)) return;
    this.nodeSelected.emit(node);
  }
}

/** Кубическая змейка: вертикальный выход из точки, вертикальный вход в следующую */
function buildPath(points: Array<{x: number; y: number}>): string {
  if (points.length < 2) return '';
  return points.reduce((acc, point, index) => {
    if (index === 0) return `M${point.x} ${point.y}`;
    const prev = points[index - 1];
    const bend = (point.y - prev.y) / 2;
    return `${acc} C${prev.x} ${prev.y + bend} ${point.x} ${point.y - bend} ${point.x} ${point.y}`;
  }, '');
}
