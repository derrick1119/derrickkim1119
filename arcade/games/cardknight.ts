/**
 * 21 카드 기사단 (30라운드: 카지노 × 주사위 디펜스) — 21 만들기 × 더 걸까 멈출까 × 가리키기(톡).
 * 뼈대(21 만들기 × 결투): 토끼 기사와 괴물이 한 판씩 겨룬다. 카드 더미를 톡 → 카드 한 장이 휙 날아와 기사 칼이 그 숫자만큼 길어진다
 *   (합 = 칼 길이). 기사를 톡 → 그 합으로 벤다. 합이 21을 넘으면 칼 무게에 '철퍼덕' — 그 차례는 0. 딱 21이면 '블랙잭!' 두 배.
 *   괴물도 **같은 더미**에서 보이는 규칙(예: 15가 되면 멈춤)으로 뽑는다. 더 큰 쪽이 이기고 차이만큼 진 쪽 체력이 깎인다.
 *   처음 두 장은 저절로 오고, 그다음 톡 한 번이 곧 결정(한 장 더 / 베기)이다 — 연타가 없다.
 * 확률이 보인다: 더미에 남은 카드가 숫자별로 화면 아래에 늘 보이고, 지금 뽑으면 넘치는 숫자는 빨갛게, 딱 21이 되는 숫자는 금색으로 칠해진다.
 *   괴물이 뽑은 카드는 더미에서 빠지니(같은 더미), 큰 카드가 많이 남았을 때 일찍 멈추면 뒤에 뽑는 괴물이 넘친다.
 * 와우: 내가 꾸민 덱을 괴물도 같이 뽑는다 — 10을 넣으면 내 블랙잭도, 괴물이 넘칠 확률도 같이 커진다.
 * 판 6개(괴물 하나씩): 목표 = 괴물 체력을 0으로. 별(쉬운 말) = 괴물 이기기 · 한 번도 안 넘치기(2판부터) · 블랙잭 한 번 만들기(3판부터).
 *   지면(기사 체력 0) 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 6판을 마치면 끝. 이기면 카드 가게에서 셋 중 하나를 골라 덱을 고친다.
 * 펼쳐짐(하는 일이 바뀐다): 1 개구리(늘 12 — 뽑기·베기) → 가게(덱에 넣기·빼기) → 2 멧돼지(괴물도 같은 더미에서 뽑는다 — 남은 카드 세기)
 *   → 3 거북(등딱지: ♠ 카드가 칼에 있어야 뚫는다 — ♠을 노려 더 뽑기) → 4 늑대(네가 벤 뒤에 뽑는다 — 일찍 멈춰 늑대를 넘치게)
 *   → 5 부엉이(네 숫자를 넘을 때까지 뽑는다 — 높이 멈출수록 넘친다) → 6 용(먼저·나중을 번갈아 + 등딱지).
 *   가게에서 산 ♥(벨 때 체력 +3)·♠(꿰뚫기)·황금 카드(뽑으면 딱 21)도 처음 손에 들어올 때 새것으로 알린다.
 * 웃음: 넘치면 칼이 너무 무거워 기사가 앞으로 철퍼덕 엎어지고 어질어질 별, 괴물은 기사 칼이 자기보다 길어지면 식은땀을 뻘뻘,
 *   블랙잭이면 칼이 화면 끝까지 뻗어 괴물이 빙글빙글 날아간다. 울타리 너머 동물 관중이 블랙잭엔 폴짝, 철퍼덕엔 'ㅋㅋ'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const KHP = 30, HEAL = 3;
const FLY = 13, MDRAW = 13, DEAL_GAP = 10;
const INTRO_T = 86, INTRO_RETRY = 50, RESULT_OK = 132, RESULT_FAIL = 130, NEWS_T = 190;
const RES_T = 54, RES_BJ = 96, RES_BUST = 80;
const STAR_PTS = 100, CLEAR_PTS = 50, WIN_PTS = 100, BJ_PTS = 10;

// ───────────────────────────── 카드 ─────────────────────────────
/** 0 칼 카드(보통) · 1 ♥ 하트(벨 때 체력 +3) · 2 ♠ 꿰뚫기(등딱지 무시) · 3 ☠ 독 카드(숫자 0, 뽑은 쪽 체력 -3 — 괴물이 뽑아도) */
export type Su = 0 | 1 | 2 | 3;
export interface Card { v: number; su: Su }
const C = (v: number, su: Su = 0): Card => ({ v, su });
export const handSum = (h: Card[]) => h.reduce((a, c) => a + c.v, 0);
const rawSum = handSum;
/** 숫자 뒤 조사 (15가 · 16이) */
const ga = (n: number) => ([2, 4, 5, 9].includes(n % 10) ? '가' : '이');
const POISON = 3;

type Mode = 'fixed' | 'first' | 'after' | 'swap';
type Order = 'fixed' | 'first' | 'after';
export interface StageDef { key: string; name: string; emoji: string; hp: number; mode: Mode; stop: number; fixed?: number; shield: number; nstar: number; bite?: number; full?: boolean; chase?: boolean; vary?: number[]; add?: Card[]; pz?: number; news: string; spot: string; tip: string }
/** 별 (쉬운 말, 한 판에 하나씩 늘어난다) */
export const STAR_TXT = ['괴물 이기기', '한 번도 안 넘치기', '체력 반 넘게 남기기'];
export const STAGES: StageDef[] = [
  { key: 'frog', name: '개구리', emoji: '🐸', hp: 9, mode: 'fixed', stop: 0, fixed: 11, shield: 0, nstar: 1, news: '👆 더미를 톡 → 카드만큼 칼이 쑥! 기사를 톡 → 베기', spot: '', tip: '개구리는 늘 11 — 11보다 길게 만들고 기사를 톡!' },
  { key: 'boar', name: '멧돼지', emoji: '🐗', hp: 12, mode: 'first', stop: 15, shield: 0, nstar: 2, news: '🐗 괴물도 같은 더미에서 뽑아요 — 15가 되면 멈춰요', spot: '아래 판 = 더미에 남은 카드 · 빨강은 넘쳐요', tip: '빨간 카드가 많이 남았으면 멈춰요' },
  { key: 'turtle', name: '거북', emoji: '🐢', hp: 14, mode: 'first', stop: 16, shield: 4, nstar: 3, add: [C(5, 2), C(7, 2), C(9, 2)], news: '🐢 등딱지가 4를 막아요 — ♠ 카드가 칼에 있으면 꿰뚫어요', spot: '♠ 카드 3장이 덱에 들어왔어요', tip: '♠가 칼에 있으면 등딱지를 꿰뚫어요' },
  { key: 'wolf', name: '늑대', emoji: '🐺', hp: 14, mode: 'after', stop: 14, shield: 0, nstar: 3, news: '🐺 늑대는 네가 벤 다음에 뽑아요 — 14가 되면 멈춰요', spot: '큰 카드가 많이 남으면 늑대가 넘쳐요', tip: '큰 카드가 많이 남았으면 일찍 멈춰 늑대를 넘치게!' },
  { key: 'scorp', name: '전갈', emoji: '🦂', hp: 16, mode: 'first', stop: 16, shield: 0, nstar: 3, pz: 4, news: '🦂 독 카드 4장이 섞였어요 — 뽑은 쪽 체력 -3 (괴물도!)', spot: '☠ 독 카드는 0 — 뽑으면 아야, 괴물이 뽑아도 아야', tip: '독 카드가 많이 남았으면 덜 뽑아요 — 괴물이 먼저 뽑아요' },
  { key: 'dragon', name: '용', emoji: '🐉', hp: 18, mode: 'swap', stop: 17, shield: 3, nstar: 3, news: '🐉 용은 먼저·나중을 번갈아 뽑고, 등딱지 3', spot: '이번엔 누가 먼저인지 봐요', tip: '용이 먼저면 숫자를 보고, 나중이면 남은 카드를 보고' },
];
export const STAGE_COUNT = STAGES.length;
const START_DECK = (): Card[] => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10].flatMap((v) => [C(v), C(v)]);

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Fly { c: Card; to: 0 | 1; t0: number }
export interface Res { a: number; m: number; k: number; mm: number; bust: boolean; mbust: boolean; bj: boolean; mbj: boolean; win: number; dm: number; dk: number; heal: number; pierce: boolean; blocked: number; combo: number; t0: number; end: number }
export interface Offer { kind: 'add' | 'rem'; c: Card; label: string; sub: string }
type Phase = 'intro' | 'mon' | 'deal' | 'me' | 'res' | 'result' | 'shop';
export interface KnightState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number;
  deck: Card[]; pile: Card[]; disc: Card[]; hand: Card[]; mh: Card[];
  hp: number; mhp: number; mmax: number; ex: number; order: Order;
  /** 이번 겨루기에 괴물이 멈추는 숫자 (변덕쟁이 괴물은 매번 바뀐다) */
  mstop: number;
  combo: number; busted: boolean; bjN: number; bustN: number; wins: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; retry: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[]; startT: number; clearT: number;
  down: boolean; ax: number; ay: number; taps: number; lastTap: number; land: number; auto: number; next: number;
  fly: Fly[]; res: Res | null; offers: Offer[]; shopN: number; shuffleT: number; picked: number; pickT: number;
  /** 측정용: 판별 입력 기록 (어디를 눌렀나) */
  log: string[];
}

const ev = (s: KnightState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: KnightState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// 화면 배치 (가로 0~1, 세로 0~A)
const KX = 0.2, MX = 0.8, FOOT = 0.93;
const DECK_X = 0.5, DECK_Y = 0.865, DECK_W = 0.15;
const HAND_Y = 0.52;
const BOARD_Y = 1.215;
const OFFER_Y = 0.8, OFFER_W = 0.27, OFFER_H = 0.36;
const offerX = (i: number) => 0.5 + (i - 1) * 0.31;
const inDeck = (x: number, y: number) => Math.abs(x - DECK_X) < 0.13 && Math.abs(y - DECK_Y) < 0.15;
const inKnight = (x: number, y: number) => x < 0.37 && y > 0.4 && y < 1.06;
const inMon = (x: number, y: number) => x > 0.63 && y > 0.4 && y < 1.06;

function shuffleIn<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
}

function reshuffle(s: KnightState) {
  if (!s.disc.length) return;
  s.pile = shuffleIn([...s.pile, ...s.disc], s.rng);
  s.disc = [];
  s.shuffleT = s.t;
  ev(s, 'shuffle', DECK_X, DECK_Y - 0.13, '🔀 섞어요!', '#d6f0ff');
  see(s, 'shuffle', '🔀 더미가 비면 버린 카드를 다시 섞어요');
}
/** 더미 맨 위에서 한 장 (괴물은 황금 카드를 건너뛴다) */
function takeCard(s: KnightState, mon: boolean): Card | null {
  if (!s.pile.length) reshuffle(s);
  void mon;
  return s.pile.pop() ?? null;
}

