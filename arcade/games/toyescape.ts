/**
 * 장난감 상자 화살 탈출 (29라운드: 한눈에 아는 놀이 × 진짜 물리) — 화살 탈출 × 밀어내기 × 가리키기(톡).
 * 뼈대(요즘 잘 팔리는 '화살 탈출'): 장난감 상자 바닥에 화살이 그려진 장난감들. 톡 하면 화살 쪽으로 슝 날아가 상자 문으로 빠진다.
 * 비틀기(밀어내기, 연속 물리): 앞에 다른 장난감이 있으면 막혀 멈추는 게 아니라 '밀어내며' 같이 미끄러진다.
 *   고정 간격(1/60초) 결정적 물리 — 속도·운동량·마찰. 부딪히면 운동량을 나눠 갖고(무거운 곰은 덜 밀리고 가벼운 구슬은 멀리 간다),
 *   바닥 마찰로 서서히 멈춘다. 그래서 '어디까지 밀려 멈추나'는 칸이 아니라 물리가 정한다(한 칸씩 움직이는 턴제 아님).
 *   밀려난 장난감은 자기 화살 방향이 그대로라, 문 앞에 세워지면 길이 열리고 벽 앞에 세워지면 길이 막힌다.
 *   문이 아닌 벽에 닿으면 '쿵' 멈춘다(어질어질). 같이 문 밖으로 빠지면 한 번에 여러 개 — 강아지가 받아 문다.
 * 손짓 하나(touch): 장난감을 누르고 있으면 밀려날 것들의 최종 자리(고스트)·빠질 것(👋)·쿵 막힐 곳이 미리 보이고, 떼면 슝.
 *   장난감 밖에서 떼면 취소. 움직이는 동안의 톡은 무시. 키보드는 화살표 커서 + 스페이스.
 * 판 8개: 목표 = 장난감을 모두 상자 밖으로. 톡 수에 한도(다 쓰면 하트 -1, 그 판 다시). 하트 셋을 다 잃거나 8판을 마치면 끝.
 *   별(쉬운 말, 판마다 하나씩 늘어남): 1판 "모두 빼기" → 2판 + "N번 안에 끝내기" → 3판부터 + "한 번에 셋 빼기".
 * 펼쳐짐(하는 일이 바뀐다): 1 톡·밀어내기(뒤에서 밀면 둘이 같이 쏙) → 2 쿵 벽(좁은 문 — 옆에서 밀어 문 앞에 세우기)
 *   → 3 곰 인형(무거워 안 밀림 — 대신 곰을 톡 하면 불도저) → 4 구슬(가벼워 멀리 · 벽에 통 튕김)
 *   → 5 팽이(밀리면 화살이 빙글 돎 — 밀어서 겨누기) → 6 통통 벽(맞으면 반대로 튕겨 반대편 문으로)
 *   → 7 끈끈이(밀려 들어가면 딱 멈춤 — 원하는 자리에 세우기) → 8 대잔치(전부).
 * 웃음: 장난감마다 얼굴. 밀리면 '어어어' 눈이 동그래지고, 쿵 부딪히면 어질어질 별, 날아가면 신나서 ^o^.
 *   상자 앞 강아지가 날아오는 장난감을 덥석 받아 물고 꼬리를 흔든다(나머지는 바구니로). 실패하면 강아지가 축 엎드린다.
 * 판 고르기: 문은 판마다 정해 두고 장난감 자리·화살은 무작위(대충 격자 + 조금 흔듦). 잘하는 봇(빔 탐색: 톡마다 물리를 끝까지 돌려 봄)이
 *   깰 수 있는 판만 쓰고, 그 계획의 톡 수가 'N번 안에', 한도는 N+2. 3판부터는 '한 번에 많이 빠지는 것' 버릇(②)으로는 별 셋이 안 나오고
 *   그 판의 새것을 계획이 실제로 쓰는 판을 고른다. '바로 빠지는 것부터' 버릇(①)은 판 고르기에 쓰지 않는다(독립 측정용).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;

// ───────────────────────────── 물리 ─────────────────────────────
/** 톡 했을 때 처음 속도(상자 폭/틱) · 장난감끼리 튕김(작을수록 '같이 미끄러짐') · 옆으로 이만큼은 겹쳐야 부딪힘 */
const V0 = 0.05, E_TOY = 0.12, LAT = 0.006, MAXT = 900;
/** 끈끈이 위 마찰 배수 · 통통 벽 튕김 */
const SLIME_MU = 9, ERUB = 0.85;
export const BLOCK = 0, BEAR = 1, MARBLE = 2, TOP = 3;
/** 종류별: 반 크기 · 무게 · 마찰(틱마다 줄어드는 속도) · 보통 벽에 튕기는 정도 */
const HS = [0.075, 0.088, 0.062, 0.07];
const MASS = [1, 3.5, 0.45, 0.8];
const MU = [0.0003, 0.0004, 0.00015, 0.0003];
const EWALL = [0, 0, 0.35, 0.2];
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];

export interface Toy {
  id: number; k: number; x: number; y: number; dir: number; col: number;
  /** 지금 축을 따라 움직이는 속도 · 빠진 순서(0 = 상자 안) · 이번 톡에 이미 돌았나(팽이) */
  v: number; out: number; spun: number;
  /** 이번 톡에서 지나간 가장 낮은·높은 자리(축 기준), 톡 시작 자리, 벽에 눌림(1 = + 쪽, 2 = − 쪽) */
  lo: number; hi: number; x0: number; y0: number; pin: number;
}
export interface Sim {
  toys: Toy[];
  /** 0 = 멈춤, 1 = 가로로 움직이는 중, 2 = 세로로 */
  ax: number;
  left: number; taps: number; best: number; now: number; outs: number; tapped: number; bonks: number;
}
export interface Rec { k: 'push' | 'bonk' | 'boing' | 'exit' | 'spin' | 'slime'; i: number; x: number; y: number; v: number; side: number }
export interface Level {
  key: string; doors: number[][][]; rub: number[][][]; slime: number[][]; toys: Toy[];
  /** 별: 몇 개짜리 판인지 · N번 안에 · 한 번에 C개 · 톡 한도 · 잘하는 봇의 계획 · 첫 판 손가락 안내 */
  nstars: number; par: number; C: number; limit: number; plan: number[]; hint: number;
}

const laneSpans = (mask: number): number[][] => {
  const out: number[][] = [];
  for (let c = 0; c < 5; c++)
    if ((mask >> c) & 1) {
      const a = c * 0.2;
      if (out.length && Math.abs(out[out.length - 1][1] - a) < 1e-9) out[out.length - 1][1] = a + 0.2;
      else out.push([a, a + 0.2]);
    }
  return out;
};
/** 문 칸(옆 좌표 lat)에 장난감이 들어가나 — 몸의 가운데 55%가 문 안이면 지나간다 */
function fits(L: Level, side: number, lat: number, h: number) {
  for (const d of L.doors[side]) if (lat - 0.55 * h >= d[0] - 1e-9 && lat + 0.55 * h <= d[1] + 1e-9) return true;
  return false;
}
const isRub = (L: Level, side: number, lat: number) => L.rub[side].some((d) => lat >= d[0] && lat <= d[1]);
const onSlime = (L: Level, t: Toy) => L.slime.some((z) => t.x > z[0] && t.x < z[2] && t.y > z[1] && t.y < z[3]);

export function newSim(L: Level): Sim {
  return { toys: L.toys.map((t) => ({ ...t })), ax: 0, left: L.toys.length, taps: 0, best: 0, now: 0, outs: 0, tapped: -1, bonks: 0 };
}
const cloneSim = (S: Sim): Sim => ({ ...S, toys: S.toys.map((t) => ({ ...t })) });

/** 톡: 그 장난감이 화살 쪽으로 V0로 출발 */
export function tap(S: Sim, i: number) {
  const t = S.toys[i];
  S.ax = t.dir % 2 === 1 ? 1 : 2;
  S.taps++;
  S.now = 0;
  S.bonks = 0;
  S.tapped = i;
  for (const q of S.toys) (q.spun = 0), (q.x0 = q.x), (q.y0 = q.y), (q.lo = q.hi = S.ax === 1 ? q.x : q.y);
  t.v = t.dir === 1 || t.dir === 2 ? V0 : -V0;
}

/** 물리 한 틱 (고정 간격): 마찰 → 이동 → 벽·문 → 부딪힘(운동량 나눔 + 겹침 풀기)을 몇 번 되풀이 */
export function tick(L: Level, S: Sim, rec?: Rec[]) {
  if (!S.ax) return;
  const T = S.toys, X = S.ax === 1;
  for (const t of T) {
    t.pin = 0;
    if (t.out || t.v === 0) continue;
    let f = MU[t.k];
    if (L.slime.length && onSlime(L, t)) {
      f *= SLIME_MU;
      if (rec && Math.abs(t.v) > 0.004 && Math.abs(t.v) <= 0.004 + f) rec.push({ k: 'slime', i: t.id, x: t.x, y: t.y, v: 0, side: 0 });
    }
    t.v = Math.abs(t.v) <= f ? 0 : t.v - (t.v > 0 ? f : -f);
    if (X) t.x += t.v;
    else t.y += t.v;
  }
  const act: number[] = [];
  for (let it = 0; it < 7; it++) {
    walls(L, S, X, rec);
    act.length = 0;
    for (let i = 0; i < T.length; i++) if (!T[i].out) act.push(i);
    // 축 위치 순으로 (삽입 정렬, 개수가 적다)
    for (let a = 1; a < act.length; a++) {
      const v = act[a], pv = X ? T[v].x : T[v].y;
      let b = a - 1;
      while (b >= 0 && (X ? T[act[b]].x : T[act[b]].y) > pv) (act[b + 1] = act[b]), b--;
      act[b + 1] = v;
    }
    let any = false;
    for (let ai = 0; ai < act.length; ai++) {
      const a = T[act[ai]];
      for (let bi = ai + 1; bi < act.length; bi++) {
        const b = T[act[bi]];
        const pa = X ? a.x : a.y, pb = X ? b.x : b.y, ha = HS[a.k], hb = HS[b.k], gap = pb - pa;
        if (gap > 0.18) break;
        if (gap >= ha + hb || Math.abs((X ? a.y : a.x) - (X ? b.y : b.x)) >= ha + hb - LAT) continue;
        const wa = a.pin & 2 ? 0 : 1 / MASS[a.k], wb = b.pin & 1 ? 0 : 1 / MASS[b.k];
        if (wa + wb === 0) continue;
        const rel = a.v - b.v;
        if (rel > 1e-7) {
          const J = ((1 + E_TOY) * rel) / (wa + wb), va0 = a.v, vb0 = b.v;
          a.v -= J * wa;
          b.v += J * wb;
          if (rec) {
            if (wb && Math.abs(vb0) < 1e-6 && b.v > 0.003) rec.push({ k: 'push', i: b.id, x: b.x, y: b.y, v: b.v, side: 0 });
            if (wa && Math.abs(va0) < 1e-6 && a.v < -0.003) rec.push({ k: 'push', i: a.id, x: a.x, y: a.y, v: a.v, side: 0 });
          }
          // 팽이: 밀리면 화살이 시계 방향으로 한 번 빙글
          if (b.k === TOP && wb && !b.spun && J * wb > 0.004 && S.tapped !== b.id) (b.spun = 1), (b.dir = (b.dir + 1) % 4), rec?.push({ k: 'spin', i: b.id, x: b.x, y: b.y, v: 0, side: 0 });
          if (a.k === TOP && wa && !a.spun && J * wa > 0.004 && S.tapped !== a.id) (a.spun = 1), (a.dir = (a.dir + 1) % 4), rec?.push({ k: 'spin', i: a.id, x: a.x, y: a.y, v: 0, side: 0 });
        }
        const pen = ha + hb - gap, da = (pen * wa) / (wa + wb), db = (pen * wb) / (wa + wb);
        if (X) (a.x -= da), (b.x += db);
        else (a.y -= da), (b.y += db);
        if (!wb) a.pin |= 1;
        if (!wa) b.pin |= 2;
        any = true;
      }
    }
    if (!any) break;
  }
  walls(L, S, X, rec);
  let moving = false;
  for (const t of T) {
    if (t.out) continue;
    const p = X ? t.x : t.y;
    if (p < t.lo) t.lo = p;
    if (p > t.hi) t.hi = p;
    if (t.v !== 0) moving = true;
  }
  if (!moving) (S.ax = 0), (S.best = Math.max(S.best, S.now));
}

function walls(L: Level, S: Sim, X: boolean, rec?: Rec[]) {
  for (const t of S.toys) {
    if (t.out) continue;
    const h = HS[t.k], p = X ? t.x : t.y, q = X ? t.y : t.x;
    let side = -1, lim = 0;
    if (p + h > 1) (side = X ? 1 : 2), (lim = 1 - h);
    else if (p - h < 0) (side = X ? 3 : 0), (lim = h);
    if (side < 0) continue;
    const plus = side === 1 || side === 2;
    if (fits(L, side, q, h)) {
      if (plus ? p > 1 : p < 0) {
        t.out = ++S.outs;
        S.left--;
        S.now++;
        rec?.push({ k: 'exit', i: t.id, x: t.x, y: t.y, v: t.v, side });
        t.v = 0;
      }
      continue;
    }
    if (X) t.x = lim;
    else t.y = lim;
    t.pin |= plus ? 1 : 2;
    if (plus ? t.v > 0 : t.v < 0) {
      const rub = isRub(L, side, q), e = rub ? ERUB : EWALL[t.k], sp = Math.abs(t.v);
      if (sp > 0.002) {
        S.bonks++;
        rec?.push({ k: rub ? 'boing' : 'bonk', i: t.id, x: t.x + (X ? (plus ? h : -h) : 0), y: t.y + (X ? 0 : plus ? h : -h), v: sp, side });
      }
      t.v = sp * e < 0.0015 ? 0 : -t.v * e;
    }
  }
}

/** 톡 하나를 끝까지(멈출 때까지) 돌린 결과. moved = 무엇이든 움직였나 */
export function simTap(L: Level, S0: Sim, i: number, rec?: Rec[]): Sim & { moved: boolean } {
  const S = cloneSim(S0);
  tap(S, i);
  for (let k = 0; k < MAXT && S.ax; k++) tick(L, S, rec);
  S.ax = 0;
  S.best = Math.max(S.best, S.now);
  let moved = S.now > 0;
  if (!moved)
    for (let j = 0; j < S.toys.length; j++) {
      const a = S.toys[j], b = S0.toys[j];
      if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 0.002 || a.dir !== b.dir) {
        moved = true;
        break;
      }
    }
  return Object.assign(S, { moved });
}

