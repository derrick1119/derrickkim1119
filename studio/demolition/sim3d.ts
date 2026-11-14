/**
 * 3D 칸 물리 (C002, 재수립 1차 — 오너: "건물 자체를 3D로").
 * 2D `simulate`(game.ts)의 규칙 ①②③을 x(가로)·z(깊이)·y(높이) 칸 격자로 일반화했다. 결정적 — 미리 보기 = 실제.
 *   ① 폭약 = 그 블록을 날린다(돌은 둘, 쇠는 안 붙음). 가스통이 터지면 둘레 26칸(3×3×3)에 폭약 하나씩 — 연쇄.
 *   ② 남은 블록은 면으로 붙은 것끼리(6이웃) 한 덩어리. 받침이 없으면 떨어지고, 무게중심이 받침 네모(땅을 딛은 칸들의 x·z 범위)
 *      밖으로 **한 축에서만** 나가면 그쪽으로 90° 넘어진다 — 앞·뒤·좌·우 4방향. 두 축 다 나가면(모서리 하나로 서면) 넘어지지 않고
 *      **제자리에서 주저앉는다**(📐 GDD §10.1 — 격자엔 대각으로 넘어질 길이 없다). 떨어지거나 넘어진 덩어리가 자기보다 가볍거나 같은 건물을 치면 그것도 와르르.
 *   ③ 무너진 블록은 반(3D 바둑판 칸 (x+y+z)&1)이 먼지로 날아가고, 나머지는 조각이 되어 흘러내린다
 *      (아래가 비면 떨어지고, 옆이 두 칸 넘게 비면 옆으로 — 먼저 밀려온 쪽, 그다음 옆 두 쪽, 그다음 반대쪽).
 * 시뮬레이션은 판의 원래 좌표에서만 돈다. 시점 회전·거울은 그리기·입력 변환일 뿐이다(PM 재수립 1차).
 * 깊이 1짜리 판(D = 1)은 2D `simulate`와 결과가 같다 — tests/studio-demolition-3d.test.ts가 지킨다.
 */
export const WOOD = 1, STONE = 2, GAS = 3, METAL = 4;
const MASS = [0, 1, 2, 1, 2];
const HP = [0, 1, 2, 1, 99];
/** 넘어지거나 떨어진 조각이 쌓일 수 있는 높이(칸) */
export const SH3 = 26;
const CHAIN_T = 10, TIP_T = 66, SLIDE_T = 4, SLUMP_T = 30, EPS = 1e-3;

export interface Blk3 { m: number; paint: number; x: number; y: number; z: number; par: number }
export interface Lot { x0: number; x1: number; z0: number; z1: number }
export interface Layout3 {
  /** 현장 크기: 가로 W(x) × 깊이 D(z) */
  W: number;
  D: number;
  blocks: Blk3[];
  /** 빨간 선 안쪽(조각이 있어도 되는 칸) */
  lot: Lot;
  goal: number;
  flat: number;
  /** 꽃밭 칸 [x, z] */
  flowers: [number, number][];
  charges: number;
  /** 반장 목표 수(📐 GDD §4 A안) — 있으면 기폭 손잡이 판: ★3 = 이 수 이하로 쓰고 ★2까지(C008) */
  save?: number;
}

/** 그리기용 움직임 한 토막. k 0 = 흘러내림 · 1 = 넘어짐(axis 0 = x 방향으로, 1 = z 방향으로, dir ±1) · 2 = 떨어짐 */
export interface Seg3 { t0: number; t1: number; k: number; a: [number, number, number]; b: [number, number, number]; axis: number; dir: number; pv: number; py: number; lift: number }
export interface Tip3 { axis: number; dir: number; pv: number; py: number; ids: number[] }
export interface Outcome3 {
  die: Int16Array;
  fx: Int16Array;
  fy: Int16Array;
  fz: Int16Array;
  rubT: Int16Array;
  dust: Uint8Array;
  segs: Seg3[][] | null;
  tips: Tip3[];
  falls: number;
  crushes: number;
  /** 빨간 선 밖으로 나간 조각 수 — 면별 [x−, x+, z−, z+] */
  hits: [number, number, number, number];
  hitT: number;
  flowers: number;
  height: number;
  moved: boolean;
  ok: boolean;
  star: boolean[];
  stars: number;
  /** 모서리 하나로 서서 제자리에서 주저앉은 덩어리 수 */
  slumps: number;
  end: number;
}

