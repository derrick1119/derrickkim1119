/**
 * 기우뚱 배 주차장 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 주차장 빼내기 × 기우는 바닥 × 가리키기(톡).
 * 뼈대(요즘 잘 팔리는 캐주얼): 물에 뜬 카페리 갑판이 주차장. 차마다 앞을 보는 방향이 있고, 톡 하면 그쪽으로 부릉 달려 나간다.
 *   앞길이 트였으면 갑판 길을 돌아 뱃머리 경사로로 내리고, 막혔으면 '빵!' 하고 앞차 바로 앞에서 멈춘다(실패 아님, 톡 한 번 씀).
 * 물리(우리 것, 결정적 고정 간격): 갑판은 차들의 무게 중심 쪽으로 기운다 — 기울기 θ는 목표(무게 모멘트 ÷ 복원력)를 향한
 *   스프링·감쇠로 출렁인다. θ가 일정 이상이면 브레이크 안 건 '옆으로 선 차'가 바퀴 방향(좌우)으로 데굴데굴 굴러간다
 *   (연속 위치 · 마찰 · 차끼리 부딪히면 운동량을 나눠 같이 밀림 · 벽에 콩 튕김). 굴러간 차는 다른 차의 길을 막기도 열기도 하고,
 *   굴러간 만큼 무게가 옮겨 가 배가 더 기운다. 빨간 선을 넘게 기울면 낮은 쪽 끝의 차가 난간 너머로 '풍덩' → 하트 -1, 그 판 다시.
 * 미리 보기 = 실제: 차를 누르고 있는 동안 지금 상태를 복사해 같은 물리로 끝까지 돌린 결과(달려갈 길·빵 자리, 굴러갈 차의 최종 위치 고스트,
 *   기울기 바늘, 풍덩 위험)를 그린다. 떼면 그대로 일어난다. 키보드는 화살표 커서 + 스페이스.
 * 판 8개: 목표 = 차를 모두 내리기. 별(쉬운 말) = 모두 내리기 · N번 안에 끝내기(2판부터) · 배를 노란 선 안으로(3판부터).
 * 펼쳐짐(판마다 새것 하나, 하는 일이 바뀐다): 1 첫 출항(톡·부릉) → 2 데굴데굴(옆으로 선 차가 굴러 길을 막고 엶)
 *   → 3 트럭(무거움: 언제 내릴지가 균형을 좌우) → 4 사이드 브레이크(안 구르는 벽 — 굴러올 차를 막아 줌)
 *   → 5 고장 난 차(못 달림 — 배를 일부러 기울여 옆문으로 굴려 내림) → 6 큰 물결(톡 3번마다 출렁 — 미리 균형)
 *   → 7 기름 웅덩이(살짝만 기울어도 미끄러짐) → 8 마지막 항해(전부).
 * 웃음: 운전자 표정(평소·놀람 '으아아'·빵! 화남·우쭐), 풍덩하면 운전자가 튜브 끼고 둥둥, 난간의 갈매기 구경꾼이 끼룩끼룩,
 *   선교의 고양이 선장은 배가 기울면 식은땀, 노란 선 넘으면 '어어어!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.5;
const EPS = 1e-6;
/** 갑판 주차 칸: 가로 GW칸 × 세로 GH칸 (차는 1×2, 트럭 1×3) */
export const GW = 5, GH = 6;
/** 기울기 스프링·감쇠(틱마다) */
const K_SP = 0.022, D_SP = 0.14;
/** 구르기: 기울기 1당 가속 · 마찰 · 최고 속도 · 벽 튕김 */
const G_ROLL = 0.0042, MU = 0.0007, VR = 0.15, E_B = 0.25;
/** 구르기 시작 기울기(정지 마찰) · 기름 위 · 풍덩 한계 · 노란 선 · 한계를 넘은 채 버티는 틱 */
const TH_S = 0.3, TH_OIL = 0.06, LIMIT = 1, YEL = 0.6, OVER_T = 10;
/** 달리기: 최고 속도 · 가속 · 칸 밖으로 이만큼 나가면 내린 것 */
const VD = 0.36, DA = 0.05, EXIT_M = 0.45;
/** 큰 물결: 톡 뒤 도착까지 · 세기 */
const WAVE_DELAY = 34, WAVE_AMP = 0.05;
const RESULT_OK = 190, RESULT_FAIL = 160, NEWS_T = 190, CARD_T = 170;
const STAR_PTS = 100, PERFECT_PTS = 100, WIN_PTS = 300;

export const CAR = 0, TRUCK = 1, BRAKE = 2, BROKEN = 3;

// ───────────────────────────── 판 ─────────────────────────────
interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  n: number; trucks: number; brakes: number; broken: number; oil: boolean; wave: number;
  /** 복원력: 클수록 덜 기운다 */
  S: number;
  /** 이 판의 별 조건 수 (1: 모두 내리기 · 2: + N번 안에 · 3: + 노란 선) */
  stars: number;
}
export const STAGES: StageDef[] = [
  { key: 'tap', name: '첫 출항', emoji: '🚗', news: '🚗 차를 톡 → 앞으로 부릉! 길이 트이면 내려요', tip: '앞이 트인 차부터 톡!', n: 5, trucks: 0, brakes: 0, broken: 0, oil: false, wave: 0, S: 5.5, stars: 1 },
  { key: 'block', name: '데굴데굴', emoji: '↔️', news: '↔️ 굴러간 차가 길을 막기도, 열어 주기도 해요', tip: '누르고 있으면 누가 어디로 구를지 보여요', n: 6, trucks: 0, brakes: 0, broken: 0, oil: false, wave: 0, S: 4, stars: 2 },
  { key: 'truck', name: '트럭 손님', emoji: '🚚', news: '🚚 무거운 트럭 — 내리면 배가 확 기울어요', tip: '트럭을 언제 내릴까? 노란 선을 넘지 않게', n: 5, trucks: 1, brakes: 0, broken: 0, oil: false, wave: 0, S: 3.7, stars: 3 },
  { key: 'brake', name: '주차 브레이크', emoji: '🅿️', news: '🅿️ 브레이크 건 차는 안 굴러요 — 굴러오는 차를 막아 줘요', tip: '브레이크 차는 벽 — 마지막까지 남겨 볼까?', n: 5, trucks: 0, brakes: 2, broken: 0, oil: false, wave: 0, S: 3.7, stars: 3 },
  { key: 'broken', name: '고장 난 차', emoji: '🛠️', news: '🛠️ 고장 난 차는 못 달려요 — 배를 기울여 옆문으로 굴려요', tip: '옆문 쪽이 무거워지게 — 고장 차가 데굴데굴 나가요', n: 6, trucks: 0, brakes: 0, broken: 1, oil: false, wave: 0, S: 4.3, stars: 3 },
  { key: 'wave', name: '큰 물결', emoji: '🌊', news: '🌊 톡 3번마다 큰 물결 — 배가 크게 출렁여요', tip: '물결 오기 전에 배를 반듯하게!', n: 7, trucks: 0, brakes: 0, broken: 0, oil: false, wave: 3, S: 3.7, stars: 3 },
  { key: 'oil', name: '기름 웅덩이', emoji: '🛢️', news: '🛢️ 기름 위 차는 살짝만 기울어도 미끄러져요', tip: '기름 위 차는 먼저 굴러가요', n: 7, trucks: 0, brakes: 0, broken: 0, oil: true, wave: 0, S: 3.7, stars: 3 },
  { key: 'all', name: '마지막 항해', emoji: '🎉', news: '🎉 마지막 배 — 트럭·브레이크·고장 차·물결 다 나와요!', tip: '무거운 것부터? 반듯하게부터?', n: 4, trucks: 1, brakes: 1, broken: 1, oil: false, wave: 4, S: 4.3, stars: 3 },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 물리 ─────────────────────────────
/** 차: o 0 = 옆으로 섬(가로, 좌우로 구름) · 1 = 세로로 섬(안 구름). d = 앞 방향(+1 오른쪽/아래, -1 왼쪽/위).
 *  lane = 가로 차는 줄(행), 세로 차는 칸(열). p = 바퀴 방향 위치(연속). st 0 주차·구름 · 1 달림 · 2 내림 · 3 풍덩 · 4 옆문으로 굴러 내림 */
export interface Car { o: number; d: number; lane: number; p: number; L: number; m: number; k: number; v: number; st: number; look: number }
export interface Ph { cars: Car[]; th: number; w: number; t: number; taps: number; bumps: number; over: number; maxT: number; fail: number; waveAt: number; waves: number; rest: boolean }
export interface Level { si: number; S: number; gates: number[]; oil: number[]; wave: number; par: number; init: Ph; nDrive: number }
type PE = { k: 'exit' | 'honk' | 'bump' | 'roll' | 'gate' | 'splash' | 'wave' | 'stop'; i: number; j?: number; v?: number };

const cloneCar = (c: Car): Car => ({ ...c });
export const clonePh = (P: Ph): Ph => ({ ...P, cars: P.cars.map(cloneCar) });
const cxOf = (c: Car) => (c.o === 0 ? c.p + c.L / 2 : c.lane + 0.5);
const cyOf = (c: Car) => (c.o === 0 ? c.lane + 0.5 : c.p + c.L / 2);
export const onDeck = (c: Car) => c.st <= 1;

function momentOf(P: Ph) {
  let m = 0;
  for (const c of P.cars) if (c.st <= 1) m += c.m * (cxOf(c) - GW / 2);
  return m;
}
export const targetOf = (L: Level, P: Ph) => momentOf(P) / L.S;

/** 차 i가 dir 쪽으로 갈 수 있는 거리와 막는 것(차 번호 · -1 벽 · -2 없음) */
export function gapAhead(L: Level, P: Ph, i: number, dir: number, drive: boolean): [number, number] {
  const c = P.cars[i], a0 = c.p, a1 = c.p + c.L, b0 = c.lane, b1 = c.lane + 1;
  let best = Infinity, who = -2;
  for (let j = 0; j < P.cars.length; j++) {
    if (j === i) continue;
    const o = P.cars[j];
    if (o.st > 1) continue;
    let oa0: number, oa1: number, ob0: number, ob1: number;
    if (o.o === c.o) (oa0 = o.p), (oa1 = o.p + o.L), (ob0 = o.lane), (ob1 = o.lane + 1);
    else (oa0 = o.lane), (oa1 = o.lane + 1), (ob0 = o.p), (ob1 = o.p + o.L);
    if (ob1 <= b0 + EPS || ob0 >= b1 - EPS) continue;
    const g = dir > 0 ? oa0 - a1 : a0 - oa1;
    if (g > -EPS && g < best) (best = Math.max(0, g)), (who = j);
  }
  if (!drive) {
    const lim = c.o === 0 ? GW : GH, gw = dir > 0 ? lim - a1 : a0;
    const gate = c.o === 0 && L.gates[c.lane] === dir;
    if (!gate && gw < best) (best = Math.max(0, gw)), (who = -1);
  }
  return [best, who];
}
const onOil = (L: Level, c: Car) => c.o === 0 && L.oil[c.lane * GW + Math.max(0, Math.min(GW - 1, Math.floor(c.p + c.L / 2)))] === 1;

/** 한 틱. rec가 있으면(진짜 판) 연출 사건을 남긴다 — 미리 보기·봇은 rec 없이 같은 규칙으로 돈다 */
export function physTick(L: Level, P: Ph, rec?: PE[]) {
  P.t++;
  const cars = P.cars, tgt = momentOf(P) / L.S;
  if (P.waveAt === P.t) {
    const side = P.waves % 2 ? 1 : -1;
    P.w += WAVE_AMP * side;
    P.waves++;
    rec?.push({ k: 'wave', i: -1, v: side });
  }
  P.w += K_SP * (tgt - P.th) - D_SP * P.w;
  P.th += P.w;
  const ath = Math.abs(P.th);
  if (ath > P.maxT) P.maxT = ath;
  let moving = false;
  for (let i = 0; i < cars.length; i++) {
    const c = cars[i];
    if (c.st === 1) {
      moving = true;
      const sp = Math.min(VD, Math.abs(c.v) + DA), [g, j] = gapAhead(L, P, i, c.d, true);
      if (g >= sp) {
        c.p += c.d * sp;
        c.v = c.d * sp;
        const lim = c.o === 0 ? GW : GH;
        if ((c.d > 0 && c.p + c.L > lim + EXIT_M) || (c.d < 0 && c.p < -EXIT_M)) (c.st = 2), (c.v = 0), rec?.push({ k: 'exit', i });
      } else {
        c.p += c.d * g;
        c.v = 0;
        c.st = 0;
        P.bumps++;
        rec?.push({ k: 'honk', i, j });
      }
      continue;
    }
    if (c.st !== 0 || c.o !== 0 || c.k === BRAKE) continue;
    const oil = onOil(L, c);
    if (c.v === 0 && ath <= (oil ? TH_OIL : TH_S)) continue;
    const was = c.v;
    let v = c.v + G_ROLL * P.th;
    const fr = oil ? MU * 0.25 : MU;
    if (Math.abs(v) <= fr) v = 0;
    else v -= Math.sign(v) * fr;
    if (v > VR) v = VR;
    else if (v < -VR) v = -VR;
    if (v === 0) {
      c.v = 0;
      continue;
    }
    const dir = v > 0 ? 1 : -1, [g, j] = gapAhead(L, P, i, dir, false);
    if (g >= Math.abs(v)) {
      c.p += v;
      c.v = v;
      if (was === 0 && rec) rec.push({ k: 'roll', i, v: dir });
    } else {
      c.p += dir * g;
      // 앞차가 브레이크 없이 같은 줄에 있고 그쪽으로 더 갈 수 있으면 운동량을 나눠 같이 밀린다. 꽉 막힌 줄은 벽처럼 튕긴다
      const o = j >= 0 ? cars[j] : null;
      if (o && o.o === 0 && o.st === 0 && o.k !== BRAKE && gapAhead(L, P, j, dir, false)[0] > 1e-9 && Math.abs((c.m * v + o.m * o.v) / (c.m + o.m)) > 0.004) {
        const vn = (c.m * v + o.m * o.v) / (c.m + o.m);
        c.v = vn;
        o.v = vn;
      } else {
        c.v = -E_B * v;
        if (Math.abs(c.v) < 0.004) c.v = 0;
      }
      if (rec && Math.abs(v - (o ? o.v : 0)) > 0.035) rec.push({ k: 'bump', i, j, v: Math.abs(v) });
    }
    // 옆문: 바퀴 방향 끝이 열린 줄이면 굴러 나간다
    if (L.gates[c.lane] && (c.p + c.L / 2 < -0.1 || c.p + c.L / 2 > GW + 0.1)) (c.st = 4), (c.v = 0), rec?.push({ k: 'gate', i });
    if (c.v !== 0) moving = true;
  }
  // 풍덩: 한계를 넘은 채 버티면 낮은 쪽 끝의 (브레이크 안 건) 차가 난간 너머로
  if (Math.abs(P.th) > LIMIT) P.over++;
  else P.over = 0;
  if (P.over >= OVER_T && !P.fail) {
    const sd = P.th > 0 ? 1 : -1;
    let pick = -1;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.st !== 0 || c.k === BRAKE) continue;
      const edge = sd > 0 ? (c.o === 0 ? c.p + c.L : c.lane + 1) >= GW - 0.02 : (c.o === 0 ? c.p : c.lane) <= 0.02;
      if (edge && (pick < 0 || c.m > cars[pick].m)) pick = i;
    }
    if (pick >= 0) (cars[pick].st = 3), (P.fail = 1), rec?.push({ k: 'splash', i: pick, v: sd });
  }
  const tg2 = momentOf(P) / L.S;
  if (!moving && P.waveAt < P.t && Math.abs(P.w) < 3e-4 && Math.abs(P.th - tg2) < 3e-3) {
    P.th = tg2;
    P.w = 0;
    P.rest = true;
  } else P.rest = false;
}

