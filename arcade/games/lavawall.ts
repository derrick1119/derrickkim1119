/**
 * 🌋 용암 막는 마을 (37라운드: 살아 움직이는 세계 — 한 번 긋기) — 흐름 돌리기 × 그린 선이 길이 된다.
 * 세상은 저절로 움직인다: 언덕 꼭대기 화산이 정해진 박자로 꿀렁 분출하고(다음 분출까지 남은 초·터질 쪽 화살표, 흘러갈 길 점선이 미리 보인다),
 *   용암은 격자 흐름(결정적, 1/20초마다, 8방향, 두꺼울수록 잘 흐르고 얇은 막은 남아 굳는 끈적한 흐름)으로 낮은 곳을 찾아 갈라지고 고이며
 *   천천히 비탈을 내려온다. 화면이 뜨면 이미 흘러내려오고 있고, 첫 판은 첫 집까지 10초 넘게 걸린다.
 * 손짓 하나(한 번 긋기): 누르고 쓱 — 손가락이 지나간 자리에 돌이 0.5칸마다 하나씩 쿵쿵 솟아 벽이 된다(긋는 동안 바로). 돌은 판마다 정해진 만큼.
 *   벽은 굵고(손가락이 조금 빗나가도 흐름이 같다), 용암은 벽에 막혀 벽을 따라 꺾여 흐른다. 키보드: 화살표로 커서, 스페이스를 누른 채 화살표.
 * 와우: 내가 그은 벽을 따라 용암 강이 굽이쳐 마을을 비켜 가고, 바다·호수에 닿는 순간 치이익— 거대한 김 구름과 함께 검은 돌로 굳어
 *   새 땅이 생긴다. 주민들은 지붕 위에서 환호, 바닷가의 촌장 할아버지는 '만세!'. 못 막으면 집이 '앗뜨!' 하고 주민이 엉덩이에 불 붙은 채 뛰어다닌다.
 * 판: 판마다 지킬 집 수(별 첫 줄). 모든 분출이 끝나고 용암이 멈추면 판 끝 — 지킨 집이 모자라면 하트 −1, 그 판 다시. 하트 셋을 다 잃거나 6판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 한 갈래(비스듬히 그어 옆 골짜기로 돌리기) → 2 두 갈래(분화구가 왼쪽·오른쪽 번갈아 — 예고를 보고 돌을 나눠 쓰기)
 *   → 3 녹는 벽(고여서 오래 닿으면 녹는다 — 막지 말고 비스듬히 흘리기) → 4 호수(식히는 곳 — 호수로 끌어들여 섬 만들기, 돌 아끼기)
 *   → 5 돌무더기(돌이 모자라다 — 획이 무더기를 지나가면 돌 +8, 줍는 길로 긋기) → 6 큰 분출(세 번 번갈아 + 지난 분출이 굳은 검은 둑 + 호수 — 둑을 이어 쓰기).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

/** 화면 세로 ÷ 가로 */
const A = 1.5;
/** 격자: 가로 GW칸 · 세로 GH줄 (줄 0 = 화산 아래, SEA_R줄부터 바다) */
const GW = 20, GH = 26, N = GW * GH, SEA_R = 23;
/** 화면 배치 (가로 폭 = 1): 격자가 그려지는 세로 범위 · 원근(위가 좁다) */
const GY0 = 0.262, GY1 = 1.27, CH = (GY1 - GY0) / GH, SB = 0.86;
const BAND = 1.27;
/** 흐름: 한 줄 내려갈 때의 높이 · 흐름 세기 · 움직이기 시작하는 높이 차 · 식는 양 · 집이 타는 깊이 */
/** 흐름은 STEP틱(1/20초)마다 한 번 — 세기들은 그 간격 기준 */
const STEP = 3, FS = STEP / 2;
const SLOPE = 0.2, DIAG = 0.5, DEEP = 3, K1 = 0.09 * FS, K = 0.4 * FS, TAU = 0.01, YIELD = 0.045, COOL = 0.0011 * FS, THIN = 0.012, BURN = 0.05, BURN_SIDE = 0.12;
/** 돌벽: 높이 · 돌 한 개 사이 간격(칸) · 돌 하나가 세우는 둘레(칸) · 녹는 빠르기 */
const WALLH = 1.6, BLOCK_D = 0.5, WALL_R = 0.78, MELT = 0.02 * FS, MELT0 = 0.4;
/** 물에 든 용암은 바로 굳는다: 물칸 하나를 땅으로 메우는 데 드는 용암 */
const SEA_DEEP = 0.7, LAKE_DEEP = 0.45;
const RESULT = 200, CARD_T = 160, NEWS_T = 170, CALM_N = 16;
const STAR_PTS = 100, HOUSE_PTS = 15, INK_PTS = 2, WIN_PTS = 300;

type Star = { k: 'keep'; n: number } | { k: 'all' } | { k: 'sea'; p: number } | { k: 'lake' } | { k: 'half' } | { k: 'nomelt' } | { k: 'piles' };

interface Way { pts: number[]; d: number; w: number }
interface StageDef {
  key: string;
  /** 시작 카드의 새것 한 줄 · 아래 띠 안내 */
  news: string;
  hint: string;
  /** 분화구 칸(줄 0의 가로 위치) */
  vents: number[];
  /** 분출: [분화구 번호, 시작 초, 길이 초, 세기] */
  erupt: [number, number, number, number][];
  /** 골짜기(−)·둑(+) */
  ways: Way[];
  houses: number[][];
  ink: number;
  melt?: boolean;
  lake?: [number, number, number, number];
  piles?: number[][];
  /** 지난 분출이 굳은 둑: [c0,r0,c1,r1] 선분 */
  crusts?: number[][];
  stars: Star[];
}

const V = (pts: number[], d: number, w: number): Way => ({ pts, d, w });

export const STAGES: StageDef[] = [
  {
    key: 'one', news: '', hint: '용암 길 위에 비스듬히 쓱 — 돌벽이 용암을 돌려요',
    vents: [10], erupt: [[0, 0, 11, 0.042], [0, 13, 7, 0.042]],
    ways: [V([10, 0, 10, 4, 8, 9, 7, 14, 6, 19, 6, 23], 0.7, 1.0), V([12, 6, 14, 10, 15, 15, 15, 23], 0.6, 1.0)],
    houses: [[7, 18], [6, 21], [3, 17], [11, 20], [2, 13]],
    ink: 36, stars: [{ k: 'keep', n: 2 }],
  },
  {
    key: 'two', news: 'NEW 분화구가 왼쪽·오른쪽 번갈아 터져요', hint: '화산 위 화살표 = 다음에 터질 쪽. 돌을 나눠 써요',
    vents: [6, 13], erupt: [[0, 0, 6, 0.05], [1, 7, 6, 0.05]],
    ways: [V([6, 0, 5, 6, 5, 12, 4, 18, 4, 23], 0.6, 1.0), V([13, 0, 14, 6, 14, 12, 15, 18, 15, 23], 0.6, 1.0), V([9.5, 5, 9.5, 12, 9.5, 23], 0.5, 1.1)],
    houses: [[5, 14], [4, 19], [14, 14], [15, 19], [12, 17]],
    ink: 32, stars: [{ k: 'keep', n: 2 }, { k: 'sea', p: 0.08 }],
  },
  {
    key: 'melt', news: 'NEW 오래 고인 용암은 벽을 녹여요 — 막지 말고 흘려요', hint: '가로로 막으면 고여서 녹아요. 비스듬히 옆 골짜기로!',
    vents: [10], erupt: [[0, 0, 7, 0.05], [0, 9, 6, 0.05]], melt: true,
    ways: [V([10, 0, 10, 8, 9, 14, 9, 19, 9, 23], 0.7, 1.0), V([8, 6, 5, 10, 3, 15, 3, 23], 0.45, 1.0), V([12, 6, 15, 10, 16, 15, 16, 23], 0.45, 1.0)],
    houses: [[9, 13], [10, 18], [7, 20], [12, 15], [6, 15]],
    ink: 30, stars: [{ k: 'keep', n: 4 }, { k: 'all' }, { k: 'nomelt' }],
  },
  {
    key: 'lake', news: 'NEW 호수 — 용암이 들어가면 치이익 섬이 돼요', hint: '용암을 호수로 끌어들이면 마을이 안전해요',
    vents: [9], erupt: [[0, 0, 7, 0.05], [0, 9, 6, 0.05]], melt: true, lake: [14.5, 10, 2.6, 2.2],
    ways: [V([9, 0, 9, 6, 8, 11, 7, 16, 7, 23], 0.7, 1.0), V([10, 4, 13, 8], 0.2, 1.2)],
    houses: [[8, 13], [7, 18], [10, 16], [5, 20], [4, 14]],
    ink: 30, stars: [{ k: 'keep', n: 4 }, { k: 'lake' }, { k: 'half' }],
  },
  {
    key: 'piles', news: 'NEW 돌무더기 — 획이 지나가면 돌 +8', hint: '돌이 모자라요. 돌무더기를 지나가게 그어요',
    vents: [6, 13], erupt: [[1, 0, 6, 0.05], [0, 7, 6, 0.05]], melt: true,
    ways: [V([6, 0, 5, 6, 5, 12, 4, 18, 4, 23], 0.6, 1.0), V([13, 0, 14, 6, 14, 12, 15, 18, 15, 23], 0.6, 1.0), V([9.5, 5, 9.5, 12, 9.5, 23], 0.5, 1.1)],
    houses: [[5, 14], [4, 19], [14, 14], [15, 19], [12, 17], [7, 17]],
    ink: 12, piles: [[2, 8], [17, 8]],
    stars: [{ k: 'keep', n: 4 }, { k: 'piles' }, { k: 'all' }],
  },
  {
    key: 'big', news: 'NEW 큰 분출 — 세 번 연달아, 굳은 검은 둑도 써요', hint: '어느 쪽이 먼저 터지나 보고, 호수와 바다로 나눠 보내요',
    vents: [6, 13], erupt: [[0, 0, 5, 0.05], [1, 5, 5, 0.05], [0, 10, 5, 0.05]], melt: true, lake: [15, 12, 2.2, 2],
    ways: [V([6, 0, 6, 6, 7, 12, 7, 23], 0.6, 1.0), V([13, 0, 13, 6, 12, 12, 11, 23], 0.6, 1.0)],
    crusts: [[3, 7, 5, 11]],
    houses: [[7, 14], [6, 19], [12, 15], [11, 20], [9, 17], [3, 16]],
    ink: 30, piles: [[17, 6]], stars: [{ k: 'keep', n: 4 }, { k: 'lake' }, { k: 'all' }],
  },
];
export const STAGE_COUNT = STAGES.length;

interface House { c: number; r: number; alive: boolean; t: number; near: number }
interface Erupt { v: number; at: number; dur: number; rate: number; sea: boolean }
interface Pile { c: number; r: number; got: boolean }
interface Block { x: number; y: number; t: number; i: number }
interface Sim {
  t: number;
  G: Float64Array; Wl: Float64Array; L: Float64Array; H: Float64Array; crust: Float64Array; wat: Uint8Array; land: Float64Array; rock: Uint8Array; r0: number; r1: number;
  houses: House[]; erupts: Erupt[]; vents: number[]; melt: boolean; k: number;
  out: number; sea: number; lake: number; lakeN: number; lakeLeft: number; meltN: number; calm: number; flux: number; done: boolean;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }

export interface LavaState extends Sim {
  rng: Rng; seed: number; tick: number; stage: number; phase: 'play' | 'result'; pt: number; flip: boolean[];
  ink: number; inkMax: number; used: number; piles: Pile[]; blocks: Block[]; walls: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  dead: boolean; won: boolean; again: boolean; tries: number;
  down: boolean; lx: number; ly: number; acc: number; strokeN: number; strokeEnd: number; firstTouch: number; strokes: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; wowN: number; cheerT: number; hurtT: number; lakeHit: number;
}

const ev = (s: LavaState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.tick, kind, x, y, text, n });
function see(s: LavaState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}

// ───────── 화면 배치 ─────────
const scl = (r: number) => SB + (1 - SB) * Math.max(0, Math.min(1, r / (GH - 1)));
/** 격자(칸 중심 c+0.5, r+0.5 기준의 실수 좌표 x=c+0.5…) → 화면(가로 폭 1 기준) */
const PX = (x: number, y: number) => 0.5 + (x / GW - 0.5) * scl(y - 0.5);
const PY = (y: number) => GY0 + y * CH;
/** 화면(0~1, 0~1) → 격자 실수 좌표 */
function toGrid(p: { x: number; y: number }) {
  const y = (p.y * A - GY0) / CH;
  return { x: ((p.x - 0.5) / scl(y - 0.5) + 0.5) * GW, y };
}
const clampF = (x: number, lo: number, hi: number) => (x < lo ? lo : x > hi ? hi : x);

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
type Emit = ((kind: string, i: number, n?: number) => void) | null;
const dL = new Float64Array(N), OUT = new Float64Array(N);
/** 이웃 있음 비트: 1 위 · 2 아래 · 4 왼 · 8 오른 */
const NB = new Uint8Array(N).map((_, i) => {
  const r = (i / GW) | 0, c = i - r * GW;
  return (r > 0 ? 1 : 0) | (r < GH - 1 ? 2 : 0) | (c > 0 ? 4 : 0) | (c < GW - 1 ? 8 : 0);
});

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-9, u = clampF(((px - ax) * ex + (py - ay) * ey) / l2, 0, 1);
  return Math.hypot(px - ax - ex * u, py - ay - ey * u);
}
function polyDist(px: number, py: number, pts: number[]) {
  let d = 99;
  for (let k = 2; k < pts.length; k += 2) d = Math.min(d, segDist(px, py, pts[k - 2], pts[k - 1], pts[k], pts[k + 1]));
  return d;
}
const baseH = (r: number) => SLOPE * (GH - 1 - r) + (r < 3 ? (3 - r) * 0.18 : 0);

