/**
 * 🌧️ 비구름 정원사 (37라운드: 살아 움직이는 세계 — 톡) — 날씨 내리기 × 농사.
 * 세상: 3/4 시점 작은 정원(화단·연못·울타리·벤치의 할머니 고양이). 해가 하늘을 천천히 건너가고(판 시간),
 *   꽃봉오리·잡초는 젖어 있는 동안 저절로 자라고, 목마르면 잎이 축 처졌다가 오래 마르면 시든다. 나비·벌·참새가 오간다.
 * 손짓 하나(톡): 정원 한 곳을 톡 → 하늘의 비구름이 그쪽으로 둥둥 날아가(0.8초, 게임 첫 톡만 0.33초) 넓게 쏴아 비를 뿌린다(0.9초).
 *   비 맞은 봉오리는 쑥쑥 자라 팡! 피고 나비·벌이 날아든다. 다 뿌린 구름은 하늘로 돌아가 다시 모인다(1.2초). 쉬는 동안 톡은 '다음 비'로 꽂힌다.
 *   판(하루)의 첫 비는 밤새 모인 아침 구름이라 더 넓다(첫 손길이 가장 시원하게).
 * 판(7): 해가 지기 전에 꽃 N송이 피우기. 처음 10초는 아무것도 시들지 않는다. 못 채우면 하트 −1, 그 판 다시(1판은 연습 — 하트 그대로).
 *   별(판마다 하나씩 늘어남): 꽃 N송이 피우기 / 판마다 바뀌는 약속(잡초·선인장·번개·꿀벌) / 비 N번 안에.
 * 펼쳐짐(하는 일이 바뀐다): 1 비 → 2 잡초(같이 커서 다 크면 꽃을 덮음 — 비를 비켜 주기) → 3 선인장(비 맞으면 시듦 — 피해 주기)
 *   → 4 먹구름(두 번째 비마다 끝에 '번쩍' — 한가운데 것을 태움: 잡초 위에 떨어뜨리기, 꽃 위면 안 됨) → 5 바람(비 오는 동안 구름이 밀림 —
 *   바람 오는 쪽을 톡) → 6 꿀벌(핀 꽃에서 벌이 가장 가까운 봉오리로 — 다 자라 있으면 팡, 또 벌: 줄줄이 피게 반쯤 자란 줄 끝에 비)
 *   → 7 구름 둘(둘을 번갈아 — 두 곳을 같이 계획).
 * 웃음: 꽃은 피면 헤헤 웃고, 잡초는 다 크면 이를 드러내고 낄낄, 선인장은 선글라스를 끼고 젖으면 으앙. 벤치의 할머니 고양이는
 *   비가 가까이 오면 우산을 퍼뜩 펴며 깜짝, 번개엔 털이 쭈뼛, 꽃이 팡팡 피면 박수.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
// ───────────────────────────── 화면 배치 (가로 0~1 = 화면 폭, 세로 0~A) ─────────────────────────────
/** 정원 바닥(땅 좌표 gx 0~1, gy 0~DEP; gy 0 = 뒤 울타리) → 화면: 세로는 GY0에서 GSY 비율로, 가로는 뒤로 갈수록 살짝 좁게 */
const GY0 = 0.6, GSY = 0.56, DEP = 1.3;
const scl = (gy: number) => 0.84 + 0.12 * (gy / DEP);
export const SX = (gx: number, gy: number) => 0.5 + (gx - 0.5) * scl(gy);
export const SY = (gy: number) => GY0 + gy * GSY;
/** 구름 높이(화면 폭 단위): 구름은 비 내릴 땅 위 ALT만큼 떠 있다 */
const ALT = 0.33;
/** 톡이 닿을 수 있는 땅 (연못·벤치 위에도 비는 온다) · 심는 땅 */
const TX0 = 0.04, TX1 = 0.96, TY0 = 0.05, TY1 = 1.26;
const PX0 = 0.07, PX1 = 0.93, PY0 = 0.1, PY1 = 1.2;
export const POND = { x: 0.15, y: 1.08, rx: 0.13, ry: 0.12 };
export const BENCH = { x: 0.85, y: 1.1 };
/** 꿀벌 판의 벌통 (뒤 왼쪽 귀퉁이) */
export const HIVE = { x: 0.04, y: 0.04 };
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export function toGround(sx: number, sy: number): [number, number] {
  const gy = Math.max(TY0, Math.min(TY1, (sy - GY0) / GSY));
  const gx = Math.max(TX0, Math.min(TX1, 0.5 + (sx - 0.5) / scl(gy)));
  return [gx, gy];
}

// ───────────────────────────── 규칙 수치 ─────────────────────────────
/** 구름: 날아가기 · 비 · 돌아가 모이기 (틱) */
const FLY = 48, FLY0 = 20, RAIN = 54, REST = 72;
/** 비 반지름(땅 단위) — 넓게(기준 22). 판(하루)의 첫 비는 밤새 모인 아침 구름이라 더 넓다 */
export const RR = 0.2, RB = 0.28;
/** 봉오리가 빗속에서 한 틱에 자라는 양(한 번 비 = +0.51) · 잡초(+0.45) · 선인장이 젖는 양(0.53초면 시듦) */
const RG = 0.0095, RW = 0.0084, CW = 1 / 32;
/** 젖어 있는 동안 저절로 자라는 양 · 마르는 양(가득 → 12초) · 처음 10초는 안 시듦 · 마른 채 WILT(판마다 d.wilt, 1판은 안 시듦)면 시듦 */
const NG = 0.02 / 60, DRY = 1 / (12 * 60), GRACE = 600, WILT = 600;
/** 다 큰 잡초가 덮는 거리 · 번개가 끌려가는 거리 */
const COVER = 0.1, LR = 0.1;
/** 저절로 자라는 잡초는 여기까지만 (다 크려면 비가 있어야) */
const WEED_CAP = 0.93;
const WIND_D = 0.2;
/** 꿀벌: 핀 꽃에서 BEE_R 안의 가장 가까운 봉오리로 BEE_T틱 동안 날아가 BEE_G만큼 키운다 (다 크면 팡 → 또 벌) */
const BEE_R = 0.26, BEE_T = 50, BEE_G = 0.3;
const DONE_T = 60, RES_T = 170, RES_OK_T = 190;
const STAR_PTS = [0, 100, 220, 400], CLEAR_PTS = 60, BLOOM_PTS = 10, WIN_PTS = 300;

// ───────────────────────────── 판 정의 ─────────────────────────────
type StarK = 'goal' | 'weed' | 'cactus' | 'par' | 'burn' | 'bee';
export interface StageDef {
  key: string; name: string; news: string; hint: string; spot: string;
  buds: number; weeds: number; cacti: number; goal: number; sun: number; clouds: number; wind: boolean; heavy: boolean; bees: boolean;
  g0: [number, number]; beds: number; bed: number; wilt: number; stars: StarK[];
}
export const STAGES: StageDef[] = [
  { key: 'rain', name: '첫 비', news: '', hint: '꽃밭을 톡! 구름이 가서 비를 뿌려요', spot: '', buds: 12, weeds: 0, cacti: 0, goal: 8, sun: 55, clouds: 1, wind: false, heavy: false, bees: false, g0: [0.5, 0.86], beds: 4, bed: 0.18, wilt: 0, stars: ['goal'] },
  { key: 'weed', name: '잡초', news: '잡초도 비 맞으면 쑥쑥 — 다 크면 꽃을 덮어요', hint: '잡초는 비를 비켜서 톡', spot: '잡초', buds: 12, weeds: 3, cacti: 0, goal: 7, sun: 60, clouds: 1, wind: false, heavy: false, bees: false, g0: [0.35, 0.75], beds: 4, bed: 0.15, wilt: 900, stars: ['goal', 'weed'] },
  { key: 'cactus', name: '선인장', news: '선인장은 물이 싫어요 — 비 맞으면 시들어요', hint: '선인장은 비를 피해서', spot: '선인장', buds: 12, weeds: 2, cacti: 3, goal: 9, sun: 55, clouds: 1, wind: false, heavy: false, bees: false, g0: [0.1, 0.5], beds: 4, bed: 0.15, wilt: 600, stars: ['goal', 'cactus', 'par'] },
  { key: 'thunder', name: '먹구름', news: '먹구름은 비 끝에 번쩍! 한가운데를 태워요', hint: '먹구름은 잡초 위에 톡', spot: '먹구름', buds: 11, weeds: 4, cacti: 0, goal: 8, sun: 60, clouds: 1, wind: false, heavy: true, bees: false, g0: [0.1, 0.5], beds: 4, bed: 0.15, wilt: 600, stars: ['goal', 'burn', 'par'] },
  { key: 'wind', name: '바람', news: '바람이 비구름을 밀어요 — 바람 오는 쪽을 톡', hint: '구름은 화살표 쪽으로 밀려요', spot: '바람', buds: 12, weeds: 2, cacti: 3, goal: 9, sun: 60, clouds: 1, wind: true, heavy: false, bees: false, g0: [0.1, 0.5], beds: 4, bed: 0.15, wilt: 600, stars: ['goal', 'cactus', 'par'] },
  { key: 'bee', name: '꿀벌', news: '꽃이 피면 꿀벌이 옆 봉오리로 붕 — 팡!', hint: '반쯤 자란 봉오리 곁의 꽃부터', spot: '꿀벌', buds: 13, weeds: 3, cacti: 1, goal: 10, sun: 55, clouds: 1, wind: false, heavy: false, bees: true, g0: [0.05, 0.4], beds: 4, bed: 0.15, wilt: 600, stars: ['goal', 'bee', 'par'] },
  { key: 'two', name: '구름 둘', news: '구름이 둘 — 번갈아 날아가요', hint: '두 곳을 같이 계획해요', spot: '구름 둘', buds: 16, weeds: 4, cacti: 2, goal: 12, sun: 55, clouds: 2, wind: false, heavy: false, bees: true, g0: [0.1, 0.5], beds: 5, bed: 0.15, wilt: 600, stars: ['goal', 'weed', 'par'] },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 세계 (시뮬레이션) ─────────────────────────────
export type PK = 'bud' | 'weed' | 'cactus';
/** ok 자라는 중 · bloom 핀 꽃 · dead 시듦/탐 · full 다 큰 잡초 · gone 타 버린 잡초 · rot 젖어 시든 선인장 */
export type PSt = 'ok' | 'bloom' | 'dead' | 'full' | 'gone' | 'rot';
/** g: 봉오리 자람(1이면 핌) · 잡초 크기(1이면 다 큼) · 선인장 젖음(1이면 시듦). w: 물기(0이면 축 처짐). dr: 마른 채 지난 틱 */
export interface Plant { k: PK; x: number; y: number; g: number; w: number; dr: number; st: PSt; col: number; t1: number; hit: number; cov: boolean; why: number }
export type CMode = 'idle' | 'fly' | 'rain' | 'rest';
export interface Cloud { id: number; x: number; y: number; hx: number; hy: number; mode: CMode; mt: number; dur: number; fx: number; fy: number; tx: number; ty: number; n: number; heavy: boolean; q: { x: number; y: number } | null; blooms: number; r: number }
export interface Bed { x: number; y: number; r: number }
export interface Level { P: Plant[]; beds: Bed[]; wx: number; wy: number; par: number; plan: number }
export interface Bee { from: number; to: number; t0: number; t1: number; gen: number }
type Emit = (kind: string, x: number, y: number, text?: string, col?: string, v?: number) => void;
export interface World {
  t: number; st0: number; d: StageDef; P: Plant[]; C: Cloud[]; wx: number; wy: number;
  rains: number; burns: number; weedFull: boolean; cactusBad: boolean; tapped: boolean; pts: number; wowN: number; emit: Emit | null;
  B: Bee[]; beeN: number; chain: number;
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);
const ease = (q: number) => {
  const x = Math.max(0, Math.min(1, q));
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
};
export const homeOf = (d: StageDef, i: number): [number, number] => [d.clouds === 1 ? 0.5 : i === 0 ? 0.27 : 0.73, -0.06];
function mkClouds(d: StageDef): Cloud[] {
  return [...Array(d.clouds).keys()].map((i) => {
    const [hx, hy] = homeOf(d, i);
    return { id: i, x: hx, y: hy, hx, hy, mode: 'idle', mt: 0, dur: 0, fx: hx, fy: hy, tx: hx, ty: hy, n: 0, heavy: false, q: null, blooms: 0, r: RB } as Cloud;
  });
}
export const nextHeavy = (d: StageDef, c: Cloud) => d.heavy && c.n % 2 === 1;
/** 다음 비의 반지름: 그 판 첫 비(아침 구름)만 넓게 */
export const nextR = (c: Cloud) => (c.n === 0 ? RB : RR);
export const blooms = (W: { P: Plant[] }) => W.P.reduce((a, p) => a + (p.k === 'bud' && p.st === 'bloom' ? 1 : 0), 0);
/** 아직 필 수 있는 봉오리 수 (덮인 것도 잡초가 타면 필 수 있다) */
const possible = (W: { P: Plant[] }) => W.P.reduce((a, p) => a + (p.k === 'bud' && p.st === 'ok' ? 1 : 0), 0);

function recover(W: World) {
  for (const p of W.P) if (p.k === 'bud') p.cov = p.st === 'ok' && W.P.some((q) => q.k === 'weed' && q.st === 'full' && dist(p.x, p.y, q.x, q.y) <= COVER);
}
/** 벌이 갈 봉오리: 핀 꽃 둘레 BEE_R 안에서 가장 가까운, 아직 다른 벌이 안 가는 봉오리 */
export function beeTarget(P: Plant[], B: Bee[], from: number): number {
  let best = -1, bd = BEE_R;
  const a = P[from];
  P.forEach((p, j) => {
    if (p.k !== 'bud' || p.st !== 'ok' || p.cov || B.some((b) => b.to === j)) return;
    const dd = dist(a.x, a.y, p.x, p.y);
    if (dd <= bd) (bd = dd), (best = j);
  });
  return best;
}
function bloom(W: World, p: Plant, c: Cloud | null, gen = 0) {
  p.st = 'bloom';
  p.g = 1;
  p.t1 = W.t;
  W.pts += BLOOM_PTS;
  W.emit?.('bloom', p.x, p.y, '', '', p.col);
  if (W.d.bees) {
    const i = W.P.indexOf(p), j = beeTarget(W.P, W.B, i);
    if (j >= 0) W.B.push({ from: i, to: j, t0: W.t, t1: W.t + BEE_T, gen: gen + 1 }), W.emit?.('bee', p.x, p.y, '', '', j);
  }
  if (c) {
    c.blooms++;
    if (c.blooms === 2) W.wowN++;
    if (c.blooms >= 2) W.emit?.('wow', c.x, c.y, '', '', c.blooms);
  }
}
function launch(W: World, c: Cloud, x: number, y: number) {
  c.mode = 'fly';
  c.mt = 0;
  c.dur = W.tapped ? FLY : FLY0;
  W.tapped = true;
  c.fx = c.x;
  c.fy = c.y;
  c.tx = x;
  c.ty = y;
  c.heavy = nextHeavy(W.d, c);
  c.r = nextR(c);
  c.n++;
  c.blooms = 0;
  W.rains++;
  W.emit?.('go', x, y, '', '', c.id);
}
function rainOn(W: World, c: Cloud) {
  for (const p of W.P) {
    if (dist(p.x, p.y, c.x, c.y) > c.r) continue;
    if (p.k === 'bud') {
      if (p.st !== 'ok') continue;
      if (p.w <= 0.05 && p.dr > 60) W.emit?.('revive', p.x, p.y);
      p.w = 1;
      p.dr = 0;
      p.hit = W.t;
      if (!p.cov) {
        p.g += RG;
        if (p.g >= 1) bloom(W, p, c);
      }
    } else if (p.k === 'weed') {
      if (p.st !== 'ok' && p.st !== 'full') continue;
      p.w = 1;
      p.hit = W.t;
      if (p.st === 'ok') {
        p.g += RW;
        if (p.g >= 1) {
          p.g = 1;
          p.st = 'full';
          p.t1 = W.t;
          W.weedFull = true;
          recover(W);
          W.emit?.('weedfull', p.x, p.y);
        }
      }
    } else if (p.st === 'ok') {
      p.hit = W.t;
      p.g += CW;
      if (p.g >= 1) {
        p.g = 1;
        p.st = 'rot';
        p.t1 = W.t;
        W.cactusBad = true;
        W.emit?.('rot', p.x, p.y);
      }
    }
  }
}
/** 번개 맞을 것: 구름 한가운데에서 LR 안의 가장 가까운 살아 있는 것 */
export function strikeTarget(P: Plant[], x: number, y: number, r = LR): number {
  let best = -1, bd = r;
  P.forEach((p, i) => {
    const alive = p.k === 'bud' ? p.st === 'ok' || p.st === 'bloom' : p.k === 'weed' ? p.st === 'ok' || p.st === 'full' : p.st === 'ok';
    if (!alive) return;
    const dd = dist(p.x, p.y, x, y);
    if (dd <= bd) (bd = dd), (best = i);
  });
  return best;
}
function strike(W: World, c: Cloud) {
  const i = strikeTarget(W.P, c.x, c.y);
  if (i < 0) return void W.emit?.('boom', c.x, c.y, '', '', -1);
  const p = W.P[i];
  p.t1 = W.t;
  if (p.k === 'weed') {
    p.st = 'gone';
    W.burns++;
    W.wowN++;
    recover(W);
    W.emit?.('burn', p.x, p.y, '', '', i);
  } else if (p.k === 'bud') {
    const was = p.st;
    p.st = 'dead';
    p.why = 2;
    W.emit?.('zap', p.x, p.y, was === 'bloom' ? '꽃이 탔어요' : '봉오리가 탔어요', '', i);
  } else {
    p.st = 'rot';
    p.why = 2;
    W.cactusBad = true;
    W.emit?.('zap', p.x, p.y, '선인장이 탔어요', '', i);
  }
}
function cloudTick(W: World, c: Cloud) {
  c.mt++;
  if (c.mode === 'fly') {
    const q = ease(c.mt / c.dur);
    c.x = c.fx + (c.tx - c.fx) * q;
    c.y = c.fy + (c.ty - c.fy) * q;
    if (c.mt >= c.dur) {
      c.mode = 'rain';
      c.mt = 0;
      W.emit?.('rain', c.x, c.y, '', '', c.id);
    }
  } else if (c.mode === 'rain') {
    if (W.d.wind) (c.x += W.wx), (c.y += W.wy);
    rainOn(W, c);
    if (c.mt >= RAIN) {
      if (c.heavy) strike(W, c);
      c.mode = 'rest';
      c.mt = 0;
      c.fx = c.x;
      c.fy = c.y;
    }
  } else if (c.mode === 'rest') {
    const q = ease(c.mt / REST);
    c.x = c.fx + (c.hx - c.fx) * q;
    c.y = c.fy + (c.hy - c.fy) * q;
    if (c.mt >= REST) (c.mode = 'idle'), (c.mt = 0), (c.x = c.hx), (c.y = c.hy);
  }
  if (c.mode === 'idle' && c.q) {
    const q = c.q;
    c.q = null;
    launch(W, c, q.x, q.y);
  }
}
function plantTick(W: World, p: Plant, st: number) {
  if (p.k === 'cactus') {
    if (p.st === 'ok' && p.g > 0 && W.t - p.hit > 40) p.g = Math.max(0, p.g - 1 / 900);
    return;
  }
  if (p.st === 'dead' || p.st === 'gone') return;
  p.w = Math.max(0, p.w - DRY);
  if (p.k === 'bud') {
    if (p.st !== 'ok') return;
    if (p.w > 0) {
      p.dr = 0;
      if (!p.cov) {
        p.g += NG;
        if (p.g >= 1) bloom(W, p, null);
      }
    } else if (st > GRACE) {
      p.dr++;
      if (W.d.wilt && p.dr >= W.d.wilt) {
        p.st = 'dead';
        p.why = 1;
        p.t1 = W.t;
        W.emit?.('wither', p.x, p.y);
      }
    }
  } else if (p.st === 'ok' && p.w > 0 && p.g < WEED_CAP) p.g = Math.min(WEED_CAP, p.g + NG);
}
export function tick(W: World) {
  W.t++;
  const st = W.t - W.st0;
  for (const c of W.C) cloudTick(W, c);
  for (const p of W.P) plantTick(W, p, st);
  if (W.B.length) {
    const land = W.B.filter((b) => W.t >= b.t1);
    if (land.length) W.B = W.B.filter((b) => W.t < b.t1);
    for (const b of land) {
      const p = W.P[b.to];
      if (p.st !== 'ok' || p.cov) continue;
      p.g += BEE_G;
      p.w = 1;
      p.dr = 0;
      p.hit = W.t;
      if (p.g >= 1) {
        W.beeN++;
        W.wowN++;
        W.chain = Math.max(W.chain, b.gen);
        W.emit?.('beebloom', p.x, p.y, '', '', b.gen);
        bloom(W, p, null, b.gen);
      } else W.emit?.('beehelp', p.x, p.y);
    }
  }
}
/** 톡: 쉬는 구름이 있으면 바로(둘이면 가까운 쪽), 없으면 가장 먼저 돌아올 구름에 '다음 비'로 꽂는다 */
export function order(W: World, x: number, y: number) {
  const idle = W.C.filter((c) => c.mode === 'idle' && !c.q);
  if (idle.length) {
    idle.sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y));
    return void launch(W, idle[0], x, y);
  }
  const left = (c: Cloud) => (c.mode === 'fly' ? c.dur - c.mt + RAIN + REST : c.mode === 'rain' ? RAIN - c.mt + REST : c.mode === 'rest' ? REST - c.mt : 0);
  const c = [...W.C].sort((a, b) => left(a) - left(b))[0];
  c.q = { x, y };
  W.emit?.('queue', x, y, '', '', c.id);
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const inPond = (x: number, y: number, m: number) => ((x - POND.x) / (POND.rx + m)) ** 2 + ((y - POND.y) / (POND.ry + m)) ** 2 < 1;
const nearBench = (x: number, y: number, m: number) => Math.abs(x - BENCH.x) < 0.13 + m && y > BENCH.y - 0.12 - m;
const okSpot = (x: number, y: number) => x >= PX0 && x <= PX1 && y >= PY0 && y <= PY1 && !inPond(x, y, 0.05) && !nearBench(x, y, 0.03);

