/**
 * 우산 튕기기 꼬마 vs 구름 거인 (33라운드: 서로 다른 뼈대 — 보스 대결) — 받아치기 × 가리키기 × 콤보.
 * 기준 9(손이 하는 일은 하나): 누르는 동안 꼬마가 손가락 쪽으로 우산을 펴 든다. 날아온 것이 우산에 닿는 바로 그 순간 떼면 '탁!' —
 *   우산 방향(손가락 방향)으로 받아쳐 거인 얼굴에 철썩. 키보드는 화살표로 커서 + 스페이스(누르는 동안 우산).
 * 규칙(결정적, 3줄): 우산에 닿기 직전·닿은 직후(우산이 눌린 동안)에 떼면 받아치기. 너무 일찍 떼면 우산이 접혀 젖고(두 칸),
 *   계속 들고 있으면 막기만(우산 한 칸이 젖음). 우산이 다 젖으면 하트 -1(그 판 다시). 받아친 것이 거인에 맞으면 연속 +1 —
 *   우산 살에 무지개가 한 칸씩 차고, 다섯 칸이면 다음 받아치기가 무지개 한 방. 막거나·맞거나·빗나가면 연속이 끊긴다.
 * 와우: 하품하던 구름 거인이 첫 꾹에 볼을 부풀려 물방울을 퉤 — 떼는 순간 '탁!' 번쩍·멈칫, 물방울이 코에 철썩 '에, 에취!' 구름이 펑 흩어진다.
 * 판 6개(뼈대: 일대일 보스 대결): 목표 = 판마다 다른 구름 거인의 체력을 0으로. 별 = 1판 하나, 판마다 하나씩(쉬운 한 줄).
 * 펼쳐짐(하는 일이 바뀐다): 1판 빗구름(받아치기 · 코는 두 배) → 2판 우박 구름(무겁고 빠름 — 받아치면 두 배지만 빠듯, 이제 손가락 쪽으로 날아감)
 *   → 3판 눈구름(눈송이가 흔들리며 셋씩 — 우산 각도 맞추기 · 한꺼번에 받아치기) → 4판 번개 구름(번쩍하면 우산을 접어야 — 아니면 번개 거인 맞혀 취소)
 *   → 5판 쌍둥이 구름(던진 쪽은 숨고 볼 부푼 쪽이 드러남 — 반대쪽으로 돌려보내기) → 6판 무지개 대왕(후~ 바람 — 받아친 것이 휜다).
 * 웃음: 맞은 꼬마는 흠뻑 젖어 강아지처럼 부르르 털고, 번개 맞은 우산은 까맣게 그을려 머리가 부스스.
 *   코를 맞은 거인은 '에, 에취!' 재채기로 구름이 펑 흩어졌다 다시 모이고, 볼이 부푼 거인을 맞히면 바람이 '푸슈~' 빠진다. 구름 섬 참새가 큰 순간마다 짹짹 뛴다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.52;
/** 우산 손잡이(꼬마 손) — 받아치기의 중심 · 꼬마 발 */
const PX = 0.5, PY = 1.0, KY = 1.222;
/** 우산 반지름 · 우산이 덮는 반각 · 닿기 직전 받아칠 수 있는 거리 */
const UR = 0.118, HALF = 1.2, REACH = 0.055;
/** 우산 펴는 시간 · 펴고 이만큼은 들고 있어야 닿기 전 받아치기 · 헛손질하면 접히는 시간 · 받아친 뒤 쉬는 시간 */
const OPEN_T = 4, OPEN_MIN = 3, WHIFF_LOCK = 14, PARRY_REC = 3;
/** 받아치기 연출: 멈칫 · 잠깐 느려짐 (받아치는 순간에만) */
const FREEZE = 4, SLOW_T = 14, SLOW_DT = 0.4;
/** 받아친 것의 속도 · 무지개 한 방 속도 · 무지개 칸 · '딱 맞춤' 틱 */
const VR = 0.032, VR_RB = 0.046, RB_MAX = 5, PERF = 3;
const ANG_MIN = -Math.PI + 0.3, ANG_MAX = -0.3;
const RESULT_OK = 200, RESULT_FAIL = 160, CARD_T = 150, NEWS_T = 150, KO_T = 80, ENTER = 60;
const CLEAR_PTS = 100, STAR_PTS = 150, WIN_PTS = 300, HIT_PTS = 5;

type PK = 'rain' | 'hail' | 'snow';
const PR: Record<PK, number> = { rain: 0.026, hail: 0.025, snow: 0.028 };
const SP: Record<PK, number> = { rain: 0.0105, hail: 0.0185, snow: 0.0078 };
const STK: Record<PK, number> = { rain: 7, hail: 5, snow: 8 };
const DMG: Record<PK, number> = { rain: 1, hail: 2, snow: 1 };
const BLOCK: Record<PK, number> = { rain: 1, hail: 2, snow: 1 };
const HIT: Record<PK, number> = { rain: 2, hail: 3, snow: 2 };
const ZAP = 3, RB_DMG = 6;
const P_NAME: Record<PK, string> = { rain: '물방울', hail: '우박', snow: '눈송이' };

type AK = PK | 'bolt' | 'gust';
interface Atk { k: AK; n?: number; gap?: number }
const PUFF: Record<AK, number> = { rain: 30, hail: 38, snow: 30, bolt: 64, gust: 46 };

type StarK = 'win' | 'dry' | 'streak' | 'nose' | 'nozap' | 'rainbow' | 'pop' | 'half' | 'multi';
interface Star { k: StarK; n: number; label: string }
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });

interface GSpec { look: number; x: number; y: number; amp: number; fq: number; hp: number; sz: number; plan: Atk[] }
interface StageDef {
  key: string; name: string; who: string; news: string; hint: string; goal: string;
  umb: number; stick: number; assist: number; rest: [number, number]; giants: GSpec[]; stars: Star[];
  /** 우산이 덮는 반각 (배우는 판은 넓게) */
  half?: number;
}
const R1: Atk = { k: 'rain' }, R2: Atk = { k: 'rain', n: 2, gap: 30 }, H1: Atk = { k: 'hail' }, B1: Atk = { k: 'bolt' }, G1: Atk = { k: 'gust' };
const SN3: Atk = { k: 'snow', n: 3, gap: 16 }, SN3T: Atk = { k: 'snow', n: 3, gap: 8 };

/** 판 6개. look: 0 빗구름 · 1 우박 · 2 눈 · 3 번개 · 4 쌍둥이 왼 · 5 쌍둥이 오른 · 6 무지개 대왕 */
export const STAGES: StageDef[] = [
  {
    key: 'rain', name: '빗구름', who: '빗구름 거인', news: '', goal: '거인 이기기', hint: '닿는 순간 떼면 탁! — 코에 맞으면 두 배',
    umb: 10, stick: 7, assist: 9, rest: [80, 110], half: 1.6,
    giants: [{ look: 0, x: 0.5, y: 0.4, amp: 0.05, fq: 0.011, hp: 5, sz: 1.12, plan: [R1] }],
    stars: [S('win', 0, '거인 이기기')],
  },
  {
    key: 'hail', name: '우박 구름', who: '우박 구름 거인', news: '우박 — 무겁고 빨라요. 받아치면 두 배!', goal: '거인 이기기', hint: '이제 손가락 쪽으로 날아가요 — 코를 노려요',
    umb: 10, stick: 5, assist: 0.9, rest: [60, 90], half: 1.6,
    giants: [{ look: 1, x: 0.5, y: 0.4, amp: 0.1, fq: 0.012, hp: 6, sz: 1.05, plan: [R1, H1, R1, R1, R2, H1] }],
    stars: [S('win', 0, '거인 이기기'), S('dry', 0, '한 번도 안 젖기')],
  },
  {
    key: 'snow', name: '눈구름', who: '눈구름 거인', news: '눈송이 — 흔들흔들 셋씩 와요', goal: '거인 이기기', hint: '붙어 오는 눈송이는 한 번에 같이 탁!',
    umb: 9, stick: 1.2, assist: 0.06, rest: [55, 85],
    giants: [{ look: 2, x: 0.5, y: 0.4, amp: 0.16, fq: 0.013, hp: 20, sz: 1.05, plan: [SN3, R1, SN3T, H1, R2, SN3T] }],
    stars: [S('win', 0, '이기기'), S('streak', 5, '연속 다섯 번'), S('multi', 2, '눈송이 둘 한 번에')],
  },
  {
    key: 'bolt', name: '번개 구름', who: '번개 구름 거인', news: '번개 — 번쩍하면 우산을 접어요!', goal: '거인 이기기', hint: '번쩍일 때 거인을 맞히면 번개가 꺼져요',
    umb: 9, stick: 1.2, assist: 0.06, rest: [55, 85],
    giants: [{ look: 3, x: 0.5, y: 0.4, amp: 0.16, fq: 0.014, hp: 22, sz: 1.05, plan: [R1, B1, R2, H1, B1, R1, SN3T] }],
    stars: [S('win', 0, '이기기'), S('nozap', 0, '번개 안 맞기'), S('rainbow', 1, '무지개 한 방')],
  },
  {
    key: 'twin', name: '쌍둥이 구름', who: '쌍둥이 구름', news: '쌍둥이 — 던진 쪽은 숨어요. 반대쪽으로!', goal: '쌍둥이 이기기', hint: '볼이 부푼 쪽을 맞히면 바람이 푸슈~',
    umb: 9, stick: 1.2, assist: 0, rest: [40, 60],
    giants: [
      { look: 4, x: 0.25, y: 0.4, amp: 0.05, fq: 0.015, hp: 10, sz: 0.74, plan: [R1, H1, R1, SN3T] },
      { look: 5, x: 0.75, y: 0.4, amp: 0.05, fq: 0.015, hp: 10, sz: 0.74, plan: [R1, R1, H1, SN3T] },
    ],
    stars: [S('win', 0, '이기기'), S('pop', 3, '부푼 볼 세 번 맞히기'), S('dry', 0, '안 젖기')],
  },
  {
    key: 'king', name: '무지개 대왕', who: '무지개 대왕', news: '바람 — 후~ 불면 받아친 게 휘어요', goal: '대왕 이기기', hint: '바람 반대쪽으로 살짝 겨눠요',
    umb: 9, stick: 1.2, assist: 0.06, rest: [45, 75],
    giants: [{ look: 6, x: 0.5, y: 0.4, amp: 0.2, fq: 0.012, hp: 32, sz: 1.12, plan: [R1, G1, H1, SN3, B1, R2, G1, SN3T, H1] }],
    stars: [S('win', 0, '이기기'), S('nose', 4, '코 네 번 맞히기'), S('half', 0, '우산 반 남기기')],
  },
];
export const STAGE_COUNT = STAGES.length;

interface Giant {
  id: number; look: number; bx: number; by: number; amp: number; fq: number; ph: number; sz: number; ent: boolean;
  hp: number; max: number; x: number; y: number;
  st: 0 | 1 | 2; stT: number; next: number; plan: Atk[]; pi: number; atk: Atk | null; queue: number[]; hidden: boolean;
  // 연출
  hurtT: number; sneezeT: number; deflT: number; koT: number; seed: number; lastHit: number;
}
const IDLE = 0, PUFFS = 1, KO = 2;
interface Proj {
  id: number; k: PK; g: number; st: 0 | 1 | 2; sx: number; sy: number; ex: number; ey: number; t0: number; T: number; arc: number; wob: number; ph: number;
  tc: number; ca: number; x: number; y: number; passed: boolean; tut: boolean;
  stickT: number; rel: number; vx: number; vy: number; dmg: number; perfect: boolean; rb: boolean; home: number; born: number; spin: number;
}
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }

export interface UmbState {
  rng: Rng; seed: number; t: number; wt: number; swt: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  umb: number; umbMax: number; down: boolean; lock: number; ang: number; open: number; openT: number; holdT: number;
  freeze: number; slowT: number; wind: number; windT: number;
  giants: Giant[]; projs: Proj[]; nid: number; koT: number;
  streak: number; rb: number; wet: number; zaps: number; noses: number; streakBest: number; rainbows: number; pops: number; parries: number; blocks: number; multiBest: number;
  firstPress: number; firstParry: number; firstBig: number; wowN: number; tutDone: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; y: number; t: number; label: string; r: number } | null;
  events: Ev[];
  // 연출용 (시뮬레이션 결과와 무관)
  mood: number; moodT: number; wetT: number; zapT: number; parryT: number; swatAng: number; birdT: number; bolts: { x: number; t: number; hit: boolean }[];
}

