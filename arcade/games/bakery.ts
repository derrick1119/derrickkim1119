/**
 * 곰 아저씨 빵집 (20라운드 새 아이디어) — 꾹 눌렀다 떼기 × 주문 처리 × 꾸미기.
 * 기준 9(손이 하는 일은 하나): 꾹 누르는 동안 오븐 속 반죽이 부풀고, 떼면 곰 아저씨가 빵삽으로 휙 꺼내 창가 손님에게 던진다.
 *   '얼마나' = 빵 크기(손님마다 원하는 크기가 다르다), '언제' = 받는 손님(가게 앞을 걸어 지나가는 손님 중 그 순간 창가에 선 손님이 받는다).
 *   그래서 큰 빵은 손님이 오기 **전에** 미리 누르기 시작해야 한다. 너무 오래 누르면 '펑!' — 계속 누르고 있는 게 최선일 수 없다(기준 8).
 * 와우: 덜 부풀면 빵이 축 처지고, 너무 부풀면 '펑!' 하고 천장에 철썩 붙는다(붙은 빵은 그날 내내 대롱대롱).
 * 첫 3초: 첫 손님 다람쥐는 창가에서 기다려 준다 — 첫 빵이 딱 알맞게 부풀면 다람쥐 볼이 빵빵.
 * 판 = 하루. 문 닫을 때까지 번 돈이 목표를 넘으면 별 1~3개 + 번 돈으로 빵집이 커진다(간판 → 테라스 → 새 오븐 → 꽃길 → 축제 등불).
 *   못 넘으면 하트 -1, 그날 다시. 6일째까지.
 * 펼쳐짐(하는 일이 바뀐다): 고양이(2일, 창가에 앉아 있으면 떼지 말 것) → 반죽 바구니(3일, 반죽마다 부푸는 빠르기가 달라 다음 반죽을 보고 계획)
 *   → 급한 토끼(4일, 휙 지나가서 미리 눌러야 함·팁 2배) → 변덕 너구리(5일, 가까이 와서 말을 바꿈) → 사자 임금님(6일, 터지기 직전 초대왕 빵).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.25, TAU = Math.PI * 2;
const DAY = 1320, NIGHT = 150, DAYS = 6;
/** 창가(주문 받는 자리)와 그 폭 — 가게 앞 길 x(0~1) 기준 */
const SPOT = 0.64, ZONE = 0.075;
/** 반죽: 틱당 부푸는 양(식빵 기준) · 터지는 크기 · 날아가는 시간 · 새 반죽 넣는 시간 */
const RISE = 1 / 30, BMAX = 5.6, FLY = 22, RELOAD = 36, RELOAD2 = 14, MINHOLD = 5;
const V0 = 1 / 430;
/** 창가 앞에선 손님이 구경하느라 느려진다 (날이 갈수록 덜) */
const BROWSE = [0.35, 0.45, 0.5, 0.55, 0.55, 0.55];
const GAP: [number, number][] = [[170, 250], [150, 230], [140, 220], [130, 210], [125, 200], [115, 190]];
/** 크기 1~5 빵 값 */
const PRICE = [0, 2, 3, 4, 6, 9];
const SIZE_NAME = ['', '꼬마빵', '보통빵', '큰빵', '왕빵', '초대왕'];
/** 날마다 문 닫을 때 ★·★★·★★★ 번 돈 */
const GOALS = [[5, 12, 20], [8, 18, 28], [9, 20, 32], [10, 24, 38], [11, 25, 38], [12, 28, 45]];
const NORM = 0, FIRST = 1, RUSH = 2, FICKLE = 3, VIP = 4;
const MISS = 1, RAW = 2, DROOP = 3, BIG = 4, GOOD = 5, JUST = 6, STOLEN = 7;
const FOLK = ['🐿️', '🐹', '🦊', '🐻', '🐼', '🐷', '🐸', '🐧', '🦔', '🐨', '🐮', '🐔'];
export const DOUGH = [
  { e: '🍞', name: '식빵', r: 1 },
  { e: '🥐', name: '크루아상', r: 1.45 },
  { e: '🥖', name: '바게트', r: 0.7 },
];
const UPS = [
  { key: 'sign', name: '🪧 새 간판', text: '🪧 간판을 달았어요 — 손님이 더 자주 와요', x: 0.6, y: 0.3, z: 0.55 },
  { key: 'terrace', name: '☂️ 테라스', text: '☂️ 테라스 — 딱 맞은 손님이 앉아서 먹어요', x: 0.91, y: 0.66, z: 0.1 },
  { key: 'oven2', name: '🔥 새 오븐', text: '🔥 새 오븐 — 다음 반죽이 금방 들어가요', x: 0.42, y: 0.93, z: 0.17 },
  { key: 'flowers', name: '🌷 꽃길·가로등', text: '🌷 꽃길과 가로등 — 빵집이 환해졌어요', x: 0.5, y: 0.31, z: 0.04 },
  { key: 'lantern', name: '🏮 축제 등불', text: '🏮 축제 등불 — 내일은 빵 축제!', x: 0.42, y: 0.3, z: 0.47 },
  { key: 'fireworks', name: '🎆 불꽃놀이', text: '🎆 6일 장사 끝! 동네 최고 빵집', x: 0.5, y: 0.6, z: 0.8 },
];

export interface Cust {
  id: number; x: number; v: number; e: string; type: number; want: number; alt: number; flipped: boolean;
  /** 결과 (0 = 아직) */
  res: number; pay: number; land: number; b: number; dough: number; wt: number;
  /** 빵을 받고 그 자리에서 멈춰 있는 틱 (볼 빵빵·깔림·애걔 반응) */
  stay: number;
}
interface Flight { to: number; b: number; dough: number; t0: number; land: number; res: number; pay: number; x: number }
interface Stuck { x: number; b: number; dough: number; t: number; rot: number }
interface Ev { t: number; kind: string; x: number; text?: string; n?: number }
interface Note { t: number; text: string; color: string }
export interface BakeryState {
  rng: Rng; t: number; day: number; dayT: number; phase: 'day' | 'night'; pause: number; retry: boolean; won: boolean; dead: boolean;
  custs: Cust[]; cid: number; spawned: number; nextSpawn: number;
  ready: number; charge: number; b: number; dough: number; tray: number[]; pulls: number;
  flights: Flight[]; ceil: Stuck[]; catAway: number;
  coins: number; total: number; hearts: number; stars: number; cleared: number; dayStars: number; ups: number; upT: number;
  served: number; justs: number; pops: number; seats: string[];
  seen: Set<string>; events: Ev[]; notes: Note[];
}

const ev = (s: BakeryState, kind: string, x: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, text, n });
const note = (s: BakeryState, text: string, color = '#ffffff') => s.notes.push({ t: s.t, text, color });
function see(s: BakeryState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  note(s, text, '#ffe08a');
}
const hsh = (k: number) => ((Math.imul(k + 1, 2654435761) >>> 0) % 10007) / 10007;

/** 고양이 (2일째부터): 카운터 위를 걸어와 창가 앞에 식빵 자세로 앉았다가, 오른쪽으로 내려가 바구니에서 낮잠. 창가에 있을 때 떼면 빵을 채 간다 */
export function catAt(s: BakeryState, dayT: number): number | null {
  if (s.day < 1 || dayT < s.catAway) return null;
  const ph = (dayT + s.day * 131 + 200) % 540;
  if (ph < 120) return 0.5 + (SPOT - 0.5) * (ph / 120);
  if (ph < 175) return SPOT;
  if (ph < 235) return SPOT + (0.8 - SPOT) * ((ph - 175) / 60);
  return null;
}
export const catBlocks = (s: BakeryState, dayT: number) => {
  const c = catAt(s, dayT);
  return c !== null && Math.abs(c - SPOT) < 0.03;
};

type Walker = { x: number; v: number; type: number; res: number; wt: number; stay: number };
/** 손님 한 명의 걸음 */
export function custStep(c: Walker, day: number) {
  if (c.res && c.stay > 0) {
    c.stay--;
    return;
  }
  if (c.res) {
    c.x += c.res >= GOOD ? c.v * 1.5 : c.res === BIG ? c.v * 0.7 : c.v * 1.2;
    return;
  }
  if (c.type === FIRST && c.x >= SPOT - 0.004 && c.wt > 0) {
    c.wt--;
    return;
  }
  c.x += c.type === RUSH ? c.v : Math.abs(c.x - SPOT) < ZONE * 1.2 ? c.v * BROWSE[day] : c.v;
}
/** 손님 줄: 빵을 아직 못 받은 손님은 앞사람을 앞지르지 않고 QGAP 뒤에 선다 (게임과 봇이 같은 함수). 받은 손님은 뒷줄로 비켜 걷는다 */
const QGAP = 0.1;
export function walkAll(cs: Walker[], day: number) {
  let front = Infinity;
  for (const c of cs) {
    const x0 = c.x;
    custStep(c, day);
    if (c.res) continue;
    if (c.x > front - QGAP) c.x = Math.min(c.x, Math.max(x0, front - QGAP));
    front = c.x;
  }
}
export const inZone = (c: Walker) => !c.res && Math.abs(c.x - SPOT) < ZONE;
/** 지금 떼면 받을 손님 = 창가 칸 안에서 줄 맨 앞 손님 */
export function taker(s: BakeryState): Cust | null {
  for (const c of s.custs) if (inZone(c)) return c;
  return null;
}
/** 빵 크기 b를 크기 want 손님에게 주면: [결과, 받는 돈] */
export function judge(b: number, want: number, type: number): [number, number] {
  const d = b - want;
  let res: number, pay: number;
  if (Math.abs(d) < 0.2) (res = JUST), (pay = PRICE[want] + 1);
  else if (Math.abs(d) < 0.5) (res = GOOD), (pay = PRICE[want]);
  else if (d > 0) (res = BIG), (pay = 1);
  else (res = b < 0.6 ? RAW : DROOP), (pay = 0);
  if (res >= GOOD && (type === RUSH || type === VIP)) pay *= 2;
  return [res, pay];
}
export const rateOf = (dough: number) => RISE * DOUGH[dough].r;
export const reloadOf = (s: BakeryState) => (s.ups >= 3 ? RELOAD2 : RELOAD);

function spawn(s: BakeryState, x: number) {
  const d = s.day, r = s.rng, n = s.spawned++;
  let type = NORM;
  if (d === 0 && n === 0) type = FIRST;
  else if (d >= 3 && (n === 2 || r() < 0.2)) type = RUSH;
  else if (d >= 4 && (n === 3 || r() < 0.18)) type = FICKLE;
  else if (d >= 5 && (n === 4 || n === 10)) type = VIP;
  const maxW = d === 0 ? 3 : d === 1 ? 4 : 5;
  let want = 1 + Math.floor(r() * maxW);
  if (want === 5 && r() < 0.5) want = 4;
  if (type === FIRST) want = 2;
  if (type === RUSH) want = 1 + Math.floor(r() * 3);
  if (type === VIP) want = 5;
  let alt = want;
  if (type === FICKLE) alt = want <= 2 ? want + 2 + Math.floor(r() * 2) : want - 2;
  const e = type === FIRST ? '🐿️' : type === RUSH ? '🐇' : type === FICKLE ? '🦝' : type === VIP ? '🦁' : FOLK[Math.floor(r() * FOLK.length)];
  const v = V0 * (type === FIRST ? 1.2 : type === RUSH ? 2.3 : type === VIP ? 0.75 : 0.85 + r() * 0.3);
  s.custs.push({ id: s.cid++, x, v, e, type, want, alt, flipped: false, res: 0, pay: 0, land: 0, b: 0, dough: 0, wt: type === FIRST ? 600 : 0, stay: 0 });
  if (type === RUSH) see(s, 'rush', '🐇 급한 토끼 — 휙 지나가요! 미리 눌러 두면 팁 두 배');
  if (type === FICKLE) see(s, 'fickle', '🦝 변덕 너구리 — 가까이 와서야 크기를 정해요');
  if (type === VIP) see(s, 'vip', '🦁 사자 임금님 — 터지기 직전 초대왕 빵! 값 두 배');
}

function nextDough(s: BakeryState) {
  s.dough = s.day >= 2 ? s.tray.shift()! : 0;
  if (s.day >= 2) s.tray.push(Math.floor(s.rng() * 3));
}

function release(s: BakeryState) {
  const b = s.b, c = taker(s), cat = catBlocks(s, s.dayT);
  const f: Flight = { to: -1, b, dough: s.dough, t0: s.t, land: s.t + FLY, res: MISS, pay: 0, x: SPOT };
  if (cat) {
    f.to = -2;
    f.res = STOLEN;
    f.land = s.t + 12;
    s.catAway = s.dayT + 220;
    ev(s, 'steal', SPOT, '냥! 🐈');
    if (c) (c.res = STOLEN), (c.land = f.land), (c.stay = 40);
  } else if (c) {
    const [res, pay] = judge(b, c.want, c.type);
    f.to = c.id;
    f.res = res;
    f.pay = pay;
    f.x = c.x;
    c.res = res;
    c.pay = pay;
    c.land = f.land;
    c.stay = FLY + (res >= GOOD ? 75 : res === BIG ? 50 : 40);
    c.b = b;
    c.dough = s.dough;
    s.served++;
  } else ev(s, 'nobody', SPOT);
  s.flights.push(f);
  ev(s, 'pull', SPOT);
  s.pulls++;
  s.charge = 0;
  s.b = 0;
  s.ready = reloadOf(s);
  nextDough(s);
}

function pop(s: BakeryState) {
  s.ceil.push({ x: 0.08 + s.rng() * 0.66, b: s.b, dough: s.dough, t: s.t, rot: (s.rng() - 0.5) * 0.9 });
  if (s.ceil.length > 12) s.ceil.shift();
  s.pops++;
  s.pulls++;
  ev(s, 'pop', 0.2, '펑!!');
  see(s, 'pop', '💥 너무 오래 누르면 펑! 천장에 철썩 붙어요');
  s.charge = 0;
  s.b = 0;
  s.ready = reloadOf(s) + 24;
  nextDough(s);
}

