/**
 * 단면 인형의 집 (19라운드 디오라마 메뉴 5번) — 타이밍 쌓기 × 꾸미기 · 원버튼.
 * 기준 9(조작 최소): 방이 장난감 크레인 줄에 매달려 좌우로 흔들린다. 탭하면 그 자리에서 쿵 떨어져 아래 칸 꼭대기에 앉는다.
 * 집은 왼쪽·오른쪽 두 칸짜리 단면 인형의 집이라, 탭하는 순간이 '언제'이자 '어느 칸'이다.
 * 와우: 딱 맞게 쌓으면 아래 방과 계단으로 이어지고 주민이 이사 와 불이 켜진다. 부엌 위 식당 = 만찬, 온실 옆 다락 = 옥상 정원 — 방이 변신한다.
 * 첫 3초: 첫 방(부엌)은 어디에 떨어뜨려도 딱 맞게 앉고, 요리사가 들어와 냄비에서 김이 오른다.
 * 목표·보상: 집마다 방 N개 — 행복 목표를 넘기면 별 둘, 더 높으면 셋. 너무 기울면 와르르(하트 -1, 그 집만 다시). 8채를 지으면 마을 완성.
 * 고민: 다음 방 둘이 미리 보인다 — 어느 칸에 놓을지(콤보·균형·다락은 그 칸을 닫는다·넓은 방은 두 칸 높이가 같아야)가 수가 된다.
 * 하는 일이 바뀐다: 식당(2채, 부엌 위에) → 다락(3채, 지붕이라 그 칸이 닫힘) → 온실(4채, 다락 옆이면 정원) → 바람(5채, 바람 반대쪽을 노림)
 *                  → 무도회장(6채, 두 칸짜리 — 높이를 맞춰 둬야) → 욕실(7채, 침실 옆이면 아늑).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45, GY = 1.2, FH = 0.135, RW = 0.3, HALF = RW / 2, CLEAR = 0.15, ROPE = 0.3;
const IMB = 1.0, CK = 2.0, TILT = 0.024, G = 0.0011, DESC = 28, SETTLE = 16, HOUSES = 8;
/** 집 중심에서 왼쪽 칸·오른쪽 칸·두 칸짜리 방의 중심 */
const COLX = [-HALF, HALF, 0];

export type RT = 'kitchen' | 'bed' | 'living' | 'dining' | 'attic' | 'green' | 'hall' | 'bath';
/** 방: 가구 · 이름 · 주민 · 벽지 · 마루 · 벽지 무늬 */
const RD: Record<RT, { e: string; name: string; who: string; wall: string; floor: string; pat: number }> = {
  kitchen: { e: '🍲', name: '부엌', who: '🧑‍🍳', wall: '#ffe0a8', floor: '#c98a55', pat: 0 },
  bed: { e: '\u{1F6CF}️', name: '침실', who: '👵', wall: '#d6c6ff', floor: '#a7795a', pat: 1 },
  living: { e: '\u{1F6CB}️', name: '거실', who: '🧑', wall: '#bfe9d2', floor: '#b07f52', pat: 2 },
  dining: { e: '\u{1F37D}️', name: '식당', who: '🧔', wall: '#ffc6bd', floor: '#9c6b45', pat: 1 },
  attic: { e: '📦', name: '다락', who: '🐈', wall: '#ecd3a2', floor: '#8a6440', pat: 3 },
  green: { e: '🪴', name: '온실', who: '👩‍🌾', wall: '#c6efb4', floor: '#8fae6a', pat: 3 },
  hall: { e: '🪩', name: '무도회장', who: '💃', wall: '#6a58b8', floor: '#7a5230', pat: 2 },
  bath: { e: '🛁', name: '욕실', who: '🦆', wall: '#bfe6ff', floor: '#9fc1d6', pat: 0 },
};

/** 집(판)마다: 방 수 · 흔들림 각속도 · 흔들림 폭 · '딱' 허용 오차 · 넘어지는 기울기 · 바람 세기 */
const par = (k: number) => ({
  n: [5, 6, 7, 7, 8, 8, 9, 9][Math.min(k, 7)],
  om: (2 * Math.PI) / Math.max(92, 165 - 11 * k),
  amp: k === 0 ? 0.26 : Math.min(0.34, 0.31 + 0.005 * k),
  win: k === 0 ? 0.038 : Math.max(0.015, 0.029 - 0.002 * k),
  limit: k === 0 ? 6 : Math.max(2.5, 3.4 - 0.12 * k),
  wind: k >= 4 ? 0.0011 + 0.0003 * (k - 4) : 0,
});

interface Room { t: RT; col: number; floor: number; e: number; q: number; perfect: boolean; stairs: boolean; born: number; seed: number; combo: string }
export interface Hang { t: RT; phase: number; age: number; wind: number }
/** 떨어뜨리면 어디에 어떻게 앉는가 (봇이 내다볼 때도 같은 함수) */
export interface Land { col: number; floor: number; e: number; q: number; perfect: boolean; off: boolean; x: number; n: number }
interface Fall { t: RT; x0: number; y0: number; k: number; wind: number; rot: number; land: Land }
interface Junk { t: RT; x: number; y: number; dir: number; born: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string }
export interface HouseState {
  rng: Rng; t: number; stage: number; deck: RT[]; di: number; hang: Hang | null; fall: Fall | null; wait: number;
  rooms: Room[]; h: number[]; cap: boolean[]; crooked: number; happy: number; goal: number; goal3: number; placed: number;
  hearts: number; stars: number; bank: number; built: number; village: { h0: number; h1: number; st: number }[];
  pause: number; cleared: boolean; clearT: number; toppled: number; finished: boolean; junk: Junk[];
  /** 웃음 연출용: 마지막 쿵(비뚤)·콤보·딱 시각 */
  thudT: number; comboT: number; perfT: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const ev = (s: HouseState, kind: string, x: number, y: number, text?: string, col?: string) => s.events.push({ t: s.t, kind, x, y, text, col });
function see(s: HouseState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, 0, text);
}
export const lean = (s: HouseState) => s.crooked + IMB * (s.h[1] - s.h[0]);
const theta = (s: HouseState) => lean(s) * TILT;
const hmax = (s: HouseState) => Math.max(s.h[0], s.h[1]);
/** 매달린 방 중심의 높이 (가장 높은 칸 꼭대기보다 CLEAR 위) */
const hangY = (s: HouseState) => GY - hmax(s) * FH - CLEAR - FH / 2;
/** 매달린 방의 x — dt틱 뒤 */
export const hx = (s: HouseState, h: Hang, dt = 0) => 0.5 + par(s.stage).amp * Math.sin(h.phase + par(s.stage).om * dt);
const fallN = (d: number) => Math.max(1, Math.ceil((-1 + Math.sqrt(1 + (8 * d) / G)) / 2));
const winOf = (s: HouseState) => (s.stage === 0 && s.placed === 0 ? 0.15 : par(s.stage).win);
/** 집 기준 좌표(가로 l, 높이 u) → 세상 좌표 (집이 기운 만큼 돌려서) */
function world(s: HouseState, l: number, u: number) {
  const th = theta(s);
  return { x: 0.5 + l * Math.cos(th) + u * Math.sin(th), y: GY - (u * Math.cos(th) - l * Math.sin(th)) };
}
const roomAt = (rooms: Room[], f: number, c: number) => rooms.find((r) => r.floor === f && (r.col === c || r.col === 2));

export function resolve(s: HouseState, t: RT, x: number, wind: number): Land {
  const th = theta(s), wide = t === 'hall', hm = hmax(s);
  let col = wide ? 2 : x < 0.5 ? 0 : 1, l = 0, n = 1, lx = x, hc = 0;
  for (let it = 0; it < 3; it++) {
    hc = col === 2 ? hm : s.h[col];
    n = fallN((hm - hc) * FH + CLEAR);
    lx = x + wind * n;
    l = (lx - 0.5 - hc * FH * Math.sin(th)) / Math.cos(th);
    if (!wide) col = l < 0 ? 0 : 1;
  }
  hc = col === 2 ? hm : s.h[col];
  const e = l - COLX[col], q = e / HALF;
  const off = wide ? Math.abs(e) > RW * 0.8 || s.cap[0] || s.cap[1] : s.cap[col] || (Math.abs(q) > 1 && Math.sign(e) === Math.sign(COLX[col]));
  return { col, floor: hc, e, q, perfect: !off && Math.abs(e) <= winOf(s), off, x: lx, n };
}

