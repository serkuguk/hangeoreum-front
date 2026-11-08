import {jest} from '@jest/globals';
import * as Three from 'three';
import {createMascotScene} from './mascot3d.scene';

const renderer = {setPixelRatio: jest.fn(), setSize: jest.fn(), render: jest.fn(), dispose: jest.fn()};
const loadAsync = jest.fn<() => Promise<{scene: Three.Group; animations: Three.AnimationClip[]}>>();
const rendererConstructor = jest.fn().mockImplementation(() => renderer);
jest.unstable_mockModule('three', () => ({...Three, WebGLRenderer: rendererConstructor}));
jest.unstable_mockModule('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class { loadAsync = loadAsync; },
}));

describe('Mascot3d scene lifecycle', () => {
  let model: Three.Group;
  let geometry: Three.BoxGeometry;
  let material: Three.MeshStandardMaterial;
  let texture: Three.Texture;
  let frames: Map<number, FrameRequestCallback>;
  let frameId: number;

  beforeEach(() => {
    jest.clearAllMocks();
    geometry = new Three.BoxGeometry(1, 1, 1);
    texture = new Three.Texture();
    material = new Three.MeshStandardMaterial({map: texture});
    model = new Three.Group();
    model.add(new Three.Mesh(geometry, material));
    const track = new Three.NumberKeyframeTrack('.rotation[y]', [0, 1], [0, 1]);
    loadAsync.mockResolvedValue({
      scene: model,
      animations: ['Idle', 'Wave'].map(name => new Three.AnimationClip(name, 1, [track])),
    });
    frames = new Map();
    frameId = 0;
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
      frames.set(++frameId, callback);
      return frameId;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  });

  afterEach(() => jest.restoreAllMocks());

  it('crossfades named clips, leaves the current action on an unavailable clip, and freezes reduced motion', async () => {
    const crossFade = jest.spyOn(Three.AnimationAction.prototype, 'crossFadeTo');
    const update = jest.spyOn(Three.AnimationMixer.prototype, 'update');
    const scene = await createMascotScene(document.createElement('canvas'), '/loopy.glb');
    expect(scene.play('Idle')).toBe(true);
    expect(scene.play('Missing')).toBe(false);
    expect(crossFade).not.toHaveBeenCalled();
    scene.setMotion(true);
    expect(scene.play('Wave')).toBe(true);
    expect(crossFade).toHaveBeenCalledWith(expect.any(Three.AnimationAction), 0.2, false);
    expect(scene.play('Wave')).toBe(true);
    expect(crossFade).toHaveBeenCalledTimes(1);
    frames.get(frameId)!(1000);
    frames.get(frameId)!(1100);
    expect(update).toHaveBeenLastCalledWith(0.1);
    scene.setMotion(false);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(frameId);
    const count = update.mock.calls.length;
    scene.rotateTo(1);
    scene.resize(120);
    expect(renderer.setSize).toHaveBeenLastCalledWith(120, 120, false);
    expect(update.mock.calls.length).toBe(count);
    scene.dispose();
  });

  it('with holdAt plays once and holds the mid-pose instead of looping back (no "nodding")', async () => {
    const droop = new Three.NumberKeyframeTrack('.rotation[x]', [0, 1, 2], [0, 1, 0]);
    loadAsync.mockResolvedValue({scene: model, animations: [new Three.AnimationClip('Sad', 2, [droop])]});
    const scene = await createMascotScene(document.createElement('canvas'), '/loopy.glb');
    scene.play('Sad', 0.5);
    expect(model.rotation.x).toBeCloseTo(1); // reduced motion: static frame is already the drooped pose
    scene.setMotion(true);
    for (let time = 1000; time <= 4000; time += 100) frames.get(frameId)!(time);
    expect(model.rotation.x).toBeCloseTo(1);
    scene.dispose();
  });

  it('cancels RAF and disposes GPU resources and mixer exactly once', async () => {
    const disposeGeometry = jest.spyOn(geometry, 'dispose');
    const disposeMaterial = jest.spyOn(material, 'dispose');
    const disposeTexture = jest.spyOn(texture, 'dispose');
    const stop = jest.spyOn(Three.AnimationMixer.prototype, 'stopAllAction');
    const uncache = jest.spyOn(Three.AnimationMixer.prototype, 'uncacheRoot');
    const scene = await createMascotScene(document.createElement('canvas'), '/loopy.glb');
    scene.setMotion(true);
    scene.dispose();
    scene.dispose();
    expect(cancelAnimationFrame).toHaveBeenCalledWith(frameId);
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
    expect(uncache).toHaveBeenCalledWith(model);
  });

  it('releases loaded model resources if WebGL initialization fails', async () => {
    const disposeGeometry = jest.spyOn(geometry, 'dispose');
    const disposeTexture = jest.spyOn(texture, 'dispose');
    rendererConstructor.mockImplementationOnce(() => { throw new Error('WebGL unavailable'); });
    await expect(createMascotScene(document.createElement('canvas'), '/loopy.glb')).rejects.toThrow('WebGL unavailable');
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
  });

  it('never renders a stale model when B finishes before A with motion disabled', async () => {
    let finishA!: (value: {scene: Three.Group; animations: Three.AnimationClip[]}) => void;
    let finishB!: (value: {scene: Three.Group; animations: Three.AnimationClip[]}) => void;
    loadAsync
      .mockImplementationOnce(() => new Promise(resolve => { finishA = resolve; }))
      .mockImplementationOnce(() => new Promise(resolve => { finishB = resolve; }));
    const canvas = document.createElement('canvas');
    let generation = 1;
    const loadingA = createMascotScene(canvas, '/a.glb', () => generation === 1);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(loadAsync).toHaveBeenCalledTimes(1);
    generation = 2;
    const loadingB = createMascotScene(canvas, '/b.glb', () => generation === 2);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(loadAsync).toHaveBeenCalledTimes(2);
    finishB({scene: new Three.Group(), animations: []});
    const sceneB = await loadingB;
    sceneB.setMotion(false);
    const renderedFrames = renderer.render.mock.calls.length;
    expect(rendererConstructor).toHaveBeenCalledTimes(1);
    const disposeGeometry = jest.spyOn(geometry, 'dispose');
    const disposeMaterial = jest.spyOn(material, 'dispose');
    const disposeTexture = jest.spyOn(texture, 'dispose');
    finishA({scene: model, animations: []});
    await expect(loadingA).rejects.toThrow('Mascot load cancelled');
    expect(rendererConstructor).toHaveBeenCalledTimes(1);
    expect(renderer.render).toHaveBeenCalledTimes(renderedFrames);
    expect(renderer.dispose).not.toHaveBeenCalled();
    expect(disposeGeometry).toHaveBeenCalledTimes(1);
    expect(disposeMaterial).toHaveBeenCalledTimes(1);
    expect(disposeTexture).toHaveBeenCalledTimes(1);
    expect(requestAnimationFrame).not.toHaveBeenCalled();
    sceneB.dispose();
  });
});
