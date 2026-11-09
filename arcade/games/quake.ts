/**
 * 흔들흔들 지진 탑 🗼 (21라운드 '지어서 버티기' 변형) — 지어서 버티기 × 타이밍 쌓기 × 재난 예보 · 톡(자리).
 * 판 = 예보 → 짓기 → 버티기. 판이 열리면 '📡 지진 예보'가 규모·방향(↔ 옆 · ↕ 위아래 · ↻ 회전)·박자(출렁·덜덜)를 지진계 선으로 보여 준다.
 * 짓기: 기둥(세로 줄)을 톡 = 다음 블록이 그 기둥 꼭대기에 쿵. 앵무새 집은 늘 '가장 높은 기둥' 꼭대기에 산다 —
 *       집 기둥을 톡 치면 블록이 집 밑으로 쏙 들어가 집이 올라가고, 다른 기둥이 더 높아지면 앵무새가 그리로 폴짝 이사한다.
 * 버티기: 지진 박자마다 블록 하나하나가 '위에 얹힌 무게 × 흔들림'을 견딘다 (읽히는 칸 규칙, 결정적).
 *   · 젤리: 흔들림을 반 넘게 먹어 위 블록은 덜 흔들린다. 대신 무거운 걸 이면(특히 위아래 지진) 퍽 터진다.
 *   · 나무: 가볍고 휜다 — 금이 세 번 가야 부서진다.  · 돌: 무겁고 단단 — 높이 두면 아래 블록이 다 힘들다.
 *   · 옆·회전 지진엔 같은 높이에 옆 블록이 붙어 있으면 서로 받쳐 힘을 나눈다(넓은 바닥). 위아래 지진엔 안 통한다.
 *   · 회전 지진은 가장자리 기둥일수록, 출렁(느림)은 높은 칸일수록, 덜덜(빠름)은 낮은 칸일수록 크게 흔든다.
 *   힘이 버팀을 넘으면 '쩍!' 금, 금이 쌓이면 부서지고 그 위는 모두 와르르. 앵무새 집이 떨어지면 하트 −1, 그 판 다시.
 * 와우: 젤리 한 칸을 바닥에 깔면 탑 전체가 말랑하게 출렁이며 버틴다 — 같은 젤리가 위아래 지진엔 '퍽!' 납작.
 * 첫 3초: 1판 첫 조각은 젤리, 안내 '👆 앵무새 집 아래를 톡'. 놓자마자 작은 전진이 와서 젤리가 푸딩처럼 출렁, 앵무새 '휴~'.
 * 목표·보상: 판마다 깃발 높이(앵무새 집이 그 층 이상) + 지진을 버티면 ★, 깃발보다 한 층 더 높으면 ★, 하나도 안 부서지면 ★.
 * 읽히게: 블록마다 얼굴이 있다 — 짓는 동안 예보한 지진을 미리 견뎌 보고 😊(여유)·😬(빠듯)·😱(금 간다)를 짓는다.
 * 펼쳐짐(하는 일이 바뀐다): 1판 젤리·옆 → 2판 돌·서로 받치기 → 3판 위아래(젤리는 꼭대기로, 돌은 바닥으로) → 4판 회전(탑은 가운데로)
 *   → 5판 빠른 덜덜(오히려 높게) → 6판 모래·바위 땅(바위 위에 탑) → 7판 여진(두 번, 방향이 달라 젤리 자리를 고민) → 8판 흔들추(무거운데 높이 둬야 좋다) → 9판 큰 지진.
 * 웃음: 꼭대기에서 집을 꼭 끌어안은 앵무새('꺄악!'·'휴~'·우쭐), 출렁이는 푸딩 젤리, 지팡이 할머니와 강아지가 덜덜,
 *   무너지면 앵무새가 데굴데굴 떨어져 거꾸로 버둥 + 머리 위에 별이 빙빙.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 판 크기 (화면 폭 = 1, 세로 = A) ─────────────────────────────
const A = 1.4;
export const COLS = 7, ROWS = 7;
const X0 = 0.12, CW = 0.76 / COLS, BH = 0.104, YG = 1.085;
const TRAY = 1.25;
/** ▶ 버티기 단추 */
const GO = { x0: 0.6, x1: 0.97, y0: TRAY + 0.018, y1: A - 0.018 };

// ───────────────────────────── 블록 ─────────────────────────────
/** J 젤리 · W 나무 · S 돌 · D 흔들추 · H 앵무새 집 */
export type Kind = 'J' | 'W' | 'S' | 'D' | 'H';
export type Shake = 'side' | 'up' | 'spin';
const WEIGHT: Record<Kind, number> = { J: 1, W: 1, S: 3, D: 2, H: 1 };
/** 위로 전하는 흔들림 (젤리는 반 넘게 먹는다) */
const PASS: Record<Kind, number> = { J: 0.45, W: 1, S: 1, D: 1, H: 1 };
/** 버팀: 옆·회전 / 위아래, 그리고 부서질 때까지 금 수 */
const HOLD_SIDE: Record<Kind, number> = { J: 3.0, W: 2.4, S: 5.0, D: 5.0, H: 99 };
const HOLD_UP: Record<Kind, number> = { J: 1.4, W: 3.2, S: 8.0, D: 7.0, H: 99 };
const CRACKS: Record<Kind, number> = { J: 2, W: 3, S: 2, D: 2, H: 99 };
/** 흔들추가 든 기둥은 옆·회전 흔들림이 준다 — 높이 달수록 더 (진짜 고층 건물의 흔들추처럼) */
export const damp = (r: number) => Math.max(0.3, 1 - 0.13 * (r + 1));
export const NAME: Record<Kind, string> = { J: '젤리', W: '나무', S: '돌', D: '흔들추', H: '앵무새 집' };

/** 땅: 1 보통 · 모래 1.5 · 바위 0.65 */
const SAND = 1.5, ROCK = 0.65;

export interface Block { k: Kind; cr: number; id: number; worry: number }
export interface QDef { mag: number; kind: Shake; fast: boolean }
interface Beat { at: number; a: number; kind: Shake; fast: boolean; sign: number; len: number; q: number }
interface StageDef { q: QDef[]; pieces: string; G: number; ground?: boolean }

export const STAGES: StageDef[] = [
  { q: [{ mag: 3, kind: 'side', fast: false }], pieces: 'JWWW', G: 2 },
  { q: [{ mag: 4, kind: 'side', fast: false }], pieces: 'WSWJWSW', G: 3 },
  { q: [{ mag: 4, kind: 'up', fast: false }], pieces: 'SJWSWWJ', G: 3 },
  { q: [{ mag: 5, kind: 'spin', fast: false }], pieces: 'WJSWWSWW', G: 3 },
  { q: [{ mag: 5, kind: 'side', fast: true }], pieces: 'SWWSJWWS', G: 4 },
  { q: [{ mag: 5, kind: 'side', fast: false }], pieces: 'WSJWWSWW', G: 4, ground: true },
  { q: [{ mag: 5, kind: 'side', fast: false }, { mag: 4, kind: 'up', fast: true }], pieces: 'SJWWSWJWW', G: 4 },
  { q: [{ mag: 6, kind: 'side', fast: false }], pieces: 'SWDWJWWSW', G: 4 },
  { q: [{ mag: 6, kind: 'spin', fast: true }, { mag: 5, kind: 'up', fast: false }], pieces: 'SJWDWSWJWW', G: 4, ground: true },
];

/** 규모 → 가장 센 박자의 세기 */
const amp = (mag: number) => 0.35 * mag - 0.25;
const SLOW_N = 6, SLOW_P = 50, FAST_N = 13, FAST_P = 22, AFTER_GAP = 60;
/** 높이에 따른 흔들림: 출렁(느림)은 높을수록, 덜덜(빠름)은 낮을수록 크다 */
export const hgt = (r: number, fast: boolean) => (fast ? Math.max(0.55, 1.25 - 0.1 * r) : 1 + 0.12 * r);
/** 회전 지진: 가장자리 기둥일수록 크게 */
export const edge = (c: number) => 0.45 + 0.35 * Math.abs(c - 3);

/** 예보를 박자 목록으로 (지진계 선과 실제 흔들림이 같은 목록) */
export function beatsOf(q: QDef[]): Beat[] {
  const out: Beat[] = [];
  let at = 0;
  q.forEach((d, qi) => {
    const n = d.fast ? FAST_N : SLOW_N, p = d.fast ? FAST_P : SLOW_P, pk = amp(d.mag) * (d.fast ? 0.62 : 1);
    for (let k = 0; k < n; k++) {
      const env = Math.pow(Math.sin((Math.PI * (k + 0.5)) / n), 0.6);
      out.push({ at, a: pk * env, kind: d.kind, fast: d.fast, sign: k % 2 ? -1 : 1, len: p, q: qi });
      at += p;
    }
    at += AFTER_GAP;
  });
  return out;
}
const shakeLen = (b: Beat[]) => (b.length ? b[b.length - 1].at + b[b.length - 1].len : 0);

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; c: number; r: number; text?: string }
export interface Debris { k: Kind; x: number; y: number; vx: number; vy: number; rot: number; vr: number; life: number; cr: number }
export type Phase = 'build' | 'warn' | 'shake' | 'settle' | 'result';
export interface QuakeState {
  rng: Rng; t: number; stage: number; phase: Phase; pt: number;
  cols: Block[][]; hc: number; ground: number[]; queue: Kind[]; qi: number; G: number; q: QDef[]; beats: Beat[]; bi: number;
  down: boolean; taps: number; fore: number; nid: number; attempt: number;
  fell: boolean; broke: number; cracks: number; ok: boolean; got: number; why: string;
  parrot: { x: number; y: number; vx: number; vy: number; rot: number; on: boolean };
  debris: Debris[];
  hearts: number; stars: number; pts: number; cleared: number; won: boolean; dead: boolean;
  /** 새것 알림: 한꺼번에 생기면 줄을 서서 차례로 (하나에 NEWS틱) */
  seen: Set<string>; events: Ev[]; news: { text: string; t: number }[];
  /** 판마다 시드로 정한 조각 순서·땅 (다시 할 때도 같은 판) */
  plan: { pieces: Kind[]; ground: number[] }[];
}

const NEWS = 170;
const ev = (s: QuakeState, kind: string, c = -1, r = -1, text?: string) => s.events.push({ t: s.t, kind, c, r, text });
function see(s: QuakeState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  const last = s.news.at(-1);
  s.news.push({ text, t: Math.max(s.t, last ? last.t + NEWS : 0) });
}

/** 앵무새 집 높이 (집 밑 블록 수) */
export const houseRow = (cols: Block[][], hc: number) => cols[hc].length - 1;

function braced(cols: Block[][], c: number, r: number) {
  return 1 + (c > 0 && cols[c - 1].length > r ? 1 : 0) + (c < COLS - 1 && cols[c + 1].length > r ? 1 : 0);
}

/** 기둥마다 칸마다 느끼는 흔들림 */
function feltOf(cols: Block[][], ground: number[], c: number, b: { a: number; kind: Shake; fast: boolean }): number[] {
  const col = cols[c];
  let f = b.a * ground[c] * (b.kind === 'spin' ? edge(c) : 1);
  if (b.kind !== 'up') for (let r = 0; r < col.length; r++) if (col[r].k === 'D') f *= damp(r);
  const out: number[] = [];
  for (let r = 0; r < col.length; r++) {
    out.push(f * hgt(r, b.fast));
    f *= PASS[col[r].k];
  }
  return out;
}

/** 박자 하나: 블록마다 '위에 얹힌 무게 × 흔들림 ÷ 받침'을 버팀과 견준다. 금·부서짐을 매긴다 (봇의 시뮬레이션도 이 함수) */
export function hit(cols: Block[][], ground: number[], b: { a: number; kind: Shake; fast: boolean }, onCrack?: (c: number, r: number, broke: boolean) => void): number[] {
  const cut: number[] = Array(COLS).fill(-1);
  for (let c = 0; c < COLS; c++) {
    const col = cols[c];
    if (!col.length) continue;
    const felt = feltOf(cols, ground, c, b);
    let L = 0;
    for (let r = col.length - 1; r >= 0; r--) {
      const x = col[r];
      if (x.k !== 'H') {
        const force = b.kind === 'up' ? L : L / braced(cols, c, r);
        const hold = b.kind === 'up' ? HOLD_UP[x.k] : HOLD_SIDE[x.k];
        if (force > hold) {
          x.cr++;
          const br = x.cr >= CRACKS[x.k];
          if (br) cut[c] = r;
          onCrack?.(c, r, br);
        }
      }
      L += WEIGHT[x.k] * felt[r];
    }
  }
  return cut;
}

