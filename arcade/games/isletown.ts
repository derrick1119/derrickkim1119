/**
 * 둥실 섬 마을 짓기 (35라운드: 또 다른 장르 6개 — 톡 하나) — 이웃 점수 자리 고르기 × 꾸미기.
 * 조작은 톡뿐: 받은 건물(아래 카드)을 놓을 섬의 빈칸을 톡 → 건물이 하늘에서 '쿵' 내려앉고,
 *   옆 건물들이 점수 숫자를 휙휙 날려 꽂는다(좋아하는 이웃 +, 싫어하는 이웃 −). 한 번에 크게 받으면 숫자가 커지고 화면이 흔들린다.
 *   빈칸마다 '여기 두면 몇 점'이 늘 떠 있다(고르기 전에 보이는 미리 보기). 아무것도 안 누르면 아무 일도 없다 — 시간 압박 없음.
 * 와우: 점수 막대가 표시까지 차면 바다에서 새 섬 조각이 '쑤욱' 솟아 놓을 땅이 넓어지고 새 건물 꾸러미가 배로 실려 온다.
 * 판: 건물이 다 떨어지거나 빈칸이 다 차면 끝. 목표 점수를 넘기면 별(쉬운 한 줄 말, 판마다 하나씩 늘어남), 못 넘기면 하트 −1·그 판만 다시.
 * 판 7개 · 판마다 새것(하는 일이 바뀐다): 1 집(나무 옆) · 새 섬 → 2 빵집(집을 모은다) → 3 등대(바다 쪽 끝자리를 아낀다)
 *   → 4 시끄러운 대장간(집과 떼어 놓을 구석을 남긴다) → 5 분수(빙 둘러 채운다) → 6 화산 섬(용암 칸 — 집은 멀리, 대장간은 가까이)
 *   → 7 축제 섬(새 섬 둘).
 * 고민: 지금 점수가 가장 큰 칸 vs 다음 건물(미리 보기)을 위해 남겨 둘 칸.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 판 모양 (가로 폭 = 1) ─────────────────────────────
export const COLS = 4, ROWS = 5, NC = COLS * ROWS;
const GX0 = 0.07, CW = 0.215, GY0 = 0.3, CH = 0.15;
const cellX = (i: number) => GX0 + ((i % COLS) + 0.5) * CW;
const cellY = (i: number) => GY0 + (Math.floor(i / COLS) + 0.5) * CH;
const rowOf = (i: number) => Math.floor(i / COLS), colOf = (i: number) => i % COLS;
/** 위·왼·오른·아래 (칸 밖이면 -1 = 바다) */
const NB4: number[][] = [...Array(NC).keys()].map((i) => {
  const r = rowOf(i), c = colOf(i);
  return [r > 0 ? i - COLS : -1, c > 0 ? i - 1 : -1, c < COLS - 1 ? i + 1 : -1, r < ROWS - 1 ? i + COLS : -1];
});
/** 둘레 8칸 (칸 안만) */
const NB8: number[][] = [...Array(NC).keys()].map((i) => {
  const r = rowOf(i), c = colOf(i), out: number[] = [];
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue;
      const rr2 = r + dr, cc = c + dc;
      if (rr2 >= 0 && rr2 < ROWS && cc >= 0 && cc < COLS) out.push(rr2 * COLS + cc);
    }
  return out;
});

// ───────────────────────────── 건물 ─────────────────────────────
export type Kind = 'tree' | 'house' | 'bakery' | 'light' | 'forge' | 'fount' | 'lava';
interface KD { name: string; like: string; say: string }
const K: Record<Kind, KD> = {
  tree: { name: '나무', like: '집·대장간 옆 +3', say: '' },
  house: { name: '집', like: '나무 옆 +3 · 집 옆 +1', say: '좋은 동네!' },
  bakery: { name: '빵집', like: '집 옆마다 +3', say: '갓 구운 빵!' },
  light: { name: '등대', like: '바다 한 면마다 +3', say: '반짝반짝' },
  forge: { name: '대장간', like: '나무 옆 +3 · 집 옆 −3', say: '땅! 땅!' },
  fount: { name: '분수', like: '둘레 8칸 모두 +2', say: '퐁퐁~' },
  lava: { name: '용암', like: '집 옆 −3 · 대장간 옆 +4', say: '' },
};
/** 옆(위·아래·왼·오른)끼리 주고받는 점수 — 서로 같다(집이 나무 옆이면 +3, 나무 옆에 집을 놓아도 +3) */
const REL: Record<Kind, Partial<Record<Kind, number>>> = {
  tree: { house: 3, forge: 3 },
  house: { tree: 3, house: 1, bakery: 3, forge: -3, lava: -3 },
  bakery: { house: 3 },
  light: {},
  forge: { house: -3, tree: 3, lava: 4 },
  fount: {},
  lava: { house: -3, forge: 4 },
};
const rel = (a: Kind, b: Kind) => REL[a][b] ?? 0;
const SEA_PTS = 3, FOUNT_PTS = 2;
/** 놓는 건물이 아닌 것(땅에 원래 있던 것) */
const fixed = (k: Kind) => k === 'tree' || k === 'lava';

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'score' | 'rise' | 'combo' | 'light3' | 'bakery' | 'quiet' | 'ring' | 'nolava';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
interface ChunkDef { at: number; map: string[]; pack: Kind[] }
interface StageDef {
  name: string; news: string; hint: string; spot: Kind | 'rise' | 'two' | '';
  /** 바다 '.', 빈 땅 'o', 나무 'T', 용암 'V' — 5줄 × 4칸 (위가 먼 쪽) */
  map: string[]; queue: Kind[]; chunks: ChunkDef[]; goal: number; stars: StarDef[];
}
const H: Kind = 'house', B: Kind = 'bakery', L: Kind = 'light', F: Kind = 'forge', W: Kind = 'fount';
export const STAGES: StageDef[] = [
  {
    name: '첫 마을', news: '', hint: '집은 나무 옆이 좋아요', spot: 'rise',
    map: ['....', '.oT.', '.ToT', '.oo.', '....'],
    queue: [H, H, H, H],
    chunks: [{ at: 3, map: ['....', '....', 'o...', 'o...', 'oTo.'], pack: [H, H] }],
    goal: 14, stars: [ST('score', 14, '점수 14 넘기기')],
  },
  {
    name: '빵 굽는 냄새', news: '빵집 — 옆에 집이 있을 때마다 +3', hint: '집을 빵집 둘레에 모아요', spot: 'bakery',
    map: ['....', 'To..', 'oooT', '.oT.', '....'],
    queue: [H, B, H, H, H],
    chunks: [{ at: 12, map: ['....', '....', '....', 'o..o', '.oo.'], pack: [H, H, B, H] }],
    goal: 26, stars: [ST('score', 26, '점수 26 넘기기'), ST('bakery', 3, '빵집 옆에 집 셋')],
  },
  {
    name: '등대 언덕', news: '등대 — 바다 한 면마다 +3', hint: '바다로 튀어나온 끝자리는 등대 자리', spot: 'light',
    map: ['o..o', 'TooT', '.oo.', '....', '....'],
    queue: [H, L, H, H, L, H],
    chunks: [{ at: 14, map: ['....', '....', 'o..o', 'oTTo', '....'], pack: [H, B, H, H] }],
    goal: 38, stars: [ST('score', 38, '점수 38 넘기기'), ST('light3', 1, '등대를 바다 세 면 자리에'), ST('score', 50, '점수 50 넘기기')],
  },
  {
    name: '땅땅 대장간', news: '대장간 — 나무 옆 +3, 집 옆은 −3', hint: '대장간 자리는 집과 떨어진 구석에', spot: 'forge',
    map: ['To..', 'oToo', 'oooo', '....', '....'],
    queue: [H, F, H, H, H, H, H, H],
    chunks: [{ at: 14, map: ['....', '....', '....', '.ooT', '..o.'], pack: [B, H, H] }],
    goal: 30, stars: [ST('score', 30, '점수 30 넘기기'), ST('quiet', 0, '대장간 옆에 집 없이'), ST('score', 40, '점수 40 넘기기')],
  },
  {
    name: '퐁퐁 분수', news: '분수 — 둘레 8칸(대각선도) 모두 +2', hint: '분수는 가운데, 둘레를 빙 채워요', spot: 'fount',
    map: ['....', 'TTo.', 'oooo', '.oo.', '....'],
    queue: [H, W, H, B, H, H, H],
    chunks: [{ at: 16, map: ['.oo.', '...o', '....', '....', '.oo.'], pack: [H, W, H, H, B] }],
    goal: 44, stars: [ST('score', 44, '점수 44 넘기기'), ST('ring', 7, '분수 둘레에 일곱 채'), ST('combo', 8, '한 번에 8점 받기')],
  },
  {
    name: '화산 섬', news: '화산 섬 — 용암 옆 집은 −3, 대장간은 +4', hint: '집은 용암에서 멀리, 대장간은 가까이', spot: 'lava',
    map: ['....', 'oTo.', 'ooo.', 'oTo.', '....'],
    queue: [H, H, F, H, B, H, H],
    chunks: [{ at: 12, map: ['.oo.', '...V', '...V', '....', '.oo.'], pack: [F, H, H, L] }],
    goal: 32, stars: [ST('score', 32, '점수 32 넘기기'), ST('nolava', 0, '용암 옆에 집 없이'), ST('score', 40, '점수 40 넘기기')],
  },
  {
    name: '축제 섬', news: '새 섬이 둘 — 점수를 더 모으면 또 솟아요', hint: '두 번째 섬까지 띄워요', spot: 'two',
    map: ['....', '.oT.', 'oooo', '.oT.', '....'],
    queue: [H, B, H, H, W, H],
    chunks: [
      { at: 12, map: ['.oo.', '....', '....', '....', '....'], pack: [L, H] },
      { at: 34, map: ['....', '....', '....', 'o..o', '.oo.'], pack: [F, H, H, L] },
    ],
    goal: 44, stars: [ST('score', 44, '점수 44 넘기기'), ST('quiet', 0, '대장간 옆에 집 없이'), ST('score', 56, '점수 56 넘기기')],
  },
];
export const STAGE_COUNT = STAGES.length;
const CLEAR_PTS = 100, STAR_PTS = 250, SC_PTS = 2, WIN_PTS = 200, HEART_PTS = 100;
/** 연출(틱): 내려앉기 · 숫자 하나씩 · 날아가는 시간 · 다 꽂힌 뒤 · 큰 한 방 · 섬 솟기 · 결과 */
const DROP = 11, STAG = 6, FLY = 13, SETTLE = 14, COMBO = 7, COMBO_T = 18, RISE_T = 84, RISE_UP = 40, RESULT_OK = 190, RESULT_FAIL = 150, BANNER_T = 170;

// ───────────────────────────── 상태 ─────────────────────────────
interface Bld { k: Kind; id: number; t: number; got: number; sea: number }
interface Cell { land: boolean; b: Bld | null; chunk: number; riseT: number; fut: Kind | null }
interface Gain { from: number; v: number; sea: boolean }
interface Drop { i: number; k: Kind; gains: Gain[]; t0: number; total: number; added: number; n: number }
interface Ev { t: number; kind: string; i: number; n?: number; text?: string }

export interface IsleState {
  rng: Rng; seed: number; t: number; stage: number; mirror: boolean; plans: { queue: Kind[]; packs: Kind[][] }[]; phase: 'pick' | 'drop' | 'rise' | 'result'; pt: number;
  cells: Cell[]; queue: Kind[]; qi: number; sc: number; risen: number; rising: number; best1: number; placed: number;
  drop: Drop | null; nid: number; rgains: RGain[]; rgn: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; ok: boolean; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  down: boolean; firstTap: number; firstBig: number; wowN: number; slow: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { sea: boolean; q: number; t: number; label: string } | null;
  events: Ev[]; bigText: string; bigT: number; cheer: number;
}

const ev = (s: IsleState, kind: string, i: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, i, n, text });
function see(s: IsleState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: IsleState, text: string) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
}

/** 지도 한 글자 → 칸 (거울이면 좌우를 뒤집는다) */
function readMap(map: string[], mirror: boolean, f: (i: number, ch: string) => void) {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const ch = map[r][mirror ? COLS - 1 - c : c];
      if (ch && ch !== '.') f(r * COLS + c, ch);
    }
}
const chFix = (ch: string): Kind | null => (ch === 'T' ? 'tree' : ch === 'V' ? 'lava' : null);

function newStage(s: IsleState) {
  const d = STAGES[s.stage];
  s.phase = 'pick';
  s.pt = 0;
  s.cells = [...Array(NC)].map(() => ({ land: false, b: null, chunk: -1, riseT: -999, fut: null }));
  readMap(d.map, s.mirror, (i, ch) => {
    s.cells[i].land = true;
    const k = chFix(ch);
    if (k) s.cells[i].b = { k, id: ++s.nid, t: -999, got: 0, sea: 0 };
  });
  d.chunks.forEach((c, n) => readMap(c.map, s.mirror, (i, ch) => ((s.cells[i].chunk = n), (s.cells[i].fut = chFix(ch)))));
  s.queue = [...s.plans[s.stage].queue];
  s.qi = 0;
  s.sc = 0;
  s.risen = 0;
  s.rising = -1;
  s.best1 = 0;
  s.placed = 0;
  s.drop = null;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.ok = false;
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    const sp = d.spot;
    if (sp === 'rise') see(s, 'house');
    else if (sp) see(s, sp);
    const nk = s.queue.findIndex((k) => k === sp);
    s.spot = sp === 'lava' || sp === 'two' ? { sea: true, q: 0, t: s.t, label: sp === 'lava' ? '화산 섬' : '새 섬 둘' } : nk >= 0 && nk <= 1 ? { sea: false, q: nk, t: s.t, label: K[sp as Kind].name } : null;
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
}

/** 칸 i에 k를 놓으면 받는 점수들 (봇·미리 보기·실제 모두 같은 함수) */
export function gainsAt(cells: Cell[], i: number, k: Kind): Gain[] {
  const out: Gain[] = [];
  for (const j of NB4[i]) {
    const c = j >= 0 ? cells[j] : null;
    if (!c || !c.land) {
      if (k === 'light') out.push({ from: j, v: SEA_PTS, sea: true });
      continue;
    }
    if (c.b) {
      const v = rel(k, c.b.k);
      if (v) out.push({ from: j, v, sea: false });
    }
  }
  for (const j of NB8[i]) {
    const c = cells[j];
    if (!c.land || !c.b) continue;
    if (k === 'fount') out.push({ from: j, v: FOUNT_PTS, sea: false });
    if (c.b.k === 'fount') out.push({ from: j, v: FOUNT_PTS, sea: false });
  }
  return out;
}
const sumG = (g: Gain[]) => g.reduce((a, x) => a + x.v, 0);
const seaSides = (cells: Cell[], i: number) => NB4[i].filter((j) => j < 0 || !cells[j].land).length;
const empty = (c: Cell) => c.land && !c.b;

