/**
 * 작은 어항 생태계 (34라운드: 완전히 다른 장르 — 생태계 키우기) — 어항 생태계 × 방치형 × 가리키기(톡).
 * 조작(기준 9·11, 톡 하나): 하루가 시작되면 아래에 생물 카드 셋. 하나를 톡 하면 '퐁당' 어항에 들어오고 그 하루가 저절로 흐른다.
 *   누르고 있기·끌기·타이밍 없음. 아무것도 안 누르면 어항은 그대로 기다린다. 키보드는 ← →로 카드 고르고 스페이스(또는 숫자 1·2·3).
 * 규칙(결정적, 하루 단위): 들어온 생물이 서로 먹고·숨고·청소하고·알을 낳는다.
 *   흰동가리는 말미잘(셋)에 안기고, 해마는 해초(둘)·산호(둘)를 붙잡고, 작은 상어는 숨지 못한 물고기 하나를 먹는다(아픈 물고기부터).
 *   물고기 둘이 먹이 한 칸, 이끼와 찌꺼기가 물을 탁하게, 달팽이·성게·게가 맑게. 먹이나 맑기가 바닥나면 그 판 실패(하트 -1).
 * 와우: 상어를 넣어야 어항이 산다 — 아기가 쏟아져 먹이가 바닥나기 전에, 숨을 곳 밖의 녀석만 솎아 준다. 숨을 곳을 먼저 만들면 상어는 편이 된다.
 * 판 7개: 목표(첫 별) + 판마다 별 하나씩 늘어남. 날 수가 다 지나면 목표를 봤다.
 * 펼쳐짐(하는 일이 바뀐다): 1판 퐁당·말미잘 안기기 → 2판 이끼(청소부) → 3판 작은 상어(숨을 곳 · 솎기) → 4판 산호 숲(맑아야 자람 · 성게 함정)
 *   → 5판 밤바다(밤엔 먹이가 안 자라고 상어가 둘, 게는 밤에 셋) → 6판 해류(먹이를 실어 오지만 못 붙잡은 해마는 떠내려감) → 7판 아픈 물고기(옮음 · 새우·상어).
 * 웃음: 흰동가리는 말미잘에 쏙 안겨 하트를 뽀글, 상어가 오면 다들 눈이 동그래져 쏙 숨고, 꿀꺽한 상어는 트림 방울.
 *   먹이가 바닥나면 다들 배를 내놓고 둥둥, 이끼가 끼면 물고기들이 눈을 찡그린다. 유리 밖에서 고양이가 구경한다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 생물 ─────────────────────────────
export const CLOWN = 0, ANEM = 1, SNAIL = 2, HORSE = 3, SHARK = 4, CRAB = 5, CORAL = 6, URCHIN = 7, SHRIMP = 8, WEED = 9;
const NSP = 10;
interface SpDef { key: string; name: string; k: number; size: number; job: string; job2: string; col: string; cap: number }
export const SP: SpDef[] = [
  { key: 'clown', name: '흰동가리', k: 3, size: 3, job: '말미잘에 쏙', job2: '아기를 낳아요', col: '#ff8a3d', cap: 12 },
  { key: 'anem', name: '말미잘', k: 1, size: 5, job: '흰동가리 품기', job2: '셋까지', col: '#c86bd8', cap: 4 },
  { key: 'snail', name: '달팽이', k: 2, size: 2, job: '이끼 냠냠', job2: '물이 맑아져요', col: '#e9b46a', cap: 8 },
  { key: 'horse', name: '해마', k: 2, size: 6, job: '해초를 꼭', job2: '아기를 낳아요', col: '#ffc93f', cap: 8 },
  { key: 'shark', name: '작은 상어', k: 1, size: 9, job: '못 숨으면 꿀꺽', job2: '아픈 물고기부터', col: '#8fa6b8', cap: 3 },
  { key: 'crab', name: '게', k: 1, size: 7, job: '찌꺼기 청소', job2: '밤엔 세 배', col: '#ef5b4b', cap: 4 },
  { key: 'coral', name: '산호', k: 1, size: 4, job: '숨을 곳·쑥쑥', job2: '맑으면 자라요', col: '#ff7aa2', cap: 8 },
  { key: 'urchin', name: '성게', k: 1, size: 5, job: '이끼 듬뿍', job2: '산호를 갉아요', col: '#7a54c4', cap: 4 },
  { key: 'shrimp', name: '청소 새우', k: 2, size: 1, job: '아픈 물고기 고침', job2: '', col: '#ff8fa6', cap: 6 },
  { key: 'weed', name: '해초', k: 1, size: 8, job: '먹이가 쑥쑥', job2: '해마가 잡아요', col: '#3fbf6a', cap: 4 },
];
export const isFish = (sp: number) => sp === CLOWN || sp === HORSE;

/** 어항 하나의 상태 (하루 단위, 봇이 미리 계산하는 순수한 값) */
export interface Eco { n: number[]; clar: number; food: number; sick: number; minClar: number; eaten: number; born: number; swept: number; fail: string }
type StarK = 'live' | 'count' | 'kinds' | 'clear' | 'noeat' | 'food' | 'babies' | 'healthy' | 'nosweep';
interface Star { k: StarK; n: number; sp: number; label: string }
const ST = (k: StarK, n: number, label: string, sp = -1): Star => ({ k, n, sp, label });
interface StageDef {
  key: string; name: string; news: string; tip: string; days: number;
  start: [number, number][]; clar: number; food: number; sun: number; algae: number;
  night: boolean; current: number[]; sick: number[]; first: number[]; pool: number[]; stars: Star[];
}

export const STAGES: StageDef[] = [
  {
    key: 'home', name: '흰동가리 집', news: '생물 카드를 톡 → 어항에 퐁당!', tip: '흰동가리는 말미잘에 쏙 안겨 아기를 낳아요', days: 4,
    start: [[ANEM, 1], [WEED, 1]], clar: 8, food: 6, sun: 3, algae: 0, night: false, current: [], sick: [],
    first: [CLOWN, HORSE, SNAIL], pool: [CLOWN, HORSE, SNAIL, CRAB, CORAL, WEED, ANEM],
    stars: [ST('live', 0, '나흘 동안 살리기')],
  },
  {
    key: 'algae', name: '이끼가 자라요', news: '이끼 — 날마다 물이 탁해져요. 청소부를 넣어요!', tip: '달팽이·게·성게가 이끼를 먹어요', days: 5,
    start: [[ANEM, 1], [CLOWN, 3], [WEED, 1]], clar: 6, food: 6, sun: 3, algae: 1, night: false, current: [], sick: [],
    first: [SNAIL, CRAB, CORAL], pool: [SNAIL, CRAB, URCHIN, CLOWN, HORSE, WEED, CORAL, ANEM],
    stars: [ST('live', 0, '닷새 동안 살리기'), ST('clear', 5, '물 맑게 지키기')],
  },
  {
    key: 'shark', name: '작은 상어', news: '작은 상어 — 숨지 못한 물고기를 꿀꺽해요', tip: '말미잘·산호로 숨을 곳을 만들어요 — 넘치는 녀석만 솎아 줘요', days: 6,
    start: [[ANEM, 1], [CLOWN, 4], [WEED, 1], [SNAIL, 2], [SHARK, 1]], clar: 8, food: 6, sun: 3, algae: 1, night: false, current: [], sick: [],
    first: [CORAL, ANEM, CLOWN], pool: [SHARK, CLOWN, HORSE, CORAL, WEED, ANEM, SNAIL, CRAB, URCHIN],
    stars: [ST('count', 6, '흰동가리 여섯', CLOWN), ST('food', 6, '먹이 넉넉히'), ST('kinds', 6, '여섯 종 함께')],
  },
  {
    key: 'coral', name: '산호 숲', news: '산호 — 물이 맑으면 날마다 쑥쑥 자라요', tip: '성게는 이끼가 없으면 산호를 갉아요', days: 6,
    start: [[CORAL, 1], [CLOWN, 3], [ANEM, 1], [SNAIL, 2]], clar: 7, food: 6, sun: 3, algae: 2, night: false, current: [], sick: [],
    first: [URCHIN, CORAL, SNAIL], pool: [URCHIN, CORAL, SNAIL, CRAB, CLOWN, HORSE, WEED, SHARK, ANEM],
    stars: [ST('count', 4, '산호 넷 키우기', CORAL), ST('food', 5, '먹이 넉넉히'), ST('kinds', 6, '여섯 종 함께')],
  },
  {
    key: 'night', name: '밤바다', news: '밤 — 해가 없어 먹이가 안 자라요. 게는 밤에 바빠요', tip: '밤엔 상어가 둘을 먹어요 — 낮에 먹이를 모아 둬요', days: 6,
    start: [[ANEM, 1], [CLOWN, 4], [WEED, 1], [CORAL, 1]], clar: 7, food: 5, sun: 3, algae: 2, night: true, current: [], sick: [],
    first: [CRAB, WEED, SHARK], pool: [CRAB, WEED, SHARK, CLOWN, HORSE, SNAIL, CORAL, ANEM, URCHIN],
    stars: [ST('live', 0, '엿새 동안 살리기'), ST('noeat', 0, '하나도 안 먹히기'), ST('kinds', 6, '여섯 종 함께')],
  },
  {
    key: 'current', name: '해류', news: '해류 — 먹이를 실어 오지만 못 붙잡은 해마는 떠내려가요', tip: '해초·산호 하나에 해마 둘이 붙잡아요', days: 6,
    start: [[HORSE, 2], [ANEM, 1], [CLOWN, 3], [SNAIL, 2]], clar: 7, food: 5, sun: 2, algae: 1, night: false, current: [2, 4], sick: [],
    first: [WEED, HORSE, CRAB], pool: [WEED, HORSE, CORAL, CLOWN, SHARK, SNAIL, CRAB, ANEM, URCHIN],
    stars: [ST('count', 5, '해마 가족 다섯', HORSE), ST('nosweep', 0, '안 떠내려가기'), ST('kinds', 6, '여섯 종 함께')],
  },
  {
    key: 'sick', name: '아픈 물고기', news: '아픈 물고기 — 날마다 옮아요. 넷이 되면 실패!', tip: '청소 새우가 고쳐 줘요 — 상어는 아픈 물고기부터 먹어요', days: 6,
    start: [[ANEM, 2], [CLOWN, 5], [WEED, 1], [SNAIL, 2]], clar: 7, food: 6, sun: 3, algae: 1, night: false, current: [], sick: [0, 3],
    first: [SHRIMP, SHARK, CLOWN], pool: [SHRIMP, SHARK, CLOWN, HORSE, CORAL, WEED, SNAIL, CRAB, ANEM, URCHIN],
    stars: [ST('count', 8, '흰동가리 여덟', CLOWN), ST('noeat', 0, '하나도 안 먹히기'), ST('kinds', 7, '일곱 종 함께')],
  },
];
export const STAGE_COUNT = STAGES.length;

export function startEco(d: StageDef): Eco {
  const n = Array(NSP).fill(0);
  for (const [sp, k] of d.start) n[sp] = k;
  return { n, clar: d.clar, food: d.food, sick: 0, minClar: d.clar, eaten: 0, born: 0, swept: 0, fail: '' };
}
export const kinds = (e: Eco) => e.n.reduce((a, v) => a + (v > 0 ? 1 : 0), 0);
export const isNight = (d: StageDef, day: number) => d.night && day % 2 === 1;

/** 하루가 흐른 결과 (연출이 이 순서대로 펼친다) */
export interface DayRes {
  add: number; night: boolean; cur: boolean; sickIn: number; swept: number;
  hugC: number; hideC: number; holdH: number; eat: number[]; eatSick: number; hungry: number;
  food0: number; food: number; plank: number; demand: number; clar0: number; clar: number; clean: number; dirt: number;
  grow: number; bleach: number; nibble: number; babies: [number, number]; spread: number; cured: number; fail: string;
}

/** 하루: 생물이 들어오고 → (아픈 물고기) → 해류 → 숨기 → 상어 → 먹이 → 맑기 → 산호 → 병 → 아기 */
export function dayStep(d: StageDef, e0: Eco, add: number, day: number): { e: Eco; r: DayRes } {
  const n = e0.n.slice(), e: Eco = { ...e0, n };
  const night = isNight(d, day), cur = d.current.includes(day);
  const r: DayRes = {
    add, night, cur, sickIn: 0, swept: 0, hugC: 0, hideC: 0, holdH: 0, eat: [], eatSick: 0, hungry: 0,
    food0: e0.food, food: e0.food, plank: 0, demand: 0, clar0: e0.clar, clar: e0.clar, clean: 0, dirt: 0,
    grow: 0, bleach: 0, nibble: 0, babies: [0, 0], spread: 0, cured: 0, fail: '',
  };
  if (add >= 0) n[add] = Math.min(SP[add].cap, n[add] + SP[add].k);
  if (d.sick.includes(day) && n[CLOWN] - e.sick > 0) (e.sick++, (r.sickIn = 1));
  // 해류: 붙잡을 곳(해초·산호 하나에 둘) 없는 해마는 떠내려간다
  if (cur) {
    const lost = Math.max(0, n[HORSE] - 2 * (n[WEED] + n[CORAL]));
    n[HORSE] -= lost;
    r.swept = lost;
    e.swept += lost;
  }
  // 숨을 곳: 말미잘(흰동가리 셋) · 해초(해마 둘) · 산호(아무 물고기 둘). 아픈 물고기는 못 숨는다
  const healthy = n[CLOWN] - e.sick;
  let cs = Math.min(healthy, 3 * n[ANEM]), hs = Math.min(n[HORSE], 2 * n[WEED]), free = 2 * n[CORAL];
  r.hugC = cs;
  const c2 = Math.min(healthy - cs, free);
  cs += c2;
  free -= c2;
  r.hideC = c2;
  hs += Math.min(n[HORSE] - hs, free);
  r.holdH = hs;
  // 작은 상어: 숨지 못한 물고기 하나(밤엔 둘) — 아픈 물고기부터. 아무것도 못 먹은 상어는 먹이 두 칸
  let bites = n[SHARK] * (night ? 2 : 1), uc = healthy - cs, uh = n[HORSE] - hs;
  while (bites > 0 && e.sick > 0) (e.sick--, n[CLOWN]--, r.eat.push(CLOWN), r.eatSick++, bites--);
  while (bites > 0 && uc + uh > 0) {
    if (uc >= uh) (uc--, n[CLOWN]--, r.eat.push(CLOWN));
    else (uh--, n[HORSE]--, r.eat.push(HORSE));
    bites--;
  }
  r.hungry = Math.max(0, n[SHARK] - r.eat.length);
  e.eaten += r.eat.length;
  // 먹이: 햇빛 플랑크톤 + 해초(낮) + 해류, 물고기 둘이 한 칸
  const fish = n[CLOWN] + n[HORSE];
  r.plank = (night ? 0 : d.sun + 2 * n[WEED]) + (cur ? 3 : 0);
  r.demand = Math.ceil(fish / 2) + 2 * r.hungry;
  const food = Math.min(10, e0.food + r.plank) - r.demand;
  e.food = r.food = Math.max(0, food);
  // 맑기: 이끼(낮) + 찌꺼기(물고기 넷에 하나) − 달팽이·성게·게
  r.dirt = (night ? 0 : d.algae) + Math.floor(fish / 4);
  r.clean = n[SNAIL] + 2 * n[URCHIN] + n[CRAB] * (night ? 3 : 1);
  const clar = Math.min(10, e0.clar - r.dirt + r.clean);
  e.clar = r.clar = Math.max(0, clar);
  e.minClar = Math.min(e.minClar, e.clar);
  if (food < 0) return (e.fail = r.fail = '먹이가 바닥났어요'), { e, r };
  if (clar <= 0) return (e.fail = r.fail = '이끼로 물이 탁해졌어요'), { e, r };
  // 산호: 맑으면(6칸) 낮마다 하나 쑥, 탁하면(3칸) 하나 시듦. 성게는 이끼가 없으면(8칸) 산호를 갉는다
  if (n[CORAL] > 0) {
    if (!night && e.clar >= 6 && n[CORAL] < SP[CORAL].cap) (n[CORAL]++, (r.grow = 1));
    else if (e.clar <= 3) (n[CORAL]--, (r.bleach = 1));
    if (e.clar >= 8 && n[URCHIN] > 0) {
      const k = Math.min(n[URCHIN], n[CORAL]);
      n[CORAL] -= k;
      r.nibble = k;
    }
  }
  // 병: 날마다 하나씩 옮고, 새우 하나가 하나씩 고친다. 넷이면 실패
  if (e.sick > 0) {
    r.spread = Math.min(1, n[CLOWN] - e.sick);
    e.sick += r.spread;
    r.cured = Math.min(e.sick, n[SHRIMP]);
    e.sick -= r.cured;
    if (e.sick >= 4) return (e.fail = r.fail = '병이 다 퍼졌어요'), { e, r };
  }
  // 아기: 먹이가 넉넉하면(4칸) 말미잘에 안긴 흰동가리 둘마다 · 붙잡은 해마 둘마다 하나 (하루 둘까지)
  if (e.food >= 4) {
    const hc = Math.min(n[CLOWN] - e.sick, 3 * n[ANEM]), hh = Math.min(n[HORSE], 2 * (n[WEED] + n[CORAL]));
    const bc = Math.max(0, Math.min(2, hc >> 1, SP[CLOWN].cap - n[CLOWN])), bh = Math.max(0, Math.min(2, hh >> 1, SP[HORSE].cap - n[HORSE]));
    n[CLOWN] += bc;
    n[HORSE] += bh;
    r.babies = [bc, bh];
    e.born += bc + bh;
  }
  return { e, r };
}