/** 판 땅 만들기 (좌우 뒤집기 fl) */
function buildTerrain(S: Sim, d: StageDef, fl: boolean, rng: Rng) {
  const fx = (x: number) => (fl ? GW - 1 - x : x) + 0.5;
  S.G = new Float64Array(N);
  S.Wl = new Float64Array(N);
  S.L = new Float64Array(N);
  S.crust = new Float64Array(N);
  S.wat = new Uint8Array(N);
  S.land = new Float64Array(N);
  S.rock = new Uint8Array(N);
  S.lakeN = 0;
  for (let r = 0; r < GH; r++)
    for (let c = 0; c < GW; c++) {
      const i = r * GW + c, x = c + 0.5, y = r + 0.5;
      let h = baseH(r) + (rng() - 0.5) * 0.05;
      for (const w of d.ways) {
        const pts = w.pts.map((v, k) => (k % 2 ? v + 0.5 : fx(v)));
        const dd = polyDist(x, y, pts);
        h += (w.d > 0 ? -1 : 1) * Math.abs(w.d) * Math.exp(-(dd * dd) / (2 * w.w * w.w));
      }
      // 옆 가장자리는 둑 (용암이 판 밖으로 안 나간다)
      const e = Math.min(c, GW - 1 - c);
      if (e < 2) h += (2 - e) * 0.35;
      if (r >= SEA_R) {
        S.wat[i] = 1;
        S.land[i] = baseH(r) + 0.02;
        h = S.land[i] - SEA_DEEP;
      }
      if (d.lake) {
        const [lc, lr, rx, ry] = d.lake, q = ((x - fx(lc)) / rx) ** 2 + ((y - lr - 0.5) / ry) ** 2;
        if (q < 1) {
          S.wat[i] = 2;
          S.land[i] = h + 0.02;
          h -= LAKE_DEEP;
          S.lakeN++;
        } else if (q < 1.8) h -= 0.25 * (1.8 - q);
      }
      S.G[i] = h;
    }
  for (const cr of d.crusts ?? []) {
    const [ax, ay, bx, by] = cr;
    for (let i = 0; i < N; i++) {
      if (S.wat[i]) continue;
      const r = (i / GW) | 0, c = i - r * GW;
      if (segDist(c + 0.5, r + 0.5, fx(ax), ay + 0.5, fx(bx), by + 0.5) < 0.8) (S.G[i] += 0.9), (S.rock[i] = 1);
    }
  }
  S.lakeLeft = S.lakeN;
}

function flow(S: Sim, E: Emit) {
  const G = S.G, Wl = S.Wl, L = S.L, wat = S.wat, k = S.k;
  // 분출
  const H = S.H;
  for (const e of S.erupts)
    if (S.t >= e.at && S.t < e.at + e.dur) {
      const vi = S.vents[e.v];
      L[vi] += e.rate;
      H[vi] += e.rate;
      S.out += e.rate;
      S.r0 = 0;
      if (S.r1 < 0) S.r1 = 0;
      if (S.t === e.at && E) E('erupt', vi, e.v);
    }
  let flux = 0;
  const ra = S.r0, rb = S.r1;
  if (rb >= 0) {
    const i0 = ra * GW, i1 = (rb + 1) * GW;
    for (let i = i0; i < i1; i++) {
      const l = L[i];
      if (l <= YIELD) continue;
      // 끈적한 용암: 두꺼운 만큼만 흐른다 (얇은 막은 그 자리에 남아 굳는다)
      const si = H[i] - TAU, ex = l - YIELD, kk = k * ex * (1 + DEEP * ex), kd = kk * DIAG, nb = NB[i];
      let fu = 0, fd = 0, fl = 0, fr = 0, fdl = 0, fdr = 0, ful = 0, fur = 0, x = 0;
      if (nb & 1 && (x = si - H[i - GW]) > 0) fu = kk * x;
      if (nb & 2 && (x = si - H[i + GW]) > 0) fd = kk * x;
      if (nb & 4 && (x = si - H[i - 1]) > 0) fl = kk * x;
      if (nb & 8 && (x = si - H[i + 1]) > 0) fr = kk * x;
      // 대각선으로도 흐른다 (비스듬한 벽을 따라 미끄러지듯)
      if ((nb & 6) === 6 && (x = si - H[i + GW - 1]) > 0) fdl = kd * x;
      if ((nb & 10) === 10 && (x = si - H[i + GW + 1]) > 0) fdr = kd * x;
      if ((nb & 5) === 5 && (x = si - H[i - GW - 1]) > 0) ful = kd * x;
      if ((nb & 9) === 9 && (x = si - H[i - GW + 1]) > 0) fur = kd * x;
      let tot = fu + fd + fl + fr + fdl + fdr + ful + fur;
      if (tot <= 0) continue;
      const lim = 0.9 * (l - YIELD);
      if (tot > lim) {
        const q = lim / tot;
        (fu *= q), (fd *= q), (fl *= q), (fr *= q), (fdl *= q), (fdr *= q), (ful *= q), (fur *= q), (tot = lim);
      }
      dL[i] -= tot;
      OUT[i] = tot;
      if (fu) dL[i - GW] += fu;
      if (fd) dL[i + GW] += fd;
      if (fl) dL[i - 1] += fl;
      if (fr) dL[i + 1] += fr;
      if (fdl) dL[i + GW - 1] += fdl;
      if (fdr) dL[i + GW + 1] += fdr;
      if (ful) dL[i - GW - 1] += ful;
      if (fur) dL[i - GW + 1] += fur;
      flux += tot;
    }
    const puff = S.t % 9 === 0;
    let n0 = -1, n1 = -1;
    const j0 = Math.max(0, ra - 1) * GW, j1 = Math.min(GH, rb + 2) * GW;
    for (let i = j0; i < j1; i++) {
      const d = dL[i];
      if (d === 0 && L[i] === 0) continue;
      const out = OUT[i];
      dL[i] = 0;
      OUT[i] = 0;
      let l = L[i] + d;
      if (wat[i]) {
        // 물에 든 용암: 치이익 — 바로 굳어 물칸을 메운다
        if (l > 0) {
          G[i] += l;
          S.crust[i] += l;
          if (wat[i] === 1) S.sea += l;
          else S.lake += l;
          if (E && puff && d > 0.004) E(wat[i] === 1 ? 'steam' : 'lakesteam', i, l);
          if (G[i] >= S.land[i]) {
            if (wat[i] === 2) S.lakeLeft--;
            G[i] = S.land[i];
            wat[i] = 0;
            if (E) E('newland', i);
          }
        }
        L[i] = 0;
        H[i] = G[i] + Wl[i];
        continue;
      }
      // 식기: 고여서 안 움직이는 용암만 굳어 땅이 된다 (얇으면 금방)
      if (l > 0 && d <= 0 && out < 0.004) {
        const cool = l < THIN ? l : COOL;
        l -= cool;
        G[i] += cool;
        S.crust[i] += cool;
      }
      if (l > 0) {
        L[i] = l;
        const r = (i / GW) | 0;
        if (n0 < 0) n0 = r;
        n1 = r;
      } else L[i] = 0;
      H[i] = G[i] + Wl[i] + L[i];
    }
    S.r0 = n0;
    S.r1 = n1;
  }
  S.flux = flux;
  // 집
  for (const h of S.houses) {
    if (!h.alive) continue;
    const i = h.r * GW + h.c;
    if (L[i] > BURN || (h.c > 0 && L[i - 1] > BURN_SIDE) || (h.c < GW - 1 && L[i + 1] > BURN_SIDE)) {
      h.alive = false;
      h.t = S.t;
      if (E) E('burn', i);
    } else if (h.near < 0 && (L[i - GW] > 0.03 || L[i - 1] > 0.03 || L[i + 1] > 0.03 || L[i - 2 * GW] > 0.03 || L[i - GW - 1] > 0.03 || L[i - GW + 1] > 0.03)) {
      h.near = S.t;
      if (E) E('near', i);
    }
  }
  // 녹는 벽: 붙은 용암이 깊을수록(고여 있을수록) 빨리 녹는다
  if (S.melt && rb >= 0)
    for (let i = Math.max(0, ra - 1) * GW, i1 = Math.min(GH, rb + 2) * GW; i < i1; i++) {
      if (Wl[i] <= 0) continue;
      const nb = NB[i];
      let m = L[i];
      if (nb & 1 && L[i - GW] > m) m = L[i - GW];
      if (nb & 2 && L[i + GW] > m) m = L[i + GW];
      if (nb & 4 && L[i - 1] > m) m = L[i - 1];
      if (nb & 8 && L[i + 1] > m) m = L[i + 1];
      if (m < MELT0) continue;
      Wl[i] -= MELT * (m - MELT0);
      if (Wl[i] < 0.1) {
        Wl[i] = 0;
        S.meltN++;
        if (E) E('melt', i);
      }
      S.H[i] = G[i] + Wl[i] + L[i];
    }
}

const lastEnd = (S: Sim) => {
  let a = 0;
  for (const e of S.erupts) if (e.at + e.dur > a) a = e.at + e.dur;
  return a;
};
/** 한 틱 (흐름은 두 틱에 한 번) */
function simTick(S: Sim, E: Emit) {
  if (!S.done && S.t % STEP === 0) {
    flow(S, E);
    if (S.t > lastEnd(S)) {
      S.calm = S.flux < 0.03 * FS ? S.calm + 1 : 0;
      if (S.calm >= CALM_N || S.t > lastEnd(S) + 60 * 5) S.done = true;
    }
  }
  S.t++;
}

function cloneSim(S: Sim): Sim {
  return {
    t: S.t, G: S.G.slice(), Wl: S.Wl.slice(), L: S.L.slice(), H: S.H.slice(), r0: S.r0, r1: S.r1, crust: S.crust.slice(), wat: S.wat.slice(), land: S.land, rock: S.rock,
    houses: S.houses.map((h) => ({ ...h })), erupts: S.erupts.map((e) => ({ ...e })), vents: S.vents, melt: S.melt, k: S.k,
    out: S.out, sea: S.sea, lake: S.lake, lakeN: S.lakeN, lakeLeft: S.lakeLeft, meltN: S.meltN, calm: S.calm, flux: S.flux, done: S.done,
  };
}

/** 돌벽 하나 세우기: (x, y) 둘레 WALL_R칸. 물·집 칸은 못 세운다. 세웠으면 true */
function raise(S: Sim, x: number, y: number): boolean {
  let any = false;
  const c0 = Math.max(0, Math.floor(x - WALL_R)), c1 = Math.min(GW - 1, Math.floor(x + WALL_R));
  const r0 = Math.max(0, Math.floor(y - WALL_R)), r1 = Math.min(SEA_R - 1, Math.floor(y + WALL_R));
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      if (Math.hypot(c + 0.5 - x, r + 0.5 - y) > WALL_R) continue;
      const i = r * GW + c;
      if (S.wat[i] || S.houses.some((h) => h.c === c && h.r === r)) continue;
      if (S.Wl[i] < WALLH) (S.H[i] += WALLH - S.Wl[i]), (S.Wl[i] = WALLH), (any = true);
    }
  return any;
}
const canWall = (x: number, y: number) => y > 0.3 && y < SEA_R - 0.2 && x > 0.3 && x < GW - 0.3;

// ───────────────────────────── 판 ─────────────────────────────
function newStage(s: LavaState) {
  const d = STAGES[s.stage], fl = s.flip[s.stage];
  const fx = (x: number) => (fl ? GW - 1 - x : x);
  const trng = mulberry32(s.seed * 31 + s.stage * 977 + 5);
  buildTerrain(s, d, fl, trng);
  s.vents = d.vents.map((c) => fx(c));
  // 판마다 집 자리를 조금씩 흔든다 (같은 판도 시드마다 조금 다르게)
  s.houses = d.houses.map(([c, r]) => {
    let cc = fx(c);
    const j = trng();
    if (j < 0.25 && cc > 2) cc--;
    else if (j > 0.75 && cc < GW - 3) cc++;
    return { c: cc, r, alive: true, t: -1, near: -1 };
  });
  for (const h of s.houses) {
    const i = h.r * GW + h.c;
    // 집 터는 살짝 돋운다 (얇은 용암은 옆으로 비켜 간다)
    s.G[i] += 0.03;
  }
  s.H = Float64Array.from(s.G);
  s.r0 = s.r1 = -1;
  s.erupts = d.erupt.map(([v, at, dur, rate]) => ({ v, at: Math.round((at * 60 + (s.stage ? 150 : 0)) / STEP) * STEP, dur: Math.round(dur * 60), rate: rate * FS, sea: false }));
  s.melt = !!d.melt;
  s.k = s.stage ? K : K1;
  s.t = 0;
  s.out = s.sea = s.lake = 0;
  s.meltN = 0;
  s.calm = 0;
  s.flux = 0;
  s.done = false;
  s.ink = s.inkMax = d.ink;
  s.used = 0;
  s.walls = 0;
  s.blocks = [];
  s.piles = (d.piles ?? []).map(([c, r]) => ({ c: fx(c), r, got: false }));
  s.phase = 'play';
  s.pt = 0;
  s.starOk = d.stars.map(() => false);
  s.strokeEnd = 0;
  s.strokes = 0;
  s.down = false;
  if (s.stage) see(s, d.key, '');
  // 첫 판: 화면이 뜨면 용암이 이미 흘러내려오고 있다
  if (s.stage === 0 && !s.again) for (let k = 0; k < 60; k++) simTick(s, null);
}

const alive = (S: Sim) => S.houses.filter((h) => h.alive).length;
function starNow(s: LavaState, st: Star): boolean {
  switch (st.k) {
    case 'keep': return alive(s) >= st.n;
    case 'all': return alive(s) === s.houses.length;
    case 'sea': return s.out > 0 && s.sea >= st.p * s.out;
    case 'lake': return s.lakeLeft <= Math.floor(s.lakeN * 0.5);
    case 'half': return s.used <= s.inkMax / 2;
    case 'nomelt': return s.meltN === 0;
    case 'piles': return s.piles.every((p) => p.got);
  }
}
export function starText(st: Star): string {
  switch (st.k) {
    case 'keep': return `집 ${st.n}채 지키기`;
    case 'all': return '집 다 지키기';
    case 'sea': return '용암을 바다까지 보내기';
    case 'lake': return '호수 반 메우기';
    case 'half': return '돌 반만 쓰기';
    case 'nomelt': return '벽 안 녹이기';
    case 'piles': return '돌무더기 다 줍기';
  }
}

function endStage(s: LavaState) {
  const d = STAGES[s.stage], keep = (d.stars[0] as { n: number }).n, ok = alive(s) >= keep;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.down = false;
  if (ok) {
    s.starOk = d.stars.map((st) => starNow(s, st));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + alive(s) * HOUSE_PTS + Math.max(0, s.ink) * INK_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.cheerT = s.tick;
    if (alive(s) === s.houses.length) s.wowN++;
    ev(s, 'clear', 0.5, 0.7, s.won ? '화산 마을 지킴! 🎉' : alive(s) === s.houses.length ? '모두 무사!' : '마을 지킴!');
  } else {
    s.hearts--;
    s.tries++;
    s.why = `집이 ${keep - alive(s)}채 모자라요`;
    ev(s, 'fail', 0.5, 0.7, s.why);
  }
}

