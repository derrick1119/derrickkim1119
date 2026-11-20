/**
 * 깃발 성 땅따먹기 (35라운드: 성 점령 행진 × 턴제) — 톡 하나, 내 속도대로.
 * 조작은 톡뿐: 내 성을 톡 → 이웃 성을 톡 하면 그 성 병사 절반이 줄지어 길을 따라 행진한다.
 *   큰 '기다리기' 단추 = 내 성 모두 +1. 내가 두기 전엔 아무것도 움직이지 않는다(시간 압박 없음).
 * 와우: 적의 다음 수는 빨간 화살표로 미리 보이고, 내 행렬과 적 행렬은 **같은 때 함께** 출발한다.
 *   같은 길에서 마주 오면 길 한가운데서 맞붙고(병사 수끼리 빼기), 이긴 쪽은 그대로 계속 간다 —
 *   적이 칠 길로 맞받아 보내면 길에서 깨부수고, 절반이 빠져나간 적 성까지 쳐들어간다.
 * 성문에서: 병사 수끼리 빼기, 남으면 깃발이 휙 내 색으로. 차례가 끝나면 모든 성 +1(농장 +3).
 * 판 8개 · 판마다 새것: 1 행진 → 2 적 예고 화살표·길에서 맞붙기 → 3 탑 성(지키는 병사 두 배) → 4 농장 성(+3)
 *   → 5 대포 성(옆 적 성 -2) → 6 도개교(두 차례마다 열리고 닫힘) → 7 해적 성(차지하면 보물: 내 성 모두 +3) → 8 적이 둘(서로도 싸움).
 * 지면: 내 본성(왕관 성)을 빼앗기거나 차례가 다 되면 하트 -1, 그 판만 다시. 하트 셋을 다 잃으면 끝.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 지도 아래 끝 (가로 폭 단위) */
const MAP_BOT = 1.235;
/** 기다리기 단추: 가운데 x, y, 폭, 높이 */
const WAIT_BTN: [number, number, number, number] = [0.635, 1.3, 0.62, 0.098];
const HIT_R = 0.2;
/** 행진 속도 (가로 폭 / 틱) */
const SPEED = 0.0082;

// ───────────────────────────── 편 ─────────────────────────────
/** 0 나(파랑) · 1 빨강 적 · 2 중립 · 3 보라 적 */
const ME = 0, RED = 1, NEU = 2, PUR = 3;
const isFoe = (o: number) => o === RED || o === PUR;

type Kind = 'castle' | 'home' | 'tower' | 'farm' | 'cannon' | 'pirate';
const KIND_NAME: Record<Kind, string> = { castle: '성', home: '본성', tower: '탑 성', farm: '농장 성', cannon: '대포 성', pirate: '해적 성' };
/** 차례가 끝나면 깃발 성마다 +1 (농장 +3). '기다리기'는 내 성 +1 더 */
const grow = (k: Kind) => (k === 'farm' ? 3 : 1);
const mult = (k: Kind) => (k === 'tower' ? 2 : 1);
const TREASURE = 3, CANNON = 2, CAP = 99;

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'win' | 'turns' | 'noloss' | 'clash' | 'take';
interface StarDef { k: StarK; n: number; kind?: Kind; label: string }
const ST = (k: StarK, n: number, label: string, kind?: Kind): StarDef => ({ k, n, label, kind });
/** 성: x, y(바닥, 가로 폭 단위), 편, 병사, 종류 */
type CD = [number, number, number, number, Kind];
/** 길: a, b, 도개교(-1 없음, 0~3 여닫는 때), 휨 */
type ED = [number, number, number?, number?];
interface StageDef {
  name: string; foe: string; news: string; hint: string;
  /** 새것 열쇠(reveals) · 스포트라이트 이름 · 어디(성 번호, -1 = 적 화살표, -2 = 도개교) */
  spot: string; spotLabel: string; spotAt: number;
  cs: CD[]; es: ED[]; river: [number, number][];
  limit: number; ai: number; stars: StarDef[];
}
export const STAGES: StageDef[] = [
  {
    name: '첫 땅따먹기', foe: '잠꾸러기 성', news: '', hint: '내 성을 톡, 그다음 옆 성을 톡!', spot: 'march', spotLabel: '', spotAt: 0,
    cs: [[0.5, 1.13, ME, 10, 'home'], [0.19, 0.86, NEU, 0, 'castle'], [0.81, 0.86, NEU, 2, 'castle'], [0.5, 0.52, RED, 3, 'home']],
    es: [[0, 1], [0, 2], [1, 3], [2, 3]],
    river: [[-0.1, 0.64], [0.25, 0.71], [0.55, 0.64], [0.8, 0.71], [1.1, 0.65]],
    limit: 30, ai: 0, stars: [ST('win', 0, '빨간 왕관 성 차지')],
  },
  {
    name: '적이 깼다', foe: '빨간 남작', news: '빨간 화살표 = 적의 다음 수', hint: '같은 길로 맞받아 보내면 길에서 맞붙어요', spot: 'arrow', spotLabel: '적의 다음 수', spotAt: -1,
    cs: [[0.5, 1.13, ME, 18, 'home'], [0.15, 0.95, NEU, 2, 'castle'], [0.85, 0.95, NEU, 3, 'castle'], [0.5, 0.79, NEU, 3, 'castle'], [0.2, 0.52, RED, 5, 'castle'], [0.74, 0.44, RED, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 4], [3, 4], [3, 5], [2, 5], [4, 5]],
    river: [[-0.1, 0.62], [0.3, 0.68], [0.6, 0.6], [1.1, 0.66]],
    limit: 22, ai: 1, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('clash', 1, '길에서 적 행렬 막기')],
  },
  {
    name: '탑 성', foe: '빨간 남작', news: '탑 성 — 지키는 병사가 두 배로 세요', hint: '탑은 병사 하나가 둘 몫을 막아요', spot: 'tower', spotLabel: '탑 성', spotAt: 2,
    cs: [[0.5, 1.14, ME, 16, 'home'], [0.84, 0.95, NEU, 3, 'castle'], [0.17, 0.84, NEU, 3, 'tower'], [0.5, 0.74, RED, 5, 'castle'], [0.18, 0.52, RED, 4, 'castle'], [0.84, 0.6, RED, 4, 'castle'], [0.56, 0.4, RED, 7, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 3], [1, 5], [2, 3], [2, 4], [3, 6], [4, 6], [5, 6]],
    river: [[-0.1, 0.66], [0.2, 0.69], [0.5, 0.64], [0.8, 0.68], [1.1, 0.65]],
    limit: 15, ai: 2, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('take', 1, '탑 성 차지하기', 'tower'), ST('turns', 9, '9번 안에 이기기')],
  },
  {
    name: '농장 성', foe: '빨간 남작', news: '농장 성 — 차례마다 병사 +3', hint: '농장은 먼저 차지할수록 이득', spot: 'farm', spotLabel: '농장 성', spotAt: 1,
    cs: [[0.5, 1.14, ME, 20, 'home'], [0.15, 0.88, NEU, 5, 'farm'], [0.85, 0.88, NEU, 5, 'farm'], [0.5, 0.82, NEU, 2, 'castle'], [0.2, 0.56, RED, 5, 'castle'], [0.8, 0.56, RED, 5, 'castle'], [0.5, 0.4, RED, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 4], [3, 5], [4, 6], [5, 6]],
    river: [[-0.1, 0.7], [0.3, 0.74], [0.6, 0.68], [1.1, 0.72]],
    limit: 15, ai: 2, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('take', 2, '농장 둘 다 차지', 'farm'), ST('turns', 11, '11번 안에 이기기')],
  },
  {
    name: '대포 성', foe: '빨간 남작', news: '대포 성 — 차례마다 옆 적 성 병사 -2', hint: '대포 옆에 서 있으면 아파요', spot: 'cannon', spotLabel: '대포 성', spotAt: 3,
    cs: [[0.5, 1.14, ME, 22, 'home'], [0.16, 0.96, NEU, 3, 'castle'], [0.84, 0.96, NEU, 3, 'castle'], [0.5, 0.76, NEU, 6, 'cannon'], [0.16, 0.6, RED, 5, 'castle'], [0.84, 0.6, RED, 5, 'castle'], [0.32, 0.4, RED, 4, 'castle'], [0.7, 0.38, RED, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 4], [3, 5], [4, 6], [6, 7], [5, 7], [3, 6]],
    river: [[-0.1, 0.84], [0.3, 0.86], [0.7, 0.84], [1.1, 0.87]],
    limit: 16, ai: 2, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('take', 1, '대포 성 차지하기', 'cannon'), ST('noloss', 0, '내 성 안 뺏기기')],
  },
  {
    name: '도개교', foe: '빨간 남작', news: '도개교 — 두 차례 열리고 두 차례 닫혀요', hint: '닫힌 다리로는 못 가요 — 열릴 때를 노려요', spot: 'bridge', spotLabel: '도개교', spotAt: -2,
    cs: [[0.5, 1.15, ME, 18, 'home'], [0.15, 0.97, NEU, 3, 'castle'], [0.85, 0.97, NEU, 3, 'castle'], [0.5, 0.925, NEU, 3, 'farm'], [0.18, 0.54, RED, 5, 'castle'], [0.82, 0.54, RED, 5, 'castle'], [0.5, 0.39, RED, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 4, 0], [2, 5, 2], [3, 6, 1], [4, 6], [5, 6]],
    river: [[-0.1, 0.63], [0.3, 0.645], [0.7, 0.615], [1.1, 0.635]],
    limit: 15, ai: 2, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('clash', 1, '길에서 적 행렬 막기'), ST('turns', 10, '10번 안에 이기기')],
  },
  {
    name: '해적 성', foe: '빨간 남작', news: '해적 성 — 차지하면 보물! 내 성 모두 +3', hint: '해적은 차례마다 늘어요 — 빨리!', spot: 'pirate', spotLabel: '해적 성', spotAt: 2,
    cs: [[0.5, 1.14, ME, 18, 'home'], [0.84, 0.97, NEU, 2, 'castle'], [0.16, 0.86, NEU, 7, 'pirate'], [0.5, 0.75, RED, 4, 'castle'], [0.16, 0.56, RED, 4, 'castle'], [0.84, 0.62, RED, 4, 'castle'], [0.52, 0.4, RED, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 3], [1, 5], [2, 3], [2, 4], [3, 6], [4, 6], [5, 6]],
    river: [[-0.1, 0.68], [0.25, 0.66], [0.5, 0.69], [0.75, 0.65], [1.1, 0.68]],
    limit: 15, ai: 2, stars: [ST('win', 0, '빨간 왕관 성 차지'), ST('take', 1, '해적 보물 얻기', 'pirate'), ST('noloss', 0, '내 성 안 뺏기기')],
  },
  {
    name: '적이 둘', foe: '빨강·보라 두 남작', news: '적이 둘 — 서로도 싸워요', hint: '둘이 싸울 때 빈 성을 노려요', spot: 'twofoes', spotLabel: '보라 남작', spotAt: 8,
    cs: [[0.5, 1.14, ME, 24, 'home'], [0.16, 0.97, NEU, 3, 'castle'], [0.84, 0.97, NEU, 3, 'castle'], [0.5, 0.8, NEU, 4, 'tower'], [0.17, 0.62, RED, 5, 'castle'], [0.83, 0.62, PUR, 5, 'castle'], [0.5, 0.52, NEU, 3, 'farm'], [0.22, 0.38, RED, 8, 'home'], [0.78, 0.38, PUR, 8, 'home']],
    es: [[0, 1], [0, 2], [0, 3], [1, 4], [2, 5], [3, 4], [3, 5], [4, 6], [5, 6], [4, 7], [5, 8], [6, 7], [6, 8]],
    river: [[-0.1, 0.72], [0.3, 0.75], [0.7, 0.7], [1.1, 0.74]],
    limit: 18, ai: 2, stars: [ST('win', 0, '왕관 성 둘 다 차지'), ST('noloss', 0, '내 성 안 뺏기기'), ST('turns', 14, '14번 안에 이기기')],
  },
];
export const STAGE_COUNT = STAGES.length;
const CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 300, HEART_PTS = 100, TAKE_PTS = 5;
const RESULT_OK = 170, RESULT_FAIL = 150, BANNER_T = 150, BRAWL = 26, TAIL = 16;

// ───────────────────────────── 지도 ─────────────────────────────
interface Edge { a: number; b: number; L: number; T: number; bridge: number; cx: number; cy: number }
interface MapRT {
  x: number[]; y: number[]; k: Kind[]; ed: Edge[]; adj: number[][]; home: number[]; river: [number, number][]; key: string; nc: number;
}
function buildMap(d: StageDef, mir: boolean, key: string): MapRT {
  const fx = (x: number) => (mir ? 1 - x : x);
  const x = d.cs.map((c) => fx(c[0])), y = d.cs.map((c) => c[1]), k = d.cs.map((c) => c[4]);
  const ed: Edge[] = d.es.map(([a, b, br = -1, bend]) => {
    const mx = (x[a] + x[b]) / 2, my = (y[a] + y[b]) / 2, dx = x[b] - x[a], dy = y[b] - y[a], len = Math.hypot(dx, dy);
    const bd = bend ?? (((a * 7 + b * 13) % 5) - 2) * 0.012;
    const cx = mx + (-dy / len) * bd * (mir ? -1 : 1), cy = my + (dx / len) * bd * (mir ? -1 : 1);
    const L = len * 1.01;
    return { a, b, L, T: Math.max(24, Math.round(L / SPEED)), bridge: br, cx, cy };
  });
  const adj = x.map(() => [] as number[]);
  ed.forEach((e, i) => (adj[e.a].push(i), adj[e.b].push(i)));
  const home = [-1, -1, -1, -1];
  d.cs.forEach((c, i) => c[4] === 'home' && (home[c[2]] = i));
  return { x, y, k, ed, adj, home, river: d.river.map(([rx, ry]) => [fx(rx), ry] as [number, number]), key, nc: x.length };
}
const other = (e: Edge, c: number) => (e.a === c ? e.b : e.a);
/** 도개교: (차례 + 때) % 4 < 2 이면 열림 */
const open = (e: Edge, turn: number) => e.bridge < 0 || (turn + e.bridge) % 4 < 2;
function edgeOf(m: MapRT, a: number, b: number): number {
  for (const i of m.adj[a]) if (other(m.ed[i], a) === b) return i;
  return -1;
}
/** 길 위 한 점 (u: 0 = a, 1 = b) */
function onEdge(e: Edge, m: MapRT, from: number, u: number): [number, number] {
  const v = from === e.a ? u : 1 - u, ax = m.x[e.a], ay = m.y[e.a], bx = m.x[e.b], by = m.y[e.b];
  const q = 1 - v;
  return [q * q * ax + 2 * q * v * e.cx + v * v * bx, q * q * ay + 2 * q * v * e.cy + v * v * by];
}

// ───────────────────────────── 한 차례 (결정적, 봇·미리 보기·실제가 같은 것) ─────────────────────────────
/** 한 편의 수: a = -1 이면 기다리기(그 편 성 모두 +1), a = -2 면 쉼(잠꾸러기) */
interface Move { f: number; a: number; b: number; e: number }
interface March { f: number; a: number; b: number; e: number; c0: number; c1: number; T: number; clashT: number; endT: number; dead: boolean }
/** 기록: k = 'go'(출발) 'clash'(길에서 맞붙음) 'take'(점령) 'hit'(성문에서 막음) 'join'(보탬) 'boom'(대포) 'gold'(보물) 'grow'(늘어남) */
interface TEv { t: number; k: string; c: number; f: number; o: number; n: number; v: number; m: number; m2: number; prev: number }
interface TurnOut { own: number[]; n: number[]; marches: March[]; log: TEv[]; T: number; lost: number; clash: number; took: Kind[]; caps: number; foeTook: number }

