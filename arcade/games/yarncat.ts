/**
 * 고양이 털실 바구니 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 털실 정렬 × 이어진 실 × 가리키기(톡).
 * 뼈대(요즘 잘 팔리는 털실 정렬): 거실 바닥에 색 털실 뭉치가 흩어져 있다. 아래 선반에 색 바구니가 줄지어 오고 앞의 2개만 열려 있다.
 *   뭉치를 톡 → 고양이가 앞발로 탁! 같은 색 열린 바구니 쪽으로 데굴데굴 굴러가 바닥 끝에서 툭 떨어져 들어간다.
 *   맞는 바구니가 없으면 대기 칸으로. 대기 칸이 꽉 차면 실패(하트 -1, 그 판 다시). 바구니가 차면 고양이가 들고 가고 다음 바구니가 온다.
 * 비틀기(이어진 실 — 연속 물리): 뭉치끼리 실(최대 길이가 있는 밧줄)로 이어져 있다. 굴러가는 뭉치가 실을 팽팽하게 당기면
 *   이어진 뭉치가 질질 끌려온다(위치 기반 고정 간격 물리 · 마찰 · 부딪힘). 바닥 끝을 넘은 뭉치는 무엇이든 정렬되므로
 *   끌려온 같은 색은 줄줄이 같은 바구니로(한 번에 꽉!), 다른 색은 엉뚱하게 대기 칸으로 간다. 짧은 실은 끝까지 딸려 오고, 긴 실은 바닥 끝 앞에서 멈춘다.
 * 미리 보기: 누르고 있는 동안 굴러갈 길(점선) · 끌려올 뭉치의 최종 자리(고스트) · 들어갈 바구니/대기 칸 · 끊길 실이 보이고, 떼면 실행.
 * 판(방 청소) 8개: 목표 = 바구니 모두 채우기. 별 = 1판은 '모두 채우기'만, 2판부터 '대기 칸에 N개까지만', 3판부터 '톡 N번 안에 끝내기'.
 * 펼쳐짐(판마다 새것 하나, 하는 일이 바뀐다): 1판 실 끌기(같은 색 줄줄이) → 2판 섞인 실·대기 칸(무엇을 먼저)
 *   → 3판 의자 다리(실이 걸려 팽팽하면 툭 — 일부러 걸어 떼어 놓기) → 4판 소파 밑(발이 안 닿는 뭉치를 실로 끌어내기)
 *   → 5판 점보 뭉치(안 끌려서 당기던 쪽이 멈춤 — 점보부터) → 6판 가위(톡 하면 닿은 실 싹둑 — 미리 끊기)
 *   → 7판 반질반질 마루(끌려온 뭉치가 멀리 미끄러져 들어감) → 8판 대청소(전부).
 * 웃음: 고양이가 뭉치를 탁 치고, 굴러가는 실을 고개로 쫓고, 바구니가 차면 우쭐, 대기 칸이 차면 식은땀, 실패하면 실에 칭칭 감겨 버둥.
 *   선반 위 금붕어는 줄줄이 들어갈 때 놀라 뻐끔, 걸레받이 구멍의 생쥐는 뭉치가 굴러오면 쏙 숨는다.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.64;
/** 바닥(물리 평면): 가로 0~1, 세로 0~FH(아래 끝 = 바닥 끝, 넘으면 떨어진다). 화면 y = FY0 + y·KY */
const FH = 0.86, FY0 = 0.27, KY = 0.93;
/** 뭉치 반지름 · 점보 뭉치 · 의자 다리 */
const BR = 0.042, HR = 0.058, PR = 0.024;
/** 톡 한 뭉치가 굴러가는 속도(틱당) · 점보 · 속도 붙는 정도 */
const V0 = 0.026, VH = 0.014, ACC = 0.3;
/** 바닥 마찰(틱마다 속도에 곱함) · 반질반질 마루 */
const FR = 0.86, FR_WAX = 0.968;
/** 굴러가는(떨어지는) 뭉치의 질량 배수(역질량 × DRV) · 점보 역질량 · 반복 · 잠드는 속도 */
const DRV = 0.25, WH = 0.06, ITER = 4, SLEEP = 0.0005;
/** 바구니 한 개에 3뭉치 · 열린 바구니 2개 */
const CAP = 3, BO = 2;
/** 바닥 끝에서 바구니 입구 · 대기 칸까지(바닥 좌표) */
const MOUTH_DY = 0.088, TRAY_DY = 0.262;
/** 팽팽한 실이 의자 다리에 걸리면 이 틱 뒤 툭 · 굴러가다 막혀 멈추는 틱 · 한 번 톡의 최대 길이 */
const SNAG_T = 4, STALL_T = 12, MOVE_MAX = 420;
/** 가위가 자르는 반지름 · 가위 수 id */
const SCI_R = 0.06, SCI = 100;
/** 손가락 닿는 반지름 */
const HIT = 0.07;
const RESULT_OK = 210, RESULT_FAIL = 170, NEWS_T = 190, CARD_T = 150;
const STAR_PTS = 100, FULL_PTS = 20, WIN_PTS = 200;

// ───────────────────────────── 판(방) ─────────────────────────────
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string; spot: string;
  n: number; cols: number; ropes: number; slots: number; stars: number;
  legs?: boolean; sofa?: boolean; heavy?: number; sci?: boolean; wax?: boolean;
}
export const STAGES: StageDef[] = [
  { key: 'yarn', name: '첫 바구니', emoji: '🧶', news: '🧶 실로 이어진 뭉치는 같이 끌려와요', tip: '같은 색끼리 이어져 있으면 한 번에 쏙쏙!', spot: '', n: 6, cols: 2, ropes: 4, slots: 5, stars: 1 },
  { key: 'tray', name: '섞인 실', emoji: '🧺', news: '🧺 다른 색이 끌려오면 대기 칸으로 가요', tip: '누르고 있으면 끌려올 뭉치가 보여요 — 먼저 보낼 것을 골라요', spot: '대기 칸 — 꽉 차면 실패!', n: 9, cols: 3, ropes: 4, slots: 4, stars: 2 },
  { key: 'legs', name: '의자 다리', emoji: '🪑', news: '🪑 의자 다리에 걸린 실은 팽팽해지면 툭!', tip: '다리에 걸린 실은 끊겨요 — 다른 색을 떼어 놓을 때 써요', spot: '의자 다리에 걸린 실은 툭 끊겨요', n: 12, cols: 4, ropes: 6, slots: 4, stars: 3, legs: true },
  { key: 'sofa', name: '소파 밑', emoji: '🛋️', news: '🛋️ 소파 밑 뭉치는 발이 안 닿아요 — 실로 끌어내요', tip: '소파 밑 뭉치는 이어진 뭉치를 굴려서 꺼내요', spot: '소파 밑 — 실로만 꺼낼 수 있어요', n: 12, cols: 4, ropes: 6, slots: 4, stars: 3, sofa: true },
  { key: 'heavy', name: '점보 뭉치', emoji: '🪨', news: '🪨 점보 뭉치는 안 끌려요 — 당기던 뭉치가 멈춰요', tip: '점보 뭉치를 먼저 굴리면 이어진 것을 다 끌고 가요', spot: '점보 뭉치 — 무거워서 안 끌려요', n: 12, cols: 4, ropes: 6, slots: 4, stars: 3, heavy: 2 },
  { key: 'sci', name: '가위', emoji: '✂️', news: '✂️ 가위를 톡 하면 닿은 실이 싹둑!', tip: '다른 색이 딸려 올 실은 가위로 미리 싹둑', spot: '가위를 톡 → 닿은 실 싹둑', n: 15, cols: 5, ropes: 8, slots: 4, stars: 3, sci: true },
  { key: 'wax', name: '반질반질 마루', emoji: '✨', news: '✨ 반질반질 마루 — 끌려온 뭉치가 멀리 미끄러져요', tip: '마루 위에선 끌려온 뭉치도 주르륵 미끄러져 들어가요', spot: '반질반질 마루 — 멀리 미끄러져요', n: 15, cols: 5, ropes: 7, slots: 4, stars: 3, wax: true },
  { key: 'all', name: '대청소 날', emoji: '🏠', news: '🏠 마지막 방 — 다리·점보·가위·마루 다 나와요!', tip: '어느 뭉치부터 굴릴지 — 누르고 있으면 다 보여요', spot: '', n: 15, cols: 5, ropes: 8, slots: 4, stars: 3, legs: true, heavy: 1, sci: true, wax: true },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
/** 뭉치. st: 0 바닥 · 1 떨어지는 중(목적지로) · 2 바구니 · 3 대기 칸 */
interface Ball {
  x: number; y: number; px: number; py: number; vx: number; vy: number;
  r: number; col: number; hv: boolean; st: number;
  /** 굴러가는(떨어지는) 중 — 목적지(tx,ty)로 끌려간다 */
  drv: boolean; tx: number; ty: number;
  /** 떨어질 곳: 0~BO-1 열린 바구니 칸 · -1 대기 칸 */
  dst: number; aw: boolean; slow: number;
}
/** 실(밧줄): 길이 len보다 멀어지면 당긴다. on=false면 끊김 */
interface Rope { a: number; b: number; len: number; on: boolean; k: number }
export interface Level {
  si: number; B0: Ball[]; R0: Rope[]; posts: number[][]; sofa: number[] | null; sc: number[] | null; wax: number[] | null;
  queue: number[]; slots: number; par: number; trayMax: number; nStars: number; sol: number[]; pal: number[];
}
type RE =
  | { k: 'roll'; i: number }
  | { k: 'fall'; i: number; dst: number; lead: boolean }
  | { k: 'land'; i: number; dst: number; col: number }
  | { k: 'full'; slot: number; col: number; one: boolean; next: number }
  | { k: 'pull'; slot: number; col: number; idx: number }
  | { k: 'snap'; x: number; y: number; leg: boolean }
  | { k: 'stall'; i: number }
  | { k: 'cut'; n: number }
  | { k: 'drag'; i: number };
export interface Sim {
  B: Ball[]; R: Rope[]; L: Level;
  qi: number; open: number[]; cnt: number[]; add: number[]; tray: number[];
  taps: number; trayIn: number; full1: number; done: number; chain: number; best: number;
  moving: boolean; mt: number; lead: number; fail: number; clear: boolean; pulled: boolean;
}

const mouthX = (k: number) => (k === 0 ? 0.15 : 0.39);
const slotX = (L: Level, i: number) => 0.5 + (i - (L.slots - 1) / 2) * 0.125;
const underSofa = (L: Level, b: Ball) => !!L.sofa && b.y < L.sofa[2] && b.x > L.sofa[0] && b.x < L.sofa[1];
const onWax = (L: Level, b: Ball) => !!L.wax && b.x > L.wax[0] && b.x < L.wax[2] && b.y > L.wax[1] && b.y < L.wax[3];
const invM = (b: Ball) => (b.hv ? WH : 1) * (b.drv ? DRV : 1);
const tappable = (L: Level, b: Ball) => b.st === 0 && !underSofa(L, b);

function newSim(L: Level): Sim {
  const open: number[] = [], cnt: number[] = [], add: number[] = [];
  for (let k = 0; k < BO; k++) open.push(k < L.queue.length ? L.queue[k] : -1), cnt.push(0), add.push(0);
  return {
    B: L.B0.map((b) => ({ ...b })), R: L.R0.map((r) => ({ ...r })), L,
    qi: Math.min(BO, L.queue.length), open, cnt, add, tray: [],
    taps: 0, trayIn: 0, full1: 0, done: 0, chain: 0, best: 0, moving: false, mt: 0, lead: -1, fail: 0, clear: false, pulled: false,
  };
}
function cloneSim(S: Sim): Sim {
  return { ...S, B: S.B.map((b) => ({ ...b })), R: S.R.map((r) => ({ ...r })), open: S.open.slice(), cnt: S.cnt.slice(), add: S.add.slice(), tray: S.tray.slice() };
}

function wake(b: Ball) {
  if (b.aw) return;
  b.aw = true;
  b.px = b.x;
  b.py = b.y;
  b.vx = b.vy = 0;
}
/** 바닥 끝을 넘은 뭉치를 정렬: 같은 색 열린 바구니(덜 찬 것보다 더 찬 것 먼저) → 없으면 대기 칸 */
function sortIn(S: Sim, i: number, rec?: RE[]) {
  const b = S.B[i];
  let k = -1;
  for (let q = 0; q < BO; q++) if (S.open[q] === b.col && S.cnt[q] < CAP && (k < 0 || S.cnt[q] > S.cnt[k])) k = q;
  b.st = 1;
  b.drv = true;
  b.slow = 0;
  if (k >= 0) {
    b.dst = k;
    b.tx = mouthX(k);
    b.ty = FH + MOUTH_DY;
    S.cnt[k]++;
    S.add[k]++;
    S.done++;
    if (S.cnt[k] === CAP) complete(S, k, rec);
  } else {
    b.dst = -1;
    b.tx = slotX(S.L, Math.min(S.L.slots - 1, S.tray.length));
    b.ty = FH + TRAY_DY;
    S.tray.push(b.col);
    S.trayIn++;
  }
  if (i !== S.lead) S.chain++;
  rec?.push({ k: 'fall', i, dst: b.dst, lead: i === S.lead });
}
function complete(S: Sim, k: number, rec?: RE[]) {
  const one = S.add[k] >= CAP, old = S.open[k], nx = S.qi < S.L.queue.length ? S.L.queue[S.qi++] : -1;
  if (one) S.full1++;
  S.open[k] = nx;
  S.cnt[k] = 0;
  S.add[k] = 0;
  rec?.push({ k: 'full', slot: k, col: old, one, next: nx });
  if (nx < 0) return;
  for (let j = 0; j < S.tray.length && S.cnt[k] < CAP; )
    if (S.tray[j] === nx) {
      S.tray.splice(j, 1);
      S.cnt[k]++;
      S.done++;
      rec?.push({ k: 'pull', slot: k, col: nx, idx: j });
    } else j++;
  if (S.cnt[k] === CAP) complete(S, k, rec);
}

/** 실이 지나가는 선분이 의자 다리에 걸렸나 */
function legOnSeg(L: Level, ax: number, ay: number, bx: number, by: number) {
  for (const p of L.posts) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / l2)) : 0;
    const qx = ax + dx * u - p[0], qy = ay + dy * u - p[1];
    if (u > 0.02 && u < 0.98 && qx * qx + qy * qy < (PR + 0.006) ** 2) return p;
  }
  return null;
}
const segDist = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(ax + dx * u - px, ay + dy * u - py);
};
function snap(S: Sim, r: Rope, leg: boolean, rec?: RE[]) {
  r.on = false;
  const a = S.B[r.a], b = S.B[r.b];
  rec?.push({ k: 'snap', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, leg });
}

