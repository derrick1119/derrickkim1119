/**
 * ⛏️ 두더지 광부 블록 팡 (35라운드: 톡 하나 · 톡마다 크게 터진다) — 덩어리 톡 팡 × 깊어지는 판 × 연쇄.
 * 조작은 톡뿐: 같은 색으로 이어진 흙 덩어리를 톡 하면 한꺼번에 '팡!', 위 흙이 와르르 무너져 내린다.
 *   두더지는 늘 자기 줄 맨 위에 서 있어서 밑이 비면 '으앗!' 쑥 떨어지고, 옆 줄이 더 낮으면 데굴 굴러 내려간다.
 *   무너져 내린 흙이 같은 색과 4개 이상 이어지면 저절로 연쇄 팡(숨이 안 든다). 아무것도 안 누르면 아무 일도 없다.
 * 숨 = 톡 수. 숨이 다하기 전에 판 바닥의 보물 상자까지 내려가면 판을 깬다. 못 가면 하트 -1, 같은 판 다시.
 * 판 7개 · 판마다 새것: 1 연쇄 → 2 공기 방울(옆이 터지면 숨 +2) → 3 바위(옆에서 두 번 터져야 깨짐)
 *   → 4 폭탄 흙(터지면 둘레 9칸 쾅) → 5 보석(든 흙을 터뜨려 줍기) → 6 드릴 흙(터지면 그 줄 밑으로 4칸) → 7 보물 동굴(모두 다).
 * 처음 깔린 덩어리는 3개까지라 '4개 이상'은 무너져야만 생긴다 — 연쇄는 운이 아니라 어디부터 터뜨리느냐로 만든다.
 * 별(쉬운 말, 판마다 하나씩): 보물 상자 도착 · 숨 n번 남기고 도착 · 한 번에 연쇄 n번 · 바위 n개 깨기 · 보석 n개 줍기 · 드릴 한 번 쓰기.
 * 결정적: 난수는 s.rng(mulberry32)뿐. 봇과 화면이 같은 판 계산(blast·settle·roll·chainCells)을 쓴다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.55;
// ───────────────────────────── 판 자리 (가로 폭 = 1) ─────────────────────────────
const COLS = 5, CW = 0.2, CH = 0.152, TOPF = 0.04;
const PLAY_Y0 = 0.148, PLAY_Y1 = A - 0.118;
const VIS = (PLAY_Y1 - PLAY_Y0) / CH;
/** 한 판의 최대 줄 수 */
const RM = 24;
const idx = (c: number, i: number) => c * RM + i;

// ───────────────────────────── 칸 ─────────────────────────────
/** 칸 값: 0 빈칸 · 흙(색 0~3, 보석·폭탄 표시) · 바위(금 표시) · 공기 방울 */
const DIRT = 1 << 8, ROCK = 1 << 9, BUB = 1 << 10;
const GEM = 1 << 4, BOMB = 1 << 5, CRACK = 1 << 6, DRILL = 1 << 7;
const colOf = (v: number) => v & 7;
const isDirt = (v: number) => (v & DIRT) !== 0;

/** 판 하나 (흙 기둥 다섯 개, 아래부터 쌓임) — 화면과 봇이 같이 쓴다 */
interface Board {
  R: number; g: Int32Array; h: Int8Array; mc: number; breath: number;
  taps: number; chain: number; combo: number; gem: number; rock: number; drill: number; bub: number; bomb: number; pts: number;
}
const cloneB = (B: Board): Board => ({ ...B, g: B.g.slice(), h: B.h.slice() });

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
/** 같은 색 흙 덩어리 */
function flood(B: Board, cell: number, seen?: Uint8Array): number[] {
  const v0 = B.g[cell];
  if (!isDirt(v0)) return [cell];
  const col = colOf(v0), out = [cell], mark = seen ?? new Uint8Array(COLS * RM);
  mark[cell] = 1;
  for (let k = 0; k < out.length; k++) {
    const c = (out[k] / RM) | 0, i = out[k] % RM;
    for (const [dc, di] of NB) {
      const c2 = c + dc, i2 = i + di;
      if (c2 < 0 || c2 >= COLS || i2 < 0 || i2 >= B.h[c2]) continue;
      const j = idx(c2, i2), v = B.g[j];
      if (!mark[j] && isDirt(v) && colOf(v) === col) (mark[j] = 1), out.push(j);
    }
  }
  return out;
}

interface BlastRes { list: number[]; bubbles: number; rocks: number; gems: number; bombs: number; drills: number; cracked: number[]; dirt: number }
/** 공기 방울 하나 = 숨 +2 (연쇄는 숨을 안 쓰는 것 자체가 보상) */
const BUB_AIR = 2;
const DRILL_DEPTH = 4;
/** 터질 칸을 정한다: 폭탄 흙은 둘레 9칸, 터진 칸 옆의 공기 방울은 같이 팡(숨 +2), 옆의 바위는 금 → 두 번째면 깨짐 */
function blast(B: Board, seeds: number[], wave: number): BlastRes {
  const mark = new Uint8Array(COLS * RM), list: number[] = [];
  const add = (j: number) => {
    if (mark[j]) return;
    mark[j] = 1;
    list.push(j);
  };
  for (const j of seeds) add(j);
  let bombs = 0, drills = 0;
  for (let k = 0; k < list.length; k++) {
    const j = list[k], v = B.g[j];
    if (isDirt(v) && v & BOMB) {
      bombs++;
      const c = (j / RM) | 0, i = j % RM;
      for (let dc = -1; dc <= 1; dc++) for (let di = -1; di <= 1; di++) {
        const c2 = c + dc, i2 = i + di;
        if (c2 >= 0 && c2 < COLS && i2 >= 0 && i2 < B.h[c2]) add(idx(c2, i2));
      }
    }
    if (isDirt(v) && v & DRILL) {
      drills++;
      const c = (j / RM) | 0, i = j % RM;
      for (let di = 1; di <= DRILL_DEPTH && i - di >= 0; di++) add(idx(c, i - di));
    }
  }
  const core = list.length, cracked: number[] = [], cmark = new Uint8Array(COLS * RM);
  for (let k = 0; k < core; k++) {
    const j = list[k], c = (j / RM) | 0, i = j % RM;
    for (const [dc, di] of NB) {
      const c2 = c + dc, i2 = i + di;
      if (c2 < 0 || c2 >= COLS || i2 < 0 || i2 >= B.h[c2]) continue;
      const n = idx(c2, i2), v = B.g[n];
      if (mark[n] || cmark[n]) continue;
      if (v & BUB) add(n);
      else if (v & ROCK) (cmark[n] = 1), cracked.push(n);
    }
  }
  for (const n of cracked) {
    if (B.g[n] & CRACK) add(n);
    else B.g[n] |= CRACK;
  }
  let bubbles = 0, rocks = 0, gems = 0, dirt = 0;
  for (const j of list) {
    const v = B.g[j];
    if (v & BUB) bubbles++;
    else if (v & ROCK) rocks++;
    else if (isDirt(v)) (dirt++, v & GEM && gems++);
  }
  B.breath += bubbles * BUB_AIR;
  B.bub += bubbles;
  B.rock += rocks;
  B.gem += gems;
  B.bomb += bombs;
  B.drill += drills;
  B.pts += dirt * (10 + wave * 6) + rocks * 25 + bubbles * 20 + gems * 80 + bombs * 30 + drills * 30;
  return { list, bubbles, rocks, gems, bombs, drills, cracked: cracked.filter((n) => !mark[n]), dirt };
}

interface Settle { fall: Int8Array; moved: Uint8Array; maxDrop: number; moleDrop: number }
/** 터진 칸을 빼고 기둥마다 아래로 무너뜨린다 */
function settle(B: Board, list: number[]): Settle {
  const gone = new Uint8Array(COLS * RM);
  for (const j of list) gone[j] = 1;
  const fall = new Int8Array(COLS * RM), moved = new Uint8Array(COLS * RM);
  let maxDrop = 0;
  const h0 = B.h[B.mc];
  for (let c = 0; c < COLS; c++) {
    let w = 0;
    const hc = B.h[c];
    for (let i = 0; i < hc; i++) {
      const j = idx(c, i);
      if (gone[j]) continue;
      const d = i - w;
      B.g[idx(c, w)] = B.g[j];
      fall[idx(c, w)] = d;
      if (d > 0) (moved[idx(c, w)] = 1), (maxDrop = Math.max(maxDrop, d));
      w++;
    }
    for (let i = w; i < hc; i++) B.g[idx(c, i)] = 0;
    B.h[c] = w;
  }
  return { fall, moved, maxDrop, moleDrop: h0 - B.h[B.mc] };
}
/** 두더지는 옆 줄이 더 낮으면 데굴 굴러 내려간다 (지나간 줄들) */
function roll(B: Board): number[] {
  const path: number[] = [];
  for (let n = 0; n < 8; n++) {
    const c = B.mc, hc = B.h[c];
    const l = c > 0 ? B.h[c - 1] : 99, r = c < COLS - 1 ? B.h[c + 1] : 99;
    if (l >= hc && r >= hc) break;
    B.mc = l < r ? c - 1 : r < l ? c + 1 : c < 2 ? c + 1 : c - 1;
    path.push(B.mc);
  }
  return path;
}
/** 무너져 내린 흙이 끼어 같은 색 4개 이상이 된 덩어리 (저절로 연쇄 팡) */
function chainCells(B: Board, moved: Uint8Array): number[] {
  const seen = new Uint8Array(COLS * RM), out: number[] = [];
  for (let c = 0; c < COLS; c++) for (let i = 0; i < B.h[c]; i++) {
    const j = idx(c, i);
    if (!moved[j] || seen[j] || !isDirt(B.g[j])) continue;
    const grp = flood(B, j, seen);
    if (grp.length >= 4) out.push(...grp);
  }
  return out;
}
/** 톡 한 번을 끝까지 (봇의 미리 계산 — 화면의 단계 진행과 같은 순서) */
function simTap(B0: Board, cell: number): Board {
  const B = cloneB(B0);
  B.breath--;
  B.taps++;
  let seeds = flood(B, cell), wave = 0;
  for (let guard = 0; guard < 40; guard++) {
    const r = blast(B, seeds, wave);
    const st = settle(B, r.list);
    roll(B);
    const ch = chainCells(B, st.moved);
    if (!ch.length) break;
    wave++;
    B.chain++;
    B.combo = Math.max(B.combo, wave);
    seeds = ch;
  }
  return B;
}
const tappable = (v: number) => isDirt(v);

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'arrive' | 'breath' | 'chain' | 'combo' | 'gem' | 'rock' | 'drill' | 'bub';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
type Spot = '' | 'bubble' | 'rock' | 'bomb' | 'gem' | 'drill' | 'chest';
interface StageDef {
  name: string; news: string; hint: string; spot: Spot;
  rows: number; colors: number; clump: number; maxGroup: number; breath: number; bub: number; rock: number; bomb: number; gem: number; drill: number;
  stars: StarDef[];
}
const ARRIVE = ST('arrive', 0, '보물 상자 도착');
export const STAGES: StageDef[] = [
  {
    name: '첫 굴', news: '', hint: '같은 색 덩어리를 톡 — 와르르 팡!', spot: '',
    rows: 10, colors: 4, clump: 0.3, maxGroup: 3, breath: 12, bub: 0, rock: 0, bomb: 0, gem: 0, drill: 0,
    stars: [ARRIVE],
  },
  {
    name: '공기 방울', news: '공기 방울 — 옆이 터지면 같이 팡! 숨 +2', hint: '공기 방울 옆을 터뜨려요', spot: 'bubble',
    rows: 13, colors: 4, clump: 0.3, maxGroup: 3, breath: 10, bub: 3, rock: 0, bomb: 0, gem: 0, drill: 0,
    stars: [ARRIVE, ST('breath', 3, '숨 3번 남기고 도착')],
  },
  {
    name: '단단한 바위', news: '바위 — 옆에서 두 번 터져야 깨져요', hint: '바위는 옆을 두 번 터뜨려요', spot: 'rock',
    rows: 15, colors: 5, clump: 0.32, maxGroup: 3, breath: 10, bub: 2, rock: 5, bomb: 0, gem: 0, drill: 0,
    stars: [ARRIVE, ST('breath', 3, '숨 3번 남기고 도착'), ST('combo', 2, '한 번에 연쇄 2번')],
  },
  {
    name: '폭탄 흙', news: '폭탄 흙 — 터지면 둘레 9칸이 쾅!', hint: '폭탄은 바위도 한 번에 깨요', spot: 'bomb',
    rows: 16, colors: 5, clump: 0.32, maxGroup: 3, breath: 10, bub: 2, rock: 6, bomb: 2, gem: 0, drill: 0,
    stars: [ARRIVE, ST('rock', 3, '바위 3개 깨기'), ST('breath', 3, '숨 3번 남기고 도착')],
  },
  {
    name: '반짝 보석', news: '보석 — 보석 든 흙을 터뜨리면 주워요', hint: '보석은 길에서 조금 비켜 있어요', spot: 'gem',
    rows: 17, colors: 5, clump: 0.32, maxGroup: 3, breath: 10, bub: 2, rock: 4, bomb: 1, gem: 4, drill: 0,
    stars: [ARRIVE, ST('gem', 2, '보석 2개 줍기'), ST('breath', 2, '숨 2번 남기고 도착')],
  },
  {
    name: '드릴 흙', news: '드릴 흙 — 터지면 그 줄 밑으로 4칸 부르릉!', hint: '드릴이 두더지 줄에 오면 터뜨려요', spot: 'drill',
    rows: 19, colors: 5, clump: 0.34, maxGroup: 3, breath: 11, bub: 2, rock: 5, bomb: 1, gem: 4, drill: 2,
    stars: [ARRIVE, ST('drill', 1, '드릴 한 번 쓰기'), ST('gem', 3, '보석 3개 줍기')],
  },
  {
    name: '보물 동굴', news: '', hint: '가장 깊은 보물 — 모두 다 나와요', spot: 'chest',
    rows: 22, colors: 5, clump: 0.33, maxGroup: 3, breath: 12, bub: 3, rock: 6, bomb: 2, gem: 5, drill: 2,
    stars: [ARRIVE, ST('gem', 3, '보석 3개 줍기'), ST('combo', 3, '한 번에 연쇄 3번')],
  },
];
export const STAGE_COUNT = STAGES.length;
const CLEAR_PTS = 300, STAR_PTS = 200, BREATH_PTS = 30, WIN_PTS = 500, HEART_PTS = 200;