export const capOf3 = (b: Blk3) => (b.m === METAL ? 0 : b.m === STONE ? 2 : 1);
const N6 = [1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 1, 0, 0, -1];
const fallT = (d: number) => Math.round(12 + 8 * Math.sqrt(d));

/** 폭약 배치(블록마다 개수) → 무너진 결과. rec이면 그리기용 움직임까지 남긴다(미리 보기·봇 탐색은 rec 없이 같은 규칙) */
export function simulate3(Lay: Layout3, ch: ArrayLike<number>, rec = false): Outcome3 {
  const B = Lay.blocks, n = B.length, W = Lay.W, D = Lay.D, WD = W * D;
  const X = new Int16Array(n), Y = new Int16Array(n), Z = new Int16Array(n), hp = new Int8Array(n), st = new Uint8Array(n);
  const prefA = new Int8Array(n), prefD = new Int8Array(n);
  const die = new Int16Array(n).fill(-1), rubT = new Int16Array(n).fill(-1), dust = new Uint8Array(n);
  const occ = new Int16Array(WD * SH3).fill(-1);
  const at = (x: number, y: number, z: number) => y * WD + z * W + x;
  const inside = (x: number, y: number, z: number) => x >= 0 && x < W && z >= 0 && z < D && y >= 0 && y < SH3;
  const segs: Seg3[][] | null = rec ? B.map(() => []) : null;
  const segEnd = new Int16Array(n);
  for (let i = 0; i < n; i++) (X[i] = B[i].x), (Y[i] = B[i].y), (Z[i] = B[i].z), (hp[i] = HP[B[i].m]), (occ[at(X[i], Y[i], Z[i])] = i);

  // ① 폭약 · 가스통 연쇄
  const q: number[] = [];
  const kill = (i: number, t: number) => {
    st[i] = 2;
    die[i] = t;
    occ[at(X[i], Y[i], Z[i])] = -1;
    q.push(i);
  };
  for (let i = 0; i < n; i++)
    if (ch[i] > 0 && B[i].m !== METAL) {
      hp[i] -= ch[i];
      if (hp[i] <= 0) kill(i, 0);
    }
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (B[i].m !== GAS) continue;
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = X[i] + dx, y = Y[i] + dy, z = Z[i] + dz;
          if ((!dx && !dy && !dz) || !inside(x, y, z)) continue;
          const j = occ[at(x, y, z)];
          if (j < 0 || B[j].m === METAL) continue;
          if (--hp[j] <= 0) kill(j, die[i] + CHAIN_T);
        }
  }
  let T = (q.length ? die[q[q.length - 1]] : 0) + 14;
  const { x0, x1, z0, z1 } = Lay.lot;
  let moved = false, falls = 0, crushes = 0, hitT = -1, slumps = 0;
  const hits: [number, number, number, number] = [0, 0, 0, 0];
  const tips: Tip3[] = [];
  const comp = new Int16Array(n);
  const hitAt = (x: number, z: number, t: number) => {
    const side = x < x0 ? 0 : x > x1 ? 1 : z < z0 ? 2 : z > z1 ? 3 : -1;
    if (side < 0) return;
    hits[side as 0 | 1 | 2 | 3]++;
    if (hitT < 0 || t < hitT) hitT = t;
  };
  const addSeg = (i: number, s: Seg3) => {
    if (segs) segs[i].push(s);
    segEnd[i] = Math.max(segEnd[i], s.t1);
  };
  const P3 = (i: number): [number, number, number] => [X[i], Y[i], Z[i]];
  /** 무너진 블록 → 조각. 건물은 속이 비어 있어서 반(바둑판 칸)은 먼지가 되어 날아간다 — 쇠는 그대로 */
  const crumble = (j: number, t: number) => {
    rubT[j] = t;
    if (B[j].m !== METAL && B[j].par) {
      st[j] = 2;
      die[j] = t;
      dust[j] = 1;
      if (occ[at(X[j], Y[j], Z[j])] === j) occ[at(X[j], Y[j], Z[j])] = -1;
      return;
    }
    st[j] = 1;
    occ[at(X[j], Y[j], Z[j])] = j;
  };
  /** 조각이 흘러내릴 때 먼저 갈 쪽: 덩어리 무게중심에서 먼 축 */
  const prefFrom = (j: number, cx: number, cz: number) => {
    const dx = X[j] + 0.5 - cx, dz = Z[j] + 0.5 - cz;
    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
      if (Math.abs(dx) >= Math.abs(dz)) (prefA[j] = 0), (prefD[j] = dx > 0 ? 1 : -1);
      else (prefA[j] = 1), (prefD[j] = dz > 0 ? 1 : -1);
    } else (prefA[j] = 0), (prefD[j] = B[j].par ? 1 : -1);
  };

  // ② 덩어리: 떨어짐 · 넘어짐 · 깔림 → ③ 조각 흘러내림. 물결(wave)마다 되풀이
  for (let wave = 0; wave < 4; wave++) {
    comp.fill(-1);
    const comps: number[][] = [];
    for (let i = 0; i < n; i++) {
      if (st[i] !== 0 || comp[i] >= 0) continue;
      const c = comps.length, list = [i];
      comp[i] = c;
      for (let k = 0; k < list.length; k++) {
        const j = list[k];
        for (let e = 0; e < 18; e += 3) {
          const x = X[j] + N6[e], y = Y[j] + N6[e + 1], z = Z[j] + N6[e + 2];
          if (!inside(x, y, z)) continue;
          const o = occ[at(x, y, z)];
          if (o >= 0 && st[o] === 0 && comp[o] < 0) (comp[o] = c), list.push(o);
        }
      }
      comps.push(list);
    }
    /** 0 그대로 · 1 떨어짐 · 2 넘어짐 · 4 깔림·주저앉음 */
    const C = comps.length;
    const act = new Int8Array(C), axis = new Int8Array(C), dirs = new Int8Array(C), piv = new Float32Array(C), pivY = new Int16Array(C);
    const cxs = new Float32Array(C), czs = new Float32Array(C), crushAt = new Int16Array(C);
    let any = false;
    for (let c = 0; c < C; c++) {
      let m = 0, mx = 0, mz = 0, sx0 = 99, sx1 = -1, sz0 = 99, sz1 = -1, sy = 99;
      for (const j of comps[c]) {
        const w = MASS[B[j].m];
        m += w;
        mx += w * (X[j] + 0.5);
        mz += w * (Z[j] + 0.5);
        const below = Y[j] > 0 ? occ[at(X[j], Y[j] - 1, Z[j])] : -1;
        if (Y[j] === 0 || (below >= 0 && st[below] === 1))
          (sx0 = Math.min(sx0, X[j])), (sx1 = Math.max(sx1, X[j])), (sz0 = Math.min(sz0, Z[j])), (sz1 = Math.max(sz1, Z[j])), (sy = Math.min(sy, Y[j]));
      }
      const cx = (cxs[c] = mx / m), cz = (czs[c] = mz / m);
      if (sx1 < 0) {
        act[c] = 1;
        any = true;
        continue;
      }
      const ox = cx < sx0 - EPS ? sx0 - cx : cx > sx1 + 1 + EPS ? cx - sx1 - 1 : 0;
      const oz = cz < sz0 - EPS ? sz0 - cz : cz > sz1 + 1 + EPS ? cz - sz1 - 1 : 0;
      if (!ox && !oz) continue;
      any = true;
      if (ox && oz) {
        // 모서리 하나로 섰다: 제자리에서 와르르 (깔림과 같은 처리)
        act[c] = 4;
        crushAt[c] = T + SLUMP_T;
        slumps++;
        continue;
      }
      act[c] = 2;
      pivY[c] = sy;
      if (ox) (axis[c] = 0), (dirs[c] = cx > sx1 + 1 ? 1 : -1), (piv[c] = dirs[c] > 0 ? sx1 + 1 : sx0);
      else (axis[c] = 1), (dirs[c] = cz > sz1 + 1 ? 1 : -1), (piv[c] = dirs[c] > 0 ? sz1 + 1 : sz0);
    }
    if (!any) break;
    moved = true;
    const t0 = T;
    let tEnd = T + 8;
    const massOf = (list: number[]) => list.reduce((a, j) => a + MASS[B[j].m], 0);
    const crush = (c: number, t: number, w: number) => {
      if (act[c] === 4) return void (crushAt[c] = Math.min(crushAt[c], t));
      if (comps[c].some((j) => st[j] !== 0) || w < massOf(comps[c])) return;
      act[c] = 4;
      crushAt[c] = t;
      crushes++;
    };
    const minOf = (list: number[], A: Int16Array) => list.reduce((a, j) => Math.min(a, A[j]), 99);
    const key = comps.map((list) => minOf(list, Y) * 10000 + minOf(list, Z) * 100 + minOf(list, X));
    const order = comps.map((_, c) => c).sort((a, b) => key[a] - key[b]);
    // 떨어지는 덩어리 (아래 것부터)
    for (const c of order) {
      if (act[c] !== 1) continue;
      falls++;
      const list = comps[c];
      for (const j of list) occ[at(X[j], Y[j], Z[j])] = -1;
      let d = 99;
      for (const j of list) {
        let k = 0;
        while (Y[j] - k - 1 >= 0 && occ[at(X[j], Y[j] - k - 1, Z[j])] < 0) k++;
        d = Math.min(d, k);
      }
      const tl = t0 + fallT(d);
      tEnd = Math.max(tEnd, tl);
      for (const j of list) {
        const a = P3(j);
        Y[j] -= d;
        addSeg(j, { t0, t1: tl, k: 2, a, b: P3(j), axis: 0, dir: 0, pv: 0, py: 0, lift: 0 });
      }
      const w = massOf(list);
      for (const j of list) {
        const o = Y[j] > 0 ? occ[at(X[j], Y[j] - 1, Z[j])] : -1;
        if (o >= 0 && st[o] === 0) crush(comp[o], tl, w);
      }
      for (const j of list) crumble(j, tl), prefFrom(j, cxs[c], czs[c]);
    }
    // 넘어지는 덩어리: 받침 모서리(pv, py)를 축으로 90°. axis 0이면 x-y 평면에서, 1이면 z-y 평면에서 돈다
    for (const c of order) {
      if (act[c] !== 2) continue;
      const list = comps[c], ax = axis[c], dir = dirs[c], P = piv[c], Py = pivY[c];
      const U = ax === 0 ? X : Z;
      for (const j of list) occ[at(X[j], Y[j], Z[j])] = -1;
      const nu: number[] = [], ny: number[] = [];
      let minY = 99;
      for (const j of list) {
        const ru = dir > 0 ? P + Y[j] - Py : P - (Y[j] - Py) - 1, ry = dir > 0 ? Py + P - U[j] - 1 : Py + U[j] - P;
        nu.push(ru);
        ny.push(ry);
        minY = Math.min(minY, ry);
      }
      const lift = Math.max(0, -minY), w = massOf(list);
      const V = ax === 0 ? Z : X;
      const idx = list.map((_, k) => k).sort((a, b) => ny[a] - ny[b] || nu[a] - nu[b] || V[list[a]] - V[list[b]]);
      const tl = t0 + TIP_T;
      tEnd = Math.max(tEnd, tl);
      tips.push({ axis: ax, dir, pv: P, py: Py, ids: list.slice() });
      for (const k of idx) {
        const j = list[k], a = P3(j);
        let u = nu[k], y = ny[k] + lift;
        const ux = ax === 0 ? u : X[j], uz = ax === 0 ? Z[j] : u;
        hitAt(ux, uz, tl - 6);
        const far: [number, number, number] = [ux, y, uz];
        addSeg(j, { t0, t1: tl, k: 1, a, b: far, axis: ax, dir, pv: P, py: Py, lift });
        u = Math.max(0, Math.min((ax === 0 ? W : D) - 1, u));
        const x = ax === 0 ? u : X[j], z = ax === 0 ? Z[j] : u;
        const o = occ[at(x, y, z)];
        if (o >= 0 && st[o] === 0) crush(comp[o], tl - 8, w);
        prefA[j] = ax;
        prefD[j] = dir;
        if (B[j].par && B[j].m !== METAL) {
          (X[j] = x), (Y[j] = y), (Z[j] = z), crumble(j, tl);
          continue;
        }
        while (occ[at(x, y, z)] >= 0) y++;
        if (x !== far[0] || y !== far[1] || z !== far[2]) addSeg(j, { t0: tl, t1: tl + 6, k: 0, a: far, b: [x, y, z], axis: 0, dir: 0, pv: 0, py: 0, lift: 0 });
        X[j] = x;
        Y[j] = y;
        Z[j] = z;
        crumble(j, tl);
      }
    }
    // 깔린 덩어리 → 그 자리에서 조각
    for (let c = 0; c < C; c++) {
      if (act[c] !== 4) continue;
      for (const j of comps[c]) {
        segEnd[j] = Math.max(segEnd[j], crushAt[c]);
        crumble(j, crushAt[c]);
        prefFrom(j, cxs[c], czs[c]);
      }
    }
    // ③ 조각이 모래처럼 흘러내린다 (아래 층부터, 한 번에 한 칸)
    const sx = X.slice(), sy = Y.slice(), sz = Z.slice();
    for (let pass = 0; pass < 120; pass++) {
      let mv = false;
      for (let y = 1; y < SH3; y++)
        for (let z = 0; z < D; z++)
          for (let x = 0; x < W; x++) {
            const j = occ[at(x, y, z)];
            if (j < 0 || st[j] !== 1) continue;
            let tx = -1, tz = -1;
            if (occ[at(x, y - 1, z)] < 0) (tx = x), (tz = z);
            else {
              const a = prefA[j], d = prefD[j];
              // 먼저 밀려온 쪽 → 다른 축 양쪽 → 반대쪽 (📐 §10.1 ③)
              const tries = [a, d, 1 - a, 1, 1 - a, -1, a, -d];
              for (let e = 0; e < 8; e += 2) {
                const xx = x + (tries[e] === 0 ? tries[e + 1] : 0), zz = z + (tries[e] === 1 ? tries[e + 1] : 0);
                if (xx >= 0 && xx < W && zz >= 0 && zz < D && occ[at(xx, y, zz)] < 0 && occ[at(xx, y - 1, zz)] < 0 && (y < 2 || occ[at(xx, y - 2, zz)] < 0)) {
                  (tx = xx), (tz = zz);
                  break;
                }
              }
            }
            if (tx < 0) continue;
            occ[at(x, y, z)] = -1;
            occ[at(tx, y - 1, tz)] = j;
            X[j] = tx;
            Y[j] = y - 1;
            Z[j] = tz;
            mv = true;
          }
      if (!mv) break;
    }
    for (let j = 0; j < n; j++) {
      if (st[j] !== 1 || (sx[j] === X[j] && sy[j] === Y[j] && sz[j] === Z[j])) continue;
      const a = Math.max(segEnd[j], t0 + 4), dist = Math.abs(sx[j] - X[j]) + Math.abs(sy[j] - Y[j]) + Math.abs(sz[j] - Z[j]);
      const b = a + 6 + dist * SLIDE_T;
      addSeg(j, { t0: a, t1: b, k: 0, a: [sx[j], sy[j], sz[j]], b: P3(j), axis: 0, dir: 0, pv: 0, py: 0, lift: 0 });
      hitAt(X[j], Z[j], b);
      tEnd = Math.max(tEnd, b);
    }
    T = tEnd + 6;
  }
  // 결과
  let height = 0;
  const fl = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (st[i] === 2) continue;
    height = Math.max(height, Y[i] + 1);
    if (st[i] === 1 && Lay.flowers.some(([fx, fz]) => fx === X[i] && fz === Z[i])) fl.add(Z[i] * W + X[i]);
  }
  const hit = hits.some((h) => h > 0);
  const ok = moved && !hit && height <= Lay.goal;
  // 손잡이 판(save): ★3 = 아끼기(쓴 폭약 ≤ 반장 목표 · ★2까지), 그 밖의 판: ★3 = 납작 (📐 GDD §4·§10.5)
  let used = 0;
  for (let i = 0; i < ch.length; i++) used += ch[i];
  const star = [ok, ok && fl.size === 0, ok && (Lay.save !== undefined ? fl.size === 0 && used <= Lay.save : height <= Lay.flat)];
  return {
    die, fx: X, fy: Y, fz: Z, rubT, dust, segs, tips, falls, crushes, hits, hitT, flowers: fl.size, height, moved, ok, star,
    stars: star.filter(Boolean).length, slumps, end: T + 10,
  };
}

