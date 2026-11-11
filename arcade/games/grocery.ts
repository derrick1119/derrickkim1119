/**
 * 장바구니 척척 (23라운드: 완전히 다른 장르) — 분류하기 × 스와이프.
 * 기준 9(손이 하는 일은 하나): 한 번 밀기. ← 왼쪽 봉투 · → 오른쪽 봉투 · ↓ 받침(나중에 담기 한 칸, 2번째 손님부터).
 * 와우: 계산대로 굴러오는 물건을 봉투로 휙 — 그런데 봉투 속은 쌓는 순서가 퍼즐이다. 무거운 수박을 달걀 위에 담으면 철퍼덕!
 * 규칙(결정적): 물건마다 무게가 있고, 약한 물건엔 버팀(🥚1 🍞2 …)이 있다. 담는 순간 그 봉투에서
 *   '위에 쌓인 무게 합 > 버팀'인 물건이 깨진다. 봉투가 꽉 차면(봉투 4칸 · 상자 6칸) 손님 카트로 가고 새 봉투가 온다.
 *   봉투 위에는 '이걸 담으면 🥚 철퍼덕!' 미리 보기가 뜨고, 다음 물건 둘이 벨트 위에 보인다.
 * 손님 한 명 = 한 판. 별: ★ 하나도 안 망가짐 · ★ 손님 주문 지킴 · ★ 봉투 목표 개수 안에. 망가진 게 3개가 되면 하트 -1, 그 손님을 다시.
 *   하트 셋을 다 잃거나 8손님을 다 받으면 끝. 시간 압박은 약하다: 물건은 7초 동안 벨트 끝으로 천천히 밀려가다 저절로 왼쪽 봉투로.
 * 펼쳐짐(하는 일이 바뀐다): 1 할머니(담기·주문 카드·봉투 바뀜, 깨지는 것 없음) → 2 꼬마(🥚 깨지는 것·↓ 받침: 순서 정하기)
 *   → 3 고양이(🐟 생선: 과일과 같은 봉투면 퍼덕여 튀어나옴 — 나눠 담기) → 4 펭귄(🍦 차가운 것: 따뜻한 빵과 같은 봉투면 녹음)
 *   → 5 할머니(🍉 아주 무거운 것: 약한 게 없는 봉투 바닥에) → 6 꼬마(📦 상자 6칸: 더 높이 쌓여 아래가 더 눌림)
 *   → 7 고양이(🎂 반짝 할인 케이크: 버팀 0 — 봉투 마지막 칸에만, 보너스) → 8 펭귄(바쁜 저녁: 벨트가 빨라짐, 전부).
 * 웃음: 깨지면 '철퍼덕!' 노른자가 튀고 계산대 오리가 깃털을 날리며 놀란다. 아이스크림은 녹아 흐르고, 생선은 봉투에서 퍼덕여
 *   바닥으로 튀어나온다(고양이 손님이면 냉큼 달려든다). 손님 표정(무표정·좋아함·깜짝·화남)과 한마디.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
/** 물건 꼬리표 */
const FRUIT = 1, WARM = 2, COLD = 4, FISH = 8, SALE = 16;
/** 튼튼한 물건(버팀 없음) */
const STURDY = 99;
interface Kind { e: string; name: string; w: number; b: number; tag: number; splat: string }
export const KINDS: Kind[] = [
  { e: '🍎', name: '사과', w: 1, b: STURDY, tag: FRUIT, splat: '#e03131' }, // 0
  { e: '🥕', name: '당근', w: 1, b: STURDY, tag: 0, splat: '#f76707' }, // 1
  { e: '🥔', name: '감자', w: 2, b: STURDY, tag: 0, splat: '#c08a4a' }, // 2
  { e: '🥫', name: '통조림', w: 2, b: STURDY, tag: 0, splat: '#c92a2a' }, // 3
  { e: '🥚', name: '달걀', w: 1, b: 1, tag: 0, splat: '#ffd43b' }, // 4
  { e: '🍪', name: '과자', w: 1, b: 1, tag: 0, splat: '#b5763a' }, // 5
  { e: '🍞', name: '따뜻한 빵', w: 1, b: 2, tag: WARM, splat: '#e0a96d' }, // 6
  { e: '🍗', name: '따뜻한 치킨', w: 2, b: STURDY, tag: WARM, splat: '#c8752f' }, // 7
  { e: '🍌', name: '바나나', w: 1, b: 2, tag: FRUIT, splat: '#ffe066' }, // 8
  { e: '🍇', name: '포도', w: 1, b: 1, tag: FRUIT, splat: '#862e9c' }, // 9
  { e: '🐟', name: '생선', w: 2, b: STURDY, tag: FISH, splat: '#74c0fc' }, // 10
  { e: '🍦', name: '아이스크림', w: 1, b: STURDY, tag: COLD, splat: '#ffc9de' }, // 11
  { e: '🥛', name: '우유통', w: 3, b: STURDY, tag: 0, splat: '#f1f3f5' }, // 12
  { e: '🍉', name: '수박', w: 4, b: STURDY, tag: FRUIT, splat: '#ff6b6b' }, // 13
  { e: '🎂', name: '할인 케이크', w: 1, b: 0, tag: SALE, splat: '#ffdeeb' }, // 14
];
const APPLE = 0, CHIPS = 5, FISHK = 10, MELON = 13, CAKE = 14;
const ICE = 11;

interface Order { type: 'same' | 'side' | 'together'; kind?: number; tag?: number; side?: 0 | 1; text: string }
interface StageDef { who: number; items: number[]; first?: number; order: Order; target: number; box?: boolean; fast?: boolean }
/** 손님: 0 할머니 · 1 꼬마 · 2 고양이 · 3 펭귄 */
const WHO = ['할머니', '꼬마', '고양이 손님', '펭귄 손님'];
export const STAGES: StageDef[] = [
  { who: 0, items: [0, 0, 0, 1, 1, 2, 2, 3], first: APPLE, order: { type: 'same', kind: APPLE, text: '🍎 사과는 한 봉투에 모아 줘요' }, target: 2 },
  { who: 1, items: [4, 4, 5, 0, 0, 1, 2, 2, 3, 3], order: { type: 'side', kind: CHIPS, side: 1, text: '🍪 과자는 오른쪽 봉투에!' }, target: 3 },
  { who: 2, items: [10, 10, 0, 8, 9, 4, 2, 3, 5], first: FISHK, order: { type: 'side', kind: FISHK, side: 0, text: '🐟 생선은 왼쪽 봉투에 냥' }, target: 3 },
  { who: 3, items: [11, 11, 6, 7, 4, 5, 2, 3, 0], first: ICE, order: { type: 'together', tag: COLD, text: '🍦 아이스크림은 한 봉투에 꽥' }, target: 3 },
  { who: 0, items: [13, 13, 12, 4, 4, 6, 8, 2, 3], first: MELON, order: { type: 'side', kind: MELON, side: 1, text: '🍉 수박은 오른쪽 봉투에' }, target: 3 },
  { who: 1, box: true, items: [5, 5, 4, 4, 11, 6, 12, 2, 3, 0], order: { type: 'side', kind: CHIPS, side: 1, text: '🍪 과자는 다 상자에!' }, target: 3 },
  { who: 2, box: true, items: [14, 14, 10, 0, 4, 2, 3, 1, 5, 12], first: CAKE, order: { type: 'side', kind: FISHK, side: 0, text: '🐟 생선은 왼쪽 봉투에 냥' }, target: 3 },
  { who: 3, box: true, fast: true, items: [14, 10, 11, 11, 7, 6, 4, 13, 12, 9], order: { type: 'together', tag: COLD, text: '🍦 차가운 건 한 봉투에 꽥' }, target: 3 },
];
export const STAGE_COUNT = STAGES.length;
/** 망가진 게 이만큼 되면 그 손님은 실패 */
const LIMIT = 3;
const BAG_CAP = 4, BOX_CAP = 6;
/** 시간(틱): 손님 들어옴 · 물건이 스캐너까지 굴러옴 · 벨트 끝까지 밀려가 저절로 왼쪽으로 · 결과 */
const INTRO = 40, ROLL = 18, DRIFT = 420, DRIFT_FAST = 300, RES_OK = 125, RES_FAIL = 150, FLY = 16;
const STAR_PTS = 100, CLEAR_PTS = 50, CAKE_PTS = 60, WIN_PTS = 100;

const match = (o: Order, k: number) => (o.kind !== undefined ? k === o.kind : (KINDS[k].tag & (o.tag ?? 0)) !== 0);

// ───────────────────────────── 규칙 (봇이 내다볼 때도 같은 함수) ─────────────────────────────
/** 봉투 속 물건. r: 0 멀쩡 · 1 깨짐 · 2 녹음 */
export interface It { k: number; r: number; t: number; fx: number; cid: number; rt: number }
export interface Bin { cap: number; box: boolean; items: It[]; cid: number; t0: number }
export interface Drop { flop: boolean; selfMelt: boolean; broken: It[]; melted: It[]; flopped: It[] }

/** 물건 k를 봉투(items)에 담으면 무슨 일이 생기나 — items를 바꾸지 않고 결과만 */
export function judgeDrop(items: { k: number; r: number }[], k: number): { flop: boolean; selfMelt: boolean; broken: number[]; melted: number[]; flopped: number[] } {
  const K = KINDS[k], out = { flop: false, selfMelt: false, broken: [] as number[], melted: [] as number[], flopped: [] as number[] };
  // 🐟 생선은 과일과 같은 봉투면 퍼덕여 튀어나온다 (들어가는 게 생선이면 그 생선이, 과일이면 봉투 속 생선이)
  if (K.tag & FISH && items.some((i) => !i.r && KINDS[i.k].tag & FRUIT)) return (out.flop = true), out;
  if (K.tag & FRUIT) items.forEach((i, j) => !i.r && KINDS[i.k].tag & FISH && out.flopped.push(j));
  // 🍦 차가운 것은 따뜻한 것과 같은 봉투면 녹는다
  if (K.tag & COLD && items.some((i) => !i.r && KINDS[i.k].tag & WARM)) out.selfMelt = true;
  if (K.tag & WARM) items.forEach((i, j) => !i.r && KINDS[i.k].tag & COLD && out.melted.push(j));
  // 무게: 위에 쌓인 무게 합이 버팀보다 크면 깨진다 (튀어나간 생선은 무게에서 빠진다)
  let load = K.w;
  for (let j = items.length - 1; j >= 0; j--) {
    if (out.flopped.includes(j)) continue;
    const i = items[j];
    if (!i.r && !out.melted.includes(j) && load > KINDS[i.k].b) out.broken.push(j);
    load += KINDS[i.k].w;
  }
  return out;
}

/** 봉투 속 j번째 물건 위에 얹힌 무게 */
export function loadOn(items: { k: number }[], j: number) {
  let l = 0;
  for (let q = j + 1; q < items.length; q++) l += KINDS[items[q].k].w;
  return l;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; k?: number }
export interface GroState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  lists: number[][]; list: number[]; qi: number;
  /** 지금 스캐너 위의 물건(-1 없음) · 굴러오기 시작한 틱 · 받침에서 올라왔나 */
  cur: number; curAt: number; curFromShelf: boolean;
  shelf: number; shelfAt: number; shelfFx: number;
  bins: Bin[]; cidNext: number; started: number; packed: It[];
  ruined: number; obad: boolean; ocid: number;
  hearts: number; stars: number; pts: number; got: number; gotFlags: boolean[]; ok: boolean; served: number;
  pending: 'left' | 'right' | 'down' | null; moves: number; firstGood: boolean;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number }[]; dead: boolean; won: boolean;
  /** 그리기용: 꽉 차서 카트로 가는 봉투 · 바닥에서 퍼덕이는 생선 · 손님 한마디 · 기분 */
  leaving: { bin: Bin; side: number; t: number }[]; floor: { k: number; x: number; t: number; from: number; sx: number; sy: number }[];
  say: { text: string; t: number; duck?: boolean } | null; mood: { m: string; t: number }; duck: { m: string; t: number };
  cartBags: number;
}