function newStage(s: KnightState, retry: boolean) {
  const d = STAGES[s.stage];
  if (!retry && d.add) s.deck.push(...d.add.map((c) => ({ ...c })));
  s.retry = retry;
  s.pile = shuffleIn([...s.deck, ...[...Array(d.pz ?? 0)].map(() => C(0, 3))], s.rng);
  // 첫 판 첫 차례: 6·5가 오고 더미 맨 위는 10 — 첫 톡이 곧 블랙잭(첫 3초의 큰 일)
  if (s.stage === 0 && !retry)
    for (const v of [10, 5, 6]) {
      const i = s.pile.findIndex((c) => c.v === v && c.su === 0);
      if (i >= 0) s.pile.push(s.pile.splice(i, 1)[0]);
    }
  s.disc = [];
  s.hand = [];
  s.mh = [];
  s.hp = KHP;
  s.mmax = s.mhp = d.hp;
  s.ex = 0;
  s.combo = 0;
  s.busted = false;
  s.bjN = 0;
  s.bustN = 0;
  s.wins = 0;
  s.phase = 'intro';
  s.pt = 0;
  s.startT = s.t;
  s.res = null;
  s.fly = [];
  s.auto = 0;
  s.land = 0;
  s.starOk = [false, false, false];
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.7, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function beginExchange(s: KnightState) {
  s.disc.push(...s.hand, ...s.mh);
  s.hand = [];
  s.mh = [];
  s.fly = [];
  s.ex++;
  s.log.push('|');
  const d = STAGES[s.stage];
  s.order = d.mode === 'swap' ? (s.ex % 2 ? 'first' : 'after') : d.mode;
  s.mstop = d.vary ? d.vary[0] + Math.floor(s.rng() * (d.vary[1] - d.vary[0] + 1)) : d.stop;
  s.res = null;
  s.auto = 0;
  s.phase = s.order === 'first' ? 'mon' : 'deal';
  s.pt = 0;
  s.next = s.t + (s.phase === 'mon' ? 14 : 8);
}

function monNeeds(s: KnightState) {
  const m = rawSum(s.mh);
  if (m >= 21 || s.order === 'fixed') return false;
  const d = STAGES[s.stage], k = handSum(s.hand);
  return m < s.mstop && (!d.chase || m <= (k > 21 ? 0 : k));
}
function monDraw(s: KnightState) {
  const c = takeCard(s, true);
  if (!c) return;
  s.mh.push(c);
  s.fly.push({ c, to: 1, t0: s.t });
  const m = rawSum(s.mh);
  ev(s, 'mcard', MX, HAND_Y, `${m}`, '#ffe0c0', s.t + FLY);
  if (c.su === 3) (s.mhp = Math.max(1, s.mhp - POISON)), ev(s, 'mpoison', MX, 0.66, `☠ 괴물도 따끔! -${POISON}`, '#d9a8ff', s.t + FLY), see(s, 'poison', '☠ 독 카드 — 뽑은 쪽 체력 -3, 괴물이 뽑아도!');
  if (m > 21) ev(s, 'mbust', MX, 0.7, '괴물이 넘쳤다! 펑', '#c8f7c5', s.t + FLY + 4);
}
function knightDraw(s: KnightState, tap = false) {
  const c = takeCard(s, false);
  if (!c) return;
  s.hand.push(c);
  s.fly.push({ c, to: 0, t0: s.t });
  s.land = s.t + FLY;
  const k = handSum(s.hand);
  ev(s, tap ? 'card' : 'deal', KX + 0.16, HAND_Y + 0.07, c.su === 3 ? '☠ 0' : `+${c.v}`, c.su === 3 ? '#d9a8ff' : '#fff6e0', s.land);
  if (c.su === 3) (s.hp = Math.max(1, s.hp - POISON)), ev(s, 'poison', KX, 0.66, `☠ 따끔! -${POISON}`, '#d9a8ff', s.land), see(s, 'poison', '☠ 독 카드 — 뽑은 쪽 체력 -3, 괴물이 뽑아도!');
  if (c.su === 1) see(s, 'heart', '♥ 하트 카드 — 넘치지 않고 베면 체력 +3');
  if (c.su === 2 && STAGES[s.stage].shield) see(s, 'spade', '♠ 카드가 칼에 있으면 등딱지를 꿰뚫어요');
  if (k > 21) s.auto = s.land + 8;
  else if (k === 21) s.auto = s.land + 6;
}

function stand(s: KnightState) {
  s.auto = 0;
  if (s.order === 'first' || s.order === 'fixed') resolve(s);
  else {
    s.phase = 'mon';
    s.pt = 0;
    s.next = s.t + 16;
  }
}

/** 한 차례 결과 — 봇의 계산(outcome)과 같은 식 */
export function outcome(d: StageDef, k: number, mm: number, combo: number, hearts: number, pierce: boolean) {
  const bust = k > 21, a = bust ? 0 : k, mbust = mm > 21, m = mbust ? 0 : mm;
  let dm = 0, dk = 0, blocked = 0, c2 = 0;
  if (a > m) {
    c2 = combo + 1;
    dm = (a - m) * (a === 21 ? 2 : 1) + (c2 - 1);
    if (d.shield && !pierce) (blocked = Math.min(dm, d.shield)), (dm -= blocked);
  } else if (m > a) dk = (d.full ? m : m - a) * (m === 21 ? 2 : 1) * (d.bite ?? 1);
  return { a, m, bust, mbust, dm, dk, blocked, combo: c2, heal: bust ? 0 : HEAL * hearts, win: a > m ? 1 : m > a ? -1 : 0 };
}

function resolve(s: KnightState) {
  const d = STAGES[s.stage];
  const k = handSum(s.hand), mm = s.order === 'fixed' ? d.fixed! : rawSum(s.mh);
  const o = outcome(d, k, mm, s.combo, s.hand.filter((c) => c.su === 1).length, s.hand.some((c) => c.su === 2));
  s.combo = o.combo;
  const heal = Math.min(KHP - s.hp, o.heal);
  s.hp += heal;
  s.mhp = Math.max(0, s.mhp - o.dm);
  s.hp = Math.max(0, s.hp - o.dk);
  if (o.bust) (s.busted = true), s.bustN++;
  if (o.a === 21) s.bjN++;
  if (o.win > 0) s.wins++;
  const end = s.t + (o.a === 21 ? RES_BJ : o.bust ? RES_BUST : RES_T);
  s.res = { ...o, k, mm, bj: o.a === 21, mbj: o.m === 21, heal, pierce: s.hand.some((c) => c.su === 2) && !!d.shield, t0: s.t, end };
  s.phase = 'res';
  s.pt = 0;
  const r = s.res;
  if (r.bust) ev(s, 'bust', KX + 0.08, 0.72, '철퍼덕!', '#ffd0c8', s.t + 22);
  if (r.bj) ev(s, 'bj', 0.5, 0.62, '블랙잭!', '#ffe066', s.t + 6), see(s, 'bj', '✨ 딱 21 = 블랙잭! 칼이 두 배로 세져요');
  const hitT = s.t + (r.bj ? 30 : 20);
  if (r.win > 0) {
    ev(s, 'hit', MX, 0.7, r.dm > 0 ? `-${r.dm}` : '팅!', r.bj ? '#ffe066' : '#ffffff', hitT);
    if (r.blocked) ev(s, 'shield', MX - 0.06, 0.62, `등딱지 -${r.blocked}`, '#cfe3ff', hitT + 6);
    if (r.pierce) ev(s, 'pierce', MX - 0.06, 0.62, '♠ 꿰뚫기!', '#e0e6ff', hitT + 4);
    if (r.combo >= 2) ev(s, 'combo', 0.5, 0.48, `콤보 ${r.combo}! +${r.combo - 1}`, '#ffb3ec', hitT + 10);
  } else if (r.win < 0) ev(s, 'hurt', KX, 0.72, `-${r.dk}`, '#ff9a8a', s.t + (r.bust ? 50 : 24));
  else ev(s, 'tie', 0.5, 0.7, '쨍! 비겼다', '#e8f0ff', s.t + 16);
  if (heal > 0) ev(s, 'heal', KX, 0.6, `♥ +${heal}`, '#ff9ec4', s.t + 34);
}

function finish(s: KnightState, ok: boolean, why = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, d.nstar >= 2 && !s.busted, d.nstar >= 3 && s.hp > KHP / 2];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + CLEAR_PTS + s.bjN * BJ_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, `${d.emoji} 이겼다!`, '#fff1a8', s.got);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.7, why, '#ffd0c8');
  }
}

/** 카드 가게: 셋 중 하나 (덱 넣기 · 특별 카드 · 빼기) */
function makeOffers(s: KnightState): Offer[] {
  const r = s.rng, st = s.stage, out: Offer[] = [];
  const big = r() < 0.65;
  out.push(big ? { kind: 'add', c: C(10), label: '10 넣기', sub: '큰 칼 카드' } : { kind: 'add', c: C(9), label: '9 넣기', sub: '큰 칼 카드' });
  const sp: Offer[] = [{ kind: 'add', c: C(4 + Math.floor(r() * 4), 1), label: '', sub: '베면 체력 +3' }];
  if (st >= 1) sp.push({ kind: 'add', c: C(5 + Math.floor(r() * 4), 2), label: '', sub: '등딱지 꿰뚫기' });
  const pick = sp[Math.floor(r() * sp.length)];
  if (!pick.label) pick.label = `${pick.c.su === 1 ? '♥' : '♠'}${pick.c.v} 넣기`;
  out.push(pick);
  const plain = s.deck.filter((c) => c.su === 0).map((c) => c.v);
  const small = Math.min(...plain);
  if (r() < 0.7 || !plain.includes(10)) out.push({ kind: 'rem', c: C(small), label: `${small} 빼기`, sub: '작은 카드 버리기' });
  else out.push({ kind: 'rem', c: C(10), label: '10 빼기', sub: '덜 넘쳐요' });
  return shuffleIn(out, r);
}
function applyOffer(s: KnightState, o: Offer) {
  if (o.kind === 'add') s.deck.push({ ...o.c });
  else {
    const i = s.deck.findIndex((c) => c.su === 0 && c.v === o.c.v);
    if (i >= 0) s.deck.splice(i, 1);
  }
}

/** 측정용: k판부터 시작하는 새 판 (덱 = 처음 덱 + 그 판까지 들어오는 카드) */
export function cardknightAt(seed: number, stage: number): KnightState {
  const s = cardknight.create(seed);
  for (let k = 1; k <= stage; k++) {
    s.stage = k;
    newStage(s, false);
  }
  s.newsQ = [];
  return s;
}

