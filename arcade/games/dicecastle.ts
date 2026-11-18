/**
 * 주사위 합체 수비대 (30라운드: 카지노·주사위 디펜스) — 주사위 합체 디펜스 × 타워 디펜스 × 가리키기(톡).
 * 장르 뼈대(솔직히): '무작위 주사위를 불러 같은 눈끼리 합치는 디펜스'는 시장에 있는 장르다. 특정 게임의 이름·그림·종류표는 쓰지 않았다.
 *   우리 것: 장난감 성 세계, 종류 다섯(🔥 불 · ❄️ 얼음 · ⚡ 번개 · 🪙 금화 · 📣 응원), 판 구조(판마다 새것 하나 + 대장), 판마다 다른 셋째 별.
 * 조작(기준 9·11): 손이 하는 일은 '톡' 하나. 🎲 부르기 단추를 톡 → 동전을 내고 무작위 종류·눈 1 주사위가 빈자리로 데굴.
 *   주사위를 톡(골라짐) → 같은 종류·같은 눈 주사위를 톡 → 뒤에 톡 한 쪽으로 합쳐져 눈 +1, 종류는 무작위로 바뀐다(지금 종류 말고 나머지 중 하나).
 *   누르고 있는 동안(골라 둔 동안) 짝이 반짝이고, 합치면 나올 종류 후보와 확률이 보인다. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 주사위는 눈 수만큼 총알을 쏜다(총알 하나 힘 = 눈×2). 적은 성벽 둘레 길을 걷고, 문에 닿으면 하트 -1(대장은 -2).
 * 와우: 합칠 때마다 종류가 슬롯 머신처럼 돌다 멈춘다 — 다음 부르기 두 개와 합체 후보 확률이 다 보여서, 운을 계산해 고른다.
 * 판 5개 × 파도 4개(마지막은 대장). 판마다 새것: 1 첫 성벽(부르기·합체) → 2 🪙 금화 주사위(벌이) → 3 🪖 냄비 투구 적(작은 총알은 팅!)
 *   → 4 📣 응원 주사위(이웃이 빨라짐 — 합칠 자리를 고른다) → 5 🦇 박쥐(성벽 위를 질러 날아옴, 🔥는 안 닿음).
 * 별: 성 지키기 · 하트 하나도 안 잃기 · 판마다 다른 셋째 별(눈 3 주사위 / 금화 남기기 / 주사위 적게 / 대장을 깃발 앞에서 / …).
 * 웃음: 주사위에 표정(합칠 때 '뿅' 놀람, 쏠 때 힘줌), 얼면 덜덜, 번개 맞으면 머리가 삐죽, 불붙으면 엉덩이 화끈.
 *   성탑 위 구경꾼(토끼·곰)이 합체에 환호, 문이 뚫리면 머리를 감싼다. 문에 닿은 몬스터는 메롱 하고 문으로 쏙.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
export type Kind = 'fire' | 'ice' | 'zap' | 'coin' | 'cheer';
interface KindInfo { name: string; emoji: string; top: string; mid: string; dark: string; what: string }
export const KIND: Record<Kind, KindInfo> = {
  fire: { name: '불', emoji: '🔥', top: '#ffc2a0', mid: '#ff7a45', dark: '#c4451f', what: '옆으로 번져요' },
  ice: { name: '얼음', emoji: '❄️', top: '#e2f6ff', mid: '#8fd0ff', dark: '#3f8fcf', what: '느리게 해요' },
  zap: { name: '번개', emoji: '⚡', top: '#fff6b0', mid: '#ffd23a', dark: '#c99400', what: '옆 적에게 튀어요' },
  coin: { name: '금화', emoji: '🪙', top: '#fff0bf', mid: '#f2c14e', dark: '#a77b12', what: '동전을 벌어요' },
  cheer: { name: '응원', emoji: '📣', top: '#ffd3ea', mid: '#ff8ec8', dark: '#c94f8c', what: '이웃이 빨라져요' },
};
const ATTACK: Kind[] = ['fire', 'ice', 'zap'];

// ───────────────────────────── 판 배치 (가로 0~1, 세로 0~A) ─────────────────────────────
export const COLS = 5, ROWS = 3, NSLOT = COLS * ROWS;
const CELL = 0.136, GX0 = 0.5 - (COLS / 2) * CELL, GY0 = 0.36;
export const slotXY = (i: number): [number, number] => [GX0 + ((i % COLS) + 0.5) * CELL, GY0 + (Math.floor(i / COLS) + 0.5) * CELL];
/** 땅길: 왼쪽 아래 굴 → 위로 → 오른쪽 → 아래 성문 */
const GROUND = [[0.075, 1.0], [0.075, 0.18], [0.925, 0.18], [0.925, 1.0]];
/** 하늘길(박쥐): 굴 → 성벽 위를 질러 → 성문 */
const SKY = [[0.075, 1.0], [0.5, 0.3], [0.925, 1.0]];
const plen = (P: number[][]) => P.slice(1).reduce((a, q, i) => a + Math.hypot(q[0] - P[i][0], q[1] - P[i][1]), 0);
const LG = plen(GROUND), LS = plen(SKY);
function along(P: number[][], d: number): [number, number] {
  for (let i = 1; i < P.length; i++) {
    const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (d <= l || i === P.length - 1) {
      const q = Math.max(0, Math.min(1, d / l));
      return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * q, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * q];
    }
    d -= l;
  }
  return [P[P.length - 1][0], P[P.length - 1][1]];
}
/** 부르기 단추 */
const BTN = { x0: 0.04, y0: 1.06, x1: 0.5, y1: 1.2 };

// ───────────────────────────── 적 ─────────────────────────────
export type FoeType = 'slime' | 'pot' | 'bat' | 'boss';
const FOE: Record<FoeType, { spd: number; r: number; coin: number; fly: boolean; hurt: number }> = {
  slime: { spd: 0.0042, r: 0.04, coin: 6, fly: false, hurt: 1 },
  pot: { spd: 0.0036, r: 0.042, coin: 8, fly: false, hurt: 1 },
  bat: { spd: 0.0046, r: 0.036, coin: 7, fly: true, hurt: 1 },
  boss: { spd: 0.0033, r: 0.07, coin: 40, fly: false, hurt: 2 },
};
interface Spawn { at: number; type: FoeType; hp: number; ar: number; wave: number }
/** 파도 묶음: [종류, 마릿수, 체력, 간격, 갑옷] */
type Group = [FoeType, number, number, number, number?];

// ───────────────────────────── 판 ─────────────────────────────
type Goal = { k: 'pip'; n: number } | { k: 'coins'; n: number } | { k: 'pair'; n: number } | { k: 'flag'; at: number } | { k: 'earn'; n: number };
interface StageDef { key: string; name: string; emoji: string; news: string; tip: string; pool: Kind[]; start: number; coins: number; goal: Goal; hp: number; waves: Group[][] }
export const STAGES: StageDef[] = [
  {
    key: 'wall', name: '첫 성벽', emoji: '🏰', news: '🎲 부르기를 톡 → 주사위가 데굴! 같은 주사위 둘을 톡톡 → 합체', tip: '같은 그림·같은 눈 둘을 차례로 톡 → 합체!',
    pool: ['fire', 'ice', 'zap'], start: 2, coins: 40, goal: { k: 'pip', n: 3 },
    hp: 1, waves: [[['slime', 5, 6, 40]], [['slime', 7, 9, 34]], [['slime', 8, 13, 30]], [['slime', 2, 14, 30], ['boss', 1, 110, 40], ['slime', 2, 14, 30]]],
  },
  {
    key: 'coin', name: '금화 주사위', emoji: '🪙', news: '🪙 금화 주사위 — 쏘지 않고 동전을 벌어요', tip: '🪙 금화 주사위로 벌어서 크게 합쳐요!',
    pool: ['fire', 'ice', 'zap', 'coin'], start: 2, coins: 40, goal: { k: 'pip', n: 4 },
    hp: 1.7, waves: [[['slime', 6, 8, 36]], [['slime', 8, 12, 30]], [['slime', 9, 15, 28]], [['slime', 3, 16, 28], ['boss', 1, 140, 40], ['slime', 3, 16, 28]]],
  },
  {
    key: 'pot', name: '냄비 투구', emoji: '🪖', news: '🪖 냄비 투구 적 — 작은 총알은 팅! 큰 눈으로 합쳐요', tip: '🪖 투구엔 눈 1 총알이 팅! 크게 합쳐요',
    pool: ['fire', 'ice', 'zap', 'coin'], start: 2, coins: 40, goal: { k: 'coins', n: 150 },
    hp: 1.6, waves: [[['slime', 6, 10, 34]], [['slime', 4, 12, 30], ['pot', 4, 14, 40, 2]], [['pot', 6, 16, 36, 2], ['slime', 4, 14, 26]], [['slime', 3, 16, 26], ['boss', 1, 160, 40, 2], ['pot', 3, 16, 36, 2]]],
  },
  {
    key: 'cheer', name: '응원 주사위', emoji: '📣', news: '📣 응원 주사위 — 붙어 있는 이웃이 빨리 쏴요', tip: '📣 큰 주사위를 응원 옆으로 합쳐요',
    pool: ['fire', 'ice', 'zap', 'coin', 'cheer'], start: 2, coins: 40, goal: { k: 'pair', n: 3 },
    hp: 2.0, waves: [[['slime', 7, 12, 32]], [['pot', 5, 16, 36, 2], ['slime', 4, 14, 26]], [['slime', 6, 15, 24], ['pot', 5, 18, 34, 2]], [['pot', 3, 18, 34, 2], ['boss', 1, 200, 40, 2], ['slime', 4, 16, 24]]],
  },
  {
    key: 'bat', name: '박쥐 하늘', emoji: '🦇', news: '🦇 박쥐 — 성벽 위를 질러 날아와요 (🔥 불은 안 닿아요)', tip: '🦇 박쥐는 ⚡ 번개 · ❄️ 얼음으로!',
    pool: ['fire', 'ice', 'zap', 'coin', 'cheer'], start: 2, coins: 40, goal: { k: 'flag', at: 0.4 },
    hp: 2.3, waves: [[['slime', 6, 12, 30], ['bat', 4, 10, 34]], [['bat', 6, 12, 30], ['pot', 4, 18, 34, 2]], [['slime', 6, 16, 24], ['bat', 6, 13, 28], ['pot', 3, 18, 34, 2]], [['bat', 4, 14, 28], ['boss', 1, 230, 40, 2], ['bat', 4, 14, 28], ['pot', 2, 18, 34, 2]]],
  },
];
export const STAGE_COUNT = STAGES.length;
const INTRO = 110, PAUSE = 120;
function buildSpawns(d: StageDef): Spawn[] {
  const out: Spawn[] = [];
  let t = INTRO;
  d.waves.forEach((w, wi) => {
    for (const [type, n, hp, gap, ar] of w) for (let k = 0; k < n; k++) out.push({ at: t, type, hp: Math.round(hp * d.hp), ar: ar ?? 0, wave: wi }), (t += gap);
    t += PAUSE;
  });
  return out;
}
export const goalText = (g: Goal) =>
  g.k === 'pip' ? `눈 ${g.n} 주사위 만들기` : g.k === 'coins' ? `금화 ${g.n}개 남기고 끝내기` : g.k === 'pair' ? `응원 옆에 눈 ${g.n} 주사위 두 개 붙이기` : g.k === 'earn' ? `금화 주사위로 동전 ${g.n}개 벌기` : '대장을 깃발 앞에서 쓰러뜨리기';

// ───────────────────────────── 상태 ─────────────────────────────
export interface Die { k: Kind; p: number; cd: number; land: number; spin: number; from: Kind; uid: number; shot: number; mT: number; sx: number; sy: number }
export interface Foe { uid: number; type: FoeType; hp: number; max: number; ar: number; d: number; fly: boolean; slow: number; slowT: number; x: number; y: number; hitT: number; zapT: number; burnT: number; tingT: number; wave: number }
interface Shot { k: Kind; p: number; x: number; y: number; tgt: number; wait: number; slot: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; pts?: number[] }
export interface DiceState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  slots: (Die | null)[]; foes: Foe[]; shots: Shot[]; spawns: Spawn[]; si: number; uidN: number;
  coins: number; summons: number; queue: Kind[]; sel: number; freeze: number;
  down: boolean; ax: number; ay: number; lastTap: number; taps: number; stageTaps: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; won: boolean; dead: boolean; why: string;
  lost: number; maxPip: number; peakDice: number; flagOk: boolean; flagMiss: boolean; pairOk: boolean; earned: number; bossSeen: boolean; kills: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; starsBy: number[];
  /** 새것 스포트라이트: 처음 나온 새것을 잠깐 밝게 (uid가 있으면 그 적을 따라감) */
  spot: { x: number; y: number; t: number; text: string; uid: number } | null;
}

const ev = (s: DiceState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, pts?: number[]) => s.events.push({ t: s.t, kind, x, y, text, col, v, pts });
function tip(s: DiceState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: DiceState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: DiceState, m: string) => ((s.mood = m), (s.moodT = s.t));