// ───────────────────────────── 판 데이터 ─────────────────────────────
const CH3: Record<string, [number, number]> = {
  w: [WOOD, 0], p: [WOOD, 1], y: [WOOD, 2], b: [WOOD, 3], g: [WOOD, 4], r: [WOOD, 5],
  S: [STONE, 0], G: [GAS, 0], T: [METAL, 1], M: [METAL, 0],
};

/**
 * 3D 판 정의. layers[y]는 그 층(y = 0이 땅 바로 위)의 평면도: 문자열 D줄(앞 z = 0부터), 줄마다 W글자(x = 0부터).
 * 글자: '.' 빈칸 · w p y b g r 나무(칠 색) · S 돌 · G 가스통 · T 물탱크(쇠) · M 쇠기둥.
 */
export interface StageDef3 {
  key: string;
  title: string;
  news: string;
  hint: string;
  W: number;
  D: number;
  layers: string[][];
  lot: Lot;
  goal: number;
  flat: number;
  flowers: [number, number][];
  charges: number;
  /** 반장 목표 수 — 있으면 기폭 손잡이 판(1-4부터) */
  save?: number;
}

export function layoutOf3(d: StageDef3): Layout3 {
  const blocks: Blk3[] = [];
  d.layers.forEach((rows, y) => {
    if (rows.length !== d.D) throw new Error(`${d.title}: ${y}층 줄 수 ${rows.length} ≠ D ${d.D}`);
    rows.forEach((row, z) => {
      if (row.length !== d.W) throw new Error(`${d.title}: ${y}층 ${z}줄 길이 ${row.length} ≠ W ${d.W}`);
      for (let x = 0; x < d.W; x++) {
        const e = CH3[row[x]];
        if (e) blocks.push({ m: e[0], paint: e[1], x, y, z, par: (x + y + z) & 1 });
      }
    });
  });
  blocks.sort((a, b) => a.y - b.y || a.z - b.z || a.x - b.x);
  return { W: d.W, D: d.D, blocks, lot: { ...d.lot }, goal: d.goal, flat: d.flat, flowers: d.flowers.map(([x, z]) => [x, z] as [number, number]), charges: d.charges, ...(d.save !== undefined ? { save: d.save } : {}) };
}

