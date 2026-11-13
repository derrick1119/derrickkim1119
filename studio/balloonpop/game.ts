/**
 * 풍선 팡 연쇄 (23라운드 — 완전히 다른 장르) — 연쇄 폭발 × 가리키기(톡).
 * 기준 9(손이 하는 일은 하나): 풍선을 톡 = 그 풍선이 팡. 한 판에 톡은 세 번뿐.
 * 와우: 터진 풍선은 둘레 원(반경) 안의 풍선을 터뜨린다 — 하나를 톡 하면 하늘 전체가 박자에 맞춰 팡팡팡 이어진다.
 * 규칙(결정적): 크기·색마다 반경이 다르다(빨강 작게 · 노랑 보통 · 파랑 크게). 반경 원을 늘 흐리게 보여 준다.
 *   연쇄는 한 박자(BEAT틱)씩 퍼진다(누가 누구를 터뜨리는지 불꽃 줄이 따라간다). 풍선은 판에 따라 둥실둥실 흔들리거나
 *   바람에 흘러서, 무리끼리 가까워지는 '때'에 누르는 것도 수가 된다.
 * 판: 목표(풍선 N개 팡 / 동물 구하기) · 별 = ★목표 ★톡 두 번 안에 목표 ★모두 팡. 못 채우면 같은 하늘을 1초 안에 다시(하트 없음, C002).
 *   같은 판 두 번 실패하면 도움 반짝(봇이 고른 첫 톡 풍선이 빛남) — 그 시도는 ★2(두 번 안에)를 받을 수 없다. 8판을 깨면 끝.
 * 펼쳐짐(하는 일이 바뀐다):
 *   1판 기본 풍선(크기마다 반경)·우산 고양이 → 2판 철 풍선(안 터지고 연쇄를 막는다 → 막힌 무리를 따로 톡)
 *   → 3판 트램펄린(우산 없는 동물 — 흔들리다 트램펄린 위에 왔을 때 터뜨려야 산다 → '언제')
 *   → 4판 물풍선(아주 넓게, 하지만 아래로만 → 위에서부터) → 5판 바람(높은 풍선일수록 빨리 흘러 날아간다 → 무리가 겹칠 때, 날아가기 전에)
 *   → 6판 폭죽 풍선(그 줄을 끝까지 쭉) → 7판 구름(속에 풍선이 숨어 있다 — 터뜨려 걷어 낸다) → 8판 무지개 대왕 풍선(아주 멀리).
 * 판 배치는 시드로 만들고, '잘 고르면 목표·별이 나오고 아무렇게나 누르면 덜 나오는' 배치를 내다보기로 골라 둔다(같은 판은 다시 해도 같다).
 * 웃음: '팡!' 글자와 고무 조각, 터지기 직전 풍선이 '헉' 하는 얼굴, 철 풍선은 '흥' 하는 얼굴.
 *   동물은 우산을 펴고 둥실, 맨몸이면 으아아 — 트램펄린에서 퐁퐁(실패면 엉덩방아 뒤 뒤집혀 버둥).
 *   피에로 구경꾼이 저글링하다 큰 연쇄에 깜짝(공이 머리에 떨어짐), 큰 연쇄엔 무지개와 꽃가루.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';

export const A = 1.45;
/** 연쇄 한 박자(틱) */
export const BEAT = 9;
/** 폭죽: 이만큼 떨어질 때마다 한 박자 더 */
const FIRE_STEP = 0.24;
const INTRO = 50, RESULT = 175, WAIT_END = 40, NEWS_T = 190;
/** 실패 결과 화면 → 같은 하늘 다시까지(틱). 오너 기준 7 · GDD §2.5 "1초 안에" */
export const FAIL_RESULT = 60;
/** 이 횟수만큼 실패하면 도움 반짝 */
export const HELP_AFTER = 2;
/** 다시 하기 토스트 길이(틱) — 처음 소개보다 짧게 */
export const RETRY_CARD = 40;
/** 다시 토스트의 첫 12틱 톡은 받지 않는다 — 결과를 닫으려던 손짓이 톡을 써 버리지 않게. 토스트는 위 하늘이라 풍선을 안 가린다 (C008, FUN v1.5 ⑤) */
export const TAP_BLOCK = 12;
/** 땅(동물이 내려앉는 곳) · 풍선 중심 → 매달린 동물 · 떨어지는 속도(우산/맨몸) */
export const GY = 1.2;
const HANG = 0.088, FALL_UM = 0.0045, FALL_NO = 0.0085;
const SWAY_W = (2 * Math.PI) / 260;
const ESC_R = 1.1;
const STAR_PTS = 100, POP_PTS = 2, WIN_PTS = 200;
/** 크기별 그림 반지름 · 터지는 반경 (작게·보통·크게) */
export const BR = [0.036, 0.046, 0.058];
export const REACH = [0.15, 0.2, 0.26];
const WATER_REACH = 0.36, KING_REACH = 0.46, KING_BR = 0.072, FIRE_BAND = 0.055, IRON_BLOCK = 0.05;
export const NORM = 0, IRON = 1, WATER = 2, FIRE = 3, KING = 4;


export interface Bal { k: number; sz: number; x0: number; y0: number; ax: number; ph: number; vx: number; an: number; um: boolean; esc: number; cl: number; hue: number; bridge?: boolean; bt?: [number, number] }
interface Cloud { x: number; y: number; rx: number; ry: number; vx: number }
export interface Goal { pop: number; save: number }
export interface Lay { bs: Bal[]; iron: number[]; tramp: { x: number; w: number } | null; clouds: Cloud[]; Ds: number[]; goal: Goal; total: number }

interface SDef {
  cl: number[]; lanes?: boolean; dense?: boolean; iron?: number; water?: number; fire?: number; king?: number; ani?: number; cat?: number;
  sway?: number; wind?: number; clouds?: number; tw?: number; goal: Goal; rand: [number, number]; key: string; title: string; tip: string; news: string;
  /** 쉼 판: 긴장을 푸는 판 — 숙련 격차 계산에서 빼고, 아무렇게나 눌러도 별이 잘 나오게 둔다(FUN v1.4) */
  rest?: boolean;
  /** 다른 무리끼리 거리 ≥ apart×(두 반경 합) — 무리 사이 원이 엉키지 않게 (CONTENT v0.1) */
  apart?: number;
  /** 무리 풍선 크기(작게·보통·크게) 가중치 — 크게가 0이면 무리 뿌리도 보통: 큰 풍선이 없는 판 (CONTENT v0.3, 1판) */
  szw?: number[];
  /** 다리 풍선 수: 무리 0·1 사이에 큰 풍선 하나 — 한 톡에 두 무리 (CONTENT v0.1) */
  bridge?: number;
  /** 대왕 자리: 'root' = 모든 무리의 뿌리(첫 풍선)가 대왕 원 안 → 대왕 한 톡에 하늘 전체 (CONTENT v0.1) */
  kingAt?: 'root';
  /** 흔들 무리(동물과 무관): 있으면 이 무리들만 sway 폭으로 흔든다. 둘이면 판 시작에 서로 가장 먼 쪽 끝 (CONTENT v0.2, 4판) */
  swayCl?: number[];
}
/** 판 8개. cl = 무리 크기들, rand = 아무렇게나 눌러 목표를 채우는 비율로 고를 범위 */
export const STAGES: SDef[] = [
  // CONTENT.md v0.1 (C005)·v0.3 (C008, 1·2판): 월드 1 "한낮 소풍"의 앞 8판 — 새것은 판당 하나, 움직이는 판(트램펄린·물·바람·폭죽·구름)은 M2부터
  { cl: [12, 3, 3], szw: [0.2, 0.8, 0], goal: { pop: 8, save: 0 }, rand: [0.95, 1], key: 'pop', title: '첫 팡!', tip: '풍선을 톡! 원 안의 풍선까지 팡팡', news: '🎈 톡! 터진 풍선은 둘레 원 안의 풍선을 터뜨려요' },
  { cl: [6, 4, 3], apart: 0.8, szw: [0.45, 0.45, 0.1], goal: { pop: 8, save: 0 }, rand: [0.87, 0.97], key: 'size2', title: '큰 풍선, 큰 원', tip: '큰 풍선일수록 원이 커요 — 큰 것부터!', news: '🔵 큰 풍선은 원이 커서 멀리까지 팡' },
  { cl: [6, 4, 3], apart: 0.8, cat: 1, goal: { pop: 8, save: 1 }, rand: [0.85, 0.95], key: 'cat', title: '우산 고양이', tip: '고양이 풍선이 터지면 우산을 펴고 내려와요', news: '☂️ 우산 고양이 — 풍선이 터지면 둥실둥실 내려와요' },
  { cl: [5, 4, 3, 2], apart: 0.8, sway: 0.1, swayCl: [0, 1], goal: { pop: 10, save: 0 }, rand: [0.65, 0.85], key: 'sway', title: '흔들 무리', tip: '두 무리가 가까워질 때 톡 하면 한 번에 팡!', news: '↔️ 흔들 무리 — 기다렸다 가까워질 때 톡, 두 무리가 한 번에' },
  { cl: [4, 4, 4, 3], bridge: 1, apart: 0.8, szw: [0.5, 0.4, 0.1], goal: { pop: 11, save: 0 }, rand: [0.55, 0.75], key: 'bridge', title: '다리 풍선', tip: '두 무리 사이 큰 풍선이 다리예요', news: '🌉 다리 풍선 — 두 무리를 한 번에 이어요' },
  { cl: [7, 4, 3], apart: 0.8, iron: 1, goal: { pop: 9, save: 0 }, rand: [0.55, 0.8], key: 'iron', title: '철 풍선', tip: '철 풍선은 안 터지고 연쇄를 막아요', news: '🔩 철 풍선 — 안 터지고, 그 뒤로 연쇄가 못 가요' },
  { cl: [8, 4, 3], apart: 0.8, iron: 2, goal: { pop: 9, save: 0 }, rand: [0.45, 0.7], key: 'iron2', title: '철 사이 틈', tip: '철 두 개 사이 틈으로 연쇄를 보내요', news: '🔩🔩 철 사이 틈 — 연쇄가 빠져나갈 길을 찾아요' },
  { cl: [10, 3, 2], dense: true, king: 1, kingAt: 'root', rest: true, goal: { pop: 11, save: 0 }, rand: [0.85, 1], key: 'king', title: '대왕 풍선', tip: '무지개 대왕 풍선은 아주 멀리까지!', news: '🌈 무지개 대왕 풍선 — 아주 멀리까지 팡!' },
];
export const STAGE_COUNT = STAGES.length;

// ───────────────────────────── 위치 · 연쇄 (결정적, 봇이 내다볼 때도 같은 함수) ─────────────────────────────
const bob = (st: number) => 0.007 * Math.sin(st * 0.045);
export const bxAt = (b: Bal, st: number) => b.x0 + (b.ax ? b.ax * Math.sin(st * SWAY_W + b.ph) : 0) + b.vx * st;
export const byAt = (b: Bal, st: number) => b.y0 + bob(st);
const SX = new Float64Array(64), SY = new Float64Array(64);
function posAll(L: Lay, st: number) {
  for (let i = 0; i < L.bs.length; i++) (SX[i] = bxAt(L.bs[i], st)), (SY[i] = byAt(L.bs[i], st));
}
const reachOf = (b: Bal) => (b.k === WATER ? WATER_REACH : b.k === KING ? KING_REACH : b.k === FIRE || b.k === IRON ? 0 : REACH[b.sz]);
const brOf = (b: Bal) => (b.k === KING ? KING_BR : BR[b.sz]);

/** i가 터지면 j가 몇 틱 뒤에 터지나 (0 = 안 터짐). 위치는 SX/SY(지금 시각) */
function delay(L: Lay, i: number, j: number): number {
  const a = L.bs[i], b = L.bs[j];
  if (b.k === IRON || a.k === IRON) return 0;
  const dx = SX[j] - SX[i], dy = SY[j] - SY[i];
  let d: number;
  if (a.k === FIRE) {
    if (Math.abs(dy) > FIRE_BAND) return 0;
    d = BEAT * (1 + Math.floor(Math.abs(dx) / FIRE_STEP));
  } else {
    const R = reachOf(a);
    if (a.k === WATER && dy < -0.015) return 0;
    if (dx * dx + dy * dy > R * R) return 0;
    d = BEAT;
  }
  // 철 풍선이 가운데를 가로막으면 못 간다
  for (const k of L.iron) {
    const ex = SX[k] - SX[i], ey = SY[k] - SY[i], l2 = dx * dx + dy * dy || 1e-9, u = (ex * dx + ey * dy) / l2;
    if (u <= 0 || u >= 1) continue;
    const qx = ex - u * dx, qy = ey - u * dy;
    if (qx * qx + qy * qy < IRON_BLOCK * IRON_BLOCK) return 0;
  }
  return d;
}

/** 지금 이 자리에서 동물이 떨어지면 사나 (우산은 늘 산다, 맨몸은 트램펄린 위여야) */
function savedAt(L: Lay, j: number) {
  const b = L.bs[j];
  if (b.an < 0) return false;
  if (b.um) return true;
  return !!L.tramp && Math.abs(SX[j] - L.tramp.x) <= L.tramp.w / 2;
}

interface Acc { pop: number; pop2: number; save: number; save2: number }
const PT = new Int32Array(64);
/** 톡 한 번의 연쇄를 끝까지 (alive를 고친다). 반환 = 마지막으로 터진 시각 */
function chainSim(L: Lay, alive: Uint8Array, src: number, T: number, tapNo: number, c: Acc): number {
  const n = L.bs.length;
  PT.fill(-1, 0, n);
  PT[src] = T;
  let end = T;
  for (;;) {
    let tau = Infinity;
    for (let j = 0; j < n; j++) if (alive[j] === 1 && PT[j] >= 0 && PT[j] < tau) tau = PT[j];
    if (tau === Infinity) break;
    posAll(L, tau);
    for (let j = 0; j < n; j++) {
      if (alive[j] !== 1 || PT[j] !== tau) continue;
      PT[j] = -1;
      if (tau >= L.bs[j].esc) {
        alive[j] = 2;
        continue;
      }
      alive[j] = 0;
      end = tau;
      c.pop++;
      if (tapNo <= 2) c.pop2++;
      if (savedAt(L, j)) (c.save++, tapNo <= 2 && c.save2++);
      for (let k = 0; k < n; k++) {
        if (alive[k] !== 1 || tau >= L.bs[k].esc) continue;
        const d = delay(L, j, k);
        if (d && (PT[k] < 0 || tau + d < PT[k])) PT[k] = tau + d;
      }
    }
  }
  return end;
}

/** 판이 끝났을 때의 값: 목표 · 두 번 안에 · 모두 팡 (같은 값끼리는 많이 터뜨린 쪽) */
let popsOnly = false;
function final(L: Lay, c: Acc, alive: Uint8Array) {
  if (popsOnly) return c.pop;
  const G = L.goal, met = c.pop >= G.pop && c.save >= G.save, m2 = c.pop2 >= G.pop && c.save2 >= G.save;
  let all = 1;
  for (let i = 0; i < L.bs.length; i++) if (L.bs[i].k !== IRON && alive[i] !== 0) (all = 0), (i = 999);
  return (met ? 10000 + (m2 ? 2000 : 0) + all * 4000 : 0) + c.pop * 10 + c.save * 80;
}

interface Cand { i: number; d: number; a2: Uint8Array; c2: Acc; end: number; v: number }
/** 남은 톡 k번을 내다보기: 지금(또는 조금 기다렸다) 어느 풍선을 톡 할지. beam[k] = 그 깊이에서 더 내다볼 후보 수 */
function search(L: Lay, alive: Uint8Array, T: number, k: number, used: number, c: Acc, beam: number[], Ds: number[], only = -1): { v: number; i: number; d: number } {
  const n = L.bs.length, out: Cand[] = [], seen = new Set<string>();
  for (const d of Ds)
    for (let i = 0; i < n; i++) {
      const b = L.bs[i];
      if (alive[i] !== 1 || b.k === IRON || T + d >= b.esc || (only >= 0 && i !== only)) continue;
      const a2 = alive.slice(), c2 = { ...c };
      const end = chainSim(L, a2, i, T + d, used + 1, c2);
      const key = d + ':' + a2.join('') + ':' + c2.save;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ i, d, a2, c2, end, v: final(L, c2, a2) });
    }
  if (!out.length) return { v: final(L, c, alive), i: -1, d: 0 };
  out.sort((a, b) => b.v - a.v || a.d - b.d);
  if (k <= 1 || !beam[k]) return { v: out[0].v, i: out[0].i, d: out[0].d };
  let best = { v: -Infinity, i: -1, d: 0 };
  for (const o of out.slice(0, beam[k])) {
    const v = Math.max(o.v, search(L, o.a2, o.end + 2, k - 1, used + 1, o.c2, beam, Ds).v);
    if (v > best.v) best = { v, i: o.i, d: o.d };
  }
  return best;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
const pickSz = (r: Rng, w: number[]) => {
  const x = r() * (w[0] + w[1] + w[2]);
  return x < w[0] ? 0 : x < w[0] + w[1] ? 1 : 2;
};