/** 블록 얼굴: 예보한 지진을 지금 판으로 미리 견뎌 본 가장 큰 힘 ÷ 버팀 (금이 몇 번 갈지까지) */
export function worries(cols: Block[][], ground: number[], beats: Beat[]) {
  const mx = cols.map((col) => col.map(() => 0)), n = cols.map((col) => col.map(() => 0));
  for (const b of beats) {
    for (let c = 0; c < COLS; c++) {
      const col = cols[c];
      if (!col.length) continue;
      const felt = feltOf(cols, ground, c, b);
      let L = 0;
      for (let r = col.length - 1; r >= 0; r--) {
        const x = col[r];
        if (x.k !== 'H') {
          const force = b.kind === 'up' ? L : L / braced(cols, c, r), hold = b.kind === 'up' ? HOLD_UP[x.k] : HOLD_SIDE[x.k];
          mx[c][r] = Math.max(mx[c][r], force / hold);
          if (force > hold) n[c][r]++;
        }
        L += WEIGHT[x.k] * felt[r];
      }
    }
  }
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < cols[c].length; r++) {
      const x = cols[c][r];
      // 0~1 여유·빠듯, 1~2 금 간다, 2 이상 부서진다
      x.worry = x.k === 'H' ? 0 : n[c][r] + x.cr >= CRACKS[x.k] ? 2 + Math.min(1, mx[c][r] - 1) : n[c][r] > 0 ? 1 + Math.min(0.99, mx[c][r] - 1) : mx[c][r];
    }
}

export interface Outcome { fell: boolean; broke: number; cracks: number; row: number; lasted: number }
/** 지금 판을 끝까지 흔들어 본다 (봇이 후보 배치를 시험할 때) */
export function simulate(cols0: Block[][], hc: number, ground: number[], beats: Beat[]): Outcome {
  const cols = cols0.map((col) => col.map((x) => ({ ...x })));
  const row = houseRow(cols, hc);
  let broke = 0, cracks = 0, fell = false, lasted = 0;
  for (const b of beats) {
    lasted++;
    const cut = hit(cols, ground, b, () => cracks++);
    for (let c = 0; c < COLS; c++) {
      if (cut[c] < 0) continue;
      const gone = cols[c].splice(cut[c]);
      broke += gone.length;
      if (gone.some((x) => x.k === 'H')) fell = true;
    }
    if (fell) break;
  }
  return { fell, broke, cracks, row, lasted: fell ? lasted / beats.length : 1 };
}

// ───────────────────────────── 판 진행 ─────────────────────────────
const WARN = 50, SETTLE = 50, RESULT = 150, FORE = 50;

function planFor(r: Rng): QuakeState['plan'] {
  return STAGES.map((d, i) => {
    const p = d.pieces.split('') as Kind[];
    // 2판부터: 조각 순서를 조금 섞는다 (첫 조각은 그대로)
    if (i > 0)
      for (let k = 0; k < 2; k++) {
        const a = 1 + Math.floor(r() * (p.length - 2));
        [p[a], p[a + 1]] = [p[a + 1], p[a]];
      }
    const ground = Array(COLS).fill(1);
    if (d.ground) {
      // 모래 둘·바위 둘 (자리는 시드마다)
      const order = [0, 1, 2, 3, 4, 5, 6];
      for (let k = order.length - 1; k > 0; k--) {
        const j = Math.floor(r() * (k + 1));
        [order[k], order[j]] = [order[j], order[k]];
      }
      order.slice(0, 2).forEach((c) => (ground[c] = SAND));
      order.slice(2, 4).forEach((c) => (ground[c] = ROCK));
    }
    return { pieces: p, ground };
  });
}

export function startStage(s: QuakeState) {
  const d = STAGES[s.stage], p = s.plan[s.stage];
  s.phase = 'build';
  s.pt = 0;
  s.cols = Array.from({ length: COLS }, () => [] as Block[]);
  s.hc = 3;
  s.cols[3].push({ k: 'H', cr: 0, id: s.nid++, worry: 0 });
  s.ground = p.ground.slice();
  s.queue = p.pieces.slice();
  s.qi = 0;
  s.G = d.G;
  s.q = d.q;
  s.beats = beatsOf(d.q);
  s.bi = 0;
  s.fore = 0;
  s.fell = false;
  s.broke = 0;
  s.cracks = 0;
  s.ok = false;
  s.got = 0;
  s.why = '';
  s.parrot = { x: 0, y: 0, vx: 0, vy: 0, rot: 0, on: true };
  s.debris = [];
  const q0 = d.q[0];
  if (q0.kind === 'side' && !q0.fast) see(s, 'side', '↔ 옆 지진 — 높고 가늘수록 크게 흔들려요');
  if (q0.kind === 'up') see(s, 'up', '↕ 위아래 지진 — 무거운 걸 인 블록이 눌려요 · 젤리는 납작!');
  if (q0.kind === 'spin') see(s, 'spin', '↻ 회전 지진 — 가장자리 기둥일수록 크게 흔들려요');
  if (q0.fast) see(s, 'fast', '〰 빠른 덜덜 — 낮은 칸이 더 떨려요, 오히려 높게!');
  if (d.ground) see(s, 'ground', '🏖️ 모래 땅은 더 흔들리고, 🪨 바위 땅은 덜 흔들려요');
  if (d.q.length > 1) see(s, 'after', '⚡ 여진 — 본진 다음에 다른 흔들림이 한 번 더!');
  if (s.queue.includes('D')) see(s, 'damper', '🔔 흔들추 — 높이 달수록 그 기둥 전체가 덜 흔들려요');
  if (s.queue.includes('S')) see(s, 'stone', '🪨 돌 — 무겁고 단단해요, 높이 두면 아래가 힘들어요');
  if (s.queue.includes('J')) see(s, 'jelly', '🟩 젤리 — 흔들림을 말랑하게 먹어요');
  worries(s.cols, s.ground, s.beats);
  ev(s, 'stage', 3, 0, `${s.stage + 1}판`);
}

/** 기둥 c에 다음 조각 쿵 */
export function place(cols: Block[][], hc: number, c: number, k: Kind, id: number): number {
  if (c === hc) cols[c].splice(cols[c].length - 1, 0, { k, cr: 0, id, worry: 0 });
  else cols[c].push({ k, cr: 0, id, worry: 0 });
  // 다른 기둥이 집 기둥보다 높아지면 앵무새가 그리로 폴짝
  if (c !== hc && cols[c].length > cols[hc].length - 1) {
    const h = cols[hc].pop()!;
    cols[c].push(h);
    return c;
  }
  return hc;
}

function drop(s: QuakeState, c: number) {
  if (s.qi >= s.queue.length) return;
  if (s.cols[c].length >= ROWS + (c === s.hc ? 1 : 0)) return void ev(s, 'full', c, ROWS - 1, '더는 못 쌓아요');
  const k = s.queue[s.qi++], before = s.hc;
  s.hc = place(s.cols, s.hc, c, k, s.nid++);
  s.taps++;
  const r = c === s.hc ? s.cols[c].length - 2 : s.cols[c].length - 1;
  ev(s, 'place', c, r, k);
  if (s.hc !== before) ev(s, 'hop', s.hc, s.cols[s.hc].length - 1, '폴짝!'), see(s, 'hop', '🦜 앵무새는 가장 높은 기둥으로 폴짝 이사해요');
  else if (c === s.hc) ev(s, 'lift', c, s.cols[c].length - 1);
  if (s.stage > 0 && ((c > 0 && s.cols[c - 1].length > r) || (c < COLS - 1 && s.cols[c + 1].length > r))) see(s, 'brace', '🤝 같은 높이에 옆 블록이 붙으면 서로 받쳐 줘요 (옆·회전)');
  worries(s.cols, s.ground, s.beats);
  // 판의 첫 조각: 작은 전진이 미리 한 번 (첫 3초의 큰 일 — 젤리가 푸딩처럼 출렁)
  if (s.qi === 1) (s.fore = FORE), ev(s, 'fore', 3, 0, '흔들!');
  if (s.qi >= s.queue.length) startShake(s);
}

function startShake(s: QuakeState) {
  s.phase = 'warn';
  s.pt = 0;
  ev(s, 'warn', 3, 0, '쿠르릉…');
}

