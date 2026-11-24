// 아이콘 촬영기: 3D 모델(표본·지구인·기체)을 작은 정사각형 그림으로 찍어 UI 카드·보고서에 쓴다.
// 게임 화면과 다른 WebGL 캔버스를 하나 따로 쓴다(그림을 읽어 내야 하므로 preserveDrawingBuffer).
import { THREE } from './kit.js';
import { createUfo, UFO_TILT } from './ufo3d.js';
import { createWatcher } from './people3d.js';
import { createSpecimen } from './specimens3d.js';
import { createPipo } from './pipo.js';
import { makeBeamCone } from './beams.js';

const MAX_PX = 480;
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

/** 물체를 감싸는 상자(몸체 메시로만 잰다. 빛 번짐 스프라이트·반투명 꼬리까지 넣으면 그림이 작게 찍힌다). */
function measure(object, out = box) {
  object.updateMatrixWorld(true);
  out.makeEmpty();
  object.traverse((o) => {
    if (!o.isMesh || !o.visible || o.name === 'outline') return;
    const m = o.material;
    if (m && (m.blending === THREE.AdditiveBlending || (m.transparent && m.opacity < 0.5))) return;
    out.expandByObject(o);
  });
  return out;
}

/** 물체를 정면 살짝 위에서 화면에 꽉 차게 찍는다. frame = 직접 정한 화면 틀(Box3, 없으면 물체 크기). */
function shoot(object, px, { fill = 0.86, lift = 0.18, frame = null } = {}) {
  const s = studio || setup();
  const { renderer, scene, camera, holder } = s;
  holder.clear();
  holder.add(object);
  if (frame) {
    object.updateMatrixWorld(true);
    // 틀의 가로·세로 중 긴 쪽이 화면에 꽉 차게(대각선으로 재면 너무 작게 찍힌다)
    frame.getCenter(sphere.center);
    const sz = frame.getSize(new THREE.Vector3());
    sphere.radius = Math.max(sz.x, sz.y) / 2;
  } else {
    measure(object);
    box.getBoundingSphere(sphere);
  }
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

/** 'outfit=bee;paint=honey;beam=honey;deco=wings;form=2;beamOn=1' → 모습 묶음. */
function parseLook(str) {
  const out = {};
  for (const pair of String(str).split(/[;,]/)) {
    const [k, v] = pair.split('=');
    if (k && v != null) out[k.trim()] = v.trim();
  }
  return out;
}

/** 모습 묶음을 모두 갖춘 기체(빔을 켜면 아래로 빔 원뿔). 상점의 세트·미리보기 그림. */
function lookShot(look, o) {
  const t = o.t ?? 0.6;
  const g = new THREE.Group();
  const form = Number(look.form ?? 2);
  const u = createUfo(form, { outfit: look.outfit, paint: look.paint, beam: look.beam, deco: look.deco });
  u.root.rotation.x = UFO_TILT;
  const beamOn = look.beamOn === '1';
  u.update({ t, mood: o.mood || look.mood || 'happy', lit: 1, beam: beamOn ? 1 : 0, look: new THREE.Vector3(0, 0.4, 10) });
  u.update({ t: t + 0.01, mood: o.mood || look.mood || 'happy', lit: 1, beam: beamOn ? 1 : 0, look: new THREE.Vector3(0, 0.4, 10) });
  g.add(u.root);
  g.updateMatrixWorld(true);
  const frame = measure(u.root, new THREE.Box3());
  if (beamOn) {
    const belly = new THREE.Vector3(0, u.bellyY, 0).applyMatrix4(u.root.matrixWorld);
    const len = u.halfWidth * 1.15;
    const cone = makeBeamCone(look.beam || 'cyan', { additive: false, t });
    cone.position.copy(belly);
    cone.rotation.x = Math.PI;
    cone.scale.set(u.halfWidth * 0.55, len, u.halfWidth * 0.55);
    g.add(cone);
    frame.min.y = Math.min(frame.min.y, belly.y - len);
  }
  return { object: g, opts: { frame, fill: 0.94, lift: 0.08 } };
}

/**
 * 꾸미기 아이콘의 물체와 화면 틀. id = 'outfit:bunny' | 'paint:galaxy' | 'beam:rainbow' | 'deco:wings' | 'look:outfit=bee;paint=honey;...'.
 *   outfit: 의상을 입은 피포 가슴 위 모습(카메라를 본다), paint: 그 도색의 2형태 기체, beam: 그 빔을 쏘는 1형태 기체,
 *   deco: 그 장식을 단 2형태 기체, look: 모습 묶음을 모두 갖춘 기체(세트·미리보기).
 */
function cosmeticShot(id, o) {
  const str = String(id);
  const cut = str.indexOf(':');
  const kind = str.slice(0, cut);
  const cid = str.slice(cut + 1);
  if (kind === 'look') return lookShot(parseLook(cid), o);
  if (kind === 'deco') {
    const u = createUfo(2, { deco: cid });
    u.root.rotation.x = UFO_TILT;
    u.update({ t: o.t ?? 0.6, mood: o.mood || 'idle', lit: 1, beam: 0, look: new THREE.Vector3(0, 0.4, 10) });
    u.update({ t: (o.t ?? 0.6) + 0.01, mood: o.mood || 'idle', lit: 1, beam: 0, look: new THREE.Vector3(0, 0.4, 10) });
    return { object: u.root, opts: { frame: measure(u.root, new THREE.Box3()), fill: 0.92, lift: 0.1 } };
  }
  if (kind === 'outfit') {
    const p = createPipo(1, { outfit: cid });
    const mood = o.mood || 'idle';
    p.update({ t: 0, mood });
    p.update({ t: o.t ?? 1.6, mood, look: new THREE.Vector3(0, 1.3, 12) });
    // 가슴 위: 머리·모자·더듬이는 다 넣고 몸은 배꼽 위까지
    const frame = measure(p.group, new THREE.Box3());
    frame.min.y = Math.max(frame.min.y, -0.5);
    const w = Math.max(Math.abs(frame.min.x), Math.abs(frame.max.x));
    frame.min.x = -w;
    frame.max.x = w;
    return { object: p.group, opts: { frame, fill: 0.94, lift: 0.1 } };
  }
  if (kind === 'paint') {
    const u = createUfo(2, { paint: cid });
    u.root.rotation.x = UFO_TILT;
    u.root.updateMatrixWorld(true);
    u.update({ t: o.t ?? 0.6, mood: o.mood || 'idle', lit: 1, beam: 0, look: new THREE.Vector3(0, 0.4, 10) });
    // 납작한 기체는 감싸는 구로 재면 작게 찍힌다. 가로·세로 틀로 꽉 채운다
    return { object: u.root, opts: { frame: measure(u.root, new THREE.Box3()), fill: 0.9, lift: 0.08 } };
  }
  if (kind === 'beam') {
    const t = o.t ?? 0.6;
    const g = new THREE.Group();
    const u = createUfo(1, { beam: cid });
    u.root.rotation.x = UFO_TILT;
    u.update({ t, mood: o.mood || 'happy', lit: 1, beam: 1, look: new THREE.Vector3(0, 0.4, 10) });
    g.add(u.root);
    g.updateMatrixWorld(true);
    const belly = new THREE.Vector3(0, u.bellyY, 0).applyMatrix4(u.root.matrixWorld);
    const len = 1.05;
    // 아이콘은 투명 바탕이라 덧그리기 대신 보통 반투명으로(색이 배경 없이도 남게)
    const cone = makeBeamCone(cid, { additive: false, t });
    cone.position.copy(belly);
    cone.rotation.x = Math.PI;
    cone.scale.set(0.5, len, 0.5);
    g.add(cone);
    const frame = measure(u.root, new THREE.Box3());
    frame.min.y = Math.min(frame.min.y, belly.y - len);
    return { object: g, opts: { frame, fill: 0.95, lift: 0.05 } };
  }
  return null;
}

/**
 * 아이콘 한 장을 2D 캔버스로 찍는다. 찍을 수 없는 종류면 null.
 * @param {'specimen'|'watcher'|'form'|'cosmetic'} kind  cosmetic: id = 'outfit:bunny' | 'paint:galaxy' | 'beam:rainbow'
 * @param {{mood?: string, look?: number, wave?: boolean, shock?: boolean, walk?: number, t?: number}} [o]
 *   form·cosmetic: mood = 피포 표정, look = 1 이면 보는 사람(카메라)을 본다. watcher: 자세.
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
  } else if (kind === 'cosmetic') {
    const c = cosmeticShot(id, o);
    if (c) ({ object, opts } = c);
  }
  if (!object) return null;
  const glCanvas = shoot(object, size, opts);
  // WebGL 캔버스는 다음 촬영 때 지워지므로 2D 캔버스에 옮겨 둔다
  const out = document.createElement('canvas');
  out.width = out.height = size;
  out.getContext('2d').drawImage(glCanvas, 0, 0, size, size);
  return out;
}
