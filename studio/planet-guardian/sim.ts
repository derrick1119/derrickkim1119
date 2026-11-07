/**
 * 행성 수호대 — 결정적 시뮬레이션 (스튜디오판, M1).
 * 출발점: arcade/games/guardian2.ts (복사 후 독립). 같은 시드·같은 입력 → 같은 결과.
 * 화면·소리와 분리: 시뮬은 매 틱 `events`에 "무슨 일이 어디서 났나"만 남기고, 손맛(파티클·흔들림·소리)은 그걸 읽어 만든다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';

export const CORE = 0.17, ORBIT = 0.43, BODY = 0.05, ENEMY_R = 0.04, RANGE = 0.32;
export const SLOTS = 8, HP_MAX = 5, CARD_Y = 0.84;
const BULLET_V = 1.3 / 60, FIRE_EVERY = 30, COMBO_GAP = 60, BREATH = 240;
export const TICK = 1 / 60;
/** 카드 비용 곡선. C003: 비용만 낮춰 F1(≤12초)을 맞추려 했으나 처치 광석 → 카드 → 처치의 눈덩이로 판이 끝나지 않아 폐기(TALK C003) */
const COST0 = 8, COST_MUL = 1.15, COST_ADD = 3;

export type Kind = '광산' | '포탑';
export type CardId = 'new-mine' | 'new-turret' | 'up-mine' | 'up-turret' | 'ally' | 'shield' | 'spin';
export interface Card { id: CardId; label: string; detail: string }
export interface Enemy { id: number; a: number; r: number; v: number; hp: number; maxHp: number; big: boolean; flash: number }
export interface Shot { x: number; y: number; vx: number; vy: number; life: number; from: 'ship' | 'turret' }
export interface Site { kind: Kind; slot: number; level: number; cool: number; aim: number; born: number }

/** 손맛 층이 읽는 사건. 좌표는 행성 중심 기준 단위 좌표 */
export type GameEvent =
  | { type: 'fire'; x: number; y: number; from: 'ship' | 'turret' }
  | { type: 'hit'; x: number; y: number }
  | { type: 'kill'; x: number; y: number; big: boolean; combo: number; ore: number; by: 'shot' | 'body' }
  | { type: 'impact'; x: number; y: number; hp: number }
  | { type: 'offer' }
  | { type: 'build'; card: CardId; x: number; y: number }
  | { type: 'wave'; wave: number }
  | { type: 'clear'; wave: number }
  | { type: 'dead' };

/**
 * 입력은 카드 고르기뿐 (오너 2026-11-07: "조작 따로 없이 그냥 계속 회전하게 해주는 게 낫지 않아?").
 * 편대는 저절로 돌고, 플레이어의 판단은 "무엇을 짓나" 하나에 모인다.
 */
export interface Input {
  /** 고른 카드(0부터). 카드가 떠 있는 동안 게임은 멈춰 있다 */
  pick?: number;
}

export interface State {
  /** 운석 전용 난수 — 카드 선택이 운석 배치를 바꾸지 않게 분리 (리뷰: 데일리 공정성) */
  rng: Rng;
  /** 카드·슬롯 전용 난수 */
  crng: Rng;
  wave: number;
  /** 이번 웨이브에 남은 운석 수 */
  budget: number;
  /** 숨 고르기 남은 틱 (0이면 전투 중) */
  breath: number;
  t: number;
  angle: number;
  /** 궤도 가속 단계 0~3 — 회전 속도 (오너: "회전 속도도 좀 중요할 것 같고") */
  spinLv: number;
  allies: number;
  cool: number[];
  enemies: Enemy[];
  bullets: Shot[];
  sites: Site[];
  ore: number;
  cost: number;
  offer: Card[] | null;
  offerAt: number;
  builds: number;
  hp: number;
  spawnIn: number;
  nextId: number;
  kills: number;
  blocks: number;
  combo: number;
  comboAt: number;
  bestCombo: number;
  last: { card: CardId; label: string; t: number } | null;
  hitAt: number;
  deadAt: number;
  dead: boolean;
  events: GameEvent[];
}