const hashSim = (S: Sim) => S.toys.map((t) => (t.out ? 'o' : `${Math.round(t.x * 500)},${Math.round(t.y * 500)},${t.dir}`)).join(';');

// ───────────────────────────── 생각하기(봇·판 고르기 공용) ─────────────────────────────
/** 장난감 t가 바라보는 쪽 앞길에 있는 장난감 수 */
function ahead(S: Sim, t: Toy) {
  let n = 0;
  const X = t.dir % 2 === 1, sg = t.dir === 1 || t.dir === 2 ? 1 : -1, h = HS[t.k];
  for (const q of S.toys) {
    if (q === t || q.out) continue;
    const lat = Math.abs(X ? q.y - t.y : q.x - t.x), d = (X ? q.x - t.x : q.y - t.y) * sg;
    if (d > 0 && lat < h + HS[q.k] - LAT) n++;
  }
  return n;
}
/** 남은 장난감이 얼마나 '빠지기 좋은 자리'에 있나 */
function potential(L: Level, S: Sim) {
  let v = 0;
  for (const t of S.toys) {
    if (t.out) continue;
    const side = t.dir, q = side % 2 === 0 ? t.x : t.y, h = HS[t.k];
    if (fits(L, side, q, h)) v += ahead(S, t) === 0 ? 1.2 : 0.75;
    else if (isRub(L, side, q) && fits(L, (side + 2) % 4, q, h)) v += 0.55;
    else v -= 0.35;
  }
  return v;
}
interface Node { S: Sim; path: number[]; sc: number }
/** 빔 탐색: 매 톡마다 남은 장난감 하나하나를 톡 해 본 결과를 물리로 끝까지 돌려 보고, 좋은 몇 갈래만 이어 간다 */
export function planLevel(L: Level, S0: Sim, C: number, beam = 12): { path: number[]; best: number } | null {
  let layer: Node[] = [{ S: S0, path: [], sc: 0 }];
  const n0 = S0.left;
  let done = null as Node | null, dd = 0;
  for (let depth = 1; depth <= n0 + 3; depth++) {
    const next: Node[] = [], seen = new Set<string>();
    for (const nd of layer)
      for (let i = 0; i < nd.S.toys.length; i++) {
        if (nd.S.toys[i].out) continue;
        const S2 = simTap(L, nd.S, i);
        if (!S2.moved) continue;
        const path = [...nd.path, i];
        if (S2.left === 0) {
          const good = S2.best >= C, had = !!done && done.S.best >= C;
          if (!done || (good && !had) || (good === had && depth === dd && S2.best > done.S.best)) (done = { S: S2, path, sc: 0 }), (dd = depth);
          continue;
        }
        const hk = hashSim(S2);
        if (seen.has(hk)) continue;
        seen.add(hk);
        next.push({ S: S2, path, sc: (n0 - S2.left) * 10 + Math.min(S2.best, C) * 3 + potential(L, S2) * 3 });
      }
    if (done && (done.S.best >= C || depth >= dd + 1)) break;
    next.sort((a, b) => b.sc - a.sc);
    layer = next.slice(0, beam);
    if (!layer.length) break;
  }
  return done ? { path: done.path, best: done.S.best } : null;
}

/** 읽는 순서(뒤에서 앞, 왼쪽에서 오른쪽) */
const order = (S: Sim) =>
  S.toys
    .filter((t) => !t.out)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((t) => t.id);
/** 버릇 ①(판 고르기에 안 씀 — 독립): 지금 바로 빠질 수 있는 것(앞길이 트이고 문을 보고 있는 것)부터, 없으면 맨 뒤 것. 원래 화살 탈출의 정석 */
export function habitClear(L: Level, S: Sim) {
  const o = order(S);
  for (const i of o) {
    const t = S.toys[i];
    if (fits(L, t.dir, t.dir % 2 === 0 ? t.x : t.y, HS[t.k]) && ahead(S, t) === 0) return i;
  }
  for (const i of o) if (simTap(L, S, i).moved) return i;
  return o[0] ?? -1;
}
/** 버릇 ②(3판부터 판 고르기에 씀): 톡 한 번에 가장 많이 빠지는 것, 같으면 맨 뒤 것 */
export function habitGreedy(L: Level, S: Sim) {
  let best = -1, bv = -1;
  for (const i of order(S)) {
    const S2 = simTap(L, S, i);
    const v = S2.moved ? S2.now : -0.5;
    if (v > bv) (bv = v), (best = i);
  }
  return best;
}