const ev = (s: UmbState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: UmbState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const angDiff = (a: number, b: number) => {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
};
const wow = (s: UmbState) => {
  s.wowN++;
  if (s.firstBig < 0 && s.firstPress >= 0) s.firstBig = s.t;
};

// ───────────────────────────── 거인 ─────────────────────────────
const gRx = (g: Giant) => 0.2 * g.sz, gNr = (g: Giant) => 0.042 * g.sz;
/** 거인 자리 (세계 시각 swt 기준 — 미리 보기·봇이 같은 식을 쓴다) */
function gPos(g: Giant, swt: number): [number, number] {
  const ent = g.ent ? Math.max(0, 1 - swt / ENTER) : 0;
  return [g.bx + g.amp * Math.sin(g.fq * swt + g.ph), g.by + 0.012 * Math.sin(0.035 * swt + g.ph * 2) - 0.55 * ent * ent];
}
const noseOf = (g: Giant, x: number, y: number): [number, number] => [x, y + 0.012 * g.sz];
const mouthOf = (g: Giant): [number, number] => [g.x, g.y + 0.078 * g.sz];
const alive = (g: Giant) => g.st !== KO;
/**
 * 받아친 것은 거인 얼굴 높이(코 줄)를 지나는 순간 얼굴에 철썩 — 그때 가로 자리가 코 안이면 코, 몸 폭 안이면 몸.
 * (아래에서 위로 날아가 화면 안쪽의 얼굴에 맞는 그림이라, 턱을 스치는 것은 아직 날아가는 중이다)
 */
function faceHit(g: Giant, gx: number, gy: number, x0: number, y0: number, x1: number, y1: number, pr: number) {
  const [nx, ny] = noseOf(g, gx, gy);
  if (!(y0 > ny && y1 <= ny)) return null;
  const u = (y0 - ny) / (y0 - y1), cx = x0 + (x1 - x0) * u;
  const nose = Math.abs(cx - nx) <= gNr(g) + pr * 0.5;
  if (nose || Math.abs(cx - gx) <= gRx(g) * 0.92 + pr * 0.5) return { x: cx, nose };
  return null;
}

// ───────────────────────────── 날아오는 것 ─────────────────────────────
function pathAt(p: Proj, wt: number): [number, number, number] {
  const u = (wt - p.t0) / p.T, dx = p.ex - p.sx, dy = p.ey - p.sy, L = Math.hypot(dx, dy) || 1e-6, nx = -dy / L, ny = dx / L;
  const uc = clamp(u, 0, 1.4);
  const side = p.arc * Math.sin(Math.PI * Math.min(1, uc)) + (p.wob ? p.wob * Math.sin((wt - p.t0) * 0.1 + p.ph) * Math.min(1, uc * 3) : 0);
  return [p.sx + dx * uc + nx * side, p.sy + dy * uc + ny * side, u];
}
/** 우산 둘레에 처음 닿는 세계 시각·각도 (미리 계산 — 봇도 같은 것을 본다) */
function contact(p: Proj) {
  const R0 = UR + PR[p.k];
  for (let w = 0; w <= p.T * 1.2; w += 0.25) {
    const [x, y] = pathAt(p, p.t0 + w);
    if (Math.hypot(x - PX, y - PY) <= R0) return { tc: p.t0 + w, ca: Math.atan2(y - PY, x - PX) };
  }
  return { tc: p.t0 + p.T, ca: -Math.PI / 2 };
}

function launch(s: UmbState, g: Giant, k: PK, tut = false) {
  const d = STAGES[s.stage], [mx, my] = mouthOf(g);
  const ex = PX + (tut ? 0 : (s.rng() - 0.5) * 0.05), ey = PY + 0.02;
  const dist = Math.hypot(ex - mx, ey - my), sp = tut ? 0.019 : SP[k] * (s.stage === 0 ? 0.9 : 1);
  const arcMax = s.stage === 0 ? 0.05 : k === 'hail' ? 0.07 : 0.13;
  const p: Proj = {
    id: ++s.nid, k, g: g.id, st: 0, sx: mx, sy: my, ex, ey, t0: s.swt, T: dist / sp, arc: tut ? 0 : (s.rng() * 2 - 1) * arcMax,
    wob: k === 'snow' ? 0.03 + s.rng() * 0.02 : 0, ph: s.rng() * 6.28, tc: 0, ca: 0, x: mx, y: my, passed: false, tut,
    stickT: 0, rel: 0, vx: 0, vy: 0, dmg: 0, perfect: false, rb: false, home: -1, born: s.t, spin: s.rng() * 6.28,
  };
  const c = contact(p);
  p.tc = c.tc;
  p.ca = c.ca;
  s.projs.push(p);
  ev(s, 'spit', mx, my, 0, k);
  if (see(s, k, '') && k !== 'rain') s.spot = { x: mx, y: my + 0.06, t: s.t, label: P_NAME[k], r: 0.07 };
  void d;
}

const halfOf = (s: UmbState) => STAGES[s.stage].half ?? HALF;
/** 지금 떼면 받아쳐지는 것들 (게임·봇·미리 보기가 같은 것을 쓴다) */
export function parryCands(s: UmbState): { p: Proj; perfect: boolean }[] {
  const out: { p: Proj; perfect: boolean }[] = [];
  if (!s.down) return out;
  for (const p of s.projs) {
    if (p.st === 1) out.push({ p, perfect: p.stickT <= PERF || p.tut });
    else if (p.st === 0 && !p.passed && s.openT >= OPEN_MIN) {
      const d = Math.hypot(p.x - PX, p.y - PY) - UR - PR[p.k];
      if (d > 0 && d <= REACH && angDiff(Math.atan2(p.y - PY, p.x - PX), s.ang) <= halfOf(s)) out.push({ p, perfect: d <= SP[p.k] * PERF });
    }
  }
  return out;
}

function breakStreak(s: UmbState) {
  s.streak = 0;
  s.rb = 0;
}

function parry(s: UmbState, cands: { p: Proj; perfect: boolean }[]) {
  const d = STAGES[s.stage];
  let rbUsed = false;
  const multi = cands.length;
  for (const { p, perfect } of cands) {
    const rb = s.rb >= RB_MAX && !rbUsed;
    if (rb) (rbUsed = true), (s.rb = 0);
    p.st = 2;
    p.perfect = perfect;
    p.rb = rb;
    p.dmg = rb ? RB_DMG : DMG[p.k];
    const v = rb || p.tut ? VR_RB : (p.k === 'hail' ? VR * 1.15 : VR) * (perfect ? 1.15 : 1);
    let a = s.ang;
    // 배우는 판(1·2판): 거인 쪽으로만 치면 코로 끌려간다 · 그 뒤: 거인 몸 둘레를 살짝 비껴가면 몸으로 끌려 들어간다
    const tg = s.giants.filter(alive);
    if (d.assist >= 0.5 && tg.length) {
      const g = tg[0];
      if (angDiff(Math.atan2(g.y - p.y, g.x - p.x), a) < d.assist) p.home = g.id;
    } else if (tg.length && d.assist > 0) {
      let best = 9, ba = a;
      for (const g of tg) {
        const ga = Math.atan2(g.y - p.y, g.x - p.x), dd = angDiff(ga, a);
        const edge = Math.atan2(gRx(g), Math.hypot(g.x - p.x, g.y - p.y));
        if (dd > edge && dd < edge + d.assist && dd < best) (best = dd), (ba = ga + Math.sign(Math.sin(a - ga)) * edge * 0.8);
      }
      a = ba;
    }
    p.vx = Math.cos(a) * v;
    p.vy = Math.sin(a) * v;
    p.born = s.t;
    s.parries++;
    ev(s, 'parry', p.x, p.y, multi, perfect ? (rb ? 'rb' : 'perfect') : 'good');
    if (p.tut) {
      s.tutDone = true;
      const g = s.giants.find((q) => q.id === p.g);
      if (g) g.next = s.swt + 60;
    }
  }
  s.multiBest = Math.max(s.multiBest, multi);
  if (multi >= 2) {
    wow(s);
    ev(s, 'multi', PX, PY - 0.12, multi);
    see(s, 'multi', '');
  }
  if (rbUsed) {
    wow(s);
    ev(s, 'rainbow', PX, PY - 0.1);
    if (see(s, 'rainbow', '')) s.newsQ.push('무지개 한 방 — 연속 다섯 번이면 우산이 무지개로!');
    s.rainbows++;
  }
  s.freeze = FREEZE + (multi >= 2 || rbUsed ? 3 : 0);
  s.slowT = SLOW_T;
  s.lock = PARRY_REC;
  s.parryT = s.t;
  s.swatAng = s.ang;
  if (s.firstParry < 0) s.firstParry = s.t;
}

function hitGiant(s: UmbState, p: Proj, g: Giant, nose: boolean) {
  if (g.hidden) {
    ev(s, 'bounce', p.x, p.y, 0, '');
    breakStreak(s);
    return;
  }
  const dmg = p.rb ? p.dmg : p.dmg * (nose ? 2 : 1);
  g.hp = Math.max(0, g.hp - dmg);
  g.hurtT = s.t;
  g.lastHit = dmg;
  s.pts += dmg * HIT_PTS;
  s.streak++;
  s.streakBest = Math.max(s.streakBest, s.streak);
  if (!p.rb) s.rb = Math.min(RB_MAX, s.rb + 1);
  if (nose && !p.rb) {
    s.noses++;
    g.sneezeT = s.t;
    if (see(s, 'nose', '')) s.spot = null;
    wow(s);
    ev(s, 'sneeze', g.x, g.y, dmg);
  }
  ev(s, 'hit', p.x, p.y, dmg, nose ? 'nose' : p.rb ? 'rb' : p.k);
  if (g.st === PUFFS) {
    // 볼이 부푼 거인을 맞히면 바람이 빠져 던지기가 취소된다
    g.st = IDLE;
    g.atk = null;
    g.queue = [];
    g.deflT = s.t;
    g.next = s.swt + 40;
    s.pops++;
    see(s, 'pop', '');
    ev(s, 'deflate', g.x, g.y);
  }
  if (g.hp <= 0) {
    g.st = KO;
    g.koT = s.t;
    g.queue = [];
    g.atk = null;
    wow(s);
    ev(s, 'ko', g.x, g.y);
    for (const o of s.giants) if (o !== g && alive(o)) (o.hidden = false), (o.next = Math.min(o.next, s.swt + 40));
  }
}

function block(s: UmbState, p: Proj) {
  const c = BLOCK[p.k];
  s.umb = Math.max(0, s.umb - c);
  s.blocks++;
  breakStreak(s);
  ev(s, 'block', p.x, p.y, c, p.k);
}
function soak(s: UmbState, p: Proj) {
  const c = s.stage <= 1 ? 1 : HIT[p.k];
  s.umb = Math.max(0, s.umb - c);
  s.wet++;
  s.wetT = s.t;
  breakStreak(s);
  ev(s, 'soak', PX, PY - 0.02, c, p.k);
}

function startAttack(s: UmbState, g: Giant) {
  const a = g.plan[g.pi % g.plan.length];
  g.pi++;
  g.atk = a;
  g.st = PUFFS;
  g.stT = 0;
  g.hidden = false;
  if (a.k === 'bolt') {
    if (see(s, 'bolt', '')) s.spot = { x: g.x, y: g.y, t: s.t, label: '번개', r: 0.2 };
    ev(s, 'charge', g.x, g.y);
  }
  if (a.k === 'gust' && see(s, 'wind', '')) s.spot = { x: g.x, y: g.y, t: s.t, label: '바람', r: 0.2 };
}

function finishAttack(s: UmbState, g: Giant) {
  const d = STAGES[s.stage], a = g.atk!;
  g.st = IDLE;
  g.atk = null;
  const [lo, hi] = d.rest;
  const twins = s.giants.filter(alive).length > 1;
  if (a.k === 'bolt') {
    // 번개: 우산이 펴져 있으면 우산에 꽂힌다
    const hit = s.open > 0.25;
    s.bolts.push({ x: PX, t: s.t, hit });
    if (hit) {
      s.umb = Math.max(0, s.umb - ZAP);
      s.zaps++;
      s.zapT = s.t;
      breakStreak(s);
      ev(s, 'zap', PX, PY - 0.1, ZAP);
    } else ev(s, 'boltmiss', PX + 0.16, KY);
    g.next = s.swt + lo + s.rng() * (hi - lo);
  } else if (a.k === 'gust') {
    s.wind = (s.rng() < 0.5 ? -1 : 1) * 0.00085;
    s.windT = 210;
    ev(s, 'gust', g.x, g.y, s.wind > 0 ? 1 : -1);
    g.next = s.swt + lo + s.rng() * (hi - lo);
  } else {
    const n = a.n ?? 1;
    launch(s, g, a.k);
    for (let i = 1; i < n; i++) g.queue.push(s.swt + i * (a.gap ?? 20));
    g.next = s.swt + (n - 1) * (a.gap ?? 20) + lo + s.rng() * (hi - lo);
  }
  if (twins) {
    // 쌍둥이: 던진 쪽은 숨고, 다른 쪽 차례
    g.hidden = true;
    const o = s.giants.find((q) => q !== g && alive(q));
    if (o) (o.hidden = false), (o.next = Math.max(s.swt + 20, Math.min(o.next, s.swt + 50 + s.rng() * 30)));
    g.next = 1e9;
  }
}

function newStage(s: UmbState) {
  const d = STAGES[s.stage], flip = s.stage > 0 && s.rng() < 0.5;
  s.giants = d.giants.map((q, i) => ({
    id: ++s.nid, look: q.look, bx: q.x, by: q.y, amp: q.amp, fq: q.fq, ph: flip ? Math.PI : 0, sz: q.sz, ent: !(s.stage === 0 && s.firstPress < 0),
    hp: q.hp, max: q.hp, x: q.x, y: q.y, st: IDLE, stT: 0, next: s.stage === 0 && !s.tutDone ? (s.firstPress < 0 ? 1e9 : 0) : CARD_T * 0.7 + i * 70, plan: q.plan, pi: 0, atk: null, queue: [],
    hidden: d.giants.length > 1 && i === 1,
    hurtT: -999, sneezeT: -999, deflT: -999, koT: -999, seed: Math.floor(s.rng() * 1e6), lastHit: 0,
  }));
  s.projs = [];
  s.umbMax = d.umb;
  s.umb = d.umb;
  s.down = false;
  s.lock = 0;
  s.open = 0;
  s.openT = 0;
  s.freeze = 0;
  s.slowT = 0;
  s.wind = 0;
  s.windT = 0;
  s.swt = 0;
  s.koT = -1;
  s.streak = 0;
  s.rb = 0;
  s.wet = 0;
  s.zaps = 0;
  s.noses = 0;
  s.streakBest = 0;
  s.rainbows = 0;
  s.pops = 0;
  s.multiBest = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.bolts = [];
  if (d.giants.length > 1 && see(s, 'twin', '')) s.spot = { x: 0.5, y: 0.4, t: s.t + CARD_T, label: '쌍둥이', r: 0.3 };
}

function starMet(s: UmbState, st: Star) {
  switch (st.k) {
    case 'win': return true;
    case 'dry': return s.wet === 0;
    case 'streak': return s.streakBest >= st.n;
    case 'nose': return s.noses >= st.n;
    case 'nozap': return s.zaps === 0;
    case 'rainbow': return s.rainbows >= st.n;
    case 'pop': return s.pops >= st.n;
    case 'half': return s.umb * 2 >= s.umbMax;
    case 'multi': return s.multiBest >= st.n;
  }
}
/** 별 칸 옆 진행 숫자 (예: 2/3) */
function starNow(s: UmbState, st: Star): string {
  const v = st.k === 'streak' ? s.streakBest : st.k === 'multi' ? s.multiBest : st.k === 'nose' ? s.noses : st.k === 'rainbow' ? s.rainbows : st.k === 'pop' ? s.pops : -1;
  return v >= 0 && v < st.n && st.n > 1 ? `${v}/${st.n}` : '';
}
const starBroken = (s: UmbState, st: Star) => (st.k === 'dry' && s.wet > 0) || (st.k === 'nozap' && s.zaps > 0) || (st.k === 'half' && s.umb * 2 < s.umbMax);

function endStage(s: UmbState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.lock = 0;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += CLEAR_PTS + s.got * STAR_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 3;
    s.moodT = 999;
    s.birdT = s.t;
    ev(s, 'clear', 0.5, 0.7);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'fail', PX, PY, 0, why);
  }
}

// ───────────────────────────── 시뮬레이션 ─────────────────────────────
function world(s: UmbState, dt: number) {
  // 우산: 누르는 동안 펴지고, 떼면 접힌다
  if (s.down) {
    s.open = Math.min(1, s.open + dt / OPEN_T);
    if (s.open >= 1) s.openT += dt;
  } else (s.open = Math.max(0, s.open - dt / 5)), (s.openT = 0);
  if (dt <= 0) return;
  s.wt += dt;
  const d = STAGES[s.stage];
  const waiting = s.stage === 0 && s.firstPress < 0;
  if (!waiting) s.swt += dt;
  if (s.windT > 0 && (s.windT -= dt) <= 0) (s.wind = 0), (s.windT = 0);
  // 거인
  for (const g of s.giants) {
    [g.x, g.y] = gPos(g, s.swt);
    if (g.st === KO) continue;
    if (waiting) continue;
    if (g.st === IDLE && s.swt >= g.next && s.koT < 0) startAttack(s, g);
    if (g.st === PUFFS) {
      g.stT += dt;
      const need = s.stage === 0 && !s.tutDone && g.pi === 1 ? 10 : PUFF[g.atk!.k];
      if (g.stT >= need) {
        if (s.stage === 0 && !s.tutDone && g.pi === 1) {
          g.st = IDLE;
          g.atk = null;
          launch(s, g, 'rain', true);
          g.next = 1e9;
        } else finishAttack(s, g);
      }
    }
    while (g.queue.length && s.swt >= g.queue[0]) {
      g.queue.shift();
      launch(s, g, (g.plan[(g.pi - 1) % g.plan.length].k as PK) ?? 'rain');
    }
  }
  // 날아오는 것 · 받아친 것
  const R = (p: Proj) => UR + PR[p.k];
  for (const p of [...s.projs]) {
    if (p.st === 0) {
      let [x, y, u] = pathAt(p, s.swt);
      if (p.tut && Math.hypot(x - PX, y - PY) < R(p) + 0.01 && !(s.open >= 0.75)) {
        // 첫 물방울: 우산이 펴질 때까지 우산 위에서 둥실 기다린다
        p.t0 += dt;
        [x, y, u] = pathAt(p, s.swt);
      }
      p.x = x;
      p.y = y;
      const dd = Math.hypot(x - PX, y - PY);
      if (!p.passed && dd <= R(p)) {
        const facing = p.tut || angDiff(Math.atan2(y - PY, x - PX), s.ang) <= halfOf(s);
        if (s.open >= 0.75 && facing) {
          p.st = 1;
          p.stickT = 0;
          p.rel = Math.atan2(y - PY, x - PX) - s.ang;
          if (p.tut) p.rel = 0;
          ev(s, 'land', x, y, 0, p.k);
        } else p.passed = true;
      }
      if (p.st === 0 && u >= 1) {
        s.projs.splice(s.projs.indexOf(p), 1);
        soak(s, p);
      }
    } else if (p.st === 1) {
      p.stickT += dt;
      const a = s.ang + p.rel;
      p.x = PX + Math.cos(a) * (R(p) - 0.006);
      p.y = PY + Math.sin(a) * (R(p) - 0.006);
      const lim = p.tut ? 1e9 : STK[p.k] * d.stick;
      if (p.stickT > lim || !s.down) {
        s.projs.splice(s.projs.indexOf(p), 1);
        block(s, p);
      }
    } else {
      // 받아친 것
      if (p.home >= 0) {
        const g = s.giants.find((q) => q.id === p.home && alive(q));
        if (g) {
          const [nx, ny] = noseOf(g, g.x, g.y), L = Math.hypot(nx - p.x, ny - p.y) || 1e-6, v = Math.hypot(p.vx, p.vy);
          p.vx = ((nx - p.x) / L) * v;
          p.vy = ((ny - p.y) / L) * v;
        }
      }
      let done = false;
      for (let k = 0; k < 2 && !done; k++) {
        const x0 = p.x, y0 = p.y;
        p.vx += (s.wind * dt) / 2;
        p.x += (p.vx * dt) / 2;
        p.y += (p.vy * dt) / 2;
        for (const g of s.giants) {
          if (!alive(g)) continue;
          const f = faceHit(g, g.x, g.y, x0, y0, p.x, p.y, p.rb ? 0.06 : PR[p.k]);
          if (f) {
            p.x = f.x;
            s.projs.splice(s.projs.indexOf(p), 1);
            hitGiant(s, p, g, f.nose && !p.rb);
            done = true;
            break;
          }
        }
      }
      if (!done && (p.y < -0.15 || p.x < -0.15 || p.x > 1.15 || p.y > A)) {
        s.projs.splice(s.projs.indexOf(p), 1);
        breakStreak(s);
        ev(s, 'miss', clamp(p.x, 0.08, 0.92), Math.max(0.12, p.y), 0, p.k);
      }
    }
  }
  if (s.umb <= 0) return endStage(s, false, s.zaps && s.bolts.at(-1)?.hit ? '번개에 우산이 타 버렸어요' : '우산이 다 젖었어요');
  if (s.giants.every((g) => !alive(g))) {
    if (s.koT < 0) s.koT = s.swt;
    if (s.swt - s.koT >= KO_T && !s.projs.some((p) => p.st === 2)) endStage(s, true, '');
    // 거인이 쓰러지면 날아오던 것은 무지개 빛으로 사라진다
    for (const p of [...s.projs]) if (p.st !== 2) s.projs.splice(s.projs.indexOf(p), 1);
  }
}

