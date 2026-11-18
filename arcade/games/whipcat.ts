/**
 * 채찍 고양이 보안관 (31라운드: 실시간 액션) — 채찍 휘두르기 × 가리키기 × 콤보 피버.
 * 조작(손이 하는 일은 하나): 화면을 꾹 누르면 보안관 고양이가 채찍을 머리 위로 휙휙 돌리며 힘을 모으고(누르는 동안 손가락 쪽으로
 *   채찍이 닿을 선과 '끝'이 보인다), 떼는 순간 손가락 쪽으로 '철썩!'. 키보드는 화살표로 커서 + 스페이스(꾹 = 모으기, 떼기 = 철썩).
 * 규칙(결정적): 오래 모을수록 채찍이 길어진다(0.17 → 0.42). **채찍 끝(마지막 TIP)** 에 맞은 쥐는 크게 날아가 끝장이고, 몸통에 맞은
 *   쥐는 살짝 밀리고 어질어질할 뿐이다. 날아가는 쥐는 부딪힌 쥐·화약통을 연달아 쓰러뜨린다(연쇄). 돌아가는 채찍에 닿은 쥐도 튕긴다.
 *   그래서 '얼마나 모을지(끝이 어디 떨어질지)'와 '어느 쪽으로(줄 선 쥐를 한 번에)'가 수다. 너무 오래 돌리면 채찍이 몸에 감겨 꽁꽁.
 * 와우: 첫 꾹-떼기에 화약통이 '펑!' 터지며 쥐 셋이 데굴데굴 하늘로.
 * 판 6개: 쥐 도둑을 모두 쫓아내면 판 끝. 쥐가 금고 앞 돈자루를 들고 광장 밖으로 달아나면 그 자루는 잃는다(자루 든 쥐를 치면 되찾음).
 *   자루를 다 잃으면 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 6판을 마치면 끝.
 *   별 = ★ 판 깨기 · ★ 금고 지키기(자루를 하나도 안 잃음) · ★ 판마다 다른 한 줄(통으로 쥐 셋 · 한 번에 셋 · 채찍 N번 안에 · 선인장으로 셋 · 굴 둘 막기).
 * 펼쳐짐(하는 일이 바뀐다): 1판 화약통(치면 펑) → 2판 쥐 줄(줄을 따라 쳐서 우르르) → 3판 냄비 방패 쥐(채찍을 막음 → 빙빙 도는 채찍으로
 *   방패를 벗기거나 날아온 쥐로 맞힘) → 4판 선인장(채찍이 걸림 → 쥐를 선인장 쪽으로 밀면 따끔) → 5판 두더지 굴(흙이 들썩일 때 채찍 끝으로
 *   탁 막기) → 6판 대장 쥐(채찍 끝으로 세 번). 연속으로 맞히면 콤보, 넷이면 불꽃 채찍 피버(끝이 두 배로 길다).
 * 웃음: 날아가는 쥐는 팔다리를 쫙 펴고 '으악~', 선인장에 박힌 쥐는 엉덩이를 붙잡고 펄쩍, 너무 오래 돌리면 고양이가 채찍에 칭칭 감겨
 *   어질어질. 울타리 위 암탉 둘이 큰 순간마다 '꼬꼬댁!' 하고 날개를 퍼덕인다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const TAU = Math.PI * 2;
/** 광장 평면: x 0~1(왼→오), y 0~1(먼 건물 쪽 → 가까운 울타리 쪽). 고양이(금고)는 가운데 */
const CX = 0.5, CY = 0.53;
/** 화면 배치(가로 폭 단위): 평면 y → 화면 PY0 + y·KY, 높이 z는 그만큼 위로 */
const PY0 = 0.335, KY = 0.8;
const HUD_B = 1.285;

// ── 채찍 ──
/** 다 모으는 데 걸리는 틱 · 길이(힘 0 → 1) · 채찍 끝 길이 · 맞는 폭(반) */
const CHARGE_T = 48, L0 = 0.17, L1 = 0.42, TIP = 0.085, TIP_FEVER = 0.17, HW = 0.028;
/** 떼고 나서 철썩까지 · 다시 모을 수 있을 때까지 */
const CRACK = 6, BUSY = 19;
/** 이만큼 넘게 돌리면 꽁꽁 감김 · 감긴 채 있는 시간 · 경고 시작 */
const TANGLE_T = 200, TANGLE_D = 70, WARN_T = 140;
/** 돌아가는 채찍: 반지름 · 각속도 */
const spinR = (p: number) => 0.07 + 0.09 * p;
const spinW = (p: number) => 0.2 + 0.16 * p;
const reach = (p: number) => L0 + (L1 - L0) * p;

// ── 쥐 ──
const RAT = 0, SHIELD = 1, BOSS = 2;
const WALK = 0, STUN = 1, FLY = 2, CARRY = 3, HIDE = 4, GONE = 5;
const RR = [0.03, 0.032, 0.052];
/** 금고(돈자루 더미) 반지름 · 달아나면 잃는 거리 · 생기는 거리 */
const SAFE_R = 0.07, ESCAPE = 0.6, SPAWN_D = 0.62;
/** 끝에 맞아 날아가는 속도 · 몸통에 밀리는 속도 · 돌아가는 채찍에 튕기는 속도 */
const KO_V = 0.021, BODY_V = 0.0095, SPIN_V = 0.008;
const G = 0.0011, CHAIN_V = 0.0065, BLAST_R = 0.15, FUSE = 4;
/** 선인장 키 (이보다 낮게 나는 쥐는 박힌다) */
const CACTUS_H = 0.06, ARM = 1.5;
/** 두더지 굴: 흙이 들썩이는 시간(이때 채찍 끝으로 치면 막힘) */
const WARN_H = 75;
const RESULT_OK = 190, RESULT_FAIL = 170, CARD_T = 150, SPOT_T = 95, NEWS_T = 170, FEVER_T = 330, FEVER_N = 4;
const STAR_PTS = 100, KO_PTS = 1, BAG_PTS = 10, WIN_PTS = 500;

type Special = 'barrel' | 'multi' | 'par' | 'cactus' | 'plug';
interface StageDef {
  key: string;
  name: string;
  /** 처음 나올 때 스포트라이트 딱지 */
  spot: string;
  /** 판 카드 셋째 줄 (새것 한 줄) */
  news: string;
  hint: string;
  bags: number;
  spd: number;
  special: Special;
  need: number;
  /** [x, y] 금고에서의 거리 */
  barrels: number[][];
  /** [각도(도), 거리, 반지름] */
  cacti: number[][];
  /** [각도(도), 거리] */
  holes: number[][];
  /** 처음부터 광장에 있는 쥐 [dx, dy, 종류] */
  init: number[][];
  /** [초, 각도(도) 또는 굴 번호, 'r'쥐·'s'방패·'b'대장, 모양 0 무리·1 줄·2 굴] */
  waves: [number, number, string, number][];
}

