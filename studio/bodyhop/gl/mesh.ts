/**
 * 코드로 만드는 형상 (🖌️ ART v1: 외부 모델 파일 0).
 * ① SDF(거리 함수)를 서피스 네츠로 메시로 굽는다 — 둥글고 매끈한 '말랑한 장난감' 덩어리, 꼭짓점 AO까지 굽는다.
 * ② 회전체(lathe)·도넛·땅 격자 같은 큰 형상은 매개변수로 바로 만든다.
 * 꼭짓점 한 개 = 14 float: 위치3 · 법선3 · 색3 · AO1 · 거칠기1 · 산란1 · 흔들림(세기·위상)2
 */
import { type M4, type V3 } from './m4.ts';

export const STRIDE = 14;
export interface Mesh { v: Float32Array; i: Uint32Array }
export type SDF = (x: number, y: number, z: number) => number;
/** 칠하기: [r, g, b, 거칠기, 산란] (색은 0~1 선형이 아니라 sRGB 값 — 셰이더가 바꾼다) */
export type Paint = (x: number, y: number, z: number) => number[];

// ───────── SDF 조각 ─────────
export const sph = (x: number, y: number, z: number, cx: number, cy: number, cz: number, r: number) => Math.sqrt((x - cx) ** 2 + (y - cy) ** 2 + (z - cz) ** 2) - r;
/** 타원체(근사) */
export function ell(x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const px = (x - cx) / rx, py = (y - cy) / ry, pz = (z - cz) / rz, k0 = Math.sqrt(px * px + py * py + pz * pz);
  const k1 = Math.sqrt((px / rx) ** 2 + (py / ry) ** 2 + (pz / rz) ** 2);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
/** 두 점 사이 둥근 원뿔(반지름 r1 → r2) */
export function rcone(x: number, y: number, z: number, a: V3, b: V3, r1: number, r2: number) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2], px = x - a[0], py = y - a[1], pz = z - a[2];
  const l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const yy = px * bx + py * by + pz * bz, zz = yy - l2;
  const qx = px * l2 - bx * yy, qy = py * l2 - by * yy, qz = pz * l2 - bz * yy, x2 = qx * qx + qy * qy + qz * qz;
  const y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
}
export const cap = (x: number, y: number, z: number, a: V3, b: V3, r: number) => rcone(x, y, z, a, b, r, r);
/** 둥근 상자(가운데 c, 반 크기 h, 모서리 r) */
export function rbox(x: number, y: number, z: number, c: V3, h: V3, r: number) {
  const qx = Math.abs(x - c[0]) - h[0] + r, qy = Math.abs(y - c[1]) - h[1] + r, qz = Math.abs(z - c[2]) - h[2] + r;
  return Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 + Math.max(qz, 0) ** 2) + Math.min(Math.max(qx, qy, qz), 0) - r;
}
export function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export const smax = (a: number, b: number, k: number) => -smin(-a, -b, k);
/** 값 잡음(결정적) — 표면 울퉁불퉁·색 얼룩용 */
export function vnoise(x: number, y: number, z: number) {
  const h = (i: number, j: number, k: number) => {
    let n = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), u), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), u), v),
    l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), u), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), u), v), w);
}
export const hex = (h: string): number[] => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
export const mix3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/**
 * 서피스 네츠: f < 0 이 안쪽. lo~hi 상자를 h 간격 격자로 훑는다.
 * aoF(있으면)는 AO 계산에 쓰는 '주변까지 포함한' 거리(예: 바닥 평면·다른 부품).
 */