function cosmetic(s: UmbState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.bolts = s.bolts.filter((b) => s.t - b.t < 40);
  if (s.spot && s.t - s.spot.t > 110) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

function release(s: UmbState) {
  const c = parryCands(s);
  if (c.length) parry(s, c);
  else if (s.open >= 0.5) {
    s.lock = WHIFF_LOCK;
    ev(s, 'whiff', PX, PY - 0.1, 0, s.giants.some((g) => g.st === PUFFS && g.atk?.k === 'bolt') ? 'bolt' : '');
  }
  s.down = false;
}

const aimFrom = (px: number, py: number) => clamp(Math.atan2(py - PY, px - PX), ANG_MIN, ANG_MAX);

const game: GameDef<UmbState> & { wows(s: UmbState): number } = {
  id: 'umbrellaparry',
  name: '우산 튕기기 꼬마 vs 구름 거인',
  genes: ['parry', 'pointer', 'combo'],
  twist: '막는 우산이 곧 라켓이다 — 들고 있으면 막기만(우산이 젖음), 닿는 그 순간 떼야 손가락 쪽으로 받아쳐지는데, 너무 일찍 떼면 접힌 우산 사이로 흠뻑 젖는다. 연속으로 받아치면 우산 살에 무지개가 차 다음 한 방이 무지개 빔',
  rules: [
    '누르면 꼬마가 손가락 쪽으로 우산을 펴요. 날아온 게 닿는 순간 떼면 탁! 그쪽으로 받아쳐요.',
    '들고만 있으면 막기(우산 한 칸 젖음), 너무 일찍 떼면 맞아요(두 칸). 우산이 다 젖으면 하트 -1.',
    '연속으로 받아치면 우산에 무지개가 차요. 코는 두 배! 거인 체력을 0으로.',
  ],
  controls: 'touch',
  hint: '누르면 우산, 날아온 게 닿을 때 떼면 탁! / 화살표로 겨누고 스페이스',
  aspect: A,
  art: {
    concept: '맑은 하늘 구름 섬의 노란 우비 꼬마 vs 표정 풍부한 구름 거인 — 햇살 가득한 그림책 보스전',
    mood: '쨍한 파란 하늘에 솜사탕 구름이 겹겹이 흐르고 햇살이 번진다. 볼을 부풀린 구름 거인이 물방울·우박·눈송이를 퉤 뱉으면 노란 우비 꼬마가 우산으로 탁 받아친다 — 코에 맞은 거인은 에취! 구름이 펑 흩어지고, 연속으로 받아칠수록 우산 살에 무지개가 찬다.',
    palette: { bg: '#8fd3ff', ink: '#1f3550', muted: '#6d8aa8', accent: '#ffcf3a', hot: '#ff5f6d', soft: '#e3f4ff' },
  },
  guard: (s) => s.umb,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, wt: 0, swt: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [false], pts: 0, won: false, dead: false, again: false, tries: 0,
      umb: 10, umbMax: 10, down: false, lock: 0, ang: -Math.PI / 2, open: 0, openT: 0, holdT: 0, freeze: 0, slowT: 0, wind: 0, windT: 0,
      giants: [], projs: [], nid: 0, koT: -1,
      streak: 0, rb: 0, wet: 0, zaps: 0, noses: 0, streakBest: 0, rainbows: 0, pops: 0, parries: 0, blocks: 0, multiBest: 0,
      firstPress: -1, firstParry: -1, firstBig: -1, wowN: 0, tutDone: false,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      mood: 0, moodT: 0, wetT: -999, zapT: -999, parryT: -999, swatAng: -Math.PI / 2, birdT: -999, bolts: [],
    } as unknown as UmbState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const p = inp.pointer ?? null;
    if (s.lock > 0) s.lock--;
    if (s.phase === 'play') {
      if (p) {
        if (!s.down && s.lock <= 0) {
          s.down = true;
          s.holdT = 0;
          if (s.firstPress < 0) {
            s.firstPress = s.t;
            // 첫 꾹: 하품하던 거인이 깨어나 볼을 부풀린다
            if (s.stage === 0) for (const g of s.giants) (g.next = 0), ev(s, 'wake', g.x, g.y);
          }
        }
        if (s.down) (s.ang = aimFrom(p.x, p.y * A)), s.holdT++;
      } else if (s.down) release(s);
    } else s.down = false;
    let dt = 1;
    if (s.freeze > 0) (s.freeze--, (dt = 0));
    else if (s.slowT > 0) (s.slowT--, (dt = SLOW_DT));
    if (s.phase === 'result') {
      s.pt++;
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    world(s, dt);
    cosmetic(s);
    s.pt++;
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};
export const umbrellaparry = game;

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
/** 손가락을 겨눈 쪽 거인 얼굴 높이쯤에 둔다 (사람처럼 코를 직접 가리킨다) */
function aimAt(a: number, L = 0.62): Input {
  const dx = Math.cos(a), dy = Math.sin(a);
  if (dx > 1e-6) L = Math.min(L, (0.98 - PX) / dx);
  if (dx < -1e-6) L = Math.min(L, (0.02 - PX) / dx);
  if (dy < -1e-6) L = Math.min(L, (0.05 - PY) / dy);
  return { tap: false, dir: 0, pointer: { x: PX + dx * L, y: (PY + dy * L) / A } };
}

/** 세계 시각 dW만큼 흐르려면 몇 틱 (멈칫·느려짐 포함) */
function ticksFor(s: UmbState, dW: number) {
  let t = 0, w = 0, fz = s.freeze, sl = s.slowT;
  while (w < dW && t < 600) {
    t++;
    if (fz > 0) fz--;
    else if (sl > 0) (sl--, (w += SLOW_DT));
    else w += 1;
  }
  return t;
}
/** 번개가 꽂힐 때까지 남은 틱 (없으면 큰 수) */
function boltIn(s: UmbState) {
  let best = 1e9;
  for (const g of s.giants) if (g.st === PUFFS && g.atk?.k === 'bolt') best = Math.min(best, ticksFor(s, PUFF.bolt - g.stT));
  return best;
}
/** 받아친 것이 날아갈 길을 따라가 본다: 2.2 코 · 1 몸 · 숨은 쌍둥이 -1 · 빗나감 -0.6 (+부푼 볼 0.6) */
function simReturn(s: UmbState, x: number, y: number, a: number, w0: number, k: PK, rb: boolean): number {
  const v = rb ? VR_RB : (k === 'hail' ? VR * 1.15 : VR) * 1.15;
  let vx = Math.cos(a) * v, vy = Math.sin(a) * v, w = w0, wind = s.wind, wT = s.windT;
  const pr = rb ? 0.06 : PR[k];
  for (let i = 0; i < 160; i++) {
    for (let h = 0; h < 2; h++) {
      const x0 = x, y0 = y;
      vx += wT > 0 ? wind / 2 : 0;
      x += vx / 2;
      y += vy / 2;
      for (const g of s.giants) {
        if (!alive(g)) continue;
        const [gx, gy] = gPos(g, w), f = faceHit(g, gx, gy, x0, y0, x, y, pr), nose = !!f?.nose;
        if (f) {
          const hidden = g.hidden && s.giants.filter(alive).length > 1;
          if (hidden) return -1;
          const puff = g.st === PUFFS || g.next - w < 20 ? 0.6 : 0;
          return (nose && !rb ? 2.2 : 1) + puff;
        }
      }
    }
    w += 1;
    wT -= 1;
    if (y < -0.15 || x < -0.15 || x > 1.15) return -0.6;
  }
  return -0.6;
}
const aimMem = new WeakMap<object, { id: number; t: number; a: number }>();
/** 다음에 올 것을 덮으면서 코(없으면 몸)를 맞히는 우산 각도 */
function bestAim(s: UmbState, p: Proj | null): number {
  const g0 = s.giants.find((g) => alive(g) && !g.hidden) ?? s.giants.find(alive);
  if (!p) {
    if (!g0) return -Math.PI / 2;
    const [nx, ny] = noseOf(g0, g0.x, g0.y);
    return aimFrom(nx, ny);
  }
  const m = aimMem.get(s);
  if (m && m.id === p.id && s.t - m.t < 6) return m.a;
  const ca = p.st === 1 ? s.ang + p.rel : p.ca;
  const cx = PX + Math.cos(ca) * (UR + PR[p.k]), cy = PY + Math.sin(ca) * (UR + PR[p.k]);
  const w0 = p.st === 1 ? s.swt : p.tc;
  const rb = s.rb >= RB_MAX;
  let ba = ca, bv = -9;
  const span = HALF - (p.k === 'snow' ? 0.3 : 0.14);
  for (let i = 0; i <= 24; i++) {
    const a = clamp(ca - span + (2 * span * i) / 24, ANG_MIN, ANG_MAX);
    const v = (s.stage === 0 ? 1 : simReturn(s, cx, cy, a, w0, p.k, rb)) - Math.abs(a - ca) * 0.02;
    if (v > bv) (bv = v), (ba = a);
  }
  aimMem.set(s, { id: p.id, t: s.t, a: ba });
  return ba;
}
/** 다음에 우산에 닿을 것 (붙은 것 먼저) */
function nextProj(s: UmbState): Proj | null {
  let best: Proj | null = null, bt = 1e9;
  for (const p of s.projs) {
    if (p.st === 1) return p;
    if (p.st !== 0 || p.passed) continue;
    if (p.tc < bt) (bt = p.tc), (best = p);
  }
  return best;
}

/** 잘하는 봇: 닿기 직전에 떼고, 코(쌍둥이면 드러난 쪽, 바람이면 휘는 만큼)를 겨눈다. 번개가 오면 미리 접는다 */
export const umbrellaparrySmart: Bot<UmbState> = {
  name: '닿는 순간 떼고 코를 노림',
  act(s) {
    if (s.phase !== 'play') return NO;
    const p = nextProj(s), bolt = boltIn(s);
    const a = bestAim(s, p);
    if (s.down) {
      const c = parryCands(s);
      if (c.length) {
        const d = STAGES[s.stage];
        // 지금 받아칠 수 있는 것들이 언제까지 받아쳐지나(틱) · 다음 것이 언제 받아칠 거리에 드나
        let dl = 1e9, nx = 1e9;
        for (const { p: q } of c) {
          const lim = STK[q.k] * d.stick;
          dl = Math.min(dl, q.st === 1 ? ticksFor(s, lim - q.stickT) : ticksFor(s, q.tc - s.swt + lim));
        }
        for (const q of s.projs) if (q.st === 0 && !q.passed && !c.some((z) => z.p === q)) nx = Math.min(nx, ticksFor(s, q.tc - REACH / SP[q.k] - s.swt));
        // 곧 들어올 것이 있으면 기다렸다 한꺼번에 · 아직 '딱 맞춤'이 아니고 여유가 있으면 조금 더
        if (bolt > 6 && nx + 2 < dl - 1) return aimAt(a);
        if (bolt > 6 && c.every((q) => !q.perfect && q.p.st === 0) && dl > 5) return aimAt(a);
        return NO;
      }
      // 번개가 오면 미리 접는다 (접히는 데 4틱 — 넉넉히)
      if (bolt <= 20) return NO;
      return aimAt(a);
    }
    if (s.lock > 0 || bolt <= 24) return NO;
    return aimAt(a);
  },
};

const dumbMem = new WeakMap<object, { next: number; down: boolean; x: number; y: number }>();
/** 못하는 봇: 아무 때나 아무 데나 눌렀다 뗀다 */
export const umbrellaparryRandom: Bot<UmbState> = {
  name: '아무 때나 꾹·떼기',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 40), down: false, x: 0.5, y: 0.5 }));
    if (s.t >= m.next) {
      m.down = !m.down;
      if (m.down) {
        m.next = s.t + 15 + Math.floor(rng() * 70);
        m.x = 0.05 + rng() * 0.9;
        m.y = 0.05 + rng() * 0.9;
      } else m.next = s.t + 8 + Math.floor(rng() * 45);
    }
    return m.down ? { tap: false, dir: 0, pointer: { x: m.x, y: m.y } } : NO;
  },
};

/** 버릇 봇: 늘 정면(바로 위)으로 우산을 들고, 닿는 순간 뗀다 (겨누기·번개 접기 없음) */
export const umbrellaparryHabit: Bot<UmbState> = {
  name: '늘 정면에서 받아치기',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.down) {
      const c = parryCands(s);
      if (c.length) return NO;
      return aimAt(-Math.PI / 2);
    }
    return s.lock > 0 ? NO : aimAt(-Math.PI / 2);
  },
};

/** 독립 버릇 봇: 늘 막기만 — 오는 쪽으로 우산을 들고 절대 떼지 않는다 (첫 물방울만 뗀다) */
export const umbrellaparryHabit2: Bot<UmbState> = {
  name: '늘 막기만',
  act(s) {
    if (s.phase !== 'play') return NO;
    const p = nextProj(s);
    if (p?.tut && p.st === 1) return NO;
    return aimAt(p ? (p.st === 1 ? s.ang : p.ca) : -Math.PI / 2);
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
function dropPath(ctx: C2, r: number) {
  // 뾰족한 쪽이 -x (날아온 쪽 꼬리)
  ctx.beginPath();
  ctx.moveTo(-r * 2.1, 0);
  ctx.bezierCurveTo(-r * 1.2, -r * 0.55, -r * 0.6, -r, 0, -r);
  ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.bezierCurveTo(-r * 0.6, r, -r * 1.2, r * 0.55, -r * 2.1, 0);
  ctx.closePath();
}
const OUT = '#20406a', KID_OUT = '#5b3512';
const RBC = ['#ff5a5a', '#ff9f3a', '#ffd93a', '#5fd36a', '#4aa8ff', '#8a6cff'];
const GB = 1.31;

// ── 판별 하늘 · 거인 색 (모두 밝은 낮) ──
interface Pal { sky: [string, string, string]; far: string; mid: string; isle: string; body: string; shade: string; line: string; cheek: string; nose: string; extra: string }
const PAL: Pal[] = [
  { sky: ['#2f98ea', '#6fc0ff', '#d8f1ff'], far: '#cfe6fb', mid: '#ffffff', isle: '#ffffff', body: '#f3f8ff', shade: '#b4c6e8', line: '#4a6a9a', cheek: '#ffb3c2', nose: '#ff9fb0', extra: '#7fc4ff' },
  { sky: ['#2b8fe4', '#68bcff', '#e2f6ff'], far: '#d3e9fb', mid: '#ffffff', isle: '#ffffff', body: '#eef6ff', shade: '#9fb8dc', line: '#3d5f8e', cheek: '#b8e4ff', nose: '#9fd4ff', extra: '#dff4ff' },
  { sky: ['#4aa6ec', '#98d2ff', '#f0faff'], far: '#e3f0fc', mid: '#ffffff', isle: '#ffffff', body: '#ffffff', shade: '#c8d0f0', line: '#5a6aa0', cheek: '#ffc6dc', nose: '#ffb0c8', extra: '#ffffff' },
  { sky: ['#358ee2', '#82c3f6', '#fbf4d4'], far: '#dde8f6', mid: '#fffdf4', isle: '#fffdf4', body: '#e4e8f4', shade: '#8f98bc', line: '#3c4670', cheek: '#ffc78a', nose: '#ffcf5a', extra: '#ffe14a' },
  { sky: ['#3a9cf0', '#8ccfff', '#ffe7f2'], far: '#f3e4f2', mid: '#ffffff', isle: '#fff8fb', body: '#fff0f6', shade: '#e8b4cc', line: '#8a4a70', cheek: '#ff9ec4', nose: '#ff86b4', extra: '#ffd0e4' },
  { sky: ['#2d94ea', '#7ccbff', '#fff3d2'], far: '#f6ecd8', mid: '#fffdf6', isle: '#fffdf6', body: '#fffdf8', shade: '#d6c6e8', line: '#6a4a8a', cheek: '#ffb0a0', nose: '#ff8a7a', extra: '#ffe08a' },
];
const TWIN_BODY = [['#fff0f6', '#e8b4cc'], ['#fff4e2', '#eec49a']];

interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; isle: HTMLCanvasElement }
const BG = new Map<string, Bg>();
function layer(w: number, h: number, sc: number, paint: (c: C2) => void) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * sc));
  c.height = Math.max(1, Math.ceil(h * sc));
  const g = c.getContext('2d')!;
  g.scale(sc, sc);
  paint(g);
  return c;
}
/** 솜사탕 구름 한 덩이: 아래는 판판, 위는 몽글몽글 (음영·윤곽 포함) */
function puffCloud(g: C2, x: number, y: number, wd: number, ht: number, fill: string, shade: string, seed: number, outline: string | null, lw = 2) {
  const n = 5 + Math.floor(hsh(seed) * 3), pts: number[][] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, px = x - wd / 2 + u * wd, r = ht * (0.42 + 0.5 * Math.sin(u * Math.PI) * (0.75 + 0.5 * hsh(seed + i)));
    pts.push([px, y - r * 0.55, r]);
  }
  const draw = (grow: number, col: string | CanvasGradient) => {
    g.fillStyle = col;
    g.beginPath();
    for (const [px, py, r] of pts) {
      g.moveTo(px + r + grow, py);
      g.arc(px, py, r + grow, 0, TAU);
    }
    g.rect(x - wd / 2 - grow, y - ht * 0.35, wd + grow * 2, ht * 0.35 + grow);
    g.fill();
  };
  if (outline) draw(lw, outline);
  draw(0, lin(g, 0, y - ht * 1.2, 0, y, [0, fill], [0.62, fill], [1, shade]));
  g.fillStyle = 'rgba(255,255,255,.75)';
  for (const [px, py, r] of pts.slice(0, Math.ceil(n / 2) + 1)) {
    ell(g, px - r * 0.25, py - r * 0.35, r * 0.42, r * 0.22, -0.3);
    g.fill();
  }
}
function getBg(w: number, h: number, stage: number, sc: number): Bg {
  const key = `${w}x${h}@${sc}:${stage}`;
  let b = BG.get(key);
  if (b) return b;
  const P = PAL[stage], R = (r: number) => r * w;
  const sky = layer(w, h, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, h, [0, P.sky[0]], [0.45, P.sky[1]], [0.85, P.sky[2]], [1, P.sky[2]]);
    g.fillRect(0, 0, w, h);
    // 햇살 번짐 (오른쪽 위)
    g.fillStyle = radg(g, R(0.86), R(0.17), 0, R(0.75), [0, 'rgba(255,250,215,.85)'], [0.25, 'rgba(255,245,200,.35)'], [1, 'rgba(255,245,200,0)']);
    g.fillRect(0, 0, w, h);
    // 햇살 줄기 (오른쪽 위에서 비스듬히)
    g.save();
    g.translate(R(0.9), R(0.2));
    for (let i = 0; i < 7; i++) {
      const a0 = Math.PI * 0.55 + i * 0.13 + hsh(i + 80) * 0.05, wd = 0.025 + hsh(i + 81) * 0.03;
      g.fillStyle = `rgba(255,255,235,${0.1 + hsh(i + 82) * 0.08})`;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a0 - wd) * R(1.8), Math.sin(a0 - wd) * R(1.8));
      g.lineTo(Math.cos(a0 + wd) * R(1.8), Math.sin(a0 + wd) * R(1.8));
      g.closePath();
      g.fill();
    }
    g.restore();
    // 옅은 무지개 (먼 하늘)
    g.lineWidth = R(0.018);
    RBC.forEach((c, i) => {
      g.strokeStyle = c;
      g.globalAlpha = 0.16;
      g.beginPath();
      g.arc(R(0.22), R(1.02), R(0.62 - i * 0.018), Math.PI * 1.08, Math.PI * 1.62);
      g.stroke();
    });
    g.globalAlpha = 1;
    // 높은 새털구름
    g.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 0; i < 6; i++) {
      ell(g, R(0.1 + hsh(i + 40) * 0.8), R(0.2 + hsh(i + 41) * 0.35), R(0.12 + hsh(i + 42) * 0.1), R(0.008), 0);
      g.fill();
    }
  });
  const far = layer(w * 2, R(0.4), sc, (g) => {
    for (let i = 0; i < 9; i++) {
      const x = (i / 9) * w * 2 + hsh(i + 3) * R(0.1);
      puffCloud(g, x, R(0.38), R(0.36 + hsh(i) * 0.2), R(0.12 + hsh(i + 9) * 0.07), P.far, '#b6d4f0', i + 11, null);
    }
  });
  const mid = layer(w * 2, R(0.5), sc, (g) => {
    for (let i = 0; i < 6; i++) {
      const x = (i / 6) * w * 2 + hsh(i + 30) * R(0.18);
      puffCloud(g, x, R(0.48), R(0.42 + hsh(i + 31) * 0.22), R(0.15 + hsh(i + 32) * 0.08), P.far, '#a9c8ea', i + 51, 'rgba(120,160,210,.3)', 1.5);
    }
  });
  // 꼬마가 서 있는 구름 섬 (두께·햇빛 테두리)
  const isle = layer(w, R(0.34), sc, (g) => {
    const top = R(0.06);
    g.fillStyle = 'rgba(40,90,150,.18)';
    ell(g, w / 2, top + R(0.2), R(0.44), R(0.06));
    g.fill();
    const pts: number[][] = [];
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      pts.push([R(0.1) + u * R(0.8), top + R(0.06) + Math.sin(u * Math.PI) * -R(0.02) + hsh(i + 70) * R(0.012), R(0.075 + 0.04 * Math.sin(u * Math.PI))]);
    }
    const under: number[][] = [];
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      under.push([R(0.16) + u * R(0.68), top + R(0.14) + Math.sin(u * Math.PI) * R(0.05), R(0.07 + 0.03 * Math.sin(u * Math.PI))]);
    }
    const all = [...pts, ...under];
    for (const [grow, col] of [[3, '#5a7fb4'], [0, '']] as [number, string][]) {
      g.fillStyle = col || lin(g, 0, top - R(0.04), 0, top + R(0.26), [0, '#ffffff'], [0.4, P.isle], [0.75, '#d8e6fa'], [1, '#a9c2ea']);
      g.beginPath();
      for (const [x, y, r] of all) {
        g.moveTo(x + r + grow, y);
        g.arc(x, y, r + grow, 0, TAU);
      }
      g.fill();
    }
    // 햇살 (오른쪽 위가 따뜻하게)
    g.save();
    g.beginPath();
    for (const [x, y, r] of all) {
      g.moveTo(x + r, y);
      g.arc(x, y, r, 0, TAU);
    }
    g.clip();
    g.fillStyle = radg(g, R(0.82), top - R(0.02), R(0.02), R(0.45), [0, 'rgba(255,224,140,.5)'], [1, 'rgba(255,224,140,0)']);
    g.fillRect(0, 0, w, R(0.34));
    g.restore();
    // 윗면 (발 딛는 판판한 곳)
    g.fillStyle = lin(g, 0, top, 0, top + R(0.08), [0, '#ffffff'], [1, 'rgba(255,255,255,0)']);
    ell(g, w / 2, top + R(0.035), R(0.36), R(0.04));
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.9)';
    for (const [x, y, r] of pts.slice(1, 6)) {
      ell(g, x - r * 0.2, y - r * 0.45, r * 0.4, r * 0.18, -0.2);
      g.fill();
    }
    // 아래 그늘
    g.fillStyle = 'rgba(120,150,210,.25)';
    for (const [x, y, r] of under) {
      ell(g, x, y + r * 0.45, r * 0.8, r * 0.35);
      g.fill();
    }
  });
  b = { sky, far, mid, isle };
  BG.set(key, b);
  if (BG.size > 14) BG.delete(BG.keys().next().value!);
  return b;
}

