/**
 * 고양이 카드 원정 (25라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우) — 덱 빌딩 × 셋 중 하나 고르기 × 턴제화.
 * 기준 9(손이 하는 일은 하나): 손에 든 카드 3장 중 하나를 톡 → 바로 쓰인다(한 턴에 한 장, 에너지 없음). 그다음 쥐가 움직인다.
 * 와우: 카드를 톡 하면 고양이 기사가 카드에서 튀어나와 냥냥펀치 — 같은 색 카드를 이어 쓰면 콤보가 붙어 펀치 수가 늘고 화면이 흔들린다.
 * 규칙(결정적): 쓴 카드 자리만 덱에서 채운다(남은 두 장은 손에 그대로 — 막기를 아껴 둘 수 있다). 쥐의 다음 행동은 머리 위에 늘 보인다.
 *   막기는 그 턴 쥐의 공격만 막는다(독 병은 막기가 있으면 튕겨 낸다). 쥐의 방패는 깨기 전까지 남는다(꼬리 채찍이 깬다).
 *   밤송이 쥐의 가시는 자라며, 때리면 한 대마다 되받는다(연타 콤보가 독이 된다). 쥐는 행동을 한 바퀴 돌 때마다 화가 나 세진다(오래 끌면 손해).
 * 판 구조: 판 = 싸움 하나. ★ 이기기 · ★ 정해진 턴 안에 · ★ 다친 곳 정해진 만큼 이하 — 서두름과 막기가 서로 당긴다.
 *   지면 하트 −1, 그 판만 다시(덱은 그대로). 이기면 새 카드 셋 중 하나를 덱에(다음 상대와 그 예고가 보인다). 하트를 다 잃거나 쥐 대왕을 이기면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 쥐 병사(톡 하면 퐁!) → 카드 고르기 → 2판 쥐 궁수(준비할 때 치고 화살엔 막기) → 콤보
 *   → 3판 방패 쥐(방패 깨기·상처) → 갈림길(카드냐 몸이냐) → 4판 독 쥐(독 병은 막기로 튕긴다) → 5판 밤송이 쥐(가시 — 한 방 카드로)
 *   → 6판 쥐 쌍둥이(둘 다 맞히는 꼬리) → 7판 쥐 대왕(💥 큰 공격 예고 — 막기를 아껴 둔다).
 * 웃음: 맞은 쥐가 '퐁' 날아가 데굴 · 방패가 깨지면 쥐가 분해서 발 동동 · 콤보 3부터 쥐가 겁먹고 덜덜 ·
 *   고양이는 지면 뒤집혀 버둥(어질어질 별) · 테이블 가장자리 아기 고양이 응원단이 콤보에 폴짝, 맞으면 눈을 가린다 · 성벽 쥐들이 찍찍.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const CAT_HP = 15;
/** 쥐가 한 바퀴 돌 때마다 세지는 정도 */
const ANGER = 1;

// ───────── 카드 ─────────
/** 0 공격(빨강) · 1 막기(파랑) · 2 특수(초록) — 같은 색을 이어 쓰면 콤보 */
type Fam = 0 | 1 | 2;
export interface Card {
  key: string; emoji: string; name: string; fam: Fam;
  dmg?: number; hits?: number; all?: boolean; brk?: boolean; venom?: number;
  block?: number; spikes?: number; heal?: number; cleanse?: boolean; tangle?: boolean; nip?: boolean;
  /** 콤보 한 단계마다: 공격 대수(+hit) 또는 피해(+dmg) 또는 막기(+block) */
  plusHit?: number; plusDmg?: number; plusBlock?: number;
  text: string; combo: string;
}
export const CARDS: Card[] = [
  { key: 'punch', emoji: '👊', name: '냥냥펀치', fam: 0, dmg: 2, hits: 2, plusHit: 1, text: '2 × 2대', combo: '콤보 +1대' },
  { key: 'whip', emoji: '🌀', name: '꼬리 채찍', fam: 0, dmg: 5, hits: 1, all: true, brk: true, plusDmg: 2, text: '5 모두에게 · 방패 깨기', combo: '콤보 +2' },
  { key: 'curl', emoji: '🛡️', name: '웅크리기', fam: 1, block: 6, plusBlock: 3, text: '막기 6', combo: '콤보 +3' },
  { key: 'flurry', emoji: '🐾', name: '냥냥 연타', fam: 0, dmg: 1, hits: 4, plusHit: 2, text: '1 × 4대', combo: '콤보 +2대' },
  { key: 'pounce', emoji: '⚡', name: '덮치기', fam: 0, dmg: 8, hits: 1, plusDmg: 3, text: '8 한 방', combo: '콤보 +3' },
  { key: 'scratch', emoji: '😾', name: '할퀴기', fam: 0, dmg: 2, hits: 1, venom: 4, plusDmg: 2, text: '2 · 상처 4', combo: '콤보 +2' },
  { key: 'box', emoji: '📦', name: '상자 숨기', fam: 1, block: 11, plusBlock: 3, text: '막기 11', combo: '콤보 +3' },
  { key: 'fluff', emoji: '🦔', name: '털 세우기', fam: 1, block: 4, spikes: 3, plusBlock: 3, text: '막기 4 · 되받기 3', combo: '콤보 +3' },
  { key: 'yarn', emoji: '🧶', name: '털실 공', fam: 2, tangle: true, text: '쥐 다음 행동 · 한 번 엉킴', combo: '' },
  { key: 'fish', emoji: '🐟', name: '생선 간식', fam: 2, heal: 6, cleanse: true, text: '+6 · 독 씻기', combo: '' },
  { key: 'nip', emoji: '🌿', name: '개박하', fam: 2, nip: true, text: '다음 공격 · 두 배!', combo: '' },
];
const CID = Object.fromEntries(CARDS.map((c, i) => [c.key, i])) as Record<string, number>;
const START_DECK = ['punch', 'punch', 'punch', 'whip', 'curl', 'curl', 'curl'].map((k) => CID[k]);
const REWARD_POOL = ['whip', 'flurry', 'pounce', 'scratch', 'box', 'fluff', 'yarn', 'fish', 'nip'].map((k) => CID[k]);

// ───────── 적 ─────────
type IK = 'atk' | 'multi' | 'shield' | 'poison' | 'spike' | 'charge' | 'smash';
interface Intent { k: IK; v: number; n?: number }
interface FoeDef { key: string; name: string; hp: number; acts: Intent[]; look: number }
const I = (k: IK, v = 0, n?: number): Intent => ({ k, v, n });
export const FOES: Record<string, FoeDef> = {
  soldier: { key: 'soldier', name: '쥐 병사', hp: 4, acts: [I('atk', 3)], look: 0 },
  archer: { key: 'archer', name: '쥐 궁수', hp: 12, acts: [I('charge'), I('multi', 2, 4)], look: 1 },
  shield: { key: 'shield', name: '방패 쥐', hp: 15, acts: [I('shield', 7), I('atk', 2), I('atk', 9)], look: 2 },
  poison: { key: 'poison', name: '독 쥐', hp: 16, acts: [I('poison', 4), I('atk', 2), I('poison', 4), I('atk', 5)], look: 3 },
  spike: { key: 'spike', name: '밤송이 쥐', hp: 16, acts: [I('spike', 2), I('atk', 3), I('atk', 7)], look: 4 },
  twinA: { key: 'twinA', name: '쥐 병사', hp: 9, acts: [I('atk', 2), I('atk', 2), I('atk', 8)], look: 0 },
  twinB: { key: 'twinB', name: '쥐 궁수', hp: 9, acts: [I('charge'), I('multi', 2, 3)], look: 1 },
  king: { key: 'king', name: '쥐 대왕', hp: 38, acts: [I('atk', 3), I('shield', 6), I('charge'), I('smash', 12), I('poison', 3), I('atk', 3), I('charge'), I('smash', 15)], look: 5 },
};

interface StageDef { key: string; name: string; news: string; foes: string[]; par: number; cap: number; first?: number[] }
export const STAGES: StageDef[] = [
  { key: 'start', name: '쥐 병사', news: '👊 카드를 톡 — 고양이 기사가 튀어나와요!', foes: ['soldier'], par: 1, cap: 0, first: ['punch', 'whip', 'punch'].map((k) => CID[k]) },
  { key: 'archer', name: '쥐 궁수', news: '🏹 머리 위 예고를 봐요 — 화살 올 땐 막기!', foes: ['archer'], par: 4, cap: 3 },
  { key: 'shield', name: '방패 쥐', news: '🛡️ 쥐 방패는 안 사라져요 — 꼬리 채찍으로 쨍!', foes: ['shield'], par: 5, cap: 4 },
  { key: 'poison', name: '독 쥐', news: '🧪 독 병 — 막기가 있으면 팅! 튕겨 내요', foes: ['poison'], par: 6, cap: 6 },
  { key: 'spike', name: '밤송이 쥐', news: '🌵 가시가 자라요 — 연타는 대마다 따끔!', foes: ['spike'], par: 6, cap: 6 },
  { key: 'twins', name: '쥐 쌍둥이', news: '👯 둘이 나와요 — 꼬리 채찍은 둘 다 맞혀요', foes: ['twinA', 'twinB'], par: 6, cap: 4 },
  { key: 'king', name: '쥐 대왕', news: '👑 💥 큰 공격 예고 — 막기를 아껴 둬요!', foes: ['king'], par: 8, cap: 10 },
];
export const STAGE_COUNT = STAGES.length;

// ───────── 싸움 시뮬레이션 (봇도 똑같이 쓴다) ─────────
interface Foe { d: string; hp: number; max: number; block: number; thorns: number; wound: number; ip: number; tangled: boolean }
export interface Fight {
  hp: number; max: number; block: number; poison: number; spikes: number; nip: boolean;
  foes: Foe[]; hand: number[]; draw: number[]; disc: number[];
  combo: number; fam: number; turn: number; dmg: number;
}
/** 카드 한 장의 결과 (연출용) */
interface Hit { foe: number; h: number; dmg: number; soak: number; back: number; kill: boolean }
interface PlayRec { card: number; slot: number; combo: number; hits: Hit[]; brk: number[]; block: number; heal: number; cleansed: number; tangle: boolean; nip: boolean; venom: number; double: boolean; hp0: number[]; blk0: number[]; catHp0: number; drew: number }
interface FoeAct { foe: number; it: Intent | null; tangled: boolean; deflect?: boolean; hits: { dmg: number; soak: number; back: number }[]; wound: number; woundKill: boolean }
interface FoeRec { acts: FoeAct[]; poison: number; catHp0: number; blk0: number; hp0: number[] }

const shuffleIn = (a: number[], r: Rng) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const x = a[i];
    a[i] = a[j];
    a[j] = x;
  }
  return a;
};
function drawOne(f: Fight, r: Rng): number {
  if (!f.draw.length) {
    f.draw = shuffleIn(f.disc, r);
    f.disc = [];
  }
  return f.draw.pop()!;
}
export function newFight(st: StageDef, deck: number[], r: Rng, maxHp = CAT_HP): Fight {
  const f: Fight = {
    hp: maxHp, max: maxHp, block: 0, poison: 0, spikes: 0, nip: false,
    foes: st.foes.map((k) => ({ d: k, hp: FOES[k].hp, max: FOES[k].hp, block: 0, thorns: 0, wound: 0, ip: 0, tangled: false })),
    hand: [], draw: shuffleIn([...deck], r), disc: [], combo: 0, fam: -1, turn: 0, dmg: 0,
  };
  if (st.first) {
    for (const c of st.first) f.draw.splice(f.draw.lastIndexOf(c), 1);
    f.hand = [...st.first];
  } else f.hand = [drawOne(f, r), drawOne(f, r), drawOne(f, r)];
  return f;
}
export function cloneFight(f: Fight): Fight {
  return { ...f, foes: f.foes.map((x) => ({ ...x })), hand: [...f.hand], draw: [...f.draw], disc: [...f.disc] };
}
const alive = (x: Foe) => x.hp > 0;
export const won = (f: Fight) => !f.foes.some(alive);
export const lost = (f: Fight) => f.hp <= 0;
/** 콤보를 이어 가면 몇 단계가 되나 */
export const comboIf = (f: Fight, c: number) => (CARDS[c].fam === f.fam ? f.combo + 1 : 1);

/** 카드 한 장을 쓴다 (쓴 자리는 덱에서 채운다) */
export function play(f: Fight, slot: number, r: Rng, rec?: PlayRec): void {
  const ci = f.hand[slot], c = CARDS[ci];
  f.combo = comboIf(f, ci);
  f.fam = c.fam;
  f.turn++;
  const k = f.combo - 1;
  if (rec) {
    rec.combo = f.combo;
    rec.hp0 = f.foes.map((x) => x.hp);
    rec.blk0 = f.foes.map((x) => x.block);
    rec.catHp0 = f.hp;
  }
  if (c.dmg) {
    let dmg = c.dmg + k * (c.plusDmg ?? 0);
    const hits = (c.hits ?? 1) + k * (c.plusHit ?? 0);
    if (f.nip) (dmg *= 2), (f.nip = false), rec && (rec.double = true);
    const front = f.foes.findIndex(alive);
    const tg = c.all ? f.foes.map((_, i) => i).filter((i) => alive(f.foes[i])) : front >= 0 ? [front] : [];
    if (c.brk) for (const i of tg) if (f.foes[i].block > 0) (f.foes[i].block = 0), rec?.brk.push(i);
    for (let h = 0; h < hits; h++)
      for (const i of tg) {
        const x = f.foes[i];
        if (!alive(x)) continue;
        const soak = Math.min(x.block, dmg);
        x.block -= soak;
        x.hp -= dmg - soak;
        const back = x.thorns;
        if (back) (f.hp -= back), (f.dmg += back);
        rec?.hits.push({ foe: i, h, dmg: dmg - soak, soak, back, kill: x.hp <= 0 });
      }
    if (c.venom) {
      const v = c.venom + k * 2, x = f.foes[tg[0]];
      if (x && alive(x)) (x.wound += v), rec && (rec.venom = v);
    }
  }
  if (c.block) {
    const b = c.block + k * (c.plusBlock ?? 0);
    f.block += b;
    if (rec) rec.block = b;
  }
  if (c.spikes) f.spikes = c.spikes;
  if (c.heal) {
    const h0 = f.hp;
    f.hp = Math.min(f.max, f.hp + c.heal);
    if (rec) rec.heal = f.hp - h0;
  }
  if (c.cleanse) {
    if (rec) rec.cleansed = f.poison;
    f.poison = 0;
  }
  if (c.tangle) {
    for (const x of f.foes) if (alive(x)) x.tangled = true;
    if (rec) rec.tangle = true;
  }
  if (c.nip) (f.nip = true), rec && (rec.nip = true);
  f.disc.push(ci);
  f.hand[slot] = drawOne(f, r);
  if (rec) rec.drew = f.hand[slot];
}