/** 고정 간격 물리 한 틱 (위치 기반: 움직임 → 실·부딪힘·벽을 몇 번 맞춤 → 속도 = 옮긴 거리) */
function tick(S: Sim, rec?: RE[]) {
  const B = S.B, L = S.L, n = B.length;
  S.mt++;
  for (const b of B) {
    if (!b.aw) continue;
    b.px = b.x;
    b.py = b.y;
    if (b.drv) {
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1e-9, v = b.hv ? VH : V0;
      b.vx += ((dx / d) * v - b.vx) * ACC;
      b.vy += ((dy / d) * v - b.vy) * ACC;
    } else {
      const f = onWax(L, b) ? FR_WAX : FR;
      b.vx *= f;
      b.vy *= f;
    }
    b.x += b.vx;
    b.y += b.vy;
  }
  for (let it = 0; it < ITER; it++) {
    for (const r of S.R) {
      if (!r.on) continue;
      const a = B[r.a], b = B[r.b];
      if (!a.aw && !b.aw) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
      if (d <= r.len) continue;
      const wa = invM(a), wb = invM(b), c = (d - r.len) / (d * (wa + wb));
      if (c * d * wa > 1e-6) wake(a);
      if (c * d * wb > 1e-6) wake(b);
      a.x += dx * c * wa;
      a.y += dy * c * wa;
      b.x -= dx * c * wb;
      b.y -= dy * c * wb;
    }
    for (let i = 0; i < n; i++) {
      const a = B[i];
      if (!a.aw || a.st !== 0) continue;
      for (let j = 0; j < n; j++) {
        if (j === i) continue;
        const b = B[j];
        if (b.st !== 0 || (b.aw && j < i)) continue;
        const dx = b.x - a.x, dy = b.y - a.y, m = a.r + b.r, d2 = dx * dx + dy * dy;
        if (d2 >= m * m || d2 < 1e-12) continue;
        const d = Math.sqrt(d2), wa = invM(a), wb = invM(b), c = (m - d) / (d * (wa + wb));
        wake(b);
        a.x -= dx * c * wa;
        a.y -= dy * c * wa;
        b.x += dx * c * wb;
        b.y += dy * c * wb;
      }
    }
    for (const b of B) {
      if (!b.aw || b.st !== 0) continue;
      for (const p of L.posts) {
        const dx = b.x - p[0], dy = b.y - p[1], m = b.r + PR, d2 = dx * dx + dy * dy;
        if (d2 < m * m && d2 > 1e-12) {
          const d = Math.sqrt(d2);
          b.x = p[0] + (dx / d) * m;
          b.y = p[1] + (dy / d) * m;
        }
      }
      if (b.x < b.r) b.x = b.r;
      if (b.x > 1 - b.r) b.x = 1 - b.r;
      if (b.y < b.r) b.y = b.r;
    }
  }
  for (const b of B) if (b.aw) (b.vx = b.x - b.px), (b.vy = b.y - b.py);
  // 실: 팽팽한데 의자 다리에 걸렸거나, 부딪힘 때문에 늘어난 채로 버티면 툭
  for (const r of S.R) {
    if (!r.on) continue;
    const a = B[r.a], b = B[r.b];
    if (!a.aw && !b.aw) continue;
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    const taut = d > r.len - 0.004, leg = taut && a.st === 0 && b.st === 0 && !!legOnSeg(L, a.x, a.y, b.x, b.y);
    if (leg || d - r.len > 0.014) r.k++;
    else r.k = 0;
    if (r.k >= SNAG_T) snap(S, r, leg, rec);
  }
  for (let i = 0; i < n; i++) {
    const b = B[i];
    if (!b.aw) continue;
    if (b.st === 0 && b.y > FH) {
      sortIn(S, i, rec);
      continue;
    }
    if (b.st === 1) {
      if (b.y >= b.ty - 0.012) {
        b.st = b.dst >= 0 ? 2 : 3;
        b.aw = false;
        b.drv = false;
        b.vx = b.vy = 0;
        for (const r of S.R) if (r.on && (r.a === i || r.b === i)) r.on = false;
        rec?.push({ k: 'land', i, dst: b.dst, col: b.col });
        continue;
      }
    }
    if (b.drv) {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp < (b.hv ? VH : V0) * 0.25) b.slow++;
      else b.slow = 0;
      if (b.slow > STALL_T) {
        if (b.st === 0) {
          b.drv = false;
          rec?.push({ k: 'stall', i });
        } else for (const r of S.R) if (r.on && (r.a === i || r.b === i)) snap(S, r, false, rec);
        b.slow = 0;
      }
    } else if (b.st === 0 && b.vx * b.vx + b.vy * b.vy < SLEEP * SLEEP) {
      b.aw = false;
      b.vx = b.vy = 0;
    } else if (b.st === 0 && !S.pulled && i !== S.lead && b.vx * b.vx + b.vy * b.vy > 1e-5) {
      S.pulled = true;
      rec?.push({ k: 'drag', i });
    }
  }
  let any = false;
  for (const b of B) if (b.aw) any = true;
  if (!any || S.mt > MOVE_MAX) endMove(S);
}

function endMove(S: Sim) {
  for (const b of S.B) {
    if (b.st === 1) (b.st = b.dst >= 0 ? 2 : 3), (b.drv = false);
    b.aw = false;
    b.vx = b.vy = 0;
  }
  S.moving = false;
  S.best = Math.max(S.best, S.chain + 1);
  const left = S.B.some((b) => b.st === 0);
  if (S.tray.length >= S.L.slots) S.fail = 1;
  else if (!left && !S.tray.length) S.clear = true;
  else if (left && !S.B.some((b) => tappable(S.L, b))) S.fail = 2;
}

/** 가위에 닿은 실 */
function sciRopes(S: Sim) {
  const L = S.L, out: number[] = [];
  if (!L.sc) return out;
  S.R.forEach((r, j) => {
    if (!r.on) return;
    const a = S.B[r.a], b = S.B[r.b];
    if (segDist(L.sc![0], L.sc![1], a.x, a.y, b.x, b.y) < SCI_R) out.push(j);
  });
  return out;
}

/** 한 수 시작: 뭉치 톡(굴러가기) 또는 가위 톡(싹둑) */
function begin(S: Sim, m: number, rec?: RE[]) {
  S.taps++;
  S.add.fill(0);
  S.chain = 0;
  S.pulled = false;
  S.mt = 0;
  if (m === SCI) {
    const cut = sciRopes(S);
    for (const j of cut) S.R[j].on = false;
    rec?.push({ k: 'cut', n: cut.length });
    S.lead = -1;
    endMove(S);
    return;
  }
  const b = S.B[m];
  let k = -1;
  for (let q = 0; q < BO; q++) if (S.open[q] === b.col && S.cnt[q] < CAP && (k < 0 || S.cnt[q] > S.cnt[k])) k = q;
  b.tx = k >= 0 ? mouthX(k) : slotX(S.L, Math.min(S.L.slots - 1, S.tray.length));
  b.ty = FH + 0.05;
  b.drv = true;
  b.slow = 0;
  wake(b);
  S.lead = m;
  S.moving = true;
  rec?.push({ k: 'roll', i: m });
}
/** 한 수를 끝까지 (미리 보기·봇의 내다보기용 — 진짜 판과 같은 규칙) */
function runMove(S: Sim, m: number) {
  begin(S, m);
  while (S.moving) tick(S);
  return S;
}
function movesOf(S: Sim) {
  const out: number[] = [];
  S.B.forEach((b, i) => tappable(S.L, b) && out.push(i));
  if (S.L.sc && sciRopes(S).length) out.push(SCI);
  return out;
}
const starsOf = (L: Level, S: Sim) => [S.clear, L.nStars >= 2 ? S.trayIn <= L.trayMax : S.clear, L.nStars >= 3 ? S.taps <= L.par : S.clear].slice(0, L.nStars);

// ───────────────────────────── 판 만들기 ─────────────────────────────
const mkBall = (x: number, y: number, col: number, hv = false): Ball => ({ x, y, px: x, py: y, vx: 0, vy: 0, r: hv ? HR : BR, col, hv, st: 0, drv: false, tx: 0, ty: 0, dst: -1, aw: false, slow: 0 });
const mkRope = (B: Ball[], a: number, b: number, slack: number): Rope => ({ a, b, len: Math.hypot(B[a].x - B[b].x, B[a].y - B[b].y) + slack, on: true, k: 0 });

function segCross(a: number[], b: number[], c: number[], d: number[]) {
  const o = (p: number[], q: number[], r: number[]) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0;
}

/** 판 모양(뭉치 자리·실·가구). 색은 나중에 칠한다 */
function shape(d: StageDef, si: number, r: Rng): { B: Ball[]; R: Rope[]; posts: number[][]; sofa: number[] | null; sc: number[] | null; wax: number[] | null } | null {
  const flip = r() < 0.5, fx = (x: number) => (flip ? 1 - x : x);
  if (si === 0) {
    // 1판: 같은 색 셋이 실로 이어진 두 줄 — 첫 톡에 줄줄이 쏙쏙 (한 번에 꽉!)
    const j = () => (r() - 0.5) * 0.03;
    const pts = [[0.2, 0.36], [0.24, 0.5], [0.2, 0.64], [0.66, 0.38], [0.74, 0.5], [0.68, 0.63]];
    const B = pts.map(([x, y], i) => mkBall(fx(x + j()), y + j(), i < 3 ? 0 : 1));
    const R = [mkRope(B, 0, 1, 0.02), mkRope(B, 1, 2, 0.02), mkRope(B, 3, 4, 0.02), mkRope(B, 4, 5, 0.02)];
    return { B, R, posts: [], sofa: null, sc: null, wax: null };
  }
  const posts: number[][] = [];
  if (d.legs) {
    const cx = fx(0.42 + r() * 0.16), cy = 0.4 + r() * 0.08, hx = 0.11, hy = 0.085;
    posts.push([cx - hx, cy - hy], [cx + hx, cy - hy], [cx - hx, cy + hy], [cx + hx, cy + hy]);
  }
  const sofa = d.sofa ? [0.16, 0.84, 0.165] : null;
  const wax = d.wax ? [0, FH - 0.3, 1, FH] : null;
  const B: Ball[] = [];
  const free = (x: number, y: number, rad: number) =>
    B.every((b) => Math.hypot(b.x - x, b.y - y) > b.r + rad + 0.03) && posts.every((p) => Math.hypot(p[0] - x, p[1] - y) > PR + rad + 0.02);
  const nh = d.heavy ?? 0, nu = d.sofa ? 3 : 0;
  for (let i = 0; i < d.n; i++) {
    const hv = i >= nu && i < nu + nh, rad = hv ? HR : BR;
    let ok = false;
    for (let t = 0; t < 200 && !ok; t++) {
      let x: number, y: number;
      if (i < nu) (x = sofa![0] + 0.08 + r() * (sofa![1] - sofa![0] - 0.16)), (y = 0.07 + r() * 0.05);
      else (x = 0.07 + r() * 0.86), (y = (d.sofa ? 0.27 : 0.1) + r() * (FH - 0.2 - (d.sofa ? 0.27 : 0.1)));
      if (hv) y = Math.min(y, FH - 0.3);
      if (!free(x, y, rad)) continue;
      B.push(mkBall(x, y, 0, hv));
      ok = true;
    }
    if (!ok) return null;
  }
  // 실: 가까운 둘씩(한 뭉치에 실 2개까지, 실끼리 안 엇갈리게, 다른 뭉치를 가로지르지 않게)
  const deg = B.map(() => 0), R: Rope[] = [];
  const pairs: number[][] = [];
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    const dd = Math.hypot(B[i].x - B[j].x, B[i].y - B[j].y);
    if (dd < 0.3 && dd > B[i].r + B[j].r + 0.02) pairs.push([i, j, dd]);
  }
  shuffle(pairs, r);
  // 소파 밑 뭉치·점보 뭉치는 먼저 이어 둔다
  pairs.sort((p, q) => {
    const w = (u: number[]) => (u[0] < nu + nh || u[1] < nu + nh ? 0 : 1);
    return w(p) - w(q);
  });
  for (const [i, j] of pairs) {
    if (R.length >= d.ropes) break;
    if (deg[i] >= 2 || deg[j] >= 2) continue;
    if (i < nu && j < nu) continue;
    const a = [B[i].x, B[i].y], b = [B[j].x, B[j].y];
    if (R.some((q) => segCross(a, b, [B[q.a].x, B[q.a].y], [B[q.b].x, B[q.b].y]))) continue;
    if (B.some((c, k) => k !== i && k !== j && segDist(c.x, c.y, a[0], a[1], b[0], b[1]) < c.r + 0.01)) continue;
    R.push(mkRope(B, i, j, 0.005 + r() * 0.05));
    deg[i]++, deg[j]++;
  }
  for (let i = 0; i < nu + nh; i++) if (!deg[i]) return null;
  let sc: number[] | null = null;
  if (d.sci) {
    for (const q of shuffle(R.slice(), r)) {
      const a = B[q.a], b = B[q.b], t = 0.4 + r() * 0.2, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t;
      if (B.every((c) => Math.hypot(c.x - x, c.y - y) > c.r + 0.05) && R.filter((o) => segDist(x, y, B[o.a].x, B[o.a].y, B[o.b].x, B[o.b].y) < SCI_R).length === 1) {
        sc = [x, y];
        break;
      }
    }
    if (!sc) return null;
  }
  return { B, R, posts, sofa, sc, wax };
}

function paint(d: StageDef, si: number, r: Rng, sh: NonNullable<ReturnType<typeof shape>>): Level {
  const pal = shuffle([0, 1, 2, 3, 4, 5], r).slice(0, d.cols);
  const B = sh.B.map((b) => ({ ...b }));
  if (si === 0) {
    B.forEach((b) => (b.col = pal[b.col]));
  } else {
    const cols: number[] = [];
    for (const c of pal) cols.push(c, c, c);
    shuffle(cols, r);
    B.forEach((b, i) => (b.col = cols[i]));
  }
  const queue = shuffle(pal.slice(), r);
  const L: Level = { si, B0: B, R0: sh.R.map((q) => ({ ...q })), posts: sh.posts, sofa: sh.sofa, sc: sh.sc, wax: sh.wax, queue, slots: d.slots, par: 99, trayMax: 99, nStars: d.stars, sol: [], pal };
  // 첫 바구니 둘 중 하나는 손 닿는 뭉치 색이 있게
  const reach = new Set(B.filter((b) => tappable(L, b)).map((b) => b.col));
  if (!reach.has(queue[0]) && !reach.has(queue[1])) {
    const j = queue.findIndex((c) => reach.has(c));
    if (j > 1) [queue[0], queue[j]] = [queue[j], queue[0]];
  }
  return L;
}

