/**
 * 보물섬 갈림길 탐험 (34라운드: 완전히 다른 장르 — 톡 하나) — 갈림길 탐험 × 연쇄 × 가리키기(톡).
 * 뼈대(갈림길 탐험 로그라이트): 여우 대장·곰 짐꾼·부엉이 길잡이 꼬마 탐험대가 보물섬을 아래에서 위로 오른다.
 *   갈림길마다 앞에 놓인 길 카드 2~3장 중 하나를 톡 → 탐험대가 그 길로 걸어가고 사건이 저절로 펼쳐진다
 *   (상자 딸깍 금화 와르르 · 괴물과 자동 싸움 퉁퉁 · 천막에서 쉬기 · 떠돌이 상인 · 어두운 동굴 · 물음표 · 우두머리).
 *   길 카드에는 결과가 미리 적혀 있고(체력 -4 · 금화 +12), 섬 전체 지도가 위에 다 보인다 — 어디서 싸우고 어디서 쉴지 길 전체를 짠다.
 * 조작: 톡 하나(포인터가 null → 값이 된 틱). 키보드는 ← → 로 카드 고르기(테두리) + 스페이스, 숫자 1·2·3.
 *   시간 압박 없음 — 안 누르면 탐험대가 두리번거리며 기다린다.
 * 판 6개(섬 하나씩): 꼭대기 보물에 닿으면 판 끝. 체력이 0이면 하트 -1, 그 섬 다시(같은 지도). 하트 셋을 다 잃으면 끝.
 * 별(쉬운 말, 1판 하나, 판마다 하나씩): 보물에 닿기 · 금화 N 모으기(닿을 때 지갑) · 체력 반 넘게 남기기 / 괴물 셋 무찌르기 / 우두머리 이기기.
 * 펼쳐짐(하는 일이 바뀐다): 1 숲 섬(상자·괴물·쉼터) → 2 화산 섬(떠돌이 상인 — 금화로 사과·방패, 별이 될 금화와 맞바꿈)
 *   → 3 얼음 섬(어두운 동굴 — 횃불이 있으면 보석 더미, 없으면 박쥐 떼: 미리 횃불 사 두기) → 4 유령 섬(물음표 길 — 큰 상자일까 함정일까)
 *   → 5 하늘 섬(대원 고르기 — 이 섬의 대장: 여우는 싸움 피해 -1, 곰은 쉼터·사과 두 배, 부엉이는 물음표 속이 보이고 동굴도 밝힘)
 *   → 6 해적 섬(큰 우두머리 — 꼭대기를 지키는 문어 선장: 방패·체력을 아껴 두기).
 * 웃음: 괴물에게 맞으면 여우 모자가 들썩, 쓰러지면 셋이 겹쳐 어질어질 별, 곰은 체력이 바닥나면 짐에서 사과를 꺼내 우적.
 *   해변의 꽃게와 갈매기가 큰 순간마다 폴짝·파닥.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// 화면 배치 (가로 폭 = 1 기준, 세로 = A)
const HUD_H = 0.085, CHIP_Y = 0.09, CHIP_H = 0.05;
const MAP_TOP = 0.148, FEET = 0.952, MAP_SPAN = 0.645, MAP_BOT = 1.0;
const BAR_Y = 1.0, BAR_H = 0.112;
const CARD_Y = 1.122, CARD_H = 0.352;
const SC = { x: 0.04, y: 0.19, w: 0.92, h: 0.66 };
const LANE = 0.29;

const WALK_T = 30, WALK_FIRST = 14, GOAL_WALK = 28, OPT_LOCK = 8;
const INTRO_T = 130, RESULT_T = 210, FAIL_T = 180, NEWS_T = 170;
const CLEAR_PTS = 30, STAR_PTS = 20, WIN_PTS = 100;

type K = 'chest' | 'monster' | 'camp' | 'shop' | 'cave' | 'mystery' | 'boss';
export type Item = 'apple' | 'torch' | 'shield';
type Out = 'big' | 'trap' | 'monster' | 'camp';
export type Crew = 'fox' | 'bear' | 'owl';
const PRICE: Record<Item, number> = { apple: 5, torch: 4, shield: 6 };
const I_NAME: Record<Item, string> = { apple: '사과', torch: '횃불', shield: '방패' };
const I_DESC: Record<Item, string> = { apple: '쓰러지기 전 +4', torch: '동굴을 밝혀요', shield: '싸움 피해 -3' };
const APPLE = 4, CAMP = 4, SHIELD = 3, TRAP = 3, BATS = 4, LOW = 3, BIG = 12, HPMAX = 10;
const M_DMG = [0, 3, 5, 7], M_GOLD = [0, 7, 12, 18];
const OUT_P: [Out, number][] = [['big', 0.35], ['trap', 0.3], ['monster', 0.2], ['camp', 0.15]];
const CREW: Crew[] = ['fox', 'bear', 'owl'];
const C_NAME: Record<Crew, string> = { fox: '여우 대장', bear: '곰 짐꾼', owl: '부엉이' };
const C_SHORT: Record<Crew, string> = { fox: '여우', bear: '곰', owl: '부엉이' };
const C_DESC: Record<Crew, [string, string]> = { fox: ['싸울 때', '피해 -1'], bear: ['쉼터·사과', '회복 두 배'], owl: ['물음표 속 보기', '동굴도 밝혀요'] };

type StarK = 'reach' | 'gold' | 'half' | 'kills' | 'boss';
interface Star { k: StarK; n: number; label: string; short: string }
const ST = (k: StarK, n: number, label: string, short: string): Star => ({ k, n, label, short });
interface Spec {
  key: string; name: string; news: string; tip: string; rows: number;
  wt: [K, number][]; pw: [number, number]; chest: [number, number]; cave: [number, number];
  /** 상인이 서는 줄(가운데 길): -1 없음 · -2 무작위 */
  shop: number; pool: Item[]; caves: number; boss: number; crew: boolean; stars: Star[]; newKey: string; newLabel: string;
}
const REACH = ST('reach', 0, '보물에 닿기', '보물 닿기');
const HALF = ST('half', 0, '체력 반 넘게 남기기', '체력 반 넘게');
const GOLD = (n: number) => ST('gold', n, `금화 ${n} 모으기`, `금화 ${n}`);
/** 섬 6개. 판마다 새것 하나 */
export const STAGES: Spec[] = [
  {
    key: 'forest', name: '숲 섬', news: '', tip: '상자는 금화, 괴물은 체력을 깎고 금화', rows: 4,
    wt: [['chest', 0.4], ['monster', 0.36], ['camp', 0.24]], pw: [1, 1], chest: [5, 8], cave: [0, 0], shop: -1, pool: [], caves: 0, boss: 0, crew: false,
    stars: [REACH], newKey: '', newLabel: '',
  },
  {
    key: 'volcano', name: '화산 섬', news: '떠돌이 상인 — 금화로 사과·방패를 사요', tip: '방패를 사면 싸움이 덜 아파요', rows: 5,
    wt: [['chest', 0.32], ['monster', 0.44], ['camp', 0.24]], pw: [1, 2], chest: [4, 7], cave: [0, 0], shop: 2, pool: ['apple', 'shield'], caves: 0, boss: 0, crew: false,
    stars: [REACH, HALF], newKey: 'shop', newLabel: '떠돌이 상인',
  },
  {
    key: 'ice', name: '얼음 섬', news: '어두운 동굴 — 횃불이 있으면 보석, 없으면 박쥐!', tip: '동굴에 가려면 먼저 횃불을 사요', rows: 6,
    wt: [['chest', 0.22], ['monster', 0.46], ['camp', 0.16], ['cave', 0.16]], pw: [1, 3], chest: [3, 6], cave: [16, 20], shop: 1, pool: ['torch', 'apple', 'shield'], caves: 2, boss: 0, crew: false,
    stars: [REACH, GOLD(30), HALF], newKey: 'cave', newLabel: '어두운 동굴',
  },
  {
    key: 'ghost', name: '유령 섬', news: '물음표 길 — 큰 상자일까, 함정일까?', tip: '체력이 넉넉할 때 물음표!', rows: 6,
    wt: [['chest', 0.16], ['monster', 0.42], ['camp', 0.12], ['cave', 0.08], ['mystery', 0.22]], pw: [2, 3], chest: [3, 6], cave: [16, 20], shop: -2, pool: ['torch', 'apple', 'shield'], caves: 1, boss: 0, crew: false,
    stars: [REACH, GOLD(35), HALF], newKey: 'mystery', newLabel: '물음표 길',
  },
  {
    key: 'sky', name: '하늘 섬', news: '대원 고르기 — 이 섬의 대장을 골라요', tip: '지도를 보고 대장을 골라요', rows: 6,
    wt: [['chest', 0.16], ['monster', 0.42], ['camp', 0.14], ['cave', 0.08], ['mystery', 0.2]], pw: [2, 3], chest: [3, 6], cave: [16, 20], shop: -2, pool: ['torch', 'apple', 'shield'], caves: 1, boss: 0, crew: true,
    stars: [REACH, GOLD(40), ST('kills', 3, '괴물 셋 무찌르기', '괴물 셋')], newKey: 'crew', newLabel: '대원 고르기',
  },
  {
    key: 'pirate', name: '해적 섬', news: '큰 우두머리 — 꼭대기를 지키는 문어 선장!', tip: '방패와 체력을 아껴 둬요', rows: 6,
    wt: [['chest', 0.16], ['monster', 0.42], ['camp', 0.16], ['cave', 0.06], ['mystery', 0.2]], pw: [2, 3], chest: [3, 6], cave: [16, 20], shop: -2, pool: ['torch', 'apple', 'shield'], caves: 1, boss: 8, crew: true,
    stars: [ST('boss', 0, '우두머리 이기기', '우두머리'), GOLD(50), HALF], newKey: 'boss', newLabel: '큰 우두머리',
  },
];
export const STAGE_COUNT = STAGES.length;

export interface Node { k: K; lane: number; gold: number; pw: number; dmg: number; heal: number; offers: Item[]; out: Out | null; done: boolean; seed: number }
type Map = (Node | null)[][];
const blank = (k: K, lane: number, seed: number): Node => ({ k, lane, gold: 0, pw: 0, dmg: 0, heal: 0, offers: [], out: null, done: false, seed });
/** 물음표 안의 것 (늘 같은 값 — 미리 계산하는 사람·봇이 같은 것을 쓴다) */
const MYST: Record<Out, Node> = {
  big: { ...blank('chest', 1, 0), gold: BIG },
  trap: { ...blank('chest', 1, 0), dmg: TRAP },
  monster: { ...blank('monster', 1, 0), pw: 2, dmg: M_DMG[2], gold: M_GOLD[2] },
  camp: { ...blank('camp', 1, 0), heal: CAMP },
};

// ───────────────────────────── 지도 ─────────────────────────────
/** 다음 줄에서 갈 수 있는 길(옆 칸까지) */
export function nextLanes(map: Map, r: number, l: number): number[] {
  const row = map[r + 1];
  const out: number[] = [];
  if (!row) return out;
  for (let k = l - 1; k <= l + 1; k++) if (k >= 0 && k < 3 && row[k]) out.push(k);
  return out;
}

function makeNode(rng: Rng, k: K, lane: number, d: Spec): Node {
  const n = blank(k, lane, Math.floor(rng() * 1e6));
  const ri = (a: number, b: number) => a + Math.floor(rng() * (b - a + 1));
  if (k === 'chest') n.gold = ri(d.chest[0], d.chest[1]);
  else if (k === 'monster') (n.pw = ri(d.pw[0], d.pw[1])), (n.dmg = M_DMG[n.pw]), (n.gold = M_GOLD[n.pw] + ri(0, 2));
  else if (k === 'camp') n.heal = CAMP;
  else if (k === 'cave') n.gold = ri(d.cave[0], d.cave[1]);
  else if (k === 'mystery') {
    let u = rng();
    n.out = 'camp';
    for (const [o, p] of OUT_P) if ((u -= p) < 0) { n.out = o; break; }
  } else if (k === 'boss') (n.pw = 4), (n.dmg = d.boss), (n.gold = 30);
  else if (k === 'shop') {
    const pool = [...d.pool];
    const first = d.caves > 0 && pool.includes('torch') ? 'torch' : pool.splice(Math.floor(rng() * pool.length), 1)[0];
    if (first === 'torch') pool.splice(pool.indexOf('torch'), 1);
    n.offers = [first, pool[Math.floor(rng() * pool.length)]].filter(Boolean) as Item[];
  }
  return n;
}

function rollKind(rng: Rng, d: Spec): K {
  let u = rng() * d.wt.reduce((a, [, w]) => a + w, 0);
  for (const [k, w] of d.wt) if ((u -= w) < 0) return k;
  return d.wt[0][0];
}

function genOnce(d: Spec, rng: Rng, stage: number): Map {
  const R = d.rows;
  const map: Map = [];
  for (let r = 0; r < R; r++) {
    const row: (Node | null)[] = [];
    for (let l = 0; l < 3; l++) row.push(makeNode(rng, rollKind(rng, d), l, d));
    // 한 줄이 다 같은 것이면 하나를 바꾼다 (고를 거리)
    if (row.every((n) => n!.k === row[0]!.k)) row[Math.floor(rng() * 3)] = makeNode(rng, row[0]!.k === 'monster' ? 'chest' : 'monster', 0, d);
    row.forEach((n, l) => n && (n.lane = l));
    map.push(row);
  }
  if (stage === 0) {
    // 첫 갈림길: 상자 둘·괴물 하나 (첫 톡이 무엇이든 1초 안에 큰 일)
    map[0] = [makeNode(rng, 'chest', 0, d), makeNode(rng, 'chest', 1, d), makeNode(rng, 'monster', 2, d)];
    map[0][1]!.gold = 8;
    map[0][0]!.gold = 6;
  }
  const shopRow = d.shop === -2 ? 1 + Math.floor(rng() * Math.max(1, R - 3)) : d.shop;
  if (shopRow >= 0) map[shopRow][1] = makeNode(rng, 'shop', 1, d);
  if (stage === 1 && shopRow >= 0) {
    // 상인을 처음 만나는 섬: 상인 양옆은 센 괴물 (상인 길이 쉬는 길)
    for (const l of [0, 2]) {
      const m = makeNode(rng, 'monster', l, { ...d, pw: [2, 2] });
      map[shopRow][l] = m;
    }
  }
  for (let c = 0, guard = 0; c < d.caves && guard < 40; guard++) {
    const r = Math.max(shopRow + 1, 1) + Math.floor(rng() * Math.max(1, R - Math.max(shopRow + 1, 1) - (d.boss ? 1 : 0)));
    const l = Math.floor(rng() * 3);
    if (r >= R || map[r][l]?.k === 'shop' || map[r][l]?.k === 'cave') continue;
    map[r][l] = makeNode(rng, 'cave', l, d);
    c++;
  }
  if (d.boss) map[R - 1] = [null, makeNode(rng, 'boss', 1, d), null];
  return map;
}

/** 지도는 시드로 정해진다. 별을 다 딸 수 있는 길이 있는 지도만 낸다 (모든 걸 아는 계산으로 확인) */
export function genMap(stage: number, seed: number): Map {
  const d = STAGES[stage];
  let last: Map = [];
  for (let a = 0; a < 60; a++) {
    const map = genOnce(d, mulberry32((seed ^ (stage * 0x9e3779b1)) + a * 7919), stage);
    last = map;
    const leaders: (Crew | null)[] = d.crew ? CREW : [null];
    let best = -1;
    for (const ld of leaders) best = Math.max(best, after({ map, spec: d, leader: ld, reveal: true, stars: true, memo: new Map() }, -1, 1, startPS()));
    if (best >= d.stars.length) return map;
  }
  return last;
}

// ───────────────────────────── 미리 계산 (게임·카드 미리 보기·봇이 같은 식을 쓴다) ─────────────────────────────
/** fear: 괴물을 연달아 이긴 수(최대 2) — 다음 괴물이 겁먹어 피해가 2씩 준다 (연쇄) */
export interface PS { hp: number; gold: number; apple: number; torch: number; shield: number; kills: number; boss: number; fear: number }
const startPS = (): PS => ({ hp: HPMAX, gold: 0, apple: 0, torch: 0, shield: 0, kills: 0, boss: 0, fear: 0 });
const FEAR = 2, FEAR_MAX = 2;
/** 싸움 피해: 겁먹음 -2씩, 여우 대장 -1, 방패가 있으면 다음 싸움에서 -3 (방패는 깨진다) */
function fightDmg(dmg: number, p: PS, leader: Crew | null) {
  let d = dmg - FEAR * p.fear - (leader === 'fox' ? 1 : 0);
  if (p.shield > 0) (p.shield--, (d -= SHIELD));
  return Math.max(0, d);
}
const healOf = (v: number, leader: Crew | null) => v * (leader === 'bear' ? 2 : 1);
/** 사건 하나의 결과. p를 바꾸고 얻은 금화를 돌려준다 */
function effect(kind: K | Out, n: Node, p: PS, leader: Crew | null): { gain: number; dead: boolean; taken: number; apples: number } {
  let gain = 0, taken = 0, apples = 0;
  const heal = (v: number) => (p.hp = Math.min(HPMAX, p.hp + healOf(v, leader)));
  const hurt = (v: number) => {
    taken = v;
    p.hp -= v;
    while (p.hp <= LOW && p.apple > 0) (p.apple--, heal(APPLE), apples++);
    return p.hp <= 0;
  };
  switch (kind) {
    case 'chest': case 'big': gain = n.gold; break;
    case 'camp': heal(n.heal); break;
    case 'trap': if (hurt(n.dmg)) return { gain, dead: true, taken, apples }; break;
    case 'cave':
      if (leader === 'owl' || p.torch > 0) {
        if (leader !== 'owl') p.torch--;
        gain = n.gold;
      } else if (hurt(BATS)) return { gain, dead: true, taken, apples };
      break;
    case 'monster': case 'boss':
      if (hurt(fightDmg(n.dmg, p, leader))) return { gain, dead: true, taken, apples };
      gain = n.gold;
      p.kills++;
      p.fear = Math.min(FEAR_MAX, p.fear + 1);
      if (kind === 'boss') p.boss = 1;
      p.gold += gain;
      return { gain, dead: false, taken, apples };
  }
  // 싸움이 아닌 곳에 들르면 기세(연쇄)가 끊긴다
  p.fear = 0;
  p.gold += gain;
  return { gain, dead: false, taken, apples };
}

interface Plan { map: Map; spec: Spec; leader: Crew | null; reveal: boolean; stars: boolean; memo: globalThis.Map<string, number> }
const DEAD = -5000;
function starsOf(d: Spec, p: PS): boolean[] {
  return d.stars.map((q) => (q.k === 'reach' ? true : q.k === 'gold' ? p.gold >= q.n : q.k === 'half' ? p.hp * 2 > HPMAX : q.k === 'kills' ? p.kills >= q.n : p.boss > 0));
}
function leaf(c: Plan, p: PS) {
  const n = starsOf(c.spec, p).filter(Boolean).length;
  return c.stars ? n : 1000 + n * 120 + p.hp * 2 + p.gold * 0.3 + (p.apple + p.torch + p.shield) * 0.5;
}
/** (r, l)의 사건을 마친 뒤부터 가장 좋은 값 */
function after(c: Plan, r: number, l: number, p: PS): number {
  if (r >= c.map.length - 1) return leaf(c, p);
  const key = `${r},${l},${p.hp},${p.gold},${p.apple},${p.torch},${p.shield},${p.kills},${p.boss},${p.fear}`;
  const m = c.memo.get(key);
  if (m !== undefined) return m;
  let best = -Infinity;
  for (const l2 of nextLanes(c.map, r, l)) best = Math.max(best, enter(c, r + 1, l2, p));
  c.memo.set(key, best);
  return best;
}
/** (r, l)로 걸어 들어갔을 때의 값 */
function enter(c: Plan, r: number, l: number, p: PS): number {
  const n = c.map[r][l]!;
  if (n.k === 'shop') {
    p = { ...p, fear: 0 };
    let best = after(c, r, l, p);
    for (const it of n.offers)
      if (p.gold >= PRICE[it]) {
        const q = { ...p, gold: p.gold - PRICE[it] };
        q[it]++;
        best = Math.max(best, after(c, r, l, q));
      }
    return best;
  }
  if (n.k === 'mystery') {
    if (c.reveal || c.leader === 'owl') return outcome(c, r, l, p, MYST[n.out!], n.out!);
    let v = 0;
    for (const [o, pr] of OUT_P) v += pr * outcome(c, r, l, p, MYST[o], o);
    return v;
  }
  return outcome(c, r, l, p, n, n.k);
}
function outcome(c: Plan, r: number, l: number, p: PS, n: Node, kind: K | Out): number {
  const q = { ...p };
  const e = effect(kind, n, q, c.leader);
  if (e.dead) return c.stars ? -1 : DEAD;
  return (c.stars ? 0 : e.gain) + after(c, r, l, q);
}

// ───────────────────────────── 상태 ─────────────────────────────
type Phase = 'intro' | 'crew' | 'pick' | 'walk' | 'event' | 'shop' | 'result' | 'fail';
export interface Opt { kind: 'path' | 'buy' | 'leave' | 'crew'; lane: number; item: Item | null; crew: Crew | null }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface TState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number;
  map: Map; R: number; row: number; lane: number; trail: number[]; cam: number;
  wl0: number; wl1: number; wt: number; wT: number; toGoal: boolean;
  /** 지금 펼쳐지는 사건: 종류 · 사건 시계 · 사건 칸 · 멈칫 · 미리 계산한 결과 */
  ek: string; et: number; node: Node | null; eff: Node | null; freeze: number; slow: number; res: { q: PS; gain: number; dead: boolean; taken: number; apples: number } | null; hits: number[]; shUsed: boolean; sceneT: number; bought: Item | null;
  hp: number; gold: number; apple: number; torch: number; shield: number; kills: number; boss: number; fear: number; fear0: number; leader: Crew | null;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  opts: Opt[]; optT: number; sel: number; kb: boolean; lastDir: number; down: boolean;
  seen: Set<string>; spotted: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { i: number; label: string; t: number } | null;
  events: Ev[]; wowN: number; firstPress: number; firstBig: number; picks: number; taps: number;
  // 연출용 (시뮬레이션과 무관)
  hurtT: number; cheerT: number; eatT: number; gainT: number; lossT: number; crabT: number;
}

