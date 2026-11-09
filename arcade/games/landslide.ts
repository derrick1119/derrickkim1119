/**
 * 산사태 산장 ⛰️ (21라운드: 지어서 버티기 · 변형) — 지어서 버티기 × 재난 예보 × 당구.
 * 예보: 판이 열리면 산꼭대기 바위들이 번호표를 달고 줄 서 있고, 저마다 굴러갈 길(점선)과 끝(💥 산장 · 💦 연못)이 보인다.
 * 짓기(톡): 칸을 톡 치면 '지금 조각'이 그 칸에 놓인다. 조각은 방향을 갖고 나온다 — ＼ 오른쪽으로 꺾기 · ／ 왼쪽으로 꺾기 · ─ 멈춰 세우기.
 *   놓을 때마다 예보가 다시 그려진다(예보 = 실제와 같은 결정적 시뮬레이션). 되돌리기는 없다 → 다음 조각을 보며 '어디에'를 고민한다.
 * 버티기: 바위가 한 칸씩 굴러 내려와 통나무에 '통!' 꺾이고, 절벽에 '쿵' 튕기고, 멈춰 선 바위를 '딱!' 치면 친 바위는 서고 맞은 바위가 대신 굴러간다(당구).
 * 와우: 멈춰 세운 바위가 다음 바위의 당구공이 된다 — 하나 놓은 통나무가 두세 개 바위의 길을 연쇄로 바꾼다.
 * 별: 산장 무사 ★ · 연못에 첨벙 ★ · 구경꾼(눈사람·소풍 토끼) 무사 ★. 산장이 맞으면 하트 −1, 그 판을 처음부터. 8판(아침 → 밤).
 * 펼쳐짐: 1판 바위·＼ 통나무·연못 첨벙 → 2판 ／·절벽 튕김·소풍 토끼 → 3판 ─ 멈춤·눈사람·당구 '딱!'
 *        → 4판 눈덩이(구를수록 커져서 아래쪽 통나무를 부순다 → 위쪽에서 꺾어야) → 5판 굴러오는 통나무(안 꺾임 → 막아야)·나무
 *        → 6판 두 갈래 산길(지날 때마다 방향이 바뀜 → 순서를 세야) → 7판 눈사태(셋이 한꺼번에, 뭉치면 커짐) → 8판 큰 산사태.
 * 웃음: 염소 산장 주인의 표정(걱정·깜짝·휴·우쭐·어질어질) · 심통 난 얼굴의 바위 · 눈사람 머리가 날아감 · 연못 오리 '꽥!' · 토끼 소풍 '으악!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const W = 7, H = 8, NC = W * H, A = 1.5, CAB = 3, MB = 10;
/** 한 칸 구르는 틱 · 무리 사이 쉼(스텝) · 마지막 조각 뒤 출발까지 · 결과 화면 · 끝난 뒤 여운 · 눈덩이가 통나무를 부수는 크기 */
const STEP = 9, GAP = 2, GO = 16, RESULT = 150, ENDW = 40, BIG = 5;
/** 놓는 조각: ＼ 오른쪽 꺾기 · ／ 왼쪽 꺾기 · ─ 멈춤 */
const PR = 1, PL = 2, PS = 3;
/** 지형 */
const TREE = 1, FORK = 2, SNOWMAN = 3;
/** 굴러오는 것 */
const BOULDER = 0, SNOW = 1, LOG = 2, CLUMP = 3;
const WAIT = 0, MOVE = 1, REST = 2, GONE = 3, NEXT = 4;
/** 골짜기(산 아래 줄) */
const V_NONE = 0, V_CABIN = 1, V_POND = 2, V_PICNIC = 3;

interface Tpl { name: string; b: (number | number[])[]; p: number[]; threat: number; snowman?: boolean; picnic?: boolean; trees?: number; fork?: boolean }
const TPL: Tpl[] = [
  { name: '첫 바위', b: [BOULDER], p: [PR], threat: 1, picnic: true },
  { name: '바위 둘', b: [BOULDER, BOULDER], p: [PL, PR, PL], threat: 2, picnic: true },
  { name: '멈춰 세우기', b: [BOULDER, BOULDER, BOULDER], p: [PS, PR, PL], threat: 2, snowman: true, picnic: true },
  { name: '눈덩이', b: [SNOW, BOULDER, SNOW], p: [PR, PS, PL, PR], threat: 2, snowman: true, picnic: true },
  { name: '굴러오는 통나무', b: [LOG, BOULDER, LOG, BOULDER], p: [PS, PL, PS, PR], threat: 3, trees: 2, picnic: true },
  { name: '두 갈래 산길', b: [BOULDER, BOULDER, BOULDER, BOULDER], p: [PS, PR, PL], threat: 2, fork: true, snowman: true, picnic: true },
  { name: '눈사태', b: [[CLUMP, CLUMP, CLUMP], BOULDER, SNOW], p: [PL, PR, PS, PL], threat: 2, snowman: true, picnic: true, trees: 1 },
  { name: '큰 산사태', b: [BOULDER, SNOW, LOG, BOULDER, BOULDER], p: [PR, PS, PL, PS, PR], threat: 3, fork: true, snowman: true, picnic: true, trees: 1 },
];
const LEVELS = TPL.length;

export interface Level { tpl: number; n: number; kind: number[]; x0: number[]; d0: number[]; grp: number[]; ng: number; terr: Uint8Array; valley: Uint8Array; fork: number; pieces: number[]; best: number }

/** 산비탈 한 판의 결정적 세계 — 예보·실제·봇이 모두 이 코드를 쓴다 */
export interface World {
  piece: Uint8Array; terr: Uint8Array; valley: Uint8Array; fork: number; head: number;
  n: number; kind: Int8Array; x: Int8Array; y: Int8Array; d: Int8Array; st: Uint8Array; size: Uint8Array; grp: Uint8Array; out: Int8Array;
  ng: number; next: number; cool: number; hits: number; splash: number; harm: number;
}
type Hook = (k: string, i: number, x: number, y: number, e: number) => void;

function newWorld(): World {
  return {
    piece: new Uint8Array(NC), terr: new Uint8Array(NC), valley: new Uint8Array(W), fork: 1, head: 1,
    n: 0, kind: new Int8Array(MB), x: new Int8Array(MB), y: new Int8Array(MB), d: new Int8Array(MB), st: new Uint8Array(MB), size: new Uint8Array(MB), grp: new Uint8Array(MB), out: new Int8Array(MB),
    ng: 0, next: 0, cool: 0, hits: 0, splash: 0, harm: 0,
  };
}
function resetWorld(w: World, L: Level, piece: Uint8Array) {
  w.piece.set(piece);
  w.terr.set(L.terr);
  w.valley.set(L.valley);
  w.fork = L.fork;
  w.head = 1;
  w.n = L.n;
  for (let i = 0; i < L.n; i++) (w.kind[i] = L.kind[i]), (w.x[i] = L.x0[i]), (w.y[i] = -1), (w.d[i] = L.d0[i]), (w.st[i] = WAIT), (w.size[i] = 1), (w.grp[i] = L.grp[i]), (w.out[i] = -1);
  w.ng = L.ng;
  w.next = w.cool = w.hits = w.splash = w.harm = 0;
}

function land(w: World, i: number, nx: number, d: number, hook: Hook | null) {
  const col = nx < 0 ? 0 : nx >= W ? W - 1 : nx, v = w.valley[col];
  w.st[i] = GONE;
  w.out[i] = v;
  w.x[i] = col;
  w.y[i] = H;
  w.d[i] = d;
  if (v === V_CABIN) w.hits++;
  else if (v === V_POND) w.splash++;
  else if (v === V_PICNIC) w.harm++;
  hook?.('land', i, col, H, v);
}

const ORD = new Int8Array(MB);
/**
 * 한 스텝: 움직이는 것들이 한 칸씩 내려간다(앞에 있는 것부터). 움직이는 게 없으면 다음 무리를 굴려 보낸다.
 * 다 끝났으면 false. vis가 있으면 지나간 칸을 센다(봇·생성기가 '닿는 칸'만 시험하려고).
 */
function wstep(w: World, hook: Hook | null, vis: Uint8Array | null): boolean {
  let m = 0;
  for (let i = 0; i < w.n; i++) {
    if (w.st[i] !== MOVE) continue;
    let j = m++;
    while (j > 0 && w.y[ORD[j - 1]] < w.y[i]) (ORD[j] = ORD[j - 1]), j--;
    ORD[j] = i;
  }
  if (!m) {
    if (w.cool > 0) return w.cool--, true;
    if (w.next >= w.ng) return false;
    for (let i = 0; i < w.n; i++) if (w.grp[i] === w.next) (w.st[i] = MOVE), hook?.('release', i, w.x[i], -1, 0);
    w.next++;
    w.cool = GAP;
    return true;
  }
  for (let q = 0; q < m; q++) {
    const i = ORD[q];
    if (w.st[i] !== MOVE) continue;
    const x = w.x[i], y = w.y[i], kd = w.kind[i], ny = y + 1;
    let d = w.d[i], nx = x + d;
    if (nx < 0 || nx >= W) (hook?.('wall', i, x, y, d), (d = -d), (nx = x + d));
    if (ny >= H) {
      land(w, i, nx, d, hook);
      continue;
    }
    const c = ny * W + nx;
    let o = -1;
    for (let j = 0; j < w.n; j++) if (j !== i && w.x[j] === nx && w.y[j] === ny && (w.st[j] === MOVE || w.st[j] === REST || w.st[j] === NEXT)) (o = j), (j = w.n);
    if (o >= 0) {
      if (kd === CLUMP && w.kind[o] === CLUMP) {
        w.size[o] += w.size[i];
        w.st[i] = GONE;
        w.out[i] = -2;
        w.x[i] = nx;
        w.y[i] = ny;
        hook?.('merge', o, nx, ny, i);
        continue;
      }
      w.d[i] = d;
      w.st[i] = REST;
      if (w.st[o] === REST) (w.st[o] = NEXT), (w.d[o] = w.kind[o] === LOG ? 0 : d), hook?.('clack', o, nx, ny, i);
      else hook?.('bump', i, nx, ny, o);
      continue;
    }
    const p = w.piece[c], t = w.terr[c], big = kd === SNOW && w.size[i] >= BIG;
    if (p === PS || t === TREE) {
      if (big) {
        if (p) w.piece[c] = 0;
        else w.terr[c] = 0;
        hook?.('smash', i, nx, ny, p || 9);
      } else {
        w.d[i] = d;
        w.st[i] = REST;
        hook?.(p ? 'thud' : 'tree', i, nx, ny, 0);
        continue;
      }
    } else if (p === PR || p === PL) {
      if (kd === LOG) hook?.('over', i, nx, ny, p);
      else if (big) (w.piece[c] = 0), hook?.('smash', i, nx, ny, p);
      else (d = p === PR ? 1 : -1), hook?.('bonk', i, nx, ny, p);
    } else if (t === FORK) {
      if (kd !== LOG) (d = w.fork), (w.fork = -w.fork), hook?.('fork', i, nx, ny, d);
    } else if (t === SNOWMAN && w.head) (w.head = 0), w.harm++, hook?.('snowman', i, nx, ny, 0);
    w.x[i] = nx;
    w.y[i] = ny;
    w.d[i] = d;
    if (kd === SNOW && w.size[i] < 12) w.size[i]++;
    if (vis && vis[c] < 250) vis[c]++;
  }
  for (let i = 0; i < w.n; i++) if (w.st[i] === NEXT) w.st[i] = MOVE;
  return true;
}

const starsOf = (w: World) => (w.hits ? 0 : 1 + (w.splash ? 1 : 0) + (w.harm ? 0 : 1));
const valueOf = (w: World) => (w.hits ? -1000 * w.hits - w.harm : 1000 + (w.splash ? 300 : 0) + (w.harm ? 0 : 300) + Math.min(3, w.splash) * 4 - w.harm * 6);

const SW = newWorld();
function evalPieces(L: Level, piece: Uint8Array, vis: Uint8Array | null): number {
  resetWorld(SW, L, piece);
  if (vis) vis.fill(0);
  for (let g = 0; wstep(SW, null, vis) && g < 600; g++);
  return valueOf(SW);
}

export interface Plan { cells: number[]; dump: number[]; val: number; stars: number }
const keyOf = (p: Uint8Array) => {
  let k = '';
  for (let c = 0; c < NC; c++) if (p[c]) k += String.fromCharCode(48 + c, 48 + p[c]);
  return k;
};
/**
 * 빔 탐색: 남은 조각을 순서대로, 지금 예보에서 '바위가 지나가는 칸'에만 놓아 보며 시뮬레이션한다.
 * (안 지나가는 칸에 놓는 건 '버리기'와 같다 → -1.) 중간에 멈추는 것(▶ 버티기)도 후보.
 */
