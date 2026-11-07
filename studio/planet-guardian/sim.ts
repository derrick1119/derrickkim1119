/**
 * 행성 수호대 — 결정적 시뮬레이션 (스튜디오판, M1).
 * 출발점: arcade/games/guardian2.ts (복사 후 독립). 같은 시드·같은 입력 → 같은 결과.
 * 화면·소리와 분리: 시뮬은 매 틱 `events`에 "무슨 일이 어디서 났나"만 남기고, 손맛(파티클·흔들림·소리)은 그걸 읽어 만든다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';

export const CORE = 0.17, ORBIT = 0.43, BODY = 0.05, ENEMY_R = 0.04, RANGE = 0.32;
export const SLOTS = 8, HP_MAX = 5, CARD_Y = 0.84;
const BULLET_V = 1.3 / 60, MOVE = 1.7 / 60, FIRE_EVERY = 30, COMBO_GAP = 60, BREATH = 240;
export const TICK = 1 / 60;

export type Kind = '광산' | '포탑';
export type CardId = 'new-mine' | 'new-turret' | 'up-mine' | 'up-turret' | 'ally' | 'shield';
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

export interface Input {
  /** -1 반시계, 0 정지, 1 시계 (봇·호환용) */
  dir: -1 | 0 | 1;
  /** 가고 싶은 궤도 각도 — 가장 가까운 배가 그 각도로 간다. 손을 떼도 도착할 때까지 간다 (오너: "조작이 좀 어렵네") */
  aim?: number;
  /** 이번 틱에 고른 카드(0부터) */
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
  dir: -1 | 0 | 1;
  /** 마지막으로 누른 목표 각도 (도착하면 null) */
  target: number | null;
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
    rng: mulberry32(seed), crng: mulberry32(seed ^ 0x5bd1e995), wave: 1, budget: waveSize(1), breath: 0, t: 0, angle: -Math.PI / 2, dir: 0, target: null, allies: 0, cool: [0], enemies: [], bullets: [],
    ore: 0, cost: 8, offer: null, offerAt: -99, builds: 0, hp: 3, spawnIn: 90, nextId: 1, kills: 0, blocks: 0,
    combo: 0, comboAt: -999, bestCombo: 0, last: null, hitAt: -99, deadAt: -1, dead: false, events: [],
    // 리뷰: 시작 방어 0 → 포탑 Lv1 하나를 깔고 시작 (기지가 첫 화면부터 보인다)
    sites: [{ kind: '포탑', slot: 6, level: 1, cool: 0, aim: 0, born: -99 }],
  };
}

export const score = (s: State) => s.kills + s.builds * 5;

/** 웨이브 예산 (리뷰 ①: 시간 기반 스폰은 88초에 초당 12개 벽을 만들었다) */
export const waveSize = (n: number) => 8 + 3 * n;
const waveCap = (n: number) => 4 + n;
const waveGap = (n: number) => Math.max(16, 70 - 8 * n);