function rawLevel(d: StageDef, r: Rng): Level {
  // 화단: 네 귀퉁이와 앞 가운데 자리 중에서 골라 조금씩 흔든다 (보기 좋게 고루)
  const slots: [number, number][] = [[0.26, 0.27], [0.74, 0.27], [0.28, 0.69], [0.72, 0.67], [0.5, 1.06]];
  for (let k = slots.length - 1; k > 0; k--) {
    const j = Math.floor(r() * (k + 1));
    [slots[k], slots[j]] = [slots[j], slots[k]];
  }
  const beds: Bed[] = [];
  for (const [sx, sy] of slots) {
    if (beds.length >= d.beds) break;
    const x = sx + (r() - 0.5) * 0.08, y = sy + (r() - 0.5) * 0.08;
    let rad = d.bed + r() * 0.04;
    for (const b of beds) rad = Math.min(rad, dist(b.x, b.y, x, y) - b.r - 0.025);
    if (rad < 0.12) continue;
    beds.push({ x, y, r: rad });
  }
  const P: Plant[] = [];
  const free = (x: number, y: number, m: number) => okSpot(x, y) && P.every((p) => dist(p.x, p.y, x, y) >= m);
  const mk = (k: PK, x: number, y: number, g: number, w: number): Plant => ({ k, x, y, g, w, dr: 0, st: 'ok', col: Math.floor(r() * 5), t1: -999, hit: -999, cov: false, why: 0 });
  // 봉오리: 화단마다 고루
  for (let i = 0, tries = 0; i < d.buds && tries < 3000; tries++) {
    const b = beds[i % beds.length], a = r() * Math.PI * 2, q = Math.sqrt(r()) * b.r * 0.85;
    const x = b.x + Math.cos(a) * q, y = b.y + Math.sin(a) * q;
    if (!free(x, y, 0.095)) continue;
    P.push(mk('bud', x, y, d.g0[0] + r() * (d.g0[1] - d.g0[0]), 0.45 + r() * 0.5));
    i++;
  }
  // 잡초: 반은 화단 안(봉오리 틈), 반은 화단 가
  for (let i = 0, tries = 0; i < d.weeds && tries < 3000; tries++) {
    const b = beds[Math.floor(r() * beds.length)], a = r() * Math.PI * 2, q = (i % 2 ? 0.75 + r() * 0.5 : Math.sqrt(r()) * 0.8) * b.r;
    const x = b.x + Math.cos(a) * q, y = b.y + Math.sin(a) * q;
    if (!free(x, y, 0.09)) continue;
    P.push(mk('weed', x, y, 0.3 + r() * 0.32, 0.4 + r() * 0.5));
    i++;
  }
  // 선인장 화분: 화단 가장자리 바로 밖
  for (let i = 0, tries = 0; i < d.cacti && tries < 3000; tries++) {
    const b = beds[(i + Math.floor(r() * beds.length)) % beds.length], a = r() * Math.PI * 2, q = b.r + 0.04 + r() * 0.06;
    const x = b.x + Math.cos(a) * q, y = b.y + Math.sin(a) * q;
    if (!free(x, y, 0.1)) continue;
    P.push(mk('cactus', x, y, 0, 0));
    i++;
  }
  const wa = r() < 0.5 ? 0 : Math.PI, wt = (r() - 0.5) * 0.9;
  return { P, beds, wx: d.wind ? (Math.cos(wa + wt) * WIND_D) / RAIN : 0, wy: d.wind ? (Math.sin(wa + wt) * WIND_D * 0.8) / RAIN : 0, par: 0, plan: 0 };
}
export const clonePlants = (P: Plant[]) => P.map((p) => ({ ...p }));
export function newWorld(d: StageDef, L: Level, tapped: boolean): World {
  return { t: 0, st0: 0, d, P: clonePlants(L.P), C: mkClouds(d), wx: L.wx, wy: L.wy, rains: 0, burns: 0, weedFull: false, cactusBad: false, tapped, pts: 0, wowN: 0, emit: null, B: [], beeN: 0, chain: 0 };
}
/** 잘하는 봇과 같은 계획으로 한 판을 끝까지 돌려 본다: 몇 번의 비로 · 몇 틱에 · 별 약속을 지켰나 */
export function rehearse(d: StageDef, L: Level, tapped: boolean): { ok: boolean; rains: number; t: number; burns: number; weedFull: boolean; cactusBad: boolean; beeN: number; chain: number } {
  const W = newWorld(d, L, tapped);
  const end = d.sun * 60;
  while (W.t < end) {
    if (W.t % 3 === 0 && W.C.some((c) => c.mode === 'idle' && !c.q)) {
      const c = W.C.find((q) => q.mode === 'idle' && !q.q)!, b = planTarget(W, c);
      if (b) order(W, b.x, b.y);
    }
    tick(W);
    if (blooms(W) >= d.goal) return { ok: true, rains: W.rains, t: W.t, burns: W.burns, weedFull: W.weedFull, cactusBad: W.cactusBad, beeN: W.beeN, chain: W.chain };
  }
  return { ok: false, rains: W.rains, t: W.t, burns: W.burns, weedFull: W.weedFull, cactusBad: W.cactusBad, beeN: W.beeN, chain: W.chain };
}
const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const key = `${seed}:${si}`;
  const hit = levelCache.get(key);
  if (hit) return hit;
  const d = STAGES[si];
  let best: Level | null = null, bestT = 1e9;
  for (let tries = 0; tries < 30; tries++) {
    const r = mulberry32((seed * 2654435761 + si * 40503 + tries * 977) >>> 0);
    const L = rawLevel(d, r);
    // 첫 판: 맨 앞 봉오리 하나는 손대기 전에 저절로 팡 (정원이 살아 있다는 첫 신호)
    if (si === 0) {
      const front = L.P.filter((p) => p.k === 'bud').sort((a, b) => b.y - a.y)[0];
      if (front) (front.g = 0.965), (front.w = 1);
    }
    if (L.P.filter((p) => p.k === 'bud').length < d.buds || L.P.length < d.buds + d.weeds + d.cacti) continue;
    const rh = rehearse(d, L, si > 0);
    const starsOk = rh.ok && (!d.stars.includes('weed') || !rh.weedFull) && (!d.stars.includes('cactus') || !rh.cactusBad) && (!d.stars.includes('burn') || rh.burns >= 2) && (!d.stars.includes('bee') || rh.chain >= 3);
    // 너무 쉬운 판(봉오리가 한 비에 몰림)도 거른다: 계획대로 해도 비가 셋 이상
    if (starsOk && rh.t < d.sun * 60 * 0.6 && rh.rains >= (si === 0 ? 2 : 3)) {
      L.plan = rh.rains;
      L.par = rh.rains + 1;
      best = L;
      break;
    }
    if (rh.ok && rh.t < bestT) (bestT = rh.t), (best = L), (L.plan = rh.rains), (L.par = rh.rains + 1);
  }
  if (!best) {
    best = rawLevel(d, mulberry32(seed + si));
    best.plan = 6;
    best.par = 7;
  }
  levelCache.set(key, best);
  if (levelCache.size > 3000) levelCache.clear();
  return best;
}

// ───────────────────────────── 계획 (잘하는 봇 · 판 만들기 · 첫 손가락 안내) ─────────────────────────────
interface Pred { g: number; w: number; st: PSt; cov: boolean; dr: number }
/** 비가 지나는 길(바람에 밀림)에서 이 자리가 비를 맞는 틱 수 */
function wetTicks(x: number, y: number, wx: number, wy: number, n: number, px: number, py: number, r: number): number {
  if (!wx && !wy) return dist(x, y, px, py) <= r ? n : 0;
  let k = 0;
  const K = 8;
  for (let j = 0; j < K; j++) {
    const q = ((j + 0.5) / K) * n;
    if (dist(x + wx * q, y + wy * q, px, py) <= r) k++;
  }
  return (k / K) * n;
}
/** 구름 c가 지금 떠나면 닿을 때쯤 정원의 모습 (다른 구름이 뿌리고 있는 비까지 셈) */
function forecast(W: World, c: Cloud, flyT: number): Pred[] {
  const pr: Pred[] = W.P.map((p) => ({ g: p.g, w: p.w, st: p.st, cov: p.cov, dr: p.dr }));
  for (const o of W.C) {
    if (o === c || (o.mode !== 'fly' && o.mode !== 'rain')) continue;
    const x0 = o.mode === 'fly' ? o.tx : o.x, y0 = o.mode === 'fly' ? o.ty : o.y, n = o.mode === 'fly' ? RAIN : RAIN - o.mt;
    W.P.forEach((p, i) => {
      const k = wetTicks(x0, y0, W.d.wind ? W.wx : 0, W.d.wind ? W.wy : 0, n, p.x, p.y, o.r), q = pr[i];
      if (k <= 0) return;
      q.w = 1;
      q.dr = 0;
      if (p.k === 'bud' && q.st === 'ok' && !q.cov) (q.g += RG * k), q.g >= 1 && (q.st = 'bloom');
      if (p.k === 'weed' && q.st === 'ok') (q.g += RW * k), q.g >= 1 && (q.st = 'full');
      if (p.k === 'cactus' && q.st === 'ok') (q.g += CW * k), q.g >= 1 && (q.st = 'rot');
    });
  }
  for (const b of W.B) {
    const q = pr[b.to];
    if (q.st === 'ok' && !q.cov) (q.g += BEE_G), (q.w = 1), (q.dr = 0), q.g >= 1 && (q.st = 'bloom');
  }
  W.P.forEach((p, i) => {
    const q = pr[i];
    if (p.k === 'cactus' || q.st !== 'ok') return;
    const moist = Math.min(flyT, q.w / DRY);
    if (!q.cov) q.g = Math.min(p.k === 'weed' ? WEED_CAP : 1, q.g + NG * moist);
    if (q.w - DRY * flyT <= 0) q.dr += Math.max(0, flyT - moist);
    q.w = Math.max(0, q.w - DRY * flyT);
  });
  return pr;
}
const budsNear = (P: Plant[], pr: Pred[], x: number, y: number) => P.reduce((a, p, i) => a + (p.k === 'bud' && pr[i].st === 'ok' && dist(p.x, p.y, x, y) <= COVER ? 1 : 0), 0);
/** 톡 한 자리의 값: 필 꽃·자람·살린 봉오리 − 키운 잡초·젖은 선인장 ± 번개 (손가락이 조금 어긋나도 괜찮게 여유를 두고 셈) */
function valueAt(W: World, pr: Pred[], x: number, y: number, heavy: boolean, rr: number): number {
  const d = W.d, st = W.t - W.st0, P = W.P, wx = d.wind ? W.wx : 0, wy = d.wind ? W.wy : 0;
  const left = d.sun * 60 - st - FLY - RAIN;
  const starW = d.stars.includes('weed') && !W.weedFull, starC = d.stars.includes('cactus') && !W.cactusBad, starB = d.stars.includes('burn');
  let v = 0, zap = -1;
  if (heavy) {
    const ex = x + wx * RAIN, ey = y + wy * RAIN;
    const near: { i: number; dd: number }[] = [];
    P.forEach((p, i) => {
      const q = pr[i], alive = p.k === 'bud' ? q.st === 'ok' || q.st === 'bloom' : p.k === 'weed' ? q.st === 'ok' || q.st === 'full' : q.st === 'ok';
      const dd = dist(p.x, p.y, ex, ey);
      if (alive && dd <= LR + 0.05) near.push({ i, dd });
    });
    near.sort((a, b) => a.dd - b.dd);
    if (near.length) {
      const f = near[0], fp = P[f.i];
      const risky = near.find((n) => P[n.i].k !== 'weed' && n.dd < f.dd + 0.07);
      if (fp.k === 'weed' && !risky && f.dd <= LR - 0.03) {
        zap = f.i;
        v += (starB && W.burns < 2 ? 30 : 7) + 6 * budsNear(P, pr, fp.x, fp.y);
      } else if (risky || fp.k !== 'weed') {
        const rp = risky ? P[risky.i] : fp, rq = pr[risky ? risky.i : f.i];
        v -= rp.k === 'cactus' ? 40 : rq.st === 'bloom' ? 26 : 16;
      }
    }
  }
  const gg: number[] = pr.map((q) => q.g), newly: number[] = [];
  P.forEach((p, i) => {
    const q = pr[i];
    if (p.k === 'bud') {
      if (q.st !== 'ok') return;
      const n = wetTicks(x, y, wx, wy, RAIN, p.x, p.y, rr - 0.03);
      if (n <= 0) return;
      if (q.cov) return void (v += zap >= 0 && dist(P[zap].x, P[zap].y, p.x, p.y) <= COVER ? 2 : 0.2);
      const ng = (gg[i] = q.g + RG * n);
      if (ng >= 1) (v += 10), newly.push(i);
      else if (ng + 0.22 >= 1 && left > (1 - ng) / NG) v += 7;
      else v += 5 * (ng - q.g);
      if (st > GRACE - 240 && q.w < 0.25) v += 1.5 + 6 * (q.dr / WILT);
    } else if (p.k === 'weed') {
      if (q.st !== 'ok' || i === zap) return;
      const n = wetTicks(x, y, wx, wy, RAIN, p.x, p.y, rr + 0.045);
      if (n <= 0) return;
      const ng = q.g + RW * n;
      if (ng >= 1) v -= 7 + 5 * budsNear(P, pr, p.x, p.y) + (starW ? 30 : 0);
      else v -= 3 * (ng - q.g) * (1 + q.g);
    } else {
      if (q.st !== 'ok') return;
      const n = wetTicks(x, y, wx, wy, RAIN, p.x, p.y, rr + 0.05);
      if (n <= 0) return;
      v -= q.g + CW * n >= 1 ? (starC ? 45 : 22) : 2;
    }
  });
  // 꿀벌 판: 새로 핀 꽃마다 벌이 가장 가까운 봉오리로 — 그게 피면 또 벌 (연쇄까지 셈)
  if (d.bees && newly.length) {
    const taken = new Set(W.B.map((b) => b.to)), done = new Set(newly), starBee = d.stars.includes('bee') && W.chain < 3, gen = newly.map(() => 0);
    let deep = 0;
    for (let k = 0; k < newly.length && k < 16; k++) {
      const a = P[newly[k]];
      let j = -1, bd = BEE_R;
      P.forEach((p, m) => {
        if (p.k !== 'bud' || pr[m].st !== 'ok' || pr[m].cov || done.has(m) || taken.has(m)) return;
        const dd = dist(a.x, a.y, p.x, p.y);
        if (dd <= bd) (bd = dd), (j = m);
      });
      if (j < 0) continue;
      taken.add(j);
      gg[j] += BEE_G;
      if (gg[j] >= 1) done.add(j), newly.push(j), gen.push(gen[k] + 1), (deep = Math.max(deep, gen[k] + 1)), (v += 10);
      else v += BEE_G * 4;
    }
    if (starBee) v += deep >= 3 ? 30 : deep * 4;
  }
  return v;
}
const CANDS: [number, number][] = [];
for (let gy = 0.1; gy <= 1.221; gy += 0.05) for (let gx = 0.07; gx <= 0.931; gx += 0.05) CANDS.push([gx, gy]);
/** 쉬는 구름 c를 보낼 가장 좋은 자리 (값이 너무 작으면 null = 기다림) */
export function planTarget(W: World, c: Cloud): { x: number; y: number; v: number } | null {
  const flyT = W.tapped ? FLY : FLY0, pr = forecast(W, c, flyT), heavy = nextHeavy(W.d, c), rr = nextR(c);
  let best: { x: number; y: number; v: number } | null = null;
  const tryAt = (x: number, y: number) => {
    if (x < TX0 || x > TX1 || y < TY0 || y > TY1) return;
    const v = valueAt(W, pr, x, y, heavy, rr);
    if (!best || v > best.v + 1e-9) best = { x, y, v };
  };
  for (const [x, y] of CANDS) tryAt(x, y);
  for (const p of W.P) if (p.k !== 'cactus') tryAt(p.x - (W.d.wind ? W.wx * RAIN * 0.5 : 0), p.y - (W.d.wind ? W.wy * RAIN * 0.5 : 0));
  const b = best as { x: number; y: number; v: number } | null;
  return b && b.v >= 1.2 ? b : null;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface RainState extends World {
  rng: Rng; seed: number; stage: number; phase: 'play' | 'done' | 'result'; pt: number; L: Level;
  hearts: number; stars: number; got: number; starOk: boolean[]; ok: boolean; why: string; won: boolean; dead: boolean; again: boolean; tries: number;
  seen: Set<string>; events: Ev[]; banner: { head: string; sub: string; t: number } | null; spot: { x: number; y: number; r: number; label: string; t: number; sky: boolean; cloud: number } | null;
  down: boolean; firstTap: number; lastTap: number; cat: { m: string; t: number }; bolt: { t: number; x: number; y: number; tx: number; ty: number } | null;
  rainbow: { t: number; x: number; y: number } | null; sunLeft: number; doneT: number;
}
const see = (s: RainState, key: string) => s.seen.add(key);
const setCat = (s: RainState, m: string) => (s.cat = { m, t: s.t });

function newStage(s: RainState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.d = d;
  s.P = clonePlants(s.L.P);
  s.C = mkClouds(d);
  s.wx = s.L.wx;
  s.wy = s.L.wy;
  s.rains = 0;
  s.burns = 0;
  s.B = [];
  s.beeN = 0;
  s.chain = 0;
  s.weedFull = false;
  s.cactusBad = false;
  s.st0 = s.t;
  s.phase = 'play';
  s.pt = 0;
  s.got = 0;
  s.starOk = d.stars.map(() => false);
  s.bolt = null;
  s.rainbow = null;
  if (s.cat.m !== 'clap' && s.cat.m !== 'sigh') s.cat = { m: 'knit', t: s.t };
  see(s, d.key);
  if (s.again) s.banner = { head: `다시! ${s.stage + 1}판 · ${d.name}`, sub: d.hint, t: s.t };
  else s.banner = s.stage === 0 ? null : { head: `${s.stage + 1}판 · ${d.name}`, sub: `NEW  ${d.news}`, t: s.t };
  s.spot = null;
  if (!s.again && s.stage > 0) {
    const find = (k: PK) => s.P.find((p) => p.k === k);
    if (d.key === 'weed' || d.key === 'cactus') {
      const p = find(d.key === 'weed' ? 'weed' : 'cactus');
      if (p) s.spot = { x: p.x, y: p.y, r: 0.09, label: d.spot, t: s.t, sky: false, cloud: -1 };
    }
    if (d.key === 'thunder' || d.key === 'two') s.spot = { x: 0, y: 0, r: 0.16, label: d.spot, t: s.t, sky: true, cloud: d.clouds - 1 };
    if (d.key === 'wind') s.spot = { x: 0.5, y: -0.16, r: 0.16, label: d.spot, t: s.t, sky: true, cloud: 0 };
    if (d.key === 'bee') s.spot = { x: HIVE.x, y: HIVE.y, r: 0.1, label: d.spot, t: s.t, sky: false, cloud: -1 };
  }
  s.again = false;
}
function finish(s: RainState) {
  const d = s.d;
  s.phase = 'result';
  s.pt = 0;
  s.ok = true;
  s.starOk = d.stars.map((k) => (k === 'goal' ? true : k === 'weed' ? !s.weedFull : k === 'cactus' ? !s.cactusBad : k === 'par' ? s.rains <= s.L.par : k === 'bee' ? s.chain >= 3 : s.burns >= 2));
  s.got = s.starOk.filter(Boolean).length;
  s.stars += s.got;
  s.sunLeft = Math.max(0, Math.round((d.sun * 60 - (s.doneT - s.st0)) / 60));
  s.pts += Math.round((CLEAR_PTS + STAR_PTS[s.got] + s.sunLeft * 3) * (1 + 0.15 * s.stage));
  if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS + s.hearts * 60);
  s.events.push({ t: s.t, kind: 'clear', x: 0.5, y: 0.5, v: s.got });
  setCat(s, 'clap');
}
function fail(s: RainState, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = false;
  s.why = why;
  // 1판은 무엇이든 안전하다: 해가 져도 하트는 그대로, 다음 날 아침 다시
  if (s.stage > 0) s.hearts--;
  s.tries++;
  s.doneT = s.t;
  s.events.push({ t: s.t, kind: 'fail', x: 0.5, y: 0.5, text: why });
  setCat(s, 'sigh');
}

