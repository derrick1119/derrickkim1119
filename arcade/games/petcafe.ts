/**
 * 동물 손님 카페 하루 (34라운드: 하루 계획 경영) — 하루 계획 경영 × 꾸미기 × 가리키기(톡).
 * 장르 뼈대(솔직히): 카페·식당 경영 게임(메뉴 정하기·손님 취향·가게 키우기)은 시장에 많다. 바쁘게 손님마다 눌러 주는
 *   '시간 관리형'과 달리 여기는 **아침 계획 → 하루가 저절로**: 손은 아침에만 쓰고, 하루는 지켜보는 맛이다. 특정 게임의 이름·그림은 쓰지 않았다.
 * 조작(기준 9·11·19): 톡 하나. 아침에 메뉴 카드를 톡(메뉴판에 '착' 붙음, 메뉴판에 있는 걸 다시 톡하면 내림), '가게 키우기'를 톡(산다), '문 열기'를 톡.
 *   하루가 흐르는 동안엔 누를 것이 없다. 아무것도 안 누르면 아침에 그대로 머문다(시간 압박 없음). 키보드는 화살표 커서 + 스페이스(또는 1·2·3 카드).
 * 규칙(결정적): 아침에 오늘 올 손님(들어오는 순서까지)과 이번 주 달력(비·단체·미식가·축제·재료 값)이 보인다.
 *   메뉴판은 세 칸, **새 메뉴는 아침마다 한 가지만**(꽉 차면 제일 오래된 것이 내려감, 내리기는 공짜). 메뉴마다 그날 재료비, 한 접시 여섯 조각.
 *   손님은 차례로 들어와 남은 조각 중 제일 좋아하는 것을 먹는다: 하트(제일 좋아함) = 값 + 팁, 하트가 잇달아 이어지면 팁이 2·3·4·5·6으로 커진다.
 *   그냥 먹을 만한 것이면 값만(이어짐 끊김), 없으면 시무룩, 자리가 다 차면 못 들어온다. 월요일마다 밑천 40, 금요일 저녁에 목표 돈이면 다음 주,
 *   아니면 하트 -1(그 주 다시). 아침에 재료 살 돈조차 없으면 그 주는 문을 닫는다.
 * 와우: 새 메뉴가 하루 한 가지라 오늘이 아니라 내일·모레 손님을 보고 올린다 — 비 오는 목요일을 위해 수요일에 코코아를, 단체 손님 넷의 버섯 수프를,
 *   그리고 메뉴판 한 칸이 손님 줄 전체의 하트 이어짐을 바꾼다. 곰은 꿀 케이크를 한입에 꿀꺽.
 * 판 5개(한 주 = 월~금): 1 개업 주(메뉴·문 열기 → 가게 키우기 → 다람쥐) → 2 비 오는 주(따뜻한 것이 모두의 하트) → 3 단체 손님(넷이 한 접시)
 *   → 4 미식가(딱 하나만, 세 배 · 직원 고양이 고용) → 5 숲속 축제(재료 값이 오르는 날 · 손님 열에 팁 두 배).
 * 별: 1판 하나, 판마다 하나씩(쉬운 말). 지킬 것(guard) = 남은 돈.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.6;

// ───────────────────────────── 음식 · 손님 ─────────────────────────────
export type DishId = 'honey' | 'carrot' | 'fish' | 'acorn' | 'cocoa' | 'soup' | 'berry';
interface Dish { name: string; cost: number; price: number; warm: boolean }
export const DISH: Record<DishId, Dish> = {
  honey: { name: '꿀 케이크', cost: 13, price: 4, warm: false },
  carrot: { name: '당근 머핀', cost: 10, price: 3, warm: false },
  fish: { name: '생선 파이', cost: 16, price: 5, warm: false },
  acorn: { name: '도토리 쿠키', cost: 7, price: 2, warm: false },
  cocoa: { name: '코코아', cost: 10, price: 3, warm: true },
  soup: { name: '버섯 수프', cost: 13, price: 4, warm: true },
  berry: { name: '베리 타르트', cost: 15, price: 5, warm: false },
};
export type Kind = 'bear' | 'rabbit' | 'fox' | 'squirrel' | 'hedgehog' | 'owl';
/** 제일 좋아하는 것(하트) · 먹을 만한 것(앞일수록 더 좋아함) */
export const KIND: Record<Kind, { name: string; fav: DishId | null; ok: DishId[] }> = {
  bear: { name: '곰', fav: 'honey', ok: ['fish', 'soup', 'carrot'] },
  rabbit: { name: '토끼', fav: 'carrot', ok: ['honey', 'cocoa'] },
  fox: { name: '여우', fav: 'fish', ok: ['berry', 'honey'] },
  squirrel: { name: '다람쥐', fav: 'acorn', ok: ['carrot', 'cocoa', 'berry'] },
  hedgehog: { name: '고슴도치', fav: 'soup', ok: ['acorn', 'berry'] },
  owl: { name: '미식가', fav: null, ok: [] },
};
const SLOTS = 3, PORTION = 6, BASE_SEATS = 6, START_MONEY = 40, MAX_CHAIN = 5;
const GOURMET_X = 3;

export type UpId = 'plant' | 'table' | 'cat';
export const UP: Record<UpId, { name: string; price: number; max: number; what: string }> = {
  plant: { name: '꽃 화분', price: 15, max: 1, what: '하트 팁 +1' },
  table: { name: '자리 더하기', price: 12, max: 2, what: '자리 +2' },
  cat: { name: '직원 고양이', price: 18, max: 1, what: '한 접시 +2조각' },
};

type DayEv = '' | 'group' | 'gourmet' | 'festival' | 'priceup';
interface DaySpec { n: number; rain?: boolean; ev?: DayEv; fixed?: Kind[]; add?: Kind }
type StarK = 'survive' | 'money' | 'smile' | 'heart' | 'group' | 'gourmet' | 'perfect' | 'festival';
interface Star { k: StarK; n: number; label: string }
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
interface WeekDef {
  key: string; name: string; news: string; hint: string; cards: DishId[]; pool: Kind[]; days: DaySpec[]; goal: number; stars: Star[]; offers: (UpId | null)[];
}

/** 판 = 한 주(월~금) */
export const WEEKS: WeekDef[] = [
  {
    key: 'first', name: '개업 주', news: '', hint: '손님이 좋아하는 걸 메뉴판에!',
    cards: ['honey', 'carrot', 'fish', 'acorn'], pool: ['bear', 'rabbit', 'fox'],
    days: [{ n: 6, fixed: ['bear', 'bear', 'bear', 'rabbit', 'fox', 'rabbit'] }, { n: 6 }, { n: 7, add: 'squirrel' }, { n: 7, add: 'squirrel' }, { n: 7 }],
    goal: 0, stars: [S('survive', 0, '한 주 버티기')], offers: [null, 'plant', 'table', 'plant', 'table'],
  },
  {
    key: 'rain', name: '비 오는 주', news: '비 오는 날엔 다들 따뜻한 게 좋아요', hint: '비 오는 날엔 코코아에 하트!',
    cards: ['honey', 'carrot', 'cocoa', 'fish'], pool: ['bear', 'rabbit', 'fox', 'squirrel'],
    days: [{ n: 7 }, { n: 6, rain: true }, { n: 8 }, { n: 7, rain: true }, { n: 8 }],
    goal: 70, stars: [S('money', 70, '돈 70 모으기'), S('heart', 20, '하트 스무 개 받기')], offers: ['table', 'plant', 'table', 'plant', null],
  },
  {
    key: 'group', name: '단체 손님', news: '단체 손님은 넷이 한 접시를 같이 먹어요', hint: '단체 손님 넷이 다 좋아하는 걸!',
    cards: ['honey', 'soup', 'carrot', 'acorn'], pool: ['bear', 'rabbit', 'squirrel'],
    days: [{ n: 8 }, { n: 9, ev: 'group' }, { n: 7, rain: true }, { n: 9, ev: 'group' }, { n: 8 }],
    goal: 120, stars: [S('money', 120, '돈 120 모으기'), S('group', 2, '단체 손님 두 번 대접하기'), S('perfect', 3, '모두 웃는 날 세 번')], offers: ['table', 'plant', 'table', 'plant', 'table'],
  },
  {
    key: 'gourmet', name: '미식가', news: '미식가는 딱 하나만 먹어요 — 맞히면 세 배!', hint: '미식가가 바라는 걸 메뉴판에!',
    cards: ['fish', 'berry', 'honey', 'soup'], pool: ['bear', 'fox', 'hedgehog', 'squirrel'],
    days: [{ n: 8 }, { n: 8, ev: 'gourmet' }, { n: 9, ev: 'group' }, { n: 7, ev: 'gourmet', rain: true }, { n: 9 }],
    goal: 140, stars: [S('money', 140, '돈 140 모으기'), S('gourmet', 2, '미식가 두 번 감동시키기'), S('perfect', 4, '모두 웃는 날 네 번')], offers: ['cat', 'table', 'plant', 'cat', 'table'],
  },
  {
    key: 'festival', name: '숲속 축제', news: '재료 값이 오르는 날 — 그 메뉴는 재료비가 두 배', hint: '축제 날엔 손님 열 명, 팁 두 배!',
    cards: ['honey', 'carrot', 'fish', 'cocoa'], pool: ['bear', 'rabbit', 'fox', 'squirrel'],
    days: [{ n: 8 }, { n: 8, ev: 'priceup' }, { n: 7, rain: true }, { n: 10, ev: 'festival' }, { n: 9, ev: 'gourmet' }],
    goal: 170, stars: [S('money', 170, '돈 170 모으기'), S('festival', 0, '축제 날 손님 모두 웃게 하기'), S('money', 240, '돈 240 모으기')], offers: ['table', 'cat', 'table', 'plant', 'plant'],
  },
];
export const STAGE_COUNT = WEEKS.length;
export const DAY_NAMES = ['월', '화', '수', '목', '금'];

// ───────────────────────────── 하루 계획 · 하루 결과 (순수 함수 — 게임·봇·미리 보기가 같은 것을 쓴다) ─────────────────────────────
export interface GuestSpec { k: Kind; grp: number; wish?: DishId }
export interface DayPlan { rain: boolean; ev: DayEv; guests: GuestSpec[]; up: DishId | null; offer: UpId | null }
export interface Upg { plant: number; table: number; cat: number }
export type Res = 'fav' | 'ok' | 'none' | 'noseat';
export interface Out { i: number; k: Kind; grp: number; wish?: DishId; seat: number; dish: DishId | null; pay: number; res: Res; sold: boolean; streak: number }
export interface DayRes { out: Out[]; cost: number; revenue: number; smiles: number; hearts: number; sad: number; groupOk: number; groupN: number; gourmetOk: number; soldOut: DishId[] }

export const seatsOf = (u: Upg) => BASE_SEATS + 2 * u.table;
export const portionsOf = (u: Upg) => PORTION + 2 * u.cat;
export const costOf = (d: DishId, plan: DayPlan | null) => DISH[d].cost * (plan?.up === d ? 2 : 1);
export const menuCost = (menu: DishId[], plan: DayPlan | null) => menu.reduce((a, d) => a + costOf(d, plan), 0);
/** 손님이 이 음식을 얼마나 좋아하나: 2 하트 · 1 먹을 만함 · 0 안 먹음 (비 오는 날엔 따뜻한 게 하트, 차가운 하트는 그냥 먹을 만함) */
export function likes(k: Kind, d: DishId, rain: boolean, wish?: DishId): number {
  if (k === 'owl') return d === wish ? 2 : 0;
  const K = KIND[k];
  const base = K.fav === d ? 2 : K.ok.includes(d) ? 1 : 0;
  if (!rain) return base;
  if (DISH[d].warm) return 2;
  return base ? 1 : 0;
}
/** 같은 좋아함이면 손님 취향 순서(하트 → 먹을 만한 것 앞쪽) */
const prefRank = (k: Kind, d: DishId) => (KIND[k].fav === d ? -1 : KIND[k].ok.indexOf(d));

export function simulateDay(plan: DayPlan, menu: DishId[], u: Upg): DayRes {
  const seats = seatsOf(u), left = new Map<DishId, number>(menu.map((d) => [d, portionsOf(u)]));
  const fest = plan.ev === 'festival' ? 2 : 1;
  let streak = 0;
  const out: Out[] = [], soldOut: DishId[] = [];
  let used = 0, revenue = 0, smiles = 0, hearts = 0, sad = 0, groupOk = 0, groupN = 0, gourmetOk = 0;
  const eat = (o: Out, d: DishId, lv: number) => {
    o.dish = d;
    o.res = lv >= 2 ? 'fav' : 'ok';
    // 하트가 줄줄이 이어지면 팁이 커진다 (하트 k번째: k+1, 다섯째부터 6) · 그냥 먹거나 시무룩하면 처음부터
    streak = lv >= 2 ? streak + 1 : 0;
    o.streak = streak;
    const tip = lv >= 2 ? (Math.min(streak, MAX_CHAIN) + 1 + u.plant) * fest : 0;
    o.pay = (o.k === 'owl' ? DISH[d].price * GOURMET_X : DISH[d].price) + tip;
    o.seat = used++;
    revenue += o.pay;
    smiles++;
    if (lv >= 2) hearts++;
    const n = left.get(d)! - 1;
    left.set(d, n);
    if (n === 0) (o.sold = true), soldOut.push(d);
  };
  const g = plan.guests;
  for (let i = 0; i < g.length; ) {
    const q = g[i];
    if (q.grp >= 0) {
      // 단체: 다 같이 먹을 한 접시(모두가 먹는 것, 조각이 모자라지 않게)가 있어야 앉는다
      let j = i;
      while (j < g.length && g[j].grp === q.grp) j++;
      const mem = g.slice(i, j), n = mem.length;
      groupN++;
      const os: Out[] = mem.map((m, z) => ({ i: i + z, k: m.k, grp: m.grp, seat: -1, dish: null, pay: 0, res: 'none', sold: false, streak: 0 }));
      if (used + n > seats) for (const o of os) (o.res = 'noseat'), sad++, (streak = 0);
      else {
        let best: DishId | null = null, bv = -1;
        for (const d of menu) {
          if ((left.get(d) ?? 0) < n) continue;
          const lv = mem.map((m) => likes(m.k, d, plan.rain));
          if (lv.some((v) => v === 0)) continue;
          const v = lv.reduce((a, b) => a + b, 0) * 10 + DISH[d].price;
          if (v > bv) (bv = v), (best = d);
        }
        if (best) {
          for (const o of os) eat(o, best, likes(o.k, best, plan.rain));
          groupOk++;
        } else (sad += os.length), (streak = 0);
      }
      out.push(...os);
      i = j;
      continue;
    }
    const o: Out = { i, k: q.k, grp: -1, wish: q.wish, seat: -1, dish: null, pay: 0, res: 'none', sold: false, streak: 0 };
    if (used >= seats) (o.res = 'noseat'), sad++, (streak = 0);
    else {
      let best: DishId | null = null, bl = 0, br = 99;
      for (const d of menu) {
        if ((left.get(d) ?? 0) <= 0) continue;
        const lv = likes(q.k, d, plan.rain, q.wish), rk = prefRank(q.k, d);
        if (lv > bl || (lv === bl && lv > 0 && rk < br)) (bl = lv), (br = rk), (best = d);
      }
      if (best) {
        eat(o, best, bl);
        if (q.k === 'owl') gourmetOk++;
      } else sad++, (streak = 0);
    }
    out.push(o);
    i++;
  }
  return { out, cost: menuCost(menu, plan), revenue, smiles, hearts, sad, groupOk, groupN, gourmetOk, soldOut };
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string; d?: DishId; k?: Kind }
/** 하루 동안 움직이는 손님 (연출 + 돈이 들어오는 순간) */
export interface Actor { o: Out; t0: number; paid: boolean; gone: boolean }
export interface CafeState {
  rng: Rng; seed: number; t: number; stage: number; day: number; phase: 'morning' | 'open' | 'evening' | 'result'; pt: number;
  week: DayPlan[]; menu: DishId[]; money: number; upg: Upg; weekUpg: Upg;
  hearts: number; tries: number; pts: number; stars: number; got: number; starOk: boolean[]; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean;
  // 이번 주 집계
  wSmiles: number; wHearts: number; wGroups: number; wGourmet: number; wPerfect: number; wFest: boolean; wSad: number; best: number;
  // 오늘
  res: DayRes | null; actors: Actor[]; dayEnd: number; todayIn: number; todayCost: number; bought: boolean; pushed: DishId | null; dropped: DishId | null;
  down: boolean; firstTap: number; firstBig: number; wowN: number; taps: number;
  seen: Set<string>; once: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; r: number } | null;
  events: Ev[];
}