export function plan(L: Level, base: Uint8Array, from: number, B: number): Plan {
  interface St { piece: Uint8Array; cells: number[]; val: number; vis: Uint8Array }
  const vis0 = new Uint8Array(NC);
  let best: St = { piece: base, cells: [], val: evalPieces(L, base, vis0), vis: vis0 };
  let beam: St[] = [best];
  for (let k = from; k < L.pieces.length; k++) {
    const pt = L.pieces[k], cand: St[] = [], keys = new Set<string>();
    for (const st of beam) {
      const k0 = keyOf(st.piece);
      if (!keys.has(k0)) keys.add(k0), cand.push({ piece: st.piece, cells: [...st.cells, -1], val: st.val, vis: st.vis });
      for (let c = 0; c < NC; c++) {
        if (!st.vis[c] || st.piece[c] || L.terr[c]) continue;
        const p2 = st.piece.slice();
        p2[c] = pt;
        const key = keyOf(p2);
        if (keys.has(key)) continue;
        keys.add(key);
        const vis = new Uint8Array(NC);
        cand.push({ piece: p2, cells: [...st.cells, c], val: evalPieces(L, p2, vis), vis });
      }
    }
    cand.sort((a, b) => b.val - a.val);
    beam = cand.slice(0, B);
    if (beam.length && beam[0].val > best.val) best = beam[0];
  }
  const cells = best.cells.slice();
  while (cells.length && cells[cells.length - 1] < 0) cells.pop();
  const fin = new Uint8Array(NC);
  evalPieces(L, best.piece, fin);
  const stars = starsOf(SW), dump: number[] = [];
  for (let c = NC - 1; c >= 0; c--) if (!fin[c] && !best.piece[c] && !L.terr[c]) dump.push(c);
  return { cells, dump, val: best.val, stars };
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function firstLevel(): Level {
  const valley = new Uint8Array([V_PICNIC, V_NONE, V_NONE, V_CABIN, V_POND, V_POND, V_POND]);
  return { tpl: 0, n: 1, kind: [BOULDER], x0: [CAB], d0: [0], grp: [0], ng: 1, terr: new Uint8Array(NC), valley, fork: 1, pieces: [PR], best: 3 };
}

function sample(tpl: number, rng: Rng): Level {
  const T = TPL[tpl], kind: number[] = [], x0: number[] = [], d0: number[] = [], grp: number[] = [];
  T.b.forEach((b, g) => {
    if (Array.isArray(b)) {
      const d = rng() < 0.4 ? 0 : rng() < 0.5 ? -1 : 1, bx = Math.floor(rng() * (W - 2));
      b.forEach((k, j) => (kind.push(k), x0.push(bx + j), d0.push(d), grp.push(g)));
    } else kind.push(b), x0.push(Math.floor(rng() * W)), d0.push(b === LOG ? 0 : Math.floor(rng() * 3) - 1), grp.push(g);
  });
  const valley = new Uint8Array(W);
  valley[CAB] = V_CABIN;
  const right = rng() < 0.5;
  valley[right ? 5 : 0] = valley[right ? 6 : 1] = V_POND;
  if (T.picnic) valley[right ? (rng() < 0.5 ? 0 : 1) : rng() < 0.5 ? 5 : 6] = V_PICNIC;
  let pieces = T.p.slice();
  if (tpl >= 2)
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
  if (rng() < 0.5) pieces = pieces.map((p) => (p === PR ? PL : p === PL ? PR : p));
  const L: Level = { tpl, n: kind.length, kind, x0, d0, grp, ng: T.b.length, terr: new Uint8Array(NC), valley, fork: rng() < 0.5 ? -1 : 1, pieces, best: 0 };
  if (T.fork || T.snowman || T.trees) {
    const cnt = new Uint8Array(NC);
    evalPieces(L, new Uint8Array(NC), cnt);
    const pick = (ok: (c: number) => boolean, want: number) => {
      const a: number[] = [], b: number[] = [];
      for (let c = 0; c < NC; c++) if (!L.terr[c] && ok(c)) (cnt[c] >= want ? a : b).push(c);
      const from = a.length ? a : b;
      return from.length ? from[Math.floor(rng() * from.length)] : -1;
    };
    if (T.fork) {
      const c = pick((c) => ((c / W) | 0) >= 2 && ((c / W) | 0) <= 5 && c % W >= 1 && c % W <= 5, 2);
      if (c >= 0) L.terr[c] = FORK;
    }
    if (T.snowman) {
      const c = pick((c) => ((c / W) | 0) >= 2 && ((c / W) | 0) <= 6, 1);
      if (c >= 0) L.terr[c] = SNOWMAN;
    }
    for (let k = 0; k < (T.trees ?? 0); k++) {
      const c = pick((c) => ((c / W) | 0) >= 1 && ((c / W) | 0) <= 6 && c % W !== CAB, 99);
      if (c >= 0) L.terr[c] = TREE;
    }
  }
  return L;
}

const CACHE = new Map<number, Level>();
/** 판 하나: 아무것도 안 놓으면 산장이 맞고(위협), 주어진 조각으로 별 둘 이상이 되는(풀리는) 배치만 고른다 */
export function genLevel(seed: number, tpl: number): Level {
  if (tpl === 0) return firstLevel();
  const key = seed * 16 + tpl, hit = CACHE.get(key);
  if (hit) return hit;
  const rng = mulberry32(seed), T = TPL[tpl], empty = new Uint8Array(NC);
  let best: Level | null = null, last: Level | null = null;
  for (let a = 0; a < 80; a++) {
    const L = sample(tpl, rng);
    last = L;
    evalPieces(L, empty, null);
    if (SW.hits < T.threat) continue;
    const p = plan(L, empty, 0, 6);
    L.best = p.stars;
    if (!best || p.stars > best.best) best = L;
    if (p.stars >= 3) break;
  }
  const L = best ?? last!;
  if (CACHE.size > 4000) CACHE.clear();
  CACHE.set(key, L);
  return L;
}

// ───────────────────────────── 예보 ─────────────────────────────
interface Mark { k: string; x: number; y: number; i: number }
export interface Fc { seg: number[][]; out: number[]; marks: Mark[]; hits: number; splash: number; harm: number; stars: number }
/** 지금 놓인 조각으로 끝까지 굴려 본 길 (칸 단위 선분: x0,y0,x1,y1,벽,큰눈덩이) */
export function forecast(L: Level, piece: Uint8Array): Fc {
  const w = newWorld();
  resetWorld(w, L, piece);
  const seg: number[][] = L.kind.map(() => []), marks: Mark[] = [], px = new Int8Array(MB), py = new Int8Array(MB), pst = new Uint8Array(MB), wall = new Int8Array(MB);
  const hook: Hook = (k, i, x, y, e) => {
    if (k === 'wall') wall[i] = e;
    else if (k !== 'release' && k !== 'land') marks.push({ k, x, y, i });
  };
  for (let g = 0; g < 600; g++) {
    for (let i = 0; i < w.n; i++) (px[i] = w.x[i]), (py[i] = w.y[i]), (pst[i] = w.st[i]), (wall[i] = 0);
    if (!wstep(w, hook, null)) break;
    for (let i = 0; i < w.n; i++)
      if (pst[i] === MOVE && (w.x[i] !== px[i] || w.y[i] !== py[i])) seg[i].push(px[i], py[i], w.x[i], w.y[i], wall[i], w.kind[i] === SNOW && w.size[i] >= BIG ? 1 : 0);
  }
  return { seg, out: Array.from(w.out.slice(0, w.n)), marks, hits: w.hits, splash: w.splash, harm: w.harm, stars: starsOf(w) };
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { id: number; t: number; at: number; k: string; i: number; x: number; y: number; e: number; text?: string }
interface Note { at: number; text: string; color: string }
export interface SlideState {
  rng: Rng; seeds: number[]; t: number; lv: number; L: Level; phase: 'build' | 'roll' | 'result';
  piece: Uint8Array; placedT: Int32Array; used: number; fc: Fc; w: World;
  buildT: number; rollT: number; go: number; endW: number; pause: number; result: number; lastStars: number;
  ax: Float32Array; ay: Float32Array; vx: Float32Array; vy: Float32Array; moved: Uint16Array; goneT: Int32Array;
  brokeAt: Int32Array; headAt: number; forkAt: number[]; landAt: Int32Array; bonked: boolean;
  hearts: number; stars: number; cleared: number; tries: number; won: boolean; dead: boolean; down: boolean; taps: number;
  seen: Set<string>; events: Ev[]; notes: Note[]; eid: number;
}

/** 사건 기록 — at은 화면에서 보일 시각(바위가 그 칸에 닿는 순간) */
const ev = (s: SlideState, k: string, i: number, x: number, y: number, e = 0, text?: string, delay = 0) => s.events.push({ id: ++s.eid, t: s.t, at: s.t + delay, k, i, x, y, e, text });
const say = (s: SlideState, text: string, delay = 0) => ev(s, 'say', 0, 0, 0, 0, text, delay);
function note(s: SlideState, text: string, color = '#ffffff') {
  const last = s.notes.length ? s.notes[s.notes.length - 1].at : -999;
  s.notes.push({ at: Math.max(s.t, last + 105), text, color });
}
function see(s: SlideState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, text, '#ffe08a');
}

const KIND_E = ['🪨', '☃️', '🪵', '❄️'];
const KIND_N = ['바위', '눈덩이', '통나무', '눈사태'];
const PIECE_N = ['', '＼ 비스듬 통나무', '／ 비스듬 통나무', '─ 가로 통나무'];
const PIECE_TIP = ['', '바위를 오른쪽 아래로 꺾어요', '바위를 왼쪽 아래로 꺾어요', '바위를 멈춰 세워요 — 멈춘 바위는 당구공!'];

function startLevel(s: SlideState, fresh: boolean) {
  const L = s.L;
  s.phase = 'build';
  s.piece.fill(0);
  s.placedT.fill(-999);
  s.used = 0;
  s.buildT = 0;
  s.go = 0;
  s.rollT = 0;
  s.endW = 0;
  s.brokeAt.fill(1 << 30);
  s.landAt.fill(1 << 30);
  s.goneT.fill(1 << 30);
  s.headAt = 1 << 30;
  s.forkAt = [];
  resetWorld(s.w, L, s.piece);
  for (let i = 0; i < MB; i++) (s.ax[i] = s.w.x[i]), (s.ay[i] = -1), (s.vy[i] = NaN), (s.moved[i] = 0);
  s.fc = forecast(L, s.piece);
  if (fresh) {
    const cnt = new Map<number, number>();
    for (let g = 0; g < L.ng; g++) {
      const k = L.kind[L.grp.indexOf(g)];
      cnt.set(k, (cnt.get(k) ?? 0) + 1);
    }
    note(s, `🔮 예보: ${[...cnt].map(([k, n]) => `${KIND_N[k]} ×${n}`).join(' · ')} 굴러와요!`, '#ffffff');
    if (s.lv === 0) see(s, 'forecast', '🔮 점선 = 바위가 굴러갈 길 · 💥 = 산장에 쾅');
    for (const p of L.pieces) {
      if (p === PR || p === PL) see(s, 'slant', '／＼ 비스듬 통나무 — 바위가 그쪽으로 꺾여요');
      if (p === PS) see(s, 'stop', '─ 가로 통나무 — 바위를 멈춰 세워요');
    }
    for (const k of L.kind) {
      if (k === SNOW) see(s, 'snow', '☃️ 눈덩이는 구를수록 커져요 — 커지면 통나무를 부숴요!');
      if (k === LOG) see(s, 'rlog', '🪵 굴러오는 통나무는 안 꺾여요 — ─로 막아요');
      if (k === CLUMP) see(s, 'aval', '❄️ 눈사태 — 셋이 한꺼번에 넓게 쏟아져요');
    }
    for (let c = 0; c < NC; c++) {
      if (L.terr[c] === TREE) see(s, 'tree', '🌲 나무는 바위를 멈춰 세워요');
      if (L.terr[c] === FORK) see(s, 'fork', '⇄ 갈림길 — 지날 때마다 방향이 바뀌어요');
      if (L.terr[c] === SNOWMAN) see(s, 'snowman', '⛄ 눈사람 머리가 날아가면 ★ 하나 잃어요');
    }
    if (L.valley.includes(V_PICNIC) && s.lv > 0) see(s, 'picnic', '🐰 소풍 온 토끼 — 바위가 가면 ★ 하나 잃어요');
    say(s, s.lv === 0 ? '메에…? 바위다!' : s.lv === LEVELS - 1 ? '메에에… 마지막이야!' : '메에! 또 와요!');
  } else {
    note(s, `🔁 ${s.lv + 1}판 다시 — 같은 바위, 새로 지어요`, '#ffd0d0');
    say(s, '메에… 다시 해 봐요');
  }
  ev(s, 'level', 0, 0, 0);
}

/** 톡: ▶ 단추 또는 칸 */
const BTN = { x: 0.69, y: 1.31, w: 0.28, h: 0.1 };
function tapBuild(s: SlideState, X: number, Y: number) {
  if (s.go > 0) return;
  if (s.lv > 0 && X >= BTN.x && X <= BTN.x + BTN.w && Y >= BTN.y && Y <= BTN.y + BTN.h) {
    s.go = 2;
    ev(s, 'gobtn', 0, 0, 0);
    return;
  }
  let c = cellAt(X, Y);
  if (c < 0) return;
  // 첫 판(안내): 같은 줄의 바위 길 위로, 너무 위쪽이면 가운데쯤으로 붙여 준다 — 첫 3초에 '통!'이 꼭 보이게
  if (s.lv === 0) c = Math.max(3, Math.min(H - 1, (c / W) | 0)) * W + s.L.x0[0];
  if (s.L.terr[c] || s.piece[c]) return void ev(s, 'nope', 0, c % W, (c / W) | 0);
  const p = s.L.pieces[s.used];
  s.piece[c] = p;
  s.placedT[c] = s.t;
  s.used++;
  s.taps++;
  const before = s.fc.hits;
  s.fc = forecast(s.L, s.piece);
  ev(s, 'place', 0, c % W, (c / W) | 0, p);
  if (s.fc.hits < before) say(s, s.fc.hits ? '메~ 하나 비켰다!' : '메에~ 좋아요!');
  else if (s.fc.hits > before) say(s, '메에?! 이쪽으로 와요!');
  if (s.used >= s.L.pieces.length) s.go = GO;
}

function startRoll(s: SlideState) {
  s.phase = 'roll';
  s.rollT = 0;
  s.endW = 0;
  s.bonked = false;
  resetWorld(s.w, s.L, s.piece);
  for (let i = 0; i < MB; i++) (s.ax[i] = s.w.x[i]), (s.ay[i] = -1), (s.vy[i] = NaN), (s.moved[i] = 0);
  say(s, s.fc.hits ? '메에… 온다!' : '온다… 메에!');
}

function rollStep(s: SlideState): boolean {
  const w = s.w;
  for (let i = 0; i < w.n; i++) (s.ax[i] = w.x[i]), (s.ay[i] = w.y[i]), (s.vy[i] = NaN);
  const nudge = (i: number, tx: number, ty: number) => ((s.vx[i] = w.x[i] + 0.5 + (tx - w.x[i]) * 0.38), (s.vy[i] = w.y[i] + 0.5 + (ty - w.y[i]) * 0.38));
  const hook: Hook = (k, i, x, y, e) => {
    if (k === 'release') return void (s.L.grp.indexOf(s.L.grp[i]) === i && ev(s, 'release', i, x + (s.L.kind[i] === CLUMP ? 1 : 0), -1));
    if (k === 'wall') {
      s.vx[i] = e > 0 ? W - 0.12 : 0.12;
      s.vy[i] = y + 1;
      ev(s, 'wall', i, e > 0 ? W - 0.12 : 0.12, y + 1, 0, undefined, STEP >> 1);
      return see(s, 'wall', '🧗 절벽에 맞으면 반대로 튕겨요');
    }
    if (k === 'thud' || k === 'tree' || k === 'bump') return nudge(i, x, y), ev(s, k, i, x, y, 0, undefined, STEP >> 1);
    if (k === 'clack') {
      nudge(e, x, y);
      ev(s, 'clack', i, x, y, e, undefined, STEP >> 1);
      return see(s, 'clack', '🎱 딱! 멈춘 바위를 치면 그 바위가 대신 굴러가요');
    }
    if (k === 'smash') {
      s.brokeAt[y * W + x] = s.t + STEP;
      ev(s, 'smash', i, x, y, e, undefined, STEP);
      return see(s, 'smash', '💥 커진 눈덩이가 통나무를 부쉈어요');
    }
    if (k === 'bonk') return (s.bonked = true), ev(s, 'bonk', i, x, y, e, undefined, STEP);
    if (k === 'fork') return s.forkAt.push(s.t + STEP), ev(s, 'fork', i, x, y, e, undefined, STEP);
    if (k === 'snowman') return (s.headAt = s.t + STEP), ev(s, 'snowman', i, x, y, 0, undefined, STEP), say(s, '내 머리!? (눈사람)', STEP);
    if (k === 'merge') return (s.goneT[e] = s.t), ev(s, 'merge', i, x, y, 0, undefined, STEP), see(s, 'merge', '❄️ 눈사태끼리 부딪히면 뭉쳐서 커져요');
    if (k === 'over') return ev(s, 'over', i, x, y, 0, undefined, STEP);
    if (k === 'land') {
      s.goneT[i] = s.t;
      s.landAt[i] = s.t + STEP;
      ev(s, 'land', i, x, H, e, undefined, STEP);
      if (e === V_CABIN) say(s, '메에에에!!', STEP);
      else if (e === V_POND) see(s, 'splash', '🦆 연못에 첨벙 — ★ 하나 더!'), say(s, s.bonked ? '메에~ 휴!' : '첨벙! 메헤~', STEP);
      else if (e === V_PICNIC) say(s, '토끼들아 미안해~', STEP);
      else if (x === CAB - 1 || x === CAB + 1) say(s, '아슬아슬… 메에!', STEP);
      else if (s.bonked) say(s, '메에~ 휴', STEP);
    }
  };
  const more = wstep(w, hook, null);
  for (let i = 0; i < w.n; i++) if (w.x[i] !== s.ax[i] || w.y[i] !== s.ay[i]) s.moved[i]++;
  return more;
}

function finish(s: SlideState) {
  const w = s.w, st = starsOf(w);
  s.phase = 'result';
  s.pause = RESULT;
  s.lastStars = st;
  if (!st) {
    s.hearts--;
    s.result = -1;
    ev(s, 'fail', 0, CAB, H);
    say(s, s.hearts > 0 ? '어질어질… 다시 지어요' : '메에… 산장이…');
  } else {
    s.stars += st;
    s.cleared++;
    s.result = st;
    ev(s, 'clear', 0, CAB, H, st);
    say(s, st === 3 ? '메헤헤~ 완벽해!' : '메에~ 지켰다!');
  }
}

function afterResult(s: SlideState) {
  if (s.result < 0) {
    if (s.hearts <= 0) return void (s.dead = true);
    s.tries++;
    startLevel(s, false);
  } else if (s.lv + 1 >= LEVELS) {
    s.won = true;
    s.dead = true;
  } else {
    s.lv++;
    s.tries = 0;
    s.L = genLevel(s.seeds[s.lv], s.lv);
    startLevel(s, true);
  }
}

export const landslide: GameDef<SlideState> = {
  id: 'landslide',
  name: '산사태 산장',
  genes: ['fortify', 'forecast', 'billiards'],
  twist: '바위가 굴러올 길이 점선으로 다 보이고 톡 놓은 통나무가 그 길을 꺾는데, 멈춰 세운 바위가 다음 바위의 당구공이 되어 길이 연쇄로 바뀐다',
  rules: [
    '칸을 톡 치면 지금 조각이 놓여요 — ＼／는 바위를 꺾고, ─는 멈춰 세워요.',
    '점선이 바위가 굴러갈 길이에요. 멈춘 바위를 치면 그 바위가 대신 굴러가요.',
    '산장을 지키면 ★, 연못에 첨벙 ★, 구경꾼 무사 ★ — 산장이 다치면 ♥−1, 그 판 다시.',
  ],
  controls: 'touch',
  hint: '칸을 톡 — 지금 조각을 그 자리에 놓기 · ▶ 버티기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '3/4 시점 산비탈 디오라마 — 꼭대기에서 바위가 줄지어 굴러오는 계단식 비탈과 맨 아래 통나무 산장·연못',
    mood: '눈 덮인 봉우리 아래 계단처럼 층진 풀밭 비탈, 양옆은 바위 절벽. 꼭대기 바위 턱에 심통 난 얼굴의 바위들이 번호표를 달고 줄 서 있고, 알록달록한 점선이 산장까지 이어진다. 아래엔 굴뚝 연기 나는 통나무 산장과 염소 주인, 오리가 떠 있는 연못, 체크무늬 돗자리에 토끼 소풍. 판이 지날수록 아침에서 노을, 밤으로 — 밤엔 산장 창문이 노랗게 번진다.',
    palette: { bg: '#1b2a3a', ink: '#fffaf0', muted: '#9fb3c4', accent: '#ffb84d', hot: '#ff5a4e', soft: '#2e4a5c' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const seeds = TPL.map(() => Math.floor(rng() * 2 ** 31));
    const s: SlideState = {
      rng, seeds, t: 0, lv: 0, L: genLevel(seeds[0], 0), phase: 'build',
      piece: new Uint8Array(NC), placedT: new Int32Array(NC), used: 0, fc: null as unknown as Fc, w: newWorld(),
      buildT: 0, rollT: 0, go: 0, endW: 0, pause: 0, result: 0, lastStars: 0,
      ax: new Float32Array(MB), ay: new Float32Array(MB), vx: new Float32Array(MB), vy: new Float32Array(MB), moved: new Uint16Array(MB), goneT: new Int32Array(MB),
      brokeAt: new Int32Array(NC), headAt: 0, forkAt: [], landAt: new Int32Array(MB), bonked: false,
      hearts: 3, stars: 0, cleared: 0, tries: 0, won: false, dead: false, down: false, taps: 0,
      seen: new Set<string>(), events: [], notes: [], eid: 0,
    };
    startLevel(s, true);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].at > 160) s.events = s.events.filter((e) => s.t - e.at <= 160);
    if (s.notes.length > 1 && s.t - s.notes[0].at > 260) s.notes = s.notes.filter((n) => s.t - n.at <= 260);
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    if (s.dead) return;
    if (s.phase === 'build') {
      s.buildT++;
      if (press && p) tapBuild(s, p.x, p.y * A);
      if (s.go > 0 && --s.go === 0) startRoll(s);
    } else if (s.phase === 'roll') {
      s.rollT++;
      if (s.endW > 0) {
        if (--s.endW === 0) finish(s);
      } else if ((s.rollT - 1) % STEP === 0 && !rollStep(s)) s.endW = ENDW;
    } else {
      if (press && s.pause < RESULT - 40) s.pause = Math.min(s.pause, 2);
      if (--s.pause <= 0) afterResult(s);
    }
  },
  over: (s) => s.dead,
  /** 별 하나 10점, 8판을 다 지키면 30점 더 */
  score: (s) => s.stars * 10 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th) {
    drawSlide(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 화면 배치 (가로 폭 = 1 단위) ─────────────────────────────
const Y0 = 0.3, H0 = 0.082, DH = 0.0026, VAL = 9.65, PANEL = 1.285;
const rowY = (r: number) => Y0 + r * H0 + ((r * (r - 1)) / 2) * DH;
const halfW = (r: number) => 0.385 + 0.075 * (r / H);
/** 칸 좌표(gx 0~W, gy -1.3~VAL) → 화면(폭 1 단위) */
export const gp = (gx: number, gy: number): [number, number] => [0.5 + halfW(gy) * ((2 * gx) / W - 1), rowY(gy)];
export function cellAt(X: number, Y: number): number {
  if (Y < rowY(0) || Y >= rowY(H)) return -1;
  let r = 0;
  while (r < H - 1 && Y >= rowY(r + 1)) r++;
  const gy = r + (Y - rowY(r)) / (rowY(r + 1) - rowY(r)), gx = ((X - 0.5) / halfW(gy) + 1) * (W / 2);
  return gx < 0 || gx >= W ? -1 : r * W + Math.floor(gx);
}

// ───────────────────────────── 봇 ─────────────────────────────
const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 데나, 아무 때나 톡 (예보를 안 본다) */
export const landslideRandom: Bot<SlideState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    const no = { tap: false, dir: 0 as const, pointer: null };
    let next = dumbAt.get(s);
    if (next === undefined) dumbAt.set(s, (next = 20 + Math.floor(rng() * 60)));
    if (s.t < next) return no;
    dumbAt.set(s, s.t + 25 + Math.floor(rng() * 80));
    return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
  },
};