export function sdfMesh(f: SDF, paint: Paint, lo: V3, hi: V3, h: number, opt: { aoF?: SDF; aoD?: number; wob?: (x: number, y: number, z: number) => [number, number] } = {}): Mesh {
  const nx = Math.ceil((hi[0] - lo[0]) / h) + 1, ny = Math.ceil((hi[1] - lo[1]) / h) + 1, nz = Math.ceil((hi[2] - lo[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz), P = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[P(i, j, k)] = f(lo[0] + i * h, lo[1] + j * h, lo[2] + k * h);
  const cx = nx - 1, cy = ny - 1, cz = nz - 1, cell = new Int32Array(cx * cy * cz).fill(-1), C = (i: number, j: number, k: number) => i + cx * (j + cy * k);
  const pos: number[] = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let m = 0;
    for (let c = 0; c < 8; c++) {
      const v = (cv[c] = val[P(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))]);
      if (v < 0) m |= 1 << c;
    }
    if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of E) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += (a & 1) + ((b & 1) - (a & 1)) * t;
      sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
      sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
      n++;
    }
    cell[C(i, j, k)] = pos.length / 3;
    pos.push(lo[0] + (i + sx / n) * h, lo[1] + (j + sy / n) * h, lo[2] + (k + sz / n) * h);
  }
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, c, b, a, d, c);
    else idx.push(a, b, c, a, c, d);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = val[P(i, j, k)] < 0;
    if (i < cx && j > 0 && k > 0 && j < cy && k < cz && v0 !== val[P(i + 1, j, k)] < 0) quad(cell[C(i, j - 1, k - 1)], cell[C(i, j, k - 1)], cell[C(i, j, k)], cell[C(i, j - 1, k)], v0);
    if (j < cy && i > 0 && k > 0 && i < cx && k < cz && v0 !== val[P(i, j + 1, k)] < 0) quad(cell[C(i - 1, j, k - 1)], cell[C(i - 1, j, k)], cell[C(i, j, k)], cell[C(i, j, k - 1)], v0);
    if (k < cz && i > 0 && j > 0 && i < cx && j < cy && v0 !== val[P(i, j, k + 1)] < 0) quad(cell[C(i - 1, j - 1, k)], cell[C(i, j - 1, k)], cell[C(i, j, k)], cell[C(i - 1, j, k)], v0);
  }
  const nv = pos.length / 3, v = new Float32Array(nv * STRIDE), e = h * 0.5, aoF = opt.aoF ?? f, aoD = opt.aoD ?? h * 6;
  for (let q = 0; q < nv; q++) {
    const x = pos[q * 3], y = pos[q * 3 + 1], z = pos[q * 3 + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1;
    (gx /= gl), (gy /= gl), (gz /= gl);
    let occ = 0, wsum = 0;
    for (let s = 1; s <= 5; s++) {
      const d = (aoD * s) / 5, w = 1 / s;
      occ += (w * Math.max(0, d - aoF(x + gx * d, y + gy * d, z + gz * d))) / d;
      wsum += w;
    }
    const p = paint(x, y, z), o = q * STRIDE, wb = opt.wob?.(x, y, z) ?? [0, 0];
    v[o] = x; v[o + 1] = y; v[o + 2] = z; v[o + 3] = gx; v[o + 4] = gy; v[o + 5] = gz;
    v[o + 6] = p[0]; v[o + 7] = p[1]; v[o + 8] = p[2];
    v[o + 9] = Math.max(0.15, 1 - (1.6 * occ) / wsum);
    v[o + 10] = p[3] ?? 0.7; v[o + 11] = p[4] ?? 0; v[o + 12] = wb[0]; v[o + 13] = wb[1];
  }
  // 감기 방향: 삼각형 면 법선이 기울기와 반대면 뒤집는다
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * 3, b = idx[t + 1] * 3, c = idx[t + 2] * 3;
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2], wx = pos[c] - pos[a], wy = pos[c + 1] - pos[a + 1], wz = pos[c + 2] - pos[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx, o = idx[t] * STRIDE;
    if (fx * v[o + 3] + fy * v[o + 4] + fz * v[o + 5] < 0) [idx[t + 1], idx[t + 2]] = [idx[t + 2], idx[t + 1]];
  }
  return { v, i: new Uint32Array(idx) };
}

