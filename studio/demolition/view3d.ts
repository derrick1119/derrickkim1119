/**
 * 3D 화면 계산 (C003, 📐 GDD §10.2·§10.6 · PM C002 결정) — 브라우저와 node 공용(캔버스 없음). 그리기는 main3d.ts.
 * 정사영(원근 없음 → 칸이 어디서나 같은 크기): 내려다봄 30° 고정, 수평 회전(yaw)은 시점 4개 = 25° + 90°×k.
 * 시점 0 = 앞왼(정면에서 왼쪽으로 25° 비낀 자리, 시작 시점). 그리는 순서 = 블록 가운데의 깊이(먼 것부터, 화가 알고리즘).
 * 고르기(손가락 아래 블록)는 그린 순서를 거꾸로 — 가까운 블록의 보이는 면부터 점-다각형 검사. 그래서 보이는 것 = 누르는 것.
 */
export const PITCH = (30 * Math.PI) / 180;
/** 자석 겨누기 반경(칸) — C005: 0.9 → 1.0 (📋 C004 조기 경보) */
export const MAGNET = 1.0;
export const YAW0 = (25 * Math.PI) / 180;
export const yawOf = (view: number) => YAW0 + (((view % 4) + 4) % 4) * (Math.PI / 2);

export interface Cam {
  yaw: number;
  /** 화면 좌표: X = ox + s·u, Y = oy − s·v */
  s: number;
  ox: number;
  oy: number;
  /** 회전 중심(울타리 가운데) */
  cx: number;
  cz: number;
  /** 좌우 거울(시드로 판을 뒤집을 때). 시뮬은 원판 좌표에서만 돌고 거울은 그리기·입력 변환뿐 — C004: 3D 시뮬은 거울 대칭이 아니라서(스캔 순서) 판 데이터를 뒤집지 않는다 */
  mir?: boolean;
}
export type P2 = [number, number];
export interface Cube { x: number; y: number; z: number }

/** 세계 점 → [화면 X, 화면 Y, 깊이(클수록 멀다)] */
export function proj(c: Cam, x: number, y: number, z: number): [number, number, number] {
  const px = x - c.cx, pz = z - c.cz, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
  const d = px * sn + pz * cs, u = px * cs - pz * sn;
  const v = y * Math.cos(PITCH) + d * Math.sin(PITCH);
  return [c.ox + c.s * (c.mir ? -u : u), c.oy - c.s * v, d * Math.cos(PITCH) - y * Math.sin(PITCH)];
}

