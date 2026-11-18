/**
 * 슬롯 성문 수비 (30라운드: 카지노·주사위 디펜스) — 슬롯 머신 × 성문 디펜스 × 가리키기(톡).
 * 손이 하는 일은 하나: 톡. 릴이 돌고 있을 때 톡 하면 왼쪽 릴부터 하나씩 멈춘다(가운데 줄에 있는 그림에서 탁).
 *   릴은 사람이 노릴 수 있을 만큼 천천히 돌고, 위 칸에 다음에 올 그림이 보인다 — 실력으로 멈추기.
 *   세 릴이 멈추면 결과가 터진다: 같은 그림 셋 = 잭팟(큰 효과), 둘 = 작은 효과, 🍀 = 아무 그림.
 * 그림: 🏹 화살비(앞에 있는 적부터) · 💣 폭탄(가장 뭉친 곳) · 🧱 성벽 수리 · ❄️ 얼림 · 🪙 동전 · 🍀 아무거나.
 * 적: 젤리(보통) · 쥐 떼(뭉쳐 다님 — 폭탄) · 갑옷 벌레(화살이 팅 — 폭탄이나 얼린 뒤 화살로 와장창) · 박쥐(날아서 폭탄이 안 닿음) · 대장 오우거.
 * 전략: 위 예보판에 다음 파도가 보인다. 그 적에 맞는 그림을 노리고, 짝 둘에서 바로 멈출지(빠름) 셋을 기다릴지(느림·큼)를 고른다.
 *   3판부터 파도 사이 '릴 꾸미기': 동전으로 릴 띠에 그림을 더하거나 빼서 확률을 바꾼다(띠에 든 그림 수가 기계 아래에 보임).
 * 판(6판): 판마다 파도 2~3개, 판마다 새것 하나(시작 카드 한 줄 + 스포트라이트). 성문 벽돌이 0이 되면 하트 -1, 그 판 다시.
 * 별(쉬운 말, 한 판에 하나씩 늘어남): 1판 "성문 지키기" → 2판 + "벽돌 N개 지키기" → 3판부터 + 그 판의 숙제
 *   (폭탄 한 번에 여섯 마리 · 얼린 갑옷 벌레 깨기 · 박쥐 못 지나가게 · 대장이 성문에 닿기 전에 잡기).
 * 웃음: 화살 맞은 몬스터는 데굴데굴 굴러 날아가고, 얼면 혀 내밀고 굳은 웃긴 자세. 성벽 위 병사 고양이들이 잭팟에 만세, 꽝에 어깨 으쓱.
 * 카지노지만 귀엽게: 진짜 돈 없음, 동물 성 세계의 장난감 슬롯. 비슷한 장르: '슬롯으로 공격하는' 모바일 RPG들(슬롯 배틀류)이 있다 — 성문 디펜스와 릴 꾸미기는 이 게임의 조합.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const ARROW = 0, BOMB = 1, BRICK = 2, ICE = 3, COIN = 4, CLOVER = 5;
const NSYM = 6;
export const SE = ['🏹', '💣', '🧱', '❄️', '🪙', '🍀'];
const SWORD = ['앞줄', '뭉친 곳', '수리', '얼림', '동전', '아무거나'];
const SNAME = ['화살비', '폭탄', '성벽 수리', '얼음', '동전', '네잎'];
const MAXB = 10;
/** 릴이 멈추는 연출 틱 · 결과 뒤 다음 돌리기까지(꽝·짝·잭팟) · 잭팟 느려짐 */
const STOP_T = 12, PAY_MISS = 24, PAY_PAIR = 38, PAY_TRIPLE = 72, SLOW_T = 60;
/** 톡 했을 때 고르는 칸: floor(p + SEL) — 가운데 줄보다 살짝 위에서부터 고른다(사람 반응 늦음 보정) */
const SEL = 0.35;
const BOOST_T = 14, BOOST_V = 0.2;
const INTRO = 70, GAP_T = 90, CLEAR_T = 55, FAIL_T = 80, RESULT_OK = 150, RESULT_FAIL = 150, NEWS_T = 210, DECO_AUTO = 60 * 14;

// ───────────────────────────── 몬스터 ─────────────────────────────
const JELLY = 0, MOUSE = 1, BEETLE = 2, BAT = 3, BOSS = 4;
const SPOT_KEYS: [string, number][] = [['mouse', MOUSE], ['beetle', BEETLE], ['bat', BAT], ['boss', BOSS]];
interface MonDef { key: string; name: string; hp: number; spd: number; bash: number; dmg: number; fly: boolean; r: number }
const MD: MonDef[] = [
  { key: 'jelly', name: '젤리', hp: 2, spd: 1 / (13 * 60), bash: 120, dmg: 1, fly: false, r: 0.06 },
  { key: 'mouse', name: '쥐', hp: 1, spd: 1 / (10 * 60), bash: 150, dmg: 1, fly: false, r: 0.043 },
  { key: 'beetle', name: '갑옷 벌레', hp: 3, spd: 1 / (15 * 60), bash: 90, dmg: 1, fly: false, r: 0.064 },
  { key: 'bat', name: '박쥐', hp: 1, spd: 1 / (9 * 60), bash: 0, dmg: 1, fly: true, r: 0.052 },
  { key: 'boss', name: '대장 오우거', hp: 10, spd: 1 / (24 * 60), bash: 100, dmg: 2, fly: false, r: 0.1 },
];