// ── 거인 ──
/** 거인 몸 덩이 [x, y, r] (몸 반폭 = 1 기준) */
const GP: number[][] = [
  [0, 0.04, 0.74], [-0.6, 0.22, 0.44], [0.6, 0.22, 0.44], [-0.42, -0.36, 0.5], [0.02, -0.54, 0.56], [0.46, -0.34, 0.48],
  [-0.88, -0.02, 0.34], [0.88, 0.0, 0.34], [-0.3, 0.5, 0.4], [0.32, 0.5, 0.4], [-0.72, -0.3, 0.3], [0.74, -0.3, 0.3],
];
interface GLook { mood: 'sleep' | 'idle' | 'puff' | 'hurt' | 'sneeze' | 'deflate' | 'hide' | 'ko' | 'charge' | 'inhale' | 'happy'; puff: number; t: number; lookX: number; lookY: number; burst: number; squash: number; blink: boolean }
function drawGiant(ctx: C2, look: number, k: number, L: GLook, body: string, shade: string, P: Pal, seed: number) {
  const t = L.t;
  ctx.save();
  // 숨쉬기 · 부풀기 · 찌그러짐
  const breathe = 1 + Math.sin(t * 0.05 + seed) * 0.02;
  const inflate = L.mood === 'puff' || L.mood === 'charge' ? 1 + L.puff * 0.1 : L.mood === 'inhale' ? 1 + L.puff * 0.22 : 1;
  const sx = breathe * inflate * (1 + L.squash * 0.2), sy = (2 - breathe) * inflate * (1 - L.squash * 0.18);
  ctx.scale(sx, sy);
  // 그늘 (아래 하늘에 옅게)
  // 몸
  const pts = GP.map(([x, y, r], i) => {
    const bx = L.burst * (x * 0.9 + (hsh(seed + i) - 0.5) * 0.6), by = L.burst * (y * 0.9 + (hsh(seed + i + 7) - 0.5) * 0.5 - 0.1);
    return [x * k + bx * k, y * k * 0.72 + by * k, r * k * (1 - L.burst * 0.25)];
  });
  const shape = (grow: number) => {
    ctx.beginPath();
    for (const [x, y, r] of pts) {
      ctx.moveTo(x + r + grow, y);
      ctx.arc(x, y, r + grow, 0, TAU);
    }
  };
  ctx.fillStyle = P.line;
  shape(k * 0.045);
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, -k * 0.75, 0, k * 0.7, [0, '#ffffff'], [0.35, body], [0.8, shade], [1, shade]);
  shape(0);
  ctx.fill();
  // 번개 구름: 몸 안에서 번쩍
  if (look === 3 || L.mood === 'charge') {
    const fl = L.mood === 'charge' ? 0.35 + 0.35 * Math.abs(Math.sin(t * 0.45)) : 0.08;
    ctx.save();
    shape(0);
    ctx.clip();
    ctx.fillStyle = `rgba(255,230,90,${fl})`;
    ctx.fillRect(-k * 1.4, -k, k * 2.8, k * 2);
    ctx.restore();
  }
  // 햇살 테두리 (오른쪽 위 해 쪽이 따뜻하게)
  ctx.save();
  shape(0);
  ctx.clip();
  ctx.fillStyle = radg(ctx, k * 1.0, -k * 0.95, k * 0.1, k * 1.5, [0, 'rgba(255,226,140,.55)'], [0.5, 'rgba(255,226,140,.18)'], [1, 'rgba(255,226,140,0)']);
  ctx.fillRect(-k * 1.6, -k * 1.4, k * 3.2, k * 2.8);
  ctx.restore();
  // 몽글 하이라이트
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  for (const i of [3, 4, 5, 10]) {
    const [x, y, r] = pts[i];
    ell(ctx, x - r * 0.25, y - r * 0.4, r * 0.38, r * 0.2, -0.35);
    ctx.fill();
  }
  // 아래 그늘 몽글
  ctx.fillStyle = 'rgba(60,80,140,.12)';
  for (const i of [8, 9, 1, 2]) {
    const [x, y, r] = pts[i];
    ell(ctx, x, y + r * 0.45, r * 0.7, r * 0.3);
    ctx.fill();
  }
  // 무지개 대왕: 무지개 왕관
  if (look === 6) {
    const cy = -k * 0.68 - L.burst * k * 0.3;
    RBC.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = k * 0.055;
      ctx.beginPath();
      ctx.arc(0, cy + k * 0.2, k * (0.5 - i * 0.05), Math.PI * 1.12, Math.PI * 1.88);
      ctx.stroke();
    });
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = '#ffd23a';
      starPath(ctx, (i - 1) * k * 0.3, cy - k * 0.12 - (i === 1 ? k * 0.08 : 0), k * (i === 1 ? 0.1 : 0.07));
      ctx.fill();
      ctx.strokeStyle = '#b07a10';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
  // 우박 구름: 몸에 붙은 얼음 알갱이 · 눈구름: 눈 결정 장식
  if (look === 1 || look === 2) {
    for (let i = 0; i < 6; i++) {
      const a = -2.6 + i * 0.4, x = Math.cos(a) * k * 0.9, y = Math.sin(a) * k * 0.62;
      ctx.save();
      ctx.translate(x, y);
      if (look === 1) {
        ctx.rotate(i);
        ctx.fillStyle = '#e8f6ff';
        ctx.strokeStyle = P.line;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let j = 0; j < 5; j++) {
          const aa = (j / 5) * TAU, q = k * 0.05 * (0.8 + 0.3 * hsh(i * 5 + j));
          j ? ctx.lineTo(Math.cos(aa) * q, Math.sin(aa) * q) : ctx.moveTo(Math.cos(aa) * q, Math.sin(aa) * q);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#a8c4ff';
        ctx.lineWidth = 1.6;
        for (let j = 0; j < 3; j++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath();
          ctx.moveTo(-k * 0.045, 0);
          ctx.lineTo(k * 0.045, 0);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  // ── 얼굴 ──
  const fy = k * 0.02;
  const eyeY = fy - k * 0.15, eyeX = k * 0.34, ew = k * 0.15, eh = k * 0.19;
  const m = L.mood;
  // 볼 (부풀면 크게)
  const cheekR = k * (0.13 + (m === 'puff' || m === 'charge' ? L.puff * 0.2 : 0) + (m === 'inhale' ? L.puff * 0.1 : 0));
  for (const sd of [-1, 1]) {
    const cx = sd * k * (0.55 + (m === 'puff' ? L.puff * 0.06 : 0)), cy = fy + k * 0.24;
    if (m === 'puff' || m === 'charge') {
      ctx.fillStyle = lin(ctx, 0, cy - cheekR, 0, cy + cheekR, [0, '#ffffff'], [1, body]);
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 2;
      ell(ctx, cx, cy, cheekR, cheekR * 0.92);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = m === 'hurt' || m === 'sneeze' ? 'rgba(255,110,130,.55)' : `${P.cheek}cc`;
    ell(ctx, cx, cy + cheekR * 0.1, cheekR * 0.75, cheekR * 0.5);
    ctx.fill();
  }
  // 눈
  const shut = m === 'sleep' || m === 'hide' || L.blink || m === 'sneeze';
  for (const sd of [-1, 1]) {
    const ex = sd * eyeX, ey = eyeY;
    if (m === 'ko') {
      ctx.strokeStyle = P.line;
      ctx.lineWidth = k * 0.035;
      ctx.beginPath();
      for (let a = 0; a < 4.5 * Math.PI; a += 0.3) {
        const q = (a / (4.5 * Math.PI)) * ew;
        a ? ctx.lineTo(ex + Math.cos(a + t * 0.2) * q, ey + Math.sin(a + t * 0.2) * q) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
      continue;
    }
    if (m === 'hurt' || (m === 'sneeze' && L.burst > 0.05)) {
      ctx.strokeStyle = P.line;
      ctx.lineWidth = k * 0.045;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ex - ew * 0.8, ey - eh * 0.5);
      ctx.lineTo(ex + ew * 0.7 * -sd * -1, ey);
      ctx.lineTo(ex - ew * 0.8, ey + eh * 0.5);
      ctx.stroke();
      continue;
    }
    if (shut) {
      ctx.strokeStyle = P.line;
      ctx.lineWidth = k * 0.04;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, ey - eh * 0.2, ew * 0.9, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    const squint = m === 'puff' || m === 'charge' ? 0.7 : m === 'happy' ? 0.6 : 1;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = P.line;
    ctx.lineWidth = k * 0.03;
    ell(ctx, ex, ey, ew, eh * squint);
    ctx.fill();
    ctx.stroke();
    const px = ex + L.lookX * ew * 0.42, py = ey + L.lookY * eh * 0.4 * squint;
    ctx.fillStyle = '#1d2a48';
    ell(ctx, px, py, ew * 0.55, eh * 0.55 * squint);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, px - ew * 0.18, py - eh * 0.2 * squint, ew * 0.18, ew * 0.18);
    ctx.fill();
    if (m === 'happy') {
      ctx.fillStyle = body;
      ell(ctx, ex, ey + eh * 0.55, ew * 1.2, eh * 0.45);
      ctx.fill();
    }
  }
  // 눈썹
  const browA = m === 'puff' || m === 'charge' ? 0.42 : m === 'hurt' || m === 'deflate' ? -0.35 : m === 'sleep' ? -0.1 : m === 'happy' ? -0.15 : 0.12;
  ctx.strokeStyle = P.line;
  ctx.lineWidth = k * 0.06;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const bx = sd * eyeX, by = eyeY - eh * 1.25 - (m === 'hurt' ? k * 0.04 : 0);
    ctx.beginPath();
    ctx.moveTo(bx - sd * ew * 0.9, by - Math.sin(browA) * ew * -0.9 * 1);
    ctx.lineTo(bx + sd * ew * 0.9, by + Math.sin(browA) * ew * 0.9 * 1 - k * 0.02);
    ctx.stroke();
  }
  // 입
  const my = fy + k * 0.39;
  ctx.lineWidth = k * 0.035;
  ctx.strokeStyle = P.line;
  ctx.fillStyle = '#7a2a3a';
  if (m === 'sleep') {
    const o = 0.5 + 0.5 * Math.sin(t * 0.04);
    ell(ctx, 0, my, k * (0.08 + o * 0.08), k * (0.05 + o * 0.14));
    ctx.fill();
    ctx.stroke();
  } else if (m === 'puff' || m === 'charge') {
    ctx.beginPath();
    ctx.moveTo(-k * 0.08, my);
    ctx.quadraticCurveTo(0, my - k * 0.04, k * 0.08, my);
    ctx.stroke();
    ell(ctx, 0, my, k * 0.03, k * 0.025);
    ctx.fill();
  } else if (m === 'inhale') {
    ell(ctx, 0, my, k * 0.06, k * 0.06);
    ctx.fill();
    ctx.stroke();
  } else if (m === 'hurt' || m === 'deflate') {
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = -k * 0.16 + (i / 8) * k * 0.32, y = my + Math.sin(i * 1.6 + t * 0.5) * k * 0.025;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    if (m === 'deflate') {
      ell(ctx, 0, my, k * 0.05, k * 0.05);
      ctx.fill();
    }
  } else if (m === 'sneeze') {
    const big = L.burst > 0.05;
    ell(ctx, 0, my, k * (big ? 0.2 : 0.07), k * (big ? 0.16 : 0.06));
    ctx.fill();
    ctx.stroke();
  } else if (m === 'ko') {
    ell(ctx, 0, my, k * 0.1, k * 0.08);
    ctx.fill();
    ctx.stroke();
  } else if (m === 'hide') {
    // 메롱
    ctx.beginPath();
    ctx.arc(0, my - k * 0.03, k * 0.12, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
    ctx.fillStyle = '#ff7a96';
    ell(ctx, k * 0.02, my + k * 0.08, k * 0.06, k * 0.07);
    ctx.fill();
    ctx.stroke();
  } else {
    // 우쭐한 웃음
    ctx.beginPath();
    ctx.moveTo(-k * 0.16, my - k * 0.02);
    ctx.quadraticCurveTo(0, my + k * 0.13, k * 0.16, my - k * 0.02);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-k * 0.08, my - k * 0.005, k * 0.16, k * 0.03);
  }
  // 코 (약점: 반짝)
  const nr = k * 0.19, ny = fy + k * 0.06;
  ctx.fillStyle = radg(ctx, -nr * 0.3, ny - nr * 0.3, nr * 0.1, nr * 1.2, [0, '#ffffff'], [0.35, P.nose], [1, P.line]);
  ctx.strokeStyle = P.line;
  ctx.lineWidth = k * 0.03;
  ell(ctx, 0, ny, nr, nr * 0.85);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ell(ctx, -nr * 0.35, ny - nr * 0.35, nr * 0.25, nr * 0.16, -0.5);
  ctx.fill();
  if (m === 'sneeze' && L.burst < 0.05) {
    // 콧구멍 벌름
    ctx.fillStyle = P.line;
    for (const sd of [-1, 1]) {
      ell(ctx, sd * nr * 0.3, ny + nr * 0.3, nr * 0.14, nr * 0.1);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ── 꼬마 ──
/** 노란 우비 꼬마. (x, y) = 발, k = 키(px). pose 0 서기 · 1 우산 듦 · 2 받아침 · 3 젖음 · 4 찌릿 · 5 만세 · 6 울상 */
function drawKid(ctx: C2, x: number, y: number, k: number, pose: number, t: number, hx: number, hy: number) {
  ctx.save();
  ctx.translate(x, y);
  const bob = pose === 5 ? -Math.abs(Math.sin(t * 0.18)) * k * 0.12 : Math.sin(t * 0.08) * k * 0.008;
  const shake = pose === 3 ? Math.sin(t * 1.3) * k * 0.035 : pose === 4 ? Math.sin(t * 2.1) * k * 0.02 : 0;
  ctx.translate(shake, bob);
  const lw = Math.max(1.6, k * 0.03);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 장화
  for (const sd of [-1, 1]) {
    ctx.fillStyle = lin(ctx, 0, -k * 0.16, 0, 0, [0, '#ff6a5a'], [1, '#c9302a']);
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = lw;
    rr(ctx, sd * k * 0.13 - k * 0.075, -k * 0.16, k * 0.15, k * 0.16, k * 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    rr(ctx, sd * k * 0.13 - k * 0.045, -k * 0.14, k * 0.03, k * 0.08, k * 0.015);
    ctx.fill();
  }
  // 우비 몸통 (A자)
  const hem = -k * 0.13, sh = -k * 0.58;
  ctx.fillStyle = lin(ctx, -k * 0.3, 0, k * 0.3, 0, [0, '#ffe169'], [0.55, '#ffd23a'], [1, '#e9a81c']);
  ctx.strokeStyle = KID_OUT;
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(-k * 0.17, sh);
  ctx.quadraticCurveTo(-k * 0.3, -k * 0.3, -k * 0.29, hem);
  ctx.quadraticCurveTo(0, hem + k * 0.05, k * 0.29, hem);
  ctx.quadraticCurveTo(k * 0.3, -k * 0.3, k * 0.17, sh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 단추 · 주머니
  ctx.fillStyle = '#3d7be0';
  for (const by of [-0.46, -0.36, -0.26]) {
    ell(ctx, 0, k * by, k * 0.022, k * 0.022);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(150,90,10,.6)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-k * 0.08, -k * 0.13);
  ctx.lineTo(-k * 0.08, -k * 0.5);
  ctx.stroke();
  // 팔 (손은 우산 손잡이 쪽으로)
  const hxl = hx - x, hyl = hy - y - bob;
  for (const sd of [-1, 1]) {
    const shx = sd * k * 0.15, shy = sh + k * 0.06;
    const tx = pose === 5 ? sd * k * 0.32 : hxl + sd * k * 0.03, ty = pose === 5 ? -k * 0.95 : hyl + k * 0.02;
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = k * 0.11 + lw;
    ctx.beginPath();
    ctx.moveTo(shx, shy);
    ctx.quadraticCurveTo(shx + sd * k * 0.08, (shy + ty) / 2 + k * 0.05, tx, ty);
    ctx.stroke();
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = k * 0.11;
    ctx.stroke();
    ctx.fillStyle = '#ffe0c4';
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = lw * 0.8;
    ell(ctx, tx, ty, k * 0.05, k * 0.05);
    ctx.fill();
    ctx.stroke();
  }
  // 머리 + 모자
  const hy0 = -k * 0.74;
  ctx.fillStyle = '#ffe0c4';
  ctx.strokeStyle = KID_OUT;
  ctx.lineWidth = lw;
  ell(ctx, 0, hy0, k * 0.2, k * 0.19);
  ctx.fill();
  ctx.stroke();
  // 찌릿: 부스스한 머리카락
  if (pose === 4) {
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * k * 0.18, hy0 + Math.sin(a) * k * 0.17);
      ctx.lineTo(Math.cos(a) * k * (0.3 + hsh(i + t) * 0.06), hy0 + Math.sin(a) * k * (0.3 + hsh(i) * 0.06));
      ctx.stroke();
    }
  }
  // 모자 (노란 방수 모자)
  ctx.fillStyle = lin(ctx, 0, hy0 - k * 0.25, 0, hy0, [0, '#ffe878'], [1, '#f2b42a']);
  ctx.beginPath();
  ctx.ellipse(0, hy0 - k * 0.05, k * 0.22, k * 0.17, 0, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, hy0 - k * 0.045, k * 0.31, k * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ell(ctx, -k * 0.08, hy0 - k * 0.16, k * 0.06, k * 0.025, -0.4);
  ctx.fill();
  // 얼굴
  const ey = hy0 + k * 0.03;
  ctx.fillStyle = '#ff9fa8';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.12, ey + k * 0.06, k * 0.04, k * 0.025);
    ctx.fill();
  }
  ctx.fillStyle = '#2a1a10';
  ctx.strokeStyle = '#2a1a10';
  if (pose === 3 || pose === 6) {
    ctx.lineWidth = 2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * k * 0.1, ey - k * 0.03);
      ctx.lineTo(sd * k * 0.05, ey);
      ctx.lineTo(sd * k * 0.1, ey + k * 0.03);
      ctx.stroke();
    }
    ell(ctx, 0, ey + k * 0.085, k * 0.035, k * 0.03);
    ctx.fill();
  } else if (pose === 2 || pose === 5) {
    ctx.lineWidth = 2.2;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * k * 0.075, ey + k * 0.01, k * 0.035, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.fillStyle = '#c03a3a';
    ctx.beginPath();
    ctx.arc(0, ey + k * 0.07, k * 0.05, 0, Math.PI);
    ctx.closePath();
    ctx.fill();
  } else {
    const look = pose === 1 ? -0.4 : 0;
    for (const sd of [-1, 1]) {
      ctx.fillStyle = '#2a1a10';
      ell(ctx, sd * k * 0.075, ey, k * 0.034, k * 0.046);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, sd * k * 0.075 - k * 0.01, ey - k * 0.015 + look * k * 0.01, k * 0.012, k * 0.012);
      ctx.fill();
    }
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    if (pose === 1) ctx.arc(k * 0.01, ey + k * 0.06, k * 0.03, Math.PI * 0.1, Math.PI * 0.75);
    else ctx.arc(0, ey + k * 0.05, k * 0.035, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    if (pose === 1) {
      ctx.lineWidth = 1.8;
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * k * 0.115, ey - k * 0.075);
        ctx.quadraticCurveTo(sd * k * 0.08, ey - k * 0.075, sd * k * 0.045, ey - k * 0.055);
        ctx.stroke();
      }
    }
  }
  // 젖음: 물 뚝뚝 · 그을음
  if (pose === 3) {
    ctx.fillStyle = 'rgba(90,170,255,.85)';
    for (let i = 0; i < 5; i++) {
      const dx = (hsh(i + 3) - 0.5) * k * 0.5, dy = ((t * 0.9 + i * 13) % 30) / 30;
      ell(ctx, dx, hy0 + dy * k * 0.7, k * 0.018, k * 0.03);
      ctx.fill();
    }
  }
  if (pose === 4) {
    ctx.fillStyle = 'rgba(60,50,50,.35)';
    ell(ctx, k * 0.05, ey + k * 0.02, k * 0.12, k * 0.06);
    ctx.fill();
  }
  ctx.restore();
}

/** 우산: (px, py) = 우산 중심, a = 향한 쪽, open 0~1, R0 = 반지름(px), rb = 무지개 칸, wet = 젖은 비율, dent = 눌림, zap = 그을림 */
function drawUmbrella(ctx: C2, part: 0 | 1, px: number, py: number, a: number, open: number, R0: number, rb: number, rbFull: boolean, wet: number, dent: number, zap: number, t: number, hx: number, hy: number) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (open < 0.08) {
    if (part === 0) return void ctx.restore();
    // 접힌 우산: 꼬마 오른쪽에 지팡이처럼
    hx += R0 * 0.5;
    hy += R0 * 0.1;
    const ca = -Math.PI / 2 + 0.3, L = R0 * 1.55, ex = hx + Math.cos(ca) * L, ey = hy + Math.sin(ca) * L;
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = R0 * 0.26;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ca) * L * 0.3, hy + Math.sin(ca) * L * 0.3);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = '#7fd0ff';
    ctx.lineWidth = R0 * 0.2;
    ctx.stroke();
    ctx.strokeStyle = '#fff6e2';
    ctx.lineWidth = R0 * 0.07;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(ca) * L * 0.4, hy + Math.sin(ca) * L * 0.4);
    ctx.lineTo(hx + Math.cos(ca) * L * 0.85, hy + Math.sin(ca) * L * 0.85);
    ctx.stroke();
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = R0 * 0.1;
    ctx.beginPath();
    ctx.arc(hx - R0 * 0.08, hy + R0 * 0.05, R0 * 0.1, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const e = open < 1 ? 1 + 1.7 * Math.pow(open - 1, 3) + 0.7 * Math.pow(open - 1, 2) : 1;
  const Wr = R0 * 1.1 * (0.3 + 0.7 * e), H = R0 * (0.92 + 0.3 * (1 - e)) * (1 - dent * 0.16), c0 = -R0 * 0.1;
  const ux = Math.cos(a), uy = Math.sin(a);
  const apX = px + ux * (-c0 + H), apY = py + uy * (-c0 + H);
  if (part === 0) {
    // 대 (꼬마 뒤): 손에서 꼭지까지
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = R0 * 0.1 + 2.2;
    ctx.beginPath();
    ctx.moveTo(hx - ux * R0 * 0.25, hy - uy * R0 * 0.25);
    ctx.lineTo(apX + ux * R0 * 0.16, apY + uy * R0 * 0.16);
    ctx.stroke();
    ctx.strokeStyle = '#e4e9f0';
    ctx.lineWidth = R0 * 0.1;
    ctx.stroke();
    return void ctx.restore();
  }
  ctx.translate(px, py);
  ctx.rotate(a + Math.PI / 2);
  const N = 5;
  const dome = () => {
    ctx.beginPath();
    ctx.moveTo(-Wr, c0);
    ctx.ellipse(0, c0, Wr, H, 0, Math.PI, Math.PI * 2);
    for (let i = N; i > 0; i--) {
      const x0 = -Wr + (2 * Wr * i) / N, x1 = -Wr + (2 * Wr * (i - 1)) / N;
      ctx.quadraticCurveTo((x0 + x1) / 2, c0 - R0 * 0.16 * e, x1, c0);
    }
    ctx.closePath();
  };
  // 그림자
  ctx.save();
  ctx.translate(2, 4);
  ctx.fillStyle = 'rgba(30,60,110,.2)';
  dome();
  ctx.fill();
  ctx.restore();
  ctx.save();
  dome();
  ctx.clip();
  const ax = 0, ay = c0 - H;
  for (let i = 0; i < N; i++) {
    const x0 = -Wr + (2 * Wr * i) / N, x1 = x0 + (2 * Wr) / N;
    const lit = rbFull || i < rb;
    ctx.fillStyle = lit ? RBC[rbFull ? (i + Math.floor(t / 5)) % RBC.length : i] : i % 2 ? '#7fd0ff' : '#fff6e2';
    ctx.beginPath();
    ctx.moveTo(ax, ay - 4);
    ctx.lineTo(x0 * 1.25, c0 + R0 * 0.3);
    ctx.lineTo(x1 * 1.25, c0 + R0 * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  // 입체감: 왼쪽 위 빛, 오른쪽 아래 그늘
  ctx.fillStyle = lin(ctx, -Wr, 0, Wr, 0, [0, 'rgba(255,255,255,.35)'], [0.45, 'rgba(255,255,255,0)'], [1, 'rgba(20,40,90,.28)']);
  ctx.fillRect(-Wr * 1.3, c0 - H * 1.3, Wr * 2.6, H * 1.6);
  ctx.fillStyle = lin(ctx, 0, c0 - H, 0, c0, [0, 'rgba(255,255,255,0)'], [0.75, 'rgba(255,255,255,0)'], [1, 'rgba(20,40,90,.22)']);
  ctx.fillRect(-Wr * 1.3, c0 - H * 1.3, Wr * 2.6, H * 1.6);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ell(ctx, -Wr * 0.35, c0 - H * 0.7, Wr * 0.28, H * 0.12, -0.5);
  ctx.fill();
  // 젖은 얼룩 · 찢어짐
  const n = Math.round(wet * 9);
  for (let i = 0; i < n; i++) {
    const xx = (hsh(i * 3 + 1) * 1.5 - 0.75) * Wr, yy = c0 - H * (0.15 + hsh(i * 3 + 2) * 0.6);
    ctx.fillStyle = 'rgba(30,60,120,.3)';
    ell(ctx, xx, yy, R0 * 0.14, R0 * 0.09, hsh(i) * 2);
    ctx.fill();
    if (i % 2 === 1) {
      ctx.strokeStyle = KID_OUT;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const q = (j - 2) * R0 * 0.05;
        j ? ctx.lineTo(xx + q, yy + (j % 2 ? -3 : 3)) : ctx.moveTo(xx + q, yy + 3);
      }
      ctx.stroke();
    }
  }
  if (zap > 0) {
    ctx.fillStyle = `rgba(40,30,30,${0.5 * zap})`;
    ctx.fillRect(-Wr * 1.3, c0 - H * 1.3, Wr * 2.6, H * 1.6);
  }
  ctx.restore();
  // 살 (꼭지에서 테두리로 휘어 내려간다)
  ctx.strokeStyle = 'rgba(91,53,18,.6)';
  ctx.lineWidth = 1.4;
  for (let i = 1; i < N; i++) {
    const x1 = -Wr + (2 * Wr * i) / N;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.quadraticCurveTo(x1 * 1.12, c0 - H * 0.55, x1, c0);
    ctx.stroke();
  }
  dome();
  ctx.strokeStyle = KID_OUT;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  if (rbFull) {
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, c0, Wr + 3, H + 3, 0, Math.PI, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,246,160,.45)';
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 0.4)})`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }
  // 꼭지
  ctx.fillStyle = '#ffd23a';
  ctx.strokeStyle = KID_OUT;
  ctx.lineWidth = 1.6;
  ell(ctx, 0, ay - R0 * 0.12, R0 * 0.075, R0 * 0.075);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 날아오는 것 그리기 (k = 반지름 px, a = 날아가는 쪽) */
function drawShot(ctx: C2, kind: PK, x: number, y: number, k: number, a: number, t: number, spin: number, glow: boolean) {
  ctx.save();
  ctx.translate(x, y);
  if (glow) {
    ctx.fillStyle = radg(ctx, 0, 0, k * 0.3, k * 2.4, [0, 'rgba(255,240,150,.85)'], [1, 'rgba(255,240,150,0)']);
    ctx.beginPath();
    ctx.arc(0, 0, k * 2.4, 0, TAU);
    ctx.fill();
  }
  if (kind === 'rain') {
    ctx.rotate(a);
    dropPath(ctx, k);
    ctx.fillStyle = lin(ctx, -k, -k, k, k, [0, '#bfe6ff'], [0.4, '#5fb4ff'], [1, '#2a74d8']);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ell(ctx, k * 0.15, -k * 0.38, k * 0.32, k * 0.16, 0.3);
    ctx.fill();
  } else if (kind === 'hail') {
    ctx.rotate(spin + t * 0.15);
    ctx.beginPath();
    for (let j = 0; j < 7; j++) {
      const aa = (j / 7) * TAU, q = k * (0.85 + 0.3 * hsh(j * 3.1));
      j ? ctx.lineTo(Math.cos(aa) * q, Math.sin(aa) * q) : ctx.moveTo(Math.cos(aa) * q, Math.sin(aa) * q);
    }
    ctx.closePath();
    ctx.fillStyle = lin(ctx, -k, -k, k, k, [0, '#ffffff'], [0.5, '#cfe8ff'], [1, '#7fa6d8']);
    ctx.fill();
    ctx.strokeStyle = '#2b4a7a';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-k * 0.3, -k * 0.4);
    ctx.lineTo(k * 0.15, -k * 0.1);
    ctx.lineTo(k * 0.45, -k * 0.35);
    ctx.stroke();
  } else {
    ctx.rotate(spin + t * 0.05);
    ctx.fillStyle = 'rgba(200,230,255,.45)';
    ctx.beginPath();
    ctx.arc(0, 0, k * 1.05, 0, TAU);
    ctx.fill();
    for (const [c, lw] of [['#4a78c0', 4.2], ['#ffffff', 2.2]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      for (let j = 0; j < 6; j++) {
        const aa = (j / 6) * TAU, cx = Math.cos(aa), cy = Math.sin(aa);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(cx * k, cy * k);
        ctx.moveTo(cx * k * 0.55, cy * k * 0.55);
        ctx.lineTo(cx * k * 0.55 + Math.cos(aa + 0.8) * k * 0.3, cy * k * 0.55 + Math.sin(aa + 0.8) * k * 0.3);
        ctx.moveTo(cx * k * 0.55, cy * k * 0.55);
        ctx.lineTo(cx * k * 0.55 + Math.cos(aa - 0.8) * k * 0.3, cy * k * 0.55 + Math.sin(aa - 0.8) * k * 0.3);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y + press * k * 0.1);
  ctx.rotate(-0.25);
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

/** 구경꾼 참새 (구름 섬 끝) */
function drawBird(ctx: C2, x: number, y: number, k: number, t: number, cheer: number, wet: number, face: number) {
  ctx.save();
  const hop = cheer > 0 ? -Math.abs(Math.sin(cheer * 0.35)) * k * 0.5 : 0;
  ctx.translate(x, y + hop);
  ctx.scale(face, 1);
  ctx.fillStyle = 'rgba(60,90,150,.2)';
  ell(ctx, 0, -hop + 1, k * 0.45, k * 0.1);
  ctx.fill();
  ctx.strokeStyle = KID_OUT;
  ctx.lineWidth = 1.6;
  ctx.lineJoin = 'round';
  // 몸
  ctx.fillStyle = lin(ctx, 0, -k, 0, 0, [0, '#c8875a'], [1, '#9a5c34']);
  ell(ctx, 0, -k * 0.42, k * 0.42, k * 0.36);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2dc';
  ell(ctx, k * 0.12, -k * 0.32, k * 0.24, k * 0.22);
  ctx.fill();
  // 꼬리
  ctx.fillStyle = '#7a4424';
  ctx.beginPath();
  ctx.moveTo(-k * 0.35, -k * 0.5);
  ctx.lineTo(-k * 0.7, -k * (0.7 + (cheer > 0 ? 0.2 : 0)));
  ctx.lineTo(-k * 0.6, -k * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 날개 (응원할 때 파닥)
  ctx.fillStyle = '#8a5030';
  ctx.save();
  ctx.translate(-k * 0.05, -k * 0.45);
  ctx.rotate(cheer > 0 ? -0.8 + Math.sin(t * 0.9) * 0.6 : 0.2);
  ell(ctx, -k * 0.1, 0, k * 0.24, k * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 머리 · 눈 · 부리
  ctx.fillStyle = '#b0703e';
  ell(ctx, k * 0.25, -k * 0.75, k * 0.24, k * 0.22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffb02e';
  ctx.beginPath();
  ctx.moveTo(k * 0.45, -k * 0.78);
  ctx.lineTo(k * 0.62, -k * 0.72);
  ctx.lineTo(k * 0.45, -k * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a1010';
  if (cheer > 0) {
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(k * 0.3, -k * 0.76, k * 0.05, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ell(ctx, k * 0.3, -k * 0.78, k * 0.045, k * 0.055);
    ctx.fill();
  }
  if (wet > 0) {
    ctx.fillStyle = 'rgba(90,170,255,.8)';
    for (let i = 0; i < 3; i++) {
      ell(ctx, (i - 1) * k * 0.25, -k * 0.1 + ((t + i * 9) % 20) * 0.6, k * 0.04, k * 0.06);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 웃는 해 (오른쪽 위 구경꾼) */
function drawSun(ctx: C2, x: number, y: number, k: number, t: number, mood: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 0.004);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    ctx.fillStyle = i % 2 ? 'rgba(255,214,80,.9)' : 'rgba(255,190,60,.85)';
    ctx.beginPath();
    ctx.moveTo(k * 0.95, -k * 0.13);
    ctx.lineTo(k * (1.4 + (i % 2 ? 0 : 0.15) + Math.sin(t * 0.06 + i) * 0.06), 0);
    ctx.lineTo(k * 0.95, k * 0.13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = radg(ctx, -k * 0.3, -k * 0.3, k * 0.1, k, [0, '#fff6b0'], [0.6, '#ffd23a'], [1, '#f5a51c']);
  ctx.strokeStyle = '#c87a10';
  ctx.lineWidth = 2;
  ell(ctx, 0, 0, k, k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7a4a10';
  ctx.strokeStyle = '#7a4a10';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  if (mood === 1) {
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sd * k * 0.32, -k * 0.08, k * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  } else if (mood === 2) {
    for (const sd of [-1, 1]) {
      ell(ctx, sd * k * 0.32, -k * 0.12, k * 0.12, k * 0.14);
      ctx.fill();
    }
  } else
    for (const sd of [-1, 1]) {
      ell(ctx, sd * k * 0.32, -k * 0.1, k * 0.08, k * 0.1);
      ctx.fill();
    }
  ctx.fillStyle = 'rgba(255,120,90,.55)';
  for (const sd of [-1, 1]) {
    ell(ctx, sd * k * 0.55, k * 0.15, k * 0.14, k * 0.08);
    ctx.fill();
  }
  ctx.beginPath();
  if (mood === 2) {
    ctx.fillStyle = '#7a2a1a';
    ell(ctx, 0, k * 0.32, k * 0.14, k * 0.16);
    ctx.fill();
  } else {
    ctx.arc(0, k * 0.18, k * 0.3, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  ctx.restore();
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const KID_H = 0.23;

function giantLook(s: UmbState, g: Giant, t: number): GLook {
  const sinceHurt = s.t - g.hurtT, sinceSn = s.t - g.sneezeT, sinceDf = s.t - g.deflT;
  let mood: GLook['mood'] = 'idle', puff = 0, burst = 0, squash = 0;
  const waiting = s.stage === 0 && s.firstPress < 0;
  if (g.st === KO) mood = 'ko';
  else if (waiting) mood = 'sleep';
  else if (sinceSn < 70) {
    mood = 'sneeze';
    burst = sinceSn < 12 ? 0 : 1.05 * Math.max(0, 1 - (sinceSn - 12) / 55) * Math.min(1, (sinceSn - 12) / 3);
  } else if (sinceHurt < 26) (mood = 'hurt'), (squash = Math.max(0, 1 - sinceHurt / 26) * Math.cos(sinceHurt * 0.5));
  else if (sinceDf < 50) mood = 'deflate';
  else if (g.st === PUFFS) {
    const need = g.atk ? PUFF[g.atk.k] : 30;
    puff = Math.min(1, g.stT / need);
    mood = g.atk?.k === 'bolt' ? 'charge' : g.atk?.k === 'gust' ? 'inhale' : 'puff';
  } else if (g.hidden && s.giants.filter(alive).length > 1) mood = 'hide';
  else if (s.phase === 'result' && !s.ok) mood = 'happy';
  // 눈은 꼬마(또는 가장 가까운 날아오는 것)를 본다
  let tx = PX, ty = PY;
  const p = s.projs.find((q) => q.st === 2) ?? s.projs.find((q) => q.st !== 2);
  if (p) (tx = p.x), (ty = p.y);
  const dx = tx - g.x, dy = ty - g.y, L = Math.hypot(dx, dy) || 1;
  const blink = (t + g.seed) % 170 < 7;
  return { mood, puff, t, lookX: dx / L, lookY: dy / L, burst, squash, blink };
}

function drawAll(ctx: C2, s: UmbState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const d = STAGES[s.stage], P = PAL[s.stage], t = s.t, wt = s.wt;
  const sc = typeof ctx.getTransform === 'function' ? ctx.getTransform().a || 1 : 1;
  const bg = getBg(Math.round(w), Math.round(h), s.stage, Math.min(3, Math.max(1, Math.round(sc))));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const play = s.phase === 'play';
  const slowVis = s.freeze > 0 ? 1 : s.slowT > 0 ? s.slowT / SLOW_T : 0;

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 해 · 먼 구름 · 가까운 구름 (시차) ──
  ctx.drawImage(bg.sky, 0, 0, w, h);
  const sunMood = t - (fx.memo.bigT ?? -999) < 60 ? 2 : t - s.parryT < 30 ? 1 : 0;
  drawSun(ctx, X(0.9), Y(0.215), R(0.05), t, sunMood);
  const farW = bg.far.width / sc, farH = bg.far.height / sc, midW = bg.mid.width / sc, midH = bg.mid.height / sc;
  const fo = -((wt * 0.06) % farW), mo = -((wt * 0.16 + s.wind * 4000 * 0) % midW);
  for (const o of [fo, fo + farW]) ctx.drawImage(bg.far, o, Y(0.66) - farH * 0.55, farW, farH);
  // 먼 하늘의 새 떼
  ctx.strokeStyle = 'rgba(40,80,140,.45)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    const bx = ((hsh(i + 90) * w + wt * (0.18 + i * 0.03)) % (w + 40)) - 20, by = Y(0.55 + hsh(i + 91) * 0.12) + Math.sin(wt * 0.05 + i) * 3, fl = Math.sin(wt * 0.25 + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(bx - 5, by - fl);
    ctx.quadraticCurveTo(bx - 2, by - 2, bx, by);
    ctx.quadraticCurveTo(bx + 2, by - 2, bx + 5, by - fl);
    ctx.stroke();
  }
  for (const o of [mo, mo + midW]) ctx.drawImage(bg.mid, o, Y(0.9) - midH * 0.6, midW, midH);
  // 무지개 가득: 하늘에도 무지개가 선명해진다
  const rbFull = s.rb >= RB_MAX && play;
  if (rbFull) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.2);
    ctx.lineWidth = R(0.03);
    RBC.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(X(0.5), Y(1.25), R(0.75 - i * 0.03), Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    });
    ctx.restore();
  }
  // 바람: 휙휙 줄
  if (s.windT > 0) {
    const dir = Math.sign(s.wind), a = Math.min(1, s.windT / 30);
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const yy = Y(0.18 + hsh(i + 60) * 1.05), len = R(0.14 + hsh(i + 61) * 0.16);
      const xx = ((hsh(i + 62) * w * 1.5 + t * 8 * (0.8 + hsh(i) * 0.6)) % (w * 1.5)) - w * 0.25;
      const x0 = dir > 0 ? xx : w - xx, wob = Math.sin(i + t * 0.2) * 4;
      for (const [c, lw] of [['rgba(90,150,220,.35)', 6], ['rgba(255,255,255,.95)', 3]] as [string, number][]) {
        ctx.strokeStyle = c;
        ctx.globalAlpha = a;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(x0, yy);
        ctx.bezierCurveTo(x0 - dir * len * 0.4, yy - 6, x0 - dir * len * 0.7, yy + wob, x0 - dir * len, yy + wob);
        // 끝이 동그랗게 말린다
        if (i % 3 === 0) ctx.arc(x0 - dir * len, yy + wob - R(0.015), R(0.015), Math.PI / 2, dir > 0 ? Math.PI * 2.2 : -Math.PI * 1.2, dir < 0);
        ctx.stroke();
      }
      // 날리는 꽃잎
      if (i % 4 === 1) {
        ctx.fillStyle = i % 8 === 1 ? '#ffb3c8' : '#ffe08a';
        ell(ctx, x0 - dir * len * 0.3, yy - R(0.03), R(0.01), R(0.006), t * 0.2 + i);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 1;
  }
  // ── 거인 ──
  for (const g of s.giants) {
    const k = R(gRx(g)), look = giantLook(s, g, t);
    let gx = X(g.x), gy = Y(g.y);
    if (g.st === KO) {
      const u = (s.t - g.koT) / 60;
      gy -= u * u * R(0.25);
      gx += Math.sin(u * 4) * R(0.02);
    }
    const body = g.look === 4 || g.look === 5 ? TWIN_BODY[g.look - 4][0] : P.body, shade = g.look === 4 || g.look === 5 ? TWIN_BODY[g.look - 4][1] : P.shade;
    ctx.save();
    if (g.st === KO) ctx.globalAlpha = Math.max(0, 1 - (s.t - g.koT) / 70);
    // 하늘에 드리운 옅은 그림자
    ctx.fillStyle = 'rgba(40,80,150,.12)';
    ell(ctx, gx, gy + k * 0.95, k * 0.8, k * 0.12);
    ctx.fill();
    ctx.translate(gx, gy);
    drawGiant(ctx, g.look, k, look, body, shade, P, g.seed);
    ctx.restore();
    // 쌍둥이 숨음: 비눗방울 방패
    if (look.mood === 'hide') {
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = radg(ctx, gx - k * 0.4, gy - k * 0.4, k * 0.1, k * 1.3, [0, 'rgba(255,255,255,.35)'], [0.7, 'rgba(180,220,255,.12)'], [1, 'rgba(200,170,255,.35)']);
      ell(ctx, gx, gy, k * 1.18, k * 0.95);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ell(ctx, gx - k * 0.55, gy - k * 0.5, k * 0.22, k * 0.1, -0.6);
      ctx.fill();
      ctx.restore();
    }
    // 잠: Zzz · 첫 꾹에 '!'
    if (look.mood === 'sleep') {
      font(0.045, 900);
      ctx.textAlign = 'center';
      for (let i = 0; i < 3; i++) {
        const u = ((t * 0.012 + i / 3) % 1), zx = gx - k * (0.95 + u * 0.35), zy = gy - k * (0.15 + u * 0.55);
        ctx.globalAlpha = Math.sin(u * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = OUT;
        ctx.lineWidth = 3;
        ctx.font = `900 ${Math.max(12, R(0.03 + u * 0.03))}px system-ui, sans-serif`;
        ctx.strokeText('Z', zx, zy);
        ctx.fillText('Z', zx, zy);
      }
      ctx.globalAlpha = 1;
    }
    // 번개 모으기: 몸 둘레 찌릿
    if (look.mood === 'charge') {
      ctx.save();
      ctx.strokeStyle = '#ffe14a';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i++) {
        const a0 = hsh(i + Math.floor(t / 4) * 7) * TAU, r0 = k * 1.05;
        ctx.beginPath();
        let x = gx + Math.cos(a0) * r0, y = gy + Math.sin(a0) * r0 * 0.75;
        ctx.moveTo(x, y);
        for (let j = 0; j < 3; j++) {
          x += Math.cos(a0) * k * 0.12 + (hsh(i * 9 + j + t) - 0.5) * k * 0.2;
          y += Math.sin(a0) * k * 0.1 + (hsh(i * 7 + j + t) - 0.5) * k * 0.2;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  // ── 번개 예고: 거인에서 우산까지 노란 지그재그 점선 ──
  for (const g of s.giants) {
    if (!(g.st === PUFFS && g.atk?.k === 'bolt' && play)) continue;
    const u = Math.min(1, g.stT / PUFF.bolt), danger = s.open > 0.25;
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -t * 1.5;
    ctx.strokeStyle = danger ? `rgba(255,90,60,${0.5 + 0.5 * u})` : `rgba(255,220,60,${0.4 + 0.4 * u})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const x0 = X(g.x), y0 = Y(g.y) + R(0.12), x1 = X(PX), y1 = Y(PY) - R(UR);
    for (let j = 0; j <= 6; j++) {
      const q = j / 6, xx = x0 + (x1 - x0) * q + (j % 2 ? 1 : -1) * R(0.03) * (j > 0 && j < 6 ? 1 : 0);
      j ? ctx.lineTo(xx, y0 + (y1 - y0) * q) : ctx.moveTo(xx, y0);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  // 번개 경고 배지: 꼬마 머리 위 (우산이 펴져 있으면 빨갛게 '접어요!')
  for (const g of s.giants) {
    if (!(g.st === PUFFS && g.atk?.k === 'bolt' && play)) continue;
    const u = Math.min(1, g.stT / PUFF.bolt), danger = s.open > 0.25, bx = X(PX) + R(0.17), by = Y(PY) - R(0.2), pul = 1 + 0.1 * Math.sin(t * 0.6);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pul, pul);
    ctx.fillStyle = danger ? '#ff5f6d' : '#ffe14a';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R(0.05), 0, TAU);
    ctx.fill();
    ctx.stroke();
    // 남은 시간 고리
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, R(0.062), -Math.PI / 2, -Math.PI / 2 + TAU * (1 - u));
    ctx.stroke();
    // 번개 모양
    ctx.fillStyle = danger ? '#ffffff' : '#20406a';
    ctx.beginPath();
    const q = R(0.032);
    ctx.moveTo(q * 0.25, -q);
    ctx.lineTo(-q * 0.5, q * 0.1);
    ctx.lineTo(-q * 0.02, q * 0.1);
    ctx.lineTo(-q * 0.3, q);
    ctx.lineTo(q * 0.55, -q * 0.15);
    ctx.lineTo(q * 0.05, -q * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (danger) {
      font(0.038, 900);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(20,40,80,.85)';
      ctx.strokeText('떼서 접어요!', bx + R(0.065), by);
      ctx.fillStyle = '#ffe14a';
      ctx.fillText('떼서 접어요!', bx + R(0.065), by);
    }
  }
  // ── 받아친 것이 날아갈 길 미리 보기 (누르는 동안) ──
  const cands = s.down && play ? parryCands(s) : [];
  if (s.down && play && s.open > 0.6) {
    const rb = s.rb >= RB_MAX;
    let x = PX + Math.cos(s.ang) * UR, y = PY + Math.sin(s.ang) * UR, vx = Math.cos(s.ang) * VR, vy = Math.sin(s.ang) * VR, wT = s.windT;
    const pts: number[][] = [[x, y]];
    let hit: { x: number; y: number; nose: boolean; hidden: boolean } | null = null;
    const home = d.assist >= 0.5 ? s.giants.find((g) => alive(g) && angDiff(Math.atan2(g.y - y, g.x - x), s.ang) < d.assist) : undefined;
    for (let i = 0; i < 70 && !hit; i++) {
      if (home) {
        const [nx, ny] = noseOf(home, home.x, home.y), L = Math.hypot(nx - x, ny - y) || 1e-6;
        (vx = ((nx - x) / L) * VR), (vy = ((ny - y) / L) * VR);
      }
      const x0 = x, y0 = y;
      if (wT > 0) vx += s.wind;
      wT--;
      x += vx;
      y += vy;
      pts.push([x, y]);
      for (const g of s.giants) {
        if (!alive(g)) continue;
        const f = faceHit(g, g.x, g.y, x0, y0, x, y, rb ? 0.06 : 0.026);
        if (f) hit = { x: f.x, y: noseOf(g, g.x, g.y)[1], nose: f.nose && !rb, hidden: g.hidden && s.giants.filter(alive).length > 1 };
      }
      if (y < 0.05 || x < -0.05 || x > 1.05) break;
    }
    const ready = cands.length > 0;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.setLineDash([R(0.012), R(0.02)]);
    ctx.lineDashOffset = -t * 1.2;
    ctx.strokeStyle = 'rgba(30,60,110,.35)';
    ctx.lineWidth = R(0.016);
    ctx.beginPath();
    pts.forEach(([px2, py2], i) => (i ? ctx.lineTo(X(px2), Y(py2)) : ctx.moveTo(X(px2), Y(py2))));
    ctx.stroke();
    ctx.strokeStyle = ready ? '#fff27a' : 'rgba(255,255,255,.9)';
    ctx.lineWidth = R(0.007);
    ctx.stroke();
    ctx.setLineDash([]);
    if (hit) {
      const hx2 = X(hit.x), hy2 = Y(hit.y), pul = 1 + 0.12 * Math.sin(t * 0.5);
      ctx.strokeStyle = hit.hidden ? 'rgba(160,170,200,.95)' : hit.nose ? '#ff4a6a' : '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hx2, hy2, R(hit.nose ? 0.034 : 0.026) * pul, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (const q of [0, 1, 2, 3]) {
        const aa = q * (Math.PI / 2) + t * 0.03;
        ctx.moveTo(hx2 + Math.cos(aa) * R(0.04) * pul, hy2 + Math.sin(aa) * R(0.04) * pul);
        ctx.lineTo(hx2 + Math.cos(aa) * R(0.055) * pul, hy2 + Math.sin(aa) * R(0.055) * pul);
      }
      ctx.stroke();
      if (hit.nose || hit.hidden) {
        font(0.038, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const lab = hit.hidden ? '퐁 — 숨었어요' : '코 ×2';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(20,40,80,.8)';
        const lx = hx2 + (hx2 < w / 2 ? 1 : -1) * R(0.13);
        ctx.strokeText(lab, lx, hy2 + R(0.01));
        ctx.fillStyle = hit.hidden ? '#dfe6ff' : '#ffe14a';
        ctx.fillText(lab, lx, hy2 + R(0.01));
      }
    }
    ctx.restore();
  }
  // ── 구름 섬 · 구경꾼 · 꼬마 · 우산 ──
  const isleH = bg.isle.height / sc, isleY = Y(KY) - R(0.06) + Math.sin(wt * 0.03) * 1.5;
  ctx.drawImage(bg.isle, 0, isleY, w, isleH);
  const kk = R(KID_H), kx = X(PX), ky = Y(KY) + Math.sin(wt * 0.03) * 1.5;
  ctx.fillStyle = 'rgba(50,90,160,.22)';
  ell(ctx, kx, ky + 2, kk * 0.36, kk * 0.07);
  ctx.fill();
  const cheer = Math.max(0, 50 - (t - s.birdT));
  drawBird(ctx, X(0.82), ky - R(0.005), R(0.05), t, cheer, t - s.wetT < 40 ? 1 : 0, -1);
  // 우산 그림자 (구름 위)
  if (s.open > 0.3) {
    ctx.fillStyle = 'rgba(50,90,160,.16)';
    ell(ctx, kx + Math.cos(s.ang) * R(0.06), ky + 3, R(0.11) * s.open, R(0.022));
    ctx.fill();
  }
  const sinceP = t - s.parryT, sinceWet = t - s.wetT, sinceZap = t - s.zapT;
  const pose = s.phase === 'result' ? (s.ok ? 5 : 6) : sinceZap < 50 ? 4 : sinceWet < 45 ? 3 : sinceP < 22 ? 2 : s.down ? 1 : 0;
  // 우산 각도: 받아친 직후엔 휘두른 쪽으로 '탁' 튕겼다 돌아온다
  let ua = s.ang, upx = X(PX), upy = Y(PY);
  if (sinceP < 12) {
    const u = sinceP / 12, kick = Math.sin(u * Math.PI) * R(0.035);
    upx += Math.cos(s.swatAng) * kick;
    upy += Math.sin(s.swatAng) * kick;
    ua = s.swatAng;
  }
  const handX = kx + Math.cos(ua) * R(0.01), handY = ky - kk * 0.42;
  const stuck = s.projs.find((p) => p.st === 1);
  const dent = stuck ? Math.min(1, stuck.stickT / 3) * (0.6 + 0.4 * Math.sin(t * 0.8)) : 0;
  const umbOpen = s.phase === 'result' ? 0 : s.down || s.open > 0 ? Math.max(s.open, s.down ? 0.08 : 0) : sinceP < 10 ? 1 - sinceP / 10 : 0;
  const drawUmb = (part: 0 | 1) => drawUmbrella(ctx, part, upx, upy, ua, umbOpen, R(UR), s.rb, rbFull, 1 - s.umb / s.umbMax, dent, Math.max(0, 1 - sinceZap / 120), t, handX, handY);
  // 대는 꼬마 뒤, 덮개는 앞
  drawUmb(0);
  drawKid(ctx, kx, ky, kk, pose, t, handX, handY);
  drawUmb(1);
  if (s.windT > 0) {
    const dir = Math.sign(s.wind), a = Math.min(1, s.windT / 30);
    // 바람 방향 배지 (위 띠 바로 아래)
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lab = dir > 0 ? '바람 →' : '← 바람', bw2 = ctx.measureText(lab).width + R(0.06), bx2 = X(0.2), by2 = Y(1.17);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    rr(ctx, bx2 - bw2 / 2, by2 - R(0.024), bw2, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2a6ad8';
    ctx.fillText(lab, bx2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // ── 날아오는 것 · 받아친 것 ──
  for (const p of s.projs) {
    const px2 = X(p.x), py2 = Y(p.y);
    let k = R(PR[p.k]) * 1.25;
    if (p.st === 2) {
      // 받아친 것: 위로 갈수록 작아진다(멀어짐) + 금빛 꼬리
      const g = s.giants.find(alive), depth = g ? clamp((PY - p.y) / (PY - g.y), 0, 1) : 0;
      k *= 1.25 - depth * 0.45;
      const sp = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / sp, uy = p.vy / sp;
      if (p.rb) {
        for (let i = 0; i < RBC.length; i++) {
          ctx.strokeStyle = RBC[i];
          ctx.lineWidth = R(0.012);
          ctx.globalAlpha = 0.9;
          const off = (i - 2.5) * R(0.011);
          ctx.beginPath();
          ctx.moveTo(px2 - uy * off, py2 + ux * off);
          ctx.lineTo(px2 - ux * R(0.32) - uy * off, py2 - uy * R(0.32) + ux * off);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = radg(ctx, px2, py2, 0, R(0.07), [0, '#ffffff'], [0.5, 'rgba(255,250,200,.9)'], [1, 'rgba(255,250,200,0)']);
        ctx.beginPath();
        ctx.arc(px2, py2, R(0.07), 0, TAU);
        ctx.fill();
        continue;
      }
      ctx.strokeStyle = 'rgba(255,240,140,.55)';
      ctx.lineWidth = k * 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(px2, py2);
      ctx.lineTo(px2 - ux * R(0.13), py2 - uy * R(0.13));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = k * 0.5;
      ctx.stroke();
      drawShot(ctx, p.k, px2, py2, k, Math.atan2(p.vy, p.vx), t, p.spin, true);
      continue;
    }
    // 날아오는 것: 우산에 닿을 자리 표시 + 받아칠 때 '지금!' 고리
    const ang = p.st === 1 ? s.ang + p.rel : Math.atan2(p.ey - p.sy, p.ex - p.sx);
    if (p.st === 0 && !p.passed && play) {
      const left = p.tc - s.swt;
      if (left < 70) {
        const cx = X(PX + Math.cos(p.ca) * UR), cy = Y(PY + Math.sin(p.ca) * UR), u = clamp(left / 70, 0, 1);
        ctx.strokeStyle = left < SP[p.k] * 0 + REACH / SP[p.k] ? '#ffe14a' : `rgba(255,255,255,${0.9 - u * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R(0.02) + u * R(0.07), 0, TAU);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.beginPath();
        ctx.arc(cx, cy, R(0.008), 0, TAU);
        ctx.fill();
      }
    }
    if (p.st === 1) {
      k *= 1 + 0.18 * Math.sin(p.stickT * 0.9);
      ctx.save();
      ctx.translate(px2, py2);
      ctx.rotate(ang + Math.PI);
      ctx.scale(0.75, 1.25);
      drawShot(ctx, p.k, 0, 0, k, 0, t, p.spin, false);
      ctx.restore();
      continue;
    }
    // 꼬리 (속도 선)
    ctx.strokeStyle = p.k === 'hail' ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.5)';
    ctx.lineWidth = k * 0.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(px2, py2);
    const back = p.k === 'hail' ? R(0.08) : R(0.045);
    ctx.lineTo(px2 - Math.cos(ang) * back, py2 - Math.sin(ang) * back);
    ctx.stroke();
    drawShot(ctx, p.k, px2, py2, k, ang, t, p.spin, false);
  }
  // 번개 꽂힘
  for (const b of s.bolts) {
    if (!b.hit) {
      ctx.fillStyle = `rgba(60,50,60,${0.35 * Math.max(0, 1 - (t - b.t) / 40)})`;
      ell(ctx, X(PX + 0.17), Y(KY) - R(0.005), R(0.06), R(0.016));
      ctx.fill();
    }
    const age = t - b.t, a = Math.max(0, 1 - age / 30);
    const g = s.giants.find(alive) ?? s.giants[0];
    const x0 = X(g ? g.x : 0.5), y0 = Y(g ? g.y + 0.1 : 0.4), x1 = b.hit ? X(PX) : X(PX + 0.17), y1 = b.hit ? Y(PY) - R(UR) : Y(KY) - R(0.01);
    ctx.save();
    ctx.globalAlpha = a;
    const fresh = age < 6 ? 1.6 : 1;
    if (age < 4) {
      ctx.fillStyle = 'rgba(255,250,210,.35)';
      ctx.fillRect(0, 0, w, h);
    }
    for (const [c, lw] of [['rgba(255,225,74,.45)', 22 * fresh], ['#ffe14a', 10 * fresh], ['#ffffff', 4 * fresh]] as [string, number][]) {
      ctx.strokeStyle = c;
      ctx.lineWidth = lw;
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      for (let j = 1; j <= 7; j++) {
        const q = j / 7, jx = j < 7 ? (hsh(j + b.t) - 0.5) * R(0.09) : 0;
        ctx.lineTo(x0 + (x1 - x0) * q + jx, y0 + (y1 - y0) * q);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // ── 받아치는 순간: 화면 가장자리 집중선 · 살짝 어둡게 ──
  if (slowVis > 0.02) {
    ctx.save();
    ctx.globalAlpha = slowVis * 0.5;
    ctx.fillStyle = radg(ctx, X(PX), Y(PY) - R(0.15), R(0.45), R(1.05), [0, 'rgba(255,255,255,0)'], [1, 'rgba(255,250,220,.7)']);
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = slowVis * 0.9;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 18; i++) {
      const aa = (i / 18) * TAU + hsh(i + s.parryT) * 0.3, r0 = R(0.55 + hsh(i + 3) * 0.2), r1 = R(1.1);
      ctx.beginPath();
      ctx.moveTo(X(PX) + Math.cos(aa) * r0, Y(PY) - R(0.15) + Math.sin(aa) * r0);
      ctx.lineTo(X(PX) + Math.cos(aa) * r1, Y(PY) - R(0.15) + Math.sin(aa) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
  // ── 첫 안내: 거인 쪽을 꾹 누르는 손가락 ──
  const tutP = s.projs.find((p) => p.tut);
  if (s.stage === 0 && play && (s.firstPress < 0 || (tutP && tutP.st !== 2 && !s.down))) {
    const tx = X(0.5), ty = Y(0.72), cyc = (t % 80) / 80, press = cyc < 0.5 ? cyc * 2 : 1 - (cyc - 0.5) * 2;
    ctx.save();
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(tx, ty, R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    ctx.translate(tx, ty);
    ctx.rotate(Math.PI + 0.25);
    drawHand(ctx, 0, R(0.01), R(0.095), press);
    ctx.restore();
  }
  // 첫 물방울이 우산에 붙었을 때: '지금 떼요!'
  if (tutP && tutP.st === 1 && s.down) {
    const bx = X(PX), by = Y(PY) - R(0.2), pul = 1 + 0.08 * Math.sin(t * 0.5);
    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(pul, pul);
    font(0.055, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText('지금 떼요!').width + R(0.06);
    ctx.fillStyle = '#ff5f6d';
    rr(ctx, -tw / 2, -R(0.04), tw, R(0.08), R(0.04));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText('지금 떼요!', 0, R(0.003));
    ctx.restore();
  }
  // ── 새것 스포트라이트 ──
  if (s.spot) {
    const age = t - s.spot.t;
    if (age >= 0 && age < 110) {
      const a = Math.min(1, age / 10, (110 - age) / 20), cx = X(s.spot.x), cy = Y(s.spot.y), r0 = R(s.spot.r);
      ctx.save();
      ctx.fillStyle = `rgba(20,50,100,${0.2 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(GB) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,225,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.05), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6);
      const ly = Math.min(cy + r0 + R(0.03), Y(0.565));
      ctx.fillStyle = '#ffe14a';
      rr(ctx, lx - tw / 2, ly - R(0.028), tw, R(0.056), R(0.028));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#20406a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // ── 사건 연출 ──
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    x = clamp(x, w * 0.16, w * 0.84);
    y = clamp(y, Y(0.16), Y(1.25));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 36 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y += size + 4;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  const big = (text: string, x: number, y: number, n: number) => {
    fx.memo.bigT = t;
    fx.memo.bigN = n;
    fx.memo.bigX = x;
    fx.memo.bigY = y;
    fx.memo.bigS = text.length;
    bigText.set(s, text);
    s.birdT = t;
  };
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const ex = X(e.x), ey = Y(e.y);
    switch (e.kind) {
      case 'wake':
        fx.ring(ex, ey, '#ffffff', R(0.3), 5);
        say(ex + R(0.2), ey - R(0.12), '!', '#ff5f6d', 30);
        fx.kick(4);
        break;
      case 'spit':
        fx.burst(ex, ey, '#dff2ff', 6, 1.8, 2);
        say(ex + R(0.08), ey + R(0.02), e.text === 'hail' ? '퉷!' : e.text === 'snow' ? '후우' : '퉤', '#ffffff', 14);
        break;
      case 'land':
        fx.burst(ex, ey, '#bfe6ff', 6, 1.6, 1.8);
        break;
      case 'parry': {
        const perfect = e.text === 'perfect' || e.text === 'rb';
        fx.blink('#ffffff', perfect ? 0.45 : 0.25);
        fx.kick(perfect ? 6 : 4);
        fx.ring(ex, ey, '#fff7b0', R(perfect ? 0.16 : 0.1), perfect ? 6 : 4);
        fx.burst(ex, ey, '#fff3a0', perfect ? 18 : 10, 3.6, 2.4);
        fx.burst(ex, ey, '#8fd0ff', 8, 2.6, 2.2);
        if (t - (fx.memo.tak ?? -99) > 6) (fx.memo.tak = t), (fx.memo.takX = ex), (fx.memo.takY = ey), (fx.memo.takP = perfect ? 1 : 0);
        break;
      }
      case 'multi':
        big(`한 번에 ${e.n}개!`, X(PX), Y(PY) - R(0.32), e.n ?? 2);
        break;
      case 'rainbow':
        fx.blink('#fff6c0', 0.6);
        fx.kick(10);
        for (const c of RBC) fx.burst(X(PX), Y(PY) - R(0.1), c, 8, 5, 3);
        big('무지개 한 방!', X(0.5), Y(0.75), 5);
        break;
      case 'hit': {
        const n = e.n ?? 1, nose = e.text === 'nose', rb = e.text === 'rb';
        const col = rb ? '#ffffff' : e.text === 'hail' ? '#e6f4ff' : '#7fc4ff';
        fx.burst(ex, ey, col, 12 + n * 4, 3.5 + n * 0.5, 2.6);
        fx.burst(ex, ey, '#ffffff', 8, 2.5, 2);
        fx.ring(ex, ey, rb ? '#ffe14a' : '#ffffff', R(0.08 + n * 0.02), 4);
        fx.kick(3 + n * 1.5);
        say(ex, ey - R(0.09), rb ? `-${n} 와르르!` : nose ? `철썩! -${n}` : `철썩 -${n}`, nose || rb ? '#ffe14a' : '#ffffff', nose || rb ? 22 : 17);
        if (rb) for (const c of RBC) fx.burst(ex, ey, c, 10, 6, 3.2);
        break;
      }
      case 'sneeze':
        fx.memo['sn' + e.x.toFixed(3)] = t;
        sneezeAt.set(s, [...(sneezeAt.get(s) ?? []).filter((q) => t - q.t < 80), { t, x: ex, y: ey }]);
        big('에, 에취!', ex, ey + R(0.27), 3);
        break;
      case 'deflate':
        fx.burst(ex, ey + R(0.08), '#ffffff', 14, 3, 3);
        say(ex, ey + R(0.16), '푸슈~', '#ffffff', 18);
        break;
      case 'bounce':
        fx.burst(ex, ey, '#e8f0ff', 10, 3, 2);
        say(ex, ey - R(0.05), '퐁!', '#dfe6ff', 18);
        break;
      case 'miss':
        say(ex, ey + R(0.05), '휙~ 빗나감', '#eef4ff', 14);
        break;
      case 'block':
        fx.burst(ex, ey, '#9fd4ff', 12, 2.6, 2.2);
        say(ex, ey - R(0.06), `철벅 · 우산 -${e.n}`, '#dff2ff', 15);
        fx.kick(2);
        break;
      case 'soak':
        fx.burst(ex, ey - R(0.05), '#6ab8ff', 26, 4, 2.8);
        fx.burst(ex, ey - R(0.05), '#ffffff', 10, 3, 2);
        fx.kick(7);
        say(ex, ey - R(0.18), `으앗 차가워! -${e.n}`, '#ffffff', 18);
        break;
      case 'whiff':
        say(ex, ey - R(0.12), e.text === 'bolt' ? '착, 접었다!' : '헛손질', e.text === 'bolt' ? '#ffe14a' : '#eef4ff', e.text === 'bolt' ? 17 : 14);
        break;
      case 'zap':
        fx.blink('#fff6a0', 0.7);
        fx.kick(12);
        fx.burst(ex, ey, '#ffe14a', 26, 5, 2.6);
        fx.burst(ex, ey, '#3a3030', 12, 3, 3);
        say(ex, ey - R(0.12), `찌릿! 우산 -${e.n}`, '#ffe14a', 22);
        break;
      case 'boltmiss':
        fx.blink('#fffbd0', 0.4);
        fx.kick(6);
        fx.burst(ex, ey, '#ffe14a', 16, 3.6, 2.2);
        say(X(PX), Y(PY) - R(0.2), '휴~ 피했다!', '#ffffff', 18);
        break;
      case 'gust':
        say(ex, ey + R(0.22), (e.n ?? 1) > 0 ? '후~ 바람 → ' : '← 바람 후~', '#ffffff', 18);
        break;
      case 'ko':
        fx.blink('#ffffff', 0.5);
        fx.kick(12);
        for (const c of RBC) fx.burst(ex, ey, c, 10, 6, 3.4);
        fx.burst(ex, ey, '#ffffff', 30, 5, 4);
        big(s.giants.length > 1 && s.giants.some(alive) ? '하나 이겼다!' : `${d.who} 이겼다!`, ex, ey + R(0.3), 4);
        break;
      case 'clear':
        fx.burst(w * 0.3, Y(0.6), '#ffe14a', 30, 6, 3);
        fx.burst(w * 0.7, Y(0.6), '#7fd0ff', 30, 6, 3);
        fx.ring(w / 2, Y(0.65), '#ffe14a', R(0.45), 7);
        break;
      case 'fail':
        fx.kick(6);
        break;
    }
  }
  // 재채기: 구름 조각이 화면 끝까지 펑 흩어졌다가 돌아오고, 콧물 물보라가 반짝이며 쏟아진다
  for (const q of sneezeAt.get(s) ?? []) {
    const age = t - q.t;
    if (age < 12 || age > 95) continue;
    const u = (age - 12) / 83, out = Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (u < 0.6 ? 1 : 1 - (u - 0.6) / 0.4);
    for (let i = 0; i < 16; i++) {
      const aa = (i / 16) * TAU + hsh(i + q.t) * 0.4, dist = R(0.1) + out * R(0.55) * (0.6 + hsh(i) * 0.7);
      const cx = q.x + Math.cos(aa) * dist, cy = q.y + Math.sin(aa) * dist * 0.85;
      ctx.globalAlpha = Math.min(1, (1 - u) * 2) * 0.95;
      puffBall(ctx, cx, cy, R(0.05) * (0.7 + hsh(i + 3) * 0.7), 'rgba(140,170,215,.7)');
    }
    for (let i = 0; i < 26; i++) {
      const sx = hsh(i * 3 + q.t) * w, sy = Y(0.2) + (hsh(i * 5 + 1) * 0.3 + u * 1.1) * h * 0.55, tw = 0.5 + 0.5 * Math.sin(t * 0.5 + i);
      ctx.globalAlpha = Math.max(0, 1 - u) * (0.5 + 0.5 * tw);
      ctx.fillStyle = i % 3 ? '#9fd8ff' : '#ffffff';
      ell(ctx, sx, sy, R(0.007), R(0.011));
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  fx.memo.t = t;
  ctx.restore();
  // ── '탁!' 도장: 받아친 자리에 꽝 (떠오르지 않고 그 자리에서 튄다) ──
  if (fx.memo.tak !== undefined && t - fx.memo.tak < 22) {
    const age = t - fx.memo.tak, perf = fx.memo.takP === 1, sc3 = age < 4 ? 0.6 + age * 0.25 : 1.6 - Math.min(0.6, (age - 4) * 0.08);
    const tx = clamp(fx.memo.takX + R(0.13), R(0.15), w - R(0.15)), ty = fx.memo.takY - R(0.04);
    ctx.save();
    ctx.globalAlpha = Math.min(1, (22 - age) / 8);
    ctx.translate(tx, ty);
    ctx.rotate(-0.12);
    ctx.scale(sc3, sc3);
    ctx.fillStyle = perf ? '#fff27a' : '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const an = (i / 16) * TAU, q = i % 2 ? R(0.03) : R(0.052);
      i ? ctx.lineTo(Math.cos(an) * q * 1.25, Math.sin(an) * q) : ctx.moveTo(Math.cos(an) * q * 1.25, Math.sin(an) * q);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.font = `900 ${Math.max(14, R(perf ? 0.05 : 0.044))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffffff';
    ctx.strokeText(perf ? '탁!!' : '탁!', 0, 1);
    ctx.fillStyle = perf ? '#ff5f2e' : '#2a6ad8';
    ctx.fillText(perf ? '탁!!' : '탁!', 0, 1);
    ctx.restore();
  }
  // ── 큰 순간 띠 ──
  if (fx.memo.bigT !== undefined && t - fx.memo.bigT < 56) {
    const age = t - fx.memo.bigT, sc2 = age < 6 ? 1.8 - 0.8 * (age / 6) : 1, a = Math.min(1, (56 - age) / 16);
    const txt = bigText.get(s) ?? '', bx = clamp(fx.memo.bigX, w * 0.32, w * 0.68), by = Y(0.7);
    const size = Math.min(34, R(0.08));
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(bx, by);
    ctx.rotate(-0.06);
    ctx.scale(sc2, sc2);
    ctx.font = `900 ${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(txt).width, rx = tw / 2 + 18, ry = size * 0.8;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const an = (i / 20) * TAU, q = i % 2 ? 0.86 : 1.08;
      const px2 = Math.cos(an) * rx * q, py2 = Math.sin(an) * ry * q;
      i ? ctx.lineTo(px2, py2) : ctx.moveTo(px2, py2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = OUT;
    ctx.strokeText(txt, 0, 2);
    ctx.fillStyle = lin(ctx, 0, -size / 2, 0, size / 2, [0, '#fff6a0'], [0.5, '#ffd23a'], [1, '#ff8a3a']);
    ctx.fillText(txt, 0, 2);
    ctx.restore();
  }

  // ═════════════ HUD: 위 띠 ═════════════
  ctx.textBaseline = 'middle';
  const hb = R(0.085);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, 'rgba(255,255,255,.92)'], [1, 'rgba(232,245,255,.9)']);
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(32,64,106,.25)';
  ctx.fillRect(0, hb - 1.5, w, 1.5);
  {
    const cx = R(0.055), cy = hb / 2;
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe878'], [1, '#f2a91c']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.031), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#5b3512';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#20406a';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.1), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.034, 700);
    ctx.fillStyle = '#6d8aa8';
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.1) + nw, cy + 2);
  }
  {
    const cy = hb / 2;
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#e8a010';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.026), cy, R(0.021));
    ctx.fillStyle = '#ffd23a';
    ctx.fill();
    ctx.strokeStyle = KID_OUT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx2 = w - R(0.03) - sw - R(0.085) - j * R(0.052);
      heartPath(ctx, hx2, cy, R(0.018));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx2, cy - R(0.02), hx2, cy + R(0.02), [0, '#ff8a95'], [1, '#e2334a']) : 'rgba(32,64,106,.12)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? '#8a1a2a' : 'rgba(32,64,106,.3)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  // 거인 체력 막대
  {
    const alive2 = s.giants;
    const n = alive2.length, bw = n > 1 ? R(0.36) : R(0.56), by = hb + R(0.028), bh = R(0.032);
    alive2.forEach((g, i) => {
      const bx = n > 1 ? (i === 0 ? R(0.07) : w - R(0.07) - bw) : (w - bw) / 2;
      const fr = clamp(g.hp / g.max, 0, 1), shake = t - g.hurtT < 10 ? Math.sin(t * 2) * 2 : 0;
      ctx.save();
      ctx.translate(shake, 0);
      ctx.fillStyle = 'rgba(32,64,106,.35)';
      rr(ctx, bx + 2, by + 3, bw, bh, bh / 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.fill();
      if (fr > 0.003) {
        ctx.fillStyle = lin(ctx, bx, 0, bx + bw, 0, [0, '#ff5f6d'], [0.5, '#ff9f3a'], [1, '#ffd23a']);
        rr(ctx, bx + 2, by + 2, (bw - 4) * fr, bh - 4, (bh - 4) / 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        rr(ctx, bx + 4, by + 3, Math.max(0, (bw - 8) * fr), (bh - 4) * 0.35, 2);
        ctx.fill();
      }
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2;
      rr(ctx, bx, by, bw, bh, bh / 2);
      ctx.stroke();
      // 작은 구름 얼굴 아이콘
      const ix = bx - R(0.005), iy = by + bh / 2;
      puffBall(ctx, ix, iy, R(0.024));
      ctx.fillStyle = OUT;
      for (const sd of [-1, 1]) {
        ell(ctx, ix + sd * R(0.008), iy - R(0.002), R(0.0035), R(0.005));
        ctx.fill();
      }
      ctx.restore();
    });
  }
  // ═════════════ 판 카드 (가운데 하늘) ═════════════
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '구름 나라를 다 이겼다!' : `${d.who} 이겼다!`;
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 꼬마가 젖은 우산을 말려요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.who}`;
      sub = d.news ? `NEW  ${d.news}` : d.hint;
    }
    if (head) {
      const cy = Y(0.66), pop = Math.min(1, 0.4 + age / 8);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.048, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.05), Math.max(w1, w2) + R(0.1)), ch = (sub || (s.phase === 'result' && s.ok) ? R(0.15) : R(0.09)) * pop;
      ctx.translate(w / 2, cy);
      ctx.fillStyle = 'rgba(32,64,106,.3)';
      rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, R(0.04));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [0, '#ffffff'], [1, '#e6f4ff']);
      rr(ctx, -cw / 2, -ch / 2, cw, ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // 구름 귀퉁이
      for (const sd of [-1, 1]) puffBall(ctx, (sd * cw) / 2 - sd * R(0.01), -ch / 2 + R(0.005), R(0.03));
      ctx.textAlign = 'center';
      font(0.048, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#c46a00' : '#c0303a') : '#20406a';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, 0, -R(0.032), w - R(0.1));
        const nS = s.starOk.length;
        for (let j = 0; j < nS; j++) {
          const ag = s.pt - (14 + j * 12);
          const sx = (j - (nS - 1) / 2) * R(0.08), sy = R(0.03);
          const popS = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.03) * (ag < 0 ? 1 : popS));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(32,64,106,.15)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(32,64,106,.35)';
          ctx.lineWidth = 1.6;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, cy + sy, '#ffd23a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, 0, sub ? -R(0.028) : R(0.002), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#d0405a' : '#3d5f8e';
          ctx.fillText(sub, 0, R(0.035), w - R(0.1));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 우산 · 무지개 · 별 · 안내 ═════════════
  {
    const ty = Y(GB);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, 'rgba(255,255,255,.95)'], [1, 'rgba(226,242,255,.98)']);
    rr(ctx, 0, ty, w, h - ty + 4, R(0.03));
    ctx.fill();
    ctx.strokeStyle = 'rgba(32,64,106,.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(R(0.03), ty);
    ctx.lineTo(w - R(0.03), ty);
    ctx.stroke();
    // 1줄: 우산 칸 + 무지개 칸
    const r1 = ty + R(0.042);
    {
      font(0.034, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#20406a';
      ctx.fillText('우산', R(0.03), r1 + 1);
      const x0 = R(0.03) + ctx.measureText('우산').width + R(0.02), n = s.umbMax, cw = Math.min(R(0.05), (w * 0.52 - x0) / n);
      const lowWarn = s.umb <= 3 && play;
      for (let j = 0; j < n; j++) {
        const cx = x0 + j * cw + cw / 2, dry = j < s.umb;
        ctx.save();
        ctx.translate(cx, r1 + 2);
        ctx.beginPath();
        ctx.arc(0, R(0.008), cw * 0.42, Math.PI, 0);
        ctx.quadraticCurveTo(cw * 0.21, R(0.0), 0, R(0.008));
        ctx.quadraticCurveTo(-cw * 0.21, R(0.0), -cw * 0.42, R(0.008));
        ctx.closePath();
        ctx.fillStyle = dry ? (lowWarn ? (Math.floor(t / 12) % 2 ? '#ff7a7a' : '#ffd23a') : '#ffd23a') : 'rgba(32,64,106,.15)';
        ctx.fill();
        ctx.strokeStyle = dry ? KID_OUT : 'rgba(32,64,106,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        if (!dry) {
          ctx.fillStyle = 'rgba(70,150,240,.7)';
          ell(ctx, cw * 0.1, R(0.016), R(0.005), R(0.008));
          ctx.fill();
        }
        ctx.restore();
      }
      // 무지개 칸
      const rx0 = w * 0.6;
      ctx.fillStyle = '#20406a';
      ctx.textAlign = 'left';
      font(0.034, 900);
      ctx.fillText('무지개', rx0, r1 + 1);
      const gx0 = rx0 + ctx.measureText('무지개').width + R(0.02), gw = w - R(0.03) - gx0, sw2 = gw / RB_MAX;
      for (let j = 0; j < RB_MAX; j++) {
        const on = j < s.rb;
        ctx.fillStyle = on ? RBC[j] : 'rgba(32,64,106,.1)';
        rr(ctx, gx0 + j * sw2 + 1, r1 - R(0.016), sw2 - 2, R(0.032), R(0.012));
        ctx.fill();
        ctx.strokeStyle = on ? 'rgba(32,64,106,.6)' : 'rgba(32,64,106,.25)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
      if (rbFull) {
        ctx.strokeStyle = `rgba(255,200,40,${0.6 + 0.4 * Math.sin(t * 0.4)})`;
        ctx.lineWidth = 2.5;
        rr(ctx, gx0 - 2, r1 - R(0.02), gw + 4, R(0.04), R(0.015));
        ctx.stroke();
      }
    }
    // 2줄: 별 (쉬운 말)
    const r2 = ty + R(0.1);
    {
      const stars = d.stars;
      const labels = stars.map((q) => q.label + (play && !starMet(s, q) && starNow(s, q) ? ` ${starNow(s, q)}` : ''));
      const ok = s.phase === 'result' && s.ok ? s.starOk : stars.map((q) => q.k !== 'win' && q.k !== 'dry' && q.k !== 'nozap' && q.k !== 'half' && starMet(s, q));
      const bad = stars.map((q) => starBroken(s, q));
      font(0.034, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (ws.length - 1), scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      for (let j = 0; j < stars.length; j++) {
        const pw = ws[j] * scale;
        ctx.fillStyle = ok[j] ? 'rgba(255,210,58,.3)' : bad[j] ? 'rgba(32,64,106,.06)' : 'rgba(32,64,106,.07)';
        rr(ctx, xx, r2 - R(0.026), pw, R(0.052), R(0.026));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#e8a010' : bad[j] ? 'rgba(32,64,106,.15)' : 'rgba(32,64,106,.3)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.027) * scale + 2, r2, R(0.015));
        ctx.fillStyle = ok[j] ? '#ffd23a' : bad[j] ? 'rgba(32,64,106,.15)' : 'rgba(32,64,106,.35)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#9a5a08' : bad[j] ? 'rgba(32,64,106,.35)' : '#20406a';
        font(0.034, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        if (bad[j]) {
          ctx.strokeStyle = 'rgba(200,60,80,.6)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(xx + R(0.05) * scale, r2 + 1);
          ctx.lineTo(xx + pw - R(0.015), r2 + 1);
          ctx.stroke();
        }
        xx += pw + gap * scale;
      }
    }
    // 3줄: 안내 한 줄
    {
      let hint = d.hint;
      const first = s.stage === 0 && !s.tutDone;
      if (first) hint = s.firstPress < 0 ? '👆 누르면 우산, 닿을 때 떼면 탁!' : tutP?.st === 1 ? '지금 손을 떼요 — 탁!' : '누른 채로 기다려요…';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '구름 나라 끝까지 이겼어요!' : `★ ${s.got}개! 다음 판엔 새 거인이 나와요`) : '닿는 순간에 떼요 — 너무 일찍 떼면 젖어요';
      else if (s.giants.some((g) => g.st === PUFFS && g.atk?.k === 'bolt')) hint = s.open > 0.25 ? '번개가 와요 — 손을 떼서 우산을 접어요!' : '좋아요, 접은 채로 기다려요';
      else if (cands.length) hint = '지금 떼면 탁!';
      font(first ? 0.042 : 0.036, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#d0405a' : '#3d5f8e';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
const bigText = new WeakMap<object, string>();
const sneezeAt = new WeakMap<object, { t: number; x: number; y: number }[]>();
/** 작은 구름 공 (아이콘·재채기 조각) */
function puffBall(ctx: C2, x: number, y: number, r: number, line = 'rgba(74,106,154,.9)') {
  ctx.fillStyle = line;
  ctx.beginPath();
  for (const [dx, dy, q] of [[-0.45, 0.1, 0.55], [0.45, 0.1, 0.55], [0, -0.2, 0.7]]) {
    ctx.moveTo(x + dx * r + q * r + 1.5, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, q * r + 1.5, 0, TAU);
  }
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  for (const [dx, dy, q] of [[-0.45, 0.1, 0.55], [0.45, 0.1, 0.55], [0, -0.2, 0.7]]) {
    ctx.moveTo(x + dx * r + q * r, y + dy * r);
    ctx.arc(x + dx * r, y + dy * r, q * r, 0, TAU);
  }
  ctx.fill();
}

/** 시험·스크린샷용: k판(0부터)으로 바로 (첫 물방울 안내는 건너뜀) */
export function jumpTo(s: UmbState, k: number) {
  s.stage = k;
  s.tutDone = true;
  s.firstPress = Math.max(0, s.firstPress);
  newStage(s);
}
