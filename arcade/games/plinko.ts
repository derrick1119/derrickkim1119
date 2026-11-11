/**
 * 🪀 핀 떨구기 (23라운드: 완전히 다른 장르) — 핀 떨구기 × 가리키기 × 곱하기.
 * 기준 9(손이 하는 일은 하나): 아무 줄이나 톡 = 그 줄 맨 위에서 햄스터 공 떨구기. 키보드는 ← → 로 줄을 고르고 스페이스.
 * 물리 없음(결정적 칸 규칙): 핀은 격자에 있고, 공은 한 칸씩 내려온다. 빈 칸은 곧장 아래로.
 *   ◀▶ 핀 = 공을 화살표 쪽 아래 칸으로 보내고, 공이 지나가면 방향이 뒤집힌다(토글).
 *   ✳ 갈라짐 핀 = 공이 양쪽 아래로 둘이 된다(마름모로 놓인 두 갈라짐 핀은 하나를 넷으로).
 *   🕳 구멍 = 공이 사라진다. 🍄 범퍼 = 화살표 쪽 위 칸으로 튕겨 올리고(+1) 뒤집힌다. 🧱 막힌 칸·벽 = 못 들어가고 반대쪽으로 튕긴다.
 *   🔑 열쇠 = 지나가면 🏆 황금 컵의 뚜껑(문)이 열린다. 🔄 뒤집개 = 지나가면 판의 모든 화살표가 한꺼번에 뒤집힌다.
 * 와우: 공이 지나간 핀은 뒤집혀서, 같은 줄에 떨궈도 다음 공은 다른 길로 간다 — 떨구는 순서가 수다.
 * 읽힘: 떨구기 전에 줄마다 '지금 떨구면 동전 몇 개'(+2 · 🏆 · 🕳)가 위에 뜨고, 고른 줄은 공이 갈 길을 점선으로 보여 준다
 *   (시뮬레이션과 같은 함수로 돌린 결정적 예상 — 실제와 똑같다).
 * 판: 공 N개로 동전 목표를 채우면 통과. 별: ★ 목표 · ★ 공 K개 남기고 · ★ 🏆 황금 컵. 공을 다 써도 못 채우면 하트 -1, 같은 판을 처음부터.
 *   하트 셋을 다 잃거나 8판을 마치면 끝. 목표는 '아무렇게나 떨궈 본' 결과의 분포로 정한다(1판은 아무 데나 떨궈도 통과, 2판은 절반쯤).
 * 펼쳐짐(하는 일이 바뀐다): 1 뒤집히는 핀·동전 컵·황금 컵 → 2 갈라짐(불리기) → 3 구멍(피하기) → 4 범퍼(위로 튕겨 다시 지나기)
 *   → 5 막힌 칸(벽에 튕겨 돌리기) → 6 움직이는 🎯 컵(언제 떨굴지) → 7 열쇠·문(먼저 열기) → 8 뒤집개(판 전체 뒤집기).
 * 웃음(기준 10): 공은 햄스터 볼 — 핀을 지날수록 어질어질 '빙글빙글', 갈라짐 핀에선 햄스터가 둘로 나뉘어 서로 "어?!",
 *   구멍에 빠지면 '으아~' 하고 아래 파이프에서 '뿅!' 튀어나와 데굴데굴, 컵에 들어가면 아래 햄스터 가족이 '만세!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.37;
export const COLS = 7, ROWS = 7, NC = COLS * ROWS;
/** 칸 종류 */
export const EMPTY = 0, ARROW = 1, SPLIT = 2, HOLE = 3, BUMP = 4, BLOCK = 5, KEY = 6, DOOR = 7, FLIP = 8;
/** 컵 값: 0~3 = 동전 수, GOLD = 🏆 황금 컵 */
export const GOLD = 9;
/** 공이 한 칸 가는 틱 · 한 공이 움직일 수 있는 최대 칸 수(뱅뱅 돌면 어질어질 퇴장) */
const STEP = 8, MAXMOVE = 40;
const CUP_PTS = 5, GOLD_PTS = 3, BUMP_PTS = 1, STAR_PTS = 100, WIN_PTS = 100;
const RESULT = 175, END_WAIT = 30;

export interface Cup { lo: number; hi: number; beat: number; ph: number }
export interface Board { k: Int8Array; d: Int8Array; lid: Uint8Array; pot: Int8Array; cup: Cup | null; t0: number }
/** how: 0 곧장 · 1 핀에 맞아 옆으로 · 2 범퍼로 위로 · 3 벽에 튕김 · 4 갈라짐 */
export interface Ball { id: number; r: number; c: number; nr: number; nc: number; pr: number; pc: number; alive: boolean; moves: number; how: number; twin: number }
export interface Tally { coins: number; gold: number; cup: number; lost: number; bump: number; land: number; most: number; key: number }
/** 시뮬레이션이 남기는 사건 (연출용) */
export interface Hap { k: number; r: number; c: number; v: number; id: number }
const H_FLIP = 1, H_SPLIT = 2, H_HOLE = 3, H_BUMP = 4, H_WALL = 5, H_KEY = 6, H_ALL = 7, H_LAND = 8, H_STUCK = 9;

const tz = (): Tally => ({ coins: 0, gold: 0, cup: 0, lost: 0, bump: 0, land: 0, most: 1, key: 0 });
export const cp = (B: Board): Board => ({ k: B.k.slice(), d: B.d.slice(), lid: B.lid.slice(), pot: B.pot, cup: B.cup, t0: B.t0 });

/** 움직이는 🎯 컵의 자리 (판 시작부터 rel틱 뒤): 박자마다 한 칸씩 좌우로 왕복 */
export function cupAt(cup: Cup, rel: number) {
  const n = cup.hi - cup.lo;
  if (n <= 0) return cup.lo;
  const m = (Math.floor(Math.max(0, rel) / cup.beat) + cup.ph) % (2 * n);
  return cup.lo + (m <= n ? m : 2 * n - m);
}

function blocked(B: Board, r: number, c: number) {
  if (c < 0 || c >= COLS || r < 0) return true;
  if (r >= ROWS) return B.lid[c] === 1;
  const k = B.k[r * COLS + c];
  return k === BLOCK || k === DOOR;
}
/** 가려는 칸이 막혔으면(벽·막힌 칸·문) 반대쪽으로 튕긴다. 둘 다 막혔으면 -99 (끼임) */
function aim(B: Board, r: number, c2: number, c: number) {
  if (!blocked(B, r, c2)) return c2;
  if (c2 !== c) {
    const m = 2 * c - c2;
    if (!blocked(B, r, m)) return m;
  }
  return -99;
}

const newBall = (id: number, col: number): Ball => ({ id, r: -1, c: col, nr: 0, nc: col, pr: -1, pc: col, alive: true, moves: 0, how: 0, twin: -1 });

/** 공이 칸 (r,c)에 막 도착했다: 칸 규칙으로 다음 칸을 정하고, 칸을 바꾼다(뒤집기·문 열기). 게임과 미리 보기·봇이 같은 함수를 쓴다 */
function arrive(B: Board, b: Ball, tick: number, T: Tally, H: Hap[] | null, balls: Ball[], nid: { n: number }) {
  const r = b.r, c = b.c;
  if (r >= ROWS) {
    b.alive = false;
    T.land++;
    let v: number;
    if (B.cup && cupAt(B.cup, tick - B.t0) === c) (v = CUP_PTS), T.cup++, H?.push({ k: H_LAND, r, c, v: -2, id: b.id });
    else if (B.pot[c] === GOLD) (v = GOLD_PTS), T.gold++, H?.push({ k: H_LAND, r, c, v: -1, id: b.id });
    else (v = B.pot[c]), H?.push({ k: H_LAND, r, c, v, id: b.id });
    T.coins += v;
    return;
  }
  if (++b.moves > MAXMOVE) {
    b.alive = false;
    T.lost++;
    H?.push({ k: H_STUCK, r, c, v: 0, id: b.id });
    return;
  }
  const i = r * COLS + c, k = B.k[i];
  let nr = r + 1, nc = c, how = 0;
  if (k === ARROW) {
    const d = B.d[i];
    nc = aim(B, nr, c + d, c);
    how = nc === c + d ? 1 : 3;
    B.d[i] = -d;
    H?.push({ k: H_FLIP, r, c, v: -d, id: b.id });
    if (how === 3 && nc > -99) H?.push({ k: H_WALL, r, c: c + d, v: 0, id: b.id });
  } else if (k === SPLIT) {
    const L = aim(B, nr, c - 1, c), R = aim(B, nr, c + 1, c);
    how = 4;
    if (L > -99 && R > -99 && L !== R) {
      const tw: Ball = { id: nid.n++, r, c, nr, nc: R, pr: r, pc: c, alive: true, moves: b.moves, how: 4, twin: b.id };
      balls.push(tw);
      b.twin = tw.id;
    }
    nc = L > -99 ? L : R;
    H?.push({ k: H_SPLIT, r, c, v: 0, id: b.id });
  } else if (k === HOLE) {
    b.alive = false;
    T.lost++;
    H?.push({ k: H_HOLE, r, c, v: 0, id: b.id });
    return;
  } else if (k === BUMP) {
    const d = B.d[i];
    nr = r - 1;
    nc = aim(B, nr, c + d, c);
    how = 2;
    B.d[i] = -d;
    T.bump++;
    T.coins += BUMP_PTS;
    H?.push({ k: H_BUMP, r, c, v: -d, id: b.id });
  } else if (k === KEY) {
    for (let j = 0; j < NC; j++) if (B.k[j] === DOOR) B.k[j] = EMPTY;
    B.lid.fill(0);
    B.k[i] = EMPTY;
    T.key++;
    H?.push({ k: H_KEY, r, c, v: 0, id: b.id });
  } else if (k === FLIP) {
    for (let j = 0; j < NC; j++) if (B.k[j] === ARROW || B.k[j] === BUMP) B.d[j] = -B.d[j];
    H?.push({ k: H_ALL, r, c, v: 0, id: b.id });
  } else if (k === BLOCK || k === DOOR) nc = -99;
  if (how === 0 && nc > -99) nc = aim(B, nr, c, c);
  if (nc <= -99) {
    b.alive = false;
    T.lost++;
    H?.push({ k: H_STUCK, r, c, v: 0, id: b.id });
    return;
  }
  b.nr = nr;
  b.nc = nc;
  b.how = how;
}

/** 모든 공이 한 칸씩 (같은 박자에, 공 번호 순서로) */
function advance(B: Board, balls: Ball[], tick: number, T: Tally, H: Hap[] | null, nid: { n: number }, seg: number[] | null) {
  const n = balls.length;
  for (let j = 0; j < n; j++) {
    const b = balls[j];
    if (!b.alive) continue;
    b.pr = b.r;
    b.pc = b.c;
    b.r = b.nr;
    b.c = b.nc;
    seg?.push(b.pr, b.pc, b.r, b.c);
    arrive(B, b, tick, T, H, balls, nid);
  }
}

/** 공 하나를 t0에 떨궈 끝까지 (B를 바꾼다). 끝난 틱을 돌려준다 */
export function simDrop(B: Board, col: number, t0: number, T: Tally, seg: number[] | null = null): number {
  let balls = [newBall(0, col)];
  const nid = { n: 1 };
  let tick = t0;
  for (let g = 0; g < 200 && balls.length; g++) {
    tick += STEP;
    advance(B, balls, tick, T, null, nid, seg);
    balls = balls.filter((b) => b.alive);
    if (balls.length > T.most) T.most = balls.length;
  }
  return tick;
}

