/**
 * 카멜레온 무늬 숨바꼭질 (33라운드: 서로 다른 뼈대 6개 — 잠입) — 무늬 훔치기 숨기 × 꾹 눌렀다 떼기 × 연쇄.
 * 뼈대: 잠입 — 한낮의 과일 시장 골목을 카멜레온이 저절로 앞으로 걷는다. 들키지 않고 골목 끝까지 가면 판을 깬다.
 * 조작(손이 하는 일은 하나): 꾹 누르면 멈춰 서서 몸이 등 뒤 진열대의 무늬로 물결치듯 바뀐다(감쪽같이 숨음). 떼면 다시 걷는다.
 *   짧게 톡 해도 무늬는 끝까지 바뀐다(한 번의 톡이 큰 일).
 * 규칙(결정적): 방금 훔친 무늬를 한동안 입고 다닌다 — **같은 무늬 앞을 걸을 땐 움직여도 안 들킨다.** 무늬는 걸을수록 꼬리부터 바랜다
 *   (비가 오면 세 배 빨리). 다른 무늬 앞에서 움직이다 시선(부채꼴)에 걸리면 들킴 게이지가 찬다. 다 차면 하트 -1, 그 판 다시.
 *   과일은 시선이 없을 때 혀가 저절로 쏙 낚아챈다.
 * 와우: 첫 꾹 — 코앞에서 킁킁대던 경비 강아지 앞에서 몸이 바나나 무늬로 스르륵 바뀌고, 강아지가 '?' 하고 갸웃하다 돌아선다.
 *   떼면 바나나 무늬를 입은 채 바나나 진열대 앞을 유유히 걷는다.
 * 판 7개(판마다 하는 일이 바뀌는 새것 하나): 1 강아지 시선 → 2 가게 아저씨(오래 봄·신문 볼 때만 과일) → 3 망원경(멀리 훑음 — 맞는 무늬로 버티기)
 *   → 4 손수레(무늬가 지나감 — 수레 무늬를 훔쳐 나란히 걷기) → 5 소나기(무늬가 빨리 씻김 — 자주 갈아입기)
 *   → 6 돌아가는 간판(무늬가 바뀜 — 필요한 무늬가 나올 때 훔치기) → 7 고양이(냄새로 따라옴 — 무늬 소용없음, 멈추면 따라잡힘).
 * 웃음: 들키면 강아지가 "왈!" 하고 카멜레온이 펄쩍 뛰어 데굴데굴, 눈이 빙글빙글. 속은 경비는 '?' 하고 머리를 긁는다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
/** 화면 띠: 위 HUD · 진열대(무늬 벽) · 카멜레온이 걷는 계산대 · 거리 · 아래 HUD */
const HUD_T = 0.125, WALL_T = 0.56, WALL_B = 0.925, LANE = 0.935, CNT_B = 1.04, STREET_B = 1.36;
/** 카멜레온: 걷는 속도(화면 폭/틱) · 몸 반 길이(시선 판정) · 화면 속 자리 */
const V = 0.23 / 60, BODY = 0.03, CAM_AT = 0.27;
/** 무늬 바꾸기(꾹 → 다 바뀔 때까지 틱, 톡만 해도 끝까지) · 무늬가 걷는 동안 버티는 틱 · 비 오면 몇 배 빨리 */
const MORPH = 24, CHARGE_T = 480, RAIN_X = 3;
/** 바뀌는 중에 들키면 (진열대가 색이 변한다!) 몇 배로 의심 */
const MORPH_SEEN = 2;
/** 들킴: 안 보일 때 줄어드는 양/틱 · 판 1 너그러움 */
const SUS_DECAY = 1 / 420;
/** 혀: 닿는 거리 · 혀 내미는 틱 · 과일이 입에 들어오는 틱 */
const REACH = 0.15, FLICK_T = 16, FLICK_HIT = 8;
/** 고양이: 따라오는 속도 · 덮치는 거리 · 덮치면 들킴 + · 물러나는 거리 */
const CAT_V = V * 0.92, CAT_NEAR = 0.075, CAT_SUS = 0.4, CAT_BACK = 0.5;
/** 판 시작 준비(틱) — 2판부터는 이만큼 서 있다가 저절로 걷는다 */
const START_T = 60;
const RESULT_OK = 160, RESULT_FAIL = 150, CARD_T = 150, NEWS_T = 150;
const FRUIT_PTS = 10, FOOL_PTS = 10, WALK_FOOL = 30, CLEAR_PTS = 100, STAR_PTS = 150, WIN_PTS = 300;

/** 무늬: 바나나 점 · 수박 줄 · 차양 줄 · 타일 · 잎(카멜레온 제 빛깔 — 바래면 이것) */
export type Pat = 'banana' | 'melon' | 'awning' | 'tile' | 'leaf';
const STEAL: Pat[] = ['banana', 'melon', 'awning', 'tile'];
const PAT_NAME: Record<Pat, string> = { banana: '바나나', melon: '수박', awning: '차양 줄', tile: '타일', leaf: '잎사귀' };
/** 진열대 한 칸: 'sign'은 돌아가는 간판(무늬가 바뀜) */
type SegK = Pat | 'sign';
type GK = 'dog' | 'man' | 'scope';
/** 시선 자세: [바라보는 곳(경비 자리 기준), 시선 반폭(0 = 안 봄), 머무는 틱, 다음 자세로 도는 틱] */
type Pose = [number, number, number, number];
interface GuardDef { k: GK; x: number; poses: Pose[]; intro?: Pose[]; ph?: number }
interface CartDef { x: number; w: number; pat: Pat; v: number }
type StarK = 'clear' | 'fruit' | 'nospot' | 'stops' | 'cat' | 'time';
interface Star { k: StarK; n: number; label: string }
interface StageDef {
  key: string; name: string; news: string; hint: string; L: number; x0: number;
  segs: [SegK, number][]; guards: GuardDef[]; fruits: number[]; stars: Star[];
  carts?: CartDef[]; rain?: boolean; cat?: boolean; signCycle?: Pat[]; mul?: number; perm?: boolean;
}
const S = (k: StarK, n: number, label: string): Star => ({ k, n, label });
const CLEAR = S('clear', 0, '골목 끝까지 가기');
const RATE: Record<GK, number> = { dog: 1 / 84, man: 1 / 70, scope: 1 / 34 };

/** 판 7개. segs = [무늬, 끝나는 x] (앞 칸 끝에서 시작) */
export const STAGES: StageDef[] = [
  {
    key: 'dog', name: '바나나 골목', news: '', hint: '바나나 앞에선 바나나 무늬로 걸어도 안 들켜요', L: 2.2, x0: 0.3, mul: 0.5,
    segs: [['banana', 1.05], ['leaf', 1.3], ['tile', 1.65], ['banana', 2.2]],
    guards: [
      { k: 'dog', x: 0.5, intro: [[-0.2, 0.1, 50, 26]], poses: [[-0.32, 0.14, 160, 30], [0.2, 0.16, 140, 30], [0, 0, 80, 22]] },
      { k: 'dog', x: 1.92, poses: [[-0.1, 0.2, 170, 30], [0.12, 0.12, 90, 30], [0, 0, 80, 22]], ph: 40 },
    ],
    fruits: [0.66, 1.18, 1.5, 2.02],
    stars: [CLEAR],
  },
  {
    key: 'man', name: '수박 좌판', news: '가게 아저씨 — 오래 봐요, 신문 볼 땐 안 봐요', hint: '아저씨가 신문 볼 때 혀가 과일을 낚아채요', L: 2.6, x0: 0.15, mul: 0.65,
    segs: [['tile', 0.3], ['melon', 0.55], ['banana', 0.95], ['melon', 1.8], ['leaf', 2.0], ['awning', 2.6]],
    guards: [
      { k: 'dog', x: 0.78, poses: [[0, 0.17, 120, 24], [0, 0, 100, 20]] },
      { k: 'man', x: 1.38, poses: [[0, 0.43, 300, 30], [0, 0, 100, 24]], ph: 60 },
      { k: 'dog', x: 2.28, poses: [[-0.02, 0.24, 160, 24], [0, 0, 90, 20]], ph: 100 },
    ],
    fruits: [0.42, 0.8, 1.12, 1.6, 1.9, 2.3],
    stars: [CLEAR, S('fruit', 5, '과일 다섯 개 훔치기')],
  },
  {
    key: 'scope', name: '망원경 망루', news: '망원경 — 멀리까지 훑어요, 아주 빨리 들켜요', hint: '망원경이 오기 전에 맞는 무늬를 입어 둬요', L: 2.7, x0: 0.15, perm: true,
    segs: [['awning', 0.35], ['tile', 0.78], ['banana', 1.05], ['tile', 1.6], ['awning', 1.8], ['tile', 2.3], ['banana', 2.7]],
    guards: [
      { k: 'scope', x: 1.35, poses: [[-1.05, 0.09, 40, 150], [1.15, 0.09, 40, 150]], ph: 0 },
      { k: 'dog', x: 2.05, poses: [[0, 0.2, 140, 24], [0, 0, 100, 20]], ph: 30 },
    ],
    fruits: [0.55, 0.92, 1.3, 1.7, 2.1, 2.5],
    stars: [CLEAR, S('fruit', 4, '과일 네 개 훔치기'), S('nospot', 0, '한 번도 안 들키기')],
  },
  {
    key: 'cart', name: '손수레 길', news: '손수레 — 무늬가 지나가요, 나란히 걸어요', hint: '수레 앞에서 꾹 — 수레 무늬를 입고 나란히 걸어요', L: 2.8, x0: 0.15, perm: true,
    segs: [['tile', 0.4], ['awning', 0.9], ['banana', 1.3], ['awning', 1.7], ['tile', 2.1], ['banana', 2.45], ['awning', 2.8]],
    carts: [{ x: 0.08, w: 0.4, pat: 'melon', v: V * 0.72 }],
    guards: [
      { k: 'dog', x: 0.62, poses: [[0, 0.17, 140, 24], [0, 0, 100, 20]], ph: 30 },
      { k: 'man', x: 1.5, poses: [[0, 0.44, 300, 30], [0, 0, 80, 24]], ph: 20 },
    ],
    fruits: [0.3, 0.75, 1.2, 1.5, 1.95, 2.3, 2.6],
    stars: [CLEAR, S('stops', 4, '네 번만 멈추기'), S('nospot', 0, '한 번도 안 들키기')],
  },
  {
    key: 'rain', name: '소나기 골목', news: '소나기 — 무늬가 세 배 빨리 씻겨요', hint: '비에 무늬가 금방 씻겨요 — 시선 앞에서 미리 갈아입어요', L: 2.6, x0: 0.15, rain: true, perm: true,
    segs: [['banana', 0.3], ['melon', 0.62], ['tile', 0.86], ['melon', 1.3], ['banana', 1.56], ['awning', 1.96], ['banana', 2.26], ['tile', 2.6]],
    guards: [
      { k: 'dog', x: 0.74, poses: [[0.08, 0.22, 140, 24], [0, 0, 90, 20]], ph: 30 },
      { k: 'man', x: 1.4, poses: [[-0.1, 0.3, 220, 30], [0.28, 0.2, 100, 30], [0, 0, 80, 24]], ph: 50 },
      { k: 'dog', x: 2.1, poses: [[0, 0.2, 130, 24], [0, 0, 100, 20]], ph: 10 },
    ],
    fruits: [0.45, 0.75, 1.1, 1.45, 1.8, 2.15, 2.45],
    stars: [CLEAR, S('fruit', 5, '과일 다섯 개 훔치기'), S('nospot', 0, '한 번도 안 들키기')],
  },
  {
    key: 'sign', name: '돌아가는 간판', news: '돌아가는 간판 — 무늬가 바뀌어요', hint: '간판이 원하는 무늬일 때 꾹 — 훔쳐 가요', L: 2.7, x0: 0.15, perm: true, signCycle: ['banana', 'melon', 'awning'],
    segs: [['tile', 0.35], ['sign', 0.6], ['awning', 1.0], ['tile', 1.3], ['sign', 1.58], ['melon', 2.0], ['banana', 2.3], ['sign', 2.7]],
    guards: [
      { k: 'scope', x: 1.3, poses: [[-0.95, 0.09, 50, 160], [1.05, 0.09, 50, 160]], ph: 90 },
      { k: 'dog', x: 2.12, poses: [[0, 0.24, 150, 24], [0, 0, 90, 20]], ph: 20 },
    ],
    fruits: [0.48, 0.8, 1.15, 1.45, 1.85, 2.15, 2.5],
    stars: [CLEAR, S('time', 16 * 60, '16초 안에 끝까지'), S('stops', 4, '네 번만 멈추기')],
  },
  {
    key: 'cat', name: '고양이 골목', news: '고양이 — 냄새로 따라와요, 멈추면 따라잡혀요', hint: '멈출수록 고양이가 다가와요 — 무늬를 입고 걸어요', L: 2.75, x0: 0.3, cat: true, perm: true,
    segs: [['melon', 0.55], ['tile', 0.8], ['melon', 1.5], ['tile', 1.65], ['banana', 1.8], ['tile', 2.45], ['banana', 2.75]],
    guards: [
      { k: 'man', x: 1.15, poses: [[0, 0.31, 300, 30], [0, 0, 80, 24]], ph: 40 },
      { k: 'dog', x: 2.12, poses: [[0, 0.29, 200, 24], [0, 0, 80, 20]], ph: 10 },
    ],
    fruits: [0.5, 0.75, 1.1, 1.38, 1.62, 2.0, 2.3, 2.62],
    stars: [CLEAR, S('fruit', 5, '과일 다섯 개 훔치기'), S('cat', 0, '고양이에게 안 잡히기')],
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 세계 (판마다 한 번 만든다) ─────────────────────────────
interface Seg { k: SegK; a: number; b: number }
interface Guard { k: GK; x: number; poses: Pose[]; intro: Pose[]; introT: number; per: number; ph: number; rate: number }
interface Cart { x: number; w: number; pat: Pat; v: number }
export interface World {
  stage: number; L: number; x0: number; segs: Seg[]; guards: Guard[]; carts: Cart[]; fruits: number[];
  rain: boolean; cat: boolean; sign: Pat[]; mul: number; map: Record<Pat, Pat>;
}

function buildWorld(stage: number, rng: Rng): World {
  const d = STAGES[stage];
  // 3판부터: 무늬 넷을 시드로 섞는다(같은 짜임, 다른 무늬)
  const map = { banana: 'banana', melon: 'melon', awning: 'awning', tile: 'tile', leaf: 'leaf' } as Record<Pat, Pat>;
  if (d.perm) {
    const p = [...STEAL];
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    STEAL.forEach((k, i) => (map[k] = p[i]));
  }
  const segs: Seg[] = [];
  let a = -0.6;
  for (const [k, b] of d.segs) {
    segs.push({ k: k === 'sign' ? 'sign' : map[k], a, b: b });
    a = b;
  }
  segs.push({ k: 'leaf', a: d.L, b: d.L + 2 });
  const jit = stage === 0 ? 0 : Math.floor(rng() * 50);
  const guards: Guard[] = d.guards.map((g) => {
    const per = g.poses.reduce((s2, p) => s2 + p[2] + p[3], 0);
    const intro = g.intro ?? [];
    return { k: g.k, x: g.x, poses: g.poses, intro, introT: intro.reduce((s2, p) => s2 + p[2] + p[3], 0), per, ph: (g.ph ?? 0) + jit, rate: RATE[g.k] * (d.mul ?? 1) };
  });
  return {
    stage, L: d.L, x0: d.x0, segs, guards, carts: (d.carts ?? []).map((c) => ({ ...c, pat: map[c.pat] })), fruits: [...d.fruits],
    rain: !!d.rain, cat: !!d.cat, sign: (d.signCycle ?? []).map((p) => map[p]), mul: d.mul ?? 1, map,
  };
}

/** 간판: 한 무늬에 머무는 틱 · 돌아가는 틱 */
const SIGN_HOLD = 100, SIGN_FLIP = 14;
function signAt(W: World, wt: number): { p: Pat; q: Pat; u: number } {
  const n = W.sign.length, per = SIGN_HOLD + SIGN_FLIP, k = Math.floor(wt / per), r = wt - k * per;
  const p = W.sign[((k % n) + n) % n], q = W.sign[(((k + 1) % n) + n) % n];
  return { p, q, u: r < SIGN_HOLD ? 0 : (r - SIGN_HOLD) / SIGN_FLIP };
}
const cartX = (c: Cart, wt: number) => c.x + c.v * wt;
function segAt(W: World, x: number): Seg {
  const sg = W.segs;
  for (let i = 0; i < sg.length; i++) if (x < sg[i].b) return sg[i];
  return sg[sg.length - 1];
}
/** 등 뒤(진열대) 무늬: 손수레가 지나가면 수레 무늬, 간판이면 지금 보이는 면 */
function backAt(W: World, x: number, wt: number): Pat {
  for (const c of W.carts) {
    const cx = cartX(c, wt);
    if (Math.abs(x - cx) < c.w / 2) return c.pat;
  }
  const g = segAt(W, x);
  if (g.k === 'sign') {
    const s = signAt(W, wt);
    return s.u < 0.5 ? s.p : s.q;
  }
  return g.k;
}

/** 경비 시선: 계산대 위 [가운데, 반폭, 부드러움(첫 킁킁 — 들키지 않음)] */
const GZ = { c: 0, h: 0, soft: false };
function gazeOf(g: Guard, wt: number) {
  let ps = g.poses, tt: number;
  GZ.soft = false;
  if (wt < g.introT) (ps = g.intro), (tt = wt), (GZ.soft = true);
  else tt = (((wt - g.introT + g.ph) % g.per) + g.per) % g.per;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    if (tt < p[2]) {
      GZ.c = g.x + p[0];
      GZ.h = p[1];
      return GZ;
    }
    tt -= p[2];
    if (tt < p[3]) {
      // 돌아보는 중: 다음 자세로 (소개 자세 다음은 첫 자세)
      const q = i + 1 < ps.length ? ps[i + 1] : ps === g.intro ? g.poses[0] : ps[0], u = tt / p[3], e = u * u * (3 - 2 * u);
      GZ.c = g.x + p[0] + (q[0] - p[0]) * e;
      GZ.h = p[1] + (q[1] - p[1]) * e;
      if (p[1] > 0.01 && q[1] < 0.01) GZ.h = p[1] * (1 - e);
      if (p[1] < 0.01 && q[1] > 0.01) (GZ.c = g.x + q[0]), (GZ.h = q[1] * e);
      return GZ;
    }
    tt -= p[3];
  }
  GZ.c = g.x;
  GZ.h = 0;
  return GZ;
}
/** x에 선 카멜레온을 보고 있는 경비들 (비트) — soft=true면 킁킁(들키지 않는) 시선도 */
function gazeMask(W: World, x: number, wt: number, soft = false): number {
  let m = 0;
  for (let i = 0; i < W.guards.length; i++) {
    const z = gazeOf(W.guards[i], wt);
    if (z.h < 0.012 || (z.soft && !soft)) continue;
    if (x + BODY > z.c - z.h && x - BODY < z.c + z.h) m |= 1 << i;
  }
  return m;
}

// ───────────────────────────── 몸 (게임과 봇이 같은 함수로 굴린다) ─────────────────────────────
const IDLE = 0, WALK = 1, STOP = 2;
export interface Body {
  x: number; mode: number; st: number; m: number; tg: Pat; worn: Pat; ch: number; ph: boolean; go: boolean;
  sus: number; exp: boolean; spots: number; stops: number; got: number; gm: number; fl: number; ff: number;
  cat: number; catHits: number; wt: number; mask: number;
}
const E_STOP = 1, E_MORPH = 2, E_SPOT = 4, E_FLICK = 8, E_FRUIT = 16, E_CAUGHT = 32, E_POUNCE = 64, E_END = 128, E_FADE = 256, E_WALK = 512, E_GO = 1024;

function newBody(W: World): Body {
  return {
    x: W.x0, mode: IDLE, st: 0, m: 1, tg: W.stage === 0 ? 'leaf' : 'leaf', worn: 'leaf', ch: 0, ph: true, go: W.stage > 0,
    sus: 0, exp: false, spots: 0, stops: 0, got: 0, gm: 0, fl: 0, ff: -1, cat: W.x0 - 0.45, catHits: 0, wt: 0, mask: 0,
  };
}
const cloneBody = (b: Body): Body => ({ ...b });

/** 한 틱. 돌려주는 값 = 사건 비트 */
function tickBody(W: World, b: Body, hold: boolean): number {
  let ev = 0;
  const press = hold && !b.ph;
  b.ph = hold;
  if (!b.go) {
    // 1판: 첫 꾹 전엔 세상이 기다린다 (강아지는 코앞에서 킁킁만)
    if (!press) return 0;
    b.go = true;
    ev |= E_GO;
  }
  b.wt++;
  if (b.mode === IDLE) {
    if (press) (b.mode = STOP), (b.st = 0), b.stops++, (ev |= E_STOP);
    else if (b.wt >= START_T) (b.mode = WALK), (ev |= E_WALK);
  } else if (b.mode === WALK && press) (b.mode = STOP), (b.st = 0), b.stops++, (ev |= E_STOP);
  const back = backAt(W, b.x, b.wt);
  if (b.mode === STOP) {
    if (ev & E_STOP) b.m = b.worn === back ? 1 : 0;
    b.st++;
    if (b.worn === back && b.m >= 1) b.ch = 1;
    else {
      if (b.tg !== back) (b.tg = back), (b.m = 0);
      b.m += 1 / MORPH;
      if (b.m >= 1 - 1e-9) (b.m = 1), (b.worn = back), (b.ch = 1), (ev |= E_MORPH);
    }
    if (!hold && b.st >= MORPH && b.m >= 1) (b.mode = WALK), (ev |= E_WALK);
  } else if (b.mode === WALK) {
    b.x += V;
    if (b.worn !== 'leaf') {
      b.ch -= (W.rain ? RAIN_X : 1) / CHARGE_T;
      if (b.ch <= 0) (b.ch = 0), (b.worn = 'leaf'), (ev |= E_FADE);
    }
  }
  // 시선
  const bk = b.mode === WALK ? backAt(W, b.x, b.wt) : back;
  const mask = b.mode === IDLE ? 0 : gazeMask(W, b.x, b.wt);
  b.mask = mask;
  const hidden = b.mode === STOP ? b.m >= 1 && b.worn === bk : b.worn === bk;
  if (mask && !hidden) {
    let r = 0;
    for (let i = 0; i < W.guards.length; i++) if (mask & (1 << i)) r = Math.max(r, W.guards[i].rate);
    b.sus += b.mode === STOP && b.m < 1 ? r * MORPH_SEEN : r;
    if (!b.exp) b.spots++, (ev |= E_SPOT);
    b.exp = true;
  } else {
    b.exp = false;
    b.sus = Math.max(0, b.sus - SUS_DECAY);
  }
  // 고양이: 냄새로 따라온다 (무늬 소용없음)
  if (W.cat && b.mode !== IDLE) {
    if (b.x - b.cat > CAT_NEAR) b.cat = Math.min(b.x - CAT_NEAR + 1e-6, b.cat + CAT_V);
    else (b.sus += CAT_SUS), b.catHits++, (b.cat = b.x - CAT_BACK), (ev |= E_POUNCE);
  }
  // 혀: 시선이 없을 때만 저절로 쏙
  if (b.fl > 0) {
    b.fl++;
    if (b.fl === FLICK_HIT) (b.gm |= 1 << b.ff), b.got++, (ev |= E_FRUIT);
    if (b.fl >= FLICK_T) (b.fl = 0), (b.ff = -1);
  } else if (!mask && b.mode !== IDLE) {
    for (let i = 0; i < W.fruits.length; i++) {
      if (b.gm & (1 << i)) continue;
      const dx = W.fruits[i] - (b.x + 0.04);
      if (dx > -REACH * 0.6 && dx < REACH) {
        b.fl = 1;
        b.ff = i;
        ev |= E_FLICK;
        break;
      }
    }
  }
  if (b.sus >= 1) (b.sus = 1), (ev |= E_CAUGHT);
  else if (b.x >= W.L) ev |= E_END;
  return ev;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; n?: number; text?: string }
export interface ChamState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number; ok: boolean; why: string;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; won: boolean; dead: boolean; again: boolean; tries: number;
  W: World; b: Body;
  /** 경비마다 지금 나를 보는 중인가(0 아님 · 1 속는 중 · 2 들킨 적 있음) · 언제부터 */
  ep: number[]; epT: number[]; chain: number; chainBest: number; fools: number; wows: number; firstPress: number; firstBig: number;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; spot: { x: number; y: number; label: string; t: number; r: number } | null;
  events: Ev[];
  // 연출용 (시뮬레이션 결과와 무관)
  mood: number; moodT: number; stopT: number; morphT: number; from: Pat; patX: number; walkT: number; caughtT: number; fruitT: number;
  qm: number[]; bark: number[]; camX: number; tongue: { i: number; t: number } | null; eaten: { i: number; t: number }[];
  /** 멈칫(hit-stop): 이만큼 틱 동안 세상이 멈춘다 (입력의 '눌림 시작'은 멈칫 뒤에 읽힌다) */
  freeze: number;
}

