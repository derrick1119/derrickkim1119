/**
 * ✂️ 동물 손님 케이크 자르기 (36라운드: 직접 만지는 물리 장난감 — 한 번 긋기) — 한 번 그어 자르기 × 깊어지는 판.
 * 손짓은 하나: 케이크 위를 누르고 쓱 움직였다 떼기. 손가락이 지나가는 동안 크림에 칼자국이 바로 패이고,
 *   떼면 획의 시작·끝을 잇는 직선이 케이크 끝까지 지나가 '쩍' 갈라진다(삐뚤게 그어도 시작·끝만 본다).
 *   키보드: 화살표로 칼끝을 옮기고, 스페이스를 누른 채 화살표로 그은 뒤 떼기.
 * 와우: 칼은 그은 줄을 따라 이미 갈라진 조각까지 한꺼번에 가른다 — 두 줄이 엇갈리면 조각이 곱절, 하트 꼭대기를 지나면 한 번에 셋.
 *   갈라진 조각은 무게만큼 미끄러져 나가고(작은 조각일수록 휙), 단면엔 스펀지·크림·잼 층이 드러나 크림이 흘러내린다.
 *   칼에 닿은 딸기는 반쪽으로 튀어 굴러떨어지고, 초는 픽 쓰러진다. 손님 동물들은 받은 조각을 서로 견줘 보고 투덜·환호.
 * 판(8): 손님 수만큼 공평하게. 칼 수는 딱 필요한 만큼(+0~1). 손님 수만큼 조각이 나면 바로 나눠 준다.
 *   별(쉬운 말, 판마다 하나씩 늘어남): 모두 한 조각씩 · 딸기도 하나씩 · 초는 그대로 · 위층도 한 입씩 · 거의 똑같은 크기로.
 *   실패: 손님 하나가 빈 접시 / 가장 큰 몫이 가장 작은 몫의 두 배를 넘음 → 하트 -1, 그 판만 다시. 1판은 지지 않는다.
 * 펼쳐짐(판마다 새것, 하는 일이 바뀐다): 1 동그라미 둘로 → 2 네모 셋(줄이 엇갈리면 넷 — 엇갈리지 않게)
 *   → 3 딸기(딸기 사이로 각도 고르기) → 4 초(넷이니 엇갈리게, 초를 비켜 돌려서) → 5 하트(가운데가 가운데가 아님)
 *   → 6 2층 케이크(위층이 두 배 무거워 엇갈리는 점이 위층 쪽으로) → 7 욕심쟁이 곰(곰 몫은 두 배) → 8 파티(다 나옴).
 * 판은 '답 먼저' 만든다: 격자 각도의 답을 실제 자르기로 만들고, 그 조각 안에 딸기를, 버릇 줄(가운데·같은 간격) 위에 초를 꽂는다.
 * 닮은 게임: 도형을 같은 넓이로 나누는 '자르기 퍼즐'과 과일 베기 — 다른 점은 칼이 끝까지 지나가 조각이 곱절로 느는 것,
 *   얹힌 것(딸기·초·위층)이 '공평'의 뜻을 바꾸는 것, 조각이 물리로 미끄러지고 손님이 크기를 견주는 것.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
/** 3/4 시점: 바닥 세로 눌림 · 케이크 높이 · 위층 높이 · 화면에서 접시 가운데 높이 (가로 폭 단위) */
const SQ = 0.62, HC = 0.12, HT = 0.08, YC = 0.9;
/** 자른 뒤 두 쪽이 벌어지는 틈 · 부스러기 기준(전체 넓이 대비) · 딸기·초·크림 꽃 반지름 */
const GAP = 0.06, CRUMB = 0.008, BR = 0.03, CR = 0.024, RR = 0.022;
const TAU = Math.PI * 2;
/** 칼 각도 격자(봇·판 생성이 같이 씀): 15° 간격 */
const ANG = Array.from({ length: 12 }, (_, k) => (k * Math.PI) / 12);

// ───────────────────────────── 기하 ─────────────────────────────
type Poly = number[];
function polyArea(P: Poly) {
  let a = 0;
  for (let i = 0, n = P.length; i < n; i += 2) {
    const j = (i + 2) % n;
    a += P[i] * P[j + 1] - P[j] * P[i + 1];
  }
  return a / 2;
}
function centroid(P: Poly): [number, number] {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = P.length; i < n; i += 2) {
    const j = (i + 2) % n, cr = P[i] * P[j + 1] - P[j] * P[i + 1];
    a += cr;
    cx += (P[i] + P[j]) * cr;
    cy += (P[i + 1] + P[j + 1]) * cr;
  }
  if (Math.abs(a) < 1e-12) {
    let sx = 0, sy = 0;
    for (let i = 0; i < P.length; i += 2) (sx += P[i]), (sy += P[i + 1]);
    return [sx / (P.length / 2), sy / (P.length / 2)];
  }
  return [cx / (3 * a), cy / (3 * a)];
}
/** 반평면 n·p ≤ c 쪽만 남긴다 (오목해도 넓이는 맞다) */
function clipHalf(P: Poly, nx: number, ny: number, c: number): Poly {
  const out: number[] = [];
  for (let i = 0, n = P.length; i < n; i += 2) {
    const j = (i + 2) % n, xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1];
    const di = nx * xi + ny * yi - c, dj = nx * xj + ny * yj - c;
    if (di <= 0) out.push(xi, yi);
    if (di <= 0 !== dj <= 0) {
      const t = di / (di - dj);
      out.push(xi + (xj - xi) * t, yi + (yj - yi) * t);
    }
  }
  return out;
}
/** 볼록 다각형 Q(반시계 아님 상관없이)로 자르기 */
function clipConvex(P: Poly, Q: Poly): Poly {
  const s = polyArea(Q) > 0 ? 1 : -1;
  let R = P;
  for (let i = 0, n = Q.length; i < n && R.length >= 6; i += 2) {
    const j = (i + 2) % n, dx = Q[j] - Q[i], dy = Q[j + 1] - Q[i + 1];
    const nx = s * dy, ny = -s * dx;
    R = clipHalf(R, nx, ny, nx * Q[i] + ny * Q[i + 1]);
  }
  return R;
}
function inPoly(P: Poly, x: number, y: number) {
  let inside = false;
  for (let i = 0, n = P.length, j = n - 2; i < n; j = i, i += 2) {
    const xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function edgeDist(P: Poly, x: number, y: number) {
  let best = 1e9;
  for (let i = 0, n = P.length; i < n; i += 2) {
    const j = (i + 2) % n, ax = P[i], ay = P[i + 1], bx = P[j] - ax, by = P[j + 1] - ay;
    const L = bx * bx + by * by, t = L > 0 ? Math.max(0, Math.min(1, ((x - ax) * bx + (y - ay) * by) / L)) : 0;
    best = Math.min(best, Math.hypot(x - ax - bx * t, y - ay - by * t));
  }
  return best;
}
/**
 * 단순 다각형을 직선 n·p = c로 가른다 (오목하면 셋 이상). E[i] = 변 i(꼭짓점 i→i+1)가 자른 면인가.
 * 교점을 직선 따라 정렬해 짝지은 '다리'를 건너며 한 바퀴씩 돌면 조각 하나.
 */
function splitPoly(P: Poly, E: boolean[], nx: number, ny: number, c: number): { P: Poly; E: boolean[] }[] | null {
  const n = P.length / 2, d: number[] = [];
  let pos = 0, neg = 0;
  for (let i = 0; i < n; i++) {
    let v = nx * P[2 * i] + ny * P[2 * i + 1] - c;
    if (Math.abs(v) < 1e-9) v = 1e-9;
    d.push(v);
    v > 0 ? pos++ : neg++;
  }
  if (!pos || !neg) return null;
  const X: number[] = [], Y: number[] = [], isX: boolean[] = [], ec: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    X.push(P[2 * i]), Y.push(P[2 * i + 1]), isX.push(false), ec.push(E[i]);
    if (d[i] > 0 !== d[j] > 0) {
      const t = d[i] / (d[i] - d[j]);
      X.push(P[2 * i] + (P[2 * j] - P[2 * i]) * t), Y.push(P[2 * i + 1] + (P[2 * j + 1] - P[2 * i + 1]) * t), isX.push(true), ec.push(E[i]);
    }
  }
  const m = X.length, xs: number[] = [];
  for (let k = 0; k < m; k++) if (isX[k]) xs.push(k);
  xs.sort((a, b) => -ny * X[a] + nx * Y[a] - (-ny * X[b] + nx * Y[b]));
  const partner = new Array<number>(m).fill(-1);
  for (let k = 0; k + 1 < xs.length; k += 2) (partner[xs[k]] = xs[k + 1]), (partner[xs[k + 1]] = xs[k]);
  const used = new Uint8Array(m), out: { P: Poly; E: boolean[] }[] = [];
  for (let k0 = 0; k0 < m; k0++) {
    if (used[k0]) continue;
    const px: number[] = [], pe: boolean[] = [];
    let cur = k0, guard = 0;
    do {
      used[cur] = 1;
      px.push(X[cur], Y[cur]);
      pe.push(ec[cur]);
      const nx2 = (cur + 1) % m;
      if (isX[nx2] && partner[nx2] >= 0) {
        px.push(X[nx2], Y[nx2]);
        pe.push(true);
        cur = partner[nx2];
      } else cur = nx2;
    } while (cur !== k0 && ++guard < 4 * m);
    const cl = clean(px, pe);
    if (cl.P.length >= 6 && Math.abs(polyArea(cl.P)) > 1e-7) out.push(cl);
  }
  return out.length >= 2 ? out : null;
}
/** 거의 겹친 꼭짓점 지우기 */
function clean(P: Poly, E: boolean[]): { P: Poly; E: boolean[] } {
  const n = P.length / 2, oP: number[] = [], oE: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const x = P[2 * i], y = P[2 * i + 1];
    if (oP.length && Math.hypot(x - oP[oP.length - 2], y - oP[oP.length - 1]) < 1e-6) {
      oE[oE.length - 1] = E[i] || oE[oE.length - 1];
      continue;
    }
    oP.push(x, y), oE.push(E[i]);
  }
  while (oP.length >= 6 && Math.hypot(oP[0] - oP[oP.length - 2], oP[1] - oP[oP.length - 1]) < 1e-6) oP.splice(-2, 2), oE.pop();
  return { P: oP, E: oE };
}

// ───────────────────────────── 케이크 모양 ─────────────────────────────
type Shape = 'round' | 'square' | 'heart' | 'rect';
function circlePoly(cx: number, cy: number, r: number, n: number): Poly {
  const P: number[] = [];
  for (let k = 0; k < n; k++) P.push(cx + r * Math.cos((k / n) * TAU), cy + r * Math.sin((k / n) * TAU));
  return P;
}
function roundRect(cx: number, cy: number, hw: number, hh: number, r: number, rot = 0): Poly {
  const P: number[] = [], cs = [[hw - r, hh - r], [-(hw - r), hh - r], [-(hw - r), -(hh - r)], [hw - r, -(hh - r)]];
  for (let q = 0; q < 4; q++)
    for (let k = 0; k <= 5; k++) {
      const a = (q + k / 5) * (Math.PI / 2), x = cs[q][0] + r * Math.cos(a), y = cs[q][1] + r * Math.sin(a);
      P.push(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot));
    }
  return P;
}
function heartPoly(cx: number, cy: number, size: number, rot: number): Poly {
  const raw: number[] = [];
  for (let k = 0; k < 72; k++) {
    const t = (k / 72) * TAU;
    raw.push(16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)));
  }
  const [mx, my] = centroid(raw), sc = size / 34, P: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const x = (raw[i] - mx) * sc, y = (raw[i + 1] - my) * sc;
    P.push(cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot));
  }
  return P;
}

// ───────────────────────────── 판 (논리) ─────────────────────────────
type TK = 'berry' | 'candle' | 'rose';
interface Pc { id: number; P: Poly; E: boolean[]; ox: number; oy: number; a: number; ti: number; w: number; cx: number; cy: number }
interface Tp { k: TK; x: number; y: number; pc: number; on: boolean; tier: boolean }
export interface Board { pcs: Pc[]; tp: Tp[]; tier: Poly | null; A0: number; W0: number; nid: number; lost: number }
interface Line { nx: number; ny: number; c: number }

function mkPiece(b: Board, P: Poly, E: boolean[], ox: number, oy: number): Pc {
  const a = Math.abs(polyArea(P)), ti = b.tier ? Math.abs(polyArea(clipConvex(P, b.tier))) : 0;
  const [cx, cy] = centroid(P);
  return { id: b.nid++, P, E, ox, oy, a, ti, w: a + ti, cx, cy };
}
function newBoard(base: Poly, tier: Poly | null): Board {
  const b: Board = { pcs: [], tp: [], tier, A0: Math.abs(polyArea(base)), W0: 0, nid: 1, lost: 0 };
  b.pcs.push(mkPiece(b, base, base.map(() => false).slice(0, base.length / 2), 0, 0));
  b.W0 = b.pcs[0].w;
  return b;
}
const cloneB = (b: Board): Board => ({ ...b, pcs: b.pcs.slice(), tp: b.tp.map((t) => ({ ...t })) });
const tR = (k: TK) => (k === 'berry' ? BR : k === 'candle' ? CR : RR);

interface CutRes { b: Board; split: { from: Pc; into: Pc[]; crumbs: Pc[] }[]; hit: number[]; nNew: number; shift: Map<number, number> }
/**
 * 칼질 한 번: 직선(세계 좌표)이 지나는 조각을 모두 가르고, 닿은 딸기·초·크림 꽃을 떨군다.
 * 진짜 새 조각이 생기면 직선 양쪽 전체가 GAP/2씩 벌어진다 (같은 쪽 조각은 같이 움직여 서로 겹치지 않는다).
 */
function applyCut(b0: Board, L: Line, pad = 0): CutRes | null {
  const b = cloneB(b0), split: CutRes['split'] = [], hit: number[] = [];
  const out: Pc[] = [];
  let nNew = 0;
  for (const p of b0.pcs) {
    const cl = L.c - (L.nx * p.ox + L.ny * p.oy);
    const parts = splitPoly(p.P, p.E, L.nx, L.ny, cl);
    if (!parts) {
      out.push(p);
      continue;
    }
    const real: Pc[] = [], crumbs: Pc[] = [];
    for (const q of parts) {
      const pc = mkPiece(b, q.P, q.E, p.ox, p.oy);
      (pc.a >= CRUMB * b.A0 ? real : crumbs).push(pc);
    }
    if (!real.length) {
      out.push(p);
      continue;
    }
    // 닿은 얹은 것
    for (let i = 0; i < b.tp.length; i++) {
      const t = b.tp[i];
      if (!t.on || t.pc !== p.id) continue;
      const dd = L.nx * t.x + L.ny * t.y - cl;
      if (Math.abs(dd) < tR(t.k) + pad && inPoly(p.P, t.x - L.nx * dd, t.y - L.ny * dd)) (t.on = false), hit.push(i);
    }
    for (const t of b.tp) {
      if (!t.on || t.pc !== p.id) continue;
      let to = real.find((q) => inPoly(q.P, t.x, t.y));
      if (!to) {
        const cr = crumbs.find((q) => inPoly(q.P, t.x, t.y));
        if (cr) (t.on = false);
        else to = real.reduce((m, q) => (Math.hypot(q.cx - t.x, q.cy - t.y) < Math.hypot(m.cx - t.x, m.cy - t.y) ? q : m));
      }
      if (to) t.pc = to.id;
    }
    for (const cr of crumbs) b.lost += cr.w;
    nNew += real.length - 1;
    split.push({ from: p, into: real, crumbs });
    out.push(...real);
  }
  if (!split.length) return null;
  const shift = new Map<number, number>();
  if (nNew > 0)
    for (let k = 0; k < out.length; k++) {
      const p = out[k], sd = L.nx * (p.cx + p.ox) + L.ny * (p.cy + p.oy) - L.c > 0 ? 1 : -1;
      const q = { ...p, ox: p.ox + (sd * L.nx * GAP) / 2, oy: p.oy + (sd * L.ny * GAP) / 2 };
      out[k] = q;
      shift.set(q.id, sd);
      for (const s of split) for (let j = 0; j < s.into.length; j++) if (s.into[j].id === q.id) s.into[j] = q;
    }
  b.pcs = out;
  return { b, split, hit, nNew, shift };
}