function simTurn(m: MapRT, own: number[], n: number[], turn: number, moves: Move[], sleep: boolean, wantLog: boolean): TurnOut {
  const o = own.slice(), c = n.slice(), log: TEv[] = [], ms: March[] = [], waits = new Set<number>();
  const L = (t: number, k: string, ci: number, f: number, v = 0, mi = -1, m2 = -1, prev = -1) => wantLog && log.push({ t, k, c: ci, f, o: ci >= 0 ? o[ci] : -1, n: ci >= 0 ? c[ci] : 0, v, m: mi, m2, prev });
  let lost = 0, clash = 0, caps = 0, foeTook = 0;
  const took: Kind[] = [];
  for (const mv of moves) {
    if (mv.a === -1) waits.add(mv.f);
    if (mv.a < 0) continue;
    const cnt = Math.ceil(c[mv.a] / 2);
    c[mv.a] -= cnt;
    const T = m.ed[mv.e].T;
    ms.push({ f: mv.f, a: mv.a, b: mv.b, e: mv.e, c0: cnt, c1: cnt, T, clashT: -1, endT: T, dead: false });
    L(0, 'go', mv.a, mv.f, cnt, ms.length - 1);
  }
  // 사건: 길에서 맞붙기(마주 오는 두 행렬, 가운데) · 도착
  const evs: [number, number, number, number][] = [];
  for (let i = 0; i < ms.length; i++)
    for (let j = i + 1; j < ms.length; j++) if (ms[i].e === ms[j].e && ms[i].a === ms[j].b) evs.push([Math.round(ms[i].T / 2), 0, i, j]);
  for (let i = 0; i < ms.length; i++) evs.push([ms[i].T, 1, i, -1]);
  evs.sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2]);
  let last = 0;
  for (const [t, ty, i, j] of evs) {
    const a = ms[i];
    if (ty === 0) {
      const b = ms[j];
      if (a.dead || b.dead) continue;
      const d = a.c1 - b.c1;
      a.clashT = b.clashT = t;
      if (d >= 0) (b.dead = true), (b.endT = t), (b.c1 = 0);
      if (d <= 0) (a.dead = true), (a.endT = t), (a.c1 = 0);
      if (d > 0) a.c1 = d;
      if (d < 0) b.c1 = -d;
      if ((a.f === ME && b.dead) || (b.f === ME && a.dead)) clash++;
      L(t, 'clash', -1, d > 0 ? a.f : d < 0 ? b.f : -1, Math.abs(d), i, j);
      last = Math.max(last, t);
      continue;
    }
    if (a.dead) continue;
    last = Math.max(last, t);
    const b = a.b, cnt = a.c1;
    if (o[b] === a.f) {
      c[b] = Math.min(CAP, c[b] + cnt);
      L(t, 'join', b, a.f, cnt, i);
      continue;
    }
    const mu = mult(m.k[b]), def = c[b] * mu;
    if (cnt > def) {
      const prev = o[b];
      o[b] = a.f;
      c[b] = cnt - def;
      if (prev === ME) lost++;
      if (a.f === ME) (took.push(m.k[b]), caps++);
      else foeTook++;
      L(t, 'take', b, a.f, cnt, i, -1, prev);
      // 왕관 성이 무너지면 그 편 성이 모두 항복 — 깃발이 차례로 휙휙
      if (m.k[b] === 'home' && isFoe(prev)) {
        let k = 0;
        for (let q = 0; q < m.nc; q++) if (o[q] === prev) (o[q] = a.f), L(t + 10 + 7 * k++, 'flip', q, a.f, 0, i, -1, prev);
        last = Math.max(last, t + 10 + 7 * k);
      }
      if (m.k[b] === 'pirate' && prev === NEU) {
        for (let q = 0; q < m.nc; q++) if (o[q] === a.f) (c[q] = Math.min(CAP, c[q] + TREASURE)), L(t + 6, 'gold', q, a.f, TREASURE);
      }
    } else {
      c[b] = Math.ceil((def - cnt) / mu);
      L(t, 'hit', b, a.f, cnt, i, -1, o[b]);
    }
  }
  // 차례 끝: 대포 → 늘어남
  const tg = Math.max(last + BRAWL, 22);
  for (let q = 0; q < m.nc; q++) {
    if (m.k[q] !== 'cannon' || o[q] === NEU || (sleep && o[q] !== ME)) continue;
    for (const ei of m.adj[q]) {
      const r = other(m.ed[ei], q);
      if (o[r] !== o[q] && o[r] !== NEU && c[r] > 0) (c[r] = Math.max(0, c[r] - CANNON)), L(tg, 'boom', r, o[q], CANNON, q);
    }
  }
  for (let q = 0; q < m.nc; q++) {
    let g = 0;
    if (o[q] === NEU) g = m.k[q] === 'pirate' ? 1 : 0;
    else if (!(sleep && o[q] !== ME)) g = grow(m.k[q]) + (waits.has(o[q]) ? 1 : 0);
    void turn;
    if (g) (c[q] = Math.min(CAP, c[q] + g)), L(tg + 8, 'grow', q, o[q], g);
  }
  return { own: o, n: c, marches: ms, log, T: tg + 8 + TAIL, lost, clash, took, caps, foeTook };
}

// ───────────────────────────── 적 (규칙대로, 늘 미리 보인다) ─────────────────────────────
/** ai: 0 잠꾸러기 · 1 순한(내 본성은 안 침) · 2 보통 */
/** 남는 병사(n - s)로 성을 지킬 수 있나: 이웃 남의 성 어느 것도 절반으로 못 차지해야 */
function safeAfter(m: MapRT, own: number[], n: number[], a: number, s: number) {
  const left = (n[a] - s) * mult(m.k[a]);
  for (const ei of m.adj[a]) {
    const q = other(m.ed[ei], a);
    if (own[q] !== own[a] && own[q] !== NEU && Math.ceil(n[q] / 2) > left) return false;
  }
  return true;
}
function aiMove(m: MapRT, own: number[], n: number[], turn: number, f: number, ai: number): Move {
  if (ai === 0) return { f, a: -2, b: -1, e: -1 };
  let best: Move | null = null, bv = -1e9;
  // 1) 차지할 수 있으면 가장 값진 곳
  for (let a = 0; a < m.nc; a++) {
    if (own[a] !== f || n[a] < 2) continue;
    const s = Math.ceil(n[a] / 2);
    for (const ei of m.adj[a]) {
      const e = m.ed[ei], b = other(e, a);
      if (own[b] === f || !open(e, turn)) continue;
      if (ai === 1 && b === m.home[ME]) continue;
      const def = n[b] * mult(m.k[b]);
      if (s <= def || (b !== m.home[ME] && !safeAfter(m, own, n, a, s))) continue;
      const v = 100 - def * 2 + (own[b] === ME ? 30 : own[b] === NEU ? 0 : 15) + (b === m.home[ME] ? 50 : 0) + (m.k[b] === 'farm' || m.k[b] === 'cannon' ? 15 : 0) + (m.k[b] === 'pirate' ? 25 : 0) - a * 0.01 - b * 0.001;
      if (v > bv) (bv = v), (best = { f, a, b, e: ei });
    }
  }
  if (best) return best;
  // 2) 병사가 많으면 이웃 적(나·다른 남작) 중 가장 무서운(병사 많은) 성을 깎으러 돌격
  for (let a = 0; a < m.nc; a++) {
    if (own[a] !== f || n[a] < 6) continue;
    for (const ei of m.adj[a]) {
      const e = m.ed[ei], b = other(e, a);
      if (own[b] === f || own[b] === NEU || !open(e, turn)) continue;
      if (ai === 1 && b === m.home[ME]) continue;
      const v = n[b] * 2 + n[a] - a * 0.01 - b * 0.001;
      if (v > bv) (bv = v), (best = { f, a, b, e: ei });
    }
  }
  if (best) return best;
  // 3) 뒤쪽 성의 병사를 앞쪽 성으로
  for (let a = 0; a < m.nc; a++) {
    if (own[a] !== f || n[a] < 4) continue;
    if (m.adj[a].some((ei) => own[other(m.ed[ei], a)] !== f) || !safeAfter(m, own, n, a, Math.ceil(n[a] / 2))) continue;
    for (const ei of m.adj[a]) {
      const e = m.ed[ei], b = other(e, a);
      if (!open(e, turn)) continue;
      const front = m.adj[b].some((q) => own[other(m.ed[q], b)] !== f);
      if (!front) continue;
      const v = n[a] - n[b] - a * 0.01 - b * 0.001;
      if (v > bv) (bv = v), (best = { f, a, b, e: ei });
    }
  }
  return best ?? { f, a: -2, b: -1, e: -1 };
}
function foesOf(s: { own: number[] }) {
  const f: number[] = [];
  for (const o of [RED, PUR]) if (s.own.includes(o)) f.push(o);
  return f;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; c?: number; f?: number }
export interface FlagState {
  rng: Rng; seed: number; t: number; stage: number; mir: boolean[]; jit: number[][];
  map: MapRT; own: number[]; n: number[]; turn: number;
  phase: 'pick' | 'march' | 'result'; pt: number; ok: boolean; why: string;
  sel: number; plans: Move[]; cur: TurnOut | null; applied: number; my: Move | null;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  lost: number; clash: number; took: Kind[]; waits: number; sends: number; caps: number;
  down: boolean; firstTap: number; firstBig: number; wowN: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; rx: number; ry: number } | null;
  events: Ev[]; flipT: number[]; prevOwn: number[]; bigText: string; bigT: number; bigX: number; bigY: number;
}

const ev = (s: FlagState, kind: string, x: number, y: number, extra: Partial<Ev> = {}) => s.events.push({ t: s.t, kind, x, y, ...extra });
function see(s: FlagState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: FlagState, text: string, x: number, y: number) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
  s.bigX = x;
  s.bigY = y;
  ev(s, 'big', x, y, { text });
}
const sleepy = (s: FlagState) => STAGES[s.stage].ai === 0;

// ───────────────────────────── 판 흐름 ─────────────────────────────
function newStage(s: FlagState) {
  const d = STAGES[s.stage];
  s.map = buildMap(d, s.mir[s.stage], `${s.stage}${s.mir[s.stage] ? 'm' : ''}`);
  s.own = d.cs.map((c) => c[2]);
  s.n = d.cs.map((c, i) => Math.max(0, c[3] + (c[2] === ME || c[3] === 0 ? 0 : s.jit[s.stage][i])));
  s.turn = 0;
  s.phase = 'pick';
  s.pt = 0;
  s.sel = -1;
  s.cur = null;
  s.my = null;
  s.lost = 0;
  s.clash = 0;
  s.took = [];
  s.caps = 0;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.flipT = s.own.map(() => -999);
  s.prevOwn = s.own.slice();
  s.plans = foesOf(s).map((f) => aiMove(s.map, s.own, s.n, s.turn, f, d.ai));
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    if (s.stage > 0) see(s, d.spot);
    if (d.spotAt >= 0) s.spot = { x: s.map.x[d.spotAt], y: s.map.y[d.spotAt] - 0.1, t: s.t, label: d.spotLabel, rx: 0.14, ry: 0.145 };
    else if (d.spotAt === -1) {
      const p = s.plans.find((q) => q.a >= 0);
      s.spot = p ? { ...mid(s.map, p), t: s.t, label: d.spotLabel, rx: 0.12, ry: 0.08 } : null;
    } else {
      const ei = s.map.ed.findIndex((e) => e.bridge >= 0);
      const e = s.map.ed[ei];
      s.spot = { x: e.cx, y: e.cy, t: s.t, label: d.spotLabel, rx: 0.1, ry: 0.07 };
    }
    if (s.stage === 0) s.spot = null;
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
}
function mid(m: MapRT, p: Move) {
  const [x, y] = onEdge(m.ed[p.e], m, p.a, 0.5);
  return { x, y };
}
function starMet(s: FlagState, q: StarDef) {
  switch (q.k) {
    case 'win': return true;
    case 'turns': return s.turn <= q.n;
    case 'noloss': return s.lost === 0;
    case 'clash': return s.clash >= q.n;
    case 'take': return s.took.filter((k) => k === q.kind).length >= q.n;
  }
}
/** 별 칸 옆 진행 (진행 중일 때) */
function starNow(s: FlagState, q: StarDef): { txt: string; ok: boolean | null } {
  switch (q.k) {
    case 'win': return { txt: '', ok: null };
    case 'turns': return { txt: '', ok: s.turn < q.n ? null : false };
    case 'noloss': return { txt: '', ok: s.lost ? false : null };
    case 'clash': return { txt: `${Math.min(s.clash, q.n)}/${q.n}`, ok: s.clash >= q.n ? true : null };
    case 'take': { const k = s.took.filter((x) => x === q.kind).length; return { txt: q.n > 1 ? `${Math.min(k, q.n)}/${q.n}` : '', ok: k >= q.n ? true : null }; }
  }
}
function startTurn(s: FlagState, my: Move) {
  const d = STAGES[s.stage];
  s.my = my;
  s.cur = simTurn(s.map, s.own, s.n, s.turn, [my, ...s.plans], d.ai === 0, true);
  s.phase = 'march';
  s.pt = 0;
  s.applied = 0;
  s.sel = -1;
  s.banner = null;
  s.spot = null;
  if (my.a === -1) {
    s.waits++;
    see(s, 'wait');
    ev(s, 'wait', WAIT_BTN[0], WAIT_BTN[1]);
  } else {
    s.sends++;
    see(s, 'march');
    ev(s, 'send', s.map.x[my.a], s.map.y[my.a], { c: my.a, n: s.cur.marches[0]?.c0 });
  }
}
function applyEv(s: FlagState, e: TEv) {
  const m = s.map;
  if (e.c >= 0 && e.k !== 'go') {
    if (s.own[e.c] !== e.o) (s.prevOwn[e.c] = s.own[e.c]), (s.flipT[e.c] = s.t);
    s.own[e.c] = e.o;
    s.n[e.c] = e.n;
  } else if (e.k === 'go') s.n[e.c] = e.n;
  const x = e.c >= 0 ? m.x[e.c] : 0.5, y = e.c >= 0 ? m.y[e.c] : 0.5;
  switch (e.k) {
    case 'take': {
      ev(s, 'take', x, y, { c: e.c, f: e.f, n: e.v });
      if (e.f === ME) {
        see(s, 'capture');
        s.pts += TAKE_PTS;
        const name = m.k[e.c] === 'home' ? '본성 함락!' : m.k[e.c] === 'pirate' ? '해적 성 점령!' : m.k[e.c] === 'castle' ? '점령!' : `${KIND_NAME[m.k[e.c]]} 점령!`;
        wow(s, name, x, y - 0.12);
      } else if (e.prev === ME) ev(s, 'ouch', x, y, { c: e.c, f: e.f });
      break;
    }
    case 'hit': ev(s, 'hit', x, y, { c: e.c, f: e.f, n: e.v }); if (e.prev === ME) ev(s, 'held', x, y, { c: e.c }); break;
    case 'join': ev(s, 'join', x, y, { c: e.c, f: e.f, n: e.v }); break;
    case 'clash': {
      const a = s.cur!.marches[e.m], [cx, cy] = onEdge(m.ed[a.e], m, a.a, 0.5);
      ev(s, 'clash', cx, cy, { f: e.f, n: e.v });
      const mine = a.f === ME || s.cur!.marches[e.m2].f === ME;
      if (mine) {
        see(s, 'clash');
        const foeDied = (a.f !== ME && a.dead) || (s.cur!.marches[e.m2].f !== ME && s.cur!.marches[e.m2].dead);
        if (foeDied) wow(s, e.f === ME ? '길에서 깨부쉈다!' : '길에서 막았다!', cx, cy - 0.12);
        else ev(s, 'clashLost', cx, cy);
      }
      break;
    }
    case 'boom': see(s, 'cannonfire'); ev(s, 'boom', x, y, { c: e.c, f: e.f, n: e.v, text: String(e.m) }); break;
    case 'gold': ev(s, 'gold', x, y, { c: e.c, f: e.f, n: e.v }); if (e.f === ME && e.c === s.cur!.log.find((q) => q.k === 'gold' && q.f === ME)?.c) wow(s, '해적 보물! 모두 +3', 0.5, 0.55); break;
    case 'grow': ev(s, 'grow', x, y, { c: e.c, f: e.f, n: e.v }); break;
    case 'flip': ev(s, 'flip', x, y, { c: e.c, f: e.f }); if (e.f === ME) s.pts += TAKE_PTS; break;
  }
}
function endTurn(s: FlagState) {
  const cur = s.cur!, d = STAGES[s.stage];
  s.own = cur.own.slice();
  s.n = cur.n.slice();
  s.turn++;
  s.lost += cur.lost;
  s.clash += cur.clash;
  s.took.push(...cur.took);
  s.caps += cur.caps;
  s.cur = null;
  const foes = foesOf(s).length;
  if (!foes) return finish(s, true, '');
  if (s.own[s.map.home[ME]] !== ME) return finish(s, false, '본성을 빼앗겼어요');
  if (s.turn >= d.limit) return finish(s, false, '차례가 다 됐어요');
  s.phase = 'pick';
  s.pt = 0;
  s.plans = foesOf(s).map((f) => aiMove(s.map, s.own, s.n, s.turn, f, d.ai));
  if (s.stage === 1 && s.plans.some((p) => p.a >= 0)) see(s, 'arrow');
  if (s.map.ed.some((e) => e.bridge >= 0)) see(s, 'bridge');
}
function finish(s: FlagState, ok: boolean, why: string) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.sel = -1;
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (1 + s.stage * 0.5);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', 0.5, 0.5);
    wow(s, s.won ? '모든 땅 차지!' : '모두 차지!', 0.5, 0.42);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', s.map.x[s.map.home[ME]], s.map.y[s.map.home[ME]]);
  }
}