interface Group { k: number; n: number; at: number; gap: number; swarm?: boolean }
type Special = { kind: 'bomb' | 'shatter' | 'bat' | 'boss'; n: number };
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 릴 띠 하나에 든 그림 수 [🏹,💣,🧱,❄️,🪙,🍀] */
  syms: number[]; v: number; deco: boolean; waves: Group[][]; nstars: number; B: number; sp?: Special;
}
const g = (k: number, n: number, at: number, gap: number, swarm = false): Group => ({ k, n, at, gap, swarm });
export const STAGES: StageDef[] = [
  {
    key: 'slot', name: '젤리 파도', emoji: '🟢', news: '🎰 톡 하면 릴이 하나씩 멈춰요 — 같은 그림 셋이면 잭팟!', tip: '🏹 가운데 줄에 왔을 때 톡 — 화살비가 앞의 적부터',
    syms: [5, 0, 3, 0, 2, 0], v: 0.034, deco: false, nstars: 1, B: 0,
    waves: [[g(JELLY, 3, 0, 80)], [g(JELLY, 5, 0, 60)]],
  },
  {
    key: 'bomb', name: '쥐 떼', emoji: '🐭', news: '💣 폭탄 — 뭉친 쥐 떼를 한 번에 펑!', tip: '🐭 쥐 떼엔 💣 · 하나씩 오는 젤리엔 🏹',
    syms: [4, 3, 2, 0, 2, 0], v: 0.038, deco: false, nstars: 2, B: 7,
    waves: [[g(JELLY, 4, 0, 60)], [g(MOUSE, 7, 0, 0, true)], [g(JELLY, 3, 0, 70), g(MOUSE, 6, 100, 0, true)]],
  },
  {
    key: 'deco', name: '릴 꾸미기', emoji: '🎨', news: '🎨 파도 사이 릴 꾸미기 — 동전으로 그림을 더하고 빼요', tip: '🪙 동전을 모아 다음 파도에 맞게 릴을 꾸며요',
    syms: [3, 2, 2, 0, 3, 0], v: 0.04, deco: true, nstars: 3, B: 6, sp: { kind: 'bomb', n: 7 },
    waves: [[g(JELLY, 3, 0, 50), g(MOUSE, 6, 120, 0, true)], [g(MOUSE, 8, 0, 0, true), g(JELLY, 2, 150, 60)], [g(JELLY, 3, 0, 45), g(MOUSE, 8, 110, 0, true)]],
  },
  {
    key: 'beetle', name: '갑옷 벌레', emoji: '🪲', news: '❄️ 얼림 — 얼린 갑옷 벌레는 화살에 와장창!', tip: '🪲 갑옷엔 화살이 팅 — 💣 아니면 ❄️ 다음 🏹',
    syms: [3, 2, 2, 2, 2, 0], v: 0.042, deco: true, nstars: 3, B: 6, sp: { kind: 'shatter', n: 3 },
    waves: [[g(BEETLE, 2, 0, 40), g(JELLY, 3, 60, 40)], [g(MOUSE, 6, 0, 0, true), g(BEETLE, 2, 60, 40)], [g(BEETLE, 3, 0, 40), g(JELLY, 2, 100, 40)]],
  },
  {
    key: 'bat', name: '박쥐', emoji: '🦇', news: '🦇 박쥐는 날아서 폭탄이 안 닿아요 — 🏹로!', tip: '🦇 박쥐엔 🏹 · 땅의 떼엔 💣 — 무엇부터?',
    syms: [3, 2, 2, 2, 2, 0], v: 0.044, deco: true, nstars: 3, B: 6, sp: { kind: 'bat', n: 0 },
    waves: [[g(BAT, 4, 0, 60), g(JELLY, 2, 30, 70)], [g(MOUSE, 6, 0, 0, true), g(BAT, 3, 60, 50)], [g(BEETLE, 2, 0, 90), g(BAT, 4, 60, 45), g(MOUSE, 5, 170, 0, true)]],
  },
  {
    key: 'boss', name: '대장 오우거', emoji: '👹', news: '👹 대장 오우거 — 화살은 간지러워해요, 💣·❄️로!', tip: '👹 대장은 얼리면 멈춰요 — 성문에 닿기 전에!',
    syms: [3, 2, 2, 2, 2, 1], v: 0.046, deco: true, nstars: 3, B: 5, sp: { kind: 'boss', n: 0 },
    waves: [[g(JELLY, 3, 0, 50), g(BAT, 3, 70, 60), g(MOUSE, 5, 160, 0, true)], [g(BEETLE, 2, 0, 80), g(MOUSE, 6, 100, 0, true)], [g(BOSS, 1, 0, 0), g(BAT, 3, 110, 70), g(JELLY, 3, 190, 60)]],
  },
];
export const STAGE_COUNT = STAGES.length;
const NUMW = ['영', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
export function starText(d: StageDef, k: number): string {
  if (k === 0) return '성문 지키기';
  if (k === 1) return `벽돌 ${d.B}개 지키기`;
  const sp = d.sp!;
  if (sp.kind === 'bomb') return `폭탄 한 번에 ${NUMW[sp.n]} 마리 잡기`;
  if (sp.kind === 'shatter') return `얼린 갑옷 벌레 ${NUMW[sp.n]} 마리 깨기`;
  if (sp.kind === 'bat') return '박쥐 한 마리도 못 지나가게';
  return '대장이 성문에 닿기 전에 잡기';
}

// ───────────────────────────── 싸움터(봇이 미리 시뮬레이션하는 부분) ─────────────────────────────
export interface Mon {
  id: number; k: number; hp: number; mx: number; d: number; lx: number; bx: number; ph: number;
  frz: number; gate: boolean; bashAt: number; out: number; how: number; hitT: number; hitN: number; frzN: number; sm: number; dl: number;
}
interface Spawn { at: number; k: number; lx: number; d: number; grp: number; sm: number; dl: number }
export interface World {
  t: number; mons: Mon[]; pend: Spawn[]; pi: number; w0: number; bricks: number; coins: number; earned: number;
  bombBest: number; shatter: number; batLeak: number; bossGate: number; bossDead: number; kills: number; slowUntil: number; spearAt: number; nid: number;
}
/** 화면용 사건 기록 (봇 시뮬레이션에선 undefined) */
interface Rec { k: string; x: number; y: number; v?: number; ids?: number[]; text?: string }

const alive = (m: Mon) => m.out === 0;
function spawnNext(W: World) {
  while (W.pi < W.pend.length && W.w0 + W.pend[W.pi].at <= W.t) {
    const p = W.pend[W.pi++], df = MD[p.k];
    W.mons.push({ id: W.nid++, k: p.k, hp: df.hp, mx: df.hp, d: p.d, lx: p.lx, bx: p.lx, ph: (p.lx * 7.3 + p.at * 0.37) % 6.28, frz: 0, gate: false, bashAt: 0, out: 0, how: 0, hitT: -99, hitN: 0, frzN: 0, sm: p.sm, dl: p.dl });
  }
}
/** 싸움터를 dt틱 진행 (진짜 게임은 1, 봇의 미리 보기는 3) */
function advance(W: World, dt: number, rec?: Rec[]) {
  W.t += dt;
  spawnNext(W);
  const slow = W.t < W.slowUntil ? 0.3 : 1;
  let front: Mon | null = null;
  for (const m of W.mons) {
    if (m.out) continue;
    const df = MD[m.k];
    if (m.frz > W.t) continue;
    if (!m.gate) {
      m.d -= df.spd * m.sm * dt * slow;
      if (m.dl) m.lx = Math.max(-0.9, Math.min(0.9, m.lx + m.dl * df.spd * dt * slow));
      if (m.k === BAT) m.lx = Math.max(-0.85, Math.min(0.85, m.bx + 0.32 * Math.sin(m.ph + W.t * 0.045)));
      if (m.d <= 0) {
        m.d = 0;
        m.gate = true;
        m.bashAt = W.t + (m.k === BAT ? 0 : 36);
        if (m.k === BOSS) W.bossGate++;
      }
    }
    if (m.gate) {
      if (m.frz > 0 && m.bashAt < m.frz + 30 && m.frz + 30 > W.t - dt) m.bashAt = Math.max(m.bashAt, m.frz + 30);
      if (W.t >= m.bashAt) {
        W.bricks -= df.dmg;
        if (m.k === BAT) (m.out = W.t), (m.how = 9), W.batLeak++;
        else m.bashAt += df.bash * (slow < 1 ? 2 : 1);
        rec?.push({ k: 'bash', x: m.lx, y: 0, v: m.id });
      }
      if (!m.out && (!front || m.lx < front.lx)) front = m;
    }
  }
  // 성문 위 창병 고양이: 성문에 붙은 적을 가끔 콕
  if (W.t >= W.spearAt) {
    if (front) {
      hit(W, front, 1, 'spear', rec);
      rec?.push({ k: 'spear', x: front.lx, y: 0, v: front.id });
      W.spearAt = W.t + 150;
    } else W.spearAt = W.t + 10;
  }
}

function hit(W: World, m: Mon, dmg: number, src: 'arrow' | 'bomb' | 'spear' | 'magic', rec?: Rec[]): number {
  if (m.out) return 0;
  const frozen = m.frz > W.t;
  if (src === 'bomb' && MD[m.k].fly) return 0;
  if (src === 'arrow') {
    if (m.k === BEETLE) {
      if (!frozen) {
        rec?.push({ k: 'ting', x: m.lx, y: m.d, v: m.id });
        return 0;
      }
      dmg = m.hp;
      W.shatter++;
      rec?.push({ k: 'shatter', x: m.lx, y: m.d, v: m.id });
    } else if (m.k === BOSS) dmg = frozen ? 2 : 1;
    else if (frozen) dmg += 1;
  }
  m.hp -= dmg;
  m.hitT = W.t;
  m.hitN++;
  if (m.hp <= 0) {
    m.out = W.t;
    m.how = src === 'arrow' ? 1 : src === 'bomb' ? 2 : src === 'spear' ? 3 : 4;
    W.kills++;
    if (m.k === BOSS) W.bossDead = W.t;
    return 1;
  }
  return 0;
}

/** 결과 = 그림 종류(0~5, 5는 무지개) · 크기(3 잭팟, 2 짝, 0 꽝) */
export interface Out { sym: number; n: number }
export function resolve(r: number[]): Out {
  if (r[0] === CLOVER && r[1] === CLOVER && r[2] === CLOVER) return { sym: CLOVER, n: 3 };
  let best = -1, bn = 0;
  for (let i = 0; i < 3; i++) {
    const x = r[i];
    if (x === CLOVER) continue;
    const n = r.filter((y) => y === x || y === CLOVER).length;
    if (n > bn) (bn = n), (best = x);
  }
  return bn >= 2 ? { sym: best, n: bn } : { sym: -1, n: 0 };
}
const BOMB_R = [0, 0, 0.14, 0.22], BOMB_D = [0, 0, 2, 4];
const fieldDist = (a: Mon, lx: number, d: number) => Math.hypot((a.lx - lx) * 0.42, a.d - d);
/** 폭탄 자리: 땅 위 적이 가장 많이 들어가는 곳 */
export function bombSpot(W: World, R: number): { lx: number; d: number; n: number } {
  let bl = 0, bd = 0.5, bn = 0;
  const ground = W.mons.filter((m) => !m.out && !MD[m.k].fly);
  for (const c of ground) {
    let n = 0, sx = 0, sd = 0;
    for (const m of ground) if (fieldDist(m, c.lx, c.d) <= R) (n++, (sx += m.lx), (sd += m.d));
    const w = n + (c.k === BOSS ? 2 : 0);
    if (w > bn) (bn = w), (bl = sx / n), (bd = sd / n);
  }
  return { lx: bl, d: bd, n: bn };
}
export function frontOf(W: World, n: number): Mon[] {
  return W.mons.filter(alive).sort((a, b) => a.d - b.d || a.id - b.id).slice(0, n);
}
function applyOut(W: World, o: Out, rec?: Rec[]) {
  if (o.n === 3) W.slowUntil = W.t + SLOW_T;
  if (o.sym === ARROW) {
    // 짝: 앞의 셋 · 잭팟: 싸움터의 모두에게 화살비
    const tg = o.n === 3 ? W.mons.filter(alive) : frontOf(W, 3);
    rec?.push({ k: 'arrows', x: 0, y: 0, v: o.n, ids: tg.map((m) => m.id) });
    for (const m of tg) hit(W, m, 2, 'arrow', rec);
  } else if (o.sym === BOMB) {
    const R = BOMB_R[o.n], c = bombSpot(W, R);
    rec?.push({ k: 'bomb', x: c.lx, y: c.d, v: o.n });
    let killed = 0;
    for (const m of W.mons.slice()) if (!m.out && !MD[m.k].fly && fieldDist(m, c.lx, c.d) <= R) killed += hit(W, m, BOMB_D[o.n], 'bomb', rec);
    W.bombBest = Math.max(W.bombBest, killed);
    if (killed >= 3) rec?.push({ k: 'bombN', x: c.lx, y: c.d, v: killed });
  } else if (o.sym === ICE) {
    const tg = o.n === 3 ? W.mons.filter(alive) : frontOf(W, 3);
    for (const m of tg) (m.frz = W.t + (o.n === 3 ? 240 : 180)), m.frzN++;
    rec?.push({ k: 'ice', x: 0, y: 0, v: o.n, ids: tg.map((m) => m.id) });
  } else if (o.sym === BRICK) {
    const add = o.n === 3 ? 5 : 2, b0 = W.bricks;
    W.bricks = Math.min(MAXB, W.bricks + add);
    rec?.push({ k: 'brick', x: 0, y: 0, v: W.bricks - b0 });
  } else if (o.sym === COIN) {
    const add = o.n === 3 ? 8 : 3;
    W.coins += add;
    W.earned += add;
    rec?.push({ k: 'coin', x: 0, y: 0, v: add });
  } else if (o.sym === CLOVER) {
    rec?.push({ k: 'rainbow', x: 0, y: 0 });
    for (const m of W.mons.slice()) if (!m.out) hit(W, m, 3, 'magic', rec);
    W.coins += 5;
    W.earned += 5;
  } else rec?.push({ k: 'miss', x: 0, y: 0 });
}
const waveDone = (W: World) => W.pi >= W.pend.length && !W.mons.some(alive);
function cloneW(W: World): World {
  return { ...W, mons: W.mons.filter(alive).map((m) => ({ ...m })) };
}

// ───────────────────────────── 릴 ─────────────────────────────
/** st: 0 도는 중 · 1 멈추는 중(결과 정해짐) · 2 멈춤 · 3 쉼(파도 사이) */
export interface Reel { strip: number[]; p: number; st: number; k: number; p0: number; t0: number; boost: number }
const symOf = (r: Reel, k: number) => r.strip[((k % r.strip.length) + r.strip.length) % r.strip.length];
const selOf = (r: Reel) => Math.floor(r.p + SEL);

/** 그림 수로 릴 띠를 만든다: 같은 그림이 붙지 않게 고루 흩는다 */
function makeStrip(cnt: number[], r: Rng): number[] {
  const bag: number[] = [];
  cnt.forEach((n, x) => {
    for (let i = 0; i < n; i++) bag.push(x);
  });
  let best: number[] = bag.slice(), bs = 1e9;
  for (let tries = 0; tries < 30; tries++) {
    const a = bag.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    let bad = 0;
    for (let i = 0; i < a.length; i++) if (a[i] === a[(i + 1) % a.length]) bad++;
    if (bad < bs) (bs = bad), (best = a);
    if (!bad) break;
  }
  return best;
}
/** 그림 하나를 띠에 끼운다: 같은 그림에서 가장 먼 자리 */
function insertSym(strip: number[], x: number) {
  let bi = 0, bs = -1;
  for (let i = 0; i <= strip.length; i++) {
    let dmin = 99;
    for (let j = 0; j < strip.length; j++) if (strip[j] === x) dmin = Math.min(dmin, Math.abs(j - i + 0.5), strip.length - Math.abs(j - i + 0.5));
    const prev = strip[(i - 1 + strip.length) % strip.length], next = strip[i % strip.length];
    const sc = dmin * 10 - (prev === x || next === x ? 30 : 0);
    if (sc > bs) (bs = sc), (bi = i);
  }
  strip.splice(bi, 0, x);
}
function removeSym(strip: number[], x: number) {
  let bi = -1, bs = -1;
  for (let i = 0; i < strip.length; i++) {
    if (strip[i] !== x) continue;
    const sc = (strip[(i + 1) % strip.length] === x ? 10 : 0) + (strip[(i - 1 + strip.length) % strip.length] === x ? 10 : 0) + i * 0.01;
    if (sc > bs) (bs = sc), (bi = i);
  }
  if (bi >= 0) strip.splice(bi, 1);
}
const countOf = (strip: number[]) => {
  const c = new Array(NSYM).fill(0);
  for (const x of strip) c[x]++;
  return c;
};

// ───────────────────────────── 릴 꾸미기 카드 ─────────────────────────────
export interface Card { op: 1 | -1; sym: number; cost: number; bought: boolean }
function makeCards(d: StageDef, strip: number[], r: Rng): Card[] {
  const c = countOf(strip), have = d.syms.map((n, x) => n > 0 || c[x] > 0);
  const plus: Card[] = [], minus: Card[] = [];
  for (const x of [ARROW, BOMB, ICE]) if (have[x]) plus.push({ op: 1, sym: x, cost: 4, bought: false });
  plus.push({ op: 1, sym: CLOVER, cost: 7, bought: false });
  plus.push({ op: 1, sym: BRICK, cost: 3, bought: false });
  for (const x of [COIN, BRICK, ARROW, BOMB, ICE]) if (c[x] > 1) minus.push({ op: -1, sym: x, cost: 2, bought: false });
  const sh = <T,>(a: T[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  sh(plus);
  sh(minus);
  const out = plus.slice(0, 2);
  if (minus.length) out.push(minus[0]);
  else out.push(plus[2]);
  return out;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; v?: number; ids?: number[]; col?: string }
type Phase = 'play' | 'gap' | 'deco' | 'clear' | 'fail' | 'result';
export interface GState {
  rng: Rng; seed: number; t: number; stage: number; phase: Phase; pt: number; tries: number;
  W: World; reels: Reel[]; v: number; wave: number; spinN: number; payAt: number; nextAt: number; res: number[]; out: Out | null; lastOut: Out | null; stopAt: number;
  cards: Card[]; decoT: number; triples: number; misses: number; spins: number;
  down: boolean; ax: number; ay: number; taps: number; lastTap: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; startCard: number; spots: Record<string, number>; bought: number;
  /** 지난 그림(띠 바뀐 연출) */ stripFx: { sym: number; op: number; t: number } | null;
}
const ev = (s: GState, kind: string, x: number, y: number, text?: string, v?: number, ids?: number[], col?: string) => s.events.push({ t: s.t, kind, x, y, text, v, ids, col });
function see(s: GState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: GState, m: string) => ((s.mood = m), (s.moodT = s.t));

function buildWave(s: GState, wi: number): Spawn[] {
  const d = STAGES[s.stage], r = mulberry32((s.seed ^ (s.stage * 7919 + wi * 104729 + s.tries * 31337)) >>> 0);
  const out: Spawn[] = [];
  d.waves[wi].forEach((gr, gi) => {
    const c = (r() - 0.5) * 0.9;
    for (let i = 0; i < gr.n; i++) {
      // 쥐 떼는 처음엔 뭉쳐 오다가 빠른 쥐·느린 쥐로 점점 흩어진다 (폭탄은 일찍 던질수록 많이 잡힌다)
      if (gr.swarm) out.push({ at: gr.at + i * 3, k: gr.k, lx: Math.max(-0.85, Math.min(0.85, c + (r() - 0.5) * 0.42)), d: 1 + r() * 0.06, grp: gi, sm: 0.5 + ((i * 0.618 + r() * 0.3) % 1) * 1.2, dl: (r() - 0.5) * 2.4 });
      else out.push({ at: gr.at + i * gr.gap, k: gr.k, lx: gr.k === BOSS ? (r() - 0.5) * 0.3 : (r() - 0.5) * 1.4, d: 1, grp: gi, sm: 1, dl: 0 });
    }
  });
  return out.sort((a, b) => a.at - b.at);
}

function startWave(s: GState, wi: number, delay: number) {
  const W = s.W;
  s.wave = wi;
  W.pend = buildWave(s, wi);
  W.pi = 0;
  W.w0 = s.t + delay;
  const d = STAGES[s.stage];
  const kinds = new Set(d.waves[wi].map((gr) => gr.k));
  if (kinds.has(MOUSE)) see(s, 'mouse', '🐭 쥐 떼 — 우르르 뭉쳐 와요');
  if (kinds.has(BEETLE)) see(s, 'beetle', '🪲 갑옷 벌레 — 화살은 팅! 튕겨 나가요');
  if (kinds.has(BAT)) see(s, 'bat', '🦇 박쥐 — 날아서 폭탄이 안 닿아요');
  if (kinds.has(BOSS)) see(s, 'boss', '👹 대장 오우거 등장!');
  ev(s, 'wave', 0.5, 0.45, d.waves.length > 1 ? `파도 ${wi + 1}/${d.waves.length}` : '파도!');
  spinAll(s);
}
/** 다시 돌리기: 결과 뒤 릴이 잠깐 빨리 돌았다가(같은 그림 바로 다시 못 노리게) 천천히 */
function spinAll(s: GState) {
  s.reels.forEach((r, i) => {
    if (r.st !== 0) (r.st = 0), (r.p = r.k), (r.boost = s.t + BOOST_T + i * 5);
  });
  s.res = [];
  s.out = null;
  s.payAt = -1;
  s.nextAt = -1;
  s.spinN++;
}

function newStage(s: GState) {
  const d = STAGES[s.stage], r = mulberry32((s.seed * 31 + s.stage * 977 + 5) >>> 0);
  s.v = d.v;
  s.W = { t: s.t, mons: [], pend: [], pi: 0, w0: 0, bricks: MAXB, coins: d.deco ? 4 : 0, earned: 0, bombBest: 0, shatter: 0, batLeak: 0, bossGate: 0, bossDead: 0, kills: 0, slowUntil: 0, spearAt: s.t + 60, nid: 1 };
  s.reels = [0, 1, 2].map((i) => {
    const strip = makeStrip(d.syms, r);
    // 첫 판: 처음 1~2초 사이에 🏹가 가운데로 오도록 (처음 하는 사람의 첫 돌리기가 화살비가 되기 쉽게)
    let p0 = r() * strip.length;
    if (s.stage === 0) {
      const j = strip.findIndex((x, k) => x === ARROW && k >= 2);
      p0 = j - (1.4 + i * 0.5) * 60 * d.v;
    }
    return { strip, p: p0, st: 0, k: 0, p0: 0, t0: 0, boost: 0 };
  });
  s.phase = 'play';
  s.pt = 0;
  s.triples = 0;
  s.misses = 0;
  s.spins = 0;
  s.bought = 0;
  s.startT = s.t;
  s.startCard = s.t;
  s.got = 0;
  s.starOk = [false, false, false];
  s.cards = [];
  s.stripFx = null;
  setMood(s, 'idle');
  see(s, d.key, d.news);
  s.spinN = 0;
  startWave(s, 0, INTRO);
}

function starsNow(s: GState, ok: boolean): boolean[] {
  const d = STAGES[s.stage], W = s.W;
  const sp = d.sp;
  let third = false;
  if (sp) {
    if (sp.kind === 'bomb') third = W.bombBest >= sp.n;
    else if (sp.kind === 'shatter') third = W.shatter >= sp.n;
    else if (sp.kind === 'bat') third = W.batLeak === 0;
    else third = W.bossDead > 0 && W.bossGate === 0;
  }
  return [ok, ok && d.nstars >= 2 && W.bricks >= d.B, ok && d.nstars >= 3 && third];
}
const STAR_VAL = [100, 100, 120];

function finish(s: GState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  const d = STAGES[s.stage], W = s.W;
  for (const r of s.reels) if (r.st === 0) (r.st = 3), (r.k = Math.round(r.p));
  if (ok) {
    s.starOk = starsNow(s, true);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.starOk.reduce((a, o, k) => a + (o ? STAR_VAL[k] : 0), 0) + Math.max(0, W.bricks) * 5 + s.triples * 5;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 150);
    ev(s, 'clear', 0.5, 0.5, `${d.emoji} 성문을 지켰다!`, s.got);
    setMood(s, 'cheer');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'failR', 0.5, 0.5, s.why);
    setMood(s, 'dizzy');
  }
}

// 화면 배치 (가로 0~1, 세로 0~A)
export const FT = 0.215, FG = 0.79;
const REEL_X = (i: number) => 0.215 + i * 0.255, REEL_W = 0.235, REEL_Y0 = 0.995, ROW = 0.078, PAY_Y = REEL_Y0 + ROW * 1.5;
const CARD_X = (i: number) => 0.2 + i * 0.3, CARD_Y = 0.45, CARD_W = 0.27, CARD_H = 0.25, START_Y = 0.665;

function tapDeco(s: GState, x: number, y: number) {
  for (let i = 0; i < s.cards.length; i++) {
    const c = s.cards[i];
    if (Math.abs(x - CARD_X(i)) < CARD_W / 2 && Math.abs(y - CARD_Y) < CARD_H / 2) {
      if (c.bought) return void ev(s, 'say', CARD_X(i), CARD_Y - 0.1, '이미 꾸몄어요');
      if (s.W.coins < c.cost) return void ev(s, 'poor', CARD_X(i), CARD_Y - 0.1, `동전이 ${c.cost - s.W.coins}개 모자라요`);
      s.W.coins -= c.cost;
      c.bought = true;
      s.bought++;
      for (const r of s.reels) c.op > 0 ? insertSym(r.strip, c.sym) : removeSym(r.strip, c.sym);
      s.stripFx = { sym: c.sym, op: c.op, t: s.t };
      ev(s, 'buy', CARD_X(i), CARD_Y, `${SE[c.sym]} ${c.op > 0 ? '더하기' : '빼기'}!`, c.sym);
      if (c.sym === CLOVER) see(s, 'clover', '🍀 네잎 — 어떤 그림 대신도 돼요');
      return;
    }
  }
  if (Math.abs(x - 0.5) < 0.26 && Math.abs(y - START_Y) < 0.045) return endDeco(s);
}
function endDeco(s: GState) {
  s.phase = 'play';
  startWave(s, s.wave + 1, 50);
}
function openBreak(s: GState) {
  const d = STAGES[s.stage];
  s.W.coins += d.deco ? 2 : 0;
  s.W.earned += 0;
  if (d.deco) {
    s.phase = 'deco';
    s.pt = 0;
    s.decoT = s.t;
    for (const r of s.reels) {
      if (r.st === 0) r.k = Math.round(r.p);
      r.st = 3;
      r.p = r.k;
    }
    s.payAt = 0;
    const rr = mulberry32((s.seed ^ (s.stage * 131 + s.wave * 17 + s.tries * 7)) >>> 0);
    s.cards = makeCards(d, s.reels[0].strip, rr);
    see(s, 'deco', '🎨 릴 꾸미기 — 동전으로 다음 파도에 맞는 그림을 더해요');
  } else {
    s.phase = 'gap';
    s.pt = 0;
  }
}

export const slotgate: GameDef<GState> = {
  id: 'slotgate',
  name: '슬롯 성문 수비',
  genes: ['slots', 'defense', 'pointer'],
  twist: '성문을 지키는 무기가 슬롯 머신이다 — 릴이 천천히 돌아 다음 그림이 보이니 노려서 멈출 수 있고, 몰려오는 적(뭉친 쥐 떼·갑옷 벌레·박쥐)에 따라 노릴 그림과 "짝에서 멈출까 잭팟을 기다릴까"가 바뀐다',
  rules: ['톡 하면 릴이 왼쪽부터 하나씩 멈춰요 — 같은 그림 둘이면 작게, 셋이면 잭팟!', '🏹 앞의 적 · 💣 뭉친 적 · 🧱 수리 · ❄️ 얼림 · 🪙 동전 — 성문 벽돌을 지켜요.'],
  controls: 'touch',
  hint: '아무 데나 톡 = 릴 하나 멈춤 / 스페이스',
  aspect: A,
  art: {
    concept: '고양이 성의 장난감 슬롯 성문',
    mood: '해 질 녘 꽃길 끝 고양이 성 — 돌성벽 위 투구 쓴 병사 고양이들이 구경하고, 성벽 아래 반짝이 전구 두른 빨강·금색 장난감 슬롯 머신이 철컥철컥 돈다. 길 위로 말랑한 젤리·쥐 떼·갑옷 벌레·박쥐가 우르르.',
    palette: { bg: '#2b2440', ink: '#fff8ec', muted: '#cbbfe0', accent: '#ffc94a', hot: '#ff5a6a', soft: '#f6e7c8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, tries: 0,
      W: null, reels: [], v: 0.04, wave: 0, spinN: 0, payAt: -1, nextAt: -1, res: [], out: null, lastOut: null, stopAt: -1,
      cards: [], decoT: 0, triples: 0, misses: 0, spins: 0,
      down: false, ax: 0.5, ay: 0.5, taps: 0, lastTap: -99,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false,
      seen: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0, mood: 'idle', moodT: 0, startCard: 0, spots: {}, bought: 0, stripFx: null,
    } as unknown as GState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 300 : 70)) s.mood = s.W.bricks <= 3 ? 'worry' : 'idle';
    const W = s.W, d = STAGES[s.stage];
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'clear' || s.phase === 'fail') {
      advanceVis(s);
      if (s.pt >= (s.phase === 'clear' ? CLEAR_T : FAIL_T)) finish(s, s.phase === 'clear');
      return;
    }
    if (s.phase === 'deco') {
      W.t = s.t;
      if (press) (s.taps++, (s.lastTap = s.t), tapDeco(s, p!.x, p!.y * A));
      if (s.phase === 'deco' && s.t - s.decoT > DECO_AUTO) endDeco(s);
      return;
    }
    // ── 돌리기 ──
    if (press) {
      s.taps++;
      s.lastTap = s.t;
      s.startCard = Math.min(s.startCard, s.t - 200);
      const i = s.reels.findIndex((r) => r.st === 0);
      if (i >= 0) {
        const r = s.reels[i];
        r.st = 1;
        r.k = selOf(r);
        r.p0 = r.p;
        r.t0 = s.t;
        s.res[i] = symOf(r, r.k);
        ev(s, 'stop', REEL_X(i), PAY_Y, SE[s.res[i]], i, undefined);
        if (i === 1 && (s.res[0] === s.res[1] || s.res[0] === CLOVER || s.res[1] === CLOVER)) ev(s, 'reach', REEL_X(2), PAY_Y, '리치!', s.res[0] === CLOVER ? s.res[1] : s.res[0]);
        if (s.stage === 0) see(s, 'aim', '👀 위 칸 = 다음에 올 그림 — 노려서 톡!');
      } else if (s.payAt < 0) ev(s, 'wait', 0.5, PAY_Y, '잠깐!');
    }
    for (const r of s.reels) {
      if (r.st === 0) r.p += s.t < r.boost ? BOOST_V : s.v;
      else if (r.st === 1 && s.t - r.t0 >= STOP_T) (r.st = 2), (r.p = r.k);
    }
    if (s.payAt < 0 && s.reels.every((r) => r.st === 2)) {
      const o = resolve(s.res);
      s.out = o;
      s.lastOut = o;
      s.spins++;
      s.payAt = s.t;
      s.stopAt = s.t;
      s.nextAt = s.t + (o.n === 3 ? PAY_TRIPLE : o.n === 2 ? PAY_PAIR : PAY_MISS);
      const rec: Rec[] = [];
      applyOut(W, o, rec);
      playRec(s, rec);
      if (o.n === 3) {
        s.triples++;
        ev(s, o.sym === CLOVER ? 'rainbow' : 'jackpot', 0.5, PAY_Y, o.sym === CLOVER ? '무지개 잭팟!!' : '잭팟!', o.sym);
        see(s, 'jackpot', '🎉 같은 그림 셋 = 잭팟! 효과가 훨씬 커요');
        setMood(s, 'cheer');
      } else if (o.n === 2) ev(s, 'pair', 0.5, PAY_Y, `${SE[o.sym]} ${SNAME[o.sym]}!`, o.sym), setMood(s, 'happy');
      else (s.misses++, ev(s, 'miss', 0.5, PAY_Y, '꽝!')), setMood(s, 'shrug');
    }
    if (s.nextAt >= 0 && s.t >= s.nextAt) spinAll(s);
    // ── 싸움터 ──
    const rec: Rec[] = [];
    advance(W, 1, rec);
    if (rec.length) playRec(s, rec);
    // NEW 스포트라이트: 그 적이 처음 나타난 순간
    for (const [key, k] of SPOT_KEYS) if (s.spots[key] === undefined && s.seen.has(key) && W.mons.some((m) => m.k === k && !m.out)) s.spots[key] = s.t;
    if (W.bricks <= 0) {
      W.bricks = 0;
      s.phase = 'fail';
      s.pt = 0;
      s.ok = false;
      s.why = '성문이 부서졌어요!';
      ev(s, 'fail', 0.5, FG, '와르르!');
      setMood(s, 'dizzy');
      return;
    }
    if (s.phase === 'play' && waveDone(W) && W.t >= W.w0) {
      if (s.wave + 1 >= d.waves.length) {
        s.phase = 'clear';
        s.pt = 0;
        ev(s, 'win', 0.5, 0.45, '모두 물리쳤다!');
        setMood(s, 'cheer');
      } else {
        ev(s, 'waveClear', 0.5, 0.45, '파도를 막았다!');
        openBreak(s);
      }
    } else if (s.phase === 'gap' && s.pt >= GAP_T) {
      s.phase = 'play';
      startWaveKeep(s);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
/** 쉬는 틈(1·2판)엔 릴을 멈추지 않고 다음 파도만 부른다 */
function startWaveKeep(s: GState) {
  const W = s.W;
  s.wave++;
  W.pend = buildWave(s, s.wave);
  W.pi = 0;
  W.w0 = s.t + 20;
  const d = STAGES[s.stage];
  const kinds = new Set(d.waves[s.wave].map((gr) => gr.k));
  if (kinds.has(MOUSE)) see(s, 'mouse', '🐭 쥐 떼 — 우르르 뭉쳐 와요');
  ev(s, 'wave', 0.5, 0.45, `파도 ${s.wave + 1}/${d.waves.length}`);
}
/** 끝난 뒤에도 쓰러지는 몬스터 연출이 이어지게 */
function advanceVis(s: GState) {
  s.W.t++;
}

function playRec(s: GState, rec: Rec[]) {
  for (const e of rec) {
    if (e.k === 'bash') ev(s, 'bash', e.x, 0, undefined, e.v), setMood(s, 'scared');
    else if (e.k === 'ting') ev(s, 'ting', e.x, e.y, '팅!', e.v);
    else if (e.k === 'shatter') ev(s, 'shatter', e.x, e.y, '와장창!', e.v), see(s, 'shatter', '❄️🏹 얼린 갑옷은 화살에 와장창!');
    else if (e.k === 'arrows') ev(s, 'arrows', 0, 0, undefined, e.v, e.ids);
    else if (e.k === 'bomb') ev(s, 'bomb', e.x, e.y, undefined, e.v);
    else if (e.k === 'bombN') ev(s, 'bombN', e.x, e.y, `${e.v}마리 펑!`, e.v);
    else if (e.k === 'ice') ev(s, 'ice', 0, 0, undefined, e.v, e.ids), see(s, 'ice', '❄️ 얼린 적은 꼼짝 못 해요');
    else if (e.k === 'brick') ev(s, 'brick', 0.5, FG, e.v ? `벽돌 +${e.v}` : '벽돌이 꽉 찼어요', e.v);
    else if (e.k === 'coin') ev(s, 'coin', 0.5, PAY_Y, `동전 +${e.v}`, e.v);
    else if (e.k === 'rainbow') ev(s, 'rainbowFx', 0, 0);
    else if (e.k === 'spear') ev(s, 'spear', e.x, 0, '콕!', e.v);
  }
}

// ───────────────────────────── 봇 ─────────────────────────────
/** 봇이 보는 값: 성문 벽돌 · 남은 적의 위험 · 동전 · 별 숙제 */
function value(s: GState, W: World): number {
  if (W.bricks <= 0) return -1e6;
  const d = STAGES[s.stage];
  let v = Math.min(MAXB, W.bricks) * 120;
  for (const m of W.mons) {
    if (m.out) continue;
    const near = 1 + 2.2 * (1 - m.d);
    const base = m.k === JELLY ? 12 : m.k === MOUSE ? 14 : m.k === BEETLE ? (m.frz > W.t ? 14 : 26) : m.k === BAT ? 22 : 13;
    v -= base * m.hp * near + (m.gate ? 50 * MD[m.k].dmg : 0) + 30;
  }
  const breaks = d.deco ? d.waves.length - 1 - s.wave : 0;
  v += W.coins * (breaks > 0 ? 9 : 1);
  const sp = d.sp;
  if (sp && d.nstars >= 3) {
    if (sp.kind === 'bomb') v += W.bombBest >= sp.n ? 500 : W.bombBest * 20;
    else if (sp.kind === 'shatter') {
      v += Math.min(sp.n, W.shatter) * 160;
      const need = sp.n - W.shatter;
      let fz = 0;
      for (const m of W.mons) if (!m.out && m.k === BEETLE && m.frz > W.t + 45) fz++;
      v += Math.min(need, fz) * 120;
    }
    else if (sp.kind === 'bat') v -= W.batLeak * 400;
    else v += (W.bossDead && !W.bossGate ? 500 : 0) - W.bossGate * 400;
  }
  if (d.nstars >= 2 && W.bricks < d.B) v -= 150;
  return v;
}

interface Plan { key: string; ks: number[]; out: string; val: number; until?: number }
/** 남은 릴을 어떻게 멈출지: 그림마다 '셋 기다리기·둘만 맞추기·바로 멈추기'를 시간까지 계산해 싸움터를 미리 굴려 본다 */
function planSpin(s: GState, lam: number): Plan {
  const R = s.reels, now = s.t, v = s.v;
  const fixed: number[] = [];
  let first = 0;
  while (first < 3 && R[first].st !== 0) fixed.push(s.res[first]), first++;
  const rem = 3 - first;
  const pAt = (r: Reel, t: number) => r.p + v * (t - now);
  /** 릴 r에서 from틱 이후 처음으로 pred 그림을 고를 수 있는 (k, 틱) */
  const occ = (r: Reel, from: number, pred: (x: number) => boolean) => {
    const p = pAt(r, from), k0 = Math.floor(p + SEL);
    for (let k = k0; k < k0 + r.strip.length + 2; k++) {
      if (!pred(symOf(r, k))) continue;
      if (k === k0 && p + SEL - k0 > 0.86) continue;
      const tick = k === k0 ? from : now + Math.ceil((k + 0.12 - SEL - r.p) / v);
      return { k, tick: Math.max(from, tick) };
    }
    return { k: k0 + 1, tick: from + Math.ceil(1 / v) };
  };
  const syms = new Set<number>();
  for (const r of R) for (const x of r.strip) if (x !== CLOVER) syms.add(x);
  const start0 = now + (s.down ? 3 : 0);
  const seqs: { preds: (((x: number) => boolean) | null)[]; delay: number }[] = [];
  const delays = rem === 3 ? [0, 45, 90] : [0];
  for (const delay of delays) {
    seqs.push({ preds: new Array(rem).fill(null), delay });
    for (const X of syms) {
      const pX = (x: number) => x === X || x === CLOVER;
      for (let mask = 1; mask < 1 << rem; mask++) seqs.push({ preds: [...Array(rem).keys()].map((j) => ((mask >> j) & 1 ? pX : null)), delay });
    }
  }
  const best = new Map<string, { ks: number[]; tEnd: number; tFx: number; res: number[] }>();
  for (const sq of seqs) {
    let t = start0 + sq.delay;
    const ks: number[] = [], res = fixed.slice();
    for (let j = 0; j < rem; j++) {
      const r = R[first + j];
      const o = sq.preds[j] ? occ(r, t, sq.preds[j]!) : occ(r, t, () => true);
      ks.push(o.k);
      res.push(symOf(r, o.k));
      t = o.tick + 6;
    }
    const lastTap = t - 6;
    const o = resolve(res);
    const key = `${o.sym}:${o.n}`;
    const tFx = lastTap + STOP_T;
    const tEnd = tFx + (o.n === 3 ? PAY_TRIPLE : o.n === 2 ? PAY_PAIR : PAY_MISS);
    const b = best.get(key + ':' + sq.delay);
    if (!b || tEnd < b.tEnd) best.set(key + ':' + sq.delay, { ks, tEnd, tFx, res });
  }
  let pick: Plan = { key: '', ks: [], out: '', val: -1e18 };
  // 기다리기: 아무것도 안 하고 잠깐 지켜본다 (쓸모없는 꽝을 돌리느니)
  if (rem === 3) {
    const W = cloneW(s.W), tEnd = now + 30;
    while (W.t < tEnd && W.bricks > 0) advance(W, Math.min(3, tEnd - W.t));
    pick = { key: '', ks: [-2, -2, -2], out: 'wait', val: value(s, W) - lam * 30 };
  }
  for (const [key, c] of best) {
    const W = cloneW(s.W);
    while (W.t < c.tFx) advance(W, Math.min(3, c.tFx - W.t));
    if (W.bricks > 0) {
      applyOut(W, resolve(c.res));
      const tEval = Math.min(c.tEnd, c.tFx + 40);
      while (W.t < tEval && W.bricks > 0) advance(W, Math.min(3, tEval - W.t));
    }
    const val = value(s, W) - lam * (c.tEnd - now);
    if (val > pick.val) pick = { key: '', ks: [...Array(first).fill(-1), ...c.ks], out: key, val };
  }
  return pick;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
/** 멈출 릴을 톡 (사람도 보통 그 릴을 누른다) */
const pressReel = (i: number): Input => ({ tap: false, dir: 0, pointer: { x: REEL_X(i), y: PAY_Y / A } });
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const brain = new WeakMap<object, Plan>();
export const BOT = { lam: 0.6 };

/** 릴 꾸미기: 남은 파도의 적을 보고 모자란 그림을 더하고 쓸모없는 그림을 뺀다 */
function decoPick(s: GState): number {
  const d = STAGES[s.stage], W = s.W, c = countOf(s.reels[0].strip), L = s.reels[0].strip.length;
  const need = new Array(NSYM).fill(0);
  for (let wi = s.wave + 1; wi < d.waves.length; wi++)
    for (const gr of d.waves[wi]) {
      const n = gr.n * (wi === s.wave + 1 ? 1.5 : 1);
      if (gr.k === JELLY) (need[ARROW] += n * 2), (need[BOMB] += n * 0.5);
      if (gr.k === MOUSE) (need[BOMB] += n * 1.6), (need[ARROW] += n * 0.5);
      if (gr.k === BEETLE) (need[BOMB] += n * 2.2), (need[ICE] += n * 2.2), (need[ARROW] += n * 0.8);
      if (gr.k === BAT) need[ARROW] += n * 3;
      if (gr.k === BOSS) (need[BOMB] += 8), (need[ICE] += 8);
    }
  if (d.sp?.kind === 'shatter') need[ICE] += 6;
  if (d.sp?.kind === 'bomb') need[BOMB] += 6;
  need[BRICK] = (MAXB - W.bricks) * 1.2 + 2;
  need[COIN] = d.waves.length - 2 - s.wave > 0 ? 3 : 0;
  const tot = need.reduce((a, b) => a + b, 0) || 1;
  let bi = -1, bg = 0.045;
  s.cards.forEach((cd, i) => {
    if (cd.bought || W.coins < cd.cost) return;
    let gain: number;
    if (cd.sym === CLOVER) gain = 0.09;
    else {
      const f = need[cd.sym] / tot, cur = c[cd.sym] / L;
      gain = cd.op > 0 ? f - cur : cur - f;
      if (cd.op < 0 && c[cd.sym] <= 1) gain = -1;
    }
    gain -= cd.cost * 0.004;
    if (gain > bg) (bg = gain), (bi = i);
  });
  return bi;
}

export const slotgateSmart: Bot<GState> = {
  name: '노려 멈추는 성주',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'deco') {
      if (s.t - s.decoT < 30 || s.t - s.lastTap < 20) return NO;
      const i = decoPick(s);
      return i >= 0 ? at(CARD_X(i), CARD_Y) : at(0.5, START_Y);
    }
    if (s.phase !== 'play' && s.phase !== 'gap') return NO;
    const i = s.reels.findIndex((r) => r.st === 0);
    if (i < 0 || s.payAt >= 0 || s.reels.some((r) => r.st === 0 && r.boost > s.t)) return NO;
    // 싸움터가 비었고 곧 올 적도 없으면 쉰다 (성문이 다 차 있을 때)
    const W = s.W;
    if (i === 0 && !W.mons.some(alive) && W.bricks >= MAXB && (W.pi >= W.pend.length || W.w0 + W.pend[W.pi].at - W.t > 70)) return NO;
    const key = `${s.stage}:${s.tries}:${s.spinN}:${i}`;
    let pl = brain.get(s);
    if (!pl || pl.key !== key) brain.set(s, (pl = { ...planSpin(s, BOT.lam), key }));
    if (pl.out === 'wait') {
      if (!pl.until) pl.until = s.t + 30;
      if (s.t >= pl.until) brain.delete(s);
      return NO;
    }
    const r = s.reels[i], sel = selOf(r), k = pl.ks[i];
    if (sel === k) return pressReel(i);
    if (sel > k) brain.delete(s);
    return NO;
  },
};