/** 적 차례: 예고한 행동을 하고, 내 막기·되받기는 사라지고, 독이 한 번 아프다 */
export function foeTurn(f: Fight, rec?: FoeRec): void {
  if (rec) (rec.catHp0 = f.hp), (rec.blk0 = f.block), (rec.hp0 = f.foes.map((x) => x.hp));
  for (let i = 0; i < f.foes.length; i++) {
    const x = f.foes[i];
    if (!alive(x)) continue;
    const a: FoeAct | null = rec ? { foe: i, it: null, tangled: false, hits: [], wound: 0, woundKill: false } : null;
    if (a) rec!.acts.push(a);
    if (x.wound > 0) {
      x.hp -= x.wound;
      if (a) (a.wound = x.wound), (a.woundKill = x.hp <= 0);
      x.wound--;
      if (!alive(x)) continue;
    }
    const it = intentOf(x);
    x.ip++;
    if (x.tangled) {
      x.tangled = false;
      if (a) (a.tangled = true), (a.it = it);
      continue;
    }
    if (a) a.it = it;
    const hitCat = (v: number) => {
      const soak = Math.min(f.block, v);
      f.block -= soak;
      f.hp -= v - soak;
      f.dmg += v - soak;
      const back = f.spikes;
      if (back && alive(x)) x.hp -= back;
      a?.hits.push({ dmg: v - soak, soak, back });
    };
    if (it.k === 'atk' || it.k === 'smash') hitCat(it.v);
    else if (it.k === 'multi') for (let h = 0; h < (it.n ?? 1); h++) hitCat(it.v);
    else if (it.k === 'shield') x.block += it.v;
    else if (it.k === 'poison') {
      if (f.block > 0) a && (a.deflect = true);
      else f.poison += it.v;
    } else if (it.k === 'spike') x.thorns += it.v;
  }
  f.block = 0;
  f.spikes = 0;
  if (f.poison > 0 && f.hp > 0 && !won(f)) {
    if (rec) rec.poison = f.poison;
    f.hp -= f.poison;
    f.dmg += f.poison;
    f.poison--;
  }
}
/** 지금 적이 할 행동 (엉켰으면 null) */
/** 한 바퀴 돌 때마다 화가 나서 세진다 (느리게 싸우면 손해) */
export const angerOf = (x: Foe) => Math.floor(x.ip / FOES[x.d].acts.length);
export function intentOf(x: Foe): Intent {
  const D = FOES[x.d], it = D.acts[x.ip % D.acts.length], g = angerOf(x) * ANGER;
  if (!g) return it;
  if (it.k === 'multi') return { k: it.k, v: it.v, n: (it.n ?? 1) + g };
  if (it.k === 'charge' || it.k === 'spike') return it;
  return { k: it.k, v: it.v + g * (it.k === 'poison' ? 1 : 2) };
}
const intentDmg = (it: Intent) => (it.k === 'atk' || it.k === 'smash' ? it.v : it.k === 'multi' ? it.v * (it.n ?? 1) : 0);
/** 다음 적 차례에 들어올 피해 (막기 전) */
export const incoming = (f: Fight) => f.foes.reduce((a, x) => a + (alive(x) && !x.tangled ? intentDmg(intentOf(x)) : 0), 0);

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
type Phase = 'pick' | 'cat' | 'foe' | 'result' | 'reward' | 'next';
export interface CatState {
  rng: Rng; seed: number; t: number; pt: number; phase: Phase; stage: number;
  f: Fight; deck: number[]; maxHp: number; hearts: number; stars: number; got: number; pts: number;
  ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  offer: number[]; took: number; rec: PlayRec | null; frec: FoeRec | null; catT: number; foeT: number;
  down: boolean; ax: number; ay: number; idle: number; maxCombo: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  log: { stage: number; stars: number; turns: number; dmg: number; ok: boolean }[];
}

const RESULT_OK = 120, RESULT_FAIL = 130, NEXT_T = 40, NEWS_T = 170;
const STAR_PTS = 100, WIN_PTS = 500;
export const HEART = -1, HPUP = -2;
const HP_UP = 4;

const ev = (s: CatState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: CatState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length > 1) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: CatState, key: string, text: string, now = false) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (now) (s.news = { text, t: s.t }), (s.newsQ = []);
  else s.newsQ.push(text);
}

function startFight(s: CatState) {
  const st = STAGES[s.stage];
  s.f = newFight(st, s.deck, s.rng, s.maxHp);
  s.phase = 'pick';
  s.pt = 0;
  s.rec = null;
  s.frec = null;
  s.startT = s.t;
  s.idle = 0;
  see(s, st.key, st.news, true);
  ev(s, 'stage', 0.5, 0.5, `${s.stage + 1}판 · ${st.name}`, '#fff6d6');
}

function finish(s: CatState, ok: boolean, why = '') {
  const st = STAGES[s.stage], f = s.f;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    const n = 1 + (f.turn <= st.par ? 1 : 0) + (f.dmg <= st.cap ? 1 : 0);
    s.got = n;
    s.stars += n;
    s.pts += n * STAR_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 100);
    else makeOffer(s);
    ev(s, 'clear', 0.5, 0.5, `${s.stage + 1}판 승리! ${'★'.repeat(n)}${'☆'.repeat(3 - n)}`, '#fff1a8', n);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why, '#ffd0c8');
  }
  s.log.push({ stage: s.stage, stars: ok ? s.got : 0, turns: f.turn, dmg: f.dmg, ok });
}

/** 보상: 카드 셋 (3·5판 뒤 갈림길에선 하나가 하트 — 하트가 다 있으면 최대 체력) */
function makeOffer(s: CatState) {
  const pool = [...REWARD_POOL];
  const o: number[] = [];
  while (o.length < 3) o.push(pool.splice(Math.floor(s.rng() * pool.length), 1)[0]);
  if (s.stage === 2 || s.stage === 4) o[2] = s.hearts < 3 ? HEART : HPUP;
  s.offer = o;
  s.took = -9;
}

/** 화면 좌표: 손패·보상 카드 칸 (x 0~1, y 0~A) */
export const CARD_Y = 0.905, CARD_H = 0.37, CARD_W = 0.31, CARD_GAP = 0.016;
export const cardX = (k: number) => 0.5 + (k - 1) * (CARD_W + CARD_GAP);
function slotAt(x: number, y: number): number {
  if (y < CARD_Y - 0.02 || y > CARD_Y + CARD_H + 0.02) return -1;
  for (let k = 0; k < 3; k++) if (Math.abs(x - cardX(k)) <= CARD_W / 2 + CARD_GAP / 2) return k;
  return -1;
}

/** 카드 연출 시간표: 카드가 날아가 고양이가 튀어나오고(HIT0), 한 대씩 GAP마다 */
const HIT0 = 14;
const rounds = (r: PlayRec) => (r.hits.length ? r.hits[r.hits.length - 1].h + 1 : 0);
const gapOf = (n: number) => (n > 7 ? 4 : 6);
const hitAt = (r: PlayRec, h: number) => HIT0 + h * gapOf(rounds(r));
function catTime(r: PlayRec) {
  const n = rounds(r);
  return n ? HIT0 + n * gapOf(n) + 14 : 34;
}
/** 적 차례 시간표: 쥐마다 차례로(상처 → 행동), 끝에 독 */
const FOE_HIT = 13, FOE_GAP = 7;
function foePlan(r: FoeRec): { start: number[]; poisonAt: number; end: number } {
  let t = 0;
  const start: number[] = [];
  for (const a of r.acts) {
    start.push(t);
    t += a.it || a.wound ? FOE_HIT + 6 + Math.max(1, a.hits.length) * FOE_GAP : 0;
  }
  const poisonAt = Math.max(16, t) + 4;
  return { start, poisonAt, end: r.poison ? poisonAt + 16 : Math.max(16, t) };
}
const foeTime = (r: FoeRec) => foePlan(r).end;

function doPlay(s: CatState, slot: number) {
  const f = s.f, ci = f.hand[slot];
  const rec: PlayRec = { card: ci, slot, combo: 1, hits: [], brk: [], block: 0, heal: 0, cleansed: 0, tangle: false, nip: false, venom: 0, double: false, hp0: [], blk0: [], catHp0: f.hp, drew: -1 };
  play(f, slot, s.rng, rec);
  s.rec = rec;
  s.phase = 'cat';
  s.pt = 0;
  s.catT = catTime(rec);
  s.idle = 0;
  s.maxCombo = Math.max(s.maxCombo, rec.combo);
  if (rec.combo >= 2) see(s, 'combo', '🔥 같은 색을 이어 쓰면 콤보 — 점점 세져요!');
  if (rec.brk.length) tip(s, 'brk', '쨍! 방패가 깨졌어요');
  if (rec.hits.some((h) => h.back)) tip(s, 'thorn', '🌵 가시엔 연타 금지 — 한 방 카드나 막기로');
  if (rec.tangle) tip(s, 'yarn', '🧶 엉킨 쥐는 다음 행동을 못 해요');
  if (rec.venom) tip(s, 'wound', '🩹 상처 — 쥐 차례마다 아파요 (방패 무시)');
}