/** 차를 톡: 부릉 출발 (막혔는지는 다음 틱 물리가 정한다) */
export function startDrive(L: Level, P: Ph, i: number) {
  const c = P.cars[i];
  c.st = 1;
  c.v = 0;
  P.taps++;
  if (L.wave && P.taps % L.wave === 0) P.waveAt = P.t + WAVE_DELAY;
}
/** 잔잔해질 때까지 돌린다 (결과를 미리 아는 데 쓴다 — 진짜 판과 같은 틱 함수) */
export function settle(L: Level, P: Ph, max = 600, rec?: PE[]) {
  for (let k = 0; k < max; k++) {
    physTick(L, P, rec);
    if (P.fail || (P.rest && k > 1)) break;
  }
  return P;
}
export function tapSim(L: Level, P0: Ph, i: number, rec?: PE[]) {
  const P = clonePh(P0);
  startDrive(L, P, i);
  return settle(L, P, 600, rec);
}
export const remaining = (P: Ph) => P.cars.reduce((a, c) => a + (c.st <= 1 ? 1 : 0), 0);
/** 움직일 수 있는(톡 해서 조금이라도 가는) 차 */
export function movable(L: Level, P: Ph, i: number) {
  const c = P.cars[i];
  return c.st === 0 && c.k !== BROKEN && gapAhead(L, P, i, c.d, true)[0] > 0.01;
}
export const exitable = (L: Level, P: Ph, i: number) => P.cars[i].st === 0 && P.cars[i].k !== BROKEN && gapAhead(L, P, i, P.cars[i].d, true)[0] === Infinity;
/** 잔잔한데 어떤 차도 움직일 수 없다 = 꽉 막힘 */
export function stuck(L: Level, P: Ph) {
  if (!P.rest || !remaining(P)) return false;
  for (let i = 0; i < P.cars.length; i++) if (movable(L, P, i)) return false;
  return true;
}
export const starsOf = (L: Level, d: StageDef, P: Ph) => 1 + (d.stars >= 2 && P.taps <= L.par ? 1 : 0) + (d.stars >= 3 && P.maxT <= YEL ? 1 : 0);

// ───────────────────────────── 판 만들기 ─────────────────────────────
function placeCars(d: StageDef, r: Rng): { cars: Car[]; gates: number[]; oil: number[] } | null {
  const occ = new Uint8Array(GW * GH), cars: Car[] = [];
  const kinds: number[] = [];
  for (let k = 0; k < d.trucks; k++) kinds.push(TRUCK);
  for (let k = 0; k < d.broken; k++) kinds.push(BROKEN);
  for (let k = 0; k < d.brakes; k++) kinds.push(BRAKE);
  for (let k = 0; k < d.n; k++) kinds.push(CAR);
  const gates = new Array(GH).fill(0);
  let look = Math.floor(r() * 8);
  for (const k of kinds) {
    let ok = false;
    for (let tr = 0; tr < 80 && !ok; tr++) {
      // 고장 차·브레이크 차는 옆으로 선다(세로 차는 원래 안 구르니 브레이크가 뜻이 없다)
      const o = k === BROKEN || k === BRAKE ? 0 : r() < 0.5 ? 0 : 1, L = k === TRUCK ? 3 : 2;
      const lanes = o === 0 ? GH : GW, along = o === 0 ? GW : GH;
      const lane = Math.floor(r() * lanes), p = Math.floor(r() * (along - L + 1));
      if (k === BROKEN && (lane === 0 || lane === GH - 1)) continue;
      const cells: number[] = [];
      for (let q = 0; q < L; q++) cells.push(o === 0 ? lane * GW + p + q : (p + q) * GW + lane);
      if (cells.some((x) => occ[x])) continue;
      for (const x of cells) occ[x] = 1;
      const m = k === TRUCK ? 2.6 : 1;
      cars.push({ o, d: r() < 0.5 ? 1 : -1, lane, p, L, m, k, v: 0, st: 0, look: (look++) % 8 });
      if (k === BROKEN) gates[lane] = p + L / 2 < GW / 2 ? -1 : 1;
      ok = true;
    }
    if (!ok) return null;
  }
  // 고장 차는 옆문 쪽을 본다(그 줄에서 나가는 쪽)
  for (const c of cars) if (c.k === BROKEN) c.d = gates[c.lane];
  // 한 줄에서 서로 마주 보면 영영 못 나간다: 줄마다 앞쪽(-) 차들이 먼저, 뒤쪽(+) 차들이 나중에 오게 방향을 고른다
  for (let o = 0; o < 2; o++)
    for (let lane = 0; lane < (o === 0 ? GH : GW); lane++) {
      const inl = cars.filter((c) => c.o === o && c.lane === lane).sort((a, b) => a.p - b.p);
      if (inl.length < 2) continue;
      const fixed = inl.findIndex((c) => c.k === BROKEN);
      let split: number;
      if (fixed >= 0) split = inl[fixed].d < 0 ? fixed + 1 : fixed;
      else split = Math.floor(r() * (inl.length + 1));
      inl.forEach((c, k) => c.k !== BROKEN && (c.d = k < split ? -1 : 1));
      if (fixed >= 0 && inl.some((c, k) => c.k === BRAKE && (inl[fixed].d < 0 ? k < fixed : k > fixed))) return null;
    }
  const oil = new Array(GW * GH).fill(0);
  if (d.oil) {
    // 기름은 옆으로 선 보통 차 밑에 (그 줄 세 칸) — 그 차가 먼저 미끄러진다
    const hs = cars.filter((c) => c.o === 0 && c.k === CAR);
    if (!hs.length) return null;
    const c = hs[Math.floor(r() * hs.length)], x0 = Math.max(0, Math.min(GW - 3, Math.floor(c.p) - (r() < 0.5 ? 1 : 0)));
    for (let x = x0; x < x0 + 3; x++) oil[c.lane * GW + x] = 1;
  }
  return { cars, gates, oil };
}

type Pick = (L: Level, P: Ph, r: Rng) => number;
interface Out { ok: boolean; taps: number; maxT: number; rolls: number; first: number; seq: number[] }
function playout(L: Level, pick: Pick, r: Rng, maxTaps = 40): Out {
  let P = clonePh(L.init), rolls = 0, first = -1;
  const seq: number[] = [];
  const out = (ok: boolean): Out => ({ ok, taps: P.taps, maxT: P.maxT, rolls, first: Math.max(0, first), seq });
  while (true) {
    if (!remaining(P)) return out(true);
    if (P.fail || stuck(L, P) || P.taps >= maxTaps) return out(false);
    const i = pick(L, P, r);
    if (i < 0) return out(false);
    seq.push(i);
    const rec: PE[] = [];
    P = tapSim(L, P, i, rec);
    const n = rec.filter((e) => e.k === 'roll').length;
    rolls += n;
    if (first < 0) first = n;
  }
}
/** 아무 차나 톡 (판이 쉬운지 재는 데) */
const randomPick: Pick = (_L, P, r) => {
  const list: number[] = [];
  for (let i = 0; i < P.cars.length; i++) if (P.cars[i].st === 0 && P.cars[i].k !== BROKEN) list.push(i);
  return list.length ? list[Math.floor(r() * list.length)] : -1;
};
/** 나갈 수 있는 차 중 아무거나 (없으면 움직일 수 있는 아무 차) — 판의 별 셋 길이 얼마나 넓은지 재는 데 */
const exitPick: Pick = (L, P, r) => {
  const ex: number[] = [], mv: number[] = [];
  for (let i = 0; i < P.cars.length; i++) {
    if (exitable(L, P, i)) ex.push(i);
    else if (movable(L, P, i)) mv.push(i);
  }
  const list = ex.length ? ex : mv;
  return list.length ? list[Math.floor(r() * list.length)] : -1;
};
/** 앞(뱃머리) 쪽부터: 위에 있는 차일수록 먼저 */
const frontKey = (c: Car) => (c.o === 0 ? c.lane : c.p) * 10 + cxOf(c);
/** 버릇 하나: 지금 바로 나갈 수 있는 차 중 맨 앞(위)부터. 없으면 움직일 수 있는 맨 앞 차 */
export const habitPick: Pick = (L, P) => {
  let best = -1, bk = 1e9;
  for (let i = 0; i < P.cars.length; i++)
    if (exitable(L, P, i) && frontKey(P.cars[i]) < bk) (bk = frontKey(P.cars[i])), (best = i);
  if (best >= 0) return best;
  for (let i = 0; i < P.cars.length; i++)
    if (movable(L, P, i) && frontKey(P.cars[i]) < bk) (bk = frontKey(P.cars[i])), (best = i);
  return best;
};
/** 독립 버릇(판 고르기에 안 씀): 배가 기운(무거운) 쪽에서 나갈 수 있는 차부터 — 균형만 보는 버릇 */
export const habitPick2: Pick = (L, P) => {
  const sd = Math.abs(P.th) > 0.02 ? Math.sign(P.th) : Math.sign(momentOf(P)) || 1;
  let best = -1, bk = -1e9;
  for (let i = 0; i < P.cars.length; i++) if (exitable(L, P, i) && sd * cxOf(P.cars[i]) > bk) (bk = sd * cxOf(P.cars[i])), (best = i);
  if (best >= 0) return best;
  return habitPick(L, P, () => 0);
};

/** 내다보는 봇의 판단: 톡 결과(잔잔해질 때까지)를 2수 앞까지 시뮬레이션 */
function value(L: Level, d: StageDef, P: Ph): number {
  const rem = remaining(P);
  if (P.fail) return -1e6 - rem * 1000;
  let v = -rem * 1000 - P.taps * 420;
  if (d.stars >= 3 && P.maxT > YEL) v -= 1600;
  if (!rem) return v + 5000;
  let free = 0, mov = 0;
  for (let i = 0; i < P.cars.length; i++) {
    if (exitable(L, P, i)) free++;
    else if (movable(L, P, i)) mov++;
  }
  if (!free && !mov) return -5e5 - rem * 1000;
  v += free * 130 + mov * 15 - Math.abs(P.th) * 260;
  // 고장 차: 옆문 쪽으로 가까울수록
  for (const c of P.cars) if (c.st === 0 && c.k === BROKEN) v -= 40 * (L.gates[c.lane] > 0 ? GW - (c.p + c.L) : c.p);
  return v;
}
function candidates(L: Level, P: Ph) {
  const out: number[] = [];
  for (let i = 0; i < P.cars.length; i++) if (movable(L, P, i)) out.push(i);
  return out;
}
export function bestMove(L: Level, d: StageDef, P: Ph): number {
  const cand = candidates(L, P);
  if (!cand.length) return -1;
  if (cand.length === 1) return cand[0];
  const one = cand.map((i) => {
    const P1 = tapSim(L, P, i);
    return { i, P1, v: value(L, d, P1) };
  });
  one.sort((a, b) => b.v - a.v || a.i - b.i);
  let best = one[0].i, bv = -Infinity;
  for (let k = 0; k < one.length; k++) {
    const { i, P1 } = one[k];
    let v = one[k].v;
    if (k < 4 && !P1.fail && remaining(P1)) {
      let b2 = -Infinity;
      for (const j of candidates(L, P1)) b2 = Math.max(b2, value(L, d, tapSim(L, P1, j)));
      if (b2 > -Infinity) v = b2;
    }
    if (v > bv) (bv = v), (best = i);
  }
  return best;
}
const smartPick = (d: StageDef): Pick => (L, P) => bestMove(L, d, P);

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[si], r = mulberry32((seed * 7919 + si * 104729 + 13) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  // 놓기 시도는 넉넉히, 봇으로 재 보는 후보는 18개까지
  for (let c = 0, evals = 0; c < 400 && evals < 18; c++) {
    const pl = placeCars(d, r);
    if (!pl) continue;
    const init: Ph = { cars: pl.cars, th: 0, w: 0, t: 0, taps: 0, bumps: 0, over: 0, maxT: 0, fail: 0, waveAt: 0, waves: 0, rest: false };
    const L: Level = { si, S: d.S, gates: pl.gates, oil: pl.oil, wave: d.wave, par: 99, init, nDrive: pl.cars.filter((q) => q.k !== BROKEN).length };
    // 처음엔 잔잔하게: 놓자마자 굴러갈 차는 미리 굴려 둔다
    init.th = targetOf(L, init);
    settle(L, init);
    if (init.fail || Math.abs(init.th) > (c < 300 ? 0.4 : 0.55) || remaining(init) < pl.cars.length) continue;
    evals++;
    init.t = 0;
    init.maxT = Math.abs(init.th);
    init.waveAt = 0;
    const M = playout(L, smartPick(d), r);
    let v: number;
    if (si === 0) {
      // 첫 판: 아무렇게나 해도 거의 깨고, 첫 톡에 옆 차가 데굴 구르는 게 보이게
      L.par = M.taps + 2;
      const rp = rpass(L, r, 20);
      let wow = 0;
      for (let i = 0; i < init.cars.length && !wow; i++) {
        if (!exitable(L, init, i)) continue;
        const rec: PE[] = [];
        const P1 = tapSim(L, init, i, rec);
        if (!P1.fail && rec.some((e) => e.k === 'roll')) wow = 1;
      }
      v = (M.ok ? 1 : -3) + rp * 2 + wow;
    } else if (si === 1) {
      L.par = M.taps;
      const rp = rpass(L, r, 20);
      v = (M.ok ? 1 : -3) - Math.abs(rp - 0.75) * 2 + Math.min(M.rolls, 3) * 0.2;
    } else {
      L.par = M.taps;
      const H = playout(L, habitPick, r);
      const full = (o: Out) => o.ok && o.taps <= L.par && o.maxT <= YEL;
      const m3 = full(M), h3 = full(H);
      // 별 셋 길이 좁은 판: 나갈 수 있는 차를 아무 순서로 빼면 별 셋이 잘 안 나온다 (무엇을 먼저가 수가 되게)
      let wide = 0;
      if (m3 && !h3) for (let k = 0; k < 12; k++) if (full(playout(L, exitPick, r))) wide++;
      v = (m3 ? 2 : M.ok ? 0.4 : -3) + (h3 ? 0 : 1.6) + Math.min(M.rolls, 4) * 0.1 + (H.ok ? 0.2 : 0) + (1 - wide / 12) * 1.5;
      if (m3 && !h3 && M.rolls >= 2) v += 0.5;
    }
    if (v > bv) (bv = v), (pick = L);
    if (si >= 2 && bv >= 5.5) break;
    if (si === 0 && bv >= 3.9) break;
    if (si === 1 && c >= 5 && bv > 1.4) break;
  }
  if (!pick) throw new Error('ferrypark: no level');
  if (levelCache.size > 600) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}
function rpass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) if (playout(L, randomPick, r, 30).ok) ok++;
  return ok / n;
}
// 측정용 (스크래치 스크립트에서 쓴다)
export const _dev = { playout, randomPick, smartPick, rpass };

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 차마다 연출 상태 (시뮬레이션 결과와 무관): 표정 · 내린 뒤 길 · 풍덩 */
interface Vis { mood: number; moodT: number; outT: number; side: number; sx: number; sy: number; honkT: number; rollT: number }
export interface FerryState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'clear' | 'sink' | 'jam' | 'result'; pt: number;
  L: Level; P: Ph; vis: Vis[];
  down: boolean; ax: number; ay: number; press: number; lastTap: number; inputs: number; sameRun: number; sameMax: number; lastPick: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[]; startT: number; clearT: number;
  cap: number; capT: number; firstTap: boolean;
}