/** 블록의 보이는 면(윗면 + 카메라를 향한 옆면 둘): 면 이름과 화면 사각형 */
export type FaceName = 'top' | 'xm' | 'xp' | 'zm' | 'zp';
export function faces(c: Cam, b: Cube): { f: FaceName; pts: P2[] }[] {
  const { x, y, z } = b, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw);
  const q = (pts: [number, number, number][]): P2[] => pts.map(([a, bb, cc]) => {
    const p = proj(c, a, bb, cc);
    return [p[0], p[1]];
  });
  const out: { f: FaceName; pts: P2[] }[] = [];
  // 옆면: 바깥 법선 n이 카메라 앞쪽 f = (sin, cos)와 반대(n·f < 0)면 보인다
  if (sn > 1e-9) out.push({ f: 'xm', pts: q([[x, y, z], [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z]]) });
  if (sn < -1e-9) out.push({ f: 'xp', pts: q([[x + 1, y, z], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z]]) });
  if (cs > 1e-9) out.push({ f: 'zm', pts: q([[x, y, z], [x + 1, y, z], [x + 1, y + 1, z], [x, y + 1, z]]) });
  if (cs < -1e-9) out.push({ f: 'zp', pts: q([[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]) });
  out.push({ f: 'top', pts: q([[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]) });
  return out;
}

/** 그리는 순서(먼 것부터) — 블록 번호 목록 */
export function drawOrder(c: Cam, cubes: Cube[]): number[] {
  const dep = cubes.map((b) => proj(c, b.x + 0.5, b.y + 0.5, b.z + 0.5)[2]);
  return cubes.map((_, i) => i).sort((a, b) => dep[b] - dep[a] || a - b);
}

function inQuad(p: P2, q: P2[]): boolean {
  let sgn = 0;
  for (let i = 0; i < q.length; i++) {
    const a = q[i], b = q[(i + 1) % q.length];
    const cr = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    if (Math.abs(cr) < 1e-9) continue;
    const s = cr > 0 ? 1 : -1;
    if (sgn && s !== sgn) return false;
    sgn = s;
  }
  return true;
}

/** 화면 점 아래에 보이는 블록(없으면 -1). order = drawOrder 결과(재사용) */
export function pickAt(c: Cam, cubes: Cube[], X: number, Y: number, order = drawOrder(c, cubes)): number {
  for (let k = order.length - 1; k >= 0; k--) {
    const i = order[k];
    for (const fc of faces(c, cubes[i])) if (inQuad([X, Y], fc.pts)) return i;
  }
  return -1;
}

/** 자석 겨누기(📐 §10.2 · GDD §8-1): 손가락 아래가 붙일 수 있는 블록이면 그것, 아니면 반경 r칸 안에서 '보이는' 붙일 블록의 면 가운데가 가장 가까운 것 */
export function aimAt(c: Cam, cubes: Cube[], ok: (i: number) => boolean, X: number, Y: number, r = MAGNET, order = drawOrder(c, cubes)): number {
  const hit = pickAt(c, cubes, X, Y, order);
  if (hit >= 0 && ok(hit)) return hit;
  let best = -1, bd = (r * c.s) ** 2;
  for (let i = 0; i < cubes.length; i++) {
    if (!ok(i)) continue;
    for (const fc of faces(c, cubes[i])) {
      const mx = fc.pts.reduce((a, p) => a + p[0], 0) / 4, my = fc.pts.reduce((a, p) => a + p[1], 0) / 4;
      const d = (mx - X) ** 2 + (my - Y) ** 2;
      if (d < bd && pickAt(c, cubes, mx, my, order) === i) (bd = d), (best = i);
    }
  }
  return best;
}

/** 블록마다 화면에서 보이는 넓이(px²) — step px 간격 표본 */
export function visibleArea(c: Cam, cubes: Cube[], w: number, h: number, step = 2): number[] {
  const area = cubes.map(() => 0), order = drawOrder(c, cubes);
  // 블록들의 화면 범위만 훑는다
  let x0 = w, x1 = 0, y0 = h, y1 = 0;
  for (const b of cubes)
    for (const fc of faces(c, b))
      for (const [px, py] of fc.pts) (x0 = Math.min(x0, px)), (x1 = Math.max(x1, px)), (y0 = Math.min(y0, py)), (y1 = Math.max(y1, py));
  for (let Y = Math.max(0, y0) + step / 2; Y < Math.min(h, y1); Y += step)
    for (let X = Math.max(0, x0) + step / 2; X < Math.min(w, x1); X += step) {
      const i = pickAt(c, cubes, X, Y, order);
      if (i >= 0) area[i] += step * step;
    }
  return area;
}

/** 판 하나의 카메라 4개 — 줌은 4시점 공통(돌릴 때 줌이 출렁이지 않게), 울타리 + 건물이 화면에 다 들어오게 */
export function fitCams(lot: { x0: number; x1: number; z0: number; z1: number }, cubes: Cube[], w: number, h: number, margin = 10): Cam[] {
  const cx = (lot.x0 + lot.x1 + 1) / 2, cz = (lot.z0 + lot.z1 + 1) / 2;
  const top = cubes.reduce((a, b) => Math.max(a, b.y + 1), 1);
  const pts: [number, number, number][] = [];
  for (const [x, z] of [[lot.x0, lot.z0], [lot.x1 + 1, lot.z0], [lot.x0, lot.z1 + 1], [lot.x1 + 1, lot.z1 + 1]]) pts.push([x, 0, z]);
  for (const b of cubes) pts.push([b.x, top, b.z], [b.x + 1, top, b.z + 1], [b.x + 1, top, b.z], [b.x, top, b.z + 1]);
  const box = [0, 1, 2, 3].map((v) => {
    const c: Cam = { yaw: yawOf(v), s: 1, ox: 0, oy: 0, cx, cz };
    const p = pts.map(([x, y, z]) => proj(c, x, y, z));
    return [Math.min(...p.map((q) => q[0])), Math.max(...p.map((q) => q[0])), Math.min(...p.map((q) => q[1])), Math.max(...p.map((q) => q[1]))];
  });
  const s = Math.min(...box.map(([a, b, c2, d]) => Math.min((w - 2 * margin) / (b - a), (h - 2 * margin) / (d - c2))));
  return box.map(([a, b, c2, d], v) => ({ yaw: yawOf(v), s, ox: w / 2 - (s * (a + b)) / 2, oy: h / 2 - (s * (c2 + d)) / 2, cx, cz }));
}

/** 블록 앞면 한 변이 화면에서 몇 px인가(정사영이라 어디서나 같다): 가로 s·cos(비낌), 세로 s·cos(내려다봄) 중 작은 것 */
export const cellPx = (c: Cam) => c.s * Math.min(Math.abs(Math.cos(YAW0)), Math.cos(PITCH));