export const catcards: GameDef<CatState> = {
  id: 'catcards',
  name: '고양이 카드 원정',
  genes: ['deck', 'pick3', 'turnbased'],
  twist: '카드를 톡 하면 고양이 기사가 카드 그림에서 튀어나와 냥냥펀치를 날리고, 같은 색 카드를 이어 쓰면 콤보로 펀치 수가 늘어난다 — 그런데 적의 다음 행동이 머리 위에 늘 보여서, 콤보를 이어 갈지 끊고 막을지가 매 턴의 수가 된다',
  rules: ['손에 든 카드 3장 중 하나를 톡 — 공격·막기·특수. 같은 색을 이어 쓰면 콤보!', '적의 다음 행동이 머리 위에 보여요. 이기면 새 카드 셋 중 하나를 덱에 넣어요.'],
  controls: 'touch',
  hint: '카드를 톡 하면 바로 써요 / 숫자 1 2 3 또는 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '테이블 위 보드게임 디오라마 — 고양이 기사단의 쥐 성 원정',
    mood: '저녁 거실 등불 아래 나무 테이블, 펼쳐진 보드판 위에 받침 달린 고양이 기사 말과 쥐 말들. 판지로 만든 쥐 성이 멀리 서 있고, 테이블 가장자리 아기 고양이 응원단이 고개를 내민다.',
    palette: { bg: '#2a1d16', ink: '#fff7ea', muted: '#d9c4a8', accent: '#ffc857', hot: '#ff6b5a', soft: '#f3e3c0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, pt: 0, phase: 'pick', stage: 0, deck: [...START_DECK], maxHp: CAT_HP,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      offer: [], took: -9, rec: null, frec: null, catT: 1, foeT: 1, down: false, ax: 0, ay: 0, idle: 0, maxCombo: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0, log: [],
    } as unknown as CatState;
    startFight(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
    let slot = inp.pick !== undefined && inp.pick >= 0 && inp.pick < 3 ? inp.pick : -1;
    if (press) {
      const k = slotAt(p!.x, p!.y * A);
      if (k >= 0) slot = k;
      else if (s.phase === 'pick' || s.phase === 'reward') ev(s, 'nope', p!.x, p!.y * A, s.phase === 'reward' ? '아래 카드 하나를 톡!' : '아래 카드를 톡!', '#ffe3d6');
    }
    const f = s.f;
    switch (s.phase) {
      case 'result':
        if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
          if (s.ok) {
            if (s.won) s.dead = true;
            else {
              s.phase = 'reward';
              s.pt = 0;
              see(s, 'reward', '🎁 새 카드 하나를 덱에 — 다음 상대를 보고!', true);
              if (s.offer.some((o) => o < 0)) see(s, 'heart', '🔀 갈림길 — 새 카드냐, 고양이 몸이냐');
            }
          } else if (s.hearts <= 0) s.dead = true;
          else startFight(s);
        }
        return;
      case 'reward':
        if (slot >= 0 && s.pt > 12) {
          const o = s.offer[slot];
          if (o === HEART) s.hearts = Math.min(3, s.hearts + 1);
          else if (o === HPUP) s.maxHp += HP_UP;
          else s.deck.push(o);
          s.took = slot;
          s.phase = 'next';
          s.pt = 0;
          ev(s, 'take', cardX(slot), CARD_Y + CARD_H / 2, o === HEART ? '♥ +1' : o === HPUP ? `최대 체력 +${HP_UP}!` : `${CARDS[o].name} 덱에 쏙!`, '#fff1a8');
        }
        return;
      case 'next':
        if (s.pt >= NEXT_T) {
          s.stage++;
          startFight(s);
        }
        return;
      case 'cat':
        if (s.pt >= s.catT) {
          if (lost(f)) return finish(s, false, '가시에 찔려 고양이가 뒤집혔어요!');
          if (won(f)) return finish(s, true);
          const r: FoeRec = { acts: [], poison: 0, catHp0: f.hp, blk0: f.block, hp0: [] };
          foeTurn(f, r);
          s.frec = r;
          s.phase = 'foe';
          s.pt = 0;
          s.foeT = foeTime(r);
        }
        return;
      case 'foe':
        if (s.pt >= s.foeT) {
          if (won(f)) return finish(s, true);
          if (lost(f)) return finish(s, false, s.frec?.poison && f.hp + s.frec.poison > 0 ? '독이 퍼져 고양이가 어질어질…' : '고양이 기사가 데굴데굴 굴러갔어요!');
          s.phase = 'pick';
          s.pt = 0;
          s.frec = null;
          if (f.foes.some((x) => alive(x) && angerOf(x) > 0)) tip(s, 'anger', '😤 쥐는 한 바퀴마다 세져요 — 오래 끌면 손해');
        }
        return;
      case 'pick':
        s.idle++;
        if (slot >= 0) doPlay(s, slot);
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
/** 싸움이 끝났거나 멈춘 자리의 값: 승리(별 둘 노림) ≫ 진행 ≫ 패배 */
function value(f: Fight, st: StageDef): number {
  if (lost(f)) return -6000 - f.foes.reduce((a, x) => a + Math.max(0, x.hp), 0) * 10;
  if (won(f)) return 3000 + (f.turn <= st.par ? 900 : 0) + (f.dmg <= st.cap ? 900 : 0) - f.dmg * 6 - f.turn * 6 + f.hp;
  let v = 0;
  for (const x of f.foes) if (alive(x)) v -= x.hp * 40 + x.block * 25 - x.wound * (x.wound + 1) * 10;
  v -= f.dmg * 14 + f.turn * 14 + f.poison * (f.poison + 1) * 7;
  if (f.fam === 0) v += f.combo * 12;
  if (f.nip) v += 30;
  return v;
}
/** 빠른 한 수 정책 (롤아웃용): 카드마다 한 턴 해 보고 가장 좋은 것 */
function greedy(f: Fight, st: StageDef, r: Rng): number {
  let best = 0, bv = -Infinity;
  for (let k = 0; k < 3; k++) {
    if (k && f.hand.indexOf(f.hand[k]) < k) continue;
    const g = cloneFight(f);
    play(g, k, r);
    if (!won(g) && !lost(g)) foeTurn(g);
    const v = value(g, st);
    if (v > bv) (bv = v), (best = k);
  }
  return best;
}
function rollout(f: Fight, st: StageDef, r: Rng, H = 14): number {
  for (let d = 0; d < H && !won(f) && !lost(f); d++) {
    play(f, greedy(f, st, r), r);
    if (!won(f) && !lost(f)) foeTurn(f);
  }
  return value(f, st);
}
/** 잘하는 봇의 한 수: 덱 순서를 여러 번 섞어(모르는 다음 장) 두 수를 다 해 보고 끝까지 내다본다 */
export function bestSlot(f: Fight, st: StageDef, seed: number, K = 10): number {
  const tot = [0, 0, 0];
  for (let j = 0; j < K; j++) {
    const r0 = mulberry32((seed * 977 + j * 7919) >>> 0);
    const base = cloneFight(f);
    shuffleIn(base.draw, r0);
    for (let k = 0; k < 3; k++) {
      if (k && f.hand.indexOf(f.hand[k]) < k) continue;
      const g = cloneFight(base), r = mulberry32((seed * 31 + j * 131 + k) >>> 0);
      play(g, k, r);
      if (!won(g) && !lost(g)) foeTurn(g);
      if (won(g) || lost(g)) {
        tot[k] += value(g, st);
        continue;
      }
      let b = -Infinity;
      for (let k2 = 0; k2 < 3; k2++) {
        if (k2 && g.hand.indexOf(g.hand[k2]) < k2) continue;
        const g2 = cloneFight(g), r2 = mulberry32((seed * 53 + j * 271 + k * 7 + k2) >>> 0);
        play(g2, k2, r2);
        if (!won(g2) && !lost(g2)) foeTurn(g2);
        b = Math.max(b, rollout(g2, st, r2));
      }
      tot[k] += b;
    }
  }
  let best = 0;
  for (let k = 1; k < 3; k++) if (f.hand.indexOf(f.hand[k]) === k && tot[k] > tot[best]) best = k;
  return best;
}
/** 보상 고르기: 다음 싸움을 새 카드 넣은 덱으로 몇 번 해 본다 */
export function bestOffer(s: CatState, K = 6): number {
  const st = STAGES[s.stage + 1];
  if (!st) return 0;
  let best = 0, bv = -Infinity;
  s.offer.forEach((o, k) => {
    let tot = 0;
    if (o === HEART) tot = s.hearts <= 1 ? 1e9 : -1e9;
    else
      for (let j = 0; j < K; j++) {
        const r = mulberry32((s.seed * 31 + s.stage * 977 + j * 7919 + 5) >>> 0);
        const g = o === HPUP ? newFight(st, s.deck, r, s.maxHp + HP_UP) : newFight(st, [...s.deck, o], r, s.maxHp);
        tot += rollout(g, st, r, 16);
      }
    if (tot > bv) (bv = tot), (best = k);
  });
  return best;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const tapSlot = (k: number): Input => ({ tap: false, dir: 0, pointer: { x: cardX(k), y: (CARD_Y + CARD_H / 2) / A } });
const brain = new WeakMap<object, { key: string; k: number }>();

/** 봇: 카드마다 덱을 여러 번 섞어 끝까지 내다보고, 보상은 다음 싸움을 미리 해 보고 고른다 */
export const catcardsSmart: Bot<CatState> = {
  name: '고양이 군사',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'pick') {
      const key = `p${s.stage}:${s.tries}:${s.f.turn}`;
      let m = brain.get(s);
      if (!m || m.key !== key) brain.set(s, (m = { key, k: bestSlot(s.f, STAGES[s.stage], s.seed + s.t) }));
      return tapSlot(m.k);
    }
    if (s.phase === 'reward' && s.pt > 14) {
      const key = `r${s.stage}`;
      let m = brain.get(s);
      if (!m || m.key !== key) brain.set(s, (m = { key, k: bestOffer(s) }));
      return tapSlot(m.k);
    }
    return NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 카드나 톡 (가끔 화면 아무 데나) */
export const catcardsRandom: Bot<CatState> = {
  name: '아무 카드나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 100);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = rng() < 0.12 ? { x: rng(), y: rng() } : { x: cardX(Math.floor(rng() * 3)) + (rng() - 0.5) * CARD_W * 0.8, y: (CARD_Y + 0.03 + rng() * (CARD_H - 0.06)) / A };
    return { tap: false, dir: 0, pointer: m.p };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * clamp01(t))).join(',')})`;
};
const ease = (q: number) => 1 - Math.pow(1 - clamp01(q), 2.4);
const FAM_COL = ['#e0533d', '#3a7bd5', '#2f9e57'];
const FAM_DARK = ['#8f2a1c', '#1f4c8f', '#1d6a3a'];
const FAM_TINT = ['#ffe1d6', '#dceaff', '#dcf5e2'];
const CAT_X = 0.24, CAT_Y = 0.755;
/** 쥐 자리 (x, y, 크기) */
function foeSpot(n: number, i: number, look: number): [number, number, number] {
  const z = look === 5 ? 0.138 : 0.108;
  if (n === 1) return [0.72, 0.69, z];
  return i === 0 ? [0.57, 0.75, z * 0.95] : [0.84, 0.64, z * 0.88];
}
const EMOJI_FONT = 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
function emo(ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) {
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.round(size)}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
}
function oval(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, col: string | CanvasGradient, rot = 0) {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
  ctx.fill();
}
/** 보드게임 말 받침 (두께·그림자·윤) */
function pedestal(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, col: string) {
  const ry = rx * 0.34, th = rx * 0.2;
  oval(ctx, x + rx * 0.18, y + th + ry * 0.35, rx * 1.15, ry * 1.15, 'rgba(25,12,4,.38)');
  ctx.fillStyle = mix(col, '#000000', 0.45);
  ctx.beginPath();
  ctx.ellipse(x, y + th, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(x - rx, y - ry, x + rx, y + ry);
  g.addColorStop(0, mix(col, '#ffffff', 0.35));
  g.addColorStop(1, col);
  oval(ctx, x, y, rx, ry, g);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.86, ry * 0.8, 0, Math.PI * 1.05, Math.PI * 1.75);
  ctx.stroke();
}

type CatMood = 'idle' | 'punch' | 'hit' | 'smug' | 'dizzy' | 'curl' | 'eat' | 'wild' | 'throw' | 'worry';
/** 고양이 기사 (오른쪽을 본다). (x, y) = 받침 위 발끝, z = 크기 단위(px) */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: CatMood, t: number, paw = 0, shieldA = 0) {
  ctx.save();
  ctx.translate(x, y);
  const bob = mood === 'idle' || mood === 'worry' ? Math.sin(t * 0.08) * z * 0.03 : 0;
  if (mood === 'dizzy') {
    // 뒤집혀 버둥
    ctx.translate(0, -z * 0.45);
    ctx.rotate(Math.PI * 0.9 + Math.sin(t * 0.25) * 0.12);
    ctx.translate(0, z * 0.55);
  }
  if (mood === 'curl') ctx.scale(1.08, 0.86);
  ctx.translate(0, bob);
  const fur = '#f2a24e', furD = '#c8742a', cream = '#fff1dc';
  // 꼬리
  ctx.strokeStyle = furD;
  ctx.lineCap = 'round';
  ctx.lineWidth = z * 0.17;
  const sw = Math.sin(t * 0.09) * 0.25 + (mood === 'punch' ? 0.3 : 0);
  ctx.beginPath();
  ctx.moveTo(-z * 0.28, -z * 0.3);
  ctx.quadraticCurveTo(-z * 0.95, -z * (0.45 - sw), -z * 0.72, -z * (1.05 + sw * 0.4));
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = z * 0.1;
  ctx.stroke();
  // 망토
  const fl = Math.sin(t * 0.12) * z * 0.06 + (mood === 'punch' ? -z * 0.12 : 0);
  ctx.fillStyle = '#b8322a';
  ctx.beginPath();
  ctx.moveTo(-z * 0.25, -z * 0.95);
  ctx.quadraticCurveTo(-z * 0.62 + fl, -z * 0.5, -z * 0.55 + fl, -z * 0.04);
  ctx.lineTo(-z * 0.05, -z * 0.08);
  ctx.lineTo(z * 0.12, -z * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.moveTo(-z * 0.4 + fl, -z * 0.5);
  ctx.lineTo(-z * 0.5 + fl, -z * 0.05);
  ctx.lineTo(-z * 0.33 + fl, -z * 0.06);
  ctx.fill();
  // 다리
  oval(ctx, -z * 0.17, -z * 0.08, z * 0.13, z * 0.1, furD);
  oval(ctx, z * 0.17, -z * 0.08, z * 0.13, z * 0.1, furD);
  oval(ctx, -z * 0.17, -z * 0.06, z * 0.11, z * 0.07, cream);
  oval(ctx, z * 0.19, -z * 0.06, z * 0.11, z * 0.07, cream);
  // 몸
  const bg = ctx.createLinearGradient(-z * 0.4, -z * 0.9, z * 0.4, -z * 0.1);
  bg.addColorStop(0, '#ffc27a');
  bg.addColorStop(1, fur);
  oval(ctx, 0, -z * 0.5, z * 0.4, z * 0.46, bg);
  // 가슴 갑옷
  const ag = ctx.createLinearGradient(-z * 0.3, -z * 0.8, z * 0.3, -z * 0.3);
  ag.addColorStop(0, '#f4f7fb');
  ag.addColorStop(0.5, '#b9c3cf');
  ag.addColorStop(1, '#8792a0');
  ctx.fillStyle = ag;
  ctx.beginPath();
  ctx.ellipse(z * 0.04, -z * 0.55, z * 0.3, z * 0.3, 0, -Math.PI * 0.95, Math.PI * 0.95);
  ctx.fill();
  ctx.fillStyle = '#e8c04a';
  ctx.beginPath();
  ctx.arc(z * 0.06, -z * 0.55, z * 0.07, 0, TAU);
  ctx.fill();
  emo(ctx, '🐾', z * 0.06, -z * 0.55, z * 0.11);
  // 줄무늬
  ctx.strokeStyle = 'rgba(160,80,20,.55)';
  ctx.lineWidth = z * 0.05;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(-z * 0.38, -z * (0.5 + k * 0.14));
    ctx.lineTo(-z * 0.26, -z * (0.48 + k * 0.14));
    ctx.stroke();
  }
  // 머리
  const hy = -z * 1.15, hr = z * 0.42;
  ctx.fillStyle = fur;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * hr * 0.2, hy - hr * 0.7);
    ctx.lineTo(sx * hr * 0.95, hy - hr * 1.18 + (mood === 'hit' ? hr * 0.4 : 0));
    ctx.lineTo(sx * hr * 0.92, hy - hr * 0.25);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb3b3';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * hr * 0.4, hy - hr * 0.7);
    ctx.lineTo(sx * hr * 0.85, hy - hr * 1.0 + (mood === 'hit' ? hr * 0.35 : 0));
    ctx.lineTo(sx * hr * 0.8, hy - hr * 0.42);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.4, hr * 0.1, 0, hy, hr * 1.1);
  hg.addColorStop(0, '#ffcf8f');
  hg.addColorStop(1, fur);
  oval(ctx, 0, hy, hr, hr * 0.92, hg);
  oval(ctx, hr * 0.22, hy + hr * 0.38, hr * 0.5, hr * 0.36, cream);
  // 투구 (은빛 + 깃털)
  const hgm = ctx.createLinearGradient(0, hy - hr, 0, hy - hr * 0.2);
  hgm.addColorStop(0, '#ffffff');
  hgm.addColorStop(1, '#9aa5b3');
  ctx.fillStyle = hgm;
  ctx.beginPath();
  ctx.ellipse(0, hy - hr * 0.32, hr * 0.98, hr * 0.78, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#7d8896';
  ctx.fillRect(-hr * 0.98, hy - hr * 0.36, hr * 1.96, hr * 0.12);
  ctx.fillStyle = '#e8413a';
  const pw = Math.sin(t * 0.15) * hr * 0.15;
  ctx.beginPath();
  ctx.moveTo(-hr * 0.1, hy - hr * 1.05);
  ctx.quadraticCurveTo(-hr * 0.7 + pw, hy - hr * 1.7, -hr * 1.2 + pw, hy - hr * 1.15);
  ctx.quadraticCurveTo(-hr * 0.5, hy - hr * 1.25, hr * 0.15, hy - hr * 0.98);
  ctx.fill();
  // 얼굴
  const ex = hr * 0.42, ey = hy + hr * 0.05;
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.4, z * 0.045);
  if (mood === 'dizzy') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      for (let a = 0; a < 9; a += 0.4) ctx.lineTo(sx * ex * 0.75 + hr * 0.15 + Math.cos(a + t * 0.3) * a * hr * 0.022, ey + Math.sin(a + t * 0.3) * a * hr * 0.022);
      ctx.stroke();
    }
  } else if (mood === 'smug' || mood === 'eat') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * ex * 0.75 + hr * 0.15, ey + hr * 0.04, hr * 0.13, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (mood === 'hit') {
    for (const sx of [-1, 1]) {
      const cx = sx * ex * 0.75 + hr * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.12, ey - hr * 0.1);
      ctx.lineTo(cx + hr * 0.1, ey);
      ctx.lineTo(cx - hr * 0.12, ey + hr * 0.1);
      ctx.stroke();
    }
  } else if (mood === 'punch' || mood === 'throw') {
    for (const sx of [-1, 1]) {
      const cx = sx * ex * 0.75 + hr * 0.18;
      oval(ctx, cx, ey, hr * 0.12, hr * 0.08, '#2a1a10');
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.16, ey - hr * 0.2 - sx * hr * 0.05);
      ctx.lineTo(cx + hr * 0.14, ey - hr * 0.13 + sx * hr * 0.05);
      ctx.stroke();
    }
  } else if (mood === 'wild') {
    for (const sx of [-1, 1]) {
      const cx = sx * ex * 0.75 + hr * 0.15;
      oval(ctx, cx, ey, hr * 0.17, hr * 0.17, '#fff8c0');
      oval(ctx, cx + hr * 0.03, ey, hr * 0.1, hr * 0.13, '#2a1a10');
      oval(ctx, cx - hr * 0.03, ey - hr * 0.06, hr * 0.04, hr * 0.04, '#ffffff');
    }
  } else if (mood === 'curl') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * ex * 0.75 + hr * 0.04, ey);
      ctx.lineTo(sx * ex * 0.75 + hr * 0.26, ey);
      ctx.stroke();
    }
  } else {
    const blink = (t % 170) < 6;
    for (const sx of [-1, 1]) {
      const cx = sx * ex * 0.75 + hr * 0.18;
      if (blink) {
        ctx.beginPath();
        ctx.moveTo(cx - hr * 0.1, ey);
        ctx.lineTo(cx + hr * 0.1, ey);
        ctx.stroke();
      } else {
        oval(ctx, cx, ey, hr * 0.11, hr * 0.14, '#2a1a10');
        oval(ctx, cx + hr * 0.035, ey - hr * 0.05, hr * 0.04, hr * 0.045, '#ffffff');
      }
    }
    if (mood === 'worry') oval(ctx, hr * 0.85, hy - hr * 0.2, hr * 0.08, hr * 0.13, '#9fd8ff');
  }
  // 코·입·수염
  ctx.fillStyle = '#ff8a9a';
  ctx.beginPath();
  ctx.moveTo(hr * 0.42, ey + hr * 0.22);
  ctx.lineTo(hr * 0.58, ey + hr * 0.22);
  ctx.lineTo(hr * 0.5, ey + hr * 0.32);
  ctx.fill();
  ctx.strokeStyle = '#5a3420';
  ctx.lineWidth = Math.max(1.2, z * 0.035);
  ctx.beginPath();
  if (mood === 'punch' || mood === 'hit' || mood === 'wild') {
    oval(ctx, hr * 0.5, ey + hr * 0.5, hr * 0.12, hr * (mood === 'hit' ? 0.14 : 0.1), '#7a2a2a');
  } else {
    ctx.arc(hr * 0.42, ey + hr * 0.34, hr * 0.08, 0, Math.PI);
    ctx.arc(hr * 0.58, ey + hr * 0.34, hr * 0.08, 0, Math.PI);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hr * 0.75, ey + hr * 0.3);
    ctx.lineTo(hr * 1.2, ey + hr * (0.24 + k * 0.1));
    ctx.stroke();
  }
  if (mood === 'eat') emo(ctx, '🐟', hr * 0.85, ey + hr * 0.45, hr * 0.7);
  // 앞발 (냥냥펀치면 쭉)
  const px = z * 0.32 + paw * z * 0.75, py = -z * 0.6 - paw * z * 0.1;
  if (paw > 0.05) {
    ctx.strokeStyle = fur;
    ctx.lineWidth = z * 0.16;
    ctx.beginPath();
    ctx.moveTo(z * 0.15, -z * 0.62);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(px - z * (0.35 + k * 0.08), py + z * (k - 1) * 0.12);
      ctx.lineTo(px - z * (0.6 + k * 0.1), py + z * (k - 1) * 0.12);
      ctx.stroke();
    }
  }
  oval(ctx, px, py, z * 0.14 * (1 + paw * 0.4), z * 0.12 * (1 + paw * 0.4), cream);
  ctx.fillStyle = '#ffb3c0';
  for (let k = 0; k < 3; k++) oval(ctx, px + z * 0.08 * (1 + paw * 0.4), py + (k - 1) * z * 0.05, z * 0.025, z * 0.025, '#ffb3c0');
  ctx.restore();
  // 막기 방울
  if (shieldA > 0.01) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, shieldA);
    const sg = ctx.createRadialGradient(x, y - z * 0.75, z * 0.3, x, y - z * 0.75, z * 1.05);
    sg.addColorStop(0, 'rgba(120,180,255,0)');
    sg.addColorStop(0.75, 'rgba(120,180,255,.22)');
    sg.addColorStop(1, 'rgba(190,225,255,.7)');
    oval(ctx, x, y - z * 0.75, z * 1.0, z * 1.05, sg);
    ctx.strokeStyle = 'rgba(220,240,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - z * 0.75, z * 1.0, z * 1.05, 0, Math.PI * 1.1, Math.PI * 1.5);
    ctx.stroke();
    ctx.restore();
  }
}

type MouseMood = 'idle' | 'smug' | 'hit' | 'scared' | 'angry' | 'charge' | 'dizzy' | 'laugh' | 'tangled';
const MOUSE_CLOTH = ['#3f6fb5', '#3f8a4a', '#8a5a2b', '#7a4ab0', '#8a5a2b', '#b8322a'];
/** 쥐 (왼쪽을 본다). look: 0 병사 1 궁수 2 방패 3 독 4 밤송이 5 대왕 */
function drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, look: number, mood: MouseMood, t: number, o: { thorns?: number; block?: number; lunge?: number } = {}) {
  ctx.save();
  ctx.translate(x, y);
  const shake = mood === 'scared' ? Math.sin(t * 1.7) * z * 0.04 : mood === 'angry' ? Math.sin(t * 0.9) * z * 0.03 : 0;
  const hop = mood === 'angry' ? -Math.abs(Math.sin(t * 0.35)) * z * 0.12 : mood === 'laugh' ? -Math.abs(Math.sin(t * 0.3)) * z * 0.08 : 0;
  ctx.translate(shake - (o.lunge ?? 0) * z, hop);
  if (mood === 'dizzy') ctx.rotate(Math.sin(t * 0.2) * 0.25);
  const fur = '#a7acb6', furL = '#d6d9df', pink = '#ffb3c0', cloth = MOUSE_CLOTH[look];
  const fat = look === 5 ? 1.25 : 1;
  // 꼬리
  ctx.strokeStyle = pink;
  ctx.lineCap = 'round';
  ctx.lineWidth = z * 0.07;
  const tw = Math.sin(t * 0.1) * z * 0.15;
  ctx.beginPath();
  ctx.moveTo(z * 0.3, -z * 0.25);
  ctx.bezierCurveTo(z * 0.9, -z * 0.1, z * 0.8, -z * 0.8 + tw, z * 1.1, -z * 0.95 + tw);
  ctx.stroke();
  // 다리
  oval(ctx, -z * 0.18, -z * 0.07, z * 0.14, z * 0.08, mix(fur, '#000000', 0.2));
  oval(ctx, z * 0.18, -z * 0.07, z * 0.14, z * 0.08, mix(fur, '#000000', 0.2));
  // 몸 + 옷
  const bw = z * 0.38 * fat, bh = z * 0.45;
  const bg = ctx.createLinearGradient(-bw, -z, bw, 0);
  bg.addColorStop(0, mix(cloth, '#ffffff', 0.25));
  bg.addColorStop(1, mix(cloth, '#000000', 0.15));
  oval(ctx, 0, -z * 0.48, bw, bh, bg);
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath();
  ctx.ellipse(-bw * 0.3, -z * 0.62, bw * 0.35, bh * 0.4, -0.4, 0, TAU);
  ctx.fill();
  if (look === 5) {
    // 대왕: 흰 털 망토 깃 + 배
    oval(ctx, 0, -z * 0.85, bw * 0.9, z * 0.14, '#fbf7ee');
    for (let k = -2; k <= 2; k++) oval(ctx, k * bw * 0.32, -z * 0.85, z * 0.025, z * 0.035, '#222');
    oval(ctx, -bw * 0.15, -z * 0.4, bw * 0.55, bh * 0.55, furL);
  } else if (look === 4) {
    // 밤송이 갑옷: 가시가 자란다
    const n = 7 + Math.min(10, (o.thorns ?? 0) * 2), L = z * (0.12 + Math.min(0.22, (o.thorns ?? 0) * 0.045));
    ctx.strokeStyle = '#5a3a14';
    ctx.lineWidth = Math.max(1.5, z * 0.04);
    for (let k = 0; k < n; k++) {
      const a = -Math.PI * 0.95 + (k / (n - 1)) * Math.PI * 0.95 * 2 - Math.PI / 2 + Math.PI / 2;
      const ax = Math.cos(a - Math.PI / 2) * bw, ay = -z * 0.48 + Math.sin(a - Math.PI / 2) * bh;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax + Math.cos(a - Math.PI / 2) * L, ay + Math.sin(a - Math.PI / 2) * L);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,80,30,.6)';
    for (let k = 0; k < 6; k++) oval(ctx, (hsh(k) - 0.5) * bw * 1.4, -z * (0.3 + hsh(k + 9) * 0.4), z * 0.03, z * 0.03, '#6b4a1e');
  } else {
    // 벨트
    ctx.fillStyle = 'rgba(40,24,10,.7)';
    ctx.fillRect(-bw * 0.95, -z * 0.36, bw * 1.9, z * 0.07);
    ctx.fillStyle = '#e8c04a';
    ctx.fillRect(-z * 0.05, -z * 0.37, z * 0.1, z * 0.09);
  }
  // 손 + 소품
  const hx = -bw * 0.95, hyy = -z * 0.55;
  if (look === 0) {
    ctx.strokeStyle = '#7a5530';
    ctx.lineWidth = z * 0.06;
    ctx.beginPath();
    ctx.moveTo(hx + z * 0.1, -z * 0.05);
    ctx.lineTo(hx - z * 0.05, -z * 1.35);
    ctx.stroke();
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath();
    ctx.moveTo(hx - z * 0.05, -z * 1.55);
    ctx.lineTo(hx - z * 0.13, -z * 1.32);
    ctx.lineTo(hx + z * 0.03, -z * 1.32);
    ctx.fill();
  } else if (look === 1) {
    ctx.strokeStyle = '#6b4a1e';
    ctx.lineWidth = z * 0.06;
    ctx.beginPath();
    ctx.arc(hx + z * 0.05, hyy, z * 0.42, Math.PI * 0.6, Math.PI * 1.4);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(hx - z * 0.08, hyy - z * 0.4);
    ctx.lineTo(hx - z * 0.08, hyy + z * 0.4);
    ctx.stroke();
  } else if (look === 2) {
    // 큰 나무 방패 (방패가 있으면 빛난다)
    const sh = ctx.createRadialGradient(hx - z * 0.1, hyy - z * 0.1, z * 0.05, hx, hyy, z * 0.42);
    sh.addColorStop(0, '#d9a066');
    sh.addColorStop(1, '#8a5a2b');
    oval(ctx, hx, hyy, z * 0.3, z * 0.4, sh);
    ctx.strokeStyle = '#cfd6de';
    ctx.lineWidth = z * 0.05;
    ctx.beginPath();
    ctx.ellipse(hx, hyy, z * 0.3, z * 0.4, 0, 0, TAU);
    ctx.stroke();
    oval(ctx, hx, hyy, z * 0.07, z * 0.07, '#e8c04a');
    emo(ctx, '🧀', hx, hyy + z * 0.18, z * 0.16);
  } else if (look === 3) {
    oval(ctx, hx, hyy, z * 0.12, z * 0.12, '#7dff8a');
    ctx.fillStyle = '#d8f5ff';
    ctx.fillRect(hx - z * 0.04, hyy - z * 0.22, z * 0.08, z * 0.12);
    ctx.fillStyle = 'rgba(160,255,160,.7)';
    for (let k = 0; k < 3; k++) oval(ctx, hx + Math.sin(t * 0.1 + k * 2) * z * 0.06, hyy - z * (0.3 + ((t * 0.01 + k * 0.33) % 1) * 0.4), z * 0.035, z * 0.035, 'rgba(160,255,160,.7)');
  } else if (look === 5) {
    ctx.strokeStyle = '#e8c04a';
    ctx.lineWidth = z * 0.06;
    ctx.beginPath();
    ctx.moveTo(hx, -z * 0.1);
    ctx.lineTo(hx - z * 0.1, -z * 1.2);
    ctx.stroke();
    emo(ctx, '🧀', hx - z * 0.12, -z * 1.3, z * 0.3);
  }
  oval(ctx, hx, hyy + (look === 1 ? 0 : z * 0.05), z * 0.08, z * 0.08, furL);
  // 머리
  const hy = -z * 1.08, hr = z * 0.36 * (look === 5 ? 1.1 : 1);
  for (const sx of [-1, 1]) {
    const ear = mood === 'scared' ? -0.15 : 0;
    oval(ctx, sx * hr * 0.75, hy - hr * (0.8 + ear), hr * 0.55, hr * 0.55, fur);
    oval(ctx, sx * hr * 0.75, hy - hr * (0.8 + ear), hr * 0.36, hr * 0.36, pink);
  }
  const hg = ctx.createRadialGradient(-hr * 0.3, hy - hr * 0.3, hr * 0.1, 0, hy, hr * 1.1);
  hg.addColorStop(0, furL);
  hg.addColorStop(1, fur);
  oval(ctx, 0, hy, hr, hr * 0.92, hg);
  // 주둥이 (왼쪽)
  oval(ctx, -hr * 0.62, hy + hr * 0.18, hr * 0.5, hr * 0.38, furL);
  oval(ctx, -hr * 1.08, hy + hr * 0.12, hr * 0.14, hr * 0.12, '#ff7a8f');
  ctx.strokeStyle = 'rgba(60,60,70,.7)';
  ctx.lineWidth = 1;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(-hr * 0.85, hy + hr * 0.28);
    ctx.lineTo(-hr * 1.45, hy + hr * (0.22 + k * 0.14));
    ctx.stroke();
  }
  // 모자
  if (look === 0) {
    ctx.fillStyle = '#9aa5b3';
    ctx.beginPath();
    ctx.ellipse(0, hy - hr * 0.35, hr * 0.85, hr * 0.6, 0, Math.PI, 0);
    ctx.fill();
  } else if (look === 1) {
    ctx.fillStyle = '#2f6a38';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.9, hy - hr * 0.2);
    ctx.quadraticCurveTo(0, hy - hr * 1.5, hr * 0.95, hy - hr * 0.1);
    ctx.lineTo(hr * 1.3, hy - hr * 0.7);
    ctx.quadraticCurveTo(0, hy - hr * 0.6, -hr * 0.9, hy - hr * 0.2);
    ctx.fill();
  } else if (look === 3) {
    ctx.fillStyle = '#5a2e8a';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.85, hy - hr * 0.4);
    ctx.lineTo(hr * 0.2, hy - hr * 1.9);
    ctx.lineTo(hr * 0.85, hy - hr * 0.4);
    ctx.fill();
    emo(ctx, '⭐', hr * 0.1, hy - hr * 1.0, hr * 0.4);
  } else if (look === 5) {
    ctx.fillStyle = '#f2c230';
    ctx.beginPath();
    ctx.moveTo(-hr * 0.7, hy - hr * 0.55);
    for (let k = 0; k <= 4; k++) ctx.lineTo(-hr * 0.7 + k * hr * 0.35, hy - hr * (k % 2 ? 0.95 : 1.45));
    ctx.lineTo(hr * 0.7, hy - hr * 0.55);
    ctx.fill();
    for (let k = 0; k < 3; k++) oval(ctx, -hr * 0.35 + k * hr * 0.35, hy - hr * 0.72, hr * 0.08, hr * 0.08, ['#e8413a', '#3a86ff', '#2fb05a'][k]);
  } else if (look === 4) {
    ctx.fillStyle = '#7a5a2a';
    ctx.beginPath();
    ctx.ellipse(0, hy - hr * 0.45, hr * 0.8, hr * 0.5, 0, Math.PI, 0);
    ctx.fill();
  }
  // 눈
  const ex = -hr * 0.28, ey = hy - hr * 0.02;
  ctx.strokeStyle = '#1a1a22';
  ctx.lineWidth = Math.max(1.3, z * 0.04);
  ctx.fillStyle = '#1a1a22';
  const eyes = (fn: (cx: number) => void) => [ex - hr * 0.22, ex + hr * 0.3].forEach(fn);
  if (mood === 'dizzy' || mood === 'tangled') {
    eyes((cx) => {
      ctx.beginPath();
      for (let a = 0; a < 8; a += 0.4) ctx.lineTo(cx + Math.cos(a + t * 0.3) * a * hr * 0.02, ey + Math.sin(a + t * 0.3) * a * hr * 0.02);
      ctx.stroke();
    });
  } else if (mood === 'hit') {
    eyes((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.1, ey - hr * 0.1);
      ctx.lineTo(cx + hr * 0.1, ey + hr * 0.1);
      ctx.moveTo(cx + hr * 0.1, ey - hr * 0.1);
      ctx.lineTo(cx - hr * 0.1, ey + hr * 0.1);
      ctx.stroke();
    });
  } else if (mood === 'scared') {
    eyes((cx) => {
      oval(ctx, cx, ey, hr * 0.16, hr * 0.19, '#ffffff');
      oval(ctx, cx - hr * 0.03, ey + hr * 0.03, hr * 0.05, hr * 0.05, '#1a1a22');
    });
    oval(ctx, hr * 0.7, hy - hr * 0.3, hr * 0.09, hr * 0.15, '#9fd8ff');
  } else if (mood === 'smug' || mood === 'laugh') {
    eyes((cx) => {
      ctx.beginPath();
      ctx.arc(cx, ey + hr * 0.06, hr * 0.11, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    });
  } else {
    eyes((cx) => {
      oval(ctx, cx, ey, hr * 0.09, hr * 0.12, '#1a1a22');
      oval(ctx, cx - hr * 0.03, ey - hr * 0.04, hr * 0.035, hr * 0.035, '#ffffff');
    });
  }
  if (mood === 'angry' || mood === 'charge') {
    ctx.strokeStyle = '#1a1a22';
    ctx.lineWidth = Math.max(1.6, z * 0.05);
    eyes((cx) => {
      ctx.beginPath();
      ctx.moveTo(cx - hr * 0.14, ey - hr * 0.26);
      ctx.lineTo(cx + hr * 0.14, ey - hr * 0.14);
      ctx.stroke();
    });
    if (mood === 'angry') oval(ctx, -hr * 0.3, hy + hr * 0.2, hr * 0.5, hr * 0.25, 'rgba(255,90,90,.35)');
  }
  // 입
  ctx.strokeStyle = '#3a2a2a';
  ctx.lineWidth = Math.max(1.2, z * 0.035);
  if (mood === 'laugh' || mood === 'scared' || mood === 'hit') oval(ctx, -hr * 0.62, hy + hr * 0.45, hr * 0.15, hr * (mood === 'laugh' ? 0.14 : 0.1), '#5a2030');
  else if (mood === 'smug' || mood === 'charge') {
    ctx.beginPath();
    ctx.moveTo(-hr * 0.8, hy + hr * 0.4);
    ctx.quadraticCurveTo(-hr * 0.6, hy + hr * 0.55, -hr * 0.35, hy + hr * 0.35);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-hr * 0.72, hy + hr * 0.42, hr * 0.12, hr * 0.12);
  } else {
    ctx.beginPath();
    ctx.moveTo(-hr * 0.75, hy + hr * 0.45);
    ctx.lineTo(-hr * 0.5, hy + hr * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

/** 카드 한 장 (cx, cy = 가운데, 화면 px) */
function drawCard(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number, ci: number, o: { combo?: number; f?: Fight; glow?: string; lift?: number; rot?: number; alpha?: number; scale?: number }, R: (r: number) => number) {
  const heart = ci < 0, milk = ci === HPUP, c = heart ? null : CARDS[ci], fam = c ? c.fam : 2;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(cx, cy - (o.lift ?? 0));
  if (o.rot) ctx.rotate(o.rot);
  if (o.scale) ctx.scale(o.scale, o.scale);
  const x0 = -cw / 2, y0 = -ch / 2, rr = cw * 0.09;
  // 그림자 + 두께
  ctx.fillStyle = 'rgba(10,5,0,.4)';
  ctx.beginPath();
  ctx.roundRect(x0 + cw * 0.04, y0 + ch * 0.05 + (o.lift ?? 0) * 0.3, cw, ch, rr);
  ctx.fill();
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = o.glow;
    ctx.shadowBlur = R(0.05);
    ctx.fillStyle = o.glow;
    ctx.beginPath();
    ctx.roundRect(x0 - 2, y0 - 2, cw + 4, ch + 4, rr + 2);
    ctx.fill();
    ctx.restore();
  }
  const col = milk ? '#c9a24a' : heart ? '#e8577a' : FAM_COL[fam], dark = milk ? '#7a5a1a' : heart ? '#9c2a48' : FAM_DARK[fam], tint = milk ? '#fff4d0' : heart ? '#ffe0ea' : FAM_TINT[fam];
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.roundRect(x0, y0 + ch * 0.02, cw, ch, rr);
  ctx.fill();
  const pg = ctx.createLinearGradient(0, y0, 0, y0 + ch);
  pg.addColorStop(0, '#fffaf0');
  pg.addColorStop(1, '#f3e6cc');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.roundRect(x0, y0, cw, ch, rr);
  ctx.fill();
  ctx.strokeStyle = col;
  ctx.lineWidth = Math.max(2, cw * 0.03);
  ctx.beginPath();
  ctx.roundRect(x0 + 2, y0 + 2, cw - 4, ch - 4, rr * 0.8);
  ctx.stroke();
  // 머리띠 + 이름
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.roundRect(x0 + 3, y0 + 3, cw - 6, ch * 0.17, [rr * 0.7, rr * 0.7, 2, 2]);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let fs = R(0.04);
  ctx.font = `900 ${fs}px system-ui, sans-serif`;
  const nm = milk ? '우유 한 사발' : heart ? '하트 하나' : c!.name;
  while (ctx.measureText(nm).width > cw * 0.86 && fs > R(0.036)) ctx.font = `900 ${(fs -= 0.5)}px system-ui, sans-serif`;
  ctx.fillText(nm, 0, y0 + 3 + ch * 0.085);
  // 그림 창
  const ay = y0 + ch * 0.37, ar = ch * 0.17;
  const wg = ctx.createRadialGradient(0, ay - ar * 0.3, ar * 0.1, 0, ay, ar * 1.5);
  wg.addColorStop(0, '#ffffff');
  wg.addColorStop(1, tint);
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.roundRect(-cw * 0.38, ay - ar, cw * 0.76, ar * 2, rr * 0.6);
  ctx.fill();
  ctx.strokeStyle = mix(col, '#ffffff', 0.5);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 카드 속 고양이 실루엣 (카드에서 튀어나온다)
  ctx.globalAlpha = (o.alpha ?? 1) * 0.16;
  emo(ctx, '🐈', -cw * 0.22, ay + ar * 0.45, ar * 0.7);
  ctx.globalAlpha = o.alpha ?? 1;
  emo(ctx, milk ? '🥛' : heart ? '💖' : c!.emoji, 0, ay, ar * 1.35);
  // 효과 글
  const k = (o.combo ?? 1) - 1;
  let eff = milk ? [`최대 체력 +${HP_UP}`, '원정 내내'] : heart ? ['하트 +1', '원정이 든든'] : c!.text.split(' · ');
  if (c && k > 0) {
    if (c.plusHit) eff = [`${c.dmg} × ${(c.hits ?? 1) + k * c.plusHit}대`, ...eff.slice(1)];
    else if (c.plusDmg && c.dmg) eff = [eff[0].replace(String(c.dmg), String(c.dmg + k * c.plusDmg)), ...eff.slice(1)];
    else if (c.plusBlock && c.block) eff = [eff[0].replace(String(c.block), String(c.block + k * c.plusBlock)), ...eff.slice(1)];
  }
  if (c?.nip === undefined && o.f?.nip && c?.dmg) eff = [eff[0] + ' ×2', ...eff.slice(1)];
  ctx.fillStyle = '#2a1a10';
  const ly = y0 + ch * 0.66;
  eff.slice(0, 2).forEach((line, j) => {
    let f2 = R(j === 0 && eff.length > 1 ? 0.042 : eff.length > 1 ? 0.037 : 0.044);
    ctx.font = `900 ${f2}px system-ui, sans-serif`;
    while (ctx.measureText(line).width > cw * 0.92 && f2 > R(0.036)) ctx.font = `900 ${(f2 -= 0.5)}px system-ui, sans-serif`;
    ctx.fillText(line, 0, ly + j * R(0.043) - (eff.length > 1 ? R(0.012) : 0));
  });
  // 콤보 띠
  if (c && c.combo) {
    const on = k > 0;
    ctx.fillStyle = on ? '#ff7a1a' : 'rgba(80,60,40,.12)';
    ctx.beginPath();
    ctx.roundRect(-cw * 0.42, y0 + ch * 0.86, cw * 0.84, ch * 0.105, ch * 0.05);
    ctx.fill();
    ctx.fillStyle = on ? '#ffffff' : 'rgba(80,60,40,.75)';
    ctx.font = `800 ${R(0.036)}px system-ui, sans-serif`;
    ctx.fillText(on ? `🔥 콤보 ×${k + 1}` : c.combo, 0, y0 + ch * 0.915);
  }
  ctx.restore();
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function intentLook(it: Intent, king: boolean): { e: string; num: string; label: string; col: string } {
  switch (it.k) {
    case 'atk': return { e: '⚔️', num: `${it.v}`, label: '공격', col: '#c8402e' };
    case 'smash': return { e: '💥', num: `${it.v}`, label: '큰 공격!', col: '#b0201a' };
    case 'multi': return { e: '🏹', num: `${it.v}×${it.n}`, label: '연속 화살', col: '#c8402e' };
    case 'shield': return { e: '🛡️', num: `+${it.v}`, label: '방패', col: '#2f5fae' };
    case 'poison': return { e: '🧪', num: `${it.v}`, label: '독 병', col: '#3e8a3a' };
    case 'spike': return { e: '🌵', num: `+${it.v}`, label: '가시', col: '#7a5a2a' };
    default: return { e: '⏳', num: '', label: king ? '기 모으기' : '조준', col: '#9a7a1a' };
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: CatState, w: number, _h: number, th: Theme) {
  const fx = juice(s), t = s.t, f = s.f, st = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 30 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), Math.max(R(0.12), y), text, col, size);
  };
  const ph = s.phase, pt = s.pt, rec = ph === 'cat' ? s.rec : null, frec = ph === 'foe' ? s.frec : null;
  const plan = frec ? foePlan(frec) : null;
  const phaseKey = s.t - s.pt;
  const once = (name: string) => {
    const k = `${name}@${phaseKey}`;
    if (fx.memo[k]) return false;
    fx.memo[k] = 1;
    return true;
  };
  // ── 지금 보여 줄 수치 (연출 시간에 맞춰 한 대씩 줄어든다) ──
  const showHp = f.foes.map((x) => x.hp), showBlk = f.foes.map((x) => x.block);
  let catHp = f.hp, catBlk = f.block;
  if (rec) {
    rec.hp0.forEach((v, i) => (showHp[i] = v));
    rec.blk0.forEach((v, i) => (showBlk[i] = v));
    catHp = rec.catHp0;
    catBlk = pt >= HIT0 ? rec.block : 0;
    if (pt >= HIT0 - 2) for (const i of rec.brk) showBlk[i] = 0;
    for (const hh of rec.hits)
      if (pt >= hitAt(rec, hh.h)) (showHp[hh.foe] -= hh.dmg), (showBlk[hh.foe] -= hh.soak), (catHp -= hh.back);
    if (pt >= HIT0) catHp += rec.heal;
  }
  if (frec && plan) {
    catHp = frec.catHp0;
    catBlk = frec.blk0;
    frec.hp0.forEach((v, i) => (showHp[i] = v));
    frec.acts.forEach((a, j) => {
      const T = plan.start[j];
      if (a.wound && pt >= T + 3) showHp[a.foe] -= a.wound;
      a.hits.forEach((hh, k) => {
        if (pt >= T + FOE_HIT + k * FOE_GAP) (catHp -= hh.dmg), (catBlk -= hh.soak), (showHp[a.foe] -= hh.back);
      });
    });
    if (frec.poison && pt >= plan.poisonAt) catHp -= frec.poison;
    if (pt >= plan.poisonAt - 4) catBlk = 0;
  }
  ctx.save();
  fx.begin(ctx);
  // ═════════ 벽 (저녁 거실) ═════════
  const TB = 0.3; // 테이블 뒤 끝
  const wall = ctx.createLinearGradient(0, 0, 0, Y(TB));
  wall.addColorStop(0, '#3b2a3f');
  wall.addColorStop(1, '#5a3d43');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, Y(TB) + 12);
  ctx.fillStyle = 'rgba(255,220,180,.05)';
  for (let k = 0; k < 12; k++) ctx.fillRect(X(k / 12 + 0.02), 0, R(0.035), Y(TB));
  // 창문 (밤하늘·달)
  {
    const wx = X(0.6), wy = Y(0.1), ww = R(0.3), wh = R(0.16);
    ctx.fillStyle = '#6b4a30';
    ctx.fillRect(wx - 4, wy - 4, ww + 8, wh + 8);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#1c2350');
    sky.addColorStop(1, '#4a3a6e');
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = `rgba(255,250,220,${0.4 + 0.5 * Math.abs(Math.sin(t / 37 + k))})`;
      ctx.fillRect(wx + hsh(k) * ww, wy + hsh(k + 30) * wh * 0.8, 1.6, 1.6);
    }
    ctx.save();
    ctx.shadowColor = '#fff6c8';
    ctx.shadowBlur = R(0.04);
    oval(ctx, wx + ww * 0.75, wy + wh * 0.32, R(0.025), R(0.025), '#fff4c8');
    ctx.restore();
    ctx.fillStyle = '#6b4a30';
    ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh);
    ctx.fillRect(wx, wy + wh / 2 - 2, ww, 4);
    // 커튼
    ctx.fillStyle = '#9a3a3a';
    for (const sx of [0, 1]) {
      ctx.beginPath();
      const cx0 = sx ? wx + ww + 6 : wx - 6;
      ctx.moveTo(cx0, wy - 8);
      ctx.quadraticCurveTo(cx0 + (sx ? -1 : 1) * R(0.05), wy + wh * 0.5, cx0 + (sx ? 1 : -1) * R(0.01), wy + wh + 10);
      ctx.lineTo(cx0 + (sx ? 1 : -1) * R(0.04), wy + wh + 10);
      ctx.lineTo(cx0 + (sx ? 1 : -1) * R(0.04), wy - 8);
      ctx.fill();
    }
  }
  // 액자 (고양이 기사단 깃발)
  {
    const px = X(0.17), py = Y(0.12);
    ctx.fillStyle = '#c99a4a';
    ctx.fillRect(px - R(0.07), py - R(0.045), R(0.14), R(0.1));
    ctx.fillStyle = '#f3e3c0';
    ctx.fillRect(px - R(0.058), py - R(0.034), R(0.116), R(0.078));
    emo(ctx, '🐱', px, py + R(0.005), R(0.05));
  }
  // 등불 빛
  {
    const lg = ctx.createRadialGradient(X(0.12), Y(0.0), R(0.02), X(0.12), Y(0.1), R(0.9));
    lg.addColorStop(0, 'rgba(255,214,140,.45)');
    lg.addColorStop(1, 'rgba(255,214,140,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, w, Y(0.9));
  }
  // ═════════ 테이블 ═════════
  const TF = 0.86;
  const tg = ctx.createLinearGradient(0, Y(TB), 0, Y(TF));
  tg.addColorStop(0, '#6a4224');
  tg.addColorStop(1, '#9a6538');
  ctx.fillStyle = tg;
  ctx.fillRect(-10, Y(TB), w + 20, Y(TF - TB));
  ctx.strokeStyle = 'rgba(40,20,8,.25)';
  ctx.lineWidth = 1;
  for (let k = -6; k <= 6; k++) {
    ctx.beginPath();
    ctx.moveTo(X(0.5 + k * 0.06), Y(TB));
    ctx.lineTo(X(0.5 + k * 0.17), Y(TF));
    ctx.stroke();
  }
  for (let k = 0; k < 10; k++) {
    ctx.strokeStyle = 'rgba(255,220,170,.06)';
    ctx.beginPath();
    const yy = TB + (k / 10) ** 1.3 * (TF - TB);
    ctx.moveTo(0, Y(yy));
    ctx.bezierCurveTo(X(0.3), Y(yy + 0.01), X(0.6), Y(yy - 0.01), w, Y(yy));
    ctx.stroke();
  }
  // 보드판 (판지, 두께)
  const BX0 = 0.07, BX1 = 0.93, BY0 = 0.36, BX0f = 0.02, BX1f = 0.98, BY1 = 0.83;
  ctx.fillStyle = '#2e4a3a';
  ctx.beginPath();
  ctx.moveTo(X(BX0f), Y(BY1));
  ctx.lineTo(X(BX1f), Y(BY1));
  ctx.lineTo(X(BX1f), Y(BY1 + 0.018));
  ctx.lineTo(X(BX0f), Y(BY1 + 0.018));
  ctx.fill();
  const bgd = ctx.createLinearGradient(0, Y(BY0), 0, Y(BY1));
  bgd.addColorStop(0, '#6fa07a');
  bgd.addColorStop(1, '#8cc08f');
  ctx.fillStyle = bgd;
  ctx.beginPath();
  ctx.moveTo(X(BX0), Y(BY0));
  ctx.lineTo(X(BX1), Y(BY0));
  ctx.lineTo(X(BX1f), Y(BY1));
  ctx.lineTo(X(BX0f), Y(BY1));
  ctx.fill();
  ctx.strokeStyle = '#f3e3c0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(BX0 + 0.015), Y(BY0 + 0.012));
  ctx.lineTo(X(BX1 - 0.015), Y(BY0 + 0.012));
  ctx.lineTo(X(BX1f - 0.02), Y(BY1 - 0.012));
  ctx.lineTo(X(BX0f + 0.02), Y(BY1 - 0.012));
  ctx.closePath();
  ctx.stroke();
  // 판 무늬 (작은 숲·꽃)
  for (let k = 0; k < 9; k++) {
    const gx = 0.1 + hsh(k + 40) * 0.8, gy = 0.5 + hsh(k + 50) * 0.3;
    oval(ctx, X(gx), Y(gy), R(0.03), R(0.012), 'rgba(40,90,50,.25)');
  }
  // 원정 길: 일곱 칸 (지나온 칸엔 발도장)
  const path: [number, number][] = [[0.13, 0.47], [0.24, 0.43], [0.35, 0.45], [0.46, 0.42], [0.57, 0.44], [0.67, 0.41], [0.78, 0.4]];
  ctx.strokeStyle = 'rgba(255,245,220,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  path.forEach(([px, py], k) => (k ? ctx.lineTo(X(px), Y(py)) : ctx.moveTo(X(px), Y(py))));
  ctx.lineTo(X(0.86), Y(0.37));
  ctx.stroke();
  ctx.setLineDash([]);
  path.forEach(([px, py], k) => {
    const cur = k === s.stage, done = k < s.stage || (k === s.stage && (ph === 'reward' || ph === 'next' || (ph === 'result' && s.ok)));
    ctx.fillStyle = 'rgba(30,50,30,.35)';
    ctx.beginPath();
    ctx.ellipse(X(px) + 1.5, Y(py) + 2, R(0.034), R(0.014), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = cur ? '#ffe08a' : done ? '#f3e3c0' : '#e8dcc0';
    ctx.beginPath();
    ctx.ellipse(X(px), Y(py), R(0.034), R(0.014), 0, 0, TAU);
    ctx.fill();
    if (done) emo(ctx, '🐾', X(px), Y(py) - 1, R(0.022));
    if (cur && !done) {
      ctx.strokeStyle = `rgba(255,200,80,${0.5 + 0.5 * Math.sin(t * 0.15)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(X(px), Y(py), R(0.042), R(0.019), 0, 0, TAU);
      ctx.stroke();
    }
  });
  // 쥐 성 (판지 오려 세운 성)
  {
    const cx = X(0.88), cy = Y(0.39), cz = R(0.1);
    oval(ctx, cx + cz * 0.2, cy + 2, cz * 1.1, cz * 0.18, 'rgba(20,30,20,.35)');
    const sg = ctx.createLinearGradient(cx - cz, 0, cx + cz, 0);
    sg.addColorStop(0, '#b9b2a6');
    sg.addColorStop(1, '#8a8378');
    ctx.fillStyle = sg;
    ctx.fillRect(cx - cz * 0.8, cy - cz * 1.1, cz * 1.6, cz * 1.1);
    for (const tx of [-0.95, 0.55]) {
      ctx.fillRect(cx + tx * cz, cy - cz * 1.7, cz * 0.4, cz * 1.7);
      ctx.fillStyle = '#7a4a8a';
      ctx.beginPath();
      ctx.moveTo(cx + tx * cz - cz * 0.05, cy - cz * 1.7);
      ctx.lineTo(cx + tx * cz + cz * 0.2, cy - cz * 2.15);
      ctx.lineTo(cx + tx * cz + cz * 0.45, cy - cz * 1.7);
      ctx.fill();
      ctx.fillStyle = s.won ? '#ff8a2a' : '#f2c230';
      ctx.beginPath();
      const fw = Math.sin(t * 0.12 + tx) * cz * 0.08;
      ctx.moveTo(cx + tx * cz + cz * 0.2, cy - cz * 2.15);
      ctx.lineTo(cx + tx * cz + cz * 0.2, cy - cz * 2.45);
      ctx.lineTo(cx + tx * cz + cz * 0.5 + fw, cy - cz * 2.35);
      ctx.lineTo(cx + tx * cz + cz * 0.2, cy - cz * 2.27);
      ctx.fill();
      ctx.fillStyle = sg;
    }
    for (let k = 0; k < 4; k++) ctx.fillRect(cx - cz * 0.8 + k * cz * 0.45, cy - cz * 1.25, cz * 0.25, cz * 0.18);
    ctx.fillStyle = '#4a3020';
    ctx.beginPath();
    ctx.ellipse(cx, cy - cz * 0.3, cz * 0.25, cz * 0.32, 0, Math.PI, 0);
    ctx.fillRect(cx - cz * 0.25, cy - cz * 0.3, cz * 0.5, cz * 0.3);
    ctx.fill();
    if (s.won) {
      emo(ctx, '🐾', cx, cy - cz * 0.75, cz * 0.4);
      for (const tx of [-0.75, 0.75]) emo(ctx, '🚩', cx + tx * cz, cy - cz * 2.6 - Math.abs(Math.sin(t * 0.1)) * cz * 0.1, cz * 0.35);
    }
    // 성벽 위 구경꾼 쥐 (환호·놀람)
    const cheer = (ph === 'foe' && catHp < (frec?.catHp0 ?? 99)) || (ph === 'result' && !s.ok);
    const gasp = (ph === 'cat' && !!rec && rec.hits.length > 0) || (ph === 'result' && s.ok);
    for (let k = 0; k < 3; k++) {
      const mx = cx - cz * 0.6 + k * cz * 0.55, my = cy - cz * 1.25 - (cheer ? Math.abs(Math.sin(t * 0.3 + k)) * cz * 0.25 : 0);
      oval(ctx, mx - cz * 0.1, my - cz * 0.12, cz * 0.08, cz * 0.08, '#a7acb6');
      oval(ctx, mx + cz * 0.1, my - cz * 0.12, cz * 0.08, cz * 0.08, '#a7acb6');
      oval(ctx, mx, my, cz * 0.12, cz * 0.1, '#bfc3cb');
      oval(ctx, mx - cz * 0.05, my - cz * 0.01, cz * 0.02, gasp ? cz * 0.035 : cz * 0.02, '#1a1a22');
      oval(ctx, mx + cz * 0.05, my - cz * 0.01, cz * 0.02, gasp ? cz * 0.035 : cz * 0.02, '#1a1a22');
      if (cheer && k === 1 && once('chik')) say(mx, my - cz * 0.3, '찍찍!', '#e8ecff', R(0.04));
    }
  }
  // 소품: 찻잔(김) · 주사위
  {
    const ux = X(0.08), uy = Y(0.42);
    oval(ctx, ux + 3, uy + 3, R(0.05), R(0.016), 'rgba(20,10,0,.3)');
    oval(ctx, ux, uy, R(0.05), R(0.017), '#f4efe6');
    ctx.fillStyle = '#e8e2d6';
    ctx.fillRect(ux - R(0.032), uy - R(0.045), R(0.064), R(0.045));
    oval(ctx, ux, uy - R(0.045), R(0.032), R(0.01), '#7a4a22');
    ctx.strokeStyle = 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      const sx = ux - R(0.008) + k * R(0.016);
      ctx.moveTo(sx, uy - R(0.06));
      ctx.bezierCurveTo(sx + R(0.015) * Math.sin(t * 0.05 + k), uy - R(0.09), sx - R(0.015), uy - R(0.11), sx + R(0.01) * Math.sin(t * 0.04 + k), uy - R(0.14));
      ctx.stroke();
    }
    const dx = X(0.93), dy = Y(0.49), dz = R(0.03);
    ctx.fillStyle = '#d8d0c4';
    ctx.fillRect(dx - dz, dy - dz * 0.6, dz * 2, dz * 1.4);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dx - dz, dy - dz * 1.2, dz * 2, dz * 0.8);
    oval(ctx, dx, dy - dz * 0.8, dz * 0.15, dz * 0.12, '#c8402e');
    oval(ctx, dx - dz * 0.5, dy + dz * 0.2, dz * 0.12, dz * 0.12, '#222');
    oval(ctx, dx + dz * 0.5, dy + dz * 0.4, dz * 0.12, dz * 0.12, '#222');
  }
  // 판지 나무 (받침에 꽂아 세운 소품)
  for (const [tx0, ty0, tz0] of [[0.07, 0.56, 0.05], [0.46, 0.5, 0.042], [0.96, 0.74, 0.05], [0.04, 0.72, 0.04]] as [number, number, number][]) {
    const tx = X(tx0), ty = Y(ty0), tz = R(tz0);
    oval(ctx, tx + tz * 0.4, ty + tz * 0.12, tz * 0.9, tz * 0.25, 'rgba(20,40,20,.35)');
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(tx - tz * 0.1, ty - tz * 0.6, tz * 0.2, tz * 0.6);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k % 2 ? '#3f8a4a' : '#4fa058';
      ctx.beginPath();
      ctx.moveTo(tx - tz * (0.75 - k * 0.15), ty - tz * (0.5 + k * 0.55));
      ctx.lineTo(tx, ty - tz * (1.5 + k * 0.55));
      ctx.lineTo(tx + tz * (0.75 - k * 0.15), ty - tz * (0.5 + k * 0.55));
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,240,190,.22)';
    ctx.beginPath();
    ctx.moveTo(tx - tz * 0.5, ty - tz * 0.6);
    ctx.lineTo(tx, ty - tz * 2.5);
    ctx.lineTo(tx - tz * 0.1, ty - tz * 0.6);
    ctx.fill();
  }
  // 싸움 자리에 떨어지는 따뜻한 등불
  {
    const sg = ctx.createRadialGradient(X(0.48), Y(0.7), R(0.05), X(0.48), Y(0.7), R(0.5));
    sg.addColorStop(0, 'rgba(255,230,160,.22)');
    sg.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, Y(0.3), w, Y(0.56));
  }
  // ═════════ 싸움 ═════════
  const n = f.foes.length;
  const foeXY = f.foes.map((x, i) => foeSpot(n, i, FOES[x.d].look));
  // 고양이 위치·표정
  let cx = CAT_X, cy = CAT_Y, mood: CatMood = 'idle', paw = 0, catZ = R(0.118), shieldA = catBlk > 0 ? 1 : 0;
  const card = rec ? CARDS[rec.card] : null;
  if (rec && card) {
    const n2 = rounds(rec), endHit = n2 ? hitAt(rec, n2 - 1) : HIT0;
    if (pt < 10) {
      // 카드에서 튀어나오기 직전: 웅크렸다가
      cy += Math.sin((pt / 10) * Math.PI) * -0.03;
    }
    if (card.fam === 0 && n2) {
      const tgt = rec.hits[0].foe, [tx, ty] = foeXY[tgt], ax = tx - 0.17, ay = ty + 0.03;
      const go = ease((pt - 6) / 8), back = ease((pt - endHit - 4) / 10);
      cx = CAT_X + (ax - CAT_X) * go * (1 - back);
      cy = CAT_Y + (ay - CAT_Y) * go * (1 - back) - Math.sin(clamp01((pt - 6) / 8) * Math.PI) * 0.08;
      mood = pt >= HIT0 - 2 && pt < endHit + 6 ? 'punch' : 'idle';
      const ph2 = (pt - HIT0) / gapOf(n2);
      paw = pt >= HIT0 - 2 && pt < endHit + 4 ? Math.max(0, 1 - Math.abs(ph2 - Math.round(ph2)) * 2.2) : 0;
      if (rec.hits.some((hh) => hh.back && pt >= hitAt(rec, hh.h) && pt < hitAt(rec, hh.h) + 5)) mood = 'hit';
      if (pt > endHit + 6 && rec.hits.some((hh) => hh.kill)) mood = 'smug';
    } else if (card.fam === 1) {
      mood = pt >= 8 ? 'curl' : 'idle';
      shieldA = clamp01((pt - 8) / 8);
    } else if (card.key === 'fish') mood = pt >= 10 ? 'eat' : 'idle';
    else if (card.key === 'nip') mood = pt >= 10 ? 'wild' : 'idle';
    else if (card.key === 'yarn') mood = 'throw';
  }
  if (frec && plan) {
    mood = catBlk > 0 ? 'curl' : 'worry';
    frec.acts.forEach((a, j) => {
      const T = plan.start[j];
      a.hits.forEach((hh, k) => {
        const ht = T + FOE_HIT + k * FOE_GAP;
        if (pt >= ht && pt < ht + 8 && hh.dmg > 0) mood = 'hit';
      });
    });
    if (frec.poison && pt >= plan.poisonAt && pt < plan.poisonAt + 12) mood = 'hit';
  }
  if (ph === 'result') mood = s.ok ? 'smug' : 'dizzy';
  if (ph === 'reward' || ph === 'next') mood = 'smug';
  if (ph === 'pick' && incoming(f) >= 8 && !f.foes.some((x) => alive(x) && x.tangled)) mood = 'worry';
  // 막기 방울 흐려짐
  if (ph === 'pick') shieldA = 0;
  // 받침 먼저 (고양이)
  pedestal(ctx, X(CAT_X), Y(CAT_Y), R(0.1), '#c0392b');
  // 쥐들
  f.foes.forEach((x, i) => {
    const D = FOES[x.d], [mx, my, mz] = foeXY[i];
    const deadNow = showHp[i] <= 0;
    let ox = 0, oy = 0, rot = 0, mm: MouseMood = 'idle', lunge = 0, alpha = 1, gone = false;
    const it = intentOf(x);
    if (ph === 'pick') {
      mm = it.k === 'atk' || it.k === 'smash' || it.k === 'multi' ? 'smug' : it.k === 'charge' ? 'charge' : 'idle';
      if (x.hp <= x.max * 0.3 || (f.fam === 0 && f.combo >= 3)) mm = 'scared';
      if (x.tangled) mm = 'tangled';
    }
    if (rec) {
      const my2 = rec.hits.filter((hh) => hh.foe === i);
      for (const hh of my2) {
        const ht = hitAt(rec, hh.h);
        if (pt >= ht && pt < ht + 5) (mm = 'hit'), (ox += (1 - (pt - ht) / 5) * 0.025);
      }
      if (rec.brk.includes(i) && pt >= HIT0 - 2) mm = mm === 'hit' ? 'hit' : 'angry';
      if (rec.tangle && pt >= 14) mm = 'tangled';
      if (my2.length === 0 && card?.fam === 0 && (rec.combo ?? 1) >= 3) mm = 'scared';
    }
    if (frec && plan) {
      const j = frec.acts.findIndex((a) => a.foe === i);
      if (j >= 0) {
        const a = frec.acts[j], T = plan.start[j], q = pt - T;
        if (a.it && !a.tangled) {
          const k2 = a.it.k;
          if (k2 === 'atk' || k2 === 'smash') {
            lunge = q < FOE_HIT ? -Math.sin(clamp01(q / FOE_HIT) * Math.PI * 0.5) * 0.3 + ease((q - 6) / 7) * 2.6 : Math.max(0, 2.6 * (1 - (q - FOE_HIT) / 10));
            if (k2 === 'smash') oy -= Math.sin(clamp01(q / FOE_HIT) * Math.PI) * 0.12;
            mm = 'smug';
          } else if (k2 === 'multi' || k2 === 'poison') mm = 'smug';
          else if (k2 === 'shield' || k2 === 'spike') mm = q > FOE_HIT ? 'smug' : 'charge';
          else mm = 'charge';
          if (a.hits.some((hh) => hh.back) && q > FOE_HIT) mm = 'hit';
        } else if (a.tangled) mm = 'tangled';
      }
    }
    if (deadNow) {
      // 퐁! 날아가 데굴
      const k0 = rec ? hitAt(rec, Math.max(...rec.hits.filter((hh) => hh.foe === i && hh.kill).map((hh) => hh.h), 0)) : 0;
      const age = rec ? pt - k0 : ph === 'result' ? pt + 30 : 99;
      ox += age * 0.012;
      oy -= age * 0.022 - age * age * 0.0006;
      rot = age * 0.35;
      mm = 'dizzy';
      alpha = clamp01(1 - (age - 25) / 15);
      gone = alpha <= 0;
    }
    if (ph === 'result' && !s.ok) mm = 'laugh';
    if (ph === 'reward' || ph === 'next') gone = true;
    if (gone) return;
    const px = X(mx + ox), py = Y(my + oy);
    if (!deadNow) pedestal(ctx, X(mx), Y(my), mz * w * 0.85, D.look === 5 ? '#7a4a8a' : '#4a4f5a');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(px, py);
    ctx.rotate(rot);
    drawMouse(ctx, 0, 0, mz * w, D.look, mm, t + i * 17, { thorns: x.thorns, block: showBlk[i], lunge });
    ctx.restore();
    if (deadNow) return;
    // 쥐 방패 (깨지기 전까지)
    if (showBlk[i] > 0) {
      const sx = px - mz * w * 0.55, sy = py - mz * w * 0.6;
      ctx.save();
      ctx.shadowColor = '#9cc8ff';
      ctx.shadowBlur = R(0.03);
      oval(ctx, sx, sy, mz * w * 0.34, mz * w * 0.44, 'rgba(120,170,255,.45)');
      ctx.restore();
      ctx.strokeStyle = '#d8ecff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, mz * w * 0.34, mz * w * 0.44, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      font(0.042, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#1f4c8f';
      ctx.strokeText(`${showBlk[i]}`, sx, sy);
      ctx.fillText(`${showBlk[i]}`, sx, sy);
    }
    // 머리 위 예고 (다음 행동)
    if (ph !== 'result') {
      const showIt = frec ? null : it;
      const by = py - mz * w * 2.15 - (D.look === 5 ? mz * w * 0.2 : 0);
      if (showIt) {
        const L = x.tangled ? { e: '🧶', num: '', label: '엉킴 — 쉬어요', col: '#2f9e57' } : intentLook(showIt, D.look === 5);
        const big = showIt.k === 'smash' || intentDmg(showIt) >= 8;
        const pulse = big ? 1 + 0.06 * Math.sin(t * 0.25) : 1;
        font(0.05, 900);
        const nw = L.num ? ctx.measureText(L.num).width : 0;
        const bw = R(0.075) + nw + R(0.02), bh = R(0.066);
        ctx.save();
        ctx.translate(px, by);
        ctx.scale(pulse, pulse);
        ctx.fillStyle = 'rgba(0,0,0,.3)';
        ctx.beginPath();
        ctx.roundRect(-bw / 2 + 2, -bh / 2 + 3, bw, bh, bh / 2);
        ctx.fill();
        ctx.fillStyle = L.col;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-R(0.012), bh / 2 - 1);
        ctx.lineTo(0, bh / 2 + R(0.016));
        ctx.lineTo(R(0.012), bh / 2 - 1);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.stroke();
        emo(ctx, L.e, -bw / 2 + R(0.04), 1, R(0.042));
        if (L.num) {
          ctx.fillStyle = '#ffffff';
          font(0.05, 900);
          ctx.textAlign = 'left';
          ctx.fillText(L.num, -bw / 2 + R(0.07), 2);
        }
        ctx.restore();
        ctx.textAlign = 'center';
        font(0.036, 800);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(30,15,5,.75)';
        ctx.strokeText(L.label, px, by - bh * 0.5 - R(0.022));
        ctx.fillStyle = '#fff6e0';
        ctx.fillText(L.label, px, by - bh * 0.5 - R(0.022));
        const ang = angerOf(x);
        if (ang > 0 && !x.tangled) emo(ctx, '😤', px + bw / 2 + R(0.02), by - R(0.02), R(0.034));
      }
    }
    // 체력 (받침 아래)
    {
      const hy0 = Y(my) + mz * w * 0.5, hw = R(0.15), hh2 = R(0.03);
      const hpq = clamp01(showHp[i] / x.max);
      ctx.fillStyle = 'rgba(20,10,5,.65)';
      ctx.beginPath();
      ctx.roundRect(X(mx) - hw / 2, hy0 - hh2 / 2, hw, hh2, hh2 / 2);
      ctx.fill();
      ctx.fillStyle = hpq > 0.3 ? '#ff6b5a' : '#ffb03a';
      ctx.beginPath();
      ctx.roundRect(X(mx) - hw / 2 + 2, hy0 - hh2 / 2 + 2, Math.max(0, (hw - 4) * hpq), hh2 - 4, (hh2 - 4) / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      font(0.036, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,10,5,.8)';
      const ht = `${Math.max(0, showHp[i])}/${x.max}`;
      ctx.strokeText(ht, X(mx), hy0 + 1);
      ctx.fillText(ht, X(mx), hy0 + 1);
      if (x.thorns > 0) {
        ctx.textAlign = 'left';
        emo(ctx, '🌵', X(mx) + hw / 2 + R(0.02), hy0, R(0.032));
        ctx.fillStyle = '#ffe08a';
        font(0.036, 900);
        ctx.textAlign = 'left';
        ctx.strokeText(`${x.thorns}`, X(mx) + hw / 2 + R(0.04), hy0 + 1);
        ctx.fillText(`${x.thorns}`, X(mx) + hw / 2 + R(0.04), hy0 + 1);
      }
      if (x.wound > 0) {
        emo(ctx, '🩹', X(mx) - hw / 2 - R(0.04), hy0, R(0.03));
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffb3b3';
        ctx.strokeText(`${x.wound}`, X(mx) - hw / 2 - R(0.058), hy0 + 1);
        ctx.fillText(`${x.wound}`, X(mx) - hw / 2 - R(0.058), hy0 + 1);
      }
    }
  });
  // 고양이 (카드에서 튀어나오는 순간엔 크게 퐁)
  {
    const pop = rec && pt < 14 ? 1 + Math.sin(clamp01((pt - 8) / 6) * Math.PI) * 0.18 : 1;
    if (!(rec && pt < 8)) drawCat(ctx, X(cx), Y(cy), catZ * pop, mood, t, paw, shieldA);
    else {
      // 카드가 날아오는 동안 고양이는 받침에서 웅크려 기다린다
      drawCat(ctx, X(CAT_X), Y(CAT_Y), catZ, 'idle', t, 0, 0);
    }
    if (ph === 'result' && !s.ok) for (let k = 0; k < 3; k++) emo(ctx, '⭐', X(cx) + Math.cos(t * 0.15 + k * 2.1) * R(0.06), Y(cy) - R(0.1) + Math.sin(t * 0.15 + k * 2.1) * R(0.02), R(0.03));
    // 고양이 체력·막기
    const hy0 = Y(CAT_Y) + R(0.05), hw = R(0.17), hh2 = R(0.032);
    const hpq = clamp01(catHp / f.max);
    ctx.fillStyle = 'rgba(20,10,5,.65)';
    ctx.beginPath();
    ctx.roundRect(X(CAT_X) - hw / 2, hy0 - hh2 / 2, hw, hh2, hh2 / 2);
    ctx.fill();
    ctx.fillStyle = hpq > 0.35 ? '#5ad16a' : '#ffb03a';
    ctx.beginPath();
    ctx.roundRect(X(CAT_X) - hw / 2 + 2, hy0 - hh2 / 2 + 2, Math.max(0, (hw - 4) * hpq), hh2 - 4, (hh2 - 4) / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(20,10,5,.8)';
    const ht = `♥ ${Math.max(0, catHp)}/${f.max}`;
    ctx.strokeText(ht, X(CAT_X), hy0 + 1);
    ctx.fillText(ht, X(CAT_X), hy0 + 1);
    if (catBlk > 0) {
      emo(ctx, '🛡️', X(CAT_X) - hw / 2 - R(0.03), hy0, R(0.036));
      ctx.fillStyle = '#cfe6ff';
      ctx.textAlign = 'right';
      ctx.strokeText(`${catBlk}`, X(CAT_X) - hw / 2 - R(0.055), hy0 + 1);
      ctx.fillText(`${catBlk}`, X(CAT_X) - hw / 2 - R(0.055), hy0 + 1);
    }
    if (f.poison > 0 && ph !== 'foe') {
      emo(ctx, '🧪', X(CAT_X) + hw / 2 + R(0.03), hy0, R(0.034));
      ctx.fillStyle = '#b8ff9a';
      ctx.textAlign = 'left';
      ctx.strokeText(`${f.poison}`, X(CAT_X) + hw / 2 + R(0.055), hy0 + 1);
      ctx.fillText(`${f.poison}`, X(CAT_X) + hw / 2 + R(0.055), hy0 + 1);
      if (t % 30 === 0) fx.burst(X(cx), Y(cy) - R(0.12), '#9dff8a', 3, 1, 2);
    }
    if (f.nip && ph === 'pick') emo(ctx, '🌿', X(CAT_X) + R(0.08), Y(CAT_Y) - R(0.2), R(0.04));
    // 콤보 불꽃
    if (f.fam === 0 && f.combo >= 2 && (ph === 'pick' || ph === 'foe')) {
      ctx.textAlign = 'center';
      font(0.04, 900);
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(80,20,0,.8)';
      const ct = `🔥 콤보 ${f.combo}`;
      ctx.strokeText(ct, X(CAT_X), Y(CAT_Y) - R(0.24));
      ctx.fillStyle = '#ffb347';
      ctx.fillText(ct, X(CAT_X), Y(CAT_Y) - R(0.24));
    }
  }
  // 날아가는 카드 (손 → 고양이) · 털실 공 · 화살 · 독 병
  if (rec && pt < 12) {
    const q = ease(pt / 10), sx = X(cardX(rec.slot)), sy = Y(CARD_Y + CARD_H / 2);
    const ex2 = X(CAT_X), ey2 = Y(CAT_Y) - R(0.12);
    const cw = R(CARD_W) * (1 - 0.55 * q), ch2 = R(CARD_H) * (1 - 0.55 * q);
    drawCard(ctx, sx + (ex2 - sx) * q, sy + (ey2 - sy) * q - Math.sin(q * Math.PI) * R(0.12), cw, ch2, rec.card, { rot: q * 0.4, alpha: 1 - clamp01((pt - 8) / 4), glow: FAM_COL[CARDS[rec.card].fam] }, (r) => R(r) * (1 - 0.55 * q));
  }
  if (rec && card?.key === 'yarn' && pt >= 10 && pt < 24) {
    const q = clamp01((pt - 10) / 12), [tx, ty] = foeXY.find((_, i) => alive(f.foes[i])) ?? foeXY[0];
    emo(ctx, '🧶', X(CAT_X + (tx - CAT_X) * q), Y(CAT_Y - 0.12 + (ty - 0.1 - CAT_Y + 0.12) * q) - Math.sin(q * Math.PI) * R(0.12), R(0.05));
  }
  if (frec && plan)
    frec.acts.forEach((a, j) => {
      if (!a.it || a.tangled) return;
      const T = plan.start[j], [mx, my] = foeXY[a.foe];
      if (a.it.k === 'multi')
        a.hits.forEach((_, k) => {
          const q = clamp01((pt - (T + FOE_HIT + k * FOE_GAP - 7)) / 7);
          if (q <= 0 || q >= 1) return;
          const ax = X(mx + (CAT_X - mx) * q), ay = Y(my - 0.1 + (CAT_Y - 0.08 - my + 0.1) * q) - Math.sin(q * Math.PI) * R(0.05);
          ctx.strokeStyle = '#6b4a1e';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + R(0.05), ay - R(0.008));
          ctx.stroke();
          ctx.fillStyle = '#cfd6de';
          ctx.beginPath();
          ctx.moveTo(ax - R(0.015), ay + R(0.002));
          ctx.lineTo(ax + R(0.005), ay - R(0.01));
          ctx.lineTo(ax + R(0.005), ay + R(0.01));
          ctx.fill();
        });
      if (a.it.k === 'poison') {
        const q = clamp01((pt - T - 2) / (FOE_HIT - 2));
        if (q > 0 && q < 1) emo(ctx, '🧪', X(mx + (CAT_X - mx) * q), Y(my - 0.1 + (CAT_Y - 0.1 - my + 0.1) * q) - Math.sin(q * Math.PI) * R(0.15), R(0.045));
      }
    });
  // 아기 고양이 응원단 (테이블 앞 가장자리)
  {
    const cheer = (rec && rec.combo >= 2 && card?.fam === 0) || (ph === 'result' && s.ok) || ph === 'reward';
    const cover = (frec && mood === 'hit') || (ph === 'result' && !s.ok);
    const kits: [number, string][] = [[0.06, '#f2a24e'], [0.15, '#d9d4cc'], [0.95, '#5a5a62']];
    kits.forEach(([kx, col], k) => {
      const jy = cheer ? -Math.abs(Math.sin(t * 0.28 + k)) * R(0.035) : Math.sin(t * 0.05 + k) * R(0.004);
      const hx = X(kx), hy = Y(0.84) + jy, hr = R(0.038);
      for (const sx of [-1, 1]) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(hx + sx * hr * 0.2, hy - hr * 0.7);
        ctx.lineTo(hx + sx * hr * 0.95, hy - hr * 1.25);
        ctx.lineTo(hx + sx * hr * 0.9, hy - hr * 0.2);
        ctx.fill();
      }
      oval(ctx, hx, hy, hr, hr * 0.9, col);
      if (cover) {
        oval(ctx, hx - hr * 0.38, hy - hr * 0.05, hr * 0.32, hr * 0.26, mix(col, '#ffffff', 0.4));
        oval(ctx, hx + hr * 0.38, hy - hr * 0.05, hr * 0.32, hr * 0.26, mix(col, '#ffffff', 0.4));
      } else if (cheer) {
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 1.5;
        for (const sx of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(hx + sx * hr * 0.38, hy, hr * 0.15, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
        oval(ctx, hx, hy + hr * 0.4, hr * 0.14, hr * 0.12, '#7a2a2a');
      } else {
        oval(ctx, hx - hr * 0.36, hy, hr * 0.11, hr * 0.14, '#2a1a10');
        oval(ctx, hx + hr * 0.36, hy, hr * 0.11, hr * 0.14, '#2a1a10');
        oval(ctx, hx, hy + hr * 0.3, hr * 0.08, hr * 0.06, '#ff8a9a');
      }
      // 앞발로 테이블 모서리를 잡고 있다
      oval(ctx, hx - hr * 0.55, Y(0.86), hr * 0.25, hr * 0.15, mix(col, '#ffffff', 0.3));
      oval(ctx, hx + hr * 0.55, Y(0.86), hr * 0.25, hr * 0.15, mix(col, '#ffffff', 0.3));
      if (k === 0 && cheer) emo(ctx, '🚩', hx + hr * 1.1, hy - hr * 0.9, R(0.03));
    });
  }
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.15);
    if (e.kind === 'clear') fx.blink('#fff6c8', 0.25), fx.burst(X(0.72), Y(0.5), '#ffe066', 40, 6, 3.2), fx.burst(X(0.72), Y(0.5), '#ff8fb1', 24, 5, 3);
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
    if (e.kind === 'nope') say(X(e.x), Y(Math.min(e.y, 0.85)), e.text!, e.col!, R(0.038)), fx.kick(1.5);
    if (e.kind === 'take') fx.burst(X(e.x), Y(e.y), '#ffe066', 26, 5, 3), fx.ring(X(e.x), Y(e.y), '#fff1a8', R(0.2), 5), say(X(e.x), Y(e.y) - R(0.22), e.text!, e.col!, R(0.044));
  }
  fx.memo.t = s.t;
  if (rec && card) {
    if (pt >= 10 && once('pop')) {
      fx.burst(X(CAT_X), Y(CAT_Y) - R(0.12), FAM_COL[card.fam], 16, 3.5, 2.6);
      fx.ring(X(CAT_X), Y(CAT_Y) - R(0.12), '#ffffff', R(0.1), 3);
      say(X(CAT_X), Y(CAT_Y) - R(0.3), card.fam === 0 ? '냥!' : card.fam === 1 ? '웅크려!' : card.name + '!', '#ffffff', R(0.046));
    }
    if (rec.combo >= 2 && pt >= HIT0 - 4 && once('combo')) {
      say(X(0.45), Y(0.27), `콤보 ×${rec.combo}!`, rec.combo >= 4 ? '#ff5a3a' : '#ffb347', R(0.06 + Math.min(0.03, rec.combo * 0.006)));
      fx.kick(2 + rec.combo * 1.5);
    }
    if (rec.brk.length && pt >= HIT0 - 2 && once('brk')) {
      const [bx, by] = foeXY[rec.brk[0]];
      fx.burst(X(bx - 0.06), Y(by - 0.06), '#cfe6ff', 26, 5, 2.8), fx.kick(6);
      say(X(bx), Y(by - 0.2), '쨍! 방패 깨짐', '#cfe6ff', R(0.046));
    }
    for (let k = 0; k < rec.hits.length; k++) {
      const hh = rec.hits[k], ht = hitAt(rec, hh.h);
      if (pt >= ht && once('h' + k)) {
        const [hx, hy] = foeXY[hh.foe];
        fx.burst(X(hx - 0.05), Y(hy - 0.08), hh.dmg ? '#fff2a0' : '#9cc8ff', 8 + rec.combo * 2, 3 + rec.combo * 0.6, 2.4);
        fx.kick(1.5 + Math.min(8, rec.combo * 1.2 + hh.h * 0.4));
        const nr = rounds(rec), col5 = Math.min(5, nr), row = Math.floor(hh.h / 5);
        fx.pop(X(hx) + ((hh.h % 5) - (col5 - 1) / 2) * R(0.07) - R(0.02), Y(hy - 0.2 - row * 0.055), hh.dmg ? `-${hh.dmg}` : '막힘', hh.dmg ? '#ffe28a' : '#cfe6ff', R(0.046 + Math.min(0.02, hh.h * 0.004)));
        if (hh.h === nr - 1 && hh.foe === rec.hits[rec.hits.length - 1].foe && nr >= 3) {
          const tot = rec.hits.filter((q) => q.foe === hh.foe).reduce((acc, q) => acc + q.dmg, 0);
          say(X(hx), Y(hy - 0.33 - row * 0.055), `${nr}연타! -${tot}`, '#ffb347', R(0.05));
        }
        if (hh.back) say(X(cx), Y(cy - 0.24), `따끔 -${hh.back}`, '#ffb3a8', R(0.04)), fx.burst(X(cx), Y(cy - 0.1), '#c8a060', 6, 2, 2);
        if (hh.kill) {
          fx.ring(X(hx), Y(hy - 0.06), '#ffffff', R(0.18), 5), fx.kick(10);
          say(X(hx), Y(hy - 0.3), '퐁!', '#ffffff', R(0.07));
        }
      }
    }
    if (pt >= HIT0 && once('eff')) {
      if (rec.block) fx.ring(X(CAT_X), Y(CAT_Y) - R(0.08), '#9cc8ff', R(0.14), 4), say(X(CAT_X), Y(CAT_Y - 0.26), `막기 ${rec.block}`, '#cfe6ff', R(0.046));
      if (rec.heal) fx.burst(X(CAT_X), Y(CAT_Y) - R(0.1), '#ff9ec7', 16, 3, 2.5), say(X(CAT_X), Y(CAT_Y - 0.26), `+${rec.heal}`, '#b8ffb0', R(0.05));
      if (rec.cleansed) say(X(CAT_X), Y(CAT_Y - 0.32), '독 싹!', '#b8ff9a', R(0.042));
      if (rec.nip) fx.burst(X(CAT_X), Y(CAT_Y) - R(0.15), '#9dff8a', 20, 3, 2.4), say(X(CAT_X), Y(CAT_Y - 0.28), '다음 공격 ×2!', '#b8ff9a', R(0.042));
      if (rec.venom) say(X(foeXY[0][0]), Y(foeXY[0][1] - 0.32), `상처 ${rec.venom}`, '#ffb3b3', R(0.04));
      if (rec.double) say(X(0.5), Y(0.33), '개박하 ×2!', '#b8ff9a', R(0.046));
    }
    if (rec.tangle && pt >= 22 && once('tg')) {
      const i0 = f.foes.findIndex(alive);
      if (i0 >= 0) fx.burst(X(foeXY[i0][0]), Y(foeXY[i0][1] - 0.1), '#7ad08a', 18, 3, 2.4), say(X(foeXY[i0][0]), Y(foeXY[i0][1] - 0.28), '엉켰다!', '#b8ffb0', R(0.046));
    }
  }
  if (frec && plan) {
    frec.acts.forEach((a, j) => {
      const T = plan.start[j], [mx, my] = foeXY[a.foe];
      if (a.wound && pt >= T + 3 && once('w' + j)) say(X(mx), Y(my - 0.26), `상처 -${a.wound}`, '#ffb3b3', R(0.042)), fx.burst(X(mx), Y(my - 0.08), '#ff7a7a', 8, 2, 2);
      if (!a.it) return;
      if (a.tangled && pt >= T + 6 && once('tg' + j)) say(X(mx), Y(my - 0.26), '엉켜서 버둥…', '#b8ffb0', R(0.04));
      if (a.tangled) return;
      const k2 = a.it.k;
      if (pt >= T + FOE_HIT && once('act' + j)) {
        if (k2 === 'shield') fx.ring(X(mx - 0.05), Y(my - 0.06), '#9cc8ff', R(0.1), 4), say(X(mx), Y(my - 0.28), `방패 +${a.it.v}`, '#cfe6ff', R(0.044));
        if (k2 === 'spike') fx.burst(X(mx), Y(my - 0.06), '#8a5a2b', 16, 3, 2.4), say(X(mx), Y(my - 0.28), `가시 +${a.it.v}`, '#ffe08a', R(0.044));
        if (k2 === 'charge') fx.ring(X(mx), Y(my - 0.08), '#ffd23a', R(0.12), 4), say(X(mx), Y(my - 0.28), FOES[f.foes[a.foe].d].look === 5 ? '흐읍…!' : '끼릭…', '#ffe08a', R(0.042));
        if (k2 === 'poison') {
          if (a.deflect) fx.burst(X(CAT_X + 0.06), Y(CAT_Y - 0.1), '#cfe6ff', 14, 3, 2.4), say(X(CAT_X), Y(CAT_Y - 0.3), '팅! 독 병 튕김', '#cfe6ff', R(0.042));
          else fx.burst(X(CAT_X), Y(CAT_Y - 0.08), '#9dff8a', 22, 3.5, 2.6), say(X(CAT_X), Y(CAT_Y - 0.3), `독 +${a.it.v}`, '#b8ff9a', R(0.046));
        }
        if (k2 === 'smash') fx.kick(14), fx.blink('#ffd0a0', 0.25), fx.ring(X(CAT_X), Y(CAT_Y), '#ffd0a0', R(0.3), 7);
      }
      a.hits.forEach((hh, k) => {
        if (pt >= T + FOE_HIT + k * FOE_GAP && once(`fh${j}.${k}`)) {
          fx.kick(hh.dmg >= 8 ? 10 : hh.dmg ? 4 : 1.5);
          fx.burst(X(CAT_X + 0.03), Y(CAT_Y - 0.08), hh.dmg ? '#ff9a7a' : '#cfe6ff', hh.dmg ? 10 + hh.dmg : 8, 3, 2.4);
          say(X(CAT_X) + (k % 2 ? R(0.05) : -R(0.03)), Y(CAT_Y - 0.26), hh.dmg ? `-${hh.dmg}` : '막았다!', hh.dmg ? '#ffb3a8' : '#cfe6ff', R(hh.dmg >= 8 ? 0.06 : 0.046));
          if (hh.soak && hh.dmg) say(X(CAT_X) - R(0.1), Y(CAT_Y - 0.18), `🛡️${hh.soak}`, '#cfe6ff', R(0.036));
          if (hh.back) say(X(mx), Y(my - 0.24), `되받기 -${hh.back}`, '#ffe08a', R(0.04));
        }
      });
    });
    if (frec.poison && pt >= plan.poisonAt && once('psn')) fx.burst(X(CAT_X), Y(CAT_Y - 0.1), '#9dff8a', 16, 2.5, 2.4), say(X(CAT_X), Y(CAT_Y - 0.3), `독 -${frec.poison}`, '#b8ff9a', R(0.046));
  }
  if (ph === 'result' && pt === 1) {
    if (s.ok) say(X(CAT_X), Y(CAT_Y - 0.3), s.got === 3 ? '냐하! 완벽!' : '이겼다냥!', '#fff1a8', R(0.046));
    else say(X(CAT_X), Y(CAT_Y - 0.3), '냐아앙~', '#ffd0c8', R(0.05));
  }
  {
    const vg = ctx.createRadialGradient(X(0.5), Y(0.55), R(0.35), X(0.5), Y(0.55), R(0.85));
    vg.addColorStop(0, 'rgba(20,8,0,0)');
    vg.addColorStop(1, 'rgba(20,8,0,.45)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Y(0.085), w, Y(0.8));
  }
  // 테이블 앞 모서리 (두께)
  {
    const g2 = ctx.createLinearGradient(0, Y(TF), 0, Y(TF + 0.03));
    g2.addColorStop(0, '#5a361a');
    g2.addColorStop(1, '#2a180a');
    ctx.fillStyle = g2;
    ctx.fillRect(0, Y(TF), w, R(0.03));
    ctx.fillStyle = 'rgba(255,220,170,.25)';
    ctx.fillRect(0, Y(TF), w, 1.5);
  }
  ctx.restore();

  // ═════════ 손패 (펠트 매트) ═════════
  const HY0 = TF + 0.03;
  const mat = ctx.createLinearGradient(0, Y(HY0), 0, Y(A));
  mat.addColorStop(0, '#24301f');
  mat.addColorStop(1, '#151d12');
  ctx.fillStyle = mat;
  ctx.fillRect(0, Y(HY0), w, Y(A - HY0) + 2);
  ctx.fillStyle = 'rgba(255,255,255,.025)';
  for (let k = 0; k < 40; k++) ctx.fillRect(hsh(k + 300) * w, Y(HY0) + hsh(k + 330) * Y(A - HY0), 2, 2);
  const cardW = R(CARD_W), cardH = R(CARD_H);
  const hover = s.down ? slotAt(s.ax, s.ay * A) : -1;
  if (ph === 'reward' || ph === 'next') {
    s.offer.forEach((o, k) => {
      const taken = ph === 'next' && k === s.took, other = ph === 'next' && k !== s.took;
      const q = ph === 'next' ? ease(pt / 26) : 0;
      const enter = ease((pt + (ph === 'next' ? 99 : 0) - k * 5) / 14);
      let x = X(cardX(k)), y = Y(CARD_Y + CARD_H / 2) + (1 - enter) * R(0.3);
      let sc = 1, al = enter;
      if (taken) (x += (X(0.06) - x) * q), (y += (Y(A - 0.05) - y) * q), (sc = 1 - 0.7 * q);
      if (other) (al = 1 - q), (y += q * R(0.1));
      drawCard(ctx, x, y, cardW * sc, cardH * sc, o, { glow: ph === 'reward' ? `rgba(255,214,90,${0.55 + 0.35 * Math.sin(t * 0.12 + k)})` : undefined, lift: hover === k ? R(0.02) : 0, alpha: al, rot: (k - 1) * 0.03 }, (r) => R(r) * sc);
      if (ph === 'reward' && s.pt > 12) {
        ctx.fillStyle = 'rgba(255,240,200,.8)';
        font(0.036, 900);
        ctx.textAlign = 'center';
        ctx.fillText(`${k + 1}`, x, Y(CARD_Y) - R(0.012));
      }
    });
  } else {
    f.hand.forEach((ci, k) => {
      let x = X(cardX(k)), y = Y(CARD_Y + CARD_H / 2), al = 1, lift = 0;
      if (rec && k === rec.slot) {
        if (pt < 14) return;
        const q = ease((pt - 14) / 10);
        x = X(0.02) + (x - X(0.02)) * q;
        y = Y(A) + (y - Y(A)) * q;
        al = q;
      }
      if (ph === 'pick' && hover === k) lift = R(0.025);
      const cmb = comboIf(f, ci), canUse = ph === 'pick';
      const glow = canUse && CARDS[ci].fam === 0 && cmb >= 2 ? `rgba(255,140,40,${0.5 + 0.3 * Math.sin(t * 0.2)})` : undefined;
      drawCard(ctx, x, y, cardW, cardH, ci, { combo: cmb, f, glow, lift, alpha: al * (canUse || ph === 'cat' || ph === 'foe' ? 1 : 0.6), rot: (k - 1) * 0.035 }, R);
      if (ph === 'pick') {
        ctx.fillStyle = 'rgba(255,240,200,.65)';
        font(0.036, 900);
        ctx.textAlign = 'center';
        ctx.fillText(`${k + 1}`, x, Y(CARD_Y) - R(0.012));
      }
    });
    // 적 차례엔 손패 위에 '쥐 차례' 얇은 막
    if (ph === 'foe' || ph === 'cat') {
      ctx.fillStyle = 'rgba(10,8,4,.28)';
      ctx.fillRect(0, Y(CARD_Y - 0.02), w, R(CARD_H + 0.04));
    }
  }
  // 첫 판: 톡 할 곳을 손가락으로
  if (s.stage === 0 && f.turn === 0 && ph === 'pick') {
    const bx = X(cardX(1)), byy = Y(CARD_Y + CARD_H * 0.55) + Math.abs(Math.sin(t * 0.12)) * R(0.03);
    emo(ctx, '👆', bx + R(0.02), byy + R(0.06), R(0.08));
    ctx.strokeStyle = `rgba(255,240,160,${0.4 + 0.4 * Math.sin(t * 0.12)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(X(cardX(0) - CARD_W / 2) - 4, Y(CARD_Y) - 4, X(CARD_W * 3 + CARD_GAP * 2) + 8, R(CARD_H) + 8, R(0.03));
    ctx.stroke();
  }
  // 덱 더미 (왼쪽 아래)
  {
    const dx = R(0.045), dy = Y(A - 0.115);
    for (let k = 2; k >= 0; k--) {
      ctx.fillStyle = k ? '#6a3a2a' : '#8a4a32';
      ctx.beginPath();
      ctx.roundRect(dx - R(0.025) + k * 2, dy - R(0.034) + k * 2, R(0.05), R(0.068), 4);
      ctx.fill();
    }
    emo(ctx, '🐾', dx, dy, R(0.03));
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  const by = Y(A - 0.155);
  {
    const gw = (w - R(0.14)) / 3, x0 = R(0.11);
    const winNow = ph === 'result' && s.ok;
    const doneT = f.turn, doneD = f.dmg;
    const inFight = ph === 'pick' || ph === 'cat' || ph === 'foe' || ph === 'result';
    const goals: [string, boolean | null][] = [
      ['이기기', winNow ? true : null],
      [inFight ? `${st.par}턴 안에 ${Math.min(doneT, 99)}/${st.par}` : `${st.par}턴 안에`, doneT > st.par ? false : winNow ? true : null],
      [inFight ? `다침 ${doneD}/${st.cap}` : `다침 ${st.cap} 이하`, doneD > st.cap ? false : winNow ? true : null],
    ];
    goals.forEach(([txt, ok], k) => {
      const gx = x0 + k * gw;
      ctx.fillStyle = ok === true ? 'rgba(255,209,102,.3)' : ok === false ? 'rgba(120,120,120,.22)' : 'rgba(255,255,255,.07)';
      ctx.strokeStyle = ok === true ? '#ffd166' : ok === false ? 'rgba(200,200,200,.35)' : 'rgba(255,230,180,.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gx + 2, by - R(0.024), gw - 4, R(0.048), R(0.024));
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let fs = 0.036;
      font(fs, 800);
      const lab = `${ok === true ? '★' : ok === false ? '✗' : '☆'} ${txt}`;
      while (ctx.measureText(lab).width > gw - 6 && fs > 0.035) font((fs -= 0.001), 800);
      ctx.fillStyle = ok === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(lab, gx + gw / 2, by + 1);
    });
    ctx.textAlign = 'left';
    font(0.036, 800);
    ctx.fillStyle = 'rgba(255,240,210,.7)';
    ctx.fillText(`${f.draw.length}`, R(0.075), Y(A - 0.115));
  }
  {
    const y3 = Y(A - 0.07);
    let tip = '머리 위 예고를 보고 — 칠까, 막을까?';
    const fr = f.foes.find(alive), it0 = fr ? intentOf(fr) : null;
    const hasWhip = f.hand.some((c) => CARDS[c].brk), hasBlock = f.hand.some((c) => CARDS[c].block);
    if (s.stage === 0 && f.turn === 0) tip = '👆 카드를 톡 — 고양이 기사가 튀어나와요!';
    else if (ph === 'reward') tip = `다음 상대 ${STAGES[s.stage + 1].name} — 무엇이 필요할까?`;
    else if (ph === 'next') tip = '덱에 넣었어요! 원정 계속 →';
    else if (ph === 'result') tip = s.ok ? (s.got === 3 ? '별 셋! 완벽한 싸움' : '별을 다 받으려면 — 턴과 다침을 아껴요') : s.hearts > 0 ? '♥ -1 · 이 판만 다시 (덱은 그대로)' : '하트를 다 썼어요 — 원정 끝';
    else if (f.foes.some((x) => alive(x) && x.thorns > 0)) tip = '🌵 가시 — 연타는 따끔! 한 방 카드로';
    else if (it0 && it0.k === 'poison' && !fr!.tangled) tip = '🧪 독 병이 와요 — 막기가 있으면 튕겨 내요';
    else if (incoming(f) >= 8) tip = hasBlock ? '⚠️ 큰 공격 예고 — 막기 카드를 써요!' : '⚠️ 큰 공격 — 막기가 없으면 먼저 쓰러뜨려요';
    else if (f.foes.some((x) => alive(x) && x.block > 0)) tip = hasWhip ? '🛡️ 쥐 방패 — 🌀 꼬리 채찍으로 깨요' : '🛡️ 쥐 방패 — 펀치는 방패부터 깎아요';
    else if (f.fam === 0 && f.combo >= 1 && f.hand.some((c) => CARDS[c].fam === 0)) tip = `🔥 빨강을 이어 쓰면 콤보 ×${f.combo + 1}`;
    else if (it0 && it0.k === 'charge') tip = '⏳ 쥐가 준비 중 — 지금이 칠 때!';
    ctx.textAlign = 'center';
    let fs = 0.038;
    font(fs, 800);
    while (ctx.measureText(tip).width > w - R(0.04) && fs > 0.036) font((fs -= 0.0005), 800);
    ctx.fillStyle = 'rgba(255,246,214,.92)';
    ctx.fillText(tip, w / 2, y3);
  }
  // ═════════ 위 띠 HUD ═════════
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(30,18,10,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,214,140,.2)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.046, 900);
  const ttl = `🃏 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.038, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT} · ${st.name}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.044, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && s.t - s.news.t < NEWS_T + 20 && ph !== 'reward' && ph !== 'next') {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    let fs = 0.037;
    font(fs, 900);
    const tx = s.news.text;
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.036) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 6, ctx.measureText(tx).width + 22), by2 = hb + R(0.04) - drop;
    ctx.fillStyle = 'rgba(40,24,12,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,140,.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 80 && ph !== 'result' && ph !== 'reward' && ph !== 'next') {
      const a = Math.min(1, age / 8, (80 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, Y(0.27));
      ctx.scale(sc, sc);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(40,20,10,.75)';
      const big = `${s.stage + 1}판 · ${st.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      if (s.stage > 0) {
        font(0.04, 800);
        const sub = `★ ${st.par}턴 안에 · ★ 다침 ${st.cap} 이하`;
        ctx.strokeText(sub, 0, R(0.055));
        ctx.fillText(sub, 0, R(0.055));
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (ph === 'result') {
    const age = pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(60,40,10,.6)' : 'rgba(70,20,20,.6)';
    ctx.fillRect(0, Y(0.16), w, R(0.17));
    ctx.textAlign = 'center';
    font(s.ok ? 0.062 : 0.046, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '쥐 성 함락! 🎉' : `${s.stage + 1}판 승리!`) : s.why, w / 2, Y(0.205));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.285));
        if (got && (fx.memo['star' + k] ?? -1) < s.clearT) (fx.memo['star' + k] = s.clearT), fx.burst(w / 2 + (k - 1) * R(0.1), Y(0.285), '#ffe066', 14, 3, 2.4);
      }
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판만 처음부터 다시' : '하트를 다 썼어요 — 원정 끝', w / 2, Y(0.285));
    }
    ctx.globalAlpha = 1;
  }
  // 보상 고르기 안내 (다음 상대 미리 보기)
  if (ph === 'reward' || ph === 'next') {
    const nx = STAGES[s.stage + 1];
    const a = ph === 'reward' ? Math.min(1, pt / 10) : 1 - clamp01(pt / 20);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(40,24,12,.86)';
    ctx.beginPath();
    ctx.roundRect(R(0.05), Y(0.13), w - R(0.1), R(0.2), R(0.03));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,90,.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.05, 900);
    ctx.fillStyle = '#fff1a8';
    ctx.fillText(s.offer.some((o) => o < 0) ? '🔀 갈림길 — 카드냐, 몸이냐' : '🎁 새 카드 하나를 덱에!', w / 2, Y(0.175));
    if (nx) {
      font(0.038, 800);
      ctx.fillStyle = '#fff6e0';
      ctx.textAlign = 'left';
      ctx.fillText(`다음: ${nx.name}`, R(0.23), Y(0.24));
      font(0.036, 700);
      ctx.fillStyle = '#e8d8b8';
      const pv = nx.foes.map((k) => FOES[k].acts.slice(0, 3).map((it) => intentLook(it, k === 'king').e).join('')).join(' + ');
      ctx.fillText(`예고 ${pv} …`, R(0.23), Y(0.29));
      nx.foes.forEach((k, i) => drawMouse(ctx, R(0.13) + i * R(0.05), Y(0.31), R(0.055), FOES[k].look, 'smug', t + i * 9));
    }
    ctx.globalAlpha = 1;
  }
}