function spawn(s: State) {
  const n = s.wave - 1;
  const big = s.rng() < Math.min(0.5, 0.09 * n);
  const hp = big ? 3 : 1 + (s.rng() < Math.min(0.6, 0.12 * n) ? 1 : 0);
  s.enemies.push({ id: s.nextId++, a: s.rng() * Math.PI * 2, r: 1.05, v: (0.13 + 0.05 * n + 0.004 * n * n + s.rng() * 0.04) / 60, hp, maxHp: hp, big, flash: -99 });
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
  if (s.allies < 3) out.push({ id: 'ally', label: '위성', detail: '수호선 +1' });
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
  s.cost = Math.round(s.cost * 1.15 + 3);
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

/** 목표까지 남은 각도(가장 가까운 배 기준, 부호 = 방향) */
export function toTarget(s: State, aim: number) {
  return crew(s).map((a) => wrap(aim - a)).reduce((a, x) => (Math.abs(x) < Math.abs(a) ? x : a));
}
/** 목표 이동: 멀면 빠르게(초당 3.3라디안), 가까우면 감속해 정확히 멈춘다 — 예전 고정 1.7라디안은 반 바퀴에 1.9초 */
const AIM_MAX = 0.055, AIM_MIN = 0.012, AIM_GAIN = 0.16;

export function step(s: State, input: Input) {
  s.events = [];
  if (s.dead) return;
  s.t++;
  if (input.pick !== undefined) choose(s, input.pick);
  if (input.aim !== undefined) s.target = input.aim;
  if (input.dir) s.target = null;
  if (s.target !== null) {
    const d = toTarget(s, s.target);
    if (Math.abs(d) < 0.006) (s.target = null), (s.dir = 0);
    else {
      const v = Math.min(AIM_MAX, Math.max(AIM_MIN, Math.abs(d) * AIM_GAIN), Math.abs(d));
      s.dir = d > 0 ? 1 : -1;
      s.angle = wrap(s.angle + s.dir * v);
    }
  } else {
    s.dir = input.dir;
    if (s.dir) s.angle = wrap(s.angle + s.dir * MOVE);
  }
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

/** 봇: 아무 데나 막 누르고, 카드는 아무거나 (바닥 대역) */
export function randomBot(s: State, rng: Rng): Input {
  return { dir: 0, aim: rng() < 0.1 ? rng() * Math.PI * 2 : undefined, pick: s.offer && rng() < 0.02 ? Math.floor(rng() * s.offer.length) : undefined };
}

/** 봇: 처음 하는 사람 대역 — 0.4초 늦게 보고, 0.3라디안쯤 빗나가게 누르고, 카드는 늦게 아무거나 (리뷰 R1: 막누르기는 신규 유저 대리 지표가 아니다) */
export function noviceBot(s: State, rng: Rng): Input {
  const pick = s.offer && s.t - s.offerAt > 120 && rng() < 0.05 ? Math.floor(rng() * s.offer.length) : undefined;
  // 0.4초 전에 이미 보이던 운석 중 가장 급한 것 (반응 지연)
  const seen = s.enemies.filter((e) => 1.05 - e.r > e.v * 24);
  if (!seen.length || rng() < 0.6) return { dir: 0, pick };
  const urgent = seen.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
  return { dir: 0, aim: urgent.a + (rng() - 0.5) * 0.6, pick };
}

/** 봇: 가장 급한 운석을 가장 가까운 배로 막고, 카드는 위성 > 포탑 강화 > 새 포탑 > 광산 > 방어막 (내구도 1이면 방어막 먼저) */
export function smartBot(s: State): Input {
  let pick: number | undefined;
  if (s.offer) {
    const rank = (c: Card) => (s.hp <= 1 && c.id === 'shield' ? 0 : c.id === 'ally' ? 1 : c.id === 'up-turret' ? 2 : c.id === 'new-turret' ? 3 : c.id.endsWith('mine') ? 4 : 5);
    pick = s.offer.map((c, k) => [rank(c), k]).sort((a, b) => a[0] - b[0])[0][1];
  }
  if (!s.enemies.length) return { dir: 0, pick };
  const urgent = s.enemies.reduce((a, e) => ((e.r - CORE) / e.v < (a.r - CORE) / a.v ? e : a));
  return { dir: 0, aim: urgent.a, pick };
}

/** 봇 한 판: react틱마다 판단, 사이 틱은 방향만 유지(카드는 다시 고르지 않음) */
export function runBot(bot: (s: State, rng: Rng) => Input, seed: number, maxTicks = 60 * 600, react = 3) {
  const s = create(seed);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let held: Input = { dir: 0 };
  while (!s.dead && s.t < maxTicks) {
    const inp = s.t % react === 0 ? (held = bot(s, rng)) : { dir: held.dir };
    step(s, inp);
  }
  return { score: score(s), sec: s.t / 60, builds: s.builds, kills: s.kills, state: s };
}