function emitter(s: LavaState): Emit {
  return (kind, i, n) => {
    const r = (i / GW) | 0, c = i - r * GW;
    if (kind === 'erupt') {
      ev(s, 'erupt', c + 0.5, 0.2, '꿀렁!', n);
    } else if (kind === 'steam' || kind === 'lakesteam') {
      const e = s.erupts.find((q) => s.t >= q.at) ? [...s.erupts].reverse().find((q) => s.t >= q.at)! : null;
      if (kind === 'steam' && e && !e.sea) {
        e.sea = true;
        s.wowN++;
        s.cheerT = s.tick;
        ev(s, 'sea', c + 0.5, r + 0.5, '치이익!');
        see(s, 'sea', '♨ 바다에 닿은 용암은 검은 돌로 굳어 새 땅이 돼요');
      } else if (kind === 'lakesteam' && s.lakeHit !== s.stage * 100 + s.tries) {
        s.lakeHit = s.stage * 100 + s.tries;
        see(s, 'lakehit', '♨ 호수에 든 용암은 치이익 섬이 돼요');
        s.wowN++;
        s.cheerT = s.tick;
        ev(s, 'sea', c + 0.5, r + 0.5, '치이익!');
      } else ev(s, 'puff', c + 0.5, r + 0.5, undefined, n);
    } else if (kind === 'newland') {
      ev(s, 'land', c + 0.5, r + 0.5);
    } else if (kind === 'burn') {
      ev(s, 'burn', c + 0.5, r + 0.5, '앗뜨!');
      s.hurtT = s.tick;
      see(s, 'burn', '🔥 용암이 닿은 집은 타 버려요');
    } else if (kind === 'near') {
      ev(s, 'near', c + 0.5, r + 0.5, '으악!');
    } else if (kind === 'melt') {
      ev(s, 'melt', c + 0.5, r + 0.5, '스르륵');
      see(s, 'melted', '');
    }
  };
}

/** 손가락(화면 0~1) 처리: 누른 틱부터 뗀 틱까지 한 획. 지나간 자리에 BLOCK_D칸마다 돌 하나가 솟는다 */
function handlePointer(s: LavaState, p: { x: number; y: number } | null) {
  if (p && s.phase === 'play') {
    const q = toGrid(p);
    if (!s.down) {
      s.down = true;
      s.lx = q.x;
      s.ly = q.y;
      s.acc = BLOCK_D;
      s.strokeN = 0;
      if (s.firstTouch < 0) s.firstTouch = s.tick;
      if (s.ink <= 0) ev(s, 'nope', q.x, q.y, '돌이 없어요');
      placeAlong(s, q.x, q.y, true);
      return;
    }
    placeAlong(s, q.x, q.y, false);
    return;
  }
  if (!p && s.down) {
    s.down = false;
    if (s.strokeN > 0) {
      s.strokes++;
      s.strokeEnd = s.tick;
      see(s, 'wall', '');
    }
  }
}
function placeAlong(s: LavaState, x: number, y: number, first: boolean) {
  const dx = x - s.lx, dy = y - s.ly, len = Math.hypot(dx, dy);
  const steps = first ? 0 : Math.ceil(len / 0.1);
  const put = (px: number, py: number) => {
    if (s.ink <= 0 || !canWall(px, py)) return;
    // 돌무더기: 획이 지나가면 돌 +8
    for (const pl of s.piles)
      if (!pl.got && Math.hypot(pl.c + 0.5 - px, pl.r + 0.5 - py) < 1.4) {
        pl.got = true;
        s.ink += 8;
        s.inkMax += 8;
        ev(s, 'pile', pl.c + 0.5, pl.r + 0.5, '돌 +8!');
        see(s, 'gotpile', '');
      }
    if (!raise(s, px, py)) return;
    s.ink--;
    s.used++;
    s.strokeN++;
    s.blocks.push({ x: px, y: py, t: s.tick, i: Math.floor(py) * GW + Math.floor(px) });
    if (s.blocks.length > 260) s.blocks.shift();
    if (s.strokeN % 4 === 1) ev(s, 'thud', px, py, '쿵!', s.strokeN);
    if (s.strokeN === 6) {
      s.wowN++;
      ev(s, 'wallwow', px, py, '쿵쿵쿵!');
    }
    if (s.ink === 0) ev(s, 'out', px, py, '돌 끝!');
  };
  if (first) put(x, y);
  for (let k = 1; k <= steps; k++) {
    s.acc += len / steps;
    if (s.acc >= BLOCK_D) {
      s.acc -= BLOCK_D;
      put(s.lx + (dx * k) / steps, s.ly + (dy * k) / steps);
    }
  }
  s.lx = x;
  s.ly = y;
}