/** 풀이가 대기 칸 한 번을 톡 몇 번만큼 싫어하나 · 빔 폭 */
const TRAY_W = 1.4, BEAM = 6;
/** 내다보는 풀이(빔 탐색): 톡 수 + 대기 칸 수가 가장 적은 길 */
function solve(L: Level, W: number) {
  let beams: { S: Sim; seq: number[]; v: number }[] = [{ S: newSim(L), seq: [], v: 0 }];
  let best: { seq: number[]; taps: number; tray: number; c: number } | null = null;
  for (let dep = 0; dep < 24 && beams.length; dep++) {
    const nx: { S: Sim; seq: number[]; v: number }[] = [];
    const seenK = new Set<string>();
    for (const bm of beams) {
      for (const m of movesOf(bm.S)) {
        const S2 = runMove(cloneSim(bm.S), m);
        if (S2.fail) continue;
        const seq = [...bm.seq, m];
        if (S2.clear) {
          const c = S2.taps + S2.trayIn * TRAY_W;
          if (!best || c < best.c) best = { seq, taps: S2.taps, tray: S2.trayIn, c };
          continue;
        }
        if (best && S2.taps + 1 >= best.taps && S2.trayIn >= best.tray) continue;
        let key = `${S2.trayIn}|${S2.taps}|${S2.tray.join('')}|${S2.open.join('')}|`;
        for (const b of S2.B) key += b.st ? 'x' : `${Math.round(b.x * 60)},${Math.round(b.y * 60)};`;
        if (seenK.has(key)) continue;
        seenK.add(key);
        nx.push({ S: S2, seq, v: value(S2) });
      }
    }
    nx.sort((a, b) => b.v - a.v);
    beams = nx.slice(0, W);
  }
  return best;
}
/** 풀이 탐색이 보는 판의 값: 정렬한 수 · 톡 수 · 대기 칸 · 열린 바구니 색이 손 닿는 데 있나 */
function value(S: Sim) {
  let v = S.done * 10 - S.taps * 10 - S.trayIn * 9 - S.tray.length * 3;
  for (const b of S.B) {
    if (b.st !== 0) continue;
    if (S.open.includes(b.col)) v += 0.6 + (b.y / FH) * 0.8;
    if (underSofa(S.L, b)) v -= 1.5;
  }
  for (const r of S.R) if (r.on && S.B[r.a].col === S.B[r.b].col) v += 1.2;
  return v;
}

/** 버릇 A(생성기가 거르는 데 쓰는 것): 열린 바구니 색과 같은 뭉치 중 바구니에 가장 가까운 것, 없으면 바닥 끝에 가장 가까운 것 */
export function habitPick(S: Sim) {
  let best = -1, bv = 1e9;
  S.B.forEach((b, i) => {
    if (!tappable(S.L, b)) return;
    const k = S.open.findIndex((c, q) => c === b.col && S.cnt[q] < CAP);
    const v = k >= 0 ? Math.hypot(b.x - mouthX(k), b.y - FH) : 10 + (FH - b.y);
    if (v < bv) (bv = v), (best = i);
  });
  return best;
}
/** 버릇 B(독립 — 생성기가 안 씀): 미리 보기만 보고 '지금 바구니에 가장 많이 들어가는' 뭉치 (대기 칸 가는 건 싫어함) */
export function greedyPick(S: Sim) {
  let best = -1, bv = -1e9;
  for (const m of movesOf(S)) {
    if (m === SCI) continue;
    const S2 = runMove(cloneSim(S), m);
    const v = S2.fail ? -1e6 : (S2.done - S.done) * 10 - (S2.trayIn - S.trayIn) * 12 + (S2.clear ? 50 : 0);
    if (v > bv) (bv = v), (best = m);
  }
  return best;
}
function playOut(L: Level, pick: (S: Sim) => number) {
  const S = newSim(L);
  for (let k = 0; k < 40 && !S.fail && !S.clear; k++) {
    const m = pick(S);
    if (m < 0) break;
    runMove(S, m);
  }
  return S;
}
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = playOut(L, (S0) => {
      const mv = movesOf(S0).filter((m) => m !== SCI || r() < 0.3);
      return mv.length ? mv[Math.floor(r() * mv.length)] : -1;
    });
    if (S.clear) ok++;
  }
  return ok / n;
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[si], r = mulberry32((seed * 7349 + si * 104729 + 3) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = si === 0 ? 1 : si === 1 ? 4 : 4;
  for (let c = 0, tries = 0; c < K && tries < 40; tries++) {
    const sh = shape(d, si, r);
    if (!sh) continue;
    const L = paint(d, si, r, sh);
    const sol = solve(L, BEAM);
    if (!sol) continue;
    c++;
    L.sol = sol.seq;
    L.par = sol.taps;
    L.trayMax = sol.tray;
    let v: number;
    if (si === 0) v = 1;
    else if (si === 1) {
      L.trayMax = Math.max(1, sol.tray);
      v = -Math.abs(randomPass(L, r, 10) - 0.7) + (sol.tray <= 1 ? 0.3 : 0);
    } else {
      const H = playOut(L, habitPick), hs = H.clear ? starsOf(L, H).filter(Boolean).length : 0;
      const rp = randomPass(L, r, 6);
      v = (hs === 3 ? 0 : 3) + (H.clear ? 0.4 : 0) - Math.abs(rp - 0.25) * 1.5 + (sol.taps < L.B0.length - 2 ? 0.5 : 0) - sol.tray * 0.3;
    }
    if (v > bv) (bv = v), (pick = L);
  }
  if (!pick) {
    // 안전망: 실 없이 칠한 판 (일어나면 안 되지만 멈추지 않게)
    const sh = shape(STAGES[0], 0, r)!;
    pick = paint(STAGES[0], 0, r, sh);
    pick.si = si;
    const sol = solve(pick, 2);
    pick.sol = sol?.seq ?? [];
    pick.par = sol?.taps ?? 99;
    pick.trayMax = sol?.tray ?? 99;
  }
  if (levelCache.size > 600) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}


// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; v?: number }
/** 화면의 바구니(칸마다 줄): 논리는 바로 바뀌지만 그림은 뭉치가 내려앉은 뒤에 떠난다 */
interface VB { id: number; col: number; got: number; full: boolean; t0: number }
interface Fly { col: number; x0: number; y0: number; x1: number; y1: number; t0: number; dur: number; bid: number }
export interface YarnState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; press: number; queued: number; cool: number; lastTap: number; calmT: number; startT: number; firstTap: boolean;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; tips: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  vq: VB[][]; vid: number; bb: Map<number, number>; lv: { col: number; slot: number; t0: number; one: boolean }[]; fly: Fly[]; trayV: number[];
  mood: string; moodT: number; paw: number; pawX: number; spot: boolean; lastBig: number; slow: number; mvIn: number; mvTray: number;
}