function finish(s: QuakeState) {
  const row = houseRow(s.cols, s.hc);
  s.phase = 'result';
  s.pt = 0;
  if (s.fell || row < s.G) {
    s.ok = false;
    s.why = s.fell ? '와르르! 앵무새 집이 떨어졌어요' : `깃발(${s.G}층)까지 못 올렸어요`;
    s.hearts--;
    ev(s, 'fail', s.hc, row, s.why);
    return;
  }
  s.ok = true;
  const st = 1 + (row >= s.G + 1 ? 1 : 0) + (s.broke === 0 ? 1 : 0);
  s.got = st;
  s.stars += st;
  s.cleared++;
  s.pts += st * 10 + 10;
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 30);
  ev(s, 'clear', s.hc, row, `${s.stage + 1}판 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
}

function stepDebris(s: QuakeState) {
  for (const d of s.debris) {
    d.vy += 0.0016;
    d.x += d.vx;
    d.y += d.vy;
    d.rot += d.vr;
    if (d.y > YG - BH / 2 && d.vy > 0 && d.x > 0.02 && d.x < 0.98) (d.y = YG - BH / 2), (d.vy *= -0.35), (d.vx *= 0.7), (d.vr *= 0.6);
    d.life--;
  }
  s.debris = s.debris.filter((d) => d.life > 0);
  const p = s.parrot;
  if (!p.on) {
    p.vy += 0.0015;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vx * 30;
    if (p.x < 0.14 || p.x > 0.86) (p.x = Math.max(0.14, Math.min(0.86, p.x))), (p.vx *= -0.5);
    if (p.y > YG - 0.02 && p.vy > 0) (p.y = YG - 0.02), (p.vy = Math.abs(p.vy) < 0.004 ? 0 : p.vy * -0.3), (p.vx *= 0.6);
  }
}

function applyBeat(s: QuakeState, b: Beat) {
  const cut = hit(s.cols, s.ground, b, (c, r, br) => {
    s.cracks++;
    const x = s.cols[c][r];
    if (x.k === 'J' && br) ev(s, 'squish', c, r, '퍽!');
    else if (!br) ev(s, 'crack', c, r, x.k === 'W' ? '삐걱!' : x.k === 'J' ? '찌익' : '쩍!');
    see(s, 'crack', '⚡ 금! 금이 쌓이면 부서지고 그 위는 와르르');
  });
  ev(s, 'beat', 3, 0, b.a.toFixed(2));
  for (let c = 0; c < COLS; c++) {
    if (cut[c] < 0) continue;
    const gone = s.cols[c].splice(cut[c]);
    s.broke += gone.length;
    ev(s, 'break', c, cut[c], gone.length > 1 ? '와르르!' : '와장창');
    gone.forEach((x, i) => {
      const dir = b.kind === 'up' ? (i % 2 ? 1 : -1) : b.sign;
      if (x.k === 'H') {
        s.fell = true;
        const p = s.parrot;
        p.on = false;
        p.x = X0 + (c + 0.5) * CW;
        p.y = YG - (cut[c] + i + 1.2) * BH;
        p.vx = dir * (0.006 + 0.002 * i);
        p.vy = -0.012;
        ev(s, 'fall', c, cut[c] + i, '꺄악!');
        return;
      }
      if (i === 0) return; // 부서진 블록은 조각조각 (그리기에서 파편)
      s.debris.push({ k: x.k, x: X0 + (c + 0.5) * CW, y: YG - (cut[c] + i + 0.5) * BH, vx: dir * (0.004 + 0.0025 * i), vy: -0.004 - 0.002 * i, rot: 0, vr: dir * (0.05 + 0.02 * i), life: 160, cr: x.cr });
    });
  }
  worries(s.cols, s.ground, s.beats.slice(s.bi + 1));
}

// ───────────────────────────── 게임 ─────────────────────────────
function tapAt(s: QuakeState, x: number, y: number) {
  if (s.phase !== 'build') return;
  if (x >= GO.x0 && x <= GO.x1 && y >= GO.y0 && y <= GO.y1) {
    if (houseRow(s.cols, s.hc) >= s.G) return void startShake(s);
    return void ev(s, 'nogo', s.hc, houseRow(s.cols, s.hc), `깃발 ${s.G}층까지 쌓아야 해요`);
  }
  if (y < 0.3 || y > TRAY || x < X0 - 0.03 || x > X0 + COLS * CW + 0.03) return;
  const c = Math.max(0, Math.min(COLS - 1, Math.floor((x - X0) / CW)));
  drop(s, c);
}

export const quake: GameDef<QuakeState> = {
  id: 'quake',
  name: '흔들흔들 지진 탑',
  genes: ['fortify', 'stack', 'forecast'],
  twist: '지진 예보(규모·방향·박자)를 보고 젤리·나무·돌을 톡톡 쌓아 꼭대기 앵무새 집을 지킨다 — 바닥의 젤리 한 칸이 옆 지진은 말랑하게 먹어 주지만 위아래 지진엔 무게에 눌려 퍽 터져서, 같은 블록도 예보에 따라 놓을 자리가 정반대가 된다',
  rules: [
    '기둥을 톡 = 블록이 그 꼭대기에 쿵. 앵무새는 가장 높은 기둥으로 이사해요.',
    '젤리는 흔들림을 먹지만 무거운 건 못 받쳐요. 돌은 무겁고 단단. 옆에 붙은 블록은 서로 받쳐요.',
    '집을 🚩깃발 높이까지 올리고 지진을 버티면 별! 부서진 블록 위는 와르르.',
  ],
  controls: 'touch',
  hint: '기둥을 톡 = 블록 쌓기 · ▶ 버티기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '작은 마을 광장 단면 디오라마 위 지진 탑',
    mood: '흙층이 드러난 두툼한 땅 덩어리 위의 조그만 광장. 젤리·나무 상자·돌 블록이 얼굴을 하고 쌓여 있고, 꼭대기 새집에서 앵무새가 탑을 꼭 끌어안는다. 지진계 바늘이 떨면 광장 타일이 들썩이고, 지팡이 할머니와 강아지가 덜덜, 해가 기울면 가로등과 창문이 켜진다.',
    palette: { bg: '#1d2b3a', ink: '#fff8ee', muted: '#8aa0b4', accent: '#7ee0a0', hot: '#ff6b5a', soft: '#34495e' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, t: 0, stage: 0, phase: 'build', pt: 0, cols: [], hc: 3, ground: [], queue: [], qi: 0, G: 2, q: [], beats: [], bi: 0,
      down: false, taps: 0, fore: 0, nid: 1, attempt: 0, fell: false, broke: 0, cracks: 0, ok: false, got: 0, why: '',
      parrot: { x: 0, y: 0, vx: 0, vy: 0, rot: 0, on: true }, debris: [],
      hearts: 3, stars: 0, pts: 0, cleared: 0, won: false, dead: false, seen: new Set<string>(), events: [], news: [], plan: planFor(rng),
    } as QuakeState;
    startStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t <= 120);
    if (s.news.length && s.t - s.news[0].t > NEWS) s.news.shift();
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.dead) return;
    if (s.fore > 0) {
      s.fore--;
      if (s.fore === 0 && s.phase === 'build') {
        const under = s.cols[s.hc][s.cols[s.hc].length - 2];
        ev(s, 'phew', s.hc, houseRow(s.cols, s.hc), under?.k === 'J' ? '휴~ 말랑말랑' : '휴~');
      }
    }
    stepDebris(s);
    if (s.phase === 'build') {
      if (press && p) tapAt(s, p.x, p.y * A);
      return;
    }
    if (s.phase === 'warn') {
      if (s.pt >= WARN) (s.phase = 'shake'), (s.pt = 0), (s.bi = 0), ev(s, 'go', 3, 0);
      return;
    }
    if (s.phase === 'shake') {
      while (s.bi < s.beats.length && s.beats[s.bi].at <= s.pt) {
        applyBeat(s, s.beats[s.bi]);
        s.bi++;
        if (s.fell) break;
      }
      if (s.fell || s.pt >= shakeLen(s.beats)) (s.phase = 'settle'), (s.pt = 0);
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= (s.fell ? SETTLE * 2 : SETTLE)) finish(s);
      return;
    }
    if (s.phase === 'result' && s.pt >= RESULT) {
      if (!s.ok) {
        if (s.hearts <= 0) return void (s.dead = true);
        s.attempt++;
        startStage(s);
        ev(s, 'retry', 3, 0, `${s.stage + 1}판 다시 짓기`);
        return;
      }
      if (s.won) return void (s.dead = true);
      s.stage++;
      s.attempt = 0;
      startStage(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const cl = (x: number) => Math.max(0, Math.min(1, x));
const rgb = (c: string) => (c[0] === '#' ? [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) : c.slice(4, -1).split(',').map(Number));
const mix = (a: string, b: string, t: number) => {
  const p = rgb(a), q = rgb(b), u = cl(t);
  return `rgb(${p.map((v, k) => Math.round(v + (q[k] - v) * u)).join(',')})`;
};
/** 블록 색: 앞면 · 윗면 · 옆면 */
const KCOL: Record<Kind, [string, string, string]> = {
  J: ['#7fe8a8', '#b8ffd2', '#3fb578'],
  W: ['#dfa465', '#f2c58e', '#a86d35'],
  S: ['#aab3bc', '#d0d6dc', '#78808a'],
  D: ['#cfeaff', '#eef8ff', '#8fb8d8'],
  H: ['#ffe2a0', '#fff0c8', '#d6a95c'],
};
/** 3/4 시점의 깊이 (블록 윗면·옆면이 오른쪽 위로) */
const DX = 0.022, DY = -0.024;
const SL0 = 0.03, SL1 = 0.93, SLB = 1.22;

interface Gnd { d: number; kind: Shake; fast: boolean }
/** 지금 땅이 얼마나 밀렸나 — 그리기 전용 (박자 하나 = 반 물결) */
function groundNow(s: QuakeState): Gnd {
  const q0 = s.q[0] ?? { kind: 'side' as Shake, fast: false };
  if (s.phase === 'shake') {
    for (let j = Math.max(0, s.bi - 2); j < s.beats.length; j++) {
      const b = s.beats[j];
      if (s.pt >= b.at && s.pt < b.at + b.len) return { d: b.sign * b.a * Math.sin((Math.PI * (s.pt - b.at)) / b.len), kind: b.kind, fast: b.fast };
      if (b.at > s.pt) break;
    }
    return { d: 0, kind: q0.kind, fast: q0.fast };
  }
  if (s.phase === 'warn') return { d: 0.07 * Math.sin(s.pt * 1.7) * (s.pt / WARN), kind: q0.kind, fast: true };
  if (s.fore > 0) {
    const u = 1 - s.fore / FORE;
    return { d: 1.1 * Math.sin(u * Math.PI * 6) * (1 - u), kind: q0.kind, fast: q0.fast };
  }
  if (s.phase === 'settle' && !s.fell) return { d: 0.18 * Math.sin(s.pt / 3) * Math.exp(-s.pt / 14), kind: s.beats.at(-1)?.kind ?? 'side', fast: false };
  return { d: 0, kind: q0.kind, fast: q0.fast };
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** 블록 얼굴: 걱정(0 여유 · 1 금 간다 · 2 부서진다) */
function face(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, worry: number, t: number, k: Kind, wince: boolean) {
  const ink = k === 'S' ? '#2c3238' : k === 'J' ? '#14573a' : k === 'D' ? '#24435c' : '#4a2a10';
  const ex = z * 0.42, ey = -z * 0.12;
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.4, z * 0.13);
  ctx.lineCap = 'round';
  const blink = Math.sin(t / 37 + x) > 0.985;
  if (wince) {
    // > <
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * ex - sx * z * 0.16, y + ey - z * 0.14);
      ctx.lineTo(x + sx * ex + sx * z * 0.08, y + ey);
      ctx.lineTo(x + sx * ex - sx * z * 0.16, y + ey + z * 0.14);
      ctx.stroke();
    }
  } else if (worry >= 1) {
    // 휘둥그레
    const er = z * (worry >= 2 ? 0.27 : 0.22);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx * ex, y + ey, er, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(x + sx * ex + Math.sin(t / 5) * er * 0.25, y + ey + er * 0.1, er * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (blink || (worry < 0.35 && k === 'J')) {
    // ^ ^
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * ex, y + ey + z * 0.05, z * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * ex, y + ey, z * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 입
  ctx.beginPath();
  const my = y + z * 0.3;
  if (worry >= 2) {
    // 지그재그 덜덜
    ctx.moveTo(x - z * 0.32, my);
    for (let i = 1; i <= 4; i++) ctx.lineTo(x - z * 0.32 + i * z * 0.16, my + (i % 2 ? -1 : 1) * z * 0.08);
    ctx.stroke();
  } else if (worry >= 1) {
    ctx.fillStyle = '#3a1410';
    ctx.ellipse(x, my, z * 0.16, z * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (worry >= 0.6) {
    ctx.moveTo(x - z * 0.22, my);
    ctx.quadraticCurveTo(x - z * 0.08, my - z * 0.1, x, my);
    ctx.quadraticCurveTo(x + z * 0.08, my + z * 0.1, x + z * 0.22, my);
    ctx.stroke();
    // 식은땀
    ctx.fillStyle = 'rgba(120,200,255,.9)';
    ctx.beginPath();
    const sy = y - z * 0.45 + ((t / 2) % 8) * 0.4;
    ctx.moveTo(x + z * 0.7, sy - z * 0.12);
    ctx.quadraticCurveTo(x + z * 0.82, sy + z * 0.05, x + z * 0.7, sy + z * 0.1);
    ctx.quadraticCurveTo(x + z * 0.58, sy + z * 0.05, x + z * 0.7, sy - z * 0.12);
    ctx.fill();
  } else {
    ctx.arc(x, my - z * 0.1, z * 0.22, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // 볼
  if (worry < 1) {
    ctx.fillStyle = k === 'J' ? 'rgba(255,120,150,.35)' : 'rgba(255,110,90,.3)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sx * z * 0.72, y + z * 0.16, z * 0.15, z * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

interface BOpt { worry: number; cr: number; t: number; top: boolean; side: boolean; squash: number; id: number; wince: boolean; swing: number }
/** 블록 하나 (지역 좌표: 앞면 아래 가운데가 원점, 위로 −bh) */
function drawBlock(ctx: CanvasRenderingContext2D, k: Kind, bw: number, bh: number, dx: number, dy: number, o: BOpt) {
  const [cf, ct, cs] = KCOL[k], x0 = -bw / 2, y0 = -bh;
  if (k === 'J') {
    // 푸딩 젤리: 말랑하게 눌리고 늘어난다
    const sq = o.squash, hh = bh * sq, ww = bw * (1 + (1 - sq) * 0.5), x1 = -ww / 2;
    ctx.save();
    ctx.globalAlpha = 0.9;
    if (o.side) {
      ctx.fillStyle = cs;
      ctx.beginPath();
      ctx.moveTo(-x1, -hh + 3);
      ctx.lineTo(-x1 + dx, -hh + dy + 3);
      ctx.lineTo(-x1 + dx, dy);
      ctx.lineTo(-x1, 0);
      ctx.fill();
    }
    if (o.top) {
      ctx.fillStyle = ct;
      ctx.beginPath();
      ctx.moveTo(x1 + 3, -hh);
      ctx.lineTo(x1 + 3 + dx, -hh + dy);
      ctx.lineTo(-x1 + dx - 2, -hh + dy);
      ctx.lineTo(-x1 - 2, -hh);
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, -hh, 0, 0);
    g.addColorStop(0, '#a6f7c6');
    g.addColorStop(1, '#43c47e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x1 + 2, 0);
    ctx.lineTo(x1, -hh * 0.75);
    ctx.quadraticCurveTo(x1, -hh, x1 + ww * 0.2, -hh);
    ctx.lineTo(-x1 - ww * 0.2, -hh);
    ctx.quadraticCurveTo(-x1, -hh, -x1, -hh * 0.75);
    ctx.lineTo(-x1 - 2, 0);
    ctx.closePath();
    ctx.fill();
    // 반짝 + 속 거품
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x1 + ww * 0.24, -hh * 0.72, ww * 0.08, hh * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(x1 + ww * (0.62 + 0.12 * i), -hh * (0.22 + 0.2 * ((i * 7) % 3)), 1.6 + i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // 캐러멜 대신 '말랑' 물결 줄
    ctx.strokeStyle = 'rgba(30,120,70,.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) ctx.lineTo(x1 + 3 + (i / 8) * (ww - 6), -hh * 0.18 + Math.sin(i * 1.6 + o.t / 6) * 1.2);
    ctx.stroke();
    if (o.cr) {
      ctx.strokeStyle = 'rgba(20,80,50,.7)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-ww * 0.1, -hh);
      ctx.lineTo(ww * 0.02, -hh * 0.6);
      ctx.lineTo(-ww * 0.06, -hh * 0.35);
      ctx.stroke();
    }
    face(ctx, 0, -hh * 0.5, Math.min(bw, hh) * 0.36, o.worry, o.t, k, o.wince);
    return;
  }
  // 옆면·윗면 (깊이)
  if (o.side) {
    ctx.fillStyle = cs;
    ctx.beginPath();
    ctx.moveTo(-x0, y0);
    ctx.lineTo(-x0 + dx, y0 + dy);
    ctx.lineTo(-x0 + dx, dy);
    ctx.lineTo(-x0, 0);
    ctx.fill();
  }
  if (o.top && k !== 'H') {
    ctx.fillStyle = ct;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + dx, y0 + dy);
    ctx.lineTo(-x0 + dx, y0 + dy);
    ctx.lineTo(-x0, y0);
    ctx.fill();
  }
  if (k === 'W') {
    // 나무 상자: 틀 + 판자 + 대각 버팀 + 못
    ctx.fillStyle = cf;
    ctx.fillRect(x0, y0, bw, bh);
    ctx.strokeStyle = 'rgba(120,70,30,.45)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x0, y0 + (bh * i) / 3);
      ctx.lineTo(-x0, y0 + (bh * i) / 3);
      ctx.stroke();
    }
    ctx.strokeStyle = '#a0632e';
    ctx.lineWidth = Math.max(2.5, bw * 0.08);
    ctx.strokeRect(x0 + ctx.lineWidth / 2, y0 + ctx.lineWidth / 2, bw - ctx.lineWidth, bh - ctx.lineWidth);
    ctx.fillStyle = '#6b3d18';
    for (const [px, py] of [[x0 + 4, y0 + 4], [-x0 - 4, y0 + 4], [x0 + 4, -4], [-x0 - 4, -4]]) ctx.fillRect(px - 1, py - 1, 2, 2);
  } else if (k === 'S') {
    const g = ctx.createLinearGradient(0, y0, 0, 0);
    g.addColorStop(0, '#bcc4cc');
    g.addColorStop(1, '#949ca6');
    ctx.fillStyle = g;
    rr(ctx, x0, y0, bw, bh, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,66,74,.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + bh / 2);
    ctx.lineTo(-x0, y0 + bh / 2);
    ctx.moveTo(x0 + bw * 0.32, y0);
    ctx.lineTo(x0 + bw * 0.32, y0 + bh / 2);
    ctx.moveTo(x0 + bw * 0.7, y0 + bh / 2);
    ctx.lineTo(x0 + bw * 0.7, 0);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.fillRect(x0 + 3, y0 + 2, bw * 0.25, 2);
    // 이끼 한 줌
    ctx.fillStyle = '#7fb35a';
    ctx.beginPath();
    ctx.ellipse(x0 + bw * 0.16, y0 + 2, bw * 0.12, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (k === 'D') {
    // 흔들추: 유리 상자 속 금빛 추가 반대로 흔들린다
    ctx.fillStyle = 'rgba(200,235,255,.55)';
    ctx.fillRect(x0, y0, bw, bh);
    ctx.strokeStyle = '#4c6a86';
    ctx.lineWidth = 2.4;
    ctx.strokeRect(x0 + 1.2, y0 + 1.2, bw - 2.4, bh - 2.4);
    const ang = o.swing, px = Math.sin(ang) * bh * 0.55, py = y0 + 4 + Math.cos(ang) * bh * 0.55;
    ctx.strokeStyle = '#8a6a20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, y0 + 4);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.fillStyle = '#ffcf4a';
    ctx.shadowColor = '#ffd56a';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(px, py, bh * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(x0 + 4, y0 + 4, 3, bh - 8);
  } else if (k === 'H') {
    // 앵무새 집: 벽 + 동그란 문 + 횃대 + 지붕
    const hw = bw * 0.78, hx = -hw / 2;
    ctx.fillStyle = cs;
    ctx.beginPath();
    ctx.moveTo(-hx, y0 + bh * 0.25);
    ctx.lineTo(-hx + dx, y0 + bh * 0.25 + dy);
    ctx.lineTo(-hx + dx, dy);
    ctx.lineTo(-hx, 0);
    ctx.fill();
    ctx.fillStyle = cf;
    ctx.fillRect(hx, y0 + bh * 0.25, hw, bh * 0.75);
    ctx.strokeStyle = 'rgba(150,100,40,.35)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(hx + (hw * i) / 4, y0 + bh * 0.3);
      ctx.lineTo(hx + (hw * i) / 4, 0);
      ctx.stroke();
    }
    ctx.fillStyle = '#3a2416';
    ctx.beginPath();
    ctx.arc(0, y0 + bh * 0.62, bh * 0.17, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-bh * 0.12, y0 + bh * 0.9);
    ctx.lineTo(bh * 0.12, y0 + bh * 0.9);
    ctx.stroke();
    // 지붕 (청록 삼각 지붕 + 옆 비탈)
    ctx.fillStyle = '#23808f';
    ctx.beginPath();
    ctx.moveTo(bw * 0.5, y0 + bh * 0.3);
    ctx.lineTo(bw * 0.5 + dx, y0 + bh * 0.3 + dy);
    ctx.lineTo(dx, y0 - bh * 0.22 + dy);
    ctx.lineTo(0, y0 - bh * 0.22);
    ctx.fill();
    ctx.fillStyle = '#36b3c4';
    ctx.beginPath();
    ctx.moveTo(-bw * 0.55, y0 + bh * 0.32);
    ctx.lineTo(0, y0 - bh * 0.22);
    ctx.lineTo(bw * 0.55, y0 + bh * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1d6c78';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    return;
  }
  // 금 (블록마다 자리가 다르다)
  for (let i = 0; i < o.cr; i++) {
    const sx = x0 + bw * (0.2 + 0.6 * hsh(o.id * 3 + i)), dir = hsh(o.id * 5 + i) > 0.5 ? 1 : -1;
    ctx.strokeStyle = 'rgba(30,20,15,.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sx, y0);
    ctx.lineTo(sx + dir * bw * 0.08, y0 + bh * 0.3);
    ctx.lineTo(sx - dir * bw * 0.04, y0 + bh * 0.5);
    ctx.lineTo(sx + dir * bw * 0.1, y0 + bh * 0.8);
    ctx.stroke();
  }
  face(ctx, 0, y0 + bh * 0.52, Math.min(bw, bh) * 0.34, o.worry, o.t, k, o.wince);
}

type Mood = 'calm' | 'worry' | 'scream' | 'phew' | 'proud' | 'fall' | 'dizzy';
/** 앵무새 (연두 몸 · 노란 얼굴 · 파란 날개 끝). hug: 지붕을 꼭 끌어안기 */
function drawParrot(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: Mood, t: number, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const hug = mood === 'worry' || mood === 'scream';
  const up = mood === 'dizzy';
  if (up) ctx.translate(0, -z * 1.25), ctx.scale(1, -1);
  const bob = mood === 'calm' ? Math.sin(t / 14) * z * 0.04 : mood === 'proud' ? -Math.abs(Math.sin(t / 6)) * z * 0.15 : 0;
  ctx.translate(0, bob);
  // 꼬리
  ctx.fillStyle = '#2f86d6';
  ctx.beginPath();
  ctx.moveTo(-z * 0.2, -z * 0.25);
  ctx.lineTo(-z * 0.75, z * 0.25 + Math.sin(t / 6) * z * 0.05);
  ctx.lineTo(-z * 0.45, -z * 0.05);
  ctx.fill();
  // 몸
  const g = ctx.createRadialGradient(-z * 0.1, -z * 0.6, z * 0.1, 0, -z * 0.45, z * 0.6);
  g.addColorStop(0, '#8af06e');
  g.addColorStop(1, '#3fb84a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.45, z * 0.38, z * 0.48, hug ? 0.25 : 0, 0, Math.PI * 2);
  ctx.fill();
  // 배
  ctx.fillStyle = '#d6f77a';
  ctx.beginPath();
  ctx.ellipse(z * 0.1, -z * 0.32, z * 0.2, z * 0.28, 0.2, 0, Math.PI * 2);
  ctx.fill();
  // 머리 (노란 얼굴)
  const hx = z * 0.12, hy = -z * 0.95;
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(hx, hy, z * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4fc85a';
  ctx.beginPath();
  ctx.arc(hx - z * 0.05, hy - z * 0.08, z * 0.3, Math.PI * 1.05, Math.PI * 1.85);
  ctx.fill();
  // 볏 깃털
  ctx.strokeStyle = '#3fb84a';
  ctx.lineWidth = z * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - z * 0.05, hy - z * 0.28);
  ctx.quadraticCurveTo(hx - z * 0.2, hy - z * 0.6, hx - z * 0.32, hy - z * (0.5 + (mood === 'scream' ? 0.25 : 0)));
  ctx.stroke();
  // 볼
  ctx.fillStyle = '#ff9f43';
  ctx.beginPath();
  ctx.arc(hx + z * 0.15, hy + z * 0.1, z * 0.08, 0, Math.PI * 2);
  ctx.fill();
  // 부리 (굽은 상아색)
  ctx.fillStyle = '#f6efe0';
  ctx.beginPath();
  ctx.moveTo(hx + z * 0.22, hy - z * 0.05);
  ctx.quadraticCurveTo(hx + z * 0.5, hy - z * 0.02, hx + z * 0.38, hy + z * (mood === 'scream' ? 0.05 : 0.2));
  ctx.lineTo(hx + z * 0.24, hy + z * 0.08);
  ctx.fill();
  if (mood === 'scream' || mood === 'fall') {
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(hx + z * 0.3, hy + z * 0.14, z * 0.07, z * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6efe0';
    ctx.beginPath();
    ctx.moveTo(hx + z * 0.22, hy + z * 0.17);
    ctx.lineTo(hx + z * 0.36, hy + z * 0.22);
    ctx.lineTo(hx + z * 0.24, hy + z * 0.26);
    ctx.fill();
  }
  // 눈
  const ex = hx + z * 0.08, ey = hy - z * 0.04;
  if (mood === 'phew' || mood === 'proud') {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = z * 0.06;
    ctx.beginPath();
    ctx.arc(ex, ey + z * 0.03, z * 0.07, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else if (mood === 'dizzy') {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = z * 0.05;
    ctx.beginPath();
    for (let a = 0; a < 9; a += 0.4) ctx.lineTo(ex + Math.cos(a + t / 3) * a * z * 0.012, ey + Math.sin(a + t / 3) * a * z * 0.012);
    ctx.stroke();
  } else {
    const er = z * (mood === 'calm' ? 0.08 : 0.13);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(ex + er * 0.25, ey, er * (mood === 'calm' ? 0.7 : 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
  // 날개: 평소엔 접고, 무서우면 지붕을 꼭 안고, 우쭐하면 번쩍
  ctx.fillStyle = '#2f9e44';
  ctx.strokeStyle = '#2f86d6';
  ctx.lineWidth = z * 0.07;
  for (const sd of hug || mood === 'proud' || mood === 'fall' ? [-1, 1] : [-1]) {
    ctx.save();
    ctx.translate(sd * z * 0.18, -z * 0.55);
    const flap = mood === 'fall' ? Math.sin(t * 0.9) * 0.9 : mood === 'proud' ? -1.6 + Math.sin(t / 4) * 0.3 : hug ? 1.15 : 0.25;
    ctx.rotate(sd * flap);
    ctx.beginPath();
    ctx.ellipse(0, z * 0.22, z * 0.13, z * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-z * 0.08, z * 0.42);
    ctx.lineTo(z * 0.08, z * 0.48);
    ctx.stroke();
    ctx.restore();
  }
  // 발 (꼭 움켜쥠)
  ctx.strokeStyle = '#9a7a6a';
  ctx.lineWidth = z * 0.06;
  for (const fx2 of [-0.1, 0.12]) {
    ctx.beginPath();
    ctx.moveTo(fx2 * z, -z * 0.02);
    ctx.lineTo(fx2 * z + z * 0.06, z * 0.06);
    ctx.lineTo(fx2 * z - z * 0.06, z * 0.08);
    ctx.stroke();
  }
  ctx.restore();
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffe066';
    ctx.font = `${z * 0.4}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const a = t / 9 + (i * Math.PI * 2) / 3;
      ctx.fillText('★', x + Math.cos(a) * z * 0.5, y + z * 0.35 + Math.sin(a) * z * 0.15);
    }
  }
}