export function gen(d: SDef, r: Rng): Lay | null {
  const bs: Bal[] = [], nC = d.cl.length, sway = d.sway ?? 0, nAni = d.ani ?? 0;
  /** 흔들 무리: swayCl이 있으면 그 무리만, 없으면 동물이 매달린 무리(1번부터) */
  const swayCl = (c: number) => sway > 0 && (d.swayCl ? d.swayCl.includes(c) : c >= 1 && c <= nAni);
  const cs: { x: number; y: number }[] = [];
  for (let c = 0; c < nC; c++) {
    let ok = false;
    for (let k = 0; k < 120 && !ok; k++) {
      const x = d.lanes ? 0.14 + r() * 0.5 : nAni && swayCl(c) ? 0.32 + r() * 0.36 : 0.18 + r() * 0.64;
      const y = d.lanes ? 0.27 + (c / Math.max(1, nC - 1)) * 0.53 : nAni && swayCl(c) ? 0.42 + r() * 0.34 : 0.3 + r() * 0.46;
      const need = (a: number) => (0.24 + 0.013 * (d.cl[a] + d.cl[c])) * (1 - k / 240);
      if (d.lanes || cs.every((q, a) => Math.hypot(q.x - x, q.y - y) > need(a))) (ok = true), cs.push({ x, y });
    }
    if (!ok) return null;
  }
  const ph = cs.map(() => r() * Math.PI * 2);
  // 흔들 무리 둘은 판 시작에 서로 가장 먼 쪽 끝 → 약 2초(130틱) 뒤 가장 가까워진다 (CONTENT v0.2)
  if (d.swayCl?.length === 2) { const [a, b] = d.swayCl, sg = cs[a].x < cs[b].x ? -1 : 1; (ph[a] = (sg * Math.PI) / 2), (ph[b] = (-sg * Math.PI) / 2); }
  const vxs = cs.map((q) => (d.wind ? d.wind * (0.5 + Math.max(0, 0.78 - q.y) / 0.5) : 0));
  const axs = cs.map((_, c) => (swayCl(c) ? sway : 0));
  const sepOK = (b: Bal, x: number, y: number, sz: number, c: number) => {
    const dx = Math.abs(b.x0 - x), dy = Math.abs(b.y0 - y), dist = Math.hypot(dx, dy), brs = BR[b.sz] + BR[sz];
    if (b.cl === c) return dist >= brs + 0.012;
    // 다른 무리: 처음엔 서로 닿지 않고, 흔들리거나 흘러가며 겹쳐 보이지 않게
    if (dist < Math.max(REACH[b.sz], REACH[sz]) + 0.02) return false;
    // 다른 무리끼리 원이 엉키지 않게 (다리로 잇는 무리 0·1 사이는 빼고)
    const linked = d.bridge && b.cl + c === 1;
    if (d.apart && !linked && dist < d.apart * (REACH[b.sz] + REACH[sz])) return false;
    if (d.lanes) return dy >= brs + 0.012;
    const sw = b.ax + axs[c];
    return !sw || dy >= brs + 0.012 || dx >= brs + sw + 0.012;
  };
  const add = (c: number) => {
    const mem = bs.filter((b) => b.cl === c);
    for (let k = 0; k < 70; k++) {
      let sz: number, x: number, y: number;
      if (!mem.length) (sz = d.szw?.[2] === 0 ? 1 : 2), (x = cs[c].x + (k ? (r() - 0.5) * 0.24 : 0)), (y = cs[c].y + (k ? (r() - 0.5) * (d.lanes ? 0.04 : 0.16) : 0));
      else {
        sz = pickSz(r, c === 0 && d.dense ? [0.05, 0.5, 0.45] : d.szw ?? [0.36, 0.4, 0.24]);
        const p = mem[Math.floor(r() * mem.length)], lo = BR[p.sz] + BR[sz] + 0.014, hi = REACH[p.sz] * 0.92;
        const dd = lo + r() * Math.max(0, hi - lo), a = r() * Math.PI * 2;
        x = p.x0 + Math.cos(a) * dd;
        y = p.y0 + Math.sin(a) * dd * (d.lanes ? 0.35 : 1);
      }
      if (x < 0.07 + axs[c] || x > 0.93 - axs[c] || y < 0.2 || y > 0.86) continue; // 흔들려도 몸이 화면 안
      if (!bs.every((b) => sepOK(b, x, y, sz, c))) continue;
      bs.push({ k: NORM, sz, x0: x, y0: y, ax: axs[c], ph: ph[c], vx: vxs[c], an: -1, um: false, esc: Infinity, cl: c, hue: Math.floor(r() * 3) });
      return true;
    }
    return false;
  };
  const mx = Math.max(...d.cl);
  for (let k = 0; k < mx; k++) for (let c = 0; c < nC; c++) if (k < d.cl[c]) add(c);
  const want = d.cl.reduce((a, b) => a + b, 0);
  if (bs.length < want * 0.85) return null;
  // 다리 풍선: 무리 0·1에서 '그 풍선에서 자기 무리 전체로 연쇄가 가는' 풍선끼리 가장 가까운 쌍을 잇는 큰 풍선 (CONTENT v0.1)
  for (let q = 0; q < (d.bridge ?? 0); q++) {
    const full = (a: Bal) => {
      const mem = bs.filter((o) => o.cl === a.cl), seen = new Set([a]), stk = [a];
      while (stk.length) {
        const p = stk.pop()!;
        for (const o of mem) if (!seen.has(o) && Math.hypot(p.x0 - o.x0, p.y0 - o.y0) <= REACH[p.sz]) seen.add(o), stk.push(o);
      }
      return seen.size === mem.length;
    };
    const prs: [Bal, Bal, number][] = [];
    for (const a of bs) if (a.cl === 0 && full(a)) for (const b of bs) if (b.cl === 1 && full(b)) prs.push([a, b, Math.hypot(a.x0 - b.x0, a.y0 - b.y0)]);
    prs.sort((u, v) => u[2] - v[2]);
    let ok = false;
    for (const [a, b] of prs.slice(0, 4))
      for (let k = 0; k < 30 && !ok; k++) {
        const f = 0.35 + r() * 0.3, x = a.x0 + (b.x0 - a.x0) * f, y = a.y0 + (b.y0 - a.y0) * f;
        if (Math.hypot(a.x0 - x, a.y0 - y) > Math.min(REACH[a.sz], REACH[2]) * 0.95 || Math.hypot(b.x0 - x, b.y0 - y) > Math.min(REACH[b.sz], REACH[2]) * 0.95) continue;
        if (!bs.every((o) => Math.hypot(o.x0 - x, o.y0 - y) >= BR[o.sz] + BR[2] + 0.012)) continue;
        if (!bs.every((o) => o.cl <= 1 || Math.hypot(o.x0 - x, o.y0 - y) >= REACH[2] + 0.02)) continue;
        bs.push({ k: NORM, sz: 2, x0: x, y0: y, ax: 0, ph: 0, vx: 0, an: -1, um: false, esc: Infinity, cl: 0, hue: Math.floor(r() * 3), bridge: true, bt: [bs.indexOf(a), bs.indexOf(b)] });
        ok = true;
      }
    if (!ok) return null;
  }
  const isFirst = (i: number) => bs.findIndex((b) => b.cl === bs[i].cl) === i;
  const pickIn = (ok: (b: Bal, i: number) => boolean) => {
    const c = bs.map((b, i) => (ok(b, i) ? i : -1)).filter((i) => i >= 0);
    return c.length ? c[Math.floor(r() * c.length)] : -1;
  };
  const bySize = [...d.cl.keys()].sort((a, b) => d.cl[b] - d.cl[a]);
  // 동물 (우산 없음): 흔들리는 무리마다 하나, 가운데에 가까운 아래쪽 풍선
  const anis: number[] = [];
  for (let c = 1; c <= nAni; c++) {
    let bi = -1, bv = Infinity;
    bs.forEach((b, i) => {
      if (b.cl !== c || b.y0 > 0.8) return;
      const v = Math.abs(b.x0 - 0.5) - b.y0 * 0.3 + r() * 0.08;
      if (v < bv) (bv = v), (bi = i);
    });
    if (bi < 0) return null;
    bs[bi].an = 1 + ((c - 1 + Math.floor(r() * 4)) % 4);
    anis.push(bi);
  }
  for (let k = 0; k < (d.cat ?? 0); k++) {
    const i = pickIn((b, j) => b.k === NORM && b.an < 0 && b.cl === 0 && !isFirst(j) && b.y0 <= 0.8 && b.x0 > 0.15 && b.x0 < 0.85);
    if (i >= 0) (bs[i].an = 0), (bs[i].um = true);
  }
  for (let k = 0; k < (d.iron ?? 0); k++) {
    const i = pickIn((b, j) => b.k === NORM && b.an < 0 && !isFirst(j) && d.cl[b.cl] >= 5);
    if (i >= 0) (bs[i].k = IRON), (bs[i].sz = 1);
  }
  for (let k = 0; k < (d.water ?? 0); k++) {
    const c = bySize[k % nC];
    let bi = -1;
    bs.forEach((b, i) => b.cl === c && b.k === NORM && b.an < 0 && (bi < 0 || b.y0 < bs[bi].y0) && (bi = i));
    if (bi >= 0) (bs[bi].k = WATER), (bs[bi].sz = 1);
  }
  for (let k = 0; k < (d.fire ?? 0); k++) {
    const c = bySize[(k + 1) % nC];
    const i = pickIn((b, j) => b.cl === c && b.k === NORM && b.an < 0 && !isFirst(j));
    if (i >= 0) (bs[i].k = FIRE), (bs[i].sz = 1);
  }
  for (let k = 0; k < (d.king ?? 0); k++) {
    let ok = false;
    for (let q = 0; q < 200 && !ok; q++) {
      const x = 0.2 + r() * 0.6, y = 0.26 + r() * 0.5;
      // 'root': 모든 무리의 뿌리가 대왕 원 안 → 대왕 한 톡에 하늘 전체 (자식은 부모 원 안에만 놓여 연쇄가 뿌리에서 아래로 흐른다)
      const rootIn = (c: number) => { const b = bs.find((o) => o.cl === c)!; return Math.hypot(b.x0 - x, b.y0 - y) <= KING_REACH * 0.9; };
      if (d.kingAt === 'root' && ![...Array(nC).keys()].every(rootIn)) continue;
      if (bs.every((b) => Math.hypot(b.x0 - x, b.y0 - y) >= KING_BR + BR[b.sz] + 0.02 + b.ax))
        bs.push({ k: KING, sz: 2, x0: x, y0: y, ax: 0, ph: 0, vx: 0, an: -1, um: false, esc: Infinity, cl: nC, hue: 0 }), (ok = true);
    }
    if (!ok) return null;
  }
  // 트램펄린: 동물마다 흔들리다 '가끔' 위에 오는 자리 (늘 위면 고민이 없고, 안 오면 못 구한다)
  let tramp: Lay['tramp'] = null;
  if (anis.length) {
    const tw = d.tw ?? 0.17;
    let bx = -1, bvv = -Infinity;
    for (let tx = 0.22; tx <= 0.74; tx += 0.01) {
      let v = 0;
      for (const i of anis) {
        const b = bs[i];
        let on = 0;
        for (let q = 0; q < 52; q++) if (Math.abs(b.x0 + b.ax * Math.sin((q / 52) * Math.PI * 2) - tx) <= tw / 2 - 0.01) on++;
        const f = on / 52;
        v += f < 0.18 ? -10 + f : f > 0.6 ? 1 - (f - 0.6) * 3 : 1;
      }
      v -= Math.abs(tx - 0.48) * 0.5;
      if (v > bvv) (bvv = v), (bx = tx);
    }
    if (bvv < 0) return null;
    tramp = { x: bx, w: tw };
  }
  for (const b of bs) b.esc = b.vx > 0 ? Math.ceil((ESC_R - b.x0) / b.vx) : Infinity;
  const clouds: Cloud[] = [];
  for (let k = 0; k < (d.clouds ?? 0); k++) {
    const c = bySize[k % nC], mem = bs.filter((b) => b.cl === c);
    const cx = mem.reduce((a, b) => a + b.x0, 0) / mem.length, cy = mem.reduce((a, b) => a + b.y0, 0) / mem.length;
    clouds.push({ x: cx + (r() - 0.5) * 0.05, y: cy + (r() - 0.5) * 0.04, rx: 0.17 + r() * 0.04, ry: 0.11 + r() * 0.02, vx: (k % 2 ? -1 : 1) * (0.00016 + r() * 0.0001) });
  }
  // 다리로 이은 무리 1은 무리 0과 한 무리로 센다 (겹침 지표·배치 규칙이 둘을 하나로 보게)
  if (d.bridge) for (const b of bs) if (b.cl === 1) b.cl = 0;
  const iron = bs.map((b, i) => (b.k === IRON ? i : -1)).filter((i) => i >= 0);
  const Ds = d.wind ? [0, 30, 60, 90, 120, 150, 180, 240] : sway ? [0, 21, 42, 63, 84, 105, 126, 147, 168, 189, 210, 231] : [0];
  return { bs, iron, tramp, clouds, Ds, goal: d.goal, total: bs.filter((b) => b.k !== IRON).length };
}

/** 아무렇게나 세 번 누르면 몇 개 터지고 몇 마리 구하나 (판 고르기용) */
function randomRuns(L: Lay, r: Rng, plays: number) {
  const n = L.bs.length, out: Acc[] = [];
  for (let p = 0; p < plays; p++) {
    const alive = new Uint8Array(n).fill(1), c: Acc = { pop: 0, pop2: 0, save: 0, save2: 0 };
    let T = 1 + Math.floor(r() * 60);
    for (let tap = 1; tap <= 3; tap++) {
      const al: number[] = [];
      for (let i = 0; i < n; i++) if (alive[i] === 1 && L.bs[i].k !== IRON && T < L.bs[i].esc) al.push(i);
      if (!al.length) break;
      T = chainSim(L, alive, al[Math.floor(r() * al.length)], T, tap, c) + 25 + Math.floor(r() * 90);
    }
    out.push(c);
  }
  return out;
}

/** 밀도 (FUN §4): 판 시작 배치의 풍선 수(철 포함)와 반경 원 겹침 지수(겹치는 쌍 ÷ 전체 쌍, 철·폭죽·대왕 제외), 다른 무리끼리 겹침 */
export function density(seed: number, stage: number): { n: number; overlap: number; overlapX: number } {
  const bs = layoutFor(seed, stage).bs, rs = bs.filter((b) => reachOf(b) > 0 && b.k !== KING);
  let pairs = 0, hit = 0, xp = 0, xh = 0;
  for (let i = 0; i < rs.length; i++)
    for (let j = i + 1; j < rs.length; j++) {
      const o = Math.hypot(bxAt(rs[i], 0) - bxAt(rs[j], 0), byAt(rs[i], 0) - byAt(rs[j], 0)) < reachOf(rs[i]) + reachOf(rs[j]);
      pairs++;
      if (o) hit++;
      // 다른 무리끼리 (FUN v1.3): 무리 사이가 엉키면 어디까지 갈지 안 읽힌다
      if (rs[i].cl !== rs[j].cl) (xp++, o && xh++);
    }
  return { n: bs.length, overlap: pairs ? hit / pairs : 0, overlapX: xp ? xh / xp : 0 };
}

const LAY = new Map<string, Lay>();
/**
 * 판 배치 (같은 시드·같은 판이면 늘 같다 — 실패하면 같은 하늘을 다시).
 * 풍선 목표 수는 배치마다 정한다: 아무렇게나 세 번 누른 판들 중 rand 비율만큼만 채우는 수(1판은 거의 다, 뒤로 갈수록 적게).
 * 그리고 내다보기로 목표·두 번 안에·모두 팡이 다 되는 배치를 고른다.
 */
function layoutFor(seed: number, stage: number): Lay {
  const key = seed + ':' + stage, hit = LAY.get(key);
  if (hit) return hit;
  const d = STAGES[stage], PL = 40, mid = (d.rand[0] + d.rand[1]) / 2;
  let best: Lay | null = null, bsc = -Infinity, sure: Lay | null = null;
  const pool: { L: Lay; sc: number; p: boolean }[] = [];
  // 흔들 무리 둘인 판: 카드의 약속('두 무리가 한 번에')이 이 하늘에서 지켜지는가 (CONTENT v0.2.1)
  const needP = d.swayCl?.length === 2;
  let anyP = !needP;
  for (let a = 0; a < 40 && (a < 14 || !best || !anyP); a++) {
    const r = mulberry32((seed * 31 + stage * 7919 + a * 104729 + 17) >>> 0);
    const L = gen(d, r);
    if (!L) continue;
    const runs = randomRuns(L, r, PL);
    if (d.goal.pop) {
      // 목표 수: 아무렇게나 누른 판의 rand 비율만 채우는 수 — 단, 잘 고르면 톡 두 번 안에 채울 수 있는 만큼까지만 (★두 번 안에가 늘 가능하게)
      const pops = runs.map((c) => c.pop).sort((x, y) => y - x);
      popsOnly = true;
      const best2 = search(L, new Uint8Array(L.bs.length).fill(1), 1, 2, 0, { pop: 0, pop2: 0, save: 0, save2: 0 }, [0, 0, 3, 3], L.Ds.filter((_, k) => k % 2 === 0)).v;
      popsOnly = false;
      L.goal = { pop: Math.max(d.goal.pop, Math.min(best2, L.total - 1, pops[Math.min(PL - 1, Math.floor(mid * PL))] + 1)), save: d.goal.save };
    }
    const G = L.goal, rp = runs.filter((c) => c.pop >= G.pop && c.save >= G.save).length / PL;
    // 별 ★두 번 안에·★모두 팡은 골라야 받게: 아무렇게나 눌러서도 자주 나오는 배치는 덜 고른다
    const r2 = runs.filter((c) => c.pop2 >= G.pop && c.save2 >= G.save).length / PL, ra = runs.filter((c) => c.pop >= L.total).length / PL;
    const v = search(L, new Uint8Array(L.bs.length).fill(1), 1, 3, 0, { pop: 0, pop2: 0, save: 0, save2: 0 }, [0, 0, 2, 2], L.Ds.filter((_, k) => k % 2 === 0)).v;
    const met = v >= 10000, all = v - 10000 >= 4000, m2 = (v - 10000) % 4000 >= 2000;
    const off = rp < d.rand[0] ? d.rand[0] - rp : rp > d.rand[1] ? rp - d.rand[1] : 0;
    const easy = !stage || d.rest, fr = Math.max(0, r2 - (easy ? 0.85 : 0.45)) + Math.max(0, ra - (easy ? 0.4 : 0.3));
    const sc = (met ? 100 : 0) + (all ? 15 : 0) + (m2 ? 10 : 0) - off * 120 - fr * 40;
    if (sc > bsc) (bsc = sc), (best = L);
    const p = !needP || promiseWindow(L, d.swayCl![0], d.swayCl![1]) >= PROMISE_MIN;
    if (p) anyP = true;
    pool.push({ L, sc, p });
    if (p && met && all && m2 && off === 0 && fr === 0) {
      const v = verify(seed, stage, L);
      if (v.ok && v.m2) {
        sure = L;
        break;
      }
    }
  }
  // 내다보기 값만 믿지 않고, 점수 순으로 숙련 봇이 실제로 ★1·★2를 내는 배치를 고른다 (시드 64352 5판: 목표 16/17을 못 냄, C002 🧪)
  if (!sure) {
    let okOnly: Lay | null = null;
    const keep = pool.some((c) => c.p) ? pool.filter((c) => c.p) : pool;
    for (const c of keep.sort((x, y) => y.sc - x.sc).slice(0, 8)) {
      const v = verify(seed, stage, c.L);
      if (v.ok && v.m2) {
        sure = c.L;
        break;
      }
      if (v.ok && !okOnly) okOnly = c.L;
    }
    sure ??= okOnly;
  }
  const out = sure ?? best!;
  LAY.set(key, out);
  return out;
}
/**
 * 세로 화면 채우기 (C004, M1-3): 캔버스가 놀이 세계(가로 1 × 세로 A)보다 길면 남는 높이의 60%는 위 하늘, 40%는 아래 광장으로 늘린다.
 * HUD 띠는 화면 맨 위, 목표 띠는 화면 맨 아래에 붙는다. 플레이어(main.ts)가 포인터를 세계 좌표로 바꿀 때도 같은 식을 쓴다.
 */