const ev = (s: TState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: TState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const wow = (s: TState) => {
  s.wowN++;
  if (s.firstBig < 0 && s.firstPress >= 0) s.firstBig = s.t;
  s.cheerT = s.t;
  s.crabT = s.t;
};
const psOf = (s: TState): PS => ({ hp: s.hp, gold: s.gold, apple: s.apple, torch: s.torch, shield: s.shield, kills: s.kills, boss: s.boss, fear: s.fear });
const spec = (s: TState) => STAGES[s.stage];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** 카드 자리 (x·y는 가로 폭 기준) */
export function optRect(n: number, i: number) {
  const cw = n >= 3 ? 0.3 : n === 2 ? 0.42 : 0.6, gap = 0.024, tot = n * cw + (n - 1) * gap;
  return { x: 0.5 - tot / 2 + i * (cw + gap), y: CARD_Y, w: cw, h: CARD_H };
}

function setOpts(s: TState, opts: Opt[]) {
  s.opts = opts;
  s.optT = s.t;
  s.sel = s.kb ? clamp(s.sel, 0, opts.length - 1) : -1;
}
function pathOpts(s: TState) {
  setOpts(s, nextLanes(s.map, s.row, s.lane).map((l) => ({ kind: 'path', lane: l, item: null, crew: null })));
  // 새것 스포트라이트: 이 섬의 새것이 처음 카드로 나오면
  const d = spec(s);
  s.opts.forEach((o, i) => {
    const n = s.map[s.row + 1][o.lane]!;
    if (d.newKey && n.k === d.newKey && !s.spotted.has(n.k)) s.spotted.add(n.k), (s.spot = { i, label: d.newLabel, t: s.t });
    else if (s.fear > 0 && (n.k === 'monster' || n.k === 'boss') && !s.spotted.has('fearcard')) s.spotted.add('fearcard'), (s.spot = { i, label: '겁먹은 괴물', t: s.t });
  });
}

function newStage(s: TState, again: boolean) {
  const d = spec(s);
  if (!again || !s.map.length) s.map = genMap(s.stage, s.seed);
  for (const row of s.map) for (const n of row) if (n) n.done = false;
  s.R = d.rows;
  s.row = -1;
  s.lane = 1;
  s.trail = [1];
  s.cam = -1;
  s.toGoal = false;
  s.hp = HPMAX;
  s.gold = 0;
  s.apple = 0;
  s.torch = 0;
  s.shield = 0;
  s.kills = 0;
  s.boss = 0;
  s.fear = 0;
  s.leader = null;
  s.ek = '';
  s.node = null;
  s.eff = null;
  s.res = null;
  s.again = again;
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.pt = 0;
  s.opts = [];
  s.spot = null;
  if (s.stage === 0 && !again) {
    s.phase = 'pick';
    pathOpts(s);
  } else s.phase = 'intro';
}

function beginPlay(s: TState) {
  if (spec(s).crew) {
    s.phase = 'crew';
    setOpts(s, CREW.map((c) => ({ kind: 'crew', lane: 0, item: null, crew: c })));
    if (see(s, 'crew', '')) s.spot = { i: 1, label: '대원 고르기', t: s.t };
  } else {
    s.phase = 'pick';
    pathOpts(s);
  }
  s.pt = 0;
}

function choose(s: TState, i: number) {
  const o = s.opts[i];
  if (!o) return;
  if (o.kind === 'buy' && o.item && s.gold < PRICE[o.item]) {
    ev(s, 'poor', 0.5, CARD_Y - 0.03, 0, '금화가 모자라요');
    return;
  }
  s.taps++;
  s.spot = null;
  if (o.kind === 'crew') {
    s.leader = o.crew;
    ev(s, 'crew', 0.5, 0.6, 0, o.crew!);
    s.phase = 'pick';
    s.pt = 0;
    pathOpts(s);
    return;
  }
  if (o.kind === 'path') {
    s.picks++;
    s.phase = 'walk';
    s.wl0 = s.lane;
    s.wl1 = o.lane;
    s.wt = 0;
    s.wT = s.stage === 0 && s.picks === 1 ? WALK_FIRST : WALK_T;
    s.opts = [];
    ev(s, 'go', 0, 0, i);
    return;
  }
  // 상인: 하나 사거나 그냥 가기
  if (o.kind === 'buy' && o.item) {
    s.gold -= PRICE[o.item];
    s[o.item]++;
    s.bought = o.item;
    see(s, 'buy', '');
    ev(s, 'buy', 0.5, 0.55, PRICE[o.item], o.item);
  } else (s.bought = null), ev(s, 'leave', 0.5, 0.55);
  s.opts = [];
  s.phase = 'event';
  s.ek = 'bye';
  s.et = 0;
}

/** 사건 시작: 결과를 미리 계산해 두고, 사건 시계에 맞춰 화면 값(체력·금화)을 옮긴다 */
function startEvent(s: TState, n: Node | null, kind: string) {
  s.phase = 'event';
  s.ek = kind;
  s.et = 0;
  s.node = n;
  s.freeze = 0;
  s.res = null;
  s.hits = [];
  if (!n || kind === 'shop' || kind === 'mystery' || kind === 'goal') return;
  const eff = n.k === 'mystery' ? MYST[n.out!] : n;
  s.eff = eff;
  const q = psOf(s);
  const e = effect(kind as K | Out, eff, q, s.leader);
  s.res = { q, ...e };
  s.shUsed = q.shield < s.shield;
  s.fear0 = s.fear;
  // 맞는 것은 여러 번 퉁퉁 나눠서
  const k = kind === 'boss' ? 4 : kind === 'monster' ? 3 : 1;
  for (let i = 0; i < k; i++) s.hits.push(Math.floor(e.taken / k) + (i < e.taken % k ? 1 : 0));
}
/** 사건 시계 (틱) */
const T_EV: Record<string, { end: number; hit?: number[]; apple?: number; check?: number; gain?: number }> = {
  chest: { end: 64, gain: 8 },
  big: { end: 70, gain: 10 },
  camp: { end: 66, gain: 12 },
  monster: { end: 92, hit: [16, 28, 40], apple: 50, check: 56 },
  boss: { end: 136, hit: [22, 40, 58, 76], apple: 88, check: 96 },
  cave: { end: 84, hit: [16], apple: 40, check: 46, gain: 30 },
  trap: { end: 70, hit: [10], apple: 32, check: 38 },
};

function runEvent(s: TState) {
  const k = s.ek, et = s.et, r = s.res, T = T_EV[k];
  const cx = 0.5, cy = SC.y + SC.h * 0.5;
  if (k === 'mystery') {
    if (et === 1) see(s, 'mystery', '');
    if (et >= 20) {
      const out = s.node!.out!;
      ev(s, 'reveal', cx + 0.2, cy, 0, out);
      startEvent(s, s.node, out);
    }
    return;
  }
  if (k === 'shop') {
    if (et === 1) see(s, 'shop', ''), (s.fear = 0);
    if (et >= 16) {
      s.phase = 'shop';
      const n = s.node!;
      setOpts(s, [...n.offers.map((it): Opt => ({ kind: 'buy', lane: 0, item: it, crew: null })), { kind: 'leave', lane: 0, item: null, crew: null }]);
    }
    return;
  }
  if (k === 'bye') {
    if (et >= 36) endEvent(s);
    return;
  }
  if (k === 'goal') {
    if (et === 26) {
      see(s, 'goal', '');
      wow(s);
      ev(s, 'goal', cx, cy, 0);
      s.freeze = 6;
      s.slow = 30;
    }
    if (et >= 112) endStage(s, true, '');
    return;
  }
  if (!r || !T) return endEvent(s);
  // 맞기
  if (T.hit) {
    const hi = T.hit.indexOf(et);
    if (hi >= 0) {
      const d = s.hits[hi] ?? 0;
      if (hi === 0 && r.q.shield < s.shield) (s.shield = r.q.shield), see(s, 'shield', ''), ev(s, 'shield', cx - 0.12, cy, SHIELD);
      if (d > 0 || k === 'monster' || k === 'boss') {
        s.hp -= d;
        s.hurtT = s.t;
        s.lossT = s.t;
        ev(s, k === 'cave' ? 'bats' : k === 'trap' ? 'trap' : 'hit', cx - 0.15, cy, d, k);
        if (k === 'cave') see(s, 'bats', '');
        if (k === 'trap') see(s, 'trap', '');
      }
      if (k === 'cave' && r.taken === 0 && hi === 0) {
        // 횃불로 밝혔다
        if (s.leader !== 'owl') (s.torch = r.q.torch), see(s, 'torch', '');
        ev(s, 'light', cx + 0.15, cy, 0, s.leader === 'owl' ? 'owl' : 'torch');
      }
    }
  }
  if (T.apple === et && r.apples > 0) {
    s.apple = r.q.apple;
    s.hp = r.q.hp;
    s.eatT = s.t;
    see(s, 'apple', '');
    ev(s, 'apple', cx - 0.2, cy - 0.05, r.apples);
  }
  if (T.check === et) {
    if (r.dead) {
      s.hp = Math.min(s.hp, r.q.hp);
      return endStage(s, false, k === 'cave' ? '박쥐 떼에 쓰러졌어요' : k === 'trap' ? '함정에 빠져 쓰러졌어요' : '괴물에게 쓰러졌어요');
    }
    if (k === 'monster' || k === 'boss') {
      s.kills = r.q.kills;
      s.boss = r.q.boss;
      s.fear = r.q.fear;
      gainGold(s, r.gain, k);
      see(s, k, '');
      ev(s, k === 'boss' ? 'bosswin' : 'win', cx + 0.2, cy, r.gain);
      // 연쇄: 앞줄 괴물이 겁먹는다
      const ahead = s.row + 1 < s.R && s.map[s.row + 1].some((q) => q && (q.k === 'monster' || q.k === 'boss'));
      if (ahead && s.fear > 0) {
        if (see(s, 'fear', '연속으로 이기면 앞의 괴물이 겁먹어요!')) s.spotted.add('fear');
        if (s.fear >= 2) wow(s), (s.slow = 16);
        ev(s, 'fear', 0.5, 0.5, s.fear);
      }
    }
  }
  if (T.gain === et) {
    if (k === 'camp') {
      const h = r.q.hp - s.hp;
      s.hp = r.q.hp;
      see(s, 'camp', '');
      ev(s, 'heal', cx - 0.15, cy, h);
      s.cheerT = s.t;
    } else if (r.gain > 0) {
      gainGold(s, r.gain, k);
      see(s, k === 'big' ? 'big' : k, '');
    }
  }
  if (et >= T.end) {
    // 화면 값과 미리 계산한 값이 늘 같아지게
    Object.assign(s, { hp: r.q.hp, gold: r.q.gold, apple: r.q.apple, torch: r.q.torch, shield: r.q.shield, kills: r.q.kills, boss: r.q.boss, fear: r.q.fear });
    endEvent(s);
  }
}
function gainGold(s: TState, g: number, k: string) {
  s.gold += g;
  s.gainT = s.t;
  wow(s);
  s.freeze = k === 'chest' ? 5 : 7;
  if (k === 'boss') s.slow = 30;
  ev(s, 'gold', 0.62, SC.y + SC.h * 0.45, g, k);
}

function endEvent(s: TState) {
  if (s.node) s.node.done = true;
  s.ek = '';
  s.res = null;
  s.sceneT = -1;
  if (s.row >= s.R - 1) {
    // 마지막 줄을 지나면 꼭대기 보물로
    s.phase = 'walk';
    s.toGoal = true;
    s.wl0 = s.lane;
    s.wl1 = 1;
    s.wt = 0;
    s.wT = GOAL_WALK;
    return;
  }
  s.phase = 'pick';
  pathOpts(s);
}

function arrive(s: TState) {
  if (s.toGoal) {
    s.cam = s.R;
    s.lane = 1;
    s.toGoal = false;
    s.sceneT = s.t;
    startEvent(s, null, 'goal');
    return;
  }
  s.row++;
  s.lane = s.wl1;
  s.trail.push(s.lane);
  s.cam = s.row;
  const n = s.map[s.row][s.lane]!;
  s.sceneT = s.t;
  startEvent(s, n, n.k === 'mystery' && s.leader === 'owl' ? n.out! : n.k);
}

function endStage(s: TState, ok: boolean, why: string) {
  if (s.phase === 'result' || s.phase === 'fail') return;
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.opts = [];
  const d = spec(s);
  if (ok) {
    s.phase = 'result';
    s.starOk = starsOf(d, psOf(s));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 점수: 섬을 깨야 그 섬에서 들고 있는 금화가 점수가 된다 (쓰러지면 그 섬 금화는 없던 일)
    // 높은 섬일수록 보물이 크다
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (s.stage + 1) + s.gold;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5);
  } else {
    s.phase = 'fail';
    s.hearts--;
    s.tries++;
    s.hurtT = s.t;
    ev(s, 'fail', 0.5, 0.5, 0, why);
  }
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
export function hitOpt(s: TState, x: number, y: number): number {
  for (let i = 0; i < s.opts.length; i++) {
    const r = optRect(s.opts.length, i);
    if (x >= r.x - 0.012 && x <= r.x + r.w + 0.012 && y >= r.y - 0.02 && y <= r.y + r.h + 0.02) return i;
  }
  // 키보드로 고른 카드가 있으면 그것 (가상 커서가 지도 위에 있어도)
  if (s.kb && s.sel >= 0) return s.sel;
  // 지도 위의 갈림길 칸을 눌러도 된다
  if (s.phase === 'pick')
    for (let i = 0; i < s.opts.length; i++) {
      const [nx, ny, sc] = nodeXY(s, s.row + 1, s.opts[i].lane);
      if (Math.hypot(x - nx, y - ny) < 0.07 * sc + 0.02) return i;
    }
  return -1;
}

/** 지도 칸 자리 (3/4 시점: 아래쪽 줄은 넓고 크게, 꼭대기로 갈수록 좁고 작게). 카메라는 탐험대 줄을 늘 발밑에 둔다 */
export function nodeXY(s: TState, row: number, lane: number): [number, number, number] {
  const D = Math.max(1.2, s.R - s.cam), u = (row - s.cam) / D;
  const y = FEET - MAP_SPAN * u * (1.55 - 0.55 * u);
  const sc = clamp(1 - 0.42 * u, 0.5, 1.15);
  return [0.5 + (lane - 1) * LANE * (1 - 0.32 * u), y, sc];
}

const game: GameDef<TState> & { wows(s: TState): number } = {
  id: 'treasuremap',
  name: '보물섬 갈림길 탐험',
  genes: ['pathpick', 'chain', 'pointer'],
  twist: '괴물을 이기면 지도 위 앞줄 괴물들이 덜덜 떨며 약해진다(연달아 이길수록 더) — 싸움을 피하면 다음 싸움이 무섭고, 기세를 몰아 싸우면 쉬워져서, 결과가 다 적힌 길 카드와 끝까지 보이는 지도로 어디서 싸움을 몰아 하고 어디서 쉬고 무엇을 살지 길 전체를 짠다',
  rules: [
    '갈림길에서 길 카드 하나를 톡 — 탐험대가 그 길로 가요. 결과는 카드에 적혀 있어요.',
    '상자는 금화, 괴물은 체력을 깎고 금화, 천막은 쉬기. 괴물을 연달아 이기면 앞의 괴물이 겁먹어 약해져요.',
    '체력이 0이면 하트 -1, 그 섬 다시. 꼭대기 보물에 닿으면 끝 — 별 조건을 보고 길을 짜요.',
  ],
  controls: 'touch',
  hint: '길 카드를 톡 / ← → 로 고르고 스페이스, 숫자 1 2 3',
  aspect: A,
  art: {
    concept: '햇살 비치는 열대 보물섬 지도 위를 걷는 꼬마 탐험대 — 그림책 보물찾기',
    mood: '청록 바다에 둘러싸인 섬을 아래에서 위로 오른다. 야자수·폭포·바위·구름 사이로 모래 오솔길이 갈라지고, 여우 대장·곰 짐꾼·부엉이가 길 카드를 고를 때마다 상자가 딸깍 금화를 쏟고, 괴물과 퉁퉁 부딪치고, 천막에서 코 잔다.',
    palette: { bg: '#5fd6e8', ink: '#3a2412', muted: '#8a6a4a', accent: '#ffcf3a', hot: '#ff5f4a', soft: '#fff3d6' },
  },
  guard: (s) => s.hp,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'pick', pt: 0,
      map: [], R: 4, row: -1, lane: 1, trail: [1], cam: -1, wl0: 1, wl1: 1, wt: 0, wT: 1, toGoal: false,
      ek: '', et: 0, node: null, eff: null, freeze: 0, slow: 0, res: null, hits: [], shUsed: false, sceneT: -1, bought: null,
      hp: HPMAX, gold: 0, apple: 0, torch: 0, shield: 0, kills: 0, boss: 0, fear: 0, fear0: 0, leader: null,
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      opts: [], optT: 0, sel: -1, kb: false, lastDir: 0, down: false,
      seen: new Set<string>(), spotted: new Set<string>(), newsQ: [], news: null, spot: null, events: [], wowN: 0, firstPress: -1, firstBig: -1, picks: 0, taps: 0,
      hurtT: -999, cheerT: -999, eatT: -999, gainT: -999, lossT: -999, crabT: -999,
    } as TState;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    // 키보드: ← → 로 카드 고르기 (눈에 보이는 테두리)
    const dir = inp.dir ?? 0;
    if (dir !== s.lastDir) {
      if (dir !== 0 && s.opts.length) {
        s.kb = true;
        s.sel = s.sel < 0 ? (dir > 0 ? 0 : s.opts.length - 1) : clamp(s.sel + dir, 0, s.opts.length - 1);
      }
      s.lastDir = dir;
    }
    const can = s.opts.length > 0 && s.t - s.optT >= OPT_LOCK && (s.phase === 'pick' || s.phase === 'shop' || s.phase === 'crew');
    let choice = -1;
    if (can && inp.pick !== undefined && inp.pick < s.opts.length) choice = inp.pick;
    if (press) {
      if (s.firstPress < 0) s.firstPress = s.t;
      if (can) {
        const i = hitOpt(s, p.x, p.y * A);
        if (i >= 0) choice = i;
        else ev(s, 'nudge', p.x, p.y * A);
      } else if (s.phase === 'intro' && s.pt > 24) beginPlay(s);
      else if (s.phase === 'result' && s.pt > 80) s.pt = RESULT_T;
      else if (s.phase === 'fail' && s.pt > 80) s.pt = FAIL_T;
    }
    if (choice >= 0) choose(s, choice);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.events.length > 50 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.spot && s.t - s.spot.t > 160) s.spot = null;
    switch (s.phase) {
      case 'intro':
        if (s.pt >= INTRO_T) beginPlay(s);
        return;
      case 'walk': {
        s.wt++;
        const u = s.wt / s.wT, e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
        s.cam = (s.toGoal ? s.R - 1 : s.row) + e;
        if (s.wt >= s.wT) arrive(s);
        return;
      }
      case 'event':
        if (s.freeze > 0) {
          s.freeze--;
          return;
        }
        // 잠깐 느려짐: 큰 순간에는 사건 시계가 반 속도
        if (s.slow > 0 && s.slow-- % 2) return;
        s.et++;
        runEvent(s);
        return;
      case 'result':
        if (s.pt >= RESULT_T) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s, false);
        }
        return;
      case 'fail':
        if (s.pt >= FAIL_T) {
          if (s.hearts <= 0) s.dead = true;
          else newStage(s, true);
        }
        return;
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const treasuremap = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const tapOpt = (s: TState, i: number): Input => {
  const r = optRect(s.opts.length, i);
  return { tap: false, dir: 0, pointer: { x: r.x + r.w / 2, y: (r.y + r.h * 0.45) / A } };
};
/** 사람처럼: 카드가 뜨고 조금 본 다음 */
const ready = (s: TState) => !s.down && s.opts.length > 0 && s.t - s.optT >= OPT_LOCK + 6 && (s.phase === 'pick' || s.phase === 'shop' || s.phase === 'crew');

/** 잘하는 봇이 고를 카드 — 보이는 지도 전체를 끝까지 계산(물음표는 확률로) */
export function bestChoice(s: TState): number {
  const base: Plan = { map: s.map, spec: spec(s), leader: s.leader, reveal: false, stars: false, memo: new Map() };
  let bi = 0, bv = -Infinity;
  s.opts.forEach((o, i) => {
    let v = -Infinity;
    if (o.kind === 'path') v = enter(base, s.row + 1, o.lane, psOf(s));
    else if (o.kind === 'crew') v = after({ ...base, leader: o.crew, memo: new Map() }, -1, 1, psOf(s));
    else if (o.kind === 'leave') v = after(base, s.row, s.lane, psOf(s));
    else if (o.item && s.gold >= PRICE[o.item]) {
      const q = { ...psOf(s), gold: s.gold - PRICE[o.item] };
      q[o.item]++;
      v = after(base, s.row, s.lane, q);
    }
    if (v > bv + 1e-9) (bv = v), (bi = i);
  });
  return bi;
}
const brain = new WeakMap<object, { key: string; i: number }>();
export const treasuremapSmart: Bot<TState> = {
  name: '지도 끝까지 계산하는 탐험가',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.phase}:${s.row}:${s.lane}:${s.optT}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, i: bestChoice(s) }));
    return tapOpt(s, m.i);
  },
};

/** 버릇 봇: 늘 보물 상자 그림이 있는 길 (없으면 맨 왼쪽 카드) */
export const treasuremapHabit: Bot<TState> = {
  name: '버릇: 늘 상자 길',
  act(s) {
    if (!ready(s)) return NO;
    if (s.phase === 'pick') {
      const i = s.opts.findIndex((o) => s.map[s.row + 1][o.lane]?.k === 'chest');
      return tapOpt(s, Math.max(0, i));
    }
    return tapOpt(s, 0);
  },
};
/** 독립 버릇 봇: 늘 맨 왼쪽 카드 (생성기는 버릇 봇을 쓰지 않는다) */
export const treasuremapHabit2: Bot<TState> = {
  name: '버릇: 늘 왼쪽 길',
  act(s) {
    if (!ready(s)) return NO;
    return tapOpt(s, 0);
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 카드(가끔 아무 데나) 톡 */
export const treasuremapRandom: Bot<TState> = {
  name: '아무 카드나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 10 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 90);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (s.opts.length && rng() < 0.8) {
      const r = optRect(s.opts.length, Math.floor(rng() * s.opts.length));
      m.p = { x: r.x + r.w * (0.2 + rng() * 0.6), y: (r.y + r.h * (0.2 + rng() * 0.6)) / A };
    } else m.p = { x: rng(), y: rng() };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
type C2 = CanvasRenderingContext2D;
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
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)));
}
function starPath(ctx: C2, x: number, y: number, r: number, inner = 0.45) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * inner : r;
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
function burstPath(ctx: C2, x: number, y: number, rx: number, ry: number, n = 12, inner = 0.78) {
  ctx.beginPath();
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * TAU, q = i % 2 ? inner : 1;
    const px = x + Math.cos(a) * rx * q, py = y + Math.sin(a) * ry * q;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
const OUT = '#4a2a12';
const easeOut = (q: number) => 1 - Math.pow(1 - clamp(q, 0, 1), 3);
const back = (q: number) => {
  q = clamp(q, 0, 1);
  const c = 1.9;
  return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2);
};
/** 글자 (흰 테두리 + 색) */
function txt(ctx: C2, s: string, x: number, y: number, col: string, stroke = 'rgba(255,255,255,.95)', lw = 4) {
  ctx.lineJoin = 'round';
  if (lw > 0) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = col;
  ctx.fillText(s, x, y);
}