// ───────────────────────────── 판 정의 ─────────────────────────────
type StarK = 'even1' | 'one' | 'even' | 'berry' | 'candle' | 'tier';
type Animal = 'bunny' | 'bear' | 'cat' | 'panda' | 'fox' | 'chick';
interface StageDef {
  key: string; name: string; icon: string; shape: Shape; N: number; K: number; shares: number[]; guests: Animal[];
  berries: number; candles: number; tier: boolean; plan: 'strips' | 'cross' | 'bisect';
  stars: StarK[]; fail: number; news: string; tip: string;
  frost: string; frost2: string; sponge: string; jam: string;
  /** 위층 맛: 크림 · 흘러내린 크림 · 스펀지 */
  tf?: [string, string, string];
}
const ones = (n: number) => Array.from({ length: n }, () => 1);
export const STAGES: StageDef[] = [
  { key: 'cut', name: '생일 동그라미', icon: '🎂', shape: 'round', N: 2, K: 1, shares: ones(2), guests: ['bunny', 'bear'], berries: 0, candles: 0, tier: false, plan: 'bisect', stars: ['even1'], fail: Infinity, news: '🎂 손님 둘에게 똑같이 반씩!', tip: '손님 둘 — 가운데를 지나게 한 번', frost: '#ffd3e2', frost2: '#ff9fc0', sponge: '#ffe2a6', jam: '#e8475f' },
  { key: 'cross', name: '네모 케이크', icon: '🧁', shape: 'square', N: 3, K: 2, shares: ones(3), guests: ['cat', 'bunny', 'bear'], berries: 0, candles: 0, tier: false, plan: 'strips', stars: ['one', 'even'], fail: 2.6, news: '✂️ 칼은 끝까지 — 두 줄이 엇갈리면 네 조각!', tip: '셋이면 두 줄이 엇갈리지 않게', frost: '#fff3d6', frost2: '#ffd27a', sponge: '#ffe7b0', jam: '#ff9a3c' },
  { key: 'berry', name: '딸기 동그라미', icon: '🍓', shape: 'round', N: 3, K: 2, shares: ones(3), guests: ['fox', 'cat', 'bunny'], berries: 3, candles: 0, tier: false, plan: 'strips', stars: ['one', 'berry', 'even'], fail: 2.0, news: '🍓 딸기도 하나씩 — 칼에 닿으면 반쪽!', tip: '딸기와 딸기 사이로 지나가게', frost: '#fff8fb', frost2: '#ffb3cb', sponge: '#ffe2a6', jam: '#e8475f' },
  { key: 'candle', name: '초 꽂은 네모', icon: '🕯️', shape: 'square', N: 4, K: 2, shares: ones(4), guests: ['bear', 'panda', 'cat', 'bunny'], berries: 0, candles: 5, tier: false, plan: 'cross', stars: ['one', 'candle', 'even'], fail: 2.0, news: '🕯️ 초는 자르면 안 돼요 — 넷이면 엇갈리게', tip: '초를 비켜 비스듬히 엇갈려요', frost: '#d9f1ff', frost2: '#8fd0ff', sponge: '#ffe7b0', jam: '#7ab8ff' },
  { key: 'heart', name: '하트 케이크', icon: '💗', shape: 'heart', N: 2, K: 1, shares: ones(2), guests: ['bunny', 'fox'], berries: 2, candles: 2, tier: false, plan: 'bisect', stars: ['berry', 'candle', 'even'], fail: 2.0, news: '💗 하트는 가운데가 가운데가 아니에요', tip: '반으로 — 딸기 하나씩, 초는 비켜서', frost: '#ffc2d6', frost2: '#ff7aa5', sponge: '#ffe2a6', jam: '#d63a5a' },
  { key: 'tier', name: '2층 케이크', icon: '🎂', shape: 'round', N: 4, K: 2, shares: ones(4), guests: ['panda', 'bear', 'fox', 'cat'], berries: 0, candles: 0, tier: true, plan: 'cross', stars: ['one', 'tier', 'even'], fail: 2.0, news: '🎂 초코 위층은 두 배 무거워요 — 위층 쪽은 작게', tip: '넷 모두 위층도 한 입씩', frost: '#fff6ea', frost2: '#f59fbd', sponge: '#ffe2a6', jam: '#e8475f', tf: ['#a5653f', '#5e351d', '#7a4526'] },
  { key: 'bear', name: '욕심쟁이 곰', icon: '🐻', shape: 'rect', N: 4, K: 3, shares: [2, 1, 1, 1], guests: ['bear', 'bunny', 'cat', 'chick'], berries: 5, candles: 0, tier: false, plan: 'strips', stars: ['one', 'berry', 'even'], fail: 2.0, news: '🐻 곰은 두 배를 먹어요 — 딸기도 두 개', tip: '곰 몫은 남의 두 배', frost: '#e9ffd9', frost2: '#9adf7a', sponge: '#ffe7b0', jam: '#e8475f' },
  { key: 'party', name: '파티 케이크', icon: '🎉', shape: 'square', N: 4, K: 3, shares: ones(4), guests: ['bunny', 'bear', 'cat', 'fox'], berries: 4, candles: 3, tier: true, plan: 'strips', stars: ['berry', 'candle', 'even'], fail: 1.8, news: '🎉 마지막 — 딸기·초·위층 다 나와요', tip: '위층 쪽 조각은 조금 좁게', frost: '#fff0f6', frost2: '#ff9fc0', sponge: '#ffe2a6', jam: '#e8475f', tf: ['#ffb8cf', '#ff6f9c', '#ffe2a6'] },
];
export const STAGE_COUNT = STAGES.length;

const STAR_TEXT: Record<StarK, string> = {
  even1: '두 조각을 비슷하게',
  one: '모두 한 조각씩',
  even: '거의 똑같은 크기로',
  berry: '딸기도 몫만큼 하나씩',
  candle: '초는 그대로',
  tier: '위층도 한 입씩',
};
const starText = (d: StageDef, k: StarK) => (k === 'berry' && d.shares.every((x) => x === 1) ? '딸기도 하나씩' : k === 'berry' ? '딸기도 몫만큼' : STAR_TEXT[k]);

// ───────────────────────────── 나눠 주기 · 판정 ─────────────────────────────
export interface Judge { owner: Map<number, number>; tot: number[]; q: number[]; ratio: number; ok: boolean[]; fail: '' | 'empty' | 'unfair'; got: number; berries: number[]; tiers: number[] }
function judge(b: Board, d: StageDef): Judge {
  const N = d.N, sh = d.shares, tot = ones(N).map(() => 0), cnt = ones(N).map(() => 0), owner = new Map<number, number>();
  const pcs = b.pcs.slice().sort((x, y) => y.w - x.w || x.id - y.id);
  for (const p of pcs) {
    let g = 0;
    for (let k = 1; k < N; k++) {
      const a = tot[k] / sh[k], c = tot[g] / sh[g];
      if (a < c - 1e-12 || (Math.abs(a - c) <= 1e-12 && sh[k] > sh[g])) g = k;
    }
    owner.set(p.id, g);
    tot[g] += p.w;
    cnt[g]++;
  }
  const q = tot.map((t, g) => t / sh[g]);
  const mn = Math.min(...q), mx = Math.max(...q), ratio = mn > 0 ? mx / mn : 99;
  const berries = ones(N).map(() => 0), tiers = ones(N).map(() => 0);
  const byId = new Map(b.pcs.map((p) => [p.id, p]));
  for (const t of b.tp) if (t.on && t.k === 'berry') berries[owner.get(t.pc) ?? 0]++;
  for (const [id, g] of owner) tiers[g] += byId.get(id)!.ti;
  const S = sh.reduce((a, x) => a + x, 0), nb = b.tp.filter((t) => t.k === 'berry').length, bps = nb / S;
  const ok = d.stars.map((k) => {
    if (k === 'even1') return ratio <= 1.25;
    if (k === 'even') return ratio <= 1.15;
    if (k === 'one') return b.pcs.length === N;
    if (k === 'berry') return b.tp.every((t) => t.k !== 'berry' || t.on) && berries.every((c, g) => Math.abs(c - sh[g] * bps) < 1e-9);
    if (k === 'candle') return b.tp.every((t) => t.k !== 'candle' || t.on);
    return tiers.every((x, g) => x >= 0.05 * tot[g]);
  });
  const fail = cnt.some((c) => c === 0) ? 'empty' : ratio > d.fail ? 'unfair' : '';
  return { owner, tot, q, ratio, ok, fail, got: fail ? 0 : ok.filter(Boolean).length, berries, tiers };
}