export const STAGES: StageDef[] = [
  {
    key: 'barrel', name: '화약통', spot: '', news: '빨간 화약통 — 채찍으로 치면 펑!', hint: '통 둘레에 쥐가 모이면 통을 철썩!',
    bags: 6, spd: 0.05, special: 'barrel', need: 3,
    barrels: [[0.185, 0.0], [-0.24, 0.13], [-0.05, -0.27], [0.06, 0.3]], cacti: [], holes: [],
    init: [[0.255, -0.08, RAT], [0.295, 0.072, RAT], [0.205, 0.092, RAT]],
    waves: [[2.6, 186, 'rr', 0], [5.5, 160, 'rr', 0], [9, 90, 'rr', 1], [12, 300, 'rr', 0]],
  },
  {
    key: 'line', name: '쥐 줄', spot: '쥐 줄 — 줄을 따라 치면 우르르!', news: '한 줄로 오는 쥐 — 맨 앞을 끝으로 치면 우르르', hint: '줄 선 쥐는 맨 앞을 채찍 끝으로!',
    bags: 5, spd: 0.056, special: 'multi', need: 3,
    barrels: [[0.02, 0.3], [-0.22, -0.2]], cacti: [], holes: [], init: [],
    waves: [[0.8, 0, 'rrrr', 1], [4, 180, 'rrrr', 1], [7.5, 268, 'rrrr', 1], [11, 90, 'rrrr', 1], [14, 40, 'rrr', 1]],
  },
  {
    key: 'shield', name: '냄비 방패', spot: '냄비 방패 — 채찍을 막아요! 빙빙 도는 채찍으로 벗겨요', news: '냄비 방패 쥐 — 꾹 눌러 빙빙 돌려 방패를 벗겨요', hint: '방패 쥐가 가까이 오면 꾹 — 돌아가는 채찍이 방패를 벗겨요',
    bags: 4, spd: 0.064, special: 'par', need: 12,
    barrels: [[-0.21, -0.15], [0.23, 0.17]], cacti: [], holes: [], init: [],
    waves: [[0.8, 180, 'srr', 0], [4, 0, 'rsr', 1], [7, 95, 'ss', 0], [9.5, 270, 'rrrr', 1], [12, 135, 'srs', 0], [14, 40, 'rr', 0]],
  },
  {
    key: 'cactus', name: '선인장', spot: '선인장 — 채찍이 걸려요. 쥐를 날려 박으면 따끔!', news: '선인장 — 쥐를 선인장 쪽으로 날리면 따끔!', hint: '선인장 쪽으로 쥐를 날려요 (채찍은 선인장에 걸려요)',
    bags: 4, spd: 0.066, special: 'cactus', need: 3,
    barrels: [[-0.2, -0.22]], cacti: [[2, 0.42, 0.034], [92, 0.4, 0.034], [178, 0.42, 0.034], [272, 0.41, 0.034]], holes: [], init: [],
    waves: [[0.8, 0, 'rrr', 0], [1.1, 178, 'rrr', 0], [5.5, 92, 'rrr', 0], [5.8, 272, 'rrs', 0], [10.5, 2, 'rrr', 0], [10.8, 178, 'rrr', 0], [11.2, 92, 'rr', 0]],
  },
  {
    key: 'hole', name: '두더지 굴', spot: '두더지 굴 — 흙이 들썩일 때 채찍 끝으로 탁!', news: '두더지 굴 — 들썩일 때 끝으로 치면 막혀요', hint: '흙이 들썩이는 굴을 채찍 끝으로 탁 막아요',
    bags: 4, spd: 0.07, special: 'plug', need: 2,
    barrels: [[0.25, -0.2]], cacti: [], holes: [[62, 0.24], [196, 0.26], [300, 0.245]], init: [],
    waves: [[1.2, 105, 'rrr', 0], [2.6, 0, 'r', 2], [5, 1, 'r', 2], [6.4, 18, 'rrr', 1], [8, 2, 'r', 2], [9.5, 0, 'r', 2], [11, 1, 'r', 2], [12, 250, 'rrs', 0], [13, 2, 'r', 2], [14.5, 0, 'r', 2], [15.2, 1, 'r', 2], [16, 2, 'r', 2]],
  },
  {
    key: 'boss', name: '대장 쥐', spot: '대장 쥐 — 채찍 끝으로 세 번 철썩!', news: '대장 쥐 — 끝으로 세 번 맞혀야 날아가요', hint: '대장 쥐는 채찍 끝으로 세 번!',
    bags: 5, spd: 0.072, special: 'par', need: 13,
    barrels: [[-0.2, 0.2], [0.22, -0.18]], cacti: [[120, 0.3, 0.03], [-20, 0.33, 0.03]], holes: [], init: [],
    waves: [[0.8, 270, 'b', 0], [1.2, 235, 'ss', 0], [1.2, 305, 'rr', 0], [5, 0, 'rrrr', 1], [8, 180, 'rsr', 1], [11, 90, 'rrr', 1], [13, 45, 'rr', 0], [14, 140, 'rr', 0]],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Rat {
  id: number; k: number; st: number;
  x: number; y: number; vx: number; vy: number; z: number; vz: number;
  hp: number; shield: boolean; stun: number; spd: number; bag: boolean;
  by: number; spinT: number; hole: number; wait: number; land: number; take: number; pricked: boolean;
  // 연출 (시뮬레이션 결과와 무관)
  face: number; rot: number; vrot: number; ph: number; mood: number; moodT: number; flash: number;
}
interface Barrel { x: number; y: number; st: number; fuse: number; by: number }
interface Cactus { x: number; y: number; r: number; wob: number }
interface Hole { x: number; y: number; plugged: boolean; shake: number }
interface Strike { t0: number; a: number; L: number; cut: number; id: number; p: number; from: number; snag: number; done: boolean; fever: boolean }
interface Spawn { t: number; k: number; x: number; y: number; hole: number; spd: number }
interface Ev { t: number; kind: string; x: number; y: number; z: number; text?: string; n?: number }

export interface WhipState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result'; pt: number;
  rats: Rat[]; barrels: Barrel[]; cacti: Cactus[]; holes: Hole[]; queue: Spawn[]; rid: number; sid: number;
  bags: number; bagMax: number; lost: number;
  down: boolean; aim: { x: number; y: number } | null; aimA: number; hold: number; spinA: number; spinRev: number;
  strike: Strike | null; queued: boolean; tangle: number; freeze: number; slow: number;
  strikes: number; kos: number; barrelKos: number; cactusKos: number; plugs: number; best: number; skos: number[];
  combo: number; fever: number; firstDone: boolean; lastStrikeT: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  dead: boolean; won: boolean; again: boolean; tries: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  spot: number; spotDone: boolean[]; spotX: number; spotY: number;
  cat: { mood: number; moodT: number; face: number }; cheer: number;
}

const ev = (s: WhipState, kind: string, x: number, y: number, text?: string, n?: number, z = 0) => s.events.push({ t: s.t, kind, x, y, z, text, n });
function see(s: WhipState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const wrapA = (a: number) => ((((a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
const dist = (x: number, y: number) => Math.hypot(x - CX, y - CY);
const active = (r: Rat) => r.st === WALK || r.st === STUN || r.st === CARRY;
const busy = (s: WhipState) => !!s.strike && s.t - s.strike.t0 < BUSY;
const tipLen = (s: WhipState) => (s.fever > 0 ? TIP_FEVER : TIP);
export const power = (s: WhipState) => Math.min(1, s.hold / CHARGE_T);
/** 화면(가로 폭 단위) → 광장 평면 */
const toPlane = (sx: number, sy: number) => ({ x: sx, y: (sy - PY0) / KY });

// ───────────────────────────── 판 ─────────────────────────────
function mkRat(s: WhipState, k: number, x: number, y: number, spd: number): Rat {
  return {
    id: s.rid++, k, st: WALK, x, y, vx: 0, vy: 0, z: 0, vz: 0, hp: k === BOSS ? 3 : 1, shield: k === SHIELD, stun: 0, spd, bag: false,
    by: -1, spinT: -99, hole: -1, wait: 0, land: 0, take: 0, pricked: false, face: x < CX ? 1 : -1, rot: 0, vrot: 0, ph: s.rng() * TAU, mood: 0, moodT: 0, flash: 0,
  };
}

function newStage(s: WhipState) {
  const d = STAGES[s.stage], r = s.rng;
  const deg = (a: number) => (a * Math.PI) / 180;
  s.st = 0;
  s.rats = [];
  s.barrels = d.barrels.map(([x, y]) => ({ x: CX + x, y: CY + y, st: 0, fuse: 0, by: -1 }));
  s.cacti = d.cacti.map(([a, dd, rr]) => ({ x: CX + Math.cos(deg(a)) * dd, y: CY + Math.sin(deg(a)) * dd, r: rr, wob: 0 }));
  s.holes = d.holes.map(([a, dd]) => ({ x: CX + Math.cos(deg(a)) * dd, y: CY + Math.sin(deg(a)) * dd, plugged: false, shake: 0 }));
  for (const [x, y, k] of d.init) s.rats.push(mkRat(s, k, CX + x, CY + y, (d.spd / 60) * 0.62));
  s.queue = [];
  const kindOf = (c: string) => (c === 's' ? SHIELD : c === 'b' ? BOSS : RAT);
  for (const [sec, a, ks, form] of d.waves) {
    const t0 = Math.round(sec * 60);
    if (form === 2) {
      const h = s.holes[a];
      for (let i = 0; i < ks.length; i++) s.queue.push({ t: t0 + i * 40, k: kindOf(ks[i]), x: h.x, y: h.y, hole: a, spd: (d.spd / 60) * 1.05 });
      continue;
    }
    const aj = deg(a + (r() - 0.5) * 10), ux = Math.cos(aj), uy = Math.sin(aj);
    for (let i = 0; i < ks.length; i++) {
      const k = kindOf(ks[i]);
      const base = (d.spd / 60) * (k === BOSS ? 0.62 : k === SHIELD ? 0.92 : 1);
      if (form === 1) {
        const dd = SPAWN_D + i * 0.075;
        s.queue.push({ t: t0, k, x: CX + ux * dd, y: CY + uy * dd, hole: -1, spd: base });
      } else {
        const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.06 + (r() - 0.5) * 0.02, back = (r() - 0.5) * 0.05 + (i ? 0.03 : 0);
        s.queue.push({ t: t0 + Math.floor(r() * 12), k, x: CX + ux * (SPAWN_D + back) - uy * side, y: CY + uy * (SPAWN_D + back) + ux * side, hole: -1, spd: base * (0.92 + r() * 0.16) });
      }
    }
  }
  s.queue.sort((a, b) => a.t - b.t);
  s.bags = s.bagMax = d.bags;
  s.lost = 0;
  s.down = false;
  s.aim = null;
  s.hold = 0;
  s.strike = null;
  s.queued = false;
  s.tangle = 0;
  s.freeze = 0;
  s.slow = 0;
  s.strikes = s.kos = s.barrelKos = s.cactusKos = s.plugs = s.best = 0;
  s.skos = [];
  s.combo = 0;
  s.fever = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.lastStrikeT = s.t;
  if (d.key && d.key !== 'barrel') s.seen.add(d.key);
}

// ───────────────────────────── 채찍 ─────────────────────────────
function release(s: WhipState) {
  if (s.phase !== 'play' || s.tangle > 0) return void (s.hold = 0);
  if (busy(s)) return void (s.queued = true);
  doStrike(s, power(s));
}

function doStrike(s: WhipState, p: number) {
  let a = s.aimA;
  // 처음 한 번: 손이 대충 그쪽이면 화약통으로 (첫 손짓에 큰 일)
  if (!s.firstDone) {
    s.firstDone = true;
    let bd = -9, ba = a;
    for (const b of s.barrels) {
      if (b.st || dist(b.x, b.y) > reach(p) + 0.05) continue;
      const bb = Math.atan2(b.y - CY, b.x - CX), n = s.rats.filter((r) => Math.hypot(r.x - b.x, r.y - b.y) < BLAST_R).length;
      const v = n * 10 - Math.abs(wrapA(bb - a));
      if (v > bd) (bd = v), (ba = bb);
    }
    a = ba;
  }
  const L = reach(p), ux = Math.cos(a), uy = Math.sin(a);
  let cut = L, snag = -1;
  s.cacti.forEach((c, i) => {
    const tx = c.x - CX, ty = c.y - CY, along = tx * ux + ty * uy, perp = Math.abs(-tx * uy + ty * ux);
    if (along > 0 && perp < c.r + 0.012 && along - c.r * 0.5 < cut) (cut = Math.max(0.06, along - c.r * 0.5)), (snag = i);
  });
  s.strike = { t0: s.t, a, L, cut, id: ++s.sid, p, from: s.spinA, snag, done: false, fever: s.fever > 0 };
  s.skos[s.sid] = 0;
  s.strikes++;
  s.hold = 0;
  s.lastStrikeT = s.t;
  s.cat.face = ux >= 0 ? 1 : -1;
  ev(s, 'swing', CX + ux * L * 0.5, CY + uy * L * 0.5, undefined, p);
}

function ko(s: WhipState, r: Rat, vx: number, vy: number, vz: number, by: number, how: string) {
  if (r.bag) recover(s, r);
  r.st = FLY;
  r.vx = vx;
  r.vy = vy;
  r.vz = vz;
  r.z = Math.max(r.z, 0.004);
  r.by = by;
  r.shield = false;
  r.land = 0;
  r.vrot = (vx >= 0 ? 1 : -1) * (0.25 + Math.hypot(vx, vy) * 8);
  r.mood = 2;
  s.kos++;
  s.pts += KO_PTS;
  if (how === 'barrel') s.barrelKos++;
  if (how === 'cactus') s.cactusKos++;
  if (by > 0) {
    const n = ++s.skos[by];
    s.best = Math.max(s.best, n);
    if (n === 3) (s.slow = Math.max(s.slow, 40)), ev(s, 'multi', r.x, r.y, '한 번에 셋!', 3), see(s, 'multi', '세 마리 넘게 한 번에 날리면 느린 화면!');
    else if (n === 5 || n === 8) ev(s, 'multi', r.x, r.y, n === 5 ? '한 번에 다섯!!' : '한 번에 여덟!!!', n), (s.slow = Math.max(s.slow, 40));
  }
  if (r.k === BOSS) (s.slow = Math.max(s.slow, 60)), ev(s, 'bossko', r.x, r.y, '대장 쥐 날아간다~!');
  else ev(s, 'ko', r.x, r.y, how === 'cactus' ? '따끔!!' : how === 'chain' ? '와르르!' : ['으악~', '찍!', '살려줘~', '으아앙'][r.id % 4]);
}

function recover(s: WhipState, r: Rat) {
  r.bag = false;
  s.bags += Math.max(1, r.take);
  r.take = 0;
  ev(s, 'recover', r.x, r.y, '자루 되찾았다!');
  see(s, 'recover', '자루 든 쥐를 치면 자루가 금고로 돌아와요');
}

function hitBoss(s: WhipState, r: Rat, ux: number, uy: number, dmg: number, by: number) {
  r.hp -= dmg;
  r.flash = 12;
  if (r.hp <= 0) return ko(s, r, ux * KO_V * 1.1, uy * KO_V * 1.1, 0.02, by, 'tip');
  r.st = STUN;
  r.stun = 55;
  r.vx = ux * 0.013;
  r.vy = uy * 0.013;
  s.freeze = Math.max(s.freeze, 4);
  ev(s, 'bosshit', r.x, r.y, r.hp === 1 ? '아야! 한 번 더!' : '아야야!', r.hp);
}

/** 철썩: 채찍 줄 위의 것들을 친다. 끝(마지막 TIP)은 날려 보내고, 몸통은 살짝 민다 */
function resolve(s: WhipState, k: Strike) {
  const ux = Math.cos(k.a), uy = Math.sin(k.a), tipFrom = k.cut - (k.fever ? TIP_FEVER : TIP);
  let any = false, tipHit = false;
  for (const b of s.barrels) {
    if (b.st) continue;
    const tx = b.x - CX, ty = b.y - CY, along = tx * ux + ty * uy, perp = Math.abs(-tx * uy + ty * ux);
    if (along > 0.03 && along < k.cut + 0.03 && perp < HW + 0.034) (b.st = 1), (b.fuse = FUSE), (b.by = k.id), (any = true), ev(s, 'lit', b.x, b.y, '치익-');
  }
  for (const h of s.holes) {
    if (h.plugged) continue;
    const tx = h.x - CX, ty = h.y - CY, along = tx * ux + ty * uy, perp = Math.abs(-tx * uy + ty * ux);
    if (along < tipFrom - 0.02 || along > k.cut + 0.05 || perp > 0.05) continue;
    const hid = s.rats.filter((r) => r.st === HIDE && r.hole === s.holes.indexOf(h));
    if (!hid.length) continue; // 흙이 들썩일 때만 막힌다
    h.plugged = true;
    s.plugs++;
    any = tipHit = true;
    for (const r of hid) (r.st = GONE), s.kos++, (s.pts += KO_PTS), s.skos[k.id]++;
    const hi = s.holes.indexOf(h);
    const rest = s.queue.filter((q) => q.hole === hi).length;
    s.queue = s.queue.filter((q) => q.hole !== hi);
    s.kos += rest;
    s.pts += rest * KO_PTS;
    s.best = Math.max(s.best, s.skos[k.id]);
    ev(s, 'plug', h.x, h.y, rest ? `굴 막음! 쏙 갇힘 ×${rest + hid.length}` : '굴 막음!');
    see(s, 'plug', '막힌 굴에서는 더 안 나와요');
  }
  for (const r of s.rats) {
    if (!active(r)) continue;
    const rr = RR[r.k], tx = r.x - CX, ty = r.y - CY, along = tx * ux + ty * uy, perp = Math.abs(-tx * uy + ty * ux);
    if (along < 0.02 || along > k.cut + rr || perp > HW + rr) continue;
    any = true;
    const tip = along >= tipFrom;
    if (r.k === SHIELD && r.shield) {
      r.stun = Math.max(r.stun, 8);
      r.flash = 10;
      ev(s, 'block', r.x, r.y, '텅!');
      see(s, 'block', '냄비 방패는 채찍을 막아요 — 돌아가는 채찍·날아온 쥐·화약통으로!');
      continue;
    }
    if (r.k === BOSS) {
      if (tip) {
        tipHit = true;
        if (r.bag) recover(s, r);
        hitBoss(s, r, ux, uy, 1, k.id);
      } else (r.vx += ux * 0.003), (r.vy += uy * 0.003), ev(s, 'block', r.x, r.y, '끄떡없지!');
      continue;
    }
    if (tip) {
      tipHit = true;
      const side = -tx * uy + ty * ux > 0 ? 1 : -1, f = k.fever ? 1.2 : 1;
      ko(s, r, (ux - uy * side * 0.15) * KO_V * f, (uy + ux * side * 0.15) * KO_V * f, 0.017, k.id, 'tip');
      see(s, 'tip', '채찍 끝에 맞으면 멀리 날아가요!');
    } else {
      if (r.bag) recover(s, r);
      r.st = STUN;
      r.stun = 50;
      r.vx = ux * BODY_V;
      r.vy = uy * BODY_V;
      r.mood = 1;
      r.moodT = 50;
      ev(s, 'body', r.x, r.y, '찌릿!');
      see(s, 'body', '몸통에 맞으면 살짝 밀리기만 해요 — 끝으로!');
    }
  }
  const tx = CX + ux * k.cut, ty = CY + uy * k.cut;
  if (k.snag >= 0) (s.cacti[k.snag].wob = 30), ev(s, 'snag', tx, ty, '걸렸다!'), see(s, 'snag', '선인장에 채찍이 걸려요 — 비껴 쳐요');
  ev(s, 'crack', tx, ty, tipHit ? '철썩!' : any ? '착!' : '휙~', k.p);
  if (any) s.freeze = Math.max(s.freeze, tipHit ? 3 : 2);
}

function explode(s: WhipState, b: Barrel) {
  b.st = 2;
  ev(s, 'boom', b.x, b.y, '펑!!');
  see(s, 'boom', '화약통이 터지면 둘레 쥐가 다 날아가요');
  s.freeze = Math.max(s.freeze, 4);
  s.cheer = s.t;
  for (const r of s.rats) {
    if (!(active(r) || r.st === HIDE)) continue;
    const dx = r.x - b.x, dy = r.y - b.y, d = Math.hypot(dx, dy) || 1e-6;
    if (d > BLAST_R + RR[r.k] || r.st === HIDE) continue;
    const v = 0.011 + 0.013 * (1 - d / (BLAST_R + RR[r.k]));
    if (r.k === BOSS) hitBoss(s, r, dx / d, dy / d, 2, b.by);
    else ko(s, r, (dx / d) * v, (dy / d) * v, 0.02, b.by, 'barrel');
  }
  for (const o of s.barrels) if (!o.st && Math.hypot(o.x - b.x, o.y - b.y) < BLAST_R + 0.03) (o.st = 1), (o.fuse = 7), (o.by = b.by);
  for (const c of s.cacti) if (Math.hypot(c.x - b.x, c.y - b.y) < BLAST_R + 0.05) c.wob = 24;
}

/** 걷기: 가려는 쪽(ux,uy)으로 v만큼. 앞을 막은 선인장은 정해진 쪽으로 끼고 돌아간다 (둘이 엇갈려 막히지 않게) */
function walk(s: WhipState, r: Rat, ux: number, uy: number, v: number) {
  let hx = ux, hy = uy;
  s.cacti.forEach((c, i) => {
    const dx = c.x - r.x, dy = c.y - r.y, d = Math.hypot(dx, dy) || 1e-6, m = c.r + RR[r.k] + 0.006;
    if (d > m + 0.07 || dx * ux + dy * uy <= 0) return;
    const side = -dx * uy + dy * ux, sense = Math.abs(side) / d > 0.35 ? (side > 0 ? -1 : 1) : i % 2 ? 1 : -1;
    const wgt = 1.6 * Math.min(1, (m + 0.07 - d) / 0.07);
    hx += (-dy / d) * sense * wgt;
    hy += (dx / d) * sense * wgt;
  });
  const hn = Math.hypot(hx, hy) || 1;
  r.x += (hx / hn) * v;
  r.y += (hy / hn) * v;
  for (const c of s.cacti) {
    const dx = r.x - c.x, dy = r.y - c.y, d = Math.hypot(dx, dy) || 1e-6, m = c.r + RR[r.k] + 0.004;
    if (d < m) (r.x = c.x + (dx / d) * m), (r.y = c.y + (dy / d) * m);
  }
  if (Math.abs(hx) > 0.05) r.face = hx > 0 ? 1 : -1;
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function tick(s: WhipState) {
  s.t++;
  s.st++;
  s.pt++;
  // 채찍: 모으기·돌리기
  if (s.tangle > 0) {
    s.tangle--;
    s.spinA += 0.25;
  } else if (s.down && s.phase === 'play' && !busy(s)) {
    s.hold++;
    const p = power(s), w = spinW(p), r0 = spinR(p), prev = s.spinA;
    s.spinA += w;
    if (Math.floor(s.spinA / TAU) !== Math.floor(prev / TAU)) (s.spinRev++), ev(s, 'whoosh', CX, CY, p >= 1 ? '휘익!!' : '휙!', p);
    if (s.hold === CHARGE_T) ev(s, 'full', CX, CY, '힘 가득!');
    if (s.hold === WARN_T) ev(s, 'warn', CX, CY, '어, 어지러…');
    if (s.hold >= TANGLE_T) {
      s.tangle = TANGLE_D;
      s.hold = 0;
      s.combo = 0;
      ev(s, 'tangle', CX, CY, '칭칭 꽁꽁~');
      see(s, 'tangle', '너무 오래 돌리면 채찍에 감겨요!');
    }
    // 돌아가는 채찍에 닿은 쥐는 튕긴다
    for (const r of s.rats) {
      if (!active(r) || s.t - r.spinT < 18) continue;
      const dd = dist(r.x, r.y);
      if (dd > r0 + RR[r.k] || dd < 0.02) continue;
      const ra = Math.atan2(r.y - CY, r.x - CX), diff = wrapA(ra - prev);
      if (diff < -0.05 || diff > w + RR[r.k] / dd) continue;
      r.spinT = s.t;
      const ux = (r.x - CX) / dd, uy = (r.y - CY) / dd, tx = -uy, ty = ux;
      if (r.bag) recover(s, r);
      if (r.k === BOSS) (r.vx = ux * 0.004), (r.vy = uy * 0.004), (r.st = STUN), (r.stun = 14), ev(s, 'bounce', r.x, r.y, '틱!');
      else {
        r.st = STUN;
        r.stun = r.k === SHIELD && r.shield ? 45 : 32;
        r.vx = ux * SPIN_V + tx * 0.003;
        r.vy = uy * SPIN_V + ty * 0.003;
        r.mood = 1;
        r.moodT = 30;
        if (r.k === SHIELD && r.shield) (r.shield = false), ev(s, 'shieldoff', r.x, r.y, '방패 탈탈!'), see(s, 'shieldoff', '돌아가는 채찍에 닿으면 방패가 날아가요');
        else ev(s, 'bounce', r.x, r.y, '틱!'), see(s, 'spin', '돌아가는 채찍에 닿은 쥐는 튕겨 나가요');
      }
    }
  }
  if (s.strike) {
    const k = s.strike;
    if (!k.done && s.t - k.t0 >= CRACK) (k.done = true), resolve(s, k);
    if (s.t - k.t0 === BUSY) {
      if (s.skos[k.id] > 0) {
        s.combo++;
        if (s.combo % FEVER_N === 0) (s.fever = FEVER_T), ev(s, 'fever', CX, CY, '불꽃 채찍 피버!'), see(s, 'fever', '연속 넷이면 불꽃 채찍 — 끝이 두 배!');
        else if (s.combo >= 2) ev(s, 'combo', CX, CY, `연속 ${s.combo}!`, s.combo);
      } else s.combo = 0;
      if (s.queued) (s.queued = false), doStrike(s, 0);
    }
    if (s.t - k.t0 > BUSY + 30) s.strike = null;
  }
  if (s.fever > 0) s.fever--;
  // 생겨나기
  while (s.phase === 'play' && s.queue.length && s.queue[0].t <= s.st) {
    const q = s.queue.shift()!;
    const r = mkRat(s, q.k, q.x, q.y, q.spd);
    if (q.hole >= 0) (r.st = HIDE), (r.hole = q.hole), (r.wait = WARN_H);
    s.rats.push(r);
  }
  // 쥐
  for (const r of s.rats) {
    if (r.st === GONE) continue;
    r.ph += r.st === WALK ? 0.32 : r.st === CARRY ? 0.4 : 0.1;
    if (r.flash > 0) r.flash--;
    if (r.moodT > 0 && --r.moodT === 0) r.mood = 0;
    if (r.st === HIDE) {
      const h = s.holes[r.hole];
      h.shake = Math.max(h.shake, 2);
      if (--r.wait <= 0) (r.st = WALK), (r.vz = 0.012), (r.z = 0.001), ev(s, 'pop', r.x, r.y, '뿅!'), see(s, 'pop', '흙이 들썩이던 굴에서 쥐가 뿅!');
      continue;
    }
    if (r.st === FLY) {
      r.x += r.vx;
      r.y += r.vy;
      r.z += r.vz;
      r.rot += r.vrot;
      if (r.z > 0) (r.vz -= G), (r.vx *= 0.99), (r.vy *= 0.99);
      if (r.z <= 0) {
        r.z = 0;
        if (r.vz < -0.005) (r.vz = -r.vz * 0.42), (r.vx *= 0.7), (r.vy *= 0.7), (r.vrot *= 0.6), ev(s, 'thud', r.x, r.y);
        else (r.vz = 0), (r.vx *= 0.86), (r.vy *= 0.86), (r.vrot *= 0.85), r.land++;
      }
      if (r.land > 45 || r.x < -0.2 || r.x > 1.2 || r.y < -0.25 || r.y > 1.3) (r.st = GONE), r.land > 45 && ev(s, 'poof', r.x, r.y);
      continue;
    }
    if (r.z > 0 || r.vz > 0) (r.z += r.vz), (r.vz -= G), r.z <= 0 && ((r.z = 0), (r.vz = 0));
    const dd = dist(r.x, r.y) || 1e-6, ux = (CX - r.x) / dd, uy = (CY - r.y) / dd;
    if (r.st === STUN) {
      r.x += r.vx;
      r.y += r.vy;
      const sp = Math.hypot(r.vx, r.vy);
      r.vx *= 0.87;
      r.vy *= 0.87;
      if (sp > 0.0022)
        for (const c of s.cacti) {
          if (Math.hypot(r.x - c.x, r.y - c.y) > c.r + RR[r.k]) continue;
          const nx = (r.x - c.x) / (Math.hypot(r.x - c.x, r.y - c.y) || 1), ny = (r.y - c.y) / (Math.hypot(r.x - c.x, r.y - c.y) || 1);
          c.wob = 24;
          if (r.k === BOSS) (r.vx = nx * 0.006), (r.vy = ny * 0.006), hitBoss(s, r, nx, ny, 1, -1);
          else (r.pricked = true), (r.mood = 4), ko(s, r, nx * 0.012, ny * 0.012, 0.024, r.by > 0 ? r.by : -1, 'cactus'), see(s, 'cactus', '날아간 쥐가 선인장에 박히면 따끔!');
          break;
        }
      if (r.st !== STUN) continue;
      if (--r.stun <= 0) r.st = r.bag ? CARRY : WALK;
    } else if (r.st === WALK) {
      if (dd > SAFE_R + RR[r.k]) {
        const v = Math.min(r.spd, dd - SAFE_R - RR[r.k] + 0.0005);
        walk(s, r, ux, uy, v);
      } else if (s.bags > 0 && s.phase === 'play') {
        const take = r.k === BOSS ? Math.min(2, s.bags) : 1;
        s.bags -= take;
        r.bag = true;
        r.st = CARRY;
        r.mood = 3;
        s.cat.mood = 4;
        s.cat.moodT = 50;
        ev(s, 'grab', r.x, r.y, take > 1 ? '자루 두 개 슬쩍!' : '자루 슬쩍!');
        see(s, 'grab', '자루 든 쥐가 광장 밖으로 나가면 그 자루는 잃어요');
        r.take = take;
      }
    } else if (r.st === CARRY) {
      walk(s, r, -ux, -uy, r.spd * 0.85);
      if (dd > ESCAPE) {
        r.st = GONE;
        s.lost += r.take;
        ev(s, 'escape', r.x, r.y, '자루를 잃었다…');
      }
    }
  }
  // 날아가는 쥐 → 연쇄
  for (const f of s.rats) {
    if (f.st !== FLY || f.z > CACTUS_H) continue;
    const sp = Math.hypot(f.vx, f.vy);
    if (sp < CHAIN_V) continue;
    for (const o of s.rats) {
      if (f.z > 0.075) break;
      if (o === f || !active(o)) continue;
      const dx = o.x - f.x, dy = o.y - f.y, d2 = Math.hypot(dx, dy) || 1e-6;
      if (d2 > RR[o.k] + RR[f.k] + 0.006) continue;
      const nx = dx / d2 * 0.55 + (f.vx / sp) * 0.45, ny = dy / d2 * 0.55 + (f.vy / sp) * 0.45, nn = Math.hypot(nx, ny) || 1;
      if (o.k === BOSS) {
        hitBoss(s, o, nx / nn, ny / nn, 1, f.by);
        f.vx = -f.vx * 0.4;
        f.vy = -f.vy * 0.4;
      } else {
        ko(s, o, (nx / nn) * sp * 0.85, (ny / nn) * sp * 0.85, 0.016, f.by, 'chain');
        see(s, 'chain', '날아간 쥐가 다른 쥐를 맞히면 와르르!');
        f.vx *= 0.82;
        f.vy *= 0.82;
      }
      s.freeze = Math.max(s.freeze, 2);
    }
    for (const b of s.barrels) if (!b.st && Math.hypot(b.x - f.x, b.y - f.y) < 0.034 + RR[f.k]) (b.st = 1), (b.fuse = FUSE), (b.by = f.by), ev(s, 'lit', b.x, b.y, '치익-');
    for (const c of s.cacti)
      if (Math.hypot(c.x - f.x, c.y - f.y) < c.r * ARM + RR[f.k] && f.z < CACTUS_H) {
        const nx = (f.x - c.x) / (Math.hypot(f.x - c.x, f.y - c.y) || 1), ny = (f.y - c.y) / (Math.hypot(f.x - c.x, f.y - c.y) || 1), vn = f.vx * nx + f.vy * ny;
        if (vn < 0) {
          (f.vx -= 1.6 * vn * nx), (f.vy -= 1.6 * vn * ny), (f.vz = 0.014), (c.wob = 24), (f.mood = 4);
          if (!f.pricked) (f.pricked = true), s.cactusKos++, ev(s, 'prick', f.x, f.y, '따끔!!'), see(s, 'cactus', '날아간 쥐가 선인장에 박히면 따끔!');
        }
      }
  }
  // 걷는 쥐끼리 살짝 비켜 선다
  for (let i = 0; i < s.rats.length; i++) {
    const a = s.rats[i];
    if (!(a.st === WALK || a.st === CARRY)) continue;
    for (let j = i + 1; j < s.rats.length; j++) {
      const b = s.rats[j];
      if (!(b.st === WALK || b.st === CARRY)) continue;
      const dx = b.x - a.x, dy = b.y - a.y, m = (RR[a.k] + RR[b.k]) * 0.9, d2 = dx * dx + dy * dy;
      if (d2 >= m * m || d2 < 1e-10) continue;
      const dd = Math.sqrt(d2), push = (m - dd) * 0.5;
      a.x -= (dx / dd) * push;
      a.y -= (dy / dd) * push;
      b.x += (dx / dd) * push;
      b.y += (dy / dd) * push;
    }
  }
  // 화약통
  for (const b of s.barrels) if (b.st === 1 && --b.fuse <= 0) explode(s, b);
  for (const c of s.cacti) if (c.wob > 0) c.wob--;
  for (const h of s.holes) if (h.shake > 0) h.shake--;
  s.rats = s.rats.filter((r) => r.st !== GONE);
  if (s.cat.moodT > 0 && --s.cat.moodT === 0) s.cat.mood = 0;
  // 판 끝
  if (s.phase !== 'play') return;
  if (s.lost >= s.bagMax) return endStage(s, false, '금고가 털렸어요!');
  if (!s.queue.length && !s.rats.some((r) => active(r) || r.st === HIDE)) endStage(s, true, '');
}

function special(s: WhipState) {
  const d = STAGES[s.stage];
  if (d.special === 'barrel') return s.barrelKos >= d.need;
  if (d.special === 'multi') return s.best >= d.need;
  if (d.special === 'par') return s.strikes <= d.need;
  if (d.special === 'cactus') return s.cactusKos >= d.need;
  return s.plugs >= d.need;
}
export const starText = (d: StageDef) =>
  d.special === 'barrel' ? `통으로 쥐 ${d.need === 3 ? '셋' : d.need} 잡기` : d.special === 'multi' ? '한 번에 셋 날리기' : d.special === 'par' ? `채찍 ${d.need}번 안에 끝내기` : d.special === 'cactus' ? '선인장으로 셋 잡기' : '굴 두 개 막기';

function endStage(s: WhipState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.hold = 0;
  if (ok) {
    s.starOk = [true, s.bags >= s.bagMax, special(s)];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.bags * BAG_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.cat.mood = 7;
    s.cat.moodT = RESULT_OK;
    s.cheer = s.t;
    ev(s, 'clear', CX, CY, s.won ? '마을을 지켰다!' : '판 깨기!');
  } else {
    s.hearts--;
    s.tries++;
    s.cat.mood = 6;
    s.cat.moodT = RESULT_FAIL;
    ev(s, 'fail', CX, CY, why);
  }
}

/** 새것 스포트라이트: 그 판의 새것이 처음 화면에 들어오면 잠깐 멈추고 비춘다 (다시 하는 판에선 안 함) */
function spotCheck(s: WhipState) {
  const d = STAGES[s.stage];
  if (s.spotDone[s.stage] || !d.spot || s.phase !== 'play') return;
  let x = -1, y = -1;
  if (d.key === 'line') {
    const r = s.rats.find((q) => q.st === WALK && q.x > 0.06 && q.x < 0.94 && q.y > 0.02 && q.y < 1.0);
    if (r) (x = r.x), (y = r.y);
  } else if (d.key === 'shield') {
    const r = s.rats.find((q) => q.k === SHIELD && q.x > 0.08 && q.x < 0.92 && q.y > 0.04 && q.y < 0.98);
    if (r) (x = r.x), (y = r.y);
  } else if (d.key === 'cactus' && s.st > 20) (x = s.cacti[0].x), (y = s.cacti[0].y);
  else if (d.key === 'hole') {
    const r = s.rats.find((q) => q.st === HIDE);
    if (r) (x = r.x), (y = r.y);
  } else if (d.key === 'boss') {
    const r = s.rats.find((q) => q.k === BOSS && q.y > 0.02);
    if (r) (x = r.x), (y = r.y);
  }
  if (x < 0) return;
  s.spotDone[s.stage] = true;
  s.spot = SPOT_T;
  s.spotX = x;
  s.spotY = y;
  s.down = false;
  s.hold = 0;
}

export const whipcat: GameDef<WhipState> = {
  id: 'whipcat',
  name: '채찍 고양이 보안관',
  genes: ['whip', 'pointer', 'combo'],
  twist: '채찍은 끝만 세다 — 오래 모을수록 길어지니 "끝이 어디 떨어질지"를 골라야 하고, 끝에 맞아 날아간 쥐가 뒤의 쥐·화약통을 연달아 쓰러뜨린다',
  rules: [
    '꾹 누르면 채찍이 빙빙 돌며 힘이 차고, 떼면 손가락 쪽으로 철썩! 채찍 끝에 맞은 쥐는 멀리 날아가요.',
    '쥐 도둑이 금고의 돈자루를 다 털어 가면 하트 -1 — 자루 든 쥐를 치면 되찾아요.',
  ],
  controls: 'touch',
  hint: '꾹 = 채찍 돌리기, 떼기 = 철썩! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '노을 지는 서부 마을 광장 — 금고 위의 고양이 보안관',
    mood: '주황·자주빛 노을 아래 나무 건물이 늘어선 서부 마을 광장. 먼지가 금빛으로 떠다니고 회전초가 굴러간다. 별 배지를 단 고양이 보안관이 금고 위에서 채찍을 돌리고, 복면 쓴 쥐 도둑들이 살금살금 몰려온다. 울타리 위 암탉들이 구경한다.',
    palette: { bg: '#2e2350', ink: '#fff3dc', muted: '#e0b48a', accent: '#ffd23f', hot: '#ff5a4a', soft: '#f6c98a' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0,
      rats: [], barrels: [], cacti: [], holes: [], queue: [], rid: 0, sid: 0, bags: 0, bagMax: 0, lost: 0,
      down: false, aim: null, aimA: 0, hold: 0, spinA: -Math.PI / 2, spinRev: 0, strike: null, queued: false, tangle: 0, freeze: 0, slow: 0,
      strikes: 0, kos: 0, barrelKos: 0, cactusKos: 0, plugs: 0, best: 0, skos: [], combo: 0, fever: 0, firstDone: false, lastStrikeT: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', dead: false, won: false, again: false, tries: 0,
      seen: new Set<string>(), newsQ: [], news: null, events: [], spot: 0, spotDone: STAGES.map(() => false), spotX: 0, spotY: 0,
      cat: { mood: 0, moodT: 0, face: 1 }, cheer: -999,
    } as WhipState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    // 손: 누르는 동안 손가락 쪽을 겨누고(돌리며 모으기), 떼는 순간 철썩
    const p = inp.pointer ?? null;
    if (p) {
      const sx = p.x, sy = p.y * A, q = toPlane(sx, sy), dx = q.x - CX, dy = q.y - CY;
      s.aim = { x: sx, y: sy };
      if (dx * dx + dy * dy > 0.0006) s.aimA = Math.atan2(dy, dx);
      if (!s.down && s.spot <= 0) (s.down = true), (s.hold = 0);
    } else if (s.down) {
      s.down = false;
      release(s);
      s.aim = null;
    } else s.aim = null;
    s.events = s.events.filter((e) => s.t - e.t < 120);
    if (s.spot > 0) return void s.spot--;
    if (s.freeze > 0) return void s.freeze--;
    if (s.slow > 0 && s.slow-- % 2) return;
    tick(s);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    spotCheck(s);
    if (s.phase === 'result' && s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
      if (s.ok) {
        if (s.won) s.dead = true;
        else (s.again = false), s.stage++, newStage(s);
      } else if (s.hearts <= 0) s.dead = true;
      else (s.again = true), newStage(s);
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
/** 평면의 한 점을 누르는 입력 */
const press = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, (PY0 + y * KY) / A)) } });
const pressA = (a: number) => press(CX + Math.cos(a) * 0.3, CY + Math.sin(a) * 0.3);

/** T틱 뒤 쥐가 있을 자리 (걷는 쥐는 금고까지, 어질어질은 미끄러진 뒤 다시 걷기) */
function predict(r: Rat, T: number) {
  let x = r.x, y = r.y, t = T;
  if (r.st === HIDE) {
    if (r.wait > T) return null;
    t = T - r.wait;
  } else if (r.st === STUN) {
    const n = Math.min(t, r.stun), f = (1 - 0.87 ** n) / (1 - 0.87);
    x += r.vx * f;
    y += r.vy * f;
    t -= n;
  }
  const dd = dist(x, y) || 1e-6;
  if (r.st === CARRY || (r.st === STUN && r.bag)) {
    const k = 1 + (r.spd * 0.85 * t) / dd;
    return { x: CX + (x - CX) * k, y: CY + (y - CY) * k };
  }
  const go = Math.min(r.spd * t, Math.max(0, dd - SAFE_R - RR[r.k]));
  return { x: x + ((CX - x) / dd) * go, y: y + ((CY - y) / dd) * go };
}

interface Plan { a: number; hold: number; v: number; spinWait?: boolean }
const HOLDS = [0, 8, 16, 24, 32, 40, 48];
const NA = 40;

/** 잘하는 봇의 한 수 평가: 쥐 자리를 내다보고, 채찍 끝·화약통·연쇄·되찾기·굴 막기를 점수로 */
function bestStrike(s: WhipState, holds: number[], fixedA?: number): Plan | null {
  const fever = s.fever > 0, d = STAGES[s.stage];
  // 이 판의 별 한 줄을 아직 못 땄으면 그쪽에 덤
  const wantBarrel = d.special === 'barrel' && s.barrelKos < d.need, wantMulti = d.special === 'multi' && s.best < d.need, wantCactus = d.special === 'cactus' && s.cactusKos < d.need;
  let best: Plan | null = null;
  for (const hold of holds) {
    const T = hold + 2 + CRACK, p = Math.min(1, hold / CHARGE_T), L = reach(p), tip = fever && s.fever > T ? TIP_FEVER : TIP;
    const pos: { r: Rat; x: number; y: number; d: number; a: number }[] = [];
    for (const r of s.rats) {
      if (!(active(r) || r.st === HIDE)) continue;
      const q = predict(r, T);
      if (!q) continue;
      pos.push({ r, x: q.x, y: q.y, d: dist(q.x, q.y), a: Math.atan2(q.y - CY, q.x - CX) });
    }
    const angs = fixedA !== undefined ? [fixedA] : [...Array(NA).keys()].map((i) => (i / NA) * TAU - Math.PI);
    if (fixedA === undefined)
      for (const q of pos) {
        if (q.d >= L + 0.06) continue;
        angs.push(q.a);
        if (wantCactus) for (let k = 1; k <= 3; k++) angs.push(q.a + k * 0.07, q.a - k * 0.07);
      }
    for (const b of s.barrels) if (!b.st && fixedA === undefined) angs.push(Math.atan2(b.y - CY, b.x - CX));
    for (const a of angs) {
      const ux = Math.cos(a), uy = Math.sin(a);
      let cut = L;
      for (const c of s.cacti) {
        const tx = c.x - CX, ty = c.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
        if (al > 0 && pp < c.r + 0.012 && al - c.r * 0.5 < cut) cut = Math.max(0.06, al - c.r * 0.5);
      }
      const tipFrom = cut - tip;
      let v = 0, kos = 0;
      for (const b of s.barrels) {
        if (b.st) continue;
        const tx = b.x - CX, ty = b.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
        if (al > 0.03 && al < cut + 0.03 && pp < HW + 0.034) {
          let n = 0;
          for (const q of pos) if (q.r.st !== HIDE && Math.hypot(q.x - b.x, q.y - b.y) < BLAST_R + RR[q.r.k] - 0.01) n += q.r.k === BOSS ? 1.5 : 1;
          v += n >= 1 ? 4 + (wantBarrel ? 16 : 11) * n : -2;
          kos += n;
        }
      }
      for (const [hi, h] of s.holes.entries()) {
        if (h.plugged) continue;
        const tx = h.x - CX, ty = h.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
        if (al < tipFrom - 0.01 || al > cut + 0.04 || pp > 0.045) continue;
        const hid = s.rats.some((r) => r.st === HIDE && r.hole === hi && r.wait > T + 1);
        if (hid) v += 16 + 8 * s.queue.filter((q) => q.hole === hi).length;
      }
      for (const q of pos) {
        if (q.r.st === HIDE) continue;
        const tx = q.x - CX, ty = q.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux), rr = RR[q.r.k];
        if (al < 0.02 || al > cut + rr - 0.004 || pp > HW + rr - 0.006) continue;
        const urg = q.d < 0.2 ? 5 : 0, isTip = al >= tipFrom + 0.006;
        if (q.r.k === SHIELD && q.r.shield) continue;
        if (q.r.k === BOSS) {
          v += isTip ? 9 + urg + (q.r.hp === 1 ? 10 : 0) : 0;
          continue;
        }
        if (isTip) {
          v += (wantCactus ? 5 : 11) + urg + (q.r.bag || q.r.st === CARRY ? 20 : 0);
          kos++;
          // 날아가는 쪽 가까이(낮게 날 때) 선인장이 있으면 따끔
          if (wantCactus) {
            const sd = -tx * uy + ty * ux > 0 ? 1 : -1, fx2 = ux - uy * sd * 0.15, fy2 = uy + ux * sd * 0.15, fn = Math.hypot(fx2, fy2);
            for (const c of s.cacti) {
              const cx2 = c.x - q.x, cy2 = c.y - q.y, ca = (cx2 * fx2 + cy2 * fy2) / fn, cp = Math.abs(-cx2 * fy2 + cy2 * fx2) / fn;
              if (ca > 0 && ca < 0.072 + c.r * ARM && cp < c.r * ARM + rr - 0.008) v += 30;
            }
          }
          // 날아가는 쪽에 있는 쥐는 연쇄로 쓰러진다
          for (const o of pos) {
            if (o === q || o.r.st === HIDE) continue;
            const ox = o.x - q.x, oy = o.y - q.y, oa = ox * ux + oy * uy, op = Math.abs(-ox * uy + oy * ux);
            if (oa > 0 && oa < 0.3 && op < RR[o.r.k] + rr + 0.004) (v += o.r.k === BOSS ? 4 : wantCactus ? 3 : 8), (kos += o.r.k === BOSS ? 0 : 0.7);
          }
        } else {
          v += 1 + urg * 0.5 + (q.r.bag || q.r.st === CARRY ? 18 : 0);
          // 몸통으로 밀어 선인장에 박기
          for (const c of s.cacti) {
            const cx2 = c.x - q.x, cy2 = c.y - q.y, ca = cx2 * ux + cy2 * uy, cp = Math.abs(-cx2 * uy + cy2 * ux);
            if (ca > 0 && ca < 0.07 + c.r + rr && cp < c.r + rr * 0.6) (v += wantCactus ? 30 : 12), kos++;
          }
        }
      }
      if (wantMulti && kos >= 3) v += 25;
      v -= hold * 0.02;
      if (!best || v > best.v) best = { a, hold, v };
    }
  }
  return best;
}

const brain = new WeakMap<object, { plan: Plan | null; next: number }>();

/** 봇: 쥐가 어디로 올지 내다보고, 채찍 끝·연쇄·화약통이 가장 많이 걸리는 방향과 힘을 골라 철썩. 방패 쥐는 돌려서 벗긴다 */
export const whipcatSmart: Bot<WhipState> = {
  name: '명사수 보안관',
  act(s) {
    if (s.phase !== 'play' || s.tangle > 0 || s.spot > 0) return NO;
    let m = brain.get(s);
    if (!m) brain.set(s, (m = { plan: null, next: 0 }));
    if (s.down) {
      const pl = m.plan;
      if (!pl) return NO;
      if (pl.spinWait) {
        const near = s.rats.some((r) => r.k === SHIELD && r.shield && active(r) && dist(r.x, r.y) < spinR(power(s)) + 0.09);
        if ((near && s.hold < 150) || s.hold < 20) return pressA(s.spinA + 1);
        const b = bestStrike(s, [s.hold]);
        if (b && b.v >= 9) return (m.plan = { ...b, hold: s.hold }), NO;
        if (s.hold < 150) return pressA(s.spinA + 1);
        return NO;
      }
      if (s.hold >= pl.hold) return NO;
      if (s.t % 6 === 0) {
        const b = bestStrike(s, [pl.hold]);
        if (b) pl.a = b.a;
      }
      return pressA(pl.a);
    }
    if (busy(s) || s.t < m.next) return NO;
    m.next = s.t + 6;
    const anyShield = s.rats.some((r) => r.k === SHIELD && r.shield && active(r) && dist(r.x, r.y) < 0.24);
    const b = bestStrike(s, HOLDS);
    const danger = s.rats.some((r) => (active(r) && dist(r.x, r.y) < 0.17) || r.st === CARRY || r.bag);
    const few = !s.queue.length && s.rats.filter((r) => active(r) || r.st === HIDE).length <= 2;
    const need = danger || few || s.t - s.lastStrikeT > 200 ? 8 : 20;
    if (anyShield && (!b || b.v < 22)) {
      m.plan = { a: 0, hold: 999, v: 0, spinWait: true };
      return pressA(s.spinA);
    }
    if (!b || b.v < need) return NO;
    m.plan = b;
    return pressA(b.a);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나, 아무 때나 꾹-떼기 (누르는 시간도 아무렇게나) */
export const whipcatRandom: Bot<WhipState> = {
  name: '아무 데나 철썩',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 90);
    m.x = rng();
    m.y = 0.25 + rng() * 0.6;
    m.hold = 2 + Math.floor(rng() * 70);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

const habitMem = new WeakMap<object, { hold: number; a: number }>();
/** 버릇 봇: 늘 가장 가까운 쥐에게 짧게 톡 (모으지 않음) */
export const whipcatHabit: Bot<WhipState> = {
  name: '가까운 쥐 톡',
  act(s) {
    if (s.phase !== 'play' || s.tangle > 0 || s.spot > 0) return NO;
    let m = habitMem.get(s);
    if (!m) habitMem.set(s, (m = { hold: 0, a: 0 }));
    if (s.down) return s.hold >= 2 ? NO : pressA(m.a);
    if (busy(s)) return NO;
    let bd = 9, br: Rat | null = null;
    for (const r of s.rats) if (active(r) && dist(r.x, r.y) < bd) (bd = dist(r.x, r.y)), (br = r);
    if (!br || bd > L0 + 0.02) return NO;
    m.a = Math.atan2(br.y - CY, br.x - CX);
    return pressA(m.a);
  },
};

const habit2Mem = new WeakMap<object, { a: number }>();
/** 독립 버릇 봇: 늘 힘을 끝까지 모아서 가장 가까운 쥐 쪽으로 */
export const whipcatHabit2: Bot<WhipState> = {
  name: '늘 힘 가득',
  act(s) {
    if (s.phase !== 'play' || s.tangle > 0 || s.spot > 0) return NO;
    let m = habit2Mem.get(s);
    if (!m) habit2Mem.set(s, (m = { a: 0 }));
    let bd = 9, br: Rat | null = null;
    for (const r of s.rats) if (active(r) && dist(r.x, r.y) < bd) (bd = dist(r.x, r.y)), (br = r);
    if (br) m.a = Math.atan2(br.y - CY, br.x - CX);
    if (s.down) return s.hold >= CHARGE_T ? NO : pressA(m.a);
    if (busy(s) || !br) return NO;
    return pressA(m.a);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - (1 - clamp01(x)) ** 3;
function star5(ctx: C2, x: number, y: number, r: number, inner = 0.45, rot = 0) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + rot + (k * Math.PI) / 5, rr = k % 2 ? r * inner : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heart(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.85);
  ctx.bezierCurveTo(x - r * 1.25, y - r * 0.05, x - r * 0.65, y - r * 1.05, x, y - r * 0.38);
  ctx.bezierCurveTo(x + r * 0.65, y - r * 1.05, x + r * 1.25, y - r * 0.05, x, y + r * 0.85);
  ctx.closePath();
}
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, TAU);
  ctx.fill();
}
/** 돈자루 (삼베 자루 + 금화 무늬) */
function sack(ctx: C2, x: number, y: number, u: number, ghost = false) {
  if (ghost) {
    ctx.strokeStyle = 'rgba(255,230,190,.35)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(x, y - u * 0.75, u * 0.8, u * 0.75, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    return;
  }
  const g = ctx.createLinearGradient(x - u, y - u * 1.6, x + u, y);
  g.addColorStop(0, '#ecd29a');
  g.addColorStop(0.55, '#c9a064');
  g.addColorStop(1, '#8e6a3a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - u * 0.3, y - u * 1.3);
  ctx.quadraticCurveTo(x - u * 1.0, y - u * 1.0, x - u * 0.9, y - u * 0.3);
  ctx.quadraticCurveTo(x - u * 0.8, y + u * 0.05, x, y + u * 0.05);
  ctx.quadraticCurveTo(x + u * 0.8, y + u * 0.05, x + u * 0.9, y - u * 0.3);
  ctx.quadraticCurveTo(x + u * 1.0, y - u * 1.0, x + u * 0.3, y - u * 1.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(70,40,15,.55)';
  ctx.lineWidth = Math.max(1, u * 0.1);
  ctx.stroke();
  // 묶은 목
  ctx.fillStyle = '#b58c52';
  ctx.beginPath();
  ctx.moveTo(x - u * 0.32, y - u * 1.3);
  ctx.lineTo(x - u * 0.45, y - u * 1.75);
  ctx.lineTo(x + u * 0.45, y - u * 1.75);
  ctx.lineTo(x + u * 0.32, y - u * 1.3);
  ctx.fill();
  ctx.strokeStyle = '#6a3d1c';
  ctx.lineWidth = Math.max(1, u * 0.14);
  ctx.beginPath();
  ctx.moveTo(x - u * 0.36, y - u * 1.32);
  ctx.lineTo(x + u * 0.36, y - u * 1.32);
  ctx.stroke();
  // 금화 무늬
  ell(ctx, x, y - u * 0.6, u * 0.36, u * 0.36, '#ffd23f');
  ctx.strokeStyle = '#b07a10';
  ctx.lineWidth = Math.max(1, u * 0.08);
  ctx.beginPath();
  ctx.arc(x, y - u * 0.6, u * 0.24, 0, TAU);
  ctx.stroke();
  ell(ctx, x - u * 0.45, y - u * 1.0, u * 0.14, u * 0.2, 'rgba(255,255,255,.35)');
}

/** 노을 하늘 · 먼 메사 · 해 · 구름 · 독수리 */
function drawSky(ctx: C2, w: number, t: number) {
  const Y = (y: number) => y * w;
  const g = ctx.createLinearGradient(0, 0, 0, Y(0.33));
  g.addColorStop(0, '#2a1d4c');
  g.addColorStop(0.3, '#5b2f68');
  g.addColorStop(0.58, '#c4566a');
  g.addColorStop(0.8, '#f28a50');
  g.addColorStop(1, '#ffcf7a');
  ctx.fillStyle = g;
  ctx.fillRect(-12, -12, w + 24, Y(0.34) + 12);
  // 별 몇 개 (위쪽 하늘)
  for (let k = 0; k < 14; k++) {
    const x = hsh(k * 3.1) * w, y = Y(0.09 + hsh(k * 7.7) * 0.07);
    ctx.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.02 + k));
    ctx.fillStyle = '#fff4dc';
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;
  // 해 (건물 뒤로 넘어가는 중)
  const sx = w * 0.62, sy = Y(0.205), sr = Y(0.072);
  const glow = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4.2);
  glow.addColorStop(0, 'rgba(255,236,170,.75)');
  glow.addColorStop(0.35, 'rgba(255,170,90,.32)');
  glow.addColorStop(1, 'rgba(255,120,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 4.2, sy - sr * 4.2, sr * 8.4, sr * 8.4);
  const sg = ctx.createLinearGradient(0, sy - sr, 0, sy + sr);
  sg.addColorStop(0, '#fff6cf');
  sg.addColorStop(1, '#ffb456');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();
  // 해를 가로지르는 띠 (노을 줄무늬)
  ctx.fillStyle = 'rgba(232,110,90,.55)';
  for (let k = 0; k < 4; k++) ctx.fillRect(sx - sr, sy + sr * (0.15 + k * 0.22), sr * 2, sr * (0.05 + k * 0.025));
  // 길게 늘어진 구름
  for (let k = 0; k < 4; k++) {
    const span = w + Y(0.6), cx = ((hsh(k + 9) * span + t * (0.05 + k * 0.02)) % span) - Y(0.3), cy = Y(0.11 + k * 0.035), cw = Y(0.22 + hsh(k) * 0.12);
    const cg = ctx.createLinearGradient(0, cy - Y(0.012), 0, cy + Y(0.012));
    cg.addColorStop(0, k < 2 ? 'rgba(255,190,170,.75)' : 'rgba(255,200,150,.8)');
    cg.addColorStop(1, k < 2 ? 'rgba(150,70,120,.65)' : 'rgba(200,90,90,.6)');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cx, cy, cw / 2, Y(0.011), 0, 0, TAU);
    ctx.ellipse(cx + cw * 0.18, cy - Y(0.008), cw * 0.25, Y(0.01), 0, 0, TAU);
    ctx.fill();
  }
  // 먼 메사 두 겹
  const far = [[0, 0.255], [0.06, 0.25], [0.08, 0.205], [0.24, 0.2], [0.27, 0.25], [0.4, 0.255], [0.44, 0.222], [0.52, 0.218], [0.55, 0.255], [0.78, 0.26], [0.82, 0.19], [0.97, 0.188], [1.0, 0.24]];
  ctx.fillStyle = '#9a4b6a';
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.34));
  for (const [x, y] of far) ctx.lineTo(x * w, Y(y));
  ctx.lineTo(w + 5, Y(0.34));
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,190,140,.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (const [x, y] of far) ctx.lineTo(x * w, Y(y));
  ctx.stroke();
  const mid = [[0, 0.27], [0.1, 0.268], [0.13, 0.245], [0.2, 0.243], [0.23, 0.27], [0.62, 0.275], [0.66, 0.25], [0.74, 0.248], [0.77, 0.272], [1, 0.27]];
  ctx.fillStyle = '#743a52';
  ctx.beginPath();
  ctx.moveTo(-5, Y(0.34));
  for (const [x, y] of mid) ctx.lineTo(x * w, Y(y));
  ctx.lineTo(w + 5, Y(0.34));
  ctx.fill();
  // 빙빙 도는 독수리 둘
  ctx.strokeStyle = 'rgba(50,20,40,.75)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  for (let k = 0; k < 2; k++) {
    const a = t * 0.012 + k * 2.4, bx = w * (0.22 + k * 0.5) + Math.cos(a) * Y(0.05), by = Y(0.12 + k * 0.03) + Math.sin(a) * Y(0.015), fl = Math.sin(t * 0.15 + k) * Y(0.004);
    ctx.beginPath();
    ctx.moveTo(bx - Y(0.016), by - fl);
    ctx.quadraticCurveTo(bx - Y(0.007), by - Y(0.008), bx, by);
    ctx.quadraticCurveTo(bx + Y(0.007), by - Y(0.008), bx + Y(0.016), by - fl);
    ctx.stroke();
  }
}

/** 뒤쪽 거리: 해를 등진 나무 건물들 (윤곽에 노을빛 테두리, 창마다 등불) */
const TOWN: [number, number, number, number, string][] = [
  // x0, x1, 높이, 꼭대기 모양(0 계단 1 둥근 2 삼각), 간판
  [-0.03, 0.2, 0.15, 0, 'bank'],
  [0.235, 0.455, 0.178, 1, 'saloon'],
  [0.49, 0.69, 0.13, 2, 'sheriff'],
  [0.725, 1.03, 0.163, 0, 'store'],
];
function drawTown(ctx: C2, w: number, t: number) {
  const Y = (y: number) => y * w, yb = Y(PY0 - 0.03);
  // 골목 그늘
  ctx.fillStyle = '#3a1f34';
  ctx.fillRect(0, yb - Y(0.1), w, Y(0.1));
  // 물탱크 (골목 뒤)
  {
    const x = w * 0.475, y = yb - Y(0.14);
    ctx.strokeStyle = '#3c2030';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - Y(0.02), yb - Y(0.06));
    ctx.lineTo(x - Y(0.016), y);
    ctx.moveTo(x + Y(0.02), yb - Y(0.06));
    ctx.lineTo(x + Y(0.016), y);
    ctx.stroke();
    ctx.fillStyle = '#4a2838';
    ctx.beginPath();
    ctx.roundRect(x - Y(0.026), y - Y(0.04), Y(0.052), Y(0.042), Y(0.006));
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - Y(0.03), y - Y(0.038));
    ctx.lineTo(x, y - Y(0.06));
    ctx.lineTo(x + Y(0.03), y - Y(0.038));
    ctx.fill();
  }
  for (const [x0, x1, hh, top, kind] of TOWN) {
    const L = x0 * w, Rr = x1 * w, H = Y(hh), cx = (L + Rr) / 2, wd = Rr - L;
    // 벽 (등진 빛이라 어둡고 따뜻한 갈색)
    const g = ctx.createLinearGradient(0, yb - H, 0, yb);
    g.addColorStop(0, kind === 'saloon' ? '#7c4636' : kind === 'bank' ? '#6e4a4a' : kind === 'sheriff' ? '#7a5038' : '#6a4632');
    g.addColorStop(1, '#3e2430');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L, yb);
    ctx.lineTo(L, yb - H);
    if (top === 0) {
      ctx.lineTo(L + wd * 0.18, yb - H);
      ctx.lineTo(L + wd * 0.18, yb - H - Y(0.016));
      ctx.lineTo(Rr - wd * 0.18, yb - H - Y(0.016));
      ctx.lineTo(Rr - wd * 0.18, yb - H);
    } else if (top === 1) ctx.quadraticCurveTo(cx, yb - H - Y(0.05), Rr, yb - H);
    else ctx.lineTo(cx, yb - H - Y(0.035));
    ctx.lineTo(Rr, yb - H);
    ctx.lineTo(Rr, yb);
    ctx.closePath();
    ctx.fill();
    // 판자 결
    ctx.save();
    ctx.clip();
    ctx.strokeStyle = 'rgba(20,8,16,.22)';
    ctx.lineWidth = 1;
    for (let x = L + Y(0.016); x < Rr; x += Y(0.016)) {
      ctx.beginPath();
      ctx.moveTo(x, yb - H - Y(0.06));
      ctx.lineTo(x, yb);
      ctx.stroke();
    }
    // 노을 테두리 빛 (해를 등져서 윤곽만 밝다)
    const rim = ctx.createLinearGradient(0, yb - H - Y(0.05), 0, yb - H + Y(0.03));
    rim.addColorStop(0, 'rgba(255,190,120,.0)');
    rim.addColorStop(0.55, 'rgba(255,180,110,.35)');
    rim.addColorStop(1, 'rgba(255,180,110,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(L, yb - H - Y(0.06), wd, Y(0.09));
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,196,130,.85)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(L, yb - H);
    if (top === 0) {
      ctx.lineTo(L + wd * 0.18, yb - H);
      ctx.lineTo(L + wd * 0.18, yb - H - Y(0.016));
      ctx.lineTo(Rr - wd * 0.18, yb - H - Y(0.016));
      ctx.lineTo(Rr - wd * 0.18, yb - H);
    } else if (top === 1) ctx.quadraticCurveTo(cx, yb - H - Y(0.05), Rr, yb - H);
    else ctx.lineTo(cx, yb - H - Y(0.035));
    ctx.lineTo(Rr, yb - H);
    ctx.stroke();
    // 위층 창 (등불)
    for (const fx2 of [0.28, 0.72]) {
      const wx = L + wd * fx2, wy = yb - H * 0.72, ww = Y(0.034), wh = Y(0.04);
      const lg = ctx.createRadialGradient(wx, wy, 1, wx, wy, ww * 1.6);
      lg.addColorStop(0, 'rgba(255,214,120,.45)');
      lg.addColorStop(1, 'rgba(255,214,120,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(wx - ww * 1.6, wy - ww * 1.6, ww * 3.2, ww * 3.2);
      ctx.fillStyle = (Math.floor(t / 90 + fx2 * 7 + x0 * 13) % 7) === 0 ? '#e9a84e' : '#ffd77a';
      ctx.fillRect(wx - ww / 2, wy - wh / 2, ww, wh);
      ctx.strokeStyle = '#3a2028';
      ctx.lineWidth = 1.4;
      ctx.strokeRect(wx - ww / 2, wy - wh / 2, ww, wh);
      ctx.beginPath();
      ctx.moveTo(wx, wy - wh / 2);
      ctx.lineTo(wx, wy + wh / 2);
      ctx.moveTo(wx - ww / 2, wy);
      ctx.lineTo(wx + ww / 2, wy);
      ctx.stroke();
    }
    // 차양 (처마) + 기둥
    const ay = yb - H * 0.38;
    ctx.fillStyle = '#4a2a26';
    ctx.beginPath();
    ctx.moveTo(L - Y(0.004), ay);
    ctx.lineTo(Rr + Y(0.004), ay);
    ctx.lineTo(Rr + Y(0.012), ay + Y(0.018));
    ctx.lineTo(L - Y(0.012), ay + Y(0.018));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,190,130,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L - Y(0.004), ay);
    ctx.lineTo(Rr + Y(0.004), ay);
    ctx.stroke();
    ctx.fillStyle = '#2e1820';
    ctx.fillRect(L, ay + Y(0.018), wd, yb - ay - Y(0.018));
    ctx.fillStyle = '#5a3428';
    for (const px of [L + Y(0.006), Rr - Y(0.012), cx - Y(0.003)]) ctx.fillRect(px, ay + Y(0.018), Y(0.006), yb - ay - Y(0.018));
    // 문 (주점은 여닫이 문, 안에 따뜻한 불빛)
    const dw = Y(0.04), dh = Y(0.05), dx = cx + (kind === 'store' ? wd * 0.22 : 0);
    const dg = ctx.createLinearGradient(0, yb - dh, 0, yb);
    dg.addColorStop(0, '#ffcf7a');
    dg.addColorStop(1, '#c46a3a');
    ctx.fillStyle = dg;
    ctx.fillRect(dx - dw / 2, yb - dh, dw, dh);
    if (kind === 'saloon') {
      const sw = Math.sin(t * 0.05) * Y(0.003);
      ctx.fillStyle = '#7a4630';
      ctx.fillRect(dx - dw / 2 + sw, yb - dh * 0.75, dw / 2 - 1, dh * 0.45);
      ctx.fillRect(dx + 1 - sw, yb - dh * 0.75, dw / 2 - 1, dh * 0.45);
    }
    // 간판 (그림 간판)
    const by2 = ay - Y(0.026), bw = Math.min(wd * 0.6, Y(0.12)), bh = Y(0.03);
    ctx.fillStyle = '#5e3424';
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, by2 - bh / 2, bw, bh, Y(0.004));
    ctx.fill();
    ctx.strokeStyle = '#d9a35a';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (kind === 'bank') {
      for (const k of [-1, 0, 1]) {
        ell(ctx, cx + k * Y(0.022), by2, Y(0.009), Y(0.009), '#ffd23f');
        ctx.strokeStyle = '#a06a10';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx + k * Y(0.022), by2, Y(0.005), 0, TAU);
        ctx.stroke();
      }
    } else if (kind === 'saloon') {
      // 맥주잔 두 개
      for (const k of [-1, 1]) {
        const mx = cx + k * Y(0.016);
        ctx.fillStyle = '#ffcf5a';
        ctx.fillRect(mx - Y(0.007), by2 - Y(0.008), Y(0.014), Y(0.017));
        ctx.fillStyle = '#fff7e0';
        ctx.fillRect(mx - Y(0.008), by2 - Y(0.011), Y(0.016), Y(0.005));
        ctx.strokeStyle = '#ffcf5a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(mx + k * Y(0.009), by2, Y(0.005), -1.2, 1.2);
        ctx.stroke();
      }
    } else if (kind === 'sheriff') {
      ctx.fillStyle = '#ffd23f';
      star5(ctx, cx, by2, Y(0.013));
      ctx.fill();
      ctx.strokeStyle = '#a06a10';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // 말굽
      ctx.strokeStyle = '#d8d8e0';
      ctx.lineWidth = Y(0.006);
      ctx.beginPath();
      ctx.arc(cx, by2, Y(0.009), Math.PI * 0.85, Math.PI * 2.15, false);
      ctx.stroke();
    }
  }
}

