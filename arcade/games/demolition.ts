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
      '....ppppp...',
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
    key: 'domino', title: '도미노 골목', news: '🁢 넘어진 탑이 옆 건물을 치면 같이 와르르', hint: '폭약이 모자라요 — 하나로 둘을 쓰러뜨려요',
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
