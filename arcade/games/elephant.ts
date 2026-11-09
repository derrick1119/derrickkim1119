/**
 * 코끼리 물뿌리개 정원 (20라운드 새 아이디어) — 꾹 눌렀다 떼기 × 농사·수확 × 꾸미기.
 * 기준 9(손이 하는 일은 하나): 코끼리는 정원 뒤 개울가를 뒤뚱뒤뚱 오간다. 꾹 누르면 그 자리에 멈춰 개울물을 쭉 빨아들이고
 *   (볼과 코가 빵빵 — 누를수록 물 표시가 한 줄씩 멀어진다), 떼면 '푸하!' 물 표시 자리로 물이 날아간다.
 *   → '언제 누를지'가 어느 줄, '얼마나 누를지(언제 뗄지)'가 얼마나 멀리. 너무 오래 빨면 딸꾹! 물이 제 머리 위로 쏟아진다.
 * 와우: 물 닿은 봉오리가 퐁퐁 피고 나비가 온다. 첫 푸하엔 무지개가 뜨고 꽃밭 한 줄이 한꺼번에 핀다.
 * 고민: 가운데는 물 2, 둘레는 물 1. 멀리(세게) 뿜을수록 넓게 튄다. 봉오리는 물 2면 피고, 핀 꽃은 물 4면 녹아 웅덩이.
 *       자는 개구리·산책하는 고양이가 젖으면 화나서 코끼리를 때린다(물 -1, 부르르 털면 옆 칸에 물이 튄다).
 * 판 = 하루. 물줄기 몇 번으로 해 질 때까지 정원 점수(핀 꽃 + 나비) 목표를 채우면 별 1~3, 못 채우면 하트 -1 그날 다시. 7일.
 * 펼쳐짐: 봉오리·무지개·나비·가득 찬 꽃(1일) → 졸린 개구리(2일) → 해바라기(3일, 네 모금·코끼리를 바라봄) → 산책 고양이(4일, 움직이는 장애물)
 *        → 바람(5일, 떼는 순간의 바람 쪽으로 한 칸) → 달맞이꽃(6일, 해 질 녘에만 마심) → 꽃 잔치(7일).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const COLS = 7, ROWS = 6, NC = COLS * ROWS, A = 1.25;
/** 하루 길이 · 밤 · 날 수 · 해 질 녘(달맞이꽃이 열리는 때) */
const DAY = 1320, NIGHT = 120, DAYS = 7, EVE = 760;
/** 누른 시간 → 물 표시 줄: H0틱부터 RT틱마다 한 줄 멀리. HIC틱을 넘기면 딸꾹 */
const H0 = 8, RT = 15, HIC = 114, DIZZY = 54;
/** 코끼리 걸음: REST틱 서 있다가 MOVE틱 동안 한 칸 */
const REST = 18, MOVE = 12, STEP = REST + MOVE;
const SOIL = 0, BUD = 1, BLOOM = 2, PUDDLE = 3, WILT = 4;
const NORMAL = 0, SUNF = 1, MOONF = 2;
/** 종류별: 피는 물 · 녹는 물 · 정원 점수 */
const BLOOM_AT = [2, 4, 2], MELT_AT = [4, 6, 4], WORTH = [1, 3, 2];
const SPRAYS = [6, 6, 6, 6, 7, 7, 7];
/** 새 봉오리 수 (1일째는 줄마다 셋씩 목마른 봉오리) */
const BUDS = [0, 6, 5, 5, 6, 4, 5];
const WSEG = 200;
/** 날마다 해 질 녘 정원 점수(핀 꽃 + 나비) 목표 ★·★★·★★★ — 핀 꽃은 남으니 앞서 키운 정원이 다음 날을 쉽게 한다 */
const GOALS = [[6, 12, 16], [12, 19, 24], [17, 25, 31], [22, 31, 36], [27, 37, 44], [32, 44, 51], [37, 50, 58]];
const FLY = (row: number) => 14 + row * 3;

const NB4: number[][] = [];
for (let k = 0; k < NC; k++) {
  const c = k % COLS, r = (k / COLS) | 0, a: number[] = [];
  if (c > 0) a.push(k - 1);
  if (c < COLS - 1) a.push(k + 1);
  if (r > 0) a.push(k - COLS);
  if (r < ROWS - 1) a.push(k + COLS);
  NB4.push(a);
}
/** 고양이 산책길 (가운데를 빙 도는 고리) */
const LOOP: number[] = [];
for (let i = 1; i <= 5; i++) LOOP.push(COLS + i);
for (let r = 2; r <= 4; r++) LOOP.push(r * COLS + 5);
for (let i = 4; i >= 1; i--) LOOP.push(4 * COLS + i);
for (let r = 3; r >= 2; r--) LOOP.push(r * COLS + 1);
const CATV = 1 / 50;
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;

export interface Garden { kind: Uint8Array; sp: Uint8Array; water: Uint8Array; hue: Uint8Array; t: Int32Array; wet: Int32Array }
export interface Shot { t0: number; at: number; from: number; tc: number; row: number; pow: number; first: boolean; drift: number }
interface Ev { t: number; kind: string; k: number; text?: string }
interface Note { t: number; text: string; color: string }
export interface ElephantState {
  rng: Rng; t: number; day: number; dayT: number; phase: 'day' | 'night'; pause: number; retry: boolean; won: boolean; dead: boolean;
  g: Garden; frogs: number[]; onHead: number; catPh: number; catGone: boolean; wind: Int8Array;
  wk: number; col: number; charge: number; latch: boolean; dizzy: number; shot: Shot | null; left: number; used: number; presses: number; fast: boolean;
  meter: number; blooms: number; flies: number; buds: number; startMeter: number;
  hearts: number; stars: number; cleared: number; dayStars: number;
  seen: Set<string>; events: Ev[]; notes: Note[];
}

const ev = (s: ElephantState, kind: string, k: number, text?: string) => s.events.push({ t: s.t, kind, k, text });
const note = (s: ElephantState, text: string, color = '#ffffff') => s.notes.push({ t: s.t, text, color });
function see(s: ElephantState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, text, '#ffe08a');
}

// ───────────────────────────── 걸음·물줄기 ─────────────────────────────
const tri = (m: number) => {
  const q = ((m % 12) + 12) % 12;
  return q <= 6 ? q : 12 - q;
};
const smooth = (u: number) => u * u * (3 - 2 * u);
/** 걸음 시계 wk일 때 코끼리 위치(줄). 3번 줄에서 오른쪽으로 출발해 양 끝에서 돌아선다 */
export function walkX(wk: number) {
  const n = Math.floor(wk / STEP), p = wk - n * STEP, a = tri(n + 3);
  if (p < REST) return a;
  return a + (tri(n + 4) - a) * smooth((p - REST) / MOVE);
}
/** 지금부터 몇 틱 더 걸어야 c번 줄 앞에서 누를 수 있나 (지금 누르면 c면 0) */
export function arriveIn(wk: number, c: number) {
  if (Math.round(walkX(wk)) === c) return 0;
  for (let t = 1; t < STEP * 13; t++) if (Math.round(walkX(wk + t)) === c) return t;
  return 9999;
}
/** 누른 시간 → 물 표시 줄 (0 = 코끼리 바로 앞) */
export const rowOf = (h: number) => Math.max(0, Math.min(ROWS - 1, Math.floor((h - H0) / RT)));
export const holdFor = (row: number) => H0 + RT * row + Math.floor(RT / 2);
/** 세기: 가까이(퓨~) 옆으로 셋 · 중간(푸하) 십자 다섯 · 멀리(푸와아악) 아홉 칸 */
export const powOf = (row: number) => (row <= 1 ? 0 : row <= 3 ? 1 : 2);
export const windAt = (s: ElephantState, dayT: number) => (s.day >= 4 ? s.wind[Math.min(s.wind.length - 1, Math.max(0, Math.floor(dayT / WSEG)))] : 0);
export function catAt(s: ElephantState, dayT: number): { u: number; cell: number } | null {
  if (s.day < 3 || s.catGone) return null;
  const u = (s.catPh + dayT * CATV) % LOOP.length;
  return { u, cell: LOOP[Math.round(u) % LOOP.length] };
}
const catXY = (u: number): [number, number] => {
  const a = LOOP[Math.floor(u) % LOOP.length], b = LOOP[(Math.floor(u) + 1) % LOOP.length], f = u - Math.floor(u);
  return [(a % COLS) + ((b % COLS) - (a % COLS)) * f + 0.5, ((a / COLS) | 0) + (((b / COLS) | 0) - ((a / COLS) | 0)) * f + 0.5];
};

/** 물이 닿는 칸과 양: 가운데 2, 둘레 1. 게임의 첫 푸하는 무지개 물보라 — 그 줄 전체가 젖는다 */
export function pattern(tc: number, row: number, pow: number, first: boolean): [number, number][] {
  const out: [number, number][] = [];
  const add = (c: number, r: number, a: number) => {
    if (c >= 0 && c < COLS && r >= 0 && r < ROWS) out.push([r * COLS + c, a]);
  };
  add(tc, row, 2);
  if (first) {
    for (let c = 0; c < COLS; c++) if (c !== tc) add(c, row, 1);
    return out;
  }
  for (let dr = -1; dr <= 1; dr++)
    for (let dc = -1; dc <= 1; dc++) {
      if ((!dr && !dc) || (pow === 0 && dr) || (pow === 1 && dr && dc)) continue;
      add(tc + dc, row + dr, 1);
    }
  return out;
}

/** 칸마다 결과 (미리 보기·봇) */
const C_WET = 1, C_DRINK = 2, C_FULL = 3, C_BLOOM = 4, C_MELT = 5, C_SOAK = 6, C_SHUT = 7;
const amt = new Int8Array(NC), codes = new Uint8Array(NC), tmpKind = new Uint8Array(NC);
const qbuf = new Int16Array(NC), vis = new Uint8Array(NC);
/** 나비: 이어진 꽃밭마다 꽃 셋에 한 마리 */
function fliesOf(kind: Uint8Array) {
  vis.fill(0);
  let f = 0;
  for (let k = 0; k < NC; k++) {
    if (kind[k] !== BLOOM || vis[k]) continue;
    let n = 0, h = 0;
    qbuf[n++] = k;
    vis[k] = 1;
    while (h < n) for (const x of NB4[qbuf[h++]]) if (!vis[x] && kind[x] === BLOOM) (vis[x] = 1), (qbuf[n++] = x);
    f += Math.floor(n / 3);
  }
  return f;
}
interface Outcome { dm: number; bloom: number; melt: number; soak: number; prog: number; full: number }
/** 물줄기 하나가 떨어지면 어떻게 되나 — 정원은 건드리지 않고 amt·codes에 칸마다 남긴다. 미리 보기와 봇이 같은 함수를 쓴다 */
function resolve(s: ElephantState, tc: number, row: number, first: boolean, catCell: number, eve: boolean, needDm: boolean): Outcome {
  const G = s.g, fr = s.frogs;
  amt.fill(0);
  codes.fill(0);
  const soaked: number[] = [];
  for (const [k, a] of pattern(tc, row, powOf(row), first)) {
    if (k === catCell || fr.includes(k)) (soaked.push(k), (codes[k] = C_SOAK));
    else amt[k] += a;
  }
  // 젖은 동물은 개처럼 부르르 — 옆 칸에 물이 한 방울씩 튄다
  for (const k of soaked) for (const n of NB4[k]) if (n !== catCell && !fr.includes(n)) amt[n] += 1;
  let bloom = 0, melt = 0, prog = 0, full = 0, dW = 0;
  for (let k = 0; k < NC; k++) {
    const a = amt[k];
    if (!a) continue;
    const kd = G.kind[k], sp = G.sp[k];
    if (kd !== BUD && kd !== BLOOM) {
      codes[k] = C_WET;
      continue;
    }
    if (sp === MOONF && !eve) {
      codes[k] = C_SHUT;
      continue;
    }
    const w = G.water[k] + a;
    if (w >= MELT_AT[sp]) {
      codes[k] = C_MELT;
      melt++;
      if (kd === BLOOM) dW -= WORTH[sp];
    } else if (kd === BUD && w >= BLOOM_AT[sp]) {
      codes[k] = C_BLOOM;
      bloom++;
      dW += WORTH[sp];
      if (w === MELT_AT[sp] - 1) full++;
    } else if (kd === BUD) {
      codes[k] = C_DRINK;
      prog += (a * WORTH[sp]) / BLOOM_AT[sp];
    } else {
      codes[k] = w === MELT_AT[sp] - 1 ? C_FULL : C_DRINK;
      if (w === MELT_AT[sp] - 1) full++;
    }
  }
  let dm = dW;
  if (needDm && (bloom || melt)) {
    tmpKind.set(G.kind);
    for (let k = 0; k < NC; k++) if (codes[k] === C_BLOOM) tmpKind[k] = BLOOM;
    else if (codes[k] === C_MELT) tmpKind[k] = PUDDLE;
    dm += fliesOf(tmpKind) - s.flies;
  }
  return { dm, bloom, melt, soak: soaked.length, prog, full };
}