// ───────────────────────────── 톡 ─────────────────────────────
type Hit = { t: 'castle'; i: number } | { t: 'wait' } | null;
const inBox = (x: number, y: number, b: [number, number, number, number]) => Math.abs(x - b[0]) <= b[2] / 2 && Math.abs(y - b[1]) <= b[3] / 2;
/** 성을 누를 곳: 성 몸통 가운데 (바닥보다 조금 위) */
const hitY = (m: MapRT, i: number) => m.y[i] - 0.065;
function hitTest(s: FlagState, x: number, y: number): Hit {
  if (inBox(x, y, WAIT_BTN)) return { t: 'wait' };
  if (y > MAP_BOT) return null;
  let bi = -1, bd = HIT_R;
  for (let i = 0; i < s.map.nc; i++) {
    const d = Math.hypot(x - s.map.x[i], (y - hitY(s.map, i)) * 1.1);
    if (d < bd) (bd = d), (bi = i);
  }
  return bi >= 0 ? { t: 'castle', i: bi } : null;
}
function tap(s: FlagState, h: Hit) {
  if (!h) return;
  const m = s.map;
  if (h.t === 'wait') return startTurn(s, { f: ME, a: -1, b: -1, e: -1 });
  const i = h.i;
  if (s.sel < 0 || (s.own[i] === ME && s.sel !== i && edgeOf(m, s.sel, i) < 0)) {
    if (s.own[i] !== ME) {
      // 지름길: 아무것도 안 고르고 남의 성을 톡 → 붙어 있는 내 성 중 가장 센 성에서 출발
      let a = -1, ae = -1;
      for (const ei of m.adj[i]) {
        const q = other(m.ed[ei], i);
        if (s.own[q] === ME && s.n[q] >= 2 && open(m.ed[ei], s.turn) && (a < 0 || s.n[q] > s.n[a])) (a = q), (ae = ei);
      }
      if (a >= 0) return startTurn(s, { f: ME, a, b: i, e: ae });
      return void ev(s, 'nope', m.x[i], m.y[i], { c: i, text: '내 성 옆의 성만 갈 수 있어요' });
    }
    if (s.n[i] < 2) return void ev(s, 'nope', m.x[i], m.y[i], { c: i, text: '병사가 모자라요' });
    s.sel = i;
    ev(s, 'pick', m.x[i], m.y[i], { c: i });
    return;
  }
  if (s.sel === i) {
    s.sel = -1;
    ev(s, 'unpick', m.x[i], m.y[i], { c: i });
    return;
  }
  const ei = edgeOf(m, s.sel, i);
  if (ei < 0) return void ev(s, 'nope', m.x[i], m.y[i], { c: i, text: '길이 없어요' });
  if (!open(m.ed[ei], s.turn)) return void ev(s, 'nope', m.x[i], m.y[i], { c: i, text: '다리가 닫혔어요' });
  startTurn(s, { f: ME, a: s.sel, b: i, e: ei });
}

// ───────────────────────────── 게임 ─────────────────────────────
const game: GameDef<FlagState> & { wows(s: FlagState): number } = {
  id: 'flagcastle',
  name: '🏰 깃발 성 땅따먹기',
  genes: ['conquest', 'turnbased'],
  twist: '적의 다음 수가 빨간 화살표로 미리 보이고 내 행렬과 적 행렬이 함께 출발한다 — 같은 길로 맞받아 보내면 길 한가운데서 와르르 맞붙고, 이긴 쪽은 절반이 빠져나간 적 성까지 그대로 쳐들어간다',
  rules: [
    '내 성을 톡, 이웃 성을 톡 — 병사 절반이 행진해 성문에서 병사 수끼리 빼기, 남으면 깃발이 내 색!',
    '빨간 화살표가 적의 다음 수 — 같이 출발해서, 같은 길로 마주 오면 길 한가운데서 맞붙어요.',
    "차례마다 깃발 성 +1('기다리기'는 내 성 +1 더). 적 왕관 성을 차지하면 승리, 내 왕관 성을 빼앗기면 하트 -1.",
  ],
  controls: 'touch',
  hint: '내 성 톡 → 이웃 성 톡 · 기다리기 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 가득한 낮 들판 지도 위 장난감 성들 — 3/4 시점 언덕·강·숲·나무다리, 깃발마다 큰 병사 숫자, 줄지어 행진하는 꼬마 병사',
    mood: '연둣빛 들판에 강이 반짝이고 둥근 숲과 언덕 사이로 흙길이 이어진다. 파란 깃발 성에서 꼬마 병사들이 나팔 소리에 맞춰 줄지어 행진하고, 빨간 남작의 행렬과 길 한가운데서 마주치면 먼지구름 속에서 와르르 맞붙는다. 성문을 넘으면 깃발이 휙 파랗게 뒤집히고 병사들이 만세를 부른다.',
    palette: { bg: '#a6dd72', ink: '#3a2a14', muted: '#7a6a4a', accent: '#3d8cf0', hot: '#e8443a', soft: '#fff6dc' },
  },
  guard: (s) => s.own.filter((o) => o === ME).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, mir: STAGES.map(() => rng() < 0.5), jit: STAGES.map((d) => d.cs.map(() => Math.floor(rng() * 3) - 1)),
      map: null as unknown as MapRT, own: [], n: [], turn: 0,
      phase: 'pick', pt: 0, ok: false, why: '', sel: -1, plans: [], cur: null, applied: 0, my: null,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      lost: 0, clash: 0, took: [], waits: 0, sends: 0, caps: 0,
      down: false, firstTap: -1, firstBig: -1, wowN: 0,
      seen: new Set<string>(), banner: null, spot: null, events: [], flipT: [], prevOwn: [], bigText: '', bigT: -999, bigX: 0.5, bigY: 0.5,
    } as unknown as FlagState;
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'pick') {
      s.pt++;
      if (fresh) {
        if (s.firstTap < 0) s.firstTap = s.t;
        tap(s, hitTest(s, p!.x, p!.y * A));
      }
    } else if (s.phase === 'march') {
      s.pt++;
      const log = s.cur!.log;
      while (s.applied < log.length && log[s.applied].t <= s.pt) applyEv(s, log[s.applied++]);
      if (s.pt >= s.cur!.T) endTurn(s);
    } else {
      s.pt++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot && s.t - s.spot.t > 220) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const flagcastle = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapCastle = (s: FlagState, i: number) => at(s.map.x[i], hitY(s.map, i));
const tapWait = () => at(WAIT_BTN[0], WAIT_BTN[1]);