function place(s: IsleState, i: number) {
  const k = s.queue[s.qi++];
  const gains = gainsAt(s.cells, i, k), total = sumG(gains);
  s.cells[i].b = { k, id: ++s.nid, t: s.t, got: total, sea: seaSides(s.cells, i) };
  s.drop = { i, k, gains, t0: s.t, total, added: 0, n: 0 };
  s.phase = 'drop';
  s.pt = 0;
  s.placed++;
  ev(s, 'place', i, total);
  if (s.banner && s.t - s.banner.t < BANNER_T) s.banner.t = Math.min(s.banner.t, s.t - BANNER_T + 20);
}
function dropEnd(d: Drop) {
  return DROP + Math.max(0, d.gains.length - 1) * STAG + FLY + SETTLE + (d.total >= COMBO ? COMBO_T : 0);
}
function stepDrop(s: IsleState) {
  const d = s.drop!;
  if (s.slow > 0 && s.t % 2) {
    s.slow--;
    return;
  }
  s.pt++;
  if (s.pt === DROP) ev(s, 'land', d.i, d.total);
  while (d.n < d.gains.length && s.pt >= DROP + d.n * STAG + FLY) {
    const g = d.gains[d.n++];
    d.added += g.v;
    s.sc += g.v;
    ev(s, 'hit', d.i, g.v, String(g.from));
    if (d.n === d.gains.length) {
      if (d.total >= COMBO) {
        s.slow = 16;
        wow(s, d.total >= 12 ? `대박! +${d.total}` : `한 방에 +${d.total}!`);
      }
      ev(s, 'sum', d.i, d.total);
    }
  }
  if (s.pt >= dropEnd(d)) {
    s.best1 = Math.max(s.best1, d.total);
    s.drop = null;
    afterMove(s);
  }
}
/** 놓기가 끝난 뒤: 점수 막대가 표시를 넘었으면 섬이 솟고, 아니면 다음 건물 또는 판 끝 */
function afterMove(s: IsleState) {
  const d = STAGES[s.stage];
  if (s.risen < d.chunks.length && s.sc >= d.chunks[s.risen].at) return startRise(s, s.risen);
  if (s.qi >= s.queue.length || !s.cells.some(empty)) return endStage(s);
  s.phase = 'pick';
  s.pt = 0;
}
/** 섬 조각이 솟는다: 땅이 되고 나무·용암이 생긴다. 새 나무·용암이 옆 건물과 주고받는 점수를 돌려준다 (봇도 같은 함수) */
interface RGain { from: number; to: number; v: number }
function riseCells(cells: Cell[], c: ChunkDef, mirror: boolean, mk: (k: Kind) => Bld): RGain[] {
  const born: number[] = [];
  readMap(c.map, mirror, (i, ch) => {
    const cell = cells[i];
    cell.land = true;
    const k = chFix(ch);
    if (k) (cell.b = mk(k)), born.push(i);
  });
  const out: RGain[] = [];
  for (const j of born) {
    const k = cells[j].b!.k;
    for (const i of NB4[j]) {
      const b = i >= 0 ? cells[i].b : null;
      if (!b || fixed(b.k) || born.includes(i)) continue;
      const v = rel(k, b.k);
      if (v) out.push({ from: j, to: i, v });
    }
    for (const i of NB8[j]) if (cells[i].b?.k === 'fount') out.push({ from: j, to: i, v: FOUNT_PTS });
  }
  return out;
}
function startRise(s: IsleState, n: number) {
  const c = STAGES[s.stage].chunks[n];
  s.phase = 'rise';
  s.pt = 0;
  s.rising = n;
  s.rgains = riseCells(s.cells, c, s.mirror, (k) => ({ k, id: ++s.nid, t: s.t + RISE_UP, got: 0, sea: 0 }));
  s.rgn = 0;
  readMap(c.map, s.mirror, (i) => (s.cells[i].riseT = s.t));
  s.queue.push(...s.plans[s.stage].packs[n]);
  s.risen++;
  see(s, 'rise');
  if (n === 1) see(s, 'two');
  const lava = c.map.some((r) => r.includes('V'));
  if (lava) see(s, 'lava');
  wow(s, n === 1 ? '섬이 또 솟았다!' : lava ? '화산 섬이 솟았다!' : '새 섬이 솟았다!');
  ev(s, 'rise', -1, n);
}
const riseEnd = (s: IsleState) => RISE_T + (s.rgains.length ? (s.rgains.length - 1) * STAG + FLY : 0);
function stepRise(s: IsleState) {
  s.pt++;
  while (s.rgn < s.rgains.length && s.pt >= RISE_UP + 8 + s.rgn * STAG + FLY) {
    const g = s.rgains[s.rgn++];
    s.sc += g.v;
    ev(s, 'rhit', g.to, g.v, String(g.from));
  }
  if (s.pt >= riseEnd(s)) {
    s.rising = -1;
    s.rgains = [];
    afterMove(s);
  }
}

function starMet(s: IsleState, q: StarDef): boolean {
  const cs = s.cells;
  switch (q.k) {
    case 'score': return s.sc >= q.n;
    case 'rise': return s.risen >= q.n;
    case 'combo': return s.best1 >= q.n;
    case 'light3': return cs.filter((c) => c.b?.k === 'light' && c.b.sea >= 3).length >= q.n;
    case 'bakery': return cs.some((c, i) => c.b?.k === 'bakery' && NB4[i].filter((j) => j >= 0 && cs[j].b?.k === 'house').length >= q.n);
    case 'quiet': return cs.some((c) => c.b?.k === 'forge') && !cs.some((c, i) => c.b?.k === 'forge' && NB4[i].some((j) => j >= 0 && cs[j].b?.k === 'house'));
    case 'ring': return cs.some((c, i) => c.b?.k === 'fount' && NB8[i].filter((j) => cs[j].b).length >= q.n);
    case 'nolava': return s.risen > 0 && !cs.some((c, i) => c.b?.k === 'lava' && NB4[i].some((j) => j >= 0 && cs[j].b?.k === 'house'));
  }
}
/** 별 칸 옆 진행 (지금까지) */
export function starNow(s: IsleState, q: StarDef): boolean {
  return starMet(s, q);
}
function endStage(s: IsleState) {
  const d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = s.sc >= d.goal;
  if (s.ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS + s.sc * SC_PTS) * (1 + s.stage * 0.5);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', -1, s.got);
    if (s.got === d.stars.length && s.stage > 0) wow(s, '별 다 땄다!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', -1);
  }
}

// ───────────────────────────── 톡 ─────────────────────────────
/** x: 0~1(가로), y: 가로 폭 단위 → 칸 번호 (없으면 -1) */
export function cellAt(x: number, y: number): number {
  const c = Math.floor((x - GX0) / CW), r = Math.floor((y - GY0) / CH);
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return -1;
  return r * COLS + c;
}

const game: GameDef<IsleState> & { wows(s: IsleState): number } = {
  id: 'isletown',
  name: '둥실 섬 마을 짓기',
  genes: ['placescore', 'decorate'],
  twist: '건물을 놓으면 옆 건물들이 점수 숫자를 휙휙 날려 꽂고(좋아하면 +, 싫어하면 −), 점수 막대가 차면 바다에서 새 섬 조각이 쑤욱 솟아 땅이 넓어진다',
  rules: [
    '아래 건물을 놓을 빈칸을 톡! 칸 위 숫자가 거기 놓으면 받는 점수예요.',
    '옆 건물끼리 점수를 주고받아요 — 좋아하면 +, 싫어하면 −. 막대가 차면 새 섬이 솟아요.',
    '건물을 다 놓았을 때 목표 점수를 못 넘기면 하트 −1, 그 판만 다시.',
  ],
  controls: 'touch',
  hint: '빈칸 톡 = 건물 놓기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '바다 위에 둥실 뜬 작은 섬 마을 디오라마 — 모래 해변·파도·갈매기, 통통한 손그림 집과 주민 동물',
    mood: '청록 바다에 하얀 파도가 섬을 감싸고, 모래 해변 위 잔디 언덕에 빨간 지붕 집·줄무늬 빵집·흰 등대가 쿵 내려앉는다. 오리·병아리 주민이 돌아다니다 좋은 이웃이 생기면 폴짝 뛰고, 점수가 차면 바다가 갈라지며 새 섬이 솟는다.',
    palette: { bg: '#5fd0e0', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => s.cells.filter((c) => c.b && !fixed(c.b.k)).length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, mirror: false, phase: 'pick', pt: 0,
      cells: [], queue: [], qi: 0, sc: 0, risen: 0, rising: -1, best1: 0, placed: 0, drop: null, nid: 0, rgains: [], rgn: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false], ok: false, pts: 0, won: false, dead: false, again: false, tries: 0,
      down: false, firstTap: -1, firstBig: -1, wowN: 0, slow: 0,
      seen: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999, cheer: -999,
    } as unknown as IsleState;
    s.mirror = s.rng() < 0.5;
    s.plans = STAGES.map((d) => ({ queue: [...d.queue.slice(0, 2), ...shuffle(d.queue.slice(2), s.rng)], packs: d.chunks.map((c) => shuffle(c.pack.slice(), s.rng)) }));
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
        const i = cellAt(p!.x, p!.y * A);
        if (i >= 0 && empty(s.cells[i])) place(s, i);
        else if (i >= 0 && s.cells[i].b) ev(s, 'poke', i);
        else ev(s, 'splash', i, 0, `${p!.x},${p!.y * A}`);
      }
    } else if (s.phase === 'drop') stepDrop(s);
    else if (s.phase === 'rise') stepRise(s);
    else {
      s.pt++;
      const Tt = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= Tt || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const isletown = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapCell = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: cellX(i), y: cellY(i) / A } });