// ── 섬별 색 (모두 밝은 낮) ──
interface Pal { sea: [string, string, string]; sand: string; sandDk: string; g0: string; g1: string; gDk: string; path: string; pathDk: string; mon: [string, string, string]; sky: boolean; tree: number }
const PAL: Pal[] = [
  { sea: ['#36c2e0', '#5fd6ea', '#b8f4ee'], sand: '#ffe6a8', sandDk: '#e6b468', g0: '#9ee468', g1: '#74cc4c', gDk: '#3f9a3a', path: '#f7dca0', pathDk: '#c9965a', mon: ['#7ee05a', '#3c9a36', '#d4ffb0'], sky: false, tree: 0 },
  { sea: ['#2fb4dc', '#58cfe6', '#aaf0ee'], sand: '#ffdca6', sandDk: '#dc9e66', g0: '#d6e070', g1: '#b4c852', gDk: '#7e8c38', path: '#f6d098', pathDk: '#bc8048', mon: ['#ff7f50', '#c8402a', '#ffd6a8'], sky: false, tree: 1 },
  { sea: ['#3cbcec', '#82d8f6', '#d0f4ff'], sand: '#f0f8ff', sandDk: '#a8cce8', g0: '#ffffff', g1: '#e2f2ff', gDk: '#9cc4e6', path: '#d4e8f8', pathDk: '#86aed4', mon: ['#ffffff', '#8ab4dc', '#d8ecff'], sky: false, tree: 2 },
  { sea: ['#3ab6cc', '#6ad2da', '#bcefe8'], sand: '#f4e8ff', sandDk: '#c4a6e6', g0: '#c2ecd0', g1: '#9cd8b4', gDk: '#66a68a', path: '#ece0f8', pathDk: '#a88ecc', mon: ['#f8f4ff', '#a294d8', '#ffffff'], sky: false, tree: 3 },
  { sea: ['#5cbaf8', '#98d8ff', '#eaf8ff'], sand: '#ffffff', sandDk: '#c6dcf2', g0: '#b0ec80', g1: '#88d462', gDk: '#56a63e', path: '#fbe8b4', pathDk: '#d2aa66', mon: ['#b494f4', '#6e56c0', '#e6dcff'], sky: true, tree: 4 },
  { sea: ['#22a6d6', '#4ec6e6', '#a0eaf0'], sand: '#ffe2a2', sandDk: '#dea65e', g0: '#9cdc64', g1: '#76c44a', gDk: '#3e9038', path: '#f6d696', pathDk: '#c4925a', mon: ['#ff8c6c', '#c84a3a', '#ffd4c4'], sky: false, tree: 5 },
];

// ── 탐험대 ──
type Pose = 'idle' | 'walk' | 'cheer' | 'hurt' | 'dizzy' | 'scared' | 'rest' | 'eat';
function eyes(ctx: C2, x: number, y: number, r: number, gap: number, pose: Pose, t: number, look = 0) {
  ctx.fillStyle = '#2a1608';
  ctx.strokeStyle = '#2a1608';
  ctx.lineCap = 'round';
  if (pose === 'cheer') {
    ctx.lineWidth = Math.max(1.4, r * 0.7);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sd * gap, y + r * 0.4, r * 0.9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    return;
  }
  if (pose === 'rest') {
    ctx.lineWidth = Math.max(1.2, r * 0.55);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sd * gap, y - r * 0.2, r * 0.8, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    }
    return;
  }
  if (pose === 'hurt') {
    ctx.lineWidth = Math.max(1.3, r * 0.6);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sd * gap + sd * r, y - r);
      ctx.lineTo(x + sd * gap - sd * r * 0.6, y);
      ctx.lineTo(x + sd * gap + sd * r, y + r);
      ctx.stroke();
    }
    return;
  }
  if (pose === 'dizzy') {
    ctx.lineWidth = Math.max(1.1, r * 0.45);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = i * 0.9 + t * 0.3 * sd, q = (i / 14) * r * 1.2;
        const px = x + sd * gap + Math.cos(a) * q, py = y + Math.sin(a) * q;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    return;
  }
  const big = pose === 'scared' ? 1.35 : 1;
  const blink = (t + Math.floor(x)) % 170 < 6 && pose !== 'scared';
  for (const sd of [-1, 1]) {
    if (blink) {
      ctx.lineWidth = Math.max(1.2, r * 0.5);
      ctx.beginPath();
      ctx.moveTo(x + sd * gap - r, y);
      ctx.lineTo(x + sd * gap + r, y);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ell(ctx, x + sd * gap, y, r * 1.05 * big, r * 1.25 * big);
    ctx.fill();
    ctx.fillStyle = '#2a1608';
    ell(ctx, x + sd * gap + look * r * 0.35, y + r * 0.1, r * 0.72 * big, r * 0.9 * big);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, x + sd * gap + look * r * 0.35 - r * 0.25, y - r * 0.3, r * 0.28, r * 0.28);
    ctx.fill();
  }
}

function drawFox(ctx: C2, k: number, pose: Pose, t: number, look: number) {
  const lw = Math.max(1.5, k * 0.035);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  const step = pose === 'walk' ? Math.sin(t * 0.45) : 0;
  // 꼬리 (뒤에서 살랑)
  const wag = Math.sin(t * (pose === 'cheer' ? 0.5 : 0.12)) * 0.25;
  ctx.save();
  ctx.translate(-k * 0.2, -k * 0.28);
  ctx.rotate(-0.9 + wag);
  ctx.fillStyle = lin(ctx, 0, 0, 0, -k * 0.5, [0, '#f2741e'], [1, '#ff9a48']);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.2, -k * 0.06, -k * 0.5);
  ctx.quadraticCurveTo(k * 0.12, -k * 0.3, k * 0.08, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff6e8';
  ell(ctx, -k * 0.05, -k * 0.45, k * 0.06, k * 0.07, 0.3);
  ctx.fill();
  ctx.restore();
  // 다리 (장화)
  for (const sd of [-1, 1]) {
    const lift = pose === 'walk' ? Math.max(0, sd * step) * k * 0.06 : 0;
    ctx.fillStyle = '#6a3a1a';
    rr(ctx, sd * k * 0.09 - k * 0.055, -k * 0.13 - lift, k * 0.11, k * 0.13, k * 0.035);
    ctx.fill();
    ctx.stroke();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -k * 0.55, 0, -k * 0.1, [0, '#ff9440'], [1, '#e8641e']);
  ell(ctx, 0, -k * 0.3, k * 0.19, k * 0.21);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3e0';
  ell(ctx, 0, -k * 0.26, k * 0.11, k * 0.14);
  ctx.fill();
  // 조끼 + 지도 가방
  ctx.fillStyle = '#c8a46a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, -k * 0.42);
  ctx.quadraticCurveTo(-k * 0.2, -k * 0.2, -k * 0.13, -k * 0.13);
  ctx.lineTo(-k * 0.07, -k * 0.14);
  ctx.lineTo(-k * 0.08, -k * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(k * 0.17, -k * 0.42);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.2, k * 0.13, -k * 0.13);
  ctx.lineTo(k * 0.07, -k * 0.14);
  ctx.lineTo(k * 0.08, -k * 0.44);
  ctx.closePath();
  ctx.fill();
  // 팔
  const up = pose === 'cheer' ? 1 : 0;
  for (const sd of [-1, 1]) {
    const sx = sd * k * 0.16, sy = -k * 0.4;
    const hx = up ? sd * k * 0.3 : pose === 'scared' ? sd * k * 0.12 : sd * k * 0.24, hy = up ? -k * 0.78 + Math.sin(t * 0.5 + sd) * k * 0.04 : pose === 'scared' ? -k * 0.6 : -k * 0.2 + (pose === 'walk' ? sd * step * k * 0.04 : 0);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.085 + lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = '#f07a2a';
    ctx.lineWidth = k * 0.085;
    ctx.stroke();
    ctx.fillStyle = '#4a2a14';
    ell(ctx, hx, hy, k * 0.045, k * 0.045);
    ctx.fill();
  }
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUT;
  // 목도리
  ctx.fillStyle = '#3cb05a';
  rr(ctx, -k * 0.15, -k * 0.5, k * 0.3, k * 0.07, k * 0.035);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(k * 0.08, -k * 0.46);
  ctx.quadraticCurveTo(k * 0.2, -k * 0.4 + Math.sin(t * 0.2) * k * 0.02, k * 0.24, -k * 0.34);
  ctx.lineTo(k * 0.16, -k * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 머리
  const hx0 = look * k * 0.03, hy0 = -k * 0.66;
  ctx.save();
  ctx.translate(hx0, hy0);
  ctx.rotate(look * 0.12);
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#f07a2a';
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.08, -k * 0.13);
    ctx.lineTo(sd * k * 0.2, -k * 0.34);
    ctx.lineTo(sd * k * 0.22, -k * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3a1e0c';
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.17, -k * 0.27);
    ctx.lineTo(sd * k * 0.2, -k * 0.34);
    ctx.lineTo(sd * k * 0.205, -k * 0.24);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, -k * 0.2, 0, k * 0.15, [0, '#ffa250'], [1, '#ec6c20']);
  ctx.beginPath();
  ctx.moveTo(-k * 0.22, -k * 0.06);
  ctx.quadraticCurveTo(-k * 0.22, -k * 0.2, 0, -k * 0.2);
  ctx.quadraticCurveTo(k * 0.22, -k * 0.2, k * 0.22, -k * 0.06);
  ctx.quadraticCurveTo(k * 0.2, k * 0.08, 0, k * 0.14);
  ctx.quadraticCurveTo(-k * 0.2, k * 0.08, -k * 0.22, -k * 0.06);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 흰 볼
  ctx.fillStyle = '#fff6ea';
  ctx.beginPath();
  ctx.moveTo(-k * 0.2, k * 0.0);
  ctx.quadraticCurveTo(-k * 0.08, -k * 0.02, 0, k * 0.04);
  ctx.quadraticCurveTo(k * 0.08, -k * 0.02, k * 0.2, k * 0.0);
  ctx.quadraticCurveTo(k * 0.12, k * 0.12, 0, k * 0.14);
  ctx.quadraticCurveTo(-k * 0.12, k * 0.12, -k * 0.2, k * 0.0);
  ctx.closePath();
  ctx.fill();
  eyes(ctx, 0, -k * 0.06, k * 0.035, k * 0.085, pose, t, look);
  ctx.fillStyle = '#2a1608';
  ell(ctx, 0, k * 0.055, k * 0.03, k * 0.022);
  ctx.fill();
  // 입
  ctx.strokeStyle = '#2a1608';
  ctx.lineWidth = Math.max(1.2, k * 0.02);
  if (pose === 'cheer' || pose === 'scared') {
    ctx.fillStyle = '#9a2a2a';
    ell(ctx, 0, k * 0.1, k * 0.04, k * (pose === 'scared' ? 0.04 : 0.03));
    ctx.fill();
  } else if (pose === 'hurt' || pose === 'dizzy') {
    ctx.beginPath();
    ctx.moveTo(-k * 0.04, k * 0.11);
    ctx.quadraticCurveTo(0, k * 0.08, k * 0.04, k * 0.11);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(-k * 0.035, k * 0.085);
    ctx.quadraticCurveTo(0, k * 0.11, k * 0.035, k * 0.085);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,120,.45)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.13, k * 0.03, k * 0.035, k * 0.022);
    ctx.fill();
  }
  // 탐험 모자 (맞으면 들썩)
  const hop = pose === 'hurt' ? -k * 0.08 : pose === 'cheer' ? -k * 0.03 * Math.abs(Math.sin(t * 0.4)) : 0;
  ctx.save();
  ctx.translate(0, hop);
  ctx.rotate(pose === 'hurt' ? -0.3 : pose === 'dizzy' ? 0.4 : 0);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = lin(ctx, 0, -k * 0.34, 0, -k * 0.14, [0, '#fff0c0'], [1, '#e2c27a']);
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.17, k * 0.16, k * 0.14, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c84a2a';
  ctx.fillRect(-k * 0.155, -k * 0.21, k * 0.31, k * 0.04);
  ctx.fillStyle = '#ecd08c';
  ell(ctx, 0, -k * 0.16, k * 0.27, k * 0.055);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

function drawBear(ctx: C2, k: number, pose: Pose, t: number, bag: { apple: number; torch: number; shield: number }, look: number) {
  const lw = Math.max(1.5, k * 0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  const step = pose === 'walk' ? Math.sin(t * 0.45 + 1.6) : 0;
  // 큰 짐 가방 (뒤)
  const bx = -k * 0.02, by = -k * 0.78;
  ctx.fillStyle = lin(ctx, bx - k * 0.3, 0, bx + k * 0.3, 0, [0, '#5f8a34'], [0.5, '#7aa844'], [1, '#4e7a2a']);
  rr(ctx, bx - k * 0.28, by - k * 0.1, k * 0.56, k * 0.5, k * 0.12);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e6c27a';
  rr(ctx, bx - k * 0.3, by - k * 0.14, k * 0.6, k * 0.1, k * 0.05);
  ctx.fill();
  ctx.stroke();
  // 짐: 횃불 · 방패 · 사과
  for (let i = 0; i < Math.min(3, bag.torch); i++) {
    const tx = bx + k * (0.12 + i * 0.07), ty = by - k * 0.12;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(0.25 + i * 0.12);
    drawTorch(ctx, 0, 0, k * 0.16, false, t);
    ctx.restore();
  }
  if (bag.shield > 0) {
    drawShieldIcon(ctx, bx - k * 0.26, by + k * 0.2, k * 0.16);
    if (bag.shield > 1) drawShieldIcon(ctx, bx - k * 0.3, by + k * 0.06, k * 0.13);
  }
  for (let i = 0; i < Math.min(3, bag.apple); i++) drawApple(ctx, bx + k * (0.2 - i * 0.02), by + k * (0.12 + i * 0.1), k * 0.065);
  // 다리
  for (const sd of [-1, 1]) {
    const lift = pose === 'walk' ? Math.max(0, sd * step) * k * 0.05 : 0;
    ctx.fillStyle = '#7a4a26';
    rr(ctx, sd * k * 0.12 - k * 0.07, -k * 0.15 - lift, k * 0.14, k * 0.15, k * 0.05);
    ctx.fill();
    ctx.stroke();
  }
  // 몸
  ctx.fillStyle = lin(ctx, 0, -k * 0.7, 0, -k * 0.1, [0, '#c08a58'], [1, '#94603a']);
  ell(ctx, 0, -k * 0.36, k * 0.26, k * 0.27);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2d6a8';
  ell(ctx, 0, -k * 0.3, k * 0.15, k * 0.17);
  ctx.fill();
  // 멜빵
  ctx.strokeStyle = '#6a4220';
  ctx.lineWidth = k * 0.04;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.18, -k * 0.56);
    ctx.lineTo(sd * k * 0.12, -k * 0.2);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  // 팔
  for (const sd of [-1, 1]) {
    const sx = sd * k * 0.22, sy = -k * 0.48;
    let hx = sd * k * 0.3, hy = -k * 0.24;
    if (pose === 'cheer') (hx = sd * k * 0.36), (hy = -k * 0.86 + Math.sin(t * 0.45 + sd) * k * 0.05);
    if (pose === 'eat' && sd > 0) (hx = k * 0.06), (hy = -k * 0.66);
    if (pose === 'scared') (hx = sd * k * 0.16), (hy = -k * 0.72);
    ctx.lineWidth = k * 0.11 + lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = '#a8703e';
    ctx.lineWidth = k * 0.11;
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.fillStyle = '#8a5a30';
    ell(ctx, hx, hy, k * 0.06, k * 0.06);
    ctx.fill();
    if (pose === 'eat' && sd > 0) drawApple(ctx, hx + k * 0.02, hy - k * 0.04, k * 0.07, Math.floor(t / 8) % 3);
  }
  // 머리
  const hy0 = -k * 0.76 + (pose === 'eat' ? Math.sin(t * 0.8) * k * 0.01 : 0);
  ctx.save();
  ctx.translate(look * k * 0.025, hy0);
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#a8703e';
    ell(ctx, sd * k * 0.17, -k * 0.14, k * 0.075, k * 0.075);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2c69a';
    ell(ctx, sd * k * 0.17, -k * 0.14, k * 0.038, k * 0.038);
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, -k * 0.2, 0, k * 0.15, [0, '#c8925e'], [1, '#a06a3c']);
  ell(ctx, 0, 0, k * 0.22, k * 0.19);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4dcb4';
  ell(ctx, 0, k * 0.06, k * 0.1, k * 0.075);
  ctx.fill();
  eyes(ctx, 0, -k * 0.03, k * 0.03, k * 0.085, pose, t, look);
  ctx.fillStyle = '#2a1608';
  ell(ctx, 0, k * 0.035, k * 0.035, k * 0.025);
  ctx.fill();
  if (pose === 'eat') {
    ctx.fillStyle = '#d0907a';
    for (const sd of [-1, 1]) {
      ell(ctx, sd * k * 0.09, k * 0.08, k * 0.045, k * 0.04);
      ctx.fill();
    }
  } else if (pose === 'cheer' || pose === 'scared') {
    ctx.fillStyle = '#9a2a2a';
    ell(ctx, 0, k * 0.1, k * 0.035, k * 0.03);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, k * 0.016);
    ctx.beginPath();
    ctx.moveTo(-k * 0.03, k * 0.085);
    ctx.quadraticCurveTo(0, pose === 'hurt' || pose === 'dizzy' ? k * 0.07 : k * 0.11, k * 0.03, k * 0.085);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,120,.4)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.14, k * 0.04, k * 0.035, k * 0.022);
    ctx.fill();
  }
  ctx.restore();
}

