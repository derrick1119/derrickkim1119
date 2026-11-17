// 세트: 점토로 빚은 땅과 배경 (한 번 만들어 두고 움직이지 않는 것들)
import * as THREE from '../vendor/three.module.min.js';
import { rng, noise3, fbm, clayify, mergeGeos, roundBox, clayMat } from './clay.js';

export const ZB = -2.6, ZF = 1.4;      // 길이 놓인 점토판의 뒤·앞
const PAL = {
  forest: { a: 0x4a4038, b: 0x37312d, top: 0x4f5c3c, far: 0x27302a },
  burrow: { a: 0x54392d, b: 0x3a2923, top: 0x5d4636, far: 0x2b2420 },
  hollow: { a: 0x3e3d47, b: 0x2c2b34, top: 0x4a4d57, far: 0x26272f },
  yard:   { a: 0x4a4a4c, b: 0x36373b, top: 0x5c5b57, far: 0x292a2d },
  cliff:  { a: 0x3c4552, b: 0x2b323c, top: 0x4d5a66, far: 0x242a33 },
  bridge: { a: 0x5c4733, b: 0x3f3024, top: 0x6c573f, far: 0x242a33 },
};
const BARK = [0x2f2925, 0x1f1b19], PALE = [0x56514a, 0x3a3733];
const zoneOf = (L, x) => { for (const z of L.zones) if (x <= z.x1 + 0.999) return z; return L.zones[L.zones.length - 1]; };

