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

const A = 1.42;
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
  { who: 2, items: [10, 10, 0, 8, 9, 4, 2, 3, 1, 5], first: FISHK, order: { type: 'side', kind: FISHK, side: 0, text: '🐟 생선은 왼쪽 봉투에 냥' }, target: 3 },
  { who: 3, items: [11, 11, 6, 7, 4, 5, 2, 3, 3, 1, 0], first: ICE, order: { type: 'together', tag: COLD, text: '🍦 아이스크림은 한 봉투에 꽥' }, target: 3 },
  { who: 0, items: [13, 13, 12, 4, 4, 6, 8, 2, 3, 1, 0], first: MELON, order: { type: 'side', kind: MELON, side: 1, text: '🍉 수박은 오른쪽 봉투에' }, target: 3 },
  { who: 1, box: true, items: [5, 5, 4, 4, 11, 6, 12, 2, 2, 3, 3, 0, 1], order: { type: 'side', kind: CHIPS, side: 1, text: '🍪 과자는 다 상자에!' }, target: 3 },
  { who: 2, box: true, items: [14, 14, 10, 9, 8, 4, 13, 11, 6, 2, 3, 3, 1], first: CAKE, order: { type: 'side', kind: FISHK, side: 0, text: '🐟 생선은 왼쪽 봉투에 냥' }, target: 3 },
  { who: 3, box: true, fast: true, items: [14, 10, 11, 11, 7, 6, 4, 4, 13, 12, 9, 2, 3, 3], order: { type: 'together', tag: COLD, text: '🍦 차가운 건 한 봉투에 꽥' }, target: 4 },
];
export const STAGE_COUNT = STAGES.length;
/** 망가진 게 이만큼 되면 그 손님은 실패 */
const LIMIT = 3;
const BAG_CAP = 4, BOX_CAP = 6;
/** 시간(틱): 손님 들어옴 · 물건이 스캐너까지 굴러옴 · 벨트 끝까지 밀려가 저절로 왼쪽으로 · 결과 */
const INTRO = 40, ROLL = 18, DRIFT = 420, DRIFT_FAST = 300, RES_OK = 150, RES_FAIL = 160, FLY = 16;
const STAR_PTS = 100, CLEAR_PTS = 50, CAKE_PTS = 60, WIN_PTS = 100;

const match = (o: Order, k: number) => (o.kind !== undefined ? k === o.kind : (KINDS[k].tag & (o.tag ?? 0)) !== 0);

// ───────────────────────────── 규칙 (봇이 내다볼 때도 같은 함수) ─────────────────────────────
/** 봉투 속 물건. r: 0 멀쩡 · 1 깨짐 · 2 녹음 */
export interface It { k: number; r: number; t: number; fx: number; cid: number }
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
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; dead: boolean; won: boolean;
  /** 그리기용: 꽉 차서 카트로 가는 봉투 · 바닥에서 퍼덕이는 생선 · 손님 한마디 · 기분 */
  leaving: { bin: Bin; side: number; t: number }[]; floor: { k: number; x: number; t: number; from: number }[];
  say: { text: string; t: number; duck?: boolean } | null; mood: { m: string; t: number }; duck: { m: string; t: number };
  cartBags: number;
}