// ───────────────────────────── 게임 ─────────────────────────────
export const cardknight: GameDef<KnightState> = {
  id: 'cardknight',
  name: '21 카드 기사단',
  genes: ['blackjack', 'pushluck', 'pointer'],
  twist: '뽑은 카드 숫자만큼 기사의 칼이 길어지고 괴물도 같은 더미에서 뽑는다 — 남은 카드를 세어 일찍 멈추면 뒤에 뽑는 괴물이 넘치고, 내가 가게에서 넣은 10은 괴물에게도 간다',
  rules: ['더미를 톡 → 카드만큼 칼이 길어져요. 기사를 톡 → 베기!', '21을 넘으면 철퍼덕, 딱 21이면 블랙잭 두 배!', '괴물 숫자보다 크면 이겨요 — 차이만큼 체력이 깎여요.'],
  controls: 'touch',
  hint: '더미 톡 = 한 장 더 · 기사 톡 = 베기 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '동물 기사단의 카드 결투장',
    mood: '천막 아래 초록 펠트 결투 탁자 — 꼬마 등불이 흔들리고, 은빛 갑옷 토끼 기사와 괴물이 카드를 겨루며, 나무 울타리 너머 동물 관중이 폴짝거린다.',
    palette: { bg: '#24163a', ink: '#fff8ec', muted: '#cdb9e6', accent: '#ffd166', hot: '#ff5a6e', soft: '#f3e2c4' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'intro', pt: 0,
      deck: START_DECK(), pile: [], disc: [], hand: [], mh: [],
      hp: KHP, mhp: 1, mmax: 1, ex: 0, order: 'fixed', mstop: 0, combo: 0, busted: false, bjN: 0, bustN: 0, wins: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, retry: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], startT: 0, clearT: 0,
      down: false, ax: 0.5, ay: 0.5, taps: 0, lastTap: -99, land: 0, auto: 0, next: 0,
      fly: [], res: null, offers: [], shopN: 0, shuffleT: -999, picked: -1, pickT: -99, log: [],
    } as KnightState;
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    const x = s.ax, y = s.ay;
    if (press) s.lastTap = s.t;
    switch (s.phase) {
      case 'intro':
        if (s.pt >= (s.retry ? INTRO_RETRY : INTRO_T) || (press && s.pt > 24)) beginExchange(s);
        return;
      case 'mon':
        if (s.t < s.next) return;
        if (monNeeds(s)) (monDraw(s), (s.next = s.t + MDRAW));
        else if (s.order === 'first') (s.phase = 'deal'), (s.pt = 0), (s.next = s.t + 14);
        else resolve(s);
        return;
      case 'deal':
        if (s.t < s.next) return;
        if (s.hand.length < 2) (knightDraw(s), (s.next = s.t + DEAL_GAP));
        else if (s.t >= s.land) (s.phase = 'me'), (s.pt = 0);
        return;
      case 'me':
        if (s.auto) {
          if (s.t >= s.auto) stand(s);
          return;
        }
        if (!press || s.t < s.land) return;
        if (inDeck(x, y)) (s.taps++, s.log.push('d'), knightDraw(s, true));
        else if (inKnight(x, y) || inMon(x, y)) (s.taps++, s.log.push('k'), stand(s));
        else ev(s, 'miss', x, y, '더미 톡 = 한 장 더 · 기사 톡 = 베기', '#fff3df');
        return;
      case 'res':
        if (s.res && s.t >= s.res.end) {
          if (s.mhp <= 0) finish(s, true);
          else if (s.hp <= 0) finish(s, false, '기사가 쓰러졌어요');
          else beginExchange(s);
        }
        return;
      case 'result':
        if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
          if (s.ok) {
            if (s.won) s.dead = true;
            else (s.phase = 'shop'), (s.pt = 0), (s.offers = makeOffers(s)), (s.picked = -1), see(s, 'shop', '🛒 카드 가게 — 하나 골라 덱을 고쳐요');
          } else if (s.hearts <= 0) s.dead = true;
          else newStage(s, true);
        }
        return;
      case 'shop':
        if (s.picked >= 0) {
          if (s.t - s.pickT > 40) s.stage++, s.shopN++, newStage(s, false);
          return;
        }
        if (!press || s.pt < 20) return;
        for (let i = 0; i < s.offers.length; i++)
          if (Math.abs(x - offerX(i)) < OFFER_W / 2 && Math.abs(y - OFFER_Y) < OFFER_H / 2) {
            s.picked = i;
            s.pickT = s.t;
            s.taps++;
            s.log.push('o' + i);
            applyOffer(s, s.offers[i]);
            ev(s, 'buy', offerX(i), OFFER_Y, s.offers[i].kind === 'add' ? '덱에 쏙!' : '덱에서 휙!', '#fff1a8');
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

// ───────────────────────────── 봇 ─────────────────────────────
/** 봇이 보는 것: 다음에 뽑힐 카드들의 묶음(숫자·무늬별 장수) — 사람이 아래 판에서 보는 것과 같다 */
interface Grp { c: Card; n: number }
function groups(src: Card[]): Grp[] {
  const m = new Map<string, Grp>();
  for (const c of src) {
    const k = c.v * 4 + c.su;
    const g = m.get(String(k));
    if (g) g.n++;
    else m.set(String(k), { c, n: 1 });
  }
  return [...m.values()];
}
interface Ctx { memo: Map<number, Map<string, number[]>>; d: StageDef; stop: number; hp: number; mhp: number; mmax: number; combo: number; busted: boolean; bjN: number; order: Order; mknown: number }
/** 잘하는 봇의 별 무게 (측정 스크립트가 바꿔 볼 수 있게 내보낸다) */
export const BOTW = { W2: 80, W3: 90 };
/** 한 차례가 끝났을 때의 값: 괴물 체력을 깎은 몫 − 내 체력 잃은 몫 + 별(안 넘치기 · 체력 반 넘게). pz = 이번에 뽑은 독 카드 수 */
function util(c: Ctx, k: number, hearts: number, pierce: boolean, pz: number, mm: number) {
  const o = outcome(c.d, k, mm, c.combo, hearts, pierce);
  const hp0 = Math.max(1, c.hp - POISON * pz), heal = Math.min(KHP - hp0, o.heal), hp = hp0 + heal - o.dk, mhp = c.mhp - o.dm;
  let u = mhp <= 0 ? 220 : (o.dm / c.mmax) * 140;
  if (hp <= 0) u -= 320;
  else u -= ((c.hp - hp0 + o.dk) / KHP) * 140 * (1 + Math.max(0, 12 - hp) / 8);
  u += (heal / KHP) * 100;
  if (o.bust && c.d.nstar >= 2 && !c.busted) u -= BOTW.W2;
  if (c.d.nstar >= 3 && c.hp > KHP / 2 && hp <= KHP / 2) u -= BOTW.W3;
  return u;
}
/** 남은 카드 장수(q[1..10])로 괴물이 끝에 가질 숫자의 분포 — 적으면 정확히(뽑은 카드는 빠진다), 많으면 비율로 */
function monDistQ(q: number[], cont: (m: number) => boolean, memo: Map<string, number[]>): number[] {
  const key = q.join(',');
  const hit = memo.get(key);
  if (hit) return hit;
  let n = 0;
  for (let v = 1; v <= 10; v++) n += q[v];
  let out: number[];
  if (n > 16) {
    out = new Array(22).fill(0);
    let cur = new Array(32).fill(0);
    cur[0] = 1;
    for (let it = 0; it < 14; it++) {
      const nx = new Array(32).fill(0);
      let any = false;
      for (let sm = 0; sm < 32; sm++) {
        if (!cur[sm]) continue;
        if (sm > 21) out[0] += cur[sm];
        else if (!cont(sm)) out[sm] += cur[sm];
        else {
          any = true;
          for (let v = 1; v <= 10; v++) if (q[v]) nx[sm + v] += (cur[sm] * q[v]) / n;
        }
      }
      cur = nx;
      if (!any) break;
    }
  } else {
    out = new Array(22).fill(0);
    const rec = (sm: number, p: number, left: number) => {
      if (sm > 21) return void (out[0] += p);
      if (!cont(sm) || !left) return void (out[sm] += p);
      for (let v = 1; v <= 10; v++)
        if (q[v]) {
          const pv = (p * q[v]) / left;
          q[v]--;
          rec(sm + v, pv, left - 1);
          q[v]++;
        }
    };
    rec(0, 1, n);
  }
  memo.set(key, out);
  return out;
}
function standValue(c: Ctx, k: number, hearts: number, pierce: boolean, pz: number, gs: Grp[]) {
  if (c.order === 'first' || c.order === 'fixed') return util(c, k, hearts, pierce, pz, c.mknown);
  const a = k > 21 ? 0 : k, stop = c.stop, ch = !!c.d.chase;
  const q = new Array(11).fill(0);
  for (const g of gs) if (g.c.su !== 3) q[g.c.v] += g.n;
  let memo = c.memo.get(ch ? a : -1);
  if (!memo) c.memo.set(ch ? a : -1, (memo = new Map()));
  const dist = monDistQ(q, (x) => x < stop && (!ch || x <= a), memo);
  let v = 0;
  for (let mm = 0; mm <= 21; mm++) if (dist[mm] > 1e-6) v += dist[mm] * util(c, k, hearts, pierce, pz, mm === 0 ? 22 : mm);
  return v;
}
function hitValue(c: Ctx, k: number, hearts: number, pierce: boolean, pz: number, gs: Grp[], total: number, depth: number): number {
  let v = 0;
  for (const g of gs) {
    if (!g.n) continue;
    const p = g.n / total, k2 = k + g.c.v, h2 = hearts + (g.c.su === 1 ? 1 : 0), p2 = pierce || g.c.su === 2, z2 = pz + (g.c.su === 3 ? 1 : 0);
    g.n--;
    const st = standValue(c, k2, h2, p2, z2, gs);
    const x = k2 >= 21 || depth <= 1 ? st : Math.max(st, hitValue(c, k2, h2, p2, z2, gs, total - 1, depth - 1));
    g.n++;
    v += p * x;
  }
  return v;
}
/** 지금 한 장 더 뽑는 게 나은가 — 남은 카드(사람이 아래 판에서 보는 것)로 몇 장 앞까지 기댓값을 계산한다 */
export function smartHit(s: KnightState): boolean {
  const d = STAGES[s.stage], k = handSum(s.hand);
  if (k >= 21) return false;
  // 더미가 거의 비면 버린 카드가 다시 섞여 들어오니 둘을 합쳐 본다 (사람도 아래 판에서 '섞어요'를 본다)
  const src = s.pile.length >= 6 ? s.pile : [...s.pile, ...s.disc];
  const c: Ctx = { memo: new Map(), d, stop: s.mstop, hp: s.hp, mhp: s.mhp, mmax: s.mmax, combo: s.combo, busted: s.busted, bjN: s.bjN, order: s.order, mknown: s.order === 'fixed' ? d.fixed! : rawSum(s.mh) };
  const hearts = s.hand.filter((x) => x.su === 1).length, pierce = s.hand.some((x) => x.su === 2);
  const gs = groups(src);
  const st = standValue(c, k, hearts, pierce, 0, gs), ht = hitValue(c, k, hearts, pierce, 0, gs, src.length, gs.length > 14 ? 2 : 3);
  return ht > st + 0.01;
}
/** 가게: 앞으로 남은 판에 무엇이 쓸모 있나 */
function offerValue(s: KnightState, o: Offer) {
  const ahead = STAGES.slice(s.stage + 1), shields = ahead.filter((d) => d.shield).length, spades = s.deck.filter((c) => c.su === 2).length;
  if (o.kind === 'add' && o.c.su === 2) return shields ? 40 - spades * 8 : 6;
  if (o.kind === 'add' && o.c.su === 1) return 22;
  if (o.kind === 'rem') return o.c.v <= 2 ? 18 : 4;
  return o.c.v >= 10 ? 14 : 10;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapDeck = () => at(DECK_X, DECK_Y);
const tapKnight = () => at(KX, 0.75);
const brain = new WeakMap<object, { key: string; hit: boolean }>();
/** 사람처럼: 카드가 내려앉고 조금 본 다음 */
const ready = (s: KnightState) => !s.down && s.phase === 'me' && !s.auto && s.t >= s.land + 12 && s.pt >= 10;
const shopReady = (s: KnightState) => !s.down && s.phase === 'shop' && s.picked < 0 && s.pt >= 50;

/** 잘하는 봇: 남은 카드로 기댓값을 계산해 뽑기·베기를 고르고(별까지 셈), 가게에선 남은 괴물에 맞는 카드를 고른다 */
export const cardknightSmart: Bot<KnightState> = {
  name: '카드 세는 기사',
  act(s) {
    if (shopReady(s)) {
      let bi = 0;
      s.offers.forEach((o, i) => offerValue(s, o) > offerValue(s, s.offers[bi]) && (bi = i));
      return at(offerX(bi), OFFER_Y);
    }
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.ex}:${s.hand.length}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, hit: smartHit(s) }));
    return m.hit ? tapDeck() : tapKnight();
  },
};
/** 버릇 봇: 합이 17 미만이면 늘 뽑기, 가게에선 늘 맨 왼쪽 */
export const cardknightHabit: Bot<KnightState> = {
  name: '버릇: 17 미만이면 뽑기',
  act(s) {
    if (shopReady(s)) return at(offerX(0), OFFER_Y);
    if (!ready(s)) return NO;
    return handSum(s.hand) < 17 ? tapDeck() : tapKnight();
  },
};
/** 독립 버릇 봇: 괴물 숫자를 넘으면 바로 베기(괴물이 아직 안 뽑았으면 15부터 베기), 가게에선 늘 맨 오른쪽 */
export const cardknightHabit2: Bot<KnightState> = {
  name: '버릇: 괴물보다 크면 베기',
  act(s) {
    if (shopReady(s)) return at(offerX(2), OFFER_Y);
    if (!ready(s)) return NO;
    const k = handSum(s.hand), d = STAGES[s.stage];
    const m = s.order === 'fixed' ? d.fixed! : s.order === 'first' ? rawSum(s.mh) : -1;
    if (m < 0) return k >= 15 ? tapKnight() : tapDeck();
    return k > m || m > 21 ? tapKnight() : tapDeck();
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 데나(더미·기사·괴물·가게 카드 근처) 톡 */
export const cardknightRandom: Bot<KnightState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const r = rng(), j = () => (rng() - 0.5) * 0.08;
    let x = rng(), y = rng() * A;
    if (s.phase === 'shop') {
      const i = Math.floor(rng() * 3);
      if (r < 0.8) (x = offerX(i) + j()), (y = OFFER_Y + j());
    } else if (r < 0.4) (x = DECK_X + j()), (y = DECK_Y + j());
    else if (r < 0.7) (x = KX + j()), (y = 0.75 + j());
    else if (r < 0.8) (x = MX + j()), (y = 0.75 + j());
    m.p = { x, y: y / A };
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.2);
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
type F = (x: number) => number;
type FontF = (sz: number, wgt?: number) => void;

function drawAll(ctx: CanvasRenderingContext2D, s: KnightState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X: F = (x) => x * w, Y: F = (y) => y * w, R: F = (r) => r * w;
  const font: FontF = (sz, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawTent(ctx, s, w, h, X, Y, R);
  drawCrowd(ctx, s, X, Y, R, t);
  drawTable(ctx, X, Y, R, w);
  drawBars(ctx, s, X, Y, R, font);
  drawDeck(ctx, s, X, Y, R, font);
  drawFighters(ctx, s, X, Y, R, font, w);
  drawHands(ctx, s, X, Y, R, font);
  drawFlying(ctx, s, X, Y, R);
  drawBoard(ctx, s, X, Y, R, font, w);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.48, R(0.45), w / 2, h * 0.48, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,2,20,.38)');
  ctx.fillStyle = vg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && e.kind !== 'clear' ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'card') fx.burst(x, y, '#fff3c4', 8, 1.8, 1.6), fx.pop(x, y - R(0.07), e.text!, e.col!, 16);
    if (e.kind === 'mcard') fx.burst(x, y, '#ffd6b0', 6, 1.5, 1.5);
    if (e.kind === 'deal') fx.burst(X(KX), Y(HAND_Y), '#fff3c4', 6, 1.5, 1.5);
    if (e.kind === 'mbust') fx.kick(5), fx.burst(X(MX), Y(0.8), '#c8f7c5', 26, 4, 2.6), fx.ring(X(MX), Y(0.8), '#c8f7c5', R(0.16), 4);
    if (e.kind === 'bust') fx.kick(9), fx.burst(X(KX + 0.12), Y(0.9), '#e9d3a6', 26, 3.6, 2.8);
    if (e.kind === 'bj') {
      fx.blink('#fff3b0', 0.5), fx.kick(12), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.5), 8);
      fx.burst(X(0.5), Y(0.62), '#ffe066', 50, 7, 3.4), fx.burst(X(0.5), Y(0.62), '#ff8fd8', 30, 6, 3);
    }
    if (e.kind === 'hit') fx.kick(e.col === '#ffe066' ? 10 : 5), fx.burst(X(MX), Y(0.8), e.col!, 18, 4, 2.4), !(s.res && (s.res.bj || s.res.mbust)) && fx.pop(X(MX), Y(0.66), e.text!, e.col!, 26), fx.ring(X(MX), Y(0.8), '#ffffff', R(0.12), 4);
    if (e.kind === 'shield' || e.kind === 'pierce') fx.pop(x, y, e.text!, e.col!, 16), fx.ring(X(MX), Y(0.72), '#cfe3ff', R(0.1), 3);
    if (e.kind === 'combo') fx.pop(x, y, e.text!, e.col!, 20), fx.burst(x, y, '#ffb3ec', 14, 3, 2);
    if (e.kind === 'hurt') fx.kick(6), fx.blink(th.hot, 0.18), fx.burst(X(KX), Y(0.72), '#ff9a8a', 16, 3.4, 2.4), fx.pop(X(KX), Y(0.6), e.text!, e.col!, 24);
    if (e.kind === 'tie') fx.burst(X(0.5), Y(0.68), '#e8f0ff', 20, 4, 2), fx.ring(X(0.5), Y(0.68), '#e8f0ff', R(0.1), 3), fx.pop(X(0.5), Y(0.6), e.text!, e.col!, 18);
    if (e.kind === 'heal') fx.pop(x, y, e.text!, e.col!, 18), fx.burst(x, y, '#ff9ec4', 10, 2, 2);
    if (e.kind === 'poison' || e.kind === 'mpoison') fx.pop(x, y, e.text!, e.col!, 18), fx.burst(x, y, '#b07aff', 16, 3, 2.4), fx.kick(4);
    if (e.kind === 'shuffle') fx.pop(x, y, e.text!, e.col!, 16), fx.ring(X(DECK_X), Y(DECK_Y), '#d6f0ff', R(0.12), 3);
    if (e.kind === 'miss') fx.pop(Math.max(R(0.36), Math.min(w - R(0.36), x)), Math.min(y, Y(1.1)), e.text!, e.col!, 13);
    if (e.kind === 'buy') fx.burst(x, y, '#fff1a8', 24, 4, 2.6), fx.ring(x, y, '#fff1a8', R(0.15), 4), fx.pop(x, y - R(0.2), e.text!, e.col!, 18);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.15);
    if (e.kind === 'clear') fx.burst(X(0.5), Y(0.7), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.7), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.7), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  drawBigMoments(ctx, s, Y, R, font, w);
  ctx.restore();
  if (s.phase === 'shop') drawShop(ctx, s, w, X, Y, R, font);
  drawSpot(ctx, s, w, X, Y, R, font);
  drawHud(ctx, s, d, w, Y, R, font, th);
}

