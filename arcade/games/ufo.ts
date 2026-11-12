/**
 * UFO 소 납치 (24라운드: 새 장르) — 받아내기 × 가리키기(꾹 미리 보기) × 중력 뒤집기.
 * 받아내기를 거꾸로 뒤집었다: 떨어지는 걸 바구니로 받는 대신, 땅 위의 것을 빔으로 '위로' 받아 올린다.
 * 기준 9(손이 하는 일은 하나): 밭을 꾹 = UFO가 그 위로 날아가 빔 원이 땅에 보인다. 원 안의 것이 반짝이고 점수 합이 뜬다(지금 떼면의 결과).
 *   떼면 빔 — 원 안의 것이 몽땅 둥실 올라간다. 짧은 톡도 바로 빔. 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 동물은 정해진 길(고리·8자)을 천천히 돈다. 빔은 떼는 순간 원 안의 것을 모두 올린다.
 *   소 +1마리(10점) · 닭 보너스(5점) · 농부는 올라갔다가 '퉁' 떨어진다(★ 하나 잃고 −20). 빈 땅을 비춰도 빔 1번.
 * 판 구조: 판마다 빔 N번으로 소 M마리. ★ 목표 · ★ 빔 아낌(par 이하) · ★ 농부 안 태우기.
 *   실패(빔을 다 씀 · 손전등에 들킴) = 하트 −1, 그 판을 처음부터. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1판 소·농부 → 2판 무거운 황소(빔 두 번: 첫 빔에 쿵 떨어져 어질어질 멈춤 → 두 번째에 쏙)·닭
 *   → 3판 경비견(빔이 개 둘레에 닿으면 멍! — 둘레 안의 소가 바깥으로 튄다 → 개 옆을 비춰 소를 원 안으로 몰기)
 *   → 4판 헛간 지붕(지붕 아래는 빔이 안 닿음 — 나올 때를 기다림, 농부가 숨으면 마음껏) → 5판 허수아비(같이 올라가면 퉤! 빔 1번 더)
 *   → 6판 깜깜한 밤(농부 손전등에 비친 곳에서 빔을 쏘면 들킴 = 실패) → 7판 소 떼 박자(8자 길을 박자 맞춰 줄지어 — 엇갈리는 가운데를 노림)
 *   → 8판 우주 젖소(표시된 곳에 잠깐 내려앉는다 — 내려앉을 때 빔, 2마리 + 50점).
 * 웃음: 빔에 탄 동물은 빙글빙글 '음매~', UFO 창마다 소 얼굴이 내다본다. 농부는 주먹을 휘두르다 '퉁' 엉덩방아.
 *   구경꾼 염소는 매번 빔 원 바로 밖에 서서 무표정. 외계인 조종사는 '우와!'·'엥?'·'헉!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.42;
/** 밭(세계) 좌표: x 0~1 (왼→오), y 0~DEP (먼 쪽 → 가까운 쪽) */
const DEP = 1.2;
/** 빔 원 반지름 · 개 둘레 · 짖으면 소가 튀어 나가는 거리(개에서) */
export const BR = 0.15;
const DR = 0.15, PUSH_TO = DR + 0.075;
const BEAM_T = 62, RESULT_OK = 165, RESULT_FAIL = 140, NEWS_T = 190;
const STAR_PTS = 100, COW_PTS = 10, CHICK_PTS = 5, SPACE_PTS = 50, FARMER_PTS = -20, LEFT_PTS = 10, WIN_PTS = 200;
/** 소 떼 박자: BEAT틱마다 MOVE틱 동안 걷는다 */
const BEAT = 60, MOVE = 16;
const ROOF = { x0: 0.02, y0: 0.03, x1: 0.42, y1: 0.4 };
const FARMER_SIT = 110, BULL_STUN = 170;
/** 우주 젖소: SPACE_P틱마다 한 번, 앞 SPACE_G틱 동안만 땅에 있다 */
const SPACE_P = 230, SPACE_G = 105;
/** 손전등: 길이 · 반각 */
const LIGHT_L = 0.8, LIGHT_HALF = 0.3;
const TAU = Math.PI * 2;

type Kind = 'cow' | 'bull' | 'chick' | 'farmer' | 'dog' | 'scare' | 'space';
interface Mob {
  k: Kind;
  /** 0 고리 · 1 8자(소 떼) · 2 뛰어다님(우주 젖소) · 3 제자리 */
  path: 0 | 1 | 2 | 3;
  cx: number; cy: number; rx: number; ry: number; sp: number; a: number; ph: number;
  /** 개가 짖어 튄 만큼(천천히 제 길로 돌아온다) */
  ox: number; oy: number;
  gone: number; hits: number; stun: number;
  hx?: number[]; hy?: number[];
}
interface World { t: number; mobs: Mob[]; used: number; got: number; chick: number; farmer: number; spotted: number; space: number; scare: number }
interface StageDef {
  key: string; name: string; news: string; goal: number; max: number; par: number;
  roof?: boolean; night?: boolean; herd?: boolean; kennel?: [number, number];
  build(r: Rng): Mob[];
}

const mob = (k: Kind, cx: number, cy: number, rx = 0, ry = 0, sp = 0, a = 0, ph = 0, path: Mob['path'] = 0): Mob => ({ k, path, cx, cy, rx, ry, sp, a, ph, ox: 0, oy: 0, gone: 0, hits: 0, stun: 0 });
const jit = (r: Rng, a: number) => (r() - 0.5) * 2 * a;
const ang = (r: Rng) => r() * TAU;
/** 고리를 도는 소 (방향·속도·위상은 시드로 살짝) */
const loopCow = (r: Rng, cx: number, cy: number, rx: number, ry: number, sp: number, k: Kind = 'cow') => mob(k, cx + jit(r, 0.02), cy + jit(r, 0.02), rx, ry, sp * (0.85 + r() * 0.3) * (r() < 0.5 ? -1 : 1), ang(r), ang(r));
const chickens = (r: Rng, n: number) => Array.from({ length: n }, (_, i) => mob('chick', 0.2 + 0.6 * ((i + 0.5) / n) + jit(r, 0.05), 0.55 + jit(r, 0.3), 0.09 + r() * 0.05, 0.06 + r() * 0.04, 0.022 * (r() < 0.5 ? -1 : 1), ang(r), ang(r)));

/** 판 8개 */
export const STAGES: StageDef[] = [
  {
    key: 'cow', name: '첫 납치', news: '🐄 원 안은 몽땅 올라가요 — 👨‍🌾 농부만 빼고!', goal: 3, max: 9, par: 1,
    build: (r) => {
      const cx = 0.5 + jit(r, 0.04), cy = 0.6 + jit(r, 0.03);
      return [
        mob('cow', cx - 0.07, cy + 0.015, 0.012, 0.008, 0.004, ang(r), ang(r)),
        mob('cow', cx + 0.07, cy + 0.025, 0.012, 0.008, -0.004, ang(r), ang(r)),
        mob('cow', cx + 0.005, cy - 0.06, 0.012, 0.008, 0.004, ang(r), ang(r)),
        loopCow(r, 0.2, 0.3, 0.1, 0.07, 0.007),
        loopCow(r, 0.2, 0.3, 0.1, 0.07, 0.007),
        loopCow(r, 0.8, 0.32, 0.1, 0.07, 0.007),
        loopCow(r, 0.8, 0.32, 0.1, 0.07, 0.007),
        loopCow(r, 0.18, 0.66, 0.08, 0.08, 0.006),
        loopCow(r, 0.82, 0.68, 0.08, 0.08, 0.006),
        loopCow(r, 0.24, 0.98, 0.12, 0.07, 0.006),
        loopCow(r, 0.24, 0.98, 0.12, 0.07, 0.006),
        loopCow(r, 0.78, 0.96, 0.12, 0.07, 0.006),
        mob('farmer', 0.5, 1.07, 0.33, 0.03, 0.0045, ang(r)),
      ];
    },
  },
  {
    key: 'bull', name: '무거운 황소', news: '🐂 황소 — 빔 두 번! 처음엔 쿵 떨어져 어질어질 멈춰요', goal: 5, max: 9, par: 2,
    build: (r) => [
      loopCow(r, 0.5, 0.6, 0.14, 0.1, 0.0035, 'bull'),
      loopCow(r, 0.33, 0.52, 0.12, 0.12, 0.006),
      loopCow(r, 0.67, 0.7, 0.12, 0.1, 0.006),
      loopCow(r, 0.5, 0.38, 0.16, 0.07, 0.006),
      loopCow(r, 0.3, 0.88, 0.12, 0.08, 0.006),
      loopCow(r, 0.72, 0.92, 0.12, 0.08, 0.006),
      loopCow(r, 0.2, 0.3, 0.12, 0.08, 0.006),
      loopCow(r, 0.8, 0.3, 0.12, 0.08, 0.006),
      loopCow(r, 0.16, 0.66, 0.08, 0.1, 0.006),
      loopCow(r, 0.84, 0.62, 0.08, 0.1, 0.006),
      loopCow(r, 0.5, 1.0, 0.2, 0.06, 0.006),
      ...chickens(r, 3),
      mob('farmer', 0.5, 0.82, 0.3, 0.12, 0.004, ang(r)),
    ],
  },
  {
    key: 'dog', name: '경비견', news: '🐕 개 둘레에 빔이 닿으면 멍! — 둘레 안 소가 바깥으로 튀어요', goal: 6, max: 7, par: 2, kennel: [0.5, 0.58],
    build: (r) => [
      mob('dog', 0.5, 0.6, 0.05, 0.035, 0.012, ang(r)),
      ...Array.from({ length: 7 }, (_, i) => mob('cow', 0.5, 0.6, 0.16 + 0.1 * r(), 0.14 + 0.08 * r(), (i % 2 ? -1 : 1) * (0.004 + 0.002 * r()), (i / 7) * TAU + jit(r, 0.3), ang(r))),
      ...chickens(r, 2),
      mob('farmer', 0.5, 1.06, 0.3, 0.04, 0.004, ang(r)),
    ],
  },
  {
    key: 'roof', name: '헛간 지붕', news: '🏚️ 지붕 아래는 빔이 안 닿아요 — 나올 때를 노려요', goal: 6, max: 7, par: 3, roof: true,
    build: (r) => [
      loopCow(r, 0.33, 0.38, 0.19, 0.17, 0.006),
      loopCow(r, 0.33, 0.38, 0.19, 0.17, 0.006),
      loopCow(r, 0.3, 0.42, 0.16, 0.2, 0.006),
      loopCow(r, 0.62, 0.35, 0.15, 0.12, 0.006),
      loopCow(r, 0.68, 0.75, 0.15, 0.12, 0.006),
      loopCow(r, 0.68, 0.75, 0.15, 0.12, 0.006),
      loopCow(r, 0.33, 0.86, 0.14, 0.1, 0.006),
      ...chickens(r, 2),
      mob('farmer', 0.32, 0.4, 0.2, 0.22, 0.0042, ang(r)),
    ],
  },
  {
    key: 'scare', name: '허수아비', news: '🌾 허수아비 — 같이 올라가면 퉤! 뱉느라 빔 1번 더', goal: 7, max: 8, par: 3,
    build: (r) => {
      const sp: [number, number][] = [[0.28 + jit(r, 0.03), 0.48], [0.72 + jit(r, 0.03), 0.5], [0.5 + jit(r, 0.04), 0.86]];
      const out: Mob[] = sp.map(([x, y]) => mob('scare', x, y, 0, 0, 0, 0, 0, 3));
      // 소는 허수아비 곁을 스쳐 도는 고리 — 허수아비 쪽에 몰릴 때와 반대쪽에 몰릴 때가 번갈아 온다
      sp.forEach(([x, y], j) => {
        const ox = (j === 0 ? -1 : j === 1 ? 1 : 0) * 0.07, oy = j === 2 ? 0.06 : -0.05;
        for (let k = 0; k < 3; k++) out.push(mob('cow', x + ox, y + oy, 0.15, 0.12, 0.0055, (k / 3) * 1.6 + jit(r, 0.2), ang(r)));
      });
      out.push(mob('farmer', 0.5, 0.67, 0.36, 0.06, 0.004, ang(r)));
      return out;
    },
  },
  {
    key: 'night', name: '깜깜한 밤', news: '🔦 손전등 — 비친 곳에서 빔을 쏘면 들켜요!', goal: 7, max: 7, par: 3, night: true,
    build: (r) => [
      loopCow(r, 0.25, 0.35, 0.12, 0.09, 0.006),
      loopCow(r, 0.25, 0.35, 0.12, 0.09, 0.006),
      loopCow(r, 0.75, 0.35, 0.12, 0.09, 0.006),
      loopCow(r, 0.75, 0.35, 0.12, 0.09, 0.006),
      loopCow(r, 0.5, 0.55, 0.15, 0.1, 0.006),
      loopCow(r, 0.5, 0.55, 0.15, 0.1, 0.006),
      loopCow(r, 0.24, 0.78, 0.12, 0.09, 0.006),
      loopCow(r, 0.76, 0.78, 0.12, 0.09, 0.006),
      loopCow(r, 0.76, 0.78, 0.12, 0.09, 0.006),
      ...chickens(r, 2),
      mob('farmer', 0.5, 1.04, 0.22, 0.04, 0.003, ang(r), ang(r)),
    ],
  },
  {
    key: 'herd', name: '소 떼 박자', news: '🎵 소 떼가 박자 맞춰 8자로 — 엇갈리는 가운데를 노려요', goal: 8, max: 6, par: 2, herd: true,
    build: (r) => {
      const a0 = ang(r), out: Mob[] = [];
      for (let i = 0; i < 10; i++) out.push(mob('cow', 0.5, 0.6, 0.36, 0.25, 0.24 / MOVE, a0 - i * 0.31, ang(r), 1));
      out.push(...chickens(r, 2));
      out.push(mob('farmer', 0.5, 0.62, 0.45, 0.48, 0.0035, ang(r)));
      return out;
    },
  },
  {
    key: 'space', name: '우주 젖소', news: '🌌 우주 젖소 — 반짝이는 곳에 잠깐 내려앉아요 (2마리 +50)', goal: 8, max: 7, par: 3, roof: true, kennel: [0.66, 0.62],
    build: (r) => {
      const hx = [0.62, 0.3, 0.78, 0.42].map((x) => x + jit(r, 0.03)), hy = [0.3, 0.72, 0.95, 0.5].map((y) => y + jit(r, 0.03));
      const sc = mob('space', 0.5, 0.5, 0, 0, 0, 0, Math.floor(r() * 4) * SPACE_P, 2);
      sc.hx = hx;
      sc.hy = hy;
      return [
        sc,
        mob('dog', 0.66, 0.64, 0.05, 0.035, 0.012, ang(r)),
        mob('scare', 0.3 + jit(r, 0.03), 0.95, 0, 0, 0, 0, 0, 3),
        loopCow(r, 0.33, 0.38, 0.19, 0.17, 0.006),
        loopCow(r, 0.33, 0.38, 0.19, 0.17, 0.006),
        loopCow(r, 0.66, 0.62, 0.2, 0.17, 0.005),
        loopCow(r, 0.66, 0.62, 0.2, 0.17, 0.005),
        loopCow(r, 0.66, 0.62, 0.22, 0.15, 0.005),
        loopCow(r, 0.3, 0.88, 0.14, 0.1, 0.006),
        loopCow(r, 0.3, 0.88, 0.14, 0.1, 0.006),
        loopCow(r, 0.55, 1.0, 0.18, 0.07, 0.006),
        ...chickens(r, 2),
        mob('farmer', 0.4, 0.55, 0.3, 0.3, 0.004, ang(r)),
      ];
    },
  },
];
export const STAGE_COUNT = STAGES.length;