function makeDeck(s: HouseState): RT[] {
  const k = s.stage, n = par(k).n, r = s.rng;
  const basic: RT[] = k >= 6 ? ['kitchen', 'bed', 'living', 'bath', 'bed'] : ['kitchen', 'bed', 'living'];
  const tail: RT[] = k >= 4 ? ['green', 'attic', 'attic'] : k >= 3 ? ['green', 'attic'] : k >= 2 ? ['attic'] : [];
  const body = n - tail.length, d: RT[] = [];
  while (d.length < body) {
    const x = basic[Math.floor(r() * basic.length)];
    d.push(x);
    if (x === 'kitchen' && k >= 1 && d.length < body && r() < 0.75) d.push('dining');
  }
  if (k === 0) d[0] = 'kitchen';
  if (k === 1) (d[0] = 'kitchen'), (d[1] = 'dining');
  if (k >= 5) d[1 + Math.floor(r() * Math.max(1, body - 2))] = 'hall';
  return [...d, ...tail];
}

/** 이 덱으로 낼 수 있는 콤보 보너스의 최대 */
function comboMax(d: RT[]) {
  let v = 0;
  d.forEach((t, i) => {
    if (t === 'dining' && d.slice(0, i).includes('kitchen')) v += 6;
    if (t === 'hall') v += 8;
    if (t === 'bath' && d.includes('bed')) v += 5;
  });
  if (d.includes('green') && d.includes('attic')) v += 8;
  return v;
}

function newStage(s: HouseState) {
  const k = s.stage, p = par(k);
  s.rooms = [];
  s.h = [0, 0];
  s.cap = [false, false];
  s.crooked = 0;
  s.happy = 0;
  s.placed = 0;
  s.hang = null;
  s.fall = null;
  s.wait = 40;
  s.cleared = false;
  s.toppled = -1;
  s.junk = [];
  s.deck = makeDeck(s);
  s.di = 0;
  const cm = comboMax(s.deck);
  s.goal = Math.round(2 * p.n + 0.3 * cm);
  s.goal3 = Math.round(3.1 * p.n + 0.55 * cm);
  ev(s, 'stage', 0.5, 0, `${k + 1}번째 집 — 방 ${p.n}개 · 행복 ${s.goal}`);
  if (k >= 1) see(s, 'dining', '새 방 🍽️ 식당 — 부엌 바로 위에 놓으면 만찬!');
  if (k >= 2) see(s, 'attic', '새 방 📦 다락 — 지붕이라 그 칸은 닫혀요');
  if (k >= 3) see(s, 'green', '새 방 🪴 온실 — 다락과 같은 층에 나란히면 옥상 정원!');
  if (k >= 4) see(s, 'wind', '바람이 불어요 🌬️ — 떨어지는 방이 밀려요');
  if (k >= 5) see(s, 'hall', '두 칸짜리 🪩 무도회장 — 두 칸 높이가 같아야 반듯!');
  if (k >= 6) see(s, 'bath', '새 방 🛁 욕실 — 침실 옆이면 아늑!');
}

function spawn(s: HouseState) {
  const t = s.deck[s.di++], p = par(s.stage);
  const wind = p.wind ? p.wind * (0.4 + 0.6 * s.rng()) * (s.rng() < 0.5 ? -1 : 1) : 0;
  s.hang = { t, phase: s.rng() * Math.PI * 2, age: 0, wind };
}

function land(s: HouseState, f: Fall) {
  const L = f.land, t = f.t, wide = t === 'hall', p = par(s.stage);
  const top = world(s, COLX[L.col] + L.e * 0.4, (L.floor + 0.5) * FH);
  if (L.off) {
    s.junk.push({ t, x: L.x, y: GY - L.floor * FH - FH / 2, dir: L.col === 2 ? Math.sign(L.e) || 1 : L.col === 0 ? -1 : 1, born: s.t });
    ev(s, 'off', L.x, GY - L.floor * FH - FH / 2, s.cap[L.col] || (wide && (s.cap[0] || s.cap[1])) ? '지붕에 미끄러졌어요!' : '앗, 떨어졌다!');
    return;
  }
  const below = wide ? roomAt(s.rooms, L.floor - 1, 0) ?? roomAt(s.rooms, L.floor - 1, 1) : roomAt(s.rooms, L.floor - 1, L.col);
  const r: Room = { t, col: L.col, floor: L.floor, e: L.perfect ? 0 : L.e, q: L.perfect ? 0 : L.q, perfect: L.perfect, stairs: L.perfect && !!below, born: s.t, seed: s.rng(), combo: '' };
  s.rooms.push(r);
  s.placed++;
  let gain = 1;
  if (wide) {
    const level = s.h[0] === s.h[1], f2 = hmax(s);
    if (!level) (s.crooked += (s.h[1] > s.h[0] ? 1 : -1) * 1.6), ev(s, 'warn', top.x, top.y, '높이가 달라 삐뚤!', '#ffb36b');
    s.h = [f2 + 1, f2 + 1];
    if (level) (r.combo = 'ball'), (gain += 8), ev(s, 'combo', top.x, top.y, '무도회! +8', '#c58cff');
  } else {
    s.h[L.col]++;
    if (t === 'attic') s.cap[L.col] = true;
  }
  if (L.perfect) {
    s.crooked *= 0.55;
    s.perfT = s.t;
    gain += 3;
    ev(s, 'perfect', top.x, top.y + FH / 2, r.stairs ? '딱! 계단 연결' : '딱!');
    see(s, 'perfect', '딱! 맞으면 행복 +4 · 기운 집도 바로 서요');
    if (r.stairs) see(s, 'stairs', '딱 맞게 쌓으면 계단이 생겨 주민이 오가요');
  } else {
    s.crooked += Math.max(-1.3, Math.min(1.3, L.q)) * CK;
    s.thudT = s.t;
    ev(s, 'thud', top.x, top.y + FH / 2, Math.abs(L.q) > 0.5 ? '쿵… 삐뚤' : '쿵');
    see(s, 'lean', '비뚤게 놓으면 집이 기울어요 — 너무 기울면 와르르!');
  }
  if (!wide) {
    const nb = roomAt(s.rooms, L.floor, 1 - L.col);
    if (t === 'dining' && below?.t === 'kitchen') (r.combo = below.combo = 'feast'), (gain += 6), ev(s, 'combo', top.x, top.y, '만찬! +6', '#ff9a6b');
    if (nb && ((t === 'attic' && nb.t === 'green') || (t === 'green' && nb.t === 'attic'))) (r.combo = nb.combo = 'garden'), (gain += 8), ev(s, 'combo', 0.5, top.y, '옥상 정원! +8', '#7ddf64');
    if (nb && ((t === 'bath' && nb.t === 'bed') || (t === 'bed' && nb.t === 'bath'))) (r.combo = nb.combo = 'cozy'), (gain += 5), ev(s, 'combo', 0.5, top.y, '아늑! +5', '#8fd8ff');
  }
  if (r.combo) s.comboT = s.t;
  s.happy += gain;
  if (s.stage === 0 && s.placed <= 2) ev(s, 'move', top.x, top.y, RD[t].who);
  const ln = Math.abs(lean(s));
  if (ln > p.limit) {
    s.hearts--;
    s.toppled = s.t;
    s.pause = 130;
    ev(s, 'topple', 0.5, GY - hmax(s) * FH * 0.5, s.hearts > 0 ? '와르르! 하트 -1 · 이 집만 다시' : '와르르…');
  } else if (ln > p.limit * 0.7) ev(s, 'warn', top.x, top.y - FH, '끼익… 너무 기울어요!', '#ff8a8a');
}