export const cost = (s: DiceState) => 10 + 3 * s.summons;
/** 쓰러뜨린 적이 주는 동전: 판이 오를수록 많이 */
export const reward = (s: DiceState, t: FoeType) => Math.round(FOE[t].coin * (1 + 0.4 * s.stage));
/** 총알 하나의 힘: 눈이 오를수록 피보나치처럼 커진다 (2 · 3 · 5 · 8 · 13 · 21 · 34) */
const DMG = [0, 2, 3, 5, 8, 13, 21, 34];
export const dmgOf = (p: number) => DMG[Math.min(7, p)];
const ROLL = 26, SPIN = 30, FIRE = 60, COIN_T = 60, VOLLEY = 5, RESULT_OK = 190, RESULT_FAIL = 170, NEWS_T = 190;
const STAR_PTS = 100, WIN_PTS = 100;

const drawKind = (s: DiceState) => {
  const pool = STAGES[s.stage].pool;
  return pool[Math.floor(s.rng() * pool.length)];
};
export const settled = (s: DiceState, d: Die | null) => !!d && s.t >= d.land && s.t >= d.spin;
export const canMerge = (s: DiceState, a: number, b: number) => {
  const x = s.slots[a], y = s.slots[b];
  return a !== b && !!x && !!y && x.k === y.k && x.p === y.p && x.p < 7 && settled(s, x) && settled(s, y);
};
/** 합치면 나올 종류 후보: 지금 종류를 뺀 나머지 (같은 확률) */
export const mergeKinds = (s: DiceState, k: Kind) => STAGES[s.stage].pool.filter((q) => q !== k);
/** 칸 i의 쏘는 간격(응원 이웃이 줄여 준다) */
/** 칸 i를 둘러싼 이웃 (대각선 포함 8칸) */
const NB: number[][] = [...Array(NSLOT).keys()].map((i) => {
  const c = i % COLS, r = Math.floor(i / COLS), out: number[] = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if ((dr || dc) && !(dr && dc) && c + dc >= 0 && c + dc < COLS && r + dr >= 0 && r + dr < ROWS) out.push((r + dr) * COLS + c + dc);
  return out;
});
export function cheerMul(slots: (Die | null)[], i: number) {
  let m = 1;
  for (const j of NB[i]) {
    const n = slots[j];
    if (n && n.k === 'cheer') m += 0.25 + 0.1 * n.p;
  }
  return m;
}
/** 칸 i 둘레에 응원 주사위가 있나 (skip 칸은 빼고) */
export const nextToCheer = (slots: (Die | null)[], i: number, skip = -1) => NB[i].some((j) => j !== skip && slots[j]?.k === 'cheer');
/** 셋째 별(응원 짝꿍): 응원 주사위 하나의 옆(위아래좌우)에 눈 n 이상 주사위가 몇 개 붙었나 — 가장 많은 응원 기준 */
export const pairScore = (slots: (Die | null)[], n: number) => {
  let best = 0;
  slots.forEach((d, i) => {
    if (d?.k !== 'cheer') return;
    best = Math.max(best, NB[i].filter((j) => (slots[j]?.p ?? 0) >= n && slots[j]!.k !== 'cheer').length);
  });
  return best;
};
export const PAIR_NEED = 2;
/** 봇용: 응원 옆 주사위가 얼마나 자랐나(짝꿍 별까지 가는 길) */
const pairPot = (slots: (Die | null)[], n: number) => {
  let best = 0;
  slots.forEach((d, i) => {
    if (d?.k !== 'cheer') return;
    const v = NB[i].map((j) => (slots[j] && slots[j]!.k !== 'cheer' ? Math.min(1, slots[j]!.p / n) ** 2 : 0)).sort((a, b) => b - a);
    best = Math.max(best, (v[0] ?? 0) + (v[1] ?? 0));
  });
  return best;
};
const empties = (s: DiceState) => s.slots.map((d, i) => (d ? -1 : i)).filter((i) => i >= 0);
const diceCount = (s: DiceState) => s.slots.reduce((a, d) => a + (d ? 1 : 0), 0);

