// 공용 도구: 색(느린 시간 탈색), 머티리얼, 도형, 텍스처
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const PI = Math.PI;

// ---- 느린 시간 탈색 상태 ----
export const ST = { slow: false, keep: false, clip: null };
const SLOW_TINT = new THREE.Color(0x92afd2);
const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
export function tone(hex, retain = 0.08) {
  const c = new THREE.Color(hex);
  if (!ST.slow || ST.keep) return c;
  const l = lum(c);
  const t = SLOW_TINT.clone().multiplyScalar((Math.pow(l, 1.15) * 0.72 + 0.012) / lum(SLOW_TINT));
  return t.lerp(c, retain);
}
export function withKeep(on, fn) { const p = ST.keep; ST.keep = on || p; try { return fn(); } finally { ST.keep = p; } }

function fin(m) { if (ST.clip) { m.clippingPlanes = ST.clip; m.clipShadows = true; } return m; }
export const vinyl = (hex, o = {}) => fin(new THREE.MeshPhysicalMaterial({ color: tone(hex), roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.2, ...o }));
export const lacquer = (hex, o = {}) => fin(new THREE.MeshPhysicalMaterial({ color: tone(hex), roughness: 0.5, clearcoat: 1.0, clearcoatRoughness: 0.1, ...o }));
export const matte = (hex, o = {}) => fin(new THREE.MeshStandardMaterial({ color: tone(hex), roughness: 0.85, ...o }));
export const metal = (hex, o = {}) => fin(new THREE.MeshStandardMaterial({ color: tone(hex), metalness: 1, roughness: 0.3, ...o }));
export const glowM = (hex, k = 1, retain = 0.08, o = {}) => { const c = tone(hex, retain); return fin(new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.6, ...o })); };
export const basicHDR = (hex, k = 1, o = {}) => { const c = new THREE.Color(hex).multiplyScalar(k); return new THREE.MeshBasicMaterial({ color: c, ...o }); };

// ---- 메시 ----
const SPH = new THREE.SphereGeometry(1, 48, 32);
export function mesh(geo, mat, p = [0, 0, 0], r = [0, 0, 0], s = 1, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p); m.rotation.set(...r);
  if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
export const sph = (r, mat, p, s = [1, 1, 1], rot = [0, 0, 0]) => mesh(SPH, mat, p, rot, [r * s[0], r * s[1], r * s[2]]);
export const rbox = (w, h, d, rad, mat, p, r) => mesh(new RoundedBoxGeometry(w, h, d, 4, rad), mat, p, r);
export const cyl = (rt, rb, h, mat, p, r, seg = 40) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg, 1), mat, p, r);
export const torus = (R, t, mat, p, r, arc = PI * 2, s = 1) => mesh(new THREE.TorusGeometry(R, t, 16, 64, arc), mat, p, r, s);
export function lathe(pts, mat, p, seg = 48) { return mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat, p); }

// 두 점 사이 캡슐(팔다리)
export function limb(a, b, r, mat) {
  const A = V(...a), B = V(...b), d = B.clone().sub(A), len = d.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 8, 20), mat);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  m.castShadow = m.receiveShadow = true;
  return m;
}

// 구 표면 위에 붙이기 (center, radius 기준, x,y 는 center 대비 오프셋)
export function onSphere(obj, c, R, x, y, push = 0) {
  const z = Math.sqrt(Math.max(0, R * R - x * x - y * y));
  const n = V(x, y, z).normalize();
  obj.position.set(c[0] + x + n.x * push, c[1] + y + n.y * push, c[2] + z + n.z * push);
  obj.lookAt(obj.position.clone().add(n));
  return obj;
}