const ev = (s: CafeState, kind: string, x: number, y: number, extra: Partial<Ev> = {}) => s.events.push({ t: s.t, kind, x, y, ...extra });
function see(s: CafeState, key: string, text: string) {
  if (s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const wow = (s: CafeState) => {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
};
export const weekOf = (s: CafeState) => WEEKS[s.stage];
export const planOf = (s: CafeState) => s.week[Math.min(4, s.day)];

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
export const CARD = { y0: 1.0, y1: 1.255, w: 0.222, m: 0.03 };
export const cardX = (i: number) => CARD.m + i * (CARD.w + (1 - 2 * CARD.m - 4 * CARD.w) / 3);
export const SHOP = { x0: 0.03, x1: 0.47, y0: 1.285, y1: 1.425 };
export const DOOR = { x0: 0.5, x1: 0.97, y0: 1.285, y1: 1.425 };
type Hit = { k: 'card'; i: number } | { k: 'shop' } | { k: 'door' } | null;
export function hitAt(x: number, y: number): Hit {
  const pad = 0.012;
  if (y >= CARD.y0 - pad && y <= CARD.y1 + pad) for (let i = 0; i < 4; i++) if (x >= cardX(i) - pad && x <= cardX(i) + CARD.w + pad) return { k: 'card', i };
  if (y >= SHOP.y0 - pad && y <= SHOP.y1 + pad) {
    if (x >= SHOP.x0 - pad && x <= SHOP.x1 + pad) return { k: 'shop' };
    if (x >= DOOR.x0 - pad && x <= DOOR.x1 + pad) return { k: 'door' };
  }
  return null;
}
/** 메뉴판 칸 자리 (벽 칠판) */
export const boardSlot = (i: number): [number, number] => [0.36 + i * 0.14, 0.33];

// ───────────────────────────── 한 주 만들기 ─────────────────────────────
function genWeek(s: CafeState): DayPlan[] {
  const W = weekOf(s), r = s.rng;
  let gid = 0;
  return W.days.map((d, di) => {
    let guests: GuestSpec[];
    if (d.fixed) guests = d.fixed.map((k) => ({ k, grp: -1 }));
    else {
      const pool = [...W.pool, ...(d.add ? [d.add] : [])];
      const dom = d.add ?? pool[Math.floor(r() * pool.length)], dom2 = pool[Math.floor(r() * pool.length)];
      const n = d.n - (d.ev === 'group' ? 4 : 0) - (d.ev === 'gourmet' ? 1 : 0);
      guests = [];
      for (let i = 0; i < n; i++) {
        const q = r();
        guests.push({ k: q < 0.42 ? dom : q < 0.62 ? dom2 : pool[Math.floor(r() * pool.length)], grp: -1 });
      }
      if (d.add && !guests.some((g) => g.k === d.add)) guests[1] = { k: d.add, grp: -1 };
      if (d.ev === 'group') {
        const at = Math.min(guests.length, 2 + Math.floor(r() * 3)), id = gid++;
        guests.splice(at, 0, ...[0, 1, 2, 3].map(() => ({ k: 'hedgehog' as Kind, grp: id })));
      }
      if (d.ev === 'gourmet') {
        const cands = W.cards.filter((c) => c !== 'acorn');
        const wish = di === 1 && W.cards.includes('berry') ? 'berry' : cands[Math.floor(r() * cands.length)];
        guests.splice(1 + Math.floor(r() * (guests.length - 1)), 0, { k: 'owl', grp: -1, wish });
      }
    }
    let up: DishId | null = null;
    if (d.ev === 'priceup') {
      // 오늘 손님이 제일 많이 좋아하는 메뉴 값이 오른다
      const cnt = new Map<DishId, number>();
      for (const g of guests) for (const c of W.cards) if (likes(g.k, c, !!d.rain) === 2) cnt.set(c, (cnt.get(c) ?? 0) + 1);
      up = [...W.cards].sort((a, b) => (cnt.get(b) ?? 0) - (cnt.get(a) ?? 0))[0];
    }
    return { rain: !!d.rain, ev: d.ev ?? '', guests, up, offer: W.offers[di] };
  });
}

function startWeek(s: CafeState) {
  s.week = genWeek(s);
  s.day = 0;
  s.money = START_MONEY;
  s.menu = [];
  s.weekUpg = { ...s.upg };
  s.wSmiles = s.wHearts = s.wGroups = s.wGourmet = s.wPerfect = s.wSad = 0;
  s.wFest = false;
  s.best = 0;
  s.starOk = weekOf(s).stars.map(() => false);
  startMorning(s);
}

function startMorning(s: CafeState) {
  s.phase = 'morning';
  s.pt = 0;
  s.res = null;
  s.actors = [];
  s.bought = false;
  s.pushed = null;
  s.dropped = null;
  const plan = planOf(s), W = weekOf(s);
  // 재료비를 못 내는 메뉴는 뒤에서부터 내린다
  while (s.menu.length && menuCost(s.menu, plan) > s.money) s.menu.pop();
  const cheapest = Math.min(...W.cards.map((c) => costOf(c, plan)));
  if (s.money < cheapest) return endWeek(s, false, '재료 살 돈이 없어요');
  if (plan.rain && see(s, 'rain', '')) s.spot = { x: 0.5, y: 0.6, t: s.t, label: '비 오는 날', r: 0.16 };
  if (plan.ev === 'group' && see(s, 'group', '')) s.spot = { x: 0.5, y: 0.6, t: s.t, label: '단체 손님', r: 0.16 };
  if (plan.ev === 'gourmet' && see(s, 'gourmet', '')) s.spot = { x: 0.5, y: 0.6, t: s.t, label: '미식가', r: 0.16 };
  if (plan.ev === 'festival' && see(s, 'festival', '')) s.spot = { x: 0.5, y: 0.6, t: s.t, label: '축제 날', r: 0.16 };
  if (plan.ev === 'priceup' && see(s, 'priceup', '')) s.spot = { x: cardX(W.cards.indexOf(plan.up!)) + CARD.w / 2, y: (CARD.y0 + CARD.y1) / 2, t: s.t, label: '재료 값 두 배', r: 0.14 };
  if (plan.guests.some((g) => g.k === 'squirrel') && see(s, 'squirrel', '')) s.spot = { x: 0.5, y: 0.6, t: s.t, label: '새 손님 다람쥐', r: 0.16 };
  if (plan.offer && s.upg[plan.offer] < UP[plan.offer].max) {
    if (see(s, 'shop', '')) s.spot = { x: (SHOP.x0 + SHOP.x1) / 2, y: (SHOP.y0 + SHOP.y1) / 2, t: s.t, label: '가게 키우기', r: 0.15 };
    else if (plan.offer === 'cat' && see(s, 'catoffer', '')) s.spot = { x: (SHOP.x0 + SHOP.x1) / 2, y: (SHOP.y0 + SHOP.y1) / 2, t: s.t, label: '직원 고용', r: 0.15 };
  }
}

/** 단추를 누를 수 있나 */
export const canShop = (s: CafeState) => {
  const o = planOf(s).offer;
  return !!o && !s.bought && s.upg[o] < UP[o].max && s.money - UP[o].price >= menuCost(s.menu, planOf(s)) && s.money - UP[o].price >= Math.min(...weekOf(s).cards.map((c) => costOf(c, planOf(s))));
};
export const canAdd = (s: CafeState, d: DishId) => {
  const m = s.menu.includes(d) ? s.menu : s.menu.length < SLOTS ? [...s.menu, d] : [...s.menu.slice(1), d];
  return menuCost(m, planOf(s)) <= s.money;
};
/** 오늘 새로 올릴 수 있나 (새 메뉴는 아침마다 한 가지) */
export const canPush = (s: CafeState) => !s.pushed;

function tapCard(s: CafeState, i: number) {
  const d = weekOf(s).cards[i];
  const [bx, by] = [cardX(i) + CARD.w / 2, CARD.y0];
  if (s.menu.includes(d)) {
    s.menu = s.menu.filter((x) => x !== d);
    // 오늘 올린 것을 다시 톡 = 되돌리기 (밀려 내려간 메뉴가 돌아온다)
    if (s.pushed === d) {
      s.pushed = null;
      if (s.dropped && s.menu.length < SLOTS && !s.menu.includes(s.dropped)) s.menu.unshift(s.dropped);
      s.dropped = null;
    }
    ev(s, 'unpin', bx, by, { d });
    return;
  }
  if (s.pushed) return void ev(s, 'once', bx, by, { d });
  if (!canAdd(s, d)) return void ev(s, 'poor', bx, by, { d });
  let out: DishId | null = null;
  if (s.menu.length >= SLOTS) (out = s.menu[0]), (s.menu = s.menu.slice(1));
  s.menu.push(d);
  s.pushed = d;
  s.dropped = out;
  ev(s, 'pin', bx, by, { d, n: s.menu.length - 1, text: out ?? '' });
}
function tapShop(s: CafeState) {
  const o = planOf(s).offer;
  if (!o) return;
  if (!canShop(s)) return void ev(s, 'poor', (SHOP.x0 + SHOP.x1) / 2, SHOP.y0, { text: 'shop' });
  s.money -= UP[o].price;
  s.upg[o]++;
  s.bought = true;
  see(s, 'up-' + o, '');
  ev(s, 'buy', (SHOP.x0 + SHOP.x1) / 2, SHOP.y0, { text: o });
  wow(s);
}

const WALK = 18, THINK = 8, EAT = 16, GAP = 13, CLOSE = 40, EVE_T = 96, RES_T = 230;
/** 손님 들어오는 틱 (단체는 한꺼번에) */
function arrivals(out: Out[], fest: boolean): number[] {
  const ts: number[] = [];
  let t = 4, lastG = -2;
  out.forEach((o, i) => {
    if (o.grp >= 0 && o.grp === lastG) ts.push(ts[i - 1] + 3);
    else {
      if (i > 0) t += fest ? 9 : i < 3 ? 8 : GAP;
      ts.push(t);
    }
    lastG = o.grp;
  });
  return ts;
}
export const reactAt = (o: Out) => (o.res === 'noseat' ? 14 : WALK + THINK + (o.res === 'none' ? 0 : EAT));

function openDay(s: CafeState) {
  const plan = planOf(s), res = simulateDay(plan, s.menu, s.upg);
  s.res = res;
  s.money -= res.cost;
  s.todayCost = res.cost;
  s.todayIn = 0;
  const ts = arrivals(res.out, plan.ev === 'festival');
  s.actors = res.out.map((o, i) => ({ o, t0: ts[i], paid: false, gone: false }));
  s.dayEnd = Math.max(...s.actors.map((a) => a.t0 + reactAt(a.o))) + CLOSE;
  s.phase = 'open';
  s.pt = 0;
  ev(s, 'open', 0.9, 0.5, { n: res.cost });
  see(s, 'menu', '');
}

function stepOpen(s: CafeState) {
  const plan = planOf(s), res = s.res!;
  for (const a of s.actors) {
    const o = a.o, at = a.t0 + reactAt(o);
    if (a.paid || s.pt < at) continue;
    a.paid = true;
    if (o.res === 'fav' || o.res === 'ok') {
      s.money += o.pay;
      s.todayIn += o.pay;
      ev(s, o.res === 'fav' ? 'heart' : 'smile', 0, 0, { n: o.pay, d: o.dish!, k: o.k, text: String(o.i) });
      if (o.sold) {
        see(s, 'sold', '');
        ev(s, 'sold', 0, 0, { d: o.dish!, text: String(o.i) });
        const key = `sold${s.stage}-${s.day}-${s.tries}`;
        if (!s.once.has(key)) (s.once.add(key), wow(s));
      }
      if (o.k === 'owl') (wow(s), ev(s, 'gourmet', 0, 0, { text: String(o.i), d: o.dish! }));
      if (o.grp >= 0 && s.actors.filter((b) => b.o.grp === o.grp).every((b) => b.paid)) (wow(s), ev(s, 'group', 0, 0, { text: String(o.i), d: o.dish! }));
    } else ev(s, o.res === 'noseat' ? 'noseat' : 'sad', 0, 0, { k: o.k, text: String(o.i), d: o.wish });
  }
  // 하트 줄줄이: 하트 셋이 잇달아 (하루 한 번)
  const key = `run${s.stage}-${s.day}-${s.tries}`;
  if (!s.once.has(key)) {
    let run = 0;
    for (const a of s.actors) {
      if (!a.paid) break;
      run = a.o.res === 'fav' ? run + 1 : 0;
      if (run >= 3) {
        s.once.add(key);
        wow(s);
        ev(s, 'run', 0.5, 0.6, { n: run, text: String(a.o.i) });
        break;
      }
    }
  }
  if (s.pt >= s.dayEnd) {
    // 문 닫기: 하루 정산
    s.wSmiles += res.smiles;
    s.wHearts += res.hearts;
    s.wSad += res.sad;
    s.wGroups += res.groupOk;
    s.wGourmet += res.gourmetOk;
    const perfect = res.sad === 0;
    if (perfect) s.wPerfect++;
    if (plan.ev === 'festival' && perfect) s.wFest = true;
    const profit = res.revenue - res.cost;
    s.pts += Math.max(0, profit);
    if (perfect && res.out.length >= 5) (wow(s), ev(s, 'full', 0.5, 0.6, { n: res.out.length }));
    s.phase = 'evening';
    s.pt = 0;
    ev(s, 'close', 0.5, 0.5, { n: profit });
  }
}
function starMet(s: CafeState, st: Star): boolean {
  switch (st.k) {
    case 'survive': return true;
    case 'money': return s.money >= st.n;
    case 'smile': return s.wSmiles >= st.n;
    case 'heart': return s.wHearts >= st.n;
    case 'group': return s.wGroups >= st.n;
    case 'gourmet': return s.wGourmet >= st.n;
    case 'perfect': return s.wPerfect >= st.n;
    case 'festival': return s.wFest;
  }
}
/** 별 칸 옆 진행 숫자 */
export function starNow(s: CafeState, st: Star): string {
  const v = st.k === 'money' ? s.money : st.k === 'smile' ? s.wSmiles : st.k === 'heart' ? s.wHearts : st.k === 'group' ? s.wGroups : st.k === 'gourmet' ? s.wGourmet : st.k === 'perfect' ? s.wPerfect : -1;
  return v >= 0 && v < st.n ? `${v}/${st.n}` : '';
}

function endWeek(s: CafeState, ok: boolean, why: string) {
  const W = weekOf(s);
  if (ok && W.goal > 0 && s.money < W.goal) (ok = false), (why = `돈이 ${W.goal}에 못 미쳤어요`);
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    s.starOk = W.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += 40 + s.got * 100;
    if (s.got >= 3) wow(s);
    if (s.stage === WEEKS.length - 1) (s.won = true), (s.pts += 150);
    ev(s, 'clear', 0.5, 0.6, { n: s.got });
  } else {
    s.hearts--;
    s.tries++;
    s.got = 0;
    ev(s, 'fail', 0.5, 0.6, { text: why });
  }
}

function stepEvening(s: CafeState) {
  if (s.pt < EVE_T) return;
  if (s.day >= 4) return endWeek(s, true, '');
  s.day++;
  startMorning(s);
}

function stepResult(s: CafeState) {
  if (s.pt < (s.ok ? RES_T : RES_T - 40)) return;
  if (s.ok) {
    if (s.won) return void (s.dead = true);
    s.stage++;
    s.again = false;
  } else {
    if (s.hearts <= 0) return void (s.dead = true);
    s.again = true;
    s.upg = { ...s.weekUpg };
  }
  startWeek(s);
  if (!s.again && weekOf(s).news) s.newsQ.push(weekOf(s).news);
}

function cosmetic(s: CafeState) {
  s.events = s.events.filter((e) => s.t - e.t < 120);
  if (s.spot && s.t - s.spot.t > 150) s.spot = null;
  if (!s.news || s.t - s.news.t > 170) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news && s.t - s.news.t > 170 ? null : s.news;
}

const game: GameDef<CafeState> & { wows(s: CafeState): number } = {
  id: 'petcafe',
  name: '동물 손님 카페 하루',
  genes: ['tycoon', 'decorate', 'pointer'],
  twist: '손은 아침에만 쓴다 — 새 메뉴는 아침마다 딱 한 가지(꽉 차면 제일 오래된 메뉴가 내려감)라 오늘이 아니라 내일 손님까지 내다보고 올리고, 문을 열면 하루가 저절로 흘러 하트가 줄줄이 이어질수록 팁이 커진다',
  rules: [
    '아침마다 새 메뉴를 한 가지 톡! 메뉴판은 세 칸, 꽉 차면 제일 오래된 메뉴가 내려가요.',
    '문 열기를 톡 — 손님이 차례로 와서 좋아하는 걸 먹어요. 하트가 이어지면 팁이 점점 커져요.',
    '금요일까지 목표 돈을 모으면 다음 주. 남는 돈으로 가게를 키워요.',
  ],
  controls: 'touch',
  hint: '카드 톡 → 메뉴판에 착 · 문 열기 톡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 드는 숲속 통나무 카페 — 옷 입은 동물 손님들이 줄줄이 들어와 메뉴판의 음식을 먹는 그림책 디오라마',
    mood: '창밖엔 초록 숲과 햇살 줄기, 안에는 꿀색 나무 벽·둥근 탁자·꽃 화분·따뜻한 등불. 목도리 두른 곰이 꿀 케이크를 한입에 꿀꺽, 토끼는 당근 머핀을 오물오물, 하트와 동전이 뿅뿅 튄다.',
    palette: { bg: '#ffe9c4', ink: '#4a2c17', muted: '#a07a55', accent: '#ff9a3c', hot: '#ff5a6e', soft: '#fff6e6' },
  },
  guard: (s) => s.money,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, day: 0, phase: 'morning', pt: 0,
      week: [], menu: [], money: START_MONEY, upg: { plant: 0, table: 0, cat: 0 }, weekUpg: { plant: 0, table: 0, cat: 0 },
      hearts: 3, pts: 0, stars: 0, got: 0, starOk: [false], ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      wSmiles: 0, wHearts: 0, wGroups: 0, wGourmet: 0, wPerfect: 0, wFest: false, wSad: 0, best: 0,
      res: null, actors: [], dayEnd: 0, todayIn: 0, todayCost: 0, bought: false, pushed: null, dropped: null,
      down: false, firstTap: -1, firstBig: -1, wowN: 0, taps: 0,
      seen: new Set<string>(), once: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
    } as unknown as CafeState;
    startWeek(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null;
    const tap = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'morning') {
      let h: Hit = null;
      if (tap) h = hitAt(p!.x, p!.y * A);
      if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < 4) h = { k: 'card', i: inp.pick };
      if (h) {
        s.taps++;
        if (s.firstTap < 0) s.firstTap = s.t;
        if (h.k === 'card') tapCard(s, h.i);
        else if (h.k === 'shop') tapShop(s);
        else if (s.menu.length) openDay(s);
        else ev(s, 'empty', (DOOR.x0 + DOOR.x1) / 2, DOOR.y0);
      }
    } else if (s.phase === 'open') stepOpen(s);
    else if (s.phase === 'evening') stepEvening(s);
    else if (s.phase === 'result') stepResult(s);
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const petcafe = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const cardIn = (i: number) => at(cardX(i) + CARD.w / 2, (CARD.y0 + CARD.y1) / 2);
const shopIn = () => at((SHOP.x0 + SHOP.x1) / 2, (SHOP.y0 + SHOP.y1) / 2);
const doorIn = () => at((DOOR.x0 + DOOR.x1) / 2, (DOOR.y0 + DOOR.y1) / 2);

/** 하루 값: 번 돈 + 별에 도움 되는 것 */
function dayValue(W: WeekDef, plan: DayPlan, r: DayRes): number {
  let v = r.revenue - r.cost + r.hearts * 0.3;
  for (const st of W.stars) {
    if (st.k === 'group') v += r.groupOk * 8;
    if (st.k === 'gourmet') v += r.gourmetOk * 8;
    if (st.k === 'perfect' && r.sad === 0) v += 8;
    if (st.k === 'festival' && plan.ev === 'festival' && r.sad === 0) v += 20;
    if (st.k === 'heart') v += r.hearts * 0.8;
    if (st.k === 'smile') v += r.smiles * 0.5;
  }
  return v;
}
type Board = DishId[];
/** 아침에 할 수 있는 것: 아무거나 내리고(순서 유지) + 새 메뉴 하나 올리기(꽉 차면 제일 오래된 것이 내려감) */
function boardMoves(b: Board, cards: DishId[]): Board[] {
  const out: Board[] = [], seen = new Set<string>();
  const put = (x: Board) => {
    const k = x.join(',');
    if (x.length && !seen.has(k)) (seen.add(k), out.push(x));
  };
  for (let m = 0; m < 1 << b.length; m++) {
    const kept = b.filter((_, i) => m & (1 << i));
    put(kept);
    for (const c of cards) if (!kept.includes(c)) put(kept.length >= SLOTS ? [...kept.slice(1), c] : [...kept, c]);
  }
  return out;
}
/** 이번 주 남은 날을 끝까지 내다보는 계획 (메뉴판 상태별 동적 계획법). 돈은 마지막에 따로 확인 */
function weekPlan(s: CafeState, u: Upg, board: Board): { first: Board; v: number; path: Board[] } {
  const W = weekOf(s), memoDay = new Map<string, number>(), memoV = new Map<string, { v: number; next: Board | null }>();
  const val = (d: number, b: Board) => {
    const k = d + '|' + b.join(',');
    let v = memoDay.get(k);
    if (v === undefined) memoDay.set(k, (v = dayValue(W, s.week[d], simulateDay(s.week[d], b, u))));
    return v;
  };
  const V = (d: number, b: Board): { v: number; next: Board | null } => {
    if (d >= 5) return { v: 0, next: null };
    const k = d + '|' + b.join(',');
    const c = memoV.get(k);
    if (c) return c;
    let best = { v: -1e9, next: null as Board | null };
    for (const nb of boardMoves(b, W.cards)) {
      const v = val(d, nb) + V(d + 1, nb).v;
      if (v > best.v) best = { v, next: nb };
    }
    memoV.set(k, best);
    return best;
  };
  const r = V(s.day, board), path: Board[] = [];
  let b: Board | null = r.next;
  for (let d = s.day; d < 5 && b; d++) (path.push(b), (b = V(d + 1, b).next));
  return { first: r.next ?? board, v: r.v, path };
}
/** 계획대로 가면 금요일 저녁 돈 */
function pathMoney(s: CafeState, u: Upg, money: number, path: Board[]) {
  for (let d = s.day, i = 0; d < 5 && i < path.length; d++, i++) {
    const r = simulateDay(s.week[d], path[i], u);
    if (r.cost > money) return -1;
    money += r.revenue - r.cost;
  }
  return money;
}
const smartPlan = new WeakMap<object, { key: string; menu: DishId[]; buy: boolean }>();
function decide(s: CafeState): { menu: DishId[]; buy: boolean } {
  const key = `${s.stage}:${s.day}:${s.tries}:${s.t - s.pt}`;
  const c = smartPlan.get(s);
  if (c && c.key === key) return c;
  const plan = planOf(s), W = weekOf(s), o = plan.offer;
  // 오늘 이미 올리거나 내린 것은 되돌려 놓고 생각한다 (아침 처음 판)
  const board0 = s.pushed ? [...(s.dropped ? [s.dropped] : []), ...s.menu.filter((d) => d !== s.pushed)] : [...s.menu];
  const keep = weekPlan(s, s.upg, board0), keepM = pathMoney(s, s.upg, s.money, keep.path);
  const need = Math.max(W.goal, ...W.stars.filter((q) => q.k === 'money').map((q) => q.n));
  let buy = false, use = keep;
  if (o && s.upg[o] < UP[o].max && !s.bought && s.money - UP[o].price >= 0) {
    const u2 = { ...s.upg, [o]: s.upg[o] + 1 };
    const spend = weekPlan(s, u2, board0), spendM = pathMoney(s, u2, s.money - UP[o].price, spend.path);
    const left = 5 - s.day, future = 5 * (WEEKS.length - 1 - s.stage);
    const gain = spend.v - keep.v - UP[o].price + ((spend.v - keep.v) / left) * future * 0.7;
    // 이번 주 목표(와 돈 별)를 지킬 수 있을 때만 산다
    const safe = spendM >= need + 3 || (spendM >= W.goal + 3 && spendM >= keepM - 2);
    if (spendM >= 0 && safe && gain > 0) (buy = true), (use = spend);
  }
  let menu = use.first;
  const money = s.money - (buy && o ? UP[o].price : 0);
  if (menuCost(menu, plan) > money) {
    // 계획이 돈에 막히면: 할 수 있는 것 중 오늘 값이 가장 큰 것
    let bv = -1e9;
    for (const nb of boardMoves(board0, W.cards)) {
      if (menuCost(nb, plan) > money) continue;
      const v = dayValue(W, plan, simulateDay(plan, nb, buy && o ? { ...s.upg, [o]: s.upg[o] + 1 } : s.upg));
      if (v > bv) (bv = v), (menu = nb);
    }
  }
  const out = { key, menu, buy };
  smartPlan.set(s, out);
  return out;
}
/** 톡 순서: 뺄 것 → 가게 → 넣을 것(하나) → 문 */
function nextTap(s: CafeState, target: DishId[], buy: boolean): Input {
  const cards = weekOf(s).cards;
  // 오늘 올린 게 목표에 없으면 되돌리기 (밀려난 것이 돌아온다)
  if (s.pushed && !target.includes(s.pushed)) return cardIn(cards.indexOf(s.pushed));
  const add = target.find((d) => !s.menu.includes(d));
  for (const d of s.menu) if (!target.includes(d)) return cardIn(cards.indexOf(d));
  if (buy && !s.bought && canShop(s)) return shopIn();
  if (add && !s.pushed && canAdd(s, add)) return cardIn(cards.indexOf(add));
  if (s.menu.length) return doorIn();
  // 메뉴판이 비었으면 아무거나 하나(제일 싼 것)
  const c = cards.map((d, i) => [costOf(d, planOf(s)), i] as const).sort((a, b) => a[0] - b[0])[0];
  return cardIn(c[1]);
}
/** 누르고 떼기를 번갈아 (톡 = 안 누름 → 누름) */
function pulse(s: CafeState, f: () => Input): Input {
  if (s.down) return NO;
  return f();
}

