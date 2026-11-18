/**
 * 벌떼 대장 (31라운드: 실시간 액션 — 첫인상·손맛·그림) — 떼 이끌기 × 가리키기(누르는 동안 따라가기) × 콤보 피버.
 * 손이 하는 일은 하나: 누르고 있는 동안 대장벌이 손가락으로 날아가고, 수십~백여 마리 벌떼가 저마다 다른 빠르기로 뒤따라
 *   물결(꼬리)처럼 흐른다. 손을 떼면 대장벌이 그 자리에 멈추고 벌떼가 공처럼 뭉쳐 맴돈다. 한참 안 누르면 벌집으로 돌아가 지킨다.
 *   (톡 한 번 = "저기로!" — 떼 전체가 그리로 쏟아진다. 계속 누르고 있을 필요가 없다.)
 * 규칙(결정적):
 *   - 벌이 적에 닿으면 쏜다: 닿은 벌 수 × 0.01/틱(적마다 한도). 흐를 때(누르는 중)는 스치며 쏘고,
 *     뭉칠 때(뗀 뒤) 공 안에 든 적에게는 벌들이 달라붙어 에워싼다 — 둘레를 많이 덮을수록 최대 2배(포위!).
 *   - 꽃에 닿은 벌은 꿀을 따고 그 자리에서 새 벌 넷이 태어난다(꽃은 한참 뒤 다시 핀다). 떼가 클수록 빨리 쫓아낸다.
 *   - 적이 벌집에 닿으면 꿀을 뺏는다(개미는 하나 들고 도망 — 도중에 쫓아내면 되찾음, 곰·말벌은 앉아서 계속 먹음).
 *     꿀이 다 떨어지면 하트 -1, 그 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 와우: 첫 손짓에 벌떼가 꽃밭을 휩쓸며 24 → 48마리로 불어나고, 그 물결 그대로 아기 곰을 덮쳐 '퐁!' 하늘로 날려 보낸다.
 * 판 구조: 판마다 정해진 적이 몰려온다(가장자리에 '!' 예고). 다 쫓아내면 판 끝.
 *   별(쉬운 말, 판마다 하나씩 늘어남): 1판 "벌집 지키기" → 2판 + "꿀 하나도 안 뺏기기" → 3판부터 + 판마다 다른 한 줄
 *   (한 번에 다섯 마리 쫓아내기 / 벌 80마리 넘게 키우기 / 거미줄 다 찢기 / 대장 곰이 벌집에 못 오게).
 * 펼쳐짐(하는 일이 바뀐다): 1 꽃밭·흐르기 → 2 아기 곰(손을 떼서 뭉쳐 에워싸기) → 3 개미 줄(누른 채 줄을 따라 쭉 긋기)
 *   → 4 방패 말벌(앞에서 쏘면 '팅' — 뒤로 돌아 에워싸기) → 5 거미줄(벌이 붙잡힘 — 크게 뭉쳐 들이받으면 찢어짐)
 *   → 6 바람(떼가 밀림 — 바람 위쪽에 멈추기) → 7 연기(들어간 벌은 어질어질 — 연기를 피해 꽃 따기) → 8 대장 곰(벌 40마리가 감싸야 따끔).
 * 웃음: 쏘인 곰은 >< 눈으로 팔을 버둥, 쫓겨날 땐 빙글빙글 하늘로 '퐁!'. 꿀 먹는 곰은 입가에 꿀 묻히고 행복한 눈.
 *   대장벌은 흐를 땐 결연, 퐁 하면 우쭐, 연기 속에선 어질. 덤불 속 토끼가 퐁마다 폴짝, 꿀을 뺏기면 볼을 감싸 쥔다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
/** 들판(벌과 적이 움직이는 곳): 화면 폭 단위 */
const FX0 = 0.03, FX1 = 0.97, FY0 = 0.285, FY1 = 1.315;
const HV = { x: 0.5, y: 1.19, r: 0.068 };
const HOME = { x: 0.5, y: 1.07 };
const MAXB = 170;
/** 벌: 최고 빠르기(벌마다 0.78~1.22배) · 방향 바꾸는 힘 · 대장벌 빠르기 · 흐를 때 빠르기 배수 · 떼 반지름 */
const VB = 0.0125, ACC = 0.0026, VC = 0.026, FLOWK = 1.25, RB = 0.11, R0 = 0.022;
/** 벌 한 마리가 한 틱에 깎는 체력 · 대장 곰을 따끔하게 하려면 붙어야 하는 벌 수 · 콤보 이음 · '한 번에'의 폭 · 피버 길이 */
const DPS = 0.01, BOSS_MIN = 70, COMBO_T = 70, BURST_T = 40, FEVER_T = 150;
const IDLE_HOME = 140, CARD_T = 130, RESULT_OK = 175, RESULT_FAIL = 160, NEWS_T = 160;
const STAR_PTS = 100, KILL_PTS = 5, HONEY_PTS = 10, WIN_PTS = 300;

export const ANT = 0, BEAR = 1, WASP = 2, BOSS = 3;
/** 종류별: 몸 반지름 · 체력 · 걸음 · 꿀 먹는 간격(틱) · 한 번에 쏠 수 있는 벌 수 */
const KR = [0.017, 0.045, 0.03, 0.088];
const KHP = [0.05, 30, 16, 100];
const KSPD = [0.0021, 0.0012, 0.0026, 0.001];
/** 벌집에서: 꿀 한 입 간격(틱) · 몇 입 먹고 들고 달아나나 */
const KEAT = [0, 45, 35, 30];
const KBITE = [1, 2, 2, 4];
const KCAP = [8, 80, 40, 170];
const WALK = 0, EAT = 1, FLEE = 2, POP = 3, GONE = 4;
const FREE = 0, LATCH = 1, STUCK = 2, DAZE = 3;
const PER_FLOWER = 4, REGROW = 540, WIND_OFF = 25;

type Star3 = { kind: 'combo' | 'grow' | 'rip' | 'boss'; n: number; text: string };
interface StageDef {
  key: string; name: string; news: string; hint: string;
  bees: number; honey: number;
  /** [x, y, 꽃 수, (반지름)] */
  patches: number[][];
  /** [틱, 종류, x, y, 수, 간격, 체력 배수] */
  spawns: number[][];
  /** [x, y, 반지름, 버티는 벌 수] */
  webs?: number[][];
  wind?: number;
  smoke?: number;
  star3?: Star3;
  /** NEW 스포트라이트 자리 [x, y, r] */
  spot?: number[];
}