// ───────── 움직임 (결정적) ─────────
const clampX = (x: number) => Math.max(0.03, Math.min(0.97, x));
const clampY = (y: number) => Math.max(0.03, Math.min(DEP - 0.03, y));
/** 우주 젖소: 지금 땅에 있나 · 몇 번째 자리 · 날아가는 정도(0~1) */
function spaceState(m: Mob, t: number): [boolean, number, number] {
  const u = t + m.ph, n = m.hx!.length, k = Math.floor(u / SPACE_P) % n, q = u % SPACE_P;
  return [q < SPACE_G, k, q < SPACE_G ? 0 : (q - SPACE_G) / (SPACE_P - SPACE_G)];
}
/** 몹의 지금 자리 (밭 좌표) */
function pos(m: Mob, t: number): [number, number] {
  let x: number, y: number;
  if (m.path === 0) {
    x = m.cx + m.rx * Math.cos(m.a);
    y = m.cy + m.ry * Math.sin(m.a);
    if (m.k === 'chick') (x += 0.022 * Math.sin(m.a * 7 + m.ph)), (y += 0.018 * Math.cos(m.a * 9));
  } else if (m.path === 1) {
    x = m.cx + m.rx * Math.cos(m.a);
    y = m.cy + m.ry * Math.sin(2 * m.a);
  } else if (m.path === 2) {
    const [, k, q] = spaceState(m, t), n = m.hx!.length, k2 = (k + 1) % n;
    const e = q * q * (3 - 2 * q);
    x = m.hx![k] + (m.hx![k2] - m.hx![k]) * e;
    y = m.hy![k] + (m.hy![k2] - m.hy![k]) * e;
  } else (x = m.cx), (y = m.cy);
  return [clampX(x + m.ox), clampY(y + m.oy)];
}
/** 소가 풀 뜯다 걷다 하는 걸음 (0.25~1) */
const gait = (m: Mob, t: number) => (m.k === 'cow' || m.k === 'bull' ? 0.25 + 0.75 * Math.max(0, Math.sin(t * 0.012 + m.ph)) : m.k === 'chick' ? 0.7 + 0.5 * Math.sin(t * 0.05 + m.ph) : 1);
function advance(W: World) {
  W.t++;
  for (const m of W.mobs) {
    if (m.gone) continue;
    if (m.stun > 0) m.stun--;
    else if (m.path === 0) m.a += m.sp * gait(m, W.t);
    else if (m.path === 1 && W.t % BEAT < MOVE) m.a += m.sp;
    if (m.ox || m.oy) {
      m.ox *= 0.993;
      m.oy *= 0.993;
      if (Math.abs(m.ox) + Math.abs(m.oy) < 1e-4) (m.ox = 0), (m.oy = 0);
    }
  }
}
const cloneW = (W: World): World => ({ ...W, mobs: W.mobs.map((m) => ({ ...m })) });
const underRoof = (d: StageDef, x: number, y: number) => !!d.roof && x > ROOF.x0 && x < ROOF.x1 && y > ROOF.y0 && y < ROOF.y1;
/** 손전등: 농부에서 뻗는 빛의 방향 */
function lightDir(W: World, m: Mob) {
  return -Math.PI / 2 + 1.05 * Math.sin(W.t * 0.016 + m.ph);
}
function lit(W: World, x: number, y: number) {
  const f = W.mobs.find((m) => m.k === 'farmer');
  if (!f) return false;
  const [fx0, fy0] = pos(f, W.t), dx = x - fx0, dy = y - fy0, d = Math.hypot(dx, dy);
  if (d > LIGHT_L) return false;
  if (d < 0.06) return true;
  let da = Math.atan2(dy, dx) - lightDir(W, f);
  while (da > Math.PI) da -= TAU;
  while (da < -Math.PI) da += TAU;
  return Math.abs(da) < LIGHT_HALF;
}
const liftable = (m: Mob, t: number) => !m.gone && m.k !== 'dog' && (m.k !== 'space' || spaceState(m, t)[0]);

type Fate = 'in' | 'drop' | 'bump' | 'spit';
interface Rec { lifted: { i: number; k: Kind; x: number; y: number; fate: Fate }[]; spotted: boolean; bark: boolean; pushed: { i: number; x0: number; y0: number; x1: number; y1: number }[]; safe: number[]; cows: number }

/** 빔 한 번 (결정적, 봇이 내다볼 때·미리 보기도 같은 함수) */
function resolve(W: World, d: StageDef, bx: number, by: number, rec?: Rec) {
  W.used++;
  if (d.night && lit(W, bx, by)) {
    W.spotted = 1;
    if (rec) rec.spotted = true;
    return;
  }
  const dog = W.mobs.find((m) => m.k === 'dog');
  if (dog) {
    const [gx, gy] = pos(dog, W.t);
    if (Math.hypot(bx - gx, by - gy) < BR + DR) {
      if (rec) rec.bark = true;
      for (let i = 0; i < W.mobs.length; i++) {
        const m = W.mobs[i];
        if (!liftable(m, W.t) || m.k === 'farmer' || m.k === 'scare') continue;
        const [x, y] = pos(m, W.t), dx = x - gx, dy = y - gy, dd = Math.hypot(dx, dy);
        if (dd >= DR) continue;
        const ux = dd < 1e-6 ? 0 : dx / dd, uy = dd < 1e-6 ? 1 : dy / dd;
        const nx = clampX(gx + ux * PUSH_TO), ny = clampY(gy + uy * PUSH_TO);
        m.ox += nx - x;
        m.oy += ny - y;
        if (rec) rec.pushed.push({ i, x0: x, y0: y, x1: nx, y1: ny });
      }
    }
  }
  for (let i = 0; i < W.mobs.length; i++) {
    const m = W.mobs[i];
    if (!liftable(m, W.t)) continue;
    const [x, y] = pos(m, W.t);
    if (Math.hypot(x - bx, y - by) >= BR) continue;
    if (underRoof(d, x, y)) {
      if (rec) rec.safe.push(i);
      continue;
    }
    let fate: Fate = 'in';
    if (m.k === 'cow') (m.gone = 1), W.got++;
    else if (m.k === 'bull') {
      m.hits++;
      if (m.hits >= 2) (m.gone = 1), (W.got += 2);
      else (m.stun = BULL_STUN), (fate = 'bump');
    } else if (m.k === 'chick') (m.gone = 1), W.chick++;
    else if (m.k === 'space') (m.gone = 1), (W.got += 2), W.space++;
    else if (m.k === 'farmer') (W.farmer++, (m.stun = FARMER_SIT + BEAM_T)), (fate = 'drop');
    else if (m.k === 'scare') (m.gone = 1), W.used++, W.scare++, (fate = 'spit');
    if (rec) {
      rec.lifted.push({ i, k: m.k, x, y, fate });
      if (m.k === 'cow') rec.cows++;
      if (m.gone && (m.k === 'bull' || m.k === 'space')) rec.cows += 2;
    }
  }
}
const newRec = (): Rec => ({ lifted: [], spotted: false, bark: false, pushed: [], safe: [], cows: 0 });

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
interface Lift { i: number; k: Kind; x: number; y: number; fate: Fate; t0: number; face: number }
export interface UfoState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'aim' | 'beam' | 'result'; pt: number;
  W: World; layouts: Record<number, Mob[]>;
  down: boolean; ax: number; ay: number; tries: number;
  /** 빔 자리 · UFO 자리 · 구경꾼 염소 자리 (밭 좌표) */
  bx: number; by: number; ux: number; uy: number; gx: number; gy: number;
  rec: Rec | null; lifts: Lift[]; stagePts: number;
  hearts: number; stars: number; gotStars: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number; total: number;
}
const ev = (s: UfoState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: UfoState, key: string, text: string, front = false) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (!front) return void s.newsQ.push(text);
  // 판의 새것은 바로 보인다 (남은 도움말은 뒤로)
  s.newsQ.unshift(text);
  s.news = null;
}
function tip(s: UfoState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}

function newStage(s: UfoState) {
  const d = STAGES[s.stage];
  let L = s.layouts[s.stage];
  if (!L) s.layouts[s.stage] = L = d.build(mulberry32((s.seed * 31 + s.stage * 7919 + 17) >>> 0));
  s.W = { t: 0, mobs: L.map((m) => ({ ...m })), used: 0, got: 0, chick: 0, farmer: 0, spotted: 0, space: 0, scare: 0 };
  s.phase = 'aim';
  s.pt = 0;
  s.rec = null;
  s.lifts = [];
  s.stagePts = 0;
  s.startT = s.t;
  s.gotStars = 0;
  see(s, d.key, d.news, true);
  if (s.stage === 0) s.seen.add('farmer');
  if (L.some((m) => m.k === 'chick')) see(s, 'chick', '🐔 닭은 보너스 (5점)');
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#e8f0ff');
}