/** 내 수 목록: 기다리기 + 보낼 수 있는 모든 길 */
function myMoves(m: MapRT, own: number[], n: number[], turn: number): Move[] {
  const r: Move[] = [{ f: ME, a: -1, b: -1, e: -1 }];
  for (let a = 0; a < m.nc; a++) {
    if (own[a] !== ME || n[a] < 2) continue;
    for (const ei of m.adj[a]) if (open(m.ed[ei], turn)) r.push({ f: ME, a, b: other(m.ed[ei], a), e: ei });
  }
  return r;
}
interface Acc { lost: number; clash: number; took: Kind[] }
/** 판 평가: 병사·성 수 + 별 진행 */
function value(m: MapRT, d: StageDef, own: number[], n: number[], turn: number, acc: Acc): number {
  if (own[m.home[ME]] !== ME) return -1e6;
  let foes = 0;
  for (const o of own) if (isFoe(o)) foes++;
  let v = 0;
  for (const q of d.stars) {
    if (q.k === 'noloss') v -= acc.lost ? 160 : 0;
    if (q.k === 'clash') v += Math.min(acc.clash, q.n) * 160;
    if (q.k === 'take') v += Math.min(acc.took.filter((k) => k === q.kind).length, q.n) * 120;
    if (q.k === 'turns' && foes === 0 && turn <= q.n) v += 200;
  }
  if (!foes) return 1e5 + v - turn * 50;
  for (let i = 0; i < m.nc; i++) {
    const k = m.k[i], o = own[i];
    const worth = 9 + (k === 'farm' ? 10 : 0) + (k === 'cannon' ? 6 : 0) + (k === 'tower' ? 3 : 0) + (k === 'home' ? 4 : 0);
    if (o === ME) v += n[i] * 0.8 + worth * 1.4;
    else if (isFoe(o)) v -= n[i] * mult(k) * 1.1 + worth * 1.4 + 4;
    else v -= n[i] * mult(k) * 0.3 + (k === 'pirate' ? 6 : 0);
  }
  // 적 왕관 성 쪽으로 다가간 병사 · 왕관 성을 칠 수 있는 성
  for (const fh of [m.home[RED], m.home[PUR]]) {
    if (fh < 0 || !isFoe(own[fh])) continue;
    const dist = hopsTo(m, fh);
    const def = n[fh] * mult(m.k[fh]);
    for (let i = 0; i < m.nc; i++) {
      if (own[i] !== ME) continue;
      v += (n[i] * 0.6) / (1 + dist[i]);
      if (dist[i] === 1 && Math.ceil(n[i] / 2) > def) v += 25;
    }
  }
  // 별 목표 성(탑·농장·대포·해적) 쪽으로 다가간 병사
  for (const q of d.stars) {
    if (q.k !== 'take' || acc.took.filter((k) => k === q.kind).length >= q.n) continue;
    for (let j = 0; j < m.nc; j++) {
      if (m.k[j] !== q.kind || own[j] === ME) continue;
      const dist = hopsTo(m, j), def = n[j] * mult(m.k[j]);
      for (let i = 0; i < m.nc; i++) {
        if (own[i] !== ME) continue;
        v += (n[i] * 0.5) / (1 + dist[i]);
        if (dist[i] === 1 && Math.ceil(n[i] / 2) > def) v += 30;
      }
    }
  }
  // 위협: 적이 이웃에서 차지할 수 있는 내 성
  for (let i = 0; i < m.nc; i++) {
    if (own[i] !== ME) continue;
    for (const ei of m.adj[i]) {
      const j = other(m.ed[ei], i);
      if (isFoe(own[j]) && Math.ceil(n[j] / 2) > n[i] * mult(m.k[i])) v -= i === m.home[ME] ? 400 : 6 + n[i] * 0.3;
    }
  }
  return v - turn * 6;
}
const HOPS = new WeakMap<MapRT, Map<number, number[]>>();
/** 길 수로 잰 거리 (도개교 무시) */
function hopsTo(m: MapRT, to: number): number[] {
  let mm = HOPS.get(m);
  if (!mm) HOPS.set(m, (mm = new Map()));
  const hit = mm.get(to);
  if (hit) return hit;
  const d = m.x.map(() => 99);
  d[to] = 0;
  const q = [to];
  while (q.length) {
    const c = q.shift()!;
    for (const ei of m.adj[c]) {
      const o = other(m.ed[ei], c);
      if (d[o] > d[c] + 1) (d[o] = d[c] + 1), q.push(o);
    }
  }
  mm.set(to, d);
  return d;
}
interface Plan { mv: Move; v: number }
const planMem = new WeakMap<object, { key: string; plan: Plan }>();
function bestMove(s: FlagState, depth = 2): Plan {
  const key = `${s.stage}|${s.turn}|${s.own.join('')}|${s.n.join(',')}`;
  const mem = planMem.get(s);
  if (mem && mem.key === key) return mem.plan;
  const d = STAGES[s.stage], m = s.map, sleep = d.ai === 0;
  const acc0: Acc = { lost: s.lost, clash: s.clash, took: s.took };
  let best: Plan = { mv: { f: ME, a: -1, b: -1, e: -1 }, v: -1e9 };
  for (const mv of myMoves(m, s.own, s.n, s.turn)) {
    const r = simTurn(m, s.own, s.n, s.turn, [mv, ...s.plans], sleep, false);
    const acc1: Acc = { lost: acc0.lost + r.lost, clash: acc0.clash + r.clash, took: [...acc0.took, ...r.took] };
    let v = value(m, d, r.own, r.n, s.turn + 1, acc1);
    const done = v <= -1e6 || v >= 5e4 || s.turn + 1 >= d.limit;
    if (!done && depth > 1) {
      const plans = foesOf({ own: r.own }).map((f) => aiMove(m, r.own, r.n, s.turn + 1, f, d.ai));
      let b2 = -1e9;
      for (const m2 of myMoves(m, r.own, r.n, s.turn + 1)) {
        const r2 = simTurn(m, r.own, r.n, s.turn + 1, [m2, ...plans], sleep, false);
        const acc2: Acc = { lost: acc1.lost + r2.lost, clash: acc1.clash + r2.clash, took: [...acc1.took, ...r2.took] };
        b2 = Math.max(b2, value(m, d, r2.own, r2.n, s.turn + 2, acc2));
      }
      v = b2 * 0.85 + v * 0.15;
    }
    if (v > best.v) best = { mv, v };
  }
  planMem.set(s, { key, plan: best });
  return best;
}
const tapMem = new WeakMap<object, number>();
function botTap(s: FlagState, f: () => Input): Input {
  if (s.phase === 'result') {
    if (s.down || s.pt < 52) return NO;
    return at(0.5, 0.6);
  }
  if (s.phase !== 'pick' || s.down) return NO;
  const last = tapMem.get(s) ?? -99;
  if (s.t - last < 4) return NO;
  tapMem.set(s, s.t);
  return f();
}
function playMove(s: FlagState, mv: Move): Input {
  if (mv.a < 0) return tapWait();
  if (s.sel !== mv.a) return tapCastle(s, mv.a);
  return tapCastle(s, mv.b);
}
/** 잘하는 봇: 내 수 × 적 예고 × (적 응수 → 내 다음 수)까지 시뮬레이션 */
export const flagcastleSmart: Bot<FlagState> = {
  name: '두 수 앞까지 싸워 보고 두기',
  act(s) {
    return botTap(s, () => playMove(s, bestMove(s).mv));
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const flagcastleRandom: Bot<FlagState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let mm = dumbMem.get(s);
    if (!mm) dumbMem.set(s, (mm = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= mm.next) {
      mm.down = !mm.down;
      if (mm.down) {
        mm.next = s.t + 3 + Math.floor(rng() * 6);
        mm.x = 0.03 + rng() * 0.94;
        mm.y = 0.1 + rng() * 0.88;
      } else mm.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return mm.down ? { tap: false, dir: 0, pointer: { x: mm.x, y: mm.y } } : NO;
  },
};

/** 버릇 봇 1: 늘 가장 약한 이웃 성을, 붙어 있는 내 성 중 가장 센 성에서 친다 (적 예고는 안 본다) */
export const flagcastleHabit: Bot<FlagState> = {
  name: '늘 가장 약한 이웃 치기',
  act(s) {
    return botTap(s, () => {
      const m = s.map;
      let best: Move | null = null, bd = 1e9, bn = -1;
      for (let a = 0; a < m.nc; a++) {
        if (s.own[a] !== ME || s.n[a] < 2) continue;
        for (const ei of m.adj[a]) {
          const b = other(m.ed[ei], a);
          if (s.own[b] === ME || !open(m.ed[ei], s.turn)) continue;
          const def = s.n[b] * mult(m.k[b]);
          if (def < bd || (def === bd && s.n[a] > bn)) (bd = def), (bn = s.n[a]), (best = { f: ME, a, b, e: ei });
        }
      }
      return playMove(s, best ?? { f: ME, a: -1, b: -1, e: -1 });
    });
  },
};
/** 버릇 봇 2: 늘 가장 센 내 성에서 적 본성 쪽으로 (가장 짧은 길의 다음 성) */
export const flagcastleHabit2: Bot<FlagState> = {
  name: '늘 가장 센 성으로 적 본성 치기',
  act(s) {
    return botTap(s, () => {
      const m = s.map;
      let target = m.home[RED] >= 0 && isFoe(s.own[m.home[RED]]) ? m.home[RED] : m.home[PUR] >= 0 && isFoe(s.own[m.home[PUR]]) ? m.home[PUR] : s.own.findIndex(isFoe);
      if (target < 0) target = 0;
      // 적 본성까지 거리 (열린 길)
      const dist = m.x.map(() => 1e9);
      dist[target] = 0;
      const q = [target];
      while (q.length) {
        const c = q.shift()!;
        for (const ei of m.adj[c]) {
          if (!open(m.ed[ei], s.turn)) continue;
          const o = other(m.ed[ei], c);
          if (dist[o] > dist[c] + 1) (dist[o] = dist[c] + 1), q.push(o);
        }
      }
      let a = -1;
      for (let i = 0; i < m.nc; i++) if (s.own[i] === ME && s.n[i] >= 2 && dist[i] < 1e9 && (a < 0 || s.n[i] > s.n[a])) a = i;
      if (a < 0) return tapWait();
      let b = -1, be = -1;
      for (const ei of m.adj[a]) {
        if (!open(m.ed[ei], s.turn)) continue;
        const o = other(m.ed[ei], a);
        if (dist[o] < dist[a] && (b < 0 || dist[o] < dist[b])) (b = o), (be = ei);
      }
      return playMove(s, b < 0 ? { f: ME, a: -1, b: -1, e: -1 } : { f: ME, a, b, e: be });
    });
  },
};

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: FlagState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, ...st: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
    else ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.9, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
const OUT = '#4a2a12';
/** 편 색: 지붕 · 어두운 · 밝은 · 깃발 */
const COL = [
  { main: '#3a8cf2', dark: '#1d58b4', light: '#a6d2ff', flag: '#2a7ef0', ink: '#ffffff' },
  { main: '#ea4636', dark: '#a3261c', light: '#ffab9c', flag: '#e2372b', ink: '#ffffff' },
  { main: '#cdb994', dark: '#8c7a58', light: '#f1e6cc', flag: '#fbf3df', ink: '#6a5434' },
  { main: '#9c5ad6', dark: '#62309c', light: '#d8b6f6', flag: '#8f48d0', ink: '#ffffff' },
];
const STONE = ['#f3ead8', '#dccdb0', '#b9a682'];

// ── 배경 (판·크기별로 한 번) ──
const BG = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
/** 강: 점들을 부드럽게 이은 선을 촘촘히 */
const RIVER = new WeakMap<MapRT, [number, number][]>();
function riverPts(m: MapRT): [number, number][] {
  const hit = RIVER.get(m);
  if (hit) return hit;
  const p = m.river, out: [number, number][] = [];
  for (let i = 0; i < p.length - 1; i++) {
    const p0 = p[Math.max(0, i - 1)], p1 = p[i], p2 = p[i + 1], p3 = p[Math.min(p.length - 1, i + 2)];
    for (let k = 0; k < 12; k++) {
      const u = k / 12, u2 = u * u, u3 = u2 * u;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(p[p.length - 1]);
  RIVER.set(m, out);
  return out;
}
const RIVER_W = 0.075;
function distPoly(pts: [number, number][], x: number, y: number) {
  let d = 1e9;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1;
    const u = clamp(((x - ax) * dx + (y - ay) * dy) / l, 0, 1);
    d = Math.min(d, Math.hypot(x - ax - dx * u, y - ay - dy * u));
  }
  return d;
}
/** 길이 강을 건너는 구간 [u0, u1] (없으면 null) */
const CROSS = new WeakMap<MapRT, ([number, number] | null)[]>();
function crossings(m: MapRT) {
  const hit = CROSS.get(m);
  if (hit) return hit;
  const rp = riverPts(m);
  const out = m.ed.map((e) => {
    let u0 = -1, u1 = -1;
    for (let k = 0; k <= 60; k++) {
      const u = k / 60, [x, y] = onEdge(e, m, e.a, u);
      if (distPoly(rp, x, y) < RIVER_W * 0.62) {
        if (u0 < 0) u0 = u;
        u1 = u;
      }
    }
    return u0 < 0 ? null : ([Math.max(0.02, u0 - 0.03), Math.min(0.98, u1 + 0.03)] as [number, number]);
  });
  CROSS.set(m, out);
  return out;
}
function roadPath(ctx: C2, m: MapRT, e: Edge, w: number, u0 = 0, u1 = 1) {
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const u = u0 + ((u1 - u0) * k) / 24, [x, y] = onEdge(e, m, e.a, u);
    if (k) ctx.lineTo(x * w, y * w);
    else ctx.moveTo(x * w, y * w);
  }
}
function drawTree(g: C2, x: number, y: number, r: number, k: number) {
  g.fillStyle = 'rgba(40,80,20,.25)';
  ell(g, x + r * 0.35, y + r * 0.15, r * 1.05, r * 0.38);
  g.fill();
  g.fillStyle = '#8a5a2a';
  rr(g, x - r * 0.14, y - r * 0.7, r * 0.28, r * 0.8, r * 0.1);
  g.fill();
  const dark = k % 3 === 0 ? '#3f9a3a' : '#48a640', mid = k % 3 === 0 ? '#5cbd45' : '#68c84c', lite = k % 3 === 0 ? '#9ade6a' : '#a6e676';
  for (const [dx, dy, q, c] of [[-0.42, -0.9, 0.62, dark], [0.42, -0.95, 0.6, dark], [0, -1.3, 0.72, mid], [-0.25, -0.95, 0.55, mid], [0.25, -1.05, 0.5, mid]] as [number, number, number, string][]) {
    g.fillStyle = c;
    ell(g, x + dx * r, y + dy * r, q * r, q * r * 0.92);
    g.fill();
  }
  g.fillStyle = lite;
  ell(g, x - r * 0.18, y - r * 1.55, r * 0.28, r * 0.2, -0.4);
  g.fill();
  g.strokeStyle = 'rgba(30,80,30,.35)';
  g.lineWidth = Math.max(1, r * 0.06);
  ell(g, x, y - r * 1.3, r * 0.72, r * 0.66);
  g.stroke();
}
/** 양이 풀을 뜯을 빈 풀밭 (성·길·강에서 먼 곳) */
const SPOTS = new WeakMap<MapRT, [number, number][]>();
function freeSpots(m: MapRT): [number, number][] {
  const hit = SPOTS.get(m);
  if (hit) return hit;
  const rp = riverPts(m), out: [number, number][] = [];
  for (let i = 0; i < 400 && out.length < 4; i++) {
    const x = 0.08 + hsh(i * 5.31 + 1) * 0.84, y = 0.2 + hsh(i * 8.17 + 2) * 0.95;
    if (y > MAP_BOT - 0.04) continue;
    let ok = distPoly(rp, x, y) > RIVER_W * 0.5 + 0.05;
    for (let q = 0; ok && q < m.nc; q++) if (Math.abs(x - m.x[q]) < 0.2 && y > m.y[q] - 0.3 && y < m.y[q] + 0.08) ok = false;
    for (const e of m.ed) {
      if (!ok) break;
      for (let k = 0; k <= 16 && ok; k++) {
        const [px, py] = onEdge(e, m, e.a, k / 16);
        if (Math.hypot(px - x, py - y) < 0.07) ok = false;
      }
    }
    for (const o of out) if (ok && Math.hypot(o[0] - x, o[1] - y) < 0.2) ok = false;
    if (ok) out.push([x, y]);
  }
  SPOTS.set(m, out);
  return out;
}
function drawSheep(ctx: C2, x: number, y: number, r: number, t: number, k: number, hop: number) {
  const munch = Math.sin(t * 0.07 + k * 2) > 0.3;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,80,20,.25)';
  ell(ctx, 0, 0, r * 1.1, r * 0.3);
  ctx.fill();
  ctx.translate(0, -hop);
  ctx.scale(k % 2 ? -1 : 1, 1);
  ctx.fillStyle = '#3a3030';
  for (const lx of [-0.5, -0.2, 0.25, 0.5]) ctx.fillRect(lx * r - r * 0.07, -r * 0.4, r * 0.14, r * 0.42);
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, q] of [[-0.45, -0.65, 0.42], [0, -0.8, 0.5], [0.42, -0.65, 0.42], [-0.2, -0.5, 0.42], [0.22, -0.5, 0.42]] as [number, number, number][]) {
    ell(ctx, dx * r, dy * r, q * r, q * r * 0.9);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,110,100,.45)';
  ctx.lineWidth = 1;
  ell(ctx, 0, -r * 0.65, r * 0.85, r * 0.5);
  ctx.stroke();
  const hx = r * 0.85, hy = munch && !hop ? -r * 0.3 : -r * 0.75;
  ctx.fillStyle = '#3a3030';
  ell(ctx, hx, hy, r * 0.28, r * 0.24);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, hx + r * 0.08, hy - r * 0.04, r * 0.06, r * 0.07);
  ctx.fill();
  ctx.restore();
}
function getBg(m: MapRT, w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${m.key}|${w}x${h}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    // 들판
    g.fillStyle = lin(g, 0, 0, 0, h, [0, '#c6ec8e'], [0.45, '#a9df70'], [1, '#8fd05e']);
    g.fillRect(0, 0, w, h);
    // 밝고 어두운 풀밭 얼룩
    for (let i = 0; i < 26; i++) {
      const x = R(hsh(i * 3.1) * 1.1 - 0.05), y = R(0.1 + hsh(i * 7.7) * 1.15), r = R(0.08 + hsh(i * 1.3) * 0.12);
      g.fillStyle = i % 2 ? 'rgba(255,255,200,.16)' : 'rgba(60,140,40,.12)';
      ell(g, x, y, r, r * 0.55);
      g.fill();
    }
    // 언덕 (위쪽 가장자리)
    for (const [hx, hy, hr] of [[0.08, 0.2, 0.2], [0.92, 0.18, 0.22], [0.5, 0.13, 0.16], [0.02, 0.62, 0.12], [0.98, 0.84, 0.12]] as [number, number, number][]) {
      g.fillStyle = 'rgba(50,110,30,.22)';
      ell(g, R(hx + 0.02), R(hy + 0.035), R(hr * 1.05), R(hr * 0.42));
      g.fill();
      g.fillStyle = lin(g, 0, R(hy - hr * 0.45), 0, R(hy + hr * 0.4), [0, '#c4ef8a'], [1, '#86c955']);
      ell(g, R(hx), R(hy), R(hr), R(hr * 0.45));
      g.fill();
      g.fillStyle = 'rgba(255,255,220,.35)';
      ell(g, R(hx - hr * 0.3), R(hy - hr * 0.2), R(hr * 0.4), R(hr * 0.12), -0.2);
      g.fill();
    }
    // 풀잎
    g.strokeStyle = 'rgba(60,130,40,.35)';
    g.lineWidth = 1;
    for (let i = 0; i < 220; i++) {
      const x = R(hsh(i * 2.3)), y = R(0.09 + hsh(i * 5.1) * 1.16);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x - 1.5, y - 4);
      g.moveTo(x + 2, y);
      g.lineTo(x + 3, y - 3.5);
      g.stroke();
    }
    // 강
    const rp = riverPts(m);
    const stroke = (wd: number, col: string | CanvasGradient) => {
      g.strokeStyle = col;
      g.lineWidth = R(wd);
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      rp.forEach(([x, y], i) => (i ? g.lineTo(R(x), R(y)) : g.moveTo(R(x), R(y))));
      g.stroke();
    };
    g.save();
    g.translate(0, R(0.012));
    stroke(RIVER_W + 0.03, 'rgba(60,110,30,.3)');
    g.restore();
    stroke(RIVER_W + 0.026, '#d8c48a');
    stroke(RIVER_W + 0.008, '#4aa6d8');
    stroke(RIVER_W - 0.012, '#6cc4f0');
    stroke(RIVER_W - 0.045, '#9adcff');
    // 길 (흙길): 가장자리 → 흙 → 자갈
    const cr = crossings(m);
    m.ed.forEach((e) => {
      g.lineCap = 'round';
      g.save();
      g.translate(0, R(0.006));
      g.strokeStyle = 'rgba(80,60,20,.18)';
      g.lineWidth = R(0.058);
      roadPath(g, m, e, w);
      g.stroke();
      g.restore();
      g.strokeStyle = '#c49a5a';
      g.lineWidth = R(0.05);
      roadPath(g, m, e, w);
      g.stroke();
      g.strokeStyle = '#ecd29a';
      g.lineWidth = R(0.036);
      roadPath(g, m, e, w);
      g.stroke();
      g.strokeStyle = 'rgba(190,150,90,.6)';
      g.lineWidth = R(0.006);
      g.setLineDash([R(0.008), R(0.03)]);
      roadPath(g, m, e, w);
      g.stroke();
      g.setLineDash([]);
    });
    // 강 위로 다시 물 (길이 물을 덮지 않게) → 그 위에 다리
    m.ed.forEach((e, i) => {
      const cu = cr[i];
      if (!cu) return;
      g.save();
      roadPath(g, m, e, w, cu[0], cu[1]);
      g.lineCap = 'butt';
      g.strokeStyle = '#6cc4f0';
      g.lineWidth = R(0.06);
      g.stroke();
      g.restore();
      if (e.bridge < 0) drawBridge(g, m, e, cu, w, 1);
    });
    // 나무 · 숲 (성·길·강에서 떨어진 곳)
    const trees: [number, number, number, number][] = [];
    for (let i = 0; i < 160; i++) {
      const x = 0.03 + hsh(i * 9.13) * 0.94, y = 0.15 + hsh(i * 4.71) * 1.06, r = 0.024 + hsh(i * 2.9) * 0.014;
      if (y > MAP_BOT - 0.015) continue;
      let ok = distPoly(rp, x, y) > RIVER_W * 0.5 + 0.035;
      for (let q = 0; ok && q < m.nc; q++) if (Math.abs(x - m.x[q]) < 0.15 && y > m.y[q] - 0.27 && y < m.y[q] + 0.06) ok = false;
      for (const e of m.ed) {
        if (!ok) break;
        for (let k = 0; k <= 16 && ok; k++) {
          const [px, py] = onEdge(e, m, e.a, k / 16);
          if (Math.hypot(px - x, py - y) < 0.05) ok = false;
        }
      }
      for (const t of trees) if (ok && Math.hypot(t[0] - x, (t[1] - y) * 1.4) < 0.045) ok = false;
      if (ok) trees.push([x, y, r, i]);
      if (trees.length > 34) break;
    }
    trees.sort((a, b) => a[1] - b[1]);
    for (const [x, y, r, i] of trees) drawTree(g, R(x), R(y), R(r), i);
    // 꽃 · 돌
    for (let i = 0; i < 60; i++) {
      const x = hsh(i * 13.7), y = 0.12 + hsh(i * 3.3) * 1.1;
      if (distPoly(rp, x, y) < RIVER_W * 0.7) continue;
      if (i % 5 === 0) {
        g.fillStyle = '#c9c2b0';
        ell(g, R(x), R(y), R(0.009), R(0.006));
        g.fill();
        g.fillStyle = 'rgba(255,255,255,.6)';
        ell(g, R(x - 0.003), R(y - 0.002), R(0.004), R(0.002));
        g.fill();
      } else {
        g.fillStyle = ['#ffffff', '#ffe066', '#ff9ec0', '#ffffff'][i % 4];
        ell(g, R(x), R(y), 1.8, 1.8);
        g.fill();
        g.fillStyle = '#f2b81a';
        ell(g, R(x), R(y), 0.8, 0.8);
        g.fill();
      }
    }
    // 아래 판 (나무 판자)
    const top = R(MAP_BOT);
    g.fillStyle = 'rgba(70,40,10,.3)';
    g.fillRect(0, top - R(0.012), w, R(0.012));
    g.fillStyle = lin(g, 0, top, 0, h, [0, '#d79a52'], [1, '#b5743a']);
    g.fillRect(0, top, w, h - top);
    g.strokeStyle = 'rgba(120,70,20,.35)';
    g.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      const y = top + ((h - top) * k) / 5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
    g.fillStyle = '#f0c27a';
    g.fillRect(0, top, w, R(0.008));
  });
  if (BG.size > 12) BG.clear();
  BG.set(key, c);
  return c;
}
/** 나무다리 (open 0 = 들림 · 1 = 내려옴) */
function drawBridge(g: C2, m: MapRT, e: Edge, cu: [number, number], w: number, open01: number) {
  const R = (v: number) => v * w;
  const [x0, y0] = onEdge(e, m, e.a, cu[0]), [x1, y1] = onEdge(e, m, e.a, cu[1]);
  const ang = Math.atan2(y1 - y0, x1 - x0), len = R(Math.hypot(x1 - x0, y1 - y0)), W = R(0.062);
  const draw = open01 >= 1;
  g.save();
  g.translate(R(x0), R(y0));
  g.rotate(ang);
  // 그림자 · 판자
  if (draw) {
    g.fillStyle = 'rgba(20,60,90,.3)';
    g.fillRect(R(0.004), -W / 2 + R(0.014), len, W);
    const n = Math.max(5, Math.round(len / R(0.014)));
    for (let k = 0; k < n; k++) {
      g.fillStyle = k % 2 ? '#b07a3e' : '#c8925a';
      g.fillRect((len * k) / n, -W / 2, len / n - 0.6, W);
    }
    g.strokeStyle = '#6a3e18';
    g.lineWidth = R(0.008);
    g.beginPath();
    g.moveTo(0, -W / 2);
    g.lineTo(len, -W / 2);
    g.moveTo(0, W / 2);
    g.lineTo(len, W / 2);
    g.stroke();
  }
  for (const px of [0, len]) {
    g.fillStyle = '#7a4a20';
    for (const py of [-W / 2, W / 2]) {
      g.fillStyle = 'rgba(30,50,20,.3)';
      g.fillRect(px - R(0.006), py, R(0.014), R(0.01));
      g.fillStyle = '#7a4a20';
      g.fillRect(px - R(0.007), py - R(0.014), R(0.014), R(0.02));
      g.fillStyle = '#c08a4a';
      g.fillRect(px - R(0.007), py - R(0.016), R(0.014), R(0.005));
    }
  }
  g.restore();
  if (!draw) {
    // 들린 다리: 양쪽 둑에서 판이 하늘로 섰다 (화면에서 위로 선 판)
    for (const [hx, hy, sd] of [[x0, y0, 1], [x1, y1, -1]] as [number, number, number][]) {
      const bx = R(hx) + Math.cos(ang) * sd * R(0.006), by = R(hy) + Math.sin(ang) * sd * R(0.006), hgt = len * 0.42;
      g.fillStyle = 'rgba(20,60,90,.25)';
      g.fillRect(bx - W / 2 + 3, by - 2, W, R(0.012));
      g.fillStyle = lin(g, bx - W / 2, 0, bx + W / 2, 0, [0, '#c8925a'], [1, '#8a5a28']);
      g.fillRect(bx - W / 2, by - hgt, W, hgt);
      g.strokeStyle = '#5a3412';
      g.lineWidth = 1.2;
      g.strokeRect(bx - W / 2, by - hgt, W, hgt);
      for (let k = 1; k < 4; k++) {
        g.beginPath();
        g.moveTo(bx - W / 2, by - (hgt * k) / 4);
        g.lineTo(bx + W / 2, by - (hgt * k) / 4);
        g.stroke();
      }
      // 사슬
      g.strokeStyle = '#5a6070';
      g.setLineDash([2, 2]);
      g.beginPath();
      g.moveTo(bx - W / 2, by - hgt);
      g.lineTo(bx - W / 2 - sd * R(0.02), by - R(0.004));
      g.moveTo(bx + W / 2, by - hgt);
      g.lineTo(bx + W / 2 - sd * R(0.02), by - R(0.004));
      g.stroke();
      g.setLineDash([]);
    }
  }
}