function stats(s: ElephantState) {
  const G = s.g;
  let m = 0, b = 0, buds = 0;
  for (let k = 0; k < NC; k++) {
    if (G.kind[k] === BLOOM) (m += WORTH[G.sp[k]]), b++;
    else if (G.kind[k] === BUD) buds++;
  }
  const f0 = s.flies;
  s.flies = fliesOf(G.kind);
  s.meter = m + s.flies;
  s.blooms = b;
  s.buds = buds;
  if (s.flies > f0 && s.phase === 'day') see(s, 'fly', '🦋 꽃이 셋 모이면 나비가 와요 (+1)');
}

function fire(s: ElephantState) {
  const row = rowOf(s.charge), drift = windAt(s, s.dayT), first = s.used === 0;
  s.shot = { t0: s.t, at: s.t + FLY(row), from: s.col, tc: s.col + drift, row, pow: powOf(row), first, drift };
  s.left--;
  s.used++;
  ev(s, 'spray', s.col, first ? '푸하아~!' : ['퓨~', '푸하!', '푸와아악!!'][powOf(row)]);
  if (drift) ev(s, 'gust', s.col, drift > 0 ? '바람 →' : '← 바람');
}
function hiccup(s: ElephantState) {
  s.left--;
  s.used++;
  s.charge = 0;
  s.dizzy = DIZZY;
  s.latch = true;
  ev(s, 'hiccup', s.col, '딸꾹!');
  see(s, 'hiccup', '😵 너무 오래 빨면 딸꾹! 물이 제 머리로 쏟아져요');
}

function land(s: ElephantState) {
  const sh = s.shot!, G = s.g, cat = catAt(s, s.dayT);
  s.shot = null;
  const o = resolve(s, sh.tc, sh.row, sh.first, cat ? cat.cell : -1, s.dayT >= EVE, false);
  ev(s, 'land', Math.max(0, Math.min(COLS - 1, sh.tc)) + sh.row * COLS, sh.first ? 'rainbow' : String(sh.pow));
  if (sh.first) see(s, 'rainbow', '🌈 첫 푸하에 무지개! 물 닿은 봉오리가 피어요');
  if (sh.pow === 2) see(s, 'strong', '💪 멀리 뿜을수록 넓게 튀어요 — 아홉 칸!');
  for (let k = 0; k < NC; k++) {
    const c = codes[k];
    if (!c) continue;
    if (amt[k]) G.wet[k] = s.t;
    if (c === C_SOAK) {
      const fi = s.frogs.indexOf(k);
      if (fi >= 0) (s.frogs[fi] = -1), s.onHead++, ev(s, 'soak', k, '🐸');
      else (s.catGone = true), ev(s, 'soak', k, '🐈');
      if (s.left > 0) s.left--, ev(s, 'bop', k, fi >= 0 ? '개굴 펀치! 물 -1' : '냥냥 펀치! 물 -1');
      else ev(s, 'bop', k, fi >= 0 ? '개굴!' : '캬악!');
      see(s, 'soak', '💢 젖은 동물은 화나서 코끼리를 때려요 (물 -1)');
      continue;
    }
    if (c === C_WET) continue;
    if (c === C_SHUT) {
      ev(s, 'shut', k);
      continue;
    }
    const sp = G.sp[k];
    if (c === C_MELT) {
      G.kind[k] = PUDDLE;
      G.water[k] = 0;
      G.t[k] = s.t;
      ev(s, 'melt', k, '녹았어요…');
      see(s, 'melt', '💦 물을 너무 주면 녹아서 물웅덩이가 돼요');
      continue;
    }
    G.water[k] += amt[k];
    if (c === C_BLOOM) {
      G.kind[k] = BLOOM;
      G.t[k] = s.t;
      ev(s, 'bloom', k, sp === SUNF ? '🌻 활짝!' : sp === MOONF ? '🌙 활짝!' : undefined);
      see(s, 'bloom', '🌸 봉오리는 물 2면 피어요 (가운데 2 · 둘레 1)');
      if (sp === SUNF) see(s, 'sunbloom', '🌻 해바라기가 피었어요 — 코끼리만 바라봐요 (+3)');
    } else ev(s, 'drink', k);
    if (G.kind[k] === BLOOM && G.water[k] === MELT_AT[sp] - 1) see(s, 'full', '💧 물을 가득 머금은 꽃 — 한 방울만 더 주면 녹아요!');
  }
  const f0 = s.flies;
  stats(s);
  const parts = [o.bloom ? `꽃 +${o.bloom}` : '', s.flies > f0 ? `🦋+${s.flies - f0}` : '', o.melt ? `녹음 -${o.melt}` : ''].filter(Boolean);
  ev(s, 'sum', Math.max(0, Math.min(COLS - 1, sh.tc)) + sh.row * COLS, parts.length ? parts.join(' · ') : '물만 젖었어요');
}

// ───────────────────────────── 하루 ─────────────────────────────
function empties(s: ElephantState) {
  const out: number[] = [];
  for (let k = 0; k < NC; k++) if (s.g.kind[k] === SOIL && !s.frogs.includes(k)) out.push(k);
  return out;
}
function sprout(s: ElephantState, sp: number, n: number, thirsty: number) {
  const G = s.g;
  for (let i = 0; i < n; i++) {
    const e = empties(s);
    if (!e.length) return;
    // 반쯤은 핀 꽃 옆에 (꽃밭이 이어지게), 나머지는 아무 데나
    const near = e.filter((k) => NB4[k].some((q) => G.kind[q] === BLOOM || G.kind[q] === BUD));
    const pool = near.length && s.rng() < 0.55 ? near : e;
    const k = pool[Math.floor(s.rng() * pool.length)];
    G.kind[k] = BUD;
    G.sp[k] = sp;
    G.water[k] = s.rng() < thirsty ? 1 : 0;
    G.hue[k] = Math.floor(s.rng() * 4);
    G.t[k] = s.t;
    ev(s, 'sprout', k);
  }
}
function morning(s: ElephantState) {
  const G = s.g, d = s.day;
  for (let k = 0; k < NC; k++) {
    const kd = G.kind[k];
    if (kd === WILT || kd === PUDDLE || kd === BUD) (G.kind[k] = SOIL), (G.water[k] = 0);
    else if (kd === BLOOM) G.water[k] = BLOOM_AT[G.sp[k]];
  }
  s.frogs = [];
  s.onHead = 0;
  if (d === 0) {
    // 1일째: 줄마다 목마른 봉오리 셋 — 첫 푸하(무지개 물보라)가 어느 줄에 떨어져도 한 줄이 핀다
    for (let r = 0; r < 5; r++) {
      const cs = [0, 1, 2, 3, 4, 5, 6];
      for (let i = 0; i < 3; i++) {
        const c = cs.splice(Math.floor(s.rng() * cs.length), 1)[0], k = r * COLS + c;
        G.kind[k] = BUD;
        G.sp[k] = NORMAL;
        G.water[k] = 1;
        G.hue[k] = Math.floor(s.rng() * 4);
        G.t[k] = s.t;
      }
    }
  } else {
    if (d === 2 || d === 4 || d === 6) sprout(s, SUNF, 1, 0);
    if (d >= 5) sprout(s, MOONF, d === 5 ? 3 : 2, 0);
    sprout(s, NORMAL, BUDS[d], 0.4);
  }
  // 졸린 개구리: 봉오리 옆 빈 흙에
  for (let i = 0; i < (d === 0 ? 0 : d === 1 ? 1 : 2); i++) {
    const e = empties(s), near = e.filter((k) => NB4[k].some((q) => G.kind[q] === BUD) && !NB4[k].some((q) => s.frogs.includes(q)));
    const pool = near.length ? near : e;
    if (pool.length) s.frogs.push(pool[Math.floor(s.rng() * pool.length)]);
  }
  s.catGone = false;
  s.catPh = s.rng() * LOOP.length;
  s.wind = new Int8Array(Math.ceil(DAY / WSEG) + 1);
  for (let i = 0; i < s.wind.length; i++) s.wind[i] = i === 0 ? (s.rng() < 0.5 ? 1 : -1) : [-1, 1, -1, 1, 0][Math.floor(s.rng() * 5)];
  if (d === 1) see(s, 'frog', '🐸 졸린 개구리 — 적시면 화나서 코끼리를 때려요');
  if (d === 2) see(s, 'sun', '🌻 해바라기 봉오리 — 물을 네 모금이나 마셔요');
  if (d === 3) see(s, 'cat', '🐈 산책하는 고양이 — 물 닿으면 캬악! 지나간 뒤에');
  if (d === 4) see(s, 'wind', '🍃 바람 — 물줄기가 바람 쪽으로 한 칸 밀려요');
  if (d === 5) see(s, 'moon', '🌙 달맞이꽃 — 해 질 녘에만 꽃잎을 열고 마셔요');
  s.left = SPRAYS[d];
  s.dayT = 0;
  s.phase = 'day';
  s.charge = 0;
  s.shot = null;
  s.dizzy = 0;
  s.fast = false;
  stats(s);
  s.startMeter = s.meter;
}

/** 지금 해가 지면 받을 별 */
export const starsNow = (s: ElephantState) => [0, 1, 2].filter((i) => s.meter >= GOALS[s.day][i]).length;

function endDay(s: ElephantState) {
  stats(s);
  const G = s.g, goal = GOALS[s.day][0], pass = s.meter >= goal;
  let wilt = 0;
  for (let k = 0; k < NC; k++) if (G.kind[k] === BUD) (G.kind[k] = WILT), (G.t[k] = s.t), wilt++;
  if (wilt) see(s, 'wilt', '🥀 해 질 때까지 못 핀 봉오리는 시들어요');
  s.phase = 'night';
  s.pause = NIGHT;
  s.charge = 0;
  if (pass) {
    const st = starsNow(s);
    s.stars += st;
    s.cleared++;
    s.dayStars = st;
    s.retry = false;
    ev(s, 'clear', -1, `${s.day + 1}일째 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
    if (s.day === DAYS - 1) note(s, `🐘 ${DAYS}일 꽃 잔치 완성! ★ ${s.stars}`, '#ffe08a');
  } else {
    s.hearts--;
    s.retry = true;
    ev(s, 'fail', -1, `꽃이 모자라요 (${s.meter}/${goal}) · 하트 -1`);
    if (s.hearts <= 0) s.dead = true;
  }
}

export const elephant: GameDef<ElephantState> = {
  id: 'elephant',
  name: '코끼리 물뿌리개 정원',
  genes: ['hold', 'farm', 'decorate'],
  twist: '꾹 누르는 동안 코끼리가 개울물을 빨아들여 볼이 빵빵해지고 물 표시가 한 줄씩 멀어진다 — 떼면 푸하! 물 닿은 봉오리가 피지만, 세게 뿜을수록 넓게 튀어 자는 동물이 젖고 이미 핀 꽃은 녹아내린다',
  rules: [
    '꾹 누르면 코끼리가 물을 빨아들여요 — 오래 누를수록 멀리, 떼면 푸하!',
    '봉오리는 물 2면 피고, 핀 꽃이 물 4가 되면 녹아요. 자는 동물은 적시지 마세요.',
    '해 질 때까지 꽃 목표를 채우면 다음 날, 7일째까지.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 물 빨기, 떼면 푸하! / 스페이스',
  aspect: A,
  art: {
    concept: '개울가 코끼리의 작은 꽃밭 디오라마',
    mood: '두께 있는 잔디 받침 위 나무 화단, 뒤로 졸졸 개울과 둥근 언덕. 회청색 아기 코끼리가 볼을 빵빵하게 부풀렸다 푸하 뿜으면 물보라에 무지개가 걸리고, 봉오리가 분홍·노랑·보라로 퐁퐁 피며 나비가 모인다. 저녁엔 등불과 달맞이꽃이 빛난다.',
    palette: { bg: '#16324a', ink: '#fffaf0', muted: '#7d9bb0', accent: '#5cc8ff', hot: '#ff5d7a', soft: '#cfe8f5' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const g: Garden = { kind: new Uint8Array(NC), sp: new Uint8Array(NC), water: new Uint8Array(NC), hue: new Uint8Array(NC), t: new Int32Array(NC), wet: new Int32Array(NC).fill(-999) };
    const s: ElephantState = {
      rng, t: 0, day: 0, dayT: 0, phase: 'day', pause: 0, retry: false, won: false, dead: false,
      g, frogs: [], onHead: 0, catPh: 0, catGone: false, wind: new Int8Array(8),
      wk: 0, col: 3, charge: 0, latch: false, dizzy: 0, shot: null, left: 0, used: 0, presses: 0, fast: false,
      meter: 0, blooms: 0, flies: 0, buds: 0, startMeter: 0,
      hearts: 3, stars: 0, cleared: 0, dayStars: 0, seen: new Set<string>(), events: [], notes: [],
    };
    morning(s);
    note(s, `☀️ 1일째 — 꽃 ${GOALS[0][0]}송이 피우기`, '#ffffff');
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t <= 120);
    if (s.notes.length && s.t - s.notes[0].t > 220) s.notes = s.notes.filter((e) => s.t - e.t <= 220);
    if (s.dead) return;
    if (s.phase === 'night') {
      if (--s.pause > 0) return;
      if (s.retry) {
        morning(s);
        note(s, `🔁 ${s.day + 1}일째 다시 — 꽃 ${GOALS[s.day][0]}`, '#ffd0d0');
      } else if (s.day + 1 >= DAYS) (s.dead = true), (s.won = true);
      else (s.day++, morning(s), note(s, `☀️ ${s.day + 1}일째 — 꽃 ${GOALS[s.day][0]}`, '#ffffff'));
      return;
    }
    const down = !!inp.hold;
    if (!down) s.latch = false;
    const can = s.left > 0 && !s.shot && s.dizzy === 0 && !s.latch;
    if (down && can) {
      if (s.charge === 0) {
        // 멈춰 서서 그 줄 앞에서 빨아들이기 시작 (걸음 중이면 가까운 줄로)
        const n = Math.floor(s.wk / STEP), p = s.wk - n * STEP, c = Math.round(walkX(s.wk));
        if (p >= REST) s.wk = c === tri(n + 4) ? (n + 1) * STEP : n * STEP;
        s.col = c;
        s.presses++;
        ev(s, 'press', c);
      }
      s.charge++;
      if (s.charge >= HIC) hiccup(s);
    } else if (s.charge > 0) {
      if (s.charge < H0) ev(s, 'tap', s.col, '꾹 눌러야 해요!');
      else fire(s);
      s.charge = 0;
    }
    if (s.shot && s.t >= s.shot.at) land(s);
    if (s.dizzy > 0) s.dizzy--;
    if (s.charge === 0 && !s.shot && s.dizzy === 0) s.wk++;
    const idle = !s.shot && s.charge === 0 && s.dizzy === 0 && (s.left === 0 || s.buds === 0);
    if (idle && !s.fast) (s.fast = true), ev(s, 'ff', -1, s.left ? '🌸 오늘 봉오리 다 피었어요! ⏩' : '⏩ 해 질 녘까지 빨리 감기');
    for (let n = 0, sub = idle ? 4 : 1; n < sub; n++) {
      s.dayT++;
      if (s.dayT >= DAY) {
        endDay(s);
        break;
      }
    }
  },
  over: (s) => s.dead,
  /** 별 하나 10점, 7일 꽃 잔치를 다 마치면 30점 더 */
  score: (s) => s.stars * 10 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawGarden(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const rgb = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const A1 = rgb(a), B1 = rgb(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(A1[0] + (B1[0] - A1[0]) * u)},${Math.round(A1[1] + (B1[1] - A1[1]) * u)},${Math.round(A1[2] + (B1[2] - A1[2]) * u)})`;
}
const HUES = ['#ff7eb6', '#ffd24a', '#b98cff', '#ff7a5c'];
const HUES2 = ['#ffc2dc', '#fff0a8', '#e2d0ff', '#ffc0ae'];
const SKY: [number, string, string][] = [
  [0, '#7aa6e0', '#ffd6b0'],
  [0.15, '#5ab4f0', '#d6f0ff'],
  [0.5, '#4aa8ee', '#cdeeff'],
  [0.78, '#7a6ab8', '#ffb080'],
  [1, '#34306e', '#f08a6a'],
];
/** 이모지는 흰 fillStyle로 (반투명 색이 이모지를 흐리게 하지 않게) */
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, 0, 0);
  ctx.restore();
}