/** 잘하는 봇: 금요일까지 손님 줄을 다 흘려 보고(메뉴판 상태별 계획) 오늘 올릴 메뉴·내릴 메뉴, 목표를 지키는 선에서 가게를 키운다 */
export const petcafeSmart: Bot<CafeState> = {
  name: '금요일까지 내다보고 고름',
  act(s) {
    if (s.phase !== 'morning') return NO;
    return pulse(s, () => {
      const d = decide(s);
      return nextTap(s, d.menu, d.buy);
    });
  },
};

const dumbAt = new WeakMap<object, { next: number }>();
/** 못하는 봇: 아무 카드·단추나 아무 때나 톡 */
export const petcafeRandom: Bot<CafeState> = {
  name: '아무 단추나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 40) }));
    if (s.down) return NO;
    if (s.phase !== 'morning' || s.t < m.next) return NO;
    m.next = s.t + 12 + Math.floor(rng() * 45);
    const r = Math.floor(rng() * 6);
    return r < 4 ? cardIn(r) : r === 4 ? shopIn() : doorIn();
  },
};

/** 버릇 봇: 늘 가장 싼 메뉴를 올린다 (메뉴판에 없는 것 중 제일 싼 것 하나, 가게는 안 키움) */
export const petcafeHabit: Bot<CafeState> = {
  name: '늘 가장 싼 메뉴',
  act(s) {
    if (s.phase !== 'morning') return NO;
    return pulse(s, () => {
      const plan = planOf(s), cards = weekOf(s).cards;
      if (!s.pushed) {
        const c = cards.filter((d) => !s.menu.includes(d) && canAdd(s, d)).sort((a, b) => costOf(a, plan) - costOf(b, plan) || cards.indexOf(a) - cards.indexOf(b))[0];
        if (c) return cardIn(cards.indexOf(c));
      }
      return s.menu.length ? doorIn() : cardIn(0);
    });
  },
};