// ── 성 ──
interface CLook { sel: boolean; lift: number; flip: number; prev: number; n: number; cheer: number; hurt: number; can: boolean; zz: boolean; boom: number; t: number }
const castleSize = (m: MapRT, i: number) => (m.k[i] === 'home' ? 0.215 : 0.19) * (0.88 + 0.12 * clamp((m.y[i] - 0.4) / 0.74, 0, 1));
function stoneWall(ctx: C2, x: number, y: number, w: number, h: number, k: number) {
  ctx.fillStyle = lin(ctx, x, y, x + w, y + h, [0, STONE[0]], [0.6, STONE[1]], [1, STONE[2]]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(120,95,60,.35)';
  ctx.lineWidth = Math.max(0.6, k * 0.012);
  const bh = h / 4;
  for (let r = 1; r < 4; r++) {
    ctx.beginPath();
    ctx.moveTo(x, y + bh * r);
    ctx.lineTo(x + w, y + bh * r);
    ctx.stroke();
  }
  for (let r = 0; r < 4; r++) {
    const off = r % 2 ? 0.5 : 0, bw = w / 3.2;
    for (let c = off; c * bw < w; c++) {
      if (c === 0) continue;
      ctx.beginPath();
      ctx.moveTo(x + c * bw, y + bh * r);
      ctx.lineTo(x + c * bw, y + bh * (r + 1));
      ctx.stroke();
    }
  }
}
function roundTower(ctx: C2, x: number, y: number, tw: number, th: number, col: (typeof COL)[number], S: number, roofH: number) {
  // 몸통 (원기둥)
  ctx.fillStyle = lin(ctx, x - tw / 2, 0, x + tw / 2, 0, [0, '#fbf4e4'], [0.45, STONE[1]], [1, STONE[2]]);
  ctx.beginPath();
  ctx.moveTo(x - tw / 2, y - th);
  ctx.lineTo(x - tw / 2, y);
  ctx.ellipse(x, y, tw / 2, tw * 0.18, 0, Math.PI, 0, true);
  ctx.lineTo(x + tw / 2, y - th);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,85,50,.5)';
  ctx.lineWidth = Math.max(1, S * 0.012);
  ctx.stroke();
  // 창
  ctx.fillStyle = '#4a3220';
  rr(ctx, x - tw * 0.12, y - th * 0.62, tw * 0.24, th * 0.22, tw * 0.12);
  ctx.fill();
  // 지붕 (원뿔)
  const ry = tw * 0.2;
  ctx.fillStyle = lin(ctx, x - tw * 0.62, 0, x + tw * 0.62, 0, [0, col.light], [0.4, col.main], [1, col.dark]);
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.64, y - th);
  ctx.lineTo(x, y - th - roofH);
  ctx.lineTo(x + tw * 0.64, y - th);
  ctx.ellipse(x, y - th, tw * 0.64, ry, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(1, S * 0.014);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.moveTo(x - tw * 0.4, y - th + ry * 0.2);
  ctx.lineTo(x - tw * 0.05, y - th - roofH * 0.85);
  ctx.lineTo(x - tw * 0.18, y - th + ry * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, x, y - th - roofH, S * 0.018, S * 0.018);
  ctx.fill();
}
function drawFlag(ctx: C2, px: number, py: number, fw: number, fh: number, colI: number, n: number, t: number, flip: number, prevI: number, big: number) {
  // 깃대
  const u = flip >= 0 ? clamp(flip, 0, 1) : 1;
  const ci = u < 0.5 && flip >= 0 ? prevI : colI;
  const col = COL[ci];
  const sx = flip >= 0 ? Math.max(0.08, Math.abs(Math.cos(Math.PI * u))) : 1;
  const jump = flip >= 0 ? Math.sin(Math.PI * u) * fh * 0.4 : 0;
  ctx.save();
  ctx.translate(px, py - jump);
  ctx.scale(sx, 1);
  const wave = (q: number) => Math.sin(t * 0.12 + q * 3.2) * fh * 0.07 * q;
  ctx.fillStyle = 'rgba(40,30,10,.25)';
  ctx.beginPath();
  ctx.moveTo(0, fh * 0.12);
  for (let k = 0; k <= 8; k++) ctx.lineTo((fw * k) / 8 + 2, fh * 0.12 + wave(k / 8) + 3);
  for (let k = 8; k >= 0; k--) ctx.lineTo((fw * k) / 8 + 2, fh * 1.12 + wave(k / 8) + 3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  for (let k = 0; k <= 8; k++) ctx.lineTo((fw * k) / 8 - (k === 8 ? 0 : 0), wave(k / 8));
  ctx.lineTo(fw - fw * 0.1, fh * 0.5 + wave(1));
  ctx.lineTo(fw, fh + wave(1));
  for (let k = 8; k >= 0; k--) ctx.lineTo((fw * k) / 8, fh + wave(k / 8));
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, 0, fw, fh, [0, col.light], [0.25, col.flag], [1, col.dark]);
  if (ci === NEU) ctx.fillStyle = lin(ctx, 0, 0, fw, fh, [0, '#ffffff'], [0.6, '#f6eedb'], [1, '#d8c8a4']);
  ctx.fill();
  ctx.strokeStyle = ci === NEU ? '#a08a60' : col.dark;
  ctx.lineWidth = Math.max(1.2, fh * 0.05);
  ctx.stroke();
  // 숫자
  ctx.scale(1 / sx, 1);
  if (sx > 0.3) {
    ctx.scale(sx, 1);
    const fs = fh * 0.78 * big;
    ctx.font = `900 ${Math.max(12, fs)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, fs * 0.16);
    ctx.strokeStyle = ci === NEU ? 'rgba(255,255,255,.8)' : 'rgba(30,20,10,.55)';
    const tx = fw * 0.47, ty = fh * 0.52 + wave(0.5);
    ctx.strokeText(String(n), tx, ty);
    ctx.fillStyle = col.ink;
    ctx.fillText(String(n), tx, ty);
  }
  ctx.restore();
}
function drawCrown(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r * 0.5, [0, '#fff3a0'], [0.5, '#ffcf3a'], [1, '#e09a10']);
  ctx.beginPath();
  ctx.moveTo(x - r, y + r * 0.45);
  ctx.lineTo(x - r * 1.05, y - r * 0.55);
  ctx.lineTo(x - r * 0.5, y - r * 0.05);
  ctx.lineTo(x, y - r * 0.85);
  ctx.lineTo(x + r * 0.5, y - r * 0.05);
  ctx.lineTo(x + r * 1.05, y - r * 0.55);
  ctx.lineTo(x + r, y + r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a5a08';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
  ctx.fillStyle = '#ff4a6a';
  ell(ctx, x, y + r * 0.12, r * 0.18, r * 0.18);
  ctx.fill();
}
function drawCastle(ctx: C2, m: MapRT, i: number, own: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, L: CLook) {
  const k = m.k[i], col = COL[own], S = R(castleSize(m, i)), t = L.t;
  const x = X(m.x[i]), y0 = Y(m.y[i]);
  const hurtSh = L.hurt > 0 ? Math.sin(t * 1.9) * S * 0.03 * L.hurt : 0;
  const y = y0 - L.lift;
  ctx.save();
  ctx.translate(hurtSh, 0);
  // 그림자 · 언덕 받침
  ctx.fillStyle = 'rgba(40,80,20,.28)';
  ell(ctx, x + S * 0.07, y0 + S * 0.05, S * 0.6, S * 0.17);
  ctx.fill();
  if (L.sel || L.can) {
    const p = 0.5 + 0.5 * Math.sin(t * 0.18);
    ctx.fillStyle = L.sel ? `rgba(255,220,60,${0.45 + 0.3 * p})` : `rgba(255,255,255,${0.18 + 0.18 * p})`;
    ell(ctx, x, y0 + S * 0.01, S * (0.66 + 0.04 * p), S * (0.22 + 0.02 * p));
    ctx.fill();
  }
  ctx.fillStyle = '#a8763c';
  ell(ctx, x, y + S * 0.035, S * 0.56, S * 0.17);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y - S * 0.15, 0, y + S * 0.1, [0, '#b6e87a'], [1, '#7cc048']);
  ell(ctx, x, y, S * 0.55, S * 0.155);
  ctx.fill();
  if (k === 'farm') {
    // 밀밭 이랑
    for (let r = 0; r < 3; r++) {
      ctx.fillStyle = r % 2 ? '#f2c84a' : '#e8b432';
      ctx.beginPath();
      ctx.ellipse(x - S * 0.38 + r * S * 0.07, y + S * 0.02, S * 0.05, S * 0.11, 0.9, 0, TAU);
      ctx.fill();
    }
  }
  if (k === 'pirate') return void (drawPirate(ctx, x, y, S, own, L), ctx.restore());
  const flagH = S * 0.36, flagW = S * 0.62 * (L.n >= 10 ? 1.12 : 1);
  if (k === 'tower') {
    // 탑 하나: 굵고 높은 돌탑
    roundTower(ctx, x, y - S * 0.02, S * 0.44, S * 0.62, col, S, S * 0.3);
    // 성문
    ctx.fillStyle = '#5a3418';
    ctx.beginPath();
    ctx.moveTo(x - S * 0.08, y + S * 0.0);
    ctx.lineTo(x - S * 0.08, y - S * 0.14);
    ctx.arc(x, y - S * 0.14, S * 0.08, Math.PI, 0);
    ctx.lineTo(x + S * 0.08, y + S * 0.0);
    ctx.closePath();
    ctx.fill();
    // 방패 ×2
    shieldBadge(ctx, x + S * 0.3, y - S * 0.2, S * 0.13, '×2', '#5a7ab0');
    const poleTop = y - S * 1.12, poleBot = y - S * 0.92;
    pole(ctx, x, poleTop, poleBot, S);
    drawFlag(ctx, x + S * 0.012, poleTop + S * 0.01, flagW, flagH, own, L.n, t + i * 20, L.flip, L.prev, 1);
  } else {
    const big = k === 'home' ? 1 : 0.94;
    // 가운데 망루 (뒤)
    const kw = S * 0.34 * big, kh = S * 0.34;
    stoneWall(ctx, x - kw / 2, y - S * 0.62, kw, kh, S);
    ctx.fillStyle = lin(ctx, x - kw * 0.7, 0, x + kw * 0.7, 0, [0, col.light], [0.45, col.main], [1, col.dark]);
    ctx.beginPath();
    ctx.moveTo(x - kw * 0.62, y - S * 0.62);
    ctx.lineTo(x, y - S * 0.9);
    ctx.lineTo(x + kw * 0.62, y - S * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = col.dark;
    ctx.lineWidth = Math.max(1, S * 0.014);
    ctx.stroke();
    // 앞 성벽 (윗면 + 앞면 + 톱니)
    const ww = S * 0.72 * big, wt = y - S * 0.36, wb = y - S * 0.03;
    ctx.fillStyle = '#f8f0de';
    ctx.beginPath();
    ctx.moveTo(x - ww / 2, wt);
    ctx.lineTo(x - ww / 2 + S * 0.04, wt - S * 0.05);
    ctx.lineTo(x + ww / 2 - S * 0.04, wt - S * 0.05);
    ctx.lineTo(x + ww / 2, wt);
    ctx.closePath();
    ctx.fill();
    stoneWall(ctx, x - ww / 2, wt, ww, wb - wt, S);
    ctx.strokeStyle = 'rgba(110,85,50,.55)';
    ctx.lineWidth = Math.max(1, S * 0.012);
    ctx.strokeRect(x - ww / 2, wt, ww, wb - wt);
    for (let q = 0; q < 6; q++) {
      const mx = x - ww / 2 + (ww * (q + 0.5)) / 6 - S * 0.035;
      ctx.fillStyle = q % 2 ? STONE[1] : STONE[0];
      ctx.fillRect(mx, wt - S * 0.07, S * 0.07, S * 0.07);
      ctx.strokeRect(mx, wt - S * 0.07, S * 0.07, S * 0.07);
    }
    // 성문
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.moveTo(x - S * 0.105, wb);
    ctx.lineTo(x - S * 0.105, wb - S * 0.12);
    ctx.arc(x, wb - S * 0.12, S * 0.105, Math.PI, 0);
    ctx.lineTo(x + S * 0.105, wb);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, wb - S * 0.2, 0, wb, [0, '#6a3c1c'], [1, '#4a2810']);
    ctx.beginPath();
    ctx.moveTo(x - S * 0.08, wb);
    ctx.lineTo(x - S * 0.08, wb - S * 0.12);
    ctx.arc(x, wb - S * 0.12, S * 0.08, Math.PI, 0);
    ctx.lineTo(x + S * 0.08, wb);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,15,5,.6)';
    ctx.lineWidth = Math.max(1, S * 0.01);
    for (const dx of [-0.04, 0, 0.04]) {
      ctx.beginPath();
      ctx.moveTo(x + dx * S, wb);
      ctx.lineTo(x + dx * S, wb - S * 0.19);
      ctx.stroke();
    }
    // 양옆 둥근 탑
    for (const sd of [-1, 1]) roundTower(ctx, x + sd * ww * 0.52, y - S * 0.02, S * 0.2, S * 0.48, col, S, S * 0.25);
    if (k === 'cannon') {
      // 대포: 성벽 위에서 앞으로
      const cx = x + S * 0.02, cy = wt - S * 0.02, rec = L.boom > 0 ? L.boom * S * 0.05 : 0;
      ctx.fillStyle = '#7a5028';
      rr(ctx, cx - S * 0.1, cy - S * 0.02, S * 0.2, S * 0.07, S * 0.02);
      ctx.fill();
      ctx.save();
      ctx.translate(cx, cy - rec);
      ctx.rotate(-0.25);
      ctx.fillStyle = lin(ctx, 0, -S * 0.06, 0, S * 0.06, [0, '#7a8494'], [0.4, '#3a4250'], [1, '#1a1e26']);
      rr(ctx, -S * 0.04, -S * 0.055, S * 0.24, S * 0.11, S * 0.05);
      ctx.fill();
      ctx.fillStyle = '#111418';
      ell(ctx, S * 0.2, 0, S * 0.025, S * 0.045);
      ctx.fill();
      ctx.restore();
      for (const [bx, by] of [[-0.3, -0.03], [-0.25, -0.02], [-0.275, -0.07]]) {
        ctx.fillStyle = '#2a2e36';
        ell(ctx, x + bx * S, y + by * S, S * 0.03, S * 0.03);
        ctx.fill();
      }
    }
    if (k === 'farm') {
      // 풍차
      const fxp = x + S * 0.44, fyp = y - S * 0.3;
      ctx.fillStyle = '#f0e2c0';
      ctx.beginPath();
      ctx.moveTo(fxp - S * 0.06, y - S * 0.02);
      ctx.lineTo(fxp - S * 0.035, fyp);
      ctx.lineTo(fxp + S * 0.035, fyp);
      ctx.lineTo(fxp + S * 0.06, y - S * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#a08050';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.save();
      ctx.translate(fxp, fyp);
      ctx.rotate(t * 0.05);
      for (let q = 0; q < 4; q++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#fff8e8';
        ctx.fillRect(-S * 0.018, 0, S * 0.036, S * 0.16);
        ctx.strokeStyle = '#a08050';
        ctx.strokeRect(-S * 0.018, 0, S * 0.036, S * 0.16);
      }
      ctx.restore();
      shieldBadge(ctx, x - S * 0.34, y - S * 0.32, S * 0.12, '+3', '#d0a020');
    }
    const poleTop = y - S * 1.2, poleBot = y - S * 0.88;
    pole(ctx, x, poleTop, poleBot, S);
    drawFlag(ctx, x + S * 0.012, poleTop + S * 0.01, flagW, flagH, own, L.n, t + i * 20, L.flip, L.prev, 1);
    if (k === 'home') drawCrown(ctx, x, poleTop - S * 0.05, S * 0.08);
  }
  if (L.zz) {
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(12, S * 0.16)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const zt = (t % 90) / 90;
    ctx.globalAlpha = 1 - zt;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,40,90,.6)';
    ctx.strokeText('Zzz', x - S * 0.4, y - S * 0.7 - zt * S * 0.3);
    ctx.fillText('Zzz', x - S * 0.4, y - S * 0.7 - zt * S * 0.3);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function pole(ctx: C2, x: number, top: number, bot: number, S: number) {
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = Math.max(1.5, S * 0.022);
  ctx.beginPath();
  ctx.moveTo(x, bot);
  ctx.lineTo(x, top);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, x, top, S * 0.022, S * 0.022);
  ctx.fill();
}
function shieldBadge(ctx: C2, x: number, y: number, r: number, txt: string, c: string) {
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.9);
  ctx.lineTo(x + r, y - r * 0.9);
  ctx.lineTo(x + r, y + r * 0.1);
  ctx.quadraticCurveTo(x + r * 0.9, y + r * 0.8, x, y + r * 1.15);
  ctx.quadraticCurveTo(x - r * 0.9, y + r * 0.8, x - r, y + r * 0.1);
  ctx.closePath();
  ctx.fillStyle = c;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, r * 0.16);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, r * 1.15)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y + r * 0.05);
}
function drawPirate(ctx: C2, x: number, y: number, S: number, own: number, L: CLook) {
  // 통나무 울타리 요새 + 깃발 (해골 대신 둥근 눈 둘의 장난스러운 얼굴)
  const n = 9;
  for (let q = 0; q < n; q++) {
    const a = Math.PI + (Math.PI * q) / (n - 1);
    const lx = x + Math.cos(a) * S * 0.42, ly = y - S * 0.02 + Math.sin(a) * S * 0.1 * -1;
    const hgt = S * (0.34 + (q % 2) * 0.05);
    ctx.fillStyle = lin(ctx, lx - S * 0.04, 0, lx + S * 0.04, 0, [0, '#c08a4a'], [1, '#7a4a20']);
    rr(ctx, lx - S * 0.04, ly - hgt, S * 0.08, hgt, S * 0.02);
    ctx.fill();
    ctx.fillStyle = '#e0b070';
    ell(ctx, lx, ly - hgt, S * 0.04, S * 0.018);
    ctx.fill();
  }
  // 보물 상자
  if (own === NEU) {
    const bx = x + S * 0.02, by = y - S * 0.06;
    ctx.fillStyle = '#8a4a1a';
    rr(ctx, bx - S * 0.11, by - S * 0.1, S * 0.22, S * 0.12, S * 0.02);
    ctx.fill();
    ctx.fillStyle = '#a85a22';
    ctx.beginPath();
    ctx.ellipse(bx, by - S * 0.1, S * 0.11, S * 0.05, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#ffcf3a';
    ctx.fillRect(bx - S * 0.11, by - S * 0.07, S * 0.22, S * 0.02);
    ctx.fillRect(bx - S * 0.015, by - S * 0.12, S * 0.03, S * 0.06);
    ctx.fillStyle = 'rgba(255,240,150,.8)';
    ell(ctx, bx, by - S * 0.14, S * 0.05 * (0.8 + 0.2 * Math.sin(L.t * 0.2)), S * 0.02);
    ctx.fill();
  }
  const poleTop = y - S * 0.95, poleBot = y - S * 0.2;
  pole(ctx, x - S * 0.22, poleTop, poleBot, S);
  if (own === NEU) {
    // 검은 해적 깃발 + 숫자
    const fw = S * 0.62, fh = S * 0.36;
    ctx.save();
    ctx.translate(x - S * 0.21, poleTop + S * 0.01);
    const wave = (q: number) => Math.sin(L.t * 0.12 + q * 3.2) * fh * 0.07 * q;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let k = 0; k <= 8; k++) ctx.lineTo((fw * k) / 8, wave(k / 8));
    ctx.lineTo(fw, fh + wave(1));
    for (let k = 8; k >= 0; k--) ctx.lineTo((fw * k) / 8, fh + wave(k / 8));
    ctx.closePath();
    ctx.fillStyle = '#2a2a34';
    ctx.fill();
    ctx.strokeStyle = '#0a0a10';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.font = `900 ${Math.max(12, fh * 0.78)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(L.n), fw * 0.47, fh * 0.52 + wave(0.5));
    ctx.restore();
  } else drawFlag(ctx, x - S * 0.21, poleTop + S * 0.01, S * 0.62, S * 0.36, own, L.n, L.t, L.flip, L.prev, 1);
}