export function starMet(e: Eco, q: Star): boolean {
  if (e.fail) return false;
  switch (q.k) {
    case 'live': return true;
    case 'count': return e.n[q.sp] >= q.n;
    case 'kinds': return kinds(e) >= q.n;
    case 'clear': return e.minClar >= q.n;
    case 'noeat': return e.eaten === 0;
    case 'food': return e.food >= q.n;
    case 'babies': return e.born >= q.n;
    case 'healthy': return e.sick === 0;
    case 'nosweep': return e.swept === 0;
  }
}
/** 별 진행 (0~1) — 봇 판단용 */
function starProg(e: Eco, q: Star): number {
  switch (q.k) {
    case 'count': return Math.min(1, e.n[q.sp] / q.n);
    case 'kinds': return Math.min(1, kinds(e) / q.n);
    case 'clear': return e.minClar >= q.n ? 1 : Math.max(0, e.minClar / q.n) * 0.5;
    case 'food': return Math.min(1, e.food / q.n);
    case 'babies': return Math.min(1, e.born / q.n);
    case 'noeat': case 'nosweep': case 'healthy': return starMet(e, q) ? 1 : 0;
    default: return 1;
  }
}
/** 별 칸 옆 진행 숫자 (예: 2/5) */
function starNow(e: Eco, q: Star): string {
  const v = q.k === 'count' ? e.n[q.sp] : q.k === 'kinds' ? kinds(e) : q.k === 'babies' ? e.born : -1;
  return v >= 0 && q.n > 1 ? `${Math.min(v, q.n)}/${q.n}` : '';
}
/** 이미 깨진 별 (되돌릴 수 없음) */
const starBroken = (e: Eco, q: Star) => (q.k === 'clear' && e.minClar < q.n) || (q.k === 'noeat' && e.eaten > 0) || (q.k === 'nosweep' && e.swept > 0);

// ───────────────────────────── 카드 더미 ─────────────────────────────
function drawTriple(d: StageDef, r: Rng): number[] {
  const out: number[] = [];
  while (out.length < 3) {
    const sp = d.pool[Math.floor(r() * d.pool.length)];
    if (!out.includes(sp)) out.push(sp);
  }
  return out;
}
/** 전부 아는 사람이 별을 다 딸 수 있는가 (판을 만들 때 거른다 — 버릇 봇은 안 쓴다) */
function solvable(d: StageDef, deck: number[][]): boolean {
  const go = (e: Eco, day: number): boolean => {
    if (e.fail) return false;
    if (day === d.days) return d.stars.every((q) => starMet(e, q));
    for (const sp of deck[day]) if (go(dayStep(d, e, sp, day).e, day + 1)) return true;
    return false;
  };
  return go(startEco(d), 0);
}
export function makeDeck(d: StageDef, r: Rng, first: boolean): number[][] {
  let deck: number[][] = [];
  for (let tries = 0; tries < 40; tries++) {
    deck = [];
    for (let k = 0; k < d.days; k++) deck.push(k === 0 && first ? d.first.slice() : drawTriple(d, r));
    if (solvable(d, deck)) return deck;
  }
  return deck;
}

// ───────────────────────────── 판단 (잘하는 봇) ─────────────────────────────
/** 판이 끝났을 때의 값: 목표·별·여유 */
function endValue(d: StageDef, e: Eco, day: number): number {
  if (e.fail) return -1e6 + day * 1e4;
  let v = 0;
  d.stars.forEach((q, i) => {
    const w = i === 0 ? 3000 : 1000;
    v += starMet(e, q) ? w : starProg(e, q) * w * 0.45;
  });
  return v + Math.min(e.clar, 7) * 12 + Math.min(e.food, 6) * 12;
}
/** 남은 날을 아무것도 안 넣고 흘려 본다 (비관적 내다보기) */
function rollout(d: StageDef, e: Eco, day: number): number {
  let x = e, k = day;
  while (!x.fail && k < d.days) (x = dayStep(d, x, -1, k).e), k++;
  return endValue(d, x, x.fail ? k : d.days);
}
/** 오늘 카드 셋 × 내일 카드 셋(화면에 보이는 것)까지 다 해 보고 나머지는 흘려 본다 */
export function planPick(d: StageDef, e: Eco, day: number, deck: number[][]): number {
  let best = -Infinity, pick = 0;
  deck[day].forEach((sp, i) => {
    const a = dayStep(d, e, sp, day).e;
    let v: number;
    if (a.fail) v = endValue(d, a, day);
    else if (day + 1 < d.days && deck[day + 1]) v = Math.max(...deck[day + 1].map((sp2) => {
      const b = dayStep(d, a, sp2, day + 1).e;
      return b.fail ? endValue(d, b, day + 1) : rollout(d, b, day + 2);
    }));
    else v = day + 1 < d.days ? rollout(d, a, day + 1) : endValue(d, a, d.days);
    if (v > best) (best = v), (pick = i);
  });
  return pick;
}

// ───────────────────────────── 화면 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
const TX0 = 0.022, TX1 = 0.978, TY0 = 0.168, TY1 = 0.962;
const MY0 = 0.978, MY1 = 1.068;
const CY0 = 1.082, CY1 = 1.418, CW = 0.3;
const cardCX = (i: number) => 0.175 + i * 0.325;
const TXm = (x: number) => TX0 + x * (TX1 - TX0), TYm = (y: number) => TY0 + y * (TY1 - TY0);
/** 화면 좌표(가로 0~1, 세로 0~A)에서 카드 번호 (없으면 -1) — 카드보다 조금 넓게 받는다 */
function cardAt(x: number, y: number): number {
  if (y < CY0 - 0.02 || y > CY1 + 0.04) return -1;
  for (let i = 0; i < 3; i++) if (Math.abs(x - cardCX(i)) <= CW / 2 + 0.012) return i;
  return -1;
}

/** 하루 연출 시각표(틱) */
const DEAL = 16, T_DROP = 12, T_HUG = 40, T_SICKIN = 46, T_SWEEP = 52, T_HUNT = 58, T_METER = 92, T_CORAL = 106, T_SICK = 114, T_BABY = 122, T_FAIL = 130, T_END = 154;
const RES_OK = 200, RES_FAIL = 170, BANNER_T = 160, NEWS_T = 190;
/** 뒤 판일수록 크게: 판 번호+1 배 */
const CLEAR_PTS = 30, STAR_PTS = 50, WIN_PTS = 400;

/** 심는 자리 (어항 좌표: 가로 0~1, 세로 0 수면 ~ 1 모래 앞) */
const SPOTS: [number, number][] = [
  [0.3, 0.875], [0.7, 0.88], [0.5, 0.835], [0.11, 0.845], [0.89, 0.85], [0.41, 0.935], [0.6, 0.94], [0.19, 0.935],
  [0.81, 0.94], [0.06, 0.93], [0.94, 0.93], [0.36, 0.81], [0.64, 0.81], [0.5, 0.955], [0.25, 0.8], [0.75, 0.8],
];
const PREF: Record<number, number[]> = {
  [ANEM]: [0, 1, 5, 6, 7, 8],
  [WEED]: [3, 4, 9, 10, 14, 15],
  [CORAL]: [2, 11, 12, 6, 5, 13, 14, 15, 7, 8],
};
const planted = (sp: number) => sp === ANEM || sp === CORAL || sp === WEED;

interface Ent {
  id: number; sp: number; x: number; y: number; face: number; ph: number;
  /** 0 헤엄 · 1 말미잘에 안김 · 2 산호에 숨음 · 3 해초·산호 붙잡음 · 9 심김 */
  mode: number; host: number; slot: number; spot: number;
  born: number; drop: number; die: number; how: string; sick: boolean; baby: number; scare: number; joy: number;
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; n?: number }

export interface ReefState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'pick' | 'day' | 'result'; pt: number;
  eco: Eco; prev: Eco; res: DayRes | null; day: number; deck: number[][]; pickI: number; dropX: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  down: boolean; ax: number; ay: number; kc: number; kbd: boolean; lastDir: number; taps: number; firstTap: number; miss: number;
  log: { t: number; text: string; col: string }[];
  ents: Ent[]; nid: number; wowN: number; band: { text: string; t: number; col: string } | null; babyEver: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; banner: number; events: Ev[];
  mood: string; moodT: number;
}