export const raingarden: GameDef<RainState> & { wows(s: RainState): number } = {
  id: 'raingarden',
  name: '🌧️ 비구름 정원사',
  genes: ['weather', 'farm'],
  twist: '정원 한 곳을 톡 하면 하늘의 비구름이 둥둥 날아가 넓게 비를 뿌리는데, 비는 꽃만 골라 주지 않아서 — 잡초도 같이 크고 선인장은 시들고 먹구름은 끝에 번개를 떨군다: 어디에 비를 줄지가 곧 정원 가꾸기',
  rules: ['정원을 톡 → 구름이 날아가 쏴아 비! 비 맞은 봉오리가 쑥쑥 자라 팡 피어요.', '해가 지기 전에 꽃을 피워요 — 잡초·선인장은 비를 피해서.'],
  controls: 'touch',
  hint: '정원을 톡! / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '햇살 비치는 작은 뒤뜰 정원 — 비구름을 보내 꽃을 피우는 날씨 신',
    mood: '나무 울타리 너머 둥근 언덕과 풍차, 해가 아침에서 저녁으로 하늘을 건너간다. 흙 화단에 살랑이는 봉오리, 연못의 연잎과 개구리, 벤치에서 뜨개질하는 할머니 고양이. 톡 하면 하얀 비구름이 둥실 날아가 쏴아 비를 뿌리고, 젖은 흙이 짙어지며 봉오리가 팡팡 터져 피고 무지개가 걸린다. 나비·벌이 꽃으로 날아들고 참새가 울타리에서 폴짝.',
    palette: { bg: '#bfe6ff', ink: '#2e3a22', muted: '#7a8a68', accent: '#4aa8ff', hot: '#ff6a8a', soft: '#fff6e0' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.P.reduce((a, p) => a + ((p.k === 'bud' && (p.st === 'ok' || p.st === 'bloom')) || (p.k === 'cactus' && p.st === 'ok') ? 1 : 0), 0),
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: s.starOk.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, st0: 0, stage: 0, phase: 'play', pt: 0,
      hearts: 3, stars: 0, got: 0, starOk: [], ok: false, why: '', won: false, dead: false, again: false, tries: 0,
      seen: new Set<string>(), events: [], banner: null, spot: null, down: false, firstTap: -1, lastTap: -99,
      cat: { m: 'knit', t: 0 }, bolt: null, rainbow: null, sunLeft: 0, doneT: 0,
      rains: 0, burns: 0, weedFull: false, cactusBad: false, tapped: false, pts: 0, wowN: 0, P: [], C: [], wx: 0, wy: 0, B: [], beeN: 0, chain: 0,
    } as unknown as RainState;
    s.emit = (kind, x, y, text, col, v) => {
      s.events.push({ t: s.t, kind, x, y, text, col, v });
      if (kind === 'wow' && (v ?? 0) >= 2) (s.rainbow = { t: s.t, x, y }), setCat(s, 'clap');
      if (kind === 'burn' || kind === 'zap' || kind === 'boom') (s.bolt = { t: s.t, x, y, tx: x, ty: y }), setCat(s, 'fright');
      if (kind === 'rain' && dist(x, y, BENCH.x, BENCH.y) < RR + 0.2) setCat(s, 'umbrella');
      if (kind === 'rot' || kind === 'weedfull' || kind === 'wither') setCat(s, 'oops');
    };
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    s.pt++;
    if (s.events.length > 80 || (s.events.length && s.t - s.events[0].t > 300)) s.events = s.events.filter((e) => s.t - e.t < 300);
    if (s.phase === 'result') {
      s.t++;
      if (s.pt >= (s.ok ? RES_OK_T : RES_T) || (press && s.pt > 45)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'play' && press) {
      const [gx, gy] = toGround(p!.x, p!.y * A);
      if (s.firstTap < 0) s.firstTap = s.t;
      s.lastTap = s.t;
      order(s, gx, gy);
    }
    tick(s);
    if (s.cat.m !== 'knit' && s.t - s.cat.t > (s.cat.m === 'umbrella' ? 150 : 110) && !(s.cat.m === 'umbrella' && s.C.some((c) => c.mode === 'rain' && dist(c.x, c.y, BENCH.x, BENCH.y) < RR + 0.2))) s.cat = { m: 'knit', t: s.t };
    if (s.phase === 'done') {
      if (s.pt >= DONE_T) finish(s);
      return;
    }
    const d = s.d, n = blooms(s);
    if (n >= d.goal) (s.phase = 'done'), (s.pt = 0), (s.doneT = s.t);
    else if (s.t - s.st0 >= d.sun * 60) fail(s, '해가 졌어요');
    else if (n + possible(s) < d.goal) fail(s, '꽃이 모자라요');
  },
  over: (s) => s.dead,
  score: (s) => Math.round(s.pts),
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
export const atGround = (gx: number, gy: number): Input => ({ tap: false, dir: 0, pointer: { x: SX(gx, gy), y: SY(gy) / A } });
const readyCloud = (s: RainState) => (s.phase === 'play' && !s.down && s.t - s.lastTap >= 6 ? s.C.find((c) => c.mode === 'idle' && !c.q) ?? null : null);
const skip = (s: RainState): Input => (s.phase === 'result' && s.pt > 50 && !s.down ? { tap: false, dir: 0, pointer: { x: 0.5, y: 0.5 } } : NO);
export const raingardenSmart: Bot<RainState> = {
  name: '정원사',
  act(s) {
    const c = readyCloud(s);
    if (!c) return skip(s);
    const b = planTarget(s, c);
    return b ? atGround(b.x, b.y) : NO;
  },
};
/** 버릇 봇 1: 늘 가장 목마른(물기가 가장 적은) 봉오리에 비 */
export const raingardenHabit: Bot<RainState> = {
  name: '버릇: 가장 시든 꽃',
  act(s) {
    const c = readyCloud(s);
    if (!c) return skip(s);
    let best: Plant | null = null;
    for (const p of s.P) if (p.k === 'bud' && p.st === 'ok' && (!best || p.w < best.w - 1e-9 || (Math.abs(p.w - best.w) < 1e-9 && p.dr > best.dr))) best = p;
    return best ? atGround(best.x, best.y) : atGround(0.5, 0.66);
  },
};
/** 버릇 봇 2: 늘 정원 한가운데에 비 */
export const raingardenHabit2: Bot<RainState> = {
  name: '버릇: 정원 가운데',
  act(s) {
    return readyCloud(s) ? atGround(0.5, 0.66) : skip(s);
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 데나 톡 */
export const raingardenRandom: Bot<RainState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 10 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 120);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.2) m.p = { x: rng(), y: rng() };
    else {
      const gy = PY0 + rng() * (PY1 - PY0), gx = PX0 + rng() * (PX1 - PX0);
      m.p = { x: SX(gx, gy), y: SY(gy) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp01 = (q: number) => Math.max(0, Math.min(1, q));
const outBack = (q: number) => {
  const x = clamp01(q) - 1;
  return Math.max(0.02, 1 + 2.7 * x * x * x + 1.7 * x * x);
};
function ell(ctx: C2, x: number, y: number, rx: number, ry: number, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
}
function rr(ctx: C2, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
}
function lin(ctx: C2, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
function radg(ctx: C2, x: number, y: number, r0: number, r1: number, stops: [number, string][]) {
  const g = ctx.createRadialGradient(x, y, Math.max(0, r0), x, y, Math.max(0.1, r1));
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}
const hex = (c: string) => (c[0] === '#' ? [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)] : c.slice(c.indexOf('(') + 1, -1).split(',').map(Number));
function mix(a: string, b: string, q: number) {
  const x = hex(a), y = hex(b), k = clamp01(q);
  return `rgb(${Math.round(x[0] + (y[0] - x[0]) * k)},${Math.round(x[1] + (y[1] - x[1]) * k)},${Math.round(x[2] + (y[2] - x[2]) * k)})`;
}
/** 시간 띠를 따라 색 고르기 */
function band(q: number, keys: [number, string][]) {
  for (let k = 1; k < keys.length; k++) if (q <= keys[k][0]) return mix(keys[k - 1][1], keys[k][1], (q - keys[k - 1][0]) / (keys[k][0] - keys[k - 1][0]));
  return keys[keys.length - 1][1];
}
function starPath(ctx: C2, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, q = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  ctx.closePath();
}
function drawHeart(ctx: C2, x: number, y: number, r: number, on: boolean) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  ctx.fillStyle = on ? '#ff4d6a' : 'rgba(120,80,60,.25)';
  ctx.fill();
  ctx.strokeStyle = on ? '#a8203a' : 'rgba(120,80,60,.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (on) {
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ell(ctx, x - r * 0.4, y - r * 0.3, r * 0.22, r * 0.15, -0.6);
    ctx.fill();
  }
}
/** 꽃 색: 꽃잎 · 꽃잎 그늘 · 가운데 */
const FLOWER: [string, string, string][] = [
  ['#ff9cc8', '#e2508f', '#ffd84a'],
  ['#ffe066', '#e8a01a', '#ff8a3a'],
  ['#c3a2ff', '#7f56d9', '#ffe066'],
  ['#ff8080', '#d63f4a', '#fff2a8'],
  ['#ffffff', '#c9d3ea', '#ffc933'],
];
const NUM = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열', '열한', '열두'];
const GOLD = '#ffc93a';

/** 해가 얼마나 건너갔나 (0 아침 · 1 해 질 녘) */
function sunQ(s: RainState) {
  const end = s.phase === 'play' ? s.t : s.doneT;
  return clamp01((end - s.st0) / (s.d.sun * 60));
}
/** 바람 화살 방향 (화면) */
const windDir = (s: RainState): [number, number] => {
  const m = Math.hypot(s.wx, s.wy) || 1;
  return [s.wx / m, s.wy / m];
};

interface Mark { x: number; y: number; r: number; t: number; k: number }
const MARKS = new WeakMap<object, Mark[]>();
/** 화면 연출만: 지난 사건을 파티클·글자로 (시뮬레이션은 건드리지 않는다) */
function feel(s: RainState, w: number) {
  const fx = juice(s), last = fx.memo.evT ?? -1;
  const X = (gx: number, gy: number) => SX(gx, gy) * w, Y = (gy: number) => SY(gy) * w;
  let marks = MARKS.get(s);
  if (!marks) MARKS.set(s, (marks = []));
  for (const e of s.events) {
    if (e.t <= last) continue;
    const x = X(e.x, e.y), y = Y(e.y);
    if (e.kind === 'rain') {
      fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x - w * 0.16)), y - w * ALT + w * 0.02, '쏴아—', '#e8f6ff', Math.max(16, w * 0.055));
      fx.kick(2);
    } else if (e.kind === 'bloom') {
      const c = FLOWER[(e.v ?? 0) % FLOWER.length];
      fx.burst(x, y - w * 0.07, c[0], 14, 2.6, 2.6);
      fx.burst(x, y - w * 0.07, c[2], 6, 1.6, 2);
      fx.ring(x, y - w * 0.07, c[0], w * 0.07, 3);
      fx.pop(x, y - w * 0.12, '팡!', '#fff6c0', Math.max(15, w * 0.05));
    } else if (e.kind === 'wow') {
      const n = e.v ?? 2;
      fx.pop(x, y - w * ALT - w * 0.11, n >= 4 ? '팡팡팡팡!' : n >= 3 ? '팡팡팡!' : '팡팡!', '#ffe14d', Math.max(18, w * (0.06 + 0.01 * n)));
      fx.kick(3 + n);
      if (n === 2) fx.blink('#fff8e0', 0.18);
    } else if (e.kind === 'burn') {
      fx.blink('#ffffff', 0.5);
      fx.kick(10);
      fx.burst(x, y - w * 0.03, '#ffd23a', 22, 4, 3);
      fx.burst(x, y - w * 0.03, '#5a4a3a', 14, 2.5, 3.4);
      fx.ring(x, y, '#fff2a0', w * 0.14, 5);
      fx.pop(x, y - w * 0.13, '번쩍! 잡초 태움', '#fff2a0', Math.max(16, w * 0.052));
      marks.push({ x: e.x, y: e.y, r: 0.07, t: e.t, k: 1 });
    } else if (e.kind === 'zap' || e.kind === 'boom') {
      fx.blink('#ffffff', 0.6);
      fx.kick(9);
      fx.burst(x, y - w * 0.02, '#ffd23a', 16, 3.4, 2.6);
      fx.ring(x, y, '#fff2a0', w * 0.12, 4);
      fx.pop(x, y - w * 0.12, e.kind === 'zap' ? `번쩍! ${e.text ?? ''}` : '쾅! 번쩍!', e.kind === 'zap' ? '#ffb0a0' : '#fff2a0', Math.max(15, w * 0.05));
      marks.push({ x: e.x, y: e.y, r: 0.06, t: e.t, k: 1 });
    } else if (e.kind === 'weedfull') {
      fx.burst(x, y - w * 0.04, '#5aa83a', 12, 2.4, 2.6);
      fx.pop(x, y - w * 0.11, '낄낄 — 잡초가 다 컸다!', '#d8ffb0', Math.max(13, w * 0.042));
      fx.kick(3);
    } else if (e.kind === 'rot') {
      fx.burst(x, y - w * 0.04, '#9adcff', 12, 2.2, 2.4);
      fx.pop(x, y - w * 0.12, '으앙 젖었어!', '#ffd0c0', Math.max(14, w * 0.045));
      fx.kick(4);
    } else if (e.kind === 'wither') {
      fx.burst(x, y - w * 0.04, '#b08a5a', 8, 1.4, 2.2);
      fx.pop(x, y - w * 0.1, '시들었어요…', '#e8dcc8', Math.max(13, w * 0.04));
    } else if (e.kind === 'beebloom') {
      const n = e.v ?? 1;
      fx.pop(x, y - w * 0.17, n >= 2 ? `줄줄이 ×${n}!` : '꿀벌 덕분에 팡!', n >= 2 ? '#ffe14d' : '#fff2b0', Math.max(14, w * (0.045 + 0.008 * n)));
      fx.burst(x, y - w * 0.1, '#ffd23a', 10 + 4 * n, 2.4, 2.2);
      if (n >= 2) fx.kick(2 + n);
    } else if (e.kind === 'bee') {
      fx.ring(x, y - w * 0.1, 'rgba(255,220,90,.9)', w * 0.05, 2);
    } else if (e.kind === 'revive') {
      fx.pop(x, y - w * 0.1, '생생!', '#c8ffb0', Math.max(13, w * 0.04));
    } else if (e.kind === 'go' || e.kind === 'queue') {
      fx.ring(x, y, e.kind === 'go' ? 'rgba(255,255,255,.9)' : 'rgba(200,230,255,.9)', w * 0.09, 3);
      if (e.kind === 'queue') fx.pop(x, y - w * 0.05, '다음 비', '#e0f0ff', Math.max(12, w * 0.036));
    } else if (e.kind === 'clear') {
      for (let k = 0; k < 5; k++) fx.burst(w * (0.15 + k * 0.17), w * 0.45, FLOWER[k][0], 14, 4, 3);
      fx.kick(5);
    } else if (e.kind === 'fail') {
      fx.kick(5);
    }
  }
  fx.memo.evT = s.t;
  // 젖은 땅 자국: 비가 지나간 자리를 몇 초 동안 짙게
  if (s.t % 6 === 0 && fx.memo.markT !== s.t) {
    fx.memo.markT = s.t;
    for (const c of s.C) if (c.mode === 'rain') marks.push({ x: c.x, y: c.y, r: c.r, t: s.t, k: 0 });
  }
  while (marks.length && (s.t - marks[0].t > 420 || marks[0].t > s.t)) marks.shift();
  if (marks.length > 80) marks.splice(0, marks.length - 80);
  return marks;
}