export const playTop = (w: number, h: number) => Math.round(Math.max(0, h - w * A) * 0.6);
/** 캔버스 세로 ÷ 가로 상한 — 아주 긴 화면에서도 하늘만 끝없이 늘지 않게 */
export const MAX_TALL = 2.3;
/** 화면(px)에 맞춘 캔버스 크기: 가로는 놀이 세계가 들어가는 만큼(최대 620), 세로는 화면 끝까지(최대 MAX_TALL배) */
export function fitCanvas(cw: number, ch: number) {
  const W = Math.min(cw, 620, ch / A), H = Math.max(W * A, Math.min(ch, W * MAX_TALL));
  return { W, H, TOP: playTop(W, H) };
}
/** 화면에 같이 그려지는 DOM 버튼이 HUD 띠 오른쪽에 올라앉을 때 비워 둘 너비(px) — main.ts가 정한다 */
export const view: { hudRight: number; focus: { x: number; y: number } | null } = { hudRight: 0, focus: null };
/** 화면이 세로로 길 때 HUD 띠 높이(px) — 일시정지 버튼(44px)이 띠 안에 들어가게 */
const HUD_TALL = 56;

/** 확인용(테스트·funqa): 그 판의 처음 상태 (소개 카드 없이 바로 놀이) */
export function startAt(seed: number, stage: number): PopState {
  const s = blank(seed, stage);
  newStage(s, false);
  return s;
}

/** 살펴보기: 빈 하늘 톡에서 이 거리(화면 폭 비율) 안의 가장 가까운 풍선을, 이 틱 동안 미리 본다 (ART §10.5 A) */
export const PEEK_R = 0.16, PEEK_T = 120;
/** 살펴보기 자리(확인용): 풍선 i에서 PEEK_R 안이면서 어느 풍선도 안 눌리는 빈 하늘 한 점(세계 좌표, y는 0~A), 없으면 null */
export function emptyNear(s: PopState, i: number): { x: number; y: number } | null {
  const b = s.L.bs[i], st = s.st + 1, x0 = bxAt(b, st), y0 = byAt(b, st);
  for (const r of [0.1, 0.12, 0.14])
    for (let k = 0; k < 16; k++) {
      const x = x0 + r * Math.cos((k * Math.PI) / 8), y = y0 + r * Math.sin((k * Math.PI) / 8);
      if (x < 0.03 || x > 0.97 || y < 0.15 || y > 1.0) continue;
      if (s.L.bs.every((o, j) => s.alive[j] !== 1 || Math.hypot(bxAt(o, st) - x, byAt(o, st) - y) > Math.max(0.066, brOf(o) + 0.02) + 0.01)) return { x, y };
    }
  return null;
}
/** 약속한 다리 창의 최소 길이(틱) — 0.5초 (FUN v1.5) */
export const PROMISE_MIN = 30;
/**
 * 약속한 다리 창 (FUN v1.5): 한 주기 동안 step틱마다, 무리 a·b의 풍선 하나를 톡 하면 두 무리(철 제외)가 다 터지는가 →
 * 그런 때가 가장 길게 이어지는 길이(틱). 흔들 무리 판의 카드 약속을 배치에서 지킬 때 쓴다.
 */
export function promiseWindow(L: Lay, a: number, b: number, step = 4): number {
  const mem = L.bs.map((x, i) => (x.k !== IRON && (x.cl === a || x.cl === b) ? i : -1)).filter((i) => i >= 0);
  const per = Math.round((2 * Math.PI) / SWAY_W);
  let best = 0, run = 0;
  for (let T = 1; T <= per; T += step) {
    let ok = false;
    for (const j of mem) {
      const al = new Uint8Array(L.bs.length).fill(1);
      chainSim(L, al, j, T, 1, { pop: 0, pop2: 0, save: 0, save2: 0 });
      if (mem.every((m) => al[m] === 0)) {
        ok = true;
        break;
      }
    }
    run = ok ? run + step : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** 판 생성 시간 재기용(캐시 없이 새로 만든다) */
export function layoutTime(seed: number, stage: number) {
  LAY.delete(seed + ':' + stage);
  return layoutFor(seed, stage);
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Fall { j: number; an: number; um: boolean; x: number; y: number; t0: number; dur: number; ok: boolean; tap: number; done: boolean; slot: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; z?: number }
export interface PopState {
  rng: Rng; seed: number; t: number; stage: number; tries: number; phase: 'intro' | 'play' | 'result'; pt: number; st: number;
  L: Lay; alive: Uint8Array; popT: Int32Array; tapOf: Int8Array; src: Int16Array; srcT: Int32Array; srcX: Float32Array; srcY: Float32Array;
  clouds: (Cloud & { gone: number })[];
  taps: number; used: number; popped: number; pop2: number; saved: number; save2: number; flown: number; chainN: number; lastPop: number;
  falls: Fall[]; wait: number; m2: boolean; all: boolean;
  stars: number; got: number; ok: boolean; pts: number; dead: boolean; won: boolean;
  /** 실패한 횟수(이번 런 전체) · 도움 반짝 풍선(-1 없음)과 누를 때 · 이번 시도가 도움을 받았나(★2 잠금) */
  fails: number; help: number; helpAt: number; helped: boolean;
  /** 살펴보기(C007): 빈 하늘을 톡 하면 가까운 풍선 미리 보기 — 그 풍선(-1 없음)과 시작 판 틱 */
  peek: number; peekAt: number;
  down: boolean; seen: Set<string>; events: Ev[]; news: { text: string; t: number }[];
}

function blank(seed: number, stage: number): PopState {
  return {
    rng: mulberry32(seed), seed, t: 0, stage, tries: 0, phase: 'play', pt: 0, st: 0,
    fails: 0, stars: 0, got: 0, ok: false, pts: 0, dead: false, won: false, down: false, seen: new Set<string>(), events: [], news: [],
  } as unknown as PopState;
}
/** 배치 검증 (C003): 숙련 봇이 이 배치를 실제로 한 판 해 본다 → 목표(★1)와 두 번 안에(★2)를 냈나 */
function verify(seed: number, stage: number, L: Lay): { ok: boolean; m2: boolean } {
  const s = blank(seed, stage);
  newStage(s, false, L);
  const rng = () => 0.5;
  for (let k = 0; k < 60 * 120 && s.phase !== 'result'; k++) balloonpop.step(s, balloonpopSmart.act(s, rng));
  return { ok: s.phase === 'result' && s.ok, m2: s.phase === 'result' && s.m2 };
}

const ev = (s: PopState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, z?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, z });
function see(s: PopState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.news.push({ text, t: s.t });
}

function newStage(s: PopState, retry: boolean, lay?: Lay) {
  const L = (s.L = lay ?? layoutFor(s.seed, s.stage)), n = L.bs.length;
  s.alive = new Uint8Array(n).fill(1);
  s.popT = new Int32Array(n).fill(-1);
  s.tapOf = new Int8Array(n);
  s.src = new Int16Array(n).fill(-1);
  s.srcT = new Int32Array(n);
  s.srcX = new Float32Array(n);
  s.srcY = new Float32Array(n);
  s.clouds = L.clouds.map((c) => ({ ...c, gone: -1 }));
  s.taps = 3;
  s.used = s.popped = s.pop2 = s.saved = s.save2 = s.flown = s.chainN = s.wait = s.st = s.pt = 0;
  s.lastPop = -999;
  s.falls = [];
  s.m2 = s.all = false;
  s.phase = s.t === 0 || retry ? 'play' : 'intro';
  s.tries = retry ? s.tries + 1 : 0;
  s.help = -1;
  s.peek = -1;
  s.helped = s.tries >= HELP_AFTER;
  // 도움 반짝: 숙련 봇과 **같은 계획**(plan)으로 첫 톡 풍선과 때를 고른다 — 그대로 따라 하면 숙련 봇의 판이 된다(배치 검증으로 깨지는 것이 보장됨)
  if (s.helped) helpNext(s);
  const d = STAGES[s.stage];
  see(s, d.key, d.news);
  if (d.lanes) see(s, 'fly', '🎈 화면 밖으로 흘러간 풍선은 못 터뜨려요');
}

/** 숙련 봇의 계획: 지금 상태에서 남은 톡을 내다보고 다음 톡 풍선과 때. 같은 상태·같은 톡 번호면 한 번만 계산 */
function plan(s: PopState, lead = 0): { key: string; i: number; at: number; v: number } {
  const key = `${s.stage}:${s.tries}:${s.used}:${lead}`;
  let m = brain.get(s);
  if (!m || m.key !== key) {
    const T = s.st + 1 + lead;
    const r = search(s.L, s.alive.slice(), T, s.taps, s.used, accOf(s), BEAM, s.L.Ds);
    brain.set(s, (m = { key, i: r.i, at: T + r.d, v: r.v }));
  }
  return m;
}
/** 도움 반짝의 여유(틱): 고리가 뜨고 '지금!'까지 사람이 보고 손을 옮길 시간 — 길게부터, 목표를 못 채우면 짧게 (바람 판은 기다리면 날아감) */
export const HELP_LEADS = [48, 30, 18, 0];
/** 도움 반짝을 다음 톡으로 옮긴다 (C003: 첫 톡만이 아니라 톡마다, 사람이 반응할 여유를 두고) */
/** 지금까지의 진행(연쇄 중 떨어지는 동물 포함) — 숙련 봇·도움이 내다볼 때의 출발점 */
const accOf = (s: PopState): Acc => ({ pop: s.popped, pop2: s.pop2, save: s.saved + pendingOk(s, 9), save2: s.save2 + pendingOk(s, 2) });
/** 늦은 손 안전망(C006): '지금!'보다 이만큼 늦게 눌러도 목표(★1)를 채우는 계획을 고른다 — 사람은 보고 0.2~0.4초 뒤에 누른다 */
export const HELP_LATE = [12, 24];
function helpNext(s: PopState) {
  // 여유가 긴 계획부터: 목표를 채우고, 늦게 눌러도 채우는 첫 계획. 없으면 목표만 채우는 첫 계획, 그것도 없으면 마지막 것
  const lateOK = (m: { i: number; at: number }) => m.i >= 0 && HELP_LATE.every((dl) => search(s.L, s.alive.slice(), m.at + dl, s.taps, s.used, accOf(s), BEAM, [0], m.i).v >= 10000);
  let m = plan(s, HELP_LEADS[0]), first: typeof m | null = null;
  for (const lead of HELP_LEADS) {
    m = plan(s, lead);
    if (m.v < 10000) continue;
    first ??= m;
    if (lateOK(m)) {
      first = m;
      break;
    }
  }
  m = first ?? m;
  s.help = m.i;
  s.helpAt = m.at;
}

/** 누름 판정 반경 — 풍선 몸보다 조금 넓다(손가락) */
const hitR = (b: Bal) => Math.max(0.066, brOf(b) + 0.02);
function pick(s: PopState, x: number, y: number): number {
  const L = s.L;
  let best = -1, bd = Infinity;
  for (let i = 0; i < L.bs.length; i++) {
    if (s.alive[i] !== 1) continue;
    const b = L.bs[i], r = hitR(b);
    let d = Math.hypot(SX[i] - x, SY[i] - y);
    if (b.an >= 0) d = Math.min(d, Math.hypot(SX[i] - x, SY[i] + HANG - y) * 1.1);
    if (d < r && d < bd) (bd = d), (best = i);
  }
  return best;
}

const WORDS = ['팡!', '펑!', '빵!', '팡!', '퐁!'];
function pop(s: PopState, i: number) {
  const L = s.L, b = L.bs[i], x = SX[i], y = SY[i], tap = s.tapOf[i], n = L.bs.length;
  s.alive[i] = 0;
  s.popT[i] = -1;
  s.popped++;
  s.chainN++;
  s.lastPop = s.t;
  if (tap <= 2) s.pop2++;
  if (b.an >= 0) {
    const ok = savedAt(L, i), y0 = y + HANG, slot = s.falls.filter((f) => f.ok && !f.um).length;
    s.falls.push({ j: i, an: b.an, um: b.um, x, y: y0, t0: s.st, dur: Math.ceil((GY - y0) / (b.um ? FALL_UM : FALL_NO)), ok, tap, done: false, slot });
    if (b.um) see(s, 'cat', '☂️ 우산 고양이 — 둥실둥실 내려와요');
  }
  for (let k = 0; k < n; k++) {
    if (s.alive[k] !== 1 || s.st >= L.bs[k].esc) continue;
    const d = delay(L, i, k);
    if (!d) continue;
    const at = s.st + d;
    if (s.popT[k] < 0 || at < s.popT[k]) (s.popT[k] = at), (s.tapOf[k] = tap), (s.src[k] = i), (s.srcT[k] = s.st), (s.srcX[k] = x), (s.srcY[k] = y);
  }
  const R = b.k === FIRE ? 0.12 : reachOf(b);
  for (const c of s.clouds)
    if (c.gone < 0 && (Math.hypot(c.x - x, (c.y - y) * 1.3) < R + c.rx * 0.55 || (b.k === FIRE && Math.abs(c.y - y) < c.ry + FIRE_BAND)))
      (c.gone = s.t), ev(s, 'cloud', c.x, c.y, '휙~ 구름이 걷혔다', '#ffffff');
  const kind = b.k === WATER ? 'water' : b.k === FIRE ? 'fire' : b.k === KING ? 'king' : 'pop';
  const word = b.k === WATER ? '촤악!' : b.k === FIRE ? '피융~ 펑!' : b.k === KING ? '대왕 팡!!' : s.chainN >= 10 ? '팡!!!' : WORDS[(i + s.chainN) % WORDS.length];
  ev(s, kind, x, y, word, colOf(b), b.k === FIRE ? 0 : reachOf(b), s.chainN);
}

function endStage(s: PopState) {
  s.phase = 'result';
  s.pt = 0;
  const G = s.L.goal, met = s.popped >= G.pop && s.saved >= G.save;
  s.m2 = !s.helped && s.pop2 >= G.pop && s.save2 >= G.save;
  s.all = s.popped >= s.L.total;
  s.ok = met;
  if (met) {
    const st = 1 + (s.m2 ? 1 : 0) + (s.all ? 1 : 0);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + s.popped * POP_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5);
  } else {
    s.fails++;
    ev(s, 'fail', 0.5, 0.5);
  }
}

function play(s: PopState, p: { x: number; y: number } | null) {
  const L = s.L, n = L.bs.length;
  s.st++;
  posAll(L, s.st);
  for (let i = 0; i < n; i++)
    if (s.alive[i] === 1 && s.st >= L.bs[i].esc) (s.alive[i] = 2), (s.popT[i] = -1), s.flown++, ev(s, 'fly', 0.94, SY[i], L.bs[i].an >= 0 ? '안녕~' : '훨훨~', '#ffffff');
  for (let i = 0; i < n; i++) if (s.alive[i] === 1 && s.popT[i] === s.st) pop(s, i);
  if (p && s.taps > 0) {
    const i = pick(s, p.x, p.y * A);
    if (i < 0) {
      // 빈 하늘 톡 = 살펴보기(톡 안 씀): 가까운 풍선을 가리킨 것처럼 첫 파문 미리 보기 (C007, 휴대폰은 누르는 순간 터져서 미리 볼 틈이 없다)
      let pj = -1, pd = PEEK_R;
      for (let j = 0; j < n; j++) {
        if (s.alive[j] !== 1 || L.bs[j].k === IRON) continue;
        const dd = Math.hypot(SX[j] - p.x, SY[j] - p.y * A);
        if (dd < pd) (pd = dd), (pj = j);
      }
      if (pj >= 0) (s.peek = pj), (s.peekAt = s.st);
      ev(s, 'miss', p.x, p.y * A, pj < 0 ? '휙~' : s.seen.has('peek') ? '👀' : '👀 살펴보기', '#ffffff');
      // 첫 살펴보기에 한 줄 — 빈 하늘 톡이 무엇인지. 판 소식 줄을 새치기해 그 순간에 뜬다 (C008 🧪 ⑤1·⑥2)
      if (pj >= 0 && !s.seen.has('peek')) s.seen.add('peek'), s.news.unshift({ text: '👀 빈 하늘 톡 = 살펴보기 (톡은 안 써요)', t: s.t });
    }
    else if (L.bs[i].k === IRON) ev(s, 'clang', SX[i], SY[i], '깡! 안 터져요', '#e3e8ee');
    else {
      s.taps--;
      s.used++;
      s.help = -1;
      s.tapOf[i] = s.used;
      s.src[i] = -1;
      ev(s, 'tap', SX[i], SY[i]);
      pop(s, i);
    }
  }
  for (const c of s.clouds) if (c.gone < 0) c.x += c.vx;
  for (const f of s.falls)
    if (!f.done && s.st >= f.t0 + f.dur) {
      f.done = true;
      if (f.ok) (s.saved++, f.tap <= 2 && s.save2++), ev(s, f.um ? 'land' : 'save', f.x, GY, f.um ? '사뿐~' : '퐁~ 구출!', '#c6ff9e');
      else ev(s, 'flop', f.x, GY, '아야!', '#ffd0c0');
    }
  let pending = false, left = false;
  for (let i = 0; i < n; i++) if (s.alive[i] === 1) (s.popT[i] >= 0 && (pending = true)), L.bs[i].k !== IRON && (left = true);
  if (!pending && s.chainN > 0) ev(s, 'chainEnd', 0.5, 0.3, undefined, undefined, s.chainN), (s.chainN = 0);
  if (s.helped && !pending && s.help < 0 && s.taps > 0 && left) helpNext(s);
  const falling = s.falls.some((f) => !f.done);
  if (!pending && !falling && (s.taps === 0 || !left)) {
    if (++s.wait >= WAIT_END) endStage(s);
  } else s.wait = 0;
}

export const balloonpop: GameDef<PopState> = {
  id: 'balloonpop',
  name: '풍선 팡 연쇄',
  genes: ['chain', 'pointer'],
  twist: '한 판에 톡은 세 번뿐 — 터진 풍선이 둘레 원 안의 풍선을 터뜨려 하늘 전체가 박자에 맞춰 팡팡팡 이어진다. 어느 풍선을, 언제 톡 할지가 수다',
  rules: ['풍선을 톡 = 팡! 터진 풍선은 둘레 원 안의 풍선을 터뜨려요 (큰 풍선일수록 원이 커요).', '톡은 한 판에 세 번 — 목표를 채우면 ★, 두 번 안에·모두 팡이면 ★ 더!'],
  controls: 'touch',
  hint: '풍선을 톡 = 팡 / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '축제 하늘 풍선 디오라마',
    mood: '놀이공원 위 축제 하늘 — 겹겹 구름층 아래 대관람차가 돌고 줄깃발이 펄럭인다. 반짝이는 고무풍선 무리에 동물들이 매달려 있고, 피에로가 저글링하며 올려다본다. 판이 흐르며 한낮에서 노을, 불빛 축제의 밤으로.',
    palette: { bg: '#2a1f52', ink: '#fffaf2', muted: '#c9b8e8', accent: '#ffd166', hot: '#ff5d7a', soft: '#ffe9f0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = blank(seed, 0);
    newStage(s, false);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.events.length && s.t - s.events[0].t >= 130) s.events = s.events.filter((e) => s.t - e.t < 130);
    if (s.news.length && s.t - s.news[0].t > NEWS_T) {
      s.news.shift();
      if (s.news.length) s.news[0].t = s.t;
    }
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT : FAIL_RESULT)) {
        if (!s.ok) newStage(s, true);
        else if (s.won) s.dead = true;
        else s.stage++, newStage(s, false);
      }
      return;
    }
    if (s.phase === 'intro') {
      if (s.pt >= INTRO) (s.phase = 'play'), (s.pt = 0);
      return;
    }
    // 다시 토스트 첫 TAP_BLOCK틱의 톡은 받지 않는다 — 결과를 닫으려던 손짓이 톡 하나를 써 버리지 않게 (C003 🧪 → C008 토스트)
    play(s, press && !(s.tries > 0 && s.pt < TAP_BLOCK) ? p : null);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const BEAM = [0, 0, 3, 3];