/** 판 만들기: 덩어리가 지게 색을 깔고, 판마다 새것을 흩는다 (같은 판 다시 = 같은 땅) */
function makeBoard(seed: number, k: number): Board {
  const d = STAGES[k], rng = mulberry32(seed), R = d.rows;
  const g = new Int32Array(COLS * RM), h = new Int8Array(COLS).fill(R);
  const rnd = (n: number) => Math.floor(rng() * n);
  for (let i = 0; i < R; i++) for (let c = 0; c < COLS; c++) {
    const p = rng();
    let col = rnd(d.colors);
    if (p < d.clump && c > 0) col = colOf(g[idx(c - 1, i)]);
    else if (p < d.clump * 2 && i > 0) col = colOf(g[idx(c, i - 1)]);
    g[idx(c, i)] = DIRT | col;
  }
  // 처음부터 4개 넘게 붙은 덩어리는 없게 (연쇄는 무너져야만 생긴다)
  const B0: Board = { R, g, h, mc: 2, breath: 0, taps: 0, chain: 0, combo: 0, gem: 0, rock: 0, drill: 0, bub: 0, bomb: 0, pts: 0 };
  for (let pass = 0; pass < 30; pass++) {
    let bad = false;
    const seen = new Uint8Array(COLS * RM);
    for (let j0 = 0; j0 < COLS * RM; j0++) {
      if (j0 % RM >= R || seen[j0]) continue;
      const grp = flood(B0, j0, seen);
      if (grp.length <= d.maxGroup) continue;
      bad = true;
      const j = grp[Math.floor(rng() * grp.length)];
      g[j] = DIRT | ((colOf(g[j]) + 1 + rnd(d.colors - 1)) % d.colors);
    }
    if (!bad) break;
  }
  if (k === 0) {
    // 첫 판 맨 위: 두더지 밑의 큰 빨간 덩어리를 톡 하면 노란 흙이 무너져 연쇄 팡 (첫 3초)
    const top = [
      [1, 1, 2, 2, 0],
      [1, 0, 0, 0, 2],
      [1, 1, 0, 1, 2],
      [2, 1, 2, 1, 1],
    ];
    top.forEach((row, r) => row.forEach((col, c) => (g[idx(c, R - 1 - r)] = DIRT | col)));
  }
  const free = (c: number, i: number) => g[idx(c, i)] === (DIRT | colOf(g[idx(c, i)]));
  const place = (n: number, ok: (c: number, i: number) => boolean, put: (j: number) => void) => {
    for (let a = 0, left = n; a < 400 && left > 0; a++) {
      const c = rnd(COLS), i = rnd(R - 1);
      if (!free(c, i) || !ok(c, i)) continue;
      put(idx(c, i));
      left--;
    }
  };
  const rowRocks = (i: number) => [0, 1, 2, 3, 4].filter((c) => g[idx(c, i)] & ROCK).length;
  place(d.rock, (c, i) => i < R - 2 && rowRocks(i) < 2 && !(i > 0 && g[idx(c, i - 1)] & ROCK), (j) => (g[j] = ROCK));
  place(d.bub, (_c, i) => i < R - 2, (j) => (g[j] = BUB));
  place(d.bomb, (_c, i) => i < R - 3 && i > 1, (j) => (g[j] |= BOMB));
  place(d.gem, (c, i) => c !== 2 && i < R - 2, (j) => (g[j] |= GEM));
  place(d.drill, (_c, i) => i < R - 2 && i > 3, (j) => (g[j] |= DRILL));
  // 무늬 씨앗 (그림용, 블록과 함께 떨어진다 — 판 계산엔 안 쓰임)
  for (let c = 0; c < COLS; c++) for (let i = 0; i < R; i++) g[idx(c, i)] |= rnd(256) << 12;
  return { R, g, h, mc: 2, breath: d.breath, taps: 0, chain: 0, combo: 0, gem: 0, rock: 0, drill: 0, bub: 0, bomb: 0, pts: 0 };
}

// ───────────────────────────── 상태 ─────────────────────────────
type Phase = 'play' | 'pop' | 'fall' | 'roll' | 'clear' | 'fail';
type Face = 'idle' | 'happy' | 'scared' | 'dizzy' | 'proud' | 'sad' | 'push';
interface Ev { t: number; kind: string; c: number; r: number; n?: number; text?: string; list?: number[]; codes?: number[] }

export interface MoleState {
  rng: Rng; seed: number; t: number; stage: number; seeds: number[]; B: Board;
  phase: Phase; pt: number; pdur: number; wave: number; tapSize: number;
  popList: number[]; popCodes: number[]; fall: Int8Array; moved: Uint8Array; fallEnd: number;
  moleFrom: { c: number; h: number }; rollPath: number[]; rollFrom: { c: number; h: number }; resDrop: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  cam: number; down: boolean; firstTap: number; firstBig: number; wowN: number; slow: number;
  face: Face; faceT: number; say: string; sayT: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { k: Spot; t: number } | null;
  events: Ev[]; bigText: string; bigT: number; lastTap: number;
}