const brain = new WeakMap<object, { key: string; p: Plan; dump: number[] }>();
/** 봇: 남은 조각을 순서대로 빔 탐색(예보 시뮬레이션)해서 산장 무사 → 첨벙 → 구경꾼 무사가 되는 자리를 고르고, 남는 조각은 안 닿는 칸에 버리거나 ▶ */
export const landslideSmart: Bot<SlideState> = {
  name: '산장 지기',
  act(s) {
    const no = { tap: false, dir: 0 as const, pointer: null };
    if (s.phase !== 'build' || s.go > 0 || s.down || s.buildT < 10) return no;
    const key = `${s.lv}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      const p = plan(s.L, s.piece, s.used, 12);
      m = { key, p, dump: p.dump.slice() };
      brain.set(s, m);
    }
    const i = s.used;
    const tapAt = (c: number) => {
      const [x, y] = gp((c % W) + 0.5, ((c / W) | 0) + 0.5);
      return { tap: false, dir: 0 as const, pointer: { x, y: y / A } };
    };
    if (i >= m.p.cells.length) return s.lv > 0 ? { tap: false, dir: 0, pointer: { x: BTN.x + BTN.w / 2, y: (BTN.y + BTN.h / 2) / A } } : no;
    let c = m.p.cells[i];
    if (c < 0) {
      while (m.dump.length && (s.piece[m.dump[0]] || s.L.terr[m.dump[0]])) m.dump.shift();
      c = m.dump.shift() ?? -1;
      if (c < 0) return no;
    }
    return tapAt(c);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const rgb = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const A1 = rgb(a), B1 = rgb(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(A1[0] + (B1[0] - A1[0]) * u)},${Math.round(A1[1] + (B1[1] - A1[1]) * u)},${Math.round(A1[2] + (B1[2] - A1[2]) * u)})`;
}
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;
const COL = ['#ff6b4a', '#ffd23f', '#4fd1ff', '#ff7ad9', '#a6ff6a', '#ffa94d', '#c0a8ff', '#63e6be', '#ffe066', '#ff8787'];
const NUM = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SKY: [number, string, string][] = [
  [0, '#8cc4ef', '#ffe6c8'],
  [0.3, '#4fa6ec', '#d2efff'],
  [0.58, '#5a8fd8', '#ffdcae'],
  [0.78, '#4b4c98', '#ff9a6a'],
  [1, '#121847', '#38407c'],
];
const done = new WeakSet<Ev>();

function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, maxX: number) {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size * 1.1;
  const bx = Math.max(4, Math.min(maxX - tw - 4, x - tw / 2));
  ctx.fillStyle = 'rgba(255,255,255,.96)';
  ctx.beginPath();
  ctx.roundRect(bx, y - size * 0.9, tw, size * 1.6, size * 0.7);
  ctx.moveTo(x - 4, y + size * 0.65);
  ctx.lineTo(x + 1, y + size * 1.2);
  ctx.lineTo(x + 5, y + size * 0.65);
  ctx.fill();
  ctx.fillStyle = '#3a2a22';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + tw / 2, y - size * 0.1);
}

