/**
 * 부메랑 등불 마을 (28라운드: 처음 보는 규칙) — 두 번 치는 부메랑 × 가리키기 × 콤보 피버.
 * 기준 9(손이 하는 일은 하나): 밤하늘(마을)을 꾹 누르면 그곳이 부메랑이 '돌아서는 곳'이 된다. 누르고 있는 동안 가는 길(주황)·
 *   오는 길(하늘색)과 등불마다 몇 번 맞을지(+1/+2)·켜질지 꺼질지가 보이고, 떼면 캥거루가 휙 던진다(아래 띠에서 떼면 취소).
 *   키보드는 화살표로 커서 + 스페이스(누르는 동안 미리 보기, 떼면 던지기).
 * 규칙(결정적): 부메랑은 캥거루 손에서 누른 곳까지 오른쪽으로 부풀어 날아가고, 누른 곳에서 돌아서 왼쪽으로 부풀어 돌아온다
 *   (부풂 = 사거리 × WR). 가는 길과 오는 길은 따로 친다 — 한 길이 등불에 RH 안으로 지나가면 1번. 등불은 칠 때마다 켜짐↔꺼짐.
 *   그래서 누른 곳(돌아서는 곳)의 등불은 갈 때 한 번·올 때 한 번 = 두 번 맞아 그대로다. 던질 때마다 결과가 정해져 있다(물리 운 없음).
 * 와우: 부메랑 하나가 두 번 친다 — 갈 때 켠 등불을 올 때 꺼 버리는 '아차!', 잘 고른 곡선은 한 번에 등불 셋·넷이 탁탁탁.
 * 판(밤) 8개: 목표 = 등불을 모두 켜기(부메랑이 손에 돌아온 순간 판정). 별 = ★ 다 켬 · ★ 던지기 par번 이하 · ★ 한 번에 C개 켜기(콤보).
 *   실패 = 던질 부메랑이 떨어짐 → 하트 -1, 같은 밤 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 등불 셋(던지기) → 2판 두 번 맞으면 꺼짐(누른 곳 피하기) → 3판 이미 켜진 등불(피하거나 두 번 치기)
 *   → 4판 큰 등불(두 번 맞아야 켜짐 — 이번엔 누른 곳에 두기) → 5판 바위(맞으면 온 길을 그대로 되짚어 옴 = 지나온 등불 모두 두 번)
 *   → 6판 쌍둥이 등불(하나만 맞아도 둘 다 바뀜, 둘 다 맞으면 제자리) → 7판 부엉이(부메랑을 낚아채 오는 길이 없음 = 한 번씩만)
 *   → 8판 바람(오는 길이 더 휘어 돌아서는 곳이 밀린다).
 * 웃음: 캥거루는 겨눌 때 혀를 빼물고, 등불이 켜지면 우쭐, '아차!' 하면 눈이 동그래지고, 망친 던지기는 돌아온 부메랑에 머리를 '통'
 *   맞고 어질어질 별. 주머니 속 아기 캥거루가 따라 놀란다. 한 번에 셋 넘게 켜지면 집집마다 창문이 열리며 마을 사람들이 "와아!".
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 캥거루 손(던지고 받는 자리) — 화면 좌표(가로 0~1, 세로 0~A)와 마을 바닥 좌표가 같다(3/4 시점) */
const KX = 0.5, KY = 1.1;
/** 돌아서는 곳의 범위: 손에서 RMIN~RMAX, 위로는 TOPY까지. 이보다 아래(띠)에서 떼면 취소 */
const RMIN = 0.2, RMAX = 0.95, TOPY = 0.24, BANDY = 1.27;
/** 부풂 비율 · 등불 맞는 반지름 · 한 틱 이동 거리 · 돌아설 때 빙글(틱) · 바위에 쿵(틱) */
const WR = 0.4, RH = 0.055, DS = 0.021, HOVER = 12, BOUNCE = 9;
const ROCK_R = 0.05, OWL_R = 0.045, BR = 0.012;
const RESULT = 170, RESULT_OK = 210, NEWS_T = 180, CARD_T = 150, START_WAIT = 36;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;

interface Tpl {
  key: string;
  news: string;
  hint: string;
  /** [x, y, 큰 등불(1), 쌍둥이 무리(0 이상, -1 없음), 처음부터 켜짐(1)] */
  lamps: number[][];
  rocks?: number[][];
  owl?: number[];
  wind?: number;
  /** par 범위 · 여유 던지기 · 콤보 별 상한 · 버릇·욕심 함정 판만 고르기 */
  pmin: number;
  pmax: number;
  slack: number;
  cmax: number;
  trap?: boolean;
  /** 연습 밤: 부메랑이 무한 (실패 없음) */
  free?: boolean;
}