const pendingOk = (s: PopState, maxTap: number) => s.falls.filter((f) => !f.done && f.ok && f.tap <= maxTap).length;
const brain = new WeakMap<object, { key: string; i: number; at: number; v: number }>();
/** 봇: 남은 톡을 끝까지 내다보며(연쇄를 그대로 돌려 봄) 어느 풍선을, 언제(흔들림·바람) 톡 할지 고른다 */
export const balloonpopSmart: Bot<PopState> = {
  name: '연쇄 박사',
  act(s) {
    if (s.phase !== 'play' || s.down || s.taps <= 0) return NO;
    for (let i = 0; i < s.alive.length; i++) if (s.alive[i] === 1 && s.popT[i] >= 0) return NO;
    const m = plan(s);
    if (m.i < 0 || s.st + 1 < m.at) return NO;
    if (s.alive[m.i] !== 1) return brain.delete(s), NO;
    const b = s.L.bs[m.i];
    return { tap: false, dir: 0, pointer: { x: bxAt(b, s.st + 1), y: byAt(b, s.st + 1) / A } };
  },
};

const dumbAt = new WeakMap<object, number>();
/** 봇: 아무 풍선이나, 아무 때나 톡 (가끔 하늘 아무 데나) */
export const balloonpopRandom: Bot<PopState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    if (s.phase !== 'play' || s.down) return NO;
    if (!dumbAt.has(s)) dumbAt.set(s, s.t + 20 + Math.floor(rng() * 50));
    if (s.t < dumbAt.get(s)!) return NO;
    dumbAt.set(s, s.t + 30 + Math.floor(rng() * 100));
    if (rng() < 0.1) return { tap: false, dir: 0, pointer: { x: rng(), y: rng() } };
    const al: number[] = [];
    for (let i = 0; i < s.alive.length; i++) if (s.alive[i] === 1) al.push(i);
    if (!al.length) return NO;
    const b = s.L.bs[al[Math.floor(rng() * al.length)]];
    return { tap: false, dir: 0, pointer: { x: bxAt(b, s.st + 1) + (rng() - 0.5) * 0.04, y: (byAt(b, s.st + 1) + (rng() - 0.5) * 0.04) / A } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const BCOL = [['#ff4d6d', '#ff5f8a', '#f0436a'], ['#ffc53d', '#ffb11f', '#ffd45c'], ['#3f8cff', '#5b7cff', '#2fa3ff']];
function colOf(b: Bal) {
  return b.k === IRON ? '#a3adb9' : b.k === WATER ? '#62cfff' : b.k === FIRE ? '#ff6a3d' : b.k === KING ? '#c77dff' : BCOL[b.sz][b.hue];
}
const RAINBOW = ['#ff5d5d', '#ffa53d', '#ffe14d', '#6ee06e', '#4fb6ff', '#8f7bff', '#ff7bd8'];
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b), k = Math.max(0, Math.min(1, t));
  return '#' + p.map((v, j) => Math.round(v + (q[j] - v) * k).toString(16).padStart(2, '0')).join('');
};
const rgba = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
/** 판마다 하루가 흐른다: 한낮 → 노을 → 불빛 축제의 밤 (하늘 위 · 지평선 · 구름 그늘) */
const SKY: [string, string, string][] = [
  ['#4fb6ff', '#cdefff', '#b9d9f2'],
  ['#49acf6', '#d8f1ff', '#b4d3ee'],
  ['#589fe9', '#ffe9cc', '#c9c6e0'],
  ['#6a97df', '#ffd9b2', '#d0b8d0'],
  ['#7a7fcb', '#ffbf98', '#c79fb8'],
  ['#57519b', '#ff9883', '#a9839f'],
  ['#2b2966', '#7a4f9c', '#6a5f99'],
  ['#191848', '#4a347c', '#4f4880'],
];
const DUSK = [0, 0, 0.05, 0.12, 0.25, 0.4, 0.62, 0.78];
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

/** 둥근 구름 한 덩이 (위는 밝고 아래는 그늘) */
function puff(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, light: string, shade: string, a = 1) {
  const g = ctx.createLinearGradient(0, y - s * 0.9, 0, y + s * 0.55);
  g.addColorStop(0, rgba(light, a));
  g.addColorStop(0.6, rgba(light, a));
  g.addColorStop(1, rgba(shade, a));
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [dx, dy, rr] of [[-0.62, 0.12, 0.42], [-0.25, -0.22, 0.55], [0.22, -0.3, 0.6], [0.62, 0.05, 0.45], [0, 0.18, 0.5]]) {
    ctx.moveTo(x + dx * s + rr * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
  }
  ctx.fill();
}