function drawOwl(ctx: C2, k: number, pose: Pose, t: number, look: number) {
  const lw = Math.max(1.3, k * 0.04);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  const flap = pose === 'cheer' || pose === 'scared' ? Math.sin(t * 0.9) * 0.6 : Math.sin(t * 0.05) * 0.08;
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * k * 0.2, -k * 0.35);
    ctx.rotate(sd * (0.3 + flap));
    ctx.fillStyle = '#8a5a34';
    ell(ctx, sd * k * 0.06, k * 0.06, k * 0.09, k * 0.2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.fillStyle = lin(ctx, 0, -k * 0.7, 0, 0, [0, '#c8945e'], [1, '#9a6a3c']);
  ell(ctx, 0, -k * 0.34, k * 0.25, k * 0.33);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f4e2c2';
  ell(ctx, 0, -k * 0.2, k * 0.15, k * 0.17);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,90,50,.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(0, -k * (0.28 - i * 0.07), k * 0.05, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // 귀깃
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#8a5a34';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.1, -k * 0.6);
    ctx.lineTo(sd * k * 0.22, -k * 0.76);
    ctx.lineTo(sd * k * 0.22, -k * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 큰 눈 (노란 테)
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffd84a';
    ell(ctx, sd * k * 0.1, -k * 0.48, k * 0.095, k * 0.095);
    ctx.fill();
    ctx.stroke();
  }
  eyes(ctx, 0, -k * 0.48, k * 0.055, k * 0.1, pose, t, look);
  ctx.fillStyle = '#ff9a2a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.035, -k * 0.38);
  ctx.lineTo(k * 0.035, -k * 0.38);
  ctx.lineTo(0, -k * 0.31);
  ctx.closePath();
  ctx.fill();
  // 꼬마 길잡이 모자
  ctx.fillStyle = '#2a6ad8';
  ctx.beginPath();
  ctx.ellipse(0, -k * 0.62, k * 0.12, k * 0.08, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd84a';
  ell(ctx, 0, -k * 0.66, k * 0.025, k * 0.025);
  ctx.fill();
}

/** 탐험대 셋 (발밑 x, y · 곰 키 k) */
function drawParty(ctx: C2, x: number, y: number, k: number, pose: Pose, t: number, bag: { apple: number; torch: number; shield: number }, leader: Crew | null, opt?: { owlPose?: Pose; bearPose?: Pose; dx?: number }) {
  const bob = pose === 'walk' ? -Math.abs(Math.sin(t * 0.45)) * k * 0.05 : pose === 'cheer' ? -Math.abs(Math.sin(t * 0.25)) * k * 0.14 : 0;
  const look = pose === 'idle' ? (Math.sin(t * 0.035) > 0.55 ? 1 : Math.sin(t * 0.035) < -0.55 ? -1 : 0) : 0;
  const shake = pose === 'hurt' ? Math.sin(t * 1.7) * k * 0.03 : pose === 'scared' ? Math.sin(t * 2.3) * k * 0.015 : 0;
  // 그림자
  ctx.fillStyle = 'rgba(40,60,20,.25)';
  ell(ctx, x, y + 2, k * 0.62, k * 0.12);
  ctx.fill();
  ctx.save();
  ctx.translate(x + shake + (opt?.dx ?? 0), y);
  if (pose === 'dizzy') ctx.rotate(Math.sin(t * 0.15) * 0.08);
  // 곰 (뒤 왼쪽)
  ctx.save();
  ctx.translate(-k * 0.22, bob * 0.8);
  drawBear(ctx, k, opt?.bearPose ?? pose, t, bag, look);
  // 부엉이 (곰 가방 위)
  ctx.translate(-k * 0.02, -k * 0.92 + (pose === 'cheer' ? -Math.abs(Math.sin(t * 0.3)) * k * 0.2 : Math.sin(t * 0.06) * k * 0.01));
  drawOwl(ctx, k * 0.42, opt?.owlPose ?? (pose === 'walk' ? 'idle' : pose), t, look);
  ctx.restore();
  // 여우 (앞 오른쪽)
  ctx.save();
  ctx.translate(k * 0.3, bob + k * 0.03);
  drawFox(ctx, k * 0.86, pose, t, -look);
  ctx.restore();
  // 대장 깃발: 고른 대장 머리 위
  if (leader) {
    const lx = leader === 'fox' ? k * 0.3 : leader === 'bear' ? -k * 0.22 : -k * 0.24, ly = leader === 'fox' ? -k * 0.98 : leader === 'bear' ? -k * 1.12 : -k * 1.32;
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    starPath(ctx, lx, ly + bob, k * 0.08);
    ctx.fill();
    ctx.stroke();
  }
  // 어질어질 별
  if (pose === 'dizzy') {
    for (let i = 0; i < 4; i++) {
      const a = t * 0.12 + (i / 4) * TAU;
      ctx.fillStyle = '#ffe14a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      starPath(ctx, Math.cos(a) * k * 0.4, -k * 0.95 + Math.sin(a) * k * 0.1, k * 0.06);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── 물건 ──
function drawCoin(ctx: C2, x: number, y: number, r: number, spin = 0) {
  const sx = Math.max(0.15, Math.abs(Math.cos(spin)));
  ctx.fillStyle = '#c98a10';
  ell(ctx, x, y + r * 0.12, r * sx, r);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, '#fff3a0'], [0.5, '#ffd23a'], [1, '#f0a818']);
  ell(ctx, x, y, r * sx, r);
  ctx.fill();
  ctx.strokeStyle = '#a86a08';
  ctx.lineWidth = Math.max(1, r * 0.16);
  ell(ctx, x, y, r * sx * 0.66, r * 0.66);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ell(ctx, x - r * sx * 0.3, y - r * 0.35, r * sx * 0.22, r * 0.14, -0.5);
  ctx.fill();
}
function drawApple(ctx: C2, x: number, y: number, r: number, bites = 0) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.18);
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, '#ff6a5a'], [1, '#d62a2a']);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.7);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 1.2, x - r * 1.2, y + r * 1.1, x, y + r);
  ctx.bezierCurveTo(x + r * 1.2, y + r * 1.1, x + r * 1.3, y - r * 1.2, x, y - r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (bites > 0) {
    ctx.fillStyle = '#fff2d8';
    for (let i = 0; i < bites; i++) {
      ell(ctx, x + r * 0.9, y - r * 0.2 + i * r * 0.45, r * 0.32, r * 0.3);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ell(ctx, x - r * 0.4, y - r * 0.25, r * 0.22, r * 0.32, 0.3);
  ctx.fill();
  ctx.strokeStyle = '#6a3a14';
  ctx.lineWidth = Math.max(1, r * 0.2);
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.65);
  ctx.lineTo(x + r * 0.1, y - r * 1.15);
  ctx.stroke();
  ctx.fillStyle = '#4cb84a';
  ell(ctx, x + r * 0.4, y - r * 1.0, r * 0.35, r * 0.17, -0.5);
  ctx.fill();
}
function drawTorch(ctx: C2, x: number, y: number, k: number, lit: boolean, t: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.06);
  ctx.fillStyle = '#9a6234';
  rr(ctx, x - k * 0.07, y - k * 0.1, k * 0.14, k * 0.75, k * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8d4a0';
  rr(ctx, x - k * 0.11, y - k * 0.22, k * 0.22, k * 0.16, k * 0.04);
  ctx.fill();
  ctx.stroke();
  if (lit) {
    const f = 1 + 0.15 * Math.sin(t * 0.7);
    ctx.fillStyle = radg(ctx, x, y - k * 0.35, 0, k * 0.9 * f, [0, 'rgba(255,220,120,.6)'], [1, 'rgba(255,200,80,0)']);
    ell(ctx, x, y - k * 0.35, k * 0.9 * f, k * 0.9 * f);
    ctx.fill();
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(x - k * 0.13, y - k * 0.22);
    ctx.quadraticCurveTo(x - k * 0.16, y - k * 0.45, x + Math.sin(t * 0.5) * k * 0.04, y - k * 0.62 * f);
    ctx.quadraticCurveTo(x + k * 0.16, y - k * 0.45, x + k * 0.13, y - k * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe26a';
    ell(ctx, x, y - k * 0.32, k * 0.07, k * 0.12);
    ctx.fill();
  }
}
function drawShieldIcon(ctx: C2, x: number, y: number, r: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.fillStyle = lin(ctx, x - r, y - r, x + r, y + r, [0, '#8ac8ff'], [1, '#2a78d8']);
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.95, y - r * 0.85, x + r * 0.9, y - r * 0.2);
  ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.7, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.7, x - r * 0.9, y - r * 0.2);
  ctx.quadraticCurveTo(x - r * 0.95, y - r * 0.85, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  starPath(ctx, x, y - r * 0.05, r * 0.42);
  ctx.fill();
}
function drawSkull(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.16);
  ell(ctx, x, y - r * 0.15, r * 0.85, r * 0.75);
  ctx.fill();
  ctx.stroke();
  rr(ctx, x - r * 0.45, y + r * 0.3, r * 0.9, r * 0.45, r * 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = OUT;
  for (const sd of [-1, 1]) {
    ell(ctx, x + sd * r * 0.33, y - r * 0.1, r * 0.2, r * 0.22);
    ctx.fill();
  }
}
function drawChest(ctx: C2, x: number, y: number, k: number, open: number, t: number, big = false) {
  const w = k * (big ? 1.25 : 1), hb = w * 0.42, hl = w * 0.28;
  const lw = Math.max(1.5, k * 0.035);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = 'rgba(40,40,20,.25)';
  ell(ctx, x, y + 2, w * 0.6, w * 0.1);
  ctx.fill();
  // 안쪽 빛 · 금화
  if (open > 0.05) {
    ctx.fillStyle = radg(ctx, x, y - hb, 0, w * 1.1, [0, `rgba(255,240,150,${0.7 * open})`], [1, 'rgba(255,230,120,0)']);
    ell(ctx, x, y - hb, w * 1.1, w * 0.9);
    ctx.fill();
  }
  // 몸통
  ctx.fillStyle = lin(ctx, x, y - hb, x, y, [0, big ? '#d0782e' : '#b8692a'], [1, big ? '#8e4618' : '#7a4018']);
  rr(ctx, x - w / 2, y - hb, w, hb, w * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,30,10,.4)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x - w / 2 + 2, y - hb + (hb * i) / 3);
    ctx.lineTo(x + w / 2 - 2, y - hb + (hb * i) / 3);
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#ffcf3a';
  for (const sd of [-1, 1]) {
    rr(ctx, x + sd * w * 0.32 - w * 0.05, y - hb, w * 0.1, hb, 2);
    ctx.fill();
    ctx.stroke();
  }
  if (open > 0.05) {
    // 금화 더미
    ctx.fillStyle = lin(ctx, x, y - hb - w * 0.12, x, y - hb, [0, '#fff3a0'], [1, '#f0b020']);
    ctx.beginPath();
    ctx.moveTo(x - w * 0.46, y - hb);
    ctx.quadraticCurveTo(x, y - hb - w * 0.28 * open, x + w * 0.46, y - hb);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 5; i++) drawCoin(ctx, x - w * 0.3 + i * w * 0.15, y - hb - w * (0.04 + (i % 2) * 0.06) * open, w * 0.06, i);
    if (big) for (let i = 0; i < 3; i++) drawGem(ctx, x - w * 0.18 + i * w * 0.18, y - hb - w * 0.16 * open, w * 0.06, i);
  }
  // 뚜껑 (열리면 뒤로 젖혀짐)
  ctx.save();
  ctx.translate(x, y - hb);
  const sy = 1 - open * 1.7;
  ctx.scale(1, sy === 0 ? 0.01 : sy);
  ctx.fillStyle = lin(ctx, 0, -hl, 0, 0, [0, big ? '#e2904a' : '#cc7a3a'], [1, big ? '#a85a20' : '#8e4a1c']);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -hl * 0.4);
  ctx.quadraticCurveTo(-w / 2, -hl, 0, -hl);
  ctx.quadraticCurveTo(w / 2, -hl, w / 2, -hl * 0.4);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffcf3a';
  for (const sd of [-1, 1]) {
    rr(ctx, sd * w * 0.32 - w * 0.05, -hl * 0.97, w * 0.1, hl * 0.97, 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  // 자물쇠
  if (open < 0.5) {
    ctx.fillStyle = '#ffe066';
    rr(ctx, x - w * 0.07, y - hb - w * 0.04, w * 0.14, w * 0.14, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = OUT;
    ell(ctx, x, y - hb + w * 0.02, w * 0.02, w * 0.025);
    ctx.fill();
  }
  // 반짝
  const tw = 0.5 + 0.5 * Math.sin(t * 0.15);
  ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * tw})`;
  starPath(ctx, x + w * 0.38, y - hb - hl * 0.6, w * 0.07 * (0.6 + tw * 0.5), 0.3);
  ctx.fill();
}
function drawGem(ctx: C2, x: number, y: number, r: number, i: number) {
  const cols = [['#7affe0', '#18b89a'], ['#ff8ad0', '#d02a8a'], ['#9ab8ff', '#3a5ae0'], ['#fff07a', '#e0a020']][i % 4];
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, cols[0]], [1, cols[1]]);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.15);
  ctx.beginPath();
  ctx.moveTo(x - r, y - r * 0.2);
  ctx.lineTo(x - r * 0.5, y - r);
  ctx.lineTo(x + r * 0.5, y - r);
  ctx.lineTo(x + r, y - r * 0.2);
  ctx.lineTo(x, y + r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.5, y - r * 0.8);
  ctx.lineTo(x, y - r * 0.8);
  ctx.lineTo(x - r * 0.3, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

type MonMood = 'idle' | 'angry' | 'hurt' | 'scared';
/** 섬마다 다른 꼬마 괴물 (k = 키). look: 섬 번호 */
function drawMonster(ctx: C2, x: number, y: number, k: number, look: number, mood: MonMood, t: number) {
  const C = PAL[look].mon, lw = Math.max(1.5, k * 0.035);
  const sq = mood === 'hurt' ? 0.82 : 1 + Math.sin(t * 0.15) * 0.04;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,30,30,.22)';
  ell(ctx, 0, 2, k * 0.5, k * 0.1);
  ctx.fill();
  ctx.scale(1 / Math.sqrt(sq), sq);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  const body = (fill: string | CanvasGradient) => {
    ctx.fillStyle = fill;
    if (look === 3) {
      // 유령: 아래가 물결
      ctx.beginPath();
      ctx.moveTo(-k * 0.42, -k * 0.1);
      ctx.quadraticCurveTo(-k * 0.45, -k * 0.95, 0, -k * 0.95);
      ctx.quadraticCurveTo(k * 0.45, -k * 0.95, k * 0.42, -k * 0.1);
      for (let i = 0; i < 4; i++) {
        const x0 = k * 0.42 - (i + 1) * k * 0.21;
        ctx.quadraticCurveTo(x0 + k * 0.105, k * (0.06 + 0.05 * Math.sin(t * 0.2 + i)), x0, -k * 0.08);
      }
      ctx.closePath();
    } else if (look === 4) {
      // 번개 구름: 몽글몽글
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI, px = Math.cos(a) * k * 0.38, py = -k * 0.45 + Math.sin(a) * k * 0.38;
        ctx.moveTo(px + k * 0.17, py);
        ctx.arc(px, py, k * 0.17, 0, TAU);
      }
      ctx.rect(-k * 0.42, -k * 0.5, k * 0.84, k * 0.42);
      ctx.moveTo(k * 0.42, -k * 0.3);
      ctx.arc(0, -k * 0.3, k * 0.42, 0, Math.PI);
    } else ell(ctx, 0, -k * 0.42, k * 0.46, k * 0.42);
    ctx.fill();
  };
  // 집게 (화산·해적 꽃게)
  if (look === 1 || look === 5) {
    for (const sd of [-1, 1]) {
      const up = mood === 'angry' ? Math.sin(t * 0.5 + sd) * 0.3 : 0;
      ctx.save();
      ctx.translate(sd * k * 0.42, -k * 0.5);
      ctx.rotate(sd * (0.5 + up));
      ctx.fillStyle = C[0];
      ell(ctx, sd * k * 0.12, -k * 0.12, k * 0.16, k * 0.13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = C[2];
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.12, -k * 0.12);
      ctx.lineTo(sd * k * 0.28, -k * 0.2);
      ctx.lineTo(sd * k * 0.22, -k * 0.06);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  body(OUT);
  ctx.save();
  ctx.scale(1 - (lw * 2) / (k * 0.92), 1 - (lw * 2) / (k * 0.92));
  ctx.translate(0, -k * 0.02);
  body(lin(ctx, 0, -k * 0.9, 0, 0, [0, C[2]], [0.35, C[0]], [1, C[1]]));
  ctx.restore();
  // 무늬
  if (look === 0) {
    ctx.fillStyle = '#4cb84a';
    ctx.beginPath();
    ctx.moveTo(0, -k * 0.82);
    ctx.quadraticCurveTo(k * 0.25, -k * 1.1, k * 0.3, -k * 0.9);
    ctx.quadraticCurveTo(k * 0.15, -k * 0.82, 0, -k * 0.82);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ell(ctx, -k * 0.2, -k * 0.62, k * 0.08, k * 0.12, 0.4);
    ctx.fill();
  }
  if (look === 2) {
    ctx.fillStyle = '#bfe0ff';
    ell(ctx, 0, -k * 0.45, k * 0.26, k * 0.2);
    ctx.fill();
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#e8f4ff';
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.2, -k * 0.78);
      ctx.lineTo(sd * k * 0.3, -k * 1.0);
      ctx.lineTo(sd * k * 0.34, -k * 0.74);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  if (look === 4) {
    ctx.fillStyle = '#ffe14a';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.18, -k * 0.82);
      ctx.lineTo(sd * k * 0.3, -k * 1.05);
      ctx.lineTo(sd * k * 0.24, -k * 0.95);
      ctx.lineTo(sd * k * 0.36, -k * 1.15);
      ctx.lineTo(sd * k * 0.2, -k * 0.98);
      ctx.lineTo(sd * k * 0.26, -k * 0.86);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  if (look === 5) {
    // 해적 두건
    ctx.fillStyle = '#e83a3a';
    ctx.beginPath();
    ctx.ellipse(0, -k * 0.7, k * 0.36, k * 0.18, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      ell(ctx, -k * 0.18 + i * k * 0.18, -k * 0.78, k * 0.03, k * 0.03);
      ctx.fill();
    }
  }
  // 얼굴
  const ey = look === 3 ? -k * 0.58 : -k * 0.48;
  const ang = mood === 'angry';
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ell(ctx, sd * k * 0.15, ey, k * 0.1, k * 0.12);
    ctx.fill();
    ctx.stroke();
    if (mood === 'hurt') {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.15 - k * 0.05, ey - k * 0.05);
      ctx.lineTo(sd * k * 0.15 + k * 0.05, ey + k * 0.05);
      ctx.moveTo(sd * k * 0.15 + k * 0.05, ey - k * 0.05);
      ctx.lineTo(sd * k * 0.15 - k * 0.05, ey + k * 0.05);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#2a1608';
      ell(ctx, sd * k * 0.15 - k * 0.02, ey + k * 0.02, k * (mood === 'scared' ? 0.035 : 0.055), k * (mood === 'scared' ? 0.035 : 0.065));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * k * 0.15 - k * 0.04, ey - k * 0.01, k * 0.02, k * 0.02);
      ctx.fill();
    }
    if (ang) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw * 1.3;
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.27, ey - k * 0.15);
      ctx.lineTo(sd * k * 0.06, ey - k * 0.09);
      ctx.stroke();
    }
  }
  // 입 (이빨) · 겁먹으면 삐뚤삐뚤
  ctx.fillStyle = '#7a1a2a';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  const my = ey + k * 0.2;
  if (mood === 'scared') {
    ctx.beginPath();
    for (let i = 0; i <= 6; i++) {
      const px = -k * 0.12 + (i / 6) * k * 0.24, py = my + (i % 2 ? -1 : 1) * k * 0.025;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.25, ey - k * 0.12);
      ctx.lineTo(sd * k * 0.07, ey - k * 0.17);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(-k * 0.16, my);
  ctx.quadraticCurveTo(0, my + k * (mood === 'hurt' ? 0.04 : 0.16), k * 0.16, my);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * k * 0.1, my + 1);
    ctx.lineTo(sd * k * 0.06, my + k * 0.06);
    ctx.lineTo(sd * k * 0.02, my + 1);
    ctx.closePath();
    ctx.fill();
  }
  if (look === 3) {
    ctx.fillStyle = '#ff7a9a';
    ell(ctx, k * 0.03, my + k * 0.09, k * 0.05, k * 0.06);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
/** 큰 우두머리: 해적 모자를 쓴 문어 선장 */
function drawBoss(ctx: C2, x: number, y: number, k: number, mood: MonMood, t: number) {
  const lw = Math.max(2, k * 0.025);
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,30,30,.25)';
  ell(ctx, 0, 2, k * 0.6, k * 0.1);
  ctx.fill();
  const sq = mood === 'hurt' ? 0.85 : 1 + Math.sin(t * 0.1) * 0.03;
  ctx.scale(1 / Math.sqrt(sq), sq);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 다리 8개
  for (let i = 0; i < 6; i++) {
    const sd = i < 3 ? -1 : 1, j = i % 3, a = Math.sin(t * 0.12 + i) * 0.3;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = k * 0.1 + lw;
    ctx.beginPath();
    ctx.moveTo(sd * k * (0.1 + j * 0.1), -k * 0.25);
    ctx.quadraticCurveTo(sd * k * (0.35 + j * 0.12), -k * (0.05 - a * 0.2), sd * k * (0.42 + j * 0.1), -k * 0.02 + Math.sin(t * 0.2 + i) * k * 0.03);
    ctx.stroke();
    ctx.strokeStyle = '#e8607a';
    ctx.lineWidth = k * 0.1;
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = lin(ctx, 0, -k, 0, -k * 0.2, [0, '#ff9ab0'], [1, '#d84a6a']);
  ell(ctx, 0, -k * 0.55, k * 0.4, k * 0.38);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  for (let i = 0; i < 4; i++) {
    ell(ctx, -k * 0.2 + i * k * 0.13, -k * 0.75 + (i % 2) * k * 0.08, k * 0.035, k * 0.035);
    ctx.fill();
  }
  // 해적 모자
  ctx.fillStyle = '#2a2a3a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.5, -k * 0.82);
  ctx.quadraticCurveTo(0, -k * 1.0, k * 0.5, -k * 0.82);
  ctx.quadraticCurveTo(k * 0.3, -k * 1.25, 0, -k * 1.2);
  ctx.quadraticCurveTo(-k * 0.3, -k * 1.25, -k * 0.5, -k * 0.82);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawSkull(ctx, 0, -k * 1.03, k * 0.07);
  ctx.strokeStyle = '#ffd23a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.42, -k * 0.86);
  ctx.quadraticCurveTo(0, -k * 1.02, k * 0.42, -k * 0.86);
  ctx.stroke();
  // 얼굴: 안대 + 한쪽 눈
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.fillStyle = '#ffffff';
  ell(ctx, k * 0.14, -k * 0.55, k * 0.1, k * 0.12);
  ctx.fill();
  ctx.stroke();
  if (mood === 'hurt') {
    ctx.beginPath();
    ctx.moveTo(k * 0.09, -k * 0.6);
    ctx.lineTo(k * 0.19, -k * 0.5);
    ctx.moveTo(k * 0.19, -k * 0.6);
    ctx.lineTo(k * 0.09, -k * 0.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#2a1608';
    const pr = mood === 'scared' ? 0.6 : 1;
    ell(ctx, k * 0.12, -k * 0.53, k * 0.05 * pr, k * 0.06 * pr);
    ctx.fill();
  }
  ctx.fillStyle = '#2a2a3a';
  ell(ctx, -k * 0.14, -k * 0.55, k * 0.09, k * 0.08);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-k * 0.38, -k * 0.7);
  ctx.lineTo(k * 0.3, -k * 0.62);
  ctx.stroke();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.moveTo(k * 0.26, -k * 0.7);
  ctx.lineTo(k * 0.04, -k * 0.66);
  ctx.stroke();
  // 입 + 수염
  ctx.lineWidth = lw;
  ctx.fillStyle = '#7a1a2a';
  ctx.beginPath();
  ctx.moveTo(-k * 0.12, -k * 0.36);
  ctx.quadraticCurveTo(0, -k * (mood === 'hurt' ? 0.33 : 0.24), k * 0.12, -k * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawCamp(ctx: C2, x: number, y: number, k: number, t: number, lit = true) {
  const lw = Math.max(1.5, k * 0.035);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(40,40,20,.22)';
  ell(ctx, x, y + 2, k * 0.62, k * 0.12);
  ctx.fill();
  // 천막 (줄무늬)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - k * 0.55, y);
  ctx.lineTo(x - k * 0.05, y - k * 0.85);
  ctx.lineTo(x + k * 0.45, y);
  ctx.closePath();
  ctx.fillStyle = '#fff4dc';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#ff6a4a';
  for (let i = -3; i < 4; i += 2) {
    ctx.beginPath();
    ctx.moveTo(x - k * 0.05 + i * k * 0.08, y - k * 0.9);
    ctx.lineTo(x - k * 0.05 + (i + 1) * k * 0.08, y - k * 0.9);
    ctx.lineTo(x - k * 0.05 + (i + 1) * k * 0.2, y + 2);
    ctx.lineTo(x - k * 0.05 + i * k * 0.2, y + 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(x - k * 0.55, y);
  ctx.lineTo(x - k * 0.05, y - k * 0.85);
  ctx.lineTo(x + k * 0.45, y);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = '#5a3418';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.17, y);
  ctx.lineTo(x - k * 0.05, y - k * 0.42);
  ctx.lineTo(x + k * 0.07, y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.05, y - k * 0.85);
  ctx.lineTo(x - k * 0.05, y - k * 1.05);
  ctx.lineTo(x + k * 0.12, y - k * 0.98);
  ctx.lineTo(x - k * 0.05, y - k * 0.93);
  ctx.fill();
  ctx.stroke();
  // 모닥불
  const fx0 = x + k * 0.6;
  ctx.fillStyle = '#8a5a30';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(fx0, y - k * 0.04);
    ctx.rotate(sd * 0.4);
    rr(ctx, -k * 0.18, -k * 0.04, k * 0.36, k * 0.08, k * 0.03);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (lit) {
    const f = 1 + 0.18 * Math.sin(t * 0.6);
    ctx.fillStyle = radg(ctx, fx0, y - k * 0.2, 0, k * 0.5, [0, 'rgba(255,210,120,.55)'], [1, 'rgba(255,200,100,0)']);
    ell(ctx, fx0, y - k * 0.2, k * 0.5, k * 0.45);
    ctx.fill();
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.moveTo(fx0 - k * 0.14, y - k * 0.06);
    ctx.quadraticCurveTo(fx0 - k * 0.16, y - k * 0.3, fx0 + Math.sin(t * 0.4) * k * 0.05, y - k * 0.45 * f);
    ctx.quadraticCurveTo(fx0 + k * 0.16, y - k * 0.3, fx0 + k * 0.14, y - k * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffe36a';
    ell(ctx, fx0, y - k * 0.14, k * 0.06, k * 0.1);
    ctx.fill();
  }
}
function drawMerchant(ctx: C2, x: number, y: number, k: number, t: number, wave: boolean) {
  const lw = Math.max(1.5, k * 0.035);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(40,40,20,.22)';
  ell(ctx, x, y + 2, k * 0.7, k * 0.12);
  ctx.fill();
  // 수레 (줄무늬 차양)
  const cx = x + k * 0.3;
  ctx.fillStyle = '#b07a44';
  rr(ctx, cx - k * 0.35, y - k * 0.42, k * 0.7, k * 0.3, k * 0.04);
  ctx.fill();
  ctx.stroke();
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#6a4220';
    ell(ctx, cx + sd * k * 0.22, y - k * 0.08, k * 0.09, k * 0.09);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = OUT;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sd * k * 0.32, y - k * 0.42);
    ctx.lineTo(cx + sd * k * 0.32, y - k * 0.8);
    ctx.stroke();
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? '#ffffff' : '#9a5ae0';
    ctx.beginPath();
    ctx.moveTo(cx - k * 0.4 + i * k * 0.133, y - k * 0.82);
    ctx.lineTo(cx - k * 0.4 + (i + 1) * k * 0.133, y - k * 0.82);
    ctx.lineTo(cx - k * 0.4 + (i + 1) * k * 0.133, y - k * 0.7);
    ctx.quadraticCurveTo(cx - k * 0.4 + (i + 0.5) * k * 0.133, y - k * 0.64, cx - k * 0.4 + i * k * 0.133, y - k * 0.7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = OUT;
  rr(ctx, cx - k * 0.4, y - k * 0.82, k * 0.8, k * 0.12, 2);
  ctx.stroke();
  drawApple(ctx, cx - k * 0.2, y - k * 0.48, k * 0.06);
  drawTorch(ctx, cx, y - k * 0.42, k * 0.16, false, t);
  drawShieldIcon(ctx, cx + k * 0.2, y - k * 0.52, k * 0.09);
  // 너구리 상인
  const rx = x - k * 0.28;
  ctx.fillStyle = '#5a5e68';
  ctx.save();
  ctx.translate(rx - k * 0.18, y - k * 0.2);
  ctx.rotate(-0.6 + Math.sin(t * 0.1) * 0.1);
  ell(ctx, 0, -k * 0.12, k * 0.08, k * 0.2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a2e38';
  for (let i = 0; i < 3; i++) {
    ell(ctx, 0, -k * (0.04 + i * 0.1), k * 0.075, k * 0.025);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#8a8f9c';
  ell(ctx, rx, y - k * 0.28, k * 0.2, k * 0.26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8e4dc';
  ell(ctx, rx, y - k * 0.22, k * 0.12, k * 0.15);
  ctx.fill();
  // 팔 (흔들기)
  const wv = wave ? Math.sin(t * 0.4) * 0.5 : 0;
  ctx.save();
  ctx.translate(rx + k * 0.15, y - k * 0.4);
  ctx.rotate(-1.2 + wv);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.08 + lw;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(k * 0.22, 0);
  ctx.stroke();
  ctx.strokeStyle = '#8a8f9c';
  ctx.lineWidth = k * 0.08;
  ctx.stroke();
  ctx.restore();
  // 머리
  const hy = y - k * 0.62;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#8a8f9c';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(rx + sd * k * 0.08, hy - k * 0.12);
    ctx.lineTo(rx + sd * k * 0.17, hy - k * 0.25);
    ctx.lineTo(rx + sd * k * 0.2, hy - k * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#9ca0ac';
  ell(ctx, rx, hy, k * 0.2, k * 0.16);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3a3e48';
  ctx.beginPath();
  ctx.ellipse(rx, hy - k * 0.01, k * 0.18, k * 0.065, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ell(ctx, rx, hy + k * 0.07, k * 0.09, k * 0.06);
  ctx.fill();
  eyes(ctx, rx, hy - k * 0.01, k * 0.028, k * 0.08, wave ? 'cheer' : 'idle', t, 0);
  ctx.fillStyle = '#2a1608';
  ell(ctx, rx, hy + k * 0.05, k * 0.03, k * 0.02);
  ctx.fill();
  // 상인 모자
  ctx.fillStyle = '#9a5ae0';
  ctx.strokeStyle = OUT;
  ctx.beginPath();
  ctx.moveTo(rx - k * 0.16, hy - k * 0.1);
  ctx.lineTo(rx + k * 0.02, hy - k * 0.36);
  ctx.lineTo(rx + k * 0.16, hy - k * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, rx + k * 0.02, hy - k * 0.36, k * 0.035, k * 0.035);
  ctx.fill();
}
function drawCave(ctx: C2, x: number, y: number, k: number, glow: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.035);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(30,30,40,.25)';
  ell(ctx, x, y + 2, k * 0.6, k * 0.12);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - k * 0.8, x, y, [0, '#b8bcc8'], [1, '#7a7e8c']);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.6, y);
  ctx.quadraticCurveTo(x - k * 0.62, y - k * 0.55, x - k * 0.3, y - k * 0.72);
  ctx.quadraticCurveTo(x, y - k * 0.9, x + k * 0.32, y - k * 0.7);
  ctx.quadraticCurveTo(x + k * 0.62, y - k * 0.5, x + k * 0.6, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, x - k * 0.25, y - k * 0.6, k * 0.14, k * 0.06, -0.4);
  ctx.fill();
  ctx.fillStyle = glow > 0 ? radg(ctx, x, y - k * 0.2, 0, k * 0.4, [0, `rgba(255,200,90,${glow})`], [1, '#1e1a30']) : '#1e1a30';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.3, y);
  ctx.quadraticCurveTo(x - k * 0.32, y - k * 0.5, x, y - k * 0.52);
  ctx.quadraticCurveTo(x + k * 0.32, y - k * 0.5, x + k * 0.3, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 박쥐 눈
  if (glow <= 0) {
    ctx.fillStyle = '#ffe14a';
    for (const sd of [-1, 1]) {
      ell(ctx, x + sd * k * 0.05, y - k * 0.28, k * 0.025, k * 0.018);
      ctx.fill();
    }
  }
}
function drawMyst(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1.5, k * 0.035);
  ctx.lineJoin = 'round';
  ctx.fillStyle = 'rgba(30,30,40,.22)';
  ell(ctx, x, y + 2, k * 0.42, k * 0.1);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - k, x, y, [0, '#c8a8ff'], [1, '#7a52d0']);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.34, y);
  ctx.lineTo(x - k * 0.34, y - k * 0.62);
  ctx.quadraticCurveTo(x - k * 0.34, y - k * 0.9, x, y - k * 0.92);
  ctx.quadraticCurveTo(x + k * 0.34, y - k * 0.9, x + k * 0.34, y - k * 0.62);
  ctx.lineTo(x + k * 0.34, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${Math.max(10, k * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  txt(ctx, '?', x, y - k * 0.44, '#ffe14a', OUT, Math.max(2, k * 0.06));
  const tw = 0.5 + 0.5 * Math.sin(t * 0.12);
  ctx.fillStyle = `rgba(255,255,255,${tw})`;
  starPath(ctx, x + k * 0.3, y - k * 0.86, k * 0.08, 0.3);
  ctx.fill();
}
/** 사건 아이콘 (지도·카드 공용). k = 키 */
function drawKind(ctx: C2, kind: string, x: number, y: number, k: number, t: number, look: number, n?: Node | null, scared = false) {
  switch (kind) {
    case 'chest': case 'big': drawChest(ctx, x, y, k * 0.95, 0, t, kind === 'big'); break;
    case 'monster': drawMonster(ctx, x, y, k * (0.78 + (n?.pw ?? 2) * 0.11), look, scared ? 'scared' : 'angry', t); break;
    case 'boss': drawBoss(ctx, x, y, k * 1.25, scared ? 'scared' : 'angry', t); break;
    case 'camp': drawCamp(ctx, x - k * 0.15, y, k * 0.85, t); break;
    case 'shop': drawMerchant(ctx, x - k * 0.05, y, k * 0.95, t, false); break;
    case 'cave': drawCave(ctx, x, y, k * 1.0, 0); break;
    case 'mystery': drawMyst(ctx, x, y, k * 0.9, t); break;
    case 'trap': {
      ctx.fillStyle = '#5a3a1a';
      ell(ctx, x, y - k * 0.08, k * 0.42, k * 0.16);
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#d0d4dc';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x - k * 0.3 + i * k * 0.2, y - k * 0.06);
        ctx.lineTo(x - k * 0.25 + i * k * 0.2, y - k * 0.32);
        ctx.lineTo(x - k * 0.2 + i * k * 0.2, y - k * 0.06);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
  }
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = k * 0.07;
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
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** 겁먹은 땀방울 */
function sweat(ctx: C2, x: number, y: number, r: number, t: number) {
  for (let i = 0; i < 2; i++) {
    const u = ((t * 0.04 + i * 0.5) % 1), dx = (i ? 1 : -1) * r * (1.2 + u * 0.4), dy = u * r * 1.2;
    ctx.globalAlpha = 1 - u * 0.6;
    ctx.fillStyle = '#7ad0ff';
    ctx.strokeStyle = '#2a6ab8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + dx, y + dy - r * 0.55);
    ctx.quadraticCurveTo(x + dx + r * 0.35, y + dy, x + dx, y + dy + r * 0.25);
    ctx.quadraticCurveTo(x + dx - r * 0.35, y + dy, x + dx, y + dy - r * 0.55);
    ctx.fill();
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
// ── 풍경 ──
function drawPalm(ctx: C2, x: number, y: number, k: number, lean: number, t: number) {
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.04);
  ctx.lineCap = 'round';
  ctx.fillStyle = 'rgba(30,60,20,.22)';
  ell(ctx, x + lean * k * 0.3, y + 1, k * 0.35, k * 0.08);
  ctx.fill();
  const tx = x + lean * k * 0.45, ty = y - k * 1.0;
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = k * 0.1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + lean * k * 0.05, y - k * 0.55, tx, ty);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(70,40,10,.5)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    const u = i / 6, px = x + (tx - x) * u * u + lean * k * 0.05 * u, py = y + (ty - y) * u;
    ctx.beginPath();
    ctx.moveTo(px - k * 0.05, py);
    ctx.lineTo(px + k * 0.05, py + 2);
    ctx.stroke();
  }
  const sway = Math.sin(t * 0.04 + x) * 0.08;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i - 2.5) * 0.62 + sway, L = k * (0.55 + (i % 2) * 0.1);
    const ex = tx + Math.cos(a) * L, ey = ty + Math.sin(a) * L * 0.6 + L * 0.25;
    ctx.fillStyle = i % 2 ? '#3fae3a' : '#58c84a';
    ctx.strokeStyle = '#2a6a22';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.quadraticCurveTo((tx + ex) / 2 + Math.sin(a) * k * 0.12, (ty + ey) / 2 - k * 0.18, ex, ey);
    ctx.quadraticCurveTo((tx + ex) / 2 - Math.sin(a) * k * 0.05, (ty + ey) / 2 - k * 0.02, tx, ty);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a1a';
  for (let i = 0; i < 3; i++) {
    ell(ctx, tx - k * 0.06 + i * k * 0.06, ty + k * 0.05, k * 0.05, k * 0.05);
    ctx.fill();
  }
}
function drawPine(ctx: C2, x: number, y: number, k: number, snow: boolean) {
  ctx.fillStyle = 'rgba(30,60,80,.2)';
  ell(ctx, x, y + 1, k * 0.3, k * 0.07);
  ctx.fill();
  ctx.fillStyle = '#7a4a24';
  ctx.fillRect(x - k * 0.04, y - k * 0.15, k * 0.08, k * 0.15);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.03);
  for (let i = 0; i < 3; i++) {
    const by = y - k * (0.12 + i * 0.25), ww = k * (0.36 - i * 0.08);
    ctx.fillStyle = snow ? '#5a9a8a' : '#3f8a4a';
    ctx.beginPath();
    ctx.moveTo(x - ww, by);
    ctx.lineTo(x, by - k * 0.38);
    ctx.lineTo(x + ww, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (snow) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x - ww * 0.55, by - k * 0.16);
      ctx.lineTo(x, by - k * 0.38);
      ctx.lineTo(x + ww * 0.55, by - k * 0.16);
      ctx.quadraticCurveTo(x, by - k * 0.1, x - ww * 0.55, by - k * 0.16);
      ctx.fill();
    }
  }
}
function drawRock(ctx: C2, x: number, y: number, k: number, col: string) {
  ctx.fillStyle = 'rgba(30,40,30,.2)';
  ell(ctx, x, y + 1, k * 0.36, k * 0.08);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - k * 0.4, x, y, [0, '#ffffff'], [0.15, col], [1, '#6a6e78']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.035);
  ctx.beginPath();
  ctx.moveTo(x - k * 0.34, y);
  ctx.quadraticCurveTo(x - k * 0.36, y - k * 0.28, x - k * 0.1, y - k * 0.38);
  ctx.quadraticCurveTo(x + k * 0.2, y - k * 0.42, x + k * 0.32, y - k * 0.12);
  ctx.lineTo(x + k * 0.34, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
function drawBush(ctx: C2, x: number, y: number, k: number, col: string, flower: string) {
  ctx.fillStyle = 'rgba(30,60,20,.2)';
  ell(ctx, x, y + 1, k * 0.34, k * 0.07);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,70,30,.6)';
  ctx.lineWidth = 1;
  ctx.fillStyle = col;
  for (const [dx, dy, r] of [[-0.16, -0.12, 0.15], [0.14, -0.12, 0.15], [0, -0.22, 0.17]]) {
    ell(ctx, x + dx * k, y + dy * k, r * k, r * k);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = flower;
  for (const [dx, dy] of [[-0.12, -0.2], [0.1, -0.26], [0.02, -0.1]]) {
    ell(ctx, x + dx * k, y + dy * k, k * 0.035, k * 0.035);
    ctx.fill();
  }
}
function drawLantern(ctx: C2, x: number, y: number, k: number, t: number) {
  const by = y - k * 0.6 + Math.sin(t * 0.05 + x) * k * 0.08;
  ctx.fillStyle = radg(ctx, x, by, 0, k * 0.4, [0, 'rgba(255,230,140,.6)'], [1, 'rgba(255,220,120,0)']);
  ell(ctx, x, by, k * 0.4, k * 0.4);
  ctx.fill();
  ctx.fillStyle = '#ffb84a';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1;
  rr(ctx, x - k * 0.1, by - k * 0.13, k * 0.2, k * 0.26, k * 0.06);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff3b0';
  ell(ctx, x, by, k * 0.05, k * 0.08);
  ctx.fill();
}
function drawPuff(ctx: C2, x: number, y: number, r: number, col = '#ffffff') {
  ctx.fillStyle = col;
  ctx.beginPath();
  for (const [dx, dy, q] of [[-0.6, 0.1, 0.55], [0, -0.15, 0.75], [0.6, 0.08, 0.55], [0.25, 0.2, 0.5], [-0.3, 0.22, 0.5]]) {
    ctx.moveTo(x + dx * r + q * r, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, q * r, 0, TAU);
  }
  ctx.fill();
}

// ───────────────────────────── 섬 지도 ─────────────────────────────
const yOfU = (u: number) => FEET - MAP_SPAN * u * (1.55 - 0.55 * u);
function drawWorld(ctx: C2, s: TState, w: number, t: number) {
  const P = PAL[s.stage], R = (r: number) => r * w;
  const D = Math.max(1.2, s.R - s.cam);
  const top = R(MAP_TOP), bot = R(MAP_BOT);
  // ── 바다 (하늘 섬은 구름 바다) ──
  ctx.fillStyle = lin(ctx, 0, top, 0, bot, [0, P.sea[0]], [0.6, P.sea[1]], [1, P.sea[2]]);
  ctx.fillRect(0, top, w, bot - top);
  if (P.sky) {
    for (let i = 0; i < 9; i++) {
      const cx = ((hsh(i + 3) * w * 1.4 + t * (0.15 + hsh(i) * 0.2)) % (w * 1.4)) - w * 0.2, cy = top + (0.15 + hsh(i + 9) * 0.85) * (bot - top);
      ctx.globalAlpha = 0.8;
      drawPuff(ctx, cx, cy, R(0.05 + hsh(i + 5) * 0.04));
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 18; i++) {
      const yy = top + ((hsh(i + 1) * (bot - top) + t * 0.08) % (bot - top)), xx = ((hsh(i + 7) * w + Math.sin(t * 0.02 + i) * 8) % w);
      ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t * 0.05 + i * 2);
      ctx.beginPath();
      ctx.arc(xx, yy, R(0.03), Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // ── 섬 몸통 ──
  const hw = (u: number, side: number) => {
    const wr = s.cam + u * D;
    const base = LANE * (1 - 0.32 * u) + 0.15 * (1 - 0.3 * u) + 0.02 * Math.sin(wr * 2.1 + side * 1.7) + 0.012 * Math.sin(wr * 5.3 + side);
    return u < 0.9 ? base : base * Math.max(0, 1 - ((u - 0.9) / 0.32) ** 2);
  };
  const isle = (e: number) => {
    ctx.beginPath();
    const N = 44;
    for (let i = 0; i <= N; i++) {
      const u = -0.35 + (i / N) * 1.57;
      const x = 0.5 - hw(u, -1) - e, y = yOfU(u);
      i ? ctx.lineTo(R(x), R(y)) : ctx.moveTo(R(x), R(y));
    }
    ctx.lineTo(R(0.5), R(yOfU(1.22)) - R(e) * 1.2);
    for (let i = N; i >= 0; i--) {
      const u = -0.35 + (i / N) * 1.57;
      ctx.lineTo(R(0.5 + hw(u, 1) + e), R(yOfU(u)));
    }
    ctx.closePath();
  };
  ctx.fillStyle = P.sky ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.28)';
  isle(0.06);
  ctx.fill();
  ctx.fillStyle = P.sky ? '#ffffff' : P.sand;
  isle(0.028);
  ctx.fill();
  ctx.strokeStyle = P.sandDk;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = lin(ctx, 0, R(0.2), 0, bot, [0, P.g0], [1, P.g1]);
  isle(0);
  ctx.fill();
  ctx.save();
  isle(0);
  ctx.clip();
  ctx.fillStyle = radg(ctx, R(0.8), R(0.25), R(0.02), R(0.7), [0, 'rgba(255,250,210,.55)'], [1, 'rgba(255,250,210,0)']);
  ctx.fillRect(0, top, w, bot - top);
  // 풀·꽃 (세계에 붙어 있다)
  for (let j = Math.floor((s.cam - 0.5) * 4); j <= (s.R + 1) * 4; j++) {
    const u = (j / 4 - s.cam) / D;
    if (u < -0.3 || u > 1.05) continue;
    const y = R(yOfU(u)), sc = 1 - 0.42 * u;
    for (let q = 0; q < 2; q++) {
      const x = R(0.5 + (hsh(j * 3.1 + q * 17) - 0.5) * 2 * hw(u, 0) * 0.92);
      if (hsh(j * 5 + q) < 0.55) {
        ctx.strokeStyle = P.gDk;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        for (const dx of [-1, 0, 1]) {
          ctx.moveTo(x + dx * R(0.008) * sc, y);
          ctx.lineTo(x + dx * R(0.013) * sc, y - R(0.02) * sc);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = ['#ffffff', '#ffd84a', '#ff8ab0', '#8ad0ff'][Math.floor(hsh(j + q * 3) * 4)];
        ell(ctx, x, y, R(0.007) * sc, R(0.007) * sc);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  ctx.strokeStyle = P.gDk;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2.5;
  isle(0);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // ── 폭포 (오른쪽 벼랑) ──
  {
    const wr = 1.4, u = (wr - s.cam) / D;
    if (u > -0.2 && u < 0.95) {
      const y = R(yOfU(u)), sc = 1 - 0.42 * u, ex = R(0.5 + hw(u, 1)), k = R(0.1) * sc;
      ctx.fillStyle = lin(ctx, ex - k * 0.3, 0, ex + k * 0.6, 0, [0, '#7ad0f8'], [1, '#c8f0ff']);
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.55, y - k * 0.12);
      ctx.quadraticCurveTo(ex, y - k * 0.2, ex + k * 0.25, y - k * 0.08);
      ctx.lineTo(ex + k * 0.5, y + k * 0.75);
      ctx.lineTo(ex + k * 0.05, y + k * 0.8);
      ctx.quadraticCurveTo(ex - k * 0.1, y + k * 0.1, ex - k * 0.55, y + k * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.85)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const o = ((t * 1.2 + i * 9) % 30) / 30;
        ctx.beginPath();
        ctx.moveTo(ex + k * (0.05 + i * 0.1), y + k * (-0.05 + o * 0.6));
        ctx.lineTo(ex + k * (0.1 + i * 0.1), y + k * (0.08 + o * 0.6));
        ctx.stroke();
      }
      drawRock(ctx, ex - k * 0.55, y + k * 0.05, k * 0.7, '#a8acb8');
      drawRock(ctx, ex + k * 0.1, y - k * 0.05, k * 0.55, '#b8bcc8');
      ctx.globalAlpha = 0.9;
      drawPuff(ctx, ex + k * 0.3, y + k * 0.82, k * 0.25);
      ctx.globalAlpha = 1;
    }
  }
  // ── 길가 풍경 (양옆) ──
  for (let j = Math.floor(s.cam * 2) - 2; j <= s.R * 2 + 1; j++) {
    const wr = j / 2 + 0.25, u = (wr - s.cam) / D;
    if (u < -0.25 || u > 0.98) continue;
    const y = R(yOfU(u)), sc = 1 - 0.42 * u;
    for (const side of [-1, 1]) {
      const hv = hsh(j * 7.3 + side * 3.1);
      if (side > 0 && Math.abs(wr - 1.4) < 0.5) continue;
      const x = R(0.5 + side * (LANE * (1 - 0.32 * u) + 0.085 * sc + hv * 0.03)), k = R(0.1) * sc;
      const type = P.tree === 2 ? (hv < 0.65 ? 'pine' : 'rock') : P.tree === 3 ? (hv < 0.45 ? 'dead' : hv < 0.75 ? 'lantern' : 'bush') : P.tree === 4 ? (hv < 0.5 ? 'puff' : 'bush') : P.tree === 1 ? (hv < 0.45 ? 'rock' : hv < 0.75 ? 'palm' : 'vent') : hv < 0.6 ? 'palm' : hv < 0.8 ? 'bush' : 'rock';
      if (type === 'palm') drawPalm(ctx, x, y, k, side * (0.5 + hv * 0.4), t);
      else if (type === 'pine') drawPine(ctx, x, y, k * 0.9, true);
      else if (type === 'rock') drawRock(ctx, x, y, k * 0.8, P.tree === 2 ? '#d8e8f8' : P.tree === 1 ? '#9a8a7a' : '#a8acb8');
      else if (type === 'bush') drawBush(ctx, x, y, k * 0.8, P.tree === 3 ? '#8ccaa8' : '#4cb84a', P.tree === 3 ? '#e0b0ff' : '#ff8ab0');
      else if (type === 'lantern') drawLantern(ctx, x, y, k, t);
      else if (type === 'puff') drawPuff(ctx, x, y - k * 0.2, k * 0.35);
      else if (type === 'vent') {
        drawRock(ctx, x, y, k * 0.7, '#7a6a5a');
        ctx.fillStyle = radg(ctx, x, y - k * 0.25, 0, k * 0.2, [0, 'rgba(255,160,60,.9)'], [1, 'rgba(255,120,40,0)']);
        ell(ctx, x, y - k * 0.25, k * 0.2, k * 0.12);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        drawPuff(ctx, x + Math.sin(t * 0.03 + j) * k * 0.1, y - k * (0.5 + ((t * 0.01 + hv) % 1) * 0.4), k * 0.15, '#e8e0d8');
        ctx.globalAlpha = 1;
      } else if (type === 'dead') {
        ctx.strokeStyle = '#6a5a7a';
        ctx.lineWidth = k * 0.08;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + side * k * 0.1, y - k * 0.5, x + side * k * 0.05, y - k * 0.8);
        ctx.moveTo(x + side * k * 0.06, y - k * 0.5);
        ctx.lineTo(x + side * k * 0.3, y - k * 0.7);
        ctx.moveTo(x + side * k * 0.07, y - k * 0.65);
        ctx.lineTo(x - side * k * 0.15, y - k * 0.85);
        ctx.stroke();
      }
    }
  }
  // ── 길 ──
  const P2 = (r: number, l: number): [number, number, number] => nodeXY(s, r, r < 0 || r >= s.R ? 1 : l);
  const r0 = Math.max(-1, Math.floor(s.cam) - 1);
  const picking = s.phase === 'pick';
  for (let r = r0; r < s.R; r++) {
    const lanes = r === -1 ? [1] : [0, 1, 2].filter((l) => s.map[r][l]);
    for (const l of lanes) {
      const outs = r === s.R - 1 ? [1] : nextLanes(s.map, r, l);
      for (const l2 of outs) {
        const [x0, y0, a0] = P2(r, l), [x1, y1, a1] = P2(r + 1, l2);
        if (y0 > MAP_BOT + 0.1 && y1 > MAP_BOT + 0.1) continue;
        const visited = s.trail[r + 1] === l && (s.trail[r + 2] === l2 || (r === s.R - 1 && s.cam > s.R - 1 + 0.01));
        const walking = s.phase === 'walk' && r === s.row && l === s.lane && l2 === s.wl1;
        const opt = picking && r === s.row && l === s.lane;
        const sc = (a0 + a1) / 2;
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.pathDk;
        ctx.globalAlpha = opt || visited || walking ? 1 : 0.55;
        ctx.lineWidth = R(0.026) * sc + 3;
        ctx.beginPath();
        ctx.moveTo(R(x0), R(y0));
        ctx.quadraticCurveTo(R((x0 + x1) / 2 + (x1 - x0) * 0.1), R((y0 + y1) / 2), R(x1), R(y1));
        ctx.stroke();
        ctx.strokeStyle = P.path;
        ctx.lineWidth = R(0.026) * sc;
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (opt || walking) {
          ctx.setLineDash([R(0.014), R(0.016)]);
          ctx.lineDashOffset = -t * 0.8;
          ctx.strokeStyle = walking ? '#ff8a2a' : '#ffb21a';
          ctx.lineWidth = R(0.009) * sc + 1;
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (!visited) {
          ctx.setLineDash([R(0.006), R(0.012)]);
          ctx.strokeStyle = 'rgba(120,70,30,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(110,60,25,.55)';
          for (let q = 1; q < 5; q++) {
            const u = q / 5, fx = R(x0 + (x1 - x0) * u), fy = R(y0 + (y1 - y0) * u);
            ell(ctx, fx + (q % 2 ? -2 : 2), fy, R(0.005) * sc + 0.6, R(0.008) * sc + 0.6, 0.3);
            ctx.fill();
          }
        }
      }
    }
  }
  // ── 출발 배 ──
  {
    const [bx, by, sc] = P2(-1, 1);
    if (by < MAP_BOT + 0.15) {
      const k = R(0.1) * sc, x = R(bx) - R(0.2), y = R(by) + R(0.03);
      ctx.fillStyle = '#9a5a2a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - k * 0.5, y - k * 0.15);
      ctx.lineTo(x + k * 0.5, y - k * 0.15);
      ctx.quadraticCurveTo(x + k * 0.4, y + k * 0.15, x, y + k * 0.15);
      ctx.quadraticCurveTo(x - k * 0.4, y + k * 0.15, x - k * 0.5, y - k * 0.15);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(x, y - k * 0.15);
      ctx.lineTo(x, y - k * 0.8);
      ctx.lineTo(x + k * 0.4, y - k * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  // ── 꼭대기 보물 ──
  {
    const [gx, gy, sc] = P2(s.R, 1), k = R(0.13) * Math.max(0.75, sc);
    const x = R(gx), y = R(gy);
    ctx.fillStyle = lin(ctx, x, y - k * 0.5, x, y + k * 0.25, [0, '#d8c8a8'], [1, '#a89070']);
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + k * 0.05, k * 0.85, k * 0.3, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const tw = 0.5 + 0.5 * Math.sin(t * 0.08);
    ctx.fillStyle = radg(ctx, x, y - k * 0.3, 0, k * 1.1, [0, `rgba(255,236,140,${0.55 + 0.25 * tw})`], [1, 'rgba(255,230,120,0)']);
    ell(ctx, x, y - k * 0.3, k * 1.1, k * 0.9);
    ctx.fill();
    // 깃발
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + k * 0.55, y - k * 0.05);
    ctx.lineTo(x + k * 0.55, y - k * 0.95);
    ctx.stroke();
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath();
    ctx.moveTo(x + k * 0.55, y - k * 0.95);
    ctx.quadraticCurveTo(x + k * 0.8, y - k * (0.86 + Math.sin(t * 0.15) * 0.04), x + k * 0.95, y - k * 0.8);
    ctx.lineTo(x + k * 0.55, y - k * 0.68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const opened = s.ek === 'goal' && s.et >= 26 ? 1 : s.phase === 'result' ? 1 : 0;
    drawChest(ctx, x, y - k * 0.05, k * 0.75, opened, t, true);
    ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (s.phase !== 'event' || s.ek !== 'goal') txt(ctx, '보물', x - k * 0.95, y - k * 0.25, '#c84a1a', '#ffffff', 3);
  }
  // ── 칸 (먼 줄부터) ──
  for (let r = s.R - 1; r >= Math.max(0, Math.floor(s.cam) - 1); r--) {
    for (let l = 0; l < 3; l++) {
      const n = s.map[r][l];
      if (!n) continue;
      const [nx, ny, sc] = P2(r, l);
      if (ny > MAP_BOT + 0.08) continue;
      const optI = picking && r === s.row + 1 ? s.opts.findIndex((o) => o.lane === l) : -1;
      const here = r === s.row && l === s.lane;
      const k = R(0.085) * sc, x = R(nx), y = R(ny) + (optI >= 0 ? -Math.abs(Math.sin(t * 0.1 + l)) * R(0.012) : 0);
      // 빈터 (두께가 있는 흙 단)
      ctx.fillStyle = 'rgba(60,50,20,.2)';
      ell(ctx, R(nx), R(ny) + k * 0.16, k * 0.8, k * 0.3);
      ctx.fill();
      ctx.fillStyle = P.pathDk;
      ell(ctx, R(nx), R(ny) + k * 0.11, k * 0.7, k * 0.26);
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, R(ny) - k * 0.2, 0, R(ny) + k * 0.3, [0, '#ffffff'], [0.25, P.path], [1, P.path]);
      ell(ctx, R(nx), R(ny) + k * 0.05, k * 0.7, k * 0.25);
      ctx.fill();
      ctx.strokeStyle = P.pathDk;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      if (optI >= 0) {
        const pul = 1 + 0.12 * Math.sin(t * 0.18);
        ctx.strokeStyle = '#ffb21a';
        ctx.lineWidth = 3;
        ell(ctx, R(nx), R(ny) + k * 0.06, k * 0.85 * pul, k * 0.34 * pul);
        ctx.stroke();
      }
      if (here || n.done) {
        ctx.globalAlpha = 0.45;
        if (n.k === 'chest') drawChest(ctx, x, y, k * 0.8, 1, 0);
        ctx.globalAlpha = 1;
        // 탐험대 깃발
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + k * 0.3, y);
        ctx.lineTo(x + k * 0.3, y - k * 0.7);
        ctx.stroke();
        ctx.fillStyle = '#3cb05a';
        ctx.beginPath();
        ctx.moveTo(x + k * 0.3, y - k * 0.7);
        ctx.lineTo(x + k * 0.65, y - k * 0.58);
        ctx.lineTo(x + k * 0.3, y - k * 0.46);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        continue;
      }
      const kind = n.k === 'mystery' && s.leader === 'owl' ? n.out! : n.k;
      const fearful = s.fear > 0 && r === s.row + 1 && (kind === 'monster' || kind === 'boss') && s.phase !== 'event';
      const fx2 = fearful ? Math.sin(t * 1.4 + l * 2) * R(0.004) * (1 + s.fear) : 0;
      drawKind(ctx, kind === 'big' ? 'chest' : kind, x + fx2, y, k, t, s.stage, n.k === 'mystery' ? MYST[n.out!] : n, fearful);
      if (fearful) {
        sweat(ctx, x + fx2, y - k * 0.75, k * 0.18, t);
        ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        txt(ctx, s.fear >= 2 ? '벌벌' : '덜덜', x - k * 0.6, y - k * 1.0, '#2a6ab8', '#ffffff', 3);
      }
      if (n.k === 'mystery' && s.leader === 'owl') {
        ctx.fillStyle = '#ffd84a';
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 1.2;
        ell(ctx, x - k * 0.45, y - k * 0.7, k * 0.16, k * 0.16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = OUT;
        ell(ctx, x - k * 0.45, y - k * 0.7, k * 0.07, k * 0.07);
        ctx.fill();
      }
      if (n.k === 'monster' || n.k === 'boss') for (let q = 0; q < Math.min(3, n.pw); q++) drawSkull(ctx, x + k * (0.42 + q * 0.0), y - k * (0.95 + q * 0.27), k * 0.13);
      if (optI >= 0) {
        // 카드 번호
        ctx.fillStyle = '#ffb21a';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ell(ctx, x - k * 0.62, y - k * 0.2, R(0.022), R(0.022));
        ctx.fill();
        ctx.stroke();
        ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(String(optI + 1), x - k * 0.62, y - k * 0.2 + 1);
      }
    }
  }
  // ── 탐험대 ──
  {
    const u = s.phase === 'walk' ? s.wt / s.wT : 1, e = u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u);
    const lf = s.phase === 'walk' ? s.wl0 + (s.wl1 - s.wl0) * e : s.lane;
    const px = R(0.5 + (lf - 1) * LANE), py = R(FEET);
    const pose: Pose = s.phase === 'walk' ? 'walk' : s.phase === 'result' ? 'cheer' : s.phase === 'fail' ? 'dizzy' : 'idle';
    drawParty(ctx, px, py, R(0.135), pose, t, s, s.leader);
  }
  // ── 구경꾼: 해변 꽃게 · 갈매기 ──
  {
    const hop = t - s.crabT < 50 ? Math.abs(Math.sin((t - s.crabT) * 0.25)) * R(0.03) : 0;
    const cx = R(0.075 + 0.025 * Math.sin(t * 0.015)), cy = R(0.99) - hop, k = R(0.045);
    ctx.fillStyle = 'rgba(60,40,20,.2)';
    ell(ctx, cx, R(0.993), k * 0.5, k * 0.12);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.3;
    ctx.fillStyle = '#ff6a4a';
    for (const sd of [-1, 1]) {
      ell(ctx, cx + sd * k * 0.55, cy - k * 0.45 - (hop ? k * 0.2 : 0), k * 0.18, k * 0.15);
      ctx.fill();
      ctx.stroke();
    }
    ell(ctx, cx, cy - k * 0.2, k * 0.42, k * 0.28);
    ctx.fill();
    ctx.stroke();
    eyes(ctx, cx, cy - k * 0.5, k * 0.07, k * 0.13, hop ? 'cheer' : 'idle', t, 0);
    for (let i = 0; i < 2; i++) {
      const bx = ((hsh(i + 30) * w + t * (0.35 + i * 0.12)) % (w + R(0.2))) - R(0.1), by = R(0.2 + i * 0.07) + Math.sin(t * 0.04 + i) * 4, fl = Math.sin(t * (t - s.cheerT < 60 ? 0.6 : 0.2) + i * 2) * R(0.012);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(bx - R(0.025), by - fl);
      ctx.quadraticCurveTo(bx - R(0.01), by - R(0.012), bx, by);
      ctx.quadraticCurveTo(bx + R(0.01), by - R(0.012), bx + R(0.025), by - fl);
      ctx.stroke();
    }
  }
  // 구름 (위)
  ctx.globalAlpha = 0.85;
  for (let i = 0; i < 3; i++) {
    const cx = ((hsh(i + 50) * w * 1.3 + t * (0.1 + i * 0.05)) % (w * 1.3)) - w * 0.15;
    drawPuff(ctx, cx, R(0.165 + i * 0.012), R(0.035 + hsh(i + 51) * 0.02));
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────────── 큰 장면 카드 ─────────────────────────────
const S_TITLE: Record<string, string> = {
  chest: '보물 상자!', big: '큰 보물 상자!', monster: '괴물이다!', boss: '큰 우두머리!', camp: '쉼터', shop: '떠돌이 상인', bye: '떠돌이 상인',
  cave: '어두운 동굴', trap: '덜컥! 함정', mystery: '물음표…', goal: '보물이다!',
};
function drawScene(ctx: C2, s: TState, w: number, t: number) {
  const R = (r: number) => r * w, P = PAL[s.stage];
  const kind = s.phase === 'shop' ? 'shop' : s.ek;
  if (!kind) return;
  const age = t - s.sceneT, ap = back(age / 9);
  const x0 = R(SC.x), y0 = R(SC.y), sw = R(SC.w), sh = R(SC.h), cxm = x0 + sw / 2, cym = y0 + sh / 2;
  ctx.save();
  ctx.globalAlpha = clamp(age / 4, 0, 1);
  ctx.translate(cxm, cym);
  ctx.scale(0.7 + 0.3 * ap, 0.7 + 0.3 * ap);
  ctx.translate(-cxm, -cym);
  // 그림자 · 나무 테
  ctx.fillStyle = 'rgba(40,30,10,.3)';
  rr(ctx, x0 + 4, y0 + 7, sw, sh, R(0.045));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + sh, [0, '#c88a4a'], [1, '#8a5222']);
  rr(ctx, x0, y0, sw, sh, R(0.045));
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  const ix = x0 + R(0.016), iy = y0 + R(0.016), iw = sw - R(0.032), ih = sh - R(0.032);
  ctx.save();
  rr(ctx, ix, iy, iw, ih, R(0.032));
  ctx.clip();
  const gy = y0 + sh * 0.8, px = x0 + sw * 0.27, ox = x0 + sw * 0.72, k = sh * 0.4;
  const et = s.et, r = s.res;
  const cave = kind === 'cave';
  // 배경
  if (cave) {
    ctx.fillStyle = lin(ctx, 0, iy, 0, iy + ih, [0, '#2a2448'], [1, '#4a3a5a']);
    ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = '#3a3258';
    for (let i = 0; i < 7; i++) {
      ell(ctx, ix + (i / 6) * iw, iy + ih * (0.05 + hsh(i) * 0.1), R(0.08), R(0.06));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(ix + (i / 6) * iw - R(0.02), iy + ih * 0.12);
      ctx.lineTo(ix + (i / 6) * iw, iy + ih * (0.22 + hsh(i + 3) * 0.1));
      ctx.lineTo(ix + (i / 6) * iw + R(0.02), iy + ih * 0.12);
      ctx.fill();
    }
    ctx.fillStyle = '#5a4a6a';
    ctx.fillRect(ix, gy, iw, ih);
  } else {
    const mist = kind === 'mystery';
    ctx.fillStyle = lin(ctx, 0, iy, 0, gy, [0, mist ? '#d8c8ff' : P.sky ? '#8ad0ff' : '#9adcff'], [1, mist ? '#f4ecff' : '#fff6dc']);
    ctx.fillRect(ix, iy, iw, ih);
    ctx.fillStyle = radg(ctx, ix + iw * 0.85, iy + ih * 0.1, 0, iw * 0.5, [0, 'rgba(255,250,210,.9)'], [1, 'rgba(255,250,210,0)']);
    ctx.fillRect(ix, iy, iw, ih);
    // 먼 바다 · 언덕
    if (!P.sky) {
      ctx.fillStyle = P.sea[1];
      ctx.fillRect(ix, gy - sh * 0.2, iw, sh * 0.2);
      ctx.strokeStyle = 'rgba(255,255,255,.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 5; i++) {
        const xx = ix + ((hsh(i + 70) * iw + t * 0.3) % iw);
        ctx.beginPath();
        ctx.moveTo(xx, gy - sh * (0.06 + i * 0.03));
        ctx.lineTo(xx + R(0.04), gy - sh * (0.06 + i * 0.03));
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 4; i++) drawPuff(ctx, ix + (i / 3) * iw, gy - sh * 0.06, R(0.07));
    }
    ctx.fillStyle = P.g1;
    ctx.beginPath();
    ctx.moveTo(ix, gy - sh * 0.1);
    ctx.quadraticCurveTo(ix + iw * 0.3, gy - sh * 0.2, ix + iw * 0.55, gy - sh * 0.08);
    ctx.quadraticCurveTo(ix + iw * 0.8, gy - sh * 0.17, ix + iw, gy - sh * 0.06);
    ctx.lineTo(ix + iw, iy + ih);
    ctx.lineTo(ix, iy + ih);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, gy - sh * 0.04, 0, iy + ih, [0, P.g0], [1, P.g1]);
    ctx.fillRect(ix, gy - sh * 0.03, iw, ih);
    if (P.tree !== 4) {
      drawPalm(ctx, ix + iw * 0.06, gy - sh * 0.04, R(0.16), 0.5, t);
      drawPalm(ctx, ix + iw * 0.96, gy - sh * 0.06, R(0.13), -0.6, t);
    }
    ctx.fillStyle = P.path;
    ell(ctx, ix + iw * 0.5, gy + sh * 0.02, iw * 0.42, sh * 0.06);
    ctx.fill();
  }
  // ── 탐험대 포즈 ──
  let pose: Pose = 'idle', bearPose: Pose | undefined, dx = 0, dy = 0;
  const T = T_EV[kind];
  const lunge = (h: number) => {
    const d2 = et - h;
    return Math.abs(d2) < 7 ? 1 - Math.abs(d2) / 7 : 0;
  };
  let hitNear = -999;
  if (T?.hit) for (const h of T.hit) if (Math.abs(et - h) < Math.abs(et - hitNear)) hitNear = h;
  const hitIdx = T?.hit ? T.hit.indexOf(hitNear) : -1;
  const hurtNow = T?.hit && et >= hitNear && et - hitNear < 12 && (s.hits[hitIdx] ?? 0) > 0;
  if (kind === 'chest' || kind === 'big' || kind === 'goal') pose = et >= (kind === 'goal' ? 26 : 8) ? 'cheer' : 'idle';
  else if (kind === 'monster' || kind === 'boss') {
    pose = hurtNow ? 'hurt' : T && et >= T.check! + 4 && r && !r.dead ? 'cheer' : 'idle';
    dx = lunge(hitNear) * R(0.06);
  } else if (kind === 'camp') pose = et < 46 ? 'rest' : 'cheer';
  else if (kind === 'cave') pose = r && r.taken > 0 ? (et >= 12 ? (hurtNow ? 'hurt' : 'scared') : 'idle') : et >= 30 ? 'cheer' : 'idle';
  else if (kind === 'trap') {
    pose = et < 10 ? 'idle' : et < 40 ? 'scared' : 'dizzy';
    dy = et < 10 ? 0 : et < 40 ? easeOut((et - 10) / 6) * k * 0.55 : Math.max(0, 1 - (et - 40) / 14) * k * 0.55;
  } else if (kind === 'mystery') pose = 'scared';
  else if (kind === 'shop' || kind === 'bye') pose = kind === 'bye' && s.bought ? 'cheer' : 'idle';
  if (T?.apple !== undefined && r && r.apples > 0 && et >= T.apple - 2 && et < T.apple + 26) bearPose = 'eat';
  // 함정 구덩이
  if (kind === 'trap' && et >= 10) {
    ctx.fillStyle = '#3a2210';
    ell(ctx, px, gy + k * 0.02, k * 0.75, k * 0.16);
    ctx.fill();
  }
  // 동굴 빛
  const lit = cave && r && r.taken === 0;
  ctx.save();
  if (kind === 'trap' && et >= 10) {
    ctx.beginPath();
    ctx.rect(ix, iy, iw, gy + k * 0.02 - iy);
    ctx.clip();
  }
  const bag = { apple: s.apple, torch: s.torch, shield: s.shield };
  drawParty(ctx, px, gy + dy, k, pose, t, bag, s.leader, { bearPose, dx });
  ctx.restore();
  if (kind === 'trap' && et >= 10) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(px, gy + k * 0.02, k * 0.75, k * 0.16, 0, 0, Math.PI);
    ctx.stroke();
    for (let i = 0; i < 5; i++) drawRock(ctx, px - k * 0.6 + i * k * 0.3, gy + k * 0.14, k * 0.18, '#a89070');
  }
  // 방패가 막는다
  if ((kind === 'monster' || kind === 'boss') && s.shUsed && et >= (T?.hit?.[0] ?? 0) - 2 && et < (T?.hit?.[0] ?? 0) + 20) {
    const a = 1 - Math.max(0, et - (T?.hit?.[0] ?? 0) - 10) / 10;
    ctx.globalAlpha = clamp(a, 0, 1);
    drawShieldIcon(ctx, px + k * 0.55, gy - k * 0.5, k * 0.3);
    ctx.globalAlpha = 1;
  }
  // ── 사건 물건 ──
  if (kind === 'chest' || kind === 'big') {
    const open = clamp((et - 6) / 5, 0, 1);
    if (open > 0) {
      ctx.save();
      ctx.translate(ox, gy - k * 0.35);
      ctx.rotate(t * 0.02);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(TAU / 12);
        ctx.fillStyle = `rgba(255,236,140,${0.35 * open})`;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-R(0.03), -R(0.4));
        ctx.lineTo(R(0.03), -R(0.4));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    drawChest(ctx, ox, gy, k * (kind === 'big' ? 0.75 : 0.85), open, t, kind === 'big');
    coins(ctx, ox, gy - k * 0.4, px + k * 0.1, gy - k * 1.0, et - 8, Math.min(16, (r?.gain ?? 6) + 4), k);
  } else if (kind === 'goal') {
    const open = clamp((et - 24) / 6, 0, 1);
    if (open > 0) {
      ctx.save();
      ctx.translate(ox, gy - k * 0.4);
      ctx.rotate(t * 0.025);
      for (let i = 0; i < 16; i++) {
        ctx.rotate(TAU / 16);
        ctx.fillStyle = i % 2 ? 'rgba(255,236,140,.45)' : 'rgba(255,255,255,.35)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-R(0.04), -R(0.6));
        ctx.lineTo(R(0.04), -R(0.6));
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    const shake = et < 24 ? Math.sin(et * 1.3) * (et / 24) * R(0.01) : 0;
    drawChest(ctx, ox + shake, gy, k * 0.95, open, t, true);
    coins(ctx, ox, gy - k * 0.5, px, gy - k * 1.1, et - 26, 26, k);
    // 꽃가루
    if (et >= 26)
      for (let i = 0; i < 30; i++) {
        const u = (et - 26 - i * 0.6) / 70;
        if (u < 0 || u > 1) continue;
        const cx2 = ix + hsh(i + 5) * iw + Math.sin(u * 8 + i) * R(0.02), cy2 = iy + u * ih * 0.9;
        ctx.fillStyle = ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff', '#ff8ad0'][i % 5];
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(u * 9 + i);
        ctx.fillRect(-R(0.008), -R(0.004), R(0.016), R(0.008));
        ctx.restore();
      }
  } else if (kind === 'monster' || kind === 'boss') {
    const check = T!.check!;
    const enter = 1 - easeOut(et / 10), won = r && !r.dead && et >= check;
    const mx = ox + R(0.35) * enter - lunge(hitNear) * R(0.06);
    if (!won || et - check < 16) {
      const u = won ? (et - check) / 16 : 0;
      ctx.save();
      ctx.globalAlpha = 1 - u;
      ctx.translate(mx, gy - k * 0.3);
      ctx.rotate(u * 4);
      ctx.scale(1 - u * 0.7, 1 - u * 0.7);
      const mood: MonMood = hurtNow || (Math.abs(et - hitNear) < 6 && et > 10) ? 'hurt' : u > 0 ? 'hurt' : s.fear0 > 0 ? 'scared' : 'angry';
      if (kind === 'boss') drawBoss(ctx, 0, k * 0.3, k * 1.15, mood, t);
      else drawMonster(ctx, 0, k * 0.3, k * (0.7 + (s.eff?.pw ?? 1) * 0.12), s.stage, mood, t);
      if (mood === 'scared') sweat(ctx, 0, -k * (kind === 'boss' ? 0.75 : 0.6), k * 0.07, t);
      ctx.restore();
      if (s.fear0 > 0 && et < (T!.hit![0] ?? 0) + 4) {
        ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        txt(ctx, s.fear0 >= 2 ? '벌벌… 겁먹었다!' : '덜덜… 겁먹었다!', mx, gy - k * (kind === 'boss' ? 1.45 : 1.15), '#2a6ab8', '#ffffff', 4);
      }
    }
    if (won) {
      for (let i = 0; i < 6; i++) {
        const u = (et - check) / 26;
        if (u > 1) break;
        ctx.globalAlpha = 1 - u;
        drawPuff(ctx, mx + Math.cos(i) * u * R(0.12), gy - k * 0.3 + Math.sin(i * 2) * u * R(0.08) - u * R(0.05), R(0.04) * (1 - u * 0.5), '#ffffff');
      }
      ctx.globalAlpha = 1;
      coins(ctx, mx, gy - k * 0.4, px + k * 0.1, gy - k * 1.0, et - check, Math.min(16, (r?.gain ?? 6)), k);
    }
    // 퉁! 부딪침
    const near = et - hitNear;
    if (et > 6 && Math.abs(near) < 5) {
      const cx2 = px + k * 0.3 + (mx - px - k * 0.3) * 0.62, cy2 = gy - k * 0.62, sz = R(0.06) * (1 + (5 - Math.abs(near)) * 0.08);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      burstPath(ctx, cx2, cy2, sz * 1.3, sz, 10, 0.7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffe14a';
      burstPath(ctx, cx2, cy2, sz * 0.9, sz * 0.7, 8, 0.6);
      ctx.fill();
      ctx.font = `900 ${Math.max(14, R(0.05))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      txt(ctx, '퉁!', cx2, cy2 + 1, '#c8341a', '#ffffff', 4);
    }
  } else if (kind === 'camp') {
    drawCamp(ctx, ox, gy, k * 0.8, t);
    if (et < 46) {
      ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const u = ((et * 0.02 + i / 3) % 1);
        ctx.globalAlpha = Math.sin(u * Math.PI);
        txt(ctx, 'z', px + k * 0.2 + u * R(0.08), gy - k * (1.2 + u * 0.5), '#5a6ab8', '#ffffff', 3);
      }
      ctx.globalAlpha = 1;
    }
    for (let i = 0; i < 6; i++) {
      const u = (et - 12 - i * 5) / 40;
      if (u < 0 || u > 1) continue;
      ctx.globalAlpha = Math.sin(u * Math.PI);
      ctx.fillStyle = '#ff5a6a';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      heartPath(ctx, px - k * 0.3 + i * k * 0.15, gy - k * (0.8 + u * 0.8), R(0.022));
      ctx.fill();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (kind === 'shop' || kind === 'bye') {
    drawMerchant(ctx, ox, gy, k * 0.95, t, kind === 'bye');
    const msg = kind === 'shop' ? '하나만 골라 봐!' : s.bought ? '고마워!' : '또 만나~';
    ctx.font = `800 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    const tw = ctx.measureText(msg).width + R(0.04), bx = ox - k * 0.25, by = gy - k * 1.05;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    rr(ctx, bx - tw / 2, by - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx - R(0.01), by + R(0.026));
    ctx.lineTo(bx + R(0.02), by + R(0.05));
    ctx.lineTo(bx + R(0.02), by + R(0.026));
    ctx.fill();
    ctx.fillStyle = OUT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, bx, by + 1);
    if (kind === 'bye' && s.bought && et < 22) {
      const u = easeOut(et / 20), ix2 = ox + (px - k * 0.2 - ox) * u, iy2 = gy - k * 0.6 - Math.sin(u * Math.PI) * k * 0.6;
      if (s.bought === 'apple') drawApple(ctx, ix2, iy2, R(0.03));
      else if (s.bought === 'torch') drawTorch(ctx, ix2, iy2, R(0.08), false, t);
      else drawShieldIcon(ctx, ix2, iy2, R(0.035));
    }
  } else if (cave) {
    if (lit) {
      const L = easeOut((et - 8) / 16);
      if (L > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = radg(ctx, px + k * 0.3, gy - k * 0.5, 0, iw * 0.75 * L, [0, 'rgba(255,200,110,.55)'], [1, 'rgba(255,180,90,0)']);
        ctx.fillRect(ix, iy, iw, ih);
        ctx.restore();
        // 보석 더미
        ctx.globalAlpha = L;
        ctx.fillStyle = '#ffd23a';
        ctx.beginPath();
        ctx.moveTo(ox - k * 0.6, gy);
        ctx.quadraticCurveTo(ox, gy - k * 0.6, ox + k * 0.6, gy);
        ctx.closePath();
        ctx.fill();
        for (let i = 0; i < 7; i++) drawGem(ctx, ox - k * 0.4 + (i % 4) * k * 0.27, gy - k * (0.12 + Math.floor(i / 4) * 0.2 + (i % 2) * 0.06), R(0.02), i);
        ctx.globalAlpha = 1;
        if (et >= 30) coins(ctx, ox, gy - k * 0.3, px + k * 0.1, gy - k * 1.0, et - 30, 14, k);
      }
      if (s.leader !== 'owl') drawTorch(ctx, px + k * 0.55, gy - k * 0.55, R(0.07), true, t);
    } else {
      // 어둠 속 눈들 · 박쥐 떼
      for (let i = 0; i < 6; i++) {
        if ((t + i * 23) % 90 < 6) continue;
        ctx.fillStyle = '#ffe14a';
        const ex = ox - k * 0.5 + hsh(i + 40) * k, ey = gy - k * (0.4 + hsh(i + 41) * 0.8);
        ell(ctx, ex - 3, ey, 2.2, 1.8);
        ctx.fill();
        ell(ctx, ex + 3, ey, 2.2, 1.8);
        ctx.fill();
      }
      if (et >= 10 && et < 50) for (let i = 0; i < 9; i++) bat(ctx, px + Math.cos(t * 0.15 + i * 0.7) * k * (0.5 + (i % 3) * 0.15), gy - k * (0.6 + Math.sin(t * 0.2 + i) * 0.3), R(0.025), t + i * 3);
    }
  } else if (kind === 'mystery') {
    const sp = et < 10 ? 1 : Math.cos(((et - 10) / 10) * Math.PI);
    ctx.save();
    ctx.translate(ox, gy);
    ctx.rotate(et < 10 ? Math.sin(et * 1.2) * 0.08 : 0);
    ctx.scale(Math.max(0.05, Math.abs(sp)), 1);
    if (sp > 0) drawMyst(ctx, 0, 0, k * 0.85, t);
    else drawKind(ctx, s.node?.out ?? 'chest', 0, 0, k * 0.8, t, s.stage, MYST[s.node?.out ?? 'big']);
    ctx.restore();
  }
  // 결과 띠 (아래)
  const lines = sceneResult(s, kind);
  if (lines.length) {
    ctx.font = `900 ${Math.max(14, R(0.045))}px system-ui, sans-serif`;
    const text = lines.map((q) => q[0]).join('  ');
    const tw = ctx.measureText(text).width + R(0.06), by = iy + ih - R(0.045);
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    rr(ctx, cxm - tw / 2, by - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let xx = cxm - tw / 2 + R(0.03);
    for (const [q, col] of lines) {
      ctx.fillStyle = col;
      ctx.fillText(q, xx, by + 1);
      xx += ctx.measureText(q + '  ').width;
    }
  }
  ctx.restore();
  // 제목 리본
  const title = kind === 'mystery' && et >= 15 ? '물음표!' : S_TITLE[kind] ?? '';
  if (title) {
    ctx.font = `900 ${Math.max(15, R(0.05))}px system-ui, sans-serif`;
    const tw = ctx.measureText(title).width + R(0.1), ty = y0 + R(0.005);
    const col = kind === 'monster' || kind === 'boss' || kind === 'trap' ? '#e8483a' : kind === 'camp' ? '#3cae5a' : kind === 'shop' || kind === 'bye' || kind === 'mystery' ? '#8a52d8' : kind === 'cave' ? '#4a5aa8' : '#f0a018';
    ctx.fillStyle = col;
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cxm - tw / 2 - R(0.03), ty - R(0.03));
    ctx.lineTo(cxm + tw / 2 + R(0.03), ty - R(0.03));
    ctx.lineTo(cxm + tw / 2 + R(0.01), ty);
    ctx.lineTo(cxm + tw / 2 + R(0.03), ty + R(0.03));
    ctx.lineTo(cxm - tw / 2 - R(0.03), ty + R(0.03));
    ctx.lineTo(cxm - tw / 2 - R(0.01), ty);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    txt(ctx, title, cxm, ty + 1, '#ffffff', OUT, 3);
  }
  ctx.restore();
}
function sceneResult(s: TState, kind: string): [string, string][] {
  const r = s.res, et = s.et, T = T_EV[kind];
  const out: [string, string][] = [];
  if (!r || !T) return out;
  if ((kind === 'chest' || kind === 'big') && et >= T.gain!) out.push([`금화 +${r.gain}`, '#d08a00']);
  if (kind === 'camp' && et >= T.gain!) out.push([r.q.hp >= HPMAX ? '체력 가득!' : `체력 ${r.q.hp}`, '#2a9a4a']);
  if ((kind === 'monster' || kind === 'boss') && et >= T.hit![0]) {
    out.push([r.taken ? `체력 -${r.taken}` : '안 아파!', '#e0402a']);
    if (et >= T.check! && !r.dead) out.push([`금화 +${r.gain}`, '#d08a00']);
  }
  if (kind === 'cave' && et >= 16) out.push(r.taken ? [`박쥐! 체력 -${r.taken}`, '#e0402a'] : et >= 30 ? [`금화 +${r.gain}`, '#d08a00'] : ['반짝반짝…', '#8a6a1a']);
  if (kind === 'trap' && et >= 10) out.push([`체력 -${r.taken}`, '#e0402a']);
  if (r.apples && T.apple !== undefined && et >= T.apple) out.push([`사과 냠 +${healOf(APPLE, s.leader) * r.apples}`, '#2a9a4a']);
  return out;
}
/** 쏟아지는 금화 (사건 시계 u틱 기준, 결정적) */
function coins(ctx: C2, x0: number, y0: number, x1: number, y1: number, u0: number, n: number, k: number) {
  if (u0 < 0) return;
  for (let i = 0; i < n; i++) {
    const u = (u0 - i * 1.3) / 26;
    if (u < 0 || u > 1.15) continue;
    const spread = (hsh(i + 9) - 0.5) * k * 0.9;
    const x = x0 + (x1 - x0) * u + spread * Math.sin(u * Math.PI), y = y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * k * (0.8 + hsh(i) * 0.5);
    ctx.globalAlpha = u > 1 ? Math.max(0, (1.15 - u) / 0.15) : 1;
    drawCoin(ctx, x, y, k * 0.07, u0 * 0.4 + i);
  }
  ctx.globalAlpha = 1;
}
function bat(ctx: C2, x: number, y: number, r: number, t: number) {
  const f = Math.sin(t * 0.9) * 0.6;
  ctx.fillStyle = '#2a2236';
  ctx.strokeStyle = '#5a4a7a';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + sd * r * 1.2, y - r * (1 + f), x + sd * r * 2.2, y - r * f * 0.5);
    ctx.quadraticCurveTo(x + sd * r * 1.4, y + r * 0.2, x + sd * r * 1.2, y + r * 0.5);
    ctx.quadraticCurveTo(x + sd * r * 0.8, y + r * 0.1, x, y + r * 0.4);
    ctx.fill();
    ctx.stroke();
  }
  ell(ctx, x, y, r * 0.55, r * 0.6);
  ctx.fill();
  ctx.fillStyle = '#ff5a5a';
  ell(ctx, x - r * 0.2, y - r * 0.1, r * 0.12, r * 0.12);
  ctx.fill();
  ell(ctx, x + r * 0.2, y - r * 0.1, r * 0.12, r * 0.12);
  ctx.fill();
}

// ───────────────────────────── 카드 ─────────────────────────────
const GOLDC = '#c47f00', REDC = '#e0402a', GREENC = '#2a9a4a', INK = '#3a2412';
interface CardInfo { col: string; bg: [string, string]; title: string; lines: [string, string][]; icon: string; node: Node | null; dis: boolean; warn: boolean }
function cardInfo(s: TState, o: Opt): CardInfo {
  if (o.kind === 'crew') {
    const c = o.crew!;
    return { col: c === 'fox' ? '#ff8a3a' : c === 'bear' ? '#b07a44' : '#6a7ae0', bg: ['#fff4d8', '#ffe2b0'], title: C_NAME[c], lines: [[C_DESC[c][0], INK], [C_DESC[c][1], GREENC]], icon: 'crew:' + c, node: null, dis: false, warn: false };
  }
  if (o.kind === 'leave') return { col: '#8aa0b0', bg: ['#eef6ff', '#d4e6f4'], title: '그냥 가기', lines: [['금화 아끼기', GOLDC], [`지금 ${s.gold}`, INK]], icon: 'leave', node: null, dis: false, warn: false };
  if (o.kind === 'buy') {
    const it = o.item!, dis = s.gold < PRICE[it];
    return { col: it === 'apple' ? '#e8483a' : it === 'torch' ? '#f09a2a' : '#3a8ae0', bg: ['#fff8e8', '#ffe8c0'], title: I_NAME[it], lines: [[`금화 ${PRICE[it]}`, dis ? REDC : GOLDC], [dis ? '금화가 모자라요' : I_DESC[it], dis ? REDC : GREENC]], icon: 'item:' + it, node: null, dis, warn: false };
  }
  const n = s.map[s.row + 1][o.lane]!;
  const hidden = n.k === 'mystery' && s.leader !== 'owl';
  const kind = n.k === 'mystery' && !hidden ? n.out! : n.k;
  const eff = n.k === 'mystery' ? MYST[n.out!] : n;
  const q = psOf(s);
  const e = hidden ? null : effect(kind as K | Out, eff, q, s.leader);
  const L: [string, string][] = [];
  let title = '', col = '#ffb21a', bg: [string, string] = ['#d8f4b0', '#9ed870'];
  switch (kind) {
    case 'chest': title = '보물 상자'; L.push([`금화 +${e!.gain}`, GOLDC]); col = '#f0a818'; break;
    case 'big': title = '큰 보물 상자'; L.push([`금화 +${e!.gain}`, GOLDC]); col = '#f0a818'; break;
    case 'monster': case 'boss':
      title = kind === 'boss' ? '큰 우두머리' : '괴물';
      col = '#e8483a';
      bg = ['#e0d4f0', '#b8a8d8'];
      if (e!.dead) L.push(['쓰러져요!', REDC], [`체력 -${e!.taken}`, REDC]);
      else L.push([e!.taken ? `체력 -${e!.taken}` : '안 아파요', REDC], [`금화 +${e!.gain}`, GOLDC]);
      break;
    case 'camp': title = '쉼터'; L.push([q.hp - s.hp > 0 ? `체력 +${q.hp - s.hp}` : '체력 가득', GREENC]); col = '#3cae5a'; bg = ['#fff0c8', '#ffd890']; break;
    case 'shop': title = '떠돌이 상인'; L.push([n.offers.map((it) => I_NAME[it]).join('·'), '#7a42c8'], ['사고 가요', INK]); col = '#9a5ae0'; bg = ['#f0e4ff', '#d8c0ff']; break;
    case 'cave':
      title = '어두운 동굴';
      col = '#4a5aa8';
      bg = ['#c8ccec', '#8a90c0'];
      if (e!.gain > 0) L.push([s.leader === 'owl' ? '부엉이 눈!' : '횃불 있음', INK], [`금화 +${e!.gain}`, GOLDC]);
      else L.push(['횃불 없음!', REDC], [e!.dead ? '쓰러져요!' : `박쥐 체력 -${e!.taken}`, REDC]);
      break;
    case 'trap': title = '함정'; L.push([e!.dead ? '쓰러져요!' : `체력 -${e!.taken}`, REDC]); col = '#a86a2a'; bg = ['#f0dcc0', '#d8b890']; break;
    case 'mystery': title = '물음표 길'; L.push(['큰 상자?', GOLDC], ['함정?', REDC]); col = '#8a52d8'; bg = ['#ece0ff', '#c8b0f8']; break;
  }
  if (e && e.apples > 0 && L.length < 2) L.push(['사과 냠', GREENC]);
  return { col, bg, title, lines: L, icon: hidden ? 'mystery' : kind, node: n.k === 'mystery' ? MYST[n.out!] : n, dis: false, warn: !!e?.dead };
}

function drawCards(ctx: C2, s: TState, w: number, t: number) {
  const R = (r: number) => r * w, n = s.opts.length;
  if (!n) return;
  const live = s.phase === 'pick' || s.phase === 'shop' || s.phase === 'crew';
  for (let i = 0; i < n; i++) {
    const o = s.opts[i], rc = optRect(n, i), info = cardInfo(s, o);
    const app = easeOut((t - s.optT - i * 2) / 10);
    const sel = s.kb && s.sel === i;
    const bob = live ? Math.sin(t * 0.09 + i * 1.3) * 1.6 : 0;
    const x = R(rc.x), y = R(rc.y) + (1 - app) * R(0.25) + bob - (sel ? R(0.012) : 0), cw = R(rc.w), ch = R(rc.h);
    ctx.save();
    ctx.globalAlpha = clamp(app * 1.4, 0, 1);
    // 그림자 · 몸
    ctx.fillStyle = 'rgba(60,40,10,.28)';
    rr(ctx, x + 2, y + 5, cw, ch, R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, x, y, cw, ch, R(0.03));
    ctx.fill();
    ctx.strokeStyle = info.col;
    ctx.lineWidth = 3;
    ctx.stroke();
    // 그림 칸
    const ih = ch * 0.56, pad = R(0.01);
    ctx.save();
    rr(ctx, x + pad, y + pad, cw - pad * 2, ih, R(0.022));
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, y, 0, y + ih, [0, info.bg[0]], [1, info.bg[1]]);
    ctx.fillRect(x, y, cw, ih + pad);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ell(ctx, x + cw / 2, y + ih * 0.98, cw * 0.48, ih * 0.16);
    ctx.fill();
    const ix = x + cw / 2, iy = y + pad + ih * 0.9, ik = Math.min(cw * 0.62, ih * 0.82);
    const ic = info.icon;
    if (ic.startsWith('crew:')) {
      const c = ic.slice(5) as Crew;
      ctx.save();
      ctx.translate(ix, iy + ik * 0.05);
      if (c === 'fox') drawFox(ctx, ik * 1.05, 'cheer', t, 0);
      else if (c === 'bear') drawBear(ctx, ik * 0.95, 'idle', t, { apple: 1, torch: 1, shield: 0 }, 0);
      else drawOwl(ctx, ik * 1.2, 'idle', t, 0);
      ctx.restore();
    } else if (ic.startsWith('item:')) {
      const it = ic.slice(5) as Item;
      if (it === 'apple') drawApple(ctx, ix, iy - ik * 0.4, ik * 0.3);
      else if (it === 'torch') drawTorch(ctx, ix, iy - ik * 0.5, ik * 0.7, true, t);
      else drawShieldIcon(ctx, ix, iy - ik * 0.42, ik * 0.36);
    } else if (ic === 'leave') {
      ctx.fillStyle = '#9a6234';
      ctx.fillRect(ix - ik * 0.03, iy - ik * 0.75, ik * 0.06, ik * 0.75);
      ctx.fillStyle = '#e8c48a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ix - ik * 0.3, iy - ik * 0.72);
      ctx.lineTo(ix + ik * 0.25, iy - ik * 0.72);
      ctx.lineTo(ix + ik * 0.38, iy - ik * 0.6);
      ctx.lineTo(ix + ik * 0.25, iy - ik * 0.48);
      ctx.lineTo(ix - ik * 0.3, iy - ik * 0.48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else drawKind(ctx, ic, ix, iy, ik * 0.95, t, s.stage, info.node, s.fear > 0 && o.kind === 'path');
    if (info.node && (ic === 'monster' || ic === 'boss')) for (let q = 0; q < Math.min(3, info.node.pw); q++) drawSkull(ctx, x + cw - R(0.026) - q * R(0.034), y + R(0.03), R(0.014));
    if (info.node && ic === 'monster' && s.shield > 0) drawShieldIcon(ctx, x + R(0.03), y + ih - R(0.02), R(0.018));
    if (info.node && (ic === 'monster' || ic === 'boss') && s.fear > 0 && o.kind === 'path') {
      ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const lab = `겁먹음 -${FEAR * s.fear}`, tw = ctx.measureText(lab).width + R(0.02);
      ctx.fillStyle = '#e4f4ff';
      ctx.strokeStyle = '#2a6ab8';
      ctx.lineWidth = 1.5;
      rr(ctx, x + R(0.04), y + R(0.012), tw, R(0.036), R(0.018));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#2a6ab8';
      ctx.fillText(lab, x + R(0.05), y + R(0.031));
      sweat(ctx, ix + ik * 0.05, iy - ik * 0.62, ik * 0.07, t);
    }
    ctx.restore();
    // 글자
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fs = Math.max(12, R(0.038));
    ctx.font = `900 ${fs}px system-ui, sans-serif`;
    let title = info.title;
    while (ctx.measureText(title).width > cw - R(0.02) && title.length > 2) title = title.slice(0, -1);
    ctx.fillStyle = INK;
    ctx.fillText(title, x + cw / 2, y + ih + pad + ch * 0.09);
    ctx.font = `800 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
    info.lines.slice(0, 2).forEach(([q, c], j) => {
      let tq = q;
      while (ctx.measureText(tq).width > cw - R(0.016) && tq.length > 2) tq = tq.slice(0, -1);
      ctx.fillStyle = c;
      ctx.fillText(tq, x + cw / 2, y + ih + pad + ch * (0.215 + j * 0.115));
    });
    if (info.dis) {
      ctx.fillStyle = 'rgba(200,200,200,.45)';
      rr(ctx, x, y, cw, ch, R(0.03));
      ctx.fill();
    }
    if (info.warn) {
      ctx.strokeStyle = REDC;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      rr(ctx, x + 3, y + 3, cw - 6, ch - 6, R(0.026));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 번호
    ctx.fillStyle = info.col;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ell(ctx, x + R(0.022), y + R(0.022), R(0.02), R(0.02));
    ctx.fill();
    ctx.stroke();
    ctx.font = `900 ${Math.max(12, R(0.028))}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(i + 1), x + R(0.022), y + R(0.023));
    // 키보드 고르기 테두리
    if (sel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 6;
      rr(ctx, x - 4, y - 4, cw + 8, ch + 8, R(0.035));
      ctx.stroke();
      ctx.strokeStyle = '#ffb21a';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    // NEW
    if (s.spot && s.spot.i === i && t - s.spot.t < 160) {
      const pul = 1 + 0.08 * Math.sin(t * 0.3);
      ctx.save();
      ctx.translate(x + cw / 2, y - R(0.012));
      ctx.scale(pul, pul);
      ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
      const lab = `NEW ${s.spot.label}`, tw = ctx.measureText(lab).width + R(0.03);
      ctx.fillStyle = '#ffe14a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      rr(ctx, -tw / 2, -R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.fillText(lab, 0, 1);
      ctx.restore();
    }
    ctx.restore();
  }
}

// ───────────────────────────── HUD ─────────────────────────────
function starNow(s: TState, q: Star): boolean {
  if (q.k === 'reach' || q.k === 'boss') return (s.phase === 'result' && s.ok) || (q.k === 'boss' && s.boss > 0);
  if (q.k === 'gold') return s.gold >= q.n;
  if (q.k === 'half') return s.hp * 2 > HPMAX;
  return s.kills >= q.n;
}
function drawHud(ctx: C2, s: TState, w: number) {
  const R = (r: number) => r * w, d = spec(s), hb = R(HUD_H);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#fffaf0'], [1, '#ffeac4']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(120,70,20,.35)';
  ctx.fillRect(0, hb - 2, w, 2);
  ctx.textBaseline = 'middle';
  const cy = hb / 2;
  ctx.fillStyle = lin(ctx, 0, cy - R(0.03), 0, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ell(ctx, R(0.05), cy, R(0.03), R(0.03));
  ctx.fill();
  ctx.stroke();
  ctx.font = `900 ${Math.max(13, R(0.038))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = OUT;
  ctx.fillText(String(s.stage + 1), R(0.05), cy + 1);
  ctx.textAlign = 'left';
  ctx.font = `900 ${Math.max(15, R(0.048))}px system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText(d.name, R(0.095), cy + 1);
  const nw = ctx.measureText(d.name).width;
  ctx.font = `700 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
  ctx.fillStyle = '#9a7a5a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.095) + nw, cy + 2);
  // 별 · 하트
  ctx.textAlign = 'right';
  ctx.font = `900 ${Math.max(14, R(0.042))}px system-ui, sans-serif`;
  const st = String(s.stars), sw = ctx.measureText(st).width;
  ctx.fillStyle = '#d08a00';
  ctx.fillText(st, w - R(0.03), cy + 1);
  starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.022));
  ctx.fillStyle = '#ffd23a';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 1.3;
  ctx.stroke();
  for (let j = 0; j < 3; j++) {
    const hx = w - R(0.03) - sw - R(0.085) - j * R(0.054), on = 2 - j < s.hearts;
    const lost = !on && s.phase === 'fail' && 2 - j === s.hearts && s.pt < 40;
    ctx.save();
    if (lost) (ctx.translate(hx, cy), ctx.scale(1 + (40 - s.pt) / 40, 1 + (40 - s.pt) / 40), ctx.translate(-hx, -cy));
    heartPath(ctx, hx, cy, R(0.019));
    ctx.fillStyle = on || lost ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(80,50,20,.15)';
    ctx.fill();
    ctx.strokeStyle = on || lost ? '#8a1a2a' : 'rgba(80,50,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  // 별 조건 칩
  ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
  const gap = R(0.014), icon = R(0.04), padx = R(0.022);
  const widths = (short: boolean) => d.stars.map((q) => ctx.measureText(short ? q.short : q.label).width + icon + padx * 2);
  let ws = widths(false), short = false;
  if (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1) > w - R(0.04)) (ws = widths(true)), (short = true);
  let xx = (w - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1))) / 2;
  const ch = R(CHIP_H), y0 = R(CHIP_Y);
  d.stars.forEach((q, i) => {
    const ok = starNow(s, q);
    ctx.fillStyle = ok ? '#fff4c0' : 'rgba(255,255,255,.95)';
    ctx.strokeStyle = ok ? '#e0a010' : 'rgba(120,70,20,.4)';
    ctx.lineWidth = 1.5;
    rr(ctx, xx, y0, ws[i], ch, ch / 2);
    ctx.fill();
    ctx.stroke();
    starPath(ctx, xx + padx * 0.6 + icon / 2, y0 + ch / 2, R(0.017));
    ctx.fillStyle = ok ? '#ffd23a' : '#ffffff';
    ctx.fill();
    ctx.strokeStyle = ok ? OUT : '#b09070';
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'left';
    ctx.fillText(short ? q.short : q.label, xx + padx * 0.6 + icon + R(0.004), y0 + ch / 2 + 1);
    xx += ws[i] + gap;
  });
}