export function buildSet(L) {
  const r = rng(20161);
  const { w, h, tiles } = L;
  const T = (x, y) => x >= 0 && x < w && y >= 0 && y < h && tiles[y * w + x] !== 0;
  const group = new THREE.Group();
  const CH = 32, chunks = new Map();
  const bucket = (x, kind) => { const k = Math.floor(Math.max(0, Math.min(w - 1, x)) / CH) + kind; if (!chunks.has(k)) chunks.set(k, []); return chunks.get(k); };
  const add = (g, x, kind = 'd') => bucket(x, kind).push(g);

  // ── 길: 타일을 덩어리로 묶어 점토판으로 ──
  const used = new Uint8Array(w * h);
  const free = (x, y) => T(x, y) && !used[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!free(x, y)) continue;
    let x1 = x; const maxW = 4 + Math.floor(r() * 6);
    while (x1 + 1 < w && x1 - x + 1 < maxW && free(x1 + 1, y) && zoneOf(L, x1 + 1) === zoneOf(L, x) && T(x1 + 1, y - 1) === T(x, y - 1)) x1++;
    let y1 = y;
    for (;;) {
      const ny = y1 + 1; if (ny >= h) break;
      let ok = true; for (let xx = x; ok && xx <= x1; xx++) if (!free(xx, ny)) ok = false;
      if (!ok) break;
      if ((T(x - 1, ny) && !T(x - 1, y1)) || (T(x1 + 1, ny) && !T(x1 + 1, y1))) break;   // 여기서부터 넓어진다
      y1 = ny;
    }
    for (let xx = x; xx <= x1; xx++) for (let yy = y; yy <= y1; yy++) used[yy * w + xx] = 1;
    const zone = zoneOf(L, x), pal = PAL[zone.kind];
    const plank = zone.kind === 'bridge' && y1 - y < 2 && x < 244;
    const zb = plank ? -1.15 : ZB - r() * 0.25, zf = plank ? 1.15 : ZF + r() * 0.1;
    const wd = x1 - x + 1, bottom = y1 === h - 1 ? h + 3 : y1 + 1, ht = plank ? 0.42 : bottom - y;
    const small = wd <= 2 && ht <= 1.01;
    const g = roundBox(wd, ht, zf - zb, plank ? 0.1 : small ? 0.3 : 0.24, 0.6);
    g.translate(x + wd / 2, -(y + ht / 2), (zf + zb) / 2);
    add(clayify(g, { amp: plank ? 0.03 : 0.085, freq: 0.8, fine: plank ? 0.012 : 0.028, flatTop: plank ? 0.5 : 0.5, color: pal.a, color2: pal.b, topColor: pal.top, seed: x * 0.37 + y }), x, 't');
  }
  // 굴의 뒷벽
  for (const b of [{ x0: 63, x1: 91, y0: 6, y1: 11.4, k: 'burrow' }, { x0: 97.6, x1: 102, y0: 14, y1: 17.4, k: 'hollow' }]) {
    for (let x = b.x0; x < b.x1; x += 7) {
      const wd = Math.min(7, b.x1 - x), g = roundBox(wd, b.y1 - b.y0, 0.9, 0.2, 0.6);
      g.translate(x + wd / 2, -(b.y0 + b.y1) / 2, ZB - 0.25);
      add(clayify(g, { amp: 0.11, freq: 0.9, fine: 0.02, color: PAL[b.k].b, color2: 0x1b1614, seed: x }), x, 't');
    }
  }

  // ── 길 뒤와 앞의 땅 ──
  const baseTop = (xi) => {
    const x = Math.max(0, Math.min(w - 1, xi));
    if (x >= 64 && x <= 90) return 2;
    if (!T(x, h - 1)) return h + 3;
    let y = h - 1; while (T(x, y - 1)) y--;
    return y;
  };
  const smoothTop = (x) => { const i = Math.round(x); let s = 0, n = 0; for (let k = -2; k <= 2; k++) { const wt = 3 - Math.abs(k); s += baseTop(i + k) * wt; n += wt; } return s / n; };
  const topCache = new Map();
  const st = (xi) => { let v = topCache.get(xi); if (v === undefined) { v = smoothTop(xi); topCache.set(xi, v); } return v; };
  const topAt = (x) => { const i = Math.floor(x), f = x - i; return st(i) * (1 - f) + st(i + 1) * f; };
  // (x, z) 자리의 땅 높이 (three 좌표의 Y)
  const bgY = (x, z) => {
    const base = -topAt(x);
    if (z > 0) return base - 0.38 - (z - 1.3) * 0.8 + (noise3(x * 0.6, 3, z * 0.6) - 0.5) * 0.25;
    const d = -z - 2.4;
    return base - 0.06 + d * 0.05 + (fbm(x * 0.05, 1.5, z * 0.05) - 0.5) * Math.min(9, d * 0.42) + (noise3(x * 0.45, 7, z * 0.45) - 0.5) * 0.4 * Math.min(1, d);
  };
  const farCol = new THREE.Color(), tmp = new THREE.Color();
  const sheet = (zs, x0, x1, shade) => {
    const nx = x1 - x0 + 1, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i, z = zs[j], k = j * nx + i, zone = zoneOf(L, Math.max(0, Math.min(w - 1, x)));
      pos[k * 3] = x; pos[k * 3 + 1] = bgY(x, z); pos[k * 3 + 2] = z;
      farCol.set(PAL[zone.kind].far); tmp.set(PAL[zone.kind].top).multiplyScalar(0.7);
      farCol.lerp(tmp, noise3(x * 0.3, 2, z * 0.3) * 0.7).multiplyScalar(shade * (0.8 + 0.4 * noise3(x * 1.3, 5, z * 1.3)));
      col[k * 3] = farCol.r; col[k * 3 + 1] = farCol.g; col[k * 3 + 2] = farCol.b;
      uv[k * 2] = x * 0.3; uv[k * 2 + 1] = z * 0.3;
      if (i < nx - 1 && j < nz - 1) idx.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  const groundMat = clayMat({ rough: 0.8, bump: 0.9, boil: 0 });
  for (let x0 = -32; x0 < w + 32; x0 += 64) {
    const back = new THREE.Mesh(sheet([-48, -36, -27, -20, -14.5, -10.5, -7.5, -5.2, -3.6, -2.45], x0, x0 + 64, 1), groundMat);
    back.receiveShadow = true; group.add(back);
    const front = new THREE.Mesh(sheet([1.3, 2.1, 3.2, 5, 8], x0, x0 + 64, 0.55), groundMat);
    front.receiveShadow = true; group.add(front);
  }

  // ── 소품을 빚는 손 ──
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  const tube = (ax, ay, az, bx, by, bz, r0, r1, o) => {
    dir.set(bx - ax, by - ay, bz - az); const len = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 7, Math.max(2, Math.round(len / 0.7)), true);
    g.applyQuaternion(q.setFromUnitVectors(up, dir.normalize()));
    g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
    return clayify(g, { amp: 0.04, freq: 1.6, fine: 0.012, ...o });
  };
  const trunk = (x, baseY, z, hgt, r0, r1, lean, cols, seed) => {
    const g = new THREE.CylinderGeometry(r1, r0, hgt, 9, Math.max(4, Math.round(hgt / 0.9)), true), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) + hgt / 2, t = y / hgt, flare = 1 + 0.9 * Math.exp(-y * 2.4);
      pos.setX(i, pos.getX(i) * flare + lean * t * t * hgt + Math.sin(t * 5 + seed) * 0.14);
      pos.setZ(i, pos.getZ(i) * flare + Math.cos(t * 4 + seed * 2) * 0.1);
    }
    g.translate(x, baseY + hgt / 2 - 0.15, z);
    return clayify(g, { amp: 0.1, freq: 1.2, fine: 0.022, color: cols[0], color2: cols[1], seed });
  };
  const blob = (x, y, z, sx, sy, sz, o) => {
    const g = new THREE.IcosahedronGeometry(1, 2);
    g.scale(sx, sy, sz); g.translate(x, y, z);
    return clayify(g, { amp: 0.14 * Math.min(sx, sy, sz) + 0.02, freq: 1.4 / Math.max(0.4, Math.max(sx, sz)), fine: 0.012, ...o });
  };
  const grass = (x, y, z, hgt, n, col) => {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const hh = hgt * (0.55 + r() * 0.6), g = new THREE.ConeGeometry(0.03 + r() * 0.025, hh, 4, 3), pos = g.attributes.position;
      const lx = (r() - 0.5) * 0.5, lz = (r() - 0.5) * 0.3;
      for (let k = 0; k < pos.count; k++) { const t = (pos.getY(k) + hh / 2) / hh; pos.setX(k, pos.getX(k) + lx * t * t); pos.setZ(k, pos.getZ(k) + lz * t * t); }
      g.translate(x + (r() - 0.5) * 0.3, y + hh / 2 - 0.03, z + (r() - 0.5) * 0.2);
      parts.push(clayify(g, { amp: 0.008, fine: 0.004, color: col, color2: 0x232a1e, seed: i }));
    }
    return parts;
  };
  const surfaceY = (x, from = 0) => { const tx = Math.floor(x); for (let y = Math.max(0, from); y < h; y++) if (T(tx, y)) return y; return null; };

  // ── 숲: 나무 줄기가 안개 속으로 겹겹이 ──
  const trees = (x0, x1, cols, gapA, gapB, dead) => {
    for (let x = x0; x < x1; x += gapA + r() * gapB) {
      const lay = r(), z = lay < 0.38 ? -3.3 - r() * 2 : lay < 0.78 ? -6.5 - r() * 6 : -14 - r() * 12;
      const y = bgY(x, z);
      if (y < -(h + 1)) continue;
      const hgt = dead ? 5 + r() * 6 : 11 + r() * 6, rad = (dead ? 0.22 : 0.3) + r() * 0.35 + (z < -10 ? 0.25 : 0);
      add(trunk(x, y, z, hgt, rad, rad * (dead ? 0.25 : 0.6), (r() - 0.5) * 0.06, cols, x), x);
      if (dead || r() < 0.5) {
        const n = dead ? 2 + Math.floor(r() * 3) : 1;
        for (let i = 0; i < n; i++) { const by = y + hgt * (0.35 + r() * 0.5), s = r() < 0.5 ? -1 : 1, bl = 0.9 + r() * 1.8; add(tube(x, by, z, x + s * bl, by + 0.4 + r() * 0.9, z + (r() - 0.5) * 0.8, rad * 0.32, 0.03, { color: cols[0], color2: cols[1], seed: x + i }), x); }
      }
    }
  };
  trees(-8, 64, BARK, 1.5, 2.6, false);
  trees(92, 136, PALE, 2.2, 3.4, true);
  trees(182, 204, PALE, 3, 4, true);
  // 앞쪽을 스쳐 지나가는 검은 줄기
  for (const x of [22.5, 57.5, 110.5, 126.5]) {
    const z = 2.5 + r() * 0.4, g = new THREE.CylinderGeometry(0.15, 0.2 + r() * 0.06, 16, 8, 14, true), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 8) / 16; pos.setX(i, pos.getX(i) + Math.sin(t * 4 + x) * 0.12); }
    g.translate(x, bgY(x, z) + 7.6, z);
    add(clayify(g, { amp: 0.05, freq: 1.4, color: 0x15120f, color2: 0x0e0c0b, seed: x }), x);
  }
  // 풀, 돌, 버섯
  for (let x = 2; x < w - 1; x += 0.28 + r() * 0.5) {
    const zone = zoneOf(L, x).kind, inBurrow = x > 64 && x < 91;
    if (zone === 'bridge' && x < 244) continue;
    const dens = zone === 'forest' ? 0.9 : zone === 'hollow' ? 0.4 : zone === 'yard' ? 0.22 : inBurrow ? 0.12 : 0.5;
    if (r() > dens) continue;
    const sy = surfaceY(x, inBurrow ? 8 : zone === 'yard' ? 12 : 0);
    if (sy === null || sy >= h - 1) continue;
    const z = ZB + 0.25 + r() * (ZF - ZB - 0.5), near = Math.abs(z) < 0.45;
    const col = zone === 'forest' ? 0x44542f : zone === 'hollow' ? 0x3d4148 : 0x474a3c;
    for (const g of grass(x, -sy, z, near ? 0.22 : 0.3 + r() * 0.35, 3 + Math.floor(r() * 3), col)) add(g, x);
  }
  for (let x = 3; x < w - 2; x += 2.5 + r() * 5) {
    const inBurrow = x > 64 && x < 91, sy = surfaceY(x, inBurrow ? 8 : zoneOf(L, x).kind === 'yard' ? 12 : 0);
    if (sy === null || sy >= h - 1 || (x > 204 && x < 244)) continue;
    const z = r() < 0.5 ? ZB + 0.3 + r() * 1.2 : 0.75 + r() * 0.5, s = 0.12 + r() * 0.2;
    add(blob(x, -sy + s * 0.45, z, s * (1 + r() * 0.5), s * 0.7, s, { color: 0x55524e, color2: 0x3a3a3c, seed: x }), x);
  }
  for (let x = 4; x < 130; x += 5 + r() * 9) {
    const sy = surfaceY(x, x > 64 && x < 91 ? 8 : 0); if (sy === null || sy >= h - 1) continue;
    const z = ZB + 0.3 + r() * 1.3;
    for (let i = 0; i < 1 + Math.floor(r() * 3); i++) {
      const mx = x + i * 0.22, hh = 0.14 + r() * 0.2, cap = new THREE.SphereGeometry(0.11 + r() * 0.07, 9, 6, 0, 6.3, 0, 1.6);
      cap.translate(mx, -sy + hh, z + i * 0.1);
      add(clayify(cap, { amp: 0.012, color: 0xa79f8f, color2: 0x7d6f62, seed: mx }), x);
      add(tube(mx, -sy, z + i * 0.1, mx, -sy + hh + 0.02, z + i * 0.1, 0.035, 0.028, { color: 0xb5ad9c, amp: 0.006 }), x);
    }
  }
  // 떠 있는 선반을 받치는 굵은 나무
  add(trunk(37, bgY(37, -3.3), -3.35, 13, 0.95, 0.7, 0.01, BARK, 3.7), 37);
  // 낙엽 더미
  for (let i = 0; i < 80; i++) {
    const x = 102 + r() * 4, z = -1.6 + r() * 2.6, g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(0.13 + r() * 0.08, 0.03, 0.08 + r() * 0.05); g.rotateY(r() * 6.3); g.rotateX((r() - 0.5) * 0.8);
    g.translate(x, -17 + 0.03 + r() * 0.2 * Math.sin((x - 102) / 4 * Math.PI), z);
    add(clayify(g, { amp: 0.01, color: [0x9a5a26, 0x7a3f1e, 0xa9772f, 0x5e3a22][i % 4], seed: i }), x);
  }
  // 굴: 천장에서 늘어진 뿌리
  for (let i = 0; i < 46; i++) {
    const x = 64.5 + r() * 26, z = ZB + 0.3 + r() * (ZF - ZB - 0.6), len = (z > 0.3 ? 0.25 : 0.4) + r() * (z > 0.3 ? 0.4 : 1.1);
    add(tube(x, -7 + 0.1, z, x + (r() - 0.5) * 0.4, -7 - len, z + (r() - 0.5) * 0.2, 0.05 + r() * 0.04, 0.012, { color: 0x4b3a2e, color2: 0x2e241e, seed: i }), x);
  }
  // 나방 둥지와 그것이 매달린 가지
  for (const rt of L.roosts) add(blob(rt.x, -rt.y + 0.3, -0.25, 0.42, 0.3, 0.4, { color: 0x6b6258, color2: 0x4a443e, seed: rt.x }), rt.x);
  add(trunk(121.2, -17, -1.5, 6.5, 0.36, 0.1, -0.03, PALE, 12.1), 121);
  add(tube(121.0, -13.6, -1.4, 119.4, -12.0, -0.3, 0.13, 0.05, { color: PALE[0], color2: PALE[1], seed: 5 }), 120);
  add(trunk(189.0, -7, -1.6, 6, 0.34, 0.1, -0.03, PALE, 18.9), 189);
  add(tube(188.8, -4.2, -1.5, 187.4, -2.8, -0.3, 0.12, 0.05, { color: PALE[0], color2: PALE[1], seed: 8 }), 188);
  for (const z of [-1.32, 1.32]) add(tube(224.5, -7.4, z, 224.5, -2.0, z, 0.13, 0.1, { color: 0x4a3a2c, color2: 0x30261d, seed: z }), 224);
  add(tube(224.5, -2.25, -1.5, 224.5, -2.25, 1.5, 0.11, 0.11, { color: 0x4a3a2c, color2: 0x30261d, seed: 2 }), 224);

  // ── 뜰: 무너진 벽돌담, 지붕 기둥, 감시자의 장대 ──
  for (let x = 137; x < 180; x += 0.98) {
    const rows = Math.max(0, Math.round(1.5 + 2.5 * noise3(x * 0.21, 1, 4) + (r() - 0.5)));
    for (let k = 0; k < rows; k++) {
      if (r() < 0.08) continue;
      const g = roundBox(0.9, 0.42, 0.5, 0.07, 0.5);
      g.translate(x + (k % 2) * 0.45 + (r() - 0.5) * 0.05, -14 + 0.21 + k * 0.45, -3.2 + (r() - 0.5) * 0.08);
      add(clayify(g, { amp: 0.02, color: [0x6a4a3c, 0x5a4034, 0x4f3b33][Math.floor(r() * 3)], color2: 0x3a302c, seed: x + k }), x);
    }
  }
  for (const [x0, x1] of [[145, 150], [162, 167]]) {
    for (const x of [x0 + 0.35, x1 - 0.35]) add(tube(x, -14.1, -2.2, x + (r() - 0.5) * 0.15, -10.9, -2.2, 0.13, 0.11, { color: 0x4a3f36, color2: 0x2f2925, seed: x }), x);
  }
  add(tube(156, -14.1, -1.7, 156.05, -3.6, -1.7, 0.2, 0.12, { color: 0x3a3d44, color2: 0x25272c, seed: 1 }), 156);
  add(tube(156.05, -3.9, -1.7, 156, -4.3, -0.2, 0.1, 0.09, { color: 0x3a3d44, color2: 0x25272c, seed: 2 }), 156);
  // 승강대 틀
  for (const x of [180.08, 181.92]) add(tube(x, -15, -1.25, x, -4.6, -1.25, 0.1, 0.085, { color: 0x4a3a2c, color2: 0x30261d, seed: x }), 181);
  add(tube(179.8, -4.75, -1.25, 182.2, -4.75, -1.25, 0.09, 0.09, { color: 0x4a3a2c, color2: 0x30261d, seed: 3 }), 181);

  // ── 다리: 기둥과 밧줄 ──
  const spans = [[204, 209], [211, 216], [218, 229], [231, 236], [238, 244]];
  for (const [a, b] of spans) {
    for (const x of [a + 0.25, b - 0.25]) for (const z of [-1.2, 1.2]) add(tube(x, -8.6, z, x + (r() - 0.5) * 0.12, -7 + 1.15 + (z > 0 ? -0.75 : 0), z, 0.1, 0.075, { color: 0x4a3a2c, color2: 0x30261d, seed: x + z }), x);
    const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(a + 0.25 + (b - a - 0.5) * t, -7 + 1.05 - Math.sin(t * Math.PI) * 0.3, -1.2)); }
    const rope = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.035, 5);
    add(clayify(rope, { amp: 0.006, fine: 0.004, color: 0x7a6a50, color2: 0x54483a, seed: a }), a);
  }
  // 먼 산
  for (let i = 0; i < 9; i++) { const x = 190 + i * 11 + r() * 6; add(blob(x, -22 - r() * 5, -38 - r() * 8, 9 + r() * 7, 12 + r() * 8, 5, { color: 0x1c232d, color2: 0x151a22, seed: i }), x); }
  // 큰 등의 받침
  for (const [wd, ht, y] of [[4.6, 0.5, 0.25], [3.4, 0.5, 0.75], [2.2, 0.7, 1.35]]) {
    const g = roundBox(wd, ht, 2.6, 0.12, 0.5); g.translate(250.5, -7 + y, -1.55);
    add(clayify(g, { amp: 0.03, color: 0x5a5c62, color2: 0x3c3f46, seed: wd }), 250);
  }

  // ── 덩어리째 구워 올린다 ──
  const terrainMat = clayMat({ rough: 0.62, bump: 1.05, boil: 0.004 });
  const decorMat = clayMat({ rough: 0.62, bump: 1.0, boil: 0.006 });
  for (const [k, list] of chunks) {
    if (!list.length) continue;
    const m = new THREE.Mesh(mergeGeos(list), k.endsWith('t') ? terrainMat : decorMat);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  return { group, bgY };
}