function newStage(s: DiceState) {
  const d = STAGES[s.stage];
  const first = s.stage === 0;
  if (first) {
    s.slots = Array(NSLOT).fill(null);
    s.coins = d.coins;
    s.summons = 0;
    s.queue = [drawKind(s), drawKind(s)];
  } else {
    s.coins += d.coins;
    ev(s, 'bonus', (BTN.x0 + BTN.x1) / 2, BTN.y0 - 0.03, `판 보너스 +${d.coins}`, '#ffe066', s.t + 30);
  }
  s.foes = [];
  s.shots = [];
  s.spawns = buildSpawns(d);
  s.si = 0;
  s.sel = -1;
  s.freeze = 0;
  s.phase = 'play';
  s.pt = 0;
  s.lost = 0;
  s.flagOk = false;
  s.flagMiss = false;
  s.pairOk = false;
  s.earned = 0;
  s.stageTaps = 0;
  s.startT = s.t;
  s.got = 0;
  // 첫 판 시작 주사위: 공격 종류로 데굴데굴
  if (first) {
    const att = d.pool.filter((k) => ATTACK.includes(k));
    const spots = [6, 8, 7, 1, 13];
    for (let k = 0; k < d.start; k++) {
      const i = spots[k];
      s.slots[i] = { k: att[Math.floor(s.rng() * att.length)], p: 1, cd: 20 + k * 9, land: s.t + 30 + k * 12, spin: 0, from: 'fire', uid: s.uidN++, shot: -99, mT: -99, sx: 0.5, sy: 1.2 };
      ev(s, 'roll', ...slotXY(i), undefined, undefined, s.t + 30 + k * 12);
    }
  }
  s.maxPip = s.slots.reduce((a, x) => Math.max(a, x ? x.p : 0), 1);
  s.peakDice = diceCount(s);
  setMood(s, 'idle');
  s.seen.add(d.key);
  // 새 종류는 바로 다음 주사위로 (미리 보기 칸에 보인다)
  if (!first && (d.key === 'coin' || d.key === 'cheer')) s.queue[0] = d.key;
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: DiceState, ok: boolean) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.sel = -1;
  const d = STAGES[s.stage];
  if (ok) {
    const st = 1 + (s.lost === 0 ? 1 : 0) + (goalMet(s, true) ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.starsBy[s.stage] = Math.max(s.starsBy[s.stage] ?? 0, st);
    s.pts += st * STAR_PTS * (s.stage + 1) + Math.min(60, Math.floor(s.coins / 4));
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 30);
    ev(s, 'clear', 0.5, 0.6, `${d.emoji} 성 지키기 성공! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'cheer');
  } else {
    s.why = '성문이 뚫렸어요!';
    ev(s, 'fail', 0.5, 0.6, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
  }
}

/** 셋째 별: end=true면 판이 끝난 시점 기준 */
export function goalMet(s: DiceState, end = false): boolean {
  const g = STAGES[s.stage].goal;
  if (g.k === 'pip') return s.maxPip >= g.n;
  if (g.k === 'coins') return end ? s.coins >= g.n : false;
  if (g.k === 'pair') return s.pairOk;
  if (g.k === 'earn') return s.earned >= g.n;
  return s.flagOk;
}
/** 별 줄 상태: true 땀 · false 놓침 · null 아직 */
export function starState(s: DiceState): (boolean | null)[] {
  const g = STAGES[s.stage].goal, done = s.phase === 'result' && s.ok;
  const third = g.k === 'pip' ? (s.maxPip >= g.n ? true : done ? false : null)
    : g.k === 'coins' ? (done ? s.coins >= g.n : null)
    : g.k === 'pair' ? (s.pairOk ? true : done ? false : null)
    : g.k === 'earn' ? (s.earned >= g.n ? true : done ? false : null)
    : s.flagOk ? true : done || s.flagMiss ? false : null;
  return [done ? true : null, s.lost > 0 ? false : done ? true : null, third];
}

function summon(s: DiceState) {
  const e = empties(s);
  if (!e.length) {
    ev(s, 'full', (BTN.x0 + BTN.x1) / 2, BTN.y0 - 0.03, '자리가 꽉 찼어요 — 합쳐서 비워요!', '#ffd0c8');
    tip(s, 'full', '자리가 꽉 차면 같은 주사위를 합쳐서 비워요');
    return;
  }
  const c = cost(s);
  if (s.coins < c) {
    ev(s, 'poor', (BTN.x0 + BTN.x1) / 2, BTN.y0 - 0.03, `동전 ${c - s.coins}개 모자라요`, '#ffd0c8');
    return;
  }
  s.coins -= c;
  s.summons++;
  const i = e[Math.floor(s.rng() * e.length)];
  const k = s.queue.shift()!;
  s.queue.push(drawKind(s));
  s.slots[i] = { k, p: 1, cd: 10, land: s.t + ROLL, spin: 0, from: k, uid: s.uidN++, shot: -99, mT: s.t, sx: 0.27, sy: 1.13 };
  s.peakDice = Math.max(s.peakDice, diceCount(s));
  ev(s, 'summon', ...slotXY(i), `${KIND[k].emoji} ${KIND[k].name}!`, '#fff6d6', s.t + ROLL);
  if ((k === 'coin' || k === 'cheer') && !s.tips.has('spot-' + k)) {
    s.tips.add('spot-' + k);
    s.spot = { x: slotXY(i)[0], y: slotXY(i)[1], t: s.t + ROLL, text: k === 'coin' ? 'NEW 🪙 금화 주사위 — 1초마다 눈 수만큼 동전!' : 'NEW 📣 응원 주사위 — 옆 주사위가 빨리 쏴요!', uid: -1 };
  }
}

function merge(s: DiceState, a: number, b: number) {
  const x = s.slots[a]!, y = s.slots[b]!;
  s.slots[a] = null;
  const cand = mergeKinds(s, y.k);
  const nk = cand[Math.floor(s.rng() * cand.length)];
  y.from = y.k;
  y.k = nk;
  y.p++;
  y.spin = s.t + SPIN;
  y.cd = Math.max(y.cd, 8);
  y.mT = s.t;
  y.sx = slotXY(a)[0];
  y.sy = slotXY(a)[1];
  void x;
  s.maxPip = Math.max(s.maxPip, y.p);
  if (y.p >= 4) s.freeze = 8;
  const [bx, by] = slotXY(b);
  ev(s, 'merge', bx, by, `${KIND[nk].emoji} 눈 ${y.p}!`, '#fff1a8', s.t + SPIN, [a, b, y.p]);
  see(s, 'merge', '✨ 합체! 눈이 오르고 종류가 바뀌었어요');
  if (y.p >= 4) see(s, 'big', `🎰 눈 ${y.p} 주사위! 총알 ${y.p}발 × 힘 ${dmgOf(y.p)}`);
  setMood(s, 'wow');
}

function tapAt(s: DiceState, x: number, y: number) {
  s.taps++;
  s.stageTaps++;
  s.lastTap = s.t;
  if (x >= BTN.x0 && x <= BTN.x1 && y >= BTN.y0 && y <= BTN.y1) {
    s.sel = -1;
    summon(s);
    return;
  }
  const c = Math.floor((x - GX0) / CELL), r = Math.floor((y - GY0) / CELL);
  if (c >= 0 && c < COLS && r >= 0 && r < ROWS) {
    const i = r * COLS + c, d = s.slots[i];
    if (!d) return void (s.sel = -1);
    if (s.sel === i) return void (s.sel = -1);
    if (s.sel >= 0 && canMerge(s, s.sel, i)) {
      merge(s, s.sel, i);
      s.sel = -1;
      return;
    }
    if (s.sel >= 0 && s.slots[s.sel]) {
      const o = s.slots[s.sel]!;
      ev(s, 'nope', ...slotXY(i), o.k !== d.k ? '그림이 달라요' : '눈이 달라요', '#ffd0c8');
    }
    if (settled(s, d)) s.sel = i;
    return;
  }
  s.sel = -1;
}

// ───────────────────────────── 세계 ─────────────────────────────
const fpos = (f: Foe): [number, number] => along(f.fly ? SKY : GROUND, f.d);
const flen = (f: Foe) => (f.fly ? LS : LG);
/** 가장 앞선(문에 가장 가까운) 적 */
function front(s: DiceState, k: Kind): Foe | null {
  let best: Foe | null = null, bl = 1e9;
  for (const f of s.foes) {
    if (f.hp <= 0 || (k === 'fire' && f.fly)) continue;
    const left = flen(f) - f.d;
    if (left < bl) (bl = left), (best = f);
  }
  return best;
}
function hurt(s: DiceState, f: Foe, dmg: number) {
  const d = dmg - f.ar;
  if (d <= 0.001) return void (f.tingT = s.t);
  f.hp -= d;
  f.hitT = s.t;
}
function impact(s: DiceState, sh: Shot, f: Foe) {
  const D = dmgOf(sh.p);
  if (sh.k === 'fire') {
    hurt(s, f, D);
    f.burnT = s.t;
    for (const o of s.foes) if (o !== f && !o.fly && o.hp > 0 && Math.hypot(o.x - f.x, o.y - f.y) < 0.11) hurt(s, o, D * 0.5), (o.burnT = s.t);
  } else if (sh.k === 'zap') {
    hurt(s, f, D);
    f.zapT = s.t;
    const pts = [f.x, f.y];
    let cur = f;
    const hit = new Set<Foe>([f]);
    for (let n = 1 + Math.floor(sh.p / 2); n > 0; n--) {
      let nx: Foe | null = null, nd = 0.22;
      for (const o of s.foes) {
        if (hit.has(o) || o.hp <= 0) continue;
        const dd = Math.hypot(o.x - cur.x, o.y - cur.y);
        if (dd < nd) (nd = dd), (nx = o);
      }
      if (!nx) break;
      hit.add(nx);
      hurt(s, nx, D * 0.6);
      nx.zapT = s.t;
      pts.push(nx.x, nx.y);
      cur = nx;
    }
    if (pts.length > 2) ev(s, 'chain', f.x, f.y, undefined, undefined, undefined, pts);
  } else {
    hurt(s, f, D * 0.8);
    const sl = (0.3 + 0.06 * sh.p) * (f.type === 'boss' ? 0.5 : 1);
    if (sl >= f.slow || f.slowT < s.t) f.slow = sl;
    f.slowT = s.t + 90;
  }
}

function world(s: DiceState) {
  const d = STAGES[s.stage];
  // 나타나기
  while (s.si < s.spawns.length && s.spawns[s.si].at <= s.pt) {
    const sp = s.spawns[s.si++];
    const F = FOE[sp.type];
    const f: Foe = { uid: s.uidN++, type: sp.type, hp: sp.hp, max: sp.hp, ar: sp.ar, d: 0, fly: F.fly, slow: 0, slowT: 0, x: 0, y: 0, hitT: -99, zapT: -99, burnT: -99, tingT: -99, wave: sp.wave };
    [f.x, f.y] = fpos(f);
    s.foes.push(f);
    if (sp.type === 'boss') {
      s.bossSeen = true;
      ev(s, 'boss', f.x, f.y, '👑 대장 등장!', '#ffd0a8');
      s.seen.add('boss');
    }
    if ((sp.type === 'pot' || sp.type === 'bat' || sp.type === 'boss') && !s.tips.has('spot-' + sp.type)) {
      s.tips.add('spot-' + sp.type);
      s.spot = { x: f.x, y: f.y, t: s.t, uid: f.uid, text: sp.type === 'pot' ? 'NEW 🪖 냄비 투구 — 눈 1 총알은 팅! 크게 합쳐요' : sp.type === 'bat' ? 'NEW 🦇 박쥐 — 성벽을 질러 날아요, 🔥는 안 닿아요' : '👑 대장 — 문에 닿으면 하트 -2!' };
    }
  }
  if (d.goal.k === 'pair' && !s.pairOk && s.t % 6 === 0 && pairScore(s.slots, d.goal.n) >= PAIR_NEED) {
    s.pairOk = true;
    ev(s, 'goal', 0.5, 0.5, '📣 응원 짝꿍 완성!', '#ffe066');
  }
  // 걷기
  for (const f of s.foes) {
    if (f.hp <= 0) continue;
    const v = FOE[f.type].spd * (f.slowT > s.t ? 1 - f.slow : 1);
    f.d += v;
    [f.x, f.y] = fpos(f);
    if (f.type === 'boss' && d.goal.k === 'flag' && f.d >= LG * d.goal.at && !s.flagOk) s.flagMiss = true;
    if (f.d >= flen(f)) {
      f.hp = -999;
      const hurtN = FOE[f.type].hurt;
      s.hearts -= hurtN;
      s.lost += hurtN;
      ev(s, 'leak', f.x, f.y, `쿵! 하트 -${hurtN}`, '#ffb4a8', undefined, [f.type === 'boss' ? 1 : 0]);
      setMood(s, 'oops');
    }
  }
  // 주사위
  for (let i = 0; i < NSLOT; i++) {
    const di = s.slots[i];
    if (!di || !settled(s, di)) continue;
    if (di.k === 'cheer') continue;
    if (di.cd > 0) {
      di.cd -= di.k === 'coin' ? 1 : cheerMul(s.slots, i);
      continue;
    }
    if (di.k === 'coin') {
      s.coins += di.p;
      s.earned += di.p;
      di.cd = COIN_T;
      di.shot = s.t;
      ev(s, 'coin', ...slotXY(i), `+${di.p}`, '#ffe066');
      continue;
    }
    if (!front(s, di.k)) continue;
    for (let j = 0; j < di.p; j++) s.shots.push({ k: di.k, p: di.p, x: slotXY(i)[0], y: slotXY(i)[1] - 0.02, tgt: -1, wait: j * VOLLEY, slot: i });
    di.cd = FIRE;
    di.shot = s.t;
  }
  // 총알
  const byId = new Map<number, Foe>();
  for (const f of s.foes) byId.set(f.uid, f);
  s.shots = s.shots.filter((sh) => {
    if (sh.wait > 0) return void sh.wait--, true;
    let f = sh.tgt >= 0 ? byId.get(sh.tgt) : undefined;
    if (!f || f.hp <= 0) {
      const n = front(s, sh.k);
      if (!n) return false;
      f = n;
      sh.tgt = n.uid;
    }
    const dx = f.x - sh.x, dy = f.y - sh.y, dd = Math.hypot(dx, dy), v = 0.034;
    if (dd <= v + 0.01) {
      impact(s, sh, f);
      return false;
    }
    sh.x += (dx / dd) * v;
    sh.y += (dy / dd) * v;
    return true;
  });
  // 쓰러짐
  const g = d.goal;
  s.foes = s.foes.filter((f) => {
    if (f.hp > 0) return true;
    if (f.hp > -900) {
      const got = reward(s, f.type);
      s.coins += got;
      s.kills++;
      ev(s, 'pop', f.x, f.y, `+${got}`, '#ffe066', undefined, [f.type === 'boss' ? 1 : 0, f.slowT > s.t ? 1 : 0, f.zapT > s.t - 6 ? 1 : 0, f.burnT > s.t - 6 ? 1 : 0]);
      if (f.type === 'boss') {
        if (g.k === 'flag' && !s.flagMiss && f.d < LG * g.at) s.flagOk = true;
        ev(s, 'bossdown', f.x, f.y, '대장 쓰러짐!', '#fff1a8');
        setMood(s, 'cheer');
      }
    }
    return false;
  });
  if (s.hearts <= 0) {
    s.hearts = 0;
    finish(s, false);
    return;
  }
  if (s.si >= s.spawns.length && !s.foes.length) finish(s, true);
}

export const dicecastle: GameDef<DiceState> = {
  id: 'dicecastle',
  name: '주사위 합체 수비대',
  genes: ['dicedefense', 'defense', 'pointer'],
  twist: '합칠 때마다 주사위 종류가 슬롯 머신처럼 돌다 멈춘다 — 다음에 올 주사위 둘과 합체 후보 확률이 다 보여서, 언제 무엇을 합칠지 운을 계산해 고른다',
  rules: ['🎲 부르기를 톡 → 주사위가 성벽에 데굴! 눈 수만큼 총알을 쏴요.', '같은 그림·같은 눈 둘을 차례로 톡 → 합체! 눈 +1, 종류는 무작위로 바뀌어요.', '몬스터가 성문에 닿으면 하트 -1.'],
  controls: 'touch',
  hint: '부르기 단추와 주사위를 톡! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '장난감 성의 주사위 수비대',
    mood: '해 질 녘 잔디 언덕 위 장난감 성 — 돌 성벽 위에 표정 있는 말랑 주사위들이 줄지어 앉아 총알을 쏘고, 흙길을 따라 젤리 몬스터가 통통 걸어온다. 성탑 위 토끼·곰 구경꾼이 깃발을 흔든다.',
    palette: { bg: '#2d3b2a', ink: '#fffaf0', muted: '#cfd8c0', accent: '#ffd166', hot: '#ff5a4f', soft: '#e8f0d8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      slots: [], foes: [], shots: [], spawns: [], si: 0, uidN: 1,
      coins: 0, summons: 0, queue: [], sel: -1, freeze: 0,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0, stageTaps: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, won: false, dead: false, why: '',
      lost: 0, maxPip: 1, peakDice: 0, flagOk: false, flagMiss: false, pairOk: false, earned: 0, bossSeen: false, kills: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, starsBy: [], spot: null,
    } as unknown as DiceState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'cheer' ? 300 : 60)) s.mood = 'idle';
    if (s.phase === 'result') {
      s.pt++;
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok && !s.won && s.hearts > 0) s.stage++, newStage(s);
        else s.dead = true;
      }
      return;
    }
    if (press) tapAt(s, p!.x, p!.y * A);
    if (s.sel >= 0 && !s.slots[s.sel]) s.sel = -1;
    if (s.freeze > 0) return void s.freeze--;
    s.pt++;
    world(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

/** 측정용: k판부터 시작하는 상태 (하트 3) */
export function startAt(seed: number, stage: number): DiceState {
  const s = dicecastle.create(seed);
  if (stage > 0) (s.stage = stage), (s.events = []), (s.newsQ = []), newStage(s);
  return s;
}

// ───────────────────────────── 봇 ─────────────────────────────
/** 남은 위협(살아 있는 적 + 아직 안 나온 적)의 체력 몫 */
function threat(s: DiceState) {
  const w: Record<FoeType, number> = { slime: 0, pot: 0, bat: 0, boss: 0 };
  const ar: Record<FoeType, number> = { slime: 0, pot: 0, bat: 0, boss: 0 };
  let tot = 0;
  const add = (t: FoeType, hp: number, a: number) => ((w[t] += hp), (ar[t] = Math.max(ar[t], a)), (tot += hp));
  for (const f of s.foes) if (f.hp > 0) add(f.type, f.hp, f.ar);
  for (let i = s.si; i < s.spawns.length; i++) add(s.spawns[i].type, s.spawns[i].hp, s.spawns[i].ar);
  return { w, ar, tot };
}
type Th = ReturnType<typeof threat>;
/** 총알 하나가 적 종류 e에게 주는 기대 피해 (번짐·튐 포함) */
function effBullet(k: Kind, p: number, e: FoeType, a: number) {
  const D = dmgOf(p), crowd = e === 'boss' ? 0.4 : 1;
  if (k === 'fire') return FOE[e].fly ? 0 : Math.max(0, D - a) + crowd * 1.2 * Math.max(0, D * 0.5 - a);
  if (k === 'zap') return Math.max(0, D - a) + crowd * Math.min(2, 1 + Math.floor(p / 2)) * 0.6 * Math.max(0, D * 0.6 - a);
  if (k === 'ice') return Math.max(0, D * 0.8 - a) + (e === 'boss' ? 0.5 : 1) * D * 0.35;
  return 0;
}
const FT: FoeType[] = ['slime', 'pot', 'bat', 'boss'];
/**
 * 판 가치: 적 종류마다 '초당 유효 피해'를 모아, 필요한 만큼은 크게 · 넘치는 몫은 작게 친다(1-e^-x).
 * 그래서 박쥐를 칠 주사위가 하나도 없으면 ⚡·❄️ 한 개가 🔥 여러 개보다 값지다. + 다음 판을 위한 힘 + 금화 주사위 벌이
 */
function boardValue(slots: (Die | null)[], th: Th, coinW: number, need: Record<FoeType, number>, linear = false) {
  const D: Record<FoeType, number> = { slime: 0, pot: 0, bat: 0, boss: 0 };
  let v = 0, raw = 0;
  for (let i = 0; i < NSLOT; i++) {
    const d = slots[i];
    if (!d) continue;
    if (d.k === 'coin') {
      v += d.p * coinW;
      continue;
    }
    if (d.k === 'cheer') continue;
    const m = d.p * cheerMul(slots, i);
    for (const t of FT) if (th.w[t] > 0) D[t] += m * effBullet(d.k, d.p, t, th.ar[t]);
    raw += m * effBullet(d.k, d.p, 'slime', 2);
  }
  for (const t of FT) if (th.w[t] > 0) v += (th.w[t] / th.tot) * (linear ? D[t] : need[t] * 3 * (1 - Math.exp(-D[t] / need[t])));
  return v + raw * 0.3;
}
interface Plan { kind: 'summon' | 'merge' | 'wait'; a: number; b: number; gain: number }
/** 내다보기: 지금 판을 그대로 두고 ticks만큼 돌려 잃을 하트 수 (봇 전용 복제본, 난수 안 씀) */
function rollout(s: DiceState, ticks: number): number {
  const c = { ...s, slots: s.slots.map((d) => d && { ...d }), foes: s.foes.map((f) => ({ ...f })), shots: s.shots.map((x) => ({ ...x })), events: [], newsQ: [], seen: new Set<string>(), tips: new Set<string>(), starsBy: [], rng: () => 0.5 } as DiceState;
  for (let k = 0; k < ticks && c.phase === 'play'; k++) c.t++, c.pt++, world(c);
  return c.lost - s.lost;
}
/** 남은 판 시간(초): 이번 판 남은 몫 + 뒤에 남은 판 수 × 30초 */
function timeLeft(s: DiceState) {
  const last = s.spawns.length ? s.spawns[s.spawns.length - 1].at + 400 : 0;
  return Math.max(0, last - s.pt) / 60 + (STAGE_COUNT - 1 - s.stage) * 30;
}
/** 기댓값 계산: 합체는 나올 종류 후보를 고르게 평균, 부르기는 다음 종류(보임)를 빈자리 평균. 별 목표를 위해 아낄 땐 내다보기로 안전한지 확인 */
export function plan(s: DiceState, mem: { safeT: number; safe: boolean }): Plan {
  const d = STAGES[s.stage], g = d.goal, th = threat(s);
  if (th.tot <= 0) return { kind: 'wait', a: -1, b: -1, gain: 0 };
  // 내다보기(8초): 지금 판 그대로면 새나? 새면 '급함' — 아끼기·벌이를 접고 당장 힘을 키운다
  const wantSave = g.k === 'coins' && s.coins - cost(s) < g.n;
  if (s.t >= mem.safeT) (mem.safe = rollout(s, wantSave ? 1200 : 480) === 0), (mem.safeT = s.t + (wantSave ? 60 : 40));
  const crisis = !mem.safe;
  const last = s.spawns.length ? s.spawns[s.spawns.length - 1].at + 400 : 0, secLeft = Math.max(8, (last - s.pt) / 60);
  const need = {} as Record<FoeType, number>;
  for (const t of FT) need[t] = Math.max(6, (th.w[t] / secLeft) * 2.2);
  // 깃발 별: 대장이 깃발에 닿기 전에 — 대장 몫을 크게 본다
  if (g.k === 'flag' && !s.flagMiss) need.boss *= 3;
  // 금화 주사위 한 눈의 값: 남은 게임 시간이 길수록 크다, 급하면 0
  const tl = timeLeft(s), coinW = crisis ? 0 : g.k === 'earn' && s.earned < g.n ? 3 : Math.min(1.2, tl / 80) * (s.coins > 2 * cost(s) ? 0.5 : 1);
  const val = (sl: (Die | null)[]) => boardValue(sl, th, coinW, need, crisis);
  const base = val(s.slots);
  let best: Plan = { kind: 'wait', a: -1, b: -1, gain: 0.05 };
  const em = empties(s), c = cost(s);
  // 아끼기(금화 별): 급하지 않을 때만
  const saving = wantSave && !crisis;
  if (em.length && s.coins >= c && !saving) {
    const k = s.queue[0];
    let sum = 0;
    for (const i of em) {
      const sl = s.slots.slice();
      sl[i] = { k, p: 1 } as Die;
      sum += val(sl);
    }
    let gain = sum / em.length - base + 0.2;
    // 응원 짝꿍 별: 새 주사위가 떨어질 자리마다 짝꿍 점수가 오르나
    if (g.k === 'pair' && !s.pairOk && !crisis) {
      const p0 = pairScore(s.slots, g.n), q0 = pairPot(s.slots, g.n);
      gain += (5 * em.reduce((a, i) => {
        const sl = s.slots.slice();
        sl[i] = { k, p: 1 } as Die;
        return a + pairScore(sl, g.n) - p0 + pairPot(sl, g.n) - q0;
      }, 0)) / em.length;
    }
    if (gain > best.gain) best = { kind: 'summon', a: -1, b: -1, gain };
  }
  for (let a = 0; a < NSLOT; a++)
    for (let b = 0; b < NSLOT; b++) {
      if (!canMerge(s, a, b)) continue;
      const y = s.slots[b]!, cand = mergeKinds(s, y.k);
      // 꽉 찬 판에서 동전이 있으면: 합쳐서 빈 자리에 다음 주사위(보임)를 부르는 두 수를 함께 본다
      const thenSummon = !em.length && s.coins >= c && !saving;
      let sum = 0;
      for (const k of cand) {
        const sl = s.slots.slice();
        sl[a] = thenSummon ? ({ k: s.queue[0], p: 1 } as Die) : null;
        sl[b] = { k, p: y.p + 1 } as Die;
        sum += val(sl);
      }
      let gain = sum / cand.length - base + (thenSummon ? 0.3 : 0);
      if (g.k === 'pip' && s.maxPip < g.n && y.p + 1 > s.maxPip) gain += 3;
      if (g.k === 'earn' && y.k === 'coin' && s.earned < g.n && !crisis) gain -= 3;
      if (g.k === 'pair' && !s.pairOk && !crisis) {
        const p0 = pairScore(s.slots, g.n), q0 = pairPot(s.slots, g.n);
        let ps = 0;
        for (const k of cand) {
          const sl = s.slots.slice();
          sl[a] = null;
          sl[b] = { k, p: y.p + 1 } as Die;
          ps += pairScore(sl, g.n) - p0 + pairPot(sl, g.n) - q0;
        }
        gain += (5 * ps) / cand.length;
      }
      if (gain > best.gain) best = { kind: 'merge', a, b, gain };
    }
  return best;
}

const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const atSlot = (i: number) => at(...slotXY(i));
const atBtn = () => at((BTN.x0 + BTN.x1) / 2, (BTN.y0 + BTN.y1) / 2);
const brain = new WeakMap<object, { next: number; then: number; safeT: number; safe: boolean }>();
/** 사람처럼 0.3초에 한 번 톡: 지금 할 수 있는 수(부르기·합체 a→b)마다 기댓값을 계산해 가장 좋은 것, 없으면 기다리며 동전을 모은다 */
export const dicecastleSmart: Bot<DiceState> = {
  name: '기댓값 수비대장',
  act(s) {
    if (s.phase !== 'play' || s.down || s.t - s.lastTap < 16 || s.pt < 20) return NO;
    let m = brain.get(s);
    if (!m) brain.set(s, (m = { next: 0, then: -1, safeT: 0, safe: true }));
    if (m.then >= 0) {
      const b = m.then;
      m.then = -1;
      if (s.sel >= 0 && canMerge(s, s.sel, b)) return atSlot(b);
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 6;
    const pl = plan(s, m);
    if (pl.kind === 'summon') return atBtn();
    if (pl.kind === 'merge') {
      m.then = pl.b;
      return atSlot(pl.a);
    }
    return NO;
  },
};
/** 버릇 봇(측정용): 합칠 수 있으면 바로 합치기(맨 앞 짝), 아니면 동전 있으면 부르기 */
const habitBrain = new WeakMap<object, { then: number }>();
function firstPair(s: DiceState): [number, number] | null {
  for (let a = 0; a < NSLOT; a++) for (let b = a + 1; b < NSLOT; b++) if (canMerge(s, a, b)) return [a, b];
  return null;
}
export const dicecastleHabit: Bot<DiceState> = {
  name: '버릇: 합칠 수 있으면 바로 합치기',
  act(s) {
    if (s.phase !== 'play' || s.down || s.t - s.lastTap < 16 || s.pt < 20) return NO;
    let m = habitBrain.get(s);
    if (!m) habitBrain.set(s, (m = { then: -1 }));
    if (m.then >= 0) {
      const b = m.then;
      m.then = -1;
      if (s.sel >= 0 && canMerge(s, s.sel, b)) return atSlot(b);
    }
    const pr = firstPair(s);
    if (pr) return (m.then = pr[1]), atSlot(pr[0]);
    if (empties(s).length && s.coins >= cost(s)) return atBtn();
    return NO;
  },
};
/** 독립 버릇 봇(측정용, 판 고르기에 안 씀): 동전 있으면 바로 부르기, 자리가 꽉 차면 그때 맨 앞 짝 합치기 */
const habit2Brain = new WeakMap<object, { then: number }>();
export const dicecastleHabit2: Bot<DiceState> = {
  name: '버릇: 동전 있으면 바로 부르기',
  act(s) {
    if (s.phase !== 'play' || s.down || s.t - s.lastTap < 16 || s.pt < 20) return NO;
    let m = habit2Brain.get(s);
    if (!m) habit2Brain.set(s, (m = { then: -1 }));
    if (m.then >= 0) {
      const b = m.then;
      m.then = -1;
      if (s.sel >= 0 && canMerge(s, s.sel, b)) return atSlot(b);
    }
    if (empties(s).length && s.coins >= cost(s)) return atBtn();
    if (!empties(s).length) {
      const pr = firstPair(s);
      if (pr) return (m.then = pr[1]), atSlot(pr[0]);
    }
    return NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 데나 톡 (부르기 단추·아무 주사위·아무 곳) */
export const dicecastleRandom: Bot<DiceState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 30 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 90);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const r = rng();
    if (r < 0.35) m.p = { x: BTN.x0 + rng() * (BTN.x1 - BTN.x0), y: (BTN.y0 + rng() * (BTN.y1 - BTN.y0)) / A };
    else if (r < 0.85) {
      const [x, y] = slotXY(Math.floor(rng() * NSLOT));
      m.p = { x: x + (rng() - 0.5) * 0.06, y: (y + (rng() - 0.5) * 0.06) / A };
    } else m.p = { x: rng(), y: rng() };
    return { tap: false, dir: 0, pointer: m.p };
  },
};


// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, q)), 2.4);
const CARD_T = 170;
/** 3×3 자리(0~8) 중 눈 자리 */
const PIPS: number[][] = [[], [4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 3, 6, 2, 5, 8], [0, 3, 6, 2, 5, 8, 4]];
const SLIME: Record<FoeType, [string, string, string]> = { slime: ['#c9f59a', '#74d14f', '#3f9a32'], pot: ['#d5c9ff', '#9580ea', '#5c48b0'], bat: ['#dcb0ff', '#9b59d0', '#5e2d8a'], boss: ['#ffc2d2', '#ef5a8a', '#a3254f'] };
const FOE_ICON: Record<FoeType, string> = { slime: '🟢', pot: '🪖', bat: '🦇', boss: '👑' };
/** 동전 수가 보이는 자리 (날아가는 동전의 목적지) */
const PURSE: [number, number] = [0.1, 1.245];
type XY = (v: number) => number;

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawAll(ctx: CanvasRenderingContext2D, s: DiceState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X: XY = (x) => x * w, Y: XY = (y) => y * w, R: XY = (r) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawGround(ctx, s, w, h, X, Y, R, t);
  drawRoad(ctx, s, X, Y, R, t);
  drawWall(ctx, X, Y, R, t);
  // 깃발 별: 길 위 깃발
  if (d.goal.k === 'flag') {
    const [fx0, fy0] = along(GROUND, LG * d.goal.at), ok = s.flagOk, miss = s.flagMiss;
    const px = X(fx0) + R(0.045), py = Y(fy0) + R(0.01);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.ellipse(px + 2, py + 2, R(0.014), R(0.006), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px, py - R(0.075));
    ctx.stroke();
    ctx.fillStyle = miss ? '#9a8a80' : ok ? '#ffd23a' : '#ff4f5e';
    ctx.beginPath();
    const wv = Math.sin(t * 0.15) * R(0.006);
    ctx.moveTo(px, py - R(0.075));
    ctx.quadraticCurveTo(px + R(0.03), py - R(0.068) + wv, px + R(0.055), py - R(0.062));
    ctx.lineTo(px, py - R(0.045));
    ctx.fill();
  }
  // ═════════ 주사위 ═════════
  const sel = s.sel, sd = sel >= 0 ? s.slots[sel] : null;
  for (let i = 0; i < NSLOT; i++) {
    const di = s.slots[i];
    if (!di) continue;
    const [cx, cy] = slotXY(i);
    let x = X(cx), y = Y(cy) - R(0.012), rot = 0, lift = 0, sq = 1;
    const S = R(0.104);
    // 데굴데굴 굴러 들어오기 (부르기 · 첫 주사위)
    if (t < di.land) {
      const dur = di.land - Math.max(di.mT, di.land - 40), q = ease(1 - (di.land - t) / Math.max(1, dur));
      if (t < di.land - dur) continue;
      x = X(di.sx + (cx - di.sx) * q);
      y = Y(di.sy + (cy - di.sy) * q) - Math.sin(Math.PI * q) * R(0.16) - R(0.012);
      rot = (1 - q) * 9;
    } else if (t - di.land < 10) sq = 1 - 0.18 * Math.sin(((t - di.land) / 10) * Math.PI);
    if (t - di.shot < 7 && di.k !== 'coin') sq = Math.min(sq, 0.9 + 0.1 * ((t - di.shot) / 7));
    // 합체: 날아온 짝이 부딪혀 '뿅'
    if (t - di.mT < 12 && di.spin > t) {
      const q = ease((t - di.mT) / 10);
      const gx = X(di.sx + (cx - di.sx) * q), gy = Y(di.sy + (cy - di.sy) * q) - Math.sin(Math.PI * q) * R(0.06);
      drawDie(ctx, gx, gy - R(0.012), S, di.from, di.p - 1, { t, face: 'wow' });
    }
    const spinning = t < di.spin;
    const isSel = i === sel, partner = !!sd && sel !== i && sd.k === di.k && sd.p === di.p && settled(s, di);
    if (isSel) lift = R(0.012) + Math.sin(t * 0.2) * R(0.003);
    let shown: Kind = di.k;
    if (spinning) {
      const cand = [di.from, ...mergeKinds(s, di.from)];
      const left = di.spin - t;
      shown = left < 6 ? di.k : cand[Math.floor((t * (left > 16 ? 0.5 : 0.25)) % cand.length)];
      lift = Math.max(lift, R(0.01) * Math.abs(Math.sin(t * 0.5)));
    }
    let face = 'idle';
    if (spinning || t - di.mT < 30) face = 'wow';
    else if (t - di.shot < 10 && di.k !== 'coin' && di.k !== 'cheer') face = 'shoot';
    else if (di.k === 'coin' && t - di.shot < 20) face = 'happy';
    else if (s.mood === 'oops' || s.mood === 'dizzy') face = 'worry';
    else if (isSel || partner) face = 'happy';
    else if (di.k === 'cheer') face = 'cheer';
    drawDie(ctx, x, y, S, shown, di.p, { t, face, rot, lift, squash: sq, sel: isSel, ring: partner ? '#ffe066' : null, dim: !!sd && !isSel && !partner, glow: di.p >= 4 });
    // 응원 주사위: 이웃에게 ♪ 날리기
    if (di.k === 'cheer' && settled(s, di) && (t + i * 7) % 50 < 25) {
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.8;
      font(0.03, 900);
      ctx.textAlign = 'center';
      for (const j of NB[i]) {
        if (!s.slots[j]) continue;
        const [nx, ny] = slotXY(j), q = ((t + i * 7) % 50) / 25;
        ctx.fillText('♪', X(cx + (nx - cx) * q * 0.6), Y(cy + (ny - cy) * q * 0.6) - R(0.05) - q * R(0.02));
      }
      ctx.globalAlpha = 1;
    }
    if (partner) {
      font(0.032, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff3a0';
      ctx.strokeStyle = 'rgba(60,40,0,.7)';
      ctx.lineWidth = 3;
      const by = y - S * 0.85 - Math.abs(Math.sin(t * 0.18)) * R(0.012);
      ctx.strokeText('짝!', x, by);
      ctx.fillText('짝!', x, by);
    }
  }
  // ═════════ 적 (땅) ═════════
  const order = s.foes.filter((f) => f.hp > 0).sort((a, b) => a.y - b.y);
  for (const f of order) if (!f.fly) drawFoe(ctx, s, f, X, Y, R, t);
  // ═════════ 총알 ═════════
  for (const sh of s.shots) {
    if (sh.wait > 0) continue;
    const x = X(sh.x), y = Y(sh.y), r = R(0.009 + 0.0015 * sh.p);
    const col = sh.k === 'fire' ? '#ff8a3d' : sh.k === 'ice' ? '#9fe3ff' : '#ffe14a';
    ctx.fillStyle = col;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(x, y, r * 2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    if (sh.k === 'zap') {
      ctx.strokeStyle = '#fff6b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - r, y - r * 1.4);
      ctx.lineTo(x + r * 0.3, y - r * 0.1);
      ctx.lineTo(x - r * 0.3, y + r * 0.1);
      ctx.lineTo(x + r, y + r * 1.4);
      ctx.stroke();
    } else if (sh.k === 'ice') {
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.moveTo(x, y - r * 1.3);
      ctx.lineTo(x + r * 0.8, y);
      ctx.lineTo(x, y + r * 1.3);
      ctx.lineTo(x - r * 0.8, y);
      ctx.fill();
    } else {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.2);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(0.5, '#ffa040');
      g.addColorStop(1, '#e8501f');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.2, 0, TAU);
      ctx.fill();
    }
  }
  // ═════════ 박쥐 (하늘) ═════════
  for (const f of order) if (f.fly) drawFoe(ctx, s, f, X, Y, R, t);
  // 번개 사슬 · 날아가는 동전 · 문에 쏙 들어간 몬스터
  for (const e of s.events) {
    const age = t - e.t;
    if (e.kind === 'chain' && e.pts && age < 10) {
      ctx.strokeStyle = `rgba(255,245,150,${1 - age / 10})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let k = 0; k + 3 < e.pts.length; k += 2) {
        const x0 = X(e.pts[k]), y0 = Y(e.pts[k + 1]) - R(0.02), x1 = X(e.pts[k + 2]), y1 = Y(e.pts[k + 3]) - R(0.02);
        ctx.moveTo(x0, y0);
        for (let q = 1; q <= 4; q++) {
          const jx = (hsh(k * 9 + q + e.t) - 0.5) * R(0.03), jy = (hsh(k * 7 + q * 3 + e.t) - 0.5) * R(0.03);
          ctx.lineTo(x0 + ((x1 - x0) * q) / 4 + (q < 4 ? jx : 0), y0 + ((y1 - y0) * q) / 4 + (q < 4 ? jy : 0));
        }
      }
      ctx.stroke();
    }
    if ((e.kind === 'coin' || e.kind === 'pop') && age < 34) {
      const n = e.kind === 'pop' ? (e.pts?.[0] ? 6 : 2) : 1;
      for (let k = 0; k < n; k++) {
        const q = ease(Math.max(0, (age - k * 3) / 30));
        if (q <= 0 || q >= 1) continue;
        const sx = X(e.x), sy = Y(e.y) - R(0.03), ex = X(PURSE[0]), ey = Y(PURSE[1]);
        const cx2 = sx + (ex - sx) * q + Math.sin(k * 2.1) * R(0.03) * (1 - q), cy2 = sy + (ey - sy) * q - Math.sin(Math.PI * q) * R(0.12);
        drawCoin(ctx, cx2, cy2, R(0.014), t + k * 5);
      }
    }
    if (e.kind === 'leak' && age < 70) {
      // 문에 닿은 몬스터: 메롱 하고 문으로 쏙
      const a = Math.min(1, (70 - age) / 15);
      ctx.globalAlpha = a;
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(e.pts?.[0] ? '👑😜' : '😜', X(0.925), Y(0.93) - age * 0.3);
      ctx.globalAlpha = 1;
    }
  }
  // ═════════ 성탑 구경꾼 ═════════
  drawFan(ctx, s, X(0.115), Y(0.275), R(0.07), 'bunny', t);
  drawFan(ctx, s, X(0.885), Y(0.275), R(0.07), 'bear', t);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, Y(0.55), R(0.4), w / 2, Y(0.55), R(0.95));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(20,30,10,.28)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, Y(1.03));
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && ['summon', 'roll', 'merge', 'bonus'].includes(e.kind) ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'summon' || e.kind === 'roll') {
      fx.burst(x, y + R(0.03), '#e9dcc0', 14, 2.6, 2.4), fx.ring(x, y, '#fff6d6', R(0.07), 3), fx.kick(2.5);
      if (e.text) fx.pop(x, y - R(0.06), e.text, e.col, 15);
    }
    if (e.kind === 'merge') {
      const p = e.pts?.[2] ?? 2, big = p >= 4, k = s.slots[e.pts?.[1] ?? 0]?.k ?? 'fire';
      const col = KIND[k].mid;
      fx.burst(x, y, col, big ? 40 : 22, big ? 5.5 : 3.8, big ? 3.2 : 2.4), fx.burst(x, y, '#fff6c8', 14, 3, 2), fx.ring(x, y, col, R(big ? 0.3 : 0.14), big ? 7 : 4);
      fx.kick(big ? 9 : 3.5);
      if (big) fx.blink('#fff1a8', 0.35);
      fx.pop(x, y - R(0.07), big ? `🎰 ${e.text}` : e.text!, e.col, big ? 22 : 17);
    }
    if (e.kind === 'pop') {
      const boss = !!e.pts?.[0], col = boss ? '#ef5a8a' : '#8fe06a';
      fx.burst(x, y - R(0.02), col, boss ? 50 : 12, boss ? 6 : 3, boss ? 3.4 : 2.2);
      if (boss) fx.ring(x, y, '#ffe066', R(0.3), 7), fx.kick(10), fx.blink('#fff6c8', 0.4);
      else fx.kick(0.8);
      fx.pop(x, y - R(0.05), e.text!, e.col, boss ? 22 : 13);
    }
    if (e.kind === 'coin') fx.pop(x + R(0.02), y - R(0.05), e.text!, e.col, 13);
    if (e.kind === 'leak') fx.kick(9), fx.blink(th.hot, 0.3), fx.ring(x, y, '#ff6a5a', R(0.16), 6), fx.pop(X(0.8), Y(0.9), e.text!, e.col, 20);
    if (e.kind === 'boss') fx.kick(6), fx.ring(x, y, '#ff8ab0', R(0.2), 6), fx.pop(X(0.5), Y(0.2), e.text!, e.col, 22);
    if (e.kind === 'bossdown') fx.pop(X(0.5), Y(0.3), e.text!, e.col, 24);
    if (e.kind === 'nope' || e.kind === 'full' || e.kind === 'poor') fx.pop(x, y - R(0.05), e.text!, e.col, 14), fx.kick(1.5);
    if (e.kind === 'bonus') fx.pop(x, y, e.text!, e.col, 16);
    if (e.kind === 'goal') fx.pop(x, y, e.text!, e.col, 20), fx.blink('#fff1a8', 0.2), fx.burst(X(0.5), Y(0.55), '#ff8ec8', 24, 4, 2.6);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.55), '#ffe066', 50, 6, 3.2), fx.burst(X(0.5), Y(0.55), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.55), '#ffe066', R(0.4), 6), fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(10), fx.blink(th.hot, 0.3);
  }
  fx.memo.t = t;
  // 맞은 적의 '팅!'·'덜덜'·'찌릿!'·'앗뜨!' — 한 번에 하나씩만 (글자가 몬스터를 덮지 않게)
  if (t - (fx.memo.reactT ?? -99) > 18)
    for (const f of s.foes) {
      if (f.hp <= 0) continue;
      const key = 'r' + f.uid, say = (k: string, gap: number, text: string, col: string) => {
        if ((fx.memo[key + k] ?? -999) > t - gap) return false;
        fx.memo[key + k] = t;
        fx.memo.reactT = t;
        fx.pop(X(f.x) + R(0.03), Y(f.y) - R(f.type === 'boss' ? 0.13 : 0.085), text, col, 13);
        return true;
      };
      if (t - f.tingT < 2 && say('t', 60, '팅!', '#e6ecf2')) break;
      if (f.slowT > t && say('i', 200, '덜덜', '#c8f0ff')) break;
      if (t - f.zapT < 2 && say('z', 160, '찌릿!', '#fff3a0')) break;
      if (t - f.burnT < 2 && say('b', 160, '앗뜨!', '#ffc09a')) break;
    }
  // ═════════ 새것 스포트라이트 ═════════
  if (s.spot && t >= s.spot.t && t - s.spot.t < 110 && s.phase === 'play') {
    const sp = s.spot, age = t - sp.t, a = Math.min(1, age / 10, (110 - age) / 20);
    let sx = sp.x, sy = sp.y;
    if (sp.uid >= 0) {
      const f = s.foes.find((q) => q.uid === sp.uid);
      if (f) (sx = f.x), (sy = f.y - (f.fly ? 0.05 : 0.02));
    }
    const rad = R(0.09) + Math.sin(t * 0.2) * R(0.006);
    ctx.save();
    ctx.globalAlpha = 0.5 * a;
    ctx.fillStyle = '#0a1206';
    ctx.beginPath();
    ctx.rect(0, 0, w, Y(1.03));
    ctx.arc(X(sx), Y(sy), rad, 0, TAU, true);
    ctx.fill('evenodd');
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#fff3a0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(X(sx), Y(sy), rad, 0, TAU);
    ctx.stroke();
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const ty = Y(sy) + (sy > 0.6 ? -rad - R(0.04) : rad + R(0.045));
    const tw = Math.min(w - 10, ctx.measureText(sp.text).width + 20);
    const tx = Math.max(tw / 2 + 5, Math.min(w - tw / 2 - 5, X(sx)));
    ctx.fillStyle = 'rgba(40,30,10,.92)';
    rrect(ctx, tx - tw / 2, ty - R(0.03), tw, R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#fff3a0';
    ctx.fillText(sp.text, tx, ty + 1, w - 24);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  ctx.restore();
  drawPanel(ctx, s, w, h, X, Y, R, font, th);
  drawHud(ctx, s, w, X, Y, R, font, th);
}

function drawGround(ctx: CanvasRenderingContext2D, s: DiceState, w: number, h: number, X: XY, Y: XY, R: XY, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, Y(1.05));
  g.addColorStop(0, '#9bd774');
  g.addColorStop(0.5, '#7cc35e');
  g.addColorStop(1, '#5fa84a');
  ctx.fillStyle = g;
  ctx.fillRect(-12, -12, w + 24, h + 24);
  // 해 질 녘 빛
  const sun = ctx.createRadialGradient(X(0.8), Y(0.0), R(0.05), X(0.7), Y(0.1), R(0.9));
  sun.addColorStop(0, 'rgba(255,230,160,.55)');
  sun.addColorStop(0.5, 'rgba(255,210,140,.15)');
  sun.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, Y(1.05));
  // 풀숲 · 꽃
  for (let k = 0; k < 70; k++) {
    const x = hsh(k + 1) * w, y = hsh(k + 101) * Y(1.02);
    ctx.strokeStyle = k % 3 ? 'rgba(60,120,40,.45)' : 'rgba(180,230,140,.5)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 2, y);
    ctx.lineTo(x - 3, y - 4);
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 5 - Math.sin(t * 0.05 + k) * 0.8);
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 3, y - 4);
    ctx.stroke();
    if (k % 7 === 0) {
      ctx.fillStyle = ['#fff1f6', '#ffd23a', '#ff9ec4'][k % 3];
      ctx.beginPath();
      ctx.arc(x + 5, y - 3, 1.8, 0, TAU);
      ctx.fill();
    }
  }
  void s;
}