const ev = (s: ReefState, kind: string, x: number, y: number, text?: string, col?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, n });
function see(s: ReefState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
function wow(s: ReefState, text: string, col = '#fff3a8') {
  s.wowN++;
  s.band = { text, t: s.t, col };
}
const setMood = (s: ReefState, m: string) => ((s.mood = m), (s.moodT = s.t));
const say = (s: ReefState, text: string, col = '#fff3dc') => s.log.push({ t: s.t, text, col });
const sgn = (v: number) => (v > 0 ? `+${v}` : `${v}`);

// ───────────────────────────── 생물 연출 (상태에 붙지만 판단엔 안 쓰인다) ─────────────────────────────
function freeSpot(s: ReefState, sp: number): number {
  const used = new Set(s.ents.filter((e) => e.spot >= 0 && e.die < 0).map((e) => e.spot));
  for (const k of [...(PREF[sp] ?? []), ...SPOTS.keys()]) if (!used.has(k)) return k;
  return Math.floor(s.rng() * SPOTS.length);
}
function mkEnt(s: ReefState, sp: number, x: number, y: number): Ent {
  const e: Ent = { id: s.nid++, sp, x, y, face: s.nid % 2 ? 1 : -1, ph: ((s.nid * 0.618) % 1) * 6.283, mode: 0, host: -1, slot: 0, spot: -1, born: s.t, drop: 0, die: -1, how: '', sick: false, baby: 0, scare: 0, joy: 0 };
  if (planted(sp)) {
    e.spot = freeSpot(s, sp);
    e.mode = 9;
    [e.x, e.y] = SPOTS[e.spot];
  }
  s.ents.push(e);
  return e;
}
const alive = (s: ReefState, sp: number) => s.ents.filter((e) => e.sp === sp && e.die < 0);
/** 숨을 곳 나누기 — dayStep과 같은 순서: 말미잘(흰동가리 셋) → 산호(흰동가리) → 해초(해마 둘) → 산호(해마) */
function assignHomes(s: ReefState) {
  const anem = alive(s, ANEM), coral = alive(s, CORAL), weed = alive(s, WEED);
  const cl = alive(s, CLOWN), hs = alive(s, HORSE);
  for (const e of [...cl, ...hs]) (e.mode = 0), (e.host = -1);
  let ai = 0, ci = 0, wi = 0;
  for (const e of cl) {
    if (e.sick) continue;
    if (ai < anem.length * 3) (e.mode = 1), (e.host = anem[Math.floor(ai / 3)].id), (e.slot = ai % 3), ai++;
    else if (ci < coral.length * 2) (e.mode = 2), (e.host = coral[Math.floor(ci / 2)].id), (e.slot = ci % 2), ci++;
  }
  for (const e of hs) {
    if (wi < weed.length * 2) (e.mode = 3), (e.host = weed[Math.floor(wi / 2)].id), (e.slot = wi % 2), wi++;
    else if (ci < coral.length * 2) (e.mode = 3), (e.host = coral[Math.floor(ci / 2)].id), (e.slot = ci % 2), ci++;
  }
}
/** 논리 수와 화면 생물 수를 맞춘다 (연출 없이) */
function reconcile(s: ReefState) {
  const n = s.eco.n;
  for (let sp = 0; sp < NSP; sp++) {
    const a = alive(s, sp);
    for (let k = a.length; k < n[sp]; k++) {
      const e = mkEnt(s, sp, 0.2 + s.rng() * 0.6, 0.3 + s.rng() * 0.3);
      e.born = s.t - 999;
    }
    for (let k = n[sp]; k < a.length; k++) a[a.length - 1 - (k - n[sp])].die = s.t - 999;
  }
  s.ents = s.ents.filter((e) => e.die < 0 || s.t - e.die < 60);
  const cl = alive(s, CLOWN);
  cl.forEach((e, i) => (e.sick = i >= cl.length - s.eco.sick));
  assignHomes(s);
}
const host = (s: ReefState, id: number) => s.ents.find((e) => e.id === id);

/** 생물이 가려는 곳 (어항 좌표) */
function targetOf(s: ReefState, e: Ent): [number, number] {
  const t = s.t, ph = e.ph;
  const night = s.stage < STAGES.length && isNight(STAGES[s.stage], s.day) ? 1 : 0;
  if (e.mode === 9) return SPOTS[e.spot];
  const h = e.host >= 0 ? host(s, e.host) : undefined;
  if (e.sp === CLOWN) {
    if (h && e.mode === 1) {
      const a = (e.slot - 1) * 0.9 + 0.35 * Math.sin(t * 0.03 + ph);
      return [h.x + Math.sin(a) * 0.085, h.y - 0.15 - Math.cos(a) * 0.035 + 0.01 * Math.sin(t * 0.05 + ph)];
    }
    if (h && e.mode === 2) return [h.x + (e.slot ? 0.06 : -0.06), h.y - 0.1 + 0.008 * Math.sin(t * 0.06 + ph)];
    const sp = 0.0045 + 0.0015 * (e.id % 3);
    return [0.5 + 0.4 * Math.sin(t * sp + ph), 0.2 + 0.36 * (0.5 + 0.5 * Math.sin(t * sp * 1.63 + ph * 2.1)) + night * 0.12];
  }
  if (e.sp === HORSE) {
    if (h && e.mode === 3) return [h.x + (e.slot ? 0.07 : -0.07), h.y - 0.2 + 0.012 * Math.sin(t * 0.04 + ph)];
    return [0.5 + 0.36 * Math.sin(t * 0.0035 + ph), 0.3 + 0.2 * Math.sin(t * 0.006 + ph * 1.7)];
  }
  if (e.sp === SHARK) return [0.5 + 0.4 * Math.sin(t * 0.0055 + ph), 0.33 + 0.1 * Math.sin(t * 0.011 + ph) + night * 0.08];
  if (e.sp === SNAIL) return [0.08 + 0.84 * (0.5 + 0.5 * Math.sin(t * 0.0012 + ph * 3)), 0.3 + 0.38 * (0.5 + 0.5 * Math.sin(t * 0.0009 + ph * 5))];
  if (e.sp === CRAB) return [0.5 + 0.42 * Math.sin(t * (0.006 + night * 0.01) + ph), 0.955];
  if (e.sp === URCHIN) return [0.15 + 0.7 * (0.5 + 0.5 * Math.sin(t * 0.0016 + ph * 2)), 0.915];
  if (e.sp === SHRIMP) {
    const a = alive(s, ANEM)[e.id % Math.max(1, alive(s, ANEM).length)];
    const bx = a ? a.x : 0.5;
    return [bx + 0.1 * Math.sin(t * 0.02 + ph), 0.86 + 0.03 * Math.abs(Math.sin(t * 0.06 + ph))];
  }
  return [e.x, e.y];
}
const SPEED = [0.05, 0, 0.004, 0.035, 0.03, 0.04, 0, 0.01, 0.06, 0];
function animate(s: ReefState) {
  for (const e of s.ents) {
    if (e.die >= 0) {
      const k = s.t - e.die;
      if (e.how === 'swept') (e.x += 0.012 + k * 0.0004), (e.y += 0.004 * Math.sin(k * 0.3));
      else if (e.how === 'belly') e.y += (0.03 - e.y) * 0.03;
      continue;
    }
    if (e.drop > 0) {
      // 퐁당: 수면에서 가라앉으며 제자리로
      const [gx, gy] = planted(e.sp) ? SPOTS[e.spot] : targetOf(s, e);
      const q = Math.min(1, (s.t - e.born) / 36);
      e.y = e.y + (gy - e.y) * (0.05 + q * 0.1);
      e.x = e.x + (gx - e.x) * (0.03 + q * 0.08);
      if (q >= 1) e.drop = 0;
      continue;
    }
    const [gx, gy] = targetOf(s, e);
    const hunt = s.phase === 'day' && s.pt >= T_HUNT && s.pt < T_HUNT + 46 && s.eco.n[SHARK] > 0;
    let k = SPEED[e.sp] * (e.baby > 0 ? 1.3 : 1);
    if (hunt && (e.sp === CLOWN || e.sp === HORSE) && e.mode !== 0) k = 0.16;
    const dx = gx - e.x;
    e.x += dx * k;
    e.y += (gy - e.y) * k;
    if (Math.abs(dx) > 0.002 && e.sp !== HORSE) e.face = dx > 0 ? 1 : -1;
    if (e.sp === HORSE && e.mode === 3 && e.host >= 0) {
      const h = host(s, e.host);
      if (h) e.face = h.x > e.x ? 1 : -1;
    } else if (e.sp === HORSE && Math.abs(dx) > 0.002) e.face = dx > 0 ? 1 : -1;
    if (e.baby > 0) e.baby = Math.max(0, e.baby - 1);
    if (e.scare > 0) e.scare--;
    if (e.joy > 0) e.joy--;
  }
  if (s.ents.length > 40 || s.t % 30 === 0) s.ents = s.ents.filter((e) => e.die < 0 || s.t - e.die < 70);
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function newStage(s: ReefState, again: boolean) {
  const d = STAGES[s.stage];
  s.deck = makeDeck(d, s.rng, !again);
  s.eco = startEco(d);
  s.prev = s.eco;
  s.res = null;
  s.day = 0;
  s.phase = 'pick';
  s.pt = 0;
  s.again = again;
  s.ents = [];
  s.band = null;
  for (const [sp, k] of d.start) for (let j = 0; j < k; j++) mkEnt(s, sp, 0.2 + ((j * 0.37 + sp * 0.21) % 0.6), 0.25 + ((j * 0.23) % 0.3)).born = s.t - 999;
  reconcile(s);
  s.banner = s.t;
  see(s, d.key, '');
  if (d.night) see(s, 'nightIcon', '');
  ev(s, 'stage', 0.5, 0.5, `${s.stage + 1}판 · ${d.name}`);
}

function startDay(s: ReefState, i: number) {
  const d = STAGES[s.stage], sp = s.deck[s.day][i];
  const { e, r } = dayStep(d, s.eco, sp, s.day);
  s.prev = s.eco;
  s.eco = e;
  s.res = r;
  s.pickI = i;
  s.log = [];
  s.phase = 'day';
  s.pt = 0;
  s.taps++;
  if (s.firstTap < 0) s.firstTap = s.t;
  s.dropX = 0.2 + i * 0.3;
  s.banner = Math.min(s.banner, s.t - BANNER_T + 20);
  see(s, 'sp' + sp, '');
  ev(s, 'pick', cardCX(i), (CY0 + CY1) / 2, '', SP[sp].col, sp);
}

/** 하루를 시각표대로 펼친다 */
function director(s: ReefState) {
  const r = s.res!, pt = s.pt, d = STAGES[s.stage];
  if (pt === T_DROP) {
    const sp = r.add;
    if (sp >= 0) {
      const k = Math.min(SP[sp].cap, s.prev.n[sp] + SP[sp].k) - s.prev.n[sp];
      for (let j = 0; j < k; j++) {
        const e = mkEnt(s, sp, s.dropX + (j - (k - 1) / 2) * 0.07, -0.06 - j * 0.05);
        if (planted(sp)) (e.x = s.dropX + (j - (k - 1) / 2) * 0.07), (e.y = -0.06);
        e.drop = 1;
        e.born = s.t;
        e.joy = 90;
      }
      ev(s, 'splash', s.dropX, 0.02, '퐁당!', '#ffffff', k);
      say(s, `${SP[sp].name}${k > 1 ? ` ${k}마리` : ''} 퐁당!`, '#ffffff');
    }
    assignHomes(s);
  }
  if (pt === T_HUG && r.add === CLOWN && r.hugC >= 3) {
    for (const e of alive(s, CLOWN)) if (e.mode === 1) (e.joy = 120), ev(s, 'heart', e.x, e.y - 0.04);
    wow(s, '쏙쏙쏙! 말미잘에 폭 안겼어요');
    say(s, `흰동가리 ${r.hugC}마리가 말미잘에 쏙`, '#ffd6e6');
    setMood(s, 'love');
  }
  if (pt === T_SICKIN && r.sickIn) {
    const c = alive(s, CLOWN).filter((e) => !e.sick);
    const v = c[c.length - 1];
    if (v) (v.sick = true), ev(s, 'sick', v.x, v.y, '콜록… 아픈 흰동가리!', '#c8f7a6');
    see(s, 'sickIn', '아픈 물고기는 숨지 못해요 — 날마다 옆으로 옮아요');
    say(s, '아픈 흰동가리가 생겼어요', '#dfffb0');
    assignHomes(s);
  }
  if (pt === T_SWEEP && r.cur) {
    ev(s, 'current', 0.5, 0.45, '휘이잉~ 해류!', '#e3f7ff');
    const free = alive(s, HORSE).filter((e) => e.mode !== 3);
    for (let j = 0; j < r.swept && j < free.length; j++) (free[j].die = s.t + j * 6), (free[j].how = 'swept'), ev(s, 'swept', free[j].x, free[j].y, '으아아~', '#ffffff');
    say(s, r.swept ? `해류! 해마 ${r.swept}마리 떠내려감` : '해류! 먹이를 실어 왔어요', r.swept ? '#ffd0c8' : '#d6f3ff');
    see(s, 'curSeen', '');
  }
  if (pt === T_HUNT && s.eco.n[SHARK] > 0) {
    const fish = [...alive(s, CLOWN), ...alive(s, HORSE)];
    const hid = fish.filter((e) => e.mode !== 0).length;
    for (const e of fish) e.scare = 50;
    ev(s, 'shark', 0.5, 0.35, r.night ? '밤 사냥!' : '상어다!', '#ffe0e0');
    if (hid >= 3) (wow(s, `다들 쏙! ${hid}마리가 숨었어요`, '#d6f3ff'), setMood(s, 'scared'));
    see(s, 'hunt', '상어는 숨을 곳 밖의 물고기를 먹어요 — 너무 많을 땐 고마운 손님');
    say(s, r.eat.length ? `상어가 ${r.eat.length}마리 꿀꺽${r.eatSick ? ' (아픈 물고기부터)' : ''}` : r.hungry ? '숨어서 무사! 상어는 먹이를 먹었어요' : '숨어서 다들 무사!', r.eat.length ? '#ffd0c8' : '#c9ffd8');
  }
  if (r.eat.length && pt >= T_HUNT + 14) {
    const j = Math.floor((pt - T_HUNT - 14) / 12);
    if ((pt - T_HUNT - 14) % 12 === 0 && j < r.eat.length) {
      const sp = r.eat[j];
      const pool = alive(s, sp).filter((e) => (j < r.eatSick ? e.sick : e.mode === 0 && !e.sick));
      const v = pool[0] ?? alive(s, sp)[0];
      if (v) {
        v.die = s.t;
        v.how = 'eat';
        ev(s, 'gulp', v.x, v.y, '꿀꺽!', '#ffffff');
      }
      if (j === r.eat.length - 1) setMood(s, 'gulp');
    }
  }
  if (pt === T_HUNT + 20 && r.hungry) ev(s, 'hungry', 0.5, 0.4, '배고픈 상어 — 먹이 -' + r.hungry * 2, '#ffd6a8');
  if (pt === T_METER) {
    if (r.plank > 0) ev(s, 'plank', 0.5, 0.15, '', '#fff3a8', r.plank);
    say(s, `먹이 ${sgn(r.food - r.food0)} · 맑기 ${sgn(r.clar - r.clar0)}`, '#fff3a8');
    if (r.clean > 0) for (const e of s.ents) if (e.die < 0 && (e.sp === SNAIL || e.sp === URCHIN || e.sp === CRAB)) ev(s, 'clean', e.x, e.y);
    if (r.clar - r.clar0 >= 2 && r.clar >= 8) wow(s, '반짝반짝! 물이 맑아졌어요', '#dff9ff');
    if (r.clar <= 3 && !r.fail) see(s, 'murk', '물이 탁해요! 달팽이·게·성게가 이끼를 먹어요');
    if (r.food <= 2 && !r.fail) see(s, 'hunger', '먹이가 모자라요! 해초가 먹이를 키워요');
  }
  if (pt === T_CORAL) {
    if (r.grow) {
      const e = mkEnt(s, CORAL, 0.5, 0.9);
      e.born = s.t;
      ev(s, 'grow', e.x, e.y - 0.05, '산호 쑥!', '#ffd6e6');
      say(s, '맑은 물에 산호가 쑥!', '#ffd6e6');
      see(s, 'grow', '');
    }
    const cs = alive(s, CORAL);
    for (let j = 0; j < r.bleach + r.nibble && j < cs.length; j++) {
      const v = cs[cs.length - 1 - j];
      v.die = s.t + j * 8;
      v.how = j < r.bleach ? 'bleach' : 'nibble';
      ev(s, 'coralLost', v.x, v.y - 0.05, j < r.bleach ? '하얗게 시들었어요' : '갉갉… 성게가!', '#ffe0e0');
    }
    if (r.nibble) see(s, 'nibble', '성게는 이끼가 없으면 산호를 갉아요');
    if (r.bleach) say(s, '탁한 물에 산호가 시들었어요', '#ffd0c8');
    if (r.nibble) say(s, `성게가 산호 ${r.nibble}개를 갉았어요`, '#ffd0c8');
    if (r.bleach || r.nibble) assignHomes(s);
  }
  if (pt === T_SICK && (r.spread || r.cured)) {
    const c = alive(s, CLOWN);
    for (let j = 0; j < r.spread; j++) {
      const v = c.find((e) => !e.sick);
      if (v) (v.sick = true), ev(s, 'sick', v.x, v.y, '옮았다…', '#c8f7a6');
    }
    for (let j = 0; j < r.cured; j++) {
      const v = c.find((e) => e.sick);
      if (v) (v.sick = false), (v.joy = 90), ev(s, 'cure', v.x, v.y, '나았다!', '#c9ffd8');
    }
    if (r.cured >= 2) wow(s, `새우 의사 출동! ${r.cured}마리 나았어요`, '#e6ffe6');
    if (r.spread) say(s, '병이 옆 물고기에게 옮았어요', '#dfffb0');
    if (r.cured) say(s, `새우가 ${r.cured}마리를 고쳤어요`, '#c9ffd8');
    assignHomes(s);
  }
  if (pt === T_BABY && r.babies[0] + r.babies[1] > 0) {
    const nb = r.babies[0] + r.babies[1];
    for (let j = 0; j < 2; j++)
      for (let b = 0; b < r.babies[j]; b++) {
        const sp = j ? HORSE : CLOWN, par = alive(s, sp).filter((e) => e.mode !== 0);
        const p = par[(b * 2) % Math.max(1, par.length)];
        const e = mkEnt(s, sp, p ? p.x : 0.5, p ? p.y : 0.4);
        e.baby = 240;
        e.joy = 120;
        ev(s, 'baby', e.x, e.y - 0.03, '', SP[sp].col);
      }
    assignHomes(s);
    if (nb >= 2 || !s.babyEver) wow(s, nb >= 2 ? `아기 ${nb}마리 뽀글뽀글!` : '첫 아기가 태어났어요!', '#ffe6f0');
    s.babyEver = true;
    say(s, `아기 ${nb}마리가 태어났어요`, '#ffd6e6');
    see(s, 'baby', '');
    setMood(s, 'love');
  }
  if (pt === T_FAIL && r.fail) {
    ev(s, 'fail', 0.5, 0.45, r.fail, '#ffd0c8');
    say(s, r.fail + '!', '#ffb4a8');
    setMood(s, 'dizzy');
    if (r.fail.startsWith('먹이')) for (const e of [...alive(s, CLOWN), ...alive(s, HORSE)]) (e.die = s.t + (e.id % 5) * 4), (e.how = 'belly');
  }
  if (pt >= T_END) endDay(s);
  void d;
}

function endDay(s: ReefState) {
  const d = STAGES[s.stage];
  if (!s.eco.fail) reconcile(s);
  if (s.eco.fail) return finishStage(s, false, s.eco.fail);
  if (s.day + 1 >= d.days) return finishStage(s, starMet(s.eco, d.stars[0]), `목표를 못 이뤘어요 — ${d.stars[0].label}`);
  s.day++;
  s.phase = 'pick';
  s.pt = 0;
  if (isNight(d, s.day)) see(s, 'night', '');
  if (d.current.includes(s.day)) see(s, 'current', '');
}

function finishStage(s: ReefState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s.eco, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (s.stage + 1);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.45, `${d.name} 성공!`, '#fff1a8', s.got);
    if (s.got >= 3) wow(s, '별 셋! 완벽한 어항', '#fff3a8');
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'lose', 0.5, 0.45, why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

export const reeftank: GameDef<ReefState> = {
  id: 'reeftank',
  name: '작은 어항 생태계',
  genes: ['ecosystem', 'idle', 'pointer'],
  twist: '작은 상어를 넣어야 어항이 산다 — 아기가 쏟아져 먹이가 바닥나기 전에 숨을 곳 밖의 녀석만 솎아 주니, 말미잘·산호로 숨을 곳을 먼저 만들면 무서운 상어가 고마운 손님이 된다',
  rules: [
    '날마다 생물 카드 하나를 톡 → 어항에 퐁당, 그 하루가 저절로 흘러요.',
    '서로 먹고·숨고·청소해요. 먹이나 물 맑기가 바닥나면 실패(하트 -1).',
    '날이 다 지나면 목표를 봐요 — 내일 카드를 보고 순서를 정해요.',
  ],
  controls: 'touch',
  hint: '아래 생물 카드를 톡! / ← →로 고르고 스페이스(또는 1 2 3)',
  aspect: A,
  art: {
    concept: '햇살 드는 창가의 작은 바다 어항 — 손으로 그린 바다 친구들의 하루',
    mood: '투명한 청록 물에 햇살 줄기가 일렁이고, 모래 무늬와 층진 바위 사이로 흰동가리가 말미잘에 폭 안긴다. 카드를 톡 하면 퐁당 — 하루가 저절로 흐르며 서로 먹고 숨고 청소하고 아기를 낳는다.',
    palette: { bg: '#bfeff5', ink: '#1d3a4a', muted: '#6c8fa0', accent: '#ffb02e', hot: '#ff5f6d', soft: '#e8fbff' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.eco.n.reduce((a, v) => a + v, 0),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'pick', pt: 0,
      eco: startEco(STAGES[0]), prev: startEco(STAGES[0]), res: null, day: 0, deck: [], pickI: -1, dropX: 0.5,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      down: false, ax: 0, ay: 0, kc: 0, kbd: false, lastDir: 0, taps: 0, firstTap: -1, miss: -99,
      log: [], ents: [], nid: 1, wowN: 0, band: null, babyEver: false,
      seen: new Set<string>(), newsQ: [], news: null, banner: 0, events: [], mood: 'idle', moodT: 0,
    } as ReefState;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null, tap = !!p && !s.down;
    s.down = !!p;
    if (p) (s.ax = p.x), (s.ay = p.y);
    if (inp.dir !== 0 && s.lastDir === 0) (s.kc = (s.kc + inp.dir + 3) % 3), (s.kbd = true);
    s.lastDir = inp.dir;
    let pick = -1;
    if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < 3) pick = inp.pick;
    else if (tap && p) {
      const c = cardAt(p.x, p.y * A);
      if (c >= 0) pick = c;
      else if (s.kbd) pick = s.kc;
      else if (s.phase === 'pick') s.miss = s.t;
    }
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'cheer' || s.mood === 'dizzy' ? 400 : 110)) s.mood = 'idle';
    animate(s);
    if (s.phase === 'pick') {
      if (pick >= 0 && s.pt >= DEAL) startDay(s, pick);
      return;
    }
    if (s.phase === 'day') return director(s);
    // 결과 화면
    if (s.pt >= (s.ok ? RES_OK : RES_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else s.stage++, newStage(s, false);
      } else if (s.hearts <= 0) s.dead = true;
      else newStage(s, true);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const atCard = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: cardCX(i), y: (CY0 + CY1) / 2 / A } });