/** 2D 판(위 줄부터의 지도) → 깊이 1짜리 3D 판. 2D와 3D 규칙이 같은지 재는 회귀 테스트용 */
export function from2D(d: { title: string; map: string[]; lot: [number, number]; goal: number; flat: number; flowers: number[]; charges: number }, W = 12): StageDef3 {
  const H = d.map.length;
  return {
    key: '', title: d.title, news: '', hint: '', W, D: 1,
    layers: Array.from({ length: H }, (_, y) => [d.map[H - 1 - y]]),
    lot: { x0: d.lot[0], x1: d.lot[1], z0: 0, z1: 0 }, goal: d.goal, flat: d.flat, flowers: d.flowers.map((x) => [x, 0] as [number, number]), charges: d.charges,
  };
}

/** 모든 폭약 조합(돌은 둘까지)을 n개 쓰는 계획을 차례로 부른다 */
export function forEachPlan(L: Layout3, k: number, f: (ch: Int8Array, plan: number[]) => void) {
  const n = L.blocks.length, ch = new Int8Array(n), cur: number[] = [];
  const rec = (start: number, left: number) => {
    if (left === 0) return f(ch, cur);
    for (let i = start; i < n; i++) {
      if (ch[i] >= capOf3(L.blocks[i])) continue;
      ch[i]++;
      cur.push(i);
      rec(i, left - 1);
      cur.pop();
      ch[i]--;
    }
  };
  rec(0, k);
}