/** 봇이 내다볼 때 쓰는 작은 판 */
interface Mini { cells: Cell[]; queue: Kind[]; qi: number; sc: number; risen: number; best1: number; stage: number; mirror: boolean; plans: IsleState['plans'] }
export const cloneMini = (s: Mini): Mini => ({
  cells: s.cells.map((c) => ({ land: c.land, b: c.b ? { ...c.b } : null, chunk: c.chunk, riseT: c.riseT, fut: c.fut })),
  queue: s.queue.slice(), qi: s.qi, sc: s.sc, risen: s.risen, best1: s.best1, stage: s.stage, mirror: s.mirror, plans: s.plans,
});
export function miniPlace(m: Mini, i: number): number {
  const k = m.queue[m.qi++];
  const g = sumG(gainsAt(m.cells, i, k));
  m.cells[i].b = { k, id: 0, t: 0, got: g, sea: seaSides(m.cells, i) };
  m.sc += g;
  m.best1 = Math.max(m.best1, g);
  const d = STAGES[m.stage];
  while (m.risen < d.chunks.length && m.sc >= d.chunks[m.risen].at) {
    const c = d.chunks[m.risen++];
    m.sc += riseCells(m.cells, c, m.mirror, (kk) => ({ k: kk, id: 0, t: 0, got: 0, sea: 0 })).reduce((a, x) => a + x.v, 0);
    m.queue.push(...m.plans[m.stage].packs[m.risen - 1]);
  }
  return g;
}
const empties = (m: { cells: Cell[] }) => m.cells.map((c, i) => (empty(c) ? i : -1)).filter((i) => i >= 0);
/** 별 쪽으로 얼마나 왔나 (잘하는 봇의 덤) */
function starLean(m: Mini): number {
  const d = STAGES[m.stage], cs = m.cells;
  let v = 0;
  for (const q of d.stars) {
    if (q.k === 'light3') v += cs.filter((c) => c.b?.k === 'light' && c.b.sea >= 3).length >= q.n ? 8 : 0;
    else if (q.k === 'bakery') v += Math.max(0, ...cs.map((c, i) => (c.b?.k === 'bakery' ? Math.min(q.n, NB4[i].filter((j) => j >= 0 && cs[j].b?.k === 'house').length) : 0))) * 3;
    else if (q.k === 'quiet') v -= cs.some((c, i) => c.b?.k === 'forge' && NB4[i].some((j) => j >= 0 && cs[j].b?.k === 'house')) ? 8 : 0;
    else if (q.k === 'nolava') v -= cs.some((c, i) => (c.b?.k === 'lava' || (!c.land && c.fut === 'lava')) && NB4[i].some((j) => j >= 0 && cs[j].b?.k === 'house')) ? 8 : 0;
    else if (q.k === 'ring') v += Math.max(0, ...cs.map((c, i) => (c.b?.k === 'fount' ? Math.min(q.n, NB8[i].filter((j) => cs[j].b).length) : 0))) * 1.5;
    else if (q.k === 'combo') v += m.best1 >= q.n ? 8 : 0;
    else if (q.k === 'rise') v += Math.min(q.n, m.risen) * 6;
  }
  // 아직 안 솟은 섬의 나무·용암 옆 (솟으면 주고받을 점수)
  for (let j = 0; j < NC; j++) {
    const f = cs[j].fut;
    if (!f || cs[j].land) continue;
    for (const i of NB4[j]) if (i >= 0 && cs[i].b && !fixed(cs[i].b!.k)) v += rel(f, cs[i].b!.k) * 0.5;
  }
  return v + m.risen * 4;
}
/** 미리 보기 너머 남은 건물들이 앞으로 받을 수 있는 점수(어림: 자리를 가리는 건물부터 남은 가장 좋은 칸 하나씩) */
const PRIO: Record<Kind, number> = { light: 0, forge: 1, fount: 2, bakery: 3, house: 4, tree: 5, lava: 6 };
function potential(m: Mini): number {
  const es = empties(m), used = new Set<number>();
  const rest = m.queue.slice(m.qi).sort((a, b) => PRIO[a] - PRIO[b]);
  let v = 0;
  for (const k of rest) {
    let bv = -1e9, bi = -1;
    for (const i of es) {
      if (used.has(i)) continue;
      let g = sumG(gainsAt(m.cells, i, k));
      // 시끄러운 대장간 둘레의 빈칸은 나중에 집이 올 수 있다
      if (k === 'forge') g -= 1.5 * NB4[i].filter((j) => j >= 0 && empty(m.cells[j])).length;
      if (g > bv) (bv = g), (bi = i);
    }
    if (bi < 0) break;
    used.add(bi);
    v += bv;
  }
  return v * POT;
}
const POT = 0.6;
/** 지금 건물 + 다음 건물(미리 보기)까지 두 수를 다 놓아 보고 가장 좋은 칸 */
export function bestTwo(s: IsleState): number {
  const base: Mini = cloneMini(s);
  let best = -1, bv = -1e9;
  for (const i of empties(base)) {
    const m1 = cloneMini(base), g1 = miniPlace(m1, i);
    let v2 = starLean(m1);
    if (m1.qi < m1.queue.length) {
      let b2 = -1e9;
      for (const j of empties(m1)) {
        const m2 = cloneMini(m1), g2 = miniPlace(m2, j);
        b2 = Math.max(b2, g2 + starLean(m2) + potential(m2));
      }
      if (b2 > -1e9) v2 = b2;
    }
    const v = g1 + v2;
    if (v > bv + 1e-9) (bv = v), (best = i);
  }
  return best;
}
const tapMem = new WeakMap<object, number>();
function pickTap(s: IsleState, choose: () => number): Input {
  if (s.down) return NO;
  if (s.phase === 'result') return s.pt > 60 ? tapCell(9) : NO;
  if (s.phase !== 'pick') return NO;
  const last = tapMem.get(s) ?? -99;
  if (s.t - last < 4) return NO;
  tapMem.set(s, s.t);
  const i = choose();
  return i >= 0 ? tapCell(i) : NO;
}
/** 잘하는 봇: 지금 건물과 다음 건물(미리 보기)을 둘 다 놓아 보고 고른다 */
export const isletownSmart: Bot<IsleState> = {
  name: '두 수 앞까지 놓아 보기',
  act: (s) => pickTap(s, () => bestTwo(s)),
};
const dumbMem = new WeakMap<object, { next: number; down: boolean; i: number; jx: number; jy: number }>();
/** 못하는 봇: 아무 때나 아무 칸(바다 포함)이나 톡 */
export const isletownRandom: Bot<IsleState> = {
  name: '아무 칸이나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, i: 0, jx: 0, jy: 0 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.i = Math.floor(rng() * NC);
        m.jx = (rng() - 0.5) * CW * 0.8;
        m.jy = (rng() - 0.5) * CH * 0.8;
      } else m.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: cellX(m.i) + m.jx, y: (cellY(m.i) + m.jy) / A } } : NO;
  },
};
/** 버릇 봇: 늘 맨 앞(왼쪽 위부터) 빈칸에 놓는다 */
export const isletownHabit: Bot<IsleState> = {
  name: '늘 맨 앞 빈칸에',
  act: (s) => pickTap(s, () => s.cells.findIndex(empty)),
};
/** 독립 버릇 봇: 늘 지금 점수가 가장 큰 칸에 놓는다 (같으면 앞 칸) */
export function greedyCell(s: { cells: Cell[]; queue: Kind[]; qi: number }): number {
  const k = s.queue[s.qi];
  let best = -1, bv = -1e9;
  s.cells.forEach((c, i) => {
    if (!empty(c)) return;
    const v = sumG(gainsAt(s.cells, i, k));
    if (v > bv) (bv = v), (best = i);
  });
  return best;
}
export const isletownHabit2: Bot<IsleState> = {
  name: '늘 지금 가장 큰 점수 칸에',
  act: (s) => pickTap(s, () => greedyCell(s)),
};

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
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, ...st: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of st) g.addColorStop(o, c);
  return g;
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  const lim = (q: number) => Math.max(0, Math.min(q, Math.abs(w) / 2, Math.abs(h) / 2));
  ctx.roundRect(x, y, w, h, Array.isArray(r) ? r.map(lim) : lim(r));
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
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const back = (u: number) => {
  const q = clamp(u, 0, 1) - 1;
  return 1 + q * q * (2.6 * q + 1.6);
};
const OUT = '#4a2a12';
const ROOF = [
  ['#ff6a55', '#c8372a'],
  ['#ffa53a', '#c9701a'],
  ['#4fa8ff', '#2a6ac8'],
  ['#b483ff', '#7a4ad0'],
  ['#3fcf9a', '#1f8f62'],
];

/** 화면 연출만 기억하는 곳 (시뮬레이션과 분리) */
interface React { t: number; v: number }
interface Vis { ev: number; react: Map<number, React>; land: Map<number, number>; poke: Map<number, number>; disp: number; cheer: number; sad: number; idle: number; lastPick: number; splash: { x: number; y: number; t: number }[]; say: { i: number; text: string; t: number } | null }
const VIS = new WeakMap<object, Vis>();
const visOf = (s: IsleState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { ev: -1, react: new Map(), land: new Map(), poke: new Map(), disp: 0, cheer: -999, sad: -999, idle: 0, lastPick: 0, splash: [], say: null }));
  return v;
};

// ── 칸 위치 (화면 px) ──
interface Geo { X: (x: number) => number; Y: (y: number) => number; R: (r: number) => number; w: number; h: number }
/** 칸의 땅 높이 (솟는 중이면 아래에서 올라온다) */
function riseOff(s: IsleState, i: number): number {
  const c = s.cells[i];
  if (c.riseT < 0) return 0;
  const u = (s.t - c.riseT) / RISE_UP;
  if (u >= 1) return 0;
  return (1 - back(u)) * 0.12;
}
/** 솟는 칸의 진하기 (물속에서 떠오른다) */
function riseAlpha(s: IsleState, i: number): number {
  const c = s.cells[i];
  if (c.riseT < 0) return 1;
  return clamp(((s.t - c.riseT) / RISE_UP) * 2.2, 0, 1);
}
/** 바다 쪽 한 면의 위치 (등대가 받는 바다 점수가 날아오는 곳) */
function seaPos(i: number, k: number): [number, number] {
  const d = [[0, -1], [-1, 0], [1, 0], [0, 1]][k];
  return [cellX(i) + d[0] * CW * 0.72, cellY(i) + d[1] * CH * (d[1] < 0 ? 0.55 : 0.8)];
}

function drawAll(ctx: C2, s: IsleState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s);
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const G: Geo = { X, Y, R, w, h };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const d = STAGES[s.stage];

  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev) continue;
    const ex = e.i >= 0 ? X(cellX(e.i)) : w / 2, ey = e.i >= 0 ? Y(cellY(e.i)) : Y(0.6);
    switch (e.kind) {
      case 'place':
        vis.lastPick = e.t;
        break;
      case 'land': {
        const b = s.cells[e.i].b;
        if (b) vis.land.set(b.id, e.t);
        fx.kick(4 + Math.min(6, Math.abs(e.n ?? 0) * 0.5));
        fx.ring(ex, ey + R(0.02), 'rgba(255,248,220,.95)', R(0.13), 5);
        fx.burst(ex, ey + R(0.03), '#f4dca0', 16, 3.2, 3);
        fx.burst(ex, ey + R(0.03), '#ffffff', 8, 2.2, 2.2);
        break;
      }
      case 'hit':
      case 'rhit': {
        const v = e.n ?? 0, from = Number(e.text ?? -1);
        const big = Math.abs(v) >= 3;
        fx.pop(ex + (hsh(e.t) - 0.5) * R(0.05), ey - R(0.12), `${v > 0 ? '+' : ''}${v}`, v > 0 ? '#fff27a' : '#ff8a8a', Math.max(15, R(big ? 0.06 : 0.048)));
        fx.burst(ex, ey - R(0.05), v > 0 ? '#ffe14a' : '#ff6a5a', big ? 12 : 7, big ? 3.4 : 2.4, 2.4);
        if (from >= 0) vis.react.set(from, { t: e.t, v });
        if (e.kind === 'rhit') vis.react.set(e.i, { t: e.t, v });
        if (v > 0) vis.cheer = e.t;
        else (vis.sad = e.t), fx.kick(3);
        break;
      }
      case 'sum': {
        const v = e.n ?? 0;
        const b = s.cells[e.i].b;
        if (b) vis.react.set(e.i, { t: e.t, v });
        if (v >= COMBO) {
          fx.kick(10);
          fx.blink('#fff6c0', 0.3);
          fx.ring(ex, ey - R(0.04), '#ffd23a', R(0.3), 7);
          for (let q = 0; q < 3; q++) fx.burst(ex, ey - R(0.08), ['#ffd23a', '#ff7aa8', '#7ae0ff'][q], 14, 5, 3);
        } else if (v > 0) fx.ring(ex, ey - R(0.04), '#fff6a0', R(0.16), 4);
        vis.say = { i: e.i, text: v >= COMBO ? '최고야!' : v > 0 ? K[b?.k ?? 'house'].say : v < 0 ? '시끄러워…' : '음…', t: e.t };
        break;
      }
      case 'rise': {
        fx.kick(12);
        fx.blink('#e8fbff', 0.35);
        fx.pop(X(0.78), Y(1.07), `건물 +${s.plans[s.stage].packs[e.n ?? 0]?.length ?? 0}`, '#ffffff', Math.max(16, R(0.05)));
        for (let i = 0; i < NC; i++)
          if (s.cells[i].riseT === e.t) {
            fx.ring(X(cellX(i)), Y(cellY(i)), 'rgba(255,255,255,.9)', R(0.2), 5);
            fx.burst(X(cellX(i)), Y(cellY(i)), '#d8f6ff', 14, 5, 3.2);
            fx.burst(X(cellX(i)), Y(cellY(i)), '#ffffff', 8, 4, 2.4);
          }
        break;
      }
      case 'clear':
        vis.cheer = e.t;
        for (let q = 0; q < 6; q++) fx.burst(X(0.12 + q * 0.15), Y(0.45 + (q % 2) * 0.12), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff', '#ff9a3a'][q], 16, 4.5, 3);
        break;
      case 'fail':
        vis.sad = e.t;
        fx.kick(6);
        break;
      case 'poke':
        vis.poke.set(e.i, e.t);
        fx.burst(ex, ey - R(0.08), '#ffffff', 6, 2, 2);
        break;
      case 'splash': {
        const [px, py] = (e.text ?? '0,0').split(',').map(Number);
        vis.splash.push({ x: px, y: py, t: e.t });
        fx.ring(X(px), Y(py), 'rgba(255,255,255,.85)', R(0.06), 3);
        fx.burst(X(px), Y(py), '#d8f6ff', 6, 2, 2);
        break;
      }
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t));
  if (s.phase === 'rise' && s.pt < RISE_UP && s.pt % 3 === 0) {
    fx.kick(3);
    for (let i = 0; i < NC; i++) {
      const c = s.cells[i];
      if (c.riseT < 0 || s.t - c.riseT > RISE_UP || hsh(i + s.pt) < 0.5) continue;
      const px = X(cellX(i) + (hsh(i * 3 + s.pt) - 0.5) * CW), py = Y(cellY(i) + CH * 0.35 - riseOff(s, i));
      fx.burst(px, py, hsh(s.pt + i) < 0.5 ? '#ffffff' : '#bff0ff', 5, 4.5, 2.6);
    }
  }
  vis.disp += (s.sc - vis.disp) * 0.2;
  if (Math.abs(s.sc - vis.disp) < 0.05) vis.disp = s.sc;

  ctx.save();
  fx.begin(ctx);
  drawSea(ctx, s, G);
  drawPending(ctx, s, G);
  drawIsland(ctx, s, G);
  drawThings(ctx, s, vis, G);
  drawPendingLabel(ctx, s, G);
  drawFlying(ctx, s, G, font);
  drawPreview(ctx, s, vis, G, font);
  ctx.restore();
  drawTop(ctx, s, vis, G, font);
  drawTray(ctx, s, G, font);
  drawBanner(ctx, s, fx, G, font);
  void d;
}