// ───────────────────────────── 판 ─────────────────────────────
interface StageDef {
  key: string; name: string; emoji: string;
  /** 시작 카드의 새것 한 줄 · 스포트라이트 딱지 */
  news: string; spot: string;
  n: number; bear: number; marble: number; top: number;
  /** 문(5칸 중 열린 칸 비트): 뒤 · 오른쪽 · 앞 · 왼쪽 */
  doors: number[]; rub: number[]; slime: number[][];
  nstars: number; C: number; slack: number; parPlus: number;
  /** 처음부터 문을 보고 있는 장난감의 비율(나머지는 아무 쪽) */
  aligned: number;
}
export const STAGES: StageDef[] = [
  { key: 'tap', name: '톡 → 슝!', emoji: '👆', news: '👆 톡 = 화살 쪽으로 슝! 앞에 있으면 밀어내요', spot: '', n: 5, bear: 0, marble: 0, top: 0, doors: [0b01110, 0b01110, 0b01110, 0b01110], rub: [0, 0, 0, 0], slime: [], nstars: 1, C: 2, slack: 5, parPlus: 2, aligned: 0.7 },
  { key: 'wall', name: '쿵 벽', emoji: '🧱', news: '🧱 문이 아닌 쪽은 쿵! 옆에서 밀어 문 앞에 세워요', spot: '문이 아닌 벽은 쿵! 막혀요', n: 7, bear: 0, marble: 0, top: 0, doors: [0b00110, 0b01100, 0b01100, 0b00110], rub: [0, 0, 0, 0], slime: [], nstars: 2, C: 2, slack: 4, parPlus: 1, aligned: 0.7 },
  { key: 'bear', name: '곰 인형', emoji: '🧸', news: '🧸 곰은 무거워 잘 안 밀려요 — 곰을 톡 하면 다 밀어내요', spot: '곰 인형: 무거워요!', n: 8, bear: 1, marble: 0, top: 0, doors: [0b01100, 0b00110, 0b00110, 0b01100], rub: [0, 0, 0, 0], slime: [], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
  { key: 'marble', name: '구슬', emoji: '🔮', news: '🔮 구슬은 가벼워 멀리 굴러요 — 벽에 맞으면 통 튕겨요', spot: '구슬: 멀리 굴러요', n: 8, bear: 0, marble: 2, top: 0, doors: [0b00110, 0b01100, 0b01100, 0b00110], rub: [0, 0, 0, 0], slime: [], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
  { key: 'top', name: '팽이', emoji: '🌀', news: '🌀 팽이는 밀리면 화살이 빙글 돌아요', spot: '팽이: 밀리면 빙글!', n: 8, bear: 0, marble: 0, top: 2, doors: [0b01100, 0b00110, 0b00110, 0b01100], rub: [0, 0, 0, 0], slime: [], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
  { key: 'rubber', name: '통통 벽', emoji: '🩷', news: '🩷 통통 벽에 맞으면 반대로 튕겨 가요', spot: '통통 벽: 반대로 튕겨요', n: 8, bear: 0, marble: 0, top: 0, doors: [0b00110, 0b01100, 0b01100, 0b00110], rub: [0b11000, 0b00011, 0b00011, 0b11000], slime: [], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
  { key: 'slime', name: '끈끈이', emoji: '🟢', news: '🟢 끈끈이에 밀려 들어가면 딱 멈춰요', spot: '끈끈이: 밀려 오면 딱 멈춰요', n: 8, bear: 0, marble: 0, top: 0, doors: [0b01100, 0b00110, 0b00110, 0b01100], rub: [0, 0, 0, 0], slime: [[0.6, 0.0, 0.8, 0.4], [0.0, 0.6, 0.4, 0.8]], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
  { key: 'all', name: '장난감 대잔치', emoji: '🎉', news: '🎉 마지막 상자 — 곰·구슬·팽이·통통 벽 다 나와요!', spot: '', n: 10, bear: 1, marble: 1, top: 1, doors: [0b01100, 0b00110, 0b01100, 0b00110], rub: [0b00011, 0b11000, 0, 0], slime: [[0.0, 0.0, 0.2, 0.4]], nstars: 3, C: 3, slack: 2, parPlus: 0, aligned: 0.5 },
];
export const STAGE_COUNT = STAGES.length;

function shuffle<T>(a: T[], r: Rng): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const rev5 = (m: number) => {
  let o = 0;
  for (let c = 0; c < 5; c++) if ((m >> c) & 1) o |= 1 << (4 - c);
  return o;
};

/** 판 하나 만들기: 문은 판마다 정해져 있고(좌우 뒤집기만), 장난감 자리·화살은 무작위(대충 격자 + 조금 흔듦) */
export function candidate(d: StageDef, r: Rng, si: number): Level | null {
  const flip = r() < 0.5;
  const dm = flip ? [rev5(d.doors[0]), d.doors[3], rev5(d.doors[2]), d.doors[1]] : d.doors.slice();
  const rm = flip ? [rev5(d.rub[0]), d.rub[3], rev5(d.rub[2]), d.rub[1]] : d.rub.slice();
  const slime = d.slime.map((z) => (flip ? [1 - z[2], z[1], 1 - z[0], z[3]] : z.slice()));
  const L: Level = { key: d.key, doors: dm.map(laneSpans), rub: rm.map(laneSpans), slime, toys: [], nstars: d.nstars, par: 0, C: d.C, limit: 0, plan: [], hint: -1 };
  const cells = shuffle([...Array(25).keys()], r);
  const kinds = [...Array(d.bear).fill(BEAR), ...Array(d.marble).fill(MARBLE), ...Array(d.top).fill(TOP)];
  while (kinds.length < d.n) kinds.push(BLOCK);
  shuffle(kinds, r);
  let ci = 0;
  for (let id = 0; id < d.n; id++) {
    let placed = false;
    while (ci < 25 && !placed) {
      const c = cells[ci++], cx = c % 5, cy = Math.floor(c / 5);
      const x = 0.1 + cx * 0.2 + (r() - 0.5) * 0.024, y = 0.1 + cy * 0.2 + (r() - 0.5) * 0.024;
      // 끈끈이 위에는 처음부터 두지 않는다
      if (slime.some((z) => x > z[0] && x < z[2] && y > z[1] && y < z[3])) continue;
      const k = kinds[id], dirs = shuffle([0, 1, 2, 3], r);
      let dir = dirs[0];
      const ok = dirs.filter((q) => exitable(L, q, q % 2 === 0 ? x : y, HS[k]));
      if (si === 0) {
        // 1판: 모두 문을 보고 있다
        if (!ok.length) continue;
        dir = ok[0];
      } else if (ok.length && r() < d.aligned) dir = ok[0];
      L.toys.push({ id, k, x, y, dir, col: Math.floor(r() * 6), v: 0, out: 0, spun: 0, lo: 0, hi: 0, x0: x, y0: y, pin: 0 });
      placed = true;
    }
    if (!placed) return null;
  }
  // 문을 안 보는 장난감은 옆에서 밀어 줄 장난감이 적어도 하나 있어야 한다 (없으면 영영 못 나감)
  for (const t of L.toys) {
    if (exitable(L, t.dir, t.dir % 2 === 0 ? t.x : t.y, HS[t.k])) continue;
    const pusher = L.toys.some((q) => {
      if (q === t) return false;
      const X = q.dir % 2 === 1, sg = q.dir === 1 || q.dir === 2 ? 1 : -1;
      const lat = Math.abs(X ? q.y - t.y : q.x - t.x), dd = (X ? t.x - q.x : t.y - q.y) * sg;
      return dd > 0 && lat < HS[t.k] + HS[q.k] - LAT && (q.dir % 2) !== (t.dir % 2);
    });
    if (!pusher) return null;
  }
  if (si === 0) {
    // 1판: 앞길에 있는 장난감은 같은 쪽을 본다(밀면 같이 쏙) — 줄이 적어도 하나
    const S = newSim(L);
    let chain = false;
    for (const t of S.toys)
      for (const q of S.toys) {
        if (q === t) continue;
        const X = t.dir % 2 === 1, sg = t.dir === 1 || t.dir === 2 ? 1 : -1;
        const lat = Math.abs(X ? q.y - t.y : q.x - t.x), dd = (X ? q.x - t.x : q.y - t.y) * sg;
        if (dd > 0 && lat < HS[t.k] + HS[q.k] - LAT) {
          if (q.dir !== t.dir) return null;
          chain = true;
        }
      }
    if (!chain) return null;
  }
  return L;
}

/** 바라보는 쪽으로 나갈 수 있나: 문을 보거나, 통통 벽에 튕겨 반대편 문으로 */
function exitable(L: Level, dir: number, lat: number, h: number) {
  return fits(L, dir, lat, h) || (isRub(L, dir, lat) && fits(L, (dir + 2) % 4, lat, h));
}
/** 계획대로 둘 때 그 판의 새것을 쓰나 (0~1) */
function newUse(L: Level, key: string) {
  let S = newSim(L);
  const got = new Set<string>();
  for (const i of L.plan) {
    const rec: Rec[] = [], k = S.toys[i].k, S2 = simTap(L, S, i, rec);
    if (k === BEAR && S2.now >= 2) got.add('bear');
    for (const e of rec) {
      const q = S.toys[e.i];
      if (e.k === 'push' && q.k === BEAR) got.add('bear');
      if ((e.k === 'push' || e.k === 'exit') && q.k === MARBLE && e.i !== i) got.add('marble');
      if (e.k === 'spin') got.add('top');
      if (e.k === 'boing') got.add('rubber');
      if (e.k === 'slime') got.add('slime');
    }
    S = S2;
  }
  return key === 'all' ? Math.min(1, got.size / 3) : got.has(key) ? 1 : 0;
}
/** 아무 장난감이나 톡 하는 사람이 이 판을 깰 확률 */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    let S = newSim(L);
    while (S.left > 0 && S.taps < L.limit) {
      const live = S.toys.filter((t) => !t.out);
      S = simTap(L, S, live[Math.floor(r() * live.length)].id);
    }
    if (S.left === 0) ok++;
  }
  return ok / n;
}
/** 버릇대로 끝까지 두어 별 셋이 나오나 */
function habitRun(L: Level, pick: (L: Level, S: Sim) => number) {
  let S = newSim(L);
  while (S.left > 0 && S.taps < L.limit) {
    const i = pick(L, S);
    if (i < 0) break;
    S = simTap(L, S, i);
  }
  return starsOf(L, S, S.left === 0);
}
export function starsOf(L: Level, S: Sim, ok: boolean): boolean[] {
  return [ok, ok && L.nstars >= 2 && S.taps <= L.par, ok && L.nstars >= 3 && S.best >= L.C];
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, si: number): Level {
  const ck = `${seed}:${si}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[si], r = mulberry32((seed * 131 + si * 7919 + 3) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  const K = si === 0 ? 6 : si === 1 ? 8 : 30;
  for (let c = 0, tries = 0; c < K && tries < 4000; tries++) {
    const L = candidate(d, r, si);
    if (!L) continue;
    c++;
    const P = planLevel(L, newSim(L), d.C);
    if (!P) continue;
    L.plan = P.path;
    L.par = P.path.length + d.parPlus;
    L.C = d.nstars >= 3 ? Math.max(2, Math.min(d.C, P.best)) : d.C;
    L.limit = (si === 0 ? d.n : L.par) + d.slack;
    L.hint = P.path[0];
    let v: number;
    if (si === 0) v = (P.best >= 2 && simTap(L, newSim(L), P.path[0]).now >= 2 ? 2 : 0) + randomPass(L, r, 12);
    else if (si === 1) v = -Math.abs(randomPass(L, r, 16) - 0.7) + (P.path.length < d.n ? 0.4 : 0);
    else {
      // 3판부터: '한 번에 많이 빠지는 것' 버릇으로는 별 셋이 안 나오고, 내다보면 나오는 판 (밀 장난감을 아끼고 줄을 세우는 수가 있어야)
      // + 그 판의 새것(곰·구슬·팽이·통통 벽·끈끈이)을 계획이 실제로 써야 한다
      const g = habitRun(L, habitGreedy), gs = g[0] && g[1] && g[2];
      v = (gs ? 0 : 3) + (P.best >= d.C ? 1.5 : -2) + (d.n - P.path.length) * 0.15 + 0.5 - Math.abs(randomPass(L, r, 8) - 0.3) + newUse(L, d.key) * 1.2;
    }
    if (v > bv) (bv = v), (pick = L);
    if (si >= 2 && bv >= 6.1) break;
  }
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick!);
  return pick!;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; i?: number }
interface Fly { id: number; k: number; col: number; dir: number; x: number; y: number; side: number; t0: number; to: number; land: number }
interface Mood { m: string; until: number }
export interface ToyState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number;
  L: Level; S: Sim;
  down: boolean; ax: number; ay: number; press: number; lastTap: number; firstTap: boolean; slow: number; moveT: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  seen: Set<string>; tips: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  mood: Mood[]; fly: Fly[]; dog: { mode: string; until: number; hold: number }; caught: number;
}

const ev = (s: ToyState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, i?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, i });
/** 처음 한 번만 보여 주는 배우기 한 줄 (새것 수에는 안 셈) */
function tip(s: ToyState, key: string, text: string) {
  if (s.tips.has(key)) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: ToyState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const RESULT_OK = 200, RESULT_FAIL = 170, NEWS_T = 170, CARD_T = 150, WIN_PTS = 300;
/** 별마다 점수: 어려운 별일수록 크다 (모두 빼기 · N번 안에 · 한 번에 셋) */
const STAR_VAL = [50, 100, 150];

function newStage(s: ToyState) {
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.phase = 'play';
  s.pt = 0;
  s.press = -1;
  s.lastTap = s.t;
  s.starOk = [false, false, false];
  s.mood = s.L.toys.map(() => ({ m: '', until: 0 }));
  s.fly = [];
  s.slow = 0;
  see(s, STAGES[s.stage].key, '');
}

function finish(s: ToyState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    s.starOk = starsOf(L, S, true);
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.starOk.reduce((a, ok, k) => a + (ok ? STAR_VAL[k] : 0), 0) + Math.max(0, L.limit - S.taps) * 10;
    if (s.stage === STAGE_COUNT - 1) (s.won = true), (s.pts += WIN_PTS);
    s.dog.mode = 'happy';
    s.dog.until = s.t + 160;
  } else {
    s.hearts--;
    s.tries++;
    s.dog.mode = 'sad';
    s.dog.until = s.t + 160;
  }
}

/** 손가락 자리(바닥 좌표)에서 가장 가까운 장난감 */
function pickToy(s: ToyState, x: number, y: number) {
  let best = -1, bd = 0.13;
  for (const t of s.S.toys) {
    if (t.out) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (d < bd) (bd = d), (best = t.id);
  }
  return best;
}

/** 물리 한 틱의 사건을 연출로 */
function onRec(s: ToyState, rec: Rec[]) {
  for (const e of rec) {
    const m = s.mood[e.i];
    if (e.k === 'push') {
      m.m = 'push';
      m.until = s.t + 50;
      ev(s, 'push', e.x, e.y, ['어어어', '어어?!', '으아아'][(e.i + s.S.taps) % 3], '#fff3c4', 0, e.i);
      see(s, 'shove', '');
    } else if (e.k === 'bonk') {
      tip(s, 'bonk', '🧱 쿵! 초록 문이 아닌 벽은 막혀요');
      m.m = 'dizzy';
      m.until = s.t + 110;
      ev(s, 'bonk', e.x, e.y, '쿵!', '#ffd0c0', e.v, e.i);
    } else if (e.k === 'boing') {
      tip(s, 'boing', '🩷 통! 통통 벽은 반대로 튕겨 보내요');
      m.m = 'push';
      m.until = s.t + 50;
      ev(s, 'boing', e.x, e.y, '통!', '#ffb8e0', e.v, e.i);
    } else if (e.k === 'spin') {
      tip(s, 'spin', '🌀 빙글! 밀린 팽이는 화살이 돌아요');
      ev(s, 'spin', e.x, e.y, '빙글!', '#c8f0ff', 0, e.i);
    } else if (e.k === 'slime') {
      tip(s, 'slime', '🟢 찐득! 끈끈이에 들어가면 멈춰요');
      m.m = 'stuck';
      m.until = s.t + 70;
      ev(s, 'slime', e.x, e.y, '찐득!', '#c8ffb0', 0, e.i);
    } else if (e.k === 'exit') {
      const t = s.S.toys[e.i];
      m.m = 'fly';
      m.until = s.t + 999;
      s.fly.push({ id: e.i, k: t.k, col: t.col, dir: t.dir, x: e.x, y: e.y, side: e.side, t0: s.t, to: 0, land: 0 });
      const n = s.S.now;
      ev(s, 'exit', e.x, e.y, n >= 2 ? `${n}개!` : '쏙!', n >= 3 ? '#ffe066' : '#ffffff', n, e.i);
      if (n >= 3) s.slow = Math.max(s.slow, 26);
    }
  }
}

function doTap(s: ToyState, i: number) {
  const t = s.S.toys[i];
  tap(s.S, i);
  s.lastTap = s.t;
  s.firstTap = true;
  s.moveT = s.t;
  s.mood[i] = { m: 'go', until: s.t + 40 };
  ev(s, 'tap', t.x, t.y, '슝!', '#ffffff', 0, i);
}

/** 멈춘 뒤: 다 뺐나 · 톡을 다 썼나 · 꽉 막혔나 */
function afterSettle(s: ToyState) {
  const S = s.S, L = s.L;
  if (S.now >= 2) tip(s, 'multi', '👏 뒤에서 밀면 앞의 것까지 같이 빠져요');
  else if (S.toys.some((q) => !q.out && q.id !== S.tapped && Math.abs(q.x - q.x0) + Math.abs(q.y - q.y0) > 0.05)) tip(s, 'stay', '👀 밀린 장난감은 제 화살 그대로 새 자리에 서요');
  if (S.now >= 2) ev(s, 'multi', 0.5, 0.45, S.now >= 3 ? `한 번에 ${S.now}개!` : `한 번에 ${S.now}개`, S.now >= 3 ? '#ffe066' : '#fff6d6', S.now);
  if (S.left === 0) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    return;
  }
  let fail = '';
  if (S.taps >= L.limit) fail = '톡을 다 썼어요!';
  else if (!S.toys.some((t) => !t.out && simTap(L, S, t.id).moved)) fail = '꽉 막혀 꼼짝 못 해요!';
  if (fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.why = fail;
    for (const m of s.mood) if (m.m !== 'fly') (m.m = 'dizzy'), (m.until = s.t + 200);
  }
}

/** 날아간 장난감 → 강아지(첫 번째는 덥석, 나머지는 바구니) */
const DOG_Y = 1.2;
function cosmetic(s: ToyState) {
  for (const f of s.fly) {
    if (f.to === 0 && s.t - f.t0 > 6) {
      const catchIt = s.dog.hold < 0 && s.dog.mode !== 'catch';
      f.to = catchIt ? 1 : 2;
      f.land = s.t + 30;
      if (catchIt) (s.dog.mode = 'catch'), (s.dog.until = s.t + 30), (s.dog.hold = f.id);
    }
  }
  s.fly = s.fly.filter((f) => s.t < f.land + 50 || f.to === 0);
  if (s.dog.mode === 'catch' && s.t >= s.dog.until) {
    s.caught++;
    s.dog.mode = 'chew';
    s.dog.until = s.t + 50;
    ev(s, 'catch', 0.2, DOG_Y - 0.08, ['덥석!', '왕!', '앙!'][s.caught % 3], '#fff1c8');
  }
  if (s.dog.mode === 'chew' && s.t >= s.dog.until) (s.dog.mode = 'idle'), (s.dog.hold = -1);
  if ((s.dog.mode === 'happy' || s.dog.mode === 'sad') && s.t >= s.dog.until) s.dog.mode = 'idle';
  for (const m of s.mood) if (m.m && m.m !== 'fly' && s.t >= m.until) m.m = '';
}

export const toyescape: GameDef<ToyState> = {
  id: 'toyescape',
  name: '장난감 상자 화살 탈출',
  genes: ['tapaway', 'shove', 'pointer'],
  twist: '앞이 막혀도 멈추지 않는다 — 톡 한 장난감이 앞의 것을 밀어내며 같이 미끄러지고(무거운 건 덜, 가벼운 건 멀리), 밀려난 장난감은 제 화살을 그대로 들고 새 자리에 서서 다른 길을 막거나 열어 준다',
  rules: ['장난감을 톡 → 화살 쪽으로 슝! 앞에 있는 건 밀어내요.', '문으로 모두 빼면 끝. 문이 아닌 벽은 쿵! 누르고 있으면 어디까지 밀릴지 보여요.'],
  controls: 'touch',
  hint: '장난감을 톡! 누르고 있으면 밀려날 자리가 보여요 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '아이 방 장난감 상자 — 화살 블록 탈출',
    mood: '햇살 드는 아이 방 나무 바닥 위, 색칠한 나무 장난감 상자. 얼굴 달린 화살 블록·곰 인형·유리 구슬·팽이가 상자 문으로 슝 빠져나가고, 상자 앞 강아지가 꼬리를 흔들며 덥석 받아 문다.',
    palette: { bg: '#2b2340', ink: '#fff8ee', muted: '#cbbfe0', accent: '#ffcf5a', hot: '#ff6b6b', soft: '#f6ead8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      down: false, ax: 0, ay: 0, press: -1, lastTap: 0, firstTap: false, slow: 0, moveT: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      seen: new Set<string>(), tips: new Set<string>(), newsQ: [], news: null, events: [], mood: [], fly: [], dog: { mode: 'idle', until: 0, hold: -1 }, caught: 0,
    } as unknown as ToyState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    cosmetic(s);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
      return;
    }
    if (s.phase === 'settle') {
      if (s.pt >= (s.ok ? 50 : 40)) finish(s);
      return;
    }
    // 움직이는 중: 물리 한 틱 (큰 순간엔 잠깐 느리게 — 틱 순서는 같아서 결과는 미리 보기와 똑같다)
    if (s.S.ax) {
      if (s.slow > 0 && s.slow-- % 2 === 0) return;
      const rec: Rec[] = [];
      tick(s.L, s.S, rec);
      if (rec.length) onRec(s, rec);
      if (!s.S.ax) afterSettle(s);
      return;
    }
    const fy = (y: number) => (y - FY0) / FD;
    if (p) {
      const q = toFloor(s.ax, s.ay);
      s.press = pickToy(s, q.x, q.y);
    }
    if (!release) return;
    const k = s.press;
    s.press = -1;
    if (k < 0) {
      if (fy(s.ay) > -0.05 && fy(s.ay) < 1.05) ev(s, 'miss', s.ax, s.ay, '장난감을 톡!', '#fff3df');
      return;
    }
    doTap(s, k);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (S: Sim, i: number): Input => {
  const t = S.toys[i];
  return { tap: false, dir: 0, pointer: { x: PX(t.x, t.y), y: (PY(t.y) - ZH * 0.5) / A } };
};
/** 장난감 i를 누르는 입력 (봇·화면 확인용) */
export const pressToy = (s: ToyState, i: number): Input => at(s.S, i);
const ready = (s: ToyState) => s.phase === 'play' && !s.down && !s.S.ax && s.t - s.lastTap > 30 && s.pt > 50;
const brain = new WeakMap<object, { key: string; plan: number[]; from: number }>();
/** 잘하는 봇: 판 전체를 물리로 끝까지 내다보는 빔 탐색(판 만들 때와 같은 계획) — 상태가 어긋나면 지금부터 다시 계획 */
export const toyescapeSmart: Bot<ToyState> = {
  name: '장난감 박사',
  act(s) {
    if (!ready(s) || s.t - s.lastTap < 50) return NO;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, plan: s.L.plan.slice(), from: 0 }));
    let i = m.plan[s.S.taps - m.from];
    if (i === undefined || s.S.toys[i].out) {
      const P = planLevel(s.L, s.S, s.L.C);
      m.plan = P ? P.path : [habitGreedy(s.L, s.S)];
      m.from = s.S.taps;
      i = m.plan[0];
    }
    return i >= 0 ? at(s.S, i) : NO;
  },
};
/** 버릇 봇 ①(판 고르기에 안 쓴 독립 봇): 지금 바로 빠질 수 있는 것부터 */
export const toyescapeHabit: Bot<ToyState> = {
  name: '버릇: 바로 빠지는 것부터',
  act(s) {
    if (!ready(s) || s.t - s.lastTap < 50) return NO;
    const i = habitClear(s.L, s.S);
    return i >= 0 ? at(s.S, i) : NO;
  },
};
/** 버릇 봇 ②(3판부터 판 고르기에 씀): 톡 한 번에 가장 많이 빠지는 것 */
export const toyescapeHabit2: Bot<ToyState> = {
  name: '버릇: 한 번에 많이 빠지는 것',
  act(s) {
    if (!ready(s) || s.t - s.lastTap < 50) return NO;
    const i = habitGreedy(s.L, s.S);
    return i >= 0 ? at(s.S, i) : NO;
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 못하는 봇: 아무 때나 아무 장난감이나 톡 (가끔 화면 아무 데나) */
export const toyescapeRandom: Bot<ToyState> = {
  name: '아무거나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 60), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    const live = s.S.toys.filter((t) => !t.out);
    if (rng() < 0.2 || !live.length) m.p = { x: rng(), y: rng() };
    else {
      const t = live[Math.floor(rng() * live.length)];
      m.p = { x: PX(t.x, t.y) + (rng() - 0.5) * 0.03, y: (PY(t.y) - ZH * 0.5 + (rng() - 0.5) * 0.03) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 화면 배치 ─────────────────────────────
/** 바닥(x 0~1, y 0~1, 0 = 상자 뒤) → 화면(가로 0~1, 세로 0~A). 뒤가 조금 좁은 3/4 시점 */
const FY0 = 0.39, FD = 0.68, SC0 = 0.88;
const scl = (y: number) => 0.84 + 0.08 * y;
const PX = (x: number, y: number) => 0.5 + (x - 0.5) * scl(y);
const PY = (y: number) => FY0 + y * FD;
/** 블록 높이(화면) */
const ZH = 0.06;
function toFloor(sx: number, sy: number) {
  // 장난감 윗면을 누르는 것이 보통이라 높이 절반만큼 아래로 본다
  const y = (sy + ZH * 0.5 - FY0) / FD;
  return { x: 0.5 + (sx - 0.5) / scl(y), y };
}

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, q: number) => {
  const p = hex(a), r = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (r[i] - v) * q).toString(16).padStart(2, '0')).join('');
};
export const COLS = ['#ef5b5b', '#3b8cf6', '#f7c531', '#36b26c', '#a45ee0', '#ff8a2b'];
/** 상자 벽 높이(화면) · 벽 두께(바닥 좌표) · 상자 바닥 밑 두께(화면) */
const WZ = 0.065, WT = 0.045, BASE = 0.03, LEAN = 1.25;
/** 앞 벽은 낮게 (앞줄 장난감 얼굴이 보이게) */
const WZF = 0.03;
const NUM = ['', '하나', '둘', '셋', '넷', '다섯', '여섯'];
const starText = (L: Level, k: number) => (k === 0 ? '모두 빼기' : k === 1 ? `${L.par}번 안에 끝내기` : `한 번에 ${NUM[L.C]} 빼기`);
/** 강아지 · 바구니 자리(화면) */
const DOG = { x: 0.17, y: 1.215 }, BASKET = { x: 0.84, y: 1.22 };

interface Preview { S: Sim; rec: Rec[]; exits: number[]; moved: number[] }
const pvCache = new WeakMap<object, { key: string; p: Preview }>();
function preview(s: ToyState, i: number): Preview {
  const key = `${i}:${s.stage}:${s.tries}:${s.S.taps}`, c = pvCache.get(s);
  if (c && c.key === key) return c.p;
  const rec: Rec[] = [], S2 = simTap(s.L, s.S, i, rec), exits: number[] = [], moved: number[] = [];
  S2.toys.forEach((q, j) => {
    const o = s.S.toys[j];
    if (o.out) return;
    if (q.out) exits.push(j);
    else if (Math.abs(q.x - o.x) + Math.abs(q.y - o.y) > 0.004 || q.dir !== o.dir) moved.push(j);
  });
  exits.sort((a, b) => S2.toys[a].out - S2.toys[b].out);
  const p = { S: S2, rec, exits, moved };
  pvCache.set(s, { key, p });
  return p;
}

/** 날아간 장난감의 지금 화면 자리 · 크기 · 회전 */
function flyPos(s: ToyState, f: Fly, w: number) {
  const X = (x: number) => x * w;
  const ex = X(PX(f.x, f.y)), ey = X(PY(f.y) - ZH * 0.4);
  const dx = DX[f.side], dy = DY[f.side] * 0.7, age = s.t - f.t0;
  const p1x = ex + dx * X(0.07), p1y = ey + dy * X(0.07) - (f.side === 0 ? X(0.04) : 0);
  if (age <= 6 || f.to === 0) {
    const q = Math.min(1, age / 6);
    return { x: ex + (p1x - ex) * q, y: ey + (p1y - ey) * q, sc: 1 - q * 0.1, rot: 0, done: false };
  }
  const T = f.land - (f.t0 + 6), q = Math.min(1, (age - 6) / T);
  const tx = X(f.to === 1 ? DOG.x + 0.075 : BASKET.x + ((f.id % 3) - 1) * 0.03), ty = X(f.to === 1 ? DOG.y - 0.075 : BASKET.y - 0.035);
  const hgt = X(f.side === 0 ? 0.3 : 0.16) + Math.abs(tx - p1x) * 0.15;
  return { x: p1x + (tx - p1x) * q, y: p1y + (ty - p1y) * q - Math.sin(q * Math.PI) * hgt, sc: 0.9 - q * 0.35, rot: q * (f.id % 2 ? 7 : -7), done: q >= 1 };
}

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: ToyState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, S = s.S, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const SX = (x: number, y: number) => X(PX(x, y)), SY = (y: number) => Y(PY(y));
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(R(sz))}px system-ui, sans-serif`);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  };
  const pressing = s.phase === 'play' && s.down && !S.ax && s.press >= 0;
  const pv = pressing ? preview(s, s.press) : null;
  const cardUp = s.phase === 'play' && s.pt < CARD_T && !s.down && !S.ax && S.taps === 0;

  ctx.save();
  fx.begin(ctx);
  drawRoom(ctx, w, h, X, Y, R);
  drawBoxBack(ctx, s, Y, R, SX, SY, t);

  // ── 미리 보기: 바닥에 그리는 길(장난감 밑) ──
  if (pv) drawPaths(ctx, s, pv, SX, SY, R, t);

  // ── 장난감 (뒤에서 앞으로) ──
  const live = S.toys.filter((q) => !q.out).sort((a, b) => a.y - b.y);
  for (const q of live) {
    const u = w * scl(q.y), m = s.mood[q.id];
    let mood = m?.m ?? '';
    if (pressing && q.id === s.press) mood = 'press';
    else if (!mood && pv && pv.moved.includes(q.id)) mood = 'worry';
    else if (!mood && pv && pv.exits.includes(q.id) && q.id !== s.press) mood = 'worry';
    const bob = q.v !== 0 ? Math.sin(t * 0.9 + q.id) * R(0.003) : 0;
    // 미리 보기 중: 움직일 장난감은 흐리게(지금 자리), 멈출 자리는 고스트로 진하게
    const fade = !!pv && q.id !== s.press && (pv.moved.includes(q.id) || pv.exits.includes(q.id));
    if (fade) ctx.globalAlpha = 0.5;
    drawToy(ctx, q, SX(q.x, q.y), SY(q.y) + bob, u, mood, t, { hot: pressing && q.id === s.press, lean: q.x - 0.5 });
    ctx.globalAlpha = 1;
  }
  // ── 미리 보기: 멈출 자리 고스트 · 빠질 것 ──
  if (pv) drawGhosts(ctx, s, pv, SX, SY, R, Y, font, t, w);
  drawBoxFront(ctx, s, Y, R, SX, SY);

  // ── 첫 판 손가락 안내 ──
  if (s.stage === 0 && !s.firstTap && s.phase === 'play' && !S.ax && !s.down && L.hint >= 0 && !S.toys[L.hint].out && s.pt > 40) {
    const q = S.toys[L.hint], hx = SX(q.x, q.y), hy = SY(q.y) - Y(ZH) * 0.6, k = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - k * 0.8})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(hx, hy, R(0.05 + k * 0.05), R(0.04 + k * 0.04), 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.07);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', hx + R(0.03), hy + R(0.06) + Math.sin(t * 0.15) * R(0.012));
  }

  // ── 날아간 장난감 · 강아지 · 바구니 ──
  drawBasket(ctx, s, X, Y, R, t);
  drawDog(ctx, s, X(DOG.x), Y(DOG.y), R(1), t);
  for (const f of s.fly) {
    const P = flyPos(s, f, w);
    if (P.done && f.to === 1) continue;
    if (P.done && s.t - f.land > 16) continue;
    ctx.save();
    ctx.translate(P.x, P.y);
    ctx.rotate(P.rot);
    drawToy(ctx, { id: f.id, k: f.k, col: f.col, dir: f.dir, v: 0 }, 0, 0, w * 0.86 * P.sc, 'fly', t, {});
    ctx.restore();
  }

  // ── 사건 → 연출 ──
  const last = fx.memo.ev ?? -1;
  for (const e of s.events) {
    if (e.t <= last || s.t - e.t > 30) continue;
    const ex = SX(e.x, e.y), ey = SY(e.y) - Y(ZH);
    if (e.kind === 'tap') (fx.ring(ex, ey, '#ffffff', R(0.08), 3), say(ex, ey - R(0.04), e.text!, '#ffffff', R(0.045)));
    else if (e.kind === 'push') (say(ex, ey - R(0.03), e.text!, e.col!, R(0.038)), fx.burst(ex, ey + Y(ZH), '#e8d8c0', 6, 1.6, 2));
    else if (e.kind === 'bonk') (say(ex, ey - R(0.02), '쿵!', '#ffd0c0', R(0.05)), fx.kick(Math.min(7, 2 + (e.v ?? 0) * 120)), fx.burst(ex, ey + Y(ZH) * 0.6, '#d8c8b0', 12, 2.4, 2.4), fx.burst(ex, ey, '#fff3a0', 5, 1.5, 2));
    else if (e.kind === 'boing') (say(ex, ey - R(0.02), '통!', '#ffb8e0', R(0.05)), fx.ring(ex, ey + Y(ZH) * 0.5, '#ff8ccf', R(0.09), 4), fx.kick(3));
    else if (e.kind === 'spin') (say(ex, ey - R(0.03), '빙글!', '#c8f0ff', R(0.042)), fx.ring(ex, ey, '#8fe3ff', R(0.07), 3));
    else if (e.kind === 'slime') (say(ex, ey - R(0.03), '찐득!', '#c8ffb0', R(0.042)), fx.burst(ex, ey + Y(ZH), '#7be06a', 10, 1.8, 2.6));
    else if (e.kind === 'exit') {
      const n = e.v ?? 1;
      fx.burst(ex, ey, COLS[(e.i ?? 0) % 6], 14 + n * 6, 3 + n * 0.6, 2.6);
      fx.burst(ex, ey, '#ffffff', 8, 2.4, 2);
      fx.ring(ex, ey, n >= 3 ? '#ffe066' : '#ffffff', R(0.08 + n * 0.02), 3 + n);
      say(ex, ey - R(0.05), e.text!, e.col!, R(n >= 3 ? 0.07 : n === 2 ? 0.058 : 0.048));
      if (n >= 2) fx.kick(2 + n * 1.5);
    } else if (e.kind === 'multi') {
      const n = e.v ?? 2;
      say(X(0.5), Y(0.62), e.text!, e.col!, R(n >= 3 ? 0.09 : 0.068));
      if (n >= 3) (fx.blink('#fff6c0', 0.35), fx.kick(9), fx.burst(X(0.5), Y(0.62), '#ffe066', 40, 5, 3.2), fx.burst(X(0.5), Y(0.62), '#ff8ccf', 24, 4, 2.6));
      else fx.burst(X(0.5), Y(0.62), '#fff6d6', 18, 3.5, 2.4);
    } else if (e.kind === 'catch') (say(X(DOG.x + 0.06), Y(DOG.y - 0.14), e.text!, e.col!, R(0.045)), fx.burst(X(DOG.x + 0.07), Y(DOG.y - 0.08), '#fff1c8', 8, 2, 2));
    else if (e.kind === 'miss') say(X(e.x), Y(e.y), e.text!, e.col!, R(0.04));
    else if (e.kind === 'star') (say(X(0.5), Y(0.35), e.text!, '#ffe066', R(0.055)), fx.burst(X(0.5), Y(0.35), '#ffe066', 24, 4, 2.6));
  }
  if (s.events.length) fx.memo.ev = Math.max(last, s.events[s.events.length - 1].t);
  // 판 끝 연출
  if (s.phase === 'result' && s.pt === 1) {
    if (s.ok) (fx.blink('#fff4c8', 0.3), fx.burst(X(0.5), Y(0.6), '#ffe066', 46, 6, 3.4), fx.burst(X(0.5), Y(0.6), '#7ee0ff', 30, 5, 3), fx.kick(6));
    else (fx.kick(8), fx.burst(X(0.5), Y(0.7), '#9a8c7c', 30, 4, 3));
  }

  // ── 스포트라이트 (새것) ──
  if (s.phase === 'play' && s.pt < CARD_T + 30 && !s.down && !S.ax && S.taps === 0) drawSpot(ctx, s, d, Y, R, SX, SY, font, w);
  ctx.restore();

  drawHud(ctx, s, d, w, h, X, Y, R, font, th, pv, cardUp);
}