function drawTent(ctx: CanvasRenderingContext2D, s: KnightState, w: number, h: number, X: F, Y: F, R: F) {
  const t = s.t;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1b1030');
  g.addColorStop(0.25, '#2f1b44');
  g.addColorStop(0.6, '#3a2238');
  g.addColorStop(1, '#1d1222');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 천막 줄무늬
  for (let k = 0; k < 9; k++) {
    const x0 = X(k / 8 - 0.0625), x1 = X(k / 8 + 0.0625);
    ctx.fillStyle = k % 2 ? 'rgba(255,90,110,.16)' : 'rgba(255,240,220,.07)';
    ctx.beginPath();
    ctx.moveTo(X(0.5) + (x0 - X(0.5)) * 0.2, Y(-0.02));
    ctx.lineTo(X(0.5) + (x1 - X(0.5)) * 0.2, Y(-0.02));
    ctx.lineTo(x1, Y(0.33));
    ctx.lineTo(x0, Y(0.33));
    ctx.closePath();
    ctx.fill();
  }
  // 등불 줄
  for (let row = 0; row < 2; row++) {
    const y0 = row ? 0.12 : 0.085, sag = row ? 0.035 : 0.025;
    ctx.strokeStyle = 'rgba(40,20,10,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(X(x), Y(y0 + sag * Math.sin(Math.PI * x)));
    ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const x = (k + 0.5 + row * 0.5) / 9.5, yy = y0 + sag * Math.sin(Math.PI * x) + 0.012;
      const on = 0.6 + 0.4 * Math.sin(t * 0.07 + k * 1.7 + row);
      const col = ['#ffd166', '#ff8fb1', '#8fd8ff', '#b7ff9a'][(k + row) % 4];
      const gl = ctx.createRadialGradient(X(x), Y(yy), 0, X(x), Y(yy), R(0.045));
      gl.addColorStop(0, col);
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.35 * on;
      ctx.fillStyle = gl;
      ctx.fillRect(X(x) - R(0.05), Y(yy) - R(0.05), R(0.1), R(0.1));
      ctx.globalAlpha = 1;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(X(x), Y(yy), R(0.008), 0, TAU);
      ctx.fill();
    }
  }
  // 무대 빛
  const sp = ctx.createRadialGradient(X(0.5), Y(0.7), R(0.05), X(0.5), Y(0.72), R(0.7));
  sp.addColorStop(0, 'rgba(255,230,170,.22)');
  sp.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, w, h);
}

const CROWD = ['🐰', '🐻', '🐼', '🐷', '🐱', '🦊', '🐭', '🐨', '🐵', '🐔', '🐶', '🐹'];
function drawCrowd(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, t: number) {
  const r = s.res, age = r ? t - r.t0 : 999;
  const cheer = r && r.bj && age < 110 ? 1 : r && r.win > 0 && age > 18 && age < 60 ? 0.5 : 0;
  const laugh = r && r.bust && age > 20 && age < 100;
  const gasp = r && r.win < 0 && !r.bust && age > 20 && age < 70;
  // 관람석 계단
  for (let row = 0; row < 2; row++) {
    const yy = 0.165 + row * 0.07;
    ctx.fillStyle = row ? '#4a2c2a' : '#3b2230';
    ctx.fillRect(0, Y(yy), X(1), R(0.07));
    ctx.fillStyle = 'rgba(255,220,180,.12)';
    ctx.fillRect(0, Y(yy), X(1), R(0.006));
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 13; k++) {
    const row = k % 2, x = 0.04 + k * 0.077, base = 0.165 + row * 0.07 + 0.012;
    const ph = hsh(k + 7) * TAU, jump = cheer ? Math.abs(Math.sin(t * 0.25 + ph)) * 0.035 * cheer : Math.abs(Math.sin(t * 0.05 + ph)) * 0.006;
    const y = base - jump;
    ctx.font = `${Math.max(14, R(0.062))}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(CROWD[k % CROWD.length], X(x), Y(y));
    if (laugh && k % 3 === 1) {
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui`;
      ctx.fillStyle = '#fff3a8';
      ctx.fillText('ㅋㅋ', X(x + 0.03), Y(y - 0.045) - Math.sin(t * 0.3 + k) * 2);
    }
    if (gasp && k % 4 === 2) {
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui`;
      ctx.fillStyle = '#ffd0c8';
      ctx.fillText('아야!', X(x + 0.02), Y(y - 0.045));
    }
    if (cheer === 1 && k % 3 === 0) {
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui`;
      ctx.fillStyle = '#ffe066';
      ctx.fillText('와!', X(x + 0.03), Y(y - 0.05));
    }
  }
  // 나무 울타리
  const fy = 0.3;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fillRect(0, Y(fy + 0.05), X(1), R(0.02));
  const wood = ctx.createLinearGradient(0, Y(fy), 0, Y(fy + 0.05));
  wood.addColorStop(0, '#b77a48');
  wood.addColorStop(1, '#7a4a2a');
  ctx.fillStyle = wood;
  ctx.fillRect(0, Y(fy), X(1), R(0.05));
  ctx.strokeStyle = 'rgba(60,30,10,.5)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 12; k++) (ctx.beginPath(), ctx.moveTo(X(k / 12), Y(fy)), ctx.lineTo(X(k / 12), Y(fy + 0.05)), ctx.stroke());
  ctx.fillStyle = 'rgba(255,230,190,.3)';
  ctx.fillRect(0, Y(fy), X(1), R(0.005));
}

