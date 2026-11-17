// 세트: 점토로 빚은 땅과 배경 (길마다 한 번 만들어 두고 움직이지 않는 것들)
import * as THREE from '../vendor/three.module.min.js';
import { rng, noise3, fbm, clayify, mergeGeos, roundBox, clayMat } from './clay.js';

export const ZB = -2.6, ZF = 1.4;      // 길이 놓인 점토판의 뒤·앞
export const THEME = {
  forest: { a: 0x5a4c3e, b: 0x43392f, top: 0x66783f, far: 0x2f3b30, grass: 0x55693a, fog: 0x16233a, sky: ['#070b14', '#101c30', '#24384f', '#3a5068', '#22303f'] },
  castle: { a: 0x66625f, b: 0x4b4a4c, top: 0x7c7a70, far: 0x33353c, grass: 0x55604a, fog: 0x1a2236, sky: ['#090b16', '#141a30', '#2a3350', '#444d6a', '#262c40'] },
  cliff:  { a: 0x4d5968, b: 0x39424f, top: 0x66788a, far: 0x2a3340, grass: 0x56646a, fog: 0x15243a, sky: ['#060a14', '#0e1a2e', '#1f3550', '#38526e', '#1e2c3e'] },
  garden: { a: 0x4a4466, b: 0x37324e, top: 0x5a6a86, far: 0x2a2a44, grass: 0x4f7a78, fog: 0x1b1d3c, sky: ['#090818', '#161434', '#2c2a58', '#4a4478', '#262446'] },
};
const WOOD = { a: 0x8a6442, b: 0x65472e, top: 0x9c7650 };
const BARK = [0x3a3029, 0x28211d], PALE = [0x6a655c, 0x4a4640];

