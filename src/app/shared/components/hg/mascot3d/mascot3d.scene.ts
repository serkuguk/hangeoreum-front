import type {AnimationAction, Material, Mesh, SkinnedMesh, Texture} from 'three';

export interface MascotScene {
  /** `holdAt` (0..1) — сыграть клип один раз и замереть на этой доле длительности; без него — цикл. */
  play(clip: string, holdAt?: number): boolean;
  rotateTo(radians: number): void;
  resize(size: number): void;
  setMotion(enabled: boolean): void;
  dispose(): void;
}

/** Loaded only once the component is visible; no Three.js code enters the shared UI barrel. */
export async function createMascotScene(
  canvas: HTMLCanvasElement, src: string, isCurrent: () => boolean = () => true,
): Promise<MascotScene> {
  const [THREE, {GLTFLoader}] = await Promise.all([
    import('three'), import('three/addons/loaders/GLTFLoader.js'),
  ]);
  if (!isCurrent()) throw new Error('Mascot load cancelled');
  const gltf = await new GLTFLoader().loadAsync(src);
  const model = gltf.scene;
  const geometries = new Set<Mesh['geometry']>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const bitmaps = new Set<ImageBitmap>();
  const skeletons = new Set<SkinnedMesh['skeleton']>();
  model.traverse(object => {
    const mesh = object as Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    for (const material of mesh.material ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) : []) {
      materials.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          textures.add(value);
          if (typeof ImageBitmap !== 'undefined' && value.source.data instanceof ImageBitmap) bitmaps.add(value.source.data);
        }
      }
    }
    const skeleton = (object as SkinnedMesh).skeleton;
    if (skeleton) skeletons.add(skeleton);
  });
  const releaseModel = (): void => {
    geometries.forEach(value => value.dispose());
    materials.forEach(value => value.dispose());
    textures.forEach(value => value.dispose());
    skeletons.forEach(value => value.dispose());
    bitmaps.forEach(value => value.close());
  };
  if (!isCurrent()) {
    releaseModel();
    throw new Error('Mascot load cancelled');
  }
  let renderer: InstanceType<typeof THREE.WebGLRenderer>;
  try {
    renderer = new THREE.WebGLRenderer({canvas, alpha: true, antialias: true});
  } catch (error) {
    releaseModel();
    throw error;
  }
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x777788, 2.5));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 5, 4);
    scene.add(light);
    const bounds = new THREE.Box3().setFromObject(model);
    const center = bounds.getCenter(new THREE.Vector3());
    const extent = bounds.getSize(new THREE.Vector3());
    model.position.sub(center);
    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    const radius = Math.max(extent.x, extent.y, extent.z, 0.01);
    camera.position.set(0, radius * 0.08, radius * 2.2);
    camera.lookAt(0, 0, 0);
    const mixer = new THREE.AnimationMixer(model);
    let current: AnimationAction | undefined;
    let motion = false;
    let disposed = false;
    let frame: number | undefined;
    let previous = 0;
    let holdTime: number | undefined;
    const render = (): void => renderer.render(scene, camera);
    const tick = (time: number): void => {
      if (disposed || !motion) return;
      mixer.update(previous ? Math.min((time - previous) / 1000, 0.1) : 0);
      if (current && holdTime !== undefined && current.time >= holdTime) {
        current.time = holdTime;
        current.paused = true;
      }
      previous = time;
      render();
      frame = requestAnimationFrame(tick);
    };
    render();
    return {
      play(name, holdAt) {
        const clip = THREE.AnimationClip.findByName(gltf.animations, name);
        if (!clip || disposed) return false;
        const next = mixer.clipAction(clip);
        const nextHold = holdAt === undefined ? undefined : clip.duration * holdAt;
        if (next === current && nextHold === holdTime) return true;
        holdTime = nextHold;
        // Эмоция-поза должна читаться сразу: доходим до удерживаемого кадра за ~0.4 с.
        const speed = holdTime === undefined ? 1 : Math.max(1, holdTime / 0.4);
        next.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1).play();
        // Без анимации (reduced motion / вне экрана) сразу показываем удерживаемую позу.
        if (holdTime !== undefined && !motion) next.time = holdTime;
        if (current && current !== next && motion) current.crossFadeTo(next, 0.2, false);
        else if (current !== next) current?.stop();
        current = next;
        mixer.update(0);
        render();
        return true;
      },
      rotateTo(radians) {
        if (disposed) return;
        pivot.rotation.y = radians;
        render();
      },
      resize(size) {
        if (disposed) return;
        renderer.setSize(size, size, false);
        render();
      },
      setMotion(enabled) {
        if (disposed || enabled === motion) return;
        motion = enabled;
        previous = 0;
        if (frame !== undefined) cancelAnimationFrame(frame);
        frame = undefined;
        if (motion) frame = requestAnimationFrame(tick);
        else render();
      },
      dispose() {
        if (disposed) return;
        disposed = true;
        if (frame !== undefined) cancelAnimationFrame(frame);
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        releaseModel();
        renderer.dispose();
        scene.clear();
      },
    };
  } catch (error) {
    releaseModel();
    renderer.dispose();
    throw error;
  }
}
