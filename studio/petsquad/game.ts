/**
 * 동물 군단 합체 전투 (34라운드: 완전히 다른 장르 — 톡 하나) — 자동 전투 × 합치기 × 가리키기.
 * 조작은 톡뿐: 가게 카드를 톡 하면 그 동물이 내 진영 빈칸에 '쿵', 같은 동물 셋이면 '빵!' 별 하나 더 큰 동물로 합체.
 *   내 동물을 톡 → 다른 칸을 톡 하면 자리 바꾸기(왼쪽 단추는 '팔기'로 바뀐다). '싸움!'을 톡 하면 전투는 저절로 펼쳐진다.
 *   아무것도 안 누르면 가게에서 기다릴 뿐 — 시간 압박 없음. 키보드: 화살표 커서 + 스페이스(또는 1·2·3 = 카드).
 * 별(쉬운 말, 판마다 하나씩 늘어남): 이기기 · 합체 한/두 번 · 한 마리도 안 잃고 · 쏘는 동물과 함께 · 금화 n개 남기고 · n초 안에.
 * 규칙(결정적): 앞에서 막는 동물은 상대 앞줄을 박치기, 뒤에서 쏘는 동물은 어디서든 쏘고(나는 적을 먼저), 치료사는 가장 다친 친구를 고친다.
 *   상성 물 > 불 > 풀 > 물(센 쪽이 두 배, 약한 쪽은 반). 이기면 금화, 지면 하트 -1(같은 판 다시, 군단은 그대로). 하트 셋을 다 잃으면 끝.
 * 판 7개 · 판마다 새것: 1 합체 → 2 상성 → 3 두 줄 진영·쏘는 동물 → 4 다시 뽑기(금화 1) → 5 박쥐(뒷줄을 노리고, 쏘는 동물만 맞힘) → 6 치료사(양·다람쥐) → 7 곰 우두머리(앞줄 전체 쿵).
 * 미리 보기: 상대 군단이 늘 보이고, 가운데 '힘 겨루기' 막대가 지금 싸우면 어떻게 될지(같은 시뮬레이션) 보여 준다. 카드엔 '합체!'·'세다!' 예고 딱지.
 */
import { mulberry32, type Rng } from './rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';

const A = 1.5;
// ───────────────────────────── 자리 (가로 폭 = 1) ─────────────────────────────
const COLX = [0.2, 0.5, 0.8];
/** 내 진영: 0 앞줄 · 1 뒷줄 (화면 아래쪽일수록 카메라에 가깝다) */
const MY_Y = [0.715, 0.875];
/** 상대 진영: 0 앞줄 · 1 뒷줄 */
const EN_Y = [0.455, 0.315];
const MID_Y = 0.53;
const CARD_X = [0.175, 0.5, 0.825], CARD_Y = 1.07, CARD_W = 0.3, CARD_H = 0.25;
const BTN_Y = 1.262, BTN_H = 0.1;

// ───────────────────────────── 동물 ─────────────────────────────
/** 속성: 0 물 · 1 불 · 2 풀 · 3 없음. 물 > 불 > 풀 > 물 */
type El = 0 | 1 | 2 | 3;
const ADV = 2, DIS = 0.5;
const beats = (a: number, b: number) => a < 3 && b < 3 && (a + 1) % 3 === b;
const mult = (a: number, b: number) => (beats(a, b) ? ADV : beats(b, a) ? DIS : 1);

/** 역할: 0 앞에서 막기(박치기) · 1 뒤에서 쏘기 · 2 치료 · 3 날기(뒷줄을 노림) · 4 우두머리(앞줄 전체 쿵) */
type Role = 0 | 1 | 2 | 3 | 4;
export type Kind = 'lion' | 'turtle' | 'hedge' | 'fox' | 'owl' | 'rabbit' | 'sheep' | 'bug' | 'raccoon' | 'boar' | 'sling' | 'bat' | 'squirrel' | 'bear';
interface KD { name: string; el: El; role: Role; cost: number; hp: number; atk: number; per: number; say: string }
const K: Record<Kind, KD> = {
  lion: { name: '사자', el: 1, role: 0, cost: 2, hp: 14, atk: 4, per: 54, say: '어흥!' },
  turtle: { name: '거북', el: 0, role: 0, cost: 2, hp: 24, atk: 2.5, per: 60, say: '단단!' },
  hedge: { name: '고슴도치', el: 2, role: 0, cost: 1, hp: 10, atk: 3, per: 50, say: '뾰족!' },
  fox: { name: '여우', el: 1, role: 1, cost: 1, hp: 7, atk: 2.6, per: 56, say: '캥!' },
  owl: { name: '부엉이', el: 0, role: 1, cost: 2, hp: 8, atk: 3.6, per: 58, say: '부엉!' },
  rabbit: { name: '토끼', el: 2, role: 1, cost: 1, hp: 7, atk: 2.6, per: 52, say: '깡총!' },
  sheep: { name: '양', el: 2, role: 2, cost: 3, hp: 11, atk: 4, per: 66, say: '메에~' },
  bug: { name: '무당벌레', el: 3, role: 0, cost: 0, hp: 1.5, atk: 1, per: 62, say: '' },
  raccoon: { name: '너구리', el: 3, role: 0, cost: 0, hp: 10, atk: 3, per: 56, say: '' },
  boar: { name: '멧돼지', el: 3, role: 0, cost: 0, hp: 20, atk: 3, per: 64, say: '' },
  sling: { name: '새총 너구리', el: 3, role: 1, cost: 0, hp: 7, atk: 3, per: 60, say: '' },
  bat: { name: '박쥐', el: 3, role: 3, cost: 0, hp: 7, atk: 3, per: 58, say: '' },
  squirrel: { name: '다람쥐', el: 3, role: 2, cost: 0, hp: 9, atk: 3, per: 68, say: '' },
  bear: { name: '곰 우두머리', el: 3, role: 4, cost: 0, hp: 80, atk: 5, per: 84, say: '' },
};
/** 별마다 세기 배수 — ✏️ M1 S3(📐 CONTENT §0): 2.6·6이면 합체가 머릿수보다 약해서 3.2·14로 */
const STAR_M = [1, 1, 3.2, 14];
/** 체력 배수 (싸움이 눈으로 따라갈 만큼 길게) · 치료 배수 */
const HP_X = 2.6, HEAL_X = 1.8;

// ───────────────────────────── 판 ─────────────────────────────
type StarK = 'win' | 'merge' | 'noloss' | 'save' | 'fast' | 'shooter';
interface StarDef { k: StarK; n: number; label: string }
const ST = (k: StarK, n: number, label: string): StarDef => ({ k, n, label });
/** 상대 하나: 종류 · 속성(판마다 돌리는 상대 속성 0~2, 3 없음) · 별 · 줄 · 칸 */
interface Foe { k: Kind; el: number; star: number; row: number; col: number }
const F = (k: Kind, el: number, row: number, col: number, star = 1): Foe => ({ k, el, star, row, col });
const L = (line: string) => line.split(' ') as Kind[];
interface StageDef {
  name: string; who: string; news: string; hint: string; spot: '' | 'merge' | 'element' | 'back' | 'reroll' | 'fly' | 'heal' | 'boss';
  pool: Kind[]; mult: number; win: number; foes: Foe[]; stars: StarDef[];
  /** ✏️ M1 S3 보이는 카드 줄(📐 CONTENT §2) — 없으면 그 판 동물 목록에서 고정 시드로 뽑은 임시 줄 */
  line?: Kind[];
  /** 임시 줄 시드(진짜 줄이 없을 때) — ✏️ M1 S3 봇 탐색으로 고름 */
  lineSeed?: number;
}
export const STAGES: StageDef[] = [
  {
    name: '풀밭 첫 싸움', who: '무당벌레 셋', news: '', hint: '같은 동물 셋이 모이면 빵! 합체', spot: 'merge',
    pool: ['lion', 'hedge'], mult: 1, win: 5,
    line: L('lion hedge hedge lion hedge lion hedge hedge lion hedge lion hedge'),
    foes: [F('bug', 3, 0, 0), F('bug', 3, 0, 1), F('bug', 3, 0, 2)],
    stars: [ST('win', 0, '상대 군단 이기기')],
  },
  {
    name: '너구리 패거리', who: '너구리 패거리', news: '상성 — 물은 불에, 불은 풀에, 풀은 물에 세요', hint: '상대 망토 색을 보고 센 색을 사요', spot: 'element',
    pool: ['lion', 'hedge', 'turtle'], mult: 1.1, win: 6,
    line: L('turtle lion lion hedge lion turtle hedge lion turtle hedge lion turtle'),
    foes: [F('raccoon', 2, 0, 0), F('raccoon', 2, 0, 1), F('raccoon', 2, 0, 2)], // 📐 CONTENT 1-2: 풀 두건 — 불 사자가 세다
    stars: [ST('win', 0, '이기기'), ST('merge', 1, '합체 한 번 하기')],
  },
  {
    name: '두 줄 진영', who: '멧돼지 군단', news: '두 줄 진영 — 쏘는 동물은 뒷줄에서 쏴요', hint: '앞줄이 막고 뒷줄이 쏴요', spot: 'back',
    pool: ['lion', 'hedge', 'turtle', 'fox', 'owl', 'rabbit'], mult: 1.7, win: 6, lineSeed: 103, // ✏️ M1 S3 임시 줄: 잘하는 봇 ★3 가능 · 버릇 봇 6종 ★3 불가인 시드(봇 탐색)
    foes: [F('boar', 0, 0, 1), F('raccoon', 0, 0, 0), F('raccoon', 1, 0, 2), F('sling', 0, 1, 0), F('sling', 1, 1, 2)],
    stars: [ST('win', 0, '이기기'), ST('noloss', 0, '한 마리도 안 잃고 이기기'), ST('shooter', 0, '쏘는 동물과 함께 이기기')],
  },
  {
    name: '카드 넘기기', who: '물방울 산적', news: '넘기기 — 금화 1개로 앞 카드 셋을 줄 끝으로', hint: '원하는 카드가 뒤에 있으면 넘기기', spot: 'reroll',
    pool: ['lion', 'hedge', 'turtle', 'fox', 'owl', 'rabbit'], mult: 2.0, win: 7, lineSeed: 306, // ✏️ M1 S3 임시 줄: 잘하는 봇 ★3 가능 · 버릇 봇 6종 ★3 불가인 시드(봇 탐색)
    foes: [F('boar', 0, 0, 1), F('raccoon', 0, 0, 0), F('raccoon', 0, 0, 2), F('sling', 2, 1, 0), F('sling', 0, 1, 1), F('sling', 2, 1, 2)],
    stars: [ST('win', 0, '이기기'), ST('merge', 2, '합체 두 번 하기'), ST('save', 3, '금화 3개 남기고 이기기')],
  },
  {
    name: '박쥐 떼', who: '박쥐 떼', news: '박쥐 — 뒷줄을 노려요. 쏘는 동물만 맞혀요', hint: '박쥐는 쏘는 동물만 맞혀요', spot: 'fly',
    pool: ['lion', 'hedge', 'turtle', 'fox', 'owl', 'rabbit'], mult: 2.0, win: 7, lineSeed: 105, // ✏️ M1 S3 임시 줄: 잘하는 봇 ★3 가능 · 버릇 봇 6종 ★3 불가인 시드(봇 탐색)
    foes: [F('raccoon', 1, 0, 0), F('boar', 1, 0, 1), F('raccoon', 1, 0, 2), F('bat', 0, 2, 0), F('bat', 0, 2, 1), F('bat', 0, 2, 2)],
    stars: [ST('win', 0, '이기기'), ST('noloss', 0, '한 마리도 안 잃고 이기기'), ST('fast', 15, '15초 안에 이기기')],
  },
  {
    name: '치료사', who: '다람쥐 치료단', news: '치료사 — 양이 가게에! 상대 다람쥐도 고쳐요', hint: '양은 가장 다친 친구를 고쳐요', spot: 'heal',
    pool: ['lion', 'hedge', 'turtle', 'fox', 'owl', 'rabbit', 'sheep'], mult: 2.3, win: 8, lineSeed: 106, // ✏️ M1 S3 임시 줄: 잘하는 봇 ★3 가능 · 버릇 봇 6종 ★3 불가인 시드(봇 탐색)
    foes: [F('boar', 2, 0, 1), F('raccoon', 2, 0, 0), F('raccoon', 2, 0, 2), F('squirrel', 2, 1, 1), F('sling', 1, 1, 0), F('sling', 1, 1, 2)],
    stars: [ST('win', 0, '이기기'), ST('merge', 1, '합체 한 번 하기'), ST('fast', 12, '12초 안에 이기기')],
  },
  {
    name: '곰 우두머리', who: '곰 우두머리', news: '우두머리 — 쿵! 앞줄 모두를 한꺼번에 쳐요', hint: '앞줄은 단단하게, 뒷줄은 세게', spot: 'boss',
    pool: ['lion', 'hedge', 'turtle', 'fox', 'owl', 'rabbit', 'sheep'], mult: 2.6, win: 0, lineSeed: 3541, // ✏️ M1 S3 임시 줄: 잘하는 봇 ★3 가능 · 버릇 봇 6종 ★3 불가인 시드(봇 탐색)
    foes: [F('bear', 0, 0, 1), F('raccoon', 1, 0, 0), F('raccoon', 2, 0, 2), F('bat', 1, 2, 0), F('bat', 2, 2, 2)],
    stars: [ST('win', 0, '우두머리 이기기'), ST('noloss', 0, '한 마리도 안 잃고 이기기'), ST('save', 3, '금화 3개 남기고 이기기')],
  },
];
export const STAGE_COUNT = STAGES.length;
const START_COINS = 5, LOSS_COINS = 3, REROLL = 1;
const CLEAR_PTS = 100, STAR_PTS = 100, WIN_PTS = 200, HEART_PTS = 100, KO_PTS = 4;
/** 1-1 저절로 싸움까지 톡 없는 틱 */
const AUTO_FIGHT = 240;
const FIGHT_MAX = 60 * 30, END_WAIT = 70, RESULT_OK = 110, RESULT_FAIL = 150, BANNER_T = 160;

// ───────────────────────────── 상태 ─────────────────────────────
interface Pet { id: number; k: Kind; star: number; born: number; land: number; mergeT: number; from: number }
interface Card { k: Kind; sold: boolean; born: number; shake: number }
/** 전투 중인 동물 하나 */
interface FU {
  side: number; k: Kind; star: number; el: number; role: Role; row: number; col: number; slot: number; pid: number;
  hp: number; max: number; atk: number; per: number; cd: number; act: number; at: number; tgt: number; dead: boolean; deadT: number;
  hitT: number; hitBy: number; healT: number;
}
/** 날아가는 것: 화살·치료 */
interface Shot { a: number; b: number; t0: number; T: number; heal: boolean }
interface FEv { t: number; k: string; a: number; b: number; v: number; m: number }
interface Fight { t: number; u: FU[]; shots: Shot[]; done: number; lost: number; kills: number; log: FEv[] | null; lastKO: number; koRun: number; bestRun: number }
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
interface Pred { win: boolean; p: number; lost: number; sec: number; label: string }

export interface PetState {
  rng: Rng; seed: number; t: number; stage: number; rots: number[]; phase: 'shop' | 'fight' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; coins: number; board: (Pet | null)[]; shop: Card[]; queue: Kind[]; sel: number; nid: number; rerolls: number; buys: number;
  fight: Fight | null; fightCoins: number; merges: number; mergeAll: number; swaps: number; sells: number;
  stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  down: boolean; firstTap: number; firstBig: number; wowN: number; slow: number; idle: number;
  seen: Set<string>; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; rx: number; ry: number } | null;
  events: Ev[]; pred: Pred | null; predKey: string; say: { slot: number; text: string; t: number } | null; bigText: string; bigT: number; bigY: number;
}