const S3_COMBO: Star3 = { kind: 'combo', n: 8, text: '한 번에 여덟 마리 쫓아내기' };
const TOP = 0.29;
/** 판 8개. 좌표는 뒤집기 전 — 판마다 시드로 좌우를 뒤집고 살짝 흔든다 */
export const STAGES: StageDef[] = [
  {
    key: '', name: '첫 비행', news: '', hint: '꽃밭을 지나면 벌이 늘어요',
    bees: 24, honey: 14,
    patches: [[0.31, 0.93, 6, 0.05], [0.5, 0.86, 6, 0.05], [0.69, 0.93, 6, 0.05]],
    spawns: [[0, BEAR, 0.5, 0.52, 1, 0, 0.3], [0, BEAR, 0.2, 0.44, 1, 0, 0.3], [0, BEAR, 0.8, 0.44, 1, 0, 0.3], [200, ANT, 0.12, TOP], [330, ANT, 0.88, TOP], [480, ANT, 0.5, TOP, 3, 24], [700, BEAR, 0.28, TOP, 1, 0, 0.5]],
  },
  {
    key: 'bear', name: '아기 곰', news: '🐻 곰 — 곁에서 손을 떼면 뭉쳐서 에워싸요', hint: '곰 곁에서 손을 떼면 뭉쳐서 에워싸요',
    bees: 28, honey: 10,
    patches: [[0.18, 0.62, 6], [0.82, 0.62, 6], [0.5, 0.9, 5]],
    spawns: [[30, BEAR, 0.15, TOP, 1, 0, 0.6], [60, BEAR, 0.97, 0.45, 1, 0, 0.6], [250, ANT, 0.03, 0.8, 2, 30], [380, BEAR, 0.03, 0.45, 1, 0, 0.6], [560, ANT, 0.97, 0.8, 2, 30], [600, BEAR, 0.5, TOP, 1, 0, 0.6]],
    spot: [0.15, 0.34, 0.09],
  },
  {
    key: 'ants', name: '개미 줄', news: '🐜 개미 줄 — 누른 채 줄을 따라 쭉 그어요', hint: '줄이 다 나오면 누른 채 쭉 — 한 번에 휩쓸어요',
    bees: 30, honey: 8,
    patches: [[0.5, 0.62, 6], [0.13, 1.0, 5], [0.87, 1.0, 5]],
    spawns: [[40, ANT, 0.03, 0.45, 8, 26], [120, BEAR, 0.85, TOP], [300, ANT, 0.97, 0.45, 8, 26], [400, BEAR, 0.15, TOP], [560, ANT, 0.5, TOP, 8, 26], [640, BEAR, 0.97, 0.8], [700, ANT, 0.03, 0.8, 5, 26]],
    star3: S3_COMBO, spot: [0.08, 0.45, 0.1],
  },
  {
    key: 'wasp', name: '방패 말벌', news: '🛡️ 방패 말벌 — 앞은 막혀요, 등 뒤로 돌아가요', hint: '말벌은 등 뒤에서 에워싸요',
    bees: 30, honey: 8,
    patches: [[0.12, 0.98, 6], [0.88, 0.98, 6], [0.5, 0.45, 6]],
    spawns: [[40, WASP, 0.5, TOP], [140, BEAR, 0.03, 0.45], [240, WASP, 0.97, 0.45], [320, ANT, 0.03, 0.8, 5, 26], [420, WASP, 0.15, TOP], [470, BEAR, 0.85, TOP], [600, WASP, 0.97, 0.8], [640, WASP, 0.03, 0.45], [700, ANT, 0.5, TOP, 5, 26]],
    star3: { kind: 'grow', n: 90, text: '벌 90마리 넘게 키우기' }, spot: [0.5, 0.36, 0.08],
  },
  {
    key: 'web', name: '거미줄', news: '🕸️ 거미줄 — 크게 뭉쳐 들이받으면 찢어져요', hint: '벌이 적으면 붙잡혀요 — 크게 키워 들이받기',
    bees: 30, honey: 8,
    patches: [[0.15, 0.5, 6], [0.85, 0.5, 6], [0.5, 0.42, 5]],
    webs: [[0.5, 0.66, 0.075, 40], [0.22, 0.86, 0.07, 40], [0.78, 0.86, 0.07, 40]],
    spawns: [[40, BEAR, 0.15, TOP], [120, ANT, 0.03, 0.45, 6, 26], [260, WASP, 0.85, TOP], [340, BEAR, 0.97, 0.45], [460, ANT, 0.5, TOP, 6, 26], [560, WASP, 0.03, 0.45], [620, BEAR, 0.85, TOP], [700, WASP, 0.97, 0.8]],
    star3: { kind: 'rip', n: 3, text: '거미줄 다 찢기' }, spot: [0.5, 0.66, 0.1],
  },
  {
    key: 'wind', name: '바람 언덕', news: '🌬️ 바람 — 벌떼가 밀려요, 바람 위쪽에 멈춰요', hint: '바람이 불면 떼가 밀려요 — 바람 위쪽에서 기다리기',
    bees: 34, honey: 8,
    patches: [[0.25, 0.62, 6], [0.75, 0.62, 6], [0.5, 0.92, 5]],
    wind: 0.0032,
    spawns: [[40, ANT, 0.3, TOP, 8, 26], [160, BEAR, 0.97, 0.45], [300, ANT, 0.72, TOP, 8, 26], [380, WASP, 0.03, 0.45], [480, BEAR, 0.15, TOP], [560, ANT, 0.45, TOP, 8, 26], [650, WASP, 0.97, 0.8], [700, BEAR, 0.03, 0.8]],
    star3: S3_COMBO, spot: [0.5, 0.5, 0.12],
  },
  {
    key: 'smoke', name: '연기 골짜기', news: '💨 연기 — 들어간 벌은 어질어질 흩어져요', hint: '연기를 피해서 꽃을 따요',
    bees: 32, honey: 8,
    patches: [[0.14, 0.6, 6], [0.86, 0.6, 6], [0.5, 0.82, 6]],
    smoke: 200,
    spawns: [[40, BEAR, 0.5, TOP], [140, WASP, 0.97, 0.45], [240, ANT, 0.03, 0.45, 7, 26], [360, BEAR, 0.85, TOP], [440, WASP, 0.03, 0.8], [540, BEAR, 0.15, TOP], [600, ANT, 0.97, 0.45, 6, 26], [700, WASP, 0.5, TOP]],
    star3: { kind: 'grow', n: 120, text: '벌 120마리 넘게 키우기' }, spot: [0.1, 0.75, 0.1],
  },
  {
    key: 'boss', name: '대장 곰', news: '👑 대장 곰 — 벌 70마리가 감싸야 따끔해요', hint: '꽃으로 떼를 키워서 대장 곰을 감싸요',
    bees: 30, honey: 10,
    patches: [[0.12, 0.62, 6], [0.88, 0.62, 6], [0.5, 0.42, 6]],
    spawns: [[40, BOSS, 0.5, TOP], [160, ANT, 0.03, 0.45, 6, 26], [280, WASP, 0.97, 0.45], [400, BEAR, 0.15, TOP], [480, ANT, 0.97, 0.8, 6, 26], [560, WASP, 0.03, 0.45], [640, BEAR, 0.85, TOP]],
    star3: { kind: 'boss', n: 1, text: '대장 곰이 벌집에 못 오게' }, spot: [0.5, 0.36, 0.13],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 상태 ─────────────────────────────
interface Foe {
  k: number; x: number; y: number; r: number; hp: number; max: number; st: number; grp: number; carry: number; bites: number;
  ex: number; ey: number; hx: number; hy: number; eatT: number; hurt: number; t0: number;
  touch: number; lat: number; sec: number; tink: number; tickT: number; popT: number; pvx: number; pvy: number; spin: number;
}
interface Patch { x: number; y: number; r: number; fx: number[]; fy: number[]; cool: number[]; hue: number }
interface Web { x: number; y: number; r: number; str: number; stuck: number; ripped: boolean; ripT: number }
interface Smoke { x: number; y: number; r: number; vx: number; age: number }
interface Spawn { t: number; k: number; x: number; y: number; grp: number; hp: number; n: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number }

export interface BeeState {
  rng: Rng; seed: number; t: number; st: number; stage: number; phase: 'play' | 'result'; pt: number;
  nb: number; bx: Float64Array; by: Float64Array; bvx: Float64Array; bvy: Float64Array; bs: Int8Array; bt: Int16Array; bp: Float64Array;
  nAct: number; nAll: number;
  cx: number; cy: number; lx: number; ly: number; held: boolean; wasDown: boolean; lastIn: number;
  presses: number; stageIn: number; firstTouch: number; firstBig: number; firstDouble: number;
  foes: Foe[]; queue: Spawn[]; qi: number;
  patches: Patch[]; webs: Web[]; smokes: Smoke[]; wind: number; windDir: number; flip: boolean;
  honey: number; honey0: number; stolen: number; hearts: number; stars: number; got: number; starOk: boolean[]; pts: number;
  kills: number; stageKills: number; combo: number; lastKill: number; killT: number[]; burst: number; maxN: number; fever: number;
  bossReached: boolean; freeze: number; slow: number;
  ok: boolean; why: string; dead: boolean; won: boolean; again: boolean; tries: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  jit: { flip: boolean; j: number[] }[];
  mood: number; moodT: number; stolenT: number; cheerT: number;
}

// 벌마다 정해진 성질 (정수 해시 — 어느 엔진에서도 같다)
const ih = (n: number) => {
  let x = Math.imul(n + 0x9e37, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return x / 4294967296;
};
const KAP: number[] = [], TH: number[] = [], RHO: number[] = [], OM: number[] = [], WOB: number[] = [];
for (let i = 0; i < MAXB; i++) {
  KAP.push(0.78 + 0.44 * ih(i * 7 + 1));
  TH.push(i * 2.39996323);
  RHO.push(Math.sqrt((i + 0.5) / MAXB));
  OM.push((0.016 + 0.02 * ih(i * 7 + 3)) * (i & 1 ? 1 : -1));
  WOB.push(ih(i * 7 + 5) * 6.283);
}

const ev = (s: BeeState, kind: string, x: number, y: number, text?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, n });
function see(s: BeeState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const alive = (e: Foe) => e.st === WALK || e.st === EAT || e.st === FLEE;
const swarmR = (n: number) => R0 + RB * Math.sqrt(Math.min(MAXB, Math.max(1, n)) / MAXB);
const pop8 = (m: number) => {
  let c = 0;
  for (; m; m &= m - 1) c++;
  return c;
};

function newStage(s: BeeState) {
  const d = STAGES[s.stage], jt = s.jit[s.stage];
  const fx = (x: number) => (jt.flip ? 1 - x : x);
  let ji = 0;
  const J = (a: number) => (jt.j[ji++ % jt.j.length] - 0.5) * 2 * a;
  s.flip = jt.flip;
  s.nb = d.bees;
  for (let i = 0; i < MAXB; i++) {
    const a = TH[i], rr = R0 + RB * RHO[i];
    s.bx[i] = HOME.x + Math.cos(a) * rr;
    s.by[i] = HOME.y + Math.sin(a) * rr * 0.85;
    s.bvx[i] = s.bvy[i] = 0;
    s.bs[i] = FREE;
    s.bt[i] = -1;
    s.bp[i] = 0;
  }
  s.cx = s.lx = HOME.x;
  s.cy = s.ly = HOME.y;
  s.held = false;
  s.lastIn = s.t;
  s.patches = d.patches.map(([x, y, n, pr], k) => {
    const px = fx(x) + (pr ? 0 : J(0.02)), py = y + (pr ? 0 : J(0.015)), r = pr ?? 0.05 + n * 0.004;
    const P: Patch = { x: px, y: py, r, fx: [], fy: [], cool: [], hue: k };
    for (let q = 0; q < n; q++) {
      const a = q * 2.39996 + k, rr = r * Math.sqrt((q + 0.5) / n);
      P.fx.push(px + Math.cos(a) * rr);
      P.fy.push(py + Math.sin(a) * rr * 0.8);
      P.cool.push(0);
    }
    return P;
  });
  s.webs = (d.webs ?? []).map(([x, y, r, str]) => ({ x: fx(x), y, r, str, stuck: 0, ripped: false, ripT: -99 }));
  s.smokes = [];
  s.wind = 0;
  s.windDir = jt.flip ? -1 : 1;
  const q: Spawn[] = [];
  let grp = 0;
  for (const [t, k, x, y, n = 1, gap = 0, hm = 1] of d.spawns) {
    const tt = Math.max(0, Math.round(t + (t ? J(12) : 0))), xx = clamp(fx(x) + (y < 0.3 ? J(0.05) : 0), FX0, FX1), yy = y < 0.3 ? TOP : clamp(y + J(0.04), FY0, FY1);
    const g = n > 1 ? ++grp : 0;
    for (let c = 0; c < n; c++) q.push({ t: tt + c * gap, k, x: xx, y: yy, grp: g, hp: hm, n });
  }
  q.sort((a, b) => a.t - b.t);
  s.queue = q;
  s.qi = 0;
  s.foes = [];
  s.honey = s.honey0 = d.honey;
  s.stolen = 0;
  s.stageKills = 0;
  s.combo = 0;
  s.lastKill = -999;
  s.killT = [];
  s.burst = 0;
  s.maxN = d.bees;
  s.fever = 0;
  s.bossReached = false;
  s.st = 0;
  s.pt = 0;
  s.phase = 'play';
  s.starOk = [false, false, false];
  s.stageIn = 0;
  s.freeze = s.slow = 0;
  if (d.key) s.seen.add(d.key);
}

function steal(s: BeeState, e: Foe) {
  s.honey--;
  s.stolen++;
  e.carry++;
  e.bites--;
  s.stolenT = s.t;
  ev(s, 'steal', HV.x + (e.x - HV.x) * 0.5, HV.y - 0.03, e.k === ANT ? '꿀 하나 슬쩍!' : e.k === BOSS ? '꿀꺽!' : '냠냠!');
  if (s.honey <= 0) endStage(s, false, '꿀을 다 뺏겼어요…');
}

function repel(s: BeeState, e: Foe) {
  e.st = POP;
  e.popT = s.st;
  const dx = e.x - s.cx, dy = e.y - s.cy, d = Math.hypot(dx, dy) || 1;
  const side = Math.abs(dx / d) > 0.2 ? Math.sign(dx) : e.x < 0.5 ? -1 : 1;
  e.pvx = side * (e.k === ANT ? 0.012 : 0.011);
  e.pvy = -0.02 - (e.k === BOSS ? 0.004 : 0);
  e.spin = side;
  if (e.carry) {
    s.honey = Math.min(s.honey0, s.honey + e.carry);
    ev(s, 'back', e.x, e.y, e.carry > 1 ? `꿀 ${e.carry}개 되찾음!` : '꿀 되찾음!', e.carry);
    see(s, 'back', '🍯 꿀을 들고 달아나는 녀석을 쫓아내면 꿀이 돌아와요');
  }
  e.carry = 0;
  s.kills++;
  s.stageKills++;
  s.combo = s.st - s.lastKill < COMBO_T ? s.combo + 1 : 1;
  s.lastKill = s.st;
  s.killT.push(s.st);
  while (s.killT.length && s.st - s.killT[0] > BURST_T) s.killT.shift();
  s.burst = Math.max(s.burst, s.killT.length);
  if (s.firstBig < 0 && s.firstTouch >= 0) s.firstBig = s.t;
  s.mood = 2;
  s.moodT = 50;
  s.cheerT = s.t;
  // 붙어 있던 벌은 '퐁'과 함께 흩어진다
  for (let i = 0; i < s.nb; i++)
    if (s.bs[i] === LATCH && s.foes[s.bt[i]] === e) {
      s.bs[i] = FREE;
      const a = s.bp[i];
      s.bvx[i] = Math.cos(a) * 0.012;
      s.bvy[i] = Math.sin(a) * 0.012;
    }
  ev(s, 'repel', e.x, e.y, e.k === BOSS ? '대장 곰 퐁!!' : e.k === BEAR ? '퐁!' : e.k === WASP ? '팡!' : '톡!', e.k);
  see(s, 'repel', '💥 벌이 많이 붙을수록 빨리 쫓겨나요');
  if (s.combo >= 3) ev(s, 'combo', e.x, e.y - 0.05, `${s.combo}연속!`, s.combo);
  if (s.combo === 5 || (s.combo > 5 && s.combo % 5 === 0)) {
    s.fever = FEVER_T;
    ev(s, 'fever', s.cx, s.cy, '피버! 벌침 1.5배', s.combo);
    see(s, 'fever', '🔥 다섯 연속이면 피버 — 벌침이 1.5배');
  }
  s.freeze = Math.max(s.freeze, e.k === BOSS ? 6 : e.k === BEAR ? 3 : e.k === WASP ? 2 : s.combo >= 5 && s.combo % 5 === 0 ? 2 : 0);
  if (e.k === BOSS) s.slow = 70;
}

function endStage(s: BeeState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage];
  if (ok) {
    const c3 = d.star3;
    let s3 = false;
    if (c3?.kind === 'combo') s3 = s.burst >= c3.n;
    else if (c3?.kind === 'grow') s3 = s.maxN >= c3.n;
    else if (c3?.kind === 'rip') s3 = s.webs.every((w) => w.ripped);
    else if (c3?.kind === 'boss') s3 = !s.bossReached;
    s.starOk = [true, s.stage >= 1 && s.stolen === 0, s.stage >= 2 && s3];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.honey * HONEY_PTS + s.stageKills * KILL_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, s.won ? '숲이 평화로워졌어요!' : '벌집을 지켰어요!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', HV.x, HV.y, why);
  }
}

// ───────────────────────────── 한 틱 ─────────────────────────────
function spawnTick(s: BeeState) {
  while (s.qi < s.queue.length && s.queue[s.qi].t <= s.st) {
    const q = s.queue[s.qi++];
    const dx = HV.x - q.x, dy = HV.y - q.y, d = Math.hypot(dx, dy) || 1;
    s.foes.push({
      k: q.k, x: q.x, y: q.y, r: KR[q.k], hp: KHP[q.k] * q.hp, max: KHP[q.k] * q.hp, st: WALK, grp: q.grp, carry: 0, bites: KBITE[q.k],
      ex: q.x, ey: q.y, hx: dx / d, hy: dy / d, eatT: 0, hurt: -99, t0: s.st, touch: 0, lat: 0, sec: 0, tink: -99, tickT: -99, popT: 0, pvx: 0, pvy: 0, spin: 0,
    });
    if (q.k === WASP) see(s, 'wasp1', '🛡️ 말벌 방패에 닿은 벌은 튕겨 나요');
  }
}

function hazardTick(s: BeeState) {
  const d = STAGES[s.stage];
  if (d.wind) {
    const P = 330, ph = s.st % P, cyc = Math.floor(s.st / P);
    const dir = s.windDir * (cyc % 2 ? -1 : 1);
    const on = ph < 110 ? 0 : ph < 140 ? (ph - 110) / 30 : ph < 280 ? 1 : ph < 310 ? (310 - ph) / 30 : 0;
    s.wind = dir * d.wind * on;
    if (ph === 110) ev(s, 'gust', dir > 0 ? 0.15 : 0.85, 0.5, dir > 0 ? '바람 →' : '← 바람');
  }
  if (d.smoke) {
    if (s.st % d.smoke === 30) {
      const left = s.rng() < 0.5, y = 0.5 + s.rng() * 0.5;
      s.smokes.push({ x: left ? -0.1 : 1.1, y, r: 0.085, vx: (left ? 1 : -1) * (0.0014 + s.rng() * 0.0006), age: 0 });
      see(s, 'smoke1', '💨 연기 구름은 천천히 흘러가요');
    }
    for (const m of s.smokes) (m.x += m.vx), m.age++;
    s.smokes = s.smokes.filter((m) => m.x > -0.2 && m.x < 1.2);
  }
  for (const p of s.patches) for (let k = 0; k < p.cool.length; k++) if (p.cool[k] > 0) p.cool[k]--;
}

function captainTick(s: BeeState) {
  let fighting = false;
  for (let i = 0; i < s.nb; i++) if (s.bs[i] === LATCH) (fighting = true), (i = s.nb);
  if (!s.held && s.t - s.lastIn > IDLE_HOME && !fighting) {
    const dx = HOME.x - s.lx, dy = HOME.y - s.ly, d = Math.hypot(dx, dy);
    if (d > 0.004) (s.lx += (dx / d) * 0.005), (s.ly += (dy / d) * 0.005);
  }
  const dx = s.lx - s.cx, dy = s.ly - s.cy, d = Math.hypot(dx, dy);
  if (d > 1e-6) {
    const st = Math.min(VC, d * 0.35);
    s.cx += (dx / d) * st;
    s.cy += (dy / d) * st;
  }
}

/** 이번 틱에 벌떼 둘레에 있는 것만 골라 본다 (벌 하나하나가 모든 적을 보지 않게) */
const near = (x0: number, y0: number, x1: number, y1: number, x: number, y: number, r: number) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
const CF: number[] = [], CP: number[] = [], CW: number[] = [], CS: number[] = [];

function beesTick(s: BeeState) {
  const flow = s.held, t = s.st;
  let x0 = 9, x1 = -9, y0 = 9, y1 = -9, nAct = 0, nAll = 0;
  for (let i = 0; i < s.nb; i++) {
    const st = s.bs[i];
    if (st === STUCK) continue;
    nAll++;
    if (st !== DAZE) nAct++;
    const x = s.bx[i], y = s.by[i];
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  s.nAct = nAct;
  s.nAll = nAll;
  if (nAll > s.maxN) s.maxN = nAll;
  CF.length = CP.length = CW.length = CS.length = 0;
  s.foes.forEach((e, k) => alive(e) && near(x0, y0, x1, y1, e.x, e.y, e.r + 0.03) && CF.push(k));
  s.patches.forEach((p, k) => near(x0, y0, x1, y1, p.x, p.y, p.r + 0.03) && CP.push(k));
  s.webs.forEach((w, k) => !w.ripped && near(x0, y0, x1, y1, w.x, w.y, w.r + 0.02) && CW.push(k));
  s.smokes.forEach((m, k) => near(x0, y0, x1, y1, m.x, m.y, m.r + 0.02) && CS.push(k));
  const ballR = swarmR(nAct), scale = flow ? 0.7 : 1, vk = flow ? FLOWK : 1;
  /** 바람: 뭉친 떼는 바람 아래쪽으로 밀려나 자리 잡고(최대 0.08), 날고 있는 벌도 살짝 떠밀린다 */
  const wind = s.wind * 0.45, wox = s.wind * WIND_OFF;
  for (let i = 0; i < s.nb; i++) {
    let st = s.bs[i];
    if (st === STUCK) continue;
    let x = s.bx[i], y = s.by[i], tx: number, ty: number, vmax = VB * KAP[i] * vk;
    if (st === DAZE) {
      if (--s.bp[i] <= 0) (s.bs[i] = st = FREE), (s.bt[i] = -1);
    }
    if (st === DAZE) {
      tx = x + Math.sin(t * 0.09 + WOB[i]) * 0.04;
      ty = y + Math.cos(t * 0.07 + WOB[i] * 1.3) * 0.04;
      vmax = 0.004;
    } else if (st === LATCH) {
      const e = s.foes[s.bt[i]];
      const lx = e.x - s.cx, ly = e.y - s.cy;
      if (!alive(e) || lx * lx + ly * ly > (ballR + e.r + 0.08) ** 2) {
        s.bs[i] = st = FREE;
        s.bt[i] = -1;
        const a = TH[i] + OM[i] * t;
        tx = s.cx + Math.cos(a) * (R0 + RB * RHO[i]) * scale;
        ty = s.cy + Math.sin(a) * (R0 + RB * RHO[i]) * scale * 0.85;
      } else {
        s.bp[i] += 0.014 * (i & 1 ? 1 : -1);
        const rr = e.r + 0.006 + 0.004 * Math.sin(t * 0.3 + WOB[i]);
        tx = e.x + Math.cos(s.bp[i]) * rr;
        ty = e.y + Math.sin(s.bp[i]) * rr * 0.85;
        vmax = 0.03;
      }
    } else {
      const a = TH[i] + (flow ? 0 : OM[i] * t), rr = (R0 + RB * RHO[i]) * scale;
      tx = s.cx + wox + Math.cos(a) * rr + Math.sin(t * 0.21 + WOB[i]) * 0.006;
      ty = s.cy + Math.sin(a) * rr * 0.85 + Math.cos(t * 0.17 + WOB[i] * 1.7) * 0.006;
    }
    // 끌림: 목표 쪽으로 (멀수록 빠르게, 최고 빠르기 한도) — 방향 바꾸는 힘에 한도가 있어 물결처럼 휜다
    const dx = tx - x, dy = ty - y, dd = Math.hypot(dx, dy) || 1e-9;
    const sp = Math.min(vmax, dd * 0.22);
    let ax = (dx / dd) * sp - s.bvx[i], ay = (dy / dd) * sp - s.bvy[i];
    const al = Math.hypot(ax, ay), lim = st === LATCH ? ACC * 3 : ACC;
    if (al > lim) (ax *= lim / al), (ay *= lim / al);
    s.bvx[i] += ax + (st === LATCH ? 0 : wind);
    s.bvy[i] += ay;
    x += s.bvx[i];
    y += s.bvy[i];
    if (x < 0.005) (x = 0.005), (s.bvx[i] = Math.abs(s.bvx[i]) * 0.3);
    if (x > 0.995) (x = 0.995), (s.bvx[i] = -Math.abs(s.bvx[i]) * 0.3);
    if (y < FY0 - 0.03) (y = FY0 - 0.03), (s.bvy[i] = Math.abs(s.bvy[i]) * 0.3);
    if (y > FY1 + 0.02) (y = FY1 + 0.02), (s.bvy[i] = -Math.abs(s.bvy[i]) * 0.3);
    s.bx[i] = x;
    s.by[i] = y;
    if (st === DAZE) continue;
    // 적에게 닿기
    for (const k of CF) {
      const e = s.foes[k];
      const ex = x - e.x, ey = y - e.y, rr = e.r + 0.011;
      if (ex > rr || ex < -rr || ey > rr || ey < -rr) continue;
      const d2 = ex * ex + ey * ey;
      if (d2 > rr * rr) continue;
      if (e.k === WASP && ex * e.hx + ey * e.hy > 0) {
        // 방패: 앞에서 닿으면 튕겨 난다
        const d = Math.sqrt(d2) || 1e-6;
        s.bvx[i] = (ex / d) * 0.009;
        s.bvy[i] = (ey / d) * 0.009;
        if (st === LATCH) (s.bs[i] = st = FREE), (s.bt[i] = -1);
        if (t - e.tink > 14) (e.tink = t), ev(s, 'tink', e.x + e.hx * e.r, e.y + e.hy * e.r, '팅!');
        break;
      }
      e.touch++;
      if (st === FREE && !flow) {
        const cx = e.x - s.cx, cy = e.y - s.cy;
        if (cx * cx + cy * cy < (ballR + e.r + 0.03) ** 2) {
          s.bs[i] = st = LATCH;
          s.bt[i] = k;
          s.bp[i] = Math.atan2(ey / 0.85, ex);
        }
      }
      if (st === LATCH && s.bt[i] === k) {
        e.lat++;
        let a = s.bp[i];
        if (e.k === WASP) a -= Math.atan2(e.hy, e.hx);
        a = ((a % 6.2832) + 6.2832) % 6.2832;
        e.sec |= 1 << Math.min(7, Math.floor(a / 0.7854));
      }
      break;
    }
    // 꽃 따기 → 새 벌
    for (const k of CP) {
      const p = s.patches[k];
      if (Math.abs(x - p.x) > p.r + 0.025 || Math.abs(y - p.y) > p.r + 0.025) continue;
      for (let q = 0; q < p.fx.length; q++) {
        if (p.cool[q] > 0) continue;
        const fx = x - p.fx[q], fy = y - p.fy[q];
        if (fx * fx + fy * fy > 0.027 * 0.027) continue;
        p.cool[q] = REGROW;
        let born = 0;
        for (let b = 0; b < PER_FLOWER && s.nb < MAXB; b++, born++) {
          const j = s.nb++, a = s.rng() * 6.283;
          s.bx[j] = p.fx[q];
          s.by[j] = p.fy[q];
          s.bvx[j] = Math.cos(a) * 0.006;
          s.bvy[j] = Math.sin(a) * 0.006 - 0.003;
          s.bs[j] = FREE;
          s.bt[j] = -1;
        }
        ev(s, 'flower', p.fx[q], p.fy[q], born ? `+${born}` : '', p.hue);
        see(s, 'flower', '🌼 꽃에 닿으면 새 벌이 넷씩 태어나요');
        if (s.firstDouble < 0 && s.firstTouch >= 0 && s.nb >= STAGES[s.stage].bees * 2) s.firstDouble = s.t;
      }
    }
    // 거미줄: 붙잡힘 (버티는 수를 넘게 붙으면 찢어져 모두 풀려남)
    for (const k of CW) {
      const w = s.webs[k];
      if (w.ripped) continue;
      const wx = x - w.x, wy = y - w.y;
      if (wx * wx + wy * wy > w.r * w.r) continue;
      s.bs[i] = STUCK;
      s.bt[i] = k;
      s.bvx[i] = s.bvy[i] = 0;
      w.stuck++;
      if (w.stuck === 1) ev(s, 'stuck', x, y, '찐득!');
      if (w.stuck >= w.str) {
        w.ripped = true;
        w.ripT = s.st;
        for (let j = 0; j < s.nb; j++)
          if (s.bs[j] === STUCK && s.bt[j] === k) {
            s.bs[j] = FREE;
            s.bt[j] = -1;
            const a = Math.atan2(s.by[j] - w.y, s.bx[j] - w.x);
            s.bvx[j] = Math.cos(a) * 0.01;
            s.bvy[j] = Math.sin(a) * 0.01;
          }
        ev(s, 'rip', w.x, w.y, '찌이익! 찢었다!');
        see(s, 'rip', '🕸️ 크게 들이받으면 거미줄이 찢어지고 붙잡힌 벌도 풀려나요');
        s.freeze = Math.max(s.freeze, 3);
        s.cheerT = s.t;
      }
      break;
    }
    if (s.bs[i] === STUCK) continue;
    // 연기: 어질어질
    for (const k of CS) {
      const m = s.smokes[k], mx = x - m.x, my = y - m.y;
      if (mx * mx + my * my > m.r * m.r) continue;
      if (s.bs[i] === LATCH) s.bt[i] = -1;
      s.bs[i] = DAZE;
      s.bp[i] = 100;
      if (t % 12 === 0) ev(s, 'daze', x, y, '어질~');
      break;
    }
  }
}

function foesTick(s: BeeState) {
  const fev = s.fever > 0 ? 1.5 : 1;
  for (const e of s.foes) {
    if (e.st === GONE) continue;
    if (e.st === POP) {
      e.x += e.pvx;
      e.y += e.pvy;
      e.pvy += 0.0009;
      if (s.st - e.popT > 80) e.st = GONE;
      continue;
    }
    if (e.touch > 0) {
      const n = Math.min(e.touch, KCAP[e.k]);
      const cov = e.k === WASP ? Math.min(1, pop8(e.sec & 0b01111000) / 4 + pop8(e.sec & 0b10000111) / 8) : pop8(e.sec) / 8;
      let dmg = n * DPS * (1 + cov) * fev;
      if (e.k === BOSS && e.lat < BOSS_MIN) {
        dmg = 0;
        if (s.st - e.tickT > 45) (e.tickT = s.st), ev(s, 'tickle', e.x, e.y - e.r, `간지러워~ (${e.lat}/${BOSS_MIN})`);
      }
      if (dmg > 0) {
        if (s.st - e.hurt > 30) ev(s, 'sting', e.x, e.y, '');
        if (cov >= 0.99 && e.k !== ANT && s.st - e.tickT > 40) (e.tickT = s.st), ev(s, 'surround', e.x, e.y - e.r, '포위! ×2'), see(s, 'surround', '🌀 빙 둘러 에워싸면 벌침이 2배');
        e.hp -= dmg;
        e.hurt = s.st;
      }
      e.touch = e.lat = e.sec = 0;
      if (e.hp <= 0) {
        repel(s, e);
        continue;
      }
    }
    e.touch = e.lat = e.sec = 0;
    if (e.st === WALK) {
      const dx = HV.x - e.x, dy = HV.y - e.y, d = Math.hypot(dx, dy) || 1;
      const hurt = s.st - e.hurt < 20 && e.k !== ANT;
      const sp = KSPD[e.k] * (hurt ? 0.5 : 1);
      e.hx = dx / d;
      e.hy = dy / d;
      const wig = e.k === ANT ? Math.sin((s.st + e.t0 * 3) * 0.25) * 0.4 : e.k === WASP ? Math.sin((s.st + e.t0) * 0.08) * 0.6 : 0;
      e.x += (e.hx - e.hy * wig) * sp;
      e.y += (e.hy + e.hx * wig) * sp;
      if (d < HV.r + e.r * 0.4) {
        e.st = EAT;
        e.eatT = s.st;
        if (e.k === BOSS) s.bossReached = true;
        if (e.k === ANT) {
          steal(s, e);
          e.st = FLEE;
          if (s.phase !== 'play') return;
        } else ev(s, 'arrive', e.x, e.y, e.k === BOSS ? '꿀단지다!' : '꿀 냄새~');
      }
    } else if (e.st === EAT) {
      if (s.st - e.eatT >= KEAT[e.k]) {
        e.eatT = s.st;
        steal(s, e);
        if (s.phase !== 'play') return;
        if (e.bites <= 0) e.st = FLEE;
      }
    } else if (e.st === FLEE) {
      const dx = e.ex - e.x, dy = e.ey - e.y, d = Math.hypot(dx, dy) || 1;
      e.hx = dx / d;
      e.hy = dy / d;
      e.x += e.hx * KSPD[e.k] * 1.1;
      e.y += e.hy * KSPD[e.k] * 1.1;
      if (d < 0.02) e.st = GONE;
    }
  }
}

export const beeswarm: GameDef<BeeState> = {
  id: 'beeswarm',
  name: '벌떼 대장',
  genes: ['swarm', 'pointer', 'combo'],
  twist: '손가락 하나로 수백 마리 벌떼를 붓처럼 휘두른다 — 누르는 동안엔 물결처럼 흐르며 스치듯 쏘고, 떼면 공처럼 뭉쳐 적을 에워싸 2배로 쏜다. 꽃을 스치면 떼가 불어나 더 빨리 쫓아낸다',
  rules: [
    '누르는 동안 벌떼가 손가락을 따라 흘러요. 손을 떼면 그 자리에 공처럼 뭉쳐 닿은 적을 에워싸요.',
    '꽃을 지나면 벌이 늘어나요. 벌이 많이 붙을수록 적이 빨리 쫓겨나요.',
    '꿀을 노리는 동물을 쫓아내 벌집을 지켜요. 꿀이 다 떨어지면 하트 -1.',
  ],
  controls: 'touch',
  hint: '누르는 동안 벌떼가 따라와요 · 떼면 뭉쳐요 / 화살표로 옮기고 스페이스',
  aspect: A,
  art: {
    concept: '초여름 꽃 들판 디오라마 — 벌집을 지키는 꼬마 벌떼',
    mood: '늦은 오후 햇살이 숲 가장자리에서 비스듬히 쏟아지는 들판. 그루터기 위 짚 벌집에서 꿀이 반짝이고, 꽃밭 사이로 황금빛 벌떼가 물결처럼 흐른다. 숲에서 꿀 냄새를 맡은 아기 곰·개미·방패 든 말벌이 슬금슬금 나오고, 덤불 속 토끼가 구경한다.',
    palette: { bg: '#20381f', ink: '#fff8e1', muted: '#b9d49a', accent: '#ffc83d', hot: '#ff6b4a', soft: '#e9f5c9' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const jit = STAGES.map(() => ({ flip: rng() < 0.5, j: Array.from({ length: 24 }, () => rng()) }));
    const s: BeeState = {
      rng, seed, t: 0, st: 0, stage: 0, phase: 'play', pt: 0,
      nb: 0, bx: new Float64Array(MAXB), by: new Float64Array(MAXB), bvx: new Float64Array(MAXB), bvy: new Float64Array(MAXB), bs: new Int8Array(MAXB), bt: new Int16Array(MAXB), bp: new Float64Array(MAXB),
      nAct: 0, nAll: 0, cx: HOME.x, cy: HOME.y, lx: HOME.x, ly: HOME.y, held: false, wasDown: false, lastIn: 0,
      presses: 0, stageIn: 0, firstTouch: -1, firstBig: -1, firstDouble: -1,
      foes: [], queue: [], qi: 0, patches: [], webs: [], smokes: [], wind: 0, windDir: 1, flip: false,
      honey: 0, honey0: 0, stolen: 0, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0,
      kills: 0, stageKills: 0, combo: 0, lastKill: -999, killT: [], burst: 0, maxN: 0, fever: 0, bossReached: false, freeze: 0, slow: 0,
      ok: false, why: '', dead: false, won: false, again: false, tries: 0,
      seen: new Set<string>(), newsQ: [], news: null, events: [], jit, mood: 0, moodT: 0, stolenT: -999, cheerT: -999,
    };
    newStage(s);
    s.nAct = s.nAll = s.nb;
    return s;
  },
  step(s, inp: Input) {
    if (s.dead) return;
    s.t++;
    const p = inp.pointer ?? null;
    if (p) {
      if (!s.wasDown && s.phase === 'play') {
        s.presses++;
        s.stageIn++;
        if (s.firstTouch < 0) s.firstTouch = s.t;
      }
      s.lx = clamp(p.x, FX0, FX1);
      s.ly = clamp(p.y * A, FY0, FY1);
      s.held = true;
      s.lastIn = s.t;
    } else s.held = false;
    s.wasDown = !!p;
    if (s.events.length && s.t - s.events[0].t > 110) s.events = s.events.filter((e) => s.t - e.t < 110);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
    if (s.phase === 'result') {
      s.pt++;
      captainTick(s);
      beesTick(s);
      for (const e of s.foes) if (e.st === POP) (e.x += e.pvx), (e.y += e.pvy), (e.pvy += 0.0009);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.freeze > 0) return void s.freeze--;
    if (s.slow > 0 && --s.slow % 2) return;
    s.st++;
    s.pt++;
    if (s.fever > 0) s.fever--;
    spawnTick(s);
    hazardTick(s);
    captainTick(s);
    beesTick(s);
    foesTick(s);
    if (s.phase !== 'play') return;
    if (s.held && s.mood === 0) s.mood = 1;
    else if (!s.held && s.mood === 1) s.mood = 0;
    if (s.qi >= s.queue.length && !s.foes.some(alive)) endStage(s, true, '');
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x: clamp(x, FX0, FX1), y: clamp(y, FY0, FY1) / A } });

/** 활동 중인 벌들의 가운데와 수 */
function swarm(s: BeeState) {
  let x = 0, y = 0, n = 0;
  for (let i = 0; i < s.nb; i++)
    if (s.bs[i] === FREE || s.bs[i] === LATCH) (x += s.bx[i]), (y += s.by[i]), n++;
  return n ? { x: x / n, y: y / n, n } : { x: s.cx, y: s.cy, n: 0 };
}
const tth = (e: Foe) => (e.st === WALK ? Math.max(0, Math.hypot(HV.x - e.x, HV.y - e.y) - HV.r - e.r * 0.4) / KSPD[e.k] : 0);
const posAt = (e: Foe, tau: number) => {
  if (e.st !== WALK) return { x: e.x, y: e.y };
  const m = Math.min(tau * KSPD[e.k], Math.max(0, Math.hypot(HV.x - e.x, HV.y - e.y) - HV.r));
  return { x: e.x + e.hx * m, y: e.y + e.hy * m };
};
const BEE_V = VB * 0.92;
/** 벌 n마리로 이 적을 쫓아내는 데 걸리는 틱 (뭉쳐 에워싼다고 보고) */
function killTime(e: Foe, n: number) {
  const on = e.k === WASP ? Math.min(n * 0.45, KCAP[e.k]) : Math.min(n * 0.85, KCAP[e.k]);
  if (e.k === BOSS && n * 0.85 < BOSS_MIN) return 1e5;
  return 14 + e.hp / Math.max(0.02, on * DPS * 1.75);
}
/** 이 적을 T틱 뒤에 쫓아내면 잃는 꿀 */
function lossAt(s: BeeState, e: Foe, T: number) {
  const sp = KSPD[e.k] * 1.1, back = Math.hypot(e.ex - HV.x, e.ey - HV.y) / sp;
  if (e.st === FLEE) return T > Math.hypot(e.ex - e.x, e.ey - e.y) / sp ? e.carry : 0.3 * e.carry;
  const eatLeft = e.st === EAT ? e.bites * KEAT[e.k] - (s.st - e.eatT) : e.k === ANT ? 0 : KBITE[e.k] * KEAT[e.k];
  const a = e.st === EAT ? 0 : tth(e);
  if (T > a + eatLeft + back) return KBITE[e.k];
  if (T <= a) return 0;
  // 벌집에 닿은 뒤 쫓아내면 꿀은 돌아오지만, 그동안 꿀이 줄어 위험하다
  return 0.3 * Math.min(KBITE[e.k], e.carry + (e.k === ANT ? 1 : Math.floor((T - a) / KEAT[e.k])));
}

interface Task { kind: 'foe' | 'col' | 'flower' | 'web'; idx: number }
interface Brain { key: string; task: Task | null; until: number; sweep: number; sx: number; sy: number; started: number; wp: { x: number; y: number } | null }
const brain = new WeakMap<object, Brain>();

function colAnts(s: BeeState, g: number) {
  return s.foes.filter((e) => e.grp === g && e.st === WALK).sort((a, b) => tth(a) - tth(b));
}
function bloomed(p: Patch) {
  let c = 0;
  for (const v of p.cool) if (v <= 0) c++;
  return c;
}

/** 할 일 후보를 몇 가지 순서로 이어 보고(이동·쫓아내는 시간·꽃으로 늘어나는 벌까지 셈), 잃는 꿀이 가장 적고 빠른 순서의 첫 일을 고른다 */
function choose(s: BeeState): Task | null {
  const sw = swarm(s), d = STAGES[s.stage];
  const foeT: Task[] = [], extra: Task[] = [];
  const groups = new Set<number>();
  s.foes.forEach((e, k) => {
    if (!alive(e)) return;
    if (e.k === ANT && e.grp && e.st === WALK) {
      if (groups.has(e.grp)) return;
      const ants = colAnts(s, e.grp);
      const pending = s.queue.slice(s.qi).some((q) => q.grp === e.grp);
      if (ants.length >= 3 && !pending) return void (groups.add(e.grp), foeT.push({ kind: 'col', idx: e.grp }));
      if (pending && d.star3?.kind === 'combo') return void groups.add(e.grp);
    }
    foeT.push({ kind: 'foe', idx: k });
  });
  const goal = d.star3?.kind === 'grow' ? d.star3.n : d.star3?.kind === 'boss' ? 75 : d.star3?.kind === 'rip' ? 44 : 60;
  s.patches.forEach((p, k) => {
    const b = bloomed(p);
    if (b >= 3 && sw.n < MAXB - 10 && s.nAll < goal + 30) extra.push({ kind: 'flower', idx: k });
  });
  if (d.star3?.kind === 'rip') s.webs.forEach((w, k) => !w.ripped && sw.n >= w.str + 12 && extra.push({ kind: 'web', idx: k }));
  if (!foeT.length && !extra.length) return null;
  const urg = (t: Task) => (t.kind === 'col' ? Math.min(...colAnts(s, t.idx).map(tth)) : tth(s.foes[t.idx]));
  foeT.sort((a, b) => urg(a) - urg(b));
  const top = foeT.slice(0, 4), rest = foeT.slice(4);
  const perms: Task[][] = [];
  const permute = (arr: Task[], cur: Task[]) => {
    if (!arr.length) return void perms.push(cur);
    arr.forEach((x, k) => permute([...arr.slice(0, k), ...arr.slice(k + 1)], [...cur, x]));
  };
  permute(top, []);
  const orders: Task[][] = [];
  for (const p of perms) {
    orders.push(p);
    for (const x of extra) orders.push([x, ...p]), p.length && orders.push([p[0], x, ...p.slice(1)]);
  }
  let best: Task[] | null = null, bestC = Infinity;
  for (const o of orders) {
    let time = 0, px = sw.x, py = sw.y, n = sw.n, loss = 0, grew = 0, ripped = 0;
    for (const tk of o) {
      if (tk.kind === 'foe') {
        const e = s.foes[tk.idx], q = posAt(e, time + Math.hypot(e.x - px, e.y - py) / BEE_V);
        time += Math.hypot(q.x - px, q.y - py) / BEE_V + (e.k === WASP ? 30 : 6);
        const T = time + killTime(e, n);
        loss += lossAt(s, e, T);
        time = T;
        const q2 = posAt(e, T);
        (px = q2.x), (py = q2.y);
      } else if (tk.kind === 'col') {
        const ants = colAnts(s, tk.idx), h = posAt(ants[0], time + Math.hypot(ants[0].x - px, ants[0].y - py) / BEE_V);
        time += Math.hypot(h.x - px, h.y - py) / BEE_V + 4;
        const T = time + 18 + ants.length * 3;
        for (const a of ants) loss += lossAt(s, a, T);
        time = T;
        const tl = posAt(ants[ants.length - 1], T);
        (px = tl.x), (py = tl.y);
      } else if (tk.kind === 'flower') {
        const p = s.patches[tk.idx];
        time += Math.hypot(p.x - px, p.y - py) / BEE_V + 26;
        const add = Math.min(MAXB - n, bloomed(p) * PER_FLOWER);
        n += add;
        grew += add;
        (px = p.x), (py = p.y);
      } else {
        const w = s.webs[tk.idx];
        time += Math.hypot(w.x - px, w.y - py) / BEE_V + 20;
        ripped++;
        (px = w.x), (py = w.y);
      }
    }
    for (const tk of rest) if (tk.kind === 'foe') loss += lossAt(s, s.foes[tk.idx], time + killTime(s.foes[tk.idx], n));
    let c = loss * 1000 + time;
    if (d.star3?.kind === 'grow' && s.maxN < d.star3.n && n < d.star3.n) c += 260 - grew * 2;
    if (d.star3?.kind === 'boss' || d.star3?.kind === 'rip') c -= grew * 2;
    c -= ripped * 260;
    if (c < bestC) (bestC = c), (best = o);
  }
  return best && best.length ? best[0] : null;
}

/** 길 위에 거미줄·연기가 있으면 비켜 가는 경유점 */
function detour(s: BeeState, fx: number, fy: number, tx: number, ty: number, skipWeb: number, R: number) {
  const hz: { x: number; y: number; r: number }[] = [];
  s.webs.forEach((w, k) => !w.ripped && k !== skipWeb && hz.push({ x: w.x, y: w.y, r: w.r + R * 0.8 + 0.03 }));
  for (const m of s.smokes) hz.push({ x: m.x + m.vx * 30, y: m.y, r: m.r + R * 0.8 + 0.04 });
  const vx = tx - fx, vy = ty - fy, L2 = vx * vx + vy * vy || 1e-9;
  let best: { x: number; y: number } | null = null, bu = 2;
  for (const c of hz) {
    const u = clamp(((c.x - fx) * vx + (c.y - fy) * vy) / L2, 0, 1);
    const qx = fx + vx * u, qy = fy + vy * u, d = Math.hypot(qx - c.x, qy - c.y);
    if (d >= c.r || u >= bu) continue;
    if (Math.hypot(tx - c.x, ty - c.y) < c.r * 0.9) continue;
    let nx = qx - c.x, ny = qy - c.y, nl = Math.hypot(nx, ny);
    if (nl < 1e-6) (nx = -vy), (ny = vx), (nl = Math.hypot(nx, ny));
    let wx = c.x + (nx / nl) * (c.r + 0.06), wy = c.y + (ny / nl) * (c.r + 0.06);
    if (wx < FX0 + 0.02 || wx > FX1 - 0.02) (wx = c.x - (nx / nl) * (c.r + 0.06)), (wy = c.y - (ny / nl) * (c.r + 0.06));
    bu = u;
    best = { x: clamp(wx, FX0, FX1), y: clamp(wy, FY0, FY1) };
  }
  return best;
}

/** 할 일을 손짓으로: 멀면 누른 채 끌고(흐름), 가까우면 떼서 뭉친다 */
function execute(s: BeeState, m: Brain): Input {
  const sw = swarm(s), R = swarmR(sw.n), tk = m.task!;
  const windOff = s.wind * WIND_OFF;
  let ax: number, ay: number, release = true, skipWeb = -1, holdAlways = false;
  if (tk.kind === 'foe') {
    const e = s.foes[tk.idx];
    const eta = Math.hypot(e.x - sw.x, e.y - sw.y) / BEE_V;
    const q = posAt(e, Math.min(eta, 90) * 0.8);
    (ax = q.x), (ay = q.y);
    if (e.k === WASP && e.st === WALK) {
      // 등 뒤로: 말벌 앞쪽에 있으면 옆으로 돌아서 간다
      const bx = q.x - e.hx * (e.r + R * 0.55), by = q.y - e.hy * (e.r + R * 0.55);
      const front = (sw.x - e.x) * e.hx + (sw.y - e.y) * e.hy;
      if (front > -0.02 && Math.hypot(sw.x - e.x, sw.y - e.y) < 0.35) {
        const side = (sw.x - e.x) * -e.hy + (sw.y - e.y) * e.hx >= 0 ? 1 : -1;
        (ax = e.x - e.hy * side * (e.r + R + 0.06) - e.hx * 0.02), (ay = e.y + e.hx * side * (e.r + R + 0.06) - e.hy * 0.02);
        release = false;
      } else (ax = bx), (ay = by);
    }
    ax -= windOff;
  } else if (tk.kind === 'col') {
    const ants = colAnts(s, tk.idx);
    if (!ants.length) return (m.task = null), NO;
    const hd = ants[0], tl = ants[ants.length - 1];
    if (m.sweep === 0) {
      (ax = hd.x + hd.hx * 0.07), (ay = hd.y + hd.hy * 0.07);
      if (Math.hypot(sw.x - ax, sw.y - ay) < 0.07 || Math.hypot(s.cx - ax + windOff, s.cy - ay) < 0.03) (m.sweep = 1), (m.sx = ax), (m.sy = ay);
      release = false;
    } else {
      const ex = tl.x - tl.hx * 0.05, ey = tl.y - tl.hy * 0.05, dx = ex - m.sx, dy = ey - m.sy, dd = Math.hypot(dx, dy);
      if (dd < 0.02) return (m.task = null), (m.until = 0), NO;
      const stp = Math.min(dd, 0.045);
      m.sx += (dx / dd) * stp;
      m.sy += (dy / dd) * stp;
      return at(m.sx - windOff, m.sy);
    }
    ax -= windOff;
  } else if (tk.kind === 'flower') {
    const p = s.patches[tk.idx];
    if (bloomed(p) === 0 || s.t - m.started > 110) return (m.task = null), (m.until = 0), NO;
    const a = (s.t - m.started) * 0.13;
    (ax = p.x + Math.cos(a) * p.r * 0.45 - windOff), (ay = p.y + Math.sin(a) * p.r * 0.4);
    holdAlways = Math.hypot(sw.x - p.x, sw.y - p.y) < 0.12;
    release = false;
  } else {
    const w = s.webs[tk.idx];
    if (w.ripped) return (m.task = null), (m.until = 0), NO;
    (ax = w.x), (ay = w.y);
    skipWeb = tk.idx;
    release = false;
    holdAlways = true;
  }
  const wp = detour(s, sw.x, sw.y, ax, ay, skipWeb, R);
  if (wp) return at(wp.x, wp.y);
  if (holdAlways) return at(ax, ay);
  const dist = Math.hypot(sw.x - ax, sw.y - ay);
  if (dist > R + 0.07 || !release) return at(ax, ay);
  // 가까이 왔다: 손을 뗀다 (뭉쳐서 에워싸기). 적이 떼 밖으로 빠져나가면 그때만 다시 톡
  if (tk.kind === 'foe') {
    const e = s.foes[tk.idx];
    if (Math.hypot(e.x - s.lx, e.y - s.ly) > R * 0.8 + e.r) return at(ax, ay);
  }
  return NO;
}

/** 잘하는 봇: 할 일 순서를 내다보고(꿀 잃는 수·시간·꽃으로 키우기·별 조건), 거미줄·연기를 비켜 가고, 말벌은 등 뒤로, 개미 줄은 쭉 긋기 */
export const beeswarmSmart: Bot<BeeState> = {
  name: '벌떼 지휘관',
  act(s) {
    if (s.phase !== 'play') return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, task: null, until: 0, sweep: 0, sx: 0, sy: 0, started: 0, wp: null }));
    const valid = (t: Task | null) => {
      if (!t) return false;
      if (t.kind === 'foe') return alive(s.foes[t.idx]);
      if (t.kind === 'col') return colAnts(s, t.idx).length > 0;
      if (t.kind === 'flower') return bloomed(s.patches[t.idx]) > 0;
      return !s.webs[t.idx].ripped;
    };
    const busy = m.task && (m.task.kind === 'col' ? m.sweep === 1 : m.task.kind !== 'foe');
    if (!valid(m.task) || (!busy && s.t >= m.until)) {
      const nt = choose(s);
      const same = nt && m.task && nt.kind === m.task.kind && nt.idx === m.task.idx;
      if (!same) (m.sweep = 0), (m.started = s.t);
      m.task = nt;
      m.until = s.t + 24;
    }
    if (!m.task) {
      // 할 일이 없으면 다음 예고 쪽으로 가서 기다린다 (꿀과 가까운 쪽)
      const q = s.queue[s.qi];
      if (q && q.t - s.st < 160) {
        const gx = HV.x + (q.x - HV.x) * 0.45, gy = HV.y + (q.y - HV.y) * 0.45;
        const sw = swarm(s);
        if (Math.hypot(sw.x - gx, sw.y - gy) > 0.12) return at(gx, gy);
      }
      return NO;
    }
    return execute(s, m);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number; dx: number; dy: number }>();