/** 광장 땅: 건물 그림자 · 골목 빛줄기 · 바퀴 자국 · 자갈 · 풀 */
function drawGround(ctx: C2, w: number, t: number) {
  const Y = (y: number) => y * w, yb = Y(PY0 - 0.03), yf = Y(PY0 + 1.12 * KY);
  const g = ctx.createLinearGradient(0, yb, 0, yf);
  g.addColorStop(0, '#9a5a48');
  g.addColorStop(0.12, '#c97e52');
  g.addColorStop(0.45, '#e4a265');
  g.addColorStop(1, '#cf8a55');
  ctx.fillStyle = g;
  ctx.fillRect(-12, yb, w + 24, yf - yb + 40);
  // 흙빛 얼룩 (넓고 옅게)
  for (let k = 0; k < 9; k++) {
    const x = hsh(k * 4.1 + 1) * w, y = yb + Y(0.06) + hsh(k * 6.7 + 2) * (yf - yb - Y(0.1)), r = Y(0.1 + hsh(k) * 0.12);
    const bg2 = ctx.createRadialGradient(x, y, 1, x, y, r);
    bg2.addColorStop(0, k % 2 ? 'rgba(255,220,170,.16)' : 'rgba(140,70,50,.13)');
    bg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = bg2;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, 0, 0, TAU);
    ctx.fill();
  }
  // 건물 그림자 (해가 뒤에 있어 앞으로 길게)
  const sg = ctx.createLinearGradient(0, yb, 0, yb + Y(0.09));
  sg.addColorStop(0, 'rgba(60,20,40,.55)');
  sg.addColorStop(1, 'rgba(60,20,40,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(-12, yb, w + 24, Y(0.09));
  // 골목 사이로 들어오는 빛줄기
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const [ax0, ax1] of [[0.2, 0.235], [0.455, 0.49], [0.69, 0.725]]) {
    const lg = ctx.createLinearGradient(0, yb, 0, yb + Y(0.5));
    lg.addColorStop(0, 'rgba(255,190,110,.22)');
    lg.addColorStop(1, 'rgba(255,190,110,0)');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.moveTo(ax0 * w, yb);
    ctx.lineTo(ax1 * w, yb);
    ctx.lineTo(ax1 * w + Y(0.09), yb + Y(0.5));
    ctx.lineTo(ax0 * w - Y(0.05), yb + Y(0.5));
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 바퀴 자국
  ctx.strokeStyle = 'rgba(120,60,40,.22)';
  ctx.lineWidth = Y(0.008);
  for (const off of [0, 0.05]) {
    ctx.beginPath();
    ctx.moveTo(-10, Y(0.62 + off));
    ctx.bezierCurveTo(w * 0.3, Y(0.5 + off), w * 0.7, Y(0.98 + off), w + 10, Y(0.86 + off));
    ctx.stroke();
  }
  // 자갈 · 마른 풀
  for (let k = 0; k < 70; k++) {
    const x = hsh(k * 1.7) * w, y = yb + Y(0.03) + hsh(k * 2.9) * (yf - yb - Y(0.03)), r = Y(0.003 + hsh(k * 5.3) * 0.004);
    if (Math.abs(x - w * 0.5) < Y(0.1) && Math.abs(y - Y(PY0 + CY * KY)) < Y(0.07)) continue;
    ell(ctx, x, y + r * 0.4, r * 1.2, r * 0.5, 'rgba(90,40,30,.25)');
    ell(ctx, x, y, r, r * 0.7, k % 3 ? '#b97a52' : '#d9a274');
    ell(ctx, x - r * 0.3, y - r * 0.25, r * 0.4, r * 0.25, 'rgba(255,230,190,.6)');
  }
  ctx.strokeStyle = '#8a7a3a';
  ctx.lineWidth = 1.3;
  for (let k = 0; k < 14; k++) {
    const x = (k % 2 ? 0.03 + hsh(k) * 0.12 : 0.85 + hsh(k) * 0.12) * w, y = Y(0.42 + hsh(k * 3.3) * 0.7);
    for (let j = -2; j <= 2; j++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + j * Y(0.004), y - Y(0.01), x + j * Y(0.008) + Math.sin(t * 0.03 + k) * 1.5, y - Y(0.018));
      ctx.stroke();
    }
  }
}