const ev = (s: MoleState, kind: string, c: number, r: number, extra: Partial<Ev> = {}) => s.events.push({ t: s.t, kind, c, r, ...extra });
function see(s: MoleState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: MoleState, text: string) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
}
function setFace(s: MoleState, f: Face, say = '') {
  s.face = f;
  s.faceT = s.t;
  if (say) (s.say = say), (s.sayT = s.t);
}
/** 화면 줄 (위에서 0) ↔ 기둥 높이 */
const rowOf = (B: Board, i: number) => B.R - 1 - i;
const moleRow = (B: Board) => B.R - 1 - B.h[B.mc];
function camTarget(B: Board) {
  return clamp(moleRow(B) - 1.45, -2.25, B.R + 1.05 - VIS);
}
const yOfRow = (cam: number, r: number) => PLAY_Y0 + (r - cam) * CH;
/** 지금 톡 할 수 있게 보이는 칸인가 (칸 가운데가 놀이 칸 안) */
function visibleCell(B: Board, cam: number, c: number, i: number) {
  const yc = yOfRow(cam, rowOf(B, i)) + CH / 2;
  return i < B.h[c] && yc > PLAY_Y0 + 0.01 && yc < PLAY_Y1 - 0.01;
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
const SPOT_AT = 150;
const POP_T = 15, ROLL_STEP = 11, CLEAR_T = 190, FAIL_T = 160, BANNER_T = 150;
function newStage(s: MoleState) {
  const d = STAGES[s.stage];
  s.B = makeBoard(s.seeds[s.stage], s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.wave = 0;
  s.popList = [];
  s.popCodes = [];
  s.fall = new Int8Array(COLS * RM);
  s.moved = new Uint8Array(COLS * RM);
  s.rollPath = [];
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.cam = camTarget(s.B);
  s.moleFrom = { c: s.B.mc, h: s.B.h[s.B.mc] };
  s.rollFrom = { ...s.moleFrom };
  setFace(s, 'idle');
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    if (d.spot) {
      s.spot = { k: d.spot, t: s.t };
      see(s, d.spot);
    } else s.spot = null;
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: '같은 땅이에요 — 이번엔 다른 데부터', t: s.t };
}

function startWave(s: MoleState, seeds: number[]) {
  const B = s.B;
  const r = blast(B, seeds, s.wave);
  s.popList = r.list;
  s.popCodes = r.list.map((j) => B.g[j]);
  s.phase = 'pop';
  s.pt = 0;
  s.pdur = POP_T + (s.wave ? 3 : 0);
  const n = r.list.length;
  // 사건 (화면 연출) — 칸 목록과 값
  ev(s, 'pop', 0, 0, { n, list: r.list.slice(), codes: s.popCodes.slice() });
  for (const j of r.cracked) ev(s, 'crack', (j / RM) | 0, rowOf(B, j % RM));
  if (r.bubbles) {
    see(s, 'bubble');
    ev(s, 'air', 0, 0, { n: r.bubbles * BUB_AIR });
  }
  if (r.rocks) see(s, 'rock');
  if (r.gems) (see(s, 'gem'), ev(s, 'gem', 0, 0, { n: r.gems }));
  if (r.drills) {
    see(s, 'drill');
    s.slow = Math.max(s.slow, 12);
    setFace(s, 'push', '부르르릉!');
    wow(s, '드릴 부르릉!');
  } else if (r.bombs) {
    see(s, 'bomb');
    s.slow = Math.max(s.slow, 14);
    wow(s, r.bombs > 1 ? '쾅쾅!!' : '쾅!');
  } else if (s.wave > 0) {
    wow(s, s.wave >= 3 ? `연쇄 ${s.wave}!!!` : s.wave === 2 ? '연쇄 2!!' : '연쇄 팡!');
    if (s.wave >= 2) s.slow = Math.max(s.slow, 10);
  } else if (n >= 6) wow(s, n >= 9 ? '와르르르!!' : '와르르!');
  if (s.wave > 0 && s.wave >= 2) setFace(s, 'happy', s.wave >= 3 ? '우와와!' : '또 터진다!');
}

function afterFall(s: MoleState) {
  const B = s.B;
  s.rollFrom = { c: B.mc, h: B.h[B.mc] };
  const path = roll(B);
  if (path.length) {
    s.rollPath = path;
    s.phase = 'roll';
    s.pt = 0;
    const drop = s.rollFrom.h - B.h[B.mc];
    s.resDrop += drop;
    s.pdur = ROLL_STEP * path.length + Math.round(6 + 2.2 * drop);
    see(s, 'roll');
    setFace(s, 'scared', drop >= 3 ? '으아아앗!' : '데굴데굴~');
    ev(s, 'roll', B.mc, moleRow(B), { n: drop });
    return;
  }
  nextWave(s);
}

function nextWave(s: MoleState) {
  const B = s.B;
  const ch = chainCells(B, s.moved);
  if (ch.length) {
    s.wave++;
    B.chain++;
    B.combo = Math.max(B.combo, s.wave);
    see(s, 'chain');
    ev(s, 'chain', 0, 0, { n: s.wave });
    startWave(s, ch);
    return;
  }
  finishTap(s);
}

function finishTap(s: MoleState) {
  const B = s.B, d = STAGES[s.stage];
  s.wave = 0;
  if (s.resDrop >= 3 && s.phase !== 'clear') {
    wow(s, s.resDrop >= 5 ? '쑤우욱!!' : '쑥 내려갔다!');
    setFace(s, 'dizzy');
  }
  s.resDrop = 0;
  if (B.h[B.mc] === 0) {
    s.phase = 'clear';
    s.pt = 0;
    s.starOk = d.stars.map((q) => starMet(B, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    const mul = 1 + s.stage * 0.5;
    s.pts += B.pts + (CLEAR_PTS + s.got * STAR_PTS + B.breath * BREATH_PTS) * mul;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    setFace(s, 'happy', '보물이다!');
    wow(s, '보물 상자!');
    see(s, 'chest');
    ev(s, 'clear', B.mc, B.R);
    return;
  }
  if (B.breath <= 0) {
    s.phase = 'fail';
    s.pt = 0;
    s.hearts--;
    s.tries++;
    s.pts += Math.round(B.pts * 0.3);
    setFace(s, 'sad', '숨이 차…');
    ev(s, 'fail', B.mc, moleRow(B));
    return;
  }
  s.phase = 'play';
  s.pt = 0;
  if (s.face === 'scared') setFace(s, 'idle');
}
function starMet(B: Board, q: StarDef) {
  switch (q.k) {
    case 'arrive': return true;
    case 'breath': return B.breath >= q.n;
    case 'chain': return B.chain >= q.n;
    case 'combo': return B.combo >= q.n;
    case 'gem': return B.gem >= q.n;
    case 'rock': return B.rock >= q.n;
    case 'drill': return B.drill >= q.n;
    case 'bub': return B.bub >= q.n;
  }
}
function starNow(B: Board, q: StarDef): string {
  if (q.k === 'arrive') return '';
  if (q.k === 'breath') return '';
  const v = q.k === 'chain' ? B.chain : q.k === 'combo' ? B.combo : q.k === 'gem' ? B.gem : q.k === 'rock' ? B.rock : q.k === 'drill' ? B.drill : B.bub;
  return `${Math.min(v, q.n)}/${q.n}`;
}

function tapCell(s: MoleState, c: number, i: number) {
  const B = s.B, v = B.g[idx(c, i)];
  // 보이는 흙이 하나도 없으면(바위·방울뿐) 그 블록을 바로 깬다 — 막혀서 못 하는 일은 없다
  if (!tappable(v) && !groupsIn(B, s.cam).length) {
    B.breath--;
    B.taps++;
    s.lastTap = s.t;
    s.wave = 0;
    s.resDrop = 0;
    ev(s, 'tap', c, rowOf(B, i), { n: 1 });
    startWave(s, [idx(c, i)]);
    return;
  }
  if (v & ROCK) {
    ev(s, 'clunk', c, rowOf(B, i), { text: '단단해!' });
    return;
  }
  if (v & BUB) {
    ev(s, 'clunk', c, rowOf(B, i), { text: '옆을 터뜨려요' });
    return;
  }
  if (!tappable(v)) return;
  const grp = flood(B, idx(c, i));
  B.breath--;
  B.taps++;
  s.lastTap = s.t;
  s.tapSize = grp.length;
  s.wave = 0;
  s.resDrop = 0;
  ev(s, 'tap', c, rowOf(B, i), { n: grp.length });
  startWave(s, grp);
}

function stepPhase(s: MoleState) {
  const B = s.B;
  if (s.slow > 0 && s.t % 2) {
    s.slow--;
    return;
  }
  s.pt++;
  if (s.phase === 'pop' && s.pt >= s.pdur) {
    s.moleFrom = { c: B.mc, h: B.h[B.mc] };
    ev(s, 'boom', 0, 0, { list: s.popList.slice(), codes: s.popList.map((j) => B.g[j]), n: s.wave });
    const st = settle(B, s.popList);
    s.fall = st.fall;
    s.moved = st.moved;
    s.popList = [];
    s.phase = 'fall';
    s.pt = 0;
    s.pdur = Math.round(7 + 4.2 * Math.sqrt(Math.max(st.maxDrop, st.moleDrop)) + (st.maxDrop ? 3 : 0));
    s.resDrop += st.moleDrop;
    if (st.moleDrop > 0) setFace(s, 'scared', st.moleDrop >= 3 ? '으아아앗!' : st.moleDrop >= 2 ? '으앗!' : '');
    if (st.moleDrop >= 1) see(s, 'drop');
  } else if (s.phase === 'fall' && s.pt >= s.pdur) {
    s.fallEnd = s.t;
    const low: number[] = [];
    for (let c = 0; c < COLS; c++) for (let i = 0; i < B.h[c]; i++) if (s.moved[idx(c, i)]) (low.push(idx(c, i)), (i = 99));
    ev(s, 'land', B.mc, moleRow(B), { n: s.resDrop, list: low });
    afterFall(s);
  } else if (s.phase === 'roll' && s.pt >= s.pdur) {
    ev(s, 'land', B.mc, moleRow(B), { n: s.resDrop });
    s.rollPath = [];
    nextWave(s);
  }
}

const game: GameDef<MoleState> & { wows(s: MoleState): number } = {
  id: 'molepop',
  name: '⛏️ 두더지 광부 블록 팡',
  genes: ['blast', 'depth', 'chain'],
  twist: '덩어리를 톡 하면 위 흙이 와르르 무너져 두더지가 "으앗!" 쑥 떨어지고, 무너진 흙이 같은 색 4개로 이어지면 저절로 연쇄 팡 — 어디부터 터뜨리느냐가 무너짐을 설계한다',
  rules: [
    '같은 색 흙 덩어리를 톡 하면 와르르 팡! 위 흙이 무너지고 두더지가 쑥 떨어져요.',
    '무너진 흙이 같은 색 4개 이상 이어지면 저절로 연쇄 팡 — 숨이 안 들어요!',
    '톡 한 번에 숨 1. 숨이 다하기 전에 바닥 보물 상자까지! 못 가면 하트 -1.',
  ],
  controls: 'touch',
  hint: '흙 덩어리를 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 비치는 풀밭 아래 단면 갱도 — 헬멧 쓴 통통한 두더지 광부와 큼직한 흙·모래·이끼·점토 블록, 벽에서 고개 내민 지렁이 구경꾼',
    mood: '위는 파란 하늘과 풀밭, 아래로 갈수록 흙층 색이 바뀌고 나무뿌리·화석·반짝이는 돌이 박힌 뒷벽. 덩어리를 톡 하면 흙이 팡 터지며 흙가루가 날리고, 위 블록이 와르르 무너져 두더지가 "으앗!" 하고 떨어진다. 바닥엔 금빛 보물 상자가 반짝인다.',
    palette: { bg: '#7a4a2a', ink: '#3a2414', muted: '#8a6a4a', accent: '#ffcf3a', hot: '#ff6a3a', soft: '#fff2d8' },
  },
  guard: (s) => s.B.breath,
  cleared: (s) => (s.phase === 'clear' ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const rng = mulberry32(seed);
    const s = {
      rng, seed, t: 0, stage: 0, seeds: STAGES.map(() => Math.floor(rng() * 1e9)),
      phase: 'play', pt: 0, pdur: 0, wave: 0, tapSize: 0,
      popList: [], popCodes: [], fall: new Int8Array(COLS * RM), moved: new Uint8Array(COLS * RM), fallEnd: -999,
      moleFrom: { c: 2, h: 0 }, rollPath: [], rollFrom: { c: 2, h: 0 }, resDrop: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      cam: 0, down: false, firstTap: -1, firstBig: -1, wowN: 0, slow: 0,
      face: 'idle', faceT: 0, say: '', sayT: -999,
      seen: new Set<string>(), banner: null, spot: null, events: [], bigText: '', bigT: -999, lastTap: -999,
    } as unknown as MoleState;
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    const B = s.B;
    if (s.phase === 'play') {
      if (fresh) {
        const y = p!.y * A, c = Math.floor(p!.x / CW);
        if (y >= PLAY_Y0 && y <= PLAY_Y1 && c >= 0 && c < COLS) {
          const fr = s.cam + (y - PLAY_Y0) / CH, r = Math.floor(fr);
          let i = B.R - 1 - r;
          // 맨 위 블록의 윗면(3/4 시점으로 보이는 띠)을 눌러도 그 블록
          if (i === B.h[c] && fr - r > 1 - TOPF / CH - 0.05) i--;
          if (i >= 0 && i < B.h[c]) {
            if (s.firstTap < 0) s.firstTap = s.t;
            tapCell(s, c, i);
          }
        }
      }
    } else if (s.phase === 'clear' || s.phase === 'fail') {
      s.pt++;
      const T = s.phase === 'clear' ? CLEAR_T : FAIL_T;
      if (s.pt >= T || (fresh && s.pt > 60)) {
        if (s.phase === 'clear') {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    } else stepPhase(s);
    s.cam += (camTarget(s.B) - s.cam) * 0.11;
    if (s.events.length > 80) s.events = s.events.filter((e) => s.t - e.t < 90);
    if (s.spot && s.t - s.spot.t > SPOT_AT + 240) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts + (s.phase === 'clear' ? 0 : s.B.pts * 0.3)),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const molepop = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
export function tapAt(s: MoleState, j: number): Input {
  const c = (j / RM) | 0, i = j % RM;
  const y = yOfRow(s.cam, rowOf(s.B, i)) + CH * 0.5;
  return { tap: false, dir: 0, pointer: { x: (c + 0.5) * CW, y: y / A } };
}
/** 지금 보이는 덩어리마다 칸 하나 */
function groupsIn(B: Board, cam: number): { cell: number; size: number }[] {
  const seen = new Uint8Array(COLS * RM), out: { cell: number; size: number }[] = [];
  for (let c = 0; c < COLS; c++) for (let i = B.h[c] - 1; i >= 0; i--) {
    const j = idx(c, i);
    if (seen[j] || !tappable(B.g[j]) || !visibleCell(B, cam, c, i)) continue;
    const grp = flood(B, j, seen);
    out.push({ cell: j, size: grp.length });
  }
  return out;
}
const ready = (s: MoleState) => s.phase === 'play' && !s.down && Math.abs(s.cam - camTarget(s.B)) < 0.08;

/** 판의 값: 내려간 깊이 · 남은 숨 · 별 조건 */
function value(B: Board, d: StageDef): number {
  const hm = B.h[B.mc];
  let star = 0;
  for (const q of d.stars) {
    if (q.k === 'arrive' || q.k === 'breath') continue;
    const v = q.k === 'chain' ? B.chain : q.k === 'combo' ? B.combo : q.k === 'gem' ? B.gem : q.k === 'rock' ? B.rock : q.k === 'drill' ? B.drill : B.bub;
    star += Math.min(v, q.n) * 260;
  }
  const bq = d.stars.find((q) => q.k === 'breath');
  if (hm === 0) {
    let v = 20000 + B.breath * 120 + star;
    if (bq && B.breath >= bq.n) v += 900;
    return v;
  }
  if (B.breath <= 0) return -20000 - hm * 100 + star * 0.2;
  // 바위가 두더지 밑에 있으면 더 깊은 셈
  let rocks = 0;
  for (let i = 0; i < hm; i++) if (B.g[idx(B.mc, i)] & ROCK) rocks++;
  const need = (hm + rocks * 1.2) * 0.42;
  const spare = B.breath - need;
  return -hm * 150 - rocks * 120 + B.breath * 110 + star + (spare < 0 ? spare * 260 : 0);
}
const planMem = new WeakMap<object, { t: number; cell: number }>();
function plan(s: MoleState): number {
  const B = s.B, d = STAGES[s.stage];
  const c1 = groupsIn(B, s.cam);
  if (!c1.length) return -1;
  const first = c1.map((g) => {
    const B1 = simTap(B, g.cell);
    return { g, B1, v: value(B1, d) };
  });
  first.sort((a, b) => b.v - a.v);
  let best = first[0], bv = -Infinity;
  for (const f of first.slice(0, 6)) {
    let v = f.v;
    if (f.B1.h[f.B1.mc] > 0 && f.B1.breath > 0) {
      let b2 = -Infinity;
      for (const g2 of groupsIn(f.B1, camTarget(f.B1))) b2 = Math.max(b2, value(simTap(f.B1, g2.cell), d));
      if (b2 > -Infinity) v = f.v * 0.25 + b2 * 0.75;
    }
    if (v > bv) (bv = v), (best = f);
  }
  return best.g.cell;
}
/** 잘하는 봇: 톡마다 무너짐·연쇄·굴러감을 끝까지 계산해 두 수 앞을 본다 */
export const molepopSmart: Bot<MoleState> = {
  name: '무너짐을 두 수 앞까지 계산',
  act(s) {
    if (!ready(s)) return NO;
    if (s.t - s.lastTap < 4) return NO;
    const m = planMem.get(s);
    if (m && m.t === s.lastTap) return m.cell >= 0 ? tapAt(s, m.cell) : NO;
    const cell = plan(s);
    planMem.set(s, { t: s.lastTap, cell });
    return cell >= 0 ? tapAt(s, cell) : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const molepopRandom: Bot<MoleState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.02 + rng() * 0.96;
        m.y = 0.08 + rng() * 0.9;
      } else m.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

/** 버릇 봇: 늘 두더지 바로 밑을 톡 (바위·방울이면 그 밑 줄에서 가장 가까운 흙) */
export const molepopHabit: Bot<MoleState> = {
  name: '늘 두더지 바로 밑만 톡',
  act(s) {
    if (!ready(s) || s.t - s.lastTap < 4) return NO;
    const B = s.B;
    for (let i = B.h[B.mc] - 1; i >= 0; i--) {
      if (!visibleCell(B, s.cam, B.mc, i)) break;
      if (tappable(B.g[idx(B.mc, i)])) return tapAt(s, idx(B.mc, i));
    }
    for (const dc of [-1, 1]) {
      const c = B.mc + dc;
      if (c < 0 || c >= COLS) continue;
      for (let i = B.h[c] - 1; i >= 0; i--) if (visibleCell(B, s.cam, c, i) && tappable(B.g[idx(c, i)])) return tapAt(s, idx(c, i));
    }
    const g = groupsIn(B, s.cam)[0];
    return g ? tapAt(s, g.cell) : NO;
  },
};
/** 독립 버릇 봇: 늘 보이는 가장 큰 덩어리를 톡 (같으면 두더지에 가까운 것) */
export const molepopHabit2: Bot<MoleState> = {
  name: '늘 가장 큰 덩어리만 톡',
  act(s) {
    if (!ready(s) || s.t - s.lastTap < 4) return NO;
    const B = s.B;
    let best: { cell: number; size: number } | null = null, bd = 1e9;
    for (const g of groupsIn(B, s.cam)) {
      const c = (g.cell / RM) | 0, i = g.cell % RM, dist = Math.abs(c - B.mc) + Math.abs(i - B.h[B.mc]);
      if (!best || g.size > best.size || (g.size === best.size && dist < bd)) (best = g), (bd = dist);
    }
    return best ? tapAt(s, best.cell) : NO;
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
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
/** 모서리마다 둥글기가 다른 사각형 (tl, tr, br, bl) */
function rr4(ctx: C2, x: number, y: number, w: number, h: number, a: number, b: number, c: number, d: number) {
  ctx.beginPath();
  ctx.moveTo(x + a, y);
  ctx.lineTo(x + w - b, y);
  b ? ctx.arcTo(x + w, y, x + w, y + b, b) : ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  c ? ctx.arcTo(x + w, y + h, x + w - c, y + h, c) : ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + d, y + h);
  d ? ctx.arcTo(x, y + h, x, y + h - d, d) : ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + a);
  a ? ctx.arcTo(x, y, x + a, y, a) : ctx.lineTo(x, y);
  ctx.closePath();
}
const rr = (ctx: C2, x: number, y: number, w: number, h: number, r: number) => rr4(ctx, x, y, w, h, r, r, r, r);
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    k ? ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q) : ctx.moveTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function heartPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.closePath();
}

interface Mat { base: string; light: string; dark: string; line: string; top: string }
const PAL: Mat[] = [
  { base: '#f07a4c', light: '#ffb68e', dark: '#bf4b28', line: '#7a2c14', top: '#ffc7a6' },
  { base: '#f8c847', light: '#ffe995', dark: '#cc921c', line: '#7d560c', top: '#fff0b4' },
  { base: '#72c84c', light: '#b6ef8a', dark: '#3d8d2a', line: '#225218', top: '#c8f59e' },
  { base: '#58a6ee', light: '#acdaff', dark: '#2d68b2', line: '#173c6c', top: '#c4e6ff' },
  { base: '#b17ae8', light: '#dfbeff', dark: '#7444b4', line: '#401c6c', top: '#ead2ff' },
];
const ROCKM: Mat = { base: '#a7adb6', light: '#dde1e6', dark: '#6a7079', line: '#3a3f46', top: '#e6e9ed' };

interface Vis { ev: number; worm: { c: number; r: number; t: number } | null; cheer: number; gasp: number; air: number; gemT: number; breath: number }
const VISM = new WeakMap<object, Vis>();
const visOf = (s: MoleState): Vis => {
  let v = VISM.get(s);
  if (!v) VISM.set(s, (v = { ev: -1, worm: null, cheer: -999, gasp: -999, air: -999, gemT: -999, breath: s.B.breath }));
  return v;
};

/** 두더지 발 밑 자리 (가로 폭 단위): x, y(발), 기울기 */
function molePos(s: MoleState): { x: number; y: number; air: number; tilt: number; spin: number } {
  const B = s.B, cam = s.cam;
  const stand = (hgt: number) => yOfRow(cam, B.R - hgt) + (hgt > 0 ? -TOPF * 0.15 : 0.012);
  let x = (B.mc + 0.5) * CW, y = stand(B.h[B.mc]), air = 0, tilt = 0, spin = 0;
  if (s.phase === 'fall') {
    const u = clamp(s.pt / Math.max(1, s.pdur), 0, 1), e = u * u;
    const y0 = stand(s.moleFrom.h);
    y = y0 + (y - y0) * e;
    air = s.moleFrom.h !== B.h[B.mc] ? 1 : 0;
  } else if (s.phase === 'roll' && s.rollPath.length) {
    const n = s.rollPath.length, side = n * ROLL_STEP, u = s.pt;
    const cols = [s.rollFrom.c, ...s.rollPath];
    if (u < side) {
      const k = Math.min(n - 1, Math.floor(u / ROLL_STEP)), f = (u - k * ROLL_STEP) / ROLL_STEP;
      x = (cols[k] + 0.5 + (cols[k + 1] - cols[k]) * f) * CW;
      y = stand(s.rollFrom.h) - Math.sin(f * Math.PI) * 0.03;
      tilt = (cols[k + 1] - cols[k]) * f * TAU;
      spin = 1;
    } else {
      const f = clamp((u - side) / Math.max(1, s.pdur - side), 0, 1);
      x = (B.mc + 0.5) * CW;
      y = stand(s.rollFrom.h) + (stand(B.h[B.mc]) - stand(s.rollFrom.h)) * f * f;
      air = 1;
    }
  }
  return { x, y, air, tilt, spin };
}

function drawAll(ctx: C2, s: MoleState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), B = s.B, t = s.t, cam = s.cam;
  const R = (v: number) => v * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const cx = (c: number) => R((c + 0.5) * CW), cy = (r: number) => R(yOfRow(cam, r) + CH / 2);

  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 10) continue;
    switch (e.kind) {
      case 'tap':
        fx.ring(cx(e.c), cy(e.r), '#ffffff', R(0.12), 4);
        fx.kick(2);
        break;
      case 'pop': {
        const L = e.list ?? [];
        let sx = 0, sy = 0;
        for (const j of L) (sx += cx((j / RM) | 0)), (sy += cy(rowOf(B, j % RM)));
        if (L.length) {
          sx /= L.length;
          sy /= L.length;
          fx.ring(sx, sy, '#fff6c8', R(0.1 + Math.min(0.3, L.length * 0.03)), 5);
          if (L.length <= 5) fx.pop(sx, sy - R(0.02), L.length >= 3 ? '팡!' : '퐁', '#fffbe6', Math.max(16, R(0.05 + L.length * 0.006)));
        }
        fx.kick(Math.min(14, 3 + L.length * 1.1));
        break;
      }
      case 'boom': {
        const L = e.list ?? [], V = e.codes ?? [];
        for (let k = 0; k < L.length; k++) {
          const j = L[k], v = V[k], x = cx((j / RM) | 0), y = cy(rowOf(B, j % RM));
          if (v & BUB) {
            fx.burst(x, y, '#d8f6ff', 14, 3.4, 3.2);
            fx.pop(x, y - R(0.03), `숨 +${BUB_AIR}`, '#bff3ff', Math.max(15, R(0.048)));
            vis.air = t;
          } else if (v & ROCK) {
            fx.burst(x, y, ROCKM.base, 14, 4, 3.4);
            fx.burst(x, y, ROCKM.dark, 8, 3, 2.6);
            fx.pop(x, y, '와장창!', '#f2f4f7', Math.max(14, R(0.042)));
          } else if (isDirt(v)) {
            const m = PAL[colOf(v)];
            fx.burst(x, y, m.base, 12, 4.2, 3.6);
            fx.burst(x, y, m.light, 6, 2.6, 2.4);
            fx.burst(x, y, '#8a5a36', 4, 3, 2.2);
            if (v & GEM) (fx.burst(x, y, '#ffffff', 10, 5, 2), fx.pop(x, y - R(0.04), '보석!', '#ffe9ff', Math.max(16, R(0.05))), (vis.gemT = t));
            if (v & BOMB) (fx.ring(x, y, '#ffb03a', R(0.32), 8), fx.burst(x, y, '#ffcf3a', 26, 7, 3.6), fx.blink('#fff1c0', 0.4), fx.kick(16));
            if (v & DRILL) (fx.burst(x, y + R(0.1), '#e6edf5', 18, 5, 2.6), fx.kick(12));
          }
        }
        if (L.length >= 6) fx.blink('#ffffff', Math.min(0.3, 0.05 + L.length * 0.02));
        if ((e.n ?? 0) > 0) vis.cheer = t;
        break;
      }
      case 'crack':
        fx.burst(cx(e.c), cy(e.r), ROCKM.light, 8, 2.6, 2.4);
        fx.pop(cx(e.c), cy(e.r) - R(0.03), '쩍!', '#f2f4f7', Math.max(14, R(0.04)));
        break;
      case 'clunk':
        fx.pop(cx(e.c), cy(e.r) - R(0.02), e.text ?? '', '#fffbe6', Math.max(14, R(0.042)));
        fx.kick(2);
        break;
      case 'land':
        for (const j of e.list ?? []) {
          const x = cx((j / RM) | 0), y = R(yOfRow(cam, rowOf(B, j % RM)) + CH);
          fx.burst(x - R(0.06), y, 'rgba(230,200,160,.9)', 4, 1.6, 3.2);
          fx.burst(x + R(0.06), y, 'rgba(230,200,160,.9)', 4, 1.6, 3.2);
        }
        if ((e.list ?? []).length) fx.kick(3);
        if ((e.n ?? 0) > 0) {
          const mp = molePos(s);
          fx.burst(R(mp.x), R(mp.y), '#c9925e', 10 + (e.n ?? 0) * 3, 2.6, 3);
          fx.kick(Math.min(12, 3 + (e.n ?? 0) * 2));
          vis.gasp = t;
        }
        break;
      case 'roll':
        vis.gasp = t;
        break;
      case 'clear': {
        const mx = molePos(s).x, x = R(mx + (mx < 0.5 ? 0.13 : -0.13)), y = R(yOfRow(cam, B.R) + 0.08);
        fx.burst(x, y, '#ffd23a', 40, 6, 3.6);
        fx.burst(x, y, '#ffffff', 16, 4, 2.4);
        fx.ring(x, y, '#fff0a0', R(0.45), 7);
        fx.blink('#fff4c0', 0.45);
        fx.kick(10);
        break;
      }
      case 'fail':
        fx.kick(6);
        break;
    }
  }
  vis.ev = t;
  if (B.breath > vis.breath) vis.air = t;
  vis.breath = B.breath;

  // ── 땅속 장면 (놀이 칸 안만) ──
  ctx.save();
  fx.begin(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, R(PLAY_Y0), w, R(PLAY_Y1 - PLAY_Y0));
  ctx.clip();
  drawBackWall(ctx, s, w);
  drawSurface(ctx, s, w, vis);
  drawFloor(ctx, s, w);
  drawBlocks(ctx, s, w);
  drawWorm(ctx, s, w, vis);
  const mp = molePos(s);
  drawMole(ctx, s, R(mp.x), R(mp.y), R(0.185), mp, vis);
  drawSpot(ctx, s, w, font);
  drawFirstTip(ctx, s, w, font);
  ctx.restore();
  // 놀이 칸 테두리 그림자
  ctx.fillStyle = lin(ctx, 0, R(PLAY_Y0), 0, R(PLAY_Y0 + 0.03), [0, 'rgba(40,20,8,.45)'], [1, 'rgba(40,20,8,0)']);
  ctx.fillRect(0, R(PLAY_Y0), w, R(0.03));
  ctx.fillStyle = lin(ctx, 0, R(PLAY_Y1 - 0.03), 0, R(PLAY_Y1), [0, 'rgba(40,20,8,0)'], [1, 'rgba(40,20,8,.45)']);
  ctx.fillRect(0, R(PLAY_Y1 - 0.03), w, R(0.03));
  drawSay(ctx, s, w, mp, font);
  drawBig(ctx, s, w, mp, font);
  ctx.restore();
  // ── HUD ──
  drawTop(ctx, s, w, font);
  drawBreath(ctx, s, w, font, vis);
  drawBottom(ctx, s, w, h, font);
  drawBanner(ctx, s, w, font, fx);
}

/** 뒷벽: 깊이마다 흙층 색이 바뀌고 뿌리·화석·돌이 박혀 있다 (빈칸으로만 보인다) */
const STRATA = [
  ['#9a643c', '#8a5734'], ['#8c5a3a', '#7c4e32'], ['#7e5240', '#6e4636'], ['#74503e', '#644434'],
  ['#6c4c44', '#5c4038'], ['#664a48', '#56403e'], ['#5e4650', '#4e3c44'],
];
function drawBackWall(ctx: C2, s: MoleState, w: number) {
  const B = s.B, cam = s.cam, R = (v: number) => v * w;
  const [c0, c1] = STRATA[s.stage];
  ctx.fillStyle = lin(ctx, 0, R(PLAY_Y0), 0, R(PLAY_Y1), [0, c0], [1, c1]);
  ctx.fillRect(0, R(PLAY_Y0), w, R(PLAY_Y1 - PLAY_Y0));
  const r0 = Math.floor(cam) - 1, r1 = Math.ceil(cam + VIS) + 1;
  for (let r = Math.max(0, r0); r <= Math.min(B.R, r1); r++) {
    const y = R(yOfRow(cam, r));
    // 흙층 띠
    ctx.fillStyle = r % 3 === 0 ? 'rgba(255,220,170,.06)' : 'rgba(40,20,10,.07)';
    ctx.fillRect(0, y, w, R(CH * 0.5));
    for (let k = 0; k < 4; k++) {
      const hs = hsh(r * 31 + k * 7 + s.stage * 101), x = R(hs);
      const yy = y + R(CH * hsh(r * 13 + k * 3 + 5));
      const kind = Math.floor(hsh(r * 17 + k * 11 + s.stage) * 10);
      if (kind < 4) {
        // 자갈
        ctx.fillStyle = kind % 2 ? 'rgba(255,230,200,.16)' : 'rgba(30,15,8,.18)';
        ell(ctx, x, yy, R(0.012 + hs * 0.01), R(0.008 + hs * 0.006));
        ctx.fill();
      } else if (kind < 6) {
        // 뿌리
        ctx.strokeStyle = 'rgba(70,40,20,.5)';
        ctx.lineWidth = R(0.007);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, yy - R(0.05));
        ctx.quadraticCurveTo(x + R(0.03), yy, x - R(0.01), yy + R(0.06));
        ctx.moveTo(x + R(0.012), yy - R(0.005));
        ctx.quadraticCurveTo(x + R(0.04), yy + R(0.01), x + R(0.045), yy + R(0.035));
        ctx.stroke();
      } else if (kind === 6) {
        // 조개 화석
        ctx.strokeStyle = 'rgba(255,236,206,.32)';
        ctx.lineWidth = R(0.004);
        ctx.beginPath();
        for (let a = 0; a < 5.5; a += 0.25) {
          const rad = R(0.004 + a * 0.0042);
          a ? ctx.lineTo(x + Math.cos(a * 1.6) * rad, yy + Math.sin(a * 1.6) * rad) : ctx.moveTo(x, yy);
        }
        ctx.stroke();
      } else if (kind === 7) {
        // 물고기 뼈 화석
        ctx.strokeStyle = 'rgba(255,236,206,.28)';
        ctx.lineWidth = R(0.0035);
        ctx.beginPath();
        ctx.moveTo(x - R(0.035), yy);
        ctx.lineTo(x + R(0.035), yy);
        for (let b = -2; b <= 2; b++) (ctx.moveTo(x + R(b * 0.012), yy - R(0.013)), ctx.lineTo(x + R(b * 0.012 + 0.004), yy + R(0.013)));
        ctx.stroke();
        ell(ctx, x + R(0.042), yy, R(0.008), R(0.008));
        ctx.stroke();
      } else {
        // 반짝 돌
        ctx.fillStyle = 'rgba(255,240,170,.35)';
        starPath(ctx, x, yy, R(0.007 + 0.004 * Math.sin(s.t * 0.08 + k + r)));
        ctx.fill();
      }
    }
  }
  // 위에서 늘어진 굵은 뿌리 (윗줄 근처)
  for (let k = 0; k < 4; k++) {
    const rx0 = R(0.08 + k * 0.27 + hsh(k + s.stage * 5) * 0.08), ry0 = R(yOfRow(cam, 0) - TOPF), len = R(0.18 + hsh(k * 9 + s.stage) * 0.2);
    if (ry0 > R(PLAY_Y1) || ry0 + len < R(PLAY_Y0)) continue;
    ctx.strokeStyle = 'rgba(92,56,30,.75)';
    ctx.lineWidth = R(0.011);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rx0, ry0);
    ctx.bezierCurveTo(rx0 + R(0.03), ry0 + len * 0.3, rx0 - R(0.03), ry0 + len * 0.6, rx0 + R(0.01), ry0 + len);
    ctx.stroke();
    ctx.lineWidth = R(0.005);
    ctx.beginPath();
    ctx.moveTo(rx0 + R(0.004), ry0 + len * 0.45);
    ctx.quadraticCurveTo(rx0 + R(0.04), ry0 + len * 0.55, rx0 + R(0.045), ry0 + len * 0.7);
    ctx.stroke();
  }
  // 가장자리 어둠 (갱도 깊이감)
  ctx.fillStyle = lin(ctx, 0, 0, R(0.12), 0, [0, 'rgba(20,8,2,.35)'], [1, 'rgba(20,8,2,0)']);
  ctx.fillRect(0, R(PLAY_Y0), R(0.12), R(PLAY_Y1 - PLAY_Y0));
  ctx.fillStyle = lin(ctx, w, 0, w - R(0.12), 0, [0, 'rgba(20,8,2,.35)'], [1, 'rgba(20,8,2,0)']);
  ctx.fillRect(w - R(0.12), R(PLAY_Y0), R(0.12), R(PLAY_Y1 - PLAY_Y0));
  // 빈칸의 그늘: 블록 밑·옆에 진 그림자 (블록이 뒷벽보다 앞에 있다)
  for (let c = 0; c < COLS; c++) {
    const top = B.h[c];
    for (let i = top; i < B.R; i++) {
      const r = rowOf(B, i), y = yOfRow(cam, r);
      if (y > PLAY_Y1 || y + CH < PLAY_Y0) continue;
      const X0 = R(c * CW), Y0 = R(y);
      if (c > 0 && B.h[c - 1] > i) {
        ctx.fillStyle = lin(ctx, X0, 0, X0 + R(0.05), 0, [0, 'rgba(25,10,4,.42)'], [1, 'rgba(25,10,4,0)']);
        ctx.fillRect(X0, Y0, R(0.05), R(CH));
      }
      if (c < COLS - 1 && B.h[c + 1] > i) {
        ctx.fillStyle = lin(ctx, X0 + R(CW), 0, X0 + R(CW - 0.03), 0, [0, 'rgba(25,10,4,.3)'], [1, 'rgba(25,10,4,0)']);
        ctx.fillRect(X0 + R(CW - 0.03), Y0, R(0.03), R(CH));
      }
    }
  }
}