/** 고무풍선 하나 (광택·몸통 그늘·매듭). fused = 곧 터짐(헉 얼굴), kind별 무늬 */
function drawBalloon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, col: string, k: number, t: number, fused: number, tilt: number, sz = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  // 크기 3종 = 색 + 모양 + 무늬 (ART §2, C008): 콩 동그란 공 1.05 · 통 달걀 1.17 + 띠 1줄 · 왕 물방울 1.3 + 띠 2줄 + 별
  const plain = k === NORM, ry = r * (plain ? [1.05, 1.17, 1.3][sz] : 1.17);
  if (fused > 0) {
    ctx.shadowColor = '#fff6c8';
    ctx.shadowBlur = r * 0.9;
  }
  const g = ctx.createRadialGradient(-r * 0.38, -ry * 0.42, r * 0.08, 0, 0, r * 1.3);
  if (k === IRON) (g.addColorStop(0, '#ffffff'), g.addColorStop(0.35, '#c4ccd6'), g.addColorStop(0.75, '#7f8a98'), g.addColorStop(1, '#4b5563'));
  else if (k === WATER) (g.addColorStop(0, 'rgba(240,252,255,.95)'), g.addColorStop(0.5, 'rgba(120,214,255,.8)'), g.addColorStop(1, 'rgba(30,120,200,.85)'));
  else (g.addColorStop(0, mix(col, '#ffffff', 0.6)), g.addColorStop(0.45, col), g.addColorStop(1, mix(col, '#2a0f3a', 0.5)));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r, ry, 0, 0, Math.PI * 2);
  ctx.clip();
  if (k === KING) {
    // 무지개 줄무늬
    for (let q = 0; q < RAINBOW.length; q++) {
      ctx.fillStyle = rgba(RAINBOW[q], 0.55);
      ctx.fillRect(-r + (q * 2 * r) / RAINBOW.length, -ry, (2 * r) / RAINBOW.length + 0.5, ry * 2);
    }
  } else if (k === FIRE) {
    ctx.strokeStyle = 'rgba(255,230,120,.85)';
    ctx.lineWidth = r * 0.22;
    for (let q = -3; q <= 3; q++) {
      ctx.beginPath();
      ctx.moveTo(q * r * 0.6 - r, -ry);
      ctx.lineTo(q * r * 0.6 + r, ry);
      ctx.stroke();
    }
  } else if (k === WATER) {
    // 안에서 출렁이는 물
    ctx.fillStyle = 'rgba(40,140,230,.45)';
    ctx.beginPath();
    ctx.moveTo(-r, ry);
    for (let q = 0; q <= 8; q++) ctx.lineTo(-r + (q / 8) * 2 * r, ry * 0.15 + Math.sin(t * 0.12 + q) * r * 0.08);
    ctx.lineTo(r, ry);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(r * 0.2, ry * 0.45 - ((t * 0.4) % (ry * 0.6)), r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  } else if (plain && sz > 0) {
    ctx.fillStyle = 'rgba(255,255,255,.32)';
    for (const by of sz === 1 ? [0.18] : [0.08, 0.3]) ctx.fillRect(-r, ry * by, 2 * r, ry * 0.09);
    if (sz === 2) {
      ctx.fillStyle = 'rgba(255,255,255,.75)';
      ctx.beginPath();
      for (let q = 0; q < 10; q++) {
        const a = -Math.PI / 2 + (q * Math.PI) / 5, rr = (q % 2 ? 0.07 : 0.16) * r;
        ctx.lineTo(r * 0.3 + rr * Math.cos(a), -ry * 0.12 + rr * Math.sin(a));
      }
      ctx.fill();
    }
  } else if (k === IRON) {
    ctx.fillStyle = 'rgba(60,70,82,.55)';
    ctx.fillRect(-r, -ry * 0.12, 2 * r, ry * 0.2);
    ctx.fillStyle = '#e8edf2';
    for (const q of [-0.6, -0.2, 0.2, 0.6]) {
      ctx.beginPath();
      ctx.arc(q * r, -ry * 0.02, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 아래쪽 반사광 (두께)
  ctx.fillStyle = 'rgba(255,255,255,.14)';
  ctx.beginPath();
  ctx.ellipse(r * 0.15, ry * 0.78, r * 0.6, ry * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 광택
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -ry * 0.42, r * 0.17, ry * 0.27, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.12, -ry * 0.72, r * 0.065, 0, Math.PI * 2);
  ctx.fill();
  // 매듭
  ctx.fillStyle = k === IRON ? '#59626e' : mix(col, '#3a1030', 0.3);
  ctx.beginPath();
  ctx.moveTo(0, ry * 0.9);
  ctx.lineTo(-r * 0.15, ry * 1.13);
  ctx.lineTo(r * 0.15, ry * 1.13);
  ctx.closePath();
  ctx.fill();
  // 얼굴: 철 풍선은 '흥', 곧 터질 풍선은 '헉!'
  if (k === IRON || fused > 0) {
    ctx.strokeStyle = 'rgba(40,20,40,.85)';
    ctx.fillStyle = 'rgba(40,20,40,.85)';
    ctx.lineWidth = Math.max(1, r * 0.08);
    if (k === IRON) {
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(sd * r * 0.5, -ry * 0.38);
        ctx.lineTo(sd * r * 0.15, -ry * 0.28);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sd * r * 0.3, -ry * 0.16, r * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-r * 0.18, ry * 0.32);
      ctx.lineTo(r * 0.18, ry * 0.28);
      ctx.stroke();
    } else {
      for (const sd of [-1, 1]) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sd * r * 0.3, -ry * 0.12, r * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(40,20,40,.9)';
        ctx.beginPath();
        ctx.arc(sd * r * 0.3, -ry * 0.1, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.ellipse(0, ry * 0.3, r * 0.12, r * 0.17 * (0.8 + 0.4 * fused), 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (k === KING) {
    // 왕관
    ctx.fillStyle = '#ffd34d';
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -ry * 0.92);
    ctx.lineTo(-r * 0.5, -ry * 1.35);
    ctx.lineTo(-r * 0.22, -ry * 1.12);
    ctx.lineTo(0, -ry * 1.45);
    ctx.lineTo(r * 0.22, -ry * 1.12);
    ctx.lineTo(r * 0.5, -ry * 1.35);
    ctx.lineTo(r * 0.45, -ry * 0.92);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (k === FIRE) {
    // 심지 불꽃
    const fl = 0.7 + 0.3 * Math.sin(t * 0.9);
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, -ry * 1.05, r * 0.16 * fl, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.arc(0, -ry * 1.05, r * 0.08 * fl, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

const SPC = [
  { head: '#ffad5c', dark: '#d9772a', belly: '#ffe2c0' },
  { head: '#d9a066', dark: '#7f5228', belly: '#f6dcc0' },
  { head: '#f7f1ec', dark: '#e7a9bd', belly: '#ffffff' },
  { head: '#ffb3c6', dark: '#ee7f9f', belly: '#ffd6e2' },
  { head: '#ffe066', dark: '#f0a500', belly: '#fff3b0' },
];
type AMood = 'calm' | 'wow' | 'happy' | 'dizzy' | 'scared';
/** 동물 (cat·dog·bunny·pig·chick). arms: hold=풍선 줄 잡기, up=만세, flail=버둥, down=내림. flip = 뒤집혀 버둥 */
function drawAnimal(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, sp: number, mood: AMood, t: number, arms: 'hold' | 'up' | 'flail' | 'down', flip = false, tilt = 0) {
  const C = SPC[sp];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt + (flip ? Math.PI : 0));
  // 몸
  ctx.fillStyle = C.head;
  ctx.beginPath();
  ctx.ellipse(0, z * 1.05, z * 0.74, z * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.belly;
  ctx.beginPath();
  ctx.ellipse(0, z * 1.18, z * 0.44, z * 0.44, 0, 0, Math.PI * 2);
  ctx.fill();
  // 다리 (뒤집히면 허공에 버둥)
  const kick = flip || arms === 'flail' ? Math.sin(t * 0.55) * z * 0.3 : 0;
  ctx.fillStyle = C.dark;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.36, z * 1.72 + kick * sd, z * 0.22, z * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 팔
  ctx.strokeStyle = C.head;
  ctx.lineWidth = z * 0.34;
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    let ax: number, ay: number;
    if (arms === 'hold') (ax = sd * z * 0.16), (ay = -z * 1.22);
    else if (arms === 'up') (ax = sd * z * 1.02), (ay = -z * 0.85 + Math.sin(t * 0.3 + sd) * z * 0.15);
    else if (arms === 'flail') (ax = sd * z * (1.05 + 0.2 * Math.sin(t * 0.8 + sd))), (ay = -z * (0.5 + 0.55 * Math.sin(t * 0.9 + sd * 2)));
    else (ax = sd * z * 0.95), (ay = z * 1.35);
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.5, z * 0.85);
    ctx.quadraticCurveTo(sd * z * 0.95, z * 0.4, ax, ay);
    ctx.stroke();
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.arc(ax, ay, z * 0.19, 0, Math.PI * 2);
    ctx.fill();
  }
  // 귀 (머리 뒤)
  ctx.fillStyle = C.head;
  if (sp === 0 || sp === 3)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = C.head;
      ctx.beginPath();
      ctx.moveTo(sd * z * 0.85, -z * 0.25);
      ctx.lineTo(sd * z * (sp === 0 ? 0.7 : 0.8), -z * (sp === 0 ? 1.15 : 0.95));
      ctx.lineTo(sd * z * 0.2, -z * 0.78);
      ctx.fill();
      ctx.fillStyle = C.dark;
      ctx.beginPath();
      ctx.moveTo(sd * z * 0.7, -z * 0.45);
      ctx.lineTo(sd * z * 0.66, -z * 0.92);
      ctx.lineTo(sd * z * 0.38, -z * 0.72);
      ctx.fill();
    }
  if (sp === 2)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = C.head;
      ctx.beginPath();
      ctx.ellipse(sd * z * 0.36, -z * 1.3, z * 0.25, z * 0.72, sd * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.dark;
      ctx.beginPath();
      ctx.ellipse(sd * z * 0.36, -z * 1.28, z * 0.12, z * 0.5, sd * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  if (sp === 4) {
    ctx.strokeStyle = C.dark;
    ctx.lineWidth = z * 0.12;
    for (const q of [-1, 0, 1]) {
      ctx.beginPath();
      ctx.moveTo(q * z * 0.1, -z * 0.92);
      ctx.quadraticCurveTo(q * z * 0.25, -z * 1.25, q * z * 0.3 + z * 0.1, -z * 1.3);
      ctx.stroke();
    }
  }
  // 머리
  const hg = ctx.createRadialGradient(-z * 0.3, -z * 0.35, z * 0.1, 0, 0, z * 1.05);
  hg.addColorStop(0, mix(C.head, '#ffffff', 0.45));
  hg.addColorStop(1, C.head);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(0, 0, z, 0, Math.PI * 2);
  ctx.fill();
  if (sp === 1)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = C.dark;
      ctx.beginPath();
      ctx.ellipse(sd * z * 0.88, z * 0.05, z * 0.26, z * 0.55, sd * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
  // 볼
  ctx.fillStyle = 'rgba(255,120,150,.45)';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.58, z * 0.28, z * 0.17, z * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 눈
  const ink = '#2b1b2e';
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, z * 0.12);
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.36, ey = -z * 0.08;
    if (mood === 'calm') (ctx.beginPath(), ctx.arc(ex, ey, z * 0.11, 0, Math.PI * 2), ctx.fill());
    else if (mood === 'wow' || mood === 'scared') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.23, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, ey + (mood === 'scared' ? z * 0.04 : 0), z * (mood === 'scared' ? 0.07 : 0.11), 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'happy') (ctx.beginPath(), ctx.arc(ex, ey + z * 0.06, z * 0.14, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else {
      // 어질어질: 소용돌이
      ctx.beginPath();
      for (let q = 0; q < 14; q++) {
        const a = q * 0.75 + t * 0.3 * sd, rr = (q / 14) * z * 0.22;
        q ? ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr) : ctx.moveTo(ex, ey);
      }
      ctx.stroke();
    }
  }
  // 코·입
  if (sp === 3) {
    ctx.fillStyle = C.dark;
    ctx.beginPath();
    ctx.ellipse(0, z * 0.24, z * 0.26, z * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ink;
    for (const sd of [-1, 1]) (ctx.beginPath(), ctx.arc(sd * z * 0.09, z * 0.24, z * 0.05, 0, Math.PI * 2), ctx.fill());
  } else if (sp === 4) {
    ctx.fillStyle = '#ff9a1f';
    ctx.beginPath();
    ctx.moveTo(-z * 0.16, z * 0.12);
    ctx.lineTo(z * 0.16, z * 0.12);
    ctx.lineTo(0, z * (mood === 'wow' || mood === 'scared' ? 0.45 : 0.34));
    ctx.fill();
  } else {
    ctx.fillStyle = sp === 2 ? '#f08aa8' : ink;
    ctx.beginPath();
    ctx.ellipse(0, z * 0.14, z * 0.1, z * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = ink;
  ctx.fillStyle = '#7a1f3a';
  ctx.lineWidth = Math.max(1, z * 0.09);
  if (mood === 'wow' || mood === 'scared') (ctx.beginPath(), ctx.ellipse(0, z * 0.45, z * 0.13, z * (mood === 'wow' ? 0.18 : 0.1), 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 'happy') (ctx.beginPath(), ctx.arc(0, z * 0.3, z * 0.22, 0.1, Math.PI - 0.1), ctx.fill());
  else if (mood === 'dizzy') {
    ctx.beginPath();
    for (let q = 0; q <= 6; q++) ctx.lineTo(-z * 0.25 + q * z * 0.083, z * 0.45 + (q % 2 ? -1 : 1) * z * 0.05);
    ctx.stroke();
  } else if (sp !== 3 && sp !== 4) {
    ctx.beginPath();
    ctx.arc(-z * 0.08, z * 0.22, z * 0.09, 0.2, Math.PI - 0.2);
    ctx.arc(z * 0.08, z * 0.22, z * 0.09, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
  if (sp === 0) {
    ctx.strokeStyle = 'rgba(80,40,20,.55)';
    ctx.lineWidth = 0.8;
    for (const sd of [-1, 1])
      for (const q of [-0.06, 0.08]) {
        ctx.beginPath();
        ctx.moveTo(sd * z * 0.45, z * (0.18 + q));
        ctx.lineTo(sd * z * 1.05, z * (0.1 + q * 1.6));
        ctx.stroke();
      }
  }
  if (mood === 'scared') {
    ctx.fillStyle = 'rgba(150,220,255,.9)';
    ctx.beginPath();
    ctx.ellipse(z * 0.85, -z * 0.45, z * 0.1, z * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 펼친 우산 (손잡이 끝이 (x, y)) */
function drawUmbrella(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 0.06) * 0.14);
  ctx.strokeStyle = '#6b4a2a';
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 1.35);
  ctx.stroke();
  const cy = -r * 1.35;
  for (let q = 0; q < 6; q++) {
    ctx.fillStyle = q % 2 ? '#ffffff' : '#ff5d7a';
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.arc(0, cy, r, Math.PI + (q * Math.PI) / 6, Math.PI + ((q + 1) * Math.PI) / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(80,20,40,.25)';
  for (let q = 0; q < 6; q++) {
    ctx.beginPath();
    ctx.arc(-r + (q + 0.5) * (r / 3), cy, r / 6, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(0, cy - r * 1.02, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

type CMood = 'juggle' | 'wow' | 'laugh' | 'sad' | 'cheer' | 'look';
/** 피에로 구경꾼 (발 = (x, y)) */
function drawClown(ctx: CanvasRenderingContext2D, x: number, y: number, z: number, mood: CMood, t: number, age: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(30,40,20,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + z * 0.1, z * 1.7, z * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  const jy = mood === 'wow' ? -Math.max(0, Math.sin(Math.min(age, 20) * 0.16)) * z * 1.4 : mood === 'cheer' ? -Math.abs(Math.sin(t * 0.22)) * z * 0.8 : mood === 'laugh' ? Math.sin(t * 0.6) * z * 0.12 : 0;
  ctx.translate(x, y + jy);
  // 신발
  ctx.fillStyle = '#e23b4e';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * z * 0.75, -z * 0.22, z * 0.78, z * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 바지
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.moveTo(-z * 1.05, -z * 0.45);
  ctx.lineTo(-z * 0.9, -z * 2.1);
  ctx.lineTo(z * 0.9, -z * 2.1);
  ctx.lineTo(z * 1.05, -z * 0.45);
  ctx.lineTo(z * 0.15, -z * 0.45);
  ctx.lineTo(0, -z * 1.1);
  ctx.lineTo(-z * 0.15, -z * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(200,120,0,.35)';
  ctx.fillRect(-z * 0.95, -z * 1.0, z * 1.9, z * 0.12);
  // 셔츠 (물방울)
  ctx.fillStyle = '#3f7dff';
  ctx.beginPath();
  ctx.ellipse(0, -z * 2.7, z * 1.08, z * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (const [dx, dy] of [[-0.5, -2.9], [0.4, -3.1], [0.1, -2.4], [-0.3, -2.2], [0.65, -2.5]]) (ctx.beginPath(), ctx.arc(dx * z, dy * z, z * 0.13, 0, Math.PI * 2), ctx.fill());
  // 멜빵
  ctx.strokeStyle = '#e23b4e';
  ctx.lineWidth = z * 0.2;
  for (const sd of [-1, 1]) (ctx.beginPath(), ctx.moveTo(sd * z * 0.55, -z * 2.05), ctx.lineTo(sd * z * 0.4, -z * 3.4), ctx.stroke());
  // 팔
  const hands: [number, number][] = [];
  for (const sd of [-1, 1]) {
    let ax: number, ay: number;
    if (mood === 'juggle' || mood === 'look') (ax = sd * z * 1.2), (ay = -z * 2.7 + Math.sin(t * 0.25 + (sd > 0 ? Math.PI : 0)) * z * 0.35);
    else if (mood === 'wow' || mood === 'cheer') (ax = sd * z * 1.55), (ay = -z * 4.4 + Math.sin(t * 0.4 + sd) * z * 0.2);
    else if (mood === 'laugh') (ax = sd * z * 0.55), (ay = -z * 2.35);
    else (ax = sd * z * 0.7), (ay = -z * 4.0);
    ctx.strokeStyle = '#3f7dff';
    ctx.lineWidth = z * 0.42;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(sd * z * 0.85, -z * 3.1);
    ctx.quadraticCurveTo(sd * z * 1.5, -z * 2.9, ax, ay);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ax, ay, z * 0.3, 0, Math.PI * 2);
    ctx.fill();
    hands.push([ax, ay]);
  }
  // 주름 깃
  ctx.fillStyle = '#ffffff';
  for (let q = -3; q <= 3; q++) (ctx.beginPath(), ctx.arc(q * z * 0.24, -z * 3.55, z * 0.22, 0, Math.PI * 2), ctx.fill());
  // 머리: 무지개 곱슬머리
  const hy = -z * 4.45 + (mood === 'wow' ? -z * 0.15 : 0);
  const hair = ['#ff5d5d', '#ffa53d', '#ffe14d', '#6ee06e', '#4fb6ff'];
  for (let q = 0; q < 5; q++)
    for (const sd of [-1, 1]) {
      ctx.fillStyle = hair[q];
      const pf = mood === 'wow' ? 1.35 : 1;
      ctx.beginPath();
      ctx.arc(sd * z * (0.95 + 0.12 * q) * pf, hy - z * 0.5 + q * z * 0.24 - (mood === 'wow' ? z * 0.3 : 0), z * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  const fg = ctx.createRadialGradient(-z * 0.3, hy - z * 0.3, z * 0.1, 0, hy, z * 1.05);
  fg.addColorStop(0, '#ffffff');
  fg.addColorStop(1, '#f1e6ee');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.arc(0, hy, z, 0, Math.PI * 2);
  ctx.fill();
  // 모자
  ctx.fillStyle = '#8f5bff';
  ctx.beginPath();
  ctx.moveTo(-z * 0.45, hy - z * 0.82);
  ctx.lineTo(z * 0.45, hy - z * 0.82);
  ctx.lineTo(z * 0.15, hy - z * 1.9 + (mood === 'wow' ? -z * 0.5 : 0));
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe14d';
  ctx.beginPath();
  ctx.arc(z * 0.15, hy - z * 1.95 + (mood === 'wow' ? -z * 0.5 : 0), z * 0.2, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴
  const ink = '#2b1b2e';
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, z * 0.12);
  for (const sd of [-1, 1]) {
    const ex = sd * z * 0.36, ey = hy - z * 0.2;
    ctx.strokeStyle = '#4fb6ff';
    ctx.lineWidth = Math.max(1, z * 0.08);
    ctx.beginPath();
    ctx.moveTo(ex, ey - z * 0.38);
    ctx.lineTo(ex, ey + z * 0.32);
    ctx.stroke();
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1, z * 0.12);
    if (mood === 'wow') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.24, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(ex, ey, z * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else if (mood === 'laugh' || mood === 'cheer') (ctx.beginPath(), ctx.arc(ex, ey + z * 0.08, z * 0.15, Math.PI * 1.1, Math.PI * 1.9), ctx.stroke());
    else if (mood === 'sad') (ctx.beginPath(), ctx.arc(ex, ey - z * 0.1, z * 0.13, Math.PI * 0.15, Math.PI * 0.85), ctx.stroke());
    else (ctx.beginPath(), ctx.arc(ex + (mood === 'look' ? 0 : Math.sin(t * 0.25) * z * 0.05), ey - (mood === 'look' ? z * 0.05 : 0), z * 0.1, 0, Math.PI * 2), ctx.fill());
  }
  ctx.fillStyle = '#e23b4e';
  if (mood === 'wow') (ctx.beginPath(), ctx.ellipse(0, hy + z * 0.55, z * 0.2, z * 0.28, 0, 0, Math.PI * 2), ctx.fill());
  else if (mood === 'sad') (ctx.lineWidth = z * 0.14), (ctx.strokeStyle = '#e23b4e'), ctx.beginPath(), ctx.arc(0, hy + z * 0.75, z * 0.3, Math.PI * 1.15, Math.PI * 1.85), ctx.stroke();
  else (ctx.beginPath(), ctx.arc(0, hy + z * 0.3, z * (mood === 'laugh' ? 0.42 : 0.34), 0.15, Math.PI - 0.15), ctx.fill());
  // 빨간 코
  const ng = ctx.createRadialGradient(-z * 0.08, hy + z * 0.02, z * 0.03, 0, hy + z * 0.08, z * 0.24);
  ng.addColorStop(0, '#ffb3b3');
  ng.addColorStop(1, '#e8173a');
  ctx.fillStyle = ng;
  ctx.beginPath();
  ctx.arc(0, hy + z * 0.08, z * 0.24, 0, Math.PI * 2);
  ctx.fill();
  // 저글링 공: 평소엔 손 위로 돌고, 깜짝 놀라면 떨어져 머리에 '퉁'
  const balls = ['#ff5d5d', '#ffe14d', '#6ee06e'];
  for (let q = 0; q < 3; q++) {
    let bx: number, by: number;
    if (mood === 'juggle' || mood === 'look') {
      const ph = (t * 0.035 + q / 3) % 1, from = ph < 0.5 ? hands[0] : hands[1], to = ph < 0.5 ? hands[1] : hands[0], u = (ph % 0.5) * 2;
      bx = from[0] + (to[0] - from[0]) * u;
      by = from[1] + (to[1] - from[1]) * u - Math.sin(u * Math.PI) * z * 2.3;
    } else {
      const fall = Math.min(1, age / 26);
      bx = (q - 1) * z * 1.1 + (q === 1 ? 0 : (q - 1) * fall * z * 0.8);
      by = -z * 7 + fall * (q === 1 ? z * 1.55 : z * 6.7) - (q === 1 && age > 26 ? Math.abs(Math.sin((age - 26) * 0.25)) * z * 0.9 * Math.exp(-(age - 26) / 30) : 0);
    }
    ctx.fillStyle = balls[q];
    ctx.beginPath();
    ctx.arc(bx, by, z * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.arc(bx - z * 0.08, by - z * 0.08, z * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** 트램펄린 (가운데 = (x, y)). dip = 매트가 눌린 정도, glow = 지금 떨어지면 받을 수 있음 */
function drawTramp(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, dip: number, glow: boolean) {
  const ry = rx * 0.26, th = rx * 0.12;
  ctx.fillStyle = 'rgba(30,50,20,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + ry + th * 1.6, rx * 1.05, ry * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3b3f4a';
  ctx.lineWidth = Math.max(2, rx * 0.06);
  for (const q of [-0.8, -0.3, 0.3, 0.8]) {
    ctx.beginPath();
    ctx.moveTo(x + q * rx, y + Math.sqrt(1 - q * q) * ry * 0.9);
    ctx.lineTo(x + q * rx * 1.05, y + Math.sqrt(1 - q * q) * ry * 0.9 + th * 2.6);
    ctx.stroke();
  }
  // 테 두께 (앞쪽 옆면)
  ctx.fillStyle = '#b8283c';
  ctx.beginPath();
  ctx.ellipse(x, y + th, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, y);
  ctx.ellipse(x, y, rx, ry, 0, Math.PI, 0, true);
  ctx.fill();
  ctx.fillStyle = '#ff4d5e';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  // 노랑 덧대기
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = ry * 0.32;
  ctx.setLineDash([rx * 0.22, rx * 0.16]);
  ctx.beginPath();
  ctx.ellipse(x, y, rx * 0.91, ry * 0.86, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  // 매트
  const mg = ctx.createRadialGradient(x, y + dip * ry, 0, x, y, rx * 0.8);
  mg.addColorStop(0, '#1d2a5a');
  mg.addColorStop(1, '#2f3f7f');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.ellipse(x, y + dip * ry * 0.5, rx * 0.78, ry * 0.68, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y + dip * ry * 0.5, rx * 0.5, ry * 0.42, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (glow) {
    ctx.save();
    ctx.shadowColor = '#7dff9a';
    ctx.shadowBlur = rx * 0.4;
    ctx.strokeStyle = 'rgba(125,255,154,.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.04, ry * 1.08, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: PopState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w, t = s.t;
  const L = s.L, n = L.bs.length, st = s.st, stage = s.stage, pal = SKY[Math.min(SKY.length - 1, stage)], dusk = DUSK[Math.min(DUSK.length - 1, stage)];
  const night = clamp01((stage - 5) / 1.5), HZ = 0.985, HB = 0.085, BOT = 1.325;
  posAll(L, st);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 36 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 3); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 16) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), Math.max(Y(HB) + size + R(0.1), y), text, col, size);
  };
  const recent = (kind: string, within: number) => {
    for (let k = s.events.length - 1; k >= 0; k--) if (s.events[k].kind === kind && s.t - s.events[k].t < within) return s.events[k];
    return null;
  };

  const TOP = playTop(w, h), BOTX = Math.max(0, h - w * A) - TOP;
  ctx.save();
  fx.begin(ctx);
  ctx.translate(0, TOP);
  // ══ 하늘 (세로 화면이면 위로 늘어난다) ══
  const sky = ctx.createLinearGradient(0, -TOP, 0, Y(HZ));
  sky.addColorStop(0, pal[0]);
  sky.addColorStop(1, pal[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -TOP - 10, w + 20, Y(HZ) + TOP + 12);
  if (night > 0)
    for (let k = 0; k < 40 + Math.round(TOP / 8); k++) {
      ctx.fillStyle = `rgba(255,255,255,${night * (0.3 + 0.6 * Math.abs(Math.sin(t / 37 + k * 1.7)))})`;
      ctx.fillRect(hsh(k) * w, -TOP + hsh(k + 50) * (TOP + Y(HB + 0.6)), 1.6, 1.6);
    }
  // 늘어난 위 하늘: 높은 구름 띠 (풍선과 겨루지 않게 옅게)
  for (let k = 0; k < Math.round(TOP / 60); k++) {
    const cy = -TOP + (k + 0.6) * 60, cx = ((hsh(k + 90) * 1.4 + t * 0.00012 * (1 + k * 0.3)) % 1.4 - 0.2) * w;
    ctx.fillStyle = `rgba(255,255,255,${0.18 - night * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, R(0.16 + hsh(k) * 0.1), R(0.025), 0, 0, Math.PI * 2);
    ctx.ellipse(cx + R(0.1), cy - R(0.012), R(0.09), R(0.03), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  {
    // 해 → 노을 해 → 달
    const p = stage / (STAGE_COUNT - 1), sx = X(0.82 - 0.55 * p), sy = Y(0.2 + 0.25 * Math.sin(p * Math.PI * 0.5) * (1 - night) + night * 0.0);
    ctx.save();
    ctx.shadowColor = night > 0.5 ? '#e8e4ff' : dusk > 0.3 ? '#ff8a5a' : '#fff2a8';
    ctx.shadowBlur = R(0.12);
    ctx.fillStyle = night > 0.5 ? '#f4f1ff' : dusk > 0.3 ? '#ffc27a' : '#fff7c8';
    ctx.beginPath();
    ctx.arc(sx, sy, R(night > 0.5 ? 0.04 : 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (night > 0.5) {
      ctx.fillStyle = 'rgba(180,170,220,.5)';
      ctx.beginPath();
      ctx.arc(sx - R(0.012), sy - R(0.008), R(0.009), 0, Math.PI * 2);
      ctx.arc(sx + R(0.014), sy + R(0.012), R(0.006), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 무지개 (큰 연쇄 뒤)
  for (const e of s.events) {
    if (e.kind !== 'chainEnd' || (e.v ?? 0) < 7) continue;
    const age = s.t - e.t, a = Math.min(1, age / 12) * Math.max(0, 1 - age / 125);
    for (let q = 0; q < 6; q++) {
      ctx.strokeStyle = rgba(RAINBOW[q], 0.55 * a);
      ctx.lineWidth = R(0.022);
      ctx.beginPath();
      ctx.arc(X(0.5), Y(1.0), R(0.62 - q * 0.022), Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
  }
  // 구름층: 높은 구름 (천천히 흐른다)
  const cl = mix('#ffffff', pal[2], 0.15 + dusk * 0.5), cs = mix(pal[2], '#3a3060', dusk * 0.4);
  for (let k = 0; k < 4; k++) {
    const cx = ((hsh(k + 7) + t * 0.00004 * (1 + k * 0.4)) % 1.4) - 0.2, cy = 0.17 + hsh(k + 3) * 0.32;
    puff(ctx, X(cx), Y(cy), R(0.05 + hsh(k) * 0.03), cl, cs, 0.55 - night * 0.25);
  }
  // 바람: 하늘을 가로지르는 바람 줄기
  const windy = L.bs.some((b) => b.vx > 0);
  if (windy) {
    ctx.strokeStyle = 'rgba(255,255,255,.45)';
    ctx.lineCap = 'round';
    for (let k = 0; k < 16; k++) {
      const yy = 0.14 + hsh(k + 90) * 0.75, sp = 0.004 + (0.9 - yy) * 0.006, xx = ((hsh(k + 33) + t * sp) % 1.5) - 0.25, ln = 0.06 + (0.9 - yy) * 0.1;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(xx), Y(yy));
      ctx.quadraticCurveTo(X(xx + ln * 0.5), Y(yy - 0.008), X(xx + ln), Y(yy));
      ctx.stroke();
    }
  }
  // 지평선 구름 둑
  for (let k = 0; k < 9; k++) puff(ctx, X(-0.06 + k * 0.14 + Math.sin(t * 0.004 + k) * 0.01), Y(0.9 + hsh(k + 20) * 0.03), R(0.075 + hsh(k + 11) * 0.03), cl, cs, 0.9 - night * 0.3);
  // 먼 언덕
  ctx.fillStyle = mix('#9fd29a', '#3c3f6a', dusk);
  ctx.beginPath();
  ctx.moveTo(-10, Y(HZ + 0.01));
  for (let x = -0.02; x <= 1.03; x += 0.03) ctx.lineTo(X(x), Y(0.95 - 0.02 * Math.sin(x * 6 + 1) - 0.012 * Math.sin(x * 15)));
  ctx.lineTo(w + 10, Y(HZ + 0.01));
  ctx.fill();
  // 대관람차 (천천히 돈다)
  {
    const cx = X(0.77), cy = Y(0.83), rr = R(0.12), rot = t * 0.004, col = mix('#f4f0ff', '#8a80b8', dusk * 0.7);
    ctx.strokeStyle = mix('#c9c1e6', '#5a5288', dusk);
    ctx.lineWidth = R(0.008);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - rr * 0.6, Y(HZ + 0.01));
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + rr * 0.6, Y(HZ + 0.01));
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = R(0.005);
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, Math.PI * 2);
    for (let q = 0; q < 8; q++) (ctx.moveTo(cx, cy), ctx.lineTo(cx + Math.cos(rot + (q * Math.PI) / 4) * rr, cy + Math.sin(rot + (q * Math.PI) / 4) * rr));
    ctx.stroke();
    for (let q = 0; q < 8; q++) {
      const gx = cx + Math.cos(rot + (q * Math.PI) / 4) * rr, gy = cy + Math.sin(rot + (q * Math.PI) / 4) * rr;
      ctx.fillStyle = night > 0.3 ? rgba(RAINBOW[q % 7], 0.9) : mix(RAINBOW[q % 7], '#ffffff', 0.35);
      ctx.beginPath();
      ctx.roundRect(gx - R(0.012), gy, R(0.024), R(0.02), R(0.005));
      ctx.fill();
    }
  }
  // 롤러코스터 (왼쪽 뒤)
  {
    ctx.strokeStyle = mix('#e9b8c8', '#5a4a80', dusk);
    ctx.lineWidth = R(0.006);
    ctx.beginPath();
    for (let x = 0; x <= 0.42; x += 0.01) ctx.lineTo(X(x), Y(0.9 - 0.05 * Math.abs(Math.sin(x * 9))));
    ctx.stroke();
    ctx.lineWidth = R(0.003);
    for (let x = 0.02; x <= 0.42; x += 0.04) (ctx.beginPath(), ctx.moveTo(X(x), Y(0.9 - 0.05 * Math.abs(Math.sin(x * 9)))), ctx.lineTo(X(x), Y(HZ)), ctx.stroke());
    const cx2 = ((t * 0.0015) % 0.5) - 0.04;
    ctx.fillStyle = mix('#ff6b8b', '#a05080', dusk);
    if (cx2 > 0 && cx2 < 0.42) (ctx.beginPath(), ctx.arc(X(cx2), Y(0.895 - 0.05 * Math.abs(Math.sin(cx2 * 9))), R(0.009), 0, Math.PI * 2), ctx.fill());
  }
  // ══ 놀이공원 땅 ══
  {
    const gg = ctx.createLinearGradient(0, Y(HZ), 0, Y(BOT));
    gg.addColorStop(0, mix('#8fd27a', '#2f4a4a', dusk * 0.9));
    gg.addColorStop(1, mix('#5fb357', '#24383a', dusk * 0.9));
    ctx.fillStyle = gg;
    ctx.fillRect(-10, Y(HZ), w + 20, Y(BOT - HZ) + 2);
    // 늘어난 아래 광장 (세로 화면)
    if (BOTX > 0) (ctx.fillStyle = mix('#5fb357', '#24383a', dusk * 0.9)), ctx.fillRect(-10, Y(BOT), w + 20, BOTX + 2);
    // 광장 (밝은 바닥 타일)
    ctx.fillStyle = mix('#f3e3c0', '#5a5070', dusk * 0.8);
    ctx.beginPath();
    ctx.ellipse(X(0.48), Y(1.215), R(0.4), R(0.085), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = mix('#e0cc9e', '#4a4060', dusk * 0.8);
    ctx.lineWidth = 1;
    for (let q = 1; q < 4; q++) (ctx.beginPath(), ctx.ellipse(X(0.48), Y(1.215), R(0.4 * q / 4), R(0.085 * q / 4), 0, 0, Math.PI * 2), ctx.stroke());
    // 덤불
    for (let k = 0; k < 14; k++) {
      const bx = X(hsh(k + 60) * 1.0), by = Y(HZ + 0.006);
      ctx.fillStyle = mix('#5aa34a', '#1f3436', dusk);
      ctx.beginPath();
      ctx.arc(bx, by, R(0.022 + hsh(k) * 0.012), Math.PI, 0);
      ctx.fill();
    }
  }
  // 서커스 천막 (왼쪽 뒤) · 솜사탕 가게 (오른쪽 뒤)
  {
    const tx0 = X(0.14), ty0 = Y(1.065), tw0 = R(0.11);
    ctx.fillStyle = 'rgba(20,40,20,.25)';
    ctx.beginPath();
    ctx.ellipse(tx0, ty0, tw0 * 1.05, R(0.016), 0, 0, Math.PI * 2);
    ctx.fill();
    for (let q = 0; q < 6; q++) {
      ctx.fillStyle = mix(q % 2 ? '#ffffff' : '#ff4d6d', '#3a3060', dusk * 0.6);
      ctx.fillRect(tx0 - tw0 + (q * tw0) / 3, ty0 - R(0.055), tw0 / 3 + 0.5, R(0.055));
    }
    ctx.fillStyle = mix('#5a2a40', '#1a1020', dusk);
    ctx.beginPath();
    ctx.moveTo(tx0 - R(0.02), ty0);
    ctx.lineTo(tx0, ty0 - R(0.04));
    ctx.lineTo(tx0 + R(0.02), ty0);
    ctx.fill();
    for (let q = 0; q < 6; q++) {
      ctx.fillStyle = mix(q % 2 ? '#ffffff' : '#ff4d6d', '#3a3060', dusk * 0.5);
      ctx.beginPath();
      ctx.moveTo(X(0.14), ty0 - R(0.12));
      ctx.lineTo(tx0 - tw0 * 1.08 + (q * tw0 * 2.16) / 6, ty0 - R(0.055));
      ctx.lineTo(tx0 - tw0 * 1.08 + ((q + 1) * tw0 * 2.16) / 6, ty0 - R(0.055));
      ctx.fill();
    }
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(0.14), ty0 - R(0.12));
    ctx.lineTo(X(0.14), ty0 - R(0.15));
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(X(0.14), ty0 - R(0.15));
    ctx.lineTo(X(0.14) + R(0.03) + Math.sin(t * 0.15) * R(0.004), ty0 - R(0.14));
    ctx.lineTo(X(0.14), ty0 - R(0.13));
    ctx.fill();
    // 솜사탕 가게
    const kx = X(0.6), ky = Y(1.05);
    ctx.fillStyle = 'rgba(20,40,20,.25)';
    ctx.beginPath();
    ctx.ellipse(kx, ky + R(0.004), R(0.06), R(0.012), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = mix('#ffe9f2', '#5a4a70', dusk * 0.6);
    ctx.fillRect(kx - R(0.05), ky - R(0.04), R(0.1), R(0.04));
    for (let q = 0; q < 5; q++) {
      ctx.fillStyle = mix(q % 2 ? '#ffffff' : '#4fb6ff', '#3a3060', dusk * 0.5);
      ctx.beginPath();
      ctx.moveTo(kx - R(0.06) + q * R(0.024), ky - R(0.04));
      ctx.lineTo(kx - R(0.06) + (q + 1) * R(0.024), ky - R(0.04));
      ctx.lineTo(kx - R(0.06) + (q + 1) * R(0.024), ky - R(0.065));
      ctx.lineTo(kx - R(0.06) + q * R(0.024), ky - R(0.065));
      ctx.fill();
    }
    ctx.fillStyle = '#ffb3d9';
    for (const q of [-0.025, 0.002, 0.028]) (ctx.beginPath(), ctx.arc(kx + R(q), ky - R(0.074), R(0.012), 0, Math.PI * 2), ctx.fill());
  }
  // 줄깃발 (바람이면 세게 펄럭, 밤엔 전구)
  {
    const wind = L.bs.some((b) => b.vx > 0) ? 1 : 0;
    ctx.strokeStyle = mix('#7a5a3a', '#2a2030', dusk);
    ctx.lineWidth = R(0.007);
    for (const px0 of [0.03, 0.97]) (ctx.beginPath(), ctx.moveTo(X(px0), Y(HZ + 0.02)), ctx.lineTo(X(px0), Y(0.945)), ctx.stroke());
    if (wind) {
      // 풍향 자루 (왼쪽 기둥, 바람 부는 쪽으로)
      for (let q = 0; q < 4; q++) {
        ctx.fillStyle = q % 2 ? '#ffffff' : '#ff5d5d';
        const x0 = X(0.03) + q * R(0.022), fl = Math.sin(t * 0.4 + q) * R(0.003);
        ctx.beginPath();
        ctx.moveTo(x0, Y(0.94) - R(0.012 - q * 0.002) + fl);
        ctx.lineTo(x0 + R(0.022), Y(0.94) - R(0.01 - q * 0.002) + fl);
        ctx.lineTo(x0 + R(0.022), Y(0.94) + R(0.01 - q * 0.002) + fl);
        ctx.lineTo(x0, Y(0.94) + R(0.012 - q * 0.002) + fl);
        ctx.fill();
      }
    }
    const yAt = (x: number) => 0.95 + 0.035 * Math.sin(((x - 0.03) / 0.94) * Math.PI);
    ctx.strokeStyle = 'rgba(80,60,60,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0.03; x <= 0.971; x += 0.02) ctx.lineTo(X(x), Y(yAt(x)));
    ctx.stroke();
    for (let q = 0; q < 16; q++) {
      const x = 0.06 + q * 0.058, y = yAt(x), fl = Math.sin(t * (0.1 + wind * 0.25) + q) * R(0.005 + wind * 0.008);
      ctx.fillStyle = mix(RAINBOW[q % 7], '#30305a', dusk * 0.5);
      ctx.beginPath();
      ctx.moveTo(X(x - 0.018), Y(y));
      ctx.lineTo(X(x + 0.018), Y(y));
      ctx.lineTo(X(x) + fl + wind * R(0.012), Y(y + 0.035));
      ctx.fill();
      if (night > 0.2) {
        ctx.save();
        ctx.shadowColor = '#ffe9a0';
        ctx.shadowBlur = R(0.03);
        ctx.fillStyle = `rgba(255,236,160,${night * (0.6 + 0.4 * Math.sin(t * 0.1 + q))})`;
        ctx.beginPath();
        ctx.arc(X(x + 0.029), Y(yAt(x + 0.029)), R(0.006), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
  // 트램펄린 · 받을 수 있나 (맨몸 동물의 떨어질 줄)
  const tr = L.tramp;
  let glow = false;
  const intro = s.phase === 'intro' ? 1 - Math.pow(1 - Math.min(1, s.pt / INTRO), 3) : 1;
  const yOf = (i: number) => SY[i] + (1 - intro) * (0.75 + hsh(i) * 0.35);
  for (let i = 0; i < n; i++) {
    const b = L.bs[i];
    if (s.alive[i] !== 1 || b.an < 0 || b.um || !tr) continue;
    const on = Math.abs(SX[i] - tr.x) <= tr.w / 2;
    if (on) glow = true;
    ctx.strokeStyle = on ? 'rgba(90,255,130,.95)' : 'rgba(255,90,120,.7)';
    ctx.lineWidth = on ? 2.6 : 1.8;
    ctx.setLineDash([R(0.012), R(0.012)]);
    ctx.beginPath();
    ctx.moveTo(X(SX[i]), Y(yOf(i) + HANG + 0.07));
    ctx.lineTo(X(SX[i]), Y(GY));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = on ? 'rgba(125,255,154,.9)' : 'rgba(255,120,120,.75)';
    ctx.beginPath();
    ctx.ellipse(X(SX[i]), Y(GY + 0.004), R(0.016), R(0.005), 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (tr) {
    let dip = 0;
    for (const f of s.falls)
      if (f.done && f.ok && !f.um) {
        const a = st - f.t0 - f.dur;
        dip = Math.max(dip, Math.abs(Math.sin(a * 0.2)) * Math.exp(-a / 40));
      }
    drawTramp(ctx, X(tr.x), Y(GY), R(tr.w / 2), dip, glow);
  }

  // ══ 반경 원 — 2단 (C004, ART §4): 평소엔 조용히(많으면 짧은 호 꼬리만), 가리킨 풍선은 선명하게 + 첫 파문에 같이 터질 풍선 '헉' ══
  const hidden = (i: number) => s.clouds.some((c) => c.gone < 0 && ((SX[i] - c.x) / c.rx) ** 2 + ((SY[i] - c.y) / c.ry) ** 2 < 0.85);
  let busy = false, shown = 0;
  for (let i = 0; i < n; i++) if (s.alive[i] === 1) (s.popT[i] >= 0 && (busy = true)), L.bs[i].k !== IRON && !hidden(i) && shown++;
  const peeking = s.peek >= 0 && s.alive[s.peek] === 1 && st - s.peekAt < PEEK_T;
  // 가리킨 풍선(마우스·키보드)이 먼저, 빈 곳을 가리키면 살펴보기
  const ff = view.focus ? pick(s, view.focus.x, view.focus.y * A) : -1;
  const fi = s.phase !== 'play' || busy || s.taps <= 0 ? -1 : ff >= 0 ? ff : peeking ? s.peek : -1;
  const ripple = new Set<number>();
  if (fi >= 0 && L.bs[fi].k !== IRON) for (let k = 0; k < n; k++) if (k !== fi && s.alive[k] === 1 && st < L.bs[k].esc && delay(L, fi, k)) ripple.add(k);
  const tails = shown > 10;
  // 1판 첫 톡 전: 손가락 풍선(0번)은 온전한 원 — 1판엔 큰 풍선이 없어 판 시작에 온전한 원이 하나도 없게 되므로 (CONTENT v0.3)
  const lead = stage === 0 && s.used === 0 && s.tries === 0 && fi < 0 && s.phase === 'play';
  for (let i = 0; i < n; i++) {
    const b = L.bs[i];
    if (s.alive[i] !== 1 || b.k === IRON || hidden(i)) continue;
    const x = X(SX[i]), y = Y(yOf(i)), col = b.k === KING ? '#c77dff' : colOf(b), fused = s.popT[i] >= 0, rr = R(reachOf(b)), on = i === fi || (lead && i === 0);
    const a = (fused || on ? 1 : fi >= 0 ? 0.2 : 0.35) * intro;
    ctx.setLineDash(fused || on ? [] : [R(0.014), R(0.01)]);
    ctx.strokeStyle = rgba(mix(col, night > 0.5 ? '#ffffff' : '#3a2a6a', 0.12), a);
    ctx.fillStyle = rgba(col, (fused ? 0.16 : on ? 0.14 : 0.04) * intro);
    ctx.lineWidth = fused || on ? 2.4 : 1.6;
    if (tails && !fused && !on && b.k !== FIRE && b.k !== KING && b.sz < 2) {
      // 원이 많으면 작은·보통 풍선은 둘레의 짧은 호 넷만 — 하늘이 거미줄처럼 안 보이게. 큰 풍선·대왕은 늘 온전한 원(판 시작에도 '큰 풍선 = 큰 원'이 읽히게, C005)
      ctx.strokeStyle = rgba(mix(col, night > 0.5 ? '#ffffff' : '#3a2a6a', 0.12), (fi >= 0 ? 0.3 : 0.6) * intro);
      ctx.lineWidth = 2;
      ctx.setLineDash([]); // 짧은 호는 실선 — 점선이면 점 2~3개로 끊겨 꽃가루처럼 보인다 (C005 🧪)
      ctx.beginPath();
      // 둘·각 60° — 원 모양이 남게 (FUN v1.5). 물풍선은 아래쪽 하나만
      for (let q = 0; q < 2; q++) {
        if (b.k === WATER && q === 1) continue;
        const a0 = Math.PI / 4 + q * Math.PI - Math.PI / 6;
        ctx.moveTo(x + rr * Math.cos(a0), y + rr * Math.sin(a0));
        ctx.arc(x, y, rr, a0, a0 + Math.PI / 3);
      }
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    if (b.k === FIRE) {
      ctx.rect(-10, y - R(FIRE_BAND), w + 20, R(FIRE_BAND * 2));
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, y - R(FIRE_BAND));
      ctx.lineTo(w + 10, y - R(FIRE_BAND));
      ctx.moveTo(-10, y + R(FIRE_BAND));
      ctx.lineTo(w + 10, y + R(FIRE_BAND));
      ctx.stroke();
      ctx.fillStyle = rgba('#ff8a3d', a);
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(x + sd * R(0.1), y - R(0.018));
        ctx.lineTo(x + sd * R(0.135), y);
        ctx.lineTo(x + sd * R(0.1), y + R(0.018));
        ctx.fill();
      }
    } else if (b.k === WATER) {
      ctx.moveTo(x - rr, y);
      ctx.arc(x, y, rr, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.arc(x, y, rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);
  // 불꽃 줄: 터진 풍선 → 다음 박자에 터질 풍선
  for (let i = 0; i < n; i++) {
    if (s.alive[i] !== 1 || s.popT[i] < 0 || s.src[i] < 0) continue;
    const f = clamp01((st - s.srcT[i]) / Math.max(1, s.popT[i] - s.srcT[i])), x0 = X(s.srcX[i]), y0 = Y(s.srcY[i]), x1 = X(SX[i]), y1 = Y(SY[i]);
    const fire = L.bs[s.src[i]].k === FIRE;
    ctx.strokeStyle = fire ? 'rgba(255,190,90,.7)' : 'rgba(255,255,255,.55)';
    ctx.lineWidth = fire ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * Math.max(0, f - 0.5), y0 + (y1 - y0) * Math.max(0, f - 0.5));
    ctx.lineTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f);
    ctx.stroke();
    ctx.save();
    ctx.shadowColor = fire ? '#ff9a3d' : '#fff6a8';
    ctx.shadowBlur = R(0.03);
    ctx.fillStyle = fire ? '#ffd166' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f, R(0.009), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // 폭죽 줄기
  for (const e of s.events) {
    if (e.kind !== 'fire') continue;
    const age = s.t - e.t;
    if (age > 26) continue;
    const g2 = ctx.createLinearGradient(0, Y(e.y) - R(0.02), 0, Y(e.y) + R(0.02));
    g2.addColorStop(0, 'rgba(255,200,80,0)');
    g2.addColorStop(0.5, `rgba(255,240,180,${0.8 * (1 - age / 26)})`);
    g2.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g2;
    const spread = Math.min(1, age / 10);
    ctx.fillRect(X(e.x) - spread * w, Y(e.y) - R(0.02), spread * w * 2, R(0.04));
  }

  // 살펴보기 중: 누르면 톡이 되는 자리(누름 판정 원)를 옅게 — 그 밖 빈 하늘은 살펴보기 (C008 🧪 ⑤1)
  if (peeking && fi === s.peek) {
    const k = 1 - (st - s.peekAt) / PEEK_T, p0 = s.peek;
    ctx.save();
    ctx.setLineDash([R(0.006), R(0.008)]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = `rgba(255,255,255,${(0.55 * k).toFixed(3)})`;
    for (let i = 0; i < n; i++) if (s.alive[i] === 1 && Math.hypot(SX[i] - SX[p0], SY[i] - SY[p0]) < 0.3) ctx.beginPath(), ctx.arc(X(SX[i]), Y(SY[i]), R(hitR(L.bs[i])), 0, Math.PI * 2), ctx.stroke();
    ctx.restore();
  }
  // ══ 흔들 레일 · 다리 밧줄 (C007, ART §11) — 답이 아니라 범위·연결만 ══
  {
    const first = s.tries === 0 && s.used === 0, quiet = busy || fi >= 0 ? 0.5 : 1, ink = night > 0.5 ? '#fffaf2' : '#3a2a6a';
    // 첫 강조는 판 시작 토스트(놀이 70틱)가 걷힌 뒤 20틱에 걸쳐 (C008 🧪 ②)
    const emph = first ? clamp01((st - 70) / 20) : 0;
    // 흔들 레일: 흔들 무리마다 무리 아래 짧은 줄 + 무리와 같이 움직이는 추. 두 무리면 마주 보는 끝 ›‹가 거리만큼 진해진다
    const rails: { cx: number; ax: number; ph: number; ry: number; bob: number }[] = [];
    for (const c of [...new Set(L.bs.filter((b, i) => b.ax > 0 && b.an < 0 && s.alive[i] === 1).map((b) => b.cl))]) {
      const mem = L.bs.filter((b, i) => b.cl === c && s.alive[i] === 1);
      const cx = mem.reduce((a, b) => a + b.x0, 0) / mem.length, ax = mem[0].ax, ph = mem[0].ph;
      const ry = Math.min(GY - 0.06, Math.max(...mem.map((b) => b.y0 + BR[b.sz] * 1.17)) + 0.085);
      rails.push({ cx, ax, ph, ry, bob: cx + ax * Math.sin(st * SWAY_W + ph) });
    }
    ctx.save();
    ctx.lineCap = 'round';
    for (const rl of rails) {
      ctx.strokeStyle = rgba(ink, (0.45 + 0.2 * emph) * quiet * intro);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(rl.cx - rl.ax), Y(rl.ry));
      ctx.lineTo(X(rl.cx + rl.ax), Y(rl.ry));
      for (const e of [-1, 1]) ctx.moveTo(X(rl.cx + e * rl.ax), Y(rl.ry) - R(0.01)), ctx.lineTo(X(rl.cx + e * rl.ax), Y(rl.ry) + R(0.01));
      ctx.stroke();
      ctx.fillStyle = rgba(ink, 0.7 * quiet * intro);
      ctx.beginPath();
      ctx.arc(X(rl.bob), Y(rl.ry), R(0.009), 0, Math.PI * 2);
      ctx.fill();
    }
    if (rails.length === 2 && !s.helped) {
      const [p, q] = rails[0].cx < rails[1].cx ? rails : [rails[1], rails[0]], D = q.cx - p.cx, gap = q.bob - p.bob;
      const gmin = D - p.ax - q.ax, gmax = D + p.ax + q.ax, k = clamp01((gmax - gap) / Math.max(1e-6, gmax - gmin));
      ctx.strokeStyle = rgba(ink, (0.15 + 0.4 * k) * quiet * intro);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [rl, dir] of [[p, 1], [q, -1]] as const) {
        const ex = X(rl.cx + dir * rl.ax) + dir * R(0.012), ey = Y(rl.ry), arm = R(0.014);
        ctx.moveTo(ex, ey - arm), ctx.lineTo(ex + dir * arm, ey), ctx.lineTo(ex, ey + arm);
      }
      ctx.stroke();
    }
    // 다리 밧줄: 다리 풍선에서 양 끝 풍선까지 처진 줄 두 가닥 (갈색 = 판에 묶인 연결)
    L.bs.forEach((b, i) => {
      if (!b.bt || s.alive[i] !== 1) return;
      for (const j of b.bt) {
        if (s.alive[j] !== 1) continue;
        const x1 = X(SX[i]), y1 = Y(SY[i]), x2 = X(SX[j]), y2 = Y(SY[j]), len = Math.hypot(x2 - x1, y2 - y1), sag = len * 0.1 + Math.sin(t * 0.05) * R(0.003);
        const ux = (x2 - x1) / len, uy = (y2 - y1) / len, ra = R(brOf(b)), rb = R(brOf(L.bs[j]));
        const ax0 = x1 + ux * ra, ay0 = y1 + uy * ra, bx0 = x2 - ux * rb, by0 = y2 - uy * rb, mx = (ax0 + bx0) / 2, my = (ay0 + by0) / 2 + sag;
        const layers: [number, string, number[]][] = [[3.5, 'rgba(243,221,179,.45)', []], [first ? 2.5 : 2, first ? 'rgba(122,78,42,.9)' : 'rgba(122,78,42,.75)', [R(0.012), R(0.008)]]];
        for (const [wd, col, dash] of layers) {
          ctx.setLineDash(dash);
          ctx.strokeStyle = col;
          ctx.lineWidth = wd;
          ctx.beginPath();
          ctx.moveTo(ax0, ay0);
          ctx.quadraticCurveTo(mx, my, bx0, by0);
          ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.fillStyle = '#7a4e2a';
        for (const [kx, ky] of [[ax0, ay0], [bx0, by0]]) ctx.beginPath(), ctx.arc(kx, ky, R(0.006), 0, Math.PI * 2), ctx.fill();
      }
    });
    ctx.restore();
  }

  // ══ 풍선 · 매달린 동물 ══
  const order = [...Array(n).keys()].sort((a, b) => L.bs[a].y0 - L.bs[b].y0);
  for (const i of order) {
    const b = L.bs[i];
    if (s.alive[i] !== 1 || hidden(i)) continue;
    const fused = s.popT[i] >= 0 ? clamp01(1 - (s.popT[i] - st) / BEAT) : 0;
    const shake = fused ? Math.sin(t * 2.1 + i) * R(0.004) * (0.5 + fused) : 0;
    const x = X(SX[i]) + shake, y = Y(yOf(i)), r = R(brOf(b)) * (1 + fused * 0.12), ry = r * 1.17;
    const sw = Math.sin(t * 0.05 + i) * 0.06 + (b.vx ? 0.12 : 0) + (b.ax ? Math.cos(st * SWAY_W + b.ph) * -0.12 : 0);
    // 줄
    ctx.strokeStyle = night > 0.5 ? 'rgba(255,255,255,.6)' : 'rgba(80,60,110,.55)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y + ry * 1.12);
    const len = b.an >= 0 ? R(HANG) - ry * 1.1 - R(0.036) : R(0.065);
    for (let q = 1; q <= 6; q++) ctx.lineTo(x + Math.sin(t * 0.08 + q * 0.9 + i) * R(0.004) * (q / 6) - sw * len * (q / 6), y + ry * 1.12 + (len * q) / 6);
    ctx.stroke();
    if (b.an >= 0) {
      const ax = x - sw * len, ay = y + R(HANG) + R(0.012), onTr = !b.um && !!tr && Math.abs(SX[i] - tr.x) <= tr.w / 2;
      if (b.um) {
        // 접은 우산을 등에 메고
        ctx.strokeStyle = '#ff5d7a';
        ctx.lineWidth = R(0.008);
        ctx.beginPath();
        ctx.moveTo(ax + R(0.02), ay - R(0.01));
        ctx.lineTo(ax + R(0.035), ay + R(0.045));
        ctx.stroke();
      }
      drawAnimal(ctx, ax, ay, R(0.03), b.an, fused ? 'wow' : onTr ? 'happy' : b.um ? 'calm' : 'scared', t + i * 13, 'hold', false, sw * 0.6);
    }
    if (b.vx > 0) {
      // 속도선: 빠를수록 길게
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.6;
      for (const q of [-0.5, 0, 0.5]) {
        const ln = R(b.vx * 60);
        ctx.beginPath();
        ctx.moveTo(x - r * 1.25, y + q * r);
        ctx.lineTo(x - r * 1.25 - ln * (1 - Math.abs(q) * 0.6), y + q * r);
        ctx.stroke();
      }
    }
    drawBalloon(ctx, x, y, r, colOf(b), b.k, t + i * 7, fused, sw * 0.5, b.sz);
    // 다리 풍선: 몸에 두 끝 풍선을 잇는 사선 밧줄 띠 — 가닥이 짧아도 '두 무리를 묶은 풍선'으로 (ART §11.1, C008 🧪 ⑤3)
    if (b.bt) {
      const [p, q] = b.bt, ang = Math.atan2(SY[q] - SY[p], SX[q] - SX[p]);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.98, r * 0.98, 0, 0, Math.PI * 2);
      ctx.clip();
      for (const [wd, col, dash] of [[r * 0.34, 'rgba(243,221,179,.6)', []], [r * 0.16, 'rgba(122,78,42,.9)', [r * 0.22, r * 0.12]]] as [number, string, number[]][]) (ctx.lineWidth = wd), (ctx.strokeStyle = col), ctx.setLineDash(dash), ctx.beginPath(), ctx.moveTo(-r, 0), ctx.lineTo(r, 0), ctx.stroke();
      ctx.restore();
    }
  }
  // 구름 (속에 풍선이 숨어 있다)
  for (const c of s.clouds) {
    const age = c.gone < 0 ? -1 : s.t - c.gone;
    if (age > 30) continue;
    const a = age < 0 ? 0.97 : 0.97 * (1 - age / 30), sc = age < 0 ? 1 : 1 + age / 20;
    const cx = X(c.x), cy = Y(c.y), base = R(c.rx * 0.62) * sc;
    ctx.save();
    ctx.shadowColor = 'rgba(40,40,80,.25)';
    ctx.shadowBlur = R(0.03);
    puff(ctx, cx - base * 0.55, cy + base * 0.08, base * 0.8, mix('#ffffff', pal[2], 0.1 + dusk * 0.4), mix(pal[2], '#606090', 0.3 + dusk * 0.3), a);
    puff(ctx, cx + base * 0.5, cy + base * 0.12, base * 0.78, mix('#ffffff', pal[2], 0.1 + dusk * 0.4), mix(pal[2], '#606090', 0.3 + dusk * 0.3), a);
    puff(ctx, cx, cy - base * 0.1, base, mix('#ffffff', pal[2], 0.05 + dusk * 0.4), mix(pal[2], '#606090', 0.3 + dusk * 0.3), a);
    ctx.restore();
    if (age < 0) {
      ctx.fillStyle = `rgba(110,110,160,${0.45 + 0.2 * Math.sin(t * 0.08 + c.x * 9)})`;
      ctx.font = `900 ${R(0.05)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', cx, cy);
    }
  }

  // 첫 파문 미리 보기: 가리킨 풍선을 톡 하면 첫 박자에 같이 터질 풍선 — 깜빡이는 고리와 '헉' (그 뒤 박자는 숨긴다: 고민은 남게)
  if (fi >= 0) {
    const pulse = 0.55 + 0.45 * Math.sin(t * 0.3);
    ctx.save();
    ctx.lineWidth = 2;
    for (const k of ripple) {
      const x = X(SX[k]), y = Y(SY[k]), r = R(brOf(L.bs[k])) * 1.35;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.5 * pulse})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    // 글자는 하나로 모아 가리킨 원 위에 — 화면 밖으로 잘리지 않게 (C005)
    if (ripple.size) {
      const fs = Math.max(15, R(0.042)), msg = `헉 ×${ripple.size}`;
      ctx.font = `900 ${fs}px system-ui, sans-serif`;
      // 소식 띠가 떠 있으면(살펴보기 '👀'도 소식) 띠 아래로 — 띠가 나중에 그려져 글자를 덮는다 (C007 🧪)
      const newsOn = s.news.length > 0 && s.t - s.news[0].t < NEWS_T;
      const mw = ctx.measureText(msg).width, yMin = (TOP >= HUD_TALL ? -TOP + HUD_TALL : Y(HB)) + (newsOn ? R(0.07) + fs * 0.5 + 4 : R(0.08));
      // 같이 터질 풍선들 바로 위에 (가리킨 풍선이 아니라 고리 풍선 곁, C007)
      let sx = 0, top = Infinity;
      for (const k of ripple) (sx += SX[k]), (top = Math.min(top, SY[k] - brOf(L.bs[k]) * 1.4));
      const lx = Math.max(mw / 2 + 6, Math.min(w - mw / 2 - 6, X(sx / ripple.size))), ly = Math.max(yMin, Y(top) - fs * 0.8);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(58,16,48,.9)';
      ctx.strokeText(msg, lx, ly);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(msg, lx, ly);
    }
    ctx.restore();
  }
  // ══ 떨어지는 · 내려앉은 동물 ══
  for (const f of s.falls) {
    const age = st - f.t0, z = R(0.03);
    if (!f.done) {
      const y = f.y + (GY - f.y) * clamp01(age / f.dur) - 0.045;
      if (f.um) {
        const open = Math.min(1, age / 10);
        drawUmbrella(ctx, X(f.x) + R(0.012), Y(y) - z * 0.9, z * 1.7 * open + z * 0.2, t);
        drawAnimal(ctx, X(f.x), Y(y), z, f.an, age < 12 ? 'wow' : 'happy', t, 'hold', false, Math.sin(t * 0.06) * 0.1);
      } else drawAnimal(ctx, X(f.x), Y(y), z, f.an, 'scared', t, 'flail', false, Math.sin(t * 0.3) * 0.15);
      continue;
    }
    const la = age - f.dur;
    if (f.ok && !f.um && tr) {
      const sx = X(tr.x + (f.slot % 2 ? 1 : -1) * Math.min(1, f.slot) * tr.w * 0.22 + (f.x - tr.x) * 0.15), by = Math.abs(Math.sin(la * 0.2)) * Math.exp(-la / 45) * R(0.11);
      drawAnimal(ctx, sx, Y(GY - 0.06) - by, z, f.an, 'happy', t + f.j * 9, 'up', false, Math.sin(la * 0.2) * 0.15 * Math.exp(-la / 45));
    } else if (f.ok) {
      ctx.fillStyle = 'rgba(30,50,20,.3)';
      ctx.beginPath();
      ctx.ellipse(X(f.x), Y(GY + 0.012), z * 0.9, z * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      drawAnimal(ctx, X(f.x), Y(GY - 0.045), z, f.an, 'happy', t, la % 120 < 60 ? 'up' : 'down');
    } else {
      // 엉덩방아 → 뒤집혀 버둥, 머리 위로 어질어질 별
      ctx.fillStyle = 'rgba(30,50,20,.3)';
      ctx.beginPath();
      ctx.ellipse(X(f.x), Y(GY + 0.012), z * 1.1, z * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      const sq = la < 10 ? 1 - la / 30 : 1;
      ctx.save();
      ctx.translate(X(f.x), Y(GY));
      ctx.scale(1 + (1 - sq) * 0.6, sq);
      drawAnimal(ctx, 0, -z * 1.0, z, f.an, 'dizzy', t + f.j * 5, 'flail', true, Math.sin(t * 0.25) * 0.12);
      ctx.restore();
      ctx.fillStyle = '#ffe14d';
      ctx.font = `${R(0.03)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      for (let q = 0; q < 3; q++) {
        const a = t * 0.12 + (q * Math.PI * 2) / 3;
        ctx.fillText('★', X(f.x) + Math.cos(a) * z * 1.1, Y(GY + 0.02) + Math.sin(a) * z * 0.3);
      }
    }
  }

  // ══ 구경꾼: 피에로 · 아기 곰 · 아기 토끼 ══
  {
    const big = recent('chainEnd', 110), save = recent('save', 70), flop = recent('flop', 80);
    let mood: CMood = 'juggle', age = 0;
    if (s.phase === 'result') mood = s.ok ? 'cheer' : 'sad';
    else if (big && (big.v ?? 0) >= 5) (mood = 'wow'), (age = s.t - big.t);
    else if (save || flop) mood = 'laugh';
    else if (s.chainN >= 3) mood = 'wow';
    else if (s.popT.some((p) => p >= 0)) mood = 'look';
    drawClown(ctx, X(0.875), Y(1.29), R(0.027), mood, t, age);
    if (mood === 'wow' && age < 50 && age > 22) say(X(0.875), Y(1.06), '퉁!', '#ffe14d', 13);
    const cheer = mood === 'wow' || mood === 'cheer' || mood === 'laugh';
    for (const [kx, sp, ph] of [[0.065, 1, 0], [0.16, 2, 1.7]] as [number, number, number][]) {
      const jy = cheer ? Math.abs(Math.sin(t * 0.24 + ph)) * R(0.03) : 0, gy = Y(1.3);
      ctx.fillStyle = 'rgba(30,50,20,.3)';
      ctx.beginPath();
      ctx.ellipse(X(kx), gy + R(0.006), R(0.03), R(0.009), 0, 0, Math.PI * 2);
      ctx.fill();
      // 손에 든 작은 풍선
      const hx = X(kx + 0.03), hy = gy - R(0.12) - jy;
      ctx.strokeStyle = 'rgba(255,255,255,.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(X(kx + 0.022), gy - R(0.05) - jy);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      drawBalloon(ctx, hx, hy - R(0.018), R(0.018), RAINBOW[sp * 2], NORM, t + ph * 20, 0, Math.sin(t * 0.05 + ph) * 0.1);
      drawAnimal(ctx, X(kx), gy - R(0.045) - jy, R(0.024), sp, cheer ? 'happy' : s.chainN ? 'wow' : 'calm', t + ph * 30, cheer ? 'up' : 'down');
    }
  }

  // ══ 사건 연출 ══
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y), col = e.col ?? '#ffffff', z = e.z ?? 1;
    if (e.kind === 'pop') {
      fx.burst(x, y, col, 14, 3.4, 2.8), fx.burst(x, y, '#ffffff', 5, 2, 1.5), fx.ring(x, y, col, R(e.v ?? 0.15), 2.5), fx.kick(1.2 + Math.min(3.5, z * 0.3));
      // 긴 연쇄에선 글자를 솎아 낸다 (연쇄 세기 글자가 묻히지 않게)
      if (z <= 6 || z % 3 === 0) say(x, y - R(0.055), e.text!, mix(col, '#ffffff', 0.35), 15 + Math.min(5, z));
    }
    if (e.kind === 'water') fx.burst(x, y, '#bdf0ff', 26, 4, 2.6), fx.burst(x, y + R(0.05), '#62cfff', 18, 3, 2.4), fx.ring(x, y, '#9fe3ff', R(e.v ?? 0.3), 3), fx.kick(4), say(x, y - R(0.055), e.text!, '#cdf3ff', 18);
    if (e.kind === 'fire') fx.burst(x, y, '#ffd166', 22, 4.5, 2.4), fx.burst(x, y, '#ff6a3d', 18, 4, 2.4), fx.kick(5), fx.blink('#ffe2b0', 0.12), say(x, y - R(0.055), e.text!, '#ffd166', 18);
    if (e.kind === 'king') {
      for (let q = 0; q < 7; q++) fx.burst(x, y, RAINBOW[q], 12, 6, 3);
      fx.ring(x, y, '#ffffff', R(e.v ?? 0.4), 5), fx.ring(x, y, '#ffd34d', R((e.v ?? 0.4) * 0.8), 4), fx.kick(9), fx.blink('#fff6c8', 0.3), say(x, y - R(0.07), e.text!, '#fff1a8', 22);
    }
    if (e.kind === 'tap') fx.ring(x, y, '#ffffff', R(0.07), 3);
    if (e.kind === 'clang') fx.burst(x, y, '#dfe6ee', 10, 2.5, 2), fx.kick(2.5), say(x, y - R(0.06), e.text!, col, 14);
    if (e.kind === 'miss') fx.burst(x, y, '#ffffff', 6, 1.5, 2), say(x, y - R(0.03), e.text!, col, 13);
    if (e.kind === 'save') fx.burst(x, y, '#c6ff9e', 18, 3.5, 2.6), fx.burst(x, y, '#ffe066', 12, 3, 2.4), fx.ring(x, y, '#7dff9a', R(0.1), 3), say(x, y - R(0.12), e.text!, col, 17);
    if (e.kind === 'land') fx.burst(x, y, '#ffffff', 8, 1.8, 2), say(x, y - R(0.1), e.text!, col, 14);
    if (e.kind === 'flop') fx.burst(x, y, '#c9a77a', 18, 2.6, 2.6), fx.kick(3.5), say(x, y - R(0.1), e.text!, col, 16);
    if (e.kind === 'fly') say(x, y, e.text!, col, 13);
    if (e.kind === 'cloud') fx.burst(x, y, '#ffffff', 28, 3, 4), say(x, y - R(0.07), e.text!, col, 14);
    if (e.kind === 'chainEnd') {
      const v = e.v ?? 0;
      if (v >= 7) {
        for (let q = 0; q < 7; q++) fx.burst(w * (0.08 + q * 0.14), Y(0.16), RAINBOW[q], 16, 5, 2.8);
        fx.blink('#fff8e0', 0.2), fx.kick(6), say(w / 2, Y(0.3), `${v}연쇄! 와아~`, '#fff6c8', 24);
      } else if (v >= 4) say(w / 2, Y(0.3), `${v}연쇄!`, '#ffffff', 19);
    }
    if (e.kind === 'clear') {
      for (let q = 0; q < 7; q++) fx.burst(w * (0.1 + q * 0.13), Y(0.5), RAINBOW[q], 20, 6, 3.2);
      fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(6), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = s.t;
  ctx.restore();
  // HUD·카드·목표 띠도 놀이 세계 좌표로 (흔들림 없이)
  ctx.save();
  ctx.translate(0, TOP);

  // ═════════════ HUD ═════════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const G = L.goal, metNow = s.popped >= G.pop && s.saved >= G.save, m2Now = s.pop2 >= G.pop && s.save2 >= G.save, allNow = s.popped >= L.total;
  // 위 HUD 띠는 화면 맨 위에 (늘어난 하늘 위)
  const hudTall = TOP >= HUD_TALL;
  ctx.save();
  ctx.translate(0, -TOP);
  {
    const hb = hudTall ? Math.max(R(HB), HUD_TALL) : R(HB), bg = ctx.createLinearGradient(0, 0, 0, hb);
    bg.addColorStop(0, 'rgba(52,28,92,.92)');
    bg.addColorStop(1, 'rgba(36,18,70,.92)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, hb);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    font(0.046, 900);
    const ttl = `🎈 ${stage + 1}판`, tw1 = ctx.measureText(ttl).width;
    ctx.fillText(ttl, R(0.03), hb * 0.52);
    font(0.036, 800);
    ctx.fillStyle = th.muted;
    ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
    const tw2 = R(0.03) + tw1 + ctx.measureText(` / ${STAGE_COUNT}`).width;
    ctx.textAlign = 'right';
    font(0.044, 900);
    ctx.fillStyle = '#ffd166';
    const stt = `★ ${s.stars}`;
    ctx.fillText(stt, w - R(0.03) - view.hudRight, hb * 0.52);
    const right = w - R(0.06) - view.hudRight - ctx.measureText(stt).width;
    font(0.036, 800);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9f0';
    const title = STAGES[stage].title;
    if (ctx.measureText(title).width < right - tw2 - R(0.04)) ctx.fillText(title, (tw2 + right) / 2, hb * 0.54);
  }
  // 새것 알림
  if (s.news.length && s.t - s.news[0].t < NEWS_T) {
    const nw = s.news[0], age = s.t - nw.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.037, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = nw.text, tw3 = Math.min(w - 10, ctx.measureText(tx).width + R(0.06)), by2 = (hudTall ? HUD_TALL + R(0.036) : Y(HB + 0.042)) - drop;
    ctx.fillStyle = 'rgba(48,24,88,.9)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw3 / 2, by2 - R(0.026), tw3, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2, w - R(0.06));
    ctx.globalAlpha = 1;
  }
  ctx.restore();
  // 연쇄 세기 (지금 몇 개째)
  if (s.chainN >= 2 && s.phase === 'play') {
    const k = 1 + 0.3 * Math.max(0, 1 - (s.t - s.lastPop) / 8);
    ctx.save();
    ctx.translate(w / 2, Y(s.news.length && s.t - s.news[0].t < NEWS_T ? 0.215 : 0.165));
    ctx.scale(k, k);
    font(0.07, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = R(0.012);
    ctx.strokeStyle = 'rgba(60,20,80,.75)';
    const tx = `${s.chainN} 연쇄!`;
    ctx.strokeText(tx, 0, 0);
    const tg = ctx.createLinearGradient(0, -R(0.035), 0, R(0.035));
    tg.addColorStop(0, '#fff6a8');
    tg.addColorStop(1, '#ff8fb1');
    ctx.fillStyle = tg;
    ctx.fillText(tx, 0, 0);
    ctx.restore();
  }
  // 첫 판 안내: 손가락이 큰 무리의 뿌리(0번)를 가리킨다 — 1판엔 큰 풍선이 없다 (CONTENT v0.3)
  if (stage === 0 && s.used === 0 && s.phase === 'play' && s.tries === 0) {
    const bi = 0;
    const hx = X(SX[bi]) + R(0.03), hy = Y(SY[bi]) + R(0.06) + Math.abs(Math.sin(t * 0.12)) * R(0.02);
    ctx.fillStyle = '#ffffff';
    font(0.07, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', hx, hy + R(0.02));
    // 안내 글('톡! 원 안까지 팡팡')은 뺐다 — 시작 토스트·소식 띠와 같은 말을 세 번 하고 데스크톱에선 소식 띠와 겹쳤다 (C008 🧪)
  }
  // 도움 반짝 (두 번 실패한 판): 숙련 봇이 고른 다음 톡 풍선에 금빛 고리 — 누를 때가 오면 '지금!' (톡마다 옮겨 감)
  if (s.help >= 0 && s.phase === 'play' && s.alive[s.help] === 1) {
    const i = s.help, now = st >= s.helpAt - 4, pulse = 0.5 + 0.5 * Math.sin(t * 0.25);
    const hx = X(SX[i]), hy = Y(SY[i]), hr = R(brOf(L.bs[i])) * (1.7 + pulse * 0.35);
    ctx.save();
    ctx.strokeStyle = now ? '#fff3a0' : 'rgba(255,225,120,.75)';
    ctx.lineWidth = now ? R(0.012) : R(0.007);
    ctx.shadowColor = '#ffd166';
    ctx.shadowBlur = now ? R(0.05) : R(0.025);
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    font(0.04, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 받침: 노랑 원·하늘 위에서도 글자가 읽히게 (C008)
    const lb = now ? '✨ 지금!' : '✨ 이 풍선', ly = Math.max(Y(HB) + R(0.04), hy - hr - R(0.03)), lw = ctx.measureText(lb).width + R(0.04);
    ctx.fillStyle = now ? 'rgba(90,42,138,.92)' : 'rgba(40,20,80,.7)';
    ctx.beginPath();
    ctx.roundRect(hx - lw / 2, ly - R(0.026), lw, R(0.052), R(0.026));
    ctx.fill();
    ctx.fillStyle = now ? '#fff3a0' : 'rgba(255,255,255,.85)';
    ctx.fillText(lb, hx, ly);
    ctx.restore();
  }
  // 판 시작 카드 · 판 끝 카드
  {
    let head = '', sub = '', sub2 = '', a = 0, stars = -1;
    if (s.phase === 'play' && s.tries > 0 && s.pt < RETRY_CARD) {
      a = Math.min(1, s.pt / 4, (RETRY_CARD - s.pt) / 10);
      head = `다시! ${stage + 1}판 · ${s.tries + 1}번째`;
      sub = s.helped ? '✨ 반짝이는 풍선부터 톡 해 봐요 (★ 두 번 안에는 쉬어요)' : STAGES[stage].tip;
    } else if (s.phase === 'intro' || (s.phase === 'play' && s.pt < 70 && stage > 0 && s.tries === 0)) {
      const age = s.phase === 'intro' ? s.pt : INTRO + s.pt;
      a = Math.min(1, age / 8, (INTRO + 70 - age) / 15);
      head = `${stage + 1}판 · ${STAGES[stage].title}${s.tries ? ' (다시)' : ''}`;
      sub = STAGES[stage].tip;
      sub2 = `🎯 ${G.pop ? `풍선 ${G.pop}개 팡` : ''}${G.pop && G.save ? ' + ' : ''}${G.save ? `동물 ${G.save}마리 구하기` : ''} · 톡 3번`;
    } else if (s.phase === 'result') {
      a = Math.min(1, s.pt / (s.ok ? 10 : 5), ((s.ok ? RESULT : FAIL_RESULT) - s.pt) / 10);
      if (s.ok) {
        head = s.won ? '축제 대성공! 🎉' : s.got === 3 ? '모두 팡! 완벽해요' : '목표 달성!';
        stars = s.got;
        sub = `목표 ✓ · 두 번 안에 ${s.helped ? '쉼(도움)' : s.m2 ? '✓' : '✗'} · 모두 팡 ${s.all ? '✓' : `✗ (${s.popped}/${L.total})`}`;
      } else {
        head = '앗, 아깝다!';
        sub = '같은 하늘 바로 다시!';
        sub2 = G.save ? `구한 동물 ${s.saved}/${G.save}` : `터뜨린 풍선 ${s.popped}/${G.pop}`;
      }
    }
    if (a > 0) {
      ctx.globalAlpha = a;
      // 판 시작·다시는 토스트 — 풍선 띠를 가리지 않는다: 토스트가 통째로 들어가는 위 하늘이 있으면 거기(소식 띠 아래), 아니면 아래 광장(브라우저 막대가 있는 폰·넓은 화면). 결과만 가운데 카드 (C008 🧪)
      const toast = s.phase !== 'result';
      const ch = R(stars >= 0 ? 0.25 : toast ? (sub2 ? 0.16 : 0.115) : 0.2), cy = !toast ? Y(0.5) : TOP >= HUD_TALL + R(0.075) + ch ? -TOP + HUD_TALL + R(0.075) + ch / 2 : Y(1.2);
      ctx.fillStyle = 'rgba(40,20,80,.86)';
      ctx.beginPath();
      ctx.roundRect(R(0.07), cy - ch / 2, w - R(0.14), ch, R(0.04));
      ctx.fill();
      ctx.strokeStyle = s.phase === 'result' && !s.ok ? th.hot : th.accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // 토스트는 글자를 조금 작고 촘촘하게
      const k1 = toast ? 0.034 : 0.045, k2 = toast ? 0.043 : 0.06, k3 = toast ? 0.083 : 0.11;
      let yy = cy - ch / 2 + R(k1);
      if (stars >= 0) {
        for (let q = 0; q < 3; q++) {
          const ap = clamp01((s.pt - 12 - q * 12) / 8), sc = q < stars ? 1 + 0.4 * Math.max(0, 1 - ap) * (ap > 0 ? 1 : 0) : 1;
          ctx.save();
          ctx.translate(w / 2 + (q - 1) * R(0.1), yy + R(0.005));
          ctx.scale(sc, sc);
          font(0.075, 900);
          ctx.fillStyle = q < stars && ap > 0 ? '#ffd166' : 'rgba(255,255,255,.25)';
          ctx.fillText('★', 0, 0);
          ctx.restore();
        }
        yy += R(0.07);
      }
      font(toast ? 0.046 : 0.055, 900);
      ctx.fillStyle = s.phase === 'result' && !s.ok ? '#ffb3c0' : '#fff1a8';
      ctx.fillText(head, w / 2, yy, w - R(0.18));
      font(toast ? 0.035 : 0.038, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(sub, w / 2, yy + R(k2), w - R(0.18));
      if (sub2) {
        ctx.fillStyle = th.muted;
        ctx.fillText(sub2, w / 2, yy + R(k3), w - R(0.18));
      }
      ctx.globalAlpha = 1;
    }
  }
  // 아래 띠: 목표 · 남은 톡 · 별 조건
  {
    const by = Y(BOT) + BOTX, bh = h - TOP - by, bg = ctx.createLinearGradient(0, by, 0, by + bh);
    bg.addColorStop(0, 'rgba(36,18,70,.94)');
    bg.addColorStop(1, 'rgba(52,28,92,.94)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, by, w, bh);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const r1 = by + bh * 0.3, r2 = by + bh * 0.74;
    font(0.042, 900);
    ctx.fillStyle = metNow ? '#b8ffb0' : '#ffffff';
    const goalTx = G.save && G.pop ? `🎯 🎈${Math.min(s.popped, G.pop)}/${G.pop} · 🐾${s.saved}/${G.save}` : G.save ? `🎯 동물 구하기 ${s.saved}/${G.save}` : `🎯 풍선 팡 ${Math.min(s.popped, G.pop)}/${G.pop}`;
    ctx.fillText(goalTx + (metNow ? ' ✓' : ''), R(0.03), r1);
    // 남은 톡
    ctx.textAlign = 'right';
    font(0.036, 800);
    ctx.fillStyle = th.muted;
    const lab = '남은 톡';
    const dotR = R(0.022), gap = R(0.056), x0 = w - R(0.03) - dotR - gap * 2;
    ctx.fillText(lab, x0 - dotR - R(0.015), r1);
    for (let q = 0; q < 3; q++) {
      const cx = x0 + q * gap, left = q < s.taps;
      ctx.beginPath();
      ctx.arc(cx, r1, dotR, 0, Math.PI * 2);
      if (left) {
        const pg = ctx.createRadialGradient(cx - dotR * 0.3, r1 - dotR * 0.3, 1, cx, r1, dotR);
        pg.addColorStop(0, '#ffd0dc');
        pg.addColorStop(1, '#ff4d6d');
        ctx.fillStyle = pg;
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
    // 별 조건
    font(0.036, 800);
    ctx.textAlign = 'left';
    const items: [string, boolean][] = [['목표', metNow], ['두 번 안에', m2Now], [`모두 팡 ${s.popped}/${L.total}`, allNow]];
    let xx = R(0.03);
    for (const [lb, ok2] of items) {
      ctx.fillStyle = ok2 ? '#ffd166' : 'rgba(255,255,255,.35)';
      ctx.fillText('★', xx, r2);
      xx += ctx.measureText('★ ').width;
      ctx.fillStyle = ok2 ? '#fff1c0' : '#d9cdee';
      ctx.fillText(lb, xx, r2);
      xx += ctx.measureText(lb).width + R(0.045);
    }
  }
  ctx.restore();
}