function drawTable(ctx: CanvasRenderingContext2D, X: F, Y: F, R: F, w: number) {
  const cx = X(0.5), cy = Y(0.76), rx = R(0.53), ry = R(0.3);
  // 두께 + 그림자
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.06), rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a3218';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.035), rx, ry, 0, 0, TAU);
  ctx.fill();
  // 나무 테
  const rim = ctx.createLinearGradient(0, cy - ry, 0, cy + ry);
  rim.addColorStop(0, '#c88a52');
  rim.addColorStop(1, '#8a5228');
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();
  // 펠트
  const felt = ctx.createRadialGradient(cx, cy - ry * 0.2, R(0.05), cx, cy, rx);
  felt.addColorStop(0, '#3fa86a');
  felt.addColorStop(0.7, '#2a7d4c');
  felt.addColorStop(1, '#1d5c37');
  ctx.fillStyle = felt;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - R(0.03), ry - R(0.025), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,230,160,.35)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx - R(0.07), ry - R(0.06), 0, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  // 펠트 무늬: 가운데 21 문장
  ctx.font = `900 ${Math.max(14, R(0.07))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,240,190,.10)';
  ctx.fillText('21', cx, cy - R(0.02));
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - R(0.2), rx * 0.7, R(0.03), 0, Math.PI, TAU);
  ctx.stroke();
  void w;
}

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, bw: number, bh: number, q: number, col: string, ghost: number) {
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.beginPath();
  ctx.roundRect(x, y, bw, bh, bh / 2);
  ctx.fill();
  if (ghost > q) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.roundRect(x + 1.5, y + 1.5, Math.max(0, (bw - 3) * ghost), bh - 3, (bh - 3) / 2);
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y, 0, y + bh);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,.25)');
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, Math.max(0, (bw - 3) * q), bh - 3, (bh - 3) / 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(x + 4, y + 2.5, Math.max(0, (bw - 8) * q), 2);
}

/** 체력 막대 (울타리 위) — 결과 연출 중엔 깎이기 전 값을 흐리게 */
function drawBars(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF) {
  const r = s.res, d = STAGES[s.stage], t = s.t;
  let khp = s.hp, mhp = s.mhp, kg = s.hp, mg = s.mhp;
  if (r && s.phase === 'res') {
    const age = t - r.t0, hitAt = r.bj ? 30 : 20, hurtAt = r.bust ? 50 : 24;
    if (age < hitAt) (mhp = s.mhp + r.dm), (mg = mhp);
    else mg = s.mhp + r.dm * Math.max(0, 1 - (age - hitAt) / 30);
    if (age < hurtAt) (khp = s.hp + r.dk - (age < 34 ? r.heal : 0)), (kg = khp);
    else kg = s.hp + r.dk * Math.max(0, 1 - (age - hurtAt) / 30);
  }
  const y = Y(0.31), bw = R(0.3), bh = R(0.032);
  font(0.032, 900);
  ctx.textBaseline = 'middle';
  // 기사
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🐰', X(0.025), y + bh / 2);
  bar(ctx, X(0.09), y, bw, bh, khp / KHP, khp <= KHP / 2 ? '#ff8a5a' : '#5fd47a', kg / KHP);
  if (d.nstar >= 3) {
    // 별 '체력 반 넘게' 눈금
    const mx = X(0.09) + bw / 2;
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(mx - R(0.012), y - R(0.014));
    ctx.lineTo(mx + R(0.012), y - R(0.014));
    ctx.lineTo(mx, y + R(0.002));
    ctx.fill();
    ctx.fillRect(mx - 1, y + 1, 2, bh - 2);
  }
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  font(0.028, 900);
  ctx.fillText(`${Math.ceil(khp)}`, X(0.09) + bw / 2, y + bh / 2 + 1);
  // 괴물
  font(0.032, 900);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(d.emoji, X(0.975), y + bh / 2);
  bar(ctx, X(0.91) - bw, y, bw, bh, mhp / s.mmax, '#ff8a4c', mg / s.mmax);
  ctx.textAlign = 'center';
  font(0.028, 900);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${Math.ceil(mhp)}`, X(0.91) - bw / 2, y + bh / 2 + 1);
  if (d.shield) {
    font(0.026, 900);
    ctx.fillStyle = '#cfe3ff';
    ctx.fillText(`🛡️${d.shield}`, X(0.91) - bw - R(0.035), y + bh / 2);
  }
}

/** 카드 한 장 (가운데 x,y · 폭 cw) */
function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, c: Card | null, rot = 0, glow = 0, t = 0) {
  const ch = cw * 1.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.roundRect(-cw / 2 + 2, -ch / 2 + 3, cw, ch, cw * 0.14);
  ctx.fill();
  if (glow > 0) {
    ctx.shadowColor = '#ffe066';
    ctx.shadowBlur = 14 * glow;
  }
  if (!c) {
    // 뒷면: 남색 + 금색 발바닥 무늬
    ctx.fillStyle = '#2b3a8c';
    ctx.beginPath();
    ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-cw / 2 + cw * 0.09, -ch / 2 + cw * 0.09, cw * 0.82, ch - cw * 0.18, cw * 0.08);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,209,102,.85)';
    const pr = cw * 0.1;
    ctx.beginPath();
    ctx.ellipse(0, pr * 0.9, pr * 1.4, pr * 1.15, 0, 0, TAU);
    ctx.fill();
    for (let k = 0; k < 4; k++) (ctx.beginPath(), ctx.arc((k - 1.5) * pr * 1.15, -pr * (k === 0 || k === 3 ? 0.6 : 1.2), pr * 0.55, 0, TAU), ctx.fill());
    ctx.restore();
    return;
  }
  const pz = c.su === 3;
  const face = ctx.createLinearGradient(0, -ch / 2, 0, ch / 2);
  face.addColorStop(0, pz ? '#d7b8ff' : '#fffdf6');
  face.addColorStop(1, pz ? '#8a5ad0' : '#efe6d4');
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.roundRect(-cw / 2, -ch / 2, cw, ch, cw * 0.14);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = pz ? '#5a2a90' : c.su === 1 ? '#f2a0b4' : c.su === 2 ? '#9aa6d8' : '#d8c8a8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const col = c.su === 1 ? '#e2364f' : c.su === 2 ? '#2a3570' : pz ? '#3a1060' : '#3a2a1a';
  if (pz) {
    ctx.font = `${Math.max(12, cw * 0.46)}px system-ui`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('☠️', 0, -ch * 0.12 + Math.sin(t * 0.2) * 1.2);
    ctx.font = `900 ${Math.max(10, cw * 0.3)}px system-ui, sans-serif`;
    ctx.fillStyle = col;
    ctx.fillText('0', 0, ch * 0.3);
  } else {
    ctx.font = `900 ${Math.max(12, cw * 0.56)}px system-ui, sans-serif`;
    ctx.fillStyle = col;
    ctx.fillText(String(c.v), 0, cw * 0.08);
    // 무늬: 칼 · ♥ · ♠
    const py = -ch * 0.33, ps = cw * 0.2;
    if (c.su === 0) {
      ctx.strokeStyle = '#8a7a66';
      ctx.lineWidth = Math.max(1.2, cw * 0.05);
      ctx.beginPath();
      ctx.moveTo(-ps * 0.9, py + ps * 0.6);
      ctx.lineTo(ps * 0.9, py - ps * 0.6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-ps * 0.7, py + ps * 0.05);
      ctx.lineTo(-ps * 0.15, py + ps * 0.75);
      ctx.stroke();
    } else {
      ctx.font = `900 ${Math.max(10, cw * 0.3)}px system-ui, sans-serif`;
      ctx.fillStyle = col;
      ctx.fillText(c.su === 1 ? '♥' : '♠', 0, py);
      ctx.fillText(c.su === 1 ? '♥' : '♠', 0, ch * 0.34);
    }
  }
  ctx.restore();
}

function drawDeck(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF) {
  const n = s.pile.length, t = s.t, my = s.phase === 'me' && !s.auto;
  const cw = R(DECK_W), x = X(DECK_X), y = Y(DECK_Y);
  const layers = Math.min(10, Math.ceil(n / 2));
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + cw * 0.7 + 4, cw * 0.62, cw * 0.14, 0, 0, TAU);
  ctx.fill();
  for (let k = 0; k < layers; k++) {
    const yy = y - k * 1.6;
    ctx.fillStyle = k % 2 ? '#e8dcc0' : '#d9caa8';
    ctx.beginPath();
    ctx.roundRect(x - cw / 2, yy - cw * 0.7 + cw * 1.4 - 3, cw, 3, 1.5);
    ctx.fill();
  }
  const bob = my ? Math.sin(t * 0.15) * 2.5 : 0, top = y - layers * 1.6 - bob;
  if (n > 0) drawCard(ctx, x, top, cw, null, 0, my ? 0.6 + 0.4 * Math.sin(t * 0.15) : 0);
  font(0.03, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.beginPath();
  ctx.roundRect(x - R(0.06), y + cw * 0.75, R(0.12), R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(`${n}장`, x, y + cw * 0.75 + R(0.021));
  if (my) {
    font(0.034, 900);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,10,30,.8)';
    ctx.strokeText('톡! 한 장 더', x, top - cw * 0.85);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText('톡! 한 장 더', x, top - cw * 0.85);
  }
}

/** 손에 든 카드 자리 */
function slotXY(to: 0 | 1, i: number, n: number): [number, number, number] {
  const cx = to ? MX : KX, gap = Math.min(0.06, 0.26 / Math.max(1, n)), x = cx + (i - (n - 1) / 2) * gap;
  return [x, HAND_Y + Math.abs(i - (n - 1) / 2) * 0.006, (i - (n - 1) / 2) * 0.09];
}
const CW = 0.075;
function drawHands(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF) {
  const t = s.t, d = STAGES[s.stage];
  const showH = (to: 0 | 1, hand: Card[]) => {
    const flying = new Set(s.fly.filter((f) => f.to === to && t < f.t0 + FLY).map((f) => f.c));
    hand.forEach((c, i) => {
      if (flying.has(c)) return;
      const [x, y, rot] = slotXY(to, i, hand.length);
      drawCard(ctx, X(x), Y(y), R(CW), c, rot, to === 0 && handSum(s.hand) === 21 ? 0.8 : 0, t);
    });
  };
  if (s.phase !== 'intro' && s.phase !== 'shop') {
    showH(0, s.hand);
    showH(1, s.mh);
  }
  // 숫자 딱지
  const landed = (to: 0 | 1, hand: Card[]) => hand.filter((c) => !s.fly.some((f) => f.c === c && f.to === to && t < f.t0 + FLY));
  const busy = s.phase === 'intro' || s.phase === 'shop' || s.phase === 'result';
  if (busy) return;
  const kh = landed(0, s.hand), k = handSum(kh), mh = landed(1, s.mh), mm = s.order === 'fixed' ? d.fixed! : rawSum(mh);
  const tag = (x: number, txt: string, sub: string, col: string, bg: string, pulse: number) => {
    const y = Y(HAND_Y - 0.115);
    ctx.save();
    ctx.translate(X(x), y);
    ctx.scale(1 + pulse, 1 + pulse);
    font(0.06, 900);
    const tw = Math.max(R(0.11), ctx.measureText(txt).width + R(0.04));
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(-tw / 2, -R(0.035), tw, R(0.07), R(0.035));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.fillText(txt, 0, 1);
    ctx.restore();
    if (sub) {
      font(0.028, 800);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,245,225,.9)';
      ctx.fillText(sub, X(x), y + R(0.058));
    }
  };
  const lastK = s.fly.filter((f) => f.to === 0).reduce((a, f) => Math.max(a, f.t0 + FLY), -99);
  const pk = Math.max(0, 1 - (t - lastK) / 10) * 0.25;
  if (kh.length) tag(KX, k > 21 ? `${k} 넘침` : k === 21 ? '21!' : `${k}`, '', k > 21 ? '#ff8a7a' : k === 21 ? '#ffe066' : '#ffffff', k > 21 ? 'rgba(90,20,20,.9)' : 'rgba(20,30,60,.88)', pk);
  const rule = '';
  const lastM = s.fly.filter((f) => f.to === 1).reduce((a, f) => Math.max(a, f.t0 + FLY), -99);
  const pm = Math.max(0, 1 - (t - lastM) / 10) * 0.25;
  if (s.order === 'fixed' || mh.length) tag(MX, mm > 21 ? `${mm} 넘침` : `${mm}`, rule, mm > 21 ? '#b8ffb0' : mm === 21 ? '#ff9a8a' : '#ffd9b0', 'rgba(70,25,20,.9)', pm);
  else {
    font(0.03, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,240,220,.9)';
    if (s.order === 'after') ctx.fillText('네가 벤 다음에 뽑아요', X(MX - 0.03), Y(HAND_Y - 0.03));
    font(0.06, 900);
    ctx.fillStyle = 'rgba(255,220,180,.7)';
    ctx.fillText('?', X(MX), Y(HAND_Y - 0.11));
  }
  // VS
  font(0.04, 900);
  ctx.fillStyle = 'rgba(255,240,200,.55)';
  ctx.fillText('VS', X(0.5), Y(HAND_Y - 0.1));
}