// ── 바다 ──
function drawSea(ctx: C2, s: IsleState, G: Geo) {
  const { X, Y, R, w, h } = G, t = s.t;
  ctx.fillStyle = lin(ctx, 0, Y(0.18), 0, h, [0, '#9df0f4'], [0.25, '#5fd3e4'], [0.7, '#33b8d6'], [1, '#2a9fc6']);
  ctx.fillRect(0, 0, w, h);
  // 햇빛 반짝
  ctx.fillStyle = radg(ctx, X(0.82), Y(0.22), 0, R(0.55), [0, 'rgba(255,255,230,.55)'], [1, 'rgba(255,255,230,0)']);
  ctx.fillRect(0, 0, w, h);
  // 물결 줄
  ctx.lineCap = 'round';
  for (let k = 0; k < 26; k++) {
    const x0 = hsh(k * 3.1) * 1.1 - 0.05, y0 = 0.2 + hsh(k * 7.7) * 0.95;
    const drift = ((t * 0.0006 * (0.5 + hsh(k))) % 0.2) - 0.1;
    const len = 0.04 + hsh(k * 1.3) * 0.05, a = 0.25 + 0.25 * Math.sin(t * 0.05 + k);
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = Math.max(1.2, R(0.005));
    ctx.beginPath();
    const x = X(x0 + drift), y = Y(y0);
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + R(len / 2), y - R(0.008), x + R(len), y);
    ctx.stroke();
  }
  // 반짝이
  for (let k = 0; k < 14; k++) {
    const a = Math.max(0, Math.sin(t * 0.07 + k * 2.3));
    if (a < 0.6) continue;
    const x = X(hsh(k * 5.3)), y = Y(0.22 + hsh(k * 9.1) * 1.0), r = R(0.008) * a;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.moveTo(x, y - r * 2);
    ctx.lineTo(x + r * 0.5, y);
    ctx.lineTo(x, y + r * 2);
    ctx.lineTo(x - r * 0.5, y);
    ctx.closePath();
    ctx.fill();
  }
  // 가끔 물고기가 폴짝
  const jp = 420, jt = t % jp, jk = Math.floor(t / jp);
  if (jt < 50) {
    const u = jt / 50, jx = X(0.15 + hsh(jk * 3.7) * 0.7), jy = Y(hsh(jk * 1.9) < 0.5 ? 0.24 : 1.04);
    const fxp = jx + (u - 0.5) * R(0.12), fyp = jy - Math.sin(u * Math.PI) * R(0.07);
    if (u < 0.12 || u > 0.88) {
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 2;
      ell(ctx, u < 0.5 ? jx - R(0.06) : jx + R(0.06), jy, R(0.025), R(0.008));
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(fxp, fyp);
    ctx.rotate((u - 0.5) * 2.2);
    ctx.fillStyle = '#ff9a4a';
    ctx.strokeStyle = '#a84a1a';
    ctx.lineWidth = 1.4;
    ell(ctx, 0, 0, R(0.022), R(0.011));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-R(0.02), 0);
    ctx.lineTo(-R(0.035), -R(0.01));
    ctx.lineTo(-R(0.035), R(0.01));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OUT;
    ell(ctx, R(0.01), -R(0.002), R(0.003), R(0.003));
    ctx.fill();
    ctx.restore();
  }
  // 작은 돛단배 (멀리)
  const bx = X(((t * 0.00025 + 0.1) % 1.3) - 0.15), by = Y(0.235) + Math.sin(t * 0.06) * R(0.003);
  ctx.fillStyle = 'rgba(30,90,120,.25)';
  ell(ctx, bx, by + R(0.012), R(0.03), R(0.006));
  ctx.fill();
  ctx.fillStyle = '#8a5a30';
  ctx.beginPath();
  ctx.moveTo(bx - R(0.028), by);
  ctx.lineTo(bx + R(0.028), by);
  ctx.lineTo(bx + R(0.018), by + R(0.012));
  ctx.lineTo(bx - R(0.018), by + R(0.012));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(bx, by - R(0.045));
  ctx.lineTo(bx + R(0.022), by - R(0.004));
  ctx.lineTo(bx, by - R(0.004));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7a6a';
  ctx.beginPath();
  ctx.moveTo(bx - R(0.003), by - R(0.04));
  ctx.lineTo(bx - R(0.02), by - R(0.006));
  ctx.lineTo(bx - R(0.003), by - R(0.006));
  ctx.closePath();
  ctx.fill();
  // 갈매기
  for (let k = 0; k < 3; k++) {
    const sp = 0.0011 + k * 0.0004, x = X(((t * sp + k * 0.37) % 1.4) - 0.2), y = Y(0.22 + k * 0.05 + Math.sin(t * 0.02 + k) * 0.015);
    const f = Math.sin(t * 0.25 + k * 2) * 0.5 + 0.5, gs = R(0.018 + k * 0.003);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1.6, R(0.006));
    ctx.beginPath();
    ctx.moveTo(x - gs, y - gs * (0.2 + f * 0.6));
    ctx.quadraticCurveTo(x - gs * 0.4, y - gs * 0.1, x, y + gs * 0.15);
    ctx.quadraticCurveTo(x + gs * 0.4, y - gs * 0.1, x + gs, y - gs * (0.2 + f * 0.6));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,60,80,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

/** 칸 사각형 (바다 쪽 면만 m만큼 넓힌다) + 모서리 둥글기 */
function cellRect(s: IsleState, i: number, m: number, G: Geo, solid: (j: number) => boolean): { x: number; y: number; w: number; h: number; r: number[] } {
  const [up, lf, rt, dn] = NB4[i].map((j) => j >= 0 && solid(j));
  const x0 = cellX(i) - CW / 2, y0 = cellY(i) - CH / 2;
  const L = lf ? 0 : m, Rr = rt ? 0 : m, U = up ? 0 : m, D = dn ? 0 : m;
  const rad = G.R(Math.min(CW, CH) * 0.32 + m);
  return {
    x: G.X(x0 - L), y: G.Y(y0 - U - riseOff(s, i)), w: G.R(CW + L + Rr) + 0.5, h: G.R(CH + U + D) + 0.5,
    r: [!up && !lf ? rad : 0, !up && !rt ? rad : 0, !dn && !rt ? rad : 0, !dn && !lf ? rad : 0],
  };
}