/** 삼각형으로 매끈한 꼭짓점 법선을 다시 낸다(매개변수 형상용) */
function smooth(v: Float32Array, idx: number[]) {
  for (let o = 0; o < v.length; o += STRIDE) v[o + 3] = v[o + 4] = v[o + 5] = 0;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t] * STRIDE, b = idx[t + 1] * STRIDE, c = idx[t + 2] * STRIDE;
    const ux = v[b] - v[a], uy = v[b + 1] - v[a + 1], uz = v[b + 2] - v[a + 2], wx = v[c] - v[a], wy = v[c + 1] - v[a + 1], wz = v[c + 2] - v[a + 2];
    const fx = uy * wz - uz * wy, fy = uz * wx - ux * wz, fz = ux * wy - uy * wx;
    for (const o of [a, b, c]) (v[o + 3] += fx), (v[o + 4] += fy), (v[o + 5] += fz);
  }
  for (let o = 0; o < v.length; o += STRIDE) {
    const l = Math.hypot(v[o + 3], v[o + 4], v[o + 5]);
    if (l < 1e-9) (v[o + 3] = 0), (v[o + 4] = 1), (v[o + 5] = 0); // 넓이 0 삼각형(회전체 꼭지): 0 법선은 폰 GPU에서 NaN
    else (v[o + 3] /= l), (v[o + 4] /= l), (v[o + 5] /= l);
  }
}
/** 회전체: 옆모습 [반지름, 높이] 점들을 Y축으로 돌린다 */
export function lathe(prof: [number, number][], seg: number, paint: Paint, ao: (y: number, r: number) => number = () => 1): Mesh {
  const n = prof.length, v = new Float32Array(n * (seg + 1) * STRIDE), idx: number[] = [];
  for (let s = 0; s <= seg; s++) for (let p = 0; p < n; p++) {
    const a = (s / seg) * Math.PI * 2, [r, y] = prof[p], x = Math.cos(a) * r, z = Math.sin(a) * r, o = (s * n + p) * STRIDE, c = paint(x, y, z);
    v[o] = x; v[o + 1] = y; v[o + 2] = z; v[o + 6] = c[0]; v[o + 7] = c[1]; v[o + 8] = c[2]; v[o + 9] = ao(y, r); v[o + 10] = c[3] ?? 0.7; v[o + 11] = c[4] ?? 0;
  }
  for (let s = 0; s < seg; s++) for (let p = 0; p < n - 1; p++) {
    const a = s * n + p, b = (s + 1) * n + p;
    idx.push(a, a + 1, b + 1, a, b + 1, b);
  }
  smooth(v, idx);
  return { v, i: new Uint32Array(idx) };
}
/** 도넛: 큰 반지름 R, 굵기 r */
export function torus(R: number, r: number, seg: number, side: number, paint: Paint, arc = Math.PI * 2): Mesh {
  const v = new Float32Array((seg + 1) * (side + 1) * STRIDE), idx: number[] = [];
  for (let s = 0; s <= seg; s++) for (let q = 0; q <= side; q++) {
    const a = (s / seg) * arc, b = (q / side) * Math.PI * 2, rr = R + Math.cos(b) * r;
    const x = Math.cos(a) * rr, y = Math.sin(b) * r, z = Math.sin(a) * rr, o = (s * (side + 1) + q) * STRIDE, c = paint(x, y, z);
    v[o] = x; v[o + 1] = y; v[o + 2] = z; v[o + 6] = c[0]; v[o + 7] = c[1]; v[o + 8] = c[2]; v[o + 9] = 0.75 + 0.25 * Math.sin(b); v[o + 10] = c[3] ?? 0.7; v[o + 11] = c[4] ?? 0;
  }
  for (let s = 0; s < seg; s++) for (let q = 0; q < side; q++) {
    const a = s * (side + 1) + q, b = a + side + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  smooth(v, idx);
  return { v, i: new Uint32Array(idx) };
}
/** 땅: 반지름 R 원판 격자, 높이 hf(x, z) */
export function terrain(R: number, n: number, hf: (x: number, z: number) => number, paint: Paint, ao: (x: number, z: number) => number = () => 1): Mesh {
  const v = new Float32Array((n + 1) * (n + 1) * STRIDE), idx: number[] = [];
  for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
    const x = -R + (2 * R * i) / n, z = -R + (2 * R * j) / n, y = hf(x, z), o = (j * (n + 1) + i) * STRIDE, c = paint(x, y, z);
    v[o] = x; v[o + 1] = y; v[o + 2] = z; v[o + 6] = c[0]; v[o + 7] = c[1]; v[o + 8] = c[2]; v[o + 9] = ao(x, z); v[o + 10] = c[3] ?? 0.9; v[o + 11] = c[4] ?? 0;
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = j * (n + 1) + i;
    idx.push(a, a + n + 1, a + 1, a + 1, a + n + 1, a + n + 2);
  }
  smooth(v, idx);
  return { v, i: new Uint32Array(idx) };
}

/** 여러 메시를 행렬로 옮겨 한 덩어리로(그리기 호출 1번) */
export class Batch {
  private vs: Float32Array[] = [];
  private is: Uint32Array[] = [];
  private nv = 0;
  add(m: Mesh, t?: M4, o: { tint?: number[]; wob?: [number, number]; sway?: number } = {}) {
    const v = new Float32Array(m.v);
    if (t) for (let p = 0; p < v.length; p += STRIDE) {
      const x = v[p], y = v[p + 1], z = v[p + 2], nx = v[p + 3], ny = v[p + 4], nz = v[p + 5];
      v[p] = t[0] * x + t[4] * y + t[8] * z + t[12];
      v[p + 1] = t[1] * x + t[5] * y + t[9] * z + t[13];
      v[p + 2] = t[2] * x + t[6] * y + t[10] * z + t[14];
      const a = t[0] * nx + t[4] * ny + t[8] * nz, b = t[1] * nx + t[5] * ny + t[9] * nz, c = t[2] * nx + t[6] * ny + t[10] * nz, l = Math.hypot(a, b, c) || 1;
      (v[p + 3] = a / l), (v[p + 4] = b / l), (v[p + 5] = c / l);
      if (o.sway) (v[p + 12] = Math.max(1e-4, o.sway * Math.abs(v[p + 1] - t[13]))), (v[p + 13] = o.wob?.[1] ?? 0);
    }
    if (o.tint) for (let p = 0; p < v.length; p += STRIDE) (v[p + 6] *= o.tint[0]), (v[p + 7] *= o.tint[1]), (v[p + 8] *= o.tint[2]);
    if (o.wob && !o.sway) for (let p = 0; p < v.length; p += STRIDE) (v[p + 12] = o.wob[0]), (v[p + 13] = o.wob[1]);
    this.vs.push(v);
    this.is.push(m.i.map((x) => x + this.nv));
    this.nv += v.length / STRIDE;
  }
  get size() { return this.nv; }
  done(): Mesh {
    const v = new Float32Array(this.nv * STRIDE), i = new Uint32Array(this.is.reduce((a, x) => a + x.length, 0));
    let a = 0, b = 0;
    for (const x of this.vs) v.set(x, a), (a += x.length);
    for (const x of this.is) i.set(x, b), (b += x.length);
    return { v, i };
  }
}