const ev = (s: YarnState, kind: string, x: number, y: number, text?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, v });
function see(s: YarnState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
function tip(s: YarnState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
const setMood = (s: YarnState, m: string) => ((s.mood = m), (s.moodT = s.t));
/** 바닥 좌표 → 화면(가로 폭 단위) */
const SY = (y: number) => FY0 + y * KY;
/** 원근: 뒤(위)가 좁고 앞(아래)이 넓은 바닥 — 화면 x */
const SB = 0.84;
const scl = (y: number) => SB + (1 - SB) * Math.max(0, Math.min(1, y / FH));
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const BASK_Y = SY(FH + MOUTH_DY), TRAY_SY = SY(FH + TRAY_DY), CAT_X = 0.615, NEXT_X = [0.8, 0.925];
const BAND = 1.365;

function newStage(s: YarnState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.vq = s.S.open.map((c) => [{ id: s.vid++, col: c, got: 0, full: false, t0: s.t - 99 }]);
  s.bb = new Map();
  s.lv = [];
  s.fly = [];
  s.trayV = [];
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.queued = -1;
  s.cool = s.t + 36;
  s.startT = s.t;
  s.calmT = s.t;
  s.got = 0;
  s.starOk = [];
  s.spot = !!d.spot;
  setMood(s, 'idle');
  see(s, d.key, '');
}

function finish(s: YarnState) {
  s.phase = 'result';
  s.pt = 0;
  const d = STAGES[s.stage], S = s.S;
  if (s.ok) {
    s.starOk = starsOf(s.L, S);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + S.full1 * FULL_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${d.emoji} 다 채웠다!`, s.got);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.62, s.why);
    setMood(s, 'tangled');
  }
}

/** 손가락 자리에서 가장 가까운 뭉치(또는 가위). -2 = 소파 밑이라 안 닿음 */
function pickAt(s: YarnState, x: number, sy: number) {
  const S = s.S, L = s.L;
  let best = -1, bd = HIT;
  S.B.forEach((b, i) => {
    if (b.st !== 0) return;
    const dd = Math.hypot(PX(b.x, b.y) - x, SY(b.y) - sy) - (b.hv ? 0.012 : 0);
    if (dd < bd) (bd = dd), (best = i);
  });
  if (L.sc && Math.hypot(PX(L.sc[0], L.sc[1]) - x, SY(L.sc[1]) - sy) < Math.min(bd, HIT)) return SCI;
  if (best >= 0 && underSofa(L, S.B[best])) return -2 - best;
  return best;
}

/** 시뮬레이션 사건 → 화면 연출 */
function playRec(s: YarnState, rec: RE[]) {
  const S = s.S;
  for (const e of rec) {
    if (e.k === 'roll') {
      const b = S.B[e.i];
      s.paw = s.t;
      s.pawX = PX(b.x, b.y);
      ev(s, 'roll', PX(b.x, b.y), SY(b.y), undefined, b.col);
      continue;
    }
    if (e.k === 'fall') {
      const q = e.dst >= 0 ? s.vq[e.dst] : null;
      if (q) s.bb.set(e.i, q[q.length - 1].id);
      if (!e.lead) {
        const b = S.B[e.i];
        ev(s, e.dst >= 0 ? 'chain' : 'oopsS', PX(b.x, FH), SY(FH) - 0.03, e.dst >= 0 ? '+1' : '앗!', b.col);
        if (e.dst >= 0) s.mvIn++;
        else s.mvTray++;
        if (e.dst >= 0) see(s, 'chain', '🧶 끌려온 같은 색도 줄줄이 쏙!');
        s.slow = s.t + 16;
      }
      if (e.dst < 0) see(s, 'trayuse', '🧺 맞는 바구니가 없으면 대기 칸으로 — 꽉 차면 실패!');
      continue;
    }
    if (e.k === 'land') {
      const bid = s.bb.get(e.i);
      if (e.dst >= 0 && bid !== undefined) {
        for (const q of s.vq) for (const v of q) if (v.id === bid) v.got++;
        ev(s, 'in', e.dst === 0 ? mouthX(0) : mouthX(1), BASK_Y, undefined, e.col);
      } else if (e.dst < 0) {
        // 이미 바구니로 불려 간 공(같은 수 안에 바구니가 바뀐 경우)은 바로 바구니로 폴짝
        const red = s.fly.find((f) => f.bid === -9 && f.col === e.col);
        if (red) red.bid = -1;
        s.trayV.push(e.col);
        ev(s, 'tray', slotX(s.L, s.trayV.length - 1), TRAY_SY, undefined, e.col);
      }
      continue;
    }
    if (e.k === 'full') {
      const q = s.vq[e.slot];
      q[q.length - 1].full = true;
      q.push({ id: s.vid++, col: e.next, got: 0, full: false, t0: 0 });
      if (e.one) {
        ev(s, 'one', mouthX(e.slot), BASK_Y - 0.06, '한 번에 꽉!', e.col);
        s.slow = s.t + 24;
        see(s, 'one', '🧺 톡 한 번에 바구니가 꽉! 고양이가 우쭐');
      }
      continue;
    }
    if (e.k === 'pull') {
      const q = s.vq[e.slot], tgt = q[q.length - 1];
      const ti = s.trayV.indexOf(e.col);
      if (ti >= 0) {
        s.trayV.splice(ti, 1);
        s.fly.push({ col: e.col, x0: slotX(s.L, ti), y0: TRAY_SY, x1: mouthX(e.slot), y1: BASK_Y, t0: s.t + 14, dur: 18, bid: tgt.id });
      } else s.fly.push({ col: e.col, x0: slotX(s.L, 0), y0: TRAY_SY, x1: mouthX(e.slot), y1: BASK_Y, t0: s.t + 30, dur: 18, bid: tgt.id });
      tip(s, 'pull', '대기 칸 뭉치는 맞는 바구니가 오면 저절로 쏙!');
      continue;
    }
    if (e.k === 'snap') {
      ev(s, 'snap', PX(e.x, e.y), SY(e.y), e.leg ? '툭! 다리에 걸렸다' : '툭!');
      see(s, 'snap', '🪑 팽팽한 실이 다리에 걸리면 툭 끊겨요');
      continue;
    }
    if (e.k === 'stall') {
      const b = S.B[e.i];
      ev(s, 'stall', PX(b.x, b.y), SY(b.y), '끙! 안 끌려요');
      see(s, 'stall', '🪨 점보 뭉치는 안 끌려요 — 당기던 쪽이 멈춰요');
      setMood(s, 'huh');
      continue;
    }
    if (e.k === 'cut') {
      ev(s, 'cut', s.L.sc ? PX(s.L.sc[0], s.L.sc[1]) : 0.5, SY(s.L.sc ? s.L.sc[1] : 0.5), e.n ? `싹둑! 실 ${e.n}가닥` : '자를 실이 없어요');
      if (e.n) see(s, 'cut', '✂️ 싹둑! 끊긴 실은 더 안 끌려요');
      continue;
    }
    if (e.k === 'drag') {
      see(s, 'drag', '🧶 실이 팽팽해지면 이어진 뭉치가 끌려와요');
    }
  }
}

/** 화면 바구니·날아가는 뭉치 정리 */
function animate(s: YarnState) {
  for (let k = 0; k < s.vq.length; k++) {
    const q = s.vq[k], f = q[0];
    if (f.full && f.got >= CAP && q.length > 1 && s.t - (f.t0 || 0) > 6) {
      s.lv.push({ col: f.col, slot: k, t0: s.t, one: false });
      q.shift();
      q[0].t0 = s.t + 20;
      ev(s, 'done', mouthX(k), BASK_Y, undefined, f.col);
      if (s.mood !== 'tangled') setMood(s, 'smug');
    }
  }
  for (const f of s.fly)
    if (f.bid >= 0 && s.t >= f.t0 + f.dur) {
      for (const q of s.vq) for (const v of q) if (v.id === f.bid) v.got++;
      ev(s, 'in', f.x1, f.y1, undefined, f.col);
      f.bid = -3;
    }
  s.fly = s.fly.filter((f) => f.bid !== -3 && s.t < f.t0 + f.dur + 200);
  s.lv = s.lv.filter((l) => s.t < l.t0 + 60);
}

function afterMove(s: YarnState) {
  const S = s.S;
  s.calmT = s.t;
  if (S.chain >= 2 && s.t - s.lastBig > 30) setMood(s, 'wow');
  const lead = S.B[S.lead];
  if (s.mvIn > 0) ev(s, 'chainbig', 0.5, SY(FH) - 0.1, lead && lead.dst >= 0 ? `줄줄이 ${s.mvIn + 1}개 쏙!` : `${s.mvIn}개 같이 쏙!`, Math.min(4, s.mvIn));
  if (s.mvTray > 0) ev(s, 'oops', 0.5, SY(FH) - 0.035, `앗, ${s.mvTray}개 딸려서 대기 칸으로…`);
  // 소파 밑에서 끌려 나온 뭉치
  if (s.L.sofa && S.B.some((b, i) => b.st === 0 && !underSofa(s.L, b) && underSofa(s.L, s.L.B0[i]))) see(s, 'pullout', '🛋️ 실로 끌어낸 뭉치는 이제 톡 할 수 있어요');
  if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = S.fail === 1 ? '대기 칸이 꽉 찼어요!' : '소파 밑에 갇혀 못 꺼내요!';
    ev(s, 'jam', 0.5, TRAY_SY, S.fail === 1 ? '꽉!' : '안 닿아…');
    setMood(s, 'tangled');
  } else if (S.clear) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
  } else if (S.tray.length >= s.L.slots - 1) setMood(s, 'worry');
}

function doTap(s: YarnState, k: number) {
  const S = s.S;
  if (k <= -2) {
    const b = S.B[-2 - k];
    ev(s, 'nope', PX(b.x, b.y), SY(b.y) + 0.07, '발이 안 닿아요 — 실로 끌어내요');
    setMood(s, 'huh');
    return;
  }
  const rec: RE[] = [];
  s.mvIn = s.mvTray = 0;
  begin(S, k, rec);
  s.lastTap = s.t;
  s.firstTap = true;
  s.spot = false;
  if (k !== SCI) setMood(s, 'swat');
  playRec(s, rec);
  if (!S.moving) afterMove(s);
}

export const yarncat: GameDef<YarnState> = {
  id: 'yarncat',
  name: '고양이 털실 바구니',
  genes: ['yarnsort', 'tugthread', 'pointer'],
  twist: '털실 뭉치들이 실로 이어져 있어서, 하나를 굴리면 실이 팽팽해지며 이어진 뭉치를 질질 끌고 간다 — 같은 색이면 줄줄이 같은 바구니로(한 번에 꽉!), 다른 색이면 엉뚱하게 대기 칸으로 딸려 간다. 의자 다리에 걸리면 툭 끊기고, 점보 뭉치는 안 끌린다',
  rules: ['털실 뭉치를 톡 → 같은 색 바구니로 데굴데굴! 실로 이어진 뭉치는 같이 끌려와요.', '맞는 바구니가 없으면 대기 칸으로 — 대기 칸이 꽉 차면 실패. 꾹 누르면 끌려올 것이 보여요.'],
  controls: 'touch',
  hint: '뭉치를 톡! 꾹 누르면 끌려올 것이 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '고양이네 거실 털실 바구니',
    mood: '오후 햇살이 드는 아늑한 거실 — 원목 마루와 동그란 러그 위에 알록달록 털실 뭉치가 실로 엉켜 굴러다니고, 아래 원목 벤치에 엮은 바구니가 줄지어 놓였다. 주황 줄무늬 고양이가 앞발로 뭉치를 탁 치고, 선반 위 금붕어와 걸레받이 구멍의 생쥐가 구경한다.',
    palette: { bg: '#3b2a22', ink: '#fff8ee', muted: '#d9c3a8', accent: '#ffc864', hot: '#ff6b5a', soft: '#f6e6cf' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, queued: -1, cool: 0, lastTap: -99, calmT: 0, startT: 0, firstTap: false,
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), tips: new Set<string>(), newsQ: [], news: null, events: [],
      vq: [], vid: 1, bb: new Map(), lv: [], fly: [], trayV: [], mood: 'idle', moodT: 0, paw: -99, pawX: 0.5, spot: false, lastBig: -99, slow: -99, mvIn: 0, mvTray: 0,
    } as unknown as YarnState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.S.moving && (s.t >= s.slow || s.t % 2 === 0)) {
      const rec: RE[] = [];
      tick(s.S, rec);
      playRec(s, rec);
      if (!s.S.moving) afterMove(s);
    }
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'tangled' || s.mood === 'cheer' ? 400 : s.mood === 'swat' ? 30 : 80)) s.mood = s.S.tray.length >= s.L.slots - 1 ? 'worry' : 'idle';
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= (s.ok ? 56 : 50) && !s.S.moving) finish(s);
      return;
    }
    if (p) s.press = pickAt(s, p.x, p.y * A);
    if (release) {
      const k = s.press;
      s.press = -1;
      if (k === -1) {
        const y = s.ay;
        if (y > SY(0) && y < SY(FH)) ev(s, 'miss', s.ax, y, '털실 뭉치를 톡!');
      } else if (s.S.moving || s.t < s.cool) s.queued = k;
      else doTap(s, k);
    }
    if (s.queued !== -1 && !s.S.moving && s.t >= s.cool && !s.down) {
      const k = s.queued;
      s.queued = -1;
      if (k === SCI || k <= -2 || (s.S.B[k] && tappable(s.L, s.S.B[k]))) doTap(s, k);
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
function aimAt(s: YarnState, m: number): Input {
  if (m === SCI && s.L.sc) return { tap: false, dir: 0, pointer: { x: PX(s.L.sc[0], s.L.sc[1]), y: SY(s.L.sc[1]) / A } };
  const b = s.S.B[m];
  return { tap: false, dir: 0, pointer: { x: PX(b.x, b.y), y: SY(b.y) / A } };
}
const ready = (s: YarnState) => s.phase === 'play' && !s.down && !s.S.moving && s.queued === -1 && s.t >= s.cool && s.t - s.calmT >= 16 && s.t - s.startT >= 40;
/** 잘하는 봇: 판을 만들 때 빔 탐색으로 내다본 풀이(진짜 판과 같은 물리)를 따라 둔다. 어긋나면 한 수 앞 미리 보기로 */
export const yarncatSmart: Bot<YarnState> = {
  name: '털실 박사',
  act(s) {
    if (!ready(s)) return NO;
    let m = s.L.sol[s.S.taps];
    if (m === undefined || (m !== SCI && !(s.S.B[m] && tappable(s.L, s.S.B[m]))) || (m === SCI && !s.L.sc)) m = greedyPick(s.S);
    return m >= 0 || m === SCI ? aimAt(s, m) : NO;
  },
};
/** 버릇 봇 A(생성기가 판을 거를 때 쓰는 것): 열린 바구니 색 중 바구니에 가장 가까운 뭉치 */
export const yarncatHabit: Bot<YarnState> = {
  name: '버릇: 맞는 색 가까운 것부터',
  act(s) {
    if (!ready(s)) return NO;
    const m = habitPick(s.S);
    return m >= 0 ? aimAt(s, m) : NO;
  },
};
/** 버릇 봇 B(독립 — 생성기가 안 씀): 미리 보기를 보고 지금 가장 많이 들어가는 뭉치 */
export const yarncatGreedy: Bot<YarnState> = {
  name: '버릇: 지금 많이 들어가는 것',
  act(s) {
    if (!ready(s)) return NO;
    const m = greedyPick(s.S);
    return m >= 0 ? aimAt(s, m) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 보이는 뭉치 아무거나 톡 (가끔 화면 아무 데나) */
export const yarncatRandom: Bot<YarnState> = {
  name: '아무 뭉치나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const list: number[] = [];
    s.S.B.forEach((b, i) => b.st === 0 && list.push(i));
    if (s.L.sc) list.push(SCI);
    if (rng() < 0.15 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const k = list[Math.floor(rng() * list.length)], q = aimAt(s, k).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.03, y: q.y + (rng() - 0.5) * 0.02 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
export const COLS = ['#e8504a', '#3d7fe0', '#f5c33b', '#3fae62', '#9a63d8', '#ff86b0'];
const LIGHT = ['#ffb3a6', '#a9cbff', '#fff0a6', '#a8eab8', '#d9bdfb', '#ffd0e2'];
const DARK = ['#a82b26', '#1f4f9e', '#b9851a', '#24763e', '#5f3593', '#c9507c'];
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);

/** 미리 보기: 지금 이걸 톡 하면? (진짜 판과 같은 물리로 끝까지 돌려 본다) */
interface Prev { m: number; paths: Map<number, number[]>; fin: Ball[]; snaps: number[][]; stall: number[]; ins: number[]; tray: number; cut: number[]; fail: number; clear: boolean; chain: number; one: boolean }
const pvCache = new WeakMap<object, { key: string; p: Prev }>();
function preview(s: YarnState, m: number): Prev {
  const key = `${s.stage}:${s.tries}:${s.S.taps}:${m}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const S = cloneSim(s.S), rec: RE[] = [], paths = new Map<number, number[]>();
  const cut = m === SCI ? sciRopes(S) : [];
  const tray0 = S.trayIn;
  begin(S, m, rec);
  const sample = () => S.B.forEach((b, i) => {
    if (!b.aw) return;
    let p = paths.get(i);
    if (!p) paths.set(i, (p = [s.S.B[i].x, s.S.B[i].y]));
    p.push(b.x, b.y);
  });
  for (let k = 0; S.moving && k < MOVE_MAX + 5; k++) {
    tick(S, rec);
    if (k % 2 === 0) sample();
  }
  const ins = [0, 0];
  for (const e of rec) if (e.k === 'fall' && e.dst >= 0) ins[e.dst]++;
  const p: Prev = {
    m, paths, fin: S.B, snaps: rec.filter((e) => e.k === 'snap').map((e) => [(e as { x: number }).x, (e as { y: number }).y]),
    stall: rec.filter((e) => e.k === 'stall').map((e) => (e as { i: number }).i), ins, tray: S.trayIn - tray0, cut, fail: S.fail, clear: S.clear, chain: S.chain, one: rec.some((e) => e.k === 'full' && e.one),
  };
  pvCache.set(s, { key, p });
  return p;
}

const doneEv = new WeakSet<Ev>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawYarn(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, c: number, spin: number, hv = false) {
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.42, r * 0.08, x, y, r * 1.02);
  g.addColorStop(0, LIGHT[c]);
  g.addColorStop(0.5, COLS[c]);
  g.addColorStop(1, DARK[c]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  // 실 가닥 무늬 (감긴 방향 셋)
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r * 0.97, 0, TAU);
  ctx.clip();
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a = spin + k * 1.05;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    for (let j = -2; j <= 2; j++) {
      ctx.strokeStyle = j % 2 ? 'rgba(255,255,255,.26)' : 'rgba(0,0,0,.16)';
      ctx.lineWidth = Math.max(0.8, r * (hv ? 0.11 : 0.08));
      ctx.beginPath();
      ctx.ellipse(0, j * r * 0.3, r * 1.05, r * 0.32, 0, Math.PI * 0.08, Math.PI * 0.92);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  ctx.strokeStyle = DARK[c];
  ctx.lineWidth = hv ? 2 : 1.2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.24, r * 0.14, -0.6, 0, TAU);
  ctx.fill();
  if (hv) {
    // 점보: 두꺼운 띠 + 리본
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = r * 0.16;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.1, r * 0.98, r * 0.28, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
  }
}

function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: string, t: number, look: number, pawAge: number, pawDir: number) {
  const OR = '#f29a45', OR2 = '#d9772a', CREAM = '#fff3e0', INK = '#3a2418';
  const bob = mood === 'cheer' ? -Math.abs(Math.sin(t / 6)) * u * 0.35 : mood === 'tangled' ? Math.sin(t / 3) * u * 0.08 : Math.sin(t / 40) * u * 0.03;
  y += bob;
  // 그림자
  ctx.fillStyle = 'rgba(40,20,10,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 1.45, u * 1.15, u * 0.22, 0, 0, TAU);
  ctx.fill();
  // 꼬리
  const sw = Math.sin(t / (mood === 'worry' ? 6 : 16)) * 0.5;
  ctx.strokeStyle = OR2;
  ctx.lineWidth = u * 0.34;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + u * 0.7, y + u * 1.2);
  ctx.quadraticCurveTo(x + u * 1.6, y + u * 1.0, x + u * (1.35 + sw * 0.4), y + u * (0.2 - sw * 0.2));
  ctx.stroke();
  ctx.strokeStyle = OR;
  ctx.lineWidth = u * 0.24;
  ctx.stroke();
  // 몸
  const bg = ctx.createRadialGradient(x - u * 0.3, y + u * 0.4, u * 0.2, x, y + u * 0.8, u * 1.2);
  bg.addColorStop(0, '#ffb769');
  bg.addColorStop(1, OR2);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.85, u * 0.95, u * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.95, u * 0.45, u * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,70,20,.45)';
  ctx.lineWidth = u * 0.1;
  for (const sx of [-1, 1])
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x + sx * u * (0.62 + k * 0.08), y + u * (0.45 + k * 0.25));
      ctx.lineTo(x + sx * u * (0.88 + k * 0.03), y + u * (0.55 + k * 0.25));
      ctx.stroke();
    }
  // 앞발 (탁 치는 중이면 한쪽이 쭉)
  const swat = pawAge < 16 ? Math.sin((pawAge / 16) * Math.PI) : 0;
  for (const sx of [-1, 1]) {
    let px = x + sx * u * 0.38, py = y + u * 1.4;
    if (mood === 'cheer') py -= u * 0.9;
    if (swat > 0 && sx === (pawDir < 0 ? -1 : 1)) (px += sx * u * 0.3 * swat), (py -= u * 1.3 * swat);
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.ellipse(px, py, u * 0.26, u * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,60,20,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (swat > 0.3 && sx === (pawDir < 0 ? -1 : 1)) {
      ctx.fillStyle = '#ff9db5';
      for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.arc(px + k * u * 0.1, py - u * 0.06, u * 0.045, 0, TAU), ctx.fill());
    }
  }
  // 머리
  const lx = Math.max(-1, Math.min(1, look)) * u * 0.18, hy = y - u * 0.15 + (mood === 'smug' ? -u * 0.06 : 0);
  const hx = x + lx;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = OR2;
    ctx.beginPath();
    ctx.moveTo(hx + sx * u * 0.72, hy - u * 0.2);
    ctx.lineTo(hx + sx * u * (mood === 'worry' ? 0.85 : 0.62), hy - u * (mood === 'worry' ? 0.75 : 1.0));
    ctx.lineTo(hx + sx * u * 0.2, hy - u * 0.62);
    ctx.fill();
    ctx.fillStyle = '#ffb3c0';
    ctx.beginPath();
    ctx.moveTo(hx + sx * u * 0.6, hy - u * 0.3);
    ctx.lineTo(hx + sx * u * (mood === 'worry' ? 0.75 : 0.58), hy - u * (mood === 'worry' ? 0.62 : 0.82));
    ctx.lineTo(hx + sx * u * 0.32, hy - u * 0.58);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(hx - u * 0.25, hy - u * 0.3, u * 0.1, hx, hy, u * 0.85);
  hg.addColorStop(0, '#ffc07a');
  hg.addColorStop(1, OR);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.82, u * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,70,20,.5)';
  ctx.lineWidth = u * 0.09;
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(hx + k * u * 0.16, hy - u * 0.66);
    ctx.lineTo(hx + k * u * 0.12, hy - u * 0.42);
    ctx.stroke();
  }
  ctx.fillStyle = CREAM;
  ctx.beginPath();
  ctx.ellipse(hx, hy + u * 0.3, u * 0.42, u * 0.28, 0, 0, TAU);
  ctx.fill();
  // 눈
  const ey = hy - u * 0.08, ex = u * 0.32, pl = Math.max(-1, Math.min(1, look)) * u * 0.07;
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineWidth = Math.max(1.3, u * 0.09);
  if (mood === 'smug' || mood === 'cheer') {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(hx + sx * ex, ey + u * 0.05, u * 0.13, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
  } else if (mood === 'tangled') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) {
        const rr = u * 0.02 * a;
        const px = hx + sx * ex + Math.cos(a + t / 4) * rr, py = ey + Math.sin(a + t / 4) * rr;
        if (a) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
  } else if (mood === 'idle' && Math.sin(t / 70) > 0.3) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(hx + sx * ex - u * 0.13, ey), ctx.lineTo(hx + sx * ex + u * 0.13, ey), ctx.stroke());
  } else {
    const big = mood === 'wow' || mood === 'huh' || mood === 'worry' ? 1.25 : 1;
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#fffbe8';
      ctx.beginPath();
      ctx.ellipse(hx + sx * ex, ey, u * 0.16 * big, u * 0.19 * big, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5a8f2a';
      ctx.beginPath();
      ctx.ellipse(hx + sx * ex + pl, ey + u * 0.02, u * 0.11 * big, u * 0.15 * big, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(hx + sx * ex + pl, ey + u * 0.02, u * 0.04 * big, u * 0.12 * big, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(hx + sx * ex + pl - u * 0.04, ey - u * 0.06, u * 0.035, 0, TAU);
      ctx.fill();
    }
  }
  // 코·입·수염
  ctx.fillStyle = '#ff7f96';
  ctx.beginPath();
  ctx.moveTo(hx - u * 0.07, hy + u * 0.16);
  ctx.lineTo(hx + u * 0.07, hy + u * 0.16);
  ctx.lineTo(hx, hy + u * 0.24);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.beginPath();
  if (mood === 'wow' || mood === 'huh' || mood === 'tangled') {
    ctx.ellipse(hx, hy + u * 0.38, u * 0.08, u * (mood === 'tangled' ? 0.06 : 0.1), 0, 0, TAU);
    ctx.fillStyle = '#7a2a2a';
    ctx.fill();
  } else {
    ctx.moveTo(hx - u * 0.14, hy + u * 0.3);
    ctx.quadraticCurveTo(hx - u * 0.07, hy + u * (mood === 'smug' || mood === 'cheer' ? 0.42 : 0.36), hx, hy + u * 0.26);
    ctx.quadraticCurveTo(hx + u * 0.07, hy + u * (mood === 'smug' || mood === 'cheer' ? 0.42 : 0.36), hx + u * 0.14, hy + u * 0.3);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const sx of [-1, 1])
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(hx + sx * u * 0.36, hy + u * 0.24 + k * u * 0.07);
      ctx.lineTo(hx + sx * u * 0.95, hy + u * 0.18 + k * u * 0.13);
      ctx.stroke();
    }
  if (mood === 'worry') {
    ctx.fillStyle = '#9fd8ff';
    ctx.beginPath();
    const dx = hx + u * 0.72, dy = hy - u * 0.35 + ((t / 2) % 10) * u * 0.02;
    ctx.moveTo(dx, dy - u * 0.16);
    ctx.quadraticCurveTo(dx + u * 0.12, dy + u * 0.04, dx, dy + u * 0.08);
    ctx.quadraticCurveTo(dx - u * 0.12, dy + u * 0.04, dx, dy - u * 0.16);
    ctx.fill();
  }
  if (mood === 'smug') {
    ctx.fillStyle = '#fff4a8';
    for (let k = 0; k < 3; k++) {
      const a = t / 12 + k * 2.1, px = hx + Math.cos(a) * u * 1.1, py = hy - u * 0.8 + Math.sin(a) * u * 0.3;
      star(ctx, px, py, u * 0.12);
      ctx.fill();
    }
  }
  if (mood === 'tangled') {
    // 실에 칭칭 감김 + 어질어질 별
    ctx.lineWidth = Math.max(1.5, u * 0.08);
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = COLS[k % COLS.length];
      ctx.beginPath();
      ctx.ellipse(x, y + u * (0.3 + k * 0.28), u * (1.0 - k * 0.05), u * 0.18, Math.sin(t / 9 + k) * 0.25, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 3; k++) {
      const a = t / 8 + (k * TAU) / 3;
      star(ctx, hx + Math.cos(a) * u * 0.9, hy - u * 0.9 + Math.sin(a) * u * 0.22, u * 0.13);
      ctx.fill();
    }
  }
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawBasket(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, col: number, got: number, lid: number, glow: number) {
  const bh = bw * 0.48, top = y - bh * 0.15;
  // 그림자
  ctx.fillStyle = 'rgba(40,20,10,.35)';
  ctx.beginPath();
  ctx.ellipse(x, top + bh + bw * 0.03, bw * 0.52, bw * 0.07, 0, 0, TAU);
  ctx.fill();
  if (glow > 0) {
    ctx.save();
    ctx.shadowColor = '#fff3a0';
    ctx.shadowBlur = 16 * glow;
    ctx.fillStyle = `rgba(255,240,160,${0.35 * glow})`;
    ctx.beginPath();
    ctx.ellipse(x, top + bh * 0.5, bw * 0.62, bh * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 안쪽(입구)
  ctx.fillStyle = '#5a3418';
  ctx.beginPath();
  ctx.ellipse(x, top, bw * 0.5, bw * 0.11, 0, 0, TAU);
  ctx.fill();
  // 들어간 털실
  for (let k = 0; k < Math.min(CAP, got); k++) drawYarn(ctx, x + (k - 1) * bw * 0.27, top - bw * 0.03 + (k === 1 ? -bw * 0.04 : 0), bw * 0.15, col, k * 1.7);
  // 몸통 (엮은 무늬)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - bw * 0.5, top);
  ctx.lineTo(x + bw * 0.5, top);
  ctx.lineTo(x + bw * 0.42, top + bh);
  ctx.quadraticCurveTo(x, top + bh + bw * 0.06, x - bw * 0.42, top + bh);
  ctx.closePath();
  const wg = ctx.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  wg.addColorStop(0, '#b77a3e');
  wg.addColorStop(0.45, '#e2ad6a');
  wg.addColorStop(1, '#a86c33');
  ctx.fillStyle = wg;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = 'rgba(90,50,20,.45)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 5; k++) (ctx.beginPath(), ctx.moveTo(x - bw * 0.5, top + (bh * k) / 5), ctx.lineTo(x + bw * 0.5, top + (bh * k) / 5), ctx.stroke());
  for (let k = -5; k <= 5; k++)
    for (let r = 0; r < 5; r++) {
      const cx = x + k * bw * 0.1 + (r % 2 ? bw * 0.05 : 0), cy = top + (bh * (r + 0.5)) / 5;
      ctx.fillStyle = 'rgba(255,230,180,.22)';
      ctx.fillRect(cx - bw * 0.035, cy - bh * 0.06, bw * 0.07, bh * 0.1);
    }
  // 색 띠
  ctx.fillStyle = COLS[col];
  ctx.fillRect(x - bw * 0.5, top + bh * 0.36, bw, bh * 0.26);
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.fillRect(x - bw * 0.5, top + bh * 0.36, bw, bh * 0.06);
  ctx.restore();
  // 채움 점
  for (let k = 0; k < CAP; k++) {
    const px = x + (k - 1) * bw * 0.2, py = top + bh * 0.49;
    ctx.fillStyle = k < got ? '#fff8e6' : 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.arc(px, py, bw * 0.045, 0, TAU);
    ctx.fill();
  }
  // 테두리
  ctx.strokeStyle = '#8a5527';
  ctx.lineWidth = Math.max(2, bw * 0.045);
  ctx.beginPath();
  ctx.ellipse(x, top, bw * 0.5, bw * 0.11, 0, Math.PI, TAU);
  ctx.stroke();
  ctx.strokeStyle = '#c99050';
  ctx.beginPath();
  ctx.ellipse(x, top, bw * 0.5, bw * 0.11, 0, 0, Math.PI);
  ctx.stroke();
  if (lid > 0) {
    // 뚜껑 덮기
    const ly = top - bw * 0.25 * (1 - lid);
    ctx.fillStyle = '#c98c4a';
    ctx.beginPath();
    ctx.ellipse(x, ly, bw * 0.53, bw * 0.13, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a5527';
    ctx.stroke();
    ctx.fillStyle = COLS[col];
    ctx.beginPath();
    ctx.arc(x, ly - bw * 0.04, bw * 0.06, 0, TAU);
    ctx.fill();
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: YarnState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, S = s.S, L = s.L, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  /** 바닥 좌표 → 화면 px */
  const PXs = (x: number, y: number) => X(PX(x, y)), PYs = (y: number) => Y(SY(y));
  const rS = (r: number, y: number) => R(r) * (0.9 + 0.1 * Math.max(0, Math.min(1, y / FH)));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 45 && Math.abs(q.x - x) < w * 0.35 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(tw, Math.min(w - tw, x)), y, text, col, size);
  };
  // ═════════ 사건 → 연출 ═════════
  for (const e of s.events) {
    if (doneEv.has(e)) continue;
    doneEv.add(e);
    const ex = X(e.x), ey = Y(e.y), cc = e.v !== undefined && e.v >= 0 && e.v < COLS.length ? COLS[e.v] : '#ffffff';
    switch (e.kind) {
      case 'roll': fx.burst(ex, ey, '#f7e3c4', 8, 2.2, 2.5); fx.ring(ex, ey, '#fff3d6', R(0.07), 3); break;
      case 'chain': fx.burst(ex, ey, cc, 16, 3.5, 3); fx.ring(ex, ey, cc, R(0.08), 3); fx.kick(2); break;
      case 'oopsS': fx.burst(ex, ey, '#ffb4a8', 10, 2.5, 2.5); break;
      case 'chainbig': say(ex, ey, e.text!, '#fff1a8', R(0.05 + (e.v ?? 1) * 0.008)); fx.kick(3 + (e.v ?? 1) * 2); break;
      case 'oops': say(ex, ey, e.text!, '#ffc2b8', R(0.042)); fx.kick(2); break;
      case 'in': fx.burst(ex, ey, cc, 12, 2.8, 2.6); break;
      case 'tray': fx.burst(ex, ey, '#d9c3a8', 8, 2, 2); fx.ring(ex, ey, '#ffb4a8', R(0.06), 3); fx.kick(2); break;
      case 'one': say(ex, ey - R(0.05), e.text!, '#ffe066', R(0.072)); fx.ring(ex, Y(BASK_Y), '#ffe066', R(0.3), 6); fx.burst(ex, Y(BASK_Y), '#ffe066', 36, 5, 3.5); fx.burst(ex, Y(BASK_Y), cc, 24, 4, 3); fx.kick(9); fx.blink('#fff6c0', 0.3); break;
      case 'done': fx.ring(ex, ey, '#fff3c4', R(0.16), 4); fx.pop(X(CAT_X), Y(BASK_Y - 0.12), '냥~ 가져갈게', '#fff6dc', R(0.038)); break;
      case 'snap': say(ex, ey - R(0.03), e.text!, '#ffd29a', R(0.05)); fx.burst(ex, ey, '#fff0d8', 14, 3, 2); fx.kick(4); break;
      case 'stall': say(ex, ey - R(0.05), e.text!, '#ffc9a8', R(0.05)); fx.kick(3); break;
      case 'cut': say(ex, ey - R(0.05), e.text!, '#e8f4ff', R(0.052)); fx.burst(ex, ey, '#dfe9f5', 16, 3.5, 2.4); fx.kick(3); break;
      case 'nope': case 'miss': say(ex, ey, e.text!, '#fff3df', R(0.04)); break;
      case 'jam': fx.kick(11); fx.blink('#ff7060', 0.3); say(ex, ey - R(0.05), e.text!, '#ffb4a8', R(0.07)); break;
      case 'clear': for (let k = 0; k < 6; k++) fx.burst(X(0.15 + k * 0.14), Y(0.6 + (k % 2) * 0.12), COLS[k], 16, 4.5, 3); fx.blink('#fff7d8', 0.25); break;
      case 'fail': fx.kick(6); break;
    }
  }

  ctx.fillStyle = '#3a2517';
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#3a2517';
  ctx.fillRect(-20, -20, w + 40, h + 40);
  const hb = R(0.075), yb = PYs(0), yf = PYs(FH), xl = PXs(0, 0), xr = PXs(1, 0);
  // ═════════ 방: 뒷벽 · 옆벽 ═════════
  {
    const wall = ctx.createLinearGradient(0, hb, 0, yb);
    wall.addColorStop(0, '#e6bd94');
    wall.addColorStop(1, '#f6dcbc');
    ctx.fillStyle = wall;
    ctx.fillRect(-10, -10, w + 20, yb + 10);
    for (let k = 0; k < 13; k++) {
      ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.14)' : 'rgba(190,120,80,.07)';
      ctx.fillRect(xl + ((xr - xl) * k) / 13, hb, (xr - xl) / 26, yb - hb);
    }
    ctx.fillStyle = 'rgba(200,110,90,.22)';
    for (let k = 0; k < 13; k++) for (let r = 0; r < 3; r++) (ctx.beginPath(), ctx.arc(xl + ((xr - xl) * (k + 0.75)) / 13, Y(0.115 + r * 0.05), R(0.005), 0, TAU), ctx.fill());
    // 옆벽 (조금 어둡게 — 방 안을 들여다보는 느낌)
    for (const side of [0, 1]) {
      const xe = side ? xr : xl, xo = side ? w : 0;
      const sg = ctx.createLinearGradient(xo, 0, xe, 0);
      sg.addColorStop(0, '#b98a62');
      sg.addColorStop(1, '#d9ab80');
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(xo, hb);
      ctx.lineTo(xe, hb);
      ctx.lineTo(xe, yb);
      ctx.lineTo(xo, yf);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(90,55,30,.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xe, hb);
      ctx.lineTo(xe, yb);
      ctx.stroke();
    }
  }
  // 창문 + 커튼
  {
    const x0 = X(0.12), y0 = Y(0.098), ww = R(0.2), wh = R(0.12);
    ctx.fillStyle = '#8a5a35';
    ctx.fillRect(x0 - R(0.012), y0 - R(0.012), ww + R(0.024), wh + R(0.03));
    const sky = ctx.createLinearGradient(0, y0, 0, y0 + wh);
    sky.addColorStop(0, '#8fd0ff');
    sky.addColorStop(1, '#e4f6ff');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, ww, wh);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const [cx, cy, cr] of [[0.17, 0.13, 0.018], [0.19, 0.125, 0.022], [0.27, 0.15, 0.015]]) (ctx.beginPath(), ctx.arc(X(cx), Y(cy), R(cr), 0, TAU), ctx.fill());
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(X(0.29), Y(0.115), R(0.014), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7fbf6a';
    ctx.beginPath();
    ctx.ellipse(X(0.24), y0 + wh, R(0.08), R(0.028), 0, Math.PI, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a5a35';
    ctx.lineWidth = R(0.008);
    ctx.beginPath();
    ctx.moveTo(x0 + ww / 2, y0);
    ctx.lineTo(x0 + ww / 2, y0 + wh);
    ctx.moveTo(x0, y0 + wh / 2);
    ctx.lineTo(x0 + ww, y0 + wh / 2);
    ctx.stroke();
    ctx.fillStyle = '#e26d5c';
    for (const sx of [0, 1]) {
      const cx = sx ? x0 + ww + R(0.01) : x0 - R(0.01), dir = sx ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx - dir * R(0.02), y0 - R(0.016));
      ctx.lineTo(cx + dir * R(0.025), y0 - R(0.016));
      ctx.quadraticCurveTo(cx + dir * R(0.045), y0 + wh * 0.5, cx + dir * R(0.012), y0 + wh + R(0.03));
      ctx.lineTo(cx - dir * R(0.02), y0 + wh + R(0.03));
      ctx.fill();
    }
    ctx.fillStyle = '#c4523f';
    ctx.fillRect(x0 - R(0.04), y0 - R(0.022), ww + R(0.08), R(0.009));
  }
  // 액자 (털실 그림)
  if (!L.sofa) {
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(X(0.44), Y(0.105), R(0.12), R(0.09));
    ctx.fillStyle = '#fbf1de';
    ctx.fillRect(X(0.45), Y(0.115), R(0.1), R(0.07));
    drawYarn(ctx, X(0.5), Y(0.15), R(0.022), 0, 0.4);
  }
  // 선반 + 금붕어 어항(구경꾼) + 화분
  {
    const sy0 = Y(0.205);
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.fillRect(X(0.64), sy0 + R(0.012), R(0.26), R(0.012));
    ctx.fillStyle = '#9a6235';
    ctx.fillRect(X(0.64), sy0, R(0.26), R(0.014));
    ctx.fillStyle = '#c7643f';
    ctx.beginPath();
    ctx.moveTo(X(0.665), sy0);
    ctx.lineTo(X(0.705), sy0);
    ctx.lineTo(X(0.7), sy0 - R(0.035));
    ctx.lineTo(X(0.67), sy0 - R(0.035));
    ctx.fill();
    ctx.fillStyle = '#4f9a4a';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.ellipse(X(0.685 + (k - 1.5) * 0.012), sy0 - R(0.05 + (k % 2) * 0.01), R(0.01), R(0.025), (k - 1.5) * 0.4, 0, TAU), ctx.fill());
    const bx = X(0.82), by = sy0 - R(0.042), br = R(0.044);
    ctx.fillStyle = 'rgba(170,220,255,.6)';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const big = s.events.find((e) => (e.kind === 'one' || e.kind === 'chainbig') && t - e.t < 34);
    const jump = big ? Math.sin(((t - big.t) / 34) * Math.PI) * br * 0.95 : 0;
    const fxp = bx + Math.sin(t / 30) * br * 0.45, fyp = by + br * 0.12 - jump, face = Math.cos(t / 30) > 0 ? 1 : -1;
    ctx.fillStyle = '#ff8a2b';
    ctx.beginPath();
    ctx.ellipse(fxp, fyp, br * 0.32, br * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(fxp - face * br * 0.25, fyp);
    ctx.lineTo(fxp - face * br * 0.52, fyp - br * 0.18);
    ctx.lineTo(fxp - face * br * 0.52, fyp + br * 0.18);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(fxp + face * br * 0.16, fyp - br * 0.04, jump > br * 0.3 ? 2.4 : 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    for (let k = 0; k < 2; k++) (ctx.beginPath(), ctx.arc(bx + br * 0.3, by - (((t / 2 + k * 20) % 40) / 40) * br, 1.5, 0, TAU), ctx.fill());
    if (big && t - big.t === 2) fx.pop(bx - br - R(0.05), by + br * 0.3, '뻐끔!', '#cfeeff', R(0.036));
  }
  // 소파 (등받이는 벽 앞, 밑은 어두운 틈)
  if (L.sofa) {
    const [sx0, sx1, sy1] = L.sofa, x0 = PXs(sx0 - 0.05, 0), x1 = PXs(sx1 + 0.05, 0), top = Y(0.1), seat = PYs(0.03);
    ctx.fillStyle = 'rgba(30,15,10,.42)';
    ctx.beginPath();
    ctx.moveTo(PXs(sx0, 0), PYs(0));
    ctx.lineTo(PXs(sx1, 0), PYs(0));
    ctx.lineTo(PXs(sx1, sy1), PYs(sy1));
    ctx.lineTo(PXs(sx0, sy1), PYs(sy1));
    ctx.fill();
    const sg = ctx.createLinearGradient(0, top, 0, seat);
    sg.addColorStop(0, '#6b9cbd');
    sg.addColorStop(1, '#3f6b8a');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.roundRect(x0 + R(0.04), top, x1 - x0 - R(0.08), seat - top, R(0.03));
    ctx.fill();
    ctx.fillStyle = '#86b3d1';
    const cw = (x1 - x0 - R(0.13)) / 3;
    for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.roundRect(x0 + R(0.065) + k * cw, top + R(0.012), cw - R(0.01), R(0.075), R(0.022)), ctx.fill());
    ctx.fillStyle = '#4c7a99';
    ctx.beginPath();
    ctx.roundRect(x0 + R(0.03), seat - R(0.055), x1 - x0 - R(0.06), R(0.055), R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(x0 + R(0.05), seat - R(0.05), x1 - x0 - R(0.1), R(0.008));
    ctx.fillStyle = '#4a7898';
    for (const ax of [x0, x1 - R(0.075)]) (ctx.beginPath(), ctx.roundRect(ax, top + R(0.03), R(0.075), seat - top - R(0.005), R(0.03)), ctx.fill());
  }
  // 걸레받이 + 생쥐 구멍(구경꾼)
  ctx.fillStyle = '#a8703f';
  ctx.fillRect(xl, yb - R(0.018), xr - xl, R(0.018));
  ctx.fillStyle = 'rgba(255,255,255,.2)';
  ctx.fillRect(xl, yb - R(0.018), xr - xl, R(0.004));
  {
    const mx = X(0.885), my = yb;
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.ellipse(mx, my, R(0.026), R(0.032), 0, Math.PI, TAU);
    ctx.fill();
    const near = S.B.some((b) => b.aw && b.y < 0.3 && b.x > 0.7);
    const peek = near ? 0 : Math.max(0, Math.sin(t / 55));
    if (peek > 0.05) {
      const pyy = my - R(0.008) - peek * R(0.012);
      ctx.fillStyle = '#b9b2ad';
      ctx.beginPath();
      ctx.arc(mx, pyy, R(0.013), 0, TAU);
      ctx.fill();
      for (const sx of [-1, 1]) (ctx.fillStyle = '#d9a5ad', ctx.beginPath(), ctx.arc(mx + sx * R(0.011), pyy - R(0.011), R(0.0065), 0, TAU), ctx.fill());
      ctx.fillStyle = '#222';
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(mx + sx * R(0.005), pyy - R(0.002), 1.2, 0, TAU), ctx.fill());
    }
  }

  // ═════════ 바닥 (원목 마루 · 동그란 러그 · 햇살) ═════════
  const quad = (x0: number, y0: number, x1: number, y1: number) => {
    ctx.beginPath();
    ctx.moveTo(PXs(x0, y0), PYs(y0));
    ctx.lineTo(PXs(x1, y0), PYs(y0));
    ctx.lineTo(PXs(x1, y1), PYs(y1));
    ctx.lineTo(PXs(x0, y1), PYs(y1));
    ctx.closePath();
  };
  {
    const fl = ctx.createLinearGradient(0, yb, 0, yf);
    fl.addColorStop(0, '#9c6a38');
    fl.addColorStop(1, '#c99257');
    ctx.fillStyle = fl;
    quad(0, 0, 1, FH);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,45,20,.3)';
    ctx.lineWidth = 1;
    for (let k = 1; k * 0.062 < FH; k++) {
      const y0 = (k - 1) * 0.062, y1 = k * 0.062;
      ctx.beginPath();
      ctx.moveTo(PXs(0, y1), PYs(y1));
      ctx.lineTo(PXs(1, y1), PYs(y1));
      ctx.stroke();
      for (let j = 0; j < 3; j++) {
        const xx = (hsh(k * 7 + j) + j / 3) % 1;
        ctx.beginPath();
        ctx.moveTo(PXs(xx, y0), PYs(y0));
        ctx.lineTo(PXs(xx, y1), PYs(y1));
        ctx.stroke();
      }
    }
    if (L.wax) {
      const g2 = ctx.createLinearGradient(0, PYs(L.wax[1]), 0, yf);
      g2.addColorStop(0, 'rgba(255,236,190,.4)');
      g2.addColorStop(1, 'rgba(255,248,226,.55)');
      ctx.fillStyle = g2;
      quad(0, L.wax[1], 1, FH);
      ctx.fill();
      ctx.save();
      quad(0, L.wax[1], 1, FH);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,.4)';
      ctx.lineWidth = R(0.022);
      for (let k = 0; k < 5; k++) {
        const xx = X(((k * 0.24 + t * 0.0006) % 1.2) - 0.1);
        ctx.beginPath();
        ctx.moveTo(xx, PYs(L.wax[1]));
        ctx.lineTo(xx + R(0.12), yf);
        ctx.stroke();
      }
      ctx.restore();
      for (let k = 0; k < 6; k++) {
        const ph = (t / 40 + k * 1.7) % 3;
        if (ph > 1) continue;
        ctx.fillStyle = `rgba(255,255,255,${0.9 * Math.sin(ph * Math.PI)})`;
        const yy = L.wax[1] + 0.04 + hsh(k + 9) * 0.22;
        star(ctx, PXs(hsh(k + 3) * 0.9 + 0.05, yy), PYs(yy), R(0.013));
        ctx.fill();
      }
    }
    // 동그란 러그 (술 장식)
    const ry0 = L.sofa ? L.sofa[2] + 0.02 : 0.035, ry1 = L.wax ? L.wax[1] - 0.02 : FH - 0.04, rcy = (ry0 + ry1) / 2, rry = (ry1 - ry0) / 2;
    const oval = (rx: number, ryy: number, dy = 0) => {
      ctx.beginPath();
      for (let k = 0; k <= 48; k++) {
        const a = (k / 48) * TAU, x = 0.5 + Math.cos(a) * rx, y = rcy + Math.sin(a) * ryy;
        if (k) ctx.lineTo(PXs(x, y), PYs(y) + dy);
        else ctx.moveTo(PXs(x, y), PYs(y) + dy);
      }
      ctx.closePath();
    };
    ctx.fillStyle = 'rgba(60,30,10,.28)';
    oval(0.47, rry, 4);
    ctx.fill();
    ctx.fillStyle = '#d58d68';
    oval(0.47, rry);
    ctx.fill();
    ctx.strokeStyle = '#f7e6c8';
    ctx.lineWidth = R(0.013);
    oval(0.43, rry * 0.86);
    ctx.stroke();
    ctx.fillStyle = '#c47458';
    oval(0.32, rry * 0.6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(247,230,200,.6)';
    ctx.lineWidth = R(0.007);
    oval(0.2, rry * 0.36);
    ctx.stroke();
    ctx.strokeStyle = '#f7e6c8';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 40; k++) {
      const a = (k / 40) * TAU, x = 0.5 + Math.cos(a) * 0.47, y = rcy + Math.sin(a) * rry, x2 = 0.5 + Math.cos(a) * 0.495, y2 = rcy + Math.sin(a) * (rry + 0.025);
      if (Math.abs(Math.cos(a)) < 0.55) continue;
      ctx.beginPath();
      ctx.moveTo(PXs(x, y), PYs(y));
      ctx.lineTo(PXs(x2, y2), PYs(y2));
      ctx.stroke();
    }
    // 햇살
    ctx.save();
    quad(0, 0, 1, FH);
    ctx.clip();
    const sun = ctx.createLinearGradient(X(0.2), yb, X(0.55), yf);
    sun.addColorStop(0, 'rgba(255,240,190,.26)');
    sun.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = sun;
    ctx.beginPath();
    ctx.moveTo(X(0.12), yb);
    ctx.lineTo(X(0.33), yb);
    ctx.lineTo(X(0.66), yf);
    ctx.lineTo(X(0.28), yf);
    ctx.fill();
    ctx.restore();
  }

  // ═════════ 가위 ═════════
  const pv = s.down && s.press !== -1 && s.press > -2 && s.phase === 'play' && !S.moving ? preview(s, s.press) : null;
  const cutNow = pv && pv.m === SCI ? pv.cut : [];
  if (L.sc) {
    const [sx, syy] = L.sc, px = PXs(sx, syy), py = PYs(syy), u = rS(0.056, syy), can = sciRopes(S).length > 0;
    const snip = s.events.find((e) => e.kind === 'cut' && t - e.t < 20);
    const open = snip ? 0.05 : 0.45 + Math.sin(t / 18) * 0.05;
    if (can && s.phase === 'play') {
      ctx.fillStyle = `rgba(255,255,255,${0.22 + 0.1 * Math.sin(t / 10)})`;
      ctx.beginPath();
      ctx.arc(px, py, u * 1.25, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 0.3;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = 'rgba(40,20,10,.3)';
    ctx.beginPath();
    ctx.ellipse(px + 2, py + 4, u * 1.1, u * 0.35, 0, 0, TAU);
    ctx.fill();
    for (const sg of [-1, 1]) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-0.6 + sg * open);
      ctx.fillStyle = '#e4ebf2';
      ctx.strokeStyle = '#7d8b99';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.07);
      ctx.lineTo(u * 1.15, -u * 0.02 * sg);
      ctx.lineTo(0, u * 0.13);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = sg > 0 ? '#e8504a' : '#3d7fe0';
      ctx.lineWidth = Math.max(2.5, u * 0.17);
      ctx.beginPath();
      ctx.ellipse(-u * 0.5, sg * u * 0.12, u * 0.32, u * 0.2, 0, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#9aa6b2';
    ctx.beginPath();
    ctx.arc(px, py, u * 0.1, 0, TAU);
    ctx.fill();
  }

  // ═════════ 실 ═════════
  S.R.forEach((r, j) => {
    if (!r.on) return;
    const a = S.B[r.a], b = S.B[r.b];
    if (a.st >= 2 || b.st >= 2) return;
    const ax = PXs(a.x, Math.min(a.y, FH)), ay = PYs(a.y), bx = PXs(b.x, Math.min(b.y, FH)), by = PYs(b.y), dd = Math.hypot(b.x - a.x, b.y - a.y);
    const slack = Math.max(0, r.len - dd), nx = -(by - ay), ny = bx - ax, nl = Math.hypot(nx, ny) || 1, side = (r.a + r.b) % 2 ? 1 : -1;
    const bend = Math.min(R(0.07), R(slack) * 0.9) * side;
    const mx = (ax + bx) / 2 + (nx / nl) * bend, my = (ay + by) / 2 + (ny / nl) * bend + R(slack) * 0.3;
    const taut = slack < 0.004, cutting = cutNow.includes(j);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(40,20,10,.35)';
    ctx.lineWidth = R(0.011);
    ctx.beginPath();
    ctx.moveTo(ax, ay + 2);
    ctx.quadraticCurveTo(mx, my + 2, bx, by + 2);
    ctx.stroke();
    const rg = ctx.createLinearGradient(ax, ay, bx, by);
    rg.addColorStop(0, LIGHT[a.col]);
    rg.addColorStop(0.5, '#fff6e6');
    rg.addColorStop(1, LIGHT[b.col]);
    ctx.strokeStyle = cutting ? (t % 10 < 5 ? '#ff6b5a' : '#ffffff') : rg;
    ctx.lineWidth = R(taut ? 0.009 : 0.0075);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();
    if (taut && S.moving) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = R(0.003);
      ctx.stroke();
    }
    if (r.k > 0) {
      ctx.strokeStyle = '#ff7a3a';
      ctx.lineWidth = R(0.005);
      ctx.stroke();
    }
    if (cutting) {
      ctx.fillStyle = '#ffffff';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✂️', mx, my - R(0.03));
    }
  });

  // ═════════ 바닥 위 물건 (뒤 → 앞): 뭉치 · 의자 다리 ═════════
  const items: { y: number; k: number; i: number }[] = [];
  S.B.forEach((b, i) => b.st === 0 && items.push({ y: b.y, k: 0, i }));
  L.posts.forEach((p, i) => items.push({ y: p[1], k: 1, i }));
  items.sort((a, b) => a.y - b.y);
  const LEG_H = 0.11;
  for (const it of items) {
    if (it.k === 1) {
      const p = L.posts[it.i], px = PXs(p[0], p[1]), py = PYs(p[1]), lw = rS(PR * 1.05, p[1]), lh = R(LEG_H);
      ctx.fillStyle = 'rgba(40,20,10,.35)';
      ctx.beginPath();
      ctx.ellipse(px + 2, py + 3, lw * 1.4, lw * 0.5, 0, 0, TAU);
      ctx.fill();
      const lg = ctx.createLinearGradient(px - lw, 0, px + lw, 0);
      lg.addColorStop(0, '#6a3e20');
      lg.addColorStop(0.45, '#c08350');
      lg.addColorStop(1, '#5a3418');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.moveTo(px - lw * 0.75, py - lh);
      ctx.lineTo(px + lw * 0.75, py - lh);
      ctx.lineTo(px + lw, py);
      ctx.lineTo(px - lw, py);
      ctx.fill();
      ctx.fillStyle = '#4a2a14';
      ctx.beginPath();
      ctx.ellipse(px, py, lw, lw * 0.42, 0, 0, TAU);
      ctx.fill();
      continue;
    }
    const b = S.B[it.i], bx = PXs(b.x, b.y), by = PYs(b.y), rr = rS(b.r, b.y), hide = underSofa(L, b);
    ctx.fillStyle = 'rgba(40,20,10,.38)';
    ctx.beginPath();
    ctx.ellipse(bx + rr * 0.18, by + rr * 0.78, rr * 0.98, rr * 0.3, 0, 0, TAU);
    ctx.fill();
    const lift = b.drv ? Math.abs(Math.sin(t / 3)) * R(0.006) : 0;
    drawYarn(ctx, bx, by - lift, rr, b.col, (b.x * 9 + b.y * 13) * 2.2, b.hv);
    if (hide) {
      ctx.fillStyle = 'rgba(20,12,30,.48)';
      ctx.beginPath();
      ctx.arc(bx, by, rr + 1, 0, TAU);
      ctx.fill();
    }
    if (pv && pv.m === it.i) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, rr + R(0.012) + Math.sin(t / 4) * 1.5, 0, TAU);
      ctx.stroke();
    }
  }
  // 의자 앉는 판 (반투명 — 밑이 보이게)
  if (L.posts.length === 4) {
    const p = L.posts, top = p.map((q) => [PXs(q[0], q[1]), PYs(q[1]) - R(LEG_H)]);
    const order = [0, 1, 3, 2], pad = R(0.022);
    ctx.fillStyle = 'rgba(176,112,62,.5)';
    ctx.strokeStyle = 'rgba(100,58,28,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    order.forEach((k, n) => {
      const [x, y] = top[k], ox = k % 2 ? pad : -pad, oy = k < 2 ? -pad * 0.6 : pad * 0.6;
      if (n) ctx.lineTo(x + ox, y + oy);
      else ctx.moveTo(x + ox, y + oy);
    });
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 등받이
    const [ax, ay] = top[0], [bx2] = top[1];
    ctx.fillStyle = 'rgba(140,84,42,.75)';
    ctx.beginPath();
    ctx.roundRect(ax - pad, ay - pad * 0.6 - R(0.08), bx2 - ax + pad * 2, R(0.022), R(0.01));
    ctx.fill();
    for (const xx of [ax - pad * 0.6, bx2 + pad * 0.6]) ctx.fillRect(xx - R(0.006), ay - pad * 0.6 - R(0.06), R(0.012), R(0.06));
  }
  // 소파 앞 치마·다리
  if (L.sofa) {
    const [sx0, sx1, sy1] = L.sofa;
    ctx.fillStyle = '#3a6383';
    ctx.beginPath();
    ctx.moveTo(PXs(sx0 - 0.05, 0), PYs(0) - R(0.004));
    ctx.lineTo(PXs(sx1 + 0.05, 0), PYs(0) - R(0.004));
    ctx.lineTo(PXs(sx1 + 0.05, 0), PYs(0) + R(0.026));
    ctx.lineTo(PXs(sx0 - 0.05, 0), PYs(0) + R(0.026));
    ctx.fill();
    ctx.fillStyle = '#2b4c66';
    for (const lx of [sx0 - 0.03, sx1 + 0.03]) {
      ctx.beginPath();
      ctx.moveTo(PXs(lx - 0.012, 0), PYs(0));
      ctx.lineTo(PXs(lx + 0.012, 0), PYs(0));
      ctx.lineTo(PXs(lx + 0.012, sy1), PYs(sy1));
      ctx.lineTo(PXs(lx - 0.012, sy1), PYs(sy1));
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PXs(sx0, sy1), PYs(sy1));
    ctx.lineTo(PXs(sx1, sy1), PYs(sy1));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ═════════ 미리 보기 (누르고 있는 동안) ═════════
  if (pv) drawPreview(ctx, s, pv, X, Y, R, font);
  else if (s.down && s.press <= -2 && s.phase === 'play') {
    const b = S.B[-2 - s.press];
    font(0.038, 900);
    const tx = '🐾 발이 안 닿아요 — 이어진 뭉치로 끌어내요', tw = Math.min(w - 8, ctx.measureText(tx).width + 16), cx = Math.max(4 + tw / 2, Math.min(w - tw / 2 - 4, PXs(b.x, b.y)));
    ctx.fillStyle = 'rgba(30,20,40,.88)';
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, PYs(b.y) + R(0.05), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tx, cx, PYs(b.y) + R(0.075), w - 12);
  }

  // ═════════ 바닥 끝(턱) + 벤치 ═════════
  {
    ctx.fillStyle = '#7d4f2a';
    ctx.fillRect(0, yf, w, R(0.026));
    ctx.fillStyle = 'rgba(255,230,190,.4)';
    ctx.fillRect(0, yf, w, R(0.005));
    const by0 = yf + R(0.026);
    const bg = ctx.createLinearGradient(0, by0, 0, Y(BAND));
    bg.addColorStop(0, '#4f321f');
    bg.addColorStop(1, '#3a2517');
    ctx.fillStyle = bg;
    ctx.fillRect(0, by0, w, Y(BAND) - by0);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.fillRect(0, by0, w, R(0.012));
    ctx.fillStyle = '#c08a55';
    ctx.fillRect(X(0.02), Y(BASK_Y + 0.07), R(0.96), R(0.022));
    ctx.fillStyle = 'rgba(255,240,210,.35)';
    ctx.fillRect(X(0.02), Y(BASK_Y + 0.07), R(0.96), R(0.004));
    ctx.fillStyle = '#8d5c33';
    ctx.fillRect(X(0.02), Y(BASK_Y + 0.092), R(0.96), R(0.016));
  }
  // 열린 바구니 둘 + 떠나는 바구니
  const bw = R(0.205);
  for (let k = 0; k < BO; k++) {
    const q = s.vq[k], f = q[0];
    if (f.col < 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(X(mouthX(k)), Y(BASK_Y), bw * 0.5, bw * 0.11, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const arr = Math.min(1, Math.max(0, (t - f.t0) / 20)), sx = X(mouthX(k)) + (1 - ease(arr)) * R(0.6);
    const glow = pv && pv.ins[k] > 0 ? 0.6 + 0.4 * Math.sin(t / 5) : 0;
    drawBasket(ctx, sx, Y(BASK_Y), bw, f.col, f.got, f.full && f.got >= CAP ? Math.min(1, (t - f.t0) / 8) : 0, glow);
  }
  for (const l of s.lv) {
    const a = (t - l.t0) / 60, lx = X(mouthX(l.slot)) - ease(Math.max(0, a - 0.2) / 0.8) * R(0.7), ly = Y(BASK_Y) - Math.sin(Math.min(1, a * 1.3) * Math.PI) * R(0.06);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, a - 0.7) / 0.3);
    drawBasket(ctx, lx, ly, bw, l.col, CAP, 1, 0);
    ctx.fillStyle = '#fff3e0';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(lx + sx * bw * 0.45, ly + bw * 0.02, bw * 0.08, bw * 0.06, 0, 0, TAU), ctx.fill());
    ctx.globalAlpha = 1;
  }
  // 다음 바구니 (뚜껑 덮인 작은 것)
  {
    const pend: number[] = [];
    for (const q of s.vq) for (const v of q.slice(1)) if (v.col >= 0) pend.push(v.col);
    const nxt = [...pend, ...L.queue.slice(S.qi)].slice(0, 2);
    if (nxt.length) {
      ctx.fillStyle = 'rgba(255,240,220,.85)';
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('다음', X((NEXT_X[0] + NEXT_X[1]) / 2), Y(BASK_Y - 0.06));
    }
    nxt.forEach((c, j) => {
      ctx.globalAlpha = j ? 0.75 : 1;
      drawBasket(ctx, X(NEXT_X[j]), Y(BASK_Y + 0.02), R(0.1), c, 0, 1, 0);
      ctx.globalAlpha = 1;
    });
  }
  // 고양이
  {
    let lead = -1;
    S.B.forEach((b, i) => b.drv && (lead = i));
    const look = lead >= 0 ? (PX(S.B[lead].x, S.B[lead].y) - CAT_X) * 3 : s.down && s.press >= 0 ? (PX(S.B[s.press].x, S.B[s.press].y) - CAT_X) * 3 : Math.sin(t / 90) * 0.5;
    const mood = s.down && s.phase === 'play' && s.mood === 'idle' ? 'huh' : lead >= 0 && s.mood === 'idle' ? 'wow' : s.mood;
    drawCat(ctx, X(CAT_X), Y(BASK_Y - 0.035), R(0.054), mood, t, look, t - s.paw, s.pawX - CAT_X);
  }
  // 대기 칸
  {
    const n = L.slots, ty = Y(TRAY_SY), sr = R(0.043), full = s.trayV.length;
    ctx.fillStyle = full >= n - 1 ? `rgba(255,90,70,${0.2 + 0.1 * Math.sin(t / 6)})` : 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.roundRect(X(slotX(L, 0) - 0.075), ty - sr - R(0.012), X(slotX(L, n - 1) - slotX(L, 0) + 0.15), sr * 2 + R(0.024), R(0.04));
    ctx.fill();
    ctx.fillStyle = '#f6e6cf';
    font(0.034, 900);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText('대기 칸', X(slotX(L, 0) - 0.085), ty);
    for (let i = 0; i < n; i++) {
      const sx = X(slotX(L, i)), last = i === n - 1;
      ctx.fillStyle = last ? '#e9b8a0' : '#e9cfa9';
      ctx.beginPath();
      ctx.ellipse(sx, ty + sr * 0.35, sr * 0.95, sr * 0.55, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = last ? '#d49478' : '#d4b185';
      ctx.beginPath();
      ctx.ellipse(sx, ty + sr * 0.3, sr * 0.7, sr * 0.36, 0, 0, TAU);
      ctx.fill();
      if (last) {
        ctx.strokeStyle = 'rgba(220,70,50,.8)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(sx, ty + sr * 0.35, sr * 0.95, sr * 0.55, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (i < s.trayV.length) drawYarn(ctx, sx, ty, sr * 0.82, s.trayV[i], i * 1.3);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,190,170,.85)';
    font(0.03, 800);
    ctx.fillText(`${n}칸 차면 실패`, X(slotX(L, n - 1) + 0.085), ty, R(0.16));
  }
  if (pv) drawPreview(ctx, s, pv, X, Y, R, font, true);
  // 떨어지는 뭉치 · 대기 칸에서 바구니로 폴짝
  S.B.forEach((b) => {
    if (b.st !== 1) return;
    const f = Math.max(0, Math.min(1, (b.y - FH) / Math.max(0.01, b.ty - FH)));
    const sx = X(b.x), sy = PYs(b.y) - Math.sin(f * Math.PI) * R(0.05), sc = 1 - f * 0.3;
    drawYarn(ctx, sx, sy, R(b.r) * sc, b.col, b.y * 30, b.hv);
  });
  for (const f of s.fly) {
    const a = (t - f.t0) / f.dur;
    if (a < 0 || a > 1 || f.bid < 0) continue;
    const x = f.x0 + (f.x1 - f.x0) * a, y = f.y0 + (f.y1 - f.y0) * a - Math.sin(a * Math.PI) * 0.08;
    drawYarn(ctx, X(x), Y(y), R(0.032), f.col, a * 8);
  }
  ctx.restore();

  drawHud(ctx, s, w, h, th, X, Y, R, font, d);
}

type Fn = (v: number) => number;
type FontFn = (sz: number, wgt?: number) => string;

function drawPreview(ctx: CanvasRenderingContext2D, s: YarnState, pv: Prev, X: Fn, Y: Fn, R: Fn, font: FontFn, late = false) {
  const S = s.S, L = s.L, t = s.t, P = (x: number, y: number) => X(y > FH ? x : PX(x, y)), FYp = (y: number) => Y(SY(y));
  const bub = (x: number, y: number, text: string, bg: string) => {
    font(0.042, 900);
    const tw = ctx.measureText(text).width + 16, cx = Math.max(tw / 2 + 4, Math.min(X(1) - tw / 2 - 4, x));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(cx - tw / 2, y - R(0.026), tw, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, y);
  };
  if (late && pv.m !== SCI) {
    for (let k = 0; k < BO; k++) if (pv.ins[k]) bub(X(mouthX(k)), Y(BASK_Y - 0.1), pv.one && pv.ins[k] >= CAP - S.cnt[k] ? `+${pv.ins[k]} 한 번에 꽉!` : `+${pv.ins[k]} 쏙`, 'rgba(40,150,80,.95)');
    if (pv.tray) bub(X(0.5), Y(TRAY_SY - 0.066), pv.fail === 1 ? `대기 칸 +${pv.tray} → 꽉 차서 실패!` : `대기 칸 +${pv.tray}`, 'rgba(200,60,50,.95)');
    return;
  }
  if (late) return;
  if (pv.m === SCI) {
    if (L.sc) {
      font(0.04, 900);
      const tx = pv.cut.length ? `✂️ 떼면 실 ${pv.cut.length}가닥 싹둑!` : '✂️ 닿은 실이 없어요', tw = ctx.measureText(tx).width + 18;
      const cx = Math.max(tw / 2 + 4, Math.min(X(1) - tw / 2 - 4, P(L.sc[0], L.sc[1]))), cy = FYp(L.sc[1]) - R(0.075);
      ctx.fillStyle = 'rgba(30,20,40,.88)';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, cy - R(0.027), tw, R(0.054), R(0.027));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tx, cx, cy);
    }
    return;
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [i, p] of pv.paths) {
    const b0 = S.B[i], lead = i === pv.m;
    let moved = 0;
    for (let k = 2; k < p.length; k += 2) moved += Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]);
    if (moved < 0.015) continue;
    const fb = pv.fin[i];
    ctx.setLineDash(lead ? [8, 6] : [4, 5]);
    ctx.lineDashOffset = -t * 0.6;
    ctx.strokeStyle = 'rgba(40,20,10,.45)';
    ctx.lineWidth = lead ? 5 : 3.5;
    ctx.beginPath();
    for (let k = 0; k < p.length; k += 2) {
      const x = P(p[k], p[k + 1]), y = FYp(p[k + 1]);
      if (k) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = lead ? '#ffffff' : fb.st === 0 ? 'rgba(255,248,220,.9)' : fb.dst >= 0 ? '#9dffb4' : '#ff8a7a';
    ctx.lineWidth = lead ? 3 : 2;
    ctx.stroke();
    ctx.setLineDash([]);
    if (fb.st === 0) {
      // 멈출 자리 고스트
      const gx = P(fb.x, fb.y), gy = FYp(fb.y), gr = R(fb.r) * (0.9 + 0.1 * Math.min(1, fb.y / FH));
      ctx.globalAlpha = 0.55;
      drawYarn(ctx, gx, gy, gr, fb.col, 0, fb.hv);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(gx, gy, gr + 2, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (!lead) {
      // 딸려 들어감 표시 (같은 색 바구니 = 초록 고리, 대기 칸 = 빨간 고리)
      const bx = P(b0.x, b0.y), by = FYp(b0.y), br = R(b0.r);
      ctx.strokeStyle = fb.dst >= 0 ? '#7dff9a' : '#ff6b5a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bx, by, br + 4, 0, TAU);
      ctx.stroke();
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = fb.dst >= 0 ? '#c8ffd4' : '#ffc8c0';
      ctx.fillText(fb.dst >= 0 ? '같이 쏙' : '대기 칸!', bx, by - br - R(0.025));
    }
  }
  for (const i of pv.stall) {
    const fb = pv.fin[i];
    ctx.fillStyle = '#ffd0a8';
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('끙! 여기서 멈춰요', P(fb.x, fb.y), FYp(fb.y) - R(0.07));
  }
  for (const [x, y] of pv.snaps) {
    ctx.fillStyle = '#ffd29a';
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✂ 툭', P(x, y), FYp(y));
  }
}

function drawHud(ctx: CanvasRenderingContext2D, s: YarnState, w: number, h: number, th: Theme, X: Fn, Y: Fn, R: Fn, font: FontFn, d: StageDef) {
  const t = s.t, L = s.L, S = s.S, fx = juice(s);
  // ═════════ 위 띠 ═════════
  const hb = R(0.075);
  ctx.fillStyle = 'rgba(48,30,22,.94)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.044, 900);
  ctx.fillText(`${d.emoji} ${s.stage + 1}판 · ${d.name}`, R(0.03), hb * 0.52, w * 0.6);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 띠
  const cardUp = s.phase === 'play' && s.pt < CARD_T && S.taps === 0;
  if (s.news && t - s.news.t < NEWS_T && !cardUp) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = hb + R(0.035) + drop;
    ctx.fillStyle = 'rgba(48,30,22,.93)';
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
  // ═════════ NEW 스포트라이트 ═════════
  if (s.spot && s.phase === 'play' && d.spot) {
    const [cx, cy, r] = spotAt(s) ?? [0.5, 0.5, 0.12];
    const age = s.pt, pulse = 1 + Math.sin(age / 7) * 0.05, rr = R(r) * pulse;
    ctx.save();
    ctx.fillStyle = 'rgba(15,8,4,.4)';
    ctx.beginPath();
    ctx.rect(0, hb, w, Y(BAND) - hb);
    ctx.arc(X(cx), Y(cy), rr, 0, TAU, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#fff1a8';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -age;
    ctx.beginPath();
    ctx.arc(X(cx), Y(cy), rr, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.036, 900);
    const label = d.spot, tw = Math.min(w - 12, ctx.measureText(label).width + R(0.05));
    if (cardUp) {
      ctx.restore();
    } else {
    const ly = cy > 0.75 ? Y(cy) - rr - R(0.05) : Y(cy) + rr + R(0.05), lx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, X(cx)));
    ctx.fillStyle = 'rgba(60,30,20,.96)';
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6e0';
    ctx.fillText(label, lx, ly + 1, w - 20);
    font(0.03, 900);
    const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
    ctx.fillStyle = '#ff5a6e';
    ctx.beginPath();
    ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
    ctx.restore();
    }
  }
  // ═════════ 판 카드 (시작 · 끝 · 실패) ═════════
  const lines = starLines(s);
  {
    let head = '', sub: string[] = [], col = '#ffffff', a = 1, age = 0, okRow: (boolean | null)[] = [];
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) {
        head = s.won ? '대청소 끝! 🐈' : `${d.emoji} 다 채웠다!`;
        col = '#ffd84a';
        sub = resultLines(s);
        okRow = [true, ...s.starOk.slice(1)];
      } else {
        head = `냥… ${s.why}`;
        col = '#ffb3a8';
        sub = [s.hearts > 0 ? '하트 하나 잃었어요 · 이 방 다시!' : '끝 — 고양이가 실을 풀어 달래요'];
      }
    } else if (cardUp) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = [s.stage ? d.news : '👆 털실 뭉치를 톡! 같은 색 바구니로 데굴', ...lines.map((q) => `★ ${q.text}`)];
      okRow = sub.map(() => null);
    }
    if (head) {
      const n = sub.length, chU = 0.08 + n * 0.048, ch = R(chU), sc = Math.min(1, 0.6 + age / 12);
      let cyU = s.phase === 'result' ? 0.55 : s.stage === 0 ? 0.42 : 0.62;
      const sp = s.phase !== 'result' && s.spot ? spotAt(s) : null;
      if (sp) cyU = sp[1] - sp[2] - chU - 0.02 > 0.08 ? sp[1] - sp[2] - chU / 2 - 0.02 : sp[1] + sp[2] + chU / 2 + 0.02;
      const cy = Y(cyU);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(48,30,22,.95)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -ch / 2, R(0.9), ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      const hy = -ch / 2 + R(0.045);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.055), nS = L.nStars, x0 = -(hw + R(0.02) + sw * nS) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, hy);
        for (let k = 0; k < nS; k++) {
          const ag = s.pt - (10 + k * 14);
          if (ag < 0) continue;
          const got = !!s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, hy);
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx * sc, cy + hy * sc, '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, hy, R(0.84));
      sub.forEach((line, k) => {
        const ok = okRow[k];
        const yy = hy + R(0.06 + k * 0.048);
        if (ok !== null && ok !== undefined) {
          ctx.textAlign = 'left';
          font(0.04, 900);
          ctx.fillStyle = ok ? '#ffd84a' : 'rgba(255,255,255,.35)';
          ctx.fillText(ok ? '★' : '☆', -R(0.4), yy);
          ctx.fillStyle = ok ? '#fff1c4' : 'rgba(255,235,225,.6)';
          font(0.037, 800);
          ctx.fillText(line, -R(0.34), yy, R(0.76));
          ctx.textAlign = 'center';
          return;
        }
        ctx.fillStyle = k === 0 && s.phase !== 'result' ? '#ffe9a8' : '#fff8ee';
        font(0.037, k === 0 && s.phase !== 'result' ? 900 : 800);
        ctx.fillText(line, 0, yy, R(0.84));
        if (k === 0 && sp) {
          const lw = Math.min(R(0.84), ctx.measureText(line).width);
          font(0.028, 900);
          const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.02);
          ctx.fillStyle = '#ff5a6e';
          ctx.beginPath();
          ctx.roundRect(-lw / 2 - nw * 0.6, yy - R(0.042), nw, R(0.034), R(0.017));
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.fillText(nb, -lw / 2 - nw * 0.1, yy - R(0.025));
        }
      });
      ctx.restore();
    }
  }
  // ═════════ 아래 띠: 별 조건(쉬운 말) + 안내 한 줄 ═════════
  {
    const ty = BAND;
    const g = ctx.createLinearGradient(0, Y(ty), 0, h);
    g.addColorStop(0, 'rgba(60,38,26,.98)');
    g.addColorStop(1, 'rgba(36,22,14,.99)');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y(ty), w, h - Y(ty));
    lines.forEach((q, k) => {
      const yy = Y(ty + 0.037 + k * 0.05);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      font(0.042, 900);
      ctx.fillStyle = q.state === 1 ? '#ffd84a' : q.state === -1 ? 'rgba(255,255,255,.3)' : 'rgba(255,230,160,.8)';
      ctx.fillText(q.state === -1 ? '✗' : '★', X(0.04), yy);
      font(0.037, 800);
      ctx.fillStyle = q.state === -1 ? 'rgba(255,255,255,.45)' : '#fff6e6';
      ctx.fillText(q.text, X(0.1), yy, R(0.6));
      ctx.textAlign = 'right';
      ctx.fillStyle = q.state === -1 ? 'rgba(255,190,170,.8)' : q.state === 1 ? '#ffe58a' : '#e9d6bf';
      font(0.034, 800);
      ctx.fillText(q.now, X(0.97), yy, R(0.28));
    });
    let hint = d.tip;
    const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
    if (first) hint = '👆 털실 뭉치를 톡! 고양이가 바구니로 탁 쳐 줘요';
    else if (s.down && s.phase === 'play' && s.press !== -1) hint = s.press === SCI ? '떼면 싹둑! (톡 한 번 써요)' : s.press <= -2 ? '소파 밑은 발이 안 닿아요' : '떼면 데굴! 흐린 뭉치 = 끌려가 멈출 자리';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '방이 다 깨끗해졌어요! 고양이가 꾸벅' : '다음 방엔 새것이 나와요') : '꾹 누르면 끌려올 뭉치가 미리 보여요';
    else if (s.stage === 0 && s.firstTap) hint = '꾹 누르고 있으면 끌려올 뭉치가 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.036, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.037 + Math.max(1, lines.length) * 0.05 + 0.022), w - R(0.05));
  }
}