const ev = (s: FerryState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: FerryState, key: string, text: string, quiet = false) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (!quiet) s.newsQ.push(text);
}

// 화면 배치 (가로 0~1, 세로 0~A). 배는 가운데(SCX, SCY)를 축으로 기울어 보인다(그림만, 물리는 칸 좌표)
const CELL = 0.136, GX0 = 0.5 - (GW * CELL) / 2, GY0 = 0.33;
const GY1 = GY0 + GH * CELL;
const SCX = 0.5, SCY = GY0 + (GH * CELL) / 2;
const visAng = (th: number) => th * 0.12;
/** 칸 좌표 → 화면 좌표(기울기 반영) */
function g2s(th: number, gx: number, gy: number): [number, number] {
  const x = GX0 + gx * CELL - SCX, y = GY0 + gy * CELL - SCY, a = visAng(th), c = Math.cos(a), sn = Math.sin(a);
  return [SCX + x * c - y * sn, SCY + x * sn + y * c];
}
function s2g(th: number, sx: number, sy: number): [number, number] {
  const a = -visAng(th), c = Math.cos(a), sn = Math.sin(a), x = sx - SCX, y = sy - SCY;
  return [(SCX + x * c - y * sn - GX0) / CELL, (SCY + x * sn + y * c - GY0) / CELL];
}

function newStage(s: FerryState) {
  s.L = buildLevel(s.seed, s.stage);
  s.P = clonePh(s.L.init);
  s.vis = s.P.cars.map(() => ({ mood: 0, moodT: 0, outT: -1, side: 0, sx: 0, sy: 0, honkT: -99, rollT: -99 }));
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.startT = s.t;
  s.got = 0;
  s.starOk = [false, false, false];
  const d = STAGES[s.stage];
  see(s, d.key, d.news, true);
  ev(s, 'stage', 0.5, 0.7);
}

function finish(s: FerryState, ok: boolean, why = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  const d = STAGES[s.stage], P = s.P;
  if (ok) {
    const st = starsOf(s.L, d, P);
    s.starOk = [true, d.stars >= 2 && P.taps <= s.L.par, d.stars >= 3 && P.maxT <= YEL];
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + (d.stars >= 2 && st === d.stars ? PERFECT_PTS : 0);
    s.clearT = s.t;
    s.again = false;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.7, undefined, undefined, st);
    s.cap = 3;
    s.capT = s.t;
  } else {
    s.hearts--;
    s.tries++;
    s.why = why;
    s.again = true;
    ev(s, 'fail', 0.5, 0.7);
  }
}

/** 손가락 자리의 차 */
function pickCar(s: FerryState, x: number, y: number) {
  const [gx, gy] = s2g(s.P.th, x, y);
  let best = -1, bd = 0.62;
  s.P.cars.forEach((c, i) => {
    if (c.st !== 0) return;
    const x0 = c.o === 0 ? c.p : c.lane, x1 = c.o === 0 ? c.p + c.L : c.lane + 1, y0 = c.o === 0 ? c.lane : c.p, y1 = c.o === 0 ? c.lane + 1 : c.p + c.L;
    const dx = Math.max(x0 - gx, 0, gx - x1), dy = Math.max(y0 - gy, 0, gy - y1), dd = Math.hypot(dx, dy);
    if (dd < bd) (bd = dd), (best = i);
  });
  return best;
}

function tapCar(s: FerryState, i: number) {
  const c = s.P.cars[i];
  const [x, y] = g2s(s.P.th, cxOf(c), cyOf(c));
  if (c.k === BROKEN) {
    ev(s, 'broken', x, y, '푸스스… 고장! 굴려서 내려요', '#ffd7a8');
    s.vis[i].mood = 2;
    s.vis[i].moodT = s.t;
    return;
  }
  s.inputs++;
  if (s.lastPick === i) s.sameRun++;
  else s.sameRun = 1;
  s.sameMax = Math.max(s.sameMax, s.sameRun);
  s.lastPick = i;
  s.lastTap = s.t;
  s.firstTap = true;
  startDrive(s.L, s.P, i);
  s.vis[i].mood = 3;
  s.vis[i].moodT = s.t;
  ev(s, 'vroom', x, y, '부릉!', '#ffffff');
}

function onRec(s: FerryState, rec: PE[]) {
  const P = s.P;
  for (const e of rec) {
    const c = e.i >= 0 ? P.cars[e.i] : null, vs = e.i >= 0 ? s.vis[e.i] : null;
    const [x, y] = c ? g2s(P.th, cxOf(c), cyOf(c)) : [0.5, 0.8];
    if (e.k === 'exit' && c && vs) {
      vs.outT = s.t;
      vs.side = c.o === 0 ? (c.d > 0 ? 1 : 3) : c.d > 0 ? 2 : 0;
      vs.sx = cxOf(c);
      vs.sy = cyOf(c);
      vs.mood = 4;
      vs.moodT = s.t;
      ev(s, 'exit', x, y, ['안녕~', '내린다!', '부릉부릉~'][(s.t + e.i) % 3], '#d8ffc8');
    } else if (e.k === 'gate' && c && vs) {
      vs.outT = s.t;
      vs.side = c.d > 0 ? 5 : 6;
      vs.sx = cxOf(c);
      vs.sy = cyOf(c);
      vs.mood = 1;
      vs.moodT = s.t;
      ev(s, 'gate', x, y, c.k === BROKEN ? '데굴데굴… 옆문으로 쏙!' : '굴러서 내렸다!', '#fff1a8');
      see(s, 'gateout', '🚪 옆문으로 굴러 나가면 톡 없이 내려요');
    } else if (e.k === 'honk' && c && vs) {
      vs.honkT = s.t;
      vs.mood = 2;
      vs.moodT = s.t;
      ev(s, 'honk', x, y, '빵!', '#ffe0a8');
      see(s, 'honk', '📯 막히면 앞차 앞에서 빵! 멈춰요 (톡 한 번 써요)');
    } else if (e.k === 'roll' && c && vs) {
      if (s.t - vs.rollT > 40) ev(s, 'roll', x, y, '으아아~', '#ffffff');
      vs.rollT = s.t;
      vs.mood = 1;
      vs.moodT = s.t;
      see(s, 'roll', '↔️ 옆으로 선 차는 배가 기울면 굴러요');
    } else if (e.k === 'bump' && c) {
      ev(s, 'bump', x, y, '콩!', '#ffffff', e.v);
    } else if (e.k === 'wave') {
      ev(s, 'wave', e.v! > 0 ? 0.08 : 0.92, 0.9, '철썩!', '#d6f3ff', e.v);
    } else if (e.k === 'splash' && c && vs) {
      vs.outT = s.t;
      vs.side = e.v! > 0 ? 7 : 8;
      vs.sx = cxOf(c);
      vs.sy = cyOf(c);
      vs.mood = 5;
      vs.moodT = s.t;
      ev(s, 'splash', x, y, '풍덩!', '#bfe8ff', e.v);
      see(s, 'splash', '💦 빨간 선을 넘으면 끝 차가 풍덩!');
    }
  }
}

// ───────────────────────────── 게임 ─────────────────────────────
export const ferrypark: GameDef<FerryState> = {
  id: 'ferrypark',
  name: '기우뚱 배 주차장',
  genes: ['unpark', 'tiltdeck', 'pointer'],
  twist: '주차장이 물에 뜬 배라서 차 한 대를 뺄 때마다 배가 남은 차들의 무게 쪽으로 기우뚱 — 옆으로 선 차들이 데굴데굴 굴러가 다른 차의 길을 막거나 열고, 너무 기울면 끝 차가 풍덩 빠진다',
  rules: ['차를 톡 → 앞으로 부릉! 앞이 트이면 내리고, 막히면 빵! 멈춰요.', '배는 무거운 쪽으로 기울고, 옆으로 선 차는 굴러요. 빨간 선 넘으면 풍덩!'],
  controls: 'touch',
  hint: '차를 톡! 누르고 있으면 어떻게 될지 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '항구에 막 닿은 작은 카페리 갑판 주차장',
    mood: '청록 바다 위 빨간 선체의 작은 카페리, 철판 갑판에 흰 주차선과 노란 턱, 장난감 같은 동글동글한 차와 동물 운전자들 — 배가 기우뚱하면 차가 데굴데굴, 난간의 갈매기가 끼룩끼룩 구경하고 선교의 고양이 선장이 식은땀을 흘린다.',
    palette: { bg: '#0e4f63', ink: '#f4fbff', muted: '#a8d2dc', accent: '#ffd23f', hot: '#ff5a4f', soft: '#d9f1f5' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, vis: [],
      down: false, ax: 0, ay: 0, press: -1, lastTap: -99, inputs: 0, sameRun: 0, sameMax: 0, lastPick: -1,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], startT: 0, clearT: 0, cap: 0, capT: 0, firstTap: false,
    } as unknown as FerryState;
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
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    if (s.cap && s.t - s.capT > 120) s.cap = 0;
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
    const rec: PE[] = [];
    physTick(s.L, s.P, rec);
    if (rec.length) onRec(s, rec);
    const P = s.P;
    // 선장 표정: 기울기
    if (!s.cap || s.t - s.capT > 60) {
      const a = Math.abs(P.th);
      const cm = a > 0.85 ? 2 : a > YEL ? 1 : 0;
      if (cm !== s.cap && (cm > 0 || s.cap < 3)) (s.cap = cm), (s.capT = s.t);
    }
    if (s.phase === 'clear') {
      if (s.pt >= 50) finish(s, true);
      return;
    }
    if (s.phase === 'sink') {
      if (s.pt >= 100) finish(s, false, '풍덩! 차가 바다에 빠졌어요');
      return;
    }
    if (s.phase === 'jam') {
      if (s.pt >= 50) finish(s, false, '꽉 막혀서 더 못 빼요');
      return;
    }
    if (!remaining(P)) {
      s.phase = 'clear';
      s.pt = 0;
      return;
    }
    if (P.fail) {
      s.phase = 'sink';
      s.pt = 0;
      s.press = -1;
      return;
    }
    if (stuck(s.L, P)) {
      s.phase = 'jam';
      s.pt = 0;
      s.press = -1;
      ev(s, 'jam', 0.5, 0.8, '꽉 막혔다…', '#ffb4a8');
      return;
    }
    if (p) s.press = pickCar(s, p.x, p.y * A);
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      const y = s.ay * A;
      if (y > GY0 && y < GY1) ev(s, 'miss', s.ax, y, '차를 톡!', '#ffffff');
      return;
    }
    if (s.P.cars[k].st !== 0) return;
    tapCar(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
function at(s: FerryState, i: number): Input {
  const c = s.P.cars[i], [x, y] = g2s(s.P.th, cxOf(c), cyOf(c));
  return { tap: false, dir: 0, pointer: { x, y: y / A } };
}
const ready = (s: FerryState) => s.phase === 'play' && !s.down && s.P.rest && s.t - s.startT > 40 && s.t - s.lastTap > 12;
const brain = new WeakMap<object, { key: string; m: number }>();
/** 잘하는 봇: 톡 결과를 같은 물리로 2수 앞까지 돌려 보고 고른다 (잔잔할 때만 — 사람처럼 지켜보고 고른다) */
export const ferryparkSmart: Bot<FerryState> = {
  name: '노련한 갑판장',
  act(s) {
    if (!ready(s)) return NO;
    const key = `${s.stage}:${s.tries}:${s.P.taps}:${s.P.t}`;
    let m = brain.get(s);
    // 첫 판 첫 톡은 손가락이 가리키는 차(사람도 그걸 누른다), 그다음부터는 내다보고 고른다
    if (!m || m.key !== key) brain.set(s, (m = { key, m: s.stage === 0 && !s.firstTap ? hintCar(s) : bestMove(s.L, STAGES[s.stage], s.P) }));
    return m.m >= 0 ? at(s, m.m) : NO;
  },
};
/** 버릇 봇(판 고르기에 씀): 지금 바로 나갈 수 있는 차 중 맨 앞부터 */
export const ferryparkHabit: Bot<FerryState> = {
  name: '버릇: 나갈 수 있는 맨 앞 차부터',
  act(s) {
    if (!ready(s)) return NO;
    const m = habitPick(s.L, s.P, () => 0);
    return m >= 0 ? at(s, m) : NO;
  },
};
/** 독립 버릇 봇(판 고르기에 안 씀): 배가 기운 쪽에서 나갈 수 있는 차부터 */
export const ferryparkHabit2: Bot<FerryState> = {
  name: '버릇: 기운 쪽 차부터',
  act(s) {
    if (!ready(s)) return NO;
    const m = habitPick2(s.L, s.P, () => 0);
    return m >= 0 ? at(s, m) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 차나 톡 (가끔 엉뚱한 곳) */
export const ferryparkRandom: Bot<FerryState> = {
  name: '아무 차나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 30 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next || s.phase !== 'play') return NO;
    m.next = s.t + 40 + Math.floor(rng() * 100);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const list: number[] = [];
    s.P.cars.forEach((c, i) => c.st === 0 && list.push(i));
    if (rng() < 0.15 || !list.length) m.p = { x: rng(), y: rng() };
    else {
      const c = s.P.cars[list[Math.floor(rng() * list.length)]], [x, y] = g2s(s.P.th, cxOf(c), cyOf(c));
      m.p = { x: x + (rng() - 0.5) * 0.03, y: (y + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const CAR_COL = ['#ef4f4f', '#3d8bfd', '#ffc53d', '#3fbf6f', '#a65fe0', '#ff8a3d', '#22bfd0', '#f2649a'];
/** 운전자: 고양이 · 강아지 · 토끼 · 곰 · 개구리 · 돼지 · 여우 · 판다 */
const ANI_COL = ['#f6c48f', '#d9a46a', '#f4f0ec', '#a8754b', '#7fcf6a', '#f7b2bd', '#f08a3c', '#f7f7f7'];
// 화면 배치 (가로 0~1, 세로 0~A)
const HB = 0.066, PIER0 = 0.108, PIER1 = 0.218;
const HX0 = 0.088, HX1 = 0.912, HY0 = 0.252, HY1 = 1.27, BAND = 1.3;
const LANE_L = -0.24, LANE_R = GW + 0.24, LANE_T = -0.24, LANE_B = GH + 0.2;
const dX = (gx: number) => GX0 + gx * CELL, dY = (gy: number) => GY0 + gy * CELL;
const heading = (c: Car) => (c.o === 0 ? (c.d > 0 ? Math.PI / 2 : -Math.PI / 2) : c.d > 0 ? Math.PI : 0);

type XF = (v: number) => number;
interface Pre { P1: Ph; rec: PE[]; moved: number[]; gated: number[]; splash: number; fin: number; maxT: number; exit: boolean; honk: boolean; p1: number }
const pvCache = new WeakMap<object, { key: string; p: Pre }>();
/** 미리 보기 = 지금 상태를 복사해 같은 물리로 끝까지 돌린 결과 */
function preview(s: FerryState, k: number): Pre {
  const key = `${k}:${s.P.t}:${s.stage}:${s.tries}`, c0 = pvCache.get(s);
  if (c0 && c0.key === key) return c0.p;
  const rec: PE[] = [], P1 = tapSim(s.L, s.P, k, rec), P = s.P;
  const moved: number[] = [], gated: number[] = [];
  P.cars.forEach((c, j) => {
    if (j === k || c.st !== 0) return;
    const q = P1.cars[j];
    if (q.st === 4) gated.push(j);
    else if (q.st === 0 && Math.abs(q.p - c.p) > 0.05) moved.push(j);
  });
  const q = P1.cars[k];
  const p: Pre = { P1, rec, moved, gated, splash: P1.cars.findIndex((c) => c.st === 3), fin: P1.th, maxT: P1.maxT, exit: q.st === 2 || q.st === 4, honk: rec.some((e) => e.k === 'honk' && e.i === k), p1: q.p };
  pvCache.set(s, { key, p });
  return p;
}
const hintCache = new WeakMap<object, { key: string; k: number }>();
function hintCar(s: FerryState) {
  const key = `${s.stage}:${s.tries}`, c = hintCache.get(s);
  if (c && c.key === key) return c.k;
  // 첫 판 손가락: 굴러가는 게 보이는(그리고 안전한) 나갈 수 있는 차
  let k = -1, bv = -1e9;
  s.P.cars.forEach((_, i) => {
    if (!exitable(s.L, s.P, i)) return;
    const rec: PE[] = [], P1 = tapSim(s.L, s.P, i, rec);
    const v = (P1.fail ? -100 : 0) + rec.filter((e) => e.k === 'roll').length * 10 - cyOf(s.P.cars[i]);
    if (v > bv) (bv = v), (k = i);
  });
  hintCache.set(s, { key, k });
  return k;
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: FerryState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, P = s.P, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawSea(ctx, s, w, h, X, Y, R, t);
  drawBuoys(ctx, X, Y, R, t);
  drawPier(ctx, X, Y, R, w, t);
  const pressK = s.down && s.phase === 'play' ? s.press : -1;
  const pre = pressK >= 0 && P.cars[pressK].k !== BROKEN ? preview(s, pressK) : null;
  // ═════════ 배 (기울기만큼 돌려 그린다) ═════════
  ctx.save();
  ctx.translate(X(SCX), Y(SCY));
  ctx.rotate(visAng(P.th));
  ctx.translate(-X(SCX), -Y(SCY));
  drawShip(ctx, s, X, Y, R, t);
  const order = P.cars.map((_, i) => i).filter((i) => P.cars[i].st <= 1).sort((a, b) => cyOf(P.cars[a]) - cyOf(P.cars[b]));
  if (pre) drawPreviewUnder(ctx, s, pressK, pre, X, Y, R, t);
  for (const i of order) {
    const c = P.cars[i], vs = s.vis[i];
    let mood = vs.mood;
    if (t - vs.moodT > (mood === 4 ? 80 : 55)) mood = 0;
    if (c.o === 0 && c.st === 0 && Math.abs(c.v) > 0.01) mood = 1;
    if (Math.abs(P.th) > 0.82 && c.st === 0 && c.k !== BRAKE && (P.th > 0 ? (c.o === 0 ? c.p + c.L : c.lane + 1) > GW - 0.05 : (c.o === 0 ? c.p : c.lane) < 0.05)) mood = 5;
    if (c.k === BROKEN && mood === 0) mood = 6;
    const spin = c.o === 0 ? c.p * 3 : c.st === 1 ? c.p * 3 : 0;
    drawCar(ctx, X(dX(cxOf(c))), Y(dY(cyOf(c))), heading(c), c, R, t, { mood, spin, hot: i === pressK, wob: c.st === 0 ? Math.sin(t * 0.3 + i) * (Math.abs(P.w) * 40) : 0, honk: t - vs.honkT < 24 });
  }
  if (pre) drawPreviewOver(ctx, s, pressK, pre, X, Y, R, font, t);
  drawGulls(ctx, s, X, Y, R, t, true);
  ctx.restore();
  if (pre) drawTiltArrow(ctx, pre, X, Y, R, t);
  drawWaveChip(ctx, s, X, Y, R, t);
  // NEW 스포트라이트 (판 시작 직후)
  drawSpot(ctx, s, X, Y, R, font, t);
  // ═════════ 내린 차 · 옆문 · 풍덩 ═════════
  for (let i = 0; i < P.cars.length; i++) {
    const vs = s.vis[i];
    if (vs.outT >= 0) drawGone(ctx, s, i, X, Y, R, t);
  }
  drawGulls(ctx, s, X, Y, R, t, false);
  // 첫 판: 손가락
  if (s.stage === 0 && !s.firstTap && s.phase === 'play' && t - s.startT > 15 && !s.down) {
    const k = hintCar(s);
    if (k >= 0) {
      const c = P.cars[k], [x, y] = g2s(P.th, cxOf(c), cyOf(c)), bob = Math.sin(t * 0.15) * R(0.012);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), R(0.075) + Math.sin(t * 0.15) * 2, 0, TAU);
      ctx.stroke();
      ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', X(x) + R(0.03), Y(y) + R(0.085) + bob);
    }
  }
  // 햇빛 번짐 (왼쪽 위)
  const sun = ctx.createRadialGradient(X(0.1), Y(0.1), R(0.02), X(0.2), Y(0.3), R(0.9));
  sun.addColorStop(0, 'rgba(255,248,215,.32)');
  sun.addColorStop(0.4, 'rgba(255,240,200,.1)');
  sun.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
  // 가장자리 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.5, R(0.5), w / 2, h * 0.5, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,20,30,.3)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    y = Math.max(Y(0.3), Math.min(Y(1.2), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 40 && Math.abs(q.x - x) < w * 0.3 && Math.abs(q.y - y) < size + 4); k++) y -= size + 5;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  let rolls = 0;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'vroom') fx.burst(x, y, '#d9e2e8', 8, 1.8, 2.2), say(x, y - R(0.06), e.text!, e.col!, 14);
    if (e.kind === 'exit') fx.burst(x, y, '#c8ffb0', 12, 2.6, 2), say(x, y - R(0.04), e.text!, e.col!, 15);
    if (e.kind === 'gate') fx.burst(x, y, '#fff1a8', 18, 3.2, 2.4), fx.ring(x, y, '#fff1a8', R(0.12), 4), fx.kick(3), say(x, y - R(0.06), e.text!, e.col!, 16);
    if (e.kind === 'honk') fx.ring(x, y, '#ffe0a8', R(0.08), 3), fx.kick(2.5), say(x, y - R(0.07), e.text!, e.col!, 20);
    if (e.kind === 'roll') rolls++, say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'bump') fx.burst(x, y, '#e8eef2', 6, 1.6 + (e.v ?? 0) * 12, 1.6), fx.kick(1 + (e.v ?? 0) * 25), say(x, y, e.text!, e.col!, 13);
    if (e.kind === 'wave') fx.kick(7), fx.burst(x, y, '#d6f3ff', 30, 5, 3), fx.burst(x, Y(0.6), '#ffffff', 16, 4, 2.4), say(w / 2, Y(0.62), '🌊 철썩! 큰 물결', '#d6f3ff', 20);
    if (e.kind === 'splash') fx.kick(10), fx.blink('#bfe8ff', 0.3), say(x, y - R(0.05), e.text!, e.col!, 26);
    if (e.kind === 'broken') say(x, y - R(0.06), e.text!, e.col!, 14), fx.burst(x, y, '#9aa0a6', 10, 1.4, 3);
    if (e.kind === 'miss') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'jam') fx.kick(6), fx.blink(th.hot, 0.2), say(w / 2, Y(0.7), e.text!, e.col!, 20);
    if (e.kind === 'stage') fx.blink('#ffffff', 0.15);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.62), '#ffe066', 50, 6, 3.2), fx.burst(X(0.5), Y(0.62), '#7fe0ff', 34, 5, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.36), 6), fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.2);
  }
  if (rolls >= 2) fx.kick(4), say(w / 2, Y(0.5), rolls >= 3 ? `출렁~! ${rolls}대가 데굴데굴!` : '출렁~! 데굴데굴!', '#fff3b0', 22);
  fx.memo.t = t;
  ctx.restore();
  drawHud(ctx, s, d, w, X, Y, R, font, th, pre, pressK);
}