function complete(s: HouseState) {
  s.cleared = true;
  s.clearT = s.t;
  const st = 1 + (s.happy >= s.goal ? 1 : 0) + (s.happy >= s.goal3 ? 1 : 0);
  s.stars += st;
  s.bank += s.happy;
  s.built++;
  s.village.push({ h0: s.h[0], h1: s.h[1], st });
  see(s, 'roof', '집 완성! 지붕이 올라가요 — 다음 집은 옆 섬에');
  ev(s, 'clear', 0.5, GY - hmax(s) * FH - 0.12, `${s.stage + 1}번째 집 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  if (s.built >= HOUSES) (s.finished = true), ev(s, 'win', 0.5, 0, '마을 완성! 🏘️');
  s.pause = 150;
}

export const dollhouse: GameDef<HouseState> = {
  id: 'dollhouse',
  name: '단면 인형의 집',
  genes: ['stack', 'decorate', 'onebutton'],
  twist: '타이밍 쌓기인데 두 칸짜리 단면 인형의 집이라 탭하는 순간이 "언제"이자 "어느 칸"이다 — 딱 맞추면 계단이 생기고 주민이 이사 와 불이 켜지며, 부엌 위 식당·온실 옆 다락처럼 어울리게 놓으면 방이 변신한다',
  rules: [
    '흔들리는 방이 왼쪽·오른쪽 칸 위에 올 때 탭하면 쿵! 딱 맞으면 계단이 생기고 주민이 이사 와요.',
    '비뚤게 놓거나 한쪽만 높이 쌓으면 집이 기울어요 — 너무 기울면 와르르(하트 -1, 그 집만 다시).',
    '다음 방을 보고 어울리게: 부엌 위 식당·다락 옆 온실은 보너스! 행복으로 별 1~3개.',
  ],
  controls: 'tap',
  hint: '탭 = 방 떨어뜨리기 / 스페이스',
  aspect: A,
  art: {
    concept: '하늘에 뜬 단면 인형의 집',
    mood: '구름 위 작은 정원 섬에 앞면이 열린 인형의 집이 층층이 올라간다. 방마다 벽지·가구·주민이 다르고, 해가 지면 창마다 노란 불이 켜진다.',
    palette: { bg: '#2b2350', ink: '#fff8ee', muted: '#9a8fc0', accent: '#ffd36b', hot: '#ff6b81', soft: '#3d3270' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), t: 0, stage: 0, deck: [], di: 0, hang: null, fall: null, wait: 0, rooms: [], h: [0, 0], cap: [false, false], crooked: 0, happy: 0, goal: 0, goal3: 0, placed: 0,
      hearts: 3, stars: 0, bank: 0, built: 0, village: [], pause: 0, cleared: false, clearT: -1, toppled: -1, finished: false, junk: [], thudT: -99, comboT: -99, perfT: -99, seen: new Set<string>(), events: [], dead: false,
    } as HouseState;
    newStage(s);
    s.wait = 10;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 100);
    s.junk = s.junk.filter((j) => s.t - j.born < 80);
    if (s.pause > 0) {
      if (--s.pause === 0) {
        if (s.finished || s.hearts <= 0) return void (s.dead = true);
        if (s.cleared) s.stage++;
        newStage(s);
      }
      return;
    }
    if (s.fall) {
      const f = s.fall;
      if (++f.k >= f.land.n) (s.fall = null), land(s, f), (s.wait = SETTLE);
      return;
    }
    if (!s.hang) {
      if (s.wait > 0) return void s.wait--;
      if (s.di < s.deck.length && !(s.cap[0] && s.cap[1])) spawn(s);
      else complete(s);
      return;
    }
    const h = s.hang;
    if (inp.tap && h.age >= DESC) {
      const x = hx(s, h), y = hangY(s);
      s.fall = { t: h.t, x0: x, y0: y, k: 0, wind: h.wind, rot: -Math.atan2(x - 0.5, ROPE) * 0.2, land: resolve(s, h.t, x, h.wind) };
      s.hang = null;
      ev(s, 'drop', x, y, s.rng() < 0.5 ? '으아아!' : '꺄아!');
      return;
    }
    h.age++;
    h.phase += par(s.stage).om;
  },
  over: (s) => s.dead,
  score: (s) => s.bank + s.happy + s.stars * 5 + s.built * 5,
  draw(ctx, s, w, h, th: Theme) {
    drawGame(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────

const hex = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
};
const shade = (c: string, f: number) => (f < 0 ? mix(c, '#000000', -f) : mix(c, '#ffffff', f));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 하늘: 위 · 아래 · 해 (아침 → 낮 → 노을 → 밤) */
const SKY: [string, string, string][] = [
  ['#8fd2ff', '#fff0f6', '#fff3c4'],
  ['#62bdf7', '#e2f6ff', '#fff6d0'],
  ['#f59d7a', '#ffe0a8', '#ffcf6b'],
  ['#3d3a8f', '#ff9a85', '#ff8a5c'],
  ['#0f1738', '#2f2c66', '#f4f1d8'],
];
function skyAt(tod: number) {
  const f = clamp01(tod) * (SKY.length - 1), i = Math.min(SKY.length - 2, Math.floor(f)), u = f - i;
  return SKY[i].map((c, j) => mix(c, SKY[i + 1][j], u)) as [string, string, string];
}

function poly(ctx: CanvasRenderingContext2D, pts: number[][], fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
}
function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) (ctx.translate(0, -size / 2), ctx.rotate(rot), ctx.translate(0, size / 2));
  if (flip) ctx.scale(-1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px system-ui, "Noto Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(e, 0, 0);
  ctx.restore();
}

/** 주민 표정·몸짓: 걷기 · 조마조마(매달림) · 비명(떨어짐) · 어질어질(비뚤게 앉음) · 펄쩍(옆집 쿵에 놀람) · 춤(딱·콤보) */
type Mood = 'walk' | 'nervous' | 'scream' | 'dizzy' | 'hop' | 'dance';
interface Look { lit: number; night: number; time: number; seed: number; who: boolean; combo: string; side: boolean; top: boolean; sky: string; up: boolean; down: boolean; mood?: Mood; mt?: number }

/** 방 하나: 앞면이 열린 상자 (왼쪽 위에서 비스듬히 본 단면). x = 왼쪽, yb = 바닥, px 단위 */
function roomBox(ctx: CanvasRenderingContext2D, t: RT, x: number, yb: number, W: number, H: number, o: Look) {
  const D = RD[t], tw = H * 0.085, DX = H * 0.16, DY = H * 0.13;
  const ext = t === 'hall' ? '#efe2ff' : t === 'green' ? '#e9f7ff' : '#fbecd2';
  // 오른쪽 옆면·윗면 (두께)
  if (o.side) poly(ctx, [[x + W, yb - H], [x + W + DX, yb - H - DY], [x + W + DX, yb - DY], [x + W, yb]], shade(ext, -0.3));
  if (o.top) poly(ctx, [[x, yb - H], [x + DX, yb - H - DY], [x + W + DX, yb - H - DY], [x + W, yb - H]], shade(ext, -0.08));
  ctx.fillStyle = ext;
  ctx.fillRect(x, yb - H, W, H);
  const ix = x + tw, iy = yb - H + tw, iw = W - 2 * tw, ih = H - 2 * tw;
  const bx = ix + iw * 0.13, by = iy + ih * 0.08, bw = iw * 0.8, bh = ih * 0.64;
  // 천장 · 왼벽 · 오른벽 · 마루
  poly(ctx, [[ix, iy], [ix + iw, iy], [bx + bw, by], [bx, by]], shade(D.wall, -0.38));
  poly(ctx, [[ix, iy], [bx, by], [bx, by + bh], [ix, iy + ih]], shade(D.wall, -0.16));
  poly(ctx, [[ix + iw, iy], [bx + bw, by], [bx + bw, by + bh], [ix + iw, iy + ih]], shade(D.wall, -0.3));
  poly(ctx, [[ix, iy + ih], [bx, by + bh], [bx + bw, by + bh], [ix + iw, iy + ih]], D.floor);
  ctx.strokeStyle = shade(D.floor, -0.25);
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) (ctx.beginPath(), ctx.moveTo(bx + (bw * i) / 6, by + bh), ctx.lineTo(ix + (iw * i) / 6, iy + ih), ctx.stroke());
  // 뒷벽 + 무늬
  ctx.fillStyle = D.wall;
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = shade(D.wall, D.pat === 2 ? -0.12 : 0.25);
  if (D.pat === 0) for (let i = 0; i < 8; i += 2) ctx.fillRect(bx + (bw * i) / 8, by, bw / 16, bh);
  if (D.pat === 1) for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.arc(bx + bw * (0.08 + i * 0.17 + (j % 2) * 0.08), by + bh * (0.15 + j * 0.25), Math.max(1, H * 0.018), 0, 7), ctx.fill());
  if (D.pat === 2) ctx.fillRect(bx, by + bh * 0.68, bw, bh * 0.32);
  if (D.pat === 3) for (let j = 1; j < 5; j++) ctx.fillRect(bx, by + (bh * j) / 5, bw, 1);
  // 창문: 밖 하늘 (밤엔 별빛)
  const wx = bx + bw * 0.6, wy = by + bh * 0.14, ww = bw * (t === 'hall' ? 0.14 : 0.26), wh = bh * 0.4;
  ctx.fillStyle = o.sky;
  ctx.fillRect(wx, wy, ww, wh);
  ctx.strokeStyle = '#fffaf0';
  ctx.lineWidth = Math.max(1.2, H * 0.025);
  ctx.strokeRect(wx, wy, ww, wh);
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();
  // 액자
  ctx.fillStyle = '#8a5a3a';
  ctx.fillRect(bx + bw * 0.12, by + bh * 0.2, bw * 0.16, bh * 0.24);
  ctx.fillStyle = ['#ffb3c1', '#9ad0ff', '#ffe08a', '#b6f2a6'][Math.floor(o.seed * 4)];
  ctx.fillRect(bx + bw * 0.135, by + bh * 0.23, bw * 0.13, bh * 0.18);
  // 계단 (아래층과 이어짐 — 이 방에서 천장으로 올라간다)
  if (o.up) {
    const sx = ix + iw * 0.6, sw = iw * 0.36, n = 5;
    for (let i = 0; i < n; i++) {
      const stx = sx + (sw * i) / n, sty = iy + ih - (ih * (i + 1)) / n;
      ctx.fillStyle = '#9b6a42';
      ctx.fillRect(stx, sty, sw / n + 1, iy + ih - sty);
      ctx.fillStyle = '#c99466';
      ctx.fillRect(stx, sty, sw / n + 1, Math.max(1.5, H * 0.03));
    }
    ctx.strokeStyle = '#6b4329';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sx, iy + ih - ih * 0.45);
    ctx.lineTo(sx + sw, iy - ih * 0.05);
    ctx.stroke();
  }
  if (o.down) {
    ctx.fillStyle = 'rgba(40,20,10,.55)';
    ctx.fillRect(ix + iw * 0.6, iy + ih - H * 0.05, iw * 0.36, H * 0.05);
  }
  // 콤보 장식
  if (o.combo === 'feast') {
    for (let i = 0; i < 7; i++) poly(ctx, [[bx + (bw * i) / 7, by + 1], [bx + (bw * (i + 1)) / 7, by + 1], [bx + (bw * (i + 0.5)) / 7, by + bh * 0.16]], ['#ff6b6b', '#ffd36b', '#6bc5ff'][i % 3]);
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(bx + bw * 0.05, by + bh * 0.82, bw * 0.55, H * 0.05);
    emoji(ctx, '🍗', bx + bw * 0.2, by + bh * 0.84, H * 0.2);
    emoji(ctx, '🍰', bx + bw * 0.45, by + bh * 0.84, H * 0.2);
  }
  if (o.combo === 'ball') {
    for (let i = 0; i < 7; i++) {
      const a = o.time / 30 + i * 0.9;
      ctx.fillStyle = `hsla(${(i * 50 + o.time * 3) % 360},90%,70%,.55)`;
      ctx.beginPath();
      ctx.arc(bx + bw * (0.5 + 0.42 * Math.cos(a)), by + bh * (0.5 + 0.4 * Math.sin(a * 1.3)), H * 0.05, 0, 7);
      ctx.fill();
    }
  }
  // 가구
  if (t !== 'hall' || o.combo !== 'ball') emoji(ctx, D.e, t === 'hall' ? bx + bw * 0.5 : bx + bw * 0.32, t === 'hall' ? by + bh * 0.45 : by + bh + H * 0.05, H * (t === 'hall' ? 0.28 : 0.36));
  else emoji(ctx, D.e, bx + bw * 0.5, by + bh * 0.42 + Math.sin(o.time / 20) * 2, H * 0.28);
  // 냄비 김 · 욕조 거품
  if ((t === 'kitchen' || t === 'bath' || o.combo === 'cozy') && o.who) {
    for (let k = 0; k < 4; k++) {
      const p = ((o.time + k * 22) % 88) / 88, px = bx + bw * 0.32 + Math.sin(p * 6 + k) * H * 0.06, py = by + bh - H * 0.28 - p * H * 0.5;
      ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(px, py, H * (0.03 + 0.04 * p), 0, 7);
      ctx.fill();
    }
  }
  // 주민
  if (o.who) {
    const m = o.mood ?? 'walk', mt = o.mt ?? 0, sp = o.time / 80 + o.seed * 6, sz = H * 0.34, gy = iy + ih + H * 0.01;
    let wx2 = ix + iw * (0.5 + 0.3 * Math.sin(sp)), y2 = gy - Math.abs(Math.sin(o.time / 7 + o.seed * 9)) * H * 0.03, flip = Math.cos(sp) < 0, rot = 0, who = D.who;
    if (m === 'nervous') (wx2 = ix + iw * 0.42 + Math.sin(o.time * 1.7) * 1.5), (flip = false);
    if (m === 'scream') (wx2 = ix + iw * 0.45), (y2 = gy - H * 0.12 - Math.abs(Math.sin(o.time / 2)) * H * 0.06), (who = '😱');
    if (m === 'dizzy') (rot = Math.sin(o.time / 4) * 0.35), (wx2 = ix + iw * (0.45 + 0.05 * Math.sin(o.time / 6)));
    if (m === 'hop') y2 = gy - Math.sin(Math.min(1, mt) * Math.PI) * H * 0.3;
    if (m === 'dance') (y2 = gy - Math.abs(Math.sin(o.time / 4)) * H * 0.14), (flip = Math.floor(o.time / 8) % 2 === 0), (rot = Math.sin(o.time / 4) * 0.25);
    emoji(ctx, who, wx2, y2, sz, flip, rot);
    if (t === 'hall') emoji(ctx, '🕺', ix + iw * (0.5 - 0.3 * Math.sin(sp * 1.2)), m === 'dance' ? y2 : gy, sz, !flip, -rot);
    // 머리 위 말풍선 기호
    const hy2 = y2 - sz * 1.05;
    if (m === 'nervous') emoji(ctx, '💦', wx2 + sz * 0.45, hy2 + sz * 0.45 + Math.sin(o.time / 5) * 2, sz * 0.5);
    if (m === 'hop') emoji(ctx, '❗', wx2, hy2, sz * 0.6);
    if (m === 'dizzy') for (let k = 0; k < 3; k++) emoji(ctx, '⭐', wx2 + Math.cos(o.time / 6 + k * 2.1) * sz * 0.45, hy2 + sz * 0.35 + Math.sin(o.time / 6 + k * 2.1) * sz * 0.12, sz * 0.32);
    if (m === 'dance') emoji(ctx, k3(o.time) ? '🎵' : '🎶', wx2 + sz * 0.5, hy2 + sz * 0.2 - ((o.time % 30) / 30) * sz * 0.4, sz * 0.45);
  }
  // 불빛: 주민이 오면 전등이 켜진다. 밤에 불 꺼진 방은 어둡다
  const lx = bx + bw * 0.5, ly = iy + H * 0.12;
  ctx.strokeStyle = 'rgba(60,40,30,.7)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx, iy);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  if (o.lit > 0) {
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, W * 0.7);
    g.addColorStop(0, `rgba(255,214,140,${0.45 * o.lit * (0.5 + o.night)})`);
    g.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.shadowColor = '#ffd27a';
    ctx.shadowBlur = 10 * o.lit;
  }
  ctx.fillStyle = o.lit > 0 ? '#fff1b8' : '#8a8070';
  ctx.beginPath();
  ctx.arc(lx, ly, Math.max(1.5, H * 0.035), 0, 7);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (o.night > 0 && o.lit < 1) {
    ctx.fillStyle = `rgba(12,10,40,${0.55 * o.night * (1 - o.lit)})`;
    ctx.fillRect(ix, iy, iw, ih);
  }
  // 정원 덩굴
  if (o.combo === 'garden') {
    ctx.strokeStyle = '#3f9b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 12; i++) {
      const px = x + (W * i) / 12, py = yb - H + Math.sin(i * 1.7 + o.seed * 5) * H * 0.05 + 2;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#5cc46a' : '#8be07a';
      ctx.beginPath();
      ctx.ellipse(x + W * (0.08 + i * 0.17), yb - H + 3 + (i % 2) * 3, H * 0.05, H * 0.028, i, 0, 7);
      ctx.fill();
    }
    emoji(ctx, '🌸', x + W * 0.1, yb - H + H * 0.14, H * 0.16);
    emoji(ctx, '🌼', x + W * 0.9, yb - H + H * 0.14, H * 0.16);
  }
  // 겉벽 테두리
  ctx.strokeStyle = 'rgba(90,60,40,.55)';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x + 0.5, yb - H + 0.5, W - 1, H - 1);
}

const k3 = (t: number) => Math.floor(t / 15) % 2 === 0;

/** 박공지붕 (다락 · 집 완성 때) */
function roof(ctx: CanvasRenderingContext2D, x: number, yb: number, W: number, H: number, time: number, chimney: boolean, garden: boolean) {
  const DX = H * 0.16, DY = H * 0.13, rh = H * 0.62, ov = W * 0.06;
  poly(ctx, [[x + W / 2, yb - rh], [x + W + ov, yb + 2], [x + W + ov + DX, yb + 2 - DY], [x + W / 2 + DX, yb - rh - DY]], '#9c3d2c');
  poly(ctx, [[x - ov, yb + 2], [x + W / 2, yb - rh], [x + W + ov, yb + 2]], '#d65a3f');
  poly(ctx, [[x + W * 0.08, yb], [x + W / 2, yb - rh * 0.82], [x + W * 0.92, yb]], '#f0d2a8');
  ctx.strokeStyle = 'rgba(120,40,25,.6)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    const f = i / 4;
    ctx.beginPath();
    ctx.moveTo(x - ov + (W / 2 + ov) * f, yb + 2 - (rh + 2) * f);
    ctx.lineTo(x + W + ov - (W / 2 + ov) * f, yb + 2 - (rh + 2) * f);
    ctx.stroke();
  }
  // 둥근 창
  ctx.fillStyle = '#ffe6a0';
  ctx.beginPath();
  ctx.arc(x + W / 2, yb - rh * 0.38, H * 0.1, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (chimney) {
    ctx.fillStyle = '#8a5a4a';
    ctx.fillRect(x + W * 0.72, yb - rh * 0.85, W * 0.1, rh * 0.5);
    for (let k = 0; k < 3; k++) {
      const p = ((time + k * 30) % 90) / 90;
      ctx.fillStyle = `rgba(240,240,250,${0.6 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(x + W * 0.77 + p * H * 0.3, yb - rh * 0.9 - p * H * 0.6, H * (0.05 + 0.06 * p), 0, 7);
      ctx.fill();
    }
  }
  if (garden) {
    emoji(ctx, '🌷', x + W * 0.25, yb - rh * 0.4, H * 0.22);
    emoji(ctx, '🦋', x + W * 0.5 + Math.sin(time / 15) * W * 0.3, yb - rh - H * 0.15 + Math.cos(time / 11) * H * 0.1, H * 0.18);
  }
}

function drawGame(ctx: CanvasRenderingContext2D, s: HouseState, w: number, h: number, th: Theme) {
  const fx = juice(s), k = s.stage, tod = HOUSES > 1 ? Math.min(1, (k + Math.min(1, s.placed / Math.max(1, s.deck.length)) * 0.6) / (HOUSES - 1)) : 0;
  const [skyTop, skyBot, sunC] = skyAt(tod), night = clamp01((tod - 0.6) / 0.3);
  ctx.save();
  fx.begin(ctx);
  // ── 하늘
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, skyTop);
  bg.addColorStop(1, skyBot);
  ctx.fillStyle = bg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  if (night > 0) for (let i = 0; i < 50; i++) {
    ctx.fillStyle = `rgba(255,255,240,${night * (0.3 + 0.5 * Math.abs(Math.sin(s.t / 40 + i)))})`;
    ctx.fillRect((((i * 7919) % 997) / 997) * w, (((i * 104729) % 991) / 991) * h * 0.7, 1.6, 1.6);
  }
  {
    const sx = w * (0.82 - 0.6 * tod), sy = h * (0.2 + 0.25 * Math.sin(tod * Math.PI * 0.9)), sr = w * 0.06;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 4);
    g.addColorStop(0, sunC + 'aa');
    g.addColorStop(1, sunC + '00');
    ctx.fillStyle = g;
    ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
    ctx.fillStyle = sunC;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, 7);
    ctx.fill();
    if (night > 0.5) for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12]]) (ctx.fillStyle = 'rgba(160,150,120,.35)'), ctx.beginPath(), ctx.arc(sx + cx * sr, sy + cy * sr, cr * sr, 0, 7), ctx.fill();
  }
  // 구름
  for (let i = 0; i < 5; i++) {
    const cx = ((((i * 0.23 + s.t * 0.00012 * (1 + i * 0.3)) % 1.3) + 1.3) % 1.3 - 0.15) * w, cy = h * (0.18 + 0.13 * i), cr = w * (0.04 + 0.012 * (i % 3));
    ctx.fillStyle = `rgba(255,255,255,${0.55 - 0.35 * night})`;
    for (const [dx, dy, f] of [[0, 0, 1], [1.1, 0.2, 0.8], [-1, 0.25, 0.75], [0.4, -0.45, 0.8]]) (ctx.beginPath(), ctx.arc(cx + dx * cr, cy + dy * cr, cr * f, 0, 7), ctx.fill());
  }
  // 지어 둔 집들 (먼 섬 마을)
  const SLOTS = [[0.1, 0.62], [0.9, 0.58], [0.2, 0.44], [0.8, 0.4], [0.07, 0.3], [0.93, 0.27], [0.3, 0.24], [0.7, 0.22]];
  s.village.forEach((v, i) => {
    const [vx, vy] = SLOTS[i % SLOTS.length], X0 = vx * w, Y0 = vy * h, u = w * 0.022;
    ctx.fillStyle = mix('#7fbf6a', '#2c3f5a', night * 0.7);
    ctx.beginPath();
    ctx.ellipse(X0, Y0, u * 2.6, u * 0.7, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = mix('#8a6440', '#2a2238', night * 0.6);
    ctx.beginPath();
    ctx.moveTo(X0 - u * 2.6, Y0);
    ctx.lineTo(X0, Y0 + u * 2);
    ctx.lineTo(X0 + u * 2.6, Y0);
    ctx.fill();
    for (const [c, n] of [[-1, v.h0], [0, v.h1]])
      for (let f = 0; f < n; f++) {
        ctx.fillStyle = mix('#fbecd2', '#3a3550', night * 0.5);
        ctx.fillRect(X0 + c * u * 1.1, Y0 - (f + 1) * u * 0.9, u * 1.1, u * 0.9);
        ctx.fillStyle = night > 0.3 ? '#ffd56b' : '#9ad0ff';
        ctx.fillRect(X0 + c * u * 1.1 + u * 0.35, Y0 - (f + 1) * u * 0.9 + u * 0.25, u * 0.4, u * 0.35);
      }
    for (const [c, n] of [[-1, v.h0], [0, v.h1]]) poly(ctx, [[X0 + c * u * 1.1 - 1, Y0 - n * u * 0.9], [X0 + c * u * 1.1 + u * 0.55, Y0 - n * u * 0.9 - u * 0.6], [X0 + c * u * 1.1 + u * 1.1 + 1, Y0 - n * u * 0.9]], '#d65a3f');
    ctx.fillStyle = '#ffd36b';
    ctx.font = `700 ${u * 0.9}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('★'.repeat(v.st), X0, Y0 - Math.max(v.h0, v.h1) * u * 0.9 - u * 0.7);
  });

  // ── 세상 좌표 (집이 높아지면 살짝 줌아웃)
  const hmT = hmax(s), hm = (fx.memo.hm = fx.memo.hm === undefined ? hmT : fx.memo.hm + (hmT - fx.memo.hm) * 0.06);
  const wTop = GY - hm * FH - CLEAR - FH - ROPE - 0.07, wBot = GY + 0.27, need = wBot - wTop, avail = A - 0.15 - 0.01;
  const z = Math.min(1, avail / need), sTop = 0.15 + Math.max(0, avail - need * z);
  const scr = (x: number, y: number) => ({ x: w / 2 + (x * w - w / 2) * z, y: sTop * w + (y - wTop) * w * z });
  ctx.translate(w / 2, sTop * w);
  ctx.scale(z, z);
  ctx.translate(-w / 2, -wTop * w);
  const X = (x: number) => x * w, Y = (y: number) => y * w;
  const wind = s.hang?.wind ?? s.fall?.wind ?? 0;

  // ── 떠 있는 정원 섬: 풀밭 윗면 + 흙층 옆면
  const IX = X(0.5), IY = Y(GY + 0.012), IRX = X(0.47), IRY = Y(0.085);
  ctx.fillStyle = 'rgba(30,20,60,.18)';
  ctx.beginPath();
  ctx.ellipse(IX, Y(GY + 0.33), IRX * 0.5, IRY * 0.4, 0, 0, 7);
  ctx.fill();
  const soil = ctx.createLinearGradient(0, IY, 0, Y(GY + 0.3));
  soil.addColorStop(0, '#9a6b43');
  soil.addColorStop(0.45, '#7a5236');
  soil.addColorStop(1, '#4e3a4a');
  ctx.fillStyle = soil;
  ctx.beginPath();
  ctx.moveTo(IX - IRX, IY);
  ctx.bezierCurveTo(IX - IRX, IY + IRY * 1.6, IX - IRX * 0.6, Y(GY + 0.2), IX - IRX * 0.25, Y(GY + 0.26));
  ctx.lineTo(IX, Y(GY + 0.3));
  ctx.lineTo(IX + IRX * 0.3, Y(GY + 0.25));
  ctx.bezierCurveTo(IX + IRX * 0.7, Y(GY + 0.19), IX + IRX, IY + IRY * 1.6, IX + IRX, IY);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,35,20,.35)';
  ctx.lineWidth = 2;
  for (const f of [0.045, 0.09, 0.14]) {
    ctx.beginPath();
    ctx.ellipse(IX, IY + Y(f) * 0.7, IRX * (1 - f * 2.4), IRY * (1 - f * 2), 0, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }
  for (let i = 0; i < 9; i++) {
    ctx.fillStyle = i % 2 ? '#b08c6a' : '#6a5a6a';
    ctx.beginPath();
    ctx.ellipse(IX + IRX * (((i * 0.37) % 1) * 1.4 - 0.7), IY + IRY * 1.1 + Y(((i * 0.53) % 1) * 0.1), 3 + (i % 3), 2 + (i % 2), 0, 0, 7);
    ctx.fill();
  }
  // 풀밭
  const grass = ctx.createLinearGradient(0, IY - IRY, 0, IY + IRY);
  grass.addColorStop(0, mix('#a6e07a', '#3d5a52', night * 0.6));
  grass.addColorStop(1, mix('#5fb04f', '#2a4a40', night * 0.6));
  ctx.fillStyle = mix('#4b9a3f', '#22392f', night * 0.6);
  ctx.beginPath();
  ctx.ellipse(IX, IY + 5, IRX, IRY, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.ellipse(IX, IY, IRX, IRY, 0, 0, 7);
  ctx.fill();
  // 오솔길 · 울타리 · 나무 · 꽃 · 우체통
  ctx.fillStyle = mix('#e8d2a8', '#5a5060', night * 0.5);
  for (let i = 0; i < 4; i++) (ctx.beginPath(), ctx.ellipse(IX + X(0.01 * i), IY + IRY * (0.15 + i * 0.22), X(0.028), Y(0.011), 0, 0, 7), ctx.fill());
  ctx.strokeStyle = mix('#fff4e0', '#8a8090', night * 0.5);
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + 0.25 + i * 0.13, px = IX + Math.cos(a) * IRX * 0.92, py = IY + Math.sin(a) * IRY * 0.92;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - Y(0.03));
    ctx.stroke();
  }
  {
    const tx = IX - IRX * 0.78, ty = IY - IRY * 0.1, sw = Math.sin(s.t / 50) * 2;
    ctx.fillStyle = '#7a5236';
    ctx.fillRect(tx - 3, ty - Y(0.08), 6, Y(0.08));
    for (const [dx, dy, r, c] of [[0, -0.12, 0.05, '#4c9a46'], [-0.025, -0.095, 0.035, '#5cb253'], [0.025, -0.1, 0.035, '#6cc45f'], [0, -0.15, 0.03, '#7bd06a']] as [number, number, number, string][]) {
      ctx.fillStyle = mix(c, '#1f3a34', night * 0.6);
      ctx.beginPath();
      ctx.arc(tx + X(dx) + sw, ty + Y(dy), X(r), 0, 7);
      ctx.fill();
    }
  }
  emoji(ctx, '🌷', IX + IRX * 0.62, IY + IRY * 0.4, Y(0.04));
  emoji(ctx, '🌼', IX - IRX * 0.45, IY + IRY * 0.6, Y(0.035));
  emoji(ctx, '🌻', IX + IRX * 0.8, IY + IRY * 0.05, Y(0.045));
  emoji(ctx, '📮', IX + IRX * 0.28, IY + IRY * 0.75, Y(0.04));
  emoji(ctx, s.stage % 2 ? '🐕' : '🐇', IX - IRX * 0.25 + Math.sin(s.t / 90) * X(0.06), IY + IRY * 0.82, Y(0.035), Math.cos(s.t / 90) < 0);
  // 떨어진 방 잔해
  for (const j of s.junk) {
    const a = (s.t - j.born) / 60;
    ctx.save();
    ctx.translate(X(j.x + j.dir * a * 0.25), Y(j.y + a * a * 0.6));
    ctx.rotate(j.dir * a * 3);
    ctx.globalAlpha = clamp01(1.3 - a);
    roomBox(ctx, j.t, -X(RW / 2), Y(FH / 2), X(RW), Y(FH), { lit: 0, night, time: s.t, seed: 0.3, who: false, combo: '', side: false, top: false, sky: skyBot, up: false, down: false });
    ctx.restore();
    // 주민은 우산을 펴고 둥실둥실 (떨어진 방에서 탈출)
    const ux = X(j.x - j.dir * 0.04 + Math.sin(a * 6) * 0.03), uy = Y(j.y - 0.06 + a * 0.22), us = Y(FH * 0.34);
    emoji(ctx, '☂️', ux, uy - us * 0.85, us * 1.1, false, Math.sin(a * 6) * 0.25);
    emoji(ctx, RD[j.t].who, ux, uy, us, j.dir < 0);
  }
  ctx.globalAlpha = 1;

  // ── 집 (기운 만큼 돌려서). 무너질 땐 방이 흩어진다
  const ln = lean(s), lim = par(k).limit, tA = s.toppled >= 0 ? (s.t - s.toppled) / 45 : 0;
  const rot = theta(s) + (tA > 0 ? Math.sign(ln || 1) * Math.min(1.4, tA * tA * 0.5) : 0) + (Math.abs(ln) > lim * 0.7 && tA === 0 ? Math.sin(s.t / 3) * 0.004 : 0);
  // 그림자
  ctx.fillStyle = `rgba(20,30,10,${0.28 * clamp01(1 - tA)})`;
  ctx.beginPath();
  ctx.ellipse(IX + X(0.05 + theta(s) * 0.6), Y(GY - 0.012), X(RW + 0.06 + hm * 0.012), Y(0.03), 0, 0, 7);
  ctx.fill();
  // 밤: 불 켜진 방들의 빛이 집 둘레로 번진다
  if (night > 0 && s.rooms.length) {
    const gy2 = Y(GY - hm * FH * 0.5), gr = X(0.35 + hm * 0.05), g = ctx.createRadialGradient(X(0.5), gy2, 0, X(0.5), gy2, gr);
    g.addColorStop(0, `rgba(255,190,100,${0.4 * night})`);
    g.addColorStop(1, 'rgba(255,190,100,0)');
    ctx.fillStyle = g;
    ctx.fillRect(X(0.5) - gr, gy2 - gr, gr * 2, gr * 2);
  }
  // 주춧돌 (땅에 붙어 있어서 집이 기울어도 그대로)
  poly(ctx, [[X(0.5 + RW + 0.012), Y(GY) - 2], [X(0.5 + RW + 0.012) + Y(0.02), Y(GY) - 2 - Y(0.016)], [X(0.5 + RW + 0.012) + Y(0.02), Y(GY + 0.012) - Y(0.016)], [X(0.5 + RW + 0.012), Y(GY + 0.012)]], '#8f8a9a');
  ctx.fillStyle = '#b8b2c4';
  ctx.fillRect(X(0.5 - RW - 0.012), Y(GY) - 2, X(2 * RW + 0.024), Y(0.014));
  ctx.save();
  ctx.translate(X(0.5), Y(GY));
  ctx.rotate(rot);
  // 빈 칸 안내 (점선) + 매달린 방의 그림자
  const hg = s.hang, ready = hg && hg.age >= DESC && s.pause === 0;
  if (hg && !s.cleared) {
    const L = resolve(s, hg.t, hx(s, hg), 0);
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    const slots = hg.t === 'hall' ? [2] : [0, 1];
    for (const c of slots) {
      if (c < 2 ? s.cap[c] : s.cap[0] || s.cap[1]) continue;
      const f = c === 2 ? hmT : s.h[c], sx = X(COLX[c] - (c === 2 ? RW : HALF)), sy = -Y(f * FH), good = ready && L.col === c && L.perfect;
      ctx.strokeStyle = good ? 'rgba(120,255,140,.95)' : `rgba(255,255,255,${0.35 + 0.2 * Math.sin(s.t / 8)})`;
      if (good) (ctx.shadowColor = '#7dff8a'), (ctx.shadowBlur = 12);
      ctx.strokeRect(sx + 2, sy - Y(FH) + 2, X(c === 2 ? 2 * RW : RW) - 4, Y(FH) - 4);
      ctx.shadowBlur = 0;
    }
    ctx.setLineDash([]);
    if (ready && !L.off) {
      const l = COLX[L.col] + L.e;
      ctx.fillStyle = L.perfect ? 'rgba(60,200,90,.45)' : 'rgba(30,20,40,.3)';
      ctx.beginPath();
      ctx.ellipse(X(l), -Y(L.floor * FH) - 3, X((L.col === 2 ? RW : HALF) * 0.85), Y(0.012), 0, 0, 7);
      ctx.fill();
    }
  }
  // 방들: 아래층부터
  const sorted = [...s.rooms].sort((a, b) => a.floor - b.floor || a.col - b.col);
  for (const r of sorted) {
    const wide = r.col === 2, W = X(wide ? 2 * RW : RW), Hh = Y(FH), age = s.t - r.born;
    const slide = r.perfect ? 0 : r.e * (0.35 + 0.65 * clamp01(1 - age / 10));
    let ox = X(COLX[r.col] + Math.max(-0.045, Math.min(0.045, slide))), oy = -Y(r.floor * FH), rr = r.perfect ? 0 : Math.max(-0.1, Math.min(0.1, r.q * 0.07));
    if (tA > 0) (ox += Math.sign(ln || 1) * X(tA * tA * 0.05 * (r.floor + 1))), (oy += Y(tA * tA * 0.04 * (r.floor + 0.5))), (rr += Math.sign(ln || 1) * tA * 0.3 * (1 + r.seed));
    const drop = age < 8 ? -Y(0.02) * (1 - age / 8) : 0, squash = age < 10 ? 1 - 0.08 * Math.sin((age / 10) * Math.PI) : 1;
    const above = s.rooms.find((o) => o.floor === r.floor + 1 && (o.col === r.col || o.col === 2 || wide));
    const right = wide || r.col === 1 || !roomAt(s.rooms, r.floor, 1);
    ctx.save();
    ctx.translate(ox, oy + drop);
    ctx.rotate(rr);
    ctx.scale(1, squash);
    // 웃음: 새로 비뚤게 앉은 방 주민은 어질어질, 다른 주민들은 쿵 소리에 펄쩍, 딱·콤보엔 다 같이 춤
    const mood: Mood = s.t - s.comboT < 110 ? 'dance' : !r.perfect && age < 75 ? 'dizzy' : s.t - s.thudT < 22 ? 'hop' : r.perfect && age < 55 ? 'dance' : 'walk';
    roomBox(ctx, r.t, -W / 2, 0, W, Hh, {
      lit: clamp01((age - 6) / 18), night, time: s.t, seed: r.seed, who: age > 6 && tA === 0, combo: r.combo, side: right, top: !above && !(r.t === 'attic'), sky: night > 0.5 ? '#2a3170' : skyTop,
      up: !!above?.stairs, down: r.stairs, mood, mt: (s.t - s.thudT) / 22,
    });
    if (r.t === 'attic') roof(ctx, -W / 2, -Hh, W, Hh, s.t, false, r.combo === 'garden');
    ctx.restore();
  }
  // 계단 오르내리는 주민
  for (const r of s.rooms) {
    if (!r.stairs || tA > 0) continue;
    const ph = (s.t + r.seed * 400) % 300;
    if (ph > 80) continue;
    const p = ph < 40 ? ph / 40 : (80 - ph) / 40, W = X(r.col === 2 ? 2 * RW : RW), cx = X(COLX[r.col === 2 ? 0 : r.col]);
    emoji(ctx, RD[r.t].who, cx - W * 0.5 + W * (0.62 + 0.3 * p), -Y((r.floor - 1) * FH) - Y(FH * 0.08) - Y(FH * 0.85) * p, Y(FH * 0.3), ph >= 40);
  }
  // 집 완성: 지붕이 내려앉는다
  if (s.cleared) {
    const a = clamp01((s.t - s.clearT) / 22);
    for (const c of s.h[0] === s.h[1] && s.rooms.some((r) => r.col === 2 && r.floor === s.h[0] - 1) ? [2] : [0, 1]) {
      if (c < 2 && (s.cap[c] || s.h[c] === 0)) continue;
      const W = X(c === 2 ? 2 * RW : RW), f = c === 2 ? s.h[0] : s.h[c];
      roof(ctx, X(COLX[c]) - W / 2, -Y(f * FH) - Y(0.4) * (1 - a) * (1 - a), W, Y(FH), s.t, true, false);
    }
  }
  ctx.restore();
  // 무너지면 주민들이 튀어나와 풀밭을 데굴데굴 굴러간다
  if (tA > 0)
    for (const r of s.rooms) {
      const st = world(s, COLX[r.col] * 0.8, (r.floor + 0.3) * FH), dir = (r.seed < 0.5 ? -1 : 1) * (0.6 + r.seed), fall = Math.min(1, tA * 1.3);
      const ex = X(Math.max(0.06, Math.min(0.94, st.x + dir * tA * (0.14 + 0.06 * r.floor)))), ey = Y(st.y + (GY + 0.03 * r.seed - st.y) * fall * fall) - Y(0.05) * Math.sin(fall * Math.PI);
      emoji(ctx, RD[r.t].who, ex, ey, Y(FH * 0.36), dir < 0, dir * tA * 9);
      if (fall >= 1) emoji(ctx, '💫', ex, ey - Y(FH * 0.34), Y(FH * 0.24));
    }

  // ── 크레인 + 매달린 방
  const hy = hangY(s), py = hy - ROPE;
  {
    const by = Y(py - 0.035), bh = Y(0.026);
    poly(ctx, [[X(-0.2), by], [X(-0.2) + 8, by - 6], [X(0.6) + 8, by - 6], [X(0.6), by]], '#d9a400');
    ctx.fillStyle = '#ffc928';
    ctx.fillRect(X(-0.2), by, X(0.8), bh);
    ctx.fillStyle = '#3a3040';
    for (let i = 0; i < 14; i++) poly(ctx, [[X(-0.2 + i * 0.06), by + bh], [X(-0.2 + i * 0.06) + bh * 0.8, by], [X(-0.2 + i * 0.06) + bh * 1.4, by], [X(-0.2 + i * 0.06) + bh * 0.6, by + bh]], '#3a3040');
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath();
    ctx.arc(X(0.5), Y(py), Y(0.016), 0, 7);
    ctx.fill();
    ctx.fillStyle = '#c0c0d0';
    ctx.beginPath();
    ctx.arc(X(0.5), Y(py), Y(0.007), 0, 7);
    ctx.fill();
    // 바람 깃발 · 바람 줄
    if (wind) {
      const dir = Math.sign(wind), str = Math.abs(wind) / 0.0026;
      ctx.strokeStyle = '#5a4a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(0.58), by);
      ctx.lineTo(X(0.58), by - Y(0.07));
      ctx.stroke();
      poly(ctx, [[X(0.58), by - Y(0.07)], [X(0.58) + dir * Y(0.06) * (0.6 + str), by - Y(0.06) + Math.sin(s.t / 4) * 2], [X(0.58), by - Y(0.045)]], '#ff6b81');
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 7; i++) {
        const lx = ((((i * 0.31 + dir * s.t * 0.012 * (1 + str)) % 1.4) + 1.4) % 1.4 - 0.2) * w, ly = Y(py + 0.05 + (i % 4) * 0.08);
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - dir * X(0.06), ly);
        ctx.stroke();
      }
    }
  }
  // 매달린 방엔 이사 올 주민이 타고 있다 — 흔들릴 땐 조마조마, 떨어질 땐 비명
  const drawHanging = (t: RT, x: number, y: number, r0: number, mood: Mood) => {
    ctx.save();
    ctx.translate(X(x), Y(y + FH / 2));
    ctx.rotate(r0);
    const W = X(t === 'hall' ? 2 * RW : RW);
    roomBox(ctx, t, -W / 2, 0, W, Y(FH), { lit: 0, night, time: s.t, seed: 0.6, who: true, combo: '', side: true, top: true, sky: night > 0.5 ? '#2a3170' : skyTop, up: false, down: false, mood });
    ctx.restore();
  };
  if (s.hang) {
    const x = hx(s, s.hang), p = clamp01(s.hang.age / DESC), y = hy - (1 - p) * (1 - p) * 0.45, r0 = -Math.atan2(x - 0.5, ROPE) * 0.2;
    ctx.strokeStyle = '#4a3a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(0.5), Y(py));
    ctx.lineTo(X(x), Y(y - FH / 2) - 4);
    ctx.stroke();
    ctx.fillStyle = '#6a6a7a';
    ctx.beginPath();
    ctx.arc(X(x), Y(y - FH / 2) - 4, 4, 0, 7);
    ctx.fill();
    drawHanging(s.hang.t, x, y, r0, 'nervous');
  }
  if (s.fall) {
    const f = s.fall, x = f.x0 + f.wind * f.k, y = f.y0 + (G * f.k * (f.k + 1)) / 2;
    drawHanging(f.t, x, y, f.rot * (1 - f.k / f.land.n), 'scream');
  }

  // ── 사건 → 연출 (화면 좌표로 바꿔서)
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const p = scr(e.x, e.y);
    if (e.kind === 'perfect') fx.burst(p.x, p.y, '#ffe9a8', 26, 4, 3), fx.burst(p.x, p.y, '#ffffff', 12, 2.5, 2), fx.ring(p.x, p.y, '#ffd36b', w * 0.22 * z, 5), fx.kick(4), fx.pop(p.x, p.y - 40 * z, e.text!, '#ffe066', 22);
    if (e.kind === 'drop') fx.pop(p.x + 34 * z, p.y - 30 * z, e.text!, '#ffffff', 15);
    if (e.kind === 'thud') fx.burst(p.x, p.y, '#c8a27a', 22, 3.5, 3.5), fx.kick(9), fx.pop(p.x, p.y - 22, e.text!, '#ffd0b0', 18);
    if (e.kind === 'move') fx.pop(p.x, p.y + 30 * z, `${e.text} 이사 왔어요!`, '#ffffff', 13);
    if (e.kind === 'combo') fx.burst(p.x, p.y, e.col!, 50, 6, 3.5), fx.ring(p.x, p.y, e.col!, w * 0.4, 7), fx.blink(e.col!, 0.22), fx.kick(7), fx.pop(p.x, p.y - 48, e.text!, e.col!, 24);
    if (e.kind === 'warn') fx.pop(p.x, p.y - 30, e.text!, e.col!, 16), fx.kick(5);
    if (e.kind === 'off') fx.burst(p.x, p.y, '#c8a27a', 30, 4, 3), fx.kick(8), fx.pop(p.x, p.y - 30, e.text!, '#ff9a9a', 18);
    if (e.kind === 'topple') fx.kick(20), fx.blink(th.hot, 0.35), fx.burst(w / 2, p.y, '#c8a27a', 60, 7, 4), fx.pop(w / 2, h * 0.42, e.text!, '#ffffff', 22);
    if (e.kind === 'clear') fx.burst(w / 2, p.y, '#ffd36b', 60, 7, 3.5), fx.burst(w / 2, p.y, '#ff8fb1', 30, 5, 3), fx.blink('#fff6c8', 0.3), fx.pop(w / 2, h * 0.3, e.text!, '#ffffff', 24);
    if (e.kind === 'win') fx.pop(w / 2, h * 0.4, e.text!, th.accent, 28), fx.blink('#ffffff', 0.4);
    if (e.kind === 'stage') fx.pop(w / 2, h * 0.3, e.text!, '#ffffff', 19);
    if (e.kind === 'new') fx.pop(w / 2, h * 0.21, e.text!, '#fff3b0', 15);
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ── 안내 · HUD (화면 위 띠)
  if (s.stage === 0 && s.placed === 0 && s.hang && s.hang.age >= DESC) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${w * 0.05}px system-ui, sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(40,28,70,.6)';
    ctx.strokeText('👆 방이 점선 칸 위에 오면 탭!', w / 2, h * 0.17);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆 방이 점선 칸 위에 오면 탭!', w / 2, h * 0.17);
  }
  const bandH = w * 0.135;
  ctx.fillStyle = 'rgba(40,28,70,.78)';
  ctx.fillRect(0, 0, w, bandH);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${w * 0.042}px system-ui, sans-serif`;
  const n = s.deck.length;
  ctx.fillText(`🏠 ${k + 1}/${HOUSES} · 방 ${s.placed}/${n} · 😊 ${s.happy}/${s.happy >= s.goal ? s.goal3 + '★★★' : s.goal + '★★'}`, 10, bandH * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, bandH * 0.3);
  ctx.textAlign = 'left';
  ctx.font = `800 ${w * 0.034}px system-ui, sans-serif`;
  ctx.fillStyle = th.accent;
  const st = `★ ${s.stars} · 다음`;
  ctx.fillText(st, 10, bandH * 0.74);
  let nx = 14 + ctx.measureText(st).width;
  for (const t of s.deck.slice(s.di, s.di + 2)) {
    const cw = (t === 'hall' ? 2 : 1) * w * 0.07;
    ctx.fillStyle = RD[t].wall;
    ctx.beginPath();
    ctx.roundRect(nx, bandH * 0.56, cw, bandH * 0.36, 4);
    ctx.fill();
    emoji(ctx, RD[t].e, nx + cw / 2, bandH * 0.56 + bandH * 0.36, bandH * 0.3);
    nx += cw + 5;
  }
  if (s.di >= n) (ctx.fillStyle = th.muted), ctx.fillText('지붕', nx, bandH * 0.74);
  // 기울기 수평계
  const gx = w * 0.62, gw = w * 0.34, gy = bandH * 0.74, f = Math.max(-1.05, Math.min(1.05, ln / lim));
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.roundRect(gx, gy - 6, gw, 12, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,107,129,.55)';
  ctx.fillRect(gx + 2, gy - 4, gw * 0.13, 8);
  ctx.fillRect(gx + gw * 0.87 - 2, gy - 4, gw * 0.13, 8);
  ctx.fillStyle = Math.abs(f) > 0.7 ? (s.t % 14 < 7 ? '#ff6b81' : '#ffd36b') : '#9bffb0';
  ctx.beginPath();
  ctx.arc(gx + gw / 2 + f * gw * 0.43, gy, 5, 0, 7);
  ctx.fill();
  ctx.fillStyle = th.muted;
  ctx.font = `700 ${w * 0.026}px system-ui, sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('기울기', gx - 4, gy);
}

/** 봇: 아무 때나 탭 */
export const dollhouseRandom: Bot<HouseState> = { name: '아무 때나', act: (_s, rng) => ({ tap: rng() < 0.022, dir: 0 }) };

// ── 잘하는 봇: 다음 방 둘까지 내다보고 어느 칸에 놓을지 정한 뒤(콤보·균형·높이 맞추기), 그 칸 한가운데에 앉을 순간에 탭
interface LH { h: number[]; cap: boolean[]; crooked: number; add: { t: RT; col: number; floor: number }[] }
function cellOf(s: HouseState, H: LH, f: number, c: number): RT | undefined {
  for (const a of H.add) if (a.floor === f && (a.col === c || a.col === 2)) return a.t;
  return roomAt(s.rooms, f, c)?.t;
}
function plan(s: HouseState, H: LH, t: RT, col: number, left: number): { v: number; H: LH } {
  const wide = t === 'hall', lim = par(s.stage).limit;
  if (wide ? H.cap[0] || H.cap[1] : H.cap[col]) return { v: -3, H };
  const H2: LH = { h: [...H.h], cap: [...H.cap], crooked: H.crooked * 0.55, add: [...H.add] };
  let v = 4;
  if (wide) {
    const f = Math.max(H.h[0], H.h[1]);
    if (H.h[0] !== H.h[1]) (H2.crooked += (H.h[1] > H.h[0] ? 1 : -1) * 1.6), (v -= 2);
    else v += 8;
    H2.h = [f + 1, f + 1];
    H2.add.push({ t, col: 2, floor: f });
  } else {
    const f = H.h[col], nb = cellOf(s, H, f, 1 - col);
    if (t === 'dining' && cellOf(s, H, f - 1, col) === 'kitchen') v += 6;
    if ((t === 'attic' && nb === 'green') || (t === 'green' && nb === 'attic')) v += 8;
    if ((t === 'bath' && nb === 'bed') || (t === 'bed' && nb === 'bath')) v += 5;
    H2.h[col]++;
    if (t === 'attic') H2.cap[col] = true;
    H2.add.push({ t, col, floor: f });
  }
  const ln = H2.crooked + IMB * (H2.h[1] - H2.h[0]);
  v -= Math.max(0, Math.abs(ln) - 0.45 * lim) * 5 + 0.3 * Math.abs(H2.h[1] - H2.h[0]);
  if (H2.cap[0] && H2.cap[1]) v -= 3 * left;
  return { v, H: H2 };
}
function look(s: HouseState, H: LH, q: RT[], left: number): number {
  if (!q.length) return 0;
  let b = -1e9;
  for (const c of q[0] === 'hall' ? [2] : [0, 1]) {
    const r = plan(s, H, q[0], c, left - 1);
    b = Math.max(b, r.v + 0.9 * look(s, r.H, q.slice(1), left - 1));
  }
  return b;
}
export function chooseCol(s: HouseState, h: Hang): number {
  if (h.t === 'hall') return 2;
  const H0: LH = { h: [...s.h], cap: [...s.cap], crooked: s.crooked, add: [] }, q = s.deck.slice(s.di, s.di + 2), left = s.deck.length - s.di;
  let best = 0, bv = -1e9;
  for (const c of [0, 1]) {
    const r = plan(s, H0, h.t, c, left);
    const v = r.v + 0.9 * look(s, r.H, q, left);
    if (v > bv) (bv = v), (best = c);
  }
  return best;
}
const target = new WeakMap<object, number>();
export const dollhouseSmart: Bot<HouseState> = {
  name: '인형의 집 목수',
  act(s) {
    const h = s.hang;
    if (!h || h.age < DESC || s.pause) return { tap: false, dir: 0 };
    let col = target.get(h);
    if (col === undefined) target.set(h, (col = chooseCol(s, h)));
    const err = (L: Land) => (L.col === col ? Math.abs(L.e) : 9);
    const a = err(resolve(s, h.t, hx(s, h, 0), h.wind)), b = err(resolve(s, h.t, hx(s, h, 3), h.wind));
    return { tap: a <= b && a < 0.05, dir: 0 };
  },
};