const ev = (s: GroState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, k?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, k });
function see(s: GroState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  // 한꺼번에 여러 개가 나오면 차례로 보여 준다
  const last = s.news[s.news.length - 1];
  s.news.push({ text, t: Math.max(s.t, last ? last.t + NEWS_T : 0) });
  if (s.news.length > 4) s.news.shift();
}
const NEWS_T = 140;
const def = (s: GroState) => STAGES[s.stage];
const drift = (s: GroState) => (def(s).fast ? DRIFT_FAST : DRIFT);
const LINES: Record<string, string[]> = {
  hi: ['장 좀 봐 왔어요~', '과자 사러 왔어요!', '냥! 생선 샀다냥', '꽥! 아이스크림!'],
  good: ['아이고 잘하네~', '우와 빠르다!', '냐옹~', '꽥꽥~'],
  break: ['아이고 내 달걀!', '으앙 내 과자!', '냐아앙?!', '꽥?!'],
  melt: ['어머 녹는다!', '아이스크림이 흘러요!', '차갑다냥!', '녹아요오오…'],
  flop: ['생선이 도망가네!', '으악 생선이 뛰어!', '내 생선 냥!!', '꽥?! 물고기!'],
  ok: ['고마워요 총각~', '최고예요!', '골골골~', '시원하다 꽥!'],
  fail: ['다시 담아 주구려…', '다시 해 주세요!', '하악!', '꽥… 다시'],
};
const line = (s: GroState, key: string) => LINES[key][def(s).who];

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
const BELT_Y = 0.535, SCAN_X = 0.5, QGAP = 0.17, BELT_END = 0.11;
export const BX = [0.245, 0.755], BW = 0.29, SH = 0.095, BY = 1.37;
const TRAY = { x: 0.5, y: 0.98 }, CART = { x: 0.5, y: 0.755 };
const qx = (k: number) => SCAN_X + QGAP * k;
/** 스캐너 위 물건의 x (굴러오는 중이면 뒤에서, 오래 두면 벨트 끝으로 천천히) */
function curX(s: GroState) {
  const age = s.t - s.curAt;
  if (age < ROLL) return s.curFromShelf ? SCAN_X : qx(1) - (qx(1) - SCAN_X) * Math.max(0, age / ROLL);
  const d = drift(s), a = (age - ROLL) / d;
  return SCAN_X - (SCAN_X - BELT_END) * Math.max(0, (a - 0.25) / 0.75) ** 1.4;
}
const slotY = (j: number) => BY - SH * (j + 0.5);

// ───────────────────────────── 판 진행 ─────────────────────────────
function newBin(s: GroState, side: number): Bin {
  const box = !!def(s).box && side === 1;
  return { cap: box ? BOX_CAP : BAG_CAP, box, items: [], cid: s.cidNext++, t0: s.t };
}