// ───────── 바다 · 부두 ─────────
function drawSea(ctx: CanvasRenderingContext2D, s: FerryState, w: number, h: number, X: XF, Y: XF, R: XF, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2aa7b8');
  g.addColorStop(0.5, '#15809a');
  g.addColorStop(1, '#0b5a73');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 26; k++) {
    const yy = 0.2 + (k / 26) * 1.15, xx = hsh(k + 7) * 1.1 - 0.05, len = 0.05 + hsh(k + 21) * 0.06, ph = t * 0.03 + k;
    ctx.globalAlpha = 0.25 + 0.25 * Math.sin(ph);
    ctx.beginPath();
    for (let q = 0; q <= 6; q++) {
      const x = xx + (q / 6) * len + Math.sin(t * 0.01 + k) * 0.02;
      ctx.lineTo(X(x), Y(yy + Math.sin(q * 1.4 + ph) * 0.004));
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // 배 둘레 거품 (낮은 쪽이 더 많이)
  const th = s.P.th;
  for (const sd of [-1, 1]) {
    const low = Math.max(0, sd * th), x0 = sd < 0 ? HX0 : HX1;
    ctx.fillStyle = `rgba(235,250,255,${0.25 + low * 0.45})`;
    for (let k = 0; k < 14; k++) {
      const yy = HY0 + 0.05 + (k / 14) * (HY1 - HY0 - 0.05), r = 0.008 + low * 0.012 + 0.004 * Math.sin(t * 0.12 + k * 1.7);
      const [x, y] = g2sRaw(th, x0 + sd * 0.006, yy);
      ctx.beginPath();
      ctx.arc(X(x), Y(y), R(Math.max(0.003, r)), 0, TAU);
      ctx.fill();
    }
  }
}
/** 물에 뜬 부표 (화면 가장자리 물) */
function drawBuoys(ctx: CanvasRenderingContext2D, X: XF, Y: XF, R: XF, t: number) {
  for (const [x, y, k] of [[0.04, 0.52, 0], [0.962, 1.08, 1]] as [number, number, number][]) {
    const bob = Math.sin(t * 0.06 + k * 2) * R(0.006), r = R(0.016);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath();
    ctx.ellipse(X(x), Y(y) + r * 0.9, r * 1.4, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = k ? '#ffd23f' : '#ff5a4f';
    ctx.beginPath();
    ctx.arc(X(x), Y(y) + bob, r, Math.PI, TAU);
    ctx.fill();
    ctx.fillRect(X(x) - r * 0.25, Y(y) + bob - r * 2.2, r * 0.5, r * 1.3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(X(x) - r, Y(y) + bob - r * 0.2, r * 2, r * 0.25);
  }
}
/** 화면 좌표(정규) → 배를 돌린 화면 좌표 */
function g2sRaw(th: number, x: number, y: number): [number, number] {
  const a = visAng(th), c = Math.cos(a), sn = Math.sin(a), dx = x - SCX, dy = y - SCY;
  return [SCX + dx * c - dy * sn, SCY + dx * sn + dy * c];
}
function drawPier(ctx: CanvasRenderingContext2D, X: XF, Y: XF, R: XF, w: number, t: number) {
  // 하늘 + 마을
  const sky = ctx.createLinearGradient(0, 0, 0, Y(PIER0));
  sky.addColorStop(0, '#9fe3f2');
  sky.addColorStop(1, '#d9f6fb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Y(PIER0));
  const roofs = ['#e2574c', '#3d8bfd', '#ffc53d', '#3fbf6f', '#a65fe0', '#ff8a3d'];
  for (let k = 0; k < 9; k++) {
    const x = 0.02 + k * 0.115 + hsh(k) * 0.02, hh = 0.022 + hsh(k + 3) * 0.018, ww = 0.075;
    if (k === 6) {
      // 등대
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(X(x + 0.02), Y(PIER0 - 0.06), R(0.03), R(0.06));
      ctx.fillStyle = '#e2574c';
      ctx.fillRect(X(x + 0.02), Y(PIER0 - 0.045), R(0.03), R(0.012));
      ctx.fillRect(X(x + 0.02), Y(PIER0 - 0.022), R(0.03), R(0.01));
      ctx.fillStyle = `rgba(255,240,150,${0.6 + 0.4 * Math.sin(t * 0.08)})`;
      ctx.beginPath();
      ctx.arc(X(x + 0.035), Y(PIER0 - 0.066), R(0.012), 0, TAU);
      ctx.fill();
      continue;
    }
    ctx.fillStyle = mix('#fff4e2', roofs[k % 6], 0.15);
    ctx.fillRect(X(x), Y(PIER0 - hh), R(ww), R(hh));
    ctx.fillStyle = roofs[k % 6];
    ctx.beginPath();
    ctx.moveTo(X(x - 0.006), Y(PIER0 - hh));
    ctx.lineTo(X(x + ww / 2), Y(PIER0 - hh - 0.02));
    ctx.lineTo(X(x + ww + 0.006), Y(PIER0 - hh));
    ctx.fill();
    ctx.fillStyle = 'rgba(60,90,120,.6)';
    ctx.fillRect(X(x + 0.015), Y(PIER0 - hh + 0.007), R(0.014), R(0.01));
    ctx.fillRect(X(x + 0.045), Y(PIER0 - hh + 0.007), R(0.014), R(0.01));
  }
  // 부두 널빤지
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.fillRect(0, Y(PIER1), w, R(0.016));
  const pg = ctx.createLinearGradient(0, Y(PIER0), 0, Y(PIER1));
  pg.addColorStop(0, '#c99a62');
  pg.addColorStop(1, '#a87a48');
  ctx.fillStyle = pg;
  ctx.fillRect(0, Y(PIER0), w, Y(PIER1 - PIER0));
  ctx.strokeStyle = 'rgba(90,55,25,.35)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1; x += 0.045) (ctx.beginPath(), ctx.moveTo(X(x), Y(PIER0)), ctx.lineTo(X(x), Y(PIER1)), ctx.stroke());
  // 부두 길
  ctx.fillStyle = '#5f6b75';
  ctx.fillRect(0, Y(0.142), w, R(0.05));
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.setLineDash([R(0.03), R(0.025)]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, Y(0.167));
  ctx.lineTo(w, Y(0.167));
  ctx.stroke();
  ctx.setLineDash([]);
  // 말뚝
  for (const x of [0.07, 0.3, 0.7, 0.93]) {
    ctx.fillStyle = '#3b3f45';
    ctx.beginPath();
    ctx.ellipse(X(x), Y(PIER1 - 0.008), R(0.014), R(0.009), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5b6068';
    ctx.beginPath();
    ctx.ellipse(X(x), Y(PIER1 - 0.013), R(0.012), R(0.007), 0, 0, TAU);
    ctx.fill();
  }
}

// ───────── 배 ─────────
function drawShip(ctx: CanvasRenderingContext2D, s: FerryState, X: XF, Y: XF, R: XF, t: number) {
  const L = s.L, P = s.P;
  // 선체 옆면(3/4로 보이는 두께) — 높은 쪽 옆구리가 더 드러난다
  ctx.fillStyle = 'rgba(0,30,40,.35)';
  ctx.beginPath();
  ctx.roundRect(X(HX0) + R(0.01), Y(HY0) + R(0.05), X(HX1 - HX0), Y(HY1 - HY0), R(0.06));
  ctx.fill();
  ctx.fillStyle = '#a92d2d';
  ctx.beginPath();
  ctx.roundRect(X(HX0), Y(HY0) + R(0.032), X(HX1 - HX0), Y(HY1 - HY0), R(0.06));
  ctx.fill();
  const hi = -Math.sign(P.th), bw = 0.006 + 0.03 * Math.min(1.2, Math.abs(P.th));
  if (Math.abs(P.th) > 0.02) {
    ctx.fillStyle = '#c23a3a';
    ctx.beginPath();
    ctx.roundRect(hi < 0 ? X(HX0 - bw) : X(HX1 - 0.02), Y(HY0 + 0.04), R(bw + 0.02), Y(HY1 - HY0 - 0.02), R(0.02));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(hi < 0 ? X(HX0 - bw) : X(HX1 + bw - 0.006), Y(HY0 + 0.1), R(0.004), Y(HY1 - HY0 - 0.18));
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(X(HX0 + 0.04), Y(HY1) + R(0.012), X(HX1 - HX0 - 0.08), R(0.006));
  // 갑판
  const dg = ctx.createLinearGradient(X(HX0), 0, X(HX1), 0);
  const lo = P.th;
  dg.addColorStop(0, lo < 0 ? '#566e7c' : '#73899a');
  dg.addColorStop(0.5, '#6a8292');
  dg.addColorStop(1, lo > 0 ? '#566e7c' : '#73899a');
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.roundRect(X(HX0), Y(HY0), X(HX1 - HX0), Y(HY1 - HY0), R(0.06));
  ctx.fill();
  // 뱃전(빨간 테두리)
  ctx.strokeStyle = '#d64545';
  ctx.lineWidth = R(0.012);
  ctx.beginPath();
  ctx.roundRect(X(HX0) + R(0.006), Y(HY0) + R(0.006), X(HX1 - HX0) - R(0.012), Y(HY1 - HY0) - R(0.012), R(0.055));
  ctx.stroke();
  // 갑판 길 (아스팔트)
  ctx.fillStyle = '#4a5b66';
  ctx.beginPath();
  ctx.roundRect(X(dX(LANE_L - 0.27)), Y(dY(LANE_T - 0.27)), R((LANE_R - LANE_L + 0.54) * CELL), R((LANE_B - LANE_T + 0.5) * CELL), R(0.035));
  ctx.fill();
  // 길 가운데 노란 점선 + 뱃머리로 가는 화살표
  ctx.strokeStyle = 'rgba(255,214,80,.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([R(0.022), R(0.02)]);
  ctx.beginPath();
  ctx.moveTo(X(dX(LANE_L)), Y(dY(LANE_B)));
  ctx.lineTo(X(dX(LANE_L)), Y(dY(LANE_T)));
  ctx.lineTo(X(dX(LANE_R)), Y(dY(LANE_T)));
  ctx.lineTo(X(dX(LANE_R)), Y(dY(LANE_B)));
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (const gx of [LANE_L, LANE_R])
    for (const gy of [1.5, 4.5]) {
      const x = X(dX(gx)), y = Y(dY(gy));
      ctx.beginPath();
      ctx.moveTo(x, y - R(0.022));
      ctx.lineTo(x - R(0.012), y);
      ctx.lineTo(x + R(0.012), y);
      ctx.fill();
    }
  // 주차 구역 (철판 무늬)
  const x0 = X(GX0), y0 = Y(GY0), gw = R(GW * CELL), gh = R(GH * CELL);
  const pg = ctx.createLinearGradient(x0, y0, x0 + gw, y0 + gh);
  pg.addColorStop(0, '#8aa0ae');
  pg.addColorStop(1, '#748b9a');
  ctx.fillStyle = pg;
  ctx.fillRect(x0, y0, gw, gh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, gw, gh);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx < GW * 4; gx++)
    for (let gy = 0; gy < GH * 4; gy++) {
      const cx = x0 + ((gx + 0.5) / 4) * R(CELL), cy = y0 + ((gy + 0.5) / 4) * R(CELL), q = (gx + gy) % 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(cx - R(0.006), cy - q * R(0.006));
      ctx.lineTo(cx + R(0.006), cy + q * R(0.006));
      ctx.stroke();
    }
  // 기름 웅덩이: 줄마다 한 덩어리 (차 밑에서 무지갯빛이 비어져 나온다)
  for (let gy = 0; gy < GH; gy++) {
    let a = -1, b = -1;
    for (let gx = 0; gx < GW; gx++) if (L.oil[gy * GW + gx]) (a = a < 0 ? gx : a), (b = gx + 1);
    if (a < 0) continue;
    const ox = X(dX(a - 0.12)), oy = Y(dY(gy - 0.12)), ow = R((b - a + 0.24) * CELL), oh = R(1.24 * CELL);
    ctx.fillStyle = 'rgba(28,22,40,.82)';
    ctx.beginPath();
    ctx.ellipse(ox + ow / 2, oy + oh / 2, ow / 2, oh / 2, 0, 0, TAU);
    ctx.fill();
    const rg = ctx.createLinearGradient(ox, oy, ox + ow, oy + oh);
    const ph = (t * 0.004) % 1;
    ['rgba(255,80,160,.35)', 'rgba(255,220,80,.3)', 'rgba(80,230,160,.32)', 'rgba(80,160,255,.35)', 'rgba(200,90,255,.32)'].forEach((c, k) => rg.addColorStop((k / 5 + ph) % 1, c));
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.ellipse(ox + ow / 2, oy + oh / 2, ow / 2 - 3, oh / 2 - 3, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.5;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(ox + ow * (0.25 + k * 0.25), oy + oh * (0.3 + (k % 2) * 0.35), ow * 0.08, oh * 0.08, 0, 3.6, 5.6);
      ctx.stroke();
    }
  }
  // 주차선
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = 1.2;
  for (let gx = 1; gx < GW; gx++) (ctx.beginPath(), ctx.moveTo(X(dX(gx)), y0), ctx.lineTo(X(dX(gx)), y0 + gh), ctx.stroke());
  for (let gy = 1; gy < GH; gy++) (ctx.beginPath(), ctx.moveTo(x0, Y(dY(gy))), ctx.lineTo(x0 + gw, Y(dY(gy))), ctx.stroke());
  ctx.restore();
  // 노란 턱 (구르는 차가 멈추는 곳) — 옆문 줄은 열려 있다
  const strip = (ax: number, ay: number, bx: number, by: number) => {
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.round(len / R(0.03)));
    for (let k = 0; k < n; k++) {
      ctx.strokeStyle = k % 2 ? '#2b2b2b' : '#ffd23f';
      ctx.lineWidth = R(0.011);
      ctx.beginPath();
      ctx.moveTo(ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n);
      ctx.lineTo(ax + ((bx - ax) * (k + 1)) / n, ay + ((by - ay) * (k + 1)) / n);
      ctx.stroke();
    }
  };
  const e = R(0.006);
  strip(x0 - e, y0 - e, x0 + gw + e, y0 - e);
  strip(x0 - e, y0 + gh + e, x0 + gw + e, y0 + gh + e);
  for (let gy = 0; gy < GH; gy++) {
    if (L.gates[gy] !== -1) strip(x0 - e, Y(dY(gy)), x0 - e, Y(dY(gy + 1)));
    if (L.gates[gy] !== 1) strip(x0 + gw + e, Y(dY(gy)), x0 + gw + e, Y(dY(gy + 1)));
  }
  // 난간 + 구명 튜브 (옆문 자리는 열림)
  for (const sd of [-1, 1]) {
    const rx = sd < 0 ? X(HX0 + 0.012) : X(HX1 - 0.012);
    ctx.strokeStyle = '#f2f6f8';
    ctx.lineWidth = 2;
    let gyOpen = -1;
    for (let gy = 0; gy < GH; gy++) if (L.gates[gy] === sd) gyOpen = gy;
    const segs: [number, number][] = gyOpen < 0 ? [[HY0 + 0.05, HY1 - 0.05]] : [[HY0 + 0.05, dY(gyOpen) - 0.005], [dY(gyOpen + 1) + 0.005, HY1 - 0.05]];
    for (const [a, b] of segs) {
      ctx.beginPath();
      ctx.moveTo(rx, Y(a));
      ctx.lineTo(rx, Y(b));
      ctx.stroke();
      for (let y = a; y <= b + 1e-6; y += 0.07) {
        ctx.fillStyle = '#dfe7ec';
        ctx.beginPath();
        ctx.arc(rx, Y(y), R(0.006), 0, TAU);
        ctx.fill();
      }
    }
    if (gyOpen >= 0) {
      // 옆문: 열린 난간 밖에 주황 부교 + 견인차 갈고리
      const gy0 = Y(dY(gyOpen)), gy1 = Y(dY(gyOpen + 1)), ox = sd < 0 ? X(HX0) - R(0.05) : X(HX1);
      ctx.fillStyle = '#ff9f43';
      ctx.fillRect(ox, gy0 + R(0.01), R(0.05), gy1 - gy0 - R(0.02));
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      for (let k = 0; k < 3; k++) ctx.fillRect(ox, gy0 + R(0.02) + k * R(0.03), R(0.05), R(0.004));
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sd < 0 ? '◀' : '▶', X(dX(sd < 0 ? -0.15 : GW + 0.15)), (gy0 + gy1) / 2);
      ctx.save();
      ctx.translate(sd < 0 ? X(HX0) - R(0.025) : X(HX1) + R(0.025), gy0 - R(0.006));
      ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText('옆문', 0, 0);
      ctx.fillStyle = '#fff1a8';
      ctx.fillText('옆문', 0, 0);
      ctx.restore();
    }
  }
  for (const [x, y] of [[HX0 + 0.012, 0.47], [HX1 - 0.012, 0.9], [HX0 + 0.012, 1.07]] as [number, number][]) {
    ctx.lineWidth = R(0.009);
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = k % 2 ? '#ffffff' : '#ff6a3d';
      ctx.beginPath();
      ctx.arc(X(x), Y(y), R(0.018), (k * TAU) / 4, ((k + 1) * TAU) / 4);
      ctx.stroke();
    }
  }
  // 갑판 소품: 고깔 · 밧줄 더미 · 구명 뗏목 통
  const cone = (gx: number, gy: number) => {
    const x = X(dX(gx)), y = Y(dY(gy)), r = R(0.016);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.3, y + r * 0.5, r, r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff7a2f';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, y + r * 0.4);
    ctx.lineTo(x, y - r * 1.5);
    ctx.lineTo(x + r * 0.8, y + r * 0.4);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - r * 0.45, y - r * 0.45, r * 0.9, r * 0.3);
  };
  cone(LANE_L, LANE_B + 0.05);
  cone(LANE_R, LANE_B + 0.05);
  cone(LANE_L - 0.05, LANE_T - 0.05);
  {
    const x = X(dX(LANE_R - 0.02)), y = Y(dY(LANE_T - 0.02)), r = R(0.02);
    ctx.strokeStyle = '#d8b07a';
    ctx.lineWidth = R(0.006);
    for (let k = 3; k >= 1; k--) (ctx.beginPath(), ctx.arc(x, y, (r * k) / 3, 0, TAU), ctx.stroke());
  }
  {
    const x = X(HX1 - 0.03), y = Y(1.16);
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.roundRect(x - R(0.014) + 2, y - R(0.03) + 3, R(0.028), R(0.06), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#f4f7fa';
    ctx.beginPath();
    ctx.roundRect(x - R(0.014), y - R(0.03), R(0.028), R(0.06), R(0.012));
    ctx.fill();
    ctx.fillStyle = '#ff5a3d';
    ctx.fillRect(x - R(0.014), y - R(0.006), R(0.028), R(0.012));
  }
  // 낮은 쪽 뱃전에 물보라 (노란 선을 넘으면)
  if (Math.abs(P.th) > YEL * 0.8) {
    const sd = Math.sign(P.th), ex = sd > 0 ? HX1 : HX0, k0 = Math.min(1, (Math.abs(P.th) - YEL * 0.8) / 0.4);
    for (let k = 0; k < 10; k++) {
      const yy = HY0 + 0.1 + ((k * 0.093 + t * 0.004) % 0.9), up = Math.abs(Math.sin(t * 0.2 + k * 1.3));
      ctx.fillStyle = `rgba(220,245,255,${0.5 * k0 * up})`;
      ctx.beginPath();
      ctx.arc(X(ex - sd * 0.01 * up), Y(yy), R(0.006 + 0.008 * up * k0), 0, TAU);
      ctx.fill();
    }
  }
  // 뱃머리 경사로
  {
    const rx0 = X(0.39), rx1 = X(0.61), ry0 = Y(PIER1 - 0.01), ry1 = Y(HY0 + 0.03);
    ctx.fillStyle = '#7f8f99';
    ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 1;
    for (let y = ry0 + 3; y < ry1; y += 4) (ctx.beginPath(), ctx.moveTo(rx0 + 2, y), ctx.lineTo(rx1 - 2, y), ctx.stroke());
    for (const x of [rx0, rx1 - R(0.012)]) {
      for (let k = 0; k * R(0.015) < ry1 - ry0; k++) {
        ctx.fillStyle = k % 2 ? '#2b2b2b' : '#ffd23f';
        ctx.fillRect(x, ry0 + k * R(0.015), R(0.012), Math.min(R(0.015), ry1 - ry0 - k * R(0.015)));
      }
    }
  }
  // 선교 + 고양이 선장 (고물)
  drawBridge(ctx, s, X, Y, R, t);
}

function drawBridge(ctx: CanvasRenderingContext2D, s: FerryState, X: XF, Y: XF, R: XF, t: number) {
  const bx = 0.5, by = 1.243;
  // 굴뚝 + 연기
  ctx.fillStyle = '#d64545';
  ctx.fillRect(X(bx + 0.1), Y(by - 0.07), R(0.035), R(0.045));
  ctx.fillStyle = '#222';
  ctx.fillRect(X(bx + 0.1), Y(by - 0.07), R(0.035), R(0.01));
  for (let k = 0; k < 4; k++) {
    const q = ((t * 0.01 + k * 0.25) % 1), r = 0.008 + q * 0.018;
    ctx.fillStyle = `rgba(240,245,248,${0.55 * (1 - q)})`;
    ctx.beginPath();
    ctx.arc(X(bx + 0.117 + q * 0.04), Y(by - 0.075 - q * 0.07), R(r), 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.roundRect(X(bx - 0.13) + R(0.006), Y(by - 0.035) + R(0.012), R(0.26), R(0.07), R(0.015));
  ctx.fill();
  ctx.fillStyle = '#f4f7fa';
  ctx.beginPath();
  ctx.roundRect(X(bx - 0.13), Y(by - 0.035), R(0.26), R(0.07), R(0.015));
  ctx.fill();
  ctx.fillStyle = '#2f6fd6';
  ctx.fillRect(X(bx - 0.135), Y(by - 0.042), R(0.27), R(0.014));
  // 창문
  ctx.fillStyle = '#9fd5ec';
  for (const k of [-1, 1]) ctx.fillRect(X(bx + k * 0.085 - 0.022), Y(by - 0.02), R(0.044), R(0.03));
  ctx.fillStyle = '#bfe6f6';
  ctx.fillRect(X(bx - 0.045), Y(by - 0.024), R(0.09), R(0.042));
  drawCaptain(ctx, X(bx), Y(by - 0.004), R(0.026), s, t);
}

function drawCaptain(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, s: FerryState, t: number) {
  const m = s.cap, bob = m === 2 ? Math.sin(t * 0.6) * r * 0.08 : m === 3 ? -Math.abs(Math.sin(t * 0.2)) * r * 0.25 : 0;
  y += bob;
  face(ctx, x, y, r, 0, m === 2 ? 5 : m === 1 ? 7 : m === 3 ? 4 : 0, t, '#f9d29b');
  // 선장 모자
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.9, r * 0.95, r * 0.42, 0, Math.PI, TAU);
  ctx.fill();
  ctx.fillStyle = '#1f2a44';
  ctx.fillRect(x - r * 0.95, y - r * 0.92, r * 1.9, r * 0.22);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x, y - r * 1.05, r * 0.14, 0, TAU);
  ctx.fill();
}

/** 얼굴: mood 0 평소 · 1 놀람(으아아) · 2 화남(빵!) · 3 힘줌(부릉) · 4 우쭐 · 5 겁먹음 · 6 어질어질 · 7 식은땀 */
function face(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, look: number, mood: number, t: number, col?: string) {
  const kind = look % 8, c = col ?? ANI_COL[kind];
  ctx.strokeStyle = 'rgba(40,25,15,.55)';
  ctx.lineWidth = Math.max(1, r * 0.1);
  // 귀
  ctx.fillStyle = c;
  if (kind === 0 || kind === 6) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * r * 0.9, y - r * 0.25);
      ctx.lineTo(x + sx * r * 0.7, y - r * 1.3);
      ctx.lineTo(x + sx * r * 0.15, y - r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 2) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sx * r * 0.42, y - r * 1.25, r * 0.26, r * 0.62, sx * 0.18, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 1 || kind === 3 || kind === 7) {
    ctx.fillStyle = kind === 7 ? '#2b2b2b' : kind === 1 ? '#8a5a35' : c;
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * r * 0.72, y - r * 0.72, r * 0.36, 0, TAU);
      ctx.fill();
    }
  } else if (kind === 4) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(x + sx * r * 0.46, y - r * 0.78, r * 0.34, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  } else if (kind === 5) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x + sx * r * 0.85, y - r * 0.35);
      ctx.lineTo(x + sx * r * 0.85, y - r * 1.05);
      ctx.lineTo(x + sx * r * 0.3, y - r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.stroke();
  if (kind === 7) {
    ctx.fillStyle = '#2b2b2b';
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.ellipse(x + sx * r * 0.38, y - r * 0.08, r * 0.26, r * 0.32, sx * 0.4, 0, TAU), ctx.fill());
  }
  if (kind === 5) {
    ctx.fillStyle = '#f08fa0';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.3, r * 0.34, r * 0.24, 0, 0, TAU);
    ctx.fill();
  }
  const ink = kind === 7 ? '#ffffff' : '#2a1a10';
  const ex = r * 0.38, ey = y - r * 0.1;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.2, r * 0.13);
  ctx.lineCap = 'round';
  if (mood === 1 || mood === 5) {
    for (const sx of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + sx * ex, ey, r * 0.26, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.arc(x + sx * ex, ey + (mood === 5 ? r * 0.05 : 0), r * 0.12, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#5a1a1a';
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.45, r * 0.18, r * (mood === 5 ? 0.26 : 0.2) * (1 + 0.15 * Math.sin(t * 0.5)), 0, 0, TAU);
    ctx.fill();
  } else if (mood === 4) {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex, ey + r * 0.06, r * 0.16, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    ctx.beginPath();
    ctx.arc(x, y + r * 0.22, r * 0.3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  } else if (mood === 6) {
    for (const sx of [-1, 1]) {
      const cx = x + sx * ex, d = r * 0.13;
      ctx.beginPath();
      ctx.moveTo(cx - d, ey - d);
      ctx.lineTo(cx + d, ey + d);
      ctx.moveTo(cx + d, ey - d);
      ctx.lineTo(cx - d, ey + d);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - r * 0.2, y + r * 0.45);
    ctx.quadraticCurveTo(x, y + r * 0.3, x + r * 0.2, y + r * 0.45);
    ctx.stroke();
  } else {
    for (const sx of [-1, 1]) (ctx.beginPath(), ctx.arc(x + sx * ex, ey, r * 0.12, 0, TAU), ctx.fill());
    if (mood === 2) {
      for (const sx of [-1, 1]) (ctx.beginPath(), ctx.moveTo(x + sx * r * 0.6, ey - r * 0.32), ctx.lineTo(x + sx * r * 0.18, ey - r * 0.18), ctx.stroke());
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25, y + r * 0.42);
      ctx.lineTo(x + r * 0.25, y + r * 0.42);
      ctx.stroke();
    } else if (mood === 3) {
      ctx.beginPath();
      ctx.arc(x, y + r * 0.18, r * 0.32, 0.1, Math.PI - 0.1);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.stroke();
    } else if (mood === 7) {
      ctx.beginPath();
      ctx.moveTo(x - r * 0.25, y + r * 0.45);
      ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.35, x, y + r * 0.45);
      ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.55, x + r * 0.25, y + r * 0.45);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y + r * 0.25, r * 0.22, 0.25, Math.PI - 0.25);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
  if (mood === 5 || mood === 7) {
    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    const sx = x + r * 0.95, sy = y - r * 0.5 + ((t * 0.4) % (r * 0.6));
    ctx.moveTo(sx, sy - r * 0.35);
    ctx.quadraticCurveTo(sx + r * 0.22, sy, sx, sy + r * 0.12);
    ctx.quadraticCurveTo(sx - r * 0.22, sy, sx, sy - r * 0.35);
    ctx.fill();
  }
}