function drawFlying(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F) {
  const t = s.t;
  for (const f of s.fly) {
    const u = (t - f.t0) / FLY;
    if (u < 0 || u >= 1) continue;
    const hand = f.to ? s.mh : s.hand, i = hand.indexOf(f.c);
    const [tx, ty, trot] = slotXY(f.to, Math.max(0, i), hand.length);
    const q = ease(u), x = DECK_X + (tx - DECK_X) * q, y = DECK_Y - 0.03 + (ty - DECK_Y + 0.03) * q - Math.sin(Math.PI * q) * 0.16;
    const sc = 1 + Math.sin(Math.PI * q) * 0.5, flip = Math.abs(Math.cos(Math.PI * q));
    ctx.strokeStyle = `rgba(255,240,200,${0.3 * (1 - q)})`;
    ctx.lineWidth = R(0.02);
    ctx.beginPath();
    ctx.moveTo(X(DECK_X), Y(DECK_Y - 0.03));
    ctx.quadraticCurveTo(X((DECK_X + x) / 2), Y(Math.min(y, DECK_Y) - 0.08), X(x), Y(y));
    ctx.stroke();
    ctx.save();
    ctx.translate(X(x), Y(y));
    ctx.scale(Math.max(0.08, flip), 1);
    drawCard(ctx, 0, 0, R(CW) * sc, q > 0.5 ? f.c : null, trot * q + (1 - q) * (f.to ? 0.6 : -0.6), 0, t);
    ctx.restore();
  }
}