/** NEW 스포트라이트가 비출 곳 (화면 좌표: 가운데 x·y, 반지름) */
function spotAt(s: YarnState): number[] | null {
  const d = STAGES[s.stage], L = s.L, S = s.S;
  if (!d.spot) return null;
  if (d.key === 'tray') return [0.5, TRAY_SY, 0.2];
  if (d.key === 'legs' && L.posts.length === 4) {
    const mx = (L.posts[0][0] + L.posts[3][0]) / 2, my = (L.posts[0][1] + L.posts[3][1]) / 2;
    return [PX(mx, my), SY(my) - 0.03, 0.18];
  }
  if (d.key === 'sofa' && L.sofa) return [0.5, SY(0.08), 0.21];
  if (d.key === 'heavy') {
    const hb = S.B.find((b) => b.hv && b.st === 0);
    return hb ? [PX(hb.x, hb.y), SY(hb.y), 0.1] : null;
  }
  if (d.key === 'sci' && L.sc) return [PX(L.sc[0], L.sc[1]), SY(L.sc[1]), 0.09];
  if (d.key === 'wax' && L.wax) return [0.5, SY((L.wax[1] + L.wax[3]) / 2), 0.2];
  return null;
}

/** 별 조건을 쉬운 말로 (지금 상태: 1 지킴/땀 · 0 아직 · -1 놓침) */
function starLines(s: YarnState) {
  const L = s.L, S = s.S, total = L.queue.length, filled = Math.floor((S.done - S.cnt.reduce((a, b) => a + b, 0)) / CAP);
  const out: { text: string; now: string; state: number }[] = [];
  out.push({ text: '바구니 모두 채우기', now: `${Math.min(total, filled)}/${total}개 채움`, state: S.clear ? 1 : 0 });
  if (L.nStars >= 2) {
    const over = S.trayIn > L.trayMax;
    out.push({ text: L.trayMax === 0 ? '대기 칸에 하나도 안 보내기' : `대기 칸에 ${L.trayMax}개까지만 보내기`, now: `지금 ${S.trayIn}개`, state: over ? -1 : S.clear ? 1 : 0 });
  }
  if (L.nStars >= 3) {
    const over = S.taps > L.par;
    out.push({ text: `톡 ${L.par}번 안에 끝내기`, now: `${S.taps}번 씀`, state: over ? -1 : S.clear ? 1 : 0 });
  }
  return out;
}
function resultLines(s: YarnState) {
  const L = s.L, S = s.S, out = ['바구니를 모두 채웠어요'];
  if (L.nStars >= 2) out.push(S.trayIn <= L.trayMax ? (S.trayIn === 0 ? '대기 칸을 안 쓰고 끝냈어요' : `대기 칸에 ${S.trayIn}개만 보냈어요`) : `대기 칸에 ${S.trayIn}개 보냈어요 (${L.trayMax}개까지)`);
  if (L.nStars >= 3) out.push(S.taps <= L.par ? `톡 ${S.taps}번 만에 끝냈어요!` : `톡 ${S.taps}번 썼어요 (${L.par}번 안에 못 했어요)`);
  return out;
}