// ── 아직 안 솟은 섬 조각: 얕은 물 · 점선 · 비치는 나무/용암 ──
function drawPending(ctx: C2, s: IsleState, G: Geo) {
  const { X, Y, R } = G, t = s.t, d = STAGES[s.stage];
  if (s.risen >= d.chunks.length) return;
  const n = s.risen, pend = (j: number) => !s.cells[j].land && s.cells[j].chunk === n;
  ctx.save();
  for (let i = 0; i < NC; i++) {
    if (!pend(i)) continue;
    const q = cellRect(s, i, 0.01, G, pend);
    ctx.fillStyle = `rgba(190,250,245,${0.42 + 0.08 * Math.sin(t * 0.06 + i)})`;
    rr(ctx, q.x, q.y, q.w, q.h, q.r);
    ctx.fill();
  }
  ctx.setLineDash([6, 5]);
  ctx.lineDashOffset = -t * 0.4;
  ctx.strokeStyle = 'rgba(255,255,255,.9)';
  ctx.lineWidth = 2;
  for (let i = 0; i < NC; i++) {
    if (!pend(i)) continue;
    const q = cellRect(s, i, 0.004, G, () => false);
    rr(ctx, q.x + 3, q.y + 3, q.w - 6, q.h - 6, R(0.03));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 물속에 비치는 나무·용암
  for (let i = 0; i < NC; i++) {
    if (!pend(i) || !s.cells[i].fut) continue;
    ctx.globalAlpha = 0.3;
    const f = s.cells[i].fut!;
    if (f === 'tree') drawTree(ctx, X(cellX(i)), Y(cellY(i) + CH * 0.2), R(CW * 0.34), t, i, 0);
    else {
      ctx.save();
      ctx.translate(X(cellX(i)), Y(cellY(i) + CH * 0.22));
      const up = NB4[i][0] >= 0 && s.cells[NB4[i][0]].fut === 'lava' ? -1 : -2;
      drawLava(ctx, R(CW * 0.36), t, i, s, up);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 표지: 점수 n이면 쑤욱! (건물 위에 그린다) */
function drawPendingLabel(ctx: C2, s: IsleState, G: Geo) {
  const { X, Y, R } = G, t = s.t, d = STAGES[s.stage];
  if (s.risen >= d.chunks.length || s.phase === 'result') return;
  const n = s.risen, pend = (j: number) => !s.cells[j].land && s.cells[j].chunk === n;
  // 표지: 점수 n이면 쑤욱!
  let sx = 0, sy = 0, cnt = 0;
  for (let i = 0; i < NC; i++) if (pend(i)) (sx += cellX(i)), (sy += cellY(i)), cnt++;
  if (cnt) {
    sx /= cnt;
    sy /= cnt;
    const bob = Math.sin(t * 0.08) * R(0.006);
    const txt = `점수 ${d.chunks[n].at}이면 쑤욱!`;
    ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width + R(0.05);
    const lx = clamp(X(sx), tw / 2 + 4, G.w - tw / 2 - 4), ly = Y(sy) + bob;
    ctx.fillStyle = 'rgba(20,90,120,.28)';
    rr(ctx, lx - tw / 2 + 2, ly - R(0.024) + 3, tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    rr(ctx, lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = '#2a9fc6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1f7aa0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, lx, ly + 1);
  }
}

// ── 섬: 거품 → 절벽 → 모래 → 잔디 → 빈 땅 표시 ──
function drawIsland(ctx: C2, s: IsleState, G: Geo) {
  const { X, Y, R } = G, t = s.t;
  const land = (j: number) => s.cells[j].land;
  const TH = 0.04, BEACH = 0.022;
  // 얕은 물 (섬 둘레가 밝은 청록)
  for (const [m, a] of [[0.075, 0.18], [0.05, 0.22]] as [number, number][]) {
    for (let i = 0; i < NC; i++) {
      if (!land(i)) continue;
      ctx.globalAlpha = riseAlpha(s, i);
      const q = cellRect(s, i, m, G, land);
      ctx.fillStyle = `rgba(200,255,240,${a})`;
      rr(ctx, q.x, q.y + R(TH), q.w, q.h, q.r);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // 거품 고리
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, 0.034 + 0.006 * Math.sin(t * 0.07), G, land);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    rr(ctx, q.x, q.y + R(TH * 0.7), q.w, q.h, q.r);
    ctx.fill();
  }
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, 0.022, G, land);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    rr(ctx, q.x, q.y + R(TH * 0.85), q.w, q.h, q.r);
    ctx.fill();
  }
  // 절벽(두께)
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, BEACH, G, land);
    ctx.fillStyle = lin(ctx, 0, q.y + q.h - R(0.02), 0, q.y + q.h + R(TH), [0, '#e0b06a'], [1, '#a8763e']);
    rr(ctx, q.x, q.y + R(TH), q.w, q.h, q.r);
    ctx.fill();
  }
  // 모래
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, BEACH, G, land);
    ctx.fillStyle = lin(ctx, 0, q.y, 0, q.y + q.h, [0, '#fff0bf'], [1, '#f3d58e']);
    rr(ctx, q.x, q.y, q.w, q.h, q.r);
    ctx.fill();
  }
  // 젖은 모래 띠
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, BEACH, G, land);
    ctx.strokeStyle = 'rgba(200,150,80,.35)';
    ctx.lineWidth = 2;
    rr(ctx, q.x + 1, q.y + 1, q.w - 2, q.h - 2, q.r);
    ctx.stroke();
  }
  // 잔디 (조금 높게)
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, -0.006, G, land);
    ctx.fillStyle = '#5aa83a';
    rr(ctx, q.x, q.y + R(0.008), q.w, q.h, q.r);
    ctx.fill();
  }
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const q = cellRect(s, i, -0.006, G, land);
    ctx.fillStyle = lin(ctx, 0, q.y, 0, q.y + q.h, [0, '#a6e670'], [1, '#86d052']);
    rr(ctx, q.x, q.y, q.w, q.h, q.r);
    ctx.fill();
  }
  // 풀잎 · 꽃
  for (let i = 0; i < NC; i++) {
    if (!land(i)) continue;
    ctx.globalAlpha = riseAlpha(s, i);
    const off = riseOff(s, i);
    for (let k = 0; k < 4; k++) {
      const gx = X(cellX(i) + (hsh(i * 13 + k) - 0.5) * CW * 0.8), gy = Y(cellY(i) - off + (hsh(i * 7 + k * 3) - 0.5) * CH * 0.75);
      ctx.strokeStyle = 'rgba(60,140,40,.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(gx - 2, gy + 2);
      ctx.lineTo(gx, gy - 2);
      ctx.lineTo(gx + 2, gy + 2);
      ctx.stroke();
    }
    if (hsh(i * 5.7) > 0.45) {
      const fx2 = X(cellX(i) + (hsh(i * 3.3) - 0.5) * CW * 0.7), fy = Y(cellY(i) - off + (hsh(i * 9.1) - 0.2) * CH * 0.5);
      ctx.fillStyle = ['#ffffff', '#ffe14a', '#ff9ac0'][i % 3];
      for (let p = 0; p < 4; p++) {
        ell(ctx, fx2 + Math.cos(p * 1.57) * 2, fy + Math.sin(p * 1.57) * 2, 1.8, 1.8);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb020';
      ell(ctx, fx2, fy, 1.4, 1.4);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  // 솟는 중: 물이 부풀고 갈라진다
  if (s.phase === 'rise' && s.pt < RISE_UP + 10) {
    for (let i = 0; i < NC; i++) {
      const c = s.cells[i];
      if (c.riseT < 0 || t - c.riseT > RISE_UP + 10) continue;
      const u = (t - c.riseT) / (RISE_UP + 10);
      ctx.strokeStyle = `rgba(255,255,255,${0.9 * (1 - u)})`;
      ctx.lineWidth = R(0.012) * (1 - u) + 1;
      ell(ctx, X(cellX(i)), Y(cellY(i) + CH * 0.3), R(CW * (0.4 + u * 0.5)), R(CH * (0.35 + u * 0.4)));
      ctx.stroke();
    }
  }
  // 빈 땅: 놓을 수 있는 칸 (밝은 판 + 점선)
  if (s.phase === 'pick' || s.phase === 'drop') {
    for (let i = 0; i < NC; i++) {
      if (!empty(s.cells[i])) continue;
      const x = X(cellX(i)), y = Y(cellY(i) - riseOff(s, i)), pw = R(CW * 0.84), ph = R(CH * 0.78);
      const pul = s.phase === 'pick' ? 0.5 + 0.5 * Math.sin(t * 0.1 + i * 0.7) : 0;
      ctx.fillStyle = `rgba(255,255,220,${0.18 + pul * 0.1})`;
      rr(ctx, x - pw / 2, y - ph / 2, pw, ph, R(0.03));
      ctx.fill();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = `rgba(255,255,255,${0.7 + pul * 0.3})`;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

// ── 건물·나무·주민 (먼 줄부터) ──
interface Look { happy: number; mad: number; blink: boolean; sq: number; jump: number }
function lookOf(s: IsleState, vis: Vis, i: number): Look {
  const t = s.t, r = vis.react.get(i), b = s.cells[i].b!;
  const age = r ? t - r.t : 999;
  const lt = vis.land.get(b.id), la = lt === undefined ? 999 : t - lt;
  const pk = vis.poke.get(i), pa = pk === undefined ? 999 : t - pk;
  const happy = r && r.v > 0 && age < 60 ? 1 - age / 60 : 0, mad = r && r.v < 0 && age < 70 ? 1 - age / 70 : 0;
  // 내려앉을 때 납작 → 통통
  const sq = la < 16 ? Math.sin((la / 16) * Math.PI) * (1 - la / 16) * 0.35 : pa < 18 ? Math.sin((pa / 18) * Math.PI * 2) * 0.12 : r && age < 14 ? Math.sin((age / 14) * Math.PI) * 0.15 : 0;
  const jump = r && r.v > 0 && age < 18 ? Math.sin((age / 18) * Math.PI) : 0;
  return { happy, mad, blink: (t + b.id * 37) % 190 < 6, sq, jump };
}
function drawThings(ctx: C2, s: IsleState, vis: Vis, G: Geo) {
  const { X, Y, R } = G, t = s.t;
  const dr = s.drop;
  for (let row = 0; row < ROWS; row++) {
    for (let c = 0; c < COLS; c++) {
      const i = row * COLS + c, cell = s.cells[i];
      if (!cell.land || !cell.b) continue;
      const b = cell.b, off = riseOff(s, i);
      const x = X(cellX(i)), base = Y(cellY(i) + CH * 0.22 - off), sz = R(CW * 0.36);
      // 하늘에서 내려앉는 중
      let dy = 0;
      if (dr && dr.i === i && s.pt < DROP) {
        const u = s.pt / DROP;
        dy = -R(0.55) * (1 - u * u);
        ctx.fillStyle = `rgba(30,60,30,${0.12 + 0.2 * u})`;
        ell(ctx, x, base + R(0.01), sz * (0.5 + 0.5 * u), sz * 0.22 * (0.5 + 0.5 * u));
        ctx.fill();
      }
      // 새로 솟은 나무는 조금 늦게 쏙
      if (b.t > t) continue;
      const grow = b.t > 0 && t - b.t < 14 && fixed(b.k) ? back((t - b.t) / 14) : 1;
      const L = lookOf(s, vis, i);
      ctx.save();
      ctx.translate(x, base + dy - L.jump * R(0.03));
      if (grow !== 1) ctx.scale(grow, grow);
      drawBuilding(ctx, b.k, sz, L, t, b.id, i, s);
      ctx.restore();
      // 꾸미기: 크게 받은 건물은 꽃밭이 생기고, 아주 크게 받으면 지붕에 깃발
      if (!fixed(b.k) && b.got >= 6 && !(dr && dr.i === i)) drawDecor(ctx, x, base, sz, b.got, t, b.id);
      // 화난 이웃: 머리 위 먹구름 · 기쁜 이웃: 하트
      if (L.mad > 0.05) drawCloud(ctx, x + Math.sin(t * 0.5) * 2, base - sz * 2.1, sz * 0.35, L.mad);
      if (L.happy > 0.05 && !fixed(b.k)) {
        ctx.globalAlpha = L.happy;
        heartPath(ctx, x + sz * 0.6, base - sz * 1.9 - (1 - L.happy) * R(0.04), sz * 0.18);
        ctx.fillStyle = '#ff5a7a';
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    // 이 줄 앞을 돌아다니는 주민
    drawResidents(ctx, s, vis, G, row);
  }
  // 말풍선
  if (vis.say && t - vis.say.t < 70 && vis.say.text && s.cells[vis.say.i].b) {
    const i = vis.say.i, a = Math.min(1, (70 - (t - vis.say.t)) / 15);
    const x = X(cellX(i)), y = Y(cellY(i) - CH * 0.95);
    ctx.globalAlpha = a;
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    const tw = ctx.measureText(vis.say.text).width + R(0.04);
    const bx = clamp(x, tw / 2 + 4, G.w - tw / 2 - 4);
    ctx.fillStyle = '#ffffff';
    rr(ctx, bx - tw / 2, y - R(0.022), tw, R(0.044), R(0.02));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 5, y + R(0.02));
    ctx.lineTo(x, y + R(0.04));
    ctx.lineTo(x + 5, y + R(0.02));
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,42,18,.35)';
    ctx.lineWidth = 1.5;
    rr(ctx, bx - tw / 2, y - R(0.022), tw, R(0.044), R(0.02));
    ctx.stroke();
    ctx.fillStyle = OUT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(vis.say.text, bx, y + 1);
    ctx.globalAlpha = 1;
  }
}
function drawDecor(ctx: C2, x: number, base: number, sz: number, got: number, t: number, id: number) {
  const cols = ['#ff7aa8', '#ffe14a', '#ffffff', '#b483ff'];
  for (let k = 0; k < 3; k++) {
    const fx2 = x - sz * 0.95 + k * sz * 0.16, fy = base - sz * 0.02 + (k % 2) * sz * 0.08;
    ctx.strokeStyle = '#3f9a36';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(fx2, fy + sz * 0.12);
    ctx.lineTo(fx2, fy);
    ctx.stroke();
    ctx.fillStyle = cols[(id + k) % 4];
    for (let p = 0; p < 5; p++) {
      ell(ctx, fx2 + Math.cos((p * TAU) / 5) * sz * 0.055, fy + Math.sin((p * TAU) / 5) * sz * 0.055, sz * 0.05, sz * 0.05);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb020';
    ell(ctx, fx2, fy, sz * 0.035, sz * 0.035);
    ctx.fill();
  }
  if (got >= 9) {
    // 깃발 (펄럭)
    const px = x + sz * 0.62, py = base - sz * 1.95;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(px, py + sz * 0.5);
    ctx.lineTo(px, py - sz * 0.25);
    ctx.stroke();
    const wv = Math.sin(t * 0.2 + id) * sz * 0.05;
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(px, py - sz * 0.25);
    ctx.quadraticCurveTo(px + sz * 0.2, py - sz * 0.25 + wv, px + sz * 0.4, py - sz * 0.15);
    ctx.quadraticCurveTo(px + sz * 0.2, py - sz * 0.05 + wv, px, py - sz * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}
function drawCloud(ctx: C2, x: number, y: number, r: number, a: number) {
  ctx.globalAlpha = Math.min(1, a * 1.5);
  ctx.fillStyle = '#6a6a80';
  for (const [dx, dy, q] of [[-0.6, 0.1, 0.55], [0, -0.2, 0.7], [0.6, 0.1, 0.55]]) {
    ell(ctx, x + dx * r, y + dy * r, q * r, q * r * 0.85);
    ctx.fill();
  }
  ctx.strokeStyle = '#ffe14a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + r * 0.1, y + r * 0.4);
  ctx.lineTo(x - r * 0.15, y + r * 0.85);
  ctx.lineTo(x + r * 0.15, y + r * 0.85);
  ctx.lineTo(x - r * 0.05, y + r * 1.3);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** 주민: 집마다 하나 — 오리·병아리·토끼가 집 앞을 오간다 */
function drawResidents(ctx: C2, s: IsleState, vis: Vis, G: Geo, row: number) {
  const { X, Y, R } = G, t = s.t;
  for (let i = row * COLS; i < row * COLS + COLS; i++) {
    const b = s.cells[i].b;
    if (!b || b.k !== 'house' || b.t > t - 20) continue;
    const kind = b.id % 3, ph = b.id * 1.7;
    const wx = Math.sin(t * 0.012 + ph) * CW * 0.32, dir = Math.cos(t * 0.012 + ph) >= 0 ? 1 : -1;
    const cheer = t - vis.cheer < 30 ? Math.abs(Math.sin(((t - vis.cheer) / 30) * Math.PI * 2)) : 0;
    const sad = t - vis.sad < 40;
    const hop = Math.abs(Math.sin(t * 0.18 + ph)) * R(0.006) + cheer * R(0.03);
    const x = X(cellX(i) + wx), y = Y(cellY(i) + CH * 0.4 - riseOff(s, i)) - hop, r = R(0.027);
    ctx.fillStyle = 'rgba(30,70,20,.25)';
    ell(ctx, x, Y(cellY(i) + CH * 0.4 - riseOff(s, i)) + r * 0.6, r * 0.9, r * 0.3);
    ctx.fill();
    const col = ['#ffe14a', '#ffffff', '#f2c8a0'][kind];
    ctx.fillStyle = col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ell(ctx, x, y, r, r * 0.9);
    ctx.fill();
    ctx.stroke();
    if (kind === 2) {
      // 토끼 귀
      for (const e of [-1, 1]) {
        ell(ctx, x + e * r * 0.35, y - r * 1.2, r * 0.22, r * 0.55, e * 0.2);
        ctx.fill();
        ctx.stroke();
      }
    }
    // 부리·코
    ctx.fillStyle = kind === 2 ? '#ff8aa0' : '#ff9a2a';
    ell(ctx, x + dir * r * 0.85, y + r * 0.05, r * 0.32, r * 0.2);
    ctx.fill();
    // 눈
    ctx.fillStyle = OUT;
    if (cheer > 0.2) {
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(x + dir * r * 0.35, y - r * 0.15, r * 0.16, Math.PI, 0);
      ctx.stroke();
    } else {
      ell(ctx, x + dir * r * 0.38, y - r * 0.15, r * 0.12, r * (sad ? 0.06 : 0.14));
      ctx.fill();
    }
    if (kind === 1) {
      // 오리 머리깃
      ctx.strokeStyle = OUT;
      ctx.beginPath();
      ctx.moveTo(x - dir * r * 0.1, y - r * 0.85);
      ctx.quadraticCurveTo(x, y - r * 1.25, x + dir * r * 0.15, y - r * 0.9);
      ctx.stroke();
    }
  }
}

function drawTree(ctx: C2, x: number, y: number, r: number, t: number, id: number, sq: number) {
  const sw = Math.sin(t * 0.03 + id) * r * 0.03;
  ctx.fillStyle = 'rgba(30,70,20,.3)';
  ell(ctx, x + r * 0.15, y + r * 0.08, r * 0.85, r * 0.28);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x - r * 0.15, 0, x + r * 0.15, 0, [0, '#a0703c'], [1, '#6e4520']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(LW_MIN * 0.9, r * 0.06);
  rr(ctx, x - r * 0.13, y - r * 0.9, r * 0.26, r * 0.95, r * 0.08);
  ctx.fill();
  ctx.stroke();
  const h0 = r * (1 - sq * 0.3);
  const blobs: [number, number, number][] = [[-0.45, -1.15, 0.5], [0.45, -1.15, 0.5], [0, -1.55, 0.62], [0, -1.05, 0.55]];
  ctx.fillStyle = '#3f9a36';
  for (const [dx, dy, q] of blobs) {
    ell(ctx, x + dx * r + sw, y + dy * h0, q * r * 1.06, q * r);
    ctx.fill();
    ctx.stroke();
  }
  for (const [dx, dy, q] of blobs) {
    ctx.fillStyle = radg(ctx, x + dx * r + sw - q * r * 0.3, y + dy * h0 - q * r * 0.4, 0, q * r * 1.2, [0, '#9be468'], [0.6, '#5cc04a'], [1, '#43a83a']);
    ell(ctx, x + dx * r + sw, y + dy * h0, q * r, q * r * 0.94);
    ctx.fill();
  }
  // 열매
  ctx.fillStyle = '#ff5a4a';
  for (const [dx, dy] of [[-0.3, -1.3], [0.35, -1.0], [0.1, -1.75]]) {
    ell(ctx, x + dx * r + sw, y + dy * h0, r * 0.08, r * 0.08);
    ctx.fill();
  }
}

/** 건물 하나 (원점 = 바닥 가운데, sz = 크기) */
function drawBuilding(ctx: C2, k: Kind, sz: number, L: Look, t: number, id: number, i: number, s: IsleState) {
  const sx = 1 + L.sq * 0.6, sy = 1 - L.sq;
  ctx.scale(sx, sy);
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(LW_MIN, sz * 0.055);
  if (k === 'tree') return drawTree(ctx, 0, 0, sz * 0.95, t, id, 0);
  if (k === 'lava') return drawLava(ctx, sz, t, id, s, i);
  // 그림자
  ctx.fillStyle = 'rgba(30,70,20,.28)';
  ell(ctx, sz * 0.12, sz * 0.06, sz * 1.0, sz * 0.3);
  ctx.fill();
  ctx.strokeStyle = OUT;
  if (k === 'house') drawHouse(ctx, sz, L, id);
  else if (k === 'bakery') drawBakery(ctx, sz, L, t);
  else if (k === 'light') drawLight(ctx, sz, L, t, id);
  else if (k === 'forge') drawForge(ctx, sz, L, t, id);
  else if (k === 'fount') drawFount(ctx, sz, L, t);
}
/** 앞벽 얼굴: 창문 눈 · 문 입 */
function face(ctx: C2, x: number, y: number, r: number, L: Look) {
  ctx.fillStyle = OUT;
  for (const e of [-1, 1]) {
    if (L.happy > 0.2) {
      ctx.lineWidth = Math.max(1.4, r * 0.18);
      ctx.beginPath();
      ctx.arc(x + e * r, y, r * 0.42, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (L.blink) {
      ctx.fillRect(x + e * r - r * 0.4, y - r * 0.06, r * 0.8, Math.max(1.2, r * 0.14));
    } else {
      ell(ctx, x + e * r, y, r * 0.3, r * (L.mad > 0.2 ? 0.22 : 0.4));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, x + e * r + r * 0.1, y - r * 0.15, r * 0.11, r * 0.11);
      ctx.fill();
      ctx.fillStyle = OUT;
    }
    if (L.mad > 0.2) {
      ctx.lineWidth = Math.max(1.4, r * 0.16);
      ctx.beginPath();
      ctx.moveTo(x + e * r * 1.5, y - r * 0.75);
      ctx.lineTo(x + e * r * 0.45, y - r * 0.45);
      ctx.stroke();
    }
  }
  // 볼
  ctx.fillStyle = 'rgba(255,120,120,.45)';
  for (const e of [-1, 1]) {
    ell(ctx, x + e * r * 1.7, y + r * 0.55, r * 0.35, r * 0.22);
    ctx.fill();
  }
}
function drawHouse(ctx: C2, sz: number, L: Look, id: number) {
  const [rf, rd] = ROOF[id % ROOF.length];
  const W2 = sz * 0.78, Hh = sz * 0.95, D = sz * 0.28, top = -Hh;
  // 옆벽(오른쪽, 깊이)
  ctx.fillStyle = '#e8c890';
  ctx.beginPath();
  ctx.moveTo(W2, 0);
  ctx.lineTo(W2 + D, -D * 0.6);
  ctx.lineTo(W2 + D, top - D * 0.6);
  ctx.lineTo(W2, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 앞벽
  ctx.fillStyle = lin(ctx, 0, top, 0, 0, [0, '#fffaf0'], [1, '#f6e2bc']);
  rr(ctx, -W2, top, W2 * 2, Hh, sz * 0.06);
  ctx.fill();
  ctx.stroke();
  // 지붕 (앞 삼각 + 옆 경사)
  const rh = sz * 0.75;
  ctx.fillStyle = rd;
  ctx.beginPath();
  ctx.moveTo(0, top - rh);
  ctx.lineTo(D, top - rh - D * 0.6);
  ctx.lineTo(W2 + D + sz * 0.12, top - D * 0.6 + sz * 0.06);
  ctx.lineTo(W2 + sz * 0.12, top + sz * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, top - rh, 0, top, [0, rf], [1, rd]);
  ctx.beginPath();
  ctx.moveTo(-W2 - sz * 0.12, top + sz * 0.06);
  ctx.lineTo(0, top - rh);
  ctx.lineTo(W2 + sz * 0.12, top + sz * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 굴뚝
  ctx.fillStyle = '#c86a4a';
  rr(ctx, W2 * 0.35, top - rh * 0.85, sz * 0.18, sz * 0.36, 2);
  ctx.fill();
  ctx.stroke();
  // 지붕 하이라이트
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = Math.max(1.2, sz * 0.05);
  ctx.beginPath();
  ctx.moveTo(-W2 * 0.7, top - rh * 0.05);
  ctx.lineTo(-W2 * 0.1, top - rh * 0.8);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(LW_MIN, sz * 0.055);
  // 문
  ctx.fillStyle = '#a8683a';
  rr(ctx, -sz * 0.17, -sz * 0.42, sz * 0.34, sz * 0.42, [sz * 0.17, sz * 0.17, 0, 0]);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, sz * 0.09, -sz * 0.2, sz * 0.035, sz * 0.035);
  ctx.fill();
  // 얼굴 (창문 눈)
  face(ctx, 0, top + Hh * 0.33, sz * 0.25, L);
}
function drawBakery(ctx: C2, sz: number, L: Look, t: number) {
  const W2 = sz * 0.9, Hh = sz * 1.0, D = sz * 0.28, top = -Hh;
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.moveTo(W2, 0);
  ctx.lineTo(W2 + D, -D * 0.6);
  ctx.lineTo(W2 + D, top - D * 0.6);
  ctx.lineTo(W2, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, top, 0, 0, [0, '#fff0e0'], [1, '#ffd8bc']);
  rr(ctx, -W2, top, W2 * 2, Hh, sz * 0.06);
  ctx.fill();
  ctx.stroke();
  // 평지붕 + 굴뚝 연기
  ctx.fillStyle = '#c87a5a';
  ctx.beginPath();
  ctx.moveTo(-W2 - sz * 0.06, top);
  ctx.lineTo(-W2 + D - sz * 0.06, top - D * 0.6);
  ctx.lineTo(W2 + D + sz * 0.06, top - D * 0.6);
  ctx.lineTo(W2 + sz * 0.06, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const u = ((t * 0.012 + k / 3) % 1);
    ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - u)})`;
    ell(ctx, W2 * 0.5 + Math.sin(u * 6 + k) * sz * 0.1, top - D - u * sz * 0.9, sz * (0.12 + u * 0.15), sz * (0.1 + u * 0.12));
    ctx.fill();
  }
  // 줄무늬 차양
  const aw = top + Hh * 0.28;
  for (let k = 0; k < 6; k++) {
    const x0 = -W2 - sz * 0.08 + (k * (W2 * 2 + sz * 0.16)) / 6, ww = (W2 * 2 + sz * 0.16) / 6;
    ctx.fillStyle = k % 2 ? '#ffffff' : '#ff6f9a';
    ctx.beginPath();
    ctx.moveTo(x0, aw - sz * 0.14);
    ctx.lineTo(x0 + ww, aw - sz * 0.14);
    ctx.lineTo(x0 + ww, aw + sz * 0.06);
    ctx.quadraticCurveTo(x0 + ww / 2, aw + sz * 0.18, x0, aw + sz * 0.06);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  ctx.moveTo(-W2 - sz * 0.08, aw - sz * 0.14);
  ctx.lineTo(W2 + sz * 0.08, aw - sz * 0.14);
  ctx.stroke();
  // 빵 간판
  ctx.fillStyle = '#e8a24a';
  ell(ctx, 0, top - D * 0.3 - sz * 0.2, sz * 0.42, sz * 0.18, -0.12);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#a8621a';
  for (const e of [-0.2, 0, 0.2]) {
    ctx.beginPath();
    ctx.moveTo(e * sz - sz * 0.05, top - D * 0.3 - sz * 0.27);
    ctx.lineTo(e * sz + sz * 0.05, top - D * 0.3 - sz * 0.13);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  // 진열창 + 얼굴
  ctx.fillStyle = '#ffeaa0';
  rr(ctx, -W2 * 0.85, -sz * 0.4, W2 * 0.7, sz * 0.32, sz * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c87a3a';
  ell(ctx, -W2 * 0.5, -sz * 0.2, sz * 0.12, sz * 0.07);
  ctx.fill();
  ctx.fillStyle = '#a8683a';
  rr(ctx, W2 * 0.15, -sz * 0.45, sz * 0.32, sz * 0.45, [sz * 0.16, sz * 0.16, 0, 0]);
  ctx.fill();
  ctx.stroke();
  face(ctx, 0, top + Hh * 0.5, sz * 0.22, L);
}
function drawLight(ctx: C2, sz: number, L: Look, t: number, id: number) {
  const Hh = sz * 2.1, wb = sz * 0.5, wt = sz * 0.32;
  // 빛줄기 (돈다)
  const a = t * 0.04 + id;
  ctx.save();
  ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.1);
  ctx.fillStyle = 'rgba(255,245,160,.9)';
  ctx.beginPath();
  ctx.moveTo(0, -Hh - sz * 0.2);
  const len = sz * 2.4, sp = 0.22;
  ctx.lineTo(Math.cos(a - sp) * len, -Hh - sz * 0.2 + Math.sin(a - sp) * len * 0.35);
  ctx.lineTo(Math.cos(a + sp) * len, -Hh - sz * 0.2 + Math.sin(a + sp) * len * 0.35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // 받침
  ctx.fillStyle = '#b8b8c8';
  ell(ctx, 0, -sz * 0.05, wb * 1.25, wb * 0.45);
  ctx.fill();
  ctx.stroke();
  // 탑 (줄무늬)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-wb, -sz * 0.1);
  ctx.lineTo(-wt, -Hh);
  ctx.lineTo(wt, -Hh);
  ctx.lineTo(wb, -sz * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  for (let k = 0; k < 4; k++) {
    ctx.fillStyle = '#ff5a4a';
    ctx.fillRect(-wb * 1.2, -sz * 0.1 - (k * 2 + 1) * (Hh / 8) - Hh / 16, wb * 2.4, Hh / 8);
  }
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  ctx.fillRect(wb * 0.2, -Hh, wb, Hh);
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(-wb, -sz * 0.1);
  ctx.lineTo(-wt, -Hh);
  ctx.lineTo(wt, -Hh);
  ctx.lineTo(wb, -sz * 0.1);
  ctx.closePath();
  ctx.stroke();
  // 등불 방
  ctx.fillStyle = radg(ctx, 0, -Hh - sz * 0.2, 0, sz * 0.5, [0, '#ffffff'], [0.4, '#fff07a'], [1, 'rgba(255,220,80,0)']);
  ell(ctx, 0, -Hh - sz * 0.2, sz * 0.5, sz * 0.5);
  ctx.fill();
  ctx.fillStyle = '#fff6a8';
  rr(ctx, -wt * 0.9, -Hh - sz * 0.38, wt * 1.8, sz * 0.32, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ff5a4a';
  ctx.beginPath();
  ctx.moveTo(-wt * 1.15, -Hh - sz * 0.38);
  ctx.lineTo(0, -Hh - sz * 0.68);
  ctx.lineTo(wt * 1.15, -Hh - sz * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  face(ctx, 0, -Hh * 0.45, sz * 0.15, L);
}
function drawForge(ctx: C2, sz: number, L: Look, t: number, id: number) {
  const W2 = sz * 0.85, Hh = sz * 0.85, D = sz * 0.28, top = -Hh;
  // 큰 굴뚝 + 검은 연기 · 불똥
  ctx.fillStyle = '#8a8a9a';
  rr(ctx, -W2 * 0.75, top - sz * 0.75, sz * 0.32, sz * 0.9, 3);
  ctx.fill();
  ctx.stroke();
  for (let k = 0; k < 4; k++) {
    const u = ((t * 0.015 + k / 4 + id * 0.1) % 1);
    ctx.fillStyle = `rgba(90,90,100,${0.6 * (1 - u)})`;
    ell(ctx, -W2 * 0.6 + Math.sin(u * 5 + k) * sz * 0.15, top - sz * 0.85 - u * sz * 1.1, sz * (0.14 + u * 0.2), sz * (0.12 + u * 0.16));
    ctx.fill();
  }
  if ((t + id * 7) % 30 < 12) {
    ctx.fillStyle = '#ffb03a';
    for (let k = 0; k < 3; k++) {
      const u = (((t + id * 7) % 30) / 12) * (0.6 + k * 0.2);
      ell(ctx, W2 * 0.7 + Math.cos(k * 2) * u * sz * 0.5, -sz * 0.3 - u * sz * 0.5, 1.8, 1.8);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#7a7a8c';
  ctx.beginPath();
  ctx.moveTo(W2, 0);
  ctx.lineTo(W2 + D, -D * 0.6);
  ctx.lineTo(W2 + D, top - D * 0.6);
  ctx.lineTo(W2, top);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, top, 0, 0, [0, '#c8c8d6'], [1, '#9a9aac']);
  rr(ctx, -W2, top, W2 * 2, Hh, sz * 0.05);
  ctx.fill();
  ctx.stroke();
  // 돌 무늬
  ctx.strokeStyle = 'rgba(70,70,90,.35)';
  ctx.lineWidth = 1.2;
  for (let r2 = 0; r2 < 3; r2++)
    for (let c = 0; c < 3; c++) {
      rr(ctx, -W2 + c * (W2 * 0.66) + (r2 % 2) * sz * 0.15, top + r2 * (Hh / 3) + 2, W2 * 0.6, Hh / 3 - 4, 3);
      ctx.stroke();
    }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(LW_MIN, sz * 0.055);
  // 지붕
  ctx.fillStyle = '#5a5a6e';
  ctx.beginPath();
  ctx.moveTo(-W2 - sz * 0.08, top + sz * 0.04);
  ctx.lineTo(-W2 + D, top - D * 0.7);
  ctx.lineTo(W2 + D + sz * 0.08, top - D * 0.7);
  ctx.lineTo(W2 + sz * 0.08, top + sz * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 불 창
  const gl = 0.7 + 0.3 * Math.sin(t * 0.3 + id);
  ctx.fillStyle = radg(ctx, W2 * 0.35, -sz * 0.25, 0, sz * 0.35, [0, '#fff0a0'], [0.5, `rgba(255,140,40,${gl})`], [1, '#a83a10']);
  rr(ctx, W2 * 0.08, -sz * 0.48, sz * 0.5, sz * 0.48, [sz * 0.2, sz * 0.2, 0, 0]);
  ctx.fill();
  ctx.stroke();
  // 모루
  ctx.fillStyle = '#3a3a4a';
  ctx.beginPath();
  ctx.moveTo(-W2 * 0.95, -sz * 0.05);
  ctx.lineTo(-W2 * 0.55, -sz * 0.05);
  ctx.lineTo(-W2 * 0.6, -sz * 0.22);
  ctx.lineTo(-W2 * 0.3, -sz * 0.3);
  ctx.lineTo(-W2 * 1.15, -sz * 0.3);
  ctx.lineTo(-W2 * 0.9, -sz * 0.22);
  ctx.closePath();
  ctx.fill();
  // 투덜 얼굴 (늘 찡그림)
  face(ctx, -W2 * 0.35, top + Hh * 0.35, sz * 0.2, { ...L, mad: Math.max(L.mad, 0.4) });
}
function drawFount(ctx: C2, sz: number, L: Look, t: number) {
  const rb = sz * 0.95;
  ctx.fillStyle = '#b8b8cc';
  ell(ctx, 0, -sz * 0.02, rb, rb * 0.42);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d8dcec';
  ctx.beginPath();
  ctx.ellipse(0, -sz * 0.25, rb, rb * 0.42, 0, 0, Math.PI);
  ctx.lineTo(-rb, -sz * 0.02);
  ctx.ellipse(0, -sz * 0.02, rb, rb * 0.42, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, -sz * 0.5, 0, 0, [0, '#bff0ff'], [1, '#5cc8f0']);
  ell(ctx, 0, -sz * 0.25, rb * 0.86, rb * 0.34);
  ctx.fill();
  ctx.stroke();
  // 기둥 + 물줄기
  ctx.fillStyle = '#e8ecf6';
  rr(ctx, -sz * 0.1, -sz * 0.95, sz * 0.2, sz * 0.72, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#d8dcec';
  ell(ctx, 0, -sz * 0.95, sz * 0.32, sz * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,230,255,.95)';
  ctx.lineWidth = Math.max(2, sz * 0.08);
  for (const e of [-1, 1]) {
    const k = 0.9 + 0.1 * Math.sin(t * 0.2 + e);
    ctx.beginPath();
    ctx.moveTo(0, -sz * 1.0);
    ctx.quadraticCurveTo(e * sz * 0.4, -sz * 1.65 * k, e * sz * 0.7, -sz * 0.35);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let k = 0; k < 5; k++) {
    const u = ((t * 0.03 + k / 5) % 1);
    ell(ctx, Math.cos(k * 1.3) * sz * 0.6 * u, -sz * 0.3 - Math.sin(u * Math.PI) * sz * 0.3, 1.8, 1.8);
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(LW_MIN, sz * 0.055);
  face(ctx, 0, -sz * 0.12, sz * 0.14, L);
}
function drawLava(ctx: C2, sz: number, t: number, id: number, s: IsleState, i: number) {
  // 용암 웅덩이 + (위쪽 용암엔) 작은 화산
  const rw = sz * 1.15, rh = sz * 0.55;
  ctx.fillStyle = '#4a2a2a';
  ell(ctx, 0, -sz * 0.05, rw, rh);
  ctx.fill();
  ctx.fillStyle = radg(ctx, 0, -sz * 0.1, 0, rw, [0, '#fff0a0'], [0.35, '#ffa02a'], [0.8, '#ff4a1a'], [1, '#a82a10']);
  ell(ctx, 0, -sz * 0.08, rw * 0.85, rh * 0.75);
  ctx.fill();
  for (let k = 0; k < 3; k++) {
    const u = ((t * 0.02 + k / 3 + id * 0.13) % 1);
    ctx.fillStyle = `rgba(255,240,160,${1 - u})`;
    ell(ctx, Math.cos(k * 2.1 + id) * rw * 0.5, -sz * 0.1 - u * sz * 0.4, sz * 0.08 * (1 - u * 0.5), sz * 0.08 * (1 - u * 0.5));
    ctx.fill();
  }
  const upLava = i === -1 || (i >= 0 && NB4[i][0] >= 0 && s.cells[NB4[i][0]].b?.k === 'lava');
  if (!upLava) {
    // 화산 봉우리
    ctx.fillStyle = lin(ctx, -sz, 0, sz, 0, [0, '#8a5a4a'], [1, '#5a3a32']);
    ctx.strokeStyle = OUT;
    ctx.beginPath();
    ctx.moveTo(-sz * 0.95, -sz * 0.2);
    ctx.lineTo(-sz * 0.3, -sz * 1.5);
    ctx.lineTo(sz * 0.3, -sz * 1.5);
    ctx.lineTo(sz * 0.95, -sz * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff6a2a';
    ctx.beginPath();
    ctx.moveTo(-sz * 0.3, -sz * 1.5);
    ctx.lineTo(-sz * 0.18, -sz * 1.1);
    ctx.lineTo(-sz * 0.05, -sz * 1.3);
    ctx.lineTo(sz * 0.1, -sz * 0.9);
    ctx.lineTo(sz * 0.3, -sz * 1.5);
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.01 + k / 3) % 1);
      ctx.fillStyle = `rgba(110,100,110,${0.55 * (1 - u)})`;
      ell(ctx, Math.sin(u * 4 + k) * sz * 0.2, -sz * 1.6 - u * sz * 1.2, sz * (0.2 + u * 0.25), sz * (0.16 + u * 0.2));
      ctx.fill();
    }
  }
}

// ── 날아가는 점수 숫자 ──
function drawFlying(ctx: C2, s: IsleState, G: Geo, font: (sz: number, wgt?: number) => void) {
  const { X, Y, R } = G;
  const list: { x0: number; y0: number; x1: number; y1: number; u: number; v: number }[] = [];
  if (s.phase === 'drop' && s.drop) {
    const d = s.drop;
    d.gains.forEach((g, n) => {
      const st = DROP + n * STAG, u = (s.pt - st) / FLY;
      if (u < 0 || u >= 1) return;
      let x0: number, y0: number;
      if (g.sea) {
        const k = NB4[d.i].indexOf(g.from);
        const ks = NB4[d.i].map((j, q) => (j === g.from ? q : -1)).filter((q) => q >= 0);
        [x0, y0] = seaPos(d.i, ks[d.gains.slice(0, n).filter((h) => h.sea && h.from === g.from).length] ?? Math.max(0, k));
      } else (x0 = cellX(g.from)), (y0 = cellY(g.from) - CH * 0.35);
      list.push({ x0, y0, x1: cellX(d.i), y1: cellY(d.i) - CH * 0.45, u, v: g.v });
    });
  }
  if (s.phase === 'rise') {
    s.rgains.forEach((g, n) => {
      const st = RISE_UP + 8 + n * STAG, u = (s.pt - st) / FLY;
      if (u < 0 || u >= 1) return;
      list.push({ x0: cellX(g.from), y0: cellY(g.from) - CH * 0.4, x1: cellX(g.to), y1: cellY(g.to) - CH * 0.45, u, v: g.v });
    });
  }
  for (const f of list) {
    const e = ease(f.u), x = X(f.x0 + (f.x1 - f.x0) * e), y = Y(f.y0 + (f.y1 - f.y0) * e) - Math.sin(f.u * Math.PI) * R(0.1);
    const pos = f.v > 0, big = Math.abs(f.v) >= 3, sc = (big ? 1.25 : 1) * (1 + 0.3 * Math.sin(f.u * Math.PI));
    // 꼬리
    ctx.strokeStyle = pos ? 'rgba(255,230,90,.55)' : 'rgba(255,90,90,.55)';
    ctx.lineWidth = R(0.012);
    ctx.lineCap = 'round';
    const e2 = ease(Math.max(0, f.u - 0.18));
    ctx.beginPath();
    ctx.moveTo(X(f.x0 + (f.x1 - f.x0) * e2), Y(f.y0 + (f.y1 - f.y0) * e2) - Math.sin(Math.max(0, f.u - 0.18) * Math.PI) * R(0.1));
    ctx.lineTo(x, y);
    ctx.stroke();
    const r = R(0.034) * sc;
    ctx.fillStyle = pos ? lin(ctx, 0, y - r, 0, y + r, [0, '#fff7a0'], [1, '#ffb81a']) : lin(ctx, 0, y - r, 0, y + r, [0, '#ffb0a0'], [1, '#e83a3a']);
    ell(ctx, x, y, r * 1.25, r);
    ctx.fill();
    ctx.strokeStyle = pos ? '#a86a08' : '#8a1a1a';
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.04 * sc, 900);
    ctx.fillStyle = pos ? '#7a3a00' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${pos ? '+' : ''}${f.v}`, x, y + 1);
  }
  // 새 섬이 솟으면 건물 꾸러미가 섬에서 아래 카드 줄로 날아간다
  if (s.phase === 'rise' && s.rising >= 0) {
    const pk = s.plans[s.stage].packs[s.rising];
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < NC; i++) if (s.cells[i].chunk === s.rising && s.cells[i].riseT >= 0) (sx += cellX(i)), (sy += cellY(i)), n++;
    if (n) {
      (sx /= n), (sy /= n);
      const restN = Math.max(0, s.queue.length - s.qi - 2 - pk.length);
      pk.forEach((k, q) => {
        const u = (s.pt - RISE_UP + 4 - q * 5) / 24;
        if (u <= 0 || u >= 1) return;
        const slot = restN + q, tx = 0.6 + 0.025 + (slot % 4) * 0.088, tyy = 1.115 + 0.085 + Math.floor(slot / 4) * 0.06;
        const e = ease(u), x = sx + (tx - sx) * e, y = sy + (tyy - sy) * e - Math.sin(u * Math.PI) * 0.18;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ell(ctx, X(x), Y(y) - R(0.02), R(0.05), R(0.05));
        ctx.fill();
        miniIcon(ctx, k, X(x), Y(y), R(0.035 - 0.012 * u), s.t);
      });
    }
  }
  // 받은 점수 합 (꽂힌 뒤 위로)
  if (s.phase === 'drop' && s.drop && s.drop.n === s.drop.gains.length && s.drop.gains.length) {
    const d = s.drop, st = DROP + (d.gains.length - 1) * STAG + FLY, age = s.pt - st;
    if (age >= 0) {
      const big = d.total >= COMBO, p = Math.min(1, age / 6), x = X(cellX(d.i)), y = Y(cellY(d.i) - CH * 0.9) - age * R(0.002);
      const sz = (big ? 0.085 : 0.06) * (p < 1 ? 0.6 + 0.8 * p : 1 + 0.1 * Math.sin(age * 0.4));
      font(sz, 900);
      ctx.lineWidth = R(0.012);
      ctx.strokeStyle = d.total >= 0 ? '#7a3a00' : '#5a0a0a';
      const txt = `${d.total > 0 ? '+' : ''}${d.total}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(txt, x, y);
      ctx.fillStyle = d.total > 0 ? lin(ctx, 0, y - R(sz / 2), 0, y + R(sz / 2), [0, '#ffffff'], [0.4, '#fff07a'], [1, '#ffb01a']) : '#ff6a5a';
      ctx.fillText(txt, x, y);
    }
  }
}

// ── 빈칸 미리 보기 숫자 · 첫 손가락 ──
function bestPreview(s: IsleState): { i: number; v: number } {
  const k = s.queue[s.qi];
  let bi = -1, bv = -1e9;
  if (!k) return { i: -1, v: 0 };
  for (let i = 0; i < NC; i++) {
    if (!empty(s.cells[i])) continue;
    const v = sumG(gainsAt(s.cells, i, k));
    if (v > bv) (bv = v), (bi = i);
  }
  return { i: bi, v: bv };
}
function drawPreview(ctx: C2, s: IsleState, vis: Vis, G: Geo, font: (sz: number, wgt?: number) => void) {
  const { X, Y, R } = G, t = s.t;
  if (s.phase !== 'pick') return;
  const k = s.queue[s.qi];
  if (!k) return;
  const best = bestPreview(s);
  for (let i = 0; i < NC; i++) {
    if (!empty(s.cells[i])) continue;
    const v = sumG(gainsAt(s.cells, i, k));
    const x = X(cellX(i)), y = Y(cellY(i) - riseOff(s, i)) + R(0.005);
    const top = i === best.i && v > 0;
    const bob = top ? Math.sin(t * 0.15) * R(0.006) : 0;
    const r = R(top ? 0.04 : 0.033);
    ctx.fillStyle = 'rgba(40,60,20,.25)';
    ell(ctx, x + 1, y + r * 0.85 + 2, r * 1.2, r * 0.35);
    ctx.fill();
    ctx.fillStyle = v > 0 ? lin(ctx, 0, y - r, 0, y + r, [0, '#fffbd0'], [1, top ? '#ffd23a' : '#ffe98a']) : v < 0 ? lin(ctx, 0, y - r, 0, y + r, [0, '#ffd0c8'], [1, '#ff8a7a']) : 'rgba(255,255,255,.75)';
    ell(ctx, x, y + bob, r * 1.3, r);
    ctx.fill();
    ctx.strokeStyle = v > 0 ? '#b07808' : v < 0 ? '#b02a1a' : 'rgba(90,90,90,.5)';
    ctx.lineWidth = top ? 2.5 : 1.8;
    ctx.stroke();
    font(top ? 0.044 : 0.038, 900);
    ctx.fillStyle = v > 0 ? '#7a4200' : v < 0 ? '#8a1010' : '#6a6a6a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${v > 0 ? '+' : ''}${v}`, x, y + bob + 1);
  }
  // 처음: 손가락이 가장 좋은 칸을 가리킨다
  const idle = t - Math.max(vis.lastPick, s.banner ? s.banner.t : 0);
  const show = (s.stage === 0 && s.placed === 0 && !s.again) || idle > 420;
  if (show && best.i >= 0) {
    const x = X(cellX(best.i)) + R(0.045), y = Y(cellY(best.i)) + R(0.02);
    const press = Math.max(0, Math.sin(t * 0.12));
    drawHand(ctx, x, y, R(0.085), press);
    if (s.stage === 0 && s.placed === 0) {
      font(0.046, 900);
      const txt = `${K[k].name === '집' ? '집을' : K[k].name + '을'} 놓을 곳을 톡!`;
      const tw = ctx.measureText(txt).width + R(0.06), bx = G.w / 2, by = Y(GY0 - 0.035);
      ctx.fillStyle = 'rgba(60,30,10,.3)';
      rr(ctx, bx - tw / 2 + 2, by - R(0.032) + 4, tw, R(0.064), R(0.032));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      rr(ctx, bx - tw / 2, by - R(0.032), tw, R(0.064), R(0.032));
      ctx.fill();
      ctx.strokeStyle = '#ff8a3a';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#d0501a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, bx, by + 1);
    }
  }
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

// ── 위: 판·하트·별 + 점수 막대 ──
function drawTop(ctx: C2, s: IsleState, vis: Vis, G: Geo, font: (sz: number, wgt?: number) => void) {
  const { R, w } = G, d = STAGES[s.stage], hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.97)'], [1, 'rgba(255,240,210,.95)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, cx = R(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#7ae0ff'], [1, '#2a9fd6']);
  ell(ctx, cx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#1a5a8a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.4));
  const nw = Math.min(R(0.4), ctx.measureText(d.name).width);
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
  // 점수 막대
  const y0 = R(0.095), ph = R(0.085);
  ctx.fillStyle = 'rgba(20,80,110,.25)';
  rr(ctx, R(0.02) + 2, y0 + 3, w - R(0.04), ph, R(0.03));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,253,245,.94)';
  rr(ctx, R(0.02), y0, w - R(0.04), ph, R(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,60,20,.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const shown = Math.round(vis.disp);
  // 점수 동전
  ctx.fillStyle = lin(ctx, 0, y0 + R(0.012), 0, y0 + R(0.074), [0, '#fff3a0'], [1, '#ffbe2a']);
  ell(ctx, R(0.1), y0 + ph / 2, R(0.062), R(0.034));
  ctx.fill();
  ctx.strokeStyle = '#b07808';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(0.055, 900);
  ctx.fillStyle = s.sc >= d.goal ? '#e0601a' : '#4a2a10';
  const pump = s.phase === 'drop' && s.drop && s.drop.n > 0 && s.pt - (DROP + (s.drop.n - 1) * STAG + FLY) < 8 ? 1.15 : 1;
  ctx.save();
  ctx.translate(R(0.1), y0 + ph / 2 + 1);
  ctx.scale(pump, pump);
  ctx.fillText(String(shown), 0, 0);
  ctx.restore();
  const marks: { v: number; kind: 'rise' | 'goal' | 'star'; done: boolean; n: number }[] = [];
  d.chunks.forEach((c, n) => marks.push({ v: c.at, kind: 'rise', done: s.risen > n, n }));
  marks.push({ v: d.goal, kind: 'goal', done: s.sc >= d.goal, n: 0 });
  d.stars.forEach((q, n) => n > 0 && q.k === 'score' && marks.push({ v: q.n, kind: 'star', done: s.sc >= q.n, n }));
  const max = Math.max(...marks.map((m) => m.v)) * 1.06;
  const bx0 = R(0.19), bx1 = w - R(0.05), by = y0 + R(0.05), bh = R(0.026);
  ctx.fillStyle = '#e6dcc6';
  rr(ctx, bx0, by - bh / 2, bx1 - bx0, bh, bh / 2);
  ctx.fill();
  const fw = (bx1 - bx0) * clamp(vis.disp / max, 0, 1);
  if (fw > 1) {
    ctx.fillStyle = lin(ctx, 0, by - bh / 2, 0, by + bh / 2, [0, '#fff07a'], [1, '#ffaa1a']);
    rr(ctx, bx0, by - bh / 2, Math.max(bh, fw), bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    rr(ctx, bx0 + 3, by - bh / 2 + 2, Math.max(bh, fw) - 6, bh * 0.3, bh * 0.15);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(110,60,20,.45)';
  ctx.lineWidth = 1.5;
  rr(ctx, bx0, by - bh / 2, bx1 - bx0, bh, bh / 2);
  ctx.stroke();
  for (const m of marks) {
    const mx = bx0 + (bx1 - bx0) * (m.v / max), my = by - bh / 2 - R(0.02);
    ctx.strokeStyle = 'rgba(110,60,20,.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, by - bh / 2);
    ctx.lineTo(mx, by + bh / 2);
    ctx.stroke();
    if (m.kind === 'rise') {
      // 작은 섬 표시
      ctx.fillStyle = m.done ? '#f3d58e' : '#cfeff2';
      ell(ctx, mx, my + R(0.004), R(0.022), R(0.01));
      ctx.fill();
      ctx.fillStyle = m.done ? '#7cc94e' : '#a8d8c0';
      ell(ctx, mx, my, R(0.015), R(0.008));
      ctx.fill();
      ctx.fillStyle = m.done ? '#3f9a36' : '#8ab8a0';
      ell(ctx, mx, my - R(0.01), R(0.008), R(0.009));
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,90,110,.6)';
      ctx.lineWidth = 1;
      ell(ctx, mx, my + R(0.004), R(0.022), R(0.01));
      ctx.stroke();
    } else if (m.kind === 'goal') {
      ctx.fillStyle = '#7a4a20';
      ctx.fillRect(mx - 1, my - R(0.022), 2, R(0.03));
      ctx.fillStyle = m.done ? '#ff5a3a' : '#ff9a7a';
      ctx.beginPath();
      ctx.moveTo(mx + 1, my - R(0.022));
      ctx.lineTo(mx + R(0.03), my - R(0.014));
      ctx.lineTo(mx + 1, my - R(0.006));
      ctx.closePath();
      ctx.fill();
    } else {
      starPath(ctx, mx, my, R(0.014));
      ctx.fillStyle = m.done ? '#ffd23a' : 'rgba(200,180,140,.8)';
      ctx.fill();
      ctx.strokeStyle = '#7a4a08';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    font(0.026, 800);
    ctx.fillStyle = '#7a5a3a';
    ctx.textAlign = 'center';
    ctx.fillText(String(m.v), mx, by + bh / 2 + R(0.016));
  }
}

// ── 아래: 지금 건물 · 다음 · 남은 꾸러미 · 별 줄 ──
let LW_MIN = 1.6;
function miniIcon(ctx: C2, k: Kind, x: number, y: number, sz: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  LW_MIN = sz < 12 ? 0.8 : 1.2;
  drawBuilding(ctx, k, sz, { happy: 0, mad: 0, blink: false, sq: 0, jump: 0 }, t, 7, -1, null as unknown as IsleState);
  LW_MIN = 1.6;
  ctx.restore();
}
/** 이 판에 나오는 것만: 좋아하는 이웃(+)·싫어하는 이웃(−) */
function likeIcons(k: Kind, stage: number): [Kind | 'sea' | 'all', number][] {
  if (k === 'light') return [['sea', SEA_PTS]];
  if (k === 'fount') return [['all', FOUNT_PTS]];
  const d = STAGES[stage], here = new Set<string>([...d.queue, ...d.chunks.flatMap((c) => c.pack)]);
  for (const m of [d.map, ...d.chunks.map((c) => c.map)]) for (const r of m) for (const ch of r) if (chFix(ch)) here.add(chFix(ch)!);
  if (here.has('fount')) here.add('fount');
  return (Object.entries(REL[k]) as [Kind, number][]).filter(([o, v]) => v !== 0 && here.has(o));
}
function drawTray(ctx: C2, s: IsleState, G: Geo, font: (sz: number, wgt?: number) => void) {
  const { X, Y, R, w } = G, t = s.t, d = STAGES[s.stage];
  const ty = Y(1.1);
  ctx.fillStyle = 'rgba(20,80,110,.3)';
  rr(ctx, R(0.015) + 2, ty + 4, w - R(0.03), Y(1.49) - ty, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, ty, 0, Y(1.49), [0, '#fffaf0'], [1, '#ffeccc']);
  rr(ctx, R(0.015), ty, w - R(0.03), Y(1.49) - ty, R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#a8784a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const cur = s.queue[s.qi], nxt = s.queue[s.qi + 1];
  // 지금 카드
  const cx0 = X(0.035), cy0 = Y(1.115), cw = R(0.36), ch = R(0.215);
  ctx.fillStyle = cur && s.phase === 'pick' ? '#fff3c0' : '#f6ead2';
  rr(ctx, cx0, cy0, cw, ch, R(0.025));
  ctx.fill();
  ctx.strokeStyle = cur && s.phase === 'pick' ? '#ff9a2a' : '#c8a070';
  ctx.lineWidth = cur && s.phase === 'pick' ? 3 : 2;
  ctx.stroke();
  font(0.03, 900);
  ctx.fillStyle = '#ffffff';
  const tagw = R(0.09);
  ctx.fillStyle = '#ff8a2a';
  rr(ctx, cx0 + R(0.012), cy0 - R(0.012), tagw, R(0.036), R(0.018));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('지금', cx0 + R(0.012) + tagw / 2, cy0 + R(0.006));
  if (cur) {
    const bob = s.phase === 'pick' ? Math.sin(t * 0.1) * R(0.005) : 0;
    miniIcon(ctx, cur, cx0 + R(0.09), cy0 + R(0.16) + bob, R(0.05), t);
    font(0.042, 900);
    ctx.fillStyle = '#4a2a10';
    ctx.textAlign = 'left';
    ctx.fillText(K[cur].name, cx0 + R(0.17), cy0 + R(0.05), R(0.18));
    // 좋아하는 것: 작은 그림 + 숫자
    const li = likeIcons(cur, s.stage);
    li.forEach(([o, v], n) => {
      const lx = cx0 + R(0.165) + (n % 2) * R(0.1), ly = cy0 + R(0.094) + Math.floor(n / 2) * R(0.04);
      if (o === 'sea') {
        ctx.strokeStyle = '#2a9fc6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let q = 0; q < 2; q++) {
          ctx.moveTo(lx - R(0.018), ly - R(0.006) + q * R(0.011));
          ctx.quadraticCurveTo(lx - R(0.009), ly - R(0.015) + q * R(0.011), lx, ly - R(0.006) + q * R(0.011));
          ctx.quadraticCurveTo(lx + R(0.009), ly + R(0.003) + q * R(0.011), lx + R(0.018), ly - R(0.006) + q * R(0.011));
        }
        ctx.stroke();
      } else if (o === 'all') {
        ctx.fillStyle = '#ffd23a';
        ctx.strokeStyle = '#a87808';
        ctx.lineWidth = 1;
        for (let q = 0; q < 8; q++) {
          ell(ctx, lx + Math.cos((q * TAU) / 8) * R(0.015), ly + Math.sin((q * TAU) / 8) * R(0.015), R(0.005), R(0.005));
          ctx.fill();
          ctx.stroke();
        }
      } else miniIcon(ctx, o, lx, ly + R(0.014), R(0.016), t);
      font(0.032, 900);
      ctx.fillStyle = v > 0 ? '#1f8a2a' : '#d02a1a';
      ctx.textAlign = 'left';
      ctx.fillText(`${v > 0 ? '+' : '−'}${Math.abs(v)}`, lx + R(0.024), ly + R(0.002));
    });
  }
  // 다음 카드
  const nx0 = X(0.41), nw = R(0.17);
  ctx.fillStyle = '#f6ead2';
  rr(ctx, nx0, cy0, nw, ch, R(0.025));
  ctx.fill();
  ctx.strokeStyle = '#c8a070';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.028, 900);
  ctx.fillStyle = '#8a6a4a';
  ctx.textAlign = 'center';
  ctx.fillText('다음', nx0 + nw / 2, cy0 + R(0.026));
  if (nxt) {
    miniIcon(ctx, nxt, nx0 + nw / 2, cy0 + R(0.15), R(0.04), t);
    font(0.03, 900);
    ctx.fillStyle = '#4a2a10';
    ctx.fillText(K[nxt].name, nx0 + nw / 2, cy0 + R(0.193));
  } else {
    font(0.03, 800);
    ctx.fillStyle = 'rgba(110,80,50,.5)';
    ctx.fillText('없음', nx0 + nw / 2, cy0 + R(0.12));
  }
  // 그다음 꾸러미 (작은 그림 줄) + 솟으면 오는 꾸러미
  const rx0 = X(0.6), rw = R(0.37);
  font(0.028, 900);
  ctx.fillStyle = '#8a6a4a';
  ctx.textAlign = 'left';
  const rest = s.queue.slice(s.qi + 2);
  ctx.fillText(`그다음 ${rest.length}`, rx0, cy0 + R(0.026));
  rest.slice(0, 8).forEach((k, n) => miniIcon(ctx, k, rx0 + R(0.025) + (n % 4) * R(0.088), cy0 + R(0.085) + Math.floor(n / 4) * R(0.06), R(0.022), t));
  if (s.risen < d.chunks.length) {
    const pk = s.plans[s.stage].packs[s.risen], py = cy0 + R(0.185);
    ctx.fillStyle = 'rgba(42,159,198,.15)';
    rr(ctx, rx0 - R(0.01), py - R(0.03), rw, R(0.05), R(0.02));
    ctx.fill();
    font(0.026, 900);
    ctx.fillStyle = '#1f7aa0';
    ctx.fillText('새 섬:', rx0, py - R(0.004));
    pk.forEach((k, n) => miniIcon(ctx, k, rx0 + R(0.105) + n * R(0.06), py + R(0.012), R(0.018), t));
  }
  void rw;
  // 별 줄
  const sy0 = Y(1.355);
  d.stars.forEach((q, n) => {
    const ly = sy0 + n * R(0.044) + R(0.012);
    const ok = s.phase === 'result' ? s.starOk[n] : starNow(s, q);
    starPath(ctx, X(0.065), ly, R(0.016));
    ctx.fillStyle = ok ? '#ffd23a' : 'rgba(200,180,140,.6)';
    ctx.fill();
    ctx.strokeStyle = '#7a4a08';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    font(0.036, 800);
    ctx.fillStyle = ok ? '#b0600a' : '#5a3a1a';
    ctx.textAlign = 'left';
    ctx.fillText(q.label, X(0.095), ly + 1, R(0.78));
    if (ok) {
      ctx.strokeStyle = '#2aa02a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      const ex = X(0.095) + Math.min(R(0.78), ctx.measureText(q.label).width) + R(0.025);
      ctx.moveTo(ex, ly);
      ctx.lineTo(ex + R(0.01), ly + R(0.01));
      ctx.lineTo(ex + R(0.028), ly - R(0.012));
      ctx.stroke();
    }
  });
}

// ── 판 띠 · NEW · 큰 순간 · 결과 ──
function drawBanner(ctx: C2, s: IsleState, fx: ReturnType<typeof juice>, G: Geo, font: (sz: number, wgt?: number) => void) {
  const { X, Y, R, w } = G, t = s.t, d = STAGES[s.stage];
  // NEW 스포트라이트: 다음/지금 카드
  if (s.spot && s.phase !== 'result' && t - s.spot.t < 260 && s.placed < 3) {
    const sp = s.spot, a = Math.min(1, (260 - (t - sp.t)) / 30);
    let x = 0, y = 0, rx = 0, ry = 0;
    if (sp.sea) {
      // 바다 위 새 섬 자리
      let sx = 0, sy = 0, n = 0;
      for (let i = 0; i < NC; i++) if (!s.cells[i].land && s.cells[i].chunk >= 0) (sx += cellX(i)), (sy += cellY(i)), n++;
      if (n) (x = X(sx / n)), (y = Y(sy / n)), (rx = R(0.2)), (ry = R(0.17));
    } else {
      const pos = sp.q - s.qi;
      if (pos === 0) (x = X(0.215)), (y = Y(1.222)), (rx = R(0.19)), (ry = R(0.118));
      else if (pos === 1) (x = X(0.495)), (y = Y(1.222)), (rx = R(0.095)), (ry = R(0.118));
    }
    if (rx > 0) {
      const pul = 1 + 0.04 * Math.sin(t * 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ff5a3a';
      ctx.lineWidth = 4;
      ctx.setLineDash([10, 7]);
      ctx.lineDashOffset = -t * 0.8;
      rr(ctx, x - rx * pul, y - ry * pul, rx * 2 * pul, ry * 2 * pul, Math.min(rx, ry) * 0.5);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 900);
      const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
      const lx = clamp(x, tw / 2 + 4, w - tw / 2 - 4), ly = y - ry * pul - R(0.005);
      ctx.fillStyle = '#ff5a3a';
      rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
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
  }
  // 큰 순간 글자
  const ba = t - s.bigT;
  if (ba >= 0 && ba < 70 && s.bigText) {
    const p = ba < 8 ? 0.5 + (ba / 8) * 0.7 : ba < 14 ? 1.2 - ((ba - 8) / 6) * 0.2 : 1;
    const a = Math.min(1, (70 - ba) / 18);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.27));
    ctx.rotate(-0.04);
    ctx.scale(p, p);
    font(0.075, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = R(0.016);
    ctx.strokeStyle = '#7a3a00';
    ctx.strokeText(s.bigText, 0, 0);
    ctx.fillStyle = lin(ctx, 0, -R(0.04), 0, R(0.04), [0, '#ffffff'], [0.45, '#fff07a'], [1, '#ff9a1a']);
    ctx.fillText(s.bigText, 0, 0);
    ctx.restore();
  }
  // 판 띠 (시작 · 결과)
  let head = '', sub = '', a = 0, age = 0, cy = Y(0.62);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = Y(0.6);
    if (s.ok) head = s.won ? '섬마을 완성!' : `${d.name} 완성!`;
    else (head = `${d.goal - s.sc}점 모자라요`), (sub = s.hearts > 0 ? '하트 −1 · 같은 판 다시' : '하트가 없어요 — 끝');
  } else if (s.banner && s.phase === 'pick' && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
    cy = Y(0.62);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.5 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.056, 900);
    const w1 = ctx.measureText(head).width;
    font(0.036, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'result' && s.ok;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.55) : 0) + R(0.1)), ch = (okRes ? R(0.23) : sub ? R(0.16) : R(0.1)) * pop;
    ctx.translate(w / 2, cy);
    ctx.fillStyle = 'rgba(20,60,90,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#2a9fd6';
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
    font(0.056, 900);
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#1f6aa0';
    if (okRes) {
      ctx.fillText(head, 0, -R(0.065), w - R(0.1));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14);
        const sx = (j - (nS - 1) / 2) * R(0.1);
        const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, R(0.005), R(0.04) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy, '#ffd23a', 16, 3, 2.4);
      }
      font(0.038, 900);
      ctx.fillStyle = '#9a5a08';
      ctx.fillText(`점수 ${s.sc}`, 0, R(0.07));
    } else {
      ctx.fillText(head, 0, sub ? -R(0.03) : R(0.002), w - R(0.1));
      if (sub) {
        font(0.036, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
        ctx.fillText(sub, 0, R(0.038), w - R(0.08));
      }
    }
    ctx.restore();
  }
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: IsleState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