/** 못하는 봇: 아무 때나 아무 데나 누르고, 가끔 끌고 다닌다 */
export const beeswarmRandom: Bot<BeeState> = {
  name: '아무 데나',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0.5, y: 0.5, dx: 0, dy: 0 }));
    if (m.hold > 0) {
      m.hold--;
      m.x = clamp(m.x + m.dx, 0, 1);
      m.y = clamp(m.y + m.dy, 0, 1);
      return m.hold > 0 ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 150);
    m.x = rng();
    m.y = (FY0 + rng() * (FY1 - FY0)) / A;
    m.dx = (rng() - 0.5) * 0.012;
    m.dy = (rng() - 0.5) * 0.008;
    m.hold = rng() < 0.5 ? 2 + Math.floor(rng() * 6) : 20 + Math.floor(rng() * 90);
    return { tap: false, dir: 0, pointer: { x: m.x, y: m.y } };
  },
};

/** 버릇 봇 ①: 늘 벌떼에서 가장 가까운 적으로 (멀면 끌고 가고, 닿을 만하면 뗀다). 꽃·별 조건은 모른다 */
export const beeswarmHabit: Bot<BeeState> = {
  name: '가장 가까운 적',
  act(s) {
    if (s.phase !== 'play') return NO;
    const sw = swarm(s);
    let best: Foe | null = null, bd = 9;
    for (const e of s.foes) if (alive(e)) {
      const d = Math.hypot(e.x - sw.x, e.y - sw.y);
      if (d < bd) (bd = d), (best = e);
    }
    if (!best) return NO;
    return bd > 0.08 ? at(best.x, best.y) : NO;
  },
};