/** 기사와 괴물 */
function drawFighters(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF, w: number) {
  const t = s.t, r = s.res, d = STAGES[s.stage], age = r ? t - r.t0 : 999;
  const inRes = s.phase === 'res' && !!r;
  const kh = s.hand.filter((c) => !s.fly.some((f) => f.c === c && t < f.t0 + FLY)), k = handSum(kh);
  const mm = s.order === 'fixed' ? d.fixed! : rawSum(s.mh);
  // ── 괴물 ──
  let mx = MX, my = FOOT, mrot = 0, msc = 1, mflash = 0, gone = false;
  if (inRes && r.win > 0) {
    const hitAt = r.bj ? 30 : 20;
    if (r.bj && age >= hitAt) {
      const u = (age - hitAt) / 60;
      mx = MX + u * 0.5;
      my = FOOT - Math.sin(Math.min(1, u) * Math.PI) * 0.5;
      mrot = u * 14;
      if (s.mhp > 0 && u > 1) (mx = MX + Math.max(0, 1 - (u - 1) * 2) * 0.5), (my = FOOT), (mrot = 0);
      gone = s.mhp <= 0 && u > 1;
    } else if (age >= hitAt) {
      const u = Math.min(1, (age - hitAt) / 16);
      mx = MX + Math.sin(u * Math.PI) * 0.05;
      msc = 1 - Math.sin(u * Math.PI) * 0.12;
      mflash = age - hitAt < 6 ? 1 : 0;
    }
  }
  if (s.phase === 'result' && s.ok) gone = true;
  if (inRes && r.win < 0) {
    const hurtAt = r.bust ? 50 : 24, u = (age - hurtAt + 14) / 20;
    if (u > 0 && u < 1) mx = MX - Math.sin(u * Math.PI) * 0.4;
  }
  if (inRes && r.mbust && age < 50) mrot = Math.sin(age * 0.6) * 0.15;
  if (s.phase === 'mon' && s.order !== 'fixed' && rawSum(s.mh) > 21) mrot = Math.sin(t * 0.6) * 0.15;
  const mSweat = (s.phase === 'me' && k > mm && k <= 21 && (s.order === 'first' || s.order === 'fixed')) || (s.phase === 'me' && s.order === 'after' && k >= 19 && k <= 21);
  if (!gone) {
    const sz = R(d.key === 'dragon' ? 0.3 : 0.26);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(X(mx), Y(FOOT), sz * 0.5 * Math.max(0.3, 1 - (FOOT - my) * 2), sz * 0.12, 0, 0, TAU);
    ctx.fill();
    const bob = Math.sin(t * 0.08) * R(0.006), tremble = mSweat ? Math.sin(t * 1.3) * 1.5 : 0;
    ctx.save();
    ctx.translate(X(mx) + tremble, Y(my) - sz * 0.45 + bob);
    ctx.rotate(mrot);
    ctx.scale(msc * -1, msc * (1 + Math.sin(t * 0.08) * 0.02));
    ctx.font = `${sz}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(d.emoji, 0, 0);
    if (mflash) {
      // 맞은 순간 하얗게 번쩍 (그림자 빛으로 — 다른 그림을 덮지 않게)
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = sz * 0.4;
      ctx.globalAlpha = 0.8;
      ctx.fillText(d.emoji, 0, 0);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    ctx.restore();
    // 등딱지
    if (d.shield && !gone) {
      ctx.font = `${Math.max(14, R(0.06))}px system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🛡️', X(mx) - sz * 0.42, Y(my) - sz * 0.3 + bob);
    }
    // 식은땀
    if (mSweat) {
      for (let j = 0; j < 3; j++) {
        const u = ((t * 0.03 + j / 3) % 1), dx = (j - 1) * 0.04;
        ctx.fillStyle = `rgba(140,200,255,${1 - u})`;
        ctx.beginPath();
        const sx = X(mx + dx - 0.02), sy = Y(my - 0.2 + u * 0.08);
        ctx.moveTo(sx, sy - R(0.014));
        ctx.quadraticCurveTo(sx + R(0.01), sy, sx, sy + R(0.008));
        ctx.quadraticCurveTo(sx - R(0.01), sy, sx, sy - R(0.014));
        ctx.fill();
      }
      font(0.03, 900);
      ctx.fillStyle = '#bfe4ff';
      ctx.textAlign = 'center';
      ctx.fillText(t % 60 < 30 ? '헉…' : '땀 뻘뻘', X(mx), Y(my - 0.27));
    } else if (mm === 21 && (s.phase === 'deal' || s.phase === 'me')) {
      font(0.03, 900);
      ctx.fillStyle = '#ffb3a8';
      ctx.textAlign = 'center';
      ctx.fillText('흐흐, 21!', X(mx), Y(my - 0.27));
    }
  }
  // ── 기사 ──
  let mood = 'idle';
  if (s.phase === 'me' || s.phase === 'deal') mood = k > 21 ? 'wow' : k === 21 ? 'proud' : k >= 17 ? 'strain' : 'idle';
  if (inRes) mood = r.bust ? 'dizzy' : r.win > 0 ? 'proud' : r.win < 0 ? 'ouch' : 'idle';
  if (s.phase === 'result') mood = s.ok ? 'proud' : 'dizzy';
  if (s.phase === 'shop') mood = 'proud';
  // 칼 길이 = 합
  let len = 0.05 + Math.min(k, 21) * 0.0125, ang = -0.75 - Math.min(k, 21) * 0.01, tip = 0, fall = 0;
  if (k > 21) (len = 0.05 + k * 0.0145), (ang = -0.2);
  let kx = KX, ky = FOOT;
  if (inRes) {
    if (r.bust) {
      fall = clamp01((age - 8) / 18);
      ang = -0.2 + fall * 0.55;
    } else if (r.win >= 0 || !r.bust) {
      const sw = clamp01((age - 6) / 12), back = clamp01((age - 40) / 20);
      ang = ang + (-0.06 - ang) * sw * (1 - back);
      if (age > 6 && age < 46) kx = KX + 0.06 * Math.sin(clamp01((age - 6) / 30) * Math.PI);
      if (r.bj) {
        const ext = clamp01((age - 16) / 12) * (1 - clamp01((age - 70) / 20));
        len = len + ext * (1.1 - len);
        tip = ext;
      }
    }
    if (r.win < 0) {
      const hurtAt = r.bust ? 50 : 24, u = (age - hurtAt) / 16;
      if (u > 0 && u < 1 && !r.bust) kx = KX - Math.sin(u * Math.PI) * 0.04;
    }
  }
  if (s.phase === 'result' && !s.ok) fall = 1;
  drawKnight(ctx, X(kx), Y(ky), R(0.25), mood, t, R(len), ang, fall, tip, R);
  drawSign(ctx, s, X, Y, R, font);
  // 첫 판 안내 손가락
  if (s.stage === 0 && s.phase === 'me' && !s.auto && s.taps < 2) {
    const bob = Math.sin(t * 0.15) * R(0.012), tx = s.taps === 0 ? DECK_X : KX, ty = s.taps === 0 ? DECK_Y + 0.02 : 0.78;
    ctx.font = `${Math.max(18, R(0.08))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('👆', X(tx) + R(0.03), Y(ty) + R(0.06) + bob);
  }
  // 베기 말풍선
  if (s.phase === 'me' && !s.auto && k > 0 && k < 21) {
    const bx = X(KX + 0.02), by = Y(0.585);
    font(0.032, 900);
    const tx = '톡! 베기', tw = ctx.measureText(tx).width + R(0.04);
    ctx.fillStyle = 'rgba(255,250,235,.95)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx - R(0.01), by + R(0.022));
    ctx.lineTo(bx + R(0.008), by + R(0.042));
    ctx.lineTo(bx + R(0.016), by + R(0.022));
    ctx.fill();
    ctx.fillStyle = '#5a2a10';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tx, bx, by + 1);
  }
  void w;
}

/** 괴물 발치의 나무 팻말: 괴물이 뽑는 규칙 */
function drawSign(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF) {
  const d = STAGES[s.stage];
  if (s.phase === 'shop' || (s.phase === 'result' && s.ok)) return;
  const txt = d.mode === 'fixed' ? `늘 ${d.fixed}` : `${s.mstop}${ga(s.mstop)} 되면 멈춰요`, sub = d.mode === 'fixed' ? '' : s.order === 'after' ? '나중에 뽑아요' : '먼저 뽑아요';
  const x = X(MX + 0.02), y = Y(FOOT + 0.065);
  font(0.03, 900);
  const tw = Math.max(ctx.measureText(txt).width, sub ? ctx.measureText(sub).width : 0) + R(0.04), th = R(sub ? 0.075 : 0.045);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x - R(0.006), y - R(0.02), R(0.012), R(0.05));
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.roundRect(x - tw / 2 + 2, y - th / 2 + 3, tw, th, R(0.01));
  ctx.fill();
  const g = ctx.createLinearGradient(0, y - th / 2, 0, y + th / 2);
  g.addColorStop(0, '#e2b27a');
  g.addColorStop(1, '#b07a44');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - tw / 2, y - th / 2, tw, th, R(0.01));
  ctx.fill();
  ctx.strokeStyle = '#6a4220';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a200c';
  ctx.fillText(txt, x, y - (sub ? R(0.017) : 0));
  if (sub) {
    font(0.028, 900);
    ctx.fillStyle = s.order === 'after' ? '#8a1a10' : '#3a200c';
    ctx.fillText(sub, x, y + R(0.02));
  }
}

/** 은빛 갑옷 토끼 기사 (발 x,y · 키 sz). 칼 길이 L(px), 칼 각도 ang, fall 0~1 = 앞으로 엎어짐 */
function drawKnight(ctx: CanvasRenderingContext2D, x: number, y: number, sz: number, mood: string, t: number, L: number, ang: number, fall: number, tip: number, R: F) {
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath();
  ctx.ellipse(x + fall * sz * 0.4, y, sz * (0.32 + fall * 0.25), sz * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(fall * 1.45);
  const breathe = Math.sin(t * 0.09) * sz * 0.012, s = sz;
  // 망토
  ctx.fillStyle = '#c8384e';
  ctx.beginPath();
  ctx.moveTo(-s * 0.16, -s * 0.52);
  ctx.quadraticCurveTo(-s * 0.36, -s * 0.2, -s * 0.28, -s * 0.02);
  ctx.lineTo(s * 0.02, -s * 0.06);
  ctx.closePath();
  ctx.fill();
  // 다리
  ctx.fillStyle = '#6b7380';
  ctx.beginPath();
  ctx.roundRect(-s * 0.14, -s * 0.14, s * 0.1, s * 0.14, s * 0.03);
  ctx.roundRect(s * 0.04, -s * 0.14, s * 0.1, s * 0.14, s * 0.03);
  ctx.fill();
  // 몸 (갑옷)
  const arm = ctx.createLinearGradient(-s * 0.2, 0, s * 0.2, 0);
  arm.addColorStop(0, '#9aa4b2');
  arm.addColorStop(0.45, '#eef2f7');
  arm.addColorStop(1, '#8a94a3');
  ctx.fillStyle = arm;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.28 + breathe, s * 0.2, s * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,70,90,.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, -s * 0.27 + breathe, s * 0.045, 0, TAU);
  ctx.fill();
  // 귀 (투구 위로 쏙)
  const hy = -s * 0.6 + breathe, wob = Math.sin(t * 0.1) * 0.08 + (mood === 'wow' ? -0.25 : 0);
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * s * 0.07, hy - s * 0.14);
    ctx.rotate(sd * (0.18 + wob * sd) + (mood === 'dizzy' ? sd * 0.5 : 0));
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.14, s * 0.05, s * 0.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb3c6';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.13, s * 0.024, s * 0.11, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 투구
  const hg = ctx.createLinearGradient(-s * 0.2, hy, s * 0.2, hy);
  hg.addColorStop(0, '#8e98a8');
  hg.addColorStop(0.5, '#f4f7fb');
  hg.addColorStop(1, '#8a94a3');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, hy, s * 0.19, Math.PI * 0.95, Math.PI * 2.05);
  ctx.lineTo(s * 0.19, hy + s * 0.1);
  ctx.lineTo(-s * 0.19, hy + s * 0.1);
  ctx.closePath();
  ctx.fill();
  // 얼굴 (투구 창 안)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(s * 0.02, hy + s * 0.04, s * 0.14, s * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,170,190,.6)';
  ctx.beginPath();
  ctx.arc(-s * 0.07, hy + s * 0.08, s * 0.025, 0, TAU);
  ctx.arc(s * 0.11, hy + s * 0.08, s * 0.025, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2a1a1a';
  ctx.fillStyle = '#2a1a1a';
  ctx.lineWidth = Math.max(1.5, s * 0.018);
  const ex = [-s * 0.035, s * 0.075], ey = hy + s * 0.03;
  for (const e of ex) {
    ctx.beginPath();
    if (mood === 'proud') ctx.arc(e, ey + s * 0.01, s * 0.022, Math.PI * 1.1, Math.PI * 1.9);
    else if (mood === 'dizzy') {
      for (let a = 0; a < 6; a += 0.4) ctx.lineTo(e + Math.cos(a + t * 0.2) * a * s * 0.005, ey + Math.sin(a + t * 0.2) * a * s * 0.005);
    } else if (mood === 'strain' || mood === 'ouch') (ctx.moveTo(e - s * 0.02, ey - s * 0.012), ctx.lineTo(e + s * 0.015, ey), ctx.lineTo(e - s * 0.02, ey + s * 0.012));
    else if (mood === 'wow') (ctx.arc(e, ey, s * 0.024, 0, TAU), ctx.stroke(), ctx.beginPath(), ctx.arc(e, ey, s * 0.01, 0, TAU), ctx.fill());
    else ctx.arc(e, ey, s * 0.016, 0, TAU), ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  if (mood === 'wow' || mood === 'ouch') ctx.ellipse(s * 0.02, hy + s * 0.09, s * 0.02, s * 0.025, 0, 0, TAU), ctx.stroke();
  else if (mood === 'strain') (ctx.moveTo(-s * 0.01, hy + s * 0.09), ctx.lineTo(s * 0.05, hy + s * 0.09), ctx.stroke());
  else ctx.arc(s * 0.02, hy + s * 0.075, s * 0.025, 0.2, Math.PI - 0.2), ctx.stroke();
  // 투구 깃털
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.ellipse(-s * 0.12, hy - s * 0.17, s * 0.05, s * 0.09, -0.6 + Math.sin(t * 0.12) * 0.15, 0, TAU);
  ctx.fill();
  // 땀 (무거운 칼)
  if (mood === 'strain' || mood === 'wow') {
    ctx.fillStyle = '#8fd0ff';
    ctx.beginPath();
    ctx.arc(-s * 0.15, hy - s * 0.02 + ((t * 0.6) % (s * 0.1)), s * 0.018, 0, TAU);
    ctx.fill();
  }
  // 팔 + 칼
  const hx = s * 0.17, hyy = -s * 0.32 + breathe;
  ctx.save();
  ctx.translate(hx, hyy);
  ctx.rotate(ang);
  if (tip > 0) {
    const gl = ctx.createLinearGradient(0, 0, L, 0);
    gl.addColorStop(0, 'rgba(255,230,120,0)');
    gl.addColorStop(1, `rgba(255,230,120,${0.6 * tip})`);
    ctx.fillStyle = gl;
    ctx.fillRect(0, -s * 0.09, L, s * 0.18);
  }
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(-s * 0.06, -s * 0.022, s * 0.07, s * 0.044);
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(s * 0.0, -s * 0.06, s * 0.03, s * 0.12);
  const bl = ctx.createLinearGradient(0, -s * 0.03, 0, s * 0.03);
  bl.addColorStop(0, '#ffffff');
  bl.addColorStop(0.5, '#cfd8e4');
  bl.addColorStop(1, '#8e9aab');
  ctx.fillStyle = tip > 0.5 ? '#fff3b0' : bl;
  ctx.beginPath();
  ctx.moveTo(s * 0.03, -s * 0.03);
  ctx.lineTo(s * 0.03 + L - s * 0.05, -s * 0.03);
  ctx.lineTo(s * 0.03 + L, 0);
  ctx.lineTo(s * 0.03 + L - s * 0.05, s * 0.03);
  ctx.lineTo(s * 0.03, s * 0.03);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,70,90,.5)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 칼날 눈금 (합만큼 마디)
  ctx.strokeStyle = 'rgba(80,90,110,.35)';
  for (let q = s * 0.03 + R(0.0125) * 4; q < s * 0.03 + L - s * 0.06; q += R(0.0125) * 4) (ctx.beginPath(), ctx.moveTo(q, -s * 0.02), ctx.lineTo(q, s * 0.02), ctx.stroke());
  ctx.restore();
  ctx.fillStyle = '#c3cbd6';
  ctx.beginPath();
  ctx.arc(hx, hyy, s * 0.05, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 어질어질 별
  if (mood === 'dizzy' && fall > 0.6) {
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j * TAU) / 3;
      ctx.font = `${Math.max(12, s * 0.12)}px system-ui`;
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('💫', x + s * 0.55 + Math.cos(a) * s * 0.18, y - s * 0.12 + Math.sin(a) * s * 0.06);
    }
  }
}

/** 더미에 남은 카드판 — 지금 뽑으면 넘치는 숫자는 빨강, 딱 21은 금색 */
function drawBoard(ctx: CanvasRenderingContext2D, s: KnightState, X: F, Y: F, R: F, font: FontF, w: number) {
  const src = s.pile, cnt = new Array(11).fill(0), hrt = new Array(11).fill(0), spd = new Array(11).fill(0);
  let pzn = 0;
  for (const c of src) {
    if (c.su === 3) pzn++;
    else cnt[c.v]++, c.su === 1 && hrt[c.v]++, c.su === 2 && spd[c.v]++;
  }
  const k = handSum(s.hand), mine = s.phase === 'me' && !s.auto && s.t >= s.land;
  const y0 = Y(BOARD_Y);
  ctx.fillStyle = 'rgba(20,10,30,.75)';
  ctx.beginPath();
  ctx.roundRect(X(0.015), y0 - R(0.03), w - X(0.03), R(0.135), R(0.02));
  ctx.fill();
  font(0.028, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8dcff';
  ctx.fillText('더미에 남은 카드', X(0.035), y0 - R(0.008));
  let red = 0, safe = 0;
  for (let v = 1; v <= 10; v++) (k + v > 21 ? (red += cnt[v]) : (safe += cnt[v]));
  if (mine) {
    ctx.textAlign = 'right';
    ctx.fillStyle = red ? '#ffb0a8' : '#b8ffb0';
    ctx.fillText(red ? `넘치는 카드 ${red}장 / ${red + safe + pzn}장` : '어떤 카드도 안 넘쳐요!', w - X(0.035), y0 - R(0.008));
  }
  // 독 카드가 있는 판은 맨 앞에 ☠ 칸 (0)
  const pzStage = !!STAGES[s.stage].pz, v0 = pzStage ? 0 : 1, cols = 11 - v0;
  const cw = R(pzStage ? 0.068 : 0.072), gap = (w - X(0.06)) / cols;
  if (pzStage) {
    const x = X(0.03) + gap * 0.5, y = y0 + R(0.05);
    ctx.globalAlpha = pzn ? 1 : 0.35;
    ctx.fillStyle = '#c9a2ff';
    ctx.beginPath();
    ctx.roundRect(x - cw / 2, y - R(0.03), cw, R(0.06), R(0.01));
    ctx.fill();
    ctx.font = `${Math.max(12, R(0.036))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('☠️', x, y - R(0.003));
    ctx.globalAlpha = 1;
    font(0.03, 900);
    ctx.fillStyle = pzn ? '#e0c4ff' : 'rgba(255,255,255,.35)';
    ctx.fillText(`×${pzn}`, x, y + R(0.048));
  }
  for (let v = 1; v <= 10; v++) {
    const x = X(0.03) + gap * (v - v0 + 0.5), y = y0 + R(0.05), n = cnt[v];
    const bust = mine && k + v > 21, bj = mine && k + v === 21;
    ctx.globalAlpha = n ? 1 : 0.35;
    ctx.fillStyle = bust ? '#ffb4a8' : bj ? '#ffe066' : '#fffaf0';
    ctx.beginPath();
    ctx.roundRect(x - cw / 2, y - R(0.03), cw, R(0.06), R(0.01));
    ctx.fill();
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = bust ? '#a01818' : '#3a2a1a';
    ctx.fillText(String(v), x, y - R(0.005));
    if (hrt[v] || spd[v]) {
      ctx.font = `900 ${Math.max(10, R(0.022))}px system-ui`;
      ctx.fillStyle = hrt[v] ? '#e2364f' : '#2a3570';
      ctx.fillText(hrt[v] ? '♥' : '♠', x + cw * 0.34, y - R(0.02));
    }
    ctx.globalAlpha = 1;
    font(0.03, 900);
    ctx.fillStyle = n ? (bust ? '#ffb0a8' : '#ffffff') : 'rgba(255,255,255,.35)';
    ctx.fillText(`×${n}`, x, y + R(0.048));
  }
}

/** 큰 순간: 블랙잭 큰 글자, 철퍼덕 큰 글자 */
function drawBigMoments(ctx: CanvasRenderingContext2D, s: KnightState, Y: F, R: F, font: FontF, w: number) {
  const r = s.res, t = s.t;
  if (!r || s.phase !== 'res') return;
  const age = t - r.t0;
  const big = (txt: string, sub: string, col: string, a0: number, dur: number, y: number) => {
    const u = age - a0;
    if (u < 0 || u > dur) return;
    const sc = u < 8 ? 2.2 - 1.2 * (u / 8) : 1, a = Math.min(1, (dur - u) / 14);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(y));
    ctx.rotate(Math.sin(u * 0.2) * 0.04);
    ctx.scale(sc, sc);
    font(0.1, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(40,10,40,.85)';
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = col;
    ctx.fillText(txt, 0, 0);
    if (sub) {
      font(0.042, 900);
      ctx.lineWidth = 4;
      ctx.strokeText(sub, 0, R(0.07));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, 0, R(0.07));
    }
    ctx.restore();
  };
  if (r.bj) big('블랙잭!', `칼 두 배 · -${r.dm}`, '#ffe066', 4, 80, 0.6);
  else if (r.bust) big('철퍼덕!', '칼이 너무 무거워요', '#ffb0a8', 22, 60, 0.6);
  else if (r.mbust && r.win > 0) big('괴물이 넘쳤다!', `-${r.dm}`, '#b8ffb0', 16, 50, 0.6);
}

