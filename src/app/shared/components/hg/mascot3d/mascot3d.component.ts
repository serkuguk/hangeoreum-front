import {
  afterNextRender, booleanAttribute, ChangeDetectionStrategy, Component, computed,
  effect, ElementRef, inject, input, OnDestroy, signal, untracked, viewChild,
} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import type {MascotScene} from './mascot3d.scene';

export const MASCOT_CLIPS = {
  idle: 'Idle', wave: 'Wave', walk: 'Walk', point: 'Point', celebrate: 'Celebrate', sad: 'Sad',
  think: 'Wave', happy: 'Celebrate',
} as const;
export type MascotAnimation = keyof typeof MASCOT_CLIPS;

/**
 * Эмоции-позы: клип играется один раз и замирает на кадре (build_loopy.py, 48 кадров,
 * кадр f = (f-1)/47): think = Wave 24 — лапка у лица (в Point рука уходит в сторону),
 * happy = Celebrate 24 — лапки у щёк, sad = Sad 24 — голова опущена.
 * Sad в цикле читался бы как кивок «да».
 */
const frame = (f: number): number => (f - 1) / 47;
const MASCOT_HOLDS: Partial<Record<MascotAnimation, number>> = {
  think: frame(24), happy: frame(24), sad: frame(24),
};

/** 2D-кадр с той же эмоцией, пока грузится 3D (или если WebGL недоступен). */
const MASCOT_FALLBACKS: Record<MascotAnimation, string> = {
  idle: 'neutral', wave: 'hello', walk: 'neutral', point: 'pointing', celebrate: 'happy', sad: 'sad',
  think: 'thinking', happy: 'happy',
};

@Component({
  selector: 'hg-mascot3d',
  imports: [TranslatePipe],
  templateUrl: './mascot3d.component.html',
  styleUrl: './mascot3d.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.width.px]': 'displaySize()',
    '[style.height.px]': 'displaySize()',
    '[style.transform]': 'translation()',
    '[class.reduced-motion]': 'reducedMotion()',
  },
})
export class Mascot3dComponent implements OnDestroy {
  readonly src = input('assets/zanmang-loopy/3d/zanmang_loopy.glb');
  /** Пустая строка — кадр подбирается по `animation`. */
  readonly fallbackSrc = input('');
  readonly animation = input<MascotAnimation>('idle');
  readonly size = input(240);
  readonly allowRotation = input(false, {transform: booleanAttribute});
  readonly loaded = signal(false);
  readonly reducedMotion = signal(false);
  readonly position = signal({x: 0, y: 0});
  readonly displaySize = signal(240);
  readonly fallback = computed(() =>
    this.fallbackSrc() || `assets/zanmang-loopy/2d/${MASCOT_FALLBACKS[this.animation()]}.webp`);
  readonly translation = computed(() => `translate(${this.position().x}px, ${this.position().y}px)`);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly visible = signal(false);
  private readonly initialized = signal(false);
  private scene?: MascotScene;
  private generation = 0;
  private activeSrc?: string;
  private destroyed = false;
  private clip: MascotAnimation = 'idle';
  private rotation = 0;
  private pointer?: {id: number; x: number};
  private intersection?: IntersectionObserver;
  private resize?: ResizeObserver;
  private media?: MediaQueryList;

  constructor() {
    afterNextRender(() => {
      // ponytail: jsdom (тесты страниц-хостов) не знает matchMedia/ResizeObserver — без них просто без реакции
      this.media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
      this.onMotionChange();
      this.media?.addEventListener('change', this.onMotionChange);
      if (typeof ResizeObserver !== 'undefined') this.resize = new ResizeObserver(() => this.fit());
      if (this.host.nativeElement.parentElement) this.resize?.observe(this.host.nativeElement.parentElement);
      this.fit();
      if (typeof IntersectionObserver === 'undefined') {
        this.visible.set(true);
      } else {
        this.intersection = new IntersectionObserver(entries => {
          this.visible.set(entries.some(entry => entry.isIntersecting));
        });
        this.intersection.observe(this.host.nativeElement);
      }
      this.initialized.set(true);
    });
    effect(() => {
      const src = this.src();
      if (this.initialized()) untracked(() => void this.load(src));
    });
    effect(() => {
      const visible = this.visible();
      const reduced = this.reducedMotion();
      const src = this.src();
      if (visible && this.initialized() && !this.scene) untracked(() => void this.load(src));
      this.scene?.setMotion(visible && !reduced);
    });
    effect(() => {
      const animation = this.animation();
      untracked(() => this.play(animation));
    });
    effect(() => {
      this.size();
      if (this.initialized()) untracked(() => this.fit());
    });
  }