// ───────────────────────────── 자를 자리 찾기 (봇·판 생성 공용) ─────────────────────────────
function lowW(b: Board, p: Pc, nx: number, ny: number, cl: number) {
  const Q = clipHalf(p.P, nx, ny, cl);
  if (Q.length < 6) return 0;
  const a = Math.abs(polyArea(Q));
  return b.tier ? a + Math.abs(polyArea(clipConvex(Q, b.tier))) : a;
}
function projRange(p: Pc, nx: number, ny: number): [number, number] {
  let lo = 1e9, hi = -1e9;
  for (let i = 0; i < p.P.length; i += 2) {
    const v = nx * p.P[i] + ny * p.P[i + 1];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}
/** 조각 p를 법선 θ의 직선으로 갈라 낮은 쪽 무게가 target이 되는 직선 (세계 좌표) */
function solveCut(b: Board, p: Pc, th: number, target: number, it = 16): Line {
  const nx = Math.cos(th), ny = Math.sin(th);
  let [lo, hi] = projRange(p, nx, ny);
  for (let k = 0; k < it; k++) {
    const m = (lo + hi) / 2;
    if (lowW(b, p, nx, ny, m) < target) lo = m;
    else hi = m;
  }
  return { nx, ny, c: (lo + hi) / 2 + nx * p.ox + ny * p.oy };
}
/** 두 조각을 한 줄로 동시에 반씩 (햄 샌드위치) */
function bothHalves(b: Board, p: Pc, q: Pc): Line[] {
  const f = (th: number) => {
    const L = solveCut(b, p, th, p.w / 2, 13), cl = L.c - (L.nx * q.ox + L.ny * q.oy);
    return { L, v: lowW(b, q, L.nx, L.ny, cl) - q.w / 2 };
  };
  const out: Line[] = [], S = 12;
  let prev = f(0);
  for (let k = 1; k <= S; k++) {
    const th = (k / S) * Math.PI, cur = k === S ? { L: prev.L, v: -f(0).v } : f(th);
    if (prev.v === 0 || prev.v < 0 !== cur.v < 0) {
      let a = ((k - 1) / S) * Math.PI, z = th, fa = prev.v;
      for (let it = 0; it < 11; it++) {
        const m = (a + z) / 2, fm = f(m).v;
        if (fm < 0 === fa < 0) (a = m), (fa = fm);
        else z = m;
      }
      out.push(f((a + z) / 2).L);
    }
    if (k < S) prev = cur;
  }
  return out;
}

const shareOf = (b: Board, d: StageDef) => (b.W0 - b.lost) / d.shares.reduce((a, x) => a + x, 0);
function candidates(b: Board, d: StageDef): Line[] {
  const u = shareOf(b, d), out: Line[] = [];
  const big = b.pcs.filter((p) => Math.round(p.w / u) >= 2);
  for (const p of big) {
    const m = Math.round(p.w / u);
    for (const th of ANG) for (let j = 1; j < m; j++) out.push(solveCut(b, p, th, (p.w * j) / m));
  }
  for (let i = 0; i < big.length; i++)
    for (let j = i + 1; j < big.length; j++) if (Math.round(big[i].w / u) % 2 === 0 && Math.round(big[j].w / u) % 2 === 0) out.push(...bothHalves(b, big[i], big[j]));
  return out;
}
function finalValue(b: Board, d: StageDef) {
  const J = judge(b, d);
  if (J.fail) return -1e5 - J.ratio * 100 - (J.fail === 'empty' ? 5e4 : 0);
  return J.got * 1000 - J.ratio * 400 + (b.pcs.length === d.N ? 60 : 0);
}
function heur(b: Board, d: StageDef, left: number) {
  const u = shareOf(b, d), S = d.shares.reduce((a, x) => a + x, 0), most = (left * (left + 1)) / 2 + 1;
  let err = 0, ms = 0, bad = 0;
  const nb = b.tp.filter((t) => t.k === 'berry').length, bps = nb / S;
  for (const p of b.pcs) {
    const m = Math.max(1, Math.round(p.w / u));
    ms += m;
    if (m > most) bad += 3 * (m - most);
    err += Math.abs(p.w - m * u) / u;
    if (d.stars.includes('berry')) bad += Math.abs(b.tp.filter((t) => t.k === 'berry' && t.on && t.pc === p.id).length - m * bps);
    if (d.stars.includes('tier') && m === 1 && p.ti < 0.06 * p.w) bad += 1;
  }
  for (const t of b.tp) if (!t.on && t.k !== 'rose' && d.stars.includes(t.k as StarK)) bad += 2;
  return -err * 300 - Math.abs(ms - S) * 400 - bad * 350;
}
/** 남은 칼 수만큼 앞을 내다보는 빔 탐색 — 다음에 그을 직선 */
export function planCut(b0: Board, d: StageDef, left: number): Line | null {
  let beam: { b: Board; first: Line | null }[] = [{ b: b0, first: null }];
  let best: { v: number; L: Line | null } = { v: -Infinity, L: null };
  for (let depth = 1; depth <= left && beam.length; depth++) {
    const next: { b: Board; first: Line; h: number }[] = [];
    for (const st of beam) {
      const seen: Line[] = [];
      for (const L of candidates(st.b, d)) {
        if (seen.some((q) => Math.abs(q.nx * L.nx + q.ny * L.ny) > 0.99999 && Math.abs(q.c - L.c * Math.sign(q.nx * L.nx + q.ny * L.ny)) < 2e-4)) continue;
        seen.push(L);
        const r = applyCut(st.b, L);
        if (!r || r.nNew === 0) continue;
        const first = st.first ?? L;
        // 얹은 것에서 넉넉히 떨어진 줄을 조금 더 좋아한다 (사람 손이 삐끗해도 되게)
        let clr = 0.05;
        for (const t of st.b.tp) {
          if (!t.on || t.k === 'rose') continue;
          const p = st.b.pcs.find((q) => q.id === t.pc);
          if (p) clr = Math.min(clr, Math.abs(L.nx * (t.x + p.ox) + L.ny * (t.y + p.oy) - L.c) - tR(t.k));
        }
        if (r.b.pcs.length >= d.N || depth === left) {
          const v = finalValue(r.b, d) + Math.max(0, clr) * 400;
          if (v > best.v) best = { v, L: first };
        } else next.push({ b: r.b, first, h: heur(r.b, d, left - depth) + Math.max(0, clr) * 400 });
      }
    }
    next.sort((x, y) => y.h - x.h);
    beam = next.slice(0, left <= 2 ? 40 : depth === 1 ? 16 : 10);
  }
  return best.L;
}

// ───────────────────────────── 판 만들기 (답 먼저) ─────────────────────────────
interface Level { base: Poly; tier: Poly | null; tierC: [number, number, number] | null; board: Board; sol: Line[]; tries: number; fb?: boolean }
const levelCache = new Map<string, Level>();
function shapeOf(d: StageDef, r: Rng): Poly {
  if (d.shape === 'round') return circlePoly(0.5, 0.5, 0.33, 56);
  if (d.shape === 'square') return roundRect(0.5, 0.5, 0.29, 0.29, 0.05);
  if (d.shape === 'rect') return roundRect(0.5, 0.5, 0.37, 0.24, 0.05);
  const s = r() < 0.5 ? -1 : 1;
  return heartPoly(0.5, 0.5, 0.72, s * (0.18 + r() * 0.22));
}
function pickTh(d: StageDef, r: Rng) {
  const bad = d.plan === 'cross' && d.shape === 'square' ? [0, 3, 6, 9] : [0, 6];
  const ok = ANG.map((_, k) => k).filter((k) => !bad.includes(k));
  return ANG[ok[Math.floor(r() * ok.length)]];
}
/** 답(직선들)을 실제 자르기로 만든다 */
function solve(b0: Board, d: StageDef, th: number, r: Rng): { lines: Line[]; b: Board } | null {
  let b = b0;
  const lines: Line[] = [], u = shareOf(b0, d);
  if (d.plan === 'bisect') {
    const L = solveCut(b, b.pcs[0], th, b.pcs[0].w / 2);
    const c = applyCut(b, L);
    return c ? { lines: [L], b: c.b } : null;
  }
  if (d.plan === 'cross') {
    const L1 = solveCut(b, b.pcs[0], th, b.pcs[0].w / 2), c1 = applyCut(b, L1);
    if (!c1) return null;
    const [p, q] = c1.b.pcs, L2s = bothHalves(c1.b, p, q);
    for (const L2 of L2s) {
      const c2 = applyCut(c1.b, L2);
      if (c2 && c2.b.pcs.length === 4) return { lines: [L1, L2], b: c2.b };
    }
    return null;
  }
  // 띠: 몫 순서를 섞어 한쪽부터 차례로 잘라 낸다
  const order = d.shares.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const nx = Math.cos(th), ny = Math.sin(th);
  for (let k = 0; k < order.length - 1; k++) {
    // 가장 '높은 쪽'(n·p가 큰 쪽) 조각이 아직 안 자른 나머지
    const rest = b.pcs.reduce((m, p) => (nx * (p.cx + p.ox) + ny * (p.cy + p.oy) > nx * (m.cx + m.ox) + ny * (m.cy + m.oy) ? p : m));
    const L = solveCut(b, rest, th, order[k] * u);
    const c = applyCut(b, L);
    if (!c || c.nNew !== 1) return null;
    lines.push(L);
    b = c.b;
  }
  return { lines, b };
}
export function buildLevel(seed: number, stage: number): Level {
  const key = `${seed}:${stage}`, hit = levelCache.get(key);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 7919 + stage * 104729 + 13) >>> 0);
  let lv: Level | null = null;
  for (let attempt = 0; attempt < 60 && !lv; attempt++) {
    const base = shapeOf(d, r);
    let tier: Poly | null = null, tierC: Level['tierC'] = null;
    if (d.tier) {
      const a = r() * TAU, off = 0.075 + r() * 0.035, tr = d.shape === 'square' ? 0.15 : 0.145;
      tierC = [0.5 + Math.cos(a) * off, 0.5 + Math.sin(a) * off, tr];
      tier = circlePoly(tierC[0], tierC[1], tr, 28);
    }
    const b0 = newBoard(base, tier), th = pickTh(d, r), sol = solve(b0, d, th, r);
    if (!sol) continue;
    const J0 = judge(sol.b, d);
    if (J0.ratio > 1.03 || J0.fail) continue;
    // 딸기: 답 조각 안에, 몫만큼
    const tp: Tp[] = [];
    let okB = true;
    if (d.berries) {
      const S = d.shares.reduce((a, x) => a + x, 0), bps = d.berries / S;
      for (const p of sol.b.pcs) {
        const g = J0.owner.get(p.id)!, want = Math.round(d.shares[g] * bps);
        for (let k = 0; k < want; k++) {
          let placed = false;
          for (let tr = 0; tr < 40 && !placed; tr++) {
            const sp = tr < 20 ? 0.2 : 0.08, x = p.cx + (r() - 0.5) * sp, y = p.cy + (r() - 0.5) * sp;
            if (!inPoly(p.P, x, y) || edgeDist(p.P, x, y) < BR + (tr < 20 ? 0.03 : 0.014) || edgeDist(base, x, y) < BR + 0.03) continue;
            if (tp.some((t) => Math.hypot(t.x - x, t.y - y) < BR * 2.4)) continue;
            if (tierC && Math.abs(Math.hypot(x - tierC[0], y - tierC[1]) - tierC[2]) < BR + 0.012) continue;
            tp.push({ k: 'berry', x, y, pc: 1, on: true, tier: false });
            placed = true;
          }
          if (!placed) okB = false;
        }
      }
    }
    if (!okB) continue;
    // 초: 버릇 줄(가운데 가로·세로·대각, 같은 간격 세로) 위, 답 줄에서는 떨어지게
    if (d.candles) {
      const spots: [number, number][] = [];
      const [x0, x1] = bboxX(base), L = Math.min(d.K, d.N - 1);
      for (let i = 0; i < L; i++) {
        const x = x0 + ((i + 1) * (x1 - x0)) / (L + 1);
        for (const y of [0.32, 0.42, 0.58, 0.68]) spots.push([x, y]);
      }
      for (const a of [0, Math.PI / 2, Math.PI / 4, (3 * Math.PI) / 4, Math.PI / 3, (2 * Math.PI) / 3])
        for (const rr of [-0.22, -0.15, 0.15, 0.22]) spots.push([0.5 + Math.cos(a) * rr, 0.5 + Math.sin(a) * rr]);
      for (let i = spots.length - 1; i > 0; i--) {
        const j = Math.floor(r() * (i + 1));
        [spots[i], spots[j]] = [spots[j], spots[i]];
      }
      // 답을 넉넉한 폭으로 다시 그어 닿는 자리를 뺀다
      const test = newBoard(base, tier);
      test.tp = spots.map(([x, y]) => ({ k: 'candle' as TK, x, y, pc: 1, on: true, tier: false }));
      let tb = test;
      for (const Ln of sol.lines) tb = applyCut(tb, Ln, 0.03)?.b ?? tb;
      let n = 0;
      for (let i = 0; i < spots.length && n < d.candles; i++) {
        const [x, y] = spots[i];
        if (!tb.tp[i].on || !inPoly(base, x, y) || edgeDist(base, x, y) < 0.05) continue;
        if (tp.some((t) => Math.hypot(t.x - x, t.y - y) < 0.07)) continue;
        tp.push({ k: 'candle', x, y, pc: 1, on: true, tier: false });
        n++;
      }
      if (n < d.candles) continue;
    }
    // 크림 꽃(장식): 가장자리 둘레
    {
      const per = perimeterPts(base, d.shape === 'heart' ? 14 : d.shape === 'round' ? 12 : 14, 0.045);
      for (const [x, y] of per) if (!tp.some((t) => Math.hypot(t.x - x, t.y - y) < 0.05)) tp.push({ k: 'rose', x, y, pc: 1, on: true, tier: false });
    }
    if (tierC) for (const t of tp) t.tier = Math.hypot(t.x - tierC[0], t.y - tierC[1]) < tierC[2];
    const board = newBoard(base, tier);
    board.tp = tp;
    // 확인: 답이 별을 다 딴다
    let bb = board;
    for (const Ln of sol.lines) bb = applyCut(bb, Ln)?.b ?? bb;
    const J = judge(bb, d);
    if (J.fail || J.got < d.stars.length) continue;
    lv = { base, tier, tierC, board, sol: sol.lines, tries: attempt };
  }
  if (!lv) {
    const base = shapeOf(d, r);
    lv = { base, tier: null, tierC: null, board: newBoard(base, null), sol: [], tries: 60, fb: true };
  }
  levelCache.set(key, lv);
  if (levelCache.size > 600) levelCache.delete(levelCache.keys().next().value!);
  return lv;
}
function bboxX(P: Poly): [number, number] {
  let a = 1e9, z = -1e9;
  for (let i = 0; i < P.length; i += 2) (a = Math.min(a, P[i])), (z = Math.max(z, P[i]));
  return [a, z];
}
/** 둘레를 따라 안쪽으로 inset만큼 들어온 점 n개 */
function perimeterPts(P: Poly, n: number, inset: number): [number, number][] {
  const len: number[] = [];
  let tot = 0;
  for (let i = 0; i < P.length; i += 2) {
    const j = (i + 2) % P.length, l = Math.hypot(P[j] - P[i], P[j + 1] - P[i + 1]);
    len.push(l);
    tot += l;
  }
  const out: [number, number][] = [], [cx, cy] = centroid(P);
  for (let k = 0; k < n; k++) {
    let s = ((k + 0.5) / n) * tot, i = 0;
    while (s > len[i]) (s -= len[i]), i++;
    const a = 2 * i, b = (2 * i + 2) % P.length, t = s / len[i];
    const x = P[a] + (P[b] - P[a]) * t, y = P[a + 1] + (P[b + 1] - P[a + 1]) * t, dl = Math.hypot(cx - x, cy - y);
    const px = x + ((cx - x) / dl) * inset, py = y + ((cy - y) / dl) * inset;
    if (inPoly(P, px, py) && edgeDist(P, px, py) > inset * 0.6) out.push([px, py]);
  }
  return out;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
type Mood = 'idle' | 'watch' | 'wow' | 'happy' | 'sad' | 'angry' | 'smug';
/** 조각의 눈에 보이는 움직임(논리 자리 + 출렁임) */
interface PV { dx: number; dy: number; vx: number; vy: number; rot: number; vr: number; jig: number; born: number; m: number; tl: number; tlv: number; ax: number; ay: number; serve: null | { t0: number; x0: number; y0: number; x1: number; y1: number } }
interface TV { z: number; vz: number; wob: number; wv: number }
interface Frag { k: TK; x: number; y: number; z: number; vx: number; vy: number; vz: number; a: number; va: number; side: number; t: number; tip: number }
interface Smear { x0: number; y0: number; x1: number; y1: number; t: number; nx: number; ny: number }
interface Guest { kind: Animal; x: number; y: number; mood: Mood; moodT: number; say: string; sayT: number; hop: number; hv: number; share: number; next: null | { mood: Mood; say: string; at: number } }
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
export interface CakeState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'serve' | 'result'; pt: number;
  L: Level; B: Board; cutsLeft: number; cutsUsed: number; lock: number; serveAt: number;
  down: boolean; stroke: null | { x0: number; y0: number; x1: number; y1: number; pts: number[]; t0: number }; ax: number; ay: number;
  pv: Map<number, PV>; tv: TV[]; fr: Frag[]; sm: Smear[]; guests: Guest[];
  J: Judge | null; ok: boolean; why: string; got: number; hearts: number; stars: number; pts: number; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  wowN: number; everCut: boolean; slow: number; boom: null | { t: number; x: number; y: number; n: number; text: string }; idleT: number;
}
const SERVE_T = 110, RESULT_OK = 175, RESULT_FAIL = 160, NEWS_T = 200;
const ev = (s: CakeState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function see(s: CakeState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
/** 화면 세로(0~1, 캔버스 높이 기준) → 케이크 윗면 평면 좌표 v, 그 반대 */
const toV = (py: number) => 0.5 + (py * A - YC + HC) / SQ;
const toPy = (v: number) => (YC + (v - 0.5) * SQ - HC) / A;
const SEATS: Record<number, number[]> = { 2: [0.3, 0.7], 3: [0.19, 0.5, 0.81], 4: [0.13, 0.377, 0.623, 0.87] };
const PLATE_V = -0.1;

function newStage(s: CakeState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.B = cloneB(s.L.board);
  s.cutsLeft = d.K;
  s.cutsUsed = 0;
  s.pv = new Map();
  for (const p of s.B.pcs) s.pv.set(p.id, mkPV(s, p, s.t - 100));
  s.tv = s.B.tp.map(() => ({ z: 0, vz: 0, wob: 0, wv: 0 }));
  s.fr = [];
  s.sm = [];
  const xs = SEATS[d.N];
  s.guests = d.guests.map((kind, g) => ({ kind, x: xs[g], y: g === 0 || g === d.N - 1 ? 0.345 : 0.325, mood: 'idle', moodT: s.t, say: '', sayT: -999, hop: 0, hv: 0, share: d.shares[g], next: null }));
  s.phase = 'play';
  s.pt = 0;
  s.lock = s.t + 20;
  s.serveAt = 0;
  s.startT = s.t;
  s.J = null;
  s.got = 0;
  s.stroke = null;
  s.boom = null;
  s.idleT = s.t;
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.5);
}
function mkPV(s: CakeState, p: Pc, born: number): PV {
  // 눈에 보이는 무게: 케이크 반쪽 = 1 (작은 조각일수록 휙 미끄러지고 더 흔들린다)
  return { dx: 0, dy: 0, vx: 0, vy: 0, rot: 0, vr: 0, jig: 0, born, m: Math.max(0.55, Math.min(1.3, Math.sqrt(p.w / (s.B.W0 / 2)))), tl: 0, tlv: 0, ax: 0, ay: 0, serve: null };
}
const setMood = (s: CakeState, g: Guest, m: Mood, say = '') => ((g.mood = m), (g.moodT = s.t), say && ((g.say = say), (g.sayT = s.t)));

/** 칼질: 획의 시작·끝을 잇는 직선 */
function tryCut(s: CakeState) {
  const st = s.stroke!, d = STAGES[s.stage];
  const dx = st.x1 - st.x0, dy = st.y1 - st.y0, len = Math.hypot(dx, dy);
  if (len < 0.06) return void ev(s, 'short', st.x1, st.y1, '쓱 길게 그어요!', '#fff3df');
  const L: Line = { nx: -dy / len, ny: dx / len, c: 0 };
  L.c = L.nx * st.x0 + L.ny * st.y0;
  const r = applyCut(s.B, L);
  if (!r) return void ev(s, 'miss', st.x1, st.y1, '케이크 위를 지나가게!', '#fff3df');
  const old = s.B;
  s.B = r.b;
  // 떨어진 얹은 것 → 조각(파편)
  for (const i of r.hit) {
    const t = old.tp[i], p = old.pcs.find((q) => q.id === t.pc)!, pv = s.pv.get(p.id);
    const wx = t.x + p.ox + (pv?.dx ?? 0), wy = t.y + p.oy + (pv?.dy ?? 0), z0 = HC + (t.tier ? HT : 0);
    if (t.k === 'candle') s.fr.push({ k: 'candle', x: wx, y: wy, z: z0, vx: L.nx * 0.004, vy: L.ny * 0.004, vz: 0.012, a: 0, va: 0.11, side: L.nx * 0.3 + L.ny > 0 ? 1 : -1, t: s.t, tip: 0 });
    else
      for (const sd of [-1, 1])
        s.fr.push({ k: t.k, x: wx + sd * L.nx * 0.01, y: wy + sd * L.ny * 0.01, z: z0, vx: sd * L.nx * (0.007 + s.rng() * 0.004), vy: sd * L.ny * (0.007 + s.rng() * 0.004), vz: 0.022 + s.rng() * 0.01, a: 0, va: sd * (0.15 + s.rng() * 0.1), side: sd, t: s.t, tip: 0 });
    ev(s, 'hit-' + t.k, wx, wy, t.k === 'berry' ? '딸기 반쪽!' : t.k === 'candle' ? '앗, 초가!' : undefined, t.k === 'berry' ? '#ffd0d6' : '#fff1c8');
    if (t.k !== 'rose') {
      const g = s.guests.reduce((m, q) => (Math.abs(q.x - wx) < Math.abs(m.x - wx) ? q : m));
      setMood(s, g, 'sad', t.k === 'berry' ? '내 딸기!' : '초가 쓰러졌어!');
    }
  }
  if (s.fr.length > 40) s.fr.splice(0, s.fr.length - 40);
  // 칼이 지난 자리에 크림 자국 (조각마다 단면 양 끝)
  for (const sp of r.split) {
    const cl = L.c - (L.nx * sp.from.ox + L.ny * sp.from.oy);
    let lo = 1e9, hi = -1e9;
    for (let i = 0; i < sp.from.P.length; i += 2) {
      const j = (i + 2) % sp.from.P.length, a = L.nx * sp.from.P[i] + L.ny * sp.from.P[i + 1] - cl, b = L.nx * sp.from.P[j] + L.ny * sp.from.P[j + 1] - cl;
      if (a <= 0 !== b <= 0) {
        const q = a / (a - b), x = sp.from.P[i] + (sp.from.P[j] - sp.from.P[i]) * q, y = sp.from.P[i + 1] + (sp.from.P[j + 1] - sp.from.P[i + 1]) * q, tt = -L.ny * x + L.nx * y;
        lo = Math.min(lo, tt), hi = Math.max(hi, tt);
      }
    }
    if (lo < hi) {
      const bx = L.nx * cl + sp.from.ox, by = L.ny * cl + sp.from.oy;
      s.sm.push({ x0: bx - L.ny * lo, y0: by + L.nx * lo, x1: bx - L.ny * hi, y1: by + L.nx * hi, t: s.t, nx: L.nx, ny: L.ny });
    }
  }
  if (s.sm.length > 12) s.sm.shift();
  // 조각 움직임: 새 조각은 부모의 출렁임을 물려받고, 논리 자리가 벌어진 만큼 눈에 보이는 자리는 그대로 두었다가 미끄러져 간다
  const npv = new Map<number, PV>();
  for (const sp of r.split) {
    const par = s.pv.get(sp.from.id);
    for (const c of sp.into) {
      const v = mkPV(s, c, s.t);
      if (par) (v.dx = par.dx), (v.dy = par.dy), (v.vx = par.vx), (v.vy = par.vy), (v.rot = par.rot), (v.tl = par.tl), (v.tlv = par.tlv), (v.ax = par.ax), (v.ay = par.ay);
      npv.set(c.id, v);
    }
    for (const cr of sp.crumbs) ev(s, 'crumb', cr.cx + cr.ox, cr.cy + cr.oy, '부스러기…', '#fff3df');
  }
  for (const p of s.B.pcs) {
    const v = npv.get(p.id) ?? s.pv.get(p.id) ?? mkPV(s, p, s.t), sd = r.shift.get(p.id) ?? 0;
    if (sd) {
      v.dx -= (sd * L.nx * GAP) / 2;
      v.dy -= (sd * L.ny * GAP) / 2;
      const push = 0.0095 / Math.sqrt(v.m);
      v.vx += sd * L.nx * push;
      v.vy += sd * L.ny * push;
      // 칼금 바깥쪽으로 윗면이 쏠렸다가 흔들흔들 돌아온다
      v.ax = sd * L.nx;
      v.ay = sd * L.ny;
      v.tl = 0;
      v.tlv = 0.075 / v.m;
      // 지렛대: 칼 줄에서 먼 조각일수록 살짝 돈다
      const lev = -L.ny * (p.cx + p.ox) + L.nx * (p.cy + p.oy) - (-L.ny * 0.5 + L.nx * 0.5);
      v.vr += (sd * lev * 0.012) / v.m;
      v.jig = 1;
    }
    npv.set(p.id, v);
  }
  s.pv = npv;
  // 얹은 것들이 통 튄다
  for (let i = 0; i < s.B.tp.length; i++) {
    const t = s.B.tp[i];
    if (!t.on || !r.shift.has(t.pc)) continue;
    const m = s.pv.get(t.pc)!.m;
    s.tv[i].vz = Math.max(s.tv[i].vz, (0.009 + s.rng() * 0.004) / Math.sqrt(m));
    s.tv[i].wv += (s.rng() - 0.5) * 0.2;
  }
  if (r.nNew === 0) {
    s.events.push({ t: s.t, kind: 'shave', x: st.x1, y: st.y1, text: '살짝 깎였어요 — 더 깊이!', col: '#fff3df' });
    return;
  }
  s.cutsLeft--;
  s.cutsUsed++;
  s.everCut = true;
  s.lock = s.t + 30;
  s.slow = 8;
  const mx = (st.x0 + st.x1) / 2, my = (st.y0 + st.y1) / 2;
  const n = s.B.pcs.length;
  const big = s.cutsUsed === 1 || r.nNew >= 2;
  if (big) s.wowN++;
  s.boom = { t: s.t, x: mx, y: my, n: r.nNew, text: r.nNew >= 2 ? `한 번에 ${r.nNew + 1}조각!` : '쩍!' };
  ev(s, 'cut', mx, my, undefined, undefined, r.nNew);
  if (r.nNew >= 2) see(s, 'multi', `✂️ 칼 한 번에 ${r.nNew + 1}조각 — 지나간 조각은 다 갈라져요`);
  if (r.hit.some((i) => old.tp[i].k === 'berry')) see(s, 'halfberry', '🍓 칼에 닿은 딸기는 반쪽 — 아무도 못 먹어요');
  for (const g of s.guests) {
    if (g.moodT !== s.t) setMood(s, g, 'wow');
    g.hv = 0.012 + s.rng() * 0.006;
  }
  if (n >= d.N || s.cutsLeft <= 0) s.serveAt = s.t + 62;
}

function beginServe(s: CakeState) {
  const d = STAGES[s.stage], J = judge(s.B, d);
  s.J = J;
  s.phase = 'serve';
  s.pt = 0;
  s.serveAt = 0;
  // 한 조각씩 받은 손님끼리는 왼쪽부터 짝지어 날아가게 (크기 판정은 그대로)
  const solo = new Map<number, number[]>();
  for (const [id, g] of J.owner) solo.set(g, [...(solo.get(g) ?? []), id]);
  const ones1 = [...solo.entries()].filter(([g, ids]) => ids.length === 1 && d.shares[g] === 1);
  const gx = ones1.map(([g]) => g).sort((a, b) => s.guests[a].x - s.guests[b].x);
  const px = ones1.map(([, ids]) => ids[0]).sort((a, b) => wx(s, a) - wx(s, b));
  gx.forEach((g, k) => J.owner.set(px[k], g));
  let k = 0;
  const cnt = new Map<number, number>();
  for (const p of s.B.pcs.slice().sort((a, b) => wx(s, a.id) - wx(s, b.id))) {
    const g = J.owner.get(p.id)!, v = s.pv.get(p.id)!, j = cnt.get(g) ?? 0;
    cnt.set(g, j + 1);
    v.serve = { t0: s.t + 6 + k * 7, x0: p.cx + p.ox + v.dx, y0: p.cy + p.oy + v.dy, x1: s.guests[g].x + (j - 0.5 * ((solo.get(g)?.length ?? 1) - 1)) * 0.07, y1: PLATE_V };
    k++;
  }
  // 손님 반응: 몫을 견줘 본다
  const mean = J.q.reduce((a, x) => a + x, 0) / d.N;
  const minB = Math.min(...J.berries), at = s.t + 46;
  const later = (g: Guest, mood: Mood, say: string) => {
    g.next = { mood, say, at };
    setMood(s, g, 'watch');
  };
  s.guests.forEach((g, i) => {
    const r = J.q[i] / mean;
    if (J.fail === 'empty' && J.tot[i] === 0) later(g, 'sad', '내 건 없어?!');
    else if (r < 0.93) later(g, J.fail ? 'angry' : 'sad', '내 게 작아!');
    else if (r > 1.07) later(g, 'smug', d.shares[i] > 1 ? '곰은 두 배!' : '우와 커!');
    else if (d.stars.includes('berry') && J.berries[i] < d.shares[i] * (d.berries / d.shares.reduce((a, x) => a + x, 0)) && minB < J.berries.reduce((a, x) => Math.max(a, x), 0)) later(g, 'angry', '딸기 없어!');
    else later(g, 'happy', J.ratio <= 1.06 ? '똑같다!' : '냠!');
  });
}
const wx = (s: CakeState, id: number) => {
  const p = s.B.pcs.find((q) => q.id === id)!;
  return p.cx + p.ox;
};

function finish(s: CakeState) {
  const d = STAGES[s.stage], J = s.J!;
  s.phase = 'result';
  s.pt = 0;
  if (!J.fail) {
    s.ok = true;
    s.got = J.got;
    s.stars += J.got;
    s.pts += J.got * 100 + 40 + Math.max(0, Math.round((1.3 - J.ratio) * 200));
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += 150);
    ev(s, 'clear', 0.5, 0.5, undefined, undefined, J.got);
    if (J.got >= d.stars.length) s.wowN++;
    for (const g of s.guests) if (g.mood === 'happy' || g.mood === 'smug') g.hv = 0.016;
  } else {
    s.ok = false;
    s.hearts--;
    s.tries++;
    s.why = J.fail === 'empty' ? '빈 접시가 있어요!' : '너무 불공평해요!';
    ev(s, 'fail', 0.5, 0.5);
    see(s, 'fail', '💔 너무 불공평하면 하트 -1 — 같은 케이크를 다시');
  }
}

