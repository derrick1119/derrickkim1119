/**
 * 비버 철거반 (25라운드: 검증된 캐주얼 뼈대 × 공장의 와우) — 무너뜨리기(물리 철거 퍼즐) × 연쇄 폭발 × 가리키기.
 * 21라운드 '지어서 버티기'를 뒤집었다: 이번엔 낡은 장난감 마을 건물을 정해진 폭약으로 '원하는 쪽으로' 무너뜨린다.
 * 기준 9(손이 하는 일은 하나): 블록을 누르고 있으면 거기 폭약을 붙였을 때 무너질 모양(떨어질 블록 윤곽·쓰러질 방향)이 미리 보이고,
 *   떼면 폭약이 붙는다. 판마다 폭약 수가 정해져 있고 마지막 폭약을 붙이면 3·2·1 뒤 쾅!(따로 버튼 없음).
 *   키보드는 화살표로 커서 + 스페이스(누르는 동안 미리 보기, 떼면 붙이기).
 * 물리(칸 단위, 결정적 — 미리 보기 = 실제):
 *   ① 폭약 = 그 블록을 날린다(돌은 두 개). 가스통이 터지면 둘레 8칸에 폭약 하나씩 — 연쇄.
 *   ② 남은 블록은 붙은 것끼리 한 덩어리. 아래가 비면 떨어지고(떨어진 덩어리는 깔린 건물까지 와르르),
 *      땅을 딛은 칸들 밖으로 무게중심이 나가면 그쪽으로 90° 넘어진다(넘어지며 닿은 건물도 와르르 — 도미노).
 *   ③ 떨어지거나 넘어진 덩어리는 조각이 되어 흘러내려 쌓인다(두 칸 넘게 비면 옆으로 미끄러짐 — 가파른 더미).
 * 판 8개: 목표 = 모든 조각을 목표 높이 아래로, 빨간 선(이웃집 울타리) 밖으로는 한 조각도 안 나가게.
 *   ★ 철거 성공 · ★ 꽃밭 무사(꽃 칸에 조각이 안 떨어짐) · ★ 납작(별 높이 아래).
 *   실패(이웃집을 침 · 목표 높이 위에 남음 · 안 무너짐) = 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 와우: 쾅 → 느린 화면으로 탑이 기울어 무너지고 먼지 구름·파편, 옆집 고양이 할머니가 창문에서 '휴~'
 *   (이웃집을 치면 할머니가 빗자루를 휘두르며 '이놈들!'). 비버 반장은 3·2·1 동안 귀를 막고 움찔.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 판 ─────────────────────────────
/** 철거 현장 칸: 가로 GW칸(x 0~11), 보이는 높이 GH칸(y 0 = 땅 바로 위). 계산은 SH칸까지(넘어진 조각이 쌓일 자리) */
export const GW = 12, GH = 10, SH = 26;
export const WOOD = 1, STONE = 2, GAS = 3, METAL = 4;
const MASS = [0, 1, 2, 1, 2];
const HP = [0, 1, 2, 1, 99];
/** 가스통 연쇄 간격 · 넘어지는 데 걸리는 틱(느린 화면) · 조각이 한 칸 흘러내리는 틱 */
const CHAIN_T = 10, TIP_T = 66, SLIDE_T = 4, EPS = 1e-3;

export interface StageDef {
  key: string;
  title: string;
  news: string;
  hint: string;
  /** 위 줄부터. 맨 아래 줄이 y 0. '.' 빈칸 · w p y b g r 나무(칠 색) · S 돌 · G 가스통 · T 물탱크(쇠) · M 쇠기둥 */
  map: string[];
  /** 빨간 선 안쪽(조각이 있어도 되는 칸) x 범위 */
  lot: [number, number];
  /** 목표 높이(칸): 다 무너진 뒤 모든 블록이 이 높이 아래 */
  goal: number;
  /** ★ 납작 높이 */
  flat: number;
  /** 꽃밭 칸 x */
  flowers: number[];
  charges: number;
  /** 고양이 할머니 집 쪽 (-1 왼쪽 · 1 오른쪽) */
  granny: number;
}

const CH: Record<string, [number, number]> = {
  w: [WOOD, 0], p: [WOOD, 1], y: [WOOD, 2], b: [WOOD, 3], g: [WOOD, 4], r: [WOOD, 5],
  S: [STONE, 0], G: [GAS, 0], T: [METAL, 1], M: [METAL, 0],
};

export const STAGES: StageDef[] = [
  {
    key: '', title: '낡은 물탱크 탑', news: '', hint: '기둥 아무 데나 톡! 물탱크가 통째로 주저앉아요',
    map: [
      '....TTT.....',
      '....TTT.....',
      '.....w......',
      '.....w......',
      '.....w......',
      '.....w......',
      '.....w......',
    ],
    lot: [1, 10], goal: 4, flat: 3, flowers: [], charges: 1, granny: 1,
  },
  {
    key: 'tip', title: '두 다리 망루', news: '↙️ 한쪽 다리를 끊으면 그쪽으로 넘어져요', hint: '꽃밭 반대쪽 다리를 끊어 넘어뜨려요',
    map: [
      '....MpppM...',
      '.....w.w....',
      '.....w.w....',
      '.....w.w....',
    ],
    lot: [1, 10], goal: 3, flat: 2, flowers: [9, 10], charges: 1, granny: 1,
  },
  {
    key: 'stone', title: '돌다리 여관', news: '🪨 돌 블록은 폭약 두 개라야 터져요', hint: '돌은 폭약 둘 — 어디에 아낄까?',
    map: [
      '.......r....',
      '.....rrr....',
      '.....ppp....',
      '.....Sww....',
      '.....Sww....',
    ],
    lot: [1, 10], goal: 4, flat: 2, flowers: [9, 10], charges: 3, granny: 1,
  },
  {
    key: 'gas', title: '가스통 창고', news: '🛢️ 가스통이 터지면 둘레 8칸이 같이 펑!', hint: '가스통 하나 = 폭약 여러 개',
    map: [
      '......rrr...',
      '......yyy...',
      '......yyy...',
      '......yyy...',
      '......Gyy...',
      '......yyG...',
    ],
    lot: [1, 10], goal: 4, flat: 3, flowers: [9, 10], charges: 1, granny: 1,
  },
  {
    key: 'domino', title: '도미노 골목', news: '🧱 넘어진 탑이 옆 건물을 치면 같이 와르르', hint: '폭약이 모자라요 — 하나로 둘을 쓰러뜨려요',
    map: [
      '..rrr..rr...',
      '..ppp..yy...',
      '..ppp..yy...',
      '..ppp..yy...',
      '..w.w..yy...',
      '..w.w..yy...',
    ],
    lot: [1, 10], goal: 5, flat: 3, flowers: [], charges: 2, granny: 1,
  },
  {
    key: 'steel', title: '쇠 다리 망루', news: '🔩 쇠에는 폭약이 안 붙어요 — 그 위를 끊어요', hint: '쇠 다리는 못 터뜨려요 — 위를 끊어 떼어 내요',
    map: [
      '.....rrrr...',
      '.....pppp...',
      '.....pppp...',
      '.....M..w...',
      '.....M..w...',
      '.....M..w...',
    ],
    lot: [1, 10], goal: 4, flat: 3, flowers: [9, 10], charges: 2, granny: -1,
  },
  {
    key: 'alley', title: '좁은 골목 아파트', news: '🚧 양쪽이 이웃집 — 좁게 무너뜨려요', hint: '가스통으로 날리면 조각이 안 남아요',
    map: [
      '....rrr.....',
      '....ppp.....',
      '....ppp.....',
      '....pGp.....',
      '....ppp.....',
      '....ppp.....',
      '....pGp.....',
      '....ppp.....',
    ],
    lot: [3, 8], goal: 3, flat: 2, flowers: [], charges: 2, granny: -1,
  },
  {
    key: 'finale', title: '마을 회관 철거', news: '🏛️ 마지막 현장 — 배운 걸 다 써요', hint: '돌·가스통·도미노 — 폭약 셋으로 둘 다!',
    map: [
      '..rrr.......',
      '..ppp.......',
      '..ppp..yyy..',
      '..ppp..yyy..',
      '..ppp..yGy..',
      '..S.w..yyy..',
      '..S.w..yyy..',
    ],
    lot: [1, 10], goal: 4, flat: 3, flowers: [10], charges: 3, granny: 1,
  },
];
export const STAGE_COUNT = STAGES.length;

/** par: 원래 판(뒤집기 전) 칸의 바둑판 색 — 먼지가 될 칸·미끄러질 쪽을 정한다(뒤집어도 거울처럼 똑같이 무너지게) */
export interface Blk { m: number; paint: number; x: number; y: number; win: number; par: number }
export interface Layout { blocks: Blk[]; L: number; R: number; goal: number; flat: number; flowers: number[]; charges: number; granny: number; flip: boolean }

const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 판 정의 → 실제 배치 (flip이면 좌우를 뒤집는다) */
export function layoutOf(d: StageDef, flip: boolean): Layout {
  const blocks: Blk[] = [];
  const H = d.map.length;
  for (let r = 0; r < H; r++)
    for (let c = 0; c < GW; c++) {
      const e = CH[d.map[r][c]];
      if (!e) continue;
      const x = flip ? GW - 1 - c : c, y = H - 1 - r;
      blocks.push({ m: e[0], paint: e[1], x, y, win: hsh(c * 13 + r * 7 + d.title.length) < 0.45 ? 1 : 0, par: (c + H - 1 - r) & 1 });
    }
  blocks.sort((a, b) => a.y - b.y || a.x - b.x);
  const [l, r] = d.lot;
  return {
    blocks, L: flip ? GW - 1 - r : l, R: flip ? GW - 1 - l : r, goal: d.goal, flat: d.flat,
    flowers: d.flowers.map((x) => (flip ? GW - 1 - x : x)), charges: d.charges, granny: flip ? -d.granny : d.granny, flip,
  };
}

// ───────────────────────────── 철거 시뮬레이션 ─────────────────────────────
/** 그리기용 움직임 한 토막. k 0 = 조각이 흘러내림 · 1 = 축을 중심으로 넘어짐 · 2 = 떨어짐(중력) */
export interface Seg { t0: number; t1: number; k: number; ax: number; ay: number; bx: number; by: number; px: number; py: number; dir: number; lift: number }
export interface Tip { dir: number; px: number; py: number; ids: number[] }
export interface Outcome {
  /** 블록마다: -1 살아 있음, 아니면 터진 틱 */
  die: Int16Array;
  fx: Int16Array;
  fy: Int16Array;
  /** 조각이 된 틱 (-1 그대로 서 있음) */
  rubT: Int16Array;
  /** 1 = 무너지며 먼지가 되어 사라짐 (die = 그 틱) */
  dust: Uint8Array;
  segs: Seg[][] | null;
  tips: Tip[];
  falls: number;
  crushes: number;
  hitL: number;
  hitR: number;
  /** 처음 이웃집을 친 틱 */
  hitT: number;
  /** 짓밟힌 꽃밭 칸 수 */
  flowers: number;
  height: number;
  moved: boolean;
  ok: boolean;
  star: boolean[];
  stars: number;
  end: number;
}

const N4 = [1, 0, -1, 0, 0, 1, 0, -1];
const fallT = (d: number) => Math.round(12 + 8 * Math.sqrt(d));

/**
 * 폭약 배치(블록마다 개수) → 무너진 결과. rec이면 그리기용 움직임까지 남긴다(미리 보기·봇 탐색은 rec 없이 같은 규칙).
 */