function newStage(s: GroState) {
  const d = def(s);
  if (!s.lists[s.stage]) {
    const rest = [...d.items];
    if (d.first !== undefined) rest.splice(rest.indexOf(d.first), 1);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(s.rng() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    s.lists[s.stage] = d.first !== undefined ? [d.first, ...rest] : rest;
  }
  s.list = s.lists[s.stage];
  s.qi = 1;
  s.cur = s.list[0];
  s.curAt = s.t + INTRO;
  s.curFromShelf = false;
  s.shelf = -1;
  s.bins = [newBin(s, 0), newBin(s, 1)];
  s.started = 0;
  s.packed = [];
  s.ruined = 0;
  s.obad = false;
  s.ocid = -1;
  s.phase = 'play';
  s.pt = 0;
  s.pending = null;
  s.cartBags = 0;
  s.mood = { m: 'calm', t: s.t };
  s.say = { text: line(s, 'hi'), t: s.t + 10 };
  // 새것 알림 (판의 첫 등장)
  see(s, 'bag', '🛒 손님 한 명 = 장바구니 하나 다 담기');
  see(s, 'order', '📋 손님 주문 카드 — 지키면 별 하나');
  const has = (f: (k: number) => boolean) => d.items.some(f);
  if (has((k) => KINDS[k].b < STURDY && !(KINDS[k].tag & SALE))) see(s, 'fragile', '🥚 깨지는 것 — 위 무게가 버팀보다 크면 철퍼덕!');
  if (s.stage >= 1) see(s, 'shelf', '⬇️ 받침 — 아래로 밀면 한 칸 내려 둬요');
  if (has((k) => !!(KINDS[k].tag & FISH))) see(s, 'fish', '🐟 생선 — 과일과 같은 봉투면 퍼덕 튀어나와요');
  if (has((k) => !!(KINDS[k].tag & COLD))) see(s, 'cold', '🍦 차가운 것 — 따뜻한 것과 같은 봉투면 녹아요');
  if (has((k) => KINDS[k].w >= 3)) see(s, 'heavy', '🍉 아주 무거운 것 — 약한 게 없는 봉투 바닥에!');
  if (d.box) see(s, 'box', '📦 상자 6칸 — 높이 쌓이면 아래가 더 눌려요');
  if (has((k) => !!(KINDS[k].tag & SALE))) see(s, 'sale', '🎂 할인 케이크 — 버팀 0! 맨 위 칸이면 보너스');
  if (d.fast) see(s, 'rush', '🌙 바쁜 저녁 — 벨트가 빨라졌어요');
  ev(s, 'stage', 0.5, 0.42, `${s.stage + 1}번째 손님 — ${WHO[d.who]}`);
}

/** 다음 물건을 스캐너로 (벨트가 비면 받침의 물건이 올라온다) */
function nextCur(s: GroState) {
  if (s.qi < s.list.length) (s.cur = s.list[s.qi++]), (s.curAt = s.t), (s.curFromShelf = false);
  else if (s.shelf >= 0) (s.cur = s.shelf), (s.shelf = -1), (s.curAt = s.t - ROLL + 10), (s.curFromShelf = true);
  else s.cur = -1;
}

function act(s: GroState, dir: 'left' | 'right' | 'down', auto = false) {
  const k = s.cur, fx = curX(s);
  if (dir === 'down') {
    if (s.shelf < 0) {
      s.shelf = k;
      s.shelfAt = s.t;
      s.shelfFx = fx;
      nextCur(s);
    } else {
      const o = s.shelf;
      s.shelf = k;
      s.shelfAt = s.t;
      s.shelfFx = fx;
      s.cur = o;
      s.curAt = s.t - ROLL + 10;
      s.curFromShelf = true;
    }
    ev(s, 'shelf', TRAY.x, TRAY.y, '받침에 쏙', '#d0ebff', 0, k);
    s.moves++;
    return;
  }
  const side = dir === 'left' ? 0 : 1, bin = s.bins[side], d = def(s);
  const r = judgeDrop(bin.items, k);
  s.moves++;
  const bx = BX[side];
  if (r.flop) {
    s.ruined++;
    s.floor.push({ k, x: bx + (side ? 0.13 : -0.13), t: s.t, from: side, sx: fx, sy: BELT_Y });
    ev(s, 'flop', bx, slotY(bin.items.length), '퍼덕!', '#74c0fc', 0, k);
    react(s, 'flop');
  } else {
    // 튀어나가는 생선 (위에서부터 빼야 번호가 안 꼬인다)
    for (const j of [...r.flopped].sort((a, b) => b - a)) {
      const f = bin.items[j];
      bin.items.splice(j, 1);
      s.packed.splice(s.packed.indexOf(f), 1);
      s.ruined++;
      s.floor.push({ k: f.k, x: bx + (side ? 0.13 : -0.13), t: s.t + FLY, from: side, sx: bx, sy: slotY(j) });
      ev(s, 'flop', bx, slotY(j), '퍼덕!', '#74c0fc', 0, f.k);
      react(s, 'flop');
    }
    // flopped를 뺀 뒤의 번호로 다시 계산 (깨짐·녹음)
    const r2 = r.flopped.length ? judgeDrop(bin.items, k) : r;
    for (const j of r2.melted) {
      bin.items[j].r = 2;
      bin.items[j].rt = s.t;
      s.ruined++;
      ev(s, 'melt', bx, slotY(j), '녹아요!', '#ffc9de', 0, bin.items[j].k);
      react(s, 'melt');
    }
    for (const j of r2.broken) {
      bin.items[j].r = 1;
      bin.items[j].rt = s.t;
      s.ruined++;
      ev(s, 'break', bx, slotY(j), '철퍼덕!', KINDS[bin.items[j].k].splat, 0, bin.items[j].k);
      react(s, 'break');
    }
    const it: It = { k, r: r2.selfMelt ? 2 : 0, t: s.t, fx, cid: bin.cid, rt: s.t };
    if (r2.selfMelt) (s.ruined++, ev(s, 'melt', bx, slotY(bin.items.length), '녹아요!', '#ffc9de', 0, k), react(s, 'melt'));
    if (!bin.items.length) s.started++;
    bin.items.push(it);
    s.packed.push(it);
    // 주문
    const o = d.order;
    if (match(o, k)) {
      if (o.type === 'side' ? side !== o.side : s.ocid >= 0 && s.ocid !== bin.cid) {
        if (!s.obad) ev(s, 'orderbad', 0.47, 0.17, '주문이 틀렸어요', '#ffa8a8');
        s.obad = true;
      }
      if (s.ocid < 0) s.ocid = bin.cid;
    }
    const clean = !r2.selfMelt && !r2.broken.length && !r2.melted.length && !r.flopped.length;
    ev(s, 'place', bx, slotY(bin.items.length - 1), auto ? '저절로 쏙' : clean ? '쏙!' : undefined, clean ? '#fff3bf' : undefined, side, k);
    if (clean && !s.firstGood) (s.firstGood = true), (s.say = { text: line(s, 'good'), t: s.t }), (s.mood = { m: 'happy', t: s.t });
    else if (clean && s.t - s.mood.t > 60) s.mood = { m: 'calm', t: s.t };
    // 꽉 차면 카트로, 새 봉투
    if (bin.items.length >= bin.cap) {
      s.leaving.push({ bin, side, t: s.t + FLY });
      s.cartBags++;
      s.bins[side] = newBin(s, side);
      s.bins[side].t0 = s.t + FLY;
      ev(s, 'full', bx, BY - SH * bin.cap, bin.box ? '상자 꽉!' : '봉투 꽉!', '#ffe8a3', side);
      see(s, 'full', '🛍️ 꽉 찬 봉투는 카트로 — 새 봉투가 와요');
    }
  }
  nextCur(s);
  if (s.ruined >= LIMIT) return endStage(s, false);
  if (s.cur < 0) endStage(s, true);
}

/** 손님·오리가 놀란다 (물건이 봉투에 떨어지는 순간에 맞춰) */
function react(s: GroState, kind: 'break' | 'melt' | 'flop') {
  s.mood = { m: 'shock', t: s.t + FLY };
  s.duck = { m: 'shock', t: s.t + FLY };
  s.say = { text: line(s, kind), t: s.t + FLY };
}

function endStage(s: GroState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.pending = null;
  const d = def(s);
  if (ok) {
    const f = [s.ruined === 0, !s.obad, s.started <= d.target];
    const st = f.filter(Boolean).length, cakes = s.packed.filter((i) => i.k === CAKE && !i.r).length;
    s.got = st;
    s.gotFlags = f;
    s.stars += st;
    s.served++;
    s.pts += CLEAR_PTS + st * STAR_PTS + cakes * CAKE_PTS;
    if (cakes) ev(s, 'cake', 0.5, 0.6, `✨ 케이크 보너스 +${cakes * CAKE_PTS}`, '#ffdeeb');
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = { m: st >= 2 ? 'happy' : 'calm', t: s.t };
    s.say = { text: line(s, 'ok'), t: s.t };
    ev(s, 'clear', 0.5, 0.7, `${s.stage + 1}번째 손님 끝! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`);
  } else {
    s.hearts--;
    s.mood = { m: 'angry', t: s.t };
    s.duck = { m: 'dizzy', t: s.t };
    s.say = { text: line(s, 'fail'), t: s.t };
    ev(s, 'fail', 0.5, 0.7, s.hearts > 0 ? `망가진 게 ${LIMIT}개… 하트 -1 · 다시 담기` : `망가진 게 ${LIMIT}개… 끝`);
  }
}

export const grocery: GameDef<GroState> = {
  id: 'grocery',
  name: '장바구니 척척',
  genes: ['sort', 'swipe', 'order'],
  twist: '굴러오는 물건을 왼쪽·오른쪽 봉투로 휙 나눠 담는 분류 놀이인데, 봉투 속은 쌓는 순서가 퍼즐 — 위에 쌓인 무게가 아래 물건의 버팀을 넘는 순간 철퍼덕!',
  rules: [
    '← → 로 밀면 그쪽 봉투에 쏙. ↓ 는 받침에 잠깐. 봉투가 꽉 차면 새 봉투.',
    '위에 쌓인 무게가 아래 물건의 버팀(🥚1 🍞2…)보다 크면 철퍼덕!',
    '안 망가짐·주문·봉투 적게 = 별 셋. 3개 망가지면 그 손님 다시.',
  ],
  controls: 'swipe',
  hint: '← → 밀기 = 그쪽 봉투에 담기 · ↓ 받침 / 화살표',
  aspect: A,
  art: {
    concept: '동네 슈퍼마켓 계산대 디오라마',
    mood: '저녁 장보기 시간의 따뜻한 동네 슈퍼 — 전구 조명 아래 선반엔 물건이 빼곡하고, 검은 고무 벨트가 덜컹덜컹 물건을 실어 온다. 갈색 종이봉투 단면에 쌓인 순서가 보이고, 계산대 오리 직원과 줄 선 손님들이 구경한다.',
    palette: { bg: '#3b2a1e', ink: '#fff8ec', muted: '#c9b49a', accent: '#ffd166', hot: '#ff6b5a', soft: '#f3e3c3' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, lists: [], list: [], qi: 0,
      cur: -1, curAt: 0, curFromShelf: false, shelf: -1, shelfAt: 0, shelfFx: 0.5, bins: [], cidNext: 0, started: 0, packed: [],
      ruined: 0, obad: false, ocid: -1, hearts: 3, stars: 0, pts: 0, got: 0, gotFlags: [false, false, false], ok: false, served: 0,
      pending: null, moves: 0, firstGood: false, seen: new Set<string>(), events: [], news: [], dead: false, won: false,
      leaving: [], floor: [], say: null, mood: { m: 'calm', t: 0 }, duck: { m: 'calm', t: 0 }, cartBags: 0,
    } as GroState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    if (s.events.length && s.t - s.events[0].t > 120) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.leaving.length && s.t - s.leaving[0].t > 40) s.leaving = s.leaving.filter((l) => s.t - l.t <= 40);
    if (s.floor.length && s.t - s.floor[0].t > 240) s.floor = s.floor.filter((f) => s.t - f.t <= 240);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RES_OK : RES_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    const m = inp.move;
    if (m === 'left' || m === 'right' || (m === 'down' && s.stage >= 1)) s.pending = m;
    if (s.cur < 0) return;
    const age = s.t - s.curAt;
    if (age < ROLL) return;
    if (age === ROLL && !s.curFromShelf) ev(s, 'scan', SCAN_X, BELT_Y, '삑', '#ff8787', 0, s.cur);
    if (s.pending) {
      const p = s.pending;
      s.pending = null;
      return act(s, p);
    }
    if (age >= ROLL + drift(s)) act(s, 'left', true);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
interface SBin { cap: number; items: { k: number; r: number }[]; cid: number }
interface Sim { bins: SBin[]; shelf: number; ruin: number; started: number; cid: number; obad: boolean; ocid: number; cakes: number }
const cloneSim = (m: Sim): Sim => ({ ...m, bins: m.bins.map((b) => ({ cap: b.cap, cid: b.cid, items: b.items.map((i) => ({ k: i.k, r: i.r })) })) });

/** 물건 k를 sim의 side 봉투에 담는다 (실제 규칙과 같다) */
function simDrop(m: Sim, side: number, k: number, d: StageDef) {
  const bin = m.bins[side], r = judgeDrop(bin.items, k);
  if (r.flop) return void m.ruin++;
  for (const j of [...r.flopped].sort((a, b) => b - a)) bin.items.splice(j, 1), m.ruin++;
  const r2 = r.flopped.length ? judgeDrop(bin.items, k) : r;
  for (const j of r2.melted) (bin.items[j].r = 2), m.ruin++;
  for (const j of r2.broken) (bin.items[j].r = 1), m.ruin++;
  if (r2.selfMelt) m.ruin++;
  if (!bin.items.length) m.started++;
  bin.items.push({ k, r: r2.selfMelt ? 2 : 0 });
  const o = d.order;
  if (match(o, k)) {
    if (o.type === 'side' ? side !== o.side : m.ocid >= 0 && m.ocid !== bin.cid) m.obad = true;
    if (m.ocid < 0) m.ocid = bin.cid;
  }
  if (bin.items.length >= bin.cap) {
    for (const i of bin.items) if (i.k === CAKE && !i.r) m.cakes++;
    m.bins[side] = { cap: bin.cap, cid: m.cid++, items: [] };
  }
}

/** 내다본 끝의 값: 망가짐·주문·봉투 수(남은 물건으로 어림)·약한 물건 위험·섞이면 안 되는 것 */
function value(m: Sim, s: GroState, remaining: number, future: number[]) {
  const d = def(s);
  let v = -1000 * m.ruin - (m.obad ? 320 : 0) + m.cakes * 60;
  let free = 0, maxCap = 0;
  for (const b of m.bins) {
    maxCap = Math.max(maxCap, b.cap);
    if (b.items.length) free += b.cap - b.items.length;
  }
  const est = m.started + Math.ceil(Math.max(0, remaining - free) / maxCap);
  if (est > d.target) v -= 170 * (est - d.target);
  let ft = 0, heavy = false;
  for (const k of future) (ft |= KINDS[k].tag), (heavy ||= KINDS[k].w >= 3);
  let allWarm = true, allCold = true, allFruit = true, allFish = true, allFrag = true;
  for (const b of m.bins) {
    const fill = Math.min(b.cap - b.items.length, remaining);
    let load = 0, tw = false, tc = false, tf = false, ts = false, fr = false;
    for (let j = b.items.length - 1; j >= 0; j--) {
      const i = b.items[j], K = KINDS[i.k];
      if (!i.r) {
        if (K.b < STURDY) {
          const risk = load + fill - K.b;
          if (risk > 0) v -= 75 * risk + (K.tag & SALE ? 40 : 0);
          fr = true;
        }
        tw ||= !!(K.tag & WARM);
        tc ||= !!(K.tag & COLD);
        tf ||= !!(K.tag & FRUIT);
        ts ||= !!(K.tag & FISH);
      }
      load += K.w;
    }
    allWarm &&= tw;
    allCold &&= tc;
    allFruit &&= tf;
    allFish &&= ts;
    allFrag &&= fr;
  }
  if (ft & COLD && allWarm) v -= 60;
  if (ft & WARM && allCold) v -= 60;
  if (ft & FISH && allFruit) v -= 60;
  if (ft & FRUIT && allFish) v -= 60;
  if (heavy && allFrag) v -= 50;
  // 주문(같은 봉투에 모으기): 모으던 봉투에 남은 칸이 앞으로 올 같은 물건보다 적으면 주문이 깨진다
  const o = d.order;
  if (!m.obad && o.type !== 'side' && m.ocid >= 0) {
    const need = future.filter((k) => match(o, k)).length, ob = m.bins.find((b) => b.cid === m.ocid);
    if (need > (ob ? ob.cap - ob.items.length : 0)) v -= 200;
  }
  if (m.shelf >= 0) v -= 4;
  return v;
}

/** 지금 물건 + 벨트에 보이는 다음 둘까지 (← → ↓ 세 갈래 × 세 번) 내다보고 가장 좋은 첫 수 */
function plan(s: GroState): 'left' | 'right' | 'down' {
  const d = def(s), canShelf = s.stage >= 1, vis = Math.min(s.list.length, s.qi + 2);
  const root: Sim = { bins: s.bins.map((b) => ({ cap: b.cap, cid: b.cid, items: b.items.map((i) => ({ k: i.k, r: i.r })) })), shelf: s.shelf, ruin: s.ruined, started: s.started, cid: s.cidNext, obad: s.obad, ocid: s.ocid, cakes: 0 };
  const search = (m: Sim, cur: number, qi: number, depth: number, fromShelf: boolean): number => {
    const remaining = (cur >= 0 ? 1 : 0) + (m.shelf >= 0 ? 1 : 0) + (s.list.length - qi);
    if (cur < 0 || depth === 0) {
      const fut = s.list.slice(qi);
      if (cur >= 0) fut.push(cur);
      if (m.shelf >= 0) fut.push(m.shelf);
      return value(m, s, remaining, fut);
    }
    let best = -Infinity;
    for (const a of [0, 1, 2]) {
      if (a === 2 && (!canShelf || fromShelf)) continue;
      const n = cloneSim(m);
      let nc: number, nq = qi, fs = false;
      if (a === 2) {
        if (n.shelf < 0) {
          n.shelf = cur;
          if (nq < s.list.length) {
            if (nq >= vis) {
              best = Math.max(best, value(n, s, remaining, s.list.slice(qi)) - 2);
              continue;
            }
            nc = s.list[nq++];
          } else nc = -1;
        } else (nc = n.shelf), (n.shelf = cur), (fs = true);
        if (nc === n.shelf) continue;
      } else {
        simDrop(n, a, cur, d);
        if (nq < s.list.length) {
          if (nq >= vis) {
            best = Math.max(best, value(n, s, remaining - 1, s.list.slice(qi)));
            continue;
          }
          nc = s.list[nq++];
        } else if (n.shelf >= 0) (nc = n.shelf), (n.shelf = -1), (fs = true);
        else nc = -1;
      }
      best = Math.max(best, search(n, nc, nq, depth - 1, fs) - (a === 2 ? 2 : 0));
    }
    return best;
  };
  let bestA = 0, bv = -Infinity;
  for (const a of [0, 1, 2]) {
    if (a === 2 && (!canShelf || s.curFromShelf || s.cur === s.shelf)) continue;
    const n = cloneSim(root);
    let v: number;
    if (a === 2) {
      let nc: number, nq = s.qi, fs = false;
      if (n.shelf < 0) {
        n.shelf = s.cur;
        nc = nq < s.list.length ? s.list[nq++] : -1;
      } else (nc = n.shelf), (n.shelf = s.cur), (fs = true);
      v = search(n, nc, nq, 2, fs) - 3;
    } else {
      simDrop(n, a, s.cur, d);
      let nc: number, nq = s.qi, fs = false;
      if (nq < s.list.length) nc = s.list[nq++];
      else if (n.shelf >= 0) (nc = n.shelf), (n.shelf = -1), (fs = true);
      else nc = -1;
      v = search(n, nc, nq, 2, fs);
    }
    if (v > bv + 1e-9) (bv = v), (bestA = a);
  }
  return bestA === 0 ? 'left' : bestA === 1 ? 'right' : 'down';
}

const NO: Input = { tap: false, dir: 0 };
/** 봇: 벨트에 보이는 다음 둘까지 내다보며 봉투·받침을 고른다 (망가짐·주문·봉투 수·약한 물건 위험) */
export const grocerySmart: Bot<GroState> = {
  name: '포장 달인',
  act(s) {
    if (s.phase !== 'play' || s.cur < 0 || s.pending || s.t - s.curAt < ROLL) return NO;
    return { tap: false, dir: 0, move: plan(s) };
  },
};

const DIRS = ['left', 'right', 'down', 'up'] as const;
const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 때나 아무 쪽으로 민다 */
export const groceryRandom: Bot<GroState> = {
  name: '아무렇게나',
  act(s, rng) {
    const next = dumbAt.get(s) ?? 30 + Math.floor(rng() * 70);
    if (s.t < next) return NO;
    dumbAt.set(s, s.t + 30 + Math.floor(rng() * 70));
    return { tap: false, dir: 0, move: DIRS[Math.floor(rng() * 4)] };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), k = Math.max(0, Math.min(1, t));
  return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * k).toString(16).padStart(2, '0')).join('');
};
const EMO = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emoji(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(size)}px ${EMO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
  ctx.globalAlpha = 1;
}
function blob(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, seed: number, n = 9) {
  ctx.beginPath();
  for (let k = 0; k <= n; k++) {
    const a = (k / n) * Math.PI * 2, rr = 0.75 + 0.45 * hsh(seed + (k % n) * 3.1);
    const px = x + Math.cos(a) * rx * rr, py = y + Math.sin(a) * ry * rr;
    k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** 물건 하나 (x,y = 가운데, z = 크기 px). load = 위에 얹힌 무게(봉투 속), tags = 무게·버팀 표시 */
function drawItem(ctx: CanvasRenderingContext2D, k: number, x: number, y: number, z: number, U: number, o: { r?: number; t: number; tags?: boolean; load?: number; risk?: boolean; seed?: number; alpha?: number }) {
  const K = KINDS[k], a = o.alpha ?? 1;
  ctx.globalAlpha = a * 0.9;
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + z * 0.44, z * 0.42, z * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = a;
  const sd = o.seed ?? k * 7;
  if (o.r === 1) {
    // 철퍼덕: 물건 색 얼룩 + 납작해진 물건 + 흘러내림
    ctx.fillStyle = k === 4 ? '#fff9ec' : mix(K.splat, '#ffffff', 0.15);
    blob(ctx, x, y + z * 0.22, z * 0.62, z * 0.24, sd);
    ctx.fill();
    ctx.fillStyle = K.splat;
    if (k === 4) {
      ctx.beginPath();
      ctx.ellipse(x + z * 0.05, y + z * 0.18, z * 0.2, z * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.beginPath();
      ctx.ellipse(x - z * 0.01, y + z * 0.13, z * 0.06, z * 0.035, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f1e3c8';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sx * z * 0.42, y + z * 0.05);
        ctx.lineTo(x + sx * z * 0.3, y - z * 0.12);
        ctx.lineTo(x + sx * z * 0.2, y + z * 0.04);
        ctx.lineTo(x + sx * z * 0.27, y - z * 0.02);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      blob(ctx, x, y + z * 0.2, z * 0.42, z * 0.16, sd + 5);
      ctx.fill();
      ctx.save();
      ctx.translate(x, y + z * 0.12);
      ctx.scale(1.35, 0.42);
      emoji(ctx, K.e, 0, 0, z * 0.9, a);
      ctx.restore();
    }
    // 흘러내리는 방울
    ctx.fillStyle = K.splat;
    for (let d = 0; d < 2; d++) {
      const dx = x + (d ? 0.3 : -0.22) * z, len = z * (0.18 + 0.14 * hsh(sd + d)) * Math.min(1, (o.t % 400) / 60 + 0.4);
      ctx.beginPath();
      ctx.roundRect(dx - z * 0.035, y + z * 0.25, z * 0.07, len, z * 0.035);
      ctx.fill();
    }
  } else if (o.r === 2) {
    // 녹음: 분홍 웅덩이 + 기울어진 콘
    ctx.fillStyle = '#ffc9de';
    blob(ctx, x, y + z * 0.3, z * 0.6, z * 0.16, sd + 2);
    ctx.fill();
    ctx.fillStyle = '#ffdeeb';
    blob(ctx, x - z * 0.1, y + z * 0.26, z * 0.3, z * 0.08, sd + 9);
    ctx.fill();
    ctx.save();
    ctx.translate(x + z * 0.08, y + z * 0.05);
    ctx.rotate(0.9);
    emoji(ctx, K.e, 0, 0, z * 0.8, a * 0.85);
    ctx.restore();
    ctx.fillStyle = '#ffc9de';
    for (let d = 0; d < 3; d++) {
      const dx = x + (d - 1) * z * 0.25, len = z * (0.15 + 0.2 * hsh(sd + d * 4)) * (0.6 + 0.4 * Math.sin(o.t * 0.05 + d));
      ctx.beginPath();
      ctx.roundRect(dx - z * 0.04, y + z * 0.33, z * 0.08, len, z * 0.04);
      ctx.fill();
    }
  } else {
    emoji(ctx, K.e, x, y, z, a);
    if (K.tag & SALE) {
      // 반짝 할인: 별빛
      for (let q = 0; q < 3; q++) {
        const ang = o.t * 0.05 + q * 2.1, rr = z * 0.62;
        ctx.fillStyle = `rgba(255,236,153,${(0.55 + 0.45 * Math.sin(o.t * 0.2 + q)) * a})`;
        star(ctx, x + Math.cos(ang) * rr, y + Math.sin(ang) * rr * 0.8, z * 0.12);
      }
    }
  }
  if (o.risk) {
    ctx.strokeStyle = `rgba(255,70,70,${0.55 + 0.45 * Math.sin(o.t * 0.3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, z * 0.62, z * 0.56, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (o.tags && !o.r) {
    // 무게 (어두운 동그라미) · 버팀 (주황 방패: 남은 버팀)
    const tr = U * 0.026, wx = x + z * 0.52, wy = y + z * 0.3;
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.arc(wx, wy, tr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff3d6';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(U * 0.037)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(K.w), wx, wy + 1);
    if (K.b < STURDY) {
      const left = K.b - (o.load ?? 0), bx = x - z * 0.55, by = y + z * 0.26, bw = U * 0.042, bh = U * 0.05;
      ctx.fillStyle = left <= 0 ? '#e03131' : '#ff8c1a';
      ctx.beginPath();
      ctx.moveTo(bx - bw / 2, by - bh / 2);
      ctx.lineTo(bx + bw / 2, by - bh / 2);
      ctx.lineTo(bx + bw / 2, by + bh * 0.1);
      ctx.quadraticCurveTo(bx + bw / 2, by + bh * 0.4, bx, by + bh / 2);
      ctx.quadraticCurveTo(bx - bw / 2, by + bh * 0.4, bx - bw / 2, by + bh * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#fff3d6';
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(Math.max(0, left)), bx, by - bh * 0.02);
    }
  }
  ctx.globalAlpha = 1;
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

/** 지금 물건을 그 봉투에 담으면? (미리 보기 — 실제 규칙과 같은 함수) */
function preview(s: GroState, side: number) {
  const bin = s.bins[side], k = s.cur, r = judgeDrop(bin.items, k), d = def(s);
  const parts: string[] = [], bad: number[] = [];
  let col = '#2f9e44', kind = 'ok';
  if (r.flop) return { text: '🐟 퍼덕! 튀어나와요', col: '#1c7ed6', bad, kind: 'flop' };
  if (r.flopped.length) (parts.push('🐟 퍼덕!'), bad.push(...r.flopped), (col = '#1c7ed6'), (kind = 'flop'));
  const after = r.flopped.length ? bin.items.filter((_, j) => !r.flopped.includes(j)) : bin.items;
  const r2 = r.flopped.length ? judgeDrop(after, k) : r;
  if (r2.selfMelt || r2.melted.length) (parts.push('🍦 녹아요!'), (col = '#d6336c'), (kind = 'melt'));
  for (const j of r2.melted) bad.push(bin.items.indexOf(after[j]));
  if (r2.broken.length) {
    parts.push(r2.broken.map((j) => KINDS[after[j].k].e).join('') + ' 철퍼덕!');
    for (const j of r2.broken) bad.push(bin.items.indexOf(after[j]));
    col = '#e03131';
    kind = 'break';
  }
  const o = d.order;
  if (match(o, k) && !s.obad && (o.type === 'side' ? side !== o.side : s.ocid >= 0 && s.ocid !== bin.cid)) (parts.push('📋주문✗'), parts.length === 1 && ((col = '#e8590c'), (kind = 'order')));
  if (!parts.length) parts.push(bin.items.length + 1 >= bin.cap ? '✓ 꽉! 새 봉투로' : '✓ 괜찮아요');
  return { text: parts.join(' '), col, bad, kind };
}

type Mood = 'calm' | 'happy' | 'shock' | 'angry';
/** 손님 (0 할머니 · 1 꼬마 · 2 고양이 · 3 펭귄). x,y = 머리 가운데, z = 머리 반지름 px */
function drawCustomer(ctx: CanvasRenderingContext2D, who: number, x: number, y: number, z: number, mood: Mood, t: number, small = false) {
  ctx.save();
  ctx.translate(x, y + (mood === 'happy' ? -Math.abs(Math.sin(t * 0.25)) * z * 0.12 : mood === 'shock' ? -z * 0.1 : 0));
  if (mood === 'angry') ctx.translate(Math.sin(t * 1.3) * z * 0.04, 0);
  const SKIN = ['#ffdcc2', '#ffd5ad', '#f6a54a', '#2b2f3a'][who];
  const CLOTH = ['#9c6ade', '#4dabf7', '#51cf66', '#e03131'][who];
  // 몸 (어깨 ~ 계산대까지)
  if (!small) {
    const g = ctx.createLinearGradient(0, z * 0.6, 0, z * 3.2);
    g.addColorStop(0, CLOTH);
    g.addColorStop(1, mix(CLOTH, '#1a1020', 0.45));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-z * 1.15, z * 3.4);
    ctx.quadraticCurveTo(-z * 1.2, z * 1.0, -z * 0.45, z * 0.85);
    ctx.lineTo(z * 0.45, z * 0.85);
    ctx.quadraticCurveTo(z * 1.2, z * 1.0, z * 1.15, z * 3.4);
    ctx.closePath();
    ctx.fill();
    if (who === 0) {
      // 진주 목걸이
      ctx.fillStyle = '#fff8e6';
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.arc(k * z * 0.13, z * 1.0 + Math.abs(k) * -0.02 * z + (9 - k * k) * 0.02 * z, z * 0.06, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (who === 1) {
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let k = 0; k < 3; k++) ctx.fillRect(-z * 1.1, z * (1.4 + k * 0.55), z * 2.2, z * 0.18);
    }
    if (who === 3) {
      ctx.fillStyle = '#fbfbfb';
      ctx.beginPath();
      ctx.ellipse(0, z * 2.4, z * 0.7, z * 1.3, 0, 0, Math.PI * 2);
      ctx.fill();
      // 목도리
      ctx.fillStyle = '#e03131';
      ctx.beginPath();
      ctx.roundRect(-z * 0.75, z * 0.7, z * 1.5, z * 0.32, z * 0.15);
      ctx.fill();
      ctx.fillRect(z * 0.25, z * 0.8, z * 0.28, z * 0.8);
    }
  }
  // 귀 (고양이)
  if (who === 2) {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = SKIN;
      ctx.beginPath();
      ctx.moveTo(sd * z * 0.85, -z * 0.35);
      ctx.lineTo(sd * z * 0.75, -z * 1.25);
      ctx.lineTo(sd * z * 0.15, -z * 0.8);
      ctx.fill();
      ctx.fillStyle = '#ffb3c1';
      ctx.beginPath();
      ctx.moveTo(sd * z * 0.7, -z * 0.5);
      ctx.lineTo(sd * z * 0.68, -z * 1.0);
      ctx.lineTo(sd * z * 0.32, -z * 0.78);
      ctx.fill();
    }
  }
  // 머리
  const hg = ctx.createRadialGradient(-z * 0.3, -z * 0.35, z * 0.1, 0, 0, z * 1.05);
  hg.addColorStop(0, mix(SKIN, '#ffffff', 0.25));
  hg.addColorStop(1, mix(SKIN, '#5a3020', who === 3 ? 0.1 : 0.22));
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, 0, z, z * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  if (who === 3) {
    // 펭귄 흰 얼굴
    ctx.fillStyle = '#fbfbfb';
    ctx.beginPath();
    ctx.ellipse(-z * 0.32, z * 0.05, z * 0.42, z * 0.55, 0.2, 0, Math.PI * 2);
    ctx.ellipse(z * 0.32, z * 0.05, z * 0.42, z * 0.55, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  if (who === 2) {
    // 고양이 줄무늬
    ctx.strokeStyle = '#c86b1c';
    ctx.lineWidth = z * 0.1;
    ctx.lineCap = 'round';
    for (const dx of [-0.25, 0, 0.25]) {
      ctx.beginPath();
      ctx.moveTo(dx * z, -z * 0.9);
      ctx.lineTo(dx * z * 0.8, -z * 0.6);
      ctx.stroke();
    }
  }
  if (who === 0) {
    // 하얀 파마머리 + 쪽
    ctx.fillStyle = '#eceff4';
    for (let k = 0; k < 7; k++) {
      const a = Math.PI + (k / 6) * Math.PI;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * z * 0.9, Math.sin(a) * z * 0.8 + z * 0.05, z * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, -z * 1.05, z * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,170,190,.5)';
    ctx.beginPath();
    ctx.arc(-z * 0.1, -z * 1.1, z * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
  if (who === 1) {
    // 빨간 모자
    ctx.fillStyle = '#e03131';
    ctx.beginPath();
    ctx.ellipse(0, -z * 0.45, z * 0.98, z * 0.62, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#c92a2a';
    ctx.beginPath();
    ctx.ellipse(-z * 0.55, -z * 0.42, z * 0.7, z * 0.16, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -z * 1.02, z * 0.1, 0, Math.PI * 2);
    ctx.fill();
  }
  // 볼
  if (who !== 3 || mood !== 'calm') {
    ctx.fillStyle = mood === 'angry' ? 'rgba(255,60,60,.55)' : 'rgba(255,140,160,.5)';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * z * 0.55, z * 0.3, z * 0.17, z * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 눈
  const ink = '#2b1d14';
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = Math.max(1.5, z * 0.1);
  ctx.lineCap = 'round';
  const blink = mood === 'calm' && t % 170 < 6;
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.35, ey = -z * 0.05;
    if (mood === 'happy' || blink) {
      ctx.beginPath();
      ctx.arc(ex, ey + z * 0.06, z * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 'shock') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.ellipse(ex, ey, z * 0.08, z * 0.11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex - z * 0.025, ey - z * 0.04, z * 0.03, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
    }
    if (mood === 'angry') {
      ctx.beginPath();
      ctx.moveTo(ex - sd * z * 0.18, ey - z * 0.3);
      ctx.lineTo(ex + sd * z * 0.12, ey - z * 0.2);
      ctx.stroke();
    }
    if (mood === 'shock') {
      ctx.beginPath();
      ctx.moveTo(ex - z * 0.16, ey - z * 0.4);
      ctx.lineTo(ex + z * 0.14, ey - z * 0.44);
      ctx.stroke();
    }
  }
  if (who === 0) {
    // 동그란 안경
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = Math.max(1, z * 0.06);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * z * 0.35, -z * 0.05, z * 0.26, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-z * 0.1, -z * 0.08);
    ctx.lineTo(z * 0.1, -z * 0.08);
    ctx.stroke();
  }
  // 입·코·부리
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.5, z * 0.09);
  if (who === 3) {
    ctx.fillStyle = '#ff922b';
    ctx.beginPath();
    const open = mood === 'shock' || mood === 'happy' ? z * 0.12 : 0;
    ctx.moveTo(-z * 0.18, z * 0.2);
    ctx.lineTo(z * 0.18, z * 0.2);
    ctx.lineTo(0, z * 0.42 + open);
    ctx.closePath();
    ctx.fill();
    if (open) (ctx.fillStyle = '#c2410c'), ctx.fillRect(-z * 0.08, z * 0.25, z * 0.16, open * 0.6);
  } else {
    if (who === 2) {
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath();
      ctx.moveTo(-z * 0.08, z * 0.14);
      ctx.lineTo(z * 0.08, z * 0.14);
      ctx.lineTo(0, z * 0.24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(60,30,10,.6)';
      ctx.lineWidth = Math.max(1, z * 0.04);
      for (const sd of [-1, 1])
        for (const dy of [-0.04, 0.06]) {
          ctx.beginPath();
          ctx.moveTo(sd * z * 0.3, z * (0.25 + dy));
          ctx.lineTo(sd * z * 0.95, z * (0.2 + dy * 2.5));
          ctx.stroke();
        }
      ctx.strokeStyle = ink;
      ctx.lineWidth = Math.max(1.5, z * 0.08);
    }
    const my = z * 0.42;
    ctx.beginPath();
    if (mood === 'happy') {
      ctx.fillStyle = '#8a2b2b';
      ctx.moveTo(-z * 0.24, my - z * 0.04);
      ctx.quadraticCurveTo(0, my + z * 0.32, z * 0.24, my - z * 0.04);
      ctx.closePath();
      ctx.fill();
    } else if (mood === 'shock') {
      ctx.fillStyle = '#8a2b2b';
      ctx.ellipse(0, my + z * 0.04, z * 0.12, z * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'angry') {
      ctx.moveTo(-z * 0.2, my + z * 0.08);
      ctx.quadraticCurveTo(0, my - z * 0.1, z * 0.2, my + z * 0.08);
      ctx.stroke();
    } else {
      ctx.moveTo(-z * 0.14, my);
      ctx.quadraticCurveTo(0, my + z * 0.1, z * 0.14, my);
      ctx.stroke();
    }
  }
  if (mood === 'shock') {
    // 땀방울
    ctx.fillStyle = '#74c0fc';
    ctx.beginPath();
    ctx.moveTo(z * 0.85, -z * 0.55);
    ctx.quadraticCurveTo(z * 1.05, -z * 0.2, z * 0.85, -z * 0.15);
    ctx.quadraticCurveTo(z * 0.65, -z * 0.2, z * 0.85, -z * 0.55);
    ctx.fill();
  }
  if (mood === 'angry') {
    // 화난 김
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(1.5, z * 0.08);
    for (const sd of [-1, 1]) {
      const ph = (t * 0.08 + (sd > 0 ? 0.5 : 0)) % 1;
      ctx.globalAlpha = 1 - ph;
      ctx.beginPath();
      ctx.arc(sd * z * (0.9 + ph * 0.4), -z * (0.9 + ph * 0.6), z * 0.15, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 계산대 직원 오리. x,y = 머리 가운데, z = 머리 반지름 */
function drawDuck(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: string, t: number, scan: boolean) {
  ctx.save();
  const jump = mood === 'shock' ? -z * 0.35 : 0;
  ctx.translate(x, y + jump + Math.sin(t * 0.06) * z * 0.04);
  // 몸 + 앞치마
  const bg = ctx.createLinearGradient(0, z * 0.5, 0, z * 3);
  bg.addColorStop(0, '#ffe066');
  bg.addColorStop(1, '#f2b705');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, z * 1.9, z * 1.15, z * 1.3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2f9e44';
  ctx.beginPath();
  ctx.roundRect(-z * 0.65, z * 1.1, z * 1.3, z * 1.6, z * 0.25);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(z * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('척척', 0, z * 1.55);
  // 날개
  for (const sd of [-1, 1]) {
    const flap = mood === 'shock' ? Math.sin(t * 1.2) * 0.6 - 0.6 : scan && sd < 0 ? -0.5 : 0;
    ctx.save();
    ctx.translate(sd * z * 1.0, z * 1.4);
    ctx.rotate(sd * (0.3 + flap));
    ctx.fillStyle = '#f5c400';
    ctx.beginPath();
    ctx.ellipse(0, z * 0.4, z * 0.32, z * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 머리
  const hg = ctx.createRadialGradient(-z * 0.3, -z * 0.35, z * 0.1, 0, 0, z * 1.05);
  hg.addColorStop(0, '#fff3a3');
  hg.addColorStop(1, '#f2c200');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, 0, z, 0, Math.PI * 2);
  ctx.fill();
  // 모자 (초록 챙)
  ctx.fillStyle = '#2f9e44';
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.55, z * 0.85, z * 0.42, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#237a35';
  ctx.beginPath();
  ctx.ellipse(z * 0.35, -z * 0.52, z * 0.75, z * 0.13, 0.08, 0, Math.PI * 2);
  ctx.fill();
  // 눈
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.38, ey = -z * 0.05;
    if (mood === 'dizzy') {
      ctx.strokeStyle = '#2b1d14';
      ctx.lineWidth = Math.max(1.2, z * 0.07);
      ctx.beginPath();
      for (let a = 0; a < 10; a++) {
        const r = z * 0.03 * a * 0.7, an = a * 0.9 + t * 0.2 * sd;
        ctx.lineTo(ex + Math.cos(an) * r, ey + Math.sin(an) * r);
      }
      ctx.stroke();
    } else {
      const big = mood === 'shock' ? 1.7 : 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.17 * big, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b1d14';
      ctx.beginPath();
      ctx.arc(ex + z * 0.03, ey + z * 0.02, z * 0.09 * (mood === 'shock' ? 0.7 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 부리 (놀라면 쩍)
  const open = mood === 'shock' ? z * 0.32 : scan ? z * 0.12 : 0;
  ctx.fillStyle = '#ff922b';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.3, z * 0.5, z * 0.17, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f76707';
  ctx.beginPath();
  ctx.ellipse(0, z * 0.32 + open, z * 0.42, z * 0.13, 0, 0, Math.PI);
  ctx.fill();
  if (open) (ctx.fillStyle = '#7a2e0a'), ctx.fillRect(-z * 0.3, z * 0.3, z * 0.6, open);
  if (mood === 'dizzy') {
    ctx.fillStyle = '#ffd43b';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.1 + (k * Math.PI * 2) / 3;
      star(ctx, Math.cos(a) * z * 0.9, -z * 1.15 + Math.sin(a) * z * 0.25, z * 0.18);
    }
  }
  ctx.restore();
}

/** 봉투(또는 상자) 하나: 단면이라 쌓인 순서가 보인다 */
function drawBin(ctx: CanvasRenderingContext2D, s: GroState, bin: Bin, side: number, U: number, o: { dx?: number; dy?: number; closed?: number; alpha?: number; prev?: ReturnType<typeof preview> | null; ghost?: number }) {
  const X = (v: number) => v * U;
  const cx = BX[side] + (o.dx ?? 0), bot = BY + (o.dy ?? 0), top = bot - bin.cap * SH - 0.03, hw = BW / 2;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  // 물건이 떨어지면 봉투가 출렁 (무거울수록 크게)
  const last = bin.items[bin.items.length - 1], la = last ? s.t - last.t - FLY : 99;
  if (!o.closed && la >= 0 && la < 12) {
    const q = Math.sin((la / 12) * Math.PI) * (0.02 + 0.012 * KINDS[last.k].w);
    ctx.translate(X(cx), X(bot));
    ctx.scale(1 + q, 1 - q);
    ctx.translate(-X(cx), -X(bot));
  }
  // 바닥 그림자
  ctx.fillStyle = 'rgba(40,20,5,.35)';
  ctx.beginPath();
  ctx.ellipse(X(cx + 0.01), X(bot + 0.005), X(hw * 1.08), X(0.022), 0, 0, Math.PI * 2);
  ctx.fill();
  const base = bin.box ? '#d9a35b' : '#c99a62';
  // 옆면 (두께) + 뒤쪽 입구 (3/4 시점: 위에서 살짝 내려다본다)
  const dep = 0.022;
  ctx.fillStyle = mix(base, '#3a200c', 0.42);
  ctx.beginPath();
  ctx.moveTo(X(cx + hw), X(top));
  ctx.lineTo(X(cx + hw + dep), X(top - dep));
  ctx.lineTo(X(cx + hw + dep), X(bot - dep));
  ctx.lineTo(X(cx + hw), X(bot));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = mix(base, '#2a1606', 0.55);
  ctx.beginPath();
  ctx.moveTo(X(cx - hw), X(top));
  ctx.lineTo(X(cx - hw + dep), X(top - dep));
  ctx.lineTo(X(cx + hw + dep), X(top - dep));
  ctx.lineTo(X(cx + hw), X(top));
  ctx.closePath();
  ctx.fill();
  // 바깥 (종이/골판지)
  const g = ctx.createLinearGradient(X(cx - hw), 0, X(cx + hw), 0);
  g.addColorStop(0, mix(base, '#fff2dc', 0.25));
  g.addColorStop(0.5, base);
  g.addColorStop(1, mix(base, '#4a2a10', 0.3));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(X(cx - hw), X(top), X(BW), X(bot - top), X(0.012));
  ctx.fill();
  // 안쪽 (어두운 단면)
  const ig = ctx.createLinearGradient(0, X(top), 0, X(bot));
  ig.addColorStop(0, mix(base, '#3a200c', 0.45));
  ig.addColorStop(1, mix(base, '#1e0f05', 0.62));
  ctx.fillStyle = ig;
  const ix = cx - hw + 0.022, iw = BW - 0.044, iy = top + 0.016, ih = bot - top - 0.03;
  ctx.beginPath();
  ctx.roundRect(X(ix), X(iy), X(iw), X(ih), X(0.008));
  ctx.fill();
  // 칸 선 (몇 칸 남았나)
  ctx.strokeStyle = 'rgba(255,230,190,.12)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let j = 1; j < bin.cap; j++) {
    ctx.beginPath();
    ctx.moveTo(X(ix + 0.01), X(bot - 0.014 - j * SH));
    ctx.lineTo(X(ix + iw - 0.01), X(bot - 0.014 - j * SH));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 종이 접힌 자국
  ctx.strokeStyle = 'rgba(255,240,215,.25)';
  ctx.lineWidth = 1.5;
  for (const fx of [cx - hw + 0.011, cx + hw - 0.011]) {
    ctx.beginPath();
    ctx.moveTo(X(fx), X(top + 0.02));
    ctx.lineTo(X(fx), X(bot - 0.01));
    ctx.stroke();
  }
  // 깨진 물건이 봉투 안쪽 벽에 남긴 얼룩 (흘러내린다)
  bin.items.forEach((it, j) => {
    if ((it.r !== 1 && it.r !== 2) || (s.t - it.rt < FLY && !o.closed)) return;
    const y = X(bot - 0.014 - SH * (j + 0.5)), c = it.r === 2 ? '#ffc9de' : it.k === 4 ? '#ffd43b' : KINDS[it.k].splat, sd = it.cid * 7 + j;
    ctx.globalAlpha = (o.alpha ?? 1) * 0.55;
    ctx.fillStyle = c;
    for (let q = 0; q < 5; q++) {
      blob(ctx, X(cx + (hsh(sd + q) - 0.5) * (BW - 0.08)), y - X(0.02 + hsh(sd + q * 2) * 0.05), X(0.018 + 0.02 * hsh(sd + q * 3)), X(0.014 + 0.016 * hsh(sd + q * 5)), sd + q);
      ctx.fill();
    }
    const run = Math.min(1, (s.t - it.t) / 90 + 0.2);
    for (let q = 0; q < 3; q++) {
      const dx = X(cx + (hsh(sd + q * 7) - 0.5) * (BW - 0.1));
      ctx.beginPath();
      ctx.roundRect(dx - X(0.005), y, X(0.01), X(SH * (0.5 + j * 0.6) * run * (0.5 + hsh(sd + q))), X(0.005));
      ctx.fill();
    }
    ctx.globalAlpha = o.alpha ?? 1;
  });
  // 물건
  const prevBad = new Set(o.prev?.bad ?? []);
  bin.items.forEach((it, j) => {
    const fly = s.t - it.t;
    let x = X(cx), y = X(bot - 0.014 - SH * (j + 0.5));
    if (fly < FLY && !o.closed) {
      const p = fly / FLY, sx = X(it.fx), sy = X(BELT_Y);
      x = sx + (x - sx) * p;
      y = sy + (y - sy) * p - Math.sin(p * Math.PI) * X(0.12);
    }
    drawItem(ctx, it.k, x, y, X(0.08), U, { r: s.t - it.rt >= FLY || o.closed ? it.r : 0, t: s.t - it.t, tags: true, load: loadOn(bin.items, j), risk: prevBad.has(j), seed: it.cid * 13 + j * 5 + it.k });
  });
  // 미리 보기: 다음 칸에 반투명으로
  if (o.ghost !== undefined && o.ghost >= 0 && bin.items.length < bin.cap) {
    const y = X(bot - 0.014 - SH * (bin.items.length + 0.5));
    ctx.strokeStyle = 'rgba(255,240,200,.55)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(X(cx - 0.06), y - X(SH * 0.46), X(0.12), X(SH * 0.92), X(0.015));
    ctx.stroke();
    ctx.setLineDash([]);
    drawItem(ctx, o.ghost, X(cx), y, X(0.07), U, { t: s.t, alpha: 0.38 });
  }
  // 앞 테두리 (종이 끝 톱니 / 상자 날개)
  if (bin.box) {
    ctx.fillStyle = mix(base, '#fff2dc', 0.15);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(X(cx + sd * hw), X(top));
      ctx.lineTo(X(cx + sd * (hw + 0.05)), X(top - 0.045));
      ctx.lineTo(X(cx + sd * (hw - 0.07)), X(top - 0.05));
      ctx.lineTo(X(cx + sd * (hw - 0.08)), X(top));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = mix(base, '#fff2dc', 0.3);
    ctx.fillRect(X(cx - hw), X(top), X(BW), X(0.02));
    ctx.fillStyle = 'rgba(255,240,200,.55)';
    ctx.fillRect(X(cx - 0.03), X(top), X(0.06), X(0.02));
    ctx.fillStyle = mix(base, '#3a200c', 0.55);
    ctx.font = `900 ${Math.round(U * 0.036)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦6칸', X(cx - hw + 0.012), X(top + 0.0105));
  } else {
    ctx.fillStyle = mix(base, '#fff2dc', 0.2);
    ctx.beginPath();
    ctx.moveTo(X(cx - hw), X(top + 0.012));
    const n = 12;
    for (let k = 0; k <= n; k++) ctx.lineTo(X(cx - hw + (BW * k) / n), X(top + (k % 2 ? -0.008 : 0.006)));
    ctx.lineTo(X(cx + hw), X(top + 0.02));
    ctx.lineTo(X(cx - hw), X(top + 0.02));
    ctx.closePath();
    ctx.fill();
    // 손잡이
    ctx.strokeStyle = mix(base, '#4a2a10', 0.25);
    ctx.lineWidth = X(0.011);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(X(cx + sd * 0.07), X(top), X(0.045), X(0.05 * (o.closed ? 1.3 : 1)), 0, Math.PI, 0);
      ctx.stroke();
    }
  }
  // 꽉 찬 봉투: 윗부분을 접어 묶는다
  if (o.closed) {
    ctx.fillStyle = mix(base, '#fff2dc', 0.1);
    ctx.beginPath();
    ctx.roundRect(X(cx - hw), X(top - 0.01), X(BW), X(0.06), X(0.01));
    ctx.fill();
    ctx.fillStyle = '#e03131';
    ctx.fillRect(X(cx - 0.02), X(top - 0.01), X(0.04), X(0.06));
  }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: GroState, w: number, h: number, th: Theme) {
  const fx = juice(s), U = w, X = (v: number) => v * U, t = s.t, d = def(s);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(X(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 가게 안쪽 벽 ═════════
  const wall = ctx.createLinearGradient(0, 0, 0, X(0.47));
  wall.addColorStop(0, '#5a3a24');
  wall.addColorStop(0.25, '#f0d3a2');
  wall.addColorStop(1, '#e2b97c');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, X(0.48) + 10);
  // 벽지 세로 줄
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  for (let k = 0; k < 14; k++) ctx.fillRect(X(k / 14), X(0.1), X(0.035), X(0.37));
  // 선반 두 단 (물건이 빼곡)
  const SHELF = ['🥫', '🧃', '🍞', '🥛', '🍎', '🧀', '🍪', '🥕', '🍯', '🧈', '🥤', '🍋', '🥜', '🍫'];
  for (const [sy, row] of [[0.215, 0], [0.335, 1]] as const) {
    for (let k = 0; k < 15; k++) {
      const e = SHELF[Math.floor(hsh(k * 3 + row * 41) * SHELF.length)];
      emoji(ctx, e, X(0.035 + k * 0.068), X(sy - 0.032), X(0.052), 0.95);
    }
    // 가격표
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 15; k += 2) ctx.fillRect(X(0.02 + k * 0.068), X(sy + 0.004), X(0.03), X(0.012));
    const pl = ctx.createLinearGradient(0, X(sy - 0.004), 0, X(sy + 0.018));
    pl.addColorStop(0, '#b07a45');
    pl.addColorStop(1, '#7a4a22');
    ctx.fillStyle = pl;
    ctx.fillRect(0, X(sy - 0.004), w, X(0.01));
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.fillRect(0, X(sy + 0.006), w, X(0.016));
  }
  // 안쪽은 살짝 어둡게 (앞이 또렷하게)
  ctx.fillStyle = 'rgba(70,40,20,.2)';
  ctx.fillRect(0, X(0.085), w, X(0.39));
  // 따뜻한 전등 (빛 번짐)
  for (const lx of [0.2, 0.8]) {
    ctx.strokeStyle = '#3a2618';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(lx), X(0.085));
    ctx.lineTo(X(lx), X(0.115));
    ctx.stroke();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const lg = ctx.createRadialGradient(X(lx), X(0.13), 0, X(lx), X(0.2), X(0.3));
    lg.addColorStop(0, `rgba(255,214,140,${0.42 + 0.04 * Math.sin(t * 0.05 + lx * 9)})`);
    lg.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(X(lx - 0.04), X(0.13));
    ctx.lineTo(X(lx + 0.04), X(0.13));
    ctx.lineTo(X(lx + 0.26), X(0.47));
    ctx.lineTo(X(lx - 0.26), X(0.47));
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#2f6f4f';
    ctx.beginPath();
    ctx.ellipse(X(lx), X(0.125), X(0.05), X(0.024), 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fff3bf';
    ctx.beginPath();
    ctx.arc(X(lx), X(0.128), X(0.013), 0, Math.PI);
    ctx.fill();
  }
  // 선반 위 생쥐 구경꾼: 쪼르르 나와 구경하다 들어간다 (철퍼덕이면 깜짝 뛴다)
  {
    const P = 1100, ph = (t + 300) % P;
    const mx = ph < 160 ? -0.05 + (ph / 160) * 0.42 : ph < 520 ? 0.37 : ph < 700 ? 0.37 + ((ph - 520) / 180) * 0.75 : -1;
    if (mx > -0.06 && mx < 1.1) {
      const boom = s.events.some((e) => (e.kind === 'break' || e.kind === 'flop') && t - e.t - FLY >= 0 && t - e.t - FLY < 40);
      const run = ph < 160 || (ph >= 520 && ph < 700), hop = boom ? Math.abs(Math.sin(t * 0.4)) * X(0.03) : run ? Math.abs(Math.sin(t * 0.6)) * X(0.006) : 0;
      ctx.save();
      ctx.translate(X(mx), X(0.316) - hop);
      ctx.scale(-1, 1);
      emoji(ctx, '🐁', 0, 0, X(0.05));
      ctx.restore();
      if (boom || (!run && ph % 160 < 50)) {
        font(0.036, 900);
        ctx.fillStyle = boom ? '#e03131' : '#5c3d20';
        ctx.textAlign = 'center';
        ctx.fillText(boom ? '찍!?' : '…!', X(mx), X(0.27) - hop);
      }
    }
  }
  // ═════════ 줄 선 손님들 (다음 손님 둘) ═════════
  for (let q = 2; q >= 1; q--) {
    const st = s.stage + q;
    if (st >= STAGES.length) continue;
    const qx0 = 0.99 + (q - 1) * 0.09, bob = Math.sin(t * 0.05 + q) * 0.004;
    ctx.globalAlpha = 0.85;
    drawCustomer(ctx, STAGES[st].who, X(qx0), X(0.3 + bob), X(0.04), 'calm', t + q * 50, false);
    ctx.globalAlpha = 1;
  }
  // ═════════ 손님 ═════════
  const who = d.who, walk = Math.max(0, 1 - s.pt / 32) * (s.phase === 'play' && s.pt < 40 ? 1 : 0);
  const leave = s.phase === 'result' && s.ok ? Math.max(0, (s.pt - (RES_OK - 40)) / 40) : 0;
  const cmood: Mood = s.phase === 'result' ? (s.ok ? (s.got >= 2 ? 'happy' : 'calm') : 'angry') : t >= s.mood.t && t - s.mood.t < 70 ? (s.mood.m as Mood) : 'calm';
  const custX = 0.79 + walk * 0.35 - leave * 0.9;
  drawCustomer(ctx, who, X(custX), X(0.29), X(0.075), cmood, t);
  // 손님 장바구니 (아직 벨트에 안 올린 물건이 보인다)
  {
    const bx = custX + 0.02, by = 0.415, rest = s.phase === 'play' ? s.list.slice(s.qi + 2) : [];
    if (rest.length) {
      rest.slice(0, 6).forEach((k, j) => emoji(ctx, KINDS[k].e, X(bx - 0.075 + (j % 3) * 0.05 + (j > 2 ? 0.025 : 0)), X(by - 0.03 - (j > 2 ? 0.025 : 0)), X(0.042)));
      ctx.fillStyle = '#c92a2a';
      ctx.beginPath();
      ctx.roundRect(X(bx - 0.1), X(by - 0.022), X(0.2), X(0.06), X(0.012));
      ctx.fill();
      ctx.strokeStyle = '#8a1c1c';
      ctx.lineWidth = 1.5;
      for (let k = 1; k < 5; k++) {
        ctx.beginPath();
        ctx.moveTo(X(bx - 0.1 + k * 0.04), X(by - 0.022));
        ctx.lineTo(X(bx - 0.1 + k * 0.04), X(by + 0.038));
        ctx.stroke();
      }
      font(0.036, 900);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`남은 ${rest.length}`, X(bx), X(by + 0.012));
    }
  }
  // ═════════ 오리 직원 + 계산기 ═════════
  const dmood = t >= s.duck.t && t - s.duck.t < 60 ? s.duck.m : 'calm', scanning = s.cur >= 0 && t - s.curAt >= ROLL && t - s.curAt < ROLL + 10;
  drawDuck(ctx, X(0.12), X(0.285), X(0.058), dmood, t, scanning);
  {
    const rx = 0.2, ry = 0.36;
    ctx.fillStyle = '#495057';
    ctx.beginPath();
    ctx.roundRect(X(rx), X(ry), X(0.15), X(0.085), X(0.012));
    ctx.fill();
    ctx.fillStyle = '#343a40';
    ctx.fillRect(X(rx + 0.01), X(ry + 0.055), X(0.13), X(0.02));
    ctx.fillStyle = scanning ? '#b2f2bb' : '#69db7c';
    ctx.beginPath();
    ctx.roundRect(X(rx + 0.015), X(ry + 0.012), X(0.12), X(0.036), X(0.006));
    ctx.fill();
    ctx.fillStyle = '#1b4332';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scanning ? '삑!' : `₩${s.pts}`, X(rx + 0.075), X(ry + 0.031));
  }
  // ═════════ 계산대 + 벨트 ═════════
  const ct = ctx.createLinearGradient(0, X(0.445), 0, X(0.6));
  ct.addColorStop(0, '#d9dde2');
  ct.addColorStop(1, '#b6bcc4');
  ctx.fillStyle = ct;
  ctx.fillRect(0, X(0.445), w, X(0.16));
  ctx.fillStyle = '#7c4a26';
  ctx.fillRect(0, X(0.6), w, X(0.03));
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(0, X(0.628), w, X(0.012));
  // 미끄럼판 (벨트 끝 → 왼쪽 봉투)
  const sg = ctx.createLinearGradient(0, X(0.48), 0, X(0.59));
  sg.addColorStop(0, '#eef1f4');
  sg.addColorStop(1, '#a8b0ba');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.moveTo(X(0.42), X(0.48));
  ctx.lineTo(X(0.06), X(0.5));
  ctx.lineTo(X(0.06), X(0.59));
  ctx.lineTo(X(0.42), X(0.59));
  ctx.fill();
  ctx.fillStyle = 'rgba(80,90,100,.5)';
  font(0.036, 800);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('◀ 끝까지 가면 왼쪽', X(0.07), X(0.572));
  // 고무 벨트
  const bx0 = 0.58, by0 = 0.478, by1 = 0.592;
  const bg = ctx.createLinearGradient(0, X(by0), 0, X(by1));
  bg.addColorStop(0, '#3d3f44');
  bg.addColorStop(1, '#1d1e22');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(X(bx0), X(by0), X(1.05 - bx0), X(by1 - by0), X(0.05));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.07)';
  ctx.lineWidth = 2;
  const off = (t * 0.004) % 0.04;
  for (let x = bx0 + 0.03 - off; x < 1.05; x += 0.04) {
    if (x < bx0 + 0.02) continue;
    ctx.beginPath();
    ctx.moveTo(X(x), X(by0 + 0.008));
    ctx.lineTo(X(x - 0.01), X(by1 - 0.008));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(X(bx0 + 0.04), X(by0 + 0.004), X(1), X(0.006));
  // 크롬 난간
  for (const ry of [0.47, 0.598]) {
    const rg = ctx.createLinearGradient(0, X(ry - 0.006), 0, X(ry + 0.006));
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(1, '#8c949e');
    ctx.fillStyle = rg;
    ctx.fillRect(X(0.42), X(ry - 0.005), w, X(0.01));
  }
  // 스캐너 유리 (삑 할 때 빨간 빛)
  ctx.fillStyle = '#1b2b3a';
  ctx.beginPath();
  ctx.roundRect(X(0.43), X(0.484), X(0.14), X(0.1), X(0.012));
  ctx.fill();
  const scanGlow = scanning ? 1 : 0.35 + 0.15 * Math.sin(t * 0.2);
  ctx.strokeStyle = `rgba(255,60,60,${scanGlow})`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(0.445), X(0.534));
  ctx.lineTo(X(0.555), X(0.534));
  ctx.stroke();
  ctx.fillStyle = `rgba(255,80,80,${scanGlow * 0.25})`;
  ctx.fillRect(X(0.44), X(0.522), X(0.12), X(0.024));
  ctx.strokeStyle = 'rgba(140,200,255,.18)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(X(0.43 + k * 0.035), X(0.488));
    ctx.lineTo(X(0.43 + k * 0.035), X(0.58));
    ctx.stroke();
  }
  // 벨트 위 물건: 다음 둘 (+ 뒤에 하나 살짝)
  if (s.phase === 'play') {
    const age = t - s.curAt, slide = s.curFromShelf || age >= ROLL ? 0 : Math.max(0, 1 - Math.max(0, age) / ROLL);
    for (let q = 3; q >= 1; q--) {
      const k = s.list[s.qi + q - 1];
      if (k === undefined) continue;
      drawItem(ctx, k, X(qx(q) + slide * QGAP), X(BELT_Y), X(0.085), U, { t, tags: q < 3, alpha: q === 3 ? 0.7 : 1 });
    }
    if (q1Label(s)) {
      font(0.036, 900);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('▲ 다음', X(qx(1) + slide * QGAP), X(0.614));
    }
  }
  // ═════════ 봉투 놓는 나무 받침대 ═════════
  // 포장대: 연두색 타일 (종이봉투·상자가 또렷하게)
  const wood = ctx.createLinearGradient(0, X(0.64), 0, X(1.4));
  wood.addColorStop(0, '#4f7a62');
  wood.addColorStop(0.12, '#86b496');
  wood.addColorStop(1, '#5c8a6c');
  ctx.fillStyle = wood;
  ctx.fillRect(0, X(0.64), w, X(0.76));
  // 원근 타일: 아래로 갈수록 칸이 커진다
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  for (let k = 0, y = 0.665; y < 1.4; k++, y += 0.05 + k * 0.012) {
    ctx.beginPath();
    ctx.moveTo(0, X(y));
    ctx.lineTo(w, X(y));
    ctx.stroke();
  }
  for (let k = -8; k <= 8; k++) {
    ctx.beginPath();
    ctx.moveTo(X(0.5 + k * 0.07), X(0.665));
    ctx.lineTo(X(0.5 + k * 0.13), X(1.4));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(30,50,40,.35)';
  ctx.fillRect(0, X(0.64), w, X(0.025));
  // 따뜻한 조명 웅덩이
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const lx of [0.25, 0.75]) {
    const pg = ctx.createRadialGradient(X(lx), X(1.15), 0, X(lx), X(1.15), X(0.38));
    pg.addColorStop(0, 'rgba(255,200,120,.16)');
    pg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = pg;
    ctx.fillRect(0, X(0.7), w, X(0.7));
  }
  ctx.restore();
  // 손님 카트 (꽉 찬 봉투가 날아와 담긴다)
  {
    const cx = X(CART.x), cy = X(CART.y), cw = X(0.2), chh = X(0.1);
    ctx.fillStyle = 'rgba(40,20,5,.28)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + chh + X(0.035), cw * 0.55, X(0.012), 0, 0, Math.PI * 2);
    ctx.fill();
    // 카트 안 봉투
    const n = s.cartBags;
    for (let k = 0; k < Math.min(n, 4); k++) {
      const bxk = cx + (k - (Math.min(n, 4) - 1) / 2) * X(0.045), age = t - (s.leaving[s.leaving.length - Math.min(n, 4) + k]?.t ?? -99);
      const pop = age >= 16 && age < 26 ? Math.sin(((age - 16) / 10) * Math.PI) * X(0.012) : 0;
      ctx.fillStyle = '#c99a62';
      ctx.fillRect(bxk - X(0.022), cy - X(0.03) - pop, X(0.044), X(0.07));
      ctx.fillStyle = '#e0bd8c';
      ctx.fillRect(bxk - X(0.022), cy - X(0.04) - pop, X(0.044), X(0.014));
      ctx.fillStyle = '#e03131';
      ctx.fillRect(bxk - X(0.005), cy - X(0.04) - pop, X(0.01), X(0.014));
    }
    // 철망 바구니
    ctx.strokeStyle = '#ced4da';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - cw / 2, cy);
    ctx.lineTo(cx + cw / 2, cy);
    ctx.lineTo(cx + cw * 0.4, cy + chh);
    ctx.lineTo(cx - cw * 0.4, cy + chh);
    ctx.closePath();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(206,212,218,.7)';
    for (let k = 1; k < 6; k++) {
      const u = k / 6;
      ctx.beginPath();
      ctx.moveTo(cx - cw / 2 + cw * u, cy);
      ctx.lineTo(cx - cw * 0.4 + cw * 0.8 * u, cy + chh);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.45, cy + chh / 2);
    ctx.lineTo(cx + cw * 0.45, cy + chh / 2);
    ctx.stroke();
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx + cw / 2, cy);
    ctx.lineTo(cx + cw * 0.62, cy - X(0.04));
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#343a40';
      ctx.beginPath();
      ctx.arc(cx + sd * cw * 0.32, cy + chh + X(0.025), X(0.012), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.32, cy + chh);
    ctx.lineTo(cx - cw * 0.32, cy + chh + X(0.02));
    ctx.moveTo(cx + cw * 0.32, cy + chh);
    ctx.lineTo(cx + cw * 0.32, cy + chh + X(0.02));
    ctx.stroke();
  }
  // 받침 (2번째 손님부터)
  if (s.stage >= 1) {
    const tx = TRAY.x, ty = TRAY.y;
    ctx.fillStyle = 'rgba(40,20,5,.3)';
    ctx.beginPath();
    ctx.ellipse(X(tx), X(ty + 0.07), X(0.07), X(0.012), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#868e96';
    ctx.fillRect(X(tx - 0.006), X(ty + 0.035), X(0.012), X(0.035));
    const tg = ctx.createLinearGradient(0, X(ty + 0.02), 0, X(ty + 0.045));
    tg.addColorStop(0, '#f1f3f5');
    tg.addColorStop(1, '#868e96');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.roundRect(X(tx - 0.085), X(ty + 0.022), X(0.17), X(0.022), X(0.008));
    ctx.fill();
    if (s.shelf >= 0) {
      const p = Math.min(1, (t - s.shelfAt) / FLY), sx = X(s.shelfFx), sy = X(BELT_Y);
      drawItem(ctx, s.shelf, sx + (X(tx) - sx) * p, sy + (X(ty - 0.015) - sy) * p - Math.sin(p * Math.PI) * X(0.06), X(0.074), U, { t, tags: true });
    }
    font(0.036, 900);
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.shelf >= 0 ? '↓ 바꾸기' : '↓ 받침', X(tx), X(ty + 0.095));
  }
  // ═════════ 봉투 둘 (+ 카트로 가는 봉투) ═════════
  const canAct = s.phase === 'play' && s.cur >= 0;
  const prevs = canAct ? [preview(s, 0), preview(s, 1)] : [null, null];
  for (const l of s.leaving) {
    const p = (t - l.t) / 16;
    if (p < 0) drawBin(ctx, s, l.bin, l.side, U, {});
    else if (p < 1) {
      ctx.save();
      const ox = X(BX[l.side]), oy = X(BY), tx = X(CART.x), ty = X(CART.y + 0.06), sc = 1 - 0.75 * p;
      ctx.translate(ox + (tx - ox) * p, oy + (ty - oy) * p - Math.sin(p * Math.PI) * X(0.15));
      ctx.scale(sc, sc);
      ctx.translate(-ox, -oy);
      drawBin(ctx, s, l.bin, l.side, U, { closed: 1 });
      ctx.restore();
    }
  }
  for (const side of [0, 1]) {
    const bin = s.bins[side], slide = bin.t0 === 0 && t < 2 ? 0 : Math.max(0, Math.min(1, 1 - (t - bin.t0 - 5) / 12));
    drawBin(ctx, s, bin, side, U, { dy: slide * slide * 0.5, prev: prevs[side], ghost: canAct && slide === 0 ? s.cur : -1 });
  }
  // 미리 보기 말풍선 (봉투 위)
  for (const side of [0, 1]) {
    const pv = prevs[side];
    if (!pv) continue;
    const bin = s.bins[side], top = BY - bin.cap * SH - 0.03 - (bin.box ? 0.035 : 0.04);
    font(0.038, 900);
    const txt = (side ? '' : '← ') + pv.text + (side ? ' →' : ''), tw = ctx.measureText(txt).width + X(0.03);
    const cx = Math.max(tw / 2 + 2, Math.min(w - tw / 2 - 2, X(BX[side])));
    const pulse = pv.kind === 'ok' ? 0 : 0.04 * Math.sin(t * 0.3);
    ctx.save();
    ctx.translate(cx, X(top));
    ctx.scale(1 + pulse, 1 + pulse);
    ctx.fillStyle = pv.kind === 'ok' ? 'rgba(235,251,238,.95)' : 'rgba(255,245,245,.97)';
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -X(0.026), tw, X(0.052), X(0.026));
    ctx.fill();
    ctx.strokeStyle = pv.col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = pv.col;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 0, X(0.002));
    ctx.restore();
  }
  // 바닥에서 퍼덕이는 생선
  for (const f of s.floor) {
    const a = t - f.t;
    if (a < 0) continue;
    const p = Math.min(1, a / 26), sx = X(f.sx), sy = X(f.sy), ex = X(0.5 + (f.from ? 0.05 : -0.05)), ey = X(1.3);
    const x = sx + (ex - sx) * p, y = sy + (ey - sy) * p - Math.sin(p * Math.PI) * X(0.3) - (p >= 1 ? Math.abs(Math.sin(a * 0.25)) * X(0.035) : 0);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(p < 1 ? a * 0.5 : Math.sin(a * 0.5) * 0.6);
    ctx.globalAlpha = a > 200 ? Math.max(0, 1 - (a - 200) / 40) : 1;
    emoji(ctx, KINDS[f.k].e, 0, 0, X(0.075), ctx.globalAlpha);
    ctx.restore();
    if (p >= 1 && a % 30 < 15) {
      font(0.036, 900);
      ctx.fillStyle = '#d0ebff';
      ctx.textAlign = 'center';
      ctx.fillText('퍼덕', x, y - X(0.05));
    }
  }
  // 만화 효과 글자 (철퍼덕! · 주르륵 · 퍼덕!) — 사건 자리에서 펑 커졌다 사라진다
  for (const e of s.events) {
    const a = t - e.t - FLY;
    if (a < 0 || a >= 40 || (e.kind !== 'break' && e.kind !== 'melt' && e.kind !== 'flop')) continue;
    const sc = a < 6 ? 0.3 + 0.9 * (a / 6) : a < 10 ? 1.2 - 0.2 * ((a - 6) / 4) : 1, al = a > 30 ? (40 - a) / 10 : 1;
    const ex = Math.max(X(0.2), Math.min(w - X(0.2), X(e.x) + (e.x < 0.5 ? X(0.05) : -X(0.05)))), ey = X(e.y) - X(0.09);
    const [fill, edge, word] = e.kind === 'break' ? ['#ffd43b', '#e8590c', '철퍼덕!'] : e.kind === 'melt' ? ['#ffdeeb', '#d6336c', '주르륵~'] : ['#d0ebff', '#1971c2', '퍼덕퍼덕!'];
    ctx.save();
    ctx.globalAlpha = al;
    ctx.translate(ex, ey);
    ctx.rotate(-0.08 + (e.kind === 'flop' ? Math.sin(a * 0.6) * 0.1 : 0));
    ctx.scale(sc, sc);
    ctx.beginPath();
    const n = 14, R1 = X(0.15), R2 = X(0.1);
    for (let k = 0; k < n * 2; k++) {
      const an = (k / (n * 2)) * Math.PI * 2, rr = (k % 2 ? R2 : R1) * (0.9 + 0.2 * hsh(k + e.t)) ;
      ctx.lineTo(Math.cos(an) * rr * 1.25, Math.sin(an) * rr * 0.62);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = edge;
    ctx.stroke();
    ctx.font = `900 ${Math.round(X(0.07))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = edge;
    ctx.strokeText(word, 0, X(0.004));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(word, 0, X(0.004));
    ctx.restore();
  }
  // ═════════ 스캐너 위 지금 물건 (맨 위에) ═════════
  if (canAct) {
    const age = t - s.curAt, cx = X(curX(s)), cy = X(BELT_Y) - (s.curFromShelf && age < ROLL ? (1 - age / ROLL) * X(-0.3) : 0);
    const ready = age >= ROLL;
    if (ready) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gg = ctx.createRadialGradient(cx, X(BELT_Y), 0, cx, X(BELT_Y), X(0.08));
      gg.addColorStop(0, 'rgba(255,220,120,.45)');
      gg.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(cx - X(0.09), X(BELT_Y - 0.09), X(0.18), X(0.18));
      ctx.restore();
    }
    const bounce = ready && age < ROLL + 10 ? Math.sin(((age - ROLL) / 10) * Math.PI) * X(0.02) : 0;
    drawItem(ctx, s.cur, cx, cy - bounce, X(0.1), U, { t, tags: true });
    // 이름표
    const K = KINDS[s.cur], lab = `${K.name} · 무게 ${K.w}${K.b < STURDY ? ` · 버팀 ${K.b}` : ''}`;
    font(0.036, 900);
    const lw = ctx.measureText(lab).width + X(0.03), lx = Math.max(lw / 2 + 2, Math.min(w - lw / 2 - 2, cx));
    ctx.fillStyle = 'rgba(30,18,10,.85)';
    ctx.beginPath();
    ctx.roundRect(lx - lw / 2, X(0.418), lw, X(0.046), X(0.023));
    ctx.fill();
    ctx.fillStyle = K.b < STURDY ? '#ffc078' : '#fff3d6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(lab, lx, X(0.442));
    // 늦으면 벨트 끝으로 밀려가는 중
    const dr = (age - ROLL) / drift(s);
    if (ready && dr > 0.25) {
      ctx.strokeStyle = `rgba(255,140,60,${0.4 + 0.4 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, X(BELT_Y), X(0.065), -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - (dr - 0.25) / 0.75));
      ctx.stroke();
    }
  }
  // ═════════ 연출 (사건) ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const at = e.t + (LAND.has(e.kind) ? FLY : 0);
    if (at <= seenT || at > t) continue;
    const x = X(e.x), y = X(e.y);
    if (e.kind === 'place') {
      const wt = KINDS[e.k ?? 0].w;
      if (e.text) fx.pop(x, y - X(0.04), wt >= 3 ? '쿵!' : e.text, wt >= 3 ? '#ffe066' : e.col ?? '#fff3bf', wt >= 3 ? 22 : 16);
      fx.burst(x, y + X(0.03), '#e8c79a', 6 + wt * 4, 1.5 + wt * 0.6, 2);
      fx.kick(1 + wt * 1.4);
      if (s.stage === 0 && s.moves === 1) {
        fx.ring(x, y, '#ffd166', X(0.18), 5);
        for (const c of ['#ffd166', '#ff8787', '#74c0fc']) fx.burst(x, y, c, 10, 4, 2.5);
        fx.pop(X(0.79), X(0.19), '♥', '#ff6b8a', 26);
      }
    }
    if (e.kind === 'break') {
      const c = e.col ?? '#ffd43b';
      fx.burst(x, y, c, 30, 5, 3.5);
      if (e.k === 4) fx.burst(x, y, '#ffffff', 14, 4, 3), fx.burst(x, y, '#ffb700', 10, 6, 4);
      fx.burst(x, y, c, 20, 8, 4.5);
      fx.ring(x, y, c, X(0.2), 6);
      fx.kick(13);
      fx.blink('#ffe8a3', 0.22);
      fx.burst(X(0.12), X(0.3), '#fff3a3', 14, 4, 3);
    }
    if (e.kind === 'melt') {
      fx.burst(x, y, '#ffc9de', 22, 3, 3);
      fx.burst(x, y, '#ffffff', 8, 2, 2);
      fx.kick(5);
    }
    if (e.kind === 'flop') {
      fx.burst(x, y, '#a5d8ff', 22, 4, 2.5);
      fx.kick(7);
    }
    if (e.kind === 'full') {
      fx.ring(x, y, '#ffe8a3', X(0.16), 5);
      fx.burst(x, y, '#e8c79a', 16, 3, 2.5);
      fx.pop(x, y - X(0.03), e.text!, '#ffe8a3', 18);
      fx.kick(3);
    }
    if (e.kind === 'shelf') fx.pop(x, y - X(0.05), e.text!, e.col!, 14), fx.burst(x, y, '#dee2e6', 8, 2, 2);
    if (e.kind === 'scan') fx.ring(x, y, 'rgba(255,90,90,.8)', X(0.07), 2);
    if (e.kind === 'orderbad') fx.kick(3);
    if (e.kind === 'cake') fx.pop(x, y, e.text!, '#ffdeeb', 18), fx.burst(x, y, '#ffdeeb', 24, 4, 3);
    if (e.kind === 'stage') fx.pop(w / 2, X(0.92), e.text!, '#ffffff', 20);
    if (e.kind === 'clear') {
      fx.ring(w / 2, X(0.8), th.accent, X(0.5), 8);
      for (const c of ['#ffd166', '#ff6b6b', '#74c0fc', '#69db7c']) fx.burst(w / 2, X(0.8), c, 14, 6, 3);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(12), fx.blink(th.hot, 0.3);
  }
  fx.memo.t = t;
  ctx.restore();

  // ═════════ HUD ═════════
  const hb = X(0.085);
  ctx.fillStyle = 'rgba(44,26,14,.94)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.046, 900);
  const ttl = `🛒 ${s.stage + 1}번째 손님`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, X(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT} · ${WHO[who]}`, X(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.044, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - X(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - X(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 주문 카드 (가운데 위)
  if (s.phase === 'play' || !s.ok) {
    const ox = 0.215, oy = 0.098, ow = 0.47, oh = 0.088;
    ctx.save();
    const ob = s.events.find((e) => e.kind === 'orderbad'), oa = ob ? t - ob.t : 99;
    ctx.translate(X(ox + ow / 2), X(oy));
    ctx.rotate(-0.02 + (oa < 30 ? Math.sin(oa * 0.9) * 0.06 * (1 - oa / 30) : 0));
    ctx.fillStyle = 'rgba(40,20,5,.3)';
    ctx.fillRect(-X(ow / 2) + 3, 4, X(ow), X(oh));
    ctx.fillStyle = oa < 30 && oa % 8 < 4 ? '#ffe3e3' : '#fffaf0';
    ctx.fillRect(-X(ow / 2), 0, X(ow), X(oh));
    ctx.fillStyle = '#ff8787';
    ctx.beginPath();
    ctx.arc(0, X(0.004), X(0.01), 0, Math.PI * 2);
    ctx.fill();
    font(0.036, 900);
    ctx.fillStyle = '#a5753f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📋 손님 주문', -X(ow / 2 - 0.015), X(0.022));
    ctx.textAlign = 'right';
    ctx.fillStyle = s.obad ? '#e03131' : '#2f9e44';
    ctx.fillText(s.obad ? '✗ 틀렸어요' : '✓ 지키는 중', X(ow / 2 - 0.015), X(0.022));
    font(0.037, 900);
    ctx.fillStyle = '#3b2a1e';
    ctx.textAlign = 'center';
    ctx.fillText(d.order.text, 0, X(0.06));
    if (s.obad) {
      ctx.strokeStyle = 'rgba(224,49,49,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-X(ow / 2 - 0.02), X(0.06));
      ctx.lineTo(X(ow / 2 - 0.02), X(0.06));
      ctx.stroke();
    }
    ctx.restore();
  }
  // ═════════ 손님 한마디 ═════════
  if (s.say && t - s.say.t >= 0 && t - s.say.t < 110) {
    const a = t - s.say.t, sc = a < 8 ? 0.6 + 0.4 * (a / 8) : 1;
    font(0.04, 900);
    const tw = ctx.measureText(s.say.text).width + X(0.04), bxr = X(custX - 0.095), byc = X(0.245);
    ctx.save();
    ctx.translate(bxr - tw / 2, byc);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a > 95 ? (110 - a) / 15 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -X(0.03), tw, X(0.06), X(0.03));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(tw / 2 - X(0.03), X(0.015));
    ctx.lineTo(tw / 2 + X(0.025), X(0.04));
    ctx.lineTo(tw / 2 - X(0.005), -X(0.01));
    ctx.fill();
    ctx.fillStyle = '#3b2a1e';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(s.say.text, 0, X(0.002));
    ctx.restore();
  }
  // 새것 알림 띠
  const nw = s.news.find((n) => t >= n.t && t < n.t + NEWS_T);
  if (nw && s.phase === 'play') {
    const a = t - nw.t, al = Math.min(1, a / 10, (NEWS_T - a) / 15);
    ctx.globalAlpha = al;
    ctx.fillStyle = 'rgba(30,16,8,.88)';
    ctx.fillRect(0, X(0.638), w, X(0.058));
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(0, X(0.638), w, 2);
    ctx.fillRect(0, X(0.694), w, 2);
    font(0.04, 900);
    const nt = '✨ ' + nw.text, nwid = ctx.measureText(nt).width;
    if (nwid > w - 12) font(0.04 * ((w - 12) / nwid), 900);
    ctx.fillStyle = '#fff3d6';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(nt, w / 2, X(0.667));
    ctx.globalAlpha = 1;
  }
  // 아래 띠: 별 셋의 지금 상태
  {
    const y0 = 1.395, chips = [
      { t: `★ 망가짐 ${s.ruined}/${LIMIT}`, ok: s.ruined === 0, warn: s.ruined > 0 },
      { t: `★ 주문 ${s.obad ? '✗' : '✓'}`, ok: !s.obad, warn: s.obad },
      { t: `★ 봉투 ${s.started}/${d.target}`, ok: s.started <= d.target, warn: s.started > d.target },
    ];
    ctx.fillStyle = 'rgba(44,26,14,.94)';
    ctx.fillRect(0, X(y0 - 0.008), w, h - X(y0 - 0.008));
    chips.forEach((c, j) => {
      const cx = X(0.03 + j * 0.318), cw = X(0.3);
      ctx.fillStyle = c.warn ? 'rgba(224,49,49,.25)' : 'rgba(255,209,102,.14)';
      ctx.beginPath();
      ctx.roundRect(cx, X(y0 + 0.012), cw, X(0.07), X(0.035));
      ctx.fill();
      ctx.strokeStyle = c.warn ? '#ff8787' : '#ffd166';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      font(0.038, 900);
      ctx.fillStyle = c.warn ? '#ffa8a8' : '#ffe8a3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(c.t, cx + cw / 2, X(y0 + 0.048));
    });
  }
  // 첫 안내
  if (s.stage === 0 && s.moves === 0 && s.phase === 'play') {
    const bob = Math.sin(t * 0.15) * X(0.01);
    font(0.052, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(40,20,5,.7)';
    ctx.strokeText('👆 ← → 로 밀어서 봉투에 쏙!', w / 2, X(0.76) + bob);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆 ← → 로 밀어서 봉투에 쏙!', w / 2, X(0.76) + bob);
    font(0.038, 800);
    ctx.strokeText('물건 옆 검은 숫자 = 무게', w / 2, X(0.82));
    ctx.fillStyle = '#ffe8a3';
    ctx.fillText('물건 옆 검은 숫자 = 무게', w / 2, X(0.82));
  }
  // 결과: 별 셋이 하나씩
  if (s.phase === 'result') {
    const p = Math.min(1, s.pt / 14);
    ctx.fillStyle = `rgba(20,10,4,${0.55 * p})`;
    ctx.fillRect(0, X(0.64), w, X(0.34));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.056, 900);
    ctx.fillStyle = s.ok ? '#ffd166' : '#ff8787';
    ctx.fillText(s.ok ? `${WHO[who]} 장보기 끝!` : `망가진 게 ${LIMIT}개…`, w / 2, X(0.7));
    if (s.ok) {
      const labels = ['안 망가짐', '주문 지킴', '봉투 적게'];
      for (let j = 0; j < 3; j++) {
        const a = s.pt - 16 - j * 14;
        if (a < 0) continue;
        const sc = a < 10 ? 0.4 + 0.9 * Math.sin((a / 10) * Math.PI * 0.5) : 1, sx = X(0.22 + j * 0.28);
        ctx.save();
        ctx.translate(sx, X(0.79));
        ctx.scale(sc, sc);
        ctx.fillStyle = s.gotFlags[j] ? '#ffd166' : 'rgba(255,255,255,.18)';
        star(ctx, 0, 0, X(0.06));
        ctx.restore();
        font(0.037, 900);
        ctx.fillStyle = s.gotFlags[j] ? '#fff3d6' : 'rgba(255,255,255,.45)';
        ctx.fillText(labels[j], sx, X(0.88));
      }
    } else {
      font(0.042, 900);
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 손님을 다시 담아요' : '오늘 장사 끝!', w / 2, X(0.8));
      font(0.04, 800);
      ctx.fillStyle = '#ffc9c9';
      ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(3 - Math.max(0, s.hearts)), w / 2, X(0.88));
    }
  }
}
/** 물건이 봉투에 떨어지는 순간(FLY 뒤)에 터지는 사건 */
const LAND = new Set(['place', 'break', 'melt', 'flop', 'full']);
const q1Label = (s: GroState) => s.stage === 0 && s.served === 0 && s.qi <= 3;