function physics(s: CakeState) {
  const sf = s.slow > 0 ? 0.35 : 1;
  if (s.slow > 0) s.slow--;
  for (const [, v] of s.pv) {
    if (v.serve) continue;
    const k = 0.03, c = 0.13;
    v.vx += ((-k * v.dx - c * v.vx) / v.m) * sf;
    v.vy += ((-k * v.dy - c * v.vy) / v.m) * sf;
    v.tlv += ((-0.07 * v.tl - 0.09 * v.tlv) / v.m) * sf;
    v.tl += v.tlv * sf;
    v.dx += v.vx * sf;
    v.dy += v.vy * sf;
    v.vr += ((-0.02 * v.rot - 0.16 * v.vr) / v.m) * sf;
    v.rot += v.vr * sf;
    v.jig *= 1 - 0.04 * sf;
  }
  for (const tv of s.tv) {
    tv.z += tv.vz * sf;
    tv.vz -= 0.0016 * sf;
    if (tv.z <= 0) {
      tv.z = 0;
      tv.vz = tv.vz < -0.004 ? -tv.vz * 0.35 : 0;
    }
    tv.wv += (-0.05 * tv.wob - 0.08 * tv.wv) * sf;
    tv.wob += tv.wv * sf;
  }
  for (const f of s.fr) {
    const g = groundAt(s, f.x, f.y);
    f.x += f.vx * sf;
    f.y += f.vy * sf;
    f.z += f.vz * sf;
    f.vz -= 0.0018 * sf;
    f.a += f.va * sf;
    if (f.k === 'candle') f.tip = Math.min(Math.PI / 2, f.tip + 0.09 * sf);
    const g2 = groundAt(s, f.x, f.y);
    if (g2 > f.z + 0.004 && g < g2) {
      // 조각 옆면에 부딪힘
      f.x -= f.vx * sf;
      f.y -= f.vy * sf;
      f.vx *= -0.4;
      f.vy *= -0.4;
    } else if (f.z <= g2) {
      f.z = g2;
      if (f.vz < -0.005) f.vz = -f.vz * 0.32;
      else f.vz = 0;
      f.vx *= 0.86;
      f.vy *= 0.86;
      f.va *= 0.8;
    }
    // 탁자 밖으로는 못 나간다
    f.x = Math.max(0.04, Math.min(0.96, f.x));
    f.y = Math.max(-0.12, Math.min(1.12, f.y));
  }
  for (const g of s.guests) {
    if (g.next && s.t >= g.next.at) {
      setMood(s, g, g.next.mood, g.next.say);
      if (g.next.mood === 'happy' || g.next.mood === 'smug') g.hv = 0.014;
      g.next = null;
    }
    g.hop += g.hv;
    g.hv -= 0.0016;
    if (g.hop <= 0) (g.hop = 0), (g.hv = 0);
  }
}
/** 그 자리 바닥 높이: 조각 위면 케이크 높이(위층이면 더), 아니면 접시·탁자 */
function groundAt(s: CakeState, x: number, y: number) {
  for (const p of s.B.pcs) {
    const v = s.pv.get(p.id);
    if (!v || v.serve) continue;
    const u = x - p.ox - v.dx, w = y - p.oy - v.dy;
    if (inPoly(p.P, u, w)) return HC + (s.B.tier && inPoly(s.B.tier, u, w) ? HT : 0);
  }
  return 0;
}

export const cakecut: GameDef<CakeState> & { wows(s: CakeState): number } = {
  id: 'cakecut',
  name: '✂️ 동물 손님 케이크 자르기',
  genes: ['slice', 'depth'],
  twist: '칼은 그은 줄을 따라 케이크 끝까지 지나가서 이미 갈라진 조각까지 한꺼번에 가른다 — 두 줄이 엇갈리면 조각이 곱절로 늘고, 딸기·초·위층이 얹히면 "가운데"가 더는 공평한 자리가 아니다',
  rules: ['케이크 위를 쓱 그으면 그 줄대로 끝까지 잘려요 — 줄이 엇갈리면 조각이 늘어요.', '칼 수 안에 손님 수만큼 똑같이 나누면 별! 너무 불공평하면 하트 -1.'],
  controls: 'touch',
  hint: '케이크 위를 쓱 그어 잘라요 / 키보드: 화살표로 칼끝을 옮기고 스페이스를 누른 채 화살표로 긋기',
  aspect: A,
  art: {
    concept: '동물 손님들의 생일 파티 식탁',
    mood: '햇살 드는 파티 방, 깃발 줄과 풍선 아래 체크무늬 식탁 — 크림이 출렁이는 층층 케이크와 고깔모자 쓴 동물 손님들이 포크를 들고 기다린다.',
    palette: { bg: '#fff1dc', ink: '#5a2e1e', muted: '#b98a6a', accent: '#ff7aa5', hot: '#e8475f', soft: '#ffe3c2' },
  },
  reveals: (s) => s.seen.size,
  guard: (s) => s.B.tp.filter((t) => t.on && t.k !== 'rose').length,
  cleared: (s) => (s.phase === 'result' && s.ok ? { stage: s.stage, got: s.got, of: STAGES[s.stage].stars.length } : null),
  wows: (s) => s.wowN,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      cutsLeft: 0, cutsUsed: 0, lock: 0, serveAt: 0, down: false, stroke: null, ax: 0.5, ay: 0.5,
      pv: new Map(), tv: [], fr: [], sm: [], guests: [],
      J: null, ok: false, why: '', got: 0, hearts: 3, stars: 0, pts: 0, won: false, dead: false, tries: 0,
      seen: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0, wowN: 0, everCut: false, slow: 0, boom: null, idleT: 0,
    } as unknown as CakeState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 200)) s.events = s.events.filter((e) => s.t - e.t < 200);
    physics(s);
    for (const g of s.guests) if ((g.mood === 'wow' || g.mood === 'watch' || g.mood === 'sad') && s.t - g.moodT > (g.mood === 'sad' ? 110 : 50) && s.phase === 'play') g.mood = 'idle';
    if (s.phase === 'result') {
      const skip = !!p && !s.down && s.pt > 50;
      s.down = !!p;
      if (skip || s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else newStage(s);
      }
      return;
    }
    if (s.phase === 'serve') {
      s.down = !!p;
      if (s.pt >= SERVE_T) finish(s);
      return;
    }
    if (p) {
      const u = p.x, v = toV(p.y);
      if (!s.down) {
        if (s.t >= s.lock && s.serveAt === 0) {
          s.stroke = { x0: u, y0: v, x1: u, y1: v, pts: [u, v], t0: s.t };
          for (const g of s.guests) if (g.mood === 'idle') setMood(s, g, 'watch');
        }
      } else if (s.stroke) {
        const st = s.stroke, n = st.pts.length;
        st.x1 = u;
        st.y1 = v;
        if (Math.hypot(u - st.pts[n - 2], v - st.pts[n - 1]) > 0.008) {
          st.pts.push(u, v);
          if (st.pts.length > 200) st.pts.splice(0, 2);
        }
      }
      s.ax = u;
      s.ay = v;
      s.idleT = s.t;
    }
    if (release && s.stroke) {
      tryCut(s);
      s.stroke = null;
    }
    s.down = !!p;
    if (s.serveAt > 0 && s.t >= s.serveAt) beginServe(s);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const STEPS = 6;
interface Mem { key: string; p0: [number, number]; p1: [number, number]; k: number; done: number }
/** 직선 → 화면 위 획 두 끝 (케이크 가운데를 지나는 쪽으로, 화면 안에) */
function strokeOf(L: Line): [[number, number], [number, number]] {
  const d0 = L.nx * 0.5 + L.ny * 0.5 - L.c, qx = 0.5 - L.nx * d0, qy = 0.5 - L.ny * d0, tx = -L.ny, ty = L.nx;
  let half = 0.44;
  const inside = (u: number, v: number) => u > 0.02 && u < 0.98 && toPy(v) > 0.02 && toPy(v) < 0.98;
  while (half > 0.12 && !(inside(qx - tx * half, qy - ty * half) && inside(qx + tx * half, qy + ty * half))) half -= 0.02;
  return [[qx - tx * half, toPy(qy - ty * half)], [qx + tx * half, toPy(qy + ty * half)]];
}
function strokeBot(name: string, pick: (s: CakeState) => Line | null, mem: WeakMap<object, Mem>): Bot<CakeState> {
  return {
    name,
    act(s) {
      const m = mem.get(s);
      if (m && m.k >= 1 && m.k <= STEPS) {
        const q = m.k / STEPS;
        m.k++;
        return { tap: false, dir: 0, pointer: { x: m.p0[0] + (m.p1[0] - m.p0[0]) * q, y: m.p0[1] + (m.p1[1] - m.p0[1]) * q } };
      }
      if (m && m.k === STEPS + 1) {
        m.k++;
        m.done = s.t;
        return NO;
      }
      if (s.phase !== 'play' || s.serveAt > 0 || s.t < s.lock + 4 || s.t - s.startT < 36) return NO;
      const key = `${s.stage}:${s.tries}:${s.cutsUsed}:${s.B.pcs.length}:${s.B.lost.toFixed(5)}`;
      if (m && m.key === key && s.t - m.done < 40) return NO;
      const L = pick(s);
      if (!L) return NO;
      const [p0, p1] = strokeOf(L);
      mem.set(s, { key, p0, p1, k: 2, done: -1 });
      return { tap: false, dir: 0, pointer: { x: p0[0], y: p0[1] } };
    },
  };
}
const planCache = new Map<string, Line | null>();
export function smartLine(s: CakeState): Line | null {
  const b = s.B, sig = `${s.seed}:${s.stage}:${s.cutsLeft}:` + b.pcs.map((p) => `${p.w.toFixed(6)},${p.ox.toFixed(4)},${p.oy.toFixed(4)}`).join('|') + ':' + b.tp.map((t) => (t.on ? 1 : 0)).join('');
  if (planCache.has(sig)) return planCache.get(sig)!;
  const L = planCut(b, STAGES[s.stage], s.cutsLeft);
  planCache.set(sig, L);
  if (planCache.size > 4000) planCache.delete(planCache.keys().next().value!);
  return L;
}
const smartMem = new WeakMap<object, Mem>();
/** 잘하는 봇: 남은 칼 수만큼 후보 직선을 실제로 잘라 보고(빔 탐색) 별·공평이 가장 좋은 줄을 긋는다 */
export const cakecutSmart: Bot<CakeState> = strokeBot('케이크 장인', smartLine, smartMem);

const habitMem = new WeakMap<object, Mem>(), habit2Mem = new WeakMap<object, Mem>();
/** 버릇 봇: 늘 케이크 가운데를 지나게, 첫 칼은 가로로 (다음 칼은 고르게 돌려서) */
export const cakecutHabit: Bot<CakeState> = strokeBot('버릇: 가운데 가로부터', (s) => {
  const d = STAGES[s.stage], Lc = Math.max(1, Math.min(d.K, Math.ceil(d.N / 2))), i = s.cutsUsed % Lc;
  const th = Math.PI / 2 + (i * Math.PI) / Lc;
  return { nx: Math.cos(th), ny: Math.sin(th), c: Math.cos(th) * 0.5 + Math.sin(th) * 0.5 };
}, habitMem);
/** 버릇 봇 2: 늘 세로 줄을 같은 간격으로 */
export const cakecutHabit2: Bot<CakeState> = strokeBot('버릇: 같은 간격 세로', (s) => {
  const d = STAGES[s.stage], Lc = Math.max(1, Math.min(d.K, d.N - 1)), [x0, x1] = bboxX(s.L.base);
  return { nx: 1, ny: 0, c: x0 + ((s.cutsUsed % Lc) + 1) * ((x1 - x0) / (Lc + 1)) };
}, habit2Mem);

const habit3Mem = new WeakMap<object, Mem>();
/** 독립 버릇 봇(측정용, 판 생성이 전혀 모르는 줄): 늘 가장 큰 조각을 30° 비스듬히 무게 반으로 */
export const cakecutHabit3: Bot<CakeState> = strokeBot('버릇: 큰 조각 비스듬히 반', (s) => {
  const big = s.B.pcs.reduce((m, p) => (p.w > m.w ? p : m));
  return solveCut(s.B, big, (2 * Math.PI) / 3, big.w / 2);
}, habit3Mem);

const dumbMem = new WeakMap<object, { next: number; k: number; n: number; p0: [number, number]; p1: [number, number] }>();
/** 못하는 봇: 아무 데나 아무 방향으로 쓱 */
export const cakecutRandom: Bot<CakeState> = {
  name: '아무렇게나 쓱',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: 20 + Math.floor(rng() * 60), k: 0, n: 0, p0: [0, 0], p1: [0, 0] }));
    if (m.k > 0) {
      if (m.k <= m.n) {
        const q = m.k / m.n;
        m.k++;
        return { tap: false, dir: 0, pointer: { x: m.p0[0] + (m.p1[0] - m.p0[0]) * q, y: m.p0[1] + (m.p1[1] - m.p0[1]) * q } };
      }
      m.k = 0;
      m.next = s.t + 20 + Math.floor(rng() * 100);
      return NO;
    }
    if (s.phase !== 'play' || s.t < m.next) return NO;
    m.p0 = [0.08 + rng() * 0.84, 0.36 + rng() * 0.38];
    m.p1 = [0.08 + rng() * 0.84, 0.36 + rng() * 0.38];
    m.n = 6 + Math.floor(rng() * 14);
    m.k = 1;
    return { tap: false, dir: 0, pointer: { x: m.p0[0], y: m.p0[1] } };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