const ev = (s: ChamState, kind: string, x: number, y: number, n?: number, text?: string) => s.events.push({ t: s.t, kind, x, y, n, text });
function see(s: ChamState, key: string, text: string) {
  if (!key || s.seen.has(key)) return false;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
  return true;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function newStage(s: ChamState) {
  const d = STAGES[s.stage];
  s.W = buildWorld(s.stage, s.rng);
  s.b = newBody(s.W);
  s.phase = 'play';
  s.pt = 0;
  s.ok = false;
  s.starOk = d.stars.map(() => false);
  s.ep = s.W.guards.map(() => 0);
  s.epT = s.W.guards.map(() => 0);
  s.qm = s.W.guards.map(() => -999);
  s.bark = s.W.guards.map(() => -999);
  s.chain = 0;
  s.chainBest = 0;
  s.mood = 0;
  s.moodT = 0;
  s.stopT = -999;
  s.morphT = -999;
  s.from = 'leaf';
  s.patX = s.b.x;
  s.walkT = 0;
  s.caughtT = -999;
  s.tongue = null;
  s.eaten = [];
  s.camX = s.b.x - (s.W.cat ? 0.42 : CAM_AT);
  // 새것 스포트라이트
  if (see(s, d.key, '')) {
    const W = s.W;
    if (d.key === 'dog') s.spot = null;
    else if (d.key === 'man' || d.key === 'scope') {
      const g = W.guards.find((q) => q.k === d.key)!;
      s.spot = { x: g.x, y: d.key === 'man' ? 1.18 : 0.33, label: d.key === 'man' ? '가게 아저씨' : '망원경', t: s.t, r: 0.13 };
    } else if (d.key === 'cart') s.spot = { x: W.carts[0].x, y: 0.78, label: '손수레', t: s.t, r: 0.2 };
    else if (d.key === 'sign') {
      const g = W.segs.find((q) => q.k === 'sign')!;
      s.spot = { x: (g.a + g.b) / 2, y: 0.74, label: '돌아가는 간판', t: s.t, r: 0.16 };
    } else if (d.key === 'cat') s.spot = { x: s.b.cat, y: 0.88, label: '고양이', t: s.t, r: 0.1 };
    else if (d.key === 'rain') s.spot = { x: s.b.x, y: 0.86, label: '소나기', t: s.t, r: 0.14 };
  }
}

function starMet(s: ChamState, st: Star) {
  const b = s.b;
  switch (st.k) {
    case 'clear': return true;
    case 'fruit': return b.got >= st.n;
    case 'nospot': return b.spots === 0;
    case 'stops': return b.stops <= st.n;
    case 'cat': return b.catHits === 0;
    case 'time': return b.wt <= st.n;
  }
}

function endStage(s: ChamState, ok: boolean, why: string) {
  if (s.phase !== 'play') return;
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.tongue = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = d.stars.map((q) => starMet(s, q));
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    const mul = 1 + s.stage * 0.5;
    s.pts += Math.round((CLEAR_PTS + s.got * STAR_PTS) * mul);
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    s.mood = 4;
    s.moodT = 999;
    ev(s, 'clear', s.b.x, LANE);
  } else {
    s.hearts--;
    s.tries++;
    s.mood = 5;
    s.moodT = 999;
    s.caughtT = s.t;
    ev(s, 'caught', s.b.x, LANE - 0.06, 0, why);
  }
}

/** 속이기: 경비 시선이 나를 덮었다가 한 번도 못 알아보고 지나가면 '?' — 연속일수록 크게 */
function fools(s: ChamState) {
  const b = s.b, W = s.W;
  const cm = b.mode === IDLE && b.go ? 0 : gazeMask(W, b.x, b.wt, true);
  for (let i = 0; i < W.guards.length; i++) {
    const on = (cm >> i) & 1;
    if (on) {
      if (!s.ep[i]) (s.ep[i] = 1), (s.epT[i] = s.t);
      if (b.exp && (b.mask >> i) & 1) s.ep[i] = 2;
      if (s.ep[i] === 1 && s.t - s.epT[i] >= 22 && s.t - s.qm[i] > 60 && (b.mode !== STOP || b.m >= 1)) s.qm[i] = s.t;
    } else if (s.ep[i]) {
      const long = s.t - s.epT[i] >= 22, walking = b.mode === WALK;
      if (s.ep[i] === 1 && long) {
        s.chain++;
        s.chainBest = Math.max(s.chainBest, s.chain);
        s.fools++;
        s.pts += (walking ? WALK_FOOL : FOOL_PTS) * Math.min(s.chain, 6);
        const big = s.fools === 1 || s.chain >= 2 || walking;
        if (big) {
          s.wows++;
          if (s.firstBig < 0) s.firstBig = s.t;
        }
        s.qm[i] = s.t;
        s.mood = 3;
        s.moodT = 50;
        ev(s, 'fool', W.guards[i].x, 0, s.chain, walking ? 'walk' : 'still');
        if (big) s.freeze = Math.max(s.freeze, 3);
        if (s.fools === 1) see(s, 'fool', '속였다! 같은 무늬 앞이면 걸어도 안 들켜요');
      }
      s.ep[i] = 0;
    }
  }
}

function cosmetic(s: ChamState) {
  if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
  const want = clamp(s.b.x - (s.W.cat ? 0.42 : CAM_AT), -0.05, s.W.L + 0.25 - 1);
  s.camX += (want - s.camX) * (s.t < 3 ? 1 : 0.12);
  s.events = s.events.filter((e) => s.t - e.t < 90);
  s.eaten = s.eaten.filter((e) => s.t - e.t < 40);
  if (s.spot && s.t - s.spot.t > 120) s.spot = null;
  if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
}

export const chameleon: GameDef<ChamState> & { wows: (s: ChamState) => number } = {
  id: 'chameleon',
  name: '카멜레온 무늬 숨바꼭질',
  genes: ['chameleon', 'hold', 'chain'],
  twist: '꾹 멈추면 등 뒤 무늬로 몸이 바뀌어 숨는데, 떼고 걸어도 그 무늬를 한동안 입고 다녀서 같은 무늬 앞이면 경비 코앞을 걸어 지나가도 안 들킨다 — 어디서 무엇을 훔쳐 입을지가 길을 정한다',
  rules: [
    '꾹 누르면 멈춰 서서 등 뒤 무늬로 몸이 바뀌어요. 떼면 그 무늬를 입은 채 걸어요.',
    '같은 무늬 앞에선 걸어도 안 들켜요. 다른 무늬 앞에서 시선에 걸리면 들킴 게이지가 차요.',
    '게이지가 다 차면 하트 -1(그 판 다시). 과일은 시선이 없을 때 혀가 저절로 낚아채요.',
  ],
  controls: 'hold',
  hint: '꾹 누르면 멈춰서 무늬로 숨고, 떼면 그 무늬를 입고 걸어요 / 스페이스',
  aspect: A,
  art: {
    concept: '한낮 지중해 과일 시장 골목의 무늬 훔치는 카멜레온 — 햇살 가득한 그림책 디오라마',
    mood: '하얀 벽과 파란 덧창, 줄무늬 차양 아래 바나나·수박 더미와 타일 벽이 늘어선 골목. 빨래가 나부끼고 비둘기가 차양 위에서 구경한다. 카멜레온이 꾹 멈추면 몸에 진열대 무늬가 물결처럼 번지고, 코앞의 강아지가 "?" 하고 갸웃한다',
    palette: { bg: '#bfe8ff', ink: '#3a2414', muted: '#9a7a5a', accent: '#ffcf3a', hot: '#ff5a3a', soft: '#fff3dc' },
  },
  guard: (s) => Math.round((1 - s.b.sus) * 100),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  reveals: (s) => s.seen.size,
  wows: (s) => s.wows,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, ok: false, why: '',
      hearts: 3, stars: 0, got: 0, starOk: [], pts: 0, won: false, dead: false, again: false, tries: 0,
      ep: [], epT: [], chain: 0, chainBest: 0, fools: 0, wows: 0, firstPress: -1, firstBig: -1,
      seen: new Set<string>(), newsQ: [], news: null, spot: null, events: [],
      mood: 0, moodT: 0, stopT: -999, morphT: -999, from: 'leaf', patX: 0, walkT: 0, caughtT: -999, fruitT: -999,
      qm: [], bark: [], camX: 0, tongue: null, eaten: [], freeze: 0,
    } as unknown as ChamState;
    newStage(s);
    see(s, 'dog', '');
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    const hold = !!(inp.hold || inp.tap);
    if (s.phase === 'result') {
      s.pt++;
      s.b.ph = hold;
      cosmetic(s);
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s), (s.b.ph = hold);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s), (s.b.ph = hold);
      }
      return;
    }
    if (s.freeze > 0) {
      s.freeze--;
      cosmetic(s);
      return;
    }
    const b = s.b, W = s.W, before = b.worn;
    const e = tickBody(W, b, hold);
    if (e & E_GO && s.firstPress < 0) s.firstPress = s.t;
    if (e & E_STOP) (s.stopT = s.t), (s.from = before), ev(s, 'stop', b.x, LANE);
    if (b.mode === STOP) s.patX = b.x;
    if (e & E_MORPH) {
      s.morphT = s.t;
      s.freeze = Math.max(s.freeze, 2);
      ev(s, 'morph', b.x, LANE, 0, b.worn);
      if (s.stage > 0 && W.carts.some((c) => Math.abs(b.x - cartX(c, b.wt)) < c.w / 2) && see(s, 'cartsteal', '')) s.newsQ.push('수레 무늬! 수레랑 나란히 걸어요');
    }
    if (e & E_WALK) (s.walkT = s.t), ev(s, 'walk', b.x, LANE);
    if (e & E_FADE) {
      ev(s, 'fade', b.x, LANE);
      see(s, 'fade', '무늬가 바랬어요 — 다시 꾹 눌러 훔쳐요');
    }
    if (e & E_SPOT) {
      s.chain = 0;
      s.mood = 2;
      s.moodT = 40;
      for (let i = 0; i < W.guards.length; i++) if ((b.mask >> i) & 1) (s.bark[i] = s.t), ev(s, 'spot', W.guards[i].x, 0, i);
      s.freeze = Math.max(s.freeze, 3);
    }
    if (e & E_FLICK) (s.tongue = { i: b.ff, t: s.t }), see(s, 'fruit', '시선이 없으면 혀가 과일을 쏙!');
    if (e & E_FRUIT) {
      s.pts += FRUIT_PTS;
      s.fruitT = s.t;
      s.eaten.push({ i: b.ff, t: s.t });
      ev(s, 'fruit', W.fruits[b.ff], 0.66, b.got);
    }
    if (s.tongue && s.t - s.tongue.t >= FLICK_T) s.tongue = null;
    if (e & E_POUNCE) {
      s.mood = 2;
      s.moodT = 50;
      ev(s, 'pounce', b.x, LANE);
    }
    fools(s);
    if (e & E_CAUGHT) s.freeze = 6;
    if (e & E_CAUGHT) endStage(s, false, b.catHits && e & E_POUNCE ? '고양이 때문에 들켰어요' : '들켰어요!');
    else if (e & E_END) endStage(s, true, '');
    cosmetic(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const HOLD: Input = { tap: false, dir: 0, hold: true };
const NO: Input = { tap: false, dir: 0, hold: false };

/** 걸어가면 곧 들키나 (몇 틱 앞) */
function wornAfter(W: World, b: Body, n: number): Pat {
  if (b.worn === 'leaf') return 'leaf';
  return b.ch - (n * (W.rain ? RAIN_X : 1)) / CHARGE_T <= 0 ? 'leaf' : b.worn;
}
function unsafeAhead(W: World, b: Body, n: number) {
  const x1 = b.x + V * n, t1 = b.wt + n;
  return gazeMask(W, x1, t1) !== 0 && backAt(W, x1, t1) !== wornAfter(W, b, n);
}
/**
 * 기본 버릇(굴려 보기용): 맞는 무늬 앞에 있으면, 앞의 다른 무늬 칸을 시선 없이 건널 수 있을 때만 간다(아니면 숨은 채 기다림).
 * 다른 무늬 앞에서 시선이 오면 — 맞는 무늬가 바꾸기보다 가까우면 계속 걷고, 아니면 멈춰 바꾼다.
 */
function defHold(W: World, b: Body): boolean {
  if (b.mode === IDLE) return !b.go;
  if (b.mode === STOP && (b.st < MORPH || b.m < 1)) return true;
  if (backAt(W, b.x, b.wt) === b.worn) {
    if (backAt(W, b.x + V * 6, b.wt + 6) === wornAfter(W, b, 6)) return false;
    for (let i = 6; i <= 120; i += 4) {
      const x = b.x + V * i, t = b.wt + i;
      if (backAt(W, x, t) === wornAfter(W, b, i)) return false;
      if (gazeMask(W, x, t)) return true;
    }
    return false;
  }
  if (b.mode === STOP) return true;
  if (!unsafeAhead(W, b, 4)) return false;
  for (let i = 4; i <= MORPH; i += 4) if (backAt(W, b.x + V * i, b.wt + i) === wornAfter(W, b, i)) return false;
  return true;
}

/** 판마다: 계산대 자리별로 시선이 머무는 비율 (무늬를 들고 갈 값어치) */
const watchCache = new WeakMap<World, Float32Array>();
const WBIN = 0.04;
function watchMap(W: World) {
  let a = watchCache.get(W);
  if (a) return a;
  const n = Math.ceil((W.L + 1) / WBIN);
  a = new Float32Array(n);
  let samples = 0;
  for (let t = 0; t < 1200; t += 8) {
    samples++;
    for (let i = 0; i < n; i++) if (gazeMask(W, i * WBIN, t)) a[i]++;
  }
  for (let i = 0; i < n; i++) a[i] /= samples;
  watchCache.set(W, a);
  return a;
}

interface Wts { f: number; sp: number; stN: number; stop: number; catW: number; nospot: boolean; dl: number }
function weights(s: ChamState): Wts {
  const d = STAGES[s.stage], b = s.b;
  let f = 25, sp = 40, stN = 99, stop = 10, catW = 260, dl = 1e9;
  for (const q of d.stars) {
    if (q.k === 'fruit' && b.got < q.n) {
      let avail = 0;
      s.W.fruits.forEach((x, i) => (avail += !(b.gm & (1 << i)) && x > b.x - 0.08 ? 1 : 0));
      f = avail <= q.n - b.got + 1 ? 420 : 110;
    }
    if (q.k === 'nospot' && b.spots === 0) sp = 700;
    if (q.k === 'stops' && b.stops <= q.n) (stN = q.n), (stop = 45);
    if (q.k === 'cat' && b.catHits === 0) catW = 900;
    if (q.k === 'time' && b.wt <= q.n) dl = q.n;
  }
  return { f, sp, stN, stop, catW, nospot: sp > 100, dl };
}

/** 계획 하나를 굴려 본다: h0틱 꾹 → k틱 걷기 → d틱 꾹(d=0이면 계속 걷기) → 그다음은 기본 버릇 */
function rollout(W: World, b0: Body, h0: number, k: number, d: number, H: number, wt: Wts): number {
  const b = cloneBody(b0);
  const x0 = b.x, sus0 = b.sus;
  let susMax = b.sus;
  for (let i = 0; i < H; i++) {
    const hold = i < h0 ? true : i < h0 + k ? false : i < h0 + k + d ? true : defHold(W, b);
    const e = tickBody(W, b, hold);
    if (b.sus > susMax) susMax = b.sus;
    if (e & E_CAUGHT) return -1e5 + (b.x - x0) * 100;
    if (e & E_END) return 900 + (H - i) * 2 - (b.wt > wt.dl ? 700 : 0) + (b.got - b0.got) * wt.f - (b.spots - b0.spots) * wt.sp - stopPen(b0, b, wt) - (b.catHits - b0.catHits) * wt.catW - (susMax - sus0) * 300;
  }
  let pv = 0;
  if (b.worn !== 'leaf') {
    const wm = watchMap(W), reach = Math.min(1.0, (b.ch * CHARGE_T * V) / (W.rain ? RAIN_X : 1));
    for (let x = b.x; x < b.x + reach; x += WBIN) {
      const i = Math.floor(x / WBIN);
      if (i >= 0 && i < wm.length && wm[i] > 0 && backAt(W, x, b.wt + (x - b.x) / V) === b.worn) pv += wm[i] * WBIN;
    }
  }
  const catGap = W.cat ? Math.max(0, 0.6 - (b.x - b.cat)) * (wt.catW > 500 ? 1200 : 400) : 0;
  const late = wt.dl < 1e9 ? Math.max(0, b.wt + (W.L - b.x) / V - wt.dl) * 6 : 0;
  return (b.x - x0) * 420 - catGap - late + (b.got - b0.got) * wt.f - (b.spots - b0.spots) * wt.sp - stopPen(b0, b, wt) - (b.catHits - b0.catHits) * wt.catW - (susMax - sus0) * 300 - b.sus * 60 + pv * 700;
}
function stopPen(b0: Body, b: Body, wt: Wts) {
  const n = b.stops - b0.stops, over = Math.max(0, b.stops - wt.stN) - Math.max(0, b0.stops - wt.stN);
  return n * wt.stop + over * 700;
}

/** 후보: [꾹 h0, 걷기 k, 꾹 d] — 서 있을 때 / 걷는 중 */
const C_STOP: number[][] = [], C_WALK: number[][] = [];
for (const h0 of [0, 15, 40, 80, 140]) for (const k of [0, 80, 160]) C_STOP.push([h0, k, 0]);
for (const k of [0, 40, 80, 130, 190]) C_WALK.push([0, k, 0]);
for (const k of [0, 8, 20, 36, 56, 84]) for (const d of [MORPH, MORPH + 50]) C_STOP.push([0, k, d]), C_WALK.push([0, k, d]);
const botMem = new WeakMap<object, { t0: number; h0: number; k: number; d: number; next: number; stage: number }>();
export const _dbg = { rollout, weights, gazeOf, backAt, gazeMask, cloneBody, tickBody, defHold };
/**
 * 잘하는 봇: 계획 여러 개(지금 멈추기 · 조금 걷다 멈추기 · 더 기다렸다 쭉 걷기)를 같은 몸 함수로 4~5초 굴려 보고,
 * 나아간 거리 · 과일 · 들킴 · 멈춘 수(판 별) · 고양이와 거리 · 들고 갈 무늬의 값어치로 고른다.
 */
export const chameleonSmart: Bot<ChamState> = {
  name: '앞을 보고 무늬 고르기',
  act(s) {
    if (s.phase !== 'play') return NO;
    const b = s.b, W = s.W;
    if (!b.go) return s.t > 20 ? HOLD : NO;
    let m = botMem.get(s);
    if (!m || m.stage !== s.stage * 100 + s.tries) botMem.set(s, (m = { t0: b.wt, h0: 0, k: 1e9, d: 0, next: 0, stage: s.stage * 100 + s.tries }));
    if (b.wt >= m.next) {
      const wt = weights(s), H = 300;
      let best = -1e18, pick = [0, 0, 0];
      for (const c of b.mode === STOP ? C_STOP : C_WALK) {
        const v = rollout(W, b, c[0], c[1], c[2], H, wt);
        if (v > best) (best = v), (pick = c);
      }
      m.t0 = b.wt;
      [m.h0, m.k, m.d] = pick;
      m.next = b.wt + 12;
    }
    const i = b.wt - m.t0;
    const hold = i < m.h0 ? true : i < m.h0 + m.k ? false : i < m.h0 + m.k + m.d ? true : defHold(W, b);
    return hold ? HOLD : NO;
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number }>();
/** 못하는 봇: 아무 때나 꾹 눌렀다 뗀다 */
export const chameleonRandom: Bot<ChamState> = {
  name: '아무 때나 꾹',
  act(s, rng) {
    if (s.phase !== 'play') return NO;
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 10 + Math.floor(rng() * 60), hold: 0 }));
    if (m.hold > 0) return m.hold--, HOLD;
    if (s.t < m.next) return NO;
    m.next = s.t + 40 + Math.floor(rng() * 160);
    m.hold = 1 + Math.floor(rng() * 70);
    return HOLD;
  },
};