// ───────── 차 ─────────
interface CarOpt { mood: number; spin: number; hot?: boolean; wob?: number; honk?: boolean; ghost?: boolean; alpha?: number; tint?: string }
function drawCar(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number, c: Car, R: XF, t: number, o: CarOpt) {
  const len = R(c.L * CELL - 0.022), wd = R(CELL * 0.78), col = c.k === BROKEN ? '#9a8f84' : c.k === TRUCK ? '#ff8a3d' : CAR_COL[c.look % 8];
  const dark = mix(col, '#1a1010', 0.4), lite = mix(col, '#ffffff', 0.38);
  ctx.save();
  ctx.translate(x, y + (o.wob ?? 0));
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  const body = (dx: number, dy: number, fill: string) => {
    ctx.save();
    ctx.translate(dx, dy);
    ctx.rotate(ang);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(-wd / 2, -len / 2, wd, len, R(0.028));
    ctx.fill();
    ctx.restore();
  };
  if (o.ghost) {
    ctx.rotate(ang);
    ctx.fillStyle = o.tint ?? 'rgba(255,255,255,.28)';
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.roundRect(-wd / 2, -len / 2, wd, len, R(0.028));
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    // 앞쪽 표시
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(0, -len / 2 + R(0.012));
    ctx.lineTo(-wd * 0.22, -len / 2 + R(0.04));
    ctx.lineTo(wd * 0.22, -len / 2 + R(0.04));
    ctx.fill();
    ctx.restore();
    return;
  }
  body(R(0.008), R(0.016), 'rgba(0,20,30,.35)');
  body(0, R(0.011), dark);
  ctx.rotate(ang);
  // 바퀴 (구르면 무늬가 돈다)
  const wl = R(0.034), ww = R(0.016);
  for (const fy of c.k === TRUCK ? [-0.36, 0.05, 0.34] : [-0.3, 0.3])
    for (const sx of [-1, 1]) {
      const wx = sx * (wd / 2 - ww * 0.15), wy = fy * len;
      ctx.fillStyle = '#23262b';
      ctx.beginPath();
      ctx.roundRect(wx - ww / 2, wy - wl / 2, ww, wl, R(0.005));
      ctx.fill();
      ctx.fillStyle = '#4a4f57';
      const ph = ((o.spin * 0.9) % 1 + 1) % 1;
      for (let k = 0; k < 2; k++) ctx.fillRect(wx - ww / 2, wy - wl / 2 + ((ph + k * 0.5) % 1) * wl, ww, R(0.004));
      if (c.k === BRAKE) {
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(wx + sx * ww * 0.6, wy + wl / 2);
        ctx.lineTo(wx + sx * ww * 1.3, wy + wl / 2 + R(0.012));
        ctx.lineTo(wx + sx * ww * 0.6, wy + wl / 2 + R(0.012));
        ctx.fill();
      }
    }
  // 몸통
  const g = ctx.createLinearGradient(-wd / 2, -len / 2, wd / 2, len / 2);
  g.addColorStop(0, lite);
  g.addColorStop(0.55, col);
  g.addColorStop(1, mix(col, '#000000', 0.15));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-wd / 2, -len / 2, wd, len, R(0.028));
  ctx.fill();
  ctx.strokeStyle = o.hot ? '#ffffff' : 'rgba(30,15,10,.45)';
  ctx.lineWidth = o.hot ? 3 : 1.2;
  ctx.stroke();
  // 광택 줄
  ctx.fillStyle = 'rgba(255,255,255,.28)';
  ctx.beginPath();
  ctx.roundRect(-wd / 2 + R(0.008), -len / 2 + R(0.012), R(0.012), len - R(0.024), R(0.006));
  ctx.fill();
  if (c.k === TRUCK) {
    // 짐칸: 나무 상자 셋 + 무거움 표시
    const by0 = -len / 2 + len * 0.3;
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(-wd / 2 + R(0.006), by0, wd - R(0.012), len * 0.68);
    for (let k = 0; k < 3; k++) {
      const cy = by0 + R(0.008) + k * (len * 0.68 - R(0.012)) / 3;
      ctx.fillStyle = k % 2 ? '#d9a35c' : '#c88f48';
      ctx.fillRect(-wd / 2 + R(0.012), cy, wd - R(0.024), (len * 0.68 - R(0.024)) / 3);
      ctx.strokeStyle = 'rgba(80,45,15,.6)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-wd / 2 + R(0.012), cy, wd - R(0.024), (len * 0.68 - R(0.024)) / 3);
      ctx.beginPath();
      ctx.moveTo(-wd / 2 + R(0.012), cy);
      ctx.lineTo(wd / 2 - R(0.012), cy + (len * 0.68 - R(0.024)) / 3);
      ctx.stroke();
    }
    // 운전석 지붕
    ctx.fillStyle = lite;
    ctx.beginPath();
    ctx.roundRect(-wd * 0.38, -len / 2 + R(0.02), wd * 0.76, len * 0.2, R(0.012));
    ctx.fill();
    ctx.fillStyle = '#2d3e4e';
    ctx.beginPath();
    ctx.roundRect(-wd * 0.36, -len / 2 + R(0.008), wd * 0.72, R(0.018), R(0.006));
    ctx.fill();
  } else {
    // 지붕 + 앞유리 + 뒷유리
    const rf0 = -len * 0.12, rf1 = len * 0.28;
    ctx.fillStyle = '#26394a';
    ctx.beginPath();
    ctx.roundRect(-wd * 0.36, -len * 0.25, wd * 0.72, len * 0.16, R(0.01));
    ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,.35)';
    ctx.fillRect(-wd * 0.3, -len * 0.24, wd * 0.18, len * 0.13);
    ctx.fillStyle = '#26394a';
    ctx.beginPath();
    ctx.roundRect(-wd * 0.32, rf1 - R(0.002), wd * 0.64, len * 0.08, R(0.008));
    ctx.fill();
    ctx.fillStyle = lite;
    ctx.beginPath();
    ctx.roundRect(-wd * 0.38, rf0, wd * 0.76, rf1 - rf0, R(0.016));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath();
    ctx.roundRect(-wd * 0.3, rf0 + R(0.006), wd * 0.2, rf1 - rf0 - R(0.012), R(0.01));
    ctx.fill();
  }
  // 앞 화살표 (어느 쪽으로 달리나)
  if (c.k !== BROKEN) {
    const ay = c.k === TRUCK ? len * 0.1 : len * 0.08;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ay - R(0.03));
    ctx.lineTo(-wd * 0.26, ay + R(0.006));
    ctx.lineTo(-wd * 0.1, ay + R(0.006));
    ctx.lineTo(-wd * 0.1, ay + R(0.026));
    ctx.lineTo(wd * 0.1, ay + R(0.026));
    ctx.lineTo(wd * 0.1, ay + R(0.006));
    ctx.lineTo(wd * 0.26, ay + R(0.006));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // 전조등 · 미등
  const blink = c.k === BROKEN && Math.floor(t / 12) % 2 === 0;
  for (const sx of [-1, 1]) {
    ctx.fillStyle = blink ? '#ffb020' : '#fffbe0';
    ctx.beginPath();
    ctx.arc(sx * wd * 0.32, -len / 2 + R(0.008), R(0.008), 0, TAU);
    ctx.fill();
    ctx.fillStyle = blink ? '#ffb020' : '#ff4d4d';
    ctx.fillRect(sx * wd * 0.32 - R(0.007), len / 2 - R(0.008), R(0.014), R(0.006));
  }
  if (o.honk) {
    ctx.fillStyle = 'rgba(255,250,200,.55)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * wd * 0.32, -len / 2);
      ctx.lineTo(sx * wd * 0.32 - R(0.03), -len / 2 - R(0.07));
      ctx.lineTo(sx * wd * 0.32 + R(0.03), -len / 2 - R(0.07));
      ctx.fill();
    }
  }
  ctx.restore();
  // 운전자 얼굴 (늘 똑바로) — 앞유리 자리
  const fq = c.k === TRUCK ? -0.36 : -0.12, fxo = -Math.sin(ang) * fq * len, fyo = Math.cos(ang) * fq * len;
  ctx.save();
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  face(ctx, x + fxo, y + fyo + (o.wob ?? 0) - R(0.004), R(0.024), c.look, o.mood, t);
  // 특수 표시: 🅿️ · 🔧 · 무거움
  const bx = x - fxo * 1.6, by = y - fyo * 1.6 - R(0.004);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(12, R(0.036))}px system-ui`;
  if (c.k === BRAKE) ctx.fillText('🅿️', bx, by);
  else if (c.k === BROKEN) {
    ctx.fillText('🔧', bx, by);
    for (let k = 0; k < 3; k++) {
      const q = (t * 0.02 + k / 3) % 1;
      ctx.fillStyle = `rgba(120,120,125,${0.5 * (1 - q)})`;
      ctx.beginPath();
      ctx.arc(x + fxo * 1.9 + Math.sin(t * 0.05 + k) * R(0.01), y + fyo * 1.9 - q * R(0.06), R(0.01 + q * 0.014), 0, TAU);
      ctx.fill();
    }
  } else if (c.k === TRUCK) {
    ctx.font = `900 ${Math.max(12, R(0.032))}px system-ui, sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,30,10,.8)';
    const tx = x - fxo * 0.45, ty = y - fyo * 0.45 + (o.wob ?? 0);
    ctx.strokeText('무거워', tx, ty);
    ctx.fillStyle = '#fff1a8';
    ctx.fillText('무거워', tx, ty);
  }
  ctx.restore();
}