/** 땅 위(1판: 하늘·풀밭·구경꾼) 또는 동굴 천장(2판부터: 등불·종유석) */
function drawSurface(ctx: C2, s: MoleState, w: number, vis: Vis) {
  const cam = s.cam, R = (v: number) => v * w, t = s.t;
  const yTop = yOfRow(cam, 0) - TOPF;
  if (yTop <= PLAY_Y0) return;
  const Y0 = R(PLAY_Y0), Y1 = R(yTop);
  if (s.stage === 0) {
    ctx.fillStyle = lin(ctx, 0, Y1 - R(0.4), 0, Y1, [0, '#6cc8ff'], [0.7, '#b8ecff'], [1, '#e8fbff']);
    ctx.fillRect(0, Y0, w, Y1 - Y0);
    // 해
    ctx.fillStyle = radg(ctx, R(0.84), Y1 - R(0.27), 0, R(0.16), [0, 'rgba(255,248,200,1)'], [0.35, 'rgba(255,236,150,.8)'], [1, 'rgba(255,236,150,0)']);
    ctx.fillRect(R(0.6), Y1 - R(0.45), R(0.4), R(0.4));
    ctx.fillStyle = '#fff3a8';
    ell(ctx, R(0.84), Y1 - R(0.27), R(0.045), R(0.045));
    ctx.fill();
    // 구름
    for (let k = 0; k < 3; k++) {
      const x = R(((0.15 + k * 0.36 + t * 0.00012 * (k + 1)) % 1.3) - 0.15), y = Y1 - R(0.3 - k * 0.05 + hsh(k) * 0.04);
      ctx.fillStyle = 'rgba(255,255,255,.95)';
      for (const [dx, dy, q] of [[-0.04, 0.008, 0.026], [0, -0.008, 0.034], [0.04, 0.006, 0.026], [0.018, 0.012, 0.024]]) (ell(ctx, x + R(dx), y + R(dy), R(q), R(q * 0.85)), ctx.fill());
    }
    // 먼 언덕
    ctx.fillStyle = '#9edb6c';
    ctx.beginPath();
    ctx.moveTo(0, Y1);
    for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(R(x), Y1 - R(0.07 + 0.025 * Math.sin(x * 6 + 1) + 0.012 * Math.sin(x * 15)));
    ctx.lineTo(w, Y1);
    ctx.fill();
    ctx.fillStyle = '#86cf58';
    ctx.beginPath();
    ctx.moveTo(0, Y1);
    for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(R(x), Y1 - R(0.035 + 0.015 * Math.sin(x * 9 + 3)));
    ctx.lineTo(w, Y1);
    ctx.fill();
    // 풀밭 위 구경꾼: 토끼와 참새
    const cheer = t - vis.cheer < 50, gasp = t - vis.gasp < 40;
    drawBunny(ctx, R(0.12), Y1 - R(0.008), R(0.06), t, cheer, gasp);
    drawBird(ctx, R(0.9), Y1 - R(0.004), R(0.04), t, cheer);
    // 풀 가장자리 (맨 윗줄 블록 위)
    ctx.fillStyle = '#62b843';
    ctx.fillRect(0, Y1 - R(0.006), w, R(0.012));
    for (let k = 0; k < 40; k++) {
      const x = R(k / 40 + hsh(k) * 0.02), hh = R(0.012 + hsh(k + 9) * 0.014);
      ctx.fillStyle = k % 3 ? '#6ccb48' : '#58b03a';
      ctx.beginPath();
      ctx.moveTo(x - R(0.006), Y1 + R(0.004));
      ctx.lineTo(x + Math.sin(t * 0.05 + k) * R(0.003), Y1 - hh);
      ctx.lineTo(x + R(0.006), Y1 + R(0.004));
      ctx.fill();
      if (k % 7 === 3) {
        ctx.fillStyle = k % 2 ? '#ffffff' : '#ffd84a';
        ell(ctx, x, Y1 - hh, R(0.006), R(0.006));
        ctx.fill();
      }
    }
  } else {
    // 동굴 천장
    ctx.fillStyle = lin(ctx, 0, Y0, 0, Y1, [0, '#4a3026'], [1, '#6e4a34']);
    ctx.fillRect(0, Y0, w, Y1 - Y0);
    for (let k = 0; k < 7; k++) {
      const x = R(0.05 + k * 0.15 + hsh(k + s.stage) * 0.05), len = R(0.05 + hsh(k * 3 + s.stage) * 0.08);
      const yy = Y1 - R(0.42) + R(hsh(k + 40) * 0.05);
      ctx.fillStyle = '#5a3c2e';
      ctx.beginPath();
      ctx.moveTo(x - R(0.025), yy);
      ctx.lineTo(x, yy + len);
      ctx.lineTo(x + R(0.025), yy);
      ctx.fill();
    }
    // 등불 둘
    for (const lx of [0.14, 0.86]) {
      const ly = Y1 - R(0.14), sw = Math.sin(t * 0.04 + lx * 9) * R(0.006);
      ctx.fillStyle = radg(ctx, R(lx) + sw, ly, 0, R(0.2), [0, 'rgba(255,214,120,.55)'], [1, 'rgba(255,214,120,0)']);
      ctx.fillRect(R(lx) - R(0.2), ly - R(0.2), R(0.4), R(0.4));
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = R(0.004);
      ctx.beginPath();
      ctx.moveTo(R(lx), Y1 - R(0.4));
      ctx.lineTo(R(lx) + sw, ly - R(0.02));
      ctx.stroke();
      ctx.fillStyle = '#ffd36a';
      rr(ctx, R(lx) + sw - R(0.015), ly - R(0.02), R(0.03), R(0.04), R(0.008));
      ctx.fill();
      ctx.strokeStyle = '#7a4a1a';
      ctx.lineWidth = R(0.004);
      ctx.stroke();
    }
    // 반딧불 버섯
    for (let k = 0; k < 4; k++) {
      const x = R(0.3 + k * 0.13), y = Y1 - R(0.01);
      ctx.fillStyle = '#e8d8c0';
      ctx.fillRect(x - R(0.003), y - R(0.02), R(0.006), R(0.02));
      ctx.fillStyle = radg(ctx, x, y - R(0.022), 0, R(0.02), [0, '#9dfcff'], [1, 'rgba(120,230,255,0)']);
      ell(ctx, x, y - R(0.022), R(0.02), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#7ad8f0';
      ell(ctx, x, y - R(0.022), R(0.012), R(0.007));
      ctx.fill();
    }
    ctx.fillStyle = '#5a3a28';
    ctx.fillRect(0, Y1 - R(0.004), w, R(0.008));
  }
}

function drawBunny(ctx: C2, x: number, y: number, r: number, t: number, cheer: boolean, gasp: boolean) {
  const hop = cheer ? Math.abs(Math.sin(t * 0.25)) * r * 0.5 : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.fillStyle = 'rgba(40,80,20,.25)';
  ell(ctx, 0, hop, r * 0.8, r * 0.18);
  ctx.fill();
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ell(ctx, sd * r * 0.25, -r * 1.55, r * 0.17, r * 0.5, sd * 0.15 + (gasp ? sd * 0.3 : 0));
    ctx.fill();
    ctx.strokeStyle = '#c9b8b0';
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
    ctx.fillStyle = '#ffb6c4';
    ell(ctx, sd * r * 0.25, -r * 1.5, r * 0.07, r * 0.32, sd * 0.15 + (gasp ? sd * 0.3 : 0));
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  ell(ctx, 0, -r * 0.45, r * 0.62, r * 0.5);
  ctx.fill();
  ctx.strokeStyle = '#c9b8b0';
  ctx.lineWidth = r * 0.06;
  ctx.stroke();
  ell(ctx, 0, -r * 0.95, r * 0.5, r * 0.42);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1a14';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * r * 0.2, -r * 1.0, r * (gasp ? 0.09 : 0.065), r * (gasp ? 0.11 : 0.08));
    ctx.fill();
  }
  ctx.fillStyle = '#ff8fa8';
  ell(ctx, 0, -r * 0.86, r * 0.07, r * 0.05);
  ctx.fill();
  if (gasp) {
    ctx.fillStyle = '#7a3a3a';
    ell(ctx, 0, -r * 0.72, r * 0.08, r * 0.1);
    ctx.fill();
  }
  ctx.restore();
}
function drawBird(ctx: C2, x: number, y: number, r: number, t: number, cheer: boolean) {
  const hop = cheer ? Math.abs(Math.sin(t * 0.3)) * r * 0.6 : Math.abs(Math.sin(t * 0.05)) < 0.08 ? r * 0.15 : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale(-1, 1);
  ctx.fillStyle = '#8a5a3a';
  ell(ctx, 0, -r * 0.6, r * 0.7, r * 0.55);
  ctx.fill();
  ctx.fillStyle = '#f2dcc0';
  ell(ctx, r * 0.15, -r * 0.45, r * 0.42, r * 0.35);
  ctx.fill();
  ctx.fillStyle = '#6a4028';
  ell(ctx, -r * 0.2, -r * 0.65, r * 0.4, r * 0.25, cheer ? -0.8 + Math.sin(t * 0.6) * 0.5 : -0.2);
  ctx.fill();
  ctx.fillStyle = '#ffb02a';
  ctx.beginPath();
  ctx.moveTo(r * 0.62, -r * 0.82);
  ctx.lineTo(r * 0.92, -r * 0.74);
  ctx.lineTo(r * 0.62, -r * 0.66);
  ctx.fill();
  ctx.fillStyle = '#1a1010';
  ell(ctx, r * 0.4, -r * 0.88, r * 0.07, r * 0.07);
  ctx.fill();
  ctx.restore();
}