export function buildSet(L) {
  const r = rng(20161 + L.w * 7), pal = THEME[L.theme];
  const { w, h, tiles } = L;
  const T = (x, y) => (x >= 0 && x < w && y >= 0 && y < h ? tiles[y * w + x] : 0);
  const group = new THREE.Group();
  const lists = { t: [], d: [] };
  const add = (g, kind = 'd') => lists[kind].push(g);

  // ── 길: 같은 재료의 타일을 덩어리로 묶어 점토판으로 (아래로 넓어지는 곳에서 끊는다) ──
  const used = new Uint8Array(w * h);
  const free = (x, y, t) => T(x, y) === t && !used[y * w + x];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const t = T(x, y);
    if (!t || used[y * w + x]) continue;
    let x1 = x; const maxW = t === 2 ? 1 : 4 + Math.floor(r() * 6);
    while (x1 + 1 < w && x1 - x + 1 < maxW && free(x1 + 1, y, t) && !!T(x1 + 1, y - 1) === !!T(x, y - 1)) x1++;
    let y1 = y;
    for (;;) {
      const ny = y1 + 1; if (ny >= h || (t === 2 && ny - y >= 3)) break;
      let ok = true; for (let xx = x; ok && xx <= x1; xx++) if (!free(xx, ny, t)) ok = false;
      if (!ok || (T(x - 1, ny) && !T(x - 1, y1)) || (T(x1 + 1, ny) && !T(x1 + 1, y1))) break;
      y1 = ny;
    }
    for (let xx = x; xx <= x1; xx++) for (let yy = y; yy <= y1; yy++) used[yy * w + xx] = 1;
    const wood = t === 2, c = wood ? WOOD : pal;
    const zb = wood ? ZB + 0.5 : ZB - r() * 0.25, zf = wood ? ZF - 0.25 : ZF + r() * 0.1;
    const wd = x1 - x + 1, bottom = y1 === h - 1 ? h + 3 : y1 + 1, ht = bottom - y, small = wd <= 2 && ht <= 1.01;
    const g = roundBox(wd, ht, zf - zb, wood ? 0.1 : small ? 0.3 : 0.24, 0.6);
    g.translate(x + wd / 2, -(y + ht / 2), (zf + zb) / 2);
    add(clayify(g, { amp: wood ? 0.03 : 0.085, freq: 0.8, fine: wood ? 0.012 : 0.028, flatTop: 0.5, color: c.a, color2: c.b, topColor: c.top, seed: x * 0.37 + y }), 't');
  }
  // 굴과 문간의 뒷벽: 위아래가 막힌 낮은 빈칸 뒤를 메운다
  const cave = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    if (T(x, y) || !T(x, y - 1)) continue;
    let y1 = y; while (y1 + 1 < h && !T(x, y1 + 1)) y1++;
    if (y1 + 1 < h && y1 - y < 3) for (let yy = y; yy <= y1; yy++) cave[yy * w + x] = 1;
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!cave[y * w + x]) continue;
    let x1 = x; while (x1 + 1 < w && cave[y * w + x1 + 1] && x1 - x < 6) x1++;
    for (let xx = x; xx <= x1; xx++) cave[y * w + xx] = 0;
    const wd = x1 - x + 1.6, g = roundBox(wd, 1.5, 0.8, 0.2, 0.6);
    g.translate((x + x1 + 1) / 2, -(y + 0.5), ZB - 0.2);
    add(clayify(g, { amp: 0.1, freq: 0.9, fine: 0.02, color: pal.b, color2: 0x1d1a1c, seed: x + y }), 't');
  }

  // ── 길 뒤와 앞의 땅 ──
  const baseTop = (xi) => {
    const x = Math.max(0, Math.min(w - 1, xi));
    if (!T(x, h - 1)) return h + 3;
    let y = h - 1; while (y > 0 && T(x, y - 1)) y--;
    return y;
  };
  const cache = new Map();
  const st = (i) => { let v = cache.get(i); if (v === undefined) { let s = 0, n = 0; for (let k = -2; k <= 2; k++) { const wt = 3 - Math.abs(k); s += baseTop(i + k) * wt; n += wt; } v = s / n; cache.set(i, v); } return v; };
  const topAt = (x) => { const i = Math.floor(x), f = x - i; return st(i) * (1 - f) + st(i + 1) * f; };
  const bgY = (x, z) => {
    const base = -topAt(x);
    if (z > 0) return base - 0.38 - (z - 1.3) * 0.8 + (noise3(x * 0.6, 3, z * 0.6) - 0.5) * 0.25;
    const d = -z - 2.4;
    return base - 0.06 - d * 0.02 + (fbm(x * 0.05, 1.5, z * 0.05) - 0.5) * Math.min(3, d * 0.25) + (noise3(x * 0.45, 7, z * 0.45) - 0.5) * 0.4 * Math.min(1, d);
  };
  const cA = new THREE.Color(), cB = new THREE.Color();
  const sheet = (zs, x0, x1, shade) => {
    const nx = x1 - x0 + 1, nz = zs.length, pos = new Float32Array(nx * nz * 3), col = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), idx = [];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + i, z = zs[j], k = j * nx + i;
      pos[k * 3] = x; pos[k * 3 + 1] = bgY(x, z); pos[k * 3 + 2] = z;
      cA.set(pal.far); cB.set(pal.top).multiplyScalar(0.75);
      cA.lerp(cB, noise3(x * 0.3, 2, z * 0.3) * 0.75).multiplyScalar(shade * (0.8 + 0.4 * noise3(x * 1.3, 5, z * 1.3)));
      col[k * 3] = cA.r; col[k * 3 + 1] = cA.g; col[k * 3 + 2] = cA.b;
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
    const back = new THREE.Mesh(sheet([-48, -36, -27, -20, -14.5, -10.5, -7.5, -5.2, -3.6, -2.45], x0, x0 + 64, 0.62), groundMat);
    const front = new THREE.Mesh(sheet([1.3, 2.1, 3.2, 5, 8], x0, x0 + 64, 0.6), groundMat);
    back.receiveShadow = front.receiveShadow = true; group.add(back, front);
  }

  // ── 소품을 빚는 손 ──
  const up = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();
  const tube = (ax, ay, az, bx, by, bz, r0, r1, o) => {
    dir.set(bx - ax, by - ay, bz - az); const len = dir.length();
    const g = new THREE.CylinderGeometry(r1, r0, len, 7, Math.max(2, Math.round(len / 0.7)), true);
    g.applyQuaternion(q.setFromUnitVectors(up, dir.normalize())); g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
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
  const box = (x, y, z, sx, sy, sz, o) => { const g = roundBox(sx, sy, sz, Math.min(0.12, sx * 0.2), 0.5); g.translate(x, y, z); return clayify(g, { amp: 0.03, ...o }); };
  const surfaceY = (x) => { const tx = Math.floor(x); let best = null; for (let y = 0; y < h; y++) if (T(tx, y) && !T(tx, y - 1) && (y < 2 || !T(tx, y - 2))) best = y; return best; };   // 걸을 수 있는 가장 아래 윗면

  // 풀과 돌: 어느 길에나
  for (let x = 2; x < w - 1; x += 0.3 + r() * 0.55) {
    const dens = L.theme === 'forest' ? 0.85 : L.theme === 'garden' ? 0.9 : 0.4;
    if (r() > dens) continue;
    const sy = surfaceY(x); if (sy === null || sy >= h - 1 || T(Math.floor(x), sy) === 2) continue;
    const z = ZB + 0.25 + r() * (ZF - ZB - 0.5), near = Math.abs(z) < 0.45, n = 3 + Math.floor(r() * 3), hgt = near ? 0.2 : 0.3 + r() * 0.35;
    for (let i = 0; i < n; i++) {
      const hh = hgt * (0.55 + r() * 0.6), g = new THREE.ConeGeometry(0.03 + r() * 0.025, hh, 4, 3), pos = g.attributes.position, lx = (r() - 0.5) * 0.5, lz = (r() - 0.5) * 0.3;
      for (let k = 0; k < pos.count; k++) { const t = (pos.getY(k) + hh / 2) / hh; pos.setX(k, pos.getX(k) + lx * t * t); pos.setZ(k, pos.getZ(k) + lz * t * t); }
      g.translate(x + (r() - 0.5) * 0.3, -sy + hh / 2 - 0.03, z + (r() - 0.5) * 0.2);
      add(clayify(g, { amp: 0.008, fine: 0.004, color: pal.grass, color2: 0x2a3324, seed: i }));
    }
  }
  for (let x = 3; x < w - 2; x += 2.5 + r() * 5) {
    const sy = surfaceY(x); if (sy === null || sy >= h - 1) continue;
    const z = r() < 0.5 ? ZB + 0.3 + r() * 1.1 : 0.8 + r() * 0.45, s = 0.12 + r() * 0.2;
    add(blob(x, -sy + s * 0.45, z, s * (1 + r() * 0.5), s * 0.7, s, { color: 0x6a6660, color2: 0x4a4a4c, seed: x }));
  }
  const trees = (cols, gapA, gapB, dead, canopy) => {
    for (let x = -8; x < w + 8; x += gapA + r() * gapB) {
      const lay = r(), z = lay < 0.5 ? -3.4 - r() * 2 : -6 - r() * 5.5, y = bgY(x, z);      // 너무 멀리는 세우지 않는다 (안개 속에 떠 보인다)
      if ([-2, -1, 0, 1, 2].some((k) => baseTop(Math.round(x) + k) >= h)) continue;
      const hgt = dead ? 5 + r() * 6 : canopy ? 4.5 + r() * 3 : 11 + r() * 6, rad = (dead ? 0.22 : 0.3) + r() * 0.3 + (z < -10 ? 0.25 : 0);
      add(trunk(x, y, z, hgt, rad, rad * (dead ? 0.25 : 0.6), (r() - 0.5) * 0.06, cols, x));
      if (canopy) for (let i = 0; i < 3; i++) add(blob(x + (r() - 0.5) * 1.6, y + hgt + (r() - 0.3) * 1.2, z + (r() - 0.5), 1.3 + r() * 0.9, 1.0 + r() * 0.6, 1.2 + r() * 0.6, { color: canopy[0], color2: canopy[1], seed: x + i }));
      else if (dead || r() < 0.5) for (let i = 0; i < (dead ? 2 + Math.floor(r() * 3) : 1); i++) { const by = y + hgt * (0.35 + r() * 0.5), s = r() < 0.5 ? -1 : 1, bl = 0.9 + r() * 1.8; add(tube(x, by, z, x + s * bl, by + 0.4 + r() * 0.9, z + (r() - 0.5) * 0.8, rad * 0.32, 0.03, { color: cols[0], color2: cols[1], seed: x + i })); }
    }
  };
  const mushrooms = (step, cap, stem) => {
    for (let x = 4; x < w - 3; x += step * (0.5 + r())) {
      const sy = surfaceY(x); if (sy === null || sy >= h - 1) continue;
      const z = ZB + 0.3 + r() * 1.3;
      for (let i = 0; i < 1 + Math.floor(r() * 3); i++) {
        const mx = x + i * 0.22, hh = 0.14 + r() * 0.2, cg = new THREE.SphereGeometry(0.11 + r() * 0.07, 9, 6, 0, 6.3, 0, 1.6);
        cg.translate(mx, -sy + hh, z + i * 0.1);
        add(clayify(cg, { amp: 0.012, color: cap[0], color2: cap[1], seed: mx }));
        add(tube(mx, -sy, z + i * 0.1, mx, -sy + hh + 0.02, z + i * 0.1, 0.035, 0.028, { color: stem, amp: 0.006 }));
      }
    }
  };
  const bricks = (x0, x1, y, rows, cols) => {
    for (let x = x0; x < x1; x += 0.98) {
      const n = Math.max(0, Math.round(rows * (0.5 + noise3(x * 0.21, 1, y)) + (r() - 0.5)));
      for (let k = 0; k < n; k++) { if (r() < 0.08) continue; add(box(x + (k % 2) * 0.45 + (r() - 0.5) * 0.05, -y + 0.21 + k * 0.45, -3.25 + (r() - 0.5) * 0.08, 0.9, 0.42, 0.5, { amp: 0.02, color: cols[Math.floor(r() * cols.length)], color2: 0x3a3536, seed: x + k })); }
    }
  };

  if (L.theme === 'forest') { trees(BARK, 1.5, 2.6, false); mushrooms(9, [0xb8a890, 0x8a7868], 0xc4bba8); }
  if (L.theme === 'castle') {
    for (let x = 2; x < w - 2; x += 14) { const sy = surfaceY(x + 2); if (sy !== null && sy < h - 1) bricks(x, x + 9 + r() * 4, sy, 5, [0x6e675f, 0x5c5650, 0x7a7068]); }
    for (let x = 6; x < w; x += 9 + r() * 9) {        // 무너진 기둥과 먼 탑
      const z = -4 - r() * 3, y = bgY(x, z), n = 2 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) add(box(x + (r() - 0.5) * 0.12, y + 0.4 + k * 0.82, z, 1.0, 0.8, 1.0, { amp: 0.05, color: 0x6a665f, color2: 0x4e4c4b, seed: x + k }));
    }
    for (let i = 0; i < 6; i++) { const x = 8 + i * 20 + r() * 8, z = -20 - r() * 10, y = bgY(x, z); add(box(x, y + 7, z, 4 + r() * 2, 14 + r() * 6, 4, { amp: 0.25, color: 0x2a2c36, color2: 0x1f2028, seed: i })); }
    trees(PALE, 6, 8, true);
  }
  if (L.theme === 'cliff') {
    trees(PALE, 4, 6, true);
    for (let i = 0; i < 10; i++) { const x = -10 + i * 15 + r() * 6; add(blob(x, -24 - r() * 5, -38 - r() * 8, 9 + r() * 7, 13 + r() * 8, 5, { color: 0x202a38, color2: 0x18202b, seed: i })); }
    const dome = new THREE.SphereGeometry(4.2, 18, 10, 0, 6.3, 0, 1.6); dome.translate(w - 8, bgY(w - 8, -9) + 2.5, -9);       // 낡은 천문대
    add(clayify(dome, { amp: 0.12, color: 0x55606e, color2: 0x3c4552, seed: 3 }));
    add(box(w - 8, bgY(w - 8, -9) + 1.2, -9, 8, 2.6, 6, { amp: 0.1, color: 0x4a5462, color2: 0x363e4a, seed: 4 }));
  }
  if (L.theme === 'garden') { trees([0x3a3350, 0x2a2540], 2.6, 3.6, false, [0x3d4a78, 0x2c3560]); mushrooms(5, [0xc8c0e0, 0x9088b8], 0xd0cbe0); }
  // 앞을 스치는 줄기 몇 개
  for (let x = 25; x < w - 10; x += 34 + r() * 16) {
    const z = 2.5 + r() * 0.4, y = bgY(x, z); if (Math.abs(x - L.goal.x) < 14 || [-2, -1, 0, 1, 2].some((k) => baseTop(Math.round(x) + k) >= h)) continue;
    const g = new THREE.CylinderGeometry(0.15, 0.2 + r() * 0.06, 16, 8, 14, true), pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const t = (pos.getY(i) + 8) / 16; pos.setX(i, pos.getX(i) + Math.sin(t * 4 + x) * 0.12); }
    g.translate(x, y + 7.6, z);
    add(clayify(g, { amp: 0.05, freq: 1.4, color: 0x1b1714, color2: 0x12100e, seed: x }));
  }
  // 문 위 아치의 쐐기돌, 나방 둥지와 가지
  for (const a of L.arches) add(box((a.x0 + a.x1 + 1) / 2, -a.y + 0.28, ZF - 0.1, 3.3, 0.5, 0.5, { amp: 0.04, color: pal.top, color2: pal.a, seed: a.x0 }));
  for (const c of L.creatures) if (c.kind === 'moth') {
    add(blob(c.x, -c.y + 0.32, -0.3, 0.4, 0.28, 0.38, { color: 0x7a7064, color2: 0x554e46, seed: c.x }));
    add(tube(c.x + 1.6, -c.y + 2.2, -1.6, c.x, -c.y + 0.5, -0.3, 0.12, 0.05, { color: PALE[0], color2: PALE[1], seed: c.x }));
    add(trunk(c.x + 1.7, bgY(c.x + 1.7, -1.7), -1.7, (-c.y + 2.6) - bgY(c.x + 1.7, -1.7), 0.3, 0.12, 0, PALE, c.x));
  }

  const terrainMat = clayMat({ rough: 0.62, bump: 1.05, boil: 0.004 }), decorMat = clayMat({ rough: 0.62, bump: 1.0, boil: 0.006 });
  for (const k of ['t', 'd']) { if (!lists[k].length) continue; const m = new THREE.Mesh(mergeGeos(lists[k]), k === 't' ? terrainMat : decorMat); m.castShadow = true; m.receiveShadow = true; group.add(m); }
  return { group, bgY, pal };
}
