// 점토 만들기: 손으로 빚은 듯 울퉁불퉁한 덩어리, 지문 자국, 프레임마다 살짝 달라지는 표면
import * as THREE from '../vendor/three.module.min.js';

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function hash(ix, iy, iz) {
  let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(iz, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const sm = (t) => t * t * (3 - 2 * t);
export function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = sm(x - ix), fy = sm(y - iy), fz = sm(z - iz);
  const l = (a, b, t) => a + (b - a) * t;
  return l(
    l(l(hash(ix, iy, iz), hash(ix + 1, iy, iz), fx), l(hash(ix, iy + 1, iz), hash(ix + 1, iy + 1, iz), fx), fy),
    l(l(hash(ix, iy, iz + 1), hash(ix + 1, iy, iz + 1), fx), l(hash(ix, iy + 1, iz + 1), hash(ix + 1, iy + 1, iz + 1), fx), fy), fz);
}
export function fbm(x, y, z) { return noise3(x, y, z) * 0.6 + noise3(x * 2.1 + 7.3, y * 2.1 + 1.7, z * 2.1 + 4.1) * 0.28 + noise3(x * 4.3 + 2.9, y * 4.3 + 8.1, z * 4.3 + 0.7) * 0.12; }

// 같은 자리의 꼭짓점을 하나로 — 모서리에서도 법선이 부드럽게 이어진다
export function weld(geo, tol = 1e-3) {
  const pos = geo.attributes.position, idx = geo.index;
  const map = new Map(), out = [], remap = new Uint32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = Math.round(x / tol) + '_' + Math.round(y / tol) + '_' + Math.round(z / tol);
    let j = map.get(k);
    if (j === undefined) { j = out.length / 3; map.set(k, j); out.push(x, y, z); }
    remap[i] = j;
  }
  const index = [], n = idx ? idx.count : pos.count;
  for (let i = 0; i < n; i += 3) {
    const a = remap[idx ? idx.getX(i) : i], b = remap[idx ? idx.getX(i + 1) : i + 1], c = remap[idx ? idx.getX(i + 2) : i + 2];
    if (a !== b && b !== c && a !== c) index.push(a, b, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  g.setIndex(index);
  return g;
}

const C1 = new THREE.Color(), C2 = new THREE.Color(), C3 = new THREE.Color();
// 덩어리를 점토로: 울퉁불퉁하게 누르고, 두 가지 색을 덜 섞인 채로 남기고, 지문 무늬가 앉을 UV 를 만든다.
// 지오메트리는 먼저 제자리(세계 좌표)에 옮겨 둔 뒤 넘긴다 — 이웃한 덩어리끼리 굴곡이 이어진다.
export function clayify(geo, o = {}) {
  const g = weld(geo);
  g.computeVertexNormals();
  const amp = o.amp ?? 0.05, freq = o.freq ?? 1.1, fine = o.fine ?? 0.01, seed = o.seed ?? 0, uvs = o.uv ?? 0.3;
  const flat = o.flatTop ?? 1;       // 위를 보는 면은 덜 누른다 (발이 뜨지 않게)
  const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    let d = (fbm(x * freq + seed, y * freq + seed * 1.7, z * freq - seed) - 0.5) * 2 * amp + (noise3(x * 6.1 + seed, y * 6.1, z * 6.1) - 0.5) * 2 * fine;
    if (ny > 0.5) d *= flat;
    pos.setXYZ(i, x + nx * d, y + ny * d, z + nz * d);
  }
  g.computeVertexNormals();
  const col = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  C1.set(o.color ?? 0x888888); C2.set(o.color2 ?? o.color ?? 0x888888);
  const hasTop = o.topColor !== undefined; if (hasTop) C3.set(o.topColor);
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
    const m = sm(Math.min(1, Math.max(0, (noise3(x * 0.9 + seed * 3.1, y * 0.9 + 5.2, z * 0.9 + seed) - 0.3) * 2.5)));
    c.copy(C1).lerp(C2, m);
    if (hasTop) c.lerp(C3, sm(Math.min(1, Math.max(0, (ny - 0.35) * 2.2))) * (0.75 + 0.25 * noise3(x * 2.3, y * 2.3 + 9, z * 2.3)));
    const v = 0.86 + 0.28 * noise3(x * 3.7 + 11, y * 3.7, z * 3.7 + seed);
    col[i * 3] = c.r * v; col[i * 3 + 1] = c.g * v; col[i * 3 + 2] = c.b * v;
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    if (az >= ax && az >= ay) { uv[i * 2] = x * uvs; uv[i * 2 + 1] = y * uvs; }
    else if (ay >= ax) { uv[i * 2] = x * uvs; uv[i * 2 + 1] = z * uvs; }
    else { uv[i * 2] = z * uvs; uv[i * 2 + 1] = y * uvs; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

export function mergeGeos(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    const a = g.attributes, c = a.position.count;
    pos.set(a.position.array, ov * 3); nor.set(a.normal.array, ov * 3);
    if (a.color) col.set(a.color.array, ov * 3); else col.fill(1, ov * 3, (ov + c) * 3);
    if (a.uv) uv.set(a.uv.array, ov * 2);
    const ia = g.index.array;
    for (let i = 0; i < ia.length; i++) idx[oi + i] = ia[i] + ov;
    ov += c; oi += ia.length;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// 모서리를 눌러 둥글린 상자. 큰 면일수록 잘게 나눠 굴곡이 살게 한다.
export function roundBox(w, h, d, r = 0.15, seg = 0.55) {
  const n = (v) => Math.max(2, Math.min(28, Math.round(v / seg)));
  const g = new THREE.BoxGeometry(w, h, d, n(w), n(h), n(d));
  const pos = g.attributes.position, hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const cx = Math.max(-hx, Math.min(hx, x)), cy = Math.max(-hy, Math.min(hy, y)), cz = Math.max(-hz, Math.min(hz, z));
    const dx = x - cx, dy = y - cy, dz = z - cz, l = Math.hypot(dx, dy, dz);
    if (l > 1e-6) pos.setXYZ(i, cx + dx / l * r, cy + dy / l * r, cz + dz / l * r);
  }
  return g;
}

// ───── 무늬 ─────
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// 엄지로 누른 자국, 문지른 자국, 지문 — 높이 그림을 그린 뒤 법선 지도로 바꾼다 (이어 붙여도 티가 나지 않는다)
export function makeClayNormal(seed = 7) {
  const S = 512, c = canvas(S, S), g = c.getContext('2d'), r = rng(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, S, S);
  const wrap = (fn) => { for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) { g.save(); g.translate(ox * S, oy * S); fn(); g.restore(); } };
  g.lineCap = 'round'; g.lineJoin = 'round';
  for (let i = 0; i < 70; i++) {            // 문지른 자국
    const x = r() * S, y = r() * S, a = r() * 6.3, l = 40 + r() * 110, wd = 9 + r() * 16, dark = r() < 0.55, al = 0.1 + r() * 0.14, bend = (r() - 0.5) * 1.2;
    wrap(() => { g.strokeStyle = dark ? `rgba(40,40,40,${al})` : `rgba(215,215,215,${al})`; g.lineWidth = wd; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + bend) * l * 0.5, y + Math.sin(a + bend) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
  for (let i = 0; i < 230; i++) {           // 엄지로 누른 자국
    const x = r() * S, y = r() * S, rad = 8 + r() * 24, dark = r() < 0.68, al = 0.3 + r() * 0.35, sx = 0.7 + r() * 0.6, rot = r() * 3.2;
    wrap(() => {
      g.save(); g.translate(x, y); g.rotate(rot); g.scale(sx, 1);
      const gr = g.createRadialGradient(0, 0, rad * 0.15, 0, 0, rad);
      gr.addColorStop(0, dark ? `rgba(48,48,48,${al})` : `rgba(205,205,205,${al * 0.8})`); gr.addColorStop(0.7, dark ? `rgba(90,90,90,${al * 0.45})` : `rgba(170,170,170,${al * 0.4})`); gr.addColorStop(1, 'rgba(128,128,128,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rad, 0, 7); g.fill(); g.restore();
    });
  }
  for (let i = 0; i < 9; i++) {             // 지문
    const x = r() * S, y = r() * S, rot = r() * 6.3, rx = 22 + r() * 20, ry = rx * (1.2 + r() * 0.4), rings = Math.round(rx / 5);
    wrap(() => {
      g.save(); g.translate(x, y); g.rotate(rot);
      for (let k = 1; k <= rings; k++) {
        const f = k / rings;
        g.strokeStyle = `rgba(44,44,44,${0.5 * (1 - f * 0.6)})`; g.lineWidth = 2.1;
        g.beginPath(); g.ellipse(0, ry * 0.3 * (1 - f), rx * f, ry * f, 0, Math.PI * 1.04, Math.PI * 1.96); g.stroke();
        g.beginPath(); g.ellipse(0, ry * 0.3 * (1 - f), rx * f, ry * f * 0.85, 0, Math.PI * 0.1, Math.PI * 0.9); g.stroke();
      }
      g.restore();
    });
  }
  for (let i = 0; i < 26; i++) {            // 도구 자국
    const x = r() * S, y = r() * S, a = r() * 6.3, l = 10 + r() * 40;
    wrap(() => { g.strokeStyle = `rgba(${r() < 0.6 ? '36,36,36' : '210,210,210'},${0.14 + r() * 0.2})`; g.lineWidth = 1.2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); });
  }
  const src = g.getImageData(0, 0, S, S).data, out = g.createImageData(S, S), o = out.data, K = 2.6;
  const H = (x, y) => src[(((y + S) % S) * S + ((x + S) % S)) * 4] / 255;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * K * 4, dy = (H(x, y + 1) - H(x, y - 1)) * K * 4, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    o[i] = (-dx / l * 0.5 + 0.5) * 255; o[i + 1] = (dy / l * 0.5 + 0.5) * 255; o[i + 2] = (1 / l * 0.5 + 0.5) * 255; o[i + 3] = 255;
  }
  g.putImageData(out, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

export function makeGlowTexture(inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.35)') {
  const S = 128, c = canvas(S, S), g = c.getContext('2d');
  const gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.22, mid); gr.addColorStop(0.6, 'rgba(255,255,255,0.06)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 먼 하늘: 아래쪽이 희부옇게 밝은 밤안개
export function makeSkyTexture() {
  const c = canvas(8, 256), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#05080e'); gr.addColorStop(0.42, '#0c1522'); gr.addColorStop(0.68, '#1d2c3f'); gr.addColorStop(0.86, '#2c3f55'); gr.addColorStop(1, '#1a2634');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ───── 재질 ─────
export const boil = { value: 0 };      // 스톱모션의 '끓는' 표면: 일정한 박자로만 바뀌는 값
let clayTex = null;

export function clayMat(o = {}) {
  if (!clayTex) clayTex = makeClayNormal();
  const k = o.bump ?? 1;
  const m = new THREE.MeshStandardMaterial({
    vertexColors: o.vertexColors !== false, color: o.color ?? 0xffffff,
    roughness: o.rough ?? 0.64, metalness: o.metal ?? 0,
    normalMap: clayTex, normalScale: new THREE.Vector2(k, k),
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide,
  });
  const ampU = { value: o.boil ?? 0.007 };
  m.userData.boilAmp = ampU;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uBoil = boil; sh.uniforms.uBoilAmp = ampU;
    sh.vertexShader = 'uniform float uBoil;\nuniform float uBoilAmp;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
      { vec3 wp = (modelMatrix * vec4(transformed, 1.0)).xyz;
        float b = sin(wp.x * 5.3 + uBoil * 1.7) * sin(wp.y * 4.7 + uBoil * 2.9) * sin(wp.z * 5.9 + uBoil * 1.3);
        transformed += objectNormal * b * uBoilAmp; }`);
  };
  return m;
}

// 단색 덩어리를 바로 메시로
export function clayMesh(geo, mat, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}