type C2 = CanvasRenderingContext2D;
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const ease = (q: number) => 1 - (1 - Math.max(0, Math.min(1, q))) ** 3;
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const shade = (c: string, f: number) => {
  const [r, g, b] = hex(c);
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(f >= 1 ? v + (255 - v) * (f - 1) : v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
};
const rgba = (c: string, a: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${a})`;
};
/** 조각 하나를 세상에 놓는 변환 (논리 자리 + 출렁임 + 나눠 줄 때 날아감) */
interface Xf { tx: number; ty: number; cs: number; sn: number; sc: number; lift: number; cx: number; cy: number; H: number; shx: number; shy: number }
function xfOf(s: CakeState, p: Pc, v: PV): Xf {
  let tx = p.cx + p.ox + v.dx, ty = p.cy + p.oy + v.dy, sc = 1, lift = 0, rot = v.rot;
  if (v.serve) {
    const q = Math.max(0, Math.min(1, (s.t - v.serve.t0) / 34)), e = ease(q);
    tx = v.serve.x0 + (v.serve.x1 - v.serve.x0) * e;
    ty = v.serve.y0 + (v.serve.y1 - v.serve.y0) * e;
    sc = 1 - 0.6 * e;
    lift = Math.sin(Math.PI * q) * 0.13;
    rot *= 1 - e;
    if (s.phase === 'result' && s.ok) sc *= 1 - ease((s.pt - 55) / 70) * 0.85;
  }
  const age = s.t - v.born, jig = v.jig * Math.sin(age * 0.45) * 0.09 + 0.012 * Math.sin(s.t * 0.05 + p.id);
  const sh = v.serve ? 0 : Math.max(-0.45, Math.min(0.45, v.tl));
  return { tx, ty, cs: Math.cos(rot), sn: Math.sin(rot), sc, lift, cx: p.cx, cy: p.cy, H: HC * (1 + jig), shx: v.ax * sh, shy: v.ay * sh };
}
const wpt = (f: Xf, u: number, v: number): [number, number] => [f.tx + f.sc * (f.cs * (u - f.cx) - f.sn * (v - f.cy)), f.ty + f.sc * (f.sn * (u - f.cx) + f.cs * (v - f.cy))];

function drawAll(ctx: C2, s: CakeState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, d = STAGES[s.stage];
  const X = (u: number) => u * w, Yz = (v: number, z: number) => (YC + (v - 0.5) * SQ - z) * w, R = (r: number) => r * w;
  const font = (px: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, px)}px system-ui, sans-serif`);
  ctx.save();
  fx.begin(ctx);
  drawRoom(ctx, s, w, h, X, R);
  // 손님 (식탁 뒤)
  const lookU = s.stroke ? s.stroke.x1 : 0.5;
  s.guests.forEach((g, i) => drawGuestBody(ctx, g, X(g.x), R(g.y - g.hop), R(0.066) * (d.shares[i] > 1 ? 1.12 : 1), t, i, lookU));
  drawTable(ctx, s, w, X, R);
  // 손님 앞발·접시
  s.guests.forEach((g, i) => drawPlate(ctx, s, g, i, X, Yz, R));
  // 케이크 받침 · 식탁 소품
  drawStand(ctx, X, Yz, R, t);
  drawProps(ctx, X, R, t);
  // 크림 자국
  for (const m of s.sm) {
    const a = Math.min(1, (t - m.t) / 18);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,250,244,${0.75 * a})`;
    ctx.lineWidth = R(0.026) * a;
    ctx.beginPath();
    ctx.moveTo(X(m.x0), Yz(m.y0, 0));
    ctx.lineTo(X(m.x1), Yz(m.y1, 0));
    ctx.stroke();
    ctx.fillStyle = `rgba(255,250,244,${0.85 * a})`;
    for (let k = 0; k < 6; k++) {
      const q = hsh(m.t + k * 3.1), off = (hsh(m.t + k * 7.7) - 0.5) * 0.05;
      const px = m.x0 + (m.x1 - m.x0) * q + off * (m.y1 - m.y0) * 3, py = m.y0 + (m.y1 - m.y0) * q - off * (m.x1 - m.x0) * 3;
      ctx.beginPath();
      ctx.ellipse(X(px), Yz(py, 0), R(0.008 + 0.006 * hsh(k + m.t)) * a, R(0.005) * a, 0, 0, TAU);
      ctx.fill();
    }
    // 부스러기
    ctx.fillStyle = rgba(d.sponge, 0.9 * a);
    for (let k = 0; k < 7; k++) {
      const q = hsh(m.t * 1.3 + k), off = (hsh(m.t * 2.1 + k) - 0.5) * 0.09;
      ctx.beginPath();
      ctx.arc(X(m.x0 + (m.x1 - m.x0) * q - off * (m.y1 - m.y0)), Yz(m.y0 + (m.y1 - m.y0) * q + off * (m.x1 - m.x0), 0), R(0.004 + 0.003 * hsh(k)), 0, TAU);
      ctx.fill();
    }
  }
  // 조각들 (뒤에서 앞으로)
  const order = s.B.pcs.map((p) => ({ p, v: s.pv.get(p.id)!, f: xfOf(s, p, s.pv.get(p.id)!) })).sort((a, b) => a.f.ty - b.f.ty);
  for (const o of order) drawPiece(ctx, s, o.p, o.f, d, X, Yz, R, w);
  // 조각 크기 (자른 뒤): 전체에서 몇 %
  if (s.phase === 'play' && s.B.pcs.length >= 2 && !s.stroke) {
    const W = s.B.W0;
    font(R(0.036), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const o of order) {
      const age = t - o.v.born;
      if (age < 24) continue;
      const pc = Math.round((o.p.w / W) * 100), x = X(o.f.tx), y = Yz(o.f.ty, o.f.H + (s.B.tier ? HT : 0)) - R(0.01), tw = ctx.measureText(pc + '%').width + R(0.026);
      ctx.globalAlpha = Math.min(0.92, (age - 24) / 12);
      ctx.fillStyle = 'rgba(90,40,30,.78)';
      ctx.beginPath();
      ctx.roundRect(x - tw / 2, y - R(0.022), tw, R(0.044), R(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(pc + '%', x, y + 1);
      ctx.globalAlpha = 1;
    }
    ctx.textBaseline = 'alphabetic';
  }
  // 떨어진 것들
  for (const f of s.fr.slice().sort((a, b) => a.y - b.y)) drawFrag(ctx, f, d, X(f.x), Yz(f.y, f.z), R, t);
  // 크림 실: 갈라지는 두 쪽 사이로 늘어났다 툭 끊긴다
  for (const m of s.sm) {
    const age = t - m.t;
    if (age > 26 || age < 1) continue;
    const gap = Math.min(1, age / 14) * GAP * 0.5, a = age < 18 ? 1 : (26 - age) / 8;
    for (let k = 0; k < 4; k++) {
      const q = 0.18 + 0.64 * hsh(m.t + k * 2.7), px = m.x0 + (m.x1 - m.x0) * q, py = m.y0 + (m.y1 - m.y0) * q;
      const ax = X(px - m.nx * gap), ay = Yz(py - m.ny * gap, HC * (0.5 + 0.12 * k)), bx = X(px + m.nx * gap), by = Yz(py + m.ny * gap, HC * (0.5 + 0.12 * k));
      const sag = R(0.01 + 0.018 * Math.min(1, age / 16)), thin = Math.max(0.6, R(0.009) * (1 - age / 30));
      ctx.strokeStyle = `rgba(255,253,248,${a})`;
      ctx.lineWidth = thin;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      if (age < 18 || k % 2) ctx.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + sag, bx, by);
      else (ctx.lineTo(ax + (bx - ax) * 0.3, ay + (by - ay) * 0.3 + sag), ctx.moveTo(bx, by), ctx.lineTo(bx + (ax - bx) * 0.3, by + (ay - by) * 0.3 + sag));
      ctx.stroke();
    }
  }
  // 갓 그은 칼금: 한순간 번쩍
  for (const m of s.sm) {
    const age = t - m.t;
    if (age > 14) continue;
    const a = 1 - age / 14, ext = 0.04;
    const L = Math.hypot(m.x1 - m.x0, m.y1 - m.y0) || 1, ux = (m.x1 - m.x0) / L, uy = (m.y1 - m.y0) / L;
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,250,220,${0.5 * a})`;
    ctx.lineWidth = R(0.03) * a + 1;
    ctx.beginPath();
    ctx.moveTo(X(m.x0 - ux * ext), Yz(m.y0 - uy * ext, HC));
    ctx.lineTo(X(m.x1 + ux * ext), Yz(m.y1 + uy * ext, HC));
    ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = R(0.008) * a + 1;
    ctx.stroke();
  }
  // 칼질
  if (s.stroke && s.phase === 'play') drawStroke(ctx, s, d, X, Yz, R, font);
  // 처음: 손가락 시범
  if (!s.everCut && s.phase === 'play' && !s.stroke) drawDemo(ctx, s, X, Yz, R, font);
  else if (s.phase === 'play' && !s.stroke && s.serveAt === 0 && t - s.idleT > 420 && s.cutsUsed === 0) drawDemo(ctx, s, X, Yz, R, font, true);
  // 쩍!
  if (s.boom && t - s.boom.t < 46) {
    const age = t - s.boom.t, b = s.boom, sc = age < 6 ? 0.6 + age * 0.12 : 1.32 - Math.min(0.32, (age - 6) * 0.02);
    const x = Math.max(R(0.2), Math.min(w - R(0.2), X(b.x))), y = Math.min(Yz(b.y, HC) - R(0.07), Yz(0.5, HC + 0.12));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.12 + 0.03 * Math.sin(age * 0.7));
    ctx.scale(sc, sc);
    ctx.globalAlpha = Math.min(1, (46 - age) / 12);
    // 효과선
    ctx.strokeStyle = '#fff6c8';
    ctx.lineWidth = 3;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * TAU + 0.2, r0 = R(0.075) + age * 0.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0 * 0.7);
      ctx.lineTo(Math.cos(a) * (r0 + R(0.04)), Math.sin(a) * (r0 + R(0.04)) * 0.7);
      ctx.stroke();
    }
    font(b.n >= 2 ? R(0.07) : R(0.12), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#7a2b1e';
    ctx.strokeText(b.text, 0, 0);
    ctx.fillStyle = b.n >= 2 ? '#ffe14d' : '#ffffff';
    ctx.fillText(b.text, 0, 0);
    ctx.restore();
  }
  // 사건 연출
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT || e.t > t) continue;
    const x = X(e.x), y = Yz(e.y, HC);
    if (e.kind === 'cut') {
      fx.kick(5 + 2 * (e.v ?? 1));
      // 칼금 따라 부스러기·크림이 튄다
      for (const m of s.sm)
        if (m.t === e.t)
          for (let k = 0; k <= 4; k++) {
            const q = k / 4, px = X(m.x0 + (m.x1 - m.x0) * q), py = Yz(m.y0 + (m.y1 - m.y0) * q, HC);
            fx.burst(px, py, d.sponge, 7, 3.4, 2.8);
            fx.burst(px, py, '#ffffff', 5, 2.8, 2.6);
            fx.burst(px, py, d.frost2, 3, 2.4, 2.2);
          }
      fx.ring(x, y, '#fff6c8', R(0.22), 5);
      if ((e.v ?? 1) >= 2) fx.blink('#fff6c8', 0.28);
    }
    if (e.kind === 'hit-berry') fx.burst(x, y, '#ff4d6a', 16, 3.2, 2.4), fx.pop(x, y - R(0.06), e.text!, e.col!, 15);
    if (e.kind === 'hit-candle') fx.burst(x, y - R(0.06), '#cfcfcf', 14, 1.8, 3), fx.pop(x, y - R(0.1), e.text!, e.col!, 15), fx.kick(4);
    if (e.kind === 'hit-rose') fx.burst(x, y, '#ffffff', 16, 3, 3);
    if (e.kind === 'crumb') fx.burst(x, y, d.sponge, 10, 2, 1.8), fx.pop(x, y - R(0.05), e.text!, e.col!, 13);
    if (e.kind === 'miss' || e.kind === 'short' || e.kind === 'shave') fx.pop(Math.max(R(0.25), Math.min(w - R(0.25), x)), Math.max(Yz(0.2, HC), Math.min(Yz(0.85, HC), y)), e.text!, e.col!, 15);
    if (e.kind === 'stage') fx.blink('#fff6e0', 0.2);
    if (e.kind === 'clear') {
      for (const [cx, col] of [[0.3, '#ff7aa5'], [0.5, '#ffd23a'], [0.7, '#7ad0ff']] as const) fx.burst(X(cx), Yz(0.45, HC), col, 26, 5.5, 3);
      fx.ring(X(0.5), Yz(0.5, 0.05), '#ffe066', R(0.4), 6);
      fx.blink('#fff6c8', 0.22);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  // 냠냠
  if (s.phase === 'result' && s.ok && s.pt === 60 && (fx.memo.yum ?? -1) !== s.clearT) {
    fx.memo.yum = s.clearT;
    for (const g of s.guests) fx.pop(X(g.x), R(0.5), '냠냠!', '#fff6c8', 15), fx.burst(X(g.x), R(0.52), d.sponge, 8, 2, 1.8);
  }
  // 나눠 줄 때 접시에 '탁'
  for (const o of order) {
    const sv = o.v.serve;
    if (sv && t - sv.t0 === 34) {
      fx.burst(X(sv.x1), Yz(sv.y1, 0.02), '#ffffff', 10, 2.2, 2);
      fx.burst(X(sv.x1), Yz(sv.y1, 0.02), d.sponge, 8, 2, 1.8);
    }
  }
  // 실패: 손님들이 투닥투닥 (웃음)
  if (!s.ok && s.phase === 'result' && s.J && s.pt > 8) {
    const J = s.J, big = J.q.indexOf(Math.max(...J.q)), small = J.q.indexOf(Math.min(...J.q));
    const cx = X(s.guests[small].x + (s.guests[big].x - s.guests[small].x) * 0.28), cy = R(0.33), age = s.pt - 8, rr = R(0.09) + Math.sin(age * 0.6) * R(0.006);
    ctx.save();
    ctx.globalAlpha = Math.min(1, age / 8);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * TAU + age * 0.05, px = cx + Math.cos(a) * rr * 1.25, py = cy + Math.sin(a) * rr * 0.65;
      ctx.fillStyle = k % 2 ? '#f3e7dc' : '#fffaf3';
      ctx.beginPath();
      ctx.arc(px, py, rr * (0.42 + 0.08 * Math.sin(age * 0.5 + k)), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fffaf3';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr * 1.3, rr * 0.75, 0, 0, TAU);
    ctx.fill();
    // 삐져나온 팔다리·별
    ctx.strokeStyle = '#7a3a2a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + Math.sin(age * 0.4 + k) * 0.6, x0 = cx + Math.cos(a) * rr, y0 = cy + Math.sin(a) * rr * 0.6;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + Math.cos(a) * R(0.03), y0 + Math.sin(a) * R(0.02));
      ctx.stroke();
    }
    font(R(0.045), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d6304a';
    ctx.fillText(age % 20 < 10 ? '투닥투닥!' : '티격태격!', cx, cy + 1);
    ctx.fillStyle = '#ffd23a';
    for (let k = 0; k < 3; k++) {
      const a = age * 0.12 + (k * TAU) / 3;
      ctx.fillText('★', cx + Math.cos(a) * rr * 1.5, cy - rr * 0.9 + Math.sin(a) * R(0.012));
    }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
  // 손님 말풍선 (맨 위)
  s.guests.forEach((g, i) => drawSay(ctx, s, g, i, X, R, font));
  ctx.restore();
  drawHud(ctx, s, d, w, h, Yz, R, font);
}

function drawRoom(ctx: C2, s: CakeState, w: number, h: number, X: (u: number) => number, R: (r: number) => number) {
  const t = s.t;
  const wall = ctx.createLinearGradient(0, 0, 0, R(0.5));
  wall.addColorStop(0, '#ffe9cf');
  wall.addColorStop(1, '#ffd9b8');
  ctx.fillStyle = wall;
  ctx.fillRect(-10, -10, w + 20, h + 20);
  // 벽지 줄
  ctx.fillStyle = 'rgba(255,190,170,.22)';
  for (let k = 0; k < 12; k++) ctx.fillRect(X(k / 12 + 0.02), 0, R(0.035), R(0.46));
  // 창문
  {
    const x0 = X(0.3), y0 = R(0.085), ww = R(0.4), hh = R(0.2);
    ctx.fillStyle = '#c98a5a';
    ctx.beginPath();
    ctx.roundRect(x0 - R(0.015), y0 - R(0.015), ww + R(0.03), hh + R(0.03), R(0.02));
    ctx.fill();
    const sky = ctx.createLinearGradient(0, y0, 0, y0 + hh);
    sky.addColorStop(0, '#8fd3ff');
    sky.addColorStop(1, '#d7f1ff');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, ww, hh);
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    for (let k = 0; k < 3; k++) {
      const cx = x0 + ((hsh(k + 3) * ww + t * 0.08 * (1 + k * 0.3)) % (ww + R(0.12))) - R(0.06), cy = y0 + hh * (0.25 + 0.2 * k);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R(0.04), R(0.014), 0, 0, TAU);
      ctx.ellipse(cx + R(0.025), cy - R(0.008), R(0.025), R(0.013), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe680';
    ctx.beginPath();
    ctx.arc(x0 + ww * 0.82, y0 + hh * 0.3, R(0.026), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#e8b07a';
    ctx.lineWidth = R(0.01);
    ctx.beginPath();
    ctx.moveTo(x0 + ww / 2, y0);
    ctx.lineTo(x0 + ww / 2, y0 + hh);
    ctx.moveTo(x0, y0 + hh / 2);
    ctx.lineTo(x0 + ww, y0 + hh / 2);
    ctx.stroke();
    // 햇살
    const g = ctx.createLinearGradient(x0, y0, x0 + ww * 0.6, R(0.9));
    g.addColorStop(0, 'rgba(255,248,210,.35)');
    g.addColorStop(1, 'rgba(255,248,210,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + hh);
    ctx.lineTo(x0 + ww, y0 + hh);
    ctx.lineTo(X(0.95), R(1.0));
    ctx.lineTo(X(0.15), R(1.0));
    ctx.fill();
  }
  // 깃발 줄
  const cols = ['#ff7aa5', '#ffd23a', '#6fd3a8', '#7ab8ff', '#ff9f4a'];
  for (const row of [0, 1]) {
    const y0 = R(0.095 + row * 0.03), sag = R(0.05);
    ctx.strokeStyle = '#a0603a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k <= 20; k++) {
      const q = k / 20, x = X(q), y = y0 + Math.sin(q * Math.PI) * sag;
      k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 9; k++) {
      const q = (k + 0.5 + row * 0.5) / 9.5;
      if (q > 1) continue;
      const x = X(q), y = y0 + Math.sin(q * Math.PI) * sag, sw = Math.sin(t * 0.04 + k) * 0.08;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sw);
      ctx.fillStyle = cols[(k + row * 2) % cols.length];
      ctx.beginPath();
      ctx.moveTo(-R(0.025), 0);
      ctx.lineTo(R(0.025), 0);
      ctx.lineTo(0, R(0.045));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.moveTo(-R(0.012), R(0.004));
      ctx.lineTo(0, R(0.004));
      ctx.lineTo(-R(0.004), R(0.02));
      ctx.fill();
      ctx.restore();
    }
  }
  // 풍선
  for (const [bx, col, ph] of [[0.06, '#ff6b8f', 0], [0.94, '#5fb8ff', 2], [0.89, '#ffd23a', 4]] as const) {
    const by = R(0.2 + 0.04 * (ph % 3)) + Math.sin(t * 0.03 + ph) * R(0.008), x = X(bx);
    ctx.strokeStyle = 'rgba(120,70,50,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, by + R(0.05));
    ctx.quadraticCurveTo(x + R(0.015), by + R(0.12), x - R(0.005), by + R(0.2));
    ctx.stroke();
    const g = ctx.createRadialGradient(x - R(0.015), by - R(0.02), R(0.005), x, by, R(0.055));
    g.addColorStop(0, shade(col, 1.45));
    g.addColorStop(1, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, by, R(0.042), R(0.052), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(x - R(0.008), by + R(0.05));
    ctx.lineTo(x + R(0.008), by + R(0.05));
    ctx.lineTo(x, by + R(0.062));
    ctx.fill();
  }
}

function drawTable(ctx: C2, s: CakeState, w: number, X: (u: number) => number, R: (r: number) => number) {
  const y0 = R(0.44), y1 = R(1.3), t = s.t;
  // 꿀색 나무 식탁 (분홍 케이크·민트 받침과 대비)
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, '#c98a52');
  g.addColorStop(0.5, '#dba26a');
  g.addColorStop(1, '#e8b47c');
  ctx.fillStyle = g;
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, y0, w, y1 - y0);
  ctx.clip();
  // 판자 이음매 (원근)
  for (let k = -4; k <= 12; k++) {
    const xt = 0.5 + (k / 8 - 0.5) * 0.8, xb = k / 8;
    ctx.strokeStyle = 'rgba(120,70,35,.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(xt), y0);
    ctx.lineTo(X(xb), y1);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,225,180,.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(X(xt) + 1.5, y0);
    ctx.lineTo(X(xb) + 1.5, y1);
    ctx.stroke();
    // 나뭇결
    ctx.strokeStyle = 'rgba(140,85,40,.16)';
    ctx.lineWidth = 1;
    for (let q = 0; q < 3; q++) {
      const fx = (q + 0.5 + hsh(k * 3 + q) * 0.6) / 3.6;
      ctx.beginPath();
      for (let yy = 0; yy <= 12; yy++) {
        const v = yy / 12, xa = xt + (xb - xt) * v, xa2 = 0.5 + ((k + 1) / 8 - 0.5) * 0.8 + ((k + 1) / 8 - (0.5 + ((k + 1) / 8 - 0.5) * 0.8)) * v;
        const x = X(xa + (xa2 - xa) * fx) + Math.sin(v * 9 + k + q) * R(0.004), y = y0 + (y1 - y0) * v;
        yy ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  }
  // 창문 햇살 반사
  const sh2 = ctx.createRadialGradient(X(0.5), R(0.75), R(0.05), X(0.5), R(0.8), R(0.75));
  sh2.addColorStop(0, `rgba(255,240,205,${0.28 + 0.03 * Math.sin(t * 0.02)})`);
  sh2.addColorStop(1, 'rgba(255,240,205,0)');
  ctx.fillStyle = sh2;
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.restore();
  // 뒤 가장자리 그림자
  const sh = ctx.createLinearGradient(0, y0, 0, y0 + R(0.05));
  sh.addColorStop(0, 'rgba(90,45,20,.4)');
  sh.addColorStop(1, 'rgba(90,45,20,0)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, y0, w, R(0.05));
  // 앞 모서리 (두께)
  ctx.fillStyle = '#a8683a';
  ctx.fillRect(0, y1, w, R(0.012));
  ctx.fillStyle = 'rgba(255,230,190,.55)';
  ctx.fillRect(0, y1 - 1, w, 1.5);
}

function drawStand(ctx: C2, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number, t: number) {
  void t;
  const cx = X(0.5), cy = Yz(0.5, 0), rx = R(0.45), ry = R(0.45 * SQ);
  ctx.fillStyle = 'rgba(150,70,70,.18)';
  ctx.beginPath();
  ctx.ellipse(cx + R(0.01), cy + R(0.03), rx * 1.02, ry * 1.05, 0, 0, TAU);
  ctx.fill();
  // 받침 두께
  ctx.fillStyle = '#7cc9b4';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.018), rx, ry, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx, cy + ry);
  g.addColorStop(0, '#d9f6ec');
  g.addColorStop(1, '#a8e3d2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  ctx.fill();
  // 레이스 받침 종이
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * TAU;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * rx * 0.93, cy + Math.sin(a) * ry * 0.93, R(0.022), R(0.014), a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 0.86, ry * 0.86, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,190,170,.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  for (let k = 0; k < 40; k++) {
    const a = (k / 40) * TAU;
    ctx.fillStyle = 'rgba(230,200,215,.7)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * rx * 0.895, cy + Math.sin(a) * ry * 0.895, R(0.004), 0, TAU);
    ctx.fill();
  }
}

/** 판 두께가 있는 다각형 (아래 z0 ~ 위 z1). 옆면: 바깥 = 크림, 자른 면 = 스펀지·크림·잼 층 */
function drawSlab(ctx: C2, s: CakeState, P: Poly, cutE: boolean[], f: Xf, z0: number, z1: number, d: StageDef, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number, top: boolean) {
  const n = P.length / 2, o = polyArea(P) > 0 ? 1 : -1;
  const W: [number, number][] = [];
  for (let i = 0; i < n; i++) W.push(wpt(f, P[2 * i], P[2 * i + 1]));
  const SX = (k: number, z: number) => X(W[k][0] + f.shx * z * f.sc);
  const SY = (k: number, z: number) => Yz(W[k][1] + f.shy * z * f.sc, z * f.sc + f.lift);
  const walls: { i: number; my: number; nx: number }[] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, dx = W[j][0] - W[i][0], dy = W[j][1] - W[i][1], L = Math.hypot(dx, dy) || 1;
    const nx = (o * dy) / L, ny = (-o * dx) / L;
    // 회전한 원래 방향으로 바깥 법선 (W는 이미 회전됨) — 원래 다각형 방향 o를 그대로 쓴다
    if (ny > 0.02) walls.push({ i, my: (W[i][1] + W[j][1]) / 2, nx });
  }
  walls.sort((a, b) => a.my - b.my);
  const hgt = z1 - z0, t = s.t;
  for (const wl of walls) {
    const i = wl.i, j = (i + 1) % n, lit = 0.92 - wl.nx * 0.1;
    const PX = (k: number, z: number) => SX(k, z);
    if (!cutE[i]) {
      ctx.fillStyle = shade(d.frost, lit * 0.97);
      ctx.beginPath();
      ctx.moveTo(PX(i, z1), SY(i, z1));
      ctx.lineTo(PX(j, z1), SY(j, z1));
      ctx.lineTo(PX(j, z0), SY(j, z0));
      ctx.lineTo(PX(i, z0), SY(i, z0));
      ctx.fill();
      // 흘러내린 크림 (출렁)
      const da = 0.28 + 0.22 * hsh(Math.round(P[2 * i] * 300) + Math.round(P[2 * i + 1] * 977)) + 0.03 * Math.sin(t * 0.06 + i);
      const db = 0.28 + 0.22 * hsh(Math.round(P[2 * j] * 300) + Math.round(P[2 * j + 1] * 977)) + 0.03 * Math.sin(t * 0.06 + j);
      ctx.fillStyle = shade(d.frost2, lit);
      ctx.beginPath();
      ctx.moveTo(PX(i, z1), SY(i, z1));
      ctx.lineTo(PX(j, z1), SY(j, z1));
      ctx.lineTo(PX(j, z1 - hgt * db), SY(j, z1 - hgt * db));
      ctx.lineTo(PX(i, z1 - hgt * da), SY(i, z1 - hgt * da));
      ctx.fill();
      // 바닥 가장자리 그늘
      ctx.strokeStyle = 'rgba(120,50,50,.28)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(PX(i, z0), SY(i, z0));
      ctx.lineTo(PX(j, z0), SY(j, z0));
      ctx.stroke();
      continue;
    }
    // 자른 면: 층
    const band = (f0: number, f1: number, col: string) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(PX(i, z1 - hgt * f0), SY(i, z1 - hgt * f0));
      ctx.lineTo(PX(j, z1 - hgt * f0), SY(j, z1 - hgt * f0));
      ctx.lineTo(PX(j, z1 - hgt * f1), SY(j, z1 - hgt * f1));
      ctx.lineTo(PX(i, z1 - hgt * f1), SY(i, z1 - hgt * f1));
      ctx.fill();
    };
    band(0, 1, shade(d.sponge, lit));
    band(0, 0.13, shade(d.frost, lit));
    band(0.34, 0.43, shade('#fffaf2', lit));
    band(0.62, 0.66, shade(d.jam, lit));
    band(0.66, 0.74, shade('#fffaf2', lit));
    band(0.94, 1, shade(d.sponge, lit * 0.85));
    // 스펀지 구멍
    ctx.fillStyle = rgba('#b07a3a', 0.18);
    for (let k = 0; k < 3; k++) {
      const q = hsh(i * 7 + k + Math.round(P[2 * i] * 100)), zz = z1 - hgt * (0.18 + 0.12 * k + (k === 2 ? 0.3 : 0));
      ctx.beginPath();
      ctx.arc(PX(i, zz) + (PX(j, zz) - PX(i, zz)) * q, SY(i, zz) + (SY(j, zz) - SY(i, zz)) * q, R(0.0035), 0, TAU);
      ctx.fill();
    }
    // 단면 테두리: 칼에 잘린 면이 또렷하게
    ctx.strokeStyle = 'rgba(150,90,50,.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PX(i, z1), SY(i, z1));
    ctx.lineTo(PX(i, z0), SY(i, z0));
    ctx.lineTo(PX(j, z0), SY(j, z0));
    ctx.lineTo(PX(j, z1), SY(j, z1));
    ctx.stroke();
  }
  if (!top) return;
  // 윗면
  ctx.beginPath();
  for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, SX(i, z1), SY(i, z1));
  ctx.closePath();
  const [c0x, c0y] = [X(f.tx + f.shx * z1 * f.sc), Yz(f.ty + f.shy * z1 * f.sc, z1 * f.sc + f.lift)];
  const g = ctx.createRadialGradient(c0x - R(0.08), c0y - R(0.05), R(0.02), c0x, c0y, R(0.36 * f.sc));
  g.addColorStop(0, shade(d.frost, 1.12));
  g.addColorStop(1, shade(d.frost, 0.97));
  ctx.fillStyle = g;
  ctx.fill();
  // 윗면 윤곽: 배경과 떨어져 보이게
  ctx.strokeStyle = rgba(d.frost2, 0.55);
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function drawPiece(ctx: C2, s: CakeState, p: Pc, f: Xf, d: StageDef, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number, w: number) {
  const t = s.t, P = p.P, n = P.length / 2;
  // 그림자: 넓고 옅은 것 + 바로 밑 진한 것
  const fade = 1 - Math.min(0.7, f.lift * 5);
  for (const [ox, oy, al] of [[0.03, 0.05, 0.16], [0.014, 0.022, 0.26]] as const) {
    ctx.fillStyle = `rgba(90,40,30,${al * fade})`;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [u, v] = wpt(f, P[2 * i], P[2 * i + 1]);
      (i ? ctx.lineTo : ctx.moveTo).call(ctx, X(u + ox), Yz(v + oy, 0));
    }
    ctx.fill();
  }
  drawSlab(ctx, s, P, p.E, f, 0, f.H, d, X, Yz, R, true);
  // 윗면 장식: 원래 좌표계 → 화면 아핀 변환으로 그려 조각에 맞게 잘린다
  const zt = f.H * f.sc + f.lift;
  const a = w * f.sc * f.cs, b = w * SQ * f.sc * f.sn, c = -w * f.sc * f.sn, dd = w * SQ * f.sc * f.cs;
  const e = w * (f.tx + f.shx * f.H * f.sc - f.sc * (f.cs * f.cx - f.sn * f.cy)), ff = w * (YC - 0.5 * SQ - zt + SQ * (f.ty + f.shy * f.H * f.sc - f.sc * (f.sn * f.cx + f.cs * f.cy)));
  ctx.save();
  ctx.transform(a, b, c, dd, e, ff);
  ctx.beginPath();
  for (let i = 0; i < n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, P[2 * i], P[2 * i + 1]);
  ctx.closePath();
  ctx.clip();
  const base = s.L.base;
  // 크림 물결 무늬
  ctx.strokeStyle = rgba(d.frost2, 0.28);
  ctx.lineWidth = 0.008;
  for (let k = 0; k < 5; k++) {
    ctx.beginPath();
    for (let q = 0; q <= 24; q++) {
      const x = 0.1 + q * 0.035, y = 0.24 + k * 0.13 + 0.018 * Math.sin(q * 0.9 + k * 1.7 + t * 0.03);
      q ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  // 반짝 (출렁이는 빛)
  const gl = 0.5 + 0.5 * Math.sin(t * 0.035);
  ctx.fillStyle = `rgba(255,255,255,${0.22 + 0.12 * gl})`;
  ctx.beginPath();
  ctx.ellipse(0.38 + 0.02 * gl, 0.36, 0.12, 0.05, -0.5, 0, TAU);
  ctx.fill();
  // 만져 보라는 반짝 띠 (가만히 있을 때)
  if (s.phase === 'play' && !s.stroke && s.serveAt === 0) {
    const q = ((t + 40) % 200) / 200;
    if (q < 0.6) {
      const pos = -0.1 + (q / 0.6) * 1.3;
      ctx.save();
      ctx.translate(pos, 0.5);
      ctx.rotate(0.5);
      const sg = ctx.createLinearGradient(-0.06, 0, 0.06, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)');
      sg.addColorStop(0.5, 'rgba(255,255,255,.45)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(-0.06, -0.8, 0.12, 1.6);
      ctx.restore();
    }
  }
  // 스프링클
  const sp = ['#ff5c8a', '#ffd23a', '#5fb8ff', '#6fd3a8', '#b07aff', '#ff9f4a'];
  for (let k = 0; k < 46; k++) {
    const x = 0.14 + hsh(k * 3.3 + s.stage) * 0.72, y = 0.14 + hsh(k * 5.1 + s.stage * 2) * 0.72;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(hsh(k) * 6);
    ctx.fillStyle = sp[k % sp.length];
    ctx.beginPath();
    ctx.roundRect(-0.008, -0.0025, 0.016, 0.005, 0.0025);
    ctx.fill();
    ctx.restore();
  }
  // 둘레 크림 테두리 (바깥 가장자리만 — 자른 면엔 없음)
  ctx.lineWidth = 0.018;
  ctx.strokeStyle = shade(d.frost, 1.18);
  ctx.beginPath();
  for (let i = 0; i < base.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, base[i], base[i + 1]);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 0.006;
  ctx.strokeStyle = rgba(d.frost2, 0.5);
  ctx.stroke();
  // 자른 면 가장자리: 크림이 살짝 삐져나옴
  ctx.strokeStyle = 'rgba(255,252,246,.95)';
  ctx.lineWidth = 0.012;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++)
    if (p.E[i]) {
      const j = (i + 1) % n;
      ctx.beginPath();
      ctx.moveTo(P[2 * i], P[2 * i + 1]);
      ctx.lineTo(P[2 * j], P[2 * j + 1]);
      ctx.stroke();
    }
  ctx.restore();
  // 위층
  if (s.B.tier) {
    const T = clipConvex(P, s.B.tier);
    if (T.length >= 6 && Math.abs(polyArea(T)) > 1e-5) {
      const tc = s.L.tierC!, cutE: boolean[] = [];
      for (let i = 0; i < T.length; i += 2) {
        const j = (i + 2) % T.length, mx = (T[i] + T[j]) / 2, my = (T[i + 1] + T[j + 1]) / 2;
        cutE.push(Math.abs(Math.hypot(mx - tc[0], my - tc[1]) - tc[2]) > 0.006);
      }
      const tf = d.tf ?? ['#fffaf3', d.frost2, d.sponge];
      drawSlab(ctx, s, T, cutE, f, f.H, f.H + HT, { ...d, frost: tf[0], frost2: tf[1], sponge: tf[2], jam: tf[1] }, X, Yz, R, true);
      const zt2 = (f.H + HT) * f.sc + f.lift, ff2 = w * (YC - 0.5 * SQ - zt2 + SQ * (f.ty + f.shy * (f.H + HT) * f.sc - f.sc * (f.sn * f.cx + f.cs * f.cy)));
      const e2 = e + w * f.shx * HT * f.sc;
      ctx.save();
      ctx.transform(a, b, c, dd, e2, ff2);
      ctx.beginPath();
      for (let i = 0; i < T.length; i += 2) (i ? ctx.lineTo : ctx.moveTo).call(ctx, T[i], T[i + 1]);
      ctx.closePath();
      ctx.clip();
      ctx.lineWidth = 0.016;
      ctx.strokeStyle = shade(tf[0], 1.25);
      ctx.beginPath();
      ctx.arc(tc[0], tc[1], tc[2] - 0.004, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = rgba(tf[1], 0.35);
      ctx.lineWidth = 0.007;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(tc[0], tc[1], tc[2] * (0.3 + k * 0.2), 0.3 + k, 2.2 + k);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.ellipse(tc[0] - 0.04, tc[1] - 0.04, 0.05, 0.02, -0.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // 얹은 것
  const tops: number[] = [];
  s.B.tp.forEach((tp, i) => tp.on && tp.pc === p.id && tops.push(i));
  tops.sort((i, j) => s.B.tp[i].y - s.B.tp[j].y);
  for (const i of tops) {
    const tp = s.B.tp[i], tv = s.tv[i], [u, v] = wpt(f, tp.x, tp.y), zb = tp.tier ? f.H + HT : f.H;
    const z = (zb + tv.z) * f.sc + f.lift, x = X(u + f.shx * zb * f.sc), y = Yz(v + f.shy * zb * f.sc, z), sz = f.sc;
    if (tp.k === 'rose') drawRose(ctx, x, y, R(RR) * sz * 1.15, tv.wob);
    if (tp.k === 'berry') drawBerry(ctx, x, y, R(BR) * sz * 1.3, tv.wob, 0, 0);
    if (tp.k === 'candle') drawCandle(ctx, x, y, R(0.012) * sz, R(0.075) * sz, tv.wob * 0.5, t, i, true);
  }
}

function drawRose(ctx: C2, x: number, y: number, r: number, wob: number) {
  ctx.fillStyle = 'rgba(150,80,80,.18)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.15, y + r * 0.35, r * 1.05, r * 0.5, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.6, r * 0.1, x, y - r * 0.2, r * 1.2);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#f3e6e0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.15, r, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + wob * r * 0.3, y - r * 0.55, r * 0.66, r * 0.48, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - r * 0.2 + wob * r * 0.5, y - r * 0.85);
  ctx.quadraticCurveTo(x + wob * r, y - r * 1.5, x + r * 0.25 + wob * r * 0.6, y - r * 0.9);
  ctx.fill();
  ctx.strokeStyle = 'rgba(210,180,170,.7)';
  ctx.lineWidth = Math.max(1, r * 0.12);
  ctx.beginPath();
  ctx.arc(x, y - r * 0.4, r * 0.55, Math.PI * 0.1, Math.PI * 0.9);
  ctx.stroke();
}
function drawBerry(ctx: C2, x: number, y: number, r: number, wob: number, half: number, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(120,40,40,.22)';
  ctx.beginPath();
  ctx.ellipse(r * 0.15, r * 0.25, r * 0.95, r * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.rotate(rot + wob * 0.3);
  // 몸통 (위가 넓고 아래가 뾰족)
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(0, r * 0.15);
    ctx.bezierCurveTo(-r * 1.15, -r * 0.2, -r * 0.85, -r * 1.35, 0, -r * 1.2);
    ctx.bezierCurveTo(r * 0.85, -r * 1.35, r * 1.15, -r * 0.2, 0, r * 0.15);
  };
  if (half) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(half < 0 ? -r * 2 : 0, -r * 2, r * 2, r * 3);
    ctx.clip();
  }
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.85, r * 0.1, 0, -r * 0.5, r * 1.3);
  g.addColorStop(0, '#ff8a9a');
  g.addColorStop(0.5, '#f0284a');
  g.addColorStop(1, '#b8102e');
  ctx.fillStyle = g;
  body();
  ctx.fill();
  if (half) {
    // 단면
    ctx.fillStyle = '#ffd6dc';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.22, r * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.08, r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = '#ffe9a8';
  for (let k = 0; k < 7; k++) {
    const sx = (hsh(k + 1) - 0.5) * r * 1.2, sy = -r * (0.25 + hsh(k + 9) * 0.8);
    if (half && (sx < 0) === half > 0) continue;
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * 0.06, r * 0.1, 0, 0, TAU);
    ctx.fill();
  }
  // 꼭지
  ctx.fillStyle = '#3fae4a';
  for (let k = 0; k < 5; k++) {
    if (half && ((k - 2) < 0) === half > 0 && k !== 2) continue;
    const a = -Math.PI / 2 + (k - 2) * 0.55;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.35, -r * 1.2 + Math.sin(a) * r * 0.12, r * 0.38, r * 0.13, a, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.4, -r * 0.8, r * 0.14, r * 0.22, -0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function drawCandle(ctx: C2, x: number, y: number, rw: number, hh: number, tilt: number, t: number, k: number, lit: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(120,40,40,.2)';
  ctx.beginPath();
  ctx.ellipse(rw * 0.6, rw * 0.4, rw * 1.6, rw * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.rotate(tilt);
  const cols = ['#5fb8ff', '#ff7aa5', '#ffd23a', '#6fd3a8'];
  const c = cols[k % cols.length];
  ctx.fillStyle = c;
  ctx.beginPath();
  ctx.roundRect(-rw, -hh, rw * 2, hh, rw * 0.6);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-rw, -hh, rw * 2, hh, rw * 0.6);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.75)';
  ctx.lineWidth = rw * 0.7;
  for (let q = 0; q < 5; q++) {
    ctx.beginPath();
    ctx.moveTo(-rw * 1.5, -hh * (0.1 + q * 0.22));
    ctx.lineTo(rw * 1.5, -hh * (0.1 + q * 0.22) - rw * 1.6);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = '#5a3a2a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -hh);
  ctx.lineTo(0, -hh - rw * 0.9);
  ctx.stroke();
  if (lit) {
    const fl = 1 + 0.12 * Math.sin(t * 0.5 + k * 2);
    const g = ctx.createRadialGradient(0, -hh - rw * 2.2, 0, 0, -hh - rw * 2.2, rw * 4.5);
    g.addColorStop(0, 'rgba(255,230,140,.6)');
    g.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -hh - rw * 2.2, rw * 4.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb02e';
    ctx.beginPath();
    ctx.moveTo(0, -hh - rw * 4 * fl);
    ctx.quadraticCurveTo(rw * 1.3, -hh - rw * 1.6, 0, -hh - rw * 0.8);
    ctx.quadraticCurveTo(-rw * 1.3, -hh - rw * 1.6, 0, -hh - rw * 4 * fl);
    ctx.fill();
    ctx.fillStyle = '#fff4b8';
    ctx.beginPath();
    ctx.ellipse(0, -hh - rw * 1.6, rw * 0.45, rw * 0.9, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
function drawFrag(ctx: C2, f: Frag, d: StageDef, x: number, y: number, R: (r: number) => number, t: number) {
  void d;
  if (f.k === 'berry') drawBerry(ctx, x, y, R(BR) * 1.3, 0, f.side, f.a);
  else if (f.k === 'rose') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(f.a * 0.5);
    ctx.fillStyle = '#fffaf5';
    ctx.beginPath();
    ctx.ellipse(0, -R(0.01), R(RR) * 1.1, R(RR) * 0.75, 0, f.side > 0 ? -Math.PI / 2 : Math.PI / 2, f.side > 0 ? Math.PI / 2 : (3 * Math.PI) / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(220,190,180,.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else {
    drawCandle(ctx, x, y, R(0.012), R(0.075), f.side * f.tip, t, 3, false);
    if (t - f.t < 60) {
      ctx.fillStyle = `rgba(200,200,200,${0.5 * (1 - (t - f.t) / 60)})`;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(x + f.side * R(0.06) + Math.sin(t * 0.1 + k) * R(0.01), y - R(0.03) - (t - f.t) * 0.5 - k * R(0.02), R(0.012 + k * 0.004), 0, TAU);
        ctx.fill();
      }
    }
  }
}

function drawStroke(ctx: C2, s: CakeState, d: StageDef, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number, font: (px: number, w?: number) => void) {
  const st = s.stroke!, t = s.t;
  const dx = st.x1 - st.x0, dy = st.y1 - st.y0, len = Math.hypot(dx, dy);
  let preview: CutRes | null = null, L: Line | null = null;
  if (len > 0.06) {
    L = { nx: -dy / len, ny: dx / len, c: 0 };
    L.c = L.nx * st.x0 + L.ny * st.y0;
    preview = applyCut(s.B, L);
    // 칼이 지나갈 줄 (끝까지)
    const tx = dx / len, ty = dy / len, d0 = L.nx * 0.5 + L.ny * 0.5 - L.c, qx = 0.5 - L.nx * d0, qy = 0.5 - L.ny * d0, half = Math.sqrt(Math.max(0, 0.46 ** 2 - d0 * d0));
    if (half > 0) {
      ctx.setLineDash([R(0.022), R(0.016)]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.lineWidth = R(0.008);
      ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.2 * Math.sin(t * 0.3)})`;
      ctx.beginPath();
      ctx.moveTo(X(qx - tx * half), Yz(qy - ty * half, HC));
      ctx.lineTo(X(qx + tx * half), Yz(qy + ty * half, HC));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(120,40,40,.35)';
      ctx.lineWidth = R(0.003);
      ctx.stroke();
      // 위층 위로 지나는 칼금은 위층 높이에 (위층이 있는 조각의 자리 기준)
      const tc = s.L.tierC;
      if (tc) {
        const host = s.B.pcs.find((p) => p.ti > 0) ?? s.B.pcs[0], hv = s.pv.get(host.id)!;
        const ox = host.ox + hv.dx, oy = host.oy + hv.dy, cxw = tc[0] + ox, cyw = tc[1] + oy;
        const dt = L.nx * cxw + L.ny * cyw - L.c;
        if (Math.abs(dt) < tc[2]) {
          const hh = Math.sqrt(tc[2] ** 2 - dt * dt), mx = cxw - L.nx * dt, my = cyw - L.ny * dt;
          ctx.lineWidth = R(0.008);
          ctx.strokeStyle = 'rgba(255,255,255,.95)';
          ctx.beginPath();
          ctx.moveTo(X(mx - tx * hh), Yz(my - ty * hh, HC + HT));
          ctx.lineTo(X(mx + tx * hh), Yz(my + ty * hh, HC + HT));
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    }
    // 위험한 얹은 것
    if (preview)
      for (const i of preview.hit) {
        const tp = s.B.tp[i];
        if (tp.k === 'rose') continue;
        const p = s.B.pcs.find((q) => q.id === tp.pc)!, v = s.pv.get(p.id)!;
        const x = X(tp.x + p.ox + v.dx), y = Yz(tp.y + p.oy + v.dy, HC + (tp.tier ? HT : 0)) - R(tp.k === 'candle' ? 0.04 : 0.02);
        ctx.strokeStyle = `rgba(255,40,60,${0.7 + 0.3 * Math.sin(t * 0.5)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(x, y, R(0.04), R(0.046), 0, 0, TAU);
        ctx.stroke();
        font(R(0.04), 900);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ff2848';
        ctx.fillText('!', x + R(0.04), y - R(0.035));
      }
  }
  // 칼자국 (크림에 패인 홈)
  const pts = st.pts;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 2; k < pts.length; k += 2) {
    const u0 = pts[k - 2], v0 = pts[k - 1], u1 = pts[k], v1 = pts[k + 1], on = groundAt(s, (u0 + u1) / 2, (v0 + v1) / 2) > 0;
    const y0 = Yz(v0, HC), y1 = Yz(v1, HC);
    if (on) {
      ctx.strokeStyle = 'rgba(150,60,70,.55)';
      ctx.lineWidth = R(0.012);
      ctx.beginPath();
      ctx.moveTo(X(u0), y0);
      ctx.lineTo(X(u1), y1);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.lineWidth = R(0.005);
      ctx.beginPath();
      ctx.moveTo(X(u0), y0 - R(0.006));
      ctx.lineTo(X(u1), y1 - R(0.006));
      ctx.stroke();
      if (k % 6 === 0) {
        ctx.fillStyle = '#fffaf2';
        ctx.beginPath();
        ctx.arc(X(u1) + R(0.008), y1 - R(0.012), R(0.007), 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = R(0.006);
      ctx.beginPath();
      ctx.moveTo(X(u0), y0);
      ctx.lineTo(X(u1), y1);
      ctx.stroke();
    }
  }
  // 몇 조각이 될까
  const n0 = s.B.pcs.length, n1 = preview && preview.nNew > 0 ? preview.b.pcs.length : n0;
  const kx = X(st.x1), ky = Yz(st.y1, HC);
  drawKnife(ctx, kx, ky, R, Math.atan2(Yz(st.y1, 0) - Yz(st.y0, 0), X(st.x1) - X(st.x0)), t);
  if (n1 !== n0) {
    font(R(0.045), 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const txt = `${n0} → ${n1}조각`, tw = ctx.measureText(txt).width + R(0.04), bx = Math.max(tw / 2 + 4, Math.min(X(1) - tw / 2 - 4, kx)), by = Math.max(Yz(0.05, HC), ky - R(0.11));
    ctx.fillStyle = n1 > d.N ? 'rgba(200,50,60,.9)' : 'rgba(90,40,30,.85)';
    ctx.beginPath();
    ctx.roundRect(bx - tw / 2, by - R(0.032), tw, R(0.064), R(0.032));
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, bx, by + 1);
    ctx.textBaseline = 'alphabetic';
  }
}
function drawKnife(ctx: C2, x: number, y: number, R: (r: number) => number, ang: number, t: number) {
  void t;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang - 0.5);
  ctx.fillStyle = 'rgba(80,30,30,.25)';
  ctx.beginPath();
  ctx.ellipse(R(0.01), R(0.02), R(0.05), R(0.012), 0, 0, TAU);
  ctx.fill();
  // 칼날
  const g = ctx.createLinearGradient(0, -R(0.02), 0, R(0.02));
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.5, '#cfd6e0');
  g.addColorStop(1, '#9aa3b2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-R(0.11), -R(0.018));
  ctx.quadraticCurveTo(-R(0.13), R(0.002), -R(0.11), R(0.016));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(80,90,110,.6)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 손잡이
  ctx.fillStyle = '#ff7aa5';
  ctx.beginPath();
  ctx.roundRect(-R(0.2), -R(0.016), R(0.09), R(0.032), R(0.016));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(-R(0.19), -R(0.01), R(0.07), R(0.006));
  ctx.restore();
}
function drawHand(ctx: C2, x: number, y: number, r: number, press: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = 'rgba(80,30,30,.25)';
  ctx.beginPath();
  ctx.ellipse(r * 0.3, r * 1.9, r * 0.9, r * 0.3, 0, 0, TAU);
  ctx.fill();
  const sc = press ? 0.92 : 1;
  ctx.scale(sc, sc);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#6a3a2a';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  // 손바닥
  ctx.beginPath();
  ctx.roundRect(-r * 0.75, r * 0.55, r * 1.5, r * 1.3, r * 0.5);
  ctx.fill();
  ctx.stroke();
  // 검지
  ctx.beginPath();
  ctx.roundRect(-r * 0.28, -r * 0.2, r * 0.56, r * 1.2, r * 0.28);
  ctx.fill();
  ctx.stroke();
  // 접은 손가락
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.arc(r * (0.05 + k * 0.38) - r * 0.1, r * 0.75, r * 0.24, Math.PI, 0);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffd6e0';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.05, r * 0.16, r * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function drawDemo(ctx: C2, s: CakeState, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number, font: (px: number, w?: number) => void, soft = false) {
  const t = s.t, per = 120, q = (t % per) / 80, e = ease(Math.min(1, q));
  const a = [0.2, 0.3], b = [0.8, 0.68];
  const x = a[0] + (b[0] - a[0]) * e, y = a[1] + (b[1] - a[1]) * e;
  if (q < 1.25) {
    ctx.setLineDash([R(0.02), R(0.014)]);
    ctx.lineWidth = R(0.008);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.beginPath();
    ctx.moveTo(X(a[0]), Yz(a[1], HC));
    ctx.lineTo(X(x), Yz(y, HC));
    ctx.stroke();
    ctx.setLineDash([]);
    drawHand(ctx, X(x) + R(0.012), Yz(y, HC) + R(0.012), R(0.062), q > 0.05 && q < 1);
  }
  if (soft) return;
  // 안내 한 줄
  const txt = '👆 케이크를 쓱 그어 잘라요!';
  font(R(0.05), 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tw = ctx.measureText(txt).width + R(0.06), yy = R(1.215) + Math.sin(t * 0.08) * 2;
  ctx.fillStyle = 'rgba(90,40,30,.88)';
  ctx.beginPath();
  ctx.roundRect(X(0.5) - tw / 2, yy - R(0.038), tw, R(0.076), R(0.038));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(txt, X(0.5), yy + 1);
  const d = STAGES[s.stage];
  font(R(0.036), 800);
  ctx.fillStyle = '#7a3a2a';
  ctx.fillText(`손님 ${d.N}명 · 칼 ${d.K}번 → 똑같이 ${d.N}조각`, X(0.5), yy + R(0.062));
  ctx.textBaseline = 'alphabetic';
}

// ───── 손님 ─────
const FUR: Record<Animal, [string, string, string]> = {
  bunny: ['#ffffff', '#ffc2d4', '#f1e6ea'],
  bear: ['#c0814f', '#f3d7b6', '#8e5a33'],
  cat: ['#ffb45e', '#fff1dc', '#e08a2e'],
  panda: ['#ffffff', '#ffffff', '#2b2b33'],
  fox: ['#ff8a3d', '#ffffff', '#d4621f'],
  chick: ['#ffd84a', '#fff2a8', '#f0b52a'],
};
const HAT = ['#ff7aa5', '#5fb8ff', '#ffd23a', '#6fd3a8', '#b07aff'];
function drawGuestBody(ctx: C2, g: Guest, x: number, y: number, r: number, t: number, i: number, lookU: number) {
  const [fur, light, dark] = FUR[g.kind], mood = g.mood;
  const bob = Math.sin(t * 0.06 + i * 1.7) * r * 0.03;
  y += bob;
  // 몸
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.35, r * 0.95, r * 0.75, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.3, r * 0.88, r * 0.7, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = light;
  ctx.beginPath();
  ctx.ellipse(x, y + r * 1.4, r * 0.5, r * 0.5, 0, 0, TAU);
  ctx.fill();
  // 턱받이
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.45, y + r * 0.82);
  ctx.quadraticCurveTo(x, y + r * 1.5, x + r * 0.45, y + r * 0.82);
  ctx.fill();
  ctx.fillStyle = HAT[i % HAT.length];
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.arc(x + k * r * 0.18, y + r * 1.0 + Math.abs(k) * -r * 0.06, r * 0.05, 0, TAU);
    ctx.fill();
  }
  const sad = mood === 'sad';
  // 귀
  const ear = (sx: number) => {
    ctx.save();
    ctx.translate(x + sx * r * 0.55, y - r * 0.72);
    if (g.kind === 'bunny') {
      ctx.rotate(sx * (sad ? 1.25 : 0.22) + Math.sin(t * 0.07 + sx) * 0.05);
      ctx.fillStyle = fur;
      ctx.strokeStyle = '#e8d8de';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 0.24, r * 0.68, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(0, -r * 0.55, r * 0.12, r * 0.52, 0, 0, TAU);
      ctx.fill();
    } else if (g.kind === 'cat' || g.kind === 'fox') {
      ctx.rotate(sx * (sad ? 0.7 : 0.25));
      ctx.fillStyle = fur;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.15);
      ctx.lineTo(0, -r * (g.kind === 'fox' ? 0.62 : 0.48));
      ctx.lineTo(r * 0.3, r * 0.15);
      ctx.fill();
      ctx.fillStyle = g.kind === 'fox' ? '#3a2a2a' : '#ffc2c8';
      ctx.beginPath();
      ctx.moveTo(-r * 0.14, r * 0.05);
      ctx.lineTo(0, -r * (g.kind === 'fox' ? 0.5 : 0.32));
      ctx.lineTo(r * 0.14, r * 0.05);
      ctx.fill();
    } else if (g.kind === 'chick') {
      // 없음
    } else {
      ctx.fillStyle = g.kind === 'panda' ? '#2b2b33' : fur;
      ctx.beginPath();
      ctx.arc(0, r * 0.05, r * 0.27, 0, TAU);
      ctx.fill();
      ctx.fillStyle = g.kind === 'panda' ? '#4a4a55' : dark;
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.14, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  };
  ear(-1);
  ear(1);
  // 머리
  const hg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r * 1.05);
  hg.addColorStop(0, shade(fur, 1.15));
  hg.addColorStop(1, g.kind === 'bunny' || g.kind === 'panda' ? '#ece2e6' : fur);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 1.0, r * 0.92, 0, 0, TAU);
  ctx.fill();
  if (g.kind === 'chick') {
    ctx.fillStyle = dark;
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.ellipse(x + k * r * 0.12, y - r * 0.92, r * 0.07, r * 0.2, k * 0.4, 0, TAU);
      ctx.fill();
    }
  }
  if (g.kind === 'cat') {
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    for (let k = -1; k <= 1; k++) {
      ctx.beginPath();
      ctx.moveTo(x + k * r * 0.18, y - r * 0.85);
      ctx.lineTo(x + k * r * 0.14, y - r * 0.62);
      ctx.stroke();
    }
  }
  // 주둥이·얼굴 무늬
  if (g.kind === 'bear' || g.kind === 'fox') {
    ctx.fillStyle = light;
    ctx.beginPath();
    if (g.kind === 'fox') {
      ctx.moveTo(x - r * 0.95, y + r * 0.05);
      ctx.quadraticCurveTo(x, y + r * 1.15, x + r * 0.95, y + r * 0.05);
      ctx.quadraticCurveTo(x, y + r * 0.3, x - r * 0.95, y + r * 0.05);
    } else ctx.ellipse(x, y + r * 0.32, r * 0.42, r * 0.32, 0, 0, TAU);
    ctx.fill();
  }
  if (g.kind === 'panda') {
    ctx.fillStyle = '#2b2b33';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sx * r * 0.36, y - r * 0.02, r * 0.22, r * 0.28, sx * -0.5, 0, TAU);
      ctx.fill();
    }
  }
  // 눈
  const ex = r * 0.36, ey = y - r * 0.06, look = Math.max(-1, Math.min(1, (lookU * 1 - x / (r / 0.066)) * 6)) * r * 0.06;
  const blink = (t + i * 53) % 230 < 7 && mood !== 'happy';
  const eyeCol = g.kind === 'panda' ? '#ffffff' : '#2a1a14';
  ctx.fillStyle = eyeCol;
  ctx.strokeStyle = eyeCol;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1.6, r * 0.09);
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    if (mood === 'happy') {
      ctx.beginPath();
      ctx.arc(cx, ey + r * 0.06, r * 0.13, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 'smug') {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.14, ey);
      ctx.lineTo(cx + r * 0.14, ey);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, ey + r * 0.01, r * 0.08, 0, Math.PI);
      ctx.fill();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(cx - r * 0.11, ey);
      ctx.lineTo(cx + r * 0.11, ey);
      ctx.stroke();
    } else {
      const big = mood === 'wow' ? 1.35 : mood === 'angry' ? 0.8 : 1;
      const lx = mood === 'watch' ? look : 0;
      ctx.beginPath();
      ctx.ellipse(cx + lx, ey, r * 0.1 * big, r * 0.13 * big, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = g.kind === 'panda' ? '#2b2b33' : '#ffffff';
      ctx.beginPath();
      ctx.arc(cx + lx - r * 0.03, ey - r * 0.045, r * 0.04 * big, 0, TAU);
      ctx.fill();
      if (mood === 'wow') {
        ctx.beginPath();
        ctx.arc(cx + lx + r * 0.03, ey + r * 0.05, r * 0.02, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = eyeCol;
    }
    if (mood === 'angry' || sad) {
      ctx.strokeStyle = g.kind === 'panda' ? '#2b2b33' : '#5a3a2a';
      ctx.lineWidth = Math.max(1.5, r * 0.07);
      ctx.beginPath();
      const inner = sad ? -1 : 1;
      ctx.moveTo(cx - sx * r * 0.16, ey - r * 0.22 - inner * r * 0.04 * -1);
      ctx.lineTo(cx + sx * r * 0.08, ey - r * 0.22 + inner * r * 0.06);
      ctx.stroke();
      ctx.strokeStyle = eyeCol;
      ctx.lineWidth = Math.max(1.6, r * 0.09);
    }
  }
  if (sad) {
    ctx.fillStyle = '#6fc3ff';
    for (const sx of [-1, 1]) {
      const q = ((t + sx * 13) % 40) / 40;
      ctx.beginPath();
      ctx.ellipse(x + sx * ex + sx * r * 0.05, ey + r * 0.15 + q * r * 0.45, r * 0.05, r * 0.08, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 볼
  ctx.fillStyle = mood === 'angry' ? 'rgba(255,80,80,.55)' : 'rgba(255,130,150,.45)';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + sx * r * 0.6, y + r * 0.2, r * (mood === 'angry' ? 0.2 : 0.15), r * 0.09, 0, 0, TAU);
    ctx.fill();
  }
  // 코·입
  const my = y + r * 0.3;
  if (g.kind === 'chick') {
    ctx.fillStyle = '#ff9a2e';
    ctx.beginPath();
    const open = mood === 'wow' || mood === 'happy' ? r * 0.12 : 0;
    ctx.moveTo(x - r * 0.15, my - r * 0.08);
    ctx.lineTo(x + r * 0.15, my - r * 0.08);
    ctx.lineTo(x, my + r * 0.08 + open);
    ctx.fill();
  } else {
    ctx.fillStyle = g.kind === 'bunny' ? '#ff8fae' : '#3a2420';
    ctx.beginPath();
    ctx.ellipse(x, my - r * 0.1, r * 0.09, r * 0.06, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2420';
    ctx.fillStyle = '#7a2a2a';
    ctx.lineWidth = Math.max(1.4, r * 0.06);
    ctx.beginPath();
    if (mood === 'wow') {
      ctx.ellipse(x, my + r * 0.1, r * 0.1, r * 0.13, 0, 0, TAU);
      ctx.fill();
    } else if (mood === 'happy') {
      ctx.moveTo(x - r * 0.18, my + r * 0.02);
      ctx.quadraticCurveTo(x, my + r * 0.32, x + r * 0.18, my + r * 0.02);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff7a8a';
      ctx.beginPath();
      ctx.ellipse(x, my + r * 0.14, r * 0.08, r * 0.05, 0, 0, TAU);
      ctx.fill();
    } else if (sad) {
      ctx.moveTo(x - r * 0.15, my + r * 0.16);
      ctx.quadraticCurveTo(x - r * 0.05, my + r * 0.04, x, my + r * 0.12);
      ctx.quadraticCurveTo(x + r * 0.05, my + r * 0.04, x + r * 0.15, my + r * 0.16);
      ctx.stroke();
    } else if (mood === 'angry') {
      ctx.moveTo(x - r * 0.1, my + r * 0.12);
      ctx.lineTo(x, my + r * 0.06);
      ctx.lineTo(x + r * 0.1, my + r * 0.12);
      ctx.stroke();
    } else if (mood === 'smug') {
      ctx.moveTo(x - r * 0.12, my + r * 0.08);
      ctx.quadraticCurveTo(x + r * 0.05, my + r * 0.14, x + r * 0.2, my);
      ctx.stroke();
    } else {
      ctx.moveTo(x - r * 0.12, my + r * 0.02);
      ctx.quadraticCurveTo(x - r * 0.06, my + r * 0.1, x, my + r * 0.02);
      ctx.quadraticCurveTo(x + r * 0.06, my + r * 0.1, x + r * 0.12, my + r * 0.02);
      ctx.stroke();
    }
  }
  if (g.kind === 'cat' || g.kind === 'bunny') {
    ctx.strokeStyle = 'rgba(90,60,50,.45)';
    ctx.lineWidth = 1;
    for (const sx of [-1, 1])
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.moveTo(x + sx * r * 0.3, my - r * 0.05 + k * r * 0.08);
        ctx.lineTo(x + sx * r * 0.75, my - r * 0.1 + k * r * 0.14);
        ctx.stroke();
      }
  }
  // 고깔모자
  ctx.save();
  ctx.translate(x + r * 0.15, y - r * 0.82);
  ctx.rotate(0.25 + Math.sin(t * 0.05 + i) * 0.05);
  const hc = HAT[(i + 2) % HAT.length];
  ctx.fillStyle = hc;
  ctx.beginPath();
  ctx.moveTo(-r * 0.32, 0);
  ctx.lineTo(0, -r * 0.75);
  ctx.lineTo(r * 0.32, 0);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = r * 0.1;
  for (let k = 0; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.12 - k * r * 0.22);
    ctx.lineTo(r * 0.4, -r * 0.24 - k * r * 0.22);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -r * 0.75, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (g.share > 1) {
    // 욕심쟁이: 냅킨 두 장 표시 대신 '×2' 배지
    ctx.fillStyle = '#ffd23a';
    ctx.beginPath();
    ctx.arc(x + r * 0.85, y + r * 0.85, r * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a3a1a';
    ctx.font = `900 ${Math.max(12, r * 0.36)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('×2', x + r * 0.85, y + r * 0.87);
    ctx.textBaseline = 'alphabetic';
  }
}
function drawPlate(ctx: C2, s: CakeState, g: Guest, i: number, X: (u: number) => number, Yz: (v: number, z: number) => number, R: (r: number) => number) {
  const x = X(g.x), y = Yz(PLATE_V, 0), [fur] = FUR[g.kind];
  void i;
  // 앞발
  ctx.fillStyle = fur;
  ctx.strokeStyle = 'rgba(120,80,60,.35)';
  ctx.lineWidth = 1;
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + sx * R(0.075), R(0.455), R(0.022), R(0.016), 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(150,70,70,.18)';
  ctx.beginPath();
  ctx.ellipse(x + R(0.005), y + R(0.008), R(0.08), R(0.032), 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, R(0.078), R(0.03), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#e3d6e6';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(x, y, R(0.055), R(0.02), 0, 0, TAU);
  ctx.stroke();
  // 포크
  ctx.strokeStyle = '#b8bec8';
  ctx.lineWidth = R(0.006);
  ctx.beginPath();
  ctx.moveTo(x + R(0.095), y + R(0.02));
  ctx.lineTo(x + R(0.11), y - R(0.02));
  ctx.stroke();
  void s;
}
function drawSay(ctx: C2, s: CakeState, g: Guest, i: number, X: (u: number) => number, R: (r: number) => number, font: (px: number, w?: number) => void) {
  const t = s.t;
  if (s.J && (s.phase === 'serve' || s.phase === 'result')) {
    // 접시 위 몫 (공평한 몫 = 100%)
    const mean = s.J.q.reduce((a, x) => a + x, 0) / s.J.q.length, pc = Math.round((s.J.q[i] / mean) * 100);
    const age = s.phase === 'serve' ? s.pt - 40 : 99;
    if (age > 0) {
      font(R(0.04), 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = `${pc}%`, x = X(g.x), y = R(0.585), tw = ctx.measureText(txt).width + R(0.03);
      ctx.globalAlpha = Math.min(1, age / 10);
      ctx.fillStyle = pc < 93 ? '#e8475f' : pc > 107 ? '#ff9a2e' : '#2fae6a';
      ctx.beginPath();
      ctx.roundRect(x - tw / 2, y - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, x, y + 1);
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }
  if (!g.say || t - g.sayT > 230) return;
  const age = t - g.sayT, pop = age < 8 ? 0.6 + age * 0.05 : 1;
  font(R(0.04), 900);
  const tw = ctx.measureText(g.say).width + R(0.04), hh = R(0.06);
  const x = Math.max(tw / 2 + 3, Math.min(X(1) - tw / 2 - 3, X(g.x))), y = R(i % 2 ? 0.185 : 0.125) - g.hop * R(1) * 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#7a3a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-tw / 2, -hh / 2, tw, hh, hh / 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(X(g.x) - x - R(0.012), hh / 2 - 1);
  ctx.lineTo(X(g.x) - x, hh / 2 + R(0.03));
  ctx.lineTo(X(g.x) - x + R(0.014), hh / 2 - 1);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = g.mood === 'sad' || g.mood === 'angry' ? '#d6304a' : '#5a2e1e';
  ctx.fillText(g.say, 0, 1);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

function drawHud(ctx: C2, s: CakeState, d: StageDef, w: number, h: number, Yz: (v: number, z: number) => number, R: (r: number) => number, font: (px: number, w?: number) => void) {
  const t = s.t, hb = R(0.072);
  ctx.fillStyle = 'rgba(91,47,34,.92)';
  ctx.fillRect(0, 0, w, hb);
  font(R(0.042), 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.icon} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd23a';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  const sw = ctx.measureText(stt).width;
  for (let k = 0; k < 3; k++) heart(ctx, w - R(0.06) - sw - k * R(0.055), hb * 0.52, R(0.02), k < s.hearts);
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20 && s.phase === 'play') {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    let fs = R(0.042);
    font(fs, 900);
    ctx.textAlign = 'center';
    const isNew = !s.news.text.startsWith('💔');
    const tx = (isNew ? 'NEW ' : '') + s.news.text;
    while (ctx.measureText(tx).width > w - R(0.08) && fs > 12) font((fs -= 0.5), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + R(0.06)), by2 = hb + R(0.05) - drop;
    ctx.fillStyle = 'rgba(255,255,255,.96)';
    ctx.strokeStyle = '#ff7aa5';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.032), tw2, R(0.064), R(0.032));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a2e1e';
    ctx.fillText(tx, w / 2, by2 + 1);
    if (isNew) {
      ctx.fillStyle = '#e8475f';
      const nw = ctx.measureText('NEW ').width, full = ctx.measureText(tx).width;
      ctx.textAlign = 'left';
      ctx.fillText('NEW', w / 2 - full / 2, by2 + 1);
      void nw;
    }
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 130 && s.phase === 'play' && !s.stroke && s.cutsUsed === 0 && (s.stage > 0 || s.everCut)) {
      const a = Math.min(1, age / 8, (130 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.save();
      ctx.translate(w / 2, R(1.225));
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(91,47,34,.78)';
      ctx.beginPath();
      ctx.roundRect(-R(0.42), -R(0.07), R(0.84), R(0.15), R(0.04));
      ctx.fill();
      font(R(0.064), 900);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(`${s.stage + 1}판 · ${d.name}`, 0, -R(0.015));
      font(R(0.04), 800);
      ctx.fillStyle = '#ffd6e2';
      ctx.fillText(`손님 ${d.N}명 · 칼 ${d.K}번 → ${d.shares.some((x) => x > 1) ? '몫대로' : '똑같이'} ${d.N}조각`, 0, R(0.045));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 이 판의 요령 한 줄 (판 소개가 사라진 뒤, 첫 칼 전까지)
  {
    const age = t - s.startT;
    if (s.phase === 'play' && s.cutsUsed === 0 && !s.stroke && age >= 120 && (s.stage > 0 || s.everCut)) {
      font(R(0.038), 800);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const txt = `💡 ${d.tip}`, tw = ctx.measureText(txt).width + R(0.05), yy = R(1.235);
      ctx.globalAlpha = Math.min(1, (age - 120) / 15);
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      ctx.beginPath();
      ctx.roundRect(w / 2 - tw / 2, yy - R(0.032), tw, R(0.064), R(0.032));
      ctx.fill();
      ctx.fillStyle = '#7a3a2a';
      ctx.fillText(txt, w / 2, yy + 1);
      ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic';
    }
  }
  // 결과
  if (s.phase === 'result' && s.J) {
    const age = s.pt, a = Math.min(1, age / 10), J = s.J;
    ctx.globalAlpha = a;
    const cy = Yz(0.5, 0.05);
    ctx.fillStyle = s.ok ? 'rgba(91,47,34,.82)' : 'rgba(120,30,40,.82)';
    ctx.beginPath();
    ctx.roundRect(R(0.06), cy - R(0.13), w - R(0.12), R(0.27), R(0.05));
    ctx.fill();
    ctx.textAlign = 'center';
    font(R(0.06), 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '파티 대성공! 🎉' : J.ratio < 1.01 ? '똑같이 나눴어요!' : '맛있게 나눴어요!') : s.why, w / 2, cy - R(0.07));
    if (s.ok) {
      const nS = d.stars.length;
      for (let k = 0; k < nS; k++) {
        const ag = age - 14 - k * 10, got = J.ok[k];
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(R(0.075) * sc, 900);
        ctx.fillStyle = got ? '#ffd23a' : 'rgba(255,255,255,.3)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - (nS - 1) / 2) * R(0.1), cy + R(0.015));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - (nS - 1) / 2) * R(0.1), cy, '#ffe066', 14, 3, 2.4);
      }
    }
    font(R(0.04), 800);
    ctx.fillStyle = '#ffffff';
    const pc = Math.round((J.ratio - 1) * 100);
    const diff = J.fail === 'empty' ? '손님 수보다 조각이 적어요' : pc < 1 ? '모든 조각 크기가 똑같아요' : J.ratio < 1.995 ? `가장 큰 몫이 가장 작은 몫보다 ${pc}% 커요` : `가장 큰 몫이 가장 작은 몫의 ${J.ratio.toFixed(1)}배`;
    if (s.ok) ctx.fillText(diff, w / 2, cy + R(0.08));
    else {
      ctx.fillText(diff, w / 2, cy - R(0.005));
      font(R(0.044), 900);
      ctx.fillStyle = '#ffd0c8';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 같은 케이크를 다시' : '하트를 다 썼어요 — 끝', w / 2, cy + R(0.07));
    }
    ctx.globalAlpha = 1;
  }
  // ═════ 아래 띠: 칼 · 조각 · 별 조건 ═════
  const y0 = R(1.31);
  ctx.fillStyle = 'rgba(91,47,34,.94)';
  ctx.fillRect(0, y0, w, h - y0);
  const r1 = y0 + R(0.04);
  font(R(0.04), 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff1d6';
  ctx.fillText('칼', R(0.03), r1);
  const kw = ctx.measureText('칼').width;
  for (let k = 0; k < d.K; k++) {
    const used = k >= s.cutsLeft, x = R(0.05) + kw + k * R(0.075);
    ctx.globalAlpha = used ? 0.3 : 1;
    ctx.save();
    ctx.translate(x + R(0.03), r1);
    ctx.rotate(-0.6);
    ctx.fillStyle = '#e6ebf2';
    ctx.beginPath();
    ctx.moveTo(-R(0.03), 0);
    ctx.lineTo(R(0.01), -R(0.01));
    ctx.lineTo(R(0.01), R(0.008));
    ctx.fill();
    ctx.fillStyle = '#ff7aa5';
    ctx.fillRect(R(0.01), -R(0.007), R(0.03), R(0.014));
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'right';
  const np = s.phase === 'play' ? s.B.pcs.length : s.B.pcs.length;
  ctx.fillStyle = np >= d.N ? '#9cf0b0' : '#fff1d6';
  ctx.fillText(`조각 ${np} / 손님 ${d.N}`, w - R(0.03), r1);
  // 별 조건 칩
  const labs = d.stars.map((k) => starText(d, k));
  let fs = R(0.038);
  font(fs, 800);
  const pad = R(0.05), gapc = R(0.015);
  const total = () => labs.reduce((a2, l) => a2 + ctx.measureText(l).width + pad, 0) + gapc * (labs.length - 1);
  while (total() > w - R(0.04) && fs > 12) font((fs -= 0.5), 800);
  let x = (w - total()) / 2;
  const r2 = y0 + R(0.098);
  labs.forEach((l, k) => {
    const cw = ctx.measureText(l).width + pad, done = s.phase === 'result' && s.J ? s.J.ok[k] && !s.J.fail : false;
    ctx.fillStyle = done ? '#ffd23a' : 'rgba(255,241,214,.14)';
    ctx.beginPath();
    ctx.roundRect(x, r2 - R(0.03), cw, R(0.06), R(0.03));
    ctx.fill();
    ctx.fillStyle = done ? '#5a2e1e' : '#ffd23a';
    ctx.textAlign = 'left';
    ctx.fillText('★', x + R(0.012), r2 + 1);
    ctx.fillStyle = done ? '#5a2e1e' : '#fff1d6';
    ctx.fillText(l, x + R(0.042), r2 + 1);
    x += cw + gapc;
  });
  ctx.textBaseline = 'alphabetic';
}
function heart(ctx: C2, x: number, y: number, r: number, on: boolean) {
  ctx.fillStyle = on ? '#ff5a6e' : 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.8, y - r * 1.3, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.8, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
  ctx.fill();
}

function drawProps(ctx: C2, X: (u: number) => number, R: (r: number) => number, t: number) {
  // 왼쪽: 딸기 우유 잔
  {
    const x = X(0.075), y = R(1.2);
    ctx.fillStyle = 'rgba(150,70,70,.18)';
    ctx.beginPath();
    ctx.ellipse(x + R(0.008), y + R(0.012), R(0.04), R(0.014), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.moveTo(x - R(0.035), y - R(0.1));
    ctx.lineTo(x + R(0.035), y - R(0.1));
    ctx.lineTo(x + R(0.028), y);
    ctx.lineTo(x - R(0.028), y);
    ctx.fill();
    ctx.fillStyle = '#ffb3cb';
    ctx.beginPath();
    ctx.moveTo(x - R(0.032), y - R(0.07));
    ctx.lineTo(x + R(0.032), y - R(0.07));
    ctx.lineTo(x + R(0.028), y - R(0.004));
    ctx.lineTo(x - R(0.028), y - R(0.004));
    ctx.fill();
    ctx.fillStyle = '#ffd6e2';
    ctx.beginPath();
    ctx.ellipse(x, y - R(0.07), R(0.032), R(0.008), 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5fb8ff';
    ctx.lineWidth = R(0.008);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + R(0.008), y - R(0.07));
    ctx.lineTo(x + R(0.03), y - R(0.14));
    ctx.lineTo(x + R(0.045), y - R(0.15));
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.fillRect(x - R(0.024), y - R(0.095), R(0.008), R(0.08));
  }
  // 오른쪽: 선물 상자
  {
    const x = X(0.925), y = R(1.205), bw = R(0.075), bh = R(0.06), bob = Math.sin(t * 0.05) * 0.5;
    ctx.fillStyle = 'rgba(150,70,70,.18)';
    ctx.beginPath();
    ctx.ellipse(x + R(0.006), y + R(0.01), bw * 0.6, R(0.014), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7ab8ff';
    ctx.fillRect(x - bw / 2, y - bh, bw, bh);
    ctx.fillStyle = '#5a9be6';
    ctx.fillRect(x - bw / 2, y - bh, bw, R(0.014));
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(x - R(0.008), y - bh, R(0.016), bh);
    ctx.fillRect(x - bw / 2, y - bh * 0.55, bw, R(0.012));
    ctx.beginPath();
    ctx.ellipse(x - R(0.016), y - bh - R(0.012) + bob, R(0.018), R(0.011), -0.5, 0, TAU);
    ctx.ellipse(x + R(0.016), y - bh - R(0.012) + bob, R(0.018), R(0.011), 0.5, 0, TAU);
    ctx.fill();
  }
}