/** 광장 가장자리 소품: 나무 상자 더미 · 말 물통과 말뚝 · 건초 더미 · 수레바퀴 · 가로등 */
function drawProps(ctx: C2, w: number, t: number) {
  const R = (r: number) => r * w, SX = (x: number) => x * w, SY = (y: number) => (PY0 + y * KY) * w;
  const crate = (x: number, y: number, u: number) => {
    ctx.fillStyle = '#b07a46';
    ctx.fillRect(x - u, y - u * 1.8, u * 2, u * 1.8);
    ctx.fillStyle = '#d29a62';
    ctx.beginPath();
    ctx.moveTo(x - u, y - u * 1.8);
    ctx.lineTo(x - u * 0.7, y - u * 2.3);
    ctx.lineTo(x + u * 1.3, y - u * 2.3);
    ctx.lineTo(x + u, y - u * 1.8);
    ctx.fill();
    ctx.strokeStyle = '#6a4222';
    ctx.lineWidth = Math.max(1, u * 0.12);
    ctx.strokeRect(x - u, y - u * 1.8, u * 2, u * 1.8);
    ctx.beginPath();
    ctx.moveTo(x - u, y - u * 1.8);
    ctx.lineTo(x + u, y);
    ctx.moveTo(x + u, y - u * 1.8);
    ctx.lineTo(x - u, y);
    ctx.stroke();
  };
  // 왼쪽 뒤: 상자 더미
  {
    const x = SX(0.06), y = SY(0.05), u = R(0.022);
    ell(ctx, x + u, y + u * 0.2, u * 2.4, u * 0.6, 'rgba(50,15,30,.3)');
    crate(x - u * 0.9, y, u);
    crate(x + u * 1.2, y, u);
    crate(x + u * 0.1, y - u * 1.9, u);
  }
  // 오른쪽 뒤: 말뚝 + 물통
  {
    const x = SX(0.93), y = SY(0.06), u = R(0.02);
    ell(ctx, x, y + u * 0.3, u * 2.6, u * 0.6, 'rgba(50,15,30,.3)');
    ctx.fillStyle = '#7a4a2a';
    ctx.fillRect(x - u * 2.2, y - u * 2.6, u * 0.5, u * 2.6);
    ctx.fillRect(x + u * 1.7, y - u * 2.6, u * 0.5, u * 2.6);
    ctx.fillRect(x - u * 2.4, y - u * 2.6, u * 4.8, u * 0.45);
    ctx.fillStyle = '#8a5a34';
    ctx.beginPath();
    ctx.moveTo(x - u * 1.6, y - u * 1.2);
    ctx.lineTo(x + u * 1.6, y - u * 1.2);
    ctx.lineTo(x + u * 1.3, y);
    ctx.lineTo(x - u * 1.3, y);
    ctx.fill();
    ell(ctx, x, y - u * 1.2, u * 1.6, u * 0.35, '#5aa8c8');
    ell(ctx, x - u * 0.5, y - u * 1.25, u * 0.5, u * 0.1, 'rgba(255,255,255,.6)');
  }
  // 왼쪽 앞: 건초 더미
  {
    const x = SX(0.05), y = SY(0.99), u = R(0.03);
    ell(ctx, x + u * 0.3, y + u * 0.15, u * 1.5, u * 0.4, 'rgba(50,15,30,.3)');
    const hg = ctx.createLinearGradient(0, y - u * 1.4, 0, y);
    hg.addColorStop(0, '#f2d27a');
    hg.addColorStop(1, '#b88a3a');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.roundRect(x - u * 1.2, y - u * 1.3, u * 2.4, u * 1.3, u * 0.3);
    ctx.fill();
    ctx.strokeStyle = '#8a5a24';
    ctx.lineWidth = Math.max(1, u * 0.1);
    for (const k of [-0.5, 0.5]) {
      ctx.beginPath();
      ctx.moveTo(x + k * u, y - u * 1.3);
      ctx.lineTo(x + k * u, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,240,180,.6)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(x - u + k * u * 0.4, y - u * 1.3);
      ctx.lineTo(x - u * 0.9 + k * u * 0.4 + Math.sin(t * 0.03 + k) * 1.5, y - u * 1.55);
      ctx.stroke();
    }
  }
  // 오른쪽 앞: 수레바퀴
  {
    const x = SX(0.95), y = SY(0.97), u = R(0.032);
    ell(ctx, x - u * 0.2, y + u * 0.1, u * 1.2, u * 0.3, 'rgba(50,15,30,.3)');
    ctx.strokeStyle = '#6a4222';
    ctx.lineWidth = Math.max(2, u * 0.18);
    ctx.beginPath();
    ctx.ellipse(x, y - u, u * 0.55, u * 1.0, 0, 0, TAU);
    ctx.stroke();
    ctx.lineWidth = Math.max(1, u * 0.08);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x - Math.cos(a) * u * 0.55, y - u - Math.sin(a) * u);
      ctx.lineTo(x + Math.cos(a) * u * 0.55, y - u + Math.sin(a) * u);
      ctx.stroke();
    }
    ell(ctx, x, y - u, u * 0.14, u * 0.2, '#3a2414');
  }
  // 가로등 둘 (등불이 깜빡)
  for (const [lx, ly] of [[0.2, 0.0], [0.8, 0.0]]) {
    const x = SX(lx), y = SY(ly), u = R(0.018);
    ctx.fillStyle = '#3a2a2a';
    ctx.fillRect(x - u * 0.15, y - u * 5.5, u * 0.3, u * 5.5);
    const fl = 0.75 + 0.25 * Math.sin(t * 0.13 + lx * 9);
    const lg = ctx.createRadialGradient(x, y - u * 5.8, 1, x, y - u * 5.8, u * 3.5);
    lg.addColorStop(0, `rgba(255,214,120,${0.55 * fl})`);
    lg.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = lg;
    ctx.fillRect(x - u * 3.5, y - u * 9.3, u * 7, u * 7);
    ctx.fillStyle = '#ffd77a';
    ctx.fillRect(x - u * 0.45, y - u * 6.4, u * 0.9, u * 1.0);
    ctx.strokeStyle = '#3a2a2a';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x - u * 0.45, y - u * 6.4, u * 0.9, u * 1.0);
  }
}

/** 금고 (쇠 금고, 금빛 테두리, 다이얼) — 고양이가 위에 선다. 돌려주는 값: 고양이 발 높이(화면 y) */
function drawSafe(ctx: C2, bx: number, by: number, u: number, shake: number) {
  const fw = u * 2.6, fh = u * 1.55, dp = u * 0.62, x0 = bx - fw / 2 + shake, yTop = by + u * 0.5 - fh;
  // 그림자
  ell(ctx, bx + u * 0.15, by + u * 0.62, fw * 0.62, u * 0.32, 'rgba(50,15,30,.4)');
  // 윗면
  const tg = ctx.createLinearGradient(0, yTop - dp, 0, yTop);
  tg.addColorStop(0, '#7fa49c');
  tg.addColorStop(1, '#5b827a');
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.moveTo(x0, yTop);
  ctx.lineTo(x0 + u * 0.22, yTop - dp);
  ctx.lineTo(x0 + fw - u * 0.22, yTop - dp);
  ctx.lineTo(x0 + fw, yTop);
  ctx.closePath();
  ctx.fill();
  // 앞면
  const fg = ctx.createLinearGradient(x0, 0, x0 + fw, 0);
  fg.addColorStop(0, '#3f6560');
  fg.addColorStop(0.35, '#4f7a73');
  fg.addColorStop(1, '#2a4542');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(x0, yTop, fw, fh, u * 0.12);
  ctx.fill();
  ctx.strokeStyle = '#e2b04a';
  ctx.lineWidth = Math.max(1.5, u * 0.09);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0, yTop);
  ctx.lineTo(x0 + u * 0.22, yTop - dp);
  ctx.lineTo(x0 + fw - u * 0.22, yTop - dp);
  ctx.lineTo(x0 + fw, yTop);
  ctx.stroke();
  // 문 테두리 · 리벳
  ctx.strokeStyle = 'rgba(20,40,38,.7)';
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.beginPath();
  ctx.roundRect(x0 + u * 0.2, yTop + u * 0.18, fw - u * 0.4, fh - u * 0.36, u * 0.08);
  ctx.stroke();
  for (const [rx, ry] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]]) ell(ctx, x0 + fw * rx, yTop + fh * ry, u * 0.06, u * 0.06, '#f4cf74');
  // 다이얼
  const dx = x0 + fw * 0.4, dy = yTop + fh * 0.5;
  ell(ctx, dx, dy, u * 0.36, u * 0.36, '#d9dde0');
  ell(ctx, dx, dy, u * 0.27, u * 0.27, '#9aa3a8');
  ctx.strokeStyle = '#4a5358';
  ctx.lineWidth = 1;
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    ctx.beginPath();
    ctx.moveTo(dx + Math.cos(a) * u * 0.28, dy + Math.sin(a) * u * 0.28);
    ctx.lineTo(dx + Math.cos(a) * u * 0.35, dy + Math.sin(a) * u * 0.35);
    ctx.stroke();
  }
  ell(ctx, dx - u * 0.1, dy - u * 0.1, u * 0.08, u * 0.06, 'rgba(255,255,255,.7)');
  // 손잡이
  ctx.strokeStyle = '#e2b04a';
  ctx.lineWidth = Math.max(1.5, u * 0.1);
  ctx.lineCap = 'round';
  const hx = x0 + fw * 0.75, hy = yTop + fh * 0.5;
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * TAU + 0.3;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx + Math.cos(a) * u * 0.24, hy + Math.sin(a) * u * 0.24);
    ctx.stroke();
  }
  ell(ctx, hx, hy, u * 0.08, u * 0.08, '#f4cf74');
  // 윗면 반짝
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x0 + u * 0.35, yTop - dp + 2);
  ctx.lineTo(x0 + fw * 0.45, yTop - dp + 2);
  ctx.stroke();
  return yTop - dp * 0.45;
}