/** 체력 · 금화 · 짐 띠 */
function drawBar(ctx: C2, s: TState, w: number, t: number) {
  const R = (r: number) => r * w, d = spec(s), y0 = R(BAR_Y), bh = R(BAR_H);
  ctx.fillStyle = lin(ctx, 0, y0, 0, y0 + bh, [0, '#fff6dc'], [1, '#f6dca8']);
  ctx.fillRect(0, y0, w, bh);
  ctx.fillStyle = '#a8703e';
  ctx.fillRect(0, y0, w, 3);
  ctx.textBaseline = 'middle';
  // 체력 하트 칸
  const r1 = y0 + bh * 0.3;
  ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.fillText('체력', R(0.025), r1 + 1);
  const hx0 = R(0.125), hs = R(0.033), lossAge = t - s.lossT;
  const half = d.stars.some((q) => q.k === 'half');
  for (let i = 0; i < HPMAX; i++) {
    const on = i < s.hp, x = hx0 + i * hs, flash = !on && lossAge < 24 && i < s.hp + 4;
    heartPath(ctx, x, r1, R(0.0125) * (flash ? 1 + (24 - lossAge) / 30 : 1));
    ctx.fillStyle = on ? (s.hp <= LOW ? (Math.floor(t / 10) % 2 ? '#ff4a5a' : '#ff8a95') : lin(ctx, x, r1 - R(0.014), x, r1 + R(0.014), [0, '#ff8a95'], [1, '#e2334a'])) : flash ? '#ffffff' : 'rgba(80,50,20,.14)';
    ctx.fill();
    ctx.strokeStyle = on ? '#8a1a2a' : 'rgba(80,50,20,.3)';
    ctx.lineWidth = 1.1;
    ctx.stroke();
    if (half && i === 5) {
      ctx.strokeStyle = '#2a9a4a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - hs / 2, r1 - R(0.02));
      ctx.lineTo(x - hs / 2, r1 + R(0.02));
      ctx.stroke();
    }
  }
  // 금화
  const gx = R(0.66), gain = t - s.gainT < 20;
  drawCoin(ctx, gx, r1, R(0.022) * (gain ? 1.2 : 1), gain ? (t - s.gainT) * 0.3 : 0);
  ctx.font = `900 ${Math.max(16, R(0.05)) * (gain ? 1.15 : 1)}px system-ui, sans-serif`;
  ctx.fillStyle = '#b06a00';
  ctx.fillText(String(s.gold), gx + R(0.032), r1 + 1);
  const gw = ctx.measureText(String(s.gold)).width;
  const gq = d.stars.find((q) => q.k === 'gold');
  if (gq) {
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = s.gold >= gq.n ? GREENC : '#9a7a5a';
    ctx.fillText(` / ${gq.n}`, gx + R(0.032) + gw, r1 + 2);
  }
  // 짐
  const r2 = y0 + bh * 0.74;
  ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
  ctx.fillStyle = INK;
  ctx.fillText('짐', R(0.025), r2 + 1);
  const items: Item[] = ['apple', 'torch', 'shield'];
  items.forEach((it, i) => {
    const x = R(0.12 + i * 0.16), n = s[it];
    ctx.globalAlpha = n > 0 ? 1 : 0.3;
    if (it === 'apple') drawApple(ctx, x, r2, R(0.014));
    else if (it === 'torch') {
      ctx.save();
      ctx.translate(x, r2 + R(0.004));
      ctx.rotate(0.7);
      drawTorch(ctx, 0, 0, R(0.03), n > 0, t);
      ctx.restore();
    }
    else drawShieldIcon(ctx, x, r2, R(0.017));
    ctx.fillStyle = INK;
    ctx.fillText(`${I_NAME[it]} ${n}`, x + R(0.024), r2 + 1);
    ctx.globalAlpha = 1;
  });
  if (s.fear > 0) {
    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.fillStyle = '#2a6ab8';
    ctx.fillText(`기세 ${'●'.repeat(s.fear)}${'○'.repeat(FEAR_MAX - s.fear)}`, s.leader ? w - R(0.24) : w - R(0.025), r2 + 1);
  }
  if (s.leader) {
    ctx.textAlign = 'right';
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.fillStyle = '#7a42c8';
    ctx.fillText(`대장: ${C_SHORT[s.leader]}`, w - R(0.025), r2 + 1);
  }
}