/** 버릇 봇: 시선이 오면 늘 멈추고, 시선이 가면 걷는다 (무늬를 들고 갈 생각은 없음) */
export const chameleonHabit: Bot<ChamState> = {
  name: '시선이 오면 늘 멈추기',
  act(s) {
    if (s.phase !== 'play') return NO;
    const b = s.b;
    if (!b.go) return s.t > 20 ? HOLD : NO;
    return gazeMask(s.W, b.x + V * 4, b.wt + 4) ? HOLD : NO;
  },
};

/** 독립 버릇 봇: 등 뒤 무늬가 바뀔 때마다 늘 멈춰서 그 무늬로 갈아입는다 */
export const chameleonHabit2: Bot<ChamState> = {
  name: '늘 처음 만난 무늬로 갈아입기',
  act(s) {
    if (s.phase !== 'play') return NO;
    const b = s.b;
    if (!b.go) return s.t > 20 ? HOLD : NO;
    if (b.mode === STOP && b.m < 1) return HOLD;
    return backAt(s.W, b.x, b.wt) !== b.worn ? HOLD : NO;
  },
};

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
const OUT = '#3b2412';

// ── 무늬 (진열대와 카멜레온 몸이 같은 무늬 조각을 쓴다 — 숨으면 정말 감쪽같다) ──
const TILE = 0.11;
const PCOL: Record<Pat, { base: string; dark: string; light: string; chip: string }> = {
  banana: { base: '#ffd43b', dark: '#8a5416', light: '#fff1a0', chip: '#ffcf2a' },
  melon: { base: '#53bd4b', dark: '#1a6a2b', light: '#a6ea85', chip: '#2f9a3a' },
  awning: { base: '#f0493f', dark: '#b42a20', light: '#fff2da', chip: '#ee4a3d' },
  tile: { base: '#f7fbff', dark: '#2b66c9', light: '#9ec4f2', chip: '#3b78d8' },
  leaf: { base: '#66c24a', dark: '#3e8f2e', light: '#a8e070', chip: '#5cb845' },
};
function paintTile(g: C2, p: Pat, T: number) {
  const wrap = (x: number, y: number, r: number, f: (x: number, y: number) => void) => {
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) if (x + dx > -r && x + dx < T + r && y + dy > -r && y + dy < T + r) f(x + dx, y + dy);
  };
  const C = PCOL[p];
  g.fillStyle = C.base;
  g.fillRect(0, 0, T, T);
  if (p === 'banana') {
    g.strokeStyle = 'rgba(226,160,24,.55)';
    g.lineWidth = T * 0.035;
    for (const yy of [0.18, 0.52, 0.86]) {
      g.beginPath();
      g.moveTo(0, yy * T);
      g.bezierCurveTo(T * 0.3, (yy - 0.08) * T, T * 0.7, (yy + 0.08) * T, T, yy * T);
      g.stroke();
    }
    const spots: number[][] = [[0.2, 0.28, 0.075], [0.68, 0.14, 0.05], [0.52, 0.6, 0.09], [0.14, 0.8, 0.05], [0.84, 0.7, 0.062], [0.38, 0.92, 0.035], [0.9, 0.36, 0.032], [0.6, 0.36, 0.022], [0.3, 0.55, 0.025]];
    for (const [x, y, r] of spots)
      wrap(x * T, y * T, r * T * 1.5, (cx, cy) => {
        g.fillStyle = 'rgba(138,84,22,.45)';
        ell(g, cx, cy, r * T * 1.35, r * T * 1.1, 0.4);
        g.fill();
        g.fillStyle = C.dark;
        ell(g, cx, cy, r * T, r * T * 0.8, 0.4);
        g.fill();
      });
  } else if (p === 'melon') {
    g.fillStyle = 'rgba(166,234,133,.35)';
    for (let k = 0; k < 7; k++) wrap(hsh(k) * T, hsh(k + 9) * T, T * 0.05, (cx, cy) => (ell(g, cx, cy, T * 0.035, T * 0.02, 1.2), g.fill()));
    for (const sx of [0.22, 0.72]) {
      g.fillStyle = C.dark;
      g.beginPath();
      const n = 4, wd = T * 0.1, amp = T * 0.06;
      for (let i = 0; i <= n * 2; i++) {
        const y = (i / (n * 2)) * T, x = sx * T - wd + (i % 2 ? amp : -amp);
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      for (let i = n * 2; i >= 0; i--) {
        const y = (i / (n * 2)) * T, x = sx * T + wd + (i % 2 ? amp : -amp);
        g.lineTo(x, y);
      }
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(10,60,20,.35)';
      g.fillRect(sx * T - T * 0.02, 0, T * 0.04, T);
    }
  } else if (p === 'awning') {
    g.fillStyle = C.light;
    g.fillRect(T * 0.5, 0, T * 0.5, T);
    g.fillStyle = 'rgba(160,30,20,.25)';
    g.fillRect(T * 0.42, 0, T * 0.08, T);
    g.fillStyle = 'rgba(210,170,130,.3)';
    g.fillRect(T * 0.92, 0, T * 0.08, T);
    g.fillStyle = 'rgba(255,255,255,.18)';
    g.fillRect(T * 0.06, 0, T * 0.07, T);
  } else if (p === 'tile') {
    g.fillStyle = C.light;
    g.globalAlpha = 0.5;
    g.fillRect(0, 0, T, T);
    g.globalAlpha = 1;
    g.fillStyle = '#ffffff';
    rr(g, T * 0.03, T * 0.03, T * 0.94, T * 0.94, T * 0.06);
    g.fill();
    g.fillStyle = C.dark;
    for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T]]) {
      g.beginPath();
      g.arc(cx, cy, T * 0.24, 0, TAU);
      g.fill();
    }
    g.fillStyle = '#ffffff';
    for (const [cx, cy] of [[0, 0], [T, 0], [0, T], [T, T]]) {
      g.beginPath();
      g.arc(cx, cy, T * 0.12, 0, TAU);
      g.fill();
    }
    g.fillStyle = C.dark;
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2;
      ell(g, T / 2 + Math.cos(a) * T * 0.13, T / 2 + Math.sin(a) * T * 0.13, T * 0.11, T * 0.06, a);
      g.fill();
    }
    g.fillStyle = '#ffcf3a';
    g.beginPath();
    g.arc(T / 2, T / 2, T * 0.06, 0, TAU);
    g.fill();
    g.fillStyle = C.dark;
    for (const [cx, cy] of [[0.5, 0.04], [0.5, 0.96], [0.04, 0.5], [0.96, 0.5]]) {
      g.beginPath();
      g.arc(cx * T, cy * T, T * 0.03, 0, TAU);
      g.fill();
    }
  } else {
    for (let k = 0; k < 9; k++) {
      const x = hsh(k * 3.7) * T, y = hsh(k * 5.1 + 2) * T, a = hsh(k + 7) * TAU, L = T * (0.16 + hsh(k + 3) * 0.1);
      wrap(x, y, L, (cx, cy) => {
        g.fillStyle = k % 3 === 0 ? C.light : k % 3 === 1 ? C.dark : '#7fd055';
        ell(g, cx, cy, L, L * 0.42, a);
        g.fill();
        g.strokeStyle = 'rgba(30,80,20,.35)';
        g.lineWidth = T * 0.012;
        g.beginPath();
        g.moveTo(cx - Math.cos(a) * L * 0.8, cy - Math.sin(a) * L * 0.8);
        g.lineTo(cx + Math.cos(a) * L * 0.8, cy + Math.sin(a) * L * 0.8);
        g.stroke();
      });
    }
  }
}
const tileCache = new Map<string, HTMLCanvasElement>();
function tileCanvas(p: Pat, T: number, sc: number) {
  const key = `${p}:${Math.round(T * 10)}:${sc}`;
  let c = tileCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = Math.max(4, Math.round(T * sc));
  const g = c.getContext('2d')!;
  g.scale(c.width / T, c.width / T);
  paintTile(g, p, T);
  tileCache.set(key, c);
  return c;
}
const patCache = new WeakMap<C2, Map<string, CanvasPattern>>();
/** 무늬 칠하기: (ox, oy)가 무늬의 원점 (화면 px), k는 크기 배율 */
function patOf(g: C2, p: Pat, T: number, sc: number, ox: number, oy: number, k = 1): CanvasPattern | string {
  let m = patCache.get(g);
  if (!m) patCache.set(g, (m = new Map()));
  const key = `${p}:${Math.round(T * 10)}:${sc}`;
  let pt = m.get(key);
  if (!pt) {
    const c = g.createPattern(tileCanvas(p, T, sc), 'repeat');
    if (!c) return PCOL[p].base;
    m.set(key, (pt = c));
  }
  const px = tileCanvas(p, T, sc).width;
  if (typeof DOMMatrix !== 'undefined') pt.setTransform(new DOMMatrix([(T * k) / px, 0, 0, (T * k) / px, ox, oy]));
  return pt;
}

// ── 배경 (하늘 · 먼 마을 · 가까운 집) ──
interface Bg { sky: HTMLCanvasElement; far: HTMLCanvasElement; mid: HTMLCanvasElement; street: HTMLCanvasElement }
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
function house(g: C2, x: number, by: number, wd: number, ht: number, wall: string, roof: string | null, dome: string | null, seed: number, k: number) {
  g.fillStyle = 'rgba(120,90,60,.12)';
  g.fillRect(x + wd, by - ht + 2, wd * 0.08, ht - 2);
  g.fillStyle = wall;
  g.fillRect(x, by - ht, wd, ht);
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(x, by - ht, wd * 0.12, ht);
  if (roof) {
    g.fillStyle = roof;
    g.beginPath();
    g.moveTo(x - wd * 0.06, by - ht);
    g.lineTo(x + wd / 2, by - ht - wd * 0.28);
    g.lineTo(x + wd * 1.06, by - ht);
    g.closePath();
    g.fill();
  }
  if (dome) {
    g.fillStyle = dome;
    g.beginPath();
    g.arc(x + wd / 2, by - ht, wd * 0.32, Math.PI, 0);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,.45)';
    g.beginPath();
    g.arc(x + wd * 0.42, by - ht - wd * 0.12, wd * 0.07, 0, TAU);
    g.fill();
  }
  // 창문 · 문
  const rows = Math.max(1, Math.floor(ht / (k * 0.07)));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < Math.max(1, Math.floor(wd / (k * 0.06))); c++) {
      if (hsh(seed * 7 + r * 3 + c) < 0.35) continue;
      const wx = x + k * 0.018 + c * k * 0.06, wy = by - ht + k * 0.02 + r * k * 0.07;
      if (wx + k * 0.03 > x + wd) continue;
      g.fillStyle = hsh(seed + r + c * 5) < 0.5 ? '#3a8ad8' : '#5a6f8a';
      rr(g, wx, wy, k * 0.026, k * 0.034, k * 0.012);
      g.fill();
    }
}
function getBg(w: number, h: number, sc: number): Bg {
  const key = `${w}x${h}:${sc}`;
  const hit = BG.get(key);
  if (hit) return hit;
  const hz = WALL_T * w;
  const sky = layer(w, hz, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, hz, [0, '#3db8ff'], [0.45, '#8fdcff'], [0.8, '#d6f3ff'], [1, '#fff4d8']);
    g.fillRect(0, 0, w, hz);
    // 해 (오른쪽 위)
    const sx = w * 0.84, sy = w * 0.2, sr = w * 0.07;
    g.fillStyle = radg(g, sx, sy, sr * 0.5, sr * 5, [0, 'rgba(255,250,210,.9)'], [0.25, 'rgba(255,240,170,.35)'], [1, 'rgba(255,240,170,0)']);
    g.fillRect(0, 0, w, hz);
    g.fillStyle = radg(g, sx - sr * 0.2, sy - sr * 0.2, 0, sr, [0, '#fffef0'], [0.7, '#fff3a8'], [1, '#ffd84a']);
    g.beginPath();
    g.arc(sx, sy, sr, 0, TAU);
    g.fill();
  });
  // 먼 마을 (언덕 위 하얀 집 · 파란 지붕) — 가로로 이어 붙는다
  const FW = w * 2;
  const far = layer(FW, hz, sc, (g) => {
    const base = hz * 0.86;
    g.fillStyle = '#cfe9d8';
    g.beginPath();
    g.moveTo(0, hz);
    for (let x = 0; x <= FW; x += w * 0.05) g.lineTo(x, base - Math.sin((x / FW) * TAU * 2) * w * 0.03 - Math.sin((x / FW) * TAU * 5 + 1) * w * 0.012);
    g.lineTo(FW, hz);
    g.closePath();
    g.fill();
    for (let i = 0; i < 26; i++) {
      const x = (i / 26) * FW + hsh(i) * w * 0.02, wd = w * (0.045 + hsh(i + 3) * 0.04), ht = w * (0.04 + hsh(i + 5) * 0.06);
      const y = base - Math.sin((x / FW) * TAU * 2) * w * 0.03 + w * 0.01;
      house(g, x, y, wd, ht, i % 5 === 2 ? '#fde7cf' : '#f7fbff', null, i % 4 === 1 ? '#4aa0e8' : null, i, w * 0.6);
    }
    // 사이프러스
    for (let i = 0; i < 9; i++) {
      const x = hsh(i + 40) * FW, y = base + w * 0.01;
      g.fillStyle = '#5f9d6e';
      ell(g, x, y - w * 0.04, w * 0.01, w * 0.045);
      g.fill();
    }
  });
  // 가까운 집 (2층 · 덧창 · 빨래줄) — 차양 위로 보인다
  const MW = w * 2;
  const mid = layer(MW, hz + w * 0.02, sc, (g) => {
    const by = hz + w * 0.02;
    const walls = ['#fffaf0', '#ffe9c9', '#fff4dc', '#f6ecff', '#e8f6ff', '#fff0e2'];
    let x = 0, i = 0;
    while (x < MW) {
      const wd = w * (0.24 + hsh(i * 3.3) * 0.12), ht = w * (0.27 + hsh(i * 1.7) * 0.12);
      const col = walls[i % walls.length];
      g.fillStyle = col;
      g.fillRect(x, by - ht, wd + 1, ht);
      g.fillStyle = 'rgba(190,150,110,.18)';
      g.fillRect(x + wd - w * 0.012, by - ht, w * 0.012, ht);
      // 지붕 처마
      g.fillStyle = i % 2 ? '#e2794a' : '#d9663a';
      g.fillRect(x - w * 0.01, by - ht - w * 0.016, wd + w * 0.02, w * 0.02);
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.fillRect(x - w * 0.01, by - ht - w * 0.016, wd + w * 0.02, w * 0.004);
      // 창 두 개씩 (높으면 두 층): 파란 덧창 + 꽃 상자
      for (let c = 0; c < (ht > w * 0.31 ? 4 : 2); c++) {
        const wx = x + wd * (0.22 + (c % 2) * 0.42), wy = by - ht + w * 0.05 + (c >> 1) * w * 0.12, ww = w * 0.05, wh = w * 0.07;
        g.fillStyle = '#2f3f56';
        rr(g, wx, wy, ww, wh, w * 0.02);
        g.fill();
        g.fillStyle = '#9fd6ff';
        rr(g, wx + w * 0.006, wy + w * 0.006, ww - w * 0.012, wh - w * 0.012, w * 0.016);
        g.fill();
        g.fillStyle = i % 3 === 1 ? '#2bb39a' : '#2f86d6';
        for (const sx of [-1, 1]) {
          const px = sx < 0 ? wx - w * 0.024 : wx + ww;
          g.fillRect(px, wy, w * 0.024, wh);
          g.fillStyle = 'rgba(255,255,255,.3)';
          for (let l = 0; l < 4; l++) g.fillRect(px + w * 0.003, wy + w * 0.008 + l * w * 0.016, w * 0.018, w * 0.004);
          g.fillStyle = i % 3 === 1 ? '#2bb39a' : '#2f86d6';
        }
        g.fillStyle = '#c96a3a';
        g.fillRect(wx - w * 0.008, wy + wh, ww + w * 0.016, w * 0.014);
        for (let f = 0; f < 6; f++) {
          g.fillStyle = f % 2 ? '#ff5fa2' : '#ff9ac8';
          g.beginPath();
          g.arc(wx + (f / 5) * ww, wy + wh - w * 0.002, w * 0.009, 0, TAU);
          g.fill();
        }
      }
      // 부겐빌레아
      if (i % 2 === 0) {
        for (let f = 0; f < 18; f++) {
          g.fillStyle = f % 3 ? '#ff4f9a' : '#ff8ec4';
          g.beginPath();
          g.arc(x + wd - w * 0.02 + Math.sin(f * 1.7) * w * 0.03, by - ht + w * 0.02 + f * w * 0.008, w * (0.01 + hsh(f + i) * 0.008), 0, TAU);
          g.fill();
        }
        g.fillStyle = '#4c9a3a';
        for (let f = 0; f < 8; f++) (ell(g, x + wd - w * 0.03 + Math.sin(f * 2.3) * w * 0.03, by - ht + w * 0.03 + f * w * 0.016, w * 0.01, w * 0.005, f), g.fill());
      }
      x += wd;
      i++;
    }
    // 빨래줄
    for (let k = 0; k < 4; k++) {
      const x0 = (k / 4) * MW + w * 0.1, x1 = x0 + w * 0.32, y0 = by - w * 0.17 - hsh(k) * w * 0.03;
      g.strokeStyle = 'rgba(90,70,50,.6)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo((x0 + x1) / 2, y0 + w * 0.03, x1, y0);
      g.stroke();
      const cols = ['#ff6b6b', '#ffd93d', '#6bcBff', '#ffffff', '#a78bfa', '#7ee081'];
      for (let c = 0; c < 4; c++) {
        const u = 0.18 + c * 0.2, cx = x0 + (x1 - x0) * u, cy = y0 + w * 0.03 * 4 * u * (1 - u) * 0.5 + w * 0.004;
        g.fillStyle = cols[(k * 2 + c) % cols.length];
        if (c % 2) {
          g.fillRect(cx - w * 0.018, cy, w * 0.036, w * 0.04);
          g.fillRect(cx - w * 0.028, cy, w * 0.056, w * 0.014);
        } else {
          g.beginPath();
          g.moveTo(cx - w * 0.02, cy);
          g.lineTo(cx + w * 0.02, cy);
          g.lineTo(cx + w * 0.026, cy + w * 0.045);
          g.lineTo(cx - w * 0.026, cy + w * 0.045);
          g.closePath();
          g.fill();
        }
      }
    }
  });
  // 거리 돌바닥 (폭 1w로 이어 붙는다)
  const sh = (STREET_B - CNT_B) * w;
  const street = layer(w, sh, sc, (g) => {
    g.fillStyle = lin(g, 0, 0, 0, sh, [0, '#e8c48d'], [0.3, '#f4dcae'], [1, '#f9e8c6']);
    g.fillRect(0, 0, w, sh);
    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const y0 = (r / rows) * sh, rh = sh / rows, n = 9;
      for (let c = 0; c <= n; c++) {
        const cw = w / n, x0 = c * cw + (r % 2 ? cw / 2 : 0) - cw / 2;
        g.fillStyle = (r + c) % 3 === 0 ? 'rgba(214,170,110,.45)' : (r + c) % 3 === 1 ? 'rgba(255,240,210,.5)' : 'rgba(232,196,140,.4)';
        rr(g, x0 + 2, y0 + 1.5, cw - 4, rh - 3, rh * 0.35);
        g.fill();
        g.strokeStyle = 'rgba(170,120,70,.25)';
        g.lineWidth = 1;
        g.stroke();
      }
    }
  });
  const bg = { sky, far, mid, street };
  BG.set(key, bg);
  if (BG.size > 6) BG.delete(BG.keys().next().value!);
  return bg;
}