function drawRoad(ctx: CanvasRenderingContext2D, s: DiceState, X: XY, Y: XY, R: XY, t: number) {
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(X(GROUND[0][0]), Y(GROUND[0][1] + 0.04));
    for (const [x, y] of GROUND.slice(1, -1)) ctx.lineTo(X(x), Y(y));
    ctx.lineTo(X(GROUND[3][0]), Y(GROUND[3][1] + 0.04));
  };
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  path();
  ctx.strokeStyle = 'rgba(40,60,20,.3)';
  ctx.lineWidth = R(0.098);
  ctx.save();
  ctx.translate(0, R(0.008));
  ctx.stroke();
  ctx.restore();
  path();
  ctx.strokeStyle = '#b98c5c';
  ctx.lineWidth = R(0.09);
  ctx.stroke();
  path();
  ctx.strokeStyle = '#d9b383';
  ctx.lineWidth = R(0.07);
  ctx.stroke();
  // 자갈 · 발자국
  for (let k = 0; k < 40; k++) {
    const [x, y] = along(GROUND, (k / 40) * LG + hsh(k + 9) * 0.03);
    ctx.fillStyle = k % 2 ? 'rgba(150,110,70,.55)' : 'rgba(255,240,210,.45)';
    ctx.beginPath();
    ctx.ellipse(X(x) + (hsh(k) - 0.5) * R(0.05), Y(y) + (hsh(k + 3) - 0.5) * R(0.05), 2.2, 1.5, 0, 0, TAU);
    ctx.fill();
  }
  // 몬스터 굴 (왼쪽 아래)
  const cx = X(0.075), cy = Y(1.0);
  ctx.fillStyle = '#6b5a4a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.01), R(0.075), R(0.05), 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1f1a';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.012), R(0.05), R(0.035), 0, Math.PI, TAU);
  ctx.fill();
  const blink = (t % 160) < 6;
  if (!blink) {
    ctx.fillStyle = '#ffe14a';
    for (const dx of [-0.014, 0.014]) (ctx.beginPath(), ctx.arc(cx + R(dx), cy - R(0.008), R(0.005), 0, TAU), ctx.fill());
  }
  // 성문 (오른쪽 아래)
  const gx = X(0.925), gy = Y(0.985);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(gx + 3, gy + R(0.03), R(0.07), R(0.02), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#a99a8a';
  rrect(ctx, gx - R(0.065), gy - R(0.07), R(0.13), R(0.1), R(0.012));
  ctx.fill();
  ctx.fillStyle = '#c9bba9';
  rrect(ctx, gx - R(0.065), gy - R(0.085), R(0.13), R(0.03), R(0.008));
  ctx.fill();
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath();
  ctx.moveTo(gx - R(0.035), gy + R(0.03));
  ctx.lineTo(gx - R(0.035), gy - R(0.025));
  ctx.arc(gx, gy - R(0.025), R(0.035), Math.PI, TAU);
  ctx.lineTo(gx + R(0.035), gy + R(0.03));
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,10,.5)';
  ctx.lineWidth = 1;
  for (const dx of [-0.012, 0.012]) (ctx.beginPath(), ctx.moveTo(gx + R(dx), gy + R(0.03)), ctx.lineTo(gx + R(dx), gy - R(0.045)), ctx.stroke());
  // 성문 위 하트 = 남은 하트
  ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('❤️'.repeat(Math.max(0, s.hearts)) || '💔', gx, gy - R(0.095));
}