// ───────── 미리 보기 ─────────
function drawPreviewUnder(ctx: CanvasRenderingContext2D, s: FerryState, k: number, pre: Pre, X: XF, Y: XF, R: XF, t: number) {
  const c = s.P.cars[k];
  // 달려갈 길
  const dir = c.d, ok = pre.exit;
  const fr0 = dir > 0 ? c.p + c.L : c.p;
  const fr1 = ok ? (dir > 0 ? (c.o === 0 ? GW : GH) + 0.25 : -0.25) : dir > 0 ? pre.p1 + c.L : pre.p1;
  const line = (a: number): [number, number] => (c.o === 0 ? [X(dX(a)), Y(dY(c.lane + 0.5))] : [X(dX(c.lane + 0.5)), Y(dY(a))]);
  const [ax, ay] = line(fr0), [bx, by] = line(fr1);
  ctx.strokeStyle = ok ? 'rgba(150,255,140,.85)' : 'rgba(255,200,120,.9)';
  ctx.lineWidth = R(0.022);
  ctx.lineCap = 'round';
  ctx.setLineDash([R(0.02), R(0.016)]);
  ctx.lineDashOffset = -t * 0.8;
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
  const a = Math.atan2(by - ay, bx - ax);
  ctx.fillStyle = ok ? 'rgba(150,255,140,.95)' : 'rgba(255,200,120,.95)';
  ctx.beginPath();
  ctx.moveTo(bx + Math.cos(a) * R(0.03), by + Math.sin(a) * R(0.03));
  ctx.lineTo(bx + Math.cos(a + 2.4) * R(0.03), by + Math.sin(a + 2.4) * R(0.03));
  ctx.lineTo(bx + Math.cos(a - 2.4) * R(0.03), by + Math.sin(a - 2.4) * R(0.03));
  ctx.fill();
  // 굴러갈 차: 지금 자리 → 최종 자리 화살표
  for (const j of [...pre.moved, ...pre.gated]) {
    const q = s.P.cars[j], q1 = pre.P1.cars[j];
    const x0 = X(dX(cxOf(q))), yy = Y(dY(cyOf(q)));
    const x1 = q1.st === 4 ? X(dX(q1.p > GW / 2 ? GW + 0.6 : -0.6)) : X(dX(cxOf(q1)));
    ctx.strokeStyle = 'rgba(255,240,150,.9)';
    ctx.lineWidth = R(0.012);
    ctx.setLineDash([R(0.012), R(0.01)]);
    ctx.beginPath();
    ctx.moveTo(x0, yy + R(0.035));
    ctx.lineTo(x1, yy + R(0.035));
    ctx.stroke();
    ctx.setLineDash([]);
    const sd = Math.sign(x1 - x0);
    ctx.fillStyle = 'rgba(255,240,150,.95)';
    ctx.beginPath();
    ctx.moveTo(x1 + sd * R(0.022), yy + R(0.035));
    ctx.lineTo(x1 - sd * R(0.004), yy + R(0.035) - R(0.016));
    ctx.lineTo(x1 - sd * R(0.004), yy + R(0.035) + R(0.016));
    ctx.fill();
  }
}
function drawPreviewOver(ctx: CanvasRenderingContext2D, s: FerryState, k: number, pre: Pre, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void, t: number) {
  const P = s.P, c = P.cars[k];
  // 고스트: 굴러간 차의 최종 자리
  for (const j of pre.moved) {
    const q1 = pre.P1.cars[j];
    drawCar(ctx, X(dX(cxOf(q1))), Y(dY(cyOf(q1))), heading(q1), q1, R, t, { mood: 0, spin: 0, ghost: true, tint: 'rgba(255,240,150,.25)' });
  }
  // 막히면 멈출 자리
  if (!pre.exit) {
    const q1 = pre.P1.cars[k];
    if (Math.abs(q1.p - c.p) > 0.05) drawCar(ctx, X(dX(cxOf(q1))), Y(dY(cyOf(q1))), heading(q1), q1, R, t, { mood: 0, spin: 0, ghost: true, tint: 'rgba(255,200,120,.25)' });
    const fr = c.d > 0 ? pre.p1 + c.L : pre.p1;
    const [bx, by] = c.o === 0 ? [X(dX(fr)), Y(dY(c.lane + 0.5))] : [X(dX(c.lane + 0.5)), Y(dY(fr))];
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(60,30,0,.85)';
    ctx.strokeText('빵!', bx, by - R(0.035));
    ctx.fillStyle = '#ffd08a';
    ctx.fillText('빵!', bx, by - R(0.035));
  }
  // 풍덩 위험: 빠질 차를 빨갛게
  if (pre.splash >= 0) {
    const q = P.cars[pre.splash].st === 0 ? P.cars[pre.splash] : pre.P1.cars[pre.splash];
    const x = X(dX(cxOf(q))), y = Y(dY(cyOf(q))), pulse = 0.6 + 0.4 * Math.sin(t * 0.4);
    ctx.strokeStyle = `rgba(255,70,60,${pulse})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, R(0.085), 0, TAU);
    ctx.stroke();
    font(0.042, 900);
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(80,0,0,.85)';
    ctx.strokeText('💦 풍덩!', x, y - R(0.1));
    ctx.fillStyle = '#ffb4a8';
    ctx.fillText('💦 풍덩!', x, y - R(0.1));
  }
}

/** 미리 보기: 이 차가 빠진 뒤 배가 기울 쪽 화살표 (길이 = 얼마나, 색 = 초록·노랑·빨강) */
function drawTiltArrow(ctx: CanvasRenderingContext2D, pre: Pre, X: XF, Y: XF, R: XF, t: number) {
  const v = pre.splash >= 0 ? Math.sign(pre.fin || 1) * 1.25 : pre.fin, a = Math.abs(v);
  if (a < 0.06) return;
  const sd = Math.sign(v), len = 0.08 + 0.24 * Math.min(1.25, a), y = Y(GY1 + 0.03), x0 = X(0.5 - (sd * len) / 2), x1 = X(0.5 + (sd * len) / 2);
  const col = a > LIMIT ? '255,90,79' : a > YEL ? '255,210,63' : '110,200,255', hh = R(0.016), hw = R(0.034);
  ctx.save();
  ctx.globalAlpha = 0.75 + 0.2 * Math.sin(t * 0.25);
  ctx.fillStyle = `rgba(${col},.85)`;
  ctx.strokeStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0, y - hh);
  ctx.lineTo(x1 - sd * hw, y - hh);
  ctx.lineTo(x1 - sd * hw, y - hh * 2);
  ctx.lineTo(x1, y);
  ctx.lineTo(x1 - sd * hw, y + hh * 2);
  ctx.lineTo(x1 - sd * hw, y + hh);
  ctx.lineTo(x0, y + hh);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ───────── NEW 스포트라이트 ─────────
function spotOf(s: FerryState): { x: number; y: number; r: number; label: string } | null {
  const d = STAGES[s.stage], P = s.P, L = s.L;
  const carAt = (f: (c: Car) => boolean) => P.cars.find((c) => c.st === 0 && f(c));
  const at = (c: Car | undefined, label: string, r = 0.13) => {
    if (!c) return null;
    const [x, y] = g2s(P.th, cxOf(c), cyOf(c));
    return { x, y, r, label };
  };
  if (d.key === 'block') return at(carAt((c) => c.o === 0 && c.k === CAR), '옆으로 선 차 = 기울면 데굴데굴');
  if (d.key === 'truck') return at(carAt((c) => c.k === TRUCK), '무거운 트럭 — 배가 확 기울어요', 0.17);
  if (d.key === 'brake') return at(carAt((c) => c.k === BRAKE), '🅿️ 브레이크 차는 안 굴러요');
  if (d.key === 'broken') return at(carAt((c) => c.k === BROKEN), '고장 차 — 옆문으로 굴려요');
  if (d.key === 'oil') {
    const k = L.oil.findIndex((v) => v === 1);
    if (k < 0) return null;
    const [x, y] = g2s(P.th, (k % GW) + 1.5, Math.floor(k / GW) + 0.5);
    return { x, y, r: 0.17, label: '기름 — 살짝만 기울어도 미끄러져요' };
  }
  if (d.key === 'wave') {
    const [x, y] = waveChipXY(s);
    return { x, y, r: 0.07, label: '톡 3번마다 큰 물결이 와요' };
  }
  return null;
}
/** 큰 물결이 칠 쪽 바다 위 예보 표 (다음 물결이 배를 기울일 반대쪽에서 온다) */
function waveChipXY(s: FerryState): [number, number] {
  const side = s.P.waves % 2 ? 1 : -1, gate = s.L.gates.findIndex((g) => g === -side);
  // 옆문 표지와 겹치지 않게
  const y = gate < 0 ? 0.78 : dY(gate + 0.5) < 0.75 ? 1.02 : 0.55;
  return [side < 0 ? 0.955 : 0.045, y];
}
function drawWaveChip(ctx: CanvasRenderingContext2D, s: FerryState, X: XF, Y: XF, R: XF, t: number) {
  const L = s.L, P = s.P;
  if (!L.wave || s.phase !== 'play') return;
  const left = L.wave - (P.taps % L.wave), soon = P.waveAt > P.t, [x, y] = waveChipXY(s), sd = x > 0.5 ? -1 : 1;
  const pulse = soon ? 1 + 0.15 * Math.sin(t * 0.5) : 1 + 0.05 * Math.sin(t * 0.1);
  ctx.save();
  ctx.translate(X(x), Y(y));
  ctx.scale(pulse, pulse);
  ctx.fillStyle = soon ? 'rgba(255,90,80,.92)' : 'rgba(8,40,56,.9)';
  ctx.beginPath();
  ctx.roundRect(-R(0.036), -R(0.05), R(0.072), R(0.1), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#bfefff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `${Math.max(14, R(0.04))}px system-ui`;
  ctx.fillText('🌊', 0, -R(0.022));
  ctx.font = `900 ${Math.max(13, R(0.038))}px system-ui, sans-serif`;
  ctx.fillText(soon ? '!' : String(left), 0, R(0.024));
  ctx.restore();
  // 기울일 쪽 화살표
  ctx.fillStyle = soon ? '#ff9a8a' : 'rgba(191,239,255,.8)';
  ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(sd < 0 ? '◀' : '▶', X(x), Y(y + 0.075));
}
function drawSpot(ctx: CanvasRenderingContext2D, s: FerryState, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void, t: number) {
  if (s.phase !== 'play' || s.again || s.down) return;
  const age = s.t - s.startT;
  if (age < 30 || age > CARD_T + 150) return;
  const sp = spotOf(s);
  if (!sp) return;
  const a = Math.min(1, (age - 30) / 15, (CARD_T + 150 - age) / 25);
  ctx.save();
  ctx.globalAlpha = a;
  const cx = X(sp.x), cy = Y(sp.y), r = R(sp.r) + Math.sin(t * 0.15) * 3;
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -t;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.032, 900);
  const tw = ctx.measureText(sp.label).width + R(0.04), ly = sp.y > 0.8 ? cy - r - R(0.035) : cy + r + R(0.035);
  const lx = Math.max(tw / 2 + R(0.03), Math.min(X(1) - tw / 2 - R(0.03), cx));
  ctx.fillStyle = 'rgba(14,50,70,.95)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.026), tw, R(0.052), R(0.026));
  ctx.fill();
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(sp.label, lx, ly + 1);
  font(0.026, 900);
  const nb = 'NEW', nw = ctx.measureText(nb).width + R(0.024);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.008), ly - R(0.048), nw, R(0.032), R(0.016));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.008) + nw / 2, ly - R(0.031));
  ctx.restore();
}

// ───────── 내린 차 · 옆문 · 풍덩 ─────────
function exitPath(s: FerryState, i: number): [number, number][] {
  const vs = s.vis[i], th = s.P.th, S = (gx: number, gy: number) => g2s(th, gx, gy);
  const pts: [number, number][] = [S(vs.sx, vs.sy)];
  const toBow = (gx: number) => {
    pts.push(S(gx, LANE_T), S(GW / 2, LANE_T), S(GW / 2, LANE_T - 0.35));
  };
  if (vs.side === 0) toBow(vs.sx);
  else if (vs.side === 1 || vs.side === 3) {
    const gx = vs.side === 1 ? LANE_R : LANE_L;
    pts.push(S(gx, vs.sy));
    toBow(gx);
  } else {
    const gx = vs.sx > GW / 2 ? LANE_R : LANE_L;
    pts.push(S(vs.sx, LANE_B), S(gx, LANE_B));
    toBow(gx);
  }
  const right = (i + s.stage) % 2 === 0;
  pts.push([0.5, 0.19], [0.5, 0.168], [right ? 1.25 : -0.25, 0.168]);
  return pts;
}
function drawGone(ctx: CanvasRenderingContext2D, s: FerryState, i: number, X: XF, Y: XF, R: XF, t: number) {
  const vs = s.vis[i], c = s.P.cars[i], age = t - vs.outT;
  if (vs.side <= 3) {
    const pts = exitPath(s, i);
    let dist = Math.min(age, 14) * 0.022 + Math.max(0, age - 14) * 0.038;
    for (let k = 0; k + 1 < pts.length; k++) {
      const [ax, ay] = pts[k], [bx, by] = pts[k + 1], seg = Math.hypot(bx - ax, by - ay);
      if (dist <= seg || k === pts.length - 2) {
        if (dist > seg) return;
        const q = seg ? dist / seg : 0, x = ax + (bx - ax) * q, y = ay + (by - ay) * q;
        const ang = Math.atan2(by - ay, bx - ax) + Math.PI / 2;
        drawCar(ctx, X(x), Y(y), ang, c, R, t, { mood: 4, spin: dist * 8 });
        if (age < 70) {
          ctx.fillStyle = 'rgba(230,240,245,.5)';
          ctx.beginPath();
          ctx.arc(X(x - Math.cos(ang - Math.PI / 2) * 0.06), Y(y - Math.sin(ang - Math.PI / 2) * 0.06), R(0.012 + (age % 10) * 0.001), 0, TAU);
          ctx.fill();
        }
        return;
      }
      dist -= seg;
    }
    return;
  }
  if (vs.side <= 6) {
    // 옆문으로 굴러 나가 부교에 올라 견인
    const sd = vs.side === 5 ? 1 : -1, q = Math.min(1, age / 22), gx = vs.sx + sd * q * 1.2;
    const [x, y] = g2s(s.P.th, gx, vs.sy);
    const lift = Math.max(0, age - 30) * 0.004, a = Math.max(0, 1 - Math.max(0, age - 40) / 30);
    if (a <= 0) return;
    drawCar(ctx, X(x), Y(y - lift), c.d > 0 ? Math.PI / 2 : -Math.PI / 2, c, R, t, { mood: 4, spin: gx * 3, alpha: a });
    if (age > 26) {
      ctx.globalAlpha = a;
      ctx.strokeStyle = '#3b3f45';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(x), Y(y - lift) - R(0.04));
      ctx.lineTo(X(x), 0);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    return;
  }
  // 풍덩: 난간 쪽으로 미끄러져 넘어가 물에 빠지고, 운전자는 튜브 끼고 둥둥
  const sd = vs.side === 7 ? 1 : -1;
  if (age < 26) {
    const q = age / 26, gx = vs.sx + sd * q * q * 1.6;
    const [x, y] = g2s(s.P.th, gx, vs.sy);
    ctx.save();
    ctx.translate(X(x), Y(y + q * q * 0.05));
    ctx.rotate(sd * q * 1.4);
    ctx.scale(1 - q * 0.35, 1 - q * 0.35);
    drawCar(ctx, 0, 0, c.o === 0 ? (c.d > 0 ? Math.PI / 2 : -Math.PI / 2) : c.d > 0 ? Math.PI : 0, c, R, t, { mood: 5, spin: 0 });
    ctx.restore();
    return;
  }
  const [, wy] = g2s(s.P.th, vs.sx, vs.sy);
  const wx = sd > 0 ? 0.975 : 0.025, bob = Math.sin(t * 0.12) * 0.006;
  // 물보라 고리
  ctx.strokeStyle = 'rgba(255,255,255,.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(X(wx), Y(wy + 0.03), R(0.03 + Math.sin(t * 0.1) * 0.004), R(0.012), 0, 0, TAU);
  ctx.stroke();
  // 튜브
  ctx.lineWidth = R(0.012);
  for (let k = 0; k < 4; k++) {
    ctx.strokeStyle = k % 2 ? '#ffffff' : '#ff5a3d';
    ctx.beginPath();
    ctx.ellipse(X(wx), Y(wy + 0.025 + bob), R(0.026), R(0.013), 0, (k * TAU) / 4, ((k + 1) * TAU) / 4);
    ctx.stroke();
  }
  face(ctx, X(wx), Y(wy + bob), R(0.022), c.look, 5, t);
  if (age < 120) {
    ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
    ctx.textAlign = sd > 0 ? 'right' : 'left';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,30,50,.8)';
    ctx.strokeText('살려줘~ 둥둥', X(wx - sd * 0.03), Y(wy - 0.05 + bob));
    ctx.fillStyle = '#ffffff';
    ctx.fillText('살려줘~ 둥둥', X(wx - sd * 0.03), Y(wy - 0.05 + bob));
  }
}

// ───────── 갈매기 구경꾼 ─────────
function drawGulls(ctx: CanvasRenderingContext2D, s: FerryState, X: XF, Y: XF, R: XF, t: number, onShip: boolean) {
  const fx = juice(s);
  // 큰 일(풍덩·물결·빵)에 놀라 날아올랐다가 돌아온다
  for (const e of s.events) if (e.t > (fx.memo.gullT ?? -99) && (e.kind === 'splash' || e.kind === 'wave' || e.kind === 'honk' || e.kind === 'clear')) fx.memo.gullT = e.t, fx.memo.gullK = e.kind === 'honk' ? 1 : 2;
  const since = t - (fx.memo.gullT ?? -999), big = fx.memo.gullK ?? 0;
  const gulls: [number, number, number][] = onShip ? [[HX1 - 0.012, 0.6, 1], [HX0 + 0.012, 0.86, -1]] : [[0.07, PIER1 - 0.03, 1], [0.93, PIER1 - 0.03, -1]];
  gulls.forEach(([gx, gy, face0], k) => {
    let fly = 0, laugh = false;
    if (since < 90) {
      if (big === 2 || (big === 1 && k === 0)) fly = Math.sin((since / 90) * Math.PI) * 0.07;
      if (big === 1) laugh = true;
    }
    const x = X(gx + (fly ? Math.sin(since * 0.2) * 0.01 : 0)), y = Y(gy - fly) + Math.sin(t * 0.07 + k * 2) * 0.8;
    const sc = R(0.026);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(face0, 1);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    if (!fly) (ctx.beginPath(), ctx.ellipse(0, sc * 0.9, sc * 0.9, sc * 0.25, 0, 0, TAU), ctx.fill());
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, 0, sc, sc * 0.65, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sc * 0.75, -sc * 0.55, sc * 0.45, 0, TAU);
    ctx.fill();
    const flap = fly ? Math.sin(t * 0.8) * 0.9 : 0;
    ctx.fillStyle = '#b8c4cc';
    ctx.beginPath();
    ctx.ellipse(-sc * 0.15, -sc * 0.1 - (fly ? sc * 0.4 : 0), sc * 0.75, sc * 0.3, -0.3 - flap, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(sc * 1.1, -sc * 0.6);
    ctx.lineTo(sc * 1.55, -sc * (laugh && Math.sin(t * 0.6) > 0 ? 0.35 : 0.5));
    ctx.lineTo(sc * 1.1, -sc * 0.42);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(sc * 0.88, -sc * 0.65, sc * 0.09, 0, TAU);
    ctx.fill();
    ctx.restore();
    if ((laugh || fly) && since < 50 && k === 0) {
      ctx.font = `900 ${Math.max(12, R(0.03))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(0,30,50,.7)';
      const tx = laugh ? '끼룩끼룩ㅋ' : '끼룩!';
      ctx.strokeText(tx, x, y - R(0.04));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tx, x, y - R(0.04));
    }
  });
}