// ───────────────────────────── 발자국 (C003, 📐 §10.4-2) ─────────────────────────────
/** 덩어리 하나의 받침: 딛은 칸, 발자국 네모, 무게중심(추), 그리고 이대로 쾅 하면 처음에 무엇을 할지 */
export interface Footing {
  ids: number[];
  feet: [number, number, number][];
  rect: { x0: number; x1: number; z0: number; z1: number } | null;
  /** 무게중심 x·z와 높이 y (칸 단위, 블록 가운데 = +0.5) */
  cx: number;
  cy: number;
  cz: number;
  /** stand 버팀 · tip 넘어짐(axis·dir) · slump 제자리 주저앉음 · fall 떨어짐 */
  act: 'stand' | 'tip' | 'slump' | 'fall';
  axis: number;
  dir: number;
}

/**
 * 폭약 배치 → ① 폭발(가스 연쇄 포함) 직후 남은 덩어리마다의 받침. simulate3의 첫 물결 판정과 같은 규칙(테스트가 지킨다).
 * 미리 보기에서 '꿈쩍 안 함'이어도 발 칸·네모·추가 바뀌는 것을 보여 주려고 쓴다(눈먼 수 줄이기).
 */
export function support3(Lay: Layout3, ch: ArrayLike<number>): Footing[] {
  const B = Lay.blocks, n = B.length, W = Lay.W, D = Lay.D, WD = W * D;
  const occ = new Int16Array(WD * SH3).fill(-1), hp = new Int8Array(n), dead = new Uint8Array(n);
  const at = (x: number, y: number, z: number) => y * WD + z * W + x;
  for (let i = 0; i < n; i++) (hp[i] = HP[B[i].m]), (occ[at(B[i].x, B[i].y, B[i].z)] = i);
  const q: number[] = [];
  for (let i = 0; i < n; i++)
    if (ch[i] > 0 && B[i].m !== METAL && (hp[i] -= ch[i]) <= 0) (dead[i] = 1), q.push(i);
  for (let k = 0; k < q.length; k++) {
    const g = B[q[k]];
    if (g.m !== GAS) continue;
    for (let dy = -1; dy <= 1; dy++)
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = g.x + dx, y = g.y + dy, z = g.z + dz;
          if ((!dx && !dy && !dz) || x < 0 || x >= W || z < 0 || z >= D || y < 0 || y >= SH3) continue;
          const j = occ[at(x, y, z)];
          if (j < 0 || dead[j] || B[j].m === METAL) continue;
          if (--hp[j] <= 0) (dead[j] = 1), q.push(j);
        }
  }
  const comp = new Int16Array(n).fill(-1), out: Footing[] = [];
  for (let i = 0; i < n; i++) {
    if (dead[i] || comp[i] >= 0) continue;
    const list = [i];
    comp[i] = out.length;
    for (let k = 0; k < list.length; k++) {
      const b = B[list[k]];
      for (let e = 0; e < 18; e += 3) {
        const x = b.x + N6[e], y = b.y + N6[e + 1], z = b.z + N6[e + 2];
        if (x < 0 || x >= W || z < 0 || z >= D || y < 0 || y >= SH3) continue;
        const o = occ[at(x, y, z)];
        if (o >= 0 && !dead[o] && comp[o] < 0) (comp[o] = out.length), list.push(o);
      }
    }
    let m = 0, mx = 0, my = 0, mz = 0, sx0 = 99, sx1 = -1, sz0 = 99, sz1 = -1;
    const feet: [number, number, number][] = [];
    for (const j of list) {
      const b = B[j], w = MASS[b.m];
      (m += w), (mx += w * (b.x + 0.5)), (my += w * (b.y + 0.5)), (mz += w * (b.z + 0.5));
      if (b.y === 0) feet.push([b.x, b.y, b.z]), (sx0 = Math.min(sx0, b.x)), (sx1 = Math.max(sx1, b.x)), (sz0 = Math.min(sz0, b.z)), (sz1 = Math.max(sz1, b.z));
    }
    const cx = mx / m, cz = mz / m;
    let act: Footing['act'] = 'stand', axis = 0, dir = 0;
    if (sx1 < 0) act = 'fall';
    else {
      const ox = cx < sx0 - EPS ? 1 : cx > sx1 + 1 + EPS ? 1 : 0, oz = cz < sz0 - EPS ? 1 : cz > sz1 + 1 + EPS ? 1 : 0;
      if (ox && oz) act = 'slump';
      else if (ox) (act = 'tip'), (axis = 0), (dir = cx > sx1 + 1 ? 1 : -1);
      else if (oz) (act = 'tip'), (axis = 1), (dir = cz > sz1 + 1 ? 1 : -1);
    }
    out.push({ ids: list, feet, rect: sx1 < 0 ? null : { x0: sx0, x1: sx1 + 1, z0: sz0, z1: sz1 + 1 }, cx, cy: my / m, cz, act, axis, dir });
  }
  return out;
}

