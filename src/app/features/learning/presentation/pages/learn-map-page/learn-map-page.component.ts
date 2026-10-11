import {ButtonComponent} from 'springest';
import {
  ChangeDetectionStrategy, Component, ElementRef, HostListener, Injector,
  afterNextRender, computed, effect, inject, signal,
} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {MascotComponent} from '@shared/components/hg/mascot/mascot.component';
import {LearnMapFacade} from '../../../application/facades/learn-map.facade';
import {LessonNode, UnitNode} from '../../../domain/entities/course-map.entity';
import {CoursePathComponent} from '../../components/course-path/course-path.component';
import {chapterSceneUrl} from '../../components/course-path/course-path.mapper';
import {CourseChapter, CourseNode, CourseNodeState} from '../../components/course-path/course-path.model';
import {lessonRoute} from '../../lesson-route';

type UnitState = 'done' | 'current' | 'locked';

/** Первый слог хангыля из названия урока — глиф на кнопке; иначе номер шага. */
const HANGUL = /[가-힣]/;
const FINISH_ID = 'course-finish';

@Component({
  selector: 'hg-learn-map-page',
  imports: [RouterLink, ButtonComponent, CoursePathComponent, MascotComponent, TranslatePipe],
  templateUrl: './learn-map-page.component.html',
  styleUrl: './learn-map-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnMapPageComponent {
  readonly facade = inject(LearnMapFacade);
  private readonly router = inject(Router);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);
  private readonly translate = inject(TranslateService);

  /** Карта открывается на текущей главе: пройденный пролог свёрнут в строки. */
  readonly showAll = signal(false);
  private readonly opened = signal<ReadonlySet<string>>(new Set<string>());

  private readonly viewport = signal(typeof window === 'undefined' ? 1440 : window.innerWidth);
  private centred = false;

  constructor() {
    this.facade.load();
    // Центрируем текущий узел, когда карта реально пришла и отрисовалась,
    // а не по фиксированной задержке под сетевую задержку загрузки.
    effect(() => {
      if (this.centred || this.nodes().length === 0) return;
      this.centred = true;
      afterNextRender(() => {
        this.host.nativeElement.querySelector('.hg-path__btn.is-current, .hg-path__btn.is-bonus')
          ?.scrollIntoView({block: 'center', behavior: 'smooth'});
      }, {injector: this.injector});
    });
  }

  @HostListener('window:resize')
  onResize(): void { this.viewport.set(window.innerWidth); }

  /**
   * Геометрия змейки одна, ширина холста — от вьюпорта: карта шире дашборда,
   * на планшете сужается, ниже 660px компонент сам уходит в компактный режим.
   */
  readonly pathWidth = computed(() => {
    const width = this.viewport();
    if (width >= 1400) return 880;
    if (width >= 1120) return 800;
    if (width >= 900) return 700;
    return Math.max(340, width - 56);
  });

  private readonly units = computed<UnitNode[]>(() => this.facade.map()?.units ?? []);

  /** Свёрнутым может быть только непрерывный пройденный пролог карты. */
  readonly collapsedUnits = computed<UnitNode[]>(() => {
    if (this.showAll()) return [];
    const opened = this.opened();
    const prologue: UnitNode[] = [];
    for (const unit of this.units()) {
      if (this.unitState(unit) !== 'done' || opened.has(unit.id)) break;
      prologue.push(unit);
    }
    return prologue;
  });

  private readonly visibleUnits = computed<UnitNode[]>(() => {
    const hidden = new Set(this.collapsedUnits().map(unit => unit.id));
    return this.units().filter(unit => !hidden.has(unit.id));
  });

  readonly chapters = computed<CourseChapter[]>(() => {
    const all = this.units();
    return this.visibleUnits().map(unit => {
      const index = all.indexOf(unit);
      const state = this.unitState(unit);
      return {
        id: unit.id,
        title: this.translate.instant('learning.map.chapterTitle', {index: index + 1, title: unit.title.toUpperCase()}),
        icon: this.sceneUrl(index),
        state,
        counter: this.unitProgress(unit.lessons),
        hint: state === 'locked' ? this.lockedReason(unit, all[index - 1]) : undefined,
        // TEST OUT ждёт эндпоинт проверки главы — плашку включит одна строка здесь
        testOut: false,
      };
    });
  });

  readonly nodes = computed<CourseNode[]>(() => {
    const all = this.units();
    const visible = this.visibleUnits();
    const nowId = this.nowLessonId();
    const out: CourseNode[] = [];

    for (const unit of visible) {
      const icon = this.sceneUrl(all.indexOf(unit)) ?? undefined;
      for (const lesson of unit.lessons) {
        out.push({
          id: lesson.id,
          glyph: this.glyph(lesson),
          title: lesson.title,
          subtitle: this.subtitle(lesson),
          state: this.nodeState(lesson, lesson.id === nowId),
          now: lesson.id === nowId,
          icon,
          chapterId: unit.id,
        });
      }
    }

    const last = visible[visible.length - 1];
    if (last && out.length) {
      out.push({
        id: FINISH_ID,
        glyph: '完',
        title: this.translate.instant('learning.map.finishTitle'),
        subtitle: this.facade.map()?.title ?? this.translate.instant('learning.map.finishDone'),
        state: 'final',
        chapterId: last.id,
      });
    }
    return out;
  });

  readonly progress = computed(() => {
    const lessons = this.units().flatMap(unit => unit.lessons);
    const done = lessons.filter(lesson => lesson.status === 'COMPLETED').length;
    return {
      done,
      total: lessons.length,
      percent: lessons.length ? Math.round((done / lessons.length) * 100) : 0,
    };
  });

  readonly mapTitle = computed(() => this.facade.map()?.title || this.translate.instant('learning.map.fallbackTitle'));
  readonly progressAria = computed(() =>
    this.translate.instant('learning.map.progressAria', {percent: this.progress().percent}));
  readonly currentChapterClass = computed(() => this.showAll() ? 'hg-native-button' : 'hg-native-button is-on');
  readonly allChaptersClass = computed(() => this.showAll() ? 'hg-native-button is-on' : 'hg-native-button');

  /** Есть ли на карте уроки под подпиской — от этого зависит бейдж Pro в шапке. */
  readonly hasPaywall = computed(() =>
    this.units().some(unit => unit.lessons.some(lesson => !lesson.hasAccess)));

  expand(unitId: string): void {
    this.opened.update(set => new Set([...set, unitId]));
  }

  focusCurrent(): void {
    this.showAll.set(false);
    this.opened.set(new Set());
  }

  onNode(node: CourseNode): void {
    if (node.id === FINISH_ID) return;
    const lesson = this.units().flatMap(unit => unit.lessons).find(item => item.id === node.id);
    if (lesson) this.open(lesson);
  }

  open(lesson: LessonNode): void {
    if (lesson.status === 'LOCKED') return;
    this.router.navigate(lessonRoute(lesson));
  }

  /** Состояние юнита целиком — какую главу свернуть, какую блокировать. */
  unitState(unit: UnitNode): UnitState {
    if (unit.lessons.every(lesson => lesson.status === 'COMPLETED')) return 'done';
    if (unit.lessons.some(lesson => lesson.status === 'AVAILABLE' || lesson.status === 'COMPLETED')) return 'current';
    return 'locked';
  }

  unitProgress(lessons: LessonNode[]): string {
    const done = lessons.filter(lesson => lesson.status === 'COMPLETED').length;
    return `${done} / ${lessons.length}`;
  }

  /** Средний балл пройденной главы — то, что видно в свёрнутой строке. */
  unitScore(lessons: LessonNode[]): number | null {
    const scored = lessons.map(lesson => lesson.score).filter((score): score is number => score !== null);
    if (!scored.length) return null;
    return Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length);
  }

  /** Условие открытия locked-главы — почему она закрыта, не просто иконка замка. */
  lockedReason(unit: UnitNode, previous: UnitNode | undefined): string {
    if (!previous) return this.translate.instant('learning.map.lockedFirst');
    return this.translate.instant('learning.map.lockedAfter', {title: previous.title});
  }

  sceneUrl(index: number): string | null {
    return chapterSceneUrl(index);
  }

  private nowLessonId(): string | null {
    for (const unit of this.visibleUnits()) {
      const next = unit.lessons.find(lesson => lesson.status === 'AVAILABLE' && lesson.hasAccess);
      if (next) return next.id;
    }
    return null;
  }

  private nodeState(lesson: LessonNode, isNow: boolean): CourseNodeState {
    if (lesson.status === 'COMPLETED') return 'done';
    if (!lesson.hasAccess) return 'pro';
    if (lesson.status === 'LOCKED') return 'locked';
    if (lesson.type === 'STORY') return 'bonus';
    return isNow ? 'current' : 'open';
  }

  private glyph(lesson: LessonNode): string {
    if (lesson.type === 'STORY') return '話';
    const hangul = HANGUL.exec(lesson.title);
    return hangul ? hangul[0] : String(lesson.position);
  }

  private subtitle(lesson: LessonNode): string {
    if (lesson.status === 'COMPLETED') {
      return lesson.score !== null
        ? this.translate.instant('learning.map.nodeScore', {score: lesson.score})
        : this.translate.instant('learning.map.done');
    }
    if (!lesson.hasAccess) return this.translate.instant('learning.map.nodePro');
    if (lesson.status === 'LOCKED') return this.translate.instant('learning.map.nodeLocked');
    if (lesson.type === 'STORY') return this.translate.instant('learning.map.nodeStory');
    return this.translate.instant('learning.map.nodeXp', {xp: lesson.xpReward});
  }
}