export const lavawall: GameDef<LavaState> & { wows(s: LavaState): number } = {
  id: 'lavawall',
  name: '🌋 용암 막는 마을',
  genes: ['divert', 'drawline'],
  twist: '쓱 그은 자리에 돌벽이 쿵쿵 솟고, 진짜처럼 흐르는 용암이 그 벽을 따라 굽이쳐 마을을 비켜 바다로 — 닿는 순간 치이익 김이 솟으며 새 땅이 된다',
  rules: [
    '쓱 그으면 그 자리에 돌벽이 솟아요. 용암은 벽을 따라 흘러요.',
    '분출이 끝날 때까지 집을 지켜요. 바다·호수에 닿은 용암은 굳어요.',
  ],
  controls: 'touch',
  hint: '쓱 그어 돌벽 세우기 / 화살표로 옮기고 스페이스를 누른 채 화살표',
  aspect: A,
  art: {
    concept: '화산 아래 작은 마을 — 꿀렁꿀렁 흘러내리는 용암과 돌벽, 바다에 닿으면 치이익 김',
    mood: '맑은 낮, 연둣빛 비탈에 빨간 지붕 집과 동글동글 주민들. 꼭대기 화산이 연기를 뿜으며 꿀렁 — 빛나는 주황 용암이 돌벽을 따라 굽이쳐 파란 바다에 닿으면 하얀 김 구름이 피어오른다.',
    palette: { bg: '#bfe6ff', ink: '#2b2118', muted: '#8a7a68', accent: '#ff8a2a', hot: '#ff4a2a', soft: '#fff3dc' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => alive(s),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const flip = STAGES.map(() => rng() < 0.5);
    const s = {
      rng, seed, tick: 0, stage: 0, phase: 'play', pt: 0, flip, ink: 0, inkMax: 0, used: 0, piles: [], blocks: [], walls: 0,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', dead: false, won: false, again: false, tries: 0,
      down: false, lx: 0, ly: 0, acc: 0, strokeN: 0, strokeEnd: 0, firstTouch: -1, strokes: 0,
      seen: new Set<string>(), newsQ: [], news: null, events: [], wowN: 0, cheerT: -999, hurtT: -999, lakeHit: -1,
    } as unknown as LavaState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.tick++;
    if (s.events.length && s.tick - s.events[0].t >= 120) s.events = s.events.filter((e) => s.tick - e.t < 120);
    handlePointer(s, inp.pointer ?? null);
    if (!s.news || s.tick - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.tick } : s.news;
    s.pt++;
    if (s.phase === 'result') {
      if (s.pt >= RESULT) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    simTick(s, emitter(s));
    if (s.done && !s.down) endStage(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
type Path = { pts: number[]; len: number; speed: number };
function mkPath(pts: number[], speed: number): Path {
  let len = 0;
  for (let k = 2; k < pts.length; k += 2) len += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  return { pts, len, speed };
}
function pathAt(p: Path, dist: number) {
  let left = Math.max(0, dist);
  for (let k = 2; k < p.pts.length; k += 2) {
    const ax = p.pts[k - 2], ay = p.pts[k - 1], bx = p.pts[k], by = p.pts[k + 1], l = Math.hypot(bx - ax, by - ay);
    if (left <= l || k === p.pts.length - 2) {
      const u = l > 0 ? Math.min(1, left / l) : 1;
      return { x: ax + (bx - ax) * u, y: ay + (by - ay) * u };
    }
    left -= l;
  }
  return { x: p.pts[0], y: p.pts[1] };
}
/** 격자 좌표 → 화면 포인터(0~1) */
const toScreen = (x: number, y: number) => ({ x: PX(x, y), y: PY(y) / A });

interface Drive { key: string; p: Path | null; t0: number; done: boolean; end: boolean; n: number }
function drive(m: Drive, s: LavaState): Input {
  if (!m.p || m.done) return NO;
  const tt = s.tick - m.t0;
  if (tt * m.p.speed >= m.p.len) {
    if (m.end) return (m.done = true), NO;
    m.end = true;
  }
  const q = pathAt(m.p, Math.min(m.p.len, tt * m.p.speed));
  return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
}
const SPEED = 0.4;

/** 획을 바로 세운 것처럼(같은 돌 놓기 규칙·돌무더기 줍기) 흉내 낸다 */
function applyPath(s: LavaState, p: Path): { S: Sim; used: number; piles: number } {
  const C = cloneSim(s);
  let used = 0, ink = s.ink, acc = BLOCK_D, piles = 0;
  const got = s.piles.map((q) => q.got);
  for (let d = 0; d <= p.len && ink > 0; d += 0.1) {
    acc += 0.1;
    if (acc < BLOCK_D) continue;
    acc -= BLOCK_D;
    const q = pathAt(p, d);
    if (!canWall(q.x, q.y)) continue;
    s.piles.forEach((pl, k) => {
      if (!got[k] && Math.hypot(pl.c + 0.5 - q.x, pl.r + 0.5 - q.y) < 1.4) (got[k] = true), (ink += 8), piles++;
    });
    if (raise(C, q.x, q.y)) used++, ink--;
  }
  return { S: C, used, piles };
}
function rollout(S: Sim, ticks: number) {
  for (let k = 0; k < ticks && !S.done; k++) simTick(S, null);
  return S;
}

const HORIZON = 60 * 30;
/** 판의 값: 지킨 집이 가장 크고, 별(바다·호수·안 녹임·돌 아낌·돌무더기)이 그다음 */
function value(s: LavaState, S: Sim, used: number, piles = 0) {
  const d = STAGES[s.stage];
  let v = alive(S) * 100 - used * 1.2;
  for (const st of d.stars) {
    if (st.k === 'sea') v += Math.min(1, S.sea / Math.max(1, st.p * S.out)) * 50;
    if (st.k === 'lake') v += Math.min(1, (1 - S.lakeLeft / Math.max(1, S.lakeN)) * 2) * 80;
    if (st.k === 'nomelt') v -= S.meltN * 6;
    if (st.k === 'half') v -= Math.max(0, s.used + used - s.inkMax / 2) * 5;
    if (st.k === 'piles') v += piles * 40;
  }
  if (!d.stars.some((x) => x.k === 'piles')) v += piles * 10;
  return v - S.meltN * 0.3;
}

/** 탈 집에서 거꾸로, 그 집으로 흘러온 용암 길을 위로 따라간다 */
function traceUp(s: LavaState, B: Sim, c0: number, r0: number): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  let c = c0;
  const gain = (i: number) => B.crust[i] - s.crust[i] + B.L[i];
  for (let r = r0 - 1; r >= 1 && out.length < 8; r--) {
    let bc = -1, bg = 0.015;
    for (let cc = Math.max(0, c - 1); cc <= Math.min(GW - 1, c + 1); cc++) {
      const g = gain(r * GW + cc) * (cc === c ? 1.1 : 1);
      if (g > bg) (bg = g), (bc = cc);
    }
    if (bc < 0) break;
    // 그 줄의 용암 폭 가운데
    let lo = bc, hi = bc;
    while (lo > 0 && gain(r * GW + lo - 1) > 0.015) lo--;
    while (hi < GW - 1 && gain(r * GW + hi + 1) > 0.015) hi++;
    c = bc;
    out.push({ x: (lo + hi + 1) / 2, y: r + 0.5 });
  }
  return out;
}

/** 강을 (x, y)에서 가로질러 side 쪽으로 내려가게 비스듬한 벽 */
function slant(x: number, y: number, side: number, ang: number, len: number, back = 0.4): Path {
  const ux = Math.cos(ang) * side, uy = Math.sin(ang);
  const ax = clampF(x - ux * len * back, 0.6, GW - 0.6), ay = clampF(y - uy * len * back, 0.8, SEA_R - 0.8);
  const bx = clampF(x + ux * len * (1 - back), 0.6, GW - 0.6), by = clampF(y + uy * len * (1 - back), 0.8, SEA_R - 0.8);
  return mkPath([ax, ay, bx, by], SPEED);
}

function candidates(s: LavaState, B: Sim, rng: Rng): Path[] {
  const out: Path[] = [];
  const burnt = B.houses.filter((h, k) => !h.alive && s.houses[k].alive).sort((a, b) => a.t - b.t);
  const len = Math.min(5 + rng() * 4, (s.ink + s.piles.filter((q) => !q.got).length * 8) * BLOCK_D);
  if (len < 2) return out;
  const spots: { x: number; y: number; to?: number }[] = [];
  if (burnt.length) {
    const tr = traceUp(s, B, burnt[0].c, burnt[0].r);
    const k0 = 1 + Math.floor(rng() * 2);
    for (const k of [k0, k0 + 2, k0 + 4]) if (tr[Math.min(k, tr.length - 1)]) spots.push(tr[Math.min(k, tr.length - 1)]);
  }
  if (STAGES[s.stage].lake && B.lakeLeft > Math.floor(B.lakeN * 0.5)) {
    // 호수: 호수 높이 조금 위에서 용암 길을 호수 쪽으로
    let lr = 0, lc = 0, n = 0;
    for (let i = 0; i < N; i++) if (s.wat[i] === 2) (lr += (i / GW) | 0), (lc += i % GW), n++;
    if (n) {
      lr /= n;
      lc /= n;
      const r = Math.max(1, Math.round(lr - 4));
      let sx = 0, sw = 0;
      for (let c = 0; c < GW; c++) {
        const i = r * GW + c, g = B.crust[i] - s.crust[i] + B.L[i];
        if (g > 0.02 && Math.abs(c - lc) > 2) (sx += (c + 0.5) * g), (sw += g);
      }
      if (sw > 0) spots.push({ x: sx / sw, y: r + 0.5, to: lc + 0.5 });
    }
  }
  const ang = 0.4 + rng() * 0.6;
  for (const q of spots)
    for (const side of q.to === undefined ? [-1, 1] : [Math.sign(q.to - q.x) || 1]) out.push(slant(q.x, q.y, side, ang, len));
  // 돌무더기: 무더기에서 시작해 용암 길을 가로지르게 (줍는 길)
  for (const pl of s.piles) {
    if (pl.got) continue;
    const q = spots[0];
    if (!q) continue;
    const px = pl.c + 0.5, py = pl.r + 0.5, dx = q.x - px, dy = Math.max(1, q.y - py), l = Math.hypot(dx, dy);
    if (l < 13) out.push(mkPath([px, py, clampF(q.x + (dx / l) * 2.5, 0.6, GW - 0.6), clampF(q.y + (dy / l) * 2.5, 0.8, SEA_R - 0.8)], SPEED));
  }
  return out;
}

function plan(s: LavaState, rng: Rng): Path | null {
  const base = rollout(cloneSim(s), HORIZON);
  const v0 = value(s, base, 0);
  const cs = candidates(s, base, rng);
  if (!cs.length) return null;
  // 1차: 처음 탈 집이 타던 때보다 조금 뒤까지만 흘려 보고, 좋은 둘만 끝까지
  let first = 1e9;
  for (const h of base.houses) if (!h.alive && h.t > s.t && h.t < first) first = h.t;
  const cut = first < 1e9 ? first - s.t + 480 : HORIZON;
  const tried: { p: Path; S: Sim; used: number; piles: number; v: number }[] = [];
  for (const p of cs) {
    const { S, used, piles } = applyPath(s, p);
    if (!used) continue;
    rollout(S, cut);
    tried.push({ p, S, used, piles, v: value(s, S, used, piles) });
  }
  tried.sort((x, y) => y.v - x.v);
  let best: Path | null = null, bv = v0 + 6;
  for (const c of tried.slice(0, 3)) {
    rollout(c.S, HORIZON);
    const v = value(s, c.S, c.used, c.piles);
    if (v > bv) (bv = v), (best = c.p);
  }
  return best;
}

const ready = (s: LavaState) => s.phase === 'play' && s.ink > 0 && !s.down && s.tick - s.strokeEnd > 20;

function strokeBot(name: string, pick: (s: LavaState, rng: Rng) => Path | null, gap = 50, tries = 99): Bot<LavaState> {
  const mem = new WeakMap<object, Drive & { next: number }>();
  return {
    name,
    act(s, rng) {
      let m = mem.get(s);
      if (m && !m.done) {
        if (s.phase !== 'play') m.done = true;
        else return drive(m, s);
      }
      if (!ready(s)) return NO;
      if (m && s.tick < m.next) return NO;
      // 같은 판·같은 돌 그대로면 다시 생각해도 같다 (흐름은 결정적) — 무언가 바뀔 때만 다시
      const key = `${s.stage}:${s.tries}:${s.used}:${s.ink}`;
      const n = m && !m.p && m.key === key ? m.n + 1 : 0;
      if (n >= tries) return NO;
      const p = pick(s, rng);
      mem.set(s, (m = { key, p, t0: s.tick, done: !p, end: false, n, next: s.tick + (p ? 10 : gap) }));
      return drive(m, s);
    },
  };
}

/** 잘하는 봇: 그대로 두면 탈 집을 같은 흐름으로 미리 보고, 그 위 용암 길에 비스듬한 후보 벽들을 세워 흘려 본 뒤 가장 좋은 것 */
export const lavawallSmart: Bot<LavaState> = strokeBot('용암 길잡이', (s, rng) => plan(s, rng), 100, 3);

/** 버릇 봇: 늘 아직 안 탄 가장 위쪽 집 바로 위에 가로로 짧게 */
const habitMem = new WeakMap<object, Set<string>>();
export const lavawallHabit: Bot<LavaState> = strokeBot('늘 집 바로 위에 가로로', (s) => {
  const hs = s.houses.filter((h) => h.alive);
  let done = habitMem.get(s);
  if (!done) habitMem.set(s, (done = new Set()));
  const h = hs.filter((q) => !done.has(`${s.stage}:${s.tries}:${q.c},${q.r}`)).sort((a, b) => a.r - b.r)[0];
  if (!h) return null;
  done.add(`${s.stage}:${s.tries}:${h.c},${h.r}`);
  const y = h.r - 0.6;
  return mkPath([h.c + 0.5 - 2, y, h.c + 0.5 + 2, y], SPEED);
}, 30);

/** 독립 버릇 봇: 늘 화산 바로 밑에 가로로 길게 (판마다 한 번) */
const habit2Mem = new WeakMap<object, string>();
export const lavawallHabit2: Bot<LavaState> = strokeBot('늘 화산 바로 밑에 가로로', (s) => {
  const key = `${s.stage}:${s.tries}`;
  if (habit2Mem.get(s) === key) return null;
  habit2Mem.set(s, key);
  const y = 2.2;
  return mkPath([2, y, GW - 2, y], SPEED);
}, 30);

/** 못하는 봇: 아무 데나 아무 쪽으로 쓱 (아무 때나) */
const dumbMem = new WeakMap<object, { next: number; p: Path | null; t0: number }>();
export const lavawallRandom: Bot<LavaState> = {
  name: '아무렇게나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.tick + 20 + Math.floor(rng() * 90), p: null, t0: 0 }));
    if (m.p) {
      const tt = s.tick - m.t0;
      if (tt * m.p.speed <= m.p.len) {
        const q = pathAt(m.p, tt * m.p.speed);
        return { tap: false, dir: 0, pointer: toScreen(q.x, q.y) };
      }
      m.p = null;
      m.next = s.tick + 40 + Math.floor(rng() * 140);
      return NO;
    }
    if (s.tick < m.next || s.phase !== 'play') return NO;
    const x = 1 + rng() * (GW - 2), y = 1 + rng() * (SEA_R - 2), a = rng() * Math.PI * 2, l = 2 + rng() * 8;
    const ex = clampF(x + Math.cos(a) * l, 0.5, GW - 0.5), ey = clampF(y + Math.sin(a) * l, 0.5, SEA_R - 0.5);
    m.p = mkPath([x, y, ex, ey], 0.2 + rng() * 0.4);
    m.t0 = s.tick;
    return { tap: false, dir: 0, pointer: toScreen(x, y) };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU2 = Math.PI * 2;
const hsh = (k: number) => {
  let x = (k * 2654435761) >>> 0;
  x = ((x ^ (x >>> 15)) * 2246822519) >>> 0;
  return ((x ^ (x >>> 13)) >>> 0) / 4294967296;
};
const ROOF = ['#e8553e', '#4a8fe0', '#f2b632', '#9a6bd6', '#3fb37a', '#ff8a5c'];
const SHIRT = ['#ff6b6b', '#4dabf7', '#ffd43b', '#b197fc', '#69db7c', '#ffa94d'];

interface Puff { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number; dark: boolean }
interface Look { puffs: Puff[]; ground: HTMLCanvasElement | null; key: string; demo: number; said: { x: number; y: number; t: number }[]; hit: Set<number>; hitT: number }
const looks = new WeakMap<object, Look>();
function look(s: LavaState): Look {
  let l = looks.get(s);
  if (!l) looks.set(s, (l = { puffs: [], ground: null, key: '', demo: 0, said: [], hit: new Set(), hitT: -99 }));
  return l;
}

/** 다음(또는 지금) 분출 */
function nextErupt(s: LavaState): { e: Erupt; inT: number } | null {
  let best: { e: Erupt; inT: number } | null = null;
  for (const e of s.erupts) {
    if (s.t >= e.at + e.dur) continue;
    const inT = e.at - s.t;
    if (!best || inT < best.inT) best = { e, inT };
  }
  return best;
}

/** 미리 보기: 분화구에서 가장 낮은 쪽으로 따라 내려가는 길 (벽을 그으면 바로 꺾인다) */
function previewPath(s: LavaState, vc: number): number[] {
  const pts: number[] = [vc + 0.5, 0.5];
  let c = vc, r = 0;
  const seen = new Set<number>();
  for (let k = 0; k < 40 && r < SEA_R; k++) {
    const i = r * GW + c;
    seen.add(i);
    let bi = -1, bh = s.H[i] - 0.001;
    for (const [dc, dr] of [[0, 1], [-1, 1], [1, 1], [-1, 0], [1, 0]]) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || cc >= GW || rr >= GH) continue;
      const j = rr * GW + cc;
      if (seen.has(j)) continue;
      const hh = s.wat[j] ? -9 : s.G[j] + s.Wl[j] + (dr ? 0 : 0.02);
      if (hh < bh) (bh = hh), (bi = j);
    }
    if (bi < 0) break;
    r = (bi / GW) | 0;
    c = bi - r * GW;
    pts.push(c + 0.5, r + 0.5);
    if (s.wat[bi]) break;
  }
  return pts;
}

function drawAll(ctx: C2, s: LavaState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.tick, d = STAGES[s.stage], lk = look(s);
  const R = (v: number) => v * w;
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  const cw = (y: number) => (scl(y - 0.5) * w) / GW, chh = CH * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    for (let k = 0; k < 6 && lk.said.some((q) => t - q.t < 30 && Math.abs(q.x - x) < w * 0.2 && Math.abs(q.y - y) < size + 2); k++) y -= size + 3;
    lk.said.push({ x, y, t });
    if (lk.said.length > 16) lk.said.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size * (w / 380));
  };
  const puff = (x: number, y: number, n: number, sp: number, r: number, dark = false) => {
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (hsh(t * 31 + k * 7 + lk.puffs.length) - 0.5) * 2.2, v = sp * (0.4 + hsh(t + k * 13));
      const life = 50 + hsh(k + t * 3) * 40;
      lk.puffs.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.3, r: r * (0.6 + hsh(k * 3 + t) * 0.8), life, max: life, dark });
    }
    if (lk.puffs.length > 260) lk.puffs.splice(0, lk.puffs.length - 260);
  };

  ctx.save();
  // 큰 순간엔 장면이 살짝 '쿵' 다가온다
  const zt = fx.memo.zoomT ?? -99, za = Math.max(0, 1 - (t - zt) / 16);
  if (za > 0) {
    const zs = 1 + 0.03 * za;
    ctx.translate(w / 2, R(0.7));
    ctx.scale(zs, zs);
    ctx.translate(-w / 2, -R(0.7));
  }
  fx.begin(ctx);

  // ── 하늘 · 먼 바다 수평선 없는 낮 하늘 ──
  const sky = ctx.createLinearGradient(0, 0, 0, R(0.34));
  sky.addColorStop(0, '#7cc8f7');
  sky.addColorStop(0.6, '#bfe6ff');
  sky.addColorStop(1, '#ffeacc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, R(0.36));
  // 해
  ctx.fillStyle = 'rgba(255,244,200,.55)';
  ctx.beginPath();
  ctx.arc(R(0.86), R(0.13), R(0.07), 0, TAU2);
  ctx.fill();
  ctx.fillStyle = '#fff6c8';
  ctx.beginPath();
  ctx.arc(R(0.86), R(0.13), R(0.042), 0, TAU2);
  ctx.fill();
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((k * 0.37 + t * 0.00012 * (1 + k * 0.4)) % 1.3) * w - R(0.15), cy = R(0.12 + k * 0.045);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [dx, dy, rr] of [[0, 0, 0.035], [0.035, -0.012, 0.028], [-0.035, -0.006, 0.026], [0.065, 0.004, 0.02]]) {
      ctx.beginPath();
      ctx.arc(cx + R(dx), cy + R(dy), R(rr), 0, TAU2);
      ctx.fill();
    }
  }
  // 먼 언덕
  ctx.fillStyle = '#a8d98a';
  ctx.beginPath();
  ctx.moveTo(0, R(0.3));
  for (let k = 0; k <= 20; k++) ctx.lineTo((k / 20) * w, R(0.26 + Math.sin(k * 0.9) * 0.012 + Math.sin(k * 2.3) * 0.006));
  ctx.lineTo(w, R(0.34));
  ctx.lineTo(0, R(0.34));
  ctx.fill();

  // ── 땅 (판마다 한 번 그려 둔다) ──
  const gkey = `${s.seed}:${s.stage}:${s.tries}:${w}`;
  if (lk.key !== gkey || !lk.ground) {
    lk.key = gkey;
    lk.ground = paintGround(s, w, h);
  }
  if (lk.ground) ctx.drawImage(lk.ground, 0, 0, w, h);
  // 비탈 위 끝을 덮는 가까운 언덕 능선
  ctx.fillStyle = '#93c763';
  ctx.beginPath();
  ctx.moveTo(0, SY(0) + R(0.012));
  for (let k = 0; k <= 24; k++) ctx.lineTo((k / 24) * w, SY(0) - R(0.012) + Math.sin(k * 1.3 + 0.5) * R(0.008) + Math.sin(k * 0.5) * R(0.01));
  ctx.lineTo(w, SY(0) + R(0.02));
  ctx.lineTo(0, SY(0) + R(0.02));
  ctx.fill();

  // ── 화산 (산자락이 비탈 꼭대기를 덮는다) ──
  drawVolcano(ctx, s, w, lk);

  // ── 굳은 용암 · 물 (바뀌는 땅) ──
  for (let r = 0; r < GH; r++)
    for (let c = 0; c < GW; c++) {
      const i = r * GW + c;
      const x0 = SX(c, r + 0.5), x1 = SX(c + 1, r + 0.5), y0 = SY(r), y1 = SY(r + 1);
      if (s.wat[i]) {
        // 물에 든 용암은 바닥부터 검게 차오른다
        const fill = 1 - (s.land[i] - s.G[i]) / (s.wat[i] === 1 ? SEA_DEEP : LAKE_DEEP);
        if (fill > 0.05) {
          ctx.fillStyle = `rgba(40,34,34,${Math.min(0.85, fill * 0.9)})`;
          ctx.beginPath();
          ctx.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.5 * Math.min(1, fill + 0.3), chh * 0.55 * Math.min(1, fill + 0.3), 0, 0, TAU2);
          ctx.fill();
        }
        continue;
      }
      const cr = s.crust[i];
      if (cr > 0.04 && s.L[i] < 0.05) {
        const a = Math.min(1, cr * 5), x = (x0 + x1) / 2, y = (y0 + y1) / 2;
        ctx.fillStyle = `rgba(58,50,47,${a})`;
        ctx.beginPath();
        ctx.ellipse(x, y, (x1 - x0) * 0.78, chh * 0.82, 0, 0, TAU2);
        ctx.fill();
        // 아직 뜨거운 틈
        const hh = hsh(i * 13 + 7);
        if (a > 0.6 && hh < 0.35) {
          ctx.strokeStyle = s.r1 >= 0 ? 'rgba(255,110,40,.6)' : 'rgba(130,118,110,.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x - (x1 - x0) * 0.3, y - chh * 0.2);
          ctx.lineTo(x + (hh - 0.2) * (x1 - x0) * 0.5, y + chh * 0.05);
          ctx.lineTo(x + (x1 - x0) * 0.25, y + chh * 0.25);
          ctx.stroke();
        }
      }
    }

  // ── 미리 보기: 다음 분출이 흘러갈 길 (점선 화살) ──
  const ne = nextErupt(s);
  if (s.phase === 'play' && ne && ne.inT > -40 && ne.inT < 60 * 7) {
    const pp = previewPath(s, s.vents[ne.e.v]);
    const a = ne.inT > 0 ? 0.85 : Math.max(0, 1 + ne.inT / 40);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255,120,40,.9)';
    ctx.lineWidth = R(0.009);
    ctx.lineCap = 'round';
    ctx.setLineDash([R(0.012), R(0.016)]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    for (let k = 0; k < pp.length; k += 2) {
      const x = SX(pp[k], pp[k + 1]), y = SY(pp[k + 1]);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // 화살촉
    const n = pp.length;
    if (n >= 4) {
      const ex = SX(pp[n - 2], pp[n - 1]), ey = SY(pp[n - 1]), px0 = SX(pp[n - 4], pp[n - 3]), py0 = SY(pp[n - 3]);
      const an = Math.atan2(ey - py0, ex - px0);
      ctx.fillStyle = 'rgba(255,120,40,.95)';
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(an) * R(0.02), ey + Math.sin(an) * R(0.02));
      ctx.lineTo(ex + Math.cos(an + 2.5) * R(0.022), ey + Math.sin(an + 2.5) * R(0.022));
      ctx.lineTo(ex + Math.cos(an - 2.5) * R(0.022), ey + Math.sin(an - 2.5) * R(0.022));
      ctx.fill();
    }
    ctx.restore();
  }

  // ── 용암 ──
  drawLava(ctx, s, w, t);

  // ── 깊이 순서: 나무 · 돌벽 · 돌무더기 · 집 · 주민 ──
  type It = { y: number; f: () => void };
  const items: It[] = [];
  // 나무 (땅 그림에 정해 둔 자리 — 용암이 닿으면 까맣게 탄다)
  for (let k = 0; k < 20; k++) {
    const c = Math.floor(hsh(k * 7 + s.stage * 101 + s.seed) * GW), r = 4 + Math.floor(hsh(k * 11 + s.stage * 37 + s.seed * 3) * (SEA_R - 5));
    const i = r * GW + c;
    if (s.houses.some((q) => Math.abs(q.c - c) <= 1 && Math.abs(q.r - r) <= 1) || s.piles.some((q) => Math.abs(q.c - c) <= 1 && Math.abs(q.r - r) <= 1)) continue;
    if (s.wat[i] || c < 1 || c > GW - 2 || s.Wl[i] > 0) continue;
    if (s.G[i] - s.crust[i] - (s.rock[i] ? 0.9 : 0) < baseH(r) - 0.12 || s.rock[i]) continue; // 골짜기엔 나무 없음 (용암 길이 잘 보이게)
    const burnt = s.crust[i] > 0.05 || s.L[i] > 0.05;
    const x = SX(c + 0.3 + hsh(k) * 0.4, r + 0.5), y = SY(r + 0.6);
    items.push({ y: r + 0.6, f: () => drawTree(ctx, x, y, R(0.026 + hsh(k * 5) * 0.01), burnt, t + k * 17) });
  }
  // 돌벽: 돌 하나하나가 쿵 솟는다
  for (const b of s.blocks) {
    const wl = s.Wl[b.i] ?? 0;
    const age = t - b.t;
    items.push({ y: b.y + 0.3, f: () => drawBlock(ctx, SX(b.x, b.y), SY(b.y), cw(b.y), chh, wl / WALLH, age, s.L[b.i] > 0.05 || (s.melt && wl < WALLH * 0.95)) });
  }
  for (const pl of s.piles) if (!pl.got) items.push({ y: pl.r + 0.5, f: () => drawPile(ctx, SX(pl.c + 0.5, pl.r + 0.5), SY(pl.r + 0.6), R(0.04), t) });
  s.houses.forEach((hs, k) => {
    items.push({ y: hs.r + 0.7, f: () => drawHouse(ctx, s, hs, k, SX(hs.c + 0.5, hs.r + 0.5), SY(hs.r + 0.75), R(0.084), t) });
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 용암이 돌벽에 처음 닿는 순간: 치익! 불꽃 (벽마다 한 번)
  if (lk.key) {
    for (const b of s.blocks) {
      if (lk.hit.has(b.t * 1000 + b.i)) continue;
      const i = b.i, r = (i / GW) | 0, c = i - r * GW;
      let m = 0;
      for (const j of [i - GW, i - 1, i + 1, i + GW]) if (j >= 0 && j < N && Math.abs((j % GW) - c) <= 1) m = Math.max(m, s.L[j]);
      if (m < 0.12) continue;
      lk.hit.add(b.t * 1000 + b.i);
      const x = SX(b.x, b.y), y = SY(b.y);
      fx.burst(x, y - R(0.015), '#ffb02e', 7, 3.2, 2);
      fx.burst(x, y - R(0.015), '#fff3b0', 3, 2.4, 1.6);
      puff(x, y - R(0.02), 1, 0.8, R(0.02));
      if (t - lk.hitT > 50) {
        lk.hitT = t;
        fx.ring(x, y, '#ffb02e', R(0.09), 4);
        fx.kick(3);
        say(x, y - R(0.07), '치익! 꺾였다!', '#ffd08a', 19);
      }
    }
  }
  // 주민 (집 둘레를 걷고, 용암이 오면 허둥지둥, 바다에 닿으면 지붕 위에서 환호)
  s.houses.forEach((hs, k) => drawFolk(ctx, s, hs, k, SX(hs.c + 0.5, hs.r + 0.5), SY(hs.r + 0.75), R(0.084), t));

  // ── 촌장 할아버지 (바닷가 선착장에서 마을을 지켜본다) ──
  drawChief(ctx, s, R(0.085), R(BAND - 0.006), R(0.13), t);

  // ── 지금 긋는 손가락 자리 ──
  if (s.down && s.phase === 'play') {
    const x = SX(s.lx, s.ly), y = SY(s.ly);
    ctx.strokeStyle = s.ink > 0 ? 'rgba(255,255,255,.9)' : 'rgba(255,120,120,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, R(0.035) + Math.sin(t * 0.4) * 1.5, 0, TAU2);
    ctx.stroke();
  }

  // ── 첫 판 시범: 손가락이 마을 위 용암 길을 비스듬히 쓱 ──
  if (s.stage === 0 && s.firstTouch < 0 && s.phase === 'play') {
    const hs = s.houses.reduce((a, b) => (b.r < a.r ? b : a));
    const pp = previewPath(s, s.vents[0]);
    let qx = hs.c + 0.5, qy = 7.5;
    for (let k = 0; k < pp.length; k += 2) if (pp[k + 1] >= 8) ((qx = pp[k]), (qy = pp[k + 1]), (k = pp.length));
    const side = qx < GW / 2 ? 1 : -1;
    const ax = qx - side * 2.6, ay = qy - 1.6, bx = qx + side * 3.6, by = qy + 2.2;
    const ph = (t % 150) / 110, u = Math.min(1, Math.max(0, ph * 1.15 - 0.1)), e = u * u * (3 - 2 * u);
    const gx = ax + (bx - ax) * e, gy = ay + (by - ay) * e;
    // 유령 돌
    ctx.globalAlpha = ph < 1.1 ? 0.55 : 0.25;
    for (let k = 0; k <= 12; k++) {
      const v = k / 12;
      if (v > e) break;
      const x = ax + (bx - ax) * v, y = ay + (by - ay) * v;
      drawBlock(ctx, SX(x, y), SY(y), cw(y), chh, 1, 99, false);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.setLineDash([R(0.016), R(0.012)]);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(SX(ax, ay), SY(ay));
    ctx.lineTo(SX(bx, by), SY(by));
    ctx.stroke();
    ctx.setLineDash([]);
    drawHand(ctx, SX(gx, gy) + R(0.02), SY(gy) + R(0.012), R(0.1), ph < 1.1);
  }

  // ── NEW 스포트라이트 ──
  if (s.stage > 0 && s.phase === 'play' && s.pt < 300 && s.used === 0) {
    let nx = GW / 2, ny = 1, nr = 0.12;
    if (d.key === 'two') (nx = (s.vents[0] + s.vents[1]) / 2 + 0.5), (ny = -3.4), (nr = 0.15);
    if (d.key === 'melt') {
      const hs = s.houses.reduce((a, b) => (b.r < a.r ? b : a));
      (nx = hs.c + 0.5), (ny = hs.r - 3), (nr = 0.13);
    }
    if (d.key === 'lake' || d.key === 'big') {
      let lc = 0, lr = 0, n = 0;
      for (let i = 0; i < N; i++) if (s.wat[i] === 2) (lc += i % GW), (lr += (i / GW) | 0), n++;
      if (n) (nx = lc / n + 0.5), (ny = lr / n + 0.5), (nr = 0.14);
    }
    if (d.key === 'piles' && s.piles.length) (nx = s.piles[0].c + 0.5), (ny = s.piles[0].r + 0.5), (nr = 0.09);
    const pu = 1 + 0.06 * Math.sin(t * 0.15), x = SX(nx, Math.max(0, ny)), y = SY(ny);
    ctx.save();
    ctx.strokeStyle = '#fff6a8';
    ctx.lineWidth = 3;
    ctx.setLineDash([R(0.018), R(0.012)]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.beginPath();
    ctx.ellipse(x, y, R(nr) * pu, R(nr * 0.7) * pu, 0, 0, TAU2);
    ctx.stroke();
    ctx.setLineDash([]);
    const ty = d.key === 'two' ? y + R(nr * 0.7) * pu + R(0.03) : y - R(nr * 0.7) * pu - R(0.03);
    ctx.fillStyle = '#ff4d4d';
    ctx.beginPath();
    ctx.roundRect(x - R(0.06), ty - R(0.022), R(0.12), R(0.044), R(0.022));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('NEW', x, ty + 1);
    ctx.restore();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = SX(e.x, e.y), y = SY(e.y);
    switch (e.kind) {
      case 'thud':
        fx.burst(x, y, '#8a7a66', 10, 2.6, 2.2);
        fx.burst(x, y - R(0.02), '#ffffff', 5, 2, 1.6);
        puff(x, y, 3, 0.9, R(0.018), true);
        fx.kick(2.6);
        if ((e.n ?? 0) <= 9) say(x, y - R(0.05), e.text!, '#ffffff', 15 + Math.min(8, e.n ?? 0));
        break;
      case 'wallwow':
        fx.burst(x, y, '#fff3c4', 22, 4, 3);
        fx.ring(x, y, '#ffffff', R(0.16), 5);
        fx.kick(7);
        fx.memo.zoomT = t;
        say(x, y - R(0.1), e.text!, '#ffe066', 26);
        break;
      case 'erupt': {
        const vx = SX(e.x, 0.5);
        fx.burst(R(0.5), R(0.13), '#ff8a2a', 26, 4.5, 3.2);
        fx.burst(R(0.5), R(0.13), '#ffe066', 12, 3.5, 2.4);
        fx.kick(6);
        puff(R(0.5), R(0.11), 8, 1.4, R(0.03), true);
        say(vx, R(0.2), e.text!, '#ffb36b', 22);
        break;
      }
      case 'sea':
        puff(x, y, 26, 2.6, R(0.045));
        fx.burst(x, y, '#ffffff', 26, 5, 3.2);
        fx.ring(x, y, '#e8f6ff', R(0.3), 7);
        fx.blink('#ffffff', 0.32);
        fx.kick(9);
        fx.memo.zoomT = t;
        say(x, y - R(0.14), e.text!, '#ffffff', 30);
        break;
      case 'puff':
        puff(x, y, 2, 1.2, R(0.026));
        break;
      case 'land':
        fx.burst(x, y, '#5a524c', 6, 2, 2);
        break;
      case 'burn':
        fx.burst(x, y - R(0.03), '#ff7a2a', 30, 4.6, 3.2);
        fx.burst(x, y - R(0.03), '#3a3030', 14, 3, 3);
        fx.ring(x, y, '#ff5a3a', R(0.14), 5);
        fx.kick(8);
        fx.blink('#ff7a4a', 0.16);
        puff(x, y - R(0.05), 8, 1.6, R(0.03), true);
        say(x, y - R(0.11), e.text!, '#ffd0a0', 26);
        break;
      case 'near':
        say(x + R(0.03), y - R(0.08), e.text!, '#ffffff', 16);
        break;
      case 'melt':
        fx.burst(x, y, '#ffb36b', 10, 2.4, 2.2);
        say(x, y - R(0.05), e.text!, '#ffd6a8', 15);
        break;
      case 'pile':
        fx.burst(x, y, '#d8cfc0', 22, 4, 3);
        fx.ring(x, y, '#ffffff', R(0.12), 5);
        fx.kick(4);
        say(x, y - R(0.08), e.text!, '#fff3b0', 24);
        break;
      case 'nope':
        say(x, y - R(0.06), e.text!, '#ffd6cc', 16);
        fx.kick(1.5);
        break;
      case 'out':
        say(x, y - R(0.07), e.text!, '#ffd6cc', 17);
        break;
      case 'clear':
        fx.burst(w * 0.3, R(0.7), '#ffe066', 44, 6.4, 3.4);
        fx.burst(w * 0.7, R(0.7), '#ff9ec4', 44, 6.4, 3.4);
        fx.burst(w * 0.5, R(0.85), '#ffffff', 40, 6, 3);
        fx.ring(w / 2, R(0.75), '#ffe066', R(0.5), 8);
        fx.blink('#fff6c8', 0.25);
        break;
      case 'fail':
        fx.kick(8);
        fx.blink(th.hot, 0.18);
        break;
    }
  }
  fx.memo.t = t;
  // 분출 중: 화산 둘레가 들썩
  if (ne && ne.inT <= 0 && t % 20 === 0) fx.kick(1.2);
  // 김 구름
  for (const p of lk.puffs) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy = p.vy * 0.97 - 0.02;
    p.r *= 1.012;
    p.life--;
    const a = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.dark ? `rgba(110,100,100,${a * 0.5})` : `rgba(255,255,255,${a * 0.8})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, TAU2);
    ctx.fill();
  }
  lk.puffs = lk.puffs.filter((p) => p.life > 0);
  // 빛 번짐 (용암 쪽이 따뜻하게) · 가장자리 그늘
  {
    const vg = ctx.createRadialGradient(w / 2, R(0.75), R(0.45), w / 2, R(0.75), R(0.95));
    vg.addColorStop(0, 'rgba(60,30,10,0)');
    vg.addColorStop(1, 'rgba(60,30,10,.18)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, R(0.085), w, R(BAND - 0.085));
  }
  ctx.restore();
  drawHud(ctx, s, w, h, th, font);
}

/** 판의 땅을 한 번 그려 둔다: 풀밭(골짜기는 짙게) · 바다 · 호수 · 모래 · 꽃 */
function paintGround(s: LavaState, w: number, h: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'), dpr = 2;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  const g = cv.getContext('2d')!;
  g.scale(dpr, dpr);
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w, R = (v: number) => v * w;
  const quad = (c: number, r: number, pad = 0.6) => {
    g.beginPath();
    g.moveTo(SX(c, r) - pad, SY(r) - pad);
    g.lineTo(SX(c + 1, r) + pad, SY(r) - pad);
    g.lineTo(SX(c + 1, r + 1) + pad, SY(r + 1) + pad);
    g.lineTo(SX(c, r + 1) - pad, SY(r + 1) + pad);
    g.closePath();
  };
  // 바다 (격자 아래 끝까지)
  const sea = g.createLinearGradient(0, SY(SEA_R - 0.5), 0, R(BAND));
  sea.addColorStop(0, '#5cc2ec');
  sea.addColorStop(1, '#2f86cc');
  g.fillStyle = sea;
  g.fillRect(0, SY(SEA_R - 0.6), w, R(BAND) - SY(SEA_R - 0.6) + 2);
  // 바탕 풀밭 (원근으로 비는 옆 귀퉁이까지)
  const base = g.createLinearGradient(0, SY(0), 0, SY(SEA_R));
  base.addColorStop(0, '#a3c86a');
  base.addColorStop(1, '#6fbf4f');
  g.fillStyle = base;
  g.fillRect(0, SY(0) - R(0.02), w, SY(SEA_R - 0.4) - SY(0) + R(0.02));
  // 풀밭 칸 (흐리게 번져 부드러운 언덕)
  g.save();
  g.filter = 'blur(4px)';
  for (let r = 0; r < SEA_R; r++)
    for (let c = 0; c < GW; c++) {
      const i = r * GW + c;
      if (s.wat[i]) continue;
      const rel = s.G[i] - baseH(r) - (s.rock[i] ? 0.9 : 0);
      const lit = (c > 0 ? s.G[i - 1] : s.G[i]) - (c < GW - 1 ? s.G[i + 1] : s.G[i]);
      const lum = 0.55 + rel * 0.75 + lit * 0.5;
      const gr = [Math.round(95 + lum * 70), Math.round(150 + lum * 60), Math.round(55 + lum * 35)];
      g.fillStyle = `rgb(${gr[0]},${gr[1]},${gr[2]})`;
      quad(c, r, 1.5);
      g.fill();
    }
  g.restore();
  // 깎은 풀밭 줄무늬 (원근 깊이)
  for (let r = 0; r < SEA_R; r += 2) {
    g.fillStyle = 'rgba(255,255,230,.05)';
    g.fillRect(0, SY(r), w, SY(r + 1) - SY(r));
  }
  // 해안 모래
  g.fillStyle = '#f3dfa2';
  g.beginPath();
  g.moveTo(0, SY(SEA_R) - R(0.012));
  for (let k = 0; k <= 20; k++) g.lineTo((k / 20) * w, SY(SEA_R) - R(0.004) + Math.sin(k * 1.7) * R(0.004));
  g.lineTo(w, SY(SEA_R) + R(0.01));
  g.lineTo(0, SY(SEA_R) + R(0.01));
  g.fill();
  // 호수 (둥근 물 · 물가 풀 · 연잎)
  const lk0 = STAGES[s.stage].lake;
  if (lk0) {
    const fl = s.flip[s.stage], lc = (fl ? GW - 1 - lk0[0] : lk0[0]) + 0.5, lr = lk0[1] + 0.5;
    const x = SX(lc, lr), y = SY(lr), rx = (lk0[2] / GW) * w * scl(lr), ry = lk0[3] * CH * w;
    g.fillStyle = '#5aa845';
    g.beginPath();
    g.ellipse(x, y + 2, rx + 6, ry + 5, 0, 0, Math.PI * 2);
    g.fill();
    const lg = g.createLinearGradient(0, y - ry, 0, y + ry);
    lg.addColorStop(0, '#3f9fd8');
    lg.addColorStop(1, '#79d0f2');
    g.fillStyle = lg;
    g.beginPath();
    g.ellipse(x, y, rx + 1, ry + 1, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(255,255,255,.7)';
    g.lineWidth = 2;
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.45)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      g.beginPath();
      g.moveTo(x - rx * 0.5 + k * rx * 0.3, y - ry * 0.3 + k * ry * 0.25);
      g.lineTo(x - rx * 0.25 + k * rx * 0.3, y - ry * 0.3 + k * ry * 0.25);
      g.stroke();
    }
    g.fillStyle = '#4cae5a';
    for (const [dx, dy] of [[0.55, 0.35], [-0.6, 0.1]]) {
      g.beginPath();
      g.ellipse(x + dx * rx, y + dy * ry, 5, 3, 0, 0.4, Math.PI * 2 - 0.2);
      g.lineTo(x + dx * rx, y + dy * ry);
      g.fill();
    }
  }
  // 지난 분출이 굳은 검은 둑 (울퉁불퉁 현무암 · 그림자)
  for (const pass of [0, 1, 2])
    for (let i = 0; i < N; i++) {
      if (s.wat[i] || !s.rock[i]) continue;
      const r = (i / GW) | 0, c = i - r * GW, x = SX(c + 0.5, r + 0.5), y = SY(r + 0.5), cw = (scl(r) * w) / GW, ch = CH * w;
      const hh = hsh(i * 17 + 3);
      g.fillStyle = pass === 0 ? 'rgba(30,40,20,.3)' : pass === 1 ? '#3e3633' : '#5c524c';
      g.beginPath();
      if (pass === 0) g.ellipse(x + 2, y + ch * 0.35, cw * 0.85, ch * 0.7, 0, 0, Math.PI * 2);
      else if (pass === 1) g.ellipse(x, y - ch * 0.15, cw * 0.82, ch * 0.85, 0, 0, Math.PI * 2);
      else g.ellipse(x - cw * 0.2 + hh * 3, y - ch * 0.45, cw * 0.32, ch * 0.22, 0, 0, Math.PI * 2);
      g.fill();
    }
  // 풀 포기 · 꽃 (작은 무늬)
  for (let k = 0; k < 160; k++) {
    const c = hsh(k * 3 + s.stage * 7) * GW, r = 2.5 + hsh(k * 5 + 1 + s.stage) * (SEA_R - 3);
    const i = Math.floor(r) * GW + Math.floor(c);
    if (s.wat[i] || s.rock[i]) continue;
    const x = SX(c, r), y = SY(r);
    if (k % 5 === 0) {
      g.fillStyle = ['#ffffff', '#ffe066', '#ff9ec4', '#c3a6ff'][k % 4];
      for (let p = 0; p < 4; p++) {
        g.beginPath();
        g.arc(x + Math.cos(p * 1.57) * 1.6, y + Math.sin(p * 1.57) * 1.1, 1.3, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffb000';
      g.beginPath();
      g.arc(x, y, 0.9, 0, Math.PI * 2);
      g.fill();
    } else {
      g.strokeStyle = 'rgba(60,120,40,.55)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x - 2, y);
      g.lineTo(x - 1, y - 3);
      g.moveTo(x, y);
      g.lineTo(x + 0.5, y - 4);
      g.moveTo(x + 2, y);
      g.lineTo(x + 2.5, y - 3);
      g.stroke();
    }
  }
  return cv;
}

function drawVolcano(ctx: C2, s: LavaState, w: number, lk: Look) {
  const R = (v: number) => v * w, t = s.tick;
  const cx = R(0.5), top = R(0.12), base = R(0.35), hw = R(0.42), cr = R(0.08);
  const cone = () => {
    ctx.beginPath();
    ctx.moveTo(cx - hw - R(0.06), base);
    ctx.quadraticCurveTo(cx - cr * 1.3, top + R(0.05), cx - cr, top);
    ctx.lineTo(cx + cr, top);
    ctx.quadraticCurveTo(cx + cr * 1.3, top + R(0.05), cx + hw + R(0.06), base);
    ctx.closePath();
  };
  // 산 몸통: 아래로 갈수록 비탈(땅)에 스며든다
  cone();
  const vg = ctx.createLinearGradient(0, top, 0, base);
  vg.addColorStop(0, '#6e5348');
  vg.addColorStop(0.62, '#8a6c5c');
  vg.addColorStop(1, 'rgba(150,130,90,0)');
  ctx.fillStyle = vg;
  ctx.fill();
  // 빛 (왼쪽 밝고 오른쪽 그늘)
  cone();
  const lg = ctx.createLinearGradient(cx - hw, 0, cx + hw, 0);
  lg.addColorStop(0, 'rgba(255,230,200,.18)');
  lg.addColorStop(0.5, 'rgba(255,230,200,0)');
  lg.addColorStop(1, 'rgba(40,20,10,.22)');
  ctx.fillStyle = lg;
  ctx.fill();
  // 능선 줄무늬 · 굳은 옛 용암 줄
  ctx.lineWidth = 2;
  for (let k = -3; k <= 3; k++) {
    ctx.strokeStyle = k % 2 ? 'rgba(255,240,220,.16)' : 'rgba(60,40,35,.22)';
    ctx.beginPath();
    ctx.moveTo(cx + k * cr * 0.28, top + R(0.008));
    ctx.quadraticCurveTo(cx + k * R(0.05), top + R(0.09), cx + k * R(0.1), base - R(0.03));
    ctx.stroke();
  }
  // 분화구
  const ne = nextErupt(s), active = !!ne && ne.inT <= 0;
  const glow = active ? 1 : ne && ne.inT < 120 ? 0.5 + 0.5 * Math.sin(t * 0.3) * 0.5 + (120 - ne.inT) / 240 : 0.35;
  const cg = ctx.createRadialGradient(cx, top, R(0.01), cx, top, R(0.16));
  cg.addColorStop(0, `rgba(255,170,60,${0.55 * glow})`);
  cg.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = cg;
  ctx.fillRect(cx - R(0.2), top - R(0.12), R(0.4), R(0.24));
  ctx.fillStyle = '#3a2824';
  ctx.beginPath();
  ctx.ellipse(cx, top, cr, R(0.018), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = active ? '#ffb02e' : `rgba(255,110,40,${0.5 + 0.4 * glow})`;
  ctx.beginPath();
  ctx.ellipse(cx, top + R(0.002), cr * 0.8, R(0.011), 0, 0, Math.PI * 2);
  ctx.fill();
  // 연기 (늘 피어오른다)
  if (t % 14 === 0) {
    lk.puffs.push({ x: cx + (hsh(t) - 0.5) * cr, y: top - R(0.01), vx: (hsh(t + 1) - 0.4) * 0.5, vy: -0.5, r: R(0.022), life: 110, max: 110, dark: true });
  }
  // 분출: 분화구에서 분화구 칸까지 흘러내리는 용암 줄기 + 솟는 방울
  for (const e of s.erupts) {
    const on = s.t >= e.at && s.t < e.at + e.dur + 40;
    if (!on) continue;
    const vc = s.vents[e.v], vx = PX(vc + 0.5, 0.5) * w, vy = PY(0.5) * w;
    const fade = s.t < e.at + e.dur ? 1 : Math.max(0, 1 - (s.t - e.at - e.dur) / 40);
    const sx = cx + Math.sign(vx - cx) * cr * 0.6;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.lineCap = 'round';
    for (const [col, wd] of [['#b3261e', 0.04], ['#ff5a1f', 0.028], ['#ffb02e', 0.013]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = R(wd);
      ctx.beginPath();
      ctx.moveTo(sx, top + R(0.004));
      ctx.quadraticCurveTo(sx + (vx - sx) * 0.3, (top + vy) / 2 + R(0.02), vx, vy);
      ctx.stroke();
    }
    // 흐르는 반짝임
    for (let k = 0; k < 4; k++) {
      const u = ((t * 0.02 + k / 4) % 1), qx = (1 - u) * (1 - u) * sx + 2 * u * (1 - u) * (sx + (vx - sx) * 0.3) + u * u * vx;
      const qy = (1 - u) * (1 - u) * top + 2 * u * (1 - u) * ((top + vy) / 2 + R(0.02)) + u * u * vy;
      ctx.fillStyle = '#ffe9a0';
      ctx.beginPath();
      ctx.arc(qx, qy, R(0.006), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (s.t < e.at + e.dur) {
      // 솟는 불방울
      for (let k = 0; k < 6; k++) {
        const ph = ((t + k * 9) % 40) / 40, a = (hsh(k + Math.floor((t + k * 9) / 40) * 7) - 0.5) * 1.4;
        const bx = cx + Math.sin(a) * ph * R(0.08), by = top - Math.sin(ph * Math.PI) * R(0.07) * (0.6 + hsh(k) * 0.6);
        ctx.fillStyle = k % 2 ? '#ffb02e' : '#ff6a2a';
        ctx.beginPath();
        ctx.arc(bx, by, R(0.008) * (1 - ph * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  // 다음 분출 예고: 화산 위 시계 + 어느 쪽으로
  if (ne && ne.inT > 0 && s.phase === 'play') {
    const sec = Math.ceil(ne.inT / 60), vc = s.vents[ne.e.v], side = s.vents.length > 1 ? (vc + 0.5 < GW / 2 ? -1 : 1) : 0;
    const bx = cx + (side || 1) * R(0.17), by = top + R(0.025), pr = 1 - (ne.inT % 60) / 60;
    ctx.fillStyle = 'rgba(60,30,20,.85)';
    ctx.beginPath();
    ctx.arc(bx, by, R(0.034), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff9a3a';
    ctx.lineWidth = R(0.007);
    ctx.beginPath();
    ctx.arc(bx, by, R(0.034), -Math.PI / 2, -Math.PI / 2 + pr * Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(R(0.036))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sec > 9 ? '…' : String(sec), bx, by + 1);
    if (side) {
      // 이쪽으로 흘러요 화살
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath();
      ctx.moveTo(bx + side * R(0.05), by + R(0.03));
      ctx.lineTo(bx + side * R(0.02), by + R(0.045));
      ctx.lineTo(bx + side * R(0.03), by + R(0.02));
      ctx.fill();
    }
  }
}

function drawLava(ctx: C2, s: LavaState, w: number, t: number) {
  const SX = (x: number, y: number) => PX(x, y) * w, SY = (y: number) => PY(y) * w;
  const cwr = (r: number) => (scl(r) * w) / GW, chh = CH * w;
  const L = s.L;
  // 빛 번짐
  ctx.save();
  for (let i = 0; i < N; i++) {
    if (L[i] < 0.03) continue;
    const r = (i / GW) | 0, c = i - r * GW, x = SX(c + 0.5, r + 0.5), y = SY(r + 0.5), rr = cwr(r) * 1.25;
    ctx.fillStyle = 'rgba(255,120,40,.10)';
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU2);
    ctx.fill();
  }
  // 몸통: 가장자리(검붉은) → 주황 → 노란 속
  for (const [col, k, extra, min] of [['#8f2418', 0.98, 1.2, 0.03], ['#e2441a', 0.9, 0, 0.03], ['#ff7a22', 0.86, 0, 0.14], ['#ffa634', 0.78, 0, 0.32], ['#ffcf55', 0.6, 0, 0.6]] as [string, number, number, number][]) {
    ctx.fillStyle = col;
    for (let i = 0; i < N; i++) {
      const l = L[i];
      if (l < min) continue;
      const r = (i / GW) | 0, c = i - r * GW, x = SX(c + 0.5, r + 0.5), y = SY(r + 0.5);
      const sz = Math.min(1, 0.7 + (l - min) * 2), wob = 1 + 0.06 * Math.sin(t * 0.09 + i * 1.7);
      ctx.beginPath();
      ctx.ellipse(x, y, cwr(r) * k * sz * wob + extra, chh * k * 1.1 * sz * wob + extra, 0, 0, TAU2);
      ctx.fill();
    }
  }
  // 반짝이는 속 · 꿀렁 거품 · 식은 껍질 조각
  for (let i = 0; i < N; i++) {
    const l = L[i];
    if (l < 0.1) continue;
    const r = (i / GW) | 0, c = i - r * GW, x = SX(c + 0.5, r + 0.5), y = SY(r + 0.5);
    const hh = hsh(i * 7);
    // 흐르는 쪽으로 미끄러지는 밝은 줄 (내리막 = 아래)
    if (hh < 0.45 && l > 0.15) {
      const ph = (t * 0.012 + hh * 5) % 1, dy = (ph - 0.5) * chh * 1.2;
      ctx.strokeStyle = `rgba(255,232,140,${0.75 * Math.sin(ph * Math.PI)})`;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + (hash2(i) - 0.5) * cwr(r) * 0.6, y + dy - chh * 0.25);
      ctx.lineTo(x + (hash2(i) - 0.5) * cwr(r) * 0.6, y + dy + chh * 0.2);
      ctx.stroke();
    }
    // 꿀렁 거품
    const ph2 = (t * 0.02 + hh * 7) % 1;
    if (ph2 < 0.2 && l > 0.25 && hh > 0.6) {
      ctx.fillStyle = `rgba(255,220,120,${1 - ph2 * 5})`;
      ctx.beginPath();
      ctx.arc(x + (hh - 0.8) * 8, y - ph2 * 6, 1.5 + ph2 * 8, 0, TAU2);
      ctx.fill();
    }
    if (hh > 0.8 && l < 0.4) {
      ctx.fillStyle = 'rgba(70,30,20,.5)';
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(t * 0.02 + hh * 9) * 3, y + Math.cos(t * 0.02 + hh * 3) * 2, cwr(r) * 0.14, chh * 0.1, hh * 3, 0, TAU2);
      ctx.fill();
    }
  }
  ctx.restore();
}
const hash2 = (k: number) => hsh(k * 131 + 17);

function drawBlock(ctx: C2, x: number, y: number, cw: number, ch: number, hgt: number, age: number, hot: boolean) {
  if (hgt <= 0.02) return;
  const s0 = 0.9, bw = cw * s0, bd = ch * s0, rise = age < 10 ? 1 - Math.pow(1 - age / 10, 3) : 1;
  const drop = age < 6 ? (1 - age / 6) * ch * 2.2 : 0, bounce = age >= 6 && age < 14 ? Math.sin(((age - 6) / 8) * Math.PI) * ch * 0.25 : 0;
  const hh = ch * 1.1 * Math.min(1, hgt) * rise;
  const yb = y + bd * 0.35 - drop - bounce;
  // 그림자
  ctx.fillStyle = 'rgba(40,30,20,.25)';
  ctx.beginPath();
  ctx.ellipse(x + 1.5, y + bd * 0.4, bw * 0.55, bd * 0.38, 0, 0, TAU2);
  ctx.fill();
  // 앞면
  ctx.fillStyle = hot ? '#b06a50' : '#a39684';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, yb - hh, bw, hh, 2);
  ctx.fill();
  // 윗면
  ctx.fillStyle = hot ? '#ffb07a' : '#e2d9c8';
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, yb - hh - bd * 0.7, bw, bd * 0.75, 3);
  ctx.fill();
  ctx.strokeStyle = hot ? 'rgba(255,90,30,.8)' : 'rgba(90,78,64,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x - bw / 2, yb - hh - bd * 0.7, bw, hh + bd * 0.7, 3);
  ctx.stroke();
  // 돌결
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.3, yb - hh - bd * 0.45);
  ctx.lineTo(x + bw * 0.05, yb - hh - bd * 0.5);
  ctx.stroke();
}

function drawTree(ctx: C2, x: number, y: number, r: number, burnt: boolean, ph: number) {
  ctx.fillStyle = 'rgba(30,60,20,.25)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y + r * 0.1, r * 0.9, r * 0.35, 0, 0, TAU2);
  ctx.fill();
  ctx.fillStyle = burnt ? '#2a2220' : '#8a5a3a';
  ctx.fillRect(x - r * 0.12, y - r * 0.9, r * 0.24, r * 0.95);
  if (burnt) {
    ctx.strokeStyle = '#2a2220';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.7);
    ctx.lineTo(x - r * 0.4, y - r * 1.2);
    ctx.moveTo(x, y - r * 0.6);
    ctx.lineTo(x + r * 0.35, y - r * 1.1);
    ctx.stroke();
    return;
  }
  const sw = Math.sin(ph * 0.04) * r * 0.06;
  ctx.fillStyle = '#3f9a4a';
  ctx.beginPath();
  ctx.arc(x + sw, y - r * 1.2, r * 0.8, 0, TAU2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,70,30,.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#5cbf5a';
  ctx.beginPath();
  ctx.arc(x - r * 0.18 + sw, y - r * 1.38, r * 0.5, 0, TAU2);
  ctx.fill();
}

function drawPile(ctx: C2, x: number, y: number, r: number, t: number) {
  const b = Math.sin(t * 0.1) * 2;
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.3 * Math.sin(t * 0.15)})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.3, r * 0.6, 0, 0, TAU2);
  ctx.stroke();
  for (const [dx, dy, rr] of [[-0.45, 0, 0.42], [0.42, 0.05, 0.4], [0, -0.32, 0.45], [-0.1, 0.15, 0.38]]) {
    ctx.fillStyle = '#a39684';
    ctx.beginPath();
    ctx.ellipse(x + dx * r, y + dy * r - r * 0.25, rr * r, rr * r * 0.8, 0, 0, TAU2);
    ctx.fill();
    ctx.fillStyle = '#e2d9c8';
    ctx.beginPath();
    ctx.ellipse(x + dx * r - rr * r * 0.2, y + dy * r - r * 0.35, rr * r * 0.55, rr * r * 0.4, 0, 0, TAU2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(13, Math.round(r * 0.9))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(60,40,20,.7)';
  ctx.strokeText('+8', x, y - r * 1.3 + b);
  ctx.fillText('+8', x, y - r * 1.3 + b);
}

function drawHouse(ctx: C2, s: LavaState, hs: House, k: number, x: number, y: number, sz: number, t: number) {
  const roof = ROOF[(k + s.stage) % ROOF.length];
  const bw = sz, bh = sz * 0.5, rh = sz * 0.42;
  const burnAge = hs.alive ? -1 : s.t - hs.t;
  // 그림자
  ctx.fillStyle = 'rgba(30,40,20,.3)';
  ctx.beginPath();
  ctx.ellipse(x + sz * 0.08, y + sz * 0.02, bw * 0.62, sz * 0.16, 0, 0, TAU2);
  ctx.fill();
  if (!hs.alive) {
    // 탄 집: 까만 뼈대 + 불꽃(처음 몇 초) + 연기
    ctx.fillStyle = '#2b2422';
    ctx.fillRect(x - bw / 2, y - bh, bw, bh);
    ctx.strokeStyle = '#1a1412';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - bw / 2, y - bh);
    ctx.lineTo(x - bw * 0.1, y - bh - rh * 0.8);
    ctx.lineTo(x + bw * 0.3, y - bh - rh * 0.2);
    ctx.stroke();
    if (burnAge >= 0 && burnAge < 200) {
      for (let f = 0; f < 4; f++) {
        const fh = sz * (0.35 + 0.2 * Math.sin(t * 0.4 + f * 2)), fx0 = x + (f - 1.5) * bw * 0.22;
        ctx.fillStyle = f % 2 ? '#ffb02e' : '#ff5a1f';
        ctx.beginPath();
        ctx.moveTo(fx0 - sz * 0.08, y - bh * 0.4);
        ctx.quadraticCurveTo(fx0, y - bh - fh, fx0 + sz * 0.08, y - bh * 0.4);
        ctx.fill();
      }
    }
    return;
  }
  const scare = hs.near >= 0 && s.phase === 'play' ? Math.sin(t * 0.8) * 1.2 : 0;
  // 벽
  ctx.fillStyle = '#fff1d6';
  ctx.fillRect(x - bw / 2 + scare, y - bh, bw, bh);
  ctx.fillStyle = '#ead6b0';
  ctx.fillRect(x + bw * 0.18 + scare, y - bh, bw * 0.32, bh);
  ctx.strokeStyle = '#6b4a30';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x - bw / 2 + scare, y - bh, bw, bh);
  // 문 · 창
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath();
  ctx.roundRect(x - bw * 0.12 + scare, y - bh * 0.62, bw * 0.2, bh * 0.62, [3, 3, 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#7fd0ff';
  ctx.fillRect(x - bw * 0.4 + scare, y - bh * 0.7, bw * 0.18, bh * 0.3);
  ctx.fillRect(x + bw * 0.24 + scare, y - bh * 0.7, bw * 0.16, bh * 0.3);
  // 지붕
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.62 + scare, y - bh + 1);
  ctx.lineTo(x - bw * 0.1 + scare, y - bh - rh);
  ctx.lineTo(x + bw * 0.62 + scare, y - bh - rh * 0.6);
  ctx.lineTo(x + bw * 0.62 + scare, y - bh + 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a3424';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.62 + scare, y - bh + 1);
  ctx.lineTo(x - bw * 0.1 + scare, y - bh - rh);
  ctx.lineTo(x - bw * 0.02 + scare, y - bh - rh * 0.9);
  ctx.lineTo(x - bw * 0.48 + scare, y - bh + 1);
  ctx.fill();
  // 굴뚝 연기
  ctx.fillStyle = '#9a7a6a';
  ctx.fillRect(x + bw * 0.28 + scare, y - bh - rh * 0.85, bw * 0.12, rh * 0.45);
  for (let p = 0; p < 3; p++) {
    const ph = ((t * 0.012 + p / 3 + k * 0.13) % 1);
    ctx.fillStyle = `rgba(255,255,255,${0.55 * (1 - ph)})`;
    ctx.beginPath();
    ctx.arc(x + bw * 0.34 + ph * sz * 0.2, y - bh - rh * 0.9 - ph * sz * 0.5, sz * (0.05 + ph * 0.07), 0, TAU2);
    ctx.fill();
  }
}

/** 주민: 동글동글한 몸 + 눈 · 겁나면 허둥지둥 · 환호하면 지붕 위에서 폴짝 · 집이 타면 엉덩이에 불 붙고 뛰어다님 */
function drawFolk(ctx: C2, s: LavaState, hs: House, k: number, hx: number, hy: number, sz: number, t: number) {
  const r = sz * 0.19, shirt = SHIRT[(k + s.stage * 2) % SHIRT.length];
  const cheer = t - s.cheerT < 150 || (s.phase === 'result' && s.ok);
  let x = hx + sz * 0.55, y = hy, jump = 0, mood: 'calm' | 'scared' | 'happy' | 'fire' = 'calm';
  if (!hs.alive) {
    const age = s.t - hs.t;
    if (age < 400 && age >= 0) {
      mood = 'fire';
      x = hx + Math.sin(age * 0.09) * sz * 1.1;
      y = hy + Math.cos(age * 0.13) * sz * 0.35 + sz * 0.15;
      jump = Math.abs(Math.sin(age * 0.5)) * r * 0.8;
    } else {
      mood = 'scared';
      x = hx + sz * 0.7;
      y = hy + sz * 0.1;
    }
  } else if (cheer) {
    mood = 'happy';
    x = hx - sz * 0.05;
    y = hy - sz * 0.5 - sz * 0.42 * 0.8;
    jump = Math.abs(Math.sin((t + k * 9) * 0.2)) * r * 1.6;
  } else if (hs.near >= 0 && s.phase === 'play') {
    mood = 'scared';
    x = hx + Math.sin((t + k * 13) * 0.25) * sz * 0.6;
    jump = Math.abs(Math.sin((t + k * 13) * 0.5)) * r * 0.7;
  } else {
    x = hx + sz * 0.55 + Math.sin((t + k * 40) * 0.015) * sz * 0.35;
    jump = Math.abs(Math.sin((t + k * 7) * 0.12)) * r * 0.25;
  }
  // 그림자
  if (mood !== 'happy') {
    ctx.fillStyle = 'rgba(30,40,20,.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.9, r * 0.35, 0, 0, TAU2);
    ctx.fill();
  }
  const by = y - jump;
  // 몸
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.ellipse(x, by - r * 0.8, r * 0.75, r * 0.85, 0, 0, TAU2);
  ctx.fill();
  // 머리
  ctx.fillStyle = '#ffd9b3';
  ctx.beginPath();
  ctx.arc(x, by - r * 2, r * 0.72, 0, TAU2);
  ctx.fill();
  // 팔
  ctx.strokeStyle = '#ffd9b3';
  ctx.lineWidth = Math.max(1.5, r * 0.28);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy' || mood === 'scared' || mood === 'fire') {
    const wv = Math.sin(t * 0.6) * r * 0.3;
    ctx.moveTo(x - r * 0.6, by - r * 1.1);
    ctx.lineTo(x - r * 1.1, by - r * 2.1 + wv);
    ctx.moveTo(x + r * 0.6, by - r * 1.1);
    ctx.lineTo(x + r * 1.1, by - r * 2.1 - wv);
  } else {
    ctx.moveTo(x - r * 0.6, by - r * 1.0);
    ctx.lineTo(x - r * 0.9, by - r * 0.4);
    ctx.moveTo(x + r * 0.6, by - r * 1.0);
    ctx.lineTo(x + r * 0.9, by - r * 0.4);
  }
  ctx.stroke();
  // 얼굴
  ctx.fillStyle = '#2b2118';
  if (mood === 'scared' || mood === 'fire') {
    ctx.beginPath();
    ctx.arc(x - r * 0.25, by - r * 2.05, r * 0.14, 0, TAU2);
    ctx.arc(x + r * 0.25, by - r * 2.05, r * 0.14, 0, TAU2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x, by - r * 1.72, r * 0.16, r * 0.2, 0, 0, TAU2);
    ctx.fill();
    // 땀
    ctx.fillStyle = '#7fd0ff';
    ctx.beginPath();
    ctx.arc(x + r * 0.8, by - r * 2.4, r * 0.18, 0, TAU2);
    ctx.fill();
  } else {
    ctx.fillRect(x - r * 0.32, by - r * 2.1, r * 0.13, r * 0.2);
    ctx.fillRect(x + r * 0.2, by - r * 2.1, r * 0.13, r * 0.2);
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, by - r * 1.85, r * (mood === 'happy' ? 0.3 : 0.2), 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 엉덩이 불
  if (mood === 'fire') {
    const fl = r * (0.9 + 0.4 * Math.sin(t * 0.7));
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, by - r * 0.3);
    ctx.quadraticCurveTo(x - r * 1.2, by - r * 0.6 - fl, x - r * 0.1, by - r * 0.9);
    ctx.fill();
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.4, by - r * 0.4);
    ctx.quadraticCurveTo(x - r * 0.9, by - r * 0.5 - fl * 0.6, x - r * 0.15, by - r * 0.75);
    ctx.fill();
  }
}

/** 촌장 할아버지: 평소엔 빙그레 · 용암이 다가오면 볼을 감싸고 덜덜 · 집이 타면 펄쩍 '앗!' · 바다에 닿거나 지키면 두 팔 들고 폴짝 · 지면 어질어질 */
function drawChief(ctx: C2, s: LavaState, x: number, y: number, sz: number, t: number) {
  const near = s.phase === 'play' && s.houses.some((h) => h.alive && h.near >= 0);
  const hurt = s.tick - s.hurtT < 90, cheer = s.tick - s.cheerT < 150 || (s.phase === 'result' && s.ok);
  const sad = s.phase === 'result' && !s.ok;
  const mood = sad ? 'sad' : hurt ? 'hurt' : cheer ? 'happy' : near ? 'worry' : 'calm';
  let jump = 0, shake = 0;
  if (mood === 'happy') jump = Math.abs(Math.sin(t * 0.18)) * sz * 0.12;
  if (mood === 'hurt') jump = Math.max(0, Math.sin(((s.tick - s.hurtT) / 90) * Math.PI)) * sz * 0.25;
  if (mood === 'worry') shake = Math.sin(t * 1.3) * sz * 0.015;
  const r = sz * 0.5, cx = x + shake, by = y - jump;
  // 선착장 나무판
  ctx.fillStyle = '#b07a48';
  ctx.beginPath();
  ctx.roundRect(x - sz * 0.62, y - sz * 0.04, sz * 1.24, sz * 0.12, 3);
  ctx.fill();
  ctx.strokeStyle = '#6e4a2a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#6e4a2a';
  ctx.fillRect(x - sz * 0.5, y + sz * 0.08, sz * 0.08, sz * 0.14);
  ctx.fillRect(x + sz * 0.42, y + sz * 0.08, sz * 0.08, sz * 0.14);
  // 그림자
  ctx.fillStyle = 'rgba(40,30,20,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.8 * (1 - jump / sz), r * 0.18, 0, 0, TAU2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#3b2616';
  // 몸 (파란 멜빵바지)
  ctx.fillStyle = '#4a8fe0';
  ctx.beginPath();
  ctx.ellipse(cx, by - r * 0.62, r * 0.62, r * 0.62, 0, 0, TAU2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(cx - r * 0.25, by - r * 0.85, r * 0.07, 0, TAU2);
  ctx.arc(cx + r * 0.25, by - r * 0.85, r * 0.07, 0, TAU2);
  ctx.fill();
  // 팔
  ctx.strokeStyle = '#ffd9b3';
  ctx.lineWidth = r * 0.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 'happy') {
    const wv = Math.sin(t * 0.5) * r * 0.15;
    ctx.moveTo(cx - r * 0.5, by - r * 0.9);
    ctx.lineTo(cx - r * 0.95, by - r * 1.75 + wv);
    ctx.moveTo(cx + r * 0.5, by - r * 0.9);
    ctx.lineTo(cx + r * 0.95, by - r * 1.75 - wv);
  } else if (mood === 'worry' || mood === 'hurt') {
    ctx.moveTo(cx - r * 0.5, by - r * 0.9);
    ctx.lineTo(cx - r * 0.55, by - r * 1.45);
    ctx.moveTo(cx + r * 0.5, by - r * 0.9);
    ctx.lineTo(cx + r * 0.55, by - r * 1.45);
  } else {
    ctx.moveTo(cx - r * 0.5, by - r * 0.85);
    ctx.lineTo(cx - r * 0.75, by - r * 0.35);
    ctx.moveTo(cx + r * 0.5, by - r * 0.85);
    ctx.lineTo(cx + r * 0.75, by - r * 0.35);
  }
  ctx.stroke();
  // 머리
  const hy = by - r * 1.5;
  ctx.fillStyle = '#ffd9b3';
  ctx.strokeStyle = '#3b2616';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, hy, r * 0.55, 0, TAU2);
  ctx.fill();
  ctx.stroke();
  // 흰 수염
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.45, hy + r * 0.05);
  ctx.quadraticCurveTo(cx, hy + r * (mood === 'hurt' ? 0.75 : 0.9), cx + r * 0.45, hy + r * 0.05);
  ctx.quadraticCurveTo(cx, hy + r * 0.35, cx - r * 0.45, hy + r * 0.05);
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.stroke();
  // 안전모 (빨강)
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.arc(cx, hy - r * 0.12, r * 0.52, Math.PI, 0);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillRect(cx - r * 0.66, hy - r * 0.16, r * 1.32, r * 0.1);
  ctx.strokeRect(cx - r * 0.66, hy - r * 0.16, r * 1.32, r * 0.1);
  // 얼굴
  ctx.fillStyle = '#2b2118';
  if (mood === 'sad') {
    ctx.strokeStyle = '#2b2118';
    ctx.lineWidth = 1.5;
    for (const dx of [-0.2, 0.2]) {
      ctx.beginPath();
      ctx.moveTo(cx + r * (dx - 0.08), hy - r * 0.02);
      ctx.lineTo(cx + r * (dx + 0.08), hy + r * 0.1);
      ctx.moveTo(cx + r * (dx + 0.08), hy - r * 0.02);
      ctx.lineTo(cx + r * (dx - 0.08), hy + r * 0.1);
      ctx.stroke();
    }
    // 어질어질 별
    for (let k = 0; k < 3; k++) {
      const a = t * 0.08 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffd84a';
      star5(ctx, cx + Math.cos(a) * r * 0.7, hy - r * 0.75 + Math.sin(a) * r * 0.2, r * 0.13);
      ctx.fill();
    }
  } else if (mood === 'worry' || mood === 'hurt') {
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, hy + r * 0.02, r * 0.09, 0, TAU2);
    ctx.arc(cx + r * 0.2, hy + r * 0.02, r * 0.09, 0, TAU2);
    ctx.fill();
    ctx.fillStyle = '#7a2a1a';
    ctx.beginPath();
    ctx.ellipse(cx, hy + r * 0.28, r * 0.1, r * (mood === 'hurt' ? 0.16 : 0.1), 0, 0, TAU2);
    ctx.fill();
    ctx.fillStyle = '#7fd0ff';
    ctx.beginPath();
    ctx.arc(cx + r * 0.55, hy - r * 0.2 + ((t % 30) / 30) * r * 0.3, r * 0.09, 0, TAU2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, hy + r * 0.02, r * 0.07, 0, TAU2);
    ctx.arc(cx + r * 0.2, hy + r * 0.02, r * 0.07, 0, TAU2);
    ctx.fill();
    ctx.fillStyle = '#ff9e9e';
    ctx.beginPath();
    ctx.arc(cx - r * 0.34, hy + r * 0.15, r * 0.08, 0, TAU2);
    ctx.arc(cx + r * 0.34, hy + r * 0.15, r * 0.08, 0, TAU2);
    ctx.fill();
  }
  // 말풍선
  const txt = mood === 'happy' ? '만세!' : mood === 'hurt' ? '앗뜨!' : mood === 'worry' ? '어어…' : mood === 'sad' ? '어질…' : '';
  if (txt) {
    ctx.font = `900 ${Math.max(12, Math.round(sz * 0.26))}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width + sz * 0.16, bx = cx + r * 0.6, byy = hy - r * 1.15;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b2616';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(bx, byy - sz * 0.15, tw, sz * 0.3, sz * 0.14);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = mood === 'hurt' ? '#e8402a' : '#3b2616';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx + sz * 0.08, byy + 1);
  }
}

function drawHand(ctx: C2, x: number, y: number, sz: number, press: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-sz * 0.13, -sz * 0.05, sz * 0.26, sz * 0.62, sz * 0.13);
  ctx.roundRect(-sz * 0.34, sz * 0.38, sz * 0.68, sz * 0.5, sz * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-sz * 0.11, sz * 0.36, sz * 0.22, sz * 0.08);
  if (press) {
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -sz * 0.08, sz * 0.22, 0, TAU2);
    ctx.stroke();
  }
  ctx.restore();
}

