// 아이콘 촬영기: 3D 모델(표본·지구인·기체)을 작은 정사각형 그림으로 찍어 UI 카드·보고서에 쓴다.
// 게임 화면과 다른 WebGL 캔버스를 하나 따로 쓴다(그림을 읽어 내야 하므로 preserveDrawingBuffer).
import { THREE } from './kit.js';
import { createUfo, UFO_TILT } from './ufo3d.js';
import { createWatcher } from './people3d.js';
import { createSpecimen } from './specimens3d.js';

const MAX_PX = 256;
let studio = null;

function setup() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MAX_PX;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#c4e0ff', '#9aa6c8', 1.1));
  const sun = new THREE.DirectionalLight('#fff0d6', 2.2);
  sun.position.set(-3, 5, 6);
  scene.add(sun);
  // 금속(기체)에 비칠 밝은 하늘
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#8fc4ff');
  const env = pmrem.fromScene(envScene, 0.04);
  scene.environment = env.texture;
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 100);
  studio = { canvas, renderer, scene, camera, holder: new THREE.Group() };
  scene.add(studio.holder);
  return studio;
}

const box = new THREE.Box3();
const sphere = new THREE.Sphere();

/** 물체를 정면 살짝 위에서 화면에 꽉 차게 찍는다. */
function shoot(object, px, { fill = 0.86, lift = 0.18 } = {}) {
  const s = studio || setup();
  const { renderer, scene, camera, holder } = s;
  holder.clear();
  holder.add(object);
  object.updateMatrixWorld(true);
  box.makeEmpty();
  // 크기는 몸체(메시)로만 잰다. 빛 번짐 스프라이트·반투명 꼬리까지 넣으면 그림이 작게 찍힌다.
  object.traverse((o) => {
    if (!o.isMesh || !o.visible || o.name === 'outline') return;
    const m = o.material;
    if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.5))) return;
    box.expandByObject(o);
  });
  box.getBoundingSphere(sphere);
  const r = Math.max(sphere.radius, 1e-3);
  const dist = r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / fill;
  const dir = new THREE.Vector3(0, lift, 1).normalize();
  camera.position.copy(sphere.center).addScaledVector(dir, dist);
  camera.lookAt(sphere.center);
  camera.updateProjectionMatrix();
  renderer.setSize(px, px, false);
  renderer.render(scene, camera);
  holder.clear();
  return s.canvas;
}

/**
 * 아이콘 한 장을 2D 캔버스로 찍는다. 찍을 수 없는 종류면 null.
 * @param {'specimen'|'watcher'|'form'} kind
 * @param {{mood?: string, look?: number, wave?: boolean, shock?: boolean, walk?: number, t?: number}} [o]
 *   form: mood = 피포 표정, look = 1 이면 보는 사람(카메라)을 본다. watcher: 자세.
 */
export function renderIcon3d(kind, id, px, o = {}) {
  const size = Math.min(MAX_PX, Math.max(32, Math.round(px)));
  let object = null;
  let opts = {};
  if (kind === 'specimen') {
    const sp = createSpecimen(id);
    sp.update(0.4, 1);
    object = sp.root;
    opts = { fill: 0.9, lift: 0.12 };
  } else if (kind === 'watcher') {
    const w = createWatcher(id);
    w.root.position.set(0, 0, 0);
    w.update({ t: o.t ?? 0.25, dir: 1, walk: o.walk ?? 0, look: o.look ?? 0.35, shock: !!o.shock, wave: !!o.wave, target: new THREE.Vector3(0.6, 3, 2) });
    object = w.root;
    opts = { fill: 0.92, lift: 0.1 };
  } else if (kind === 'form') {
    const u = createUfo(Number(id));
    u.root.rotation.x = UFO_TILT;
    u.root.updateMatrixWorld(true);
    u.update({ t: o.t ?? 0.6, mood: o.mood || 'idle', lit: o.lit ?? 1, beam: 0, look: o.look ? new THREE.Vector3(0, 0.4, 10) : undefined });
    object = u.root;
    opts = { fill: 0.95, lift: 0.05 };
  }
  if (!object) return null;
  const glCanvas = shoot(object, size, opts);
  // WebGL 캔버스는 다음 촬영 때 지워지므로 2D 캔버스에 옮겨 둔다
  const out = document.createElement('canvas');
  out.width = out.height = size;
  out.getContext('2d').drawImage(glCanvas, 0, 0, size, size);
  return out;
}