const ev = (s: PetState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: PetState, key: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function wow(s: PetState, text: string, x = 0.5, y = MID_Y) {
  s.wowN++;
  if (s.firstBig < 0 && s.firstTap >= 0) s.firstBig = s.t;
  s.bigText = text;
  s.bigT = s.t;
  s.bigY = y;
  ev(s, 'big', x, y, 0, text);
}
const slotsOf = (stage: number) => (stage >= 2 ? 6 : 3);
const slotXY = (i: number): [number, number] => [COLX[i % 3], MY_Y[i < 3 ? 0 : 1]];

// ───────────────────────────── 가게 ─────────────────────────────
interface Shopper { coins: number; board: (Pet | null)[]; shop: Card[]; queue: Kind[]; merges: number; stage: number; nid: number; t: number }
type BuyRes = { ok: false; why: 'sold' | 'coins' | 'full' } | { ok: true; slot: number; merged: number; from: number[] };

/** 그 카드를 사면 어디로 가나 (합체면 합쳐질 칸) — 미리 보기·봇·실제가 같은 것을 쓴다 */
function landing(sh: Shopper, k: Kind): { slot: number; merge: boolean } {
  const same: number[] = [];
  sh.board.forEach((p, i) => p && p.k === k && p.star === 1 && same.push(i));
  if (same.length >= 2) return { slot: same[0], merge: true };
  const n = slotsOf(sh.stage), front = K[k].role === 0;
  const order = n === 3 ? [1, 0, 2] : front ? [1, 0, 2, 4, 3, 5] : [4, 3, 5, 1, 0, 2];
  for (const i of order) if (!sh.board[i]) return { slot: i, merge: false };
  return { slot: -1, merge: false };
}
function buyCard(sh: Shopper, i: number): BuyRes {
  const c = sh.shop[i];
  if (!c || c.sold) return { ok: false, why: 'sold' };
  const kd = K[c.k];
  if (sh.coins < kd.cost) return { ok: false, why: 'coins' };
  const L = landing(sh, c.k);
  if (L.slot < 0) return { ok: false, why: 'full' };
  sh.coins -= kd.cost;
  c.sold = true;
  if (!L.merge) {
    sh.board[L.slot] = { id: ++sh.nid, k: c.k, star: 1, born: sh.t, land: sh.t, mergeT: -999, from: i };
    return { ok: true, slot: L.slot, merged: 0, from: [] };
  }
  // 합체: 같은 별 셋 → 별 하나 위. 별 둘이 셋이면 이어서 한 번 더
  let star = 1, at = L.slot, merged = 0;
  const from: number[] = [];
  for (;;) {
    const same: number[] = [];
    sh.board.forEach((p, j) => p && p.k === c.k && p.star === star && j !== at && same.push(j));
    const need = star === 1 && merged === 0 ? 1 : 2;
    if (same.length < need) break;
    for (const j of same.slice(0, need)) (sh.board[j] = null), from.push(j);
    star++;
    merged++;
    const keep = Math.min(at, ...from.filter((j) => !sh.board[j] && j < at));
    void keep;
    sh.board[at] = { id: ++sh.nid, k: c.k, star, born: sh.t, land: sh.t, mergeT: sh.t, from: i };
    if (star >= 3) break;
  }
  sh.merges += merged;
  return { ok: true, slot: at, merged, from };
}

// ───────────────────────────── 보이는 카드 줄 (✏️ M1 S3 · 📐 GDD §1 비틀기 ① · CONTENT §3) ─────────────────────────────
// 판마다 정해진 카드 줄. 앞 3장은 살 수 있고(가게), 그 뒤는 '다음'으로 흐리게 보인다. 산 자리엔 줄의 다음 카드가 들어온다.
// 넘기기(금화 1) = 안 산 앞 카드를 순서대로 줄 끝으로 보내고 줄 앞에서 셋. 남은 카드가 3장 이하면 막힌다. ?shop=random이면 예전 무작위 가게.
let RANDOM_SHOP = false;
export function setRandomShop(on: boolean) {
  RANDOM_SHOP = on;
}
export const lineMode = () => !RANDOM_SHOP;
export function lineOf(stage: number): Kind[] {
  const d = STAGES[stage];
  if (d.line) return d.line.slice();
  // 임시 줄(진짜 줄은 S5): 동물 셋을 골라 한 마리씩 셋 모이게 엇갈려 깐다(a b a c b a c b c) — 합체할 길이 늘 있다
  const r = mulberry32(d.lineSeed ?? 9173 + stage * 7919), out: Kind[] = [], pick = () => d.pool[Math.floor(r() * d.pool.length)];
  for (let g = 0; g < 2; g++) {
    const [a, b, c] = [pick(), pick(), pick()];
    out.push(a, b, a, c, b, a, c, b, c);
  }
  return out.slice(0, 15);
}
const card = (sh: Shopper): Card => (sh.queue.length ? { k: sh.queue.shift()!, sold: false, born: sh.t, shake: -999 } : { k: 'lion', sold: true, born: sh.t, shake: -999 });
function lineShop(s: PetState) {
  s.queue = lineOf(s.stage);
  s.shop = [card(s), card(s), card(s)];
}
/** 산 자리에 줄의 다음 카드 */
function refill(sh: Shopper, i: number) {
  if (sh.queue.length) sh.shop[i] = card(sh);
}
const leftCards = (sh: Shopper) => sh.queue.length + sh.shop.filter((c) => !c.sold).length;
export const canSkip = (sh: Shopper) => leftCards(sh) > 3;
function skipLine(sh: Shopper) {
  for (const c of sh.shop) if (!c.sold) sh.queue.push(c.k);
  sh.shop = [card(sh), card(sh), card(sh)];
}

function rollShop(s: PetState, first: boolean) {
  const d = STAGES[s.stage], r = s.rng;
  if (s.stage === 0 && first && s.tries === 0) {
    s.shop = (['lion', 'lion', 'hedge'] as Kind[]).map((k) => ({ k, sold: false, born: s.t, shake: -999 }));
    return;
  }
  const owned = new Map<Kind, number>();
  for (const p of s.board) if (p && p.star < 3) owned.set(p.k, (owned.get(p.k) ?? 0) + (p.star === 1 ? 1 : 0.4));
  const pick = (): Kind => d.pool[Math.floor(r() * d.pool.length)];
  const fav = (): Kind | null => {
    const arr = [...owned.entries()].filter(([k]) => d.pool.includes(k));
    if (!arr.length) return null;
    let tot = 0;
    for (const [, v] of arr) tot += v;
    let x = r() * tot;
    for (const [k, v] of arr) if ((x -= v) <= 0) return k;
    return arr[arr.length - 1][0];
  };
  const out: Kind[] = [];
  // 첫 가게: 하나는 상대 주 속성에 센 동물, 하나는 지금 모으는 동물
  const mainEl = foeEl(s.rots[s.stage], d.foes[0]);
  for (let j = 0; j < 3; j++) {
    let k: Kind;
    if (j === 0 && first && mainEl < 3) {
      const ctr = d.pool.filter((q) => beats(K[q].el, mainEl));
      k = ctr[Math.floor(r() * ctr.length)] ?? pick();
    } else if (r() < 0.45) k = fav() ?? pick();
    else k = pick();
    out.push(k);
  }
  // 새것을 소개하는 판의 첫 가게엔 그 새것이 꼭 있다 (3판 쏘는 동물 · 6판 양)
  if (first && !s.again) {
    const want = d.spot === 'back' ? (k: Kind) => K[k].role === 1 : d.spot === 'heal' ? (k: Kind) => k === 'sheep' : null;
    if (want && !out.some(want)) {
      const c = d.pool.filter(want);
      out[2] = c[Math.floor(r() * c.length)];
    }
  }
  // 섞기 (첫 칸이 늘 정답이면 버릇이 된다)
  for (let j = 2; j > 0; j--) {
    const q = Math.floor(r() * (j + 1));
    [out[j], out[q]] = [out[q], out[j]];
  }
  s.shop = out.map((k) => ({ k, sold: false, born: s.t, shake: -999 }));
}
const foeEl = (rot: number, f: Foe) => (f.el >= 3 ? 3 : (f.el + rot) % 3);

// ───────────────────────────── 전투 시뮬레이션 (실제·미리 보기·봇이 같은 것을 쓴다) ─────────────────────────────
const MELEE_HIT = 9, MELEE_T = 22, SHOT_WIND = 6, SHOT_T = 15, HEAL_T = 12, STOMP_HIT = 26, STOMP_T = 44, SWOOP_HIT = 12, SWOOP_T = 26;

function unit(side: number, k: Kind, star: number, el: number, row: number, col: number, slot: number, pid: number, m: number, i: number): FU {
  const kd = K[k], sm = STAR_M[star];
  const hp = kd.hp * HP_X * sm * m;
  return {
    side, k, star, el, role: kd.role, row, col, slot, pid, hp, max: hp, atk: kd.atk * sm * (side ? Math.pow(m, 0.6) : 1), per: kd.per,
    cd: 8 + col * 5 + row * 9 + side * 4 + (i % 2), act: 0, at: 0, tgt: -1, dead: false, deadT: 0, hitT: -999, hitBy: -1, healT: -999,
  };
}
function makeFight(board: (Pet | null)[], st: number, rot: number, log: boolean): Fight {
  const u: FU[] = [];
  board.forEach((p, i) => p && u.push(unit(0, p.k, p.star, K[p.k].el, i < 3 ? 0 : 1, i % 3, i, p.id, 1, u.length)));
  const d = STAGES[st];
  for (const f of d.foes) u.push(unit(1, f.k, f.star, foeEl(rot, f), f.row, f.col, -1, -1, d.mult, u.length));
  return { t: 0, u, shots: [], done: 0, lost: 0, kills: 0, log: log ? [] : null, lastKO: -999, koRun: 0, bestRun: 0 };
}
/** 그 편에서 살아 있는 땅 위 동물의 가장 앞줄 (없으면 -1) */
function frontRow(f: Fight, side: number) {
  let r = 9;
  for (const u of f.u) if (!u.dead && u.side === side && u.role !== 3 && u.row < r) r = u.row;
  return r === 9 ? -1 : r;
}
function backRow(f: Fight, side: number) {
  let r = -1;
  for (const u of f.u) if (!u.dead && u.side === side && u.role !== 3 && u.row > r) r = u.row;
  return r;
}
function nearest(f: Fight, side: number, col: number, ok: (u: FU) => boolean) {
  let best = -1, bd = 99;
  for (let i = 0; i < f.u.length; i++) {
    const u = f.u[i];
    if (u.dead || u.side !== side || !ok(u)) continue;
    const d = Math.abs(u.col - col) * 2 + (u.col > col ? 1 : 0);
    if (d < bd) (bd = d), (best = i);
  }
  return best;
}
function pickTarget(f: Fight, me: FU): number {
  const foe = 1 - me.side;
  switch (me.role) {
    case 0: {
      if (me.row !== frontRow(f, me.side)) return -1;
      const fr = frontRow(f, foe);
      return fr < 0 ? -1 : nearest(f, foe, me.col, (u) => u.role !== 3 && u.row === fr);
    }
    case 1: {
      const fl = nearest(f, foe, me.col, (u) => u.role === 3);
      if (fl >= 0) return fl;
      const fr = frontRow(f, foe);
      return fr < 0 ? -1 : nearest(f, foe, me.col, (u) => u.role !== 3 && u.row === fr);
    }
    case 2: {
      let best = -1, bv = 0.999;
      for (let i = 0; i < f.u.length; i++) {
        const u = f.u[i];
        if (u.dead || u.side !== me.side) continue;
        const v = u.hp / u.max;
        if (v < bv) (bv = v), (best = i);
      }
      return best;
    }
    case 3: {
      const br = backRow(f, foe);
      return br < 0 ? -1 : nearest(f, foe, me.col, (u) => u.role !== 3 && u.row === br);
    }
    case 4:
      return frontRow(f, foe) < 0 ? -1 : 0;
  }
  return -1;
}
function hurt(f: Fight, a: FU, ai: number, b: FU, bi: number, amt: number) {
  if (b.dead) return;
  const m = mult(a.el, b.el), d = amt * m;
  b.hp -= d;
  b.hitT = f.t;
  b.hitBy = ai;
  f.log?.push({ t: f.t, k: 'hit', a: ai, b: bi, v: d, m });
  if (b.hp <= 0.001) {
    b.hp = 0;
    b.dead = true;
    b.deadT = f.t;
    if (b.side === 0) f.lost++;
    else {
      f.kills++;
      f.koRun = f.t - f.lastKO <= 75 ? f.koRun + 1 : 1;
      f.lastKO = f.t;
      f.bestRun = Math.max(f.bestRun, f.koRun);
    }
    f.log?.push({ t: f.t, k: 'ko', a: ai, b: bi, v: 0, m: 0 });
  }
}
function fstep(f: Fight) {
  if (f.done) return;
  f.t++;
  // 날아가는 것
  for (let j = f.shots.length - 1; j >= 0; j--) {
    const sh = f.shots[j];
    if (f.t < sh.t0 + sh.T) continue;
    f.shots.splice(j, 1);
    const a = f.u[sh.a], b = f.u[sh.b];
    if (b.dead) {
      f.log?.push({ t: f.t, k: 'miss', a: sh.a, b: sh.b, v: 0, m: 0 });
      continue;
    }
    if (sh.heal) {
      const v = Math.min(a.atk * HEAL_X, b.max - b.hp);
      b.hp += v;
      b.healT = f.t;
      f.log?.push({ t: f.t, k: 'heal', a: sh.a, b: sh.b, v, m: 1 });
    } else hurt(f, a, sh.a, b, sh.b, a.atk);
  }
  for (let i = 0; i < f.u.length; i++) {
    const u = f.u[i];
    if (u.dead) continue;
    if (u.cd > 0) u.cd--;
    if (u.act) {
      u.at++;
      if (u.role === 0 && u.at === MELEE_HIT) {
        let b = f.u[u.tgt];
        if (b.dead) {
          const nt = pickTarget(f, u);
          if (nt >= 0) (u.tgt = nt), (b = f.u[nt]);
        }
        if (!b.dead) hurt(f, u, i, b, u.tgt, u.atk);
      } else if (u.role === 3 && u.at === SWOOP_HIT) {
        let b = f.u[u.tgt];
        if (b.dead) {
          const nt = pickTarget(f, u);
          if (nt >= 0) (u.tgt = nt), (b = f.u[nt]);
        }
        if (!b.dead) hurt(f, u, i, b, u.tgt, u.atk);
      } else if ((u.role === 1 || u.role === 2) && u.at === SHOT_WIND) {
        f.shots.push({ a: i, b: u.tgt, t0: f.t, T: u.role === 2 ? HEAL_T : SHOT_T, heal: u.role === 2 });
        f.log?.push({ t: f.t, k: u.role === 2 ? 'cast' : 'shoot', a: i, b: u.tgt, v: 0, m: 0 });
      } else if (u.role === 4 && u.at === STOMP_HIT) {
        const fr = frontRow(f, 1 - u.side);
        f.log?.push({ t: f.t, k: 'stomp', a: i, b: -1, v: fr, m: 0 });
        if (fr >= 0) for (let j = 0; j < f.u.length; j++) {
          const b = f.u[j];
          if (!b.dead && b.side !== u.side && b.role !== 3 && b.row === fr) hurt(f, u, i, b, j, u.atk);
        }
      }
      const T = u.role === 0 ? MELEE_T : u.role === 3 ? SWOOP_T : u.role === 4 ? STOMP_T : SHOT_WIND + 4;
      if (u.at >= T) u.act = 0;
      continue;
    }
    if (u.cd > 0) continue;
    const tg = pickTarget(f, u);
    if (tg < 0) {
      u.cd = 6;
      continue;
    }
    u.tgt = tg;
    u.act = 1;
    u.at = 0;
    u.cd = u.per;
    f.log?.push({ t: f.t, k: 'start', a: i, b: tg, v: 0, m: 0 });
  }
  let mine = 0, theirs = 0;
  for (const u of f.u) if (!u.dead) u.side ? theirs++ : mine++;
  if (!theirs) f.done = 1;
  else if (!mine || f.t >= FIGHT_MAX) f.done = 2;
}
function runFight(f: Fight) {
  while (!f.done) fstep(f);
  return f;
}
/** 지금 싸우면 (미리 보기) */
function predict(board: (Pet | null)[], st: number, rot: number): Pred {
  const f = runFight(makeFight(board, st, rot, false));
  let mh = 0, mm = 0, eh = 0, em = 0;
  for (const u of f.u) u.side ? ((eh += u.hp), (em += u.max)) : ((mh += u.hp), (mm += u.max));
  const win = f.done === 1;
  const p = win ? 0.5 + 0.5 * (mm ? mh / mm : 0) : 0.5 - 0.5 * (em ? eh / em : 1);
  const label = !board.some(Boolean) ? '동물을 사요' : win ? (p > 0.72 ? '지금 싸우면 이겨요!' : '지금 싸우면 아슬아슬 이겨요') : p > 0.36 ? '지금 싸우면 아슬아슬 져요' : '지금 싸우면 질 것 같아요';
  return { win, p, lost: f.lost, sec: f.t / 60, label };
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function newStage(s: PetState) {
  const d = STAGES[s.stage];
  s.phase = 'shop';
  s.pt = 0;
  s.sel = -1;
  s.fight = null;
  s.rerolls = 0;
  s.idle = 0;
  if (!s.again) s.merges = 0;
  if (lineMode()) lineShop(s);
  else rollShop(s, true);
  s.starOk = d.stars.map(() => false);
  s.got = 0;
  s.predKey = '';
  if (!s.again) {
    s.banner = { head: `${s.stage + 1}판 · ${d.name}`, sub: d.news ? `NEW  ${d.news}` : d.hint, t: s.t };
    if (s.stage > 0) see(s, d.spot);
    const sp = d.spot;
    if (sp === 'back') s.spot = { x: 0.5, y: MY_Y[1] - 0.04, t: s.t, label: '뒷줄', rx: 0.47, ry: 0.07 };
    else if (sp === 'reroll') s.spot = { x: REROLL_BTN[0], y: BTN_Y, t: s.t, label: lineMode() ? '넘기기' : '다시 뽑기', rx: 0.16, ry: 0.065 };
    else if (sp === 'fly') s.spot = { x: 0.5, y: EN_Y[1] - 0.05, t: s.t, label: '박쥐', rx: 0.46, ry: 0.08 };
    else if (sp === 'heal') s.spot = { x: 0.5, y: EN_Y[1] - 0.05, t: s.t, label: '다람쥐 치료사', rx: 0.12, ry: 0.09 };
    else if (sp === 'boss') s.spot = { x: 0.5, y: EN_Y[0] - 0.1, t: s.t, label: '우두머리', rx: 0.17, ry: 0.15 };
    else if (sp === 'element') s.spot = { x: 0.5, y: EN_Y[0] - 0.06, t: s.t, label: '상대 망토 색', rx: 0.46, ry: 0.09 };
    else s.spot = null;
    if (sp === 'back') see(s, 'shooter');
  } else s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: '군단은 그대로 — 금화로 보태요', t: s.t };
}
function starMet(s: PetState, q: StarDef, f: Fight) {
  switch (q.k) {
    case 'win': return f.done === 1;
    case 'merge': return s.merges >= q.n;
    case 'noloss': return f.lost === 0;
    case 'save': return s.fightCoins >= q.n;
    case 'fast': return f.t <= q.n * 60;
    case 'shooter': return f.u.some((u) => u.side === 0 && u.role === 1);
  }
}
/** 별 칸 옆 진행 */
function starNow(s: PetState, q: StarDef): string {
  if (q.k === 'merge') return `${Math.min(s.merges, q.n)}/${q.n}`;
  if (q.k === 'save') return `${Math.min(s.coins, q.n)}/${q.n}`;
  return '';
}
function endFight(s: PetState) {
  const f = s.fight!, d = STAGES[s.stage];
  s.phase = 'result';
  s.pt = 0;
  s.ok = f.done === 1;
  if (s.ok) {
    s.starOk = d.stars.map((q) => starMet(s, q, f));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += (CLEAR_PTS + s.got * STAR_PTS) * (1 + s.stage * 0.5);
    s.coins += d.win;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * HEART_PTS);
    ev(s, 'clear', 0.5, MID_Y, d.win);
    if (f.lost === 0 && s.stage > 0) wow(s, '하나도 안 잃었다!', 0.5, 0.62);
  } else {
    s.hearts--;
    s.tries++;
    s.why = f.t >= FIGHT_MAX ? '시간이 다 됐어요' : '군단이 다 쓰러졌어요';
    ev(s, 'fail', 0.5, MY_Y[0]);
  }
}
function startFight(s: PetState) {
  if (!s.board.some(Boolean)) {
    ev(s, 'empty', 0.5, BTN_Y);
    return;
  }
  s.phase = 'fight';
  s.pt = 0;
  s.sel = -1;
  s.fightCoins = s.coins;
  s.fight = makeFight(s.board, s.stage, s.rots[s.stage], true);
  s.banner = null;
  ev(s, 'charge', 0.5, MID_Y);
}

// ───────────────────────────── 톡 ─────────────────────────────
type Hit = { t: 'card'; i: number } | { t: 'slot'; i: number } | { t: 'fight' } | { t: 'reroll' } | { t: 'sell' } | null;
const rerollOn = (s: { stage: number }) => s.stage >= 3;
const FIGHT_BTN: [number, number, number, number] = [0.645, BTN_Y, 0.6, BTN_H];
const fightBtn = (_s: { stage: number }) => FIGHT_BTN;
const REROLL_BTN: [number, number, number, number] = [0.17, BTN_Y, 0.28, BTN_H];
/** 팔면 받는 금화: 합친 마리 수만큼 */
const sellValue = (p: Pet) => (p.star === 1 ? 1 : p.star === 2 ? 3 : 9);
const inBox = (x: number, y: number, b: [number, number, number, number]) => Math.abs(x - b[0]) <= b[2] / 2 && Math.abs(y - b[1]) <= b[3] / 2;
/** x: 0~1(가로), y: 가로 폭 단위 */
function hitTest(s: PetState, x: number, y: number): Hit {
  for (let i = 0; i < 3; i++) if (Math.abs(x - CARD_X[i]) <= CARD_W / 2 + 0.01 && Math.abs(y - CARD_Y) <= CARD_H / 2 + 0.01) return { t: 'card', i };
  if (inBox(x, y, fightBtn(s))) return { t: 'fight' };
  if (inBox(x, y, REROLL_BTN)) {
    if (s.sel >= 0 && s.board[s.sel]) return { t: 'sell' };
    if (rerollOn(s)) return { t: 'reroll' };
  }
  const n = slotsOf(s.stage);
  for (let i = 0; i < n; i++) {
    const [sx, sy] = slotXY(i);
    if (Math.abs(x - sx) <= 0.15 && Math.abs(y - sy) <= 0.085) return { t: 'slot', i };
  }
  return null;
}
function tap(s: PetState, h: Hit) {
  if (!h) {
    s.sel = -1;
    return;
  }
  if (h.t === 'card') {
    s.sel = -1;
    const r = buyCard(s, h.i);
    if (!r.ok) {
      s.shop[h.i].shake = s.t;
      ev(s, 'nobuy', CARD_X[h.i], CARD_Y, 0, r.why === 'coins' ? '금화가 모자라요' : r.why === 'full' ? '빈칸이 없어요' : '');
      return;
    }
    s.buys++;
    if (lineMode()) refill(s, h.i);
    const p = s.board[r.slot]!;
    const [x, y] = slotXY(r.slot);
    if (r.merged) {
      ev(s, 'merge', x, y, p.star, K[p.k].name);
      for (const j of r.from) ev(s, 'mergeFrom', ...slotXY(j), r.slot);
      see(s, 'merge');
      wow(s, p.star >= 3 ? '별 셋 합체!!' : '빵! 합체!', x, y);
    } else ev(s, 'land', x, y, h.i, K[p.k].say);
    s.say = { slot: r.slot, text: r.merged ? (p.star >= 3 ? '으랏차차!!' : '더 커졌다!') : K[p.k].say, t: s.t };
    return;
  }
  if (h.t === 'reroll') {
    s.sel = -1;
    if (s.coins < REROLL) {
      ev(s, 'nobuy', REROLL_BTN[0], REROLL_BTN[1], 0, '금화가 모자라요');
      return;
    }
    if (lineMode() && !canSkip(s)) {
      ev(s, 'nobuy', REROLL_BTN[0], REROLL_BTN[1], 0, '줄 끝이에요');
      return;
    }
    s.coins -= REROLL;
    s.rerolls++;
    if (lineMode()) skipLine(s);
    else rollShop(s, false);
    ev(s, 'reroll', 0.5, CARD_Y);
    return;
  }
  if (h.t === 'fight') return startFight(s);
  if (h.t === 'sell') {
    const p = s.board[s.sel]!, v = sellValue(p), [x, y] = slotXY(s.sel);
    s.board[s.sel] = null;
    s.coins += v;
    s.sells++;
    see(s, 'sell');
    ev(s, 'sell', x, y, v, p.k);
    s.sel = -1;
    return;
  }
  // 칸: 고르기 → 옮기기
  const i = h.i;
  if (s.sel < 0) {
    if (s.board[i]) (s.sel = i), ev(s, 'pick', ...slotXY(i));
    return;
  }
  if (s.sel === i) {
    s.sel = -1;
    return;
  }
  const a = s.sel;
  [s.board[a], s.board[i]] = [s.board[i], s.board[a]];
  for (const j of [a, i]) if (s.board[j]) s.board[j]!.land = s.t;
  s.sel = -1;
  s.swaps++;
  see(s, 'swap');
  ev(s, 'swap', ...slotXY(i), a);
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function fightTick(s: PetState) {
  const f = s.fight!;
  if (!f.done) {
    if (s.slow > 0 && s.t % 2) s.slow--;
    else {
      const n0 = f.log!.length;
      fstep(f);
      for (let j = n0; j < f.log!.length; j++) onFightEv(s, f, f.log![j]);
    }
  } else if (++s.pt >= END_WAIT) endFight(s);
}
function onFightEv(s: PetState, f: Fight, e: FEv) {
  if (e.k === 'ko') {
    const b = f.u[e.b];
    if (b.side === 1) {
      s.pts += KO_PTS;
      if (b.role === 4) (s.slow = 30), wow(s, '우두머리 쿵!', 0.5, EN_Y[0]);
      else if (f.koRun >= 2 && f.koRun <= 4) wow(s, f.koRun === 2 ? '두 마리 쿵!' : f.koRun === 3 ? '와르르!' : '싹쓸이!', 0.5, EN_Y[0]);
    }
    let alive = 0;
    for (const u of f.u) if (!u.dead && u.side === b.side) alive++;
    if (!alive) s.slow = Math.max(s.slow, 24);
  }
}

const game: GameDef<PetState> & { wows(s: PetState): number } = {
  id: 'petsquad',
  name: '동물 군단 합체 전투',
  genes: ['autobattle', 'merge', 'pointer'],
  twist: '싸움은 저절로 — 내가 하는 일은 가게 카드 톡뿐인데, 같은 동물 셋을 사면 빵! 별 하나 더 큰 동물로 합체해 자리가 비고, 가운데 힘 겨루기 막대가 톡마다 우리 쪽으로 쭉 밀린다',
  rules: [
    '가게 카드를 톡 하면 그 동물이 진영에 쿵! 같은 동물 셋이면 빵! 더 큰 동물로 합체해요.',
    "'싸움!'을 톡 하면 저절로 싸워요. 물 > 불 > 풀 > 물 — 센 색은 두 배로 때려요.",
    '이기면 금화, 지면 하트 -1(그 판 다시). 내 동물을 톡 → 칸을 톡 하면 자리 바꾸기.',
  ],
  controls: 'touch',
  hint: '카드 톡 = 사기 · 싸움! 톡 / 화살표로 고르고 스페이스(1·2·3 = 카드)',
  aspect: A,
  art: {
    concept: '햇살 비치는 풀밭 아레나의 통통한 동물 군단 — 나무 울타리·깃발·구경하는 새들, 손그림 동화책 같은 오토배틀',
    mood: '연둣빛 잔디에 줄무늬가 지고 나무 울타리 위 참새들이 응원한다. 속성 망토를 두른 통통한 사자·거북·고슴도치·여우·부엉이·토끼·양이 쿵 내려앉고, 셋이 모이면 빛기둥 속에서 빵! 더 크게 합체한다. 싸움! 하면 박치기·당근 화살·치료 반짝이가 저절로 펼쳐지고, 맞은 너구리는 데굴데굴 굴러간다.',
    palette: { bg: '#9fdc6a', ink: '#3a2a14', muted: '#7a6a4a', accent: '#ffcf3a', hot: '#ff5f3a', soft: '#fff6dc' },
  },
  guard: (s) => (s.fight ? s.fight.u.filter((u) => u.side === 0 && !u.dead).length : s.board.filter(Boolean).length),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, rots: [], phase: 'shop', pt: 0, ok: false, why: '',
      hearts: 3, coins: START_COINS, board: [null, null, null, null, null, null], shop: [], queue: [], sel: -1, nid: 0, rerolls: 0, buys: 0,
      fight: null, fightCoins: 0, merges: 0, mergeAll: 0, swaps: 0, sells: 0,
      stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      down: false, firstTap: -1, firstBig: -1, wowN: 0, slow: 0, idle: 0,
      seen: new Set<string>(), banner: null, spot: null, events: [], pred: null, predKey: '', say: null, bigText: '', bigT: -999, bigY: MID_Y,
    } as unknown as PetState;
    s.rots = STAGES.map(() => (s.rng(), 0)); // ✏️ M1 S3: 상대 속성 돌리기 없앰(판이 정해져야 퍼즐) — 난수 흐름은 그대로 둔다
    // ✏️ M1 S2 첫 30초(📐 CONTENT §5): 1-1엔 사자 둘이 미리 서 있다 → 첫 톡(사자 카드)이 곧 '빵!' 합체
    s.board[0] = { id: ++s.nid, k: 'lion', star: 1, born: -999, land: -999, mergeT: -999, from: -1 };
    s.board[1] = { id: ++s.nid, k: 'lion', star: 1, born: -999, land: -999, mergeT: -999, from: -1 };
    newStage(s);
    s.banner = null;
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    const fresh = !!p && !s.down;
    s.down = !!p;
    if (s.phase === 'shop') {
      let h: Hit = null, any = false;
      if (inp.pick !== undefined && inp.pick >= 0 && inp.pick < 3) (h = { t: 'card', i: inp.pick }), (any = true);
      else if (fresh) (h = hitTest(s, p!.x, p!.y * A)), (any = true);
      if (any) {
        if (s.firstTap < 0) s.firstTap = s.t;
        tap(s, h);
        s.idle = 0;
      } else s.idle++;
      s.pt++;
      // ✏️ M1 S2(📐 CONTENT §5): 1-1에서만 4초 동안 톡이 없으면 싸움이 저절로 — 처음 온 사람도 첫 돌진을 본다
      if (s.phase === 'shop' && s.stage === 0 && !s.again && s.idle >= AUTO_FIGHT && s.board.some(Boolean)) startFight(s);
    } else if (s.phase === 'fight') fightTick(s);
    else {
      s.pt++;
      const T = s.ok ? RESULT_OK : RESULT_FAIL;
      if (s.pt >= T || (fresh && s.pt > 50)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else {
          s.again = true;
          s.coins += LOSS_COINS;
          newStage(s);
        }
      }
    }
    if (s.events.length > 60) s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot && s.t - s.spot.t > 200) s.spot = null;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const petsquad = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapCard = (i: number) => at(CARD_X[i], CARD_Y);