/**
 * 빠진 받침(C005, 화면 ✕와 funqa F4b가 같이 쓴다): 덩어리마다 지금 딛고 있는 발 중, 폭약을 더한 뒤 그 덩어리(블록이 가장 많이 겹치는 덩어리)가
 * 더는 딛지 않는 발 칸 [x, z] 목록. 윗다리·마루 귀를 끊어 다리 토막이 떨어져 나가도 덩어리 기준으로 발을 잃는다.
 */
export function lostFeet(now: Footing[], nxt: Footing[]): [number, number][] {
  const out: [number, number][] = [];
  for (const f of now) {
    let best: Footing | null = null, ov = 0;
    for (const g of nxt) {
      const o = g.ids.filter((j) => f.ids.includes(j)).length;
      if (o > ov) (ov = o), (best = g);
    }
    const keep = new Set((best?.feet ?? []).map((q) => `${q[0]},${q[2]}`));
    for (const [x, , z] of f.feet) if (!keep.has(`${x},${z}`)) out.push([x, z]);
  }
  return out;
}
/** 받침 비교 열쇠 — 발 좌표는 정렬한다(🧪 C005: 덩어리를 훑는 순서가 달라 같은 발인데 '변화 없음'이 안 뜨던 버그) */
export const feetKey3 = (fs: Footing[]) => fs.map((f) => `${f.act}${f.axis}${f.dir}:${f.feet.map((q) => q.join(',')).sort().join(' ')}`).sort().join('|');