// ───────────────────────────── 판 카드 (시작 · 결과 · 쓰러짐) ─────────────────────────────
function panel(ctx: C2, w: number, y0: number, y1: number, col = '#fff8e6') {
  const R = (r: number) => r * w;
  ctx.fillStyle = 'rgba(30,60,80,.25)';
  ctx.fillRect(0, R(MAP_TOP), w, R(MAP_BOT - MAP_TOP));
  ctx.fillStyle = 'rgba(60,40,10,.3)';
  rr(ctx, R(0.07) + 3, R(y0) + 6, R(0.86), R(y1 - y0), R(0.04));
  ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, R(0.07), R(y0), R(0.86), R(y1 - y0), R(0.04));
  ctx.fill();
  ctx.strokeStyle = '#a8703e';
  ctx.lineWidth = 3;
  ctx.stroke();
}
function drawPanels(ctx: C2, s: TState, w: number, t: number) {
  const R = (r: number) => r * w, d = spec(s), cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (s.phase === 'intro') {
    const a = easeOut(s.pt / 10);
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, w, 0.24, 0.84);
    ctx.font = `800 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    ctx.fillStyle = '#9a7a5a';
    ctx.fillText(s.again ? '다시 한 번!' : `${s.stage + 1}번째 섬`, cx, R(0.3));
    ctx.font = `900 ${Math.max(24, R(0.085))}px system-ui, sans-serif`;
    txt(ctx, d.name, cx, R(0.37), '#c8641a', '#ffffff', 5);
    let y = 0.45;
    if (d.newLabel && !s.again) {
      ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
      const lab = `NEW  ${d.newLabel}`, tw = ctx.measureText(lab).width + R(0.05);
      ctx.fillStyle = '#ffe14a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      rr(ctx, cx - tw / 2, R(y) - R(0.028), tw, R(0.056), R(0.028));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.fillText(lab, cx, R(y) + 1);
      y += 0.065;
      ctx.font = `800 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
      ctx.fillStyle = INK;
      const parts = d.news.split(' — ').filter((p) => p !== d.newLabel);
      parts.forEach((p, i) => ctx.fillText(p, cx, R(y + i * 0.045)));
      y += parts.length * 0.045 + 0.02;
    }
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = '#9a7a5a';
    ctx.fillText('별 조건', cx, R(y));
    y += 0.05;
    ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    d.stars.forEach((q, i) => {
      const yy = R(y + i * 0.055);
      const tw = ctx.measureText(q.label).width;
      starPath(ctx, cx - tw / 2 - R(0.03), yy, R(0.018));
      ctx.fillStyle = '#ffd23a';
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.fillText(q.label, cx, yy + 1);
    });
    if (s.pt > 24) {
      ctx.globalAlpha = a * (0.6 + 0.4 * Math.sin(t * 0.15));
      ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
      ctx.fillStyle = '#2a7ad8';
      ctx.fillText(d.tip, cx, R(0.8));
    }
    ctx.restore();
  }
  if (s.phase === 'result') {
    const a = easeOut(s.pt / 10);
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, w, 0.26, 0.82, '#fffbe8');
    ctx.font = `900 ${Math.max(20, R(0.065))}px system-ui, sans-serif`;
    txt(ctx, s.won ? '보물섬을 다 돌았다!' : `${d.name} 보물 찾았다!`, cx, R(0.33), '#c8641a', '#ffffff', 5);
    const n = s.starOk.length;
    for (let i = 0; i < n; i++) {
      const at = 18 + i * 16, u = back((s.pt - at) / 10), x = cx + (i - (n - 1) / 2) * R(0.17), y = R(0.44);
      starPath(ctx, x, y, R(0.06));
      ctx.fillStyle = 'rgba(120,80,30,.15)';
      ctx.fill();
      if (s.pt >= at && s.starOk[i]) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(u, u);
        ctx.rotate((1 - u) * 1.5);
        starPath(ctx, 0, 0, R(0.06));
        ctx.fillStyle = lin(ctx, 0, -R(0.06), 0, R(0.06), [0, '#fff3a0'], [1, '#f0a818']);
        ctx.fill();
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.font = `800 ${Math.max(13, R(0.038))}px system-ui, sans-serif`;
    d.stars.forEach((q, i) => {
      const y = R(0.54 + i * 0.055), ok = s.starOk[i];
      ctx.globalAlpha = a * (s.pt >= 18 + i * 16 ? 1 : 0.35);
      ctx.fillStyle = ok ? GREENC : '#b0a090';
      ctx.fillText(`${ok ? '○' : '×'}  ${q.label}`, cx, y);
    });
    ctx.globalAlpha = a;
    ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.fillStyle = '#9a7a5a';
    if (!s.won) ctx.fillText(`다음 섬: ${STAGES[s.stage + 1].name}`, cx, R(0.77));
    else ctx.fillText(`모은 별 ${s.stars}개`, cx, R(0.77));
    ctx.restore();
  }
  if (s.phase === 'fail') {
    const a = easeOut(s.pt / 10);
    ctx.save();
    ctx.globalAlpha = a;
    panel(ctx, w, 0.3, 0.74, '#fff0ec');
    ctx.font = `900 ${Math.max(20, R(0.065))}px system-ui, sans-serif`;
    txt(ctx, '으앙, 쓰러졌다!', cx, R(0.37), '#d83a2a', '#ffffff', 5);
    ctx.font = `800 ${Math.max(13, R(0.038))}px system-ui, sans-serif`;
    ctx.fillStyle = INK;
    ctx.fillText(s.why, cx, R(0.44));
    drawParty(ctx, cx, R(0.62), R(0.12), 'dizzy', t, s, null);
    ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    ctx.fillStyle = '#d83a2a';
    ctx.fillText(s.hearts > 0 ? '하트 -1 · 이 섬을 다시 — 길을 바꿔 봐요' : '하트를 다 썼어요', cx, R(0.7));
    ctx.restore();
  }
}