// 화면 배치 (가로 0~1, 세로 0~A): 위 띠 · 목표판 · 줄 숫자 · 핀 판(7×7) · 컵 · 바닥(햄스터 가족) · 아래 안내
const CW = 0.122, X0 = 0.5 - (COLS / 2) * CW, RY0 = 0.318, RH = 0.092, BR = 0.04;
const CX = (c: number) => X0 + (c + 0.5) * CW;
const RY = (r: number) => RY0 + r * RH;
const colAt = (x: number) => Math.max(0, Math.min(COLS - 1, Math.floor((x - X0) / CW)));
const CHIP_Y = 0.164, DROP_Y = 0.234, POT_Y = RY(ROWS) + 0.004, FLOOR_Y = POT_Y + 0.118;

// ───────────────────────────── 판 ─────────────────────────────
interface StageDef {
  title: string; balls: number; keep: number; pass: number; min: number;
  arrows: number; splits: number; holes: number; bumps: number; blocks: number; key: boolean; cup: boolean; flip: boolean; pots: string;
}
/** 판 8개. pass = 아무렇게나 떨군 사람이 통과할 몫(목표를 이걸로 정한다). pots: 아래 컵 값(G = 🏆) */
export const STAGES: StageDef[] = [
  { title: '뒤집히는 핀', balls: 5, keep: 2, pass: 1, min: 5, arrows: 9, splits: 0, holes: 0, bumps: 0, blocks: 0, key: false, cup: false, flip: false, pots: 'G111211' },
  { title: '갈라짐 핀', balls: 5, keep: 1, pass: 0.58, min: 8, arrows: 6, splits: 2, holes: 0, bumps: 0, blocks: 0, key: false, cup: false, flip: false, pots: 'G102312' },
  { title: '구멍', balls: 5, keep: 1, pass: 0.33, min: 9, arrows: 6, splits: 2, holes: 2, bumps: 0, blocks: 0, key: false, cup: false, flip: false, pots: 'G102312' },
  { title: '범퍼', balls: 5, keep: 1, pass: 0.3, min: 10, arrows: 6, splits: 2, holes: 1, bumps: 2, blocks: 0, key: false, cup: false, flip: false, pots: 'G102312' },
  { title: '막힌 칸', balls: 5, keep: 1, pass: 0.28, min: 10, arrows: 6, splits: 2, holes: 1, bumps: 1, blocks: 3, key: false, cup: false, flip: false, pots: 'G102312' },
  { title: '움직이는 🎯 컵', balls: 5, keep: 1, pass: 0.25, min: 11, arrows: 6, splits: 2, holes: 1, bumps: 1, blocks: 1, key: false, cup: true, flip: false, pots: 'G102302' },
  { title: '열쇠와 문', balls: 6, keep: 1, pass: 0.25, min: 12, arrows: 6, splits: 2, holes: 1, bumps: 1, blocks: 1, key: true, cup: false, flip: false, pots: 'G102312' },
  { title: '뒤집개', balls: 6, keep: 1, pass: 0.2, min: 13, arrows: 7, splits: 2, holes: 1, bumps: 1, blocks: 1, key: true, cup: true, flip: true, pots: 'G102302' },
];
export const STAGE_COUNT = STAGES.length;

export function layout(sd: StageDef, rng: Rng): Board {
  const k = new Int8Array(NC), d = new Int8Array(NC), lid = new Uint8Array(COLS), pot = new Int8Array(COLS), res = new Uint8Array(NC);
  const rest = sd.pots.replace('G', '').split('').map(Number);
  for (let j = rest.length - 1; j > 0; j--) {
    const q = Math.floor(rng() * (j + 1));
    [rest[j], rest[q]] = [rest[q], rest[j]];
  }
  const gc = [0, 1, 2, 4, 5, 6][Math.floor(rng() * 6)];
  for (let c = 0, q = 0; c < COLS; c++) pot[c] = c === gc ? GOLD : rest[q++];
  const dir = () => (rng() < 0.5 ? -1 : 1);
  const at = (r: number, c: number) => (r < 0 || r >= ROWS || c < 0 || c >= COLS ? -1 : k[r * COLS + c]);
  const free = (r0: number, r1: number, c0: number, c1: number, ok: (r: number, c: number) => boolean = () => true) => {
    for (let n = 0; n < 80; n++) {
      const r = r0 + Math.floor(rng() * (r1 - r0 + 1)), c = c0 + Math.floor(rng() * (c1 - c0 + 1));
      if (k[r * COLS + c] === EMPTY && !res[r * COLS + c] && ok(r, c)) return r * COLS + c;
    }
    return -1;
  };
  let arrows = sd.arrows;
  // 🏆 문지기: 황금 컵 바로 위 핀은 공을 옆으로 비키게 하고, 양옆 핀은 처음에 바깥을 본다 —
  // 문지기 핀을 한 번 뒤집어 놓아야 다음 공이 🏆에 들어간다 (떨구는 순서가 수)
  for (let cc = gc - 1; cc <= gc + 1; cc++) {
    if (cc < 0 || cc >= COLS) continue;
    const i = (ROWS - 1) * COLS + cc;
    k[i] = ARROW;
    d[i] = cc < gc ? -1 : cc > gc ? 1 : dir();
    arrows--;
  }
  // 갈라짐 마름모(하나 → 넷): 갈라짐 · 안쪽을 보는 화살표 둘 · 갈라짐 · 화살표 둘
  let splits = sd.splits;
  if (splits >= 2) {
    const r = Math.floor(rng() * 2), c = 2 + Math.floor(rng() * 3);
    k[r * COLS + c] = SPLIT;
    k[(r + 1) * COLS + c - 1] = ARROW, d[(r + 1) * COLS + c - 1] = 1;
    k[(r + 1) * COLS + c + 1] = ARROW, d[(r + 1) * COLS + c + 1] = -1;
    k[(r + 2) * COLS + c] = SPLIT;
    k[(r + 3) * COLS + c - 1] = ARROW, d[(r + 3) * COLS + c - 1] = dir();
    k[(r + 3) * COLS + c + 1] = ARROW, d[(r + 3) * COLS + c + 1] = dir();
    splits -= 2;
    arrows -= 4;
  }
  for (let n = 0; n < splits; n++) {
    const i = free(1, ROWS - 2, 1, COLS - 2);
    if (i >= 0) k[i] = SPLIT;
  }
  for (let n = 0; n < sd.holes; n++) {
    const i = free(2, ROWS - 1, 0, COLS - 1, (r, c) => at(r - 1, c) !== SPLIT);
    if (i >= 0) k[i] = HOLE;
  }
  // 범퍼: 튕겨 올라갈 위 대각선 두 칸은 비워 둔다 (위로 통 튀었다가 범퍼 옆 줄로 떨어진다 — 뱅뱅 도는 일 없게)
  const emptyAt = (r: number, c: number) => at(r, c) === EMPTY || at(r, c) === -1;
  for (let n = 0; n < sd.bumps; n++) {
    const i = free(3, ROWS - 1, 0, COLS - 1, (r, c) => at(r, c - 1) !== BUMP && at(r, c + 1) !== BUMP && emptyAt(r - 1, c - 1) && emptyAt(r - 1, c + 1) && at(r - 1, c) !== BUMP);
    if (i < 0) continue;
    const r = Math.floor(i / COLS), c = i % COLS;
    k[i] = BUMP;
    d[i] = dir();
    for (const cc of [c - 1, c + 1]) if (cc >= 0 && cc < COLS) res[(r - 1) * COLS + cc] = 1;
  }
  if (sd.key) {
    const i = free(1, 4, 0, COLS - 1);
    if (i >= 0) k[i] = KEY;
    lid[gc] = 1;
  }
  if (sd.flip) {
    const i = free(1, 4, 1, COLS - 2);
    if (i >= 0) k[i] = FLIP;
  }
  for (let n = 0; n < Math.max(0, arrows); n++) {
    const i = free(0, ROWS - 1, 0, COLS - 1, (r, c) => (r + c) % 2 === 0 || rng() < 0.3);
    if (i >= 0) (k[i] = ARROW), (d[i] = dir());
  }
  // 막힌 칸: 바로 위 칸이 공을 곧장 떨어뜨리지 않는 핀일 때만 (곧장 떨어져 끼는 일 없게)
  const solid = (r: number, c: number) => {
    const q = at(r, c);
    return q === ARROW || q === SPLIT || q === HOLE || q === BUMP;
  };
  for (let n = 0; n < sd.blocks; n++) {
    const i = free(1, ROWS - 1, 0, COLS - 1, (r, c) => solid(r - 1, c) && at(r, c - 1) !== BLOCK && at(r, c + 1) !== BLOCK);
    if (i >= 0) k[i] = BLOCK;
  }
  // 뚜껑 덮인 황금 컵 바로 위가 빈 칸이면 화살표를 놓는다 (곧장 떨어져 끼지 않게)
  if (sd.key && !solid(ROWS - 1, gc) && at(ROWS - 1, gc) !== BLOCK) {
    k[(ROWS - 1) * COLS + gc] = ARROW;
    d[(ROWS - 1) * COLS + gc] = gc < COLS / 2 ? 1 : -1;
  }
  const cup = sd.cup ? { lo: 1 + Math.floor(rng() * 3), hi: 0, beat: 42, ph: Math.floor(rng() * 4) } : null;
  if (cup) cup.hi = cup.lo + 2;
  return { k, d, lid, pot, cup, t0: 0 };
}