/** 판 바닥: 금빛 보물층과 보물 상자 */
function drawFloor(ctx: C2, s: MoleState, w: number) {
  const B = s.B, R = (v: number) => v * w, t = s.t;
  const yF = yOfRow(s.cam, B.R);
  if (yF > PLAY_Y1) return;
  const Y = R(yF);
  ctx.fillStyle = lin(ctx, 0, Y, 0, Y + R(0.3), [0, '#c98a2a'], [0.25, '#a8661e'], [1, '#6e3e18']);
  ctx.fillRect(0, Y, w, R(0.4));
  for (let k = 0; k < 22; k++) {
    const x = R(hsh(k * 3 + 1)), y = Y + R(0.02 + hsh(k * 5 + 2) * 0.1);
    ctx.fillStyle = k % 4 === 0 ? '#ffe680' : k % 4 === 1 ? '#ffd23a' : k % 4 === 2 ? '#8ae8ff' : '#ff9ad0';
    if (k % 4 < 2) (ell(ctx, x, y, R(0.012), R(0.007)), ctx.fill());
    else (starPath(ctx, x, y, R(0.009)), ctx.fill());
  }
  ctx.fillStyle = 'rgba(255,240,180,.35)';
  ctx.fillRect(0, Y, w, R(0.006));
  // 보물 상자 (바닥 가운데, 깨면 열린다)
  const open = s.phase === 'clear' ? ease(s.pt / 30) : 0;
  const mx = molePos(s).x, side = mx < 0.5 ? 1 : -1;
  const bx = R(mx + side * 0.13), by = Y + R(0.075), bw = R(0.17), bh = R(0.085);
  ctx.fillStyle = radg(ctx, bx, by, 0, R(0.22), [0, `rgba(255,236,140,${0.35 + 0.2 * Math.sin(t * 0.1) + open * 0.4})`], [1, 'rgba(255,236,140,0)']);
  ctx.fillRect(bx - R(0.25), by - R(0.25), R(0.5), R(0.5));
  ctx.fillStyle = 'rgba(40,20,5,.35)';
  ell(ctx, bx, by + bh * 0.55, bw * 0.6, bh * 0.18);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, by - bh / 2, 0, by + bh / 2, [0, '#c4682a'], [1, '#8a4018']);
  rr(ctx, bx - bw / 2, by - bh * 0.15, bw, bh * 0.65, R(0.01));
  ctx.fill();
  ctx.strokeStyle = '#5a2a0e';
  ctx.lineWidth = R(0.005);
  ctx.stroke();
  // 뚜껑
  ctx.save();
  ctx.translate(bx, by - bh * 0.15);
  ctx.rotate(-open * 1.1);
  ctx.fillStyle = lin(ctx, 0, -bh * 0.5, 0, 0, [0, '#d8783a'], [1, '#a04e1e']);
  rr4(ctx, -bw / 2, -bh * 0.45, bw, bh * 0.45, R(0.03), R(0.03), 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.fillRect(-bw * 0.06, -bh * 0.45, bw * 0.12, bh * 0.45);
  ctx.restore();
  ctx.fillStyle = '#ffd23a';
  for (const sd of [-0.32, 0.32]) ctx.fillRect(bx + bw * sd - bw * 0.04, by - bh * 0.15, bw * 0.08, bh * 0.65);
  ctx.fillStyle = '#fff0a0';
  rr(ctx, bx - bw * 0.07, by - bh * 0.12, bw * 0.14, bh * 0.2, R(0.005));
  ctx.fill();
  if (open > 0) {
    ctx.fillStyle = radg(ctx, bx, by - bh * 0.2, 0, R(0.14), [0, 'rgba(255,250,200,.95)'], [1, 'rgba(255,240,150,0)']);
    ell(ctx, bx, by - bh * 0.25, R(0.14) * open, R(0.12) * open);
    ctx.fill();
    for (let k = 0; k < 6; k++) {
      const a = -Math.PI / 2 + (k - 2.5) * 0.35, d = R(0.05 + 0.1 * ease((s.pt - 10 - k * 3) / 30));
      if (s.pt < 10 + k * 3) continue;
      ctx.fillStyle = k % 2 ? '#ffd23a' : '#8ae8ff';
      ell(ctx, bx + Math.cos(a) * d, by - bh * 0.3 + Math.sin(a) * d, R(0.012), R(0.012));
      ctx.fill();
    }
  }
}

/** 블록들 (아래 줄부터 — 위 블록이 아래 블록의 윗면을 덮는다) */
function drawBlocks(ctx: C2, s: MoleState, w: number) {
  const B = s.B, cam = s.cam, t = s.t;
  const fallU = s.phase === 'fall' ? clamp(s.pt / Math.max(1, s.pdur), 0, 1) : 1;
  const popU = s.phase === 'pop' ? clamp(s.pt / Math.max(1, s.pdur), 0, 1) : 0;
  const popSet = new Set(s.phase === 'pop' ? s.popList : []);
  const off = (j: number) => (fallU < 1 ? s.fall[j] * (1 - fallU * fallU) : 0);
  // 지금 톡 할 수 있는 덩어리: 크기 (2개 넘는 덩어리는 살짝 들썩인다)
  const gsize = new Uint8Array(COLS * RM);
  if (s.phase === 'play') {
    const seen = new Uint8Array(COLS * RM);
    for (let j = 0; j < COLS * RM; j++) {
      const c = (j / RM) | 0, i = j % RM;
      if (i >= B.h[c] || seen[j] || !isDirt(B.g[j])) continue;
      const grp = flood(B, j, seen);
      for (const q of grp) gsize[q] = Math.min(255, grp.length);
    }
  }
  const landAge = t - s.fallEnd;
  for (let c = 0; c < COLS; c++) {
    for (let i = 0; i < B.h[c]; i++) {
      const j = idx(c, i), v = B.g[j], r = rowOf(B, i);
      const yv = yOfRow(cam, r) - off(j) * CH;
      if (yv > PLAY_Y1 + 0.02 || yv + CH < PLAY_Y0 - TOPF) continue;
      const same = (c2: number, i2: number) => {
        if (c2 < 0 || c2 >= COLS || i2 < 0 || i2 >= B.h[c2]) return false;
        const j2 = idx(c2, i2), v2 = B.g[j2];
        return isDirt(v) && isDirt(v2) && colOf(v2) === colOf(v) && Math.abs(off(j2) - off(j)) < 0.05 && popSet.has(j2) === popSet.has(j);
      };
      const L = same(c - 1, i), Rt = same(c + 1, i), U = same(c, i + 1), D = same(c, i - 1);
      const above = i + 1 < B.h[c] && Math.abs(off(idx(c, i + 1)) - off(j)) < 0.3;
      let bob = 0;
      if (s.phase === 'play' && gsize[j] >= 2) bob = Math.sin(t * 0.09 + c * 0.7 + r * 0.9) * 0.003 * Math.min(3, gsize[j]);
      let sq = 1;
      if (landAge >= 0 && landAge < 10 && s.moved[j]) sq = 1 - 0.08 * Math.sin((landAge / 10) * Math.PI);
      const popping = popSet.has(j);
      drawBlock(ctx, w, v, c * CW, yv + bob, { L, R: Rt, U, D, top: !above, sq, pop: popping ? popU : 0, t, seed: (v >> 12) & 255 });
    }
  }
}