/**
 * 고양이 보안관 (정면 3/4). mood: 0 느긋 · 1 힘줌(돌리는 중) · 2 철썩(외침) · 3 우쭐 · 4 깜짝 · 5 어질(감김) · 6 시무룩 · 7 만세
 * arm: 채찍 든 손의 화면 좌표(없으면 허리). 돌려주는 값 없음.
 */
function drawCat(ctx: C2, x: number, y: number, u: number, face: number, mood: number, t: number, hand: { x: number; y: number } | null, coiled: boolean, tangled: boolean, fever: boolean) {
  const breathe = Math.sin(t * 0.07) * u * 0.03, bounce = mood === 7 ? -Math.abs(Math.sin(t * 0.2)) * u * 0.35 : 0;
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const fur = (g: CanvasGradient) => (g.addColorStop(0, '#ffc066'), g.addColorStop(0.55, '#f39a3a'), g.addColorStop(1, '#c9681f'), g);
  // 꼬리
  const sw = Math.sin(t * 0.06) * u * 0.35 * (mood === 1 ? 1.8 : 1);
  ctx.strokeStyle = '#d9782a';
  ctx.lineWidth = u * 0.32;
  ctx.beginPath();
  ctx.moveTo(-face * u * 0.5, -u * 0.6);
  ctx.bezierCurveTo(-face * u * 1.5, -u * 0.5, -face * u * 1.2 + sw, -u * 1.7, -face * u * 1.55 + sw, -u * 2.25);
  ctx.stroke();
  ctx.strokeStyle = '#a8501a';
  ctx.lineWidth = u * 0.32;
  ctx.setLineDash([u * 0.12, u * 0.22]);
  ctx.stroke();
  ctx.setLineDash([]);
  ell(ctx, -face * u * 1.55 + sw, -u * 2.28, u * 0.18, u * 0.18, '#fff1dc');
  // 부츠
  for (const sd of [-1, 1]) {
    const bx = sd * u * 0.38;
    const bg = ctx.createLinearGradient(0, -u * 0.5, 0, 0);
    bg.addColorStop(0, '#8a5432');
    bg.addColorStop(1, '#4a2a18');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(bx - u * 0.22, -u * 0.5, u * 0.44, u * 0.5, [u * 0.08, u * 0.08, u * 0.04, u * 0.04]);
    ctx.fill();
    ctx.fillStyle = '#3a1e10';
    ctx.beginPath();
    ctx.roundRect(bx - u * 0.26 + sd * u * 0.05, -u * 0.1, u * 0.52, u * 0.12, u * 0.05);
    ctx.fill();
    ctx.fillStyle = '#c8873e';
    ctx.fillRect(bx - u * 0.22, -u * 0.5, u * 0.44, u * 0.08);
    ell(ctx, bx, -u * 0.3, u * 0.05, u * 0.05, '#ffd23f');
  }
  // 몸통
  const bg = ctx.createLinearGradient(-u, -u * 1.9, u, -u * 0.3);
  ctx.fillStyle = fur(bg);
  ctx.beginPath();
  ctx.ellipse(0, -u * 1.05 + breathe, u * 0.8, u * 0.75 + breathe, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,40,10,.5)';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.stroke();
  // 배 (크림색)
  ell(ctx, face * u * 0.05, -u * 0.95 + breathe, u * 0.36, u * 0.55, '#fde7c6');
  // 조끼
  ctx.fillStyle = '#6a3a20';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.3, -u * 1.72 + breathe);
    ctx.quadraticCurveTo(sd * u * 0.85, -u * 1.5, sd * u * 0.78, -u * 0.7);
    ctx.quadraticCurveTo(sd * u * 0.55, -u * 0.45, sd * u * 0.32, -u * 0.62);
    ctx.quadraticCurveTo(sd * u * 0.42, -u * 1.2, sd * u * 0.3, -u * 1.72 + breathe);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,200,140,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-u * 0.32, -u * 0.65);
  ctx.quadraticCurveTo(-u * 0.42, -u * 1.2, -u * 0.3, -u * 1.7);
  ctx.moveTo(u * 0.32, -u * 0.65);
  ctx.quadraticCurveTo(u * 0.42, -u * 1.2, u * 0.3, -u * 1.7);
  ctx.stroke();
  // 별 배지
  const sx = face * u * 0.55, sy = -u * 1.22 + breathe;
  ctx.save();
  ctx.shadowColor = 'rgba(255,220,120,.9)';
  ctx.shadowBlur = u * 0.25;
  ctx.fillStyle = '#ffd23f';
  star5(ctx, sx, sy, u * 0.24, 0.48);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = '#9a6410';
  ctx.lineWidth = Math.max(1, u * 0.05);
  star5(ctx, sx, sy, u * 0.24, 0.48);
  ctx.stroke();
  ell(ctx, sx - u * 0.06, sy - u * 0.07, u * 0.05, u * 0.04, '#fff8d8');
  // 벨트
  ctx.fillStyle = '#3e2214';
  ctx.fillRect(-u * 0.72, -u * 0.62, u * 1.44, u * 0.14);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-u * 0.12, -u * 0.64, u * 0.24, u * 0.18);
  ctx.fillStyle = '#3e2214';
  ctx.fillRect(-u * 0.05, -u * 0.6, u * 0.1, u * 0.1);
  // 허리에 감아 둔 채찍
  if (coiled) {
    ctx.strokeStyle = '#4a2a16';
    ctx.lineWidth = u * 0.1;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(face * u * 0.78, -u * 0.5 + k * u * 0.05, u * 0.28 - k * u * 0.03, u * 0.2, 0.3 * face, 0, TAU);
      ctx.stroke();
    }
  }
  // 반대 팔 (허리에 척)
  ctx.strokeStyle = '#e88a34';
  ctx.lineWidth = u * 0.28;
  ctx.beginPath();
  ctx.moveTo(-face * u * 0.62, -u * 1.48);
  ctx.quadraticCurveTo(-face * u * 1.1, -u * 1.15, -face * u * 0.78, -u * 0.72);
  ctx.stroke();
  ell(ctx, -face * u * 0.76, -u * 0.72, u * 0.17, u * 0.15, '#fff1dc');
  // 채찍 팔
  const hx = hand ? hand.x - x : face * u * 0.95, hy = hand ? hand.y - y - bounce : -u * 0.75;
  ctx.strokeStyle = '#f39a3a';
  ctx.lineWidth = u * 0.3;
  ctx.beginPath();
  ctx.moveTo(face * u * 0.6, -u * 1.5);
  ctx.quadraticCurveTo(face * u * 0.9 + (hx - face * u * 0.9) * 0.3, -u * 1.5 + (hy + u * 1.5) * 0.3, hx, hy);
  ctx.stroke();
  // 손잡이
  ctx.strokeStyle = '#6a3a1c';
  ctx.lineWidth = u * 0.14;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  const hd = hand ? Math.atan2(hy + u * 1.5, hx - face * u * 0.6) : Math.PI / 2;
  ctx.lineTo(hx + Math.cos(hd) * u * 0.35, hy + Math.sin(hd) * u * 0.35);
  ctx.stroke();
  ell(ctx, hx, hy, u * 0.18, u * 0.17, '#fff1dc');
  // 목 손수건
  ctx.fillStyle = '#c8332e';
  ctx.beginPath();
  ctx.moveTo(-u * 0.48, -u * 1.75);
  ctx.lineTo(u * 0.48, -u * 1.75);
  ctx.lineTo(face * u * 0.1, -u * 1.38);
  ctx.closePath();
  ctx.fill();
  ell(ctx, -face * u * 0.2, -u * 1.62, u * 0.07, u * 0.05, '#ffe3d8');
  // 머리
  const hy0 = -u * 2.2 + breathe * 0.5 + (mood === 4 ? -u * 0.12 : 0);
  ctx.save();
  ctx.translate(0, hy0);
  if (mood === 5) ctx.rotate(Math.sin(t * 0.2) * 0.12);
  // 귀
  const earDrop = mood === 6 ? 0.35 : mood === 4 ? -0.1 : 0;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#e8862e';
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.32, -u * 0.48);
    ctx.lineTo(sd * u * (0.8 + earDrop * 0.5), -u * (1.0 - earDrop));
    ctx.lineTo(sd * u * 0.72, -u * 0.22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb3a8';
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.42, -u * 0.44);
    ctx.lineTo(sd * u * (0.74 + earDrop * 0.5), -u * (0.86 - earDrop));
    ctx.lineTo(sd * u * 0.66, -u * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-u * 0.25, -u * 0.3, u * 0.1, 0, 0, u * 0.95);
  ctx.fillStyle = fur(hg);
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.82, u * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,40,10,.5)';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.stroke();
  // 이마 줄무늬
  ctx.strokeStyle = '#b9601c';
  ctx.lineWidth = u * 0.08;
  for (const k of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.moveTo(k * u * 0.18, -u * 0.62);
    ctx.lineTo(k * u * 0.14, -u * 0.4);
    ctx.stroke();
  }
  // 볼 · 주둥이
  ell(ctx, face * u * 0.06, u * 0.2, u * 0.4, u * 0.27, '#fff3e0');
  ell(ctx, -u * 0.5, u * 0.12, u * 0.14, u * 0.08, 'rgba(255,120,110,.4)');
  ell(ctx, u * 0.5, u * 0.12, u * 0.14, u * 0.08, 'rgba(255,120,110,.4)');
  // 눈
  const ex = (sd: number) => face * u * 0.06 + sd * u * 0.3, ey = -u * 0.08;
  ctx.fillStyle = '#2a1608';
  ctx.strokeStyle = '#2a1608';
  ctx.lineWidth = Math.max(1.2, u * 0.08);
  for (const sd of [-1, 1]) {
    const cx = ex(sd);
    if (mood === 3 || mood === 7) {
      ctx.beginPath();
      ctx.arc(cx, ey + u * 0.05, u * 0.12, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 5) {
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const a = k * 0.62 + t * 0.35 * sd, rr = (k / 14) * u * 0.15;
        ctx.lineTo(cx + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.stroke();
    } else if (mood === 4) {
      ell(ctx, cx, ey, u * 0.16, u * 0.18, '#ffffff');
      ctx.stroke();
      ell(ctx, cx, ey, u * 0.06, u * 0.06, '#2a1608');
    } else if (mood === 6) {
      ctx.beginPath();
      ctx.arc(cx, ey - u * 0.02, u * 0.11, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      ell(ctx, cx + sd * u * 0.05, ey + u * 0.16 + (t % 40) * u * 0.006, u * 0.04, u * 0.06, '#9fe0ff');
    } else {
      // 느긋·힘줌: 반쯤 감은 자신만만한 눈 (힘줌일 땐 눈썹이 내려온다)
      ell(ctx, cx, ey, u * 0.11, u * (mood === 1 || mood === 2 ? 0.1 : 0.13), '#2a1608');
      ell(ctx, cx + u * 0.03, ey - u * 0.04, u * 0.035, u * 0.035, '#ffffff');
      ctx.fillStyle = '#f39a3a';
      ctx.fillRect(cx - u * 0.14, ey - u * 0.16, u * 0.28, u * (mood === 1 || mood === 2 ? 0.1 : 0.06));
      ctx.fillStyle = '#2a1608';
      ctx.lineWidth = Math.max(1.2, u * 0.07);
      ctx.beginPath();
      if (mood === 1 || mood === 2) {
        ctx.moveTo(cx - sd * u * 0.16, ey - u * 0.2);
        ctx.lineTo(cx + sd * u * 0.12, ey - u * 0.1);
      } else {
        ctx.moveTo(cx - u * 0.13, ey - u * 0.12);
        ctx.lineTo(cx + u * 0.13, ey - u * 0.12);
      }
      ctx.stroke();
    }
  }
  // 코 · 입
  const nx = face * u * 0.08, ny = u * 0.1;
  ctx.fillStyle = '#ff8a96';
  ctx.beginPath();
  ctx.moveTo(nx - u * 0.08, ny - u * 0.03);
  ctx.lineTo(nx + u * 0.08, ny - u * 0.03);
  ctx.lineTo(nx, ny + u * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a2a10';
  ctx.lineWidth = Math.max(1, u * 0.05);
  if (mood === 2 || mood === 4 || mood === 7) {
    ell(ctx, nx, ny + u * 0.2, u * (mood === 4 ? 0.09 : 0.14), u * (mood === 7 ? 0.1 : 0.12), '#7a2a20');
    ell(ctx, nx, ny + u * 0.26, u * 0.08, u * 0.04, '#ff8a96');
  } else if (mood === 1) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(nx - u * 0.13, ny + u * 0.1, u * 0.26, u * 0.07);
    ctx.strokeRect(nx - u * 0.13, ny + u * 0.1, u * 0.26, u * 0.07);
  } else if (mood === 6 || mood === 5) {
    ctx.beginPath();
    ctx.arc(nx, ny + u * 0.22, u * 0.08, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(nx, ny + u * 0.05);
    ctx.quadraticCurveTo(nx - u * 0.06, ny + u * 0.14, nx - u * 0.13, ny + u * 0.1);
    ctx.moveTo(nx, ny + u * 0.05);
    ctx.quadraticCurveTo(nx + u * 0.06, ny + u * 0.14, nx + u * (mood === 3 ? 0.18 : 0.13), ny + u * (mood === 3 ? 0.06 : 0.1));
    ctx.stroke();
  }
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (const k of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(nx + sd * u * 0.25, ny + u * 0.12 + k * u * 0.05);
      ctx.lineTo(nx + sd * u * 0.62, ny + u * 0.06 + k * u * 0.1);
      ctx.stroke();
    }
  // 카우보이 모자
  const tip = mood === 3 || mood === 7 ? -0.25 * face : mood === 5 ? 0.3 : 0;
  ctx.save();
  ctx.translate(0, -u * 0.52);
  ctx.rotate(tip);
  if (mood === 7) ctx.translate(0, -u * 0.25);
  const brim = ctx.createLinearGradient(0, -u * 0.2, 0, u * 0.15);
  brim.addColorStop(0, '#9a6236');
  brim.addColorStop(1, '#5e3418');
  ctx.fillStyle = brim;
  ctx.beginPath();
  ctx.moveTo(-u * 1.12, -u * 0.12);
  ctx.quadraticCurveTo(-u * 0.6, u * 0.18, 0, u * 0.12);
  ctx.quadraticCurveTo(u * 0.6, u * 0.18, u * 1.12, -u * 0.12);
  ctx.quadraticCurveTo(u * 0.6, -u * 0.02, 0, -u * 0.02);
  ctx.quadraticCurveTo(-u * 0.6, -u * 0.02, -u * 1.12, -u * 0.12);
  ctx.fill();
  const crown = ctx.createLinearGradient(-u * 0.5, 0, u * 0.5, 0);
  crown.addColorStop(0, '#a86c3c');
  crown.addColorStop(0.6, '#875128');
  crown.addColorStop(1, '#5e3418');
  ctx.fillStyle = crown;
  ctx.beginPath();
  ctx.moveTo(-u * 0.55, -u * 0.04);
  ctx.quadraticCurveTo(-u * 0.6, -u * 0.62, -u * 0.32, -u * 0.72);
  ctx.quadraticCurveTo(0, -u * 0.58, u * 0.32, -u * 0.72);
  ctx.quadraticCurveTo(u * 0.6, -u * 0.62, u * 0.55, -u * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#3e1e10';
  ctx.fillRect(-u * 0.56, -u * 0.2, u * 1.12, u * 0.14);
  ctx.strokeStyle = 'rgba(255,220,170,.45)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-u * 0.42, -u * 0.6);
  ctx.quadraticCurveTo(-u * 0.48, -u * 0.35, -u * 0.44, -u * 0.22);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // 채찍에 칭칭 감김
  if (tangled) {
    ctx.strokeStyle = '#4a2a16';
    ctx.lineWidth = u * 0.12;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(0, -u * (0.6 + k * 0.42), u * 0.9, u * 0.2, Math.sin(t * 0.1 + k) * 0.15, 0, TAU);
      ctx.stroke();
    }
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * TAU) / 3;
      ctx.fillStyle = '#fff27a';
      star5(ctx, Math.cos(a) * u * 0.8, -u * 3.3 + Math.sin(a) * u * 0.2, u * 0.16);
      ctx.fill();
    }
  }
  if (fever) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 0.4);
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -u * 1.5, u * 1.2, u * 1.9, 0, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

/** 쥐 도둑 (복면). 땅 위 한 점(x,y) 기준, 몸이 z만큼 떠 있다 */
function drawRat(ctx: C2, x: number, y: number, u: number, r: Rat, t: number, zpx: number) {
  const face = r.face, fly = r.st === FLY, stun = r.st === STUN && r.stun > 0, carry = r.st === CARRY || r.bag, boss = r.k === BOSS;
  const step = r.st === WALK || r.st === CARRY ? Math.sin(r.ph) : 0, bob = -Math.abs(step) * u * 0.12;
  ctx.save();
  ctx.translate(x, y - zpx);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (fly) {
    ctx.translate(0, -u * 0.8);
    ctx.rotate(r.rot);
    ctx.translate(0, u * 0.8);
  } else if (stun) ctx.rotate(Math.sin(t * 0.5) * 0.08);
  if (r.flash > 0 && r.flash % 4 < 2) ctx.globalAlpha = 0.6;
  const fur0 = boss ? '#7d6f7c' : '#a99ca8', fur1 = boss ? '#4e4350' : '#6e6272';
  // 꼬리
  ctx.strokeStyle = '#e3a0a6';
  ctx.lineWidth = u * 0.16;
  ctx.beginPath();
  ctx.moveTo(-face * u * 0.8, -u * 0.55 + bob);
  ctx.bezierCurveTo(-face * u * 1.6, -u * 0.4, -face * u * 1.7, -u * (1.3 + Math.sin(t * 0.2 + r.id) * 0.3), -face * u * 2.3, -u * (1.1 + Math.sin(t * 0.25 + r.id) * 0.25));
  ctx.stroke();
  // 발
  if (fly) {
    ctx.strokeStyle = '#efb3b8';
    ctx.lineWidth = u * 0.16;
    for (const [ax, ay] of [[-0.9, 0.0], [0.9, 0.0], [-0.7, -1.6], [0.9, -1.4]]) {
      ctx.beginPath();
      ctx.moveTo(ax * u * 0.4, -u * 0.8 + ay * u * 0.2);
      ctx.lineTo(ax * u, -u * 0.8 + ay * u * 0.6);
      ctx.stroke();
    }
  } else {
    ell(ctx, -u * 0.38 + step * u * 0.2, -u * 0.06, u * 0.2, u * 0.1, '#efb3b8');
    ell(ctx, u * 0.38 - step * u * 0.2, -u * 0.06, u * 0.2, u * 0.1, '#efb3b8');
  }
  // 몸
  const bg = ctx.createLinearGradient(0, -u * 1.5, 0, 0);
  bg.addColorStop(0, fur0);
  bg.addColorStop(1, fur1);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.72 + bob, u * (boss ? 1.05 : 0.92), u * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,40,.55)';
  ctx.lineWidth = Math.max(1, u * 0.07);
  ctx.stroke();
  ell(ctx, face * u * 0.25, -u * 0.55 + bob, u * 0.48, u * 0.4, boss ? '#b8a9b4' : '#ddd0d8');
  if (boss) {
    ctx.fillStyle = '#2a1a20';
    ctx.fillRect(-u * 0.95, -u * 0.62 + bob, u * 1.9, u * 0.16);
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(face * u * 0.2 - u * 0.12, -u * 0.66 + bob, u * 0.24, u * 0.22);
  }
  // 머리
  const hx = face * u * 0.78, hy = -u * 1.38 + bob;
  for (const [ex, ey, er] of [[0.25, -0.5, 0.36], [0.75, -0.55, 0.3]] as const) {
    ell(ctx, hx + face * (ex - 0.5) * u, hy + ey * u, er * u, er * u, fur1);
    ell(ctx, hx + face * (ex - 0.5) * u, hy + ey * u + u * 0.03, er * u * 0.6, er * u * 0.6, '#f2a8b4');
  }
  const hg = ctx.createRadialGradient(hx - u * 0.15, hy - u * 0.2, u * 0.05, hx, hy, u * 0.65);
  hg.addColorStop(0, fur0);
  hg.addColorStop(1, fur1);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.55, u * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,40,.5)';
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.stroke();
  // 주둥이 · 코
  ctx.fillStyle = fur0;
  ctx.beginPath();
  ctx.ellipse(hx + face * u * 0.45, hy + u * 0.1, u * 0.36, u * 0.24, face * 0.15, 0, TAU);
  ctx.fill();
  ell(ctx, hx + face * u * 0.8, hy + u * 0.05, u * 0.12, u * 0.1, '#ff8fa0');
  // 수염
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.lineWidth = 1;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + face * u * 0.6, hy + u * 0.12);
    ctx.lineTo(hx + face * u * 1.05, hy + u * (0.12 + k * 0.14));
    ctx.stroke();
  }
  // 복면(대장은 안대) + 눈
  if (boss) {
    ctx.strokeStyle = '#1a1014';
    ctx.lineWidth = Math.max(1, u * 0.06);
    ctx.beginPath();
    ctx.moveTo(hx - face * u * 0.5, hy - u * 0.35);
    ctx.lineTo(hx + face * u * 0.45, hy + u * 0.05);
    ctx.stroke();
    ell(ctx, hx + face * u * 0.25, hy - u * 0.1, u * 0.15, u * 0.13, '#1a1014');
  } else {
    ctx.fillStyle = '#1c1520';
    ctx.beginPath();
    ctx.roundRect(hx - u * 0.42, hy - u * 0.28, u * 0.92, u * 0.24, u * 0.1);
    ctx.fill();
    // 복면 끈 (펄럭)
    const fl = Math.sin(t * 0.3 + r.id) * u * 0.08;
    ctx.beginPath();
    ctx.moveTo(hx - face * u * 0.4, hy - u * 0.2);
    ctx.lineTo(hx - face * u * 0.85, hy - u * 0.3 + fl);
    ctx.lineTo(hx - face * u * 0.8, hy - u * 0.12 + fl);
    ctx.closePath();
    ctx.fill();
  }
  const eyes: number[] = boss ? [0.0] : [0.0, 0.3];
  for (const ex of eyes) {
    const cx = hx + face * u * ex, cy = hy - u * 0.16;
    if (fly) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, u * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx - u * 0.08, cy - u * 0.08);
      ctx.lineTo(cx + u * 0.08, cy + u * 0.08);
      ctx.moveTo(cx + u * 0.08, cy - u * 0.08);
      ctx.lineTo(cx - u * 0.08, cy + u * 0.08);
      ctx.stroke();
    } else if (stun) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, u * 0.05);
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = k * 0.7 + t * 0.4, rr = (k / 10) * u * 0.1;
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else {
      ell(ctx, cx, cy, u * 0.1, u * 0.085, '#ffffff');
      ell(ctx, cx + face * u * 0.03, cy + u * 0.01, u * 0.05, u * 0.05, '#120a10');
    }
  }
  // 눈썹 (살금살금 · 히죽)
  if (!fly && !stun) {
    ctx.strokeStyle = '#120a10';
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(hx - u * 0.12, hy - u * 0.38);
    ctx.lineTo(hx + face * u * 0.18, hy - u * 0.32);
    ctx.stroke();
  }
  // 입
  ctx.strokeStyle = '#3a1a20';
  ctx.lineWidth = Math.max(1, u * 0.06);
  if (fly) {
    ell(ctx, hx + face * u * 0.4, hy + u * 0.28, u * 0.13, u * 0.15, '#5a1a24');
    ell(ctx, hx + face * u * 0.45, hy + u * 0.38, u * 0.08, u * 0.06, '#ff8fa0');
  } else {
    ctx.beginPath();
    ctx.arc(hx + face * u * 0.4, hy + u * 0.16, u * (carry ? 0.16 : 0.1), 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hx + face * u * 0.38 - u * 0.04, hy + u * 0.2, u * 0.08, u * 0.09);
  }
  if (boss) {
    // 콧수염 · 모자
    ctx.strokeStyle = '#1a1014';
    ctx.lineWidth = u * 0.1;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(hx + face * u * 0.6, hy + u * 0.14);
      ctx.quadraticCurveTo(hx + face * u * 0.6 + sd * u * 0.35, hy + u * 0.32, hx + face * u * 0.6 + sd * u * 0.45, hy + u * 0.08);
      ctx.stroke();
    }
    ctx.fillStyle = '#1e1418';
    ctx.beginPath();
    ctx.ellipse(hx, hy - u * 0.5, u * 0.8, u * 0.16, -face * 0.1, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(hx - u * 0.42, hy - u * 1.0, u * 0.84, u * 0.52, u * 0.14);
    ctx.fill();
    ctx.fillStyle = '#c8332e';
    ctx.fillRect(hx - u * 0.42, hy - u * 0.66, u * 0.84, u * 0.1);
  }
  // 팔: 자루 들기 · 방패 · 그냥
  if (carry && !fly) {
    ctx.strokeStyle = fur1;
    ctx.lineWidth = u * 0.16;
    ctx.beginPath();
    ctx.moveTo(-u * 0.3, -u * 1.0);
    ctx.lineTo(-u * 0.2, -u * 1.75);
    ctx.moveTo(u * 0.3, -u * 1.0);
    ctx.lineTo(u * 0.2, -u * 1.75);
    ctx.stroke();
    sack(ctx, 0, -u * 1.65, u * (boss ? 0.8 : 0.62));
  } else if (r.k === SHIELD && r.shield && !fly) {
    const lx = face * u * 1.3, ly = -u * 0.85 + bob;
    const lg = ctx.createLinearGradient(lx - u * 0.3, ly - u, lx + u * 0.3, ly + u);
    lg.addColorStop(0, '#f2f4f6');
    lg.addColorStop(0.5, '#a8b0b8');
    lg.addColorStop(1, '#6a727a');
    ctx.fillStyle = lg;
    ctx.beginPath();
    ctx.ellipse(lx, ly, u * 0.36, u * 0.88, face * 0.1, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#4a5258';
    ctx.lineWidth = Math.max(1, u * 0.08);
    ctx.stroke();
    ell(ctx, lx + face * u * 0.18, ly, u * 0.1, u * 0.16, '#3a4046');
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = Math.max(1, u * 0.07);
    ctx.beginPath();
    ctx.ellipse(lx - face * u * 0.05, ly, u * 0.22, u * 0.66, face * 0.1, Math.PI * 0.9, Math.PI * 1.35);
    ctx.stroke();
    if (r.flash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.ellipse(lx, ly, u * 0.4, u * 0.95, 0, 0, TAU);
      ctx.fill();
    }
  } else if (!fly) {
    ell(ctx, face * u * 0.62, -u * 0.62 + bob, u * 0.13, u * 0.11, '#efb3b8');
  }
  ctx.restore();
  // 어질어질 별
  if (stun && !fly)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * TAU) / 3;
      ctx.fillStyle = '#fff27a';
      star5(ctx, x + Math.cos(a) * u * 0.7, y - zpx - u * 2.1 + Math.sin(a) * u * 0.2, u * 0.17);
      ctx.fill();
    }
  // 대장 체력
  if (boss && !fly)
    for (let k = 0; k < 3; k++) {
      heart(ctx, x + (k - 1) * u * 0.55, y - zpx - u * 2.9, u * 0.22);
      ctx.fillStyle = k < r.hp ? '#ff5a4a' : 'rgba(255,255,255,.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,10,20,.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  // 선인장 가시에 따끔 (엉덩이에 가시)
  if (r.mood === 4 && fly) {
    ctx.strokeStyle = '#2f6f3a';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(x - face * u * 0.8, y - zpx - u * (0.6 + k * 0.2));
      ctx.lineTo(x - face * u * 1.1, y - zpx - u * (0.7 + k * 0.2));
      ctx.stroke();
    }
  }
}