/** 지팡이 할머니 (덜덜 떨면 머리카락이 곤두선다) */
function drawGranny(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, jig: number, mood: 'calm' | 'shake' | 'cheer' | 'oh', t: number) {
  ctx.save();
  ctx.translate(x + jig * z * 0.15, y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 0.45, z * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  // 지팡이
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = z * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(z * 0.42, 0);
  ctx.lineTo(z * 0.42, -z * 0.9);
  ctx.arc(z * 0.32, -z * 0.9, z * 0.1, 0, Math.PI, true);
  ctx.stroke();
  // 치마
  ctx.fillStyle = '#b36ad1';
  ctx.beginPath();
  ctx.moveTo(-z * 0.32, 0);
  ctx.lineTo(z * 0.3, 0);
  ctx.lineTo(z * 0.18, -z * 0.75);
  ctx.lineTo(-z * 0.2, -z * 0.75);
  ctx.fill();
  // 숄
  ctx.fillStyle = '#ff8fab';
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.78, z * 0.27, z * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  // 팔 (환호하면 번쩍)
  ctx.strokeStyle = '#f2c9a0';
  ctx.lineWidth = z * 0.09;
  ctx.beginPath();
  if (mood === 'cheer') (ctx.moveTo(-z * 0.2, -z * 0.8), ctx.lineTo(-z * 0.38, -z * 1.2 - Math.abs(Math.sin(t / 5)) * z * 0.1));
  else (ctx.moveTo(z * 0.2, -z * 0.78), ctx.lineTo(z * 0.4, -z * 0.8));
  ctx.stroke();
  // 머리
  ctx.fillStyle = '#f7d2ad';
  ctx.beginPath();
  ctx.arc(0, -z * 1.07, z * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#eeeeee';
  ctx.beginPath();
  ctx.arc(-z * 0.02, -z * 1.3, z * 0.15, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 'shake' || mood === 'oh') {
    // 곤두선 머리카락
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = z * 0.05;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * z * 0.06, -z * 1.38);
      ctx.lineTo(i * z * 0.1, -z * 1.55 - Math.abs(Math.sin(t / 2 + i)) * z * 0.06);
      ctx.stroke();
    }
  }
  // 안경 + 입
  ctx.strokeStyle = '#3a2a2a';
  ctx.lineWidth = Math.max(1, z * 0.04);
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sx * z * 0.09, -z * 1.08, z * (mood === 'shake' || mood === 'oh' ? 0.08 : 0.065), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  if (mood === 'oh' || mood === 'shake') ctx.arc(0, -z * 0.93, z * 0.05, 0, Math.PI * 2);
  else ctx.arc(0, -z * 0.97, z * 0.07, Math.PI * 0.15, Math.PI * 0.85);
  ctx.stroke();
  ctx.restore();
}