interface BOpt { L: boolean; R: boolean; U: boolean; D: boolean; top: boolean; sq: number; pop: number; t: number; seed: number }
function drawBlock(ctx: C2, w: number, v: number, x: number, y: number, o: BOpt) {
  const R = (q: number) => q * w;
  const gap = 0.006, rad = 0.032;
  let x0 = x + (o.L ? 0 : gap), x1 = x + CW - (o.R ? 0 : gap), y0 = y + (o.U ? 0 : gap), y1 = y + CH - (o.D ? 0 : gap * 0.5);
  if (o.sq !== 1) y0 = y1 - (y1 - y0) * o.sq;
  ctx.save();
  if (o.pop > 0) {
    const k = 1 + 0.22 * Math.sin(o.pop * Math.PI * 0.9) + o.pop * 0.08;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    ctx.translate(R(mx), R(my));
    ctx.rotate(Math.sin(o.pop * 30) * 0.06 * o.pop);
    ctx.scale(k, k);
    ctx.translate(-R(mx), -R(my));
  }
  const X0 = R(x0), X1 = R(x1), Y0 = R(y0), Y1 = R(y1), W = X1 - X0, H = Y1 - Y0;
  const tl = !o.L && !o.U ? R(rad) : 0, tr = !o.R && !o.U ? R(rad) : 0, br = !o.R && !o.D ? R(rad) : 0, bl = !o.L && !o.D ? R(rad) : 0;
  if (v & BUB) {
    // 공기 방울: 흙 속 빈 구멍 + 동글동글 흔들리는 방울
    ctx.fillStyle = 'rgba(30,14,6,.45)';
    rr(ctx, X0 + R(0.008), Y0 + R(0.006), W - R(0.016), H - R(0.01), R(0.05));
    ctx.fill();
    const bx = (X0 + X1) / 2, by = (Y0 + Y1) / 2, wob = Math.sin(o.t * 0.12 + o.seed) * 0.06, br2 = R(0.062);
    ctx.fillStyle = radg(ctx, bx - br2 * 0.3, by - br2 * 0.3, br2 * 0.1, br2 * 1.1, [0, 'rgba(255,255,255,.95)'], [0.35, 'rgba(190,240,255,.75)'], [1, 'rgba(110,200,240,.55)']);
    ell(ctx, bx, by, br2 * (1 + wob), br2 * (1 - wob));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = R(0.005);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, bx - br2 * 0.35, by - br2 * 0.4, br2 * 0.22, br2 * 0.14, -0.6);
    ctx.fill();
    ell(ctx, bx + br2 * 0.42, by + br2 * 0.1, br2 * 0.07, br2 * 0.07);
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const ph = (o.t * 0.02 + k * 0.5 + o.seed * 0.01) % 1;
      ctx.globalAlpha = 1 - ph;
      ell(ctx, bx + R(0.03) * (k ? 1 : -1), by - br2 - R(0.04) * ph, R(0.008), R(0.008));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (o.pop) (ctx.fillStyle = `rgba(255,255,255,${o.pop * 0.8})`), ell(ctx, bx, by, br2 * 1.2, br2 * 1.2), ctx.fill();
    ctx.restore();
    return;
  }
  const m = v & ROCK ? ROCKM : PAL[colOf(v)];
  // 테두리(어두운 선) → 앞면
  ctx.fillStyle = m.line;
  rr4(ctx, X0 - 1, Y0 - 1, W + 2, H + 2, tl + 1, tr + 1, br + 1, bl + 1);
  ctx.fill();
  if (v & ROCK) {
    ctx.fillStyle = lin(ctx, 0, Y0, 0, Y1, [0, m.light], [0.35, m.base], [1, m.dark]);
    rr4(ctx, X0, Y0, W, H, tl * 1.4, tr * 1.4, br * 1.4, bl * 1.4);
    ctx.fill();
    // 돌 결
    ctx.fillStyle = 'rgba(60,64,72,.28)';
    for (let k = 0; k < 4; k++) (ell(ctx, X0 + W * hsh(o.seed + k), Y0 + H * (0.3 + 0.6 * hsh(o.seed * 3 + k)), R(0.012 + 0.01 * hsh(k + o.seed)), R(0.008)), ctx.fill());
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ell(ctx, X0 + W * 0.3, Y0 + H * 0.25, W * 0.2, H * 0.1, -0.2);
    ctx.fill();
    // 단단해 표시: 굵은 테
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = R(0.004);
    rr(ctx, X0 + R(0.012), Y0 + R(0.012), W - R(0.024), H - R(0.024), R(0.02));
    ctx.stroke();
    if (v & CRACK) {
      ctx.strokeStyle = '#2a2d33';
      ctx.lineWidth = R(0.006);
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(X0 + W * 0.5, Y0 + H * 0.05);
      ctx.lineTo(X0 + W * 0.42, Y0 + H * 0.35);
      ctx.lineTo(X0 + W * 0.58, Y0 + H * 0.52);
      ctx.lineTo(X0 + W * 0.46, Y0 + H * 0.95);
      ctx.moveTo(X0 + W * 0.58, Y0 + H * 0.52);
      ctx.lineTo(X0 + W * 0.85, Y0 + H * 0.62);
      ctx.moveTo(X0 + W * 0.42, Y0 + H * 0.35);
      ctx.lineTo(X0 + W * 0.15, Y0 + H * 0.3);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = lin(ctx, 0, Y0, 0, Y1, [0, m.light], [0.28, m.base], [0.85, m.base], [1, m.dark]);
    rr4(ctx, X0, Y0, W, H, tl, tr, br, bl);
    ctx.fill();
    // 이음매 (같은 덩어리 안에서 칸이 보이게, 아주 옅게)
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.lineWidth = 1;
    if (o.L) (ctx.beginPath(), ctx.moveTo(X0 + 0.5, Y0 + H * 0.2), ctx.lineTo(X0 + 0.5, Y1 - H * 0.2), ctx.stroke());
    if (o.D) (ctx.beginPath(), ctx.moveTo(X0 + W * 0.2, Y1 - 0.5), ctx.lineTo(X1 - W * 0.2, Y1 - 0.5), ctx.stroke());
    texture(ctx, w, colOf(v), X0, Y0, W, H, o.seed, m);
    // 빛
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    ell(ctx, X0 + W * 0.28, Y0 + H * 0.22, W * 0.17, H * 0.09, -0.25);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    if (!o.D) ctx.fillRect(X0 + bl * 0.6, Y1 - R(0.012), W - (bl + br) * 0.6, R(0.012));
  }
  // 윗면 (3/4 시점: 위가 비어 있으면 보인다)
  if (o.top) {
    const th = R(TOPF);
    ctx.fillStyle = m.line;
    rr4(ctx, X0 - 1, Y0 - th - 1, W + 2, th + R(0.012), R(0.02), R(0.02), 0, 0);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, Y0 - th, 0, Y0, [0, m.top], [1, m.light]);
    rr4(ctx, X0, Y0 - th, W, th + R(0.004), R(0.02), R(0.02), 0, 0);
    ctx.fill();
    if (!(v & ROCK) && colOf(v) === 2) {
      // 이끼 풀
      ctx.fillStyle = '#4fae36';
      for (let k = 0; k < 5; k++) {
        const gx = X0 + W * (0.12 + k * 0.19), gh = R(0.012 + 0.008 * hsh(o.seed + k));
        ctx.beginPath();
        ctx.moveTo(gx - R(0.006), Y0 - th * 0.3);
        ctx.lineTo(gx, Y0 - th * 0.3 - gh);
        ctx.lineTo(gx + R(0.006), Y0 - th * 0.3);
        ctx.fill();
      }
    }
  }
  // 특수: 보석 · 폭탄 · 드릴
  const mx = (X0 + X1) / 2, my = (Y0 + Y1) / 2;
  if (isDirt(v) && v & GEM) drawGem(ctx, w, mx, my, o.t, o.seed);
  if (isDirt(v) && v & BOMB) drawBomb(ctx, w, mx, my + R(0.006), o.t);
  if (isDirt(v) && v & DRILL) drawDrillBit(ctx, w, mx, my, o.t);
  if (o.pop > 0) {
    ctx.fillStyle = `rgba(255,255,255,${Math.min(0.85, o.pop * 1.1)})`;
    rr4(ctx, X0, Y0, W, H, tl, tr, br, bl);
    ctx.fill();
  }
  ctx.restore();
}
function texture(ctx: C2, w: number, col: number, X0: number, Y0: number, W: number, H: number, seed: number, m: Mat) {
  const R = (q: number) => q * w;
  const rx = (k: number) => X0 + W * (0.12 + 0.76 * hsh(seed * 7 + k)), ry = (k: number) => Y0 + H * (0.3 + 0.6 * hsh(seed * 13 + k * 3));
  // 흙 알갱이 (모든 흙에 옅게)
  ctx.fillStyle = 'rgba(70,35,10,.16)';
  for (let k = 0; k < 6; k++) ctx.fillRect(X0 + W * (0.08 + 0.84 * hsh(seed * 3 + k * 5 + 40)), Y0 + H * (0.18 + 0.75 * hsh(seed * 11 + k * 7 + 41)), R(0.005), R(0.004));
  if (col === 0) {
    // 진흙: 자갈 몇 개
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k ? 'rgba(255,214,190,.45)' : 'rgba(120,40,20,.3)';
      ell(ctx, rx(k), ry(k), R(0.011 + 0.006 * hsh(seed + k)), R(0.008));
      ctx.fill();
    }
  } else if (col === 1) {
    // 모래: 점점이
    ctx.fillStyle = 'rgba(150,100,20,.35)';
    for (let k = 0; k < 7; k++) (ell(ctx, rx(k), ry(k), R(0.004), R(0.004)), ctx.fill());
  } else if (col === 2) {
    // 이끼: 잎 무늬
    ctx.fillStyle = 'rgba(220,255,190,.45)';
    for (let k = 0; k < 3; k++) (ell(ctx, rx(k), ry(k), R(0.012), R(0.006), hsh(k + seed) * 3), ctx.fill());
  } else if (col === 3) {
    // 점토: 물결 줄
    ctx.strokeStyle = 'rgba(220,240,255,.45)';
    ctx.lineWidth = R(0.004);
    for (let k = 0; k < 2; k++) {
      const yy = Y0 + H * (0.45 + k * 0.25);
      ctx.beginPath();
      for (let q = 0; q <= 6; q++) {
        const xx = X0 + W * (0.15 + q * 0.12), dy = (q % 2 ? -1 : 1) * R(0.006);
        q ? ctx.lineTo(xx, yy + dy) : ctx.moveTo(xx, yy + dy);
      }
      ctx.stroke();
    }
  } else {
    // 수정: 반짝 조각
    ctx.fillStyle = 'rgba(255,240,255,.55)';
    for (let k = 0; k < 3; k++) {
      const x = rx(k), y = ry(k), q = R(0.01);
      ctx.beginPath();
      ctx.moveTo(x, y - q);
      ctx.lineTo(x + q * 0.6, y);
      ctx.lineTo(x, y + q);
      ctx.lineTo(x - q * 0.6, y);
      ctx.fill();
    }
  }
  void m;
}
function drawGem(ctx: C2, w: number, x: number, y: number, t: number, seed: number) {
  const R = (q: number) => q * w, r = R(0.04);
  ctx.fillStyle = 'rgba(40,10,40,.3)';
  ell(ctx, x, y + r * 0.9, r * 0.9, r * 0.3);
  ctx.fill();
  ctx.fillStyle = radg(ctx, x, y, 0, r * 2, [0, 'rgba(255,220,255,.6)'], [1, 'rgba(255,220,255,0)']);
  ell(ctx, x, y, r * 2, r * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.3);
  ctx.lineTo(x - r * 0.5, y - r * 0.8);
  ctx.lineTo(x + r * 0.5, y - r * 0.8);
  ctx.lineTo(x + r, y - r * 0.3);
  ctx.lineTo(x, y + r);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [0, '#ffd0f4'], [0.5, '#ff5fc8'], [1, '#b0208a']);
  ctx.fill();
  ctx.strokeStyle = '#6a0a50';
  ctx.lineWidth = R(0.004);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.8);
  ctx.lineTo(x - r * 0.15, y - r * 0.3);
  ctx.lineTo(x - r, y - r * 0.3);
  ctx.fill();
  const tw = Math.max(0, Math.sin(t * 0.09 + seed));
  if (tw > 0.6) {
    ctx.fillStyle = '#ffffff';
    starPath(ctx, x + r * 0.55, y - r * 0.6, r * 0.45 * (tw - 0.6) * 2.5);
    ctx.fill();
  }
}
function drawBomb(ctx: C2, w: number, x: number, y: number, t: number) {
  const R = (q: number) => q * w, r = R(0.038);
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.3, 0, r * 1.2, [0, '#6a6a7a'], [1, '#14141c']);
  ell(ctx, x, y, r, r);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = R(0.004);
  ctx.stroke();
  ctx.fillStyle = '#3a3a44';
  ctx.fillRect(x + r * 0.2, y - r * 1.15, r * 0.5, r * 0.35);
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = R(0.005);
  ctx.beginPath();
  ctx.moveTo(x + r * 0.45, y - r * 1.15);
  ctx.quadraticCurveTo(x + r * 0.9, y - r * 1.7, x + r * 1.2, y - r * 1.4);
  ctx.stroke();
  const sp = 0.7 + 0.3 * Math.sin(t * 0.5);
  ctx.fillStyle = radg(ctx, x + r * 1.2, y - r * 1.4, 0, r * 0.7 * sp, [0, '#ffffff'], [0.4, '#ffe05a'], [1, 'rgba(255,120,40,0)']);
  ell(ctx, x + r * 1.2, y - r * 1.4, r * 0.7 * sp, r * 0.7 * sp);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ell(ctx, x - r * 0.35, y - r * 0.35, r * 0.25, r * 0.18, -0.6);
  ctx.fill();
}
function drawDrillBit(ctx: C2, w: number, x: number, y: number, t: number) {
  const R = (q: number) => q * w, r = R(0.04);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#ffcf3a';
  rr(ctx, -r * 0.8, -r * 1.2, r * 1.6, r * 0.6, r * 0.2);
  ctx.fill();
  ctx.strokeStyle = '#6a4a08';
  ctx.lineWidth = R(0.004);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.75, -r * 0.6);
  ctx.lineTo(r * 0.75, -r * 0.6);
  ctx.lineTo(0, r * 1.25);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -r, 0, r, 0, [0, '#8a96a8'], [0.45, '#f2f6fa'], [1, '#6a7688']);
  ctx.fill();
  ctx.strokeStyle = '#3a4250';
  ctx.stroke();
  ctx.strokeStyle = 'rgba(40,50,60,.6)';
  ctx.lineWidth = R(0.004);
  const ph = (t * 0.15) % 1;
  for (let k = 0; k < 3; k++) {
    const yy = -r * 0.5 + (k + ph) * r * 0.55, hw = r * 0.75 * (1 - (yy + r * 0.6) / (r * 1.85));
    ctx.beginPath();
    ctx.moveTo(-hw, yy);
    ctx.lineTo(hw, yy + r * 0.18);
    ctx.stroke();
  }
  ctx.restore();
}