/** 독립 버릇 봇: 늘 지난번과 같은 메뉴 (주 첫날 왼쪽 카드부터 차례로 올리고, 다 차면 그대로 둔다 · 가게는 안 키움) */
export const petcafeHabit2: Bot<CafeState> = {
  name: '늘 지난번과 같은 메뉴',
  act(s) {
    if (s.phase !== 'morning') return NO;
    return pulse(s, () => {
      const cards = weekOf(s).cards;
      if (!s.pushed && s.menu.length < SLOTS) {
        const c = cards.find((d) => !s.menu.includes(d) && canAdd(s, d));
        if (c) return cardIn(cards.indexOf(c));
      }
      return s.menu.length ? doorIn() : cardIn(0);
    });
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
type C2 = CanvasRenderingContext2D;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 3;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
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
function heart(ctx: C2, x: number, y: number, r: number, col = '#ff4f78') {
  heartPath(ctx, x, y, r);
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,20,50,.55)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ell(ctx, x - r * 0.42, y - r * 0.35, r * 0.22, r * 0.14, -0.6);
  ctx.fill();
}
function coin(ctx: C2, x: number, y: number, r: number) {
  ell(ctx, x, y + r * 0.18, r, r * 0.95);
  ctx.fillStyle = '#b8780c';
  ctx.fill();
  ell(ctx, x, y, r, r * 0.95);
  ctx.fillStyle = radg(ctx, x - r * 0.3, y - r * 0.35, 0, r * 1.3, [0, '#fff4b0'], [0.5, '#ffd23a'], [1, '#e9a40e']);
  ctx.fill();
  ctx.strokeStyle = '#a86a06';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
  ell(ctx, x, y, r * 0.55, r * 0.5);
  ctx.strokeStyle = 'rgba(168,106,6,.6)';
  ctx.lineWidth = Math.max(0.8, r * 0.1);
  ctx.stroke();
}
const INK = '#4a2c17';
function font(ctx: C2, px: number, wt = 800) {
  ctx.font = `${wt} ${Math.max(12, Math.round(px))}px system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
}
function outText(ctx: C2, text: string, x: number, y: number, fill: string, stroke = 'rgba(74,44,23,.85)', lw = 3, maxW?: number) {
  ctx.lineJoin = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y, maxW);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y, maxW);
}

// ── 음식 그림 (가운데 (x,y), 크기 r) ──
function drawDish(ctx: C2, d: DishId, x: number, y: number, r: number, t: number, steam = true) {
  ctx.save();
  ctx.translate(x, y);
  // 접시
  ell(ctx, 0, r * 0.62, r * 1.05, r * 0.32);
  ctx.fillStyle = 'rgba(90,50,20,.18)';
  ctx.fill();
  ell(ctx, 0, r * 0.52, r * 1.0, r * 0.3);
  ctx.fillStyle = lin(ctx, 0, r * 0.25, 0, r * 0.8, [0, '#ffffff'], [1, '#dfe6ee']);
  ctx.fill();
  ctx.strokeStyle = '#b9c4d0';
  ctx.lineWidth = Math.max(1, r * 0.06);
  ctx.stroke();
  const warmSteam = () => {
    if (!steam) return;
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = Math.max(1.2, r * 0.1);
    ctx.lineCap = 'round';
    for (let k = -1; k <= 1; k++) {
      const ph = t * 0.08 + k * 1.7;
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(ph);
      ctx.beginPath();
      ctx.moveTo(k * r * 0.32, -r * 0.55);
      ctx.bezierCurveTo(k * r * 0.32 + r * 0.22 * Math.sin(ph), -r * 0.8, k * r * 0.32 - r * 0.22 * Math.sin(ph), -r * 1.0, k * r * 0.32 + r * 0.1, -r * 1.25);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };
  switch (d) {
    case 'honey': {
      // 두 층 케이크 + 꿀 흘러내림
      rr(ctx, -r * 0.72, -r * 0.35, r * 1.44, r * 0.85, r * 0.16);
      ctx.fillStyle = lin(ctx, 0, -r * 0.35, 0, r * 0.5, [0, '#ffe2a6'], [1, '#e9b86a']);
      ctx.fill();
      ctx.strokeStyle = '#9a6328';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.stroke();
      ctx.fillStyle = '#fff3d6';
      ctx.fillRect(-r * 0.72, r * 0.05, r * 1.44, r * 0.1);
      // 꿀
      ctx.fillStyle = '#f5a623';
      ctx.beginPath();
      ctx.moveTo(-r * 0.74, -r * 0.3);
      ctx.lineTo(r * 0.74, -r * 0.3);
      ctx.lineTo(r * 0.74, -r * 0.12);
      for (let k = 0; k <= 6; k++) {
        const xx = r * 0.74 - (k * r * 1.48) / 6, dy = k % 2 ? r * (0.18 + 0.12 * hsh(k)) : 0;
        ctx.quadraticCurveTo(xx + r * 0.1, -r * 0.1 + dy, xx, -r * 0.12 + dy);
      }
      ctx.closePath();
      ctx.fill();
      rr(ctx, -r * 0.74, -r * 0.48, r * 1.48, r * 0.22, r * 0.11);
      ctx.fillStyle = lin(ctx, 0, -r * 0.48, 0, -r * 0.26, [0, '#ffd36a'], [1, '#f0a01e']);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ell(ctx, -r * 0.35, -r * 0.4, r * 0.18, r * 0.05);
      ctx.fill();
      // 꿀벌 장식
      ctx.fillStyle = '#ffd23a';
      ell(ctx, r * 0.25, -r * 0.62, r * 0.14, r * 0.1);
      ctx.fill();
      ctx.fillStyle = '#4a2c17';
      ctx.fillRect(r * 0.22, -r * 0.71, r * 0.04, r * 0.18);
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      ell(ctx, r * 0.2, -r * 0.76, r * 0.08, r * 0.05, -0.5);
      ctx.fill();
      break;
    }
    case 'carrot': {
      // 머핀 컵 + 봉긋한 윗부분 + 꼬마 당근
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 0.05);
      ctx.lineTo(r * 0.55, -r * 0.05);
      ctx.lineTo(r * 0.42, r * 0.5);
      ctx.lineTo(-r * 0.42, r * 0.5);
      ctx.closePath();
      ctx.fillStyle = '#ff9bb0';
      ctx.fill();
      ctx.strokeStyle = '#c95a76';
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      for (let k = -2; k <= 2; k++) {
        ctx.beginPath();
        ctx.moveTo(k * r * 0.2, -r * 0.03);
        ctx.lineTo(k * r * 0.15, r * 0.48);
        ctx.stroke();
      }
      ell(ctx, 0, -r * 0.12, r * 0.66, r * 0.42);
      ctx.fillStyle = radg(ctx, -r * 0.2, -r * 0.3, 0, r * 0.8, [0, '#f0b070'], [1, '#c07a3a']);
      ctx.fill();
      ctx.strokeStyle = '#8a5222';
      ctx.stroke();
      // 당근
      ctx.save();
      ctx.translate(r * 0.05, -r * 0.5);
      ctx.rotate(0.35);
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(-r * 0.13, -r * 0.05);
      ctx.lineTo(r * 0.13, -r * 0.05);
      ctx.lineTo(0, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4cb04a';
      for (const a of [-0.5, 0, 0.5]) {
        ell(ctx, Math.sin(a) * r * 0.1, -r * 0.16, r * 0.05, r * 0.14, a);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'fish': {
      // 둥근 파이 + 생선 꼬리
      ell(ctx, 0, r * 0.1, r * 0.82, r * 0.5);
      ctx.fillStyle = '#c98a3e';
      ctx.fill();
      ell(ctx, 0, 0, r * 0.82, r * 0.48);
      ctx.fillStyle = radg(ctx, -r * 0.2, -r * 0.2, 0, r, [0, '#ffd98a'], [1, '#e2a24a']);
      ctx.fill();
      ctx.strokeStyle = '#9a5f22';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.stroke();
      // 생선 모양 무늬
      ctx.fillStyle = '#b9772f';
      ell(ctx, -r * 0.05, -r * 0.02, r * 0.3, r * 0.14);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(r * 0.22, -r * 0.02);
      ctx.lineTo(r * 0.4, -r * 0.14);
      ctx.lineTo(r * 0.4, r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff3d0';
      ell(ctx, -r * 0.2, -r * 0.05, r * 0.035, r * 0.035);
      ctx.fill();
      // 바깥으로 삐져나온 꼬리
      ctx.fillStyle = '#7fb4e8';
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.1);
      ctx.lineTo(r * 1.0, -r * 0.42);
      ctx.lineTo(r * 1.02, r * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3f78b0';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.stroke();
      break;
    }
    case 'acorn': {
      for (const [dx, dy, s2] of [[-0.32, 0.12, 0.8], [0.3, 0.1, 0.8], [0, -0.12, 1]] as const) {
        ell(ctx, dx * r, dy * r, r * 0.42 * s2, r * 0.36 * s2);
        ctx.fillStyle = radg(ctx, dx * r - r * 0.1, dy * r - r * 0.1, 0, r * 0.5, [0, '#f6c98a'], [1, '#d08c48']);
        ctx.fill();
        ctx.strokeStyle = '#8a5222';
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.stroke();
        // 도토리 아이싱
        ctx.fillStyle = '#7a4a22';
        ell(ctx, dx * r, dy * r - r * 0.08 * s2, r * 0.17 * s2, r * 0.09 * s2);
        ctx.fill();
        ctx.fillStyle = '#c47a3a';
        ell(ctx, dx * r, dy * r + r * 0.05 * s2, r * 0.12 * s2, r * 0.13 * s2);
        ctx.fill();
      }
      break;
    }
    case 'cocoa': {
      warmSteam();
      rr(ctx, -r * 0.5, -r * 0.45, r * 0.95, r * 0.95, r * 0.18);
      ctx.fillStyle = lin(ctx, -r * 0.5, 0, r * 0.5, 0, [0, '#ff6b6b'], [1, '#d63c4a']);
      ctx.fill();
      ctx.strokeStyle = '#8a1e2a';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(r * 0.5, 0, r * 0.22, -1.3, 1.3);
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.strokeStyle = '#d63c4a';
      ctx.stroke();
      ell(ctx, -r * 0.02, -r * 0.42, r * 0.45, r * 0.12);
      ctx.fillStyle = '#7a4325';
      ctx.fill();
      for (const [mx, my] of [[-0.18, -0.46], [0.12, -0.44]]) {
        rr(ctx, mx * r - r * 0.1, my * r - r * 0.08, r * 0.2, r * 0.14, r * 0.05);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      for (let k = 0; k < 3; k++) {
        ell(ctx, -r * 0.3 + k * r * 0.28, r * 0.05, r * 0.07, r * 0.07);
        ctx.fill();
      }
      break;
    }
    case 'soup': {
      warmSteam();
      ctx.beginPath();
      ctx.moveTo(-r * 0.78, -r * 0.2);
      ctx.quadraticCurveTo(0, r * 0.95, r * 0.78, -r * 0.2);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -r * 0.2, 0, r * 0.5, [0, '#6fb2ff'], [1, '#3f7fd0']);
      ctx.fill();
      ctx.strokeStyle = '#2a5a9a';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.stroke();
      ell(ctx, 0, -r * 0.2, r * 0.78, r * 0.18);
      ctx.fillStyle = '#f6dca0';
      ctx.fill();
      ctx.stroke();
      // 빨간 버섯
      ctx.fillStyle = '#fff1d6';
      rr(ctx, -r * 0.06, -r * 0.4, r * 0.12, r * 0.2, r * 0.04);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -r * 0.38, r * 0.24, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#e8413c';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (const [mx, my] of [[-0.1, -0.48], [0.1, -0.46], [0, -0.55]]) {
        ell(ctx, mx * r, my * r, r * 0.04, r * 0.035);
        ctx.fill();
      }
      ctx.fillStyle = '#7cc46a';
      ell(ctx, r * 0.4, -r * 0.22, r * 0.08, r * 0.04, 0.4);
      ctx.fill();
      break;
    }
    case 'berry': {
      ctx.beginPath();
      ctx.moveTo(-r * 0.75, -r * 0.1);
      ctx.lineTo(r * 0.75, -r * 0.1);
      ctx.lineTo(r * 0.62, r * 0.35);
      ctx.lineTo(-r * 0.62, r * 0.35);
      ctx.closePath();
      ctx.fillStyle = lin(ctx, 0, -r * 0.1, 0, r * 0.35, [0, '#f5c77e'], [1, '#d39445']);
      ctx.fill();
      ctx.strokeStyle = '#9a5f22';
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.stroke();
      ell(ctx, 0, -r * 0.12, r * 0.74, r * 0.2);
      ctx.fillStyle = '#fff0f4';
      ctx.fill();
      const B: [number, number, string][] = [[-0.45, -0.18, '#e8304a'], [-0.2, -0.24, '#4a5ad8'], [0.05, -0.2, '#e8304a'], [0.3, -0.24, '#6a3ac8'], [0.5, -0.16, '#e8304a'], [-0.05, -0.36, '#e8304a'], [0.2, -0.36, '#4a5ad8'], [-0.3, -0.34, '#6a3ac8']];
      for (const [bx, by, c] of B) {
        ell(ctx, bx * r, by * r, r * 0.13, r * 0.12);
        ctx.fillStyle = c;
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ell(ctx, bx * r - r * 0.04, by * r - r * 0.04, r * 0.035, r * 0.03);
        ctx.fill();
      }
      ctx.fillStyle = '#4cb04a';
      ell(ctx, r * 0.05, -r * 0.5, r * 0.14, r * 0.06, -0.4);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

// ── 동물 ──
type Mood = 'calm' | 'happy' | 'love' | 'sad' | 'wow' | 'gulp' | 'chew' | 'think';
interface Look { fur: string; furD: string; muz: string; cloth: string; clothD: string; ear: 'round' | 'long' | 'point' | 'tuft' | 'tiny' | 'owl' | 'cat' }
const LOOK: Record<Kind | 'raccoon' | 'cat', Look> = {
  bear: { fur: '#b87a45', furD: '#7d4e26', muz: '#f0d2a4', cloth: '#e5463f', clothD: '#a92a26', ear: 'round' },
  rabbit: { fur: '#fbf6ef', furD: '#c9bcae', muz: '#ffffff', cloth: '#5ea8f0', clothD: '#2f6db0', ear: 'long' },
  fox: { fur: '#f58a3a', furD: '#b9561c', muz: '#fff6ea', cloth: '#4cb06a', clothD: '#2c7a44', ear: 'point' },
  squirrel: { fur: '#c8743e', furD: '#8a4a22', muz: '#f6dcb8', cloth: '#ffcf3a', clothD: '#c69a12', ear: 'tuft' },
  hedgehog: { fur: '#f1d3a5', furD: '#6e4a2c', muz: '#fff1dc', cloth: '#a874e0', clothD: '#6e44a8', ear: 'tiny' },
  owl: { fur: '#a48a6a', furD: '#5e4a34', muz: '#efe2c8', cloth: '#2f3a5a', clothD: '#161c30', ear: 'owl' },
  raccoon: { fur: '#a3a8b2', furD: '#5d6270', muz: '#f4f2ee', cloth: '#ffffff', clothD: '#c9cfd8', ear: 'round' },
  cat: { fur: '#f6ad5e', furD: '#c46e22', muz: '#fff4e2', cloth: '#ff8fb0', clothD: '#c9557a', ear: 'cat' },
};
/**
 * 동물 한 마리. (x,y) = 발밑(앉으면 엉덩이 밑), r = 머리 반지름.
 * pose: walk(걷기) · sit(의자) · stand · head(초상) · counter(카운터 뒤, 가슴 위만)
 */
function animal(ctx: C2, k: Kind | 'raccoon' | 'cat', x: number, y: number, r: number, pose: 'walk' | 'sit' | 'stand' | 'head' | 'counter', mood: Mood, t: number, face: 1 | -1 = 1, phase = 0) {
  const L = LOOK[k], line = 'rgba(60,34,16,.75)', lw = Math.max(1.2, r * 0.09);
  ctx.save();
  ctx.translate(x, y);
  const walk = pose === 'walk' ? Math.sin(t * 0.45 + phase) : 0;
  const bob = pose === 'walk' ? -Math.abs(walk) * r * 0.18 : mood === 'love' || mood === 'happy' ? -Math.abs(Math.sin(t * 0.25 + phase)) * r * 0.12 : 0;
  const bodyH = pose === 'sit' ? r * 1.15 : r * 1.45, bodyW = r * (k === 'bear' ? 1.0 : k === 'owl' ? 1.0 : 0.82);
  const headY = pose === 'head' ? -r * 0.95 : pose === 'counter' ? -r * 1.2 : -bodyH - r * 0.72;
  ctx.translate(0, bob);
  if (pose !== 'head' && pose !== 'counter') {
    // 그림자
    ell(ctx, 0, -bob, r * 1.0, r * 0.25);
    ctx.fillStyle = 'rgba(70,40,15,.22)';
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = line;
  // 꼬리 (몸 뒤)
  if (pose !== 'head') {
    ctx.save();
    ctx.scale(face, 1);
    const ty = pose === 'counter' ? -r * 0.2 : -bodyH * 0.35, sw = Math.sin(t * 0.12 + phase) * 0.15;
    if (k === 'fox' || k === 'squirrel' || k === 'raccoon') {
      ctx.save();
      ctx.translate(-bodyW * 0.75, ty);
      ctx.rotate(sw + (k === 'squirrel' ? -0.6 : -0.25));
      const tl = k === 'squirrel' ? r * 1.7 : r * 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-r * 0.9, -tl * 0.2, -r * 1.0, -tl * 0.9, -r * 0.2, -tl);
      ctx.bezierCurveTo(r * 0.5, -tl * 0.8, r * 0.1, -tl * 0.3, r * 0.3, 0);
      ctx.closePath();
      ctx.fillStyle = L.fur;
      ctx.fill();
      ctx.stroke();
      if (k === 'fox') {
        ctx.fillStyle = '#fff6ea';
        ell(ctx, -r * 0.28, -tl * 0.92, r * 0.28, r * 0.22, 0.4);
        ctx.fill();
      }
      if (k === 'raccoon') {
        ctx.strokeStyle = L.furD;
        ctx.lineWidth = r * 0.16;
        for (let j = 1; j <= 3; j++) {
          ctx.beginPath();
          ctx.moveTo(-r * 0.75, -tl * j * 0.24);
          ctx.lineTo(r * 0.2, -tl * j * 0.24 + r * 0.1);
          ctx.stroke();
        }
      }
      ctx.restore();
    } else if (k === 'cat') {
      ctx.beginPath();
      ctx.moveTo(-bodyW * 0.6, ty);
      ctx.quadraticCurveTo(-bodyW * 1.5, ty - r * 0.2, -bodyW * 1.2, ty - r * 1.1 + sw * r);
      ctx.lineWidth = r * 0.26;
      ctx.strokeStyle = line;
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.lineWidth = r * 0.16;
      ctx.strokeStyle = L.fur;
      ctx.stroke();
    } else if (k === 'rabbit') {
      ell(ctx, -bodyW * 0.85, ty + r * 0.3, r * 0.3, r * 0.28);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    } else if (k === 'hedgehog') {
      // 등 가시
      ctx.fillStyle = L.furD;
      ctx.beginPath();
      const cy = -bodyH * 0.6;
      for (let j = 0; j <= 8; j++) {
        const a = Math.PI * 0.55 + (j / 8) * Math.PI * 0.9, rr0 = bodyW * 1.15, rr1 = bodyW * 1.6;
        ctx.lineTo(Math.cos(a) * rr0, cy + Math.sin(a) * rr0 * -1);
        ctx.lineTo(Math.cos(a + 0.09) * rr1, cy - Math.sin(a + 0.09) * rr1);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
  // 몸
  if (pose !== 'head') {
    const by = pose === 'counter' ? r * 0.4 : 0, bh = pose === 'counter' ? r * 1.4 : bodyH;
    // 다리
    if (pose === 'walk' || pose === 'stand') {
      ctx.fillStyle = L.furD;
      for (const sd of [-1, 1]) {
        const lift = pose === 'walk' ? Math.max(0, sd * walk) * r * 0.3 : 0;
        rr(ctx, sd * bodyW * 0.38 - r * 0.17, -r * 0.42 - lift, r * 0.34, r * 0.44, r * 0.14);
        ctx.fill();
        ctx.stroke();
      }
    } else if (pose === 'sit') {
      ctx.fillStyle = L.furD;
      ctx.save();
      ctx.scale(face, 1);
      rr(ctx, bodyW * 0.15, -r * 0.34, r * 0.62, r * 0.3, r * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(-bodyW, by - r * 0.15);
    ctx.bezierCurveTo(-bodyW * 1.05, by - bh * 0.7, -bodyW * 0.7, by - bh, 0, by - bh);
    ctx.bezierCurveTo(bodyW * 0.7, by - bh, bodyW * 1.05, by - bh * 0.7, bodyW, by - r * 0.15);
    ctx.quadraticCurveTo(0, by + r * 0.12, -bodyW, by - r * 0.15);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, -bodyW, 0, bodyW, 0, [0, L.fur], [1, L.furD]);
    ctx.fill();
    ctx.stroke();
    // 옷
    ctx.save();
    ctx.clip();
    if (k === 'bear' || k === 'hedgehog') {
      // 목도리
      ctx.fillStyle = L.cloth;
      rr(ctx, -bodyW * 1.1, by - bh - r * 0.05, bodyW * 2.2, r * 0.42, r * 0.2);
      ctx.fill();
      ctx.fillStyle = L.clothD;
      for (let j = 0; j < 4; j++) ctx.fillRect(-bodyW + j * bodyW * 0.55, by - bh, r * 0.12, r * 0.37);
    } else if (k === 'rabbit') {
      ctx.fillStyle = L.cloth;
      ctx.fillRect(-bodyW * 1.1, by - bh * 0.55, bodyW * 2.2, bh);
      ctx.fillRect(-bodyW * 0.55, by - bh * 0.95, r * 0.18, bh * 0.45);
      ctx.fillRect(bodyW * 0.55 - r * 0.18, by - bh * 0.95, r * 0.18, bh * 0.45);
      ctx.fillStyle = '#ffd23a';
      for (const sd of [-1, 1]) (ell(ctx, sd * bodyW * 0.46, by - bh * 0.55, r * 0.07, r * 0.07), ctx.fill());
    } else if (k === 'fox' || k === 'owl') {
      ctx.fillStyle = L.cloth;
      ctx.beginPath();
      ctx.moveTo(-bodyW * 1.1, by - bh);
      ctx.lineTo(-r * 0.12, by - bh);
      ctx.lineTo(-r * 0.12, by + r);
      ctx.lineTo(-bodyW * 1.1, by + r);
      ctx.moveTo(bodyW * 1.1, by - bh);
      ctx.lineTo(r * 0.12, by - bh);
      ctx.lineTo(r * 0.12, by + r);
      ctx.lineTo(bodyW * 1.1, by + r);
      ctx.fill();
      ctx.fillStyle = L.muz;
      ctx.fillRect(-r * 0.12, by - bh, r * 0.24, bh + r);
      if (k === 'owl') {
        // 나비넥타이
        ctx.fillStyle = '#e23a4a';
        ctx.beginPath();
        ctx.moveTo(0, by - bh + r * 0.15);
        ctx.lineTo(-r * 0.3, by - bh);
        ctx.lineTo(-r * 0.3, by - bh + r * 0.3);
        ctx.closePath();
        ctx.moveTo(0, by - bh + r * 0.15);
        ctx.lineTo(r * 0.3, by - bh);
        ctx.lineTo(r * 0.3, by - bh + r * 0.3);
        ctx.closePath();
        ctx.fill();
      }
    } else if (k === 'squirrel') {
      ell(ctx, 0, by - bh * 0.4, bodyW * 0.6, bh * 0.45);
      ctx.fillStyle = L.muz;
      ctx.fill();
    } else if (k === 'raccoon' || k === 'cat') {
      // 앞치마
      ctx.fillStyle = L.cloth;
      rr(ctx, -bodyW * 0.62, by - bh * 0.8, bodyW * 1.24, bh * 1.2, r * 0.2);
      ctx.fill();
      ctx.strokeStyle = L.clothD;
      ctx.lineWidth = r * 0.08;
      ctx.stroke();
      ctx.fillStyle = k === 'cat' ? '#ffffff' : '#ff8fb0';
      rr(ctx, -bodyW * 0.3, by - bh * 0.35, bodyW * 0.6, bh * 0.3, r * 0.08);
      ctx.fill();
    }
    ctx.restore();
    // 팔 (먹을 때 포크질)
    ctx.fillStyle = L.fur;
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    const armUp = mood === 'chew' ? 0.5 + 0.5 * Math.sin(t * 0.6 + phase) : mood === 'love' || mood === 'happy' ? 0.6 : 0;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * bodyW * 0.82, by - bh * 0.72);
      ctx.rotate(sd * (0.35 - armUp * (sd === face ? 1.6 : 0.4)));
      rr(ctx, -r * 0.14, 0, r * 0.28, r * 0.75, r * 0.14);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  // 머리
  ctx.save();
  ctx.translate(face * r * 0.06, headY);
  const tilt = mood === 'sad' ? 0.18 * face : mood === 'think' ? -0.1 * face : Math.sin(t * 0.05 + phase) * 0.04;
  ctx.rotate(tilt);
  ctx.lineWidth = lw;
  ctx.strokeStyle = line;
  // 귀
  const earDroop = mood === 'sad' ? 1 : 0;
  ctx.fillStyle = L.fur;
  if (L.ear === 'round') {
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.7, -r * 0.68, r * 0.3, r * 0.3);
      ctx.fill();
      ctx.stroke();
      ell(ctx, sd * r * 0.7, -r * 0.68, r * 0.16, r * 0.16);
      ctx.fillStyle = k === 'raccoon' ? '#5d6270' : '#e7a98a';
      ctx.fill();
      ctx.fillStyle = L.fur;
    }
  } else if (L.ear === 'long') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * r * 0.32, -r * 0.7);
      ctx.rotate(sd * (0.12 + earDroop * 1.1 + Math.sin(t * 0.1 + phase + sd) * 0.05));
      ell(ctx, 0, -r * 0.62, r * 0.24, r * 0.7);
      ctx.fill();
      ctx.stroke();
      ell(ctx, 0, -r * 0.6, r * 0.11, r * 0.52);
      ctx.fillStyle = '#ffb6c6';
      ctx.fill();
      ctx.fillStyle = L.fur;
      ctx.restore();
    }
    // 리본
    ctx.fillStyle = '#ff6f91';
    ctx.save();
    ctx.translate(r * 0.42, -r * 0.82);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-r * 0.28, -r * 0.18);
    ctx.lineTo(-r * 0.28, r * 0.18);
    ctx.closePath();
    ctx.moveTo(0, 0);
    ctx.lineTo(r * 0.28, -r * 0.18);
    ctx.lineTo(r * 0.28, r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  } else if (L.ear === 'point' || L.ear === 'cat' || L.ear === 'tuft') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * r * 0.55, -r * 0.6);
      ctx.rotate(sd * (0.25 + earDroop * 0.8));
      const eh = L.ear === 'point' ? r * 0.75 : r * 0.55;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.1);
      ctx.lineTo(0, -eh);
      ctx.lineTo(r * 0.3, r * 0.1);
      ctx.closePath();
      ctx.fillStyle = L.fur;
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.14, 0);
      ctx.lineTo(0, -eh * 0.65);
      ctx.lineTo(r * 0.14, 0);
      ctx.closePath();
      ctx.fillStyle = L.ear === 'point' ? '#4a2c17' : '#ffb6a6';
      ctx.fill();
      if (L.ear === 'tuft') {
        ctx.fillStyle = L.furD;
        ell(ctx, 0, -eh, r * 0.08, r * 0.16);
        ctx.fill();
      }
      ctx.restore();
    }
  } else if (L.ear === 'tiny') {
    // 고슴도치: 머리 위 가시 + 작은 귀
    ctx.fillStyle = L.furD;
    ctx.beginPath();
    for (let j = 0; j <= 9; j++) {
      const a = Math.PI * 1.1 + (j / 9) * Math.PI * 0.8;
      ctx.lineTo(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95 + r * 0.05);
      ctx.lineTo(Math.cos(a + 0.08) * r * 1.45, Math.sin(a + 0.08) * r * 1.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = L.fur;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.62, -r * 0.55, r * 0.16, r * 0.14);
      ctx.fill();
      ctx.stroke();
    }
  } else if (L.ear === 'owl') {
    ctx.fillStyle = L.furD;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.35, -r * 0.75);
      ctx.lineTo(sd * r * 0.8, -r * 1.15);
      ctx.lineTo(sd * r * 0.8, -r * 0.5);
      ctx.closePath();
      ctx.fill();
    }
  }
  // 얼굴
  ell(ctx, 0, 0, r, r * 0.92);
  ctx.fillStyle = radg(ctx, -r * 0.3, -r * 0.35, r * 0.1, r * 1.2, [0, k === 'rabbit' ? '#ffffff' : L.fur], [1, L.furD]);
  ctx.fill();
  ctx.stroke();
  if (k === 'fox') {
    ctx.fillStyle = L.muz;
    ctx.beginPath();
    ctx.moveTo(-r * 0.98, r * 0.05);
    ctx.quadraticCurveTo(-r * 0.4, r * 0.15, 0, r * 0.88);
    ctx.quadraticCurveTo(r * 0.4, r * 0.15, r * 0.98, r * 0.05);
    ctx.quadraticCurveTo(r * 0.6, r * 0.85, 0, r * 0.9);
    ctx.quadraticCurveTo(-r * 0.6, r * 0.85, -r * 0.98, r * 0.05);
    ctx.fill();
  } else if (k === 'owl') {
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.4, -r * 0.05, r * 0.42, r * 0.42);
      ctx.fillStyle = L.muz;
      ctx.fill();
    }
  } else {
    ell(ctx, 0, r * 0.32, r * (k === 'bear' ? 0.48 : 0.42), r * 0.34);
    ctx.fillStyle = L.muz;
    ctx.fill();
  }
  if (k === 'raccoon') {
    ctx.fillStyle = '#4a4e58';
    ctx.beginPath();
    ctx.ellipse(-r * 0.4, -r * 0.08, r * 0.36, r * 0.24, 0.25, 0, TAU);
    ctx.ellipse(r * 0.4, -r * 0.08, r * 0.36, r * 0.24, -0.25, 0, TAU);
    ctx.fill();
  }
  if (k === 'cat') {
    ctx.strokeStyle = L.furD;
    ctx.lineWidth = r * 0.1;
    for (let j = -1; j <= 1; j++) {
      ctx.beginPath();
      ctx.moveTo(j * r * 0.25, -r * 0.88);
      ctx.lineTo(j * r * 0.2, -r * 0.6);
      ctx.stroke();
    }
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
  }
  // 눈
  const ex = r * (k === 'owl' ? 0.4 : 0.38), ey = -r * 0.06;
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.4, r * 0.11);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const cx = sd * ex;
    if (mood === 'happy' || mood === 'chew') {
      ctx.beginPath();
      ctx.arc(cx, ey + r * 0.06, r * 0.13, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'love') {
      heartPath(ctx, cx, ey, r * 0.17);
      ctx.fillStyle = '#ff4f78';
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    } else if (mood === 'gulp') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.14, ey - r * 0.06);
      ctx.lineTo(cx + r * 0.02 * sd, ey + r * 0.02);
      ctx.lineTo(cx - r * 0.14, ey + r * 0.1);
      ctx.stroke();
    } else if (mood === 'sad') {
      ell(ctx, cx, ey + r * 0.04, r * 0.1, r * 0.12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.16, ey - r * 0.2 - sd * r * 0.06);
      ctx.lineTo(cx + r * 0.14, ey - r * 0.2 + sd * r * 0.06);
      ctx.stroke();
    } else {
      const big = mood === 'wow' ? 1.35 : 1, blink = Math.sin(t * 0.07 + phase * 3) > 0.985 ? 0.15 : 1;
      if (k === 'owl') {
        ell(ctx, cx, ey, r * 0.24, r * 0.24 * blink);
        ctx.fillStyle = '#ffd23a';
        ctx.fill();
        ctx.fillStyle = '#2a1a10';
      }
      ell(ctx, cx, ey, r * 0.12 * big, r * 0.15 * big * blink);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, cx - r * 0.04, ey - r * 0.06, r * 0.045 * big, r * 0.045 * big * blink);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
    }
  }
  if (k === 'owl') {
    // 외알 안경
    ctx.strokeStyle = '#d4a020';
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ell(ctx, ex, ey, r * 0.3, r * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ex + r * 0.2, ey + r * 0.22);
    ctx.lineTo(ex + r * 0.35, ey + r * 0.8);
    ctx.stroke();
  }
  // 코 · 입
  ctx.fillStyle = k === 'owl' ? '#f0a020' : '#3a2416';
  if (k === 'owl') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, r * 0.22);
    ctx.lineTo(r * 0.12, r * 0.22);
    ctx.lineTo(0, r * 0.45);
    ctx.closePath();
    ctx.fill();
  } else {
    ell(ctx, 0, r * (k === 'fox' ? 0.36 : 0.2), r * (k === 'bear' ? 0.15 : 0.1), r * 0.08);
    ctx.fill();
  }
  ctx.strokeStyle = '#3a2416';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  const my = r * (k === 'fox' ? 0.5 : k === 'owl' ? 0.55 : 0.4);
  if (mood === 'gulp') {
    // 볼이 빵빵
    ctx.fillStyle = L.fur;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.62, r * 0.32, r * 0.36, r * 0.3);
      ctx.fill();
      ctx.strokeStyle = line;
      ctx.stroke();
    }
    ctx.strokeStyle = '#3a2416';
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, my);
    ctx.lineTo(r * 0.12, my);
    ctx.stroke();
  } else if (mood === 'wow') {
    ell(ctx, 0, my + r * 0.05, r * 0.12, r * 0.15);
    ctx.fillStyle = '#7a2a2a';
    ctx.fill();
  } else if (mood === 'sad') {
    ctx.beginPath();
    ctx.arc(0, my + r * 0.16, r * 0.14, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    // 눈물
    ctx.fillStyle = '#7fc4ff';
    const ty = (t * 0.5 + phase * 20) % (r * 0.8);
    ell(ctx, ex + r * 0.05, ey + r * 0.2 + ty, r * 0.07, r * 0.1);
    ctx.fill();
  } else if (mood === 'chew') {
    const o = Math.abs(Math.sin(t * 0.6 + phase));
    ell(ctx, 0, my, r * 0.12, r * (0.03 + 0.08 * o));
    ctx.fillStyle = '#7a2a2a';
    ctx.fill();
  } else if (mood === 'think') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, my);
    ctx.lineTo(r * 0.1, my - r * 0.03);
    ctx.stroke();
  } else {
    const wide = mood === 'happy' || mood === 'love' ? 1.3 : 1;
    ctx.beginPath();
    ctx.arc(-r * 0.09 * wide, my - r * 0.04, r * 0.1 * wide, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.arc(r * 0.09 * wide, my - r * 0.04, r * 0.1 * wide, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    if (mood === 'happy' || mood === 'love') {
      ctx.fillStyle = '#ff7a8a';
      ell(ctx, 0, my + r * 0.08, r * 0.08, r * 0.06);
      ctx.fill();
    }
  }
  // 볼 터치
  ctx.fillStyle = mood === 'love' ? 'rgba(255,90,120,.6)' : 'rgba(255,120,140,.38)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * r * 0.62, r * 0.22, r * 0.16, r * 0.1);
    ctx.fill();
  }
  // 모자
  if (k === 'squirrel') {
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.62, r * 0.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    ctx.stroke();
    ctx.fillStyle = '#e8a000';
    rr(ctx, -r * 0.05 + face * r * 0.3, -r * 0.7, r * 0.55 * face, r * 0.14, r * 0.07);
    ctx.fill();
  }
  if (k === 'owl') {
    ctx.fillStyle = '#2f3a5a';
    rr(ctx, -r * 0.34, -r * 1.42, r * 0.68, r * 0.62, r * 0.06);
    ctx.fill();
    ctx.fillStyle = '#e23a4a';
    ctx.fillRect(-r * 0.34, -r * 0.95, r * 0.68, r * 0.12);
    ctx.fillStyle = '#2f3a5a';
    rr(ctx, -r * 0.6, -r * 0.84, r * 1.2, r * 0.1, r * 0.05);
    ctx.fill();
  }
  if (k === 'raccoon') {
    // 요리사 모자
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = line;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 1.12, r * 0.3, 0, TAU);
    ctx.arc(r * 0.32, -r * 1.12, r * 0.3, 0, TAU);
    ctx.arc(0, -r * 1.3, r * 0.36, 0, TAU);
    ctx.fill();
    rr(ctx, -r * 0.55, -r * 1.0, r * 1.1, r * 0.3, r * 0.08);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// ── 장면 배치 ──
/** 탁자 자리: 처음 셋, 자리 더하기마다 하나씩 */
const TABLES: [number, number][] = [[0.68, 0.645], [0.32, 0.645], [0.5, 0.835], [0.17, 0.85], [0.83, 0.85]];
const seatPos = (i: number): [number, number, 1 | -1] => {
  const [tx, ty] = TABLES[Math.floor(i / 2)], sd = i % 2 ? -1 : 1;
  return [tx + sd * 0.115, ty + 0.035, (sd === 1 ? -1 : 1) as 1 | -1];
};
const DOOR_XY: [number, number] = [0.875, 0.5];
const BOARD = { x0: 0.285, x1: 0.715, y0: 0.175, y1: 0.43 };
const HR = 0.05; // 손님 머리 반지름 (화면 폭 비율)

/** 손님 한 명의 지금 자리·자세 (연출 전용, 시뮬레이션과 같은 틱 기준) */
function actorAt(a: Actor, pt: number): { x: number; y: number; pose: 'walk' | 'sit' | 'stand'; mood: Mood; face: 1 | -1; alpha: number; bubble: boolean; ate: number } | null {
  const o = a.o, dt = pt - a.t0;
  if (dt < 0) return null;
  const [dx, dy] = DOOR_XY;
  const lerp = (x0: number, y0: number, x1: number, y1: number, u: number) => [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u] as const;
  if (o.res === 'noseat') {
    const tx = 0.76, ty = 0.57;
    if (dt < 10) {
      const [x, y] = lerp(dx, dy, tx, ty, dt / 10);
      return { x, y, pose: 'walk', mood: 'calm', face: -1, alpha: Math.min(1, dt / 4), bubble: false, ate: 0 };
    }
    if (dt < 30) return { x: tx, y: ty, pose: 'stand', mood: dt < 16 ? 'wow' : 'sad', face: -1, alpha: 1, bubble: false, ate: 0 };
    const u = (dt - 30) / 14;
    if (u > 1) return null;
    const [x, y] = lerp(tx, ty, dx, dy, u);
    return { x, y, pose: 'walk', mood: 'sad', face: 1, alpha: 1 - Math.max(0, u - 0.7) / 0.3, bubble: false, ate: 0 };
  }
  if (o.res === 'none') {
    const tx = 0.5 + ((o.i % 5) - 2) * 0.07, ty = 0.555;
    if (dt < WALK) {
      const [x, y] = lerp(dx, dy, tx, ty, ease(dt / WALK));
      return { x, y, pose: 'walk', mood: 'calm', face: -1, alpha: Math.min(1, dt / 4), bubble: false, ate: 0 };
    }
    if (dt < WALK + THINK + 18) return { x: tx, y: ty, pose: 'stand', mood: dt < WALK + THINK ? 'think' : 'sad', face: -1, alpha: 1, bubble: dt < WALK + THINK, ate: 0 };
    const u = (dt - WALK - THINK - 18) / 20;
    if (u > 1) return null;
    const [x, y] = lerp(tx, ty, dx, dy, u);
    return { x, y, pose: 'walk', mood: 'sad', face: 1, alpha: 1 - Math.max(0, u - 0.7) / 0.3, bubble: false, ate: 0 };
  }
  const [sx, sy, sf] = seatPos(o.seat);
  if (dt < WALK) {
    const u = ease(dt / WALK);
    const [x, y] = lerp(dx, dy, sx, sy, u);
    return { x, y, pose: 'walk', mood: 'calm', face: sx < dx ? -1 : 1, alpha: Math.min(1, dt / 4), bubble: false, ate: 0 };
  }
  if (dt < WALK + THINK) return { x: sx, y: sy, pose: 'sit', mood: 'think', face: sf, alpha: 1, bubble: true, ate: 0 };
  if (dt < WALK + THINK + EAT) {
    const gulp = o.k === 'bear' && o.dish === 'honey';
    return { x: sx, y: sy, pose: 'sit', mood: gulp ? 'gulp' : 'chew', face: sf, alpha: 1, bubble: false, ate: gulp ? 1 : (dt - WALK - THINK) / EAT };
  }
  return { x: sx, y: sy, pose: 'sit', mood: o.res === 'fav' ? 'love' : 'happy', face: sf, alpha: 1, bubble: false, ate: 1 };
}

// ── 배경 (크기·날씨별로 한 번 그려 둔다) ──
const BG = new Map<string, HTMLCanvasElement>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
function getBg(w: number, h: number, rain: boolean, sc: number): HTMLCanvasElement {
  const key = `${w}x${h}@${sc}:${rain ? 1 : 0}`;
  let b = BG.get(key);
  if (b) return b;
  const R = (v: number) => v * w;
  b = layer(w, R(0.99), sc, (g) => {
    const wallY0 = R(0.135), floorY = R(0.5), endY = R(0.99);
    // 벽: 꿀색 나무 판자
    g.fillStyle = lin(g, 0, wallY0, 0, floorY, [0, '#f3c98c'], [1, '#e2a764']);
    g.fillRect(0, wallY0, w, floorY - wallY0);
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w;
      g.fillStyle = i % 2 ? 'rgba(255,240,210,.12)' : 'rgba(150,90,40,.06)';
      g.fillRect(x, wallY0, w / 14, floorY - wallY0);
      g.strokeStyle = 'rgba(140,80,35,.25)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, wallY0);
      g.lineTo(x, floorY);
      g.stroke();
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = 'rgba(140,80,35,.1)';
        g.beginPath();
        const yy = wallY0 + hsh(i * 7 + k) * (floorY - wallY0);
        g.ellipse(x + w / 28, yy, R(0.012), R(0.004), 0, 0, TAU);
        g.stroke();
      }
    }
    // 위 대들보
    g.fillStyle = lin(g, 0, wallY0, 0, wallY0 + R(0.03), [0, '#a8683a'], [1, '#8a4f26']);
    g.fillRect(0, wallY0, w, R(0.03));
    // 아래 징두리 판
    g.fillStyle = lin(g, 0, R(0.43), 0, floorY, [0, '#c98a4c'], [1, '#a86a34']);
    g.fillRect(0, R(0.43), w, floorY - R(0.43));
    g.fillStyle = '#8a4f26';
    g.fillRect(0, R(0.425), w, R(0.01));
    // 창문 (왼쪽): 바깥 숲
    const wx0 = R(0.035), wx1 = R(0.255), wy0 = R(0.185), wy1 = R(0.4);
    g.save();
    g.beginPath();
    g.moveTo(wx0, wy1);
    g.lineTo(wx0, wy0 + R(0.06));
    g.arc((wx0 + wx1) / 2, wy0 + R(0.06), (wx1 - wx0) / 2, Math.PI, 0);
    g.lineTo(wx1, wy1);
    g.closePath();
    g.clip();
    g.fillStyle = rain ? lin(g, 0, wy0, 0, wy1, [0, '#8fa6bf'], [1, '#c7d6e2']) : lin(g, 0, wy0, 0, wy1, [0, '#8fd3ff'], [0.7, '#d8f3ff'], [1, '#fff4cf']);
    g.fillRect(wx0, wy0 - R(0.05), wx1 - wx0, wy1 - wy0 + R(0.05));
    if (!rain) {
      g.fillStyle = radg(g, wx1 - R(0.03), wy0 + R(0.03), 0, R(0.12), [0, 'rgba(255,255,220,.95)'], [1, 'rgba(255,255,220,0)']);
      g.fillRect(wx0, wy0 - R(0.05), wx1 - wx0, wy1 - wy0);
    }
    // 먼 숲 · 가까운 나무
    for (const [col, base, amp, n] of [[rain ? '#7f9a8a' : '#8fd08a', 0.33, 0.05, 6], [rain ? '#5f7f6a' : '#5cb86a', 0.36, 0.07, 4], [rain ? '#4a6a56' : '#3f9a52', 0.395, 0.06, 3]] as const) {
      g.fillStyle = col;
      for (let i = 0; i <= n; i++) {
        const tx = wx0 + (i / n) * (wx1 - wx0) + hsh(i + n) * R(0.02), ty = R(base) - hsh(i * 3 + n) * R(amp);
        g.beginPath();
        g.arc(tx, ty, R(0.035 + hsh(i + 9 * n) * 0.02), 0, TAU);
        g.fill();
        g.fillRect(tx - R(0.03), ty, R(0.06), wy1 - ty);
      }
    }
    // 꽃
    for (let i = 0; i < 7; i++) {
      g.fillStyle = ['#ff8fb0', '#ffd23a', '#ffffff', '#ff7a5a'][i % 4];
      g.beginPath();
      g.arc(wx0 + R(0.02) + i * R(0.03), wy1 - R(0.012) - hsh(i) * R(0.01), R(0.007), 0, TAU);
      g.fill();
    }
    g.restore();
    // 창틀
    g.strokeStyle = '#7a4520';
    g.lineWidth = R(0.014);
    g.beginPath();
    g.moveTo(wx0, wy1);
    g.lineTo(wx0, wy0 + R(0.06));
    g.arc((wx0 + wx1) / 2, wy0 + R(0.06), (wx1 - wx0) / 2, Math.PI, 0);
    g.lineTo(wx1, wy1);
    g.closePath();
    g.stroke();
    g.lineWidth = R(0.007);
    g.beginPath();
    g.moveTo((wx0 + wx1) / 2, wy0 - R(0.04));
    g.lineTo((wx0 + wx1) / 2, wy1);
    g.moveTo(wx0, R(0.29));
    g.lineTo(wx1, R(0.29));
    g.stroke();
    // 창턱 + 작은 화분
    g.fillStyle = '#9a5a2c';
    rr(g, wx0 - R(0.015), wy1, wx1 - wx0 + R(0.03), R(0.018), R(0.006));
    g.fill();
    // 문 (오른쪽 벽) 틀
    const dx0 = R(0.8), dx1 = R(0.95), dy0 = R(0.215), dy1 = floorY + R(0.005);
    g.fillStyle = '#5c3216';
    rr(g, dx0 - R(0.014), dy0 - R(0.014), dx1 - dx0 + R(0.028), dy1 - dy0 + R(0.014), R(0.02));
    g.fill();
    // 문 너머 바깥 (열렸을 때 보임)
    g.fillStyle = rain ? lin(g, 0, dy0, 0, dy1, [0, '#a8bccf'], [1, '#7f9a8a']) : lin(g, 0, dy0, 0, dy1, [0, '#bfe9ff'], [0.6, '#e9f8d8'], [1, '#7cc46a']);
    g.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
    // 바닥: 원근 나무 마루
    g.fillStyle = lin(g, 0, floorY, 0, endY, [0, '#c48a52'], [1, '#e2ad72']);
    g.fillRect(0, floorY, w, endY - floorY);
    const vx = w / 2, vy = R(0.1);
    g.strokeStyle = 'rgba(110,60,25,.28)';
    g.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      const bx = w / 2 + i * w * 0.11;
      g.beginPath();
      const u = (floorY - vy) / (endY - vy);
      g.moveTo(vx + (bx - vx) * u, floorY);
      g.lineTo(bx, endY);
      g.stroke();
    }
    for (let j = 0; j < 9; j++) {
      const yy = floorY + (endY - floorY) * ((j + 1) / 9) ** 1.3;
      g.strokeStyle = 'rgba(110,60,25,.16)';
      g.beginPath();
      g.moveTo(0, yy);
      g.lineTo(w, yy);
      g.stroke();
    }
    // 바닥 걸레받이 그림자
    g.fillStyle = lin(g, 0, floorY, 0, floorY + R(0.04), [0, 'rgba(80,40,10,.35)'], [1, 'rgba(80,40,10,0)']);
    g.fillRect(0, floorY, w, R(0.04));
    // 둥근 깔개
    g.fillStyle = 'rgba(80,40,10,.12)';
    ell(g, w / 2, R(0.76), R(0.43), R(0.14));
    g.fill();
    ell(g, w / 2, R(0.75), R(0.42), R(0.135));
    g.fillStyle = lin(g, 0, R(0.62), 0, R(0.88), [0, '#f08a6a'], [1, '#d9604a']);
    g.fill();
    ell(g, w / 2, R(0.75), R(0.36), R(0.11));
    g.strokeStyle = 'rgba(255,240,200,.75)';
    g.lineWidth = R(0.008);
    g.setLineDash([R(0.015), R(0.012)]);
    g.stroke();
    g.setLineDash([]);
    ell(g, w / 2, R(0.75), R(0.25), R(0.075));
    g.strokeStyle = 'rgba(255,214,120,.7)';
    g.lineWidth = R(0.006);
    g.stroke();
    // 창에서 들어오는 햇살 자국 (바닥)
    if (!rain) {
      g.fillStyle = 'rgba(255,248,210,.22)';
      g.beginPath();
      g.moveTo(R(0.03), floorY);
      g.lineTo(R(0.27), floorY);
      g.lineTo(R(0.52), endY);
      g.lineTo(R(0.2), endY);
      g.closePath();
      g.fill();
    }
  });
  BG.set(key, b);
  if (BG.size > 12) BG.delete(BG.keys().next().value!);
  return b;
}

// ── 탁자 ──
function table(ctx: C2, x: number, y: number, R: (v: number) => number, pop = 1) {
  const tw = R(0.12) * pop, th = R(0.045) * pop;
  ell(ctx, x, y + R(0.06), tw * 0.9, th * 0.8);
  ctx.fillStyle = 'rgba(70,35,10,.25)';
  ctx.fill();
  ctx.fillStyle = '#7a4520';
  rr(ctx, x - R(0.012), y, R(0.024), R(0.06), R(0.008));
  ctx.fill();
  ell(ctx, x, y + R(0.058), R(0.04), R(0.012));
  ctx.fill();
  ell(ctx, x, y + R(0.012), tw, th);
  ctx.fillStyle = '#9a5a2c';
  ctx.fill();
  ell(ctx, x, y, tw, th);
  ctx.fillStyle = lin(ctx, x - tw, y, x + tw, y, [0, '#f2c084'], [1, '#d99a58']);
  ctx.fill();
  ctx.strokeStyle = '#7a4520';
  ctx.lineWidth = Math.max(1, R(0.004));
  ctx.stroke();
  // 체크 식탁보
  ell(ctx, x, y - R(0.002), tw * 0.7, th * 0.7);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = 'rgba(232,80,80,.45)';
  for (let k = -6; k <= 6; k++) ctx.fillRect(x + k * R(0.018), y - th, R(0.008), th * 2);
  for (let k = -3; k <= 3; k++) ctx.fillRect(x - tw, y + k * R(0.012), tw * 2, R(0.005));
  ctx.restore();
}
function chair(ctx: C2, x: number, y: number, face: 1 | -1, R: (v: number) => number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = '#8a4f26';
  rr(ctx, -R(0.05), -R(0.11), R(0.016), R(0.12), R(0.006));
  ctx.fill();
  rr(ctx, -R(0.05), -R(0.115), R(0.03), R(0.035), R(0.01));
  ctx.fillStyle = '#e85a4a';
  ctx.fill();
  ctx.fillStyle = '#9a5a2c';
  rr(ctx, -R(0.045), -R(0.012), R(0.085), R(0.018), R(0.006));
  ctx.fill();
  ctx.fillStyle = '#7a4520';
  ctx.fillRect(-R(0.04), R(0.0), R(0.008), R(0.028));
  ctx.fillRect(R(0.028), R(0.0), R(0.008), R(0.028));
  ctx.restore();
}
function plantPot(ctx: C2, x: number, y: number, s: number, t: number, kind: number) {
  ctx.save();
  ctx.translate(x, y);
  ell(ctx, 0, 0, s * 0.55, s * 0.14);
  ctx.fillStyle = 'rgba(70,35,10,.25)';
  ctx.fill();
  // 잎
  const sw = Math.sin(t * 0.03 + kind) * 0.05;
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.38 + sw;
    ctx.save();
    ctx.translate(0, -s * 0.55);
    ctx.rotate(a + Math.PI / 2);
    ell(ctx, 0, -s * 0.42, s * 0.16, s * 0.42);
    ctx.fillStyle = i % 2 ? '#4cae5a' : '#6cc86a';
    ctx.fill();
    ctx.strokeStyle = '#2e7a3a';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.stroke();
    ctx.restore();
  }
  if (kind % 2 === 0) {
    for (let i = 0; i < 4; i++) {
      const fx2 = (i - 1.5) * s * 0.28, fy = -s * (1.05 + 0.15 * hsh(i + kind));
      ctx.fillStyle = ['#ff6f91', '#ffd23a', '#ff8a5a', '#ffffff'][i % 4];
      for (let p = 0; p < 5; p++) {
        ell(ctx, fx2 + Math.cos((p / 5) * TAU) * s * 0.07, fy + Math.sin((p / 5) * TAU) * s * 0.07, s * 0.06, s * 0.06);
        ctx.fill();
      }
      ctx.fillStyle = '#ffb02a';
      ell(ctx, fx2, fy, s * 0.04, s * 0.04);
      ctx.fill();
    }
  }
  // 화분
  ctx.beginPath();
  ctx.moveTo(-s * 0.36, -s * 0.55);
  ctx.lineTo(s * 0.36, -s * 0.55);
  ctx.lineTo(s * 0.27, 0);
  ctx.lineTo(-s * 0.27, 0);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -s * 0.36, 0, s * 0.36, 0, [0, '#e8865a'], [1, '#b85a32']);
  ctx.fill();
  ctx.strokeStyle = '#8a3e1e';
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.stroke();
  rr(ctx, -s * 0.4, -s * 0.62, s * 0.8, s * 0.12, s * 0.04);
  ctx.fillStyle = '#d9784a';
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
/** 날씨·사건 작은 그림 (달력·예보) */
function evIcon(ctx: C2, kind: string, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'sun') {
    ctx.strokeStyle = '#ffb21a';
    ctx.lineWidth = Math.max(1.2, r * 0.18);
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + t * 0.01;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      ctx.lineTo(Math.cos(a) * r * 1.0, Math.sin(a) * r * 1.0);
      ctx.stroke();
    }
    ell(ctx, 0, 0, r * 0.52, r * 0.52);
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
  } else if (kind === 'rain') {
    ctx.fillStyle = '#9fb4cc';
    for (const [cx, cy, cr] of [[-0.35, 0.05, 0.42], [0.1, -0.15, 0.52], [0.45, 0.08, 0.38]]) {
      ell(ctx, cx * r, cy * r, cr * r, cr * r);
      ctx.fill();
    }
    ctx.fillRect(-r * 0.7, 0, r * 1.4, r * 0.4);
    ctx.fillStyle = '#4a9ae8';
    for (let k = 0; k < 3; k++) {
      const dy = ((t * 0.08 + k * 0.33) % 1) * r * 0.5;
      ell(ctx, (-0.4 + k * 0.4) * r, r * 0.6 + dy, r * 0.09, r * 0.15);
      ctx.fill();
    }
  } else if (kind === 'group') {
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = '#6e4a2c';
      ell(ctx, (k - 1) * r * 0.55, r * 0.05, r * 0.38, r * 0.38);
      ctx.fill();
      ctx.fillStyle = '#f1d3a5';
      ell(ctx, (k - 1) * r * 0.55, r * 0.15, r * 0.26, r * 0.24);
      ctx.fill();
    }
  } else if (kind === 'gourmet') {
    ctx.fillStyle = '#2f3a5a';
    rr(ctx, -r * 0.4, -r * 0.9, r * 0.8, r * 0.85, r * 0.08);
    ctx.fill();
    rr(ctx, -r * 0.75, -r * 0.12, r * 1.5, r * 0.22, r * 0.1);
    ctx.fill();
    ctx.fillStyle = '#e23a4a';
    ctx.fillRect(-r * 0.4, -r * 0.35, r * 0.8, r * 0.16);
    ctx.strokeStyle = '#d4a020';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ell(ctx, r * 0.2, r * 0.5, r * 0.3, r * 0.3);
    ctx.stroke();
  } else if (kind === 'festival') {
    ctx.strokeStyle = '#7a4520';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(-r, -r * 0.5);
    ctx.quadraticCurveTo(0, r * 0.1, r, -r * 0.5);
    ctx.stroke();
    for (let k = 0; k < 4; k++) {
      const px = -r * 0.75 + k * r * 0.5, py = -r * 0.32 + Math.sin((k / 3) * Math.PI) * r * 0.25;
      ctx.fillStyle = ['#ff5a6e', '#ffd23a', '#5ab8ff', '#7cd46a'][k];
      ctx.beginPath();
      ctx.moveTo(px - r * 0.2, py);
      ctx.lineTo(px + r * 0.2, py);
      ctx.lineTo(px, py + r * 0.55);
      ctx.closePath();
      ctx.fill();
    }
  } else if (kind === 'priceup') {
    ctx.fillStyle = '#ff5a5a';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.8, 0);
    ctx.lineTo(r * 0.3, 0);
    ctx.lineTo(r * 0.3, r * 0.9);
    ctx.lineTo(-r * 0.3, r * 0.9);
    ctx.lineTo(-r * 0.3, 0);
    ctx.lineTo(-r * 0.8, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a82020';
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}
/** 업그레이드 그림 */
function upIcon(ctx: C2, o: UpId, x: number, y: number, r: number, t: number) {
  if (o === 'plant') plantPot(ctx, x, y + r * 0.9, r * 1.5, t, 0);
  else if (o === 'table') {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#7a4520';
    rr(ctx, -r * 0.1, -r * 0.1, r * 0.2, r * 0.8, r * 0.06);
    ctx.fill();
    ell(ctx, 0, -r * 0.1, r * 0.9, r * 0.32);
    ctx.fillStyle = '#e2a868';
    ctx.fill();
    ctx.strokeStyle = '#7a4520';
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#e85a4a';
      rr(ctx, sd * r * 1.1 - r * 0.22, -r * 0.55, r * 0.44, r * 0.3, r * 0.08);
      ctx.fill();
      ctx.fillStyle = '#9a5a2c';
      ctx.fillRect(sd * r * 1.1 - r * 0.25, -r * 0.05, r * 0.5, r * 0.12);
      ctx.fillRect(sd * r * 1.1 - r * 0.04, 0, r * 0.08, r * 0.6);
    }
    ctx.restore();
  } else animal(ctx, 'cat', x, y + r * 0.85, r * 0.62, 'head', 'happy', t);
}

// ── 그리기 본체 ──
const flyMemo = new WeakMap<object, { d: DishId; t: number; x: number; y: number; slot: number }[]>();
const dropMemo = new WeakMap<object, { d: DishId; t: number; x: number; y: number }[]>();
const bandMemo = new WeakMap<object, { text: string; sub: string; t: number; col: string }>();
const shakeMemo = new WeakMap<object, { i: number; t: number }>();

function drawAll(ctx: C2, s: CafeState, w: number, h: number, th: Theme) {
  const fx = juice(s), R = (v: number) => v * w, t = s.t;
  const plan = planOf(s), sc = Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const morning = s.phase === 'morning', open = s.phase === 'open', eve = s.phase === 'evening';
  const prev = morning ? simulateDay(plan, s.menu, s.upg) : null;
  const firstEver = s.stage === 0 && s.day === 0 && morning;
  void th;
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = '#f7d9a6';
  ctx.fillRect(-20, -20, w + 40, h + 40);
  ctx.drawImage(getBg(w, h, plan.rain, sc), 0, 0, w, R(0.99));
  // 창밖 움직임: 비 · 구름 · 햇살 먼지
  {
    const wx0 = R(0.035), wx1 = R(0.255), wy0 = R(0.185), wy1 = R(0.4);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(wx0, wy1);
    ctx.lineTo(wx0, wy0 + R(0.06));
    ctx.arc((wx0 + wx1) / 2, wy0 + R(0.06), (wx1 - wx0) / 2, Math.PI, 0);
    ctx.lineTo(wx1, wy1);
    ctx.closePath();
    ctx.clip();
    if (plan.rain) {
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1;
      for (let k = 0; k < 22; k++) {
        const x0 = wx0 + hsh(k) * (wx1 - wx0), y0 = wy0 + ((t * 4 + hsh(k + 3) * 400) % (wy1 - wy0 + 40)) - 20;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 - 2, y0 + 8);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      const cx = wx0 + (((t * 0.15) % (wx1 - wx0 + 60)) - 30);
      for (const [dx, dy, r] of [[0, 0, 9], [10, -3, 11], [21, 1, 8]]) (ell(ctx, cx + dx, wy0 + R(0.03) + dy, r, r * 0.75), ctx.fill());
    }
    ctx.restore();
  }
  // 창으로 드는 햇살 줄기 + 떠다니는 먼지
  if (!plan.rain) {
    ctx.save();
    for (let k = 0; k < 3; k++) {
      const a = 0.12 + 0.05 * Math.sin(t * 0.02 + k * 2);
      ctx.fillStyle = lin(ctx, R(0.1), R(0.25), R(0.45), R(0.9), [0, `rgba(255,248,200,${a})`], [1, 'rgba(255,248,200,0)']);
      ctx.beginPath();
      ctx.moveTo(R(0.06 + k * 0.07), R(0.22 + k * 0.03));
      ctx.lineTo(R(0.1 + k * 0.07), R(0.21 + k * 0.03));
      ctx.lineTo(R(0.5 + k * 0.08), R(0.95));
      ctx.lineTo(R(0.36 + k * 0.08), R(0.95));
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#fff6d0';
    for (let k = 0; k < 14; k++) {
      const u = ((t * 0.0025 + hsh(k) ) % 1), x = R(0.08 + u * 0.4 + hsh(k + 5) * 0.08), y = R(0.24 + u * 0.66) + Math.sin(t * 0.03 + k) * R(0.01);
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.05 + k * 1.7);
      ell(ctx, x, y, R(0.004), R(0.004));
      ctx.fill();
    }
    ctx.restore();
  }
  // 등불 (따뜻한 번짐)
  for (const lx of [0.4, 0.62]) {
    const x = R(lx), y = R(0.17), fl = 0.9 + 0.1 * Math.sin(t * 0.07 + lx * 9);
    ctx.fillStyle = radg(ctx, x, y + R(0.03), 0, R(0.22), [0, `rgba(255,214,140,${0.45 * fl})`], [1, 'rgba(255,214,140,0)']);
    ctx.fillRect(x - R(0.25), y - R(0.1), R(0.5), R(0.4));
  }
  // 깃발 줄 (축제 날엔 하나 더)
  for (const [y0, sag, n, fest] of [[0.15, 0.03, 9, false], [0.175, 0.04, 12, true]] as const) {
    if (fest && plan.ev !== 'festival') continue;
    ctx.strokeStyle = '#7a4520';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(R(0.27), R(y0));
    ctx.quadraticCurveTo(R(0.5), R(y0 + sag * 2), R(0.79), R(y0));
    ctx.stroke();
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, x = R(0.27 + 0.52 * u), y = R(y0) + R(sag * 2) * 2 * u * (1 - u), sw = Math.sin(t * 0.06 + k) * 0.08;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sw);
      ctx.fillStyle = ['#ff6f91', '#ffd23a', '#7cc8f0', '#8cd46a', '#ffa04a'][k % 5];
      ctx.beginPath();
      ctx.moveTo(-R(0.012), 0);
      ctx.lineTo(R(0.012), 0);
      ctx.lineTo(0, R(0.026));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  // 메뉴판 (칠판)
  drawBoard(ctx, s, R, t, prev);
  for (const lx of [0.4, 0.62]) {
    const x = R(lx), y = R(0.155);
    ctx.strokeStyle = '#5c3216';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, R(0.135));
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = '#ffcf5a';
    ctx.beginPath();
    ctx.moveTo(x - R(0.03), y + R(0.025));
    ctx.lineTo(x + R(0.03), y + R(0.025));
    ctx.lineTo(x + R(0.012), y);
    ctx.lineTo(x - R(0.012), y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a86a06';
    ctx.stroke();
    ell(ctx, x, y + R(0.03), R(0.012), R(0.009));
    ctx.fillStyle = '#fff6c8';
    ctx.fill();
  }
  // 문 (손님이 들어올 때 열림)
  {
    let openAmt = 0;
    if (open) for (const a of s.actors) {
      const dt = s.pt - a.t0;
      if (dt >= -6 && dt < 16) openAmt = Math.max(openAmt, 1 - Math.abs(dt - 4) / 12);
      const out = a.o.res === 'none' ? WALK + THINK + 18 + 14 : a.o.res === 'noseat' ? 30 + 10 : 999;
      const d2 = dt - out;
      if (d2 >= -4 && d2 < 12) openAmt = Math.max(openAmt, 1 - Math.abs(d2 - 3) / 10);
    }
    const dx0 = R(0.8), dx1 = R(0.95), dy0 = R(0.215), dy1 = R(0.505), dw = (dx1 - dx0) * (1 - 0.75 * clamp(openAmt, 0, 1));
    ctx.fillStyle = lin(ctx, dx0, 0, dx0 + dw, 0, [0, '#b8743c'], [1, '#93582a']);
    rr(ctx, dx0, dy0, dw, dy1 - dy0, R(0.012));
    ctx.fill();
    ctx.strokeStyle = '#5c3216';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    if (dw > R(0.06)) {
      ctx.fillStyle = plan.rain ? '#b9cadb' : '#d6f1ff';
      rr(ctx, dx0 + dw * 0.18, dy0 + R(0.03), dw * 0.64, R(0.08), R(0.03));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd23a';
      ell(ctx, dx0 + dw * 0.85, R(0.37), R(0.01), R(0.01));
      ctx.fill();
    }
    // 문 위 종
    const ring = open && openAmt > 0.2 ? Math.sin(t * 0.8) * 0.4 : 0;
    ctx.save();
    ctx.translate(R(0.875), R(0.2));
    ctx.rotate(ring);
    ctx.fillStyle = '#ffcf3a';
    ctx.beginPath();
    ctx.moveTo(-R(0.016), R(0.025));
    ctx.quadraticCurveTo(-R(0.016), -R(0.005), 0, -R(0.005));
    ctx.quadraticCurveTo(R(0.016), -R(0.005), R(0.016), R(0.025));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a86a06';
    ctx.stroke();
    ctx.restore();
    // 문 앞 간판
    ctx.save();
    ctx.translate(R(0.875), R(0.135));
    ctx.fillStyle = '#7a4520';
    rr(ctx, -R(0.07), R(0.0), R(0.14), R(0.045), R(0.01));
    ctx.fill();
    font(ctx, R(0.034), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = morning ? '#ffd9a0' : open ? '#aaf08a' : '#ffd9a0';
    ctx.fillText(open ? '영업 중' : '준비 중', 0, R(0.024), R(0.13));
    ctx.restore();
  }
  // 카운터 + 너구리 사장 + 직원 고양이
  {
    const cy = R(0.455);
    animal(ctx, 'raccoon', R(0.12), cy + R(0.0), R(0.04), 'counter', open && s.actors.some((a) => s.pt - a.t0 > WALK && s.pt - a.t0 < WALK + THINK + 6) ? 'happy' : morning && s.menu.length ? 'happy' : 'calm', t, 1, 1);
    if (s.upg.cat) {
      const pop = Math.min(1, (t - (fx.memo.catT ?? -99)) / 10);
      ctx.save();
      ctx.translate(R(0.25), cy);
      ctx.scale(pop, pop);
      animal(ctx, 'cat', 0, 0, R(0.036), 'counter', open ? 'happy' : 'calm', t, -1, 2);
      ctx.restore();
    }
    ctx.fillStyle = lin(ctx, 0, R(0.44), 0, R(0.53), [0, '#c47a3e'], [1, '#8a4f26']);
    rr(ctx, R(0.015), R(0.445), R(0.29), R(0.085), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#e8a868';
    rr(ctx, R(0.008), R(0.435), R(0.305), R(0.02), R(0.008));
    ctx.fill();
    ctx.strokeStyle = '#6a3a1a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // 진열장 유리 + 케이크
    ctx.fillStyle = 'rgba(220,245,255,.55)';
    rr(ctx, R(0.04), R(0.462), R(0.24), R(0.05), R(0.008));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.stroke();
    s.menu.forEach((d, i) => drawDish(ctx, d, R(0.085 + i * 0.075), R(0.493), R(0.017), t, false));
  }
  // 화분 (꽃 화분을 사면 늘어남)
  plantPot(ctx, R(0.035), R(0.585), R(0.06), t, 1);
  if (s.upg.plant) {
    const pop = ease((t - (fx.memo.plantT ?? -99)) / 14);
    plantPot(ctx, R(0.955), R(0.6), R(0.075) * (fx.memo.plantT !== undefined ? pop : 1), t, 0);
    plantPot(ctx, R(0.5), R(0.535), R(0.05) * (fx.memo.plantT !== undefined ? pop : 1), t, 2);
  }
  // 탁자 · 의자 · 손님 (깊이 순서)
  const nTables = 3 + s.upg.table;
  type Item = { y: number; f: () => void };
  const items: Item[] = [];
  const acts = open || eve ? s.actors.map((a) => ({ a, p: actorAt(a, eve ? s.dayEnd : s.pt) })) : [];
  for (let ti = 0; ti < nTables; ti++) {
    const [tx, ty] = TABLES[ti], X = R(tx), Y = R(ty);
    const pop = ti >= 3 && fx.memo['tbl' + ti] !== undefined ? ease((t - fx.memo['tbl' + ti]) / 12) : 1;
    items.push({
      y: ty - 0.001,
      f: () => {
        for (const sd of [-1, 1] as const) chair(ctx, X + sd * R(0.115), Y + R(0.04), (sd === 1 ? 1 : -1) as 1 | -1, R);
      },
    });
    items.push({
      y: ty + 0.04,
      f: () => {
        ctx.save();
        ctx.translate(X, Y);
        ctx.scale(pop, pop);
        ctx.translate(-X, -Y);
        table(ctx, X, Y, R);
        ctx.restore();
        // 탁자 위 음식
        for (const { a, p } of acts) {
          if (!p || p.pose !== 'sit' || !a.o.dish || Math.floor(a.o.seat / 2) !== ti) continue;
          const sd = a.o.seat % 2 ? -1 : 1, fx2 = X + sd * R(0.045), fy = Y - R(0.012);
          if (p.ate < 1) drawDish(ctx, a.o.dish, fx2, fy, R(0.024) * (1 - 0.5 * p.ate), t);
          else {
            ell(ctx, fx2, fy + R(0.012), R(0.024), R(0.008));
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#b9c4d0';
            ctx.stroke();
            ctx.fillStyle = '#d9a066';
            for (let c = 0; c < 3; c++) (ell(ctx, fx2 - R(0.01) + c * R(0.01), fy + R(0.01), R(0.003), R(0.002)), ctx.fill());
          }
        }
      },
    });
  }
  for (const { a, p } of acts) {
    if (!p) continue;
    items.push({
      y: p.y + (p.pose === 'sit' ? 0.03 : 0.0),
      f: () => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        const r = R(HR) * (a.o.k === 'owl' ? 1.05 : 1);
        animal(ctx, a.o.k, R(p.x), R(p.y) + (p.pose === 'sit' ? -R(0.01) : 0), r, p.pose, p.mood, t, p.face, a.o.i * 1.3);
        if (p.mood === 'sad') {
          // 머리 위 비구름
          const cx = R(p.x), cy = R(p.y) - R(0.2);
          ctx.fillStyle = '#9fb4cc';
          for (const [dx, dy, rr2] of [[-0.018, 0.004, 0.014], [0, -0.006, 0.018], [0.018, 0.004, 0.013]]) (ell(ctx, cx + R(dx), cy + R(dy), R(rr2), R(rr2) * 0.8), ctx.fill());
          ctx.fillStyle = '#5a9ae8';
          for (let k = 0; k < 3; k++) (ell(ctx, cx + R(-0.014 + k * 0.014), cy + R(0.02) + ((t * 0.8 + k * 7) % 10), R(0.003), R(0.005)), ctx.fill());
        }
        ctx.restore();
        // 생각 풍선: 무엇을 고르나
        if (p.bubble) {
          const bx = R(p.x) + R(0.04) * (p.face === 1 ? 1 : -1), by = R(p.y) - R(0.2);
          ctx.fillStyle = 'rgba(255,255,255,.96)';
          ell(ctx, bx, by, R(0.04), R(0.034));
          ctx.fill();
          ctx.strokeStyle = 'rgba(74,44,23,.4)';
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ell(ctx, bx - R(0.02) * (p.face === 1 ? 1 : -1), by + R(0.045), R(0.008), R(0.007));
          ctx.fill();
          if (a.o.dish) drawDish(ctx, a.o.dish, bx, by - R(0.002), R(0.018), t, false);
          else {
            font(ctx, R(0.05), 900);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#7a8aa0';
            ctx.fillText('?', bx, by + 1);
          }
        }
        // 하트 이어짐 숫자 (머리 위에 남는다)
        if (p.pose === 'sit' && p.ate >= 1 && a.o.res === 'fav') {
          const hy = R(p.y) - R(0.23) - Math.sin(t * 0.12 + a.o.i) * R(0.006);
          heart(ctx, R(p.x), hy, R(0.016));
          if (a.o.streak >= 2) {
            font(ctx, R(0.034), 900);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            outText(ctx, `×${Math.min(a.o.streak, 9)}`, R(p.x) + R(0.035), hy, '#ffffff', '#c0304a', 3);
          }
        }
      },
    });
  }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // 곰은 꿀 케이크를 한입에 꿀꺽
  if (open) for (const a of s.actors) {
    if (a.o.k !== 'bear' || a.o.dish !== 'honey' || s.pt - a.t0 < WALK + THINK) continue;
    const key = `g${s.stage}_${s.tries}_${s.day}_${a.o.i}`;
    if (fx.memo[key] !== undefined) continue;
    fx.memo[key] = t;
    const p = actorAt(a, s.pt);
    if (p) (fx.pop(R(p.x), R(p.y) - R(0.2), '꿀꺽!', '#ffffff', 20), fx.burst(R(p.x), R(p.y) - R(0.12), '#ffd36a', 10, 2.6, 2.4));
  }
  // 창턱의 참새 (큰 순간마다 폴짝)
  {
    const bt = bandMemo.get(s)?.t ?? -999, jump = t - bt < 30 ? Math.abs(Math.sin((t - bt) * 0.35)) * R(0.03) : Math.abs(Math.sin(t * 0.05)) > 0.97 ? R(0.006) : 0;
    const bx = R(0.215), by = R(0.398) - jump;
    ell(ctx, bx, R(0.4), R(0.014), R(0.004));
    ctx.fillStyle = 'rgba(80,40,10,.25)';
    ctx.fill();
    ell(ctx, bx, by - R(0.012), R(0.016), R(0.013));
    ctx.fillStyle = '#7ab8f0';
    ctx.fill();
    ctx.strokeStyle = '#3a6a9a';
    ctx.lineWidth = 1;
    ctx.stroke();
    ell(ctx, bx + R(0.004), by - R(0.008), R(0.009), R(0.007));
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ell(ctx, bx - R(0.008), by - R(0.022), R(0.009), R(0.009));
    ctx.fillStyle = '#7ab8f0';
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffb02a';
    ctx.beginPath();
    ctx.moveTo(bx - R(0.016), by - R(0.023));
    ctx.lineTo(bx - R(0.024), by - R(0.02));
    ctx.lineTo(bx - R(0.016), by - R(0.017));
    ctx.fill();
    ctx.fillStyle = '#2a1a10';
    ell(ctx, bx - R(0.01), by - R(0.024), R(0.002), R(0.0025));
    ctx.fill();
    if (t - bt < 30) {
      font(ctx, 14, 900);
      ctx.fillStyle = '#ff6f91';
      ctx.textAlign = 'center';
      ctx.fillText('♪', bx + R(0.02), by - R(0.04));
    }
  }
  // 아침: 오늘 올 손님 (순서대로, 지금 메뉴로 미리 보기)
  if (morning && prev) drawForecast(ctx, s, R, t, prev);
  // 저녁 노을
  if (eve) {
    const u = Math.min(1, s.pt / 20);
    ctx.fillStyle = `rgba(255,150,80,${0.18 * u})`;
    ctx.fillRect(0, R(0.135), w, R(0.85));
  }
  // 사건 연출
  doEvents(ctx, s, R, t, w);
  // 날아가는 메뉴 카드 · 떨어지는 메뉴
  {
    const fl = flyMemo.get(s) ?? [];
    for (const f of fl) {
      const u = (t - f.t) / 12;
      if (u > 1) continue;
      const [bx, by] = boardSlot(f.slot), e = ease(u), x = f.x + (R(bx) - f.x) * e, y = f.y + (R(by) - f.y) * e - Math.sin(u * Math.PI) * R(0.12);
      drawDish(ctx, f.d, x, y, R(0.04) * (1.2 - 0.25 * e), t, false);
    }
    flyMemo.set(s, fl.filter((f) => t - f.t <= 12));
    const dr = dropMemo.get(s) ?? [];
    for (const f of dr) {
      const u = (t - f.t) / 30;
      if (u > 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.translate(f.x - u * R(0.08), f.y + u * u * R(0.3));
      ctx.rotate(-u * 2);
      drawDish(ctx, f.d, 0, 0, R(0.035), t, false);
      ctx.restore();
    }
    dropMemo.set(s, dr.filter((f) => t - f.t <= 30));
  }
  // 큰 순간 띠
  {
    const b = bandMemo.get(s);
    if (b && t - b.t < 70) {
      const age = t - b.t, sc2 = age < 7 ? 1.7 - 0.7 * (age / 7) : 1, a = Math.min(1, (70 - age) / 14);
      const by = R(0.885);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, by);
      ctx.scale(sc2, sc2);
      ctx.rotate(-0.03);
      ctx.fillStyle = 'rgba(80,30,10,.3)';
      rr(ctx, -R(0.44), -R(0.05) + 4, R(0.88), R(b.sub ? 0.12 : 0.09), R(0.04));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, -R(0.05), 0, R(0.06), [0, '#fff6d8'], [1, '#ffe2a0']);
      rr(ctx, -R(0.44), -R(0.05), R(0.88), R(b.sub ? 0.12 : 0.09), R(0.04));
      ctx.fill();
      ctx.strokeStyle = b.col;
      ctx.lineWidth = 3;
      ctx.stroke();
      font(ctx, R(0.062), 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outText(ctx, b.text, 0, -R(0.004), '#ffffff', b.col, 5, R(0.84));
      if (b.sub) {
        font(ctx, R(0.036), 800);
        ctx.fillStyle = INK;
        ctx.fillText(b.sub, 0, R(0.047), R(0.84));
      }
      ctx.restore();
    }
  }
  // 저녁 정산 카드
  if (eve && s.res) {
    const u = ease(s.pt / 10), r0 = s.res, profit = r0.revenue - r0.cost;
    ctx.save();
    ctx.translate(w / 2, R(0.265));
    ctx.scale(0.6 + 0.4 * u, 0.6 + 0.4 * u);
    ctx.globalAlpha = u;
    ctx.fillStyle = 'rgba(80,30,10,.3)';
    rr(ctx, -R(0.4), -R(0.09) + 4, R(0.8), R(0.19), R(0.04));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -R(0.09), 0, R(0.1), [0, '#fffaf0'], [1, '#ffe9c4']);
    rr(ctx, -R(0.4), -R(0.09), R(0.8), R(0.19), R(0.04));
    ctx.fill();
    ctx.strokeStyle = '#c8783a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    font(ctx, R(0.048), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(`${DAY_NAMES[s.day]}요일 문 닫았어요`, 0, -R(0.045), R(0.76));
    font(ctx, R(0.06), 900);
    outText(ctx, `${profit >= 0 ? '+' : ''}${profit}`, -R(0.16), R(0.025), profit >= 0 ? '#ffd23a' : '#ff8a8a', '#7a4520', 4);
    coin(ctx, -R(0.29), R(0.025), R(0.022));
    font(ctx, R(0.036), 800);
    ctx.fillStyle = '#7a4a26';
    ctx.textAlign = 'left';
    ctx.fillText(`웃은 손님 ${r0.smiles}/${r0.out.length}`, R(0.02), R(0.008), R(0.36));
    heart(ctx, R(0.04), R(0.055), R(0.014));
    ctx.fillText(`하트 ${r0.hearts}`, R(0.07), R(0.055), R(0.3));
    ctx.restore();
  }
  ctx.restore();
  // ═════ 위 띠: 주·돈·하트 · 달력 ═════
  drawTop(ctx, s, R, t, w);
  // ═════ 아래 판: 카드 · 가게 키우기 · 문 열기 · 별 · 안내 ═════
  drawPanel(ctx, s, R, t, w, h, prev, firstEver);
  // NEW 스포트라이트
  if (s.spot && morning) {
    const age = t - s.spot.t, a = Math.min(1, age / 8, (150 - age) / 20);
    const at = spotAt.get(s)?.get(s.spot.label);
    if (a > 0) {
      const x = R(at ? at[0] : s.spot.x), y = R(at ? at[1] : s.spot.y), r = R(at ? 0.07 : s.spot.r) * (1 + 0.06 * Math.sin(t * 0.2));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#ff5a6e';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = -t * 0.6;
      ell(ctx, x, y, r, r * 0.6);
      ctx.stroke();
      ctx.setLineDash([]);
      font(ctx, R(0.036), 900);
      const label = `NEW ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.04);
      const ly = y - r * 0.6 - R(0.03), lx = clamp(x, tw / 2 + 4, w - tw / 2 - 4);
      ctx.fillStyle = '#ff5a6e';
      rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // 새 소식 (주 시작 카드 한 줄)
  if (s.news && morning) {
    const age = t - s.news.t, a = Math.min(1, age / 8, (170 - age) / 20);
    if (a > 0) {
      ctx.save();
      ctx.globalAlpha = a;
      font(ctx, R(0.038), 900);
      const tw = Math.min(w - R(0.04), ctx.measureText(s.news.text).width + R(0.06));
      ctx.fillStyle = 'rgba(255,90,110,.95)';
      rr(ctx, (w - tw) / 2, R(0.142), tw, R(0.05), R(0.025));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.news.text, w / 2, R(0.168), tw - R(0.03));
      ctx.restore();
    }
  }
  // 주 결과 카드
  if (s.phase === 'result') drawResult(ctx, s, R, t, w);
  fx.memo.t = t;
}