function drawSlide(ctx: CanvasRenderingContext2D, s: SlideState, w: number, h: number, th: Theme) {
  const fx = juice(s), L = s.L, wd = s.w, t = s.t;
  const P = (gx: number, gy: number): [number, number] => {
    const [a, b] = gp(gx, gy);
    return [a * w, b * w];
  };
  const cw = (gy: number) => (2 * halfW(gy) * w) / W;
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const emoji = (e: string, x: number, y: number, size: number, base: CanvasTextBaseline = 'middle') => {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = base;
    ctx.fillText(e, x, y);
  };
  const shout = (x: number, y: number, text: string, size: number, col: string) => {
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(3, size * 0.18);
    ctx.strokeStyle = 'rgba(30,20,10,.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = col;
    ctx.fillText(text, x, y);
  };
  const ell = (x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const age = (at: number) => t - at;
  const f = s.lv / (LEVELS - 1);
  const night = f > 0.7 ? (f - 0.7) / 0.3 : 0;
  const rolling = s.phase === 'roll';
  const fr = rolling ? (s.endW > 0 ? 1 : ((s.rollT - 1) % STEP) / STEP) : 1;

  // ── 사건 → 손맛 (바위가 그 칸에 닿는 순간에) ──
  for (const e of s.events) {
    if (done.has(e) || e.at > t) continue;
    done.add(e);
    const [ex, ey] = P(e.x + 0.5, e.y + 0.5);
    const big = Math.max(14, w * 0.05);
    if (e.k === 'place') fx.burst(ex, ey, '#c9a57a', 10, 2.2, 2.5), fx.pop(ex, ey - w * 0.04, '쿵', '#fff3d6', big * 0.8), fx.kick(1.5);
    else if (e.k === 'nope') fx.pop(ex, ey, '✕', '#ff9a9a', big);
    else if (e.k === 'release') {
      const [rx, ry] = P(e.x + 0.5, -0.5);
      fx.burst(rx, ry, '#e8edf2', 8, 1.6, 2.5), fx.pop(rx, ry - w * 0.05, '우르르…', '#ffffff', Math.max(12, w * 0.036)), fx.kick(1.5);
    } else if (e.k === 'wall') {
      const [wx, wy] = P(e.x, e.y);
      fx.burst(wx, wy, '#8e8a84', 10, 2.5, 2.5), fx.pop(wx + (e.x > 1 ? -w * 0.05 : w * 0.05), wy, '쿵!', '#ffe0b0', big * 0.85), fx.kick(2.5);
    } else if (e.k === 'bonk') fx.burst(ex, ey, '#c98a52', 14, 3, 2.6), fx.ring(ex, ey, '#ffe8c0', w * 0.09, 3), fx.pop(ex, ey - w * 0.05, '통!', '#ffd27a', big * 1.1), fx.kick(3.5);
    else if (e.k === 'thud' || e.k === 'tree' || e.k === 'bump') fx.burst(ex, ey - w * 0.02, '#d8c8a8', 10, 2, 2.5), fx.pop(ex, ey - w * 0.05, e.k === 'tree' ? '쿵! 나무가 막았다' : '턱!', '#fff0cc', big * 0.85), fx.kick(2.5);
    else if (e.k === 'clack') fx.ring(ex, ey, '#ffffff', w * 0.12, 4), fx.burst(ex, ey, '#fff6a0', 14, 3.4, 2), fx.pop(ex, ey - w * 0.06, '딱!', '#ffffff', big * 1.25), fx.kick(4);
    else if (e.k === 'smash') fx.burst(ex, ey, '#b07040', 26, 4.2, 3), fx.burst(ex, ey, '#ffffff', 14, 3, 2.5), fx.pop(ex, ey - w * 0.06, '와지끈!', '#ffcf9a', big * 1.15), fx.kick(6);
    else if (e.k === 'fork') fx.pop(ex, ey - w * 0.06, '찰칵!', '#d0f0ff', big * 0.85), fx.ring(ex, ey, '#bfe8ff', w * 0.06, 2);
    else if (e.k === 'snowman') fx.burst(ex, ey - w * 0.05, '#ffffff', 18, 3.5, 3), fx.pop(ex, ey - w * 0.1, '뿅!', '#ffffff', big), fx.kick(3);
    else if (e.k === 'merge') fx.burst(ex, ey, '#eaf6ff', 14, 2.6, 3), fx.pop(ex, ey - w * 0.05, '뭉쳤다!', '#e0f4ff', big * 0.85);
    else if (e.k === 'over') fx.pop(ex, ey - w * 0.04, '덜컹', '#ffe8c0', big * 0.75), fx.kick(1.5);
    else if (e.k === 'land') {
      const [lx, ly] = P(e.x + 0.5, 8.9);
      if (e.e === V_CABIN) fx.kick(13), fx.blink('#ff4030', 0.4), fx.burst(lx, ly - w * 0.08, '#b6452c', 22, 4.5, 3.5), fx.burst(lx, ly - w * 0.05, '#8a5530', 14, 3.5, 3), fx.ring(lx, ly - w * 0.05, '#ffb0a0', w * 0.2, 5), fx.pop(lx, ly - w * 0.16, '쾅!!', '#ff7060', big * 1.5);
      else if (e.e === V_POND) fx.burst(lx, ly, '#7fd6ff', 26, 4, 3.2), fx.burst(lx, ly, '#ffffff', 12, 3, 2.4), fx.ring(lx, ly, '#bfeaff', w * 0.13, 4), fx.pop(lx, ly - w * 0.09, '첨벙!', '#bff0ff', big * 1.3), fx.kick(3);
      else if (e.e === V_PICNIC) fx.burst(lx, ly, '#ff8a8a', 16, 3.5, 3), fx.pop(lx, ly - w * 0.09, '으악!', '#ffd0d0', big * 1.1), fx.kick(3);
      else fx.pop(lx, ly - w * 0.05, '데굴데굴~', '#ffffff', Math.max(12, w * 0.036)), fx.burst(lx, ly, '#c9b48a', 8, 2, 2.2);
    } else if (e.k === 'clear') {
      const [cx, cy] = P(CAB + 0.5, 8.6);
      for (let k = 0; k < 5; k++) fx.burst(cx + (k - 2) * w * 0.12, cy - w * 0.1, COL[k], 12, 4, 3);
      fx.pop(cx, cy - w * 0.22, `${'★'.repeat(e.e)}${'☆'.repeat(3 - e.e)}`, '#ffe066', big * 1.6);
      fx.ring(cx, cy - w * 0.05, '#ffe066', w * 0.3, 5);
    } else if (e.k === 'fail') fx.blink('#ff6050', 0.25);
  }

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a = SKY[i]), (b = SKY[i + 1]);
  const u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const sg = ctx.createLinearGradient(0, 0, 0, w * 0.42);
  sg.addColorStop(0, mix(a[1], b[1], u));
  sg.addColorStop(1, mix(a[2], b[2], u));
  ctx.fillStyle = sg;
  ctx.fillRect(-14, -14, w + 28, h + 28);
  if (night > 0.1)
    for (let k = 0; k < 36; k++) {
      ctx.globalAlpha = night * (0.35 + 0.65 * Math.abs(Math.sin(t / 40 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, w * 0.12 + hsh(k * 5 + 1) * w * 0.2, 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  {
    const sx = w * (0.14 + 0.72 * f), sy = w * (0.2 - 0.06 * Math.sin(Math.PI * Math.min(1, f * 1.1)));
    const sun = night > 0.5 ? '#f4f1d0' : mix('#fff6b8', '#ff9a50', Math.max(0, f - 0.4) * 2.2);
    ctx.save();
    ctx.shadowColor = sun;
    ctx.shadowBlur = w * 0.08;
    ell(sx, sy, w * 0.042, w * 0.042, sun);
    ctx.restore();
    if (night > 0.5) ell(sx + w * 0.016, sy - w * 0.01, w * 0.034, w * 0.034, mix(a[1], b[1], u));
  }
  for (let k = 0; k < 3; k++) {
    const cx = ((hsh(k + 11) * w + t * (0.07 + k * 0.03)) % (w + 140)) - 70, cy = w * (0.15 + hsh(k + 3) * 0.08);
    ctx.fillStyle = `rgba(255,255,255,${0.7 - night * 0.5})`;
    for (let p = 0; p < 4; p++) ell(cx + p * w * 0.03 - w * 0.045, cy - (p % 2) * w * 0.01, w * 0.035, w * 0.018, ctx.fillStyle as string);
  }
  // 새 두 마리
  for (let k = 0; k < 2; k++) {
    const bx = ((t * (0.5 + k * 0.2) + k * 170) % (w + 80)) - 40, by = w * (0.16 + k * 0.035) + Math.sin(t / 25 + k) * 3, fl = Math.sin(t / 5 + k * 2) * w * 0.008;
    ctx.strokeStyle = night > 0.5 ? 'rgba(200,210,255,.5)' : 'rgba(40,50,70,.7)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(bx - w * 0.015, by - fl);
    ctx.quadraticCurveTo(bx - w * 0.006, by - w * 0.006, bx, by);
    ctx.quadraticCurveTo(bx + w * 0.006, by - w * 0.006, bx + w * 0.015, by - fl);
    ctx.stroke();
  }
  // ── 먼 산맥 ──
  const far = (pts: number[], base: number, col: string, snow: string) => {
    ctx.beginPath();
    ctx.moveTo(-10, base * w);
    for (let i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i] * w, pts[i + 1] * w);
    ctx.lineTo(w + 10, base * w);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
    for (let i = 2; i < pts.length - 2; i += 2) {
      if (pts[i + 1] > pts[i - 1] || pts[i + 1] > pts[i + 3]) continue;
      const x = pts[i] * w, y = pts[i + 1] * w, d = w * 0.03;
      poly([[x, y], [x + d * 0.9, y + d * 0.7], [x + d * 0.3, y + d * 0.55], [x - d * 0.2, y + d * 0.8], [x - d * 0.8, y + d * 0.65]], snow);
    }
  };
  far([0, 0.25, 0.1, 0.19, 0.2, 0.24, 0.32, 0.16, 0.42, 0.23, 0.58, 0.22, 0.7, 0.15, 0.82, 0.22, 0.92, 0.18, 1, 0.23], 0.34, mix('#a9bfd8', '#2b3566', night), mix('#f4f8ff', '#8a94c0', night));
  // ── 큰 봉우리 (비탈 뒤) ──
  {
    const [lx, ly] = P(-0.6, -1.3), [rx, ry] = P(W + 0.6, -1.3), X = (v: number) => v * w;
    const pg = ctx.createLinearGradient(0, X(0.1), 0, ly);
    pg.addColorStop(0, mix('#a3a5b2', '#3a3f5e', night));
    pg.addColorStop(1, mix('#6c707e', '#262a44', night));
    poly([[lx - X(0.08), ly + 2], [X(0.16), X(0.2)], [X(0.27), X(0.165)], [X(0.35), X(0.15)], [X(0.43), X(0.122)], [X(0.5), X(0.112)], [X(0.58), X(0.128)], [X(0.66), X(0.155)], [X(0.76), X(0.17)], [X(0.86), X(0.2)], [rx + X(0.08), ry + 2]], pg);
    // 그늘진 오른쪽 사면
    poly([[X(0.5), X(0.112)], [X(0.58), X(0.128)], [X(0.66), X(0.155)], [X(0.76), X(0.17)], [X(0.86), X(0.2)], [rx + X(0.08), ry + 2], [X(0.6), ly + 2]], `rgba(20,24,50,${0.22 + night * 0.1})`);
    // 눈 모자
    poly([[X(0.33), X(0.155)], [X(0.43), X(0.122)], [X(0.5), X(0.112)], [X(0.58), X(0.128)], [X(0.68), X(0.157)], [X(0.63), X(0.172)], [X(0.57), X(0.16)], [X(0.52), X(0.18)], [X(0.46), X(0.163)], [X(0.4), X(0.178)]], mix('#f8fcff', '#9aa4d0', night));
    poly([[X(0.5), X(0.112)], [X(0.58), X(0.128)], [X(0.68), X(0.157)], [X(0.63), X(0.172)], [X(0.57), X(0.16)], [X(0.53), X(0.17)]], mix('#cfdcee', '#7a84b0', night));
    // 바위 결
    ctx.strokeStyle = `rgba(40,40,60,${0.25})`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 7; k++) {
      const x0 = X(0.2 + k * 0.1 + hsh(k) * 0.04), y0 = X(0.2 + hsh(k + 5) * 0.04);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + X(0.02), y0 + X(0.04));
      ctx.stroke();
    }
  }
  // ── 양옆 숲 (비탈 밖) ──
  const sideCol = mix('#3d6a46', '#14261c', night);
  poly([[-10, w * 0.26], P(-0.35, -1.3), P(-0.35, VAL), [-10, PANEL * w]], sideCol);
  poly([[w + 10, w * 0.26], P(W + 0.35, -1.3), P(W + 0.35, VAL), [w + 10, PANEL * w]], sideCol);
  const pine = (x: number, y: number, sz: number, snow: boolean) => {
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.beginPath();
    ctx.ellipse(x + sz * 0.1, y, sz * 0.32, sz * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#6b4a2e', '#2a1c12', night);
    ctx.fillRect(x - sz * 0.05, y - sz * 0.22, sz * 0.1, sz * 0.22);
    for (let k = 0; k < 3; k++) {
      const yy = y - sz * (0.18 + k * 0.26), ww = sz * (0.36 - k * 0.08);
      poly([[x - ww, yy], [x, yy - sz * 0.38], [x + ww, yy]], mix(k % 2 ? '#2f7a45' : '#286a3c', '#0f2a1a', night));
      if (snow) poly([[x - ww * 0.4, yy - sz * 0.22], [x, yy - sz * 0.38], [x + ww * 0.4, yy - sz * 0.22], [x, yy - sz * 0.27]], mix('#ffffff', '#a8b4d8', night));
    }
  };
  for (let k = 0; k < 7; k++) {
    const gy = -0.6 + k * 1.45;
    const [lx, ly] = P(-0.6 - hsh(k) * 0.3, gy), [rx, ry] = P(W + 0.6 + hsh(k + 9) * 0.3, gy + 0.6);
    pine(lx, ly, cw(gy) * 0.95, gy < 2.5);
    pine(rx, ry, cw(gy) * 0.95, gy < 2);
  }
  // ── 꼭대기 바위 턱 (바위들이 줄 서는 곳) ──
  {
    poly([P(-0.25, -1.3), P(W + 0.25, -1.3), P(W + 0.25, 0), P(-0.25, 0)], mix('#9b958a', '#3a3a4c', night));
    for (let k = 0; k < 9; k++) {
      const [sx, sy] = P(0.2 + k * 0.85, -1.05 + hsh(k * 7) * 0.5), c0 = cw(-0.8);
      ell(sx, sy, c0 * (0.35 + hsh(k) * 0.25), c0 * 0.1, mix('#f4f8fc', '#8a94c0', night));
    }
    for (let k = 0; k < 10; k++) {
      const [sx, sy] = P(0.1 + k * 0.75, -0.15 - hsh(k + 3) * 0.3), c0 = cw(-0.3);
      ell(sx, sy, c0 * 0.08, c0 * 0.05, 'rgba(60,55,50,.4)');
    }
  }
  // ── 비탈 (계단식, 뒤에서 앞으로): 칸마다 윗면 + 앞쪽 턱(흙·눈 단면) ──
  const RIS = w * 0.017;
  const groundCol = (r: number, c: number) => {
    const base = r < 1.5 ? '#eef4fa' : r < 2.5 ? '#d4ddd2' : r < 5 ? '#8fc76e' : '#79ba5b';
    const lit = 0.06 * (1 - c / W) - 0.03; // 왼쪽 위에서 오는 빛
    return mix(mix(mix(base, '#ffffff', Math.max(0, lit)), '#1a2440', night * 0.75), '#000000', ((r + c) % 2 ? 0.045 : 0) + Math.max(0, -lit));
  };
  const riserCol = (r: number) => mix(r === 0 ? '#8d8a84' : r < 1.5 ? '#a9bdd2' : r < 2.5 ? '#8f8a7e' : '#8a5a34', '#141826', night * 0.7);
  for (let r = 0; r < H; r++) {
    const top = RIS;
    for (let c = 0; c < W; c++) {
      const a0 = P(c, r), a1 = P(c + 1, r), b1 = P(c + 1, r + 1), b0 = P(c, r + 1);
      {
        poly([a0, a1, [a1[0], a1[1] + RIS], [a0[0], a0[1] + RIS]], riserCol(r));
        ctx.fillStyle = 'rgba(0,0,0,.12)';
        ctx.fillRect(a0[0], a0[1] + RIS * 0.55, a1[0] - a0[0], RIS * 0.45);
      }
      poly([[a0[0], a0[1] + top], [a1[0], a1[1] + top], b1, b0], groundCol(r, c));
    }
    // 턱 윗선: 풀·눈 가장자리가 살짝 밝다
    const [x0, y1] = P(0, r + 1), [x1] = P(W, r + 1);
    ctx.fillStyle = r + 1 < 2 ? 'rgba(255,255,255,.7)' : r + 1 < 3 ? 'rgba(230,235,225,.5)' : mix('#a8e07e', '#20402a', night);
    ctx.fillRect(x0, y1 - 1.5, x1 - x0, 2);
    // 풀·돌·눈 반짝이
    for (let c = 0; c < W; c++) {
      const k = r * W + c;
      if (L.terr[k] || s.piece[k]) continue;
      const [tx, ty] = P(c + 0.25 + hsh(k) * 0.5, r + 0.4 + hsh(k + 77) * 0.4), sz = cw(r) * 0.07;
      if (r < 2) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t / 18 + k)})`;
        ctx.fillRect(tx, ty, 1.6, 1.6);
        if (hsh(k * 5) < 0.4) ell(tx + sz * 2, ty + sz, sz * 2.2, sz * 0.6, 'rgba(150,175,205,.35)');
      } else if (hsh(k * 3) < 0.5) {
        ctx.strokeStyle = mix(r < 3 ? '#7a8a6a' : '#4f8f3e', '#1a3020', night);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(tx - sz, ty);
        ctx.lineTo(tx - sz * 0.4, ty - sz * 1.4);
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx, ty - sz * 1.8);
        ctx.moveTo(tx + sz, ty);
        ctx.lineTo(tx + sz * 0.5, ty - sz * 1.3);
        ctx.stroke();
      } else if (r >= 5 && hsh(k * 7) < 0.6) ell(tx, ty, sz * 0.7, sz * 0.7, ['#ffe066', '#ffffff', '#ff9ec4'][k % 3]);
      else ell(tx, ty, sz * 1.1, sz * 0.7, mix('#9a9488', '#40404c', night));
    }
  }
  // 양옆 바위 절벽 (튕기는 벽): 안쪽 그림자 + 솟은 바위 능선
  for (const side of [0, 1]) {
    const gx = side ? W : 0, sd = side ? 1 : -1;
    const sh = ctx.createLinearGradient(P(gx, 4)[0], 0, P(gx - sd * 0.35, 4)[0], 0);
    sh.addColorStop(0, `rgba(10,20,30,${0.32 - night * 0.1})`);
    sh.addColorStop(1, 'rgba(10,20,30,0)');
    poly([P(gx, -1.3), P(gx - sd * 0.35, -1.3), P(gx - sd * 0.35, 8), P(gx, 8)], sh);
    poly([P(gx, -1.3), P(gx + sd * 0.42, -1.3), P(gx + sd * 0.42, 8.3), P(gx, 8.3)], mix(side ? '#5f5b57' : '#76716a', '#22222e', night));
    poly([P(gx, -1.3), P(gx + sd * 0.12, -1.3), P(gx + sd * 0.12, 8.3), P(gx, 8.3)], mix(side ? '#4a4744' : '#55514c', '#1a1a24', night));
    for (let k = 0; k < 13; k++) {
      const gy = -1.1 + k * 0.72, [bx, by] = P(gx + sd * (0.24 + hsh(k * 3 + side) * 0.08), gy), r0 = cw(gy) * (0.17 + hsh(k + side * 31) * 0.07);
      ell(bx + r0 * 0.15, by + r0 * 0.35, r0 * 1.15, r0 * 0.55, 'rgba(0,0,0,.25)');
      ell(bx, by, r0 * 1.15, r0 * 0.85, mix(k % 2 ? '#a39d93' : '#8c867d', '#30303c', night));
      ell(bx - r0 * 0.3, by - r0 * 0.32, r0 * 0.5, r0 * 0.28, 'rgba(255,255,255,.25)');
      if (gy < 1.6) ell(bx - r0 * 0.1, by - r0 * 0.55, r0 * 0.8, r0 * 0.3, mix('#ffffff', '#9aa4d0', night));
    }
  }
  // ── 놓인 조각 ──
  const logCol = mix('#9a6236', '#3a2818', night * 0.6), logHi = mix('#c98a52', '#5a4028', night * 0.6), logEnd = mix('#efc98e', '#7a6040', night * 0.6);
  const drawLog = (cx: number, cy: number, c0: number, type: number, sc: number, rot: number) => {
    const L2 = c0 * 0.4 * sc, th2 = c0 * 0.2 * sc;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    const ang = type === PR ? 0.55 : type === PL ? -0.55 : 0;
    ctx.rotate(ang);
    ctx.fillStyle = 'rgba(20,20,10,.3)';
    ctx.beginPath();
    ctx.ellipse(th2 * 0.3, th2 * 0.75, L2 * 1.05, th2 * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    if (type === PS) {
      ctx.fillStyle = mix('#6b4426', '#2a1a10', night * 0.6);
      ctx.fillRect(-L2 * 0.7 - th2 * 0.15, -th2 * 0.9, th2 * 0.3, th2 * 1.8);
      ctx.fillRect(L2 * 0.7 - th2 * 0.15, -th2 * 0.9, th2 * 0.3, th2 * 1.8);
    }
    ctx.fillStyle = logCol;
    ctx.beginPath();
    ctx.roundRect(-L2, -th2 / 2, L2 * 2, th2, th2 / 2);
    ctx.fill();
    ctx.fillStyle = logHi;
    ctx.fillRect(-L2 + th2 * 0.4, -th2 * 0.36, L2 * 2 - th2 * 0.8, th2 * 0.22);
    ctx.strokeStyle = 'rgba(60,30,10,.45)';
    ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * L2 * 0.32, -th2 * 0.45);
      ctx.lineTo(k * L2 * 0.32 + th2 * 0.3, th2 * 0.45);
      ctx.stroke();
    }
    ell(L2 - th2 * 0.1, 0, th2 * 0.32, th2 * 0.5, logEnd);
    ctx.strokeStyle = 'rgba(120,70,30,.7)';
    ctx.beginPath();
    ctx.ellipse(L2 - th2 * 0.1, 0, th2 * 0.16, th2 * 0.26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };
  const bonkAge = new Map<number, number>();
  for (const e of s.events) if ((e.k === 'bonk' || e.k === 'thud' || e.k === 'over') && e.at <= t) bonkAge.set(e.y * W + e.x, age(e.at));
  for (let c = 0; c < NC; c++) {
    const p = s.piece[c];
    if (!p || (rolling || s.phase === 'result' ? s.brokeAt[c] <= t : false)) continue;
    const r = (c / W) | 0, [cx, cy] = P((c % W) + 0.5, r + 0.55), ag = age(s.placedT[c]);
    const sc = ag < 12 ? 1 + 0.5 * (1 - ag / 12) ** 2 : 1, ba = bonkAge.get(c) ?? 99;
    drawLog(cx, cy - (ag < 8 ? (8 - ag) * w * 0.006 : 0), cw(r), p, sc, ba < 24 ? Math.sin(ba * 0.9) * 0.25 * (1 - ba / 24) : 0);
  }
  // ── 예보 점선 ──
  const showFc = s.phase === 'build' || rolling;
  const fc = s.fc, marksLater: [[number, number], string][] = [];
  if (showFc) {
    for (let i = 0; i < L.n; i++) {
      if (rolling && wd.st[i] !== WAIT) continue;
      const sg2 = fc.seg[i], g = L.grp[i], col = COL[g % COL.length], off = (g - (L.ng - 1) / 2) * 0.07;
      ctx.globalAlpha = rolling ? 0.35 : 1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const pts: [number, number][] = [];
      let big = 0, bigMark = false;
      for (let q = 0; q < sg2.length; q += 6) {
        const x0 = sg2[q] + 0.5 + off, y0 = sg2[q + 1] + 0.5, x1 = sg2[q + 2] + 0.5 + off, y1 = sg2[q + 3] === H ? H + 0.45 : sg2[q + 3] + 0.5;
        const jump = q > 0 && (sg2[q] !== sg2[q - 4] || sg2[q + 1] !== sg2[q - 3]);
        if (!pts.length || jump || sg2[q + 5] !== big) {
          if (pts.length > 1) drawPath(pts, col, big === 1);
          if (jump && pts.length) stopMark(pts[pts.length - 1], col);
          pts.length = 0;
          pts.push(P(x0, y0));
          if (sg2[q + 5] && !bigMark && s.phase === 'build') (bigMark = true), marksLater.push([P(x0, y0), '💢']);
          big = sg2[q + 5];
        }
        if (sg2[q + 4]) pts.push(P(sg2[q + 4] > 0 ? W - 0.1 : 0.1, y0 + 0.5));
        pts.push(P(x1, y1));
      }
      if (pts.length > 1) drawPath(pts, col, big === 1);
      if (sg2.length && sg2[sg2.length - 3] !== H && pts.length) stopMark(pts[pts.length - 1], col);
      ctx.globalAlpha = 1;
    }
    for (const [[mx, my], tx] of marksLater) shout(mx + w * 0.035, my - w * 0.02, tx, Math.max(12, w * 0.034), '#ffffff');
    // 예보 표시: 딱 · 와지끈 · 머리
    if (s.phase === 'build')
      for (const mk of fc.marks) {
        const [mx, my] = P(mk.x + 0.5, mk.y + 0.5), sz = Math.max(12, w * 0.034);
        if (mk.k === 'clack') shout(mx, my - w * 0.035, '딱', sz, '#ffffff');
        else if (mk.k === 'smash') shout(mx, my - w * 0.035, '💥', sz, '#ffffff');
        else if (mk.k === 'snowman') shout(mx + w * 0.03, my - w * 0.07, '!', sz * 1.2, '#ff8080');
      }
  }
  function stopMark([x, y]: [number, number], col: string) {
    const r = Math.max(5, w * 0.016);
    ctx.fillStyle = 'rgba(20,20,30,.7)';
    ctx.beginPath();
    ctx.roundRect(x - r - 1.5, y - r - 1.5, r * 2 + 3, r * 2 + 3, 3);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.roundRect(x - r, y - r, r * 2, r * 2, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,20,30,.8)';
    ctx.fillRect(x - r * 0.45, y - r * 0.55, r * 0.3, r * 1.1);
    ctx.fillRect(x + r * 0.15, y - r * 0.55, r * 0.3, r * 1.1);
  }
  function drawPath(pts: [number, number][], col: string, bigSnow: boolean) {
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(20,20,30,.55)';
    ctx.lineWidth = w * (bigSnow ? 0.022 : 0.017);
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
    ctx.stroke();
    ctx.setLineDash([w * 0.022, w * 0.016]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.strokeStyle = col;
    ctx.lineWidth = w * (bigSnow ? 0.013 : 0.009);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // ── 지형·바위 (앞뒤 순서로) ──
  const items: { z: number; fn: () => void }[] = [];
  const fork = (() => {
    let d = L.fork;
    if (rolling || s.phase === 'result') for (const at of s.forkAt) if (at <= t) d = -d;
    return d;
  })();
  for (let c = 0; c < NC; c++) {
    const tr = L.terr[c];
    if (!tr) continue;
    const r = (c / W) | 0, [cx, cy] = P((c % W) + 0.5, r + 0.62), c0 = cw(r);
    if (tr === TREE) {
      if ((rolling || s.phase === 'result') && s.brokeAt[c] <= t) {
        items.push({ z: r + 0.5, fn: () => (ell(cx, cy, c0 * 0.2, c0 * 0.08, '#6b4a2e'), ell(cx, cy - 2, c0 * 0.16, c0 * 0.06, '#c9a070')) });
        continue;
      }
      items.push({ z: r + 0.62, fn: () => pine(cx, cy, c0 * 0.95, r < 3) });
    } else if (tr === FORK)
      items.push({
        z: r + 0.6,
        fn: () => {
          ctx.strokeStyle = 'rgba(120,90,60,.45)';
          ctx.lineWidth = c0 * 0.12;
          ctx.beginPath();
          ctx.moveTo(cx, cy - c0 * 0.35);
          ctx.lineTo(cx, cy - c0 * 0.05);
          ctx.lineTo(cx - c0 * 0.4, cy + c0 * 0.2);
          ctx.moveTo(cx, cy - c0 * 0.05);
          ctx.lineTo(cx + c0 * 0.4, cy + c0 * 0.2);
          ctx.stroke();
          ctx.fillStyle = mix('#7a5230', '#2a1c10', night * 0.6);
          ctx.fillRect(cx - c0 * 0.04, cy - c0 * 0.62, c0 * 0.08, c0 * 0.62);
          ctx.save();
          ctx.translate(cx, cy - c0 * 0.5);
          ctx.scale(fork, 1);
          poly([[-c0 * 0.26, -c0 * 0.12], [c0 * 0.16, -c0 * 0.12], [c0 * 0.32, 0], [c0 * 0.16, c0 * 0.12], [-c0 * 0.26, c0 * 0.12]], mix('#e8b860', '#6a5020', night * 0.5));
          ctx.restore();
          shout(cx, cy - c0 * 0.5, fork > 0 ? '→' : '←', Math.max(12, c0 * 0.26), '#ffffff');
        },
      });
    else if (tr === SNOWMAN) {
      const headless = (rolling || s.phase === 'result') && s.headAt <= t, ha = age(s.headAt);
      items.push({
        z: r + 0.62,
        fn: () => {
          ell(cx, cy, c0 * 0.26, c0 * 0.08, 'rgba(40,60,90,.25)');
          ell(cx, cy - c0 * 0.17, c0 * 0.22, c0 * 0.2, mix('#ffffff', '#aab4d8', night));
          ell(cx, cy - c0 * 0.45, c0 * 0.16, c0 * 0.15, mix('#ffffff', '#aab4d8', night));
          ell(cx, cy - c0 * 0.47, c0 * 0.025, c0 * 0.025, '#333333');
          ctx.strokeStyle = '#6b4a2e';
          ctx.lineWidth = 2;
          const up = headless ? -0.25 : 0.05, wav = headless ? Math.sin(t / 3) * 0.08 : 0;
          ctx.beginPath();
          ctx.moveTo(cx - c0 * 0.14, cy - c0 * 0.45);
          ctx.lineTo(cx - c0 * 0.38, cy - c0 * (0.55 - up + wav));
          ctx.moveTo(cx + c0 * 0.14, cy - c0 * 0.45);
          ctx.lineTo(cx + c0 * 0.38, cy - c0 * (0.55 - up - wav));
          ctx.stroke();
          const hx = headless ? cx + Math.min(ha, 40) * c0 * 0.035 : cx, hy = headless ? cy - c0 * 0.72 - Math.sin(Math.min(1, ha / 40) * Math.PI) * c0 * 0.9 + Math.min(ha, 40) * c0 * 0.012 : cy - c0 * 0.72;
          if (!headless || ha < 40) {
            ell(hx, hy, c0 * 0.12, c0 * 0.115, mix('#ffffff', '#aab4d8', night));
            ell(hx - c0 * 0.04, hy - c0 * 0.02, c0 * 0.018, c0 * 0.018, '#222222');
            ell(hx + c0 * 0.04, hy - c0 * 0.02, c0 * 0.018, c0 * 0.018, '#222222');
            poly([[hx, hy + c0 * 0.01], [hx + c0 * 0.12, hy + c0 * 0.03], [hx, hy + c0 * 0.05]], '#ff8a2a');
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(hx - c0 * 0.1, hy - c0 * 0.2, c0 * 0.2, c0 * 0.04);
            ctx.fillRect(hx - c0 * 0.065, hy - c0 * 0.3, c0 * 0.13, c0 * 0.1);
          } else shout(cx, cy - c0 * 0.75, '?!', Math.max(12, c0 * 0.3), '#ffffff');
        },
      });
    }
  }
  // 바위들
  const face = (x: number, y: number, r: number, mood: number, col = '#2a2420') => {
    // mood 0 심통 · 1 어질 · 2 놀람 · 3 흥(멈춤)
    ctx.fillStyle = '#ffffff';
    if (mood === 1) {
      shout(x - r * 0.33, y - r * 0.1, '@', r * 0.55, '#ffffff');
      shout(x + r * 0.33, y - r * 0.1, '@', r * 0.55, '#ffffff');
      return;
    }
    const er = mood === 2 ? r * 0.2 : r * 0.15;
    ell(x - r * 0.33, y - r * 0.1, er, er * (mood === 3 ? 0.5 : 1), '#ffffff');
    ell(x + r * 0.33, y - r * 0.1, er, er * (mood === 3 ? 0.5 : 1), '#ffffff');
    ell(x - r * 0.3, y - r * 0.08, er * 0.5, er * 0.5, col);
    ell(x + r * 0.36, y - r * 0.08, er * 0.5, er * 0.5, col);
    ctx.strokeStyle = col;
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.beginPath();
    if (mood === 0) {
      ctx.moveTo(x - r * 0.55, y - r * 0.42);
      ctx.lineTo(x - r * 0.15, y - r * 0.28);
      ctx.moveTo(x + r * 0.55, y - r * 0.42);
      ctx.lineTo(x + r * 0.15, y - r * 0.28);
      ctx.moveTo(x - r * 0.2, y + r * 0.32);
      ctx.lineTo(x + r * 0.2, y + r * 0.28);
    } else if (mood === 2) ctx.arc(x, y + r * 0.32, r * 0.13, 0, Math.PI * 2);
    else {
      ctx.moveTo(x - r * 0.2, y + r * 0.3);
      ctx.quadraticCurveTo(x, y + r * 0.2, x + r * 0.22, y + r * 0.32);
    }
    ctx.stroke();
  };
  const drawBody = (i: number, gx: number, gy: number, alpha = 1, sink = 0) => {
    const kd = wd.kind[i], [x, y] = P(gx, gy), c0 = cw(Math.max(-1, Math.min(VAL, gy))), moving = wd.st[i] === MOVE, rot = (s.moved[i] + (moving ? fr : 0)) * 1.4;
    const dz = moving && rolling ? Math.abs(Math.sin(fr * Math.PI)) * c0 * 0.08 : 0;
    const recent = (k: string) => s.events.some((e) => e.i === i && e.k === k && e.at <= t && t - e.at < 22);
    const mood = recent('bonk') || recent('clack') ? 1 : wd.st[i] === REST && rolling ? 3 : moving && fc.out[i] === V_CABIN ? 0 : moving ? 2 : 0;
    ctx.globalAlpha = alpha;
    if (kd === BOULDER) {
      const r = c0 * 0.36 * (1 - sink);
      ell(x + r * 0.15, y + r * 0.62, r * 0.95, r * 0.32, 'rgba(20,20,20,.3)');
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4 - dz, r * 0.1, x, y - dz, r);
      g.addColorStop(0, mix('#d9d4c9', '#7c80a0', night * 0.6));
      g.addColorStop(1, mix('#6d675f', '#2c2e44', night * 0.6));
      ell(x, y - dz, r, r * 0.95, g);
      ctx.strokeStyle = 'rgba(50,40,30,.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = 0; k < 3; k++) {
        const an = rot + k * 2.1;
        ctx.moveTo(x + Math.cos(an) * r * 0.85, y - dz + Math.sin(an) * r * 0.8);
        ctx.lineTo(x + Math.cos(an + 0.3) * r * 0.45, y - dz + Math.sin(an + 0.3) * r * 0.4);
      }
      ctx.stroke();
      ell(x + Math.cos(rot) * r * 0.5, y - dz + Math.sin(rot) * r * 0.45, r * 0.18, r * 0.12, 'rgba(90,140,70,.55)');
      if (sink < 0.5) face(x, y - dz, r, mood);
    } else if (kd === SNOW) {
      const r = c0 * (0.2 + 0.034 * Math.min(10, wd.size[i])) * (1 - sink), angry = wd.size[i] >= BIG;
      ell(x + r * 0.15, y + r * 0.6, r * 0.95, r * 0.3, 'rgba(30,50,90,.25)');
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4 - dz, r * 0.1, x, y - dz, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, mix('#b9d2ec', '#6a78a8', night));
      ell(x, y - dz, r, r * 0.96, g);
      for (let k = 0; k < 4; k++) ell(x + Math.cos(rot + k * 1.6) * r * 0.55, y - dz + Math.sin(rot + k * 1.6) * r * 0.5, r * 0.1, r * 0.07, 'rgba(150,180,215,.6)');
      if (sink < 0.5) face(x, y - dz, r, angry && moving ? 0 : mood, '#3a4a6a');
      if (angry && moving) shout(x + r * 0.9, y - r - dz, '💢', Math.max(12, r * 0.6), '#ffffff');
    } else if (kd === LOG) {
      const lw = c0 * 0.42, lh = c0 * 0.17 * (1 - sink);
      ell(x, y + lh * 1.3, lw * 1.05, lh * 0.6, 'rgba(20,20,10,.3)');
      ctx.fillStyle = logCol;
      ctx.beginPath();
      ctx.roundRect(x - lw, y - lh - dz, lw * 2, lh * 2, lh);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,10,.5)';
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 4; k++) {
        const yy = y - dz + Math.sin(rot + k * 1.57) * lh * 0.8;
        ctx.beginPath();
        ctx.moveTo(x - lw * 0.8, yy);
        ctx.lineTo(x + lw * 0.8, yy);
        ctx.stroke();
      }
      ell(x - lw + lh * 0.3, y - dz, lh * 0.5, lh * 0.95, logEnd);
      ell(x + lw - lh * 0.3, y - dz, lh * 0.5, lh * 0.95, logEnd);
      if (sink < 0.5) face(x, y - dz - lh * 0.1, lh * 1.3, mood, '#3a2010');
    } else {
      const n = Math.min(7, 3 + wd.size[i]), r = c0 * (0.2 + 0.04 * Math.min(6, wd.size[i])) * (1 - sink);
      ell(x, y + r * 0.8, r * 1.6, r * 0.4, 'rgba(30,50,90,.22)');
      for (let k = 0; k < n; k++) ell(x + Math.cos(k * 2.4 + rot * 0.3) * r * 0.8, y - dz + Math.sin(k * 2.4) * r * 0.45 - r * 0.2, r * 0.75, r * 0.6, k % 2 ? '#ffffff' : mix('#dfeeff', '#8a98c8', night));
      if (sink < 0.5) face(x, y - dz - r * 0.2, r, mood, '#3a4a6a');
    }
    ctx.globalAlpha = 1;
  };
  const centerOf = (i: number): [number, number] => {
    const tx = wd.x[i] + 0.5, ty = wd.st[i] === GONE && wd.out[i] >= 0 ? H + 0.45 : wd.y[i] + 0.5;
    if (!rolling) return [tx, ty];
    const ax = s.ax[i] + 0.5, ay = s.ay[i] + 0.5;
    if (!isNaN(s.vy[i])) {
      const vx = s.vx[i], vy = s.vy[i];
      return fr < 0.5 ? [ax + (vx - ax) * fr * 2, ay + (vy - ay) * fr * 2] : [vx + (tx - vx) * (fr - 0.5) * 2, vy + (ty - vy) * (fr - 0.5) * 2];
    }
    return [ax + (tx - ax) * fr, ay + (ty - ay) * fr];
  };
  const landed: number[] = [];
  for (let i = 0; i < wd.n; i++) {
    const st = wd.st[i];
    if (st === WAIT) {
      const [bx] = [wd.x[i] + 0.5], g = wd.grp[i];
      items.push({
        z: -0.5,
        fn: () => {
          const shake = rolling && wd.next === g ? Math.sin(t * 1.3) * w * 0.003 : 0;
          drawBody(i, bx + shake / w, -0.55);
          if (L.grp.indexOf(g) === i) {
            const [nx, ny] = P(bx + (L.kind[i] === CLUMP ? 1 : 0), -1.12), rr = Math.max(8, w * 0.024);
            ell(nx, ny, rr, rr, COL[g % COL.length]);
            ctx.strokeStyle = 'rgba(20,20,30,.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(nx, ny, rr, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#1a1a24';
            ctx.font = `900 ${rr * 1.3}px system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(NUM[g], nx, ny + 1);
          }
        },
      });
    } else if (st === GONE) {
      if (wd.out[i] === -2) {
        if (t - s.goneT[i] < STEP) {
          const [gx, gy] = centerOf(i);
          items.push({ z: gy, fn: () => drawBody(i, gx, gy, 1 - fr) });
        }
      } else landed.push(i);
    } else {
      const [gx, gy] = centerOf(i);
      items.push({ z: gy, fn: () => drawBody(i, gx, gy) });
    }
  }
  items.sort((p, q) => p.z - q.z);
  for (const it of items) it.fn();

  // ── 골짜기 (산장·연못·소풍) ──
  {
    const vg = ctx.createLinearGradient(0, P(0, 8)[1], 0, P(0, VAL)[1]);
    vg.addColorStop(0, mix('#86c068', '#1c3020', night * 0.8));
    vg.addColorStop(1, mix('#6aa84e', '#142818', night * 0.8));
    poly([P(-0.35, 8), P(W + 0.35, 8), P(W + 0.35, VAL), P(-0.35, VAL)], vg);
    // 앞면 흙층
    const [fx0, fy0] = P(-0.35, VAL), [fx1] = P(W + 0.35, VAL), dep = w * 0.07;
    const layers: [number, string][] = [[0.18, '#5a8a3c'], [0.42, '#8a5a34'], [0.7, '#6e4628'], [1, '#4e3420']];
    let y0 = fy0;
    for (const [to, col] of layers) {
      ctx.fillStyle = mix(col, '#140c08', night * 0.6);
      ctx.fillRect(fx0, y0, fx1 - fx0, fy0 + dep * to - y0 + 0.5);
      y0 = fy0 + dep * to;
    }
    for (let k = 0; k < 14; k++) ell(fx0 + hsh(k * 7) * (fx1 - fx0), fy0 + dep * (0.45 + hsh(k) * 0.45), w * 0.012, w * 0.007, mix('#a8988a', '#3a3030', night));
    ctx.fillStyle = mix('#2a2018', '#0c0806', night);
    ctx.fillRect(-14, fy0 + dep, w + 28, h);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(fx0, fy0 + dep, fx1 - fx0, w * 0.01);
  }
  const vcx = (c: number) => P(c + 0.5, 8.9);
  // 오솔길 (빈 칸)
  for (let c = 0; c < W; c++) {
    if (L.valley[c] !== V_NONE) continue;
    const [x, y] = vcx(c), c0 = cw(8.9);
    ell(x, y, c0 * 0.36, c0 * 0.16, mix('#c8b08a', '#3a3024', night * 0.8));
    for (let k = 0; k < 3; k++) ell(x + (hsh(c * 5 + k) - 0.5) * c0 * 0.8, y + (hsh(c + k * 3) - 0.5) * c0 * 0.4, 2, 2, ['#ffe066', '#ff9ec4', '#ffffff'][k]);
  }
  // 연못
  {
    const cols: number[] = [];
    for (let c = 0; c < W; c++) if (L.valley[c] === V_POND) cols.push(c);
    if (cols.length) {
      const [x0] = P(cols[0] + 0.12, 8.9), [x1, y] = P(cols[cols.length - 1] + 0.88, 8.9), rx = (x1 - x0) / 2, cx = (x0 + x1) / 2, ry = w * 0.05;
      ell(cx, y + 2, rx + 3, ry + 3, mix('#5a7a3c', '#14241a', night));
      const pg = ctx.createRadialGradient(cx - rx * 0.3, y - ry * 0.3, 2, cx, y, rx);
      pg.addColorStop(0, mix('#8ee0ff', '#2a4a80', night));
      pg.addColorStop(1, mix('#2f8fd0', '#122a58', night));
      ell(cx, y, rx, ry, pg);
      ctx.strokeStyle = `rgba(255,255,255,${0.45 - night * 0.2})`;
      ctx.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) {
        const rr = ((t * 0.3 + k * 20) % 60) / 60;
        ctx.globalAlpha = 1 - rr;
        ctx.beginPath();
        ctx.ellipse(cx + (k - 1) * rx * 0.4, y + (k % 2) * ry * 0.3, rx * 0.15 * (0.5 + rr), ry * 0.25 * (0.5 + rr), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const side of [-1, 1]) {
        const bx = cx + side * rx * 0.92;
        ctx.strokeStyle = mix('#3f7a32', '#12241a', night);
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(bx + k * 3 * side, y + ry * 0.3);
          ctx.lineTo(bx + k * 3 * side + Math.sin(t / 30 + k) * 2, y - ry * (1.2 + k * 0.3));
          ctx.stroke();
          ell(bx + k * 3 * side + Math.sin(t / 30 + k) * 2, y - ry * (1.2 + k * 0.3), 1.8, 3.5, '#7a4a28');
        }
      }
      ell(cx + rx * 0.45, y + ry * 0.2, w * 0.018, w * 0.008, mix('#4f9a3c', '#16301a', night));
      // 오리: 첨벙이면 펄쩍
      const sp = s.events.filter((e) => e.k === 'land' && e.e === V_POND && e.at <= t).map((e) => age(e.at)).reduce((m2, v) => Math.min(m2, v), 999);
      const jump = sp < 50 ? Math.sin((sp / 50) * Math.PI) * w * 0.09 : 0;
      const dx = Math.sin(t / 90) * rx * 0.45, dy = Math.sin(t / 14) * 1.5;
      ctx.save();
      ctx.translate(cx + dx, y - w * 0.01 + dy - jump);
      if (sp < 50) ctx.rotate(Math.sin(sp * 0.5) * 0.5);
      emoji('🦆', 0, 0, w * 0.075, 'bottom');
      ctx.restore();
      if (sp < 40) shout(cx + dx + w * 0.05, y - w * 0.09 - jump, '꽥!', Math.max(13, w * 0.04), '#fff4a0');
    }
  }
  // 소풍 토끼
  for (let c = 0; c < W; c++) {
    if (L.valley[c] !== V_PICNIC) continue;
    const [x, y] = vcx(c), c0 = cw(8.9);
    const hit = s.events.filter((e) => e.k === 'land' && e.e === V_PICNIC && e.x === c && e.at <= t).map((e) => age(e.at)).reduce((m2, v) => Math.min(m2, v), 999);
    const hitAny = (rolling || s.phase === 'result') && s.events.some((e) => e.k === 'land' && e.e === V_PICNIC && e.x === c && e.at <= t);
    const cheer = s.events.some((e) => e.k === 'land' && e.e === V_POND && e.at <= t && t - e.at < 70) || (s.phase === 'result' && s.result > 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, 0.45);
    ctx.rotate(hitAny ? 0.4 : 0);
    for (let k = 0; k < 4; k++)
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (k + j) % 2 ? mix('#ffffff', '#555577', night * 0.7) : mix('#e8423a', '#5a1a20', night * 0.7);
        ctx.fillRect(-c0 * 0.4 + k * c0 * 0.2, -c0 * 0.4 + j * c0 * 0.2, c0 * 0.2, c0 * 0.2);
      }
    ctx.restore();
    ell(x + c0 * 0.22, y - c0 * 0.05, c0 * 0.1, c0 * 0.07, '#b07a3a');
    for (let k = 0; k < 2; k++) {
      const hop = cheer ? Math.abs(Math.sin(t / 6 + k)) * c0 * 0.25 : Math.max(0, Math.sin(t / 40 + k * 2)) * c0 * 0.06;
      const fly = hit < 90 ? hit : hitAny ? 999 : -1;
      if (fly > 80) continue;
      const fxp = fly >= 0 ? (k ? 1 : -1) * fly * c0 * 0.05 : 0, fyp = fly >= 0 ? -Math.sin(Math.min(1, fly / 50) * Math.PI) * c0 * 1.2 : 0;
      ctx.save();
      ctx.translate(x + (k ? c0 * 0.12 : -c0 * 0.2) + fxp, y + c0 * 0.05 - hop + fyp);
      if (fly >= 0) ctx.rotate(fly * 0.25 * (k ? 1 : -1));
      emoji('🐰', 0, 0, w * 0.068, 'bottom');
      ctx.restore();
    }
    if (hit < 70) shout(x, y - c0 * 1.1, '으악!', Math.max(13, w * 0.04), '#ffd0d0');
    else if (cheer && s.phase !== 'result') shout(x, y - c0 * 0.85, '와아!', Math.max(12, w * 0.035), '#fff4a0');
  }
  // 산장 + 염소
  {
    const [x, by] = P(CAB + 0.5, 9.35), c0 = cw(9);
    const hitE = s.events.filter((e) => e.k === 'land' && e.e === V_CABIN && e.at <= t).map((e) => age(e.at)).reduce((m2, v) => Math.min(m2, v), 999);
    const damaged = (rolling || s.phase === 'result') && s.landAt.some((at, i) => i < wd.n && at <= t && wd.out[i] === V_CABIN);
    ctx.save();
    ctx.translate(x + (hitE < 30 ? Math.sin(hitE * 1.7) * (30 - hitE) * 0.25 : 0), by);
    const ww = c0 * 1.25, wh = c0 * 0.6, rh = c0 * 0.52, dx = c0 * 0.2, dy = c0 * 0.1;
    ell(dx * 0.5, 2, ww * 0.75, c0 * 0.12, 'rgba(0,0,0,.3)');
    // 옆면
    poly([[ww / 2, -wh], [ww / 2 + dx, -wh - dy], [ww / 2 + dx, -dy], [ww / 2, 0]], mix('#6e4224', '#24160c', night * 0.7));
    // 앞면 통나무 벽
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = mix(k % 2 ? '#9a6236' : '#a96e3e', '#3a2414', night * 0.65);
      ctx.beginPath();
      ctx.roundRect(-ww / 2 - c0 * 0.03, -wh + (k * wh) / 5, ww + c0 * 0.06, wh / 5 + 0.5, wh / 10);
      ctx.fill();
    }
    // 지붕
    const roof = mix(damaged ? '#7a3a2a' : '#b6452c', '#3a1610', night * 0.6);
    poly([[-ww / 2 - c0 * 0.1, -wh], [0, -wh - rh], [ww / 2 + c0 * 0.1, -wh]], roof);
    poly([[0, -wh - rh], [dx, -wh - rh - dy], [ww / 2 + c0 * 0.1 + dx, -wh - dy], [ww / 2 + c0 * 0.1, -wh]], mix('#8a3220', '#2a0e08', night * 0.6));
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(2, c0 * 0.05);
    ctx.beginPath();
    ctx.moveTo(-ww / 2 - c0 * 0.1, -wh);
    ctx.lineTo(0, -wh - rh);
    ctx.lineTo(ww / 2 + c0 * 0.1, -wh);
    ctx.stroke();
    if (damaged) {
      ctx.fillStyle = '#2a1a12';
      ctx.beginPath();
      ctx.moveTo(-ww * 0.15, -wh - rh * 0.6);
      ctx.lineTo(ww * 0.05, -wh - rh * 0.75);
      ctx.lineTo(ww * 0.12, -wh - rh * 0.35);
      ctx.lineTo(-ww * 0.05, -wh - rh * 0.3);
      ctx.fill();
    }
    // 굴뚝 + 연기
    ctx.fillStyle = mix('#7a6a60', '#2a2424', night * 0.6);
    ctx.fillRect(ww * 0.22, -wh - rh * 0.85, c0 * 0.12, rh * 0.45);
    for (let k = 0; k < 4; k++) {
      const ph = ((t + k * 25) % 100) / 100;
      ctx.fillStyle = `rgba(230,230,235,${0.5 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(ww * 0.28 + Math.sin(ph * 6 + k) * 4 + ph * c0 * 0.3, -wh - rh * 0.9 - ph * c0 * 0.8, 2 + ph * c0 * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
    // 문·창문 (밤엔 번진다)
    ctx.fillStyle = mix('#5a341c', '#20120a', night * 0.5);
    ctx.beginPath();
    ctx.roundRect(-c0 * 0.11, -wh * 0.72, c0 * 0.22, wh * 0.72, [c0 * 0.08, c0 * 0.08, 0, 0]);
    ctx.fill();
    ell(c0 * 0.06, -wh * 0.35, 1.6, 1.6, '#ffd27a');
    const glow = mix('#ffe9a8', '#ffc850', night);
    ctx.save();
    if (night > 0.2) (ctx.shadowColor = '#ffc850'), (ctx.shadowBlur = c0 * 0.5 * night);
    for (const sx of [-1, 1]) {
      ctx.fillStyle = night > 0.2 ? glow : mix('#bfe4ff', '#ffe9a8', f);
      ctx.fillRect(sx * c0 * 0.38 - c0 * 0.1, -wh * 0.72, c0 * 0.2, c0 * 0.18);
    }
    ctx.restore();
    ctx.strokeStyle = '#5a341c';
    ctx.lineWidth = 1.5;
    for (const sx of [-1, 1]) {
      ctx.strokeRect(sx * c0 * 0.38 - c0 * 0.1, -wh * 0.72, c0 * 0.2, c0 * 0.18);
      ctx.beginPath();
      ctx.moveTo(sx * c0 * 0.38, -wh * 0.72);
      ctx.lineTo(sx * c0 * 0.38, -wh * 0.72 + c0 * 0.18);
      ctx.stroke();
    }
    ctx.restore();
    // 염소 주인
    const mood = goatMood(s, hitE);
    drawGoat(ctx, x - c0 * 0.92, by + c0 * 0.05, w * 0.1, mood, t);
    const sayE = [...s.events].reverse().find((e) => e.k === 'say' && e.at <= t && t - e.at < 110);
    if (sayE?.text) bubble(ctx, x - c0 * 0.92, by - w * 0.135, sayE.text, Math.max(12, w * 0.035), w);
  }
  // 골짜기에 닿은 것들 (연못엔 가라앉고, 산장엔 튕기고, 오솔길은 굴러 떨어진다)
  for (const i of landed) {
    const ag = t - s.landAt[i], v = wd.out[i];
    if (ag < 0) {
      const [gx, gy] = centerOf(i);
      drawBody(i, gx, gy);
      continue;
    }
    const gx = wd.x[i] + 0.5;
    if (v === V_POND) {
      if (ag < 24) drawBody(i, gx, H + 0.45 + ag * 0.01, 1, Math.min(1, ag / 24));
      else if (ag < 70 && ag % 12 < 6) ell(P(gx, 8.95)[0] + Math.sin(ag) * 3, P(gx, 8.95)[1] - (ag - 24) * 0.3, 2.5, 2.5, 'rgba(255,255,255,.8)');
    } else if (v === V_CABIN) {
      if (ag < 40) drawBody(i, gx - ag * 0.02, H + 0.45 - Math.sin(Math.min(1, ag / 40) * Math.PI) * 0.9, 1 - ag / 40);
    } else if (v === V_PICNIC) drawBody(i, gx, H + 0.45 + Math.min(ag, 12) * 0.03);
    else if (ag < 45) {
      const gy = H + 0.45 + ag * 0.03 + (ag > 25 ? (ag - 25) ** 2 * 0.004 : 0);
      drawBody(i, gx, gy, ag > 25 ? 1 - (ag - 25) / 20 : 1);
    }
  }
  // 예보 끝 표시 (짓는 중)
  if (s.phase === 'build') {
    for (let i = 0; i < L.n; i++) {
      const sg2 = fc.seg[i];
      if (!sg2.length || sg2[sg2.length - 3] !== H) continue;
      const col = sg2[sg2.length - 4], [x, y] = P(col + 0.5, H + 0.5), v = fc.out[i], pulse = 1 + 0.12 * Math.sin(t / 6);
      if (v === V_CABIN) shout(x, y - w * 0.11, '💥', Math.max(16, w * 0.06) * pulse, '#ffffff');
      else if (v === V_POND) shout(x, y - w * 0.02, '💦', Math.max(13, w * 0.042), '#ffffff');
      else if (v === V_PICNIC) shout(x, y - w * 0.07, '❗', Math.max(13, w * 0.042) * pulse, '#ffffff');
    }
  }
  ctx.restore();
  drawHud(ctx, s, w, h, th);
  // 첫 안내: 바위 길 위에 톡
  if (s.lv === 0 && s.used === 0 && s.phase === 'build') {
    const [hx, hy] = P(CAB + 0.5, 5.5), bob = Math.sin(t / 8) * w * 0.012;
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t / 8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(hx, hy, cw(5.5) * 0.45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    emoji('👆', hx + w * 0.05, hy + w * 0.06 + bob, w * 0.08);
    const ty = P(0, 3.2)[1];
    ctx.fillStyle = 'rgba(20,30,40,.78)';
    ctx.beginPath();
    ctx.roundRect(w * 0.08, ty - w * 0.045, w * 0.84, w * 0.09, w * 0.03);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(13, w * 0.042)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆 점선 위에 톡 — 통나무가 바위를 꺾어요', w / 2, ty);
  }
}

function goatMood(s: SlideState, hitAge: number): string {
  if (hitAge < 140 || (s.phase === 'result' && s.result < 0)) return 'dizzy';
  if (s.phase === 'result') return 'proud';
  const relief = s.events.some((e) => e.k === 'say' && e.at <= s.t && s.t - e.at < 60 && /휴|좋아|비켰|첨벙/.test(e.text ?? ''));
  if (relief) return 'relief';
  if (s.phase === 'roll') {
    for (let i = 0; i < s.w.n; i++) if (s.w.st[i] === MOVE && s.fc.out[i] === V_CABIN) return 'scared';
    return 'brace';
  }
  return s.fc.hits ? 'worry' : 'smug';
}

/** 염소 산장 주인 (정면 얼굴, 가로 동공) */
function drawGoat(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, mood: string, t: number) {
  const bob = mood === 'proud' ? Math.abs(Math.sin(t / 6)) * sz * 0.14 : mood === 'scared' ? Math.sin(t * 1.5) * sz * 0.02 : Math.sin(t / 22) * sz * 0.02;
  const by = y - bob;
  const fill = (fs: string) => ((ctx.fillStyle = fs), ctx.fill());
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, sz * 0.42, sz * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#4a3a30';
  ctx.lineWidth = sz * 0.08;
  ctx.lineCap = 'round';
  for (const lx of [-0.26, -0.1, 0.1, 0.26]) {
    ctx.beginPath();
    ctx.moveTo(x + lx * sz, by - sz * 0.25);
    ctx.lineTo(x + lx * sz + (mood === 'proud' ? Math.sin(t / 3 + lx * 9) * sz * 0.05 : 0), y - sz * 0.02);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(x, by - sz * 0.36, sz * 0.38, sz * 0.21, 0, 0, Math.PI * 2);
  fill('#f4efe6');
  ctx.beginPath();
  ctx.ellipse(x - sz * 0.38, by - sz * 0.44, sz * 0.06, sz * 0.09, -0.6, 0, Math.PI * 2);
  fill('#e8e0d2');
  const hx = x + sz * 0.12, hy = by - sz * 0.7, hr = sz * 0.2;
  // 뿔
  ctx.strokeStyle = '#c9a66b';
  ctx.lineWidth = sz * 0.07;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * hr * 0.45, hy - hr * 0.7);
    ctx.quadraticCurveTo(hx + sd * hr * 0.6, hy - hr * 1.6, hx + sd * hr * 1.25, hy - hr * 1.35);
    ctx.stroke();
  }
  // 귀
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(hx + sd * hr * 1.15, hy - hr * 0.15, hr * 0.5, hr * 0.2, sd * 0.35, 0, Math.PI * 2);
    fill('#efe7da');
    ctx.beginPath();
    ctx.ellipse(hx + sd * hr * 1.15, hy - hr * 0.15, hr * 0.3, hr * 0.1, sd * 0.35, 0, Math.PI * 2);
    fill('#f2b8b0');
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr, hr * 1.05, 0, 0, Math.PI * 2);
  fill('#faf6ee');
  ctx.beginPath();
  ctx.ellipse(hx, hy + hr * 0.55, hr * 0.62, hr * 0.45, 0, 0, Math.PI * 2);
  fill('#efe4d4');
  // 수염
  ctx.beginPath();
  ctx.moveTo(hx - hr * 0.2, hy + hr * 0.95);
  ctx.lineTo(hx, hy + hr * 1.55 + Math.sin(t / 10) * hr * 0.05);
  ctx.lineTo(hx + hr * 0.2, hy + hr * 0.95);
  fill('#e0d6c4');
  // 눈
  const ex = hr * 0.42, ey = hy - hr * 0.15;
  ctx.strokeStyle = '#2a2420';
  ctx.lineWidth = Math.max(1.5, sz * 0.03);
  if (mood === 'relief' || mood === 'proud') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(hx + sd * ex, ey + hr * 0.05, hr * 0.17, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (mood === 'dizzy') {
    for (const sd of [-1, 1]) {
      const cx = hx + sd * ex, r = hr * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx - r, ey - r);
      ctx.lineTo(cx + r, ey + r);
      ctx.moveTo(cx + r, ey - r);
      ctx.lineTo(cx - r, ey + r);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const an = t / 8 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#ffe066';
      ctx.font = `900 ${Math.max(10, sz * 0.18)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★', hx + Math.cos(an) * hr * 1.4, hy - hr * 1.5 + Math.sin(an) * hr * 0.4);
    }
  } else if (mood === 'brace') {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + sd * (ex + hr * 0.15), ey - hr * 0.12);
      ctx.lineTo(hx + sd * (ex - hr * 0.12), ey);
      ctx.lineTo(hx + sd * (ex + hr * 0.15), ey + hr * 0.12);
      ctx.stroke();
    }
  } else {
    const big = mood === 'scared' ? 1.45 : 1, half = mood === 'smug';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(hx + sd * ex, ey, hr * 0.2 * big, hr * (half ? 0.11 : 0.18) * big, 0, 0, Math.PI * 2);
      fill('#f2d36a');
      ctx.fillStyle = '#1e1a16';
      ctx.fillRect(hx + sd * ex - hr * 0.13 * big, ey - hr * 0.035, hr * 0.26 * big, hr * 0.07);
      if (half) {
        ctx.beginPath();
        ctx.moveTo(hx + sd * ex - hr * 0.24, ey - hr * 0.06);
        ctx.lineTo(hx + sd * ex + hr * 0.24, ey - hr * 0.06);
        ctx.stroke();
      }
    }
    if (mood === 'worry' || mood === 'scared') {
      ctx.beginPath();
      for (const sd of [-1, 1]) {
        ctx.moveTo(hx + sd * (ex + hr * 0.18), ey - hr * 0.32);
        ctx.lineTo(hx + sd * (ex - hr * 0.16), ey - hr * 0.44);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(hx + hr * 1.05, hy - hr * 0.55 + ((t / 2) % 10) * 0.3, hr * 0.12, hr * 0.18, 0, 0, Math.PI * 2);
      fill('#9ad8ff');
    }
  }
  // 입
  ctx.beginPath();
  if (mood === 'scared' || mood === 'dizzy') {
    ctx.ellipse(hx, hy + hr * 0.6, hr * 0.16, hr * 0.2, 0, 0, Math.PI * 2);
    fill('#7a3030');
  } else if (mood === 'proud' || mood === 'relief' || mood === 'smug') {
    ctx.arc(hx, hy + hr * 0.45, hr * 0.25, 0.2, Math.PI - 0.2);
    ctx.stroke();
    if (mood === 'proud') {
      ctx.beginPath();
      ctx.ellipse(hx - hr * 0.7, hy + hr * 0.25, hr * 0.15, hr * 0.08, 0, 0, Math.PI * 2);
      ctx.ellipse(hx + hr * 0.7, hy + hr * 0.25, hr * 0.15, hr * 0.08, 0, 0, Math.PI * 2);
      fill('rgba(255,120,120,.5)');
    }
  } else if (mood === 'brace') {
    ctx.moveTo(hx - hr * 0.25, hy + hr * 0.6);
    ctx.lineTo(hx + hr * 0.25, hy + hr * 0.6);
    ctx.stroke();
  } else {
    ctx.moveTo(hx - hr * 0.18, hy + hr * 0.62);
    ctx.quadraticCurveTo(hx, hy + hr * (mood === 'worry' ? 0.5 : 0.7), hx + hr * 0.18, hy + hr * 0.62);
    ctx.stroke();
  }
  ell2(ctx, hx - hr * 0.12, hy + hr * 0.35, hr * 0.05, '#8a6a5a');
  ell2(ctx, hx + hr * 0.12, hy + hr * 0.35, hr * 0.05, '#8a6a5a');
}
function ell2(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 800) {
  let sz = size;
  do ctx.font = `${weight} ${sz}px system-ui, sans-serif`;
  while (ctx.measureText(text).width > maxW && (sz -= 0.5) > 12);
  ctx.fillText(text, x, y);
}