/** 지렁이 구경꾼: 두더지 가까운 빈칸 뒷벽에서 고개를 내민다 */
function drawWorm(ctx: C2, s: MoleState, w: number, vis: Vis) {
  const B = s.B, R = (q: number) => q * w, t = s.t;
  const ok = (c: number, r: number) => {
    const i = B.R - 1 - r;
    if (r < 0 || i < 0 || c < 0 || c >= COLS) return false;
    if (i < B.h[c]) return false;
    if (c === B.mc && Math.abs(r - moleRow(B)) < 1.5) return false;
    const y = yOfRow(s.cam, r);
    return y > PLAY_Y0 + 0.02 && y + CH < PLAY_Y1 - 0.02;
  };
  if (s.phase === 'play' && (!vis.worm || !ok(vis.worm.c, vis.worm.r))) {
    vis.worm = null;
    const mr = moleRow(B);
    let best = 99;
    for (let r = mr - 3; r <= mr + 1; r++) for (let c = 0; c < COLS; c++) {
      if (!ok(c, r)) continue;
      const d = Math.abs(c - B.mc) * 1.2 + Math.abs(r - mr) + (c === B.mc ? 2 : 0);
      if (d < best) (best = d), (vis.worm = { c, r, t });
    }
  }
  const wm = vis.worm;
  if (!wm) return;
  const x = R((wm.c + 0.5) * CW), y = R(yOfRow(s.cam, wm.r) + CH * 0.62), age = t - wm.t;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1.35, 1.35);
  ctx.translate(-x, -y);
  const out = ease(age / 18), cheer = t - vis.cheer < 50, gasp = t - vis.gasp < 40;
  // 구멍
  ctx.fillStyle = '#2a140a';
  ell(ctx, x, y + R(0.03), R(0.045), R(0.022));
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - R(0.1), y - R(0.2), R(0.2), R(0.23));
  ctx.clip();
  const sway = cheer ? Math.sin(t * 0.4) * 0.25 : Math.sin(t * 0.06) * 0.12;
  const len = R(0.075) * out * (cheer ? 1.15 : 1);
  ctx.strokeStyle = '#e88a8a';
  ctx.lineWidth = R(0.032);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y + R(0.035));
  const hx = x + Math.sin(sway) * len, hy = y + R(0.03) - Math.cos(sway) * len;
  ctx.quadraticCurveTo(x + Math.sin(sway) * len * 0.2 - R(0.012), (y + hy) / 2, hx, hy);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,60,60,.5)';
  ctx.lineWidth = R(0.004);
  for (let k = 1; k <= 2; k++) {
    const q = k / 3, px = x + (hx - x) * q, py = y + R(0.035) + (hy - y - R(0.035)) * q;
    ctx.beginPath();
    ctx.moveTo(px - R(0.015), py);
    ctx.lineTo(px + R(0.015), py);
    ctx.stroke();
  }
  ctx.fillStyle = '#f2a0a0';
  ell(ctx, hx, hy, R(0.02), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const sd of [-1, 1]) {
    ell(ctx, hx + sd * R(0.008), hy - R(0.004), R(gasp ? 0.008 : 0.006), R(gasp ? 0.009 : 0.007));
    ctx.fill();
  }
  ctx.fillStyle = '#1a0a0a';
  for (const sd of [-1, 1]) {
    ell(ctx, hx + sd * R(0.008), hy - R(0.003), R(0.0035), R(0.004));
    ctx.fill();
  }
  ctx.strokeStyle = '#9a3a3a';
  ctx.lineWidth = R(0.003);
  ctx.beginPath();
  if (gasp) ell(ctx, hx, hy + R(0.009), R(0.004), R(0.005));
  else ctx.arc(hx, hy + R(0.005), R(0.006), 0.2, Math.PI - 0.2);
  ctx.stroke();
  ctx.restore();
  if (cheer && age > 10) {
    ctx.fillStyle = '#fff8e0';
    ctx.strokeStyle = 'rgba(60,20,0,.6)';
    ctx.lineWidth = 3;
    ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.strokeText(t % 40 < 20 ? '우와!' : '와아!', hx, hy - R(0.035));
    ctx.fillText(t % 40 < 20 ? '우와!' : '와아!', hx, hy - R(0.035));
  }
  ctx.restore();
}

/** 두더지 광부 (발 밑이 x,y) */
function drawMole(ctx: C2, s: MoleState, x: number, y: number, size: number, mp: { air: number; tilt: number; spin: number }, vis: Vis) {
  const t = s.t, r = size / 2;
  let face: Face = s.face;
  if (s.phase === 'fall' && mp.air) face = 'scared';
  if (s.phase === 'roll') face = 'scared';
  if (face === 'scared' && s.phase === 'play' && t - s.faceT > 40) face = 'idle';
  if ((face === 'happy' || face === 'push' || face === 'dizzy') && s.phase === 'play' && t - s.faceT > 90) face = 'idle';
  const landAge = t - s.fallEnd;
  let sqx = 1, sqy = 1;
  if (landAge >= 0 && landAge < 12 && s.phase !== 'fall') {
    const k = Math.sin((landAge / 12) * Math.PI) * 0.22;
    (sqx = 1 + k), (sqy = 1 - k);
  }
  const breathe = Math.sin(t * 0.08) * 0.025;
  if (face === 'scared') (sqx *= 0.92), (sqy *= 1.1);
  ctx.save();
  ctx.translate(x, y);
  // 그림자
  ctx.fillStyle = 'rgba(20,8,2,.35)';
  ell(ctx, 0, 0, r * 0.95, r * 0.22);
  ctx.fill();
  if (mp.spin) ctx.translate(0, -r);
  ctx.rotate(mp.tilt);
  if (mp.spin) ctx.translate(0, r);
  ctx.scale(sqx, sqy * (1 + breathe));
  const lamp = face !== 'sad';
  // 헤드램프 빛
  if (lamp) {
    ctx.fillStyle = radg(ctx, 0, -r * 1.75, 0, r * 2.4, [0, 'rgba(255,248,190,.28)'], [1, 'rgba(255,248,190,0)']);
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.75);
    ctx.lineTo(-r * 1.6, r * 0.5);
    ctx.lineTo(r * 1.6, r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  // 발
  ctx.fillStyle = '#ffb8a4';
  for (const sd of [-1, 1]) (ell(ctx, sd * r * 0.42, -r * 0.08, r * 0.26, r * 0.13), ctx.fill());
  // 몸
  ctx.fillStyle = lin(ctx, 0, -r * 1.9, 0, 0, [0, '#8e7266'], [0.6, '#6e564c'], [1, '#56423a']);
  ctx.beginPath();
  ctx.moveTo(-r * 0.86, -r * 0.2);
  ctx.bezierCurveTo(-r * 1.0, -r * 1.2, -r * 0.6, -r * 1.85, 0, -r * 1.85);
  ctx.bezierCurveTo(r * 0.6, -r * 1.85, r * 1.0, -r * 1.2, r * 0.86, -r * 0.2);
  ctx.quadraticCurveTo(0, r * 0.08, -r * 0.86, -r * 0.2);
  ctx.fill();
  ctx.strokeStyle = '#3a2820';
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.stroke();
  // 배
  ctx.fillStyle = '#e2c2b0';
  ell(ctx, 0, -r * 0.62, r * 0.52, r * 0.5);
  ctx.fill();
  // 팔 (큰 분홍 발톱 손)
  const arm = (sd: number, ang: number, lift: number) => {
    ctx.save();
    ctx.translate(sd * r * 0.72, -r * (0.75 + lift));
    ctx.rotate(sd * ang);
    ctx.fillStyle = '#6e564c';
    ell(ctx, sd * r * 0.12, 0, r * 0.22, r * 0.17);
    ctx.fill();
    ctx.fillStyle = '#ffb8a4';
    ell(ctx, sd * r * 0.32, -r * 0.02, r * 0.24, r * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#b8705c';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#fff6ee';
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.45, -r * 0.02 + k * r * 0.11 - r * 0.04);
      ctx.lineTo(sd * r * 0.68, -r * 0.02 + k * r * 0.13);
      ctx.lineTo(sd * r * 0.45, -r * 0.02 + k * r * 0.11 + r * 0.04);
      ctx.fill();
    }
    ctx.restore();
  };
  if (face === 'scared') (arm(-1, -1.2 + Math.sin(t * 0.7) * 0.25, 0.55), arm(1, -1.2 + Math.cos(t * 0.7) * 0.25, 0.55));
  else if (face === 'happy') (arm(-1, -1.0 + Math.sin(t * 0.4) * 0.3, 0.6), arm(1, -1.0 - Math.sin(t * 0.4) * 0.3, 0.6));
  else if (face === 'push') (arm(-1, 0.6 + Math.sin(t * 0.9) * 0.2, 0.05), arm(1, 0.6 - Math.sin(t * 0.9) * 0.2, 0.05));
  else if (face === 'sad') (arm(-1, 0.9, -0.15), arm(1, 0.9, -0.15));
  else (arm(-1, 0.25 + Math.sin(t * 0.08) * 0.08, 0), arm(1, 0.25 - Math.sin(t * 0.08) * 0.08, 0));
  // 얼굴
  const fy = -r * 1.22;
  // 볼
  ctx.fillStyle = 'rgba(255,140,150,.45)';
  for (const sd of [-1, 1]) (ell(ctx, sd * r * 0.42, fy + r * 0.2, r * 0.13, r * 0.08), ctx.fill());
  // 눈
  const blink = t % 170 < 6 && face === 'idle';
  ctx.strokeStyle = '#1a0e0a';
  ctx.fillStyle = '#1a0e0a';
  ctx.lineWidth = Math.max(1.4, r * 0.08);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const ex = sd * r * 0.27, ey = fy;
    if (face === 'scared') {
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex, ey, r * 0.17, r * 0.2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1a0e0a';
      ell(ctx, ex, ey + r * 0.03, r * 0.07, r * 0.08);
      ctx.fill();
    } else if (face === 'happy' || face === 'proud') {
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.05, r * 0.11, Math.PI + 0.3, -0.3);
      ctx.stroke();
    } else if (face === 'dizzy') {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) {
        const q = r * 0.015 * a;
        a ? ctx.lineTo(ex + Math.cos(a + t * 0.3) * q, ey + Math.sin(a + t * 0.3) * q) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
    } else if (face === 'sad') {
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.1, ey - sd * r * 0.03);
      ctx.lineTo(ex + r * 0.1, ey + sd * r * 0.03);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - r * 0.08, ey);
      ctx.lineTo(ex + r * 0.08, ey);
      ctx.stroke();
    } else {
      ell(ctx, ex, ey, r * 0.075, r * 0.09);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex + r * 0.025, ey - r * 0.035, r * 0.028, r * 0.028);
      ctx.fill();
      ctx.fillStyle = '#1a0e0a';
    }
  }
  // 코 (분홍 긴 코)
  ctx.fillStyle = lin(ctx, 0, fy + r * 0.08, 0, fy + r * 0.42, [0, '#ffb0c0'], [1, '#ff6f8e']);
  ell(ctx, 0, fy + r * 0.25, r * 0.21, r * 0.16);
  ctx.fill();
  ctx.strokeStyle = '#c03a5a';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, -r * 0.06, fy + r * 0.19, r * 0.06, r * 0.035);
  ctx.fill();
  // 수염
  ctx.strokeStyle = 'rgba(40,24,18,.7)';
  ctx.lineWidth = Math.max(0.8, r * 0.025);
  for (const sd of [-1, 1]) for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.moveTo(sd * r * 0.2, fy + r * 0.28 + k * r * 0.05);
    ctx.lineTo(sd * r * 0.55, fy + r * 0.24 + k * r * 0.11);
    ctx.stroke();
  }
  // 입
  ctx.strokeStyle = '#3a1a14';
  ctx.lineWidth = Math.max(1.2, r * 0.05);
  const my = fy + r * 0.5;
  if (face === 'scared' || face === 'push') {
    ctx.fillStyle = '#7a2a2a';
    ell(ctx, 0, my + r * 0.04, r * 0.11, r * (face === 'push' ? 0.06 : 0.12));
    ctx.fill();
  } else if (face === 'happy') {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.arc(0, my - r * 0.02, r * 0.14, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.06, my - r * 0.02, r * 0.12, r * 0.06);
  } else if (face === 'sad') {
    ctx.beginPath();
    ctx.arc(0, my + r * 0.1, r * 0.09, Math.PI + 0.4, -0.4);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, my - r * 0.04, r * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.045, my + r * 0.02, r * 0.09, r * 0.06);
  }
  // 헬멧
  const hy = -r * 1.62;
  ctx.fillStyle = lin(ctx, 0, hy - r * 0.45, 0, hy + r * 0.1, [0, '#ffe680'], [1, '#f2a91c']);
  ctx.beginPath();
  ctx.ellipse(0, hy, r * 0.72, r * 0.5, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a5a08';
  ctx.lineWidth = Math.max(1.2, r * 0.06);
  ctx.stroke();
  ctx.fillStyle = '#f2a91c';
  rr(ctx, -r * 0.88, hy - r * 0.04, r * 1.76, r * 0.16, r * 0.08);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.beginPath();
  ctx.ellipse(0, hy, r * 0.5, r * 0.32, 0, Math.PI + 0.5, -0.9);
  ctx.stroke();
  // 램프
  ctx.fillStyle = '#5a5a66';
  ell(ctx, 0, hy - r * 0.2, r * 0.2, r * 0.17);
  ctx.fill();
  ctx.fillStyle = lamp ? radg(ctx, 0, hy - r * 0.2, 0, r * 0.14, [0, '#ffffff'], [1, '#fff2a0']) : '#a0a0a0';
  ell(ctx, 0, hy - r * 0.2, r * 0.13, r * 0.11);
  ctx.fill();
  if (face === 'dizzy') {
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillStyle = '#ffe14a';
      starPath(ctx, Math.cos(a) * r * 0.7, hy - r * 0.55 + Math.sin(a) * r * 0.15, r * 0.14);
      ctx.fill();
    }
  }
  if (face === 'scared') {
    ctx.fillStyle = '#9adfff';
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 1.55);
    ctx.quadraticCurveTo(r * 0.9, -r * 1.3, r * 0.78, -r * 1.25);
    ctx.quadraticCurveTo(r * 0.64, -r * 1.3, r * 0.75, -r * 1.55);
    ctx.fill();
  }
  if (face === 'sad') {
    ctx.fillStyle = '#9adfff';
    for (const sd of [-1, 1]) (ell(ctx, sd * r * 0.3, fy + r * 0.2 + ((t * 0.6) % (r * 0.5)), r * 0.05, r * 0.07), ctx.fill());
  }
  ctx.restore();
  void vis;
}

function drawSay(ctx: C2, s: MoleState, w: number, mp: { x: number; y: number }, font: (sz: number, wgt?: number) => void) {
  const age = s.t - s.sayT;
  if (!s.say || age > 70) return;
  const R = (q: number) => q * w, a = Math.min(1, age / 5, (70 - age) / 12);
  font(0.04, 900);
  const tw = ctx.measureText(s.say).width + R(0.04), th = R(0.058);
  const bx = clamp(R(mp.x) + R(0.11), tw / 2 + 4, w - tw / 2 - 4), by = Math.max(R(PLAY_Y0) + th, R(mp.y) - R(0.2) - Math.min(1, age / 6) * R(0.02));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, bx - tw / 2 + 2, by - th / 2 + 3, tw, th, th / 2);
  ctx.fill();
  ctx.fillStyle = '#fffdf4';
  rr(ctx, bx - tw / 2, by - th / 2, tw, th, th / 2);
  ctx.fill();
  ctx.strokeStyle = '#6a3a14';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fffdf4';
  ctx.beginPath();
  ctx.moveTo(bx - tw * 0.3, by + th / 2 - 1);
  ctx.lineTo(R(mp.x) + R(0.02), by + th / 2 + R(0.03));
  ctx.lineTo(bx - tw * 0.12, by + th / 2 - 1);
  ctx.fill();
  ctx.fillStyle = '#4a2410';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s.say, bx, by + 1);
  ctx.restore();
}