/** 아이 방: 벽지 · 창문 햇살 · 선반 · 나무 바닥 */
function drawRoom(ctx: CanvasRenderingContext2D, w: number, h: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number) {
  const wallB = Y(PY(-WT) - WZ - 0.02);
  // 벽지
  const g = ctx.createLinearGradient(0, 0, 0, wallB);
  g.addColorStop(0, '#5d4b8f');
  g.addColorStop(1, '#8a76c0');
  ctx.fillStyle = g;
  ctx.fillRect(-10, -10, w + 20, wallB + 10);
  // 벽지 무늬: 작은 별·점
  for (let k = 0; k < 26; k++) {
    const x = hsh(k * 3.1) * w, y = R(0.09) + hsh(k * 7.3) * (wallB - R(0.09));
    ctx.fillStyle = k % 3 ? 'rgba(255,255,255,.12)' : 'rgba(255,224,140,.22)';
    ctx.beginPath();
    if (k % 3) ctx.arc(x, y, R(0.006), 0, TAU);
    else for (let j = 0; j < 10; j++) {
      const a = (j / 10) * TAU - Math.PI / 2, rr = j % 2 ? R(0.006) : R(0.014);
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.fill();
  }
  // 창문 (오른쪽 위) + 햇살
  {
    const wx = X(0.72), wy = R(0.11), ww = R(0.2), wh = R(0.15);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#9fe0ff');
    sky.addColorStop(1, '#e8f8ff');
    ctx.fillStyle = '#f3e3c8';
    ctx.beginPath();
    ctx.roundRect(wx - R(0.012), wy - R(0.012), ww + R(0.024), wh + R(0.024), R(0.012));
    ctx.fill();
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.3, wy + wh * 0.62, R(0.018), 0, TAU);
    ctx.arc(wx + ww * 0.42, wy + wh * 0.55, R(0.024), 0, TAU);
    ctx.arc(wx + ww * 0.55, wy + wh * 0.64, R(0.017), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffe27a';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.8, wy + wh * 0.28, R(0.022), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#f3e3c8';
    ctx.lineWidth = R(0.008);
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy);
    ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2);
    ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    // 커튼
    ctx.fillStyle = '#ff9db8';
    for (const sd of [-1, 1]) {
      const cx = sd < 0 ? wx - R(0.02) : wx + ww + R(0.02);
      ctx.beginPath();
      ctx.moveTo(cx, wy - R(0.02));
      ctx.quadraticCurveTo(cx - sd * R(0.04), wy + wh * 0.5, cx + sd * R(0.01), wy + wh + R(0.02));
      ctx.lineTo(cx + sd * R(0.03), wy + wh + R(0.02));
      ctx.quadraticCurveTo(cx + sd * R(0.012), wy + wh * 0.5, cx + sd * R(0.028), wy - R(0.02));
      ctx.closePath();
      ctx.fill();
    }
  }
  // 선반 (왼쪽 위): 로켓 · 책
  {
    const sy = R(0.235);
    ctx.fillStyle = '#c99a68';
    ctx.fillRect(X(0.05), sy, R(0.25), R(0.014));
    ctx.fillStyle = 'rgba(0,0,0,.18)';
    ctx.fillRect(X(0.055), sy + R(0.014), R(0.24), R(0.008));
    const books = ['#ff7b7b', '#7bc4ff', '#ffd76b', '#8be08b'];
    books.forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fillRect(X(0.07) + k * R(0.022), sy - R(0.06 + (k % 2) * 0.012), R(0.018), R(0.06 + (k % 2) * 0.012));
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fillRect(X(0.07) + k * R(0.022) + R(0.004), sy - R(0.05), R(0.01), R(0.004));
    });
    ctx.fillStyle = '#ffffff';
    font2(ctx, R(0.05));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('🚀', X(0.24), sy - R(0.004));
  }
  // 걸레받이 · 나무 바닥
  ctx.fillStyle = '#efe2cc';
  ctx.fillRect(-10, wallB - R(0.012), w + 20, R(0.014));
  const fg = ctx.createLinearGradient(0, wallB, 0, h);
  fg.addColorStop(0, '#b7834f');
  fg.addColorStop(1, '#8e5f37');
  ctx.fillStyle = fg;
  ctx.fillRect(-10, wallB, w + 20, h - wallB + 10);
  ctx.strokeStyle = 'rgba(70,40,15,.25)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 14; k++) {
    const y = wallB + k * R(0.075);
    ctx.beginPath();
    ctx.moveTo(-10, y);
    ctx.lineTo(w + 10, y);
    ctx.stroke();
    for (let j = 0; j < 4; j++) {
      const x = (hsh(k * 11 + j) * 1.2 - 0.1) * w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + R(0.075));
      ctx.stroke();
    }
  }
  // 창문 햇살
  const sun = ctx.createLinearGradient(X(0.8), R(0.2), X(0.3), Y(1.2));
  sun.addColorStop(0, 'rgba(255,240,200,.16)');
  sun.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.moveTo(X(0.66), R(0.26));
  ctx.lineTo(X(0.98), R(0.26));
  ctx.lineTo(X(0.8), Y(1.3));
  ctx.lineTo(X(0.05), Y(1.3));
  ctx.closePath();
  ctx.fill();
}
const font2 = (ctx: CanvasRenderingContext2D, px: number, wgt = 800) => (ctx.font = `${wgt} ${Math.round(px)}px system-ui, sans-serif`);