function drawWall(ctx: CanvasRenderingContext2D, X: XY, Y: XY, R: XY, t: number) {
  const x0 = X(0.15), x1 = X(0.85), y0 = Y(0.27), y1 = Y(0.83), th = R(0.06);
  // 그림자
  ctx.fillStyle = 'rgba(30,50,20,.35)';
  rrect(ctx, x0 + R(0.02), y0 + R(0.03), x1 - x0, y1 - y0 + th, R(0.03));
  ctx.fill();
  // 앞면(두께)
  const fr = ctx.createLinearGradient(0, y1, 0, y1 + th);
  fr.addColorStop(0, '#9c8f7f');
  fr.addColorStop(1, '#7a6e60');
  ctx.fillStyle = fr;
  rrect(ctx, x0, y0 + th, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  // 앞면 돌 줄눈
  ctx.strokeStyle = 'rgba(60,50,40,.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 9; k++) {
    const xx = x0 + ((k + 0.5) / 9) * (x1 - x0);
    ctx.beginPath();
    ctx.moveTo(xx, y1 + 2);
    ctx.lineTo(xx, y1 + th - 2);
    ctx.stroke();
  }
  // 윗면
  const tp = ctx.createLinearGradient(x0, y0, x1, y1);
  tp.addColorStop(0, '#e9e0d0');
  tp.addColorStop(1, '#cbbfa9');
  ctx.fillStyle = tp;
  rrect(ctx, x0, y0, x1 - x0, y1 - y0, R(0.03));
  ctx.fill();
  // 돌 무늬
  ctx.save();
  rrect(ctx, x0, y0, x1 - x0, y1 - y0, R(0.03));
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,100,80,.18)';
  for (let r = 0; r < 12; r++) {
    const yy = y0 + (r / 12) * (y1 - y0);
    ctx.beginPath();
    ctx.moveTo(x0, yy);
    ctx.lineTo(x1, yy);
    ctx.stroke();
    for (let c = 0; c < 8; c++) {
      const xx = x0 + ((c + (r % 2) * 0.5) / 7) * (x1 - x0);
      ctx.beginPath();
      ctx.moveTo(xx, yy);
      ctx.lineTo(xx, yy + (y1 - y0) / 12);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 성가퀴(톱니) 위쪽
  for (let k = 0; k < 9; k++) {
    const bx = x0 + R(0.04) + k * ((x1 - x0 - R(0.08)) / 8);
    ctx.fillStyle = '#b3a692';
    rrect(ctx, bx - R(0.022), y0 - R(0.02), R(0.044), R(0.035), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#ddd3c2';
    rrect(ctx, bx - R(0.022), y0 - R(0.032), R(0.044), R(0.03), R(0.006));
    ctx.fill();
  }
  // 주사위 자리(홈)
  for (let i = 0; i < NSLOT; i++) {
    const [cx, cy] = slotXY(i);
    ctx.fillStyle = 'rgba(90,75,55,.28)';
    rrect(ctx, X(cx) - R(0.056), Y(cy) - R(0.05), R(0.112), R(0.104), R(0.02));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    rrect(ctx, X(cx) - R(0.056), Y(cy) + R(0.046), R(0.112), R(0.006), R(0.003));
    ctx.fill();
  }
  // 성탑 둘 (위 모서리)
  for (const tx of [0.115, 0.885]) {
    const cx = X(tx), cy = Y(0.3);
    ctx.fillStyle = 'rgba(30,50,20,.3)';
    ctx.beginPath();
    ctx.ellipse(cx + 4, cy + R(0.06), R(0.07), R(0.03), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#8e8170';
    rrect(ctx, cx - R(0.06), cy - R(0.01), R(0.12), R(0.07), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#e2d8c6';
    ctx.beginPath();
    ctx.ellipse(cx, cy - R(0.01), R(0.06), R(0.035), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(100,85,65,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 깃대
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + R(0.045), cy - R(0.01));
    ctx.lineTo(cx + R(0.045), cy - R(0.09));
    ctx.stroke();
    ctx.fillStyle = tx < 0.5 ? '#ff6b8a' : '#4fb4ff';
    const wv = Math.sin(t * 0.12 + tx * 9) * R(0.008);
    ctx.beginPath();
    ctx.moveTo(cx + R(0.045), cy - R(0.09));
    ctx.quadraticCurveTo(cx + R(0.07), cy - R(0.085) + wv, cx + R(0.095), cy - R(0.08));
    ctx.lineTo(cx + R(0.045), cy - R(0.06));
    ctx.fill();
  }
}

function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const sx = Math.abs(Math.cos(t * 0.25));
  ctx.fillStyle = '#b8860b';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, r * Math.max(0.25, sx), r, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.ellipse(x, y, r * Math.max(0.2, sx) * 0.9, r * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff4b0';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.25 * sx, y - r * 0.3, r * 0.25 * sx, r * 0.25, 0, 0, TAU);
  ctx.fill();
}

/** 표정 있는 말랑 주사위 (3/4 시점: 윗면 + 앞면 두께) */
function drawDie(ctx: CanvasRenderingContext2D, x: number, y: number, S: number, k: Kind, p: number, o: { t: number; face?: string; rot?: number; lift?: number; squash?: number; sel?: boolean; ring?: string | null; dim?: boolean; glow?: boolean }) {
  const K = KIND[k], topH = S * 0.8, fr = S * 0.4, rr = S * 0.24, lift = o.lift ?? 0, sq = o.squash ?? 1;
  // 그림자
  ctx.fillStyle = `rgba(40,30,15,${0.3 - Math.min(0.15, lift / S)})`;
  ctx.beginPath();
  ctx.ellipse(x + S * 0.06, y + topH / 2 + fr * 0.85, S * 0.56, S * 0.17, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y + topH / 2 + fr - lift);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(1 + (1 - sq) * 0.6, sq);
  ctx.translate(0, -(topH / 2 + fr));
  if (o.dim) ctx.globalAlpha = 0.55;
  if (o.glow) {
    const g = ctx.createRadialGradient(0, 0, S * 0.3, 0, 0, S * 1.1);
    g.addColorStop(0, K.mid + 'aa');
    g.addColorStop(1, K.mid + '00');
    ctx.fillStyle = g;
    ctx.fillRect(-S * 1.1, -S * 1.1, S * 2.2, S * 2.2);
  }
  if (o.ring) {
    ctx.strokeStyle = o.ring;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(o.t * 0.3);
    rrect(ctx, -S * 0.62, -topH * 0.62, S * 1.24, topH * 1.24 + fr, rr * 1.3);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // 앞면
  ctx.fillStyle = K.dark;
  rrect(ctx, -S / 2, -topH / 2 + fr, S, topH, rr);
  ctx.fill();
  // 윗면
  const g2 = ctx.createLinearGradient(-S / 2, -topH / 2, S / 2, topH / 2);
  g2.addColorStop(0, K.top);
  g2.addColorStop(0.6, K.mid);
  g2.addColorStop(1, K.mid);
  ctx.fillStyle = g2;
  rrect(ctx, -S / 2, -topH / 2, S, topH, rr);
  ctx.fill();
  ctx.strokeStyle = o.sel ? '#ffffff' : 'rgba(60,40,30,.25)';
  ctx.lineWidth = o.sel ? 3 : 1;
  ctx.stroke();
  // 윗면 반사광
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  rrect(ctx, -S * 0.36, -topH * 0.42, S * 0.36, topH * 0.14, topH * 0.07);
  ctx.fill();
  // 눈(점)
  const pr = S * (p >= 6 ? 0.062 : 0.072);
  for (const q of PIPS[Math.min(7, p)] ?? []) {
    const px = ((q % 3) - 1) * S * 0.25, py = (Math.floor(q / 3) - 1) * topH * 0.25;
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(px, py + 0.9, pr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#35203d';
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, TAU);
    ctx.fill();
  }
  // 종류 딱지 (윗면 왼쪽 위 모서리에 붙은 스티커)
  const bx = -S * 0.5, by = -topH * 0.52;
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.arc(bx + 1, by + 1.5, S * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(bx, by, S * 0.2, 0, TAU);
  ctx.fill();
  ctx.font = `${Math.max(10, S * 0.3)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(K.emoji, bx, by + 1);
  ctx.textBaseline = 'alphabetic';
  // 얼굴 (앞면)
  const fy = topH / 2 + fr * 0.52, ex = S * 0.17, er = Math.max(1.6, fr * 0.16);
  ctx.fillStyle = '#2a1830';
  ctx.strokeStyle = '#2a1830';
  ctx.lineWidth = 1.4;
  const face = o.face ?? 'idle';
  if (face === 'wow') {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx * ex, fy - 1, er * 1.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1830';
      ctx.beginPath();
      ctx.arc(sx * ex, fy - 1, er * 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(0, fy + er * 0.6, er * 0.8, er * 1.0, 0, 0, TAU);
    ctx.fill();
  } else if (face === 'shoot') {
    // 힘줌: > <
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * ex - sx * er * 1.1, fy - er);
      ctx.lineTo(sx * ex + sx * er * 0.6, fy);
      ctx.lineTo(sx * ex - sx * er * 1.1, fy + er);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-er, fy + er * 0.9);
    ctx.lineTo(er, fy + er * 0.9);
    ctx.stroke();
  } else if (face === 'happy' || face === 'cheer') {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * ex, fy + er * 0.4, er * 1.1, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.beginPath();
    if (face === 'cheer') ctx.ellipse(0, fy + er * 0.6, er * 1.1, er * 0.9, 0, 0, TAU), ctx.fill();
    else ctx.arc(0, fy, er * 1.2, 0.15 * Math.PI, 0.85 * Math.PI), ctx.stroke();
  } else if (face === 'worry') {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * ex, fy - 0.5, er * 0.8, 0, TAU), ctx.fill());
    ctx.beginPath();
    ctx.moveTo(-er * 1.2, fy + er * 1.1);
    ctx.quadraticCurveTo(-er * 0.4, fy + er * 0.4, 0, fy + er * 1.1);
    ctx.quadraticCurveTo(er * 0.4, fy + er * 1.6, er * 1.2, fy + er * 1.0);
    ctx.stroke();
  } else {
    const blink = (o.t + Math.floor(x)) % 170 < 5;
    for (const sx of [-1, 1]) {
      if (blink) (ctx.beginPath(), ctx.moveTo(sx * ex - er, fy), ctx.lineTo(sx * ex + er, fy), ctx.stroke());
      else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(sx * ex, fy - 0.5, er * 1.25, er * 1.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2a1830';
        ctx.beginPath();
        ctx.arc(sx * ex, fy, er * 0.75, 0, TAU);
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(0, fy + er * 0.6, er * 0.8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  // 볼터치
  ctx.fillStyle = 'rgba(255,120,140,.45)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * ex * 1.9, fy + er * 0.5, er * 1.1, er * 0.6, 0, 0, TAU), ctx.fill());
  ctx.restore();
}

/** 젤리 몬스터 (슬라임 · 냄비 투구 · 박쥐 · 대장) */
function drawFoe(ctx: CanvasRenderingContext2D, s: DiceState, f: Foe, X: XY, Y: XY, R: XY, t: number) {
  const r = R(FOE[f.type].r), x = X(f.x), col = SLIME[f.type];
  const frozen = f.slowT > t, zap = t - f.zapT < 10, burn = t - f.burnT < 16, hit = t - f.hitT < 4;
  const ph = (t + f.uid * 13) * (frozen ? 0.08 : 0.2), bob = Math.abs(Math.sin(ph));
  let y = Y(f.y);
  // 그림자
  ctx.fillStyle = 'rgba(30,40,15,.3)';
  ctx.beginPath();
  ctx.ellipse(x + 2, y + (f.fly ? R(0.05) : 2), r * (f.fly ? 0.7 : 1.05), r * 0.32, 0, 0, TAU);
  ctx.fill();
  if (f.fly) y -= R(0.045) + Math.sin(ph * 1.5) * R(0.008);
  else y -= bob * r * 0.35;
  const sqx = f.fly ? 1 : 1 + 0.1 * (1 - bob), sqy = f.fly ? 1 : 1 - 0.1 * (1 - bob);
  // 앞으로 가는 방향 (눈이 본다)
  const [nx, ny] = along(f.fly ? SKY : GROUND, f.d + 0.02), dx = nx - f.x, dy = ny - f.y, dl = Math.hypot(dx, dy) || 1;
  const lx = (dx / dl) * r * 0.18, ly = (dy / dl) * r * 0.12;
  ctx.save();
  ctx.translate(x, y);
  if (zap) ctx.translate((hsh(t) - 0.5) * 3, 0);
  // 박쥐 날개
  if (f.type === 'bat') {
    const flap = Math.sin(t * 0.6 + f.uid) * 0.6;
    ctx.fillStyle = col[2];
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.scale(sx, 1);
      ctx.rotate(-flap * 0.5);
      ctx.beginPath();
      ctx.moveTo(r * 0.5, -r * 0.2);
      ctx.quadraticCurveTo(r * 1.4, -r * 1.2, r * 2.0, -r * 0.4);
      ctx.quadraticCurveTo(r * 1.6, -r * 0.1, r * 1.5, r * 0.2);
      ctx.quadraticCurveTo(r * 1.2, -r * 0.1, r * 1.0, r * 0.3);
      ctx.quadraticCurveTo(r * 0.8, 0, r * 0.4, r * 0.3);
      ctx.fill();
      ctx.restore();
    }
  }
  // 몸
  const body = ctx.createRadialGradient(-r * 0.3, -r * 0.6, r * 0.1, 0, -r * 0.3, r * 1.3);
  body.addColorStop(0, hit ? '#ffffff' : col[0]);
  body.addColorStop(0.55, col[1]);
  body.addColorStop(1, col[2]);
  ctx.fillStyle = body;
  ctx.beginPath();
  if (f.type === 'bat') ctx.arc(0, -r * 0.4, r * 0.75, 0, TAU);
  else {
    ctx.moveTo(-r * sqx, 0);
    ctx.bezierCurveTo(-r * sqx, -r * 1.5 * sqy, r * sqx, -r * 1.5 * sqy, r * sqx, 0);
    ctx.quadraticCurveTo(0, r * 0.18, -r * sqx, 0);
  }
  ctx.fill();
  if (burn) {
    ctx.fillStyle = 'rgba(255,120,40,.35)';
    ctx.fill();
  }
  // 반짝
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.85, r * 0.18, r * 0.11, -0.5, 0, TAU);
  ctx.fill();
  // 눈
  const ey = f.type === 'bat' ? -r * 0.5 : -r * 0.62, ex = r * 0.3, er = r * 0.22;
  for (const sx of [-1, 1]) {
    if (zap) {
      ctx.strokeStyle = '#2a1830';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx * ex - er, ey - er);
      ctx.lineTo(sx * ex + er, ey + er);
      ctx.moveTo(sx * ex + er, ey - er);
      ctx.lineTo(sx * ex - er, ey + er);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sx * ex, ey, er, er * 1.15, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1830';
    ctx.beginPath();
    ctx.arc(sx * ex + lx, ey + ly + (frozen ? 0 : 0), er * 0.55, 0, TAU);
    ctx.fill();
  }
  // 입
  ctx.strokeStyle = '#2a1830';
  ctx.fillStyle = '#7a2340';
  ctx.lineWidth = 1.4;
  if (frozen) {
    // 덜덜 이빨
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r * 0.25, -r * 0.3 + Math.sin(t * 1.3) * 0.8, r * 0.5, r * 0.16);
    ctx.strokeRect(-r * 0.25, -r * 0.3 + Math.sin(t * 1.3) * 0.8, r * 0.5, r * 0.16);
  } else if (burn || zap) {
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.25, r * 0.16, r * 0.2, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, -r * 0.33, r * 0.18, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
  if (f.type === 'boss') {
    // 화난 눈썹 + 왕관
    ctx.strokeStyle = '#2a1830';
    ctx.lineWidth = 2.2;
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sx * ex * 1.6, ey - er * 1.6), ctx.lineTo(sx * ex * 0.4, ey - er * 1.05), ctx.stroke());
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const cy = -r * 1.08;
    ctx.moveTo(-r * 0.45, cy);
    ctx.lineTo(-r * 0.5, cy - r * 0.45);
    ctx.lineTo(-r * 0.22, cy - r * 0.22);
    ctx.lineTo(0, cy - r * 0.55);
    ctx.lineTo(r * 0.22, cy - r * 0.22);
    ctx.lineTo(r * 0.5, cy - r * 0.45);
    ctx.lineTo(r * 0.45, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (f.ar > 0 && f.type !== 'bat') {
    // 냄비 투구
    const hy = f.type === 'boss' ? -r * 1.05 : -r * 0.98;
    ctx.fillStyle = '#9aa3ad';
    ctx.strokeStyle = '#5f6770';
    ctx.lineWidth = 1.2;
    if (f.type !== 'boss') {
      rrect(ctx, -r * 0.62, hy - r * 0.42, r * 1.24, r * 0.5, r * 0.12);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#c6ccd3';
      rrect(ctx, -r * 0.72, hy + r * 0.02, r * 1.44, r * 0.12, r * 0.06);
      ctx.fill();
      ctx.strokeStyle = '#5f6770';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 0.8, hy - r * 0.15, r * 0.14, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }
    if (t - f.tingT < 6) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-r * 0.3, hy - r * 0.3, r * 0.2 * (1 - (t - f.tingT) / 6), 0, TAU);
      ctx.fill();
    }
  }
  if (frozen) {
    ctx.fillStyle = 'rgba(190,235,255,.38)';
    rrect(ctx, -r * 1.05, -r * 1.35, r * 2.1, r * 1.45, r * 0.25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 1.2);
    ctx.lineTo(-r * 0.45, -r * 0.95);
    ctx.stroke();
  }
  if (zap) {
    // 삐죽 머리
    ctx.strokeStyle = '#fff36a';
    ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(k * r * 0.25, -r * 1.05);
      ctx.lineTo(k * r * 0.35, -r * 1.5);
      ctx.stroke();
    }
  }
  if (burn) {
    for (let k = 0; k < 3; k++) {
      const q = ((t + k * 7) % 20) / 20;
      ctx.fillStyle = `rgba(90,80,80,${0.5 * (1 - q)})`;
      ctx.beginPath();
      ctx.arc((k - 1) * r * 0.4, -r * 1.2 - q * r, r * (0.15 + q * 0.2), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // 체력 막대
  if (f.hp < f.max) {
    const bw = Math.max(R(0.06), r * 2), by = y - r * (f.type === 'boss' ? 2.05 : 1.75);
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    rrect(ctx, x - bw / 2 - 1, by - 1, bw + 2, 6, 3);
    ctx.fill();
    ctx.fillStyle = f.type === 'boss' ? '#ff5a8a' : '#7ee05a';
    rrect(ctx, x - bw / 2, by, bw * Math.max(0, f.hp / f.max), 4, 2);
    ctx.fill();
  }
  void s;
}

/** 성탑 위 구경꾼: 토끼 · 곰 — 합체엔 폴짝, 문이 뚫리면 머리 감싸기 */
function drawFan(ctx: CanvasRenderingContext2D, s: DiceState, x: number, y: number, u: number, kind: 'bunny' | 'bear', t: number) {
  const m = s.phase === 'result' ? (s.ok ? 'cheer' : 'dizzy') : s.mood;
  const age = t - s.moodT, jump = m === 'wow' || m === 'cheer' ? Math.abs(Math.sin(age * 0.25)) * u * 0.35 : 0;
  const body = kind === 'bunny' ? '#fbf6ef' : '#b07a4a', dark = kind === 'bunny' ? '#e8dccd' : '#8a5a32', inner = kind === 'bunny' ? '#ffb6c8' : '#e8b88a';
  ctx.save();
  ctx.translate(x, y - jump + Math.sin(t * 0.08 + x) * 1.2);
  // 몸
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.1, u * 0.42, u * 0.36, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.06, u * 0.38, u * 0.32, 0, 0, TAU);
  ctx.fill();
  // 귀
  ctx.fillStyle = body;
  if (kind === 'bunny') {
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * u * 0.15, -u * 0.5);
      ctx.rotate(sx * (m === 'oops' ? 0.6 : 0.15));
      ctx.beginPath();
      ctx.ellipse(0, -u * 0.25, u * 0.1, u * 0.3, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.ellipse(0, -u * 0.25, u * 0.05, u * 0.22, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.restore();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * u * 0.24, -u * 0.62, u * 0.12, 0, TAU);
      ctx.fill();
      ctx.fillStyle = inner;
      ctx.beginPath();
      ctx.arc(sx * u * 0.24, -u * 0.62, u * 0.06, 0, TAU);
      ctx.fill();
      ctx.fillStyle = body;
    }
  }
  // 머리
  ctx.beginPath();
  ctx.arc(0, -u * 0.4, u * 0.3, 0, TAU);
  ctx.fill();
  // 얼굴
  ctx.fillStyle = '#2a1830';
  ctx.strokeStyle = '#2a1830';
  ctx.lineWidth = 1.4;
  if (m === 'dizzy') {
    ctx.font = `${Math.max(10, u * 0.3)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('💫', 0, -u * 0.75);
  }
  if (m === 'wow' || m === 'oops') {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * u * 0.11, -u * 0.43, u * 0.055, 0, TAU), ctx.fill());
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.27, u * 0.05, u * 0.07, 0, 0, TAU);
    ctx.fill();
  } else if (m === 'cheer') {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * u * 0.11, -u * 0.4, u * 0.05, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    ctx.beginPath();
    ctx.arc(0, -u * 0.32, u * 0.08, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.fill();
  } else {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(sx * u * 0.11, -u * 0.43, u * 0.035, 0, TAU), ctx.fill());
    ctx.beginPath();
    ctx.arc(0, -u * 0.33, u * 0.05, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,130,150,.5)';
  for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(sx * u * 0.19, -u * 0.34, u * 0.06, u * 0.035, 0, 0, TAU), ctx.fill());
  // 팔: 환호면 위로, 문이 뚫리면 머리 감싸기
  ctx.strokeStyle = dark;
  ctx.lineWidth = u * 0.12;
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sx * u * 0.3, -u * 0.05);
    if (m === 'wow' || m === 'cheer') ctx.lineTo(sx * u * 0.5, -u * 0.55);
    else if (m === 'oops' || m === 'dizzy') ctx.lineTo(sx * u * 0.25, -u * 0.62);
    else ctx.lineTo(sx * u * 0.45, u * 0.12 + (sx > 0 ? Math.sin(t * 0.15) * u * 0.1 : 0));
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  if (m === 'oops') {
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    ctx.ellipse(u * 0.32, -u * 0.55, u * 0.05, u * 0.08, 0, 0, TAU);
    ctx.fill();
  }
  if ((m === 'wow' || m === 'cheer') && age < 60) {
    ctx.font = `900 ${Math.max(12, u * 0.36)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(40,30,10,.6)';
    ctx.fillStyle = '#fff6c8';
    const say = kind === 'bunny' ? '와!' : '우와!';
    ctx.strokeText(say, 0, -u * 1.0);
    ctx.fillText(say, 0, -u * 1.0);
  }
  ctx.restore();
}

function drawPanel(ctx: CanvasRenderingContext2D, s: DiceState, w: number, h: number, X: XY, Y: XY, R: XY, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, d = STAGES[s.stage], y0 = Y(1.03);
  const pg = ctx.createLinearGradient(0, y0, 0, h);
  pg.addColorStop(0, '#5a3e2a');
  pg.addColorStop(1, '#3a281b');
  ctx.fillStyle = pg;
  ctx.fillRect(0, y0, w, h - y0);
  ctx.fillStyle = 'rgba(255,230,190,.18)';
  ctx.fillRect(0, y0, w, 2);
  ctx.textBaseline = 'middle';
  // ═════════ 부르기 단추 ═════════
  const c = cost(s), full = !empties(s).length, poor = s.coins < c, can = !full && !poor && s.phase === 'play';
  const bx = X(BTN.x0), by = Y(BTN.y0), bw = X(BTN.x1) - bx, bh = Y(BTN.y1) - by;
  const press = s.down && s.ay * A >= BTN.y0 && s.ay * A <= BTN.y1 && s.ax >= BTN.x0 && s.ax <= BTN.x1, dip = press ? 3 : 0;
  ctx.fillStyle = can ? '#b8502a' : '#5d544c';
  rrect(ctx, bx, by + 5, bw, bh, R(0.03));
  ctx.fill();
  const bg = ctx.createLinearGradient(0, by, 0, by + bh);
  bg.addColorStop(0, can ? '#ffb05a' : '#a39a90');
  bg.addColorStop(1, can ? '#f0743a' : '#857c72');
  ctx.fillStyle = bg;
  rrect(ctx, bx, by + dip, bw, bh, R(0.03));
  ctx.fill();
  if (can) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.12 * Math.sin(t * 0.12)})`;
    rrect(ctx, bx + 4, by + dip + 3, bw - 8, bh * 0.38, R(0.02));
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(16, R(0.06))}px system-ui, sans-serif`;
  ctx.fillText('🎲', bx + R(0.025), by + dip + bh * 0.5);
  font(0.05, 900);
  ctx.fillStyle = '#fff8ec';
  ctx.fillText('부르기', bx + R(0.11), by + dip + bh * 0.36);
  font(0.036, 900);
  ctx.fillStyle = can ? '#fff2b0' : '#e8ddd0';
  ctx.fillText(full ? '자리 꽉 — 합쳐요' : `🪙 ${c}${poor ? ' 모자라요' : ''}`, bx + R(0.11), by + dip + bh * 0.72);
  // 동전
  const pulse = (juice(s).memo.purseT ?? -99) > t - 10 ? 1.15 : 1;
  ctx.save();
  ctx.translate(X(PURSE[0]), Y(PURSE[1]));
  ctx.scale(pulse, pulse);
  drawCoin(ctx, 0, 0, R(0.022), t);
  ctx.restore();
  font(0.048, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffe066';
  ctx.fillText(`${s.coins}`, X(PURSE[0]) + R(0.035), Y(PURSE[1]) + 1);
  if (d.goal.k === 'coins' && s.phase === 'play') {
    font(0.032, 800);
    ctx.fillStyle = s.coins >= d.goal.n ? '#bff7a8' : 'rgba(255,240,214,.7)';
    ctx.fillText(`/ 남길 ${d.goal.n}`, X(PURSE[0]) + R(0.04) + ctx.measureText(`${s.coins}`).width * 1.5, Y(PURSE[1]) + 1);
  }
  if (d.goal.k === 'earn' && s.phase === 'play') {
    font(0.032, 800);
    ctx.fillStyle = s.earned >= d.goal.n ? '#bff7a8' : 'rgba(255,240,214,.75)';
    ctx.textAlign = 'right';
    ctx.fillText(`금화 주사위 벌이 ${Math.min(s.earned, d.goal.n)}/${d.goal.n}`, X(BTN.x1), Y(PURSE[1]) + 1);
  }
  // ═════════ 오른쪽 칸: 다음 주사위 · 합체 후보 ═════════
  const ix = X(0.53), iy = Y(1.06), iw = X(0.96) - ix, ih = Y(1.2) - iy;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  rrect(ctx, ix, iy, iw, ih, R(0.025));
  ctx.fill();
  const sd = s.sel >= 0 ? s.slots[s.sel] : null;
  ctx.textAlign = 'center';
  if (sd) {
    const cand = mergeKinds(s, sd.k), pc = Math.round(100 / cand.length);
    font(0.034, 900);
    ctx.fillStyle = '#fff3a0';
    ctx.fillText(`합치면 → 눈 ${sd.p + 1}`, ix + iw / 2, iy + ih * 0.22);
    ctx.font = `${Math.max(14, R(0.05))}px system-ui, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(cand.map((k) => KIND[k].emoji).join(' '), ix + iw / 2, iy + ih * 0.53);
    font(0.031, 800);
    ctx.fillStyle = '#e9ddff';
    ctx.fillText(`${cand.length}개 중 하나 · 각 ${pc}%`, ix + iw / 2, iy + ih * 0.83);
  } else {
    font(0.029, 900);
    ctx.fillStyle = 'rgba(255,240,214,.8)';
    ctx.textAlign = 'left';
    ctx.fillText('다음', ix + R(0.012), iy + ih * 0.16);
    const k0 = s.queue[0], k1 = s.queue[1];
    if (k0) {
      drawDie(ctx, ix + iw * 0.24, iy + ih * 0.47, R(0.058), k0, 1, { t, face: 'happy' });
      font(0.036, 900);
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(KIND[k0].name, ix + iw * 0.4, iy + ih * 0.42);
      font(0.026, 800);
      ctx.fillStyle = '#ffe9c0';
      ctx.textAlign = 'center';
      ctx.fillText(KIND[k0].what, ix + iw * 0.5, iy + ih * 0.88, iw - 8);
    }
    if (k1) {
      font(0.028, 900);
      ctx.fillStyle = 'rgba(255,240,214,.55)';
      ctx.textAlign = 'center';
      ctx.fillText('그다음', ix + iw * 0.84, iy + ih * 0.2);
      drawDie(ctx, ix + iw * 0.84, iy + ih * 0.5, R(0.042), k1, 1, { t });
    }
  }
  // ═════════ 별 줄 ═════════
  const st = starState(s), labels = ['성 지키기', '하트 하나도 안 잃기', goalText(d.goal)];
  const chip = (k: number, cx: number, cy: number, cw: number) => {
    const v = st[k];
    ctx.fillStyle = v === true ? 'rgba(255,209,102,.32)' : v === false ? 'rgba(0,0,0,.3)' : 'rgba(255,240,210,.12)';
    rrect(ctx, cx, cy - R(0.024), cw, R(0.048), R(0.024));
    ctx.fill();
    font(0.033, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = v === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
    ctx.fillText(`${v === true ? '★' : v === false ? '✗' : '☆'} ${labels[k]}`, cx + cw / 2, cy + 1, cw - 8);
  };
  chip(0, X(0.03), Y(1.3), X(0.37));
  chip(1, X(0.41), Y(1.3), X(0.56));
  chip(2, X(0.03), Y(1.355), X(0.94));
  // 안내 한 줄
  let tip = d.tip;
  if (s.stage === 0 && s.summons === 0) tip = '👆 🎲 부르기를 톡 → 주사위가 성벽에 데굴!';
  else if (sd) tip = '반짝이는 짝을 톡 → 합체! (다른 곳 톡 = 취소)';
  else if (s.phase === 'result') tip = s.ok ? (s.won ? '성을 끝까지 지켰어요!' : '다음 판이 와요 — 주사위는 그대로!') : '성문이 뚫렸어요…';
  else if (full) tip = '자리가 꽉! 같은 주사위 둘을 톡톡 → 합체로 비워요';
  else if (s.stage === 0 && !s.seen.has('merge')) tip = '👆 같은 그림·같은 눈 둘을 차례로 톡 → 합체!';
  font(0.034, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,240,214,.92)';
  ctx.fillText(tip, w / 2, Y(1.41), w - 12);
  ctx.textBaseline = 'alphabetic';
  void th;
}

function drawHud(ctx: CanvasRenderingContext2D, s: DiceState, w: number, X: XY, Y: XY, R: XY, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, d = STAGES[s.stage];
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(30,40,20,.82)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff6d6';
  ctx.fillText(`${s.stage + 1}/${STAGE_COUNT}판 ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 파도 줄: 지금 몇 번째 · 다음 파도에 무엇이
  const cur = s.si > 0 ? s.spawns[s.si - 1].wave : -1, nw = d.waves.length;
  const nextW = s.si < s.spawns.length ? s.spawns[s.si].wave : -1;
  ctx.fillStyle = 'rgba(30,40,20,.55)';
  ctx.fillRect(0, hb, w, R(0.04));
  font(0.03, 800);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8f5d8';
  const wv = `파도 ${Math.max(1, cur + 1)}/${nw}${cur === nw - 1 ? ' 👑 대장!' : ''}`;
  ctx.fillText(wv, R(0.03), hb + R(0.021));
  if (nextW >= 0 && nextW !== cur) {
    const grp = d.waves[nextW].map(([ty, n]) => `${FOE_ICON[ty]}×${n}`).join(' ');
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff3c4';
    ctx.fillText(`다음 파도 ${grp}`, w - R(0.03), hb + R(0.021));
  }
  // ═════════ 판 카드: 시작 · 결과 ═════════
  let head = '', sub = '', nw2 = '', col = '#ffffff', age = 0, a = 1;
  if (s.phase === 'result') {
    age = s.pt;
    if (s.ok) (head = s.won ? '성을 끝까지 지켰다! 🎉' : `${d.emoji} 성 지키기 성공!`), (sub = `하트 ${s.lost ? `-${s.lost}` : '그대로'} · ${goalText(d.goal)} ${goalMet(s, true) ? '✓' : '✗'}`), (col = '#ffd84a');
    else (head = '성문이 뚫렸어요!'), (sub = '하트를 다 잃었어요 — 몬스터들이 성에서 파티를…'), (col = '#ffb3a8');
  } else if (s.pt < CARD_T && (s.stageTaps === 0 || s.pt < 50)) {
    age = s.pt;
    a = Math.min(1, (CARD_T - s.pt) / 20);
    head = `${s.stage + 1}판 · ${d.name}`;
    sub = `파도 ${nw}개 · 마지막은 👑 대장`;
    nw2 = s.stage === 0 ? '🎲 부르기를 톡 → 주사위가 데굴!' : `NEW ${d.news}`;
  }
  if (head) {
    const sc = Math.min(1, 0.6 + age / 12), cy = Y(0.2), chh = nw2 ? 0.17 : 0.12;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(35,30,20,.9)';
    rrect(ctx, -R(0.46), -R(0.05), R(0.92), R(chh), R(0.035));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    font(0.05, 900);
    ctx.fillStyle = col;
    ctx.fillText(head, 0, -R(0.012), R(0.88));
    font(0.033, 800);
    ctx.fillStyle = '#f3ead8';
    ctx.fillText(sub, 0, R(0.035), R(0.88));
    if (nw2) {
      font(0.033, 900);
      ctx.fillStyle = '#fff3a0';
      ctx.fillText(nw2, 0, R(0.08), R(0.88));
    }
    ctx.restore();
    if (s.phase === 'result' && s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc2 = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.075 * sc2, 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.4)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.31));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.31), '#ffe066', 14, 3, 2.4);
      }
    }
  }
  // 새것 알림 띠 (카드가 없을 때)
  if (!head && s.news && t - s.news.t < NEWS_T) {
    const ag = t - s.news.t, al = Math.min(1, ag / 10, (NEWS_T - ag) / 20);
    ctx.globalAlpha = al;
    font(0.033, 900);
    ctx.textAlign = 'center';
    const tw = Math.min(w - 10, ctx.measureText(s.news.text).width + 22), ny = Y(0.135);
    ctx.fillStyle = 'rgba(35,30,20,.9)';
    rrect(ctx, w / 2 - tw / 2, ny - R(0.026), tw, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(s.news.text, w / 2, ny + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // 첫 판 손가락: 부르기 단추 → 합칠 짝
  if (s.stage === 0 && s.phase === 'play' && s.pt > 60) {
    let fxp = -1, fyp = -1;
    if (s.summons === 0) (fxp = (BTN.x0 + BTN.x1) / 2), (fyp = BTN.y0 + 0.07);
    else if (!s.seen.has('merge')) {
      outer: for (let a2 = 0; a2 < NSLOT; a2++)
        for (let b = 0; b < NSLOT; b++)
          if (canMerge(s, a2, b)) {
            const tgt = s.sel === a2 ? b : a2;
            [fxp, fyp] = slotXY(tgt);
            break outer;
          }
    }
    if (fxp >= 0) {
      const bob = Math.sin(t * 0.15) * R(0.012);
      ctx.font = `${Math.max(18, R(0.07))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(fxp) + R(0.02), Y(fyp) + R(0.06) + bob);
    }
  }
  ctx.textBaseline = 'alphabetic';
}