export function drawAll(ctx: C2, s: RainState, w: number, h: number, _th: Theme) {
  const fx = juice(s), t = s.t, d = s.d;
  const X = (gx: number, gy: number) => SX(gx, gy) * w, Y = (gy: number) => SY(gy) * w, U = (v: number) => v * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, U(sz))}px system-ui, sans-serif`);
  const marks = feel(s, w), q = sunQ(s), dusk = s.phase === 'result' && !s.ok ? clamp01(s.pt / 40) : 0;
  const wind = d.wind ? windDir(s) : ([0, 0] as [number, number]);
  ctx.save();
  fx.begin(ctx);
  // ═════════ 하늘 · 해 ═════════
  const top = band(q, [[0, '#8ed4ff'], [0.2, '#5ec0ff'], [0.65, '#55b4ff'], [0.85, '#8a9cff'], [1, '#7a6ad8']]);
  const bot = band(q, [[0, '#fff0c8'], [0.2, '#dff4ff'], [0.65, '#e6f6ff'], [0.85, '#ffc890'], [1, '#ff9a78']]);
  ctx.fillStyle = lin(ctx, 0, 0, 0, U(0.62), [[0, mix(top, '#3a3a7a', dusk * 0.6)], [1, mix(bot, '#c07890', dusk * 0.5)]]);
  ctx.fillRect(-12, -12, w + 24, U(0.64) + 12);
  {
    const sx = U(0.07 + 0.86 * q), sy = U(0.5 - 0.33 * Math.sin(Math.PI * q)), sr = U(0.045);
    const late = clamp01((q - 0.7) / 0.3);
    ctx.fillStyle = radg(ctx, sx, sy, sr * 0.5, sr * 5, [[0, late > 0.5 ? 'rgba(255,190,120,.6)' : 'rgba(255,250,200,.7)'], [0.35, 'rgba(255,240,180,.22)'], [1, 'rgba(255,240,180,0)']]);
    ctx.fillRect(sx - sr * 5, sy - sr * 5, sr * 10, sr * 10);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(t * 0.004);
    ctx.fillStyle = late > 0.5 ? 'rgba(255,170,90,.45)' : 'rgba(255,226,120,.5)';
    for (let k = 0; k < 12; k++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath();
      ctx.moveTo(sr * 1.15, -sr * 0.2);
      ctx.lineTo(sr * (1.75 + 0.15 * Math.sin(t * 0.08 + k)), 0);
      ctx.lineTo(sr * 1.15, sr * 0.2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = radg(ctx, sx - sr * 0.3, sy - sr * 0.3, 0, sr * 1.1, [[0, '#fffbe0'], [0.6, mix('#ffd84a', '#ff9a4a', late)], [1, mix('#ffb020', '#ff6a3a', late)]]);
    ell(ctx, sx, sy, sr, sr);
    ctx.fill();
    // 해 얼굴: 낮엔 방긋, 저녁엔 졸림
    ctx.strokeStyle = '#a0521a';
    ctx.lineWidth = Math.max(1.2, sr * 0.09);
    ctx.lineCap = 'round';
    for (const e of [-1, 1]) {
      ctx.beginPath();
      if (late > 0.6) ctx.moveTo(sx + e * sr * 0.42 - sr * 0.13, sy - sr * 0.08), ctx.lineTo(sx + e * sr * 0.42 + sr * 0.13, sy - sr * 0.08);
      else ctx.arc(sx + e * sr * 0.38, sy - sr * 0.05, sr * 0.14, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(sx, sy + sr * 0.12, sr * 0.28, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,120,90,.35)';
    for (const e of [-1, 1]) (ell(ctx, sx + e * sr * 0.6, sy + sr * 0.2, sr * 0.16, sr * 0.1), ctx.fill());
  }
  // 먼 하늘의 작은 구름들 (천천히 흘러간다)
  for (let k = 0; k < 3; k++) {
    const sp = 0.00028 * (1 + k * 0.4) * (d.wind ? 3 : 1) * (d.wind && wind[0] < 0 ? -1 : 1);
    const cx = U((((hsh(k + 70) + t * sp) % 1.3) + 1.3) % 1.3 - 0.15), cy = U(0.17 + 0.09 * k), r0 = U(0.032 + 0.01 * k);
    ctx.fillStyle = `rgba(255,255,255,${(0.75 - 0.15 * k).toFixed(2)})`;
    for (const [ox, oy, rf] of [[-1, 0.2, 0.8], [0, 0, 1.1], [1.1, 0.25, 0.75]] as [number, number, number][]) (ell(ctx, cx + ox * r0, cy + oy * r0, r0 * rf * 1.2, r0 * rf * 0.8), ctx.fill());
  }
  // ═════════ 먼 언덕 · 풍차 · 나무 ═════════
  ctx.fillStyle = mix(band(q, [[0, '#b8e0a8'], [0.7, '#a8dc94'], [1, '#c8a8a0']]), '#6a6a9a', dusk * 0.4);
  ctx.beginPath();
  ctx.moveTo(-5, U(0.5));
  ctx.quadraticCurveTo(U(0.18), U(0.4), U(0.4), U(0.47));
  ctx.quadraticCurveTo(U(0.62), U(0.38), U(0.84), U(0.45));
  ctx.quadraticCurveTo(U(0.94), U(0.42), w + 5, U(0.44));
  ctx.lineTo(w + 5, U(0.62));
  ctx.lineTo(-5, U(0.62));
  ctx.fill();
  {
    // 풍차 (바람 판엔 빨리 돈다)
    const mx = U(0.7), my = U(0.43), mk = U(0.05);
    ctx.fillStyle = '#f4ead8';
    ctx.beginPath();
    ctx.moveTo(mx - mk * 0.35, my + mk * 1.1);
    ctx.lineTo(mx - mk * 0.2, my - mk * 0.3);
    ctx.lineTo(mx + mk * 0.2, my - mk * 0.3);
    ctx.lineTo(mx + mk * 0.35, my + mk * 1.1);
    ctx.fill();
    ctx.fillStyle = '#d06a4a';
    ctx.beginPath();
    ctx.moveTo(mx - mk * 0.28, my - mk * 0.28);
    ctx.lineTo(mx, my - mk * 0.62);
    ctx.lineTo(mx + mk * 0.28, my - mk * 0.28);
    ctx.fill();
    ctx.save();
    ctx.translate(mx, my - mk * 0.32);
    ctx.rotate(t * (d.wind ? 0.08 : 0.02));
    ctx.fillStyle = '#fffaf0';
    ctx.strokeStyle = '#9a7a5a';
    ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) {
      ctx.rotate(TAU / 4);
      ctx.fillRect(mk * 0.06, -mk * 0.08, mk * 0.75, mk * 0.16);
      ctx.strokeRect(mk * 0.06, -mk * 0.08, mk * 0.75, mk * 0.16);
    }
    ctx.restore();
  }
  ctx.fillStyle = mix(band(q, [[0, '#9ad480'], [0.7, '#8ccc72'], [1, '#a89080']]), '#5a5a8a', dusk * 0.4);
  ctx.beginPath();
  ctx.moveTo(-5, U(0.53));
  ctx.quadraticCurveTo(U(0.25), U(0.47), U(0.5), U(0.52));
  ctx.quadraticCurveTo(U(0.75), U(0.56), w + 5, U(0.5));
  ctx.lineTo(w + 5, U(0.64));
  ctx.lineTo(-5, U(0.64));
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const tx = U(0.04 + k * 0.155 + 0.03 * hsh(k + 20)), ty = U(0.5 + 0.025 * hsh(k + 30)), tr = U(0.026 + 0.012 * hsh(k + 40));
    const lean = d.wind ? wind[0] * 0.06 * (1 + Math.sin(t * 0.08 + k)) : Math.sin(t * 0.02 + k) * 0.02;
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(tx - U(0.004), ty, U(0.008), tr * 1.2);
    ctx.fillStyle = k % 2 ? '#5fb04e' : '#6cbc58';
    ell(ctx, tx + lean * tr * 4, ty - tr * 0.2, tr, tr * 1.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ell(ctx, tx + lean * tr * 4 - tr * 0.35, ty - tr * 0.55, tr * 0.35, tr * 0.3);
    ctx.fill();
  }
  // 울타리 너머 해바라기(해를 바라본다) · 접시꽃
  for (const [hx, kind] of [[0.1, 0], [0.34, 1], [0.58, 1], [0.9, 0]] as [number, number][]) {
    const bx = X(hx, -0.06), by = Y(-0.06), sway = Math.sin(t * 0.03 + hx * 9) * U(0.004) + (d.wind ? wind[0] * U(0.01) : 0);
    if (kind === 0) {
      const top = by - U(0.15), face = clamp01((0.07 + 0.86 * q - hx) * 2 + 0.5) * 2 - 1;
      ctx.strokeStyle = '#4e8a32';
      ctx.lineWidth = U(0.009);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + sway, by - U(0.08), bx + sway * 2, top);
      ctx.stroke();
      ctx.fillStyle = '#5aa63a';
      for (const e of [-1, 1]) (ell(ctx, bx + e * U(0.018), by - U(0.07), U(0.02), U(0.009), e * 0.5), ctx.fill());
      const hx2 = bx + sway * 2 + face * U(0.006);
      ctx.fillStyle = '#ffc928';
      for (let j = 0; j < 12; j++) {
        const a = (j / 12) * TAU;
        ell(ctx, hx2 + Math.cos(a) * U(0.026) * (0.75 + 0.25 * Math.abs(face)), top + Math.sin(a) * U(0.026), U(0.012), U(0.006), a);
        ctx.fill();
      }
      ctx.fillStyle = '#8a5a22';
      ell(ctx, hx2, top, U(0.017) * (0.75 + 0.25 * Math.abs(face)), U(0.017));
      ctx.fill();
      ctx.fillStyle = '#3a2210';
      for (const e of [-1, 1]) (ell(ctx, hx2 + face * U(0.004) + e * U(0.006), top - U(0.003), U(0.0022), U(0.003)), ctx.fill());
      ctx.strokeStyle = '#3a2210';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx2 + face * U(0.004), top + U(0.002), U(0.006), 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#5a9a3a';
      ctx.lineWidth = U(0.006);
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + sway * 2, by - U(0.16));
      ctx.stroke();
      for (let j = 0; j < 5; j++) {
        const fy = by - U(0.06 + j * 0.022), fxx = bx + sway * 2 * ((0.06 + j * 0.022) / 0.16);
        ctx.fillStyle = j % 2 ? '#ff9ac0' : '#ff7aa8';
        ell(ctx, fxx + (j % 2 ? U(0.008) : -U(0.008)), fy, U(0.012 - j * 0.0012), U(0.011 - j * 0.001));
        ctx.fill();
        ctx.fillStyle = '#fff2a0';
        ell(ctx, fxx + (j % 2 ? U(0.008) : -U(0.008)), fy, U(0.003), U(0.003));
        ctx.fill();
      }
    }
  }
  // ═════════ 울타리 · 참새 ═════════
  const fenceY = () => Y(-0.035), fh = U(0.075);
  for (const ry of [0.6, 0.25]) {
    ctx.fillStyle = '#d9b07a';
    ctx.beginPath();
    ctx.moveTo(X(-0.02, -0.035), fenceY() - fh * ry - U(0.006));
    ctx.lineTo(X(1.02, -0.035), fenceY() - fh * ry - U(0.006));
    ctx.lineTo(X(1.02, -0.035), fenceY() - fh * ry + U(0.008));
    ctx.lineTo(X(-0.02, -0.035), fenceY() - fh * ry + U(0.008));
    ctx.fill();
  }
  for (let gx = -0.02; gx < 1.04; gx += 0.058) {
    const px = X(gx, -0.035), py = fenceY(), pw = U(0.03), ph = fh * (0.92 + 0.08 * hsh(gx * 31));
    ctx.fillStyle = 'rgba(60,40,20,.18)';
    ctx.fillRect(px - pw / 2 + U(0.006), py - ph + U(0.01), pw, ph);
    ctx.fillStyle = lin(ctx, px - pw / 2, 0, px + pw / 2, 0, [[0, '#fff1d8'], [1, '#e8c898']]);
    ctx.beginPath();
    ctx.moveTo(px - pw / 2, py);
    ctx.lineTo(px - pw / 2, py - ph + U(0.012));
    ctx.lineTo(px, py - ph - U(0.004));
    ctx.lineTo(px + pw / 2, py - ph + U(0.012));
    ctx.lineTo(px + pw / 2, py);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b08a5a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  {
    const scare = s.bolt && t - s.bolt.t < 140 ? 1 - (t - s.bolt.t) / 140 : 0;
    for (let k = 0; k < 3; k++) {
      const bx = X(0.2 + k * 0.29 + 0.05 * Math.sin(t * 0.004 + k * 2), -0.035), by0 = fenceY() - fh - U(0.002);
      const hop = Math.max(0, Math.sin(t * 0.09 + k * 2.1)) ** 6 * U(0.018), up = scare * U(0.25) * (0.6 + 0.4 * k);
      drawSparrow(ctx, bx + scare * U(0.15) * (k - 1), by0 - hop - up, U(0.03), t + k * 37, scare > 0, k % 2 ? 1 : -1);
    }
  }
  // ═════════ 잔디 판 (작은 디오라마) ═════════
  const g0 = -0.04, g1 = DEP + 0.03;
  ctx.fillStyle = '#5a9a3e';
  ctx.beginPath();
  ctx.moveTo(-5, Y(g0));
  ctx.lineTo(w + 5, Y(g0));
  ctx.lineTo(w + 5, Y(g1) + U(0.05));
  ctx.lineTo(-5, Y(g1) + U(0.05));
  ctx.fill();
  ctx.fillStyle = lin(ctx, 0, Y(g0), 0, Y(g1), [[0, mix('#a6dc6a', '#6a8a7a', dusk * 0.4)], [1, mix('#7cc24e', '#4a6a5a', dusk * 0.4)]]);
  ctx.beginPath();
  ctx.moveTo(X(-0.03, g0), Y(g0));
  ctx.lineTo(X(1.03, g0), Y(g0));
  ctx.lineTo(X(1.03, g1), Y(g1));
  ctx.lineTo(X(-0.03, g1), Y(g1));
  ctx.closePath();
  ctx.fill();
  // 잔디 깎은 줄무늬
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  for (let k = 0; k < 8; k += 2) {
    const ya = g0 + ((g1 - g0) * k) / 8, yb = g0 + ((g1 - g0) * (k + 1)) / 8;
    ctx.beginPath();
    ctx.moveTo(X(-0.03, ya), Y(ya));
    ctx.lineTo(X(1.03, ya), Y(ya));
    ctx.lineTo(X(1.03, yb), Y(yb));
    ctx.lineTo(X(-0.03, yb), Y(yb));
    ctx.fill();
  }
  // 앞면 흙 단면 (두께)
  {
    const fy = Y(g1), fd = U(0.04);
    ctx.fillStyle = lin(ctx, 0, fy, 0, fy + fd, [[0, '#8a5a32'], [1, '#6a4024']]);
    ctx.beginPath();
    ctx.moveTo(X(-0.03, g1), fy);
    ctx.lineTo(X(1.03, g1), fy);
    ctx.lineTo(X(1.03, g1) - U(0.004), fy + fd);
    ctx.lineTo(X(-0.03, g1) + U(0.004), fy + fd);
    ctx.fill();
    ctx.fillStyle = '#4e8a32';
    ctx.fillRect(X(-0.03, g1), fy - U(0.003), X(1.03, g1) - X(-0.03, g1), U(0.008));
    ctx.fillStyle = 'rgba(255,230,190,.25)';
    for (let k = 0; k < 18; k++) (ell(ctx, U(0.04 + 0.92 * hsh(k + 90)), fy + fd * (0.35 + 0.5 * hsh(k + 91)), U(0.006), U(0.004)), ctx.fill());
  }
  // 가장자리 덤불
  for (const [bxg, byg, br] of [[-0.06, 0.08, 0.07], [-0.07, 0.5, 0.08], [-0.06, 0.95, 0.075], [1.06, 0.12, 0.07], [1.07, 0.55, 0.08], [1.06, 0.9, 0.07]] as [number, number, number][]) {
    const bx = X(bxg, byg), by = Y(byg), r0 = U(br);
    ctx.fillStyle = 'rgba(30,60,20,.3)';
    ell(ctx, bx, by + r0 * 0.5, r0 * 1.1, r0 * 0.35);
    ctx.fill();
    for (const [ox, oy, rf] of [[-0.5, 0, 0.7], [0.45, 0.05, 0.65], [0, -0.35, 0.8]] as [number, number, number][]) {
      ctx.fillStyle = radg(ctx, bx + ox * r0 - r0 * 0.2, by + oy * r0 - r0 * 0.3, 0, r0 * rf * 1.2, [[0, '#7ccc5a'], [1, '#3e8a2e']]);
      ell(ctx, bx + ox * r0, by + oy * r0, r0 * rf, r0 * rf * 0.85);
      ctx.fill();
    }
    ctx.fillStyle = '#ff8ab0';
    for (let j = 0; j < 3; j++) (ell(ctx, bx + (hsh(j + bxg * 10 + byg) - 0.5) * r0 * 1.2, by - r0 * (0.1 + 0.4 * hsh(j + 5 + byg)), U(0.006), U(0.006)), ctx.fill());
  }
  // 풀 포기 · 작은 들꽃
  ctx.strokeStyle = 'rgba(60,120,40,.55)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < 46; k++) {
    const gx = hsh(k + 300), gy = 0.02 + hsh(k + 301) * (DEP - 0.02);
    if (inPond(gx, gy, 0.02) || s.L.beds.some((b) => dist(b.x, b.y, gx, gy) < b.r + 0.03)) continue;
    const x = X(gx, gy), y = Y(gy), sw = (d.wind ? wind[0] * 2.5 : 0) + Math.sin(t * 0.05 + k) * 1.2;
    ctx.beginPath();
    ctx.moveTo(x - 3, y);
    ctx.lineTo(x - 4 + sw, y - 6);
    ctx.moveTo(x, y);
    ctx.lineTo(x + sw, y - 8);
    ctx.moveTo(x + 3, y);
    ctx.lineTo(x + 4 + sw, y - 6);
    ctx.stroke();
  }
  // 디딤돌
  for (let k = 0; k < 6; k++) {
    const gx = 0.6 + 0.05 * Math.sin(k * 1.3), gy = 1.24 - k * 0.075;
    if (s.L.beds.some((b) => dist(b.x, b.y, gx, gy) < b.r + 0.05) || s.P.some((p) => dist(p.x, p.y, gx, gy) < 0.06)) continue;
    const x = X(gx, gy), y = Y(gy), r0 = U(0.03 * scl(gy));
    ctx.fillStyle = 'rgba(40,60,30,.25)';
    ell(ctx, x + 1, y + 2, r0, r0 * 0.5);
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, y - r0 * 0.5, 0, y + r0 * 0.5, [[0, '#e8e2d6'], [1, '#bdb4a4']]);
    ell(ctx, x, y, r0, r0 * 0.48);
    ctx.fill();
  }
  // ═════════ 연못 ═════════
  drawPond(ctx, s, X, Y, U, t);
  // ═════════ 화단 ═════════
  for (const b of s.L.beds) {
    const x = X(b.x, b.y), y = Y(b.y), rx = U(b.r * scl(b.y)) * 1.06, ry = U(b.r * GSY) * 1.06;
    ctx.fillStyle = 'rgba(40,60,20,.3)';
    ell(ctx, x + U(0.006), y + U(0.016), rx * 1.02, ry * 1.05);
    ctx.fill();
    ctx.fillStyle = '#6a4226';
    ell(ctx, x, y + U(0.01), rx, ry);
    ctx.fill();
    ctx.fillStyle = radg(ctx, x - rx * 0.2, y - ry * 0.3, 0, rx * 1.1, [[0, '#a87448'], [0.7, '#93603a'], [1, '#7d4e2e']]);
    ell(ctx, x, y, rx, ry);
    ctx.fill();
    ctx.fillStyle = 'rgba(60,30,10,.28)';
    for (let k = 0; k < 16; k++) {
      const a = hsh(k + b.x * 50) * TAU, qq = Math.sqrt(hsh(k + 7 + b.y * 50)) * 0.85;
      ell(ctx, x + Math.cos(a) * rx * qq, y + Math.sin(a) * ry * qq, U(0.005), U(0.003));
      ctx.fill();
    }
    // 테두리 돌
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU, sx = x + Math.cos(a) * rx, sy = y + Math.sin(a) * ry + U(0.004);
      ctx.fillStyle = Math.sin(a) > 0 ? '#d8d0c0' : '#c4bba8';
      ell(ctx, sx, sy, U(0.014), U(0.009));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ell(ctx, sx - U(0.004), sy - U(0.003), U(0.005), U(0.003));
      ctx.fill();
    }
  }
  // 젖은 흙: 지난 비 자리 · 봉오리 밑 물기
  ctx.save();
  ctx.beginPath();
  for (const b of s.L.beds) ctx.moveTo(X(b.x, b.y) + U(b.r * scl(b.y)), Y(b.y)), ctx.ellipse(X(b.x, b.y), Y(b.y), U(b.r * scl(b.y)), U(b.r * GSY), 0, 0, TAU);
  ctx.clip();
  for (const m of marks) {
    if (m.k) continue;
    const a = 0.16 * (1 - (t - m.t) / 420);
    ctx.fillStyle = `rgba(50,25,10,${a.toFixed(3)})`;
    ell(ctx, X(m.x, m.y), Y(m.y), U(m.r * scl(m.y)), U(m.r * GSY));
    ctx.fill();
  }
  ctx.restore();
  for (const p of s.P) {
    if (p.k === 'cactus' || p.w <= 0.02 || p.st === 'gone') continue;
    ctx.fillStyle = `rgba(55,30,15,${(0.28 * p.w).toFixed(3)})`;
    ell(ctx, X(p.x, p.y), Y(p.y) + U(0.004), U(0.04 * scl(p.y)), U(0.022));
    ctx.fill();
  }
  // 번개 자국
  for (const m of marks) {
    if (!m.k) continue;
    const a = 0.55 * (1 - (t - m.t) / 420);
    ctx.fillStyle = `rgba(30,20,15,${a.toFixed(3)})`;
    ell(ctx, X(m.x, m.y), Y(m.y), U(m.r * scl(m.y)), U(m.r * GSY * 0.8));
    ctx.fill();
  }
  // ═════════ 비가 갈 자리 (미리 보기) · 비구름 그림자 ═════════
  for (const c of s.C) {
    const r = c.mode === 'idle' ? nextR(c) : c.r;
    if (c.mode === 'fly') {
      const a = 0.5 + 0.3 * Math.sin(t * 0.3);
      drawFoot(ctx, X(c.tx, c.ty), Y(c.ty), U(r * scl(c.ty)), U(r * GSY), `rgba(255,255,255,${a.toFixed(2)})`, true);
      if (d.wind) drawWindPath(ctx, X, Y, U, c.tx, c.ty, s.wx * RAIN, s.wy * RAIN, r, t);
      if (c.heavy) drawBoltMark(ctx, X(c.tx + s.wx * RAIN, c.ty + s.wy * RAIN), Y(c.ty + s.wy * RAIN), U(0.03), t);
    }
    if (c.q) {
      const qx = X(c.q.x, c.q.y), qy = Y(c.q.y);
      drawFoot(ctx, qx, qy, U(nextR(c) * scl(c.q.y)), U(nextR(c) * GSY), 'rgba(200,230,255,.55)', true);
      drawPin(ctx, qx, qy, U(0.035), t);
    }
    if (c.y > -0.02 && c.mode !== 'idle') {
      const sh = c.mode === 'rain' ? 0.24 : c.mode === 'fly' ? 0.12 * (c.mt / c.dur) : 0.12 * (1 - c.mt / REST);
      ctx.fillStyle = `rgba(20,40,60,${sh.toFixed(3)})`;
      ell(ctx, X(c.x, c.y), Y(c.y), U(0.85 * c.r * scl(c.y)), U(0.85 * c.r * GSY));
      ctx.fill();
    }
    if (c.mode === 'rain') {
      const fx0 = X(c.x, c.y), fy0 = Y(c.y), rx = U(c.r * scl(c.y)), ry = U(c.r * GSY);
      ctx.fillStyle = radg(ctx, fx0, fy0, 0, rx, [[0, 'rgba(120,180,255,.28)'], [0.8, 'rgba(120,180,255,.2)'], [1, 'rgba(120,180,255,0)']]);
      ell(ctx, fx0, fy0, rx, ry);
      ctx.fill();
      ctx.strokeStyle = 'rgba(220,240,255,.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ell(ctx, fx0, fy0, rx, ry);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  // ═════════ 식물 · 벤치 (뒤에서 앞으로) ═════════
  const order: { y: number; f: () => void }[] = [];
  s.P.forEach((p, i) => order.push({ y: p.y, f: () => drawPlant(ctx, s, p, i, w, t, wind[0]) }));
  order.push({ y: BENCH.y - 0.02, f: () => drawBenchCat(ctx, s, X(BENCH.x, BENCH.y), Y(BENCH.y), U(0.19), t) });
  if (d.bees) order.push({ y: HIVE.y, f: () => drawHive(ctx, X(HIVE.x, HIVE.y), Y(HIVE.y), U(0.075), t) });
  order.sort((a, b) => a.y - b.y);
  for (const o of order) o.f();
  // ═════════ 비 줄기 · 비구름 · 번개 ═════════
  for (const c of s.C) if (c.mode === 'rain') drawRain(ctx, c, X, Y, U, t, s.phase === 'result' ? Math.max(0, 1 - s.pt / 20) : 1);
  if (s.rainbow && t - s.rainbow.t < 260) drawRainbow(ctx, X(s.rainbow.x, s.rainbow.y), Y(s.rainbow.y), U(0.3), t - s.rainbow.t);
  for (const c of [...s.C].sort((a, b) => a.y - b.y)) drawCloudAt(ctx, s, c, X, Y, U, t);
  if (s.bolt && t - s.bolt.t < 16) {
    const b = s.bolt, c = s.C.reduce((a, o) => (dist(o.x, o.y, b.x, b.y) < dist(a.x, a.y, b.x, b.y) ? o : a), s.C[0]);
    drawBolt(ctx, X(b.x, b.y), Y(b.y) - U(ALT) + U(0.03), X(b.x, b.y), Y(b.y) - U(0.01), U(0.03), t - b.t, b.t + c.id);
  }
  // 일하는 꿀벌: 핀 꽃 → 옆 봉오리
  for (const b of s.B) {
    const a = s.P[b.from], c = s.P[b.to], q = clamp01((t - b.t0) / (b.t1 - b.t0));
    const ax = X(a.x, a.y), ay = Y(a.y) - U(0.12), cx2 = X(c.x, c.y), cy2 = Y(c.y) - U(0.09);
    const at = (u: number): [number, number] => [ax + (cx2 - ax) * u + Math.sin(t * 0.3 + u * 9) * U(0.006), ay + (cy2 - ay) * u - Math.sin(Math.PI * u) * U(0.07)];
    ctx.fillStyle = 'rgba(255,230,120,.8)';
    for (let k = 1; k <= 5; k++) {
      const u = q - k * 0.06;
      if (u <= 0) break;
      const [tx, ty] = at(u);
      ell(ctx, tx, ty, U(0.004), U(0.004));
      ctx.fill();
    }
    const [bx, by] = at(q);
    drawBee(ctx, bx, by, U(0.048), t + b.from * 7);
    if (q > 0.1 && q < 0.85) {
      ctx.font = `800 ${Math.max(12, U(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(90,60,0,.5)';
      ctx.strokeText('붕~', bx, by - U(0.04));
      ctx.fillStyle = '#fff6c0';
      ctx.fillText('붕~', bx, by - U(0.04));
    }
  }
  // 나비 · 벌
  drawCritters(ctx, s, X, Y, U, t);
  // 바람: 하늘과 정원을 가로지르는 바람 줄기 · 날리는 잎
  if (d.wind) {
    ctx.lineCap = 'round';
    for (let k = 0; k < 9; k++) {
      const ph = ((t * 0.005 * (1 + (k % 3) * 0.35) + hsh(k + 5)) % 1.4) - 0.2, yy = U(0.14 + 0.1 * k + 0.02 * Math.sin(t * 0.02 + k));
      const xx = wind[0] >= 0 ? U(ph) : w - U(ph), len = U(0.1 + 0.05 * hsh(k)), dx = wind[0] >= 0 ? 1 : -1;
      for (const [lw, col] of [[4.5, 'rgba(110,160,210,.3)'], [2, 'rgba(255,255,255,.85)']] as [number, string][]) {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.quadraticCurveTo(xx - dx * len * 0.5, yy - U(0.014), xx - dx * len, yy);
        ctx.stroke();
      }
    }
    for (let k = 0; k < 6; k++) {
      const ph = ((t * 0.004 * (1 + (k % 2) * 0.5) + hsh(k + 50)) % 1.3) - 0.15, dx = wind[0] >= 0 ? 1 : -1;
      const lx = dx > 0 ? U(ph) : w - U(ph), ly = U(0.62 + 0.11 * k) + Math.sin(t * 0.08 + k) * U(0.02);
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(t * 0.12 + k);
      ctx.fillStyle = k % 2 ? '#7ac24a' : '#e8b03a';
      ell(ctx, 0, 0, U(0.014), U(0.007));
      ctx.fill();
      ctx.restore();
    }
  }
  // NEW 스포트라이트
  if (s.spot && t - s.spot.t < 230) {
    const sp = s.spot, age = t - sp.t, a = Math.min(1, age / 10, (230 - age) / 30), cl = sp.cloud >= 0 ? s.C[sp.cloud] : null;
    const gx = cl ? cl.x : sp.x, gy = cl ? cl.y : sp.y;
    const x = X(gx, gy), y = sp.sky ? Y(gy) - U(ALT) : Y(gy) - U(0.04), rx = U(sp.r) * (1 + 0.06 * Math.sin(age * 0.2)), ry = sp.sky ? rx * 0.62 : rx * 0.75;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = '#ff5a7a';
    ctx.lineWidth = 3;
    ctx.setLineDash([7, 5]);
    ctx.lineDashOffset = -age * 0.6;
    ell(ctx, x, y, rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);
    font(0.036, 900);
    const tw = ctx.measureText(`NEW ${sp.label}`).width + U(0.04), ly = y + ry + U(0.035);
    const lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x));
    ctx.fillStyle = '#ff5a7a';
    rr(ctx, lx - tw / 2, ly - U(0.024), tw, U(0.048), U(0.024));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`NEW ${sp.label}`, lx, ly + 1);
    ctx.restore();
  }
  // 첫 손가락 안내
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play') {
    const b = hintTarget(s), bx = X(b[0], b[1]), by = Y(b[1]), press = Math.max(0, Math.sin(t * 0.1)) ** 3;
    ctx.strokeStyle = `rgba(255,255,255,${(0.35 + 0.5 * press).toFixed(2)})`;
    ctx.lineWidth = 2.5;
    ell(ctx, bx, by, U(RB * scl(b[1])) * (0.7 + 0.3 * press), U(RB * GSY) * (0.7 + 0.3 * press));
    ctx.stroke();
    drawHand(ctx, bx + U(0.02), by + U(0.02) - press * U(0.015), U(0.07), press);
  }
  ctx.restore();
  drawHud(ctx, s, d, w, h, U, font, t);
}