// ───────── HUD ─────────
function starLines(s: FerryState, d: StageDef) {
  const L = s.L, P = s.P;
  const out: { txt: string; st: boolean | null }[] = [{ txt: `차 ${L.init.cars.length}대 모두 내리기`, st: s.phase === 'result' && s.ok ? true : null }];
  if (d.stars >= 2) out.push({ txt: `톡 ${L.par}번 안에 끝내기`, st: P.taps > L.par ? false : s.phase === 'result' && s.ok ? true : null });
  if (d.stars >= 3) out.push({ txt: '배를 노란 선 안으로 지키기', st: P.maxT > YEL ? false : s.phase === 'result' && s.ok ? true : null });
  return out;
}
function drawHud(ctx: CanvasRenderingContext2D, s: FerryState, d: StageDef, w: number, X: XF, Y: XF, R: XF, font: (sz: number, w?: number) => void, th: Theme, pre: Pre | null, pressK: number) {
  const t = s.t, P = s.P, fx = juice(s);
  // ═════ 위 띠 ═════
  const hb = R(HB);
  ctx.fillStyle = 'rgba(8,40,56,.88)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  font(0.04, 900);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${s.stage + 1}/${STAGE_COUNT}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23f';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // ═════ 판 시작 카드 (부두 위) ═════
  const cardUp = s.phase === 'play' && t - s.startT < CARD_T && !s.down;
  if (cardUp) {
    const age = t - s.startT, a = Math.min(1, age / 8, (CARD_T - age) / 20), sc = Math.min(1, 0.7 + age / 25);
    const lines = starLines(s, d), nw = s.again ? '' : d.news;
    const ch = 0.062 + lines.length * 0.034 + (nw ? 0.042 : 0);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(w / 2, Y(HB + 0.008));
    ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(8,40,56,.95)';
    ctx.beginPath();
    ctx.roundRect(-R(0.45), 0, R(0.9), R(ch), R(0.03));
    ctx.fill();
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    font(0.048, 900);
    ctx.fillText(`${s.again ? '다시! ' : ''}${d.emoji} ${s.stage + 1}판 · ${d.name}`, 0, R(0.032), R(0.86));
    ctx.textAlign = 'left';
    font(0.034, 900);
    lines.forEach((ln, k) => {
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('☆', -R(0.36), R(0.075 + k * 0.034));
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ln.txt, -R(0.31), R(0.075 + k * 0.034), R(0.72));
    });
    if (nw) {
      const ny = R(0.075 + lines.length * 0.034 + 0.008);
      font(0.026, 900);
      const nb = 'NEW', nbw = ctx.measureText(nb).width + R(0.02);
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.roundRect(-R(0.42), ny - R(0.016), nbw, R(0.032), R(0.016));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(nb, -R(0.42) + nbw / 2, ny + 1);
      ctx.textAlign = 'left';
      font(0.032, 900);
      ctx.fillStyle = '#fff1a8';
      ctx.fillText(nw, -R(0.42) + nbw + R(0.012), ny + 1, R(0.84) - nbw - R(0.012));
    }
    ctx.restore();
  } else if (s.news && t - s.news.t < NEWS_T && s.phase === 'play' && !s.down) {
    // 새것 알림
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.034, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw = Math.min(w - 10, ctx.measureText(tx).width + 24), by = Y(HB + 0.04) - drop;
    ctx.fillStyle = 'rgba(8,40,56,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, by - R(0.025), tw, R(0.05), R(0.025));
    ctx.fill();
    ctx.strokeStyle = '#7fe0ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // ═════ 미리 보기 말풍선 ═════
  if (pre && pressK >= 0) {
    let l1 = '', col = '#ffffff';
    if (pre.splash >= 0) (l1 = '💦 풍덩! 차가 바다에 빠져요'), (col = '#ffb4a8');
    else if (pre.exit) (l1 = pre.gated.length ? `✓ 내려요! + ${pre.gated.length}대 옆문으로 데굴` : '✓ 앞이 트였어요 — 내려요!'), (col = '#c6ffb4');
    else if (pre.honk) (l1 = '빵! 앞차에 막혀 멈춰요 (톡 한 번 써요)'), (col = '#ffd08a');
    const lean = Math.abs(pre.fin) < 0.08 ? '배가 반듯해요' : `배가 ${pre.fin > 0 ? '오른쪽' : '왼쪽'}으로 ${Math.abs(pre.fin) > YEL ? '많이' : '조금'} 기울어요`;
    const rolls = pre.moved.length + pre.gated.length;
    let l2 = rolls ? `${lean} · ${rolls}대가 굴러요` : lean;
    let c2 = '#e6f7ff';
    if (d.stars >= 3 && P.maxT <= YEL && pre.maxT > YEL && pre.splash < 0) (l2 = `⚠ 노란 선을 넘어요 (별 하나 잃어요)`), (c2 = '#ffe08a');
    const by = Y(HB + 0.055);
    ctx.fillStyle = 'rgba(8,40,56,.94)';
    ctx.beginPath();
    ctx.roundRect(R(0.04), by - R(0.042), w - R(0.08), R(0.092), R(0.03));
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.042, 900);
    ctx.fillStyle = col;
    ctx.fillText(l1, w / 2, by - R(0.012), w - R(0.12));
    font(0.034, 800);
    ctx.fillStyle = c2;
    ctx.fillText(l2, w / 2, by + R(0.028), w - R(0.12));
  }
  // ═════ 결과 카드 ═════
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    const cy = Y(0.6);
    ctx.fillStyle = s.ok ? 'rgba(10,60,50,.9)' : 'rgba(80,20,20,.88)';
    ctx.beginPath();
    ctx.roundRect(R(0.06), cy - R(0.1), w - R(0.12), R(s.ok ? 0.37 : 0.2), R(0.04));
    ctx.fill();
    ctx.strokeStyle = s.ok ? '#ffd23f' : '#ffb4a8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    font(0.056, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '마지막 배까지 다 내렸어요! 🎉' : '🎉 다 내렸어요!') : s.why, w / 2, cy - R(0.05), w - R(0.16));
    if (s.ok) {
      const max = d.stars;
      for (let k = 0; k < max; k++) {
        const ag = age - 12 - k * 12;
        if (ag < 0) continue;
        const got = s.starOk[k], scl = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.075 * scl, 900);
        ctx.fillStyle = got ? '#ffd23f' : 'rgba(255,255,255,.3)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - (max - 1) / 2) * R(0.1), cy + R(0.03));
        if (got && (fx.memo['star' + k] ?? -1) < s.clearT) (fx.memo['star' + k] = s.clearT), fx.burst(w / 2 + (k - (max - 1) / 2) * R(0.1), cy + R(0.03), '#ffe066', 14, 3, 2.4);
      }
      // 무엇을 해서 땄는지 말로
      const why = [`★ 차 ${s.L.init.cars.length}대를 모두 내렸어요`];
      if (max >= 2) why.push(s.starOk[1] ? `★ 톡 ${P.taps}번에 끝냈어요!` : `☆ 톡 ${P.taps}번 — ${s.L.par}번 안에면 별`);
      if (max >= 3) why.push(s.starOk[2] ? '★ 배를 반듯하게 지켰어요!' : '☆ 배가 노란 선을 넘었어요');
      if (max >= 2 && s.got === max) why.push(`★ 완벽! 보너스 +${PERFECT_PTS}`);
      font(0.034, 800);
      why.forEach((l, k) => {
        ctx.fillStyle = l.startsWith('★') ? '#ffffff' : 'rgba(255,255,255,.6)';
        ctx.fillText(l, w / 2, cy + R(0.1 + k * 0.042), w - R(0.16));
      });
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 같은 배를 다시 — 누르면 미리 보여요' : '하트를 다 썼어요 — 끝', w / 2, cy + R(0.04), w - R(0.16));
    }
    ctx.globalAlpha = 1;
  }
  // ═════ 아래 띠: 기울기 바늘 · 별 조건 · 안내 ═════
  {
    const y0 = Y(BAND);
    const g = ctx.createLinearGradient(0, y0, 0, Y(A));
    g.addColorStop(0, 'rgba(8,40,56,.95)');
    g.addColorStop(1, 'rgba(4,26,38,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, y0, w, Y(A - BAND) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    drawDial(ctx, s, X(0.125), Y(BAND + 0.018), R(0.092), font, pre, t);
    const lines = starLines(s, d);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    lines.forEach((ln, k) => {
      const yy = Y(BAND + 0.034 + k * 0.043);
      ctx.fillStyle = ln.st === true ? 'rgba(255,210,63,.25)' : ln.st === false ? 'rgba(0,0,0,.3)' : 'rgba(255,255,255,.07)';
      ctx.beginPath();
      ctx.roundRect(X(0.25), yy - R(0.019), X(0.73), R(0.038), R(0.019));
      ctx.fill();
      font(0.034, 900);
      ctx.fillStyle = ln.st === false ? 'rgba(255,255,255,.4)' : '#ffd23f';
      ctx.fillText(ln.st === true ? '★' : ln.st === false ? '✗' : '☆', X(0.265), yy + 1);
      font(0.033, 800);
      ctx.fillStyle = ln.st === false ? 'rgba(255,255,255,.45)' : '#ffffff';
      ctx.fillText(ln.txt, X(0.31), yy + 1, X(0.5));
      // 지금 값
      ctx.textAlign = 'right';
      font(0.03, 800);
      ctx.fillStyle = '#9fe3f2';
      if (k === 0) ctx.fillText(`${remaining(P)}대 남음`, X(0.965), yy + 1);
      if (k === 1) ctx.fillText(`톡 ${P.taps}번`, X(0.965), yy + 1);
      ctx.textAlign = 'left';
    });
    if (lines.length === 1) {
      font(0.03, 800);
      ctx.fillStyle = 'rgba(255,255,255,.5)';
      ctx.fillText('다음 판부터 별 조건이 하나씩 늘어요', X(0.26), Y(BAND + 0.08));
    }
    let hint = d.tip;
    // 큰 물결 예보
    if (s.L.wave) {
      const left = s.L.wave - (P.taps % s.L.wave);
      hint = P.waveAt > P.t ? '🌊 큰 물결이 온다! 꽉 잡아요!' : `🌊 큰 물결까지 톡 ${left}번 — 미리 반듯하게!`;
    }
    if (s.stage === 0 && !s.firstTap && s.phase === 'play') hint = '👆 앞이 트인 차를 톡! 부릉~ 내려요';
    else if (s.down && s.phase === 'play') hint = '떼면 출발! · 차 밖에서 떼면 취소';
    else if (s.phase === 'sink') hint = '풍덩… 갈매기가 웃어요';
    else if (s.phase === 'result') hint = s.ok ? '다음 배가 들어와요!' : '누르고 있으면 결과가 미리 보여요';
    ctx.textAlign = 'center';
    font(0.035, 900);
    ctx.fillStyle = s.stage === 0 && !s.firstTap ? '#ffffff' : '#fff1a8';
    ctx.fillText(hint, w / 2, Y(A - 0.03), w - R(0.04));
  }
  ctx.textBaseline = 'alphabetic';
}