function drawBoard(ctx: C2, s: CafeState, R: (v: number) => number, t: number, prev: DayRes | null) {
  const { x0, x1, y0, y1 } = BOARD;
  ctx.fillStyle = 'rgba(80,40,10,.3)';
  rr(ctx, R(x0) + 3, R(y0) + 5, R(x1 - x0), R(y1 - y0), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#8a4f26';
  rr(ctx, R(x0), R(y0), R(x1 - x0), R(y1 - y0), R(0.02));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, R(y0), 0, R(y1), [0, '#3f5a48'], [1, '#2e463a']);
  rr(ctx, R(x0 + 0.012), R(y0 + 0.012), R(x1 - x0 - 0.024), R(y1 - y0 - 0.024), R(0.012));
  ctx.fill();
  // 분필 얼룩
  ctx.fillStyle = 'rgba(255,255,255,.05)';
  for (let k = 0; k < 5; k++) (ell(ctx, R(x0 + 0.05 + k * 0.08), R(y0 + 0.08 + hsh(k) * 0.12), R(0.05), R(0.02), 0.3), ctx.fill());
  font(ctx, R(0.036), 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6d0';
  ctx.fillText('오늘의 메뉴', R(0.5), R(y0 + 0.04));
  const fl = flyMemo.get(s) ?? [];
  const portions = portionsOf(s.upg);
  for (let i = 0; i < SLOTS; i++) {
    const [bx, by] = boardSlot(i), X = R(bx), Y = R(by);
    const d = s.menu[i];
    // 칸 테두리 (분필 점선)
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    rr(ctx, X - R(0.058), Y - R(0.06), R(0.116), R(0.135), R(0.014));
    ctx.stroke();
    ctx.setLineDash([]);
    if (!d) {
      font(ctx, R(0.05), 900);
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.fillText('+', X, Y);
      continue;
    }
    const flying = fl.find((f) => f.d === d && t - f.t < 12);
    if (flying) continue;
    const land = fl.find((f) => f.d === d);
    const age = land ? t - land.t - 12 : 99, sq = age >= 0 && age < 10 ? 1 + 0.25 * Math.sin((age / 10) * Math.PI) : 1;
    // 오늘 남은 조각
    let left = portions;
    if (s.phase === 'open' || s.phase === 'evening') for (const a of s.actors) if (a.o.dish === d && s.pt >= a.t0 + WALK + THINK) left--;
    const sold = left <= 0 && (s.phase === 'open' || s.phase === 'evening');
    ctx.save();
    ctx.translate(X, Y - R(0.005));
    ctx.scale(sq, 1 / sq);
    if (sold) ctx.globalAlpha = 0.45;
    drawDish(ctx, d, 0, 0, R(0.036), t);
    ctx.restore();
    font(ctx, R(0.03) < 12 ? 12 : R(0.03), 800);
    ctx.fillStyle = '#fff6d0';
    ctx.fillText(DISH[d].name, X, Y + R(0.05), R(0.115));
    // 조각 점
    for (let k = 0; k < portions; k++) {
      const px = X - ((portions - 1) / 2) * R(0.014) + k * R(0.014), py = Y + R(0.07);
      ell(ctx, px, py, R(0.005), R(0.005));
      ctx.fillStyle = k < left ? '#ffd23a' : 'rgba(255,255,255,.2)';
      ctx.fill();
    }
    if (sold) {
      ctx.save();
      ctx.translate(X, Y - R(0.01));
      ctx.rotate(-0.25);
      font(ctx, R(0.04), 900);
      outText(ctx, '완판!', 0, 0, '#ff5a6e', '#ffffff', 4);
      ctx.restore();
    }
    // 아침: 오래된 순서 (꽉 찼을 때 제일 왼쪽이 다음에 내려감)
    const pill = (text: string, bg: string) => {
      font(ctx, 12, 900);
      const tw = ctx.measureText(text).width + 10;
      ctx.fillStyle = bg;
      rr(ctx, X - tw / 2, Y - R(0.06) - 8, tw, 16, 8);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(text, X, Y - R(0.06) + 1);
    };
    if (s.phase === 'morning' && s.pushed === d) pill('오늘 새로', '#4cae5a');
    else if (s.phase === 'morning' && s.menu.length >= SLOTS && i === 0 && !s.pushed) pill('다음에 내려감', '#e8604a');
    void prev;
  }
}

const spotAt = new WeakMap<object, Map<string, [number, number]>>();
function drawForecast(ctx: C2, s: CafeState, R: (v: number) => number, t: number, prev: DayRes) {
  const plan = planOf(s), n = plan.guests.length, spots = new Map<string, [number, number]>();
  spotAt.set(s, spots);
  const y0 = R(0.53), y1 = R(0.765), x0 = R(0.025), x1 = R(0.975);
  ctx.fillStyle = 'rgba(80,40,10,.28)';
  rr(ctx, x0 + 2, y0 + 5, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [0, 'rgba(255,250,238,.97)'], [1, 'rgba(255,236,206,.97)']);
  rr(ctx, x0, y0, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#c8783a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 제목 줄: 오늘 손님 · 날씨/사건 · 자리
  const ty = y0 + R(0.027);
  font(ctx, R(0.036), 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = INK;
  const title = `${DAY_NAMES[s.day]}요일 손님 ${n}명`;
  ctx.fillText(title, x0 + R(0.025), ty + 1);
  let tx = x0 + R(0.035) + ctx.measureText(title).width;
  const tag = (kind: string, label: string, col: string, key: string) => {
    font(ctx, 12, 900);
    const tw = ctx.measureText(label).width + R(0.062);
    ctx.fillStyle = col;
    rr(ctx, tx, ty - R(0.02), tw, R(0.04), R(0.02));
    ctx.fill();
    evIcon(ctx, kind, tx + R(0.022), ty, R(0.012), t);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, tx + R(0.042), ty + 1);
    spots.set(key, [(tx + tw / 2) / R(1), ty / R(1)]);
    tx += tw + R(0.01);
  };
  if (plan.rain) tag('rain', '비', '#5a86b8', '비 오는 날');
  if (plan.ev === 'group') tag('group', '단체 넷', '#8a5ac8', '단체 손님');
  if (plan.ev === 'gourmet') tag('gourmet', '미식가', '#2f3a5a', '미식가');
  if (plan.ev === 'festival') tag('festival', '축제 팁 두 배', '#e8506a', '축제 날');
  if (plan.ev === 'priceup') tag('priceup', '재료 값 두 배', '#d84a3a', '_');
  font(ctx, 12, 900);
  ctx.textAlign = 'right';
  const noSeat = prev.out.some((o) => o.res === 'noseat');
  ctx.fillStyle = noSeat ? '#d0405a' : '#9a6a3a';
  ctx.fillText(`자리 ${seatsOf(s.upg)}`, x1 - R(0.022), ty + 1);
  // 손님 줄 (들어오는 순서) + 지금 메뉴로 어떻게 될지
  const gap = (x1 - x0 - R(0.03)) / Math.max(n, 6), hr = Math.min(R(0.03), gap * 0.38);
  const cy = y0 + R(0.128);
  for (let i = 0; i < n; i++) {
    const g = plan.guests[i], o = prev.out[i], cx = x0 + R(0.015) + gap * (i + 0.5);
    if (g.grp >= 0 && (i === 0 || plan.guests[i - 1].grp !== g.grp)) {
      let j = i;
      while (j < n && plan.guests[j].grp === g.grp) j++;
      ctx.fillStyle = 'rgba(168,116,224,.16)';
      rr(ctx, cx - gap * 0.47, cy - hr * 1.9, gap * (j - i) - gap * 0.06, hr * 4.1, R(0.02));
      ctx.fill();
      ctx.strokeStyle = 'rgba(138,90,200,.65)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (g.k === 'squirrel') spots.set('새 손님 다람쥐', [cx / R(1), cy / R(1)]);
    const mood: Mood = o.res === 'fav' ? 'love' : o.res === 'ok' ? 'happy' : o.res === 'noseat' ? 'wow' : 'sad';
    animal(ctx, g.k, cx, cy, hr, 'head', mood, t, 1, i);
    const my = cy + hr * 1.75;
    if (o.res === 'fav') {
      heart(ctx, cx - (o.streak >= 2 ? R(0.012) : 0), my, R(0.012));
      if (o.streak >= 2) {
        font(ctx, 12, 900);
        ctx.textAlign = 'center';
        outText(ctx, `${Math.min(o.streak, 9)}`, cx + R(0.014), my + 1, '#ffffff', '#c0304a', 3);
      }
    } else if (o.res === 'ok') {
      ell(ctx, cx, my, R(0.012), R(0.012));
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
      ctx.strokeStyle = '#a86a06';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, my, R(0.006), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else {
      // 시무룩 구름 · 자리 없음 표시
      ctx.fillStyle = '#9fb4cc';
      for (const [dx, dr] of [[-0.6, 0.5], [0, 0.7], [0.6, 0.5]]) (ell(ctx, cx + dx * R(0.012), my, R(0.012) * dr, R(0.009) * dr), ctx.fill());
      if (o.res === 'noseat') {
        ctx.strokeStyle = '#d0405a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - R(0.014), my - R(0.01));
        ctx.lineTo(cx + R(0.014), my + R(0.01));
        ctx.stroke();
      }
    }
    if (g.k === 'owl' && g.wish) {
      const bx = cx, by = cy - hr * 2.15;
      ctx.fillStyle = '#ffffff';
      ell(ctx, bx, by, R(0.03), R(0.024));
      ctx.fill();
      ctx.strokeStyle = '#2f3a5a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      drawDish(ctx, g.wish, bx, by + 1, R(0.016), t, false);
      spots.set('미식가', [bx / R(1), by / R(1)]);
    }
  }
  // 아래 한 줄 설명: 하트 · 웃음 · 시무룩
  font(ctx, 12, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#9a6a3a';
  const hearts = prev.hearts, ok = prev.smiles - prev.hearts, sad = prev.sad;
  ctx.fillText(s.menu.length ? `하트 ${hearts} · 그냥 먹음 ${ok} · 시무룩 ${sad}` : '메뉴를 고르면 손님 얼굴이 바뀌어요', (x0 + x1) / 2, y1 - R(0.02));
}

function drawTop(ctx: C2, s: CafeState, R: (v: number) => number, t: number, w: number) {
  const W = weekOf(s);
  ctx.fillStyle = lin(ctx, 0, 0, 0, R(0.135), [0, '#7a4520'], [1, '#5c3216']);
  ctx.fillRect(0, 0, w, R(0.135));
  ctx.textBaseline = 'middle';
  // 주 이름
  font(ctx, R(0.036), 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe2a8';
  ctx.fillText(`${s.stage + 1}주 · ${W.name}`, R(0.025), R(0.035), R(0.32));
  // 돈
  const flash = t - (fx2memo(s).payT ?? -99) < 8;
  coin(ctx, R(0.42), R(0.035), R(0.02) * (flash ? 1.2 : 1));
  font(ctx, R(0.05), 900);
  ctx.fillStyle = flash ? '#fff6a0' : '#ffffff';
  ctx.fillText(String(s.money), R(0.45), R(0.037));
  const mw = ctx.measureText(String(s.money)).width;
  if (W.goal > 0) {
    font(ctx, 12, 800);
    ctx.fillStyle = s.money >= W.goal ? '#aaf08a' : '#ffcf9a';
    ctx.fillText(`/ 목표 ${W.goal}`, R(0.455) + mw, R(0.039));
  }
  // 하트
  for (let i = 0; i < 3; i++) heart(ctx, R(0.86 + i * 0.05), R(0.035), R(0.016), i < s.hearts ? '#ff4f78' : 'rgba(255,255,255,.18)');
  // 달력 (월~금)
  for (let d = 0; d < 5; d++) {
    const x = R(0.025 + d * 0.193), y = R(0.074), cw = R(0.178), ch = R(0.052), p = s.week[d];
    const today = d === s.day && s.phase !== 'result', past = d < s.day || (d === s.day && s.phase === 'result');
    ctx.fillStyle = today ? '#fff1cf' : past ? 'rgba(255,255,255,.18)' : 'rgba(255,255,255,.32)';
    rr(ctx, x, y, cw, ch, R(0.014));
    ctx.fill();
    if (today) {
      ctx.strokeStyle = '#ffb02a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }
    font(ctx, 12, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = today ? INK : '#ffe9c8';
    ctx.fillText(DAY_NAMES[d], x + R(0.012), y + ch / 2 + 1);
    const kind = p.ev || (p.rain ? 'rain' : 'sun');
    evIcon(ctx, kind, x + R(0.07), y + ch / 2, R(0.014), t);
    if (p.ev && p.rain) evIcon(ctx, 'rain', x + R(0.105), y + ch / 2, R(0.011), t);
    if (!past) {
      font(ctx, 12, 800);
      ctx.textAlign = 'right';
      ctx.fillStyle = today ? '#9a6a3a' : '#ffe9c8';
      ctx.fillText(`${p.guests.length}`, x + cw - R(0.012), y + ch / 2 + 1);
    } else {
      ctx.strokeStyle = '#aaf08a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + cw - R(0.05), y + ch / 2);
      ctx.lineTo(x + cw - R(0.035), y + ch / 2 + R(0.012));
      ctx.lineTo(x + cw - R(0.012), y + ch / 2 - R(0.014));
      ctx.stroke();
    }
  }
}
const fx2memo = (s: CafeState) => juice(s).memo;

function drawPanel(ctx: C2, s: CafeState, R: (v: number) => number, t: number, w: number, h: number, prev: DayRes | null, firstEver: boolean) {
  const W = weekOf(s), plan = planOf(s), morning = s.phase === 'morning';
  const py = R(0.985);
  ctx.fillStyle = lin(ctx, 0, py, 0, h, [0, '#fff3dc'], [1, '#ffe2b4']);
  ctx.fillRect(0, py, w, h - py);
  ctx.fillStyle = '#c8783a';
  ctx.fillRect(0, py, w, 3);
  ctx.fillStyle = 'rgba(200,120,58,.25)';
  ctx.fillRect(0, py + 3, w, 3);
  const sh = shakeMemo.get(s);
  // 카드 넷
  for (let i = 0; i < 4; i++) {
    const d = W.cards[i], on = s.menu.includes(d), x = R(cardX(i)), cw = R(CARD.w), y0 = R(CARD.y0), ch = R(CARD.y1 - CARD.y0);
    const cost = costOf(d, plan), afford = canAdd(s, d), locked = morning && !on && !!s.pushed;
    const shake = sh && sh.i === i && t - sh.t < 14 ? Math.sin((t - sh.t) * 1.6) * 4 * (1 - (t - sh.t) / 14) : 0;
    const lift = on ? -R(0.012) : morning && !locked && afford ? -Math.abs(Math.sin(t * 0.08 + i)) * R(0.004) : 0;
    ctx.save();
    ctx.translate(x + shake, y0 + lift);
    if (!morning) ctx.globalAlpha = 0.55;
    ctx.fillStyle = 'rgba(120,60,20,.25)';
    rr(ctx, 2, 5, cw, ch, R(0.025));
    ctx.fill();
    ctx.fillStyle = on ? lin(ctx, 0, 0, 0, ch, [0, '#fffbe8'], [1, '#ffe6a8']) : lin(ctx, 0, 0, 0, ch, [0, '#ffffff'], [1, '#fff0d8']);
    rr(ctx, 0, 0, cw, ch, R(0.025));
    ctx.fill();
    ctx.strokeStyle = on ? '#ff9a2a' : '#d8a874';
    ctx.lineWidth = on ? 3 : 1.5;
    ctx.stroke();
    // 음식 그림
    drawDish(ctx, d, cw / 2, R(0.07), R(0.047), t);
    font(ctx, R(0.034), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = INK;
    ctx.fillText(DISH[d].name, cw / 2, R(0.142), cw - 6);
    // 누가 하트? (제일 좋아하는 손님 얼굴)
    const lovers = (Object.keys(KIND) as Kind[]).filter((k) => KIND[k].fav === d && k !== 'owl');
    const warmAll = plan.rain && DISH[d].warm;
    const fy = R(0.18);
    if (warmAll) {
      heart(ctx, cw / 2 - R(0.04), fy, R(0.012));
      font(ctx, 12, 900);
      ctx.fillStyle = '#d0405a';
      ctx.fillText('오늘 모두', cw / 2 + R(0.014), fy + 1, cw - R(0.07));
    } else if (lovers.length) {
      heart(ctx, cw / 2 - R(0.03), fy, R(0.012));
      animal(ctx, lovers[0], cw / 2 + R(0.016), fy + R(0.004), R(0.018), 'head', 'love', t, 1, i);
    } else if (d === 'cocoa') {
      heart(ctx, cw / 2 - R(0.05), fy, R(0.011));
      evIcon(ctx, 'rain', cw / 2 - R(0.01), fy, R(0.014), t);
      font(ctx, 12, 900);
      ctx.fillStyle = '#5a86b8';
      ctx.fillText('모두', cw / 2 + R(0.035), fy + 1);
    } else if (d === 'berry') {
      heart(ctx, cw / 2 - R(0.03), fy, R(0.012));
      animal(ctx, 'owl', cw / 2 + R(0.016), fy + R(0.004), R(0.016), 'head', 'love', t, 1, i);
    }
    // 재료비
    const up = plan.up === d;
    ctx.fillStyle = up ? '#ffd6cc' : 'rgba(255,214,120,.38)';
    rr(ctx, R(0.012), ch - R(0.044), cw - R(0.024), R(0.034), R(0.017));
    ctx.fill();
    coin(ctx, R(0.034), ch - R(0.027), R(0.011));
    font(ctx, 12, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = up ? '#c0303a' : INK;
    ctx.fillText(`재료 ${cost}${up ? ' 두 배' : ''}`, R(0.05), ch - R(0.026), cw - R(0.06));
    if (on) {
      ctx.fillStyle = '#ff9a2a';
      ell(ctx, cw - R(0.012), R(0.012), R(0.02), R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cw - R(0.022), R(0.012));
      ctx.lineTo(cw - R(0.014), R(0.021));
      ctx.lineTo(cw - R(0.002), R(0.003));
      ctx.stroke();
    }
    if (morning && (locked || (!afford && !on))) {
      ctx.fillStyle = 'rgba(255,246,230,.5)';
      rr(ctx, 0, 0, cw, ch, R(0.025));
      ctx.fill();
      font(ctx, 12, 900);
      ctx.textAlign = 'center';
      const label = locked ? '내일' : '돈 모자람', tw = ctx.measureText(label).width + 12;
      ctx.fillStyle = locked ? 'rgba(154,106,58,.85)' : 'rgba(200,48,58,.9)';
      rr(ctx, cw / 2 - tw / 2, -R(0.006), tw, 18, 9);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, cw / 2, -R(0.006) + 10);
    }
    ctx.restore();
  }
  // 가게 키우기
  {
    const o = plan.offer, x = R(SHOP.x0), y = R(SHOP.y0), bw = R(SHOP.x1 - SHOP.x0), bh = R(SHOP.y1 - SHOP.y0);
    const maxed = !!o && s.upg[o] >= UP[o].max, ok = morning && canShop(s);
    const shake = sh && sh.i === 9 && t - sh.t < 14 ? Math.sin((t - sh.t) * 1.6) * 4 * (1 - (t - sh.t) / 14) : 0;
    ctx.save();
    ctx.translate(x + shake, y);
    ctx.fillStyle = 'rgba(120,60,20,.25)';
    rr(ctx, 2, 4, bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = ok ? lin(ctx, 0, 0, 0, bh, [0, '#e8fbe0'], [1, '#bfe8a8']) : lin(ctx, 0, 0, 0, bh, [0, '#f4ece0'], [1, '#e2d6c6']);
    rr(ctx, 0, 0, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = ok ? '#4c9a3a' : '#bba890';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textBaseline = 'middle';
    if (!o || maxed || s.bought) {
      font(ctx, R(0.033), 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#9a8a74';
      ctx.fillText(s.bought ? '가게가 커졌어요!' : maxed ? '다 키웠어요' : '오늘은 가게 쉬는 날', bw / 2, bh / 2, bw - 10);
    } else {
      upIcon(ctx, o, R(0.065), bh / 2 - R(0.01), R(0.03), t);
      font(ctx, R(0.033), 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = INK;
      ctx.fillText(UP[o].name, R(0.12), bh * 0.3, bw - R(0.13));
      font(ctx, 12, 800);
      ctx.fillStyle = '#4c7a3a';
      ctx.fillText(UP[o].what, R(0.12), bh * 0.56, bw - R(0.13));
      coin(ctx, R(0.132), bh * 0.8, R(0.011));
      font(ctx, 12, 900);
      ctx.fillStyle = ok ? INK : '#c0303a';
      ctx.fillText(`${UP[o].price}${ok ? '' : ' 모자람'}`, R(0.15), bh * 0.81);
    }
    ctx.restore();
  }
  // 문 열기
  {
    const x = R(DOOR.x0), y = R(DOOR.y0), bw = R(DOOR.x1 - DOOR.x0), bh = R(DOOR.y1 - DOOR.y0), ready = morning && s.menu.length > 0;
    const shake = sh && sh.i === 8 && t - sh.t < 14 ? Math.sin((t - sh.t) * 1.6) * 4 * (1 - (t - sh.t) / 14) : 0;
    const pulse = ready ? 1 + 0.025 * Math.sin(t * 0.15) : 1;
    ctx.save();
    ctx.translate(x + bw / 2 + shake, y + bh / 2);
    ctx.scale(pulse, pulse);
    ctx.translate(-bw / 2, -bh / 2);
    ctx.fillStyle = 'rgba(120,30,20,.3)';
    rr(ctx, 2, 5, bw, bh, R(0.03));
    ctx.fill();
    ctx.fillStyle = ready ? lin(ctx, 0, 0, 0, bh, [0, '#ff9a5a'], [1, '#e8503a']) : lin(ctx, 0, 0, 0, bh, [0, '#f0d8c8'], [1, '#d8bca8']);
    rr(ctx, 0, 0, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = ready ? '#a82a1a' : '#b89a88';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    rr(ctx, R(0.01), R(0.008), bw - R(0.02), bh * 0.35, R(0.02));
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    if (morning) {
      font(ctx, R(0.05), 900);
      outText(ctx, '문 열기', bw / 2, bh * 0.36, '#ffffff', ready ? '#a82a1a' : '#a89a88', 4);
      font(ctx, 12, 900);
      if (prev && s.menu.length) {
        const net = prev.revenue - prev.cost;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`재료 -${prev.cost} · 예상 ${net >= 0 ? '+' : ''}${net}`, bw / 2, bh * 0.76, bw - 8);
      } else {
        ctx.fillStyle = '#8a6a5a';
        ctx.fillText('메뉴를 먼저 골라요', bw / 2, bh * 0.76, bw - 8);
      }
    } else {
      font(ctx, R(0.04), 900);
      const served = s.actors.filter((a) => a.paid).length;
      ctx.fillStyle = '#7a5a4a';
      ctx.fillText(s.phase === 'open' ? `영업 중… ${served}/${s.actors.length}` : s.phase === 'evening' ? '오늘 끝!' : '한 주 끝!', bw / 2, bh * 0.4, bw - 8);
      if (s.phase === 'open' || s.phase === 'evening') {
        font(ctx, 12, 900);
        const net = s.todayIn - s.todayCost;
        ctx.fillStyle = net >= 0 ? '#2e7a3a' : '#c0303a';
        ctx.fillText(`오늘 ${net >= 0 ? '+' : ''}${net}`, bw / 2, bh * 0.76);
      }
    }
    ctx.restore();
  }
  // 별 줄 (쉬운 말)
  {
    const stars = W.stars, r2 = R(1.475);
    const play = s.phase !== 'result';
    const ok = !play && s.ok ? s.starOk : stars.map((q) => q.k !== 'survive' && q.k !== 'money' && q.k !== 'festival' && starMet(s, q));
    const labels = stars.map((q) => q.label + (play && !ok[stars.indexOf(q)] && starNow(s, q) && q.k !== 'money' ? ` ${starNow(s, q)}` : ''));
    font(ctx, R(0.032), 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.065));
    const gap = R(0.012), tot = ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1), scale = Math.min(1, (w - R(0.03)) / tot);
    let xx = (w - tot * scale) / 2;
    for (let j = 0; j < stars.length; j++) {
      const pw = ws[j] * scale;
      ctx.fillStyle = ok[j] ? 'rgba(255,210,58,.4)' : 'rgba(200,120,58,.1)';
      rr(ctx, xx, r2 - R(0.024), pw, R(0.048), R(0.024));
      ctx.fill();
      ctx.strokeStyle = ok[j] ? '#e8a010' : 'rgba(200,120,58,.45)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      starPath(ctx, xx + R(0.025) * scale + 2, r2, R(0.014));
      ctx.fillStyle = ok[j] ? '#ffc21a' : 'rgba(160,110,60,.45)';
      ctx.fill();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ok[j] ? '#8a5208' : INK;
      font(ctx, R(0.032), 800);
      ctx.fillText(labels[j], xx + R(0.047) * scale, r2 + 1, pw - R(0.055) * scale);
      xx += pw + gap * scale;
    }
  }
  // 안내 한 줄 (+ 손가락)
  {
    let hint = W.hint;
    let target: [number, number] | null = null;
    if (s.phase === 'morning') {
      if (firstEver && !s.menu.length) {
        hint = '꿀 케이크 카드를 톡! 곰 손님이 좋아해요';
        target = [cardX(0) + CARD.w * 0.62, CARD.y0 + 0.03];
      } else if (firstEver) {
        hint = '문 열기를 톡 — 손님이 들어와요!';
        target = [(DOOR.x0 + DOOR.x1) / 2 + 0.06, DOOR.y0 + 0.02];
      } else if (!s.menu.length) hint = '오늘 손님이 좋아할 메뉴를 하나 톡!';
      else if (s.pushed) hint = '새 메뉴는 아침마다 한 가지 — 문 열기를 톡!';
      else if (s.stage === 0 && s.day === 1) hint = '아침마다 새 메뉴를 하나 더 올릴 수 있어요';
      else if (prev && prev.sad > 0 && !s.pushed) hint = `시무룩할 손님 ${prev.sad}명 — 새 메뉴를 하나 올려요`;
    } else if (s.phase === 'open') hint = '손님이 차례로 들어와요 — 지켜봐요';
    else if (s.phase === 'evening') hint = s.day >= 4 ? '금요일 끝 — 한 주 결과!' : '내일 아침 메뉴를 생각해요';
    else hint = s.ok ? '다음 주에 새 손님이 와요' : '같은 주를 다시 해요';
    font(ctx, R(0.034), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = firstEver ? '#d0405a' : '#8a5a2c';
    ctx.fillText(hint, w / 2, R(1.552), w - R(0.04));
    if (target) {
      const bob = Math.abs(Math.sin(t * 0.12)) * R(0.016);
      const tx2 = R(target[0]), ty2 = R(target[1]);
      ctx.strokeStyle = `rgba(255,90,110,${0.8 - ((t * 0.03) % 1) * 0.8})`;
      ctx.lineWidth = 3;
      ell(ctx, tx2, ty2, R(0.02) + ((t * 0.03) % 1) * R(0.05), (R(0.02) + ((t * 0.03) % 1) * R(0.05)) * 0.7);
      ctx.stroke();
      finger(ctx, tx2, ty2 - bob, R(0.1));
    }
  }
}
/** 가리키는 손가락 (그린 것, 이모지 아님) */
function finger(ctx: C2, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI - 0.3);
  ctx.fillStyle = 'rgba(80,40,10,.25)';
  ell(ctx, s * 0.12, s * 0.95, s * 0.4, s * 0.12);
  ctx.fill();
  for (const pass of [0, 1]) {
    ctx.fillStyle = pass ? '#ffe0c4' : '#ffffff';
    ctx.strokeStyle = pass ? '#8a5a3a' : '#ffffff';
    ctx.lineWidth = pass ? Math.max(1.5, s * 0.06) : s * 0.16;
    rr(ctx, -s * 0.11, -s * 0.05, s * 0.22, s * 0.6, s * 0.11);
    if (pass) ctx.fill();
    ctx.stroke();
    rr(ctx, -s * 0.3, s * 0.35, s * 0.62, s * 0.55, s * 0.2);
    if (pass) ctx.fill();
    ctx.stroke();
    if (pass) {
      rr(ctx, -s * 0.11, -s * 0.05, s * 0.22, s * 0.5, s * 0.11);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#ffffff';
  ell(ctx, 0, s * 0.04, s * 0.06, s * 0.04);
  ctx.fill();
  ctx.restore();
}

function drawResult(ctx: C2, s: CafeState, R: (v: number) => number, t: number, w: number) {
  const W = weekOf(s), age = s.pt, u = ease(age / 12);
  ctx.fillStyle = `rgba(60,30,10,${0.35 * u})`;
  ctx.fillRect(0, R(0.135), w, R(0.85));
  ctx.save();
  ctx.translate(w / 2, R(0.52));
  ctx.scale(0.5 + 0.5 * u, 0.5 + 0.5 * u);
  ctx.globalAlpha = u;
  const ch = R(0.47);
  ctx.fillStyle = 'rgba(60,30,10,.35)';
  rr(ctx, -R(0.43), -ch / 2 + 6, R(0.86), ch, R(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe2b0']);
  rr(ctx, -R(0.43), -ch / 2, R(0.86), ch, R(0.05));
  ctx.fill();
  ctx.strokeStyle = s.ok ? '#e8a010' : '#c0505a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  font(ctx, R(0.056), 900);
  if (s.ok) {
    outText(ctx, s.won ? '숲속 최고 카페!' : `${s.stage + 1}주 장사 성공!`, 0, -ch / 2 + R(0.055), '#ffffff', '#c8783a', 5, R(0.8));
    const nS = s.starOk.length;
    for (let j = 0; j < nS; j++) {
      const ag = age - (16 + j * 14), sx = (j - (nS - 1) / 2) * R(0.13), sy = -R(0.095);
      const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
      starPath(ctx, sx, sy, R(0.05) * (ag < 0 ? 1 : pop));
      ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc21a' : 'rgba(160,110,60,.25)';
      ctx.fill();
      ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(160,110,60,.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
      const fx = juice(s);
      if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, R(0.52) + sy, '#ffd23a', 18, 3.4, 2.6), fx.kick(3);
    }
    font(ctx, R(0.034), 800);
    ctx.fillStyle = INK;
    W.stars.forEach((q, j) => ctx.fillText(`${s.starOk[j] ? '★' : '☆'} ${q.label}`, 0, R(-0.02 + j * 0.04), R(0.78)));
    coin(ctx, -R(0.12), ch / 2 - R(0.085), R(0.016));
    font(ctx, R(0.04), 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a5208';
    ctx.fillText(`금요일 돈 ${s.money}`, -R(0.095), ch / 2 - R(0.083));
    ctx.textAlign = 'center';
    if (!s.won && age > 60) {
      const nx = WEEKS[s.stage + 1];
      font(ctx, R(0.036), 900);
      ctx.fillStyle = '#d0405a';
      ctx.fillText(`다음 주: ${nx.name} · 밑천 ${START_MONEY}으로 시작`, 0, ch / 2 - R(0.03), R(0.8));
    }
  } else {
    outText(ctx, '이번 주는 문을 닫아요', 0, -ch / 2 + R(0.06), '#ffffff', '#c0505a', 5, R(0.8));
    animal(ctx, 'raccoon', 0, R(0.06), R(0.06), 'head', 'sad', t, 1, 0);
    font(ctx, R(0.038), 800);
    ctx.fillStyle = INK;
    ctx.fillText(s.why, 0, R(0.1), R(0.8));
    ctx.fillStyle = '#c0505a';
    ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 주 다시' : '끝 — 너구리 사장님이 쉬어요', 0, R(0.15), R(0.8));
  }
  ctx.restore();
}

function doEvents(_ctx: C2, s: CafeState, R: (v: number) => number, t: number, w: number) {
  const fx = juice(s), seenT = fx.memo.t ?? -1;
  const actorXY = (idx: string | undefined): [number, number] => {
    const a = s.actors.find((q) => String(q.o.i) === idx);
    const p = a ? actorAt(a, s.pt) : null;
    return p ? [R(p.x), R(p.y) - R(0.15)] : [w / 2, R(0.6)];
  };
  const band = (text: string, sub: string, col: string) => {
    bandMemo.set(s, { text, sub, t, col });
    fx.kick(6);
    fx.blink('#fff3c8', 0.3);
    for (let k = 0; k < 3; k++) fx.burst(R(0.2 + k * 0.3), R(0.56), ['#ff6f91', '#ffd23a', '#7cd46a'][k], 14, 4, 3);
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    switch (e.kind) {
      case 'pin': {
        const fl = flyMemo.get(s) ?? [];
        fl.push({ d: e.d!, t: e.t, x: R(e.x), y: R(e.y) + R(0.05), slot: e.n ?? 0 });
        flyMemo.set(s, fl);
        if (e.text) {
          const dr = dropMemo.get(s) ?? [];
          const [bx, by] = boardSlot(0);
          dr.push({ d: e.text as DishId, t: e.t, x: R(bx), y: R(by) });
          dropMemo.set(s, dr);
          fx.pop(R(bx), R(by) - R(0.05), '내려가요', '#ffd0c0', 13);
        }
        const [bx, by] = boardSlot(e.n ?? 0);
        fx.ring(R(bx), R(by), '#ffd23a', R(0.08), 4);
        fx.burst(R(bx), R(by), '#fff6c8', 16, 3.4, 2.4);
        fx.pop(R(bx), R(by) - R(0.08), '착!', '#ffffff', 22);
        fx.kick(3);
        break;
      }
      case 'unpin': {
        fx.pop(R(e.x), R(e.y) - R(0.02), '내림', '#ffe9c8', 14);
        break;
      }
      case 'once':
        shakeMemo.set(s, { i: WEEKS[s.stage].cards.indexOf(e.d!), t });
        fx.pop(R(e.x), R(e.y) - R(0.02), '새 메뉴는 하루 한 가지!', '#ffffff', 15);
        break;
      case 'poor':
        shakeMemo.set(s, { i: e.text === 'shop' ? 9 : WEEKS[s.stage].cards.indexOf(e.d!), t });
        fx.pop(R(e.x), R(e.y) - R(0.02), '돈이 모자라요', '#ffb0b0', 15);
        break;
      case 'empty':
        shakeMemo.set(s, { i: 8, t });
        fx.pop(R(e.x), R(e.y) - R(0.02), '메뉴를 먼저!', '#ffffff', 15);
        break;
      case 'buy': {
        const o = e.text as UpId;
        if (o === 'plant') fx.memo.plantT = t;
        if (o === 'cat') fx.memo.catT = t;
        if (o === 'table') fx.memo['tbl' + (2 + s.upg.table)] = t;
        const [tx, ty] = o === 'table' ? TABLES[2 + s.upg.table] : o === 'cat' ? [0.25, 0.42] : [0.95, 0.55];
        fx.ring(R(tx), R(ty), '#7cd46a', R(0.14), 5);
        fx.burst(R(tx), R(ty), '#7cd46a', 24, 4.5, 3);
        fx.burst(R(tx), R(ty), '#ffd23a', 14, 3.5, 2.4);
        band('가게가 커졌어요!', UP[o].name + ' — ' + UP[o].what, '#4c9a3a');
        break;
      }
      case 'open':
        fx.ring(R(0.875), R(0.36), '#ffffff', R(0.18), 5);
        fx.burst(R(0.875), R(0.4), '#ffe9a0', 22, 4.5, 3);
        fx.pop(R(0.8), R(0.3), '딸랑!', '#ffd23a', 24);
        fx.pop(R(0.5), R(0.47), `재료 -${e.n}`, '#ffd0c0', 15);
        fx.kick(4);
        break;
      case 'heart': {
        const [x, y] = actorXY(e.text), a = s.actors.find((q) => String(q.o.i) === e.text), st = a?.o.streak ?? 1;
        fx.burst(x, y, '#ff6f91', 10 + st * 3, 3 + st * 0.4, 2.6);
        fx.burst(x, y, '#ffd23a', 6 + st * 2, 3, 2);
        fx.pop(x, y - R(0.03), `+${e.n}`, '#ffd23a', 16 + Math.min(10, st * 2));
        if (st >= 2) fx.ring(x, y + R(0.03), '#ff6f91', R(0.05 + st * 0.012), 3);
        if (st >= 3) fx.kick(2 + st * 0.6);
        fx.memo.payT = t;
        break;
      }
      case 'smile': {
        const [x, y] = actorXY(e.text);
        fx.burst(x, y, '#ffe9a0', 8, 2.4, 2);
        fx.pop(x, y - R(0.03), `+${e.n}`, '#fff6c8', 15);
        fx.memo.payT = t;
        break;
      }
      case 'sad': {
        const [x, y] = actorXY(e.text);
        fx.burst(x, y, '#9fc4e8', 8, 1.8, 2.4);
        fx.pop(x, y - R(0.02), e.k === 'owl' ? '흥!' : '시무룩…', '#cfe4ff', 14);
        break;
      }
      case 'noseat': {
        const [x, y] = actorXY(e.text);
        fx.pop(x, y - R(0.02), '자리가 없네…', '#cfe4ff', 14);
        break;
      }
      case 'sold': {
        const slot = s.menu.indexOf(e.d!);
        if (slot >= 0) {
          const [bx, by] = boardSlot(slot);
          fx.ring(R(bx), R(by), '#ff6f91', R(0.09), 4);
          fx.burst(R(bx), R(by), '#ffd23a', 20, 4, 2.6);
          fx.pop(R(bx), R(by) - R(0.09), '완판!', '#ff6f91', 22);
          fx.kick(4);
        }
        break;
      }
      case 'run':
        band(`하트 줄줄이 ×${e.n}!`, '이어질수록 팁이 커져요', '#e8506a');
        break;
      case 'group':
        band('단체 손님 대만족!', '넷이 한 접시를 싹싹', '#8a5ac8');
        break;
      case 'gourmet':
        band('미식가 감동!', '세 배로 냈어요', '#2f3a5a');
        break;
      case 'full':
        band('모두 웃었어요!', `손님 ${e.n}명 전부 냠냠`, '#e8a010');
        break;
      case 'clear':
        fx.blink('#fff6c8', 0.4);
        break;
      case 'fail':
        fx.kick(5);
        break;
    }
  }
}