function finish(s: UfoState, ok: boolean, why = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const d = STAGES[s.stage], W = s.W;
  if (ok) {
    const st = 1 + (W.used <= d.par ? 1 : 0) + (W.farmer === 0 ? 1 : 0);
    s.gotStars = st;
    s.stars += st;
    s.pts += st * STAR_PTS + Math.max(0, d.max - W.used) * LEFT_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5, `${s.stage + 1}판 통과! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why, '#ffd0c8');
  }
}

/** 화면(0~1, y는 0~A) ↔ 밭 좌표 */
const FY0 = 0.42, KY = 0.63, FXW = 0.92;
const scl = (y: number) => 0.8 + 0.24 * (y / DEP);
const SX = (x: number, y: number) => 0.5 + (x - 0.5) * FXW * scl(y);
const SY = (y: number) => FY0 + y * KY;
function toField(x: number, y: number): [number, number] | null {
  const fy = (y - FY0) / KY;
  if (fy < -0.04 || fy > DEP + 0.04) return null;
  const fx = 0.5 + (x - 0.5) / (FXW * scl(fy));
  if (fx < -0.04 || fx > 1.04) return null;
  return [Math.max(0.02, Math.min(0.98, fx)), Math.max(0.02, Math.min(DEP - 0.02, fy))];
}

function fire(s: UfoState, bx: number, by: number) {
  const W = s.W, rec = newRec(), pts0 = W.got;
  resolve(s.W, STAGES[s.stage], bx, by, rec);
  s.rec = rec;
  s.phase = 'beam';
  s.pt = 0;
  s.bx = bx;
  s.by = by;
  s.lifts = rec.lifted.map((q) => ({ ...q, t0: s.t, face: Math.sin(q.i * 3.1 + s.t) > 0 ? 1 : -1 }));
  const gain = (W.got - pts0) * COW_PTS + rec.lifted.filter((q) => q.k === 'chick').length * CHICK_PTS + rec.lifted.filter((q) => q.k === 'space').length * SPACE_PTS + rec.lifted.filter((q) => q.k === 'farmer').length * FARMER_PTS;
  s.pts += gain;
  s.stagePts += gain;
  ev(s, 'beam', bx, by, '', '#b8ffcf', rec.lifted.length);
  if (rec.spotted) {
    ev(s, 'spotted', bx, by, '외계인이다!', '#fff3a0');
    return;
  }
  if (rec.bark) {
    const dog = W.mobs.find((m) => m.k === 'dog')!;
    const [x, y] = pos(dog, W.t);
    ev(s, 'bark', x, y, '멍! 멍!', '#ffffff', rec.pushed.length);
    tip(s, 'bark', '🐕 개 옆을 비추면 튄 소가 원 안으로 들어와요');
  }
  if (rec.cows >= 3) ev(s, 'wow', bx, by, '우와!', '#c8ffb0', rec.cows);
  if (rec.lifted.some((q) => q.fate === 'drop')) ev(s, 'farmerUp', bx, by, '이놈들!', '#ffd0c0');
  if (rec.lifted.some((q) => q.fate === 'bump')) tip(s, 'bump', '🐂 어질어질한 황소는 멈춰 있어요 — 한 번 더!');
  if (rec.lifted.some((q) => q.fate === 'spit')) ev(s, 'spitPre', bx, by, '엥?', '#fff3a0');
  if (rec.safe.length) tip(s, 'safe', '🏚️ 지붕 아래 있던 건 안 올라가요');
  if (!rec.lifted.length && !rec.bark) ev(s, 'empty', bx, by, '텅~', '#e0e8ff');
}

function afterBeam(s: UfoState) {
  const d = STAGES[s.stage], W = s.W;
  if (W.spotted) return finish(s, false, '들켰다! 손전등에 딱 걸렸어요');
  if (W.got >= d.goal) return finish(s, true);
  if (W.used >= d.max) return finish(s, false, '빔을 다 썼어요… 배터리 방전');
  s.phase = 'aim';
  s.pt = 0;
}

export const ufo: GameDef<UfoState> = {
  id: 'ufo',
  name: 'UFO 소 납치',
  genes: ['catch', 'pointer', 'gravityflip'],
  twist: '받아내기를 거꾸로 — 꾹 누르면 UFO 빔 원이 보이고 떼면 원 안의 것이 몽땅 둥실 올라가는데, 소만 노렸는데 화난 농부까지 딸려 올라간다. 동물은 정해진 길을 돌아서 \'언제·어디서\' 떼느냐가 수다',
  rules: ['밭을 꾹 = 빔 원과 점수 합이 보여요. 떼면 원 안의 것이 몽땅 올라가요.', '빔 N번으로 소 M마리! 농부까지 태우면 퉁 떨어지고 ★ 하나 잃어요.'],
  controls: 'touch',
  hint: '밭을 누르면 빔 원이 보이고, 떼면 빔! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '달밤 농장 디오라마 위 UFO',
    mood: '보름달 아래 푸르스름한 농장 — 빨간 헛간과 옥수수밭, 반딧불, 은빛 원반의 초록 빛 원뿔. 소들은 졸린 얼굴로 풀을 뜯고, 구경꾼 염소는 무표정.',
    palette: { bg: '#0f1530', ink: '#f4f7ff', muted: '#aab6d8', accent: '#7dffb2', hot: '#ff6b6b', soft: '#d8e4ff' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'aim', pt: 0, layouts: {},
      down: false, ax: 0.5, ay: 0.5, tries: 0, bx: 0.5, by: 0.6, ux: 0.5, uy: 0.45, gx: 0.86, gy: 0.75,
      rec: null, lifts: [], stagePts: 0,
      hearts: 3, stars: 0, gotStars: 0, pts: 0, ok: false, why: '', won: false, dead: false,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0, total: 0,
    } as unknown as UfoState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 40 || (s.events.length && s.t - s.events[0].t > 150)) s.events = s.events.filter((e) => s.t - e.t < 150);
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
    advance(s.W);
    // UFO는 누른 곳 위로 미끄러지고, 염소는 원 바로 밖으로 어슬렁
    const tgt = s.phase === 'beam' ? [s.bx, s.by] : s.down ? toField(s.ax, s.ay * A) : null;
    if (tgt) (s.ux += (tgt[0] - s.ux) * 0.3), (s.uy += (tgt[1] - s.uy) * 0.3);
    {
      const cx = tgt ? tgt[0] : s.bx, cy = tgt ? tgt[1] : s.by;
      let dx = s.gx - cx, dy = s.gy - cy;
      const dd = Math.hypot(dx, dy) || 1;
      (dx /= dd), (dy /= dd);
      const wx = clampX(cx + dx * (BR + 0.06)), wy = clampY(cy + dy * (BR + 0.06)), mv = Math.hypot(wx - s.gx, wy - s.gy);
      if (mv > 0.004) (s.gx += ((wx - s.gx) / mv) * Math.min(mv, 0.006)), (s.gy += ((wy - s.gy) / mv) * Math.min(mv, 0.006));
    }
    if (s.phase === 'beam') {
      if (s.pt >= BEAM_T) afterBeam(s);
      return;
    }
    if (!release) return;
    const f = toField(s.ax, s.ay * A);
    if (!f) return void ev(s, 'nope', Math.max(0.15, Math.min(0.85, s.ax)), Math.max(0.3, Math.min(1.25, s.ay * A)), '밭 위를 눌러요', '#ffe3d6');
    fire(s, f[0], f[1]);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
interface Quick { cows: number; bump: number; chick: number; farmer: number; scare: number; spotted: number; space: number }
/** 지금(W) (bx,by)에 빔을 쏘면? — resolve를 복사 없이 센다 */
function quick(W: World, d: StageDef, bx: number, by: number, P: number[]): Quick {
  const q: Quick = { cows: 0, bump: 0, chick: 0, farmer: 0, scare: 0, spotted: 0, space: 0 };
  if (d.night && lit(W, bx, by)) return (q.spotted = 1), q;
  let bark = false, gx = 0, gy = 0;
  const dog = W.mobs.find((m) => m.k === 'dog');
  if (dog) {
    [gx, gy] = pos(dog, W.t);
    bark = Math.hypot(bx - gx, by - gy) < BR + DR;
  }
  for (let i = 0; i < W.mobs.length; i++) {
    const m = W.mobs[i];
    if (!liftable(m, W.t)) continue;
    let x = P[i * 2], y = P[i * 2 + 1];
    if (bark && m.k !== 'farmer' && m.k !== 'scare') {
      const dx = x - gx, dy = y - gy, dd = Math.hypot(dx, dy);
      if (dd < DR) {
        const ux = dd < 1e-6 ? 0 : dx / dd, uy = dd < 1e-6 ? 1 : dy / dd;
        (x = clampX(gx + ux * PUSH_TO)), (y = clampY(gy + uy * PUSH_TO));
      }
    }
    if ((x - bx) ** 2 + (y - by) ** 2 >= BR * BR || underRoof(d, x, y)) continue;
    if (m.k === 'cow') q.cows++;
    else if (m.k === 'bull') m.hits >= 1 ? (q.cows += 2) : q.bump++;
    else if (m.k === 'chick') q.chick++;
    else if (m.k === 'space') (q.cows += 2), q.space++;
    else if (m.k === 'farmer') q.farmer++;
    else if (m.k === 'scare') q.scare++;
  }
  return q;
}
function value(q: Quick, need: number, beamsLeft: number) {
  if (q.spotted) return -1e4;
  const cost = 1 + q.scare;
  let v = q.cows + q.bump * 0.9 + q.chick * 0.08 + q.space * 0.6 - q.farmer * 3.2 - q.scare * 1.1;
  if (q.cows >= need) v += 3;
  else if (beamsLeft - cost <= 0) v -= 50;
  return v;
}
/** 앞으로 약 3.5초를 내다보고, 몇 틱 뒤 어디에 빔을 쏠지 고른다 */
function plan(s: UfoState): { at: number; x: number; y: number } {
  const d = STAGES[s.stage], C = cloneW(s.W), need = d.goal - s.W.got, left = d.max - s.W.used;
  for (let k = 0; k < 4; k++) advance(C);
  let best = { at: s.t + 4, x: 0.5, y: 0.6, v: -1e9 };
  const P: number[] = new Array(C.mobs.length * 2).fill(0), cand: number[] = [];
  for (let j = 0; j < 72; j++) {
    if (j % 2 === 0) {
      for (let i = 0; i < C.mobs.length; i++) [P[i * 2], P[i * 2 + 1]] = pos(C.mobs[i], C.t);
      cand.length = 0;
      const good: number[] = [];
      for (let i = 0; i < C.mobs.length; i++) {
        const m = C.mobs[i];
        if (!liftable(m, C.t) || m.k === 'farmer' || m.k === 'scare') continue;
        good.push(i);
        cand.push(P[i * 2], P[i * 2 + 1]);
      }
      for (let a = 0; a < good.length; a++)
        for (let b = a + 1; b < good.length; b++) {
          const ia = good[a], ib = good[b], dx = P[ib * 2] - P[ia * 2], dy = P[ib * 2 + 1] - P[ia * 2 + 1];
          if (dx * dx + dy * dy < 4 * BR * BR) cand.push((P[ia * 2] + P[ib * 2]) / 2, (P[ia * 2 + 1] + P[ib * 2 + 1]) / 2);
        }
      // 개 옆: 튄 소가 떨어질 자리
      const dog = C.mobs.find((m) => m.k === 'dog');
      if (dog) {
        const [gx, gy] = pos(dog, C.t);
        for (let k = 0; k < 8; k++) cand.push(gx + Math.cos((k * TAU) / 8) * (PUSH_TO + 0.02), gy + Math.sin((k * TAU) / 8) * (PUSH_TO + 0.02));
      }
      const wait = j * 3 * 0.0045;
      const nC = cand.length;
      for (let c = 0; c < nC; c += 2) {
        const bx = Math.max(0.03, Math.min(0.97, cand[c])), by = Math.max(0.03, Math.min(DEP - 0.03, cand[c + 1]));
        let q = quick(C, d, bx, by, P);
        let v = value(q, need, left) - wait, x = bx, y = by;
        // 농부나 허수아비가 끼면 반대쪽으로 비켜 본다
        if (q.farmer || q.scare) {
          for (let i = 0; i < C.mobs.length; i++) {
            const m = C.mobs[i];
            if ((m.k !== 'farmer' && m.k !== 'scare') || m.gone) continue;
            const dx = bx - P[i * 2], dy = by - P[i * 2 + 1], dd = Math.hypot(dx, dy);
            if (dd >= BR || dd < 1e-6) continue;
            const sx = Math.max(0.03, Math.min(0.97, bx + (dx / dd) * (BR - dd + 0.012))), sy = Math.max(0.03, Math.min(DEP - 0.03, by + (dy / dd) * (BR - dd + 0.012)));
            const q2 = quick(C, d, sx, sy, P), v2 = value(q2, need, left) - wait;
            if (v2 > v) (v = v2), (x = sx), (y = sy), (q = q2);
          }
        }
        if (v > best.v) best = { at: s.t + 4 + j * 3, x, y, v };
      }
    }
    for (let k = 0; k < 3; k++) advance(C);
  }
  return best;
}

const brain = new WeakMap<object, { key: string; p: { at: number; x: number; y: number } }>();
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (fx: number, fy: number): Input => ({ tap: false, dir: 0, pointer: { x: SX(fx, fy), y: SY(fy) / A } });

/** 봇: 3.5초 앞까지 움직임을 내다보고 가장 많이(농부 없이) 올릴 때·자리에 쏜다 */
export const ufoSmart: Bot<UfoState> = {
  name: '납치 박사',
  act(s) {
    if (s.phase !== 'aim') return NO;
    if (s.down) return NO;
    const key = `${s.stage}:${s.tries}:${s.W.used}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, p: plan(s) }));
    if (s.t + 4 >= m.p.at) return at(m.p.x, m.p.y);
    return NO;
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 밭 아무 데나 톡 (가끔 화면 아무 데나) */
export const ufoRandom: Bot<UfoState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.1) m.p = { x: rng(), y: rng() };
    else {
      const fx = 0.03 + rng() * 0.94, fy = 0.03 + rng() * (DEP - 0.06);
      m.p = { x: SX(fx, fy), y: SY(fy) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), k = Math.max(0, Math.min(1, t));
  return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * k).toString(16).padStart(2, '0')).join('');
};
const ease = (q: number) => {
  const x = Math.max(0, Math.min(1, q));
  return x * x * (3 - 2 * x);
};
const emoji = (ctx: CanvasRenderingContext2D, e: string, x: number, y: number, size: number) => {
  ctx.fillStyle = '#ffffff';
  ctx.font = `${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(e, x, y);
};
const shadow = (ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.35) => {
  ctx.fillStyle = `rgba(5,10,25,${a})`;
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.18, y, rx, ry, 0, 0, TAU);
  ctx.fill();
};

type CowMood = 'graze' | 'walk' | 'scared' | 'lift' | 'dizzy' | 'happy';
interface CowLook { face: number; t: number; walk: number; mood: CowMood; bull?: boolean; space?: boolean; glow?: number }
function drawCow(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, o: CowLook, noShadow = false) {
  const bull = !!o.bull, space = !!o.space;
  const body = bull ? '#8a5a3c' : space ? '#d9c8ff' : '#f4f2ee', shade = bull ? '#5a3522' : space ? '#9a84d8' : '#a9b1c8', hi = bull ? '#b9845c' : space ? '#ffffff' : '#ffffff';
  const zz = bull ? z * 1.22 : z;
  if (!noShadow) shadow(ctx, x, y, zz * 1.25, zz * 0.32);
  ctx.save();
  ctx.translate(x, y);
  if (o.mood === 'dizzy') ctx.rotate(Math.sin(o.t * 0.2) * 0.06);
  ctx.scale(o.face, 1);
  const L = zz;
  // 다리
  ctx.lineCap = 'round';
  for (const [lx, ph] of [[-0.62, 0], [-0.38, Math.PI], [0.42, Math.PI], [0.66, 0]] as const) {
    const sw = o.walk ? Math.sin(o.t * 0.4 + ph) * L * 0.18 * o.walk : o.mood === 'lift' ? Math.sin(o.t * 0.9 + ph) * L * 0.25 : 0;
    ctx.strokeStyle = mix(shade, '#2a2f45', 0.35);
    ctx.lineWidth = L * 0.2;
    ctx.beginPath();
    ctx.moveTo(lx * L, -L * 0.5);
    ctx.lineTo(lx * L + sw, -L * 0.06);
    ctx.stroke();
    ctx.fillStyle = '#2b2b33';
    ctx.beginPath();
    ctx.ellipse(lx * L + sw, -L * 0.04, L * 0.11, L * 0.06, 0, 0, TAU);
    ctx.fill();
  }
  // 꼬리
  ctx.strokeStyle = shade;
  ctx.lineWidth = L * 0.07;
  ctx.beginPath();
  ctx.moveTo(-L * 0.92, -L * 0.95);
  const tw = Math.sin(o.t * 0.08) * L * 0.15;
  ctx.quadraticCurveTo(-L * 1.15, -L * 0.7, -L * 1.05 + tw, -L * 0.45);
  ctx.stroke();
  ctx.fillStyle = '#2b2b33';
  ctx.beginPath();
  ctx.ellipse(-L * 1.05 + tw, -L * 0.4, L * 0.07, L * 0.11, 0, 0, TAU);
  ctx.fill();
  // 몸통 (두께: 아래 그늘 → 위 밝음)
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.roundRect(-L * 0.98, -L * 1.12, L * 1.96, L * 0.74, L * 0.34);
  ctx.fill();
  const g = ctx.createLinearGradient(L * 0.4, -L * 1.25, -L * 0.2, -L * 0.4);
  g.addColorStop(0, hi);
  g.addColorStop(0.55, body);
  g.addColorStop(1, shade);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-L * 0.96, -L * 1.2, L * 1.92, L * 0.72, L * 0.34);
  ctx.fill();
  // 얼룩 (몸 안에만)
  ctx.save();
  ctx.clip();
  ctx.fillStyle = bull ? 'rgba(60,30,15,.45)' : space ? '#ffe36b' : '#24242c';
  if (space) {
    for (const [sx, sy, sr] of [[-0.5, -0.95, 0.16], [0.1, -0.7, 0.13], [0.5, -1.0, 0.11], [-0.15, -1.05, 0.08]] as const) star(ctx, sx * L, sy * L, sr * L * 1.3, sr * L * 0.55);
  } else
    for (const [sx, sy, sr, ry] of [[-0.45, -0.95, 0.32, 0.22], [0.25, -0.62, 0.26, 0.18], [0.62, -1.1, 0.18, 0.14]] as const) {
      ctx.beginPath();
      ctx.ellipse(sx * L, sy * L, sr * L, ry * L, 0.4, 0, TAU);
      ctx.fill();
    }
  ctx.restore();
  // 젖
  if (!bull) {
    ctx.fillStyle = '#f2a6b8';
    ctx.beginPath();
    ctx.ellipse(-L * 0.1, -L * 0.46, L * 0.2, L * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // 머리
  const down = o.mood === 'graze' ? 1 : 0;
  ctx.save();
  ctx.translate(L * 1.0, -L * (1.12 - down * 0.45));
  ctx.rotate(down ? 0.55 : o.mood === 'scared' ? -0.3 : o.mood === 'lift' ? -0.2 : Math.sin(o.t * 0.03) * 0.05);
  // 뿔·귀
  ctx.fillStyle = bull ? '#f4ead2' : '#e9e0c8';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    if (bull) {
      ctx.moveTo(-L * 0.05, -L * 0.28 + sd * L * 0.05);
      ctx.quadraticCurveTo(-L * 0.1, -L * 0.75, L * 0.25 * (sd > 0 ? 1 : 0.6), -L * 0.7);
      ctx.quadraticCurveTo(-L * 0.0, -L * 0.6, L * 0.1, -L * 0.25);
    } else {
      ctx.moveTo(-L * 0.08 + sd * L * 0.08, -L * 0.3);
      ctx.lineTo(-L * 0.02 + sd * L * 0.12, -L * 0.52);
      ctx.lineTo(L * 0.06 + sd * L * 0.08, -L * 0.3);
    }
    ctx.fill();
  }
  if (space) {
    ctx.strokeStyle = '#c7b5ff';
    ctx.lineWidth = L * 0.05;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sd * L * 0.06, -L * 0.3);
      ctx.lineTo(sd * L * 0.18, -L * 0.75);
      ctx.stroke();
      ctx.fillStyle = '#fff38a';
      ctx.beginPath();
      ctx.arc(sd * L * 0.18, -L * 0.78, L * 0.08, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = shade;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(-L * 0.24, -L * 0.18 + sd * L * 0.02, L * 0.24, L * 0.09, sd * 0.5 + (o.mood === 'scared' ? -0.6 : 0.2), 0, TAU);
    ctx.fill();
  }
  const hg = ctx.createRadialGradient(L * 0.0, -L * 0.25, L * 0.05, L * 0.05, -L * 0.05, L * 0.5);
  hg.addColorStop(0, hi);
  hg.addColorStop(1, body);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(L * 0.05, -L * 0.05, L * 0.34, L * 0.38, 0.15, 0, TAU);
  ctx.fill();
  if (!bull && !space) {
    ctx.fillStyle = '#24242c';
    ctx.beginPath();
    ctx.ellipse(-L * 0.08, -L * 0.22, L * 0.15, L * 0.13, 0, 0, TAU);
    ctx.fill();
  }
  // 주둥이
  ctx.fillStyle = bull ? '#c98d7a' : '#f5b3c2';
  ctx.beginPath();
  ctx.ellipse(L * 0.22, L * 0.2, L * 0.26, L * 0.19, 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(80,20,40,.7)';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.ellipse(L * 0.25 + sd * L * 0.09, L * 0.17, L * 0.035, L * 0.05, 0, 0, TAU), ctx.fill());
  if (bull) {
    ctx.strokeStyle = '#ffd25a';
    ctx.lineWidth = L * 0.06;
    ctx.beginPath();
    ctx.arc(L * 0.25, L * 0.32, L * 0.1, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  // 눈
  const ex = L * 0.08, ey = -L * 0.12;
  if (o.mood === 'dizzy') {
    ctx.strokeStyle = '#1b1b22';
    ctx.lineWidth = Math.max(1, L * 0.06);
    ctx.beginPath();
    for (let a = 0; a < 9; a += 0.5) ctx.lineTo(ex + Math.cos(a + o.t * 0.3) * a * L * 0.012, ey + Math.sin(a + o.t * 0.3) * a * L * 0.012);
    ctx.stroke();
  } else if (o.mood === 'happy' || o.mood === 'lift') {
    ctx.strokeStyle = '#1b1b22';
    ctx.lineWidth = Math.max(1.2, L * 0.07);
    ctx.beginPath();
    if (o.mood === 'lift') ctx.arc(ex, ey, L * 0.1, 0, TAU);
    else ctx.arc(ex, ey + L * 0.04, L * 0.08, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
    if (o.mood === 'lift') {
      ctx.fillStyle = '#1b1b22';
      ctx.beginPath();
      ctx.arc(ex + L * 0.02, ey, L * 0.04, 0, TAU);
      ctx.fill();
    }
  } else {
    const big = o.mood === 'scared' ? 1.4 : 1, sleepy = o.mood === 'graze' || o.mood === 'walk';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, L * 0.1 * big, L * (sleepy ? 0.07 : 0.1) * big, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1b1b22';
    ctx.beginPath();
    ctx.arc(ex + L * 0.025, ey + (sleepy ? L * 0.015 : 0), L * 0.05, 0, TAU);
    ctx.fill();
    if (sleepy) {
      ctx.fillStyle = mix(body, shade, 0.2);
      ctx.fillRect(ex - L * 0.12, ey - L * 0.11, L * 0.24, L * 0.07);
    }
    if (bull) {
      ctx.strokeStyle = '#2a140a';
      ctx.lineWidth = Math.max(1.2, L * 0.06);
      ctx.beginPath();
      ctx.moveTo(ex - L * 0.12, ey - L * 0.16);
      ctx.lineTo(ex + L * 0.1, ey - L * 0.09);
      ctx.stroke();
    }
  }
  ctx.restore();
  // 방울
  if (!bull) {
    ctx.fillStyle = '#ffd25a';
    ctx.beginPath();
    ctx.arc(L * 0.88, -L * (0.72 - down * 0.25), L * 0.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#b8862a';
    ctx.fillRect(L * 0.85, -L * (0.68 - down * 0.25), L * 0.06, L * 0.04);
  }
  ctx.restore();
  if (o.glow) {
    ctx.strokeStyle = `rgba(160,255,190,${0.55 * o.glow})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y - zz * 0.7, zz * 1.5, zz * 0.95, 0, 0, TAU);
    ctx.stroke();
  }
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, ro: number, ri: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? ri : ro;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawChick(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, t: number, lift = false, noShadow = false) {
  if (!noShadow) shadow(ctx, x, y, z * 0.6, z * 0.18);
  ctx.save();
  ctx.translate(x, y - (lift ? 0 : Math.abs(Math.sin(t * 0.3)) * z * 0.12));
  ctx.scale(face, 1);
  ctx.strokeStyle = '#e8a33a';
  ctx.lineWidth = Math.max(1, z * 0.08);
  for (const lx of [-0.12, 0.12]) (ctx.beginPath(), ctx.moveTo(lx * z, -z * 0.3), ctx.lineTo(lx * z + Math.sin(t * 0.5 + lx * 9) * z * 0.08, 0), ctx.stroke());
  const g = ctx.createRadialGradient(z * 0.05, -z * 0.7, z * 0.05, 0, -z * 0.5, z * 0.5);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#c9cbd8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.5, z * 0.42, z * 0.3, -0.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(z * 0.28, -z * 0.82, z * 0.2, z * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e8414f';
  for (const k of [0, 1, 2]) (ctx.beginPath(), ctx.arc(z * (0.2 + k * 0.08), -z * (1.02 + (k === 1 ? 0.04 : 0)), z * 0.07, 0, TAU), ctx.fill());
  ctx.fillStyle = '#ffb12a';
  ctx.beginPath();
  ctx.moveTo(z * 0.45, -z * 0.86);
  ctx.lineTo(z * 0.62, -z * 0.8);
  ctx.lineTo(z * 0.45, -z * 0.74);
  ctx.fill();
  ctx.fillStyle = '#1b1b22';
  ctx.beginPath();
  ctx.arc(z * 0.32, -z * 0.86, z * (lift ? 0.06 : 0.04), 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e1e3ee';
  ctx.beginPath();
  ctx.ellipse(-z * 0.08, -z * 0.52, z * 0.22, z * 0.12, lift ? -0.8 + Math.sin(t * 0.8) * 0.6 : 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

type FarmerMood = 'walk' | 'angry' | 'sit' | 'fist';
function drawFarmer(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, mood: FarmerMood, t: number, torch: boolean, noShadow = false) {
  if (!noShadow) shadow(ctx, x, y, z * 0.55, z * 0.16);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  const sit = mood === 'sit';
  ctx.lineCap = 'round';
  // 다리
  ctx.strokeStyle = '#2f4f86';
  ctx.lineWidth = z * 0.2;
  if (sit) {
    for (const k of [0, 1]) (ctx.beginPath(), ctx.moveTo(-z * 0.05, -z * 0.35), ctx.lineTo(z * (0.45 + k * 0.08), -z * (0.12 + k * 0.08)), ctx.stroke());
    ctx.fillStyle = '#4a2f1c';
    for (const k of [0, 1]) (ctx.beginPath(), ctx.ellipse(z * (0.52 + k * 0.08), -z * (0.16 + k * 0.08), z * 0.1, z * 0.07, 0, 0, TAU), ctx.fill());
  } else {
    for (const ph of [0, Math.PI]) {
      const sw = mood === 'walk' ? Math.sin(t * 0.25 + ph) * z * 0.14 : mood === 'fist' ? Math.sin(t * 0.7 + ph) * z * 0.2 : 0;
      ctx.beginPath();
      ctx.moveTo(0, -z * 0.75);
      ctx.lineTo(sw, -z * 0.06);
      ctx.stroke();
      ctx.fillStyle = '#4a2f1c';
      ctx.beginPath();
      ctx.ellipse(sw + z * 0.05, -z * 0.04, z * 0.12, z * 0.06, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.translate(0, sit ? z * 0.42 : 0);
  // 몸 (체크 셔츠 + 멜빵바지)
  ctx.fillStyle = '#c8402f';
  ctx.beginPath();
  ctx.roundRect(-z * 0.26, -z * 1.45, z * 0.52, z * 0.7, z * 0.14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,220,200,.35)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(-z * 0.26 + k * z * 0.13, -z * 1.45), ctx.lineTo(-z * 0.26 + k * z * 0.13, -z * 0.8), ctx.stroke());
  ctx.fillStyle = '#3c64a8';
  ctx.beginPath();
  ctx.roundRect(-z * 0.24, -z * 1.12, z * 0.48, z * 0.42, z * 0.08);
  ctx.fill();
  ctx.fillRect(-z * 0.2, -z * 1.4, z * 0.07, z * 0.3);
  ctx.fillRect(z * 0.13, -z * 1.4, z * 0.07, z * 0.3);
  // 팔
  ctx.strokeStyle = '#c8402f';
  ctx.lineWidth = z * 0.15;
  if (mood === 'fist' || mood === 'angry') {
    const sh = Math.sin(t * 0.9) * z * 0.12;
    ctx.beginPath();
    ctx.moveTo(z * 0.18, -z * 1.35);
    ctx.lineTo(z * 0.35 + sh, -z * 1.85);
    ctx.stroke();
    ctx.fillStyle = '#f0c29a';
    ctx.beginPath();
    ctx.arc(z * 0.36 + sh, -z * 1.92, z * 0.11, 0, TAU);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(z * 0.18, -z * 1.35);
    ctx.lineTo(z * 0.36, -z * 1.0);
    ctx.stroke();
    if (torch) {
      ctx.fillStyle = '#c7ccd6';
      ctx.fillRect(z * 0.3, -z * 1.08, z * 0.32, z * 0.13);
      ctx.fillStyle = '#fff6b0';
      ctx.beginPath();
      ctx.arc(z * 0.62, -z * 1.01, z * 0.08, 0, TAU);
      ctx.fill();
    } else {
      // 쇠스랑
      ctx.strokeStyle = '#8a5a2b';
      ctx.lineWidth = z * 0.06;
      ctx.beginPath();
      ctx.moveTo(z * 0.38, -z * 0.35);
      ctx.lineTo(z * 0.38, -z * 1.95);
      ctx.stroke();
      ctx.strokeStyle = '#b7bfcc';
      ctx.lineWidth = z * 0.04;
      for (const k of [-1, 0, 1]) (ctx.beginPath(), ctx.moveTo(z * (0.38 + k * 0.08), -z * 1.95), ctx.lineTo(z * (0.38 + k * 0.08), -z * 2.2), ctx.stroke());
      ctx.beginPath();
      ctx.moveTo(z * 0.3, -z * 1.95);
      ctx.lineTo(z * 0.46, -z * 1.95);
      ctx.stroke();
    }
  }
  ctx.strokeStyle = '#c8402f';
  ctx.lineWidth = z * 0.15;
  ctx.beginPath();
  ctx.moveTo(-z * 0.18, -z * 1.35);
  ctx.lineTo(-z * (sit ? 0.45 : 0.3), -z * (sit ? 0.9 : 0.95));
  ctx.stroke();
  // 머리
  ctx.fillStyle = '#f0c29a';
  ctx.beginPath();
  ctx.arc(0, -z * 1.68, z * 0.24, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8a6a50';
  ctx.beginPath();
  ctx.ellipse(z * 0.02, -z * 1.52, z * 0.2, z * 0.1, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1, z * 0.05);
  if (sit) {
    ctx.beginPath();
    for (let a = 0; a < 8; a += 0.5) ctx.lineTo(z * 0.08 + Math.cos(a + t * 0.3) * a * z * 0.01, -z * 1.72 + Math.sin(a + t * 0.3) * a * z * 0.01);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath();
    ctx.arc(z * 0.1, -z * 1.7, z * 0.04, 0, TAU);
    ctx.fill();
    // 화난 눈썹
    ctx.beginPath();
    ctx.moveTo(z * 0.0, -z * 1.82);
    ctx.lineTo(z * 0.18, -z * (mood === 'walk' ? 1.8 : 1.76));
    ctx.stroke();
  }
  // 밀짚모자
  ctx.fillStyle = '#e2b95c';
  ctx.beginPath();
  ctx.ellipse(0, -z * 1.86, z * 0.42, z * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f0cf7a';
  ctx.beginPath();
  ctx.ellipse(0, -z * 1.92, z * 0.22, z * 0.17, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#b5392b';
  ctx.fillRect(-z * 0.22, -z * 1.95, z * 0.44, z * 0.05);
  ctx.restore();
  if (sit) {
    ctx.fillStyle = '#ffe066';
    for (let k = 0; k < 3; k++) {
      const a = t * 0.15 + (k * TAU) / 3;
      star(ctx, x + Math.cos(a) * z * 0.35, y - z * 1.65 + Math.sin(a) * z * 0.1, z * 0.1, z * 0.045);
    }
  }
}

function drawDog(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, bark: boolean, t: number) {
  shadow(ctx, x, y, z * 0.8, z * 0.22);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  if (bark) ctx.translate(0, -Math.abs(Math.sin(t * 0.6)) * z * 0.12);
  ctx.strokeStyle = '#f2e6d0';
  ctx.lineWidth = z * 0.16;
  ctx.lineCap = 'round';
  for (const [lx, ph] of [[-0.45, 0], [-0.25, Math.PI], [0.3, Math.PI], [0.5, 0]] as const) (ctx.beginPath(), ctx.moveTo(lx * z, -z * 0.35), ctx.lineTo(lx * z + Math.sin(t * 0.5 + ph) * z * 0.1, -z * 0.03), ctx.stroke());
  ctx.fillStyle = '#b8743a';
  ctx.save();
  ctx.translate(-z * 0.65, -z * 0.6);
  ctx.rotate(-0.8 + Math.sin(t * 0.5) * 0.4);
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.2, z * 0.08, z * 0.25, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(0, -z * 0.85, 0, -z * 0.3);
  g.addColorStop(0, '#d89452');
  g.addColorStop(1, '#8c5426');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -z * 0.55, z * 0.7, z * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f2e6d0';
  ctx.beginPath();
  ctx.ellipse(z * 0.25, -z * 0.4, z * 0.35, z * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.fillRect(z * 0.45, -z * 0.82, z * 0.1, z * 0.28);
  ctx.save();
  ctx.translate(z * 0.68, -z * 0.92);
  ctx.rotate(bark ? -0.35 : 0);
  ctx.fillStyle = '#7a4520';
  ctx.beginPath();
  ctx.ellipse(-z * 0.15, -z * 0.05, z * 0.12, z * 0.24, 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#d89452';
  ctx.beginPath();
  ctx.arc(0, 0, z * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f2e6d0';
  ctx.beginPath();
  ctx.ellipse(z * 0.22, z * 0.08, z * 0.2, z * 0.14, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1b1210';
  ctx.beginPath();
  ctx.arc(z * 0.4, z * 0.02, z * 0.06, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(z * 0.06, -z * 0.06, z * 0.05, 0, TAU);
  ctx.fill();
  if (bark) {
    ctx.fillStyle = '#7a1f2b';
    ctx.beginPath();
    ctx.ellipse(z * 0.28, z * 0.2, z * 0.11, z * 0.08 + Math.abs(Math.sin(t * 0.6)) * z * 0.05, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.restore();
}

function drawKennel(ctx: CanvasRenderingContext2D, x: number, y: number, z: number) {
  shadow(ctx, x, y, z * 0.85, z * 0.25, 0.4);
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x - z * 0.6, y - z * 0.8, z * 1.2, z * 0.8);
  ctx.fillStyle = '#8a5a34';
  ctx.fillRect(x - z * 0.6, y - z * 0.8, z * 1.2, z * 0.1);
  ctx.fillStyle = '#1a1010';
  ctx.beginPath();
  ctx.ellipse(x, y - z * 0.25, z * 0.25, z * 0.32, 0, Math.PI, TAU);
  ctx.fillRect(x - z * 0.25, y - z * 0.26, z * 0.5, z * 0.26);
  ctx.fill();
  ctx.fillStyle = '#b5392b';
  ctx.beginPath();
  ctx.moveTo(x - z * 0.78, y - z * 0.72);
  ctx.lineTo(x, y - z * 1.35);
  ctx.lineTo(x + z * 0.78, y - z * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#e06a4f';
  ctx.beginPath();
  ctx.moveTo(x - z * 0.78, y - z * 0.72);
  ctx.lineTo(x, y - z * 1.35);
  ctx.lineTo(x - z * 0.1, y - z * 0.72);
  ctx.closePath();
  ctx.fill();
}

function drawScare(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, t: number, lift = false, noShadow = false) {
  if (!noShadow) shadow(ctx, x, y, z * 0.5, z * 0.14);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.03) * 0.03);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(-z * 0.05, -z * 1.7, z * 0.1, z * 1.7);
  ctx.fillRect(-z * 0.7, -z * 1.3, z * 1.4, z * 0.08);
  ctx.fillStyle = '#4f7fb5';
  ctx.beginPath();
  ctx.moveTo(-z * 0.65, -z * 1.35);
  ctx.lineTo(z * 0.65, -z * 1.35);
  ctx.lineTo(z * 0.35, -z * 0.7);
  ctx.lineTo(-z * 0.35, -z * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.3)';
  ctx.lineWidth = 1;
  for (let k = -2; k <= 2; k++) (ctx.beginPath(), ctx.moveTo(k * z * 0.15, -z * 1.35), ctx.lineTo(k * z * 0.1, -z * 0.7), ctx.stroke());
  ctx.strokeStyle = '#e8c35a';
  ctx.lineWidth = 1.5;
  for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) (ctx.beginPath(), ctx.moveTo(sd * z * 0.65, -z * 1.3), ctx.lineTo(sd * z * (0.78 + k * 0.03), -z * (1.2 + k * 0.08) + (lift ? Math.sin(t + k) * 3 : 0)), ctx.stroke());
  ctx.fillStyle = '#d9b77a';
  ctx.beginPath();
  ctx.arc(0, -z * 1.62, z * 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1a10';
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.09, -z * 1.66, z * 0.04, 0, TAU), ctx.fill());
  ctx.strokeStyle = '#2a1a10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-z * 0.1, -z * 1.53);
  for (let k = 1; k <= 4; k++) ctx.lineTo(-z * 0.1 + k * z * 0.05, -z * (1.53 + (k % 2 ? 0.02 : 0)));
  ctx.stroke();
  ctx.fillStyle = '#6b4a2a';
  ctx.beginPath();
  ctx.moveTo(-z * 0.38, -z * 1.78);
  ctx.lineTo(z * 0.38, -z * 1.78);
  ctx.lineTo(z * 0.12, -z * 2.1);
  ctx.lineTo(-z * 0.15, -z * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGoat(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, face: number, t: number, walking: boolean) {
  shadow(ctx, x, y, z * 0.85, z * 0.22);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.strokeStyle = '#6f6a62';
  ctx.lineWidth = z * 0.13;
  ctx.lineCap = 'round';
  for (const [lx, ph] of [[-0.45, 0], [-0.28, Math.PI], [0.3, Math.PI], [0.48, 0]] as const) (ctx.beginPath(), ctx.moveTo(lx * z, -z * 0.45), ctx.lineTo(lx * z + (walking ? Math.sin(t * 0.35 + ph) * z * 0.1 : 0), 0), ctx.stroke());
  const g = ctx.createLinearGradient(0, -z * 0.95, 0, -z * 0.4);
  g.addColorStop(0, '#f2efe8');
  g.addColorStop(1, '#a8a49c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-z * 0.62, -z * 0.92, z * 1.24, z * 0.52, z * 0.22);
  ctx.fill();
  ctx.save();
  ctx.translate(z * 0.68, -z * 1.02);
  ctx.strokeStyle = '#8c857a';
  ctx.lineWidth = z * 0.08;
  ctx.beginPath();
  ctx.moveTo(-z * 0.05, -z * 0.2);
  ctx.quadraticCurveTo(-z * 0.3, -z * 0.55, -z * 0.4, -z * 0.3);
  ctx.stroke();
  ctx.fillStyle = '#ece8df';
  ctx.beginPath();
  ctx.ellipse(z * 0.06, 0, z * 0.22, z * 0.28, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9c3b6';
  ctx.beginPath();
  ctx.moveTo(z * 0.1, z * 0.22);
  ctx.lineTo(z * 0.16, z * 0.5);
  ctx.lineTo(z * 0.22, z * 0.2);
  ctx.fill();
  // 무표정: 반쯤 감긴 눈 + 가로 동공 + 일자 입
  ctx.fillStyle = '#ffe9a0';
  ctx.beginPath();
  ctx.ellipse(z * 0.08, -z * 0.08, z * 0.08, z * 0.065, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#1b1b22';
  ctx.fillRect(z * 0.03, -z * 0.09, z * 0.1, z * 0.03);
  ctx.fillStyle = '#d8d2c4';
  ctx.fillRect(z * 0.0, -z * 0.155, z * 0.17, z * 0.06);
  ctx.strokeStyle = '#4a4540';
  ctx.lineWidth = Math.max(1, z * 0.04);
  ctx.beginPath();
  ctx.moveTo(z * 0.12, z * 0.12);
  ctx.lineTo(z * 0.24, z * 0.12);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}

type PilotMood = 'idle' | 'wow' | 'huh' | 'gasp' | 'smug';
/** UFO (x, y = 원반 가운데, W = 원반 폭) */
function drawUfo(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, t: number, mood: PilotMood, fill: number, beaming: boolean) {
  const Hh = W * 0.2;
  // 유리 돔 + 외계인
  ctx.save();
  ctx.translate(x, y);
  const dg = ctx.createRadialGradient(-W * 0.06, -Hh * 1.3, W * 0.02, 0, -Hh * 0.8, W * 0.24);
  dg.addColorStop(0, 'rgba(220,255,240,.55)');
  dg.addColorStop(1, 'rgba(90,170,200,.28)');
  // 외계인
  const bob = Math.sin(t * 0.08) * W * 0.008;
  ctx.fillStyle = '#7ee08a';
  ctx.beginPath();
  ctx.ellipse(0, -Hh * 1.05 + bob, W * 0.11, W * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7ee08a';
  ctx.lineWidth = W * 0.012;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sd * W * 0.04, -Hh * 1.45 + bob);
    ctx.lineTo(sd * W * 0.07, -Hh * 1.85 + bob + (mood === 'wow' ? -Math.abs(Math.sin(t * 0.4)) * W * 0.02 : 0));
    ctx.stroke();
    ctx.fillStyle = mood === 'gasp' ? '#ff6b6b' : '#fff38a';
    ctx.beginPath();
    ctx.arc(sd * W * 0.07, -Hh * 1.9 + bob, W * 0.018, 0, TAU);
    ctx.fill();
  }
  const blink = (t % 170) < 6 && mood === 'idle';
  ctx.fillStyle = '#10131c';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(sd * W * 0.045, -Hh * 1.08 + bob);
    ctx.rotate(sd * 0.35);
    ctx.beginPath();
    const big = mood === 'wow' || mood === 'gasp' ? 1.25 : 1;
    if (blink || mood === 'smug') ctx.fillRect(-W * 0.03, -W * 0.004, W * 0.06, W * 0.01);
    else ctx.ellipse(0, 0, W * 0.032 * big, W * 0.045 * big, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#ffffff';
  if (!blink && mood !== 'smug') for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * W * 0.045 + W * 0.01, -Hh * 1.14 + bob, W * 0.009, 0, TAU), ctx.fill());
  ctx.fillStyle = '#2a4a30';
  ctx.beginPath();
  if (mood === 'wow' || mood === 'gasp') ctx.ellipse(0, -Hh * 0.82 + bob, W * 0.018, W * 0.022, 0, 0, TAU);
  else if (mood === 'huh') ctx.ellipse(W * 0.01, -Hh * 0.82 + bob, W * 0.02, W * 0.006, 0.3, 0, TAU);
  else ctx.ellipse(0, -Hh * 0.84 + bob, W * 0.025, W * 0.01, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.ellipse(0, -Hh * 0.55, W * 0.2, Hh * 1.55, 0, Math.PI, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(-W * 0.07, -Hh * 1.3, W * 0.05, Hh * 0.5, -0.5, Math.PI * 1.1, Math.PI * 1.6);
  ctx.stroke();
  // 원반
  const g = ctx.createLinearGradient(0, -Hh * 0.7, 0, Hh * 0.6);
  g.addColorStop(0, '#f2f5fb');
  g.addColorStop(0.45, '#a9b3c6');
  g.addColorStop(0.55, '#7f8aa2');
  g.addColorStop(1, '#4b5468');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, W / 2, Hh * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5b6479';
  ctx.beginPath();
  ctx.ellipse(0, Hh * 0.32, W * 0.24, Hh * 0.35, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = beaming ? '#d8ffe4' : '#7dffb2';
  ctx.globalAlpha = beaming ? 1 : 0.55 + 0.3 * Math.sin(t * 0.1);
  ctx.beginPath();
  ctx.ellipse(0, Hh * 0.45, W * 0.14, Hh * 0.18, 0, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  // 창 (소가 내다본다)
  const nWin = 5;
  for (let k = 0; k < nWin; k++) {
    const u = (k - (nWin - 1) / 2) / ((nWin - 1) / 2), wx = u * W * 0.33, wy = Hh * 0.04 + Math.abs(u) * -Hh * 0.08, wr = W * 0.038;
    ctx.fillStyle = '#1c2236';
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, TAU);
    ctx.fill();
    if (k < fill) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(wx, wy, wr * 0.9, 0, TAU);
      ctx.clip();
      ctx.fillStyle = '#ffd98a';
      ctx.fillRect(wx - wr, wy - wr, wr * 2, wr * 2);
      const peek = Math.sin(t * 0.05 + k) * wr * 0.2;
      ctx.fillStyle = '#f4f2ee';
      ctx.beginPath();
      ctx.ellipse(wx + peek, wy + wr * 0.25, wr * 0.75, wr * 0.8, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f5b3c2';
      ctx.beginPath();
      ctx.ellipse(wx + peek, wy + wr * 0.6, wr * 0.5, wr * 0.32, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1b1b22';
      for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(wx + peek + sd * wr * 0.28, wy + wr * 0.05, wr * 0.12, 0, TAU), ctx.fill());
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(160,220,255,.35)';
      ctx.beginPath();
      ctx.arc(wx - wr * 0.25, wy - wr * 0.25, wr * 0.35, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#d7deea';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(wx, wy, wr, 0, TAU);
    ctx.stroke();
  }
  // 둘레 불빛 (돌아간다)
  for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI + t * 0.02, u = Math.cos(a);
    if (Math.sin(a) < 0) continue;
    const on = Math.floor(t / 8 + k) % 3 === 0;
    ctx.fillStyle = on ? ['#ff6b6b', '#ffd25a', '#7dffb2'][k % 3] : 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.arc(u * W * 0.46, Hh * 0.3 * Math.sin(a) + Hh * 0.05, W * 0.016, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 하늘 · 먼 언덕 · 헛간 · 옥수수밭 · 밭 */
function drawWorld(ctx: CanvasRenderingContext2D, s: UfoState, w: number, d: StageDef) {
  const t = s.t, R = (r: number) => r * w, night = !!d.night;
  const PX = (x: number, y: number) => SX(x, y) * w, PY = (y: number) => SY(y) * w;
  const sky = ctx.createLinearGradient(0, 0, 0, R(FY0));
  sky.addColorStop(0, night ? '#04061a' : '#0a1236');
  sky.addColorStop(0.7, night ? '#0e1434' : '#24346a');
  sky.addColorStop(1, night ? '#1a2244' : '#3f4f86');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, R(FY0) + 20);
  for (let k = 0; k < 55; k++) {
    const a = 0.35 + 0.6 * Math.abs(Math.sin(t / 45 + k * 1.7));
    ctx.fillStyle = `rgba(255,255,235,${a})`;
    const sx = hsh(k) * w, sy = R(0.09 + hsh(k + 77) * 0.24), sz = k % 7 ? 1.2 : 2;
    ctx.fillRect(sx, sy, sz, sz);
  }
  // 달
  const mx = R(0.8), my = R(0.17), mr = R(0.058);
  const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3.2);
  halo.addColorStop(0, night ? 'rgba(255,250,220,.12)' : 'rgba(255,250,220,.32)');
  halo.addColorStop(1, 'rgba(255,250,220,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(mx - mr * 3.5, my - mr * 3.5, mr * 7, mr * 7);
  const mg = ctx.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
  mg.addColorStop(0, '#fffbe6');
  mg.addColorStop(1, '#e8dcae');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,175,130,.45)';
  for (const [cx, cy, cr] of [[-0.3, -0.2, 0.22], [0.25, 0.1, 0.16], [-0.05, 0.4, 0.12], [0.35, -0.35, 0.09]] as const) (ctx.beginPath(), ctx.arc(mx + cx * mr, my + cy * mr, cr * mr, 0, TAU), ctx.fill());
  // 구름 (밤엔 달을 가린다)
  for (let k = 0; k < (night ? 4 : 3); k++) {
    const cx = ((hsh(k + 5) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4 - 0.2) * w, cy = R(0.12 + k * 0.06 + (night && k === 0 ? 0.04 : 0));
    const cxx = night && k === 0 ? mx - R(0.02) : cx;
    ctx.fillStyle = night ? 'rgba(30,36,70,.92)' : 'rgba(120,135,190,.25)';
    for (const [ox, oy, r] of [[-0.06, 0, 0.035], [0, -0.015, 0.045], [0.06, 0, 0.032], [0.0, 0.012, 0.04]] as const) (ctx.beginPath(), ctx.ellipse(cxx + R(ox), cy + R(oy), R(r * 1.6), R(r), 0, 0, TAU), ctx.fill());
  }
  // 먼 언덕 두 겹
  ctx.fillStyle = night ? '#121a32' : '#1c2a4e';
  ctx.beginPath();
  ctx.moveTo(0, R(FY0));
  for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(R(x), R(0.315 + 0.025 * Math.sin(x * 5 + 1) + 0.012 * Math.sin(x * 13)));
  ctx.lineTo(w, R(FY0));
  ctx.fill();
  ctx.fillStyle = night ? '#16233a' : '#22385a';
  ctx.beginPath();
  ctx.moveTo(0, R(FY0));
  for (let x = 0; x <= 1.001; x += 0.05) ctx.lineTo(R(x), R(0.36 + 0.02 * Math.sin(x * 7 + 3)));
  ctx.lineTo(w, R(FY0));
  ctx.fill();
  // 먼 농가 (불 켜진 창)
  {
    const fx0 = R(0.66), fy0 = R(0.395);
    ctx.fillStyle = night ? '#101828' : '#2a3350';
    ctx.fillRect(fx0, fy0 - R(0.04), R(0.07), R(0.04));
    ctx.beginPath();
    ctx.moveTo(fx0 - R(0.008), fy0 - R(0.04));
    ctx.lineTo(fx0 + R(0.035), fy0 - R(0.065));
    ctx.lineTo(fx0 + R(0.078), fy0 - R(0.04));
    ctx.fill();
    ctx.fillStyle = `rgba(255,214,120,${0.75 + 0.2 * Math.sin(t * 0.03)})`;
    ctx.fillRect(fx0 + R(0.012), fy0 - R(0.03), R(0.013), R(0.012));
    ctx.fillRect(fx0 + R(0.045), fy0 - R(0.03), R(0.013), R(0.012));
  }
  // 빨간 헛간 + 사일로 (뒤 왼쪽, 3/4)
  {
    const bx = R(0.06), by = R(0.43), bw = R(0.17), bh = R(0.09), sd = R(0.06);
    ctx.fillStyle = '#5a1e1e';
    ctx.beginPath();
    ctx.moveTo(bx + bw, by);
    ctx.lineTo(bx + bw + sd, by - R(0.025));
    ctx.lineTo(bx + bw + sd, by - bh - R(0.025));
    ctx.lineTo(bx + bw, by - bh);
    ctx.fill();
    const bg = ctx.createLinearGradient(bx, by - bh, bx + bw, by);
    bg.addColorStop(0, '#b8342e');
    bg.addColorStop(1, '#7c2220');
    ctx.fillStyle = bg;
    ctx.fillRect(bx, by - bh, bw, bh);
    ctx.fillStyle = '#4a1414';
    ctx.beginPath();
    ctx.moveTo(bx - R(0.01), by - bh);
    ctx.lineTo(bx + bw / 2, by - bh - R(0.06));
    ctx.lineTo(bx + bw + R(0.01), by - bh);
    ctx.fill();
    ctx.fillStyle = '#3a1010';
    ctx.beginPath();
    ctx.moveTo(bx + bw / 2, by - bh - R(0.06));
    ctx.lineTo(bx + bw / 2 + sd, by - bh - R(0.085));
    ctx.lineTo(bx + bw + sd, by - bh - R(0.025));
    ctx.lineTo(bx + bw + R(0.01), by - bh);
    ctx.fill();
    ctx.strokeStyle = '#f2e6d8';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(bx + bw * 0.3, by - bh * 0.7, bw * 0.4, bh * 0.7);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.3, by - bh * 0.7);
    ctx.lineTo(bx + bw * 0.7, by);
    ctx.moveTo(bx + bw * 0.7, by - bh * 0.7);
    ctx.lineTo(bx + bw * 0.3, by);
    ctx.stroke();
    ctx.fillStyle = `rgba(255,214,120,${0.8})`;
    ctx.fillRect(bx + bw * 0.43, by - bh - R(0.035), bw * 0.14, R(0.018));
    // 사일로
    const sx = R(0.02), sw = R(0.045);
    const sg = ctx.createLinearGradient(sx, 0, sx + sw, 0);
    sg.addColorStop(0, '#8e98ae');
    sg.addColorStop(0.4, '#c9d1e0');
    sg.addColorStop(1, '#6f7890');
    ctx.fillStyle = sg;
    ctx.fillRect(sx, by - R(0.14), sw, R(0.14));
    ctx.beginPath();
    ctx.ellipse(sx + sw / 2, by - R(0.14), sw / 2, R(0.022), 0, Math.PI, TAU);
    ctx.fill();
  }
  // 밭 바닥
  const y0 = PY(0), y1 = PY(DEP);
  const gg = ctx.createLinearGradient(0, y0, 0, y1);
  gg.addColorStop(0, night ? '#1a2f2a' : '#27493d');
  gg.addColorStop(1, night ? '#24402e' : '#3b6b44');
  ctx.fillStyle = gg;
  ctx.fillRect(0, y0 - 2, w, y1 - y0 + 4);
  // 깎은 풀 줄무늬 (원근)
  for (let k = 0; k < 12; k++) {
    const ya = (k / 12) * DEP, yb = ((k + 1) / 12) * DEP;
    ctx.fillStyle = k % 2 ? 'rgba(0,10,20,.07)' : 'rgba(170,230,180,.075)';
    ctx.beginPath();
    ctx.moveTo(PX(-0.1, ya), PY(ya));
    ctx.lineTo(PX(1.1, ya), PY(ya));
    ctx.lineTo(PX(1.1, yb), PY(yb));
    ctx.lineTo(PX(-0.1, yb), PY(yb));
    ctx.fill();
  }
  // 달빛 (오른쪽 위에서)
  const ml = ctx.createRadialGradient(R(0.85), y0, R(0.05), R(0.7), y0 + R(0.25), R(0.9));
  ml.addColorStop(0, night ? 'rgba(150,170,255,.04)' : 'rgba(190,210,255,.16)');
  ml.addColorStop(1, 'rgba(190,210,255,0)');
  ctx.fillStyle = ml;
  ctx.fillRect(0, y0, w, y1 - y0);
  // 지평선 물안개
  const mist = ctx.createLinearGradient(0, y0 - R(0.03), 0, y0 + R(0.08));
  mist.addColorStop(0, 'rgba(170,190,240,0)');
  mist.addColorStop(0.4, night ? 'rgba(120,140,200,.12)' : 'rgba(170,190,240,.2)');
  mist.addColorStop(1, 'rgba(170,190,240,0)');
  ctx.fillStyle = mist;
  ctx.fillRect(0, y0 - R(0.03), w, R(0.11));
  // 흙자리 (풀이 닳은 곳)
  for (let k = 0; k < 7; k++) {
    const x = 0.1 + hsh(k + 500) * 0.8, y = 0.15 + hsh(k + 520) * 0.95, rr = R(0.035 + 0.03 * hsh(k + 540)) * scl(y);
    ctx.fillStyle = night ? 'rgba(70,60,40,.18)' : 'rgba(110,90,60,.22)';
    ctx.beginPath();
    ctx.ellipse(PX(x, y), PY(y), rr * 1.6, rr * 0.55, 0, 0, TAU);
    ctx.fill();
  }
  // 울타리 밖: 건초 더미 · 물통
  const bale = (x: number, y: number) => {
    const bx = PX(x, y), by = PY(y), z = R(0.032) * scl(y);
    shadow(ctx, bx, by, z * 1.4, z * 0.35, 0.4);
    ctx.fillStyle = '#b8913e';
    ctx.beginPath();
    ctx.roundRect(bx - z * 1.2, by - z * 1.1, z * 2.4, z * 1.1, z * 0.3);
    ctx.fill();
    ctx.fillStyle = '#d9b45a';
    ctx.beginPath();
    ctx.ellipse(bx + z * 1.0, by - z * 0.55, z * 0.35, z * 0.55, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#8a6a2a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(bx + z * 1.0, by - z * 0.55, z * 0.18, z * 0.3, 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,60,20,.6)';
    for (const f of [-0.5, 0.2]) (ctx.beginPath(), ctx.moveTo(bx + f * z, by - z * 1.1), ctx.lineTo(bx + f * z, by), ctx.stroke());
  };
  bale(-0.1, 0.12);
  bale(-0.07, 0.3);
  {
    const tx = PX(1.09, 0.32), ty = PY(0.32), z = R(0.03);
    shadow(ctx, tx, ty, z * 1.3, z * 0.3, 0.4);
    ctx.fillStyle = '#6f7a8c';
    ctx.fillRect(tx - z * 1.1, ty - z * 0.8, z * 2.2, z * 0.8);
    ctx.fillStyle = night ? '#2a3a6a' : '#4a6aaa';
    ctx.beginPath();
    ctx.ellipse(tx, ty - z * 0.8, z * 1.1, z * 0.22, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,.5)';
    ctx.beginPath();
    ctx.ellipse(tx + z * 0.4, ty - z * 0.82, z * 0.25, z * 0.06, 0, 0, TAU);
    ctx.fill();
  }
  // 옥수수밭 (뒤 오른쪽)
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 11; k++) {
      const x = 0.7 + k * 0.03 + (row % 2) * 0.015, y = 0.015 + row * 0.035;
      if (x > 1.02) continue;
      const gx = PX(x, y), gy = PY(y), hz = R(0.06 + 0.012 * hsh(k + row * 11)) * scl(y), sw = Math.sin(t * 0.03 + k * 0.7 + row) * R(0.006);
      ctx.strokeStyle = row === 2 ? '#4f7a3a' : '#3c6230';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(gx, gy);
      ctx.quadraticCurveTo(gx + sw * 0.5, gy - hz * 0.6, gx + sw, gy - hz);
      ctx.stroke();
      ctx.fillStyle = row === 2 ? '#5f8f45' : '#4a7436';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(gx + sd * R(0.008) + sw * 0.5, gy - hz * 0.55, R(0.012), R(0.004), sd * 0.6, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#e8c45a';
      ctx.beginPath();
      ctx.ellipse(gx + sw * 0.7 + R(0.005), gy - hz * 0.72, R(0.004), R(0.009), 0.3, 0, TAU);
      ctx.fill();
    }
  // 풀 포기·꽃
  for (let k = 0; k < 70; k++) {
    const x = hsh(k + 300), y = hsh(k + 400) * DEP, gx = PX(x, y), gy = PY(y), gz = R(0.012) * scl(y);
    ctx.strokeStyle = 'rgba(120,190,120,.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx - gz, gy);
    ctx.lineTo(gx - gz * 0.6, gy - gz * 1.2);
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + Math.sin(t * 0.03 + k) * gz * 0.3, gy - gz * 1.6);
    ctx.moveTo(gx + gz, gy);
    ctx.lineTo(gx + gz * 0.7, gy - gz * 1.1);
    ctx.stroke();
    if (k % 6 === 0) {
      ctx.fillStyle = ['#f3e8ff', '#ffe8a8', '#ffc8d8'][k % 3];
      ctx.beginPath();
      ctx.arc(gx + gz * 0.4, gy - gz * 1.4, Math.max(1.2, gz * 0.35), 0, TAU);
      ctx.fill();
    }
  }
  // 울타리 (밭 왼·오른·뒤 가장자리)
  const fence = (xa: number, ya: number, xb: number, yb: number, n: number) => {
    for (let k = 0; k <= n; k++) {
      const q = k / n, x = xa + (xb - xa) * q, y = ya + (yb - ya) * q, px = PX(x, y), py = PY(y), hz = R(0.035) * scl(y);
      ctx.fillStyle = '#5a3e2a';
      ctx.fillRect(px - 1.5, py - hz, 3, hz);
    }
    ctx.strokeStyle = '#7a5a40';
    ctx.lineWidth = 1.6;
    for (const f of [0.45, 0.85]) {
      ctx.beginPath();
      for (let k = 0; k <= n; k++) {
        const q = k / n, x = xa + (xb - xa) * q, y = ya + (yb - ya) * q;
        ctx.lineTo(PX(x, y), PY(y) - R(0.035) * scl(y) * f);
      }
      ctx.stroke();
    }
  };
  fence(-0.02, -0.01, -0.02, DEP, 9);
  fence(1.02, -0.01, 1.02, DEP, 9);
  fence(-0.02, -0.01, 0.62, -0.01, 8);
  // 소 떼 길 (8자 흙길)
  if (d.herd) {
    const hm = s.W.mobs.find((m) => m.path === 1);
    if (hm) {
      ctx.strokeStyle = night ? 'rgba(120,100,70,.35)' : 'rgba(150,120,80,.42)';
      ctx.lineWidth = R(0.05);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 80; k++) {
        const a = (k / 80) * TAU, x = hm.cx + hm.rx * Math.cos(a), y = hm.cy + hm.ry * Math.sin(2 * a);
        ctx.lineTo(PX(x, y), PY(y));
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }
  // 지붕 아래 그늘 (지붕은 동물 뒤에 그린다)
  if (d.roof) {
    ctx.fillStyle = 'rgba(5,8,20,.4)';
    ctx.beginPath();
    ctx.moveTo(PX(ROOF.x0, ROOF.y0), PY(ROOF.y0));
    ctx.lineTo(PX(ROOF.x1, ROOF.y0), PY(ROOF.y0));
    ctx.lineTo(PX(ROOF.x1, ROOF.y1), PY(ROOF.y1));
    ctx.lineTo(PX(ROOF.x0, ROOF.y1), PY(ROOF.y1));
    ctx.fill();
    ctx.fillStyle = 'rgba(200,170,110,.18)';
    for (let k = 0; k < 14; k++) {
      const x = ROOF.x0 + hsh(k + 600) * (ROOF.x1 - ROOF.x0), y = ROOF.y0 + hsh(k + 650) * (ROOF.y1 - ROOF.y0);
      ctx.fillRect(PX(x, y), PY(y), R(0.02), 1.5);
    }
  }
}

function drawRoof(ctx: CanvasRenderingContext2D, w: number, t: number) {
  const R = (r: number) => r * w, PX = (x: number, y: number) => SX(x, y) * w, PY = (y: number) => SY(y) * w, H = R(0.1);
  // 기둥
  ctx.fillStyle = '#6a4a30';
  for (const [x, y] of [[ROOF.x0 + 0.02, ROOF.y1], [ROOF.x1 - 0.02, ROOF.y1], [ROOF.x1 - 0.02, ROOF.y0 + 0.02], [ROOF.x0 + 0.02, ROOF.y0 + 0.02]] as const) ctx.fillRect(PX(x, y) - 3, PY(y) - H, 6, H);
  // 지붕판 (반투명: 아래 동물이 보이게)
  const pts = [[ROOF.x0 - 0.02, ROOF.y0 - 0.02], [ROOF.x1 + 0.02, ROOF.y0 - 0.02], [ROOF.x1 + 0.03, ROOF.y1 + 0.03], [ROOF.x0 - 0.03, ROOF.y1 + 0.03]];
  // 함석지붕 (반투명: 아래 동물이 비쳐 보이게)
  ctx.globalAlpha = 0.6;
  const g = ctx.createLinearGradient(PX(ROOF.x0, ROOF.y0), PY(ROOF.y0) - H, PX(ROOF.x1, ROOF.y1), PY(ROOF.y1) - H);
  g.addColorStop(0, '#c9d3e6');
  g.addColorStop(0.5, '#8d9ab4');
  g.addColorStop(1, '#5c6884');
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [x, y] of pts) ctx.lineTo(PX(x, y), PY(y) - H);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  for (let k = 1; k < 14; k++) {
    const x = ROOF.x0 - 0.02 + (k / 14) * (ROOF.x1 - ROOF.x0 + 0.04);
    ctx.strokeStyle = k % 2 ? 'rgba(255,255,255,.45)' : 'rgba(30,40,60,.45)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(PX(x, ROOF.y0 - 0.02), PY(ROOF.y0 - 0.02) - H);
    ctx.lineTo(PX(x + 0.005, ROOF.y1 + 0.03), PY(ROOF.y1 + 0.03) - H);
    ctx.stroke();
  }
  // 녹 얼룩 · 달빛 반짝
  ctx.fillStyle = 'rgba(160,90,50,.35)';
  for (const [x, y, r] of [[0.1, 0.12, 0.03], [0.3, 0.3, 0.025], [0.36, 0.08, 0.02]] as const) (ctx.beginPath(), ctx.ellipse(PX(x, y), PY(y) - H, R(r), R(r * 0.5), 0, 0, TAU), ctx.fill());
  ctx.globalAlpha = 1;
  ctx.strokeStyle = 'rgba(230,240,255,.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (const [x, y] of pts) ctx.lineTo(PX(x, y), PY(y) - H);
  ctx.closePath();
  ctx.stroke();
  // 앞 처마 두께
  ctx.fillStyle = '#3c465e';
  ctx.beginPath();
  ctx.moveTo(PX(pts[3][0], pts[3][1]), PY(pts[3][1]) - H);
  ctx.lineTo(PX(pts[2][0], pts[2][1]), PY(pts[2][1]) - H);
  ctx.lineTo(PX(pts[2][0], pts[2][1]), PY(pts[2][1]) - H + R(0.014));
  ctx.lineTo(PX(pts[3][0], pts[3][1]), PY(pts[3][1]) - H + R(0.014));
  ctx.fill();
  // 지붕 위 고양이? → 랜턴
  const lx = PX(ROOF.x1 - 0.02, ROOF.y1), ly = PY(ROOF.y1) - H + R(0.03);
  ctx.fillStyle = `rgba(255,200,100,${0.75 + 0.2 * Math.sin(t * 0.13)})`;
  ctx.beginPath();
  ctx.arc(lx + R(0.012), ly, R(0.009), 0, TAU);
  ctx.fill();
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function drawAll(ctx: CanvasRenderingContext2D, s: UfoState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, W = s.W, d = STAGES[s.stage];
  const R = (r: number) => r * w, PX = (x: number, y: number) => SX(x, y) * w, PY = (y: number) => SY(y) * w;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t: s.t });
    if (rec.length > 12) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), Math.max(R(0.2), y), text, col, size);
  };
  const beaming = s.phase === 'beam', bq = beaming ? s.pt / BEAM_T : 0;
  // 미리 보기: 누르고 있는 동안 지금 떼면?
  const aimF = s.phase === 'aim' && s.down ? toField(s.ax, s.ay * A) : null;
  let pv: { W: World; rec: Rec } | null = null;
  if (aimF) {
    const C = cloneW(W), rec = newRec();
    resolve(C, d, aimF[0], aimF[1], rec);
    pv = { W: C, rec };
  }
  // UFO 자리 (화면)
  const ufoW = R(0.25), uyScr = (y: number) => Math.max(R(0.2), PY(y) - R(0.34)) + Math.sin(t * 0.05) * R(0.008);
  const UX = PX(s.ux, s.uy), UY = uyScr(s.uy);
  ctx.save();
  fx.begin(ctx);
  drawWorld(ctx, s, w, d);
  // UFO 그림자 (땅)
  {
    const gx = PX(s.ux, s.uy), gy = PY(s.uy);
    ctx.fillStyle = 'rgba(5,10,25,.22)';
    ctx.beginPath();
    ctx.ellipse(gx, gy, R(0.11) * scl(s.uy), R(0.04) * scl(s.uy), 0, 0, TAU);
    ctx.fill();
  }
  // 빔 원 (땅에 닿는 곳): 미리 보기 / 쏘는 중
  const ring = (cx: number, cy: number, col: string, a: number, dash: boolean) => {
    const rx = BR * FXW * scl(cy) * w, ry = BR * KY * w;
    ctx.fillStyle = col.replace('A', String(a * 0.22));
    ctx.beginPath();
    ctx.ellipse(PX(cx, cy), PY(cy), rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = col.replace('A', String(Math.min(1, a)));
    ctx.lineWidth = 2.5;
    if (dash) ctx.setLineDash([7, 5]), (ctx.lineDashOffset = -t * 0.6);
    ctx.beginPath();
    ctx.ellipse(PX(cx, cy), PY(cy), rx, ry, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  };
  const dogM = W.mobs.find((m) => m.k === 'dog');
  // 개 둘레 (점선)
  if (dogM) {
    const [gx, gy] = pos(dogM, W.t), rx = DR * FXW * scl(gy) * w, ry = DR * KY * w;
    const hot = pv?.rec.bark || (beaming && s.rec?.bark && bq < 0.5);
    ctx.strokeStyle = hot ? 'rgba(255,170,80,.95)' : 'rgba(255,190,120,.45)';
    ctx.fillStyle = hot ? 'rgba(255,170,80,.14)' : 'rgba(255,190,120,.05)';
    ctx.lineWidth = hot ? 2.5 : 1.5;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.ellipse(PX(gx, gy), PY(gy), rx, ry, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    // 개집 → 개 목줄
    if (d.kennel) {
      ctx.strokeStyle = 'rgba(200,200,210,.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(PX(d.kennel[0], d.kennel[1]), PY(d.kennel[1]) - R(0.01));
      ctx.lineTo(PX(gx, gy), PY(gy) - R(0.02));
      ctx.stroke();
    }
  }
  // 우주 젖소 착지 예정 자리
  const spaceM = W.mobs.find((m) => m.k === 'space' && !m.gone);
  if (spaceM) {
    const [gr, k, q] = spaceState(spaceM, W.t), n = spaceM.hx!.length, k2 = gr ? k : (k + 1) % n;
    const tx = spaceM.hx![k2], ty = spaceM.hy![k2], pul = 0.5 + 0.5 * Math.sin(t * 0.2);
    if (!gr || (SPACE_G - ((W.t + spaceM.ph) % SPACE_P)) < 40) {
      const nk = gr ? (k + 1) % n : k2, nx = spaceM.hx![nk], ny = spaceM.hy![nk];
      ctx.strokeStyle = `rgba(220,190,255,${0.5 + 0.4 * pul})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.ellipse(PX(nx, ny), PY(ny), R(0.05) * scl(ny), R(0.022), 0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      emoji(ctx, '✨', PX(nx, ny), PY(ny) - R(0.03), R(0.035));
    }
    if (gr) {
      ctx.fillStyle = `rgba(200,170,255,${0.12 + 0.08 * pul})`;
      ctx.beginPath();
      ctx.ellipse(PX(tx, ty), PY(ty), R(0.06), R(0.025), 0, 0, TAU);
      ctx.fill();
    }
    void q;
  }
  if (aimF) ring(aimF[0], aimF[1], pv?.rec.spotted ? 'rgba(255,90,90,A)' : 'rgba(140,255,190,A)', 0.85, true);
  if (beaming) ring(s.bx, s.by, s.rec?.spotted ? 'rgba(255,230,120,A)' : 'rgba(190,255,215,A)', 1 - bq * 0.5, false);
  // 미리 보기: 개가 짖어 튈 소 화살표
  if (pv) {
    for (const p of pv.rec.pushed) {
      ctx.strokeStyle = 'rgba(255,190,110,.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PX(p.x0, p.y0), PY(p.y0) - R(0.02));
      ctx.lineTo(PX(p.x1, p.y1), PY(p.y1) - R(0.02));
      ctx.stroke();
      ctx.setLineDash([]);
      const an = Math.atan2(PY(p.y1) - PY(p.y0), PX(p.x1, p.y1) - PX(p.x0, p.y0)), ex = PX(p.x1, p.y1), ey = PY(p.y1) - R(0.02);
      ctx.fillStyle = 'rgba(255,190,110,.95)';
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(an) * 6, ey + Math.sin(an) * 6);
      ctx.lineTo(ex + Math.cos(an + 2.5) * 6, ey + Math.sin(an + 2.5) * 6);
      ctx.lineTo(ex + Math.cos(an - 2.5) * 6, ey + Math.sin(an - 2.5) * 6);
      ctx.fill();
    }
  }
  // ═════════ 손전등 빛 (밤) — 땅에 비친 쐐기 ═════════
  const farmerM = W.mobs.find((m) => m.k === 'farmer');
  if (d.night && farmerM) {
    const [fx0, fy0] = pos(farmerM, W.t), dir = lightDir(W, farmerM);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const steps = 14;
    ctx.beginPath();
    ctx.moveTo(PX(fx0, fy0), PY(fy0) - R(0.04));
    for (let k = 0; k <= steps; k++) {
      const a = dir - LIGHT_HALF + (2 * LIGHT_HALF * k) / steps, x = fx0 + Math.cos(a) * LIGHT_L, y = fy0 + Math.sin(a) * LIGHT_L;
      ctx.lineTo(PX(x, y), PY(y));
    }
    ctx.closePath();
    const cx = PX(fx0 + Math.cos(dir) * LIGHT_L * 0.5, fy0 + Math.sin(dir) * LIGHT_L * 0.5), cy = PY(fy0 + Math.sin(dir) * LIGHT_L * 0.5);
    const lg = ctx.createRadialGradient(PX(fx0, fy0), PY(fy0), R(0.02), cx, cy, R(0.5));
    lg.addColorStop(0, 'rgba(255,220,130,.3)');
    lg.addColorStop(1, 'rgba(255,200,100,.05)');
    ctx.fillStyle = lg;
    ctx.fill();
    ctx.restore();
  }
  // ═════════ 땅 위의 것들 (깊이 순) ═════════
  type Dr = { y: number; f: () => void };
  const list: Dr[] = [];
  const hideTill = new Map<number, number>();
  if (beaming) for (const L of s.lifts) hideTill.set(L.i, L.fate === 'drop' ? 0.75 : L.fate === 'bump' ? 0.5 : 2);
  const inPv = new Set<number>(), safePv = new Set<number>();
  if (pv) {
    for (const q of pv.rec.lifted) inPv.add(q.i);
    for (const i of pv.rec.safe) safePv.add(i);
  }
  W.mobs.forEach((m, i) => {
    if (m.gone || m.k === 'space') return;
    const ht = hideTill.get(i);
    if (ht !== undefined && bq < ht) return;
    const [x, y] = pos(m, W.t), z = R(0.045) * scl(y);
    const nx = pos({ ...m, a: m.a + (m.sp >= 0 ? 0.05 : -0.05) }, W.t)[0];
    const face = m.path === 3 ? 1 : nx >= x ? 1 : -1;
    const sx = PX(x, y), sy = PY(y);
    const pushed = Math.abs(m.ox) + Math.abs(m.oy) > 0.02;
    const glow = inPv.has(i) ? 0.6 + 0.4 * Math.sin(t * 0.3 + i) : 0;
    list.push({
      y,
      f: () => {
        if (m.k === 'cow' || m.k === 'bull') {
          const moving = m.path === 1 ? (W.t % BEAT < MOVE ? 1 : 0) : m.stun > 0 ? 0 : gait(m, W.t) > 0.6 ? 1 : 0;
          const hop = m.path === 1 && W.t % BEAT < MOVE ? Math.sin(((W.t % BEAT) / MOVE) * Math.PI) * z * 0.35 : 0;
          drawCow(ctx, sx, sy - hop, z, { face, t: t + i * 13, walk: moving, mood: m.stun > 0 ? 'dizzy' : pushed ? 'scared' : glow ? 'scared' : moving ? 'walk' : 'graze', bull: m.k === 'bull', glow });
          if (m.k === 'bull' && m.stun > 0) {
            ctx.fillStyle = '#ffe066';
            for (let k = 0; k < 3; k++) {
              const a = t * 0.15 + (k * TAU) / 3;
              star(ctx, sx + Math.cos(a) * z * 0.6 + z * 0.9 * face, sy - z * 1.9 + Math.sin(a) * z * 0.15, z * 0.14, z * 0.06);
            }
          }
          if (m.k === 'bull' && m.hits === 1 && !m.stun) emoji(ctx, '💢', sx + face * z * 1.2, sy - z * 1.9, R(0.03));
        } else if (m.k === 'chick') drawChick(ctx, sx, sy, z * 0.85, face, t + i * 7);
        else if (m.k === 'farmer') {
          const mood: FarmerMood = m.stun > 0 ? 'sit' : glow ? 'angry' : 'walk';
          drawFarmer(ctx, sx, sy, z * 1.05, d.night ? (Math.cos(lightDir(W, m)) >= 0 ? 1 : -1) : face, mood, t, !!d.night);
          if (glow) emoji(ctx, '❗', sx, sy - z * 2.6, R(0.04));
        } else if (m.k === 'dog') drawDog(ctx, sx, sy, z * 0.9, face, !!(pv?.rec.bark || (beaming && s.rec?.bark && bq < 0.6)), t);
        else if (m.k === 'scare') drawScare(ctx, sx, sy, z * 1.1, t + i * 30);
        if (glow && m.k !== 'farmer') {
          ctx.fillStyle = '#ffffff';
          star(ctx, sx + Math.sin(t * 0.2 + i) * z * 0.8, sy - z * 1.6 + Math.cos(t * 0.17 + i) * z * 0.2, z * 0.18, z * 0.07);
        }
        if (safePv.has(i)) emoji(ctx, '🛡️', sx, sy - z * 1.8, R(0.03));
      },
    });
  });
  if (d.kennel) {
    const [kx, ky] = d.kennel;
    list.push({ y: ky - 0.001, f: () => drawKennel(ctx, PX(kx, ky), PY(ky), R(0.045) * scl(ky)) });
  }
  // 구경꾼 염소
  {
    const gz = R(0.044) * scl(s.gy), face = s.gx < (aimF ? aimF[0] : s.bx) ? 1 : -1;
    list.push({ y: s.gy, f: () => drawGoat(ctx, PX(s.gx, s.gy), PY(s.gy), gz, face, t, false) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const it of list) it.f();
  if (d.roof) drawRoof(ctx, w, t);
  // ═════════ 밤: 어둠 + 손전등만 밝다 ═════════
  if (d.night) {
    const vg = ctx.createRadialGradient(w / 2, R(0.8), R(0.2), w / 2, R(0.8), R(0.9));
    vg.addColorStop(0, 'rgba(2,4,18,.5)');
    vg.addColorStop(1, 'rgba(2,4,18,.72)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, R(FY0) - R(0.12), w, R(SY(DEP) - FY0 + 0.13));
    if (farmerM) {
      const [fx0, fy0] = pos(farmerM, W.t), dir = lightDir(W, farmerM);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(PX(fx0, fy0), PY(fy0) - R(0.045));
      for (let k = 0; k <= 14; k++) {
        const a = dir - LIGHT_HALF + (2 * LIGHT_HALF * k) / 14, x = fx0 + Math.cos(a) * LIGHT_L, y = fy0 + Math.sin(a) * LIGHT_L;
        ctx.lineTo(PX(x, y), PY(y));
      }
      ctx.closePath();
      const lg = ctx.createRadialGradient(PX(fx0, fy0), PY(fy0), R(0.02), PX(fx0, fy0), PY(fy0), R(0.6));
      lg.addColorStop(0, 'rgba(255,214,110,.5)');
      lg.addColorStop(1, 'rgba(255,190,80,.06)');
      ctx.fillStyle = lg;
      ctx.fill();
      ctx.restore();
      // 어둠 속 소 눈빛
      W.mobs.forEach((m, i) => {
        if (m.gone || (m.k !== 'cow' && m.k !== 'chick') || lit(W, ...pos(m, W.t))) return;
        if ((t + i * 37) % 160 < 6) return;
        const [x, y] = pos(m, W.t), z = R(0.045) * scl(y), nx = pos({ ...m, a: m.a + (m.sp >= 0 ? 0.05 : -0.05) }, W.t)[0], f = nx >= x ? 1 : -1;
        ctx.fillStyle = 'rgba(255,250,200,.9)';
        ctx.beginPath();
        ctx.arc(PX(x, y) + f * z * 1.08, PY(y) - z * (m.k === 'chick' ? 0.75 : 1.2), Math.max(1.4, z * 0.07), 0, TAU);
        ctx.fill();
      });
    }
  }
  // ═════════ 우주 젖소 (하늘을 날다 내려앉는다) ═════════
  if (spaceM && !(beaming && s.lifts.some((L) => L.k === 'space'))) {
    const [gr, , q] = spaceState(spaceM, W.t), [x, y] = pos(spaceM, W.t), z = R(0.047) * scl(y);
    const alt = gr ? 0 : Math.sin(q * Math.PI) * R(0.22);
    shadow(ctx, PX(x, y), PY(y), z * (gr ? 1.2 : 0.8), z * 0.3, gr ? 0.35 : 0.18);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const au = ctx.createRadialGradient(PX(x, y), PY(y) - alt - z * 0.7, z * 0.3, PX(x, y), PY(y) - alt - z * 0.7, z * 2.2);
    au.addColorStop(0, 'rgba(190,150,255,.4)');
    au.addColorStop(1, 'rgba(190,150,255,0)');
    ctx.fillStyle = au;
    ctx.fillRect(PX(x, y) - z * 2.5, PY(y) - alt - z * 3, z * 5, z * 5);
    ctx.restore();
    drawCow(ctx, PX(x, y), PY(y) - alt, z, { face: 1, t, walk: gr ? 0 : 1, mood: gr ? 'happy' : 'lift', space: true, glow: inPv.has(W.mobs.indexOf(spaceM)) ? 1 : 0 }, true);
  }
  // ═════════ 빔 원뿔 ═════════
  const coneTo = (cx: number, cy: number, a: number, col: string) => {
    const rx = BR * FXW * scl(cy) * w, ry = BR * KY * w, gx = PX(cx, cy), gy = PY(cy);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createLinearGradient(0, UY, 0, gy);
    g.addColorStop(0, col.replace('A', String(a)));
    g.addColorStop(1, col.replace('A', String(a * 0.35)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(UX - ufoW * 0.13, UY + ufoW * 0.1);
    ctx.lineTo(gx - rx, gy);
    ctx.ellipse(gx, gy, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(UX + ufoW * 0.13, UY + ufoW * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  if (aimF) coneTo(aimF[0], aimF[1], 0.14, pv?.rec.spotted ? 'rgba(255,120,120,A)' : 'rgba(140,255,190,A)');
  if (beaming && !s.rec?.spotted) {
    const a = bq < 0.1 ? bq * 5 : bq > 0.85 ? (1 - bq) * 3.3 : 0.5;
    coneTo(s.bx, s.by, 0.25 + a * 0.5, 'rgba(170,255,205,A)');
    // 올라가는 빛 알갱이
    const gx = PX(s.bx, s.by), gy = PY(s.by), rx = BR * FXW * scl(s.by) * w;
    for (let k = 0; k < 18; k++) {
      const q = (t * 0.02 + hsh(k)) % 1, yy = gy + (UY - gy) * q, xx = gx + (UX - gx) * q + (hsh(k + 9) - 0.5) * rx * 1.6 * (1 - q);
      ctx.fillStyle = `rgba(220,255,230,${0.8 * (1 - q)})`;
      ctx.fillRect(xx, yy, 2, 2);
    }
  }
  // ═════════ 빔에 탄 것들 ═════════
  if (beaming) {
    for (const L of s.lifts) {
      const x0 = PX(L.x, L.y), y0 = PY(L.y), z0 = R(0.045) * scl(L.y);
      let px = x0, py = y0, sc = 1, rot = 0, show = true;
      const topY = UY + ufoW * 0.05;
      if (L.fate === 'in') {
        const q = ease(bq / 0.9);
        py = y0 + (topY - y0) * q;
        px = x0 + (UX - x0) * q + Math.sin(bq * 14 + L.i) * z0 * 1.2 * (1 - q);
        sc = 1 - q * 0.55;
        rot = bq * TAU * 1.6 * L.face;
        show = bq < 0.9;
      } else if (L.fate === 'drop') {
        const up = Math.min(1, bq / 0.5), fall = Math.max(0, (bq - 0.55) / 0.2), top = y0 + (topY - y0) * 0.55 * ease(up);
        py = bq < 0.55 ? top : top + (y0 - top) * Math.min(1, fall * fall);
        px = x0 + Math.sin(bq * 10) * z0 * 0.4;
        rot = bq < 0.55 ? Math.sin(bq * 30) * 0.3 : bq * 8;
        show = bq < 0.75;
      } else if (L.fate === 'bump') {
        const up = Math.min(1, bq / 0.3), fall = Math.max(0, (bq - 0.35) / 0.15);
        const top = y0 + (topY - y0) * 0.22 * ease(up);
        py = bq < 0.35 ? top + Math.sin(bq * 60) * 2 : top + (y0 - top) * Math.min(1, fall * fall);
        rot = Math.sin(bq * 40) * 0.08;
        show = bq < 0.5;
      } else if (L.fate === 'spit') {
        if (bq < 0.55) {
          const q = ease(bq / 0.55);
          py = y0 + (topY - y0) * q;
          px = x0 + (UX - x0) * q;
          sc = 1 - q * 0.4;
          rot = bq * 9;
        } else {
          const q = (bq - 0.55) / 0.45, side = L.x < 0.5 ? -1 : 1;
          px = UX + side * q * R(0.6);
          py = topY - Math.sin(q * Math.PI) * R(0.1) + q * R(0.15);
          sc = 0.6;
          rot = bq * 14;
        }
      }
      if (!show) continue;
      ctx.save();
      ctx.translate(px, py - z0 * 0.6 * sc);
      ctx.rotate(rot);
      ctx.scale(sc, sc);
      ctx.translate(0, z0 * 0.6);
      if (L.k === 'cow' || L.k === 'bull' || L.k === 'space') drawCow(ctx, 0, 0, z0, { face: L.face, t, walk: 0, mood: 'lift', bull: L.k === 'bull', space: L.k === 'space' }, true);
      else if (L.k === 'chick') drawChick(ctx, 0, 0, z0 * 0.85, L.face, t, true, true);
      else if (L.k === 'farmer') drawFarmer(ctx, 0, 0, z0 * 1.05, L.face, 'fist', t, false, true);
      else if (L.k === 'scare') drawScare(ctx, 0, 0, z0 * 1.1, t, true, true);
      ctx.restore();
    }
  }
  // ═════════ UFO ═════════
  {
    let mood: PilotMood = 'idle';
    const recent = (k: string, n = 70) => s.events.some((e) => e.kind === k && t - e.t < n);
    if (recent('spotted', 120) || (pv && pv.rec.spotted)) mood = 'gasp';
    else if (recent('farmerUp', 80) || recent('spitPre', 80) || (pv && pv.rec.lifted.some((q) => q.k === 'farmer'))) mood = 'huh';
    else if (recent('wow', 90) || (pv && pv.rec.cows >= 3)) mood = 'wow';
    else if (s.phase === 'result' && s.ok) mood = 'smug';
    let flying = 0;
    if (beaming && bq < 0.9) for (const L of s.lifts) if (L.fate === 'in') flying += L.k === 'bull' || L.k === 'space' ? 2 : L.k === 'cow' ? 1 : 0;
    const fill = Math.min(5, Math.round((5 * Math.max(0, W.got - flying)) / d.goal));
    drawUfo(ctx, UX, UY, ufoW, t, mood, fill, beaming);
  }
  // ═════════ 미리 보기 말풍선 ═════════
  if (pv && aimF) {
    const q = pv.rec, parts: string[] = [];
    let bad = false;
    if (q.spotted) (parts.push('🔦 들켜요! 실패'), (bad = true));
    else {
      const cows = q.lifted.filter((l) => l.k === 'cow').length, chick = q.lifted.filter((l) => l.k === 'chick').length;
      const bull = q.lifted.find((l) => l.k === 'bull'), sp = q.lifted.some((l) => l.k === 'space');
      if (cows) parts.push(`🐄×${cows} +${cows * COW_PTS}`);
      if (bull) parts.push(bull.fate === 'bump' ? '🐂 쿵! (한 번 더)' : '🐂 쏙 +2마리');
      if (sp) parts.push('🌌 +2마리 +50');
      if (chick) parts.push(`🐔×${chick} +${chick * CHICK_PTS}`);
      if (q.lifted.some((l) => l.k === 'farmer')) (parts.push('👨‍🌾 −20 ★'), (bad = true));
      if (q.lifted.some((l) => l.k === 'scare')) (parts.push('🌾 퉤 빔+1'), (bad = true));
      if (q.bark) parts.unshift('🐕 멍!');
      if (q.safe.length) parts.push(`🏚️×${q.safe.length} 안 닿음`);
      if (!parts.length) parts.push('텅~ (빔 1번)');
    }
    const txt = parts.join(' · ');
    ctx.font = `900 ${R(0.038)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = Math.min(w - 8, ctx.measureText(txt).width + R(0.05)), cx = PX(aimF[0], aimF[1]), cy = PY(aimF[1]);
    const bx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
    let by = cy + BR * KY * w + R(0.045);
    if (by > R(SY(DEP)) - R(0.01)) by = cy - BR * KY * w - R(0.04);
    ctx.fillStyle = bad ? 'rgba(150,30,40,.92)' : 'rgba(14,40,32,.9)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.028), tw, R(0.056), R(0.028));
    ctx.fill();
    ctx.strokeStyle = bad ? 'rgba(255,170,170,.7)' : 'rgba(140,255,190,.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, bx, by + 1);
  }
  // 첫 판 첫 손짓 안내: 소 셋 위 손가락
  if (s.stage === 0 && W.used === 0 && s.phase === 'aim' && !s.down && s.tries === 0) {
    let cx = 0, cy = 0;
    for (let i = 0; i < 3; i++) {
      const [x, y] = pos(W.mobs[i], W.t);
      (cx += x / 3), (cy += y / 3);
    }
    const pul = 0.5 + 0.5 * Math.sin(t * 0.12);
    ctx.strokeStyle = `rgba(160,255,200,${0.45 + 0.4 * pul})`;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.ellipse(PX(cx, cy), PY(cy), BR * FXW * scl(cy) * w, BR * KY * w, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    emoji(ctx, '👆', PX(cx, cy) + R(0.03), PY(cy) + R(0.06) + Math.abs(Math.sin(t * 0.12)) * R(0.02), R(0.08));
  }
  // 반딧불
  for (let k = 0; k < 9; k++) {
    const a = hsh(k + 900) + Math.sin(t * 0.01 + k) * 0.05, b = 0.1 + hsh(k + 950) * 1.05 + Math.cos(t * 0.013 + k) * 0.03;
    ctx.fillStyle = `rgba(220,255,140,${0.25 + 0.6 * Math.abs(Math.sin(t * 0.05 + k))})`;
    ctx.beginPath();
    ctx.arc(PX(a, b), PY(b) - R(0.05), 1.8, 0, TAU);
    ctx.fill();
  }
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, R(0.75), R(0.35), w / 2, R(0.75), R(0.95));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,6,20,.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, R(0.08), w, R(SY(DEP) - 0.08));
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = PX(e.x, e.y), y = PY(e.y);
    if (e.kind === 'beam') {
      fx.ring(x, y, '#c8ffd8', BR * FXW * w * 1.3, 4), fx.kick(e.v ? 3 : 1.5), fx.blink('#b8ffcf', 0.12);
      fx.burst(x, y - R(0.02), '#d8ffe4', 16, 3, 2);
    }
    if (e.kind === 'wow') say(UX + (UX < w / 2 ? 1 : -1) * ufoW * 0.75, UY + R(0.02), `우와! ×${e.v}`, '#c8ffb0', 22);
    if (e.kind === 'bark') say(x, y - R(0.07), '멍! 멍!', '#ffffff', 18), fx.ring(x, y - R(0.02), '#ffbe78', DR * FXW * w * 1.1, 3), fx.kick(3);
    if (e.kind === 'farmerUp') say(x, y - R(0.12), '이놈들!', '#ffd0c0', 16);
    if (e.kind === 'spitPre') say(UX + (UX < w / 2 ? 1 : -1) * ufoW * 0.7, UY + R(0.02), '엥?', '#fff3a0', 18);
    if (e.kind === 'empty') say(x, y - R(0.06), '텅~', '#e0e8ff', 16);
    if (e.kind === 'spotted') fx.blink('#fff3a0', 0.5), fx.kick(6), say(x, y - R(0.1), '외계인이다!', '#fff3a0', 20), say(UX + (UX < w / 2 ? 1 : -1) * ufoW * 0.7, UY + R(0.02), '헉!', '#ffd0d0', 20);
    if (e.kind === 'nope') say(R(e.x), R(e.y), e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'stage') fx.blink('#dfe8ff', 0.18);
    if (e.kind === 'clear') {
      fx.burst(UX, UY, '#ffe066', 40, 6, 3.2), fx.burst(UX, UY, '#7dffb2', 30, 5, 3), fx.ring(UX, UY, '#ffe066', R(0.3), 6), fx.blink('#e8fff0', 0.22);
      say(UX + (UX < w / 2 ? 1 : -1) * ufoW * 0.8, UY + R(0.03), '납치 완료!', '#ffffff', 20);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = s.t;
  // 소 떼 박자: 걸음마다 ♪
  if (d.herd && s.phase !== 'result' && W.t % BEAT < MOVE && (fx.memo.beat ?? -1) !== Math.floor(W.t / BEAT)) {
    fx.memo.beat = Math.floor(W.t / BEAT);
    const lead = W.mobs.find((m) => m.path === 1 && !m.gone);
    if (lead) {
      const [x, y] = pos(lead, W.t);
      fx.pop(PX(x, y), PY(y) - R(0.09), fx.memo.beat % 2 ? '♪' : '♫', '#ffe9a8', 18);
    }
  }
  // 빔 안의 순간들 (음매 · 쏙 · 퉁 · 쿵 · 퉤)
  if (beaming) {
    for (const L of s.lifts) {
      const key = L.t0 * 50 + L.i, mk = (n: string) => {
        if ((fx.memo[n + key] ?? 0) === 1) return false;
        fx.memo[n + key] = 1;
        return true;
      };
      const x0 = PX(L.x, L.y), y0 = PY(L.y);
      if ((L.k === 'cow' || L.k === 'bull' || L.k === 'space') && L.fate === 'in' && bq > 0.15 && mk('moo') && (L.i % 2 === 0 || s.lifts.length < 3)) say(x0, y0 - R(0.12), L.k === 'bull' ? '음머어!' : L.k === 'space' ? '뿌잉~' : '음매~', '#ffffff', 15);
      if (L.k === 'chick' && bq > 0.2 && mk('ko')) say(x0, y0 - R(0.1), '꼬꼬?!', '#fff6c0', 13);
      if (L.fate === 'in' && bq > 0.88 && mk('in')) fx.burst(UX, UY + ufoW * 0.08, '#c8ffd8', 8, 2.4, 2), mk('inx') && L === s.lifts[0] && say(UX + ufoW * 0.4, UY, '쏙!', '#c8ffd8', 16);
      if (L.fate === 'drop' && bq > 0.75 && mk('thud')) fx.burst(x0, y0, '#d9c9a0', 16, 3, 2.4), fx.kick(5), say(x0, y0 - R(0.07), '퉁!', '#ffe0c8', 22), fx.pop(Math.max(R(0.2), Math.min(w - R(0.2), x0 + R(0.16) * (L.x < 0.5 ? 1 : -1))), y0 - R(0.02), '아이고 엉덩이야', '#ffd0c0', 13);
      if (L.fate === 'bump' && bq > 0.12 && mk('ung')) say(x0, y0 - R(0.12), '끄응…', '#ffe0c8', 15);
      if (L.fate === 'bump' && bq > 0.5 && mk('kung')) fx.burst(x0, y0, '#d9c9a0', 18, 3.2, 2.6), fx.kick(6), say(x0, y0 - R(0.08), '쿵!', '#ffe0c8', 20);
      if (L.fate === 'spit' && bq > 0.55 && mk('spit')) say(UX, UY + R(0.05), '퉤!', '#fff3a0', 20), fx.burst(UX, UY, '#e8c35a', 14, 4, 2);
    }
    if (bq > 0.3 && s.lifts.length) {
      const k = 'goat' + s.lifts[0].t0;
      if ((fx.memo[k] ?? 0) !== 1) (fx.memo[k] = 1), say(PX(s.gx, s.gy), PY(s.gy) - R(0.08), '…', '#e8e8e8', 16);
    }
  }
  ctx.restore();

  // ═════════ HUD ═════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const hb = R(0.082);
  ctx.fillStyle = 'rgba(8,12,34,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.045, 900);
  const ttl = `🛸 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.037, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT} · ${d.name}`, R(0.03) + tw1, hb * 0.55);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림
  if (s.news && s.t - s.news.t < NEWS_T + 20) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    font(0.037, 900);
    const lines = ctx.measureText(tx).width > w - R(0.05) ? splitHalf(tx) : [tx];
    const lh = R(0.046), tw2 = Math.min(w - 8, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22), by2 = hb + R(0.04) - drop;
    ctx.fillStyle = 'rgba(20,28,64,.93)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054) + lh * (lines.length - 1), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(140,255,190,.45)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#eef3ff';
    lines.forEach((l, k) => ctx.fillText(l, w / 2, by2 + 1 + k * lh));
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨 (하늘에)
  {
    const age = t - s.startT;
    if (age < 100 && s.phase === 'aim' && W.used === 0 && !s.down) {
      const a = Math.min(1, age / 8, (100 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, R(SY(DEP) - 0.13));
      ctx.scale(sc, sc);
      font(0.07, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(8,12,34,.8)';
      const big = `${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#e8f0ff';
      ctx.fillText(big, 0, 0);
      font(0.04, 800);
      const sub = `빔 ${d.max}번으로 소 ${d.goal}마리`;
      ctx.strokeText(sub, 0, R(0.058));
      ctx.fillStyle = '#c8ffd8';
      ctx.fillText(sub, 0, R(0.058));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    const ry0 = R(0.6);
    ctx.fillStyle = s.ok ? 'rgba(10,40,30,.72)' : 'rgba(60,14,20,.72)';
    ctx.beginPath();
    ctx.roundRect(R(0.06), ry0, w - R(0.12), R(0.22), R(0.04));
    ctx.fill();
    ctx.textAlign = 'center';
    font(s.ok ? 0.058 : 0.046, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '농장 싹쓸이! 🛸' : `${s.stage + 1}판 납치 완료!`) : s.why, w / 2, ry0 + R(0.06));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.gotStars;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), ry0 + R(0.15));
        if (got && (fx.memo['star' + k] ?? -1) < s.clearT) (fx.memo['star' + k] = s.clearT), fx.burst(w / 2 + (k - 1) * R(0.1), ry0 + R(0.15), '#ffe066', 14, 3, 2.4);
      }
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ −1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, ry0 + R(0.15));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 디오라마 앞면 + 아래 띠 ═════════
  {
    const y0 = PY(DEP), y1 = PY(DEP) + R(0.035);
    const sg = ctx.createLinearGradient(0, y0, 0, y1);
    sg.addColorStop(0, '#4a3322');
    sg.addColorStop(0.5, '#3a2618');
    sg.addColorStop(1, '#22160c');
    ctx.fillStyle = sg;
    ctx.fillRect(0, y0, w, y1 - y0);
    ctx.fillStyle = 'rgba(120,105,90,.6)';
    for (let k = 0; k < 16; k++) (ctx.beginPath(), ctx.ellipse(hsh(k + 700) * w, y0 + (0.3 + 0.5 * hsh(k + 710)) * (y1 - y0), R(0.012 + 0.01 * hsh(k)), R(0.005), 0, 0, TAU), ctx.fill());
    ctx.strokeStyle = '#2f5a34';
    ctx.lineWidth = 2;
    for (let k = 0; k < 24; k++) {
      const gx = R(hsh(k + 800)), gz = R(0.025 + 0.02 * hsh(k + 810)), sw = Math.sin(t * 0.04 + k) * gz * 0.25;
      ctx.beginPath();
      ctx.moveTo(gx, y0 + 2);
      ctx.quadraticCurveTo(gx + sw * 0.3, y0 - gz * 0.6, gx + sw + (k % 2 ? 4 : -4), y0 - gz);
      ctx.stroke();
    }
  }
  const by = PY(DEP) + R(0.035);
  ctx.fillStyle = 'rgba(10,14,36,.95)';
  ctx.fillRect(0, by, w, h - by + 2);
  ctx.fillStyle = 'rgba(140,255,190,.18)';
  ctx.fillRect(0, by, w, 1.5);
  // 빔(배터리 칸) 남은 수 · 소
  {
    const y1 = by + R(0.042);
    ctx.textAlign = 'left';
    font(0.038, 900);
    ctx.fillStyle = '#c8ffd8';
    ctx.fillText('빔', R(0.03), y1);
    const x0 = R(0.03) + ctx.measureText('빔 ').width, left = d.max - W.used;
    const gap = Math.min(R(0.052), (w * 0.6 - x0) / d.max);
    for (let k = 0; k < d.max; k++) {
      const on = k < left, bx = x0 + k * gap, bw = gap * 0.78, bh = R(0.032);
      ctx.fillStyle = on ? (k < d.max - d.par ? '#3b8f63' : '#7dffb2') : 'rgba(255,255,255,.12)';
      ctx.beginPath();
      ctx.roundRect(bx, y1 - bh / 2, bw, bh, 3);
      ctx.fill();
      if (on) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillRect(bx + 2, y1 - bh / 2 + 2, bw - 4, bh * 0.25);
      }
    }
    // par 경계 표시
    const px0 = x0 + (d.max - d.par) * gap - gap * 0.11;
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(px0 - 1, y1 - R(0.026), 2, R(0.052));
    ctx.textAlign = 'right';
    font(0.04, 900);
    ctx.fillStyle = W.got >= d.goal ? '#fff1a8' : '#ffffff';
    ctx.fillText(`🐄 ${Math.min(W.got, 99)}/${d.goal}`, w - R(0.03), y1);
  }
  // 별 목표 셋
  {
    const y2 = by + R(0.1), gw = (w - R(0.06)) / 3;
    const done = s.phase === 'result' && s.ok;
    const goals: [string, boolean | null][] = [
      [`소 ${d.goal}마리`, done ? true : null],
      [`빔 ${d.par}번 이하`, W.used > d.par ? false : done ? true : null],
      ['농부 안 태우기', W.farmer ? false : done ? true : null],
    ];
    goals.forEach(([txt, st], k) => {
      const gx = R(0.03) + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(120,120,120,.25)' : 'rgba(255,255,255,.07)';
      ctx.strokeStyle = st === true ? '#ffd166' : st === false ? 'rgba(200,200,200,.4)' : 'rgba(200,220,255,.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.026), gw - 4, R(0.052), R(0.026));
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      font(0.036, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#eef3ff';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
  }
  // 안내 한 줄
  {
    const y3 = by + R(0.16);
    let tip = '👆 꾹 누르면 빔 원 — 떼면 원 안이 몽땅 둥실!';
    if (s.stage === 0 && W.used === 0) tip = '👆 소 셋을 꾹 — 원 안이 반짝이면 떼요!';
    else if (pv) tip = pv.rec.spotted ? '🔦 빛 밖에서 떼요!' : '떼면 빔! · 손가락을 옮기면 다시 계산해요';
    else if (s.phase === 'result') tip = s.ok ? (W.farmer ? '농부는 원 밖일 때!' : W.used > d.par ? '소가 모일 때를 기다리면 빔 아낌 ★' : '완벽해요!') : '같은 판을 다시 — 동물은 같은 길로 걸어요';
    else if (d.night) tip = '🔦 손전등이 휙휙 — 빛이 지나간 뒤에!';
    else if (d.herd) tip = '🎵 박자마다 한 걸음 — 8자 가운데서 엇갈려요';
    else if (spaceM) tip = '🌌 ✨ 자리에 우주 젖소가 내려앉아요';
    else if (d.roof) tip = '🏚️ 지붕 아래는 안전 — 나올 때를 노려요';
    else if (dogM) tip = '🐕 점선 원에 빔이 닿으면 멍! 소가 튀어요';
    else if (W.mobs.some((m) => m.k === 'bull' && m.hits === 1 && !m.gone)) tip = '🐂 어질어질 멈춘 황소 — 한 번 더!';
    else if (W.mobs.some((m) => m.k === 'scare' && !m.gone)) tip = '🌾 허수아비는 원 밖으로!';
    ctx.textAlign = 'center';
    font(0.036, 800);
    ctx.fillStyle = 'rgba(232,240,255,.92)';
    ctx.fillText(tip, w / 2, y3);
  }
}
function splitHalf(tx: string): string[] {
  const mid = tx.length / 2;
  let best = -1;
  for (let k = 0; k < tx.length; k++) if (tx[k] === ' ' && (best < 0 || Math.abs(k - mid) < Math.abs(best - mid))) best = k;
  return best < 0 ? [tx] : [tx.slice(0, best), tx.slice(best + 1)];
}