export function onEllipsoid(obj, c, abc, x, y, push = 0) {
  const [a, b, cz] = abc, k = 1 - (x / a) ** 2 - (y / b) ** 2, z = cz * Math.sqrt(Math.max(0, k));
  const n = V(x / (a * a), y / (b * b), z / (cz * cz)).normalize();
  obj.position.set(c[0] + x + n.x * push, c[1] + y + n.y * push, c[2] + z + n.z * push);
  obj.lookAt(obj.position.clone().add(n));
  return obj;
}
// 프레넬 림(가장자리 빛) — 느린 시간에 주인공만 은은하게
export function addRim(root, color = 0x3ff5e0, power = 2.6, strength = 1.0) {
  root.traverse((o) => {
    const m = o.material; if (!m || !m.isMeshStandardMaterial) return;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.rimColor = { value: new THREE.Color(color).multiplyScalar(strength) };
      sh.uniforms.rimPow = { value: power };
      sh.fragmentShader = 'uniform vec3 rimColor; uniform float rimPow;\n' + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float rf = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), rimPow); totalEmissiveRadiance += rimColor * rf; }`);
    };
    m.customProgramCacheKey = () => 'rim' + color + power + strength;
  });
}
// 굵기가 변하는 납작한 튜브 (목도리 꼬리, 획)
export function sweep(points, { radius = () => 0.05, flat = 1, segs = 120, radial = 14, up = V(0, 1, 0), twist = () => 0, tension = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', tension);
  const pos = [], nor = [], uv = [], idx = [];
  const P = V(0, 0, 0), T = V(0, 0, 0), N = V(0, 0, 0), B = V(0, 0, 0);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P); curve.getTangentAt(t, T);
    N.crossVectors(T, up); if (N.lengthSq() < 1e-8) N.set(1, 0, 0); N.normalize();
    B.crossVectors(N, T).normalize();
    const a = twist(t), ca = Math.cos(a), sa = Math.sin(a);
    const n2 = N.clone().multiplyScalar(ca).addScaledVector(B, sa);
    const b2 = B.clone().multiplyScalar(ca).addScaledVector(N, -sa);
    const r = radius(t);
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * PI * 2, c = Math.cos(th), s = Math.sin(th);
      pos.push(P.x + n2.x * c * r + b2.x * s * r * flat, P.y + n2.y * c * r + b2.y * s * r * flat, P.z + n2.z * c * r + b2.z * s * r * flat);
      const nn = n2.clone().multiplyScalar(c * flat).addScaledVector(b2, s).normalize();
      nor.push(nn.x, nn.y, nn.z); uv.push(t, j / radial);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < radial; j++) {
    const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// ---- 텍스처 ----
function cv(w, h, fn) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); return c; }
export function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function texWood() {
  const r = rng(3);
  const c = cv(256, 256, (g, w, h) => {
    g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      const x0 = r() * w, a = 0.05 + r() * 0.12;
      g.strokeStyle = `rgba(90,70,50,${a})`; g.lineWidth = 0.6 + r() * 2.2; g.beginPath();
      for (let y = 0; y <= h; y += 8) g.lineTo(x0 + Math.sin(y * 0.03 + i) * 4 + Math.sin(y * 0.11 + i * 3) * 1.5, y);
      g.stroke();
    }
  });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function texEndGrain() {
  const c = cv(256, 256, (g, w, h) => {
    g.fillStyle = '#f0d3a2'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) { g.strokeStyle = `rgba(150,100,55,${0.18 + (i % 3) * 0.06})`; g.lineWidth = 2; g.beginPath(); g.ellipse(128 + Math.sin(i) * 3, 128, 12 + i * 7.5, 11 + i * 7.3, 0, 0, PI * 2); g.stroke(); }
    g.fillStyle = 'rgba(120,80,40,0.35)'; g.beginPath(); g.arc(128, 128, 9, 0, PI * 2); g.fill();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// 바닥 타일: 색(밝기 변화) + 범프(줄눈)
export function texTiles() {
  const r = rng(11), cols = 6, rows = 8, W = 512, H = 512, tw = W / cols, th = H / rows;
  const color = cv(W, H, (g) => {
    g.fillStyle = '#9a9a9a'; g.fillRect(0, 0, W, H);
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
      const ox = (y % 2) * tw / 2, v = 205 + r() * 40;
      const X = x * tw + ox + 3, Y = y * th + 3, w = tw - 6, h = th - 6;
      const grd = g.createLinearGradient(X, Y, X + w, Y + h);
      grd.addColorStop(0, `rgb(${v + 12},${v + 12},${v + 12})`); grd.addColorStop(1, `rgb(${v - 14},${v - 14},${v - 14})`);
      g.fillStyle = grd; g.beginPath(); g.roundRect(X, Y, w, h, 9); g.fill();
      for (let k = 0; k < 18; k++) { g.fillStyle = `rgba(0,0,0,${r() * 0.05})`; g.beginPath(); g.arc(X + r() * w, Y + r() * h, 2 + r() * 8, 0, PI * 2); g.fill(); }
    }
  });
  const bump = cv(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.filter = 'blur(3px)';
    for (let y = 0; y < rows; y++) for (let x = -1; x < cols + 1; x++) {
      const ox = (y % 2) * tw / 2; g.fillStyle = '#fff'; g.beginPath(); g.roundRect(x * tw + ox + 4, y * th + 4, tw - 8, th - 8, 10); g.fill();
    }
  });
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { map: mk(color, true), bump: mk(bump, false) };
}
// 나무 판자 바닥
export function texPlanks() {
  const r = rng(17), W = 512, H = 1024, n = 8, pw = W / n;
  const segs = [];
  for (let i = 0; i < n; i++) { let y = -r() * 300; while (y < H) { const len = 260 + r() * 360; segs.push([i, y, len, 0.86 + r() * 0.2]); y += len; } }
  const color = cv(W, H, (g) => {
    g.fillStyle = '#6a6a6a'; g.fillRect(0, 0, W, H);
    for (const [i, y, len, v] of segs) {
      const X = i * pw + 2, w = pw - 4, c = Math.round(215 * v);
      const grd = g.createLinearGradient(X, 0, X + w, 0); grd.addColorStop(0, `rgb(${c - 10},${c - 10},${c - 10})`); grd.addColorStop(0.5, `rgb(${c + 6},${c + 6},${c + 6})`); grd.addColorStop(1, `rgb(${c - 14},${c - 14},${c - 14})`);
      g.fillStyle = grd; g.beginPath(); g.roundRect(X, y + 2, w, len - 4, 5); g.fill();
      g.save(); g.beginPath(); g.rect(X, y, w, len); g.clip();
      for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(60,50,40,${0.05 + r() * 0.08})`; g.lineWidth = 0.8 + r() * 1.6; g.beginPath(); const x0 = X + r() * w; for (let yy = y; yy < y + len; yy += 10) g.lineTo(x0 + Math.sin(yy * 0.02 + k) * 3, yy); g.stroke(); }
      if (r() < 0.3) { g.fillStyle = 'rgba(70,55,40,0.18)'; g.beginPath(); g.ellipse(X + w * (0.3 + r() * 0.4), y + len * r(), 5, 9, 0, 0, PI * 2); g.fill(); }
      g.fillStyle = 'rgba(40,40,40,0.35)'; for (const yy of [y + 16, y + len - 16]) { g.beginPath(); g.arc(X + 12, yy, 2.4, 0, PI * 2); g.arc(X + w - 12, yy, 2.4, 0, PI * 2); g.fill(); }
      g.restore();
    }
  });
  const bump = cv(W, H, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.filter = 'blur(2px)'; g.fillStyle = '#fff';
    for (const [i, y, len] of segs) { g.beginPath(); g.roundRect(i * pw + 3, y + 3, pw - 6, len - 6, 6); g.fill(); }
  });
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  return { map: mk(color, true), bump: mk(bump, false) };
}
// 지붕 비늘 기와
export function texShingle() {
  const W = 256, H = 256, rows = 6, cols = 5, tw = W / cols, th = H / rows;
  const r = rng(5);
  const draw = (g, isBump) => {
    g.fillStyle = isBump ? '#000' : '#8c8c8c'; g.fillRect(0, 0, W, H);
    for (let y = rows; y >= -1; y--) for (let x = -1; x <= cols; x++) {
      const ox = (y % 2) * tw / 2, cx = x * tw + ox + tw / 2, cy = y * th;
      const v = isBump ? 255 : 200 + r() * 45;
      const grd = g.createRadialGradient(cx, cy, 2, cx, cy, tw * 0.62);
      grd.addColorStop(0, `rgb(${v},${v},${v})`); grd.addColorStop(0.85, `rgb(${v * 0.86},${v * 0.86},${v * 0.86})`); grd.addColorStop(1, isBump ? '#000' : `rgb(${v * 0.6},${v * 0.6},${v * 0.6})`);
      g.fillStyle = grd; g.beginPath(); g.moveTo(cx - tw / 2, cy - th); g.lineTo(cx - tw / 2, cy); g.arc(cx, cy, tw / 2, PI, 0, true); g.lineTo(cx + tw / 2, cy - th); g.closePath(); g.fill();
    }
  };
  const mk = (isBump) => { const t = new THREE.CanvasTexture(cv(W, H, (g) => draw(g, isBump))); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (!isBump) t.colorSpace = THREE.SRGBColorSpace; return t; };
  return { map: mk(false), bump: mk(true) };
}
export function texFolds() {
  const c = cv(256, 64, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = -4; i < 24; i++) { const grd = g.createLinearGradient(i * 14, 0, i * 14 + 12, 0); grd.addColorStop(0, 'rgba(0,0,0,0.0)'); grd.addColorStop(0.5, 'rgba(255,255,255,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0.35)');
      g.save(); g.translate(i * 14, 0); g.transform(1, 0, 0.6, 1, 0, 0); g.fillStyle = grd; g.fillRect(0, 0, 12, h); g.restore(); }
  });
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function texRadial(stops, size = 256) {
  const c = cv(size, size, (g, w) => { const grd = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); stops.forEach(([o, col]) => grd.addColorStop(o, col)); g.fillStyle = grd; g.fillRect(0, 0, w, w); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function texWindow() {
  const c = cv(64, 96, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#fff2c8'); grd.addColorStop(1, '#ffb45c');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(120,60,20,0.85)'; g.fillRect(w / 2 - 3, 0, 6, h); g.fillRect(0, h * 0.45 - 3, w, 6);
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(6, 6, 10, h * 0.3);
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function texClock(secondHandTeal) {
  const c = cv(512, 512, (g, w) => {
    const cx = w / 2, grd = g.createRadialGradient(cx, cx, 10, cx, cx, cx);
    grd.addColorStop(0, '#fffaf0'); grd.addColorStop(0.75, '#fbe9c6'); grd.addColorStop(1, '#e9c88e');
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cx, cx, 0, PI * 2); g.fill();
    g.strokeStyle = 'rgba(120,80,40,0.35)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cx, cx * 0.78, 0, PI * 2); g.stroke();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * PI * 2, big = i % 5 === 0, r1 = cx * 0.9, r0 = big ? cx * 0.74 : cx * 0.84;
      g.strokeStyle = '#3a2f4a'; g.lineWidth = big ? 14 : 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(cx + Math.sin(a) * r0, cx - Math.cos(a) * r0); g.lineTo(cx + Math.sin(a) * r1, cx - Math.cos(a) * r1); g.stroke();
    }
    const hand = (a, len, wid, col, back = 0.12) => { g.strokeStyle = col; g.lineWidth = wid; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Math.sin(a) * cx * back, cx + Math.cos(a) * cx * back); g.lineTo(cx + Math.sin(a) * len, cx - Math.cos(a) * len); g.stroke(); };
    hand(PI * 2 * (10.1 / 12), cx * 0.48, 22, '#2b2440');
    hand(PI * 2 * (2 / 12), cx * 0.7, 14, '#2b2440');
    hand(PI * 2 * (38 / 60), cx * 0.82, 6, secondHandTeal ? '#11c7b6' : '#b23a3a', 0.2);
    g.fillStyle = '#2b2440'; g.beginPath(); g.arc(cx, cx, 18, 0, PI * 2); g.fill();
    g.fillStyle = '#d9a441'; g.beginPath(); g.arc(cx, cx, 9, 0, PI * 2); g.fill();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function texMoon() {
  const c = cv(512, 512, (g, w) => {
    const cx = w / 2;
    const halo = g.createRadialGradient(cx, cx, w * 0.14, cx, cx, cx);
    halo.addColorStop(0, 'rgba(230,240,255,0.55)'); halo.addColorStop(0.35, 'rgba(170,200,240,0.18)'); halo.addColorStop(1, 'rgba(120,150,210,0)');
    g.fillStyle = halo; g.fillRect(0, 0, w, w);
    const d = g.createRadialGradient(cx - 20, cx - 20, 10, cx, cx, w * 0.16);
    d.addColorStop(0, '#fffdf4'); d.addColorStop(1, '#f1ead6');
    g.fillStyle = d; g.beginPath(); g.arc(cx, cx, w * 0.155, 0, PI * 2); g.fill();
    g.fillStyle = 'rgba(190,180,160,0.35)';
    [[-22, -12, 16], [24, 18, 11], [8, -30, 8], [-6, 30, 9]].forEach(([x, y, r]) => { g.beginPath(); g.arc(cx + x, cx + y, r, 0, PI * 2); g.fill(); });
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function texSky(stops) {
  const c = cv(4, 512, (g, w, h) => { const grd = g.createLinearGradient(0, 0, 0, h); stops.forEach(([o, col]) => grd.addColorStop(o, col)); g.fillStyle = grd; g.fillRect(0, 0, w, h); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