// ── 꼬마 병사 ──
function drawSoldier(ctx: C2, x: number, y: number, s: number, ci: number, ph: number, mode: 'walk' | 'cheer' | 'fly', dir = 1) {
  const col = COL[ci === NEU ? ME : ci];
  const step = Math.sin(ph);
  const hop = mode === 'cheer' ? Math.abs(Math.sin(ph)) * s * 0.6 : mode === 'walk' ? Math.abs(step) * s * 0.12 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,60,20,.28)';
  ell(ctx, 0, 0, s * 0.38, s * 0.12);
  ctx.fill();
  ctx.translate(0, -hop);
  if (mode === 'fly') ctx.rotate(ph);
  ctx.scale(dir, 1);
  // 다리
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = Math.max(1.2, s * 0.14);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.3);
  ctx.lineTo(-s * 0.1 - step * s * 0.14, 0);
  ctx.moveTo(s * 0.1, -s * 0.3);
  ctx.lineTo(s * 0.1 + step * s * 0.14, 0);
  ctx.stroke();
  // 창
  if (mode !== 'cheer') {
    ctx.strokeStyle = '#8a6030';
    ctx.lineWidth = Math.max(1, s * 0.07);
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 0.2);
    ctx.lineTo(s * 0.3, -s * 1.15);
    ctx.stroke();
    ctx.fillStyle = '#dfe6f0';
    ctx.beginPath();
    ctx.moveTo(s * 0.3, -s * 1.35);
    ctx.lineTo(s * 0.37, -s * 1.12);
    ctx.lineTo(s * 0.23, -s * 1.12);
    ctx.closePath();
    ctx.fill();
  }
  // 몸 (옷)
  ctx.fillStyle = col.main;
  rr(ctx, -s * 0.24, -s * 0.72, s * 0.48, s * 0.46, s * 0.14);
  ctx.fill();
  ctx.strokeStyle = col.dark;
  ctx.lineWidth = Math.max(1, s * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#6a4020';
  ctx.fillRect(-s * 0.24, -s * 0.42, s * 0.48, s * 0.06);
  // 팔
  ctx.strokeStyle = '#ffd9b0';
  ctx.lineWidth = Math.max(1.2, s * 0.12);
  ctx.beginPath();
  if (mode === 'cheer') {
    ctx.moveTo(-s * 0.22, -s * 0.62);
    ctx.lineTo(-s * 0.4, -s * 1.05);
    ctx.moveTo(s * 0.22, -s * 0.62);
    ctx.lineTo(s * 0.4, -s * 1.05);
  } else {
    ctx.moveTo(-s * 0.22, -s * 0.6);
    ctx.lineTo(-s * 0.3, -s * 0.36);
    ctx.moveTo(s * 0.22, -s * 0.6);
    ctx.lineTo(s * 0.3, -s * 0.5);
  }
  ctx.stroke();
  // 머리 · 투구
  ctx.fillStyle = '#ffdcb8';
  ell(ctx, 0, -s * 0.9, s * 0.22, s * 0.22);
  ctx.fill();
  ctx.strokeStyle = '#8a5a3a';
  ctx.lineWidth = Math.max(0.8, s * 0.04);
  ctx.stroke();
  ctx.fillStyle = col.dark;
  ctx.beginPath();
  ctx.arc(0, -s * 0.94, s * 0.24, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = col.light;
  ell(ctx, 0, -s * 1.2, s * 0.06, s * 0.06);
  ctx.fill();
  // 눈
  ctx.fillStyle = '#2a1a10';
  if (mode === 'cheer') {
    ctx.lineWidth = Math.max(0.8, s * 0.04);
    ctx.strokeStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(-s * 0.08, -s * 0.86, s * 0.04, Math.PI, 0);
    ctx.arc(s * 0.08, -s * 0.86, s * 0.04, Math.PI, 0);
    ctx.stroke();
  } else {
    ell(ctx, -s * 0.07, -s * 0.87, s * 0.03, s * 0.04);
    ctx.fill();
    ell(ctx, s * 0.07, -s * 0.87, s * 0.03, s * 0.04);
    ctx.fill();
  }
  ctx.restore();
}

// ── 왕 · 남작 (표정) ──
type Face = 'idle' | 'happy' | 'worry' | 'dizzy' | 'angry' | 'smug';
function drawRuler(ctx: C2, x: number, y: number, r: number, ci: number, face: Face, t: number, roll: number) {
  const col = COL[ci];
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(40,60,20,.3)';
  ell(ctx, 0, 0, r * 0.9, r * 0.25);
  ctx.fill();
  const bob = face === 'happy' ? -Math.abs(Math.sin(t * 0.25)) * r * 0.4 : Math.sin(t * 0.06) * r * 0.04;
  ctx.translate(0, bob - r * 0.95);
  ctx.rotate(roll);
  // 망토 몸
  ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, col.light], [0.4, col.main], [1, col.dark]);
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.85, -r * 0.1, 0, -r * 0.25);
  ctx.quadraticCurveTo(r * 0.85, -r * 0.1, r * 0.75, r * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  rr(ctx, -r * 0.75, r * 0.78, r * 1.5, r * 0.18, r * 0.08);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#ffd9b4';
  ell(ctx, 0, -r * 0.55, r * 0.58, r * 0.55);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,120,120,.4)';
  ell(ctx, -r * 0.32, -r * 0.4, r * 0.12, r * 0.08);
  ctx.fill();
  ell(ctx, r * 0.32, -r * 0.4, r * 0.12, r * 0.08);
  ctx.fill();
  // 수염
  ctx.fillStyle = ci === ME ? '#8a5a2a' : ci === RED ? '#6a2a1a' : '#4a2a5a';
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.36);
  ctx.quadraticCurveTo(-r * 0.3, -r * 0.42, -r * 0.42, -r * 0.28);
  ctx.quadraticCurveTo(-r * 0.2, -r * 0.3, 0, -r * 0.3);
  ctx.quadraticCurveTo(r * 0.2, -r * 0.3, r * 0.42, -r * 0.28);
  ctx.quadraticCurveTo(r * 0.3, -r * 0.42, 0, -r * 0.36);
  ctx.fill();
  // 눈
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1, r * 0.07);
  if (face === 'dizzy') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.22 - r * 0.08, -r * 0.68);
      ctx.lineTo(sx * r * 0.22 + r * 0.08, -r * 0.54);
      ctx.moveTo(sx * r * 0.22 + r * 0.08, -r * 0.68);
      ctx.lineTo(sx * r * 0.22 - r * 0.08, -r * 0.54);
      ctx.stroke();
    }
    for (let q = 0; q < 3; q++) {
      const a = t * 0.15 + (q * TAU) / 3;
      starPath(ctx, Math.cos(a) * r * 0.7, -r * 1.25 + Math.sin(a) * r * 0.2, r * 0.13);
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
    }
  } else if (face === 'happy' || face === 'smug') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * r * 0.22, -r * 0.58, r * 0.09, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (face === 'worry') {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * r * 0.22, -r * 0.6, r * 0.1, r * 0.13);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
      ell(ctx, sx * r * 0.22, -r * 0.57, r * 0.045, r * 0.06);
      ctx.fillStyle = '#2a1a10';
      ctx.fill();
    }
    ctx.fillStyle = '#7ac8ff';
    ell(ctx, r * 0.5, -r * 0.78, r * 0.07, r * 0.11);
    ctx.fill();
  } else {
    for (const sx of [-1, 1]) {
      ell(ctx, sx * r * 0.22, -r * 0.6, r * 0.065, r * 0.09);
      ctx.fill();
    }
    if (face === 'angry') {
      ctx.beginPath();
      ctx.moveTo(-r * 0.36, -r * 0.82);
      ctx.lineTo(-r * 0.1, -r * 0.72);
      ctx.moveTo(r * 0.36, -r * 0.82);
      ctx.lineTo(r * 0.1, -r * 0.72);
      ctx.stroke();
    }
  }
  // 입
  ctx.beginPath();
  if (face === 'happy') ctx.arc(0, -r * 0.24, r * 0.12, 0.1, Math.PI - 0.1);
  else if (face === 'worry' || face === 'dizzy') ell(ctx, 0, -r * 0.18, r * 0.07, r * 0.09);
  else ctx.arc(0, -r * 0.1, r * 0.1, Math.PI + 0.4, -0.4);
  ctx.stroke();
  // 왕관
  drawCrown(ctx, 0, -r * 1.12, r * 0.34);
  ctx.restore();
}

// ── 연출 상태 ──
interface Brawl { x: number; y: number; t0: number; T: number; ci: number; cj: number; big: number }
interface Coin { x0: number; y0: number; x1: number; y1: number; t0: number }
interface Vis {
  ev: number; disp: number[]; key: string; brawls: Brawl[]; cheers: { c: number; f: number; t0: number }[]; hurt: number[]; boom: number[]; coins: Coin[];
  balls: { x0: number; y0: number; x1: number; y1: number; t0: number }[]; sad: number; joy: number; foeSad: number; foeJoy: number; trumpet: number;
}
const VIS = new WeakMap<object, Vis>();
const visOf = (s: FlagState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { ev: -1, disp: [], key: '', brawls: [], cheers: [], hurt: [], boom: [], coins: [], balls: [], sad: -999, joy: -999, foeSad: -999, foeJoy: -999, trumpet: -999 }));
  return v;
};
/** 고른 성에서 이웃 성으로 보내면 어떻게 되나 (같은 시뮬레이션) */
const PREV = new WeakMap<object, { key: string; res: Map<number, { take: boolean; clash: boolean; left: number; n: number }> }>();
function previews(s: FlagState) {
  const key = `${s.stage}|${s.turn}|${s.sel}|${s.own.join('')}|${s.n.join(',')}`;
  const hit = PREV.get(s);
  if (hit && hit.key === key) return hit.res;
  const res = new Map<number, { take: boolean; clash: boolean; left: number; n: number }>();
  const m = s.map, d = STAGES[s.stage];
  if (s.sel >= 0) {
    for (const ei of m.adj[s.sel]) {
      const b = other(m.ed[ei], s.sel);
      if (!open(m.ed[ei], s.turn)) continue;
      const r = simTurn(m, s.own, s.n, s.turn, [{ f: ME, a: s.sel, b, e: ei }, ...s.plans], d.ai === 0, false);
      const mm = r.marches[0];
      res.set(b, { take: s.own[b] !== ME && r.own[b] === ME && r.took.length > 0, clash: mm.clashT >= 0, left: r.own[b] === ME ? r.n[b] : -1, n: mm.c0 });
    }
  }
  PREV.set(s, { key, res });
  return res;
}