/** 벽 칸 나누기: [0,1]에서 문 칸을 뺀 나머지 */
function solid(spans: number[][]): number[][] {
  const out: number[][] = [];
  let a = 0;
  for (const [p, q] of spans) {
    if (p > a + 1e-6) out.push([a, p]);
    a = q;
  }
  if (a < 1 - 1e-6) out.push([a, 1]);
  return out;
}
/** 벽 칸을 다시 보통/통통으로 쪼개기 */
function pieces(L: Level, side: number): { a: number; b: number; rub: boolean }[] {
  const out: { a: number; b: number; rub: boolean }[] = [];
  for (const [a, b] of solid(L.doors[side])) {
    let cuts = [a, b];
    for (const [p, q] of L.rub[side]) cuts.push(Math.max(a, Math.min(b, p)), Math.max(a, Math.min(b, q)));
    cuts = [...new Set(cuts.map((v) => Math.round(v * 1e6) / 1e6))].sort((x, y) => x - y);
    for (let k = 0; k < cuts.length - 1; k++) {
      const m = (cuts[k] + cuts[k + 1]) / 2;
      if (cuts[k + 1] - cuts[k] > 1e-6) out.push({ a: cuts[k], b: cuts[k + 1], rub: isRub(L, side, m) });
    }
  }
  return out;
}

function quad(ctx: CanvasRenderingContext2D, p: number[][]) {
  ctx.beginPath();
  ctx.moveTo(p[0][0], p[0][1]);
  for (let k = 1; k < p.length; k++) ctx.lineTo(p[k][0], p[k][1]);
  ctx.closePath();
}

const WOOD = '#e9c48d', PAINT = '#4f7fd8', PAINT_D = '#3a62b0', RUB = '#ff7ec2', RUB_D = '#e0559f';