function pieceIcon(ctx: CanvasRenderingContext2D, type: number, x: number, y: number, sz: number) {
  const L2 = sz * 0.42, th = sz * 0.2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(type === PR ? 0.6 : type === PL ? -0.6 : 0);
  if (type === PS) {
    ctx.fillStyle = '#6b4426';
    ctx.fillRect(-L2 * 0.7 - th * 0.15, -th * 0.9, th * 0.3, th * 1.8);
    ctx.fillRect(L2 * 0.7 - th * 0.15, -th * 0.9, th * 0.3, th * 1.8);
  }
  ctx.fillStyle = '#9a6236';
  ctx.beginPath();
  ctx.roundRect(-L2, -th / 2, L2 * 2, th, th / 2);
  ctx.fill();
  ctx.fillStyle = '#c98a52';
  ctx.fillRect(-L2 + th * 0.4, -th * 0.36, L2 * 2 - th * 0.8, th * 0.22);
  ctx.fillStyle = '#efc98e';
  ctx.beginPath();
  ctx.ellipse(L2 - th * 0.1, 0, th * 0.32, th * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: SlideState, w: number, h: number, th: Theme) {
  const HUD = w * 0.115, fs = Math.max(12, w * 0.036), L = s.L;
  ctx.fillStyle = 'rgba(16,26,38,.82)';
  ctx.fillRect(0, 0, w, HUD);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(13, w * 0.042)}px system-ui, sans-serif`;
  ctx.fillText(`${s.lv + 1}/${LEVELS}판 ${TPL[L.tpl].name}`, w * 0.03, HUD * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.accent;
  ctx.fillText(`★${s.stars}`, w * 0.76, HUD * 0.3);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w * 0.97, HUD * 0.3);
  // 별 조건: 짓는 중엔 예보, 버티는 중엔 지금까지
  let hits = s.fc.hits, splash = s.fc.splash, harm = s.fc.harm, pre = '예보';
  if (s.phase !== 'build') {
    hits = splash = harm = 0;
    pre = s.phase === 'roll' ? '지금' : '결과';
    for (let i = 0; i < s.w.n; i++) {
      if (s.landAt[i] > s.t) continue;
      const v = s.w.out[i];
      if (v === V_CABIN) hits++;
      if (v === V_POND) splash++;
      if (v === V_PICNIC) harm++;
    }
    if (s.headAt <= s.t) harm++;
  }
  const hasBy = L.valley.includes(V_PICNIC) || L.terr.includes(SNOWMAN);
  const chips: [string, boolean][] = [['🏠 산장', !hits], ['💦 첨벙', splash > 0], [hasBy ? (L.terr.includes(SNOWMAN) ? '⛄🐰 무사' : '🐰 무사') : '😊 무사', !harm]];
  ctx.textAlign = 'left';
  ctx.font = `800 ${fs}px system-ui, sans-serif`;
  ctx.fillStyle = th.muted;
  ctx.fillText(pre, w * 0.03, HUD * 0.74);
  let cx = w * 0.03 + ctx.measureText(pre).width + w * 0.02;
  for (const [label, ok] of chips) {
    const text = `${label} ${ok ? '✓' : '✗'}`, tw = ctx.measureText(text).width + w * 0.03;
    ctx.fillStyle = ok ? 'rgba(80,200,120,.3)' : 'rgba(255,90,80,.3)';
    ctx.beginPath();
    ctx.roundRect(cx, HUD * 0.74 - fs * 0.72, tw, fs * 1.44, fs * 0.5);
    ctx.fill();
    ctx.fillStyle = ok ? '#c8ffd8' : '#ffd0c8';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, cx + w * 0.015, HUD * 0.74);
    cx += tw + w * 0.015;
  }
  // 알림 (차례로)
  const live = s.notes.filter((n) => n.at <= s.t && s.t - n.at < 200).slice(-1);
  live.forEach((n) => {
    const ag = s.t - n.at, y = HUD + w * 0.032, al = Math.min(1, ag / 8, (200 - ag) / 20);
    ctx.globalAlpha = al;
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    const tw = Math.min(w * 0.94, ctx.measureText(n.text).width + w * 0.05);
    ctx.fillStyle = 'rgba(16,26,38,.8)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, y - fs * 0.85, tw, fs * 1.7, fs * 0.6);
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.textAlign = 'center';
    fitText(ctx, n.text, w / 2, y, w * 0.9, fs);
    ctx.globalAlpha = 1;
  });
  // 아래 판: 지금 조각 + 다음 + ▶
  const py = PANEL * w, ph = h - py;
  const pg = ctx.createLinearGradient(0, py, 0, h);
  pg.addColorStop(0, '#5a3a22');
  pg.addColorStop(1, '#3a2414');
  ctx.fillStyle = pg;
  ctx.fillRect(0, py, w, ph);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  for (let k = 1; k < 3; k++) ctx.fillRect(0, py + (ph * k) / 3, w, 1);
  ctx.fillStyle = 'rgba(255,220,170,.25)';
  ctx.fillRect(0, py, w, 2);
  ctx.textBaseline = 'middle';
  if (s.phase === 'build') {
    const left = L.pieces.length - s.used;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4dcb8';
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    if (left > 0) {
      ctx.fillText('지금', w * 0.11, py + ph * 0.14);
      ctx.fillStyle = 'rgba(255,224,140,.22)';
      ctx.beginPath();
      ctx.roundRect(w * 0.03, py + ph * 0.26, w * 0.16, ph * 0.42, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,224,140,.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
      pieceIcon(ctx, L.pieces[s.used], w * 0.11, py + ph * 0.47, w * 0.14);
      ctx.fillStyle = '#f4dcb8';
      ctx.font = `800 ${fs}px system-ui, sans-serif`;
      if (left > 1) ctx.fillText('다음', w * 0.3, py + ph * 0.14);
      for (let k = 1; k < Math.min(3, left); k++) {
        ctx.globalAlpha = 1 - (k - 1) * 0.22;
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        ctx.beginPath();
        ctx.roundRect(w * (0.13 + 0.115 * k), py + ph * 0.3, w * 0.1, ph * 0.34, 8);
        ctx.fill();
        pieceIcon(ctx, L.pieces[s.used + k], w * (0.18 + 0.115 * k), py + ph * 0.47, w * 0.085);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(13, w * 0.04)}px system-ui, sans-serif`;
      ctx.fillText(`남은 ${left}`, w * 0.555, py + ph * 0.47);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      fitText(ctx, `${PIECE_N[L.pieces[s.used]]} — ${PIECE_TIP[L.pieces[s.used]]}`, w / 2, py + ph * 0.85, w * 0.95, fs);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(14, w * 0.045)}px system-ui, sans-serif`;
      ctx.fillText('다 놓았어요 — 굴러온다!', w * 0.4, py + ph * 0.45);
    }
    if (s.lv > 0 && left > 0) {
      const bx = BTN.x * w, by = BTN.y * w, bw = BTN.w * w, bh = BTN.h * w, pulse = s.fc.hits === 0 ? 0.5 + 0.5 * Math.sin(s.t / 7) : 0;
      ctx.fillStyle = s.fc.hits === 0 ? `rgb(${Math.round(70 + 40 * pulse)},${Math.round(170 + 30 * pulse)},90)` : '#7a6a58';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh * 0.35);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fillRect(bx + bh * 0.3, by + bh - 3, bw - bh * 0.6, 3);
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(13, w * 0.04)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('▶ 버티기', bx + bw / 2, by + bh / 2);
    }
  } else if (s.phase === 'roll') {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.max(13, w * 0.04)}px system-ui, sans-serif`;
    ctx.fillText('버티는 중…', w * 0.04, py + ph * 0.3);
    let x = w * 0.04;
    for (let g = 0; g < L.ng; g++) {
      const i = L.grp.indexOf(g), st = s.w.st[i], v = s.w.out[i], landed = st === GONE && s.landAt[i] <= s.t;
      const mark = st === WAIT ? KIND_E[L.kind[i]] : landed ? (v === V_CABIN ? '💥' : v === V_POND ? '💦' : v === V_PICNIC ? '😵' : '✓') : st === REST ? '⏸' : '…';
      ctx.fillStyle = COL[g % COL.length];
      ctx.beginPath();
      ctx.arc(x + w * 0.035, py + ph * 0.66, w * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(13, w * 0.04)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(mark, x + w * 0.035, py + ph * 0.67);
      x += w * 0.1;
    }
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = s.result > 0 ? '#ffe066' : '#ffb0a8';
    ctx.font = `900 ${Math.max(16, w * 0.055)}px system-ui, sans-serif`;
    const last = s.lv + 1 >= LEVELS && s.result > 0;
    ctx.fillText(s.result > 0 ? `${'★'.repeat(s.result)}${'☆'.repeat(3 - s.result)} ${last ? '산장을 다 지켰어요!' : '산장 무사!'}` : s.hearts > 0 ? '💔 산장이 쿵! 다시 지어요' : '💔 산장이…', w / 2, py + ph * 0.38);
    ctx.fillStyle = '#f4dcb8';
    ctx.font = `800 ${fs}px system-ui, sans-serif`;
    ctx.fillText(s.result > 0 ? (last ? `별 ${s.stars}개 · 점수 ${s.stars * 10 + 30}` : '톡 — 다음 판') : s.hearts > 0 ? '같은 바위가 다시 와요 · 톡' : `별 ${s.stars}개`, w / 2, py + ph * 0.74);
  }
}