/** 첫 톡(또는 겨눔)이 '무변화'인가 — 움직이지도, 받침을 잃지도, 받침 모양이 바뀌지도 않음 → 화면에 '변화 없음' (F4b-0, 시점과 무관) */
export function isQuiet(L: Layout3, ch: Int8Array, i: number): boolean {
  const c2 = ch.slice();
  c2[i] = ch[i] ? 0 : capOf3(L.blocks[i]);
  const now = support3(L, ch), nxt = support3(L, c2);
  return !simulate3(L, c2).moved && lostFeet(now, nxt).length === 0 && feetKey3(now) === feetKey3(nxt);
}

/** 결과 한 줄(마지막 폭약 꾹 꼬리표 · 결과 글 공용) — 2D 판정 말풍선과 같은 정보 */
export function verdict3(L: Layout3, o: Outcome3): { ok: boolean; text: string } {
  if (!o.moved) return { ok: false, text: '꿈쩍 안 함' };
  if (o.hits.some((h) => h > 0)) return { ok: false, text: '💥 이웃집을 쳐요' };
  if (!o.ok) return { ok: false, text: `아직 높아요 (${o.height}칸 > 목표 ${L.goal}칸)` };
  return { ok: true, text: `철거 성공 ${'★'.repeat(o.stars)}${'☆'.repeat(3 - o.stars)}${o.star[1] ? '' : ' 🥀'}` };
}