// ───────────────────────────── 모두 그리기 ─────────────────────────────
const bigText = new WeakMap<object, string>();
function drawAll(ctx: C2, s: TState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, R = (r: number) => r * w;
  ctx.save();
  fx.begin(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, R(MAP_TOP), w, R(MAP_BOT - MAP_TOP));
  ctx.clip();
  drawWorld(ctx, s, w, t);
  if (s.phase === 'event' || s.phase === 'shop') drawScene(ctx, s, w, t);
  ctx.restore();
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const big = (text: string, x: number, y: number) => {
    fx.memo.bigT = t;
    fx.memo.bigX = x;
    fx.memo.bigY = y;
    bigText.set(s, text);
  };
  const scx = R(SC.x + SC.w * 0.72), scy = R(SC.y + SC.h * 0.55), spx = R(SC.x + SC.w * 0.27);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    switch (e.kind) {
      case 'go': {
        const rc = optRect(Math.max(1, s.opts.length || 3), e.n ?? 0);
        fx.ring(R(rc.x + rc.w / 2), R(rc.y + rc.h / 2), '#ffe14a', R(0.12), 4);
        break;
      }
      case 'gold': {
        const n = e.n ?? 0, k2 = e.text ?? '';
        fx.burst(scx, scy - R(0.05), '#ffd23a', 14 + n, 4 + n * 0.15, 3);
        fx.burst(scx, scy - R(0.05), '#ffffff', 10, 3, 2);
        fx.ring(scx, scy - R(0.05), '#fff3a0', R(0.18), 5);
        fx.kick(3 + Math.min(8, n * 0.35));
        fx.blink('#fff6c0', 0.25 + Math.min(0.3, n * 0.012));
        big(k2 === 'monster' ? `무찔렀다! 금화 +${n}` : k2 === 'boss' ? `우두머리 이겼다! +${n}` : k2 === 'cave' ? `보석 더미! +${n}` : n >= 12 ? `금화 와르르! +${n}` : `딸깍! 금화 +${n}`, R(0.5), R(SC.y + 0.1));
        break;
      }
      case 'hit': {
        const n = e.n ?? 0;
        fx.kick(n > 0 ? 4 + n * 1.5 : 2);
        fx.burst((spx + scx) / 2, scy - R(0.06), '#ffffff', 10, 3, 2.4);
        if (n > 0) fx.pop(spx + R(0.17), scy - R(0.15), `체력 -${n}`, '#ff4a3a', 22), fx.blink('#ff8070', 0.12);
        else fx.pop(spx + R(0.17), scy - R(0.15), '안 아파!', '#4aa8ff', 18);
        break;
      }
      case 'shield':
        fx.ring(spx + R(0.1), scy - R(0.1), '#8ac8ff', R(0.14), 5);
        fx.pop(spx + R(0.1), scy - R(0.24), '방패 쾅!', '#2a78d8', 18);
        break;
      case 'apple':
        fx.burst(spx - R(0.05), scy - R(0.12), '#ff6a5a', 12, 3, 2.4);
        fx.pop(spx - R(0.05), scy - R(0.26), '우적! 사과', '#3cae5a', 20);
        break;
      case 'heal':
        fx.burst(spx, scy - R(0.1), '#ff8ab0', 14, 3, 2.6);
        fx.pop(spx, scy - R(0.24), `체력 +${e.n ?? 0}`, '#3cae5a', 20);
        break;
      case 'light':
        fx.blink('#ffe8a0', 0.35);
        fx.ring(scx, scy, '#ffe8a0', R(0.3), 5);
        break;
      case 'bats':
        fx.kick(8);
        fx.burst(spx, scy - R(0.1), '#2a2236', 18, 4, 3);
        fx.pop(spx, scy - R(0.26), `박쥐다! -${e.n ?? 0}`, '#ff4a3a', 20);
        break;
      case 'trap':
        fx.kick(10);
        fx.burst(spx, scy + R(0.05), '#a8804a', 22, 4, 3);
        fx.pop(spx, scy - R(0.2), `덜컥! -${e.n ?? 0}`, '#ff4a3a', 22);
        break;
      case 'win':
        fx.burst(scx, scy - R(0.05), '#ffffff', 20, 5, 3.5);
        break;
      case 'bosswin':
        fx.blink('#ffffff', 0.5);
        fx.kick(12);
        for (const c of ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff']) fx.burst(scx, scy - R(0.1), c, 12, 6, 3.4);
        break;
      case 'reveal':
        fx.ring(scx, scy - R(0.08), '#c8a8ff', R(0.2), 5);
        fx.burst(scx, scy - R(0.08), '#e0d0ff', 16, 4, 2.6);
        fx.pop(scx, scy - R(0.2), e.text === 'big' ? '큰 상자다!' : e.text === 'trap' ? '함정이다!' : e.text === 'monster' ? '괴물이다!' : '쉼터다!', e.text === 'trap' || e.text === 'monster' ? '#ff6a4a' : '#ffd23a', 20);
        break;
      case 'goal':
        fx.blink('#fff6c0', 0.6);
        fx.kick(12);
        for (const c of ['#ff5a6a', '#ffd23a', '#5ad06a', '#4aa8ff', '#ff8ad0']) fx.burst(scx, scy - R(0.12), c, 14, 7, 3.6);
        fx.ring(scx, scy - R(0.12), '#ffe14a', R(0.45), 7);
        big('보물이다!', R(0.5), R(SC.y + 0.1));
        break;
      case 'buy':
        fx.burst(scx, scy - R(0.1), '#ffd23a', 10, 3, 2.4);
        fx.pop(scx, scy - R(0.25), `금화 -${e.n ?? 0}`, '#ffd23a', 18);
        break;
      case 'crew':
        fx.ring(R(0.5), R(CARD_Y + CARD_H / 2), '#ffe14a', R(0.3), 5);
        fx.pop(R(0.5), R(0.85), `대장: ${C_NAME[e.text as Crew]}!`, '#ffd23a', 20);
        break;
      case 'poor':
        fx.pop(R(0.5), R(CARD_Y - 0.03), '금화가 모자라요', '#ff6a5a', 16);
        break;
      case 'nudge':
        fx.ring(R(e.x), R(e.y), 'rgba(255,255,255,.8)', R(0.05), 3);
        break;
      case 'fear':
        fx.pop(R(0.5), R(SC.y + 0.1), (e.n ?? 1) >= 2 ? '연속 두 번! 앞의 괴물들이 벌벌' : '앞의 괴물들이 겁먹었다!', '#7ad0ff', 17);
        if ((e.n ?? 1) >= 2) big('기세 두 배! 괴물들이 벌벌', R(0.5), R(SC.y + 0.1));
        break;
      case 'clear':
        fx.burst(R(0.3), R(0.5), '#ffe14a', 26, 6, 3);
        fx.burst(R(0.7), R(0.5), '#7fd0ff', 26, 6, 3);
        break;
      case 'fail':
        fx.kick(8);
        break;
    }
  }
  fx.memo.t = t;
  ctx.restore();
  // ── 흔들리지 않는 칸: 탁자 · HUD · 띠 · 카드 · 판 카드 ──
  drawTable(ctx, s, w, h, t);
  // 큰 순간 띠 (사건 동안 비어 있는 카드 탁자 위에 크게)
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 70 && !s.opts.length && (s.phase === 'event' || s.phase === 'shop')) {
    const age = t - fx.memo.bigT, sc2 = age < 6 ? 1.7 - 0.7 * (age / 6) : 1, a = Math.min(1, (70 - age) / 14);
    const text = bigText.get(s) ?? '';
    const size = Math.min(34, R(0.085));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, R(CARD_Y + CARD_H * 0.45) + Math.sin(age * 0.2) * 2);
    ctx.rotate(-0.05);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    burstPath(ctx, 0, 0, tw / 2 + 20, size * 0.85, 14, 0.86);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText(text, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6a0'], [0.5, '#ffd23a'], [1, '#ff8a3a']);
    ctx.fillText(text, 0, 2);
    ctx.restore();
  }
  drawPanels(ctx, s, w, t);
  drawHud(ctx, s, w);
  drawBar(ctx, s, w, t);
  drawCards(ctx, s, w, t);
  // 알림 · 첫 안내
  const guide = s.stage === 0 && s.phase === 'pick' && s.picks === 0 ? '길 카드를 톡! 탐험대가 그 길로 가요' : s.phase === 'crew' ? '지도를 보고 이 섬의 대장을 골라요' : s.phase === 'pick' && s.news && t - s.news.t < NEWS_T ? s.news.text : s.phase === 'pick' && s.stage === 0 && s.picks < 3 ? '카드에 결과가 적혀 있어요' : '';
  if (guide) {
    ctx.font = `900 ${Math.max(13, R(0.04))}px system-ui, sans-serif`;
    const tw = ctx.measureText(guide).width + R(0.06), gy = R(MAP_TOP + 0.035);
    {
      ctx.fillStyle = 'rgba(255,255,255,.94)';
      ctx.strokeStyle = '#ffb21a';
      ctx.lineWidth = 2.5;
      rr(ctx, w / 2 - tw / 2, gy - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(guide, w / 2, gy + 1);
    }
  }
  if (s.stage === 0 && s.phase === 'pick' && s.picks === 0 && s.opts.length) {
    const i = Math.max(0, s.opts.findIndex((o) => s.map[0][o.lane]?.gold === 8)), rc = optRect(s.opts.length, i);
    const cyc = (t % 70) / 70, press = cyc < 0.5 ? cyc * 2 : 1 - (cyc - 0.5) * 2;
    const hx = R(rc.x + rc.w * 0.62), hy = R(rc.y + rc.h * 0.3);
    ctx.strokeStyle = `rgba(255,178,26,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ell(ctx, hx - R(0.01), hy, R(0.03 + press * 0.03), R(0.03 + press * 0.03));
    ctx.stroke();
    drawHand(ctx, hx, hy, R(0.09), press);
  }
}
/** 카드 아래 탁자 (매 틱 다시 칠한다) */
function drawTable(ctx: C2, s: TState, w: number, h: number, t: number) {
  const R = (r: number) => r * w, y0 = R(BAR_Y + BAR_H);
  ctx.fillStyle = lin(ctx, 0, y0, 0, h, [0, '#d8a466'], [1, '#c48a4c']);
  ctx.fillRect(0, y0, w, h - y0);
  ctx.strokeStyle = 'rgba(110,60,20,.35)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    const yy = y0 + ((h - y0) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(w, yy);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,230,180,.18)';
  for (let i = 0; i < 4; i++) ctx.fillRect(0, y0 + ((h - y0) * i) / 4 + 2, w, 3);
  ctx.fillStyle = 'rgba(80,40,10,.25)';
  ctx.fillRect(0, y0, w, 4);
  if (!s.opts.length) {
    // 빈 탁자: 나침반 무늬
    const cx = w / 2, cy = R(CARD_Y + CARD_H * 0.45), r = R(0.11);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.01) * 0.1);
    ctx.strokeStyle = '#5a2e0e';
    ctx.lineWidth = 2;
    ell(ctx, 0, 0, r, r);
    ctx.stroke();
    ctx.fillStyle = '#5a2e0e';
    starPath(ctx, 0, 0, r * 0.9, 0.18);
    ctx.fill();
    ctx.restore();
    if (s.phase === 'walk') {
      ctx.font = `800 ${Math.max(13, R(0.038))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(70,35,10,.75)';
      ctx.fillText('탐험대가 걸어가요…', cx, cy + r + R(0.04));
    }
  }
}