function drawGarden(ctx: CanvasRenderingContext2D, s: ElephantState, w: number, h: number, th: Theme) {
  const fx = juice(s), G = s.g, R = (x: number) => x * w;
  const top = R(0.15), bot = h - R(0.12), CW = w * 0.118, RH = CW * 0.56, OX = w / 2, OY = h - R(0.68);
  const sc = (z: number) => 0.82 + 0.03 * z;
  const Y = (z: number) => OY + RH * (0.82 * z + 0.015 * z * z);
  const P = (x: number, z: number, y = 0): [number, number] => [OX + (x - COLS / 2) * CW * sc(z), Y(z) - y * CW * sc(z)];
  const U = (z: number) => CW * sc(z);
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const ell = (x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, rot = 0) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, Math.PI * 2);
    ctx.fill();
  };
  const cellXY = (k: number, y = 0.1) => P((k % COLS) + 0.5, ((k / COLS) | 0) + 0.5, y);
  const last = (kind: string) => {
    let a = 9999;
    for (const e of s.events) if (e.kind === kind) a = Math.min(a, s.t - e.t);
    return a;
  };
  const seenT = fx.memo.t ?? -1;
  /** 사건이 d틱 지난 순간 한 번만 참 (늦게 터지는 연출) */
  const cross = (e: Ev, d: number) => s.t - e.t >= d && seenT - e.t < d;
  const f = s.phase === 'night' ? 1 : s.dayT / DAY;
  const night = s.phase === 'night' ? Math.min(1, (NIGHT - s.pause) / 25, s.pause / 25 + 0.25) : 0;
  const dusk = Math.max(night * 0.42, f > 0.56 ? ((f - 0.56) / 0.44) * 0.32 : f < 0.05 ? ((0.05 - f) / 0.05) * 0.15 : 0);
  const eve = s.phase === 'day' && s.dayT >= EVE;
  const dance = s.phase === 'night' && !s.retry, sad = s.phase === 'night' && s.retry;
  // 코끼리 위치 (부드럽게)
  const exT = walkX(s.wk);
  if (fx.memo.ex === undefined || Math.abs(fx.memo.ex - exT) > 3) fx.memo.ex = exT;
  fx.memo.ex += (exT - fx.memo.ex) * 0.4;
  const ex = fx.memo.ex, EZ = -1.35, [elX, elY] = P(ex + 0.5, EZ), eu = U(EZ) * 1.12;
  const wind = windAt(s, s.dayT);
  ctx.save();
  fx.begin(ctx);

  // ── 하늘 ──
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a = SKY[i]), (b = SKY[i + 1]);
  const u0 = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const sg = ctx.createLinearGradient(0, 0, 0, OY);
  sg.addColorStop(0, mix(mix(a[1], b[1], u0), '#121a46', night));
  sg.addColorStop(1, mix(mix(a[2], b[2], u0), '#3a3a7a', night));
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night > 0.15 || f > 0.85)
    for (let k = 0; k < 36; k++) {
      ctx.globalAlpha = Math.max(night, (f - 0.85) * 3) * (0.35 + 0.65 * Math.abs(Math.sin(s.t / 30 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, top + hsh(k * 5 + 1) * (OY - top - R(0.1)), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  {
    const q = s.phase === 'night' ? 0.5 : f, sx = w * (0.1 + 0.8 * q), sy = top + R(0.17) - Math.sin(Math.PI * q) * R(0.1);
    const sun = s.phase === 'night' ? '#f4f1d0' : mix('#fff6b8', '#ff9a50', Math.abs(q - 0.5) * 2);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.11));
    gl.addColorStop(0, sun);
    gl.addColorStop(0.28, sun);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.11), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 11) * w + s.t * (0.07 + k * 0.03) * (wind || 1)) % (w + 120) + w + 120) % (w + 120) - 60, cy = top + R(0.03) + hsh(k + 3) * R(0.12);
    ctx.fillStyle = `rgba(255,255,255,${0.6 - night * 0.45})`;
    for (let p = 0; p < 4; p++) ell(cx + p * R(0.033) - R(0.05), cy - (p % 2) * R(0.012), R(0.038), R(0.019), ctx.fillStyle as string);
  }
  // 먼 언덕·나무·헛간
  const hz = Y(-2.3);
  for (const [lay, col, amp, yo] of [[0, '#9ed8a0', 0.05, 0.12], [1, '#7cc488', 0.035, 0.06]] as [number, string, number, number][]) {
    ctx.fillStyle = mix(col, '#1c2a48', night * 0.75);
    ctx.beginPath();
    ctx.moveTo(-10, hz + 4);
    for (let x = -10; x <= w + 10; x += 6) ctx.lineTo(x, hz - R(yo) - Math.sin(x / R(0.22) + lay * 2.1) * R(amp) - Math.sin(x / R(0.09) + lay) * R(0.01));
    ctx.lineTo(w + 10, hz + 4);
    ctx.closePath();
    ctx.fill();
  }
  for (let k = 0; k < 7; k++) {
    const tx = hsh(k * 13 + 2) * w, ty = hz - R(0.06) - Math.sin(tx / R(0.22) + 2.1) * R(0.035) + R(0.012);
    ell(tx, ty - R(0.018), R(0.016), R(0.022), mix('#4f9a58', '#14241c', night * 0.75));
    ell(tx - R(0.005), ty - R(0.024), R(0.007), R(0.009), mix('#79c27a', '#1c3024', night * 0.75));
  }
  {
    const bx = w * 0.8, by = hz - R(0.07);
    poly([[bx - R(0.03), by], [bx + R(0.03), by], [bx + R(0.03), by - R(0.03)], [bx - R(0.03), by - R(0.03)]], mix('#d8524a', '#3a1c20', night * 0.7));
    poly([[bx - R(0.036), by - R(0.03)], [bx + R(0.036), by - R(0.03)], [bx, by - R(0.055)]], mix('#f4ecd8', '#3a3448', night * 0.7));
    ctx.fillStyle = dusk > 0.15 ? '#ffd86a' : mix('#6a3a30', '#2a1a1a', night);
    ctx.fillRect(bx - R(0.006), by - R(0.018), R(0.012), R(0.018));
  }
  // 새
  if (night < 0.5) {
    ctx.strokeStyle = 'rgba(40,50,70,.55)';
    ctx.lineWidth = 1.3;
    for (let k = 0; k < 3; k++) {
      const bx = ((s.t * 0.45 + k * 41 + hsh(k) * 200) % (w + 80)) - 40, by = top + R(0.06) + k * 8 + Math.sin(s.t / 20 + k) * 3, fl = Math.sin(s.t / 6 + k) * 3;
      ctx.beginPath();
      ctx.moveTo(bx - 5, by - fl);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx + 5, by - fl);
      ctx.stroke();
    }
  }

  // ── 받침(잔디 섬) ──
  const outline: [number, number][] = [];
  {
    const x0 = -0.75, x1 = COLS + 0.75, z0 = -2.3, z1 = ROWS + 1.6, rr = 1.1;
    const corner = (cx: number, cz: number, a0: number) => {
      for (let i = 0; i <= 6; i++) {
        const an = a0 + (i / 6) * (Math.PI / 2);
        outline.push([cx + Math.cos(an) * rr, cz + Math.sin(an) * rr]);
      }
    };
    corner(x1 - rr, z1 - rr, 0);
    corner(x0 + rr, z1 - rr, Math.PI / 2);
    corner(x0 + rr, z0 + rr, Math.PI);
    corner(x1 - rr, z0 + rr, Math.PI * 1.5);
  }
  const DEP = 0.62;
  {
    const [sx, sy] = P(COLS / 2, ROWS + 1.6, -DEP);
    ell(sx, sy + R(0.025), R(0.47), R(0.04), 'rgba(0,10,30,.28)');
  }
  // 옆면: 흙층 (앞쪽 반만 보인다)
  for (let i = 0; i < outline.length; i++) {
    const [x1, z1] = outline[i], [x2, z2] = outline[(i + 1) % outline.length];
    if (z1 + z2 < 2 * ROWS - 1) continue;
    const t1 = P(x1, z1), t2 = P(x2, z2), b1 = P(x1, z1, -DEP), b2 = P(x2, z2, -DEP);
    const side = Math.abs(x1 - x2) < Math.abs(z1 - z2) ? 0.22 : 0;
    poly([t1, t2, b2, b1], mix('#9a6640', '#2c1c14', night * 0.6));
    for (const [d0, d1, c] of [[0.05, 0.2, '#7a4c30'], [0.34, 0.44, '#b07a4c'], [0.52, 0.62, '#6a4028']] as [number, number, string][]) {
      const q1 = P(x1, z1, -DEP * d0), q2 = P(x2, z2, -DEP * d0), r1 = P(x1, z1, -DEP * d1), r2 = P(x2, z2, -DEP * d1);
      poly([q1, q2, r2, r1], mix(c, '#20140e', night * 0.6));
    }
    if (side) poly([t1, t2, b2, b1], `rgba(0,0,0,${side})`);
    poly([t1, t2, P(x2, z2, -0.07), P(x1, z1, -0.07)], mix('#5aa040', '#18301a', night * 0.6));
  }
  // 흙 속: 돌멩이·뿌리·지렁이
  {
    for (let k = 0; k < 9; k++) {
      const xx = -0.3 + hsh(k * 17) * (COLS + 0.6), dd = 0.25 + hsh(k * 5) * 0.6, [px, py] = P(xx, ROWS + 1.6, -DEP * dd);
      ell(px, py, R(0.009) + hsh(k) * R(0.008), R(0.006), mix('#c8b8a0', '#3a3028', night * 0.6));
    }
    ctx.strokeStyle = mix('#5a3a22', '#1a120c', night * 0.6);
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      const [px, py] = P(0.5 + k * 1.2, ROWS + 1.6, -0.05);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + 4, py + R(0.02), px - 2, py + R(0.035) + hsh(k) * R(0.01));
      ctx.stroke();
    }
    const wq = (s.t * 0.01) % 1, [wx, wy] = P(1 + wq * 5, ROWS + 1.6, -DEP * 0.45);
    ctx.strokeStyle = mix('#ff9aa8', '#4a2a30', night * 0.6);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let p = 0; p < 6; p++) ctx.lineTo(wx - p * 2.2, wy + Math.sin(s.t / 6 + p) * 1.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  // 윗면: 잔디
  {
    const pts = outline.map(([x, z]) => P(x, z));
    const lg = ctx.createLinearGradient(0, Y(-2.3), 0, Y(ROWS + 1.6));
    lg.addColorStop(0, mix('#8fd46a', '#1e3a2a', night * 0.65));
    lg.addColorStop(1, mix('#6cbc4e', '#163020', night * 0.65));
    poly(pts, lg);
    ctx.strokeStyle = mix('#4f9a38', '#14281a', night * 0.6);
    ctx.lineWidth = 1;
    for (let k = 0; k < 46; k++) {
      const xx = -0.5 + hsh(k * 7) * (COLS + 1), zz = -2.1 + hsh(k * 11 + 3) * (ROWS + 3.5);
      if (xx > -0.2 && xx < COLS + 0.2 && zz > -0.25 && zz < ROWS + 0.2) continue;
      if (zz > -1.95 && zz < -0.85) continue;
      const [gx, gy] = P(xx, zz);
      ctx.beginPath();
      ctx.moveTo(gx - 1.5, gy);
      ctx.lineTo(gx - 0.5, gy - 3);
      ctx.moveTo(gx + 1, gy);
      ctx.lineTo(gx + 1.5, gy - 2.5);
      ctx.stroke();
    }
  }
  // 뒤 오솔길
  poly([P(-0.35, -1.95), P(COLS + 0.35, -1.95), P(COLS + 0.35, -0.85), P(-0.35, -0.85)], mix('#e8cf98', '#3a3428', night * 0.65));
  for (let k = 0; k < 14; k++) {
    const [px, py] = P(-0.2 + hsh(k * 19) * (COLS + 0.4), -1.9 + hsh(k * 23) * 1);
    ell(px, py, 2.2, 1.2, mix('#cdb27a', '#2a2620', night * 0.6));
  }
  // 개울 (코끼리가 물을 빠는 곳)
  {
    const z0 = -0.8, z1 = -0.28;
    poly([P(-0.55, z0), P(COLS + 0.55, z0), P(COLS + 0.55, z1), P(-0.55, z1)], mix('#6a4a30', '#20160e', night * 0.6));
    const wg = ctx.createLinearGradient(0, Y(z0), 0, Y(z1));
    wg.addColorStop(0, mix('#4ab8ec', '#163a66', night * 0.7));
    wg.addColorStop(1, mix('#7fd8f4', '#1e4a78', night * 0.7));
    poly([P(-0.55, z0 + 0.06), P(COLS + 0.55, z0 + 0.06), P(COLS + 0.55, z1 - 0.04), P(-0.55, z1 - 0.04)], wg);
    ctx.strokeStyle = `rgba(255,255,255,${0.55 - night * 0.3})`;
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 12; k++) {
      const xx = ((hsh(k * 3) * (COLS + 1) + s.t * 0.012) % (COLS + 1.1)) - 0.5, zz = z0 + 0.15 + hsh(k * 7) * 0.3, [px, py] = P(xx, zz);
      ctx.beginPath();
      ctx.moveTo(px - 4, py);
      ctx.quadraticCurveTo(px, py - 1.5, px + 4, py);
      ctx.stroke();
    }
    for (let k = 0; k < 7; k++) {
      const [px, py] = P(-0.4 + hsh(k * 29) * (COLS + 0.8), k % 2 ? z1 - 0.02 : z0 + 0.04);
      ell(px, py, 3.5, 2, mix('#b8b0a4', '#2e2c30', night * 0.6));
    }
  }
  // 뒤 소품: 큰 나무(왼쪽) · 덤불·바람개비 깃발(오른쪽)
  const tree = (x: number, z: number, size: number) => {
    const [tx, ty] = P(x, z), u = U(z) * size;
    ell(tx + u * 0.2, ty, u * 0.6, u * 0.18, 'rgba(0,30,10,.25)');
    ctx.fillStyle = mix('#8a5a34', '#2a1c14', night * 0.6);
    ctx.fillRect(tx - u * 0.09, ty - u * 0.85, u * 0.18, u * 0.85);
    for (const [ox, oy, r, c] of [[0, -1.25, 0.55, '#3f9a48'], [-0.3, -1.0, 0.4, '#4aa650'], [0.32, -1.02, 0.4, '#3a8e44'], [-0.12, -1.45, 0.32, '#6cc260']] as [number, number, number, string][])
      ell(tx + ox * u, ty + oy * u, r * u, r * u * 0.92, mix(c, '#12281a', night * 0.65));
  };
  tree(-0.45, -2.0, 1.25);
  {
    const [bx, by] = P(COLS + 0.4, -1.75), u = U(-1.75);
    for (const [ox, r, c] of [[-0.25, 0.32, '#4aa650'], [0.15, 0.38, '#3f9a48'], [0, 0.26, '#6cc260']] as [number, number, string][]) ell(bx + ox * u, by - r * u * 0.8, r * u, r * u * 0.8, mix(c, '#12281a', night * 0.65));
    // 바람 깃발 (5일째부터 바람 방향)
    const [px, py] = P(COLS + 0.15, -1.2), hh = U(-1.2) * 1.5;
    ctx.strokeStyle = mix('#7a5a3a', '#2a2018', night * 0.6);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - hh);
    ctx.stroke();
    const dir = s.day >= 4 ? wind || 0.15 : 0.15, flap = Math.sin(s.t / 5) * 2;
    for (let p = 0; p < 3; p++) {
      ctx.fillStyle = p % 2 ? '#ffffff' : '#ff6a5a';
      const x0 = px + dir * p * 7, x1 = px + dir * (p + 1) * 7;
      poly([[x0, py - hh + p * 0.6 + flap * p * 0.3], [x1, py - hh + 1 + p * 0.8 + flap * (p + 1) * 0.3], [x1, py - hh + 8 - p * 0.8 + flap * (p + 1) * 0.3], [x0, py - hh + 9 - p * 0.6 + flap * p * 0.3]], p % 2 ? '#ffffff' : '#ff6a5a');
    }
  }

  // 미리 보기 계산 (누르는 중)
  const pv = new Uint8Array(NC);
  let pvTarget = -1, pvRow = -1, pvTc = 0, pvO: Outcome | null = null;
  const aimCol = s.charge > 0 || s.shot ? s.col : Math.round(exT);
  if (s.charge >= 1 && s.phase === 'day') {
    pvRow = rowOf(s.charge);
    pvTc = s.col + windAt(s, s.dayT);
    const cat = catAt(s, s.dayT + FLY(pvRow));
    pvO = resolve(s, pvTc, pvRow, s.used === 0, cat ? cat.cell : -1, s.dayT + FLY(pvRow) >= EVE, false);
    pv.set(codes);
    for (let k = 0; k < NC; k++) if (amt[k] && !pv[k]) pv[k] = C_WET;
    pvTarget = pvTc >= 0 && pvTc < COLS ? pvRow * COLS + pvTc : -1;
  }
  // ── 코끼리 ──
  drawElephant();

  // ── 화단 ──
  const bedY = 0.1;
  // 나무 틀 (뒤·옆)
  const wood = mix('#c98a52', '#3a2618', night * 0.6), wood2 = mix('#a86c3a', '#2c1c12', night * 0.6);
  poly([P(-0.14, -0.14, 0.22), P(COLS + 0.14, -0.14, 0.22), P(COLS + 0.14, 0, 0.22), P(-0.14, 0, 0.22)], wood);
  poly([P(0, 0, 0.22), P(COLS, 0, 0.22), P(COLS, 0, bedY), P(0, 0, bedY)], wood2);
  poly([P(-0.14, -0.14, 0.22), P(0, 0, 0.22), P(0, ROWS, 0.22), P(-0.14, ROWS + 0.14, 0.22)], wood);
  poly([P(COLS + 0.14, -0.14, 0.22), P(COLS, 0, 0.22), P(COLS, ROWS, 0.22), P(COLS + 0.14, ROWS + 0.14, 0.22)], wood);
  const catNow = catAt(s, s.dayT);
  const recent = (k: number) => s.t - G.t[k];
  for (let r = 0; r < ROWS; r++) {
    // 흙 칸
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c, wetA = Math.max(0, 1 - (s.t - G.wet[k]) / 420), v = hsh(k) * 0.1;
      let soil = mix(mix('#8a5a38', '#7a4c2e', v * 5), '#4a2e1c', wetA * 0.7);
      if (G.kind[k] === PUDDLE) soil = mix(soil, '#5a4030', 0.3);
      soil = mix(soil, '#1e1410', night * 0.6);
      const q = [P(c, r, bedY), P(c + 1, r, bedY), P(c + 1, r + 1, bedY), P(c, r + 1, bedY)];
      poly(q, soil);
      // 고랑 줄
      ctx.strokeStyle = `rgba(60,34,18,${0.35 - night * 0.15})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(...P(c + 0.1, r + 0.3, bedY));
      ctx.lineTo(...P(c + 0.9, r + 0.3, bedY));
      ctx.moveTo(...P(c + 0.1, r + 0.7, bedY));
      ctx.lineTo(...P(c + 0.9, r + 0.7, bedY));
      ctx.stroke();
      if (wetA > 0.05) {
        ctx.globalAlpha = wetA * 0.6;
        const [wx, wy] = cellXY(k);
        ell(wx - U(r) * 0.15, wy - 1, U(r) * 0.12, U(r) * 0.04, '#bfe8ff');
        ctx.globalAlpha = 1;
      }
      // 겨눈 줄 (코끼리 앞 세로줄) — 누르면 그 줄로 뿜는다
      if (s.phase === 'day' && s.left > 0 && !s.shot && c === aimCol && s.dizzy === 0) {
        ctx.globalAlpha = s.charge > 0 ? 0.14 : 0.16 + 0.07 * Math.sin(s.t / 8);
        poly(q, '#ffffff');
        ctx.globalAlpha = 1;
      }
      if (pv[k]) {
        const pulse = 0.5 + 0.5 * Math.sin(s.t / 4);
        ctx.globalAlpha = 0.3 + 0.15 * pulse;
        poly(q, k === pvTarget ? '#3ab0ff' : '#8ad4ff');
        ctx.globalAlpha = 1;
      }
    }
    // 이 줄의 식물·동물 (뒤에서 앞으로)
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c;
      drawPlant(k);
      const fi = s.frogs.indexOf(k);
      if (fi >= 0) drawFrog(k);
    }
    if (catNow && Math.round(catXY(catNow.u)[1] - 0.5) === r) drawCat(catNow.u);
    // 미리 보기 결과 표시
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c, code = pv[k];
      if (!code || code === C_WET) continue;
      const [x, y0] = cellXY(k), u = U(r + 0.5), y = y0 - u * 0.78;
      const col = code === C_BLOOM ? '#3ccf6a' : code === C_MELT ? '#ff4a5a' : code === C_SOAK ? '#ff9a2a' : code === C_FULL ? '#ffcc33' : code === C_SHUT ? '#8a8ad8' : '#3aa8ff';
      const t = code === C_BLOOM ? '✓' : code === C_MELT ? '✗' : code === C_SOAK ? '!' : code === C_FULL ? '!' : code === C_SHUT ? 'z' : '+';
      ell(x, y, u * 0.17, u * 0.17, col);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, u * 0.17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, u * 0.3)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t, x, y + 0.5);
    }
  }
  // 물 표시 (누르는 중): 코끼리에서 겨눈 칸까지 점선, 끝에 물방울 과녁
  if (pvRow >= 0) {
    const [tx, ty] = P(pvTc + 0.5, pvRow + 0.5, bedY), u = U(pvRow + 0.5), pulse = 1 + 0.1 * Math.sin(s.t / 3);
    ctx.setLineDash([3, 4]);
    ctx.lineDashOffset = -s.t * 0.8;
    for (const [c, lw] of [['rgba(0,40,80,.5)', 4], ['#ffffff', 2]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(...P(s.col + 0.5, -0.1, bedY));
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#3ab0ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(tx, ty, u * 0.42 * pulse, u * 0.24 * pulse, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    // 줄 눈금: 지나온 줄은 채워진 점
    for (let r = 0; r < ROWS; r++) {
      const [mx, my] = P(COLS + 0.07, r + 0.5, 0.22);
      ell(mx, my, 2.6, 2.6, r <= pvRow ? '#7fd3ff' : 'rgba(255,255,255,.35)');
    }
  }
  // 겨눈 줄 표시: 코끼리 발치에 물방울 화살 (지금 누르면 이 줄)
  if (s.phase === 'day' && s.left > 0 && !s.shot && s.charge === 0 && s.dizzy === 0) {
    const [ax, ay] = P(aimCol + 0.5, 0.18, 0.3), bob = Math.sin(s.t / 6) * 2;
    ctx.fillStyle = 'rgba(20,60,110,.55)';
    ctx.beginPath();
    ctx.moveTo(ax - 7, ay - 5 + bob);
    ctx.lineTo(ax + 7, ay - 5 + bob);
    ctx.lineTo(ax, ay + 4 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#bfe8ff';
    ctx.beginPath();
    ctx.moveTo(ax - 5, ay - 4 + bob);
    ctx.lineTo(ax + 5, ay - 4 + bob);
    ctx.lineTo(ax, ay + 2 + bob);
    ctx.closePath();
    ctx.fill();
  }
  // 앞 틀 (앞면 나무판)
  poly([P(-0.14, ROWS + 0.14, 0.22), P(COLS + 0.14, ROWS + 0.14, 0.22), P(COLS, ROWS, 0.22), P(0, ROWS, 0.22)], wood);
  poly([P(-0.14, ROWS + 0.14, 0.22), P(COLS + 0.14, ROWS + 0.14, 0.22), P(COLS + 0.14, ROWS + 0.14, 0), P(-0.14, ROWS + 0.14, 0)], wood2);
  ctx.strokeStyle = mix('#8a5430', '#20140c', night * 0.6);
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    const [x1, y1] = P(i, ROWS + 0.14, 0.2), [x2, y2] = P(i, ROWS + 0.14, 0.02);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  // ── 앞 잔디 소품: 낮은 울타리 · 등불 · 물뿌리개 · 팻말 ──
  const lamps: [number, number][] = [];
  {
    const fz = ROWS + 1.15;
    ctx.strokeStyle = mix('#fff4e0', '#4a4450', night * 0.6);
    for (const [xa, xb] of [[-0.45, 2.2], [4.8, COLS + 0.45]] as [number, number][]) {
      const u = U(fz);
      ctx.lineWidth = 1.6;
      for (let x = xa; x <= xb + 0.01; x += 0.36) {
        const [px, py] = P(x, fz);
        ctx.fillStyle = mix('#fff8ea', '#5a5466', night * 0.6);
        ctx.beginPath();
        ctx.moveTo(px - 2.4, py);
        ctx.lineTo(px - 2.4, py - u * 0.3);
        ctx.lineTo(px, py - u * 0.38);
        ctx.lineTo(px + 2.4, py - u * 0.3);
        ctx.lineTo(px + 2.4, py);
        ctx.closePath();
        ctx.fill();
      }
      const [p1x, p1y] = P(xa, fz), [p2x, p2y] = P(xb, fz);
      ctx.beginPath();
      ctx.moveTo(p1x, p1y - u * 0.2);
      ctx.lineTo(p2x, p2y - u * 0.2);
      ctx.stroke();
    }
    for (const lx of [-0.42, COLS + 0.42]) {
      const [px, py] = P(lx, ROWS + 0.7), u = U(ROWS + 0.7);
      ell(px + 3, py, u * 0.2, u * 0.07, 'rgba(0,0,0,.25)');
      ctx.fillStyle = mix('#5a4a3a', '#1e1a18', night * 0.5);
      ctx.fillRect(px - 1.5, py - u * 0.75, 3, u * 0.75);
      const lit = dusk > 0.12;
      ctx.fillStyle = lit ? '#ffe08a' : '#f4ead0';
      ctx.shadowColor = '#ffcf5a';
      ctx.shadowBlur = lit ? 14 : 0;
      ctx.fillRect(px - u * 0.09, py - u * 0.98, u * 0.18, u * 0.22);
      ctx.shadowBlur = 0;
      poly([[px - u * 0.13, py - u * 0.98], [px + u * 0.13, py - u * 0.98], [px, py - u * 1.1]], mix('#3a3a44', '#16161c', night * 0.4));
      lamps.push([px, py - u * 0.88]);
    }
    // 물뿌리개·팻말
    const [wx, wy] = P(3.5, ROWS + 1.05);
    emo(ctx, '🪣', wx - U(ROWS + 1) * 0.9, wy - 7, R(0.042));
    const [sx2, sy2] = P(2.9, ROWS + 1.25), uu = U(ROWS + 1.2);
    ctx.fillStyle = mix('#8a5a34', '#2a1c14', night * 0.6);
    ctx.fillRect(sx2 - 1.5, sy2 - uu * 0.5, 3, uu * 0.5);
    ctx.fillStyle = mix('#e8c48a', '#3a3020', night * 0.6);
    ctx.beginPath();
    ctx.roundRect(sx2 - uu * 0.42, sy2 - uu * 0.78, uu * 0.84, uu * 0.32, 3);
    ctx.fill();
    emo(ctx, '🐘', sx2 - uu * 0.17, sy2 - uu * 0.62, uu * 0.26);
    emo(ctx, '🌷', sx2 + uu * 0.17, sy2 - uu * 0.62, uu * 0.26);
  }

  // ── 물줄기 ──
  const tip = trunkTip();
  if (s.shot) {
    const sh = s.shot, p = Math.min(1, (s.t - sh.t0) / (sh.at - sh.t0));
    const [ex2, ey2] = P(sh.tc + 0.5, sh.row + 0.5, bedY), lift = eu * (1.1 + sh.row * 0.32);
    const cx = (tip[0] + ex2) / 2 + eu * 0.9 + sh.drift * eu * 0.6, cy = Math.min(tip[1], ey2) - lift;
    const bz = (u: number): [number, number] => [(1 - u) * (1 - u) * tip[0] + 2 * u * (1 - u) * cx + u * u * ex2, (1 - u) * (1 - u) * tip[1] + 2 * u * (1 - u) * cy + u * u * ey2];
    const thick = 2.8 + sh.pow * 1.2 + (sh.first ? 1.4 : 0);
    ctx.lineCap = 'round';
    for (const [col, lw] of [['rgba(30,110,210,.6)', thick * 2.3], ['rgba(110,200,255,.95)', thick * 1.4], ['rgba(255,255,255,.95)', thick * 0.5]] as [string, number][]) {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      const u0 = Math.max(0, p - 0.55);
      ctx.moveTo(...bz(u0));
      for (let u = u0; u <= p + 1e-6; u += 0.04) ctx.lineTo(...bz(Math.min(p, u)));
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (let i = 0; i < 10; i++) {
      const u = p - hsh(i + s.t) * 0.5;
      if (u < 0) continue;
      const [qx, qy] = bz(u);
      ell(qx + (hsh(i * 3 + s.t) - 0.5) * 8, qy + (hsh(i * 7 + s.t) - 0.5) * 8, 1.6, 1.6, 'rgba(200,240,255,.9)');
    }
  }
  // 무지개 (첫 푸하·센 물줄기 뒤 물보라에)
  for (const e of s.events) {
    if (e.kind !== 'land' || (e.text !== 'rainbow' && e.text !== '2')) continue;
    const age = s.t - e.t, life = e.text === 'rainbow' ? 118 : 80;
    if (age > life) continue;
    const al = Math.min(1, age / 10, (life - age) / 30) * (e.text === 'rainbow' ? 0.55 : 0.4);
    const big = e.text === 'rainbow', [x0, y] = cellXY(e.k), x = big ? OX : x0, r0 = big ? CW * 3.4 : CW * 1.3, bw = big ? 5 : 2.6;
    const cols = ['#ff4a4a', '#ff9a2a', '#ffe23a', '#4ad04a', '#3aa0ff', '#6a5aff', '#b04aff'];
    ctx.globalAlpha = al;
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = cols[i];
      ctx.lineWidth = bw;
      ctx.beginPath();
      ctx.arc(x, y + R(0.02), r0 - i * bw, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // 나비
  {
    const bl: number[] = [];
    for (let k = 0; k < NC; k++) if (G.kind[k] === BLOOM) bl.push(k);
    for (let i = 0; i < s.flies && bl.length; i++) {
      const ph = s.t / 260 + i * 0.37, n0 = Math.floor(ph), fr = smooth(Math.min(1, (ph - n0) * 3));
      const ka = bl[Math.floor(hsh(i * 31 + n0) * bl.length)], kb = bl[Math.floor(hsh(i * 31 + n0 + 1) * bl.length)];
      const [ax, ay] = cellXY(ka), [bx2, by2] = cellXY(kb);
      const x = ax + (bx2 - ax) * fr + Math.sin(s.t / 11 + i) * 6, y = ay + (by2 - ay) * fr - R(0.07) - Math.abs(Math.sin(s.t / 7 + i * 2)) * R(0.03) - (dance ? Math.abs(Math.sin(s.t / 6)) * 8 : 0);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(0.55 + 0.45 * Math.abs(Math.sin(s.t / 3 + i)), 1);
      emo(ctx, '🦋', 0, 0, R(0.045));
      ctx.restore();
    }
  }
  // 바람에 날리는 잎
  if (s.day >= 4 && s.phase === 'day' && wind) {
    for (let k = 0; k < 7; k++) {
      const q = ((s.t * 0.004 * (1 + hsh(k)) + hsh(k * 9)) % 1), x = wind > 0 ? q * (w + 40) - 20 : w + 20 - q * (w + 40), y = top + R(0.12) + hsh(k * 5) * (bot - top - R(0.2)) + Math.sin(s.t / 9 + k) * 8;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(s.t / 10 + k);
      ell(0, 0, 4, 2, k % 2 ? '#8ad45a' : '#c8e060');
      ctx.restore();
    }
  }

  // ── 저녁·밤 ──
  if (dusk > 0.01) {
    ctx.fillStyle = `rgba(16,18,56,${dusk})`;
    ctx.fillRect(-12, -12, w + 24, h + 24);
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, r: number, c: string, al: number) => {
      const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
      gl.addColorStop(0, c.replace('A', String(al)));
      gl.addColorStop(1, c.replace('A', '0'));
      ctx.fillStyle = gl;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const [x, y] of lamps) glow(x, y, R(0.14), 'rgba(255,200,110,A)', Math.min(1, dusk * 2.2) * 0.75);
    for (let k = 0; k < NC; k++)
      if (G.sp[k] === MOONF && (G.kind[k] === BLOOM || G.kind[k] === BUD) && (eve || s.phase === 'night')) {
        const [x, y] = cellXY(k);
        glow(x, y - U(1) * 0.5, R(0.08), 'rgba(170,200,255,A)', Math.min(1, dusk * 2.5) * (G.kind[k] === BLOOM ? 0.9 : 0.35));
      }
    // 반딧불
    for (let k = 0; k < 14; k++) {
      const x = (hsh(k * 7) * w + Math.sin(s.t / 40 + k) * 20 + w) % w, y = OY - R(0.05) + hsh(k * 3) * R(0.4) + Math.sin(s.t / 25 + k * 2) * 10;
      glow(x, y, 6, 'rgba(220,255,140,A)', Math.min(1, dusk * 2) * (0.5 + 0.5 * Math.sin(s.t / 8 + k)));
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // ── 연출 ──
  for (const e of s.events) {
    const fresh = e.t > seenT;
    if (e.kind === 'bop' && cross(e, 58)) {
      fx.kick(7);
      fx.burst(elX, elY - eu * 1.7, '#ffe27a', 14, 3, 2.5);
      fx.pop(elX, elY - eu * 2.2, e.text!, '#ffb0a0', 16);
    }
    if (!fresh) continue;
    const [x, y] = e.k >= 0 ? cellXY(e.k) : [w / 2, OY + RH * 2];
    if (e.kind === 'press') fx.burst(tip[0], Y(-0.55), '#bfe8ff', 6, 1.5, 2);
    if (e.kind === 'spray') {
      fx.burst(tip[0], tip[1], '#bfe8ff', 14, 3, 2.4);
      fx.pop(tip[0], tip[1] - 14, e.text!, '#e8f8ff', e.text === '퓨~' ? 15 : 20);
      fx.kick(e.text === '퓨~' ? 2 : e.text === '푸하!' ? 4 : 7);
    }
    if (e.kind === 'land') {
      const pw = e.text === 'rainbow' ? 2 : Number(e.text);
      fx.burst(x, y, '#7fd3ff', 14 + pw * 8, 2.5 + pw, 2.6);
      fx.burst(x, y, '#ffffff', 8, 2, 1.8);
      fx.ring(x, y, '#bfe8ff', CW * (0.6 + pw * 0.45) * (e.text === 'rainbow' ? 2 : 1), 3);
      if (e.text === 'rainbow') fx.blink('#e8f8ff', 0.22);
    }
    if (e.kind === 'bloom') {
      const c = G.sp[e.k] === SUNF ? '#ffd23f' : G.sp[e.k] === MOONF ? '#e8f0ff' : HUES[G.hue[e.k]];
      fx.burst(x, y - U(1) * 0.5, c, 14, 2.4, 2.4);
      fx.ring(x, y - U(1) * 0.4, '#ffffff', CW * 0.55, 2);
      fx.pop(x, y - U(1) * 0.9, e.text ?? '퐁!', '#fff4c8', e.text ? 15 : 13);
    }
    if (e.kind === 'melt') fx.burst(x, y, '#5aa8e8', 16, 2, 2.4), fx.pop(x, y - U(1) * 0.8, e.text!, '#a8d8ff', 13), fx.kick(3);
    if (e.kind === 'soak') fx.burst(x, y - 6, '#9fdcff', 18, 3, 2.2), fx.pop(x, y - U(1) * 1.0, '💢', '#ff6a5a', 18);
    if (e.kind === 'hiccup') fx.pop(elX + eu * 0.8, elY - eu * 2.3, e.text!, '#ffffff', 20), fx.kick(5), fx.burst(tip[0], tip[1], '#bfe8ff', 18, 3.2, 2.4);
    if (e.kind === 'tap') fx.pop(elX, elY - eu * 2.4, e.text!, '#ffffff', 14);
    if (e.kind === 'sum') fx.pop(Math.max(R(0.2), Math.min(w - R(0.2), x)), y - U(1) * 1.25, e.text!, e.text!.includes('녹음') ? '#ffd0c0' : e.text === '물만 젖었어요' ? '#d8eefa' : '#fff4c8', 16);
    if (e.kind === 'sprout') fx.burst(x, y - 3, '#9be36a', 6, 1.4, 1.6);
    if (e.kind === 'shut') fx.pop(x, y - U(1) * 0.8, '🌙 쿨쿨', '#d8dcff', 12);
    if (e.kind === 'gust') fx.pop(elX + (e.text!.startsWith('←') ? -1 : 1) * eu, elY - eu * 2.6, e.text!, '#e8ffd0', 13);
    if (e.kind === 'drink') fx.burst(x, y - 4, '#bfe8ff', 4, 1.2, 1.4);
    if (e.kind === 'clear') fx.burst(w / 2, h * 0.36, '#ffd23f', 60, 6, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.34, e.text!, '#ffe27a', 24), fx.pop(elX + eu, elY - eu * 2.3, '뿌우~♪', '#ffffff', 16);
    if (e.kind === 'fail') fx.kick(9), fx.blink('#ff4d5e', 0.22), fx.pop(w / 2, h * 0.36, e.text!, '#ff9a9a', 17);
    if (e.kind === 'ff') fx.pop(w / 2, bot - R(0.05), e.text!, '#cfe8ff', 13);
  }
  fx.memo.t = s.t;
  // 누르는 중: 예상 (꽃 +n · 녹음 -n)
  if (pvO) {
    const msg = `${pvO.bloom ? `꽃 +${pvO.bloom}` : '피는 꽃 없음'}${pvO.melt ? `  녹음 -${pvO.melt}` : ''}${pvO.soak ? '  💢' : ''}`;
    ctx.font = `900 ${R(0.042)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(msg).width + 16, my = OY - RH * 0.25;
    ctx.fillStyle = 'rgba(10,30,50,.6)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, my - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.fillStyle = pvO.melt || pvO.soak ? '#ffc0b0' : pvO.bloom ? '#c8ffb0' : '#e0eef8';
    ctx.fillText(msg, w / 2, my + 1);
  }
  ctx.restore();

  // ── HUD ──
  const hg = ctx.createLinearGradient(0, 0, 0, top);
  hg.addColorStop(0, 'rgba(14,34,56,.86)');
  hg.addColorStop(1, 'rgba(14,34,56,.64)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${R(0.043)}px system-ui, sans-serif`;
  ctx.fillText(`🐘 ${s.day + 1}일째 / ${DAYS}`, 10, R(0.035));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★ ${s.stars}`, w * 0.56, R(0.035));
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, R(0.035));
  {
    const goals = GOALS[s.day], bx = w * 0.04, bw = w * 0.92, by = R(0.068), bh = R(0.044), lo = Math.max(0, s.startMeter - 2), max = goals[2] * 1.06;
    const at = (q: number) => bw * Math.max(0, Math.min(1, (q - lo) / (max - lo)));
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    const ok = s.meter >= goals[0];
    const bg2 = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    bg2.addColorStop(0, ok ? '#6ad47a' : '#ff8ab8');
    bg2.addColorStop(1, ok ? '#a8ec6a' : '#ffb86a');
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(bh, at(s.meter)), bh, bh / 2);
    ctx.fill();
    ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const gx = bx + at(goals[i]);
      ctx.fillStyle = 'rgba(10,20,40,.65)';
      ctx.fillRect(gx - 1, by, 2, bh);
      ctx.fillStyle = s.meter >= goals[i] ? '#ffd23f' : 'rgba(255,255,255,.6)';
      ctx.fillText('★'.repeat(i + 1), gx, by + bh + R(0.016));
    }
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 ${Math.max(12, R(0.037))}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`🌸 꽃밭 ${s.meter}/${goals[0]}${ok ? ' ✓' : ''}${s.flies ? `  🦋${s.flies}` : ''}`, bx + 8, by + bh / 2 + 1);
  }
  ctx.fillStyle = 'rgba(14,34,56,.78)';
  ctx.fillRect(0, bot, w, h - bot);
  {
    const n = SPRAYS[s.day], ds = Math.min(R(0.055), (w * 0.4) / n);
    for (let k = 0; k < n; k++) {
      ctx.globalAlpha = k < s.left ? 1 : 0.22;
      emo(ctx, '💧', 12 + ds * 0.5 + k * ds, bot + (h - bot) * 0.42, ds * 0.85);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = `700 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`물 ${s.left}번`, 12, bot + (h - bot) * 0.82);
    const sx0 = w * 0.5, sw = w * 0.46, sy = bot + (h - bot) * 0.38;
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.roundRect(sx0, sy - 3, sw, 6, 3);
    ctx.fill();
    const sg2 = ctx.createLinearGradient(sx0, 0, sx0 + sw, 0);
    sg2.addColorStop(0, '#ffe08a');
    sg2.addColorStop(1, '#ff7a5a');
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.roundRect(sx0, sy - 3, sw * f, 6, 3);
    ctx.fill();
    if (s.day >= 5) (ctx.fillStyle = '#b8c0ff'), ctx.fillRect(sx0 + sw * (EVE / DAY) - 1, sy - 6, 2, 12);
    emo(ctx, s.phase === 'night' ? '🌙' : f >= EVE / DAY ? '🌇' : '☀️', sx0 + sw * f, sy, R(0.04));
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.font = `700 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(s.phase === 'night' ? (s.retry ? '그날 다시…' : '잘 자요 🌙') : s.charge > 0 ? '쭈욱… 떼면 푸하!' : s.shot ? '푸하~' : s.left > 0 ? (s.day >= 4 && wind ? `바람 ${wind > 0 ? '→' : '←'} · 꽃 앞에서 꾹!` : '꽃 앞에 오면 꾹!') : '물 끝 — 해 질 녘까지', sx0 + sw / 2, sy + R(0.04));
  }
  // 새 소식 (하늘 자리)
  let ny = top + R(0.035);
  ctx.textAlign = 'center';
  for (const n of s.notes.slice(-2)) {
    const age = s.t - n.t, al = Math.min(1, (220 - age) / 30, age / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
    const tw = ctx.measureText(n.text).width + 18;
    ctx.fillStyle = 'rgba(12,30,52,.66)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - R(0.026), tw, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1);
    ny += R(0.06);
  }
  ctx.globalAlpha = 1;
  // 첫 안내
  if (s.day === 0 && s.used === 0 && s.t > 10) {
    const t1 = s.charge > 0 ? '물 표시가 봉오리에 닿으면 떼요!' : '👆 꾹 누르면 코끼리가 물을 쭈욱~', t2 = s.charge > 0 ? '오래 누를수록 멀리 가요' : '떼면 푸하! 물 닿은 봉오리가 피어요';
    ctx.font = `900 ${R(0.044)}px system-ui, sans-serif`;
    const tw = Math.max(ctx.measureText(t1).width, ctx.measureText(t2).width) + 24, hy = Y(ROWS + 0.9);
    ctx.fillStyle = 'rgba(12,30,52,.74)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, hy - R(0.04), tw, R(0.1), 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(t1, w / 2, hy - R(0.012));
    ctx.fillStyle = '#bfe8ff';
    ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
    ctx.fillText(t2, w / 2, hy + R(0.036));
  }

  // ───────── 그리기 도우미 ─────────
  function trunkTip(): [number, number] {
    const T = trunkPts();
    return [elX + T[3][0] * eu, elY + T[3][1] * eu];
  }
  /** 코 모양 (코끼리 발 기준, eu 단위): 평소엔 늘어져 끝이 말리고, 빨 땐 개울에 담그고, 뿜을 땐 번쩍 든다 */
  function trunkPts(): [number, number][] {
    const hic = last('hiccup'), spr = s.shot ? 0 : last('spray');
    const sway = Math.sin(s.t / 14) * 0.06;
    if (hic < DIZZY && hic < 26) return [[0, -1.05], [0.02, -1.5], [0, -1.9], [0.02, -2.2]];
    if (s.charge > 0) {
      const dip = Y(-0.5) - elY;
      return [[0, -1.05], [0.02, -0.55], [0.04, 0.0], [0.02, dip / eu]];
    }
    if (s.shot || spr < 14) return [[0, -1.05], [0.35, -1.0], [0.62, -1.5], [0.5, -1.95]];
    if (dance) {
      const q = Math.sin(s.t / 8) * 0.25;
      return [[0, -1.05], [0.3 + q, -1.1], [0.5 + q, -1.6], [0.35 + q, -2.0]];
    }
    return [[0, -1.05], [0.02 + sway, -0.7], [0.0 + sway, -0.42], [0.22 + sway, -0.48]];
  }

  function drawElephant() {
    const x = elX, y = elY, u = eu;
    const p = Math.min(1, s.charge / HIC), charging = s.charge > 0;
    const hic = last('hiccup'), bop = (() => { let a = 9999; for (const e of s.events) if (e.kind === 'bop') a = Math.min(a, s.t - e.t - 58); return a; })();
    const happy = last('bloom') < 50 && !charging;
    const n = Math.floor(s.wk / STEP), ph = s.wk - n * STEP, walking = s.phase === 'day' && !charging && !s.shot && s.dizzy === 0 && ph >= REST;
    const step = walking ? Math.sin(((ph - REST) / MOVE) * Math.PI) : 0;
    const shakeOff = hic >= 24 && hic < DIZZY ? Math.sin(hic * 1.3) * 0.22 * (1 - (hic - 24) / 30) : 0;
    const hop = dance ? Math.abs(Math.sin(s.t / 7)) * u * 0.18 : hic < 12 ? Math.sin((hic / 12) * Math.PI) * u * 0.25 : step * u * 0.06;
    const body = mix(charging && p > 0.55 ? mix('#a6b8cc', '#d8a0b4', (p - 0.55) * 1.6) : '#a6b8cc', '#2a3448', night * 0.55);
    const shade = mix('#8396ae', '#1e2638', night * 0.55), line = '#4a5a72';
    ell(x, y + 1, u * 0.95, u * 0.22, 'rgba(0,20,30,.28)');
    ctx.save();
    ctx.translate(x + (charging && p > 0.72 ? Math.sin(s.t * 2.3) * (p - 0.72) * u * 0.25 : 0), y - hop);
    ctx.rotate(shakeOff);
    if (sad) ctx.translate(0, u * 0.06);
    // 몸통·뒷다리·꼬리
    ell(-u * 0.6, -u * 0.3, u * 0.17, u * 0.3, shade);
    ell(u * 0.6, -u * 0.3, u * 0.17, u * 0.3, shade);
    ctx.strokeStyle = shade;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(u * 0.78, -u * 0.72);
    ctx.quadraticCurveTo(u * 0.98, -u * 0.6 + Math.sin(s.t / 5) * 3, u * 0.95, -u * 0.42);
    ctx.stroke();
    const bg = ctx.createRadialGradient(-u * 0.25, -u * 0.85, u * 0.1, 0, -u * 0.6, u * 0.95);
    bg.addColorStop(0, mix(body, '#ffffff', 0.18));
    bg.addColorStop(1, shade);
    ell(0, -u * 0.62, u * 0.82, u * 0.58, bg);
    // 앞다리 (걸을 땐 번갈아 든다)
    for (const sd of [-1, 1]) {
      const lift = walking ? Math.max(0, sd * Math.sin(((ph - REST) / MOVE) * Math.PI * 2)) * u * 0.12 : 0;
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(sd * u * 0.34 - u * 0.15, -u * 0.48 - lift, u * 0.3, u * 0.5, u * 0.1);
      ctx.fill();
      ctx.fillStyle = mix('#fff6ea', '#5a5a66', night * 0.5);
      for (let t = -1; t <= 1; t++) ell(sd * u * 0.34 + t * u * 0.08, -lift - u * 0.03, u * 0.045, u * 0.035, ctx.fillStyle as string);
    }
    // 귀 (펄럭, 빨 땐 활짝, 딸꾹엔 번쩍)
    const flap = Math.sin(s.t / 12) * 0.12 + (charging ? 0.25 * p : 0) + (hic < 20 ? 0.5 : 0) + (dance ? Math.sin(s.t / 4) * 0.3 : 0) - (sad ? 0.35 : 0);
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * u * 0.48, -u * 1.25);
      ctx.rotate(sd * (0.25 + flap));
      ell(sd * u * 0.22, u * 0.05, u * 0.42, u * 0.5, body);
      ell(sd * u * 0.24, u * 0.07, u * 0.29, u * 0.37, mix('#f6aac0', '#4a2a38', night * 0.5));
      ctx.restore();
    }
    // 머리 + 빵빵한 볼
    const hx = 1 + p * 0.18;
    ctx.save();
    ctx.scale(hx, 1);
    const hg2 = ctx.createRadialGradient(-u * 0.18, -u * 1.42, u * 0.05, 0, -u * 1.2, u * 0.62);
    hg2.addColorStop(0, mix(body, '#ffffff', 0.22));
    hg2.addColorStop(1, body);
    ell(0, -u * 1.2, u * 0.56, u * 0.52, hg2);
    ctx.restore();
    if (charging) {
      for (const sd of [-1, 1]) {
        const cr = u * (0.15 + p * 0.33), cx = sd * u * (0.36 + p * 0.22);
        const cg = ctx.createRadialGradient(cx - sd * cr * 0.3, -u * 1.08 - cr * 0.3, cr * 0.1, cx, -u * 1.02, cr);
        cg.addColorStop(0, mix(body, '#ffffff', 0.35));
        cg.addColorStop(1, body);
        ell(cx, -u * 1.02, cr, cr * 0.92, cg);
        ctx.strokeStyle = 'rgba(60,70,95,.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, -u * 1.02, cr, cr * 0.92, 0, sd > 0 ? -1.2 : Math.PI - 0.9, sd > 0 ? 0.9 : Math.PI + 1.2);
        ctx.stroke();
        ctx.globalAlpha = 0.35 + p * 0.45;
        ell(cx, -u * 0.97, cr * 0.62, cr * 0.42, '#ff7aa0');
        ctx.globalAlpha = 1;
        ell(cx - sd * cr * 0.35, -u * 1.02 - cr * 0.45, cr * 0.18, cr * 0.12, 'rgba(255,255,255,.75)');
      }
    } else if (happy || dance) for (const sd of [-1, 1]) ((ctx.globalAlpha = 0.55), ell(sd * u * 0.34, -u * 1.05, u * 0.1, u * 0.06, '#ff8aa8'), (ctx.globalAlpha = 1));
    // 눈
    ctx.lineCap = 'round';
    for (const sd of [-1, 1]) {
      const ex0 = sd * u * 0.2, ey0 = -u * 1.33, er = u * 0.1;
      ctx.strokeStyle = '#1e2430';
      ctx.lineWidth = 2;
      if (s.dizzy > 0 && (hic < DIZZY || bop < 40)) {
        ctx.beginPath();
        for (let a2 = 0; a2 < 9; a2++) {
          const an = a2 * 0.9 + s.t / 4, rr = er * (a2 / 9);
          ctx.lineTo(ex0 + Math.cos(an) * rr, ey0 + Math.sin(an) * rr);
        }
        ctx.stroke();
      } else if (charging) {
        ctx.beginPath();
        ctx.moveTo(ex0 - sd * er, ey0 - er * 0.7);
        ctx.lineTo(ex0 + sd * er * 0.6, ey0);
        ctx.lineTo(ex0 - sd * er, ey0 + er * 0.7);
        ctx.stroke();
      } else if (happy || dance) {
        ctx.beginPath();
        ctx.arc(ex0, ey0 + er * 0.4, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      } else if (sad) {
        ctx.beginPath();
        ctx.arc(ex0, ey0 - er * 0.3, er * 0.8, Math.PI * 0.15, Math.PI * 0.85);
        ctx.stroke();
        const tp = ((s.t + (sd > 0 ? 9 : 0)) % 26) / 26;
        ell(ex0, ey0 + er + tp * u * 0.3, 1.6, 2, '#7fc8ff');
      } else if (s.shot || last('spray') < 16) {
        ell(ex0, ey0, er * 1.2, er * 1.35, '#ffffff');
        ell(ex0, ey0, er * 0.4, er * 0.4, '#1e2430');
      } else if (s.t % 190 < 7) {
        ctx.beginPath();
        ctx.moveTo(ex0 - er, ey0);
        ctx.lineTo(ex0 + er, ey0);
        ctx.stroke();
      } else {
        const look = pvRow >= 0 ? 0.6 : (exT - ex) * 2;
        ell(ex0, ey0, er, er * 1.15, '#ffffff');
        ell(ex0 + look * er * 0.3, ey0 + er * 0.25, er * 0.58, er * 0.62, '#1e2430');
        ell(ex0 + look * er * 0.3 - er * 0.2, ey0, er * 0.18, er * 0.18, '#ffffff');
      }
      // 눈썹: 빨 땐 힘줌, 딸꾹 직전엔 땀
      if (charging) {
        ctx.beginPath();
        ctx.moveTo(ex0 - sd * er * 1.1, ey0 - er * 1.7);
        ctx.lineTo(ex0 + sd * er * 0.9, ey0 - er * 1.3);
        ctx.stroke();
      }
    }
    if (charging && p > 0.62) {
      const tp = (s.t % 24) / 24;
      ell(u * 0.62 * hx, -u * 1.45 + tp * u * 0.3, 2, 2.6, '#9fd8ff');
      if (p > 0.82) ell(-u * 0.6 * hx, -u * 1.5 + ((s.t + 12) % 24) / 24 * u * 0.3, 2, 2.6, '#9fd8ff');
    }
    // 입 (코 옆에 작게)
    ctx.strokeStyle = '#3a2a34';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (s.shot || last('spray') < 16) (ctx.fillStyle = '#7a2a3a'), ctx.ellipse(-u * 0.2, -u * 0.95, u * 0.07, u * 0.09, 0, 0, Math.PI * 2), ctx.fill();
    else if (sad) (ctx.arc(-u * 0.2, -u * 0.86, u * 0.08, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
    else if (!charging) (ctx.arc(-u * 0.2, -u * 1.0, u * 0.08, 0.3, Math.PI - 0.3), ctx.stroke());
    // 코
    const T = trunkPts(), thick = u * (0.2 + (charging ? 0.06 + p * 0.12 : 0));
    const tp2 = T.map(([a2, b2]) => [a2 * u, b2 * u] as [number, number]);
    for (const [c, lw] of [[line, thick + 2.4], [body, thick]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(...tp2[0]);
      ctx.bezierCurveTo(...tp2[1], ...tp2[2], ...tp2[3]);
      ctx.stroke();
    }
    // 코 주름 + 꿀꺽꿀꺽 물 덩어리
    const bzT = (q: number): [number, number] => {
      const m = 1 - q;
      return [m * m * m * tp2[0][0] + 3 * m * m * q * tp2[1][0] + 3 * m * q * q * tp2[2][0] + q * q * q * tp2[3][0], m * m * m * tp2[0][1] + 3 * m * m * q * tp2[1][1] + 3 * m * q * q * tp2[2][1] + q * q * q * tp2[3][1]];
    };
    ctx.strokeStyle = 'rgba(60,70,90,.45)';
    ctx.lineWidth = 1;
    for (const q of [0.35, 0.55, 0.75]) {
      const [qx, qy] = bzT(q);
      ctx.beginPath();
      ctx.arc(qx, qy - thick * 0.5, thick * 0.45, Math.PI * 0.3, Math.PI * 0.7);
      ctx.stroke();
    }
    if (charging) {
      for (let g2 = 0; g2 < 2; g2++) {
        const q = 1 - (((s.t * (1.6 + p) + g2 * 22) % 44) / 44);
        const [qx, qy] = bzT(q);
        ell(qx, qy, thick * 0.75, thick * 0.6, body);
        ctx.globalAlpha = 0.5;
        ell(qx - thick * 0.15, qy - thick * 0.15, thick * 0.25, thick * 0.2, '#ffffff');
        ctx.globalAlpha = 1;
      }
      // 개울에 동심원
      const [qx, qy] = tp2[3];
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1;
      for (let r2 = 0; r2 < 2; r2++) {
        const rp = ((s.t + r2 * 14) % 28) / 28;
        ctx.globalAlpha = 1 - rp;
        ctx.beginPath();
        ctx.ellipse(qx, qy, 3 + rp * 10, 1.5 + rp * 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    ell(tp2[3][0], tp2[3][1], thick * 0.55, thick * 0.4, mix(body, '#000000', 0.12));
    ell(tp2[3][0] - thick * 0.18, tp2[3][1], 1.3, 1.3, '#3a3a48');
    ell(tp2[3][0] + thick * 0.18, tp2[3][1], 1.3, 1.3, '#3a3a48');
    // 딸꾹: 머리 위로 분수가 쏟아진다
    if (hic < 34) {
      for (let d2 = 0; d2 < 14; d2++) {
        const q = ((hic * 2 + d2 * 7) % 40) / 40, an = -Math.PI / 2 + (hsh(d2) - 0.5) * 1.4;
        const dx2 = tp2[3][0] + Math.cos(an) * q * u * 0.9, dy2 = tp2[3][1] + Math.sin(an) * q * u * 1.2 + q * q * u * 1.6;
        ell(dx2, dy2, 2, 2.4, 'rgba(160,220,255,.9)');
      }
    }
    // 부르르 털기: 물방울이 사방으로
    if (shakeOff)
      for (let d2 = 0; d2 < 10; d2++) {
        const an = hsh(d2 * 5) * Math.PI * 2, q = ((hic - 24 + d2 * 3) % 18) / 18;
        ell(Math.cos(an) * u * (0.7 + q * 0.7), -u * 0.9 + Math.sin(an) * u * (0.5 + q * 0.6), 1.8, 1.8, 'rgba(170,225,255,.9)');
      }
    // 혹 + 어질어질 별
    if (s.dizzy > 0) {
      if (bop < 60) ell(u * 0.12, -u * 1.7, u * 0.1, u * 0.08, '#e88aa0');
      for (let k2 = 0; k2 < 3; k2++) {
        const an = s.t / 8 + (k2 * Math.PI * 2) / 3;
        emo(ctx, '⭐', Math.cos(an) * u * 0.55, -u * 1.85 + Math.sin(an) * u * 0.15, u * 0.22);
      }
    }
    // 머리 위 개구리 (젖어서 화난 개구리가 올라앉음)
    let onHead = s.onHead;
    for (const e of s.events) if (e.kind === 'soak' && e.text === '🐸' && s.t - e.t < 60) onHead--;
    for (let i = 0; i < onHead; i++) drawFrogAt((i - (onHead - 1) / 2) * u * 0.42, -u * 1.72, u * 0.85, 'grump');
    if (dance && s.t % 80 < 40) emo(ctx, '🎵', u * 0.9, -u * 2.2 - (s.t % 40) * 0.3, u * 0.3);
    ctx.restore();
    // 날아가는 동물 (젖으면 코끼리에게 가서 펀치)
    for (const e of s.events) {
      if (e.kind !== 'soak') continue;
      const age = s.t - e.t;
      if (age > 90) continue;
      const [cx, cy] = cellXY(e.k), [hx2, hy2] = [x, y - u * 1.7];
      let px: number, py: number, rot = 0;
      if (age < 28) (px = cx + Math.sin(age * 1.4) * 3), (py = cy - Math.sin((age / 28) * Math.PI) * u * 0.6), (rot = Math.sin(age * 1.4) * 0.4);
      else if (age < 58) {
        const q = (age - 28) / 30;
        px = cx + (hx2 - cx) * q;
        py = cy + (hy2 - cy) * q - Math.sin(q * Math.PI) * u * 1.1;
        rot = q * 6;
      } else if (e.text === '🐈') {
        const q = (age - 58) / 32;
        px = hx2 + (hx2 > w / 2 ? -1 : 1) * q * w * 0.6;
        py = hy2 + q * u * 0.8;
      } else continue;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      if (e.text === '🐸') drawFrogAt(0, 0, U(1.5) * 1.1, 'angry');
      else emo(ctx, '🐈', 0, 0, U(2) * 0.6, age >= 58 ? hx2 <= w / 2 : hx2 > cx);
      ctx.restore();
      if (age < 58) emo(ctx, '💢', px + 8, py - 10, 13);
      if (age < 28)
        for (let d2 = 0; d2 < 6; d2++) {
          const an = hsh(d2 + age) * Math.PI * 2;
          ell(px + Math.cos(an) * 12, py + Math.sin(an) * 8, 1.6, 1.6, 'rgba(170,225,255,.95)');
        }
    }
  }

  function drawFrogAt(x: number, y: number, size: number, mood: 'sleep' | 'angry' | 'grump') {
    const sz = size * 0.32, g1 = mix('#5ec84a', '#1e3a20', night * 0.5), g2 = mix('#3e9a34', '#14281a', night * 0.5);
    ell(x, y, sz * 1.1, sz * 0.75, g1);
    ell(x, y + sz * 0.25, sz * 0.75, sz * 0.4, mix('#c8f0a0', '#3a4a30', night * 0.5));
    for (const sd of [-1, 1]) {
      ell(x + sd * sz * 0.5, y - sz * 0.62, sz * 0.36, sz * 0.32, g1);
      ell(x + sd * sz * 0.85, y + sz * 0.55, sz * 0.32, sz * 0.14, g2);
      ctx.strokeStyle = '#1a2a1a';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (mood === 'sleep') ctx.arc(x + sd * sz * 0.5, y - sz * 0.62, sz * 0.18, 0.2, Math.PI - 0.2);
      else {
        ell(x + sd * sz * 0.5, y - sz * 0.64, sz * 0.22, sz * 0.22, '#ffffff');
        ell(x + sd * sz * 0.48, y - sz * 0.6, sz * 0.11, sz * 0.11, '#1a2a1a');
        ctx.moveTo(x + sd * sz * 0.25, y - sz * 0.98 + (mood === 'angry' ? 0 : sz * 0.1));
        ctx.lineTo(x + sd * sz * 0.75, y - sz * 0.82);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = '#1a2a1a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    if (mood === 'sleep') ctx.arc(x, y - sz * 0.12, sz * 0.35, 0.3, Math.PI - 0.3);
    else (ctx.moveTo(x - sz * 0.3, y - sz * 0.02), ctx.lineTo(x + sz * 0.3, y - sz * 0.02));
    ctx.stroke();
  }
  function drawFrog(k: number) {
    const [x, y] = cellXY(k), r = (k / COLS) | 0, u = U(r + 0.5);
    ell(x, y, u * 0.38, u * 0.16, mix('#4aa850', '#163020', night * 0.5));
    ell(x + u * 0.12, y - 1, u * 0.1, u * 0.05, mix('#7ad070', '#1e3a24', night * 0.5));
    const breathe = 1 + Math.sin(s.t / 18 + k) * 0.05;
    drawFrogAt(x, y - u * 0.18, u * breathe, 'sleep');
    // 쿨쿨
    for (let z = 0; z < 2; z++) {
      const q = ((s.t + z * 45 + k * 9) % 90) / 90;
      ctx.globalAlpha = 1 - q;
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.max(10, u * (0.22 + q * 0.14))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('z', x + u * 0.25 + q * u * 0.3, y - u * 0.5 - q * u * 0.5);
      ctx.globalAlpha = 1;
    }
    if (pv[k] === C_SOAK) emo(ctx, '😱', x, y - u * 0.95, u * 0.3);
  }
  function drawCat(uu: number) {
    const [gx, gz] = catXY(uu), [x, y] = P(gx, gz, bedY), u = U(gz), nx = catXY(uu + 0.05)[0];
    ell(x, y, u * 0.3, u * 0.1, 'rgba(0,0,0,.25)');
    const bob = Math.abs(Math.sin(s.t / 5)) * 1.5;
    emo(ctx, '🐈', x, y - u * 0.25 - bob, u * 0.55, nx > gx);
    const k = Math.round(gz - 0.5) * COLS + Math.round(gx - 0.5);
    if (pv[k] === C_SOAK) emo(ctx, '🙀', x, y - u * 0.8, u * 0.3);
  }

  function drawPlant(k: number) {
    const kd = G.kind[k];
    if (kd === SOIL) return;
    const r = (k / COLS) | 0, [x, y] = cellXY(k), u = U(r + 0.5), sp = G.sp[k], wat = G.water[k], age = recent(k);
    const nt = night * 0.55, swayA = Math.sin(s.t / 26 + k * 1.7) * 0.06 + (s.day >= 4 && wind ? wind * 0.12 : 0) + (dance ? Math.sin(s.t / 7 + k) * 0.15 : 0);
    if (kd === PUDDLE) {
      ell(x, y, u * 0.4, u * 0.18, mix('#5ab0e8', '#1a3a66', nt));
      ell(x - u * 0.1, y - 1, u * 0.16, u * 0.05, 'rgba(255,255,255,.5)');
      for (let p = 0; p < 2; p++) {
        const q = ((s.t + p * 40 + k * 7) % 80) / 80;
        ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - q)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(x, y, u * 0.1 + q * u * 0.25, u * 0.04 + q * u * 0.1, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ell(x + u * 0.15, y + 1, u * 0.06, u * 0.03, HUES[G.hue[k]]);
      if (age < 60) {
        ctx.globalAlpha = 1 - age / 60;
        drawBloomHead(x, y - u * 0.45 * (1 - age / 60), u * (1 - age / 80), sp, G.hue[k], 0, true);
        ctx.globalAlpha = 1;
      }
      return;
    }
    const stemH = u * (sp === SUNF ? 1.05 : 0.62) * (kd === WILT ? 0.6 : 1);
    const droop = kd === WILT ? 0.9 : kd === BUD && wat === 0 && !(sp === MOONF) ? 0.45 : 0;
    ell(x + u * 0.06, y + 1, u * 0.22, u * 0.07, 'rgba(30,15,5,.3)');
    // 줄기·잎
    const pop = kd === BLOOM && age < 24 ? 1 + Math.sin((age / 24) * Math.PI) * 0.4 : 1;
    const an = swayA + droop;
    const tx = x + Math.sin(an) * stemH * pop, ty = y - Math.cos(an) * stemH * pop;
    ctx.strokeStyle = kd === WILT ? mix('#8a6a3a', '#2a2014', nt) : mix('#3a9a3a', '#123018', nt);
    ctx.lineWidth = sp === SUNF ? 2.6 : 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.sin(an) * stemH * 0.2, y - stemH * 0.6, tx, ty);
    ctx.stroke();
    for (const sd of [-1, 1]) ell(x + sd * u * 0.13 + Math.sin(an) * stemH * 0.3, y - stemH * 0.32, u * 0.15, u * 0.06, kd === WILT ? mix('#9a7a4a', '#2a2014', nt) : mix('#5ab848', '#163a1c', nt), sd * 0.5);
    if (kd === WILT) {
      ell(tx, ty, u * 0.08, u * 0.07, mix('#7a5a3a', '#2a1e14', nt));
      return;
    }
    if (kd === BUD) {
      // 봉오리: 물 한 모금 마시면 통통해진다. 아래 동그라미 = 필 때까지 남은 물
      const fat = 1 + (wat / BLOOM_AT[sp]) * 0.5, bc = sp === SUNF ? '#7ac850' : sp === MOONF ? '#d8e4ff' : HUES[G.hue[k]];
      const bs = u * (sp === SUNF ? 0.19 : 0.13) * fat * (age < 20 ? age / 20 : 1);
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(an);
      ell(0, -bs * 0.6, bs * 0.75, bs * 1.15, mix(bc, '#1a1a30', nt));
      ell(0, bs * 0.2, bs * 0.8, bs * 0.45, mix('#4aa840', '#123018', nt));
      if (sp === MOONF && !(eve || s.phase === 'night')) emo(ctx, '🌙', bs * 1.2, -bs * 1.4, u * 0.2);
      ctx.restore();
      const need = BLOOM_AT[sp], pr = 2.6;
      for (let i = 0; i < need; i++) {
        const px = x + (i - (need - 1) / 2) * pr * 2.6, py = y + u * 0.13;
        ell(px, py, pr, pr, i < wat ? '#3ab0ff' : 'rgba(255,255,255,.75)');
        ctx.strokeStyle = 'rgba(0,40,80,.5)';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.stroke();
      }
      return;
    }
    // 핀 꽃
    const full = wat >= MELT_AT[sp] - 1, wob = full ? Math.sin(s.t / 3 + k) * 0.08 : 0;
    const closed = sp === MOONF && !(eve || s.phase === 'night');
    const lookX = sp === SUNF ? Math.max(-1, Math.min(1, (ex - (k % COLS)) / 3)) : 0;
    drawBloomHead(tx, ty, u * pop * (1 + wob), sp, G.hue[k], lookX, closed);
    if (full) {
      // 물을 가득 머금음: 물방울이 맺히고 흔들린다
      ell(tx + u * 0.2, ty - u * 0.12 + Math.sin(s.t / 6) * 1.2, 2.2, 2.8, '#7fd3ff');
      ell(tx - u * 0.18, ty + u * 0.08, 1.8, 2.2, '#9fdcff');
    }
  }
  function drawBloomHead(x: number, y: number, u: number, sp: number, hue: number, lookX: number, closed: boolean) {
    const nt = night * 0.45;
    if (sp === SUNF) {
      const R0 = u * 0.34, cx = x + lookX * u * 0.06;
      for (let i = 0; i < 12; i++) {
        const an = (i / 12) * Math.PI * 2 + s.t / 300;
        ell(x + Math.cos(an) * R0 * 0.95, y + Math.sin(an) * R0 * 0.8, R0 * 0.42, R0 * 0.2, mix(i % 2 ? '#ffd23f' : '#ffc02a', '#3a3014', nt), an);
      }
      ell(cx, y, R0 * 0.6, R0 * 0.55, mix('#8a4a1a', '#2a1808', nt));
      // 해바라기 얼굴: 코끼리 쪽을 본다
      ctx.fillStyle = '#2a1408';
      for (const sd of [-1, 1]) ell(cx + sd * R0 * 0.2 + lookX * R0 * 0.12, y - R0 * 0.1, R0 * 0.07, R0 * 0.09, '#2a1408');
      ctx.strokeStyle = '#2a1408';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx + lookX * R0 * 0.12, y + R0 * 0.05, R0 * 0.2, 0.3, Math.PI - 0.3);
      ctx.stroke();
      return;
    }
    if (sp === MOONF) {
      const R0 = u * 0.27;
      if (closed) {
        ell(x, y, R0 * 0.5, R0 * 0.85, mix('#c8d4f0', '#3a4060', nt));
        ell(x + R0 * 0.15, y - R0 * 0.1, R0 * 0.2, R0 * 0.55, mix('#e8eeff', '#4a5070', nt));
        return;
      }
      ctx.shadowColor = '#bcd0ff';
      ctx.shadowBlur = 8 + dusk * 20;
      for (let i = 0; i < 5; i++) {
        const an = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ell(x + Math.cos(an) * R0 * 0.62, y + Math.sin(an) * R0 * 0.55, R0 * 0.5, R0 * 0.36, '#f0f4ff', an);
      }
      ctx.shadowBlur = 0;
      ell(x, y, R0 * 0.3, R0 * 0.28, '#fff4a8');
      return;
    }
    const R0 = u * 0.27, c = HUES[hue], c2 = HUES2[hue];
    for (let i = 0; i < 5; i++) {
      const an = (i / 5) * Math.PI * 2 - Math.PI / 2 + hue;
      ell(x + Math.cos(an) * R0 * 0.62, y + Math.sin(an) * R0 * 0.52, R0 * 0.52, R0 * 0.38, mix(c, '#1a1a30', nt), an);
      ell(x + Math.cos(an) * R0 * 0.5, y + Math.sin(an) * R0 * 0.42, R0 * 0.24, R0 * 0.16, mix(c2, '#2a2a40', nt), an);
    }
    ell(x, y, R0 * 0.3, R0 * 0.27, mix('#ffe066', '#3a3010', nt));
    if (closed) return;
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0 };
const rplans = new WeakMap<object, { press: number; hold: number; n: number }>();
/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const elephantRandom: Bot<ElephantState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'day' || s.left <= 0 || s.shot || s.dizzy) return OFF;
    let m = rplans.get(s);
    if (s.charge === 0 && (!m || m.n !== s.presses)) rplans.set(s, (m = { press: s.dayT + 10 + Math.floor(rng() * 140), hold: 3 + Math.floor(rng() * 122), n: s.presses }));
    if (s.charge === 0) return { tap: false, dir: 0, hold: s.dayT >= m!.press };
    return { tap: false, dir: 0, hold: s.charge < m!.hold };
  },
};

interface Plan { pc: number; row: number; h: number; wait: number; v: number }
/** 줄 7개 × 거리 6가지를 다 흉내 낸다: 코끼리가 그 줄에 올 때까지 기다리는 시간, 떼는 순간의 바람, 떨어질 때 고양이 자리까지 */
function plan(s: ElephantState): Plan | null {
  const G = s.g, now = s.dayT, left = s.left;
  let moon = 0;
  for (let k = 0; k < NC; k++) if (G.kind[k] === BUD && G.sp[k] === MOONF) moon++;
  // 달맞이꽃 몫은 해 질 녘까지 남겨 둔다
  const reserve = now < EVE && moon ? Math.min(left, Math.ceil(moon * 0.7)) : 0;
  const slack = DAY - now - left * 140, tw = slack < 0 ? 0.01 : 0.0025;
  let best: Plan | null = null, bv = 0.2;
  for (let pc = 0; pc < COLS; pc++) {
    const wait = arriveIn(s.wk, pc);
    if (wait > 420) continue;
    for (let r = 0; r < ROWS; r++) {
      const hh = holdFor(r), tRel = now + wait + hh, tLand = tRel + FLY(r);
      if (tLand >= DAY - 2) continue;
      if (reserve && left <= reserve && tLand < EVE) continue;
      const cat = catAt(s, tLand), o = resolve(s, pc + windAt(s, tRel), r, s.used === 0, cat ? cat.cell : -1, tLand >= EVE, true);
      // 동물을 적시면 물 한 번을 잃는다 — 남은 봉오리보다 물이 넉넉하면 덜 아깝다
      const spare = left - 1 >= s.buds - o.bloom, v = o.dm + (left > 1 ? o.prog * 0.42 : 0) - o.soak * (left > 1 && !spare ? 1.6 : 0.3) - o.full * 0.12 - (wait + hh) * tw;
      if (v > bv) (bv = v), (best = { pc, row: r, h: hh, wait, v });
    }
  }
  return best;
}
const splans = new WeakMap<object, { h: number; at: number; p: Plan | null }>();
/** 잘하는 봇: 줄 7 × 거리 6을 다 흉내 내서 꽃은 많이 피우고 녹이거나 동물을 적시지 않는 물줄기를 골라, 코끼리가 그 줄에 오면 누르고 그만큼 뗀다 */
export const elephantSmart: Bot<ElephantState> = {
  name: '물뿌리개 장인',
  act(s) {
    if (s.phase !== 'day' || s.shot || s.dizzy || s.left <= 0) return OFF;
    let m = splans.get(s);
    if (s.charge > 0) return { tap: false, dir: 0, hold: s.charge < (m?.h ?? 40) - 1 };
    if (!m || s.t - m.at >= 6 || (m.p && m.p.wait <= 6)) splans.set(s, (m = { h: 0, at: s.t, p: plan(s) }));
    const p = m.p;
    if (!p || Math.round(walkX(s.wk)) !== p.pc || arriveIn(s.wk, p.pc) !== 0) return OFF;
    m.h = p.h;
    return { tap: false, dir: 0, hold: true };
  },
};