/**
 * 꾹 꼬리표 규칙(🧪 C007 ④ · 시험 빚 ③): 결과 꼬리표는 '마지막 폭약을 새로 붙일 때', 블록 꼬리표는 붙인 블록이면 '떼기', 무변화면 '변화 없음'.
 * 마지막 폭약이 무변화면 결과 꼬리표가 이미 '꿈쩍 안 함'이라 블록 꼬리표는 겹쳐 띄우지 않는다.
 * 손잡이 판(save)은 움직이는 겨눔에도 결과 꼬리표(안 움직이면 '변화 없음' 그대로 — F4b-0).
 */
export function holdTags(cap: number, chA: number, left: number, quiet: boolean, save = false, moved = false): { result: boolean; block: '떼기' | '변화 없음' | null } {
  // 손잡이 판(📐 C008): 마지막 폭약이 아니어도 무엇이든 움직이면 결과 꼬리표 — 지금 붙이고 손잡이를 당기면 그대로 되니까
  const result = !chA && cap > 0 && (cap >= left || (save && moved));
  return { result, block: chA ? '떼기' : quiet && !result ? '변화 없음' : null };
}

/**
 * 남은 폭약으로 갈 수 있는 끝(📐 C008 '막다른 길'): 지금 붙인 것에 더 붙여 쾅 했을 때의 최고 별(0 = 성공 없음).
 * 손잡이 판(save)은 0개~남은 수까지 아무 때나 쾅(단 하나도 안 붙이고는 못 함), 아니면 남은 폭약을 다 써야 쾅.
 * need 별에 닿으면 바로 멈춘다(막다른 길 판단은 need 1).
 */
export function bestReach(L: Layout3, ch: Int8Array, need = 3): number {
  const n = L.blocks.length, c = ch.slice();
  let left = L.charges - c.reduce((a, v) => a + v, 0), best = 0;
  const handle = L.save !== undefined;
  const leaf = () => {
    if (c.some((v) => v > 0)) {
      const o = simulate3(L, c);
      if (o.ok) best = Math.max(best, o.stars);
    }
  };
  const rec = (start: number) => {
    if (best >= need) return;
    if (handle || left === 0) leaf();
    for (let i = start; i < n && left > 0; i++) {
      const k = capOf3(L.blocks[i]);
      if (c[i] || !k || k > left) continue;
      c[i] = k;
      left -= k;
      rec(i + 1);
      left += k;
      c[i] = 0;
    }
  };
  rec(0);
  return best;
}