function star5(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawHud(ctx: C2, s: LavaState, w: number, h: number, th: Theme, font: (sz: number, wgt?: number) => void) {
  const R = (v: number) => v * w, d = STAGES[s.stage], t = s.tick;
  // ═════════════ 위 띠 ═════════════
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(70,36,24,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🌋 ${s.stage + 1}번째 마을`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = '#f0c9a8';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 띠
  if (s.news && s.tick - s.news.t < NEWS_T) {
    const age = s.tick - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20);
    ctx.globalAlpha = a;
    font(0.034, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = R(s.stage === 0 && s.firstTouch < 0 ? 1.12 : BAND - 0.035);
    ctx.fillStyle = 'rgba(70,36,24,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    const keep = (d.stars[0] as { n: number }).n;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '화산 마을 지킴! 🎉' : alive(s) === s.houses.length ? '모두 무사!' : '마을 지킴!'), (sub = `지킨 집 ${alive(s)}/${s.houses.length}${s.ink > 0 ? ` · 남은 돌 +${s.ink * INK_PTS}점` : ''}`), (col = '#ffd84a');
      else (head = `앗뜨… ${s.why}`), (sub = s.hearts > 0 ? '하트 −1 · 이 마을 다시' : '끝 — 그래도 주민들은 무사히 피했어요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && s.used === 0) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 마을` : `${s.stage + 1}번째 마을`;
      sub = `집 ${keep}채 지키기 · 돌 ${d.ink}개`;
      nw = d.news;
    }
    if (head && !(s.stage === 0 && s.phase === 'play' && !s.again)) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = R(s.phase === 'result' ? 0.62 : 0.5), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(70,36,24,.92)';
      ctx.beginPath();
      ctx.roundRect(-R(0.44), -R(0.055), R(0.88), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const nS = s.starOk.length, hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * nS) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < nS; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star5(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          const fx = juice(s);
          if (got && (fx.memo['star' + k] ?? -1) < s.tick - ag) (fx.memo['star' + k] = s.tick - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.82));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.82));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.034, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.84));
      }
      ctx.restore();
    }
  }
  // 첫 판 안내 (크게)
  if (s.stage === 0 && s.firstTouch < 0 && s.phase === 'play') {
    const bob = Math.sin(t * 0.12) * R(0.006);
    ctx.save();
    font(0.05, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = '👆 쓱 그어 돌벽을 세워요!', tw = ctx.measureText(tx).width + R(0.07), yy = R(1.2) + bob, xc = R(0.585);
    ctx.fillStyle = 'rgba(70,36,24,.88)';
    ctx.beginPath();
    ctx.roundRect(xc - tw / 2, yy - R(0.042), tw, R(0.084), R(0.042));
    ctx.fill();
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, xc, yy + 1);
    ctx.restore();
  }
  // ═════════════ 아래 띠 ═════════════
  const ty = BAND, tb = h / w;
  const g = ctx.createLinearGradient(0, R(ty), 0, R(tb));
  g.addColorStop(0, 'rgba(84,44,28,.97)');
  g.addColorStop(1, 'rgba(60,30,18,.98)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, R(ty), w, R(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  // 돌 남은 수: 막대 + 수
  const r1 = R(ty + 0.032);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffeacc';
  font(0.038, 900);
  ctx.fillText('돌', R(0.03), r1);
  const bx0 = R(0.1), bw = R(0.34);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(bx0, r1 - R(0.016), bw, R(0.032), R(0.016));
  ctx.fill();
  const fr = Math.max(0, Math.min(1, s.ink / Math.max(1, s.inkMax)));
  if (fr > 0) {
    const bg = ctx.createLinearGradient(bx0, 0, bx0 + bw, 0);
    bg.addColorStop(0, '#cfc4b0');
    bg.addColorStop(1, '#f2ead8');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(bx0, r1 - R(0.016), Math.max(R(0.032), bw * fr), R(0.032), R(0.016));
    ctx.fill();
  }
  if (d.stars.some((x) => x.k === 'half')) {
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx0 + bw * 0.5, r1 - R(0.022));
    ctx.lineTo(bx0 + bw * 0.5, r1 + R(0.022));
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  font(0.034, 900);
  ctx.fillText(`${Math.max(0, s.ink)}`, bx0 + bw + R(0.015), r1);
  // 집: 작은 집 그림 (지킨 · 탄)
  const hx0 = R(0.6), hstep = Math.min(R(0.065), R(0.37) / Math.max(1, s.houses.length));
  s.houses.forEach((hs, k) => {
    const x = hx0 + hstep * (k + 0.5), y = r1 + R(0.008);
    ctx.fillStyle = hs.alive ? '#fff1d6' : '#3a302c';
    ctx.fillRect(x - R(0.017), y - R(0.014), R(0.034), R(0.02));
    ctx.fillStyle = hs.alive ? ROOF[(k + s.stage) % ROOF.length] : '#1e1816';
    ctx.beginPath();
    ctx.moveTo(x - R(0.022), y - R(0.012));
    ctx.lineTo(x, y - R(0.03));
    ctx.lineTo(x + R(0.022), y - R(0.012));
    ctx.fill();
    if (!hs.alive) {
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath();
      ctx.arc(x, y - R(0.006), R(0.007), 0, TAU2);
      ctx.fill();
    }
  });
  // 별 조건 (한 줄씩)
  const rows = d.stars.length;
  for (let k = 0; k < rows; k++) {
    const st = d.stars[k], ry = R(ty + 0.076 + k * 0.042);
    const now = starNow(s, st);
    const ok = s.phase === 'result' && s.ok ? s.starOk[k] : now && st.k !== 'keep' && st.k !== 'all' && st.k !== 'nomelt' && st.k !== 'half';
    const lost = (st.k === 'keep' || st.k === 'all' || st.k === 'nomelt') && !now;
    star5(ctx, R(0.05), ry, R(0.017));
    ctx.fillStyle = ok ? '#ffd43b' : lost ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.035, 800);
    ctx.fillStyle = ok ? '#fff1c4' : lost ? 'rgba(255,255,255,.4)' : '#ffeacc';
    let label = starText(st);
    if (st.k === 'lake') label += ` (${Math.round((1 - s.lakeLeft / Math.max(1, s.lakeN)) * 100)}%)`;
    ctx.fillText(label, R(0.085), ry + 1, R(0.72));
    ctx.textAlign = 'right';
    if (lost) {
      ctx.fillStyle = '#ffb3a8';
      ctx.fillText('놓침', w - R(0.03), ry + 1);
    } else if (ok) {
      ctx.fillStyle = '#ffd84a';
      ctx.fillText('✓', w - R(0.03), ry + 1);
    }
  }
  // 안내 한 줄
  let hint = d.hint;
  if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 마을을 지켰어요!' : `★ ${s.got}개! 다음 마을엔 새것이 나와요`) : '용암 길 위쪽에 비스듬히 길게 그어 봐요';
  else if (s.down) hint = s.ink > 0 ? '그대로 쓱— 떼면 끝' : '돌을 다 썼어요';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  font(0.034, 900);
  ctx.fillText(hint, w / 2, R(ty + 0.076 + rows * 0.042 + 0.006), w - R(0.05));
}