/** 버릇 봇 ②(독립 측정용): 늘 벌집에 가장 가까운 적부터 */
export const beeswarmHabit2: Bot<BeeState> = {
  name: '벌집에 가까운 적부터',
  act(s) {
    if (s.phase !== 'play') return NO;
    const sw = swarm(s);
    let best: Foe | null = null, bd = 9;
    for (const e of s.foes) if (alive(e)) {
      const d = Math.hypot(e.x - HV.x, e.y - HV.y);
      if (d < bd) (bd = d), (best = e);
    }
    if (!best) return NO;
    return Math.hypot(best.x - sw.x, best.y - sw.y) > 0.08 ? at(best.x, best.y) : NO;
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 멀수록(위) 조금 작게 — 3/4 시점 */
const dep = (y: number) => 0.86 + 0.2 * clamp((y - FY0) / (FY1 - FY0), 0, 1);
const PETAL = [['#ffd1e6', '#ff7fb6'], ['#fff6c9', '#ffd23a'], ['#e3dcff', '#9f8cff']];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
const bgCache = new Map<string, { far: HTMLCanvasElement; near: HTMLCanvasElement }>();

function star5(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    if (k) ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heart(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.5, y - r * 0.1, x - r * 0.75, y - r * 1.25, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.75, y - r * 1.25, x + r * 1.5, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
}
function hex(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 6 + (k * Math.PI) / 3;
    if (k) ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    else ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
}

// ── 배경: 하늘·먼 언덕·숲 가장자리(시차) + 들판 (크기마다 한 번 그려 둔다) ──
function makeBg(w: number, h: number, dpr: number) {
  const mk = (cw: number, ch: number) => {
    const c = document.createElement('canvas');
    c.width = Math.round(cw * dpr);
    c.height = Math.round(ch * dpr);
    const g = c.getContext('2d')!;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { c, g };
  };
  const Y = (y: number) => y * w, M = 14;
  // 먼 층 (좌우로 조금 넓게: 시차로 밀려도 빈틈이 없게)
  const F = mk(w + M * 2, Y(0.36));
  {
    const g = F.g, W2 = w + M * 2;
    const sky = g.createLinearGradient(0, 0, 0, Y(0.3));
    sky.addColorStop(0, '#6fb9e8');
    sky.addColorStop(0.55, '#a9dcf0');
    sky.addColorStop(1, '#ffe7b0');
    g.fillStyle = sky;
    g.fillRect(0, 0, W2, Y(0.36));
    // 해 번짐 (왼쪽 위)
    const sun = g.createRadialGradient(M + w * 0.17, Y(0.11), 2, M + w * 0.17, Y(0.11), w * 0.45);
    sun.addColorStop(0, 'rgba(255,250,215,.95)');
    sun.addColorStop(0.12, 'rgba(255,240,180,.55)');
    sun.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W2, Y(0.36));
    // 먼 언덕 두 겹 (안개 낀 파랑-초록)
    const hill = (base: number, amp: number, col: string, ph: number) => {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, Y(0.36));
      for (let x = 0; x <= W2; x += 6) g.lineTo(x, Y(base) - Math.sin(x / w * 5.2 + ph) * Y(amp) - Math.sin(x / w * 11 + ph * 2) * Y(amp * 0.35));
      g.lineTo(W2, Y(0.36));
      g.fill();
    };
    hill(0.205, 0.022, '#a7cfae', 0.4);
    hill(0.235, 0.02, '#86bd84', 2.1);
    // 숲 가장자리: 둥근 나무 꼭대기 줄 (적이 여기서 나온다)
    for (let row = 0; row < 2; row++)
      for (let k = 0; k < 15; k++) {
        const x = (k / 14) * W2 + (row ? W2 / 28 : 0) + (hsh(k * 3 + row) - 0.5) * 10, y = Y(0.262 + row * 0.012), r = Y(0.032 + hsh(k + row * 9) * 0.014);
        const tg = g.createRadialGradient(x - r * 0.35, y - r * 0.5, r * 0.15, x, y, r * 1.1);
        tg.addColorStop(0, row ? '#6aa84f' : '#5b9746');
        tg.addColorStop(1, row ? '#2f6b30' : '#2a5c2b');
        g.fillStyle = tg;
        g.beginPath();
        g.arc(x, y, r, 0, TAU);
        g.fill();
      }
    const fe = g.createLinearGradient(0, Y(0.27), 0, Y(0.31));
    fe.addColorStop(0, 'rgba(25,60,25,.55)');
    fe.addColorStop(1, 'rgba(25,60,25,0)');
    g.fillStyle = fe;
    g.fillRect(0, Y(0.265), W2, Y(0.05));
  }
  // 가까운 층: 들판
  const N = mk(w, h);
  {
    const g = N.g;
    const gr = g.createLinearGradient(0, Y(0.28), 0, Y(1.34));
    gr.addColorStop(0, '#a4d873');
    gr.addColorStop(0.35, '#7fc35a');
    gr.addColorStop(1, '#4f9a3c');
    g.fillStyle = gr;
    g.fillRect(0, Y(0.28), w, Y(1.34 - 0.28));
    // 잔디 깎은 줄무늬 (원근: 아래로 갈수록 넓게)
    for (let k = 0; k < 9; k++) {
      g.fillStyle = k % 2 ? 'rgba(255,255,220,.05)' : 'rgba(20,70,20,.04)';
      g.beginPath();
      const x0 = (k / 9) * w, x1 = ((k + 1) / 9) * w;
      g.moveTo(w / 2 + (x0 - w / 2) * 0.7, Y(0.28));
      g.lineTo(w / 2 + (x1 - w / 2) * 0.7, Y(0.28));
      g.lineTo(w / 2 + (x1 - w / 2) * 1.35, Y(1.34));
      g.lineTo(w / 2 + (x0 - w / 2) * 1.35, Y(1.34));
      g.fill();
    }
    // 흙길: 숲에서 벌집까지 (발자국이 다져진 길)
    g.fillStyle = 'rgba(160,120,60,.16)';
    g.beginPath();
    g.moveTo(w * 0.47, Y(0.29));
    g.bezierCurveTo(w * 0.43, Y(0.6), w * 0.56, Y(0.85), w * 0.45, Y(1.13));
    g.lineTo(w * 0.57, Y(1.13));
    g.bezierCurveTo(w * 0.63, Y(0.85), w * 0.5, Y(0.6), w * 0.53, Y(0.29));
    g.fill();
    // 풀 포기와 작은 들꽃
    for (let k = 0; k < 170; k++) {
      const x = hsh(k * 2.3) * w, yy = 0.3 + hsh(k * 5.7) * 1.03, y = Y(yy), sc = dep(yy) * w * 0.012;
      g.strokeStyle = k % 3 ? 'rgba(40,100,30,.55)' : 'rgba(150,210,90,.6)';
      g.lineWidth = Math.max(1, sc * 0.18);
      g.lineCap = 'round';
      g.beginPath();
      for (let b = -1; b <= 1; b++) {
        g.moveTo(x + b * sc * 0.3, y);
        g.quadraticCurveTo(x + b * sc * 0.5, y - sc * 0.6, x + b * sc * 0.9, y - sc * (1.1 - Math.abs(b) * 0.25));
      }
      g.stroke();
      if (k % 7 === 0) {
        g.fillStyle = k % 14 ? '#fffbe8' : '#ffe680';
        g.beginPath();
        g.arc(x + sc, y - sc * 0.4, Math.max(1, sc * 0.22), 0, TAU);
        g.fill();
      }
    }
    // 장식: 가장자리 덤불 · 돌 · 버섯 · 클로버 (가운데 길은 비워 둔다)
    const bushAt = (bx: number, by: number, br: number) => {
      g.fillStyle = 'rgba(20,50,10,.25)';
      g.beginPath();
      g.ellipse(bx, by + br * 0.55, br * 1.5, br * 0.45, 0, 0, TAU);
      g.fill();
      for (const [ox, oy, rr] of [[-0.7, 0.1, 0.7], [0.7, 0.12, 0.65], [0, -0.2, 0.85], [-0.35, -0.05, 0.7], [0.4, -0.02, 0.7]]) {
        const cx = bx + ox * br, cy = by + oy * br, r = rr * br;
        const bgd = g.createRadialGradient(cx - r * 0.35, cy - r * 0.45, 1, cx, cy, r);
        bgd.addColorStop(0, '#86c862');
        bgd.addColorStop(1, '#2f6b2a');
        g.fillStyle = bgd;
        g.beginPath();
        g.arc(cx, cy, r, 0, TAU);
        g.fill();
      }
    };
    bushAt(w * 0.02, Y(0.7), w * 0.05);
    bushAt(w * 0.985, Y(0.95), w * 0.05);
    bushAt(w * 0.97, Y(0.38), w * 0.04);
    for (const [mx, my, ms] of [[0.08, 1.05, 1], [0.12, 1.08, 0.7], [0.9, 0.62, 0.9], [0.35, 1.25, 0.8], [0.7, 1.27, 0.9]]) {
      const x = w * mx, y = Y(my), r = w * 0.012 * ms;
      g.fillStyle = '#f2ead8';
      g.fillRect(x - r * 0.35, y - r * 0.2, r * 0.7, r * 1.1);
      g.fillStyle = '#e04a3a';
      g.beginPath();
      g.ellipse(x, y - r * 0.2, r * 1.1, r * 0.75, 0, Math.PI, TAU);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(x - r * 0.4, y - r * 0.55, r * 0.18, 0, TAU);
      g.arc(x + r * 0.35, y - r * 0.6, r * 0.14, 0, TAU);
      g.fill();
    }
    for (const [sx0, sy0, ss] of [[0.18, 1.2, 1], [0.84, 1.15, 0.8], [0.06, 0.88, 0.7], [0.93, 0.78, 0.9], [0.27, 0.42, 0.6]]) {
      const x = w * sx0, y = Y(sy0), r = w * 0.016 * ss;
      g.fillStyle = 'rgba(20,50,10,.25)';
      g.beginPath();
      g.ellipse(x + r * 0.2, y + r * 0.45, r * 1.2, r * 0.4, 0, 0, TAU);
      g.fill();
      const sg2 = g.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r * 1.1);
      sg2.addColorStop(0, '#e8e4dc');
      sg2.addColorStop(1, '#8f8a80');
      g.fillStyle = sg2;
      g.beginPath();
      g.ellipse(x, y, r * 1.1, r * 0.75, 0, 0, TAU);
      g.fill();
    }
    // 그루터기 (벌집 받침)
    const sx = w * HV.x, sy = Y(HV.y + 0.045), sw = w * 0.125, sh = Y(0.055);
    g.fillStyle = 'rgba(20,50,10,.35)';
    g.beginPath();
    g.ellipse(sx + w * 0.012, sy + sh * 0.98, sw * 1.35, sh * 0.42, 0, 0, TAU);
    g.fill();
    // 뿌리
    g.fillStyle = '#6b4424';
    for (const d of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx + d * sw * 0.8, sy + sh * 0.55);
      g.quadraticCurveTo(sx + d * sw * 1.25, sy + sh * 0.9, sx + d * sw * 1.4, sy + sh * 1.0);
      g.quadraticCurveTo(sx + d * sw * 1.05, sy + sh * 1.05, sx + d * sw * 0.7, sy + sh * 0.95);
      g.fill();
    }
    const side = g.createLinearGradient(sx - sw, 0, sx + sw, 0);
    side.addColorStop(0, '#5a361b');
    side.addColorStop(0.35, '#8c5a30');
    side.addColorStop(0.7, '#7a4b26');
    side.addColorStop(1, '#4a2c15');
    g.fillStyle = side;
    g.beginPath();
    g.moveTo(sx - sw, sy);
    g.lineTo(sx - sw * 0.98, sy + sh);
    g.ellipse(sx, sy + sh, sw * 0.98, sh * 0.32, 0, Math.PI, 0, true);
    g.lineTo(sx + sw, sy);
    g.fill();
    g.strokeStyle = 'rgba(40,20,8,.35)';
    g.lineWidth = 1;
    for (let k = -3; k <= 3; k++) {
      g.beginPath();
      g.moveTo(sx + k * sw * 0.28, sy + sh * 0.25);
      g.lineTo(sx + k * sw * 0.3, sy + sh * 1.15);
      g.stroke();
    }
    const top = g.createRadialGradient(sx - sw * 0.2, sy - sh * 0.1, 2, sx, sy, sw);
    top.addColorStop(0, '#f0c98e');
    top.addColorStop(1, '#c08a52');
    g.fillStyle = top;
    g.beginPath();
    g.ellipse(sx, sy, sw, sh * 0.34, 0, 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(120,70,30,.45)';
    for (let k = 1; k < 4; k++) {
      g.beginPath();
      g.ellipse(sx, sy, sw * k * 0.24, sh * 0.34 * k * 0.24, 0, 0, TAU);
      g.stroke();
    }
  }
  return { far: F.c, near: N.c };
}