/** 밤 8개. 좌표는 뒤집기 전 — 판마다 시드로 좌우를 뒤집고 등불 자리를 살짝 흔든 뒤, 풀이(par)를 기계로 잰다 */
export const STAGES: Tpl[] = [
  {
    key: '', news: '', hint: '누른 곳 = 부메랑이 돌아서는 곳',
    lamps: [[0.36, 0.78, 0, -1, 0], [0.64, 0.78, 0, -1, 0]],
    pmin: 1, pmax: 1, slack: 0, cmax: 2, free: true,
  },
  {
    key: 'double', news: '🔁 누른 곳의 등불은 두 번 맞아요 — 켜졌다 다시 꺼져요!', hint: '돌아서는 곳에 등불을 두면 +2 = 그대로',
    lamps: [[0.5, 0.56, 0, -1, 0], [0.32, 0.78, 0, -1, 0], [0.68, 0.78, 0, -1, 0]],
    pmin: 2, pmax: 2, slack: 14, cmax: 2,
  },
  {
    key: 'lit', news: '🏮 켜진 등불을 한 번 치면 꺼져요 — 피하거나 두 번 쳐요', hint: '켜진 등불은 피하거나, 돌아서는 곳에 둬요',
    lamps: [[0.4, 0.56, 0, -1, 1], [0.6, 0.56, 0, -1, 1], [0.5, 0.38, 0, -1, 0], [0.24, 0.62, 0, -1, 0], [0.76, 0.62, 0, -1, 0], [0.5, 0.78, 0, -1, 0]],
    pmin: 2, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
  {
    key: 'big', news: '🏮🏮 큰 등불은 두 번 맞아야 켜져요 — 돌아서는 곳에 딱!', hint: '큰 등불 = +2로 켜짐 · +1이면 반만',
    lamps: [[0.5, 0.4, 1, -1, 0], [0.28, 0.62, 0, -1, 0], [0.72, 0.62, 0, -1, 0], [0.5, 0.72, 0, -1, 1], [0.2, 0.42, 0, -1, 0], [0.8, 0.44, 0, -1, 0]],
    pmin: 2, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
  {
    key: 'rock', news: '🪨 바위에 맞으면 온 길을 그대로 되짚어 와요 — 지나간 등불은 두 번!', hint: '바위 앞의 등불은 +2 · 큰 등불엔 딱 좋아요',
    lamps: [[0.36, 0.44, 1, -1, 0], [0.66, 0.54, 0, -1, 0], [0.28, 0.72, 0, -1, 0], [0.72, 0.78, 0, -1, 1], [0.52, 0.66, 0, -1, 0], [0.8, 0.36, 0, -1, 0]],
    rocks: [[0.5, 0.33], [0.2, 0.5]],
    pmin: 2, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
  {
    key: 'twin', news: '🎎 쌍둥이 등불은 하나만 맞아도 둘 다 바뀌어요', hint: '쌍둥이를 둘 다 치면 제자리 — 하나만 쳐요',
    lamps: [[0.26, 0.42, 0, 0, 0], [0.74, 0.42, 0, 0, 0], [0.5, 0.56, 0, -1, 1], [0.22, 0.74, 0, 1, 0], [0.62, 0.82, 0, 1, 0], [0.78, 0.62, 0, -1, 0], [0.42, 0.3, 0, -1, 0]],
    pmin: 2, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
  {
    key: 'owl', news: '🦉 부엉이가 부메랑을 낚아채요 — 오는 길이 없어요!', hint: '부엉이에 닿으면 가는 길만 쳐요 (한 번씩)',
    lamps: [[0.5, 0.3, 0, -1, 0], [0.3, 0.42, 0, -1, 0], [0.7, 0.44, 0, -1, 1], [0.28, 0.68, 0, -1, 1], [0.72, 0.7, 0, -1, 0], [0.5, 0.82, 0, -1, 0], [0.16, 0.54, 0, -1, 0], [0.84, 0.56, 0, -1, 0]],
    owl: [0.5, 0.42],
    pmin: 2, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
  {
    key: 'wind', news: '🍃 바람이 불어요 — 오는 길이 더 밀려요', hint: '바람 쪽으로 오는 길이 휘어요 — 미리 보기를 봐요',
    lamps: [[0.5, 0.38, 1, -1, 0], [0.24, 0.5, 0, 0, 0], [0.76, 0.56, 0, 0, 0], [0.4, 0.7, 0, -1, 1], [0.66, 0.8, 0, -1, 0], [0.32, 0.86, 0, -1, 0], [0.72, 0.34, 0, -1, 0]],
    rocks: [[0.14, 0.34]],
    wind: -0.12,
    pmin: 3, pmax: 4, slack: 3, cmax: 3, trap: true,
  },
];
export const STAGE_COUNT = STAGES.length;

interface Lamp {
  x: number; y: number; big: boolean; twin: number; v: number; v0: number;
  // 연출 (시뮬레이션 결과와 무관)
  fl: number; sw: number;
}
interface Pt { x: number; y: number }
interface Layout { lamps: Lamp[]; rocks: Pt[]; owl: Pt | null; wind: number }
/** 던지기 한 번의 궤적: 한 틱에 한 점. legs = 등불을 치는 구간들(가는 길·오는 길·되짚는 길), ev = (몇 번째 점에서, 몇 번 등불) */
interface Flight {
  xs: number[]; ys: number[]; legs: number[][]; ev: { k: number; i: number }[]; hits: number[];
  tipK: number; stopK: number; kind: number; rockI: number; tx: number; ty: number; margin: number;
}
/** 판의 풀이표: 던질 수 있는 '결과가 다른' 던지기들과 상태 전이표 */
interface Puzzle {
  cands: { x: number; y: number; inc: number[]; margin: number; spec: boolean }[];
  mods: number[]; mul: number[]; nst: number; start: number; goal: number;
  trans: Int32Array[]; net: Int8Array[];
  /** 손 떨림에도 결과가 같은(가장자리에서 먼) 던지기들 · 격자 칸마다 결과 번호와 스치는 등불 */
  rob: number[]; gridE: Int16Array; gridT: Int32Array;
  /** par · 바위·부엉이 없이 풀 때의 최소 던지기 · 콤보 별 */
  par: number; parNo: number; C: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }

export interface BoomState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  jit: number[]; L: Layout; P: Puzzle;
  throws: number; used: number; par: number; C: number; best: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  ok: boolean; why: string; down: boolean; aim: Pt | null;
  fl: Flight | null; fk: number; evi: number; onBefore: number; run: number; slow: number; cool: number; offs: number; dbl: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null;
  events: Ev[]; dead: boolean; won: boolean; tries: number; firstThrow: boolean; again: boolean;
  // 연출 상태
  mood: number; moodT: number; cheerT: number; lastNet: number;
}

const ev = (s: BoomState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: BoomState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

const MOD = (l: Lamp) => (l.big ? 3 : 2);
const isOn = (l: Lamp) => l.v === MOD(l) - 1;
const onCount = (L: Layout) => L.lamps.reduce((a, l) => a + (isOn(l) ? 1 : 0), 0);

function segD(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2)) : 0;
  return Math.hypot(ax + dx * u - px, ay + dy * u - py);
}

/** 누른 곳 → 돌아서는 곳 (범위 안으로). 아래 띠면 null(취소) */
function aimTip(px: number, py: number): Pt | null {
  if (py > BANDY) return null;
  let dx = px - KX, dy = Math.min(py - KY, -0.12);
  const d = Math.hypot(dx, dy), r = Math.max(RMIN, Math.min(RMAX, d));
  dx *= r / d;
  dy *= r / d;
  let x = KX + dx, y = KY + dy;
  x = Math.max(0.03, Math.min(0.97, x));
  y = Math.max(TOPY, y);
  return { x, y };
}

/** 가는 길(손 → 돌아서는 곳, 오른쪽으로 부풂) + 오는 길(왼쪽으로 부풂)을 같은 걸음 간격으로 */
interface Fwd { xs: number[]; ys: number[]; T: number }
function forward(wind: number, tx: number, ty: number): Fwd {
  const dx = tx - KX, dy = ty - KY, Lr = Math.hypot(dx, dy), ux = dx / Lr, uy = dy / Lr, nx = -uy, ny = ux, wd = WR * Lr, wv = wind * Lr * 4.8;
  const xs: number[] = [], ys: number[] = [];
  let T = 0;
  const N0 = 40;
  for (let half = 0; half < 2; half++) {
    const dxs: number[] = [], dys: number[] = [], cum: number[] = [0];
    for (let j = 0; j <= N0; j++) {
      const s = half * 0.5 + (j / N0) * 0.5, f = Lr * Math.sin(Math.PI * s), g = wd * Math.sin(2 * Math.PI * s), w = wv * s * s * (1 - s);
      dxs.push(KX + ux * f + nx * g + w);
      dys.push(KY + uy * f + ny * g);
      if (j) cum.push(cum[j - 1] + Math.hypot(dxs[j] - dxs[j - 1], dys[j] - dys[j - 1]));
    }
    const len = cum[N0], n = Math.max(4, Math.round(len / DS));
    let q = 0;
    for (let k = half ? 1 : 0; k <= n; k++) {
      const at = (k / n) * len;
      while (q < N0 - 1 && cum[q + 1] < at) q++;
      const u = (at - cum[q]) / (cum[q + 1] - cum[q] || 1);
      xs.push(dxs[q] + (dxs[q + 1] - dxs[q]) * u);
      ys.push(dys[q] + (dys[q + 1] - dys[q]) * u);
    }
    if (!half) T = xs.length - 1;
  }
  return { xs, ys, T };
}

/** 마을 위의 성긴 격자 = 봇이 고를 수 있는 '돌아서는 곳'들 (궤적은 바람마다 한 번만 계산해 둔다) */
const GRID: Pt[] = (() => {
  const out: Pt[] = [];
  for (let ai = 0; ai <= 40; ai++) {
    const a = Math.PI * (1.08 + (ai / 40) * 0.84);
    for (let ri = 0; ri <= 17; ri++) {
      const r = RMIN + (ri / 17) * (RMAX - RMIN), x = KX + Math.cos(a) * r, y = KY + Math.sin(a) * r;
      if (x < 0.03 || x > 0.97 || y < TOPY || y > KY - 0.12) continue;
      out.push({ x, y });
    }
  }
  return out;
})();
const gridFwd = new Map<number, Fwd[]>();
function gridPaths(wind: number) {
  let a = gridFwd.get(wind);
  if (!a) gridFwd.set(wind, (a = GRID.map((g) => forward(wind, g.x, g.y))));
  return a;
}

/** 바위·부엉이에 처음 닿는 점 (없으면 끝까지) */
function contact(L: Layout, F: Fwd) {
  const n = F.xs.length;
  if (L.rocks.length || L.owl)
    for (let j = 2; j < n - 2; j++) {
      for (let r = 0; r < L.rocks.length; r++)
        if (segD(L.rocks[r].x, L.rocks[r].y, F.xs[j - 1], F.ys[j - 1], F.xs[j], F.ys[j]) < ROCK_R + BR) return { end: j, kind: 1, rockI: r };
      if (L.owl && segD(L.owl.x, L.owl.y, F.xs[j - 1], F.ys[j - 1], F.xs[j], F.ys[j]) < OWL_R + BR) return { end: j, kind: 2, rockI: -1 };
    }
  return { end: n - 1, kind: 0, rockI: -1 };
}
/** 한 구간(점 p~q)이 등불 l을 RH 안으로 지나가나: 가장 가까운 거리와 그 점 */
const NEAR = RH + 0.06, STEP = DS * 1.2;
function legNear(l: Lamp, xs: number[], ys: number[], p: number, q: number) {
  let best = 9, bk = p;
  for (let k = p; k < q; k++) {
    // 점 사이 간격은 STEP 이하라서, 먼 점에서는 그 거리만큼 건너뛰어도 RH 안을 놓치지 않는다
    const dx = xs[k] - l.x, dy = ys[k] - l.y, d2 = dx * dx + dy * dy;
    if (d2 > NEAR * NEAR) {
      const skip = Math.floor((Math.sqrt(d2) - NEAR) / STEP);
      if (skip > 1) k += skip - 1;
      continue;
    }
    const d = segD(l.x, l.y, xs[k], ys[k], xs[k + 1], ys[k + 1]);
    if (d < best) (best = d), (bk = Math.hypot(xs[k] - l.x, ys[k] - l.y) <= Math.hypot(xs[k + 1] - l.x, ys[k + 1] - l.y) ? k : k + 1);
  }
  return { best, bk };
}
/** 판 고르기·봇용 빠른 계산: flight()와 같은 결과(맞는 횟수·여유)를 배열을 만들지 않고 */
function quickHits(L: Layout, F: Fwd) {
  const { end, kind } = contact(L, F), T = F.T;
  const legs = end > T ? [[0, T], [T, end]] : [[0, end]], mult = kind === 1 ? 2 : 1;
  const hits = L.lamps.map(() => 0);
  let margin = 1;
  for (const [p, q] of legs) {
    if (q <= p) continue;
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (let k = p; k <= q; k++) (x0 = Math.min(x0, F.xs[k])), (x1 = Math.max(x1, F.xs[k])), (y0 = Math.min(y0, F.ys[k])), (y1 = Math.max(y1, F.ys[k]));
    const pad = RH + 0.02;
    L.lamps.forEach((l, i) => {
      if (l.x < x0 - pad || l.x > x1 + pad || l.y < y0 - pad || l.y > y1 + pad) return;
      const { best } = legNear(l, F.xs, F.ys, p, q);
      margin = Math.min(margin, Math.abs(best - RH));
      if (best < RH) hits[i] += mult;
    });
  }
  return { hits, margin, kind };
}

function flight(L: Layout, tx: number, ty: number, F: Fwd = forward(L.wind, tx, ty)): Flight {
  const T = F.T;
  const { end, kind, rockI } = contact(L, F);
  const xs: number[] = [], ys: number[] = [], legs: number[][] = [];
  const push = (x: number, y: number) => (xs.push(x), ys.push(y));
  let a = 0, tipK = -1;
  for (let j = 0; j <= end; j++) {
    push(F.xs[j], F.ys[j]);
    if (j === T && end > T) {
      legs.push([a, xs.length - 1]);
      tipK = xs.length - 1;
      for (let h = 0; h < HOVER; h++) push(F.xs[j], F.ys[j]);
      a = xs.length - 1;
    }
  }
  legs.push([a, xs.length - 1]);
  const stopK = xs.length - 1;
  if (kind === 1) {
    for (let h = 0; h < BOUNCE; h++) push(F.xs[end], F.ys[end]);
    a = xs.length - 1;
    for (let j = end - 1; j >= 0; j--) {
      push(F.xs[j], F.ys[j]);
      if (j === T) legs.push([a, xs.length - 1]), (a = xs.length - 1);
    }
    legs.push([a, xs.length - 1]);
  } else if (kind === 2) {
    // 부엉이가 물고 잠깐 우쭐 → 캥거루에게 곧장 날아다 준다 (높이 날아서 아무것도 안 침)
    const ox = F.xs[end], oy = F.ys[end];
    for (let h = 0; h < 22; h++) push(ox, oy);
    const m = Math.max(6, Math.round(Math.hypot(KX - ox, KY - oy) / (DS * 1.3)));
    for (let k = 1; k <= m; k++) push(ox + ((KX - ox) * k) / m, oy + ((KY - oy) * k) / m);
  }
  const hits = L.lamps.map(() => 0), evs: { k: number; i: number }[] = [];
  let margin = 1;
  for (const [p, q] of legs) {
    if (q <= p) continue;
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (let k = p; k <= q; k++) (x0 = Math.min(x0, xs[k])), (x1 = Math.max(x1, xs[k])), (y0 = Math.min(y0, ys[k])), (y1 = Math.max(y1, ys[k]));
    const pad = RH + 0.02;
    L.lamps.forEach((l, i) => {
      if (l.x < x0 - pad || l.x > x1 + pad || l.y < y0 - pad || l.y > y1 + pad) return;
      const { best, bk } = legNear(l, xs, ys, p, q);
      margin = Math.min(margin, Math.abs(best - RH));
      if (best < RH) hits[i]++, evs.push({ k: bk, i });
    });
  }
  evs.sort((u, v) => u.k - v.k || u.i - v.i);
  return { xs, ys, legs, ev: evs, hits, tipK, stopK, kind, rockI, tx, ty, margin };
}

/** 던지기 한 번이 등불마다 더하는 수 (쌍둥이: 짝이 맞아도 같이 바뀜) */
function incOf(L: Layout, hits: number[]) {
  return L.lamps.map((l, j) => (hits[j] + (l.twin >= 0 ? hits[l.twin] : 0)) % MOD(l));
}

// ───────────────────────────── 풀이표 (봇·par) ─────────────────────────────
function encode(P: { mul: number[] }, v: number[]) {
  let s = 0;
  for (let j = 0; j < v.length; j++) s += v[j] * P.mul[j];
  return s;
}
/** 상태 → 꺼진 등불 묶음(비트) */
function offMask(P: Puzzle, st: number) {
  let m = 0, r = st;
  for (let j = 0; j < P.mods.length; j++) {
    const x = r % P.mods[j];
    r = (r - x) / P.mods[j];
    if (x !== P.mods[j] - 1) m |= 1 << j;
  }
  return m;
}
const popcnt = (m: number) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};

function buildPuzzle(L: Layout, minLim: number): Puzzle {
  const mods = L.lamps.map(MOD), mul: number[] = [];
  let nst = 1;
  for (const m of mods) mul.push(nst), (nst *= m);
  const F = gridPaths(L.wind);
  const byKey = new Map<string, number>(), cands: { x: number; y: number; inc: number[]; margin: number; spec: boolean }[] = [];
  const gridE = new Int16Array(GRID.length), gridT = new Int32Array(GRID.length);
  GRID.forEach((g, gi) => {
    const f = quickHits(L, F[gi]);
    let tm = 0;
    f.hits.forEach((hh, i) => hh > 0 && (tm |= 1 << i));
    gridT[gi] = tm;
    const inc = incOf(L, f.hits);
    if (inc.every((v) => v === 0)) return void (gridE[gi] = -1);
    const key = inc.join('');
    let e = byKey.get(key);
    if (e === undefined) byKey.set(key, (e = cands.length)), cands.push({ x: g.x, y: g.y, inc, margin: f.margin, spec: f.kind > 0 });
    else {
      if (f.margin > cands[e].margin) (cands[e].x = g.x), (cands[e].y = g.y), (cands[e].margin = f.margin);
      if (f.kind === 0 && f.margin >= 0.006) cands[e].spec = false;
    }
    gridE[gi] = e;
  });
  const trans: Int32Array[] = [], net: Int8Array[] = [];
  for (const c of cands) {
    const tr = new Int32Array(nst), nt = new Int8Array(nst);
    for (let st = 0; st < nst; st++) {
      let r = st, ns = 0, d = 0;
      for (let j = 0; j < mods.length; j++) {
        const x = r % mods[j];
        r = (r - x) / mods[j];
        const y = (x + c.inc[j]) % mods[j];
        ns += y * mul[j];
        d += (y === mods[j] - 1 ? 1 : 0) - (x === mods[j] - 1 ? 1 : 0);
      }
      tr[st] = ns;
      nt[st] = d;
    }
    trans.push(tr);
    net.push(nt);
  }
  const rob = cands.map((c, e) => (c.margin >= 0.006 ? e : -1)).filter((e) => e >= 0);
  const start = encode({ mul }, L.lamps.map((l) => l.v)), goal = encode({ mul }, mods.map((m) => m - 1));
  const P: Puzzle = { cands, mods, mul, nst, start, goal, trans, net, rob, gridE, gridT, par: 99, parNo: 99, C: 1 };
  P.par = minThrows(P, rob);
  // 바위·부엉이가 있는 판: 그것 없이는(바위·부엉이에 닿는 던지기 빼고) 몇 번이 드나
  P.parNo = L.rocks.length || L.owl ? minThrows(P, rob.filter((e) => !cands[e].spec)) : P.par;
  // 콤보 별: par번 안에 끝나는 풀이 중 '한 번에 켠 수'의 최댓값
  if (P.par < 99) {
    let dp = new Int8Array(nst).fill(-1);
    dp[start] = 0;
    let best = 0;
    for (let d = 1; d <= Math.max(P.par, minLim); d++) {
      const nd = dp.slice();
      for (let st = 0; st < nst; st++) {
        if (dp[st] < 0 || st === goal) continue;
        for (const e of rob) {
          const ns = trans[e][st], c = Math.max(dp[st], net[e][st]);
          if (ns === goal) best = Math.max(best, c);
          else if (c > nd[ns]) nd[ns] = c;
        }
      }
      dp = nd;
    }
    P.C = Math.max(1, best);
  }
  return P;
}

/** 가장 적은 던지기 수 (BFS) */
function minThrows(P: Puzzle, effs: number[]) {
  const dist = new Int8Array(P.nst).fill(-1);
  dist[P.start] = 0;
  let fr = [P.start];
  for (let d = 1; d <= 7 && fr.length && dist[P.goal] < 0; d++) {
    const nx: number[] = [];
    for (const st of fr)
      for (const e of effs) {
        const ns = P.trans[e][st];
        if (dist[ns] < 0) (dist[ns] = d), nx.push(ns);
      }
    fr = nx;
  }
  return dist[P.goal] < 0 ? 99 : dist[P.goal];
}

/** 한 가지 버릇으로 끝까지 두면 어떻게 되나 (판 고르기용 — 실제 봇과 같은 규칙) */
function greedyPick(P: Puzzle, st: number) {
  let best = -999, be = -1;
  for (const e of P.rob) {
    const v = P.net[e][st] * 10 + (P.trans[e][st] === P.goal ? 100 : 0);
    if (v > best) (best = v), (be = e);
  }
  return be;
}
function habitPick(P: Puzzle, st: number) {
  const off = offMask(P, st);
  let best = -1, bg = 0;
  for (let gi = 0; gi < GRID.length; gi++) {
    const n = popcnt(P.gridT[gi] & off);
    if (n > best) (best = n), (bg = gi);
  }
  return bg;
}
function simulate(P: Puzzle, habit: boolean, limit: number, C: number) {
  let st = P.start, combo = 0;
  for (let u = 1; u <= limit; u++) {
    const e = habit ? P.gridE[habitPick(P, st)] : greedyPick(P, st);
    if (e >= 0) (combo = Math.max(combo, P.net[e][st])), (st = P.trans[e][st]);
    if (st === P.goal) return { ok: true, used: u, three: combo >= C };
  }
  return { ok: false, used: limit, three: false };
}

/** 지금 상태에서 ★(par 안)·★(콤보)를 노리는 가장 짧은 던지기 순서 */
function planFrom(P: Puzzle, cur: number, flag: boolean, used: number, left: number, par: number, C: number): number[] {
  const N = P.nst * 2, dist = new Int16Array(N).fill(-1), from = new Int32Array(N).fill(-1), via = new Int16Array(N).fill(-1);
  const s0 = cur * 2 + (flag ? 1 : 0);
  dist[s0] = 0;
  let fr = [s0];
  for (let d = 1; d <= left && fr.length; d++) {
    const nx: number[] = [];
    for (const node of fr) {
      const st = node >> 1, fg = node & 1;
      if (st === P.goal) continue;
      for (const e of P.rob) {
        const ns = P.trans[e][st], nf = fg || P.net[e][st] >= C ? 1 : 0, nn = ns * 2 + nf;
        if (dist[nn] >= 0) continue;
        dist[nn] = d;
        from[nn] = node;
        via[nn] = e;
        nx.push(nn);
      }
    }
    fr = nx;
  }
  const g1 = P.goal * 2 + 1, g0 = P.goal * 2;
  const d1 = dist[g1], d0 = dist[g0];
  let tgt = -1;
  if (d1 >= 0 && used + d1 <= par) tgt = g1;
  else if (d0 >= 0 && used + d0 <= par) tgt = g0;
  else if (d1 >= 0) tgt = g1;
  else if (d0 >= 0) tgt = g0;
  if (tgt < 0) return [];
  const path: number[] = [];
  for (let n = tgt; n !== s0; n = from[n]) path.unshift(via[n]);
  return path;
}

// ───────────────────────────── 판 ─────────────────────────────
function makeLayout(d: Tpl, rng: Rng, flip: boolean): Layout {
  const fx = (x: number) => (flip ? 1 - x : x);
  const J = (a: number) => (rng() - 0.5) * 2 * a;
  const lamps: Lamp[] = d.lamps.map(([x, y, big, tw, lit]) => ({ x: fx(x) + J(0.04), y: y + J(0.04), big: !!big, twin: tw, v: lit ? (big ? 2 : 1) : 0, v0: 0, fl: 0, sw: rng() * 6 }));
  // 쌍둥이 무리 번호 → 짝 번호
  lamps.forEach((l, i) => {
    if (l.twin < 0) return;
    const g = l.twin;
    l.twin = d.lamps.findIndex((q, k) => k !== i && q[3] === g);
  });
  lamps.forEach((l) => (l.v0 = l.v));
  return {
    lamps,
    rocks: (d.rocks ?? []).map(([x, y]) => ({ x: fx(x) + J(0.02), y: y + J(0.02) })),
    owl: d.owl ? { x: fx(d.owl[0]) + J(0.03), y: d.owl[1] } : null,
    wind: (d.wind ?? 0) * (flip ? -1 : 1),
  };
}

/** 판 만들기: 틀을 흔들어 여러 번 만들어 보고, par가 범위 안이며 '버릇'(꺼진 등불 많이)·'욕심'(지금 제일 많이)으로는 ★셋이 안 되는 판을 고른다 */
export let genTries = 0;
function genStage(s: BoomState) {
  const d = STAGES[s.stage], rng = mulberry32(s.jit[s.stage]);
  let pick: { L: Layout; P: Puzzle } | null = null, pv = -1;
  for (let tries = 0; tries < 48; tries++) {
    genTries++;
    const L = makeLayout(d, rng, rng() < 0.5);
    const P = buildPuzzle(L, d.pmin);
    if (P.par >= 99) continue;
    const C = Math.min(d.cmax, P.C), lim = P.par + d.slack;
    let v = P.par >= d.pmin && P.par <= d.pmax ? 4 : 0;
    if (d.trap) {
      const g = simulate(P, false, lim, C), hb = simulate(P, true, lim, C);
      v += (g.ok && g.used <= P.par && g.three ? 0 : 2) + (hb.ok && hb.used <= P.par && hb.three ? 0 : 3);
    } else v += 5;
    if (C >= 2) v += 1;
    // 새것(바위·부엉이)이 장식이 아니게: 그것 없이는 par 안에 못 푸는 판
    if (d.key === 'rock' || d.key === 'owl') v += P.parNo > P.par ? 3 : 0;
    else v += 3;
    if (v > pv) (pv = v), (pick = { L, P });
    if (v >= 13) break;
  }
  s.L = pick!.L;
  s.P = pick!.P;
}

function newStage(s: BoomState, fresh: boolean) {
  const d = STAGES[s.stage];
  if (fresh) genStage(s);
  else for (const l of s.L.lamps) (l.v = l.v0), (l.fl = 0);
  s.par = s.P.par;
  s.C = Math.min(d.cmax, s.P.C);
  s.throws = d.free ? 99 : s.par + d.slack;
  s.used = 0;
  s.best = 0;
  s.phase = 'play';
  s.pt = 0;
  s.fl = null;
  s.fk = 0;
  s.evi = 0;
  s.cool = 0;
  s.starOk = [false, false, false];
  if (d.key) s.seen.add(d.key);
}

function release(s: BoomState, px: number, py: number) {
  if (s.phase !== 'play' || s.fl || s.pt < START_WAIT || s.t < s.cool) return;
  const tip = aimTip(px, py);
  if (!tip) return void ev(s, 'cancel', KX, KY - 0.12, '취소');
  if (s.throws <= 0) return;
  if (!STAGES[s.stage].free) s.throws--;
  s.used++;
  s.firstThrow = true;
  s.fl = flight(s.L, tip.x, tip.y);
  s.fk = 0;
  s.evi = 0;
  s.onBefore = onCount(s.L);
  s.run = 0;
  s.offs = 0;
  s.dbl = false;
  s.mood = 2;
  s.moodT = 24;
  ev(s, 'throw', KX, KY, '휙!');
  see(s, 'throw', '🪃 오른쪽으로 나갔다가, 돌아서서 왼쪽으로 돌아와요');
}

/** 등불 하나를 한 번 친다 (쌍둥이면 짝도) */
function hitLamp(s: BoomState, i: number, k: number) {
  const L = s.L, l = L.lamps[i];
  const targets = l.twin >= 0 ? [i, l.twin] : [i];
  for (const j of targets) {
    const q = L.lamps[j], was = isOn(q);
    q.v = (q.v + 1) % MOD(q);
    q.fl = 1;
    if (isOn(q)) {
      s.run++;
      ev(s, 'on', q.x, q.y, s.run >= 2 ? `탁${'탁'.repeat(Math.min(3, s.run - 1))}! ×${s.run}` : '탁! 켜짐', s.run);
      if (s.run >= 3) s.slow = 28;
    } else if (was) {
      s.run = Math.max(0, s.run - 1);
      s.offs++;
      ev(s, 'off', q.x, q.y, '아차! 꺼짐');
      s.mood = 4;
      s.moodT = 40;
    } else ev(s, 'half', q.x, q.y, '반쯤!');
    if (j !== i) ev(s, 'twin', q.x, q.y);
  }
  // 이번 던지기에서 두 번째로 맞은 등불 → 두 번 치는 규칙을 알린다
  if (s.fl && s.fl.ev.some((e, n) => n < s.evi && e.i === i && e.k < k)) {
    if (!s.dbl) ev(s, 'double', l.x, l.y, l.big ? '두 번째! ✨' : '또 맞았다!');
    s.dbl = true;
    see(s, 'double', '🔁 갈 때 한 번, 올 때 한 번 — 두 번 맞으면 다시 꺼져요!');
  }
}

function finishThrow(s: BoomState) {
  const f = s.fl!, L = s.L;
  const net = onCount(L) - s.onBefore;
  s.lastNet = net;
  s.best = Math.max(s.best, net);
  s.fl = null;
  if (net >= 3) (s.cheerT = 110), ev(s, 'cheer', 0.5, 0.2, `와아! ${net}개 한꺼번에!`), see(s, 'combo', '🎉 한 번에 셋! 마을 사람들이 창문을 열고 환호해요');
  if (s.offs > 0 && net <= 0) {
    s.mood = 5;
    s.moodT = 70;
    s.cool = s.t + 46;
    ev(s, 'bonk', KX, KY - 0.1, '통!');
  } else {
    s.mood = net > 0 ? 3 : 0;
    s.moodT = 50;
    s.cool = s.t + 10;
    ev(s, 'catch', KX, KY, f.kind === 2 ? '부엉이가 돌려줬다' : '탁!');
  }
  if (L.lamps.every(isOn)) return endStage(s, true, '');
  if (s.throws <= 0) return endStage(s, false, '부메랑을 다 던졌어요');
}

function endStage(s: BoomState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = [true, s.used <= s.par, s.best >= s.C];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + (STAGES[s.stage].free ? 0 : s.throws * LEFT_PTS);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 6;
    s.moodT = 200;
    ev(s, 'clear', 0.5, 0.6, s.won ? '마을이 다 밝아졌어요! 🏮' : '마을이 밝아졌어요!');
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 5;
    s.moodT = 150;
    ev(s, 'fail', 0.5, 0.6, why);
  }
}

export const boomerang: GameDef<BoomState> = {
  id: 'boomerang',
  name: '부메랑 등불 마을',
  genes: ['boomerang', 'pointer', 'combo'],
  twist: '부메랑 하나가 두 번 친다 — 가는 길과 오는 길이 따로 등불을 치고, 등불은 칠 때마다 켜졌다 꺼졌다 하니 돌아서는 곳의 등불은 두 번 맞아 도로 꺼진다. "한 번만 지나가는 곡선"을 고르는 게 수',
  rules: [
    '하늘을 꾹 누르면 그곳에서 부메랑이 돌아서요 — 오른쪽으로 나갔다 왼쪽으로 돌아와요.',
    '지나간 등불은 칠 때마다 켜졌다 꺼졌다 — 모두 켜면 성공!',
  ],
  controls: 'touch',
  hint: '꾹 누르면 부메랑 길 미리 보기, 떼면 휙! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '밤의 등불 마을 디오라마 — 캥거루 부메랑 축제',
    mood: '남색 밤하늘 아래 기와 지붕 마을 광장, 나무 기둥에 매단 종이 등불이 하나씩 주황빛으로 켜진다. 광장 아래 캥거루가 주머니 속 아기와 함께 부메랑을 던지고, 창문마다 마을 동물들이 고개를 내민다.',
    palette: { bg: '#141a3a', ink: '#fff6e6', muted: '#a8b0d8', accent: '#ffb547', hot: '#ff6b6b', soft: '#ffd9a0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const jit = STAGES.map(() => Math.floor(rng() * 2 ** 31));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0, jit,
      L: { lamps: [], rocks: [], owl: null, wind: 0 }, P: null as unknown as Puzzle,
      throws: 0, used: 0, par: 1, C: 1, best: 0, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0,
      ok: false, why: '', down: false, aim: null,
      fl: null, fk: 0, evi: 0, onBefore: 0, run: 0, slow: 0, cool: 0, offs: 0, dbl: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], dead: false, won: false, tries: 0, firstThrow: false, again: false,
      mood: 0, moodT: 0, cheerT: 0, lastNet: 0,
    } as BoomState;
    newStage(s, true);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null;
    if (p) (s.down = true), (s.aim = { x: p.x, y: p.y * A });
    else if (s.down) {
      s.down = false;
      if (s.aim) release(s, s.aim.x, s.aim.y);
      s.aim = null;
    }
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
    if (s.cheerT > 0) s.cheerT--;
    for (const l of s.L.lamps) l.fl *= 0.93;
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s, true);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s, false);
      }
      return;
    }
    const f = s.fl;
    if (!f) return;
    // 부메랑이 날아간다 (한 번에 셋 넘게 켜지면 잠깐 느려진다)
    s.fk += s.slow > 0 ? 0.4 : 1;
    if (s.slow > 0) s.slow--;
    if (Math.floor(s.fk) === f.tipK) ev(s, 'tip', f.xs[f.tipK], f.ys[f.tipK]);
    if (f.kind === 1 && Math.floor(s.fk) === f.stopK) ev(s, 'rock', f.xs[f.stopK], f.ys[f.stopK], '쿵! 되짚어 와요'), see(s, 'rockhit', '🪨 바위에 맞으면 온 길 그대로 — 지나온 등불을 또 쳐요');
    if (f.kind === 2 && Math.floor(s.fk) === f.stopK) ev(s, 'owl', f.xs[f.stopK], f.ys[f.stopK], '부엉! 낚았다'), see(s, 'owlhit', '🦉 부엉이가 낚아채면 오는 길이 없어요');
    while (s.evi < f.ev.length && f.ev[s.evi].k <= s.fk) {
      const e = f.ev[s.evi++];
      hitLamp(s, e.i, e.k);
    }
    if (s.fk >= f.xs.length - 1) finishThrow(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const stateOf = (s: BoomState) => encode(s.P, s.L.lamps.map((l) => l.v));
const ready = (s: BoomState) => s.phase === 'play' && !s.fl && !s.down && s.pt >= START_WAIT + 10 && s.t >= s.cool + 16 && s.throws > 0;

/** 누르고(미리 보기) 잠깐 보다가 떼는 손: 같은 던지기를 hold틱 동안 누르고 있다 */
const hand = new WeakMap<object, { key: string; x: number; y: number; until: number }>();
function press(s: BoomState, key: string, pick: () => Pt | null, hold: number): Input {
  let m = hand.get(s);
  if (m && m.key === key) return s.t < m.until ? at(m.x, m.y) : NO;
  if (!ready(s)) return NO;
  const p = pick();
  if (!p) return NO;
  hand.set(s, (m = { key, x: p.x, y: p.y, until: s.t + hold }));
  return at(m.x, m.y);
}
export function planNext(s: BoomState): Pt | null {
  const path = planFrom(s.P, stateOf(s), s.best >= s.C, s.used, s.throws, s.par, s.C);
  return path.length ? { x: s.P.cands[path[0]].x, y: s.P.cands[path[0]].y } : null;
}
/** 봇: 판의 모든 던지기 결과를 미리 재 두고, ★ 셋(par 안 + 콤보)을 노리는 가장 짧은 순서를 찾아 던진다 */
export const boomerangSmart: Bot<BoomState> = {
  name: '부메랑 박사',
  act(s) {
    return press(s, `${s.stage}:${s.tries}:${s.used}`, () => planNext(s), 24);
  },
};
/** 버릇 봇(측정용): 꺼진 등불을 가장 많이 지나가는 곳으로 던진다 (두 번 맞는 것·켜진 등불을 끄는 것은 안 따짐) */
export const boomerangHabit: Bot<BoomState> = {
  name: '버릇: 꺼진 등불 많이',
  act(s) {
    return press(s, `${s.stage}:${s.tries}:${s.used}`, () => GRID[habitPick(s.P, stateOf(s))], 24);
  },
};
/** 측정용: 미리 보기만 보고 '지금 가장 많이 켜지는 곳' (한 수 욕심) */
export const boomerangGreedy: Bot<BoomState> = {
  name: '욕심: 지금 제일 많이',
  act(s) {
    return press(s, `${s.stage}:${s.tries}:${s.used}`, () => {
      const e = greedyPick(s.P, stateOf(s));
      return e >= 0 ? { x: s.P.cands[e].x, y: s.P.cands[e].y } : null;
    }, 24);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나, 아무 때나 꾹 눌렀다 뗀다 (대개 마을 위, 가끔 화면 아무 데나) */
export const boomerangRandom: Bot<BoomState> = {
  name: '아무 데나 휙',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 30 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 120);
    if (rng() < 0.1) (m.x = rng()), (m.y = rng() * A);
    else (m.x = 0.05 + rng() * 0.9), (m.y = TOPY + rng() * (KY - 0.12 - TOPY));
    m.hold = 3 + Math.floor(rng() * 8);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y / A } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function star5(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
/** 등불 바닥 그림자·기둥 높이: 등불 몸통(맞는 자리)은 바닥에서 LIFT 위에 매달려 있다 */
const LIFT = 0.075;
const TWIN_COL = ['#ff7eb6', '#6fe3c1'];
const VILLAGER = ['🐱', '🐰', '🐻', '🐷', '🦔'];
const pvCache = new WeakMap<object, { key: string; f: Flight; inc: number[] }>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

/** 종이 등불 (기둥 + 매달린 등). v: 0 꺼짐 · 1 반쯤(큰 등불) · on 켜짐 */
function drawLamp(ctx: CanvasRenderingContext2D, x: number, y: number, gy: number, u: number, l: Lamp, t: number, newGlow: number) {
  const on = isOn(l), half = l.big && l.v === 1, sc = 1 + l.fl * 0.35, big = l.big ? 1.32 : 1;
  // 바닥 그림자
  ctx.fillStyle = 'rgba(5,6,20,.45)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.25, gy, u * 0.9, u * 0.28, 0, 0, TAU);
  ctx.fill();
  // 나무 기둥 + 팔
  const top = y - u * 1.35 * big;
  const pg = ctx.createLinearGradient(x - u * 0.12, 0, x + u * 0.12, 0);
  pg.addColorStop(0, '#5a3a22');
  pg.addColorStop(0.5, '#8a5a34');
  pg.addColorStop(1, '#4a2e1a');
  ctx.fillStyle = pg;
  ctx.fillRect(x - u * 0.11, top, u * 0.22, gy - top);
  ctx.fillStyle = '#6b4428';
  ctx.fillRect(x - u * 0.55, top - u * 0.08, u * 1.1, u * 0.16);
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, top + u * 0.08);
  ctx.lineTo(x, y - u * 0.8 * big * sc);
  ctx.stroke();
  // 등불 몸통 (흔들흔들)
  const sw = Math.sin(t * 0.04 + l.sw) * 0.06 + l.fl * Math.sin(t * 0.6) * 0.25;
  ctx.save();
  ctx.translate(x, y - u * 0.75 * big);
  ctx.rotate(sw);
  ctx.translate(0, u * 0.75 * big);
  ctx.scale(sc * big, sc * big);
  const rx = u * 0.62, ry = u * 0.74;
  if (on || half) {
    // 빛 번짐
    const gl = ctx.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx * (half ? 2.4 : 3.4));
    gl.addColorStop(0, half ? 'rgba(255,210,120,.35)' : 'rgba(255,200,110,.55)');
    gl.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(0, 0, rx * (half ? 2.4 : 3.4), 0, TAU);
    ctx.fill();
  }
  const body = ctx.createRadialGradient(-rx * 0.3, -ry * 0.3, rx * 0.1, 0, 0, rx * 1.15);
  if (on) {
    body.addColorStop(0, '#fffbe0');
    body.addColorStop(0.45, l.twin >= 0 ? '#ffc27a' : '#ffb347');
    body.addColorStop(1, '#e0582a');
  } else if (half) {
    body.addColorStop(0, '#ffe7a8');
    body.addColorStop(0.5, '#c98a4a');
    body.addColorStop(1, '#5a3a4a');
  } else {
    body.addColorStop(0, '#6a6fa8');
    body.addColorStop(0.6, '#3c3f74');
    body.addColorStop(1, '#22244a');
  }
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, rx, ry, 0, 0, TAU);
  ctx.fill();
  // 대나무 살
  ctx.strokeStyle = on ? 'rgba(160,60,20,.45)' : 'rgba(10,10,30,.45)';
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    ctx.beginPath();
    ctx.ellipse(0, (k * ry) / 3, rx * Math.sqrt(1 - (k / 3) ** 2), ry * 0.12, 0, 0, TAU);
    ctx.stroke();
  }
  // 위·아래 뚜껑
  ctx.fillStyle = '#2a1a14';
  ctx.fillRect(-rx * 0.5, -ry - u * 0.1, rx, u * 0.16);
  ctx.fillRect(-rx * 0.45, ry - u * 0.06, rx * 0.9, u * 0.14);
  // 술
  ctx.strokeStyle = on ? '#ff5a3a' : '#7a3a4a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, ry + u * 0.08);
  ctx.lineTo(Math.sin(t * 0.08 + l.sw) * u * 0.08, ry + u * 0.5);
  ctx.stroke();
  // 큰 등불: 심지 두 개 (켜진 만큼 불꽃)
  if (l.big) {
    const lit = on ? 2 : half ? 1 : 0;
    for (let k = 0; k < 2; k++) {
      const fx0 = (k ? 1 : -1) * rx * 0.32, fy0 = ry * 0.15;
      ctx.fillStyle = k < lit ? '#fff6c8' : 'rgba(20,20,40,.7)';
      ctx.beginPath();
      ctx.ellipse(fx0, fy0 - (k < lit ? Math.sin(t * 0.3 + k) * u * 0.03 : 0), u * 0.1, u * 0.18, 0, 0, TAU);
      ctx.fill();
    }
  } else if (on) {
    ctx.fillStyle = '#fffbe8';
    ctx.beginPath();
    ctx.ellipse(0, ry * 0.12, u * 0.12, u * 0.2 + Math.sin(t * 0.3 + l.sw) * u * 0.03, 0, 0, TAU);
    ctx.fill();
  }
  // 쌍둥이 리본
  if (l.twin >= 0) {
    ctx.fillStyle = TWIN_COL[Math.min(l.twin, Math.max(0, l.twin)) % 2 === 0 ? 0 : 1];
    ctx.beginPath();
    ctx.moveTo(-rx * 0.9, -ry * 0.55);
    ctx.lineTo(-rx * 1.35, -ry * 0.85);
    ctx.lineTo(-rx * 1.3, -ry * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  if (newGlow > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 0.25)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, u * 1.4 * big + Math.sin(t * 0.2) * 2, 0, TAU);
    ctx.stroke();
  }
}