const ev = (s: GroState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, k?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, k });
function see(s: GroState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news = { text, t: s.t };
}
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
export const BX = [0.245, 0.755], BW = 0.29, SH = 0.086, BY = 1.295;
const TRAY = { x: 0.5, y: 0.83 };
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
  see(s, 'bag', '🛍️ ← → 로 밀면 그쪽 봉투에 쏙!');
  see(s, 'order', '📋 손님 주문 카드 — 지키면 별 하나');
  const has = (f: (k: number) => boolean) => d.items.some(f);
  if (has((k) => KINDS[k].b < STURDY && !(KINDS[k].tag & SALE))) see(s, 'fragile', '🥚 깨지는 것 — 위 무게가 버팀 숫자보다 크면 철퍼덕!');
  if (s.stage >= 1) see(s, 'shelf', '⬇️ 받침 — 아래로 밀면 잠깐 내려 둬요(한 칸)');
  if (has((k) => !!(KINDS[k].tag & FISH))) see(s, 'fish', '🐟 생선 — 과일과 같은 봉투면 퍼덕 튀어나와요');
  if (has((k) => !!(KINDS[k].tag & COLD))) see(s, 'cold', '🍦 차가운 것 — 따뜻한 빵·치킨과 같은 봉투면 녹아요');
  if (has((k) => KINDS[k].w >= 3)) see(s, 'heavy', '🍉 아주 무거운 것 — 약한 게 없는 봉투 바닥에!');
  if (d.box) see(s, 'box', '📦 상자 — 6칸까지 담겨요 (대신 아래가 더 눌려요)');
  if (has((k) => !!(KINDS[k].tag & SALE))) see(s, 'sale', '✨ 반짝 할인 케이크 — 버팀 0! 봉투 마지막 칸에 담으면 보너스');
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
    s.floor.push({ k, x: bx + (side ? 0.13 : -0.13), t: s.t, from: side });
    ev(s, 'flop', bx, slotY(bin.items.length), '퍼덕!', '#74c0fc', 0, k);
    react(s, 'flop');
    see(s, 'fishflop', '🐟 퍼덕! 생선은 과일과 따로 담아요');
  } else {
    // 튀어나가는 생선 (위에서부터 빼야 번호가 안 꼬인다)
    for (const j of [...r.flopped].sort((a, b) => b - a)) {
      const f = bin.items[j];
      bin.items.splice(j, 1);
      s.packed.splice(s.packed.indexOf(f), 1);
      s.ruined++;
      s.floor.push({ k: f.k, x: bx + (side ? 0.13 : -0.13), t: s.t, from: side });
      ev(s, 'flop', bx, slotY(j), '퍼덕!', '#74c0fc', 0, f.k);
      react(s, 'flop');
    }
    // flopped를 뺀 뒤의 번호로 다시 계산 (깨짐·녹음)
    const r2 = r.flopped.length ? judgeDrop(bin.items, k) : r;
    for (const j of r2.melted) {
      bin.items[j].r = 2;
      s.ruined++;
      ev(s, 'melt', bx, slotY(j), '녹아요!', '#ffc9de', 0, bin.items[j].k);
      react(s, 'melt');
    }
    for (const j of r2.broken) {
      bin.items[j].r = 1;
      s.ruined++;
      ev(s, 'break', bx, slotY(j), '철퍼덕!', KINDS[bin.items[j].k].splat, 0, bin.items[j].k);
      react(s, 'break');
    }
    const it: It = { k, r: r2.selfMelt ? 2 : 0, t: s.t, fx, cid: bin.cid };
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
      s.leaving.push({ bin, side, t: s.t });
      s.cartBags++;
      s.bins[side] = newBin(s, side);
      ev(s, 'full', bx, BY - SH * bin.cap, bin.box ? '상자 꽉!' : '봉투 꽉!', '#ffe8a3', side);
      see(s, 'full', '🛍️ 봉투가 꽉 차면 손님 카트로 — 새 봉투가 와요');
    }
  }
  nextCur(s);
  if (s.ruined >= LIMIT) return endStage(s, false);
  if (s.cur < 0) endStage(s, true);
}

function react(s: GroState, kind: 'break' | 'melt' | 'flop') {
  s.mood = { m: 'shock', t: s.t };
  s.duck = { m: 'shock', t: s.t };
  s.say = { text: line(s, kind), t: s.t };
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
  genes: ['sort', 'swipe', 'stack'],
  twist: '굴러오는 물건을 왼쪽·오른쪽 봉투로 휙 나눠 담는 분류 놀이인데, 봉투 속은 쌓는 순서가 퍼즐 — 위에 쌓인 무게가 아래 물건의 버팀을 넘는 순간 철퍼덕!',
  rules: [
    '← → 로 밀면 그쪽 봉투에 담겨요. ↓ 는 받침에 잠깐 두기. 봉투가 꽉 차면 새 봉투가 와요.',
    '위에 쌓인 무게가 아래 물건의 버팀(🥚1 🍞2 …)보다 크면 철퍼덕! 봉투 위 미리 보기를 보세요.',
    '안 망가짐 · 손님 주문 · 봉투 적게 = 별 셋. 3개가 망가지면 그 손님을 다시 받아요.',
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
      pending: null, moves: 0, firstGood: false, seen: new Set<string>(), events: [], news: null, dead: false, won: false,
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
function drawAll(ctx: CanvasRenderingContext2D, s: GroState, w: number, h: number, th: Theme) {
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
  void s;
}