function land(s: BakeryState, f: Flight) {
  s.coins += f.pay;
  s.total += f.pay;
  const c = s.custs.find((q) => q.id === f.to);
  const tag = c ? c.e : '';
  if (f.res === JUST) ev(s, 'just', f.x, `볼 빵빵! +${f.pay}🪙`, f.pay), s.justs++, see(s, 'just', `${tag} 딱 맞으면 볼이 빵빵! 돈도 더 받아요`);
  else if (f.res === GOOD) ev(s, 'good', f.x, `냠! +${f.pay}🪙`, f.pay), see(s, 'just', `${tag} 딱 맞으면 볼이 빵빵! 돈도 더 받아요`);
  else if (f.res === BIG) ev(s, 'big', f.x, '우왓 깔렸다! +1🪙', 1), see(s, 'big', '😵 너무 크면 손님이 깔려요 (1🪙만)');
  else if (f.res === DROOP) ev(s, 'droop', f.x, '축~ 처졌어요 0🪙'), see(s, 'droop', '😑 덜 부풀면 빵이 축 처져요 (돈 못 받음)');
  else if (f.res === RAW) ev(s, 'droop', f.x, '물컹! 날반죽 0🪙'), see(s, 'droop', '😑 덜 부풀면 빵이 축 처져요 (돈 못 받음)');
  else if (f.res === STOLEN) ev(s, 'stolen', SPOT, '이 녀석!'), see(s, 'cat', '🐈 고양이가 창가에 앉아 있을 땐 떼지 마요!');
  else ev(s, 'ground', SPOT, '아무도 없네… 구구!');
}

function startDay(s: BakeryState) {
  s.dayT = 0;
  s.phase = 'day';
  s.custs = [];
  s.flights = [];
  s.spawned = 0;
  s.coins = 0;
  s.charge = 0;
  s.b = 0;
  s.ready = 0;
  s.catAway = 0;
  s.tray = [0, 1];
  if (s.day >= 2) (s.tray = [Math.floor(s.rng() * 3), Math.floor(s.rng() * 3)]), nextDough(s);
  else s.dough = 0;
  if (s.day === 0) spawn(s, SPOT - 0.2), (s.nextSpawn = 110);
  else spawn(s, SPOT - 0.3), spawn(s, 0.04), (s.nextSpawn = 120);
  const g = GOALS[s.day];
  note(s, `${s.retry ? '🔁' : '☀️'} ${s.day + 1}일째${s.retry ? ' 다시' : ''} — 목표 🪙${g[0]} (★★ ${g[1]} · ★★★ ${g[2]})`, s.retry ? '#ffd0d0' : '#ffffff');
  if (s.day === 1) see(s, 'cat', '🐈 고양이 — 창가에 앉아 있을 땐 떼지 마요! 빵을 채 가요');
  if (s.day === 2) see(s, 'dough', '🥐 반죽마다 부푸는 빠르기가 달라요 — 아래 다음 반죽을 봐요');
}

export const starsNow = (s: BakeryState) => GOALS[s.day].filter((g) => s.coins >= g).length;