// ───────────────────────────── 내다보기 (봇·판 고르기) ─────────────────────────────
interface Goal { goal: number; keep: number }
/** 판이 끝났을 때의 값: 통과면 별이 중심, 실패면 크게 음수 */
function finalVal(coins: number, left: number, gold: number, G: Goal) {
  if (coins >= G.goal) return (1 + (left >= G.keep ? 1 : 0) + (gold > 0 ? 1 : 0)) * 1000 + left * 40 + coins;
  return -5000 + coins * 20;
}
/** 욕심쟁이로 끝까지: 매번 지금 가장 동전이 많은 줄 (황금 컵은 아직이면 크게 친다) */
function rollout(B0: Board, coins: number, gold: number, left: number, t: number, G: Goal): number {
  let B = B0;
  while (left > 0 && coins < G.goal) {
    let bv = -1e9, bB: Board = B, bT = tz(), bEnd = t;
    for (let c = 0; c < COLS; c++) {
      const B2 = cp(B), T = tz(), end = simDrop(B2, c, t, T);
      const v = T.coins + (!gold ? (T.gold ? 30 : T.key ? 12 : 0) : 0) - T.lost * 0.5;
      if (v > bv) (bv = v), (bB = B2), (bT = T), (bEnd = end);
    }
    B = bB;
    coins += bT.coins;
    gold += bT.gold;
    left--;
    t = bEnd + 3;
  }
  return finalVal(coins, left, gold, G);
}
/** 깊이 depth까지 다 해 보고 그 뒤는 욕심쟁이로. 첫 수는 waits(틱)만큼 기다렸다 떨굴 수도 있다 */
function search(B: Board, coins: number, gold: number, left: number, t: number, G: Goal, depth: number, waits: number[]): { v: number; col: number; w: number } {
  let best = { v: -1e9, col: 0, w: 0 };
  for (const w of waits)
    for (let c = 0; c < COLS; c++) {
      const B2 = cp(B), T = tz(), end = simDrop(B2, c, t + w, T);
      const c2 = coins + T.coins, g2 = gold + T.gold, l2 = left - 1;
      let v: number;
      if (c2 >= G.goal || l2 <= 0) v = finalVal(c2, l2, g2, G);
      else if (depth > 1) v = search(B2, c2, g2, l2, end + 3, G, depth - 1, [0]).v;
      else v = rollout(B2, c2, g2, l2, end + 3, G);
      v -= w * 0.01;
      if (v > best.v) best = { v, col: c, w };
    }
  return best;
}
/** 판 하나를 처음부터 끝까지 내다보는 봇으로 (판 고르기 확인용) — 받은 별 */
function planStars(B0: Board, balls: number, G: Goal): number {
  let B = cp(B0), coins = 0, gold = 0, left = balls, t = 30;
  const waits = B.cup ? [0, 21, 42, 63, 84, 105] : [0];
  while (left > 0 && coins < G.goal) {
    const m = search(B, coins, gold, left, t, G, 1, waits), T = tz();
    t = simDrop(B, m.col, t + m.w, T) + 3;
    coins += T.coins;
    gold += T.gold;
    left--;
  }
  if (coins < G.goal) return 0;
  return 1 + (left >= G.keep ? 1 : 0) + (gold > 0 ? 1 : 0);
}
/** 욕심쟁이(지금 숫자가 제일 큰 줄만 고르는 사람)가 받는 별 */
function greedyStars(B0: Board, balls: number, G: Goal): number {
  let B = cp(B0), coins = 0, gold = 0, left = balls, t = 30;
  while (left > 0 && coins < G.goal) {
    let bv = -1e9, bB = B, bT = tz(), bEnd = t;
    for (let c = 0; c < COLS; c++) {
      const B2 = cp(B), T = tz(), end = simDrop(B2, c, t, T);
      if (T.coins > bv) (bv = T.coins), (bB = B2), (bT = T), (bEnd = end);
    }
    B = bB;
    coins += bT.coins;
    gold += bT.gold;
    left--;
    t = bEnd + 3;
  }
  if (coins < G.goal) return 0;
  return 1 + (left >= G.keep ? 1 : 0) + (gold > 0 ? 1 : 0);
}
/** 아무렇게나 떨군 사람(무작위 줄·무작위 때): 공마다 쌓인 동전 · 처음 🏆에 넣은 공 번호 */
export function randomRuns(B0: Board, balls: number, rng: Rng, M: number): { cum: number[]; gold: number }[] {
  const out: { cum: number[]; gold: number }[] = [];
  for (let m = 0; m < M; m++) {
    const B = cp(B0), cum: number[] = [];
    let coins = 0, gold = 99, t = 40 + Math.floor(rng() * 60);
    for (let j = 0; j < balls; j++) {
      const T = tz();
      t = simDrop(B, colAt(rng()), t, T) + 10 + Math.floor(rng() * 70);
      coins += T.coins;
      cum.push(coins);
      if (T.gold && gold > j) gold = j;
    }
    out.push({ cum, gold });
  }
  return out;
}

/** 🏆에 공이 닿으려면 최소 몇 번 떨궈야 하나 (max까지만 본다, 못 닿으면 max+1) */
export function goldDepth(B: Board, max: number, t = 30): number {
  if (max <= 0) return 1;
  let best = max + 1;
  for (let c = 0; c < COLS && best > 1; c++) {
    const B2 = cp(B), T = tz(), end = simDrop(B2, c, t, T);
    if (T.gold) return 1;
    if (max > 1) best = Math.min(best, 1 + goldDepth(B2, Math.min(max, best - 1) - 1, end + 3));
  }
  return best;
}

const LAYOUTS = new Map<string, { B: Board; goal: number }>();
/** 판 구성 (같은 시드·같은 판이면 같은 판 — 다시 해도 같다). 후보 몇 개 중에서
 *  ① 목표 = 아무렇게나 떨군 결과에서 통과 몫이 pass에 가장 가까운 값 ② 내다보는 봇은 ★★★ ③ 욕심쟁이는 ★★★가 아닌 판을 고른다 */
export function stageLayout(seed: number, stage: number) {
  const key = `${seed}:${stage}`;
  const hit = LAYOUTS.get(key);
  if (hit) return hit;
  const sd = STAGES[stage];
  let pick: { B: Board; goal: number; sc: number } | null = null;
  for (let att = 0; att < 16; att++) {
    const rng = mulberry32((seed * 2654435761 + stage * 97 + att * 7919 + 13) >>> 0);
    const B = layout(sd, rng);
    const runs = randomRuns(B, sd.balls, rng, 60), tot = runs.map((q) => q.cum[q.cum.length - 1]).sort((a, b) => a - b);
    const pr = (g: number) => tot.filter((x) => x >= g).length / tot.length;
    let goal = sd.min, gap = 9;
    for (let g = sd.min; g <= Math.max(sd.min, tot[tot.length - 1]); g++) {
      const e = Math.abs(pr(g) - sd.pass);
      if (e <= gap) (gap = e), (goal = g);
    }
    if (sd.pass >= 1) goal = sd.min;
    const G = { goal, keep: sd.keep }, st = planStars(B, sd.balls, G), gr = stage === 0 ? 0 : greedyStars(B, sd.balls, G);
    // 🏆은 처음엔 어느 줄에서도 안 닿는다 — 핀을 먼저 뒤집어 길을 열어야 한다(떨구는 순서가 수)
    const gd = goldDepth(B, 3), want = stage === 0 ? gd === 2 : gd >= 2 && gd <= 3;
    // 별 ★2·★3은 골라야 받게: 아무렇게나 떨군 사람이 공을 남기거나 🏆에 넣는 몫
    const endAt = (q: { cum: number[] }) => {
      const j = q.cum.findIndex((x) => x >= goal);
      return j < 0 ? 99 : j;
    };
    const rKeep = runs.filter((q) => endAt(q) <= sd.balls - 1 - sd.keep).length / runs.length;
    const rGold = runs.filter((q) => q.gold <= Math.min(endAt(q), sd.balls - 1)).length / runs.length;
    const luck = Math.max(0, rKeep - 0.3) + Math.max(0, rGold - 0.25);
    const sc = -100 * (3 - st) - gap * 20 - (gr >= 3 ? 4 : 0) - (gd <= 1 ? 40 : want ? 0 : 6) - luck * 30 - (stage === 0 && pr(goal) < 0.97 ? 50 : 0);
    if (!pick || sc > pick.sc) pick = { B, goal, sc };
    if (st >= 3 && gap < 0.12 && gr < 3 && want && luck < 0.05) break;
  }
  const out = { B: pick!.B, goal: pick!.goal };
  LAYOUTS.set(key, out);
  if (LAYOUTS.size > 600) LAYOUTS.delete(LAYOUTS.keys().next().value!);
  return out;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Gone { kind: 'land' | 'hole' | 'stuck'; r: number; c: number; v: number; t: number; id: number }
export interface PState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  B: Board; goal: number; balls: Ball[]; fall: { t0: number; last: number } | null; nid: { n: number };
  left: number; T: Tally; endAt: number; drops: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; won: boolean; dead: boolean;
  down: boolean; cx: number; kbd: boolean;
  seen: Set<string>; news: { text: string; t: number }[]; events: Ev[]; gone: Gone[]; flipT: Int32Array;
  /** 연출: 마지막으로 컵에 들어간 때·값 (햄스터 가족 만세) · 구멍에 빠진 때 */
  cheer: { t: number; v: number; c: number }; gasp: number; split: number; splitN: number;
}

const ev = (s: PState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: PState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news.push({ text, t: -1 });
}