// ── 진열대 칸 (차양 + 무늬 벽 + 장식) — 칸마다 한 번 그려 둔다 ──
const SEG_Y0 = 0.44;
const AWN: Record<Pat, [string, string]> = { banana: ['#ffcf2a', '#fff8e4'], melon: ['#3fae46', '#f4fff0'], awning: ['#ee4a3d', '#fff2da'], tile: ['#2f78d8', '#f2f8ff'], leaf: ['#4fae3a', '#fff6e0'] };
const SEG_LABEL: Record<Pat, string> = { banana: '바나나', melon: '수박', awning: '천 가게', tile: '타일', leaf: '화분' };
const segCache = new Map<string, HTMLCanvasElement>();
function awning(g: C2, x0: number, x1: number, y0: number, y1: number, cols: [string, string], w: number) {
  const n = Math.max(2, Math.round((x1 - x0) / (w * 0.06)));
  const sw = (x1 - x0) / n;
  // 경사진 천
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? cols[1] : cols[0];
    g.fillRect(x0 + i * sw, y0, sw + 0.5, y1 - y0);
  }
  g.fillStyle = lin(g, 0, y0, 0, y1, [0, 'rgba(255,255,255,.35)'], [0.4, 'rgba(255,255,255,0)'], [1, 'rgba(90,40,10,.18)']);
  g.fillRect(x0, y0, x1 - x0, y1 - y0);
  // 물결 끝단
  for (let i = 0; i < n; i++) {
    g.fillStyle = i % 2 ? cols[1] : cols[0];
    g.beginPath();
    g.arc(x0 + (i + 0.5) * sw, y1, sw / 2, 0, Math.PI);
    g.fill();
    g.strokeStyle = 'rgba(80,40,10,.25)';
    g.lineWidth = 1;
    g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,.5)';
  g.fillRect(x0, y0, x1 - x0, w * 0.006);
}
function paintSeg(g: C2, k: Pat, a: number, b: number, w: number, sc: number, pad: number) {
  const x0 = pad, x1 = pad + (b - a) * w, Y = (y: number) => (y - SEG_Y0) * w, T = TILE * w, ox = pad - a * w;
  const fillPat = (p: Pat = k, kk = 1) => (g.fillStyle = patOf(g, p, T, sc, ox, -SEG_Y0 * w, kk));
  // 무늬 벽
  fillPat();
  g.fillRect(x0, Y(WALL_T), x1 - x0, Y(WALL_B) - Y(WALL_T) + 2);
  const C = PCOL[k];
  g.save();
  g.beginPath();
  g.rect(x0, Y(0.5), x1 - x0, Y(WALL_B) - Y(0.5) + 2);
  g.clip();
  if (k === 'banana') {
    // 걸린 바나나 송이 + 아래 더미 결
    g.fillStyle = '#8a5a2a';
    g.fillRect(x0, Y(0.6), x1 - x0, w * 0.012);
    const n = Math.max(1, Math.round((b - a) / 0.2));
    for (let i = 0; i < n; i++) {
      const cx = x0 + ((i + 0.5) / n) * (x1 - x0), cy = Y(0.61);
      g.strokeStyle = '#6a8a2a';
      g.lineWidth = w * 0.012;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx, cy + w * 0.04);
      g.stroke();
      for (const f of [-2, 2, -1, 1, 0]) {
        const sx2 = cx + f * w * 0.006, sy2 = cy + w * 0.038, ex2 = cx + f * w * 0.034, ey2 = cy + w * 0.1 - Math.abs(f) * w * 0.012;
        const qx = cx + f * w * 0.014, qy = cy + w * 0.135;
        g.lineCap = 'round';
        g.strokeStyle = '#7a4a10';
        g.lineWidth = w * 0.03;
        g.beginPath();
        g.moveTo(sx2, sy2);
        g.quadraticCurveTo(qx, qy, ex2, ey2);
        g.stroke();
        g.strokeStyle = f % 2 ? '#ffd22a' : '#ffdd4a';
        g.lineWidth = w * 0.022;
        g.stroke();
        g.strokeStyle = 'rgba(255,250,200,.8)';
        g.lineWidth = w * 0.006;
        g.beginPath();
        g.moveTo(sx2 - w * 0.004, sy2 + w * 0.01);
        g.quadraticCurveTo(qx - w * 0.006, qy - w * 0.012, ex2 - w * 0.004, ey2 - w * 0.004);
        g.stroke();
        g.fillStyle = '#4a3010';
        ell(g, ex2, ey2, w * 0.006, w * 0.006);
        g.fill();
      }
      g.fillStyle = '#6a8a2a';
      ell(g, cx, cy + w * 0.038, w * 0.012, w * 0.009);
      g.fill();
    }
    g.strokeStyle = 'rgba(168,118,26,.45)';
    g.lineWidth = 1.5;
    for (let i = 0; i < (b - a) / 0.07; i++) {
      const cx = x0 + i * w * 0.07 + hsh(i) * w * 0.03, cy = Y(0.79 + hsh(i + 4) * 0.08);
      g.beginPath();
      g.arc(cx, cy - w * 0.05, w * 0.06, 0.5, 2.3);
      g.stroke();
    }
  } else if (k === 'melon') {
    // 쌓인 수박
    for (let r = 0; r < 4; r++)
      for (let i = -1; i < (b - a) / 0.13 + 1; i++) {
        const cx = x0 + i * w * 0.13 + (r % 2 ? w * 0.065 : 0), cy = Y(0.66 + r * 0.075), rx = w * 0.07, ry = w * 0.052;
        ell(g, cx, cy, rx, ry);
        fillPat();
        g.fill();
        g.strokeStyle = 'rgba(16,70,30,.55)';
        g.lineWidth = 1.6;
        g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(cx - rx * 0.2, cy - ry * 0.25, rx * 0.55, ry * 0.45, 0, Math.PI * 1.1, Math.PI * 1.6);
        g.stroke();
      }
    // 맨 위 반쪽 수박
    const hx = x0 + (x1 - x0) * 0.5, hy = Y(0.62);
    g.fillStyle = '#ff5a6a';
    g.beginPath();
    g.arc(hx, hy, w * 0.055, Math.PI, 0);
    g.fill();
    g.strokeStyle = '#2a8a3a';
    g.lineWidth = w * 0.01;
    g.stroke();
    g.fillStyle = '#2a1a10';
    for (let s2 = 0; s2 < 5; s2++) (ell(g, hx - w * 0.03 + s2 * w * 0.015, hy - w * 0.02 - (s2 % 2) * w * 0.012, w * 0.004, w * 0.006), g.fill());
  } else if (k === 'awning') {
    // 걸린 천: 막대 + 주름
    g.fillStyle = '#7a4a22';
    g.fillRect(x0, Y(0.595), x1 - x0, w * 0.014);
    const n = Math.max(2, Math.round((b - a) / 0.09));
    for (let i = 0; i < n; i++) {
      const fx0 = x0 + (i / n) * (x1 - x0), fw = (x1 - x0) / n;
      g.fillStyle = lin(g, fx0, 0, fx0 + fw, 0, [0, 'rgba(255,255,255,.18)'], [0.35, 'rgba(255,255,255,0)'], [0.75, 'rgba(80,20,10,.16)'], [1, 'rgba(80,20,10,.04)']);
      g.fillRect(fx0, Y(0.6), fw, Y(WALL_B) - Y(0.6));
    }
    g.fillStyle = '#d8a84a';
    for (let i = 0; i < (b - a) / 0.03; i++) (ell(g, x0 + i * w * 0.03, Y(0.603), w * 0.008, w * 0.008), g.fill());
  } else if (k === 'tile') {
    // 장식 띠 + 아치 창
    g.fillStyle = '#ffcf3a';
    g.fillRect(x0, Y(0.585), x1 - x0, w * 0.022);
    g.fillStyle = '#2b66c9';
    for (let i = 0; i < (b - a) / 0.03; i++) (ell(g, x0 + i * w * 0.03 + w * 0.015, Y(0.596), w * 0.007, w * 0.007), g.fill());
    const n = Math.max(1, Math.round((b - a) / 0.3));
    for (let i = 0; i < n; i++) {
      const cx = x0 + ((i + 0.5) / n) * (x1 - x0), top = Y(0.62);
      g.fillStyle = '#e9f2ff';
      g.beginPath();
      g.moveTo(cx - w * 0.04, Y(0.72));
      g.lineTo(cx - w * 0.04, top + w * 0.04);
      g.arc(cx, top + w * 0.04, w * 0.04, Math.PI, 0);
      g.lineTo(cx + w * 0.04, Y(0.72));
      g.closePath();
      g.fill();
      g.strokeStyle = '#2b66c9';
      g.lineWidth = 2;
      g.stroke();
      g.fillStyle = '#c96a3a';
      rr(g, cx - w * 0.02, Y(0.69), w * 0.04, w * 0.03, w * 0.008);
      g.fill();
      g.fillStyle = '#ff5f8a';
      for (let f = 0; f < 3; f++) (ell(g, cx - w * 0.015 + f * w * 0.015, Y(0.678), w * 0.01, w * 0.01), g.fill());
    }
  } else {
    // 화분이 걸린 담쟁이 벽
    g.fillStyle = '#8a5a2a';
    g.fillRect(x0, Y(0.6), x1 - x0, w * 0.01);
    const n = Math.max(1, Math.round((b - a) / 0.14));
    for (let i = 0; i < n; i++) {
      const cx = x0 + ((i + 0.5) / n) * (x1 - x0);
      g.fillStyle = '#d0703a';
      g.beginPath();
      g.moveTo(cx - w * 0.035, Y(0.605));
      g.lineTo(cx + w * 0.035, Y(0.605));
      g.lineTo(cx + w * 0.026, Y(0.65));
      g.lineTo(cx - w * 0.026, Y(0.65));
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(cx - w * 0.033, Y(0.607), w * 0.066, w * 0.007);
      g.fillStyle = '#ff6fa8';
      for (let f = 0; f < 3; f++) (ell(g, cx - w * 0.02 + f * w * 0.02, Y(0.598), w * 0.01, w * 0.009), g.fill());
    }
  }
  g.restore();
  // 차양 아래 그늘
  g.fillStyle = lin(g, 0, Y(0.575), 0, Y(0.64), [0, 'rgba(70,40,10,.28)'], [1, 'rgba(70,40,10,0)']);
  g.fillRect(x0, Y(0.575), x1 - x0, Y(0.64) - Y(0.575));
  // 차양
  awning(g, x0 - 1, x1 + 1, Y(0.45), Y(0.555), AWN[k], w);
  // 이름표
  g.font = `900 ${Math.max(12, w * 0.036)}px system-ui, sans-serif`;
  const label = SEG_LABEL[k], tw = g.measureText(label).width + w * 0.03, lx = x0 + Math.min((x1 - x0) / 2, w * 0.2);
  if (x1 - x0 > tw + w * 0.02) {
    g.fillStyle = 'rgba(60,30,10,.25)';
    rr(g, lx - tw / 2 + 2, Y(0.468) + 2, tw, w * 0.05, w * 0.012);
    g.fill();
    g.fillStyle = '#fff8e8';
    rr(g, lx - tw / 2, Y(0.468), tw, w * 0.05, w * 0.012);
    g.fill();
    g.strokeStyle = C.dark;
    g.lineWidth = 1.5;
    g.stroke();
    g.fillStyle = '#5a3416';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(label, lx, Y(0.493) + 1);
  }
}
function segCanvas(stage: number, i: number, k: Pat, a: number, b: number, w: number, sc: number) {
  const key = `${stage}:${i}:${k}:${a}:${w}:${sc}`;
  let c = segCache.get(key);
  if (c) return c;
  const pad = w * 0.02;
  c = layer((b - a) * w + pad * 2, (WALL_B - SEG_Y0) * w + 2, sc, (g) => paintSeg(g, k, a, b, w, sc, pad));
  segCache.set(key, c);
  if (segCache.size > 40) segCache.delete(segCache.keys().next().value!);
  return c;
}