/** 판 시작 스포트라이트: 새것을 비춘다 (처음 하는 판만) */
function drawSpot(ctx: CanvasRenderingContext2D, s: KnightState, w: number, X: F, Y: F, R: F, font: FontF) {
  const d = STAGES[s.stage];
  if (s.retry || !d.spot || s.ex !== 1 || (s.phase !== 'mon' && s.phase !== 'deal' && s.phase !== 'me')) return;
  const age = s.t - s.startT - (s.retry ? INTRO_RETRY : INTRO_T);
  if (age < 0 || age > 150) return;
  let x = 0.5, y = BOARD_Y + 0.04, rr = 0.2;
  if (d.key === 'turtle') (x = 0.5), (y = BOARD_Y + 0.04), (rr = 0.22);
  if (d.key === 'wolf' || d.key === 'dragon') (x = MX), (y = HAND_Y - 0.1), (rr = 0.16);
  if (d.key === 'scorp') (x = 0.03 + 0.94 / 22), (y = BOARD_Y + 0.05), (rr = 0.07);
  const a = Math.min(1, age / 10, (150 - age) / 18), cx = X(x), cy = Y(y), r = R(rr) * (1 + 0.04 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(10,4,22,.55)';
  ctx.beginPath();
  ctx.rect(0, R(0.07), w, Y(1.34) - R(0.07));
  ctx.ellipse(cx, cy, r * (d.key === 'boar' || d.key === 'turtle' ? 2.3 : 1), r * (d.key === 'boar' || d.key === 'turtle' ? 0.5 : 1), 0, 0, TAU, true);
  ctx.fill('evenodd');
  font(0.034, 900);
  const label = d.spot, tw = ctx.measureText(label).width + R(0.05), ly = y > 0.9 ? cy - R(0.13) : cy + r + R(0.05);
  ctx.fillStyle = 'rgba(60,24,90,.96)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, w / 2, ly + 1);
  font(0.028, 900);
  const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(w / 2 - tw / 2 - R(0.01), ly - R(0.055), nw, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, w / 2 - tw / 2 - R(0.01) + nw / 2, ly - R(0.034));
  ctx.restore();
}

function drawShop(ctx: CanvasRenderingContext2D, s: KnightState, w: number, X: F, Y: F, R: F, font: FontF) {
  const t = s.t, a = Math.min(1, s.pt / 12);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(16,8,28,.95)';
  ctx.fillRect(0, Y(0.4), w, Y(1.17) - Y(0.4));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.max(20, R(0.1))}px system-ui`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('🦝', X(0.12), Y(0.5) + Math.sin(t * 0.1) * 2);
  font(0.05, 900);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText('카드 가게', X(0.5), Y(0.47));
  font(0.032, 800);
  ctx.fillStyle = '#e8dcff';
  ctx.fillText('하나 골라 톡 — 덱을 고쳐요', X(0.55), Y(0.53));
  font(0.028, 800);
  ctx.fillStyle = '#ffb3a8';
  ctx.fillText('괴물도 같은 더미에서 뽑아요!', X(0.55), Y(0.575));
  for (let i = 0; i < s.offers.length; i++) {
    const o = s.offers[i], picked = s.picked === i, other = s.picked >= 0 && !picked;
    const x = X(offerX(i)), y = Y(OFFER_Y) - (picked ? Math.min(1, (t - s.pickT) / 10) * R(0.04) : 0), bw = R(OFFER_W), bh = R(OFFER_H);
    ctx.globalAlpha = a * (other ? 0.35 : 1);
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.beginPath();
    ctx.roundRect(x - bw / 2 + 3, y - bh / 2 + 4, bw, bh, R(0.025));
    ctx.fill();
    ctx.fillStyle = picked ? '#4a3a10' : '#2c2048';
    ctx.beginPath();
    ctx.roundRect(x - bw / 2, y - bh / 2, bw, bh, R(0.025));
    ctx.fill();
    ctx.strokeStyle = picked ? '#ffe066' : o.kind === 'rem' ? '#ff9a8a' : '#9fe8b0';
    ctx.lineWidth = 2;
    ctx.stroke();
    // 카드 그림
    drawCard(ctx, x, y - R(0.06), R(0.1), o.c, Math.sin(t * 0.05 + i) * 0.05, 0, t);
    if (o.kind === 'rem') {
      ctx.strokeStyle = '#ff5a5a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x - R(0.06), y - R(0.14));
      ctx.lineTo(x + R(0.06), y + R(0.02));
      ctx.stroke();
    }
    font(0.036, 900);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(o.label, x, y + R(0.07));
    font(0.028, 800);
    ctx.fillStyle = '#d8ccef';
    ctx.fillText(o.sub, x, y + R(0.12));
  }
  ctx.globalAlpha = a;
  font(0.03, 800);
  ctx.fillStyle = '#cdb9e6';
  const dk = s.deck, nh = dk.filter((c) => c.su === 1).length, ns = dk.filter((c) => c.su === 2).length;
  ctx.fillText(`내 덱 ${dk.length}장${nh ? ` · ♥${nh}` : ''}${ns ? ` · ♠${ns}` : ''}`, X(0.5), Y(1.07));
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: KnightState, d: StageDef, w: number, Y: F, R: F, font: FontF, th: Theme) {
  const t = s.t;
  const hb = R(0.068);
  ctx.fillStyle = 'rgba(16,8,28,.88)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 콤보
  if (s.combo >= 2 && (s.phase === 'mon' || s.phase === 'deal' || s.phase === 'me' || s.phase === 'res')) {
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb3ec';
    ctx.fillText(`🔥 연속 ${s.combo}번`, w / 2, Y(0.465));
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20 && s.phase !== 'intro') {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.034, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    let fs = 0.034;
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.029) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.105) - drop;
    ctx.fillStyle = 'rgba(40,20,60,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff1d6';
    ctx.fillText(tx, w / 2, by2 + 1, w - 20);
    ctx.globalAlpha = 1;
  }
  // 판 시작 카드
  if (s.phase === 'intro') {
    const age = s.pt, dur = s.retry ? INTRO_RETRY : INTRO_T, a = Math.min(1, age / 8, (dur - age) / 14), sc = Math.min(1, 0.7 + age / 20);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(0.74));
    ctx.scale(sc, sc);
    const lines = s.retry ? 1 : d.nstar;
    const ph = R(0.17 + lines * 0.045);
    ctx.fillStyle = 'rgba(30,14,46,.95)';
    ctx.beginPath();
    ctx.roundRect(-R(0.44), -R(0.1), R(0.88), ph, R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.06, 900);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(`${s.retry ? '다시! ' : ''}${s.stage + 1}판 · ${d.emoji} ${d.name}`, 0, -R(0.045));
    font(0.032, 800);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`괴물 체력 ${d.hp}${d.shield ? ` · 등딱지 ${d.shield}` : ''}`, 0, R(0.01));
    if (!s.retry)
      for (let k = 0; k < d.nstar; k++) {
        font(0.034, 800);
        ctx.fillStyle = k === d.nstar - 1 && k > 0 ? '#ffe066' : '#fff6dc';
        ctx.fillText(`☆ ${STAR_TXT[k]}${k === d.nstar - 1 && k > 0 ? '  NEW' : ''}`, 0, R(0.06 + k * 0.045));
      }
    else {
      font(0.032, 800);
      ctx.fillStyle = '#fff6dc';
      ctx.fillText('같은 괴물을 다시 — 덱은 그대로', 0, R(0.06));
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(30,40,20,.78)' : 'rgba(70,20,20,.72)';
    ctx.fillRect(0, Y(0.56), w, R(0.3));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(s.ok ? 0.06 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '기사단 우승! 🎉' : `${d.emoji} ${d.name}을 이겼다!`) : s.why, w / 2, Y(0.61));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = s.starOk[k];
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.07 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.3)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.69));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.69), '#ffe066', 14, 3, 2.4);
      }
      font(0.032, 800);
      for (let k = 0; k < d.nstar; k++) {
        ctx.fillStyle = s.starOk[k] ? '#fff6dc' : 'rgba(255,255,255,.5)';
        ctx.fillText(`${s.starOk[k] ? '★' : '☆'} ${STAR_TXT[k]}`, w / 2, Y(0.755 + k * 0.035));
      }
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 같은 괴물과 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.7));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표(쉬운 말) · 안내 ═════════
  {
    const y2 = Y(1.375), n = d.nstar;
    const st = STAR_TXT.slice(0, n).map((txt, k) => ({ txt, ok: k === 0 ? (s.phase === 'result' && s.ok ? true : null) : k === 1 ? (s.busted ? false : s.phase === 'result' && s.ok ? true : null) : s.hp <= KHP / 2 ? false : s.phase === 'result' && s.ok ? true : null }));
    font(0.03, 800);
    let pad = R(0.02), gap = R(0.012);
    const raw = STAR_TXT.slice(0, n).reduce((a2, c) => a2 + ctx.measureText(`☆ ${c}`).width, 0);
    if (raw + n * pad * 2 + gap * (n - 1) > w - 6) (pad = Math.max(3, (w - 6 - raw - gap * (n - 1)) / (n * 2))), (gap = 3);
    const ws = st.map((c) => ctx.measureText(`☆ ${c.txt}`).width + pad * 2);
    let x = (w - ws.reduce((a2, b) => a2 + b, 0) - gap * (n - 1)) / 2;
    st.forEach((c, k) => {
      ctx.fillStyle = c.ok === true ? 'rgba(255,209,102,.32)' : c.ok === false ? 'rgba(0,0,0,.35)' : 'rgba(255,240,210,.12)';
      ctx.beginPath();
      ctx.roundRect(x, y2 - R(0.025), ws[k], R(0.05), R(0.025));
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = c.ok === false ? 'rgba(255,255,255,.4)' : c.ok ? '#ffe9a8' : '#fff6e0';
      ctx.fillText(`${c.ok === true ? '★' : c.ok === false ? '✗' : '☆'} ${c.txt}`, x + ws[k] / 2, y2 + 1);
      x += ws[k] + gap;
    });
    let tip = d.tip;
    const k = handSum(s.hand);
    if (s.phase === 'shop') tip = '카드 하나를 톡 — 다음 괴물에 맞게 골라요';
    else if (s.phase === 'result') tip = s.ok ? '다음은 카드 가게!' : '같은 괴물을 다시 — 남은 카드를 보고 멈춰요';
    else if (s.stage === 0 && s.taps === 0) tip = '👆 더미를 톡 — 카드가 휙, 칼이 쑥!';
    else if (s.stage === 0 && s.taps === 1 && s.phase === 'me') tip = '👆 기사를 톡 — 그 길이로 베기!';
    else if (s.phase === 'me' && k <= 11 && k > 0) tip = '11 이하면 한 장 더 뽑아도 절대 안 넘쳐요';
    else if (s.phase === 'mon') tip = s.order === 'first' ? '괴물이 먼저 뽑아요…' : '괴물이 뽑아요 — 넘쳐라!';
    ctx.textAlign = 'center';
    font(0.032, 800);
    let fs = 0.032;
    while (ctx.measureText(tip).width > w - R(0.04) && fs > 0.028) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(255,240,214,.92)';
    ctx.fillText(tip, w / 2, Y(1.44));
  }
  ctx.textBaseline = 'alphabetic';
}