const ready = (s: ReefState, wait: number) => s.phase === 'pick' && !s.down && s.pt >= Math.max(DEAL, wait);
const brain = new WeakMap<object, { key: string; m: number }>();
/** 잘하는 봇: 오늘 카드 셋 × 내일 카드 셋(화면에 보임)을 다 해 보고, 나머지 날은 아무것도 안 넣고 흘려 본다 */
export const reeftankSmart: Bot<ReefState> = {
  name: '어항 박사',
  act(s) {
    if (!ready(s, 24)) return NO;
    const key = `${s.stage}:${s.tries}:${s.day}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, m: planPick(STAGES[s.stage], s.eco, s.day, s.deck.slice(0, s.day + 2)) }));
    return atCard(m.m);
  },
};
/** 버릇 봇: 늘 가장 큰 생물 */
export const reeftankHabit: Bot<ReefState> = {
  name: '버릇: 늘 가장 큰 생물',
  act(s) {
    if (!ready(s, 24)) return NO;
    const c = s.deck[s.day];
    let b = 0;
    c.forEach((sp, i) => SP[sp].size > SP[c[b]].size && (b = i));
    return atCard(b);
  },
};
/** 독립 버릇 봇: 늘 맨 왼쪽(처음) 카드 */
export const reeftankHabit2: Bot<ReefState> = {
  name: '버릇: 늘 처음 카드',
  act(s) {
    return ready(s, 24) ? atCard(0) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 카드(가끔 화면 아무 데나) */
export const reeftankRandom: Bot<ReefState> = {
  name: '아무 카드나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.25) m.p = { x: rng(), y: rng() };
    else {
      const i = Math.floor(rng() * 3);
      m.p = { x: cardCX(i) + (rng() - 0.5) * 0.2, y: ((CY0 + CY1) / 2 + (rng() - 0.5) * 0.2) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기: 바다 친구들 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - cl01(q), 2.4);
const back = (q: number) => {
  const x = cl01(q), c = 1.9;
  return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
};
const INK = 'rgba(28,58,84,.88)';
type Ctx = CanvasRenderingContext2D;
function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function ink(ctx: Ctx, lw: number) {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, lw);
  ctx.stroke();
}
interface Face { look?: number; scared?: boolean; happy?: boolean; sleepy?: boolean; dizzy?: boolean; t?: number }
function eye(ctx: Ctx, x: number, y: number, r: number, f: Face, lid = '#ff8a3d') {
  if (f.happy) {
    ctx.beginPath();
    ctx.arc(x, y + r * 0.25, r * 0.75, Math.PI * 1.1, Math.PI * 1.9);
    ink(ctx, r * 0.45);
    return;
  }
  if (f.dizzy) {
    ctx.beginPath();
    for (let k = 0; k < 14; k++) {
      const a = k * 0.9 + (f.t ?? 0) * 0.2, rr = (r * k) / 14;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ink(ctx, r * 0.22);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = k * 0.85 + (f.t ?? 0) * 0.25, rr = (r * 0.8 * k) / 16;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ink(ctx, r * 0.18);
    return;
  }
  const rr = f.scared ? r * 1.2 : r;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, rr, 0, TAU);
  ctx.fill();
  ink(ctx, r * 0.22);
  const pr = f.scared ? r * 0.38 : r * 0.58, lx = (f.look ?? 0.25) * r * 0.35;
  ctx.fillStyle = '#16283a';
  ctx.beginPath();
  ctx.arc(x + lx, y + r * 0.05, pr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + lx + pr * 0.35, y - pr * 0.35, pr * 0.38, 0, TAU);
  ctx.fill();
  if (f.sleepy) {
    ctx.fillStyle = lid;
    ctx.beginPath();
    ctx.arc(x, y, rr + 0.5, Math.PI, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - rr, y);
    ctx.lineTo(x + rr, y);
    ink(ctx, r * 0.25);
  }
}
function blush(ctx: Ctx, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(255,110,140,.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.6, 0, 0, TAU);
  ctx.fill();
}

/** 흰동가리: 주황 몸에 흰 띠 셋, 큰 눈. 오른쪽을 본다 */
function drawClown(ctx: Ctx, x: number, y: number, L: number, face: number, t: number, o: { sick?: boolean; scared?: boolean; joy?: boolean; belly?: boolean; ph: number; dizzy?: boolean }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, o.belly ? -1 : 1);
  const hl = L / 2, hh = L * 0.28, wag = Math.sin(t * (o.scared ? 0.7 : 0.32) + o.ph) * 0.3;
  const c0 = o.sick ? '#d6e88a' : '#ffb24a', c1 = o.sick ? '#9fc25a' : '#ff6a13';
  // 그림자
  // 꼬리
  ctx.save();
  ctx.translate(-hl * 0.78, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(L * 0.05, 0);
  ctx.quadraticCurveTo(-L * 0.12, -hh * 1.25, -L * 0.27, -hh * 0.95);
  ctx.quadraticCurveTo(-L * 0.2, 0, -L * 0.27, hh * 0.95);
  ctx.quadraticCurveTo(-L * 0.12, hh * 1.25, L * 0.05, 0);
  ctx.fillStyle = c1;
  ctx.fill();
  ink(ctx, L * 0.035);
  ctx.beginPath();
  ctx.moveTo(-L * 0.24, -hh * 0.9);
  ctx.quadraticCurveTo(-L * 0.18, 0, -L * 0.24, hh * 0.9);
  ctx.strokeStyle = '#1c2630';
  ctx.lineWidth = L * 0.03;
  ctx.stroke();
  ctx.restore();
  // 등지느러미
  ctx.beginPath();
  ctx.moveTo(-hl * 0.45, -hh * 0.85);
  ctx.quadraticCurveTo(-hl * 0.1, -hh * 1.75 - Math.sin(t * 0.2 + o.ph) * hh * 0.1, hl * 0.25, -hh * 0.92);
  ctx.fillStyle = c1;
  ctx.fill();
  ink(ctx, L * 0.03);
  // 몸
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(hl, hh * 0.05);
    ctx.bezierCurveTo(hl * 1.02, -hh * 1.25, -hl * 0.55, -hh * 1.2, -hl * 0.86, 0);
    ctx.bezierCurveTo(-hl * 0.55, hh * 1.2, hl * 1.02, hh * 1.25, hl, hh * 0.05);
  };
  body();
  ctx.fillStyle = lin(ctx, 0, -hh, 0, hh, [[0, c0], [1, c1]]);
  ctx.fill();
  ctx.save();
  body();
  ctx.clip();
  for (const [bx, bw] of [[hl * 0.42, L * 0.1], [-hl * 0.12, L * 0.12], [-hl * 0.66, L * 0.08]] as [number, number][]) {
    ctx.fillStyle = '#1c2630';
    ctx.beginPath();
    ctx.ellipse(bx, 0, bw * 0.5 + L * 0.025, hh * 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(bx, 0, bw * 0.5, hh * 1.4, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(hl * 0.05, -hh * 0.55, hl * 0.55, hh * 0.22, -0.08, 0, TAU);
  ctx.fill();
  if (o.sick) {
    ctx.fillStyle = 'rgba(110,160,40,.55)';
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc(-hl * 0.5 + k * hl * 0.35, hh * (k % 2 ? 0.3 : -0.25), L * 0.035, 0, TAU), ctx.fill());
  }
  ctx.restore();
  body();
  ink(ctx, L * 0.04);
  // 가슴지느러미 (파닥)
  ctx.save();
  ctx.translate(hl * 0.12, hh * 0.35);
  ctx.rotate(0.5 + Math.sin(t * (o.scared ? 0.9 : 0.4) + o.ph) * 0.45);
  ctx.beginPath();
  ctx.ellipse(-L * 0.06, 0, L * 0.09, L * 0.045, 0, 0, TAU);
  ctx.fillStyle = c1;
  ctx.fill();
  ink(ctx, L * 0.025);
  ctx.restore();
  // 눈·입
  eye(ctx, hl * 0.52, -hh * 0.2, L * 0.095, { scared: o.scared, happy: o.joy && !o.scared, sleepy: o.sick, dizzy: o.dizzy || o.belly, t, look: 0.4 }, c0);
  ctx.beginPath();
  if (o.scared) ctx.arc(hl * 0.86, hh * 0.32, L * 0.03, 0, TAU);
  else ctx.arc(hl * 0.8, hh * 0.22, L * 0.05, 0.2, Math.PI * 0.8);
  ink(ctx, L * 0.025);
  if (o.joy) blush(ctx, hl * 0.48, hh * 0.38, L * 0.05);
  ctx.restore();
}

/** 해마: 꼿꼿이 서서 꼬리를 말았다. 오른쪽을 본다 */
function drawHorse(ctx: Ctx, x: number, y: number, H: number, face: number, t: number, o: { scared?: boolean; joy?: boolean; ph: number; dizzy?: boolean }) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.05 + o.ph) * H * 0.03);
  ctx.scale(face, 1);
  const c0 = '#ffe07a', c1 = '#ffa62b';
  // 꼬리 (말린)
  ctx.beginPath();
  ctx.moveTo(-H * 0.02, H * 0.12);
  ctx.bezierCurveTo(-H * 0.12, H * 0.34, H * 0.02, H * 0.5, H * 0.1, H * 0.42);
  ctx.bezierCurveTo(H * 0.17, H * 0.36, H * 0.12, H * 0.28, H * 0.05, H * 0.32);
  ctx.strokeStyle = INK;
  ctx.lineWidth = H * 0.115;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.strokeStyle = c1;
  ctx.lineWidth = H * 0.075;
  ctx.stroke();
  // 등지느러미 (파르르)
  ctx.save();
  ctx.translate(-H * 0.13, -H * 0.02);
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.1);
  ctx.quadraticCurveTo(-H * (0.13 + 0.03 * Math.sin(t * 0.6 + o.ph)), 0, 0, H * 0.1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,240,190,.9)';
  ctx.fill();
  ink(ctx, H * 0.02);
  ctx.restore();
  // 몸통
  ctx.beginPath();
  ctx.moveTo(H * 0.06, -H * 0.22);
  ctx.bezierCurveTo(H * 0.2, -H * 0.12, H * 0.16, H * 0.1, H * 0.02, H * 0.17);
  ctx.bezierCurveTo(-H * 0.1, H * 0.2, -H * 0.17, H * 0.0, -H * 0.12, -H * 0.15);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -H * 0.15, 0, H * 0.18, 0, [[0, c1], [0.6, c0], [1, '#fff3c0']]);
  ctx.fill();
  ink(ctx, H * 0.03);
  ctx.strokeStyle = 'rgba(200,110,20,.6)';
  ctx.lineWidth = H * 0.015;
  for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc(H * 0.02, -H * 0.12 + k * H * 0.075, H * 0.1, -0.3, 0.6), ctx.stroke());
  // 머리 + 볏 + 주둥이
  ctx.save();
  ctx.translate(H * 0.02, -H * 0.27);
  ctx.beginPath();
  ctx.moveTo(-H * 0.06, -H * 0.06);
  ctx.lineTo(-H * 0.02, -H * 0.15);
  ctx.lineTo(H * 0.03, -H * 0.07);
  ctx.closePath();
  ctx.fillStyle = c1;
  ctx.fill();
  ink(ctx, H * 0.02);
  ctx.beginPath();
  ctx.ellipse(H * 0.14, H * 0.03, H * 0.12, H * 0.045, 0.32, 0, TAU);
  ctx.fillStyle = c0;
  ctx.fill();
  ink(ctx, H * 0.025);
  ctx.beginPath();
  ctx.arc(0, 0, H * 0.105, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -H * 0.1, 0, H * 0.1, [[0, '#ffe58f'], [1, c1]]);
  ctx.fill();
  ink(ctx, H * 0.03);
  eye(ctx, H * 0.025, -H * 0.01, H * 0.05, { scared: o.scared, happy: o.joy && !o.scared, dizzy: o.dizzy, t, look: 0.5 }, c0);
  if (o.joy) blush(ctx, H * 0.05, H * 0.06, H * 0.03);
  ctx.restore();
  ctx.restore();
}

/** 작은 상어: 귀여운 큰 머리, 웃는 입 (꿀꺽하면 입을 쩍) */
function drawShark(ctx: Ctx, x: number, y: number, L: number, face: number, t: number, o: { open?: number; smug?: boolean; hungry?: boolean; ph: number; sleepy?: boolean }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const hl = L / 2, hh = L * 0.2, wag = Math.sin(t * 0.18 + o.ph) * 0.22;
  // 꼬리
  ctx.save();
  ctx.translate(-hl * 0.8, 0);
  ctx.rotate(wag);
  ctx.beginPath();
  ctx.moveTo(L * 0.04, 0);
  ctx.quadraticCurveTo(-L * 0.08, -hh * 0.6, -L * 0.2, -hh * 1.5);
  ctx.quadraticCurveTo(-L * 0.12, -hh * 0.2, -L * 0.15, hh * 1.0);
  ctx.quadraticCurveTo(-L * 0.06, hh * 0.4, L * 0.04, 0);
  ctx.fillStyle = '#7d96aa';
  ctx.fill();
  ink(ctx, L * 0.022);
  ctx.restore();
  // 등지느러미
  ctx.beginPath();
  ctx.moveTo(-hl * 0.2, -hh * 0.85);
  ctx.quadraticCurveTo(-hl * 0.05, -hh * 2.0, -hl * 0.35, -hh * 2.05);
  ctx.quadraticCurveTo(-hl * 0.35, -hh * 1.3, -hl * 0.55, -hh * 0.7);
  ctx.fillStyle = '#7d96aa';
  ctx.fill();
  ink(ctx, L * 0.022);
  // 몸
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(hl, hh * 0.1);
    ctx.bezierCurveTo(hl * 1.0, -hh * 1.25, -hl * 0.4, -hh * 1.05, -hl * 0.85, -hh * 0.05);
    ctx.bezierCurveTo(-hl * 0.4, hh * 1.0, hl * 0.95, hh * 1.25, hl, hh * 0.1);
  };
  body();
  ctx.fillStyle = lin(ctx, 0, -hh, 0, hh, [[0, '#9fb6c8'], [0.55, '#8aa3b7'], [0.56, '#eef4f7'], [1, '#dfe9ef']]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.3)';
  ctx.beginPath();
  ctx.ellipse(hl * 0.1, -hh * 0.6, hl * 0.5, hh * 0.18, -0.05, 0, TAU);
  ctx.fill();
  body();
  ink(ctx, L * 0.025);
  // 아가미
  ctx.strokeStyle = 'rgba(40,70,95,.5)';
  ctx.lineWidth = L * 0.012;
  for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.arc(hl * 0.25 - k * L * 0.025, 0, hh * 0.45, -0.9, 0.5), ctx.stroke());
  // 가슴지느러미
  ctx.beginPath();
  ctx.moveTo(hl * 0.1, hh * 0.55);
  ctx.quadraticCurveTo(-hl * 0.05, hh * 1.6 + Math.sin(t * 0.2 + o.ph) * hh * 0.2, -hl * 0.22, hh * 1.5);
  ctx.quadraticCurveTo(-hl * 0.1, hh * 0.9, -hl * 0.05, hh * 0.5);
  ctx.fillStyle = '#8aa3b7';
  ctx.fill();
  ink(ctx, L * 0.02);
  // 눈
  eye(ctx, hl * 0.6, -hh * 0.3, L * 0.05, { sleepy: o.sleepy || o.smug, look: 0.6, t }, '#9fb6c8');
  // 입
  const op = o.open ?? 0;
  if (op > 0.05) {
    ctx.beginPath();
    ctx.moveTo(hl * 0.92, hh * 0.15);
    ctx.quadraticCurveTo(hl * 0.6, hh * (0.4 + op * 0.9), hl * 0.4, hh * 0.35);
    ctx.quadraticCurveTo(hl * 0.65, hh * 0.2, hl * 0.92, hh * 0.15);
    ctx.fillStyle = '#7a2638';
    ctx.fill();
    ink(ctx, L * 0.018);
    ctx.fillStyle = '#ffffff';
    for (let k = 0; k < 3; k++) {
      const tx = hl * (0.5 + k * 0.13);
      ctx.beginPath();
      ctx.moveTo(tx, hh * 0.22);
      ctx.lineTo(tx + L * 0.012, hh * 0.36);
      ctx.lineTo(tx + L * 0.024, hh * 0.22);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(hl * 0.45, hh * 0.3);
    ctx.quadraticCurveTo(hl * 0.7, hh * (o.hungry ? 0.2 : 0.55), hl * 0.92, hh * 0.18);
    ink(ctx, L * 0.018);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(hl * 0.62, hh * 0.42);
    ctx.lineTo(hl * 0.66, hh * 0.58);
    ctx.lineTo(hl * 0.7, hh * 0.42);
    ctx.fill();
  }
  if (o.smug) blush(ctx, hl * 0.55, hh * 0.25, L * 0.03);
  ctx.restore();
}

/** 달팽이: 유리에 붙어 기어간다 */
function drawSnail(ctx: Ctx, x: number, y: number, S: number, face: number, t: number, ph: number, joy: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const st = Math.sin(t * 0.08 + ph) * S * 0.03;
  // 몸 (발)
  ctx.beginPath();
  ctx.moveTo(-S * 0.5, S * 0.18);
  ctx.quadraticCurveTo(-S * 0.1, S * 0.3, S * 0.45 + st, S * 0.16);
  ctx.quadraticCurveTo(S * 0.6, S * 0.0, S * 0.45, -S * 0.12);
  ctx.quadraticCurveTo(S * 0.15, -S * 0.02, -S * 0.5, S * 0.18);
  ctx.fillStyle = lin(ctx, 0, -S * 0.1, 0, S * 0.3, [[0, '#ffe2b0'], [1, '#e8b678']]);
  ctx.fill();
  ink(ctx, S * 0.05);
  // 더듬이
  for (const k of [0, 1]) {
    ctx.beginPath();
    ctx.moveTo(S * (0.42 + k * 0.05), -S * 0.08);
    const tx = S * (0.5 + k * 0.14), ty = -S * (0.38 + 0.03 * Math.sin(t * 0.1 + k + ph));
    ctx.lineTo(tx, ty);
    ink(ctx, S * 0.05);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(tx, ty, S * 0.075, 0, TAU);
    ctx.fill();
    ink(ctx, S * 0.03);
    ctx.fillStyle = '#16283a';
    ctx.beginPath();
    ctx.arc(tx + S * 0.02, ty, S * 0.04, 0, TAU);
    ctx.fill();
  }
  // 껍데기
  ctx.beginPath();
  ctx.arc(-S * 0.05, -S * 0.12, S * 0.34, 0, TAU);
  ctx.fillStyle = rad(ctx, -S * 0.15, -S * 0.25, S * 0.05, S * 0.4, [[0, '#ffd08a'], [0.6, '#e8964a'], [1, '#b8642c']]);
  ctx.fill();
  ink(ctx, S * 0.05);
  ctx.beginPath();
  for (let k = 0; k < 26; k++) {
    const a = k * 0.42, r = S * 0.3 * (1 - k / 30);
    ctx.lineTo(-S * 0.05 + Math.cos(a) * r * 0.9, -S * 0.12 + Math.sin(a) * r * 0.9);
  }
  ctx.strokeStyle = 'rgba(120,60,20,.55)';
  ctx.lineWidth = S * 0.04;
  ctx.stroke();
  if (joy) blush(ctx, S * 0.42, S * 0.1, S * 0.07);
  ctx.restore();
}

/** 게: 모래 위 옆걸음, 집게를 번쩍 */
function drawCrab(ctx: Ctx, x: number, y: number, S: number, t: number, ph: number, o: { joy?: boolean; scared?: boolean; night?: boolean }) {
  ctx.save();
  ctx.translate(x, y);
  const step = Math.sin(t * 0.3 + ph);
  // 다리
  ctx.strokeStyle = '#d2412f';
  ctx.lineWidth = S * 0.06;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1])
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(sx * S * 0.25, S * 0.05 + k * S * 0.06);
      ctx.lineTo(sx * S * (0.45 + k * 0.03), S * (0.12 + k * 0.08) + (k % 2 ? step : -step) * S * 0.04);
      ctx.lineTo(sx * S * (0.5 + k * 0.03), S * (0.26 + k * 0.05));
      ctx.stroke();
    }
  // 집게
  for (const sx of [-1, 1]) {
    const up = (o.joy ? 0.25 : 0) + Math.sin(t * 0.12 + ph + sx) * 0.08;
    ctx.save();
    ctx.translate(sx * S * 0.32, -S * 0.08);
    ctx.rotate(sx * (-0.6 - up));
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -S * 0.22);
    ctx.strokeStyle = INK;
    ctx.lineWidth = S * 0.1;
    ctx.stroke();
    ctx.strokeStyle = '#ef5b4b';
    ctx.lineWidth = S * 0.065;
    ctx.stroke();
    ctx.translate(0, -S * 0.3);
    const snap = 0.35 + 0.25 * Math.abs(Math.sin(t * 0.15 + ph));
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.13, -Math.PI / 2 + snap, Math.PI * 1.5 - snap);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -S * 0.13, 0, S * 0.13, [[0, '#ff8a6e'], [1, '#e2412f']]);
    ctx.fill();
    ink(ctx, S * 0.04);
    ctx.restore();
  }
  // 몸
  ctx.beginPath();
  ctx.ellipse(0, S * 0.05, S * 0.34, S * 0.22, 0, 0, TAU);
  ctx.fillStyle = lin(ctx, 0, -S * 0.17, 0, S * 0.27, [[0, '#ff8a6e'], [0.6, '#ef5b4b'], [1, '#c8392a']]);
  ctx.fill();
  ink(ctx, S * 0.045);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.beginPath();
  ctx.ellipse(-S * 0.08, -S * 0.04, S * 0.14, S * 0.06, -0.2, 0, TAU);
  ctx.fill();
  // 눈자루
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * S * 0.1, -S * 0.12);
    ctx.lineTo(sx * S * 0.13, -S * 0.3);
    ink(ctx, S * 0.05);
    eye(ctx, sx * S * 0.13, -S * 0.33, S * 0.08, { scared: o.scared, happy: o.joy, t, look: sx * 0.3 }, '#ef5b4b');
  }
  ctx.beginPath();
  ctx.arc(0, S * 0.08, S * 0.07, 0.15, Math.PI - 0.15);
  ink(ctx, S * 0.035);
  if (o.night) {
    ctx.fillStyle = 'rgba(255,240,150,.5)';
    ctx.beginPath();
    ctx.arc(0, -S * 0.5, S * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 성게: 뾰족뾰족 보라 공, 조그만 눈 */
function drawUrchin(ctx: Ctx, x: number, y: number, S: number, t: number, ph: number, munch: boolean) {
  ctx.save();
  ctx.translate(x, y);
  const r = S * 0.3;
  ctx.strokeStyle = '#4a2f86';
  ctx.lineCap = 'round';
  for (let k = 0; k < 22; k++) {
    const a = (k / 22) * TAU + Math.sin(t * 0.05 + k + ph) * 0.05;
    if (Math.sin(a) > 0.55) continue;
    ctx.lineWidth = S * 0.045;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
    ctx.lineTo(Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.4, r * 0.1, r * 1.1, [[0, '#b892ff'], [0.6, '#7a54c4'], [1, '#4a2f86']]);
  ctx.fill();
  ink(ctx, S * 0.04);
  eye(ctx, -r * 0.35, -r * 0.05, r * 0.22, { happy: !munch, t }, '#7a54c4');
  eye(ctx, r * 0.35, -r * 0.05, r * 0.22, { happy: !munch, t }, '#7a54c4');
  ctx.beginPath();
  if (munch) ctx.arc(0, r * 0.4, r * 0.18 * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.4))), 0, TAU);
  else ctx.arc(0, r * 0.3, r * 0.15, 0.2, Math.PI - 0.2);
  ink(ctx, S * 0.035);
  ctx.restore();
}

/** 청소 새우: 빨강·흰 줄무늬, 긴 더듬이 */
function drawShrimp(ctx: Ctx, x: number, y: number, S: number, face: number, t: number, ph: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = S * 0.025;
  for (const k of [0, 1]) {
    ctx.beginPath();
    ctx.moveTo(S * 0.3, -S * 0.08);
    ctx.quadraticCurveTo(S * 0.7, -S * (0.5 + k * 0.15) + Math.sin(t * 0.1 + ph + k) * S * 0.08, S * 0.95, -S * (0.2 + k * 0.3));
    ctx.stroke();
  }
  for (let k = 0; k < 5; k++) {
    const a = -0.6 + k * 0.32, rr = S * (0.28 - k * 0.025);
    ctx.beginPath();
    ctx.arc(S * 0.1 - k * S * 0.13, Math.sin(a) * S * 0.08 + k * S * 0.02, rr, 0, TAU);
    ctx.fillStyle = k % 2 ? '#ffffff' : '#ff5a6e';
    ctx.fill();
    ink(ctx, S * 0.03);
  }
  ctx.beginPath();
  ctx.moveTo(-S * 0.5, S * 0.05);
  ctx.lineTo(-S * 0.72, -S * 0.12);
  ctx.lineTo(-S * 0.72, S * 0.22);
  ctx.closePath();
  ctx.fillStyle = '#ff5a6e';
  ctx.fill();
  ink(ctx, S * 0.03);
  eye(ctx, S * 0.2, -S * 0.12, S * 0.09, { t, look: 0.6 }, '#ff5a6e');
  ctx.restore();
}

/** 말미잘: 일렁이는 촉수 (front: 앞쪽 촉수만 — 안긴 흰동가리 위에 덧그린다) */
function drawAnemone(ctx: Ctx, x: number, y: number, S: number, t: number, ph: number, front: boolean, hug: number) {
  ctx.save();
  ctx.translate(x, y);
  if (!front) {
    ctx.fillStyle = 'rgba(30,60,80,.22)';
    ctx.beginPath();
    ctx.ellipse(0, S * 0.02, S * 0.5, S * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-S * 0.3, 0);
    ctx.quadraticCurveTo(-S * 0.34, -S * 0.25, -S * 0.42, -S * 0.36);
    ctx.lineTo(S * 0.42, -S * 0.36);
    ctx.quadraticCurveTo(S * 0.34, -S * 0.25, S * 0.3, 0);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -S * 0.36, 0, 0, [[0, '#e88fd8'], [1, '#9c4fb8']]);
    ctx.fill();
    ink(ctx, S * 0.04);
  }
  const N = 13;
  for (let k = 0; k < N; k++) {
    const isFront = k % 3 === 1;
    if (isFront !== front) continue;
    const u = k / (N - 1) - 0.5, bx = u * S * 0.8;
    const sway = Math.sin(t * 0.045 + ph + k * 0.7) * S * 0.08 + (hug ? Math.sin(t * 0.1 + k) * S * 0.03 : 0);
    const tx = bx * 1.35 + sway, ty = -S * (0.75 + 0.18 * Math.cos(u * 3.2)) + Math.cos(t * 0.05 + k) * S * 0.03;
    ctx.beginPath();
    ctx.moveTo(bx, -S * 0.32);
    ctx.quadraticCurveTo(bx + sway * 0.4, -S * 0.55, tx, ty);
    ctx.strokeStyle = INK;
    ctx.lineWidth = S * 0.12;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = isFront ? '#f7a6e6' : '#de7fd2';
    ctx.lineWidth = S * 0.085;
    ctx.stroke();
    ctx.fillStyle = '#ffe1f6';
    ctx.beginPath();
    ctx.arc(tx, ty, S * 0.055, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

const CORAL_COL: [string, string][] = [['#ff8fb1', '#e2557f'], ['#ffad6b', '#e9763a'], ['#c59bff', '#8a5ad8'], ['#ff7f7f', '#d94a5a']];
/** 산호: 가지 산호 (자라기 g 0~1, 하얗게 w 0~1) */
function drawCoral(ctx: Ctx, x: number, y: number, S: number, t: number, v: number, g: number, wht: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(g, g);
  const [c0, c1] = CORAL_COL[v % CORAL_COL.length];
  const col = (c: string) => (wht > 0 ? mixC(c, '#f4f1ea', wht) : c);
  ctx.fillStyle = 'rgba(30,60,80,.2)';
  ctx.beginPath();
  ctx.ellipse(0, 0, S * 0.4, S * 0.08, 0, 0, TAU);
  ctx.fill();
  const br = (x0: number, y0: number, a: number, len: number, wd: number, dep: number, k: number) => {
    const sw = Math.sin(t * 0.02 + k) * 0.04;
    const x1 = x0 + Math.cos(a + sw) * len, y1 = y0 + Math.sin(a + sw) * len;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = wd + S * 0.035;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.strokeStyle = col(dep ? c0 : c1);
    ctx.lineWidth = wd;
    ctx.stroke();
    if (dep < 2) {
      br(x1, y1, a - 0.45 - hsh(k) * 0.2, len * 0.72, wd * 0.78, dep + 1, k * 3 + 1);
      br(x1, y1, a + 0.4 + hsh(k + 9) * 0.2, len * 0.68, wd * 0.78, dep + 1, k * 3 + 2);
    } else {
      ctx.fillStyle = col('#fff0f5');
      ctx.beginPath();
      ctx.arc(x1, y1, wd * 0.45, 0, TAU);
      ctx.fill();
    }
  };
  br(-S * 0.08, 0, -Math.PI / 2 - 0.35, S * 0.3, S * 0.13, 0, v * 7 + 1);
  br(S * 0.08, 0, -Math.PI / 2 + 0.3, S * 0.34, S * 0.14, 0, v * 7 + 4);
  ctx.restore();
}
function mixC(a: string, b: string, q: number) {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16)), pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * q)).join(',')})`;
}

/** 해초: 일렁이는 긴 잎 */
function drawWeed(ctx: Ctx, x: number, y: number, H: number, t: number, ph: number, cur: number) {
  ctx.save();
  ctx.translate(x, y);
  for (let k = 0; k < 4; k++) {
    const bx = (k - 1.5) * H * 0.06, len = H * (0.75 + 0.25 * hsh(k + ph * 10));
    const sw = Math.sin(t * 0.035 + ph + k * 0.9) * H * 0.12 + cur * H * 0.25;
    ctx.beginPath();
    ctx.moveTo(bx - H * 0.03, 0);
    ctx.bezierCurveTo(bx - H * 0.05 + sw * 0.3, -len * 0.35, bx + sw * 0.8 - H * 0.04, -len * 0.7, bx + sw, -len);
    ctx.bezierCurveTo(bx + sw * 0.8 + H * 0.05, -len * 0.7, bx + H * 0.06 + sw * 0.3, -len * 0.35, bx + H * 0.03, 0);
    ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, -len, 0, 0, [[0, '#9be86a'], [0.5, '#4fc36a'], [1, '#2f9a55']]);
    ctx.fill();
    ink(ctx, H * 0.012);
    ctx.beginPath();
    ctx.moveTo(bx, 0);
    ctx.bezierCurveTo(bx + sw * 0.3, -len * 0.35, bx + sw * 0.8, -len * 0.7, bx + sw, -len * 0.97);
    ctx.strokeStyle = 'rgba(230,255,200,.5)';
    ctx.lineWidth = H * 0.008;
    ctx.stroke();
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 장면 ─────────────────────────────
interface Fore { fail: string; dc: number; df: number }
const foreCache = new WeakMap<object, { key: string; f: Fore[] }>();
/** 카드마다 오늘 밤 예상 (맑기·먹이 변화, 위험) */
function forecast(s: ReefState): Fore[] {
  const key = `${s.stage}:${s.tries}:${s.day}`;
  const c = foreCache.get(s);
  if (c && c.key === key) return c.f;
  const d = STAGES[s.stage], cards = s.deck[s.day] ?? [];
  const f = cards.map((sp) => {
    const { e } = dayStep(d, s.eco, sp, s.day);
    return { fail: e.fail, dc: e.clar - s.eco.clar, df: e.food - s.eco.food };
  });
  foreCache.set(s, { key, f });
  return f;
}

/** 사건 → 손맛 (파티클·글자·흔들림) */
function fire(s: ReefState, w: number) {
  const fx = juice(s), last = fx.memo.ev ?? -1;
  const sx = (x: number) => TXm(x) * w, sy = (y: number) => TYm(y) * w;
  for (const e of s.events) {
    if (e.t <= last) continue;
    const x = sx(e.x), y = Math.max(sy(0.16), sy(e.y));
    switch (e.kind) {
      case 'splash':
        fx.ring(x, sy(0.03), '#ffffff', w * 0.16, 5);
        fx.ring(x, sy(0.03), '#bff4ff', w * 0.26, 3);
        fx.burst(x, sy(0.03), '#e8fdff', 22, 4.2, 3.4);
        fx.burst(x, sy(0.03), '#7fdcf0', 10, 3, 2.6);
        fx.pop(x, sy(0.2), e.text ?? '퐁당!', '#ffffff', 22);
        fx.kick(4);
        break;
      case 'heart':
        fx.pop(x, y, '♥', '#ff6f9a', 18);
        fx.burst(x, y, '#ff9ec0', 5, 1.6, 2.2);
        break;
      case 'shark':
        fx.kick(3);
        fx.pop(x, y, e.text ?? '', '#ffe3e3', 18);
        break;
      case 'gulp':
        fx.burst(x, y, '#ffffff', 14, 3.2, 3);
        fx.burst(x, y, '#ffcf8a', 6, 2.4, 2.4);
        fx.ring(x, y, '#ffffff', w * 0.1, 3);
        fx.pop(x, y - w * 0.03, e.text ?? '꿀꺽!', '#ffffff', 22);
        fx.kick(7);
        break;
      case 'plank':
        for (let k = 0; k < 6; k++) fx.burst(sx(0.12 + k * 0.15), sy(0.12 + (k % 2) * 0.05), '#fff2a0', 4, 1.4, 2);
        fx.pop(sx(0.5), sy(0.32), `먹이 +${e.n ?? 0}`, '#fff6b8', 16);
        break;
      case 'clean':
        fx.burst(x, y, '#e6fdff', 6, 1.8, 2.2);
        break;
      case 'grow':
        fx.ring(x, y, '#ff9ec0', w * 0.09, 4);
        fx.burst(x, y, '#ffc2d6', 12, 2.6, 2.6);
        fx.pop(x, y - w * 0.04, e.text ?? '', '#ffe0ec', 17);
        break;
      case 'coralLost':
        fx.burst(x, y, '#f4f1ea', 12, 2.2, 2.4);
        fx.pop(x, y - w * 0.04, e.text ?? '', '#ffe0e0', 14);
        break;
      case 'sick':
        fx.burst(x, y, '#b6e86a', 8, 1.8, 2.4);
        fx.pop(x, y - w * 0.04, e.text ?? '', '#dfffb0', 14);
        break;
      case 'cure':
        fx.burst(x, y, '#c9ffd8', 12, 2.4, 2.4);
        fx.ring(x, y, '#e9fff0', w * 0.07, 3);
        fx.pop(x, y - w * 0.04, e.text ?? '', '#e9fff0', 15);
        break;
      case 'baby':
        fx.burst(x, y, '#ffd1e3', 10, 2.4, 2.4);
        fx.burst(x, y, e.col ?? '#ffb24a', 6, 1.8, 2);
        fx.ring(x, y, '#ffffff', w * 0.06, 3);
        fx.pop(x, y - w * 0.02, '♥', '#ff6f9a', 20);
        break;
      case 'hungry':
      case 'current':
      case 'swept':
        fx.pop(x, y, e.text ?? '', e.col ?? '#ffffff', 15);
        break;
      case 'fail':
        fx.kick(10);
        fx.blink('#ff7a7a', 0.35);
        break;
      case 'clear':
        for (let k = 0; k < 6; k++) fx.burst(sx(0.15 + k * 0.14), sy(0.3 + (k % 3) * 0.1), ['#ffcf3a', '#ff7aa2', '#7fdcf0', '#9be86a'][k % 4], 14, 4, 3);
        fx.blink('#fff6d0', 0.3);
        break;
      case 'lose':
        fx.kick(6);
        break;
      case 'pick':
        fx.burst(e.x * w, e.y * w, e.col ?? '#ffffff', 14, 3.6, 3);
        fx.ring(e.x * w, e.y * w, '#ffffff', w * 0.14, 4);
        break;
    }
  }
  if (s.band && s.band.t > (fx.memo.band ?? -1)) {
    fx.memo.band = s.band.t;
    fx.ring(w * 0.5, sy(0.32), '#ffffff', w * 0.45, 6);
    fx.burst(w * 0.5, sy(0.32), '#fff6b8', 22, 4.5, 3);
    fx.kick(5);
  }
  fx.memo.ev = s.t;
}

function drawAll(ctx: Ctx, s: ReefState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), t = s.t, d = STAGES[s.stage], m = fx.memo;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const tX = (x: number) => X(TXm(x)), tY = (y: number) => Y(TYm(y)), U = R(TX1 - TX0);
  fire(s, w);
  const nightT = isNight(d, s.day) && s.phase !== 'result' ? 1 : 0;
  m.nf = (m.nf ?? nightT) + (nightT - (m.nf ?? nightT)) * 0.05;
  const nf = m.nf;
  const q = s.phase === 'day' ? ease((s.pt - T_METER) / 26) : 1;
  const clar = s.phase === 'day' ? s.prev.clar + (s.eco.clar - s.prev.clar) * q : s.eco.clar;
  const food = s.phase === 'day' ? s.prev.food + (s.eco.food - s.prev.food) * q : s.eco.food;
  const murk = cl01((8 - clar) / 8);
  const r = s.res, hunt = s.phase === 'day' && s.pt >= T_HUNT && s.pt < T_HUNT + 50 && s.eco.n[SHARK] > 0;
  const curNow = s.phase === 'day' && r?.cur && s.pt >= T_SWEEP - 10 && s.pt < T_SWEEP + 60 ? Math.sin(((s.pt - T_SWEEP + 10) / 70) * Math.PI) : 0;

  ctx.save();
  fx.begin(ctx);
  // ═════════ 방 (창가) ═════════
  ctx.fillStyle = lin(ctx, 0, 0, 0, h, [[0, '#fff3dc'], [1, '#ffe2bd']]);
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // ═════════ 어항 틀 ═════════
  const x0 = X(TX0), y0 = Y(TY0), x1 = X(TX1), y1 = Y(TY1);
  ctx.fillStyle = 'rgba(60,40,20,.25)';
  ctx.beginPath();
  ctx.roundRect(x0 - R(0.012), y0 - R(0.006), x1 - x0 + R(0.03), y1 - y0 + R(0.03), R(0.03));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, '#3d6f7f'], [1, '#2b5262']]);
  ctx.beginPath();
  ctx.roundRect(x0 - R(0.014), y0 - R(0.012), x1 - x0 + R(0.028), y1 - y0 + R(0.024), R(0.028));
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.016));
  ctx.clip();
  // 물
  ctx.fillStyle = lin(ctx, 0, y0, 0, y1, [[0, '#a8f3f6'], [0.35, '#5fd3e6'], [0.75, '#34b2d4'], [1, '#2a9cc6']]);
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 먼 산호 그림자
  ctx.fillStyle = 'rgba(120,205,230,.55)';
  ctx.beginPath();
  ctx.moveTo(x0, tY(0.7));
  for (let k = 0; k <= 20; k++) ctx.lineTo(tX(k / 20), tY(0.66 + 0.05 * Math.sin(k * 1.3) + 0.03 * Math.sin(k * 3.1)));
  ctx.lineTo(x1, y1);
  ctx.lineTo(x0, y1);
  ctx.fill();
  ctx.fillStyle = 'rgba(95,185,215,.5)';
  for (let k = 0; k < 6; k++) {
    const bx = tX(0.08 + k * 0.17), by = tY(0.74);
    ctx.beginPath();
    ctx.ellipse(bx, by, U * 0.05, U * 0.07, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillRect(bx - U * 0.008, by - U * 0.12, U * 0.016, U * 0.06);
  }
  // 먼 물고기 떼
  ctx.fillStyle = 'rgba(70,160,200,.45)';
  for (let k = 0; k < 9; k++) {
    const gx = ((t * 0.0009 + k * 0.021 + (k % 3) * 0.05) % 1.4) - 0.2, gy = 0.3 + (k % 3) * 0.035 + 0.02 * Math.sin(t * 0.02 + k);
    ctx.beginPath();
    ctx.ellipse(tX(gx), tY(gy), U * 0.018, U * 0.007, 0, 0, TAU);
    ctx.moveTo(tX(gx) - U * 0.016, tY(gy));
    ctx.lineTo(tX(gx) - U * 0.028, tY(gy) - U * 0.008);
    ctx.lineTo(tX(gx) - U * 0.028, tY(gy) + U * 0.008);
    ctx.fill();
  }
  // 햇살 줄기
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 5; k++) {
    const bx = tX(0.05 + k * 0.22 + 0.03 * Math.sin(t * 0.01 + k)), wd = U * (0.06 + 0.03 * (k % 2));
    const a = 0.1 + 0.06 * Math.sin(t * 0.02 + k * 1.7);
    ctx.fillStyle = lin(ctx, 0, y0, 0, tY(0.85), [[0, `rgba(255,255,230,${a * (1 - nf * 0.7)})`], [1, 'rgba(255,255,230,0)']]);
    ctx.beginPath();
    ctx.moveTo(bx, y0);
    ctx.lineTo(bx + wd, y0);
    ctx.lineTo(bx + wd + U * 0.22, tY(0.85));
    ctx.lineTo(bx + U * 0.12, tY(0.85));
    ctx.fill();
  }
  ctx.restore();
  // 뒤 바위
  drawRocks(ctx, tX, tY, U, t);
  // 모래
  ctx.beginPath();
  ctx.moveTo(x0, tY(0.8));
  for (let k = 0; k <= 24; k++) ctx.lineTo(tX(k / 24), tY(0.79 + 0.012 * Math.sin(k * 0.9) + 0.008 * Math.sin(k * 2.3)));
  ctx.lineTo(x1, y1);
  ctx.lineTo(x0, y1);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, tY(0.79), 0, y1, [[0, '#fff0c4'], [0.5, '#f9d99c'], [1, '#ecc184']]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,150,80,.35)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    const yy = 0.83 + k * 0.035;
    for (let j = 0; j <= 16; j++) ctx.lineTo(tX(j / 16), tY(yy + 0.006 * Math.sin(j * 1.4 + k * 2)));
    ctx.stroke();
  }
  // 물결 빛 (모래 위)
  ctx.strokeStyle = `rgba(255,255,255,${0.32 * (1 - nf * 0.6)})`;
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    const cx = 0.05 + k * 0.115, cy = 0.84 + (k % 3) * 0.04;
    for (let j = 0; j <= 8; j++) {
      const a = (j / 8) * TAU;
      ctx.lineTo(tX(cx + Math.cos(a) * 0.04 + 0.01 * Math.sin(t * 0.03 + k + j)), tY(cy + Math.sin(a) * 0.012 + 0.004 * Math.cos(t * 0.04 + j)));
    }
    ctx.stroke();
  }
  // 조약돌·조개·불가사리
  for (let k = 0; k < 14; k++) {
    const px = hsh(k * 3 + 1), py = 0.87 + hsh(k * 3 + 2) * 0.1;
    ctx.fillStyle = ['#d9b38a', '#c9a6d8', '#f2d0b4', '#b9c9d6'][k % 4];
    ctx.beginPath();
    ctx.ellipse(tX(px), tY(py), U * 0.012, U * 0.008, 0, 0, TAU);
    ctx.fill();
  }
  drawStar5(ctx, tX(0.08), tY(0.955), U * 0.035, t);
  drawShell(ctx, tX(0.66), tY(0.97), U * 0.03);
  // 물방울 거품기
  ctx.fillStyle = '#7d8f9c';
  ctx.beginPath();
  ctx.ellipse(tX(0.94), tY(0.9), U * 0.03, U * 0.014, 0, 0, TAU);
  ctx.fill();

  // ═════════ 생물 ═════════
  const pres = (y: number) => 0.84 + 0.3 * cl01((y - 0.8) / 0.16);
  const ents = s.ents.filter((e) => e.die < 0 || (s.t - e.die < 60 && e.how !== 'eat' && e.how !== '') || e.how === 'belly');
  const plants = ents.filter((e) => planted(e.sp)).sort((a, b) => a.y - b.y);
  const hugN = new Map<number, number>();
  for (const e of ents) if (e.mode === 1 && e.die < 0) hugN.set(e.host, (hugN.get(e.host) ?? 0) + 1);
  for (const e of plants) {
    const ex = tX(e.x), ey = tY(e.y), ps = pres(e.y);
    const pop = e.drop > 0 ? 1 : back((t - e.born) / 22);
    if (e.sp === WEED) drawWeed(ctx, ex, ey, U * 0.38 * ps * pop, t, e.ph, curNow);
    else if (e.sp === ANEM) drawAnemone(ctx, ex, ey, U * 0.2 * ps * pop, t, e.ph, false, hugN.get(e.id) ?? 0);
    else {
      const k = e.die >= 0 ? t - e.die : -1;
      const g = (e.drop > 0 ? 1 : ease((t - e.born) / 30)) * (k >= 0 ? (e.how === 'nibble' ? 1 - cl01(k / 40) : 1 - cl01((k - 25) / 30)) : 1);
      drawCoral(ctx, ex, ey, U * 0.23 * ps, t, e.id, Math.max(0.01, g), e.how === 'bleach' && k >= 0 ? cl01(k / 20) : 0);
    }
  }
  // 바닥 친구들 + 물고기 (깊이 순)
  const movers = ents.filter((e) => !planted(e.sp)).sort((a, b) => (a.sp === SNAIL ? 2 : a.y) - (b.sp === SNAIL ? 2 : b.y));
  const gulping = s.ents.some((e) => e.how === 'eat' && t - e.die >= -2 && t - e.die < 12);
  for (const e of movers) {
    const k = e.die >= 0 ? t - e.die : -1;
    if (k >= 0 && e.how === 'eat') continue;
    let ex = tX(e.x), ey = tY(e.y);
    if (e.drop > 0) ey += 0;
    ctx.globalAlpha = k >= 0 && e.how === 'swept' ? 1 - cl01((k - 20) / 40) : 1;
    const sc = e.baby > 0 ? 0.55 + 0.45 * (1 - e.baby / 240) : 1;
    const scared = (hunt && e.mode === 0) || e.scare > 0 && e.mode === 0;
    const joy = e.joy > 0 || (s.phase === 'result' && s.ok);
    const dizzy = s.phase === 'result' && !s.ok;
    const jit = scared ? Math.sin(t * 1.3 + e.id) * U * 0.004 : 0;
    ex += jit;
    if (e.sp === CLOWN) drawClown(ctx, ex, ey, U * 0.13 * sc, e.face, t, { sick: e.sick, scared: scared && !e.sick, joy: joy && !e.sick, belly: e.how === 'belly', ph: e.ph, dizzy });
    else if (e.sp === HORSE) drawHorse(ctx, ex, ey, U * 0.17 * sc, e.face, t, { scared, joy, ph: e.ph, dizzy: dizzy || e.how === 'swept' });
    else if (e.sp === SHARK) drawShark(ctx, ex, ey, U * 0.3, e.face, t, { open: gulping ? 1 : 0, smug: s.mood === 'gulp', hungry: !!(s.phase === 'day' && r && r.hungry && s.pt > T_HUNT), ph: e.ph, sleepy: nf > 0.5 && !hunt });
    else if (e.sp === SNAIL) drawSnail(ctx, ex, ey, U * 0.1, e.face, t, e.ph, joy);
    else if (e.sp === CRAB) drawCrab(ctx, ex, ey, U * 0.12, t, e.ph, { joy, scared, night: nf > 0.5 });
    else if (e.sp === URCHIN) drawUrchin(ctx, ex, ey, U * 0.11, t, e.ph, s.phase === 'day' && s.pt > T_METER - 10 && s.pt < T_CORAL + 20);
    else if (e.sp === SHRIMP) drawShrimp(ctx, ex, ey, U * 0.085, e.face, t, e.ph);
    ctx.globalAlpha = 1;
    if (e.sick && e.die < 0 && t % 50 < 25) {
      ctx.fillStyle = 'rgba(190,240,120,.8)';
      ctx.beginPath();
      ctx.arc(ex + U * 0.03, ey - U * 0.05 - (t % 50) * 0.3, U * 0.008, 0, TAU);
      ctx.fill();
    }
  }
  // 안긴 흰동가리 위로 말미잘 앞 촉수
  for (const e of plants) if (e.sp === ANEM) drawAnemone(ctx, tX(e.x), tY(e.y), U * 0.2 * pres(e.y) * (e.drop > 0 ? 1 : back((t - e.born) / 22)), t, e.ph, true, hugN.get(e.id) ?? 0);
  // 거품
  for (let k = 0; k < 9; k++) {
    const life = ((t * 0.9 + k * 37) % 260) / 260;
    const bx = tX(0.94 + 0.012 * Math.sin(t * 0.08 + k)), by = tY(0.88 - life * 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, by, U * (0.006 + 0.004 * (k % 3)), 0, TAU);
    ctx.stroke();
  }
  // 먹이 알갱이 (먹이가 많을수록)
  ctx.fillStyle = nf > 0.5 ? 'rgba(150,255,240,.8)' : 'rgba(255,240,170,.85)';
  for (let k = 0; k < Math.round(food * 2.4); k++) {
    const px = hsh(k + 50), py = (hsh(k + 80) + t * 0.0006 * (1 + (k % 3))) % 0.75;
    ctx.beginPath();
    ctx.arc(tX(px + 0.01 * Math.sin(t * 0.03 + k)), tY(0.04 + py), U * 0.004, 0, TAU);
    ctx.fill();
  }
  // 해류 줄
  if (curNow > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${0.55 * curNow})`;
    ctx.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      const yy = 0.15 + k * 0.09, off = ((t * 0.02 + k * 0.37) % 1.4) - 0.2;
      ctx.beginPath();
      for (let j = 0; j < 8; j++) ctx.lineTo(tX(off + j * 0.03), tY(yy + 0.012 * Math.sin(j + t * 0.1)));
      ctx.stroke();
    }
  }
  // 탁함·이끼
  if (murk > 0.01) {
    ctx.fillStyle = `rgba(110,150,60,${murk * 0.42})`;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    for (let k = 0; k < Math.round(murk * 16); k++) {
      const px = 0.05 + hsh(k + 200) * 0.9, py = 0.08 + hsh(k + 230) * 0.75, rr = U * (0.025 + hsh(k + 260) * 0.04);
      ctx.fillStyle = `rgba(80,140,50,${0.35 + 0.3 * murk})`;
      for (let j = 0; j < 4; j++) {
        ctx.beginPath();
        ctx.arc(tX(px) + Math.cos(j * 1.7) * rr * 0.6, tY(py) + Math.sin(j * 2.3) * rr * 0.5, rr * (0.5 + 0.2 * j), 0, TAU);
        ctx.fill();
      }
    }
  }
  // 밤
  if (nf > 0.01) {
    ctx.fillStyle = `rgba(16,28,80,${0.5 * nf})`;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = `rgba(150,255,240,${0.7 * nf})`;
    for (let k = 0; k < 24; k++) {
      ctx.globalAlpha = nf * (0.4 + 0.6 * Math.abs(Math.sin(t * 0.04 + k)));
      ctx.beginPath();
      ctx.arc(tX(hsh(k + 400)), tY(0.1 + hsh(k + 430) * 0.7 + 0.02 * Math.sin(t * 0.02 + k)), U * 0.005, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 수면
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + R(0.03), [[0, 'rgba(255,255,255,.75)'], [1, 'rgba(255,255,255,0)']]);
  ctx.fillRect(x0, y0, x1 - x0, R(0.03));
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let k = 0; k <= 30; k++) ctx.lineTo(tX(k / 30), y0 + R(0.008) + Math.sin(k * 0.8 + t * 0.06) * R(0.003));
  ctx.stroke();
  // 유리 반사
  ctx.fillStyle = 'rgba(255,255,255,.13)';
  ctx.beginPath();
  ctx.moveTo(x0 + U * 0.05, y0);
  ctx.lineTo(x0 + U * 0.16, y0);
  ctx.lineTo(x0 + U * 0.02, y1);
  ctx.lineTo(x0 - U * 0.09, y1);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.moveTo(x0 + U * 0.2, y0);
  ctx.lineTo(x0 + U * 0.24, y0);
  ctx.lineTo(x0 + U * 0.1, y1);
  ctx.lineTo(x0 + U * 0.06, y1);
  ctx.fill();
  ctx.restore();
  // 어항 테 반짝
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R(0.016));
  ctx.stroke();
  // 구경꾼 고양이 (유리 밖)
  drawCat(ctx, X(0.88), Y(TY1 - 0.045), R(0.05), t, s, hunt);
  ctx.restore();

  // ═════════ 받침장 (계기·카드) ═════════
  drawCabinet(ctx, X, Y, R, w, h);
  drawMeters(ctx, s, X, Y, R, font, clar, food, t);
  drawCards(ctx, s, X, Y, R, font, t);
  drawHud(ctx, s, X, Y, R, font, w, t);
  drawOverlays(ctx, s, X, Y, R, font, w, t, tX, tY, U);
}

function drawRocks(ctx: Ctx, tX: (x: number) => number, tY: (y: number) => number, U: number, t: number) {
  const rock = (x: number, y: number, rx: number, ry: number, c0: string, c1: string) => {
    ctx.beginPath();
    ctx.ellipse(tX(x), tY(y), U * rx, U * ry, 0, Math.PI, TAU);
    ctx.quadraticCurveTo(tX(x) + U * rx, tY(y) + U * ry * 0.3, tX(x), tY(y) + U * ry * 0.35);
    ctx.quadraticCurveTo(tX(x) - U * rx, tY(y) + U * ry * 0.3, tX(x) - U * rx, tY(y));
    ctx.fillStyle = lin(ctx, 0, tY(y) - U * ry, 0, tY(y) + U * ry * 0.3, [[0, c0], [1, c1]]);
    ctx.fill();
    ink(ctx, U * 0.006);
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.ellipse(tX(x) - U * rx * 0.3, tY(y) - U * ry * 0.6, U * rx * 0.35, U * ry * 0.18, -0.3, 0, TAU);
    ctx.fill();
  };
  rock(0.12, 0.8, 0.16, 0.2, '#b7b9e0', '#7d82b8');
  rock(0.25, 0.83, 0.1, 0.11, '#c8c3e6', '#8d8ac0');
  rock(0.86, 0.79, 0.17, 0.23, '#b3c2e2', '#7889b8');
  rock(0.73, 0.83, 0.09, 0.1, '#c6d0ec', '#8d9cc6');
  // 이끼 점·작은 해면
  for (let k = 0; k < 10; k++) {
    const x = k < 5 ? 0.04 + hsh(k) * 0.24 : 0.72 + hsh(k) * 0.24, y = 0.66 + hsh(k + 30) * 0.14;
    ctx.fillStyle = ['#ff9ec0', '#ffd36b', '#9be86a', '#c59bff'][k % 4];
    ctx.beginPath();
    ctx.arc(tX(x), tY(y), U * (0.008 + 0.005 * Math.sin(t * 0.03 + k)), 0, TAU);
    ctx.fill();
  }
}
function drawStar5(ctx: Ctx, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.2 + Math.sin(t * 0.01) * 0.05);
  ctx.scale(1, 0.6);
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [[0, '#ffb36b'], [1, '#f07a3a']]);
  ctx.fill();
  ink(ctx, r * 0.12);
  ctx.restore();
}
function drawShell(ctx: Ctx, x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.3);
  ctx.arc(0, r * 0.3, r, Math.PI * 1.1, Math.PI * 1.9);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -r, 0, r * 0.3, [[0, '#ffe3ec'], [1, '#f6a6bf']]);
  ctx.fill();
  ink(ctx, r * 0.1);
  ctx.strokeStyle = 'rgba(200,100,130,.5)';
  ctx.lineWidth = r * 0.08;
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * (1.15 + k * 0.15);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(Math.cos(a) * r * 0.9, r * 0.3 + Math.sin(a) * r * 0.9);
    ctx.stroke();
  }
  ctx.restore();
}

/** 유리 밖에서 구경하는 고양이 — 상어가 오면 눈이 동그래지고, 아기가 나면 하트 눈 */
function drawCat(ctx: Ctx, x: number, y: number, r: number, t: number, s: ReefState, hunt: boolean) {
  const love = s.mood === 'love' || s.mood === 'cheer', shock = hunt || s.mood === 'gulp' || s.mood === 'dizzy';
  const fish = s.ents.find((e) => e.sp === SHARK && e.die < 0) ?? s.ents.find((e) => e.sp === CLOWN && e.die < 0);
  const look = fish ? Math.max(-1, Math.min(1, (TXm(fish.x) * 1 - 0.88) * 3)) : Math.sin(t * 0.01);
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.03) * r * 0.04);
  // 귀
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.85, -r * 0.35);
    ctx.lineTo(sx * r * 0.7, -r * 1.15 + (shock ? -r * 0.1 : 0));
    ctx.lineTo(sx * r * 0.2, -r * 0.8);
    ctx.closePath();
    ctx.fillStyle = '#ffae5c';
    ctx.fill();
    ink(ctx, r * 0.07);
    ctx.fillStyle = '#ffd1dc';
    ctx.beginPath();
    ctx.moveTo(sx * r * 0.7, -r * 0.5);
    ctx.lineTo(sx * r * 0.66, -r * 0.95);
    ctx.lineTo(sx * r * 0.35, -r * 0.75);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 0.82, 0, 0, TAU);
  ctx.fillStyle = rad(ctx, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, [[0, '#ffd08f'], [1, '#f39a45']]);
  ctx.fill();
  ink(ctx, r * 0.08);
  ctx.strokeStyle = 'rgba(200,110,40,.7)';
  ctx.lineWidth = r * 0.09;
  for (let k = -1; k <= 1; k++) (ctx.beginPath(), ctx.moveTo(k * r * 0.22, -r * 0.8), ctx.lineTo(k * r * 0.18, -r * 0.5), ctx.stroke());
  for (const sx of [-1, 1]) {
    const ex = sx * r * 0.38 + look * r * 0.06, ey = -r * 0.05;
    if (love) {
      ctx.fillStyle = '#ff5f86';
      ctx.beginPath();
      ctx.moveTo(ex, ey + r * 0.14);
      ctx.bezierCurveTo(ex - r * 0.22, ey - r * 0.02, ex - r * 0.1, ey - r * 0.2, ex, ey - r * 0.06);
      ctx.bezierCurveTo(ex + r * 0.1, ey - r * 0.2, ex + r * 0.22, ey - r * 0.02, ex, ey + r * 0.14);
      ctx.fill();
    } else eye(ctx, ex, ey, r * (shock ? 0.2 : 0.17), { scared: shock, look: look, t }, '#f39a45');
  }
  ctx.fillStyle = '#ff7a9a';
  ctx.beginPath();
  ctx.moveTo(-r * 0.08, r * 0.2);
  ctx.lineTo(r * 0.08, r * 0.2);
  ctx.lineTo(0, r * 0.3);
  ctx.fill();
  ctx.beginPath();
  if (shock) ctx.ellipse(0, r * 0.45, r * 0.09, r * 0.12, 0, 0, TAU);
  else (ctx.moveTo(-r * 0.15, r * 0.36), ctx.quadraticCurveTo(0, r * 0.48, 0, r * 0.32), ctx.quadraticCurveTo(0, r * 0.48, r * 0.15, r * 0.36));
  ink(ctx, r * 0.06);
  ctx.strokeStyle = 'rgba(60,40,30,.6)';
  ctx.lineWidth = r * 0.03;
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) (ctx.beginPath(), ctx.moveTo(sx * r * 0.45, r * (0.25 + k * 0.1)), ctx.lineTo(sx * r * 1.05, r * (0.18 + k * 0.16)), ctx.stroke());
  // 앞발 (유리에 꾹)
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.6, r * 0.75, r * 0.26, r * 0.2, 0, 0, TAU);
    ctx.fillStyle = '#ffe2c0';
    ctx.fill();
    ink(ctx, r * 0.06);
  }
  ctx.restore();
}

// ───────────────────────────── 그리기: 받침장·계기·카드·머리띠 ─────────────────────────────
type F1 = (x: number) => number;
type FontF = (sz: number, wgt?: number) => void;
function drawCabinet(ctx: Ctx, _X: F1, Y: F1, R: F1, w: number, h: number) {
  const y0 = Y(TY1 + 0.01);
  ctx.fillStyle = lin(ctx, 0, y0, 0, h, [[0, '#f0bd7e'], [0.05, '#d9995d'], [1, '#b8773f']]);
  ctx.fillRect(0, y0, w, h - y0);
  ctx.strokeStyle = 'rgba(120,64,24,.16)';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    const yy = y0 + R(0.03) + k * ((h - y0) / 9);
    for (let x = 0; x <= w; x += w / 20) ctx.lineTo(x, yy + Math.sin(x * 0.03 + k * 1.9) * R(0.006));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,240,210,.7)';
  ctx.fillRect(0, y0, w, R(0.005));
  ctx.fillStyle = 'rgba(80,40,10,.18)';
  ctx.fillRect(0, y0 + R(0.005), w, R(0.008));
}

function iconDrop(ctx: Ctx, x: number, y: number, r: number, col = '#3fb6e8') {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 0.1, x + r * 0.8, y + r * 0.85, x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 0.8, y + r * 0.85, x - r * 0.9, y - r * 0.1, x, y - r);
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [[0, '#bff0ff'], [1, col]]);
  ctx.fill();
  ink(ctx, r * 0.16);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y + r * 0.15, r * 0.18, 0, TAU);
  ctx.fill();
}
function iconFood(ctx: Ctx, x: number, y: number, r: number) {
  for (let k = 0; k < 5; k++) {
    const a = k * 1.26 + 0.3, rr = k === 0 ? 0 : r * 0.55;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * rr, y + Math.sin(a) * rr, r * 0.38, 0, TAU);
    ctx.fillStyle = ['#ffd25a', '#ffb43c', '#ff9b4a', '#ffd25a', '#ffc04a'][k];
    ctx.fill();
    ink(ctx, r * 0.13);
  }
}
function iconKinds(ctx: Ctx, x: number, y: number, r: number) {
  const cols = ['#ff8a3d', '#3fbf6a', '#7a54c4'];
  cols.forEach((c, k) => {
    const fx = x + (k - 1) * r * 0.55, fy = y + (k % 2 ? -r * 0.35 : r * 0.25);
    ctx.beginPath();
    ctx.ellipse(fx, fy, r * 0.42, r * 0.26, 0, 0, TAU);
    ctx.fillStyle = c;
    ctx.fill();
    ink(ctx, r * 0.1);
  });
}
function starPath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heartPath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 0.05, x - r * 0.65, y - r * 1.05, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.65, y - r * 1.05, x + r * 1.3, y - r * 0.05, x, y + r * 0.85);
  ctx.closePath();
}

function drawMeters(ctx: Ctx, s: ReefState, X: F1, Y: F1, R: F1, font: FontF, clar: number, food: number, t: number) {
  const d = STAGES[s.stage], e = s.phase === 'day' && s.pt < T_METER ? s.prev : s.eco;
  const bars = [
    { label: '맑기', v: clar, c0: '#7fdcff', c1: '#2a9fd8', mark: d.stars.find((q) => q.k === 'clear')?.n, icon: 0 },
    { label: '먹이', v: food, c0: '#ffe07a', c1: '#f39a22', mark: d.stars.find((q) => q.k === 'food')?.n, icon: 1 },
  ];
  const y0 = Y(MY0), y1 = Y(MY1), hh = y1 - y0;
  bars.forEach((b, i) => {
    const x0 = X(0.025 + i * 0.325), ww = R(0.3), danger = b.v <= 2.5 && s.phase !== 'result';
    ctx.fillStyle = 'rgba(80,40,10,.25)';
    ctx.beginPath();
    ctx.roundRect(x0 + 2, y0 + 3, ww, hh, R(0.02));
    ctx.fill();
    ctx.fillStyle = danger && t % 30 < 15 ? '#ffe3e0' : '#fffaf0';
    ctx.beginPath();
    ctx.roundRect(x0, y0, ww, hh, R(0.02));
    ctx.fill();
    ctx.strokeStyle = danger ? '#e24a4a' : 'rgba(130,80,40,.55)';
    ctx.lineWidth = danger ? 2.5 : 1.5;
    ctx.stroke();
    if (b.icon === 0) iconDrop(ctx, x0 + R(0.035), y0 + hh / 2, R(0.022));
    else iconFood(ctx, x0 + R(0.035), y0 + hh / 2, R(0.022));
    font(0.036);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#3a2a1a';
    ctx.fillText(b.label, x0 + R(0.068), y0 + hh * 0.3);
    ctx.textAlign = 'right';
    ctx.fillStyle = danger ? '#d43a3a' : '#3a2a1a';
    ctx.fillText(danger ? '위험!' : `${Math.round(b.v)}`, x0 + ww - R(0.012), y0 + hh * 0.3);
    const bx = x0 + R(0.068), bw = ww - R(0.08), by = y0 + hh * 0.58, bh = hh * 0.28;
    ctx.fillStyle = 'rgba(120,90,60,.18)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    const fw = bw * cl01(b.v / 10);
    if (fw > 1) {
      ctx.fillStyle = danger ? lin(ctx, bx, 0, bx + bw, 0, [[0, '#ff9a8a'], [1, '#e24a4a']]) : lin(ctx, bx, 0, bx + bw, 0, [[0, b.c0], [1, b.c1]]);
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(bh, fw), bh, bh / 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    for (let k = 1; k < 10; k++) (ctx.beginPath(), ctx.moveTo(bx + (bw * k) / 10, by + 1), ctx.lineTo(bx + (bw * k) / 10, by + bh - 1), ctx.stroke());
    if (b.mark !== undefined) {
      const mx = bx + (bw * b.mark) / 10;
      ctx.strokeStyle = '#c98a00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mx, by - 3);
      ctx.lineTo(mx, by + bh + 2);
      ctx.stroke();
      starPath(ctx, mx, by - R(0.012), R(0.012));
      ctx.fillStyle = '#ffc93a';
      ctx.fill();
      ink(ctx, 1);
    }
  });
  // 종류
  const x0 = X(0.675), ww = R(0.3), kq = d.stars.find((q) => q.k === 'kinds'), kn = kinds(e), goal = kq?.n ?? 8;
  ctx.fillStyle = 'rgba(80,40,10,.25)';
  ctx.beginPath();
  ctx.roundRect(x0 + 2, y0 + 3, ww, hh, R(0.02));
  ctx.fill();
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.roundRect(x0, y0, ww, hh, R(0.02));
  ctx.fill();
  ctx.strokeStyle = 'rgba(130,80,40,.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  iconKinds(ctx, x0 + R(0.035), y0 + hh / 2, R(0.024));
  font(0.036);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3a2a1a';
  ctx.fillText('종류', x0 + R(0.068), y0 + hh * 0.3);
  ctx.textAlign = 'right';
  ctx.fillStyle = kq && kn >= goal ? '#b07a00' : '#3a2a1a';
  ctx.fillText(kq && kn < goal ? `${kn}/${goal}종` : `${kn}종`, x0 + ww - R(0.012), y0 + hh * 0.3);
  const bx = x0 + R(0.068), bw = ww - R(0.08), by = y0 + hh * 0.58, bh = hh * 0.28, gap = R(0.004), cw = (bw - gap * (goal - 1)) / goal;
  for (let k = 0; k < goal; k++) {
    ctx.fillStyle = k < kn ? ['#ff8a3d', '#c86bd8', '#e9b46a', '#ffc93f', '#8fa6b8', '#ef5b4b', '#ff7aa2', '#7a54c4'][k % 8] : 'rgba(120,90,60,.18)';
    ctx.beginPath();
    ctx.roundRect(bx + k * (cw + gap), by, cw, bh, bh / 2);
    ctx.fill();
  }
}

/** 카드 속 그림 (생물 하나, 가운데 맞춤) */
function drawCreatureIcon(ctx: Ctx, sp: number, x: number, y: number, u: number, t: number) {
  const ph = sp * 1.3;
  switch (sp) {
    case CLOWN:
      drawClown(ctx, x - u * 0.25, y + u * 0.15, u * 0.55, 1, t, { ph: ph + 1, joy: true });
      drawClown(ctx, x + u * 0.2, y - u * 0.2, u * 0.6, 1, t, { ph, joy: true });
      break;
    case ANEM: drawAnemone(ctx, x, y + u * 0.45, u * 0.95, t, ph, false, 0), drawAnemone(ctx, x, y + u * 0.45, u * 0.95, t, ph, true, 0); break;
    case SNAIL: drawSnail(ctx, x, y + u * 0.1, u * 0.85, 1, t, ph, true); break;
    case HORSE: drawHorse(ctx, x - u * 0.1, y + u * 0.02, u * 1.0, 1, t, { ph, joy: true }); break;
    case SHARK: drawShark(ctx, x, y + u * 0.05, u * 1.3, 1, t, { ph, smug: true }); break;
    case CRAB: drawCrab(ctx, x, y + u * 0.15, u * 0.95, t, ph, { joy: true }); break;
    case CORAL: drawCoral(ctx, x, y + u * 0.45, u * 1.15, t, 0, 1, 0); break;
    case URCHIN: drawUrchin(ctx, x, y + u * 0.05, u * 0.9, t, ph, false); break;
    case SHRIMP: drawShrimp(ctx, x, y, u * 0.75, 1, t, ph); break;
    case WEED: drawWeed(ctx, x, y + u * 0.5, u * 1.05, t, ph, 0); break;
  }
}

function drawCards(ctx: Ctx, s: ReefState, X: F1, Y: F1, R: F1, font: FontF, t: number) {
  const d = STAGES[s.stage], cards = s.deck[s.day] ?? [], fore = s.phase === 'pick' ? forecast(s) : [];
  if (s.phase === 'day' && s.pt > 10) {
    // 하루가 흐르는 동안: 해(달)가 건너는 막대 + 오늘 일어난 일
    const q = cl01(s.pt / T_END), night = isNight(d, s.day), al = cl01((s.pt - 10) / 10);
    ctx.globalAlpha = al;
    const px0 = X(0.06), px1 = X(0.94), py = Y(CY0 + 0.03);
    ctx.fillStyle = 'rgba(80,40,15,.35)';
    ctx.beginPath();
    ctx.roundRect(X(0.03), Y(CY0 - 0.002), R(0.94), R(CY1 - CY0 - 0.004), R(0.03));
    ctx.fill();
    ctx.strokeStyle = night ? 'rgba(180,190,255,.6)' : 'rgba(255,230,160,.7)';
    ctx.lineWidth = R(0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px0, py);
    ctx.lineTo(px1, py);
    ctx.stroke();
    const sx = px0 + (px1 - px0) * q;
    if (night) {
      ctx.fillStyle = '#fff6c8';
      ctx.beginPath();
      ctx.arc(sx, py, R(0.022), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7a5a3a';
      ctx.beginPath();
      ctx.arc(sx + R(0.01), py - R(0.006), R(0.018), 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = rad(ctx, sx, py, R(0.008), R(0.04), [[0, 'rgba(255,240,150,.9)'], [1, 'rgba(255,200,80,0)']]);
      ctx.beginPath();
      ctx.arc(sx, py, R(0.04), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd23a';
      ctx.beginPath();
      ctx.arc(sx, py, R(0.02), 0, TAU);
      ctx.fill();
      ink(ctx, 1.5);
    }
    font(0.04);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${s.day + 1}일째 ${night ? '밤' : '낮'} — 저절로 흘러요`, X(0.06), Y(CY0 + 0.075));
    const lines = s.log.slice(-4);
    font(0.038, 700);
    lines.forEach((l, k) => {
      const a = cl01((s.t - l.t) / 8);
      ctx.globalAlpha = al * a;
      ctx.fillStyle = l.col;
      ctx.fillText(`· ${l.text}`, X(0.07) + (1 - a) * R(0.04), Y(CY0 + 0.13 + k * 0.05));
    });
    ctx.globalAlpha = 1;
  }
  if (s.phase === 'result') return drawTomorrow(ctx, s, X, Y, R, font, t);
  for (let i = 0; i < 3; i++) {
    const sp = cards[i];
    if (sp === undefined) continue;
    let cx = cardCX(i), cy = (CY0 + CY1) / 2, sc = 1, al = 1;
    if (s.phase === 'pick') {
      const q = ease((s.pt - i * 3) / DEAL);
      cy += (1 - q) * 0.4;
      al = cl01(q * 1.5);
      cy += Math.sin(t * 0.06 + i * 1.7) * 0.004;
    } else if (s.phase === 'day') {
      if (i === s.pickI) {
        const q = ease(s.pt / T_DROP);
        cx += (TXm(s.dropX) - cx) * q;
        cy += (TY0 + 0.02 - cy) * q;
        sc = 1 - 0.75 * q;
        al = 1 - cl01((s.pt - 6) / 8);
      } else {
        const q = ease(s.pt / 12);
        cy += q * 0.45;
        al = 1 - q;
      }
    }
    if (al <= 0.01) continue;
    ctx.save();
    ctx.globalAlpha = al;
    ctx.translate(X(cx), Y(cy));
    ctx.scale(sc, sc);
    const cw = R(CW), ch = R(CY1 - CY0), x0 = -cw / 2, y0 = -ch / 2, col = SP[sp].col;
    const live = s.phase === 'pick' && s.pt >= DEAL;
    if (live) {
      ctx.shadowColor = 'rgba(255,240,170,.9)';
      ctx.shadowBlur = R(0.025) * (0.6 + 0.4 * Math.sin(t * 0.08 + i));
    }
    ctx.fillStyle = 'rgba(70,35,10,.35)';
    ctx.beginPath();
    ctx.roundRect(x0 + 2, y0 + 4, cw, ch, R(0.025));
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + ch, [[0, '#fffdf6'], [1, '#fff0d6']]);
    ctx.beginPath();
    ctx.roundRect(x0, y0, cw, ch, R(0.025));
    ctx.fill();
    ctx.strokeStyle = mixC(col, '#3a2a1a', 0.35);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 이름 띠
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x0, y0, cw, ch, R(0.025));
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + R(0.055), [[0, mixC(col, '#ffffff', 0.15)], [1, col]]);
    ctx.fillRect(x0, y0, cw, R(0.055));
    ctx.restore();
    font(0.04);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,30,10,.55)';
    ctx.strokeText(SP[sp].name, 0, y0 + R(0.029));
    ctx.fillStyle = '#ffffff';
    ctx.fillText(SP[sp].name, 0, y0 + R(0.029));
    // 그림
    const py = y0 + R(0.135), wx = cw / 2 - R(0.012), wy0 = y0 + R(0.062), wy1 = y0 + R(0.205);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(-wx, wy0, wx * 2, wy1 - wy0, R(0.018));
    ctx.fillStyle = lin(ctx, 0, wy0, 0, wy1, [[0, '#d9fbff'], [0.7, '#8fe3f0'], [1, '#f6dca4']]);
    ctx.fill();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.moveTo(-wx + R(0.02), wy0);
    ctx.lineTo(-wx + R(0.05), wy0);
    ctx.lineTo(-wx + R(0.0), wy1);
    ctx.lineTo(-wx - R(0.03), wy1);
    ctx.fill();
    drawCreatureIcon(ctx, sp, 0, py, R(0.105), t);
    ctx.restore();
    ctx.strokeStyle = 'rgba(40,90,110,.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-wx, wy0, wx * 2, wy1 - wy0, R(0.018));
    ctx.stroke();
    // 몇 마리
    if (SP[sp].k > 1) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x0 + cw - R(0.032), y0 + R(0.087), R(0.024), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      font(0.034);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillText(`×${SP[sp].k}`, x0 + cw - R(0.032), y0 + R(0.088));
    }
    // 하는 일
    font(0.035, 700);
    ctx.fillStyle = '#3a2a1a';
    ctx.fillText(SP[sp].job, 0, y0 + R(0.233));
    // 오늘 밤 예상
    const f = fore[i];
    if (f) {
      const fy = y0 + R(0.293);
      if (f.fail) {
        ctx.fillStyle = '#ffdcd6';
        ctx.beginPath();
        ctx.roundRect(-cw * 0.44, fy - R(0.022), cw * 0.88, R(0.044), R(0.022));
        ctx.fill();
        ctx.strokeStyle = '#e24a4a';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        font(0.034);
        ctx.fillStyle = '#c42f2f';
        ctx.fillText(f.fail.startsWith('먹이') ? '위험! 먹이 바닥' : f.fail.startsWith('병') ? '위험! 병' : '위험! 물 탁함', 0, fy + 1);
      } else {
        const chip = (x: number, v: number, kind: number) => {
          if (kind === 0) iconDrop(ctx, x - R(0.03), fy, R(0.014));
          else iconFood(ctx, x - R(0.03), fy, R(0.014));
          font(0.036);
          ctx.textAlign = 'left';
          ctx.fillStyle = v > 0 ? '#1f9a4a' : v < 0 ? '#d4452f' : '#8a7a6a';
          ctx.fillText(v > 0 ? `+${v}` : v < 0 ? `${v}` : '0', x - R(0.008), fy + 1);
          ctx.textAlign = 'center';
        };
        chip(-cw * 0.2, f.dc, 0);
        chip(cw * 0.25, f.df, 1);
      }
    }
    // 키보드 고르기
    if (s.kbd && s.phase === 'pick' && s.kc === i) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(x0 - 5, y0 - 5, cw + 10, ch + 10, R(0.03));
      ctx.stroke();
      ctx.strokeStyle = '#ff9f1c';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }
  drawTomorrow(ctx, s, X, Y, R, font, t);
}