  /** Returns false when the loaded model has no matching clip. Calls before load are queued. */
  play(animation: MascotAnimation): boolean {
    this.clip = animation;
    return this.scene?.play(MASCOT_CLIPS[animation], MASCOT_HOLDS[animation]) ?? false;
  }

  rotateTo(radians: number): void {
    if (!Number.isFinite(radians)) return;
    this.rotation = radians;
    this.scene?.rotateTo(radians);
  }

  /** Coordinates are pixels from the positioned parent's top-left corner. */
  moveTo(x: number, y: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const parent = this.host.nativeElement.parentElement;
    const size = this.displaySize();
    this.position.set({
      x: Math.max(0, Math.min(x, (parent?.clientWidth ?? size) - size)),
      y: Math.max(0, Math.min(y, (parent?.clientHeight ?? size) - size)),
    });
  }

  onPointerDown(event: PointerEvent): void {
    if (!this.allowRotation() || !event.isPrimary || event.button !== 0) return;
    this.pointer = {id: event.pointerId, x: event.clientX};
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.allowRotation() || this.pointer?.id !== event.pointerId) return;
    this.rotateTo(this.rotation + (event.clientX - this.pointer.x) * 0.01);
    this.pointer.x = event.clientX;
  }

  onPointerEnd(): void {
    this.pointer = undefined;
  }

  onKeyDown(event: KeyboardEvent): void {
    if (!this.allowRotation()) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.rotateTo(this.rotation + (event.key === 'ArrowLeft' ? -1 : 1) * Math.PI / 12);
    } else if (event.key === 'Home') {
      event.preventDefault();
      this.rotateTo(0);
    }
  }

  onContextLost(event: Event): void {
    event.preventDefault();
    this.generation++;
    this.scene?.dispose();
    this.scene = undefined;
    this.loaded.set(false);
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.generation++;
    this.intersection?.disconnect();
    this.resize?.disconnect();
    this.media?.removeEventListener('change', this.onMotionChange);
    this.scene?.dispose();
    this.scene = undefined;
  }

  protected async createScene(canvas: HTMLCanvasElement, src: string, isCurrent: () => boolean): Promise<MascotScene> {
    const {createMascotScene} = await import('./mascot3d.scene');
    return createMascotScene(canvas, src, isCurrent);
  }

  private readonly onMotionChange = (): void => {
    this.reducedMotion.set(this.media?.matches ?? false);
  };

  private fit(): void {
    const parent = this.host.nativeElement.parentElement;
    const requested = Number.isFinite(this.size()) ? Math.max(1, this.size()) : 240;
    this.displaySize.set(Math.max(1, Math.min(requested, parent?.clientWidth || requested, parent?.clientHeight || requested)));
    this.moveTo(this.position().x, this.position().y);
    this.scene?.resize(this.displaySize());
  }

  private async load(src: string): Promise<void> {
    if (this.destroyed || this.activeSrc === src) return;
    const generation = ++this.generation;
    this.scene?.dispose();
    this.scene = undefined;
    this.loaded.set(false);
    this.activeSrc = undefined;
    if (!this.visible() || !src) return;
    this.activeSrc = src;
    try {
      const scene = await this.createScene(this.canvas().nativeElement, src,
        () => !this.destroyed && generation === this.generation);
      if (this.destroyed || generation !== this.generation) {
        scene.dispose();
        return;
      }
      this.scene = scene;
      scene.resize(this.displaySize());
      scene.rotateTo(this.rotation);
      scene.play(MASCOT_CLIPS[this.clip], MASCOT_HOLDS[this.clip]);
      scene.setMotion(this.visible() && !this.reducedMotion());
      this.loaded.set(true);
    } catch {
      if (!this.destroyed && generation === this.generation) this.loaded.set(false);
    }
  }
}