const tapSlot = (i: number) => at(...slotXY(i));
const tapFight = (s: PetState) => at(fightBtn(s)[0], BTN_Y);
const tapReroll = () => at(REROLL_BTN[0], BTN_Y);

interface Mini extends Shopper { stage: number }
const cloneMini = (s: Shopper): Mini => ({
  coins: s.coins, board: s.board.map((p) => (p ? { ...p } : null)), shop: s.shop.map((c) => ({ ...c })), queue: s.queue.slice(), merges: s.merges, stage: s.stage, nid: s.nid, t: s.t,
});
const unitVal = (p: Pet) => K[p.k].cost * (p.star === 1 ? 1 : p.star === 2 ? 4.5 : 16);
/** 앞날 값: 동물(별) + 합체 직전 짝 + 금화 */
function future(m: Mini): number {
  let v = m.coins * 11;
  const c1 = new Map<Kind, number>(), c2 = new Map<Kind, number>();
  for (const p of m.board) {
    if (!p) continue;
    v += unitVal(p) * 14;
    if (p.star === 1) c1.set(p.k, (c1.get(p.k) ?? 0) + 1);
    if (p.star === 2) c2.set(p.k, (c2.get(p.k) ?? 0) + 1);
  }
  for (const [k, n] of c1) if (n >= 2) v += K[k].cost * 12;
  for (const [k, n] of c2) if (n >= 2) v += K[k].cost * 40;
  return v;
}
function pairs(m: Mini) {
  const c = new Map<string, number>();
  for (const p of m.board) if (p && p.star < 3) c.set(p.k + p.star, (c.get(p.k + p.star) ?? 0) + 1);
  let n = 0;
  for (const v of c.values()) if (v >= 2) n++;
  return n;
}
/** 계획 값: 이번 판(이기기·별) + 앞날(군단·금화) */
function planValue(s: PetState, m: Mini): number {
  const d = STAGES[s.stage];
  const f = runFight(makeFight(m.board, m.stage, s.rots[s.stage], false));
  let v = 0;
  if (f.done === 1) {
    let stars = 0;
    for (const q of d.stars) {
      const ok = q.k === 'win' ? true : q.k === 'merge' ? m.merges >= q.n : q.k === 'noloss' ? f.lost === 0 : q.k === 'save' ? m.coins >= q.n : q.k === 'shooter' ? m.board.some((p) => p && K[p.k].role === 1) : f.t <= q.n * 60;
      if (ok) stars++;
      // 합체 별이 남았으면: 짝(같은 동물 별 하나 둘)은 반쯤 다가선 것
      else if (q.k === 'merge') stars += 0.3 * Math.min(q.n, m.merges + 0.5 * pairs(m)) / q.n;
    }
    v = 2000 + stars * 600;
    let mh = 0, mm = 0;
    for (const u of f.u) if (!u.side) (mh += u.hp), (mm += u.max);
    v += 80 * (mm ? mh / mm : 0);
  } else {
    let eh = 0, em = 0;
    for (const u of f.u) if (u.side) (eh += u.hp), (em += u.max);
    v = -2000 + 400 * (1 - eh / Math.max(1, em));
  }
  return v + future(m);
}
interface Plan { buys: number[]; swap: [number, number] | null; reroll: boolean; sell: number; v: number }
const planMem = new WeakMap<object, { key: string; plan: Plan }>();
const keyOf = (s: PetState) => `${s.stage}|${s.coins}|${s.merges}|${s.board.map((p) => (p ? p.k + p.star : '-')).join(',')}|${s.shop.map((c) => (c.sold ? '_' : c.k)).join(',')}|${s.rerolls}`;
/** 지금 가게에서 살 조합 중 가장 좋은 것 */
function bestBuys(s: PetState, base: Mini): { buys: number[]; v: number } {
  let best = { buys: [] as number[], v: -1e9 };
  const open = [0, 1, 2].filter((i) => !base.shop[i].sold);
  for (let mask = 0; mask < 1 << open.length; mask++) {
    const m = cloneMini(base), buys: number[] = [];
    let ok = true;
    for (let j = 0; j < open.length && ok; j++) if (mask & (1 << j)) (ok = buyCard(m, open[j]).ok), buys.push(open[j]);
    if (!ok) continue;
    const v = planValue(s, m);
    if (v > best.v) best = { buys, v };
  }
  return best;
}
function makePlan(s: PetState): Plan {
  const key = keyOf(s), mem = planMem.get(s);
  if (mem && mem.key === key) return mem.plan;
  const b0 = bestBuys(s, cloneMini(s));
  let best: Plan = { buys: b0.buys, swap: null, reroll: false, sell: -1, v: b0.v };
  // 팔고 사기: 한 마리를 팔아 자리·금화를 만든 뒤 가장 좋은 조합
  for (let j = 0; j < 6; j++) {
    const p = s.board[j];
    if (!p) continue;
    const m = cloneMini(s);
    m.board[j] = null;
    m.coins += sellValue(p);
    const b = bestBuys(s, m);
    if (b.v > best.v + 25) best = { buys: [], swap: null, reroll: false, sell: j, v: b.v };
  }
  // 자리 바꾸기: 살 것이 없을 때 두 칸을 바꿔 본다
  if (!best.buys.length && best.sell < 0) {
    const n = slotsOf(s.stage);
    for (let a = 0; a < n; a++) {
      if (!s.board[a]) continue;
      for (let b = 0; b < n; b++) {
        if (b === a || (s.board[b] && b < a)) continue;
        const m = cloneMini(s);
        [m.board[a], m.board[b]] = [m.board[b], m.board[a]];
        const v = planValue(s, m);
        if (v > best.v + 30) best = { buys: [], swap: [a, b], reroll: false, sell: -1, v };
      }
    }
  }
  // 다시 뽑기: 가게를 미리 보지 않고, 나올 수 있는 가게 몇 개를 상상해 평균을 낸다 (판마다 같은 상상 — 결정적)
  if (rerollOn(s) && s.coins >= REROLL + 1 && s.rerolls < 6 && !best.swap && best.sell < 0) {
    const d = STAGES[s.stage], r = mulberry32(s.seed * 31 + s.stage * 7 + s.rerolls * 131 + s.coins);
    let sum = 0;
    const N = lineMode() ? 0 : 5;
    // ✏️ M1 S3: 카드 줄이면 넘긴 뒤 가게가 정해져 있다 — 상상하지 않고 그대로 계산
    if (lineMode() && canSkip(s)) {
      const m = cloneMini(s);
      m.coins -= REROLL;
      skipLine(m);
      const v = bestBuys(s, m).v;
      if (v > best.v + 20) best = { buys: [], swap: null, reroll: true, sell: -1, v };
    }
    for (let j = 0; j < N; j++) {
      const m = cloneMini(s);
      m.coins -= REROLL;
      const own = m.board.filter((p): p is Pet => !!p && p.star < 3).map((p) => p.k).filter((k) => d.pool.includes(k));
      m.shop = [0, 1, 2].map(() => ({ k: own.length && r() < 0.45 ? own[Math.floor(r() * own.length)] : d.pool[Math.floor(r() * d.pool.length)], sold: false, born: 0, shake: 0 }));
      sum += bestBuys(s, m).v;
    }
    if (N && sum / N > best.v + 20) best = { buys: [], swap: null, reroll: true, sell: -1, v: sum / N };
  }
  planMem.set(s, { key, plan: best });
  return best;
}
const tapMem = new WeakMap<object, number>();
/** 잘하는 봇: 사는 조합을 다 시뮬레이션해 보고 이기기 + 별이 가장 많은 쪽, 자리 바꾸기, 모자라면 다시 뽑기 */
export const petsquadSmart: Bot<PetState> = {
  name: '조합을 다 싸워 보고 사기',
  act(s) {
    if (s.phase !== 'shop') return NO;
    if (s.down) return NO;
    const last = tapMem.get(s) ?? -99;
    if (s.t - last < 4) return NO;
    tapMem.set(s, s.t);
    if (s.sel >= 0) {
      const pl = makePlan(s);
      if (pl.swap && pl.swap[0] === s.sel) return tapSlot(pl.swap[1]);
      if (pl.sell === s.sel) return tapReroll();
      return tapSlot(s.sel);
    }
    const pl = makePlan(s);
    if (pl.reroll) return tapReroll();
    if (pl.buys.length) return tapCard(pl.buys[0]);
    if (pl.swap) return tapSlot(pl.swap[0]);
    if (pl.sell >= 0) return tapSlot(pl.sell);
    return tapFight(s);
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const petsquadRandom: Bot<PetState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 3 + Math.floor(rng() * 6);
        m.x = 0.03 + rng() * 0.94;
        m.y = 0.1 + rng() * 0.88;
      } else m.next = s.t + 12 + Math.floor(rng() * 50);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

const habitMem = new WeakMap<object, number>();
function habitTap(s: PetState, f: () => Input): Input {
  if (s.phase !== 'shop' || s.down) return NO;
  const last = habitMem.get(s) ?? -99;
  if (s.t - last < 4) return NO;
  habitMem.set(s, s.t);
  return f();
}
/** 버릇 봇: 늘 살 수 있는 것 중 가장 비싼 카드를 산다, 못 사면 싸움 */
export const petsquadHabit: Bot<PetState> = {
  name: '늘 가장 비싼 것 사기',
  act(s) {
    return habitTap(s, () => {
      let bi = -1, bc = -1;
      for (let i = 0; i < 3; i++) {
        const c = s.shop[i];
        if (c.sold || K[c.k].cost > s.coins || landing(s, c.k).slot < 0) continue;
        if (K[c.k].cost > bc) (bc = K[c.k].cost), (bi = i);
      }
      return bi >= 0 ? tapCard(bi) : tapFight(s);
    });
  },
};
/** 독립 버릇 봇: 늘 같은 동물만 모은다 (가장 많이 가진 동물, 없으면 첫 카드) — 없으면 다시 뽑기 */
export const petsquadHabit2: Bot<PetState> = {
  name: '늘 같은 동물만 모으기',
  act(s) {
    return habitTap(s, () => {
      const cnt = new Map<Kind, number>();
      for (const p of s.board) if (p) cnt.set(p.k, (cnt.get(p.k) ?? 0) + STAR_M[p.star]);
      let fav: Kind | null = null, fv = 0;
      for (const [k, v] of cnt) if (v > fv) (fv = v), (fav = k);
      for (let i = 0; i < 3; i++) {
        const c = s.shop[i];
        if (c.sold || K[c.k].cost > s.coins || landing(s, c.k).slot < 0) continue;
        if (!fav || c.k === fav) return tapCard(i);
      }
      if (rerollOn(s) && s.coins >= REROLL + (fav ? K[fav].cost : 1) && s.rerolls < 3 && (!lineMode() || canSkip(s))) return tapReroll();
      return tapFight(s);
    });
  },
};

/** ✏️ M1 S1 사람 흉내 봇(📋 M1 완료 기준 · 🧪 P2·P10): 잘하는 봇의 계획(막대가 보여 주는 것)을 따르되 1.5초에 한 번만 톡, 다시 뽑기는 안 한다 */
const humMem = new WeakMap<object, number>();
export const petsquadHuman: Bot<PetState> = {
  name: '사람 흉내(1.5초에 한 톡·다시 뽑기 안 함·1판은 손가락 안내대로)',
  act(s) {
    if (s.phase !== 'shop' || s.down) return NO;
    const last = humMem.get(s);
    if (last === undefined || s.t - last < 90) {
      if (last === undefined) humMem.set(s, s.t - 45); // 판이 열리고 약 0.75초 뒤 첫 톡
      return NO;
    }
    humMem.set(s, s.t);
    // ✏️ M1 S2: 1-1에선 화면 손가락 안내를 따른다(처음 온 사람이 하는 대로 — 사자 톡 → 빵! → 싸움!)
    if (s.stage === 0 && !s.again && s.sel < 0) {
      const tip = firstTip(s);
      return tip === 9 ? tapFight(s) : tapCard(tip);
    }
    const pl = makePlan(s);
    if (s.sel >= 0) {
      if (pl.swap && pl.swap[0] === s.sel) return tapSlot(pl.swap[1]);
      if (pl.sell === s.sel) return tapReroll();
      return tapSlot(s.sel);
    }
    if (pl.buys.length) return tapCard(pl.buys[0]);
    if (pl.swap) return tapSlot(pl.swap[0]);
    if (pl.sell >= 0) return tapSlot(pl.sell);
    return tapFight(s);
  },
};

/** ✏️ M1 S1 버릇 봇 공장(📐 GDD §6.3 · 🧪 P7): 살 수 있는 카드 중 버릇이 고른 것을 사고, 없으면 싸움. 다시 뽑기·자리 바꾸기는 안 한다 */
export interface CardSee { i: number; k: Kind; cost: number; merge: boolean; strong: number; front: boolean }
/** ✏️ M1 S2(🧪 S1 측정기 한계): 진영이 가득 차서 못 사는 카드가 있으면, 그 카드보다 값이 싼 가장 약한 동물을 판다(사람도 그렇게 한다) */
function weakestToSell(s: PetState): number {
  if (seeCards(s).length) return -1;
  let want = 0;
  for (const c of s.shop) if (c && !c.sold && K[c.k].cost <= s.coins + 1 && landing(s, c.k).slot < 0) want = Math.max(want, K[c.k].cost);
  if (!want) return -1;
  let wi = -1, wv = 1e9;
  s.board.forEach((p, i) => {
    const v = p ? K[p.k].cost * STAR_M[p.star] : 1e9;
    if (p && v < wv) (wv = v), (wi = i);
  });
  return wv < want ? wi : -1;
}
function seeCards(s: PetState): CardSee[] {
  const d = STAGES[s.stage], els = d.foes.map((f) => foeEl(s.rots[s.stage], f)), out: CardSee[] = [];
  for (let i = 0; i < 3; i++) {
    const c = s.shop[i];
    if (!c || c.sold || K[c.k].cost > s.coins) continue;
    const l = landing(s, c.k);
    if (l.slot < 0) continue;
    const e = K[c.k].el;
    out.push({ i, k: c.k, cost: K[c.k].cost, merge: l.merge, strong: els.filter((x) => beats(e, x)).length - els.filter((x) => beats(x, e)).length, front: K[c.k].role === 0 });
  }
  return out;
}
export function habitBot(name: string, pick: (cs: CardSee[], s: PetState) => CardSee | undefined): Bot<PetState> {
  return {
    name,
    act(s) {
      return habitTap(s, () => {
        if (s.sel >= 0) return tapReroll(); // 고른 동물 팔기(왼쪽 단추가 '팔기'로 바뀐다)
        const cs = seeCards(s), c = cs.length ? pick(cs, s) : undefined;
        if (c) return tapCard(c.i);
        const w = weakestToSell(s);
        return w >= 0 ? tapSlot(w) : tapFight(s);
      });
    },
  };
}
const best = (cs: CardSee[], f: (c: CardSee) => number) => cs.reduce((a, c) => (f(c) > f(a) ? c : a));
/** GDD §6.3 버릇 여섯: 왼쪽 · 가장 싼 · 합체되는 · 센 속성 · 앞줄 막는 동물 · 가장 비싼(넘기기 안 함) */
export const HABITS: Bot<PetState>[] = [
  habitBot('늘 왼쪽 카드', (cs) => cs[0]),
  habitBot('늘 가장 싼 카드', (cs) => best(cs, (c) => -c.cost)),
  habitBot('늘 합체되는 카드', (cs) => cs.find((c) => c.merge) ?? cs[0]),
  habitBot('늘 센 속성', (cs) => best(cs, (c) => c.strong)),
  habitBot('늘 앞줄(막는 동물)부터', (cs) => cs.find((c) => c.front) ?? cs[0]),
  habitBot('늘 가장 비싼 카드', (cs) => best(cs, (c) => c.cost)),
];

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
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
const ease = (u: number) => 1 - (1 - clamp(u, 0, 1)) ** 2;
const OUT = '#4a2a12';
const EL_COL = ['#3d9df5', '#ff6a2a', '#43be3c', '#c9b79a'];
const EL_DARK = ['#1c5aa8', '#b23a0e', '#1f7a26', '#7a6a50'];
const EL_LIGHT = ['#cfe9ff', '#ffd9bf', '#d4f5c6', '#f3ece0'];

/** 속성 그림: 물방울 · 불꽃 · 잎 */
function elIcon(ctx: C2, el: number, x: number, y: number, r: number) {
  if (el > 2) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  if (el === 0) {
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.35, -r * 0.45, r * 0.85, r * 0.05, r * 0.72, r * 0.45);
    ctx.arc(0, r * 0.3, r * 0.74, 0.2, Math.PI - 0.2);
    ctx.bezierCurveTo(-r * 0.85, r * 0.05, -r * 0.35, -r * 0.45, 0, -r);
  } else if (el === 1) {
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.2, -r * 0.5, r * 0.9, -r * 0.2, r * 0.75, r * 0.4);
    ctx.bezierCurveTo(r * 0.6, r * 0.95, -r * 0.6, r * 0.95, -r * 0.75, r * 0.4);
    ctx.bezierCurveTo(-r * 0.85, 0, -r * 0.45, -r * 0.2, -r * 0.3, -r * 0.55);
    ctx.quadraticCurveTo(-r * 0.1, -r * 0.2, 0, -r);
  } else {
    ctx.moveTo(-r * 0.75, r * 0.75);
    ctx.bezierCurveTo(-r * 0.95, -r * 0.2, -r * 0.2, -r * 0.9, r * 0.85, -r * 0.85);
    ctx.bezierCurveTo(r * 0.9, r * 0.1, r * 0.2, r * 0.85, -r * 0.75, r * 0.75);
  }
  ctx.closePath();
  ctx.fillStyle = lin(ctx, 0, -r, 0, r, [0, EL_LIGHT[el]], [0.45, EL_COL[el]], [1, EL_DARK[el]]);
  ctx.fill();
  ctx.strokeStyle = EL_DARK[el];
  ctx.lineWidth = Math.max(1, r * 0.16);
  ctx.stroke();
  if (el === 1) {
    ctx.fillStyle = '#ffe36a';
    ell(ctx, 0, r * 0.38, r * 0.32, r * 0.42);
    ctx.fill();
  } else if (el === 2) {
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, r * 0.6);
    ctx.quadraticCurveTo(0, -r * 0.05, r * 0.6, -r * 0.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.8)';
    ell(ctx, -r * 0.25, r * 0.15, r * 0.14, r * 0.24, 0.4);
    ctx.fill();
  }
  ctx.restore();
}
function coinIcon(ctx: C2, x: number, y: number, r: number) {
  ctx.fillStyle = '#b8780e';
  ell(ctx, x, y + r * 0.18, r, r * 0.95);
  ctx.fill();
  ctx.fillStyle = lin(ctx, x, y - r, x, y + r, [0, '#fff3a0'], [0.5, '#ffcf3a'], [1, '#f0a020']);
  ell(ctx, x, y, r, r * 0.95);
  ctx.fill();
  ctx.strokeStyle = '#9a600a';
  ctx.lineWidth = Math.max(1, r * 0.14);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(154,96,10,.55)';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ell(ctx, x, y, r * 0.6, r * 0.56);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ell(ctx, x - r * 0.35, y - r * 0.4, r * 0.22, r * 0.12, -0.6);
  ctx.fill();
}
/** 손가락 (안내) */
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.12);
  ctx.rotate(-0.3);
  ctx.fillStyle = 'rgba(60,30,10,.22)';
  ell(ctx, k * 0.2, k * 1.25, k * 0.4, k * 0.12);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(2, k * 0.08);
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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ── 동물 ──
type Face = 'idle' | 'happy' | 'hit' | 'angry' | 'dizzy' | 'roar' | 'ko' | 'worry';
interface Look { el: number; star: number; enemy: boolean; face: Face; t: number; sq: number; tilt: number; flash: number; ph: number; flap?: number; act?: number }
interface Skin { body: string; shade: string; belly: string; ear: string; inner: string; muzzle: string; nose: string }
const SKIN: Record<Kind, Skin> = {
  lion: { body: '#ffc94a', shade: '#e09a22', belly: '#fff0bf', ear: '#ffc94a', inner: '#ff9f6a', muzzle: '#fff3d0', nose: '#7a3a1a' },
  turtle: { body: '#9ee070', shade: '#5fae3e', belly: '#f4f0b0', ear: '#9ee070', inner: '#9ee070', muzzle: '#c8f2a0', nose: '#3a6a2a' },
  hedge: { body: '#f6d6a6', shade: '#d6a46a', belly: '#fff2dc', ear: '#f6d6a6', inner: '#ffb3a0', muzzle: '#fff2dc', nose: '#3a2418' },
  fox: { body: '#ff9440', shade: '#d8621e', belly: '#fff6ea', ear: '#ff9440', inner: '#fff0e0', muzzle: '#fff6ea', nose: '#3a2418' },
  owl: { body: '#b8875a', shade: '#86592e', belly: '#f6e4c4', ear: '#9a6a3e', inner: '#9a6a3e', muzzle: '#f6e4c4', nose: '#ffa12a' },
  rabbit: { body: '#fffaf4', shade: '#e2d2c4', belly: '#ffffff', ear: '#fffaf4', inner: '#ffb0c0', muzzle: '#ffffff', nose: '#ff7a9a' },
  sheep: { body: '#ffffff', shade: '#dcd8e4', belly: '#ffffff', ear: '#f6d2bc', inner: '#ffb0a0', muzzle: '#ffe2d0', nose: '#8a5a4a' },
  bug: { body: '#ef4a3a', shade: '#b0261c', belly: '#2a2a32', ear: '#2a2a32', inner: '#2a2a32', muzzle: '#2a2a32', nose: '#2a2a32' },
  raccoon: { body: '#a9a6b4', shade: '#76728a', belly: '#e6e2ee', ear: '#76728a', inner: '#4a4658', muzzle: '#f2eff6', nose: '#2a2632' },
  sling: { body: '#a9a6b4', shade: '#76728a', belly: '#e6e2ee', ear: '#76728a', inner: '#4a4658', muzzle: '#f2eff6', nose: '#2a2632' },
  boar: { body: '#b27a4a', shade: '#7e4e26', belly: '#d8a878', ear: '#8e5a30', inner: '#e0909a', muzzle: '#e8a0a0', nose: '#a85a5a' },
  bat: { body: '#8a6ac0', shade: '#5a3e8a', belly: '#c4b0e6', ear: '#8a6ac0', inner: '#ffb0d0', muzzle: '#c4b0e6', nose: '#3a2458' },
  squirrel: { body: '#e08a3e', shade: '#a85a1e', belly: '#fff0d6', ear: '#e08a3e', inner: '#ffc0a0', muzzle: '#fff0d6', nose: '#3a2418' },
  bear: { body: '#a0683a', shade: '#6a3e1c', belly: '#e0b484', ear: '#a0683a', inner: '#e0a080', muzzle: '#f0cfa0', nose: '#2a1608' },
};
function drawFace(ctx: C2, k: Kind, r: number, L: Look, hy: number) {
  const lw = Math.max(1.2, r * 0.07);
  const owl = k === 'owl', bug = k === 'bug';
  const ex = r * (owl ? 0.3 : 0.27), ey = hy + r * (owl ? -0.02 : 0.02), er = r * (owl ? 0.13 : 0.095);
  const blink = L.face === 'idle' && (L.t + L.ph * 97) % 190 < 7;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (owl) {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#fff8e6';
      ell(ctx, sd * ex, ey, r * 0.24, r * 0.24);
      ctx.fill();
      ctx.strokeStyle = '#e0a040';
      ctx.lineWidth = lw * 1.2;
      ctx.stroke();
    }
  }
  if (k === 'raccoon' || k === 'sling') {
    ctx.fillStyle = '#3a3646';
    ctx.beginPath();
    ctx.ellipse(-ex, ey, r * 0.24, r * 0.16, -0.25, 0, TAU);
    ctx.ellipse(ex, ey, r * 0.24, r * 0.16, 0.25, 0, TAU);
    ctx.fill();
    ctx.fillRect(-ex, ey - r * 0.08, ex * 2, r * 0.12);
  }
  const eyeCol = bug ? '#ffffff' : k === 'raccoon' || k === 'sling' ? '#ffffff' : '#2a1608';
  ctx.strokeStyle = eyeCol;
  ctx.fillStyle = eyeCol;
  ctx.lineWidth = lw * 1.25;
  for (const sd of [-1, 1]) {
    const x = sd * ex;
    switch (L.face) {
      case 'happy':
      case 'roar':
        ctx.beginPath();
        ctx.arc(x, ey + er * 0.5, er * 1.1, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
        break;
      case 'hit':
        ctx.beginPath();
        ctx.moveTo(x - sd * er * 1.1, ey - er);
        ctx.lineTo(x + sd * er * 0.4, ey);
        ctx.lineTo(x - sd * er * 1.1, ey + er);
        ctx.stroke();
        break;
      case 'ko':
        ctx.beginPath();
        ctx.moveTo(x - er, ey - er);
        ctx.lineTo(x + er, ey + er);
        ctx.moveTo(x + er, ey - er);
        ctx.lineTo(x - er, ey + er);
        ctx.stroke();
        break;
      case 'dizzy':
        ctx.beginPath();
        for (let q = 0; q < 14; q++) {
          const a = q * 0.75 + L.t * 0.3 * sd, rr2 = er * 0.15 + q * er * 0.075;
          q ? ctx.lineTo(x + Math.cos(a) * rr2, ey + Math.sin(a) * rr2) : ctx.moveTo(x, ey);
        }
        ctx.stroke();
        break;
      default:
        if (blink) {
          ctx.beginPath();
          ctx.moveTo(x - er, ey);
          ctx.lineTo(x + er, ey);
          ctx.stroke();
        } else {
          ell(ctx, x, ey, er * (owl ? 1.15 : 0.9), er * (owl ? 1.15 : 1.15));
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ell(ctx, x - er * 0.3, ey - er * 0.4, er * 0.36, er * 0.36);
          ctx.fill();
          ctx.fillStyle = eyeCol;
        }
    }
  }
  // 눈썹 (상대는 늘 찡그림 · 힘줄 때)
  if ((L.enemy && L.face !== 'ko' && L.face !== 'dizzy' && L.face !== 'hit') || L.face === 'angry' || L.face === 'worry') {
    ctx.strokeStyle = k === 'raccoon' || k === 'sling' || bug ? '#ffffff' : '#3a2010';
    ctx.lineWidth = lw * 1.3;
    const up = L.face === 'worry' ? -1 : 1;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * (ex + er * 1.3), ey - er * (2 - 0.6 * up));
      ctx.lineTo(sd * (ex - er * 0.9), ey - er * (2 + 0.5 * up));
      ctx.stroke();
    }
  }
  // 볼
  if (!bug && L.face !== 'ko') {
    ctx.fillStyle = L.enemy ? 'rgba(255,120,120,.35)' : 'rgba(255,120,140,.45)';
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.45, hy + r * 0.2, r * 0.12, r * 0.075);
      ctx.fill();
    }
  }
  // 코 · 입
  const S = SKIN[k], my = hy + r * 0.27;
  if (owl) {
    ctx.fillStyle = S.nose;
    ctx.beginPath();
    ctx.moveTo(-r * 0.09, hy + r * 0.12);
    ctx.lineTo(r * 0.09, hy + r * 0.12);
    ctx.lineTo(0, hy + r * (L.face === 'roar' || L.face === 'happy' ? 0.36 : 0.3));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#a85a10';
    ctx.lineWidth = lw * 0.8;
    ctx.stroke();
    return;
  }
  if (k !== 'bug' && k !== 'turtle' && k !== 'bat') {
    ctx.fillStyle = S.muzzle;
    ell(ctx, 0, hy + r * 0.24, r * (k === 'boar' ? 0.24 : 0.22), r * (k === 'boar' ? 0.17 : 0.15));
    ctx.fill();
  }
  if (k === 'boar') {
    ctx.fillStyle = '#7a3a3a';
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.08, hy + r * 0.24, r * 0.035, r * 0.05);
      ctx.fill();
    }
  } else if (k !== 'bug') {
    ctx.fillStyle = S.nose;
    ell(ctx, 0, hy + r * 0.16, r * 0.075, r * 0.05);
    ctx.fill();
  }
  ctx.strokeStyle = bug ? '#ffffff' : '#3a1a0a';
  ctx.lineWidth = lw;
  if (L.face === 'roar' || L.face === 'dizzy' || L.face === 'hit') {
    const big = L.face === 'roar' ? 1 : 0.6;
    ctx.fillStyle = '#c0302a';
    ell(ctx, 0, my + r * 0.06 * big, r * 0.13 * big + r * 0.03, r * 0.12 * big);
    ctx.fill();
    ctx.stroke();
    if (L.face === 'roar') {
      ctx.fillStyle = '#ff8a9a';
      ell(ctx, 0, my + r * 0.13, r * 0.08, r * 0.04);
      ctx.fill();
    }
  } else if (L.face === 'happy') {
    ctx.fillStyle = '#c0302a';
    ctx.beginPath();
    ctx.arc(0, my - r * 0.02, r * 0.11, 0.1, Math.PI - 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (L.enemy || L.face === 'worry') {
    ctx.beginPath();
    ctx.arc(0, my + r * 0.1, r * 0.09, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-r * 0.055, my - r * 0.01, r * 0.055, 0.2, Math.PI - 0.2);
    ctx.arc(r * 0.055, my - r * 0.01, r * 0.055, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (k === 'rabbit' && L.face !== 'roar') {
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#c8b8b0';
    ctx.lineWidth = lw * 0.6;
    rr(ctx, -r * 0.06, my + r * 0.02, r * 0.12, r * 0.1, r * 0.02);
    ctx.fill();
    ctx.stroke();
  }
  if (k === 'boar') {
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = '#a89a80';
    ctx.lineWidth = lw * 0.7;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.14, my);
      ctx.quadraticCurveTo(sd * r * 0.3, my - r * 0.05, sd * r * 0.28, my - r * 0.22);
      ctx.lineTo(sd * r * 0.2, my - r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  if (k === 'bat' && L.face !== 'happy') {
    ctx.fillStyle = '#ffffff';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * r * 0.05, my);
      ctx.lineTo(sd * r * 0.1, my);
      ctx.lineTo(sd * r * 0.075, my + r * 0.09);
      ctx.closePath();
      ctx.fill();
    }
  }
}
/** 통통한 동물 한 마리. (x, y) = 발 밑. r = 머리 크기 */
function drawPet(ctx: C2, k: Kind, x: number, y: number, r: number, L: Look) {
  const S = SKIN[k], lw = Math.max(1.4, r * 0.075), t = L.t + L.ph * 50;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(L.tilt);
  const sq = L.sq;
  ctx.scale(1 + sq * 0.55, 1 - sq);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = lw;
  const fly = k === 'bat';
  const by = -r * 0.62, hy = fly ? -r * 0.95 : k === 'bug' ? -r * 0.72 : -r * 1.42, hr = k === 'bug' ? r * 0.5 : r * 0.74;
  const breath = Math.sin(t * 0.08) * r * 0.02;
  // ── 꼬리 ──
  if (k === 'fox' || k === 'squirrel') {
    const sw = Math.sin(t * 0.07) * 0.2;
    ctx.save();
    ctx.translate(r * 0.4, -r * 0.4);
    ctx.rotate(-0.5 + sw);
    ctx.fillStyle = lin(ctx, 0, 0, r * 1.2, -r * 0.8, [0, S.body], [1, S.shade]);
    ctx.beginPath();
    if (k === 'squirrel') {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(r * 0.9, r * 0.3, r * 1.4, -r * 0.9, r * 0.6, -r * 1.5);
      ctx.bezierCurveTo(r * 0.1, -r * 1.8, -r * 0.3, -r * 1.2, r * 0.25, -r * 1.0);
      ctx.bezierCurveTo(r * 0.6, -r * 0.6, r * 0.2, -r * 0.2, 0, 0);
    } else {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(r * 0.5, r * 0.25, r * 1.2, -r * 0.1, r * 1.15, -r * 0.65);
      ctx.bezierCurveTo(r * 0.8, -r * 0.55, r * 0.4, -r * 0.4, 0, -r * 0.25);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (k === 'fox') {
      ctx.fillStyle = '#fff6ea';
      ell(ctx, r * 1.02, -r * 0.55, r * 0.17, r * 0.12, -0.5);
      ctx.fill();
    }
    ctx.restore();
  } else if (k === 'lion') {
    ctx.strokeStyle = S.shade;
    ctx.lineWidth = lw * 1.2;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.3);
    ctx.quadraticCurveTo(r * 0.95, -r * 0.2 + Math.sin(t * 0.09) * r * 0.1, r * 0.85, -r * 0.75);
    ctx.stroke();
    ctx.fillStyle = '#c8641e';
    ell(ctx, r * 0.85, -r * 0.8, r * 0.12, r * 0.14);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
  } else if (k === 'raccoon' || k === 'sling') {
    ctx.save();
    ctx.translate(r * 0.45, -r * 0.3);
    ctx.rotate(-0.7 + Math.sin(t * 0.06) * 0.15);
    ctx.fillStyle = S.body;
    ell(ctx, r * 0.45, 0, r * 0.5, r * 0.18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#4a4658';
    for (const q of [0.25, 0.55, 0.85]) {
      ell(ctx, r * q, 0, r * 0.07, r * 0.17);
      ctx.fill();
    }
    ctx.restore();
  }
  // ── 내 편 망토 (속성 색) ──
  if (!L.enemy && L.el < 3 && !fly && k !== 'bug') {
    const fl = Math.sin(t * 0.1) * r * 0.06;
    ctx.fillStyle = lin(ctx, 0, -r * 1.1, 0, r * 0.1, [0, EL_COL[L.el]], [1, EL_DARK[L.el]]);
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 1.0);
    ctx.quadraticCurveTo(-r * 0.95 - fl, -r * 0.4, -r * 0.72 - fl, r * 0.02);
    ctx.quadraticCurveTo(0, r * 0.12, r * 0.72 + fl, r * 0.02);
    ctx.quadraticCurveTo(r * 0.95 + fl, -r * 0.4, r * 0.45, -r * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // ── 등 뒤 (등껍질 · 가시 · 날개 · 양털) ──
  if (k === 'turtle') {
    ctx.fillStyle = lin(ctx, 0, -r * 1.25, 0, 0, [0, '#c99a5a'], [0.6, '#9a6a34'], [1, '#6e4520']);
    ell(ctx, 0, by - r * 0.08, r * 0.82, r * 0.68);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(70,40,15,.5)';
    ctx.lineWidth = lw * 0.8;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * r * 0.7, by - r * 0.1, r * 0.25, 0, TAU);
      ctx.stroke();
    }
    ctx.strokeStyle = OUT;
    ctx.lineWidth = lw;
  } else if (k === 'hedge') {
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath();
    const n = 13;
    for (let q = 0; q <= n; q++) {
      const a = Math.PI * 0.92 + (q / n) * Math.PI * 1.16, R1 = q % 2 ? hr * 1.02 : hr * 1.48;
      const px = Math.cos(a) * R1, py = hy + Math.sin(a) * R1 * 0.95;
      q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.lineTo(r * 0.7, by);
    ctx.lineTo(-r * 0.7, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,230,190,.35)';
    for (let q = 0; q < 5; q++) {
      const a = Math.PI * 1.15 + q * 0.32;
      ell(ctx, Math.cos(a) * hr * 1.18, hy + Math.sin(a) * hr * 1.1, r * 0.05, r * 0.12, a + Math.PI / 2);
      ctx.fill();
    }
  } else if (k === 'bat' || k === 'owl') {
    const fl = k === 'bat' ? Math.sin((L.flap ?? t) * 0.45) : 0;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * r * 0.45, by - r * 0.1);
      ctx.scale(sd, 1);
      ctx.rotate(k === 'bat' ? -0.25 + fl * 0.45 : 0.15);
      ctx.fillStyle = k === 'bat' ? lin(ctx, 0, -r, r * 1.2, 0, [0, '#6a4aa0'], [1, '#3e2870']) : S.shade;
      ctx.beginPath();
      if (k === 'bat') {
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(r * 0.6, -r * 0.85, r * 1.3, -r * 0.55);
        ctx.quadraticCurveTo(r * 1.1, -r * 0.25, r * 1.15, r * 0.05);
        ctx.quadraticCurveTo(r * 0.85, -r * 0.1, r * 0.75, r * 0.2);
        ctx.quadraticCurveTo(r * 0.5, 0, r * 0.35, r * 0.3);
        ctx.quadraticCurveTo(r * 0.2, r * 0.1, 0, r * 0.25);
      } else {
        ctx.moveTo(0, -r * 0.3);
        ctx.quadraticCurveTo(r * 0.45, -r * 0.2, r * 0.32, r * 0.45);
        ctx.quadraticCurveTo(r * 0.05, r * 0.3, 0, r * 0.25);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (k === 'sheep') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let q = 0; q < 9; q++) {
      const a = (q / 9) * TAU, px = Math.cos(a) * r * 0.62, py = by + Math.sin(a) * r * 0.5;
      ctx.moveTo(px + r * 0.28, py);
      ctx.arc(px, py, r * 0.28, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  } else if (k === 'bug') {
    // 무당벌레: 큰 등딱지
    ctx.fillStyle = lin(ctx, 0, -r * 1.1, 0, 0, [0, '#ff7a6a'], [0.5, S.body], [1, S.shade]);
    ell(ctx, 0, -r * 0.5, r * 0.82, r * 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.08);
    ctx.lineTo(0, r * 0.08);
    ctx.stroke();
    ctx.fillStyle = '#2a2a32';
    for (const [px, py, q] of [[-0.42, -0.62, 0.14], [0.42, -0.62, 0.14], [-0.3, -0.25, 0.11], [0.3, -0.25, 0.11], [-0.55, -0.35, 0.08], [0.55, -0.35, 0.08]]) {
      ell(ctx, px * r, py * r, q * r, q * r);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ell(ctx, -r * 0.35, -r * 0.88, r * 0.22, r * 0.09, -0.3);
    ctx.fill();
  }
  // ── 몸 ──
  if (k !== 'bug' && k !== 'sheep') {
    ctx.fillStyle = lin(ctx, -r * 0.6, by - r * 0.5, r * 0.6, by + r * 0.5, [0, S.body], [1, S.shade]);
    ell(ctx, 0, by + breath, r * (fly ? 0.45 : 0.6), r * (fly ? 0.42 : 0.56));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = S.belly;
    ell(ctx, 0, by + r * 0.1 + breath, r * (fly ? 0.26 : 0.36), r * (fly ? 0.26 : 0.36));
    ctx.fill();
    if (k === 'turtle') {
      ctx.strokeStyle = 'rgba(150,140,60,.6)';
      ctx.lineWidth = lw * 0.7;
      for (const q of [-0.1, 0.12]) {
        ctx.beginPath();
        ctx.moveTo(-r * 0.3, by + r * q + r * 0.1);
        ctx.lineTo(r * 0.3, by + r * q + r * 0.1);
        ctx.stroke();
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = lw;
    }
  }
  // ── 발 · 팔 ──
  if (!fly) {
    ctx.fillStyle = k === 'bug' ? '#2a2a32' : S.shade;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * r * 0.3, -r * 0.06, r * 0.2, r * 0.12);
      ctx.fill();
      ctx.stroke();
    }
    if (k !== 'bug') {
      ctx.fillStyle = S.body;
      const wave = L.face === 'happy' ? Math.sin(t * 0.3) * 0.5 : 0;
      for (const sd of [-1, 1]) {
        ctx.save();
        ctx.translate(sd * r * 0.55, by - r * 0.05);
        ctx.rotate(sd * (0.5 + (sd > 0 ? wave : -wave)));
        ell(ctx, 0, r * 0.12, r * 0.13, r * 0.22);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  // ── 갈기 (머리 뒤) ──
  if (k === 'lion') {
    const n = 14;
    ctx.fillStyle = lin(ctx, 0, hy - hr * 1.4, 0, hy + hr * 1.3, [0, '#ff9a3a'], [1, '#c8541a']);
    ctx.beginPath();
    for (let q = 0; q <= n * 2; q++) {
      const a = (q / (n * 2)) * TAU, R1 = q % 2 ? hr * 1.12 : hr * 1.42 + Math.sin(t * 0.05 + q) * r * 0.02;
      const px = Math.cos(a) * R1, py = hy + Math.sin(a) * R1;
      q ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // ── 귀 ──
  const ear = (ex: number, ey: number, ew: number, eh: number, rot: number, inner = true) => {
    ctx.save();
    ctx.translate(ex, ey);
    ctx.rotate(rot);
    ctx.fillStyle = S.ear;
    ell(ctx, 0, 0, ew, eh);
    ctx.fill();
    ctx.stroke();
    if (inner) {
      ctx.fillStyle = S.inner;
      ell(ctx, 0, eh * 0.12, ew * 0.55, eh * 0.62);
      ctx.fill();
    }
    ctx.restore();
  };
  if (k === 'rabbit') {
    const wig = Math.sin(t * 0.06) * 0.08;
    for (const sd of [-1, 1]) ear(sd * hr * 0.42, hy - hr * 1.15, r * 0.17, r * 0.5, sd * (0.15 + wig));
  } else if (k === 'fox') {
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(sd * hr * 0.55, hy - hr * 0.7);
      ctx.rotate(sd * 0.3);
      ctx.fillStyle = S.ear;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.15);
      ctx.lineTo(0, -r * 0.45);
      ctx.lineTo(r * 0.2, r * 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#3a2418';
      ctx.beginPath();
      ctx.moveTo(-r * 0.07, -r * 0.25);
      ctx.lineTo(0, -r * 0.43);
      ctx.lineTo(r * 0.07, -r * 0.25);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (k === 'owl') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = S.ear;
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.35, hy - hr * 0.8);
      ctx.lineTo(sd * hr * 0.75, hy - hr * 1.25);
      ctx.lineTo(sd * hr * 0.8, hy - hr * 0.55);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (k === 'bat') {
    for (const sd of [-1, 1]) {
      ctx.fillStyle = S.ear;
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.2, hy - hr * 0.8);
      ctx.lineTo(sd * hr * 0.75, hy - hr * 1.35);
      ctx.lineTo(sd * hr * 0.85, hy - hr * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = S.inner;
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.4, hy - hr * 0.8);
      ctx.lineTo(sd * hr * 0.72, hy - hr * 1.15);
      ctx.lineTo(sd * hr * 0.75, hy - hr * 0.6);
      ctx.closePath();
      ctx.fill();
    }
  } else if (k === 'sheep') {
    for (const sd of [-1, 1]) ear(sd * hr * 0.95, hy - hr * 0.05, r * 0.24, r * 0.11, sd * 0.35);
  } else if (k === 'bug') {
    ctx.lineWidth = lw * 0.9;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * hr * 0.3, hy - hr * 0.7);
      ctx.quadraticCurveTo(sd * hr * 0.5, hy - hr * 1.5, sd * hr * 0.9, hy - hr * 1.45);
      ctx.stroke();
      ctx.fillStyle = '#2a2a32';
      ell(ctx, sd * hr * 0.9, hy - hr * 1.45, r * 0.06, r * 0.06);
      ctx.fill();
    }
    ctx.lineWidth = lw;
  } else if (k !== 'turtle') {
    const big = k === 'bear' ? 1.15 : k === 'boar' ? 0.8 : 1;
    for (const sd of [-1, 1]) ear(sd * hr * 0.68, hy - hr * 0.68, r * 0.2 * big, r * 0.19 * big, sd * 0.3);
  }
  // ── 머리 ──
  ctx.fillStyle = k === 'bug' ? '#2a2a32' : lin(ctx, 0, hy - hr, 0, hy + hr, [0, k === 'sheep' ? '#ffe8d8' : S.body], [1, k === 'sheep' ? '#f0c8b0' : S.shade]);
  if (k === 'sheep') {
    ell(ctx, 0, hy + hr * 0.08, hr * 0.78, hr * 0.85);
  } else ell(ctx, 0, hy, hr * (k === 'boar' ? 1.08 : 1.0), hr * (k === 'turtle' ? 0.92 : 0.95));
  ctx.fill();
  ctx.stroke();
  if (k === 'sheep') {
    // 양털 앞머리
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    for (let q = 0; q < 5; q++) {
      const px = (q - 2) * hr * 0.32, py = hy - hr * 0.62 - (q % 2) * hr * 0.12;
      ctx.moveTo(px + hr * 0.26, py);
      ctx.arc(px, py, hr * 0.26, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
  }
  if (k === 'owl') {
    ctx.fillStyle = S.belly;
    ctx.beginPath();
    ctx.moveTo(0, hy - hr * 0.55);
    ctx.bezierCurveTo(hr * 0.95, hy - hr * 0.95, hr * 1.05, hy + hr * 0.7, 0, hy + hr * 0.62);
    ctx.bezierCurveTo(-hr * 1.05, hy + hr * 0.7, -hr * 0.95, hy - hr * 0.95, 0, hy - hr * 0.55);
    ctx.fill();
  }
  if (k === 'boar') {
    ctx.fillStyle = '#5a3416';
    ctx.beginPath();
    for (let q = 0; q < 5; q++) {
      const px = (q - 2) * hr * 0.16;
      ctx.moveTo(px - hr * 0.08, hy - hr * 0.88);
      ctx.lineTo(px, hy - hr * 1.18 - (q % 2) * hr * 0.08);
      ctx.lineTo(px + hr * 0.08, hy - hr * 0.88);
    }
    ctx.fill();
  }
  // 머리 빛
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, -hr * 0.35, hy - hr * 0.5, hr * 0.32, hr * 0.16, -0.4);
  ctx.fill();
  drawFace(ctx, k, r, L, hy);
  // ── 앞 장식 ──
  if (L.enemy && L.el < 3 && !fly && k !== 'bug') {
    // 상대: 속성 색 두건 (목에 맨 삼각 천)
    ctx.fillStyle = lin(ctx, 0, hy + hr * 0.75, 0, hy + hr * 1.5, [0, EL_COL[L.el]], [1, EL_DARK[L.el]]);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.7, hy + hr * 0.78);
    ctx.quadraticCurveTo(0, hy + hr * 0.98, hr * 0.7, hy + hr * 0.78);
    ctx.lineTo(0, hy + hr * 1.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (fly && L.el < 3) {
    ctx.fillStyle = EL_COL[L.el];
    ctx.beginPath();
    ctx.moveTo(-hr * 0.55, hy + hr * 0.7);
    ctx.quadraticCurveTo(0, hy + hr * 0.95, hr * 0.55, hy + hr * 0.7);
    ctx.lineTo(0, hy + hr * 1.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (!L.enemy && L.el < 3 && k !== 'bug') elIcon(ctx, L.el, 0, by + r * 0.08, r * 0.2);
  if (k === 'sling') {
    // 새총
    ctx.save();
    ctx.translate(r * 0.62, by - r * 0.15);
    ctx.rotate(-0.3 - (L.act ?? 0) * 0.4);
    ctx.strokeStyle = '#6a3a14';
    ctx.lineWidth = lw * 1.4;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.25);
    ctx.lineTo(0, -r * 0.05);
    ctx.lineTo(-r * 0.16, -r * 0.3);
    ctx.moveTo(0, -r * 0.05);
    ctx.lineTo(r * 0.16, -r * 0.3);
    ctx.stroke();
    ctx.strokeStyle = '#d0485a';
    ctx.lineWidth = lw * 0.7;
    ctx.beginPath();
    ctx.moveTo(-r * 0.16, -r * 0.3);
    ctx.lineTo(0, -r * 0.12 + (L.act ?? 0) * r * 0.2);
    ctx.lineTo(r * 0.16, -r * 0.3);
    ctx.stroke();
    ctx.restore();
  } else if (k === 'squirrel') {
    ctx.fillStyle = '#a0642a';
    ell(ctx, r * 0.05, by + r * 0.05, r * 0.17, r * 0.19);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6a3e14';
    ell(ctx, r * 0.05, by - r * 0.12, r * 0.19, r * 0.09);
    ctx.fill();
  } else if (k === 'sheep') {
    // 꽃 지팡이
    ctx.save();
    ctx.translate(r * 0.62, by);
    ctx.rotate(0.2 + (L.act ?? 0) * 0.6);
    ctx.strokeStyle = '#6a8a2a';
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.3);
    ctx.lineTo(0, -r * 0.5);
    ctx.stroke();
    ctx.fillStyle = '#ff8ab0';
    for (let q = 0; q < 5; q++) {
      const a = (q / 5) * TAU;
      ell(ctx, Math.cos(a) * r * 0.1, -r * 0.55 + Math.sin(a) * r * 0.1, r * 0.08, r * 0.08);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe14a';
    ell(ctx, 0, -r * 0.55, r * 0.06, r * 0.06);
    ctx.fill();
    ctx.restore();
  } else if (k === 'bear') {
    // 왕관
    ctx.fillStyle = lin(ctx, 0, hy - hr * 1.5, 0, hy - hr * 0.8, [0, '#fff3a0'], [1, '#f0a020']);
    ctx.strokeStyle = '#8a5a08';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.5, hy - hr * 0.8);
    ctx.lineTo(-hr * 0.55, hy - hr * 1.3);
    ctx.lineTo(-hr * 0.25, hy - hr * 1.05);
    ctx.lineTo(0, hy - hr * 1.45);
    ctx.lineTo(hr * 0.25, hy - hr * 1.05);
    ctx.lineTo(hr * 0.55, hy - hr * 1.3);
    ctx.lineTo(hr * 0.5, hy - hr * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4a6a';
    ell(ctx, 0, hy - hr * 1.0, hr * 0.08, hr * 0.08);
    ctx.fill();
  }
  // 맞은 순간: 하얗게 번쩍
  if (L.flash > 0.02) {
    ctx.globalAlpha = L.flash * 0.75;
    ctx.fillStyle = '#ffffff';
    ell(ctx, 0, hy, hr * 1.05, hr * 1.0);
    ctx.fill();
    ell(ctx, 0, by, r * 0.62, r * 0.58);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
/** 별 개수 딱지 (머리 위) */
function starBadge(ctx: C2, x: number, y: number, n: number, r: number) {
  for (let j = 0; j < n; j++) {
    const sx = x + (j - (n - 1) / 2) * r * 1.9;
    starPath(ctx, sx, y, r);
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = '#9a5a08';
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.stroke();
  }
}

// ── 배경 (크기별로 한 번 그려 둔다) ──
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
const SHOP_TOP = 0.925;
function getBg(w: number, h: number, sc: number): HTMLCanvasElement {
  const key = `${w}x${h}@${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const R = (v: number) => v * w;
  const c = layer(w, h, sc, (g) => {
    // 하늘
    g.fillStyle = lin(g, 0, 0, 0, R(0.22), [0, '#6ec9ff'], [0.6, '#b8e9ff'], [1, '#fff4cf']);
    g.fillRect(0, 0, w, R(0.23));
    g.fillStyle = radg(g, R(0.86), R(0.06), 0, R(0.6), [0, 'rgba(255,250,210,.9)'], [0.3, 'rgba(255,245,200,.35)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, R(0.3));
    // 구름
    for (let i = 0; i < 4; i++) {
      const cx = R(0.1 + i * 0.27 + hsh(i) * 0.08), cy = R(0.105 + hsh(i + 3) * 0.04), cw = R(0.12 + hsh(i + 5) * 0.06);
      g.fillStyle = 'rgba(255,255,255,.92)';
      g.beginPath();
      for (const [dx, dy, q] of [[-0.5, 0.1, 0.4], [0, -0.15, 0.55], [0.5, 0.1, 0.42], [0.2, 0.15, 0.4]]) {
        g.moveTo(cx + dx * cw + q * cw, cy + dy * cw);
        g.arc(cx + dx * cw, cy + dy * cw, q * cw, 0, TAU);
      }
      g.fill();
    }
    // 먼 언덕 두 겹 + 나무
    for (const [yy, col, amp, ph] of [[0.175, '#a8de7c', 0.02, 1], [0.198, '#8cd062', 0.012, 4]] as [number, string, number, number][]) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, R(0.25));
      for (let x = 0; x <= 1.001; x += 0.02) g.lineTo(R(x), R(yy - amp * Math.sin(x * 7 + ph) - amp * 0.6 * Math.sin(x * 13 + ph * 2)));
      g.lineTo(w, R(0.25));
      g.closePath();
      g.fill();
    }
    for (let i = 0; i < 9; i++) {
      const tx = R(0.03 + i * 0.12 + hsh(i + 20) * 0.05), ty = R(0.19 + hsh(i + 21) * 0.01), tr = R(0.028 + hsh(i + 22) * 0.02);
      g.fillStyle = '#7a5030';
      g.fillRect(tx - tr * 0.12, ty - tr * 0.4, tr * 0.24, tr * 0.6);
      g.fillStyle = i % 3 ? '#5cb048' : '#6cc04e';
      g.beginPath();
      g.arc(tx, ty - tr * 0.9, tr, 0, TAU);
      g.arc(tx - tr * 0.6, ty - tr * 0.55, tr * 0.7, 0, TAU);
      g.arc(tx + tr * 0.6, ty - tr * 0.55, tr * 0.7, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,220,.35)';
      g.beginPath();
      g.arc(tx - tr * 0.3, ty - tr * 1.2, tr * 0.4, 0, TAU);
      g.fill();
    }
    // 아레나 바닥: 연둣빛 잔디 + 깎은 줄무늬
    const gy0 = R(0.2), gy1 = R(SHOP_TOP + 0.02);
    g.fillStyle = lin(g, 0, gy0, 0, gy1, [0, '#a6e070'], [0.5, '#8fd65c'], [1, '#78c64a']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    for (let i = 0; i < 12; i++) {
      const u0 = i / 12, u1 = (i + 0.5) / 12, y0 = gy0 + (gy1 - gy0) * u0 ** 1.15, y1 = gy0 + (gy1 - gy0) * u1 ** 1.15;
      g.fillStyle = 'rgba(255,255,230,.09)';
      g.fillRect(0, y0, w, y1 - y0);
    }
    // 햇빛 웅덩이
    g.fillStyle = radg(g, R(0.55), R(0.5), 0, R(0.62), [0, 'rgba(255,255,210,.32)'], [1, 'rgba(255,255,210,0)']);
    g.fillRect(0, gy0, w, gy1 - gy0);
    // 아레나 원 (분필) + 가운데 줄
    g.strokeStyle = 'rgba(255,255,255,.55)';
    g.lineWidth = R(0.008);
    g.beginPath();
    g.ellipse(R(0.5), R(MID_Y), R(0.44), R(0.36), 0, 0, TAU);
    g.stroke();
    g.beginPath();
    g.moveTo(R(0.06), R(MID_Y));
    g.lineTo(R(0.94), R(MID_Y));
    g.stroke();
    g.beginPath();
    g.ellipse(R(0.5), R(MID_Y), R(0.09), R(0.05), 0, 0, TAU);
    g.stroke();
    // 풀포기 · 꽃
    for (let i = 0; i < 70; i++) {
      const x = hsh(i + 40) * w, yu = hsh(i + 41), y = gy0 + (gy1 - gy0) * yu;
      const inArena = ((x - R(0.5)) / R(0.44)) ** 2 + ((y - R(MID_Y)) / R(0.36)) ** 2 < 1;
      if (inArena && i % 3) continue;
      const s2 = R(0.008 + yu * 0.01);
      g.strokeStyle = 'rgba(60,140,40,.55)';
      g.lineWidth = Math.max(1, s2 * 0.35);
      g.beginPath();
      for (const d of [-1, 0, 1]) {
        g.moveTo(x + d * s2 * 0.4, y);
        g.lineTo(x + d * s2 * 0.9, y - s2 * (1.4 - Math.abs(d) * 0.4));
      }
      g.stroke();
      if (i % 5 === 0 && !inArena) {
        g.fillStyle = ['#ffffff', '#ffe14a', '#ff9ac0', '#bfa8ff'][i % 4];
        for (let q = 0; q < 5; q++) {
          const a = (q / 5) * TAU;
          g.beginPath();
          g.arc(x + Math.cos(a) * s2 * 0.5, y - s2 * 1.5 + Math.sin(a) * s2 * 0.5, s2 * 0.4, 0, TAU);
          g.fill();
        }
        g.fillStyle = '#ffb02a';
        g.beginPath();
        g.arc(x, y - s2 * 1.5, s2 * 0.32, 0, TAU);
        g.fill();
      }
    }
    // 양옆 덤불
    for (const [bx, byy, br] of [[-0.02, 0.62, 0.09], [1.02, 0.6, 0.085], [-0.03, 0.86, 0.1], [1.03, 0.88, 0.1], [0.0, 0.35, 0.06], [1.0, 0.34, 0.06]]) {
      g.fillStyle = 'rgba(40,90,30,.25)';
      g.beginPath();
      g.ellipse(R(bx), R(byy + br * 0.5), R(br * 1.2), R(br * 0.35), 0, 0, TAU);
      g.fill();
      g.fillStyle = '#4fa63e';
      g.beginPath();
      for (const [dx, dy, q] of [[-0.5, 0.1, 0.6], [0.4, 0.05, 0.65], [0, -0.35, 0.7]]) {
        g.moveTo(R(bx + dx * br) + R(q * br), R(byy + dy * br));
        g.arc(R(bx + dx * br), R(byy + dy * br), R(q * br), 0, TAU);
      }
      g.fill();
      g.fillStyle = 'rgba(200,255,150,.35)';
      g.beginPath();
      g.arc(R(bx - 0.2 * br), R(byy - 0.55 * br), R(0.3 * br), 0, TAU);
      g.fill();
      g.fillStyle = '#ff5a6a';
      for (let q = 0; q < 3; q++) {
        g.beginPath();
        g.arc(R(bx + (hsh(q + bx * 10) - 0.5) * br), R(byy + (hsh(q + 9 + byy * 10) - 0.6) * br), R(0.012), 0, TAU);
        g.fill();
      }
    }
    // 나무 울타리 (위쪽, 구경꾼 새가 앉는 곳)
    const fy = R(0.205);
    for (let i = 0; i <= 10; i++) {
      const px = R(-0.02 + i * 0.104);
      g.fillStyle = 'rgba(60,40,20,.2)';
      g.fillRect(px - R(0.012), fy + R(0.004), R(0.03), R(0.012));
      g.fillStyle = lin(g, px - R(0.012), 0, px + R(0.012), 0, [0, '#e0a868'], [1, '#b0703a']);
      rr(g, px - R(0.012), fy - R(0.06), R(0.024), R(0.064), R(0.006));
      g.fill();
      g.strokeStyle = '#6a3e18';
      g.lineWidth = Math.max(1, R(0.004));
      g.stroke();
    }
    for (const ry of [-0.048, -0.022]) {
      g.fillStyle = lin(g, 0, fy + R(ry), 0, fy + R(ry + 0.014), [0, '#f0bd7e'], [1, '#c08048']);
      g.fillRect(0, fy + R(ry), w, R(0.014));
      g.strokeStyle = '#6a3e18';
      g.lineWidth = Math.max(1, R(0.003));
      g.strokeRect(-2, fy + R(ry), w + 4, R(0.014));
    }
    // 가게: 나무 판대
    const st = R(SHOP_TOP);
    g.fillStyle = 'rgba(60,30,10,.28)';
    g.fillRect(0, st - R(0.012), w, R(0.014));
    g.fillStyle = lin(g, 0, st, 0, h, [0, '#e9b072'], [0.08, '#d89656'], [1, '#b8723a']);
    rr(g, 0, st, w, h - st + 6, R(0.03));
    g.fill();
    g.strokeStyle = 'rgba(110,60,20,.35)';
    g.lineWidth = Math.max(1, R(0.004));
    for (let i = 1; i < 6; i++) {
      g.beginPath();
      g.moveTo(R(i / 6 + (hsh(i) - 0.5) * 0.02), st + R(0.03));
      g.lineTo(R(i / 6 + (hsh(i) - 0.5) * 0.02), h);
      g.stroke();
    }
    for (let i = 0; i < 26; i++) {
      const x = hsh(i + 60) * w, y = st + R(0.05) + hsh(i + 61) * (h - st - R(0.05));
      g.strokeStyle = 'rgba(120,70,30,.18)';
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + R(0.03), y - R(0.006), x + R(0.07), y);
      g.stroke();
    }
    g.fillStyle = 'rgba(255,240,200,.55)';
    rr(g, R(0.02), st + R(0.006), w - R(0.04), R(0.008), R(0.004));
    g.fill();
  });
  BG.set(key, c);
  return c;
}

// ── 연출 기억 (상태와 무관) ──
interface Vis { flog: number; fight: Fight | null; ev: number; disp: Map<number, number>; died: Map<number, number>; cheer: number; sad: number; landed: Map<number, number>; pred: Pred | null; predKey: string; meter: number; ghosts: { k: Kind; star: number; x0: number; y0: number; x1: number; y1: number; t0: number; T: number; kind: string; el: number }[] }
const VIS = new WeakMap<object, Vis>();
const visOf = (s: PetState): Vis => {
  let v = VIS.get(s);
  if (!v) VIS.set(s, (v = { flog: 0, fight: null, ev: -1, disp: new Map(), died: new Map(), cheer: -999, sad: -999, landed: new Map(), pred: null, predKey: '', meter: 0.5, ghosts: [] }));
  return v;
};
const ROW_SC_MY = [1.0, 1.08], ROW_SC_EN = [0.9, 0.84];
const STAR_SC = [1, 1, 1.24, 1.46];
const BASE_R = 0.066;
/** 전투 중인 동물의 자리 (가로 폭 단위): 발 밑 x, y, 공중 높이 */
function homeOf(f: Fight, u: FU, vis: Vis, id: number): [number, number, number] {
  if (u.side === 0) {
    const fr = frontRow(f, 0);
    const ty = u.row === 1 && fr === 1 ? MY_Y[0] + 0.03 : MY_Y[u.row];
    const cur = vis.disp.get(id) ?? MY_Y[u.row];
    const ny = cur + (ty - cur) * 0.12;
    vis.disp.set(id, ny);
    return [COLX[u.col], ny, 0];
  }
  if (u.role === 3) return [COLX[u.col], EN_Y[1] + 0.03, 0.075];
  if (u.role === 4) return [0.5, EN_Y[0], 0];
  const fr = frontRow(f, 1);
  const ty = u.row === 1 && fr === 1 ? EN_Y[0] - 0.02 : EN_Y[u.row];
  const cur = vis.disp.get(id) ?? EN_Y[u.row];
  const ny = cur + (ty - cur) * 0.12;
  vis.disp.set(id, ny);
  return [COLX[u.col], ny, 0];
}
const sizeOf = (k: Kind, star: number, side: number, row: number) => BASE_R * STAR_SC[star] * (k === 'bear' ? 1.75 : k === 'bug' ? 1.3 : 1) * (side ? ROW_SC_EN[Math.min(1, row)] : ROW_SC_MY[row]);

interface Actor { k: Kind; star: number; el: number; enemy: boolean; x: number; y: number; alt: number; r: number; L: Look; hp: number; max: number; showHp: boolean; alpha: number; sel: boolean; glow: number; say: string; sayT: number; dead: boolean }

function drawAll(ctx: C2, s: PetState, w: number, h: number, th: Theme) {
  void th;
  const fx = juice(s), vis = visOf(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], t = s.t, f = s.fight;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const shop = s.phase === 'shop';
  const rot = s.rots[s.stage];
  // 미리 보기 (같은 시뮬레이션) — 군단이 바뀔 때만 다시 잰다
  const pk = `${s.stage}|${s.board.map((p) => (p ? p.k + p.star : '-')).join(',')}`;
  if (pk !== vis.predKey) (vis.predKey = pk), (vis.pred = predict(s.board, s.stage, rot)), (fx.memo.predT = t);
  const pred = vis.pred!;
  vis.meter += ((shop ? pred.p : f ? fightMeter(f) : vis.meter) - vis.meter) * 0.12;

  // ── 사건 → 연출 ──
  for (const e of s.events) {
    if (e.t <= vis.ev || t - e.t > 12) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'land': {
        const p = s.board.find((q) => q && q.land === e.t);
        if (p) vis.ghosts.push({ k: p.k, star: 1, x0: CARD_X[e.n ?? 1], y0: CARD_Y, x1: e.x, y1: e.y, t0: e.t, T: 12, kind: 'fly', el: K[p.k].el });
        break;
      }
      case 'mergeFrom': {
        const p = s.board[e.n ?? 0];
        if (p) vis.ghosts.push({ k: p.k, star: 1, x0: e.x, y0: e.y, x1: slotXY(e.n ?? 0)[0], y1: slotXY(e.n ?? 0)[1], t0: e.t, T: 14, kind: 'merge', el: K[p.k].el });
        break;
      }
      case 'merge': {
        const p = s.board.find((q) => q && q.mergeT === e.t);
        if (p) vis.ghosts.push({ k: p.k, star: 1, x0: CARD_X[p.from] ?? 0.5, y0: CARD_Y, x1: e.x, y1: e.y, t0: e.t, T: 12, kind: 'merge', el: K[p.k].el });
        break;
      }
      case 'sell':
        fx.pop(ex, ey - R(0.12), `+${e.n} 금화`, '#ffe14a', Math.max(14, R(0.05)));
        fx.burst(ex, ey - R(0.05), '#ffd23a', 14, 3, 2.5);
        vis.ghosts.push({ k: e.text as Kind, star: 1, x0: e.x, y0: e.y, x1: e.x < 0.5 ? -0.2 : 1.2, y1: e.y + 0.05, t0: e.t, T: 40, kind: 'bye', el: K[e.text as Kind].el });
        break;
      case 'nobuy':
        fx.pop(ex, ey - R(0.06), e.text || '못 사요', '#ffffff', Math.max(13, R(0.04)));
        break;
      case 'reroll':
        fx.burst(X(0.5), Y(CARD_Y), '#9ad8ff', 22, 4, 2.6);
        fx.pop(X(0.5), Y(CARD_Y - 0.17), '새 카드!', '#bfe8ff', Math.max(14, R(0.045)));
        break;
      case 'charge':
        fx.kick(6);
        fx.pop(X(0.5), Y(MID_Y), '돌격!', '#ffe14a', Math.max(20, R(0.085)));
        vis.cheer = t;
        break;
      case 'clear':
        vis.cheer = t;
        for (let q = 0; q < 5; q++) fx.burst(X(0.15 + q * 0.175), Y(0.35 + (q % 2) * 0.1), ['#ff6a8a', '#ffd23a', '#5ad0ff', '#7ae06a', '#c08aff'][q], 16, 4.5, 3);
        break;
      case 'fail':
        vis.sad = t;
        fx.kick(5);
        break;
      case 'empty':
        fx.pop(ex, ey - R(0.08), '동물을 먼저 사요', '#ffffff', Math.max(13, R(0.042)));
        break;
      case 'pick':
        fx.ring(ex, ey - R(0.05), '#ffffff', R(0.09), 3);
        break;
      case 'swap':
        fx.burst(ex, ey - R(0.04), '#ffffff', 10, 3, 2);
        break;
      case 'big':
        fx.kick(9);
        break;
    }
  }
  vis.ev = Math.max(vis.ev, ...s.events.map((e) => e.t), vis.ev);
  vis.ghosts = vis.ghosts.filter((g) => t - g.t0 < g.T + 2);

  ctx.drawImage(getBg(Math.round(w), Math.round(h), Math.min(3, Math.max(1, Math.round(sc)))), 0, 0, w, h);
  ctx.save();
  fx.begin(ctx);
  drawSkyLife(ctx, s, vis, w, t);

  // ── 칸 받침 ──
  const nSlots = slotsOf(s.stage), spotBack = s.spot?.label === '뒷줄';
  for (let i = 0; i < 6; i++) {
    const [sx, sy] = slotXY(i), on = i < nSlots;
    if (!on && !(f && s.board[i])) {
      if (i >= 3 && s.stage < 2) continue;
    }
    const sel = s.sel === i, tgt = s.sel >= 0 && s.sel !== i && shop;
    const rx = R(0.118 * (i < 3 ? 1 : 1.06)), ry = R(0.04), px = X(sx), py = Y(sy), th = R(0.014), used = !!s.board[i] || sel;
    // 돌 받침: 옆면(두께) + 윗면
    ctx.fillStyle = 'rgba(40,80,20,.22)';
    ell(ctx, px, py + th + R(0.006), rx * 1.04, ry * 1.05);
    ctx.fill();
    if (used || i < nSlots) {
      ctx.fillStyle = lin(ctx, px - rx, 0, px + rx, 0, [0, '#8aa0b8'], [0.5, '#b8c8da'], [1, '#7a8ea8']);
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI);
      ctx.lineTo(px - rx, py + th);
      ctx.ellipse(px, py + th, rx, ry, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, py - ry, 0, py + ry, [0, sel ? '#fff6b0' : '#f2f7ff'], [1, sel ? '#ffd860' : '#c8d8ec']);
      ell(ctx, px, py, rx, ry);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ell(ctx, px - rx * 0.25, py - ry * 0.35, rx * 0.45, ry * 0.3);
      ctx.fill();
    }
    ctx.strokeStyle = sel ? '#ffb020' : spotBack && i >= 3 ? `rgba(255,200,40,${0.6 + 0.4 * Math.sin(t * 0.2)})` : '#3d7fd0';
    ctx.lineWidth = sel ? 3 : 2;
    ctx.setLineDash(used ? [] : [5, 4]);
    ell(ctx, px, py, rx * 0.9, ry * 0.82);
    ctx.stroke();
    ctx.setLineDash([]);
    if (tgt && Math.floor(t / 20) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,190,40,.8)';
      ctx.beginPath();
      ctx.moveTo(X(sx), Y(sy) - R(0.012));
      ctx.lineTo(X(sx) - R(0.02), Y(sy) - R(0.034));
      ctx.lineTo(X(sx) + R(0.02), Y(sy) - R(0.034));
      ctx.closePath();
      ctx.fill();
    }
  }
  // 상대 받침 (붉은 테)
  for (const fo of d.foes) {
    if (fo.k === 'bat' || fo.k === 'bear') continue;
    const ex = X(COLX[fo.col]), ey = Y(EN_Y[fo.row]), rx = R(0.105 * ROW_SC_EN[fo.row]), ry = R(0.034 * ROW_SC_EN[fo.row]), th = R(0.012 * ROW_SC_EN[fo.row]);
    ctx.fillStyle = 'rgba(40,80,20,.2)';
    ell(ctx, ex, ey + th + R(0.005), rx * 1.04, ry * 1.05);
    ctx.fill();
    ctx.fillStyle = lin(ctx, ex - rx, 0, ex + rx, 0, [0, '#b07a6a'], [0.5, '#d8a898'], [1, '#a06a5a']);
    ctx.beginPath();
    ctx.ellipse(ex, ey, rx, ry, 0, 0, Math.PI);
    ctx.lineTo(ex - rx, ey + th);
    ctx.ellipse(ex, ey + th, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, ey - ry, 0, ey + ry, [0, '#fff0ea'], [1, '#f0c8bc']);
    ell(ctx, ex, ey, rx, ry);
    ctx.fill();
    ctx.strokeStyle = '#d0503a';
    ctx.lineWidth = 2;
    ell(ctx, ex, ey, rx * 0.88, ry * 0.8);
    ctx.stroke();
  }
  // 깃발 (내 편 파랑 · 상대 빨강)
  drawFlag(ctx, X(0.035), Y(0.9), R(0.1), '#3d8df5', t);
  drawFlag(ctx, X(0.965), Y(0.47), R(0.085), '#ff5a3a', t + 40);

  // 나비 둘 (구경꾼)
  for (let i = 0; i < 2; i++) {
    const u = t * 0.006 + i * 3.1, bx = X(0.5 + 0.42 * Math.sin(u * (1 + i * 0.3)) * (i ? -1 : 1)), by = Y(0.6 + 0.2 * Math.sin(u * 1.7 + i) + 0.03 * Math.sin(t * 0.07 + i));
    const fl = Math.abs(Math.sin(t * 0.35 + i * 2)), k = R(0.016);
    ctx.fillStyle = i ? '#ffb0d8' : '#fff27a';
    ctx.strokeStyle = 'rgba(80,40,20,.6)';
    ctx.lineWidth = 1;
    for (const sd of [-1, 1]) {
      ell(ctx, bx + sd * k * 0.7 * (0.3 + fl), by - k * 0.2, k * 0.7 * (0.3 + fl), k * 0.75);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#5a3a1a';
    ell(ctx, bx, by, k * 0.18, k * 0.6);
    ctx.fill();
  }
  // ── 힘 겨루기 막대 (지금 싸우면) ──
  drawMeter(ctx, s, vis, pred, X, Y, R, font, w);

  // ── 동물 ──
  const actors: Actor[] = [];
  if (f) {
    f.u.forEach((u, i) => {
      const id = u.side ? -1 - i : u.pid;
      const [hx, hy0, alt0] = homeOf(f, u, vis, id);
      let x = hx, y = hy0, alt = alt0, tilt = 0, sq = 0, alpha = 1, face: Face = u.side ? 'angry' : 'idle';
      const r = R(sizeOf(u.k, u.star, u.side, u.row));
      const since = f.t - u.hitT;
      if (u.act && !u.dead && !f.done) {
        const tg = f.u[u.tgt];
        if (tg && (u.role === 0 || u.role === 3)) {
          const [tx, ty0, ta] = homeOf(f, tg, vis, tg.side ? -1 - u.tgt : tg.pid);
          const ty = ty0 + (u.side ? -0.03 : 0.03), hit = u.role === 0 ? MELEE_HIT : SWOOP_HIT, T = u.role === 0 ? MELEE_T : SWOOP_T;
          const reach = u.role === 3 ? 0.9 : 0.72;
          const k2 = u.at <= hit ? ease(u.at / hit) * reach : reach * (1 - ease((u.at - hit) / (T - hit)));
          x = hx + (tx - hx) * k2;
          y = hy0 + (ty - hy0) * k2;
          alt = alt0 + (ta - alt0) * k2 + (u.role === 0 ? Math.sin(Math.PI * Math.min(1, u.at / hit)) * 0.03 : 0);
          tilt = (u.side ? -1 : 1) * (tx - hx) * 1.2 * (u.at <= hit ? 1 : 0.3);
          sq = u.at === hit || u.at === hit + 1 ? 0.18 : 0;
          face = 'roar';
        } else if (u.role === 4) {
          alt = u.at < STOMP_HIT ? Math.sin((u.at / STOMP_HIT) * Math.PI * 0.5) * 0.08 * (u.at > 8 ? 1 : 0) : Math.max(0, 0.08 * (1 - (u.at - STOMP_HIT) / 3));
          if (u.at >= STOMP_HIT) alt = 0;
          sq = u.at < 8 ? (u.at / 8) * 0.15 : u.at >= STOMP_HIT && u.at < STOMP_HIT + 6 ? 0.22 : 0;
          face = 'roar';
        } else if (u.role === 1 || u.role === 2) {
          sq = u.at < SHOT_WIND ? -0.08 * (u.at / SHOT_WIND) : 0.06;
          face = u.role === 2 ? 'happy' : 'angry';
        }
      }
      if (!u.dead && since < 14) {
        const a = f.u[u.hitBy];
        if (a) {
          const [ax, ay] = homeOf(f, a, vis, a.side ? -1 - u.hitBy : a.pid);
          const dx = hx - ax, dy = hy0 - ay, L2 = Math.hypot(dx, dy) || 1, k3 = (1 - since / 14) * 0.03;
          x += (dx / L2) * k3;
          y += (dy / L2) * k3;
        }
        face = 'hit';
        tilt += Math.sin(since * 1.3) * 0.12 * (1 - since / 14);
      }
      if (u.dead) {
        if (!vis.died.has(id)) vis.died.set(id, t - Math.min(8, f.t - u.deadT));
        const dt = t - vis.died.get(id)!, dir = u.col === 0 ? -1 : u.col === 2 ? 1 : u.side ? 1 : -1;
        if (dt > 60) return;
        x += dir * dt * 0.006;
        y += (u.side ? -1 : 1) * dt * 0.0015;
        alt = Math.abs(Math.sin(dt * 0.25)) * 0.04 * (1 - dt / 60) + alt0 * Math.max(0, 1 - dt / 12);
        tilt = dir * dt * 0.28;
        alpha = Math.max(0, 1 - dt / 60);
        face = 'ko';
      }
      if (f.done && !u.dead) {
        const won = (u.side === 0) === (f.done === 1);
        face = won ? 'happy' : 'dizzy';
        if (won) alt += Math.abs(Math.sin(t * 0.2 + i * 1.3)) * 0.035;
      }
      if (u.healT > 0 && f.t - u.healT < 20 && !u.dead) face = 'happy';
      actors.push({
        k: u.k, star: u.star, el: u.el, enemy: !!u.side, x, y, alt, r, alpha, sel: false, glow: 0, dead: u.dead,
        L: { el: u.el, star: u.star, enemy: !!u.side, face, t: t + (u.side ? 37 : 0), sq, tilt, flash: !u.dead && since < 8 ? 1 - since / 8 : 0, ph: i * 0.37, flap: t * 1.3 + i * 9, act: u.act && u.role !== 0 ? Math.min(1, u.at / SHOT_WIND) : 0 },
        hp: u.hp, max: u.max, showHp: !u.dead, say: '', sayT: -999,
      });
    });
  } else {
    // 가게: 내 군단 + 상대 미리 보기
    s.board.forEach((p, i) => {
      if (!p) return;
      const [sx, sy] = slotXY(i), r = R(sizeOf(p.k, p.star, 0, i < 3 ? 0 : 1));
      const la = t - p.land, ma = t - p.mergeT;
      let x = sx, y = sy, alt = 0, sq = 0, scale = 1, face: Face = 'idle';
      if (la < 12 && p.mergeT !== p.land) {
        // 카드에서 날아와 쿵
        const u2 = la / 12, x0 = CARD_X[p.from] ?? sx;
        x = x0 + (sx - x0) * u2;
        y = CARD_Y + (sy - CARD_Y) * u2;
        alt = Math.sin(Math.PI * u2) * 0.16;
        scale = 0.7 + 0.3 * u2;
      } else if (la < 30 && p.mergeT !== p.land) {
        const u2 = (la - 12) / 18;
        sq = Math.sin(u2 * Math.PI * 2.5) * 0.22 * (1 - u2);
        face = 'roar';
      }
      if (ma < 14) scale = 0;
      else if (ma < 40) {
        const u2 = (ma - 14) / 26;
        scale = u2 < 0.3 ? 0.5 + (u2 / 0.3) * 0.8 : 1.3 - 0.3 * ((u2 - 0.3) / 0.7);
        face = 'roar';
      } else if (ma < 70) face = 'happy';
      if (la >= 12 && vis.landed.get(p.id) !== p.land && p.mergeT !== p.land && la < 40) {
        vis.landed.set(p.id, p.land);
        fx.kick(4);
        fx.ring(X(sx), Y(sy), 'rgba(255,255,255,.9)', R(0.12), 4);
        fx.burst(X(sx), Y(sy), '#e8d8a8', 14, 3, 2.6);
      }
      if (ma >= 14 && vis.landed.get(-p.id) !== p.mergeT && ma < 40) {
        vis.landed.set(-p.id, p.mergeT);
        fx.kick(p.star >= 3 ? 16 : 10);
        fx.blink('#fff6c0', p.star >= 3 ? 0.55 : 0.35);
        fx.ring(X(sx), Y(sy) - R(0.06), '#ffe14a', R(0.22), 6);
        fx.ring(X(sx), Y(sy) - R(0.06), '#ffffff', R(0.15), 4);
        fx.burst(X(sx), Y(sy) - R(0.08), '#ffe14a', 30, 6, 3.4);
        fx.burst(X(sx), Y(sy) - R(0.08), EL_COL[K[p.k].el], 18, 5, 3);
        vis.cheer = t;
      }
      const sel = s.sel === i;
      if (sel) (alt = 0.02 + Math.abs(Math.sin(t * 0.18)) * 0.025), (face = 'happy');
      const happy = s.phase === 'result' && s.ok;
      if (happy) (alt = Math.abs(Math.sin(t * 0.2 + i)) * 0.04), (face = 'happy');
      else if (s.phase === 'result') face = 'dizzy';
      if (scale <= 0) return;
      actors.push({
        k: p.k, star: p.star, el: K[p.k].el, enemy: false, x, y, alt, r: r * scale, alpha: 1, sel, glow: ma < 70 ? 1 - ma / 70 : 0, dead: false,
        L: { el: K[p.k].el, star: p.star, enemy: false, face, t, sq, tilt: 0, flash: 0, ph: i * 0.61 + p.id * 0.13 },
        hp: 1, max: 1, showHp: false, say: s.say && s.say.slot === i && t - s.say.t < 70 ? s.say.text : '', sayT: s.say?.t ?? -999,
      });
    });
    d.foes.forEach((fo, i) => {
      const fu = unit(1, fo.k, fo.star, foeEl(rot, fo), fo.row, fo.col, -1, -1, d.mult, 0);
      const [hx, hy, alt] = fo.k === 'bat' ? [COLX[fo.col], EN_Y[1] + 0.03, 0.075 + Math.sin(t * 0.08 + i) * 0.01] : fo.k === 'bear' ? [0.5, EN_Y[0], 0] : [COLX[fo.col], EN_Y[fo.row], 0];
      actors.push({
        k: fo.k, star: fo.star, el: fu.el, enemy: true, x: hx, y: hy, alt, r: R(sizeOf(fo.k, fo.star, 1, fo.row)), alpha: 1, sel: false, glow: 0, dead: false,
        L: { el: fu.el, star: fo.star, enemy: true, face: s.phase === 'result' && !s.ok ? 'happy' : 'angry', t: t + i * 23, sq: Math.max(0, Math.sin(t * 0.09 + i * 1.7)) * 0.05, tilt: Math.sin(t * 0.05 + i) * 0.04, flash: 0, ph: i * 0.4, flap: t * 1.3 + i * 9 },
        hp: fu.hp, max: fu.max, showHp: false, say: '', sayT: -999,
      });
    });
  }
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    const ax = X(a.x), ay = Y(a.y), lift = R(a.alt);
    ctx.globalAlpha = a.alpha;
    // 바닥 그림자
    ctx.fillStyle = 'rgba(40,70,20,.28)';
    ell(ctx, ax, ay + R(0.004), a.r * (0.75 - Math.min(0.3, a.alt * 2)), a.r * 0.22);
    ctx.fill();
    if (a.glow > 0) {
      // 합체 빛기둥
      ctx.save();
      ctx.globalAlpha = a.glow * a.alpha;
      ctx.fillStyle = lin(ctx, ax - a.r, 0, ax + a.r, 0, [0, 'rgba(255,240,140,0)'], [0.5, 'rgba(255,250,200,.95)'], [1, 'rgba(255,240,140,0)']);
      ctx.fillRect(ax - a.r * 1.1, ay - R(1), a.r * 2.2, R(1) + a.r * 0.2);
      ctx.fillStyle = radg(ctx, ax, ay - a.r * 1.2, 0, a.r * 2.4, [0, 'rgba(255,255,210,.9)'], [1, 'rgba(255,240,150,0)']);
      ell(ctx, ax, ay - a.r * 1.2, a.r * 2.4, a.r * 2.4);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = a.alpha;
    }
    if (a.sel) {
      ctx.strokeStyle = `rgba(255,200,40,${0.7 + 0.3 * Math.sin(t * 0.25)})`;
      ctx.lineWidth = 3;
      ell(ctx, ax, ay, a.r * 1.1, a.r * 0.36);
      ctx.stroke();
    }
    if (a.star >= 2 && !a.dead) {
      ctx.fillStyle = radg(ctx, ax, ay - a.r * 1.1 - lift, a.r * 0.2, a.r * 1.9, [0, a.star >= 3 ? 'rgba(255,240,120,.55)' : 'rgba(255,250,200,.35)'], [1, 'rgba(255,250,200,0)']);
      ell(ctx, ax, ay - a.r * 1.1 - lift, a.r * 1.9, a.r * 1.9);
      ctx.fill();
    }
    drawPet(ctx, a.k, ax, ay - lift, a.r, a.L);
    if (!a.enemy && a.star >= 1 && !a.dead) starBadge(ctx, ax, ay - lift - a.r * 2.3, a.star, Math.max(4, a.r * 0.16));
    if (a.enemy && a.el < 3 && !a.dead) elIcon(ctx, a.el, ax + a.r * 0.75, ay - lift - a.r * 2.05, Math.max(5, a.r * 0.24));
    if (a.showHp) {
      const bw = a.r * 1.5, bh = Math.max(4, a.r * 0.14), bx = ax - bw / 2, by2 = ay - lift - a.r * (a.k === 'bug' ? 1.45 : 2.25) - (a.enemy ? 0 : a.r * 0.32);
      const fr = clamp(a.hp / a.max, 0, 1);
      ctx.fillStyle = 'rgba(40,20,10,.55)';
      rr(ctx, bx - 1, by2 - 1, bw + 2, bh + 2, bh);
      ctx.fill();
      ctx.fillStyle = fr > 0.5 ? '#5ad84a' : fr > 0.25 ? '#ffc93a' : '#ff5a4a';
      rr(ctx, bx, by2, bw * fr, bh, bh / 2);
      ctx.fill();
    }
    if (a.say) {
      const age = t - a.sayT, sc2 = age < 6 ? 0.6 + age * 0.08 : 1;
      font(0.042, 900);
      const tw = ctx.measureText(a.say).width;
      const bx = clamp(ax, tw / 2 + R(0.04), w - tw / 2 - R(0.04)), by2 = ay - lift - a.r * 2.75;
      ctx.save();
      ctx.translate(bx, by2);
      ctx.scale(sc2, sc2);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      rr(ctx, -tw / 2 - R(0.02), -R(0.028), tw + R(0.04), R(0.056), R(0.025));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c0401a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(a.say, 0, R(0.002));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  // 합체·팔기 유령
  for (const g of vis.ghosts) {
    const u2 = clamp((t - g.t0) / g.T, 0, 1);
    if (g.kind === 'fly') continue;
    const x = g.x0 + (g.x1 - g.x0) * ease(u2), y = g.y0 + (g.y1 - g.y0) * ease(u2), alt = g.kind === 'bye' ? Math.abs(Math.sin(u2 * 12)) * 0.02 : Math.sin(Math.PI * u2) * 0.12;
    ctx.globalAlpha = g.kind === 'bye' ? 1 - u2 : 1;
    drawPet(ctx, g.k, X(x), Y(y) - R(alt), R(BASE_R) * (g.kind === 'merge' ? 1 - u2 * 0.4 : 1), { el: g.el, star: 1, enemy: false, face: g.kind === 'bye' ? 'happy' : 'roar', t, sq: 0, tilt: g.kind === 'bye' ? Math.sin(t * 0.5) * 0.15 : u2 * 3, flash: g.kind === 'merge' ? u2 * 0.8 : 0, ph: 0 });
    ctx.globalAlpha = 1;
    if (g.kind === 'merge' && t - g.t0 < g.T) fx.burst(X(x), Y(y) - R(alt) - R(0.05), '#fff3a0', 1, 1, 2);
  }
  // 날아가는 것 (화살·불씨·당근·치료)
  if (f) drawShots(ctx, f, vis, X, Y, R, t);
  // 전투 사건 → 연출
  if (f) fightFx(s, f, vis, fx, X, Y, R);

  // ── 큰 순간 띠 ──
  if (t - s.bigT < 60) {
    const age = t - s.bigT, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (60 - age) / 16);
    const size = Math.min(36, R(0.09));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(X(0.5), Y(clamp(s.bigY, 0.42, 0.62)));
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(s.bigText).width, rx = tw / 2 + 20, ry = size * 0.85;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 22; i++) {
      const an = (i / 22) * TAU, q = i % 2 ? 0.85 : 1.1;
      i ? ctx.lineTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q) : ctx.moveTo(Math.cos(an) * rx * q, Math.sin(an) * ry * q);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText(s.bigText, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6a0'], [0.5, '#ffd23a'], [1, '#ff8a3a']);
    ctx.fillText(s.bigText, 0, 2);
    ctx.restore();
  }
  ctx.restore();

  // ═════════════ 가게 ═════════════
  drawShop(ctx, s, vis, X, Y, R, font, w, h);
  // ═════════════ 위 띠 ═════════════
  drawTop(ctx, s, X, Y, R, font, w);
  // ═════════════ 판 띠 · 결과 · 스포트라이트 ═════════════
  drawCards(ctx, s, fx, X, Y, R, font, w);
}

/** 전투 중 막대: 남은 체력 비 */
function fightMeter(f: Fight) {
  let mh = 0, mm = 0, eh = 0, em = 0;
  for (const u of f.u) u.side ? ((eh += u.hp), (em += u.max)) : ((mh += u.hp), (mm += u.max));
  const a = mm ? mh / mm : 0, b = em ? eh / em : 0;
  return a + b > 0 ? 0.5 + 0.5 * (a - b) / Math.max(a, b, 0.01) : 0.5;
}
function drawFlag(ctx: C2, x: number, y: number, hgt: number, col: string, t: number) {
  ctx.strokeStyle = '#7a4a22';
  ctx.lineWidth = Math.max(2, hgt * 0.05);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - hgt);
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ell(ctx, x, y - hgt, hgt * 0.05, hgt * 0.05);
  ctx.fill();
  const fw = hgt * 0.5, wv = Math.sin(t * 0.12) * hgt * 0.05;
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(x, y - hgt * 0.95);
  ctx.quadraticCurveTo(x + fw * 0.5, y - hgt * 0.95 + wv, x + fw, y - hgt * 0.85);
  ctx.quadraticCurveTo(x + fw * 0.5, y - hgt * 0.72 - wv, x, y - hgt * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
}
/** 하늘의 해 · 깃발 줄 · 울타리 위 구경꾼 새 */
function drawSkyLife(ctx: C2, s: PetState, vis: Vis, w: number, t: number) {
  const R = (v: number) => v * w;
  // 해
  const sx = R(0.9), sy = R(0.118), sr = R(0.032);
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(t * 0.004);
  ctx.fillStyle = 'rgba(255,220,90,.55)';
  for (let i = 0; i < 10; i++) {
    ctx.rotate(TAU / 10);
    ctx.beginPath();
    ctx.moveTo(sr * 1.2, -sr * 0.18);
    ctx.lineTo(sr * 1.75, 0);
    ctx.lineTo(sr * 1.2, sr * 0.18);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = radg(ctx, sx - sr * 0.3, sy - sr * 0.3, 0, sr, [0, '#fff8c0'], [1, '#ffc93a']);
  ell(ctx, sx, sy, sr, sr);
  ctx.fill();
  // 깃발 줄 (울타리 위)
  const y0 = R(0.125);
  ctx.strokeStyle = 'rgba(90,60,30,.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = 0; x <= 1.001; x += 0.05) {
    const y = y0 + Math.sin(x * Math.PI) * R(0.025);
    x ? ctx.lineTo(R(x), y) : ctx.moveTo(R(x), y);
  }
  ctx.stroke();
  const cols = ['#ff5a5a', '#ffd23a', '#3d9df5', '#5ad04a', '#ff9ac0'];
  for (let i = 0; i < 16; i++) {
    const x = (i + 0.5) / 16, y = y0 + Math.sin(x * Math.PI) * R(0.025), sw = Math.sin(t * 0.08 + i) * R(0.004);
    ctx.fillStyle = cols[i % 5];
    ctx.beginPath();
    ctx.moveTo(R(x) - R(0.018), y);
    ctx.lineTo(R(x) + R(0.018), y);
    ctx.lineTo(R(x) + sw, y + R(0.035));
    ctx.closePath();
    ctx.fill();
  }
  // 구경꾼 새 (울타리 위)
  const cheer = t - vis.cheer < 70, sad = t - vis.sad < 90;
  const birds: [number, string, string][] = [[0.09, '#b07a4a', '#f6dcb0'], [0.27, '#ffd84a', '#fff2b0'], [0.48, '#5aa8f0', '#dff0ff'], [0.66, '#ff8a6a', '#ffe0d0'], [0.85, '#9a7ad8', '#efe6ff']];
  birds.forEach(([bx, col, bel], i) => {
    const hop = cheer ? Math.abs(Math.sin(t * 0.3 + i * 1.3)) * R(0.03) : Math.max(0, Math.sin(t * 0.05 + i * 2.1) - 0.85) * R(0.06);
    const x = R(bx), y = R(0.157) - hop, r = R(0.022);
    ctx.fillStyle = 'rgba(60,30,10,.2)';
    ell(ctx, x, R(0.159), r * 0.8, r * 0.2);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.4;
    ctx.fillStyle = col;
    ell(ctx, x, y - r * 0.8, r, r * 0.95);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = bel;
    ell(ctx, x, y - r * 0.55, r * 0.6, r * 0.55);
    ctx.fill();
    // 날개 (응원하면 퍼덕)
    ctx.fillStyle = col;
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(x + sd * r * 0.85, y - r * 0.8);
      ctx.rotate(sd * (cheer ? -0.9 + Math.sin(t * 0.6 + i) * 0.5 : 0.3));
      ell(ctx, 0, r * 0.3, r * 0.22, r * 0.45);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#2a1608';
    if (sad) {
      ctx.strokeStyle = '#2a1608';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sd * r * 0.45, y - r * 1.05);
        ctx.lineTo(x + sd * r * 0.2, y - r * 0.95);
        ctx.stroke();
      }
    } else
      for (const sd of [-1, 1]) {
        ell(ctx, x + sd * r * 0.32, y - r * 1.0, r * 0.12, r * 0.16);
        ctx.fill();
      }
    ctx.fillStyle = '#ffa12a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.15, y - r * 0.82);
    ctx.lineTo(x + r * 0.15, y - r * 0.82);
    ctx.lineTo(x, y - r * (cheer ? 0.5 : 0.62));
    ctx.closePath();
    ctx.fill();
    if (cheer && i % 2 === 0 && Math.floor(t / 20) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeText('짹!', x + r * 1.3, y - r * 2.1);
      ctx.fillText('짹!', x + r * 1.3, y - r * 2.1);
    }
  });
  void s;
}
function drawMeter(ctx: C2, s: PetState, vis: Vis, pred: Pred, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const x0 = X(0.1), x1 = X(0.9), y = Y(MID_Y), hh = R(0.034), mid = x0 + (x1 - x0) * clamp(vis.meter, 0.04, 0.96);
  const t = s.t;
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  rr(ctx, x0, y - hh / 2 + 3, x1 - x0, hh, hh / 2);
  ctx.fill();
  ctx.save();
  rr(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2);
  ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y - hh / 2, 0, y + hh / 2, [0, '#8ccaff'], [1, '#2f7ee0']);
  ctx.fillRect(x0, y - hh / 2, mid - x0, hh);
  ctx.fillStyle = lin(ctx, 0, y - hh / 2, 0, y + hh / 2, [0, '#ffa08a'], [1, '#e8442a']);
  ctx.fillRect(mid, y - hh / 2, x1 - mid, hh);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(x0, y - hh / 2 + 2, x1 - x0, hh * 0.25);
  ctx.restore();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  rr(ctx, x0, y - hh / 2, x1 - x0, hh, hh / 2);
  ctx.stroke();
  // 매듭
  const jump = t - (juice(s).memo.predT ?? -99) < 14 ? 1 + 0.4 * Math.sin(((t - (juice(s).memo.predT ?? 0)) / 14) * Math.PI) : 1;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = OUT;
  ell(ctx, mid, y, R(0.026) * jump, R(0.026) * jump);
  ctx.fill();
  ctx.stroke();
  starPath(ctx, mid, y, R(0.016) * jump);
  ctx.fillStyle = '#ffc93a';
  ctx.fill();
  // 글자
  font(0.034, 900);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(30,20,10,.6)';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.strokeText('우리', x0 + R(0.02), y + 1);
  ctx.fillText('우리', x0 + R(0.02), y + 1);
  ctx.textAlign = 'right';
  ctx.strokeText('상대', x1 - R(0.02), y + 1);
  ctx.fillText('상대', x1 - R(0.02), y + 1);
  if (s.phase === 'shop') {
    const lab = pred.label, col = !s.board.some(Boolean) ? '#7a5a3a' : pred.win ? '#1f7a26' : '#c0301a';
    font(0.036, 900);
    const tw = ctx.measureText(lab).width + R(0.06);
    const bx = clamp(mid, X(0.1) + tw / 2, X(0.9) - tw / 2), by = y - R(0.044);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    rr(ctx, bx - tw / 2, by - R(0.022), tw, R(0.044), R(0.022));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = col;
    ctx.textAlign = 'center';
    ctx.fillText(lab, bx, by + 1);
  }
  void w;
}
function drawShots(ctx: C2, f: Fight, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  for (const sh of f.shots) {
    const a = f.u[sh.a], b = f.u[sh.b];
    const [ax, ay, aa] = homeOf(f, a, vis, a.side ? -1 - sh.a : a.pid), [bx, by, ba] = homeOf(f, b, vis, b.side ? -1 - sh.b : b.pid);
    const u = clamp((f.t - sh.t0) / sh.T, 0, 1);
    const ra = sizeOf(a.k, a.star, a.side, a.row), rb = sizeOf(b.k, b.star, b.side, b.row);
    const sx = ax, sy = ay - aa - ra * 1.0, ex = bx, ey = by - ba - rb * 0.9;
    const x = X(sx + (ex - sx) * u), y = Y(sy + (ey - sy) * u - Math.sin(Math.PI * u) * 0.07);
    const ang = Math.atan2(Y(ey - sy) - R(Math.cos(Math.PI * u) * 0.07 * Math.PI), X(ex - sx) - 0);
    const k = R(0.018);
    ctx.save();
    ctx.translate(x, y);
    if (sh.heal) {
      ctx.fillStyle = radg(ctx, 0, 0, 0, k * 2.4, [0, 'rgba(200,255,180,.9)'], [1, 'rgba(120,230,120,0)']);
      ell(ctx, 0, 0, k * 2.4, k * 2.4);
      ctx.fill();
      heartPath(ctx, 0, 0, k * 1.1);
      ctx.fillStyle = a.k === 'squirrel' ? '#a0642a' : '#ff6a9a';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (a.k === 'fox') {
      ctx.fillStyle = radg(ctx, 0, 0, 0, k * 2.2, [0, '#fff6a0'], [0.4, '#ffa02a'], [1, 'rgba(255,80,20,0)']);
      ell(ctx, 0, 0, k * 2.2, k * 2.2);
      ctx.fill();
    } else if (a.k === 'rabbit') {
      ctx.rotate(t * 0.5);
      ctx.fillStyle = '#ff8a2a';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-k * 1.5, -k * 0.5);
      ctx.lineTo(k * 1.3, 0);
      ctx.lineTo(-k * 1.5, k * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4ac03a';
      ell(ctx, -k * 1.7, 0, k * 0.5, k * 0.3);
      ctx.fill();
    } else if (a.k === 'owl') {
      ctx.rotate(ang);
      ctx.fillStyle = '#e8f4ff';
      ctx.strokeStyle = '#2a6ab0';
      ctx.lineWidth = 1.5;
      ell(ctx, 0, 0, k * 1.6, k * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(80,170,255,.5)';
      ell(ctx, -k * 2.2, 0, k * 1.2, k * 0.3);
      ctx.fill();
    } else {
      ctx.fillStyle = '#8a8478';
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.2;
      ell(ctx, 0, 0, k * 0.8, k * 0.7);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}
function fightFx(s: PetState, f: Fight, vis: Vis, fx: ReturnType<typeof juice>, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  if (vis.fight !== f) (vis.fight = f), (vis.flog = 0), vis.disp.clear(), vis.died.clear();
  const log = f.log!;
  for (; vis.flog < log.length; vis.flog++) {
    const e = log[vis.flog];
    if (e.t < f.t - 8) continue;
    const b = e.b >= 0 ? f.u[e.b] : null, a = f.u[e.a];
    const pos = (u: FU, i: number) => {
      const [x, y, al] = homeOf(f, u, vis, u.side ? -1 - i : u.pid);
      return [X(x), Y(y - al - sizeOf(u.k, u.star, u.side, u.row) * 1.0)];
    };
    if (e.k === 'hit' && b) {
      const [x, y] = pos(b, e.b);
      const big = e.m > 1, weak = e.m < 1;
      fx.burst(x, y, big ? '#ffd23a' : EL_COL[a.el] ?? '#ffffff', big ? 16 : 9, big ? 4.5 : 3, big ? 3 : 2.2);
      fx.pop(x + R(0.02), y - R(0.05), `${Math.max(1, Math.round(e.v))}`, big ? '#ffe14a' : weak ? '#d8d8d8' : '#ffffff', Math.max(13, R(big ? 0.058 : weak ? 0.036 : 0.045)));
      if (big) fx.pop(x - R(0.03), y - R(0.1), '세다!', '#ff8a3a', Math.max(12, R(0.04)));
      else if (weak) fx.pop(x - R(0.03), y - R(0.1), '약해…', '#cfd8e8', Math.max(12, R(0.034)));
      if (a.role === 0 || a.role === 3) fx.ring(x, y, 'rgba(255,255,255,.9)', R(0.06), 3);
      fx.kick(big ? 3 : 1.5);
    } else if (e.k === 'ko' && b) {
      const [x, y] = pos(b, e.b);
      fx.burst(x, y, b.side ? '#ffd23a' : '#a0c8ff', 20, 5, 3);
      fx.ring(x, y, '#ffffff', R(0.1), 4);
      fx.pop(x, y - R(0.08), b.side ? (b.role === 4 ? '쿵!!' : '데굴!') : '으앙!', b.side ? '#fff27a' : '#bfe0ff', Math.max(15, R(b.role === 4 ? 0.08 : 0.055)));
      fx.kick(b.role === 4 ? 14 : 5);
      if (b.side) vis.cheer = s.t;
    } else if (e.k === 'heal' && b) {
      const [x, y] = pos(b, e.b);
      fx.burst(x, y, '#8aff8a', 12, 2.5, 2.4);
      fx.pop(x, y - R(0.06), `+${Math.round(e.v)}`, '#9aff7a', Math.max(13, R(0.045)));
    } else if (e.k === 'stomp') {
      fx.kick(12);
      fx.ring(X(0.5), Y(MY_Y[Math.max(0, e.v)]), '#fff2c0', R(0.45), 6);
      fx.burst(X(0.5), Y(EN_Y[0]), '#e8c890', 24, 5, 3.2);
    } else if (e.k === 'shoot' || e.k === 'cast') {
      const [x, y] = pos(a, e.a);
      fx.burst(x, y, e.k === 'cast' ? '#b8ffb0' : '#ffffff', 4, 1.5, 1.6);
    } else if (e.k === 'start' && (a.role === 0 || a.role === 3)) {
      const [x, y] = pos(a, e.a);
      fx.burst(x, y + R(0.06), '#e8d8a8', 5, 2, 2);
    } else if (e.k === 'miss' && b) {
      const [x, y] = pos(b, e.b);
      fx.pop(x, y, '휙', '#ffffff', Math.max(12, R(0.032)));
    }
  }
}

function drawShop(ctx: C2, s: PetState, vis: Vis, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number, h: number) {
  const t = s.t, shop = s.phase === 'shop', d = STAGES[s.stage], rot = s.rots[s.stage];
  const mainEl = foeEl(rot, d.foes[0]);
  // 카드 셋
  const owned1 = (k: Kind) => s.board.filter((p) => p && p.k === k && p.star === 1).length;
  for (let i = 0; i < 3; i++) {
    const c = s.shop[i];
    if (!c) continue;
    const cx = X(CARD_X[i]), cy = Y(CARD_Y), cw = R(CARD_W) - R(0.012), ch = R(CARD_H);
    const kd = K[c.k], can = shop && !c.sold && s.coins >= kd.cost && landing(s, c.k).slot >= 0;
    const merge = !c.sold && landing(s, c.k).merge;
    const strong = mainEl < 3 && beats(kd.el, mainEl), weak = mainEl < 3 && beats(mainEl, kd.el);
    const age = t - c.born, flip = age < 12 ? Math.abs(Math.cos((age / 12) * Math.PI)) : 1;
    const shake = t - c.shake < 16 ? Math.sin((t - c.shake) * 1.6) * R(0.012) * (1 - (t - c.shake) / 16) : 0;
    const bob = can ? Math.sin(t * 0.09 + i * 1.7) * R(0.006) : 0;
    ctx.save();
    ctx.translate(cx + shake, cy + bob);
    ctx.scale(flip, 1);
    if (c.sold) {
      ctx.strokeStyle = 'rgba(110,60,20,.35)';
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 2;
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
      ctx.stroke();
      ctx.setLineDash([]);
      font(0.034, 800);
      ctx.fillStyle = 'rgba(90,50,20,.5)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('샀어요', 0, 0);
      ctx.restore();
      continue;
    }
    // 그림자 · 빛
    ctx.fillStyle = 'rgba(60,30,10,.35)';
    rr(ctx, -cw / 2 + 2, -ch / 2 + 5, cw, ch, R(0.025));
    ctx.fill();
    if (can && (merge || (s.stage === 0 && i === firstTip(s)))) {
      ctx.fillStyle = `rgba(255,230,90,${0.45 + 0.25 * Math.sin(t * 0.2)})`;
      rr(ctx, -cw / 2 - 5, -ch / 2 - 5, cw + 10, ch + 10, R(0.035));
      ctx.fill();
    }
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#f6e6c8']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.fill();
    // 위 띠: 속성 색
    ctx.save();
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.clip();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, -ch / 2 + R(0.06), [0, EL_COL[kd.el]], [1, EL_DARK[kd.el]]);
    ctx.fillRect(-cw / 2, -ch / 2, cw, R(0.055));
    // 그림 배경
    ctx.fillStyle = radg(ctx, 0, -ch * 0.02, 0, cw * 0.6, [0, EL_LIGHT[kd.el]], [1, 'rgba(255,255,255,0)']);
    ctx.fillRect(-cw / 2, -ch / 2 + R(0.055), cw, ch);
    ctx.restore();
    ctx.strokeStyle = can ? '#8a5a20' : 'rgba(110,70,30,.5)';
    ctx.lineWidth = can ? 2.5 : 1.5;
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
    ctx.stroke();
    // 이름
    font(0.034, 900);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(kd.name, -cw / 2 + R(0.012), -ch / 2 + R(0.029), cw * 0.62);
    // 값 (금화)
    coinIcon(ctx, cw / 2 - R(0.04), -ch / 2 + R(0.028), R(0.022));
    ctx.fillStyle = s.coins >= kd.cost ? '#5a3404' : '#d02a1a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(kd.cost), cw / 2 - R(0.04), -ch / 2 + R(0.03));
    // 그림
    const pr = R(0.05);
    ctx.fillStyle = 'rgba(80,50,20,.18)';
    ell(ctx, 0, ch * 0.2, pr * 0.8, pr * 0.2);
    ctx.fill();
    drawPet(ctx, c.k, 0, ch * 0.2, pr, { el: kd.el, star: 1, enemy: false, face: can ? 'idle' : 'worry', t: t + i * 40, sq: Math.max(0, Math.sin(t * 0.09 + i)) * 0.04, tilt: 0, flash: 0, ph: i });
    // 역할
    const role = kd.role === 0 ? '앞 · 막기' : kd.role === 1 ? '뒤 · 쏘기' : '뒤 · 치료';
    font(0.03, 800);
    ctx.fillStyle = '#6a4a20';
    ctx.textAlign = 'center';
    ctx.fillText(role, 0, ch / 2 - R(0.024));
    // 합체 짝 (●●○)
    const own = owned1(c.k);
    if (own > 0 && !merge) {
      for (let j = 0; j < 3; j++) {
        ctx.fillStyle = j < own ? '#ffb020' : j === own ? `rgba(255,176,32,${0.4 + 0.4 * Math.sin(t * 0.2)})` : 'rgba(110,70,30,.2)';
        ell(ctx, (j - 1) * R(0.024), ch / 2 - R(0.058), R(0.009), R(0.009));
        ctx.fill();
      }
    }
    // 딱지: 합체! · 세다!
    if (merge) {
      ctx.save();
      ctx.translate(0, -ch / 2 + R(0.085));
      ctx.rotate(-0.08);
      const pulse = 1 + 0.06 * Math.sin(t * 0.25);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = lin(ctx, 0, -R(0.02), 0, R(0.02), [0, '#fff27a'], [1, '#ffb020']);
      rr(ctx, -R(0.06), -R(0.02), R(0.12), R(0.04), R(0.02));
      ctx.fill();
      ctx.strokeStyle = '#9a5a08';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      font(0.03, 900);
      ctx.fillStyle = '#9a3a08';
      ctx.fillText('합체!', 0, R(0.002));
      ctx.restore();
    } else if (strong || weak) {
      font(0.028, 900);
      const lab = strong ? '세다!' : '약해', tw = ctx.measureText(lab).width + R(0.03);
      ctx.fillStyle = strong ? '#ff6a2a' : 'rgba(120,120,140,.85)';
      rr(ctx, -cw / 2 + R(0.008), -ch / 2 + R(0.066), tw, R(0.034), R(0.017));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(lab, -cw / 2 + R(0.008) + tw / 2, -ch / 2 + R(0.084));
    }
    if (!can && !c.sold && shop) {
      ctx.fillStyle = 'rgba(255,250,240,.45)';
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.025));
      ctx.fill();
    }
    ctx.restore();
  }
  // ✏️ M1 S3 '다음' 카드 줄(📐 CONTENT §3): 가게 다음 3장을 판대 위 오른쪽에 작고 흐리게 · 남은 장 수는 왼쪽
  if (lineMode() && s.phase === 'shop') {
    const y0 = Y(SHOP_TOP) - R(0.008), r0 = R(0.03);
    font(0.032, 800);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff6dc';
    ctx.strokeStyle = 'rgba(74,42,18,.8)';
    ctx.lineWidth = 3;
    ctx.strokeText('다음', X(0.665), y0);
    ctx.fillText('다음', X(0.665), y0);
    s.queue.slice(0, 3).forEach((k, j) => {
      const x0 = X(0.73 + j * 0.088);
      ctx.save();
      ctx.globalAlpha = 0.85 - j * 0.15;
      ctx.fillStyle = '#fff3d6';
      rr(ctx, x0 - r0 * 1.25, y0 - r0 * 1.25, r0 * 2.5, r0 * 2.5, r0 * 0.5);
      ctx.fill();
      ctx.strokeStyle = EL_DARK[K[k].el];
      ctx.lineWidth = 2;
      ctx.stroke();
      drawPet(ctx, k, x0, y0 + r0 * 0.45, r0 * 0.75, { el: K[k].el, star: 1, enemy: false, face: 'idle', t: s.t, sq: 0, tilt: 0, flash: 0, ph: j });
      ctx.restore();
    });
    const more = s.queue.length - 3;
    ctx.textAlign = 'left';
    const txt = s.queue.length ? (more > 0 ? `남은 카드 +${more + 3}` : `남은 카드 ${s.queue.length}`) : '줄 끝';
    ctx.strokeText(txt, X(0.035), y0);
    ctx.fillText(txt, X(0.035), y0);
  }
  // 금화 주머니 (판대 위 가운데)
  {
    const cx = X(0.5), cy = Y(SHOP_TOP) - R(0.008);
    font(0.05, 900);
    const txt = `${s.coins}`, tw = ctx.measureText(txt).width, pw = tw + R(0.14);
    const bump = t - (juice(s).memo.coinT ?? -99) < 12 ? 1.15 : 1;
    if ((juice(s).memo.coins ?? s.coins) !== s.coins) juice(s).memo.coinT = t;
    juice(s).memo.coins = s.coins;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(bump, bump);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -pw / 2 + 2, -R(0.03) + 3, pw, R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -R(0.03), 0, R(0.03), [0, '#fff8e0'], [1, '#ffe3a0']);
    rr(ctx, -pw / 2, -R(0.03), pw, R(0.06), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#9a600a';
    ctx.lineWidth = 2;
    ctx.stroke();
    coinIcon(ctx, -pw / 2 + R(0.04), 0, R(0.022));
    ctx.fillStyle = '#7a4a08';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, R(0.025), R(0.002));
    ctx.restore();
  }
  // 단추: 왼쪽(다시 뽑기 · 팔기) · 오른쪽(싸움!)
  const selP = shop && s.sel >= 0 ? s.board[s.sel] : null;
  const btn = (b: [number, number, number, number], top: string, bot: string, line: string, label: string, sub: string, on: boolean, pulse: number, icon: (x: number, y: number) => void) => {
    const bx = X(b[0]), by = Y(b[1]), bw = R(b[2]), bh = R(b[3]);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgba(60,30,10,.4)';
    rr(ctx, -bw / 2, -bh / 2 + 5, bw, bh, bh * 0.4);
    ctx.fill();
    ctx.fillStyle = on ? lin(ctx, 0, -bh / 2, 0, bh / 2, [0, top], [1, bot]) : lin(ctx, 0, -bh / 2, 0, bh / 2, [0, '#e8dccc'], [1, '#c8b8a0']);
    rr(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.4);
    ctx.fill();
    ctx.strokeStyle = on ? line : 'rgba(110,70,30,.5)';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    rr(ctx, -bw / 2 + 4, -bh / 2 + 3, bw - 8, bh * 0.3, bh * 0.15);
    ctx.fill();
    icon(-bw / 2 + R(0.05), 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(sub ? 0.042 : 0.06, 900);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = on ? line : 'rgba(110,70,30,.4)';
    const tx = label === '다시 뽑기' || label === '넘기기' || label === '팔기' ? 0 : R(0.02);
    const mw = tx ? bw - R(0.1) : bw - R(0.03);
    ctx.strokeText(label, tx, sub ? -R(0.012) : R(0.003), mw);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, tx, sub ? -R(0.012) : R(0.003), mw);
    if (sub) {
      font(0.03, 800);
      ctx.fillStyle = on ? '#fff6dc' : '#8a7a60';
      ctx.fillText(sub, tx, R(0.028));
    }
    ctx.restore();
  };
  if (selP) {
    const v = sellValue(selP);
    btn(REROLL_BTN, '#ffd86a', '#f0a020', '#8a5208', '팔기', `금화 +${v}`, true, 1 + 0.03 * Math.sin(t * 0.25), () => undefined);
  } else if (rerollOn(s)) {
    const on = shop && s.coins >= REROLL;
    const sk = lineMode();
    btn(REROLL_BTN, '#7ac8ff', '#2f86e0', '#1a4a90', sk ? '넘기기' : '다시 뽑기', sk && !canSkip(s) ? '줄 끝' : '금화 1', on && (!sk || canSkip(s)), 1, () => undefined);
  }
  const has = s.board.some(Boolean);
  const fightOn = (shop && has) || (s.phase === 'result' && s.pt > 50);
  const tip = s.stage === 0 && shop && firstTip(s) === 9;
  btn(FIGHT_BTN, '#ff8a4a', '#e0381e', '#8a1a08', shop ? '싸움!' : s.phase === 'fight' ? '싸우는 중' : s.ok ? '다음 판' : '다시', '', fightOn, fightOn ? 1 + (tip ? 0.06 : 0.025) * Math.sin(t * 0.22) : 1, (x, y) => {
    // 칼 두 자루
    for (const sd of [-1, 1]) {
      ctx.save();
      ctx.translate(x + R(0.01), y);
      ctx.rotate(sd * 0.7);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = fightOn ? '#8a1a08' : '#8a7a60';
      ctx.lineWidth = 1.5;
      rr(ctx, -R(0.005), -R(0.034), R(0.01), R(0.044), R(0.004));
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd23a';
      rr(ctx, -R(0.013), R(0.008), R(0.026), R(0.007), R(0.003));
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  });
  // ── 별 줄 (쉬운 말) ──
  const r2 = Y(1.353);
  {
    const stars = d.stars, play = s.phase !== 'result';
    const labels = stars.map((q) => q.label + (play && starNow(s, q) ? ` ${starNow(s, q)}` : ''));
    const okNow = s.phase === 'result' && s.ok ? s.starOk : stars.map((q) => (q.k === 'merge' ? s.merges >= q.n : q.k === 'shooter' ? s.board.some((p) => p && K[p.k].role === 1) : false));
    font(0.034, 800);
    const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
    const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (ws.length - 1), scl = Math.min(1, (w - R(0.03)) / tot);
    let xx = (w - tot * scl) / 2;
    for (let j = 0; j < stars.length; j++) {
      const pw = ws[j] * scl;
      ctx.fillStyle = okNow[j] ? 'rgba(255,220,80,.85)' : 'rgba(255,248,230,.85)';
      rr(ctx, xx, r2 - R(0.026), pw, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okNow[j] ? '#c07a08' : 'rgba(90,50,20,.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      starPath(ctx, xx + R(0.027) * scl + 2, r2, R(0.015));
      ctx.fillStyle = okNow[j] ? '#ffd23a' : 'rgba(90,50,20,.35)';
      ctx.fill();
      ctx.strokeStyle = '#7a4a08';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = okNow[j] ? '#7a3a04' : '#4a2a10';
      font(0.034, 800);
      ctx.fillText(labels[j], xx + R(0.05) * scl, r2 + 1, pw - R(0.058) * scl);
      xx += pw + gap * scl;
    }
  }
  // ── 안내 한 줄 + 손가락 ──
  {
    let hint = d.hint, hx = -1, hy = -1;
    const tipI = s.stage === 0 && shop ? firstTip(s) : -1;
    if (s.phase === 'fight') hint = '싸움은 저절로! 구경해요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판을 이겼어요!' : '다음 판엔 새것이 나와요') : '군단을 바꿔 다시 도전!';
    else if (selP) hint = '다른 칸을 톡 = 자리 바꾸기 · 왼쪽 = 팔기';
    else if (tipI >= 0 && tipI < 3) {
      hint = s.board.filter((p) => p && p.k === 'lion' && p.star === 1).length === 1 && s.buys === 0 ? '사자 카드를 톡!' : '하나 더! 같은 동물 셋이면 합체';
      (hx = CARD_X[tipI]), (hy = CARD_Y + 0.02);
    } else if (tipI === 9) (hint = "'싸움!'을 톡 — 저절로 싸워요"), (hx = FIGHT_BTN[0]), (hy = BTN_Y + 0.01);
    else if (!has) hint = '카드를 톡 해서 동물을 사요';
    font(tipI >= 0 ? 0.042 : 0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(90,40,10,.55)';
    ctx.strokeText(hint, w / 2, Y(1.437), w - R(0.04));
    ctx.fillStyle = tipI >= 0 ? '#fff27a' : '#fff6dc';
    ctx.fillText(hint, w / 2, Y(1.437), w - R(0.04));
    if (hx >= 0) drawHand(ctx, X(hx) + R(0.03), Y(hy), R(0.085), Math.max(0, Math.sin(t * 0.15)));
  }
  void vis;
  void h;
}
/** 1판 안내: 가리킬 카드(0~2) · 싸움 단추(9) · 없음(-1) */
function firstTip(s: PetState): number {
  if (s.stage !== 0 || s.again) return -1;
  const lions = s.board.filter((p) => p && p.k === 'lion').length, big = s.board.some((p) => p && p.k === 'lion' && p.star >= 2);
  if (big || s.buys >= 3) return 9;
  if (lions >= 1) {
    for (let i = 0; i < 3; i++) if (!s.shop[i].sold && s.shop[i].k === 'lion' && s.coins >= K.lion.cost && landing(s, 'lion').slot >= 0) return i;
  }
  return 9;
}
function drawTop(ctx: C2, s: PetState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const d = STAGES[s.stage], hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,252,240,.95)'], [1, 'rgba(255,240,210,.92)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(110,60,20,.3)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  const cy = hb / 2;
  const cx = R(0.055);
  ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
  ell(ctx, cx, cy, R(0.031), R(0.031));
  ctx.fill();
  ctx.strokeStyle = '#7a4a08';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5b3512';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(s.stage + 1), cx, cy + 1);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4a2a10';
  font(0.042, 900);
  ctx.fillText(d.name, R(0.1), cy + 1, R(0.4));
  const nw = Math.min(R(0.4), ctx.measureText(d.name).width);
  font(0.032, 700);
  ctx.fillStyle = '#8a6a4a';
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  // 별 · 하트
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
    const hx2 = w - R(0.03) - sw - R(0.085) - j * R(0.052);
    heartPath(ctx, hx2, cy, R(0.018));
    ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(110,60,20,.15)';
    ctx.fill();
    ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(110,60,20,.3)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  }
  void X;
  void Y;
}
function drawCards(ctx: C2, s: PetState, fx: ReturnType<typeof juice>, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, wgt?: number) => void, w: number) {
  const t = s.t, d = STAGES[s.stage];
  // 스포트라이트 (새것)
  if (s.spot && s.phase === 'shop' && t - s.spot.t < 200) {
    const sp = s.spot, a = Math.min(1, (200 - (t - sp.t)) / 30), pul = 1 + 0.04 * Math.sin(t * 0.2), prx = R(sp.rx) * pul, pry = R(sp.ry) * pul;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -t * 0.8;
    rr(ctx, X(sp.x) - prx, Y(sp.y) - pry, prx * 2, pry * 2, Math.min(prx, pry) * 0.6);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.034, 900);
    const lab = `NEW  ${sp.label}`, tw = ctx.measureText(lab).width + R(0.04);
    const lx = clamp(X(sp.x), tw / 2 + 4, w - tw / 2 - 4), ly = Math.max(R(0.11), Y(sp.y) - pry - R(0.005));
    ctx.fillStyle = '#ff5a3a';
    rr(ctx, lx - tw / 2, ly - R(0.022), tw, R(0.044), R(0.022));
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
  // 판 띠 (판 시작 · 결과)
  let head = '', sub = '', a = 0, age = 0, cy = Y(MID_Y);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    cy = Y(s.ok ? 0.34 : 0.6);
    if (s.ok) head = s.won ? '모든 판 승리!' : `${d.who} 이겼다!`;
    else (head = '으앗, 졌다…'), (sub = s.hearts > 0 ? `${s.why} · 하트 -1 · 같은 판 다시` : '하트가 없어요 — 끝');
  } else if (s.banner && s.phase === 'shop' && t - s.banner.t < BANNER_T) {
    age = t - s.banner.t;
    a = Math.min(1, age / 8, (BANNER_T - age) / 25);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.5 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.052, 900);
    const w1 = ctx.measureText(head).width;
    font(0.034, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'result' && s.ok;
    const cw = Math.min(w - R(0.04), Math.max(w1, w2, okRes ? R(0.5) : 0) + R(0.1)), ch = (okRes ? R(0.21) : sub ? R(0.15) : R(0.09)) * pop;
    ctx.translate(w / 2, cy);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#fffaf0'], [1, '#ffe8c0']);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#8a5a20';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // 리본 끝
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#ff6a3a' : '#7a8aa8') : '#3d9df5';
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
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0500a' : '#5a6a88') : '#2a5a9a';
    if (okRes) {
      ctx.fillText(head, 0, -R(0.06), w - R(0.1));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14);
        const sx = (j - (nS - 1) / 2) * R(0.09), sy = R(0.0);
        const popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, sy, R(0.036) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,50,20,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
      }
      const win = d.win, ga = s.pt - (20 + nS * 14);
      if (ga >= 0 && (win > 0 || s.won)) {
        const gp = ga < 8 ? 1.5 - 0.5 * (ga / 8) : 1;
        ctx.save();
        ctx.translate(0, R(0.06));
        ctx.scale(gp, gp);
        font(0.04, 900);
        const txt = s.won ? '군단 최고!' : `금화 +${win}`, tw = ctx.measureText(txt).width;
        if (!s.won) coinIcon(ctx, -tw / 2 - R(0.018), 0, R(0.02));
        ctx.fillStyle = '#9a5a08';
        ctx.fillText(txt, R(s.won ? 0 : 0.012), R(0.002));
        ctx.restore();
      }
    } else {
      ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
      if (sub) {
        font(0.034, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#6a4a2a';
        ctx.fillText(sub, 0, R(0.035), w - R(0.1));
      }
    }
    ctx.restore();
  }
}

/** 시험·스크린샷용: k판(0부터)으로 바로 — 잘하는 봇처럼 사 둔 군단으로 */
export function jumpTo(s: PetState, k: number, board: ([Kind, number] | null)[] = [], coins = 8) {
  s.stage = k;
  s.board = [null, null, null, null, null, null];
  board.forEach((b, i) => b && (s.board[i] = { id: ++s.nid, k: b[0], star: b[1], born: -999, land: -999, mergeT: -999, from: -1 }));
  s.coins = coins;
  s.again = false;
  newStage(s);
}