function drawTomorrow(ctx: Ctx, s: ReefState, X: F1, Y: F1, R: F1, font: FontF, t: number) {
  const d = STAGES[s.stage], y = Y(1.458);
  ctx.fillStyle = 'rgba(80,40,15,.35)';
  ctx.beginPath();
  ctx.roundRect(X(0.02), y - R(0.028), R(0.96), R(0.056), R(0.028));
  ctx.fill();
  font(0.035);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff3dc';
  const nd = s.phase === 'day' ? s.day + 1 : s.day + 1;
  if (s.phase === 'result') {
    ctx.textAlign = 'center';
    ctx.fillText(s.ok ? (s.won ? '어항 박사 완성!' : '다음 어항이 와요!') : s.hearts > 0 ? '같은 어항을 다시 꾸며요' : '오늘은 여기까지', X(0.5), y + 1);
    return;
  }
  if (nd >= d.days) {
    ctx.textAlign = 'center';
    ctx.fillText(s.phase === 'pick' ? '오늘이 마지막 날 — 목표를 채워요!' : '마지막 날 — 곧 결과!', X(0.5), y + 1);
    return;
  }
  const nx = d.night && nd % 2 === 1 ? ' (밤)' : d.current.includes(nd) ? ' (해류)' : '';
  ctx.fillText(`내일${nx}`, X(0.045), y + 1);
  const next = s.deck[nd] ?? [];
  let bx = X(0.045) + ctx.measureText(`내일${nx}`).width + R(0.05);
  font(0.034, 700);
  next.forEach((sp) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, y, R(0.024), 0, TAU);
    ctx.fillStyle = '#e6fbff';
    ctx.fill();
    ctx.clip();
    drawCreatureIcon(ctx, sp, bx, y, R(0.032), t);
    ctx.restore();
    ctx.fillStyle = '#fff3dc';
    ctx.textAlign = 'left';
    ctx.fillText(SP[sp].name, bx + R(0.03), y + 1);
    bx += R(0.03) + ctx.measureText(SP[sp].name).width + R(0.06);
  });
}