/** 버릇 봇(측정용): 늘 첫 번째로 가운데 오는 🏹에 멈춘다. 릴 꾸미기는 안 함 */
export const slotgateHabit: Bot<GState> = {
  name: '버릇: 늘 🏹',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'deco') return s.t - s.decoT > 30 ? at(0.5, START_Y) : NO;
    if (s.phase !== 'play' && s.phase !== 'gap') return NO;
    const i = s.reels.findIndex((r) => r.st === 0);
    if (i < 0 || s.payAt >= 0 || s.reels[i].boost > s.t) return NO;
    const r = s.reels[i], sel = selOf(r);
    return symOf(r, sel) === ARROW && r.p + SEL - sel < 0.8 ? pressReel(i) : NO;
  },
};
/** 독립 버릇 봇: 첫 릴은 바로 멈추고, 나머지는 첫 릴과 같은 그림(또는 🍀)이 오면 멈춘다 */
export const slotgateHabit2: Bot<GState> = {
  name: '버릇: 첫 릴 따라 셋',
  act(s) {
    if (s.down) return NO;
    if (s.phase === 'deco') return s.t - s.decoT > 30 ? at(0.5, START_Y) : NO;
    if (s.phase !== 'play' && s.phase !== 'gap') return NO;
    const i = s.reels.findIndex((r) => r.st === 0);
    if (i < 0 || s.payAt >= 0 || s.reels[i].boost > s.t) return NO;
    if (i === 0) return pressReel(0);
    const r = s.reels[i], x = symOf(r, selOf(r)), f = s.res[0];
    return f === CLOVER || x === f || x === CLOVER ? (r.p + SEL - selOf(r) < 0.8 ? pressReel(i) : NO) : NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 화면 아무 데나 톡 */
export const slotgateRandom: Bot<GState> = {
  name: '아무 때나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 20 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    m.p = { x: rng(), y: rng() };
    return { tap: false, dir: 0, pointer: m.p };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - cl01(q), 2.4);
const backOut = (q: number) => {
  q = cl01(q);
  return 1 + 2.9 * Math.pow(q - 1, 3) + 1.9 * Math.pow(q - 1, 2);
};
/** 싸움터 원근: 거리 d(0 성문 ~ 1 저 멀리) → 화면 y · 크기 · 길 반폭 */
const fyD = (d: number) => FG - (FG - FT) * d;
const fsD = (d: number) => 1 - 0.38 * d;
const fhw = (d: number) => 0.37 - 0.2 * d;
const fxL = (lx: number, d: number) => 0.5 + lx * fhw(d);
const MON_EMOJI = ['🟢', '🐭', '🪲', '🦇', '👹'];
const SYM_COL = ['#ffd36b', '#ff8a5b', '#e8a46a', '#8fe3ff', '#ffe066', '#7dff9a'];
type P = (v: number) => number;
interface Ctx2 { ctx: CanvasRenderingContext2D; X: P; Y: P; R: P; w: number; h: number; t: number }

function emoji(c: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) {
  c.fillStyle = '#ffffff';
  c.font = `${Math.max(10, size)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(e, x, y);
}
function text(c: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, col: string, align: CanvasTextAlign = 'center', wgt = 800, stroke = '') {
  c.font = `${wgt} ${Math.max(12, size)}px system-ui, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  if (stroke) {
    c.lineWidth = Math.max(2.5, size * 0.16);
    c.lineJoin = 'round';
    c.strokeStyle = stroke;
    c.strokeText(s, x, y);
  }
  c.fillStyle = col;
  c.fillText(s, x, y);
}
function rr(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

// ── 하늘·들판·길 ──
function drawWorld(G: Ctx2) {
  const { ctx, X, Y, R, w, t } = G;
  const sky = ctx.createLinearGradient(0, 0, 0, Y(FT + 0.03));
  sky.addColorStop(0, '#3a2b62');
  sky.addColorStop(0.55, '#a8578a');
  sky.addColorStop(1, '#ffb47a');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, Y(FT + 0.05) + 10);
  // 해
  const sun = ctx.createRadialGradient(X(0.72), Y(FT - 0.01), R(0.01), X(0.72), Y(FT - 0.01), R(0.2));
  sun.addColorStop(0, 'rgba(255,240,190,.95)');
  sun.addColorStop(0.25, 'rgba(255,200,140,.55)');
  sun.addColorStop(1, 'rgba(255,170,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(FT + 0.05));
  // 별
  for (let k = 0; k < 14; k++) {
    ctx.fillStyle = `rgba(255,250,230,${0.25 + 0.35 * Math.abs(Math.sin(t / 50 + k * 1.7))})`;
    ctx.fillRect(X(hsh(k + 40)), Y(0.07 + hsh(k + 60) * 0.07), 1.6, 1.6);
  }
  // 구름
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 9) + t * 0.00006 * (1 + k * 0.3)) % 1.3) - 0.15, cy = 0.1 + k * 0.022;
    ctx.fillStyle = 'rgba(255,210,220,.28)';
    for (let j = 0; j < 4; j++) (ctx.beginPath(), ctx.ellipse(X(cx + j * 0.035), Y(cy - (j % 2) * 0.008), R(0.035), R(0.014), 0, 0, TAU), ctx.fill());
  }
  // 먼 산
  const hill = (base: number, amp: number, col: string, f: number) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, Y(FT + 0.04));
    for (let x = 0; x <= 1.001; x += 0.04) ctx.lineTo(X(x), Y(base - amp * (0.5 + 0.5 * Math.sin(x * f + base * 40)) - amp * 0.4 * Math.sin(x * f * 2.3)));
    ctx.lineTo(w, Y(FT + 0.04));
    ctx.fill();
  };
  hill(FT - 0.005, 0.045, '#6d4b84', 7);
  hill(FT + 0.012, 0.03, '#4f6f5a', 11);
  // 들판
  const gr = ctx.createLinearGradient(0, Y(FT), 0, Y(FG + 0.02));
  gr.addColorStop(0, '#4f8a55');
  gr.addColorStop(0.5, '#69a95b');
  gr.addColorStop(1, '#7fc068');
  ctx.fillStyle = gr;
  ctx.fillRect(0, Y(FT + 0.008), w, Y(FG - FT + 0.04));
  // 몬스터가 나오는 어두운 숲 동굴
  {
    const cx = X(0.5), cy = Y(FT + 0.006);
    ctx.fillStyle = '#2d3f34';
    for (let k = -4; k <= 4; k++) {
      if (Math.abs(k) < 1) continue;
      const tx = cx + k * R(0.045), th = R(0.05 + hsh(k + 3) * 0.03);
      ctx.beginPath();
      ctx.moveTo(tx - R(0.025), cy + R(0.01));
      ctx.lineTo(tx, cy - th);
      ctx.lineTo(tx + R(0.025), cy + R(0.01));
      ctx.fill();
    }
    ctx.fillStyle = '#1b1422';
    ctx.beginPath();
    ctx.ellipse(cx, cy, R(0.06), R(0.035), 0, Math.PI, TAU);
    ctx.fill();
    for (let k = 0; k < 2; k++) {
      const blink = Math.sin(t / 37 + k * 2) > 0.92 ? 0.2 : 1;
      ctx.fillStyle = '#ffdf6b';
      ctx.beginPath();
      ctx.ellipse(cx + R(-0.02 + k * 0.04), cy - R(0.012), R(0.006), R(0.006) * blink, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 길 (원근 사다리꼴 + 돌 무늬)
  ctx.fillStyle = '#c9a77a';
  ctx.beginPath();
  ctx.moveTo(X(0.5 - fhw(1) - 0.02), Y(FT));
  ctx.lineTo(X(0.5 + fhw(1) + 0.02), Y(FT));
  ctx.lineTo(X(0.5 + fhw(0) + 0.03), Y(FG + 0.02));
  ctx.lineTo(X(0.5 - fhw(0) - 0.03), Y(FG + 0.02));
  ctx.fill();
  const road = ctx.createLinearGradient(0, Y(FT), 0, Y(FG));
  road.addColorStop(0, '#d8b98c');
  road.addColorStop(1, '#ecd2a6');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(X(0.5 - fhw(1)), Y(FT));
  ctx.lineTo(X(0.5 + fhw(1)), Y(FT));
  ctx.lineTo(X(0.5 + fhw(0)), Y(FG + 0.02));
  ctx.lineTo(X(0.5 - fhw(0)), Y(FG + 0.02));
  ctx.fill();
  // 돌길 줄
  ctx.strokeStyle = 'rgba(140,100,60,.22)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 16; k++) {
    const d = Math.pow(k / 16, 1.1);
    const y = Y(fyD(d));
    ctx.beginPath();
    ctx.moveTo(X(0.5 - fhw(d)), y);
    ctx.lineTo(X(0.5 + fhw(d)), y);
    ctx.stroke();
    const n = 5 + Math.round((1 - d) * 4), off = k % 2 ? 0.5 : 0;
    for (let j = 0; j < n; j++) {
      const lx = -1 + ((j + off) / n) * 2, d2 = Math.pow((k + 1) / 16, 1.1);
      ctx.beginPath();
      ctx.moveTo(X(fxL(lx, d)), y);
      ctx.lineTo(X(fxL(lx, d2)), Y(fyD(d2)));
      ctx.stroke();
    }
  }
  // 길가 풀·꽃·덤불 (멀수록 작게)
  for (let k = 0; k < 34; k++) {
    const d = hsh(k + 100), side = k % 2 ? 1 : -1, off = 0.06 + hsh(k + 200) * 0.18;
    const x = 0.5 + side * (fhw(d) + off * fsD(d) + 0.02), y = fyD(d), sc = fsD(d);
    if (x < -0.02 || x > 1.02) continue;
    if (k % 5 === 0) {
      // 덤불
      ctx.fillStyle = 'rgba(0,0,0,.18)';
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), R(0.04 * sc), R(0.012 * sc), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3f8a48';
      for (let j = 0; j < 3; j++) (ctx.beginPath(), ctx.arc(X(x + (j - 1) * 0.022 * sc), Y(y - 0.02 * sc - (j === 1 ? 0.01 * sc : 0)), R(0.022 * sc), 0, TAU), ctx.fill());
      ctx.fillStyle = 'rgba(190,255,170,.35)';
      ctx.beginPath();
      ctx.arc(X(x - 0.01 * sc), Y(y - 0.035 * sc), R(0.01 * sc), 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = '#3d7d45';
      ctx.lineWidth = Math.max(1, R(0.004 * sc));
      for (let j = -1; j <= 1; j++) {
        ctx.beginPath();
        ctx.moveTo(X(x + j * 0.006 * sc), Y(y));
        ctx.lineTo(X(x + j * 0.012 * sc + 0.003 * Math.sin(t / 40 + k)), Y(y - 0.022 * sc));
        ctx.stroke();
      }
      if (k % 3 === 1) {
        ctx.fillStyle = ['#ffe36b', '#ff9ec7', '#ffffff'][k % 3];
        ctx.beginPath();
        ctx.arc(X(x), Y(y - 0.024 * sc), R(0.006 * sc), 0, TAU);
        ctx.fill();
      }
    }
  }
  // 길가 등불
  for (const d of [0.2, 0.5, 0.8]) for (const side of [-1, 1]) {
    const x = 0.5 + side * (fhw(d) + 0.035 * fsD(d)), y = fyD(d), sc = fsD(d);
    ctx.strokeStyle = '#4a3a3a';
    ctx.lineWidth = Math.max(1.5, R(0.006 * sc));
    ctx.beginPath();
    ctx.moveTo(X(x), Y(y));
    ctx.lineTo(X(x), Y(y - 0.06 * sc));
    ctx.stroke();
    const fl = 0.8 + 0.2 * Math.sin(t / 7 + d * 9 + side);
    const gl = ctx.createRadialGradient(X(x), Y(y - 0.065 * sc), 0, X(x), Y(y - 0.065 * sc), R(0.05 * sc));
    gl.addColorStop(0, `rgba(255,220,130,${0.55 * fl})`);
    gl.addColorStop(1, 'rgba(255,200,100,0)');
    ctx.fillStyle = gl;
    ctx.beginPath();
    ctx.arc(X(x), Y(y - 0.065 * sc), R(0.05 * sc), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe9a6';
    rr(ctx, X(x - 0.008 * sc), Y(y - 0.075 * sc), R(0.016 * sc), R(0.02 * sc), 2);
    ctx.fill();
  }
}

// ── 몬스터 ──
function monPos(W: World, m: Mon): { x: number; y: number; air: number } {
  const air = m.k === BAT && !(m.frz > W.t) ? 0.075 * fsD(m.d) + 0.008 * Math.sin(W.t * 0.2 + m.ph) : 0;
  return { x: fxL(m.lx, m.d), y: fyD(m.d), air };
}
function drawMon(G: Ctx2, W: World, m: Mon, mini = false, mx = 0, my = 0, msc = 1) {
  const { ctx, X, Y, R } = G, t = W.t;
  const df = MD[m.k];
  let { x, y, air } = mini ? { x: mx, y: my, air: 0 } : monPos(W, m);
  const sc = mini ? msc : fsD(m.d);
  const u = R(df.r * sc);
  const frozen = !mini && m.frz > t;
  const dead = !mini && m.out > 0;
  let rot = 0, alpha = 1, lift = 0, dx = 0;
  if (dead) {
    const a = t - m.out - 8;
    if (a > 42) return;
    if (a >= 0) {
      if (m.how === 9) (lift = a * 0.004), (dx = a * 0.002 * (m.lx > 0 ? 1 : -1)), (rot = a * 0.25), (alpha = 1 - a / 42);
      else if (m.how === 2) (lift = 0.12 * Math.sin(Math.min(1, a / 30) * Math.PI) + a * 0.001), (dx = (m.lx >= 0 ? 1 : -1) * a * 0.0022), (rot = a * 0.35), (alpha = 1 - Math.max(0, a - 26) / 16);
      else (lift = 0.04 * Math.abs(Math.sin(a * 0.16)) * (1 - a / 42)), (dx = (m.lx >= 0 ? 1 : -1) * a * 0.0012), (y -= a * 0.0022), (rot = a * 0.3 * (m.lx >= 0 ? 1 : -1)), (alpha = 1 - Math.max(0, a - 28) / 14);
    }
  }
  const gx = X(x + dx), gy = Y(y);
  // 그림자 (날면 땅에 따로)
  if (!mini) {
    ctx.globalAlpha = 0.28 * alpha * (air ? 0.7 : 1);
    ctx.fillStyle = '#1e2a14';
    ctx.beginPath();
    ctx.ellipse(gx, gy, u * (air ? 0.7 : 1.05), u * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = alpha;
  ctx.save();
  ctx.translate(gx, gy - R(air + lift));
  ctx.rotate(rot + (frozen ? 0.18 * Math.sin(m.id) : 0));
  // 성문 박치기: 앞으로 쿵
  const lastBash = m.gate ? m.bashAt - df.bash : -99;
  if (!mini && m.gate && !dead && t - lastBash < 14 && t >= lastBash) ctx.translate(0, -u * 0.35 * Math.sin(((t - lastBash) / 14) * Math.PI) * -1);
  const walk = mini || frozen || dead ? 0 : Math.sin(t * 0.22 + m.ph * 3);
  const face = frozen ? 'frozen' : dead ? 'ouch' : t - m.hitT < 12 ? 'ouch' : m.gate ? 'angry' : 'walk';
  if (m.k === JELLY) drawJelly(ctx, u, walk, face, t);
  else if (m.k === MOUSE) drawMouse(ctx, u, walk, face, t, m.id);
  else if (m.k === BEETLE) drawBeetle(ctx, u, walk, face, t, m.hp);
  else if (m.k === BAT) drawBat(ctx, u, face, t + m.ph * 20);
  else drawBoss(ctx, u, walk, face, t);
  // 맞은 순간 하얗게
  if (!mini && t - m.hitT < 6 && !dead) {
    ctx.globalAlpha = 0.55 * (1 - (t - m.hitT) / 6);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.8, u * 1.05, u * 0.9, 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = alpha;
  }
  // 얼음 상자
  if (frozen) {
    const fl = Math.min(1, (m.frz - t) / 40);
    ctx.globalAlpha = 0.5 * fl + 0.15;
    const ig = ctx.createLinearGradient(-u, -u * 2, u, 0);
    ig.addColorStop(0, '#e8fbff');
    ig.addColorStop(1, '#7fd3f2');
    ctx.fillStyle = ig;
    rr(ctx, -u * 1.25, -u * 2.05, u * 2.5, u * 2.2, u * 0.35);
    ctx.fill();
    ctx.globalAlpha = 0.9 * fl;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, u * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-u * 0.9, -u * 1.7);
    ctx.lineTo(-u * 0.4, -u * 1.85);
    ctx.moveTo(-u * 0.95, -u * 1.35);
    ctx.lineTo(-u * 0.75, -u * 1.42);
    ctx.stroke();
    ctx.globalAlpha = alpha;
  }
  ctx.restore();
  // 체력 점
  if (!mini && !dead && df.hp > 1) {
    const n = m.k === BOSS ? 0 : df.hp, top = gy - R(air) - u * 2.2;
    if (m.k === BOSS) {
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      rr(ctx, gx - u * 1.1, top - u * 0.3, u * 2.2, Math.max(4, u * 0.18), 3);
      ctx.fill();
      ctx.fillStyle = '#ff5a6a';
      rr(ctx, gx - u * 1.1, top - u * 0.3, (u * 2.2 * m.hp) / df.hp, Math.max(4, u * 0.18), 3);
      ctx.fill();
    }
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = k < m.hp ? (m.k === BEETLE ? '#9fb4ff' : '#ff6b7a') : 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.arc(gx + (k - (n - 1) / 2) * Math.max(4.5, u * 0.42), top, Math.max(2, u * 0.15), 0, TAU);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
function eyes(c: CanvasRenderingContext2D, u: number, ex: number, ey: number, er: number, face: string, t: number) {
  if (face === 'frozen') {
    // 웃긴 얼음 자세: 눈 동그랗게 위로, 혀 쏙
    for (const sx of [-1, 1]) {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(sx * ex, ey, er * 1.35, 0, TAU);
      c.fill();
      c.fillStyle = '#222';
      c.beginPath();
      c.arc(sx * ex + sx * er * 0.3, ey - er * 0.5, er * 0.5, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#ff7aa2';
    c.beginPath();
    c.ellipse(er * 0.6, ey + er * 2.1, er * 0.55, er * 0.9, 0.3, 0, TAU);
    c.fill();
    return;
  }
  if (face === 'ouch') {
    c.strokeStyle = '#222';
    c.lineWidth = Math.max(1.2, er * 0.5);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * ex - er, ey - er);
      c.lineTo(sx * ex + er, ey + er);
      c.moveTo(sx * ex + er, ey - er);
      c.lineTo(sx * ex - er, ey + er);
      c.stroke();
    }
    return;
  }
  const blink = Math.sin(t / 23 + ex * 50) > 0.96;
  for (const sx of [-1, 1]) {
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.ellipse(sx * ex, ey, er, blink ? er * 0.2 : er * 1.1, 0, 0, TAU);
    c.fill();
    if (!blink) {
      c.fillStyle = '#1d1726';
      c.beginPath();
      c.arc(sx * ex, ey + er * 0.25, er * 0.6, 0, TAU);
      c.fill();
    }
  }
  if (face === 'angry') {
    c.strokeStyle = '#1d1726';
    c.lineWidth = Math.max(1.2, er * 0.45);
    for (const sx of [-1, 1]) {
      c.beginPath();
      c.moveTo(sx * (ex + er), ey - er * 1.4);
      c.lineTo(sx * (ex - er * 0.6), ey - er * 0.8);
      c.stroke();
    }
  }
  void u;
}
function drawJelly(c: CanvasRenderingContext2D, u: number, walk: number, face: string, t: number) {
  const sq = 1 + walk * 0.09;
  const g = c.createRadialGradient(-u * 0.35, -u * 1.15, u * 0.1, 0, -u * 0.6, u * 1.2);
  g.addColorStop(0, '#d6ffbf');
  g.addColorStop(0.45, '#5fd47a');
  g.addColorStop(1, '#2b9a58');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-u * 1.0 / sq, 0);
  c.bezierCurveTo(-u * 1.1 / sq, -u * 1.5 * sq, u * 1.1 / sq, -u * 1.5 * sq, u * 1.0 / sq, 0);
  c.quadraticCurveTo(0, u * 0.18, -u * 1.0 / sq, 0);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,.6)';
  c.beginPath();
  c.ellipse(-u * 0.38, -u * 0.95 * sq, u * 0.2, u * 0.13, -0.5, 0, TAU);
  c.fill();
  eyes(c, u, u * 0.3, -u * 0.62 * sq, u * 0.15, face, t);
  if (face === 'walk') {
    c.strokeStyle = '#1d4a2c';
    c.lineWidth = Math.max(1, u * 0.08);
    c.beginPath();
    c.arc(0, -u * 0.38 * sq, u * 0.13, 0.2, Math.PI - 0.2);
    c.stroke();
  }
}
function drawMouse(c: CanvasRenderingContext2D, u: number, walk: number, face: string, t: number, id: number) {
  // 꼬리
  c.strokeStyle = '#d9a3b0';
  c.lineWidth = Math.max(1, u * 0.12);
  c.beginPath();
  c.moveTo(u * 0.5, -u * 0.4);
  c.quadraticCurveTo(u * 1.3, -u * 0.6 + walk * u * 0.3, u * 1.1, -u * 1.3);
  c.stroke();
  // 발
  c.fillStyle = '#f2b8c6';
  for (const sx of [-1, 1]) (c.beginPath(), c.ellipse(sx * u * 0.4, -u * 0.05 + (sx * walk > 0 ? -u * 0.1 : 0), u * 0.2, u * 0.12, 0, 0, TAU), c.fill());
  const g = c.createRadialGradient(-u * 0.3, -u * 0.9, u * 0.1, 0, -u * 0.55, u * 1.0);
  g.addColorStop(0, '#f3eef6');
  g.addColorStop(0.6, '#b5abc0');
  g.addColorStop(1, '#857a93');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, -u * 0.6, u * 0.8, u * 0.62, 0, 0, TAU);
  c.fill();
  // 귀
  for (const sx of [-1, 1]) {
    c.fillStyle = '#a59bb2';
    c.beginPath();
    c.arc(sx * u * 0.55, -u * 1.15, u * 0.36, 0, TAU);
    c.fill();
    c.fillStyle = '#f7b6c8';
    c.beginPath();
    c.arc(sx * u * 0.55, -u * 1.15, u * 0.2, 0, TAU);
    c.fill();
  }
  // 도둑 두건
  c.fillStyle = id % 3 === 0 ? '#e2484f' : id % 3 === 1 ? '#3b6fd6' : '#f0a020';
  c.beginPath();
  c.ellipse(0, -u * 0.98, u * 0.62, u * 0.2, 0, Math.PI, TAU);
  c.fill();
  eyes(c, u, u * 0.26, -u * 0.68, u * 0.13, face, t);
  c.fillStyle = '#ff7f9f';
  c.beginPath();
  c.arc(0, -u * 0.45, u * 0.1, 0, TAU);
  c.fill();
}
function drawBeetle(c: CanvasRenderingContext2D, u: number, walk: number, face: string, t: number, hp: number) {
  c.strokeStyle = '#1d1a33';
  c.lineWidth = Math.max(1, u * 0.1);
  for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.5, -u * (0.3 + k * 0.25));
    c.lineTo(sx * u * (1.05 + 0.1 * Math.sin(t * 0.3 + k + sx)), -u * (0.1 + k * 0.3) + walk * u * 0.08);
    c.stroke();
  }
  const g = c.createRadialGradient(-u * 0.35, -u * 1.0, u * 0.1, 0, -u * 0.6, u * 1.1);
  g.addColorStop(0, '#c7d0ff');
  g.addColorStop(0.35, '#5b68c9');
  g.addColorStop(1, '#262a66');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, -u * 0.72, u * 0.9, u * 0.7, 0, 0, TAU);
  c.fill();
  c.strokeStyle = 'rgba(20,20,60,.6)';
  c.lineWidth = Math.max(1, u * 0.07);
  c.beginPath();
  c.moveTo(0, -u * 1.38);
  c.lineTo(0, -u * 0.25);
  c.stroke();
  // 갑옷 반짝
  const sh = (t * 0.02) % 2.5;
  if (sh < 1) {
    c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - sh)})`;
    c.lineWidth = Math.max(1.5, u * 0.12);
    c.beginPath();
    c.moveTo(-u * 0.6 + sh * u, -u * 1.2);
    c.lineTo(-u * 0.9 + sh * u, -u * 0.6);
    c.stroke();
  }
  // 투구 머리 + 뿔
  c.fillStyle = '#3a3f7a';
  c.beginPath();
  c.ellipse(0, -u * 0.32, u * 0.52, u * 0.36, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#e8e2ff';
  c.beginPath();
  c.moveTo(-u * 0.1, -u * 0.5);
  c.lineTo(0, -u * 0.95);
  c.lineTo(u * 0.1, -u * 0.5);
  c.fill();
  eyes(c, u, u * 0.22, -u * 0.3, u * 0.12, face, t);
  // 금 간 갑옷 (체력이 줄면)
  if (hp < 3) {
    c.strokeStyle = 'rgba(255,255,255,.75)';
    c.lineWidth = Math.max(1, u * 0.07);
    c.beginPath();
    c.moveTo(u * 0.3, -u * 1.25);
    c.lineTo(u * 0.45, -u * 0.95);
    c.lineTo(u * 0.3, -u * 0.75);
    c.stroke();
  }
}
function drawBat(c: CanvasRenderingContext2D, u: number, face: string, t: number) {
  const fl = face === 'frozen' ? 0.2 : Math.sin(t * 0.45);
  c.fillStyle = '#5a3a86';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.4, -u * 0.8);
    c.lineTo(sx * u * 1.7, -u * (1.25 + fl * 0.55));
    c.lineTo(sx * u * 1.45, -u * (0.75 + fl * 0.2));
    c.lineTo(sx * u * 1.15, -u * (0.85 + fl * 0.3));
    c.lineTo(sx * u * 0.95, -u * (0.55 + fl * 0.1));
    c.lineTo(sx * u * 0.7, -u * 0.6);
    c.closePath();
    c.fill();
  }
  const g = c.createRadialGradient(-u * 0.2, -u * 0.95, u * 0.05, 0, -u * 0.75, u * 0.65);
  g.addColorStop(0, '#b993e8');
  g.addColorStop(1, '#4b2c78');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, -u * 0.75, u * 0.58, 0, TAU);
  c.fill();
  c.fillStyle = '#4b2c78';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.2, -u * 1.2);
    c.lineTo(sx * u * 0.42, -u * 1.55);
    c.lineTo(sx * u * 0.48, -u * 1.08);
    c.fill();
  }
  eyes(c, u, u * 0.22, -u * 0.8, u * 0.15, face, t);
  c.fillStyle = '#ffffff';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.12, -u * 0.48);
    c.lineTo(sx * u * 0.06, -u * 0.32);
    c.lineTo(sx * u * 0.0, -u * 0.48);
    c.fill();
  }
}
function drawBoss(c: CanvasRenderingContext2D, u: number, walk: number, face: string, t: number) {
  // 몽둥이
  c.save();
  c.translate(u * 0.85, -u * 0.9);
  c.rotate(-0.6 + walk * 0.25);
  c.fillStyle = '#8a5a35';
  rr(c, -u * 0.09, -u * 1.0, u * 0.18, u * 1.1, u * 0.08);
  c.fill();
  c.fillStyle = '#6b4226';
  c.beginPath();
  c.ellipse(0, -u * 1.0, u * 0.25, u * 0.35, 0, 0, TAU);
  c.fill();
  c.restore();
  const g = c.createRadialGradient(-u * 0.3, -u * 1.1, u * 0.1, 0, -u * 0.7, u * 1.2);
  g.addColorStop(0, '#d9a8ff');
  g.addColorStop(0.5, '#9a5fd0');
  g.addColorStop(1, '#5b2f86');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-u * 0.9, 0);
  c.bezierCurveTo(-u * 1.15, -u * 1.0, -u * 0.7, -u * 1.65, 0, -u * 1.65);
  c.bezierCurveTo(u * 0.7, -u * 1.65, u * 1.15, -u * 1.0, u * 0.9, 0);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,230,255,.35)';
  c.beginPath();
  c.ellipse(0, -u * 0.55, u * 0.5, u * 0.42, 0, 0, TAU);
  c.fill();
  c.fillStyle = '#fff4d6';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.45, -u * 1.45);
    c.lineTo(sx * u * 0.75, -u * 2.0);
    c.lineTo(sx * u * 0.25, -u * 1.55);
    c.fill();
  }
  // 왕관
  c.fillStyle = '#ffd34a';
  c.beginPath();
  c.moveTo(-u * 0.3, -u * 1.6);
  for (let k = 0; k <= 4; k++) c.lineTo(-u * 0.3 + k * u * 0.15, -u * (k % 2 ? 1.75 : 1.95));
  c.lineTo(u * 0.3, -u * 1.6);
  c.fill();
  eyes(c, u, u * 0.3, -u * 1.05, u * 0.16, face === 'walk' ? 'angry' : face, t);
  c.fillStyle = '#fff4d6';
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.28, -u * 0.62);
    c.lineTo(sx * u * 0.22, -u * 0.85);
    c.lineTo(sx * u * 0.14, -u * 0.62);
    c.fill();
  }
}

// ── 성벽·탑·고양이 ──
function drawCat(c: CanvasRenderingContext2D, x: number, y: number, u: number, fur: string, belly: string, mood: string, t: number, prop: 'bow' | 'bomb', act: number) {
  c.save();
  c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.3)';
  c.beginPath();
  c.ellipse(0, 0, u * 0.9, u * 0.25, 0, 0, TAU);
  c.fill();
  const hop = mood === 'cheer' ? Math.abs(Math.sin(t * 0.25)) * u * 0.5 : 0;
  c.translate(0, -hop);
  // 꼬리
  c.strokeStyle = fur;
  c.lineWidth = u * 0.28;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(u * 0.5, -u * 0.35);
  c.quadraticCurveTo(u * 1.3, -u * 0.6, u * 1.1 + Math.sin(t * 0.08) * u * 0.25, -u * 1.5);
  c.stroke();
  // 몸
  c.fillStyle = fur;
  c.beginPath();
  c.ellipse(0, -u * 0.85, u * 0.72, u * 0.85, 0, 0, TAU);
  c.fill();
  c.fillStyle = belly;
  c.beginPath();
  c.ellipse(0, -u * 0.72, u * 0.42, u * 0.55, 0, 0, TAU);
  c.fill();
  // 팔
  const up = mood === 'cheer', shrug = mood === 'shrug';
  c.strokeStyle = fur;
  c.lineWidth = u * 0.3;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.55, -u * 1.15);
    if (up) c.lineTo(sx * u * 0.95, -u * 2.25);
    else if (shrug) c.lineTo(sx * u * 1.15, -u * 1.35);
    else c.lineTo(sx * u * 0.75, -u * 0.55);
    c.stroke();
  }
  // 무기
  if (!up && !shrug) {
    if (prop === 'bow') {
      c.strokeStyle = '#8a5a35';
      c.lineWidth = u * 0.14;
      c.beginPath();
      c.arc(-u * 0.95, -u * 0.8, u * 0.7, -1.2, 1.2);
      c.stroke();
      c.strokeStyle = '#f0e6d0';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(-u * 0.95 + Math.cos(-1.2) * u * 0.7, -u * 0.8 + Math.sin(-1.2) * u * 0.7);
      c.lineTo(-u * 0.95 + Math.cos(-1.2) * u * 0.7 - act * u * 0.4, -u * 0.8);
      c.lineTo(-u * 0.95 + Math.cos(1.2) * u * 0.7, -u * 0.8 + Math.sin(1.2) * u * 0.7);
      c.stroke();
    } else {
      c.fillStyle = '#2b2b33';
      c.beginPath();
      c.arc(u * 0.95, -u * 0.6 - act * u * 0.8, u * 0.38, 0, TAU);
      c.fill();
      c.strokeStyle = '#c99a5a';
      c.lineWidth = u * 0.1;
      c.beginPath();
      c.moveTo(u * 1.1, -u * 0.95 - act * u * 0.8);
      c.lineTo(u * 1.25, -u * 1.15 - act * u * 0.8);
      c.stroke();
      c.fillStyle = '#ffcf4a';
      c.beginPath();
      c.arc(u * 1.27, -u * 1.18 - act * u * 0.8, u * (0.1 + 0.05 * Math.sin(t)), 0, TAU);
      c.fill();
    }
  }
  // 머리
  const hy = -u * 2.0;
  c.fillStyle = fur;
  for (const sx of [-1, 1]) {
    c.beginPath();
    c.moveTo(sx * u * 0.25, hy - u * 0.5);
    c.lineTo(sx * u * 0.62, hy - u * 0.95);
    c.lineTo(sx * u * 0.72, hy - u * 0.25);
    c.fill();
  }
  c.beginPath();
  c.arc(0, hy, u * 0.75, 0, TAU);
  c.fill();
  c.fillStyle = belly;
  c.beginPath();
  c.ellipse(0, hy + u * 0.3, u * 0.42, u * 0.3, 0, 0, TAU);
  c.fill();
  // 투구
  const hg = c.createLinearGradient(-u * 0.7, hy - u * 0.9, u * 0.7, hy - u * 0.3);
  hg.addColorStop(0, '#f4f6fb');
  hg.addColorStop(1, '#8e97ad');
  c.fillStyle = hg;
  c.beginPath();
  c.ellipse(0, hy - u * 0.38, u * 0.72, u * 0.45, 0, Math.PI, TAU);
  c.fill();
  c.fillStyle = '#e2484f';
  c.beginPath();
  c.ellipse(0, hy - u * 0.95, u * 0.14, u * 0.3, 0.2 * Math.sin(t * 0.1), 0, TAU);
  c.fill();
  // 얼굴
  const ey = hy + u * 0.02, ex = u * 0.3, er = u * 0.13;
  c.strokeStyle = '#2a1d22';
  c.fillStyle = '#2a1d22';
  c.lineWidth = Math.max(1.2, u * 0.1);
  if (mood === 'cheer' || mood === 'happy') {
    for (const sx of [-1, 1]) (c.beginPath(), c.arc(sx * ex, ey + er * 0.4, er, Math.PI + 0.3, TAU - 0.3), c.stroke());
  } else if (mood === 'dizzy') {
    for (const sx of [-1, 1]) {
      c.beginPath();
      for (let a = 0; a < 9; a++) c.lineTo(sx * ex + Math.cos(a + t * 0.3) * er * (a / 9) * 1.4, ey + Math.sin(a + t * 0.3) * er * (a / 9) * 1.4);
      c.stroke();
    }
  } else if (mood === 'scared' || mood === 'worry') {
    for (const sx of [-1, 1]) {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(sx * ex, ey, er * 1.3, 0, TAU);
      c.fill();
      c.fillStyle = '#2a1d22';
      c.beginPath();
      c.arc(sx * ex, ey, er * 0.55, 0, TAU);
      c.fill();
    }
    c.fillStyle = '#9fdcff';
    c.beginPath();
    c.ellipse(u * 0.68, hy - u * 0.2 + ((t * 0.3) % 6), u * 0.1, u * 0.16, 0, 0, TAU);
    c.fill();
  } else {
    const blink = Math.sin(t / 31 + x) > 0.95;
    for (const sx of [-1, 1]) (c.beginPath(), c.ellipse(sx * ex, ey, er * 0.8, blink ? er * 0.15 : er, 0, 0, TAU), c.fill());
  }
  c.fillStyle = '#ff8fa8';
  c.beginPath();
  c.arc(0, hy + u * 0.22, u * 0.08, 0, TAU);
  c.fill();
  c.strokeStyle = '#2a1d22';
  c.lineWidth = Math.max(1, u * 0.07);
  c.beginPath();
  if (mood === 'cheer') c.arc(0, hy + u * 0.36, u * 0.16, 0, Math.PI);
  else (c.arc(-u * 0.08, hy + u * 0.3, u * 0.08, 0, Math.PI), c.moveTo(u * 0.16, hy + u * 0.3), c.arc(u * 0.08, hy + u * 0.3, u * 0.08, 0, Math.PI));
  c.stroke();
  if (shrug) text(c, '냥?', u * 0.9, hy - u * 0.9, u * 0.7, '#fff6e0', 'center', 900, 'rgba(0,0,0,.5)');
  c.restore();
}
function drawWall(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, w, t } = G, W = s.W, d = STAGES[s.stage];
  const top = 0.772, face0 = 0.795, face1 = 0.945;
  // 성벽 앞면
  const sg = ctx.createLinearGradient(0, Y(face0), 0, Y(face1));
  sg.addColorStop(0, '#a79cc0');
  sg.addColorStop(1, '#6d6488');
  ctx.fillStyle = sg;
  ctx.fillRect(0, Y(top), w, Y(face1 - top));
  ctx.strokeStyle = 'rgba(40,30,60,.28)';
  ctx.lineWidth = 1;
  for (let r = 0; r < 6; r++) {
    const y = face0 + r * 0.025;
    ctx.beginPath();
    ctx.moveTo(0, Y(y));
    ctx.lineTo(w, Y(y));
    ctx.stroke();
    for (let x = (r % 2) * 0.04; x < 1; x += 0.08) (ctx.beginPath(), ctx.moveTo(X(x), Y(y)), ctx.lineTo(X(x), Y(y + 0.025)), ctx.stroke());
  }
  // 걷는 길(성벽 위)
  ctx.fillStyle = '#c2b8d8';
  ctx.fillRect(0, Y(top), w, Y(face0 - top));
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(0, Y(face0) - 2, w, 3);
  // 성가퀴
  for (let x = 0.0; x < 1; x += 0.09) {
    ctx.fillStyle = '#b4a9cc';
    ctx.fillRect(X(x + 0.012), Y(top - 0.022), X(0.055), Y(0.026));
    ctx.fillStyle = '#d8d0ea';
    ctx.fillRect(X(x + 0.012), Y(top - 0.022), X(0.055), Y(0.006));
    ctx.fillStyle = 'rgba(40,30,60,.3)';
    ctx.fillRect(X(x + 0.062), Y(top - 0.016), X(0.005), Y(0.02));
  }
  // 깃발
  for (const bx of [0.2, 0.8]) {
    ctx.fillStyle = '#6a3fa0';
    ctx.beginPath();
    ctx.moveTo(X(bx - 0.035), Y(face0 + 0.005));
    ctx.lineTo(X(bx + 0.035), Y(face0 + 0.005));
    ctx.lineTo(X(bx + 0.035), Y(face0 + 0.1));
    ctx.lineTo(X(bx), Y(face0 + 0.085 + 0.006 * Math.sin(t / 20 + bx)));
    ctx.lineTo(X(bx - 0.035), Y(face0 + 0.1));
    ctx.fill();
    emoji(ctx, '🐾', X(bx), Y(face0 + 0.045), R(0.036));
  }
  // 성문
  const gx0 = 0.4, gx1 = 0.6, gy0 = 0.85;
  const dmg = 1 - Math.max(0, W.bricks) / MAXB;
  ctx.fillStyle = '#3a2a35';
  ctx.beginPath();
  ctx.moveTo(X(gx0 - 0.012), Y(face1));
  ctx.lineTo(X(gx0 - 0.012), Y(gy0));
  ctx.arc(X(0.5), Y(gy0), X((gx1 - gx0) / 2 + 0.012), Math.PI, TAU);
  ctx.lineTo(X(gx1 + 0.012), Y(face1));
  ctx.fill();
  const shake = s.events.some((e) => e.kind === 'bash' && s.t - e.t < 8) ? Math.sin(t * 2) * 1.5 : 0;
  for (const side of [0, 1]) {
    const x0 = side ? 0.5 : gx0, x1 = side ? gx1 : 0.5;
    const dg = ctx.createLinearGradient(X(x0), 0, X(x1), 0);
    dg.addColorStop(0, '#9a6638');
    dg.addColorStop(1, '#7a4c28');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(X(x0) + shake, Y(face1));
    ctx.lineTo(X(x0) + shake, Y(gy0));
    ctx.arc(X(0.5) + shake, Y(gy0), X((gx1 - gx0) / 2), side ? 1.5 * Math.PI : Math.PI, side ? TAU : 1.5 * Math.PI);
    ctx.lineTo(X(x1) + shake, Y(face1));
    ctx.fill();
    ctx.fillStyle = '#3d3540';
    for (const yy of [0.885, 0.92]) ctx.fillRect(X(x0) + shake, Y(yy), X(x1 - x0), Y(0.008));
  }
  // 금 간 문
  if (dmg > 0.25) {
    ctx.strokeStyle = 'rgba(30,15,10,.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0.46), Y(0.86));
    ctx.lineTo(X(0.48), Y(0.89));
    ctx.lineTo(X(0.455), Y(0.915));
    if (dmg > 0.55) (ctx.moveTo(X(0.54), Y(0.87)), ctx.lineTo(X(0.525), Y(0.9)), ctx.lineTo(X(0.55), Y(0.935)));
    ctx.stroke();
  }
  // 횃불
  for (const tx of [0.355, 0.645]) {
    const fl = 0.75 + 0.25 * Math.sin(t / 5 + tx * 30);
    const gl = ctx.createRadialGradient(X(tx), Y(0.86), 0, X(tx), Y(0.86), R(0.07));
    gl.addColorStop(0, `rgba(255,190,90,${0.5 * fl})`);
    gl.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gl;
    ctx.fillRect(X(tx - 0.07), Y(0.79), X(0.14), R(0.14));
    ctx.fillStyle = '#4a3a3a';
    ctx.fillRect(X(tx - 0.005), Y(0.865), X(0.01), Y(0.03));
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.ellipse(X(tx), Y(0.857), R(0.009), R(0.016 * fl), 0, 0, TAU);
    ctx.fill();
  }
  // 성문 벽돌 (체력) — 줄 하나, ★2 깃발
  const bw = 0.036, bx0 = 0.5 - (MAXB * bw) / 2, by = face0 + 0.012;
  ctx.fillStyle = 'rgba(30,20,40,.55)';
  rr(ctx, X(bx0 - 0.01), Y(by - 0.006), X(MAXB * bw + 0.02), Y(0.032), 5);
  ctx.fill();
  for (let k = 0; k < MAXB; k++) {
    const on = k < W.bricks, x = bx0 + k * bw;
    if (on) {
      const low = W.bricks <= 3;
      ctx.fillStyle = low ? '#ff6a5a' : '#e0884e';
      rr(ctx, X(x + 0.003), Y(by), X(bw - 0.006), Y(0.02), 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,200,.55)';
      ctx.fillRect(X(x + 0.005), Y(by + 0.002), X(bw - 0.012), Y(0.005));
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 1;
      rr(ctx, X(x + 0.004), Y(by + 0.001), X(bw - 0.008), Y(0.018), 2);
      ctx.stroke();
    }
  }
  if (d.nstars >= 2 && s.phase !== 'result') {
    const fxp = bx0 + d.B * bw;
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X(fxp), Y(by - 0.01));
    ctx.lineTo(X(fxp), Y(by + 0.026));
    ctx.stroke();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.moveTo(X(fxp), Y(by - 0.01));
    ctx.lineTo(X(fxp + 0.018), Y(by - 0.004));
    ctx.lineTo(X(fxp), Y(by + 0.002));
    ctx.fill();
  }
}
function drawTowers(G: Ctx2, s: GState) {
  const { ctx, X, Y, R } = G;
  for (const side of [0, 1]) {
    const cx = side ? 0.925 : 0.075, x0 = cx - 0.075;
    const tg = ctx.createLinearGradient(X(x0), 0, X(x0 + 0.15), 0);
    tg.addColorStop(0, side ? '#857aa3' : '#b8aed0');
    tg.addColorStop(1, side ? '#655b80' : '#968bb2');
    ctx.fillStyle = tg;
    ctx.fillRect(X(x0), Y(0.705), X(0.15), Y(0.24));
    ctx.strokeStyle = 'rgba(40,30,60,.25)';
    ctx.lineWidth = 1;
    for (let r = 0; r < 9; r++) (ctx.beginPath(), ctx.moveTo(X(x0), Y(0.73 + r * 0.025)), ctx.lineTo(X(x0 + 0.15), Y(0.73 + r * 0.025)), ctx.stroke());
    ctx.fillStyle = '#d6cde8';
    ctx.fillRect(X(x0 - 0.008), Y(0.695), X(0.166), Y(0.02));
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = '#c5bbdc';
      ctx.fillRect(X(x0 - 0.008 + k * 0.06), Y(0.672), X(0.045), Y(0.025));
    }
    // 창문
    ctx.fillStyle = '#2b2035';
    rr(ctx, X(cx - 0.018), Y(0.77), X(0.036), Y(0.05), 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,120,.65)';
    rr(ctx, X(cx - 0.013), Y(0.78), X(0.026), Y(0.035), 4);
    ctx.fill();
  }
  // 고양이 병사 (왼쪽 궁수 · 오른쪽 폭탄)
  const lastA = s.events.reduce((m, e) => (e.kind === 'arrows' ? Math.max(m, e.t) : m), -99);
  const lastB = s.events.reduce((m, e) => (e.kind === 'bomb' ? Math.max(m, e.t) : m), -99);
  const actA = s.t - lastA < 12 ? 1 - (s.t - lastA) / 12 : 0, actB = s.t - lastB < 12 ? 1 - (s.t - lastB) / 12 : 0;
  const mood = s.mood === 'scared' && s.t - s.moodT > 40 ? 'worry' : s.mood;
  drawCat(ctx, X(0.075), Y(0.7), R(0.034), '#f2a24a', '#ffe2b8', mood, s.t, 'bow', actA);
  drawCat(ctx, X(0.925), Y(0.7), R(0.034), '#9aa3b5', '#eef1f6', mood === 'shrug' ? 'idle' : mood, s.t + 40, 'bomb', actB);
}

// ── 슬롯 머신 ──
const CAB_X0 = 0.035, CAB_X1 = 0.905, CAB_Y0 = 0.95, CAB_Y1 = 1.312, LEG_Y = 1.272;
function reelVisP(s: GState, r: Reel): number {
  if (r.st === 1) {
    const q = (s.t - r.t0) / STOP_T;
    return r.p0 + (r.k - r.p0) * backOut(q);
  }
  return r.st === 0 ? r.p : r.k;
}
function drawMachine(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, t } = G;
  const jackAge = s.lastOut && s.lastOut.n === 3 ? s.t - s.stopAt : 999;
  // 그림자 + 몸통
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, X(CAB_X0 + 0.01), Y(CAB_Y0 + 0.012), X(CAB_X1 - CAB_X0), Y(CAB_Y1 - CAB_Y0), R(0.035));
  ctx.fill();
  const cg = ctx.createLinearGradient(0, Y(CAB_Y0), 0, Y(CAB_Y1));
  cg.addColorStop(0, '#ef4a5f');
  cg.addColorStop(0.5, '#c82843');
  cg.addColorStop(1, '#8f1a33');
  ctx.fillStyle = cg;
  rr(ctx, X(CAB_X0), Y(CAB_Y0), X(CAB_X1 - CAB_X0), Y(CAB_Y1 - CAB_Y0), R(0.035));
  ctx.fill();
  ctx.strokeStyle = '#ffd36b';
  ctx.lineWidth = 3;
  ctx.stroke();
  // 전구
  const per = (CAB_X1 - CAB_X0) * 2 + (CAB_Y1 - CAB_Y0) * 2, nb = 30;
  for (let k = 0; k < nb; k++) {
    let q = (k / nb) * per, bx: number, by: number;
    const wd = CAB_X1 - CAB_X0, ht = CAB_Y1 - CAB_Y0;
    if (q < wd) (bx = CAB_X0 + q), (by = CAB_Y0);
    else if ((q -= wd) < ht) (bx = CAB_X1), (by = CAB_Y0 + q);
    else if ((q -= ht) < wd) (bx = CAB_X1 - q), (by = CAB_Y1);
    else (q -= wd), (bx = CAB_X0), (by = CAB_Y1 - q);
    const on = jackAge < 90 ? (k + Math.floor(t / 3)) % 3 === 0 : (k + Math.floor(t / 20)) % 2 === 0;
    ctx.fillStyle = on ? (jackAge < 90 ? '#fff6a0' : '#ffe9a0') : '#a8743a';
    ctx.beginPath();
    ctx.arc(X(bx), Y(by), R(on ? 0.0085 : 0.007), 0, TAU);
    ctx.fill();
  }
  // 간판
  ctx.fillStyle = '#3b1530';
  rr(ctx, X(0.24), Y(CAB_Y0 - 0.018), X(0.46), Y(0.036), R(0.018));
  ctx.fill();
  ctx.strokeStyle = '#ffd36b';
  ctx.lineWidth = 2;
  ctx.stroke();
  text(ctx, '🐾 성문 슬롯 🐾', X(0.47), Y(CAB_Y0), R(0.03), '#ffe9a0', 'center', 900);
  // 릴 칸
  ctx.fillStyle = '#2a0f22';
  rr(ctx, X(0.075), Y(REEL_Y0 - 0.008), X(0.79), Y(ROW * 3 + 0.016), R(0.02));
  ctx.fill();
  const nextI = s.phase === 'play' || s.phase === 'gap' ? s.reels.findIndex((r) => r.st === 0) : -1;
  const reach = s.res.length >= 2 && s.reels[2].st === 0 && (s.res[0] === s.res[1] || s.res[0] === CLOVER || s.res[1] === CLOVER) ? (s.res[0] === CLOVER ? s.res[1] : s.res[0]) : -1;
  const out = s.payAt >= 0 && s.out ? s.out : null;
  for (let i = 0; i < 3; i++) {
    const r = s.reels[i], cx = REEL_X(i), x0 = cx - REEL_W / 2;
    ctx.save();
    rr(ctx, X(x0), Y(REEL_Y0), X(REEL_W), Y(ROW * 3), R(0.012));
    ctx.clip();
    const rg = ctx.createLinearGradient(0, Y(REEL_Y0), 0, Y(REEL_Y0 + ROW * 3));
    rg.addColorStop(0, '#b9ad9a');
    rg.addColorStop(0.3, '#fffaf0');
    rg.addColorStop(0.7, '#fffaf0');
    rg.addColorStop(1, '#b9ad9a');
    ctx.fillStyle = rg;
    ctx.fillRect(X(x0), Y(REEL_Y0), X(REEL_W), Y(ROW * 3));
    if (i === 2 && reach >= 0) {
      ctx.fillStyle = `rgba(255,220,90,${0.25 + 0.2 * Math.sin(t * 0.4)})`;
      ctx.fillRect(X(x0), Y(REEL_Y0), X(REEL_W), Y(ROW * 3));
    }
    const p = reelVisP(s, r), fast = r.st === 0 && s.t < r.boost;
    const k0 = Math.floor(p);
    for (let k = k0 - 2; k <= k0 + 2; k++) {
      const yy = PAY_Y + (p - k) * ROW;
      if (yy < REEL_Y0 - ROW || yy > REEL_Y0 + ROW * 4) continue;
      const x = symOf(r, k);
      const won = out && out.n >= 2 && r.st === 2 && k === r.k && (x === out.sym || x === CLOVER || out.sym === CLOVER);
      if (won) {
        ctx.fillStyle = out!.n === 3 ? 'rgba(255,215,80,.6)' : 'rgba(255,235,150,.45)';
        rr(ctx, X(x0 + 0.01), Y(yy - ROW / 2 + 0.005), X(REEL_W - 0.02), Y(ROW - 0.01), R(0.01));
        ctx.fill();
      }
      const pop = r.st === 1 || (r.st === 2 && s.t - r.t0 < STOP_T + 8) ? (k === r.k ? 1 + 0.25 * Math.max(0, 1 - (s.t - r.t0 - STOP_T) / 8) : 1) : won && out!.n === 3 ? 1 + 0.1 * Math.sin(t * 0.4) : 1;
      if (fast) {
        ctx.globalAlpha = 0.45;
        emoji(ctx, SE[x], X(cx), Y(yy), R(0.058));
        ctx.globalAlpha = 0.2;
        emoji(ctx, SE[x], X(cx), Y(yy - 0.03), R(0.058));
        ctx.globalAlpha = 1;
      } else emoji(ctx, SE[x], X(cx), Y(yy), R(0.058) * pop);
    }
    // 원통 그늘
    const sh = ctx.createLinearGradient(0, Y(REEL_Y0), 0, Y(REEL_Y0 + ROW * 3));
    sh.addColorStop(0, 'rgba(40,20,30,.5)');
    sh.addColorStop(0.22, 'rgba(40,20,30,0)');
    sh.addColorStop(0.78, 'rgba(40,20,30,0)');
    sh.addColorStop(1, 'rgba(40,20,30,.5)');
    ctx.fillStyle = sh;
    ctx.fillRect(X(x0), Y(REEL_Y0), X(REEL_W), Y(ROW * 3));
    ctx.restore();
    // 다음에 멈출 릴: 테두리 번쩍
    ctx.lineWidth = i === nextI ? 3 : 1.5;
    ctx.strokeStyle = i === nextI ? `rgba(255,236,140,${0.65 + 0.35 * Math.sin(t * 0.25)})` : 'rgba(255,211,107,.55)';
    rr(ctx, X(x0), Y(REEL_Y0), X(REEL_W), Y(ROW * 3), R(0.012));
    ctx.stroke();
  }
  // 가운데 줄
  ctx.strokeStyle = 'rgba(255,70,90,.75)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(X(0.08), Y(PAY_Y));
  ctx.lineTo(X(0.86), Y(PAY_Y));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#ff4a5f';
  for (const [x, dir] of [[0.075, 1], [0.865, -1]] as const) {
    ctx.beginPath();
    ctx.moveTo(X(x - dir * 0.025), Y(PAY_Y - 0.018));
    ctx.lineTo(X(x + dir * 0.002), Y(PAY_Y));
    ctx.lineTo(X(x - dir * 0.025), Y(PAY_Y + 0.018));
    ctx.fill();
  }
  // 레버
  const lastSpin = Math.max(...s.reels.map((r) => r.boost)) - BOOST_T - 10;
  const la = s.t - lastSpin < 20 ? Math.sin(((s.t - lastSpin) / 20) * Math.PI) : 0;
  const lx = 0.945, ly = 1.13, ang = -Math.PI / 2 + la * 1.4;
  ctx.fillStyle = '#7a1a2a';
  rr(ctx, X(lx - 0.02), Y(ly - 0.02), X(0.04), Y(0.06), 5);
  ctx.fill();
  ctx.strokeStyle = '#d9d9e3';
  ctx.lineWidth = R(0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(X(lx), Y(ly));
  ctx.lineTo(X(lx) + Math.cos(ang) * R(0.12), Y(ly) + Math.sin(ang) * R(0.12));
  ctx.stroke();
  ctx.fillStyle = '#ff3b55';
  ctx.beginPath();
  ctx.arc(X(lx) + Math.cos(ang) * R(0.12), Y(ly) + Math.sin(ang) * R(0.12), R(0.022), 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.arc(X(lx) + Math.cos(ang) * R(0.12) - R(0.007), Y(ly) + Math.sin(ang) * R(0.12) - R(0.007), R(0.007), 0, TAU);
  ctx.fill();
  // 릴 띠 그림 수 (확률이 보이게)
  const cnt = countOf(s.reels[0].strip), L = s.reels[0].strip.length;
  const shown = [0, 1, 2, 3, 4, 5].filter((x) => cnt[x] > 0 || (STAGES[s.stage].deco && x === CLOVER));
  const cw = (CAB_X1 - CAB_X0 - 0.04) / shown.length;
  ctx.fillStyle = 'rgba(40,10,30,.55)';
  rr(ctx, X(CAB_X0 + 0.015), Y(LEG_Y - 0.03), X(CAB_X1 - CAB_X0 - 0.03), Y(0.064), R(0.015));
  ctx.fill();
  shown.forEach((x, j) => {
    const cx = CAB_X0 + 0.02 + cw * (j + 0.5);
    const fx = s.stripFx && s.stripFx.sym === x ? s.t - s.stripFx.t : 999;
    const sc = fx < 30 ? 1 + 0.4 * Math.sin((fx / 30) * Math.PI) : 1;
    if (fx < 60) {
      ctx.fillStyle = s.stripFx!.op > 0 ? 'rgba(140,255,160,.35)' : 'rgba(255,140,140,.35)';
      rr(ctx, X(cx - cw / 2 + 0.004), Y(LEG_Y - 0.028), X(cw - 0.008), Y(0.06), R(0.012));
      ctx.fill();
    }
    emoji(ctx, SE[x], X(cx - cw * 0.2), Y(LEG_Y - 0.008), R(0.032) * sc);
    text(ctx, `×${cnt[x]}`, X(cx + cw * 0.2), Y(LEG_Y - 0.008), R(0.03), cnt[x] ? '#fff2c8' : 'rgba(255,255,255,.4)', 'center', 900);
    text(ctx, SWORD[x], X(cx), Y(LEG_Y + 0.02), R(0.024), 'rgba(255,230,210,.85)', 'center', 700);
  });
  void L;
}

// ── 날아가는 화살·폭탄·얼음·벽돌·동전 ──
function drawShots(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, t } = G, W = s.W;
  const byId = new Map<number, Mon>();
  for (const m of W.mons) byId.set(m.id, m);
  for (const e of s.events) {
    const a = s.t - e.t;
    if (e.kind === 'arrows' && a < 26) {
      (e.ids ?? []).forEach((id, j) => {
        const m = byId.get(id);
        if (!m) return;
        const q = (a - j * 1.2) / 10;
        if (q < 0 || q > 1) return;
        const fx0 = j % 2 ? 0.925 : 0.075, fy0 = 0.64, p = monPos(W, m), tx = p.x, ty = p.y - p.air - 0.03 * fsD(m.d);
        const x = fx0 + (tx - fx0) * q, y = fy0 + (ty - fy0) * q - 0.12 * Math.sin(q * Math.PI);
        const ang = Math.atan2(ty - fy0 + -0.12 * Math.PI * Math.cos(q * Math.PI), tx - fx0);
        ctx.save();
        ctx.translate(X(x), Y(y));
        ctx.rotate(ang);
        ctx.strokeStyle = '#6b4a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-R(0.03), 0);
        ctx.lineTo(R(0.012), 0);
        ctx.stroke();
        ctx.fillStyle = '#d9dde8';
        ctx.beginPath();
        ctx.moveTo(R(0.02), 0);
        ctx.lineTo(R(0.008), -R(0.007));
        ctx.lineTo(R(0.008), R(0.007));
        ctx.fill();
        ctx.fillStyle = '#ff6b7a';
        ctx.fillRect(-R(0.032), -R(0.005), R(0.01), R(0.01));
        ctx.restore();
      });
      // 잭팟: 하늘에서 화살비
      if (e.v === 3 && a < 24) {
        ctx.strokeStyle = 'rgba(90,60,30,.8)';
        ctx.lineWidth = 1.6;
        for (let k = 0; k < 26; k++) {
          const d = hsh(k + e.t), lx = hsh(k * 3 + e.t) * 2 - 1, q = (a - hsh(k + 7) * 10) / 12;
          if (q < 0 || q > 1) continue;
          const x = fxL(lx, d), y = fyD(d) - 0.25 * (1 - q);
          ctx.beginPath();
          ctx.moveTo(X(x - 0.01), Y(y - 0.04));
          ctx.lineTo(X(x), Y(y));
          ctx.stroke();
        }
      }
    }
    if (e.kind === 'bomb' && a < 14) {
      const q = a / 12, fx0 = 0.925, fy0 = 0.62, tx = fxL(e.x, e.y), ty = fyD(e.y) - 0.02;
      if (q <= 1) {
        const x = fx0 + (tx - fx0) * q, y = fy0 + (ty - fy0) * q - 0.2 * Math.sin(q * Math.PI);
        const sz = R(0.022 + 0.008 * (e.v === 3 ? 1 : 0));
        ctx.fillStyle = '#26232c';
        ctx.beginPath();
        ctx.arc(X(x), Y(y), sz, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath();
        ctx.arc(X(x) - sz * 0.35, Y(y) - sz * 0.35, sz * 0.3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffcf4a';
        ctx.beginPath();
        ctx.arc(X(x) + sz * 0.6, Y(y) - sz * 0.9, sz * 0.35 * (0.7 + 0.3 * Math.sin(t)), 0, TAU);
        ctx.fill();
      }
    }
    if (e.kind === 'bomb' && a >= 12 && a < 30) {
      const q = (a - 12) / 18, tx = fxL(e.x, e.y), ty = fyD(e.y);
      ctx.globalAlpha = 1 - q;
      const rad = R(BOMB_R[e.v ?? 2] * 1.25) * (0.4 + 0.6 * ease(q * 2));
      const fg = ctx.createRadialGradient(X(tx), Y(ty), 0, X(tx), Y(ty), rad);
      fg.addColorStop(0, '#fff6c0');
      fg.addColorStop(0.4, '#ffb347');
      fg.addColorStop(1, 'rgba(255,90,60,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.ellipse(X(tx), Y(ty), rad, rad * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.kind === 'ice' && a < 30) {
      const q = a / 22;
      const yy = FG - (FG - FT) * ease(q);
      ctx.globalAlpha = Math.max(0, 1 - q) * 0.55;
      const ig = ctx.createLinearGradient(0, Y(yy - 0.05), 0, Y(yy + 0.05));
      ig.addColorStop(0, 'rgba(200,245,255,0)');
      ig.addColorStop(0.5, '#c8f4ff');
      ig.addColorStop(1, 'rgba(200,245,255,0)');
      ctx.fillStyle = ig;
      ctx.fillRect(0, Y(yy - 0.05), G.w, Y(0.1));
      ctx.globalAlpha = 1;
      for (let k = 0; k < 14; k++) {
        const x = hsh(k + e.t * 3), y = FT + hsh(k + 50) * (FG - FT), qq = (a - k) / 20;
        if (qq < 0 || qq > 1) continue;
        emoji(ctx, '❄️', X(x), Y(y + qq * 0.04), R(0.03) * (1 - qq * 0.5));
      }
    }
    if (e.kind === 'brick' && a < 20 && e.v) {
      for (let k = 0; k < Math.min(5, e.v); k++) {
        const q = (a - k * 2) / 14;
        if (q < 0 || q > 1) continue;
        const x0 = 0.47, y0 = CAB_Y0, x1 = 0.5 - (MAXB * 0.036) / 2 + (s.W.bricks - e.v + k + 0.5) * 0.036, y1 = 0.817;
        emoji(ctx, '🧱', X(x0 + (x1 - x0) * q), Y(y0 + (y1 - y0) * q - 0.12 * Math.sin(q * Math.PI)), R(0.035));
      }
    }
    if (e.kind === 'coin' && a < 40) {
      const n = Math.min(10, (e.v ?? 3) + 2);
      for (let k = 0; k < n; k++) {
        const q = (a - k * 2.2) / 22;
        if (q < 0 || q > 1) continue;
        const x0 = 0.47 + (hsh(k + e.t) - 0.5) * 0.3, y0 = CAB_Y0, x1 = 0.6, y1 = 0.032;
        emoji(ctx, '🪙', X(x0 + (x1 - x0) * ease(q)), Y(y0 + (y1 - y0) * ease(q) - 0.18 * Math.sin(q * Math.PI)), R(0.032));
      }
    }
    if (e.kind === 'spear' && a < 16) {
      const p = byId.get(e.v ?? -1);
      if (p) {
        const px = fxL(p.lx, 0), q = Math.sin((a / 16) * Math.PI);
        ctx.strokeStyle = '#8a5a35';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(X(px + 0.04), Y(0.8));
        ctx.lineTo(X(px + 0.01), Y(0.8 - 0.05 * q));
        ctx.stroke();
        ctx.fillStyle = '#e6e9f2';
        ctx.beginPath();
        ctx.moveTo(X(px + 0.01), Y(0.8 - 0.05 * q - 0.02));
        ctx.lineTo(X(px + 0.002), Y(0.8 - 0.05 * q + 0.004));
        ctx.lineTo(X(px + 0.02), Y(0.8 - 0.05 * q + 0.002));
        ctx.fill();
        emoji(ctx, '🐱', X(px + 0.06), Y(0.79 - 0.02 * q), R(0.04));
      }
    }
  }
}

/** 미리 보기: 멈춘 릴이 가리키는 효과가 싸움터 어디에 닿는지 */
function drawPreview(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, t } = G, W = s.W;
  if (s.payAt >= 0 || !s.res.length || (s.phase !== 'play' && s.phase !== 'gap')) return;
  const stopped = s.res.filter((x) => x !== undefined);
  let sym = stopped[0], n = 1;
  if (stopped.length >= 2) {
    const o = resolve([stopped[0], stopped[1], -9]);
    if (o.n === 2) (sym = o.sym), (n = 2);
    else if (stopped[1] !== CLOVER && stopped[0] !== CLOVER) return;
  }
  if (sym === CLOVER || sym === undefined) return;
  const a = n === 2 ? 0.95 : 0.45, pulse = 0.5 + 0.5 * Math.sin(t * 0.3);
  ctx.globalAlpha = a;
  if (sym === ARROW) {
    const tg = frontOf(W, 3);
    for (const m of tg) {
      const p = monPos(W, m), x = X(p.x), y = Y(p.y - p.air - 0.035 * fsD(m.d));
      ctx.strokeStyle = m.k === BEETLE && !(m.frz > W.t) ? '#9fb4ff' : '#ff4a5f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, R(0.03 + 0.005 * pulse), 0, TAU);
      ctx.moveTo(x - R(0.04), y);
      ctx.lineTo(x + R(0.04), y);
      ctx.moveTo(x, y - R(0.04));
      ctx.lineTo(x, y + R(0.04));
      ctx.stroke();
    }
  } else if (sym === BOMB) {
    const c = bombSpot(W, BOMB_R[2]);
    if (c.n > 0) {
      const x = X(fxL(c.lx, c.d)), y = Y(fyD(c.d)), rad = R(BOMB_R[n === 2 ? 2 : 2] * 1.25 + 0.01 * pulse);
      ctx.strokeStyle = '#ffb347';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(x, y, rad, rad * 0.55, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      emoji(ctx, '💣', x, y - rad * 0.55 - R(0.02), R(0.03));
    }
  } else if (sym === ICE) {
    for (const m of frontOf(W, 3)) {
      const p = monPos(W, m);
      ctx.fillStyle = 'rgba(160,230,255,.45)';
      ctx.beginPath();
      ctx.arc(X(p.x), Y(p.y - p.air - 0.03 * fsD(m.d)), R(0.045 * fsD(m.d) + 0.006 * pulse), 0, TAU);
      ctx.fill();
    }
  } else if (sym === BRICK) {
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    rr(ctx, X(0.31), Y(0.8), X(0.38), Y(0.03), 6);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ── 사건 연출 · 화면 위 글자 ──
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawFx(G: Ctx2, s: GState, th: Theme) {
  const { ctx, X, Y, R, w, t } = G, fx = juice(s), W = s.W;
  const say = (x: number, y: number, txt: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.17), Math.min(Y(1.3), y));
    const dir = y < Y(0.3) ? 1 : -1;
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y += dir * (size + 5);
    y = Math.max(Y(0.17), y);
    rec.push({ x, y, t });
    if (rec.length > 14) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(txt).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, txt, col, size);
  };
  const byId = new Map<number, Mon>();
  for (const m of W.mons) byId.set(m.id, m);
  const DELAY: Record<string, number> = { bomb: 12, bombN: 15, arrows: 10, ting: 10, shatter: 10, brick: 16, coin: 22 };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.t + (DELAY[e.kind] ?? 0);
    if (due <= seenT || due > t) continue;
    const big = R(0.05);
    switch (e.kind) {
      case 'stop': {
        const x = X(e.x), y = Y(PAY_Y);
        fx.burst(x, y, '#ffe9a0', 10, 2.4, 2);
        fx.ring(x, y, '#fff3c0', R(0.08), 3);
        fx.kick(1.6);
        break;
      }
      case 'reach':
        say(X(REEL_X(2)), Y(REEL_Y0 - 0.03), `리치! 하나 더 ${SE[e.v ?? 0]}`, '#ffe066', Math.round(R(0.045)));
        fx.ring(X(REEL_X(2)), Y(PAY_Y), '#ffe066', R(0.14), 4);
        break;
      case 'jackpot':
      case 'rainbow':
        fx.blink(e.kind === 'rainbow' ? '#ffffff' : '#ffe9a0', 0.42);
        fx.kick(8);
        for (let k = 0; k < 3; k++) fx.burst(X(0.25 + k * 0.25), Y(CAB_Y0), ['#ffe066', '#ffb347', '#fff6c0'][k], 26, 6.5, 3.2);
        fx.ring(X(0.47), Y(PAY_Y), '#ffe066', R(0.5), 7);
        break;
      case 'pair':
        say(X(0.47), Y(CAB_Y0 - 0.045), e.text!, SYM_COL[e.v ?? 0], Math.round(R(0.05)));
        fx.ring(X(0.47), Y(PAY_Y), SYM_COL[e.v ?? 0], R(0.25), 4);
        fx.kick(2.5);
        break;
      case 'miss':
        say(X(0.47), Y(CAB_Y0 - 0.045), '꽝! 다음엔 노려서', '#d6d0e0', Math.round(R(0.045)));
        break;
      case 'arrows':
        for (const id of e.ids ?? []) {
          const m = byId.get(id);
          if (!m) continue;
          const p = monPos(W, m);
          fx.burst(X(p.x), Y(p.y - p.air - 0.03), m.k === BEETLE ? '#c7d0ff' : '#ffd0a0', 7, 2.2, 1.8);
        }
        if (e.v === 3) say(w / 2, Y(0.42), '🏹 화살비!', '#ffe066', Math.round(R(0.06)));
        fx.kick(e.v === 3 ? 5 : 2.5);
        break;
      case 'bomb': {
        const x = X(fxL(e.x, e.y)), y = Y(fyD(e.y));
        fx.burst(x, y, '#ffb347', e.v === 3 ? 40 : 22, e.v === 3 ? 6 : 4, 3);
        fx.burst(x, y, '#5a4a40', 14, 3, 3.2);
        fx.ring(x, y, '#ffcf4a', R(BOMB_R[e.v ?? 2] * 1.4), 6);
        fx.kick(e.v === 3 ? 11 : 6);
        if (e.v === 3) fx.blink('#ffcf8a', 0.25);
        say(x, y - R(0.06), e.v === 3 ? '콰광!' : '펑!', '#ffcf4a', Math.round(R(e.v === 3 ? 0.065 : 0.05)));
        break;
      }
      case 'bombN':
        say(X(fxL(e.x, e.y)), Y(fyD(e.y) - 0.1), e.text!, '#fff1a8', Math.round(R(0.05)));
        break;
      case 'ice':
        fx.blink('#c8f4ff', e.v === 3 ? 0.35 : 0.18);
        for (const id of e.ids ?? []) {
          const m = byId.get(id);
          if (!m) continue;
          const p = monPos(W, m);
          fx.burst(X(p.x), Y(p.y - 0.03), '#e8fbff', 8, 2, 2);
        }
        say(w / 2, Y(0.5), e.v === 3 ? '❄️ 꽁꽁!' : '❄️ 얼음!', '#c8f4ff', Math.round(R(0.055)));
        break;
      case 'brick':
        say(X(0.5), Y(0.86), e.text!, '#ffd6a0', Math.round(R(0.045)));
        fx.burst(X(0.5), Y(0.818), '#e0884e', 14, 3, 2.4);
        break;
      case 'coin':
        say(X(0.62), Y(0.2), e.text!, '#ffe066', Math.round(R(0.045)));
        break;
      case 'rainbowFx':
        say(w / 2, Y(0.45), '🌈 모두 펑!', '#ffffff', Math.round(R(0.06)));
        break;
      case 'bash': {
        const x = X(fxL(e.x, 0));
        fx.kick(3.5);
        fx.burst(x, Y(FG), '#d8c8a8', 10, 2.6, 2.6);
        fx.burst(X(0.5 - (MAXB * 0.036) / 2 + (Math.max(0, W.bricks) + 0.5) * 0.036), Y(0.818), '#e0884e', 8, 3, 2.4);
        say(x, Y(FG - 0.05), '쾅!', '#ffb0a0', Math.round(R(0.042)));
        break;
      }
      case 'spear':
        say(X(fxL(e.x, 0) + 0.04), Y(FG - 0.07), '콕!', '#fff3c0', Math.round(R(0.04)));
        break;
      case 'ting': {
        const m = byId.get(e.v ?? -1);
        if (m) {
          const p = monPos(W, m);
          fx.burst(X(p.x), Y(p.y - 0.04), '#ffffff', 6, 2, 1.5);
          say(X(p.x), Y(p.y - 0.08), '팅!', '#c7d0ff', Math.round(R(0.04)));
        }
        break;
      }
      case 'shatter': {
        const m = byId.get(e.v ?? -1);
        if (m) {
          const p = monPos(W, m);
          fx.burst(X(p.x), Y(p.y - 0.03), '#e8fbff', 22, 4.5, 2.6);
          fx.burst(X(p.x), Y(p.y - 0.03), '#9fe0ff', 12, 3, 2);
          fx.kick(4);
          say(X(p.x), Y(p.y - 0.09), '와장창!', '#c8f4ff', Math.round(R(0.05)));
        }
        break;
      }
      case 'wave':
        say(w / 2, Y(0.36), `🌊 ${e.text}`, '#ffffff', Math.round(R(0.055)));
        break;
      case 'waveClear':
        say(w / 2, Y(0.4), e.text!, '#c8ffb0', Math.round(R(0.05)));
        fx.burst(w / 2, Y(0.45), '#c8ffb0', 20, 4, 2.4);
        break;
      case 'win':
        fx.blink('#fff6c8', 0.3);
        for (let k = 0; k < 3; k++) fx.burst(X(0.2 + k * 0.3), Y(0.4), ['#ffe066', '#ff8fb1', '#9fe8ff'][k], 30, 5.5, 3);
        break;
      case 'fail':
        fx.kick(12);
        fx.blink(th.hot, 0.3);
        fx.burst(X(0.5), Y(0.88), '#8a6a50', 30, 5, 3.5);
        break;
      case 'buy':
        fx.burst(X(e.x), Y(e.y), SYM_COL[e.v ?? 0], 24, 4.5, 2.6);
        fx.ring(X(e.x), Y(e.y), '#ffffff', R(0.15), 4);
        say(X(e.x), Y(e.y - 0.15), e.text!, '#fff6c0', Math.round(R(0.045)));
        break;
      case 'poor':
      case 'say':
      case 'wait':
        say(X(e.x), Y(e.y), e.text!, '#ffd0c8', Math.round(R(0.04)));
        break;
    }
    void big;
  }
  fx.memo.t = t;
  // 쓰러진 몬스터: 데굴데굴
  for (const m of W.mons) {
    if (!m.out || m.how === 9) continue;
    const a = t - m.out - 8;
    if (a === 4 && (fx.memo['d' + m.id] ?? 0) === 0) {
      fx.memo['d' + m.id] = 1;
      const p = monPos(W, m);
      fx.burst(X(p.x), Y(p.y - 0.03), m.k === JELLY ? '#8ff0a0' : m.k === MOUSE ? '#e6dcef' : m.k === BAT ? '#c9a8ff' : '#c7d0ff', 10, 2.6, 2.2);
      if (m.id % 3 === 0) say(X(p.x), Y(p.y - 0.08), m.k === BOSS ? '대장이 데굴데굴!' : '데굴~', '#ffffff', Math.round(R(m.k === BOSS ? 0.06 : 0.036)));
    }
  }
}

// ── 위·아래 띠, 카드 ──
function monCounts(gr: Group[]): number[] {
  const c = [0, 0, 0, 0, 0];
  for (const g of gr) c[g.k] += g.n;
  return c;
}
function drawIcons(G: Ctx2, W: World, counts: number[], x0: number, y: number, maxW: number): number {
  const { ctx, X, Y, R } = G;
  let x = x0;
  counts.forEach((n, k) => {
    if (!n || x > x0 + maxW) return;
    const fake = { id: k, k, hp: 1, mx: 1, d: 0, lx: 0, bx: 0, ph: 0, frz: 0, gate: false, bashAt: 0, out: 0, how: 0, hitT: -99, hitN: 0, frzN: 0, sm: 1, dl: 0 } as Mon;
    drawMon(G, W, fake, true, x + 0.022, y + 0.017, (k === BOSS ? 0.026 : 0.024) / MD[k].r);
    text(ctx, `×${n}`, X(x + 0.047), Y(y), R(0.032), '#fff6e0', 'left', 900);
    x += 0.047 + ctx.measureText(`×${n}`).width / G.w + 0.025;
  });
  void Y;
  return x;
}
function drawHud(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, w, t } = G, d = STAGES[s.stage], W = s.W;
  const hb = Y(0.062);
  ctx.fillStyle = 'rgba(28,18,40,.88)';
  ctx.fillRect(0, 0, w, hb);
  text(ctx, `${s.stage + 1}/${STAGES.length}판 ${d.emoji} ${d.name}`, R(0.025), hb * 0.52, R(0.038), '#fff1d6', 'left', 900);
  ctx.font = `900 ${Math.max(12, R(0.038))}px system-ui`;
  let rx = w - R(0.025);
  const hearts = '♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts));
  text(ctx, hearts, rx, hb * 0.52, R(0.038), '#ff6a7a', 'right', 900);
  rx -= ctx.measureText(hearts).width + R(0.03);
  const st = `★${s.stars}`;
  text(ctx, st, rx, hb * 0.52, R(0.038), '#ffd166', 'right', 900);
  rx -= ctx.measureText(st).width + R(0.03);
  if (d.deco) {
    const cs = `${W.coins}`;
    text(ctx, cs, rx, hb * 0.52, R(0.038), '#ffe066', 'right', 900);
    rx -= ctx.measureText(cs).width + R(0.005);
    emoji(ctx, '🪙', rx - R(0.018), hb * 0.52, R(0.034));
  }
  // 예보판
  if (s.phase === 'play' || s.phase === 'gap') {
    const y0 = 0.068, bh = 0.046;
    ctx.fillStyle = 'rgba(70,40,30,.85)';
    rr(ctx, X(0.02), Y(y0), X(0.96), Y(bh), R(0.014));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,150,.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const cur = [0, 0, 0, 0, 0];
    for (let i = W.pi; i < W.pend.length; i++) cur[W.pend[i].k]++;
    for (const m of W.mons) if (!m.out) cur[m.k]++;
    text(ctx, `파도 ${s.wave + 1}/${d.waves.length}`, X(0.04), Y(y0 + bh / 2), R(0.032), '#ffe0b0', 'left', 900);
    const x1 = drawIcons(G, W, cur, 0.215, y0 + bh / 2, 0.36);
    if (s.wave + 1 < d.waves.length) {
      text(ctx, '다음 ▸', X(Math.max(0.56, x1 + 0.01)), Y(y0 + bh / 2), R(0.03), 'rgba(255,224,176,.8)', 'left', 800);
      drawIcons(G, W, monCounts(d.waves[s.wave + 1]), Math.max(0.56, x1 + 0.01) + 0.105, y0 + bh / 2, 0.3);
    }
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20 && s.phase !== 'result') {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    ctx.font = `900 ${Math.max(12, R(fs))}px system-ui`;
    while (ctx.measureText(tx).width > w - R(0.06) && fs > 0.03) ctx.font = `900 ${Math.max(12, R((fs -= 0.001)))}px system-ui`;
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.142) - drop;
    ctx.fillStyle = 'rgba(50,20,60,.92)';
    rr(ctx, w / 2 - tw2 / 2, by2 - R(0.024), tw2, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,224,120,.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, tx, w / 2, by2 + 1, R(fs), '#fff1d6', 'center', 900);
    ctx.globalAlpha = 1;
  }
}
function drawBottom(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, w, h, t } = G, d = STAGES[s.stage], W = s.W;
  const y0 = CAB_Y1 + 0.012;
  ctx.fillStyle = 'rgba(28,18,40,.92)';
  ctx.fillRect(0, Y(y0), w, h - Y(y0));
  // 별 목표 (쉬운 말)
  const ok = s.phase === 'result' && s.ok ? s.starOk : starsNow(s, false);
  const live = [false, d.nstars >= 2 && W.bricks >= d.B, ok[2] || false];
  const fail = [false, d.nstars >= 2 && W.bricks < d.B, d.sp?.kind === 'bat' ? W.batLeak > 0 : d.sp?.kind === 'boss' ? W.bossGate > 0 : false];
  const chip = (k: number, x: number, y: number, cw: number) => {
    const got = s.phase === 'result' && s.ok ? s.starOk[k] : k === 2 && live[2];
    const bad = s.phase !== 'result' && fail[k];
    ctx.fillStyle = got ? 'rgba(255,209,102,.32)' : bad ? 'rgba(0,0,0,.35)' : 'rgba(255,240,210,.12)';
    rr(ctx, X(x), Y(y), X(cw), Y(0.05), R(0.025));
    ctx.fill();
    text(ctx, `${got ? '★' : bad ? '✗' : '☆'} ${starText(d, k)}`, X(x + cw / 2), Y(y + 0.026), R(0.033), bad ? 'rgba(255,255,255,.45)' : got ? '#ffe9a0' : '#fff6e0', 'center', 800);
  };
  if (d.nstars === 1) {
    chip(0, 0.03, y0 + 0.012, 0.42);
    text(ctx, '별은 다음 판부터 하나씩 늘어요', X(0.48), Y(y0 + 0.038), R(0.03), 'rgba(255,240,214,.7)', 'left', 700);
  } else {
    chip(0, 0.03, y0 + 0.012, 0.44);
    chip(1, 0.49, y0 + 0.012, 0.48);
    if (d.nstars >= 3) chip(2, 0.03, y0 + 0.068, 0.94);
  }
  // 안내 한 줄
  let tip = d.tip;
  const i = s.reels.findIndex((r) => r.st === 0);
  if (s.phase === 'deco') tip = '🎨 카드를 톡 → 릴마다 그 그림이 하나씩 늘거나 줄어요';
  else if (s.phase === 'result') tip = s.ok ? '다음 판이 와요!' : '같은 판을 다시 — 이번엔 노려서!';
  else if (s.stage === 0 && s.taps < 3) tip = '👆 아무 데나 톡 — 릴이 왼쪽부터 하나씩 멈춰요';
  else if (s.stage === 0 && s.spins < 3) tip = '👀 위 칸에 다음 그림이 보여요 — 🏹가 가운데 오면 톡!';
  else if (i === 2 && s.res.length >= 2 && (s.res[0] === s.res[1] || s.res[0] === CLOVER || s.res[1] === CLOVER)) tip = `리치! 하나 더 ${SE[s.res[0] === CLOVER ? s.res[1] : s.res[0]]}(또는 🍀)면 잭팟 — 바로 멈춰도 짝은 나와요`;
  else if (W.bricks <= 3 && d.syms[BRICK] > 0) tip = '⚠ 성문이 위험해요 — 🧱를 맞춰 고쳐요!';
  const ty = d.nstars >= 3 ? y0 + 0.148 : y0 + 0.1;
  ctx.font = `800 ${Math.max(12, R(0.033))}px system-ui`;
  let fs = 0.033;
  while (ctx.measureText(tip).width > w - R(0.04) && fs > 0.028) ctx.font = `800 ${Math.max(12, R((fs -= 0.001)))}px system-ui`;
  text(ctx, tip, w / 2, Y(ty), R(fs), 'rgba(255,240,214,.92)', 'center', 800);
  void t;
}

function panel(G: Ctx2, x: number, y: number, pw: number, ph: number, col = 'rgba(40,22,52,.93)') {
  const { ctx, X, Y, R } = G;
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  rr(ctx, X(x) + 3, Y(y) + 5, X(pw), Y(ph), R(0.03));
  ctx.fill();
  ctx.fillStyle = col;
  rr(ctx, X(x), Y(y), X(pw), Y(ph), R(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,120,.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
}
const NEWLINE: Record<string, string> = {
  slot: 'NEW 🎰 톡 = 릴 하나 멈춤 · 같은 그림 셋 = 잭팟',
  bomb: 'NEW 💣 폭탄 — 쥐 떼는 갈수록 흩어져요, 일찍 펑!',
  deco: 'NEW 🎨 파도 사이에 동전으로 릴 꾸미기',
  beetle: 'NEW ❄️ 얼림 — 🪲 갑옷 벌레는 얼린 뒤 🏹로 와장창',
  bat: 'NEW 🦇 박쥐 — 날아서 폭탄이 안 닿아요',
  boss: 'NEW 👹 대장 — 🍀 네잎이 릴에 들어 있어요',
};
function drawCards(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, w, t } = G, d = STAGES[s.stage], W = s.W;
  // 판 시작 카드
  const age = t - s.startCard;
  if ((s.phase === 'play' || s.phase === 'gap') && age < 170) {
    const a = Math.min(1, age / 8, (170 - age) / 20);
    ctx.globalAlpha = a;
    const lines = Math.max(1, d.nstars);
    const ph = 0.2 + lines * 0.045;
    panel(G, 0.07, 0.25, 0.86, ph);
    text(ctx, `${d.emoji} ${s.stage + 1}판 · ${d.name}`, w / 2, Y(0.29), R(0.062), '#fff6d6', 'center', 900, 'rgba(0,0,0,.4)');
    ctx.fillStyle = 'rgba(255,224,102,.18)';
    rr(ctx, X(0.1), Y(0.325), X(0.8), Y(0.05), R(0.02));
    ctx.fill();
    let fs = 0.034;
    ctx.font = `900 ${R(fs)}px system-ui`;
    while (ctx.measureText(NEWLINE[d.key]).width > X(0.78) && fs > 0.028) ctx.font = `900 ${R((fs -= 0.001))}px system-ui`;
    text(ctx, NEWLINE[d.key], w / 2, Y(0.35), R(fs), '#ffe066', 'center', 900);
    for (let k = 0; k < lines; k++) text(ctx, `★ ${starText(d, k)}`, w / 2, Y(0.4 + k * 0.045), R(0.036), '#fff6e0', 'center', 800);
    if (d.nstars === 1) text(ctx, '성문 벽돌이 다 깨지면 이 판을 다시 해요', w / 2, Y(0.445), R(0.03), 'rgba(255,240,214,.7)', 'center', 700);
    ctx.globalAlpha = 1;
  }
  // 릴 꾸미기
  if (s.phase === 'deco') {
    const a = Math.min(1, (t - s.decoT) / 10);
    ctx.globalAlpha = a;
    panel(G, 0.04, 0.17, 0.92, 0.6, 'rgba(46,26,58,.95)');
    text(ctx, '🎨 릴 꾸미기', X(0.08), Y(0.215), R(0.052), '#fff1d6', 'left', 900);
    emoji(ctx, '🪙', X(0.76), Y(0.215), R(0.045));
    text(ctx, `${W.coins}`, X(0.8), Y(0.215), R(0.05), '#ffe066', 'left', 900);
    text(ctx, '다음 파도', X(0.08), Y(0.272), R(0.032), 'rgba(255,224,176,.9)', 'left', 800);
    drawIcons(G, W, monCounts(d.waves[s.wave + 1]), 0.27, 0.272, 0.66);
    text(ctx, '카드를 톡 하면 세 릴 모두에 그 그림이 하나씩 들어가요(빠져요)', w / 2, Y(0.312), R(0.028), 'rgba(255,240,214,.75)', 'center', 700);
    s.cards.forEach((c, i) => {
      const cx = CARD_X(i), x0 = cx - CARD_W / 2, y0 = CARD_Y - CARD_H / 2, can = !c.bought && W.coins >= c.cost;
      const hov = s.down && Math.abs(s.ax - cx) < CARD_W / 2 && Math.abs(s.ay * A - CARD_Y) < CARD_H / 2;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      rr(ctx, X(x0) + 2, Y(y0) + 4, X(CARD_W), Y(CARD_H), R(0.025));
      ctx.fill();
      const cg = ctx.createLinearGradient(0, Y(y0), 0, Y(y0 + CARD_H));
      cg.addColorStop(0, c.bought ? '#6b6b7a' : c.op > 0 ? '#fff4d8' : '#ffe0e0');
      cg.addColorStop(1, c.bought ? '#4b4b58' : c.op > 0 ? '#f0d39a' : '#f2b6b6');
      ctx.fillStyle = cg;
      rr(ctx, X(x0), Y(y0) - (hov ? 3 : 0), X(CARD_W), Y(CARD_H), R(0.025));
      ctx.fill();
      ctx.strokeStyle = can ? '#ffd36b' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = can ? 2.5 : 1.5;
      ctx.stroke();
      emoji(ctx, SE[c.sym], X(cx), Y(y0 + 0.07), R(0.075));
      text(ctx, c.op > 0 ? '더하기 +1' : '빼기 −1', X(cx), Y(y0 + 0.135), R(0.034), c.op > 0 ? '#2f6b2a' : '#9a2a2a', 'center', 900);
      const cnt = countOf(s.reels[0].strip)[c.sym];
      text(ctx, `릴마다 ${cnt}→${c.bought ? cnt : Math.max(0, cnt + c.op)}`, X(cx), Y(y0 + 0.172), R(0.028), '#4a3a3a', 'center', 800);
      ctx.fillStyle = c.bought ? 'rgba(0,0,0,.25)' : can ? '#3b2a12' : 'rgba(80,30,30,.6)';
      rr(ctx, X(cx - 0.07), Y(y0 + 0.195), X(0.14), Y(0.04), R(0.02));
      ctx.fill();
      text(ctx, c.bought ? '✓ 꾸밈' : `🪙 ${c.cost}`, X(cx), Y(y0 + 0.216), R(0.032), c.bought ? '#ffffff' : can ? '#ffe066' : '#ffb0b0', 'center', 900);
    });
    // 시작 단추 + 남은 시간 테
    const left = 1 - (t - s.decoT) / DECO_AUTO;
    const bx = 0.24, bw = 0.52, by = START_Y - 0.035;
    ctx.fillStyle = '#3fbf6a';
    rr(ctx, X(bx), Y(by), X(bw), Y(0.07), R(0.035));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    rr(ctx, X(bx), Y(by), X(bw * Math.max(0, left)), Y(0.07), R(0.035));
    ctx.fill();
    text(ctx, '▶ 다음 파도', X(0.5), Y(START_Y), R(0.045), '#ffffff', 'center', 900, 'rgba(0,60,20,.5)');
    text(ctx, '쥐 떼엔 💣 · 박쥐엔 🏹 · 갑옷엔 ❄️ — 오는 적에 맞춰요', w / 2, Y(0.735), R(0.028), 'rgba(255,240,214,.75)', 'center', 700);
    ctx.globalAlpha = 1;
  }
  // 결과
  if (s.phase === 'result') {
    const ag = s.pt, a = Math.min(1, ag / 10);
    ctx.globalAlpha = a;
    panel(G, 0.06, 0.24, 0.88, 0.36, s.ok ? 'rgba(40,52,30,.94)' : 'rgba(70,24,34,.94)');
    const fx = juice(s);
    if (s.ok) {
      text(ctx, s.won ? '🏰 고양이 성을 끝까지 지켰다!' : `${d.emoji} ${d.name} — 성문을 지켰다!`, w / 2, Y(0.29), R(0.048), '#fff1a8', 'center', 900);
      for (let k = 0; k < 3; k++) {
        const on = k < d.nstars, got = s.starOk[k], sa = ag - 16 - k * 12;
        if (sa < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - sa / 8) * 0.9 : 1;
        text(ctx, got ? '★' : '☆', w / 2 + (k - 1) * R(0.11), Y(0.36), R(0.075 * sc), got ? '#ffd166' : on ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)', 'center', 900);
        if (got && (fx.memo['star' + k] ?? -1) < s.clearT) (fx.memo['star' + k] = s.clearT), fx.burst(w / 2 + (k - 1) * R(0.11), Y(0.36), '#ffe066', 16, 3.2, 2.4), fx.kick(2);
      }
      for (let k = 0; k < d.nstars; k++) {
        const got = s.starOk[k];
        let why = starText(d, k);
        if (k === 1) why = got ? `벽돌 ${W.bricks}개 남았다!` : `벽돌 ${d.B}개 지키기 — ${W.bricks}개 남았어요`;
        if (k === 2 && d.sp?.kind === 'bomb') why = got ? `폭탄 한 방에 ${W.bombBest}마리!` : `${starText(d, k)} — 최고 ${W.bombBest}마리`;
        if (k === 2 && d.sp?.kind === 'shatter') why = got ? `갑옷 벌레 ${W.shatter}마리 와장창!` : `${starText(d, k)} — ${W.shatter}마리`;
        if (k === 2 && d.sp?.kind === 'bat') why = got ? '박쥐가 하나도 못 지나갔다!' : `박쥐 ${W.batLeak}마리가 지나갔어요`;
        if (k === 2 && d.sp?.kind === 'boss') why = got ? '대장을 성문 앞에서 잡았다!' : '대장이 성문까지 왔어요';
        text(ctx, `${got ? '✓' : '✗'} ${why}`, w / 2, Y(0.425 + k * 0.045), R(0.034), got ? '#fff6dc' : 'rgba(255,255,255,.5)', 'center', 800);
      }
    } else {
      text(ctx, s.why, w / 2, Y(0.32), R(0.055), '#ffd0c8', 'center', 900);
      text(ctx, s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.4), R(0.04), '#ffffff', 'center', 800);
      text(ctx, '오는 적에 맞는 그림을 노려 봐요', w / 2, Y(0.46), R(0.032), 'rgba(255,240,214,.75)', 'center', 700);
    }
    ctx.globalAlpha = 1;
  }
  // 잭팟 큰 글자
  if (s.lastOut && s.lastOut.n === 3 && s.t - s.stopAt < 70 && s.phase !== 'result') {
    const ag = s.t - s.stopAt, sc = backOut(ag / 12) * (1 + 0.04 * Math.sin(ag * 0.4)), a = Math.min(1, (70 - ag) / 15);
    ctx.globalAlpha = a;
    ctx.save();
    ctx.translate(w / 2, Y(0.55));
    // 햇살
    ctx.rotate(ag * 0.02);
    for (let k = 0; k < 12; k++) {
      ctx.fillStyle = k % 2 ? 'rgba(255,230,120,.22)' : 'rgba(255,180,90,.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R(0.5) * sc, (k / 12) * TAU, ((k + 0.5) / 12) * TAU);
      ctx.fill();
    }
    ctx.rotate(-ag * 0.02);
    ctx.scale(sc, sc);
    const big = s.lastOut.sym === CLOVER ? '🌈 무지개 잭팟!!' : '잭팟!';
    text(ctx, big, 0, 0, R(0.13), '#ffe066', 'center', 900, '#7a2a10');
    text(ctx, `${SE[s.lastOut.sym]}${SE[s.lastOut.sym]}${SE[s.lastOut.sym]} ${SNAME[s.lastOut.sym]}`, 0, R(0.1), R(0.045), '#ffffff', 'center', 900, 'rgba(60,20,10,.6)');
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  // 첫 판 손가락
  if (s.stage === 0 && s.taps < 3 && s.phase === 'play' && t - s.startT > 30) {
    const i = Math.max(0, s.reels.findIndex((r) => r.st === 0));
    const bob = Math.sin(t * 0.15) * R(0.012);
    emoji(ctx, '👆', X(REEL_X(i) + 0.03), Y(PAY_Y + 0.07) + bob, R(0.075));
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(X(REEL_X(i)), Y(PAY_Y), R(0.055) + Math.sin(t * 0.15) * 2, 0, TAU);
    ctx.stroke();
  }
}
/** NEW 스포트라이트: 처음 나온 적·그림을 동그라미로 */
function drawSpot(G: Ctx2, s: GState) {
  const { ctx, X, Y, R, w, h, t } = G, W = s.W;
  if (s.phase !== 'play' && s.phase !== 'gap') return;
  for (const [key, k] of SPOT_KEYS) {
    const first = W.mons.find((m) => m.k === k && !m.out);
    if (!first || s.spots[key] === undefined) continue;
    const age = t - s.spots[key];
    if (age > 110) continue;
    const p = monPos(W, first), x = X(p.x), y = Y(p.y - p.air - 0.03), rad = R(0.09) + Math.sin(t * 0.2) * 2;
    ctx.save();
    ctx.globalAlpha = Math.min(1, age / 8, (110 - age) / 20) * 0.45;
    ctx.fillStyle = '#0a0612';
    ctx.beginPath();
    ctx.rect(0, Y(0.12), w, Y(FG + 0.02) - Y(0.12));
    ctx.arc(x, y, rad, 0, TAU, true);
    ctx.fill('evenodd');
    ctx.restore();
    ctx.strokeStyle = '#ffe066';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.stroke();
    const label = `NEW ${MON_EMOJI[k]} ${MD[k].name}`;
    ctx.font = `900 ${Math.max(12, R(0.036))}px system-ui`;
    const lw = ctx.measureText(label).width + 16, lx = Math.max(lw / 2 + 4, Math.min(w - lw / 2 - 4, x)), ly = Math.min(Y(FG - 0.05), y + rad + R(0.035));
    ctx.fillStyle = '#ffe066';
    rr(ctx, lx - lw / 2, ly - R(0.022), lw, R(0.044), R(0.022));
    ctx.fill();
    text(ctx, label, lx, ly, R(0.036), '#3a2210', 'center', 900);
    void h;
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: GState, w: number, h: number, th: Theme) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const G: Ctx2 = { ctx, X, Y, R, w, h, t: s.t };
  const fx = juice(s), W = s.W;
  ctx.save();
  fx.begin(ctx);
  ctx.fillStyle = th.bg;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  drawWorld(G);
  drawPreview(G, s);
  // 몬스터: 먼 것부터
  const ms = W.mons.filter((m) => !m.out || W.t - m.out < 52).sort((a, b) => b.d - a.d || a.id - b.id);
  for (const m of ms) drawMon(G, W, m);
  drawWall(G, s);
  drawTowers(G, s);
  drawShots(G, s);
  // 잭팟 느려짐: 가장자리 빛
  if (W.t < W.slowUntil && s.phase === 'play') {
    const vg = ctx.createRadialGradient(w / 2, Y(0.5), R(0.3), w / 2, Y(0.5), R(0.8));
    vg.addColorStop(0, 'rgba(255,230,120,0)');
    vg.addColorStop(1, 'rgba(255,200,80,.28)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Y(0.06), w, Y(FG));
  }
  // 바닥 (성 안 마당)
  const yard = ctx.createLinearGradient(0, Y(0.945), 0, h);
  yard.addColorStop(0, '#4a3a5c');
  yard.addColorStop(1, '#2b2238');
  ctx.fillStyle = yard;
  ctx.fillRect(0, Y(0.945), w, h - Y(0.945));
  drawMachine(G, s);
  drawFx(G, s, th);
  ctx.restore();
  drawSpot(G, s);
  drawHud(G, s);
  drawBottom(G, s);
  drawCards(G, s);
}