function endDay(s: BakeryState) {
  for (const f of s.flights) if (f.land > s.t) land(s, f);
  s.flights = [];
  s.charge = 0;
  s.b = 0;
  s.phase = 'night';
  s.pause = NIGHT;
  const st = starsNow(s);
  if (st > 0) {
    s.stars += st;
    s.cleared++;
    s.dayStars = st;
    s.retry = false;
    ev(s, 'clear', 0.5, `${s.day + 1}일째 장사 끝! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, st);
    if (s.ups < UPS.length) {
      const u = UPS[s.ups++];
      s.upT = s.t;
      see(s, u.key, u.text);
      ev(s, 'up', 0.5, u.text);
    }
  } else {
    s.hearts--;
    s.retry = true;
    ev(s, 'fail', 0.5, `🪙${s.coins}/${GOALS[s.day][0]} 모자라요 · ♥ -1`);
    if (s.hearts <= 0) s.dead = true;
  }
}

export const bakery: GameDef<BakeryState> = {
  id: 'bakery',
  name: '곰 아저씨 빵집',
  genes: ['hold', 'order', 'decorate'],
  twist: '꾹 누르는 동안 오븐 속 반죽이 부풀고 떼는 순간 창가에 선 손님에게 날아간다 — 덜 구우면 축 처지고, 너무 구우면 펑! 천장에 붙는다. 큰 빵은 손님이 오기 전에 미리 눌러야 한다',
  rules: [
    '꾹 누르면 반죽이 부풀고, 떼면 창가에 선 손님에게 휙! (스페이스도 돼요)',
    '손님이 원하는 크기만큼 — 덜 부풀면 축 처지고, 너무 오래면 펑!',
    '문 닫을 때까지 번 돈으로 별을 모으고 빵집을 키워요. 6일째까지.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 반죽이 부풀고, 떼면 꺼내요 / 스페이스',
  aspect: A,
  art: {
    concept: '동물 마을 골목의 단면 빵집 디오라마',
    mood: '흙층이 보이는 땅 덩어리 위에 반으로 잘린 작은 빵집. 벽돌 오븐이 주황빛으로 일렁이고, 하얀 요리사 모자를 쓴 곰 아저씨가 빵삽을 든다. 가게 앞 돌길로 다람쥐·여우·토끼 손님이 지나가고, 천장엔 터진 빵이 대롱대롱. 날이 갈수록 간판·테라스·꽃길·등불이 붙고, 해 질 녘엔 창문과 오븐이 따뜻하게 빛난다.',
    palette: { bg: '#2a1c18', ink: '#fff6e8', muted: '#b39a86', accent: '#f2a541', hot: '#ff5d5d', soft: '#ffe3b0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: BakeryState = {
      rng: mulberry32(seed), t: 0, day: 0, dayT: 0, phase: 'day', pause: 0, retry: false, won: false, dead: false,
      custs: [], cid: 0, spawned: 0, nextSpawn: 0, ready: 0, charge: 0, b: 0, dough: 0, tray: [0, 1], pulls: 0,
      flights: [], ceil: [], catAway: 0, coins: 0, total: 0, hearts: 3, stars: 0, cleared: 0, dayStars: 0, ups: 0, upT: -999,
      served: 0, justs: 0, pops: 0, seats: [], seen: new Set<string>(), events: [], notes: [],
    };
    startDay(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    if (s.events.length && s.t - s.events[0].t > 100) s.events = s.events.filter((e) => s.t - e.t <= 100);
    if (s.notes.length && s.t - s.notes[0].t > 220) s.notes = s.notes.filter((e) => s.t - e.t <= 220);
    if (s.dead) return;
    if (s.phase === 'night') {
      if (--s.pause > 0) return;
      if (s.retry) startDay(s);
      else if (s.day + 1 >= DAYS) (s.dead = true), (s.won = true);
      else s.day++, startDay(s);
      return;
    }
    s.dayT++;
    // 오븐: 꾹 = 부풀기, 떼기 = 꺼내기
    const down = !!inp.hold;
    if (s.ready > 0) s.ready--;
    else if (down) {
      if (s.charge === 0) ev(s, 'press', 0.2);
      s.charge++;
      s.b += rateOf(s.dough);
      if (s.b >= BMAX) pop(s);
    } else if (s.charge > 0) {
      if (s.charge < MINHOLD) (s.charge = 0), (s.b = 0), ev(s, 'tap', 0.2, '꾹 눌러야 부풀어요!');
      else release(s);
    }
    for (let i = 0; i < s.flights.length; i++) if (s.flights[i].land === s.t) land(s, s.flights[i]);
    if (s.flights.length && s.flights[0].land < s.t - 60) s.flights = s.flights.filter((f) => f.land >= s.t - 60);
    // 손님
    if (s.dayT >= s.nextSpawn && s.dayT < DAY - 240) {
      spawn(s, -0.06);
      const [g0, g1] = GAP[s.day];
      s.nextSpawn = s.dayT + Math.round((g0 + s.rng() * (g1 - g0)) * (s.ups >= 1 ? 0.88 : 1));
    }
    walkAll(s.custs, s.day);
    for (const c of s.custs) {
      if (c.type === FICKLE && !c.flipped && c.x >= SPOT - 0.26) ((c.flipped = true), (c.want = c.alt), ev(s, 'fickle', c.x, '아니, 이거!'));
      if (!c.res && c.x > SPOT + ZONE) (c.res = MISS), (c.land = s.t), ev(s, 'miss', c.x, '흥…');
      if (c.res >= GOOD && s.ups >= 2 && c.x > 0.86 && c.wt >= 0) {
        c.wt = -1;
        s.seats.push(c.e);
        if (s.seats.length > 4) s.seats.shift();
      }
    }
    if (s.custs.length && s.custs[0].x > 1.1) s.custs = s.custs.filter((c) => c.x <= 1.1);
    if (s.dayT >= DAY) endDay(s);
  },
  over: (s) => s.dead,
  /** 별 하나 10점, 6일을 다 버티면 30점 더 */
  score: (s) => s.stars * 10 + (s.won ? 30 : 0),
  draw(ctx, s, w, h, th: Theme) {
    drawBakery(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const rgb = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(4, -1).split(',').map(Number));
function mix(a: string, b: string, t: number) {
  const A1 = rgb(a), B1 = rgb(b), u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(A1[0] + (B1[0] - A1[0]) * u)},${Math.round(A1[1] + (B1[1] - A1[1]) * u)},${Math.round(A1[2] + (B1[2] - A1[2]) * u)})`;
}
const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, flip = false) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flip) (ctx.save(), ctx.translate(x, y), ctx.scale(-1, 1), ctx.fillText(e, 0, 0), ctx.restore());
  else ctx.fillText(e, x, y);
}
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, size: number, col = '#3a2a2a') {
  ctx.font = `800 ${size}px system-ui, sans-serif`;
  const tw = ctx.measureText(text).width + size;
  ctx.fillStyle = 'rgba(255,255,255,.94)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - size * 0.85, tw, size * 1.5, size * 0.6);
  ctx.moveTo(x - 3, y + size * 0.6);
  ctx.lineTo(x, y + size * 1.05);
  ctx.lineTo(x + 4, y + size * 0.6);
  ctx.fill();
  ctx.fillStyle = col;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y - size * 0.1);
}
const bakeCol = (bake: number) => (bake < 1 ? mix('#f6e7c8', '#e9a14a', bake) : mix('#e9a14a', '#7a3a14', (bake - 1) / 0.6));
/** 빵 한 덩이 (x, y = 밑면 가운데, W = 너비). kind 0 식빵 · 1 크루아상 · 2 바게트, bake 0 날반죽 ~ 1 노릇 ~ 1.6 탐, droop 0~1 축 처짐 */
function loaf(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, kind: number, bake: number, droop = 0) {
  const c0 = bakeCol(bake), c1 = mix(c0, '#4a2008', 0.4), hi = mix(c0, '#fff6dc', 0.5);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 + droop * 0.35, 1 - droop * 0.6);
  ctx.lineJoin = 'round';
  const H = kind === 2 ? W * 0.32 : kind === 1 ? W * 0.5 : W * 0.68;
  const g = ctx.createLinearGradient(0, -H, 0, 0);
  g.addColorStop(0, hi);
  g.addColorStop(0.45, c0);
  g.addColorStop(1, c1);
  ctx.fillStyle = g;
  ctx.strokeStyle = mix(c1, '#2a1004', 0.4);
  ctx.lineWidth = Math.max(0.8, W * 0.03);
  if (kind === 1) {
    // 크루아상: 마디 다섯 개가 초승달처럼
    for (const [px, py, rx, ry] of [[-0.4, -0.18, 0.13, 0.17], [0.4, -0.18, 0.13, 0.17], [-0.22, -0.32, 0.17, 0.27], [0.22, -0.32, 0.17, 0.27], [0, -0.42, 0.2, 0.38]]) {
      ctx.beginPath();
      ctx.ellipse(px * W, py * W * 0.9, rx * W, ry * W * 0.9, px * 0.8, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 2) {
    ctx.beginPath();
    ctx.roundRect(-W / 2, -H, W, H, H / 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hi;
    ctx.lineWidth = Math.max(1, W * 0.035);
    for (let q = -1; q <= 1; q++) (ctx.beginPath(), ctx.moveTo(q * W * 0.25 - W * 0.07, -H * 0.3), ctx.lineTo(q * W * 0.25 + W * 0.07, -H * 0.75), ctx.stroke());
  } else {
    ctx.beginPath();
    ctx.moveTo(-W / 2, 0);
    ctx.lineTo(-W / 2, -H * 0.5);
    ctx.bezierCurveTo(-W / 2, -H * 1.2, W / 2, -H * 1.2, W / 2, -H * 0.5);
    ctx.lineTo(W / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = hi;
    ctx.lineWidth = Math.max(1, W * 0.04);
    for (let q = -1; q <= 1; q++) (ctx.beginPath(), ctx.arc(q * W * 0.22, -H * 0.62, W * 0.1, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
  }
  ctx.restore();
  if (droop > 0.05) {
    // 축 처진 빵: 양옆으로 흘러내린 반죽
    ctx.fillStyle = bakeCol(bake * 0.6);
    ctx.strokeStyle = 'rgba(120,80,40,.5)';
    ctx.lineWidth = 1;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * W * 0.45, y - W * 0.08);
      ctx.quadraticCurveTo(x + sd * W * 0.78, y - W * 0.02, x + sd * W * 0.7, y + W * 0.42 * droop);
      ctx.quadraticCurveTo(x + sd * W * 0.6, y + W * 0.5 * droop, x + sd * W * 0.52, y + W * 0.3 * droop);
      ctx.quadraticCurveTo(x + sd * W * 0.45, y + W * 0.05, x + sd * W * 0.3, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
}

type Mood = 'idle' | 'focus' | 'panic' | 'swing' | 'proud' | 'shock' | 'oops' | 'angry' | 'dance' | 'sad';
/** 곰 아저씨 (원점 = 발밑, u = 키 px). look: 눈이 보는 쪽(-1 왼쪽 오븐 ~ 1 오른쪽 창가) */
function drawBear(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: Mood, t: number, sweat: number, flour: number, look: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = mood === 'dance' ? Math.abs(Math.sin(t / 6)) * 0.05 : mood === 'panic' ? Math.sin(t * 1.3) * 0.006 : Math.sin(t / 30) * 0.006;
  ctx.fillStyle = 'rgba(40,20,10,.28)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.34, u * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.scale(u, u);
  ctx.translate(mood === 'panic' ? Math.sin(t * 1.7) * 0.012 : 0, -bob);
  if (mood === 'dance') ctx.rotate(Math.sin(t / 6) * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const fur = '#9a6236', fur2 = '#6e401e', tan = '#e8c39a';
  // 발
  ctx.fillStyle = fur2;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * 0.12, -0.035, 0.09, 0.045, 0, 0, TAU), ctx.fill());
  // 팔 (몸 뒤쪽 것 먼저): 자세마다 어깨→손
  const arm = (sx: number, ex: number, ey: number) => {
    ctx.strokeStyle = fur2;
    ctx.lineWidth = 0.11;
    ctx.beginPath();
    ctx.moveTo(sx, -0.42);
    ctx.quadraticCurveTo((sx + ex) / 2 + sx * 0.15, (ey - 0.42) / 2 - 0.02, ex, ey);
    ctx.stroke();
    ctx.strokeStyle = fur;
    ctx.lineWidth = 0.085;
    ctx.stroke();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.arc(ex, ey, 0.055, 0, TAU);
    ctx.fill();
  };
  let hands: [number, number, number, number];
  if (mood === 'focus' || mood === 'panic') hands = [-0.36, -0.36, -0.2, -0.32];
  else if (mood === 'swing') hands = [0.1, -0.62, 0.3, -0.6];
  else if (mood === 'proud') hands = [-0.27, -0.24, 0.27, -0.24];
  else if (mood === 'shock' || mood === 'dance') hands = [-0.34, -0.72 + (mood === 'dance' ? Math.sin(t / 5) * 0.06 : 0), 0.34, -0.72 - (mood === 'dance' ? Math.sin(t / 5) * 0.06 : 0)];
  else if (mood === 'angry') hands = [-0.27, -0.24, 0.32, -0.72 + Math.sin(t * 0.9) * 0.04];
  else if (mood === 'sad') hands = [-0.24, -0.12, 0.24, -0.12];
  else hands = [-0.22, -0.2, 0.22, -0.2];
  // 빵삽: 누르는 중엔 오븐 쪽으로 쭉, 꺼낼 땐 휘둘러 올림
  if (mood === 'focus' || mood === 'panic' || mood === 'swing') {
    const sw = mood === 'swing';
    ctx.strokeStyle = '#b07a44';
    ctx.lineWidth = 0.035;
    ctx.beginPath();
    ctx.moveTo(sw ? 0.3 : -0.2, sw ? -0.6 : -0.32);
    ctx.lineTo(sw ? 0.72 : -0.82, sw ? -1.02 : -0.4);
    ctx.stroke();
    ctx.fillStyle = '#d29a5a';
    ctx.save();
    ctx.translate(sw ? 0.78 : -0.9, sw ? -1.08 : -0.41);
    ctx.rotate(sw ? -0.8 : 0.1);
    ctx.beginPath();
    ctx.roundRect(-0.12, -0.03, 0.24, 0.06, 0.03);
    ctx.fill();
    ctx.restore();
  }
  // 몸통
  const bg = ctx.createLinearGradient(-0.3, -0.6, 0.3, 0);
  bg.addColorStop(0, '#b07444');
  bg.addColorStop(1, fur2);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -0.3, 0.27 + (mood === 'proud' ? 0.02 : 0), 0.3, 0, 0, TAU);
  ctx.fill();
  // 앞치마
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.moveTo(-0.15, -0.5);
  ctx.lineTo(0.15, -0.5);
  ctx.quadraticCurveTo(0.22, -0.2, 0.17, -0.05);
  ctx.quadraticCurveTo(0, 0.0, -0.17, -0.05);
  ctx.quadraticCurveTo(-0.22, -0.2, -0.15, -0.5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,110,60,.5)';
  ctx.lineWidth = 0.012;
  ctx.stroke();
  // 앞치마의 빵 무늬
  ctx.fillStyle = '#e9a14a';
  ctx.beginPath();
  ctx.ellipse(0, -0.26, 0.07, 0.045, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillRect(-0.07, -0.26, 0.14, 0.035);
  arm(-0.2, hands[0], hands[1]);
  arm(0.2, hands[2], hands[3]);
  // 머리
  const hy = -0.72;
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sd * 0.15, hy - 0.15, 0.075, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#e8a6a0';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * 0.15, hy - 0.15, 0.038, 0, TAU), ctx.fill());
  const hg = ctx.createRadialGradient(-0.06, hy - 0.08, 0.02, 0, hy, 0.24);
  hg.addColorStop(0, '#b67a48');
  hg.addColorStop(1, fur);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, hy, 0.21, 0.19, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = tan;
  ctx.beginPath();
  ctx.ellipse(0, hy + 0.07, 0.105, 0.075, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.ellipse(0, hy + 0.035, 0.042, 0.03, 0, 0, TAU);
  ctx.fill();
  // 눈
  const lx = look * 0.018;
  ctx.fillStyle = '#1e1008';
  ctx.strokeStyle = '#1e1008';
  ctx.lineWidth = 0.022;
  for (const sd of [-1, 1]) {
    const ex = sd * 0.085, ey = hy - 0.03;
    if (mood === 'proud' || mood === 'dance') (ctx.beginPath(), ctx.arc(ex, ey + 0.012, 0.028, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else if (mood === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 0.045, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1e1008';
      ctx.beginPath();
      ctx.arc(ex, ey, 0.014, 0, TAU);
      ctx.fill();
    } else if (mood === 'focus') {
      // 끙: > <
      ctx.beginPath();
      ctx.moveTo(ex - sd * 0.03, ey - 0.025);
      ctx.lineTo(ex + sd * 0.015, ey);
      ctx.lineTo(ex - sd * 0.03, ey + 0.025);
      ctx.stroke();
    } else if (mood === 'panic') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, 0.036, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1e1008';
      ctx.beginPath();
      ctx.arc(ex - 0.012, ey, 0.016, 0, TAU);
      ctx.fill();
    } else if (mood === 'oops' || mood === 'sad') (ctx.beginPath(), ctx.moveTo(ex - 0.028, ey + (mood === 'sad' ? -0.01 : 0)), ctx.lineTo(ex + 0.028, ey + (mood === 'sad' ? 0.01 * sd : 0)), ctx.stroke());
    else if (mood === 'angry') {
      ctx.beginPath();
      ctx.arc(ex, ey + 0.005, 0.02, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ex - sd * 0.045, ey - 0.06);
      ctx.lineTo(ex + sd * 0.02, ey - 0.03);
      ctx.stroke();
    } else if (t % 190 < 7) (ctx.beginPath(), ctx.moveTo(ex - 0.025, ey), ctx.lineTo(ex + 0.025, ey), ctx.stroke());
    else (ctx.beginPath(), ctx.arc(ex + lx, ey, 0.021, 0, TAU), ctx.fill());
  }
  // 입
  ctx.lineWidth = 0.018;
  ctx.beginPath();
  const my = hy + 0.1;
  if (mood === 'shock') (ctx.fillStyle = '#5a1a10'), ctx.ellipse(0, my + 0.02, 0.035, 0.045, 0, 0, TAU), ctx.fill();
  else if (mood === 'panic') {
    ctx.moveTo(-0.045, my + 0.01);
    for (let q = 0; q <= 6; q++) ctx.lineTo(-0.045 + q * 0.015, my + 0.01 + (q % 2 ? -0.012 : 0.012));
    ctx.stroke();
  } else if (mood === 'focus') (ctx.moveTo(-0.035, my + 0.01), ctx.lineTo(0.035, my + 0.01), ctx.stroke());
  else if (mood === 'oops' || mood === 'sad' || mood === 'angry') (ctx.arc(0, my + 0.04, 0.03, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke());
  else if (mood === 'proud' || mood === 'dance') ((ctx.fillStyle = '#5a1a10'), ctx.arc(0, my - 0.005, 0.04, 0.1, Math.PI - 0.1), ctx.fill());
  else (ctx.arc(0, my - 0.01, 0.03, 0.3, Math.PI - 0.3), ctx.stroke());
  // 볼
  if (mood === 'proud' || mood === 'dance' || mood === 'focus' || mood === 'panic') {
    ctx.fillStyle = `rgba(255,110,110,${mood === 'panic' ? 0.65 : 0.45})`;
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sd * 0.14, hy + 0.05, 0.035, 0.022, 0, 0, TAU), ctx.fill());
  }
  // 밀가루 범벅 (펑!)
  if (flour > 0) {
    ctx.fillStyle = `rgba(255,255,255,${0.85 * flour})`;
    for (const [px, py, r] of [[-0.08, -0.74, 0.08], [0.07, -0.66, 0.07], [0.12, -0.8, 0.05], [-0.13, -0.62, 0.05], [0.0, -0.82, 0.06], [-0.05, -0.38, 0.07], [0.1, -0.3, 0.06]]) (ctx.beginPath(), ctx.arc(px, py, r, 0, TAU), ctx.fill());
  }
  // 요리사 모자 (펑! 하면 날아간다)
  ctx.save();
  if (mood === 'shock') (ctx.translate(0.05, -0.22), ctx.rotate(0.5));
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(150,140,130,.6)';
  ctx.lineWidth = 0.012;
  ctx.beginPath();
  ctx.roundRect(-0.13, hy - 0.24, 0.26, 0.08, 0.02);
  ctx.fill();
  ctx.stroke();
  for (const [px, py, r] of [[-0.1, -0.32, 0.08], [0.1, -0.32, 0.08], [0, -0.37, 0.1]]) (ctx.beginPath(), ctx.arc(px, hy + py, r, 0, TAU), ctx.fill(), ctx.stroke());
  ctx.restore();
  // 땀
  if (sweat > 0) {
    ctx.fillStyle = '#8fd0ff';
    const n = sweat > 0.8 ? 3 : sweat > 0.5 ? 2 : 1;
    for (let q = 0; q < n; q++) {
      const ph = ((t + q * 13) % 34) / 34, sx = (q % 2 ? -1 : 1) * (0.22 + q * 0.03);
      ctx.globalAlpha = 1 - ph * 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, hy - 0.12 + ph * 0.16);
      ctx.quadraticCurveTo(sx + 0.03, hy - 0.06 + ph * 0.16, sx, hy - 0.04 + ph * 0.16);
      ctx.quadraticCurveTo(sx - 0.03, hy - 0.06 + ph * 0.16, sx, hy - 0.12 + ph * 0.16);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  if (mood === 'sad') {
    ctx.fillStyle = '#7fc8ff';
    for (const sd of [-1, 1]) {
      const ph = ((t + (sd > 0 ? 10 : 0)) % 24) / 24;
      ctx.beginPath();
      ctx.arc(sd * 0.085, hy + ph * 0.12, 0.018, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

const SKY: [number, string, string][] = [
  [0, '#7a8cd0', '#ffd0a8'],
  [0.15, '#62b6f0', '#d6f0ff'],
  [0.6, '#55aaee', '#cdeeff'],
  [0.85, '#7a62b0', '#ffa878'],
  [1, '#2c2a68', '#f08060'],
];

function drawBakery(ctx: CanvasRenderingContext2D, s: BakeryState, w: number, h: number, th: Theme) {
  const fx = juice(s), R = (x: number) => x * w, F = (x: number) => Math.max(12, x * w);
  const top = R(0.13), bot = h - R(0.1);
  const WW = R(0.82), SK = R(0.12), DY = R(0.26), OX = R(0.03), OY = bot - R(0.12);
  const P = (x: number, y: number, z: number): [number, number] => [OX + x * WW + y * SK, OY - y * DY - z * w];
  const HB = 0.44, CT = 0.05, BX0 = 0.03, BX1 = 0.8, BY0 = 0.34;
  const poly = (pts: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  };
  const night = s.phase === 'night' ? Math.min(1, (NIGHT - s.pause) / 30, s.pause / 30 + 0.3) : 0;
  const f = s.phase === 'night' ? 1 : s.dayT / DAY;
  const dusk = Math.max(night * 0.5, f > 0.72 ? ((f - 0.72) / 0.28) * 0.32 : f < 0.05 ? ((0.05 - f) / 0.05) * 0.15 : 0);
  const age = (kind: string) => {
    let a = 999;
    for (const e of s.events) if (e.kind === kind) a = Math.min(a, s.t - e.t);
    return a;
  };
  const shout = (x: number, y: number, t: string, col = '#e8202a', size = F(0.042)) => {
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(t, x, y);
    ctx.fillStyle = col;
    ctx.fillText(t, x, y);
  };
  ctx.save();
  fx.begin(ctx);
  // ── 하늘 ──
  let a = SKY[0], b = SKY[SKY.length - 1];
  for (let i = 0; i < SKY.length - 1; i++) if (f >= SKY[i][0] && f <= SKY[i + 1][0]) (a = SKY[i]), (b = SKY[i + 1]);
  const u = (f - a[0]) / Math.max(1e-6, b[0] - a[0]);
  const sg = ctx.createLinearGradient(0, 0, 0, OY - DY);
  sg.addColorStop(0, mix(mix(a[1], b[1], u), '#121640', night));
  sg.addColorStop(1, mix(mix(a[2], b[2], u), '#3a3270', night));
  ctx.fillStyle = sg;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  if (night > 0.2)
    for (let k = 0; k < 36; k++) {
      ctx.globalAlpha = (night - 0.2) * (0.4 + 0.6 * Math.abs(Math.sin(s.t / 30 + k)));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(hsh(k * 3) * w, top + hsh(k * 5 + 1) * R(0.4), 1.6, 1.6);
    }
  ctx.globalAlpha = 1;
  {
    const sx = w * (0.1 + 0.8 * (s.phase === 'night' ? 0.85 : f)), sy = top + R(0.17) - Math.sin(Math.PI * (s.phase === 'night' ? 0.5 : f)) * R(0.1);
    const sun = s.phase === 'night' ? '#f4f1d0' : mix('#fff4b0', '#ff9a50', Math.abs(f - 0.5) * 2);
    const gl = ctx.createRadialGradient(sx, sy, 0, sx, sy, R(0.11));
    gl.addColorStop(0, sun);
    gl.addColorStop(0.28, sun);
    gl.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(sx, sy, R(0.11), 0, TAU);
    ctx.fill();
  }
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 11) * w + s.t * (0.08 + k * 0.03)) % (w + 120)) - 60, cy = top + R(0.03) + hsh(k + 3) * R(0.14);
    ctx.fillStyle = `rgba(255,255,255,${0.6 - night * 0.45})`;
    for (let p = 0; p < 4; p++) (ctx.beginPath(), ctx.ellipse(cx + p * R(0.035) - R(0.05), cy - (p % 2) * R(0.012), R(0.04), R(0.02), 0, 0, TAU), ctx.fill());
  }
  // 먼 마을 언덕 (가게 뒤)
  {
    const by = OY - DY + R(0.01);
    ctx.fillStyle = mix('#9fd08a', '#2a3458', Math.max(night, dusk * 0.6));
    ctx.beginPath();
    ctx.moveTo(0, by);
    for (let px = 0; px <= w + 8; px += 8) ctx.lineTo(px, by - R(0.08) - R(0.03) * Math.sin(px / 40) - R(0.02) * Math.sin(px / 17 + 1));
    ctx.lineTo(w, by);
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      const hx = hsh(k * 7 + 2) * w, hy = by - R(0.07) - R(0.03) * Math.sin(hx / 40);
      ctx.fillStyle = mix('#f4e2c8', '#4a4468', Math.max(night, dusk * 0.6));
      ctx.fillRect(hx - 6, hy - 9, 12, 9);
      ctx.fillStyle = mix(['#d4614a', '#4a7ad4', '#d49a4a'][k % 3], '#3a2a50', Math.max(night, dusk * 0.6));
      ctx.beginPath();
      ctx.moveTo(hx - 8, hy - 9);
      ctx.lineTo(hx, hy - 16);
      ctx.lineTo(hx + 8, hy - 9);
      ctx.fill();
      if (dusk > 0.2) (ctx.fillStyle = '#ffd36b'), ctx.fillRect(hx - 2, hy - 6, 4, 4);
    }
  }
  // ── 받침대 그림자·나무 진열대 ──
  const T = R(0.075);
  const F0 = P(0, 0, 0), F1 = P(1, 0, 0), B1 = P(1, 1, 0), B0 = P(0, 1, 0);
  ctx.fillStyle = 'rgba(20,10,5,.35)';
  ctx.beginPath();
  ctx.ellipse((F0[0] + B1[0]) / 2, F0[1] + T + R(0.04), w * 0.52, R(0.05), 0, 0, TAU);
  ctx.fill();
  {
    const ex = R(0.02), pd = R(0.03);
    const L1: [number, number] = [F0[0] - ex, F0[1] + T], R1: [number, number] = [F1[0] + ex, F1[1] + T], RB: [number, number] = [B1[0] + ex, B1[1] + T];
    poly([L1, R1, [R1[0], R1[1] + pd], [L1[0], L1[1] + pd]], mix('#8a5a34', '#2a1c10', night * 0.6));
    poly([R1, RB, [RB[0], RB[1] + pd], [R1[0], R1[1] + pd]], mix('#6e4626', '#20140c', night * 0.6));
    ctx.strokeStyle = 'rgba(255,220,170,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L1[0], L1[1]);
    ctx.lineTo(R1[0], R1[1]);
    ctx.lineTo(RB[0], RB[1]);
    ctx.stroke();
  }
  // ── 땅 덩어리: 앞면·옆면 흙층 ──
  const soil = (pts: [number, number][], side: boolean) => {
    const gr = ctx.createLinearGradient(0, pts[0][1], 0, pts[0][1] + T);
    gr.addColorStop(0, mix('#6aa84a', '#1e3418', night * 0.6));
    gr.addColorStop(0.12, mix('#6aa84a', '#1e3418', night * 0.6));
    gr.addColorStop(0.13, mix('#9a6a42', '#3a2818', night * 0.6));
    gr.addColorStop(0.55, mix('#84552f', '#2e2012', night * 0.6));
    gr.addColorStop(0.56, mix('#6e4424', '#24180e', night * 0.6));
    gr.addColorStop(1, mix('#5a361c', '#1c120a', night * 0.6));
    poly(pts, gr);
    if (side) poly(pts, 'rgba(0,0,0,.18)');
  };
  soil([F0, F1, [F1[0], F1[1] + T], [F0[0], F0[1] + T]], false);
  soil([F1, B1, [B1[0], B1[1] + T], [F1[0], F1[1] + T]], true);
  for (let k = 0; k < 14; k++) {
    const q = hsh(k * 19), px = F0[0] + (F1[0] - F0[0]) * q, py = F0[1] + T * (0.3 + 0.6 * hsh(k * 23));
    ctx.fillStyle = mix(k % 3 ? '#a8896a' : '#c8b090', '#2a2018', night * 0.6);
    ctx.beginPath();
    ctx.ellipse(px, py, 2 + hsh(k) * 2.5, 1.5 + hsh(k + 1) * 1.5, 0, 0, TAU);
    ctx.fill();
  }
  // 윗면: 풀밭 → 돌길(가게 앞) → 가게 바닥
  poly([F0, F1, B1, B0], mix('#7cc35a', '#1e3a20', night * 0.6));
  const sw0 = P(0, 0.03, 0), sw1 = P(1, 0.03, 0), sw2 = P(1, 0.3, 0), sw3 = P(0, 0.3, 0);
  poly([sw0, sw1, sw2, sw3], mix('#d9c7a6', '#4a4038', night * 0.6));
  ctx.strokeStyle = mix('#b8a280', '#2a241e', night * 0.6);
  ctx.lineWidth = 1;
  for (let q = 0; q <= 22; q++) {
    const [x0, y0] = P(q / 22, 0.03, 0), [x1, y1] = P(q / 22 + 0.004, 0.3, 0);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(...P(0, 0.165, 0));
  ctx.lineTo(...P(1, 0.165, 0));
  ctx.stroke();
  // 창가 발판 (여기 선 손님이 빵을 받는다)
  {
    const pulse = 0.55 + 0.45 * Math.sin(s.t / 8), tk = taker(s);
    poly([P(SPOT - ZONE, 0.05, 0), P(SPOT + ZONE, 0.05, 0), P(SPOT + ZONE, 0.28, 0), P(SPOT - ZONE, 0.28, 0)], mix(tk ? '#ffcf5a' : '#e0705a', '#3a2a20', night * 0.5));
    ctx.strokeStyle = `rgba(255,255,255,${0.35 + 0.4 * pulse})`;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(...P(SPOT - ZONE, 0.05, 0));
    ctx.lineTo(...P(SPOT + ZONE, 0.05, 0));
    ctx.lineTo(...P(SPOT + ZONE, 0.28, 0));
    ctx.lineTo(...P(SPOT - ZONE, 0.28, 0));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // 가게 바닥 (나무 마루)
  poly([P(BX0, BY0, 0), P(BX1, BY0, 0), P(BX1, 1, 0), P(BX0, 1, 0)], mix('#c48c58', '#3a2818', night * 0.55));
  ctx.strokeStyle = mix('#a8743e', '#2a1c10', night * 0.55);
  for (let q = 1; q < 6; q++) {
    ctx.beginPath();
    ctx.moveTo(...P(BX0, BY0 + (q / 6) * (1 - BY0), 0));
    ctx.lineTo(...P(BX1, BY0 + (q / 6) * (1 - BY0), 0));
    ctx.stroke();
  }
  // ── 뒷벽: 회반죽 + 나무 징두리 + 창문 + 선반 ──
  const wallC = mix('#fbecd2', '#5a4a40', night * 0.55 + dusk * 0.3);
  poly([P(BX0, 1, 0), P(BX1, 1, 0), P(BX1, 1, HB), P(BX0, 1, HB)], wallC);
  poly([P(BX0, 1, 0), P(BX1, 1, 0), P(BX1, 1, 0.08), P(BX0, 1, 0.08)], mix('#b07a48', '#3a2616', night * 0.55));
  ctx.strokeStyle = mix('#8a5a30', '#2a1a10', night * 0.55);
  ctx.lineWidth = 1;
  for (let q = 0; q < 14; q++) (ctx.beginPath(), ctx.moveTo(...P(BX0 + (q / 14) * (BX1 - BX0), 1, 0)), ctx.lineTo(...P(BX0 + (q / 14) * (BX1 - BX0), 1, 0.08)), ctx.stroke());
  {
    // 창문 (바깥 하늘이 보인다)
    const wx0 = 0.58, wx1 = 0.74, wz0 = 0.13, wz1 = 0.3;
    const wg = ctx.createLinearGradient(0, P(0, 1, wz1)[1], 0, P(0, 1, wz0)[1]);
    wg.addColorStop(0, mix(mix(a[1], b[1], u), '#121640', night));
    wg.addColorStop(1, mix(mix(a[2], b[2], u), '#3a3270', night));
    poly([P(wx0, 1, wz0), P(wx1, 1, wz0), P(wx1, 1, wz1), P(wx0, 1, wz1)], wg);
    ctx.fillStyle = mix('#8fc070', '#1e3020', night);
    ctx.beginPath();
    ctx.moveTo(...P(wx0, 1, wz0));
    ctx.quadraticCurveTo(...P((wx0 + wx1) / 2, 1, wz0 + 0.07), ...P(wx1, 1, wz0));
    ctx.fill();
    ctx.strokeStyle = mix('#8a5a30', '#2a1a10', night * 0.5);
    ctx.lineWidth = 3;
    ctx.strokeRect(P(wx0, 1, wz1)[0], P(wx0, 1, wz1)[1], P(wx1, 1, 0)[0] - P(wx0, 1, 0)[0], P(0, 1, wz0)[1] - P(0, 1, wz1)[1]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...P((wx0 + wx1) / 2, 1, wz0));
    ctx.lineTo(...P((wx0 + wx1) / 2, 1, wz1));
    ctx.moveTo(...P(wx0, 1, (wz0 + wz1) / 2));
    ctx.lineTo(...P(wx1, 1, (wz0 + wz1) / 2));
    ctx.stroke();
    // 커튼
    ctx.fillStyle = mix('#e86a5a', '#4a2020', night * 0.5);
    for (const [cx, sd] of [[wx0, 1], [wx1, -1]] as [number, number][]) {
      const [x0, y0] = P(cx, 1, wz1 + 0.01), [, y1] = P(cx, 1, wz0 - 0.01);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + sd * R(0.035), y0);
      ctx.quadraticCurveTo(x0 + sd * R(0.01), (y0 + y1) / 2, x0 + sd * R(0.02), y1);
      ctx.lineTo(x0, y1);
      ctx.fill();
    }
  }
  // 선반과 진열 빵 (판 빵이 많을수록 가득)
  {
    const sz = 0.33, [x0, y0] = P(0.55, 1, sz), [x1] = P(0.78, 1, sz);
    ctx.fillStyle = mix('#9a6236', '#2a1a10', night * 0.5);
    ctx.fillRect(x0, y0, x1 - x0, 4);
    const n = Math.min(6, 2 + Math.floor(s.served / 4));
    for (let q = 0; q < n; q++) loaf(ctx, x0 + 8 + q * ((x1 - x0 - 14) / 5), y0, R(0.03), q % 3, 1 + (q % 2) * 0.2);
    // 벽시계
    const [cx, cy] = P(0.45, 1, 0.34);
    ctx.fillStyle = mix('#ffffff', '#8a8070', night * 0.5);
    ctx.strokeStyle = '#8a5a30';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.03), 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#3a2a20';
    ctx.lineWidth = 1.5;
    const an = f * TAU * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(an) * R(0.022), cy + Math.sin(an) * R(0.022));
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(f * TAU / 2 - Math.PI / 2) * R(0.014), cy + Math.sin(f * TAU / 2 - Math.PI / 2) * R(0.014));
    ctx.stroke();
  }
  // 왼쪽 벽 (안쪽 면, 벽돌)
  poly([P(BX0, BY0, 0), P(BX0, 1, 0), P(BX0, 1, HB), P(BX0, BY0, HB)], mix('#c9805e', '#3a221a', night * 0.55));
  ctx.strokeStyle = mix('#a8604a', '#2a1810', night * 0.55);
  ctx.lineWidth = 1;
  for (let q = 1; q < 9; q++) (ctx.beginPath(), ctx.moveTo(...P(BX0, BY0, (q / 9) * HB)), ctx.lineTo(...P(BX0, 1, (q / 9) * HB)), ctx.stroke());
  poly([P(BX0, BY0, 0), P(BX0, 1, 0), P(BX0, 1, HB), P(BX0, BY0, HB)], 'rgba(0,0,0,.12)');
  // ── 오븐 ──
  const OVX0 = 0.04, OVX1 = 0.34, OVY = 0.88;
  const ovC = P((OVX0 + OVX1) / 2, OVY, 0), ovW = (OVX1 - OVX0) * WW;
  const mouth = { x: ovC[0], y: ovC[1] - R(0.085), w: ovW * 0.72, h: R(0.11) };
  const p = s.b / BMAX, heat = s.charge > 0 ? 0.5 + 0.5 * p : 0.25;
  const lights: [number, number, number, number][] = [];
  {
    const [cx, cy] = ovC, hgt = R(0.255);
    // 그림자
    ctx.fillStyle = 'rgba(40,20,10,.25)';
    ctx.beginPath();
    ctx.ellipse(cx + 6, cy + 2, ovW * 0.55, R(0.025), 0, 0, TAU);
    ctx.fill();
    // 벽돌 받침
    const brick = mix('#b5523a', '#3a1a14', night * 0.4), brick2 = mix('#9a3e2a', '#2a120e', night * 0.4);
    ctx.fillStyle = brick2;
    ctx.fillRect(cx - ovW / 2, cy - R(0.065), ovW, R(0.065));
    // 돔
    const dg = ctx.createLinearGradient(cx - ovW / 2, 0, cx + ovW / 2, 0);
    dg.addColorStop(0, mix(brick, '#ffffff', 0.08));
    dg.addColorStop(1, brick2);
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(cx - ovW / 2, cy - R(0.06));
    ctx.lineTo(cx - ovW / 2, cy - hgt * 0.55);
    ctx.quadraticCurveTo(cx - ovW / 2, cy - hgt, cx, cy - hgt);
    ctx.quadraticCurveTo(cx + ovW / 2, cy - hgt, cx + ovW / 2, cy - hgt * 0.55);
    ctx.lineTo(cx + ovW / 2, cy - R(0.06));
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(70,20,10,.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 8; r++) {
      const yy = cy - R(0.06) - r * R(0.022);
      ctx.beginPath();
      ctx.moveTo(cx - ovW / 2, yy);
      ctx.lineTo(cx + ovW / 2, yy);
      ctx.stroke();
      for (let q = 0; q < 7; q++) {
        const xx = cx - ovW / 2 + ((q + (r % 2) * 0.5) / 6) * ovW;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, yy - R(0.022));
        ctx.stroke();
      }
    }
    ctx.restore();
    // 굴뚝 관
    ctx.fillStyle = mix('#6a6a72', '#2a2a30', night * 0.4);
    ctx.fillRect(cx - R(0.018), cy - hgt - R(0.1), R(0.036), R(0.1) + 4);
    // 불 아궁이 (아래)
    ctx.fillStyle = '#2a120a';
    ctx.beginPath();
    ctx.roundRect(cx - ovW * 0.3, cy - R(0.05), ovW * 0.6, R(0.04), 4);
    ctx.fill();
    ctx.shadowColor = '#ff6a00';
    ctx.shadowBlur = 8 + heat * 16;
    for (let q = 0; q < 6; q++) {
      const fl = Math.sin(s.t / (3 + q * 0.3) + q * 2) * 0.3 + 0.7, fh = R(0.03) * (0.5 + heat) * fl;
      const fxq = cx - ovW * 0.24 + (q / 5) * ovW * 0.48;
      ctx.fillStyle = q % 2 ? '#ffb030' : '#ff6a20';
      ctx.beginPath();
      ctx.moveTo(fxq - 4, cy - R(0.012));
      ctx.quadraticCurveTo(fxq - 3, cy - R(0.012) - fh * 0.6, fxq, cy - R(0.012) - fh);
      ctx.quadraticCurveTo(fxq + 3, cy - R(0.012) - fh * 0.6, fxq + 4, cy - R(0.012));
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    // 아치 입구: 안쪽이 주황빛
    const mg = ctx.createRadialGradient(mouth.x, mouth.y, 2, mouth.x, mouth.y, mouth.w * 0.7);
    mg.addColorStop(0, `rgba(255,${190 + 40 * heat},90,1)`);
    mg.addColorStop(1, `rgba(${160 + 60 * heat},50,10,1)`);
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.moveTo(mouth.x - mouth.w / 2, mouth.y + mouth.h * 0.3);
    ctx.lineTo(mouth.x - mouth.w / 2, mouth.y - mouth.h * 0.2);
    ctx.quadraticCurveTo(mouth.x - mouth.w / 2, mouth.y - mouth.h * 0.75, mouth.x, mouth.y - mouth.h * 0.75);
    ctx.quadraticCurveTo(mouth.x + mouth.w / 2, mouth.y - mouth.h * 0.75, mouth.x + mouth.w / 2, mouth.y - mouth.h * 0.2);
    ctx.lineTo(mouth.x + mouth.w / 2, mouth.y + mouth.h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mix('#e8d0b0', '#5a4a3a', night * 0.4);
    ctx.lineWidth = 3;
    ctx.stroke();
    lights.push([mouth.x, mouth.y, 0.55 + heat * 0.45, R(0.3)]);
    // 둘째 오븐 (4일째 밤에 산다)
    if (s.ups >= 3) {
      const [qx, qy] = P(0.42, 0.93, 0), qw = R(0.13);
      ctx.fillStyle = 'rgba(40,20,10,.25)';
      ctx.beginPath();
      ctx.ellipse(qx + 4, qy + 2, qw * 0.55, R(0.018), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = mix('#6a6a78', '#22222a', night * 0.4);
      ctx.beginPath();
      ctx.roundRect(qx - qw / 2, qy - R(0.15), qw, R(0.15), 6);
      ctx.fill();
      ctx.fillStyle = mix('#8a8a98', '#2a2a32', night * 0.4);
      ctx.fillRect(qx - qw / 2, qy - R(0.15), qw, R(0.02));
      const gl2 = ctx.createLinearGradient(0, qy - R(0.12), 0, qy - R(0.04));
      gl2.addColorStop(0, '#ffcf6a');
      gl2.addColorStop(1, '#ff7a2a');
      ctx.fillStyle = gl2;
      ctx.beginPath();
      ctx.roundRect(qx - qw * 0.36, qy - R(0.12), qw * 0.72, R(0.075), 4);
      ctx.fill();
      if (s.ready > 0 || s.charge === 0) loaf(ctx, qx, qy - R(0.05), R(0.05), s.tray[0] ?? 0, 0.15);
      lights.push([qx, qy - R(0.08), 0.6, R(0.18)]);
    }
  }
  // 반죽 (오븐 속, 누를수록 부푼다 — 점선은 지금 창가 손님이 원하는 크기)
  const sizeW = (bb: number) => R(0.035 + bb * 0.03);
  const tgt = (() => {
    const tk = taker(s);
    if (tk) return tk;
    let best: Cust | null = null;
    for (const c of s.custs) if (!c.res && c.x < SPOT && (!best || c.x > best.x)) best = c;
    return best;
  })();
  {
    const bx = mouth.x, by = mouth.y + mouth.h * 0.28;
    if (tgt && s.phase === 'day') {
      ctx.save();
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.25 * Math.sin(s.t / 5)})`;
      ctx.lineWidth = 2;
      const Wt = sizeW(tgt.want), Ht = Wt * (s.dough === 2 ? 0.32 : s.dough === 1 ? 0.5 : 0.68);
      ctx.beginPath();
      ctx.ellipse(bx, by - Ht * 0.55, Wt / 2 + 2, Ht * 0.6 + 2, 0, Math.PI, TAU);
      ctx.stroke();
      ctx.restore();
    }
    if (s.phase === 'day' && s.ready === 0) {
      const bb = Math.max(0.35, s.b), wob = s.charge > 0 ? 1 + Math.sin(s.t * 0.8) * 0.015 * (1 + p * 3) : 1;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(wob, 2 - wob);
      loaf(ctx, 0, 0, sizeW(bb), s.dough, Math.min(1.5, s.b / 3.4));
      ctx.restore();
      if (p > 0.82) {
        // 터지기 직전: 금이 가고 김이 샌다
        ctx.strokeStyle = '#fff4c0';
        ctx.lineWidth = 1.5;
        const Wb = sizeW(bb);
        for (let q = 0; q < 3; q++) {
          ctx.beginPath();
          ctx.moveTo(bx - Wb * 0.3 + q * Wb * 0.3, by - Wb * 0.5);
          ctx.lineTo(bx - Wb * 0.25 + q * Wb * 0.3 + Math.sin(s.t + q) * 2, by - Wb * 0.62);
          ctx.stroke();
        }
      }
    }
  }
  // 부풀기 게이지 (오븐 왼쪽): 크기 1~5 칸 + 맨 위 펑
  {
    const gx = OX + R(0.075), gy0 = P(0, 0.62, 0.02)[1], gh = R(0.3), gw = R(0.05);
    const yOf = (bb: number) => gy0 - (bb / BMAX) * gh;
    ctx.fillStyle = 'rgba(40,20,10,.55)';
    ctx.beginPath();
    ctx.roundRect(gx - gw / 2 - 3, gy0 - gh - 3, gw + 6, gh + 6, 6);
    ctx.fill();
    for (let L = 1; L <= 5; L++) {
      const y0 = yOf(L - 0.5), y1 = yOf(L + 0.5), hit = tgt && tgt.want === L && s.phase === 'day';
      ctx.fillStyle = hit ? '#ffd23f' : L % 2 ? 'rgba(255,240,220,.22)' : 'rgba(255,240,220,.12)';
      ctx.fillRect(gx - gw / 2, y1, gw, y0 - y1);
    }
    ctx.fillStyle = '#ff4a3a';
    ctx.fillRect(gx - gw / 2, yOf(BMAX), gw, yOf(5.5) - yOf(BMAX));
    if (s.b > 0) {
      const gg = ctx.createLinearGradient(0, gy0, 0, gy0 - gh);
      gg.addColorStop(0, '#f6e2b0');
      gg.addColorStop(0.7, '#e9a14a');
      gg.addColorStop(1, '#b0401a');
      ctx.fillStyle = gg;
      ctx.shadowColor = '#ff8a2a';
      ctx.shadowBlur = 6 + p * 10;
      ctx.fillRect(gx - gw * 0.3, yOf(s.b), gw * 0.6, gy0 - yOf(s.b));
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(gx - gw / 2 - 2, yOf(s.b) - 1.5, gw + 4, 3);
    }
    ctx.font = `800 ${F(0.032)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let L = 1; L <= 5; L++) {
      ctx.fillStyle = tgt && tgt.want === L && s.phase === 'day' ? '#3a2208' : 'rgba(255,255,255,.85)';
      ctx.fillText(String(L), gx, yOf(L));
    }
    ctx.font = `900 ${F(0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('💥', gx, yOf(BMAX) - R(0.025));
    if (tgt && s.phase === 'day') emo(ctx, tgt.e, gx + gw / 2 + R(0.028), yOf(tgt.want), R(0.04));
  }
  // ── 곰 아저씨 ──
  const bearAt = P(0.4, 0.6, 0);
  {
    const aPop = age('pop'), aPull = age('pull'), aSteal = age('stolen'), aJust = Math.min(age('just'), age('good')), aBad = Math.min(age('droop'), age('big'), age('ground'));
    let mood: Mood = 'idle';
    if (s.phase === 'night') mood = s.retry ? 'sad' : 'dance';
    else if (aPop < 55) mood = 'shock';
    else if (s.charge > 0) mood = p > 0.82 ? 'panic' : 'focus';
    else if (aPull < 14) mood = 'swing';
    else if (aSteal < 50) mood = 'angry';
    else if (aJust < 45) mood = 'proud';
    else if (aBad < 45) mood = 'oops';
    const flour = aPop < 90 ? 1 - aPop / 90 : 0;
    const look = s.charge > 0 ? -1 : tgt ? 1 : 0;
    drawBear(ctx, bearAt[0], bearAt[1], R(0.24), mood, s.t, s.charge > 0 ? p : mood === 'oops' ? 0.4 : 0, flour, look);
    const hy = bearAt[1] - R(0.24) * 1.2;
    if (mood === 'shock') shout(bearAt[0], hy, '펑?!', '#e8202a');
    else if (mood === 'panic') shout(bearAt[0] + R(0.02), hy, '으으…', '#e86a20', F(0.036));
    else if (mood === 'proud') bubble(ctx, bearAt[0] + R(0.03), hy + 4, '흠흠!', F(0.033));
    else if (mood === 'angry') bubble(ctx, bearAt[0] + R(0.03), hy + 4, '이 녀석!', R(0.033), '#c02020');
    else if (mood === 'oops') bubble(ctx, bearAt[0] + R(0.03), hy + 4, '어라…', F(0.033));
    else if (mood === 'swing') shout(bearAt[0] + R(0.06), hy + 8, '영차!', '#c86a10', F(0.036));
  }
  // ── 카운터 + 진열장 + 고양이 ──
  {
    const cx0 = 0.5, cx1 = 0.79, cy0 = 0.36, cy1 = 0.47, cz = 0.11;
    poly([P(cx0, cy1, cz), P(cx1, cy1, cz), P(cx1, cy0, cz), P(cx0, cy0, cz)], mix('#e8c08a', '#4a3420', night * 0.5));
    poly([P(cx1, cy0, 0), P(cx1, cy1, 0), P(cx1, cy1, cz), P(cx1, cy0, cz)], mix('#8a5630', '#2a1a10', night * 0.5));
    poly([P(cx0, cy0, 0), P(cx1, cy0, 0), P(cx1, cy0, cz), P(cx0, cy0, cz)], mix('#b07040', '#3a2416', night * 0.5));
    // 유리 진열장
    const g0 = P(cx0 + 0.03, cy0, 0.025), g1 = P(cx1 - 0.03, cy0, cz - 0.015);
    ctx.fillStyle = mix('#fff2d8', '#4a4038', night * 0.4);
    ctx.fillRect(g0[0], g1[1], g1[0] - g0[0], g0[1] - g1[1]);
    for (let q = 0; q < 5; q++) loaf(ctx, g0[0] + 10 + q * ((g1[0] - g0[0] - 20) / 4), g0[1] - 2, R(0.032), (q + 1) % 3, 1.05);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(g0[0] + 6, g1[1]);
    ctx.lineTo(g0[0] + 16, g1[1]);
    ctx.lineTo(g0[0] + 4, g0[1]);
    ctx.lineTo(g0[0] - 6 + 6, g0[1]);
    ctx.fill();
    ctx.strokeStyle = mix('#8a5630', '#2a1a10', night * 0.5);
    ctx.lineWidth = 2;
    ctx.strokeRect(g0[0], g1[1], g1[0] - g0[0], g0[1] - g1[1]);
    // 고양이
    const cxw = catAt(s, s.dayT);
    if (s.phase === 'day' && cxw !== null) {
      const [kx, ky] = P(cxw, 0.42, cz);
      const sitting = Math.abs(cxw - SPOT) < 0.001, walkL = false;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(kx, ky, R(0.03), R(0.008), 0, 0, TAU);
      ctx.fill();
      emo(ctx, '🐈', kx, ky - R(0.03) - (sitting ? 0 : Math.abs(Math.sin(s.t / 6)) * 2), R(0.075), !walkL);
      if (catBlocks(s, s.dayT)) {
        if (s.charge > 0) shout(kx, ky - R(0.075), '냥?', '#e8202a', F(0.036));
        else if (sitting && s.t % 80 < 40) bubble(ctx, kx + R(0.02), ky - R(0.09), '…zZ', F(0.028));
      }
    } else if (s.phase === 'day' && s.day >= 1 && s.dayT >= s.catAway) {
      // 낮잠 바구니
      const [kx, ky] = P(0.88, 0.32, 0);
      ctx.fillStyle = mix('#c08a50', '#3a2818', night * 0.5);
      ctx.beginPath();
      ctx.ellipse(kx, ky, R(0.04), R(0.016), 0, 0, Math.PI);
      ctx.fill();
      emo(ctx, '🐈', kx, ky - R(0.015), R(0.05));
      ctx.font = `800 ${F(0.03)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText('z', kx + R(0.03), ky - R(0.04) - (s.t % 60) * 0.15);
    }
  }
  // ── 천장 + 지붕 ──
  {
    const z0 = HB, z1 = HB + CT, rx0 = 0.0, rx1 = 0.83, ry0 = 0.3;
    // 지붕 윗면 (기와)
    poly([P(rx0, ry0, z1), P(rx1, ry0, z1), P(rx1, 1.02, z1), P(rx0, 1.02, z1)], mix('#c8583e', '#3a1814', night * 0.5));
    ctx.strokeStyle = mix('#a8402a', '#2a100c', night * 0.5);
    ctx.lineWidth = 1;
    for (let q = 1; q < 6; q++) (ctx.beginPath(), ctx.moveTo(...P(rx0, ry0 + q * 0.12, z1)), ctx.lineTo(...P(rx1, ry0 + q * 0.12, z1)), ctx.stroke());
    for (let q = 0; q < 18; q++)
      for (let r2 = 0; r2 < 6; r2++) {
        const [x, y] = P(rx0 + ((q + (r2 % 2) * 0.5) / 18) * (rx1 - rx0), ry0 + r2 * 0.12 + 0.06, z1);
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x, y + 3);
        ctx.stroke();
      }
    // 옆면
    poly([P(rx1, ry0, z0), P(rx1, 1.02, z0), P(rx1, 1.02, z1), P(rx1, ry0, z1)], mix('#8a3a24', '#200c08', night * 0.5));
    // 잘린 앞면: 회반죽 · 들보 · 기와
    poly([P(rx0, ry0, z0), P(rx1, ry0, z0), P(rx1, ry0, z1), P(rx0, ry0, z1)], mix('#7a4a2a', '#24140c', night * 0.5));
    poly([P(rx0, ry0, z0), P(rx1, ry0, z0), P(rx1, ry0, z0 + 0.015), P(rx0, ry0, z0 + 0.015)], mix('#f4e4cc', '#5a4a40', night * 0.5));
    poly([P(rx0, ry0, z1 - 0.012), P(rx1, ry0, z1 - 0.012), P(rx1, ry0, z1), P(rx0, ry0, z1)], mix('#d8644a', '#401a14', night * 0.5));
    // 굴뚝: 누르는 동안 연기가 뭉게뭉게
    const [chx, chy] = P(0.17, 0.85, z1);
    poly([[chx - R(0.025), chy], [chx + R(0.025), chy], [chx + R(0.025), chy - R(0.07)], [chx - R(0.025), chy - R(0.07)]], mix('#a84a34', '#301410', night * 0.5));
    ctx.fillStyle = mix('#7a3424', '#200c08', night * 0.5);
    ctx.fillRect(chx - R(0.03), chy - R(0.08), R(0.06), R(0.015));
    for (let q = 0; q < 5; q++) {
      const ph = ((s.t * (1 + heat) + q * 22) % 110) / 110;
      ctx.fillStyle = `rgba(${s.charge > 0 ? '235,235,240' : '225,225,230'},${(0.3 + heat * 0.4) * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(chx + Math.sin(ph * 5 + q) * 5 + ph * 14, chy - R(0.09) - ph * R(0.13), 3 + ph * (6 + heat * 8), 0, TAU);
      ctx.fill();
    }
    // 간판 (1일째 밤에 단다)
    if (s.ups >= 1) {
      const [sx, sy] = P(0.6, ry0, z1);
      const bw = R(0.32), bh = R(0.065);
      ctx.strokeStyle = '#5a3a20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - bw * 0.35, sy);
      ctx.lineTo(sx - bw * 0.35, sy - R(0.02));
      ctx.moveTo(sx + bw * 0.35, sy);
      ctx.lineTo(sx + bw * 0.35, sy - R(0.02));
      ctx.stroke();
      ctx.fillStyle = mix('#7a4a24', '#2a180c', night * 0.3);
      ctx.beginPath();
      ctx.roundRect(sx - bw / 2, sy - R(0.02) - bh, bw, bh, 6);
      ctx.fill();
      ctx.strokeStyle = '#e9c27a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = `900 ${F(0.036)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = dusk > 0.15 ? '#ffe9a0' : '#ffe2b0';
      if (dusk > 0.15) (ctx.shadowColor = '#ffd060'), (ctx.shadowBlur = 8);
      ctx.fillText('🍞 곰 아저씨 빵집', sx, sy - R(0.02) - bh / 2 + 1);
      ctx.shadowBlur = 0;
    }
    // 천장에 붙은 빵 (펑!): 대롱대롱
    for (const c of s.ceil) {
      const [x1, y1] = P(c.x, ry0, z0), ag = s.t - c.t;
      if (ag < 10) {
        // 오븐에서 천장으로 슝
        const q = ag / 10, x = mouth.x + (x1 - mouth.x) * q, y = mouth.y + (y1 - mouth.y) * q - Math.sin(q * Math.PI) * R(0.04);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(q * TAU * 1.5);
        loaf(ctx, 0, 0, sizeW(Math.min(5, c.b)) * 0.8, c.dough, 1.2);
        ctx.restore();
        continue;
      }
      const x = x1, y = y1;
      // 철썩 자국
      ctx.fillStyle = mix('#f2d8a8', '#5a4a3a', night * 0.5);
      for (let q = 0; q < 6; q++) (ctx.beginPath(), ctx.arc(x + Math.cos(q * 1.1 + c.rot) * R(0.03), y + 2 + Math.abs(Math.sin(q * 1.7)) * 3, R(0.006) + hsh(q + c.t) * R(0.008), 0, TAU), ctx.fill());
      const sway = Math.sin(s.t / 25 + c.x * 20) * 0.12 + (ag < 40 ? Math.sin(ag * 0.6) * (1 - ag / 40) * 0.6 : 0);
      ctx.save();
      ctx.translate(x, y + 2);
      ctx.rotate(Math.PI + c.rot + sway);
      loaf(ctx, 0, 0, sizeW(Math.min(5, c.b)) * 0.75, c.dough, 1.25);
      ctx.restore();
      if (ag < 70) {
        ctx.fillStyle = `rgba(255,255,255,${0.7 * (1 - ag / 70)})`;
        for (let q = 0; q < 4; q++) (ctx.beginPath(), ctx.arc(x + (q - 1.5) * 6, y + 4 + ag * 0.2 + q * 2, 3 + ag * 0.05, 0, TAU), ctx.fill());
      }
    }
    // 매달린 전등
    for (const lx of [0.3, 0.62]) {
      const [x, y] = P(lx, 0.62, z0);
      ctx.strokeStyle = 'rgba(60,40,30,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + R(0.035));
      ctx.stroke();
      ctx.fillStyle = mix('#3a6a5a', '#1a2a24', night * 0.4);
      ctx.beginPath();
      ctx.moveTo(x - R(0.022), y + R(0.05));
      ctx.lineTo(x + R(0.022), y + R(0.05));
      ctx.lineTo(x + R(0.008), y + R(0.035));
      ctx.lineTo(x - R(0.008), y + R(0.035));
      ctx.fill();
      ctx.fillStyle = dusk > 0.1 ? '#fff0b0' : '#f4e8c8';
      ctx.beginPath();
      ctx.arc(x, y + R(0.053), R(0.008), 0, TAU);
      ctx.fill();
      lights.push([x, y + R(0.06), 0.8, R(0.16)]);
    }
  }
  // 오른쪽 벽 (바깥 면)
  {
    const z = HB;
    poly([P(BX1, BY0, 0), P(BX1, 1, 0), P(BX1, 1, z), P(BX1, BY0, z)], mix('#f0d8b4', '#4a3a30', night * 0.55 + dusk * 0.2));
    poly([P(BX1, BY0, 0), P(BX1, 1, 0), P(BX1, 1, z), P(BX1, BY0, z)], 'rgba(0,0,0,.12)');
    poly([P(BX1 - 0.012, BY0, 0), P(BX1, BY0, 0), P(BX1, BY0, z), P(BX1 - 0.012, BY0, z)], mix('#d8b88c', '#3a2a20', night * 0.5));
    // 옆 창문
    const wq = [P(BX1, 0.55, 0.14), P(BX1, 0.8, 0.14), P(BX1, 0.8, 0.3), P(BX1, 0.55, 0.3)];
    poly(wq, dusk > 0.15 ? `rgba(255,214,120,${0.6 + dusk * 0.4})` : mix('#9ad0f0', '#2a3450', night));
    ctx.strokeStyle = mix('#8a5a30', '#2a1a10', night * 0.5);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(...wq[0]);
    for (const q of wq) ctx.lineTo(...q);
    ctx.closePath();
    ctx.stroke();
    if (dusk > 0.15) lights.push([(wq[0][0] + wq[2][0]) / 2, (wq[0][1] + wq[2][1]) / 2, 0.7, R(0.1)]);
  }
  // ── 테라스 (2일째 밤에) ──
  if (s.ups >= 2) {
    poly([P(0.84, 0.4, 0.005), P(0.99, 0.4, 0.005), P(0.99, 0.96, 0.005), P(0.84, 0.96, 0.005)], mix('#c89a62', '#3a2a18', night * 0.5));
    ctx.strokeStyle = mix('#a8784a', '#2a1c10', night * 0.5);
    ctx.lineWidth = 1;
    for (let q = 1; q < 5; q++) (ctx.beginPath(), ctx.moveTo(...P(0.84, 0.4 + q * 0.112, 0.005)), ctx.lineTo(...P(0.99, 0.4 + q * 0.112, 0.005)), ctx.stroke());
    const seats = [[0.915, 0.84], [0.915, 0.54]];
    for (let q = 0; q < seats.length; q++) {
      const [tx, ty] = P(seats[q][0], seats[q][1], 0), col = q ? '#4a9ad8' : '#e8504a';
      ctx.fillStyle = 'rgba(40,20,10,.22)';
      ctx.beginPath();
      ctx.ellipse(tx + 5, ty, R(0.055), R(0.014), 0, 0, TAU);
      ctx.fill();
      // 손님 (앉아서 오물오물)
      for (let sd = 0; sd < 2; sd++) {
        const e = s.seats[q * 2 + sd];
        if (!e) continue;
        const ex = tx + (sd ? 1 : -1) * R(0.042), munch = Math.abs(Math.sin(s.t / 7 + q * 2 + sd)) * 2;
        emo(ctx, e, ex, ty - R(0.032) - munch, R(0.06), sd === 0);
      }
      // 탁자 + 파라솔
      ctx.fillStyle = mix('#8a5a34', '#2a1a10', night * 0.5);
      ctx.fillRect(tx - 1.5, ty - R(0.05), 3, R(0.05));
      ctx.fillStyle = mix('#fff6e8', '#7a7468', night * 0.5);
      ctx.beginPath();
      ctx.ellipse(tx, ty - R(0.05), R(0.035), R(0.01), 0, 0, TAU);
      ctx.fill();
      loaf(ctx, tx, ty - R(0.052), R(0.026), q % 3, 1.1);
      ctx.strokeStyle = '#6a4a30';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty - R(0.05));
      ctx.lineTo(tx, ty - R(0.14));
      ctx.stroke();
      const py = ty - R(0.14), pr = R(0.065);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(tx - pr, py + R(0.02));
      ctx.quadraticCurveTo(tx - pr * 0.8, py - R(0.03), tx, py - R(0.035));
      ctx.quadraticCurveTo(tx + pr * 0.8, py - R(0.03), tx + pr, py + R(0.02));
      ctx.closePath();
      ctx.fillStyle = mix(col, '#2a2a3a', night * 0.4);
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = mix('#ffffff', '#6a6a7a', night * 0.4);
      for (const k of [-0.55, 0, 0.55]) {
        ctx.beginPath();
        ctx.moveTo(tx, py - R(0.04));
        ctx.lineTo(tx + (k - 0.12) * pr * 1.3, py + R(0.03));
        ctx.lineTo(tx + (k + 0.12) * pr * 1.3, py + R(0.03));
        ctx.fill();
      }
      ctx.restore();
    }
  }
  // ── 꽃길·가로등 (4일째 밤) ──
  if (s.ups >= 4) {
    for (let q = 0; q < 6; q++) {
      const [x, y] = P(0.04 + q * 0.15, 0.31, 0);
      ctx.fillStyle = mix('#9a6236', '#2a1a10', night * 0.5);
      ctx.fillRect(x - R(0.03), y - R(0.015), R(0.06), R(0.015));
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = mix(['#ff6a8a', '#ffd23f', '#ff9a4a', '#c87aff'][(q + k) % 4], '#3a2a3a', night * 0.4);
        ctx.beginPath();
        ctx.arc(x - R(0.022) + k * R(0.015), y - R(0.02) - (k % 2) * 2, 2.5, 0, TAU);
        ctx.fill();
      }
    }
    const [lx, ly] = P(0.015, 0.12, 0);
    ctx.strokeStyle = '#3a3a44';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(lx, ly - R(0.26));
    ctx.stroke();
    ctx.fillStyle = dusk > 0.1 ? '#fff0a0' : '#e8e4d0';
    ctx.beginPath();
    ctx.arc(lx, ly - R(0.27), R(0.018), 0, TAU);
    ctx.fill();
    lights.push([lx, ly - R(0.27), 1, R(0.22)]);
  }
  // ── 축제 등불 (5일째 밤) ──
  if (s.ups >= 5) {
    const [x0, y0] = P(0.0, 0.3, HB + CT), [x1, y1] = P(0.83, 0.3, HB + CT);
    ctx.strokeStyle = 'rgba(60,40,30,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + 2);
    ctx.quadraticCurveTo((x0 + x1) / 2, y0 + R(0.05), x1, y1 + 2);
    ctx.stroke();
    for (let q = 1; q < 9; q++) {
      const tq = q / 9, x = x0 + (x1 - x0) * tq, y = y0 + 2 + 4 * tq * (1 - tq) * R(0.05) * 0.5 + R(0.012);
      ctx.fillStyle = ['#ff5a4a', '#ffcf3a', '#5ac8ff', '#ff8ad8'][q % 4];
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = dusk > 0.1 ? 10 : 0;
      ctx.beginPath();
      ctx.ellipse(x, y, R(0.012), R(0.016), 0, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      lights.push([x, y, 0.6, R(0.06)]);
    }
  }
  // ── 손님 (가게 앞 돌길) ──
  // 빵을 받은 손님은 뒷줄(가게 쪽)로 한 걸음 비켜서 먹는다
  const laneOf = (c: Cust) => (c.res && c.res !== MISS ? 0.155 + 0.09 * Math.min(1, (s.t - c.land + FLY) / 10) : 0.155);
  const custXY = (c: Cust): [number, number] => P(c.x, laneOf(c), 0);
  const sorted = [...s.custs].sort((p1, p2) => laneOf(p2) - laneOf(p1) || p1.x - p2.x);
  const CS = R(0.1);
  for (const c of sorted) {
    if (s.phase === 'night' || (c.wt < 0 && s.ups >= 2)) continue; // 문 닫음 · 테라스에 앉았다
    const [x, y] = custXY(c), ag = c.land ? s.t - c.land : -1, landed = c.res && ag >= 0;
    const walking = !(c.type === FIRST && c.wt > 0 && c.x >= SPOT - 0.004) && !(landed && ag < 30 && c.res >= GOOD);
    const hop = walking ? Math.abs(Math.sin(s.t / (c.type === RUSH ? 3 : 7) + c.id)) * (c.type === RUSH ? 6 : c.res >= GOOD && landed ? 5 : 2.5) : 0;
    ctx.fillStyle = 'rgba(40,20,10,.25)';
    ctx.beginPath();
    ctx.ellipse(x, y, CS * 0.4, CS * 0.1, 0, 0, TAU);
    ctx.fill();
    let sx = 1, sy = 1, rot = 0;
    if (landed && c.res >= GOOD && c.stay > 0) (sx = 1.38 + 0.08 * Math.sin(ag / 3)), (sy = 1.1 - 0.05 * Math.sin(ag / 3));
    if (landed && c.res === BIG) (sy = 0.78 + 0.04 * Math.sin(s.t / 4)), (sx = 1.12), (rot = Math.sin(s.t / 6) * 0.15);
    ctx.save();
    ctx.translate(x, y - hop);
    ctx.rotate(rot);
    ctx.scale(sx, sy);
    emo(ctx, c.e, 0, -CS * 0.55, CS, true);
    if (c.type === VIP) emo(ctx, '👑', 0, -CS * 1.15, CS * 0.45);
    // 볼 빵빵
    if (landed && c.res >= GOOD && c.stay > 0) {
      // 볼 빵빵: 얼굴이 옆으로 빵빵하게 부풀어 오물오물 + 부스러기 + 하트
      ctx.fillStyle = '#e9a14a';
      for (let q = 0; q < 3; q++) {
        const ph = ((ag + q * 9) % 26) / 26;
        ctx.beginPath();
        ctx.arc((q - 1) * CS * 0.15, -CS * 0.15 + ph * CS * 0.3, 1.6, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    if (landed && c.res >= GOOD && c.stay > 0)
      for (let q = 0; q < 2; q++) {
        const ph = ((ag + q * 20) % 40) / 40;
        ctx.globalAlpha = 1 - ph;
        ctx.font = `900 ${F(0.034)}px system-ui, sans-serif`;
        ctx.fillStyle = '#ff5a8a';
        ctx.textAlign = 'center';
        ctx.fillText('♥', x + (q ? 1 : -1) * CS * 0.45 + Math.sin(ph * 6) * 3, y - CS * 1.1 - ph * CS * 0.6);
        ctx.globalAlpha = 1;
      }
    // 받은 빵
    if (landed && c.res !== STOLEN && c.res !== MISS) {
      const bw = sizeW(Math.min(5.5, c.b)) * (c.res === BIG ? 0.9 : 0.6);
      if (c.res === BIG) loaf(ctx, x, y - hop - CS * 0.95 * sy, bw, c.dough, Math.min(1.25, c.b / 3.4));
      else if (c.res >= GOOD && c.stay > 0) loaf(ctx, x + CS * 0.42, y - CS * 0.22, bw * (1 - 0.3 * Math.min(1, ag / 75)), c.dough, Math.min(1.25, c.b / 3.4));
      else if (c.res >= GOOD) loaf(ctx, x + CS * 0.12, y - hop - CS * 1.05, bw * 0.7, c.dough, Math.min(1.25, c.b / 3.4));
      else {
        // 축 처진 빵: 머리 위에 흐물흐물 늘어진다
        const sag = Math.min(1, ag / 14);
        loaf(ctx, x, y - CS * 0.98 * (1 - 0.06 * sag), sizeW(Math.max(2, c.want)) * 0.85, c.dough, Math.min(0.5, c.b / 3.4), 0.4 + 0.6 * sag);
        if (ag % 40 < 30) bubble(ctx, x + CS * 0.75, y - CS * 1.25, '애걔…', F(0.03));
      }
    }
    // 말풍선: 원하는 크기
    if (!c.res && c.x > -0.03) {
      const fick = c.type === FICKLE && !c.flipped, show = fick && Math.floor(s.t / 24) % 2 ? c.alt : c.want;
      const bx = x - CS * 0.15, by = y - CS * 1.35 - (c.type === VIP ? CS * 0.3 : 0), bw = R(0.115), bh = R(0.085);
      const near = inZone(c);
      ctx.fillStyle = near ? '#fff4c0' : 'rgba(255,255,255,.93)';
      ctx.strokeStyle = near ? '#e89a20' : 'rgba(120,90,60,.5)';
      ctx.lineWidth = near ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(bx - bw / 2, by - bh, bw, bh, 8);
      ctx.moveTo(bx - 3, by);
      ctx.lineTo(bx + 2, by + 6);
      ctx.lineTo(bx + 5, by);
      ctx.fill();
      ctx.stroke();
      loaf(ctx, bx - bw * 0.16, by - bh * 0.2, R(0.012 + show * 0.008), 0, 1);
      ctx.font = `900 ${F(0.04)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = show >= 5 ? '#d02020' : '#4a2a10';
      ctx.fillText(fick ? `${show}?` : String(show), bx + bw * 0.25, by - bh * 0.5);
      if (c.type === RUSH) shout(bx + bw * 0.55, by - bh + 4, '급해!', '#e86a20', F(0.03));
    }
    // 반응 글자
    if (landed && ag < 60) {
      if (c.res === STOLEN) bubble(ctx, x, y - CS * 1.45, '어…?', F(0.032));
      else if (c.res === MISS && ag < 40) {
        ctx.font = `800 ${F(0.03)}px system-ui, sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.textAlign = 'center';
        ctx.fillText('흥…', x, y - CS * 1.3 - ag * 0.2);
      }
    }
    if (c.type === FIRST && !c.res && c.x >= SPOT - 0.004) bubble(ctx, x + CS * 1.15, y - CS * 1.55, '빵 주세요!', F(0.032));
  }
  // ── 날아가는 빵 ──
  for (const fl of s.flights) {
    const ag = s.t - fl.t0, dur = fl.land - fl.t0;
    if (ag >= dur) {
      if (fl.to === -1 && ag < dur + 60) {
        // 아무도 없으면 길에 툭 — 비둘기가 쪼아 먹는다
        const [x, y] = P(SPOT, 0.12, 0);
        loaf(ctx, x, y, sizeW(Math.min(5, fl.b)) * 0.5, fl.dough, 1, 0.3);
        emo(ctx, '🐦', x + R(0.05) - Math.min(R(0.03), (ag - dur) * 0.6), y - R(0.02) - (Math.floor(s.t / 5) % 2) * 2, R(0.05), true);
      }
      continue;
    }
    const q = ag / dur, from: [number, number] = [mouth.x, mouth.y];
    const c = s.custs.find((c2) => c2.id === fl.to);
    const to: [number, number] = fl.to === -2 ? P(SPOT, 0.42, 0.18) : c ? [custXY(c)[0], custXY(c)[1] - CS * 0.9] : P(SPOT, 0.12, 0);
    const x = from[0] + (to[0] - from[0]) * q, y = from[1] + (to[1] - from[1]) * q - Math.sin(q * Math.PI) * R(0.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(q * TAU * 0.75);
    loaf(ctx, 0, sizeW(fl.b) * 0.3, sizeW(Math.min(5.5, fl.b)) * 0.8, fl.dough, Math.min(1.5, fl.b / 3.4));
    ctx.restore();
  }
  // 빵 훔친 고양이: 지붕 위에서 냠냠
  if (s.phase === 'day' && s.day >= 1 && s.dayT < s.catAway) {
    const [rx, ry] = P(0.72, 0.6, HB + CT), ag = s.catAway - s.dayT;
    emo(ctx, '🐈', rx, ry - R(0.03), R(0.07), true);
    loaf(ctx, rx - R(0.035), ry - R(0.01), R(0.035), 0, 1.1);
    if (ag > 160) shout(rx, ry - R(0.07), '냠냠♪', '#e86a20', F(0.032));
  }
  // ── 저녁·밤 빛 ──
  if (dusk > 0.01) {
    ctx.fillStyle = `rgba(20,14,48,${dusk})`;
    ctx.fillRect(-12, -12, w + 24, h + 24);
  }
  ctx.globalCompositeOperation = 'lighter';
  if (dusk > 0.05) {
    // 해가 지면 가게 안이 노랗게 빛난다
    ctx.save();
    ctx.beginPath();
    const fo = [P(BX0, BY0, 0), P(BX1, BY0, 0), P(BX1, BY0, HB), P(BX0, BY0, HB)], bk = [P(BX0, 1, 0), P(BX1, 1, 0), P(BX1, 1, HB), P(BX0, 1, HB)];
    for (const qd of [fo, bk]) {
      ctx.moveTo(...qd[0]);
      for (const pt of qd) ctx.lineTo(...pt);
      ctx.closePath();
    }
    ctx.clip();
    const [rcx, rcy] = P(0.35, 0.7, 0.15), ig = ctx.createRadialGradient(rcx, rcy, R(0.04), rcx, rcy, R(0.5));
    ig.addColorStop(0, `rgba(255,190,100,${dusk * 0.75})`);
    ig.addColorStop(1, `rgba(255,140,60,${dusk * 0.25})`);
    ctx.fillStyle = ig;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  for (const [x, y, al, r] of lights) {
    const k = al * (0.18 + dusk * 1.1);
    const gl = ctx.createRadialGradient(x, y, 0, x, y, r);
    gl.addColorStop(0, `rgba(255,170,70,${Math.min(0.8, k)})`);
    gl.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  // ── 누르는 중: 지금 떼면? ──
  if (s.charge > 0 && s.phase === 'day') {
    const tk = taker(s), cat = catBlocks(s, s.dayT);
    let msg = '아무도 없어요', col = '#d8d8d8';
    if (cat) (msg = '🐈 고양이가 채 가요!'), (col = '#ff9a8a');
    else if (tk) {
      const [res, pay] = judge(s.b, tk.want, tk.type);
      if (res >= GOOD) (msg = `${tk.e} ${res === JUST ? '딱 좋아!' : '좋아!'} +${pay}🪙`), (col = '#aaff8a');
      else if (res === BIG) (msg = `${tk.e} 너무 커요!`), (col = '#ffb07a');
      else (msg = `${tk.e} 아직 작아요 (${Math.max(1, Math.round(s.b * 10) / 10)}/${tk.want})`), (col = '#fff2b0');
    } else if (tgt) msg = `${tgt.e} 오는 중… ${SIZE_NAME[tgt.want]}`;
    const [mx, my] = P(0.3, 0.6, HB - 0.03);
    ctx.font = `900 ${F(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(msg).width + 16;
    ctx.fillStyle = 'rgba(30,16,10,.7)';
    ctx.beginPath();
    ctx.roundRect(mx - tw / 2, my - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.fillStyle = col;
    ctx.fillText(msg, mx, my + 1);
    if (s.t % 6 === 0) fx.kick(0.5 + p * 2.5);
  }
  // 어젯밤 새로 산 것: 반짝 + NEW
  if (s.ups > 0 && s.ups < UPS.length && s.t - s.upT < NIGHT + 220) {
    const u = UPS[s.ups - 1], [ux, uy] = P(u.x, u.y, u.z), pl = 0.5 + 0.5 * Math.sin(s.t / 5);
    ctx.strokeStyle = `rgba(255,236,140,${0.5 + 0.5 * pl})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(ux, uy, R(0.06) + pl * R(0.012), 0, TAU);
    ctx.stroke();
    shout(ux + R(0.06), uy - R(0.04), 'NEW!', '#ff7a1a', F(0.034));
    if (s.t % 9 === 0) fx.burst(ux, uy, '#fff0a0', 3, 1.5, 1.8);
  }
  // 마지막 밤: 불꽃놀이
  if (s.phase === 'night' && s.day === DAYS - 1 && !s.retry && s.t - (fx.memo.fw ?? -99) >= 16) {
    fx.memo.fw = s.t;
    const fxx = w * (0.15 + hsh(s.t) * 0.7), fyy = top + R(0.05) + hsh(s.t + 7) * R(0.15), col = ['#ff6a8a', '#ffd23f', '#6ad0ff', '#a8ff7a'][s.t % 4];
    fx.burst(fxx, fyy, col, 30, 4, 2.5);
    fx.ring(fxx, fyy, col, R(0.1), 3);
  }
  // ── 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const [x, y] = P(e.x, 0.155, 0);
    const yy = y - CS * 1.95;
    if (e.kind === 'press') fx.burst(mouth.x, mouth.y, '#ffd27a', 8, 1.6, 2);
    if (e.kind === 'pull') fx.burst(mouth.x, mouth.y, '#ffe8b0', 14, 2.5, 2.5), fx.ring(mouth.x, mouth.y, '#ffd27a', R(0.1), 3);
    if (e.kind === 'just') fx.burst(x, yy + CS * 0.6, '#ff7aa8', 26, 3.5, 3), fx.burst(x, yy + CS * 0.6, '#ffe27a', 16, 3, 2), fx.ring(x, yy + CS * 0.6, '#ffffff', R(0.14), 4), fx.pop(x + R(0.07), yy - 6, e.text!, '#ffe27a', 18), fx.kick(4);
    if (e.kind === 'good') fx.burst(x, yy + CS * 0.6, '#ffd27a', 14, 2.5, 2.5), fx.pop(x + R(0.07), yy - 6, e.text!, '#fff2c0', 16);
    if (e.kind === 'big') fx.burst(x, yy + CS * 0.6, '#e9a14a', 16, 3, 3), fx.pop(x + R(0.07), yy - 6, e.text!, '#ffb07a', 15), fx.kick(5);
    if (e.kind === 'droop') fx.burst(x, yy + CS * 0.6, '#f6e2b0', 8, 1.5, 3), fx.pop(x + R(0.07), yy - 6, e.text!, '#e8e8e8', 15);
    if (e.kind === 'ground') fx.burst(x, y, '#d9c7a6', 10, 2, 2), fx.pop(x, yy, e.text!, '#e0e0e0', 13);
    if (e.kind === 'steal') {
      const [kx, ky] = P(SPOT, 0.42, 0.2);
      fx.burst(kx, ky, '#ffb060', 18, 3, 2.5), fx.pop(kx, ky - 10, e.text!, '#ffb060', 18), fx.kick(5);
    }
    if (e.kind === 'stolen') fx.pop(bearAt[0], bearAt[1] - R(0.3), '빵 도둑!', '#ff8a8a', 15);
    if (e.kind === 'pop') {
      fx.burst(mouth.x, mouth.y - R(0.05), '#ffffff', 40, 5, 4), fx.burst(mouth.x, mouth.y, '#e9a14a', 20, 4, 3), fx.ring(mouth.x, mouth.y, '#ffffff', R(0.25), 6);
      fx.kick(14), fx.blink('#fff6e0', 0.4), fx.pop(mouth.x + R(0.05), mouth.y - R(0.12), '펑!!', '#ff5a3a', 26);
    }
    if (e.kind === 'fickle') fx.pop(x, yy - 18, e.text!, '#ffd0a0', 14);
    if (e.kind === 'tap') fx.pop(mouth.x, mouth.y - R(0.08), e.text!, '#ffffff', 14);
    if (e.kind === 'clear') fx.burst(w / 2, h * 0.38, '#ffd23f', 60, 6, 3), fx.blink('#fff6c8', 0.25), fx.pop(w / 2, h * 0.36, e.text!, '#ffe27a', 22);
    if (e.kind === 'up') fx.ring(w / 2, h * 0.42, '#ffe08a', R(0.3), 5), fx.burst(w / 2, h * 0.42, '#ffe08a', 30, 4, 2.5);
    if (e.kind === 'fail') fx.kick(10), fx.blink('#ff4d5e', 0.25), fx.pop(w / 2, h * 0.38, e.text!, '#ff8a8a', 18);
  }
  fx.memo.t = s.t;
  ctx.restore();
  // ── HUD ──
  ctx.fillStyle = 'rgba(42,24,16,.86)';
  ctx.fillRect(0, 0, w, top);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  ctx.font = `900 ${F(0.043)}px system-ui, sans-serif`;
  ctx.fillText(`${s.phase === 'night' ? '🌙' : '☀️'} ${s.day + 1}일째 / ${DAYS}`, 10, R(0.035));
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(`★ ${s.stars}`, w * 0.6, R(0.035));
  ctx.textAlign = 'right';
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - 10, R(0.035));
  {
    const g = GOALS[s.day], bx = w * 0.27, bw = w * 0.7, by = R(0.068), bh = R(0.044), max = g[2] * 1.1;
    const at = (q: number) => bw * Math.max(0, Math.min(1, q / max));
    ctx.fillStyle = 'rgba(255,255,255,.13)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    const ok = s.coins >= g[0];
    const cg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    cg.addColorStop(0, ok ? '#7ee07a' : '#f2a541');
    cg.addColorStop(1, ok ? '#c8f07a' : '#ffd27a');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(bx, by, Math.max(bh, at(s.coins)), bh, bh / 2);
    ctx.fill();
    ctx.font = `900 ${F(0.03)}px system-ui, sans-serif`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < 3; i++) {
      const gx = bx + at(g[i]), got = s.coins >= g[i];
      ctx.fillStyle = 'rgba(40,20,10,.75)';
      ctx.fillRect(gx - 1, by, 2, bh);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(40,20,10,.8)';
      ctx.strokeText('★'.repeat(i + 1), gx - 3, by + bh / 2 + 1);
      ctx.fillStyle = got ? '#ffe23f' : 'rgba(255,255,255,.7)';
      ctx.fillText('★'.repeat(i + 1), gx - 3, by + bh / 2 + 1);
    }
    ctx.fillStyle = ok ? '#a8f08a' : '#ffffff';
    ctx.font = `900 ${F(0.038)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`🪙${s.coins}`, 10, by + bh / 2 + 1);
    ctx.font = `800 ${F(0.028)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.65)';
    ctx.fillText(ok ? '✓' : `/${g[0]}`, 10 + ctx.measureText(`🪙${s.coins}`).width * 1.36, by + bh / 2 + 2);
  }
  // 아래 띠: 다음 반죽 · 문 닫는 시계
  ctx.fillStyle = 'rgba(42,24,16,.86)';
  ctx.fillRect(0, bot, w, h - bot);
  const midY = bot + (h - bot) / 2;
  const firstHint = s.day === 0 && s.coins < 2 && s.phase === 'day';
  if (firstHint) {
    ctx.font = `900 ${F(0.04)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = s.t % 40 < 26 ? '#ffffff' : '#ffe08a';
    ctx.fillText('👆 꾹 누르면 반죽이 부풀고, 떼면 휙 꺼내요!', w / 2, midY - R(0.012));
    ctx.font = `700 ${F(0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffd27a';
    ctx.fillText('오븐 속 점선만큼 부풀면 떼요', w / 2, midY + R(0.03));
  } else {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${F(0.03)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    if (s.day >= 2) {
      ctx.fillText('반죽', 8, midY);
      const list = [s.dough, ...s.tray];
      for (let q = 0; q < list.length; q++) {
        const x = 8 + R(0.1) + q * R(0.1);
        ctx.globalAlpha = q === 0 ? 1 : 0.75;
        emo(ctx, DOUGH[list[q]].e, x, midY - R(0.006), R(q === 0 ? 0.055 : 0.042));
        ctx.font = `800 ${F(0.026)}px system-ui, sans-serif`;
        ctx.fillStyle = DOUGH[list[q]].r > 1 ? '#ff9a7a' : DOUGH[list[q]].r < 1 ? '#9ad0ff' : 'rgba(255,255,255,.8)';
        ctx.textAlign = 'center';
        ctx.fillText(DOUGH[list[q]].r > 1 ? '빠름' : DOUGH[list[q]].r < 1 ? '느림' : '보통', x, midY + R(0.032));
      }
      ctx.globalAlpha = 1;
    } else ctx.fillText(`🍞 판 빵 ${s.served}개 · 💥 ${s.pops}`, 8, midY);
    const sx0 = w * 0.5, swd = w * 0.46;
    ctx.fillStyle = 'rgba(255,255,255,.15)';
    ctx.beginPath();
    ctx.roundRect(sx0, midY - 3, swd, 6, 3);
    ctx.fill();
    const sg2 = ctx.createLinearGradient(sx0, 0, sx0 + swd, 0);
    sg2.addColorStop(0, '#ffd27a');
    sg2.addColorStop(1, '#ff6a50');
    ctx.fillStyle = sg2;
    ctx.beginPath();
    ctx.roundRect(sx0, midY - 3, swd * f, 6, 3);
    ctx.fill();
    emo(ctx, s.phase === 'night' ? '🌙' : '☀️', sx0 + swd * f, midY, R(0.04));
    ctx.font = `700 ${F(0.026)}px system-ui, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.textAlign = 'center';
    ctx.fillText(s.phase === 'night' ? (s.retry ? '내일 다시 도전' : '문 닫았어요') : '문 닫을 때까지', sx0 + swd / 2, midY + R(0.03));
  }
  // 새 소식 띠 (하늘 자리)
  let ny = top + R(0.035);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const n of s.notes.slice(-3)) {
    const ag = s.t - n.t, al = Math.min(1, (220 - ag) / 30, ag / 8);
    if (al <= 0) continue;
    ctx.globalAlpha = al;
    ctx.font = `800 ${F(0.034)}px system-ui, sans-serif`;
    const tw = ctx.measureText(n.text).width + 18;
    ctx.fillStyle = 'rgba(40,20,12,.7)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, ny - R(0.025), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = n.color;
    ctx.fillText(n.text, w / 2, ny + 1);
    ny += R(0.058);
  }
  ctx.globalAlpha = 1;
  // 밤: 오늘 결과판
  if (s.phase === 'night') {
    const bw = w * 0.7, bh = R(0.2), bx = w / 2 - bw / 2, by = bot - R(0.24);
    ctx.globalAlpha = Math.min(1, (NIGHT - s.pause) / 15);
    ctx.fillStyle = 'rgba(42,24,16,.82)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 14);
    ctx.fill();
    ctx.strokeStyle = '#e9c27a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe2b0';
    ctx.font = `900 ${F(0.045)}px system-ui, sans-serif`;
    ctx.fillText(s.retry ? '😢 손님이 모자랐어요' : `${'★'.repeat(s.dayStars)}${'☆'.repeat(3 - s.dayStars)}`, w / 2, by + bh * 0.25);
    ctx.font = `800 ${F(0.034)}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`오늘 번 돈 🪙${s.coins}`, w / 2, by + bh * 0.52);
    ctx.fillStyle = '#ffd27a';
    ctx.font = `800 ${F(0.03)}px system-ui, sans-serif`;
    ctx.fillText(s.retry ? `♥ ${s.hearts} 남음 — 같은 날 다시!` : s.ups > 0 ? `${UPS[s.ups - 1].name} 완성!` : '', w / 2, by + bh * 0.78);
    ctx.globalAlpha = 1;
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
const OFF: Input = { tap: false, dir: 0 };
const HOLD: Input = { tap: false, dir: 0, hold: true };
const dumbPlans = new WeakMap<object, { n: number; press: number; hold: number; day: number }>();

/** 못하는 봇: 아무 때나 누르고 아무만큼 누른다 */
export const bakeryRandom: Bot<BakeryState> = {
  name: '아무렇게나',
  act(s, rng) {
    if (s.phase !== 'day') return OFF;
    let m = dumbPlans.get(s);
    const key = s.day * 10 + s.hearts;
    if (!m || m.n !== s.pulls || m.day !== key) dumbPlans.set(s, (m = { n: s.pulls, press: s.dayT + 10 + Math.floor(rng() * 110), hold: 8 + Math.floor(rng() * 160), day: key }));
    if (s.charge === 0) return s.dayT >= m.press ? HOLD : OFF;
    return s.charge < m.hold ? HOLD : OFF;
  },
};

const payOf = (c: Cust) => (PRICE[c.want] + 1) * (c.type === RUSH || c.type === VIP ? 2 : 1);
interface SPlan { id: number; press: number; L: number; made: number; n: number }
const smartPlans = new WeakMap<object, SPlan | null>();
const HZ = 320;
const posBuf = new Float32Array(10 * (HZ + 1)), tk1 = new Int8Array(HZ + 4), tk2 = new Int8Array(HZ + 4), catB = new Uint8Array(HZ + 4);

/**
 * 앞날을 흉내 낸다: 손님 줄을 그대로 HZ틱 걸려 보며 틱마다 '창가 줄 맨 앞'(과 그다음) 손님을 적어 두고, 고양이가 앉는 틱도 적는다.
 * 그다음 '누구에게 · 언제 눌러 · 얼마나' 줄지를 두 손님 앞까지 겨룬다 (첫 손님에게 주면 그다음 줄 맨 앞이 받는다).
 */
function plan(s: BakeryState): SPlan | null {
  const now = s.dayT, k0 = s.ready, r0 = rateOf(s.dough), r1 = rateOf(s.day >= 2 ? s.tray[0] : 0), reload = reloadOf(s);
  const live = s.custs.filter((c) => !c.res).slice(0, 10);
  const W: Walker[] = live.map((c) => ({ x: c.x, v: c.v, type: c.type, res: 0, wt: c.wt, stay: 0 }));
  const n = W.length;
  if (!n) return null;
  for (let k = 0; k <= HZ + 3; k++) {
    let a = -1, b = -1;
    for (let i = 0; i < n; i++) {
      if (k <= HZ) posBuf[i * (HZ + 1) + k] = W[i].x;
      if (Math.abs(W[i].x - SPOT) < ZONE) {
        if (a < 0) a = i;
        else if (b < 0) b = i;
      }
    }
    tk1[k] = a;
    tk2[k] = b;
    catB[k] = catBlocks(s, now + k) ? 1 : 0;
    walkAll(W, s.day);
  }
  const takerEx = (k: number, ex: number) => (tk1[k] === ex ? tk2[k] : tk1[k]);
  /** i에게 from틱 뒤부터 반죽을 시작해 줄 수 있는 가장 이른 뗄 틱 (ex = 이미 받아 간 손님) */
  const earliest = (i: number, from: number, rate: number, ex: number): number => {
    const H = Math.round(live[i].want / rate);
    for (let k = from + H; k <= HZ; k++) {
      let ok = true;
      for (let j = 0; j < 3 && ok; j++) ok = takerEx(k + j, ex) === i && !catB[k + j];
      if (ok) return k;
    }
    return -1;
  };
  let best: SPlan | null = null, bv = 0;
  for (let i = 0; i < n; i++) {
    const c = live[i];
    // 변덕 너구리는 마음을 정할 때까지 기다린다 (사람도 그렇게 한다)
    if (c.type === FICKLE && !c.flipped) continue;
    const k = earliest(i, k0, r0, -1);
    if (k < 0 || now + k >= DAY - 2) continue;
    let v2 = 0;
    for (let j = 0; j < n; j++) {
      if (j === i || (live[j].type === FICKLE && !live[j].flipped)) continue;
      const k2 = earliest(j, k + reload, r1, i);
      if (k2 >= 0 && now + k2 < DAY - 2) v2 = Math.max(v2, payOf(live[j]) - k2 * 0.004);
    }
    const v = payOf(c) + 0.9 * v2 - k * 0.006;
    if (v > bv) (bv = v), (best = { id: c.id, press: now + k - Math.round(c.want / r0), L: c.want, made: now, n: s.pulls });
  }
  return best;
}

/** 잘하는 봇: 계획대로 미리 눌러 두고, 손님이 창가에 서고 고양이가 없을 때 빵이 딱 그 크기면 뗀다 */
export const bakerySmart: Bot<BakeryState> = {
  name: '빵집 장인',
  act(s) {
    if (s.phase !== 'day') return OFF;
    let m = smartPlans.get(s) ?? null;
    if (s.charge > 0) {
      const rate = rateOf(s.dough), bNext = s.b + rate * 3, block = catBlocks(s, s.dayT) || catBlocks(s, s.dayT + 1);
      const tc = m ? s.custs.find((c) => c.id === m!.id) : undefined;
      if (tc && !tc.res && tc.want !== m!.L) m!.L = tc.want;
      const L = m?.L ?? 3;
      const tk = taker(s);
      if (!block && tk) {
        const best = (want: number) => Math.abs(s.b - want) <= Math.abs(bNext - want);
        if (tc && tk.id === tc.id && Math.abs(s.b - L) < 0.5 && best(L)) return OFF;
        // 계획이 틀어졌거나 줄 맨 앞 손님에게 딱 맞으면 그 손님에게 준다
        if ((!tc || tc.res || tk.id !== tc.id) && Math.abs(s.b - tk.want) < (tc && !tc.res ? 0.2 : 0.4) && best(tk.want)) return OFF;
      }
      if (bNext >= BMAX - 0.05) return OFF;
      return HOLD;
    }
    if (s.ready > 0) return OFF;
    const tc = m ? s.custs.find((c) => c.id === m!.id) : undefined;
    if (!m || m.n !== s.pulls || !tc || tc.res || tc.want !== m.L || s.dayT - m.made >= 6) smartPlans.set(s, (m = plan(s)));
    return m && s.dayT >= m.press ? HOLD : OFF;
  },
};
