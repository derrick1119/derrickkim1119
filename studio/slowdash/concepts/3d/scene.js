import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
const TiltShift = { uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, amount: { value: 1.5 }, top: { value: new THREE.Vector2(0.66, 0.95) }, bottom: { value: 0.5 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 dir; uniform float amount; uniform vec2 top; uniform float bottom; varying vec2 vUv;
  void main(){ float t = smoothstep(top.x, top.y, vUv.y) + bottom * smoothstep(0.14, 0.0, vUv.y); float r = amount * t;
    vec4 s = texture2D(tDiffuse, vUv) * 0.227027;
    s += (texture2D(tDiffuse, vUv + dir * r) + texture2D(tDiffuse, vUv - dir * r)) * 0.1945946;
    s += (texture2D(tDiffuse, vUv + dir * r * 2.0) + texture2D(tDiffuse, vUv - dir * r * 2.0)) * 0.1216216;
    s += (texture2D(tDiffuse, vUv + dir * r * 3.0) + texture2D(tDiffuse, vUv - dir * r * 3.0)) * 0.054054;
    s += (texture2D(tDiffuse, vUv + dir * r * 4.0) + texture2D(tDiffuse, vUv - dir * r * 4.0)) * 0.016216;
    gl_FragColor = s; }` };
import { V, PI, ST, mesh, sph, sweep, basicHDR, texRadial, lacquer, metal, rng, addRim, rbox, cyl, tone, texWood } from './lib.js';
let WOODT;
import { buildHero, buildSoldier, gearGeo, springGeo, texEndGrain } from './chars.js';
import { lights, sky, town, blob, ndcPoint } from './world.js';

const P = new URLSearchParams(location.search);
const face = (o, x, z) => { o.rotation.y = Math.atan2(x - o.position.x, z - o.position.z); return o; };

// 꺾인 획 경로 (모서리는 살짝 둥글게)
function bentPath(a, b, c, y, rad = 0.35, n = 40) {
  const A = V(a[0], y, a[1]), B = V(b[0], y, b[1]), C = V(c[0], y, c[1]);
  const u1 = A.clone().sub(B).normalize(), u2 = C.clone().sub(B).normalize();
  const B1 = B.clone().addScaledVector(u1, rad), B2 = B.clone().addScaledVector(u2, rad);
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(A.clone().lerp(B1, i / n));
  for (let i = 1; i < 10; i++) { const t = i / 10; pts.push(B1.clone().multiplyScalar((1 - t) ** 2).addScaledVector(B, 2 * t * (1 - t)).addScaledVector(B2, t * t)); }
  for (let i = 0; i <= n * 1.6; i++) pts.push(B2.clone().lerp(C, i / (n * 1.6)));
  return pts;
}
function strokeMeshes(pts, { core = 0.024, glow = 0.06, haze = 0.13, ground = true } = {}) {
  const g = new THREE.Group();
  const taper = (w) => (t) => w * Math.min(1, t / 0.04) * (t > 0.86 ? Math.pow(Math.max(0.0, (1 - t) / 0.14), 0.7) : 1);
  const add = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = 5; g.add(m); };
  add(sweep(pts, { radius: taper(core), segs: 400, radial: 10, tension: 0 }), basicHDR(0xffffff, 2.6, { fog: false }));
  add(sweep(pts, { radius: taper(glow), segs: 400, radial: 12, tension: 0 }), basicHDR(0x2ff0dc, 1.5, { transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  add(sweep(pts, { radius: taper(haze), segs: 400, radial: 12, tension: 0 }), basicHDR(0x1fd8c8, 1, { transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  if (ground) {
    const gp = pts.map((p) => V(p.x, 0.02, p.z));
    add(sweep(gp, { radius: taper(0.16), flat: 0.05, segs: 400, radial: 8, tension: 0 }), basicHDR(0x2ad8c8, 1, { transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false }));
  }
  return g;
}
function ring(r0, r1, color, opacity, k = 1.2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), basicHDR(color, k, { transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.rotation.x = -PI / 2; m.position.y = 0.025; m.renderOrder = 4; return m;
}
function clockRing(r = 0.6) {
  const g = new THREE.Group();
  g.add(ring(r - 0.018, r + 0.012, 0x2ff0dc, 0.6));
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.8, r * 2.8), new THREE.MeshBasicMaterial({ map: texRadial([[0, 'rgba(60,240,220,0.5)'], [0.5, 'rgba(40,220,200,0.15)'], [1, 'rgba(40,220,200,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -PI / 2; glow.position.y = 0.015; g.add(glow);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * PI * 2, big = i % 3 === 0;
    const t = new THREE.Mesh(new THREE.PlaneGeometry(big ? 0.035 : 0.02, big ? 0.12 : 0.07), basicHDR(0x2ff0dc, 1.3, { transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    t.rotation.x = -PI / 2; t.rotation.z = -a; const rr = r + (big ? 0.1 : 0.07);
    t.position.set(Math.sin(a) * rr, 0.026, Math.cos(a) * rr); g.add(t);
  }
  return g;
}

// ========== 본 장면 (느린 시간) ==========
function shotMain(w, h) {
  ST.slow = true;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(41, w / h, 0.1, 200);
  cam.position.set(0.15, 6.0, 9.6); cam.lookAt(0.1, 0.0, -0.4);
  const nd = (x, y, z) => { const v = V(x, y, z).project(cam); return `(${x},${y},${z})->${v.x.toFixed(2)},${v.y.toFixed(2)}`; };
  cam.updateMatrixWorld(); void ('NDC', nd(0.65, 0, 2.95), nd(0.65, 1.2, 2.95), nd(0, 0.4, -3.8), nd(0, -1.3, -7.2), nd(0, 0, -12.6), nd(0, 1.5, -15.6), nd(0, 5, -20), nd(0, 8, -20));
  sky(scene, true); lights(scene, true);
  town(scene, cam, { slow: true, clockNdc: [0.36, 0.72], clockDist: 19, moonNdc: [-0.6, 0.74], moonSize: 15 });

  const HX = 0.6, HZ = 3.25;
  // 주인공 (색 유지 + 은은한 청록 림)
  const hero = buildHero(); hero.position.set(HX, 0, HZ); hero.rotation.order = 'YXZ'; hero.rotation.y = -1.42; hero.rotation.x = 0.08; hero.scale.setScalar(0.87);
  hero.userData.head.rotation.set(-0.12, 0.42, 0); scene.add(hero);
  addRim(hero, 0x3ff5e0, 2.4, 0.9);
  const hb = blob(1.05, 0.5); hb.position.set(HX, 0.006, HZ); scene.add(hb);
  const cr = clockRing(0.66); cr.position.set(HX, 0, HZ); scene.add(cr);

  // 획: 주인공 → 왼쪽 위로 → 꺾어서 오른쪽 위로 셋을 꿴다
  const A = [HX, HZ], B = [-2.25, 1.55], C = [2.95, -1.45];
  { const dx = B[0] - A[0], dz = B[1] - A[1], l = Math.hypot(dx, dz); A[0] += dx / l * 0.62; A[1] += dz / l * 0.62; }
  scene.add(strokeMeshes(bentPath(A, B, C, 0.5)));

  // 겨눈 셋 (색 유지)
  const tgt = [['sword', -1.35, 0.98], ['shield', 0.15, 0.13], ['sword', 1.65, -0.72]];
  tgt.forEach(([t, x, z], i) => {
    const s = buildSoldier(t, { keep: true, face: i === 1 ? 'oops' : 'blank' }); s.position.set(x, 0, z); face(s, HX, HZ); s.rotation.y += [0.5, 0.15, -0.1][i]; s.rotation.z = [0.05, -0.04, 0.06][i];
    addRim(s, 0x3ff5e0, 3.0, 0.35);
    scene.add(s); const b = blob(0.85, 0.42); b.position.set(x, 0.006, z); scene.add(b);
    const rg = ring(0.34, 0.37, 0x2ff0dc, 0.75); rg.position.set(x, 0.025, z); scene.add(rg);
  });
  // 회색으로 멈춘 나머지
  const AX = 2.2, AZ = 1.05;
  const arch = buildSoldier('bow'); arch.position.set(AX, 0, AZ); face(arch, HX, HZ); scene.add(arch);
  const ab = blob(0.85, 0.4); ab.position.set(AX, 0.006, AZ); scene.add(ab);
  const back = buildSoldier('sword'); back.position.set(-0.6, 0, -2.4); face(back, 0.3, 3); scene.add(back);
  const bb = blob(0.85, 0.4); bb.position.set(-0.6, 0.006, -2.4); scene.add(bb);

  // 위험: 활 조준 점선 (빨강)
  const from = V(AX, 0.5, AZ), to = V(HX, 0.5, HZ), dir = to.clone().sub(from), L = dir.length() - 0.5; dir.normalize();
  const st = from.clone().addScaledVector(dir, 0.45);
  const red = basicHDR(0xff3040, 2.2, { fog: false });
  for (let d = 0; d < L - 0.45; d += 0.16) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.065, 4, 8), red);
    m.position.copy(st).addScaledVector(dir, d); m.quaternion.setFromUnitVectors(V(0, 1, 0), dir); m.renderOrder = 6; scene.add(m);
  }
  ST.slow = false;
  return { scene, cam };
}

// ========== 벤 직후 (보통 시간, 색 복귀) ==========
function shotCut(w, h) {
  ST.slow = false;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(34, w / h, 0.1, 200);
  cam.position.set(0.78, 1.12, 2.8); cam.lookAt(0.14, 0.66, 0);
  sky(scene, false); lights(scene, false, { keyPos: [3.5, 6, 6], target: [0, 0.5, 0], shadowSize: 4 });
  town(scene, cam, { slow: false, clockNdc: [-0.62, 0.55], clockDist: 24, moonNdc: [0.7, 0.75] });

  // 반으로 갈린 병정 (단면 기준 회전)
  const n = V(0.45, 1, 0.1).normalize(), p0 = V(0, 0.4, 0.0);
  const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n, p0);
  const half = (top) => {
    const pivot = new THREE.Group(); pivot.position.copy(p0);
    if (top) { pivot.position.add(V(-0.2, 0.2, 0.08)); pivot.rotation.set(0.15, 0.2, 0.55); }
    const inner = new THREE.Group(); inner.position.copy(p0).negate(); pivot.add(inner);
    pivot.updateMatrixWorld(true);
    const pl = top ? plane.clone() : plane.clone().negate();
    ST.clip = [pl.applyMatrix4(inner.matrixWorld)];
    const s = buildSoldier('sword', { keep: true, face: 'oops' }); s.rotation.y = 0.32; inner.add(s);
    ST.clip = null;
    const cap = new THREE.Group(); cap.position.copy(p0); cap.quaternion.setFromUnitVectors(V(0, 0, 1), top ? n.clone().negate() : n);
    cap.add(mesh(new THREE.CircleGeometry(0.212, 40), new THREE.MeshStandardMaterial({ map: texEndGrain(), roughness: 0.75 }), [0, 0, 0.001], [0, 0, 0], [1.08, 1, 1], false));
    cap.add(mesh(new THREE.CircleGeometry(0.14, 32), new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.9 }), [0, 0, 0.002], [0, 0, 0], [1.08, 1, 1], false));
    inner.add(cap);
    return pivot;
  };
  scene.add(half(false)); scene.add(half(true));
  const b = blob(0.9, 0.45); scene.add(b);
  // 톱니·스프링이 퐁
  const brass = metal(0xe6a83c, { roughness: 0.25 }), steel = metal(0xd5dde6, { roughness: 0.2 });
  [[0.3, 0.74, 0.12, 0.085, 0.5], [-0.02, 0.88, 0.2, 0.06, 1.3], [0.46, 0.5, 0.2, 0.052, 2.2], [0.2, 0.98, -0.02, 0.042, 0.2]].forEach(([x, y, z, r, a]) => {
    scene.add(mesh(gearGeo(r, r > 0.07 ? 12 : 9, 0.022), brass, [x, y, z], [a, a * 1.7, a * 0.6]));
  });
  scene.add(mesh(springGeo(0.038, 7, 0.3, 0.008), steel, [0.04, 0.42, 0.02], [0.1, 0, -0.5]));
  // 칼빛 한 줄 (단면을 따라)
  const s0 = V(-0.7, 0.22, 0.1), s1 = V(1.1, 0.98, -1.3);
  const pts = []; for (let i = 0; i <= 30; i++) pts.push(s0.clone().lerp(s1, i / 30));
  scene.add(strokeMeshes(pts, { core: 0.007, glow: 0.018, haze: 0.035, ground: false }));
  // 주인공: 이미 지나가 착지 (뒷모습, 작게)
  const hero = buildHero({ pose: 'land' }); hero.position.set(1.2, 0, -2.0); hero.rotation.y = 2.2; scene.add(hero);
  const hb = blob(0.9, 0.45); hb.position.set(1.2, 0.006, -2.0); scene.add(hb);
  return { scene, cam };
}

// ========== 주인공 클로즈업 ==========
function shotClose(w, h) {
  ST.slow = false;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(24, w / h, 0.1, 200);
  cam.position.set(0.62, 1.02, 2.45); cam.lookAt(0.02, 0.74, 0);
  scene.background = new THREE.Color(0x2a3470);
  lights(scene, false, { keyPos: [3, 5, 6], target: [0, 0.7, 0], shadowSize: 2, k: 0.8 });
  const hero = buildHero({ pose: 'land' }); hero.rotation.y = 0.25; scene.add(hero);
  hero.userData.head.rotation.set(-0.05, 0.12, 0.06);
  // 뒤 배경: 흐린 창불 보케 + 시계탑 실루엣
  const r = rng(9);
  const bokeh = texRadial([[0, 'rgba(255,255,255,0.9)'], [0.55, 'rgba(255,255,255,0.75)'], [0.7, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]);
  const cols = [0xffb867, 0xffd08a, 0xff9a6a, 0x7fd6ff, 0xffe3a8];
  for (let i = 0; i < 26; i++) {
    const p = ndcPoint(cam, r() * 2.2 - 1.1, r() * 1.6 - 0.5, 9 + r() * 4);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: bokeh, color: new THREE.Color(cols[(r() * cols.length) | 0]).multiplyScalar(0.5 + r() * 0.6), transparent: true, opacity: 0.35 + r() * 0.4, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(p); s.scale.setScalar(0.25 + r() * 0.55); scene.add(s);
  }
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshBasicMaterial({ map: texRadial([[0, '#5a63a8'], [0.5, '#2f3a7a'], [1, '#1b2150']]) }));
  bg.position.set(-2, 0, -14); bg.lookAt(cam.position); scene.add(bg);
  const moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: texRadial([[0, 'rgba(255,248,230,1)'], [0.25, 'rgba(255,240,210,0.9)'], [0.3, 'rgba(210,225,255,0.35)'], [1, 'rgba(160,180,255,0)']]), depthWrite: false }));
  moonGlow.position.copy(ndcPoint(cam, -0.62, 0.55, 12)); moonGlow.scale.setScalar(3.2); scene.add(moonGlow);
  return { scene, cam };
}

async function main() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Number(P.get('dpr') || 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.localClippingEnabled = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const jobs = [['main', 390, 593, shotMain], ['cut', 180, 118, shotCut], ['close', 180, 118, shotClose]];
  for (let [id, w, h, fn] of jobs) {
    if (P.get('only') && P.get('only') !== id) continue;
    let { scene, cam } = fn(w, h);
    scene.environment = env; scene.environmentIntensity = id === 'main' ? 0.32 : 0.5;
    if (P.get('big') && id !== 'main') { w *= 2.5; h *= 2.5; document.getElementById(id).style.cssText = `width:${w}px;height:${h}px;position:fixed;left:0;top:0;z-index:9`; }
    renderer.setSize(w, h, false);
    const pr = renderer.getPixelRatio();
    const rt = new THREE.WebGLRenderTarget(w * pr, h * pr, { type: THREE.HalfFloatType, samples: 4 });
    const comp = new EffectComposer(renderer, rt);
    comp.setPixelRatio(pr); comp.setSize(w, h);
    comp.addPass(new RenderPass(scene, cam));
    if (P.get('ao')) {
      const ao = new GTAOPass(scene, cam, w * pr, h * pr);
      ao.updateGtaoMaterial({ radius: id === 'main' ? 0.35 : 0.2, distanceExponent: 1, thickness: 1, scale: 1, samples: 16 });
      ao.blendIntensity = 0.9; comp.addPass(ao);
    }
    comp.addPass(new UnrealBloomPass(new THREE.Vector2(w, h), id === 'main' ? 0.3 : 0.3, 0.5, id === 'main' ? 1.1 : 1.3));
    if (id !== 'close') for (const d of [[1 / (w * pr), 0], [0, 1 / (h * pr)]]) {
      const ts = new ShaderPass(TiltShift); ts.uniforms.dir.value.set(...d); ts.uniforms.amount.value = id === 'main' ? 1.5 : 1.5; if (id === 'main') ts.uniforms.top.value.set(0.7, 0.98);
      if (id === 'cut') { ts.uniforms.top.value.set(0.55, 1.0); ts.uniforms.bottom.value = 0.8; }
      comp.addPass(ts);
    }
    comp.addPass(new OutputPass());
    comp.render();
    if (P.get('stats')) { let n = 0, tri = 0; scene.traverse((o) => { if (o.isMesh) { n++; tri += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; } }); console.log('STATS', id, 'meshes', n, 'tris', Math.round(tri)); }
    document.getElementById(id).src = renderer.domElement.toDataURL('image/png');
    await new Promise((r) => setTimeout(r, 30));
  }
  window.__done = true;
}
main().catch((e) => { console.error(e); window.__err = String(e && e.stack || e); window.__done = true; });