export const pos = (a: number, r: number) => ({ x: Math.cos(a) * r, y: Math.sin(a) * r });
export const wrap = (a: number) => ((a % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
export const spin = (s: State) => s.t * 0.003;
export const crew = (s: State) => [...Array(1 + s.allies).keys()].map((k) => s.angle + (k * 2 * Math.PI) / (1 + s.allies));
export const siteAngle = (s: State, slot: number) => (slot * 2 * Math.PI) / SLOTS + spin(s);
export const mineRate = (s: State) => s.sites.filter((x) => x.kind === '광산').reduce((a, x) => a + 0.3 * x.level, 0);
const turretEvery = (lv: number) => [0, 42, 28, 19][lv];
export const turretRange = (lv: number) => 0.34 + 0.05 * (lv - 1);

export function create(seed: number): State {
  return {
    rng: mulberry32(seed), crng: mulberry32(seed ^ 0x5bd1e995), wave: 1, budget: waveSize(1), breath: 0, t: 0, angle: -Math.PI / 2, spinLv: 0, allies: 0, cool: [0], enemies: [], bullets: [],
    ore: 0, cost: COST0, offer: null, offerAt: -99, builds: 0, hp: 3, spawnIn: 90, nextId: 1, kills: 0, blocks: 0,
    combo: 0, comboAt: -999, bestCombo: 0, last: null, hitAt: -99, deadAt: -1, dead: false, events: [],
    // 리뷰: 시작 방어 0 → 포탑 Lv1 하나를 깔고 시작 (기지가 첫 화면부터 보인다)
    sites: [{ kind: '포탑', slot: 6, level: 1, cool: 0, aim: 0, born: -99 }],
  };
}

export const score = (s: State) => s.kills + s.builds * 5;

/** 웨이브 예산 (리뷰 ①: 시간 기반 스폰은 88초에 초당 12개 벽을 만들었다) */
/** 속도 상한(초당) — FUN QA C001: n² 가속은 반응 불가능한 벽이었다. 난이도는 수·크기로 올린다 */
const VMAX = 0.42;
export const waveSize = (n: number) => 6 + 3 * n;
const waveCap = (n: number) => 3 + n;
const waveGap = (n: number) => Math.max(18, 80 - 6 * n);

function spawn(s: State) {
  const n = s.wave - 1;
  const big = s.rng() < Math.min(0.45, 0.06 * n);
  // 후반 난이도는 단단함으로: 5웨이브마다 체력 +1
  const hp = (big ? 3 : 1 + (s.rng() < Math.min(0.6, 0.08 * n) ? 1 : 0)) + Math.floor(n / 5);
  s.enemies.push({ id: s.nextId++, a: s.rng() * Math.PI * 2, r: 1.05, v: (Math.min(VMAX, 0.11 + 0.025 * n) + s.rng() * 0.03) / 60, hp, maxHp: hp, big, flash: -99 });
  s.budget--;
  s.spawnIn = Math.round(waveGap(s.wave) * (0.7 + s.rng() * 0.6));
}

function waves(s: State) {
  if (s.breath > 0) {
    if (--s.breath === 0) (s.wave++, (s.budget = waveSize(s.wave)), (s.spawnIn = 30), s.events.push({ type: 'wave', wave: s.wave }));
    return;
  }
  if (s.budget > 0) {
    if (--s.spawnIn <= 0 && s.enemies.length < waveCap(s.wave)) spawn(s);
  } else if (!s.enemies.length) (s.breath = BREATH), s.events.push({ type: 'clear', wave: s.wave });
}

const freeSlots = (s: State) => [...Array(SLOTS).keys()].filter((k) => !s.sites.some((x) => x.slot === k));
const lowest = (s: State, kind: Kind) => s.sites.filter((x) => x.kind === kind && x.level < 3).sort((a, b) => a.level - b.level)[0];

/** 지금 지을 수 있는 카드 전부 */
export function available(s: State): Card[] {
  const out: Card[] = [];
  const free = freeSlots(s).length > 0;
  if (free) out.push({ id: 'new-mine', label: '새 광산', detail: '광석 +0.3/초' }, { id: 'new-turret', label: '새 포탑', detail: '자동 사격' });
  const m = lowest(s, '광산'), t = lowest(s, '포탑');
  if (m) out.push({ id: 'up-mine', label: `광산 Lv${m.level + 1}`, detail: '캐는 속도 ↑' });
  if (t) out.push({ id: 'up-turret', label: `포탑 Lv${t.level + 1}`, detail: '연사·사거리 ↑' });
  if (s.allies < 3) out.push({ id: 'ally', label: '위성', detail: '편대 +1기' });
  if (s.spinLv < 3) out.push({ id: 'spin', label: `궤도 가속 Lv${s.spinLv + 1}`, detail: '회전 +50%' });
  if (s.hp < HP_MAX) out.push({ id: 'shield', label: '방어막', detail: '내구도 +1' });
  return out;
}

function makeOffer(s: State) {
  const all = available(s);
  const pick: Card[] = [];
  while (pick.length < 3 && all.length) pick.push(all.splice(Math.floor(s.crng() * all.length), 1)[0]);
  s.offer = pick.length ? pick : null;
  if (s.offer) (s.offerAt = s.t), s.events.push({ type: 'offer' });
}

function apply(s: State, c: Card): { x: number; y: number } {
  const at = (slot: number) => pos(siteAngle(s, slot), CORE);
  switch (c.id) {
    case 'new-mine':
    case 'new-turret': {
      const free = freeSlots(s);
      const slot = free[Math.floor(s.crng() * free.length)];
      s.sites.push({ kind: c.id === 'new-mine' ? '광산' : '포탑', slot, level: 1, cool: 0, aim: 0, born: s.t });
      return at(slot);
    }
    case 'up-mine':
    case 'up-turret': {
      const site = lowest(s, c.id === 'up-mine' ? '광산' : '포탑')!;
      site.level++;
      site.born = s.t;
      return at(site.slot);
    }
    case 'ally':
      s.allies++;
      s.cool.push(0);
      return pos(s.angle, ORBIT);
    case 'spin':
      s.spinLv++;
      return pos(s.angle, ORBIT);
    case 'shield':
      s.hp++;
      return { x: 0, y: 0 };
  }
}

function choose(s: State, k: number) {
  if (!s.offer || !s.offer[k]) return;
  const c = s.offer[k];
  const p = apply(s, c);
  s.ore -= s.cost;
  s.cost = Math.round(s.cost * COST_MUL + COST_ADD);
  s.builds++;
  s.last = { card: c.id, label: c.label, t: s.t };
  s.offer = null;
  s.events.push({ type: 'build', card: c.id, ...p });
}

function shoot(s: State, from: { x: number; y: number }, range: number, kind: 'ship' | 'turret'): number | null {
  let best: { p: { x: number; y: number }; d: number } | null = null;
  for (const e of s.enemies) {
    const p = pos(e.a, e.r), d = Math.hypot(p.x - from.x, p.y - from.y);
    if (d < range && (!best || d < best.d)) best = { p, d };
  }
  if (!best) return null;
  s.bullets.push({ x: from.x, y: from.y, vx: ((best.p.x - from.x) / best.d) * BULLET_V, vy: ((best.p.y - from.y) / best.d) * BULLET_V, life: 32, from: kind });
  s.events.push({ type: 'fire', x: from.x, y: from.y, from: kind });
  return Math.atan2(best.p.y - from.y, best.p.x - from.x);
}

/** 회전 속도(라디안/틱): 기본 초당 0.9, 궤도 가속 단계마다 +50% */
export const spinSpeed = (s: State) => (0.9 / 60) * (1 + 0.5 * s.spinLv);

export function step(s: State, input: Input) {
  s.events = [];
  if (s.dead) return;
  // 카드가 떠 있으면 세계가 멈춘다 — 고르기 전엔 진행하지 않는다 (오너: "레벨업하면 멈추고 선택해야 진행")
  if (s.offer) {
    if (input.pick !== undefined) choose(s, input.pick);
    return;
  }
  s.t++;
  s.angle = wrap(s.angle + spinSpeed(s));
  waves(s);
  s.ore += (0.5 + mineRate(s)) / 60;
  if (!s.offer && s.ore >= s.cost) makeOffer(s);
  if (s.t - s.comboAt > COMBO_GAP) s.combo = 0;
  const ships = crew(s).map((a) => pos(a, ORBIT));
  ships.forEach((m, k) => {
    if (--s.cool[k] > 0) return;
    s.cool[k] = shoot(s, m, RANGE, 'ship') === null ? 1 : FIRE_EVERY;
  });
  for (const site of s.sites) {
    if (site.kind !== '포탑' || --site.cool > 0) continue;
    const a = shoot(s, pos(siteAngle(s, site.slot), CORE), turretRange(site.level), 'turret');
    site.cool = a === null ? 1 : turretEvery(site.level);
    if (a !== null) site.aim = a;
  }
  for (const b of s.bullets) (b.x += b.vx), (b.y += b.vy), b.life--;
  for (let i = s.enemies.length - 1; i >= 0; i--) {
    const e = s.enemies[i];
    e.r -= e.v;
    const ep = pos(e.a, e.r);
    if (e.r < CORE + ENEMY_R * 0.5) {
      s.enemies.splice(i, 1);
      s.hitAt = s.t;
      s.hp--;
      s.combo = 0;
      s.events.push({ type: 'impact', x: ep.x, y: ep.y, hp: s.hp });
      if (s.hp <= 0) {
        s.dead = true;
        s.deadAt = s.t;
        s.events.push({ type: 'dead' });
        return;
      }
      continue;
    }
    let by: 'shot' | 'body' | null = ships.some((m) => Math.hypot(ep.x - m.x, ep.y - m.y) < BODY + ENEMY_R) ? 'body' : null;
    for (const b of s.bullets) {
      if (by || b.life <= 0 || Math.hypot(ep.x - b.x, ep.y - b.y) > ENEMY_R + 0.015) continue;
      b.life = 0;
      e.flash = s.t;
      if (--e.hp <= 0) by = 'shot';
      else s.events.push({ type: 'hit', x: ep.x, y: ep.y });
    }
    if (by) {
      s.enemies.splice(i, 1);
      s.kills++;
      if (by === 'body') s.blocks++;
      s.combo++;
      s.comboAt = s.t;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      const ore = e.big ? 3 : 1;
      s.ore += ore;
      s.events.push({ type: 'kill', x: ep.x, y: ep.y, big: e.big, combo: s.combo, ore, by });
    }
  }
  s.bullets = s.bullets.filter((b) => b.life > 0);
}

/** 카드 고르는 버릇 — 봇은 이것만 다르다 (조작이 없으니 실력 = 카드 판단) */
export type Policy = (c: Card, s: State) => number;
const pickBy = (s: State, rank: Policy) => (s.offer ? s.offer.map((c, k) => [rank(c, s), k]).sort((a, b) => a[0] - b[0])[0][1] : undefined);

/** 봇: 카드는 아무거나 (처음 하는 사람 대역) */
export function randomBot(s: State, rng: Rng): Input {
  return { pick: s.offer ? Math.floor(rng() * s.offer.length) : undefined };
}
export const noviceBot = randomBot;

/** 봇: 방어 우선 — 위성 > 포탑 강화 > 새 포탑 > 궤도 가속 > 광산 > 방어막 (내구도 1이면 방어막 먼저) */
export const BALANCED: Policy = (c, s) =>
  s.hp <= 1 && c.id === 'shield' ? 0 : c.id === 'ally' ? 1 : c.id === 'up-turret' ? 2 : c.id === 'new-turret' ? 3 : c.id === 'spin' ? 4 : c.id.endsWith('mine') ? 5 : 6;
export function smartBot(s: State): Input {
  return { pick: pickBy(s, BALANCED) };
}
export const policyBot = (rank: Policy) => (s: State): Input => ({ pick: pickBy(s, rank) });

/** 봇 한 판 */
export function runBot(bot: (s: State, rng: Rng) => Input, seed: number, maxTicks = 60 * 600) {
  const s = create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let guard = 0;
  while (!s.dead && s.t < maxTicks && guard++ < maxTicks * 4) step(s, bot(s, rng));
  return { score: score(s), sec: s.t / 60, builds: s.builds, kills: s.kills, state: s };
}