/** 큰 순간 띠: 와르르 · 연쇄 · 쾅 · 드릴 · 쑥 · 보물 */
function drawBig(ctx: C2, s: MoleState, w: number, mp: { x: number; y: number }, font: (sz: number, wgt?: number) => void) {
  const age = s.t - s.bigT;
  if (age > 75 || !s.bigText) return;
  const R = (q: number) => q * w;
  const pop = age < 8 ? 0.4 + 1.0 * ease(age / 8) + 0.25 * Math.sin((age / 8) * Math.PI) : 1;
  const a = Math.min(1, (75 - age) / 15);
  // 두더지를 가리지 않게: 두더지가 위쪽이면 밑(터지는 흙 위)에, 아래쪽이면 위에
  const up = mp.y > PLAY_Y0 + (PLAY_Y1 - PLAY_Y0) * 0.55;
  const y = clamp(R(mp.y + (up ? -0.34 : 0.2)), R(PLAY_Y0 + 0.07), R(PLAY_Y1 - 0.08));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(w / 2, y);
  ctx.rotate(-0.04);
  ctx.scale(pop, pop);
  font(0.074, 900);
  const tw = ctx.measureText(s.bigText).width;
  ctx.fillStyle = 'rgba(80,30,0,.35)';
  rr(ctx, -tw / 2 - R(0.05) + 3, -R(0.055) + 4, tw + R(0.1), R(0.11), R(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -R(0.055), 0, R(0.055), [0, '#ffe25a'], [1, '#ff8a2a']);
  rr(ctx, -tw / 2 - R(0.05), -R(0.055), tw + R(0.1), R(0.11), R(0.05));
  ctx.fill();
  ctx.strokeStyle = '#7a3a08';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#7a3a08';
  ctx.strokeText(s.bigText, 0, R(0.004));
  ctx.fillStyle = '#ffffff';
  ctx.fillText(s.bigText, 0, R(0.004));
  ctx.restore();
}

/** 새것 스포트라이트: 판의 새 블록 하나에 점선 고리 + NEW 딱지 */
function drawSpot(ctx: C2, s: MoleState, w: number, font: (sz: number, wgt?: number) => void) {
  const sp = s.spot;
  // 판 띠를 먼저 읽고 나서 (띠가 사라질 즈음) 새것에 고리
  if (!sp || s.t - sp.t < SPOT_AT || s.t - sp.t > SPOT_AT + 240 || sp.k === 'chest') return;
  const B = s.B, R = (q: number) => q * w;
  const want = (v: number) => (sp.k === 'bubble' ? !!(v & BUB) : sp.k === 'rock' ? !!(v & ROCK) : sp.k === 'bomb' ? isDirt(v) && !!(v & BOMB) : sp.k === 'gem' ? isDirt(v) && !!(v & GEM) : isDirt(v) && !!(v & DRILL));
  let best = -1, bd = 1e9;
  for (let c = 0; c < COLS; c++) for (let i = 0; i < B.h[c]; i++) {
    const j = idx(c, i);
    if (!want(B.g[j]) || !visibleCell(B, s.cam, c, i)) continue;
    const d = Math.abs(rowOf(B, i) - moleRow(B)) + Math.abs(c - B.mc) * 0.5;
    if (d < bd) (bd = d), (best = j);
  }
  if (best < 0) return;
  const c = (best / RM) | 0, r = rowOf(B, best % RM), x = R((c + 0.5) * CW), y = R(yOfRow(s.cam, r) + CH / 2);
  const age = s.t - sp.t - SPOT_AT, a = Math.min(1, age / 10, (240 - age) / 30), pul = 1 + 0.06 * Math.sin(s.t * 0.2);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.strokeStyle = '#ffe14a';
  ctx.lineWidth = 4;
  ctx.setLineDash([9, 6]);
  ctx.lineDashOffset = -s.t * 0.8;
  ell(ctx, x, y, R(0.13) * pul, R(0.1) * pul);
  ctx.stroke();
  ctx.setLineDash([]);
  const lab = `NEW  ${sp.k === 'bubble' ? '공기 방울' : sp.k === 'rock' ? '바위' : sp.k === 'bomb' ? '폭탄 흙' : sp.k === 'gem' ? '보석' : '드릴 흙'}`;
  font(0.036, 900);
  const tw = ctx.measureText(lab).width + R(0.04), lx = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
  const ly = y - R(0.13) < R(PLAY_Y0 + 0.03) ? y + R(0.13) : y - R(0.13);
  ctx.fillStyle = '#ff5a3a';
  rr(ctx, lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
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

/** 첫 판 첫 톡 전: 큰 덩어리 위 손가락 + 한 줄 */
export function firstTarget(s: MoleState): number {
  const B = s.B;
  if (s.stage !== 0 || s.again || B.taps > 0) return -1;
  // 두더지 옆(밑) 가장 큰 덩어리
  let best = -1, bs = 0;
  for (const g of groupsIn(B, s.cam)) {
    const c = (g.cell / RM) | 0, i = g.cell % RM;
    if (Math.abs(c - B.mc) > 1 || B.h[B.mc] - i > 4) continue;
    if (g.size > bs) (bs = g.size), (best = g.cell);
  }
  return best;
}
function drawFirstTip(ctx: C2, s: MoleState, w: number, font: (sz: number, wgt?: number) => void) {
  if (s.phase !== 'play') return;
  const j = firstTarget(s);
  if (j < 0) return;
  const B = s.B, R = (q: number) => q * w, t = s.t;
  // 손가락이 가리킬 칸: 덩어리 가운데에 가까운 칸
  const grp = flood(B, j);
  let gx = 0, gy = 0;
  for (const q of grp) (gx += ((q / RM) | 0) + 0.5), (gy += rowOf(B, q % RM) + 0.5);
  gx /= grp.length;
  gy /= grp.length;
  let pick = grp[0], pd = 1e9;
  for (const q of grp) {
    const d = Math.abs(((q / RM) | 0) + 0.5 - gx) + Math.abs(rowOf(B, q % RM) + 0.5 - gy);
    if (d < pd) (pd = d), (pick = q);
  }
  const x = R((((pick / RM) | 0) + 0.5) * CW), y = R(yOfRow(s.cam, rowOf(B, pick % RM)) + CH * 0.55);
  // 덩어리 테두리 반짝
  ctx.save();
  ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 0.18)})`;
  ctx.lineWidth = 3;
  ctx.setLineDash([7, 5]);
  ctx.lineDashOffset = -t * 0.6;
  for (const q of grp) {
    const c = (q / RM) | 0, r = rowOf(B, q % RM);
    rr(ctx, R(c * CW) + 3, R(yOfRow(s.cam, r)) + 3, R(CW) - 6, R(CH) - 6, R(0.025));
    ctx.stroke();
  }
  ctx.restore();
  const press = (t % 60) / 60, dip = press < 0.3 ? Math.sin((press / 0.3) * Math.PI) : 0;
  drawHand(ctx, x + R(0.03), y + R(0.05) + dip * R(0.02), R(0.075), dip);
  // 한 줄
  font(0.044, 900);
  const msg = '👆 같은 색 덩어리를 톡!';
  const tw = ctx.measureText(msg).width + R(0.06), bx = w / 2, by = Math.min(R(PLAY_Y1 - 0.06), y + R(0.2));
  ctx.fillStyle = 'rgba(60,24,6,.35)';
  rr(ctx, bx - tw / 2 + 2, by - R(0.032) + 3, tw, R(0.064), R(0.032));
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  rr(ctx, bx - tw / 2, by - R(0.032), tw, R(0.064), R(0.032));
  ctx.fill();
  ctx.strokeStyle = '#ff7a2a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#5a2a08';
  ctx.fillText(msg, bx, by + 1);
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.08, 1 - press * 0.08);
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── HUD ─────────────────────────────
function drawTop(ctx: C2, s: MoleState, w: number, font: (sz: number, wgt?: number) => void) {
  const d = STAGES[s.stage], R = (q: number) => q * w, hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#fffaf0'], [1, '#ffe9c4']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.35)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2, bx = R(0.055);
  ctx.fillStyle = lin(ctx, bx, cy - R(0.03), bx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, bx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), bx, cy + 1);
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
    const hx = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
}
function airIcon(ctx: C2, x: number, y: number, r: number, full: boolean) {
  if (full) {
    ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.3, r * 0.1, r * 1.2, [0, '#ffffff'], [0.4, '#c8f2ff'], [1, '#5ec2f0']);
    ell(ctx, x, y, r, r);
    ctx.fill();
    ctx.strokeStyle = '#2a86b8';
    ctx.lineWidth = Math.max(1.2, r * 0.14);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ell(ctx, x - r * 0.35, y - r * 0.38, r * 0.28, r * 0.18, -0.6);
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,240,220,.35)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.setLineDash([3, 3]);
    ell(ctx, x, y, r * 0.8, r * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawBreath(ctx: C2, s: MoleState, w: number, font: (sz: number, wgt?: number) => void, vis: Vis) {
  const B = s.B, d = STAGES[s.stage], R = (q: number) => q * w, t = s.t;
  const y0 = R(0.085), y1 = R(PLAY_Y0), cy = (y0 + y1) / 2;
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, '#5a3420'], [1, '#4a2a18']);
  ctx.fillRect(0, y0, w, y1 - y0);
  const low = B.breath <= 2 && s.phase !== 'clear';
  font(0.036, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = low ? (t % 30 < 15 ? '#ff8a6a' : '#ffd0b0') : '#ffe8c8';
  ctx.fillText('숨', R(0.025), cy + 1);
  const n = Math.max(B.breath, d.breath), show = Math.min(n, 12), gap = R(0.043), r = R(0.017);
  const gotAir = t - vis.air < 30;
  for (let k = 0; k < show; k++) {
    const full = k < B.breath, x = R(0.1) + k * gap;
    const bump = gotAir && full && k >= B.breath - BUB_AIR ? 1 + 0.35 * Math.sin(((t - vis.air) / 30) * Math.PI) : 1;
    airIcon(ctx, x, cy, r * bump, full);
  }
  if (B.breath > 12) {
    font(0.03, 900);
    ctx.fillStyle = '#c8f2ff';
    ctx.fillText(`+${B.breath - 12}`, R(0.1) + 12 * gap - R(0.01), cy + 1);
  }
  // 바닥까지
  const left = B.h[B.mc];
  font(0.032, 900);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd86a';
  ctx.fillText(left > 0 ? `보물까지 ${left}칸` : '보물 도착!', w - R(0.025), cy + 1);
}
function drawBottom(ctx: C2, s: MoleState, w: number, h: number, font: (sz: number, wgt?: number) => void) {
  const B = s.B, d = STAGES[s.stage], R = (q: number) => q * w;
  const y0 = R(PLAY_Y1);
  ctx.fillStyle = lin(ctx, 0, y0, 0, h, [0, '#7a4a28'], [1, '#5a341c']);
  ctx.fillRect(0, y0, w, h - y0);
  ctx.fillStyle = 'rgba(255,220,170,.25)';
  ctx.fillRect(0, y0, w, 1.5);
  // 별 칩 (말 길이만큼 폭)
  const n = d.stars.length, cy = y0 + R(0.036), pad = R(0.06), avail = w - R(0.03) - n * 4;
  const labs = d.stars.map((q) => q.label + (starNow(B, q) ? ` ${starNow(B, q)}` : ''));
  let fs = 0.034;
  font(fs, 800);
  let tws = labs.map((l) => ctx.measureText(l).width + pad);
  while (fs > 0.027 && tws.reduce((a, b) => a + b, 0) > avail) {
    fs -= 0.001;
    font(fs, 800);
    tws = labs.map((l) => ctx.measureText(l).width + pad);
  }
  const sum = tws.reduce((a, b) => a + b, 0), k0 = Math.min(1.25, avail / sum);
  let x = R(0.015) + (avail - sum * k0) / 2;
  for (let k = 0; k < n; k++) {
    const q = d.stars[k], cw = tws[k] * k0 + 4;
    const done = s.phase === 'clear' ? s.starOk[k] : q.k !== 'arrive' && q.k !== 'breath' && starMet(B, q);
    ctx.fillStyle = done ? '#ffe9a0' : 'rgba(255,240,220,.16)';
    rr(ctx, x + 2, cy - R(0.024), cw - 4, R(0.048), R(0.024));
    ctx.fill();
    starPath(ctx, x + R(0.028), cy, R(0.014));
    ctx.fillStyle = done ? '#ffb81a' : 'rgba(255,240,220,.6)';
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = done ? '#6a3a08' : '#fff2dc';
    ctx.fillText(labs[k], x + R(0.05), cy + 1, cw - R(0.056));
    x += cw;
  }
  // 도움말
  font(0.033, 700);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe6c4';
  const tip = s.phase === 'clear' ? '보물 상자를 열었다! 더 깊은 굴로' : s.phase === 'fail' ? '같은 땅을 다시 — 이번엔 다른 데부터' : B.breath <= 2 ? '숨이 얼마 안 남았어요 — 크게 무너뜨려요' : d.hint;
  ctx.fillText(tip, w / 2, y0 + R(0.087), w - R(0.04));
}
function drawBanner(ctx: C2, s: MoleState, w: number, font: (sz: number, wgt?: number) => void, fx: ReturnType<typeof juice>) {
  const R = (q: number) => q * w, t = s.t;
  let head = '', sub = '', a = 0, age = 0, cy = R(PLAY_Y1 - 0.15);
  if (s.phase === 'clear') {
    age = s.pt;
    a = Math.min(1, Math.max(0, (age - 20) / 8));
    cy = R(PLAY_Y0 + 0.36);
    head = s.won ? '모든 보물을 찾았다!' : `${s.stage + 1}판 보물 상자!`;
  } else if (s.phase === 'fail') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = R(PLAY_Y0 + 0.5);
    head = '으앗, 숨이 다 됐다…';
    sub = s.hearts > 0 ? '하트 -1 · 같은 땅 다시' : '하트가 없어요 — 끝';
  } else if (s.banner && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    head = s.banner.head;
    sub = s.banner.sub;
  }
  if (!head || a <= 0) return;
  const pop = Math.min(1, 0.5 + age / 10), okRes = s.phase === 'clear';
  ctx.save();
  ctx.globalAlpha = a;
  font(0.052, 900);
  const w1 = ctx.measureText(head).width;
  font(0.034, 800);
  const w2 = sub ? ctx.measureText(sub).width : 0;
  const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.2) : sub ? R(0.15) : R(0.09)) * pop;
  ctx.translate(w / 2, cy);
  ctx.fillStyle = 'rgba(60,30,10,.35)';
  rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
  rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#8a5a20';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = s.phase === 'clear' ? '#ff6a3a' : s.phase === 'fail' ? '#7a8aa8' : '#3d9df5';
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
  ctx.fillStyle = s.phase === 'clear' ? '#d0500a' : s.phase === 'fail' ? '#5a6a88' : '#2a5a9a';
  if (okRes) {
    ctx.fillText(head, 0, -R(0.055), w - R(0.1));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = s.pt - (34 + j * 14), sx = (j - (nS - 1) / 2) * R(0.09);
      const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, R(0.012), R(0.036) * popS);
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + R(0.012), '#ffd23a', 16, 3, 2.4);
    }
    font(0.032, 800);
    ctx.fillStyle = '#8a5a20';
    ctx.fillText(`남은 숨 ${s.B.breath} · 보석 ${s.B.gem} · 연쇄 ${s.B.chain}`, 0, R(0.065), w - R(0.1));
  } else {
    ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
    if (sub) {
      font(0.032, 800);
      ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
      ctx.fillText(sub, 0, R(0.035), w - R(0.08));
    }
  }
  ctx.restore();
}

/** 시험·스크린샷용: k판(0부터)으로 바로 */
export function jumpTo(s: MoleState, k: number) {
  s.stage = k;
  s.again = false;
  newStage(s);
}