function drawHud(ctx: Ctx, s: ReefState, X: F1, Y: F1, R: F1, font: FontF, w: number, t: number) {
  const d = STAGES[s.stage], e = s.phase === 'day' && s.pt < T_BABY ? s.prev : s.eco, H = Y(0.158);
  ctx.fillStyle = 'rgba(40,80,100,.18)';
  ctx.fillRect(0, H, w, R(0.008));
  ctx.fillStyle = lin(ctx, 0, 0, 0, H, [[0, '#ffffff'], [1, '#e9fbff']]);
  ctx.fillRect(0, 0, w, H);
  // 1줄: 판 · 이름 · 하트
  font(0.044);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#1d3a4a';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.name}`, X(0.03), Y(0.034));
  for (let k = 0; k < 3; k++) {
    const hx = X(0.92 - k * 0.062), on = 2 - k < s.hearts;
    heartPath(ctx, hx, Y(0.034), R(0.022));
    ctx.fillStyle = on ? lin(ctx, hx, Y(0.012), hx, Y(0.056), [[0, '#ff8a9a'], [1, '#e8334a']]) : 'rgba(30,60,80,.12)';
    ctx.fill();
    ctx.strokeStyle = on ? '#8a1a2a' : 'rgba(30,60,80,.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // 2줄: 날짜 점 · 모은 별
  font(0.036, 700);
  ctx.fillStyle = '#4a6a7a';
  ctx.fillText('하루', X(0.03), Y(0.08));
  for (let k = 0; k < d.days; k++) {
    const cx = X(0.13 + k * 0.05), cy = Y(0.08), done = k < s.day || (k === s.day && s.phase !== 'pick'), cur = k === s.day;
    const night = d.night && k % 2 === 1, curr = d.current.includes(k);
    ctx.beginPath();
    ctx.arc(cx, cy, R(cur ? 0.02 : 0.016), 0, TAU);
    ctx.fillStyle = night ? (done ? '#3a4a8a' : '#c9d2f2') : done ? '#2fb3c9' : '#d7f3f7';
    ctx.fill();
    ctx.strokeStyle = cur ? '#ff9f1c' : 'rgba(30,60,80,.35)';
    ctx.lineWidth = cur ? 2.5 : 1.2;
    ctx.stroke();
    if (night) {
      ctx.fillStyle = '#fff3a8';
      ctx.beginPath();
      ctx.arc(cx, cy, R(0.009), 0, TAU);
      ctx.fill();
      ctx.fillStyle = night && done ? '#3a4a8a' : '#c9d2f2';
      ctx.beginPath();
      ctx.arc(cx + R(0.005), cy - R(0.003), R(0.008), 0, TAU);
      ctx.fill();
    } else if (curr) {
      ctx.strokeStyle = done ? '#ffffff' : '#2a8fb8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let j = 0; j <= 6; j++) ctx.lineTo(cx - R(0.011) + j * R(0.0037), cy + Math.sin(j * 1.6) * R(0.004));
      ctx.stroke();
    } else if (done) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, R(0.005), 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#4a6a7a';
  ctx.fillText(`${Math.min(d.days, s.day + 1)}일째 / ${d.days}일`, X(0.15 + d.days * 0.05), Y(0.08));
  starPath(ctx, X(0.86), Y(0.08), R(0.018));
  ctx.fillStyle = '#ffc93a';
  ctx.fill();
  ink(ctx, 1.2);
  font(0.04);
  ctx.fillStyle = '#1d3a4a';
  ctx.textAlign = 'left';
  ctx.fillText(`${s.stars}`, X(0.888), Y(0.081));
  // 3줄: 별 조건 (첫 별 = 목표)
  font(0.034, 800);
  const chips = d.stars.map((q, i) => {
    const now = starNow(e, q), met = s.phase === 'result' && s.ok ? s.starOk[i] : !e.fail && starMet(e, q) && (q.k !== 'live' || true), broken = starBroken(e, q) || (s.phase === 'result' && s.ok && !s.starOk[i]);
    const text = q.label + (now ? ` ${now}` : '');
    return { text, met: met && !broken, broken, wd: ctx.measureText(text).width + R(0.06), goal: i === 0 };
  });
  const total = chips.reduce((a, c) => a + c.wd, 0) + R(0.012) * (chips.length - 1);
  let cx = Math.max(X(0.015), (w - total) / 2);
  const cy = Y(0.128);
  for (const c of chips) {
    ctx.fillStyle = c.met ? '#fff1b8' : c.broken ? '#e8eef2' : '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cx, cy - R(0.022), c.wd, R(0.044), R(0.022));
    ctx.fill();
    ctx.strokeStyle = c.goal ? '#ff9f1c' : c.met ? '#e0a400' : 'rgba(30,60,80,.3)';
    ctx.lineWidth = c.goal ? 2.2 : 1.3;
    ctx.stroke();
    starPath(ctx, cx + R(0.026), cy, R(0.014));
    ctx.fillStyle = c.met ? '#ffc93a' : c.broken ? '#b8c4cc' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = c.broken ? '#8a9aa6' : '#c98a00';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = c.broken ? '#8a9aa6' : '#1d3a4a';
    ctx.textAlign = 'left';
    ctx.fillText(c.text, cx + R(0.045), cy + 1);
    if (c.broken) {
      ctx.strokeStyle = '#8a9aa6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + R(0.045), cy);
      ctx.lineTo(cx + c.wd - R(0.012), cy);
      ctx.stroke();
    }
    cx += c.wd + R(0.012);
  }
  void t;
}

function drawOverlays(ctx: Ctx, s: ReefState, X: F1, Y: F1, R: F1, font: FontF, w: number, t: number, tX: F1, tY: F1, U: number) {
  const d = STAGES[s.stage];
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // 소식 한 줄 (탱크 위쪽)
  if (s.news && s.t - s.news.t < NEWS_T && s.phase !== 'result') {
    const a = Math.min(1, (s.t - s.news.t) / 10, (NEWS_T - (s.t - s.news.t)) / 15);
    font(0.036);
    const tw = ctx.measureText(s.news.text).width + R(0.06);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,50,70,.78)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, Y(TY0 + 0.018), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.fillStyle = '#fff6d8';
    ctx.fillText(s.news.text, w / 2, Y(TY0 + 0.044));
    ctx.globalAlpha = 1;
  }
  // 판 시작 띠 (NEW)
  const bk = s.t - s.banner;
  if (bk < BANNER_T && s.phase !== 'result') {
    const a = Math.min(1, bk / 10, (BANNER_T - bk) / 20), sc = back(bk / 14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(TY0 + 0.15));
    ctx.scale(sc, sc);
    const bw = R(0.86), bh = R(s.stage === 0 ? 0.2 : 0.22);
    ctx.fillStyle = 'rgba(15,45,70,.82)';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.06);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(s.stage === 0 ? '작은 어항 생태계' : `${s.stage + 1}판 · ${d.name}`, 0, -bh * 0.26);
    if (s.stage > 0) {
      font(0.032);
      const tag = 'NEW', tw = ctx.measureText(tag).width + R(0.03);
      ctx.fillStyle = '#ff5f6d';
      ctx.beginPath();
      ctx.roundRect(-bw / 2 + R(0.025), -bh * 0.26 - R(0.02), tw, R(0.04), R(0.01));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tag, -bw / 2 + R(0.025) + tw / 2, -bh * 0.26 + 1);
    }
    font(0.038);
    ctx.fillStyle = '#fff3a8';
    ctx.fillText(d.news, 0, bh * 0.05);
    font(0.034, 700);
    ctx.fillStyle = '#d8f3ff';
    ctx.fillText(s.stage === 0 ? '첫 별 = 목표 · 하트 셋' : d.tip, 0, bh * 0.3);
    ctx.restore();
  }
  // 큰 순간 띠
  if (s.band && s.t - s.band.t < 110 && s.phase !== 'result') {
    const k = s.t - s.band.t, a = Math.min(1, k / 6, (110 - k) / 18), sc = back(k / 12);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, tY(0.34));
    ctx.scale(sc, sc);
    ctx.rotate(-0.03);
    font(0.056);
    const tw = ctx.measureText(s.band.text).width + R(0.08);
    ctx.fillStyle = 'rgba(255,120,150,.92)';
    ctx.beginPath();
    ctx.moveTo(-tw / 2 - R(0.03), -R(0.04));
    ctx.lineTo(tw / 2 + R(0.03), -R(0.04));
    ctx.lineTo(tw / 2, 0);
    ctx.lineTo(tw / 2 + R(0.03), R(0.04));
    ctx.lineTo(-tw / 2 - R(0.03), R(0.04));
    ctx.lineTo(-tw / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(90,20,40,.6)';
    ctx.strokeText(s.band.text, 0, 1);
    ctx.fillStyle = s.band.col;
    ctx.fillText(s.band.text, 0, 1);
    ctx.restore();
  }
  // NEW 스포트라이트 (판 시작 3초)
  if (s.stage > 0 && bk < 200 && s.phase === 'pick') {
    const p = 0.5 + 0.5 * Math.sin(t * 0.15);
    let sx = -1, sy = 0, rr = 0;
    if (d.key === 'algae') (sx = X(0.175)), (sy = Y((MY0 + MY1) / 2)), (rr = R(0.17));
    else if (d.key === 'shark') {
      const sh = s.ents.find((e) => e.sp === SHARK && e.die < 0);
      if (sh) (sx = tX(sh.x)), (sy = tY(sh.y)), (rr = U * 0.17);
    } else if (d.key === 'night' || d.key === 'current') (sx = X(0.13 + (d.key === 'night' ? 1 : 2) * 0.05)), (sy = Y(0.08)), (rr = R(0.035));
    else (sx = X(cardCX(0))), (sy = Y((CY0 + CY1) / 2)), (rr = R(0.17));
    if (sx >= 0) {
      ctx.strokeStyle = `rgba(255,220,80,${0.6 + 0.4 * p})`;
      ctx.lineWidth = 3 + 2 * p;
      ctx.setLineDash([R(0.02), R(0.012)]);
      ctx.beginPath();
      ctx.arc(sx, sy, rr * (1 + 0.06 * p), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.03);
      ctx.fillStyle = '#ff5f6d';
      ctx.beginPath();
      ctx.roundRect(sx - R(0.04), sy - rr - R(0.04), R(0.08), R(0.034), R(0.01));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText('NEW', sx, sy - rr - R(0.022));
    }
  }
  // 처음: 손가락이 흰동가리 카드를 가리킨다
  if (s.stage === 0 && s.day === 0 && s.phase === 'pick' && s.taps === 0) {
    const bob = Math.abs(Math.sin(t * 0.1)) * R(0.02), fx0 = X(cardCX(0)) + R(0.05), fy0 = Y(CY0 - 0.03) + bob;
    drawHand(ctx, fx0, fy0, R(0.05), Math.PI + 0.35);
    font(0.04);
    const msg = '흰동가리 카드를 톡 → 퐁당!';
    const tw = ctx.measureText(msg).width + R(0.06);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, Y(TY1 - 0.075), tw, R(0.055), R(0.028));
    ctx.fill();
    ctx.strokeStyle = '#ff9f1c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#1d3a4a';
    ctx.fillText(msg, w / 2, Y(TY1 - 0.047));
  }
  // 빈 곳을 눌렀을 때
  if (s.t - s.miss < 50 && s.phase === 'pick') {
    font(0.038);
    ctx.globalAlpha = 1 - (s.t - s.miss) / 50;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(20,50,70,.7)';
    ctx.lineWidth = 3;
    ctx.strokeText('아래 카드를 톡!', X(s.ax), Y(s.ay * A) - R(0.03));
    ctx.fillText('아래 카드를 톡!', X(s.ax), Y(s.ay * A) - R(0.03));
    ctx.globalAlpha = 1;
  }
  // 판 결과
  if (s.phase === 'result') {
    const k = s.pt, a = Math.min(1, k / 12);
    ctx.fillStyle = `rgba(10,30,50,${0.35 * a})`;
    ctx.fillRect(X(TX0), Y(TY0), X(TX1) - X(TX0), Y(TY1) - Y(TY0));
    ctx.save();
    ctx.translate(w / 2, tY(0.42));
    const sc = back(k / 16);
    ctx.scale(sc, sc);
    const bw = R(0.8), bh = R(0.36);
    ctx.fillStyle = s.ok ? 'rgba(255,252,240,.97)' : 'rgba(255,240,236,.97)';
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, R(0.04));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffb02e' : '#e24a4a';
    ctx.lineWidth = 3;
    ctx.stroke();
    font(0.058);
    ctx.fillStyle = '#1d3a4a';
    if (s.ok) {
      ctx.fillText(s.won ? '어항 박사! 모두 성공' : `${d.name} 성공!`, 0, -bh * 0.33);
      const n = s.starOk.length;
      for (let i = 0; i < n; i++) {
        const sx = (i - (n - 1) / 2) * R(0.2), on = s.starOk[i], kk = k - 20 - i * 16, ss = on ? back(kk / 12) : 1;
        starPath(ctx, sx, -bh * 0.04, R(0.055) * (kk < 0 && on ? 0.01 : ss));
        ctx.fillStyle = on && kk >= 0 ? lin(ctx, sx, -bh * 0.15, sx, bh * 0.05, [[0, '#ffe680'], [1, '#ffb000']]) : '#e3e6ea';
        ctx.fill();
        ink(ctx, 2);
        font(0.032, 700);
        ctx.fillStyle = on ? '#6a4a00' : '#8a9aa6';
        ctx.fillText(d.stars[i].label, sx, bh * 0.2);
      }
      font(0.034);
      ctx.fillStyle = '#4a6a7a';
      ctx.fillText(`+${(CLEAR_PTS + s.got * STAR_PTS) * (s.stage + 1)}점`, 0, bh * 0.37);
    } else {
      ctx.fillText('으앗…', 0, -bh * 0.3);
      font(0.044);
      ctx.fillStyle = '#c42f2f';
      ctx.fillText(s.why, 0, -bh * 0.05);
      font(0.036, 700);
      ctx.fillStyle = '#4a6a7a';
      ctx.fillText(s.hearts > 0 ? '하트 -1 · 새 카드로 같은 어항 다시' : '하트를 다 썼어요 — 끝!', 0, bh * 0.2);
    }
    ctx.restore();
  }
}

function drawHand(ctx: Ctx, x: number, y: number, r: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.roundRect(-r * 0.18, -r * 1.25, r * 0.36, r * 1.1, r * 0.18);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ink(ctx, r * 0.1);
  ctx.beginPath();
  ctx.roundRect(-r * 0.5, -r * 0.4, r * 1.0, r * 0.9, r * 0.3);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ink(ctx, r * 0.1);
  ctx.strokeStyle = 'rgba(28,58,84,.5)';
  ctx.lineWidth = r * 0.06;
  for (let k = 0; k < 2; k++) (ctx.beginPath(), ctx.moveTo(-r * 0.2 + k * r * 0.25, -r * 0.35), ctx.lineTo(-r * 0.2 + k * r * 0.25, -r * 0.1), ctx.stroke());
  ctx.restore();
}