/** 상자 바닥 · 끈끈이 · 문 앞 표시 · 뒤·옆 벽 */
function drawBoxBack(ctx: CanvasRenderingContext2D, s: ToyState, Y: (y: number) => number, R: (r: number) => number, SX: (x: number, y: number) => number, SY: (y: number) => number, t: number) {
  const L = s.L;
  const P = (x: number, y: number, z = 0) => [SX(x, y) + Y((x - 0.5) * z * LEAN), SY(y) - Y(z)];
  // 상자 그림자
  ctx.fillStyle = 'rgba(40,20,5,.35)';
  quad(ctx, [P(-WT - 0.02, -WT + 0.04), P(1 + WT + 0.04, -WT + 0.04), P(1 + WT + 0.06, 1 + WT + 0.08), P(-WT - 0.01, 1 + WT + 0.08)]);
  ctx.fill();
  // 바닥 매트
  const mg = ctx.createLinearGradient(0, SY(0), 0, SY(1));
  mg.addColorStop(0, '#d9efe6');
  mg.addColorStop(1, '#f4fbf3');
  ctx.fillStyle = mg;
  quad(ctx, [P(0, 0), P(1, 0), P(1, 1), P(0, 1)]);
  ctx.fill();
  // 매트 격자 무늬 (대충 칸)
  for (let cx = 0; cx < 5; cx++)
    for (let cy = 0; cy < 5; cy++) {
      if ((cx + cy) % 2) continue;
      ctx.fillStyle = 'rgba(120,190,170,.13)';
      quad(ctx, [P(cx * 0.2, cy * 0.2), P(cx * 0.2 + 0.2, cy * 0.2), P(cx * 0.2 + 0.2, cy * 0.2 + 0.2), P(cx * 0.2, cy * 0.2 + 0.2)]);
      ctx.fill();
    }
  // 벽 쪽 그늘
  const sh = ctx.createLinearGradient(0, SY(0), 0, SY(0.12));
  sh.addColorStop(0, 'rgba(40,60,60,.25)');
  sh.addColorStop(1, 'rgba(40,60,60,0)');
  ctx.fillStyle = sh;
  quad(ctx, [P(0, 0), P(1, 0), P(1, 0.12), P(0, 0.12)]);
  ctx.fill();
  // 끈끈이
  for (const z of L.slime) {
    const cx = (z[0] + z[2]) / 2, cy = (z[1] + z[3]) / 2;
    ctx.fillStyle = 'rgba(90,200,70,.55)';
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) {
      const a = (k / 24) * TAU, wob = 1 + Math.sin(a * 5 + t * 0.05) * 0.06;
      const x = cx + Math.cos(a) * (z[2] - z[0]) * 0.5 * wob, y = cy + Math.sin(a) * (z[3] - z[1]) * 0.5 * wob;
      if (k) ctx.lineTo(SX(x, y), SY(y));
      else ctx.moveTo(SX(x, y), SY(y));
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,150,40,.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let k = 0; k < 5; k++) {
      const a = hsh(k + cx * 9) * TAU, rr = hsh(k * 3 + cy) * 0.35;
      const x = cx + Math.cos(a) * (z[2] - z[0]) * rr, y = cy + Math.sin(a) * (z[3] - z[1]) * rr, ph = (t * 0.03 + k * 0.7) % 1;
      ctx.fillStyle = `rgba(220,255,200,${0.7 - ph * 0.6})`;
      ctx.beginPath();
      ctx.arc(SX(x, y), SY(y) - ph * R(0.01), R(0.006 + ph * 0.006), 0, TAU);
      ctx.fill();
    }
  }
  // 문 앞 바닥 화살 무늬 (밖으로 »)
  for (let side = 0; side < 4; side++)
    for (const [a, b] of L.doors[side]) {
      const m = (a + b) / 2;
      for (let k = 0; k < 2; k++) {
        const dd = 0.05 + k * 0.045, ph = ((t * 0.02 + k * 0.5) % 1) * 0.02;
        const x = side === 1 ? 1 - dd + ph : side === 3 ? dd - ph : m, y = side === 2 ? 1 - dd + ph : side === 0 ? dd - ph : m;
        const ax = DX[side], ay = DY[side], px = -ay, py = ax, sz = 0.035;
        ctx.strokeStyle = 'rgba(60,170,90,.55)';
        ctx.lineWidth = R(0.009);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(SX(x - ax * sz + px * sz, y - ay * sz + py * sz), SY(y - ay * sz + py * sz));
        ctx.lineTo(SX(x, y), SY(y));
        ctx.lineTo(SX(x - ax * sz - px * sz, y - ay * sz - py * sz), SY(y - ay * sz - py * sz));
        ctx.stroke();
      }
    }
  ctx.lineCap = 'butt';
  // 뒤 벽 (안쪽 면 + 윗면)
  for (const pc of pieces(L, 0)) {
    const g = ctx.createLinearGradient(0, SY(0) - Y(WZ), 0, SY(0));
    g.addColorStop(0, pc.rub ? RUB : PAINT);
    g.addColorStop(1, pc.rub ? RUB_D : PAINT_D);
    ctx.fillStyle = g;
    quad(ctx, [P(pc.a, 0), P(pc.b, 0), P(pc.b, 0, WZ), P(pc.a, 0, WZ)]);
    ctx.fill();
    if (pc.rub) rubDots(ctx, P(pc.a, 0, WZ * 0.5), P(pc.b, 0, WZ * 0.5), R, t);
    ctx.fillStyle = pc.rub ? '#ffc2e3' : WOOD;
    quad(ctx, [P(pc.a, 0, WZ), P(pc.b, 0, WZ), P(pc.b, -WT, WZ), P(pc.a, -WT, WZ)]);
    ctx.fill();
  }
  // 옆 벽 (왼쪽·오른쪽: 안쪽 면 + 윗면)
  for (const side of [3, 1]) {
    const x0 = side === 3 ? 0 : 1, xo = side === 3 ? -WT : 1 + WT;
    for (const pc of pieces(L, side)) {
      ctx.fillStyle = pc.rub ? RUB_D : side === 3 ? '#4672c4' : '#3d64ae';
      quad(ctx, [P(x0, pc.a), P(x0, pc.b), P(x0, pc.b, WZ), P(x0, pc.a, WZ)]);
      ctx.fill();
      if (pc.rub) rubDots(ctx, P(x0, pc.a, WZ * 0.5), P(x0, pc.b, WZ * 0.5), R, t);
      ctx.fillStyle = pc.rub ? '#ffc2e3' : WOOD;
      quad(ctx, [P(x0, pc.a, WZ), P(x0, pc.b, WZ), P(xo, pc.b, WZ), P(xo, pc.a, WZ)]);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,80,40,.35)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  // 문틀 (뒤·옆): 초록 기둥 + 아치
  for (const side of [0, 3, 1]) for (const [a, b] of L.doors[side]) doorArch(ctx, side, a, b, P, R, t);
  // 모서리 기둥
  for (const [cx, cy] of [[0, 0], [1, 0]]) cornerPost(ctx, cx, cy, P, R);
}
function rubDots(ctx: CanvasRenderingContext2D, p: number[], q: number[], R: (r: number) => number, t: number) {
  const n = Math.max(2, Math.round(Math.hypot(q[0] - p[0], q[1] - p[1]) / R(0.035)));
  ctx.fillStyle = 'rgba(255,255,255,.7)';
  for (let k = 0; k < n; k++) {
    const f = (k + 0.5) / n;
    ctx.beginPath();
    ctx.arc(p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f + Math.sin(t * 0.1 + k) * 0.6, R(0.006), 0, TAU);
    ctx.fill();
  }
}
function doorPost(ctx: CanvasRenderingContext2D, side: number, e: number, P: (x: number, y: number, z?: number) => number[], R: (r: number) => number) {
  if (e <= 1e-6 || e >= 1 - 1e-6) return;
  const x = side === 1 ? 1 + WT / 2 : side === 3 ? -WT / 2 : e, y = side === 0 ? -WT / 2 : side === 2 ? 1 + WT / 2 : e;
  const b = P(x, y, 0), top = P(x, y, WZ * 1.55), r = R(0.011);
  ctx.fillStyle = '#2f9e5c';
  ctx.beginPath();
  ctx.roundRect(b[0] - r, top[1], 2 * r, b[1] - top[1], r * 0.6);
  ctx.fill();
  ctx.fillStyle = '#7ff0a8';
  ctx.beginPath();
  ctx.arc(top[0], top[1], r * 1.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.arc(top[0] - r * 0.4, top[1] - r * 0.4, r * 0.45, 0, TAU);
  ctx.fill();
}
function doorArch(ctx: CanvasRenderingContext2D, side: number, a: number, b: number, P: (x: number, y: number, z?: number) => number[], R: (r: number) => number, t: number) {
  const at = (e: number, z: number) => {
    const x = side === 1 ? 1 + WT / 2 : side === 3 ? -WT / 2 : e, y = side === 0 ? -WT / 2 : side === 2 ? 1 + WT / 2 : e;
    return P(x, y, z);
  };
  const pa = at(a, WZ * 1.55), pb = at(b, WZ * 1.55), mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2 - R(side % 2 ? 0.03 : 0.05);
  if (side === 2) {
    // 앞 문은 장난감을 가리지 않게 기둥만
    for (const e of [a, b]) doorPost(ctx, side, e, P, R);
    return;
  }
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#2f9e5c';
  ctx.lineWidth = R(0.016);
  ctx.beginPath();
  ctx.moveTo(pa[0], pa[1]);
  ctx.quadraticCurveTo(mx, my, pb[0], pb[1]);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(160,255,190,.9)';
  ctx.lineWidth = R(0.006);
  ctx.stroke();
  ctx.lineCap = 'butt';
  for (const e of [a, b]) doorPost(ctx, side, e, P, R);
  // 아치 꼭대기 반짝 깃발
  const fx2 = (pa[0] + pb[0]) / 2, fy2 = (pa[1] + pb[1]) / 4 + my / 2;
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(fx2, fy2, R(0.011 + Math.sin(t * 0.1) * 0.002), 0, TAU);
  ctx.fill();
}
function cornerPost(ctx: CanvasRenderingContext2D, cx: number, cy: number, P: (x: number, y: number, z?: number) => number[], R: (r: number) => number) {
  const x = cx ? 1 + WT / 2 : -WT / 2, y = cy ? 1 + WT / 2 : -WT / 2;
  const b = P(x, y, -BASE * 0.5), top = P(x, y, WZ * 1.2), r = R(0.022);
  ctx.fillStyle = '#d9a35c';
  ctx.beginPath();
  ctx.roundRect(b[0] - r, top[1], 2 * r, b[1] - top[1], r * 0.4);
  ctx.fill();
  ctx.fillStyle = '#f6d39a';
  ctx.beginPath();
  ctx.ellipse(top[0], top[1], r, r * 0.6, 0, 0, TAU);
  ctx.fill();
}

/** 앞 벽(뒤에 있는 장난감 아랫부분을 살짝 가림) + 이름표 */
function drawBoxFront(ctx: CanvasRenderingContext2D, s: ToyState, Y: (y: number) => number, R: (r: number) => number, SX: (x: number, y: number) => number, SY: (y: number) => number) {
  const L = s.L;
  const P = (x: number, y: number, z = 0) => [SX(x, y) + Y((x - 0.5) * z * LEAN), SY(y) - Y(z)];
  for (const pc of pieces(L, 2)) {
    // 윗면
    ctx.fillStyle = pc.rub ? '#ffc2e3' : WOOD;
    quad(ctx, [P(pc.a, 1, WZF), P(pc.b, 1, WZF), P(pc.b, 1 + WT, WZF), P(pc.a, 1 + WT, WZF)]);
    ctx.fill();
    // 바깥 면
    const g = ctx.createLinearGradient(0, SY(1 + WT) - Y(WZ), 0, SY(1 + WT) + Y(BASE));
    g.addColorStop(0, pc.rub ? RUB : '#5b8ae0');
    g.addColorStop(1, pc.rub ? RUB_D : '#355ba6');
    ctx.fillStyle = g;
    quad(ctx, [P(pc.a, 1 + WT, WZF), P(pc.b, 1 + WT, WZF), P(pc.b, 1 + WT, -BASE), P(pc.a, 1 + WT, -BASE)]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    quad(ctx, [P(pc.a, 1 + WT, WZF), P(pc.b, 1 + WT, WZF), P(pc.b, 1 + WT, WZF - 0.006), P(pc.a, 1 + WT, WZF - 0.006)]);
    ctx.fill();
    if (pc.rub) rubDots(ctx, P(pc.a, 1 + WT, WZF * 0.4), P(pc.b, 1 + WT, WZF * 0.4), R, s.t);
    else {
      // 별 스티커
      const n = Math.floor((pc.b - pc.a) / 0.22);
      for (let k = 0; k < n; k++) {
        const f = pc.a + (pc.b - pc.a) * ((k + 0.5) / n), q = P(f, 1 + WT, WZF * 0.3);
        ctx.fillStyle = ['#ffd84a', '#ff9db8', '#9ff0c0'][k % 3];
        ctx.beginPath();
        for (let j = 0; j < 10; j++) {
          const a = (j / 10) * TAU - Math.PI / 2, rr = j % 2 ? R(0.007) : R(0.016);
          ctx.lineTo(q[0] + Math.cos(a) * rr, q[1] + Math.sin(a) * rr);
        }
        ctx.fill();
      }
    }
  }
  // 앞 문: 문턱 (바닥 끝)
  for (const [a, b] of L.doors[2]) {
    ctx.fillStyle = '#cfe9dd';
    quad(ctx, [P(a, 1), P(b, 1), P(b, 1 + WT), P(a, 1 + WT)]);
    ctx.fill();
    ctx.fillStyle = '#8fbfae';
    quad(ctx, [P(a, 1 + WT), P(b, 1 + WT), P(b, 1 + WT, -BASE), P(a, 1 + WT, -BASE)]);
    ctx.fill();
    doorArch(ctx, 2, a, b, P, R, s.t);
  }
  for (const [cx, cy] of [[0, 1], [1, 1]]) cornerPost(ctx, cx, cy, P, R);
}

/** 미리 보기: 움직일 장난감들이 지나갈 길 (바닥 점선) */
function drawPaths(ctx: CanvasRenderingContext2D, s: ToyState, pv: Preview, SX: (x: number, y: number) => number, SY: (y: number) => number, R: (r: number) => number, t: number) {
  const ax = s.S.toys[s.press].dir % 2 === 1;
  ctx.lineCap = 'round';
  for (const j of [...pv.moved, ...pv.exits]) {
    const o = s.S.toys[j], q = pv.S.toys[j], out = !!q.out;
    // 축을 따라 lo~hi를 지나 끝자리로 (빠지면 문 밖까지)
    const pts: number[][] = [[o.x, o.y]];
    const far = (p: number) => (ax ? [p, o.y] : [o.x, p]);
    const p0 = ax ? o.x : o.y;
    if (out) {
      const dirSign = (ax ? q.x : q.y) >= p0 ? 1 : -1;
      pts.push(far(dirSign > 0 ? 1.06 : -0.06));
    } else {
      const pe = ax ? q.x : q.y;
      if (q.hi > Math.max(p0, pe) + 0.01) pts.push(far(q.hi));
      if (q.lo < Math.min(p0, pe) - 0.01) pts.push(far(q.lo));
      pts.push([q.x, q.y]);
    }
    ctx.strokeStyle = out ? 'rgba(80,200,120,.85)' : j === s.press ? 'rgba(255,255,255,.85)' : 'rgba(255,200,90,.9)';
    ctx.lineWidth = R(0.012);
    ctx.setLineDash([R(0.016), R(0.014)]);
    ctx.lineDashOffset = -t * 0.8;
    ctx.beginPath();
    pts.forEach((p, k) => (k ? ctx.lineTo(SX(p[0], p[1]), SY(p[1])) : ctx.moveTo(SX(p[0], p[1]), SY(p[1]))));
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.lineCap = 'butt';
}
/** 미리 보기: 멈출 자리 고스트 · 쿵 · 빠질 것 표시 */
function drawGhosts(ctx: CanvasRenderingContext2D, s: ToyState, pv: Preview, SX: (x: number, y: number) => number, SY: (y: number) => number, R: (r: number) => number, Y: (y: number) => number, font: (sz: number, w?: number) => void, t: number, w: number) {
  for (const j of pv.moved) {
    const q = pv.S.toys[j];
    ctx.save();
    ctx.globalAlpha = 0.72 + Math.sin(t * 0.15) * 0.12;
    drawToy(ctx, q, SX(q.x, q.y), SY(q.y), w * scl(q.y), 'ghost', t, { ghost: true, lean: q.x - 0.5 });
    ctx.restore();
  }
  // 쿵 표시 (벽에 막힐 자리)
  const bonks = pv.rec.filter((e) => e.k === 'bonk' || e.k === 'boing');
  const seenB = new Set<string>();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const e of bonks) {
    const k = `${Math.round(e.x * 20)},${Math.round(e.y * 20)}`;
    if (seenB.has(k)) continue;
    seenB.add(k);
    const x = SX(e.x, e.y), y = SY(e.y) - Y(ZH);
    ctx.fillStyle = e.k === 'boing' ? 'rgba(255,120,200,.9)' : 'rgba(255,90,70,.9)';
    ctx.beginPath();
    for (let a = 0; a < 16; a++) {
      const rr = a % 2 ? R(0.018) : R(0.03), an = (a / 16) * TAU;
      ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
    }
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.fillText(e.k === 'boing' ? '통' : '쿵', x, y + 1);
  }
  // 빠질 것: 문 밖 자리에 순서 번호 + 강아지 발
  pv.exits.forEach((j, n) => {
    const o = s.S.toys[j], q = pv.S.toys[j];
    const ax = s.S.toys[s.press].dir % 2 === 1;
    const p0 = ax ? o.x : o.y, pe = ax ? q.x : q.y;
    const sg = pe >= p0 ? 1 : -1;
    const ex = ax ? (sg > 0 ? 1.1 : -0.1) : o.x, ey = ax ? o.y : sg > 0 ? 1.1 : -0.12;
    const x = Math.max(R(0.035), Math.min(R(0.965), SX(ex, ey))), y = SY(ey) - Y(ZH) * 0.6 - n * R(0.012);
    ctx.fillStyle = 'rgba(40,170,90,.95)';
    ctx.beginPath();
    ctx.arc(x, y, R(0.026), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    font(0.036, 900);
    ctx.fillText('쏙', x, y + 1);
  });
}

/** 장난감 하나 (바닥 가운데 sx,sy 기준). u = 바닥 1칸의 화면 폭 */
function drawToy(ctx: CanvasRenderingContext2D, q: { id: number; k: number; col: number; dir: number; v: number }, sx: number, sy: number, u: number, mood: string, t: number, o: { ghost?: boolean; hot?: boolean; lean?: number }) {
  const k = q.k, hw = HS[k] * u, hd = HS[k] * u * (FD / SC0), zh = ZH * u * (1 / SC0) * (k === MARBLE ? 1.4 : k === BEAR ? 1.3 : 1);
  const base = k === BEAR ? '#b47b4c' : k === MARBLE ? mix(COLS[q.col], '#ffffff', 0.2) : COLS[q.col];
  // 그림자
  if (!o.ghost) {
    ctx.fillStyle = 'rgba(30,40,40,.28)';
    ctx.beginPath();
    ctx.ellipse(sx + hw * 0.12, sy + hd * 0.35, hw * 1.08, hd * 0.95, 0, 0, TAU);
    ctx.fill();
  }
  if (o.hot) {
    ctx.save();
    ctx.shadowColor = '#fff6b0';
    ctx.shadowBlur = hw * 0.9;
    ctx.fillStyle = 'rgba(255,246,176,.55)';
    ctx.beginPath();
    ctx.ellipse(sx, sy, hw * 1.3, hd * 1.3, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  const topY = sy - zh;
  if (k === MARBLE) {
    const r = hw * 1.05, cy = sy - r * 0.9;
    const g = ctx.createRadialGradient(sx - r * 0.35, cy - r * 0.4, r * 0.1, sx, cy, r);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, mix(base, '#ffffff', 0.35));
    g.addColorStop(1, mix(base, '#000000', 0.35));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, cy, r, 0, TAU);
    ctx.fill();
    // 속 무늬
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = r * 0.12;
    ctx.beginPath();
    ctx.arc(sx + r * 0.1, cy + r * 0.05, r * 0.55, 0.4 + q.id, 2.4 + q.id);
    ctx.stroke();
    if (!o.ghost) drawArrow(ctx, sx, cy - r * 0.15, q.dir, r * 0.62, r * 0.5);
    if (!o.ghost) drawFace(ctx, sx, cy + r * 0.48, r * 0.55, q, mood, t, r * 1.6);
    return;
  }
  if (k === TOP) {
    // 팽이: 원뿔 + 윗판
    const rr = hw * 1.05;
    ctx.fillStyle = mix(base, '#000000', 0.28);
    ctx.beginPath();
    ctx.moveTo(sx - rr, topY);
    ctx.quadraticCurveTo(sx - rr * 0.6, sy, sx, sy + hd * 0.2);
    ctx.quadraticCurveTo(sx + rr * 0.6, sy, sx + rr, topY);
    ctx.closePath();
    ctx.fill();
    const spin = (q.v !== 0 ? t * 0.5 : 0) + q.id;
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = j % 2 ? mix(base, '#ffffff', 0.45) : base;
      ctx.beginPath();
      ctx.moveTo(sx, topY);
      ctx.ellipse(sx, topY, rr, rr * (FD / SC0), 0, spin + (j / 8) * TAU, spin + ((j + 1) / 8) * TAU);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,.25)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(sx, topY, rr, rr * (FD / SC0), 0, 0, TAU);
    ctx.stroke();
    if (!o.ghost) drawArrow(ctx, sx, topY, q.dir, rr * 0.75, rr * 0.62);
    // 손잡이 (팽이 꼭지)
    ctx.fillStyle = mix(base, '#000000', 0.35);
    ctx.beginPath();
    ctx.roundRect(sx - rr * 0.12, topY - rr * 0.62, rr * 0.24, rr * 0.6, rr * 0.1);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    ctx.beginPath();
    ctx.ellipse(sx, topY - rr * 0.62, rr * 0.2, rr * 0.13, 0, 0, TAU);
    ctx.fill();
    if (!o.ghost) drawFace(ctx, sx, topY + zh * 0.55, zh * 0.7, q, mood, t, rr * 1.4);
    return;
  }
  const rad = k === BEAR ? hw * 0.62 : hw * 0.28;
  // 원근: 가장자리에 있을수록 윗면이 바깥으로 살짝 (안쪽 옆면이 보인다)
  const dx = (o.lean ?? 0) * zh * 1.25;
  const dark = mix(base, '#000000', 0.34);
  if (Math.abs(dx) > 0.6) {
    const ex = dx < 0 ? sx + hw - rad * 0.3 : sx - hw + rad * 0.3;
    ctx.fillStyle = mix(base, '#000000', 0.42);
    quad(ctx, [[ex, sy - hd + rad * 0.4], [ex, sy + hd - rad * 0.3], [ex + dx, sy + hd - zh], [ex + dx, sy - hd - zh + rad * 0.4]]);
    ctx.fill();
  }
  // 앞면 (아래가 둥근 평행사변형)
  const fg = ctx.createLinearGradient(0, topY + hd, 0, sy + hd);
  fg.addColorStop(0, mix(base, '#000000', 0.1));
  fg.addColorStop(1, dark);
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(sx - hw + dx, topY + hd - rad * 0.5);
  ctx.lineTo(sx + hw + dx, topY + hd - rad * 0.5);
  ctx.lineTo(sx + hw, sy + hd - rad * 0.6);
  ctx.quadraticCurveTo(sx + hw, sy + hd, sx + hw - rad * 0.6, sy + hd);
  ctx.lineTo(sx - hw + rad * 0.6, sy + hd);
  ctx.quadraticCurveTo(sx - hw, sy + hd, sx - hw, sy + hd - rad * 0.6);
  ctx.closePath();
  ctx.fill();
  // 앞면 나뭇결·솜털
  if (k === BLOCK) {
    ctx.strokeStyle = 'rgba(0,0,0,.08)';
    ctx.lineWidth = 1;
    for (let j = 1; j < 3; j++) {
      const yy = topY + hd + (zh * j) / 3;
      ctx.beginPath();
      ctx.moveTo(sx - hw * 0.9 + dx * (1 - j / 3), yy);
      ctx.lineTo(sx + hw * 0.9 + dx * (1 - j / 3), yy);
      ctx.stroke();
    }
  }
  // 윗면
  const tx = sx + dx;
  const tg = ctx.createLinearGradient(0, topY - hd, 0, topY + hd);
  tg.addColorStop(0, mix(base, '#ffffff', 0.34));
  tg.addColorStop(1, mix(base, '#ffffff', 0.06));
  ctx.fillStyle = tg;
  ctx.beginPath();
  ctx.roundRect(tx - hw, topY - hd, 2 * hw, 2 * hd, rad);
  ctx.fill();
  ctx.strokeStyle = mix(base, '#000000', 0.28);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  // 윗면 반짝
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath();
  ctx.roundRect(tx - hw * 0.78, topY - hd * 0.84, hw * 0.66, hd * 0.2, hd * 0.1);
  ctx.fill();
  if (k === BEAR) {
    // 귀 (뒤쪽 모서리) · 배 · 나비넥타이
    for (const sd of [-1, 1]) {
      ctx.fillStyle = mix(base, '#000000', 0.08);
      ctx.beginPath();
      ctx.arc(tx + sd * hw * 0.72, topY - hd * 0.82, hw * 0.34, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f4b9a2';
      ctx.beginPath();
      ctx.arc(tx + sd * hw * 0.72, topY - hd * 0.82, hw * 0.18, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#f3dcbc';
    ctx.beginPath();
    ctx.ellipse(tx, topY + hd * 0.08, hw * 0.6, hd * 0.64, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8484f';
    const bx = sx + dx * 0.9, by = topY + hd - rad * 0.15;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - hw * 0.3, by - hw * 0.14);
    ctx.lineTo(bx - hw * 0.3, by + hw * 0.14);
    ctx.closePath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + hw * 0.3, by - hw * 0.14);
    ctx.lineTo(bx + hw * 0.3, by + hw * 0.14);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx, by, hw * 0.07, 0, TAU);
    ctx.fill();
  }
  if (o.ghost) {
    ctx.strokeStyle = 'rgba(255,255,255,.95)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.roundRect(tx - hw, topY - hd, 2 * hw, 2 * hd + zh, rad);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  drawArrow(ctx, tx, topY + (k === BEAR ? hd * 0.08 : 0), q.dir, hw * (k === BEAR ? 0.5 : 0.72), hd * (k === BEAR ? 0.55 : 0.75));
  if (o.ghost) return;
  const fcx = sx + dx * 0.55, fcy = topY + hd + zh * (k === BEAR ? 0.42 : 0.45), fsz = Math.min(zh * 0.9, hw * 0.7);
  if (k === BEAR) {
    ctx.fillStyle = '#f3dcbc';
    ctx.beginPath();
    ctx.ellipse(fcx, fcy + fsz * 0.3, hw * 0.34, fsz * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2420';
    ctx.beginPath();
    ctx.ellipse(fcx, fcy + fsz * 0.12, hw * 0.1, fsz * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  drawFace(ctx, fcx, fcy, fsz, q, mood, t, hw * 2);
}

/** 화살: 흰 몸통 + 진한 테두리 (위 = 상자 뒤쪽) */
function drawArrow(ctx: CanvasRenderingContext2D, cx: number, cy: number, dir: number, rx: number, ry: number) {
  const ax = DX[dir], ay = DY[dir];
  const L = ax ? rx : ry, W = ax ? ry : rx;
  const P = (along: number, side: number) => [cx + ax * along * L + (ay ? side * W : 0), cy + ay * along * L + (ax ? side * W : 0)];
  const pts = [P(-0.9, -0.22), P(0.1, -0.22), P(0.1, -0.55), P(0.95, 0), P(0.1, 0.55), P(0.1, 0.22), P(-0.9, 0.22)];
  ctx.beginPath();
  pts.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(30,30,50,.75)';
  ctx.lineWidth = Math.max(2, L * 0.16);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineJoin = 'miter';
}

/** 얼굴: 기분에 따라 눈·입이 바뀐다 */
function drawFace(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number, q: { id: number; dir: number }, mood: string, t: number, span: number) {
  const ex = Math.min(span * 0.22, sz * 0.75), er = sz * 0.3, lx = DX[q.dir] * er * 0.35, ly = DY[q.dir] * er * 0.25;
  const blink = mood === '' && (t + q.id * 37) % 170 < 6;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const x = cx + sd * ex, y = cy - sz * 0.12;
    if (mood === 'dizzy') {
      ctx.strokeStyle = '#2a1a1a';
      ctx.lineWidth = Math.max(1.2, er * 0.32);
      ctx.beginPath();
      for (let a = 0; a < 9; a++) {
        const an = a * 0.9 + t * 0.2 * sd, rr = er * (a / 9);
        ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
      }
      ctx.stroke();
    } else if (mood === 'go' || mood === 'fly' || blink) {
      ctx.strokeStyle = '#2a1a1a';
      ctx.lineWidth = Math.max(1.2, er * 0.35);
      ctx.beginPath();
      if (blink) (ctx.moveTo(x - er * 0.7, y), ctx.lineTo(x + er * 0.7, y));
      else ctx.arc(x, y + er * 0.3, er * 0.7, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'stuck') {
      ctx.strokeStyle = '#2a1a1a';
      ctx.lineWidth = Math.max(1.2, er * 0.35);
      ctx.beginPath();
      ctx.moveTo(x - er * 0.6 * sd, y - er * 0.5);
      ctx.lineTo(x + er * 0.5 * sd, y);
      ctx.lineTo(x - er * 0.6 * sd, y + er * 0.5);
      ctx.stroke();
    } else {
      const big = mood === 'push' || mood === 'worry' ? 1.3 : mood === 'press' ? 1.15 : 1;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, y, er * big, er * big * 1.1, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#2a1a1a';
      ctx.beginPath();
      ctx.arc(x + lx * (mood === 'push' ? 0 : 1), y + ly, er * (mood === 'push' ? 0.4 : 0.58), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x + lx - er * 0.2, y + ly - er * 0.25, er * 0.2, 0, TAU);
      ctx.fill();
    }
  }
  // 입
  const my = cy + sz * 0.32;
  ctx.strokeStyle = '#2a1a1a';
  ctx.fillStyle = '#7a2626';
  ctx.lineWidth = Math.max(1.2, er * 0.3);
  ctx.beginPath();
  if (mood === 'push' || mood === 'worry') ctx.ellipse(cx, my, er * 0.4, er * 0.5, 0, 0, TAU), ctx.fill();
  else if (mood === 'go' || mood === 'fly' || mood === 'press') ctx.arc(cx, my - er * 0.2, er * 0.6, 0.1, Math.PI - 0.1), ctx.closePath(), ctx.fill();
  else if (mood === 'dizzy') {
    for (let a = 0; a <= 6; a++) ctx.lineTo(cx - er + (a / 6) * er * 2, my + Math.sin(a * 2 + t * 0.3) * er * 0.2);
    ctx.stroke();
  } else if (mood === 'stuck') (ctx.moveTo(cx - er * 0.5, my), ctx.lineTo(cx + er * 0.5, my), ctx.stroke());
  else (ctx.arc(cx, my - er * 0.3, er * 0.5, 0.3, Math.PI - 0.3), ctx.stroke());
  // 땀 · 어질어질 별
  if (mood === 'push' || mood === 'worry') {
    ctx.fillStyle = '#9fdcff';
    ctx.beginPath();
    const sxp = cx + ex + er * 1.5, syp = cy - sz * 0.4;
    ctx.moveTo(sxp, syp - er * 0.8);
    ctx.quadraticCurveTo(sxp + er * 0.6, syp, sxp, syp + er * 0.4);
    ctx.quadraticCurveTo(sxp - er * 0.6, syp, sxp, syp - er * 0.8);
    ctx.fill();
  }
  if (mood === 'dizzy') {
    for (let j = 0; j < 3; j++) {
      const a = t * 0.12 + (j / 3) * TAU, x = cx + Math.cos(a) * span * 0.35, y = cy - sz * 1.9 + Math.sin(a) * span * 0.1;
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const an = (p / 10) * TAU - Math.PI / 2, rr = p % 2 ? er * 0.35 : er * 0.8;
        ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr);
      }
      ctx.fill();
    }
  }
  ctx.lineCap = 'butt';
}

/** 바구니: 지금까지 뺀 장난감이 쌓인다 */
function drawBasket(ctx: CanvasRenderingContext2D, s: ToyState, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, t: number) {
  const bx = X(BASKET.x), by = Y(BASKET.y), bw = R(0.13), bh = R(0.06);
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ctx.beginPath();
  ctx.ellipse(bx, by + bh * 0.95, bw * 1.1, bh * 0.35, 0, 0, TAU);
  ctx.fill();
  // 안에 든 것 (뺀 수만큼, 최대 8)
  const n = Math.min(8, s.S.outs - s.fly.filter((f) => f.to === 0 || s.t < f.land).length);
  for (let k = 0; k < n; k++) {
    const x = bx + (hsh(k * 5.3) - 0.5) * bw * 1.4, y = by - bh * 0.15 - (k % 3) * R(0.008);
    ctx.fillStyle = COLS[k % 6];
    ctx.beginPath();
    ctx.roundRect(x - R(0.022), y - R(0.02), R(0.044), R(0.034), R(0.008));
    ctx.fill();
  }
  const g = ctx.createLinearGradient(0, by - bh * 0.3, 0, by + bh);
  g.addColorStop(0, '#e2b06c');
  g.addColorStop(1, '#a8743c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(bx - bw, by - bh * 0.25);
  ctx.lineTo(bx + bw, by - bh * 0.25);
  ctx.lineTo(bx + bw * 0.85, by + bh);
  ctx.lineTo(bx - bw * 0.85, by + bh);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,70,30,.6)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(bx - bw + k * 0.02 * bw, by - bh * 0.25 + (k * bh) / 3);
    ctx.lineTo(bx + bw - k * 0.02 * bw, by - bh * 0.25 + (k * bh) / 3);
    ctx.stroke();
  }
  ctx.fillStyle = '#f0c788';
  ctx.beginPath();
  ctx.ellipse(bx, by - bh * 0.25, bw, bh * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#b07a3c';
  ctx.lineWidth = 2;
  ctx.stroke();
  void t;
}

/** 강아지: 날아오는 장난감을 덥석 받아 문다 */
function drawDog(ctx: CanvasRenderingContext2D, s: ToyState, x: number, y: number, W: number, t: number) {
  const u = W * 0.06, dog = s.dog, mode = dog.mode;
  const jump = mode === 'catch' ? Math.sin(Math.min(1, 1 - (dog.until - t) / 30) * Math.PI) * u * 1.4 : mode === 'happy' ? Math.abs(Math.sin(t * 0.18)) * u * 0.8 : 0;
  const sad = mode === 'sad';
  // 다가오는 장난감 쪽을 본다
  const incoming = s.fly.find((f) => f.to === 1 && t < f.land);
  const look = incoming ? 1 : mode === 'idle' && s.S.ax ? 0.6 : 0;
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.9, u * 1.3 * (1 - jump / (u * 4)), u * 0.35, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  const fur = '#f2c98e', fur2 = '#d9a35c';
  // 꼬리
  const wag = Math.sin(t * (mode === 'happy' || mode === 'chew' ? 0.6 : 0.18)) * (sad ? 0.1 : 0.6);
  ctx.strokeStyle = fur2;
  ctx.lineWidth = u * 0.35;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.8, u * 0.2);
  ctx.quadraticCurveTo(-u * 1.5, -u * 0.2 + wag * u, -u * 1.3 + wag * u * 0.5, -u * 0.9 + (sad ? u * 1.2 : 0));
  ctx.stroke();
  ctx.lineCap = 'butt';
  // 몸
  ctx.fillStyle = fur;
  ctx.beginPath();
  if (sad) ctx.ellipse(0, u * 0.5, u * 1.25, u * 0.55, 0, 0, TAU);
  else ctx.ellipse(0, u * 0.1, u * 0.95, u * 0.85, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.ellipse(u * 0.25, u * 0.3, u * 0.45, u * 0.5, 0, 0, TAU);
  ctx.fill();
  // 앞발
  ctx.fillStyle = fur2;
  for (const sd of [-0.2, 0.55]) {
    ctx.beginPath();
    ctx.ellipse(u * sd, u * 0.88, u * 0.24, u * 0.16, 0, 0, TAU);
    ctx.fill();
  }
  // 머리
  const hx = u * (0.35 + look * 0.15), hy = sad ? u * 0.1 : -u * 0.95 - (incoming ? u * 0.15 : 0);
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.78, u * 0.68, 0, 0, TAU);
  ctx.fill();
  // 귀 (축 늘어진)
  ctx.fillStyle = '#9c6a3a';
  for (const sd of [-1, 1]) {
    ctx.save();
    ctx.translate(hx + sd * u * 0.62, hy - u * 0.25);
    ctx.rotate(sd * (sad ? 0.9 : 0.35 + Math.sin(t * 0.1) * 0.08 + (mode === 'catch' ? 0.6 : 0)));
    ctx.beginPath();
    ctx.ellipse(0, u * 0.35, u * 0.22, u * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 주둥이
  ctx.fillStyle = '#fff3dc';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.3, hy + u * 0.22, u * 0.42, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a2a22';
  ctx.beginPath();
  ctx.ellipse(hx + u * 0.55, hy + u * 0.08, u * 0.13, u * 0.1, 0, 0, TAU);
  ctx.fill();
  // 눈
  for (const sd of [-1, 1]) {
    const ex = hx + u * 0.05 + sd * u * 0.28, ey = hy - u * 0.18;
    if (mode === 'happy' || mode === 'chew') {
      ctx.strokeStyle = '#3a2a22';
      ctx.lineWidth = u * 0.1;
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.05, u * 0.12, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (sad) {
      ctx.strokeStyle = '#3a2a22';
      ctx.lineWidth = u * 0.1;
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.12, ey);
      ctx.lineTo(ex + u * 0.12, ey + u * 0.04);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#3a2a22';
      ctx.beginPath();
      ctx.arc(ex + look * u * 0.06, ey - look * u * 0.05, u * (mode === 'catch' ? 0.14 : 0.11), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + look * u * 0.06 - u * 0.04, ey - look * u * 0.05 - u * 0.04, u * 0.04, 0, TAU);
      ctx.fill();
    }
  }
  // 입: 받을 때 크게 벌림 · 물고 있음 · 혀
  if (mode === 'catch') {
    ctx.fillStyle = '#7a2626';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.38, hy + u * 0.42, u * 0.24, u * 0.2, 0, 0, TAU);
    ctx.fill();
  } else if (mode === 'chew') {
    const held = s.S.toys[dog.hold];
    if (held) {
      ctx.fillStyle = held.k === BEAR ? '#b47b4c' : COLS[held.col];
      ctx.beginPath();
      ctx.roundRect(hx + u * 0.15, hy + u * 0.3, u * 0.6, u * 0.42, u * 0.1);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  } else if (!sad) {
    ctx.fillStyle = '#ff7d8f';
    ctx.beginPath();
    ctx.ellipse(hx + u * 0.42, hy + u * 0.47 + Math.sin(t * 0.3) * u * 0.03, u * 0.11, u * 0.16, 0, 0, TAU);
    ctx.fill();
  }
  if (mode === 'happy' && t % 40 < 26) {
    ctx.fillStyle = '#ff6b8a';
    font2(ctx, u * 0.7, 900);
    ctx.textAlign = 'center';
    ctx.fillText('♥', hx + u * 0.9, hy - u * 0.9 - (t % 40) * 0.3);
  }
  ctx.restore();
}

/** 새것 스포트라이트: 판 시작 때 새 장치만 밝게 + NEW 딱지 */
function drawSpot(ctx: CanvasRenderingContext2D, s: ToyState, d: StageDef, Y: (y: number) => number, R: (r: number) => number, SX: (x: number, y: number) => number, SY: (y: number) => number, font: (sz: number, w?: number) => void, w: number) {
  if (!d.spot || s.again) return;
  const L = s.L, S = s.S;
  let fx = -1, fy = -1;
  const kind = d.key === 'bear' ? BEAR : d.key === 'marble' ? MARBLE : d.key === 'top' ? TOP : -1;
  if (kind >= 0) {
    const q = S.toys.find((o) => o.k === kind && !o.out);
    if (q) (fx = q.x), (fy = q.y);
  } else if (d.key === 'wall') {
    const q = S.toys.find((o) => !o.out && !fits(L, o.dir, o.dir % 2 === 0 ? o.x : o.y, HS[o.k]));
    if (q) (fx = q.x + DX[q.dir] * 0.1), (fy = q.y + DY[q.dir] * 0.1);
  } else if (d.key === 'rubber') {
    for (let side = 0; side < 4 && fx < 0; side++)
      for (const [a, b] of L.rub[side]) {
        const m = (a + b) / 2;
        (fx = side === 1 ? 0.95 : side === 3 ? 0.05 : m), (fy = side === 2 ? 0.95 : side === 0 ? 0.04 : m);
        break;
      }
  } else if (d.key === 'slime' && L.slime.length) (fx = (L.slime[0][0] + L.slime[0][2]) / 2), (fy = (L.slime[0][1] + L.slime[0][3]) / 2);
  if (fx < -0.5) return;
  const age = s.pt, a = Math.min(1, age / 12, (CARD_T + 30 - age) / 20);
  if (a <= 0) return;
  const cx = SX(fx, fy), cy = SY(fy) - Y(ZH) * 0.5, r = R(0.11 + Math.max(0, 0.08 - age * 0.004));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,12,40,.55)';
  ctx.beginPath();
  ctx.rect(0, Y(0.085), w, Y(1.3) - Y(0.085));
  ctx.arc(cx, cy, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -age;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.04, 900);
  const label = d.spot, tw = ctx.measureText(label).width + R(0.06), ly = cy + r + R(0.055), lx = Math.max(tw / 2 + 6, Math.min(w - tw / 2 - 6, cx));
  ctx.fillStyle = 'rgba(60,30,100,.96)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.032), tw, R(0.064), R(0.032));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1);
  font(0.036, 900);
  const nb = 'NEW!', nw = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.062), nw, R(0.044), R(0.022));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw / 2, ly - R(0.039));
  ctx.restore();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU - Math.PI / 2, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function drawHud(ctx: CanvasRenderingContext2D, s: ToyState, d: StageDef, w: number, h: number, X: (x: number) => number, Y: (y: number) => number, R: (r: number) => number, font: (sz: number, w?: number) => void, th: Theme, pv: Preview | null, cardUp: boolean) {
  const L = s.L, S = s.S, fx = juice(s);
  // ── 위 띠 ──
  const hb = R(0.085);
  ctx.fillStyle = 'rgba(30,20,56,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.046, 900);
  const ttl = `${d.emoji} ${s.stage + 1}번째 상자`, tw = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.044, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);

  // ── 미리 보기 말풍선 (상자 위) ──
  if (pv) {
    const n = pv.exits.length, bonk = pv.rec.some((e) => e.k === 'bonk'), boing = pv.rec.some((e) => e.k === 'boing'), spin = pv.rec.some((e) => e.k === 'spin');
    let tx = n >= 2 ? `떼면 슝! → 한 번에 ${n}개 쏙` : n === 1 ? '떼면 슝! → 1개 쏙' : bonk ? '쿵! 아무것도 안 빠져요' : '밀기만 해요 — 고스트 자리에 서요';
    if (n === 0 && boing) tx = '통! 튕겨 돌아와요';
    if (spin) tx += ' · 팽이 빙글';
    font(0.042, 900);
    const tw2 = Math.min(w - R(0.04), ctx.measureText(tx).width + R(0.06)), by = Y(0.25);
    ctx.fillStyle = n >= 2 ? 'rgba(40,150,80,.95)' : n === 1 ? 'rgba(40,110,150,.95)' : 'rgba(150,60,50,.95)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by - R(0.034), tw2, R(0.068), R(0.034));
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(tx, w / 2, by + 1, w - R(0.08));
  }

  // ── 배우기 한 줄 (처음 한 번) ──
  if (!pv && !cardUp && s.news && s.t - s.news.t < NEWS_T && s.phase !== 'result') {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.04, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - R(0.04), ctx.measureText(tx).width + R(0.06)), by = Y(0.25) + drop;
    ctx.fillStyle = 'rgba(30,20,56,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by - R(0.032), tw2, R(0.064), R(0.032));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by + 1, w - R(0.08));
    ctx.globalAlpha = 1;
  }
  // ── 판 카드: 시작(별 셋을 말로) · 끝 ──
  {
    let a = 1;
    const lines: { text: string; col: string; mark?: string }[] = [];
    let head = '', col = '#ffffff';
    if (s.phase === 'result') {
      if (s.ok) {
        head = s.won ? '장난감 상자 다 비웠다!' : '상자 비움!';
        col = '#ffe066';
        lines.push({ text: `모두 뺐어요 (${S.taps}번 톡)`, col: '#fff6dc', mark: '✓' });
        if (L.nstars >= 2) lines.push(s.starOk[1] ? { text: `${S.taps}번 만에 끝! (${L.par}번 안에)`, col: '#fff6dc', mark: '✓' } : { text: `${L.par}번 안에 끝내기 — ${S.taps}번 걸렸어요`, col: 'rgba(255,255,255,.55)', mark: '✗' });
        if (L.nstars >= 3) lines.push(s.starOk[2] ? { text: `한 번에 ${NUM[S.best]}! 와르르`, col: '#fff6dc', mark: '✓' } : { text: `한 번에 ${NUM[L.C]} — 이번엔 최고 ${NUM[Math.max(1, S.best)]}`, col: 'rgba(255,255,255,.55)', mark: '✗' });
      } else {
        head = s.why;
        col = '#ffb3a8';
        lines.push({ text: s.hearts > 0 ? '하트 -1 · 같은 상자 다시!' : '끝 — 강아지가 고마워해요!', col: '#fff0ea' });
        lines.push({ text: '누르고 있으면 어디까지 밀릴지 보여요', col: 'rgba(255,255,255,.7)' });
      }
    } else if (cardUp) {
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}번째 상자 · ${d.name}`;
      for (let k = 0; k < L.nstars; k++) lines.push({ text: starText(L, k), col: '#fff6dc', mark: '★' });
      if (L.nstars === 1) lines.push({ text: '별은 다음 상자부터 하나씩 늘어요', col: 'rgba(255,255,255,.65)' });
    }
    if (head && a > 0) {
      const res = s.phase === 'result', age = res ? s.pt : s.pt, sc = Math.min(1, 0.6 + age / 12);
      const ch = R(0.07) + lines.length * R(0.044), cy = res ? Y(0.62) : Y(0.09) + R(0.008) + ch / 2;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(30,20,56,.94)';
      ctx.beginPath();
      ctx.roundRect(-R(0.45), -ch / 2, R(0.9), ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.05, 900);
      const hy = -ch / 2 + R(0.038);
      if (res && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.055), n = L.nstars, x0 = -(hw + R(0.02) + sw * n) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, hy, R(0.86));
        for (let k = 0; k < n; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, hy);
          ctx.scale(pop, pop);
          starPath(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cy + hy, '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, hy, R(0.86));
      lines.forEach((ln, k) => {
        const ly = hy + R(0.048) + k * R(0.044);
        font(0.039, 800);
        if (ln.mark) {
          const tw3 = ctx.measureText(ln.text).width, mx = -tw3 / 2 - R(0.03);
          ctx.fillStyle = ln.mark === '✗' ? 'rgba(255,255,255,.4)' : '#ffd84a';
          font(0.042, 900);
          ctx.fillText(ln.mark, mx, ly);
          font(0.039, 800);
        }
        ctx.fillStyle = ln.col;
        ctx.fillText(ln.text, ln.mark ? R(0.012) : 0, ly, R(0.8));
      });
      ctx.restore();
    }
  }

  // ── 아래 띠 ──
  const ty = 1.3;
  const g = ctx.createLinearGradient(0, Y(ty), 0, h);
  g.addColorStop(0, 'rgba(36,26,66,.95)');
  g.addColorStop(1, 'rgba(22,15,44,.98)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(0, Y(ty), w, h - Y(ty) + 4, [R(0.03), R(0.03), 0, 0]);
  ctx.fill();
  // 톡 남은 수: 동그라미 (★ 선까지 쓰면 별)
  const r1 = Y(ty + 0.042);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#efe6ff';
  font(0.04, 900);
  ctx.fillText('톡', X(0.03), r1);
  const n = L.limit, step = Math.min(R(0.06), (X(0.7) - X(0.11)) / Math.max(1, n)), x0 = X(0.12);
  const parOn = L.nstars >= 2;
  for (let k = 0; k < n; k++) {
    const cx = x0 + k * step + (parOn && k >= L.par ? R(0.016) : 0), used = k < S.taps, inPar = !parOn || k < L.par;
    ctx.beginPath();
    ctx.arc(cx, r1, R(0.017), 0, TAU);
    if (used) {
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillStyle = inPar ? '#ffd27a' : '#a99bd0';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.arc(cx - R(0.005), r1 - R(0.006), R(0.006), 0, TAU);
      ctx.fill();
    }
  }
  if (parOn) {
    const lx = x0 + L.par * step - step / 2 + R(0.008);
    ctx.strokeStyle = '#ffd84a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - R(0.024));
    ctx.lineTo(lx, r1 + R(0.024));
    ctx.stroke();
    ctx.fillStyle = '#ffd84a';
    font(0.032, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - R(0.036));
  }
  ctx.textAlign = 'right';
  font(0.038, 800);
  const left = L.limit - S.taps;
  ctx.fillStyle = left > 1 ? '#e6dcff' : '#ffb3a8';
  ctx.fillText(`${left}번 남음`, X(0.97), r1);
  // 별 목표 칩 (쉬운 말)
  const outN = S.toys.filter((q) => q.out).length, nall = S.toys.length;
  const okk = s.phase === 'result' && s.ok ? s.starOk : [outN === nall, parOn && S.taps <= L.par && outN === nall, L.nstars >= 3 && S.best >= L.C];
  const bad = [s.phase === 'result' && !s.ok, parOn && S.taps >= L.par && outN < nall, false];
  const labels = [`모두 빼기 ${outN}/${nall}`, `${L.par}번 안에`, `한 번에 ${NUM[L.C]}`];
  const r2 = Y(ty + 0.112), cw = (w - R(0.06) - R(0.02) * 2) / 3;
  for (let k = 0; k < 3; k++) {
    const cx1 = R(0.03) + k * (cw + R(0.02)), on = k < L.nstars;
    ctx.fillStyle = !on ? 'rgba(255,255,255,.04)' : okk[k] ? 'rgba(255,216,74,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
    ctx.beginPath();
    ctx.roundRect(cx1, r2 - R(0.028), cw, R(0.056), R(0.028));
    ctx.fill();
    ctx.strokeStyle = !on ? 'rgba(255,255,255,.1)' : okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    if (!on) {
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      font(0.034, 800);
      ctx.fillText('다음 상자부터', cx1 + cw / 2, r2 + 1, cw - R(0.02));
      continue;
    }
    ctx.fillStyle = okk[k] ? '#ffd84a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
    font(0.04, 900);
    ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.028), r2 + 1);
    ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#efe6ff';
    font(0.036, 800);
    ctx.textAlign = 'left';
    ctx.fillText(labels[k], cx1 + R(0.052), r2 + 1, cw - R(0.06));
  }
  // 안내 한 줄
  let hint = '👆 장난감을 톡! 누르고 있으면 밀려날 자리가 보여요';
  const first = s.stage === 0 && !s.firstTap && s.phase === 'play';
  if (first) hint = '👆 반짝이는 장난감을 톡! 앞의 것까지 같이 슝';
  else if (s.phase === 'play' && S.ax) hint = '슝— 멈출 때까지 기다려요';
  else if (s.down && s.phase === 'play') hint = s.press >= 0 ? '떼면 슝! 다른 데서 떼면 취소' : '장난감 위에서 눌러요';
  else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 상자 끝! 강아지가 신났어요' : `★ ${s.got}개! 다음 상자엔 새것이 나와요`) : '뒤에서 밀면 앞의 것까지 같이 빠져요';
  else if (d.key === 'bear') hint = '🧸 곰을 톡 하면 앞의 것을 와르르 밀어내요';
  else if (d.key === 'marble') hint = '🔮 구슬은 살짝만 밀려도 멀리 굴러가요';
  else if (d.key === 'top') hint = '🌀 팽이를 밀면 화살이 돌아 문을 볼 수 있어요';
  else if (d.key === 'rubber') hint = '🩷 통통 벽 쪽으로 보내면 반대편 문으로 가요';
  else if (d.key === 'slime') hint = '🟢 끈끈이로 밀어 넣으면 거기 딱 서요';
  else if (d.key === 'wall') hint = '🧱 벽을 보는 장난감은 옆에서 밀어 문 앞에 세워요';
  ctx.textAlign = 'center';
  ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
  font(first ? 0.042 : 0.038, 900);
  ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.05));
}