function newStage(s: PState) {
  const L = stageLayout(s.seed, s.stage), sd = STAGES[s.stage];
  s.B = cp(L.B);
  s.B.t0 = s.t;
  s.goal = L.goal;
  s.balls = [];
  s.fall = null;
  s.left = sd.balls;
  s.T = tz();
  s.endAt = 0;
  s.drops = 0;
  s.phase = 'play';
  s.pt = 0;
  s.flipT.fill(-999);
  const has = (q: number) => s.B.k.includes(q);
  see(s, 'arrow', '◀▶ 핀 — 공은 화살표 쪽으로 가요');
  see(s, 'gold', '🏆 황금 컵에 넣으면 별 하나 더!');
  if (has(SPLIT)) see(s, 'split', '✳ 갈라짐 핀 — 공이 둘로! 둘이 넷으로!');
  if (has(HOLE)) see(s, 'hole', '🕳 구멍 — 빠진 공은 사라져요');
  if (has(BUMP)) see(s, 'bump', '🍄 범퍼 — 화살표 쪽 위로 튕겨요 (+1)');
  if (has(BLOCK)) see(s, 'block', '🧱 막힌 칸 — 부딪히면 반대쪽으로 튕겨요');
  if (s.B.cup) see(s, 'cup', '🎯 움직이는 컵 — 박자 맞춰 들어가면 +5');
  if (has(KEY)) see(s, 'key', '🔑 열쇠 칸을 지나가면 🏆 문이 열려요');
  if (has(FLIP)) see(s, 'flip', '🔄 뒤집개 — 지나가면 판의 화살표가 전부 뒤집혀요');
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 — ${sd.title}`);
}

function drop(s: PState, col: number) {
  s.left--;
  s.drops++;
  s.balls = [newBall(s.nid.n++, col)];
  s.fall = { t0: s.t, last: s.t };
  ev(s, 'drop', CX(col), DROP_Y, undefined, undefined, col);
}

/** 시뮬레이션 사건 → 연출 사건 */
function react(s: PState, h: Hap) {
  const x = CX(h.c), y = RY(h.r);
  if (h.k === H_FLIP) {
    s.flipT[h.r * COLS + h.c] = s.t;
    ev(s, 'flip', x, y, undefined, undefined, h.v);
    if (s.drops >= 1 && !s.seen.has('toggle')) see(s, 'toggle', '공이 지나간 핀은 ◀▶가 뒤집혀요 — 다음 공은 다른 길로!');
  } else if (h.k === H_SPLIT) {
    const n = s.balls.filter((b) => b.alive).length;
    // 같은 박자에 같은 갈라짐 핀을 지난 공이 여럿이면 한 번만 외친다
    if (s.split === s.t && s.events.some((e) => e.kind === 'split' && e.t === s.t && e.x === x)) return;
    if (s.split !== s.t) s.splitN = n;
    s.split = s.t;
    ev(s, 'split', x, y, n >= 4 ? '넷으로!' : n >= 3 ? '셋으로!' : '둘로!', '#aef6ff', n);
  } else if (h.k === H_HOLE) {
    s.gone.push({ kind: 'hole', r: h.r, c: h.c, v: 0, t: s.t, id: h.id });
    s.gasp = s.t;
    ev(s, 'hole', x, y, '으아~', '#ffd0e0');
  } else if (h.k === H_BUMP) {
    s.flipT[h.r * COLS + h.c] = s.t;
    ev(s, 'bump', x, y, '띠용! +1', '#ffe066');
  } else if (h.k === H_WALL) ev(s, 'wall', CX(Math.max(-0.45, Math.min(COLS - 0.55, h.c))), y + RH * 0.5, '통!', '#ffe9c8');
  else if (h.k === H_KEY) {
    ev(s, 'key', x, y, '철컥! 🏆 문이 열렸다', '#ffe066');
    see(s, 'open', '문이 열렸어요 — 이제 🏆에 들어갈 수 있어요');
  } else if (h.k === H_ALL) {
    s.flipT.fill(s.t);
    ev(s, 'allflip', x, y, '🔄 전부 뒤집혀!', '#e2c8ff');
  } else if (h.k === H_LAND) {
    s.gone.push({ kind: 'land', r: ROWS, c: h.c, v: h.v, t: s.t, id: h.id });
    const v = h.v === -2 ? CUP_PTS : h.v === -1 ? GOLD_PTS : h.v;
    s.cheer = { t: s.t, v: h.v, c: h.c };
    ev(s, h.v === -1 ? 'gold' : h.v === -2 ? 'cup' : v > 0 ? 'coin' : 'zero', x, POT_Y, h.v === -1 ? '🏆 황금 컵! +3' : h.v === -2 ? '🎯 쏙! +5' : v > 0 ? `짤랑! +${v}` : '꽝~', h.v < 0 ? '#ffe066' : v > 0 ? '#fff1a8' : '#d6c7b8', v);
  } else if (h.k === H_STUCK) {
    s.gone.push({ kind: 'stuck', r: h.r, c: h.c, v: 0, t: s.t, id: h.id });
    ev(s, 'stuck', x, y, '어질어질… 끼었다', '#ffd0e0');
  }
}

function endStage(s: PState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.endAt = 0;
  const sd = STAGES[s.stage];
  if (ok) {
    const st = 1 + (s.left >= sd.keep ? 1 : 0) + (s.T.gold > 0 ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + s.T.coins;
    if (s.stage === STAGE_COUNT - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.55, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    ev(s, 'fail', 0.5, 0.55, s.hearts > 0 ? '공이 모자라요… 하트 -1 · 다시!' : '공이 모자라요… 끝');
  }
}

export const plinko: GameDef<PState> = {
  id: 'plinko',
  name: '핀 떨구기',
  genes: ['pegdrop', 'pointer', 'multiply'],
  twist: '공이 지나간 핀은 화살표가 뒤집혀서, 같은 줄에 떨궈도 다음 공은 다른 길로 간다 — 떨구는 순서가 수이고, 갈라짐 핀에선 공이 둘로, 둘이 넷으로 늘어난다',
  rules: ['줄을 톡 = 햄스터 공 떨구기. 공은 핀 화살표 쪽으로 가고, 지나간 핀은 ◀▶가 뒤집혀요.', '공을 다 쓰기 전에 동전 목표를 채우면 통과 — 공 남기기·🏆 황금 컵 = 별!'],
  controls: 'touch',
  hint: '줄을 톡 = 공 떨구기 / ← → 로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햄스터 핀볼 — 나무 핀 보드 디오라마',
    mood: '따뜻한 장난감 가게 구석의 나무 핀 보드. 나뭇결 판에 놋쇠 핀이 반짝이고, 투명한 햄스터 볼이 통통 튀며 내려온다. 아래 컵마다 꼬마 전구가 줄지어 깜빡이고, 햄스터 가족이 바닥에서 응원한다.',
    palette: { bg: '#2a1d2e', ink: '#fff7ea', muted: '#c9b49c', accent: '#ffcf5a', hot: '#ff6b5a', soft: '#e9c48f' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      B: null as unknown as Board, goal: 0, balls: [], fall: null, nid: { n: 0 },
      left: 0, T: tz(), endAt: 0, drops: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, won: false, dead: false,
      down: false, cx: 0.5, kbd: false,
      seen: new Set<string>(), news: [], events: [], gone: [], flipT: new Int32Array(NC),
      cheer: { t: -999, v: 0, c: 3 }, gasp: -999, split: -999, splitN: 0,
    } as PState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (inp.dir) (s.cx = Math.max(0, Math.min(1, s.cx + inp.dir * 0.012))), (s.kbd = true);
    if (p) s.cx = p.x;
    s.t++;
    s.pt++;
    if (s.events.length && s.t - s.events[0].t > 130) s.events = s.events.filter((e) => s.t - e.t <= 130);
    if (s.gone.length && s.t - s.gone[0].t > 160) s.gone = s.gone.filter((g) => s.t - g.t <= 160);
    // 새것 알림은 하나씩 차례로 (각 3초)
    if (s.news.length) {
      if (s.news[0].t < 0) s.news[0].t = s.t;
      else if (s.t - s.news[0].t > 190) s.news.shift();
    }
    if (s.phase === 'result') {
      if (s.pt >= RESULT) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.fall && s.t - s.fall.last >= STEP) {
      s.fall.last = s.t;
      const H: Hap[] = [];
      advance(s.B, s.balls, s.t, s.T, H, s.nid, null);
      for (const h of H) react(s, h);
      s.balls = s.balls.filter((b) => b.alive);
      if (s.balls.length > s.T.most) s.T.most = s.balls.length;
      if (!s.balls.length) {
        s.fall = null;
        if (s.T.coins >= s.goal || s.left <= 0) s.endAt = s.t + END_WAIT;
      }
    }
    if (s.endAt && s.t >= s.endAt) return endStage(s, s.T.coins >= s.goal);
    if (!press || s.fall || s.endAt || s.left <= 0) return;
    drop(s, colAt(s.cx));
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCol = (c: number): Input => ({ tap: false, dir: 0, pointer: { x: CX(c), y: CHIP_Y / A } });
const brain = new WeakMap<object, { key: string; col: number; at: number }>();
/** 봇: 두 수 앞까지 다 떨궈 보고 그 뒤는 욕심쟁이로 끝까지 — 어디에, 어떤 순서로(그리고 🎯 컵이면 언제) */
export const plinkoSmart: Bot<PState> = {
  name: '핀 박사',
  act(s) {
    if (s.phase !== 'play' || s.fall || s.down || s.endAt || s.left <= 0) return NO;
    const key = `${s.stage}:${s.hearts}:${s.left}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      const G = { goal: s.goal, keep: STAGES[s.stage].keep };
      // 봇은 3틱마다 판단: 지금 누르면 다음 틱에 떨어진다. 🎯 컵 판은 몇 박자 기다렸다 떨굴 수도 있다
      const waits = s.B.cup ? [0, 12, 24, 36, 48, 60, 72, 84] : [0];
      const r = search(s.B, s.T.coins, s.T.gold, s.left, s.t + 1, G, s.left >= 2 && !s.B.cup ? 2 : 1, waits);
      brain.set(s, (m = { key, col: r.col, at: s.t + r.w }));
    }
    return s.t >= m.at ? tapCol(m.col) : NO;
  },
};