/** 강아지 (흔들리면 꼬리 대신 온몸이 덜덜, 환호하면 깡충) */
function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, jig: number, mood: 'calm' | 'shake' | 'cheer' | 'oh', t: number) {
  ctx.save();
  const hop = mood === 'cheer' ? -Math.abs(Math.sin(t / 5)) * z * 0.35 : 0;
  ctx.translate(x + jig * z * 0.2, y);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, z * 0.5, z * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(0, hop);
  ctx.scale(-1, 1);
  ctx.fillStyle = '#e8b878';
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.32, z * 0.42, z * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  // 다리
  ctx.strokeStyle = '#d29a5a';
  ctx.lineWidth = z * 0.1;
  ctx.lineCap = 'round';
  for (const lx of [-0.28, -0.1, 0.12, 0.28]) {
    ctx.beginPath();
    ctx.moveTo(lx * z, -z * 0.2);
    ctx.lineTo(lx * z + (mood === 'shake' ? Math.sin(t + lx * 9) * z * 0.05 : 0), 0);
    ctx.stroke();
  }
  // 꼬리
  ctx.beginPath();
  ctx.moveTo(-z * 0.4, -z * 0.4);
  ctx.quadraticCurveTo(-z * 0.6, -z * 0.7, -z * 0.5 + Math.sin(t / (mood === 'cheer' ? 2 : 6)) * z * 0.12, -z * 0.8);
  ctx.stroke();
  // 머리
  ctx.fillStyle = '#efc58c';
  ctx.beginPath();
  ctx.arc(z * 0.4, -z * 0.58, z * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a6a3a';
  ctx.beginPath();
  ctx.ellipse(z * 0.26, -z * 0.62, z * 0.08, z * 0.18, 0.4 + (mood === 'oh' || mood === 'shake' ? -0.9 : 0), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath();
  ctx.arc(z * 0.62, -z * 0.56, z * 0.06, 0, Math.PI * 2);
  ctx.fill();
  const er = z * (mood === 'oh' || mood === 'shake' ? 0.07 : 0.045);
  ctx.beginPath();
  ctx.arc(z * 0.45, -z * 0.64, er, 0, Math.PI * 2);
  ctx.fill();
  if (mood === 'cheer') {
    ctx.fillStyle = '#ff7b8a';
    ctx.beginPath();
    ctx.ellipse(z * 0.55, -z * 0.42, z * 0.05, z * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, hot = false, w = 9999) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size * 0.9, bx = Math.max(4, Math.min(w - tw - 4, x - tw / 2));
  ctx.fillStyle = hot ? 'rgba(255,236,230,.96)' : 'rgba(255,255,255,.95)';
  ctx.beginPath();
  ctx.roundRect(bx, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 4, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.1);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = hot ? '#c0262e' : '#3a2a2a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, y - size * 0.1);
}

/** 작은 블록 그림 (예보 칸·조각 줄) */
function miniBlock(ctx: CanvasRenderingContext2D, k: Kind, x: number, y: number, bw: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  drawBlock(ctx, k, bw, bw * 0.82, bw * 0.16, -bw * 0.18, { worry: 0, cr: 0, t, top: true, side: true, squash: 1 + (k === 'J' ? Math.sin(t / 8) * 0.04 : 0), id: 0, wince: false, swing: Math.sin(t / 15) * 0.5 });
  ctx.restore();
}

const KIND_TXT: Record<Shake, [string, string]> = { side: ['↔', '옆'], up: ['↕', '위아래'], spin: ['↻', '회전'] };

function drawAll(ctx: CanvasRenderingContext2D, s: QuakeState, w: number, h: number, th: Theme) {
  const fx = juice(s), M = fx.memo, R = (x: number) => x * w, t = s.t;
  const gnd = groundNow(s), px = R(0.024) * gnd.d;
  const dusk = cl((s.stage - 4) / 4), night = s.stage >= 8 ? 0.35 : 0;
  const quaking = s.phase === 'shake' || s.phase === 'warn' || s.fore > 0;
  const recent = (kind: string, age: number) => s.events.some((e) => e.kind === kind && s.t - e.t < age);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘: 판이 갈수록 아침 → 한낮 → 노을 → 저녁 ──
  const top = mix(mix('#7cc8f2', '#5a9be0', dusk), '#2a2f66', night), bot = mix(mix('#e3f6ff', '#ffc89a', dusk), '#ff9a76', night);
  const sky = ctx.createLinearGradient(0, 0, 0, R(YG));
  sky.addColorStop(0, top);
  sky.addColorStop(1, bot);
  ctx.fillStyle = sky;
  ctx.fillRect(-20, -20, w + 40, h + 40);
  // 해
  {
    const sx = R(0.82 - 0.5 * cl(s.stage / 8)), sy = R(0.36 + 0.28 * dusk);
    ctx.fillStyle = dusk > 0.5 ? '#ffb070' : '#fff3b0';
    ctx.shadowColor = dusk > 0.5 ? '#ff7a3d' : '#ffe066';
    ctx.shadowBlur = R(0.09);
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.045), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  // 구름
  ctx.fillStyle = `rgba(255,255,255,${0.75 - 0.3 * dusk})`;
  for (let k = 0; k < 3; k++) {
    const cx2 = R(((0.15 + k * 0.38 + t * 0.00012 * (k + 1)) % 1.3) - 0.15), cy2 = R(0.27 + k * 0.05);
    for (const [ox, oy, r2] of [[0, 0, 0.035], [0.035, 0.006, 0.028], [-0.032, 0.008, 0.025]]) {
      ctx.beginPath();
      ctx.arc(cx2 + R(ox), cy2 + R(oy), R(r2), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 먼 언덕 두 겹 (지진 때 살짝 들썩)
  for (const [yy, col, amp2, k] of [[YG - 0.2, '#a8d49a', 0.03, 1], [YG - 0.14, '#86bf78', 0.025, 2]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(col, '#6a5a8a', dusk * 0.6 + night);
    ctx.beginPath();
    ctx.moveTo(-10, R(YG));
    for (let x = -0.02; x <= 1.04; x += 0.04) ctx.lineTo(R(x) + px * 0.2 * k, R(yy - amp2 * (1 + Math.sin(x * 6 * k + k * 2))));
    ctx.lineTo(w + 10, R(YG));
    ctx.fill();
  }
  // ── 뒤편 마을 (광장 뒤 작은 집들 · 창문 불빛) ──
  const houses: [number, number, number, string, string][] = [[0.06, 0.13, 0.11, '#f4a6a0', '#b5524a'], [0.24, 0.1, 0.15, '#9fd3e6', '#3e7c9a'], [0.47, 0.14, 0.12, '#ffe39a', '#c9813a'], [0.69, 0.11, 0.17, '#c8b6f0', '#6b54a8'], [0.86, 0.12, 0.12, '#a8e0b0', '#4a8a5a']];
  for (const [hx, hw, hh, wall, roof] of houses) {
    const jig = quaking ? Math.sin(t * 0.9 + hx * 20) * Math.abs(gnd.d) * 2 : 0, bx = R(hx) + jig + px * 0.5, by = R(YG - 0.055);
    ctx.fillStyle = mix(wall, '#2a2040', 0.35 + dusk * 0.3 + night);
    ctx.beginPath();
    ctx.moveTo(bx + R(hw), by);
    ctx.lineTo(bx + R(hw + DX * 1.6), by + R(DY * 1.6));
    ctx.lineTo(bx + R(hw + DX * 1.6), by - R(hh) + R(DY * 1.6));
    ctx.lineTo(bx + R(hw), by - R(hh));
    ctx.fill();
    ctx.fillStyle = mix(wall, '#5a4a70', dusk * 0.4 + night);
    ctx.fillRect(bx, by - R(hh), R(hw), R(hh));
    // 문
    ctx.fillStyle = mix(roof, '#2a2040', 0.3);
    ctx.fillRect(bx + R(hw * 0.42), by - R(0.04), R(0.022), R(0.04));
    ctx.fillStyle = mix(roof, '#3a2a50', dusk * 0.3 + night);
    ctx.beginPath();
    ctx.moveTo(bx - R(0.012), by - R(hh));
    ctx.lineTo(bx + R(hw / 2), by - R(hh + 0.055));
    ctx.lineTo(bx + R(hw + 0.012), by - R(hh));
    ctx.fill();
    // 창문 (저녁이면 불빛)
    const lit = dusk > 0.3 || night > 0;
    ctx.fillStyle = lit ? '#ffd86a' : 'rgba(255,255,255,.7)';
    if (lit) (ctx.shadowColor = '#ffc94d'), (ctx.shadowBlur = 8);
    ctx.fillRect(bx + R(hw * 0.2), by - R(hh * 0.75), R(0.022), R(0.022));
    ctx.fillRect(bx + R(hw * 0.62), by - R(hh * 0.75), R(0.022), R(0.022));
    ctx.shadowBlur = 0;
  }
  // ── 땅 덩어리 (디오라마 받침): 그림자 · 옆면 · 앞면 흙층 · 윗면 광장 ──
  ctx.save();
  const spinA = gnd.kind === 'spin' ? gnd.d * 0.035 : 0, upY = gnd.kind === 'up' ? -px * 0.8 : 0, sideX = gnd.kind === 'up' ? 0 : px;
  ctx.fillStyle = 'rgba(20,20,40,.35)';
  ctx.beginPath();
  ctx.ellipse(R(0.5), R(SLB + 0.03), R(0.52), R(0.035), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(R(0.5) + sideX, R(YG) + upY);
  ctx.rotate(spinA);
  ctx.translate(-R(0.5), -R(YG));
  const fe = YG - DY, be = YG + DY * 2.6, fs = -DX, bs = DX * 2.6;
  // 오른쪽 옆면
  ctx.fillStyle = '#5a3a26';
  ctx.beginPath();
  ctx.moveTo(R(SL1 + fs), R(fe));
  ctx.lineTo(R(SL1 + bs), R(be));
  ctx.lineTo(R(SL1 + bs), R(SLB - 0.063));
  ctx.lineTo(R(SL1 + fs), R(SLB));
  ctx.fill();
  // 앞면 흙층
  const bands: [number, string][] = [[fe, '#7cc35a'], [fe + 0.012, '#9a6a44'], [fe + 0.05, '#7d5236'], [fe + 0.095, '#61402a'], [fe + 0.13, '#4a3022']];
  for (let i = 0; i < bands.length; i++) {
    const y0 = bands[i][0], y1 = i + 1 < bands.length ? bands[i + 1][0] : SLB;
    ctx.fillStyle = bands[i][1];
    ctx.beginPath();
    ctx.moveTo(R(SL0 + fs), R(y0 + (i ? 0.004 * Math.sin(i * 3) : 0)));
    for (let x = SL0; x <= SL1 + 0.001; x += 0.03) ctx.lineTo(R(x + fs), R(y0 + (i ? 0.005 * Math.sin(x * 19 + i * 2) : 0)));
    ctx.lineTo(R(SL1 + fs), R(y1 + 0.006));
    ctx.lineTo(R(SL0 + fs), R(y1 + 0.006));
    ctx.fill();
  }
  // 모래·바위 땅은 그 기둥 아래 흙층이 다르다
  for (let c = 0; c < COLS; c++) {
    if (s.ground[c] === 1) continue;
    const xa = X0 + c * CW + fs, sand = s.ground[c] > 1;
    ctx.fillStyle = sand ? 'rgba(240,206,120,.92)' : 'rgba(140,150,160,.95)';
    ctx.beginPath();
    ctx.moveTo(R(xa), R(fe + 0.012));
    ctx.lineTo(R(xa + CW), R(fe + 0.012));
    ctx.lineTo(R(xa + CW * (sand ? 0.8 : 0.95)), R(SLB - 0.02));
    ctx.lineTo(R(xa + CW * (sand ? 0.2 : 0.05)), R(SLB - 0.02));
    ctx.fill();
    ctx.fillStyle = sand ? 'rgba(200,160,80,.7)' : 'rgba(90,98,108,.8)';
    for (let k = 0; k < 6; k++) ctx.fillRect(R(xa + CW * (0.25 + 0.5 * hsh(c * 9 + k))), R(fe + 0.03 + 0.12 * hsh(c * 7 + k)), sand ? 2 : 4, sand ? 2 : 3);
    ctx.font = `${R(0.045)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(sand ? '🏖️' : '🪨', R(xa + CW / 2), R(fe + 0.085));
  }
  // 흙 알갱이·뿌리·돌멩이
  for (let k = 0; k < 60; k++) {
    ctx.fillStyle = k % 3 ? 'rgba(255,230,190,.14)' : 'rgba(0,0,0,.2)';
    ctx.fillRect(R(SL0 + hsh(k * 3) * (SL1 - SL0) + fs), R(fe + 0.02 + hsh(k * 3 + 1) * (SLB - fe - 0.03)), 1.8, 1.8);
  }
  ctx.strokeStyle = 'rgba(220,180,130,.5)';
  ctx.lineWidth = 1.3;
  for (const [rx, len] of [[0.08, 0.06], [0.5, 0.05], [0.88, 0.07]]) {
    ctx.beginPath();
    ctx.moveTo(R(rx), R(fe + 0.012));
    ctx.bezierCurveTo(R(rx - 0.015), R(fe + len * 0.5), R(rx + 0.02), R(fe + len * 0.7), R(rx + 0.004), R(fe + len));
    ctx.stroke();
  }
  // 지진 때 앞면에 갈라짐
  if (s.phase === 'shake' || s.phase === 'settle' || s.phase === 'result') {
    const n = Math.min(4, Math.floor(s.bi / 2));
    ctx.strokeStyle = 'rgba(30,15,8,.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < n; k++) {
      const cx3 = R(SL0 + 0.1 + 0.8 * hsh(k * 13 + s.stage)), cy3 = R(fe + 0.015);
      ctx.beginPath();
      ctx.moveTo(cx3, cy3);
      ctx.lineTo(cx3 + R(0.012), cy3 + R(0.03));
      ctx.lineTo(cx3 - R(0.006), cy3 + R(0.05));
      ctx.lineTo(cx3 + R(0.01), cy3 + R(0.075));
      ctx.stroke();
    }
  }
  // 윗면 광장 (돌바닥 타일, 기둥 자리 표시)
  const pg = ctx.createLinearGradient(0, R(be), 0, R(fe));
  pg.addColorStop(0, mix('#cdbb98', '#8a7a8a', dusk * 0.5));
  pg.addColorStop(1, mix('#e8d8b6', '#b09a9a', dusk * 0.5));
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.moveTo(R(SL0 + fs), R(fe));
  ctx.lineTo(R(SL1 + fs), R(fe));
  ctx.lineTo(R(SL1 + bs), R(be));
  ctx.lineTo(R(SL0 + bs), R(be));
  ctx.fill();
  for (let c = 0; c < COLS; c++) {
    const xa = X0 + c * CW;
    ctx.fillStyle = s.ground[c] > 1 ? 'rgba(245,205,110,.85)' : s.ground[c] < 1 ? 'rgba(130,140,152,.85)' : c % 2 ? 'rgba(160,140,110,.25)' : 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(R(xa + 0.004 - DX * 0.6), R(YG - DY * 0.6));
    ctx.lineTo(R(xa + CW - 0.004 - DX * 0.6), R(YG - DY * 0.6));
    ctx.lineTo(R(xa + CW - 0.004 + DX * 1.6), R(YG + DY * 1.6));
    ctx.lineTo(R(xa + 0.004 + DX * 1.6), R(YG + DY * 1.6));
    ctx.fill();
  }
  // 돌바닥 자갈
  for (let k = 0; k < 70; k++) {
    const u = hsh(k * 7 + 3), v = hsh(k * 11 + 5), yy = fe + (be - fe) * v, xx = SL0 + 0.01 + (SL1 - SL0 - 0.02) * u + fs + (bs - fs) * v;
    ctx.fillStyle = k % 2 ? 'rgba(255,255,255,.16)' : 'rgba(110,90,60,.16)';
    ctx.beginPath();
    ctx.ellipse(R(xx), R(yy), R(0.012), R(0.004), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(120,100,70,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 3; k++) {
    const yy = fe + ((be - fe) * k) / 3, sh = fs + ((bs - fs) * k) / 3;
    ctx.beginPath();
    ctx.moveTo(R(SL0 + sh), R(yy));
    ctx.lineTo(R(SL1 + sh), R(yy));
    ctx.stroke();
  }
  // 가로등 둘 (저녁이면 불이 번진다)
  for (const lx of [0.095, 0.86]) {
    const bx = R(lx + bs * 0.8), by = R(be + 0.006), lh = R(0.2);
    ctx.strokeStyle = '#3a4250';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by - lh);
    ctx.quadraticCurveTo(bx, by - lh - R(0.02), bx + R(0.02), by - lh - R(0.02));
    ctx.stroke();
    const lit = dusk > 0.2 || night > 0;
    ctx.fillStyle = lit ? '#ffe9a0' : '#e8eef4';
    if (lit) (ctx.shadowColor = '#ffd56a'), (ctx.shadowBlur = R(0.06));
    ctx.beginPath();
    ctx.arc(bx + R(0.022), by - lh - R(0.008), R(0.012), 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (lit) {
      const lg = ctx.createRadialGradient(bx + R(0.022), by - lh, 0, bx + R(0.022), by - lh, R(0.12));
      lg.addColorStop(0, 'rgba(255,220,120,.35)');
      lg.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(bx - R(0.1), by - lh - R(0.12), R(0.24), R(0.24));
    }
  }
  // ── 깃발 기둥 (목표 높이) + 점선 ──
  const flagY = (n: number) => R(YG - n * BH);
  const poleX = R(0.905);
  ctx.strokeStyle = '#8a8f99';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(poleX, R(YG - 0.01));
  ctx.lineTo(poleX, flagY(s.G + 1) - R(0.03));
  ctx.stroke();
  const hrow = houseRow(s.cols, s.hc);
  for (const [n, col] of [[s.G, '#ff6b5a'], [s.G + 1, '#ffd23f']] as [number, string][]) {
    const y = flagY(n), reached = hrow >= n;
    ctx.setLineDash([4, 5]);
    ctx.strokeStyle = reached ? col : 'rgba(255,255,255,.55)';
    ctx.lineWidth = reached ? 2 : 1.4;
    ctx.beginPath();
    ctx.moveTo(R(X0 - 0.01), y);
    ctx.lineTo(poleX, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = col;
    ctx.beginPath();
    const wv = Math.sin(t / 8 + n) * R(0.006);
    ctx.moveTo(poleX, y - R(0.05));
    ctx.quadraticCurveTo(poleX + R(0.04), y - R(0.045) + wv, poleX + R(0.078), y - R(0.028) + wv);
    ctx.lineTo(poleX, y - R(0.004));
    ctx.fill();
    ctx.fillStyle = n === s.G ? '#ffffff' : '#5a3a00';
    ctx.font = `900 ${R(0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(n === s.G ? `${n}층` : `★${n}`, poleX + R(0.03), y - R(0.026));
  }
  // ── 블록 기둥들 ──
  let houseAt: { x: number; y: number; ang: number; sway: number } | null = null;
  const bw = R(CW) - 3, bh = R(BH) - 1, dxp = R(DX), dyp = R(DY);
  const wince = new Set<number>();
  let jAge = 999;
  for (const e of s.events) if (e.kind === 'fore' || e.kind === 'beat' || e.kind === 'place' || e.kind === 'go') jAge = Math.min(jAge, s.t - e.t);
  // 푸딩처럼: 툭 칠 때마다 한동안 말랑말랑
  const jiggle = jAge < 120 ? Math.exp(-jAge / 24) * Math.sin(jAge * 0.75) : 0;
  for (const e of s.events) if ((e.kind === 'crack' || e.kind === 'squish') && s.t - e.t < 25) wince.add(e.c * 16 + e.r);
  for (let c = 0; c < COLS; c++) {
    const col = s.cols[c], felt = col.length ? feltOf(s.cols, s.ground, c, { a: 1, kind: gnd.kind, fast: gnd.fast }) : [];
    let acc = 0.5;
    const offs: number[] = [];
    for (let r = 0; r < col.length; r++) {
      acc += felt[r] * 0.55;
      offs.push(acc);
    }
    for (let r = 0; r < col.length; r++) {
      const b = col[r], sway = gnd.kind === 'up' ? 0 : px * offs[r] * (gnd.kind === 'spin' ? edge(c) : 1) * 0.9;
      const prev = r ? (gnd.kind === 'up' ? 0 : px * offs[r - 1] * (gnd.kind === 'spin' ? edge(c) : 1) * 0.9) : 0;
      const ang = (sway - prev) / Math.max(8, bh) * 0.9;
      // 위아래 지진: 위로 갈수록 통통, 젤리는 푸딩처럼 눌렸다 늘어났다
      let bounce = 0;
      if (gnd.kind === 'up') bounce = -px * offs[r] * 0.5;
      let above = 0;
      for (let q = r + 1; q < col.length; q++) above += WEIGHT[col[q].k];
      const squash = b.k === 'J' ? 1 - (0.17 + 0.04 * Math.min(above, 4)) * (Math.abs(gnd.d) * Math.sin(t * 0.8) * (gnd.kind === 'up' ? 1.3 : 0.8) + jiggle) - (above >= 3 ? 0.07 : 0) : 1;
      const cx = R(X0 + (c + 0.5) * CW) + sway, by = R(YG - r * BH) + bounce;
      const worry = s.phase === 'build' || s.phase === 'shake' || s.phase === 'warn' ? b.worry : 0;
      const shiver = worry >= 2 && s.phase === 'build' ? Math.sin(t * 1.3 + c) * 0.8 : 0;
      ctx.save();
      ctx.translate(cx + shiver, by);
      ctx.rotate(ang);
      // 바닥 그림자 (맨 아래 블록만)
      if (r === 0) {
        ctx.fillStyle = 'rgba(40,30,20,.3)';
        ctx.beginPath();
        ctx.ellipse(dxp * 0.6, dyp * 0.3, bw * 0.55, R(0.012), 0, 0, Math.PI * 2);
        ctx.fill();
      }
      if (b.k === 'H') {
        drawBlock(ctx, 'H', bw, bh, dxp, dyp, { worry: 0, cr: 0, t, top: true, side: true, squash: 1, id: b.id, wince: false, swing: 0 });
        ctx.restore();
        houseAt = { x: cx, y: by - bh * 1.18, ang, sway: Math.abs(sway) };
        continue;
      }
      const nextFree = r === col.length - 1;
      const rightCovered = c < COLS - 1 && s.cols[c + 1].length > r;
      drawBlock(ctx, b.k, bw, bh, dxp, dyp, { worry, cr: b.cr, t, top: nextFree, side: !rightCovered, squash, id: b.id, wince: wince.has(c * 16 + r), swing: -ang * 4 - gnd.d * 0.9 });
      ctx.restore();
    }
  }
  // 떨어지는 블록 (데굴데굴)
  for (const d of s.debris) {
    ctx.save();
    ctx.translate(R(d.x), R(d.y) + bh / 2);
    ctx.rotate(d.rot);
    ctx.globalAlpha = Math.min(1, d.life / 30);
    drawBlock(ctx, d.k, bw * 0.92, bh * 0.92, dxp, dyp, { worry: 2.5, cr: d.cr, t, top: true, side: true, squash: 1, id: 7, wince: true, swing: d.rot });
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // ── 앵무새 ──
  const z = R(0.085);
  let mood: Mood = 'calm';
  const ph = s.phase;
  if (!s.parrot.on) mood = s.parrot.vy === 0 || (Math.abs(s.parrot.vy) < 0.002 && s.parrot.y >= YG - 0.021) ? 'dizzy' : 'fall';
  else if (ph === 'result' && s.ok) mood = 'proud';
  else if (ph === 'shake' || ph === 'warn') mood = Math.abs(gnd.d) > 0.75 || recent('crack', 30) || recent('break', 50) ? 'scream' : 'worry';
  else if (s.fore > 0) mood = s.fore < FORE - 6 ? 'worry' : 'calm';
  else if (recent('phew', 70) || (ph === 'settle' && !s.fell)) mood = 'phew';
  if (!s.parrot.on) {
    const p = s.parrot, landed = p.y >= YG - 0.021 && Math.abs(p.vy) < 0.004;
    drawParrot(ctx, R(p.x), R(p.y), z, landed ? 'dizzy' : 'fall', t, landed ? 0 : p.rot);
  } else if (houseAt) {
    const ha = houseAt as { x: number; y: number; ang: number; sway: number };
    ctx.save();
    ctx.translate(ha.x, ha.y + R(0.012));
    ctx.rotate(ha.ang * 1.5);
    drawParrot(ctx, 0, 0, z, mood, t);
    ctx.restore();
  }
  // ── 광장 양끝의 구경꾼: 지팡이 할머니(왼쪽) · 강아지(오른쪽 깃발 밑) ──
  const fMood = ph === 'result' ? (s.ok ? 'cheer' : 'oh') : quaking ? 'shake' : 'calm';
  const jig = quaking ? Math.sin(t * 1.9) * Math.min(1, Math.abs(gnd.d) * 2 + 0.3) : 0;
  drawGranny(ctx, R(0.058), R(YG + 0.01), R(0.075), jig, fMood, t);
  drawDog(ctx, R(0.945), R(YG + 0.016), R(0.058), -jig, fMood, t);
  ctx.restore(); // 땅 흔들림 끝
  // 구경꾼·앵무새 한마디
  const sayParrot = (text: string, hot = false) => {
    if (!houseAt || !s.parrot.on) return;
    const ha = houseAt as { x: number; y: number };
    bubble(ctx, ha.x + sideX, ha.y - z * 1.55, text, R(0.04), hot, w);
  };
  if (ph === 'shake' && mood === 'scream') sayParrot('꺄악!', true);
  else if (ph === 'warn') sayParrot('히익…?');
  else if (s.fore > 0 && s.fore < FORE - 8) sayParrot('어어어?');
  else if (recent('phew', 80)) sayParrot(s.events.find((e) => e.kind === 'phew')?.text ?? '휴~');
  else if (ph === 'result' && s.ok) sayParrot(s.got === 3 ? '끄떡없지~ ♪' : '휴~ 살았다');
  else if (recent('hop', 40)) sayParrot('폴짝!');
  if (!s.parrot.on && ph !== 'build') bubble(ctx, R(s.parrot.x), R(s.parrot.y) - z * 1.4, s.parrot.y >= YG - 0.021 ? '어질어질…' : '꺄악!', R(0.04), true, w);
  if (ph === 'shake' && s.pt % 120 < 60) bubble(ctx, R(0.075), R(YG - 0.12), '아이고!', R(0.037), false, w);
  else if (ph === 'result' && s.ok && s.pt < 90) bubble(ctx, R(0.075), R(YG - 0.12), '만세!', R(0.037), false, w);
  // ── 사건 → 연출 ──
  const pop = (x: number, y: number, text: string, col: string, size: number) => {
    const half = Math.min(w / 2, text.length * size * 0.5 + 6);
    fx.pop(Math.max(half, Math.min(w - half, x)), y, text, col, size);
  };
  const seenT = M.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = R(X0 + (e.c + 0.5) * CW), y = R(YG - (e.r + 0.5) * BH);
    if (e.kind === 'place') {
      const col = e.text === 'J' ? '#8af0b4' : e.text === 'S' ? '#c8cdd2' : e.text === 'D' ? '#ffd56a' : '#e0a96a';
      fx.burst(x, y + R(BH * 0.45), col, 10, 2.2, 2.5);
      fx.burst(x, y + R(BH * 0.5), '#d8c7a8', 6, 1.6, 2);
      fx.kick(e.text === 'S' ? 4 : 2);
      if (s.taps <= 1) pop(x + R(0.08), y - R(0.02), e.text === 'J' ? '말랑~' : '쿵!', '#ffffff', R(0.045));
    }
    if (e.kind === 'lift' && s.taps === 2) pop(x + R(0.1), y + R(0.03), '쑥!', '#fff1a8', R(0.04));
    if (e.kind === 'hop') fx.ring(x, y, '#9ef08a', R(0.08), 3), pop(x, y - R(0.1), '🦜 이사!', '#d8ffb0', R(0.04));
    if (e.kind === 'phew') fx.burst(x, y - R(0.06), '#b8ffd2', 14, 2, 2.5);
    if (e.kind === 'fore') {
      fx.kick(6);
      for (let k = 0; k < 4; k++) fx.burst(R(0.12 + 0.25 * k), R(YG + 0.01), '#cdb48a', 6, 2, 2.2);
      pop(R(0.3), R(YG - 0.3), '앗, 전진이다!', '#ffe0b0', R(0.048));
    }
    if (e.kind === 'warn') fx.kick(3), pop(w / 2, R(YG + 0.09), '쿠르릉…', '#ffd0a0', R(0.06)), fx.burst(w / 2, R(YG + 0.06), '#8a6a4a', 16, 2.5, 2.5);
    if (e.kind === 'go') fx.blink('#ffe6c8', 0.15), fx.ring(w / 2, R(YG), '#ffd0a0', R(0.5), 5);
    if (e.kind === 'beat') {
      const a = Number(e.text);
      fx.kick(2 + a * 4);
      for (let k = 0; k < 3; k++) fx.burst(R(0.15 + 0.35 * k), R(YG + 0.01), '#cdb48a', 4, 1.4 + a, 2);
    }
    if (e.kind === 'crack') fx.burst(x, y, e.text === '삐걱!' ? '#c08a50' : '#9aa2aa', 8, 2.4, 2), pop(x, y - R(0.03), e.text ?? '쩍!', '#ffe08a', R(0.042));
    if (e.kind === 'squish') fx.burst(x, y, '#7fe8a8', 26, 3.6, 3.2), fx.ring(x, y, '#b8ffd2', R(0.1), 4), pop(x, y - R(0.03), '퍽! 납작', '#b8ffd2', R(0.05)), fx.kick(7);
    if (e.kind === 'break') fx.burst(x, y, '#8a7a6a', 26, 4, 3), fx.burst(x, y, '#d0c0a0', 14, 3, 2), fx.kick(10), pop(x, y - R(0.05), e.text ?? '와르르!', '#ffb08a', R(0.055));
    if (e.kind === 'fall') fx.blink('#ff6b5a', 0.25), fx.kick(12), pop(x, y - R(0.1), '꺄악!', '#ff8a8a', R(0.06));
    if (e.kind === 'clear') fx.burst(w / 2, R(0.6), '#ffd23f', 50, 6, 3), fx.burst(w / 2, R(0.6), '#7fe8a8', 30, 5, 2.5), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.burst(w / 2, R(0.6), '#a0a0b0', 20, 3, 3);
    if (e.kind === 'nogo' || e.kind === 'full') pop(w / 2, R(TRAY - 0.06), e.text ?? '', '#ffd0d0', R(0.042));
    if (e.kind === 'stage' || e.kind === 'retry') fx.ring(w / 2, R(0.16), '#ffffff', R(0.4), 4);
  }
  M.t = s.t;
  ctx.restore(); // 화면 흔들림 끝 — 아래는 HUD
  // ── 위 띠 (HUD) ──
  const hb = R(0.075);
  ctx.fillStyle = 'rgba(20,30,45,.82)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.044)}px system-ui, sans-serif`;
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판`, R(0.03), hb / 2);
  ctx.font = `800 ${R(0.038)}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffd0c8';
  ctx.fillText(s.fell ? `🚩 ${s.G}층 · 와르르!` : `🚩 ${s.G}층 · 지금 ${hrow}층`, R(0.2), hb / 2);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe066';
  ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
  ctx.fillText(`★${s.stars}`, w - R(0.03), hb / 2);
  const sw = ctx.measureText(`★${s.stars}`).width;
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.03) - sw - R(0.025), hb / 2);
  // ── 지진 예보 칸 (크게: 규모 · 방향 화살표 · 박자 · 지진계 선) ──
  {
    const y0 = hb + R(0.01), ch = R(0.2), x0 = R(0.025), cw2 = R(0.95);
    ctx.fillStyle = 'rgba(255,250,240,.94)';
    ctx.strokeStyle = quaking ? '#ff8a5a' : 'rgba(40,50,70,.35)';
    ctx.lineWidth = quaking ? 3 : 1.5;
    rr(ctx, x0, y0, cw2, ch, R(0.03));
    ctx.fill();
    ctx.stroke();
    const q0 = s.q[0], magCol = (m: number) => (m >= 6 ? '#e03131' : m >= 5 ? '#f76707' : m >= 4 ? '#e8a000' : '#2f9e44');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#5a6475';
    ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
    ctx.fillText('📡 지진 예보', x0 + R(0.02), y0 + R(0.027));
    ctx.fillStyle = magCol(q0.mag);
    ctx.font = `900 ${R(0.072)}px system-ui, sans-serif`;
    const shakeTxt = quaking ? Math.sin(t * 1.5) * 1.5 : 0;
    ctx.fillText(`규모 ${q0.mag}`, x0 + R(0.02) + shakeTxt, y0 + R(0.08));
    // 방향 그림: 작은 블록이 그 방향으로 흔들린다
    const ix = x0 + R(0.33), iy = y0 + R(0.06), iz = R(0.034), ph2 = Math.sin(t / (q0.fast ? 2.5 : 7));
    ctx.save();
    ctx.translate(ix, iy);
    if (q0.kind === 'side') ctx.translate(ph2 * iz * 0.35, 0);
    else if (q0.kind === 'up') ctx.translate(0, ph2 * iz * 0.35);
    else ctx.rotate(ph2 * 0.35);
    ctx.fillStyle = '#dfa465';
    ctx.fillRect(-iz * 0.55, -iz * 0.55, iz * 1.1, iz * 1.1);
    ctx.strokeStyle = '#a0632e';
    ctx.lineWidth = 2;
    ctx.strokeRect(-iz * 0.55, -iz * 0.55, iz * 1.1, iz * 1.1);
    ctx.restore();
    ctx.strokeStyle = '#e8590c';
    ctx.fillStyle = '#e8590c';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    const head = (x: number, y: number, a: number) => {
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
      ctx.lineTo(x + Math.cos(a + 2.4) * 6, y + Math.sin(a + 2.4) * 6);
      ctx.lineTo(x + Math.cos(a - 2.4) * 6, y + Math.sin(a - 2.4) * 6);
      ctx.fill();
    };
    if (q0.kind === 'side') {
      ctx.beginPath();
      ctx.moveTo(ix - iz * 1.25, iy);
      ctx.lineTo(ix + iz * 1.25, iy);
      ctx.stroke();
      head(ix + iz * 1.35, iy, 0);
      head(ix - iz * 1.35, iy, Math.PI);
    } else if (q0.kind === 'up') {
      ctx.beginPath();
      ctx.moveTo(ix + iz * 1.1, iy - iz * 1.0);
      ctx.lineTo(ix + iz * 1.1, iy + iz * 1.0);
      ctx.stroke();
      head(ix + iz * 1.1, iy - iz * 1.1, -Math.PI / 2);
      head(ix + iz * 1.1, iy + iz * 1.1, Math.PI / 2);
    } else {
      ctx.beginPath();
      ctx.arc(ix, iy, iz * 1.05, -2.6 + t / 20, 1.6 + t / 20);
      ctx.stroke();
      head(ix + Math.cos(1.6 + t / 20) * iz * 1.05, iy + Math.sin(1.6 + t / 20) * iz * 1.05, 1.6 + t / 20 + Math.PI / 2);
    }
    const [, nm] = KIND_TXT[q0.kind];
    ctx.textAlign = 'left';
    ctx.fillStyle = '#203040';
    ctx.font = `900 ${R(0.046)}px system-ui, sans-serif`;
    ctx.fillText(nm, x0 + R(0.43), y0 + R(0.045), R(0.2));
    ctx.fillStyle = q0.fast ? '#9c36b5' : '#1c7ed6';
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.fillText(q0.fast ? '빠르게 덜덜' : '느리게 출렁', x0 + R(0.43), y0 + R(0.088), R(0.2));
    // 오른쪽: 여진 또는 한마디 요령
    const rx = x0 + R(0.65);
    if (s.q.length > 1) {
      const q1 = s.q[1];
      ctx.fillStyle = 'rgba(156,54,181,.12)';
      rr(ctx, rx - R(0.01), y0 + R(0.012), R(0.29), R(0.098), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#7a2a9a';
      ctx.font = `900 ${R(0.038)}px system-ui, sans-serif`;
      ctx.fillText('⚡ 그다음 여진', rx, y0 + R(0.035), R(0.27));
      ctx.fillStyle = magCol(q1.mag);
      ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
      ctx.fillText(`${KIND_TXT[q1.kind][0]} ${KIND_TXT[q1.kind][1]} ${q1.mag} · ${q1.fast ? '덜덜' : '출렁'}`, rx, y0 + R(0.083), R(0.27));
    } else {
      ctx.fillStyle = '#5a6475';
      ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
      const tip = q0.kind === 'up' ? ['무거운 걸 인', '블록이 눌려요'] : q0.kind === 'spin' ? ['가장자리 기둥이', '크게 흔들려요'] : q0.fast ? ['낮은 칸이', '더 떨려요'] : ['높은 칸이', '더 흔들려요'];
      ctx.fillText(tip[0], rx, y0 + R(0.04), R(0.28));
      ctx.fillText(tip[1], rx, y0 + R(0.08), R(0.28));
    }
    // 지진계 띠: 박자마다 반 물결, 세기만큼 높이. 흔들리는 동안 빨간 바늘이 지나간다
    const gx = x0 + R(0.03), gw = cw2 - R(0.06), gy = y0 + R(0.155), gh = R(0.034), total = shakeLen(s.beats);
    ctx.fillStyle = 'rgba(30,40,60,.07)';
    rr(ctx, gx - 4, gy - gh - 4, gw + 8, gh * 2 + 8, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30,40,60,.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + gw, gy);
    ctx.stroke();
    const mxA = 1.9;
    const played = s.phase === 'shake' ? s.pt : s.phase === 'settle' || s.phase === 'result' ? total : 0;
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? '#e8590c' : '#3a4a60';
      ctx.lineWidth = pass ? 2.4 : 1.6;
      ctx.beginPath();
      let first = true;
      for (const b of s.beats) {
        for (let k = 0; k <= 6; k++) {
          const tt = b.at + (b.len * k) / 6;
          if (pass && tt > played) break;
          const xx = gx + (tt / total) * gw, yy = gy - b.sign * Math.min(1.15, b.a / mxA) * gh * Math.sin((Math.PI * k) / 6);
          if (first) ctx.moveTo(xx, yy), (first = false);
          else ctx.lineTo(xx, yy);
        }
      }
      ctx.stroke();
    }
    if (s.q.length > 1) {
      const xa = gx + ((s.beats.find((b) => b.q === 1)?.at ?? 0) / total) * gw - R(0.01);
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = '#9c36b5';
      ctx.beginPath();
      ctx.moveTo(xa, gy - gh - 2);
      ctx.lineTo(xa, gy + gh + 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    if (s.phase === 'shake') {
      const xx = gx + (s.pt / total) * gw;
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xx, gy - gh - 3);
      ctx.lineTo(xx, gy + gh + 3);
      ctx.stroke();
    }
  }
  // 새것 알림
  const nw = s.news.find((n) => s.t >= n.t && s.t - n.t < NEWS);
  if (nw) {
    const age = s.t - nw.t, a = Math.min(1, age / 10, (NEWS - age) / 15);
    ctx.globalAlpha = a;
    ctx.font = `900 ${R(0.037)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = `✨ ${nw.text}`, tw2 = Math.min(w - 12, ctx.measureText(tx).width + 22), by2 = R(0.325);
    ctx.fillStyle = 'rgba(25,35,55,.88)';
    rr(ctx, w / 2 - tw2 / 2, by2 - R(0.028), tw2, R(0.056), R(0.028));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - 26);
    ctx.globalAlpha = 1;
  }
  // 첫 판 안내 (첫 톡 전)
  if (s.stage === 0 && s.taps === 0 && ph === 'build') {
    const hx = R(X0 + (s.hc + 0.5) * CW), bob = Math.sin(t / 7) * R(0.012);
    ctx.font = `900 ${R(0.044)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = '👆 앵무새 집 아래를 톡! (젤리가 쿵)', tw2 = ctx.measureText(tx).width + 20;
    ctx.fillStyle = 'rgba(25,35,55,.82)';
    rr(ctx, w / 2 - tw2 / 2, R(0.62) - R(0.035), tw2, R(0.07), R(0.035));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, R(0.62));
    ctx.font = `${R(0.08)}px system-ui, sans-serif`;
    ctx.fillText('👇', hx, R(YG - 0.27) + bob);
  } else if (s.stage === 0 && ph === 'build' && hrow >= s.G && s.attempt === 0) {
    ctx.font = `900 ${R(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    const tx = '★ 한 층 더 쌓거나, ▶ 버티기를 톡!', tw2 = ctx.measureText(tx).width + 20;
    ctx.fillStyle = 'rgba(25,35,55,.78)';
    rr(ctx, w / 2 - tw2 / 2, R(0.39) - R(0.032), tw2, R(0.064), R(0.032));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, R(0.39));
  }
  // ── 아래 띠: 다음 조각 줄 + ▶ 버티기 ──
  {
    const y0 = R(TRAY), tb = h - y0;
    ctx.fillStyle = 'rgba(20,30,45,.9)';
    ctx.fillRect(0, y0, w, tb);
    if (ph === 'build') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const k0 = s.queue[s.qi];
      if (k0) {
        miniBlock(ctx, k0, R(0.075), y0 + R(0.13), R(0.092), t);
        ctx.fillStyle = '#aab8c8';
        ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
        ctx.fillText('다음', R(0.165), y0 + R(0.03));
        ctx.fillStyle = k0 === 'J' ? '#9ff5c0' : k0 === 'S' ? '#dde3e8' : k0 === 'D' ? '#ffe08a' : '#f2c58e';
        ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
        ctx.fillText(NAME[k0], R(0.165), y0 + R(0.077), R(0.17));
        ctx.fillStyle = '#c8d4e0';
        ctx.font = `700 ${R(0.037)}px system-ui, sans-serif`;
        ctx.fillText(k0 === 'J' ? '흔들림 먹음' : k0 === 'S' ? '무겁고 단단' : k0 === 'D' ? '높이 달기' : '가볍고 휨', R(0.165), y0 + R(0.122), R(0.18));
        ctx.fillStyle = '#aab8c8';
        ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(s.qi + 1 < s.queue.length ? `그다음 (${s.queue.length - s.qi - 1})` : '마지막!', R(0.47), y0 + R(0.03));
        ctx.textAlign = 'left';
        for (let i = 1; i <= 2; i++) {
          const k = s.queue[s.qi + i];
          if (!k) break;
          ctx.globalAlpha = 1 - (i - 1) * 0.3;
          miniBlock(ctx, k, R(0.43 + (i - 1) * 0.085), y0 + R(0.122), R(0.058), t);
          ctx.globalAlpha = 1;
        }
      }
      // ▶ 버티기
      const can = hrow >= s.G, bx0 = R(GO.x0), by0 = R(GO.y0), bwb = R(GO.x1 - GO.x0), bhb = R(GO.y1 - GO.y0);
      ctx.fillStyle = can ? '#2fb26a' : 'rgba(120,130,145,.5)';
      if (can) (ctx.shadowColor = '#5fe39a'), (ctx.shadowBlur = 10 + 6 * Math.sin(t / 8));
      rr(ctx, bx0, by0, bwb, bhb, R(0.03));
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.font = `900 ${R(0.048)}px system-ui, sans-serif`;
      ctx.fillText('▶ 버티기', bx0 + bwb / 2, by0 + bhb * (can ? 0.5 : 0.36));
      if (!can) {
        ctx.font = `800 ${R(0.037)}px system-ui, sans-serif`;
        ctx.fillText(`🚩 ${s.G}층까지 쌓기`, bx0 + bwb / 2, by0 + bhb * 0.74);
      }
    } else {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
      const msg = ph === 'warn' ? '쿠르릉… 온다!' : ph === 'shake' ? (s.fell ? '와르르…' : `흔들흔들… 버텨라! ${Math.min(s.bi, s.beats.length)}/${s.beats.length}`) : ph === 'settle' ? (s.fell ? '앵무새가…!' : '멈췄다…?') : s.won ? `끝! 별 ${s.stars}개 · ${s.pts}점` : s.ok ? '다음 판 준비 중…' : s.hearts > 0 ? '다시 지어 봐요' : '끝!';
      ctx.fillText(msg, w / 2, y0 + tb * 0.42);
      if (ph === 'shake') {
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.fillRect(R(0.1), y0 + tb * 0.78, R(0.8), 4);
        ctx.fillStyle = '#ff8a5a';
        ctx.fillRect(R(0.1), y0 + tb * 0.78, R(0.8) * cl(s.pt / shakeLen(s.beats)), 4);
      }
    }
  }
  // ── 판 카드: 성공(별) · 실패 ──
  if (ph === 'result') {
    const age = s.pt, sc = Math.min(1, 0.6 + age / 12), cy = R(YG + 0.07);
    let head: string, sub: string, col: string;
    if (s.ok) (head = s.won ? '지진 탑 완성! 🎉' : `${s.stage + 1}판 버텼다!`), (sub = `${'★'.repeat(s.got)}${'☆'.repeat(3 - s.got)}  ${s.got === 3 ? '높게 · 멀쩡하게!' : hrow >= s.G + 1 ? '높이 ★ · 부서진 블록이 있어요' : s.broke === 0 ? '멀쩡 ★ · 한 층 더 높이면 ★' : '한 층 더, 하나도 안 부서지게!'}`), (col = '#ffe066');
    else (head = s.fell ? '와르르! 앵무새가 떨어졌어요' : `🚩 ${s.G}층까지 못 올렸어요`), (sub = s.hearts > 0 ? `하트 −1 · ${s.stage + 1}판 다시 짓기` : `끝! 별 ${s.stars}개`), (col = '#ffb3a8');
    ctx.save();
    ctx.translate(w / 2, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(25,30,50,.9)';
    rr(ctx, -R(0.42), -R(0.075), R(0.84), R(0.15), R(0.04));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.font = `900 ${R(0.052)}px system-ui, sans-serif`;
    ctx.fillText(head, 0, -R(0.026), R(0.8));
    ctx.fillStyle = '#fff8ee';
    ctx.font = `800 ${R(0.038)}px system-ui, sans-serif`;
    ctx.fillText(sub, 0, R(0.035), R(0.8));
    ctx.restore();
  }
  // 판 시작: 큰 예보 카드가 잠깐
  if (ph === 'build' && s.pt < 70 && !(s.stage === 0 && s.attempt === 0)) {
    const a = Math.min(1, (70 - s.pt) / 15), q0 = s.q[0];
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(25,30,50,.88)';
    rr(ctx, R(0.12), R(0.42), R(0.76), R(0.13), R(0.04));
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd0a0';
    ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
    ctx.fillText(s.attempt ? `${s.stage + 1}판 다시!` : `${s.stage + 1}판 — 📡 규모 ${q0.mag} ${KIND_TXT[q0.kind][0]}`, w / 2, R(0.465), R(0.72));
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${R(0.038)}px system-ui, sans-serif`;
    ctx.fillText(`앵무새 집을 🚩${s.G}층까지 + 버티기`, w / 2, R(0.515), R(0.72));
    ctx.globalAlpha = 1;
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const colX = (c: number) => X0 + (c + 0.5) * CW;
const tapCol = (c: number): Input => ({ tap: false, dir: 0, pointer: { x: colX(c), y: (YG - 2.5 * BH) / A } });
const NO: Input = { tap: false, dir: 0, pointer: null };

const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 기둥이나 아무 때나 톡 (가끔 ▶도) */
export const quakeRandom: Bot<QuakeState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.phase !== 'build') return NO;
    let next = dumbAt.get(s);
    if (next === undefined) dumbAt.set(s, (next = s.t + 20 + Math.floor(rng() * 50)));
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 20 + Math.floor(rng() * 60));
    if (rng() < 0.08) return { tap: false, dir: 0, pointer: { x: (GO.x0 + GO.x1) / 2, y: (GO.y0 + GO.y1) / 2 / A } };
    return tapCol(Math.floor(rng() * COLS));
  },
};

/** 결과 값어치: 앵무새 무사 > 별 높이 > 안 부서짐 > 금 적게 */
function value(o: Outcome, G: number, hc = 3) {
  if (o.fell || o.row < G) return -1000 + o.lasted * 400 + Math.min(o.row, G) * 10 - o.cracks * 3;
  // 같으면 가운데 쪽 탑이 보기 좋다 (아주 작은 덤)
  return 1000 + (o.row >= G + 1 ? 300 : 0) + (o.broke === 0 ? 300 : -o.broke * 10) - o.cracks * 3 - o.row * 0.5 - Math.abs(hc - 3) * 0.2;
}

interface Node { cols: Block[][]; hc: number; seq: number[]; v: number }
const clone = (cols: Block[][]) => cols.map((col) => col.map((x) => ({ ...x })));
/** 빔 탐색: 조각마다 일곱 기둥을 다 놓아 보고, 지금 판을 끝까지 흔들어 본 값으로 좋은 판 몇 개만 남긴다 (−1 = ▶ 지금 버티기) */
export function planBuild(s: QuakeState, width = 28): number[] {
  const G = s.G, beats = s.beats, n = s.queue.length - s.qi;
  /** 지금 판의 값어치: 그대로 흔들어 본 값과, '다음 조각들을 탑에 바로 얹으면' 흔들어 본 값 중 나은 쪽 (빔이 앞날을 보게) */
  const evalNode = (cols: Block[][], hc: number, i: number) => {
    const row = houseRow(cols, hc), left = n - i;
    let v = row >= G ? value(simulate(cols, hc, s.ground, beats), G, hc) : -5000;
    const use = Math.min(left, G + 1 - row);
    if (use > 0) {
      const c2 = clone(cols);
      let h2 = hc;
      for (let j = 0; j < use; j++) h2 = place(c2, h2, h2, s.queue[s.qi + i + j], 0);
      v = Math.max(v, value(simulate(c2, h2, s.ground, beats), G, h2) - use * 2);
    }
    return v;
  };
  let beam: Node[] = [{ cols: clone(s.cols), hc: s.hc, seq: [], v: evalNode(s.cols, s.hc, 0) }];
  let best: Node | null = null;
  const consider = (nd: Node) => {
    if (houseRow(nd.cols, nd.hc) < G) return;
    const v = value(simulate(nd.cols, nd.hc, s.ground, beats), G, nd.hc);
    if (!best || v > best.v) best = { ...nd, v, seq: [...nd.seq, -1] };
  };
  for (let i = 0; i < n; i++) {
    const k = s.queue[s.qi + i], next: Node[] = [];
    for (const nd of beam) {
      consider(nd);
      for (let c = 0; c < COLS; c++) {
        if (nd.cols[c].length >= ROWS + (c === nd.hc ? 1 : 0)) continue;
        const cols = clone(nd.cols), hc = place(cols, nd.hc, c, k, 0);
        next.push({ cols, hc, seq: [...nd.seq, c], v: 0 });
      }
    }
    // 같은 모양(좌우 대칭 포함)은 하나만
    const uniq = new Map<string, Node>();
    for (const nd of next) {
      const key = nd.cols.map((col) => col.map((x) => x.k).join('')).join('|');
      if (!uniq.has(key)) uniq.set(key, nd);
    }
    beam = [...uniq.values()];
    for (const nd of beam) nd.v = evalNode(nd.cols, nd.hc, i + 1);
    beam.sort((a, b) => b.v - a.v);
    // 다양하게: 앵무새 기둥·높이가 같은 판은 몇 개만
    const per = new Map<number, number>(), kept: Node[] = [];
    for (const nd of beam) {
      const key = nd.hc * 16 + houseRow(nd.cols, nd.hc), m = per.get(key) ?? 0;
      if (m >= 4) continue;
      per.set(key, m + 1);
      kept.push(nd);
      if (kept.length >= width) break;
    }
    beam = kept;
  }
  for (const nd of beam) {
    const v = value(simulate(nd.cols, nd.hc, s.ground, beats), G, nd.hc);
    if (!best || v > best.v) best = { ...nd, v };
  }
  if (!best) return [];
  const b = best as Node;
  // 앵무새가 못 버티는 답밖에 못 찾았으면 더 넓게 한 번 더
  if (b.v < 1000 && width < 100) return planBuild(s, 120);
  return b.seq;
}

const brain = new WeakMap<object, { key: string; seq: number[]; i: number }>();
/** 봇: 예보한 지진을 머릿속으로 끝까지 흔들어 보며(빔 탐색) 앵무새가 무사하고 별이 많은 배치를 찾아 그대로 톡톡 */
export const quakeSmart: Bot<QuakeState> = {
  name: '지진 박사',
  act(s) {
    if (s.phase !== 'build' || s.down) return NO;
    const key = `${s.stage}:${s.attempt}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, seq: planBuild(s), i: 0 }));
    if (m.i >= m.seq.length) return NO;
    const c = m.seq[m.i++];
    if (c < 0) return { tap: false, dir: 0, pointer: { x: (GO.x0 + GO.x1) / 2, y: (GO.y0 + GO.y1) / 2 / A } };
    return tapCol(c);
  },
};