export function simulate(Lay: Layout, ch: ArrayLike<number>, rec = false): Outcome {
  const B = Lay.blocks, n = B.length;
  const X = new Int16Array(n), Y = new Int16Array(n), hp = new Int8Array(n), st = new Uint8Array(n), pref = new Int8Array(n);
  const die = new Int16Array(n).fill(-1), rubT = new Int16Array(n).fill(-1), dust = new Uint8Array(n);
  const occ = new Int16Array(GW * SH).fill(-1);
  const segs: Seg[][] | null = rec ? B.map(() => []) : null;
  const segEnd = new Int16Array(n);
  for (let i = 0; i < n; i++) (X[i] = B[i].x), (Y[i] = B[i].y), (hp[i] = HP[B[i].m]), (occ[Y[i] * GW + X[i]] = i);
  // ① 폭약 · 가스통 연쇄
  const q: number[] = [];
  const kill = (i: number, t: number) => {
    st[i] = 2;
    die[i] = t;
    occ[Y[i] * GW + X[i]] = -1;
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
      for (let dx = -1; dx <= 1; dx++) {
        const x = X[i] + dx, y = Y[i] + dy;
        if ((!dx && !dy) || x < 0 || x >= GW || y < 0 || y >= SH) continue;
        const j = occ[y * GW + x];
        if (j < 0 || B[j].m === METAL) continue;
        if (--hp[j] <= 0) kill(j, die[i] + CHAIN_T);
      }
  }
  let T = (q.length ? die[q[q.length - 1]] : 0) + 14;
  const { L, R } = Lay, mir = Lay.flip ? -1 : 1;
  let moved = false, falls = 0, crushes = 0, hitL = 0, hitR = 0, hitT = -1;
  const tips: Tip[] = [];
  const comp = new Int16Array(n);
  const hitAt = (x: number, t: number) => {
    if (x < L) hitL++;
    else if (x > R) hitR++;
    else return;
    if (hitT < 0 || t < hitT) hitT = t;
  };
  const addSeg = (i: number, s: Seg) => {
    if (segs) segs[i].push(s);
    segEnd[i] = Math.max(segEnd[i], s.t1);
  };
  const seg = (t0: number, t1: number, k: number, ax: number, ay: number, bx: number, by: number, px = 0, py = 0, dir = 0, lift = 0): Seg => ({ t0, t1, k, ax, ay, bx, by, px, py, dir, lift });
  /** 무너진 블록 → 조각. 건물은 속이 비어 있어서 반(바둑판 칸)은 먼지가 되어 날아간다 — 쇠는 그대로 */
  const crumble = (j: number, t: number) => {
    rubT[j] = t;
    if (B[j].m !== METAL && B[j].par) {
      st[j] = 2;
      die[j] = t;
      dust[j] = 1;
      if (occ[Y[j] * GW + X[j]] === j) occ[Y[j] * GW + X[j]] = -1;
      return false;
    }
    st[j] = 1;
    occ[Y[j] * GW + X[j]] = j;
    return true;
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
        for (let e = 0; e < 8; e += 2) {
          const x = X[j] + N4[e], y = Y[j] + N4[e + 1];
          if (x < 0 || x >= GW || y < 0 || y >= SH) continue;
          const o = occ[y * GW + x];
          if (o >= 0 && st[o] === 0 && comp[o] < 0) (comp[o] = c), list.push(o);
        }
      }
      comps.push(list);
    }
    /** 0 그대로 · 1 떨어짐 · 2 왼쪽으로 넘어짐 · 3 오른쪽 · 4 깔림 */
    const act = new Int8Array(comps.length), piv = new Float32Array(comps.length), pivY = new Int16Array(comps.length), cx = new Float32Array(comps.length);
    const crushAt = new Int16Array(comps.length);
    let any = false;
    for (let c = 0; c < comps.length; c++) {
      let m = 0, mx = 0, s0 = 99, s1 = -1, sy = 99;
      for (const j of comps[c]) {
        const w = MASS[B[j].m];
        m += w;
        mx += w * (X[j] + 0.5);
        const below = Y[j] > 0 ? occ[(Y[j] - 1) * GW + X[j]] : -1;
        if (Y[j] === 0 || (below >= 0 && st[below] === 1)) (s0 = Math.min(s0, X[j])), (s1 = Math.max(s1, X[j])), (sy = Math.min(sy, Y[j]));
      }
      cx[c] = mx / m;
      if (s1 < 0) act[c] = 1;
      else if (cx[c] < s0 - EPS) (act[c] = 2), (piv[c] = s0), (pivY[c] = sy);
      else if (cx[c] > s1 + 1 + EPS) (act[c] = 3), (piv[c] = s1 + 1), (pivY[c] = sy);
      if (act[c]) any = true;
    }
    if (!any) break;
    moved = true;
    const t0 = T;
    let tEnd = T + 8;
    const massOf = (list: number[]) => list.reduce((a, j) => a + MASS[B[j].m], 0);
    /** 덩어리 c 위로 무게 w가 떨어지거나 넘어져 닿았다: 더 무거우면(같아도) c도 와르르 */
    const crush = (c: number, t: number, w: number) => {
      if (act[c] === 4) return void (crushAt[c] = Math.min(crushAt[c], t));
      // 아직 움직이지 않은 덩어리만 깔린다 (이미 떨어지거나 넘어진 건 조각)
      if (comps[c].some((j) => st[j] !== 0) || w < massOf(comps[c])) return;
      act[c] = 4;
      crushAt[c] = t;
      crushes++;
    };
    // 떨어지는 덩어리 (아래 것부터)
    const key = comps.map((list) => Math.min(...list.map((j) => Y[j])) * 100 + mir * Math.min(...list.map((j) => mir * X[j])));
    const order = comps.map((_, c) => c).sort((a, b) => key[a] - key[b]);
    for (const c of order) {
      if (act[c] !== 1) continue;
      falls++;
      const list = comps[c];
      for (const j of list) occ[Y[j] * GW + X[j]] = -1;
      let d = 99;
      for (const j of list) {
        let k = 0;
        while (Y[j] - k - 1 >= 0 && occ[(Y[j] - k - 1) * GW + X[j]] < 0) k++;
        d = Math.min(d, k);
      }
      const tl = t0 + fallT(d);
      tEnd = Math.max(tEnd, tl);
      for (const j of list) {
        addSeg(j, seg(t0, tl, 2, X[j], Y[j], X[j], Y[j] - d));
        Y[j] -= d;
      }
      const w = massOf(list);
      for (const j of list) {
        const o = Y[j] > 0 ? occ[(Y[j] - 1) * GW + X[j]] : -1;
        if (o >= 0 && st[o] === 0) crush(comp[o], tl, w);
      }
      for (const j of list) {
        crumble(j, tl);
        pref[j] = X[j] + 0.5 > cx[c] + 0.01 ? 1 : X[j] + 0.5 < cx[c] - 0.01 ? -1 : (B[j].par ? 1 : -1) * mir;
      }
    }
    // 넘어지는 덩어리
    for (const c of order) {
      if (act[c] !== 2 && act[c] !== 3) continue;
      const list = comps[c], dir = act[c] === 3 ? 1 : -1, P = piv[c], Py = pivY[c];
      for (const j of list) occ[Y[j] * GW + X[j]] = -1;
      const nx: number[] = [], ny: number[] = [];
      let minY = 99;
      for (const j of list) {
        const rx = dir > 0 ? P + Y[j] - Py : P - (Y[j] - Py) - 1, ry = dir > 0 ? Py + P - X[j] - 1 : Py + X[j] - P;
        nx.push(rx);
        ny.push(ry);
        minY = Math.min(minY, ry);
      }
      const lift = Math.max(0, -minY), w = massOf(list);
      const idx = list.map((_, k) => k).sort((a, b) => ny[a] - ny[b] || mir * (nx[a] - nx[b]));
      const tl = t0 + TIP_T;
      tEnd = Math.max(tEnd, tl);
      tips.push({ dir, px: P, py: Py, ids: list.slice() });
      for (const k of idx) {
        const j = list[k];
        let x = nx[k], y = ny[k] + lift;
        hitAt(x, tl - 6);
        const ax = X[j], ay = Y[j];
        addSeg(j, seg(t0, tl, 1, ax, ay, x, y, P, Py, dir, lift));
        x = Math.max(0, Math.min(GW - 1, x));
        const o = occ[y * GW + x];
        if (o >= 0 && st[o] === 0) crush(comp[o], tl - 8, w);
        pref[j] = dir;
        if (B[j].par && B[j].m !== METAL) {
          // 먼지 칸은 자리를 차지하지 않는다
          (X[j] = x), (Y[j] = y), crumble(j, tl);
          continue;
        }
        while (occ[y * GW + x] >= 0) y++;
        if (x !== nx[k] || y !== ny[k] + lift) addSeg(j, seg(tl, tl + 6, 0, nx[k], ny[k] + lift, x, y));
        X[j] = x;
        Y[j] = y;
        crumble(j, tl);
      }
    }
    // 깔린 덩어리 → 그 자리에서 조각
    for (let c = 0; c < comps.length; c++) {
      if (act[c] !== 4) continue;
      for (const j of comps[c]) {
        segEnd[j] = Math.max(segEnd[j], crushAt[c]);
        crumble(j, crushAt[c]);
        pref[j] = X[j] + 0.5 > cx[c] + 0.01 ? 1 : X[j] + 0.5 < cx[c] - 0.01 ? -1 : (B[j].par ? 1 : -1) * mir;
      }
    }
    // ③ 조각이 모래처럼 흘러내린다 (아래 줄부터, 한 번에 한 칸)
    const sx = X.slice(), sy = Y.slice();
    let steps = 0;
    for (let pass = 0; pass < 90; pass++) {
      let mv = false;
      for (let y = 1; y < SH; y++)
        for (let xi = 0; xi < GW; xi++) {
          const x = mir > 0 ? xi : GW - 1 - xi, j = occ[y * GW + x];
          if (j < 0 || st[j] !== 1) continue;
          let tx = -1;
          if (occ[(y - 1) * GW + x] < 0) tx = x;
          else
            for (const d of [pref[j], -pref[j]]) {
              const xx = x + d;
              if (xx >= 0 && xx < GW && occ[y * GW + xx] < 0 && occ[(y - 1) * GW + xx] < 0 && (y < 2 || occ[(y - 2) * GW + xx] < 0)) {
                tx = xx;
                break;
              }
            }
          if (tx < 0) continue;
          occ[y * GW + x] = -1;
          occ[(y - 1) * GW + tx] = j;
          X[j] = tx;
          Y[j] = y - 1;
          mv = true;
        }
      if (!mv) break;
      steps++;
    }
    for (let j = 0; j < n; j++) {
      if (st[j] !== 1 || (sx[j] === X[j] && sy[j] === Y[j])) continue;
      const a = Math.max(segEnd[j], t0 + 4), dist = Math.abs(sx[j] - X[j]) + Math.abs(sy[j] - Y[j]);
      const b = a + 6 + dist * SLIDE_T;
      addSeg(j, seg(a, b, 0, sx[j], sy[j], X[j], Y[j]));
      hitAt(X[j], b);
      tEnd = Math.max(tEnd, b);
    }
    void steps;
    T = tEnd + 6;
  }
  // 결과
  let height = 0;
  const fl = new Set<number>();
  for (let i = 0; i < n; i++) {
    if (st[i] === 2) continue;
    height = Math.max(height, Y[i] + 1);
    if (st[i] === 1 && Lay.flowers.includes(X[i])) fl.add(X[i]);
  }
  const hit = hitL + hitR > 0;
  const ok = moved && !hit && height <= Lay.goal;
  const star = [ok, ok && fl.size === 0, ok && height <= Lay.flat];
  return {
    die, fx: X, fy: Y, rubT, dust, segs, tips, falls, crushes, hitL, hitR, hitT, flowers: fl.size, height, moved, ok, star,
    stars: star.filter(Boolean).length, end: T + 10,
  };
}

// ───────────────────────────── 게임 ─────────────────────────────
const A = 1.42;
/** 화면(가로 0~1 = w): 칸 크기 · 땅 선(0줄 블록의 아랫변) · 블록 윗면 깊이 · 아래 띠 */
const CW = 1 / GW, GY = 0.95, DX = CW * 0.24, DY = CW * 0.2, BAND = 1.15, HB = 0.085;
const COUNT_T = 40, RESULT_OK = 190, RESULT_FAIL = 160, CARD_T = 170, NEWS_T = 160;
const STAR_PTS = 100, WIN_PTS = 300;

interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; id?: number }
type Phase = 'play' | 'count' | 'boom' | 'result';

export interface DemoState {
  rng: Rng;
  seed: number;
  t: number;
  stage: number;
  phase: Phase;
  pt: number;
  flips: boolean[];
  L: Layout;
  ch: Int8Array;
  placed: number[];
  left: number;
  down: boolean;
  aim: { x: number; y: number } | null;
  out: Outcome | null;
  hearts: number;
  stars: number;
  got: number;
  starOk: boolean[];
  pts: number;
  ok: boolean;
  why: string;
  seen: Set<string>;
  newsQ: string[];
  news: { text: string; t: number } | null;
  events: Ev[];
  dead: boolean;
  won: boolean;
  tries: number;
  again: boolean;
  firstTap: boolean;
  /** 비버 표정: 0 보통 · 1 힘줌(누르는 중) · 2 귀 막음 · 3 우쭐 · 4 어질어질(먼지 범벅) */
  beaver: number;
  /** 할머니: 0 차 마심 · 1 내다봄 · 2 휴~ · 3 빗자루 '이놈들!' */
  granny: number;
  grannyT: number;
}

const ev = (s: DemoState, kind: string, x: number, y: number, text?: string, col?: string, id?: number) => s.events.push({ t: s.t, kind, x, y, text, col, id });
function see(s: DemoState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

/** 블록에 붙일 수 있는 폭약 수 (쇠 0 · 돌 2 · 나머지 1) */
const capOf = (b: Blk) => (b.m === METAL ? 0 : b.m === STONE ? 2 : 1);
/** 칸 x,y의 화면 좌표(앞면 왼쪽 위) — w 단위 */
const SX = (x: number) => x * CW;
const SY = (y: number) => GY - (y + 1) * CW;

/** 누른 자리(w 단위) → 블록 번호 (없으면 -1). 앞면이 우선, 윗면(위가 빈 블록)도 받아 준다 */
function pickBlock(L: Layout, gx: number, gy: number): number {
  const cx = Math.floor(gx / CW), cy = Math.floor((GY - gy) / CW);
  let id = L.blocks.findIndex((b) => b.x === cx && b.y === cy);
  if (id >= 0) return id;
  // 윗면: 아래 칸 블록의 위쪽 0.3칸까지
  const fy = (GY - gy) / CW - cy;
  if (fy < 0.3) id = L.blocks.findIndex((b) => b.x === cx && b.y === cy - 1);
  return id;
}

function newStage(s: DemoState) {
  const d = STAGES[s.stage];
  s.L = layoutOf(d, s.flips[s.stage]);
  s.ch = new Int8Array(s.L.blocks.length);
  s.placed = [];
  s.left = d.charges;
  s.out = null;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.beaver = 0;
  s.granny = 0;
  s.down = false;
  s.aim = null;
  if (d.key) s.seen.add(d.key);
}

function place(s: DemoState, gx: number, gy: number) {
  if (s.phase !== 'play') return;
  const id = pickBlock(s.L, gx, gy);
  if (id < 0) return; // 빈 곳에서 떼면 취소
  const b = s.L.blocks[id], x = SX(b.x) + CW / 2, y = SY(b.y) + CW / 2;
  if (b.m === METAL) return void ev(s, 'nope', x, y, '쇠에는 안 붙어요');
  if (s.ch[id] >= capOf(b)) return void ev(s, 'nope', x, y, '이미 붙었어요');
  s.ch[id]++;
  s.left--;
  s.placed.push(id);
  s.firstTap = true;
  ev(s, 'stick', x, y, b.m === STONE && s.ch[id] === 1 ? '돌은 하나 더!' : s.left > 0 ? `착! (${s.left}개 남음)` : '착! 마지막!', undefined, id);
  see(s, 'charge', '🧨 폭약을 다 붙이면 3·2·1 뒤 쾅!');
  if (s.left <= 0) {
    s.phase = 'count';
    s.pt = 0;
    s.out = simulate(s.L, s.ch, true);
    s.beaver = 2;
    s.granny = 1;
  }
}

function endStage(s: DemoState) {
  const o = s.out!, d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = o.ok;
  if (o.ok) {
    s.starOk = o.star.slice();
    s.got = o.stars;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.beaver = 3;
    ev(s, 'clear', 0.5, 0.5, s.won ? '마을 철거 끝! 🏗️' : '철거 성공!');
  } else {
    s.why = o.hitL + o.hitR > 0 ? '이웃집을 쳤어요!' : !o.moved ? '꿈쩍도 안 했어요' : `아직 높아요 (${o.height}칸 > ${d.goal}칸)`;
    s.hearts--;
    s.tries++;
    s.beaver = 4;
    ev(s, 'fail', 0.5, 0.5, s.why);
  }
}

/** 쾅 뒤: 결과 타임라인에서 그 틱에 일어난 일을 사건으로 남긴다 (연출·할머니·비버) */
function boomTick(s: DemoState) {
  const o = s.out!, B = s.L.blocks, tau = s.pt;
  if (tau === 0) {
    ev(s, 'boom', 0.5, 0.5, '쾅!');
    see(s, 'boom', '💥 폭약 = 그 블록을 날려요. 받침이 없으면 떨어져요');
  }
  for (let i = 0; i < B.length; i++) {
    const segs = o.segs![i];
    if (o.die[i] === tau && !o.dust[i]) {
      ev(s, B[i].m === GAS ? 'gas' : 'blast', SX(B[i].x) + CW / 2, SY(B[i].y) + CW / 2, undefined, undefined, i);
      if (B[i].m === GAS) see(s, 'gasboom', '🛢️ 가스통이 터지면 둘레 8칸이 같이 펑!');
    }
    if (o.rubT[i] === tau && o.rubT[i] > 0) {
      const last = segs.filter((g) => g.t1 <= tau + 1).pop() ?? segs[0];
      const px = last ? last.bx : B[i].x, py = last ? last.by : B[i].y;
      ev(s, o.dust[i] ? 'dust' : 'land', SX(px) + CW / 2, SY(py) + CW / 2, undefined, undefined, i);
    }
  }
  for (const tp of o.tips) {
    const t0 = o.segs![tp.ids[0]].find((g) => g.k === 1)?.t0 ?? -1;
    if (t0 === tau) {
      const top = tp.ids.reduce((a, j) => (B[j].y > B[a].y ? j : a), tp.ids[0]);
      ev(s, 'tip', SX(B[top].x) + CW / 2, SY(B[top].y), tp.dir > 0 ? '기우뚱 →' : '← 기우뚱');
      see(s, 'tip', '↘️ 한쪽 받침이 없으면 그쪽으로 넘어져요');
    }
  }
  if (o.crushes > 0 && tau === 30) see(s, 'crush', '🏚️ 무거운 게 떨어지거나 넘어지면 깔린 건물까지 와르르');
  if (o.hitT >= 0 && tau === o.hitT) {
    const side = o.hitL > 0 ? -1 : 1;
    s.granny = s.L.granny === side ? 3 : 1;
    ev(s, 'hit', side < 0 ? SX(s.L.L) : SX(s.L.R + 1), SY(2), s.L.granny === side ? '이놈들!' : '멍멍!?');
    see(s, 'hit', '🚧 빨간 선 밖 이웃집을 치면 실패');
  }
  const settle = o.end - 24;
  if (tau === settle && o.hitT < 0) {
    s.granny = o.ok ? 2 : 1;
    ev(s, 'phew', s.L.granny < 0 ? SX(s.L.L) : SX(s.L.R + 1), SY(4), o.ok ? '휴~' : '어머, 아직 서 있네');
  }
  if (tau === Math.max(10, settle - 30)) s.beaver = o.ok ? 3 : 4;
}

export const demolition: GameDef<DemoState> = {
  id: 'demolition',
  name: '비버 철거반',
  genes: ['demolish', 'chain', 'pointer'],
  twist: '"지어서 버티기"를 뒤집었다 — 칸 단위 물리라 누르는 동안 보이는 무너질 모양이 그대로 일어난다: 끊은 쪽으로 넘어지고, 무거운 게 떨어지면 깔린 건물까지 와르르(도미노), 가스통은 둘레를 한꺼번에 날린다',
  rules: [
    '블록을 톡 → 폭약을 붙인다, 다 붙이면 3·2·1 쾅! (누르고 있으면 무너질 모양이 보여요)',
    '무너진 조각이 빨간 선 밖(이웃집)을 치면 실패, 목표 높이 아래로 무너뜨리면 성공.',
  ],
  controls: 'touch',
  hint: '블록을 톡 = 폭약 (꾹 누르면 무너질 모양) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '장난감 마을 철거 현장 디오라마 — 헬멧 쓴 비버 철거반',
    mood: '노을빛 하늘 아래 낡은 장난감 블록 마을. 칠이 벗겨진 나무 블록 집과 돌다리, 빨간 가스통, 줄무늬 공사 울타리. 헬멧 쓴 비버 반장이 기폭 손잡이를 쥐고 있고, 울타리 너머 창문에서 고양이 할머니가 찻잔을 들고 지켜본다.',
    palette: { bg: '#2a2340', ink: '#fff8ec', muted: '#c9b9d9', accent: '#ffc845', hot: '#ff6150', soft: '#ffd9a8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, flips, L: layoutOf(STAGES[0], flips[0]), ch: new Int8Array(0), placed: [], left: 0,
      down: false, aim: null, out: null, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '',
      seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, tries: 0, again: false, firstTap: false,
      beaver: 0, granny: 0, grannyT: 0,
    } as DemoState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    // 손을 대고 있는 동안은 겨누기(미리 보기), 떼는 순간 붙이기
    const p = inp.pointer ?? null;
    if (p && s.phase === 'play') (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) place(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'play') s.beaver = s.down ? 1 : 0;
    else if (s.phase === 'count') {
      if (s.pt % COUNT_T === 1) ev(s, 'beep', 0.5, 0.4, String(3 - Math.floor(s.pt / COUNT_T)));
      if (s.pt >= COUNT_T * 3) (s.phase = 'boom'), (s.pt = 0), boomTick(s);
    } else if (s.phase === 'boom') {
      boomTick(s);
      if (s.pt >= s.out!.end + 26) endStage(s);
    } else if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (b: Blk): Input => ({ tap: false, dir: 0, pointer: { x: SX(b.x) + CW / 2, y: (SY(b.y) + CW / 2) / A } });

/** 모든 폭약 조합(돌은 둘까지) — 결과가 가장 좋은 것. 판 배치마다 한 번만 찾는다 */
const PLANS = new Map<string, number[]>();
export function bestPlan(L: Layout): number[] {
  const key = L.blocks.map((b) => `${b.m}${b.x},${b.y}`).join('|') + L.charges;
  const hit = PLANS.get(key);
  if (hit) return hit;
  const n = L.blocks.length, ch = new Int8Array(n), cur: number[] = [];
  let best: number[] = [], bv = -1e9;
  const rec = (start: number, left: number) => {
    if (left === 0) {
      const o = simulate(L, ch);
      const v = o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - (o.hitL + o.hitR);
      if (v > bv) (bv = v), (best = cur.slice());
      return;
    }
    for (let i = start; i < n; i++) {
      if (ch[i] >= capOf(L.blocks[i])) continue;
      ch[i]++;
      cur.push(i);
      rec(i, left - 1);
      cur.pop();
      ch[i]--;
    }
  };
  rec(0, L.charges);
  PLANS.set(key, best);
  return best;
}

const smartMem = new WeakMap<object, { key: string; plan: number[]; k: number; next: number; hold: number }>();
/** 봇: 판마다 모든 폭약 자리 조합을 미리 무너뜨려 보고(완전 탐색) 별이 가장 많은 자리에 붙인다. 사람처럼 꾹 눌러 미리 보고 뗀다 */
export const demolitionSmart: Bot<DemoState> = {
  name: '철거 박사',
  act(s) {
    if (s.phase !== 'play') return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = smartMem.get(s);
    if (!m || m.key !== key) smartMem.set(s, (m = { key, plan: bestPlan(s.L), k: 0, next: s.t + 70, hold: 0 }));
    if (m.k >= m.plan.length || s.t < m.next) return NO;
    if (m.hold < 42) {
      m.hold += 3;
      return at(s.L.blocks[m.plan[m.k]]);
    }
    m.hold = 0;
    m.k++;
    m.next = s.t + 30;
    return NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 때나 아무 데나 톡 (대개 공사장 안, 가끔 화면 아무 데나) */
export const demolitionRandom: Bot<DemoState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.phase !== 'play' || s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 90);
    if (rng() < 0.25) (m.x = rng()), (m.y = rng() * A);
    else (m.x = SX(s.L.L) + rng() * (s.L.R - s.L.L + 1) * CW), (m.y = GY - rng() * 8 * CW);
    m.hold = 2 + Math.floor(rng() * 5);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

const habitMem = new WeakMap<object, { key: string; next: number; hold: number }>();
/** 버릇 봇(측정용): 늘 '맨 아래, 건물 한가운데에 가장 가까운 블록'부터 붙인다 */
export const demolitionHabit: Bot<DemoState> = {
  name: '맨 아래 가운데',
  act(s) {
    if (s.phase !== 'play') return NO;
    const key = `${s.stage}:${s.tries}:${s.placed.length}`;
    let m = habitMem.get(s);
    if (!m || m.key !== key) habitMem.set(s, (m = { key, next: s.t + 40, hold: 0 }));
    if (s.t < m.next) return NO;
    const B = s.L.blocks, cx = B.reduce((a, b) => a + b.x, 0) / B.length;
    let best = -1, bv = 1e9;
    B.forEach((b, i) => {
      if (s.ch[i] >= capOf(b)) return;
      const v = b.y * 100 + Math.abs(b.x - cx) * 2 + b.x * 0.001;
      if (v < bv) (bv = v), (best = i);
    });
    if (best < 0) return NO;
    if (m.hold < 12) return (m.hold += 3), at(B[best]);
    m.next = 1e9;
    return NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
/** 칠 색: [앞면, 윗면, 옆면] — 0 생나무 · 1 분홍 · 2 노랑 · 3 하늘 · 4 연두 · 5 빨간 지붕 */
const PAINT = [
  ['#d9a066', '#ecc08a', '#a8733f'],
  ['#f29bb2', '#ffc4d3', '#c66d86'],
  ['#ffd36b', '#ffe7a6', '#d1a23c'],
  ['#86bde8', '#b9dcf6', '#5b8fbd'],
  ['#9ad68f', '#c4ebb9', '#6aa35f'],
  ['#e0574f', '#f2857c', '#a8352f'],
];
const STONE_C = ['#aaa6b9', '#cdc9da', '#7c788c'];
const GAS_C = ['#e8453a', '#ff7a6b', '#a92a22'];
const METAL_C = [['#7f8896', '#a9b2bf', '#5a626e'], ['#8fb0c8', '#bcd5e6', '#5f7f98']];
const colOf = (b: Blk) => (b.m === STONE ? STONE_C : b.m === GAS ? GAS_C : b.m === METAL ? METAL_C[b.paint] : PAINT[b.paint]);

const PREV = new WeakMap<object, { key: string; o: Outcome }>();
const PUFFS = new WeakMap<object, { x: number; y: number; r: number; life: number; max: number; vx: number }[]>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 블록 앞면 무늬 (0,0 = 앞면 왼쪽 위, 한 변 u) */
function face(ctx: CanvasRenderingContext2D, b: Blk, u: number, cracked: boolean) {
  const c = colOf(b);
  const g = ctx.createLinearGradient(0, 0, u * 0.3, u);
  g.addColorStop(0, c[1]);
  g.addColorStop(0.25, c[0]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, u, u);
  ctx.lineWidth = Math.max(1, u * 0.04);
  if (b.m === WOOD && b.paint === 5) {
    // 지붕 기와
    ctx.strokeStyle = 'rgba(110,20,20,.45)';
    for (let r = 0; r < 3; r++)
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(u * (k / 3 + 1 / 6) + (r % 2 ? u / 6 : 0), u * (r / 3 + 0.3), u / 6, 0, Math.PI);
        ctx.stroke();
      }
  } else if (b.m === WOOD) {
    // 판자 줄 + 못
    ctx.strokeStyle = 'rgba(80,40,10,.22)';
    for (const k of [0.33, 0.66]) {
      ctx.beginPath();
      ctx.moveTo(0, u * k);
      ctx.lineTo(u, u * k);
      ctx.stroke();
    }
    if (b.win && b.paint) {
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(u * 0.24, u * 0.2, u * 0.52, u * 0.56);
      const wg = ctx.createLinearGradient(0, u * 0.24, 0, u * 0.72);
      wg.addColorStop(0, '#fff2b8');
      wg.addColorStop(1, '#ffb85c');
      ctx.fillStyle = wg;
      ctx.fillRect(u * 0.3, u * 0.26, u * 0.4, u * 0.44);
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(u * 0.48, u * 0.26, u * 0.04, u * 0.44);
      ctx.fillRect(u * 0.3, u * 0.46, u * 0.4, u * 0.04);
    } else {
      ctx.fillStyle = 'rgba(60,30,10,.35)';
      for (const [px, py] of [[0.12, 0.16], [0.88, 0.16], [0.12, 0.84], [0.88, 0.84]]) {
        ctx.beginPath();
        ctx.arc(u * px, u * py, u * 0.035, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (b.m === STONE) {
    ctx.strokeStyle = 'rgba(50,45,70,.4)';
    for (let r = 0; r < 3; r++) {
      ctx.beginPath();
      ctx.moveTo(0, u * (r + 1) / 3);
      ctx.lineTo(u, u * (r + 1) / 3);
      ctx.stroke();
      const off = r % 2 ? 0.25 : 0.6;
      ctx.beginPath();
      ctx.moveTo(u * off, u * r / 3);
      ctx.lineTo(u * off, u * (r + 1) / 3);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(u * 0.06, u * 0.06, u * 0.3, u * 0.06);
    // 돌 표시: 폭약 둘
    ctx.fillStyle = 'rgba(40,36,60,.55)';
    ctx.font = `900 ${u * 0.3}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×2', u * 0.5, u * 0.55);
  } else if (b.m === GAS) {
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(0, u * 0.36, u, u * 0.26);
    ctx.fillStyle = '#2a1a1a';
    ctx.beginPath();
    ctx.moveTo(u * 0.5, u * 0.38);
    ctx.lineTo(u * 0.62, u * 0.6);
    ctx.lineTo(u * 0.38, u * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(u * 0.485, u * 0.45, u * 0.03, u * 0.08);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.fillRect(u * 0.12, u * 0.06, u * 0.1, u * 0.86);
    ctx.fillStyle = '#7a1a14';
    ctx.fillRect(u * 0.38, -u * 0.02, u * 0.24, u * 0.1);
  } else {
    // 쇠: 리벳
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(u * 0.08, u * 0.08, u * 0.84, u * 0.06);
    ctx.fillStyle = 'rgba(30,40,55,.55)';
    for (const [px, py] of [[0.16, 0.24], [0.84, 0.24], [0.16, 0.84], [0.84, 0.84], [0.5, 0.24], [0.5, 0.84]]) {
      ctx.beginPath();
      ctx.arc(u * px, u * py, u * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }
    if (b.paint === 0) {
      ctx.fillStyle = 'rgba(30,40,55,.3)';
      ctx.fillRect(u * 0.4, u * 0.3, u * 0.2, u * 0.45);
    }
  }
  if (cracked) {
    ctx.strokeStyle = 'rgba(30,20,30,.7)';
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.beginPath();
    ctx.moveTo(u * 0.2, u * 0.1);
    ctx.lineTo(u * 0.45, u * 0.45);
    ctx.lineTo(u * 0.35, u * 0.6);
    ctx.lineTo(u * 0.7, u * 0.9);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(40,20,30,.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(0.5, 0.5, u - 1, u - 1);
}

/** 서 있는 블록: 앞면 + (드러난) 윗면·옆면 — 작은 입체 장난감 블록 */
function blockAt(ctx: CanvasRenderingContext2D, b: Blk, x: number, y: number, u: number, top: boolean, side: boolean, cracked: boolean) {
  const c = colOf(b), dx = u * (DX / CW), dy = u * (DY / CW);
  if (side) {
    ctx.fillStyle = c[2];
    ctx.beginPath();
    ctx.moveTo(x + u, y);
    ctx.lineTo(x + u + dx, y - dy);
    ctx.lineTo(x + u + dx, y + u - dy);
    ctx.lineTo(x + u, y + u);
    ctx.closePath();
    ctx.fill();
  }
  if (top) {
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx, y - dy);
    ctx.lineTo(x + u + dx, y - dy);
    ctx.lineTo(x + u, y);
    ctx.closePath();
    ctx.fill();
    if (b.m === GAS) {
      ctx.fillStyle = '#7a1a14';
      ctx.beginPath();
      ctx.ellipse(x + u * 0.5 + dx * 0.5, y - dy * 0.5, u * 0.14, dy * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.save();
  ctx.translate(x, y);
  face(ctx, b, u, cracked);
  ctx.restore();
}

/** 다이너마이트 묶음 (깜빡이는 불) */
function dynamite(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, fast: boolean, ghost = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = ghost ? 0.6 : 1;
  for (let k = -1; k <= 1; k++) {
    const g = ctx.createLinearGradient(k * u * 0.16 - u * 0.08, 0, k * u * 0.16 + u * 0.08, 0);
    g.addColorStop(0, '#b3201a');
    g.addColorStop(0.5, '#ff5a46');
    g.addColorStop(1, '#8a1410');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(k * u * 0.16 - u * 0.08, -u * 0.3, u * 0.16, u * 0.6, u * 0.05);
    ctx.fill();
  }
  ctx.fillStyle = '#3a2a2a';
  ctx.fillRect(-u * 0.26, -u * 0.06, u * 0.52, u * 0.12);
  // 타이머 상자 + 불
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.roundRect(-u * 0.14, -u * 0.12, u * 0.28, u * 0.2, u * 0.03);
  ctx.fill();
  const on = fast ? t % 8 < 4 : t % 40 < 20;
  ctx.fillStyle = on ? '#ff3b30' : '#5a1a18';
  if (on) (ctx.shadowColor = '#ff3b30'), (ctx.shadowBlur = u * 0.4);
  ctx.beginPath();
  ctx.arc(0, -u * 0.02, u * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // 전선
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = Math.max(1, u * 0.04);
  ctx.beginPath();
  ctx.moveTo(u * 0.14, -u * 0.02);
  ctx.bezierCurveTo(u * 0.35, -u * 0.25, u * 0.4, u * 0.2, u * 0.3, u * 0.38);
  ctx.stroke();
  ctx.restore();
}

/** 부서진 조각 (작고 들쭉날쭉) */
function rubble(ctx: CanvasRenderingContext2D, b: Blk, x: number, y: number, u: number, k: number) {
  const c = colOf(b);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((hsh(k) - 0.5) * 0.9);
  ctx.fillStyle = 'rgba(40,25,30,.25)';
  ctx.beginPath();
  ctx.ellipse(u * 0.04, u * 0.42, u * 0.5, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let p = 0; p < 2; p++) {
    const sx = p ? u * 0.2 : -u * 0.12, sy = p ? u * 0.12 : -u * 0.05, r = u * (p ? 0.3 : 0.42);
    ctx.fillStyle = c[p ? 2 : 0];
    ctx.beginPath();
    for (let q = 0; q < 6; q++) {
      const a = (q / 6) * Math.PI * 2 + hsh(k * 3 + p), rr = r * (0.7 + 0.45 * hsh(k * 7 + q + p * 11));
      ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr * 0.85);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c[1];
    ctx.beginPath();
    ctx.arc(sx - r * 0.25, sy - r * 0.3, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 비버 반장. mood 0 보통 · 1 힘줌 · 2 귀 막음 · 3 우쭐 · 4 먼지 범벅 어질어질 */
function beaver(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number, face: number, plunge: number) {
  ctx.save();
  ctx.translate(x, y);
  // 그림자
  ctx.fillStyle = 'rgba(40,20,20,.3)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 1.3, u * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  // 기폭 상자 (앞쪽)
  const bx = face * u * 1.15;
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.roundRect(bx - u * 0.42, -u * 0.62, u * 0.84, u * 0.62, u * 0.08);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(bx - u * 0.42, -u * 0.42, u * 0.84, u * 0.12);
  ctx.fillStyle = '#2a1a1a';
  ctx.font = `900 ${u * 0.28}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('TNT', bx, -u * 0.17);
  const hy = -u * 0.62 - u * 0.55 * (1 - plunge);
  ctx.strokeStyle = '#555';
  ctx.lineWidth = u * 0.1;
  ctx.beginPath();
  ctx.moveTo(bx, -u * 0.62);
  ctx.lineTo(bx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = u * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx - u * 0.3, hy);
  ctx.lineTo(bx + u * 0.3, hy);
  ctx.stroke();
  ctx.scale(face, 1);
  const bob = mood === 3 ? Math.abs(Math.sin(t * 0.25)) * u * 0.15 : mood === 4 ? Math.sin(t * 0.2) * u * 0.05 : 0;
  ctx.translate(0, -bob);
  // 꼬리 (넓적)
  ctx.save();
  ctx.translate(-u * 0.7, -u * 0.25);
  ctx.rotate(-0.5 + Math.sin(t * 0.1) * 0.1);
  ctx.fillStyle = '#5b3a29';
  ctx.beginPath();
  ctx.ellipse(-u * 0.25, 0, u * 0.42, u * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.25 + k * u * 0.12, -u * 0.18);
    ctx.lineTo(-u * 0.25 + k * u * 0.12, u * 0.18);
    ctx.stroke();
  }
  ctx.restore();
  // 몸
  const g = ctx.createLinearGradient(0, -u * 1.4, 0, 0);
  g.addColorStop(0, '#b77b4b');
  g.addColorStop(1, '#8a5532');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.6, u * 0.62, u * 0.66, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0d2a8';
  ctx.beginPath();
  ctx.ellipse(u * 0.12, -u * 0.5, u * 0.36, u * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();
  // 조끼 (형광)
  ctx.fillStyle = '#ff9f1c';
  ctx.beginPath();
  ctx.ellipse(-u * 0.25, -u * 0.62, u * 0.3, u * 0.5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff6d0';
  ctx.fillRect(-u * 0.5, -u * 0.62, u * 0.45, u * 0.07);
  // 발
  ctx.fillStyle = '#4a2c1c';
  for (const px of [-0.25, 0.3]) {
    ctx.beginPath();
    ctx.ellipse(u * px, -u * 0.02, u * 0.2, u * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 머리
  const hx = u * 0.15, hy2 = -u * 1.38;
  ctx.fillStyle = '#a56d42';
  ctx.beginPath();
  ctx.ellipse(hx, hy2, u * 0.48, u * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  // 주둥이 · 이빨
  ctx.fillStyle = '#e8c7a0';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.3, hy2 + u * 0.12, u * 0.24, u * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a12';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.46, hy2 + u * 0.02, u * 0.08, u * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#8a7a6a';
  ctx.lineWidth = 0.8;
  const tooth = mood === 1 ? 0.24 : 0.2;
  ctx.fillRect(hx + u * 0.26, hy2 + u * 0.22, u * 0.09, u * tooth);
  ctx.strokeRect(hx + u * 0.26, hy2 + u * 0.22, u * 0.09, u * tooth);
  ctx.fillRect(hx + u * 0.36, hy2 + u * 0.22, u * 0.09, u * tooth);
  ctx.strokeRect(hx + u * 0.36, hy2 + u * 0.22, u * 0.09, u * tooth);
  // 눈
  const ex = hx + u * 0.2, ey = hy2 - u * 0.1;
  ctx.strokeStyle = '#1a1a1a';
  ctx.fillStyle = '#1a1a1a';
  ctx.lineWidth = Math.max(1.2, u * 0.07);
  if (mood === 2 || mood === 1) {
    // 질끈 감음 > <
    ctx.beginPath();
    ctx.moveTo(ex - u * 0.1, ey - u * 0.06);
    ctx.lineTo(ex + u * 0.02, ey);
    ctx.lineTo(ex - u * 0.1, ey + u * 0.06);
    ctx.stroke();
  } else if (mood === 3) {
    ctx.beginPath();
    ctx.arc(ex - u * 0.03, ey + u * 0.04, u * 0.08, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (mood === 4) {
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = k * 0.7 + t * 0.3, rr = (k / 12) * u * 0.1;
      ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
    }
    ctx.lineWidth = 1;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.065, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex + u * 0.02, ey - u * 0.025, u * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  // 귀 · 팔 (귀 막기)
  ctx.fillStyle = '#8a5532';
  ctx.beginPath();
  ctx.arc(hx - u * 0.3, hy2 - u * 0.24, u * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5532';
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.16;
  ctx.beginPath();
  if (mood === 2) {
    ctx.moveTo(-u * 0.35, -u * 0.85);
    ctx.quadraticCurveTo(-u * 0.6, -u * 1.2, hx - u * 0.36, hy2 - u * 0.18);
    ctx.moveTo(u * 0.35, -u * 0.85);
    ctx.quadraticCurveTo(u * 0.75, -u * 1.25, hx + u * 0.42, hy2 - u * 0.2);
  } else if (mood === 3) {
    ctx.moveTo(u * 0.4, -u * 0.8);
    ctx.lineTo(u * 0.75, -u * 1.25);
    ctx.moveTo(-u * 0.4, -u * 0.8);
    ctx.lineTo(-u * 0.7, -u * 0.45);
  } else {
    ctx.moveTo(u * 0.4, -u * 0.8);
    ctx.quadraticCurveTo(u * 0.85, -u * 0.75, u * 1.0, -u * (0.95 + 0.45 * (1 - plunge)));
    ctx.moveTo(-u * 0.4, -u * 0.8);
    ctx.lineTo(-u * 0.6, -u * 0.45);
  }
  ctx.stroke();
  if (mood === 3) {
    // 엄지 척
    ctx.fillStyle = '#8a5532';
    ctx.beginPath();
    ctx.arc(u * 0.78, -u * 1.3, u * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(u * 0.74, -u * 1.52, u * 0.08, u * 0.2);
  }
  // 안전모
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.ellipse(hx - u * 0.02, hy2 - u * 0.22, u * 0.46, u * 0.3, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e6b400';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.08, hy2 - u * 0.22, u * 0.6, u * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(hx - u * 0.06, hy2 - u * 0.5, u * 0.08, u * 0.26);
  if (mood === 4) {
    // 먼지 범벅 · 어질어질 별
    ctx.fillStyle = 'rgba(90,80,70,.35)';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.1, hy2 + u * 0.05, u * 0.4, u * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, hx + Math.cos(a) * u * 0.5, hy2 - u * 0.62 + Math.sin(a) * u * 0.15, u * 0.12);
      ctx.fill();
    }
  }
  if (mood === 2) {
    // 움찔 땀
    ctx.fillStyle = '#9fe3ff';
    ctx.beginPath();
    ctx.ellipse(hx - u * 0.45, hy2 + (t % 20) * u * 0.01, u * 0.06, u * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 고양이 할머니 (창문 안). mood 0 차 · 1 내다봄 · 2 휴~ · 3 빗자루 */
function granny(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  // 숄
  ctx.fillStyle = '#d6739a';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.75, u * 0.75, u * 0.45, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  // 머리
  const sh = mood === 3 ? Math.sin(t * 0.6) * u * 0.06 : 0;
  ctx.translate(sh, mood === 1 ? -u * 0.08 : 0);
  ctx.fillStyle = '#e9e4ea';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.42, -u * 0.05);
    ctx.lineTo(sd * u * 0.36, -u * (mood === 3 ? 0.7 : 0.58));
    ctx.lineTo(sd * u * 0.1, -u * 0.32);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.48, u * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b8b0bd';
  ctx.beginPath();
  ctx.ellipse(-u * 0.18, -u * 0.18, u * 0.16, u * 0.12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // 쪽머리
  ctx.fillStyle = '#cfc8d6';
  ctx.beginPath();
  ctx.arc(0, -u * 0.46, u * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-u * 0.2, -u * 0.52);
  ctx.lineTo(u * 0.22, -u * 0.4);
  ctx.stroke();
  // 안경 · 눈
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.17, ey = -u * 0.02;
    ctx.strokeStyle = '#6a5a3a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#1a1a1a';
    ctx.fillStyle = '#1a1a1a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (mood === 2) ctx.arc(ex, ey + u * 0.03, u * 0.06, Math.PI * 1.1, Math.PI * 1.9);
    else if (mood === 3) (ctx.moveTo(ex - u * 0.07, ey - u * 0.06 * sd), ctx.lineTo(ex + u * 0.07, ey + u * 0.03 * sd));
    else if (mood === 1) ctx.arc(ex, ey, u * 0.06, 0, Math.PI * 2);
    else ctx.arc(ex, ey + u * 0.02, u * 0.05, Math.PI * 0.1, Math.PI * 0.9);
    if (mood === 1) ctx.fill();
    else ctx.stroke();
  }
  ctx.fillStyle = '#ff9fb2';
  ctx.beginPath();
  ctx.moveTo(-u * 0.05, u * 0.12);
  ctx.lineTo(u * 0.05, u * 0.12);
  ctx.lineTo(0, u * 0.18);
  ctx.fill();
  ctx.strokeStyle = '#6a4a4a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  if (mood === 3) ctx.ellipse(0, u * 0.28, u * 0.08, u * 0.07, 0, 0, Math.PI * 2);
  else if (mood === 2) ctx.ellipse(0, u * 0.26, u * 0.06, u * 0.04, 0, 0, Math.PI * 2);
  else (ctx.arc(-u * 0.05, u * 0.19, u * 0.05, 0, Math.PI), ctx.arc(u * 0.05, u * 0.19, u * 0.05, 0, Math.PI));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.2, u * 0.14);
    ctx.lineTo(sd * u * 0.55, u * 0.1);
    ctx.stroke();
  }
  ctx.restore();
  // 찻잔 · 빗자루 (기울지 않음)
  if (mood === 3) {
    const a = -0.9 + Math.sin(t * 0.5) * 0.7;
    ctx.save();
    ctx.translate(x + face * u * 0.55, y + u * 0.4);
    ctx.rotate(a * face);
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = u * 0.1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -u * 1.1);
    ctx.stroke();
    ctx.fillStyle = '#e8c35a';
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, -u * 1.05);
    ctx.lineTo(u * 0.2, -u * 1.05);
    ctx.lineTo(u * 0.3, -u * 1.55);
    ctx.lineTo(-u * 0.3, -u * 1.55);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else {
    const cx = x + face * u * 0.45, cy = y + u * 0.5 - (mood === 0 ? Math.abs(Math.sin(t * 0.03)) * u * 0.15 : 0);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx - u * 0.13, cy - u * 0.12, u * 0.26, u * 0.2, u * 0.05);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + u * 0.15, cy - u * 0.02, u * 0.06, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
    if (mood === 0 && t % 90 < 50) {
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - u * 0.15);
      ctx.quadraticCurveTo(cx + u * 0.08, cy - u * 0.3, cx, cy - u * 0.45);
      ctx.stroke();
    }
  }
}

/** 장난감 덤프트럭 (앞마당 구경꾼). face 1 = 오른쪽을 봄 */
function truck(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, t: number, jig: number) {
  ctx.save();
  ctx.translate(x, y + jig);
  ctx.scale(face, 1);
  ctx.fillStyle = 'rgba(40,20,20,.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 2.1, u * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 짐칸
  ctx.fillStyle = '#ffc533';
  ctx.beginPath();
  ctx.moveTo(-u * 1.9, -u * 1.5);
  ctx.lineTo(u * 0.3, -u * 1.5);
  ctx.lineTo(u * 0.1, -u * 0.55);
  ctx.lineTo(-u * 1.7, -u * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e0a21a';
  ctx.fillRect(-u * 1.75, -u * 1.2, u * 1.95, u * 0.12);
  ctx.fillRect(-u * 1.7, -u * 0.85, u * 1.85, u * 0.1);
  // 운전석
  ctx.fillStyle = '#ff6b3d';
  ctx.beginPath();
  ctx.roundRect(u * 0.25, -u * 1.25, u * 1.15, u * 0.75, u * 0.15);
  ctx.fill();
  ctx.fillStyle = '#bfe6ff';
  ctx.beginPath();
  ctx.roundRect(u * 0.55, -u * 1.15, u * 0.7, u * 0.35, u * 0.08);
  ctx.fill();
  // 눈 (장난감 트럭의 헤드라이트 얼굴)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(u * 1.3, -u * 0.7, u * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a1a';
  ctx.beginPath();
  ctx.arc(u * 1.33, -u * 0.7, u * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c0412a';
  ctx.fillRect(-u * 1.9, -u * 0.6, u * 3.3, u * 0.22);
  for (const wx of [-1.3, -0.5, 0.9]) {
    ctx.fillStyle = '#2b2530';
    ctx.beginPath();
    ctx.arc(u * wx, -u * 0.3, u * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#cfc8d6';
    ctx.beginPath();
    ctx.arc(u * wx, -u * 0.3, u * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b2530';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(u * wx + Math.cos(t * 0.02) * u * 0.12, -u * 0.3 + Math.sin(t * 0.02) * u * 0.12);
    ctx.lineTo(u * wx, -u * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

/** 블록의 그 틱 모습: 칸 좌표 중심(x,y), 기울기(화면 시계 방향 +), 조각인가, 사라졌나 */
function pose(o: Outcome, i: number, b: Blk, tau: number) {
  let cx = b.x + 0.5, cy = b.y + 0.5, a = 0, moving = false;
  if (o.die[i] >= 0 && tau >= o.die[i]) return { x: cx, y: cy, a, rub: false, gone: true, moving };
  for (const g of o.segs![i]) {
    if (tau < g.t0) break;
    const u = Math.min(1, (tau - g.t0) / Math.max(1, g.t1 - g.t0));
    if (u < 1) moving = true;
    if (g.k === 2) (cx = g.ax + 0.5), (cy = g.ay + 0.5 + (g.by - g.ay) * u * u), (a = 0);
    else if (g.k === 1) {
      const e = u * u * (1.6 - 0.6 * u), th = (e * Math.PI) / 2, dx = g.ax + 0.5 - g.px, dy = g.ay + 0.5 - g.py;
      const c = Math.cos(th), s = Math.sin(th);
      const rx = g.dir > 0 ? dx * c + dy * s : dx * c - dy * s, ry = g.dir > 0 ? -dx * s + dy * c : dx * s + dy * c;
      cx = g.px + rx;
      cy = g.py + ry + g.lift * e;
      a = g.dir * th;
    } else {
      // 조각: 옆으로는 고르게, 아래로는 중력처럼 (위로 살짝 튀었다가)
      const down = g.by < g.ay;
      cx = g.ax + 0.5 + (g.bx - g.ax) * Math.min(1, u * 1.3);
      cy = g.ay + 0.5 + (g.by - g.ay) * (down ? u * u : u) + (down ? Math.sin(u * Math.PI) * 0.15 : Math.sin(u * Math.PI) * 0.35);
      a = 0;
    }
  }
  const rub = o.rubT[i] >= 0 && tau >= o.rubT[i];
  return { x: cx, y: cy, a, rub, gone: false, moving };
}

function drawAll(ctx: CanvasRenderingContext2D, s: DemoState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const L = s.L, d = STAGES[s.stage], B = L.blocks, u = R(CW);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(HB) + size, y), text, col, size);
  };
  const o = s.phase === 'boom' || (s.phase === 'result' && s.out) ? s.out : null;
  const tau = s.phase === 'boom' ? s.pt : s.phase === 'result' ? 9999 : -1;
  const lotX0 = X(SX(L.L)), lotX1 = X(SX(L.R + 1)), gy = Y(GY);

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 (노을) ──
  const sky = ctx.createLinearGradient(0, 0, 0, gy);
  sky.addColorStop(0, '#3b2d5c');
  sky.addColorStop(0.45, '#a9568a');
  sky.addColorStop(0.78, '#f08a5d');
  sky.addColorStop(1, '#ffd59a');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, gy + 10);
  // 해
  {
    const sx = X(0.5), sy = Y(GY - 0.12);
    const sg = ctx.createRadialGradient(sx, sy, R(0.02), sx, sy, R(0.45));
    sg.addColorStop(0, 'rgba(255,240,190,.95)');
    sg.addColorStop(0.18, 'rgba(255,214,140,.55)');
    sg.addColorStop(1, 'rgba(255,170,120,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, w, gy);
    ctx.fillStyle = '#fff1c4';
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.07), 0, Math.PI * 2);
    ctx.fill();
  }
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 3) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4) - 0.2, cy = 0.14 + hsh(k + 9) * 0.3;
    ctx.fillStyle = 'rgba(255,228,214,.32)';
    for (let q = 0; q < 4; q++) {
      ctx.beginPath();
      ctx.ellipse(X(cx + q * 0.035), Y(cy - (q % 2) * 0.012), R(0.05 + 0.01 * q), R(0.022), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 먼 장난감 마을 (실루엣 두 겹)
  for (let layer = 0; layer < 2; layer++) {
    ctx.fillStyle = layer ? 'rgba(120,70,120,.55)' : 'rgba(90,55,110,.4)';
    let x = -0.05 + hsh(layer * 5) * 0.05;
    while (x < 1.05) {
      const bw = 0.06 + hsh(x * 31 + layer) * 0.07, bh = (layer ? 0.1 : 0.17) + hsh(x * 17 + layer * 3) * 0.12;
      const by = GY - DY * 2 - (layer ? 0 : 0.04);
      ctx.fillRect(X(x), Y(by - bh), R(bw), R(bh));
      ctx.beginPath();
      ctx.moveTo(X(x - 0.005), Y(by - bh));
      ctx.lineTo(X(x + bw / 2), Y(by - bh - 0.035));
      ctx.lineTo(X(x + bw + 0.005), Y(by - bh));
      ctx.fill();
      if (layer) {
        ctx.fillStyle = 'rgba(255,214,140,.55)';
        for (let k = 0; k < 2; k++) ctx.fillRect(X(x + bw * (0.25 + k * 0.35)), Y(by - bh * 0.7), R(0.012), R(0.016));
        ctx.fillStyle = 'rgba(120,70,120,.55)';
      }
      x += bw + 0.015;
    }
  }
  // ── 땅: 공사장 바닥 윗면 + 앞면 흙 ──
  {
    const top = gy - R(DY) * 1.6;
    const gg = ctx.createLinearGradient(0, top, 0, gy);
    gg.addColorStop(0, '#d9a774');
    gg.addColorStop(1, '#c28a58');
    ctx.fillStyle = gg;
    ctx.fillRect(0, top, w, gy - top + 1);
    // 이웃 마당 (풀)
    ctx.fillStyle = '#7fae5c';
    ctx.fillRect(0, top, lotX0, gy - top + 1);
    ctx.fillRect(lotX1, top, w - lotX1, gy - top + 1);
    // 바퀴 자국
    ctx.strokeStyle = 'rgba(120,80,50,.3)';
    ctx.lineWidth = 2;
    for (const k of [0.35, 0.7]) {
      ctx.beginPath();
      ctx.moveTo(lotX0, top + (gy - top) * k);
      ctx.lineTo(lotX1, top + (gy - top) * k);
      ctx.stroke();
    }
    const fg = ctx.createLinearGradient(0, gy, 0, Y(BAND));
    fg.addColorStop(0, '#8a5a3a');
    fg.addColorStop(0.18, '#734a30');
    fg.addColorStop(0.2, '#e3b67f');
    fg.addColorStop(1, '#cfa06c');
    ctx.fillStyle = fg;
    ctx.fillRect(0, gy, w, Y(BAND) - gy + 2);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let k = 0; k < 18; k++) ctx.fillRect(X(hsh(k * 3) * 1), gy + R(0.04) + hsh(k * 7) * R(0.14), R(0.01), R(0.006));
  }
  // 목표 높이 · 별 높이 선
  {
    const gl = Y(GY - L.goal * CW), fl = Y(GY - L.flat * CW);
    ctx.setLineDash([R(0.016), R(0.012)]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(lotX0, gl);
    ctx.lineTo(lotX1, gl);
    ctx.stroke();
    if (L.flat < L.goal) {
      ctx.strokeStyle = 'rgba(255,214,90,.7)';
      ctx.setLineDash([R(0.006), R(0.01)]);
      ctx.beginPath();
      ctx.moveTo(lotX0, fl);
      ctx.lineTo(lotX1, fl);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // 깃발
    const fx0 = L.granny > 0 ? lotX0 + R(0.012) : lotX1 - R(0.012);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(fx0, gl);
    ctx.lineTo(fx0, gl - R(0.05));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = L.granny > 0 ? 'left' : 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('목표', fx0 + (L.granny > 0 ? 3 : -3), gl - R(0.012));
    if (L.flat < L.goal) {
      ctx.fillStyle = '#ffd65a';
      ctx.fillText('★', fx0 + (L.granny > 0 ? 3 : -3), fl - R(0.004));
    }
  }
  // 이웃집 (빨간 선 밖)
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? 0 : lotX1, x1 = side < 0 ? lotX0 : w, mine = L.granny === side;
    const hw = x1 - x0, top = Y(GY - (mine ? 6.4 : 5.2) * CW), base = gy - R(DY) * 0.8;
    const wallC = mine ? '#f4a6b8' : '#8fd3c1', roofC = mine ? '#9a4a6a' : '#3f7f74';
    ctx.fillStyle = wallC;
    ctx.fillRect(x0 - 2, top, hw + 4, base - top);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(side < 0 ? x1 - R(0.012) : x0, top, R(0.012), base - top);
    ctx.fillStyle = roofC;
    ctx.beginPath();
    ctx.moveTo(x0 - R(0.04), top + 2);
    ctx.lineTo(side < 0 ? x1 + R(0.02) : x0 - R(0.02), top + 2);
    ctx.lineTo(side < 0 ? x1 - R(0.03) : x0 + R(0.03), top - R(0.06));
    ctx.lineTo(side < 0 ? -R(0.05) : w + R(0.05), top - R(0.12));
    ctx.closePath();
    ctx.fill();
    if (mine) {
      // 고양이 할머니의 내민 창 (울타리 위로 살짝 나와 공사장을 내려다본다)
      const bw = R(0.19), bh = R(0.16), bx = side < 0 ? x1 + R(0.05) - bw : x0 - R(0.05), by = Y(GY - 6.3 * CW);
      ctx.fillStyle = 'rgba(40,20,30,.25)';
      ctx.fillRect(bx + 3, by + 4, bw, bh);
      ctx.fillStyle = '#8a5a4a';
      ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
      const lg = ctx.createLinearGradient(0, by, 0, by + bh);
      lg.addColorStop(0, '#fff1c0');
      lg.addColorStop(1, '#ffb366');
      ctx.fillStyle = lg;
      ctx.fillRect(bx, by, bw, bh);
      // 커튼
      ctx.fillStyle = '#ff9fb8';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + bw * 0.22, by + bh * 0.3, bx + bw * 0.08, by + bh);
      ctx.lineTo(bx, by + bh);
      ctx.closePath();
      ctx.moveTo(bx + bw, by);
      ctx.quadraticCurveTo(bx + bw * 0.78, by + bh * 0.3, bx + bw * 0.92, by + bh);
      ctx.lineTo(bx + bw, by + bh);
      ctx.closePath();
      ctx.fill();
      granny(ctx, bx + bw / 2, by + bh * 0.52, R(0.062), s.granny, t, side < 0 ? 1 : -1);
      // 줄무늬 차양
      for (let k = 0; k < 6; k++) {
        ctx.fillStyle = k % 2 ? '#ffffff' : '#e8577a';
        ctx.beginPath();
        ctx.moveTo(bx - 4 + (k * (bw + 8)) / 6, by - 3);
        ctx.lineTo(bx - 4 + ((k + 1) * (bw + 8)) / 6, by - 3);
        ctx.lineTo(bx - 4 + ((k + 1) * (bw + 8)) / 6, by - R(0.035));
        ctx.lineTo(bx - 4 + (k * (bw + 8)) / 6, by - R(0.035));
        ctx.fill();
      }
      // 화분 상자
      ctx.fillStyle = '#c0583a';
      ctx.fillRect(bx - 3, by + bh + 3, bw + 6, R(0.022));
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = ['#ff6b8a', '#ffd23a', '#ff9f1c', '#ff6b8a'][k];
        ctx.beginPath();
        ctx.arc(bx + bw * (0.14 + k * 0.24), by + bh + 2, R(0.013), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const ww = Math.min(hw * 0.7, R(0.13)), wx = side < 0 ? x1 - R(0.012) - ww : x0 + R(0.012), wy = top + R(0.05), wh = R(0.11);
      ctx.fillStyle = '#5a3a40';
      ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
      ctx.fillStyle = '#ffd99a';
      ctx.fillRect(wx, wy, ww, wh);
      ctx.fillStyle = '#5a3a40';
      ctx.fillRect(wx, wy + wh * 0.48, ww, 2);
      // 비둘기 (쾅 하면 날아간다)
      const fly = s.phase === 'boom' || s.phase === 'result' ? Math.min(1, (s.phase === 'boom' ? s.pt : 99) / 60) : 0;
      const px = (side < 0 ? x1 - R(0.05) : x0 + R(0.05)) - side * fly * R(0.3), py = top - R(0.08) - fly * R(0.25);
      ctx.fillStyle = '#c9c3d9';
      ctx.beginPath();
      ctx.ellipse(px, py, R(0.024), R(0.017), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(px - side * R(0.018), py - R(0.015), R(0.012), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff9f1c';
      ctx.fillRect(px - side * R(0.03) - 2, py - R(0.016), 4, 2);
      if (fly) {
        ctx.fillStyle = '#c9c3d9';
        ctx.beginPath();
        ctx.ellipse(px, py - R(0.014), R(0.024), R(0.007), Math.sin(t * 0.8) * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 울타리 + 빨간 선
    const lx = side < 0 ? lotX0 : lotX1;
    ctx.strokeStyle = 'rgba(255,70,60,.65)';
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, gy);
    ctx.lineTo(lx, Y(HB + 0.03));
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? '#ffffff' : '#ff4b3e';
      ctx.fillRect(lx - R(0.008), gy - R(0.07) + k * R(0.0175), R(0.016), R(0.0175));
    }
  }
  // 꽃밭
  for (const fxc of L.flowers) {
    const x0 = X(SX(fxc));
    const squashed = o && tau >= o.end - 30 && o.flowers > 0 && o.segs && B.some((_, i) => o.die[i] < 0 && o.rubT[i] >= 0 && o.fx[i] === fxc);
    ctx.fillStyle = '#6a4a2a';
    ctx.fillRect(x0 + 2, gy - R(DY) * 0.9, u - 4, R(DY) * 0.9);
    for (let k = 0; k < 3; k++) {
      const px = x0 + u * (0.2 + k * 0.3), py = gy - R(DY) * 0.5, sw = Math.sin(t * 0.05 + k + fxc) * 1.5;
      ctx.strokeStyle = '#3f8f3a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + sw, py - (squashed ? u * 0.1 : u * 0.38));
      ctx.stroke();
      ctx.fillStyle = squashed ? '#8a6a5a' : ['#ff5c8a', '#ffd23a', '#ff8a3a'][(k + fxc) % 3];
      ctx.beginPath();
      ctx.ellipse(px + sw, py - (squashed ? u * 0.1 : u * 0.42), u * 0.09, squashed ? u * 0.04 : u * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 블록 ──
  const cracked = (i: number) => B[i].m === STONE && s.ch[i] === 1 && s.phase !== 'play';
  const stat = new Int16Array(GW * GH).fill(-1);
  const poses = B.map((b, i) => (o ? pose(o, i, b, tau) : { x: b.x + 0.5, y: b.y + 0.5, a: 0, rub: false, gone: false, moving: false }));
  B.forEach((_, i) => {
    const p = poses[i];
    if (p.gone || p.rub || p.moving || p.a !== 0) return;
    const gx = Math.round(p.x - 0.5), gyy = Math.round(p.y - 0.5);
    if (Math.abs(p.x - 0.5 - gx) < 0.01 && Math.abs(p.y - 0.5 - gyy) < 0.01 && gyy >= 0 && gyy < GH) stat[gyy * GW + gx] = i;
  });
  // 그림자 (땅 위)
  ctx.fillStyle = 'rgba(60,30,30,.22)';
  B.forEach((_, i) => {
    const p = poses[i];
    if (p.gone) return;
    const hgt = Math.max(0, p.y - 0.5);
    ctx.globalAlpha = Math.max(0.05, 0.3 - hgt * 0.03);
    ctx.beginPath();
    ctx.ellipse(X(SX(p.x - 0.5) + CW * 0.6), gy - R(DY) * 0.45, u * 0.62, R(DY) * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  const order = B.map((_, i) => i).sort((a, b) => poses[a].y - poses[b].y || poses[b].x - poses[a].x);
  for (const i of order) {
    const b = B[i], p = poses[i];
    if (p.gone) continue;
    const px = X(SX(p.x - 0.5)), py = Y(SY(p.y - 0.5));
    if (p.rub && !p.moving) {
      rubble(ctx, b, px + u / 2, py + u / 2, u * 0.95, i * 7 + b.x);
      continue;
    }
    if (p.rub) {
      // 굴러떨어지는 조각: 아직 통 블록 모양으로 데굴데굴 (바닥에 닿으면 부서진다)
      ctx.save();
      ctx.translate(px + u / 2, py + u / 2);
      ctx.rotate((hsh(i) - 0.5) * 2 + tau * 0.12 * (hsh(i + 3) > 0.5 ? 1 : -1));
      ctx.scale(0.86, 0.86);
      ctx.translate(-u / 2, -u / 2);
      face(ctx, b, u, false);
      ctx.restore();
      continue;
    }
    if (p.moving || p.a !== 0) {
      ctx.save();
      ctx.translate(px + u / 2, py + u / 2);
      ctx.rotate(p.a);
      ctx.translate(-u / 2, -u / 2);
      face(ctx, b, u, cracked(i));
      ctx.restore();
    } else {
      const gx = Math.round(p.x - 0.5), gyy = Math.round(p.y - 0.5);
      const above = gyy + 1 < GH ? stat[(gyy + 1) * GW + gx] : -1, right = gx + 1 < GW ? stat[gyy * GW + gx + 1] : -1;
      blockAt(ctx, b, px, py, u, above < 0, right < 0, cracked(i));
    }
    // 붙은 폭약 (쾅 전까지)
    if (s.ch[i] > 0 && !o) for (let k = 0; k < s.ch[i]; k++) dynamite(ctx, px + u * (0.5 + (s.ch[i] > 1 ? (k - 0.5) * 0.36 : 0)), py + u * 0.52, u * (s.ch[i] > 1 ? 0.7 : 0.85), t + i * 5, s.phase === 'count');
  }
  // 1판 첫 톡 전: 여기를 톡!
  if (s.stage === 0 && !s.firstTap && s.phase === 'play') {
    const pole = B.find((b) => b.m === WOOD && b.y === 2) ?? B[0];
    const cx = X(SX(pole.x) + CW / 2), cy = Y(SY(pole.y) + CW / 2), pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, u * (0.4 + pulse * 0.6), 0, Math.PI * 2);
    ctx.stroke();
    font(0.06, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', cx + u * 0.9, cy + u * 0.5 + Math.sin(t * 0.15) * 3);
  }

  // ── 미리 보기 (꾹 누르는 동안): 지금 붙인 폭약 + 이 자리가 터지면 ──
  let pv: Outcome | null = null, hv = -1;
  if (s.down && s.aim && s.phase === 'play') {
    hv = pickBlock(L, s.aim.x, s.aim.y);
    if (hv >= 0 && s.ch[hv] < capOf(B[hv])) {
      const key = `${s.placed.join(',')}|${hv}`, c = PREV.get(s);
      if (c && c.key === key) pv = c.o;
      else {
        const ch = s.ch.slice();
        ch[hv]++;
        pv = simulate(L, ch);
        PREV.set(s, { key, o: pv });
      }
    }
    if (hv >= 0) {
      const b = B[hv], px = X(SX(b.x)), py = Y(SY(b.y));
      ctx.strokeStyle = B[hv].m === METAL || s.ch[hv] >= capOf(B[hv]) ? '#ff8a7a' : '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(px - 1, py - 1, u + 2, u + 2);
      if (pv) dynamite(ctx, px + u / 2, py + u * 0.52, u * 0.8, t, false, true);
    }
  }
  if (pv) {
    const bad = (x: number) => x < L.L || x > L.R;
    B.forEach((b, i) => {
      const ox = X(SX(b.x)), oy = Y(SY(b.y));
      if (pv!.die[i] >= 0 && !pv!.dust[i]) {
        ctx.strokeStyle = '#ff5a4a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(ox + u * 0.2, oy + u * 0.2);
        ctx.lineTo(ox + u * 0.8, oy + u * 0.8);
        ctx.moveTo(ox + u * 0.8, oy + u * 0.2);
        ctx.lineTo(ox + u * 0.2, oy + u * 0.8);
        ctx.stroke();
        return;
      }
      if (pv!.rubT[i] < 0) return;
      // 무너지는 블록: 원래 자리를 흐리게 + 떨어질 자리에 윤곽
      ctx.fillStyle = 'rgba(40,20,40,.35)';
      ctx.fillRect(ox, oy, u, u);
      if (pv!.dust[i]) return;
      const fx2 = X(SX(pv!.fx[i])), fy2 = Y(SY(pv!.fy[i]));
      ctx.setLineDash([R(0.008), R(0.006)]);
      ctx.strokeStyle = bad(pv!.fx[i]) ? '#ff5a4a' : '#ffffff';
      ctx.fillStyle = bad(pv!.fx[i]) ? 'rgba(255,80,70,.35)' : 'rgba(255,255,255,.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(fx2 + u * 0.08, fy2 + u * 0.08, u * 0.84, u * 0.84, u * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // 넘어질 방향 화살표
    for (const tp of pv.tips) {
      const top = tp.ids.reduce((a, j) => (B[j].y > B[a].y ? j : a), tp.ids[0]);
      const cx = X(SX(B[top].x) + CW / 2), cy = Y(SY(B[top].y)), rr = u * 1.3;
      ctx.strokeStyle = '#ffe14d';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const a0 = -Math.PI / 2, a1 = a0 + tp.dir * 1.1;
      ctx.arc(cx, cy + rr, rr, Math.min(a0, a1), Math.max(a0, a1));
      ctx.stroke();
      const ex = cx + Math.cos(a1) * rr, ey = cy + rr + Math.sin(a1) * rr, ang = a1 + (tp.dir * Math.PI) / 2;
      ctx.fillStyle = '#ffe14d';
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(ang) * u * 0.35, ey + Math.sin(ang) * u * 0.35);
      ctx.lineTo(ex + Math.cos(ang + 2.4) * u * 0.3, ey + Math.sin(ang + 2.4) * u * 0.3);
      ctx.lineTo(ex + Math.cos(ang - 2.4) * u * 0.3, ey + Math.sin(ang - 2.4) * u * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }

  // ── 비버 반장 (앞마당) ──
  {
    const side = -L.granny, bxp = side < 0 ? 0.1 : 0.9, byp = BAND - 0.035;
    const plunge = s.phase === 'count' ? Math.min(1, s.pt / (COUNT_T * 3)) : s.phase === 'boom' || s.phase === 'result' ? 1 : 0;
    // 전선: 기폭 상자 → 건물
    const tgt = B.find((_, i) => s.ch[i] > 0);
    if (tgt && !o) {
      const sx = X(bxp + side * -0.076), sy = Y(byp - 0.05), ex = X(SX(tgt.x) + CW / 2), ey = Y(SY(tgt.y) + CW * 0.9);
      ctx.strokeStyle = s.phase === 'count' && t % 10 < 5 ? '#ffe14d' : '#c9a227';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(sx, gy + R(0.05), ex, gy + R(0.02), ex, ey);
      ctx.stroke();
    }
    // 앞마당 소품: 장난감 덤프트럭 · 고깔 · 공사중 표지
    const tx = side < 0 ? 0.8 : 0.2, tf = side < 0 ? -1 : 1;
    truck(ctx, X(tx), Y(byp + 0.005), R(0.05), tf, t, s.phase === 'boom' ? Math.sin(t * 0.9) * R(0.003) : 0);
    for (const cxp of [0.32, 0.5, 0.66]) {
      const cx = X(side < 0 ? cxp : 1 - cxp), cy = Y(byp + 0.01), ch3 = R(0.045);
      ctx.fillStyle = 'rgba(60,30,30,.25)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, R(0.024), R(0.007), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff7a1a';
      ctx.beginPath();
      ctx.moveTo(cx - R(0.018), cy);
      ctx.lineTo(cx, cy - ch3);
      ctx.lineTo(cx + R(0.018), cy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - R(0.01), cy - ch3 * 0.55, R(0.02), ch3 * 0.16);
    }
    beaver(ctx, X(bxp), Y(byp), R(0.066), s.beaver, t, side < 0 ? 1 : -1, plunge);
  }

  // ── 쾅! 연출 ──
  let puffs = PUFFS.get(s);
  if (!puffs) PUFFS.set(s, (puffs = []));
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'stick') fx.burst(x, y, '#ffe14d', 10, 2.4, 2), fx.ring(x, y, '#ffffff', u * 0.8, 3), say(x, y - u * 0.8, e.text!, '#fff3c4', 14);
    if (e.kind === 'nope') say(x, y - u * 0.7, e.text!, '#ffd0c8', 13), fx.kick(1.5);
    if (e.kind === 'beep') fx.kick(2), fx.blink('#ff3b30', 0.06);
    if (e.kind === 'boom') fx.kick(14), fx.blink('#fff3c4', 0.55);
    if (e.kind === 'blast' || e.kind === 'gas') {
      const big = e.kind === 'gas';
      fx.burst(x, y, '#ffe14d', big ? 40 : 26, big ? 6 : 4.6, 3.2), fx.burst(x, y, '#ff6a3a', big ? 30 : 18, big ? 5 : 3.8, 3), fx.ring(x, y, '#fff3c4', u * (big ? 2.6 : 1.4), 6);
      if (big) fx.kick(12), say(x, y - u, '가스 펑!', '#ffb36b', 18);
      for (let k = 0; k < (big ? 6 : 3); k++) puffs.push({ x: x + (hsh(e.t + k) - 0.5) * u, y: y + (hsh(k * 3 + e.t) - 0.5) * u, r: u * (0.4 + hsh(k) * 0.3), life: 70, max: 70, vx: (hsh(k + 9) - 0.5) * 0.6 });
    }
    if (e.kind === 'dust') for (let k = 0; k < 2; k++) puffs.push({ x: x + (hsh(e.id! + k) - 0.5) * u, y, r: u * (0.5 + hsh(e.id! * 3 + k) * 0.3), life: 90, max: 90, vx: (hsh(e.id! + k * 5) - 0.5) * 0.8 });
    if (e.kind === 'land') fx.burst(x, y + u * 0.3, '#d9b38c', 6, 2.2, 2.2), fx.kick(3);
    if (e.kind === 'tip') say(x, y - u * 0.5, e.text!, '#ffe14d', 16);
    if (e.kind === 'hit') fx.kick(10), fx.blink(th.hot, 0.3), fx.burst(x, y, '#ff8a7a', 24, 4.5, 2.6), say(x, y - u, e.text!, '#ffb3a8', 20);
    if (e.kind === 'phew') say(x, y, e.text!, '#ffd6e6', 17);
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.45), '#ffe14d', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.45), '#ff9ec4', 40, 6, 3.2), fx.ring(w / 2, Y(0.5), '#ffe14d', R(0.45), 7), fx.blink('#fff6c8', 0.2);
    if (e.kind === 'fail') fx.kick(6), fx.blink(th.hot, 0.15);
  }
  fx.memo.t = s.t;
  // 먼지 구름
  for (const p of puffs) {
    p.life--;
    p.x += p.vx;
    p.y -= 0.25;
    p.r += 0.25;
    ctx.fillStyle = `rgba(222,198,170,${0.36 * (p.life / p.max)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  PUFFS.set(s, puffs.filter((p) => p.life > 0).slice(-80));
  // 느린 화면: 넘어지는 동안 위아래 검은 띠
  if (o && s.phase === 'boom' && o.tips.length && tau > 10 && tau < o.end - 20) {
    const k = Math.min(1, (tau - 10) / 12, (o.end - 20 - tau) / 12);
    ctx.fillStyle = 'rgba(10,6,20,.55)';
    ctx.fillRect(0, Y(HB), w, R(0.035) * k);
    ctx.fillRect(0, Y(BAND) - R(0.035) * k, w, R(0.035) * k);
    if (k > 0.5) {
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText('▶▶ 느린 화면', R(0.03), Y(BAND) - R(0.018));
    }
  }
  // 3·2·1
  if (s.phase === 'count') {
    const n = 3 - Math.floor(s.pt / COUNT_T), age = s.pt % COUNT_T, sc = 1.6 - Math.min(0.6, age / 10);
    ctx.save();
    ctx.translate(w / 2, Y(0.36));
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, (COUNT_T - age) / 10);
    font(0.16, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(60,10,10,.6)';
    ctx.strokeText(String(n), 0, 0);
    ctx.fillStyle = '#ffe14d';
    ctx.fillText(String(n), 0, 0);
    ctx.restore();
  }
  if (s.phase === 'boom' && tau < 30) {
    const sc = 0.8 + tau / 20;
    ctx.save();
    ctx.translate(w / 2, Y(0.34));
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.max(0, 1 - tau / 30);
    font(0.13, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(80,20,10,.7)';
    ctx.strokeText('쾅!', 0, 0);
    ctx.fillStyle = '#ff7a3a';
    ctx.fillText('쾅!', 0, 0);
    ctx.restore();
  }
  ctx.restore();

  // ═════════════ HUD (위 띠) ═════════════
  const hb = R(HB);
  ctx.fillStyle = 'rgba(30,22,52,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🏗️ ${s.stage + 1}번째 현장`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  const cardUp = s.phase === 'result' || (s.phase === 'play' && s.pt < CARD_T && !s.down);
  if (s.news && s.t - s.news.t < NEWS_T && s.phase !== 'count' && !cardUp && !(s.down && s.phase === 'play')) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = hb + R(0.04) + drop;
    ctx.fillStyle = 'rgba(30,22,52,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 미리 보기 말풍선
  if (s.down && s.phase === 'play' && hv >= 0) {
    let line = '', col = '#ffffff';
    if (!pv) (line = B[hv].m === METAL ? '쇠에는 폭약이 안 붙어요' : '이미 붙었어요'), (col = '#ffb3a8');
    else if (pv.hitL + pv.hitR > 0) (line = '✗ 이웃집 쾅!'), (col = '#ff9a8a');
    else if (!pv.moved) (line = B[hv].m === STONE && s.ch[hv] === 0 ? '돌은 폭약 하나로는 안 터져요' : '✗ 꿈쩍도 안 해요'), (col = '#ffd0a0');
    else if (!pv.ok) (line = `✗ 아직 높아요 (${pv.height}칸)`), (col = '#ffd0a0');
    else (line = `✓ 철거 성공 ${pv.star.map((k) => (k ? '★' : '☆')).join('')}`), (col = '#bff7a8');
    const sub = s.left > 1 ? `지금 쾅 하면 — 폭약 ${s.left - 1}개 더 붙여야 진짜 쾅` : '떼면 붙이고 3·2·1 쾅!';
    const by3 = hb + R(0.1);
    ctx.fillStyle = 'rgba(30,22,52,.9)';
    ctx.beginPath();
    ctx.roundRect(R(0.08), by3 - R(0.04), w - R(0.16), R(0.09), R(0.03));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = col;
    font(0.046, 900);
    ctx.fillText(line, w / 2, by3 - R(0.01), w - R(0.2));
    ctx.fillStyle = '#e9ddff';
    font(0.032, 800);
    ctx.fillText(sub, w / 2, by3 + R(0.028), w - R(0.2));
  }
  // 판 카드: 시작 · 결과
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '마을 철거 끝! 🏗️' : '철거 성공!'), (sub = `높이 ${s.out!.height}칸 · 꽃밭 ${s.starOk[1] ? '✓' : '✗'} · 납작 ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 현장 다시' : '끝 — 비버들이 먼지를 털어요'), (col = '#ffb3a8');
    } else if (s.phase === 'play' && s.pt < CARD_T && !s.down) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${d.title}` : d.title;
      sub = `폭약 ${d.charges}개 · 목표 ${d.goal}칸 아래 · ★ ${d.flat}칸`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(HB + (nw ? 0.1 : 0.09)), ch2 = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(30,22,52,.92)';
      ctx.beginPath();
      ctx.roundRect(-R(nw ? 0.45 : 0.4), -R(0.055), R(nw ? 0.9 : 0.8), R(ch2), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.76));
      ctx.fillStyle = '#fff8ec';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.76));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.86));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BAND, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(36,26,60,.95)');
    g.addColorStop(1, 'rgba(22,16,38,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 폭약 남은 수
    const r1 = Y(ty + 0.045);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9d6';
    font(0.038, 900);
    ctx.fillText('폭약', X(0.03), r1);
    for (let k = 0; k < d.charges; k++) {
      const cx = X(0.16) + k * R(0.07);
      if (k < s.placed.length) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cx - R(0.018), r1 - R(0.026), R(0.036), R(0.052));
      } else dynamite(ctx, cx, r1, R(0.06), t + k * 9, false);
    }
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = s.left > 0 ? '#ffd9a8' : '#ffb3a8';
    ctx.fillText(s.phase === 'play' ? `${s.left}개 남음` : s.phase === 'count' ? '3·2·1…' : '쾅!', X(0.97), r1);
    // 별 목표 셋
    const done = s.phase === 'result' && s.ok;
    const okk = done ? s.starOk : [false, false, false];
    const bad = [s.phase === 'result' && !s.ok, done && !s.starOk[1], done && !s.starOk[2]];
    const labels = ['철거!', L.flowers.length ? '꽃밭 무사' : '꽃밭 (없음)', `납작 ≤${L.flat}칸`];
    const r2 = Y(ty + 0.12), cw2 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = X(0.03) + k * (cw2 + R(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#f1e6ff';
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw2 - R(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) hint = '👆 기둥을 톡! 폭약을 붙이면 3·2·1 쾅!';
    else if (s.down && s.phase === 'play') hint = '떼면 폭약을 붙여요 · 빈 곳에서 떼면 취소';
    else if (s.phase === 'count') hint = '비버 반장: 귀 막아요!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '장난감 마을이 새 집을 지을 자리를 얻었어요' : `★ ${s.got}개! 다음 현장엔 새것이 나와요`) : '꾹 누르면 무너질 모양이 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.037, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.2), w - R(0.05));
  }
}