// ── 카멜레온 ──
interface ChamLook {
  worn: Pat; next: Pat | null; mu: number; ch: number; ox: number; oy: number; hidden: number; walk: number; mood: number; t: number;
  look: number; tongue: [number, number, number] | null; spin: number; hop: number; nerv: boolean; sparkle: number;
}
function chamPath(k: number, wig: number, curl: number) {
  const p = new Path2D();
  // 몸통
  p.moveTo(-0.4 * k, -0.22 * k);
  p.bezierCurveTo(-0.44 * k, -0.4 * k, -0.22 * k, -0.52 * k, 0.02 * k, -0.5 * k);
  p.bezierCurveTo(0.18 * k, -0.49 * k, 0.28 * k, -0.46 * k, 0.34 * k, -0.4 * k);
  p.lineTo(0.36 * k, -0.15 * k);
  p.bezierCurveTo(0.24 * k, -0.085 * k, 0.0, -0.075 * k, -0.2 * k, -0.095 * k);
  p.bezierCurveTo(-0.32 * k, -0.11 * k, -0.4 * k, -0.15 * k, -0.4 * k, -0.22 * k);
  p.closePath();
  // 머리 (투구 볏 + 주둥이)
  p.moveTo(0.22 * k, -0.42 * k);
  p.quadraticCurveTo(0.26 * k, -0.64 * k, 0.36 * k, -0.67 * k);
  p.quadraticCurveTo(0.46 * k, -0.53 * k, 0.56 * k, -0.43 * k);
  p.quadraticCurveTo(0.67 * k, -0.37 * k, 0.71 * k, -0.27 * k);
  p.quadraticCurveTo(0.72 * k, -0.19 * k, 0.64 * k, -0.155 * k);
  p.quadraticCurveTo(0.5 * k, -0.1 * k, 0.32 * k, -0.115 * k);
  p.quadraticCurveTo(0.2 * k, -0.2 * k, 0.22 * k, -0.42 * k);
  p.closePath();
  // 꼬리: 뒤로 뻗다가 아래로 돌돌 (curl 0이면 곧게)
  const pts: number[][] = [];
  const N = 26, cx = -0.66 * k, cy = -0.09 * k, r0 = 0.11 * k;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let x: number, y: number;
    if (u < 0.22) {
      const v = u / 0.22;
      x = -0.36 * k + (cx + 0.0 - -0.36 * k) * v;
      y = -0.215 * k + (cy - r0 - -0.215 * k) * v + Math.sin(v * 3) * wig * k * 0.02;
    } else {
      const v = (u - 0.22) / 0.78, th = -Math.PI / 2 - v * TAU * 1.35 * curl, r = r0 * (1 - 0.72 * v * curl) + (1 - curl) * v * 0.35 * k;
      x = cx + Math.cos(th) * r - (1 - curl) * v * 0.3 * k;
      y = cy + Math.sin(th) * r + (1 - curl) * r0 + Math.sin(v * 5 + wig) * wig * 0.015 * k;
    }
    pts.push([x, y]);
  }
  const wd = (u: number) => (0.075 - 0.062 * u) * k;
  const L: number[][] = [], Rr: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, ww = wd(i / N);
    L.push([pts[i][0] + nx * ww, pts[i][1] + ny * ww]);
    Rr.push([pts[i][0] - nx * ww, pts[i][1] - ny * ww]);
  }
  p.moveTo(L[0][0] + 0.06 * k, L[0][1]);
  for (const q of L) p.lineTo(q[0], q[1]);
  const tip = pts[N];
  p.arc(tip[0], tip[1], wd(1), 0, TAU);
  p.moveTo(Rr[N][0], Rr[N][1]);
  for (let i = N; i >= 0; i--) p.lineTo(Rr[i][0], Rr[i][1]);
  p.lineTo(Rr[0][0] + 0.06 * k, Rr[0][1]);
  p.closePath();
  return p;
}
function drawCham(ctx: C2, x: number, y: number, k: number, sc: number, T: number, o: ChamLook) {
  const t = o.t;
  // 바닥 그림자
  ctx.fillStyle = `rgba(70,40,10,${0.22 * (1 - o.hidden * 0.4)})`;
  ell(ctx, x - 0.02 * k, y + 0.01 * k, 0.55 * k * (1 - o.hop * 0.3), 0.06 * k);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - o.hop * k * 0.25);
  if (o.spin) {
    ctx.translate(0, -0.3 * k);
    ctx.rotate(o.spin);
    ctx.translate(0, 0.3 * k);
  }
  const br = Math.sin(t * 0.08) * 0.012;
  ctx.scale(1 + br, 1 - br);
  const wig = o.walk ? Math.sin(o.walk * 0.25) : 0;
  const curl = o.mood === 5 ? 0.65 : 1;
  const path = chamPath(k, wig, curl);
  const ox = o.ox - x, oy = o.oy - (y - o.hop * k * 0.25);
  const skin = (p: Pat) => patOf(ctx, p, T, sc, ox, oy);
  const outA = 1 - 0.68 * o.hidden;
  // 다리 (뒤쪽 둘: 어둡게)
  const ph = o.walk / (0.2 * k) * Math.PI;
  const leg = (sx: number, phase: number, far: boolean) => {
    const sw = Math.sin(ph + phase), lift = o.walk ? Math.max(0, Math.cos(ph + phase)) * 0.045 * k : 0;
    const fx = sx + (o.walk ? sw * 0.07 * k : 0), kx = sx + 0.06 * k, ky = -0.07 * k - lift * 0.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `rgba(40,30,10,${0.8 * outA})`;
    ctx.lineWidth = 0.1 * k;
    ctx.beginPath();
    ctx.moveTo(sx, -0.15 * k);
    ctx.lineTo(kx, ky);
    ctx.lineTo(fx, -lift);
    ctx.stroke();
    ctx.strokeStyle = skin(o.mu < 1 ? o.worn : o.worn);
    ctx.lineWidth = 0.07 * k;
    ctx.stroke();
    if (far) {
      ctx.strokeStyle = 'rgba(30,40,10,.28)';
      ctx.stroke();
    }
    ctx.fillStyle = skin(o.worn);
    ell(ctx, fx + 0.02 * k, -lift - 0.004 * k, 0.05 * k, 0.022 * k);
    ctx.fill();
    if (far) (ctx.fillStyle = 'rgba(30,40,10,.28)'), ctx.fill();
    ctx.strokeStyle = `rgba(40,30,10,${0.7 * outA})`;
    ctx.lineWidth = 0.014 * k;
    ctx.stroke();
  };
  leg(0.16 * k, Math.PI, true);
  leg(-0.3 * k, 0, true);
  // 몸 무늬: 바탕(바랜 곳은 잎빛) → 머리부터 남은 만큼 입은 무늬 → 바뀌는 중이면 새 무늬 물결
  const nose = 0.72 * k, tail = -0.82 * k, len = nose - tail;
  ctx.fillStyle = skin('leaf');
  ctx.fill(path);
  if (o.worn !== 'leaf' && o.ch > 0) {
    const xb = nose - len * Math.min(1, o.ch);
    ctx.save();
    ctx.clip(path);
    ctx.beginPath();
    ctx.moveTo(nose + k, -k);
    ctx.lineTo(xb, -k);
    for (let yy = -0.7; yy <= 0.05; yy += 0.05) ctx.lineTo(xb + Math.sin(yy * 30 + t * 0.1) * 0.025 * k, yy * k);
    ctx.lineTo(nose + k, 0.1 * k);
    ctx.closePath();
    ctx.fillStyle = skin(o.worn);
    ctx.fill();
    ctx.restore();
  }
  if (o.next && o.mu < 1) {
    // 물결: 머리에서 꼬리로
    const xf = nose - len * o.mu;
    ctx.save();
    ctx.clip(path);
    ctx.beginPath();
    ctx.moveTo(nose + k, -k);
    ctx.lineTo(xf, -k);
    for (let yy = -0.7; yy <= 0.05; yy += 0.04) ctx.lineTo(xf + Math.sin(yy * 22 + t * 0.5) * 0.05 * k, yy * k);
    ctx.lineTo(nose + k, 0.1 * k);
    ctx.closePath();
    ctx.fillStyle = skin(o.next);
    ctx.fill();
    // 물결 앞의 반짝 띠
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 0.035 * k;
    ctx.beginPath();
    for (let yy = -0.7; yy <= 0.05; yy += 0.04) {
      const xx = xf + Math.sin(yy * 22 + t * 0.5) * 0.05 * k;
      yy === -0.7 ? ctx.moveTo(xx, yy * k) : ctx.lineTo(xx, yy * k);
    }
    ctx.stroke();
    ctx.restore();
  }
  // 입체감: 위는 햇빛, 배는 밝게, 아래는 그늘
  ctx.save();
  ctx.clip(path);
  const sh = 1 - 0.75 * o.hidden;
  ctx.globalAlpha = sh;
  ctx.fillStyle = lin(ctx, 0, -0.68 * k, 0, 0, [0, 'rgba(255,255,230,.42)'], [0.35, 'rgba(255,255,230,.05)'], [0.75, 'rgba(40,30,0,.06)'], [1, 'rgba(40,30,0,.3)']);
  ctx.fillRect(-k, -k, 2 * k, 1.1 * k);
  ctx.fillStyle = 'rgba(255,250,210,.35)';
  ell(ctx, 0.0, -0.11 * k, 0.32 * k, 0.05 * k, -0.04);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
  // 테두리
  ctx.strokeStyle = `rgba(40,40,12,${0.9 * outA})`;
  ctx.lineWidth = 0.028 * k;
  ctx.lineJoin = 'round';
  ctx.stroke(path);
  // 등 돌기
  ctx.fillStyle = `rgba(255,255,255,${0.5 * outA})`;
  for (let i = 0; i < 6; i++) {
    const u = i / 5, bx = -0.32 * k + u * 0.5 * k, by = -0.47 * k - Math.sin(u * Math.PI) * 0.035 * k;
    ell(ctx, bx, by, 0.018 * k, 0.012 * k);
    ctx.fill();
  }
  // 앞다리 (가까운 둘)
  leg(-0.22 * k, Math.PI, false);
  leg(0.24 * k, 0, false);
  // 볼
  ctx.fillStyle = `rgba(255,120,140,${0.35 * outA + 0.1})`;
  ell(ctx, 0.56 * k, -0.2 * k, 0.05 * k, 0.03 * k);
  ctx.fill();
  // 눈: 볼록 솟은 눈 + 빙글빙글 동공
  const ex = 0.46 * k, ey = -0.37 * k, er = 0.115 * k;
  ctx.fillStyle = skin(o.next && o.mu > 0.6 ? o.next : o.ch > 0 ? o.worn : 'leaf');
  ctx.beginPath();
  ctx.arc(ex, ey, er, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,230,.25)';
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.026 * k;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(60,50,10,.35)';
  ctx.lineWidth = 0.012 * k;
  ctx.beginPath();
  ctx.arc(ex, ey, er * 0.68, 0, TAU);
  ctx.stroke();
  const happy = o.mood === 4 || o.mood === 3;
  if (o.mood === 5) {
    // 빙글빙글 (어질어질)
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.02 * k;
    ctx.beginPath();
    for (let a2 = 0; a2 < TAU * 2.2; a2 += 0.3) {
      const rr2 = er * 0.08 + (a2 / (TAU * 2.2)) * er * 0.6, aa = a2 + t * 0.4;
      a2 ? ctx.lineTo(ex + Math.cos(aa) * rr2, ey + Math.sin(aa) * rr2) : ctx.moveTo(ex + Math.cos(aa) * rr2, ey + Math.sin(aa) * rr2);
    }
    ctx.stroke();
  } else if (o.mood === 4) {
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.03 * k;
    ctx.beginPath();
    ctx.arc(ex, ey + er * 0.25, er * 0.5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    const a2 = o.nerv ? Math.sin(t * 0.35) * 1.2 + Math.PI * 0.1 : o.look, pr = o.mood === 2 ? 0.032 : 0.046;
    const px = ex + Math.cos(a2) * er * 0.42, py = ey + Math.sin(a2) * er * 0.38;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px, py, pr * k * 1.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b1208';
    ctx.beginPath();
    ctx.arc(px, py, pr * k, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(px - pr * k * 0.35, py - pr * k * 0.4, pr * k * 0.35, 0, TAU);
    ctx.fill();
    if (happy) {
      // 우쭐: 눈꺼풀 반쯤
      ctx.fillStyle = skin(o.ch > 0 ? o.worn : 'leaf');
      ctx.beginPath();
      ctx.arc(ex, ey, er * 0.98, Math.PI * 1.05, Math.PI * 1.95);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.022 * k;
      ctx.beginPath();
      ctx.moveTo(ex - er * 0.95, ey - er * 0.15);
      ctx.lineTo(ex + er * 0.95, ey - er * 0.15);
      ctx.stroke();
    }
  }
  // 콧구멍 · 입
  ctx.fillStyle = OUT;
  ell(ctx, 0.655 * k, -0.3 * k, 0.012 * k, 0.008 * k);
  ctx.fill();
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.022 * k;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (o.mood === 2 || o.mood === 5) {
    ctx.fillStyle = '#5a1a1a';
    ell(ctx, 0.6 * k, -0.19 * k, 0.04 * k, 0.03 * k);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.moveTo(0.7 * k, -0.215 * k);
    ctx.quadraticCurveTo(0.58 * k, happy || o.mood === 4 ? -0.13 * k : -0.17 * k, 0.43 * k, -0.2 * k);
    ctx.stroke();
  }
  // 혀
  if (o.tongue) {
    const [tx, ty, u] = o.tongue, mx = 0.7 * k, my = -0.21 * k, qx = mx + (tx - mx) * u, qy = my + (ty - my) * u;
    ctx.strokeStyle = '#c23a5a';
    ctx.lineWidth = 0.05 * k;
    ctx.beginPath();
    ctx.moveTo(mx, my);
    ctx.quadraticCurveTo((mx + qx) / 2, Math.min(my, qy) - 0.05 * k, qx, qy);
    ctx.stroke();
    ctx.strokeStyle = '#ff7a9a';
    ctx.lineWidth = 0.03 * k;
    ctx.stroke();
    ctx.fillStyle = '#ff5f86';
    ctx.beginPath();
    ctx.arc(qx, qy, 0.045 * k, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#a82a4a';
    ctx.lineWidth = 0.012 * k;
    ctx.stroke();
  }
  // 땀방울 (긴장)
  if (o.nerv || o.mood === 2) {
    const a2 = (t * 0.06) % 1;
    ctx.fillStyle = `rgba(120,200,255,${1 - a2})`;
    ctx.beginPath();
    const sx = 0.3 * k, sy = -0.66 * k + a2 * 0.12 * k;
    ctx.moveTo(sx, sy - 0.05 * k);
    ctx.quadraticCurveTo(sx + 0.035 * k, sy + 0.01 * k, sx, sy + 0.025 * k);
    ctx.quadraticCurveTo(sx - 0.035 * k, sy + 0.01 * k, sx, sy - 0.05 * k);
    ctx.fill();
  }
  // 바뀐 직후 반짝
  if (o.sparkle > 0) {
    ctx.fillStyle = `rgba(255,255,255,${o.sparkle})`;
    for (let i = 0; i < 6; i++) {
      const a2 = i * 1.05 + t * 0.08, r2 = (0.5 + 0.2 * Math.sin(i * 3 + t * 0.2)) * k;
      starPath(ctx, Math.cos(a2) * r2 * 0.9, -0.3 * k + Math.sin(a2) * r2 * 0.45, 0.04 * k);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ── 경비 강아지 (앉아서 고개를 돌린다) ──
function drawDog(ctx: C2, x: number, y: number, k: number, face: number, up: number, sniff: number, tilt: number, bark: number, t: number, sleepy: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(90,50,10,.22)';
  ell(ctx, 0, 0, 0.36 * k, 0.07 * k);
  ctx.fill();
  ctx.scale(face, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const body = '#f7e6c8', patch = '#c8783a', dark = '#8a4a1e';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025 * k;
  // 꼬리 (살랑)
  const wag = Math.sin(t * (bark > 0 ? 0.6 : 0.25)) * 0.5;
  ctx.save();
  ctx.translate(-0.26 * k, -0.12 * k);
  ctx.rotate(-0.9 + wag);
  ctx.fillStyle = patch;
  ell(ctx, 0, -0.12 * k, 0.045 * k, 0.13 * k);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 엉덩이 (앉은 다리)
  ctx.fillStyle = body;
  ell(ctx, -0.13 * k, -0.15 * k, 0.19 * k, 0.15 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = patch;
  ell(ctx, -0.16 * k, -0.2 * k, 0.1 * k, 0.08 * k, -0.3);
  ctx.fill();
  ctx.fillStyle = body;
  ell(ctx, -0.04 * k, -0.025 * k, 0.1 * k, 0.04 * k);
  ctx.fill();
  ctx.stroke();
  // 몸 · 가슴
  ctx.fillStyle = lin(ctx, 0, -0.6 * k, 0, 0, [0, '#fff4e0'], [1, body]);
  ell(ctx, 0.04 * k, -0.32 * k, 0.17 * k, 0.25 * k, 0.15);
  ctx.fill();
  ctx.stroke();
  // 앞다리
  for (const lx of [0.05, 0.15]) {
    ctx.fillStyle = body;
    rr(ctx, lx * k - 0.04 * k, -0.28 * k, 0.08 * k, 0.28 * k, 0.04 * k);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff8ec';
    ell(ctx, lx * k + 0.01 * k, -0.02 * k, 0.055 * k, 0.03 * k);
    ctx.fill();
    ctx.stroke();
  }
  // 목걸이
  ctx.fillStyle = '#e8403a';
  rr(ctx, -0.04 * k, -0.53 * k, 0.24 * k, 0.05 * k, 0.025 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0.1 * k, -0.47 * k, 0.03 * k, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 머리: 목에서 돌린다 (위를 보면 고개를 든다)
  ctx.save();
  ctx.translate(0.1 * k, -0.56 * k);
  const sn = sniff > 0 ? Math.sin(t * 0.7) * 0.04 : 0;
  ctx.rotate(-up * 0.55 + sniff * 0.45 + tilt + sn);
  // 귀 (뒤)
  const flop = Math.sin(t * 0.12) * 0.1 + tilt * 0.6;
  ctx.save();
  ctx.translate(-0.06 * k, -0.17 * k);
  ctx.rotate(0.35 + flop);
  ctx.fillStyle = dark;
  ell(ctx, -0.02 * k, 0.1 * k, 0.06 * k, 0.13 * k);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = body;
  ell(ctx, 0.04 * k, -0.12 * k, 0.17 * k, 0.15 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = patch;
  ell(ctx, -0.02 * k, -0.17 * k, 0.09 * k, 0.08 * k, -0.4);
  ctx.fill();
  // 주둥이
  ctx.fillStyle = '#fff8ec';
  ell(ctx, 0.19 * k, -0.06 * k, 0.11 * k, 0.075 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#2a1a12';
  ell(ctx, 0.29 * k, -0.09 * k, 0.04 * k, 0.032 * k);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ell(ctx, 0.28 * k, -0.1 * k, 0.014 * k, 0.009 * k);
  ctx.fill();
  if (bark > 0) {
    ctx.fillStyle = '#7a1a1a';
    ctx.beginPath();
    ctx.moveTo(0.12 * k, -0.02 * k);
    ctx.quadraticCurveTo(0.2 * k, 0.07 * k * bark + 0.02 * k, 0.28 * k, -0.02 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff7a8a';
    ell(ctx, 0.2 * k, 0.02 * k * bark + 0.005 * k, 0.03 * k, 0.015 * k);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(0.14 * k, -0.02 * k);
    ctx.quadraticCurveTo(0.19 * k, 0.0, 0.25 * k, -0.03 * k);
    ctx.stroke();
  }
  // 눈 · 눈썹
  const eyX = 0.09 * k, eyY = -0.15 * k;
  if (sleepy > 0.5) {
    ctx.beginPath();
    ctx.arc(eyX, eyY, 0.03 * k, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ell(ctx, eyX, eyY, 0.04 * k, 0.045 * k);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ell(ctx, eyX + 0.012 * k, eyY - up * 0.012 * k, 0.024 * k, 0.03 * k);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ell(ctx, eyX + 0.004 * k, eyY - 0.012 * k, 0.009 * k, 0.009 * k);
    ctx.fill();
  }
  ctx.strokeStyle = dark;
  ctx.lineWidth = 0.022 * k;
  ctx.beginPath();
  ctx.moveTo(eyX - 0.04 * k, eyY - 0.07 * k + (bark > 0 ? 0.015 * k : 0));
  ctx.lineTo(eyX + 0.045 * k, eyY - 0.075 * k - (tilt ? 0.02 * k : 0));
  ctx.stroke();
  // 경비 모자
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.022 * k;
  ctx.fillStyle = '#2f6fd1';
  ctx.beginPath();
  ctx.moveTo(-0.1 * k, -0.22 * k);
  ctx.quadraticCurveTo(0.0, -0.36 * k, 0.15 * k, -0.24 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1e4f9a';
  ell(ctx, 0.15 * k, -0.235 * k, 0.07 * k, 0.018 * k, 0.15);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  starPath(ctx, 0.03 * k, -0.28 * k, 0.03 * k);
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

// ── 가게 아저씨 (오래 본다 · 안 볼 땐 신문) ──
function drawMan(ctx: C2, x: number, y: number, k: number, face: number, look: number, paper: number, tilt: number, bark: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(90,50,10,.22)';
  ell(ctx, 0, 0, 0.26 * k, 0.045 * k);
  ctx.fill();
  ctx.scale(face, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.014 * k;
  const br = Math.sin(t * 0.05) * 0.006 * k;
  // 다리 · 신발
  ctx.fillStyle = '#5a4a3a';
  for (const lx of [-0.07, 0.04]) {
    rr(ctx, lx * k, -0.36 * k, 0.08 * k, 0.34 * k, 0.03 * k);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#3a2416';
  for (const lx of [-0.08, 0.04]) (ell(ctx, lx * k + 0.06 * k, -0.02 * k, 0.07 * k, 0.03 * k), ctx.fill(), ctx.stroke());
  // 배 (줄무늬 셔츠)
  ctx.save();
  ell(ctx, 0, -0.56 * k + br, 0.21 * k, 0.24 * k);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  ctx.fillStyle = '#3a7ad8';
  for (let i = -4; i < 6; i++) ctx.fillRect(-0.25 * k + i * 0.06 * k, -0.85 * k, 0.025 * k, 0.6 * k);
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ell(ctx, -0.1 * k, -0.5 * k, 0.12 * k, 0.24 * k);
  ctx.fill();
  ctx.restore();
  ell(ctx, 0, -0.56 * k + br, 0.21 * k, 0.24 * k);
  ctx.stroke();
  // 앞치마
  ctx.fillStyle = '#fff6e0';
  ctx.beginPath();
  ctx.moveTo(-0.1 * k, -0.72 * k);
  ctx.lineTo(0.14 * k, -0.72 * k);
  ctx.quadraticCurveTo(0.22 * k, -0.5 * k, 0.16 * k, -0.33 * k);
  ctx.lineTo(-0.12 * k, -0.33 * k);
  ctx.quadraticCurveTo(-0.16 * k, -0.5 * k, -0.1 * k, -0.72 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8d2a8';
  rr(ctx, -0.04 * k, -0.52 * k, 0.12 * k, 0.08 * k, 0.015 * k);
  ctx.fill();
  ctx.stroke();
  // 머리
  const hx = 0.02 * k, hy = -0.88 * k + br;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(tilt - look * 0.12);
  ctx.fillStyle = '#f4c39a';
  ctx.beginPath();
  ctx.arc(0, 0, 0.115 * k, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f0a27a';
  ell(ctx, 0.1 * k, 0.005 * k, 0.05 * k, 0.04 * k);
  ctx.fill();
  ctx.stroke();
  // 콧수염
  ctx.fillStyle = '#4a2c18';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(0.07 * k + sx * 0.035 * k, 0.05 * k, 0.055 * k, 0.022 * k, sx * 0.3, 0, TAU);
    ctx.fill();
  }
  // 눈 (볼 땐 가늘게 · 놀라면 동그랗게)
  ctx.fillStyle = '#1a120a';
  if (bark > 0) {
    ctx.fillStyle = '#ffffff';
    ell(ctx, 0.05 * k, -0.03 * k, 0.03 * k, 0.035 * k);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#1a120a';
    ell(ctx, 0.058 * k, -0.03 * k, 0.012 * k, 0.014 * k);
    ctx.fill();
  } else if (look > 0.5) {
    ctx.lineWidth = 0.016 * k;
    ctx.beginPath();
    ctx.moveTo(0.025 * k, -0.03 * k);
    ctx.lineTo(0.08 * k, -0.035 * k);
    ctx.stroke();
  } else {
    ell(ctx, 0.055 * k, -0.03 * k, 0.012 * k, 0.016 * k);
    ctx.fill();
  }
  ctx.strokeStyle = '#4a2c18';
  ctx.lineWidth = 0.02 * k;
  ctx.beginPath();
  ctx.moveTo(0.02 * k, -0.07 * k - look * 0.012 * k);
  ctx.lineTo(0.09 * k, -0.065 * k);
  ctx.stroke();
  // 납작 모자
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.014 * k;
  ctx.fillStyle = '#7a6a4a';
  ctx.beginPath();
  ctx.moveTo(-0.12 * k, -0.04 * k);
  ctx.quadraticCurveTo(-0.1 * k, -0.15 * k, 0.04 * k, -0.14 * k);
  ctx.quadraticCurveTo(0.17 * k, -0.12 * k, 0.17 * k, -0.06 * k);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5a4a32';
  ell(ctx, 0.12 * k, -0.055 * k, 0.07 * k, 0.018 * k, 0.1);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 팔 · 신문
  ctx.fillStyle = '#ffffff';
  if (paper > 0.05) {
    const py = hy + (1 - paper) * 0.25 * k;
    for (const sx of [-1, 1]) {
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 0.07 * k;
      ctx.beginPath();
      ctx.moveTo(sx * 0.15 * k, -0.68 * k);
      ctx.lineTo(0.12 * k + sx * 0.13 * k, py + 0.05 * k);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.05 * k;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(0.14 * k, py);
    ctx.rotate(-0.05 + Math.sin(t * 0.05) * 0.02);
    ctx.fillStyle = '#f3f0e6';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.014 * k;
    rr(ctx, -0.17 * k, -0.15 * k, 0.34 * k, 0.24 * k, 0.01 * k);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(60,50,40,.5)';
    ctx.beginPath();
    ctx.moveTo(0, -0.15 * k);
    ctx.lineTo(0, 0.09 * k);
    ctx.stroke();
    ctx.fillStyle = '#4a4036';
    ctx.fillRect(-0.15 * k, -0.13 * k, 0.13 * k, 0.03 * k);
    ctx.fillStyle = 'rgba(80,70,60,.45)';
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(-0.15 * k, -0.08 * k + i * 0.026 * k, 0.12 * k, 0.008 * k);
      ctx.fillRect(0.02 * k, -0.13 * k + i * 0.034 * k, 0.13 * k, 0.008 * k);
    }
    ctx.restore();
  } else {
    // 한 손은 허리, 한 손은 이마에 (살펴보기)
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.07 * k;
    ctx.beginPath();
    ctx.moveTo(-0.17 * k, -0.68 * k);
    ctx.lineTo(-0.25 * k, -0.52 * k);
    ctx.lineTo(-0.16 * k, -0.44 * k);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.05 * k;
    ctx.stroke();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.07 * k;
    ctx.beginPath();
    ctx.moveTo(0.16 * k, -0.7 * k);
    ctx.lineTo(0.2 * k, -0.86 * k);
    ctx.lineTo(0.1 * k, -0.95 * k + br);
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.05 * k;
    ctx.stroke();
    ctx.fillStyle = '#f4c39a';
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 0.012 * k;
    ell(ctx, 0.1 * k, -0.95 * k + br, 0.05 * k, 0.025 * k, -0.2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

// ── 망원경 아저씨 (발코니에서 멀리 훑는다) ──
function drawScope(ctx: C2, x: number, y: number, k: number, ang: number, t: number, bark: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // 벽 · 문
  ctx.fillStyle = '#fff6e6';
  rr(ctx, -0.42 * k, -0.95 * k, 0.84 * k, 0.95 * k, 0.04 * k);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,150,110,.25)';
  ctx.fillRect(0.34 * k, -0.95 * k, 0.08 * k, 0.95 * k);
  ctx.fillStyle = '#2f86d6';
  ctx.beginPath();
  ctx.moveTo(-0.2 * k, 0);
  ctx.lineTo(-0.2 * k, -0.55 * k);
  ctx.arc(0, -0.55 * k, 0.2 * k, Math.PI, 0);
  ctx.lineTo(0.2 * k, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1e5fa8';
  ctx.fillRect(-0.02 * k, -0.7 * k, 0.04 * k, 0.7 * k);
  // 사람 (상반신)
  const bob = Math.sin(t * 0.06) * 0.01 * k;
  ctx.fillStyle = '#24407a';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.025 * k;
  rr(ctx, -0.17 * k, -0.6 * k + bob, 0.34 * k, 0.5 * k, 0.12 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffd23a';
  for (let i = 0; i < 3; i++) (ell(ctx, 0.05 * k, -0.48 * k + i * 0.1 * k + bob, 0.02 * k, 0.02 * k), ctx.fill());
  ctx.fillStyle = '#f4c39a';
  ctx.beginPath();
  ctx.arc(0, -0.74 * k + bob, 0.15 * k, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8e4dc';
  ctx.beginPath();
  ctx.moveTo(-0.14 * k, -0.72 * k + bob);
  ctx.quadraticCurveTo(0, -0.44 * k + bob, 0.14 * k, -0.72 * k + bob);
  ctx.quadraticCurveTo(0, -0.62 * k + bob, -0.14 * k, -0.72 * k + bob);
  ctx.fill();
  ctx.stroke();
  // 선장 모자
  ctx.fillStyle = '#ffffff';
  rr(ctx, -0.17 * k, -0.98 * k + bob, 0.34 * k, 0.13 * k, 0.05 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1a2440';
  rr(ctx, -0.18 * k, -0.87 * k + bob, 0.36 * k, 0.05 * k, 0.02 * k);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, -0.92 * k + bob, 0.03 * k, 0, TAU);
  ctx.fill();
  // 눈 하나 (다른 눈은 망원경에)
  ctx.fillStyle = '#1a120a';
  if (bark > 0) (ctx.beginPath(), ctx.arc(-0.05 * k, -0.77 * k + bob, 0.025 * k, 0, TAU), ctx.fill());
  else (ctx.lineWidth = 0.02 * k), ctx.beginPath(), ctx.moveTo(-0.08 * k, -0.77 * k + bob), ctx.lineTo(-0.03 * k, -0.77 * k + bob), ctx.stroke();
  // 망원경 (황동)
  ctx.save();
  ctx.translate(0.06 * k, -0.76 * k + bob);
  ctx.rotate(ang);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.02 * k;
  for (const [x0, len, r0] of [[0, 0.22, 0.05], [0.2, 0.2, 0.062], [0.38, 0.16, 0.075]]) {
    ctx.fillStyle = lin(ctx, 0, -r0 * k, 0, r0 * k, [0, '#ffe08a'], [0.5, '#d8a030'], [1, '#8a5a12']);
    rr(ctx, x0 * k, -r0 * k, len * k, r0 * 2 * k, 0.015 * k);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#bfefff';
  ell(ctx, 0.54 * k, 0, 0.012 * k, 0.07 * k);
  ctx.fill();
  ctx.restore();
  // 손
  ctx.fillStyle = '#f4c39a';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.02 * k;
  ell(ctx, 0.18 * k, -0.68 * k + bob, 0.05 * k, 0.04 * k);
  ctx.fill();
  ctx.stroke();
  // 발코니 바닥 · 난간 · 화분
  ctx.fillStyle = '#f2e6d2';
  rr(ctx, -0.5 * k, -0.06 * k, k, 0.1 * k, 0.03 * k);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,80,40,.5)';
  ctx.lineWidth = 0.02 * k;
  ctx.stroke();
  ctx.strokeStyle = '#2a2a3a';
  ctx.lineWidth = 0.025 * k;
  ctx.beginPath();
  ctx.moveTo(-0.48 * k, -0.42 * k);
  ctx.lineTo(0.48 * k, -0.42 * k);
  ctx.stroke();
  ctx.lineWidth = 0.016 * k;
  for (let i = 0; i <= 8; i++) {
    const bx = -0.46 * k + i * 0.115 * k;
    ctx.beginPath();
    ctx.moveTo(bx, -0.42 * k);
    ctx.lineTo(bx, -0.06 * k);
    ctx.stroke();
    if (i < 8) {
      ctx.beginPath();
      ctx.arc(bx + 0.057 * k, -0.24 * k, 0.04 * k, 0, TAU);
      ctx.stroke();
    }
  }
  for (const px of [-0.36, 0.36]) {
    ctx.fillStyle = '#d0703a';
    rr(ctx, px * k - 0.06 * k, -0.52 * k, 0.12 * k, 0.1 * k, 0.02 * k);
    ctx.fill();
    for (let f = 0; f < 5; f++) {
      ctx.fillStyle = f % 2 ? '#ff4f9a' : '#ff9ac8';
      ctx.beginPath();
      ctx.arc(px * k + (f - 2) * 0.03 * k, -0.56 * k - (f % 2) * 0.03 * k, 0.03 * k, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

// ── 고양이 (냄새로 따라온다) ──
function drawCat(ctx: C2, x: number, y: number, k: number, t: number, leap: number, near: number) {
  ctx.save();
  ctx.translate(x, y - leap * k * 0.5);
  ctx.fillStyle = 'rgba(90,50,10,.2)';
  ell(ctx, 0, leap * k * 0.5, 0.4 * k, 0.07 * k);
  ctx.fill();
  ctx.rotate(-leap * 0.3);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.035 * k;
  const step = Math.sin(t * 0.3) * 0.05 * k;
  const fur = '#ffa63a', stripe = '#d0661a';
  // 꼬리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.12 * k;
  ctx.beginPath();
  ctx.moveTo(-0.3 * k, -0.25 * k);
  ctx.quadraticCurveTo(-0.55 * k, -0.4 * k + Math.sin(t * 0.15) * 0.08 * k, -0.45 * k, -0.7 * k);
  ctx.stroke();
  ctx.strokeStyle = fur;
  ctx.lineWidth = 0.08 * k;
  ctx.stroke();
  // 다리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.035 * k;
  ctx.fillStyle = fur;
  for (const [lx, ph] of [[-0.22, 0], [0.18, Math.PI]] as number[][]) {
    const d = Math.sin(t * 0.3 + ph) * 0.05 * k;
    rr(ctx, lx * k + d - 0.04 * k, -0.2 * k, 0.08 * k, 0.2 * k, 0.04 * k);
    ctx.fill();
    ctx.stroke();
  }
  // 몸 (낮게 웅크림)
  ctx.fillStyle = lin(ctx, 0, -0.45 * k, 0, -0.1 * k, [0, '#ffbe5a'], [1, fur]);
  ell(ctx, -0.04 * k, -0.27 * k + step * 0.2, 0.33 * k, 0.15 * k);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = stripe;
  ctx.lineWidth = 0.04 * k;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-0.2 * k + i * 0.1 * k, -0.4 * k);
    ctx.lineTo(-0.17 * k + i * 0.1 * k, -0.3 * k);
    ctx.stroke();
  }
  // 머리
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 0.035 * k;
  const hx = 0.3 * k, hy = -0.33 * k + Math.sin(t * 0.5) * 0.01 * k;
  ctx.fillStyle = fur;
  for (const ex of [-0.08, 0.08]) {
    ctx.beginPath();
    ctx.moveTo(hx + ex * k - 0.05 * k, hy - 0.08 * k);
    ctx.lineTo(hx + ex * k, hy - 0.22 * k);
    ctx.lineTo(hx + ex * k + 0.06 * k, hy - 0.08 * k);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ell(ctx, hx, hy, 0.15 * k, 0.13 * k);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff2dc';
  ell(ctx, hx + 0.06 * k, hy + 0.04 * k, 0.07 * k, 0.05 * k);
  ctx.fill();
  ctx.fillStyle = '#ff7a8a';
  ell(ctx, hx + 0.12 * k, hy + 0.01 * k, 0.025 * k, 0.018 * k);
  ctx.fill();
  // 눈 (가까우면 크게)
  ctx.fillStyle = '#1a120a';
  for (const ex of [-0.02, 0.07]) {
    if (near > 0.5) {
      ctx.fillStyle = '#fff3a0';
      ell(ctx, hx + ex * k, hy - 0.03 * k, 0.03 * k, 0.035 * k);
      ctx.fill();
      ctx.fillStyle = '#1a120a';
      ell(ctx, hx + ex * k + 0.005 * k, hy - 0.03 * k, 0.01 * k, 0.03 * k);
      ctx.fill();
    } else {
      ctx.lineWidth = 0.025 * k;
      ctx.beginPath();
      ctx.arc(hx + ex * k, hy - 0.03 * k, 0.025 * k, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
  }
  // 수염
  ctx.strokeStyle = 'rgba(60,30,10,.6)';
  ctx.lineWidth = 0.012 * k;
  for (const dy of [-0.01, 0.02]) {
    ctx.beginPath();
    ctx.moveTo(hx + 0.12 * k, hy + 0.02 * k);
    ctx.lineTo(hx + 0.26 * k, hy + dy * k);
    ctx.stroke();
  }
  ctx.restore();
}

// ── 손수레 + 당나귀 (수레 옆면이 무늬 벽이 된다) ──
function drawCart(ctx: C2, cx: number, y: number, wpx: number, p: Pat, T: number, sc: number, ox: number, rot: number, t: number) {
  const k = wpx;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  // 당나귀 (앞)
  const dx = cx + k * 0.62, dy = y - k * 0.06, step = Math.sin(t * 0.25);
  ctx.fillStyle = '#9a9aa8';
  for (const [lx, ph] of [[-0.12, 0], [0.1, Math.PI]] as number[][]) {
    rr(ctx, dx + lx * k + Math.sin(t * 0.25 + ph) * k * 0.02 - k * 0.02, dy - k * 0.2, k * 0.04, k * 0.22, k * 0.02);
    ctx.fill();
    ctx.stroke();
  }
  ell(ctx, dx, dy - k * 0.24 + step * k * 0.005, k * 0.17, k * 0.09);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#9a9aa8';
  ell(ctx, dx + k * 0.19, dy - k * 0.36, k * 0.07, k * 0.1, 0.5);
  ctx.fill();
  ctx.stroke();
  for (const e of [-0.02, 0.03]) {
    ell(ctx, dx + k * (0.15 + e), dy - k * 0.5, k * 0.02, k * 0.08, -0.2 + e * 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#d8d8e0';
  ell(ctx, dx + k * 0.24, dy - k * 0.31, k * 0.04, k * 0.035, 0.5);
  ctx.fill();
  ctx.fillStyle = '#1a120a';
  ell(ctx, dx + k * 0.2, dy - k * 0.39, k * 0.012, k * 0.014);
  ctx.fill();
  ctx.strokeStyle = '#8a5a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx + k * 0.5, y - k * 0.2);
  ctx.lineTo(dx - k * 0.05, dy - k * 0.24);
  ctx.stroke();
  // 수레 상자 (무늬)
  const x0 = cx - k / 2, top = y - k * 0.52;
  ctx.fillStyle = patOf(ctx, p, T, sc, ox, 0);
  rr(ctx, x0, top, k, k * 0.44, k * 0.03);
  ctx.fill();
  ctx.strokeStyle = '#6a3a18';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.fillRect(x0 + 2, top + 2, k - 4, k * 0.04);
  ctx.fillStyle = '#8a5a2a';
  ctx.fillRect(x0 - 2, top - 2, k + 4, k * 0.035);
  // 위에 쌓인 짐
  for (let i = 0; i < 4; i++) {
    const bx = x0 + k * (0.15 + i * 0.23), by = top - k * 0.04;
    ell(ctx, bx, by, k * 0.11, k * 0.08);
    ctx.fillStyle = patOf(ctx, p, T, sc, ox, 0, 0.7);
    ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,10,.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // 바퀴
  for (const wx of [x0 + k * 0.2, x0 + k * 0.8]) {
    const wr = k * 0.12, wy = y - k * 0.08;
    ctx.fillStyle = '#7a4a22';
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUT;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#c98a4a';
    ctx.beginPath();
    ctx.arc(wx, wy, wr * 0.75, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6a3a18';
    ctx.lineWidth = 2;
    for (let s2 = 0; s2 < 6; s2++) {
      const a = rot + (s2 * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * wr * 0.75, wy + Math.sin(a) * wr * 0.75);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ── 비둘기 (차양 위 구경꾼) ──
function drawPigeon(ctx: C2, x: number, y: number, k: number, t: number, hop: number, face: number, flap: number) {
  ctx.save();
  ctx.translate(x, y - hop * k * 0.6);
  ctx.scale(face, 1);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, k * 0.06);
  ctx.fillStyle = '#b9bccb';
  ell(ctx, 0, -k * 0.35, k * 0.42, k * 0.3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8e93a8';
  ctx.save();
  ctx.translate(-k * 0.05, -k * 0.4);
  ctx.rotate(flap ? -0.8 + Math.sin(t * 1.2) * 0.8 : 0.1);
  ell(ctx, -k * 0.15, 0, k * 0.3, k * 0.14);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#b9bccb';
  ctx.beginPath();
  ctx.arc(k * 0.32, -k * 0.7 + Math.sin(t * 0.2) * k * 0.03, k * 0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#7fd0b0';
  ell(ctx, k * 0.26, -k * 0.52, k * 0.14, k * 0.06);
  ctx.fill();
  ctx.fillStyle = '#ffb03a';
  ctx.beginPath();
  ctx.moveTo(k * 0.5, -k * 0.72);
  ctx.lineTo(k * 0.64, -k * 0.67);
  ctx.lineTo(k * 0.5, -k * 0.63);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a120a';
  ctx.beginPath();
  ctx.arc(k * 0.38, -k * 0.74, k * 0.045, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ff8a5a';
  ctx.lineWidth = Math.max(1, k * 0.05);
  ctx.beginPath();
  ctx.moveTo(-k * 0.05, -k * 0.08);
  ctx.lineTo(-k * 0.05, 0);
  ctx.moveTo(k * 0.08, -k * 0.08);
  ctx.lineTo(k * 0.08, 0);
  ctx.stroke();
  ctx.restore();
}

// ── 과일 ──
const FRUIT_COL = ['#ff4a4a', '#ff9a2a', '#8a4ad8', '#c8e04a', '#ffe23a', '#ffa08a', '#e8203a', '#7a3aa8'];
function drawFruit(ctx: C2, x: number, y: number, r: number, kind: number) {
  const c = FRUIT_COL[kind % FRUIT_COL.length];
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = Math.max(1, r * 0.12);
  if (kind % 8 === 2 || kind % 8 === 6) {
    // 포도 · 체리
    const n = kind % 8 === 2 ? 6 : 2;
    for (let i = 0; i < n; i++) {
      const bx = (n === 2 ? (i - 0.5) * r * 0.9 : ((i % 3) - 1) * r * 0.55 + (i >= 3 ? r * 0.27 : 0)), by = n === 2 ? r * 0.2 : (i >= 3 ? r * 0.5 : 0) - r * 0.1;
      ctx.fillStyle = radg(ctx, bx - r * 0.15, by - r * 0.15, 0, r * 0.5, [0, '#ffffff'], [0.25, c], [1, c]);
      ctx.beginPath();
      ctx.arc(bx, by, r * (n === 2 ? 0.5 : 0.36), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = '#4a7a2a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(n === 2 ? -r * 0.4 : 0, -r * 0.2);
    if (n === 2) (ctx.moveTo(0, -r * 0.9), ctx.lineTo(r * 0.4, -r * 0.2));
    ctx.stroke();
  } else {
    ctx.fillStyle = radg(ctx, -r * 0.35, -r * 0.35, 0, r * 1.2, [0, '#ffffff'], [0.22, c], [1, c]);
    if (kind % 8 === 3) {
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.bezierCurveTo(r * 0.5, -r, r * 0.5, -r * 0.3, r * 0.8, r * 0.3);
      ctx.bezierCurveTo(r, r, -r, r, -r * 0.8, r * 0.3);
      ctx.bezierCurveTo(-r * 0.5, -r * 0.3, -r * 0.5, -r, 0, -r);
    } else if (kind % 8 === 4) ell(ctx, 0, 0, r * 1.05, r * 0.78);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
    }
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#6a4a1a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(r * 0.1, -r * 1.25);
    ctx.stroke();
    ctx.fillStyle = '#5ab83a';
    ell(ctx, r * 0.35, -r * 1.05, r * 0.35, r * 0.16, -0.5);
    ctx.fill();
    ctx.lineWidth = Math.max(1, r * 0.08);
    ctx.stroke();
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

// ── 장면 ──
const sayMem = new WeakMap<object, { x: number; y: number; t: number; size: number }[]>();
const banMem = new WeakMap<object, { t: number; text: string; sub: string; col: string; n: number }>();
const visMem = new WeakMap<object, { hid: number; jump: number; pounce: number }>();
const DOG_H = 0.23, MAN_H = 0.36, SCOPE_K = 0.18, CHAM_K = 0.2, CAT_K = 0.13;
const DOG_Y = 1.31, MAN_Y = 1.345, SCOPE_Y = 0.43;
function guardEye(g: Guard, face: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number): [number, number] {
  if (g.k === 'dog') return [X(g.x) + face * R(0.07), Y(DOG_Y) - R(DOG_H * 0.66)];
  if (g.k === 'man') return [X(g.x) + face * R(0.04), Y(MAN_Y) - R(MAN_H * 0.88)];
  return [X(g.x) + R(0.01), Y(SCOPE_Y) - R(SCOPE_K * 0.76)];
}
function bubble(ctx: C2, x: number, y: number, r: number, text: string, bgc: string, fg: string, R: (r: number) => number) {
  ctx.fillStyle = 'rgba(60,30,10,.25)';
  ctx.beginPath();
  ctx.arc(x + 2, y + 3, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = bgc;
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.moveTo(x - r * 0.3, y + r * 0.85);
  ctx.lineTo(x - r * 0.1, y + r * 1.45);
  ctx.lineTo(x + r * 0.35, y + r * 0.8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = bgc;
  ctx.beginPath();
  ctx.arc(x, y, r - 1.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.font = `900 ${Math.max(13, r * 1.3)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
  void R;
}

function drawAll(ctx: C2, s: ChamState, w: number, h: number, th: Theme) {
  const fx = juice(s), cam = s.camX;
  const X = (x: number) => (x - cam) * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const sc = typeof ctx.getTransform === 'function' ? Math.min(3, Math.max(1, Math.round(ctx.getTransform().a || 1))) : 1;
  const bg = getBg(Math.round(w), Math.round(h), sc);
  const t = s.t, b = s.b, W = s.W, d = STAGES[s.stage], T = R(TILE);
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  let vm = visMem.get(s);
  if (!vm) visMem.set(s, (vm = { hid: 0, jump: -99, pounce: -99 }));
  const play = s.phase === 'play';
  const gz = W.guards.map((g) => {
    const z = gazeOf(g, b.wt);
    return { c: z.c, h: b.go ? z.h : g.intro.length ? g.intro[0][1] : 0, soft: z.soft || !b.go };
  });
  const back = backAt(W, b.x, b.wt);

  ctx.save();
  fx.begin(ctx);
  // ── 하늘 · 무지개 · 구름 ──
  (globalThis as any).__pm?.push(['1', performance.now()]);
  ctx.drawImage(bg.sky, 0, 0, w, Y(WALL_T));
  if (W.rain) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    const cols = ['#ff5a5a', '#ffa83a', '#ffe23a', '#5ad85a', '#4ab8ff', '#8a6aff'];
    cols.forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.arc(w * 0.35 - cam * w * 0.05, Y(0.62), R(0.42 - i * 0.012), Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    });
    ctx.restore();
  }
  for (let i = 0; i < 5; i++) {
    const cx = ((((hsh(i) * 1.6 + t * 0.00012 * (1 + i * 0.2) - cam * 0.08) % 1.6) + 1.6) % 1.6) * w - w * 0.3, cy = Y(0.16 + hsh(i + 7) * 0.14), cr = R(0.035 + hsh(i + 3) * 0.025);
    ctx.fillStyle = W.rain ? 'rgba(235,240,250,.95)' : 'rgba(255,255,255,.95)';
    for (const [ddx, ddy, rr2] of [[0, 0, 1], [1.1, 0.2, 0.8], [-1.0, 0.25, 0.75], [0.4, -0.45, 0.85], [2.0, 0.35, 0.6]]) {
      ctx.beginPath();
      ctx.arc(cx + ddx * cr, cy + ddy * cr, cr * rr2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(160,200,230,.25)';
    ell(ctx, cx + cr * 0.5, cy + cr * 0.6, cr * 2, cr * 0.3);
    ctx.fill();
  }
  // ── 먼 마을 · 가까운 집 (시차) ──
  (globalThis as any).__pm?.push(['2', performance.now()]);
  const fw = bg.far.width / sc, mw = bg.mid.width / sc;
  const fo = -((((cam * w * 0.22) % fw) + fw) % fw), mo = -((((cam * w * 0.55) % mw) + mw) % mw);
  ctx.drawImage(bg.far, fo, 0, fw, bg.far.height / sc);
  ctx.drawImage(bg.far, fo + fw, 0, fw, bg.far.height / sc);
  ctx.drawImage(bg.mid, mo, 0, mw, bg.mid.height / sc);
  ctx.drawImage(bg.mid, mo + mw, 0, mw, bg.mid.height / sc);
  // ── 골목을 가로지르는 깃발 줄 ──
  (globalThis as any).__pm?.push(['3', performance.now()]);
  {
    const cols = ['#ff5a5a', '#ffd23a', '#4ab8ff', '#5ad85a', '#ff8ac0', '#ffffff', '#ffa63a'];
    const pw = w * 0.95, po = -((((cam * w * 0.7) % pw) + pw) % pw);
    for (let k2 = 0; k2 < 3; k2++) {
      const x0 = po + k2 * pw, x1 = x0 + pw * 0.9, y0 = Y(0.27 + (k2 % 2) * 0.03), sag = R(0.05);
      ctx.strokeStyle = 'rgba(90,60,40,.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0);
      ctx.stroke();
      const n = 14;
      for (let j = 1; j < n; j++) {
        const u = j / n, fxp = x0 + (x1 - x0) * u, fyp = y0 + sag * 4 * u * (1 - u), sway = Math.sin(t * 0.06 + j) * 0.12;
        ctx.save();
        ctx.translate(fxp, fyp);
        ctx.rotate(sway);
        ctx.fillStyle = cols[(j + k2 * 3) % cols.length];
        ctx.beginPath();
        ctx.moveTo(-R(0.016), 0);
        ctx.lineTo(R(0.016), 0);
        ctx.lineTo(0, R(0.038));
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(90,50,20,.35)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
  }
  // ── 망원경 발코니 (차양 뒤) ──
  (globalThis as any).__pm?.push(['4', performance.now()]);
  W.guards.forEach((g, i) => {
    if (g.k !== 'scope') return;
    const z = gz[i], [ex, ey] = guardEye(g, 1, X, Y, R);
    const ang = Math.atan2(Y(0.86) - ey, X(z.c) - ex);
    drawScope(ctx, X(g.x), Y(SCOPE_Y), R(SCOPE_K), ang, t, t - s.bark[i] < 40 ? 1 : 0);
  });
  // ── 진열대 칸 ──
  (globalThis as any).__pm?.push(['5', performance.now()]);
  for (let i = 0; i < W.segs.length; i++) {
    const g = W.segs[i];
    if (X(g.b) < -20 || X(g.a) > w + 20) continue;
    if (g.k === 'sign') {
      const sg = signAt(W, b.wt), u = sg.u, show = u < 0.5 ? sg.p : sg.q, sq = Math.abs(Math.cos(Math.PI * u));
      const x0 = X(g.a), x1 = X(g.b), cxm = (x0 + x1) / 2, hw = ((x1 - x0) / 2) * sq;
      ctx.fillStyle = '#5a3a2a';
      ctx.fillRect(x0, Y(WALL_T), x1 - x0, Y(WALL_B) - Y(WALL_T));
      ctx.fillStyle = patOf(ctx, show, T, sc, X(0), 0);
      ctx.fillRect(cxm - hw, Y(WALL_T), hw * 2, Y(WALL_B) - Y(WALL_T));
      ctx.fillStyle = `rgba(0,0,0,${0.25 * (1 - sq)})`;
      ctx.fillRect(cxm - hw, Y(WALL_T), hw * 2, Y(WALL_B) - Y(WALL_T));
      ctx.fillStyle = '#ffcf3a';
      for (let j = 0; j < (x1 - x0) / R(0.04); j++) {
        const on = (j + Math.floor(t / 8)) % 3 === 0;
        ctx.fillStyle = on ? '#fff6a0' : '#e0a83a';
        ctx.beginPath();
        ctx.arc(x0 + R(0.02) + j * R(0.04), Y(WALL_T) + R(0.012), R(0.008), 0, TAU);
        ctx.fill();
      }
      awning(ctx, x0 - 1, x1 + 1, Y(0.45), Y(0.555), ['#9a5ad8', '#f6eeff'], w);
      font(0.034, 900);
      ctx.fillStyle = '#fff8e8';
      rr(ctx, cxm - R(0.075), Y(0.468), R(0.15), R(0.05), R(0.012));
      ctx.fill();
      ctx.strokeStyle = '#6a3aa8';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#4a2a6a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('돌아가는 간판', cxm, Y(0.493) + 1, R(0.14));
      // 다음 무늬 미리 보기 (작은 원)
      const nx = signAt(W, b.wt + SIGN_HOLD + SIGN_FLIP);
      ctx.fillStyle = patOf(ctx, nx.p, T, sc, 0, 0, 0.35);
      ctx.beginPath();
      ctx.arc(x1 - R(0.03), Y(WALL_T) + R(0.05), R(0.02), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      continue;
    }
    const cv = segCanvas(s.stage, i, g.k as Pat, g.a, g.b, Math.round(w), sc);
    ctx.drawImage(cv, X(g.a) - R(0.02), Y(SEG_Y0), cv.width / sc, cv.height / sc);
  }
  // 칸 사이 기둥
  for (let i = 0; i < W.segs.length - 1; i++) {
    const px = X(W.segs[i].b);
    if (px < -20 || px > w + 20) continue;
    ctx.fillStyle = lin(ctx, px - R(0.01), 0, px + R(0.01), 0, [0, '#a8703a'], [0.5, '#7a4a22'], [1, '#5a3418']);
    ctx.fillRect(px - R(0.009), Y(0.45), R(0.018), Y(WALL_B) - Y(0.45));
  }
  // 골목 끝: 꽃 아치
  {
    const gx = X(W.L);
    if (gx < w + 60) {
      ctx.strokeStyle = '#7a4a22';
      ctx.lineWidth = R(0.022);
      ctx.beginPath();
      ctx.arc(gx + R(0.08), Y(WALL_B), R(0.16), Math.PI, 0);
      ctx.stroke();
      for (let f = 0; f < 16; f++) {
        const a = Math.PI + (f / 15) * Math.PI;
        ctx.fillStyle = f % 3 === 0 ? '#ff4f9a' : f % 3 === 1 ? '#ffd23a' : '#ffffff';
        ctx.beginPath();
        ctx.arc(gx + R(0.08) + Math.cos(a) * R(0.16), Y(WALL_B) + Math.sin(a) * R(0.16), R(0.018), 0, TAU);
        ctx.fill();
      }
      font(0.034, 900);
      ctx.fillStyle = '#fff8e8';
      rr(ctx, gx + R(0.08) - R(0.07), Y(WALL_B) - R(0.2), R(0.14), R(0.045), R(0.012));
      ctx.fill();
      ctx.strokeStyle = '#7a4a22';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#5a3416';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('골목 끝', gx + R(0.08), Y(WALL_B) - R(0.177));
    }
  }
  // ── 손수레 ──
  (globalThis as any).__pm?.push(['6', performance.now()]);
  for (const c of W.carts) {
    const cx = cartX(c, b.wt);
    if (X(cx) < -R(0.6) || X(cx) > w + R(0.6)) continue;
    drawCart(ctx, X(cx), Y(WALL_B), c.w * w, c.pat, T, sc, X(cx - c.w / 2), cx / (0.12 * c.w), t);
  }
  // ── 과일 선반 ──
  (globalThis as any).__pm?.push(['7', performance.now()]);
  W.fruits.forEach((fxw, i) => {
    const px = X(fxw), py = Y(0.655);
    if (px < -30 || px > w + 30) return;
    ctx.fillStyle = '#8a5a2a';
    rr(ctx, px - R(0.04), py + R(0.022), R(0.08), R(0.012), R(0.004));
    ctx.fill();
    ctx.fillStyle = 'rgba(60,30,10,.25)';
    ctx.fillRect(px - R(0.035), py + R(0.034), R(0.07), R(0.006));
    const got = (b.gm >> i) & 1, flying = s.tongue && s.tongue.i === i;
    if (got && !flying) return;
    const kind = (i * 3 + s.stage * 5) % 8;
    if (!flying) {
      const near = Math.abs(fxw - (b.x + 0.04)) < REACH && play;
      if (near && !b.mask) {
        ctx.fillStyle = `rgba(255,255,200,${0.4 + 0.3 * Math.sin(t * 0.4)})`;
        ctx.beginPath();
        ctx.arc(px, py, R(0.04), 0, TAU);
        ctx.fill();
      }
      drawFruit(ctx, px, py + Math.sin(t * 0.05 + i) * 1, R(0.026), kind);
    }
  });
  // ── 계산대 (카멜레온이 걷는 곳) ──
  (globalThis as any).__pm?.push(['8', performance.now()]);
  {
    const top = Y(WALL_B), mid = Y(0.955), bot = Y(CNT_B);
    ctx.fillStyle = lin(ctx, 0, top, 0, mid, [0, '#e8b070'], [1, '#c48444']);
    ctx.fillRect(-10, top, w + 20, mid - top);
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    ctx.fillRect(-10, top, w + 20, 1.5);
    ctx.fillStyle = lin(ctx, 0, mid, 0, bot, [0, '#a8642e'], [1, '#7a4420']);
    ctx.fillRect(-10, mid, w + 20, bot - mid);
    ctx.strokeStyle = 'rgba(60,30,10,.35)';
    ctx.lineWidth = 1.5;
    const pw = R(0.09), po = -((((cam * w) % pw) + pw) % pw);
    for (let x = po; x < w + pw; x += pw) {
      ctx.beginPath();
      ctx.moveTo(x, mid);
      ctx.lineTo(x, bot);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,220,160,.5)';
      ctx.beginPath();
      ctx.arc(x + pw * 0.5, mid + R(0.015), 1.3, 0, TAU);
      ctx.arc(x + pw * 0.5, bot - R(0.015), 1.3, 0, TAU);
      ctx.fill();
    }
    const tw2 = R(0.3), to = -((((cam * w) % tw2) + tw2) % tw2);
    for (let x = to; x < w + tw2; x += tw2) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, mid);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,240,200,.5)';
    ctx.fillRect(-10, mid, w + 20, 1.5);
  }
  // ── 거리 ──
  (globalThis as any).__pm?.push(['9', performance.now()]);
  {
    const so = -((((cam * w) % w) + w) % w), sh = (STREET_B - CNT_B) * w;
    ctx.drawImage(bg.street, so, Y(CNT_B), w, sh);
    ctx.drawImage(bg.street, so + w, Y(CNT_B), w, sh);
    ctx.fillStyle = lin(ctx, 0, Y(CNT_B), 0, Y(CNT_B) + R(0.05), [0, 'rgba(90,50,20,.35)'], [1, 'rgba(90,50,20,0)']);
    ctx.fillRect(0, Y(CNT_B), w, R(0.05));
    // 거리 소품 (바구니 · 화분 · 상자)
    const i0 = Math.floor((cam - 0.3) / 0.41), i1 = Math.ceil((cam + 1.3) / 0.41);
    for (let i = i0; i <= i1; i++) {
      const wx = i * 0.41 + hsh(i) * 0.12;
      if (W.guards.some((g) => g.k !== 'scope' && Math.abs(g.x - wx) < 0.17)) continue;
      const px = X(wx), py = Y(1.3), kind = Math.floor(hsh(i + 50) * 3);
      ctx.fillStyle = 'rgba(90,50,10,.2)';
      ell(ctx, px, py + R(0.005), R(0.06), R(0.014));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.5;
      if (kind === 0) {
        ctx.fillStyle = '#c98a3a';
        ctx.beginPath();
        ctx.moveTo(px - R(0.055), py - R(0.05));
        ctx.lineTo(px + R(0.055), py - R(0.05));
        ctx.lineTo(px + R(0.04), py);
        ctx.lineTo(px - R(0.04), py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        for (let f = 0; f < 5; f++) drawFruit(ctx, px - R(0.036) + f * R(0.018), py - R(0.058) - (f % 2) * R(0.012), R(0.013), 1);
      } else if (kind === 1) {
        ctx.fillStyle = '#d0703a';
        ctx.beginPath();
        ctx.moveTo(px - R(0.04), py - R(0.06));
        ctx.lineTo(px + R(0.04), py - R(0.06));
        ctx.lineTo(px + R(0.03), py);
        ctx.lineTo(px - R(0.03), py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#4caf3a';
        for (let f = 0; f < 6; f++) (ell(ctx, px + (f - 2.5) * R(0.014), py - R(0.08) - Math.abs(f - 2.5) * -R(0.006), R(0.014), R(0.03), (f - 2.5) * 0.3), ctx.fill(), ctx.stroke());
        ctx.fillStyle = '#ffd23a';
        for (let f = 0; f < 3; f++) (ell(ctx, px + (f - 1) * R(0.02), py - R(0.11), R(0.01), R(0.01)), ctx.fill());
      } else {
        ctx.fillStyle = '#b8803e';
        rr(ctx, px - R(0.05), py - R(0.06), R(0.1), R(0.06), R(0.006));
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = 'rgba(60,30,10,.4)';
        ctx.beginPath();
        ctx.moveTo(px - R(0.05), py - R(0.03));
        ctx.lineTo(px + R(0.05), py - R(0.03));
        ctx.stroke();
        for (let f = 0; f < 4; f++) drawFruit(ctx, px - R(0.03) + f * R(0.02), py - R(0.07), R(0.014), 0);
      }
    }
  }
  // ── 시선 부채꼴 (늘 보인다: 노란 빛 · 들키면 빨강) ──
  (globalThis as any).__pm?.push(['10', performance.now()]);
  W.guards.forEach((g, i) => {
    const z = gz[i];
    if (z.h < 0.012) return;
    const face = z.c >= g.x ? 1 : -1, [ex, ey] = guardEye(g, face, X, Y, R);
    const xa = X(z.c - z.h), xb = X(z.c + z.h), ft = Y(0.69), fb = Y(WALL_B);
    const bad = play && b.exp && (b.mask >> i) & 1, on = play && (b.mask >> i) & 1;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);
    const col = bad ? '255,70,50' : z.soft ? '255,255,255' : '255,226,90';
    const a0 = bad ? 0.42 + 0.14 * pulse : z.soft ? 0.3 : 0.36;
    const far = g.k === 'scope' ? fb : ft;
    ctx.save();
    const sp = g.k === 'scope';
    ctx.fillStyle = lin(ctx, ex, ey, (xa + xb) / 2, far, [0, `rgba(${col},${a0 * (sp ? 0.8 : 0.35)})`], [1, `rgba(${col},${sp ? Math.min(0.6, a0 * 1.4) : a0})`]);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(xa, far);
    if (g.k !== 'scope') ctx.lineTo(xa, fb);
    if (g.k !== 'scope') ctx.lineTo(xb, fb);
    ctx.lineTo(xb, far);
    ctx.closePath();
    ctx.fill();
    if (sp) {
      ctx.fillStyle = radg(ctx, (xa + xb) / 2, (ft + fb) / 2, 0, (xb - xa) * 0.9, [0, 'rgba(255,255,230,.6)'], [1, 'rgba(255,255,230,0)']);
      ctx.fillRect(xa - (xb - xa), ft - R(0.05), (xb - xa) * 3, fb - ft + R(0.1));
    }
    // 벽에 닿은 빛 (눈부심)
    ctx.fillStyle = `rgba(${bad ? '255,120,90' : '255,250,215'},${bad ? 0.35 : 0.4})`;
    rr(ctx, xa, ft, xb - xa, fb - ft, R(0.014));
    ctx.fill();
    ctx.strokeStyle = bad ? `rgba(255,50,30,${0.75 + 0.25 * pulse})` : z.soft ? 'rgba(255,255,255,.9)' : 'rgba(255,200,40,.95)';
    ctx.lineWidth = bad ? 3.5 : 2.5;
    if (z.soft) ctx.setLineDash([6, 4]);
    rr(ctx, xa, ft, xb - xa, fb - ft, R(0.014));
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 5]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(xa, far);
    ctx.moveTo(ex, ey);
    ctx.lineTo(xb, far);
    ctx.stroke();
    ctx.setLineDash([]);
    // 눈 표시
    if (xb - xa > R(0.06)) {
      const ix = (xa + xb) / 2, iy = ft + R(0.028);
      ctx.fillStyle = bad ? '#ff4a3a' : on ? '#ffffff' : 'rgba(255,255,255,.95)';
      ell(ctx, ix, iy, R(0.027), R(0.016));
      ctx.fill();
      ctx.strokeStyle = OUT;
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = OUT;
      ctx.beginPath();
      ctx.arc(ix + (b.x > z.c ? 1 : -1) * R(0.006), iy, R(0.009), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  });
  // ── 경비 ──
  (globalThis as any).__pm?.push(['11', performance.now()]);
  W.guards.forEach((g, i) => {
    if (g.k === 'scope') return;
    const z = gz[i], face = z.c >= g.x ? 1 : -1;
    const look = clamp(z.h / 0.12, 0, 1), qm = t - s.qm[i] < 45;
    const caughtBy = s.phase === 'result' && !s.ok && (b.mask >> i) & 1;
    const tilt = qm ? 0.3 + Math.sin(t * 0.15) * 0.08 : 0, bark = caughtBy || t - s.bark[i] < 36 || (play && b.exp && (b.mask >> i) & 1) ? 1 : 0;
    if (X(g.x) < -R(0.3) || X(g.x) > w + R(0.3)) return;
    if (g.k === 'dog') drawDog(ctx, X(g.x), Y(DOG_Y), R(DOG_H), face, look, z.h < 0.012 || z.soft ? 1 : 0, tilt, bark, t + i * 40, 0);
    else drawMan(ctx, X(g.x), Y(MAN_Y), R(MAN_H), face, look, 1 - look, tilt * 0.5, bark, t + i * 30);
  });
  // 경비 말풍선 (? · ! · 곧 봐요)
  W.guards.forEach((g, i) => {
    const z = gz[i], face = z.c >= g.x ? 1 : -1, [ex, ey] = guardEye(g, face, X, Y, R);
    const bx = ex - face * R(0.02), by = ey - R(g.k === 'scope' ? 0.12 : g.k === 'man' ? 0.13 : 0.12);
    const qm = t - s.qm[i] < 45;
    const bk = t - s.bark[i] < 40 || (play && b.exp && (b.mask >> i) & 1) || (s.phase === 'result' && !s.ok && (b.mask >> i) & 1);
    if (bk) bubble(ctx, bx, by, R(0.034), '!', '#ff4a3a', '#ffffff', R);
    else if (qm) bubble(ctx, bx, by + Math.sin(t * 0.2) * 2, R(0.032), '?', '#ffffff', '#3a2414', R);
    else if (b.go && play && z.h < 0.012) {
      const soon = gazeOf(g, b.wt + 40);
      if (soon.h > 0.012) {
        ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.5);
        bubble(ctx, bx, by, R(0.028), '…', '#fff6c8', '#3a2414', R);
        ctx.globalAlpha = 1;
      }
    }
    if (!b.go && g.intro.length) {
      font(0.036, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(80,40,10,.6)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      const k2 = Math.sin(t * 0.3) > 0 ? '킁킁' : '킁…';
      ctx.strokeText(k2, ex + R(0.06), ey - R(0.1));
      ctx.fillText(k2, ex + R(0.06), ey - R(0.1));
    }
  });
  // ── 고양이 ──
  (globalThis as any).__pm?.push(['12', performance.now()]);
  if (W.cat) {
    const near = b.x - b.cat < 0.2 ? 1 : 0, leap = Math.max(0, 1 - (t - vm.pounce) / 24);
    const cxp = X(b.cat);
    if (cxp > -R(0.2)) {
      if (near && play) {
        ctx.strokeStyle = 'rgba(160,110,60,.55)';
        ctx.lineWidth = 2;
        for (let j = 0; j < 3; j++) {
          ctx.beginPath();
          for (let q = 0; q <= 10; q++) {
            const xx = cxp + R(0.05) + (X(b.x) - R(0.1) - cxp - R(0.05)) * (q / 10), yy = Y(LANE) - R(0.08) - j * R(0.02) + Math.sin(q * 1.3 + t * 0.2 + j) * R(0.008);
            q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
          }
          ctx.stroke();
        }
      }
      drawCat(ctx, cxp, Y(LANE), R(CAT_K), t, leap, near);
    }
    if (cxp < R(0.02) && play) {
      // 화면 밖 고양이: 왼쪽 끝 알림
      const ix = R(0.055), iy = Y(LANE) - R(0.1), gap = b.x - b.cat;
      bubble(ctx, ix, iy, R(0.036), '냥', '#ffd9a8', '#7a3a08', R);
      font(0.03, 900);
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(90,40,10,.7)';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      const txt = gap < 0.35 ? '가까워요!' : '따라와요';
      ctx.strokeText(txt, ix + R(0.03), iy + R(0.065));
      ctx.fillText(txt, ix + R(0.03), iy + R(0.065));
    }
  }
  // ── 카멜레온 ──
  (globalThis as any).__pm?.push(['13', performance.now()]);
  {
    const morphing = b.mode === STOP && b.m < 1 && play;
    const matched = b.worn === back && (b.mode === WALK || b.m >= 1) && b.mode !== IDLE;
    vm.hid += ((matched && play ? 1 : 0) - vm.hid) * 0.15;
    let look = 0;
    let best = 9;
    W.guards.forEach((g, i) => {
      const dd = Math.abs(g.x - b.x);
      if (gz[i].h > 0.012 && dd < best) {
        best = dd;
        const [ex, ey] = guardEye(g, 1, X, Y, R);
        look = Math.atan2(ey - (Y(LANE) - R(0.08)), ex - X(b.x));
      }
    });
    if (best > 1) look = Math.sin(t * 0.03) * 0.8;
    let tongue: [number, number, number] | null = null;
    if (s.tongue && b.fl > 0) {
      const u = b.fl <= FLICK_HIT ? b.fl / FLICK_HIT : (FLICK_T - b.fl) / (FLICK_T - FLICK_HIT), k = R(CHAM_K);
      tongue = [X(W.fruits[s.tongue.i]) - X(b.x), Y(0.655) - Y(LANE), Math.max(0.05, u)];
      void k;
    }
    const caught = s.phase === 'result' && !s.ok;
    const spin = caught ? -Math.min(1, s.pt / 40) * TAU * 1.25 : 0;
    const hop = caught ? Math.max(0, Math.sin(Math.min(1, s.pt / 40) * Math.PI)) * 0.8 : s.phase === 'result' && s.ok ? Math.abs(Math.sin(s.pt * 0.18)) * 0.35 : Math.max(0, 1 - (t - vm.jump) / 14) * 0.5;
    const mood = caught ? 5 : s.phase === 'result' && s.ok ? 4 : s.mood;
    drawCham(ctx, X(b.x), Y(LANE), R(CHAM_K), sc, T, {
      worn: b.worn, next: morphing ? b.tg : null, mu: b.m, ch: b.worn === 'leaf' ? 0 : b.ch, ox: X(0) + (b.x - s.patX) * w, oy: 0,
      hidden: vm.hid, walk: b.mode === WALK && play ? b.x * w : 0, mood, t, look, tongue, spin, hop, nerv: !b.go, sparkle: Math.max(0, 1 - (t - s.morphT) / 30),
    });
    // 혀 끝에 붙은 과일
    if (s.tongue && b.fl > FLICK_HIT) {
      const u = (FLICK_T - b.fl) / (FLICK_T - FLICK_HIT), k = R(CHAM_K);
      const mx = X(b.x) + 0.7 * k, my = Y(LANE) - 0.21 * k, tx = X(W.fruits[s.tongue.i]), ty = Y(0.655);
      drawFruit(ctx, mx + (tx - mx) * u, my + (ty - my) * u, R(0.026), (s.tongue.i * 3 + s.stage * 5) % 8);
    }
  }
  // ── 무늬 물결: 바뀌는 순간 무늬가 화면 가득 퍼진다 ──
  (globalThis as any).__pm?.push(['14', performance.now()]);
  {
    const age = t - (fx.memo.waveT ?? -99), dur = fx.memo.waveBig ? 46 : 32;
    if (age >= 0 && age < dur) {
      const p = (STEAL[(fx.memo.waveP ?? 1) - 1] ?? 'leaf') as Pat, u = age / dur, cx = X(fx.memo.waveX ?? b.x), cy = Y(LANE) - R(0.08);
      const r1 = R(0.1) + u * R(fx.memo.waveBig ? 1.25 : 0.8), th2 = R(0.09) * (1 - u * 0.5);
      ctx.save();
      ctx.globalAlpha = (1 - u) * 0.75;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, TAU);
      ctx.arc(cx, cy, Math.max(1, r1 - th2), 0, TAU, true);
      ctx.fillStyle = patOf(ctx, p, T, sc, X(0), 0);
      ctx.fill();
      ctx.globalAlpha = (1 - u) * 0.9;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r1, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }
  // ── 비 ──
  (globalThis as any).__pm?.push(['15', performance.now()]);
  if (W.rain) {
    ctx.fillStyle = 'rgba(120,170,220,.08)';
    ctx.fillRect(0, 0, w, Y(STREET_B));
    ctx.strokeStyle = 'rgba(200,225,255,.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 70; i++) {
      const rx = ((hsh(i) * w * 1.3 - t * 2.2 * (0.8 + hsh(i + 3) * 0.4) + cam * w * 0.3) % (w * 1.3) + w * 1.3) % (w * 1.3) - w * 0.15;
      const ry = ((hsh(i + 9) * Y(STREET_B) + t * 9 * (0.8 + hsh(i + 5) * 0.4)) % Y(STREET_B));
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - R(0.012), ry + R(0.04));
    }
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.02 + hsh(i)) % 1), rx = hsh(i + 20) * w, ry = Y(1.1 + hsh(i + 30) * 0.2);
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - u)})`;
      ell(ctx, rx, ry, R(0.03) * u + 2, R(0.008) * u + 1);
      ctx.stroke();
    }
  }

  // ── 사건 연출 ──
  (globalThis as any).__pm?.push(['16', performance.now()]);
  const seenT = fx.memo.t ?? -1;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = sayMem.get(s);
    if (!rec) sayMem.set(s, (rec = []));
    x = clamp(x, w * 0.14, w * 0.86);
    y = Math.max(Y(0.2), y);
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 36 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < (size + q.size) * 0.6); k++) y -= size + 4;
    rec.push({ x, y, t, size });
    if (rec.length > 12) rec.shift();
    fx.pop(x, y, text, col, size);
  };
  const cX = X(b.x), cY = Y(LANE) - R(0.08);
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    if (e.kind === 'stop') {
      fx.ring(cX, cY, '#ffffff', R(0.12), 3);
      fx.burst(cX - R(0.03), Y(LANE), 'rgba(255,255,255,.9)', 6, 1.5, 2);
    }
    if (e.kind === 'morph') {
      const p = (e.text ?? 'leaf') as Pat, C = PCOL[p];
      fx.burst(cX, cY, C.chip, 18, 3.4, 2.6);
      fx.burst(cX, cY, '#ffffff', 10, 2.6, 2);
      fx.ring(cX, cY, C.chip, R(0.2), 5);
      fx.ring(cX, cY, '#ffffff', R(0.13), 3);
      fx.kick(2.5);
      const first = !fx.memo.morphs;
      fx.memo.morphs = (fx.memo.morphs ?? 0) + 1;
      if (first) fx.blink('#fff8d0', 0.3);
      fx.memo.waveT = t;
      fx.memo.waveP = STEAL.indexOf(p) + 1;
      fx.memo.waveX = b.x;
      fx.memo.waveBig = first ? 1 : 0;
      say(cX, cY - R(0.12), `스르륵! ${PAT_NAME[p]} 무늬`, '#ffffff', first ? 20 : 15);
    }
    if (e.kind === 'walk') fx.burst(X(b.x) - R(0.08), Y(LANE), 'rgba(230,200,150,.8)', 4, 1.2, 1.6);
    if (e.kind === 'spot') {
      const g = W.guards[e.n ?? 0], [ex, ey] = guardEye(g, 1, X, Y, R);
      say(ex, ey - R(0.18), g.k === 'dog' ? '왈?!' : g.k === 'man' ? '어라?!' : '저건?!', '#ffb3a0', 17);
      fx.kick(5);
      fx.blink('#ff7a5a', 0.12);
      vm.jump = t;
    }
    if (e.kind === 'fool') {
      const n = e.n ?? 1, walk = e.text === 'walk';
      const g = W.guards.find((q) => Math.abs(q.x - e.x) < 1e-9);
      if (g) {
        const [ex, ey] = guardEye(g, 1, X, Y, R);
        fx.burst(ex, ey - R(0.1), '#ffffff', 8, 2, 2);
      }
      const big = s.fools <= 1 || n >= 2 || walk;
      if (big) {
        banMem.set(s, { t, text: n >= 2 ? `감쪽같이 ×${n}!` : '감쪽같이!', sub: walk ? `걸으면서 속였다 +${WALK_FOOL * Math.min(n, 6)}` : `가만히 숨어 속였다 +${FOOL_PTS * Math.min(n, 6)}`, col: PCOL[b.worn].chip, n });
        fx.burst(cX, cY, '#ffd84a', 14 + n * 4, 3.5 + n * 0.4, 2.6);
        fx.burst(cX, cY, PCOL[b.worn].chip, 10 + n * 3, 3, 2.4);
        fx.kick(2 + Math.min(4, n));
        fx.memo.pigeon = t;
      } else say(cX, cY - R(0.14), '휴~', '#ffffff', 14);
    }
    if (e.kind === 'fruit') {
      const kind = (b.ff >= 0 ? b.ff : 0) * 3 + s.stage * 5;
      say(cX + R(0.1), cY - R(0.1), `쏙! +${FRUIT_PTS}`, '#fff3a0', 15);
      fx.burst(cX + R(0.14), cY - R(0.02), FRUIT_COL[kind % 8], 10, 2.4, 2.2);
    }
    if (e.kind === 'fade') say(cX - R(0.05), cY - R(0.1), '무늬가 바랬다', '#e8f0e0', 13);
    if (e.kind === 'pounce') {
      vm.pounce = t;
      vm.jump = t;
      say(X(b.x) - R(0.1), cY - R(0.12), '냥!', '#ffd0a0', 22);
      fx.kick(7);
      fx.blink('#ffb36b', 0.18);
      fx.burst(X(b.x) - R(0.05), cY, '#ffa63a', 14, 3, 2.4);
    }
    if (e.kind === 'caught') {
      W.guards.forEach((g, i) => {
        if (!((b.mask >> i) & 1)) return;
        const [ex, ey] = guardEye(g, 1, X, Y, R);
        say(ex, ey - R(0.2), g.k === 'dog' ? '왈왈!' : g.k === 'man' ? '거기 서!' : '찾았다!', '#ffffff', 20);
      });
      say(cX, cY - R(0.16), '들켰다!', '#ff8a7a', 24);
      fx.kick(10);
      fx.blink('#ffd0b0', 0.3);
      fx.burst(cX, cY, '#ff8a7a', 20, 4, 2.6);
      fx.burst(cX, cY, '#ffe066', 12, 3, 2.2);
    }
    if (e.kind === 'clear') {
      fx.burst(w * 0.3, Y(0.6), '#ffd84a', 34, 6, 3);
      fx.burst(w * 0.7, Y(0.6), '#ff7ab0', 30, 6, 3);
      fx.burst(cX, cY, PCOL[b.worn].chip, 24, 5, 3);
      fx.blink('#fff6c8', 0.3);
      fx.kick(4);
      fx.memo.pigeon = t;
    }
  }
  fx.memo.t = t;
  // 비둘기 구경꾼 (차양 위)
  {
    const cheer = t - (fx.memo.pigeon ?? -99) < 40, scare = play && b.exp;
    for (let i = Math.floor(cam / 0.7) - 1; i <= Math.floor((cam + 1) / 0.7) + 1; i++) {
      const wx = i * 0.7 + 0.25 + hsh(i + 77) * 0.2;
      const px = X(wx), py = Y(0.452);
      if (px < -20 || px > w + 20) continue;
      const hop = cheer ? Math.abs(Math.sin((t + i * 7) * 0.35)) : scare ? 0.4 + 0.3 * Math.sin(t * 0.8 + i) : 0;
      drawPigeon(ctx, px, py, R(0.045), t + i * 13, hop, b.x > wx ? 1 : -1, scare ? 1 : 0);
    }
  }
  // 큰 순간 띠
  const ban = banMem.get(s);
  if (ban && t - ban.t < 75) {
    const age = t - ban.t, a = Math.min(1, age / 5, (75 - age) / 15), pop = age < 8 ? 1.5 - 0.5 * (age / 8) : 1;
    const cy = Y(0.34);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, cy);
    ctx.scale(pop, pop);
    font(0.07 + Math.min(3, ban.n - 1) * 0.008, 900);
    const tw = ctx.measureText(ban.text).width + R(0.12);
    ctx.fillStyle = 'rgba(90,40,10,.3)';
    rr(ctx, -tw / 2 + 3, -R(0.05) + 4, tw, R(0.1), R(0.05));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -R(0.05), 0, R(0.05), [0, '#fff3a0'], [1, '#ffc93a']);
    rr(ctx, -tw / 2, -R(0.05), tw, R(0.1), R(0.05));
    ctx.fill();
    ctx.strokeStyle = '#8a4a0a';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = '#5a2a08';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ban.text, 0, 1);
    font(0.036, 900);
    const sw2 = ctx.measureText(ban.sub).width + R(0.05);
    ctx.fillStyle = 'rgba(90,40,10,.75)';
    rr(ctx, -sw2 / 2, R(0.062), sw2, R(0.046), R(0.023));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ban.sub, 0, R(0.086));
    for (let j = 0; j < 4; j++) {
      const sx = (j - 1.5) * tw * 0.33, sy = -R(0.07) - Math.abs(Math.sin(age * 0.2 + j)) * R(0.02);
      starPath(ctx, sx, sy, R(0.016));
      ctx.fillStyle = '#ffe066';
      ctx.fill();
      ctx.strokeStyle = '#8a4a0a';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.restore();
  }
  // 새것 스포트라이트
  if (s.spot && play) {
    const age = t - s.spot.t;
    if (age < 120) {
      const a = Math.min(1, age / 10, (120 - age) / 20), cx = X(s.spot.x), cy = Y(s.spot.y), r0 = R(s.spot.r);
      ctx.save();
      ctx.fillStyle = `rgba(40,20,10,${0.42 * a})`;
      ctx.beginPath();
      ctx.rect(-20, -20, w + 40, Y(STREET_B) + 20);
      ctx.arc(cx, cy, r0, 0, TAU, true);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,216,74,${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r0 + Math.sin(t * 0.3) * 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = a;
      font(0.04, 900);
      const label = `NEW  ${s.spot.label}`, tw = ctx.measureText(label).width + R(0.04), lx = clamp(cx, tw / 2 + 6, w - tw / 2 - 6), ly = cy - r0 - R(0.04) < Y(0.2) ? cy + r0 + R(0.04) : cy - r0 - R(0.04);
      ctx.fillStyle = '#ffd84a';
      rr(ctx, lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = '#8a4a0a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#3a1a08';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, lx, ly + 1);
      ctx.restore();
    }
  }
  // 첫 손짓 안내: 카멜레온 위 손가락
  if (s.stage === 0 && play && (!b.go || (s.fools === 0 && b.mode !== WALK && t - s.stopT < 30))) {
    const px = X(b.x) + R(0.02), py = Y(LANE) - R(0.3), press = b.go ? 1 : Math.max(0, Math.sin(t * 0.15));
    ctx.save();
    font(0.046, 900);
    const msg = '꾹! 무늬로 숨기', tw = ctx.measureText(msg).width + R(0.05);
    ctx.fillStyle = 'rgba(60,30,10,.3)';
    rr(ctx, px - tw / 2 + 2, py - R(0.12) + 3, tw, R(0.065), R(0.03));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    rr(ctx, px - tw / 2, py - R(0.12), tw, R(0.065), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#3a2414';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3a2414';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(msg, px, py - R(0.087));
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - press * 0.5})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px, py + R(0.06), R(0.03 + press * 0.03), 0, TAU);
    ctx.stroke();
    drawHand(ctx, px, py + R(0.02), R(0.085), press);
    ctx.restore();
  }
  ctx.restore();

  // ═════════════ 위 띠: 판 · 하트 · 별 · 골목 지도 ═════════════
  ctx.textBaseline = 'middle';
  const hb = Y(HUD_T);
  ctx.fillStyle = lin(ctx, 0, 0, 0, hb, [0, '#7a4a22'], [1, '#5a3418']);
  rr(ctx, 0, -10, w, hb + 10, R(0.03));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,220,150,.5)';
  ctx.fillRect(R(0.02), hb - 1.5, w - R(0.04), 1.5);
  {
    const cy = R(0.04), cx = R(0.05);
    ctx.fillStyle = lin(ctx, cx, cy - R(0.03), cx, cy + R(0.03), [0, '#ffe08a'], [1, '#e0a02a']);
    ctx.beginPath();
    ctx.arc(cx, cy, R(0.028), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#3a1a08';
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillText(String(s.stage + 1), cx, cy + 1);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff6e0';
    font(0.044, 900);
    ctx.fillText(d.name, R(0.09), cy + 1);
    const nw = ctx.measureText(d.name).width;
    font(0.034, 700);
    ctx.fillStyle = '#e8c89a';
    ctx.fillText(` / ${STAGE_COUNT}판`, R(0.09) + nw, cy + 2);
    ctx.textAlign = 'right';
    font(0.042, 900);
    const st = String(s.stars), sw = ctx.measureText(st).width;
    ctx.fillStyle = '#ffd84a';
    ctx.fillText(st, w - R(0.03), cy + 1);
    starPath(ctx, w - R(0.03) - sw - R(0.025), cy, R(0.02));
    ctx.fill();
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (let j = 0; j < 3; j++) {
      const hx = w - R(0.03) - sw - R(0.085) - j * R(0.05);
      heartPath(ctx, hx, cy, R(0.017));
      ctx.fillStyle = 2 - j < s.hearts ? lin(ctx, hx, cy - R(0.02), hx, cy + R(0.02), [0, '#ff8a95'], [1, '#d62b3d']) : 'rgba(255,255,255,.15)';
      ctx.fill();
      ctx.strokeStyle = 2 - j < s.hearts ? '#3a1a08' : 'rgba(255,255,255,.35)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  }
  // 골목 지도: 칸 무늬 · 시선 · 과일 · 나
  {
    const x0 = R(0.04), x1 = w - R(0.08), cy = R(0.094), bh = R(0.03), M = (x: number) => x0 + clamp(x / W.L, 0, 1) * (x1 - x0);
    ctx.save();
    rr(ctx, x0, cy - bh / 2, x1 - x0, bh, bh / 2);
    ctx.clip();
    for (const g of W.segs) {
      if (g.a > W.L) continue;
      const p = g.k === 'sign' ? (signAt(W, b.wt).u < 0.5 ? signAt(W, b.wt).p : signAt(W, b.wt).q) : g.k;
      ctx.fillStyle = patOf(ctx, p, T, sc, 0, cy - bh / 2, 0.3);
      ctx.fillRect(M(g.a), cy - bh / 2, M(g.b) - M(g.a) + 0.5, bh);
    }
    gz.forEach((z) => {
      if (z.h < 0.012 || z.soft) return;
      ctx.fillStyle = 'rgba(255,240,150,.55)';
      ctx.fillRect(M(z.c - z.h), cy - bh / 2, M(z.c + z.h) - M(z.c - z.h), bh);
    });
    ctx.restore();
    rr(ctx, x0, cy - bh / 2, x1 - x0, bh, bh / 2);
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    W.fruits.forEach((fxw, i) => {
      if ((b.gm >> i) & 1) return;
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath();
      ctx.arc(M(fxw), cy - bh / 2 - 1, R(0.007), 0, TAU);
      ctx.fill();
    });
    // 골인 깃발
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x1 + R(0.012), cy - R(0.03), 2, R(0.045));
    ctx.fillStyle = '#ff4a6a';
    ctx.beginPath();
    ctx.moveTo(x1 + R(0.012) + 2, cy - R(0.03));
    ctx.lineTo(x1 + R(0.05), cy - R(0.018));
    ctx.lineTo(x1 + R(0.012) + 2, cy - R(0.006));
    ctx.closePath();
    ctx.fill();
    if (W.cat) {
      ctx.fillStyle = '#ffa63a';
      ctx.beginPath();
      ctx.arc(M(Math.max(0, b.cat)), cy, R(0.011), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#3a1a08';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    const mx = M(b.x);
    ctx.fillStyle = patOf(ctx, b.ch > 0 ? b.worn : 'leaf', T, sc, 0, 0, 0.3);
    ctx.beginPath();
    ctx.arc(mx, cy, R(0.017), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = '#3a1a08';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 판 카드 (하늘 띠 안)
  {
    let head = '', sub = '', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      a = Math.min(1, age / 8);
      if (s.ok) head = s.won ? '시장 골목을 다 지나왔다!' : '골목 끝까지 왔다!';
      else (head = `으앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 판 다시' : '끝 — 카멜레온이 낮잠 자러 가요');
    } else if (s.pt < CARD_T && (s.stage > 0 || s.again)) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20, age / 6);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}판 · ${d.name}`;
      sub = d.news ? `NEW  ${d.news}` : '꾹 누르면 무늬로 숨어요';
    }
    if (head) {
      const cy = Y(0.2), unroll = Math.min(1, 0.3 + age / 10);
      ctx.save();
      ctx.globalAlpha = a;
      font(0.046, 900);
      const w1 = ctx.measureText(head).width;
      font(0.036, 800);
      const w2 = sub ? ctx.measureText(sub).width : 0;
      const cw = Math.min(w - R(0.06), Math.max(w1, w2) + R(0.1)) * unroll, ch = sub || (s.phase === 'result' && s.ok) ? R(0.13) : R(0.08);
      ctx.fillStyle = 'rgba(90,50,20,.3)';
      rr(ctx, w / 2 - cw / 2 + 3, cy - ch / 2 + 4, cw, ch, R(0.025));
      ctx.fill();
      ctx.fillStyle = lin(ctx, 0, cy - ch / 2, 0, cy + ch / 2, [0, '#fffaf0'], [1, '#f6e6c4']);
      rr(ctx, w / 2 - cw / 2, cy - ch / 2, cw, ch, R(0.025));
      ctx.fill();
      ctx.strokeStyle = '#8a5a2a';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.rect(w / 2 - cw / 2, cy - ch / 2, cw, ch);
      ctx.clip();
      ctx.textAlign = 'center';
      font(0.046, 900);
      ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#8a5a0a' : '#a82a1e') : '#3a1a08';
      if (s.phase === 'result' && s.ok) {
        ctx.fillText(head, w / 2, cy - R(0.025), w - R(0.1));
        const n = s.starOk.length;
        for (let j = 0; j < n; j++) {
          const ag = s.pt - (12 + j * 12);
          const sx = w / 2 + (j - (n - 1) / 2) * R(0.075), sy = cy + R(0.03);
          const pop = ag < 0 ? 0 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
          starPath(ctx, sx, sy, R(0.027) * (ag < 0 ? 1 : pop));
          ctx.fillStyle = ag >= 0 && s.starOk[j] ? '#ffc93a' : 'rgba(90,60,20,.18)';
          ctx.fill();
          ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#7a4a08' : 'rgba(90,60,20,.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(sx, sy, '#ffd84a', 16, 3, 2.4);
        }
      } else {
        ctx.fillText(head, w / 2, cy - (sub ? R(0.026) : 0), w - R(0.1));
        if (sub) {
          font(0.036, 800);
          ctx.fillStyle = d.news && s.phase === 'play' ? '#b02a1e' : '#5a3a18';
          ctx.fillText(sub, w / 2, cy + R(0.032), w - R(0.08));
        }
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 들킴 · 무늬 · 별 · 안내 ═════════════
  {
    const ty = Y(STREET_B);
    ctx.fillStyle = lin(ctx, 0, ty, 0, h, [0, '#7a4a22'], [1, '#5a3418']);
    rr(ctx, 0, ty, w, h - ty + 10, R(0.03));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,220,150,.5)';
    ctx.fillRect(R(0.02), ty + 1, w - R(0.04), 1.5);
    // 1줄: 들킴 게이지 + 입은 무늬
    const r1 = ty + R(0.042);
    {
      const ix = R(0.045);
      ctx.fillStyle = '#ffffff';
      ell(ctx, ix, r1, R(0.024), R(0.015));
      ctx.fill();
      ctx.strokeStyle = '#3a1a08';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#3a1a08';
      ctx.beginPath();
      ctx.arc(ix, r1, R(0.008), 0, TAU);
      ctx.fill();
      const gx = R(0.08), gw = w - R(0.08) - R(0.3), gh = R(0.032);
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.fill();
      const fr = clamp(b.sus, 0, 1);
      if (fr > 0.005) {
        ctx.fillStyle = lin(ctx, gx, 0, gx + gw, 0, [0, '#ffe066'], [0.6, '#ff9a3a'], [1, '#ff3a2a']);
        rr(ctx, gx, r1 - gh / 2, Math.max(gh, gw * fr), gh, gh / 2);
        ctx.fill();
      }
      ctx.strokeStyle = b.exp && play ? `rgba(255,90,60,${0.6 + 0.4 * Math.sin(t * 0.5)})` : 'rgba(255,230,180,.6)';
      ctx.lineWidth = b.exp && play ? 2.5 : 1.5;
      rr(ctx, gx, r1 - gh / 2, gw, gh, gh / 2);
      ctx.stroke();
      font(0.033, 900);
      ctx.textAlign = 'left';
      ctx.fillStyle = fr > 0.4 ? '#ffffff' : '#ffe9c0';
      ctx.fillText(fr > 0.01 ? '들킴 게이지 — 다 차면 하트 -1' : '안 들킴', gx + R(0.02), r1 + 1, gw - R(0.03));
      // 입은 무늬 + 남은 양
      const px = w - R(0.2), pr = R(0.024);
      const worn = play && b.mode === STOP && b.m < 1 ? b.tg : b.ch > 0 ? b.worn : 'leaf';
      ctx.fillStyle = patOf(ctx, worn, T, sc, px, r1, 0.45);
      ctx.beginPath();
      ctx.arc(px, r1, pr, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, r1, pr + 3, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = worn === 'leaf' ? '#a8e070' : b.ch < 0.25 ? '#ff9a3a' : '#7dffb0';
      ctx.beginPath();
      ctx.arc(px, r1, pr + 3, -Math.PI / 2, -Math.PI / 2 + TAU * (worn === 'leaf' ? 1 : b.mode === STOP && b.m < 1 ? b.m : b.ch));
      ctx.stroke();
      font(0.033, 900);
      ctx.fillStyle = '#fff6e0';
      ctx.fillText(worn === 'leaf' ? '제 빛깔' : `${PAT_NAME[worn]} 무늬`, px + pr + R(0.018), r1 + 1, R(0.15));
    }
    // 2줄: 별 (쉬운 말)
    const r2 = ty + R(0.1);
    {
      const labels = d.stars.map((q) => {
        if (s.phase !== 'play') return q.label;
        if (q.k === 'fruit') return `${q.label} ${Math.min(b.got, q.n)}/${q.n}`;
        if (q.k === 'stops') return `${q.label} (${b.stops}번)`;
        if (q.k === 'time') return `${q.label} (${Math.max(0, Math.ceil((q.n - b.wt) / 60))}초)`;
        return q.label;
      });
      const ok = s.phase === 'result' && s.ok ? s.starOk : d.stars.map((q) => q.k === 'fruit' && b.got >= q.n);
      const bad = d.stars.map((q) => s.phase === 'play' && ((q.k === 'nospot' && b.spots > 0) || (q.k === 'stops' && b.stops > q.n) || (q.k === 'cat' && b.catHits > 0) || (q.k === 'time' && b.wt > q.n)));
      font(0.033, 800);
      const ws = labels.map((l) => ctx.measureText(l).width + R(0.07));
      const gap = R(0.012), tot = ws.reduce((a2, b2) => a2 + b2, 0) + gap * (ws.length - 1), scale = Math.min(1, (w - R(0.03)) / tot);
      let xx = (w - tot * scale) / 2;
      for (let j = 0; j < labels.length; j++) {
        const pw = ws[j] * scale;
        ctx.fillStyle = ok[j] ? 'rgba(255,216,74,.3)' : bad[j] ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.1)';
        rr(ctx, xx, r2 - R(0.025), pw, R(0.05), R(0.025));
        ctx.fill();
        ctx.strokeStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.15)' : 'rgba(255,230,180,.45)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        starPath(ctx, xx + R(0.026) * scale + 2, r2, R(0.014));
        ctx.fillStyle = ok[j] ? '#ffd84a' : bad[j] ? 'rgba(255,255,255,.25)' : 'rgba(255,240,200,.7)';
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.fillStyle = ok[j] ? '#fff6dc' : bad[j] ? 'rgba(255,255,255,.4)' : '#fff0d8';
        font(0.033, 800);
        ctx.fillText(labels[j], xx + R(0.05) * scale, r2 + 1, pw - R(0.058) * scale);
        xx += pw + gap * scale;
      }
    }
    // 3줄: 안내 한 줄
    {
      let hint = d.hint;
      if (s.stage === 0 && !b.go && play) hint = '꾹 누르면 멈춰서 뒤 무늬로 숨어요';
      else if (s.stage === 0 && s.fools === 0 && play) hint = '숨은 채 떼면 그 무늬를 입고 걸어요';
      else if (play && b.mode === STOP && b.m < 1) hint = `몸이 ${PAT_NAME[b.tg]} 무늬로 바뀌는 중…`;
      else if (play && b.exp) hint = b.mode === WALK ? '들킨다! 꾹 눌러 숨거나 맞는 무늬 앞으로' : '바뀌는 중엔 다 보여요 — 미리 숨어요';
      else if (s.phase === 'result') hint = s.ok ? (s.won ? '시장 골목을 다 지나왔어요!' : `★ ${s.got}개! 다음 판엔 새것이 나와요`) : '시선이 오기 전에 맞는 무늬를 입어 둬요';
      const first = s.stage === 0 && !b.go;
      font(first ? 0.04 : 0.035, 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
      ctx.fillText(hint, w / 2, ty + R(0.163), w - R(0.04));
    }
  }
  void th;
}
export const _dbgDraw = { getBg: (w: number, h: number, sc: number) => getBg(w, h, sc), segCanvas, tileCanvas };