/** 화약통: 나무 통 + 쇠띠 + 빨간 띠의 폭탄 그림 + 심지 */
function drawBarrel(ctx: C2, x: number, y: number, u: number, lit: boolean, t: number) {
  const sh = lit ? Math.sin(t * 1.7) * u * 0.08 : 0;
  ell(ctx, x + u * 0.1, y + u * 0.05, u * 0.95, u * 0.35, 'rgba(50,15,30,.38)');
  ctx.save();
  ctx.translate(x + sh, y);
  const g = ctx.createLinearGradient(-u * 0.8, 0, u * 0.8, 0);
  g.addColorStop(0, '#6a3a1a');
  g.addColorStop(0.3, '#c98a4a');
  g.addColorStop(0.55, '#a96a34');
  g.addColorStop(1, '#4e2a12');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 0.62, 0);
  ctx.quadraticCurveTo(-u * 0.82, -u * 1.0, -u * 0.62, -u * 2.0);
  ctx.lineTo(u * 0.62, -u * 2.0);
  ctx.quadraticCurveTo(u * 0.82, -u * 1.0, u * 0.62, 0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,18,6,.5)';
  ctx.lineWidth = 1;
  for (const k of [-0.36, 0, 0.36]) {
    ctx.beginPath();
    ctx.moveTo(k * u, -u * 0.02);
    ctx.quadraticCurveTo(k * u * 1.25, -u, k * u, -u * 1.98);
    ctx.stroke();
  }
  // 빨간 띠 + 폭탄 그림
  ctx.fillStyle = '#c8332e';
  ctx.beginPath();
  ctx.moveTo(-u * 0.79, -u * 1.28);
  ctx.lineTo(u * 0.79, -u * 1.28);
  ctx.lineTo(u * 0.8, -u * 0.72);
  ctx.lineTo(-u * 0.8, -u * 0.72);
  ctx.fill();
  ell(ctx, 0, -u * 0.98, u * 0.2, u * 0.2, '#1a1418');
  ctx.strokeStyle = '#1a1418';
  ctx.lineWidth = Math.max(1, u * 0.07);
  ctx.beginPath();
  ctx.moveTo(u * 0.12, -u * 1.14);
  ctx.quadraticCurveTo(u * 0.25, -u * 1.28, u * 0.32, -u * 1.2);
  ctx.stroke();
  ell(ctx, -u * 0.07, -u * 1.05, u * 0.06, u * 0.05, 'rgba(255,255,255,.6)');
  // 쇠띠
  for (const hy of [-0.3, -1.72]) {
    ctx.fillStyle = '#3e3c46';
    ctx.fillRect(-u * 0.76, hy * u - u * 0.08, u * 1.52, u * 0.16);
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.fillRect(-u * 0.5, hy * u - u * 0.07, u * 0.5, u * 0.04);
  }
  // 뚜껑
  ell(ctx, 0, -u * 2.0, u * 0.62, u * 0.2, '#d9a066');
  ctx.strokeStyle = '#6a3a1a';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -u * 2.0, u * 0.62, u * 0.2, 0, 0, TAU);
  ctx.stroke();
  // 심지
  ctx.strokeStyle = '#e8d8b0';
  ctx.lineWidth = Math.max(1.2, u * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, -u * 2.0);
  ctx.quadraticCurveTo(u * 0.3, -u * 2.35, u * 0.12, -u * 2.6);
  ctx.stroke();
  if (lit) {
    ctx.save();
    ctx.shadowColor = '#ffcf4a';
    ctx.shadowBlur = u * 0.8;
    ctx.fillStyle = '#fff3a0';
    star5(ctx, u * 0.12, -u * 2.62, u * (0.3 + 0.12 * Math.sin(t * 1.3)), 0.4, t * 0.3);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** 사와로 선인장 (팔 둘, 세로 결, 가시, 꽃) */
function drawCactus(ctx: C2, x: number, y: number, u: number, wob: number, t: number) {
  ell(ctx, x + u * 0.4, y + u * 0.15, u * 1.6, u * 0.45, 'rgba(50,15,30,.35)');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wob > 0 ? Math.sin(wob * 0.8) * 0.06 * (wob / 24) : Math.sin(t * 0.02 + x) * 0.01);
  const g = ctx.createLinearGradient(-u, 0, u, 0);
  g.addColorStop(0, '#2f6f3a');
  g.addColorStop(0.35, '#5fb05e');
  g.addColorStop(1, '#245a30');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#1e4a28';
  ctx.lineWidth = Math.max(1, u * 0.08);
  const limb = (x0: number, y0: number, x1: number, y1: number, wd: number) => {
    ctx.beginPath();
    ctx.roundRect(Math.min(x0, x1) - wd / 2, Math.min(y0, y1) - wd / 2, Math.abs(x1 - x0) + wd, Math.abs(y1 - y0) + wd, wd / 2);
    ctx.fill();
    ctx.stroke();
  };
  // 팔 (가로 + 세로)
  limb(-u * 1.0, -u * 1.8, -u * 0.4, -u * 1.8, u * 0.6);
  limb(-u * 1.0, -u * 2.9, -u * 1.0, -u * 1.8, u * 0.6);
  limb(u * 0.4, -u * 2.4, u * 1.05, -u * 2.4, u * 0.56);
  limb(u * 1.05, -u * 3.3, u * 1.05, -u * 2.4, u * 0.56);
  // 몸통
  ctx.beginPath();
  ctx.roundRect(-u * 0.55, -u * 4.0, u * 1.1, u * 4.0, [u * 0.55, u * 0.55, u * 0.1, u * 0.1]);
  ctx.fill();
  ctx.stroke();
  // 세로 결
  ctx.strokeStyle = 'rgba(190,240,170,.45)';
  ctx.lineWidth = 1;
  for (const k of [-0.25, 0.08, 0.32]) {
    ctx.beginPath();
    ctx.moveTo(k * u, -u * 3.7);
    ctx.lineTo(k * u, -u * 0.1);
    ctx.stroke();
  }
  // 가시
  ctx.strokeStyle = '#fff8e0';
  for (let k = 0; k < 9; k++) {
    const yy = -u * (0.4 + k * 0.4);
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * u * 0.55, yy);
      ctx.lineTo(sd * u * 0.75, yy - u * 0.08);
      ctx.stroke();
    }
  }
  // 꽃
  for (const [fx2, fy] of [[0, -4.0], [-1.0, -2.95]]) {
    ctx.fillStyle = '#ff7ab0';
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU + 0.3;
      ell(ctx, fx2 * u + Math.cos(a) * u * 0.16, fy * u + Math.sin(a) * u * 0.1, u * 0.13, u * 0.1, '#ff7ab0');
    }
    ell(ctx, fx2 * u, fy * u, u * 0.09, u * 0.09, '#ffe066');
  }
  ctx.restore();
}

/** 두더지 굴: 흙 둔덕 + 구멍. 들썩일 땐 흔들리며 눈이 반짝, 막히면 판자 X */
function drawHole(ctx: C2, x: number, y: number, u: number, warn: boolean, plugged: boolean, t: number) {
  const sh = warn ? Math.sin(t * 1.4) * u * 0.08 : 0;
  ell(ctx, x + sh, y, u * 1.45, u * 0.62, '#7a4a2c');
  ell(ctx, x + sh, y - u * 0.12, u * 1.3, u * 0.5, '#a8683e');
  ell(ctx, x + sh - u * 0.4, y - u * 0.3, u * 0.5, u * 0.12, 'rgba(255,220,170,.35)');
  ell(ctx, x + sh, y - u * 0.05, u * 0.78, u * 0.3, '#2a1610');
  if (warn && !plugged) {
    const blink = Math.floor(t / 8) % 5 !== 0;
    if (blink) for (const sd of [-1, 1]) ell(ctx, x + sh + sd * u * 0.22, y - u * 0.08, u * 0.1, u * 0.08, '#ffe066');
    for (let k = 0; k < 4; k++) {
      const ph = (t * 0.05 + k * 0.25) % 1, a = -Math.PI / 2 + (k - 1.5) * 0.5;
      ell(ctx, x + Math.cos(a) * u * (0.6 + ph * 1.2), y - u * 0.3 - Math.sin(Math.PI * ph) * u * 1.0, u * 0.12, u * 0.1, '#8a5432');
    }
  }
  if (plugged) {
    ctx.save();
    ctx.translate(x, y - u * 0.05);
    for (const a of [-0.35, 0.35]) {
      ctx.save();
      ctx.rotate(a);
      ctx.fillStyle = '#c08a52';
      ctx.fillRect(-u * 1.0, -u * 0.13, u * 2.0, u * 0.26);
      ctx.strokeStyle = '#6a3e1e';
      ctx.lineWidth = 1;
      ctx.strokeRect(-u * 1.0, -u * 0.13, u * 2.0, u * 0.26);
      ell(ctx, -u * 0.8, 0, u * 0.05, u * 0.05, '#3a3a40');
      ell(ctx, u * 0.8, 0, u * 0.05, u * 0.05, '#3a3a40');
      ctx.restore();
    }
    ctx.restore();
  }
}

/** 회전초 (구르는 마른 풀공) */
function drawTumble(ctx: C2, x: number, y: number, u: number, rot: number) {
  ell(ctx, x, y + u * 0.9, u * 0.9, u * 0.25, 'rgba(50,15,30,.25)');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.strokeStyle = '#a07a3a';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 9; k++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, u * (0.9 - (k % 3) * 0.12), u * (0.5 + (k % 4) * 0.12), (k * Math.PI) / 9, 0, TAU);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d0a860';
  ctx.beginPath();
  ctx.arc(0, 0, u * 0.7, 0.3, 2.2);
  ctx.stroke();
  ctx.restore();
}

/** 울타리 위 암탉 (구경꾼). cheer면 날개를 퍼덕이며 폴짝 */
function drawHen(ctx: C2, x: number, y: number, u: number, t: number, cheer: number, face: number, hue: number) {
  const jump = cheer > 0 ? Math.abs(Math.sin(cheer * 0.25)) * u * 1.0 : 0, peck = cheer > 0 ? 0 : Math.max(0, Math.sin(t * 0.04 + hue)) ** 8;
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.scale(face, 1);
  ctx.strokeStyle = '#e8a030';
  ctx.lineWidth = Math.max(1, u * 0.1);
  ctx.beginPath();
  ctx.moveTo(-u * 0.15, -u * 0.2);
  ctx.lineTo(-u * 0.2, 0);
  ctx.moveTo(u * 0.15, -u * 0.2);
  ctx.lineTo(u * 0.2, 0);
  ctx.stroke();
  // 꼬리 깃
  ctx.fillStyle = hue ? '#c8743a' : '#e8e2d8';
  ctx.beginPath();
  ctx.moveTo(-u * 0.5, -u * 0.7);
  ctx.lineTo(-u * 1.0, -u * 1.25);
  ctx.lineTo(-u * 0.85, -u * 0.55);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createLinearGradient(0, -u * 1.2, 0, -u * 0.1);
  g.addColorStop(0, hue ? '#e89a5a' : '#ffffff');
  g.addColorStop(1, hue ? '#a8582a' : '#d6cfc4');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.6, u * 0.62, u * 0.45, 0, 0, TAU);
  ctx.fill();
  // 날개
  const flap = cheer > 0 ? Math.sin(cheer * 0.9) * 0.9 : 0;
  ctx.save();
  ctx.translate(-u * 0.1, -u * 0.65);
  ctx.rotate(-flap);
  ell(ctx, -u * 0.1, 0, u * 0.35, u * 0.2, hue ? '#b8642e' : '#ece6dc');
  ctx.restore();
  // 머리
  ctx.save();
  ctx.translate(u * 0.42, -u * 1.05);
  ctx.rotate(peck * 0.9);
  ell(ctx, 0, 0, u * 0.3, u * 0.3, hue ? '#e89a5a' : '#ffffff');
  ell(ctx, -u * 0.02, -u * 0.32, u * 0.12, u * 0.1, '#e8333a');
  ell(ctx, u * 0.1, -u * 0.34, u * 0.1, u * 0.09, '#e8333a');
  ell(ctx, u * 0.3, u * 0.12, u * 0.07, u * 0.12, '#e8333a');
  ctx.fillStyle = '#ffb020';
  ctx.beginPath();
  ctx.moveTo(u * 0.26, -u * 0.04);
  ctx.lineTo(u * (cheer > 0 ? 0.55 : 0.48), u * 0.02);
  ctx.lineTo(u * 0.26, u * 0.08);
  ctx.fill();
  ell(ctx, u * 0.1, -u * 0.06, u * 0.05, u * 0.06, '#1a1010');
  ctx.restore();
  ctx.restore();
}

type P3 = { x: number; y: number; z: number };
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const NODES = 16, RAT_SC = 1.38;
/** 채찍 마디 (평면 x,y와 높이 z). 손(hx, hz)에서 시작한다. 감아 둔 때는 null */
function whipNodes(s: WhipState, hx: number, hz: number): P3[] | null {
  const out: P3[] = [], t = s.t;
  const k = s.strike ? s.t - s.strike.t0 : 999;
  if (s.strike && k < BUSY + 2) {
    const st = s.strike, from = st.from, da = wrapA(st.a - from);
    for (let i = 0; i < NODES; i++) {
      const u = i / (NODES - 1);
      let ang: number, rad: number, z: number;
      if (k < CRACK) {
        const q = k / CRACK;
        ang = from + da * ease(q * 1.7 - u * 0.7);
        rad = u * st.cut * (0.3 + 0.7 * ease(q * 1.3 - u * 0.3));
        z = hz * (1 - u) * (1 - q * 0.4) + u * 0.07 * (1 - q) + 0.004;
      } else if (k < CRACK + 4) {
        ang = st.a + Math.sin(u * 9 - k * 1.5) * 0.04 * (1 - u);
        rad = u * st.cut;
        z = hz * (1 - u) ** 2 + 0.004;
      } else {
        const e = ease((k - CRACK - 4) / (BUSY - CRACK - 2));
        ang = st.a + e * u * 1.8;
        rad = u * st.cut * (1 - e * 0.85);
        z = hz * (1 - u) ** 2 * (1 - e * 0.3) + e * u * 0.06 + 0.004;
      }
      out.push({ x: hx + Math.cos(ang) * rad, y: CY + Math.sin(ang) * rad, z });
    }
    return out;
  }
  if (s.down && s.phase === 'play' && s.tangle <= 0 && !busy(s) && s.hold > 0) {
    const p = power(s), rS = spinR(p) + 0.01;
    for (let i = 0; i < NODES; i++) {
      const u = i / (NODES - 1), ang = s.spinA - u * (0.7 + 0.5 * (1 - p));
      out.push({ x: hx + Math.cos(ang) * rS * u ** 0.85, y: CY + Math.sin(ang) * rS * u ** 0.85, z: hz * (1 - u) + 0.03 * u + Math.sin(t * 0.3 + u * 6) * 0.003 });
    }
    return out;
  }
  return null;
}