/** 선돌 바위 (부메랑 높이까지 솟은 이끼 낀 돌) */
function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, gy: number, u: number, hitT: number) {
  ctx.fillStyle = 'rgba(5,6,20,.5)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.3, gy, u * 1.3, u * 0.38, 0, 0, TAU);
  ctx.fill();
  const jig = hitT > 0 ? Math.sin(hitT * 1.5) * u * 0.08 * (hitT / 20) : 0;
  ctx.save();
  ctx.translate(x + jig, 0);
  const g = ctx.createLinearGradient(-u, 0, u, 0);
  g.addColorStop(0, '#8a8aa8');
  g.addColorStop(0.55, '#5e5e7e');
  g.addColorStop(1, '#383852');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 1.0, gy);
  ctx.quadraticCurveTo(-u * 1.15, y - u * 0.2, -u * 0.55, y - u * 1.05);
  ctx.quadraticCurveTo(0, y - u * 1.45, u * 0.6, y - u * 0.95);
  ctx.quadraticCurveTo(u * 1.1, y - u * 0.2, u * 0.95, gy);
  ctx.closePath();
  ctx.fill();
  // 윗면 빛 · 이끼 · 금
  ctx.fillStyle = 'rgba(220,225,255,.25)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.15, y - u * 0.95, u * 0.45, u * 0.18, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4f7a4a';
  ctx.beginPath();
  ctx.ellipse(-u * 0.5, y - u * 0.55, u * 0.32, u * 0.16, 0.4, 0, TAU);
  ctx.ellipse(u * 0.35, y + u * 0.05, u * 0.26, u * 0.12, -0.3, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(20,20,40,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(u * 0.1, y - u * 0.9);
  ctx.lineTo(u * 0.25, y - u * 0.45);
  ctx.lineTo(u * 0.1, y - u * 0.1);
  ctx.stroke();
  ctx.restore();
}

/** 부엉이 (나무 그루터기 위). mood: 0 졸음 · 1 낚아챔(부메랑 문 채 우쭐) */
function drawOwl(ctx: CanvasRenderingContext2D, x: number, y: number, gy: number, u: number, mood: number, t: number) {
  ctx.fillStyle = 'rgba(5,6,20,.45)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.25, gy, u * 1.0, u * 0.3, 0, 0, TAU);
  ctx.fill();
  // 그루터기 기둥
  const pg = ctx.createLinearGradient(x - u * 0.4, 0, x + u * 0.4, 0);
  pg.addColorStop(0, '#4a3220');
  pg.addColorStop(0.5, '#7a5634');
  pg.addColorStop(1, '#3a2616');
  ctx.fillStyle = pg;
  ctx.fillRect(x - u * 0.38, y + u * 0.5, u * 0.76, gy - y - u * 0.5);
  ctx.fillStyle = '#a07a50';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.5, u * 0.42, u * 0.14, 0, 0, TAU);
  ctx.fill();
  // 몸
  const bob = Math.sin(t * 0.05) * u * 0.04;
  const g = ctx.createRadialGradient(x - u * 0.2, y - u * 0.3 + bob, u * 0.1, x, y + bob, u * 0.85);
  g.addColorStop(0, '#d8b07a');
  g.addColorStop(0.6, '#a6763e');
  g.addColorStop(1, '#6a4422');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y + bob, u * 0.62, u * 0.72, 0, 0, TAU);
  ctx.fill();
  // 귀깃
  ctx.fillStyle = '#7a5028';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x + sd * u * 0.2, y - u * 0.55 + bob);
    ctx.lineTo(x + sd * u * 0.55, y - u * 0.95 + bob);
    ctx.lineTo(x + sd * u * 0.52, y - u * 0.4 + bob);
    ctx.closePath();
    ctx.fill();
  }
  // 배 무늬
  ctx.fillStyle = '#f0dcb0';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.25 + bob, u * 0.36, u * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#b08a5a';
  ctx.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(x + (k - 1) * u * 0.16, y + u * 0.15 + bob + (k % 2) * u * 0.14, u * 0.07, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 눈
  for (const sd of [-1, 1]) {
    const ex = x + sd * u * 0.26, ey = y - u * 0.2 + bob;
    ctx.fillStyle = '#fff6d8';
    ctx.beginPath();
    ctx.arc(ex, ey, u * 0.22, 0, TAU);
    ctx.fill();
    if (mood === 0 && Math.floor(t / 90) % 3 !== 2) {
      ctx.strokeStyle = '#2a1a10';
      ctx.lineWidth = Math.max(1.2, u * 0.08);
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.12, 0.2, Math.PI - 0.2);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffb020';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a1008';
      ctx.beginPath();
      ctx.arc(ex + (mood ? sd * u * 0.04 : 0), ey, u * 0.075, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#f0a020';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.08, y - u * 0.05 + bob);
  ctx.lineTo(x + u * 0.08, y - u * 0.05 + bob);
  ctx.lineTo(x, y + u * 0.12 + bob);
  ctx.closePath();
  ctx.fill();
}

/** 부메랑 (나무 V자). ang = 돌아가는 각 */
function drawBoomer(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, ang: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.rotate(sd * 0.95);
    const g = ctx.createLinearGradient(0, -u * 0.2, 0, u * 0.2);
    g.addColorStop(0, '#ffd08a');
    g.addColorStop(0.5, '#e0903a');
    g.addColorStop(1, '#9a5420');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.2);
    ctx.quadraticCurveTo(u * 0.6, -u * 0.32, u * 1.1, -u * 0.12);
    ctx.quadraticCurveTo(u * 1.25, 0, u * 1.1, u * 0.14);
    ctx.quadraticCurveTo(u * 0.6, u * 0.05, 0, u * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c2381e';
    ctx.fillRect(u * 0.55, -u * 0.16, u * 0.12, u * 0.26);
    ctx.fillStyle = '#2a6ac2';
    ctx.fillRect(u * 0.8, -u * 0.13, u * 0.1, u * 0.22);
    ctx.restore();
  }
  ctx.restore();
}

/** 캥거루 (앞모습). mood: 0 평소 · 1 겨눔(혀) · 2 던짐 · 3 우쭐 · 4 아차(눈 동그래) · 5 통!(어질어질) · 6 기뻐 폴짝 */
function drawRoo(ctx: CanvasRenderingContext2D, x: number, gy: number, u: number, mood: number, t: number, holding: boolean, lean: number) {
  const hop = mood === 6 ? Math.abs(Math.sin(t * 0.18)) * u * 0.9 : mood === 3 ? Math.abs(Math.sin(t * 0.25)) * u * 0.3 : 0;
  const y = gy - hop;
  ctx.fillStyle = 'rgba(5,6,20,.5)';
  ctx.beginPath();
  ctx.ellipse(x + u * 0.2, gy + u * 0.1, u * 2.0 - hop * 0.3, u * 0.42, 0, 0, TAU);
  ctx.fill();
  const fur = '#c98a4b', furD = '#9a6230', belly = '#f2d3a4';
  // 꼬리
  ctx.strokeStyle = furD;
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.55;
  ctx.beginPath();
  ctx.moveTo(x + u * 0.6, y - u * 0.6);
  ctx.quadraticCurveTo(x + u * 1.9, y - u * 0.2, x + u * 2.1, y + u * 0.05);
  ctx.stroke();
  // 발
  ctx.fillStyle = furD;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + sd * u * 0.62, y - u * 0.05, u * 0.62, u * 0.2, sd * 0.15, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y - u * 1.2);
  ctx.rotate(lean);
  // 허벅지
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.62, u * 0.6, u * 0.55, u * 0.7, sd * -0.2, 0, TAU);
    ctx.fill();
  }
  // 몸통
  const bg = ctx.createRadialGradient(-u * 0.3, -u * 0.6, u * 0.2, 0, 0, u * 1.4);
  bg.addColorStop(0, '#e0a868');
  bg.addColorStop(0.7, fur);
  bg.addColorStop(1, furD);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.85, u * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.15, u * 0.55, u * 0.85, 0, 0, TAU);
  ctx.fill();
  // 주머니 + 아기 캥거루
  const jy = u * 0.42, jumpy = mood === 4 || mood === 5 ? u * 0.25 : mood === 3 || mood === 6 ? -u * 0.15 : 0;
  ctx.fillStyle = '#c98a4b';
  ctx.beginPath();
  ctx.ellipse(0, jy - u * 0.15 + jumpy, u * 0.28, u * 0.26, 0, 0, TAU);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.16, jy - u * 0.42 + jumpy, u * 0.07, u * 0.16, sd * 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#1a1008';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (mood === 4 || mood === 5) ctx.arc(sd * u * 0.1, jy - u * 0.18 + jumpy, u * 0.055, 0, TAU);
    else ctx.arc(sd * u * 0.1, jy - u * 0.18 + jumpy, u * 0.04, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#e8c08a';
  ctx.beginPath();
  ctx.ellipse(0, jy + u * 0.18, u * 0.5, u * 0.3, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = furD;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, jy + u * 0.18, u * 0.5, u * 0.3, 0, Math.PI * 1.05, Math.PI * 1.95);
  ctx.stroke();
  // 팔: 들고 있으면 머리 위로 번쩍, 던진 뒤엔 앞으로 쭉, 아니면 허리에
  ctx.strokeStyle = fur;
  ctx.lineWidth = u * 0.32;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.6, -u * 0.55);
    if (holding) ctx.quadraticCurveTo(sd * u * 1.0, -u * 1.4, sd * u * 0.28, -u * 2.2);
    else if (mood === 2) ctx.quadraticCurveTo(sd * u * 1.1, -u * 0.9, sd * u * 0.5, -u * 1.9);
    else if (mood === 6 || mood === 3) ctx.quadraticCurveTo(sd * u * 1.3, -u * 1.0, sd * u * 1.25, -u * 1.85);
    else if (mood === 5) ctx.quadraticCurveTo(sd * u * 1.0, -u * 1.3, sd * u * 0.5, -u * 1.75);
    else ctx.quadraticCurveTo(sd * u * 1.05, -u * 0.2, sd * u * 0.7, u * 0.1);
    ctx.stroke();
  }
  // 머리
  const hy = -u * 1.55;
  const hg = ctx.createRadialGradient(-u * 0.2, hy - u * 0.25, u * 0.1, 0, hy, u * 0.75);
  hg.addColorStop(0, '#e6b074');
  hg.addColorStop(1, fur);
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.36, hy - u * 0.7, u * 0.17, u * 0.45, sd * 0.28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0b8a0';
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.36, hy - u * 0.66, u * 0.08, u * 0.3, sd * 0.28, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, hy, u * 0.62, u * 0.56, 0, 0, TAU);
  ctx.fill();
  // 주둥이
  ctx.fillStyle = '#ecc898';
  ctx.beginPath();
  ctx.ellipse(0, hy + u * 0.22, u * 0.32, u * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1408';
  ctx.beginPath();
  ctx.ellipse(0, hy + u * 0.1, u * 0.12, u * 0.08, 0, 0, TAU);
  ctx.fill();
  // 눈
  const blink = Math.floor(t / 7) % 40 === 0;
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.24, ey = hy - u * 0.12;
    ctx.fillStyle = '#1a0c04';
    ctx.strokeStyle = '#1a0c04';
    ctx.lineWidth = Math.max(1.3, u * 0.08);
    if (mood === 4) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.16, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a0c04';
      ctx.beginPath();
      ctx.arc(ex, ey, u * 0.06, 0, TAU);
      ctx.fill();
    } else if (mood === 5) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 + t * 0.3 * sd, rr = (k / 12) * u * 0.15;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.stroke();
    } else if (mood === 3 || mood === 6) {
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.05, u * 0.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 1) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.12, ey - sd * u * 0.02);
      ctx.lineTo(ex + u * 0.12, ey + sd * u * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.04, u * 0.05, 0, TAU);
      ctx.fill();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.1, ey);
      ctx.lineTo(ex + u * 0.1, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, ey, u * 0.08, u * 0.11, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + u * 0.03, ey - u * 0.04, u * 0.03, 0, TAU);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,110,.4)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.42, hy + u * 0.12, u * 0.12, u * 0.07, 0, 0, TAU);
    ctx.fill();
  }
  // 입
  ctx.strokeStyle = '#4a2010';
  ctx.lineWidth = Math.max(1.2, u * 0.06);
  ctx.beginPath();
  if (mood === 4 || mood === 5) {
    ctx.fillStyle = '#5a1a10';
    ctx.ellipse(0, hy + u * 0.33, u * 0.09, u * 0.11, 0, 0, TAU);
    ctx.fill();
  } else if (mood === 3 || mood === 6) {
    ctx.arc(0, hy + u * 0.22, u * 0.14, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mood === 1) {
    ctx.moveTo(-u * 0.1, hy + u * 0.3);
    ctx.lineTo(u * 0.1, hy + u * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#ff7a8a';
    ctx.beginPath();
    ctx.ellipse(u * 0.12, hy + u * 0.36, u * 0.07, u * 0.09, 0.4, 0, TAU);
    ctx.fill();
  } else {
    ctx.arc(0, hy + u * 0.26, u * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // 통! 혹 + 어질어질 별
  if (mood === 5) {
    ctx.fillStyle = '#f0a070';
    ctx.beginPath();
    ctx.arc(u * 0.15, hy - u * 0.55, u * 0.17, 0, TAU);
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * TAU) / 3;
      ctx.fillStyle = '#fff27a';
      star5(ctx, Math.cos(a) * u * 0.75, hy - u * 0.95 + Math.sin(a) * u * 0.18, u * 0.16);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 집 한 채 (3/4 시점 상자 + 지붕). glow = 마을이 밝은 정도, cheer = 창문 열고 환호 */
function drawHouse(ctx: CanvasRenderingContext2D, x: number, by: number, wd: number, ht: number, roof: string, k: number, glow: number, cheer: number, t: number, u: number) {
  const side = wd * 0.22;
  // 옆면
  ctx.fillStyle = '#6a5a6e';
  ctx.beginPath();
  ctx.moveTo(x + wd, by);
  ctx.lineTo(x + wd + side, by - side * 0.5);
  ctx.lineTo(x + wd + side, by - ht - side * 0.5);
  ctx.lineTo(x + wd, by - ht);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const wg = ctx.createLinearGradient(0, by - ht, 0, by);
  wg.addColorStop(0, '#9a8aa0');
  wg.addColorStop(1, '#7a6a84');
  ctx.fillStyle = wg;
  ctx.fillRect(x, by - ht, wd, ht);
  // 지붕
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - wd * 0.1, by - ht);
  ctx.lineTo(x + wd * 0.5, by - ht - wd * 0.42);
  ctx.lineTo(x + wd * 0.5 + side, by - ht - wd * 0.42 - side * 0.5);
  ctx.lineTo(x + wd + side + wd * 0.08, by - ht - side * 0.5);
  ctx.lineTo(x + wd * 1.1, by - ht);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.moveTo(x + wd * 0.5, by - ht - wd * 0.42);
  ctx.lineTo(x + wd * 1.1, by - ht);
  ctx.lineTo(x + wd + side + wd * 0.08, by - ht - side * 0.5);
  ctx.lineTo(x + wd * 0.5 + side, by - ht - wd * 0.42 - side * 0.5);
  ctx.closePath();
  ctx.fill();
  // 창문
  const ww = wd * 0.3, wh = ht * 0.38, wx = x + wd * 0.35 - ww / 2, wy = by - ht * 0.72;
  const lit = 0.25 + glow * 0.75;
  const cg = ctx.createLinearGradient(0, wy, 0, wy + wh);
  cg.addColorStop(0, `rgba(255,226,150,${lit})`);
  cg.addColorStop(1, `rgba(255,160,70,${lit})`);
  ctx.fillStyle = glow > 0.05 ? cg : '#2a2850';
  ctx.fillRect(wx, wy, ww, wh);
  if (cheer > 0) {
    // 덧문이 활짝 + 동물 얼굴이 쑥
    ctx.fillStyle = '#5a3a2a';
    ctx.fillRect(wx - ww * 0.5, wy, ww * 0.45, wh);
    ctx.fillRect(wx + ww * 1.05, wy, ww * 0.45, wh);
    const pop = Math.min(1, cheer / 12) * (1 + 0.1 * Math.sin(t * 0.5 + k));
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(u * 0.95 * pop)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(VILLAGER[k % VILLAGER.length], wx + ww / 2, wy + wh * 0.35 - Math.abs(Math.sin(t * 0.3 + k)) * u * 0.3);
  } else {
    ctx.strokeStyle = '#3a2a3a';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
  }
  // 문
  ctx.fillStyle = '#4a2e22';
  ctx.beginPath();
  ctx.roundRect(x + wd * 0.64, by - ht * 0.5, wd * 0.22, ht * 0.5, [wd * 0.1, wd * 0.1, 0, 0]);
  ctx.fill();
  // 굴뚝 연기
  if (k % 2 === 0) {
    ctx.fillStyle = '#5a4a5a';
    ctx.fillRect(x + wd * 0.72, by - ht - wd * 0.42, wd * 0.12, wd * 0.22);
    for (let j = 0; j < 3; j++) {
      const age = (t * 0.5 + j * 40 + k * 17) % 120;
      ctx.fillStyle = `rgba(200,200,230,${0.18 * (1 - age / 120)})`;
      ctx.beginPath();
      ctx.arc(x + wd * 0.78 + Math.sin(age * 0.05) * u * 0.3, by - ht - wd * 0.45 - age * u * 0.03, u * (0.15 + age * 0.004), 0, TAU);
      ctx.fill();
    }
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: BoomState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const L = s.L, d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(0.12), y), text, col, size);
  };
  const litFrac = L.lamps.length ? onCount(L) / L.lamps.length : 0;
  const u = R(0.05);

  ctx.save();
  fx.begin(ctx);
  // ── 밤하늘 ──
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.32));
  sky.addColorStop(0, '#0c1030');
  sky.addColorStop(1, `rgb(${40 + litFrac * 30},${36 + litFrac * 14},${92 - litFrac * 10})`);
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(0.34) + 10);
  for (let k = 0; k < 46; k++) {
    const sx = hsh(k * 3.1) * w, sy = Y(0.08) + hsh(k * 7.7) * Y(0.2), tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.03 + k));
    ctx.fillStyle = `rgba(255,255,230,${tw * 0.8})`;
    ctx.fillRect(sx, sy, k % 7 ? 1.4 : 2.4, k % 7 ? 1.4 : 2.4);
  }
  // 달
  {
    const mx = X(0.84), my = Y(0.14), mr = R(0.045);
    const mg = ctx.createRadialGradient(mx, my, mr * 0.5, mx, my, mr * 3);
    mg.addColorStop(0, 'rgba(255,250,210,.35)');
    mg.addColorStop(1, 'rgba(255,250,210,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(mx, my, mr * 3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff6cc';
    ctx.beginPath();
    ctx.arc(mx, my, mr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(200,190,140,.5)';
    ctx.beginPath();
    ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.2, 0, TAU);
    ctx.arc(mx + mr * 0.35, my + mr * 0.3, mr * 0.14, 0, TAU);
    ctx.fill();
  }
  // 먼 언덕
  ctx.fillStyle = '#1c1e48';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.3));
  for (let k = 0; k <= 20; k++) ctx.lineTo(X(k / 20), Y(0.235 - 0.03 * Math.sin(k * 0.9) - 0.015 * Math.sin(k * 2.3)));
  ctx.lineTo(w, Y(0.32));
  ctx.lineTo(0, Y(0.32));
  ctx.fill();
  // ── 집들 (뒷줄) ──
  const roofs = ['#b8483a', '#3f6f9f', '#7a9a4a', '#a8584a', '#6a5aa8'];
  for (let k = 0; k < 5; k++) {
    const hx = X(0.02 + k * 0.198), wd = R(0.15), ht = R(0.085 + 0.02 * hsh(k + 3));
    drawHouse(ctx, hx, Y(0.315), wd, ht, roofs[k], k, litFrac, s.cheerT > 0 || (s.phase === 'result' && s.ok) ? 1 + (s.cheerT || s.pt) : 0, t, u);
  }
  // ── 광장 바닥 ──
  const gg = ctx.createLinearGradient(0, Y(0.3), 0, Y(BANDY + 0.05));
  gg.addColorStop(0, '#2a2650');
  gg.addColorStop(1, '#3e3460');
  ctx.fillStyle = gg;
  ctx.fillRect(0, Y(0.3), w, Y(BANDY + 0.25 - 0.3));
  // 돌바닥 (뒤로 갈수록 작고 촘촘)
  for (let r = 0; r < 16; r++) {
    const y0 = 0.31 + r * 0.062, sz = 0.05 + r * 0.004;
    for (let c = -1; c < 12; c++) {
      const cx = (c + (r % 2) * 0.5) * (sz * 1.6) + 0.02, hv = hsh(r * 17 + c * 5);
      ctx.fillStyle = `rgba(${90 + hv * 30},${80 + hv * 20},${130 + hv * 20},${0.18 + hv * 0.1})`;
      ctx.beginPath();
      ctx.ellipse(X(cx), Y(y0), R(sz * 0.7), R(sz * 0.32), 0, 0, TAU);
      ctx.fill();
    }
  }
  // 켜진 등불 아래 빛 웅덩이
  for (const l of L.lamps) {
    if (!isOn(l) && !(l.big && l.v === 1)) continue;
    const gy = Y(l.y + LIFT), rr = R(isOn(l) ? 0.16 : 0.09) * (l.big ? 1.3 : 1);
    const pg = ctx.createRadialGradient(X(l.x), gy, 2, X(l.x), gy, rr);
    pg.addColorStop(0, 'rgba(255,190,100,.38)');
    pg.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(X(l.x), gy, rr, rr * 0.45, 0, 0, TAU);
    ctx.fill();
  }
  // 쌍둥이 줄 (깃발 줄)
  L.lamps.forEach((l, i) => {
    if (l.twin < i) return;
    const q = L.lamps[l.twin], col = TWIN_COL[(i + l.twin) % 2];
    const ax = X(l.x), ay = Y(l.y - 0.07), bx = X(q.x), by = Y(q.y - 0.07), mx = (ax + bx) / 2, my = Math.max(ay, by) + R(0.06);
    ctx.strokeStyle = col;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(mx, my, bx, by);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let k = 1; k < 8; k++) {
      const q2 = k / 8, px = (1 - q2) ** 2 * ax + 2 * (1 - q2) * q2 * mx + q2 * q2 * bx, py = (1 - q2) ** 2 * ay + 2 * (1 - q2) * q2 * my + q2 * q2 * by;
      ctx.fillStyle = k % 2 ? col : '#fff6e6';
      ctx.beginPath();
      ctx.moveTo(px - R(0.008), py);
      ctx.lineTo(px + R(0.008), py);
      ctx.lineTo(px, py + R(0.016));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
  // 반딧불
  for (let k = 0; k < 10; k++) {
    const fx0 = X(0.1 + 0.8 * hsh(k * 9.1) + 0.04 * Math.sin(t * 0.013 + k)), fy0 = Y(0.4 + 0.5 * hsh(k * 4.3) + 0.03 * Math.cos(t * 0.017 + k * 2));
    ctx.fillStyle = `rgba(200,255,140,${0.35 + 0.35 * Math.sin(t * 0.07 + k * 3)})`;
    ctx.beginPath();
    ctx.arc(fx0, fy0, 1.6, 0, TAU);
    ctx.fill();
  }

  // ── 미리 보기 계산 (꾹 누르고 있는 동안) ──
  let pv: { f: Flight; inc: number[] } | null = null;
  const canThrow = s.phase === 'play' && !s.fl && s.throws > 0;
  if (s.down && s.aim && canThrow) {
    const tip = aimTip(s.aim.x, s.aim.y);
    if (tip) {
      const key = `${tip.x.toFixed(4)}:${tip.y.toFixed(4)}:${s.stage}:${s.tries}`;
      const c = pvCache.get(s);
      if (c && c.key === key) pv = c;
      else {
        const f = flight(L, tip.x, tip.y);
        pv = { f, inc: incOf(L, f.hits) };
        pvCache.set(s, { key, ...pv });
      }
    }
  }
  const legCol = (n: number) => (n === 0 ? '#ffb547' : n === 1 ? '#7fd8ff' : n === 2 ? '#ffd7a0' : '#bfeaff');
  const drawLegs = (f: Flight, alpha: number, upto: number) => {
    f.legs.forEach(([p, q], n) => {
      if (p >= upto) return;
      const e = Math.min(q, upto);
      ctx.strokeStyle = legCol(n);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3;
      ctx.setLineDash([R(0.016), R(0.011)]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      for (let k = p; k <= e; k++) (k === p ? ctx.moveTo : ctx.lineTo).call(ctx, X(f.xs[k]), Y(f.ys[k]));
      ctx.stroke();
      ctx.setLineDash([]);
      // 화살촉 (구간 가운데)
      const m = Math.floor((p + e) / 2);
      if (e - p > 6 && upto > q) {
        const ang = Math.atan2(f.ys[m + 1] - f.ys[m - 1], f.xs[m + 1] - f.xs[m - 1]), ax = X(f.xs[m]), ay = Y(f.ys[m]);
        ctx.fillStyle = legCol(n);
        ctx.beginPath();
        ctx.moveTo(ax + Math.cos(ang) * R(0.026), ay + Math.sin(ang) * R(0.026));
        ctx.lineTo(ax + Math.cos(ang + 2.5) * R(0.02), ay + Math.sin(ang + 2.5) * R(0.02));
        ctx.lineTo(ax + Math.cos(ang - 2.5) * R(0.02), ay + Math.sin(ang - 2.5) * R(0.02));
        ctx.closePath();
        ctx.fill();
      }
    });
    ctx.globalAlpha = 1;
    ctx.lineDashOffset = 0;
  };

  // ── 바닥에 선 것들 (뒤에서 앞으로) ──
  const items: { y: number; f: () => void }[] = [];
  const isNew = s.pt < 260 && !s.again;
  L.lamps.forEach((l) => {
    const nw = isNew && ((d.key === 'big' && l.big) || (d.key === 'twin' && l.twin >= 0) || (d.key === 'lit' && l.v0 > 0)) ? 1 : 0;
    items.push({ y: l.y + LIFT, f: () => drawLamp(ctx, X(l.x), Y(l.y), Y(l.y + LIFT), u * 0.95, l, t, nw) });
  });
  L.rocks.forEach((r, ri) => {
    const hitT = s.fl && s.fl.kind === 1 && s.fl.rockI === ri && s.fk >= s.fl.stopK ? Math.max(0, 20 - (s.fk - s.fl.stopK)) : 0;
    items.push({ y: r.y + 0.05, f: () => drawRock(ctx, X(r.x), Y(r.y), Y(r.y + 0.05), u * 0.95, hitT) });
  });
  if (L.owl) {
    const o = L.owl, caught = !!s.fl && s.fl.kind === 2 && s.fk >= s.fl.stopK && s.fk < s.fl.stopK + 22;
    items.push({ y: o.y + 0.08, f: () => drawOwl(ctx, X(o.x), Y(o.y), Y(o.y + 0.08), u * 0.9, caught ? 1 : s.fl ? 1 : 0, t) });
  }
  // 캥거루
  const holding = s.phase === 'play' && !s.fl && s.throws > 0 && s.t >= s.cool;
  let rooMood = s.mood;
  if (s.down && canThrow) rooMood = 1;
  const lean = s.down && s.aim ? Math.max(-0.25, Math.min(0.25, (s.aim.x - KX) * 0.5)) : 0;
  items.push({ y: 1.27, f: () => drawRoo(ctx, X(KX), Y(1.27), R(0.042), rooMood, t, holding, lean) });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();

  // 손에 든 부메랑
  if (holding) drawBoomer(ctx, X(KX), Y(KY - 0.005), R(0.034), -Math.PI / 2 + Math.sin(t * 0.06) * 0.1 + (s.down ? lean * 2 : 0));

  // 미리 보기 그리기
  if (pv) {
    const f = pv.f;
    drawLegs(f, 0.9, 1e9);
    // 돌아서는 곳 표시
    const tk = f.tipK >= 0 ? f.tipK : f.stopK, tx0 = X(f.xs[tk]), ty0 = Y(f.ys[tk]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx0, ty0, R(0.022) + Math.sin(t * 0.3) * 1.5, 0, TAU);
    ctx.stroke();
    if (f.kind === 1) {
      ctx.fillStyle = '#ffe0a0';
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.fillText('쿵!', X(f.xs[f.stopK]), Y(f.ys[f.stopK]) - R(0.07));
    }
    // 등불마다 +1/+2와 결과
    let nOn = 0, nOff = 0;
    L.lamps.forEach((l, i) => {
      const inc = pv!.inc[i], hh = f.hits[i];
      if (!hh && !inc) return;
      const m = MOD(l), nv = (l.v + inc) % m, becomeOn = nv === m - 1 && !isOn(l), becomeOff = isOn(l) && nv !== m - 1;
      if (becomeOn) nOn++;
      if (becomeOff) nOff++;
      const col = becomeOn ? '#3ccf7a' : becomeOff ? '#ff5a5a' : l.big && nv === 1 ? '#f0c040' : '#8a8fb8';
      const bx = X(l.x) + R(0.045) * (l.big ? 1.3 : 1), by = Y(l.y) - R(0.06) * (l.big ? 1.3 : 1);
      ctx.fillStyle = col;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx - R(0.04), by - R(0.022), R(0.08), R(0.044), R(0.022));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lbl = hh ? `+${hh}` : '±';
      ctx.fillText(becomeOn ? `${lbl}✓` : becomeOff ? `${lbl}✗` : `${lbl}=`, bx, by + 1, R(0.078));
    });
    // 손가락 옆 요약
    const sx = Math.max(R(0.16), Math.min(w - R(0.16), tx0)), sy = ty0 - R(0.06) < Y(0.12) ? ty0 + R(0.07) : ty0 - R(0.06);
    const txt = nOn || nOff ? `켜짐 ${nOn}${nOff ? ` · 꺼짐 ${nOff}` : ''}` : '바뀌는 것 없음';
    font(0.038, 900);
    const tw = ctx.measureText(txt).width + R(0.04);
    ctx.fillStyle = 'rgba(10,12,40,.85)';
    ctx.beginPath();
    ctx.roundRect(sx - tw / 2, sy - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.fillStyle = nOff ? '#ffb0a8' : nOn ? '#b8ffcf' : '#c8cce8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, sy + 1);
  }

  // 날아가는 부메랑: 지나온 길 + 꼬리 + 그림자
  if (s.fl) {
    const f = s.fl, k0 = Math.min(f.xs.length - 1, Math.floor(s.fk)), fr = s.fk - k0, k1 = Math.min(f.xs.length - 1, k0 + 1);
    const bx = f.xs[k0] + (f.xs[k1] - f.xs[k0]) * fr, by = f.ys[k0] + (f.ys[k1] - f.ys[k0]) * fr;
    drawLegs(f, 0.35, k0);
    const carry = f.kind === 2 && k0 > f.stopK + 21;
    ctx.fillStyle = 'rgba(5,6,20,.4)';
    ctx.beginPath();
    ctx.ellipse(X(bx), Y(by + LIFT), R(0.03), R(0.01), 0, 0, TAU);
    ctx.fill();
    for (let j = 1; j <= 6; j++) {
      const kk = Math.max(0, k0 - j * 2);
      ctx.fillStyle = `rgba(255,220,150,${0.25 * (1 - j / 7)})`;
      ctx.beginPath();
      ctx.arc(X(f.xs[kk]), Y(f.ys[kk]), R(0.014) * (1 - j / 8), 0, TAU);
      ctx.fill();
    }
    if (carry) {
      // 부엉이가 물고 날아다 준다
      ctx.fillStyle = '#ffffff';
      font(0.06, 400);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🦉', X(bx), Y(by) - R(0.03));
      drawBoomer(ctx, X(bx), Y(by) + R(0.01), R(0.024), 0.4);
    } else if (!(f.kind === 2 && k0 >= f.stopK)) drawBoomer(ctx, X(bx), Y(by), R(0.032), s.t * 0.45);
  }

  // NEW 스포트라이트 (바위·부엉이·바람)
  if (isNew && s.pt > 20) {
    const spots: Pt[] = d.key === 'rock' ? L.rocks : d.key === 'owl' && L.owl ? [L.owl] : [];
    for (const p of spots) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 0.25)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y), R(0.075) + Math.sin(t * 0.2) * 2, 0, TAU);
      ctx.stroke();
    }
    const tags: Pt[] = [...spots, ...L.lamps.filter((l) => (d.key === 'big' && l.big) || (d.key === 'twin' && l.twin >= 0) || (d.key === 'lit' && l.v0 > 0))];
    for (const p of tags.slice(0, 3)) {
      const tx1 = X(p.x), ty1 = Y(p.y) - R(0.1);
      ctx.fillStyle = '#ff4f8a';
      ctx.beginPath();
      ctx.roundRect(tx1 - R(0.045), ty1 - R(0.02), R(0.09), R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NEW', tx1, ty1 + 1);
    }
  }
  // 바람: 나뭇잎이 흘러가고 바람 자루가 펄럭
  if (L.wind) {
    const dir = Math.sign(L.wind);
    for (let k = 0; k < 9; k++) {
      const px = (((hsh(k * 3.3) + dir * t * 0.004 * (1 + hsh(k))) % 1) + 1) % 1, py = 0.36 + hsh(k * 5.1) * 0.6;
      ctx.fillStyle = k % 2 ? '#9fd86a' : '#e8b04a';
      ctx.beginPath();
      ctx.ellipse(X(px), Y(py) + Math.sin(t * 0.1 + k) * R(0.01), R(0.012), R(0.006), t * 0.1 + k, 0, TAU);
      ctx.fill();
    }
    const sx0 = X(dir < 0 ? 0.92 : 0.08), sy0 = Y(0.33);
    ctx.strokeStyle = '#d8d0c0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx0, sy0 + R(0.1));
    ctx.lineTo(sx0, sy0);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = k % 2 ? '#ffffff' : '#ff5a4a';
      const x0 = sx0 + dir * R(0.022) * k, wob = Math.sin(t * 0.3 + k) * R(0.004) * k;
      ctx.fillRect(Math.min(x0, x0 + dir * R(0.022)), sy0 + wob + R(0.002) * k, R(0.022), R(0.026) - R(0.004) * k);
    }
  }
  // 1판 첫 던지기 전: 여기를 꾹!
  if (s.stage === 0 && !s.firstThrow && s.phase === 'play' && !s.down) {
    const best = s.P.cands.reduce((a, c) => (c.inc.filter((v) => v).length > a.inc.filter((v) => v).length ? c : a), s.P.cands[0]);
    if (best) {
      const pulse = (t % 50) / 50;
      ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(X(best.x), Y(best.y), R(0.02 + pulse * 0.06), 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.07, 400);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', X(best.x) + R(0.03), Y(best.y) + R(0.06) + Math.sin(t * 0.12) * R(0.01));
    }
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'throw') fx.burst(x, y, '#ffffff', 10, 3, 2), fx.kick(2), say(x, y - R(0.12), e.text!, '#ffffff', 16);
    if (e.kind === 'on') {
      const n = e.n ?? 1;
      fx.burst(x, y, '#ffd27a', 14 + n * 6, 3 + n * 0.8, 2.6), fx.burst(x, y, '#ffffff', 8, 2.4, 2), fx.ring(x, y, '#ffcf6a', R(0.07 + n * 0.02), 3 + n);
      fx.kick(1.5 + n * 1.2);
      say(x, y - R(0.09), e.text!, n >= 3 ? '#ffe066' : '#fff3c4', Math.min(26, 15 + n * 3));
    }
    if (e.kind === 'off') fx.burst(x, y, '#8a90c8', 16, 3, 2.2), fx.ring(x, y, '#ff6a6a', R(0.07), 3), fx.kick(4), say(x, y - R(0.09), e.text!, '#ffb0a8', 16);
    if (e.kind === 'half') fx.burst(x, y, '#ffe9a0', 10, 2.4, 2), say(x, y - R(0.09), e.text!, '#ffe9a0', 14);
    if (e.kind === 'twin') fx.ring(x, y, '#ff9ed0', R(0.08), 3);
    if (e.kind === 'double') say(x, y - R(0.15), e.text!, '#9fe8ff', 15);
    if (e.kind === 'tip') fx.ring(x, y, '#ffffff', R(0.05), 2);
    if (e.kind === 'rock') fx.burst(x, y, '#c8c8e0', 22, 4, 2.6), fx.ring(x, y, '#ffffff', R(0.08), 4), fx.kick(7), say(x, y - R(0.1), e.text!, '#ffe0a0', 16);
    if (e.kind === 'owl') fx.burst(x, y, '#c89a60', 18, 3.4, 2.4), fx.kick(4), say(x, y - R(0.1), e.text!, '#ffe0b0', 16);
    if (e.kind === 'catch') fx.burst(x, y, '#ffe0a0', 10, 2.4, 2), say(x + R(0.12), y - R(0.02), e.text!, '#ffffff', 14);
    if (e.kind === 'bonk') fx.burst(x, y, '#fff27a', 20, 3.6, 2.4), fx.ring(x, y, '#ffffff', R(0.06), 4), fx.kick(7), say(x, y - R(0.05), e.text!, '#ffd0a0', 24);
    if (e.kind === 'cancel') say(x, y, e.text!, '#c8cce8', 14);
    if (e.kind === 'cheer') {
      for (let k = 0; k < 5; k++) fx.burst(X(0.095 + k * 0.198), Y(0.25), ['#ffd27a', '#ff9ec4', '#9fe8ff', '#b8ffcf', '#ffffff'][k], 14, 3.4, 2.4);
      fx.blink('#ffe9b0', 0.18);
      fx.kick(6);
      say(w / 2, Y(0.36), e.text!, '#ffe066', 22);
    }
    if (e.kind === 'clear') {
      for (let k = 0; k < 6; k++) fx.burst(X(0.15 + 0.14 * k), Y(0.12 + 0.06 * (k % 2)), ['#ffd27a', '#ff7eb6', '#7fd8ff', '#b8ffcf', '#ffb547', '#ffffff'][k], 30, 5, 2.8);
      fx.ring(w / 2, Y(0.5), '#ffd27a', R(0.45), 6);
      fx.blink('#fff0c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD (위 띠) ═════════════
  const hb = R(0.08);
  ctx.fillStyle = 'rgba(10,12,36,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🏮 ${s.stage + 1}번째 밤`, tw1 = ctx.measureText(ttl).width;
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
  // 새것 알림 띠
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(BANDY - 0.03) - drop;
    ctx.fillStyle = 'rgba(10,12,36,.92)';
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
  // 판 카드
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '마을이 다 밝아졌어요! 🏮' : '마을이 밝아졌어요!'), (sub = `다 켬 ✓ · 던지기 ${s.used}번${s.used <= s.par ? ' ✓' : ` (≤${s.par} ✗)`} · 한 번에 ${s.best}개${s.best >= s.C ? ' ✓' : ` (${s.C}개 ✗)`}`), (col = '#ffd84a');
      else (head = `아이고… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 밤 다시' : '끝 — 마을 사람들이 고마워해요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 밤` : `${s.stage + 1}번째 밤`;
      sub = `등불 ${L.lamps.length}개 · ${d.free ? '연습 — 부메랑 무한' : `부메랑 ${s.throws}개`} · ★ ${s.par}번 안에`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.17 : 0.19), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(10,12,36,.92)';
      ctx.beginPath();
      ctx.roundRect(-R(0.46), -R(0.055), R(0.92), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = Math.min(ctx.measureText(head).width, R(0.6)), sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018), R(0.6));
        for (let k = 0; k < 3; k++) {
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
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.84));
      ctx.fillStyle = '#fff6e6';
      font(0.036, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.86));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.88));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = BANDY + 0.03, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(16,18,48,.95)');
    g.addColorStop(1, 'rgba(8,10,30,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 남은 부메랑 (★ 선까지 쓰면 별)
    const r1 = Y(ty + 0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffe9c8';
    font(0.038, 900);
    ctx.fillText('부메랑', X(0.03), r1);
    const dx0 = X(0.2), total = s.used + s.throws, show = Math.min(total, 10), dstep = R(0.058);
    if (d.free) {
      ctx.fillStyle = '#ffe9c8';
      font(0.036, 800);
      ctx.fillText(`연습 밤 — 무한 · ${s.used}번 던짐`, dx0, r1);
    } else {
      for (let k = 0; k < show; k++) {
        const cx = dx0 + k * dstep + (k >= s.par ? R(0.018) : 0), used = k < s.used;
        ctx.globalAlpha = used ? 0.25 : 1;
        drawBoomer(ctx, cx, r1, R(0.017), -Math.PI / 2);
        ctx.globalAlpha = 1;
      }
      const lx = dx0 + s.par * dstep - dstep / 2 + R(0.009);
      ctx.strokeStyle = '#ffd84a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(lx, r1 - R(0.026));
      ctx.lineTo(lx, r1 + R(0.022));
      ctx.stroke();
      ctx.textAlign = 'right';
      font(0.036, 800);
      ctx.fillStyle = s.throws > 0 ? '#ffe9c8' : '#ffb3a8';
      ctx.fillText(`${s.throws}개 남음`, X(0.97), r1);
    }
    // 별 목표 셋
    const nOnNow = onCount(L), nAll = L.lamps.length;
    const okk = s.phase === 'result' && s.ok ? s.starOk : [nOnNow === nAll, s.used <= s.par, s.best >= s.C];
    const bad = [s.phase === 'result' && !s.ok, s.used > s.par || (s.used === s.par && nOnNow < nAll && !s.fl), false];
    const labels = [`다 켜기 ${nOnNow}/${nAll}`, `${s.par}번 안에`, `한 번에 ${s.C}개`];
    const r2 = Y(ty + 0.11), cw2 = R(0.3);
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
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#ffe9c8';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.058), r2 + R(0.002), cw2 - R(0.066));
    }
    // 안내 한 줄
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstThrow && s.phase === 'play';
    if (first && !s.down) hint = '👆 하늘을 꾹 누르면 부메랑 길이 보여요 — 떼면 휙!';
    else if (s.down && s.phase === 'play') hint = s.fl ? '부메랑이 돌아오는 중…' : s.aim && !aimTip(s.aim.x, s.aim.y) ? '여기서 떼면 취소' : '주황 = 가는 길 · 하늘색 = 오는 길 · 떼면 휙!';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 밤이 밝아졌어요! 마을 축제!' : `★ ${s.got}개! 다음 밤엔 새것이 나와요`) : '꾹 누르면 몇 번 맞는지(+1/+2) 보여요';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.04 : 0.037, 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.18), w - R(0.05));
  }
}