/** 기울기 바늘: 아래로 매달린 추가 기운 쪽으로 — 초록 · 노란 선 · 빨간 선 */
function drawDial(ctx: CanvasRenderingContext2D, s: FerryState, cx: number, cy: number, r: number, font: (sz: number, w?: number) => void, pre: Pre | null, t: number) {
  const K = 0.95, ang = (v: number) => Math.PI / 2 - Math.max(-1.3, Math.min(1.3, v)) * K;
  const arc = (a: number, b: number, col: string) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = r * 0.28;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.8, ang(b), ang(a));
    ctx.stroke();
  };
  ctx.fillStyle = 'rgba(255,255,255,.08)';
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI);
  ctx.fill();
  arc(-YEL, YEL, '#3fbf6f');
  arc(YEL, LIMIT, '#ffd23f');
  arc(-LIMIT, -YEL, '#ffd23f');
  arc(LIMIT, 1.3, '#ff5a4f');
  arc(-1.3, -LIMIT, '#ff5a4f');
  const needle = (v: number, col: string, wd: number) => {
    const a = ang(v);
    ctx.strokeStyle = col;
    ctx.lineWidth = wd;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92);
    ctx.stroke();
    ctx.lineCap = 'butt';
  };
  if (pre) {
    ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 0.3);
    needle(pre.fin, '#9fe3f2', 3);
    ctx.globalAlpha = 1;
  }
  needle(s.P.th, '#ffffff', 3.5);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.1, 0, TAU);
  ctx.fill();
  font(0.026, 800);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#bfefff';
  ctx.fillText('기울기', cx, cy + r * 1.22);
}