/** 손으로 그린 가리키는 손가락 (첫 안내) */
function drawHand(ctx: C2, x: number, y: number, u: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  ctx.fillStyle = '#fff3e4';
  ctx.strokeStyle = '#4a2a1a';
  ctx.lineWidth = Math.max(1.5, u * 0.12);
  ctx.beginPath();
  ctx.roundRect(-u * 0.32, 0, u * 0.64, u * 1.5, u * 0.32);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(-u * 0.7, u * 1.0, u * 1.65, u * 1.45, u * 0.45);
  ctx.fill();
  ctx.stroke();
  for (const k of [0.15, 0.55]) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.32 + k * u * 1.3, u * 1.1);
    ctx.lineTo(-u * 0.32 + k * u * 1.3, u * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function drawAll(ctx: C2, s: WhipState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const SY = (y: number, z = 0) => (PY0 + y * KY - z) * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const bx = X(CX), by = SY(CY);
  ctx.save();
  fx.begin(ctx);
  drawSky(ctx, w, t);
  drawTown(ctx, w, t);
  drawGround(ctx, w, t);
  // 금고 둘레 받침 (돌 원판) + 위험 고리
  {
    const rx = R(SAFE_R + 0.035), ry = rx * KY;
    ell(ctx, bx, by + R(0.012), rx * 1.08, ry * 1.08, 'rgba(90,40,30,.35)');
    const pg = ctx.createRadialGradient(bx - rx * 0.3, by - ry * 0.3, rx * 0.1, bx, by, rx);
    pg.addColorStop(0, '#e9c79a');
    pg.addColorStop(1, '#b98d62');
    ell(ctx, bx, by, rx, ry, pg);
    ctx.strokeStyle = 'rgba(110,60,30,.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(bx, by, rx, ry, 0, 0, TAU);
    ctx.stroke();
    const near = s.rats.some((r) => (r.st === WALK || r.st === CARRY) && dist(r.x, r.y) < 0.17);
    if (near && s.phase === 'play') {
      ctx.strokeStyle = `rgba(255,80,60,${0.45 + 0.35 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.ellipse(bx, by, R(SAFE_R + RR[0]), R(SAFE_R + RR[0]) * KY, 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  drawProps(ctx, w, t);
  // 굴 (땅 무늬)
  s.holes.forEach((ho, i) => drawHole(ctx, X(ho.x), SY(ho.y), R(0.036), s.rats.some((r) => r.st === HIDE && r.hole === i), ho.plugged, t));
  // 회전초 (꾸밈: 12초마다 광장을 가로질러 굴러간다)
  {
    const per = 760, ph = t % per, k = Math.floor(t / per);
    if (ph < 420) {
      const dir = k % 2 ? -1 : 1, xx = dir > 0 ? -0.1 + ph * 0.0029 : 1.1 - ph * 0.0029, yy = 0.86 + (k % 3) * 0.05;
      drawTumble(ctx, X(xx), SY(yy) - Math.abs(Math.sin(ph * 0.08)) * R(0.03) - R(0.02), R(0.022), ph * 0.12 * dir);
    }
  }
  // 미리 보기 (누르는 동안 땅 위에): 채찍이 닿는 선 · 끝(크게 날림) · 선인장 걸림
  const p = power(s);
  if (s.down && s.phase === 'play' && s.tangle <= 0 && s.spot <= 0) {
    const a = s.aimA, ux = Math.cos(a), uy = Math.sin(a), L = reach(p);
    let cut = L, snag = -1;
    s.cacti.forEach((c, i) => {
      const tx = c.x - CX, ty = c.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
      if (al > 0 && pp < c.r + 0.012 && al - c.r * 0.5 < cut) (cut = Math.max(0.06, al - c.r * 0.5)), (snag = i);
    });
    const tip = tipLen(s), P = (dd: number) => [X(CX + ux * dd), SY(CY + uy * dd)];
    // 최대 길이 (더 모으면 여기까지)
    if (p < 1 && snag < 0) {
      ctx.strokeStyle = 'rgba(255,240,210,.28)';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(...(P(cut) as [number, number]));
      ctx.lineTo(...(P(L1) as [number, number]));
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // 몸통 줄
    ctx.strokeStyle = 'rgba(255,248,230,.55)';
    ctx.lineWidth = R(0.012);
    ctx.lineCap = 'round';
    ctx.setLineDash([R(0.016), R(0.012)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    ctx.moveTo(...(P(0.05) as [number, number]));
    ctx.lineTo(...(P(Math.max(0.05, cut - tip)) as [number, number]));
    ctx.stroke();
    ctx.setLineDash([]);
    // 끝 (빛나는 띠)
    ctx.save();
    ctx.shadowColor = s.fever > 0 ? '#ff8a20' : '#ffd23f';
    ctx.shadowBlur = R(0.03);
    ctx.strokeStyle = s.fever > 0 ? `rgba(255,140,40,${0.75 + 0.2 * Math.sin(t * 0.4)})` : `rgba(255,214,90,${0.7 + 0.25 * Math.sin(t * 0.4)})`;
    ctx.lineWidth = R(0.03);
    ctx.beginPath();
    ctx.moveTo(...(P(Math.max(0.05, cut - tip)) as [number, number]));
    ctx.lineTo(...(P(cut) as [number, number]));
    ctx.stroke();
    ctx.restore();
    if (snag >= 0) {
      const [sx2, sy2] = P(cut + 0.01);
      ctx.strokeStyle = '#ff6a50';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sx2 - 6, sy2 - 6);
      ctx.lineTo(sx2 + 6, sy2 + 6);
      ctx.moveTo(sx2 + 6, sy2 - 6);
      ctx.lineTo(sx2 - 6, sy2 + 6);
      ctx.stroke();
    }
    // 맞을 것 표시: 끝 = 빨간 과녁 + 날아갈 화살, 몸통 = 노란 고리, 방패 = 회색
    for (const r of s.rats) {
      if (!active(r)) continue;
      const rr = RR[r.k], tx = r.x - CX, ty = r.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
      if (al < 0.02 || al > cut + rr || pp > HW + rr) continue;
      const isTip = al >= cut - tip, cx2 = X(r.x), cy2 = SY(r.y) - R(rr) * 0.8, rad = R(rr) * 1.5;
      const blocked = r.k === SHIELD && r.shield;
      ctx.strokeStyle = blocked ? 'rgba(220,225,235,.9)' : isTip ? '#ff4a3a' : '#ffd23f';
      ctx.lineWidth = isTip && !blocked ? 3 : 2;
      ctx.beginPath();
      ctx.ellipse(cx2, cy2, rad, rad * 0.85, 0, 0, TAU);
      ctx.stroke();
      if (isTip && !blocked) {
        for (let k = 0; k < 4; k++) {
          const aa = (k * Math.PI) / 2 + t * 0.05;
          ctx.beginPath();
          ctx.moveTo(cx2 + Math.cos(aa) * rad * 0.7, cy2 + Math.sin(aa) * rad * 0.6);
          ctx.lineTo(cx2 + Math.cos(aa) * rad * 1.25, cy2 + Math.sin(aa) * rad * 1.05);
          ctx.stroke();
        }
        const ax2 = X(r.x + ux * 0.1), ay2 = SY(r.y + uy * 0.1) - R(rr) * 0.8;
        ctx.strokeStyle = 'rgba(255,90,70,.75)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx2 + (ax2 - cx2) * 0.45, cy2 + (ay2 - cy2) * 0.45);
        ctx.lineTo(ax2, ay2);
        const ha = Math.atan2(ay2 - cy2, ax2 - cx2);
        ctx.lineTo(ax2 - Math.cos(ha - 0.5) * 7, ay2 - Math.sin(ha - 0.5) * 7);
        ctx.moveTo(ax2, ay2);
        ctx.lineTo(ax2 - Math.cos(ha + 0.5) * 7, ay2 - Math.sin(ha + 0.5) * 7);
        ctx.stroke();
      }
    }
    for (const b of s.barrels) {
      if (b.st) continue;
      const tx = b.x - CX, ty = b.y - CY, al = tx * ux + ty * uy, pp = Math.abs(-tx * uy + ty * ux);
      if (al > 0.03 && al < cut + 0.03 && pp < HW + 0.034) {
        ctx.strokeStyle = `rgba(255,120,40,${0.6 + 0.4 * Math.sin(t * 0.5)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(X(b.x), SY(b.y), R(BLAST_R), R(BLAST_R) * KY, 0, 0, TAU);
        ctx.stroke();
      }
    }
  }
  // 주인공 뒤 노을빛 번짐
  {
    const gg = ctx.createRadialGradient(bx, by - R(0.14), R(0.02), bx, by - R(0.14), R(0.24));
    gg.addColorStop(0, s.fever > 0 ? 'rgba(255,170,60,.38)' : 'rgba(255,225,150,.3)');
    gg.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(bx - R(0.25), by - R(0.4), R(0.5), R(0.5));
  }
  // ── 깊이 순서로: 그림자 → 물건·쥐·금고 ──
  for (const r of s.rats) {
    if (r.st === HIDE || r.st === GONE || (r.y < -0.04 && r.st !== FLY)) continue;
    const u = R(RR[r.k]) * RAT_SC, sc = Math.max(0.35, 1 - r.z * 6);
    ell(ctx, X(r.x) + u * 0.15, SY(r.y) + u * 0.08, u * 1.15 * sc, u * 0.4 * sc, `rgba(50,15,30,${0.35 * sc})`);
  }
  type It = { y: number; f: () => void };
  const items: It[] = [];
  for (const c of s.cacti) items.push({ y: c.y, f: () => drawCactus(ctx, X(c.x), SY(c.y), R(c.r) * 1.2, c.wob, t) });
  for (const b of s.barrels) if (b.st < 2) items.push({ y: b.y, f: () => drawBarrel(ctx, X(b.x), SY(b.y), R(0.042), b.st === 1, t) });
  for (const r of s.rats) {
    if (r.st === HIDE || r.st === GONE || (r.y < -0.07 && r.st !== FLY)) continue;
    items.push({
      y: r.y + (r.st === FLY ? 0.02 : 0),
      f: () => {
        const u = R(RR[r.k]) * RAT_SC;
        // 건물 뒤 골목에서 나오는 쥐는 처마 그늘 아래로만 보인다
        const behind = r.y < 0.03 && r.st !== FLY;
        if (behind) {
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, SY(-0.075), w, h);
          ctx.clip();
        }
        // 날아가는 쥐: 꼬리 빛줄기
        if (r.st === FLY && Math.hypot(r.vx, r.vy) > 0.006) {
          const x0 = X(r.x), y0 = SY(r.y) - R(r.z) - u * 0.8, x1 = X(r.x - r.vx * 7), y1 = SY(r.y - r.vy * 7) - R(r.z - r.vz * 7) - u * 0.8;
          const lg = ctx.createLinearGradient(x0, y0, x1, y1);
          lg.addColorStop(0, 'rgba(255,245,215,.75)');
          lg.addColorStop(1, 'rgba(255,245,215,0)');
          ctx.strokeStyle = lg;
          ctx.lineWidth = u * 1.1;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x1, y1);
          ctx.stroke();
        }
        drawRat(ctx, X(r.x), SY(r.y), u, r, t, R(r.z));
        if ((r.st === CARRY || r.bag) && r.st !== FLY) {
          // 자루 든 쥐: 빨간 느낌표 말풍선
          const ex = X(r.x), ey = SY(r.y) - u * 3.0 - Math.abs(Math.sin(t * 0.2)) * 3;
          ell(ctx, ex, ey, R(0.018), R(0.018), '#ff4a3a');
          ctx.fillStyle = '#ffffff';
          font(0.03, 900);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('!', ex, ey + 1);
        }
        if (behind) ctx.restore();
      },
    });
  }
  // 금고 + 돈자루 + 고양이
  const cat = s.cat;
  const charging = s.down && s.phase === 'play' && s.tangle <= 0 && !busy(s) && s.hold > 0;
  const striking = !!s.strike && s.t - s.strike.t0 < BUSY;
  const mood = s.tangle > 0 ? 5 : cat.moodT > 0 && (cat.mood === 4 || cat.mood === 6 || cat.mood === 7) ? cat.mood : striking ? 2 : charging ? (s.hold > WARN_T ? 5 : 1) : cat.moodT > 0 ? cat.mood : 0;
  const face = charging || striking ? (Math.cos(striking ? s.strike!.a : s.aimA) >= 0 ? 1 : -1) : cat.face;
  const cu = R(0.054);
  let handScr: { x: number; y: number } | null = null, feetY = 0;
  items.push({
    y: CY,
    f: () => {
      feetY = drawSafe(ctx, bx, by, R(0.056), s.cat.moodT > 0 && s.cat.mood === 4 ? Math.sin(t * 1.5) * 1.5 : 0);
      // 돈자루 더미 (금고 앞)
      const spots = [[-0.052, 0.062], [0.0, 0.07], [0.052, 0.062], [-0.026, 0.045], [0.026, 0.045], [0.0, 0.026]];
      for (let k = 0; k < s.bagMax; k++) {
        const [sx2, sy2] = spots[k];
        sack(ctx, bx + R(sx2 * 1.1), by + R(sy2 * 1.1), R(0.019), k >= s.bags);
      }
      if (charging) handScr = { x: bx + face * cu * 0.3, y: feetY - cu * 3.25 };
      else if (striking) {
        const a = s.strike!.a;
        handScr = { x: bx + Math.cos(a) * cu * 1.3, y: feetY - cu * 1.7 + Math.sin(a) * cu * 0.6 };
      }
      drawCat(ctx, bx, feetY, cu, face, mood, t, handScr, !charging && !striking && s.tangle <= 0, s.tangle > 0, s.fever > 0);
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // ── 채찍 (손에서) ──
  if (handScr) {
    const hs = handScr as { x: number; y: number };
    const hx = hs.x / w, hz = PY0 + CY * KY - hs.y / w;
    const nodes = whipNodes(s, hx, hz);
    if (nodes) {
      const scr = nodes.map((q) => [X(q.x), SY(q.y, q.z)]);
      // 땅 그림자
      ctx.strokeStyle = 'rgba(50,15,30,.22)';
      ctx.lineWidth = R(0.008);
      ctx.lineCap = 'round';
      ctx.beginPath();
      nodes.forEach((q, i) => (i ? ctx.lineTo(X(q.x), SY(q.y)) : ctx.moveTo(X(q.x), SY(q.y))));
      ctx.stroke();
      // 돌아가는 채찍의 흐린 꼬리
      if (charging) {
        const rS = spinR(p) + 0.01;
        // 바닥에 도는 원 (튕겨 낼 범위)
        ctx.strokeStyle = s.fever > 0 ? 'rgba(255,150,50,.35)' : 'rgba(255,240,200,.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.ellipse(X(CX), SY(CY), R(spinR(p)), R(spinR(p)) * KY, 0, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        for (let k = 0; k < 14; k++) {
          const a0 = s.spinA - 0.13 * (k + 1), a1 = s.spinA - 0.13 * k;
          ctx.strokeStyle = s.fever > 0 ? `rgba(255,170,60,${0.7 - k * 0.048})` : `rgba(255,246,220,${0.65 - k * 0.045})`;
          ctx.lineWidth = R(0.018) * (1 - k * 0.055);
          ctx.beginPath();
          ctx.ellipse(X(CX), SY(CY, 0.03), R(rS), R(rS) * KY, 0, a0, a1);
          ctx.stroke();
        }
      }
      const fev = s.fever > 0;
      if (fev) {
        ctx.save();
        ctx.shadowColor = '#ff8a20';
        ctx.shadowBlur = R(0.025);
      }
      for (let i = 0; i < scr.length - 1; i++) {
        const u = i / (scr.length - 1);
        ctx.strokeStyle = fev ? `rgb(${255},${Math.round(150 + 80 * u)},${Math.round(40 + 60 * u)})` : i % 2 ? '#3a2214' : '#4a2c18';
        ctx.lineWidth = R(0.015) * (1 - u * 0.7);
        ctx.beginPath();
        ctx.moveTo(scr[i][0], scr[i][1]);
        ctx.lineTo(scr[i + 1][0], scr[i + 1][1]);
        ctx.stroke();
      }
      if (fev) ctx.restore();
      ctx.strokeStyle = 'rgba(255,210,160,.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      scr.forEach(([x2, y2], i) => (i ? ctx.lineTo(x2, y2 - 1) : ctx.moveTo(x2, y2 - 1)));
      ctx.stroke();
      // 끝 반짝 (모을수록 크게)
      const [tx2, ty2] = scr[scr.length - 1];
      const gl = charging ? 0.4 + p * 0.9 : striking && s.t - s.strike!.t0 <= CRACK + 2 ? 1.4 : 0.4;
      ctx.save();
      ctx.shadowColor = fev ? '#ff9a30' : '#fff2b0';
      ctx.shadowBlur = R(0.02) * gl;
      ctx.fillStyle = fev ? '#ffd27a' : '#fff8e0';
      star5(ctx, tx2, ty2, R(0.009) * (1 + gl), 0.4, t * 0.3);
      ctx.fill();
      ctx.restore();
      // 선인장에 감긴 고리
      if (striking && s.strike!.snag >= 0 && s.t - s.strike!.t0 >= CRACK) {
        const c = s.cacti[s.strike!.snag];
        ctx.strokeStyle = '#3a2214';
        ctx.lineWidth = R(0.004);
        ctx.beginPath();
        ctx.ellipse(X(c.x), SY(c.y) - R(c.r) * 2, R(c.r) * 0.75, R(c.r) * 0.3, 0, 0, TAU);
        ctx.stroke();
      }
      // 모으는 중: 끝에서 불꽃이 튄다 (틱마다 한 번)
      if (charging && fx.memo.spk !== t && t % 3 === 0) {
        fx.memo.spk = t;
        fx.burst(tx2, ty2, p >= 1 ? '#ffd23f' : '#fff3c4', 1 + Math.round(p * 3), 1.5 + p * 2, 1.4 + p);
      }
    }
  }
  // 첫 안내: 손가락이 화약통을 꾹-떼기
  if (s.stage === 0 && !s.firstDone && s.phase === 'play') {
    const b = s.barrels[0], cyc = t % 110, press = cyc > 30 && cyc < 80 ? 1 : 0;
    const bx2 = X(b.x), by2 = SY(b.y) - R(0.035);
    ctx.strokeStyle = `rgba(255,240,180,${0.5 + 0.4 * Math.sin(t * 0.2)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(bx2, by2, R(0.05) + (press ? (cyc - 30) * 0.3 : 0), 0, TAU);
    ctx.stroke();
    drawHand(ctx, bx2 + R(0.012), by2 + R(0.012) - (press ? 0 : Math.min(1, Math.abs(cyc - 30) / 20) * R(0.03)), R(0.03), press);
  }
  // 빛줄기 속 먼지 (금빛으로 떠다닌다)
  for (let k = 0; k < 26; k++) {
    const lane = [0.21, 0.47, 0.71][k % 3], ph = (t * (0.0007 + hsh(k) * 0.0006) + hsh(k * 3.3)) % 1;
    const x = X(lane + hsh(k * 1.9) * 0.12 + ph * 0.06) + Math.sin(t * 0.02 + k) * 4, y = Y(PY0 + 0.02 + ph * 0.42);
    ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.7;
    ell(ctx, x, y, 1.3, 1.3, '#fff0c8');
  }
  ctx.globalAlpha = 1;
  // 폭발 불덩이 · 철썩 섬광 (사건 기록으로 그린다)
  for (const e of s.events) {
    const age = s.t - e.t;
    if (e.kind === 'boom' && age < 34) {
      const x = X(e.x), y = SY(e.y) - R(0.03), k = age / 34, r0 = R(BLAST_R) * (0.35 + 0.9 * ease(age / 10));
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - k * 1.1);
      const fg = ctx.createRadialGradient(x, y, r0 * 0.1, x, y, r0);
      fg.addColorStop(0, '#fffbe0');
      fg.addColorStop(0.25, '#ffe066');
      fg.addColorStop(0.55, '#ff8a2a');
      fg.addColorStop(0.85, 'rgba(200,50,30,.55)');
      fg.addColorStop(1, 'rgba(120,30,30,0)');
      ctx.fillStyle = fg;
      ctx.beginPath();
      for (let j = 0; j <= 18; j++) {
        const a = (j / 18) * TAU, rr = r0 * (0.82 + 0.18 * Math.sin(j * 2.7 + e.t));
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8);
      }
      ctx.fill();
      // 연기 고리
      ctx.globalAlpha = Math.max(0, 0.7 - k * 0.8);
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * TAU + e.t, rr = r0 * (0.9 + k * 0.6);
        ell(ctx, x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.6 - k * R(0.04), R(0.03) * (0.6 + k), R(0.025) * (0.6 + k), '#6a5560');
      }
      ctx.restore();
    }
    if (e.kind === 'crack' && age < 9 && e.text !== '휙~') {
      const x = X(e.x), y = SY(e.y), k = age / 9, rr = R(0.035 + (e.n ?? 0) * 0.025) * (0.6 + k);
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.fillStyle = '#ffffff';
      star5(ctx, x, y, rr, 0.32, e.t);
      ctx.fill();
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2;
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU + 0.2;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * rr * 1.1, y + Math.sin(a) * rr * 0.9);
        ctx.lineTo(x + Math.cos(a) * rr * 1.8, y + Math.sin(a) * rr * 1.45);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // ── 앞 울타리 · 구경꾼 암탉 ──
  {
    const yr = SY(1.075), post = R(0.012);
    const bwg = ctx.createLinearGradient(0, yr, 0, Y(HUD_B));
    bwg.addColorStop(0, '#8a5634');
    bwg.addColorStop(1, '#5a3420');
    ctx.fillStyle = bwg;
    ctx.fillRect(-10, yr + R(0.035), w + 20, Y(HUD_B) - yr);
    ctx.strokeStyle = 'rgba(40,18,10,.45)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.moveTo(0, yr + R(0.045 + k * 0.022));
      ctx.lineTo(w, yr + R(0.045 + k * 0.022));
      ctx.stroke();
    }
    for (const ry of [-0.035, -0.008]) {
      const rg = ctx.createLinearGradient(0, yr + R(ry) - 3, 0, yr + R(ry) + 4);
      rg.addColorStop(0, '#c98a52');
      rg.addColorStop(1, '#7a4a2a');
      ctx.fillStyle = rg;
      ctx.fillRect(-10, yr + R(ry) - R(0.007), w + 20, R(0.014));
    }
    for (let x = R(0.04); x < w; x += R(0.15)) {
      const pg = ctx.createLinearGradient(x - post, 0, x + post, 0);
      pg.addColorStop(0, '#b47a46');
      pg.addColorStop(1, '#6a3e22');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.roundRect(x - post, yr - R(0.055), post * 2, R(0.09), [post * 0.6, post * 0.6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,220,170,.35)';
      ctx.fillRect(x - post + 1, yr - R(0.053), 2, R(0.08));
    }
    const ch = s.t - s.cheer;
    drawHen(ctx, X(0.1), yr - R(0.042), R(0.036), t, ch < 70 ? ch + 1 : 0, 1, 0);
    drawHen(ctx, X(0.9), yr - R(0.042), R(0.036), t + 37, ch < 70 ? ch + 5 : 0, -1, 1);
  }
  // 가장자리 어둡게 (시선이 가운데로)
  {
    const vg = ctx.createRadialGradient(w / 2, Y(0.72), R(0.45), w / 2, Y(0.72), R(0.95));
    vg.addColorStop(0, 'rgba(40,10,30,0)');
    vg.addColorStop(1, 'rgba(40,10,30,.35)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Y(0.085), w, Y(HUD_B - 0.085));
  }
  // 느린 화면 · 피버: 가장자리 빛
  if (s.slow > 0 || s.fever > 0) {
    const vg = ctx.createRadialGradient(w / 2, Y(0.75), R(0.3), w / 2, Y(0.75), R(0.85));
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, s.slow > 0 ? 'rgba(255,200,90,.32)' : 'rgba(255,120,40,.22)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, Y(0.085), w, Y(HUD_B - 0.085));
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = SY(e.y) - R(0.03), big = Math.min(1.6, 1 + s.combo * 0.08);
    const say = (text: string, col: string, size: number, yy = y - R(0.05)) => {
      let rec = recentSay.get(s);
      if (!rec) recentSay.set(s, (rec = []));
      ctx.font = `800 ${Math.max(12, size)}px system-ui, sans-serif`;
      const tw = ctx.measureText(text).width / 2 + 6, xx = Math.max(tw, Math.min(w - tw, x));
      // 판 카드·결과 카드가 떠 있으면 그 아래로만 (글자가 카드를 가리지 않게)
      const top = s.phase === 'result' || (s.phase === 'play' && s.pt < CARD_T) ? R(0.36) : R(0.14) + size;
      for (let k = 0; k < 4 && rec.some((q) => s.t - q.t < 36 && Math.abs(q.x - xx) < w * 0.3 && Math.abs(q.y - yy) < size + 3); k++) yy += yy - (size + 3) < top ? size + 3 : -(size + 3);
      yy = Math.max(top, yy);
      rec.push({ x: xx, y: yy, t: s.t });
      if (rec.length > 16) rec.shift();
      fx.pop(xx, yy, text, col, Math.max(12, size));
    };
    switch (e.kind) {
      case 'crack': {
        const pw = e.n ?? 0;
        fx.ring(x, y + R(0.02), '#fff6d8', R(0.05 + pw * 0.04), 3 + pw * 2);
        fx.burst(x, y + R(0.02), '#fff3c4', 10 + Math.round(pw * 10), 3 + pw * 2, 2.2);
        fx.burst(x, y + R(0.025), '#d9a274', 8, 2, 2.4);
        fx.kick(2 + pw * 3);
        if (e.text) say(e.text, e.text === '휙~' ? '#ffe9c8' : '#ffffff', (e.text === '철썩!' ? 20 : 15) + pw * 6, y - R(0.02));
        break;
      }
      case 'whoosh':
        if (e.text && (e.n ?? 0) >= 0.25) {
          const a = s.spinA + 0.6, wx = bx + Math.cos(a) * R(spinR(e.n ?? 0) + 0.05), wy = by - R(0.05) + Math.sin(a) * R(spinR(e.n ?? 0) + 0.05) * KY;
          fx.pop(Math.max(R(0.1), Math.min(w - R(0.1), wx)), wy, e.text, (e.n ?? 0) >= 1 ? '#ffd23f' : '#fff3c4', Math.max(12, 12 + (e.n ?? 0) * 5));
        }
        break;
      case 'full':
        fx.ring(bx, by - cu * 3, '#ffd23f', R(0.08), 3), say('힘 가득!', '#ffd23f', 15, by - cu * 4.6);
        break;
      case 'warn':
        say('어, 어지러…', '#ffe0b0', 13, by - cu * 4.6);
        break;
      case 'tangle':
        fx.burst(bx, by - cu * 2, '#c8a070', 18, 3, 2.4), fx.kick(4), say('칭칭 꽁꽁~', '#ffd0a0', 17, by - cu * 4.6);
        break;
      case 'ko':
        fx.burst(x, y, '#c9b8c8', 10, 3, 2.2), fx.burst(x, y + R(0.02), '#e2b080', 8, 2.4, 2.6);
        // 비명은 한 번에 하나만 (여럿이면 '한 번에 셋!'이 대신 말한다)
        if (s.t - (fx.memo.koT ?? -99) > 10) (fx.memo.koT = s.t), say(e.text!, '#ffe2e8', 13 * big);
        break;
      case 'multi':
        fx.burst(x, y, '#ffd23f', 34, 5.5, 3), fx.ring(x, y, '#ffd23f', R(0.16), 6), fx.kick(7), fx.blink('#fff1c0', 0.25), say(e.text!, '#ffd23f', 22 + (e.n ?? 3) * 2, y - R(0.09));
        s.cheer = s.t;
        break;
      case 'boom':
        fx.burst(x, y, '#ffb340', 34, 6, 3.6), fx.burst(x, y, '#ff6a3a', 22, 4.5, 3.2), fx.burst(x, y, '#5a4a4a', 18, 3, 4), fx.burst(x, y, '#9a6236', 14, 5, 2.4);
        fx.ring(x, y, '#ffe08a', R(BLAST_R) * 1.3, 8), fx.kick(11), fx.blink('#ffcf6b', 0.38), say('펑!!', '#fff1a0', 28, y - R(0.07));
        break;
      case 'lit':
        fx.burst(x, y - R(0.05), '#ffe066', 6, 2, 1.6);
        break;
      case 'block':
        fx.burst(x, y, '#ffffff', 10, 3, 1.8), fx.burst(x, y, '#c0c8d0', 6, 2, 2), fx.kick(2), say(e.text!, '#e8eef6', 16);
        break;
      case 'shieldoff':
        fx.burst(x, y, '#c0c8d0', 16, 4, 2.6), fx.ring(x, y, '#ffffff', R(0.06), 3), fx.kick(3), say(e.text!, '#e8eef6', 15);
        break;
      case 'bounce':
        fx.burst(x, y, '#fff3c4', 6, 2.2, 1.8), say(e.text!, '#fff3c4', 12);
        break;
      case 'body':
        fx.burst(x, y, '#fff3c4', 6, 2, 1.8), say(e.text!, '#ffe9b0', 13);
        break;
      case 'grab':
        fx.kick(3), say(e.text!, '#ff8a7a', 15), fx.blink(th.hot, 0.08);
        break;
      case 'escape':
        fx.blink(th.hot, 0.14), fx.kick(4), say(e.text!, '#ffb0a0', 15, Math.min(y, Y(1.1)));
        break;
      case 'recover':
        fx.burst(x, y, '#ffd23f', 20, 4, 2.6), fx.ring(x, y, '#ffd23f', R(0.07), 3), say(e.text!, '#ffd23f', 15);
        break;
      case 'snag':
        fx.burst(x, y, '#5fb05e', 10, 2.6, 2.2), say(e.text!, '#c8f0b0', 14);
        break;
      case 'prick':
        fx.burst(x, y, '#5fb05e', 14, 3.4, 2.2), fx.burst(x, y, '#fff8e0', 8, 3, 1.4), fx.kick(4), say(e.text!, '#d8ffc0', 18 * big);
        s.cheer = s.t;
        break;
      case 'pop':
        fx.burst(x, y + R(0.02), '#8a5432', 16, 3.4, 2.6), say(e.text!, '#ffe0b0', 15);
        break;
      case 'plug':
        fx.burst(x, y, '#c08a52', 22, 4, 2.6), fx.ring(x, y, '#ffe0a0', R(0.08), 4), fx.kick(5), say(e.text!, '#ffe0a0', 17);
        s.cheer = s.t;
        break;
      case 'bosshit':
        fx.burst(x, y, '#ffffff', 18, 4, 2.6), fx.kick(6), fx.blink('#ffffff', 0.12), say(e.text!, '#ffd0d8', 17);
        break;
      case 'bossko':
        fx.burst(x, y, '#ffd23f', 40, 6, 3.4), fx.ring(x, y, '#ffd23f', R(0.2), 7), fx.kick(12), fx.blink('#fff1c0', 0.35), say(e.text!, '#ffd23f', 22, y - R(0.1));
        s.cheer = s.t;
        break;
      case 'combo':
        say(e.text!, '#ffe66a', 14 + Math.min(10, (e.n ?? 2) * 2), by - cu * 4.4);
        break;
      case 'fever':
        fx.ring(bx, by - cu * 2, '#ff9a30', R(0.3), 7), fx.burst(bx, by - cu * 2, '#ffb020', 30, 5, 3), fx.blink('#ffd080', 0.3), fx.kick(5), say('불꽃 채찍 피버!', '#ffb020', 20, by - cu * 4.8);
        s.cheer = s.t;
        break;
      case 'thud':
        fx.burst(x, y + R(0.03), '#d9a274', 5, 1.6, 2.4);
        break;
      case 'poof':
        fx.burst(x, y + R(0.02), '#efe0d0', 10, 1.8, 3);
        break;
      case 'clear':
        fx.burst(w * 0.25, Y(0.6), '#ffd23f', 40, 6, 3.2), fx.burst(w * 0.75, Y(0.6), '#ff8ab0', 40, 6, 3.2), fx.burst(w * 0.5, Y(0.5), '#ffffff', 30, 6, 3);
        fx.ring(bx, by - cu * 2, '#ffd23f', R(0.45), 7), fx.blink('#fff1c0', 0.25);
        break;
      case 'fail':
        fx.kick(7), fx.blink(th.hot, 0.18);
        break;
    }
  }
  fx.memo.t = s.t;
  ctx.restore();
  drawHud(ctx, s, w, h, d, font);
}

/** HUD: 위 띠(판·하트·별) · 아래 띠(금고 자루·연속·별 셋·안내 한 줄) · 판 카드 · 결과 · 스포트라이트 */
function drawHud(ctx: C2, s: WhipState, w: number, h: number, d: StageDef, font: (sz: number, wgt?: number) => void) {
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const SY = (y: number) => (PY0 + y * KY) * w;
  const pill = (x: number, y: number, ww: number, hh: number, fill: string, stroke?: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, hh / 2);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };
  ctx.textBaseline = 'middle';
  // 스포트라이트 (새것, 잠깐 멈춤)
  if (s.spot > 0) {
    const age = SPOT_T - s.spot, a = Math.min(1, age / 8, s.spot / 12), cx = X(s.spotX), cy = SY(s.spotY) - R(0.03), r = R(0.085) * (1 + 0.05 * Math.sin(age * 0.25));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(20,8,24,.66)';
    ctx.beginPath();
    ctx.rect(0, R(0.085), w, Y(HUD_B) - R(0.085));
    ctx.arc(cx, cy, r, 0, TAU, true);
    ctx.fill('evenodd');
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.lineDashOffset = -age;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.036, 900);
    let fs = 0.036;
    while (ctx.measureText(d.spot).width > w - R(0.1) && fs > 0.036) font((fs -= 0.001), 900);
    const tw = Math.min(w - R(0.04), ctx.measureText(d.spot).width + R(0.06)), ly = cy > Y(0.8) ? cy - r - R(0.07) : cy + r + R(0.07), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
    pill(lx - tw / 2, ly - R(0.033), tw, R(0.066), 'rgba(70,30,30,.97)', '#ffd23f');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6e0';
    ctx.fillText(d.spot, lx, ly + 1, tw - R(0.04));
    font(0.032, 900);
    const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
    pill(lx - tw / 2 - R(0.01), ly - R(0.064), nw2, R(0.042), '#ff5a4a');
    ctx.fillStyle = '#ffffff';
    ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.043));
    ctx.restore();
  }
  // ── 위 띠 ──
  const hb = R(0.085);
  const tg = ctx.createLinearGradient(0, 0, 0, hb);
  tg.addColorStop(0, '#4a2a1c');
  tg.addColorStop(1, '#2e1a12');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = '#d9a35a';
  ctx.fillRect(0, hb - 2, w, 2);
  // 판 표시: 별 배지 + "N판 이름"
  ctx.fillStyle = '#ffd23f';
  star5(ctx, R(0.05), hb * 0.5, R(0.026), 0.5);
  ctx.fill();
  ctx.strokeStyle = '#8a5a10';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff3dc';
  font(0.044, 900);
  const st1 = `${s.stage + 1}판`;
  ctx.fillText(st1, R(0.09), hb * 0.52);
  const w1 = ctx.measureText(st1).width;
  ctx.fillStyle = '#e0b48a';
  font(0.036, 800);
  ctx.fillText(`/${STAGE_COUNT} · ${d.name}`, R(0.09) + w1 + 3, hb * 0.54, R(0.36));
  // 별 수 + 하트
  font(0.04, 900);
  const stt = `${s.stars}`, sw = ctx.measureText(stt).width + R(0.07);
  pill(w - R(0.025) - sw, hb * 0.5 - R(0.026), sw, R(0.052), 'rgba(0,0,0,.3)', 'rgba(255,210,63,.6)');
  ctx.fillStyle = '#ffd23f';
  star5(ctx, w - R(0.025) - sw + R(0.03), hb * 0.5, R(0.017), 0.5);
  ctx.fill();
  ctx.textAlign = 'right';
  ctx.fillText(stt, w - R(0.04), hb * 0.53);
  for (let k = 0; k < 3; k++) {
    const hx = w - R(0.05) - sw - R(0.05) * (2 - k) - R(0.02);
    heart(ctx, hx, hb * 0.5, R(0.019));
    ctx.fillStyle = k < s.hearts ? '#ff5a4a' : 'rgba(255,255,255,.12)';
    ctx.fill();
    ctx.strokeStyle = k < s.hearts ? '#ffd0c8' : 'rgba(255,255,255,.35)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // ── 판 카드 (하늘 자리) ──
  if (s.phase === 'play' && s.pt < CARD_T && s.spot <= 0) {
    const a = Math.min(1, s.pt / 8, (CARD_T - s.pt) / 18), sc = Math.min(1, 0.7 + s.pt / 20);
    const lines = [s.again ? `다시! ${s.stage + 1}판 · ${d.name}` : `${s.stage + 1}판 · ${d.name}`, `이번 별: ${starText(d)}`];
    if (s.stage > 0 && !s.again) lines.push(`NEW  ${d.news}`);
    const ch = R(0.05 + lines.length * 0.045), cyy = Y(0.105) + ch / 2;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cyy);
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(46,24,18,.93)';
    ctx.beginPath();
    ctx.roundRect(-R(0.45), -ch / 2, R(0.9), ch, R(0.035));
    ctx.fill();
    ctx.strokeStyle = '#d9a35a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    lines.forEach((ln, i) => {
      const yy = -ch / 2 + R(0.05) + i * R(0.046);
      if (i === 0) (ctx.fillStyle = '#ffe9b8'), font(0.05, 900);
      else if (i === 1) (ctx.fillStyle = '#ffd23f'), font(0.037, 900);
      else (ctx.fillStyle = '#ffb4a0'), font(0.035, 900);
      ctx.fillText(ln, 0, yy, R(0.84));
    });
    ctx.restore();
  }
  // ── 결과 카드 ──
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 8), sc = Math.min(1, 0.6 + age / 14), cyy = Y(0.2);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cyy);
    ctx.scale(sc, sc);
    ctx.fillStyle = s.ok ? 'rgba(46,24,18,.94)' : 'rgba(70,20,24,.94)';
    ctx.beginPath();
    ctx.roundRect(-R(0.42), -R(0.075), R(0.84), R(0.17), R(0.04));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffd23f' : '#ff9a8a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    if (s.ok) {
      ctx.fillStyle = '#ffe9b8';
      font(0.054, 900);
      ctx.fillText(s.won ? '마을을 지켰다!' : '판 깨기!', 0, -R(0.035));
      for (let k = 0; k < 3; k++) {
        const ag = age - (12 + k * 12);
        if (ag < 0) continue;
        const got = s.starOk[k], pop = ag < 8 ? 1.8 - 0.8 * (ag / 8) : 1, sx = (k - 1) * R(0.09);
        ctx.save();
        ctx.translate(sx, R(0.03));
        ctx.scale(pop, pop);
        star5(ctx, 0, 0, R(0.032), 0.48);
        ctx.fillStyle = got ? '#ffd23f' : 'rgba(255,255,255,.12)';
        ctx.fill();
        ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();
        const fx = juice(s);
        if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy + R(0.03), '#ffe066', 16, 3, 2.4);
      }
    } else {
      ctx.fillStyle = '#ffd0c8';
      font(0.05, 900);
      ctx.fillText(s.why, 0, -R(0.03));
      ctx.fillStyle = '#fff3dc';
      font(0.037, 800);
      ctx.fillText(s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 마을 사람들이 고마워해요', 0, R(0.035), R(0.78));
    }
    ctx.restore();
  }
  // ── 아래 띠 ──
  const ty = Y(HUD_B);
  const bg = ctx.createLinearGradient(0, ty, 0, h);
  bg.addColorStop(0, '#4a2a1c');
  bg.addColorStop(1, '#24140e');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(0, ty, w, h - ty + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  ctx.fillStyle = '#d9a35a';
  ctx.fillRect(0, ty, w, 2);
  // 1줄: 금고 자루 · 연속
  const r1 = ty + R(0.042);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff3dc';
  font(0.037, 900);
  ctx.fillText('금고', R(0.03), r1);
  const carried = s.rats.filter((r) => r.bag).reduce((a2, r) => a2 + Math.max(1, r.take), 0);
  for (let k = 0; k < s.bagMax; k++) {
    const sx = R(0.15) + k * R(0.052), kind = k < s.bags ? 0 : k < s.bags + carried ? 1 : 2;
    if (kind === 2) {
      sack(ctx, sx, r1 + R(0.022), R(0.016), true);
      ctx.strokeStyle = 'rgba(255,120,100,.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - R(0.012), r1 - R(0.012));
      ctx.lineTo(sx + R(0.012), r1 + R(0.012));
      ctx.stroke();
    } else {
      ctx.globalAlpha = kind === 1 ? 0.45 + 0.3 * Math.sin(t * 0.4) : 1;
      sack(ctx, sx, r1 + R(0.022), R(0.016));
      ctx.globalAlpha = 1;
    }
  }
  // 연속 · 피버
  {
    const x0 = w - R(0.03);
    ctx.textAlign = 'right';
    if (s.fever > 0) {
      const bw = R(0.25), fr = s.fever / FEVER_T;
      pill(x0 - bw, r1 - R(0.022), bw, R(0.044), 'rgba(0,0,0,.35)', '#ff9a30');
      pill(x0 - bw + 2, r1 - R(0.02), (bw - 4) * fr, R(0.04), '#ff9a30');
      ctx.fillStyle = '#fff3dc';
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.fillText('불꽃 채찍!', x0 - bw / 2, r1 + 1);
    } else {
      for (let k = 0; k < FEVER_N; k++) {
        const on = k < s.combo % FEVER_N, cx = x0 - R(0.012) - (FEVER_N - 1 - k) * R(0.034);
        ctx.fillStyle = on ? '#ffb020' : 'rgba(255,255,255,.15)';
        ctx.beginPath();
        ctx.moveTo(cx, r1 - R(0.016));
        ctx.quadraticCurveTo(cx + R(0.012), r1, cx, r1 + R(0.014));
        ctx.quadraticCurveTo(cx - R(0.012), r1, cx, r1 - R(0.016));
        ctx.fill();
      }
      ctx.fillStyle = '#e0b48a';
      font(0.034, 800);
      ctx.fillText('연속', x0 - R(0.15), r1 + 1);
    }
  }
  // 2줄: 별 셋 (쉬운 말)
  const r2 = ty + R(0.108);
  const d2 = STAGES[s.stage];
  const prog = d2.special === 'barrel' ? s.barrelKos : d2.special === 'multi' ? s.best : d2.special === 'par' ? s.strikes : d2.special === 'cactus' ? s.cactusKos : s.plugs;
  const okNow = s.phase === 'result' && s.ok ? s.starOk : [false, s.bags >= s.bagMax && s.lost === 0, special(s)];
  const bad = [s.phase === 'result' && !s.ok, s.lost > 0, d2.special === 'par' && s.strikes > d2.need];
  const labels = ['다 쫓아내기', '금고 지키기', d2.special === 'par' ? `채찍 ${d2.need}번 안에 (${prog})` : `${starText(d2)} ${Math.min(prog, d2.need)}/${d2.need}`];
  const widths = [0.25, 0.27, 0.4];
  let px = R(0.025);
  for (let k = 0; k < 3; k++) {
    const pw = R(widths[k]);
    pill(px, r2 - R(0.026), pw, R(0.052), okNow[k] ? 'rgba(255,210,63,.24)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.07)', okNow[k] ? '#ffd23f' : bad[k] ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.28)');
    ctx.fillStyle = okNow[k] ? '#ffd23f' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.55)';
    star5(ctx, px + R(0.024), r2, R(0.014), 0.5);
    ctx.fill();
    ctx.textAlign = 'left';
    ctx.fillStyle = okNow[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#f6e6cc';
    font(0.034, 800);
    ctx.fillText(labels[k], px + R(0.045), r2 + 1, pw - R(0.055));
    px += pw + R(0.012);
  }
  // 3줄: 안내 한 줄
  let hint = d2.hint;
  const first = s.stage === 0 && !s.firstDone && s.phase === 'play';
  if (first) hint = '꾹 눌렀다 떼면 철썩! 화약통을 쳐 봐요';
  else if (s.tangle > 0) hint = '너무 오래 돌렸어요 — 잠깐 꽁꽁!';
  else if (s.down && s.phase === 'play') hint = s.hold > WARN_T ? '어지러워요 — 얼른 떼요!' : '떼면 철썩! 빛나는 끝에 닿은 쥐가 날아가요';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 판 끝! 보안관 만세' : `별 ${s.got}개! 다음 판엔 새것이 나와요`) : '끝을 쥐에게 — 오래 모으면 멀리 닿아요';
  else if (s.rats.some((r) => r.bag)) hint = '자루 든 쥐를 쳐서 되찾아요!';
  ctx.textAlign = 'center';
  ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
  font(first ? 0.04 : 0.036, 900);
  ctx.fillText(hint, w / 2, ty + R(0.175), w - R(0.05));
}