function drawAll(ctx: C2, s: FlagState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), m = s.map, t = s.t, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  if (vis.key !== m.key + s.stage + (s.again ? 'a' : '') || vis.disp.length !== m.nc) {
    vis.key = m.key + s.stage + (s.again ? 'a' : '');
    vis.disp = s.n.slice();
    vis.hurt = s.n.map(() => 0);
    vis.boom = s.n.map(() => 0);
    vis.brawls = [];
    vis.cheers = [];
    vis.coins = [];
    vis.balls = [];
  }
  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 12) continue;
    const ex = X(e.x), ey = Y(e.y), c = e.c ?? -1, S = c >= 0 ? R(castleSize(m, c)) : R(0.19);
    switch (e.kind) {
      case 'send':
        fx.ring(ex, ey, '#ffffff', R(0.09), 3);
        fx.burst(ex, ey, '#e8d0a0', 12, 2.5, 2.5);
        fx.pop(ex, ey - S * 1.3, `-${e.n}`, '#ffffff', Math.max(14, R(0.045)));
        vis.trumpet = t;
        break;
      case 'wait':
        vis.trumpet = t;
        for (let q = 0; q < m.nc; q++) if (s.own[q] === ME) fx.ring(X(m.x[q]), Y(m.y[q]) - R(0.05), '#9ad0ff', R(0.12), 4);
        fx.pop(X(0.5), Y(0.62), '기다리기 — 병사 모으는 중', '#ffffff', Math.max(14, R(0.045)));
        break;
      case 'take': {
        const f = e.f ?? ME;
        vis.brawls.push({ x: e.x, y: e.y - 0.03, t0: t - 6, T: 24, ci: f, cj: s.prevOwn[c] ?? NEU, big: 1 });
        vis.cheers.push({ c, f, t0: t + 16 });
        fx.kick(f === ME ? 9 : 6);
        fx.ring(ex, ey - S * 0.5, COL[f].main, S * 1.2, 6);
        fx.burst(ex, ey - S * 0.9, COL[f].light, 26, 4.5, 3);
        fx.burst(ex, ey - S * 0.9, '#ffd23a', 14, 3.5, 2.4);
        if (f === ME) vis.joy = t;
        else if (s.prevOwn[c] === ME) (vis.sad = t), fx.pop(ex, ey - S * 1.45, '빼앗겼다…', '#ffffff', Math.max(14, R(0.045)));
        if (m.k[c] === 'home' && isFoe(s.prevOwn[c])) vis.foeSad = t;
        break;
      }
      case 'ouch': break;
      case 'hit':
        vis.brawls.push({ x: e.x, y: e.y - 0.03, t0: t - 4, T: 22, ci: e.f ?? RED, cj: s.own[c], big: 0.8 });
        vis.hurt[c] = 1;
        fx.kick(4);
        fx.pop(ex, ey - S * 1.4, `-${e.n}`, '#ffffff', Math.max(16, R(0.05)));
        fx.burst(ex, ey - S * 0.2, '#e8d0a0', 14, 3, 3);
        break;
      case 'held':
        fx.pop(ex, ey - S * 1.65, '막았다!', '#bfe4ff', Math.max(15, R(0.046)));
        break;
      case 'join':
        fx.ring(ex, ey - S * 0.5, COL[e.f ?? ME].light, S * 0.9, 3);
        fx.pop(ex, ey - S * 1.4, `+${e.n}`, COL[e.f ?? ME].light, Math.max(15, R(0.046)));
        break;
      case 'clash':
        vis.brawls.push({ x: e.x, y: e.y, t0: t - 4, T: 30, ci: RED, cj: ME, big: 1.25 });
        fx.kick(11);
        fx.ring(ex, ey, '#ffffff', R(0.16), 7);
        fx.burst(ex, ey, '#f0dcb0', 30, 5, 3.5);
        fx.burst(ex, ey, '#ffd23a', 16, 4, 2.4);
        fx.pop(ex, ey + R(0.02), '쾅!', '#ffe14a', Math.max(22, R(0.075)));
        break;
      case 'boom': {
        const src = Number(e.text);
        vis.balls.push({ x0: m.x[src], y0: m.y[src] - 0.08, x1: e.x, y1: e.y - 0.06, t0: t });
        vis.boom[src] = 1;
        break;
      }
      case 'gold': {
        const pir = m.k.indexOf('pirate');
        vis.coins.push({ x0: pir >= 0 ? m.x[pir] : 0.5, y0: pir >= 0 ? m.y[pir] - 0.06 : 0.5, x1: e.x, y1: e.y - 0.1, t0: t });
        break;
      }
      case 'grow':
        if ((e.n ?? 1) >= 2) fx.pop(ex + S * 0.25, ey - S * 1.3, `+${e.n}`, e.f === ME ? '#cfe8ff' : e.f === NEU ? '#ffe9a8' : '#ffd0c8', Math.max(14, R(0.042)));
        if ((e.n ?? 1) >= 2 && e.f === ME) fx.ring(ex, ey - S * 0.5, '#9ad0ff', S * 0.8, 3);
        if (m.k[c] === 'farm') fx.burst(ex - S * 0.3, ey, '#ffd84a', 8, 2, 2);
        break;
      case 'flip':
        vis.cheers.push({ c, f: e.f ?? ME, t0: t });
        fx.burst(ex, ey - S * 1.0, COL[e.f ?? ME].light, 18, 4, 2.6);
        fx.pop(ex, ey - S * 1.45, '항복!', '#ffffff', Math.max(15, R(0.046)));
        fx.kick(4);
        break;
      case 'clear':
        for (let q = 0; q < 6; q++) fx.burst(X(0.1 + q * 0.16), Y(0.3 + (q % 2) * 0.12), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff', '#ff9a3a'][q], 18, 5, 3);
        vis.joy = t;
        break;
      case 'fail':
        vis.sad = t;
        fx.kick(6);
        break;
      case 'pick':
        fx.ring(ex, ey - S * 0.4, '#ffe14a', S * 0.9, 4);
        break;
      case 'nope':
        fx.pop(ex, ey - S * 1.45, e.text ?? '', '#ffffff', Math.max(13, R(0.04)));
        if (c >= 0) vis.hurt[c] = 0.6;
        break;
      case 'clashLost':
        fx.pop(ex, ey - R(0.12), '길에서 밀렸다…', '#ffffff', Math.max(14, R(0.044)));
        break;
      case 'big':
        fx.kick(9);
        break;
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t));
  for (let q = 0; q < m.nc; q++) {
    vis.disp[q] += (s.n[q] - vis.disp[q]) * 0.22;
    if (Math.abs(s.n[q] - vis.disp[q]) < 0.4) vis.disp[q] = s.n[q];
    vis.hurt[q] = Math.max(0, vis.hurt[q] - 0.04);
    vis.boom[q] = Math.max(0, vis.boom[q] - 0.05);
  }
  vis.brawls = vis.brawls.filter((b) => t - b.t0 < b.T + 4);
  vis.cheers = vis.cheers.filter((c) => t - c.t0 < 60);
  vis.coins = vis.coins.filter((c) => t - c.t0 < 40);
  vis.balls = vis.balls.filter((b) => t - b.t0 < 26);

  ctx.drawImage(getBg(m, Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc)))), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  // 물결 반짝
  const rp = riverPts(m);
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let q = 0; q < 14; q++) {
    const i = Math.floor(((q * 7.3 + t * 0.05) % 1) * (rp.length - 1) + q * 3) % (rp.length - 1);
    const [x, y] = rp[i];
    const a = 0.5 + 0.5 * Math.sin(t * 0.08 + q);
    ctx.globalAlpha = a * 0.8;
    ell(ctx, X(x + (hsh(q) - 0.5) * 0.03), Y(y + (hsh(q + 9) - 0.5) * 0.02), R(0.012), R(0.003));
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // 구름 그림자 · 양 · 새
  for (let q = 0; q < 2; q++) {
    const cx = ((t * 0.0004 + q * 0.55) % 1.6) - 0.3, cy = 0.35 + q * 0.5;
    ctx.fillStyle = 'rgba(40,90,40,.08)';
    ell(ctx, X(cx), Y(cy), R(0.22), R(0.07));
    ctx.fill();
    ell(ctx, X(cx + 0.12), Y(cy + 0.02), R(0.14), R(0.05));
    ctx.fill();
  }
  const joyAge = t - Math.max(vis.joy, s.bigT);
  freeSpots(m).forEach(([x, y], k) => {
    const wander = Math.sin(t * 0.004 + k * 1.7) * 0.025;
    const hop = joyAge >= 0 && joyAge < 40 ? Math.abs(Math.sin(joyAge * 0.32 + k)) * R(0.02) : 0;
    drawSheep(ctx, X(x + wander), Y(y), R(0.026), t, k, hop);
  });
  for (let q = 0; q < 2; q++) {
    const bx = ((t * 0.0016 + q * 0.47) % 1.4) - 0.2, by = 0.16 + q * 0.28 + Math.sin(t * 0.03 + q) * 0.01, fl = Math.sin(t * 0.35 + q * 2);
    ctx.strokeStyle = '#4a3a3a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(X(bx) - R(0.016), Y(by) - fl * R(0.008));
    ctx.quadraticCurveTo(X(bx) - R(0.006), Y(by) - R(0.006), X(bx), Y(by));
    ctx.quadraticCurveTo(X(bx) + R(0.006), Y(by) - R(0.006), X(bx) + R(0.016), Y(by) - fl * R(0.008));
    ctx.stroke();
  }
  // 도개교
  const cr = crossings(m);
  m.ed.forEach((e, i) => {
    if (e.bridge < 0 || !cr[i]) return;
    const op = open(e, s.turn);
    drawBridge(ctx, m, e, cr[i]!, w, op ? 1 : 0);
    const [bx, by] = onEdge(e, m, e.a, (cr[i]![0] + cr[i]![1]) / 2);
    // 남은 차례 표지
    const left = op ? 2 - ((s.turn + e.bridge) % 4) : 4 - ((s.turn + e.bridge) % 4);
    const sd = bx < 0.5 ? 1 : -1, px = X(bx) + sd * R(0.085), py = Y(by) + R(0.01);
    ctx.fillStyle = op ? '#3aa04a' : '#d0402a';
    rr(ctx, px - R(0.045), py - R(0.024), R(0.09), R(0.048), R(0.014));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    font(0.03, 900);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(op ? `열림 ${left}` : `닫힘 ${left}`, px, py + 1);
  });
  // 적 예고 화살표
  const pick = s.phase === 'pick';
  if (pick) {
    for (const p of s.plans) {
      if (p.a < 0) continue;
      drawArrow(ctx, m, p, X, Y, R, t, COL[p.f].main, true, s);
    }
  }
  // 고른 성 → 갈 수 있는 이웃 화살표
  const pv = pick && s.sel >= 0 ? previews(s) : null;
  if (pv) {
    for (const ei of m.adj[s.sel]) {
      const b = other(m.ed[ei], s.sel);
      if (!open(m.ed[ei], s.turn)) continue;
      drawArrow(ctx, m, { f: ME, a: s.sel, b, e: ei }, X, Y, R, t, '#ffd23a', false, s);
    }
  }
  // 성 (뒤에서 앞으로)
  const order = [...Array(m.nc).keys()].sort((a, b) => m.y[a] - m.y[b]);
  const tip = firstTip(s);
  for (const i of order) {
    const fl = t - s.flipT[i];
    const canSend = pick && s.own[i] === ME && s.n[i] >= 2 && s.sel < 0 && s.stage === 0;
    drawCastle(ctx, m, i, s.own[i], X, Y, R, {
      sel: s.sel === i, lift: s.sel === i ? R(0.012) + Math.abs(Math.sin(t * 0.15)) * R(0.008) : 0,
      flip: fl < 26 ? fl / 26 : -1, prev: s.prevOwn[i], n: Math.round(vis.disp[i]), cheer: 0, hurt: vis.hurt[i], can: canSend || tip === i,
      zz: sleepy(s) && isFoe(s.own[i]), boom: vis.boom[i], t,
    });
  }
  // 왕 · 남작
  drawRulers(ctx, s, vis, X, Y, R, t);
  // 행진하는 병사
  if (s.phase === 'march' && s.cur) drawMarches(ctx, s, X, Y, R, font, t);
  // 만세 병사
  for (const ch of vis.cheers) {
    const age = t - ch.t0;
    if (age < 0) continue;
    const S = R(castleSize(m, ch.c)), cx = X(m.x[ch.c]), cy = Y(m.y[ch.c]);
    for (let q = 0; q < 5; q++) {
      const ox = (q - 2) * S * 0.24, oy = S * 0.12 + (q % 2) * S * 0.06;
      drawSoldier(ctx, cx + ox, cy + oy, R(0.048), ch.f, age * 0.3 + q, 'cheer');
    }
  }
  // 맞붙는 먼지구름
  for (const b of vis.brawls) drawBrawl(ctx, b, X, Y, R, t);
  // 대포알
  for (const b of vis.balls) {
    const u = (t - b.t0) / 18;
    if (u > 1) {
      if (t - b.t0 === 19) (fx.burst(X(b.x1), Y(b.y1), '#ff9a3a', 16, 4, 3), fx.pop(X(b.x1), Y(b.y1) - R(0.08), `-${CANNON}`, '#ffffff', Math.max(16, R(0.05))), fx.kick(5));
      continue;
    }
    const bx = X(b.x0 + (b.x1 - b.x0) * u), by = Y(b.y0 + (b.y1 - b.y0) * u) - Math.sin(Math.PI * u) * R(0.15);
    ctx.fillStyle = '#22262e';
    ell(ctx, bx, by, R(0.014), R(0.014));
    ctx.fill();
    ctx.fillStyle = 'rgba(200,200,200,.5)';
    ell(ctx, X(b.x0), Y(b.y0) - R(0.02), R(0.03) * (1 + u), R(0.022) * (1 + u));
    ctx.fill();
  }
  // 보물 동전
  for (const c of vis.coins) {
    const u = clamp((t - c.t0) / 30, 0, 1);
    for (let q = 0; q < 4; q++) {
      const uu = clamp(u * 1.2 - q * 0.06, 0, 1);
      const bx = X(c.x0 + (c.x1 - c.x0) * uu), by = Y(c.y0 + (c.y1 - c.y0) * uu) - Math.sin(Math.PI * uu) * R(0.18);
      coinIcon(ctx, bx + q * 3, by, R(0.014));
    }
    if (t - c.t0 === 30) (fx.pop(X(c.x1), Y(c.y1) - R(0.06), `+${TREASURE}`, '#ffe14a', Math.max(16, R(0.05))), fx.burst(X(c.x1), Y(c.y1), '#ffd23a', 10, 3, 2));
  }
  // 큰 글자 (와!)
  if (t - s.bigT < 56 && s.bigText) {
    const age = t - s.bigT, k = age < 8 ? 0.6 + (age / 8) * 0.7 : age < 14 ? 1.3 - ((age - 8) / 6) * 0.3 : 1;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (56 - age) / 14);
    ctx.translate(clamp(X(s.bigX), R(0.3), w - R(0.3)), Math.max(R(0.2), Y(s.bigY) - age * 0.3));
    font(0.092, 900);
    const fit = Math.min(1, (w - R(0.08)) / Math.max(1, ctx.measureText(s.bigText).width));
    ctx.scale(k * fit, k * fit);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = R(0.02);
    ctx.strokeStyle = '#5a2a0a';
    ctx.strokeText(s.bigText, 0, 0);
    ctx.fillStyle = lin(ctx, 0, -R(0.04), 0, R(0.04), [0, '#fff6a0'], [1, '#ffb020']);
    ctx.fillText(s.bigText, 0, 0);
    ctx.restore();
  }
  ctx.restore();
  // 미리 보기 딱지 (흔들림 밖, 읽히게)
  if (pv) {
    for (const [b, r] of pv) {
      const S = R(castleSize(m, b)), bx = X(m.x[b]), by = Y(m.y[b]) - S * 1.38;
      const txt = s.own[b] === ME ? `+${r.n} 보태기` : r.take ? `${r.n}명 → 점령!` : r.clash ? `${r.n}명 → 맞붙기!` : `${r.n}명 → 못 뺏어요`;
      font(0.034, 900);
      const tw = ctx.measureText(txt).width + R(0.03);
      const lx = clamp(bx, tw / 2 + 3, w - tw / 2 - 3), ly = Math.max(R(0.12), by - R(0.04));
      ctx.fillStyle = s.own[b] === ME ? '#3a8cf2' : r.take ? '#2ea84a' : r.clash ? '#ff8a1a' : '#8a7a68';
      rr(ctx, lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, lx, ly + 1);
    }
  }
  // 적 화살표 숫자 딱지
  if (pick) for (const p of s.plans) if (p.a >= 0) planBadge(ctx, s, p, X, Y, R, font, t);
  drawSpot(ctx, s, X, Y, R, font, w, t);
  drawTop(ctx, s, R, font, w);
  drawPanel(ctx, s, X, Y, R, font, w, t);
  drawBanner(ctx, s, fx, R, font, w, t);
  // 첫 판 손가락
  if (tip >= 0 && s.phase === 'pick' && !s.banner) {
    const S = R(castleSize(m, tip));
    drawHand(ctx, X(m.x[tip]) + S * 0.18, Y(m.y[tip]) - S * 0.35, R(0.085), Math.max(0, Math.sin(t * 0.15)));
  }
  void d;
}
/** 첫 판 안내: 무엇을 누를지 (-1 = 안내 없음) */
function firstTip(s: FlagState): number {
  if (s.stage !== 0 || s.again || s.sends > 1 || s.phase !== 'pick') return -1;
  const m = s.map, home = m.home[ME];
  if (s.sel < 0) return s.sends ? -1 : home;
  // 고른 성 옆의 빈 성 (없으면 가장 약한 이웃)
  let b = -1;
  for (const ei of m.adj[s.sel]) {
    const q = other(m.ed[ei], s.sel);
    if (s.own[q] !== ME && (b < 0 || s.n[q] < s.n[b])) b = q;
  }
  return b;
}
function drawArrow(ctx: C2, m: MapRT, p: Move, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number, col: string, foe: boolean, s: FlagState) {
  const e = m.ed[p.e], S0 = castleSize(m, p.a), S1 = castleSize(m, p.b);
  const L = e.L, u0 = clamp((S0 * 0.45) / L, 0.05, 0.4), u1 = 1 - clamp((S1 * 0.55) / L, 0.05, 0.4);
  const pts: [number, number][] = [];
  for (let k = 0; k <= 20; k++) pts.push(onEdge(e, m, p.a, u0 + ((u1 - u0) * k) / 20));
  const lw = R(foe ? 0.03 : 0.024);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  pts.forEach(([x, y], k) => (k ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y))));
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = lw + 4;
  ctx.stroke();
  ctx.strokeStyle = col;
  ctx.lineWidth = lw;
  ctx.setLineDash([R(0.03), R(0.018)]);
  ctx.lineDashOffset = -t * (foe ? 0.9 : 0.6);
  ctx.stroke();
  ctx.setLineDash([]);
  // 화살촉
  const [ax, ay] = pts[pts.length - 1], [bx, by] = pts[pts.length - 3];
  const ang = Math.atan2(ay - by, ax - bx), hs = R(foe ? 0.05 : 0.042) * (1 + 0.1 * Math.sin(t * 0.2));
  ctx.translate(X(ax), Y(ay));
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(hs * 0.5, 0);
  ctx.lineTo(-hs * 0.6, -hs * 0.62);
  ctx.lineTo(-hs * 0.6, hs * 0.62);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
  void s;
}
function planBadge(ctx: C2, s: FlagState, p: Move, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, t: number) {
  const m = s.map, [mx, my] = onEdge(m.ed[p.e], m, p.a, 0.5), cnt = Math.ceil(s.n[p.a] / 2);
  const bx = X(mx), by = Y(my) - R(0.005), r = R(0.034) * (1 + 0.06 * Math.sin(t * 0.2));
  ctx.fillStyle = 'rgba(60,20,10,.3)';
  ell(ctx, bx + 2, by + 3, r, r);
  ctx.fill();
  ctx.fillStyle = lin(ctx, bx, by - r, bx, by + r, [0, COL[p.f].light], [0.4, COL[p.f].main], [1, COL[p.f].dark]);
  ell(ctx, bx, by, r, r);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  font(0.042, 900);
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(cnt), bx, by + 1);
  // 칼 두 자루
  ctx.save();
  ctx.translate(bx + r * 0.95, by - r * 0.85);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.rotate(sd * 0.7);
    ctx.fillStyle = '#e8eef6';
    ctx.fillRect(-1.5, -r * 0.6, 3, r * 0.8);
    ctx.fillStyle = '#8a5a2a';
    ctx.fillRect(-r * 0.2, r * 0.18, r * 0.4, 2.5);
    ctx.restore();
  }
  ctx.restore();
}
function drawMarches(ctx: C2, s: FlagState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, t: number) {
  const cur = s.cur!, m = s.map, tau = s.pt;
  const items: { x: number; y: number; draw: () => void }[] = [];
  cur.marches.forEach((mc) => {
    if (tau >= mc.endT) return;
    const e = m.ed[mc.e], u = clamp(tau / mc.T, 0, 1), cnt = mc.clashT >= 0 && tau >= mc.clashT ? mc.c1 : mc.c0;
    if (cnt <= 0) return;
    const shown = Math.min(cnt, 12), gap = 0.03 / e.L;
    const [hx, hy] = onEdge(e, m, mc.a, u), [nx, ny] = onEdge(e, m, mc.a, Math.min(1, u + 0.02));
    const dir = nx >= hx ? 1 : -1, dl = Math.hypot(nx - hx, ny - hy) || 1, px = -(ny - hy) / dl, py = (nx - hx) / dl;
    for (let k = shown - 1; k >= 0; k--) {
      const row = Math.floor(k / 2), uk = u - row * gap - 0.03;
      if (uk < 0.07) continue;
      const [x0, y0] = onEdge(e, m, mc.a, uk);
      const side = (k % 2 ? 1 : -1) * 0.016, x = x0 + px * side, y = y0 + py * side * 0.6;
      items.push({ x, y, draw: () => drawSoldier(ctx, X(x), Y(y), R(0.052), mc.f, tau * 0.45 + k * 1.3, 'walk', dir) });
    }
    // 앞장선 깃발 · 숫자
    items.push({
      x: hx, y: hy + 0.0001, draw: () => {
        const px = X(hx), py = Y(hy) - R(0.1);
        ctx.strokeStyle = '#6a4a2a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px, Y(hy) - R(0.02));
        ctx.lineTo(px, py - R(0.02));
        ctx.stroke();
        const r = R(0.036);
        ctx.fillStyle = 'rgba(40,20,10,.3)';
        ell(ctx, px + 2, py + 2, r, r);
        ctx.fill();
        ctx.fillStyle = COL[mc.f].main;
        ell(ctx, px, py, r, r);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        font(0.044, 900);
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(cnt), px, py + 1);
      },
    });
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  void t;
}
function drawBrawl(ctx: C2, b: Brawl, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const age = t - b.t0;
  if (age < 0 || age > b.T) return;
  const u = age / b.T, a = u < 0.15 ? u / 0.15 : 1 - Math.max(0, (u - 0.7) / 0.3);
  const x = X(b.x), y = Y(b.y), r = R(0.085) * b.big * (0.8 + 0.3 * Math.sin(u * Math.PI));
  ctx.save();
  ctx.globalAlpha = a;
  for (let q = 0; q < 7; q++) {
    const ang = (q / 7) * TAU + age * 0.15, rr2 = r * (0.55 + 0.25 * Math.sin(age * 0.4 + q));
    ctx.fillStyle = q % 2 ? '#f4e6c8' : '#e6d0a4';
    ell(ctx, x + Math.cos(ang) * rr2 * 0.7, y + Math.sin(ang) * rr2 * 0.35 - r * 0.2, rr2 * 0.6, rr2 * 0.5);
    ctx.fill();
  }
  ctx.fillStyle = '#fff8e8';
  ell(ctx, x, y - r * 0.25, r * 0.55, r * 0.42);
  ctx.fill();
  // 튀어나오는 팔다리 · 별
  for (let q = 0; q < 4; q++) {
    const ang = age * 0.5 + q * 1.7;
    drawSoldier(ctx, x + Math.cos(ang) * r * 0.9, y - r * 0.3 + Math.sin(ang) * r * 0.4, R(0.042), q % 2 ? b.ci : b.cj === NEU ? ME : b.cj, ang * 2, 'fly');
  }
  for (let q = 0; q < 3; q++) {
    const ang = age * 0.3 + (q * TAU) / 3;
    starPath(ctx, x + Math.cos(ang) * r * 0.6, y - r * 0.8 + Math.sin(ang) * r * 0.2, R(0.012));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
  }
  ctx.restore();
}
function drawRulers(ctx: C2, s: FlagState, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const m = s.map;
  // 내 왕: 내 왕관 성 옆
  const hm = m.home[ME];
  if (hm >= 0) {
    const S = castleSize(m, hm), side = m.x[hm] < 0.5 ? 1 : -1;
    const threat = s.phase === 'pick' && s.plans.some((p) => p.b === hm || (p.a >= 0 && s.own[p.b] === ME));
    const face: Face = s.phase === 'result' ? (s.ok ? 'happy' : 'dizzy') : t - vis.joy < 50 ? 'happy' : t - vis.sad < 60 ? 'worry' : threat ? 'worry' : 'idle';
    drawRuler(ctx, X(m.x[hm] + side * S * 0.78), Y(m.y[hm] + 0.02), R(0.05), s.own[hm] === ME ? ME : NEU, face, t, 0);
  }
  // 남작: 적 왕관 성 옆 (무너지면 데굴데굴)
  for (const f of [RED, PUR]) {
    const fh = m.home[f];
    if (fh < 0) continue;
    const S = castleSize(m, fh), side = m.x[fh] < 0.5 ? -1 : 1;
    const lostAge = s.own[fh] !== f ? t - s.flipT[fh] : -1;
    if (lostAge > 90) continue;
    const roll = lostAge >= 0 ? lostAge * 0.25 : 0, dx = lostAge >= 0 ? side * lostAge * 0.0025 : 0;
    const face: Face = lostAge >= 0 ? 'dizzy' : sleepy(s) ? 'idle' : t - vis.joy < 50 ? 'angry' : 'smug';
    ctx.save();
    if (lostAge >= 0) ctx.globalAlpha = clamp((90 - lostAge) / 30, 0, 1);
    drawRuler(ctx, X(m.x[fh] + side * S * 0.8 + dx), Y(m.y[fh] + 0.02), R(0.045), f, face, t, roll);
    ctx.restore();
  }
}
function coinIcon(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = '#b8780e';
  ell(ctx, x, y + r * 0.18, r, r * 0.95);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, '#fff3a0'], [0.5, '#ffcf3a'], [1, '#f0a020']);
  ell(ctx, x, y, r, r * 0.95);
  ctx.fill();
  ctx.strokeStyle = '#9a600a';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, 0);
  ctx.lineTo(-k * 0.12, k * 0.55);
  ctx.quadraticCurveTo(-k * 0.45, k * 0.42, -k * 0.38, k * 0.62);
  ctx.lineTo(-k * 0.12, k * 1.05);
  ctx.quadraticCurveTo(k * 0.1, k * 1.25, k * 0.42, k * 1.05);
  ctx.quadraticCurveTo(k * 0.55, k * 0.75, k * 0.48, k * 0.5);
  ctx.quadraticCurveTo(k * 0.45, k * 0.38, k * 0.32, k * 0.4);
  ctx.quadraticCurveTo(k * 0.3, k * 0.3, k * 0.18, k * 0.32);
  ctx.quadraticCurveTo(k * 0.15, k * 0.24, k * 0.1, k * 0.26);
  ctx.lineTo(k * 0.1, 0);
  ctx.quadraticCurveTo(-k * 0.01, -k * 0.14, -k * 0.12, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawSpot(ctx: C2, s: FlagState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number) {
  if (!s.spot || s.phase !== 'pick' || t - s.spot.t > 220) return;
  const sp = s.spot, a = Math.min(1, (220 - (t - sp.t)) / 30), pul = 1 + 0.05 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 7]);
  ctx.lineDashOffset = -t * 0.8;
  rr(ctx, X(sp.x) - prx, Y(sp.y) - pry, prx * 2, pry * 2, Math.min(prx, pry) * 0.7);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.034, 900);
  const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
  const below = STAGES[s.stage].spotAt >= 0;
  const lx = clamp(X(sp.x), tw / 2 + 4, w - tw / 2 - 4), ly = below ? Math.min(R(MAP_BOT - 0.03), Y(sp.y) + pry + R(0.012)) : Math.max(R(0.115), Y(sp.y) - pry - R(0.012));
  ctx.fillStyle = '#ff5a3a';
  rr(ctx, lx - tw / 2, ly - R(0.023), tw, R(0.046), R(0.023));
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(lab, lx, ly + 1);
  ctx.restore();
}
function drawTop(ctx: C2, s: FlagState, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.96)'], [1, 'rgba(255,240,210,.93)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, cx = R(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, cx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.36));
  const nw = Math.min(R(0.36), ctx.measureText(d.name).width);
  font(0.032, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  ctx.textAlign = 'right';
  font(0.042, 900);
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d88a08';
  ctx.fillText(st, w - R(0.03), cy + 1);
  starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.021));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx2 = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx2, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}
