import {jest} from '@jest/globals';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MASCOT_CLIPS, Mascot3dComponent} from './mascot3d.component';
import type {MascotScene} from './mascot3d.scene';

describe('Mascot3dComponent', () => {
  let fixture: ComponentFixture<Mascot3dComponent>;
  let parent: HTMLDivElement;
  let intersect: IntersectionObserverCallback;
  let resize: ResizeObserverCallback;
  let mediaChange: () => void;
  let media: {matches: boolean; addEventListener: ReturnType<typeof jest.fn>; removeEventListener: ReturnType<typeof jest.fn>};
  let disconnectIntersection: ReturnType<typeof jest.fn>;
  let disconnectResize: ReturnType<typeof jest.fn>;
  let scene: MascotScene;
  const originalMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');
  const originalIntersection = globalThis.IntersectionObserver;
  const originalResize = globalThis.ResizeObserver;

  beforeEach(() => {
    scene = {
      play: jest.fn<(clip: string) => boolean>().mockReturnValue(true),
      resize: jest.fn(), rotateTo: jest.fn(), setMotion: jest.fn(), dispose: jest.fn(),
    };
    disconnectIntersection = jest.fn();
    disconnectResize = jest.fn();
    globalThis.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) { intersect = callback; }
      observe = jest.fn();
      disconnect = disconnectIntersection;
    } as unknown as typeof IntersectionObserver;
    globalThis.ResizeObserver = class {
      constructor(callback: ResizeObserverCallback) { resize = callback; }
      observe = jest.fn();
      disconnect = disconnectResize;
    } as unknown as typeof ResizeObserver;
    media = {
      matches: false,
      addEventListener: jest.fn((_event, callback) => { mediaChange = callback as () => void; }),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => media});
    jest.spyOn(Mascot3dComponent.prototype as any, 'createScene').mockResolvedValue(scene);
    fixture = TestBed.createComponent(Mascot3dComponent);
    parent = document.createElement('div');
    Object.defineProperties(parent, {
      clientWidth: {configurable: true, value: 600},
      clientHeight: {configurable: true, value: 400},
    });
    document.body.append(parent);
    parent.append(fixture.nativeElement);
  });

  afterEach(() => {
    fixture.destroy();
    parent.remove();
    jest.restoreAllMocks();
    globalThis.IntersectionObserver = originalIntersection;
    globalThis.ResizeObserver = originalResize;
    if (originalMatchMedia) Object.defineProperty(window, 'matchMedia', originalMatchMedia);
    else Reflect.deleteProperty(window, 'matchMedia');
  });

  async function show(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    intersect([{isIntersecting: true} as IntersectionObserverEntry], {} as IntersectionObserver);
    await fixture.whenStable();
  }

  it('shows the fallback until visible, loads once, and queues the requested animation', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toContain('/2d/neutral.webp');
    expect((fixture.componentInstance as any).createScene).not.toHaveBeenCalled();
    fixture.componentInstance.play('wave');
    fixture.componentInstance.rotateTo(0.5);
    await show();
    expect((fixture.componentInstance as any).createScene).toHaveBeenCalledTimes(1);
    expect(scene.play).toHaveBeenCalledWith('Wave', undefined);
    expect(scene.rotateTo).toHaveBeenCalledWith(0.5);
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    for (const animation of Object.keys(MASCOT_CLIPS) as (keyof typeof MASCOT_CLIPS)[]) {
      fixture.componentInstance.play(animation);
      expect((scene.play as jest.Mock).mock.lastCall?.[0]).toBe(MASCOT_CLIPS[animation]);
    }
    // Эмоции — замершие позы, а не цикл
    fixture.componentInstance.play('sad');
    expect(scene.play).toHaveBeenLastCalledWith('Sad', 23 / 47);
    fixture.componentInstance.play('celebrate');
    expect(scene.play).toHaveBeenLastCalledWith('Celebrate', undefined);
    (scene.play as jest.Mock).mockReturnValue(false);
    expect(fixture.componentInstance.play('sad')).toBe(false);
    expect(fixture.componentInstance.loaded()).toBe(true);
  });

  it('clamps movement, size changes and parent resize without accepting non-finite coordinates', async () => {
    await show();
    const mascot = fixture.componentInstance;
    mascot.moveTo(900, -30);
    expect(mascot.position()).toEqual({x: 360, y: 0});
    mascot.moveTo(300, 160);
    Object.defineProperty(parent, 'clientWidth', {value: 320});
    resize([], {} as ResizeObserver);
    expect(mascot.position()).toEqual({x: 80, y: 160});
    Object.defineProperty(parent, 'clientHeight', {value: 100});
    resize([], {} as ResizeObserver);
    expect(mascot.displaySize()).toBe(100);
    expect(mascot.position()).toEqual({x: 80, y: 0});
    mascot.moveTo(NaN, Infinity);
    expect(mascot.position()).toEqual({x: 80, y: 0});
    fixture.componentRef.setInput('size', 80);
    await fixture.whenStable();
    expect(mascot.displaySize()).toBe(80);
    expect(scene.resize).toHaveBeenLastCalledWith(80);
  });

  it('pauses autonomous animation for reduced motion and while off-screen', async () => {
    media.matches = true;
    await show();
    expect(scene.setMotion).toHaveBeenLastCalledWith(false);
    expect(fixture.nativeElement.classList.contains('reduced-motion')).toBe(true);
    media.matches = false;
    mediaChange();
    await fixture.whenStable();
    expect(scene.setMotion).toHaveBeenLastCalledWith(true);
    intersect([{isIntersecting: false} as IntersectionObserverEntry], {} as IntersectionObserver);
    await fixture.whenStable();
    expect(scene.setMotion).toHaveBeenLastCalledWith(false);
    expect(scene.dispose).not.toHaveBeenCalled();
  });

  it('supports opt-in pointer and keyboard rotation with a localized accessible label', async () => {
    await show();
    const target = fixture.nativeElement.querySelector('.mascot3d') as HTMLElement;
    expect(target.hasAttribute('tabindex')).toBe(false);
    fixture.componentRef.setInput('allowRotation', true);
    await fixture.whenStable();
    expect(target.getAttribute('tabindex')).toBe('0');
    expect(target.getAttribute('aria-label')).toContain('стрелки');
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect(scene.rotateTo).toHaveBeenLastCalledWith(Math.PI / 12);
    target.dispatchEvent(new KeyboardEvent('keydown', {key: 'Home', bubbles: true}));
    expect(scene.rotateTo).toHaveBeenLastCalledWith(0);
    target.setPointerCapture = jest.fn();
    fixture.componentInstance.onPointerDown({isPrimary: true, button: 0, pointerId: 1, clientX: 20, currentTarget: target} as unknown as PointerEvent);
    fixture.componentInstance.onPointerMove({pointerId: 1, clientX: 50} as PointerEvent);
    expect(scene.rotateTo).toHaveBeenLastCalledWith(0.3);
    fixture.componentInstance.onPointerEnd();
    fixture.componentInstance.onPointerMove({pointerId: 1, clientX: 60} as PointerEvent);
    expect(scene.rotateTo).toHaveBeenLastCalledWith(0.3);
  });

  it('keeps the fallback on load error, retries a changed source and handles context loss', async () => {
    (fixture.componentInstance as any).createScene.mockRejectedValueOnce(new Error('no WebGL'));
    await show();
    expect(fixture.componentInstance.loaded()).toBe(false);
    expect(fixture.nativeElement.querySelector('img')).not.toBeNull();
    fixture.componentRef.setInput('src', '/replacement.glb');
    await fixture.whenStable();
    expect(fixture.componentInstance.loaded()).toBe(true);
    fixture.nativeElement.querySelector('canvas').dispatchEvent(new Event('webglcontextlost', {cancelable: true}));
    await fixture.whenStable();
    expect(fixture.componentInstance.loaded()).toBe(false);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes observers, media listener and the renderer on destroy', async () => {
    await show();
    fixture.destroy();
    expect(disconnectIntersection).toHaveBeenCalledTimes(1);
    expect(disconnectResize).toHaveBeenCalledTimes(1);
    expect(media.removeEventListener).toHaveBeenCalledWith('change', mediaChange);
    expect(scene.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes a late async load instead of installing it after destroy', async () => {
    let finish!: (scene: MascotScene) => void;
    (fixture.componentInstance as any).createScene.mockReturnValue(new Promise<MascotScene>(resolve => { finish = resolve; }));
    await show();
    fixture.destroy();
    finish(scene);
    await Promise.resolve();
    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(scene.setMotion).not.toHaveBeenCalled();
  });

  it('disposes a replaced source that finishes after the current model', async () => {
    let finish!: (scene: MascotScene) => void;
    const oldScene = {...scene, dispose: jest.fn(), setMotion: jest.fn()};
    (fixture.componentInstance as any).createScene.mockReturnValueOnce(new Promise<MascotScene>(resolve => { finish = resolve; }));
    await show();
    const isCurrent = (fixture.componentInstance as any).createScene.mock.calls[0][2] as () => boolean;
    expect(isCurrent()).toBe(true);
    fixture.componentRef.setInput('src', '/new-model.glb');
    await fixture.whenStable();
    expect(isCurrent()).toBe(false);
    expect(fixture.componentInstance.loaded()).toBe(true);
    finish(oldScene);
    await Promise.resolve();
    expect(oldScene.dispose).toHaveBeenCalledTimes(1);
    expect(oldScene.setMotion).not.toHaveBeenCalled();
    expect(scene.dispose).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loaded()).toBe(true);
  });
});