// ── 캐릭터 ──
function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: number, lookX = 0, lookY = 0) {
  ctx.lineCap = 'round';
  if (mood === 1) {
    // >< 질끈
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, r * 0.45);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y - r * 0.6);
    ctx.lineTo(x + r * 0.5, y);
    ctx.lineTo(x - r * 0.8, y + r * 0.6);
    ctx.stroke();
    return;
  }
  if (mood === 2) {
    // ^^ 행복
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.2, r * 0.45);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.35, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    return;
  }
  if (mood === 3) {
    // 어질어질 소용돌이
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = k * 0.75, rr = (k / 16) * r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.12, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1e120a';
  ctx.beginPath();
  ctx.arc(x + lookX * r * 0.3, y + lookY * r * 0.3 + r * 0.1, r * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + lookX * r * 0.3 - r * 0.22, y + lookY * r * 0.3 - r * 0.15, r * 0.24, 0, TAU);
  ctx.fill();
}

/** 곰 (아기 곰·대장 곰). mood 0 걸음 · 1 쏘임(버둥) · 2 꿀 먹음 · 3 퐁(어질) · 4 꿀 들고 도망 */
function drawBear(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, mood: number, t: number, boss: boolean, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (mood !== 3) {
    ctx.fillStyle = 'rgba(20,50,10,.28)';
    ctx.beginPath();
    ctx.ellipse(u * 0.05, u * 0.92, u * 0.95, u * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.rotate(rot);
  ctx.scale(face, 1);
  const walk = mood === 0 || mood === 4 ? Math.sin(t * 0.22) : 0, bob = Math.abs(walk) * u * 0.06;
  const shake = mood === 1 ? Math.sin(t * 1.7) * u * 0.06 : 0;
  ctx.translate(shake, -bob);
  const fur = boss ? ['#a8703f', '#7a4a22', '#4e2c12'] : ['#c78d55', '#9a6233', '#62391a'];
  const ol = boss ? 'rgba(45,22,8,.75)' : 'rgba(70,36,12,.6)';
  ctx.lineWidth = Math.max(1.2, u * 0.06);
  ctx.strokeStyle = ol;
  // 다리
  for (const d of [-1, 1]) {
    ctx.fillStyle = fur[2];
    ctx.beginPath();
    ctx.ellipse(d * u * 0.42, u * 0.72 + (mood === 2 ? 0 : d * walk * u * 0.1), u * 0.24, u * 0.18, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // 몸
  const bg = ctx.createRadialGradient(-u * 0.3, -u * 0.1, u * 0.1, 0, u * 0.2, u * 1.0);
  bg.addColorStop(0, fur[0]);
  bg.addColorStop(0.6, fur[1]);
  bg.addColorStop(1, fur[2]);
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.25, u * 0.78, u * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = boss ? '#d9a877' : '#efc896';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.36, u * 0.45, u * 0.42, 0, 0, TAU);
  ctx.fill();
  // 팔 (버둥 · 꿀단지 안기 · 걸음)
  const armA = mood === 1 ? -1.9 + Math.sin(t * 1.3) * 0.6 : mood === 2 || mood === 4 ? 0.9 : 0.35 + walk * 0.3;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * u * 0.62, u * 0.1);
    ctx.rotate(d * (mood === 1 ? armA + (d > 0 ? Math.sin(t * 1.6) * 0.5 : 0) : -armA * 0.6));
    ctx.fillStyle = fur[1];
    ctx.beginPath();
    ctx.ellipse(0, u * 0.22, u * 0.17, u * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  if (mood === 2 || mood === 4) {
    // 꿀단지
    const jx = 0, jy = u * 0.42;
    const jg = ctx.createLinearGradient(jx - u * 0.3, 0, jx + u * 0.3, 0);
    jg.addColorStop(0, '#c97c10');
    jg.addColorStop(0.5, '#ffc93d');
    jg.addColorStop(1, '#c97c10');
    ctx.fillStyle = jg;
    ctx.beginPath();
    ctx.ellipse(jx, jy, u * 0.3, u * 0.27, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(110,60,0,.7)';
    ctx.stroke();
    ctx.fillStyle = '#7a4a1a';
    ctx.fillRect(jx - u * 0.2, jy - u * 0.32, u * 0.4, u * 0.1);
    ctx.fillStyle = '#ffe9a0';
    ctx.font = `900 ${Math.round(u * 0.22)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('꿀', jx, jy + u * 0.03);
    ctx.strokeStyle = ol;
  }
  // 머리
  const hy = -u * 0.55, hr = u * 0.58;
  for (const d of [-1, 1]) {
    ctx.fillStyle = fur[1];
    ctx.beginPath();
    ctx.arc(d * hr * 0.72, hy - hr * 0.68, hr * 0.32, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f2a7a0';
    ctx.beginPath();
    ctx.arc(d * hr * 0.72, hy - hr * 0.66, hr * 0.17, 0, TAU);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(-hr * 0.35, hy - hr * 0.4, hr * 0.1, 0, hy, hr * 1.1);
  hg.addColorStop(0, fur[0]);
  hg.addColorStop(0.65, fur[1]);
  hg.addColorStop(1, fur[2]);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 볼 · 주둥이
  ctx.fillStyle = 'rgba(255,130,120,.35)';
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(d * hr * 0.55, hy + hr * 0.28, hr * 0.17, hr * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#f3d2a5';
  ctx.beginPath();
  ctx.ellipse(0, hy + hr * 0.32, hr * 0.38, hr * 0.28, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1608';
  ctx.beginPath();
  ctx.ellipse(0, hy + hr * 0.2, hr * 0.13, hr * 0.09, 0, 0, TAU);
  ctx.fill();
  // 입
  ctx.strokeStyle = '#2a1608';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  if (mood === 1) {
    ctx.ellipse(0, hy + hr * 0.45, hr * 0.12, hr * 0.1, 0, 0, TAU);
    ctx.fillStyle = '#7a1f1f';
    ctx.fill();
  } else if (mood === 2 || mood === 4) {
    ctx.arc(0, hy + hr * 0.36, hr * 0.16, 0.2, Math.PI - 0.2);
    ctx.stroke();
    // 입가에 묻은 꿀
    ctx.fillStyle = '#ffbf2e';
    ctx.beginPath();
    ctx.ellipse(hr * 0.2, hy + hr * 0.5, hr * 0.08, hr * 0.13, 0.3, 0, TAU);
    ctx.fill();
  } else if (mood === 3) {
    ctx.arc(0, hy + hr * 0.52, hr * 0.12, Math.PI + 0.3, -0.3);
    ctx.stroke();
  } else {
    ctx.moveTo(-hr * 0.12, hy + hr * 0.4);
    ctx.quadraticCurveTo(0, hy + hr * 0.5, hr * 0.12, hy + hr * 0.4);
    ctx.stroke();
  }
  const em = mood === 1 ? 1 : mood === 2 ? 2 : mood === 3 ? 3 : 0;
  for (const d of [-1, 1]) eye(ctx, d * hr * 0.36, hy - hr * 0.08, hr * 0.15, em, 0.3, 0.4);
  if (boss) {
    // 화난 눈썹 + 왕관
    ctx.strokeStyle = '#2a1608';
    ctx.lineWidth = Math.max(1.5, u * 0.07);
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(d * hr * 0.55, hy - hr * 0.38);
      ctx.lineTo(d * hr * 0.15, hy - hr * 0.24);
      ctx.stroke();
    }
    const cy = hy - hr * 0.95;
    const cg = ctx.createLinearGradient(0, cy - hr * 0.4, 0, cy + hr * 0.1);
    cg.addColorStop(0, '#fff3a0');
    cg.addColorStop(1, '#e0a10e');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(-hr * 0.42, cy + hr * 0.1);
    ctx.lineTo(-hr * 0.48, cy - hr * 0.28);
    ctx.lineTo(-hr * 0.22, cy - hr * 0.08);
    ctx.lineTo(0, cy - hr * 0.42);
    ctx.lineTo(hr * 0.22, cy - hr * 0.08);
    ctx.lineTo(hr * 0.48, cy - hr * 0.28);
    ctx.lineTo(hr * 0.42, cy + hr * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#9a6a00';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#ff4d6d';
    ctx.beginPath();
    ctx.arc(0, cy - hr * 0.05, hr * 0.08, 0, TAU);
    ctx.fill();
  }
  if (mood === 1) {
    // 땀방울
    ctx.fillStyle = 'rgba(160,220,255,.9)';
    ctx.beginPath();
    ctx.ellipse(hr * 0.95, hy - hr * 0.3 + ((t * 0.6) % 8), hr * 0.08, hr * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 개미 (진행 방향으로 돈다) */
function drawAnt(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, ang: number, t: number, carry: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(20,50,10,.25)';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, u * 0.35, u * 1.1, u * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.rotate(ang);
  const st = Math.sin(t * 0.6);
  ctx.strokeStyle = '#2b130b';
  ctx.lineWidth = Math.max(1, u * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = -1; k <= 1; k++)
    for (const d of [-1, 1]) {
      const sw = (k % 2 === 0 ? st : -st) * d * 0.25;
      ctx.moveTo(k * u * 0.25, 0);
      ctx.lineTo(k * u * 0.35 + sw * u, d * u * 0.62);
    }
  ctx.moveTo(u * 0.75, -u * 0.08);
  ctx.quadraticCurveTo(u * 1.1, -u * 0.3, u * 1.25, -u * 0.45);
  ctx.moveTo(u * 0.75, u * 0.08);
  ctx.quadraticCurveTo(u * 1.1, u * 0.3, u * 1.25, u * 0.45);
  ctx.stroke();
  const seg = (sx: number, rx: number, ry: number) => {
    const g = ctx.createRadialGradient(sx - rx * 0.3, -ry * 0.4, rx * 0.1, sx, 0, rx);
    g.addColorStop(0, '#b0533a');
    g.addColorStop(1, '#4a1a10');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(sx, 0, rx, ry, 0, 0, TAU);
    ctx.fill();
  };
  seg(-u * 0.6, u * 0.45, u * 0.36);
  seg(0, u * 0.27, u * 0.22);
  seg(u * 0.55, u * 0.3, u * 0.28);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(u * 0.68, -u * 0.12, u * 0.08, 0, TAU);
  ctx.arc(u * 0.68, u * 0.12, u * 0.08, 0, TAU);
  ctx.fill();
  if (carry) {
    const g = ctx.createRadialGradient(-u * 0.1, -u * 0.15, 1, 0, 0, u * 0.5);
    g.addColorStop(0, '#fff3b0');
    g.addColorStop(1, '#f0a400');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(-u * 0.1, 0, u * 0.42, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150,80,0,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

/** 방패 든 말벌 (진행 방향으로 돈다, 방패는 앞) — 주황·검정 줄무늬, 찡그린 눈, 도토리 깍정이 방패 */
function drawWasp(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, ang: number, t: number, hurt: boolean, carry: boolean) {
  ctx.save();
  ctx.translate(x, y + u * 0.9);
  ctx.fillStyle = 'rgba(20,50,10,.22)';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 1.0, u * 0.34, 0, 0, TAU);
  ctx.fill();
  ctx.translate(0, -u * 0.9 + Math.sin(t * 0.2) * u * 0.08);
  ctx.rotate(ang);
  // 날개 (빠른 날갯짓, 몸 뒤)
  const fl = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.9));
  ctx.fillStyle = 'rgba(225,240,255,.55)';
  ctx.strokeStyle = 'rgba(90,120,150,.6)';
  ctx.lineWidth = 1;
  for (const d of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-u * 0.2, d * u * 0.6 * fl, u * 0.62, u * 0.3 * fl, d * 0.55, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  // 배 (줄무늬)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-u * 0.45, 0, u * 0.62, u * 0.38, 0, 0, TAU);
  ctx.clip();
  const bg = ctx.createLinearGradient(0, -u * 0.38, 0, u * 0.38);
  bg.addColorStop(0, '#ffb340');
  bg.addColorStop(0.5, '#ff7a1a');
  bg.addColorStop(1, '#b84300');
  ctx.fillStyle = bg;
  ctx.fillRect(-u * 1.2, -u, u * 1.6, u * 2);
  ctx.fillStyle = '#1c0f06';
  for (let k = 0; k < 3; k++) ctx.fillRect(-u * 0.95 + k * u * 0.3, -u, u * 0.14, u * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(60,20,0,.7)';
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.beginPath();
  ctx.ellipse(-u * 0.45, 0, u * 0.62, u * 0.38, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#1c0f06';
  ctx.beginPath();
  ctx.moveTo(-u * 1.04, -u * 0.09);
  ctx.lineTo(-u * 1.38, 0);
  ctx.lineTo(-u * 1.04, u * 0.09);
  ctx.fill();
  // 가슴 · 머리 (짙은 색)
  ctx.fillStyle = '#3a1d0a';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, 0, u * 0.22, u * 0.24, 0, 0, TAU);
  ctx.fill();
  const hg = ctx.createRadialGradient(u * 0.36, -u * 0.1, 1, u * 0.42, 0, u * 0.34);
  hg.addColorStop(0, '#ffcf5a');
  hg.addColorStop(1, '#d9800a');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(u * 0.42, 0, u * 0.31, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,20,0,.7)';
  ctx.stroke();
  // 찡그린 눈
  for (const d of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(u * 0.52, d * u * 0.14, u * 0.12, u * 0.1, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = hurt ? '#e0262a' : '#120802';
    ctx.beginPath();
    ctx.arc(u * 0.57, d * u * 0.12, u * 0.065, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#120802';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    ctx.beginPath();
    ctx.moveTo(u * 0.38, d * u * 0.28);
    ctx.lineTo(u * 0.64, d * u * 0.05);
    ctx.stroke();
  }
  // 방패: 도토리 깍정이 둥근 방패 (앞)
  ctx.save();
  ctx.translate(u * 0.9, 0);
  const sg = ctx.createRadialGradient(-u * 0.12, -u * 0.25, 1, 0, 0, u * 0.75);
  sg.addColorStop(0, '#d9ab6e');
  sg.addColorStop(1, '#6a4320');
  ctx.fillStyle = sg;
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.26, u * 0.72, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e8edf2';
  ctx.lineWidth = Math.max(1.6, u * 0.12);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,30,10,.55)';
  ctx.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-u * 0.16, k * u * 0.17);
    ctx.lineTo(u * 0.16, k * u * 0.17 + u * 0.07);
    ctx.stroke();
  }
  ctx.fillStyle = '#e8edf2';
  ctx.beginPath();
  ctx.arc(u * 0.03, 0, u * 0.09, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (carry) {
    ctx.fillStyle = '#ffc93d';
    ctx.beginPath();
    ctx.arc(-u * 0.4, 0, u * 0.26, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawSpider(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, scared: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = '#2a1830';
  ctx.lineWidth = Math.max(1, u * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let k = 0; k < 4; k++)
    for (const d of [-1, 1]) {
      const a = (-0.9 + k * 0.6) * d + (d < 0 ? Math.PI : 0), wig = Math.sin(t * 0.3 + k) * 0.08;
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.cos(a + wig) * u * 0.9, Math.sin(a + wig) * u * 0.9 - u * 0.4, Math.cos(a + wig) * u * 1.3, Math.sin(a + wig) * u * 1.3);
    }
  ctx.stroke();
  const g = ctx.createRadialGradient(-u * 0.2, -u * 0.25, 1, 0, 0, u * 0.6);
  g.addColorStop(0, '#7a5a8a');
  g.addColorStop(1, '#2a1830');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, u * 0.55, 0, TAU);
  ctx.fill();
  for (const d of [-1, 1]) eye(ctx, d * u * 0.2, -u * 0.08, u * 0.17, scared ? 1 : 0, 0, 0.5);
  ctx.restore();
}

/** 대장벌 (주인공): 흐를 땐 결연, 퐁 하면 우쭐 */
function drawCaptain(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, mood: number, t: number, fever: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const fl = Math.abs(Math.sin(t * 1.4));
  // 날개
  for (const d of [0, 1]) {
    ctx.save();
    ctx.translate(-u * 0.15 + d * u * 0.2, -u * 0.55);
    ctx.rotate(-0.5 + d * 0.5 - fl * 0.5);
    ctx.fillStyle = 'rgba(235,250,255,.75)';
    ctx.strokeStyle = 'rgba(110,160,190,.8)';
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.35, u * 0.32, u * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 몸 (줄무늬 + 침)
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(-u * 0.25, u * 0.05, u * 0.72, u * 0.56, 0, 0, TAU);
  ctx.clip();
  const bg = ctx.createRadialGradient(-u * 0.4, -u * 0.25, u * 0.1, -u * 0.25, u * 0.05, u * 0.9);
  bg.addColorStop(0, fever ? '#fff6b0' : '#ffe680');
  bg.addColorStop(0.6, fever ? '#ffcf3a' : '#ffc21a');
  bg.addColorStop(1, '#d88a00');
  ctx.fillStyle = bg;
  ctx.fillRect(-u * 1.2, -u, u * 2, u * 2);
  ctx.fillStyle = '#2b1a0a';
  ctx.fillRect(-u * 0.55, -u, u * 0.2, u * 2);
  ctx.fillRect(-u * 0.95, -u, u * 0.18, u * 2);
  ctx.restore();
  ctx.strokeStyle = 'rgba(90,50,0,.7)';
  ctx.lineWidth = Math.max(1.2, u * 0.07);
  ctx.beginPath();
  ctx.ellipse(-u * 0.25, u * 0.05, u * 0.72, u * 0.56, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#2b1a0a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.95, -u * 0.05);
  ctx.lineTo(-u * 1.2, u * 0.08);
  ctx.lineTo(-u * 0.92, u * 0.2);
  ctx.fill();
  // 머리
  const hx = u * 0.5, hy = -u * 0.1, hr = u * 0.46;
  const hg = ctx.createRadialGradient(hx - hr * 0.3, hy - hr * 0.35, hr * 0.1, hx, hy, hr * 1.1);
  hg.addColorStop(0, '#fff0a0');
  hg.addColorStop(0.7, '#ffc828');
  hg.addColorStop(1, '#d88a00');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 더듬이
  ctx.strokeStyle = '#2b1a0a';
  ctx.lineWidth = Math.max(1, u * 0.06);
  for (const d of [0, 1]) {
    const tx = hx + hr * (0.05 + d * 0.45), ty = hy - hr * 1.55 + Math.sin(t * 0.3 + d) * u * 0.05;
    ctx.beginPath();
    ctx.moveTo(hx + hr * (d * 0.35 - 0.05), hy - hr * 0.85);
    ctx.quadraticCurveTo(hx + hr * (d * 0.2), hy - hr * 1.3, tx, ty);
    ctx.stroke();
    ctx.fillStyle = '#2b1a0a';
    ctx.beginPath();
    ctx.arc(tx, ty, u * 0.08, 0, TAU);
    ctx.fill();
  }
  // 빨간 대장 머리띠 (꼬리가 휘날림)
  ctx.fillStyle = '#e8413a';
  ctx.beginPath();
  ctx.ellipse(hx, hy - hr * 0.55, hr * 0.98, hr * 0.22, -0.08, Math.PI, TAU);
  ctx.ellipse(hx, hy - hr * 0.55, hr * 0.98, hr * 0.12, -0.08, 0, Math.PI);
  ctx.fill();
  ctx.beginPath();
  const fw = Math.sin(t * 0.35) * u * 0.08;
  ctx.moveTo(hx - hr * 0.85, hy - hr * 0.55);
  ctx.quadraticCurveTo(hx - hr * 1.4, hy - hr * 0.75 + fw, hx - hr * 1.85, hy - hr * 0.5 + fw);
  ctx.lineTo(hx - hr * 1.7, hy - hr * 0.35 + fw);
  ctx.quadraticCurveTo(hx - hr * 1.3, hy - hr * 0.45, hx - hr * 0.85, hy - hr * 0.4);
  ctx.fill();
  // 얼굴
  const em = mood === 2 ? 2 : mood === 3 ? 3 : 0;
  eye(ctx, hx + hr * 0.38, hy + hr * 0.02, hr * 0.24, em, 0.6, 0.1);
  if (mood === 1) {
    ctx.strokeStyle = '#2b1a0a';
    ctx.lineWidth = Math.max(1.2, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.1, hy - hr * 0.32);
    ctx.lineTo(hx + hr * 0.62, hy - hr * 0.2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,100,.45)';
  ctx.beginPath();
  ctx.ellipse(hx + hr * 0.2, hy + hr * 0.42, hr * 0.17, hr * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2b1a0a';
  ctx.lineWidth = Math.max(1, u * 0.06);
  ctx.beginPath();
  if (mood === 2) {
    ctx.arc(hx + hr * 0.55, hy + hr * 0.38, hr * 0.2, 0.1, Math.PI - 0.3);
    ctx.fillStyle = '#7a1f1f';
    ctx.fill();
  } else if (mood === 1) {
    ctx.moveTo(hx + hr * 0.45, hy + hr * 0.5);
    ctx.lineTo(hx + hr * 0.75, hy + hr * 0.46);
  } else ctx.arc(hx + hr * 0.58, hy + hr * 0.36, hr * 0.15, 0.3, Math.PI - 0.5);
  ctx.stroke();
  ctx.restore();
}

/** 덤불 속 토끼 구경꾼. mood 0 두리번 · 1 만세 폴짝 · 2 볼 감싸기 */
function drawRabbit(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  const jump = mood === 1 ? -Math.abs(Math.sin(t * 0.25)) * u * 0.5 : 0;
  // 토끼 (덤불 위로 얼굴을 내민다)
  ctx.save();
  ctx.translate(0, jump - u * 0.32);
  const tw = mood === 0 ? Math.sin(t * 0.05) * 0.12 : mood === 2 ? 0.5 : -0.1;
  for (const d of [-1, 1]) {
    ctx.save();
    ctx.translate(d * u * 0.22, -u * 0.6);
    ctx.rotate(d * (0.15 + tw));
    ctx.fillStyle = '#f4efe9';
    ctx.strokeStyle = 'rgba(120,100,90,.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.45, u * 0.16, u * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f7b6c2';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.42, u * 0.08, u * 0.36, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const hg = ctx.createRadialGradient(-u * 0.15, -u * 0.45, 2, 0, -u * 0.3, u * 0.6);
  hg.addColorStop(0, '#ffffff');
  hg.addColorStop(1, '#ddd3cb');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.25, u * 0.5, u * 0.44, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,100,90,.55)';
  ctx.stroke();
  for (const d of [-1, 1]) eye(ctx, d * u * 0.19, -u * 0.3, u * 0.1, mood === 1 ? 2 : 0, 0, mood === 2 ? -0.3 : 0.2);
  ctx.fillStyle = '#ff8fa3';
  ctx.beginPath();
  ctx.arc(0, -u * 0.15, u * 0.06, 0, TAU);
  ctx.fill();
  if (mood === 2) {
    ctx.fillStyle = '#7a1f1f';
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.03, u * 0.07, u * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f4efe9';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(d * u * 0.36, -u * 0.12, u * 0.13, u * 0.17, 0, 0, TAU);
      ctx.fill();
    }
  } else if (mood === 1) {
    ctx.fillStyle = '#f4efe9';
    for (const d of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(d * u * 0.55, -u * 0.62, u * 0.12, u * 0.16, d * 0.4, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // 덤불 (토끼 앞)
  const bush: number[][] = [[-0.55, 0.05, 0.42], [0, 0.12, 0.5], [0.55, 0.05, 0.42], [-0.25, -0.05, 0.38], [0.3, -0.04, 0.36]];
  for (const [bx, by, br] of bush) {
    const g = ctx.createRadialGradient(bx * u - br * u * 0.3, by * u - br * u * 0.4, 1, bx * u, by * u, br * u);
    g.addColorStop(0, '#7cc25a');
    g.addColorStop(1, '#2f6b2a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx * u, by * u, br * u, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ff6b8a';
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc((-0.4 + k * 0.4) * u, (0.02 + (k % 2) * 0.1) * u, u * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 짚 벌집 (종 모양 짚 똬리) — 위험하면 붉게 떨고, 남은 꿀만큼 꿀이 흘러내린다 */
function drawHive(ctx: CanvasRenderingContext2D, s: BeeState, x: number, y: number, u: number, t: number) {
  const alarm = s.foes.some((e) => e.st === EAT) || s.t - s.stolenT < 40;
  ctx.save();
  ctx.translate(x + (alarm ? Math.sin(t * 1.3) * u * 0.025 : 0), y);
  if (alarm) {
    const g = ctx.createRadialGradient(0, 0, u * 0.3, 0, 0, u * 1.7);
    g.addColorStop(0, `rgba(255,80,60,${0.28 + 0.15 * Math.sin(t * 0.3)})`);
    g.addColorStop(1, 'rgba(255,80,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, u * 1.7, 0, TAU);
    ctx.fill();
  }
  const bot = u * 0.62, topY = -u * 0.82, half = u * 0.98;
  const dome = () => {
    ctx.beginPath();
    ctx.moveTo(-half, bot);
    ctx.bezierCurveTo(-half * 1.05, bot - u * 0.6, -half * 0.62, topY, 0, topY);
    ctx.bezierCurveTo(half * 0.62, topY, half * 1.05, bot - u * 0.6, half, bot);
    ctx.ellipse(0, bot, half, u * 0.16, 0, 0, Math.PI);
    ctx.closePath();
  };
  dome();
  const g = ctx.createRadialGradient(-u * 0.35, -u * 0.35, u * 0.1, 0, u * 0.1, u * 1.15);
  g.addColorStop(0, '#fbe6a2');
  g.addColorStop(0.45, '#e9b24a');
  g.addColorStop(1, '#9c5e18');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(100,55,8,.7)';
  ctx.lineWidth = Math.max(1.2, u * 0.035);
  ctx.stroke();
  // 짚 똬리 줄 (아래로 볼록한 곡선)
  ctx.save();
  dome();
  ctx.clip();
  for (let k = 1; k <= 6; k++) {
    const yy = topY + (bot - topY) * (k / 6.4), ww = half * (0.45 + 0.55 * Math.sqrt(k / 6.4)) * 1.05;
    ctx.strokeStyle = 'rgba(120,68,10,.5)';
    ctx.lineWidth = Math.max(1, u * 0.03);
    ctx.beginPath();
    ctx.ellipse(0, yy - u * 0.06, ww, u * 0.1, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,244,200,.45)';
    ctx.beginPath();
    ctx.ellipse(0, yy - u * 0.1, ww * 0.96, u * 0.09, 0, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  ctx.restore();
  // 꼭지
  ctx.fillStyle = '#c98a2b';
  ctx.beginPath();
  ctx.ellipse(0, topY + u * 0.02, u * 0.13, u * 0.08, 0, 0, TAU);
  ctx.fill();
  // 입구 + 발판
  ctx.fillStyle = '#3a2008';
  ctx.beginPath();
  ctx.ellipse(0, bot - u * 0.02, u * 0.22, u * 0.16, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a5a30';
  ctx.beginPath();
  ctx.roundRect(-u * 0.34, bot - u * 0.02, u * 0.68, u * 0.08, u * 0.03);
  ctx.fill();
  // 문지기 벌 (입구 둘레를 맴돈다)
  for (let k = 0; k < 3; k++) {
    const a = t * 0.07 + k * 2.1, bx = Math.cos(a) * u * 0.45, by = bot - u * 0.25 + Math.sin(a) * u * 0.12;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.ellipse(bx, by - u * 0.06, u * 0.06, u * 0.035, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffcb2b';
    ctx.beginPath();
    ctx.ellipse(bx, by, u * 0.07, u * 0.05, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4a2c0c';
    ctx.fillRect(bx - u * 0.01, by - u * 0.05, u * 0.025, u * 0.1);
  }
  // 흘러내리는 꿀 (남은 꿀만큼)
  const frac = s.honey / Math.max(1, s.honey0);
  for (let k = 0; k < 5; k++) {
    if (k / 5 >= frac) continue;
    const dx = (-0.62 + k * 0.31) * u, y0 = topY + (bot - topY) * (0.42 + (k % 2) * 0.18), len = u * (0.1 + 0.07 * Math.sin(t * 0.04 + k));
    const hg = ctx.createLinearGradient(0, y0, 0, y0 + len);
    hg.addColorStop(0, '#ffcf3a');
    hg.addColorStop(1, '#f39a00');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.moveTo(dx - u * 0.06, y0);
    ctx.lineTo(dx + u * 0.06, y0);
    ctx.lineTo(dx + u * 0.035, y0 + len);
    ctx.arc(dx, y0 + len, u * 0.035, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(dx - u * 0.015, y0 + len * 0.6, u * 0.012, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawAll(ctx: CanvasRenderingContext2D, s: BeeState, w: number, h: number, _th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 35 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 16) rec.shift();
    fx.pop(clamp(x, w * 0.14, w * 0.86), y, text, col, size);
  };
  ctx.save();
  fx.begin(ctx);
  // 큰 순간엔 그 자리로 살짝 다가가는 카메라 펀치
  const pk = t - (fx.memo.punchT ?? -99);
  if (pk >= 0 && pk < 12) {
    const z = 1 + (fx.memo.punchZ ?? 0.03) * (1 - pk / 12), pxp = fx.memo.punchX ?? w / 2, pyp = fx.memo.punchY ?? h / 2;
    ctx.translate(pxp, pyp);
    ctx.scale(z, z);
    ctx.translate(-pxp, -pyp);
  }
  // ── 배경 (캐시) ──
  let bg: { far: HTMLCanvasElement; near: HTMLCanvasElement } | undefined;
  if (typeof document !== 'undefined') {
    const dpr = ctx.getTransform().a || 1, key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
    bg = bgCache.get(key);
    if (!bg) bgCache.set(key, (bg = makeBg(w, h, dpr)));
  }
  if (bg) {
    const par = (0.5 - s.cx) * 10;
    ctx.drawImage(bg.far, -14 + par, 0, w + 28, Y(0.36));
    ctx.drawImage(bg.near, 0, 0, w, h);
  } else {
    ctx.fillStyle = '#7fc35a';
    ctx.fillRect(0, 0, w, h);
  }
  // 흘러가는 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((hsh(k + 7) * w + t * (0.08 + k * 0.03)) % (w + R(0.4))) - R(0.2), cy = Y(0.05 + k * 0.045), cr = R(0.035 + k * 0.008);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, TAU);
    ctx.arc(cx + cr * 1.1, cy + cr * 0.2, cr * 0.8, 0, TAU);
    ctx.arc(cx - cr * 1.1, cy + cr * 0.25, cr * 0.7, 0, TAU);
    ctx.fill();
  }
  // 햇살 줄기 (빛 번짐)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 4; k++) {
    const a0 = 0.5 + k * 0.17 + Math.sin(t * 0.004 + k) * 0.02, sx = X(0.12), sy = Y(0.06);
    const g = ctx.createLinearGradient(sx, sy, sx + Math.cos(a0) * R(1.2), sy + Math.sin(a0) * R(1.2));
    g.addColorStop(0, 'rgba(255,240,190,.16)');
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(a0 - 0.035) * R(1.4), sy + Math.sin(a0 - 0.035) * R(1.4));
    ctx.lineTo(sx + Math.cos(a0 + 0.035) * R(1.4), sy + Math.sin(a0 + 0.035) * R(1.4));
    ctx.fill();
  }
  ctx.restore();
  // 일렁이는 나뭇잎 그늘·햇빛 얼룩
  for (let k = 0; k < 4; k++) {
    const lx = X(hsh(k * 11) * 0.9 + 0.05 + Math.sin(t * 0.006 + k) * 0.03), ly = Y(0.4 + hsh(k * 13) * 0.75), lr = R(0.13);
    const g = ctx.createRadialGradient(lx, ly, 2, lx, ly, lr);
    g.addColorStop(0, 'rgba(255,250,200,.13)');
    g.addColorStop(1, 'rgba(255,250,200,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, TAU);
    ctx.fill();
  }

  // ── 꽃밭 ──
  for (const p of s.patches) {
    const dk = dep(p.y);
    const pg = ctx.createRadialGradient(X(p.x), Y(p.y), 2, X(p.x), Y(p.y + 0.01), R(p.r + 0.035));
    pg.addColorStop(0, 'rgba(60,130,50,.32)');
    pg.addColorStop(1, 'rgba(60,130,50,0)');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.ellipse(X(p.x), Y(p.y + 0.01), R(p.r + 0.035), R(p.r * 0.8 + 0.025), 0, 0, TAU);
    ctx.fill();
    // 잎
    ctx.fillStyle = '#3f8f3a';
    for (let q = 0; q < 7; q++) {
      const a = q * 0.9 + p.hue, lx = X(p.x + Math.cos(a) * (p.r + 0.012)), ly = Y(p.y + Math.sin(a) * (p.r * 0.75 + 0.01));
      ctx.beginPath();
      ctx.ellipse(lx, ly, R(0.018) * dk, R(0.008) * dk, a, 0, TAU);
      ctx.fill();
    }
    const col = PETAL[p.hue % PETAL.length];
    for (let q = 0; q < p.fx.length; q++) {
      const fx0 = X(p.fx[q]), fy0 = Y(p.fy[q]), cool = p.cool[q], grow = cool <= 0 ? 1 : cool < 60 ? 1 - cool / 60 : 0;
      const sway = Math.sin(t * 0.05 + q * 1.7) * R(0.003), sz = R(0.016) * dk;
      ctx.strokeStyle = '#2f7a2c';
      ctx.lineWidth = Math.max(1, sz * 0.18);
      ctx.beginPath();
      ctx.moveTo(fx0, fy0 + sz * 0.9);
      ctx.lineTo(fx0 + sway, fy0);
      ctx.stroke();
      if (grow <= 0) {
        // 딴 꽃: 오므린 봉오리
        ctx.fillStyle = '#5ea84a';
        ctx.beginPath();
        ctx.ellipse(fx0 + sway, fy0, sz * 0.32, sz * 0.48, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = col[1];
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.ellipse(fx0 + sway, fy0 - sz * 0.32, sz * 0.18, sz * 0.18, 0, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        continue;
      }
      const pr = sz * (0.4 + 0.6 * grow);
      ctx.fillStyle = col[0];
      ctx.beginPath();
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * TAU + q, px = fx0 + sway + Math.cos(a) * pr * 0.62, py = fy0 + Math.sin(a) * pr * 0.55;
        ctx.moveTo(px + pr * 0.45, py);
        ctx.arc(px, py, pr * 0.45, 0, TAU);
      }
      ctx.fill();
      ctx.fillStyle = col[1];
      ctx.beginPath();
      ctx.arc(fx0 + sway, fy0, pr * 0.32, 0, TAU);
      ctx.fill();
      // 꿀가루 반짝
      if (grow >= 1 && (t + q * 13) % 50 < 18) {
        ctx.fillStyle = 'rgba(255,250,200,.9)';
        ctx.beginPath();
        ctx.arc(fx0 + sway + Math.sin(q + t * 0.1) * pr * 0.5, fy0 - pr * 0.7 - ((t + q * 13) % 50) * 0.4, Math.max(0.8, pr * 0.12), 0, TAU);
        ctx.fill();
      }
    }
  }

  // ── 거미줄 ──
  for (const wb of s.webs) {
    const cx = X(wb.x), cy = Y(wb.y), rr = R(wb.r), strain = wb.ripped ? 0 : wb.stuck / wb.str;
    if (wb.ripped) {
      if (s.st - wb.ripT < 60) {
        ctx.globalAlpha = 1 - (s.st - wb.ripT) / 60;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * TAU, f = 1 + (s.st - wb.ripT) * 0.02;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * rr * f, cy + Math.sin(a) * rr * 0.8 * f);
          ctx.lineTo(cx + Math.cos(a + 0.2) * rr * 0.4 * f, cy + Math.sin(a + 0.2) * rr * 0.3 * f + (s.st - wb.ripT) * 0.5);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      continue;
    }
    // 매단 풀대
    ctx.strokeStyle = '#5b8a3a';
    ctx.lineWidth = R(0.006);
    for (const dd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + dd * rr * 1.15, cy + rr * 0.95);
      ctx.lineTo(cx + dd * rr * 1.08, cy - rr * 0.95);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr, rr * 0.82, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.7 + strain * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU;
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * rr * 1.12, cy + Math.sin(a) * rr * 0.92);
    }
    for (let ring = 1; ring <= 4; ring++) {
      const r2 = (ring / 4) * rr * (1 + strain * 0.08 * Math.sin(t * 0.5));
      for (let k = 0; k <= 10; k++) {
        const a = (k / 10) * TAU, sag = 0.88 + 0.08 * ((k + ring) % 2);
        const px = cx + Math.cos(a) * r2 * sag, py = cy + Math.sin(a) * r2 * 0.82 * sag;
        if (k) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
    }
    ctx.stroke();
    // 이슬 반짝
    ctx.fillStyle = 'rgba(220,245,255,.9)';
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + 0.5;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * rr * 0.7, cy + Math.sin(a) * rr * 0.55, R(0.004), 0, TAU);
      ctx.fill();
    }
    drawSpider(ctx, cx, cy, R(0.022), t, strain > 0.5);
    if (wb.stuck > 0) {
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lbl = `${wb.stuck}/${wb.str}`, tw = ctx.measureText(lbl).width + R(0.03);
      ctx.fillStyle = 'rgba(40,20,50,.8)';
      ctx.beginPath();
      ctx.roundRect(cx - tw / 2, cy - rr - R(0.045), tw, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = strain > 0.6 ? '#ffd84a' : '#ffffff';
      ctx.fillText(lbl, cx, cy - rr - R(0.025));
    }
  }

  // ── 벌집 ──
  drawHive(ctx, s, X(HV.x), Y(HV.y - 0.03), R(0.088), t);
  // 꿀 칸 (벌집 둘레 육각형): 남은 꿀이 한눈에
  {
    const n = s.honey0, cr = R(0.016);
    for (let k = 0; k < n; k++) {
      const a = Math.PI * (0.98 + (k / Math.max(1, n - 1)) * 1.04), rx = X(HV.x) + Math.cos(a) * R(0.14), ry = Y(HV.y + 0.035) + Math.sin(a) * R(0.08) * -1;
      hex(ctx, rx, ry, cr);
      const full = k < s.honey;
      if (full) {
        const g = ctx.createRadialGradient(rx - cr * 0.3, ry - cr * 0.3, 1, rx, ry, cr);
        g.addColorStop(0, '#fff2a8');
        g.addColorStop(1, '#f0a000');
        ctx.fillStyle = g;
      } else ctx.fillStyle = 'rgba(60,40,10,.45)';
      ctx.fill();
      ctx.strokeStyle = full ? '#a86a00' : 'rgba(255,230,160,.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // ── 예고: 가장자리의 '!' ──
  for (let k = s.qi; k < s.queue.length; k++) {
    const q = s.queue[k], left = q.t - s.st;
    if (left > 100) break;
    if (k > s.qi && s.queue[k - 1].grp === q.grp && q.grp) continue;
    const px = X(clamp(q.x, 0.07, 0.93)), py = Y(clamp(q.y, TOP + 0.04, FY1)), pulse = 1 + 0.12 * Math.sin(t * 0.4);
    const r0 = R(0.034) * pulse;
    ctx.fillStyle = 'rgba(255,70,50,.25)';
    ctx.beginPath();
    ctx.arc(px, py, r0 * 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff5a3c';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, r0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // 들어올 방향 화살
    const ax = HV.x - q.x, ay = HV.y - q.y, al = Math.hypot(ax, ay) || 1;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(px + (ax / al) * r0 * 1.9, py + (ay / al) * r0 * 1.9);
    ctx.lineTo(px + (ax / al) * r0 * 1.2 - (ay / al) * r0 * 0.45, py + (ay / al) * r0 * 1.2 + (ax / al) * r0 * 0.45);
    ctx.lineTo(px + (ax / al) * r0 * 1.2 + (ay / al) * r0 * 0.45, py + (ay / al) * r0 * 1.2 - (ax / al) * r0 * 0.45);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.036, 900);
    ctx.fillText(q.k === ANT ? '🐜' : q.k === WASP ? '!' : q.k === BOSS ? '👑' : '🐻', px, py + 1);
    if (q.n > 1) {
      font(0.032, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(80,20,10,.8)';
      ctx.lineWidth = 3;
      ctx.strokeText(`×${q.n}`, px + r0 * 1.5, py - r0);
      ctx.fillText(`×${q.n}`, px + r0 * 1.5, py - r0);
    }
  }

  // ── 그림자 (벌떼) ──
  const nb = s.nb;
  ctx.fillStyle = 'rgba(25,60,15,.2)';
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const st = s.bs[i];
    if (st === STUCK) continue;
    const x = X(s.bx[i]), y = Y(s.by[i]);
    ctx.moveTo(x + R(0.011), y);
    ctx.ellipse(x, y, R(0.011), R(0.005), 0, 0, TAU);
  }
  ctx.fill();

  // ── 적 (뒤에서 앞으로) ──
  const order = s.foes.map((_, k) => k).filter((k) => s.foes[k].st !== GONE && s.foes[k].st !== POP).sort((a, b) => s.foes[a].y - s.foes[b].y);
  for (const k of order) {
    const e = s.foes[k], ex = X(e.x), ey = Y(e.y), dk = dep(e.y), hurt = s.st - e.hurt < 8;
    if (e.k === BEAR || e.k === BOSS) {
      const mood = hurt ? 1 : e.st === EAT ? 2 : e.st === FLEE ? 4 : 0;
      drawBear(ctx, ex, ey - R(e.r * 0.3), R(e.r) * 1.3 * dk, e.hx >= 0 ? 1 : -1, mood, t + k * 17, e.k === BOSS);
    } else if (e.k === ANT) drawAnt(ctx, ex, ey, R(0.021) * dk, Math.atan2(e.hy, e.hx), t + k * 7, e.carry > 0);
    else drawWasp(ctx, ex, ey - R(0.02), R(0.048) * dk, Math.atan2(e.hy, e.hx), t + k * 5, hurt, e.carry > 0);
    // 체력 고리
    if (e.hp < e.max && e.k !== ANT) {
      const rr = R(e.r) * dk * (e.k === WASP ? 1.2 : 1.35) + R(0.012), cy = ey - R(e.r * 0.3);
      ctx.lineWidth = R(0.007);
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.arc(ex, cy, rr, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      ctx.strokeStyle = e.hp / e.max > 0.4 ? '#ffd84a' : '#ff6b4a';
      ctx.beginPath();
      ctx.arc(ex, cy, rr, -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(0, e.hp / e.max));
      ctx.stroke();
    }
    // 꿀 들고 도망
    if (e.st === FLEE && e.carry > 0) {
      font(0.032, 900);
      ctx.textAlign = 'center';
      const lbl = e.carry > 1 ? `꿀 ${e.carry} 돌려줘!` : '꿀 돌려줘!';
      const tw = ctx.measureText(lbl).width + R(0.03), by = ey - R(e.r) * 2.2 - R(0.02);
      ctx.fillStyle = 'rgba(120,40,10,.85)';
      ctx.beginPath();
      ctx.roundRect(ex - tw / 2, by - R(0.02), tw, R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffe08a';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, ex, by);
    }
    // 대장 곰: 붙은 벌 수
    if (e.k === BOSS && e.st !== POP) {
      font(0.034, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let lat = 0;
      for (let i = 0; i < nb; i++) if (s.bs[i] === LATCH && s.foes[s.bt[i]] === e) lat++;
      const lbl = `🐝 ${lat}/${BOSS_MIN}`, tw = ctx.measureText(lbl).width + R(0.03), by = ey - R(e.r) * 2.3;
      ctx.fillStyle = lat >= BOSS_MIN ? 'rgba(200,120,0,.92)' : 'rgba(30,20,10,.75)';
      ctx.beginPath();
      ctx.roundRect(ex - tw / 2, by - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(lbl, ex, by + 1);
    }
  }

  // ── 벌떼: 꼬리 → 몸 → 줄무늬 → 날개 (한 번에 그려 가볍게) ──
  const fever = s.fever > 0;
  {
    // 떼 아래 따뜻한 빛 번짐
    const sw = s.nAct > 0 ? swarm(s) : { x: s.cx, y: s.cy, n: 0 };
    const gr = R(swarmR(s.nAct) * 1.8);
    const g = ctx.createRadialGradient(X(sw.x), Y(sw.y), 2, X(sw.x), Y(sw.y), gr);
    g.addColorStop(0, fever ? 'rgba(255,200,60,.35)' : 'rgba(255,230,120,.22)');
    g.addColorStop(1, 'rgba(255,230,120,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(X(sw.x), Y(sw.y), gr, 0, TAU);
    ctx.fill();
  }
  const lift = (i: number) => (s.bs[i] === LATCH ? R(0.006) : R(0.016 + 0.005 * Math.sin(t * 0.2 + WOB[i])));
  const BR = 0.0145, BRY = 0.0102;
  ctx.lineCap = 'round';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = fever ? 'rgba(255,190,40,.38)' : 'rgba(255,220,110,.3)';
  ctx.lineWidth = R(0.011);
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const vx = s.bvx[i], vy = s.bvy[i];
    if (s.bs[i] === STUCK || vx * vx + vy * vy < 0.000012) continue;
    const x = X(s.bx[i]), y = Y(s.by[i]) - lift(i);
    ctx.moveTo(x, y);
    ctx.lineTo(x - X(vx) * 7, y - Y(vy) * 7);
  }
  ctx.stroke();
  ctx.restore();
  const px: number[] = [], py: number[] = [], ang: number[] = [];
  for (let i = 0; i < nb; i++) {
    const st = s.bs[i];
    let x = X(s.bx[i]), y = Y(s.by[i]) - lift(i);
    if (st === STUCK) (x += Math.sin(t * 0.9 + i) * 1.2), (y += R(0.006));
    px[i] = x;
    py[i] = y;
    ang[i] = st === LATCH ? s.bp[i] + Math.PI / 2 : st === STUCK ? Math.sin(t * 0.7 + i) : Math.atan2(s.bvy[i], s.bvx[i] + 1e-9);
  }
  // 날개 (몸 뒤, 반투명 · 날갯짓)
  ctx.fillStyle = 'rgba(240,250,255,.6)';
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const fl = (t + i) % 4 < 2 ? 1 : 0.55, wsz = R(0.0085) * fl, x = px[i], y = py[i] - R(0.007);
    ctx.moveTo(x - R(0.004) + wsz, y);
    ctx.ellipse(x - R(0.004), y, wsz, wsz * 0.6, -0.5, 0, TAU);
    ctx.moveTo(x + R(0.004) + wsz, y);
    ctx.ellipse(x + R(0.004), y, wsz, wsz * 0.6, 0.5, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = fever ? '#ffe45c' : '#ffcb2b';
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const a = ang[i];
    ctx.moveTo(px[i] + Math.cos(a) * R(BR), py[i] + Math.sin(a) * R(BR));
    ctx.ellipse(px[i], py[i], R(BR), R(BRY), a, 0, TAU);
  }
  ctx.fill();
  ctx.strokeStyle = '#4a2c0c';
  ctx.lineWidth = R(0.0038);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const a = ang[i], c = Math.cos(a), sn = Math.sin(a);
    for (const off of [-0.005, 0.0015]) {
      const bx = px[i] + c * R(off), by = py[i] + sn * R(off), hw = R(BRY) * (off < 0 ? 0.8 : 0.97);
      ctx.moveTo(bx - sn * hw, by + c * hw);
      ctx.lineTo(bx + sn * hw, by - c * hw);
    }
  }
  ctx.stroke();
  // 몸 위 반짝 (작은 흰 점)
  ctx.fillStyle = 'rgba(255,255,230,.85)';
  ctx.beginPath();
  for (let i = 0; i < nb; i++) {
    const a = ang[i], hx2 = px[i] + Math.cos(a) * R(0.007), hy2 = py[i] + Math.sin(a) * R(0.007) - R(0.003);
    ctx.moveTo(hx2 + R(0.0028), hy2);
    ctx.arc(hx2, hy2, R(0.0028), 0, TAU);
  }
  ctx.fill();
  // 어질어질한 벌 위 별
  ctx.fillStyle = '#e8f0ff';
  for (let i = 0; i < nb; i += 3) {
    if (s.bs[i] !== DAZE) continue;
    const x = X(s.bx[i]) + Math.cos(t * 0.3 + i) * R(0.01), y = Y(s.by[i]) - R(0.03) + Math.sin(t * 0.3 + i) * R(0.004);
    star5(ctx, x, y, R(0.006));
    ctx.fill();
  }

  // ── 대장벌 ──
  {
    const dazed = s.nAll > 0 && s.nAll - s.nAct > s.nAll * 0.3;
    const mood = dazed ? 3 : s.mood;
    const face = s.lx < s.cx - 0.01 ? -1 : s.lx > s.cx + 0.01 ? 1 : (fx.memo.face ?? 1);
    fx.memo.face = face;
    const cx = X(s.cx), cy = Y(s.cy) - R(0.05) + Math.sin(t * 0.15) * R(0.006);
    ctx.fillStyle = 'rgba(25,60,15,.25)';
    ctx.beginPath();
    ctx.ellipse(X(s.cx), Y(s.cy) + R(0.01), R(0.03), R(0.011), 0, 0, TAU);
    ctx.fill();
    drawCaptain(ctx, cx, cy, R(0.03), face, mood, t, fever);
    // 누르는 동안 손가락 자리 고리
    if (s.held) {
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -t * 0.6;
      ctx.beginPath();
      ctx.arc(X(s.lx), Y(s.ly), R(0.04), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // ── 연기 구름 ──
  for (const m of s.smokes) {
    ctx.fillStyle = 'rgba(40,40,40,.16)';
    ctx.beginPath();
    ctx.ellipse(X(m.x), Y(m.y) + R(0.02), R(m.r), R(m.r * 0.5), 0, 0, TAU);
    ctx.fill();
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + m.age * 0.012, rr = k === 6 ? 0 : m.r * 0.5, px = X(m.x + Math.cos(a) * rr), py = Y(m.y + Math.sin(a) * rr * 0.7) - R(0.03), pr = R(m.r * (k === 6 ? 0.75 : 0.58) * (1 + 0.08 * Math.sin(m.age * 0.05 + k)));
      const g = ctx.createRadialGradient(px - pr * 0.35, py - pr * 0.35, 1, px, py, pr);
      g.addColorStop(0, 'rgba(255,255,252,.95)');
      g.addColorStop(0.6, 'rgba(215,215,210,.8)');
      g.addColorStop(1, 'rgba(170,170,165,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, TAU);
      ctx.fill();
    }
  }
  // ── 바람 줄기 ──
  if (d.wind) {
    const P = 330, ph = s.st % P, dir = s.windDir * (Math.floor(s.st / P) % 2 ? -1 : 1), str = Math.abs(s.wind) / d.wind;
    if (ph >= 50 && ph < 110) {
      // 곧 분다: 가장자리 깃발
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lbl = dir > 0 ? '바람이 와요 →' : '← 바람이 와요', tw = ctx.measureText(lbl).width + R(0.04);
      ctx.fillStyle = 'rgba(30,70,110,.82)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, Y(0.33), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#e8f6ff';
      ctx.fillText(lbl, w / 2, Y(0.356));
    }
    if (str > 0.05) {
      ctx.strokeStyle = `rgba(255,255,255,${0.35 * str})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let k = 0; k < 14; k++) {
        const yy = Y(0.32 + hsh(k * 3.3) * 0.95), sp = 6 + hsh(k) * 5, x0 = (((t * sp + hsh(k * 9) * w * 3) % (w * 1.4)) - w * 0.2) * dir + (dir < 0 ? w : 0), len = R(0.08 + hsh(k * 2) * 0.06) * dir;
        ctx.moveTo(x0, yy);
        ctx.quadraticCurveTo(x0 + len * 0.5, yy - R(0.012), x0 + len, yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#8fd05a';
      for (let k = 0; k < 6; k++) {
        const yy = Y(0.35 + hsh(k * 7.1) * 0.9) + Math.sin(t * 0.1 + k) * R(0.02), x0 = (((t * (5 + k) + hsh(k) * w * 2) % (w * 1.3)) - w * 0.15) * dir + (dir < 0 ? w : 0);
        ctx.save();
        ctx.translate(x0, yy);
        ctx.rotate(t * 0.15 + k);
        ctx.globalAlpha = str;
        ctx.beginPath();
        ctx.ellipse(0, 0, R(0.012), R(0.005), 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  }

  // ── 퐁! 날아가는 적 ──
  for (const e of s.foes) {
    if (e.st !== POP) continue;
    const age = s.st - e.popT, rot = e.spin * age * 0.25, ex = X(e.x), ey = Y(e.y);
    // 카메라 쪽으로 튀어 오르며(점점 커짐) 빙글빙글, 끝에 흐려진다
    const grow = 1 + Math.min(age, 50) * 0.018;
    ctx.globalAlpha = Math.max(0, Math.min(1, (80 - age) / 25));
    if (e.k === BEAR || e.k === BOSS) drawBear(ctx, ex, ey, R(e.r) * 1.3 * grow, e.spin, 3, t, e.k === BOSS, rot);
    else if (e.k === ANT) drawAnt(ctx, ex, ey, R(0.021) * grow, rot, t, false);
    else drawWasp(ctx, ex, ey, R(0.048) * grow, rot, t, true, false);
    ctx.globalAlpha = 1;
    if (age % 6 < 3) {
      ctx.fillStyle = '#fff6b0';
      star5(ctx, ex + Math.cos(age) * R(0.04), ey - R(0.04), R(0.01));
      ctx.fill();
    }
  }

  // ── 덤불 속 토끼 ──
  {
    const mood = s.t - s.stolenT < 70 ? 2 : s.t - s.cheerT < 50 ? 1 : 0;
    const rx = s.flip ? 0.9 : 0.1;
    drawRabbit(ctx, X(rx), Y(1.29), R(0.058), mood, t);
  }
  // 앞쪽 풀 (깊이감)
  ctx.fillStyle = '#3d8a33';
  ctx.beginPath();
  for (let k = 0; k < 30; k++) {
    const x = (k / 29) * w, hh = R(0.02 + hsh(k * 4.4) * 0.025), sw2 = Math.sin(t * 0.03 + k) * R(0.004);
    ctx.moveTo(x - R(0.012), Y(1.345));
    ctx.quadraticCurveTo(x + sw2, Y(1.345) - hh * 0.6, x + sw2 * 2, Y(1.345) - hh);
    ctx.quadraticCurveTo(x + R(0.004), Y(1.345) - hh * 0.5, x + R(0.012), Y(1.345));
  }
  ctx.fill();

  // ── 처음: 손가락 안내 ──
  const first = s.stage === 0 && s.firstTouch < 0 && s.phase === 'play';
  if (first) {
    const path = [[HOME.x, HOME.y - 0.03], [0.5, 0.86], [0.5, 0.56]];
    const cyc = (t % 150) / 150, seg = cyc < 0.5 ? 0 : 1, u2 = (cyc < 0.5 ? cyc : cyc - 0.5) * 2;
    const hx = X(path[seg][0] + (path[seg + 1][0] - path[seg][0]) * u2), hy = Y(path[seg][1] + (path[seg + 1][1] - path[seg][1]) * u2);
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    ctx.lineWidth = 3;
    ctx.setLineDash([2, 7]);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(X(path[0][0]), Y(path[0][1]));
    ctx.lineTo(X(path[1][0]), Y(path[1][1]));
    ctx.lineTo(X(path[2][0]), Y(path[2][1]));
    ctx.stroke();
    ctx.setLineDash([]);
    // 손 (장갑 낀 손가락)
    ctx.save();
    ctx.translate(hx + R(0.02), hy + R(0.035));
    ctx.rotate(-0.35);
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3a2a10';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-R(0.012), -R(0.06), R(0.026), R(0.07), R(0.013));
    ctx.roundRect(-R(0.032), -R(0.005), R(0.068), R(0.06), R(0.02));
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hx, hy, R(0.022) + (t % 30) * 0.5, 0, TAU);
    ctx.stroke();
  }

  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  let flowerN = 0, fx0 = 0, fy0 = 0;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    switch (e.kind) {
      case 'flower':
        fx.burst(x, y, PETAL[(e.n ?? 0) % 3][0], 5, 2.2, 2);
        fx.burst(x, y, '#fff7c0', 3, 1.6, 1.6);
        flowerN += PER_FLOWER;
        (fx0 = x), (fy0 = y);
        break;
      case 'sting':
        fx.burst(x, y, '#ffffff', 5, 1.8, 1.6);
        break;
      case 'surround':
        fx.ring(x, y, '#ffd84a', R(0.1), 4);
        say(x, y - R(0.03), e.text!, '#ffe066', 15);
        break;
      case 'repel': {
        const k = e.n ?? 0, big = k === BOSS ? 3 : k === BEAR ? 1.6 : k === WASP ? 1.2 : 0.6;
        const cb = Math.min(2, 1 + Math.max(0, s.combo - 1) * 0.12);
        fx.burst(x, y, '#ffe066', Math.round(16 * big * cb), 3.5 * big, 2.6);
        fx.burst(x, y, '#ffffff', Math.round(10 * big), 2.8 * big, 2.2);
        if (k !== ANT) fx.burst(x, y, k === WASP ? '#ffcf3a' : '#a8703f', 10, 3, 2.4);
        fx.ring(x, y, '#ffffff', R(0.06 * big + 0.03), 3 + big);
        fx.kick(k === BOSS ? 14 : k === BEAR ? 7 : k === WASP ? 5 : 1.8 * cb);
        if (k === BOSS) fx.blink('#fff6c8', 0.45);
        if (k !== ANT || cb >= 1.5) (fx.memo.punchT = t), (fx.memo.punchX = x), (fx.memo.punchY = y), (fx.memo.punchZ = k === BOSS ? 0.08 : k === BEAR ? 0.045 : 0.03);
        if (k === BEAR || k === BOSS) {
          fx.ring(x, y, '#ffe066', R(0.16 * big), 6);
          for (let q = 0; q < 6; q++) fx.burst(x, y, q % 2 ? '#fff6b0' : '#ffd84a', 2, 6 * big, 3.4);
        }
        say(x, y - R(0.05), e.text!, k === BOSS ? '#ffe066' : '#ffffff', Math.round((k === BOSS ? 30 : k === ANT ? 15 : 21) * cb));
        break;
      }
      case 'combo':
        say(x, y - R(0.03), e.text!, (e.n ?? 0) >= 8 ? '#ff9f40' : '#ffe066', Math.min(30, 14 + (e.n ?? 3) * 1.6));
        if ((e.n ?? 0) >= 8) fx.ring(x, y, '#ff9f40', R(0.16), 5);
        break;
      case 'fever':
        fx.ring(x, y, '#ffcf3a', R(0.3), 7);
        fx.burst(x, y, '#ffcf3a', 30, 5, 3);
        fx.blink('#ffe9a0', 0.25);
        fx.kick(6);
        say(w / 2, Y(0.6), e.text!, '#ffcf3a', 24);
        break;
      case 'steal':
        fx.burst(x, y, '#ffb21e', 12, 2.6, 2.6);
        fx.kick(4);
        fx.blink('#ff7a50', 0.12);
        say(x, y - R(0.06), e.text!, '#ffb3a0', 16);
        break;
      case 'back':
        fx.burst(x, y, '#ffd84a', 18, 3.2, 2.6);
        fx.ring(x, y, '#ffd84a', R(0.07), 3);
        say(x, y - R(0.06), e.text!, '#ffe066', 16);
        break;
      case 'arrive':
        say(x, y - R(0.07), e.text!, '#ffd0c0', 14);
        break;
      case 'tink':
        fx.burst(x, y, '#e6f4ff', 6, 2.4, 1.6);
        say(x, y - R(0.02), e.text!, '#dff2ff', 13);
        break;
      case 'stuck':
        say(x, y - R(0.03), e.text!, '#f0e6ff', 13);
        break;
      case 'rip':
        fx.burst(x, y, '#ffffff', 34, 4.8, 2.2);
        fx.ring(x, y, '#ffffff', R(0.14), 5);
        fx.kick(7);
        say(x, y - R(0.05), e.text!, '#ffffff', 20);
        break;
      case 'daze':
        fx.burst(x, y, '#d8d8d0', 3, 1.2, 2);
        say(x, y - R(0.02), e.text!, '#eeeeee', 12);
        break;
      case 'tickle':
        say(x, y - R(0.04), e.text!, '#ffe0c0', 14);
        break;
      case 'gust':
        fx.burst(x, y, '#9fe07a', 14, 4, 2.4);
        break;
      case 'clear':
        fx.burst(w * 0.25, Y(0.7), '#ffe066', 40, 6, 3);
        fx.burst(w * 0.75, Y(0.7), '#ff9ec4', 40, 6, 3);
        fx.burst(w * 0.5, Y(0.85), '#ffffff', 36, 6, 3);
        fx.ring(w / 2, Y(0.75), '#ffe066', R(0.5), 7);
        fx.blink('#fff6c8', 0.22);
        break;
      case 'fail':
        fx.kick(6);
        fx.blink('#ffd0a0', 0.14);
        break;
    }
  }
  if (flowerN) {
    // 꽃 여러 송이를 한 번에 따면 한 글자로 묶어 크게
    fx.ring(fx0, fy0, '#fff3a0', R(0.05), 2);
    const acc = (fx.memo.fl ?? 0) * (t - (fx.memo.flT ?? -99) < 14 ? 1 : 0) + flowerN;
    fx.memo.fl = acc;
    if (t - (fx.memo.flT ?? -99) >= 10) {
      say(X(s.cx), Y(s.cy) - R(0.11), `벌 +${acc}`, '#fff3a0', Math.min(26, 14 + acc * 0.25));
      fx.memo.flT = t;
      fx.memo.fl = 0;
    }
  }
  fx.memo.t = s.t;
  ctx.restore();

  // ═════════════ HUD: 위 ═════════════
  const pill = (x: number, y: number, ww: number, hh: number, fill: string, stroke?: string) => {
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.beginPath();
    ctx.roundRect(x, y + 2, ww, hh, hh / 2);
    ctx.fill();
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
  {
    const y0 = R(0.018), hh = R(0.066);
    ctx.textBaseline = 'middle';
    // 판
    pill(R(0.02), y0, R(0.31), hh, 'rgba(38,64,30,.88)', 'rgba(255,240,180,.35)');
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd84a';
    font(0.04, 900);
    const st1 = `${s.stage + 1}`;
    ctx.fillText(st1, R(0.045), y0 + hh * 0.53);
    const sw1 = ctx.measureText(st1).width;
    ctx.fillStyle = '#e9f5c9';
    font(0.036, 800);
    ctx.fillText(`/${STAGE_COUNT} ${d.name}`, R(0.045) + sw1 + 2, y0 + hh * 0.55, R(0.25) - sw1);
    // 꿀 단지 + 막대
    const hx0 = R(0.345), hw = R(0.3);
    pill(hx0, y0, hw, hh, 'rgba(38,64,30,.88)', s.t - s.stolenT < 30 ? '#ff6b4a' : 'rgba(255,240,180,.35)');
    {
      const jx = hx0 + R(0.032), jy = y0 + hh * 0.52, jr = R(0.02);
      const jg = ctx.createLinearGradient(jx - jr, 0, jx + jr, 0);
      jg.addColorStop(0, '#c97c10');
      jg.addColorStop(0.5, '#ffd24a');
      jg.addColorStop(1, '#c97c10');
      ctx.fillStyle = jg;
      ctx.beginPath();
      ctx.ellipse(jx, jy + jr * 0.15, jr, jr * 0.95, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#7a4a1a';
      ctx.fillRect(jx - jr * 0.6, jy - jr * 1.05, jr * 1.2, jr * 0.4);
      const bx = hx0 + R(0.062), bw = R(0.14), by = jy - R(0.011), bh = R(0.022);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh / 2);
      ctx.fill();
      const fr = s.honey / Math.max(1, s.honey0);
      const bgr = ctx.createLinearGradient(0, by, 0, by + bh);
      bgr.addColorStop(0, '#ffe680');
      bgr.addColorStop(1, fr < 0.35 ? '#ff6b4a' : '#f0a000');
      ctx.fillStyle = bgr;
      ctx.beginPath();
      ctx.roundRect(bx, by, Math.max(bh, bw * fr), bh, bh / 2);
      ctx.fill();
      ctx.fillStyle = fr < 0.35 ? '#ffb3a0' : '#fff3c4';
      font(0.038, 900);
      ctx.textAlign = 'left';
      ctx.fillText(`${s.honey}`, bx + bw + R(0.012), jy + 1);
    }
    // 하트
    for (let k = 0; k < 3; k++) {
      const hx = R(0.69) + k * R(0.052), hy = y0 + hh * 0.5;
      heart(ctx, hx, hy, R(0.019));
      ctx.fillStyle = k < s.hearts ? '#ff5a6e' : 'rgba(0,0,0,.3)';
      ctx.fill();
      ctx.strokeStyle = k < s.hearts ? '#ffffff' : 'rgba(255,255,255,.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    // 별
    pill(R(0.84), y0, R(0.14), hh, 'rgba(38,64,30,.88)', 'rgba(255,240,180,.35)');
    star5(ctx, R(0.87), y0 + hh * 0.5, R(0.018));
    ctx.fillStyle = '#ffd84a';
    ctx.fill();
    ctx.textAlign = 'left';
    font(0.038, 900);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${s.stars}`, R(0.895), y0 + hh * 0.54);
  }
  // 알림 띠 (새것) 또는 안내 한 줄 — 하늘 아래
  {
    let text = '', col = 'rgba(38,64,30,.9)', ink = '#ffffff', a = 1;
    if (s.news && s.t - s.news.t < NEWS_T) {
      const age = s.t - s.news.t;
      a = Math.min(1, age / 8, (NEWS_T - age) / 16);
      text = s.news.text;
      col = 'rgba(120,70,10,.92)';
      ink = '#fff3c4';
    } else if (s.phase === 'play' && s.pt > CARD_T) {
      if (first) text = '👆 누른 채 끌면 벌떼가 따라와요';
      else if (s.stage === 0 && s.kills === 0) text = '손을 떼면 그 자리에 공처럼 뭉쳐요';
      else text = d.hint;
    } else if (first) text = '👆 누른 채 끌면 벌떼가 따라와요';
    if (text) {
      ctx.globalAlpha = a;
      font(first ? 0.042 : 0.037, 900);
      ctx.textAlign = 'center';
      const tw = Math.min(w - R(0.04), ctx.measureText(text).width + R(0.06)), hh = R(first ? 0.064 : 0.056), cy = Y(0.128);
      pill(w / 2 - tw / 2, cy - hh / 2, tw, hh, col, first ? '#ffd84a' : 'rgba(255,240,180,.4)');
      ctx.fillStyle = ink;
      ctx.fillText(text, w / 2, cy + 1, w - R(0.08));
      ctx.globalAlpha = 1;
    }
  }

  // 판 카드 · NEW 스포트라이트 · 결과
  {
    if (s.phase === 'play' && s.pt < CARD_T && d.spot && s.pt < 110) {
      // 스포트라이트: 새것 자리만 밝게
      const [sx0, sy0, sr0] = d.spot, sxx = X(s.flip ? 1 - sx0 : sx0), syy = Y(sy0), a = Math.min(1, s.pt / 10, (110 - s.pt) / 20) * 0.5;
      ctx.save();
      ctx.fillStyle = `rgba(10,20,10,${a})`;
      ctx.beginPath();
      ctx.rect(0, Y(0.1), w, Y(1.335 - 0.1));
      ctx.arc(sxx, syy, R(sr0) * (1.15 + 0.06 * Math.sin(t * 0.25)), 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = `rgba(255,216,74,${a * 2})`;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -t;
      ctx.beginPath();
      ctx.arc(sxx, syy, R(sr0) * (1.15 + 0.06 * Math.sin(t * 0.25)), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 6);
      if (s.ok) (head = s.won ? '숲이 평화로워졌어요!' : '벌집을 지켰어요!'), (sub = `쫓아낸 녀석 ${s.stageKills} · 남은 꿀 ${s.honey}`), (col = '#ffd84a');
      else (head = s.why || '꿀을 다 뺏겼어요…'), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 벌들이 고마워해요!'), (col = '#ffb3a0');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 18);
      head = s.again ? `다시! ${s.stage + 1}판 · ${d.name}` : `${s.stage + 1}판 · ${d.name}`;
      sub = `꿀 ${d.honey}개를 지켜요`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 10), cyy = Y(s.phase === 'result' ? 0.62 : 0.5), wide = R(0.86), hh = R(nw ? 0.2 : s.phase === 'result' ? 0.2 : 0.13);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.roundRect(-wide / 2, -hh / 2 + 4, wide, hh, R(0.045));
      ctx.fill();
      const cg = ctx.createLinearGradient(0, -hh / 2, 0, hh / 2);
      cg.addColorStop(0, 'rgba(70,104,52,.97)');
      cg.addColorStop(1, 'rgba(38,64,30,.97)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.roundRect(-wide / 2, -hh / 2, wide, hh, R(0.045));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.056, 900);
      const top = -hh / 2 + R(0.045);
      ctx.fillText(head, 0, top, wide - R(0.06));
      ctx.fillStyle = '#fffaf0';
      font(0.037, 800);
      ctx.fillText(sub, 0, top + R(0.05), wide - R(0.06));
      if (s.phase === 'result' && s.ok) {
        const nst = s.stage >= 2 ? 3 : s.stage + 1;
        for (let k = 0; k < nst; k++) {
          const ag = s.pt - (12 + k * 12);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = (k - (nst - 1) / 2) * R(0.09), sy = top + R(0.11);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.scale(pop, pop);
          star5(ctx, 0, 0, R(0.03));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy + sy, '#ffe066', 18, 3.4, 2.4), fx.kick(k === 2 ? 3 : 1.5);
        }
      }
      if (nw) {
        const ny = top + R(0.112);
        font(0.03, 900);
        const nwW = ctx.measureText('NEW').width + R(0.025);
        font(0.039, 900);
        const tw = ctx.measureText(nw).width, x0 = -(nwW + R(0.015) + tw) / 2;
        ctx.fillStyle = '#ff5a3c';
        ctx.beginPath();
        ctx.roundRect(x0, ny - R(0.022), nwW, R(0.044), R(0.012));
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        font(0.03, 900);
        ctx.fillText('NEW', x0 + nwW / 2, ny + 1);
        ctx.fillStyle = '#ffe9a8';
        font(0.039, 900);
        ctx.textAlign = 'left';
        ctx.fillText(nw, x0 + nwW + R(0.015), ny + 1, wide - nwW - R(0.08));
      }
      ctx.restore();
    }
  }

  // ═════════════ HUD: 아래 (별 조건 · 벌 수) ═════════════
  {
    const ty = 1.338, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(58,40,20,.97)');
    g.addColorStop(1, 'rgba(36,24,12,.99)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.035), R(0.035), 0, 0]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,220,140,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(R(0.035), Y(ty) + 1);
    ctx.lineTo(w - R(0.035), Y(ty) + 1);
    ctx.stroke();
    // 별 조건 (쉬운 말 한 줄씩)
    const c3 = d.star3;
    const lines: { text: string; ok: boolean; bad: boolean; prog?: string }[] = [];
    const playing = s.phase === 'play';
    lines.push({ text: '벌집 지키기', ok: s.phase === 'result' && s.ok, bad: s.phase === 'result' && !s.ok });
    if (s.stage >= 1) lines.push({ text: '꿀 하나도 안 뺏기기', ok: s.phase === 'result' && s.ok && s.starOk[1], bad: s.stolen > 0 });
    if (s.stage >= 2 && c3) {
      let ok = false, bad = false, prog: string | undefined;
      if (c3.kind === 'combo') (ok = s.burst >= c3.n), (prog = ok ? undefined : `최고 ${s.burst}`);
      else if (c3.kind === 'grow') (ok = s.maxN >= c3.n), (prog = ok ? undefined : `지금 ${s.nAll}`);
      else if (c3.kind === 'rip') {
        const r = s.webs.filter((x) => x.ripped).length;
        (ok = r === s.webs.length), (prog = ok ? undefined : `${r}/${s.webs.length}`);
      } else (bad = s.bossReached), (ok = !playing && s.ok && !bad);
      lines.push({ text: c3.text, ok, bad, prog });
    }
    const lh = R(0.058), y1 = Y(ty) + R(0.045);
    lines.forEach((ln, k) => {
      const yy = y1 + k * lh;
      star5(ctx, R(0.05), yy, R(0.02));
      ctx.fillStyle = ln.ok ? '#ffd43b' : ln.bad ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.18)';
      ctx.fill();
      ctx.strokeStyle = ln.ok ? '#fff3b0' : ln.bad ? 'rgba(255,255,255,.25)' : 'rgba(255,230,160,.8)';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      font(0.038, 800);
      ctx.fillStyle = ln.ok ? '#ffe9a0' : ln.bad ? 'rgba(255,255,255,.38)' : '#fff6e6';
      ctx.fillText(ln.text, R(0.085), yy + 1, R(0.5));
      const tw = Math.min(R(0.5), ctx.measureText(ln.text).width);
      if (ln.bad) {
        ctx.strokeStyle = 'rgba(255,140,120,.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(R(0.085), yy + 1);
        ctx.lineTo(R(0.085) + tw, yy + 1);
        ctx.stroke();
      } else if (ln.prog) {
        font(0.032, 800);
        ctx.fillStyle = 'rgba(255,230,160,.75)';
        ctx.fillText(ln.prog, R(0.095) + tw, yy + 1);
      }
    });
    // 벌 수 배지
    const bx = R(0.72), byy = Y(ty) + R(0.03), bw = R(0.255), bh = R(0.16);
    ctx.fillStyle = fever ? 'rgba(255,170,0,.3)' : 'rgba(255,220,120,.12)';
    ctx.beginPath();
    ctx.roundRect(bx, byy, bw, bh, R(0.03));
    ctx.fill();
    ctx.strokeStyle = fever ? '#ffcf3a' : 'rgba(255,220,140,.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawCaptain(ctx, bx + R(0.055), byy + R(0.07), R(0.022), 1, s.mood === 2 ? 2 : 0, t, fever);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const bump = fx.delta('nb', s.nAll) > 0 ? 1 : 0;
    if (bump) fx.memo.bumpT = t;
    const bs = 1 + Math.max(0, 8 - (t - (fx.memo.bumpT ?? -99))) * 0.04;
    ctx.save();
    ctx.translate(bx + bw * 0.66, byy + R(0.068));
    ctx.scale(bs, bs);
    font(0.068, 900);
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(`${s.nAll}`, 0, 0);
    ctx.restore();
    font(0.032, 800);
    ctx.fillStyle = '#ffe9c0';
    ctx.fillText(fever ? '피버!' : '마리', bx + bw * 0.66, byy + R(0.125));
  }
}