function drawPanel(ctx: C2, s: FlagState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number) {
  const d = STAGES[s.stage], pick = s.phase === 'pick';
  // 차례 판
  const tx = X(0.165), ty = Y(WAIT_BTN[1]);
  ctx.fillStyle = 'rgba(80,40,10,.3)';
  rr(ctx, tx - R(0.135) + 2, ty - R(0.047) + 3, R(0.27), R(0.094), R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, ty - R(0.047), 0, ty + R(0.047), [0, '#fff6e0'], [1, '#f0d8a8']);
  rr(ctx, tx - R(0.135), ty - R(0.047), R(0.27), R(0.094), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2;
  ctx.stroke();
  const left = d.limit - s.turn;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.028, 800);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText('남은 차례', tx, ty - R(0.022));
  font(0.046, 900);
  ctx.fillStyle = left <= 3 ? '#d0402a' : '#4a2a10';
  ctx.fillText(String(left), tx, ty + R(0.018));
  // 기다리기 단추
  const [bx, by, bw, bh] = WAIT_BTN, on = pick && !(s.stage === 0 && s.sends === 0);
  const press = s.my?.a === -1 && s.phase === 'march' && s.pt < 10 ? R(0.006) : 0;
  const x0 = X(bx) - R(bw) / 2, y0 = Y(by) - R(bh) / 2 + press;
  ctx.fillStyle = 'rgba(70,35,5,.35)';
  rr(ctx, x0 + 2, y0 + R(0.012), R(bw), R(bh), R(0.035));
  ctx.fill();
  ctx.fillStyle = on ? lin(ctx, 0, y0, 0, y0 + R(bh), [0, '#7cc8ff'], [1, '#2a7ee8']) : lin(ctx, 0, y0, 0, y0 + R(bh), [0, '#c8c0b0'], [1, '#a09888']);
  rr(ctx, x0, y0, R(bw), R(bh), R(0.035));
  ctx.fill();
  ctx.strokeStyle = on ? '#1a4a9a' : '#7a7060';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  rr(ctx, x0 + R(0.012), y0 + R(0.008), R(bw) - R(0.024), R(bh) * 0.38, R(0.02));
  ctx.fill();
  // 나팔 그림
  const hx = x0 + R(0.07), hy = Y(by) + press;
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(hx - R(0.035), hy - R(0.008));
  ctx.lineTo(hx + R(0.01), hy - R(0.008));
  ctx.lineTo(hx + R(0.035), hy - R(0.026));
  ctx.lineTo(hx + R(0.035), hy + R(0.026));
  ctx.lineTo(hx + R(0.01), hy + R(0.008));
  ctx.lineTo(hx - R(0.035), hy + R(0.008));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#9a6a08';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  ctx.textAlign = 'left';
  ctx.fillText('기다리기', x0 + R(0.12), Y(by) - R(0.012) + press);
  font(0.03, 800);
  ctx.fillStyle = on ? '#e8f4ff' : '#f4f0e8';
  ctx.fillText('내 성 모두 +1', x0 + R(0.12), Y(by) + R(0.026) + press);
  if (on && Math.sin(t * 0.1) > 0.6) {
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    rr(ctx, x0 - 3, y0 - 3, R(bw) + 6, R(bh) + 6, R(0.04));
    ctx.stroke();
  }
  // 별 조건
  const n = d.stars.length, gap = R(0.012), sy = Y(1.39);
  font(n >= 3 ? 0.03 : 0.033, 800);
  const labs = d.stars.map((q) => { const now = starNow(s, q); return q.label + (now.txt ? ` ${now.txt}` : ''); });
  const tws = labs.map((l) => ctx.measureText(l).width + R(0.062)), tot = tws.reduce((a, b) => a + b, 0), room = w - R(0.04) - gap * (n - 1);
  const ks = tot > room ? room / tot : 1;
  let cx = R(0.02) + (tot < room ? (room - tot) / 2 : 0);
  for (let j = 0; j < n; j++) {
    const q = d.stars[j], cw = tws[j] * ks;
    if (j) cx += tws[j - 1] * ks + gap;
    const now = starNow(s, q), done = s.phase === 'result' && s.ok ? s.starOk[j] : now.ok === true, bad = now.ok === false;
    ctx.fillStyle = done ? '#ffe27a' : bad ? 'rgba(90,50,20,.25)' : 'rgba(255,248,228,.92)';
    rr(ctx, cx, sy - R(0.024), cw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = done ? '#b07808' : 'rgba(110,60,20,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    starPath(ctx, cx + R(0.026), sy, R(0.014));
    ctx.fillStyle = done ? '#ffb000' : 'rgba(255,255,255,.95)';
    ctx.fill();
    ctx.strokeStyle = '#9a6a20';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = bad ? 'rgba(80,50,20,.55)' : '#4a2a10';
    ctx.textAlign = 'left';
    ctx.fillText(labs[j], cx + R(0.046), sy + 1, cw - R(0.052));
  }
  // 안내 한 줄
  let hint = '';
  if (s.phase === 'pick') {
    if (s.stage === 0 && s.sends === 0) hint = s.sel < 0 ? '👆 내 성을 톡, 그다음 옆 성을 톡!' : '👆 빛나는 화살표 끝의 성을 톡!';
    else if (s.sel >= 0) hint = '갈 성을 톡! (같은 성을 다시 톡 = 취소)';
    else if (s.plans.some((p) => p.a >= 0)) hint = '빨간 화살표 = 적의 다음 수 · 내 행렬과 같이 출발해요';
    else if (sleepy(s)) hint = '잠꾸러기 성은 병사가 안 늘어요 — 지금이 기회!';
    else hint = d.hint;
  } else if (s.phase === 'march') hint = s.my?.a === -1 ? '나팔 소리! 내 성마다 병사가 모여요' : '행진! 성문에서 병사 수끼리 빼기';
  else hint = s.ok ? '톡 하면 다음 판' : s.hearts > 0 ? '톡 하면 같은 판 다시' : '';
  font(0.034, 800);
  ctx.fillStyle = '#fff8e8';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(90,45,10,.55)';
  ctx.strokeText(hint, w / 2, Y(1.455), w - R(0.04));
  ctx.fillText(hint, w / 2, Y(1.455), w - R(0.04));
}
function drawBanner(ctx: C2, s: FlagState, fx: ReturnType<typeof juice>, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, t: number) {
  const d = STAGES[s.stage];
  let head = '', sub = '', a = 0, age = 0, cy = R(0.62);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, Math.max(0, (age - 20) / 8));
    cy = R(s.ok ? 0.68 : 0.66);
    if (s.ok) head = s.won ? '모든 땅을 차지했다!' : `${d.foe} 함락!`;
    else (head = s.why.includes('본성') ? '으앗, 왕관 성을 빼앗겼다…' : '해가 졌어요…'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 같은 판 다시` : '하트가 없어요 — 끝');
  } else if (s.banner && s.phase === 'pick' && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (!head || a <= 0) return;
  const pop = Math.min(1, 0.5 + age / 10);
  ctx.save();
  ctx.globalAlpha = a;
  font(0.052, 900);
  const w1 = ctx.measureText(head).width;
  font(0.034, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const okRes = s.phase === 'result' && s.ok;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.21) : sub ? R(0.15) : R(0.09)) * pop;
  ctx.translate(w / 2, cy);
  ctx.fillStyle = 'rgba(60,30,10,.3)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#3d9df5';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo((sd * cw) / 2, -ch * 0.25);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), -ch * 0.3);
    ctx.lineTo(sd * (cw / 2 + R(0.02)), 0);
    ctx.lineTo(sd * (cw / 2 + R(0.035)), ch * 0.3);
    ctx.lineTo((sd * cw) / 2, ch * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.052, 900);
  ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#2a5a9a';
  if (okRes) {
    ctx.fillText(head, 0, -R(0.06), w - R(0.1));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (36 + j * 14);
      const sx = (j - (nS - 1) / 2) * R(0.09);
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, 0, R(0.036) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy, '#ffd23a', 16, 3, 2.4);
    }
    font(0.034, 800);
    ctx.fillStyle = '#9a5a08';
    const miss = d.stars.find((_q, j) => !s.starOk[j]);
    ctx.fillText(miss ? `다음엔: ${miss.label}` : '별 모두 받았다!', 0, R(0.062), w - R(0.12));
  } else {
    ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.034, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
      ctx.fillText(sub, 0, R(0.035), w - R(0.1));
    }
  }
  ctx.restore();
}