const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 줄이나, 아무 때나 톡 */
export const plinkoRandom: Bot<PState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 20 + Math.floor(rng() * 60);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 25 + Math.floor(rng() * 90));
    return { tap: false, dir: 0, pointer: { x: rng(), y: 0.1 + rng() * 0.8 } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

type Mood = 'calm' | 'wow' | 'dizzy' | 'happy' | 'scared' | 'shock' | 'blink';
/** 햄스터 (앞모습, 둥근 몸). arms: 0 내림 ~ 1 만세 */
function hamster(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, mood: Mood, t: number, spin = 0, arms = 0, look = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  // 귀
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#c97a3c';
    ctx.beginPath();
    ctx.arc(sd * R * 0.62, -R * 0.78, R * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffb0b8';
    ctx.beginPath();
    ctx.arc(sd * R * 0.62, -R * 0.76, R * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  // 팔 (만세면 위로)
  ctx.strokeStyle = '#e09a58';
  ctx.lineWidth = Math.max(1.2, R * 0.22);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const up = arms, wig = Math.sin(t * 0.5 + sd) * 0.15 * up;
    ctx.beginPath();
    ctx.moveTo(sd * R * 0.62, R * 0.2);
    ctx.lineTo(sd * R * (0.95 + 0.1 * up), R * (0.45 - 1.25 * up) + wig * R);
    ctx.stroke();
  }
  // 몸
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.1, 0, 0, R * 1.1);
  g.addColorStop(0, '#ffcf96');
  g.addColorStop(1, '#d9843f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, R, R * 0.93, 0, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴 흰 털
  ctx.fillStyle = '#fff4e2';
  ctx.beginPath();
  ctx.ellipse(0, R * 0.26, R * 0.66, R * 0.58, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -R * 0.15, R * 0.18, R * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
  // 볼
  ctx.fillStyle = 'rgba(255,140,160,.55)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * R * 0.52, R * 0.25, R * 0.17, R * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈
  const ex = R * 0.34, ey = -R * 0.06, lx = look * R * 0.06;
  ctx.fillStyle = '#2a1a12';
  ctx.strokeStyle = '#2a1a12';
  ctx.lineWidth = Math.max(1, R * 0.11);
  for (const sd of [-1, 1]) {
    const cx = sd * ex + lx;
    if (mood === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.35) ctx.lineTo(cx + Math.cos(a + t * 0.4 * sd) * a * R * 0.019, ey + Math.sin(a + t * 0.4 * sd) * a * R * 0.019);
      ctx.stroke();
    } else if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(cx, ey + R * 0.05, R * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'scared') {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.12, ey - R * 0.1);
      ctx.lineTo(cx + R * 0.02 * sd, ey);
      ctx.lineTo(cx - R * 0.12, ey + R * 0.1);
      ctx.stroke();
    } else if (mood === 'blink') {
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.1, ey);
      ctx.lineTo(cx + R * 0.1, ey);
      ctx.stroke();
    } else {
      const big = mood === 'wow' || mood === 'shock' ? 1.45 : 1;
      ctx.beginPath();
      ctx.arc(cx, ey, R * 0.1 * big, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx - R * 0.03, ey - R * 0.04, R * 0.04 * big, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a1a12';
    }
  }
  // 코 · 입
  ctx.fillStyle = '#ff7a8a';
  ctx.beginPath();
  ctx.ellipse(0, R * 0.14, R * 0.08, R * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a3b2a';
  ctx.lineWidth = Math.max(0.8, R * 0.07);
  ctx.beginPath();
  if (mood === 'wow' || mood === 'shock' || mood === 'scared') {
    ctx.fillStyle = '#7a2b2a';
    ctx.ellipse(0, R * 0.36, R * 0.09, R * (mood === 'scared' ? 0.14 : 0.11), 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (mood === 'happy') {
    ctx.fillStyle = '#c4414f';
    ctx.arc(0, R * 0.27, R * 0.15, 0.1, Math.PI - 0.1);
    ctx.fill();
  } else if (mood === 'dizzy') {
    ctx.moveTo(-R * 0.14, R * 0.34);
    for (let k = 0; k <= 4; k++) ctx.lineTo(-R * 0.14 + k * R * 0.07, R * 0.34 + (k % 2 ? R * 0.05 : 0));
    ctx.stroke();
  } else {
    ctx.moveTo(-R * 0.1, R * 0.27);
    ctx.quadraticCurveTo(-R * 0.05, R * 0.33, 0, R * 0.22);
    ctx.quadraticCurveTo(R * 0.05, R * 0.33, R * 0.1, R * 0.27);
    ctx.stroke();
  }
  // 앞니
  if (mood !== 'wow' && mood !== 'shock' && mood !== 'scared') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-R * 0.05, R * 0.22, R * 0.1, R * 0.09);
  }
  ctx.restore();
}

/** 햄스터 볼: 판 위 그림자 · 투명한 공 · 안에서 구르는 햄스터 · 숨구멍 · 반짝 */
function hball(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, mood: Mood, t: number, spin: number, shadow = true, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (shadow) {
    ctx.fillStyle = 'rgba(50,25,8,.28)';
    ctx.beginPath();
    ctx.ellipse(x + R * 0.32, y + R * 0.42, R * 0.95, R * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const g = ctx.createRadialGradient(x - R * 0.3, y - R * 0.35, R * 0.1, x, y, R);
  g.addColorStop(0, 'rgba(255,255,255,.55)');
  g.addColorStop(0.6, 'rgba(190,235,255,.28)');
  g.addColorStop(1, 'rgba(120,200,240,.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.fill();
  hamster(ctx, x, y + R * 0.08, R * 0.64, mood, t, spin * 0.5, mood === 'happy' ? 1 : 0);
  // 공 테두리 · 숨구멍(같이 구른다)
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = Math.max(1.2, R * 0.08);
  ctx.beginPath();
  ctx.arc(x, y, R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(120,190,230,.7)';
  ctx.lineWidth = Math.max(1, R * 0.06);
  for (let k = 0; k < 3; k++) {
    const a = spin + (k * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.arc(x, y, R * 0.86, a, a + 0.5);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  ctx.beginPath();
  ctx.ellipse(x - R * 0.42, y - R * 0.48, R * 0.2, R * 0.11, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawAll(ctx: CanvasRenderingContext2D, s: PState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const sd = STAGES[s.stage], B = s.B;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const emoji = (e: string, x: number, y: number, sz: number) => {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(12, R(sz))}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y);
  };
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 36 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.13, Math.min(w * 0.87, x)), y, text, col, size);
  };
  const idle = s.phase === 'play' && !s.fall && !s.endAt && s.left > 0;
  const aimC = colAt(s.cx);

  ctx.save();
  fx.begin(ctx);
  // ═════════════ 방 (뒤 벽) ═════════════
  {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a2440');
    g.addColorStop(0.5, '#4a2c3c');
    g.addColorStop(1, '#2a1a22');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    // 벽지 세로 줄무늬
    ctx.fillStyle = 'rgba(255,220,200,.045)';
    for (let k = 0; k < 14; k++) ctx.fillRect(X(k / 14), 0, R(0.035), h);
    // 램프 빛 번짐
    const lg = ctx.createRadialGradient(X(0.5), Y(0.2), R(0.05), X(0.5), Y(0.45), R(0.75));
    lg.addColorStop(0, 'rgba(255,214,150,.35)');
    lg.addColorStop(1, 'rgba(255,214,150,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, h);
  }
  // ═════════════ 핀 보드 (나무 상자) ═════════════
  const BX0 = 0.045, BX1 = 0.955, BY0 = 0.262, BY1 = POT_Y + 0.08, DEP = 0.024;
  {
    // 마룻바닥 (판자 줄) — 상자가 그 위에 서 있다
    const fl = ctx.createLinearGradient(0, Y(BY1), 0, Y(FLOOR_Y + 0.07));
    fl.addColorStop(0, '#6a4426');
    fl.addColorStop(1, '#3a2214');
    ctx.fillStyle = fl;
    ctx.fillRect(0, Y(BY1 - 0.01), w, Y(FLOOR_Y + 0.08 - BY1));
    ctx.strokeStyle = 'rgba(255,220,180,.09)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 7; k++) (ctx.beginPath(), ctx.moveTo(0, Y(BY1 + 0.012 + k * 0.016 * (1 + k * 0.15))), ctx.lineTo(w, Y(BY1 + 0.012 + k * 0.016 * (1 + k * 0.15))), ctx.stroke());
    // 상자 그림자 (바닥)
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.ellipse(X(0.5), Y(BY1 + 0.02), R(0.52), R(0.028), 0, 0, Math.PI * 2);
    ctx.fill();
    // 옆면 (3/4 시점: 오른쪽 옆판이 비스듬히 보인다)
    ctx.fillStyle = '#4a2c15';
    ctx.beginPath();
    ctx.moveTo(X(BX1 + 0.02), Y(BY0));
    ctx.lineTo(X(BX1 + 0.035), Y(BY0 - DEP + 0.004));
    ctx.lineTo(X(BX1 + 0.035), Y(BY1 + 0.004));
    ctx.lineTo(X(BX1 + 0.02), Y(BY1 + 0.014));
    ctx.fill();
    // 윗면 (위에서 살짝 내려다본 두께)
    ctx.fillStyle = '#b98250';
    ctx.beginPath();
    ctx.moveTo(X(BX0 - 0.02), Y(BY0));
    ctx.lineTo(X(BX0 - 0.005), Y(BY0 - DEP));
    ctx.lineTo(X(BX1 + 0.035), Y(BY0 - DEP));
    ctx.lineTo(X(BX1 + 0.02), Y(BY0));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,230,190,.4)';
    ctx.fillRect(X(BX0 - 0.005), Y(BY0 - DEP), R(BX1 - BX0 + 0.04), 1.5);
    // 틀 (바깥 테)
    const fg = ctx.createLinearGradient(X(BX0 - 0.02), 0, X(BX1 + 0.02), 0);
    fg.addColorStop(0, '#6e4422');
    fg.addColorStop(0.08, '#94613a');
    fg.addColorStop(0.92, '#8a5a33');
    fg.addColorStop(1, '#5a3519');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(X(BX0 - 0.02), Y(BY0), R(BX1 - BX0 + 0.04), Y(BY1 - BY0 + 0.014), R(0.012));
    ctx.fill();
    // 판 (밝은 나뭇결)
    const pg = ctx.createLinearGradient(0, Y(BY0), 0, Y(BY1));
    pg.addColorStop(0, '#f3d6a2');
    pg.addColorStop(1, '#dcae72');
    ctx.fillStyle = pg;
    ctx.fillRect(X(BX0), Y(BY0 + 0.012), R(BX1 - BX0), Y(POT_Y - BY0 - 0.06));
    // 칠한 햇살 무늬 (옛 핀 보드 그림) — 판 아래 가운데에서 퍼진다
    ctx.save();
    ctx.beginPath();
    ctx.rect(X(BX0), Y(BY0 + 0.012), R(BX1 - BX0), Y(POT_Y - BY0 - 0.06));
    ctx.clip();
    const sx = X(0.5), sy = Y(POT_Y - 0.02);
    for (let k = 0; k < 18; k++) {
      const a0 = Math.PI + (k / 18) * Math.PI, a1 = a0 + Math.PI / 36;
      ctx.fillStyle = k % 2 ? 'rgba(255,190,120,.13)' : 'rgba(255,240,210,.12)';
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.arc(sx, sy, R(0.95), a0, a1 + Math.PI / 36);
      ctx.fill();
    }
    for (const rr of [0.2, 0.36]) {
      ctx.strokeStyle = 'rgba(190,120,60,.14)';
      ctx.lineWidth = R(0.01);
      ctx.beginPath();
      ctx.arc(sx, sy, R(rr), Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // 나뭇결
    ctx.strokeStyle = 'rgba(150,95,45,.15)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 18; k++) {
      const x0 = BX0 + 0.012 + k * 0.05 + hsh(k) * 0.02;
      ctx.beginPath();
      for (let y = BY0 + 0.015; y <= POT_Y - 0.05; y += 0.02) ctx.lineTo(X(x0 + 0.008 * Math.sin(y * 9 + k) + 0.004 * Math.sin(y * 31 + k * 2)), Y(y));
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const kx = BX0 + 0.1 + hsh(k + 20) * 0.75, ky = BY0 + 0.1 + hsh(k + 40) * 0.5;
      ctx.strokeStyle = 'rgba(140,85,40,.16)';
      for (let q = 1; q < 4; q++) (ctx.beginPath(), ctx.ellipse(X(kx), Y(ky), R(0.006 * q), R(0.012 * q), 0, 0, Math.PI * 2), ctx.stroke());
    }
    // 안쪽 그늘 (틀이 판에 드리운 그림자: 빛은 왼쪽 위에서)
    const ig = ctx.createLinearGradient(X(BX0), 0, X(BX0 + 0.045), 0);
    ig.addColorStop(0, 'rgba(60,30,10,.38)');
    ig.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = ig;
    ctx.fillRect(X(BX0), Y(BY0), R(0.045), Y(POT_Y - BY0 - 0.05));
    const tg = ctx.createLinearGradient(0, Y(BY0), 0, Y(BY0 + 0.05));
    tg.addColorStop(0, 'rgba(60,30,10,.4)');
    tg.addColorStop(1, 'rgba(60,30,10,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(X(BX0), Y(BY0), R(BX1 - BX0), R(0.05));
    // 틀의 놋쇠 못
    ctx.fillStyle = '#e7c46a';
    for (let k = 0; k < 10; k++) {
      const yy = BY0 + 0.04 + k * 0.08;
      if (yy > BY1 - 0.01) break;
      for (const xx of [BX0 - 0.01, BX1 + 0.01]) (ctx.beginPath(), ctx.arc(X(xx), Y(yy), R(0.004), 0, Math.PI * 2), ctx.fill());
    }
  }
  // ═════════════ 미리 보기 길 (고른 줄) ═════════════
  let pre: { seg: number[]; T: Tally; end: number } | null = null;
  if (idle) {
    const B2 = cp(B), T = tz(), seg: number[] = [];
    const end = simDrop(B2, aimC, s.t + 1, T, seg);
    pre = { seg, T, end };
  }
  // ═════════════ 칸들 (핀·갈라짐·구멍·범퍼·막힌 칸·열쇠·뒤집개) ═════════════
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, k = B.k[i], x = X(CX(c)), y = Y(RY(r)), age = t - s.flipT[i];
      if (k === EMPTY) {
        // 빈 칸: 작은 나무 구멍 자국 (격자가 보이게)
        ctx.fillStyle = 'rgba(120,70,30,.18)';
        ctx.beginPath();
        ctx.arc(x, y, R(0.004), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      if (k === ARROW) {
        const d = B.d[i], sc = age < 9 ? d * (age / 9 * 2 - 1) : d;
        // 핀 그림자
        ctx.fillStyle = 'rgba(60,30,8,.3)';
        ctx.beginPath();
        ctx.ellipse(x + R(0.008), y + R(0.012), R(0.02), R(0.017), 0, 0, Math.PI * 2);
        ctx.fill();
        // 화살 날개 (뒤집히는 판)
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(sc || 0.05, 1);
        const ag = ctx.createLinearGradient(0, -R(0.02), 0, R(0.02));
        ag.addColorStop(0, '#ff8a5c');
        ag.addColorStop(1, '#d9432a');
        ctx.fillStyle = ag;
        ctx.strokeStyle = '#7a2412';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-R(0.012), -R(0.012));
        ctx.lineTo(R(0.022), -R(0.012));
        ctx.lineTo(R(0.022), -R(0.024));
        ctx.lineTo(R(0.05), 0);
        ctx.lineTo(R(0.022), R(0.024));
        ctx.lineTo(R(0.022), R(0.012));
        ctx.lineTo(-R(0.012), R(0.012));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        // 놋쇠 핀 머리
        const pg = ctx.createRadialGradient(x - R(0.006), y - R(0.007), R(0.002), x, y, R(0.017));
        pg.addColorStop(0, '#fff6cc');
        pg.addColorStop(0.45, '#e2b64e');
        pg.addColorStop(1, '#8a6420');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(x, y, R(0.016), 0, Math.PI * 2);
        ctx.fill();
        if (age < 12) {
          ctx.strokeStyle = `rgba(255,255,255,${1 - age / 12})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, R(0.02 + age * 0.003), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (k === SPLIT) {
        ctx.fillStyle = 'rgba(40,30,10,.3)';
        ctx.beginPath();
        ctx.moveTo(x + R(0.008), y - R(0.02));
        ctx.lineTo(x + R(0.044), y + R(0.03));
        ctx.lineTo(x - R(0.028), y + R(0.03));
        ctx.fill();
        const sg = ctx.createLinearGradient(x - R(0.035), 0, x + R(0.035), 0);
        sg.addColorStop(0, '#2fa9b8');
        sg.addColorStop(0.5, '#7ff0f0');
        sg.addColorStop(1, '#1f7f99');
        ctx.fillStyle = sg;
        ctx.strokeStyle = '#0f4f5c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y - R(0.03));
        ctx.lineTo(x + R(0.036), y + R(0.022));
        ctx.lineTo(x - R(0.036), y + R(0.022));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 양쪽 작은 화살 ↙↘
        ctx.strokeStyle = '#0f4f5c';
        ctx.lineWidth = 2;
        for (const sd2 of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(x + sd2 * R(0.012), y + R(0.008));
          ctx.lineTo(x + sd2 * R(0.026), y + R(0.016));
          ctx.stroke();
        }
        if (t - s.split < 14 && age < 999) {
          ctx.strokeStyle = 'rgba(180,255,255,.8)';
          ctx.beginPath();
          ctx.arc(x, y, R(0.04 + (t - s.split) * 0.003), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (k === HOLE) {
        const hg = ctx.createRadialGradient(x, y, R(0.004), x, y, R(0.04));
        hg.addColorStop(0, '#000000');
        hg.addColorStop(0.7, '#2a160a');
        hg.addColorStop(1, 'rgba(90,50,20,.6)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.ellipse(x, y, R(0.04), R(0.03), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(160,110,255,.55)';
        ctx.lineWidth = 1.5;
        for (let q = 0; q < 2; q++) {
          ctx.beginPath();
          ctx.ellipse(x, y, R(0.026 - q * 0.01), R(0.019 - q * 0.007), 0, t * 0.08 + q * 2, t * 0.08 + q * 2 + 4);
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255,230,190,.5)';
        ctx.beginPath();
        ctx.ellipse(x, y, R(0.04), R(0.03), 0, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else if (k === BUMP) {
        const d = B.d[i], hit = age < 10 ? 1 - age / 10 : 0, rr = R(0.027) * (1 + 0.25 * hit);
        ctx.fillStyle = 'rgba(60,20,10,.3)';
        ctx.beginPath();
        ctx.ellipse(x + R(0.008), y + R(0.014), rr, rr * 0.85, 0, 0, Math.PI * 2);
        ctx.fill();
        const bg = ctx.createRadialGradient(x - rr * 0.35, y - rr * 0.4, rr * 0.1, x, y, rr);
        bg.addColorStop(0, '#ffd0d8');
        bg.addColorStop(0.4, '#ff4d6d');
        bg.addColorStop(1, '#a3122f');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(x, y, rr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, rr * 0.62, 0, Math.PI * 2);
        ctx.stroke();
        // 튕길 방향 ↖ ↗
        ctx.strokeStyle = '#fff6c4';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x - d * R(0.006), y + R(0.006));
        ctx.lineTo(x + d * R(0.04), y - R(0.034));
        ctx.moveTo(x + d * R(0.04), y - R(0.034));
        ctx.lineTo(x + d * R(0.022), y - R(0.034));
        ctx.moveTo(x + d * R(0.04), y - R(0.034));
        ctx.lineTo(x + d * R(0.04), y - R(0.017));
        ctx.stroke();
        if (hit > 0) (ctx.fillStyle = `rgba(255,255,200,${hit * 0.6})`), ctx.beginPath(), ctx.arc(x, y, rr * 1.4, 0, Math.PI * 2), ctx.fill();
      } else if (k === BLOCK || k === DOOR) {
        const bw = R(0.1), bh = R(0.05), z = R(0.016);
        ctx.fillStyle = 'rgba(40,20,5,.35)';
        ctx.fillRect(x - bw / 2 + R(0.01), y - bh / 2 + R(0.014), bw, bh);
        ctx.fillStyle = k === DOOR ? '#7a5a8a' : '#9a6a3a';
        ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh);
        ctx.fillStyle = k === DOOR ? '#a07fb3' : '#c28d55';
        ctx.beginPath();
        ctx.moveTo(x - bw / 2, y - bh / 2);
        ctx.lineTo(x - bw / 2 + z * 0.6, y - bh / 2 - z);
        ctx.lineTo(x + bw / 2 + z * 0.6, y - bh / 2 - z);
        ctx.lineTo(x + bw / 2, y - bh / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(60,30,10,.35)';
        ctx.lineWidth = 1;
        for (let q = 1; q < 3; q++) (ctx.beginPath(), ctx.moveTo(x - bw / 2 + 2, y - bh / 2 + (bh * q) / 3), ctx.lineTo(x + bw / 2 - 2, y - bh / 2 + (bh * q) / 3), ctx.stroke());
        if (k === DOOR) emoji('🔒', x, y, 0.035);
      } else if (k === KEY) {
        const kg = ctx.createRadialGradient(x, y, 0, x, y, R(0.045));
        kg.addColorStop(0, 'rgba(255,230,120,.75)');
        kg.addColorStop(1, 'rgba(255,230,120,0)');
        ctx.fillStyle = kg;
        ctx.beginPath();
        ctx.arc(x, y, R(0.045), 0, Math.PI * 2);
        ctx.fill();
        emoji('🔑', x, y + Math.sin(t * 0.08) * R(0.004), 0.042);
      } else if (k === FLIP) {
        ctx.fillStyle = 'rgba(40,20,60,.3)';
        ctx.beginPath();
        ctx.arc(x + R(0.008), y + R(0.012), R(0.028), 0, Math.PI * 2);
        ctx.fill();
        const fg2 = ctx.createRadialGradient(x - R(0.01), y - R(0.01), R(0.004), x, y, R(0.03));
        fg2.addColorStop(0, '#f1e2ff');
        fg2.addColorStop(1, '#7a4fd6');
        ctx.fillStyle = fg2;
        ctx.beginPath();
        ctx.arc(x, y, R(0.028), 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(t * 0.04);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        for (let q = 0; q < 2; q++) {
          ctx.beginPath();
          ctx.arc(0, 0, R(0.015), q * Math.PI + 0.3, q * Math.PI + 2.6);
          ctx.stroke();
          const a = q * Math.PI + 2.6;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * R(0.015), Math.sin(a) * R(0.015));
          ctx.lineTo(Math.cos(a - 0.5) * R(0.022), Math.sin(a - 0.5) * R(0.022));
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  // 점선 길
  if (pre) {
    const pulse = (t % 40) / 40;
    ctx.save();
    ctx.setLineDash([R(0.012), R(0.012)]);
    ctx.lineDashOffset = -pulse * R(0.024);
    ctx.lineWidth = Math.max(2.5, R(0.008));
    ctx.lineCap = 'round';
    const seg = pre.seg;
    for (let q = 0; q < seg.length; q += 4) {
      const r0 = seg[q], c0 = seg[q + 1], r1 = seg[q + 2], c1 = seg[q + 3];
      const x0 = X(CX(c0)), y0 = Y(RY(r0)), x1 = X(CX(c1)), y1 = Y(RY(Math.min(r1, ROWS)));
      ctx.strokeStyle = 'rgba(255,255,255,.92)';
      ctx.shadowColor = 'rgba(80,40,0,.6)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      if (r1 < r0) ctx.quadraticCurveTo((x0 + x1) / 2, y0 - R(0.06), x1, y1);
      else ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // ═════════════ 컵 줄 (아래) ═════════════
  {
    const py = POT_Y, ph = 0.075;
    for (let c = 0; c < COLS; c++) {
      const x = X(CX(c)), v = B.pot[c], gold = v === GOLD, x0 = X(CX(c) - CW / 2 + 0.006), x1 = X(CX(c) + CW / 2 - 0.006);
      // 칸 안쪽 (어둡게)
      ctx.fillStyle = gold ? '#5a3a10' : '#4a2a14';
      ctx.fillRect(x0, Y(py - 0.03), x1 - x0, Y(ph + 0.03));
      // 반짝이 조명 빛 (칸 위에서 내려오는)
      const on = gold || (Math.floor(t / 8) + c) % 3 === 0;
      const lg = ctx.createLinearGradient(0, Y(py - 0.03), 0, Y(py + ph));
      lg.addColorStop(0, gold ? 'rgba(255,215,90,.55)' : `rgba(255,220,150,${on ? 0.3 : 0.14})`);
      lg.addColorStop(1, 'rgba(255,220,150,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(x0, Y(py - 0.03), x1 - x0, Y(ph + 0.03));
      // 앞판
      const fg = ctx.createLinearGradient(0, Y(py + 0.02), 0, Y(py + ph));
      fg.addColorStop(0, gold ? '#ffd24a' : '#c99057');
      fg.addColorStop(1, gold ? '#b8860b' : '#8f5e30');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.roundRect(x0, Y(py + 0.022), x1 - x0, Y(ph - 0.022), R(0.01));
      ctx.fill();
      // 값
      if (gold) emoji('🏆', x, Y(py + 0.048), 0.04);
      else {
        font(0.042, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = v > 0 ? '#fff6d8' : 'rgba(255,240,220,.45)';
        ctx.strokeStyle = 'rgba(70,35,10,.6)';
        ctx.lineWidth = 3;
        const tx = v > 0 ? `${v}` : '꽝';
        ctx.strokeText(tx, x + (v > 0 ? R(0.01) : 0), Y(py + 0.05));
        ctx.fillText(tx, x + (v > 0 ? R(0.01) : 0), Y(py + 0.05));
        if (v > 0) {
          const cg = ctx.createRadialGradient(x - R(0.022), Y(py + 0.046), 0, x - R(0.018), Y(py + 0.05), R(0.013));
          cg.addColorStop(0, '#fff6b0');
          cg.addColorStop(1, '#d99b1c');
          ctx.fillStyle = cg;
          ctx.beginPath();
          ctx.arc(x - R(0.018), Y(py + 0.05), R(0.012), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      // 뚜껑(문)
      if (B.lid[c]) {
        ctx.fillStyle = '#7a5a8a';
        ctx.fillRect(x0 - 1, Y(py - 0.035), x1 - x0 + 2, R(0.026));
        ctx.fillStyle = '#a07fb3';
        ctx.fillRect(x0 - 1, Y(py - 0.035), x1 - x0 + 2, R(0.007));
        emoji('🔒', x, Y(py - 0.022), 0.03);
      }
      // 꼬마 전구 셋
      for (let q = 0; q < 3; q++) {
        const bx = X(CX(c) - 0.03 + q * 0.03), by = Y(py - 0.042), lit = gold || (Math.floor(t / 7) + c * 3 + q) % 4 < 2;
        if (lit) {
          const bg = ctx.createRadialGradient(bx, by, 0, bx, by, R(0.016));
          bg.addColorStop(0, gold ? 'rgba(255,230,120,.9)' : 'rgba(255,240,180,.8)');
          bg.addColorStop(1, 'rgba(255,240,180,0)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(bx, by, R(0.016), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = lit ? '#fffbe0' : '#7a6a50';
        ctx.beginPath();
        ctx.arc(bx, by, R(0.0045), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 칸막이
    for (let c = 0; c <= COLS; c++) {
      const x = X(X0 + c * CW);
      ctx.fillStyle = '#6a4120';
      ctx.fillRect(x - R(0.006), Y(py - 0.05), R(0.012), Y(ph + 0.05));
      ctx.fillStyle = '#b07a46';
      ctx.fillRect(x - R(0.006), Y(py - 0.05), R(0.012), R(0.005));
    }
    // 움직이는 🎯 컵
    if (B.cup) {
      const rel = t - B.t0, pos = cupAt(B.cup, rel), nx = cupAt(B.cup, rel + B.cup.beat), f = (rel % B.cup.beat) / B.cup.beat;
      const slide = f > 0.75 ? (f - 0.75) / 0.25 : 0, cxp = CX(pos) + (CX(nx) - CX(pos)) * slide * slide;
      const x = X(cxp), y = Y(py - 0.005);
      // 레일
      ctx.strokeStyle = 'rgba(255,255,255,.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(CX(B.cup.lo) - 0.04), Y(py - 0.03));
      ctx.lineTo(X(CX(B.cup.hi) + 0.04), Y(py - 0.03));
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.ellipse(x + R(0.006), y + R(0.05), R(0.045), R(0.012), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x - R(0.05), y - R(0.02));
      ctx.lineTo(x + R(0.05), y - R(0.02));
      ctx.lineTo(x + R(0.036), y + R(0.05));
      ctx.lineTo(x - R(0.036), y + R(0.05));
      ctx.closePath();
      ctx.clip();
      for (let q = -3; q < 4; q++) {
        ctx.fillStyle = q % 2 ? '#ffffff' : '#ff4d4d';
        ctx.fillRect(x + q * R(0.016), y - R(0.03), R(0.016), R(0.09));
      }
      ctx.restore();
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.ellipse(x, y - R(0.02), R(0.05), R(0.012), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a1a0a';
      ctx.beginPath();
      ctx.ellipse(x, y - R(0.02), R(0.042), R(0.008), 0, 0, Math.PI * 2);
      ctx.fill();
      emoji('🎯', x, y + R(0.022), 0.03);
    }
  }
  // ═════════════ 공들 ═════════════
  const ballPos = (b: Ball) => {
    const f = s.fall ? Math.min(1, (t - s.fall.last) / STEP) : 1;
    const ax = CX(b.c), ay = b.r < 0 ? DROP_Y : b.r >= ROWS ? POT_Y : RY(b.r) - (B.k[b.r * COLS + b.c] !== EMPTY ? 0.03 : 0);
    const bx = CX(b.nc), by = b.nr >= ROWS ? POT_Y + 0.01 : RY(b.nr) - (b.nr >= 0 && B.k[b.nr * COLS + b.nc] !== EMPTY ? 0.03 : 0);
    let x = ax + (bx - ax) * f, y: number;
    if (b.how === 2) y = ay + (by - ay) * f - Math.sin(Math.PI * f) * 0.06;
    else if (b.how === 0) y = ay + (by - ay) * f * f;
    else (y = ay + (by - ay) * f * f - Math.sin(Math.PI * f) * 0.025), (x = ax + (bx - ax) * Math.min(1, f * 1.3));
    return { x, y };
  };
  const live = s.balls.filter((b) => b.alive), few = live.length <= 2;
  for (const b of live) {
    const p = ballPos(b), mood: Mood = t - s.split < 16 && b.how === 4 ? 'shock' : b.moves >= 4 ? 'dizzy' : 'wow';
    // 같은 칸에 겹친 공은 살짝 비켜 그린다 (넷으로 갈라진 쌍둥이)
    const same = live.filter((q) => q.r === b.r && q.c === b.c && q.nr === b.nr && q.nc === b.nc), j = same.indexOf(b);
    if (same.length > 1) (p.x += (j - (same.length - 1) / 2) * 0.03), (p.y -= Math.abs(j - (same.length - 1) / 2) * 0.012);
    const spin = (t - (s.fall?.t0 ?? 0)) * 0.22 * (b.id % 2 ? 1 : -1);
    hball(ctx, X(p.x), Y(p.y), R(BR), mood, t, spin);
    if (mood === 'shock' && few) {
      font(0.032, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(0,0,0,.5)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      const tx = b.twin >= 0 && b.id > b.twin ? '나?!' : '어?!', side = b.nc > b.c ? 1 : -1;
      ctx.strokeText(tx, X(p.x + side * 0.045), Y(p.y - 0.035));
      ctx.fillText(tx, X(p.x + side * 0.045), Y(p.y - 0.035));
    }
  }
  // 떠난 공: 컵에 쏙 · 구멍에 빙글 빠짐 → 아래 파이프에서 뿅 · 끼어서 어질어질
  for (const g of s.gone) {
    const age = t - g.t;
    if (g.kind === 'land') {
      if (age > 50) continue;
      const x = X(CX(g.c)), y = Y(POT_Y + 0.01 + Math.min(1, age / 10) * 0.02);
      hball(ctx, x, y, R(BR) * (1 - Math.max(0, age - 30) / 30), age < 30 ? 'happy' : 'happy', t, 0, false, Math.max(0, 1 - Math.max(0, age - 30) / 20));
    } else if (g.kind === 'hole') {
      if (age < 24) {
        const k = 1 - age / 24;
        hball(ctx, X(CX(g.c)), Y(RY(g.r)), R(BR) * k, 'scared', t, age * 0.6, false, k);
      } else if (age < 150) {
        // 아래 파이프(왼쪽)에서 뿅! 튀어나와 데굴데굴
        const a2 = age - 24, px = 0.035 + Math.min(1, a2 / 60) * 0.18, py = FLOOR_Y + 0.02 - Math.abs(Math.sin(Math.min(a2, 60) / 60 * Math.PI * 2)) * 0.06 * (1 - Math.min(1, a2 / 60));
        hamster(ctx, X(px), Y(py), R(0.022), a2 < 60 ? 'dizzy' : 'scared', t, a2 < 60 ? a2 * 0.35 : Math.sin(t * 0.3) * 0.2);
        if (a2 >= 60) {
          // 어질어질 별
          for (let q = 0; q < 3; q++) emoji('⭐', X(px + Math.cos(t * 0.12 + q * 2.1) * 0.025), Y(py - 0.035 + Math.sin(t * 0.12 + q * 2.1) * 0.008), 0.016);
        }
      }
    } else if (g.kind === 'stuck' && age < 60) hball(ctx, X(CX(g.c)), Y(RY(g.r) - 0.03 - age * 0.002), R(BR), 'dizzy', t, Math.sin(age * 0.3) * 0.5, false, 1 - age / 60);
  }
  // 왼쪽 아래 파이프 (구멍에 빠진 햄스터가 나오는 곳)
  {
    const px = X(0.0), py = Y(FLOOR_Y - 0.015);
    ctx.fillStyle = '#6c7a86';
    ctx.fillRect(px - 2, py - R(0.022), R(0.04), R(0.044));
    ctx.fillStyle = '#9fb0bd';
    ctx.fillRect(px - 2, py - R(0.022), R(0.04), R(0.008));
    ctx.fillStyle = '#20262c';
    ctx.beginPath();
    ctx.ellipse(px + R(0.04), py, R(0.008), R(0.02), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ═════════════ 바닥 · 햄스터 가족 (구경꾼) ═════════════
  {
    const ch = t - s.cheer.t, big = s.cheer.v < 0, gasp = t - s.gasp < 50;
    const fam: [number, number, number][] = [[0.64, 0.036, 0], [0.79, 0.04, 1], [0.915, 0.026, 2]];
    let tx = 0.5;
    if (s.balls.length) tx = s.balls.reduce((a, b) => a + CX(b.c), 0) / s.balls.length;
    for (const [fx0, rr, k] of fam) {
      const cheering = ch < (big ? 90 : 40) && (big || s.cheer.v > 0) && (big || Math.abs(CX(s.cheer.c) - fx0) < 0.45 || k === 2);
      const jump = cheering ? Math.abs(Math.sin((ch + k * 5) * 0.25)) * 0.025 : 0;
      const fy = FLOOR_Y + 0.02 - rr - jump;
      ctx.fillStyle = 'rgba(0,0,0,.3)';
      ctx.beginPath();
      ctx.ellipse(X(fx0), Y(FLOOR_Y + 0.022), R(rr * 0.9), R(rr * 0.25), 0, 0, Math.PI * 2);
      ctx.fill();
      const mood: Mood = cheering ? 'happy' : gasp ? 'wow' : (t + k * 40) % 200 < 8 ? 'blink' : 'calm';
      hamster(ctx, X(fx0), Y(fy), R(rr), mood, t + k * 7, 0, cheering ? 1 : 0, Math.max(-1, Math.min(1, (tx - fx0) * 4)));
      if (k === 2 && cheering && ch < 40 && ch % 40 === 1) say(X(fx0), Y(fy - 0.05), '만세!', '#fff1a8', 13);
    }
  }
  // ═════════════ 줄 숫자 (지금 떨구면 동전 몇 개) · 기다리는 공 ═════════════
  {
    for (let c = 0; c < COLS && idle; c++) {
      const x = X(CX(c)), y = Y(CHIP_Y), cw2 = R(CW - 0.012), ch2 = R(0.046), sel = c === aimC;
      let label = '', col = '#fff6d8', bgc = 'rgba(40,24,30,.78)';
      if (idle) {
        const B2 = cp(B), T = tz();
        simDrop(B2, c, t + 1, T);
        label = T.coins > 0 ? `+${T.coins}` : T.lost > 0 ? '🕳' : '0';
        if (T.gold) (label = T.coins > GOLD_PTS ? `🏆${T.coins}` : '🏆'), (bgc = 'rgba(120,80,0,.9)'), (col = '#ffe066');
        else if (T.cup) (bgc = 'rgba(140,30,30,.85)');
        else if (T.coins >= 4) col = '#ffe066';
        else if (T.coins === 0) col = 'rgba(255,240,220,.55)';
      }
      ctx.fillStyle = bgc;
      ctx.beginPath();
      ctx.roundRect(x - cw2 / 2, y - ch2 / 2, cw2, ch2, R(0.012));
      ctx.fill();
      if (sel && idle) {
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      if (label) {
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (/[🏆🕳]/u.test(label)) emoji(label, x, y + 1, 0.034);
        else {
          font(0.038, 900);
          ctx.fillStyle = col;
          ctx.fillText(label, x, y + 1);
        }
      }
    }
    // 기다리는 공 (고른 줄 위)
    if (idle) {
      const bob = Math.sin(t * 0.12) * R(0.004);
      hball(ctx, X(CX(aimC)), Y(DROP_Y) + bob, R(BR), (t % 180) < 8 ? 'blink' : 'calm', t, 0);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(X(CX(aimC) - 0.012), Y(DROP_Y + 0.05));
      ctx.lineTo(X(CX(aimC) + 0.012), Y(DROP_Y + 0.05));
      ctx.lineTo(X(CX(aimC)), Y(DROP_Y + 0.063));
      ctx.fill();
      // 1판 첫 톡 전: 손가락이 통통 (여기를 톡!)
      if (s.stage === 0 && s.drops === 0) emoji('👆', X(CX(aimC) + 0.075), Y(DROP_Y + 0.03) + Math.abs(Math.sin(t * 0.12)) * R(0.012), 0.05);
    }
  }
  // ═════════════ 사건 연출 ═════════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'drop') fx.burst(x, y, '#fff3c0', 8, 2, 2), fx.kick(1.5);
    if (e.kind === 'flip') fx.burst(x, y, '#ffd7a0', 5, 1.6, 1.6);
    if (e.kind === 'split') fx.burst(x, y, '#aef6ff', 16, 3.2, 2.4), fx.ring(x, y, '#aef6ff', R(0.08), 3), fx.kick(3), say(x, y - R(0.06), e.text!, e.col!, (e.v ?? 2) >= 4 ? 18 : 15), (e.v ?? 2) >= 4 && fx.blink('#d8fbff', 0.18);
    if (e.kind === 'hole') fx.burst(x, y, '#b48cff', 14, 2.4, 2.2), fx.kick(3), say(x, y - R(0.05), e.text!, e.col!, 15);
    if (e.kind === 'bump') fx.burst(x, y, '#ffe066', 14, 3, 2.2), fx.ring(x, y, '#ff8fa3', R(0.06), 3), fx.kick(2.5), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'wall') fx.burst(x, y, '#ffe9c8', 6, 2, 1.8), say(x, y - R(0.03), e.text!, e.col!, 13);
    if (e.kind === 'key') fx.burst(x, y, '#ffe066', 26, 4, 2.6), fx.ring(x, y, '#ffe066', R(0.12), 4), fx.blink('#fff6c8', 0.2), fx.kick(4), say(w / 2, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'allflip') fx.blink('#e2c8ff', 0.3), fx.kick(6), fx.ring(x, y, '#e2c8ff', R(0.5), 6), say(w / 2, y - R(0.06), e.text!, e.col!, 17);
    if (e.kind === 'coin') fx.burst(x, y, '#ffd84a', 10 + (e.v ?? 1) * 4, 3, 2.4), fx.ring(x, y, '#ffe066', R(0.05), 3), fx.kick(1.5 + (e.v ?? 1)), say(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'zero') say(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'gold' || e.kind === 'cup') fx.burst(x, y, '#ffe066', 40, 5, 3), fx.burst(x, y, '#ff8fb1', 20, 4, 2.6), fx.ring(x, y, '#ffe066', R(0.2), 5), fx.blink('#fff6c8', 0.25), fx.kick(6), say(x, y - R(0.07), e.text!, e.col!, 18);
    if (e.kind === 'stuck') say(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'clear') fx.burst(w * 0.3, y, '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, y, '#ff8fb1', 40, 6, 3.2), fx.ring(w / 2, y, '#ffe066', R(0.4), 7), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(7), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = s.t;
  // 빙글빙글 (햄스터가 핀을 넷 이상 지나면 가끔)
  for (const b of s.balls) if (b.alive && b.moves === 4 && s.fall && t - s.fall.last === 1 && (fx.memo['dz' + b.id] ?? -1) < 0) (fx.memo['dz' + b.id] = 1), say(X(CX(b.c)), Y(RY(Math.max(0, b.r)) - 0.06), '빙글빙글~', '#ffffff', 12);
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = R(0.075);
  ctx.fillStyle = 'rgba(30,18,26,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.044, 900);
  const ttl = `🪀 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.034, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT} · ${sd.title}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.04, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 목표판: 동전 진행 막대 · 남은 공
  {
    const y0 = 0.079, hh = 0.056;
    ctx.fillStyle = 'rgba(255,246,228,.94)';
    ctx.beginPath();
    ctx.roundRect(X(0.025), Y(y0), R(0.95), R(hh), R(0.018));
    ctx.fill();
    const coins = Math.min(s.T.coins, s.goal), done = s.T.coins >= s.goal;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    font(0.04, 900);
    ctx.fillStyle = '#6a3a14';
    const lab = `🪙 ${s.T.coins}/${s.goal}`;
    ctx.fillText(lab, X(0.045), Y(y0 + hh / 2));
    const lw = ctx.measureText(lab).width + R(0.02), bx = X(0.045) + lw, bw = X(0.6) - bx;
    ctx.fillStyle = 'rgba(120,70,30,.2)';
    ctx.beginPath();
    ctx.roundRect(bx, Y(y0 + hh / 2 - 0.012), bw, R(0.024), R(0.012));
    ctx.fill();
    const bg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    bg.addColorStop(0, '#ffcf3a');
    bg.addColorStop(1, '#ff9a1a');
    ctx.fillStyle = done ? '#5ad16a' : bg;
    ctx.beginPath();
    ctx.roundRect(bx, Y(y0 + hh / 2 - 0.012), Math.max(R(0.024), (bw * coins) / Math.max(1, s.goal)), R(0.024), R(0.012));
    ctx.fill();
    // 남은 공 (작은 햄스터 볼)
    const n = s.left, sp = 0.05, rx = 0.955 - n * sp;
    font(0.032, 800);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#6a3a14';
    ctx.fillText('공', X(rx - 0.005), Y(y0 + hh / 2));
    for (let k = 0; k < n; k++) hball(ctx, X(rx + sp * (k + 0.5)), Y(y0 + hh / 2), R(0.02), 'calm', t + k * 30, 0, false);
  }
  // 컵에서 동전이 튀어 올라 목표판으로 날아간다 (짤랑 → 숫자가 오른다)
  for (const g of s.gone) {
    if (g.kind !== 'land') continue;
    const n = g.v === -2 ? CUP_PTS : g.v === -1 ? GOLD_PTS : g.v;
    for (let k = 0; k < n; k++) {
      const age = t - g.t - k * 4, T = 34;
      if (age < 0 || age > T) continue;
      const f = age / T, e = f * f * (3 - 2 * f), x0 = CX(g.c), y0 = POT_Y, x1 = 0.075, y1 = 0.107;
      const x = x0 + (x1 - x0) * e + Math.sin(f * Math.PI) * (k % 2 ? 0.06 : -0.06), y = y0 + (y1 - y0) * e - Math.sin(f * Math.PI) * 0.12;
      const cg = ctx.createRadialGradient(X(x) - R(0.004), Y(y) - R(0.004), 0, X(x), Y(y), R(0.016));
      cg.addColorStop(0, '#fff8c0');
      cg.addColorStop(1, '#d99b1c');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), R(0.015) * Math.abs(Math.cos(age * 0.4)) + 1, R(0.015), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ── 아래 띠: 안내 · 새것 · 별 조건 · 규칙 그림 ──
  {
    const by = FLOOR_Y + 0.045;
    ctx.fillStyle = 'rgba(30,18,26,.88)';
    ctx.fillRect(0, Y(by), w, h - Y(by));
    // 별 조건
    const conds: [string, boolean, boolean][] = [
      [`목표 🪙${s.goal}`, s.T.coins >= s.goal, s.left <= 0 && s.T.coins < s.goal && !s.fall],
      [`공 ${sd.keep}개 남기기`, s.T.coins >= s.goal && s.left >= sd.keep, s.left < sd.keep && s.T.coins < s.goal],
      ['🏆 황금 컵', s.T.gold > 0, false],
    ];
    let cx0 = 0.03;
    font(0.034, 800);
    ctx.textBaseline = 'middle';
    for (const [txt, ok, miss] of conds) {
      const tw = ctx.measureText(txt).width + R(0.07);
      ctx.fillStyle = ok ? 'rgba(255,209,102,.25)' : 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.roundRect(X(cx0), Y(by + 0.012), tw, R(0.052), R(0.026));
      ctx.fill();
      star(ctx, X(cx0) + R(0.03), Y(by + 0.038), R(0.017));
      ctx.fillStyle = ok ? '#ffd43b' : miss ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.45)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.fillStyle = miss ? 'rgba(255,255,255,.35)' : '#fff7ea';
      ctx.fillText(txt, X(cx0) + R(0.055), Y(by + 0.039));
      cx0 += tw / w + 0.015;
    }
    // 안내 · 새것 알림
    const nw = s.news[0];
    let line = '';
    if (nw && nw.t >= 0) line = `✨ ${nw.text}`;
    else if (s.stage === 0 && s.drops < 2) line = '👆 줄을 톡 = 그 줄에 햄스터 공 떨구기';
    else if (idle) line = '위 숫자 = 지금 그 줄에 떨구면 받는 동전';
    else if (s.fall) line = s.T.most >= 4 ? '와르르~ 공이 넷으로!' : '통통통…';
    if (line) {
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = nw && nw.t >= 0 ? '#ffe9a8' : '#ffffff';
      const age = nw && nw.t >= 0 ? t - nw.t : 99, drop = Math.max(0, 8 - age) * 2;
      ctx.fillText(line, w / 2, Y(by + 0.103) - drop, w - R(0.05));
    }
    // 규칙 그림 (이번 판에 있는 것들)
    const legend: [string, string][] = [['◀▶', '지나면 뒤집힘']];
    if (B.k.includes(SPLIT)) legend.push(['✳', '둘로']);
    if (B.k.includes(HOLE)) legend.push(['🕳', '사라짐']);
    if (B.k.includes(BUMP)) legend.push(['🍄', '위로 +1']);
    if (B.k.includes(BLOCK)) legend.push(['🧱', '튕김']);
    if (B.cup) legend.push(['🎯', '+5']);
    if (B.k.includes(KEY) || B.lid.includes(1)) legend.push(['🔑', '문 열기']);
    if (B.k.includes(FLIP)) legend.push(['🔄', '전부 뒤집기']);
    font(0.031, 800);
    const parts = legend.map(([a, b2]) => `${a} ${b2}`), rows2: string[] = [];
    let cur = '';
    for (const p of parts) {
      const nx = cur ? `${cur}  ·  ${p}` : p;
      if (ctx.measureText(nx).width > w - R(0.08) && cur) rows2.push(cur), (cur = p);
      else cur = nx;
    }
    if (cur) rows2.push(cur);
    ctx.fillStyle = 'rgba(255,240,220,.8)';
    ctx.textAlign = 'center';
    rows2.slice(0, 2).forEach((r2, k) => ctx.fillText(r2, w / 2, Y(by + 0.163 + k * 0.043)));
  }
  // 판 카드: 시작 · 통과 · 실패
  {
    let head = '', sub = '', col = '#ffffff', a = 1, age = 0, tip = '';
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, s.pt / 6, (RESULT - s.pt) / 12);
      if (s.ok) {
        head = s.won ? '다 통과! 🐹🎉' : `${s.stage + 1}판 통과!`;
        sub = `목표 ✓ · 공 ${s.left}개 남김 ${s.left >= sd.keep ? '✓' : '✗'} · 🏆 ${s.T.gold ? '✓' : '✗'}`;
        col = '#ffd166';
      } else (head = '공이 모자라요…'), (sub = s.hearts > 0 ? `하트 -1 · 같은 판 처음부터` : '끝 — 잘했어요!'), (col = '#ffb3a8');
    } else if (s.drops === 0 && (s.pt < 150 || s.stage === 0) && !s.fall) {
      // 1판은 첫 톡 전까지 안내 한 줄을 붙여 둔다
      age = s.pt;
      a = s.stage === 0 ? 1 : Math.min(1, (150 - s.pt) / 20);
      head = `${s.stage + 1}판 — ${sd.title}`;
      sub = `공 ${sd.balls}개로 동전 ${s.goal}개!`;
      if (s.stage === 0) tip = '👆 줄을 톡 = 햄스터 공 떨구기';
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(s.phase === 'result' ? 0.6 : FLOOR_Y + 0.115);
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = '#24161f';
      ctx.beginPath();
      ctx.roundRect(-R(0.42), -R(0.065), R(0.84), R(tip ? 0.19 : 0.13), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      font(0.05, 900);
      ctx.fillStyle = col;
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.058), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.022));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = k < s.got, pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.022));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.14)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.022), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.022), R(0.8));
      ctx.fillStyle = '#fff7ea';
      font(0.035, 800);
      ctx.fillText(sub, 0, R(0.035), R(0.8));
      if (tip) {
        const bob = Math.sin(t * 0.15) * R(0.006);
        ctx.fillStyle = '#ffe08a';
        ctx.beginPath();
        ctx.roundRect(-R(0.38), R(0.068) + bob, R(0.76), R(0.048), R(0.024));
        ctx.fill();
        ctx.fillStyle = '#5a2e14';
        font(0.038, 900);
        ctx.fillText(tip, 0, R(0.093) + bob, R(0.72));
      }
      ctx.restore();
    }
  }
}