function drawFoot(ctx: C2, x: number, y: number, rx: number, ry: number, col: string, dash: boolean) {
  ctx.strokeStyle = col;
  ctx.lineWidth = 2.5;
  if (dash) ctx.setLineDash([7, 6]);
  ell(ctx, x, y, rx, ry);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fill();
}
function drawWindPath(ctx: C2, X: (a: number, b: number) => number, Y: (a: number) => number, U: (v: number) => number, x: number, y: number, dx: number, dy: number, r: number, t: number) {
  const x0 = X(x, y), y0 = Y(y), x1 = X(x + dx, y + dy), y1 = Y(y + dy);
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 6]);
  ell(ctx, x1, y1, U(r * scl(y + dy)), U(r * GSY));
  ctx.stroke();
  ctx.setLineDash([]);
  const a = Math.atan2(y1 - y0, x1 - x0), m = (Math.sin(t * 0.15) + 1) * 0.06;
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0 + (x1 - x0) * m, y0 + (y1 - y0) * m);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.5) * U(0.035), y1 - Math.sin(a - 0.5) * U(0.035));
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a + 0.5) * U(0.035), y1 - Math.sin(a + 0.5) * U(0.035));
  ctx.stroke();
}
function drawPin(ctx: C2, x: number, y: number, k: number, t: number) {
  const b = Math.abs(Math.sin(t * 0.12)) * k * 0.25;
  ctx.fillStyle = 'rgba(0,30,60,.25)';
  ell(ctx, x, y, k * 0.35, k * 0.14);
  ctx.fill();
  ctx.fillStyle = '#5ab0ff';
  ctx.strokeStyle = '#1a5aa0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y - b);
  ctx.bezierCurveTo(x - k * 0.55, y - k * 0.6 - b, x - k * 0.4, y - k * 1.15 - b, x, y - k * 1.25 - b);
  ctx.bezierCurveTo(x + k * 0.4, y - k * 1.15 - b, x + k * 0.55, y - k * 0.6 - b, x, y - b);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  ell(ctx, x - k * 0.12, y - k * 0.75 - b, k * 0.1, k * 0.16, 0.3);
  ctx.fill();
}
function drawBoltMark(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 0.4);
  ctx.fillStyle = '#ffe14d';
  ctx.strokeStyle = '#a8650a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + k * 0.2, y - k * 1.6);
  ctx.lineTo(x - k * 0.45, y - k * 0.5);
  ctx.lineTo(x - k * 0.02, y - k * 0.5);
  ctx.lineTo(x - k * 0.3, y + k * 0.2);
  ctx.lineTo(x + k * 0.45, y - k * 0.85);
  ctx.lineTo(x + k * 0.02, y - k * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function drawPond(ctx: C2, s: RainState, X: (a: number, b: number) => number, Y: (a: number) => number, U: (v: number) => number, t: number) {
  const x = X(POND.x, POND.y), y = Y(POND.y), rx = U(POND.rx * scl(POND.y)), ry = U(POND.ry * GSY);
  ctx.fillStyle = 'rgba(30,60,30,.3)';
  ell(ctx, x + 2, y + U(0.012), rx * 1.12, ry * 1.18);
  ctx.fill();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU, sx = x + Math.cos(a) * rx * 1.04, sy = y + Math.sin(a) * ry * 1.06;
    ctx.fillStyle = k % 3 ? '#cfc7b6' : '#b8ae9a';
    ell(ctx, sx, sy, U(0.018), U(0.011));
    ctx.fill();
  }
  ctx.fillStyle = lin(ctx, 0, y - ry, 0, y + ry, [[0, '#6cc8f0'], [1, '#2f8fc8']]);
  ell(ctx, x, y, rx, ry);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ell(ctx, x - rx * 0.35, y - ry * 0.4, rx * 0.35, ry * 0.12, -0.1);
  ctx.fill();
  // 비가 오면 물결
  const wet = s.C.some((c) => c.mode === 'rain' && dist(c.x, c.y, POND.x, POND.y) < c.r + POND.rx);
  ctx.strokeStyle = 'rgba(255,255,255,.55)';
  ctx.lineWidth = 1.2;
  for (let k = 0; k < (wet ? 6 : 2); k++) {
    const ph = ((t * (wet ? 0.04 : 0.012) + hsh(k + 3)) % 1), ex = x + (hsh(k + 11) - 0.5) * rx * 1.2, ey = y + (hsh(k + 12) - 0.5) * ry * 1.0;
    ctx.globalAlpha = 1 - ph;
    ell(ctx, ex, ey, U(0.02) * (0.3 + ph), U(0.01) * (0.3 + ph));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 연잎 · 개구리
  for (let k = 0; k < 3; k++) {
    const lx = x + rx * (-0.45 + k * 0.42), ly = y + ry * (0.15 - 0.35 * (k % 2)) + Math.sin(t * 0.03 + k) * 1.2;
    ctx.fillStyle = '#4caa4a';
    ctx.beginPath();
    ctx.ellipse(lx, ly, U(0.026), U(0.014), 0, 0.35, TAU - 0.05);
    ctx.lineTo(lx, ly);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ell(ctx, lx - U(0.008), ly - U(0.004), U(0.01), U(0.004));
    ctx.fill();
  }
  {
    const fxp = x + rx * 0.0, fyp = y - ry * 0.2, jump = wet ? Math.max(0, Math.sin(t * 0.18)) * U(0.03) : 0, k = U(0.022);
    ctx.fillStyle = '#5cc24e';
    ell(ctx, fxp, fyp - jump, k, k * 0.75);
    ctx.fill();
    for (const e of [-1, 1]) {
      ctx.fillStyle = '#5cc24e';
      ell(ctx, fxp + e * k * 0.45, fyp - jump - k * 0.6, k * 0.32, k * 0.3);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ell(ctx, fxp + e * k * 0.45, fyp - jump - k * 0.62, k * 0.2, k * 0.2);
      ctx.fill();
      ctx.fillStyle = '#1a2a1a';
      const blink = (t + 40) % 200 < 6;
      ell(ctx, fxp + e * k * 0.45, fyp - jump - k * 0.62, k * 0.1, blink ? k * 0.02 : k * 0.1);
      ctx.fill();
    }
    ctx.strokeStyle = '#2a6a22';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(fxp, fyp - jump - k * 0.1, k * 0.35, 0.2, Math.PI - 0.2);
    ctx.stroke();
    if (wet && Math.sin(t * 0.18) > 0.6) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${Math.max(12, U(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('개굴!', fxp, fyp - jump - k * 1.6);
    }
  }
}

/** 식물 하나 (k = 크기 단위 px) */
function drawPlant(ctx: C2, s: RainState, p: Plant, i: number, w: number, t: number, wind: number) {
  const x = SX(p.x, p.y) * w, y = SY(p.y) * w, k = 0.11 * scl(p.y) * w, age = t - p.t1;
  const lean = wind * 0.18 * (1 + 0.4 * Math.sin(t * 0.09 + i));
  if (p.k === 'weed') return drawWeed(ctx, s, p, i, x, y, k, t, lean, age, w);
  if (p.k === 'cactus') return drawCactus(ctx, s, p, x, y, k * 1.35, t, age);
  // ── 봉오리 · 꽃
  const c = FLOWER[p.col % FLOWER.length];
  const rainNow = t - p.hit < 4;
  const thirst = p.st === 'ok' ? clamp01((0.25 - p.w) / 0.25) * 0.45 + (p.w <= 0 ? Math.min(0.55, p.dr / 300) : 0) : 0;
  ctx.fillStyle = 'rgba(30,50,20,.28)';
  ell(ctx, x + k * 0.05, y + k * 0.04, k * 0.38, k * 0.13);
  ctx.fill();
  if (p.st === 'dead') return drawDeadBud(ctx, p, x, y, k, t, age);
  const bloomed = p.st === 'bloom';
  const H = k * (bloomed ? 1.25 : 0.7 + 0.5 * p.g) * (rainNow ? 1 + 0.03 * Math.sin(t * 0.8) : 1);
  const sway = Math.sin(t * 0.05 + i * 1.7) * 0.06 + lean + (rainNow ? Math.sin(t * 0.5 + i) * 0.05 : 0);
  const tipX = x + H * (sway + thirst * 0.75), tipY = y - H * (1 - thirst * 0.6);
  // 줄기
  ctx.lineCap = 'round';
  for (const [lw, col] of [[Math.max(3, k * 0.11), '#2e6a22'], [Math.max(1.8, k * 0.065), thirst > 0.4 ? '#9ab84e' : '#5aae3c']] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + H * sway * 0.2, y - H * 0.6, tipX, tipY);
    ctx.stroke();
  }
  // 잎 둘 (목마르면 축 처짐)
  for (const e of [-1, 1]) {
    const lx = x + H * sway * 0.15, ly = y - H * 0.32, la = e * (-0.45 + thirst * 1.7) + sway;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(e > 0 ? la : Math.PI - la);
    ctx.fillStyle = thirst > 0.4 ? '#a8c058' : '#62bc42';
    ell(ctx, k * 0.22, 0, k * 0.25, k * 0.095, e * (0.25 + thirst * 0.6));
    ctx.fill();
    ctx.strokeStyle = '#2e6a22';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }
  if (bloomed) {
    const pop = age < 30 ? outBack(age / 14) : 1, R = k * 0.48 * pop * (1 + 0.04 * Math.sin(t * 0.06 + i)), rot = t * 0.004 + i;
    for (let j = 0; j < 6; j++) {
      const a = rot + (j / 6) * TAU, px = tipX + Math.cos(a) * R * 0.55, py = tipY + Math.sin(a) * R * 0.5;
      ctx.fillStyle = lin(ctx, tipX, tipY, px, py, [[0, c[1]], [0.5, c[0]], [1, c[0]]]);
      ell(ctx, px, py, R * 0.5, R * 0.3, a);
      ctx.fill();
      ctx.strokeStyle = c[1];
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,40,80,.25)';
    ctx.lineWidth = 1;
    ctx.fillStyle = radg(ctx, tipX - R * 0.1, tipY - R * 0.1, 0, R * 0.36, [[0, '#fff7c8'], [1, c[2]]]);
    ell(ctx, tipX, tipY, R * 0.34, R * 0.32);
    ctx.fill();
    ctx.stroke();
    // 얼굴: 헤헤
    const fu = R * 0.34;
    ctx.strokeStyle = '#5a2a10';
    ctx.lineWidth = Math.max(1, fu * 0.16);
    for (const e of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(tipX + e * fu * 0.38, tipY - fu * 0.08, fu * 0.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(tipX, tipY + fu * 0.12, fu * 0.32, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,110,120,.45)';
    for (const e of [-1, 1]) (ell(ctx, tipX + e * fu * 0.68, tipY + fu * 0.18, fu * 0.17, fu * 0.11), ctx.fill());
    if (age < 26) {
      ctx.strokeStyle = `rgba(255,255,220,${(1 - age / 26).toFixed(2)})`;
      ctx.lineWidth = 2;
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU, r0 = R * (0.7 + age * 0.05), r1 = r0 + R * 0.35;
        ctx.beginPath();
        ctx.moveTo(tipX + Math.cos(a) * r0, tipY + Math.sin(a) * r0);
        ctx.lineTo(tipX + Math.cos(a) * r1, tipY + Math.sin(a) * r1);
        ctx.stroke();
      }
    }
    return;
  }
  // 봉오리: 자랄수록 크고, 곧 필 땐 꽃잎 색이 비치며 들썩
  const soon = p.g > 0.78 ? (p.g - 0.78) / 0.22 : 0, wob = soon ? Math.sin(t * (0.25 + soon * 0.3) + i) * 0.12 * soon : 0;
  const bs = k * (0.19 + 0.14 * p.g) * (1 + 0.08 * soon * Math.sin(t * 0.3));
  ctx.save();
  ctx.translate(tipX, tipY);
  ctx.rotate(sway * 1.2 + wob + thirst * 1.3);
  ctx.fillStyle = lin(ctx, 0, -bs * 1.6, 0, bs * 0.4, [[0, c[0]], [0.35 + 0.4 * (1 - p.g), c[1]], [0.75, '#5aa83a'], [1, '#4a9030']]);
  ctx.beginPath();
  ctx.moveTo(0, -bs * 1.7);
  ctx.bezierCurveTo(bs * 1.05, -bs * 0.9, bs * 0.95, bs * 0.35, 0, bs * 0.45);
  ctx.bezierCurveTo(-bs * 0.95, bs * 0.35, -bs * 1.05, -bs * 0.9, 0, -bs * 1.7);
  ctx.fill();
  ctx.strokeStyle = '#2e6a22';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.fillStyle = '#3e8a2a';
  for (const e of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, bs * 0.4);
    ctx.quadraticCurveTo(e * bs * 0.9, bs * 0.1, e * bs * 0.55, -bs * 0.55);
    ctx.quadraticCurveTo(e * bs * 0.25, 0, 0, bs * 0.4);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ell(ctx, -bs * 0.32, -bs * 0.7, bs * 0.16, bs * 0.32, -0.3);
  ctx.fill();
  ctx.restore();
  if (p.cov) {
    ctx.fillStyle = 'rgba(30,60,20,.35)';
    ell(ctx, tipX, tipY - bs * 0.5, bs * 1.4, bs * 1.4);
    ctx.fill();
  }
  // 목마름: 물방울 표시 (곧 시들면 깜빡)
  if (p.w <= 0.0 && p.st === 'ok' && s.d.wilt) {
    const urg = p.dr / s.d.wilt, blink = urg > 0.6 ? 0.5 + 0.5 * Math.sin(t * 0.4) : 1;
    const dx = tipX + k * 0.3, dy = tipY - k * 0.45 - Math.abs(Math.sin(t * 0.08 + i)) * k * 0.06, dk = k * 0.16;
    ctx.globalAlpha = blink;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ell(ctx, dx, dy, dk * 1.25, dk * 1.25);
    ctx.fill();
    ctx.fillStyle = urg > 0.6 ? '#ff7a5a' : '#5ab0ff';
    ctx.beginPath();
    ctx.moveTo(dx, dy - dk * 0.85);
    ctx.bezierCurveTo(dx + dk * 0.75, dy, dx + dk * 0.5, dy + dk * 0.7, dx, dy + dk * 0.7);
    ctx.bezierCurveTo(dx - dk * 0.5, dy + dk * 0.7, dx - dk * 0.75, dy, dx, dy - dk * 0.85);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
function drawDeadBud(ctx: C2, p: Plant, x: number, y: number, k: number, t: number, age: number) {
  if (p.why === 2) {
    ctx.fillStyle = '#2a201a';
    ell(ctx, x, y - k * 0.04, k * 0.22, k * 0.08);
    ctx.fill();
    ctx.strokeStyle = '#2a201a';
    ctx.lineWidth = Math.max(2, k * 0.08);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + k * 0.05, y - k * 0.32);
    ctx.stroke();
    if (age < 200) {
      ctx.fillStyle = `rgba(120,110,100,${(0.5 * (1 - age / 200)).toFixed(2)})`;
      for (let j = 0; j < 3; j++) (ell(ctx, x + Math.sin(t * 0.05 + j) * k * 0.15, y - k * (0.5 + j * 0.25 + (age % 60) / 120), k * (0.1 + j * 0.04), k * (0.1 + j * 0.04)), ctx.fill());
    }
    return;
  }
  const H = k * 0.7;
  ctx.strokeStyle = '#9a7a4a';
  ctx.lineWidth = Math.max(1.6, k * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + H * 0.1, y - H * 0.75, x + H * 0.55, y - H * 0.35);
  ctx.stroke();
  ctx.fillStyle = '#a07a50';
  ell(ctx, x + H * 0.6, y - H * 0.28, k * 0.12, k * 0.08, 0.8);
  ctx.fill();
  ctx.fillStyle = '#b89a6a';
  for (const e of [-1, 1]) (ell(ctx, x + e * k * 0.15, y - k * 0.08, k * 0.16, k * 0.05, e * 0.4), ctx.fill());
}
function drawWeed(ctx: C2, s: RainState, p: Plant, i: number, x: number, y: number, k: number, t: number, lean: number, age: number, w: number) {
  if (p.st === 'gone') {
    ctx.fillStyle = '#3a2e26';
    ell(ctx, x, y, k * 0.3, k * 0.1);
    ctx.fill();
    ctx.fillStyle = '#5a4a40';
    for (let j = 0; j < 4; j++) (ell(ctx, x + (j - 1.5) * k * 0.12, y - k * 0.03, k * 0.06, k * 0.04), ctx.fill());
    if (age < 240) {
      ctx.fillStyle = `rgba(130,120,110,${(0.45 * (1 - age / 240)).toFixed(2)})`;
      for (let j = 0; j < 3; j++) (ell(ctx, x + Math.sin(t * 0.05 + j) * k * 0.2, y - k * (0.4 + j * 0.3 + (age % 70) / 120), k * (0.12 + j * 0.05), k * (0.12 + j * 0.05)), ctx.fill());
    }
    return;
  }
  const full = p.st === 'full', sz = k * (0.32 + 0.5 * p.g) * (full ? 1.25 : 1) * (age < 20 && full ? outBack(age / 12) * 0.2 + 0.8 : 1);
  const rainNow = t - p.hit < 4;
  ctx.fillStyle = '#7d5232';
  ell(ctx, x, y + k * 0.01, Math.max(k * 0.3, sz * 0.75), Math.max(k * 0.11, sz * 0.26));
  ctx.fill();
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ell(ctx, x + k * 0.04, y + k * 0.03, sz * 0.95, sz * 0.32);
  ctx.fill();
  // 다 크면 덮은 봉오리 쪽으로 덩굴
  if (full) {
    ctx.strokeStyle = '#3e7a2a';
    ctx.lineWidth = Math.max(1.5, k * 0.06);
    for (const b of s.P) {
      if (b.k !== 'bud' || !b.cov || dist(b.x, b.y, p.x, p.y) > COVER) continue;
      const bx = SX(b.x, b.y) * w, by = SY(b.y) * w;
      ctx.beginPath();
      ctx.moveTo(x, y - sz * 0.3);
      ctx.quadraticCurveTo((x + bx) / 2, by - k * 0.9, bx, by - k * 0.45);
      ctx.stroke();
      ctx.fillStyle = '#4e8a32';
      ell(ctx, bx, by - k * 0.5, k * 0.18, k * 0.09, 0.4);
      ctx.fill();
    }
  }
  const n = 9;
  for (let j = 0; j < n; j++) {
    const a = -Math.PI / 2 + (j - (n - 1) / 2) * 0.33 + lean + Math.sin(t * 0.06 + j + i) * 0.06 + (rainNow ? Math.sin(t * 0.6 + j) * 0.08 : 0);
    const L = sz * (0.8 + 0.45 * hsh(j + i * 9)) * (j % 2 ? 0.85 : 1.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = j % 2 ? (full ? '#3f7d2a' : '#4c8f30') : full ? '#4f9434' : '#5aa63a';
    ctx.beginPath();
    ctx.moveTo(0, -L * 0.08);
    for (let z = 1; z <= 4; z++) {
      ctx.lineTo(L * (z / 4.4), (z % 2 ? -1 : -0.3) * L * 0.16 * (1 - z / 5));
    }
    ctx.lineTo(L, 0);
    for (let z = 4; z >= 1; z--) ctx.lineTo(L * (z / 4.4) - L * 0.05, (z % 2 ? 1 : 0.3) * L * 0.16 * (1 - z / 5));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,150,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(L * 0.85, 0);
    ctx.stroke();
    ctx.restore();
  }
  // 얼굴: 다 크면 이를 드러내고 낄낄
  const fy = y - sz * 0.35, fu = Math.max(k * 0.16, sz * 0.22);
  ctx.fillStyle = full ? '#2e6a1e' : '#3c7c26';
  ell(ctx, x, fy, fu * 1.15, fu * 0.95);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const e of [-1, 1]) (ell(ctx, x + e * fu * 0.42, fy - fu * 0.15, fu * 0.26, full ? fu * 0.3 : fu * 0.18), ctx.fill());
  ctx.fillStyle = '#1a1a10';
  for (const e of [-1, 1]) (ell(ctx, x + e * fu * 0.42 + fu * 0.06 * Math.sin(t * 0.03), fy - fu * 0.12, fu * 0.12, fu * 0.13), ctx.fill());
  ctx.strokeStyle = '#1a2a10';
  ctx.lineWidth = Math.max(1, fu * 0.13);
  ctx.beginPath();
  ctx.moveTo(x - fu * 0.62, fy - fu * 0.48);
  ctx.lineTo(x - fu * 0.2, fy - fu * 0.36);
  ctx.moveTo(x + fu * 0.62, fy - fu * 0.48);
  ctx.lineTo(x + fu * 0.2, fy - fu * 0.36);
  ctx.stroke();
  if (full) {
    ctx.fillStyle = '#5a1a10';
    ell(ctx, x, fy + fu * 0.38, fu * 0.45, fu * 0.25);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - fu * 0.3, fy + fu * 0.18, fu * 0.6, fu * 0.12);
  } else {
    ctx.beginPath();
    ctx.arc(x + fu * 0.1, fy + fu * 0.18, fu * 0.3, 0.1 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();
  }
  // 자람 고리: 다 크기까지 얼마나 남았나
  if (!full && s.d.stars.includes('weed')) {
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, fy, fu * 1.6, -Math.PI / 2, -Math.PI / 2 + TAU);
    ctx.stroke();
    ctx.strokeStyle = p.g > 0.7 ? '#ff7a4a' : '#ffd23a';
    ctx.beginPath();
    ctx.arc(x, fy, fu * 1.6, -Math.PI / 2, -Math.PI / 2 + TAU * p.g);
    ctx.stroke();
  }
}
function drawCactus(ctx: C2, _s: RainState, p: Plant, x: number, y: number, k: number, t: number, age: number) {
  const rot = p.st === 'rot', wet = p.g, rainNow = t - p.hit < 4;
  const burnt = rot && p.why === 2;
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ell(ctx, x + k * 0.05, y + k * 0.03, k * 0.38, k * 0.12);
  ctx.fill();
  // 화분 (3/4)
  const pw = k * 0.36, ph = k * 0.32;
  ctx.fillStyle = lin(ctx, x - pw, 0, x + pw, 0, [[0, '#e0855a'], [0.5, '#f0a070'], [1, '#c0603a']]);
  ctx.beginPath();
  ctx.moveTo(x - pw, y - ph);
  ctx.lineTo(x - pw * 0.75, y);
  ctx.lineTo(x + pw * 0.75, y);
  ctx.lineTo(x + pw, y - ph);
  ctx.fill();
  ctx.fillStyle = '#d0703f';
  ell(ctx, x, y - ph, pw * 1.08, pw * 0.3);
  ctx.fill();
  ctx.fillStyle = '#6a4024';
  ell(ctx, x, y - ph, pw * 0.85, pw * 0.2);
  ctx.fill();
  // 몸
  const tilt = rot ? Math.min(1, age / 30) * 0.7 : wet > 0 || rainNow ? Math.sin(t * 0.5) * 0.05 * (wet + 0.3) : Math.sin(t * 0.03) * 0.03;
  ctx.save();
  ctx.translate(x, y - ph);
  ctx.rotate(tilt);
  const bw = k * 0.27, bh = k * (rot ? 0.6 : 0.78);
  const col = burnt ? ['#3a3028', '#2a221c'] : rot ? ['#c8b85a', '#a0904a'] : [mix('#62c25a', '#7ac2b0', wet), mix('#3e9a3e', '#4a9a90', wet)];
  ctx.fillStyle = lin(ctx, -bw, 0, bw, 0, [[0, col[1]], [0.45, col[0]], [1, col[1]]]);
  rr(ctx, -bw, -bh, bw * 2, bh + bw * 0.2, bw);
  ctx.fill();
  // 팔
  for (const e of [-1, 1]) {
    ctx.fillStyle = col[0];
    rr(ctx, e * bw * (e > 0 ? 0.85 : 1.85) - (e > 0 ? 0 : 0), -bh * (e > 0 ? 0.62 : 0.5), bw * 1.0, bw * 0.5, bw * 0.25);
    ctx.fill();
    rr(ctx, e > 0 ? bw * 1.35 : -bw * 1.85, -bh * (e > 0 ? 0.95 : 0.8), bw * 0.5, bh * 0.4, bw * 0.25);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(20,60,20,.35)';
  ctx.lineWidth = 1;
  for (const e of [-0.45, 0, 0.45]) {
    ctx.beginPath();
    ctx.moveTo(e * bw, -bh + bw * 0.4);
    ctx.lineTo(e * bw, -bw * 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,230,.8)';
  for (let j = 0; j < 8; j++) (ell(ctx, (hsh(j + 3) - 0.5) * bw * 1.6, -bh * (0.2 + 0.7 * hsh(j + 9)), 0.9, 0.9), ctx.fill());
  // 꽃
  if (!rot) {
    ctx.fillStyle = '#ff7ab0';
    for (let j = 0; j < 5; j++) (ell(ctx, Math.cos((j / 5) * TAU) * bw * 0.28, -bh - bw * 0.05 + Math.sin((j / 5) * TAU) * bw * 0.18, bw * 0.22, bw * 0.15, (j / 5) * TAU), ctx.fill());
    ctx.fillStyle = '#ffe066';
    ell(ctx, 0, -bh - bw * 0.05, bw * 0.12, bw * 0.1);
    ctx.fill();
  }
  // 얼굴: 선글라스 · 젖으면 흘러내림 · 시들면 X X
  const fy = -bh * 0.55;
  if (rot) {
    ctx.strokeStyle = burnt ? '#c0b0a0' : '#4a3a10';
    ctx.lineWidth = 1.6;
    for (const e of [-1, 1]) {
      const ex = e * bw * 0.42;
      ctx.beginPath();
      ctx.moveTo(ex - bw * 0.14, fy - bw * 0.14);
      ctx.lineTo(ex + bw * 0.14, fy + bw * 0.14);
      ctx.moveTo(ex + bw * 0.14, fy - bw * 0.14);
      ctx.lineTo(ex - bw * 0.14, fy + bw * 0.14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, fy + bw * 0.55, bw * 0.25, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else {
    const slide = wet * bw * 0.35;
    ctx.fillStyle = '#1a1a24';
    for (const e of [-1, 1]) (rr(ctx, e * bw * 0.42 - bw * 0.3, fy - bw * 0.16 + slide, bw * 0.6, bw * 0.34, bw * 0.12), ctx.fill());
    ctx.fillRect(-bw * 0.15, fy - bw * 0.08 + slide, bw * 0.3, bw * 0.07);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    for (const e of [-1, 1]) (ell(ctx, e * bw * 0.42 - bw * 0.1, fy - bw * 0.05 + slide, bw * 0.08, bw * 0.05), ctx.fill());
    ctx.strokeStyle = '#1a3a14';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (wet > 0.05 || rainNow) ctx.arc(0, fy + bw * 0.6, bw * 0.2, 1.1 * Math.PI, 1.9 * Math.PI);
    else ctx.arc(0, fy + bw * 0.28, bw * 0.25, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    if (wet > 0.05 || rainNow) {
      ctx.fillStyle = '#7ac8ff';
      ell(ctx, bw * 0.95, fy - bw * 0.3 + ((t * 0.6) % (bw * 1.2)), bw * 0.11, bw * 0.16);
      ctx.fill();
    }
  }
  ctx.restore();
  // 젖음 표시: 물이 얼마나 들었나
  if (!rot && wet > 0.02) {
    const gx = x + k * 0.42, gy = y - k * 0.5, gh = k * 0.5;
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    rr(ctx, gx - 3.5, gy - gh / 2 - 1, 7, gh + 2, 3);
    ctx.fill();
    ctx.fillStyle = wet > 0.6 ? '#ff5a4a' : '#4aa0ff';
    rr(ctx, gx - 2, gy + gh / 2 - gh * wet, 4, gh * wet, 2);
    ctx.fill();
  }
}
function drawBenchCat(ctx: C2, s: RainState, x: number, y: number, k: number, t: number) {
  // 벤치
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ell(ctx, x, y + k * 0.06, k * 0.62, k * 0.13);
  ctx.fill();
  ctx.fillStyle = '#7a4a2a';
  for (const e of [-1, 1]) {
    ctx.fillRect(x + e * k * 0.42 - k * 0.03, y - k * 0.22, k * 0.06, k * 0.28);
    ctx.fillRect(x + e * k * 0.36 - k * 0.025, y - k * 0.6, k * 0.05, k * 0.4);
  }
  ctx.fillStyle = lin(ctx, 0, y - k * 0.3, 0, y - k * 0.18, [[0, '#d89a5a'], [1, '#b0703a']]);
  rr(ctx, x - k * 0.55, y - k * 0.3, k * 1.1, k * 0.11, k * 0.03);
  ctx.fill();
  for (const yy of [-0.62, -0.5]) {
    ctx.fillStyle = '#c88a4a';
    rr(ctx, x - k * 0.5, y + k * yy, k * 1.0, k * 0.08, k * 0.03);
    ctx.fill();
  }
  // 털실 바구니
  ctx.fillStyle = '#c8823a';
  rr(ctx, x - k * 0.5, y - k * 0.42, k * 0.2, k * 0.13, k * 0.04);
  ctx.fill();
  ctx.fillStyle = '#ff6a7a';
  ell(ctx, x - k * 0.44, y - k * 0.44, k * 0.06, k * 0.06);
  ctx.fill();
  ctx.fillStyle = '#6ab0ff';
  ell(ctx, x - k * 0.35, y - k * 0.45, k * 0.055, k * 0.055);
  ctx.fill();
  drawCat(ctx, s, x + k * 0.08, y - k * 0.3, k, t);
}
/** 할머니 고양이: 뜨개질(평소) · 우산 깜짝 · 번개에 털 쭈뼛 · 박수 · 어머 · 한숨 */
function drawCat(ctx: C2, s: RainState, x: number, y: number, k: number, t: number) {
  const m = s.cat.m, mt = t - s.cat.t, jump = m === 'fright' ? Math.max(0, Math.sin(Math.min(1, mt / 14) * Math.PI)) * k * 0.15 : m === 'umbrella' && mt < 12 ? Math.sin((mt / 12) * Math.PI) * k * 0.08 : 0;
  const cy = y - jump, fur = '#f0e2cc', dark = '#c8aa88';
  // 꼬리
  ctx.strokeStyle = fur;
  ctx.lineWidth = k * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + k * 0.18, cy - k * 0.02);
  ctx.quadraticCurveTo(x + k * 0.38, cy - k * 0.05 + Math.sin(t * 0.06) * k * 0.05, x + k * 0.34, cy - k * 0.22 + Math.sin(t * 0.06 + 1) * k * 0.06);
  ctx.stroke();
  // 몸 (숄)
  ctx.fillStyle = radg(ctx, x - k * 0.05, cy - k * 0.2, 0, k * 0.3, [[0, '#fff6e6'], [1, fur]]);
  ell(ctx, x, cy - k * 0.13, k * 0.22, k * 0.2);
  ctx.fill();
  ctx.fillStyle = '#9a6ac8';
  ctx.beginPath();
  ctx.moveTo(x - k * 0.2, cy - k * 0.22);
  ctx.quadraticCurveTo(x, cy - k * 0.02, x + k * 0.2, cy - k * 0.22);
  ctx.lineTo(x + k * 0.16, cy - k * 0.3);
  ctx.quadraticCurveTo(x, cy - k * 0.2, x - k * 0.16, cy - k * 0.3);
  ctx.fill();
  ctx.fillStyle = '#ffd860';
  for (let j = 0; j < 4; j++) (ell(ctx, x - k * 0.12 + j * k * 0.08, cy - k * 0.18 + Math.sin(j) * k * 0.01, k * 0.012, k * 0.012), ctx.fill());
  // 머리
  const hx = x, hy = cy - k * 0.42;
  for (const e of [-1, 1]) {
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.moveTo(hx + e * k * 0.16, hy - k * 0.06);
    ctx.lineTo(hx + e * k * (m === 'fright' ? 0.2 : 0.15), hy - k * (m === 'fright' ? 0.27 : 0.22));
    ctx.lineTo(hx + e * k * 0.04, hy - k * 0.13);
    ctx.fill();
    ctx.fillStyle = '#ffb0b8';
    ctx.beginPath();
    ctx.moveTo(hx + e * k * 0.135, hy - k * 0.09);
    ctx.lineTo(hx + e * k * 0.135, hy - k * 0.17);
    ctx.lineTo(hx + e * k * 0.08, hy - k * 0.12);
    ctx.fill();
  }
  ctx.fillStyle = fur;
  ell(ctx, hx, hy, k * 0.18, k * 0.15);
  ctx.fill();
  if (m === 'fright') {
    ctx.strokeStyle = fur;
    ctx.lineWidth = 2;
    for (let j = 0; j < 9; j++) {
      const a = Math.PI + (j / 8) * Math.PI;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(a) * k * 0.17, hy + Math.sin(a) * k * 0.14);
      ctx.lineTo(hx + Math.cos(a) * k * 0.25, hy + Math.sin(a) * k * 0.22);
      ctx.stroke();
    }
  }
  // 흰 머리 쪽
  ctx.fillStyle = '#ffffff';
  ell(ctx, hx, hy - k * 0.14, k * 0.07, k * 0.05);
  ctx.fill();
  ctx.fillStyle = dark;
  for (const e of [-0.06, 0, 0.06]) (ell(ctx, hx + e * k, hy - k * 0.1, k * 0.012, k * 0.03), ctx.fill());
  // 얼굴
  ctx.strokeStyle = '#4a3020';
  ctx.lineWidth = Math.max(1.2, k * 0.016);
  ctx.lineCap = 'round';
  const surprised = m === 'umbrella' || m === 'fright' || m === 'oops';
  for (const e of [-1, 1]) {
    const ex = hx + e * k * 0.07, ey = hy - k * 0.01;
    if (surprised) {
      ctx.fillStyle = '#ffffff';
      ell(ctx, ex, ey, k * 0.035, k * 0.04);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
      ell(ctx, ex, ey, k * 0.017, k * 0.02);
      ctx.fill();
    } else {
      ctx.beginPath();
      if (m === 'sigh') ctx.moveTo(ex - k * 0.03, ey), ctx.lineTo(ex + k * 0.03, ey);
      else ctx.arc(ex, ey + k * 0.012, k * 0.028, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
    // 안경
    ctx.strokeStyle = '#8a6a3a';
    ell(ctx, ex, ey, k * 0.045, k * 0.042);
    ctx.stroke();
    ctx.strokeStyle = '#4a3020';
  }
  ctx.strokeStyle = '#8a6a3a';
  ctx.beginPath();
  ctx.moveTo(hx - k * 0.025, hy - k * 0.01);
  ctx.lineTo(hx + k * 0.025, hy - k * 0.01);
  ctx.stroke();
  ctx.fillStyle = '#ff8a9a';
  ell(ctx, hx, hy + k * 0.035, k * 0.016, k * 0.011);
  ctx.fill();
  ctx.strokeStyle = '#4a3020';
  ctx.beginPath();
  if (surprised) (ell(ctx, hx, hy + k * 0.075, k * 0.022, k * 0.028), ctx.stroke());
  else (ctx.arc(hx - k * 0.018, hy + k * 0.05, k * 0.018, 0, Math.PI), ctx.moveTo(hx + k * 0.036, hy + k * 0.05), ctx.arc(hx + k * 0.018, hy + k * 0.05, k * 0.018, 0, Math.PI), ctx.stroke());
  ctx.strokeStyle = 'rgba(120,90,60,.6)';
  ctx.lineWidth = 1;
  for (const e of [-1, 1]) for (const yy of [0.03, 0.055]) {
    ctx.beginPath();
    ctx.moveTo(hx + e * k * 0.06, hy + k * yy);
    ctx.lineTo(hx + e * k * 0.17, hy + k * (yy - 0.01));
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,140,150,.4)';
  for (const e of [-1, 1]) (ell(ctx, hx + e * k * 0.11, hy + k * 0.04, k * 0.025, k * 0.015), ctx.fill());
  // 손: 뜨개질 · 박수
  const paw = (px: number, py: number) => {
    ctx.fillStyle = '#fff8ee';
    ell(ctx, px, py, k * 0.04, k * 0.035);
    ctx.fill();
  };
  if (m === 'clap') {
    const c = Math.abs(Math.sin(mt * 0.4)) * k * 0.05;
    paw(hx - k * 0.03 - c, cy - k * 0.25);
    paw(hx + k * 0.03 + c, cy - k * 0.25);
    ctx.fillStyle = '#ff6a8a';
    for (let j = 0; j < 2; j++) drawHeart(ctx, hx + (j ? 1 : -1) * k * 0.22, hy - k * 0.2 - ((mt * 0.6 + j * 20) % 30) * 0.5, k * 0.035, true);
  } else if (m === 'knit' || m === 'sigh') {
    const kn = Math.sin(t * 0.15) * k * 0.012;
    ctx.strokeStyle = '#c0c8d0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - k * 0.12, cy - k * 0.12 + kn);
    ctx.lineTo(hx + k * 0.08, cy - k * 0.22);
    ctx.moveTo(hx + k * 0.12, cy - k * 0.12 - kn);
    ctx.lineTo(hx - k * 0.08, cy - k * 0.22);
    ctx.stroke();
    ctx.fillStyle = '#ff6a7a';
    rr(ctx, hx - k * 0.06, cy - k * 0.16, k * 0.12, k * 0.06, k * 0.02);
    ctx.fill();
    paw(hx - k * 0.1, cy - k * 0.13);
    paw(hx + k * 0.1, cy - k * 0.13);
  } else if (m === 'oops') {
    paw(hx + k * 0.12, hy + k * 0.06);
    paw(hx - k * 0.08, cy - k * 0.12);
  } else {
    paw(hx - k * 0.1, cy - k * 0.13);
    paw(hx + k * 0.14, cy - k * 0.3);
  }
  // 우산: 비가 가까이 오면 퍼뜩
  if (m === 'umbrella') {
    const open = Math.min(1, mt / 8), ux = hx + k * 0.12, uy = hy - k * 0.22;
    ctx.strokeStyle = '#5a3a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ux, uy);
    ctx.lineTo(hx + k * 0.14, cy - k * 0.28);
    ctx.stroke();
    ctx.save();
    ctx.translate(ux, uy);
    ctx.rotate(-0.15 + Math.sin(t * 0.2) * 0.04);
    ctx.scale(open, 0.6 + 0.4 * open);
    ctx.fillStyle = '#ff5a6a';
    ctx.beginPath();
    ctx.moveTo(-k * 0.32, 0);
    ctx.quadraticCurveTo(0, -k * 0.34, k * 0.32, 0);
    for (let j = 3; j >= -3; j -= 2) ctx.quadraticCurveTo(j * k * 0.08 + k * 0.04, -k * 0.04, (j - 1) * k * 0.08 + k * 0.08, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const j of [-0.16, 0.04, 0.2]) (ell(ctx, j * k, -k * 0.1, k * 0.025, k * 0.02), ctx.fill());
    ctx.restore();
  }
  // 말풍선
  const say = m === 'umbrella' && mt < 70 ? '어머 비!' : m === 'fright' && mt < 70 ? '냐앗!' : m === 'oops' && mt < 70 ? '어머머' : m === 'sigh' && mt < 120 ? '후유…' : m === 'clap' && mt < 70 ? '좋구나~' : '';
  if (say) {
    ctx.font = `800 ${Math.max(12, k * 0.12)}px system-ui, sans-serif`;
    const tw = ctx.measureText(say).width + k * 0.1, bx = x - k * 0.1, by = hy - k * 0.42;
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    rr(ctx, bx - tw / 2, by - k * 0.09, tw, k * 0.18, k * 0.09);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(bx + k * 0.04, by + k * 0.08);
    ctx.lineTo(bx + k * 0.12, by + k * 0.16);
    ctx.lineTo(bx + k * 0.12, by + k * 0.06);
    ctx.fill();
    ctx.fillStyle = '#6a3a5a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(say, bx, by + 1);
  }
}
function drawSparrow(ctx: C2, x: number, y: number, k: number, t: number, fly: boolean, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = '#a8784a';
  ell(ctx, 0, -k * 0.35, k * 0.42, k * 0.32);
  ctx.fill();
  ctx.fillStyle = '#f4e4cc';
  ell(ctx, k * 0.1, -k * 0.25, k * 0.25, k * 0.18);
  ctx.fill();
  ctx.fillStyle = '#8a5a32';
  ell(ctx, k * 0.28, -k * 0.62, k * 0.22, k * 0.2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ell(ctx, k * 0.36, -k * 0.65, k * 0.04, k * 0.05);
  ctx.fill();
  ctx.fillStyle = '#ffb02a';
  ctx.beginPath();
  ctx.moveTo(k * 0.48, -k * 0.62);
  ctx.lineTo(k * 0.62, -k * 0.58);
  ctx.lineTo(k * 0.48, -k * 0.54);
  ctx.fill();
  ctx.fillStyle = '#7a4a2a';
  const flap = fly ? Math.sin(t * 0.8) * 0.9 : 0.2;
  ctx.save();
  ctx.translate(-k * 0.05, -k * 0.42);
  ctx.rotate(-flap);
  ell(ctx, -k * 0.15, 0, k * 0.28, k * 0.12, 0.3);
  ctx.fill();
  ctx.restore();
  ctx.fillRect(-k * 0.55, -k * 0.42, k * 0.2, k * 0.08);
  ctx.restore();
}
function drawRain(ctx: C2, c: Cloud, X: (a: number, b: number) => number, Y: (a: number) => number, U: (v: number) => number, t: number, stop: number) {
  const gx = X(c.x, c.y), gy = Y(c.y), rx = U(c.r * scl(c.y)), ry = U(c.r * GSY), top = gy - U(ALT) + U(0.035);
  const fade = Math.min(1, c.mt / 6, (RAIN - c.mt + 8) / 10) * stop;
  if (fade <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = fade;
  ctx.fillStyle = lin(ctx, 0, top, 0, gy, [[0, 'rgba(150,190,240,.28)'], [1, 'rgba(150,190,240,.05)']]);
  ctx.beginPath();
  ctx.moveTo(gx - rx * 0.85, top);
  ctx.lineTo(gx + rx * 0.85, top);
  ctx.lineTo(gx + rx, gy);
  ctx.lineTo(gx - rx, gy);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,228,255,.95)';
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  const N = 54;
  for (let k = 0; k < N; k++) {
    const a = hsh(k + c.id * 99) * TAU, qq = Math.sqrt(hsh(k + 17 + c.id * 31)), ox = Math.cos(a) * qq, oy = Math.sin(a) * qq;
    const ph = (t * 0.07 + hsh(k + 5)) % 1, gxk = gx + ox * rx, gyk = gy + oy * ry, txk = gx + ox * rx * 0.85;
    const yy = top + (gyk - top) * ph, xx = txk + (gxk - txk) * ph, len = U(0.035);
    ctx.beginPath();
    ctx.moveTo(xx, yy);
    ctx.lineTo(xx + (gxk - txk) / Math.max(1, gyk - top) * len, yy + len);
    ctx.stroke();
    if (ph > 0.85) {
      ctx.strokeStyle = 'rgba(230,245,255,.8)';
      ell(ctx, gxk, gyk, U(0.012) * (ph - 0.8) * 5, U(0.005) * (ph - 0.8) * 5);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(200,228,255,.95)';
    }
  }
  ctx.restore();
}
function drawRainbow(ctx: C2, x: number, y: number, r: number, age: number) {
  const a = Math.min(1, age / 30, (260 - age) / 60) * 0.55;
  const cols = ['#ff5a5a', '#ff9a3a', '#ffe04a', '#6ad04a', '#4aa8ff', '#8a6aff'];
  ctx.save();
  ctx.globalAlpha = a;
  ctx.lineWidth = r * 0.07;
  const grow = Math.min(1, age / 40);
  cols.forEach((c, k) => {
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r * (1 - k * 0.07), Math.PI, Math.PI + Math.PI * grow);
    ctx.stroke();
  });
  ctx.restore();
}
/** 비구름 (얼굴 있음): 쉬는 중엔 작고 흐림, 먹구름은 짙고 찌릿 */
function drawCloudAt(ctx: C2, s: RainState, c: Cloud, X: (a: number, b: number) => number, Y: (a: number) => number, U: (v: number) => number, t: number) {
  const d = s.d;
  let cx = X(c.x, c.y), cy = Y(c.y) - U(ALT) + Math.sin(t * 0.04 + c.id * 2) * U(0.006);
  let size = (c.mode === 'idle' ? nextR(c) : c.r) / RR, alpha = 1;
  if (c.mode === 'fly') cy -= Math.sin(Math.PI * (c.mt / c.dur)) * U(0.04);
  if (c.mode === 'rest') {
    const q = c.mt / REST;
    size *= 0.55 + 0.45 * Math.max(0, (q - 0.4) / 0.6) + 0.1 * (1 - q);
    alpha = 0.55 + 0.45 * q;
  }
  const heavy = c.mode === 'idle' ? nextHeavy(d, c) : c.mode === 'rest' ? nextHeavy(d, c) && c.mt > REST * 0.5 : c.heavy;
  const k = U(0.115) * size;
  ctx.save();
  ctx.globalAlpha = alpha * (c.mode === 'rain' ? 0.93 : 1);
  if (c.mode === 'rain') cx += Math.sin(t * 0.5) * 1.2;
  const body = heavy ? ['#9a9ab8', '#6a6a8a', '#5a5a78'] : ['#ffffff', '#e8f0fa', '#c8d6ea'];
  const puffs: [number, number, number][] = [[-0.62, 0.12, 0.42], [-0.28, -0.2, 0.55], [0.18, -0.28, 0.6], [0.58, 0.02, 0.45], [0, 0.18, 0.55]];
  ctx.fillStyle = heavy ? 'rgba(40,40,70,.25)' : 'rgba(80,110,150,.2)';
  ell(ctx, cx, cy + k * 0.42, k * 1.1, k * 0.2);
  ctx.fill();
  ctx.strokeStyle = heavy ? 'rgba(40,40,70,.7)' : 'rgba(110,140,190,.6)';
  ctx.lineWidth = Math.max(2.5, k * 0.06);
  for (const [px, py, pr] of puffs) (ell(ctx, cx + px * k, cy + py * k, pr * k, pr * k * 0.92), ctx.stroke());
  for (const [px, py, pr] of puffs) {
    ctx.fillStyle = radg(ctx, cx + px * k - pr * k * 0.3, cy + py * k - pr * k * 0.4, 0, pr * k * 1.3, [[0, body[0]], [0.6, body[1]], [1, body[2]]]);
    ell(ctx, cx + px * k, cy + py * k, pr * k, pr * k * 0.92);
    ctx.fill();
  }
  // 얼굴
  const fy = cy + k * 0.02;
  ctx.strokeStyle = heavy ? '#2a2a44' : '#4a5a7a';
  ctx.fillStyle = heavy ? '#2a2a44' : '#3a4a6a';
  ctx.lineWidth = Math.max(1.4, k * 0.06);
  ctx.lineCap = 'round';
  for (const e of [-1, 1]) {
    const ex = cx + e * k * 0.25;
    if (c.mode === 'rain') {
      ctx.beginPath();
      ctx.moveTo(ex - k * 0.08, fy - k * 0.04);
      ctx.lineTo(ex + k * 0.08, fy + k * 0.0);
      ctx.stroke();
    } else if (c.mode === 'fly') {
      ell(ctx, ex, fy, k * 0.055, k * 0.07);
      ctx.fill();
    } else if (c.mode === 'rest') {
      ctx.beginPath();
      ctx.arc(ex, fy, k * 0.06, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();
    } else {
      const bl = (t + c.id * 50) % 180 < 6;
      if (bl) (ctx.beginPath(), ctx.moveTo(ex - k * 0.06, fy), ctx.lineTo(ex + k * 0.06, fy), ctx.stroke());
      else (ell(ctx, ex, fy, k * 0.05, k * 0.065), ctx.fill());
    }
    if (heavy && c.mode !== 'rest') {
      ctx.beginPath();
      ctx.moveTo(ex - e * k * 0.1, fy - k * 0.16);
      ctx.lineTo(ex + e * k * 0.08, fy - k * 0.1);
      ctx.stroke();
    }
  }
  ctx.fillStyle = heavy ? 'rgba(255,120,120,.35)' : 'rgba(255,140,160,.45)';
  for (const e of [-1, 1]) (ell(ctx, cx + e * k * 0.45, fy + k * 0.12, k * 0.09, k * 0.05), ctx.fill());
  ctx.fillStyle = heavy ? '#2a2a44' : '#4a5a7a';
  if (c.mode === 'rain') {
    ell(ctx, cx, fy + k * 0.17, k * 0.06, k * 0.08);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx, fy + k * 0.1, k * 0.08, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  if (heavy && c.mode !== 'rest') {
    for (let j = 0; j < 3; j++) {
      const a = t * 0.05 + j * 2.1, sx = cx + Math.cos(a) * k * 0.9, sy = cy + Math.sin(a) * k * 0.35;
      drawBoltMark(ctx, sx, sy + k * 0.2, k * 0.12, t + j * 7);
    }
  }
  if (c.mode === 'rest') {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let j = 0; j < 4; j++) {
      const a = t * 0.08 + j * (TAU / 4), r = k * (1.3 - (c.mt / REST) * 0.6);
      ell(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.4, k * 0.06, k * 0.06);
      ctx.fill();
    }
  }
  ctx.restore();
  // 아침 구름 표시 / 다음 비 (쉬는 중)
  if (c.mode === 'idle' && c.n === 0 && s.phase === 'play' && t - s.st0 < 600 && d.clouds === 1 && s.stage > 0) {
    ctx.font = `800 ${Math.max(12, U(0.032))}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.fillText('아침 구름은 넓게!', cx, cy - k * 0.8);
  }
}
function drawBolt(ctx: C2, x0: number, y0: number, x1: number, y1: number, k: number, age: number, seed: number) {
  const pts: [number, number][] = [[x0, y0]];
  const n = 7;
  for (let j = 1; j < n; j++) pts.push([x0 + (x1 - x0) * (j / n) + (hsh(seed + j) - 0.5) * k * 2.2, y0 + (y1 - y0) * (j / n)]);
  pts.push([x1, y1]);
  const a = 1 - age / 16;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [wd, col] of [[k * 0.7, `rgba(255,240,140,${(0.4 * a).toFixed(2)})`], [k * 0.3, `rgba(255,250,200,${a.toFixed(2)})`], [k * 0.12, `rgba(255,255,255,${a.toFixed(2)})`]] as [number, string][]) {
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.beginPath();
    for (const [x, y] of pts) ctx.lineTo(x, y);
    ctx.stroke();
  }
  ctx.restore();
}
/** 나비·벌: 핀 꽃으로 날아든다 (꽃이 핀 때부터 계산 — 상태 없이) */
function drawCritters(ctx: C2, s: RainState, X: (a: number, b: number) => number, Y: (a: number) => number, U: (v: number) => number, t: number) {
  // 늘 정원을 떠도는 나비 둘
  for (let j = 0; j < 2; j++) {
    const a = t * (0.006 + j * 0.002) + j * 3, gx = 0.5 + 0.38 * Math.sin(a) * Math.cos(a * 0.7 + j), gy = 0.55 + 0.4 * Math.sin(a * 1.3 + j * 2);
    drawButterfly(ctx, X(gx, gy), Y(gy) - U(0.11 + 0.03 * Math.sin(t * 0.05 + j)), U(0.024), t + j * 29, j ? '#ffe066' : '#9ad8ff');
  }
  const fl = s.P.filter((p) => p.k === 'bud' && p.st === 'bloom').sort((a, b) => b.t1 - a.t1).slice(0, 6);
  fl.forEach((p, j) => {
    const age = t - p.t1, tx = X(p.x, p.y), ty = Y(p.y) - U(0.08);
    const sx = j % 2 ? -U(0.1) : U(1.1), sy = U(0.3 + 0.1 * j);
    const arr = clamp01(age / 110), e = 1 - (1 - arr) ** 2;
    const ox = Math.cos(t * 0.04 + j * 2) * U(0.035) * arr, oy = Math.sin(t * 0.07 + j) * U(0.022) * arr - U(0.03);
    const x = sx + (tx - sx) * e + ox, y = sy + (ty - sy) * e + oy;
    if (j % 3 === 2) drawBee(ctx, x, y, U(0.022), t + j * 11);
    else drawButterfly(ctx, x, y, U(0.026), t + j * 13, FLOWER[(p.col + 2) % FLOWER.length][0]);
  });
}
function drawButterfly(ctx: C2, x: number, y: number, k: number, t: number, col: string) {
  const f = 0.25 + 0.75 * Math.abs(Math.sin(t * 0.35));
  ctx.save();
  ctx.translate(x, y);
  for (const e of [-1, 1]) {
    ctx.fillStyle = col;
    ell(ctx, e * k * 0.55 * f, -k * 0.25, k * 0.55 * f, k * 0.45, e * 0.3);
    ctx.fill();
    ctx.fillStyle = mix(col.length === 7 ? col : '#ffaacc', '#ffffff', 0.4);
    ell(ctx, e * k * 0.4 * f, k * 0.25, k * 0.35 * f, k * 0.3, -e * 0.3);
    ctx.fill();
  }
  ctx.fillStyle = '#3a2a2a';
  ell(ctx, 0, 0, k * 0.1, k * 0.45);
  ctx.fill();
  ctx.restore();
}
function drawHive(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ell(ctx, x, y + k * 0.05, k * 0.75, k * 0.2);
  ctx.fill();
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(x - k * 0.06, y - k * 0.5, k * 0.12, k * 0.5);
  rr(ctx, x - k * 0.6, y - k * 0.6, k * 1.2, k * 0.14, k * 0.04);
  ctx.fill();
  for (let j = 0; j < 4; j++) {
    const yy = y - k * (0.66 + j * 0.2), ww = k * (0.55 - j * 0.1);
    ctx.fillStyle = j % 2 ? '#f0c060' : '#e2a840';
    ell(ctx, x, yy, ww, k * 0.14);
    ctx.fill();
    ctx.strokeStyle = '#a06a20';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  ctx.fillStyle = '#5a3a1a';
  ell(ctx, x, y - k * 0.68, k * 0.12, k * 0.08);
  ctx.fill();
  for (let j = 0; j < 3; j++) {
    const a = t * 0.07 + j * 2.1;
    drawBee(ctx, x + Math.cos(a) * k * 0.9, y - k * 0.9 + Math.sin(a * 1.3) * k * 0.4, k * 0.28, t + j * 5);
  }
}
function drawBee(ctx: C2, x: number, y: number, k: number, t: number) {
  ctx.save();
  ctx.translate(x, y + Math.sin(t * 0.5) * 1.5);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  for (const e of [-1, 1]) (ell(ctx, e * k * 0.2, -k * 0.5, k * 0.28, k * 0.4 * (0.5 + 0.5 * Math.abs(Math.sin(t * 0.9))), e * 0.4), ctx.fill());
  ctx.fillStyle = '#ffd23a';
  ell(ctx, 0, 0, k * 0.55, k * 0.4);
  ctx.fill();
  ctx.fillStyle = '#2a2018';
  for (const e of [-0.15, 0.2]) ctx.fillRect(e * k - k * 0.06, -k * 0.38, k * 0.12, k * 0.76);
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, k: number, press: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.scale(1 - press * 0.08, 1 - press * 0.08);
  ctx.fillStyle = 'rgba(40,20,5,.28)';
  ell(ctx, k * 0.1, k * 1.25, k * 0.5, k * 0.16);
  ctx.fill();
  ctx.fillStyle = '#fff3e6';
  ctx.strokeStyle = '#7a4a2a';
  ctx.lineWidth = Math.max(1.5, k * 0.07);
  rr(ctx, -k * 0.16, -k * 0.95 + k, k * 0.32, k * 0.95, k * 0.16);
  ctx.fill();
  ctx.stroke();
  rr(ctx, -k * 0.45, -k * 0.15 + k, k * 0.95, k * 0.95, k * 0.3);
  ctx.fill();
  ctx.stroke();
  for (let q = 0; q < 2; q++) {
    rr(ctx, k * (0.12 + q * 0.2) - k * 0.1, -k * 0.35 + k, k * 0.22, k * 0.4, k * 0.1);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
const HINT = new WeakMap<object, [number, number]>();
/** 첫 손가락이 가리킬 자리: 봉오리가 가장 많이 모인 곳 */
export function hintTarget(s: RainState): [number, number] {
  const c = HINT.get(s);
  if (c) return c;
  let best: [number, number] = [0.5, 0.6], bn = -1;
  for (const [x, y] of CANDS) {
    const n = s.P.reduce((a, p) => a + (p.k === 'bud' && dist(p.x, p.y, x, y) < RB - 0.04 ? 1 + p.g : 0), 0);
    if (n > bn) (bn = n), (best = [x, y]);
  }
  HINT.set(s, best);
  return best;
}
function starText(s: RainState, k: StarK) {
  const d = s.d;
  return k === 'goal' ? `꽃 ${d.goal}송이 피우기` : k === 'weed' ? '잡초가 다 크지 않게' : k === 'cactus' ? '선인장은 젖지 않게' : k === 'par' ? `비 ${NUM[s.L.par] ?? s.L.par} 번 안에` : k === 'bee' ? '꿀벌이 줄줄이 세 송이' : '번개로 잡초 둘 태우기';
}
function drawHud(ctx: C2, s: RainState, d: StageDef, w: number, h: number, U: (v: number) => number, font: (sz: number, w?: number) => void, t: number) {
  const n = blooms(s);
  // ── 위 띠: 판 · 꽃 수 · 하트
  ctx.fillStyle = 'rgba(255,252,240,.93)';
  rr(ctx, U(0.02), U(0.015), w - U(0.04), U(0.075), U(0.037));
  ctx.fill();
  ctx.strokeStyle = 'rgba(90,120,60,.45)';
  ctx.lineWidth = 2;
  ctx.stroke();
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#3a5a2a';
  ctx.fillText(`${s.stage + 1}판 · ${d.name}`, U(0.05), U(0.053));
  // 꽃 수
  {
    const cx = U(0.53), cy = U(0.053), fr = U(0.02);
    for (let j = 0; j < 5; j++) {
      const a = (j / 5) * TAU - Math.PI / 2;
      ctx.fillStyle = '#ff8cc0';
      ell(ctx, cx + Math.cos(a) * fr * 0.7, cy + Math.sin(a) * fr * 0.7, fr * 0.5, fr * 0.5);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd84a';
    ell(ctx, cx, cy, fr * 0.42, fr * 0.42);
    ctx.fill();
    const fl = juice(s);
    if (fl.delta('hudN', n) > 0) fl.memo.hudT = t;
    const age = t - (fl.memo.hudT ?? -99);
    const sc = age < 14 ? 1 + 0.35 * Math.sin((age / 14) * Math.PI) : 1;
    ctx.save();
    ctx.translate(cx + U(0.035), cy);
    ctx.scale(sc, sc);
    font(0.05, 900);
    ctx.fillStyle = n >= d.goal ? '#e0601a' : '#3a5a2a';
    ctx.fillText(`${n}`, 0, U(0.002));
    const nw = ctx.measureText(`${n}`).width;
    font(0.034, 800);
    ctx.fillStyle = '#7a8a68';
    ctx.fillText(` / ${d.goal}`, nw, U(0.004));
    ctx.restore();
  }
  for (let k = 0; k < 3; k++) drawHeart(ctx, w - U(0.06) - k * U(0.055), U(0.052), U(0.019), k < s.hearts);
  // 바람 방향 알림
  if (d.wind) {
    const m = Math.hypot(s.wx * 0.9, s.wy * GSY) || 1, ax = (s.wx * 0.9) / m, ay = (s.wy * GSY) / m, px = U(0.13), py = U(0.125);
    ctx.fillStyle = 'rgba(255,252,240,.9)';
    rr(ctx, px - U(0.1), py - U(0.026), U(0.2), U(0.052), U(0.026));
    ctx.fill();
    font(0.034, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#3a6a9a';
    ctx.fillText('바람', px - U(0.085), py + 1);
    const cx = px + U(0.05), L = U(0.03) + Math.sin(t * 0.15) * U(0.004);
    ctx.strokeStyle = '#3a8ad0';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - ax * L, py - ay * L);
    ctx.lineTo(cx + ax * L, py + ay * L);
    const a = Math.atan2(ay, ax);
    ctx.lineTo(cx + ax * L - Math.cos(a - 0.6) * U(0.016), py + ay * L - Math.sin(a - 0.6) * U(0.016));
    ctx.moveTo(cx + ax * L, py + ay * L);
    ctx.lineTo(cx + ax * L - Math.cos(a + 0.6) * U(0.016), py + ay * L - Math.sin(a + 0.6) * U(0.016));
    ctx.stroke();
  }
  // 해 질 녘 경고
  const q = sunQ(s);
  if (s.phase === 'play' && q > 0.78) {
    const a = 0.6 + 0.4 * Math.sin(t * 0.2);
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(255,236,200,${a.toFixed(2)})`;
    ctx.strokeStyle = 'rgba(120,50,20,.6)';
    ctx.lineWidth = 3;
    const msg = `해가 져요! 꽃 ${Math.max(0, d.goal - n)}송이 더`;
    ctx.strokeText(msg, w / 2, U(0.125));
    ctx.fillText(msg, w / 2, U(0.125));
  }
  // ── 아래 띠: 별 약속
  const by = U(SY(DEP + 0.03) + 0.04);
  ctx.fillStyle = lin(ctx, 0, by, 0, h, [[0, '#6a8a3e'], [1, '#56742e']]);
  ctx.fillRect(0, by, w, h - by);
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.fillRect(0, by, w, 2);
  const live = d.stars.map((k) => (k === 'goal' ? n >= d.goal : k === 'weed' ? !s.weedFull : k === 'cactus' ? !s.cactusBad : k === 'par' ? s.rains <= s.L.par : k === 'bee' ? s.chain >= 3 : s.burns >= 2));
  const res = s.phase === 'result' && s.ok ? s.starOk : live;
  font(0.036, 800);
  ctx.textBaseline = 'middle';
  const items = d.stars.map((k, j) => {
    let txt = starText(s, k);
    if (k === 'par') txt += ` (${s.rains}/${s.L.par})`;
    if (k === 'burn') txt += ` (${Math.min(2, s.burns)}/2)`;
    if (k === 'bee') txt += ` (${Math.min(3, s.chain)}/3)`;
    return { txt, on: res[j], broken: !res[j] && k !== 'goal' && k !== 'burn' && k !== 'bee', tw: ctx.measureText(txt).width + U(0.075) };
  });
  const rows: (typeof items)[] = [[]];
  let rw = 0;
  for (const it of items) {
    if (rw + it.tw > w - U(0.06) && rows[rows.length - 1].length) rows.push([]), (rw = 0);
    rows[rows.length - 1].push(it);
    rw += it.tw + U(0.02);
  }
  const rowH = U(0.055), y0 = by + (h - by) / 2 - ((rows.length - 1) * rowH) / 2;
  rows.forEach((row, ri) => {
    const tot = row.reduce((a, it) => a + it.tw, 0) + U(0.02) * (row.length - 1);
    let cx = (w - tot) / 2;
    const cy = y0 + ri * rowH;
    for (const it of row) {
      ctx.fillStyle = it.on ? 'rgba(255,220,90,.28)' : 'rgba(0,0,0,.2)';
      rr(ctx, cx, cy - U(0.024), it.tw, U(0.048), U(0.024));
      ctx.fill();
      ctx.fillStyle = it.on ? GOLD : it.broken ? 'rgba(255,255,255,.2)' : 'rgba(255,255,255,.45)';
      starPath(ctx, cx + U(0.03), cy, U(0.019));
      ctx.fill();
      ctx.fillStyle = it.on ? '#fff6d0' : it.broken ? 'rgba(255,240,220,.55)' : '#f4ffe8';
      ctx.textAlign = 'left';
      ctx.fillText(it.txt, cx + U(0.058), cy + 1);
      if (it.broken && s.phase !== 'result') {
        ctx.strokeStyle = 'rgba(255,170,150,.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx + U(0.055), cy + 1);
        ctx.lineTo(cx + it.tw - U(0.015), cy + 1);
        ctx.stroke();
      }
      cx += it.tw + U(0.02);
    }
  });
  // ── 첫 안내
  if (s.stage === 0 && s.firstTap < 0 && s.phase === 'play') {
    const txt = '👆 꽃밭을 톡! 비가 와요';
    font(0.048, 900);
    const tw = ctx.measureText(txt).width + U(0.08), bx = w / 2, byy = U(0.4);
    ctx.fillStyle = 'rgba(40,70,30,.35)';
    rr(ctx, bx - tw / 2 + 2, byy - U(0.035) + 3, tw, U(0.07), U(0.035));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,253,240,.96)';
    rr(ctx, bx - tw / 2, byy - U(0.035), tw, U(0.07), U(0.035));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2e5a1e';
    ctx.fillText(txt, bx, byy + 1);
  }
  // ── 판 띠 (시작 · 결과)
  let head = '', sub = '', a = 0, age = 0;
  const mid = U(0.4);
  if (s.phase === 'result') {
    age = s.pt;
    a = Math.min(1, age / 8);
    if (s.ok) head = s.won ? '정원이 꽃밭이 됐다!' : `꽃밭 완성!${s.sunLeft > 0 ? ` 해가 ${s.sunLeft}초 남았어요` : ''}`;
    else (head = s.why === '해가 졌어요' ? '해가 졌어요…' : '앗, 꽃이 모자라요'), (sub = s.stage === 0 ? '첫 판은 연습 — 내일 아침 다시!' : s.hearts > 0 ? '하트 -1 · 같은 정원 다시' : '하트가 없어요');
  } else if (s.banner && t - s.banner.t < 190) {
    age = t - s.banner.t;
    // 읽고 톡 하면 바로 걷힌다 (구름이 날아가는 게 가려지지 않게)
    a = Math.min(1, age / 8, (190 - age) / 25) * (s.lastTap >= s.banner.t ? Math.max(0, 1 - (t - s.lastTap) / 14) : 1);
    (head = s.banner.head), (sub = s.banner.sub);
  }
  if (head && a > 0) {
    const pop = Math.min(1, 0.55 + age / 10);
    ctx.save();
    ctx.globalAlpha = a;
    font(0.052, 900);
    const w1 = ctx.measureText(head).width;
    font(0.036, 800);
    const w2 = sub ? ctx.measureText(sub).width : 0;
    const okRes = s.phase === 'result' && s.ok;
    const cw = Math.min(w - U(0.04), Math.max(w1, w2, okRes ? U(0.5) : 0) + U(0.1)), ch = (okRes ? U(0.2) : sub ? U(0.15) : U(0.09)) * pop;
    ctx.translate(w / 2, mid);
    ctx.fillStyle = 'rgba(30,60,20,.3)';
    rr(ctx, -cw / 2 + 3, -ch / 2 + 5, cw, ch, U(0.035));
    ctx.fill();
    ctx.fillStyle = lin(ctx, 0, -ch / 2, 0, ch / 2, [[0, '#fffdf2'], [1, '#eaf8dc']]);
    rr(ctx, -cw / 2, -ch / 2, cw, ch, U(0.035));
    ctx.fill();
    ctx.strokeStyle = '#5a8a3a';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.052, 900);
    ctx.fillStyle = s.phase === 'result' ? (s.ok ? '#d0501a' : '#5a6a88') : '#3a7a2a';
    if (okRes) {
      ctx.fillText(head, 0, -U(0.055), cw - U(0.04));
      const nS = s.starOk.length;
      for (let j = 0; j < nS; j++) {
        const ag = s.pt - (16 + j * 14), sx = (j - (nS - 1) / 2) * U(0.1), popS = ag < 0 ? 0.8 : ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1;
        starPath(ctx, sx, U(0.03), U(0.04) * popS);
        ctx.fillStyle = ag >= 0 && s.starOk[j] ? GOLD : 'rgba(60,80,40,.15)';
        ctx.fill();
        ctx.strokeStyle = ag >= 0 && s.starOk[j] ? '#9a5a08' : 'rgba(60,80,40,.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        const fx = juice(s);
        if (ag >= 0 && s.starOk[j] && (fx.memo['st' + j] ?? -1) < s.t - ag) (fx.memo['st' + j] = s.t - ag), fx.burst(w / 2 + sx, mid + U(0.03), '#ffd23a', 16, 3, 2.4);
      }
    } else {
      ctx.fillText(head, 0, sub ? -U(0.028) : U(0.002), cw - U(0.04));
      if (sub) {
        font(0.036, 800);
        ctx.fillStyle = sub.startsWith('NEW') ? '#d0402a' : '#4a6a2a';
        ctx.fillText(sub, 0, U(0.038), cw - U(0.04));
      }
    }
    ctx.restore();
  }
}
