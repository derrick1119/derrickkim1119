/**
 * 자석 극 뒤집기 부엌 (28라운드: 처음 보는 규칙) — 극 뒤집기 × 가리키기(톡) × 연쇄.
 * 처음 보는 규칙(핵심): 부엌 판 곳곳에 박힌 자석은 N(빨강)이나 S(파랑)다. 자석 하나를 톡 하면 그 자석의 극이 뒤집히고, 그 순간
 *   판 위의 **모든 쇠붙이**가 저마다 '가장 가까운 자석'을 보고 — 같은 극이면 자석 반대쪽으로 곧게(8방향) 막힐 때까지 밀리고,
 *   다른 극이면 자석 쪽으로 곧게 붙거나 더 가까워지지 않을 때까지 끌려 — **동시에** 한 칸씩 미끄러진다(뒤집는 순간 화살표가 하나씩 정해짐).
 *   바닥 타일은 '어느 자석의 구역인지'를 그 자석의 색으로 물들여 보여 준다(거리가 같으면 먼저 놓인 자석 — 색으로 보인다).
 *   미끄러지던 쇠붙이가 서 있던 물건에 부딪히면 맞은 쪽이 이어서 곧게 미끄러진다(연쇄). 제자리(수저통·화구·받침·방석)를 지나가면 쏙.
 * 기준 9(손이 하는 일은 하나): 자석을 톡. 누르고 있는 동안 뒤집으면 각 쇠붙이가 갈 길(점선 화살표)과 도착 자리가 보이고, 떼면 뒤집힌다.
 *   (자석 밖에서 떼면 취소.) 키보드는 화살표 커서 + 스페이스.
 * 판 8개: 목표 = 쇠붙이를 모두 제자리에. 별 = ★ 다 넣음 · ★ 뒤집기 ★선 이하 · ★ 한 번에 2개 이상 쏙(동시에 맞추기).
 *   실패(뒤집기를 다 씀 · 개수대에 퐁당) = 하트 -1, 같은 판 다시. 하트 셋을 다 잃거나 8판을 마치면 끝.
 * 펼쳐짐(하는 일이 바뀐다): 1 숟가락(뒤집기 = 밀기/끌기) → 2 포크(N·S가 섞여 한 번에 반대로 — 갈라 보내기)
 *   → 3 무거운 냄비(한 번에 한 칸 — 냄비를 위해 뒤집기를 아껴 쓰기) → 4 나무 도마(자석이 못 움직임 — 쳐서 멈춤판으로 세우기)
 *   → 5 쇠 국자(두 극 모두에 끌림 — 뒤집기로는 못 떼고 쳐서 구역을 옮기기) → 6 회전 자석(톡 하면 극 대신 구역이 90° 돎)
 *   → 7 고양이 방울(끌려가는 고양이가 앞을 다 밀어 버림) → 8 개수대(지나가면 퐁당 — 길을 피하기) + 전부.
 * 웃음: 냉장고 위 고양이가 '챙그랑'에 화들짝, 7판부터는 방울 단 고양이가 배를 깐 채 질질 끌려가며 버둥. 냄비는 부딪히면 '뎅'.
 * 결정적: 같은 시드 → 같은 판(판은 틀 + 시드로 물건 자리를 섞고, 풀이 탐색으로 ★선을 정한다).
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

// ───────────────────────────── 규칙 (격자 시뮬레이션) ─────────────────────────────
/** 쇠붙이 종류 */
export const SPOON = 0, FORK = 1, POT = 2, LADLE = 3, CAT = 4, BOARD = 5;
/** 제자리 종류: 수저통(숟가락·포크) · 화구(냄비) · 국자 받침 · 고양이 방석 */
const CUP = 0, STOVE = 1, REST = 2, BED = 3;
const HOME_OF = [CUP, CUP, STOVE, REST, BED, -1];
const WALL = 1, SINK = 2;
/** 방향 0 위 · 1 오른쪽 · 2 아래 · 3 왼쪽 */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
/** 판 위 위치 코드: 0 이상 = 칸 번호, IN = 제자리에 쏙, LOST = 개수대에 퐁당 */
const IN = -1, LOST = -2;

interface Mag { x: number; y: number; turn: boolean }
export interface Level {
  C: number; R: number; cell: Uint8Array; home: Int8Array; magAt: Int8Array;
  mags: Mag[]; kinds: number[]; pols: number[]; start: Sim;
  /** ★선(뒤집기) · 뒤집기 한도 · 한 번에 이만큼 쏙이면 ★ · 잘하는 봇의 풀이 · 가장 짧은 풀이 길이 */
  par: number; limit: number; combo: number; plan: number[]; d0: number;
}
/** mp: 자석 극(0 N · 1 S) · md: 회전 자석 방향 · p: 쇠붙이 위치 · hc: 쏙 들어간 제자리 칸 */
export interface Sim { mp: number[]; md: number[]; p: number[]; hc: number[] }
interface Mv { mode: 1 | 2; dx: number; dy: number; tx: number; ty: number; ax: boolean; one: boolean; g: number }
export interface REv { step: number; kind: string; i: number; c: number; j?: number }
export interface Rec { frames: number[][]; evs: REv[]; gov: number[]; att: number[] }

export const cloneSim = (S: Sim): Sim => ({ mp: S.mp.slice(), md: S.md.slice(), p: S.p.slice(), hc: S.hc.slice() });

/** 이 칸을 다스리는 자석: 가장 가까운 자석(회전 자석은 바라보는 쪽 부채꼴만, 거리가 같으면 먼저 놓인 자석). 없으면 -1.
 *  바닥 타일이 그 자석의 색으로 물들어 있어서 '누구 구역인지'가 보인다 */
export function governor(L: Level, S: Sim, x: number, y: number): number {
  let best = 1e9, bi = -1;
  for (let j = 0; j < L.mags.length; j++) {
    const m = L.mags[j], ox = x - m.x, oy = y - m.y;
    if (m.turn) {
      const fx = DX[S.md[j]], fy = DY[S.md[j]], al = ox * fx + oy * fy, pe = Math.abs(ox * fy - oy * fx);
      if (al <= 0 || al < pe) continue;
    }
    const d = ox * ox + oy * oy;
    if (d < best) (best = d), (bi = j);
  }
  return bi;
}

/** 자석→쇠붙이 방향을 8방향으로 (거의 가로면 가로, 거의 세로면 세로, 그 사이는 대각선) */
function dir8(ox: number, oy: number) {
  const ax = Math.abs(ox), ay = Math.abs(oy);
  if (ax >= 2 * ay) return [Math.sign(ox), 0];
  if (ay >= 2 * ax) return [0, Math.sign(oy)];
  return [Math.sign(ox), Math.sign(oy)];
}
/** 뒤집는 순간 정해지는 쇠붙이 하나의 움직임 (null = 안 움직임). 밀림 = 자석 반대쪽으로 곧게 끝까지, 끌림 = 자석 쪽으로 곧게 붙거나 가장 가까워질 때까지 */
function planOf(L: Level, S: Sim, i: number): Mv | null {
  const k = L.kinds[i];
  if (k === BOARD) return null;
  const c = S.p[i], x = c % L.C, y = (c / L.C) | 0, g = governor(L, S, x, y);
  if (g < 0) return null;
  const m = L.mags[g], ox = x - m.x, oy = y - m.y, [dx, dy] = dir8(ox, oy);
  const attract = k === LADLE || S.mp[g] !== L.pols[i];
  if (attract) return Math.max(Math.abs(ox), Math.abs(oy)) <= 1 ? null : { mode: 1, dx: -dx, dy: -dy, tx: m.x, ty: m.y, ax: false, one: k === POT, g };
  return { mode: 2, dx, dy, tx: 0, ty: 0, ax: false, one: k === POT, g };
}
/** 서 있는 물건 o를 i가 쳤을 때 o가 이어서 미끄러지나 (냄비·고양이는 꿈쩍 안 함) */
const knockable = (L: Level, o: number) => L.kinds[o] !== POT && L.kinds[o] !== CAT;

/**
 * 자석 j를 톡: 극(회전 자석은 방향)을 뒤집고 모든 쇠붙이를 동시에 한 칸씩 미끄러뜨린다(멈출 때까지).
 * 돌려주는 값: 이번에 쏙 들어간 수, 개수대에 빠진 게 있으면 -1. rec가 있으면 칸마다의 위치와 사건을 남긴다(연출·미리 보기용).
 */
export function resolve(L: Level, S: Sim, j: number, rec?: Rec): number {
  const m = L.mags[j], C = L.C, R = L.R, n = S.p.length;
  if (m.turn) S.md[j] = (S.md[j] + 1) % 4;
  else S.mp[j] ^= 1;
  const mv: (Mv | null)[] = [];
  for (let i = 0; i < n; i++) mv.push(S.p[i] >= 0 ? planOf(L, S, i) : null);
  if (rec) {
    rec.frames.push(S.p.slice());
    rec.gov = mv.map((v) => (v ? v.g : -1));
    rec.att = mv.map((v) => (v ? v.mode : 0));
  }
  const E = (step: number, kind: string, i: number, c: number, jj?: number) => rec && rec.evs.push({ step, kind, i, c, j: jj });
  const occ = new Int16Array(C * R).fill(-1);
  for (let i = 0; i < n; i++) if (S.p[i] >= 0) occ[S.p[i]] = i;
  const tgt = new Int32Array(n), ok = new Uint8Array(n), has = new Uint8Array(n), pushBy = new Int16Array(n);
  let caught = 0, lost = false;
  const land = (i: number, c: number, step: number) => {
    S.p[i] = c;
    const hk = HOME_OF[L.kinds[i]];
    if (hk >= 0 && L.home[c] === hk) {
      S.p[i] = IN;
      S.hc[i] = c;
      mv[i] = null;
      caught++;
      E(step, 'home', i, c);
    } else if (L.cell[c] === SINK) {
      S.p[i] = LOST;
      S.hc[i] = c;
      mv[i] = null;
      lost = true;
      E(step, 'sink', i, c);
    } else occ[c] = i;
  };
  for (let step = 0; step < 48; step++) {
    let any = false;
    has.fill(0);
    pushBy.fill(-1);
    for (let i = 0; i < n; i++) {
      const v = mv[i];
      if (!v) continue;
      const c = S.p[i], x = c % C, y = (c / C) | 0;
      let nx: number, ny: number;
      if (v.mode === 1) {
        const ox = x - v.tx, oy = y - v.ty;
        // 끌림: 자석 쪽으로 곧게 — 붙거나(옆·대각선) 더 가까워지지 않으면 멈춘다
        const qx = ox + v.dx, qy = oy + v.dy;
        if (Math.max(Math.abs(ox), Math.abs(oy)) <= 1 || qx * qx + qy * qy >= ox * ox + oy * oy) {
          mv[i] = null;
          E(step, 'stick', i, c, v.g);
          continue;
        }
      }
      (nx = x + v.dx), (ny = y + v.dy);
      const nc = ny * C + nx;
      if (nx < 0 || ny < 0 || nx >= C || ny >= R || L.cell[nc] === WALL || L.magAt[nc] >= 0) {
        mv[i] = null;
        E(step, nx >= 0 && ny >= 0 && nx < C && ny < R && L.magAt[nc] >= 0 ? 'bump' : 'bonk', i, c);
        continue;
      }
      tgt[i] = nc;
      has[i] = 1;
      ok[i] = 1;
      any = true;
    }
    if (!any) break;
    // 같은 칸으로 · 마주 보고 → 둘 다 멈춤 (쨍!)
    for (let a = 0; a < n; a++)
      if (has[a])
        for (let b = a + 1; b < n; b++)
          if (has[b] && (tgt[a] === tgt[b] || (tgt[a] === S.p[b] && tgt[b] === S.p[a]))) {
            if (ok[a] || ok[b]) E(step, 'clang', a, S.p[a], b);
            ok[a] = ok[b] = 0;
          }
    // 고양이: 앞에 선 물건들을 줄줄이 밀어 버린다 (끝 칸이 비어 있으면)
    for (let i = 0; i < n; i++) {
      if (!has[i] || !ok[i] || L.kinds[i] !== CAT) continue;
      const o = occ[tgt[i]];
      if (o < 0 || has[o]) continue;
      const ddx = (tgt[i] % C) - (S.p[i] % C), ddy = ((tgt[i] / C) | 0) - ((S.p[i] / C) | 0);
      const chain: number[] = [];
      let cx = tgt[i] % C, cy = (tgt[i] / C) | 0, good = true;
      for (;;) {
        const q = occ[cy * C + cx];
        if (q < 0) break;
        if (has[q]) {
          good = false;
          break;
        }
        chain.push(q);
        (cx += ddx), (cy += ddy);
        if (cx < 0 || cy < 0 || cx >= C || cy >= R || L.cell[cy * C + cx] === WALL || L.magAt[cy * C + cx] >= 0) {
          good = false;
          break;
        }
      }
      for (let b = 0; good && b < n; b++) if (has[b] && b !== i && tgt[b] === cy * C + cx) good = false;
      if (!good) {
        ok[i] = 0;
        continue;
      }
      for (const q of chain) {
        pushBy[q] = i;
        tgt[q] = S.p[q] + ddy * C + ddx;
      }
      E(step, 'shove', i, S.p[i], chain[0]);
    }
    // 비켜 주는 물건이 있어야만 들어간다
    for (let ch = true; ch; ) {
      ch = false;
      for (let i = 0; i < n; i++) {
        if (!has[i] || !ok[i]) continue;
        const o = occ[tgt[i]];
        if (o < 0 || o === i || pushBy[o] === i) continue;
        if (!(has[o] && ok[o])) (ok[i] = 0), (ch = true);
      }
    }
    // 서 있던 물건을 친 쪽은 멈추고, 맞은 쪽이 이어서 곧게 미끄러진다 (연쇄)
    const knocked: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (!has[i] || ok[i]) continue;
      const o = occ[tgt[i]];
      if (o < 0 || has[o] || mv[o] || pushBy[o] >= 0) continue;
      const ddx = (tgt[i] % C) - (S.p[i] % C), ddy = ((tgt[i] / C) | 0) - ((S.p[i] / C) | 0);
      if (knockable(L, o)) knocked.push([o, ddx, ddy]), E(step, 'knock', i, S.p[i], o);
      else E(step, L.kinds[o] === POT ? 'dong' : 'meow', i, S.p[i], o);
    }
    // 움직임 적용 (먼저 다 비우고 채운다)
    const movers: number[] = [];
    for (let i = 0; i < n; i++) if ((has[i] && ok[i]) || pushBy[i] >= 0) movers.push(i), (occ[S.p[i]] = -1);
    for (const i of movers) land(i, tgt[i], step);
    for (let i = 0; i < n; i++) {
      if (has[i] && !ok[i]) mv[i] = null;
      else if (has[i] && mv[i]?.one) mv[i] = null;
    }
    for (const [o, ddx, ddy] of knocked) if (S.p[o] >= 0) mv[o] = { mode: 2, dx: ddx, dy: ddy, tx: 0, ty: 0, ax: false, one: false, g: -1 };
    if (rec) rec.frames.push(S.p.slice());
  }
  return lost ? -1 : caught;
}

export const solved = (L: Level, S: Sim) => S.p.every((p, i) => HOME_OF[L.kinds[i]] < 0 || p === IN);
const keyOf = (S: Sim) => S.mp.join('') + S.md.join('') + S.p.join(',');

/**
 * 풀이 탐색(너비 우선): 가장 짧은 풀이(d0)와 '한 번에 combo개 쏙'을 포함한 가장 짧은 풀이(d1).
 * 상태가 너무 많아지면 멈춘다(cap).
 */
export function solve(L: Level, S0: Sim, maxD: number, cap = 40000): { d0: number; d1: number; p0: number[]; p1: number[] } {
  interface Nd { S: Sim; f: number; par: number; mv: number }
  const nodes: Nd[] = [{ S: S0, f: 0, par: -1, mv: -1 }];
  const seen = new Set<string>([keyOf(S0) + ':0']);
  let front = [0], d0 = -1, d1 = -1, p0: number[] = [], p1: number[] = [];
  const path = (k: number) => {
    const out: number[] = [];
    for (; nodes[k].par >= 0; k = nodes[k].par) out.push(nodes[k].mv);
    return out.reverse();
  };
  if (solved(L, S0)) return { d0: 0, d1: -1, p0: [], p1: [] };
  for (let d = 1; d <= maxD && front.length && d1 < 0; d++) {
    const next: number[] = [];
    for (const k of front) {
      const nd = nodes[k];
      for (let j = 0; j < L.mags.length; j++) {
        const S = cloneSim(nd.S), c = resolve(L, S, j);
        if (c < 0) continue;
        const f = nd.f | (c >= L.combo ? 1 : 0);
        const key = keyOf(S) + ':' + f;
        if (seen.has(key)) continue;
        seen.add(key);
        nodes.push({ S, f, par: k, mv: j });
        const id = nodes.length - 1;
        if (solved(L, S)) {
          if (d0 < 0) (d0 = d), (p0 = path(id));
          if (f && d1 < 0) (d1 = d), (p1 = path(id));
          continue;
        }
        next.push(id);
      }
      if (nodes.length > cap) break;
    }
    if (nodes.length > cap) break;
    front = next;
  }
  return { d0, d1, p0, p1 };
}

/** 버릇: 제자리에 가장 가까운 물건을 다스리는 자석부터 뒤집는다 (내다보지 않음) */
export function habitMove(L: Level, S: Sim): number {
  let best = -1, bv = 1e9;
  for (let i = 0; i < S.p.length; i++) {
    const hk = HOME_OF[L.kinds[i]];
    if (hk < 0 || S.p[i] < 0) continue;
    const x = S.p[i] % L.C, y = (S.p[i] / L.C) | 0, g = governor(L, S, x, y);
    if (g < 0) continue;
    let dd = 99;
    for (let c = 0; c < L.C * L.R; c++) if (L.home[c] === hk) dd = Math.min(dd, Math.abs((c % L.C) - x) + Math.abs(((c / L.C) | 0) - y));
    if (dd < bv) (bv = dd), (best = g);
  }
  return best >= 0 ? best : 0;
}

// ───────────────────────────── 판(부엌) 틀 ─────────────────────────────
/**
 * 지도 글자: '.' 바닥 · '#' 찬장(벽) · 'o' 개수대(퐁당) · 'U' 수저통 · 'F' 화구 · 'H' 국자 받침 · 'B' 고양이 방석
 *   'M' 자석 · 'T' 회전 자석. 쇠붙이 자리는 시드로 섞는다(풀이 탐색으로 걸러서 ★선을 정한다).
 */
interface Tpl {
  key: string; name: string; emoji: string; news: string; tip: string;
  map: string[]; items: number[];
  /** 쇠붙이 극: 0 N · 1 S · -1 시드로 */
  pols: number[];
  dmin: number; dmax: number; slack: number; combo: number;
}
export const STAGES: Tpl[] = [
  {
    key: 'spoon', name: '숟가락', emoji: '🥄', news: '', tip: '같은 색이면 밀리고, 다른 색이면 끌려와요',
    map: ['...U...', '.......', '.M...M.', 'U.....U', '.......', '.......', 'UU...UU'],
    items: [SPOON, SPOON, SPOON], pols: [0, 0, 0], dmin: 1, dmax: 3, slack: 5, combo: 2,
  },
  {
    key: 'fork', name: '포크', emoji: '🍴', news: '🍴 포크는 반대 극 — 한 번에 숟가락과 반대로 가요', tip: '같은 자석에 숟가락은 밀리고 포크는 끌려요 — 갈라 보내요',
    map: ['UU...UU', 'U.....U', '.......', '.M...M.', '.......', 'U.....U', 'UU...UU'],
    items: [SPOON, SPOON, FORK, FORK], pols: [0, 0, 1, 1], dmin: 2, dmax: 4, slack: 3, combo: 2,
  },
  {
    key: 'pot', name: '냄비', emoji: '🍲', news: '🍲 무거운 냄비 — 뒤집을 때마다 한 칸씩만 가요', tip: '냄비는 무엇을 뒤집든 한 칸씩 — 냄비 자석은 두고 딴 걸 뒤집어요',
    map: ['U..U..U', '.......', '.M...M.', 'U.....U', '...F...', '...M...', 'U..U..U'],
    items: [SPOON, FORK, FORK, POT], pols: [0, 1, 1, -1], dmin: 3, dmax: 6, slack: 3, combo: 2,
  },
  {
    key: 'board', name: '도마', emoji: '🪵', news: '🪵 나무 도마 — 자석이 못 움직여요, 쇠붙이로 쳐서 밀어요', tip: '도마는 쳐야 움직여요 — 길을 막거나 멈춤판이 돼요',
    map: ['UU...UU', '.......', '.M...M.', '.......', '...M...', '.......', 'UU.U.UU'],
    items: [SPOON, SPOON, FORK, BOARD, BOARD], pols: [0, -1, 1, 0, 0], dmin: 3, dmax: 6, slack: 3, combo: 2,
  },
  {
    key: 'ladle', name: '국자', emoji: '🥣', news: '🥣 쇠 국자 — N에도 S에도 끌려요! 뒤집어선 못 밀어요', tip: '국자는 늘 끌려요 — 쳐서 받침 쪽 자석 구역으로 옮겨요',
    map: ['U..U..U', '.......', '.M.#.M.', 'U.....U', '...H...', '...M...', 'U..U..U'],
    items: [SPOON, FORK, FORK, LADLE], pols: [-1, -1, -1, 0], dmin: 3, dmax: 6, slack: 3, combo: 2,
  },
  {
    key: 'turn', name: '회전 자석', emoji: '🧲', news: '🧲 회전 자석 — 톡 하면 극 대신 바라보는 쪽이 90° 돌아요', tip: '회전 자석은 바라보는 부채꼴만 다스려요 — 돌려서 구역을 바꿔요',
    map: ['U..U..U', '...M...', '.......', 'U.#T#.U', '.......', '.M...M.', 'U..U..U'],
    items: [SPOON, SPOON, FORK, FORK], pols: [-1, -1, -1, -1], dmin: 3, dmax: 6, slack: 3, combo: 2,
  },
  {
    key: 'cat', name: '고양이 방울', emoji: '🐈', news: '🐈 방울 단 고양이 — 끌려가며 앞에 선 걸 줄줄이 밀어 버려요', tip: '고양이는 앞을 다 밀어요 — 방석으로 끌어와요',
    map: ['U..B..U', '.......', '.M...M.', 'U.....U', '.......', '...M...', 'U..U..U'],
    items: [SPOON, FORK, FORK, CAT], pols: [-1, -1, -1, -1], dmin: 3, dmax: 6, slack: 3, combo: 2,
  },
  {
    key: 'sink', name: '개수대', emoji: '🚰', news: '🚰 개수대 — 위로 지나가면 퐁당! 길을 피해요', tip: '개수대 위로 지나가면 퐁당 — 실패예요',
    map: ['U..o..U', '.......', '.M...M.', 'U.....U', '...F...', '...M...', 'U..U..B'],
    items: [SPOON, FORK, POT, CAT, BOARD], pols: [-1, -1, -1, -1, 0], dmin: 3, dmax: 7, slack: 3, combo: 2,
  },
];
export const STAGE_COUNT = STAGES.length;

function parse(T: Tpl, flip: boolean) {
  const R = T.map.length, C = T.map[0].length;
  const cell = new Uint8Array(C * R), home = new Int8Array(C * R).fill(-1), magAt = new Int8Array(C * R).fill(-1);
  const mags: Mag[] = [];
  for (let y = 0; y < R; y++)
    for (let x = 0; x < C; x++) {
      const ch = T.map[y][flip ? C - 1 - x : x], c = y * C + x;
      if (ch === '#') cell[c] = WALL;
      else if (ch === 'o') cell[c] = SINK;
      else if (ch === 'U') home[c] = CUP;
      else if (ch === 'F') home[c] = STOVE;
      else if (ch === 'H') home[c] = REST;
      else if (ch === 'B') home[c] = BED;
      else if (ch === 'M' || ch === 'T') (magAt[c] = mags.length), mags.push({ x, y, turn: ch === 'T' });
    }
  return { C, R, cell, home, magAt, mags };
}

/** 이 판을 무작위로 뒤집기만 하면 깰 확률 (못하는 사람 기준) */
export function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = cloneSim(L.start);
    for (let f = 0; f < L.limit; f++) {
      if (resolve(L, S, Math.floor(r() * L.mags.length)) < 0) break;
      if (solved(L, S)) {
        ok++;
        break;
      }
    }
  }
  return ok / n;
}
/** 정해진 수(policy)로 끝까지 둬 본 결과: 별 수 (0 = 못 깸) */
export function playOut(L: Level, pick: (S: Sim) => number) {
  const S = cloneSim(L.start);
  let combo = false;
  for (let f = 1; f <= L.limit; f++) {
    const c = resolve(L, S, pick(S));
    if (c < 0) return 0;
    if (c >= L.combo) combo = true;
    if (solved(L, S)) return 1 + (f <= L.par ? 1 : 0) + (combo ? 1 : 0);
  }
  return 0;
}

/** 쇠붙이 하나만 있다고 치고 제자리까지 갈 수 있나 (판을 고를 때 빠르게 거르기) */
function aloneOk(L: Level, i: number, maxD: number) {
  if (HOME_OF[L.kinds[i]] < 0) return true;
  const one: Level = { ...L, kinds: [L.kinds[i]], pols: [L.pols[i]] };
  return solve(one, { mp: L.start.mp, md: L.start.md, p: [L.start.p[i]], hc: [-1] }, maxD, 3000).d0 > 0;
}

/** 이 판의 새것이 잘하는 풀이에서 실제로 쓰이나 (도마를 친다 · 고양이가 민다 · 회전 자석을 돌린다 · 개수대 옆을 지난다 …) */
function feature(L: Level, key: string) {
  const S = cloneSim(L.start);
  let hit = false;
  for (const j of L.plan) {
    const rec: Rec = { frames: [], evs: [], gov: [], att: [] };
    resolve(L, S, j, rec);
    if (key === 'board' && rec.evs.some((e) => e.kind === 'knock' && L.kinds[e.j!] === BOARD)) hit = true;
    if (key === 'cat' && rec.evs.some((e) => e.kind === 'shove')) hit = true;
    if (key === 'turn' && L.mags[j].turn) hit = true;
    if (key === 'ladle' && rec.evs.some((e) => e.kind === 'knock' && L.kinds[e.j!] === LADLE)) hit = true;
    if (key === 'fork' && rec.att.includes(1) && rec.att.includes(2)) hit = true;
    if (key === 'pot' || key === 'spoon') hit = true;
    if (key === 'sink') hit = hit || rec.frames.some((f) => f.some((c) => c >= 0 && L.cell[c] !== SINK && [1, -1, L.C, -L.C].some((d) => L.cell[c + d] === SINK)));
  }
  return hit;
}

const levelCache = new Map<string, Level>();
/** 판 만들기: 틀 + 시드 → 쇠붙이 자리·극을 섞고, 풀이 탐색으로 ★선·한도를 정한다. 버릇대로 두면 ★3이 안 나오는 판을 고른다 */
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const T = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  const G = parse(T, r() < 0.5), swap = r() < 0.5 ? 1 : 0;
  const free: number[] = [];
  for (let c = 0; c < G.C * G.R; c++) {
    if (G.cell[c] || G.home[c] >= 0 || G.magAt[c] >= 0) continue;
    // 자석 바로 옆에서 시작하면 첫 톡에 안 움직일 수 있다
    if (G.mags.some((m) => Math.max(Math.abs(m.x - (c % G.C)), Math.abs(m.y - ((c / G.C) | 0))) <= 1)) continue;
    free.push(c);
  }
  let pick: Level | null = null, bv = -1e9, good = 0;
  const want = stage < 2 ? 3 : 4;
  for (let tries = 0; tries < 160 && good < want; tries++) {
    const pols = T.pols.map((q) => (q < 0 ? (r() < 0.5 ? 1 : 0) : q ^ swap));
    const start: Sim = { mp: G.mags.map(() => (r() < 0.5 ? 1 : 0)), md: G.mags.map(() => Math.floor(r() * 4)), p: [], hc: [] };
    const L: Level = { ...G, kinds: T.items.slice(), pols, start, par: 0, limit: 0, combo: T.combo, plan: [], d0: 0 };
    const pool = free.slice();
    let okAll = true;
    for (let i = 0; i < T.items.length && okAll; i++) {
      let placed = false;
      for (let k = 0; k < 12 && pool.length && !placed; k++) {
        const c = pool.splice(Math.floor(r() * pool.length), 1)[0];
        start.p[i] = c;
        start.hc[i] = -1;
        placed = aloneOk({ ...L, start: { ...start, p: start.p.slice(0, i + 1), hc: start.hc.slice(0, i + 1) } }, i, T.dmax + 1);
      }
      okAll = placed;
    }
    if (!okAll) continue;
    // 첫 톡에 큰일: 처음 뒤집을 때 쇠붙이 대부분이 움직여야 한다
    let moved = 0;
    for (let j = 0; j < G.mags.length; j++) {
      const S = cloneSim(start);
      resolve(L, S, j);
      moved += S.p.filter((q, i) => q !== start.p[i]).length / start.p.length / G.mags.length;
    }
    if (moved < 0.45) continue;
    const sol = solve(L, start, T.dmax + 1);
    if (sol.d0 < T.dmin || sol.d0 > T.dmax || sol.d1 < 0 || sol.d1 > sol.d0 + 1) continue;
    good++;
    L.d0 = sol.d0;
    L.par = sol.d1;
    L.plan = sol.p1;
    L.limit = sol.d1 + T.slack;
    let v = moved + (feature(L, T.key) ? 1.2 : 0);
    if (stage === 0) v += randomPass(L, r, 40) * 4;
    else if (stage === 1) v += 3 - Math.abs(randomPass(L, r, 40) - 0.7) * 4;
    else {
      const hb = playOut(L, (S) => habitMove(L, S));
      v += (hb < 3 ? 2 : 0) + (hb === 0 ? 0.5 : 0) + sol.d0 * 0.15 + randomPass(L, r, 12) * 0.2;
    }
    if (v > bv) (bv = v), (pick = L);
  }
  if (!pick) throw new Error(`판을 못 만듦 ${seed}:${stage}`);
  if (levelCache.size > 1200) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 게임 상태 ─────────────────────────────
const A = 1.4;
/** 조리대(격자) 자리: 맨 뒤 줄의 위 끝 BY, 맨 앞 줄 폭 BW(가운데 정렬), 칸 높이는 폭의 SQ배 (3/4 시점) */
const BY = 0.35, BW = 0.9, SQ = 0.84;
const FLIP_T = 9, STEP_T = 4, SLOW_T = 7, SETTLE = 16, RESULT_OK = 210, RESULT_FAIL = 165, NEWS_T = 190, CARD_T = 150;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300, PERFECT_PTS = 100;
const HOLD = 12, THINK = 36;

interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; n?: number }
interface Anim { j: number; t0: number; rec: Rec; to: Sim; caught: number; stepT: number; dur: number; done: Set<number>; knocks: number }
export interface PolarState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'move' | 'result'; pt: number;
  L: Level; S: Sim; used: number; hist: number[]; combo: boolean; best: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number; again: boolean;
  down: boolean; downOk: boolean; aim: { x: number; y: number } | null; hold: number; press: number;
  anim: Anim | null; ready: number; startT: number; firstFlip: boolean;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  /** 연출: 자석마다 마지막으로 뒤집힌 때 · 쇠붙이 표정(0 평온 1 놀람 2 철컥 3 쏙 4 어질) · 표정 시각 */
  mt: number[]; mood: number[]; moodT: number[]; catT: number;
}

const ev = (s: PolarState, kind: string, x: number, y: number, text?: string, col?: string, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, n });
function see(s: PolarState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  if (text) s.newsQ.push(text);
}
const cellW = (L: Level) => BW / L.C;
/** 원근(3/4 시점): 뒤쪽 줄은 좁고 앞쪽 줄은 넓다. yy = 줄 경계(0~R), xx = 칸 경계(0~C) */
const PSB = 0.84;
const sbl = (L: Level, yy: number) => PSB + (1 - PSB) * (yy / L.R);
const rowY = (L: Level, yy: number) => BY + cellW(L) * SQ * (PSB * yy + ((1 - PSB) * yy * yy) / (2 * L.R));
const ptX = (L: Level, xx: number, yy: number) => 0.5 + (xx - L.C / 2) * cellW(L) * sbl(L, yy);
const cellX = (L: Level, x: number, y: number) => ptX(L, x + 0.5, y + 0.5);
const cellY = (L: Level, y: number) => rowY(L, y + 0.5);
/** 화면 자리(가로 0~1, 세로 0~A)에서 가장 가까운 자석 (손가락 크기 안이면) */
function magnetAt(L: Level, px: number, py: number) {
  let best = -1, bd = (cellW(L) * 0.62) ** 2;
  L.mags.forEach((m, j) => {
    const d = ((px - cellX(L, m.x, m.y)) ** 2 + ((py - cellY(L, m.y)) / SQ) ** 2) / sbl(L, m.y + 0.5) ** 2;
    if (d < bd) (bd = d), (best = j);
  });
  return best;
}

function newStage(s: PolarState) {
  s.L = buildLevel(s.seed, s.stage);
  s.S = cloneSim(s.L.start);
  s.used = 0;
  s.hist = [];
  s.combo = false;
  s.best = 0;
  s.phase = 'play';
  s.pt = 0;
  s.anim = null;
  s.ready = s.t + 30;
  s.startT = s.t;
  s.starOk = [false, false, false];
  s.mt = s.L.mags.map(() => -999);
  s.mood = s.L.kinds.map(() => 0);
  s.moodT = s.L.kinds.map(() => 0);
  s.down = s.downOk = false;
  s.aim = null;
  s.hold = -1;
  s.press = 0;
  const key = STAGES[s.stage].key;
  if (key !== 'spoon') s.seen.add(key);
}

function endStage(s: PolarState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  const L = s.L;
  if (ok) {
    s.starOk = [true, s.used <= L.par, s.combo];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    // 뒤 부엌일수록 별 값이 커진다 (판마다 +15%)
    s.pts += Math.round((s.got * STAR_PTS + (s.got === 3 ? PERFECT_PTS : 0)) * (1 + s.stage * 0.15)) + (L.limit - s.used) * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 3, 3, s.won ? '부엌 대청소 끝! 🍳' : '부엌 정리 끝!');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 3, 3, why);
  }
}

function doFlip(s: PolarState, j: number) {
  const L = s.L, rec: Rec = { frames: [], evs: [], gov: [], att: [] }, to = cloneSim(s.S);
  const c = resolve(L, to, j, rec);
  const caught = rec.evs.filter((e) => e.kind === 'home').length;
  const stepT = caught >= L.combo ? SLOW_T : STEP_T;
  s.anim = { j, t0: s.t, rec, to, caught: c, stepT, dur: FLIP_T + (rec.frames.length - 1) * stepT + SETTLE, done: new Set(), knocks: 0 };
  s.used++;
  s.hist.push(j);
  s.mt[j] = s.t;
  s.phase = 'move';
  s.firstFlip = true;
  const m = L.mags[j], movers = rec.att.filter((a) => a > 0).length;
  if (caught >= L.combo) s.combo = true;
  s.best = Math.max(s.best, caught);
  ev(s, 'flip', m.x, m.y, m.turn ? '빙글!' : movers >= 3 ? '챙그랑!' : '딸깍!', undefined, movers);
  see(s, 'flip', m.turn ? '' : '🧲 톡 하면 극이 뒤집히고, 그 자석 구역(타일 색)이 바뀌어요');
  for (let i = 0; i < rec.att.length; i++)
    if (rec.att[i]) (s.mood[i] = 1), (s.moodT[i] = 40);
}

/** 연출 시간에 맞춰 사건을 꺼낸다 (칸마다 한 걸음) */
function playAnim(s: PolarState) {
  const a = s.anim!, L = s.L, prog = (s.t - a.t0 - FLIP_T) / a.stepT;
  a.rec.evs.forEach((e, k) => {
    if (a.done.has(k)) return;
    const at = e.kind === 'home' || e.kind === 'sink' ? e.step + 1 : e.step + 0.4;
    if (prog < at) return;
    a.done.add(k);
    const x = e.c % L.C, y = (e.c / L.C) | 0, i = e.i, k2 = L.kinds[i];
    if (e.kind === 'home') {
      (s.mood[i] = 3), (s.moodT[i] = 999);
      ev(s, 'home', x, y, k2 === POT ? '보글보글~' : k2 === CAT ? '골골송~' : k2 === LADLE ? '착!' : '쏙!');
      see(s, 'home', '');
    } else if (e.kind === 'sink') ev(s, 'sink', x, y, k2 === CAT ? '냐아악! 퐁당' : '퐁당!');
    else if (e.kind === 'stick') {
      (s.mood[i] = 2), (s.moodT[i] = 50);
      ev(s, 'stick', x, y, k2 === CAT ? '냥?!' : '철컥!');
      see(s, 'pull', '🧲 다른 색이면 끌려와서 철컥 붙어요');
    } else if (e.kind === 'bonk' || e.kind === 'bump') {
      (s.mood[i] = 4), (s.moodT[i] = 60);
      ev(s, 'bonk', x, y, k2 === POT ? '뎅!' : k2 === CAT ? '냐앙!' : '쿵!');
      if (a.rec.att[i] === 2) see(s, 'push', '🧲 같은 색이면 반대쪽으로 쭉 밀려나요');
    } else if (e.kind === 'clang') {
      (s.mood[i] = 4), (s.moodT[i] = 60);
      if (e.j !== undefined) (s.mood[e.j] = 4), (s.moodT[e.j] = 60);
      ev(s, 'clang', x, y, '쨍!');
    } else if (e.kind === 'knock') {
      a.knocks++;
      (s.mood[e.j!] = 1), (s.moodT[e.j!] = 50);
      ev(s, 'knock', x, y, a.knocks > 1 ? `연쇄 ×${a.knocks}!` : L.kinds[e.j!] === BOARD ? '탁!' : '땡!', undefined, a.knocks);
      see(s, 'knock', '💥 부딪히면 맞은 쪽이 이어서 미끄러져요 — 연쇄!');
    } else if (e.kind === 'dong') ev(s, 'dong', x, y, '뎅~!');
    else if (e.kind === 'meow') ev(s, 'meow', x, y, '냥?');
    else if (e.kind === 'shove') ev(s, 'shove', x, y, '비켜냥!'), see(s, 'shove', '');
  });
  if (prog >= a.rec.frames.length - 1 && !a.done.has(-1)) {
    a.done.add(-1);
    const caught = a.rec.evs.filter((e) => e.kind === 'home').length;
    if (caught >= L.combo) {
      ev(s, 'combo', 3, 3, `한 번에 ${caught}개 쏙! ★`, undefined, caught);
      see(s, 'combo', '✨ 한 번 뒤집어 2개 이상 쏙 = ★');
    }
  }
}

function finishAnim(s: PolarState) {
  const a = s.anim!, L = s.L;
  s.S = a.to;
  s.anim = null;
  s.ready = s.t;
  if (a.caught < 0) return endStage(s, false, '퐁당! 개수대에 빠졌어요');
  if (solved(L, s.S)) return endStage(s, true, '');
  if (s.used >= L.limit) return endStage(s, false, '뒤집기를 다 썼어요');
  s.phase = 'play';
}

/** 처음 보는 판인지 */
const isNew = (s: PolarState) => !s.again && STAGES[s.stage].key !== 'spoon';

export const polarflip: GameDef<PolarState> = {
  id: 'polarflip',
  name: '자석 극 뒤집기 부엌',
  genes: ['polarity', 'pointer', 'chain'],
  twist: '자석 하나를 톡 뒤집으면 부엌의 쇠붙이가 전부 동시에 — 저마다 가장 가까운 자석과 같은 극이면 밀리고 다른 극이면 끌려 — 챙그랑 미끄러진다. 한 번 뒤집기가 모든 물건의 길을 한꺼번에 바꾼다',
  rules: [
    '자석을 톡 → 극이 뒤집히며 부엌의 쇠붙이가 모두, 가장 가까운 자석(타일 색)과 같은 색이면 밀리고 다른 색이면 끌려와요.',
    '쇠붙이를 모두 제자리(수저통·화구…)에 보내면 성공 — 뒤집기 횟수엔 한도가 있어요. 꾹 누르면 갈 길이 보여요.',
  ],
  controls: 'touch',
  hint: '자석을 톡 = 극 뒤집기! (꾹 누르면 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '자석 부엌 디오라마 — 쇠붙이들이 한꺼번에 미끄러지는 조리대',
    mood: '아침 햇살이 드는 크림색 타일 부엌. 반질반질한 조리대 타일이 자석마다 빨강(N)·파랑(S)으로 은은하게 물들고, 눈 달린 숟가락·포크·냄비가 챙그랑 미끄러진다. 냉장고 위 고양이는 소리에 화들짝, 걸레받이 구멍의 생쥐가 구경한다.',
    palette: { bg: '#2b2230', ink: '#fff8ee', muted: '#d9c6b8', accent: '#ffcf5a', hot: '#ff6a5a', soft: '#ffe9d6' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0,
      used: 0, hist: [], combo: false, best: 0, hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '', won: false, dead: false, tries: 0, again: false,
      down: false, downOk: false, aim: null, hold: -1, press: 0, anim: null, ready: 0, startT: 0, firstFlip: false,
      seen: new Set<string>(), newsQ: [], news: null, events: [], mt: [], mood: [], moodT: [], catT: -999,
    } as unknown as PolarState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    s.events = s.events.filter((e) => s.t - e.t < 110);
    for (let i = 0; i < s.moodT.length; i++) if (s.moodT[i] > 0 && --s.moodT[i] === 0) s.mood[i] = 0;
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    // 손: 누르는 동안 미리 보기, 떼는 순간 그 자석을 뒤집는다 (자석 밖에서 떼면 취소)
    const p = inp.pointer ?? null;
    if (p) {
      if (!s.down) (s.down = true), (s.downOk = s.phase === 'play'), (s.press = 0);
      s.press++;
      s.aim = { x: p.x, y: p.y * A };
      s.hold = magnetAt(s.L, s.aim.x, s.aim.y);
    } else if (s.down) {
      s.down = false;
      if (s.downOk && s.phase === 'play' && s.hold >= 0) doFlip(s, s.hold);
      s.hold = -1;
      s.aim = null;
    }
    if (s.phase === 'move') {
      playAnim(s);
      if (s.t - s.anim!.t0 >= s.anim!.dur) finishAnim(s);
    } else if (s.phase === 'result' && s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
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
const atMag = (L: Level, j: number): Input => ({ tap: false, dir: 0, pointer: { x: cellX(L, L.mags[j].x, L.mags[j].y), y: cellY(L, L.mags[j].y) / A } });
const brain = new WeakMap<object, { key: string; j: number }>();
/** 잘하는 봇의 다음 수: 판을 만들 때 찾아 둔 최단(★3) 풀이를 따르고, 길에서 벗어났으면 지금 자리에서 다시 탐색 */
function smartMove(s: PolarState) {
  const L = s.L;
  if (s.hist.every((j, k) => L.plan[k] === j) && s.used < L.plan.length) return L.plan[s.used];
  const sol = solve(L, s.S, Math.max(1, L.limit - s.used), 20000);
  return sol.p1[0] ?? sol.p0[0] ?? habitMove(L, s.S);
}
function pressBot(s: PolarState, pick: (s: PolarState) => number): Input {
  if (s.phase !== 'play') return NO;
  if (s.down) return s.press < HOLD && s.hold >= 0 ? atMag(s.L, s.hold) : NO;
  if (s.t - s.ready < THINK || s.t - s.startT < 50) return NO;
  const key = `${s.stage}:${s.tries}:${s.used}`;
  let m = brain.get(s);
  if (!m || m.key !== key) brain.set(s, (m = { key, j: pick(s) }));
  return atMag(s.L, m.j);
}
/** 봇: 판을 만들 때 풀이 탐색으로 찾은 길(★3)을 따라, 누르고(미리 보기) 잠깐 보고 뗀다 */
export const polarflipSmart: Bot<PolarState> = { name: '부엌 박사', act: (s) => pressBot(s, smartMove) };
/** 버릇 봇(측정용): 제자리에 가장 가까운 쇠붙이를 다스리는 자석부터 뒤집는다 */
export const polarflipHabit: Bot<PolarState> = { name: '버릇: 가까운 것부터', act: (s) => pressBot(s, (q) => habitMove(q.L, q.S)) };

const dumbMem = new WeakMap<object, { next: number; hold: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 자석이나(가끔 아무 데나) 톡 */
export const polarflipRandom: Bot<PolarState> = {
  name: '아무 자석이나 톡',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, p: { x: 0, y: 0 } }));
    if (m.hold > 0) return --m.hold > 0 ? { tap: false, dir: 0, pointer: m.p } : NO;
    if (s.t < m.next) return NO;
    m.next = s.t + 30 + Math.floor(rng() * 110);
    m.hold = 2 + Math.floor(rng() * 4);
    const L = s.L;
    if (rng() < 0.25) m.p = { x: rng(), y: rng() };
    else {
      const j = Math.floor(rng() * L.mags.length);
      m.p = { x: cellX(L, L.mags[j].x, L.mags[j].y) + (rng() - 0.5) * 0.04, y: (cellY(L, L.mags[j].y) + (rng() - 0.5) * 0.04) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
/** 극 색: 0 N 빨강 · 1 S 파랑 — [밝은, 기본, 어두운] */
const POLE = [
  ['#ffb1a6', '#ff5a4f', '#b8302a'],
  ['#b3d4ff', '#3f8cff', '#1d4fae'],
];
const TINT = ['rgba(255,96,80,', 'rgba(52,126,255,'];
const PREV = new WeakMap<object, { key: string; rec: Rec; to: Sim; c: number }>();
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
function shadow(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.22) {
  ctx.fillStyle = `rgba(70,40,20,${a})`;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
}
/** 눈 한 쌍. mood 0 평온 · 1 놀람 · 2 철컥(질끈) · 3 쏙(행복) · 4 어질 · 5 졸림. (lx,ly) = 보는 쪽 */
function eyes(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, lx: number, ly: number, t: number, gap = 0.36) {
  for (const sd of [-1, 1]) {
    const ex = x + sd * u * gap, ey = y, er = u * (mood === 1 ? 0.27 : 0.21);
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    ctx.strokeStyle = '#2a1a14';
    if (mood === 2) {
      ctx.beginPath();
      ctx.moveTo(ex - er, ey - er * 0.6 * sd);
      ctx.lineTo(ex + er * 0.6 * sd, ey);
      ctx.lineTo(ex - er, ey + er * 0.6 * sd);
      ctx.stroke();
      continue;
    }
    if (mood === 3 || mood === 5) {
      ctx.beginPath();
      if (mood === 3) ctx.arc(ex, ey + er * 0.3, er * 0.8, Math.PI * 1.15, Math.PI * 1.85);
      else ctx.arc(ex, ey - er * 0.2, er * 0.75, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1, u * 0.05);
    ctx.stroke();
    ctx.fillStyle = '#1a1210';
    if (mood === 4) {
      ctx.beginPath();
      for (let k = 0; k < 12; k++) {
        const a = k * 0.7 + t * 0.3, rr = (k / 12) * er * 0.85;
        ctx.lineTo(ex + Math.cos(a) * rr, ey + Math.sin(a) * rr);
      }
      ctx.stroke();
    } else {
      const pr = er * (mood === 1 ? 0.36 : 0.5);
      ctx.beginPath();
      ctx.arc(ex + lx * er * 0.42, ey + ly * er * 0.42, pr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ex + lx * er * 0.42 - pr * 0.35, ey + ly * er * 0.42 - pr * 0.35, pr * 0.32, 0, TAU);
      ctx.fill();
    }
  }
}
/** 극 딱지 (N/S 동그라미) */
function poleTag(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, pol: number) {
  const c = POLE[pol];
  ctx.fillStyle = c[2];
  ctx.beginPath();
  ctx.arc(x, y + r * 0.18, r, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, c[0]);
  g.addColorStop(1, c[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(9, r * 1.35)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pol ? 'S' : 'N', x, y + r * 0.06);
}
const steel = (ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) => {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.35, '#d9dee6');
  g.addColorStop(0.7, '#9aa3b0');
  g.addColorStop(1, '#dfe4ea');
  return g;
};

/** 숟가락·포크: 조리대에 비스듬히 누운 모습. 손잡이 끝 색 = 극 */
function drawCutlery(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, fork: boolean, pol: number, mood: number, lx: number, ly: number, t: number, tilt: number) {
  shadow(ctx, x + u * 0.1, y + u * 0.42, u * 1.05, u * 0.32);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.55 + tilt);
  // 손잡이
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#7c8593';
  ctx.lineWidth = u * 0.34;
  ctx.beginPath();
  ctx.moveTo(u * 0.25, 0);
  ctx.lineTo(u * 1.25, 0);
  ctx.stroke();
  ctx.strokeStyle = steel(ctx, 0, -u * 0.15, 0, u * 0.15);
  ctx.lineWidth = u * 0.26;
  ctx.stroke();
  // 손잡이 끝 극 색
  ctx.strokeStyle = POLE[pol][1];
  ctx.lineWidth = u * 0.36;
  ctx.beginPath();
  ctx.moveTo(u * 1.0, 0);
  ctx.lineTo(u * 1.32, 0);
  ctx.stroke();
  ctx.strokeStyle = POLE[pol][0];
  ctx.lineWidth = u * 0.1;
  ctx.beginPath();
  ctx.moveTo(u * 1.04, -u * 0.07);
  ctx.lineTo(u * 1.26, -u * 0.07);
  ctx.stroke();
  if (fork) {
    ctx.strokeStyle = '#8a93a0';
    ctx.lineWidth = u * 0.12;
    for (let k = 0; k < 4; k++) {
      const yy = (k - 1.5) * u * 0.17;
      ctx.beginPath();
      ctx.moveTo(-u * 0.25, yy * 0.8);
      ctx.lineTo(-u * 0.95, yy);
      ctx.stroke();
    }
    ctx.fillStyle = steel(ctx, -u * 0.5, -u * 0.4, -u * 0.2, u * 0.4);
    ctx.beginPath();
    ctx.ellipse(-u * 0.1, 0, u * 0.42, u * 0.36, 0, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#7c8593';
    ctx.beginPath();
    ctx.ellipse(-u * 0.38, u * 0.04, u * 0.66, u * 0.48, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = steel(ctx, -u * 0.9, -u * 0.5, -u * 0.1, u * 0.5);
    ctx.beginPath();
    ctx.ellipse(-u * 0.38, 0, u * 0.62, u * 0.44, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.beginPath();
    ctx.ellipse(-u * 0.55, -u * 0.18, u * 0.22, u * 0.08, -0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // 손잡이 끝 극 딱지 (자석 글자와 같은 N/S)
  const ca = -0.55 + tilt;
  poleTag(ctx, x + Math.cos(ca) * u * 1.3, y + Math.sin(ca) * u * 1.3, u * 0.26, pol);
  eyes(ctx, x - u * 0.28, y - u * 0.02 - (fork ? 0 : u * 0.08), u * 0.82, mood, lx, ly, t);
}

/** 냄비: 강철 몸통 + 뚜껑 + 손잡이, 앞에 극 딱지 */
function drawPot(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pol: number, mood: number, lx: number, ly: number, t: number, steam: boolean) {
  shadow(ctx, x, y + u * 0.55, u * 1.15, u * 0.36, 0.28);
  const bw = u * 0.95, top = y - u * 0.55, bot = y + u * 0.45;
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#3b3f48';
    ctx.beginPath();
    ctx.roundRect(x + sd * bw - (sd > 0 ? 0 : u * 0.32), top + u * 0.18, u * 0.32, u * 0.18, u * 0.08);
    ctx.fill();
  }
  ctx.fillStyle = steel(ctx, x - bw, 0, x + bw, 0);
  ctx.beginPath();
  ctx.moveTo(x - bw, top);
  ctx.lineTo(x - bw, bot);
  ctx.ellipse(x, bot, bw, u * 0.26, 0, Math.PI, 0, true);
  ctx.lineTo(x + bw, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,60,70,.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
  // 뚜껑
  ctx.fillStyle = '#c9cfd8';
  ctx.beginPath();
  ctx.ellipse(x, top, bw * 1.04, u * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = steel(ctx, x - bw, top - u * 0.3, x + bw, top + u * 0.3);
  ctx.beginPath();
  ctx.ellipse(x, top - u * 0.04, bw * 0.92, u * 0.24, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3b3f48';
  ctx.beginPath();
  ctx.ellipse(x, top - u * 0.16, u * 0.2, u * 0.11, 0, 0, TAU);
  ctx.fill();
  poleTag(ctx, x + bw * 0.55, y + u * 0.12, u * 0.22, pol);
  eyes(ctx, x - u * 0.2, y - u * 0.08, u * 0.9, mood, lx, ly, t);
  if (steam)
    for (let k = 0; k < 3; k++) {
      const age = (t + k * 20) % 60;
      ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - age / 60)})`;
      ctx.beginPath();
      ctx.arc(x + Math.sin(age * 0.1 + k) * u * 0.3 + (k - 1) * u * 0.3, top - u * 0.3 - age * u * 0.03, u * (0.12 + age * 0.004), 0, TAU);
      ctx.fill();
    }
}

/** 쇠 국자: 둥근 우묵한 머리 + 긴 손잡이, 손잡이에 빨강·파랑 반반 (두 극 모두에 끌림) */
function drawLadle(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, lx: number, ly: number, t: number, tilt: number) {
  shadow(ctx, x + u * 0.2, y + u * 0.42, u * 1.1, u * 0.34);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.75 + tilt);
  ctx.lineCap = 'round';
  ctx.strokeStyle = steel(ctx, 0, -u * 0.1, 0, u * 0.1);
  ctx.lineWidth = u * 0.22;
  ctx.beginPath();
  ctx.moveTo(u * 0.4, 0);
  ctx.lineTo(u * 1.5, 0);
  ctx.stroke();
  ctx.lineWidth = u * 0.3;
  ctx.strokeStyle = POLE[0][1];
  ctx.beginPath();
  ctx.moveTo(u * 1.05, 0);
  ctx.lineTo(u * 1.28, 0);
  ctx.stroke();
  ctx.strokeStyle = POLE[1][1];
  ctx.beginPath();
  ctx.moveTo(u * 1.3, 0);
  ctx.lineTo(u * 1.55, 0);
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#6f7886';
  ctx.beginPath();
  ctx.arc(x, y + u * 0.06, u * 0.62, 0, TAU);
  ctx.fill();
  ctx.fillStyle = steel(ctx, x - u * 0.6, y - u * 0.6, x + u * 0.6, y + u * 0.6);
  ctx.beginPath();
  ctx.arc(x, y, u * 0.58, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(60,70,90,.35)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.12, u * 0.4, u * 0.28, 0, 0, TAU);
  ctx.fill();
  eyes(ctx, x, y - u * 0.12, u * 0.85, mood, lx, ly, t);
}

/** 나무 도마: 결이 있는 둥근 네모 + 손잡이 구멍, 졸린 눈 (자석엔 무심) */
function drawBoard(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number) {
  shadow(ctx, x + u * 0.08, y + u * 0.5, u * 1.05, u * 0.3, 0.28);
  const bw = u * 0.95, bh = u * 0.62, th = u * 0.2;
  ctx.fillStyle = '#9a6234';
  ctx.beginPath();
  ctx.roundRect(x - bw, y - bh + th, bw * 2, bh * 2, u * 0.22);
  ctx.fill();
  const g = ctx.createLinearGradient(x - bw, y - bh, x + bw, y + bh);
  g.addColorStop(0, '#f0bf86');
  g.addColorStop(1, '#cf8f52');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x - bw, y - bh, bw * 2, bh * 2, u * 0.22);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,80,30,.35)';
  ctx.lineWidth = 1;
  for (let k = 0; k < 4; k++) {
    ctx.beginPath();
    ctx.moveTo(x - bw * 0.85, y - bh * 0.6 + k * bh * 0.4);
    ctx.quadraticCurveTo(x, y - bh * 0.5 + k * bh * 0.4 + Math.sin(k) * u * 0.1, x + bw * 0.6, y - bh * 0.62 + k * bh * 0.4);
    ctx.stroke();
  }
  ctx.fillStyle = '#7a4a26';
  ctx.beginPath();
  ctx.ellipse(x + bw * 0.72, y - bh * 0.45, u * 0.1, u * 0.08, 0, 0, TAU);
  ctx.fill();
  eyes(ctx, x - u * 0.15, y - u * 0.05, u * 0.8, mood === 0 ? 5 : mood, 0, 0, t);
}

/** 방울 단 고양이. pose 0 앉음 · 1 질질 끌려감(배 깔고 버둥) · 2 방석에서 골골 */
function drawCat(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pol: number, pose: number, mood: number, lx: number, t: number) {
  shadow(ctx, x, y + u * 0.5, u * 1.1, u * 0.32, 0.25);
  const fur = '#f39a3c', dark = '#c96a1e', light = '#ffd29a';
  ctx.save();
  ctx.translate(x, y);
  if (pose === 1) {
    // 배를 깐 채 질질: 몸이 뒤로 젖혀지고 네 발이 허우적
    ctx.rotate(Math.sin(t * 0.5) * 0.12);
    ctx.strokeStyle = fur;
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.22;
    for (let k = 0; k < 4; k++) {
      const bx = (k - 1.5) * u * 0.38, a = Math.sin(t * 0.7 + k * 1.7) * 0.6;
      ctx.beginPath();
      ctx.moveTo(bx, -u * 0.1);
      ctx.lineTo(bx + Math.sin(a) * u * 0.4, -u * 0.55 - Math.cos(a) * u * 0.25);
      ctx.stroke();
    }
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.1, u * 0.85, u * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.02, u * 0.55, u * 0.28, 0, 0, TAU);
    ctx.fill();
    // 꼬리 (빳빳)
    ctx.strokeStyle = dark;
    ctx.lineWidth = u * 0.16;
    ctx.beginPath();
    ctx.moveTo(-u * 0.8, u * 0.15);
    ctx.lineTo(-u * 1.35, -u * 0.35 + Math.sin(t * 0.9) * u * 0.15);
    ctx.stroke();
  } else {
    // 꼬리
    ctx.strokeStyle = dark;
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 0.17;
    ctx.beginPath();
    ctx.moveTo(-u * 0.5, u * 0.25);
    ctx.quadraticCurveTo(-u * 1.15, u * 0.1, -u * 0.95, -u * 0.5 + Math.sin(t * 0.06) * u * 0.15);
    ctx.stroke();
    ctx.fillStyle = fur;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.15, u * (pose === 2 ? 0.9 : 0.62), u * (pose === 2 ? 0.42 : 0.5), 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.ellipse(-u * 0.2 + k * u * 0.2, -u * 0.12, u * 0.06, u * 0.16, 0, 0, TAU);
      ctx.fill();
    }
  }
  // 머리
  const hx = pose === 1 ? u * 0.75 : pose === 2 ? u * 0.55 : 0, hy = pose === 1 ? -u * 0.05 : pose === 2 ? -u * 0.05 : -u * 0.5;
  ctx.fillStyle = fur;
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * u * 0.42, hy - u * 0.15);
    ctx.lineTo(hx + sd * u * 0.5, hy - u * 0.7);
    ctx.lineTo(hx + sd * u * 0.1, hy - u * 0.38);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(hx, hy, u * 0.52, u * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffb3b3';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(hx + sd * u * 0.38, hy - u * 0.25);
    ctx.lineTo(hx + sd * u * 0.44, hy - u * 0.55);
    ctx.lineTo(hx + sd * u * 0.18, hy - u * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // 얼굴
  const fxx = x + hx, fyy = y + hy;
  eyes(ctx, fxx, fyy - u * 0.04, u * 0.75, pose === 2 ? 5 : pose === 1 ? (mood === 4 ? 4 : 1) : mood, lx, 0, t, 0.3);
  ctx.strokeStyle = '#5a2a10';
  ctx.lineWidth = Math.max(1, u * 0.05);
  ctx.beginPath();
  if (pose === 1) ctx.ellipse(fxx, fyy + u * 0.22, u * 0.1, u * 0.08 + Math.abs(Math.sin(t * 0.4)) * u * 0.06, 0, 0, TAU);
  else (ctx.moveTo(fxx - u * 0.1, fyy + u * 0.2), ctx.quadraticCurveTo(fxx, fyy + u * 0.28, fxx + u * 0.1, fyy + u * 0.2));
  ctx.stroke();
  ctx.strokeStyle = 'rgba(80,40,20,.6)';
  ctx.lineWidth = 1;
  for (const sd of [-1, 1])
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      ctx.moveTo(fxx + sd * u * 0.25, fyy + u * 0.14 + k * u * 0.07);
      ctx.lineTo(fxx + sd * u * 0.62, fyy + u * 0.08 + k * u * 0.12);
      ctx.stroke();
    }
  // 목걸이 + 방울 (극 색)
  const cx = fxx, cy = fyy + u * 0.4;
  ctx.strokeStyle = '#7a2ad0';
  ctx.lineWidth = u * 0.1;
  ctx.beginPath();
  ctx.arc(cx, cy - u * 0.25, u * 0.3, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  const bx = cx + (pose === 1 ? Math.sin(t * 0.8) * u * 0.08 : 0), by = cy + u * 0.02;
  const g = ctx.createRadialGradient(bx - u * 0.06, by - u * 0.06, u * 0.02, bx, by, u * 0.18);
  g.addColorStop(0, POLE[pol][0]);
  g.addColorStop(1, POLE[pol][2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(bx, by, u * 0.17, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(8, u * 0.22)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pol ? 'S' : 'N', bx, by + 1);
  if (pose === 2) {
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = `800 ${Math.max(12, u * 0.5)}px system-ui, sans-serif`;
    ctx.fillText('z', x + u * 0.9, y - u * 0.7 - (t % 60) * u * 0.01);
  }
}

/** 자석: 두께 있는 동그란 냉장고 자석(N 빨강 · S 파랑). 회전 자석은 말굽 모양으로 바라보는 쪽을 가리킨다 */
function drawMagnet(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, pol: number, turn: boolean, dir: number, hop: number, held: boolean, t: number) {
  shadow(ctx, x, y + u * 0.32, u * 0.95, u * 0.36, 0.3);
  const lift = Math.sin(Math.min(1, hop) * Math.PI) * u * 0.55, sq = 1 + Math.sin(Math.min(1, hop) * Math.PI * 2) * 0.12;
  const yy = y - lift, c = POLE[pol];
  if (held) {
    ctx.strokeStyle = `rgba(255,255,255,${0.55 + 0.35 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y + u * 0.1, u * 1.1, u * 0.62, 0, 0, TAU);
    ctx.stroke();
  }
  if (turn) {
    ctx.save();
    ctx.translate(x, yy);
    const ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][dir];
    ctx.scale(1, SQ);
    ctx.rotate(ang + Math.PI / 2);
    // 말굽: 아래쪽이 둥글고 두 끝이 바라보는 쪽(위)으로
    ctx.lineCap = 'butt';
    ctx.strokeStyle = c[2];
    ctx.lineWidth = u * 0.52;
    ctx.beginPath();
    ctx.arc(0, u * 0.12 + u * 0.1, u * 0.42, 0, Math.PI);
    ctx.moveTo(-u * 0.42, u * 0.22);
    ctx.lineTo(-u * 0.42, -u * 0.5);
    ctx.moveTo(u * 0.42, u * 0.22);
    ctx.lineTo(u * 0.42, -u * 0.5);
    ctx.stroke();
    ctx.strokeStyle = c[1];
    ctx.lineWidth = u * 0.42;
    ctx.beginPath();
    ctx.arc(0, u * 0.12, u * 0.42, 0, Math.PI);
    ctx.moveTo(-u * 0.42, u * 0.12);
    ctx.lineTo(-u * 0.42, -u * 0.55);
    ctx.moveTo(u * 0.42, u * 0.12);
    ctx.lineTo(u * 0.42, -u * 0.55);
    ctx.stroke();
    ctx.fillStyle = '#e8edf3';
    for (const sd of [-1, 1]) ctx.fillRect(sd * u * 0.42 - u * 0.21, -u * 0.8, u * 0.42, u * 0.28);
    ctx.restore();
    poleTag(ctx, x, yy + u * 0.02, u * 0.28, pol);
    return;
  }
  const rx = u * 0.82 * sq, ry = u * 0.48 / sq, hgt = u * 0.34;
  ctx.fillStyle = c[2];
  ctx.beginPath();
  ctx.ellipse(x, yy + hgt, rx, ry, 0, 0, Math.PI);
  ctx.lineTo(x - rx, yy);
  ctx.ellipse(x, yy, rx, ry, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.fill();
  const g = ctx.createRadialGradient(x - rx * 0.35, yy - ry * 0.5, rx * 0.1, x, yy, rx);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.7, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, yy, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  ctx.beginPath();
  ctx.ellipse(x - rx * 0.35, yy - ry * 0.4, rx * 0.3, ry * 0.18, -0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, u * 0.62)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(pol ? 'S' : 'N', x, yy + 1);
}

/** 수저통: 짧은 도자기 통(파란 줄무늬). 들어간 숟가락·포크는 위로 삐죽 */
function drawCup(ctx: CanvasRenderingContext2D, x: number, y: number, U: number, got: number[][], t: number) {
  const rx = U * 0.62, ry = U * 0.3, hgt = U * 0.55, top = y - hgt * 0.55, bot = top + hgt;
  shadow(ctx, x + U * 0.08, bot + U * 0.05, rx * 1.15, ry * 0.9, 0.28);
  // 꽂힌 것 (통 뒤쪽 절반)
  got.forEach(([k, pol], n) => {
    const ox = (n - (got.length - 1) / 2) * U * 0.3;
    ctx.save();
    ctx.translate(x + ox, top + U * 0.05);
    ctx.rotate((n - (got.length - 1) / 2) * 0.28 + Math.sin(t * 0.05 + n) * 0.03);
    ctx.fillStyle = POLE[pol][1];
    ctx.fillRect(-U * 0.075, -U * 0.35, U * 0.15, U * 0.3);
    ctx.fillStyle = '#c9d0da';
    ctx.fillRect(-U * 0.06, -U * 0.75, U * 0.12, U * 0.42);
    if (k === FORK) {
      ctx.fillStyle = '#c9d0da';
      for (let q = 0; q < 3; q++) ctx.fillRect(-U * 0.11 + q * U * 0.08, -U * 1.08, U * 0.05, U * 0.36);
    } else {
      ctx.fillStyle = '#e3e8ee';
      ctx.beginPath();
      ctx.ellipse(0, -U * 0.92, U * 0.15, U * 0.22, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  });
  const g = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
  g.addColorStop(0, '#cfe0f2');
  g.addColorStop(0.4, '#ffffff');
  g.addColorStop(1, '#a9c1dc');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - rx, top);
  ctx.lineTo(x - rx * 0.92, bot);
  ctx.ellipse(x, bot, rx * 0.92, ry * 0.9, 0, Math.PI, 0, true);
  ctx.lineTo(x + rx, top);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#3f74c0';
  ctx.lineWidth = Math.max(1.5, U * 0.08);
  for (const f of [0.35, 0.7]) {
    ctx.beginPath();
    ctx.ellipse(x, top + hgt * f, rx * (1 - f * 0.08), ry * 0.95, 0, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, top, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4a3a30';
  ctx.beginPath();
  ctx.ellipse(x, top + ry * 0.08, rx * 0.8, ry * 0.7, 0, 0, TAU);
  ctx.fill();
  if (got.length)
    got.forEach(([, pol], n) => {
      ctx.fillStyle = POLE[pol][1];
      ctx.beginPath();
      ctx.ellipse(x + (n - (got.length - 1) / 2) * U * 0.3, top + ry * 0.1, U * 0.07, U * 0.04, 0, 0, TAU);
      ctx.fill();
    });
  else {
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(11, U * 0.42)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 0.9;
    ctx.fillText('🥄', x, top + ry * 0.05);
    ctx.globalAlpha = 1;
  }
}

function drawAll(ctx: CanvasRenderingContext2D, s: PolarState, w: number, h: number, th: Theme) {
  const fx = juice(s), L = s.L, t = s.t, C = L.C, Rr = L.R, cw = cellW(L), chh = cw * SQ;
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const GX = (x: number, y: number) => X(cellX(L, x, y)), GY = (y: number) => Y(cellY(L, y));
  const Uy = (y: number) => R(cw * 0.5) * sbl(L, y + 0.5);
  const corner = (xx: number, yy: number) => [X(ptX(L, xx, yy)), Y(rowY(L, yy))];
  const quad = (x: number, y: number, x1 = x + 1, y1 = y + 1) => {
    const [ax, ay] = corner(x, y), [bx, by] = corner(x1, y), [qx, qy] = corner(x1, y1), [dx, dy] = corner(x, y1);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.lineTo(qx, qy);
    ctx.lineTo(dx, dy);
    ctx.closePath();
  };
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const U = R(cw * 0.5);
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 36 && Math.abs(q.x - x) < w * 0.22 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 16) rec.shift();
    fx.pop(Math.max(w * 0.12, Math.min(w * 0.88, x)), y, text, col, size);
  };
  const a = s.anim, prog = a ? (t - a.t0 - FLIP_T) / a.stepT : 0;
  const Snow = a ? a.to : s.S, Sold = s.S;
  const boardTop = Y(rowY(L, 0)), boardBot = Y(rowY(L, Rr)), boardL = X(ptX(L, 0, Rr)), boardR = X(ptX(L, C, Rr));
  void chh;

  ctx.save();
  fx.begin(ctx);
  // ═════════════ 부엌 벽 ═════════════
  {
    const g = ctx.createLinearGradient(0, 0, 0, boardTop);
    g.addColorStop(0, '#f3e3cc');
    g.addColorStop(1, '#fbf1e2');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, boardTop + 10);
    // 지하철 타일
    const tw = R(0.083), tht = R(0.042);
    ctx.strokeStyle = 'rgba(190,160,120,.35)';
    ctx.lineWidth = 1;
    for (let r = 0; r * tht < boardTop - R(0.12); r++)
      for (let c = -1; c * tw < w + tw; c++) {
        const x0 = c * tw + (r % 2 ? tw / 2 : 0), y0 = R(0.12) + r * tht;
        ctx.strokeRect(x0, y0, tw, tht);
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.fillRect(x0 + 2, y0 + 2, tw * 0.35, 1.4);
      }
    // 창문 (햇살)
    const wx = X(0.07), wy = Y(0.105), ww = R(0.3), wh = R(0.15);
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#8fd3ff');
    sky.addColorStop(1, '#dff4ff');
    ctx.fillStyle = '#c98c55';
    ctx.fillRect(wx - R(0.012), wy - R(0.012), ww + R(0.024), wh + R(0.024));
    ctx.fillStyle = sky;
    ctx.fillRect(wx, wy, ww, wh);
    ctx.fillStyle = '#fff6b0';
    ctx.beginPath();
    ctx.arc(wx + ww * 0.75, wy + wh * 0.35, R(0.025), 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let k = 0; k < 2; k++) {
      const cx = wx + ((t * 0.08 + k * 60) % (ww / 1 + 40)) - 20, cy = wy + wh * (0.3 + k * 0.3);
      ctx.beginPath();
      ctx.ellipse(cx, cy, R(0.03), R(0.01), 0, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#c98c55';
    ctx.fillRect(wx + ww / 2 - 1.5, wy, 3, wh);
    ctx.fillRect(wx, wy + wh / 2 - 1.5, ww, 3);
    // 화분
    ctx.fillStyle = '#d8774a';
    ctx.beginPath();
    ctx.roundRect(wx + ww * 0.12, wy + wh - R(0.04), R(0.045), R(0.04), R(0.006));
    ctx.fill();
    ctx.fillStyle = '#4fae5a';
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.ellipse(wx + ww * 0.12 + R(0.022) + (k - 1.5) * R(0.012), wy + wh - R(0.055), R(0.009), R(0.022), (k - 1.5) * 0.4, 0, TAU);
      ctx.fill();
    }
    // 걸이 막대 + 매달린 조리도구
    ctx.fillStyle = '#9aa3b0';
    ctx.fillRect(X(0.42), Y(0.115), R(0.25), R(0.008));
    for (let k = 0; k < 4; k++) {
      const hx = X(0.45 + k * 0.06), sw = Math.sin(t * 0.03 + k) * 0.06 + (fx.memo.swing ?? 0) * Math.sin(t * 0.3 + k) * 0.3;
      ctx.save();
      ctx.translate(hx, Y(0.12));
      ctx.rotate(sw);
      ctx.strokeStyle = '#7c8593';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, R(0.05));
      ctx.stroke();
      ctx.fillStyle = k % 2 ? '#c96a3a' : '#cfd5dd';
      ctx.beginPath();
      if (k === 0) ctx.ellipse(0, R(0.07), R(0.016), R(0.022), 0, 0, TAU);
      else if (k === 1) ctx.roundRect(-R(0.014), R(0.05), R(0.028), R(0.045), R(0.006));
      else if (k === 2) ctx.arc(0, R(0.07), R(0.02), 0, TAU);
      else ctx.roundRect(-R(0.006), R(0.05), R(0.012), R(0.05), R(0.004));
      ctx.fill();
      ctx.restore();
    }
    fx.memo.swing = (fx.memo.swing ?? 0) * 0.96;
    // 냉장고 (오른쪽) + 위에서 구경하는 고양이 (7판 전까지)
    const fxl = X(0.76), fyt = Y(0.17), fw = R(0.2);
    const fg = ctx.createLinearGradient(fxl, 0, fxl + fw, 0);
    fg.addColorStop(0, '#e9f3f6');
    fg.addColorStop(1, '#bcd2da');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(fxl, fyt, fw, boardTop - fyt + R(0.02), [R(0.02), R(0.02), 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#9fb7c0';
    ctx.fillRect(fxl + R(0.02), fyt + R(0.05), R(0.008), R(0.06));
    // 냉장고에 붙은 작은 자석들
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = POLE[k % 2][1];
      ctx.beginPath();
      ctx.arc(fxl + R(0.07 + k * 0.04), fyt + R(0.07 + (k % 2) * 0.03), R(0.011), 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff6b0';
    ctx.fillRect(fxl + R(0.06), fyt + R(0.06), R(0.05), R(0.04));
    const catOn = !L.kinds.includes(CAT);
    if (catOn) {
      const scare = t - s.catT, jump = scare < 30 ? Math.sin((scare / 30) * Math.PI) * R(0.04) : 0;
      drawCat(ctx, fxl + fw * 0.5, fyt - R(0.035) - jump, R(0.05), 0, scare < 50 ? 0 : 2, scare < 50 ? 1 : 0, 0, t);
      if (scare < 50) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = 'rgba(60,30,10,.6)';
        ctx.lineWidth = 3;
        font(0.034, 900);
        ctx.textAlign = 'center';
        ctx.strokeText('냥?!', fxl - R(0.04), fyt + R(0.02) - jump);
        ctx.fillText('냥?!', fxl - R(0.04), fyt + R(0.02) - jump);
      }
    }
  }
  // ═════════════ 조리대 (격자) ═════════════
  // 뒷벽 턱 · 조리대 그림자 · 앞면(서랍장)
  {
    // 뒷벽 턱 + 조리대 나무 테 (원근 사다리꼴)
    const m0 = 0.32, m1 = 0.3;
    ctx.fillStyle = '#d9b48a';
    quad(-m0, -0.45, C + m0, 0);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = 'rgba(60,30,10,.35)';
    ctx.shadowBlur = R(0.03);
    ctx.shadowOffsetY = R(0.012);
    ctx.fillStyle = '#b97a48';
    quad(-m0, -0.12, C + m1, Rr + 0.22);
    ctx.fill();
    ctx.restore();
    const eg = ctx.createLinearGradient(0, boardTop, 0, boardBot);
    eg.addColorStop(0, '#c98c55');
    eg.addColorStop(1, '#e0a66b');
    ctx.fillStyle = eg;
    quad(-0.22, -0.1, C + 0.22, Rr + 0.18);
    ctx.fill();
  }
  {
    // 조리대 앞면: 두꺼운 나무 테 + 서랍장 (손잡이)
    const fy = Y(rowY(L, Rr + 0.18)), g = ctx.createLinearGradient(0, fy, 0, h);
    g.addColorStop(0, '#a8693a');
    g.addColorStop(1, '#6d3f20');
    ctx.fillStyle = g;
    ctx.fillRect(boardL - R(0.03), fy, boardR - boardL + R(0.06), h - fy);
    ctx.fillStyle = '#c98c55';
    ctx.fillRect(boardL - R(0.03), fy, boardR - boardL + R(0.06), R(0.018));
    ctx.fillStyle = 'rgba(255,230,190,.5)';
    ctx.fillRect(boardL - R(0.03), fy, boardR - boardL + R(0.06), 1.5);
    for (let k = 0; k < 3; k++) {
      const dx = boardL + k * (boardR - boardL) / 3 + R(0.012), dw = (boardR - boardL) / 3 - R(0.024), dy = fy + R(0.028);
      ctx.fillStyle = 'rgba(60,30,10,.25)';
      ctx.beginPath();
      ctx.roundRect(dx, dy, dw, R(0.08), R(0.01));
      ctx.fill();
      ctx.fillStyle = '#e6c08a';
      ctx.beginPath();
      ctx.roundRect(dx + dw / 2 - R(0.04), dy + R(0.014), R(0.08), R(0.014), R(0.007));
      ctx.fill();
    }
  }
  // 타일 + 자석 구역 색 (뒤집힌 자석은 물결처럼 바깥으로 색이 번진다)
  const zone = (x: number, y: number) => {
    let g = governor(L, Snow, x, y), S0 = Snow;
    if (a) {
      const m = L.mags[a.j], d = Math.hypot(x - m.x, y - m.y), r = (t - a.t0) / 2.2;
      if (d > r) (g = governor(L, Sold, x, y)), (S0 = Sold);
    }
    return { g, pol: g >= 0 ? S0.mp[g] : -1 };
  };
  const zs: { g: number; pol: number }[] = [];
  for (let y = 0; y < Rr; y++) for (let x = 0; x < C; x++) zs.push(zone(x, y));
  const hold = s.down && s.phase === 'play' ? s.hold : -1;
  for (let y = 0; y < Rr; y++)
    for (let x = 0; x < C; x++) {
      const c = y * C + x, z = zs[c];
      ctx.fillStyle = (x + y) % 2 ? '#f4e8d6' : '#fbf4e8';
      quad(x, y);
      ctx.fill();
      if (z.g >= 0) {
        const pulse = hold === z.g ? 0.12 + 0.08 * Math.sin(t * 0.25) : 0;
        const fresh = a && a.j === z.g ? Math.max(0, 0.25 - (t - a.t0) * 0.006) : 0;
        ctx.fillStyle = TINT[z.pol] + ((z.pol ? 0.25 : 0.2) + pulse + fresh).toFixed(3) + ')';
        ctx.fill();
      }
      ctx.strokeStyle = 'rgba(150,110,70,.22)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const [hx0, hy0] = corner(x + 0.08, y + 0.1), [hx1] = corner(x + 0.45, y + 0.1);
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.fillRect(hx0, hy0, hx1 - hx0, 1.3);
    }
  // 구역 경계선
  ctx.strokeStyle = 'rgba(90,50,40,.38)';
  ctx.lineWidth = 2;
  ctx.setLineDash([R(0.012), R(0.008)]);
  ctx.beginPath();
  for (let y = 0; y < Rr; y++)
    for (let x = 0; x < C; x++) {
      const g = zs[y * C + x].g;
      if (x + 1 < C && zs[y * C + x + 1].g !== g) (ctx.moveTo(...(corner(x + 1, y) as [number, number])), ctx.lineTo(...(corner(x + 1, y + 1) as [number, number])));
      if (y + 1 < Rr && zs[(y + 1) * C + x].g !== g) (ctx.moveTo(...(corner(x, y + 1) as [number, number])), ctx.lineTo(...(corner(x + 1, y + 1) as [number, number])));
    }
  ctx.stroke();
  ctx.setLineDash([]);
  // 창문 햇살이 조리대 왼쪽 위에 번진다
  {
    const lg = ctx.createRadialGradient(X(0.2), Y(BY), R(0.05), X(0.25), Y(BY + 0.15), R(0.75));
    lg.addColorStop(0, 'rgba(255,250,225,.42)');
    lg.addColorStop(1, 'rgba(255,250,225,0)');
    ctx.fillStyle = lg;
    quad(0, 0, C, Rr);
    ctx.fill();
    const vg = ctx.createLinearGradient(0, boardTop, 0, boardBot);
    vg.addColorStop(0, 'rgba(90,50,20,.12)');
    vg.addColorStop(0.15, 'rgba(90,50,20,0)');
    ctx.fillStyle = vg;
    ctx.fill();
  }
  // 바닥에 붙은 것: 화구 · 국자 받침 · 방석 · 개수대 (수저통은 서 있어서 앞뒤 순서대로 그린다)
  /** 이 제자리 칸에 (지금 화면 기준으로) 들어가 있는 쇠붙이 */
  const inHome = (c: number) => {
    const out: number[] = [];
    const F = a ? a.rec.frames : null, k = F ? Math.min(F.length - 1, Math.max(0, Math.floor(prog))) : 0;
    for (let i = 0; i < L.kinds.length; i++) {
      const p = F ? F[k][i] : s.S.p[i], hc = a ? a.to.hc[i] : s.S.hc[i];
      if (p === IN && hc === c) out.push(i);
    }
    return out;
  };
  for (let c = 0; c < C * Rr; c++) {
    const hk = L.home[c], x = GX(c % C, (c / C) | 0), y = GY((c / C) | 0), U = Uy((c / C) | 0);
    if (L.cell[c] === SINK) {
      ctx.fillStyle = '#8b98a6';
      ctx.beginPath();
      ctx.roundRect(x - U * 0.9, y - U * 0.72, U * 1.8, U * 1.44, U * 0.3);
      ctx.fill();
      const wg = ctx.createLinearGradient(0, y - U * 0.6, 0, y + U * 0.6);
      wg.addColorStop(0, '#9fe0ff');
      wg.addColorStop(1, '#3d9fd6');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.roundRect(x - U * 0.75, y - U * 0.58, U * 1.5, U * 1.16, U * 0.24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(x, y, U * (0.25 + 0.1 * Math.sin(t * 0.1)), U * 0.12, 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#2a4a5a';
      ctx.beginPath();
      ctx.ellipse(x, y + U * 0.05, U * 0.12, U * 0.07, 0, 0, TAU);
      ctx.fill();
      continue;
    }
    if (hk === CUP) {
      // 수저통은 아래 '판 위의 것들'에서 그린다
    } else if (hk === STOVE) {
      ctx.fillStyle = '#2b2b30';
      ctx.beginPath();
      ctx.ellipse(x, y, U * 0.88, U * 0.6, 0, 0, TAU);
      ctx.fill();
      const on = inHome(c).length > 0;
      ctx.strokeStyle = on ? `rgba(110,170,255,${0.7 + 0.3 * Math.sin(t * 0.5)})` : '#55555e';
      ctx.lineWidth = U * 0.12;
      ctx.beginPath();
      ctx.ellipse(x, y, U * 0.56, U * 0.36, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#77777f';
      ctx.lineWidth = 2;
      for (let k = 0; k < 4; k++) {
        const an = (k * Math.PI) / 2 + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(an) * U * 0.25, y + Math.sin(an) * U * 0.17);
        ctx.lineTo(x + Math.cos(an) * U * 0.8, y + Math.sin(an) * U * 0.54);
        ctx.stroke();
      }
    } else if (hk === REST) {
      ctx.fillStyle = '#e7d3ff';
      ctx.beginPath();
      ctx.ellipse(x, y + U * 0.05, U * 0.82, U * 0.46, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#b99ae0';
      ctx.beginPath();
      ctx.ellipse(x, y + U * 0.05, U * 0.55, U * 0.28, 0, 0, TAU);
      ctx.fill();
      if (!inHome(c).length) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(11, U * 0.5)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🥣', x, y);
      }
    } else if (hk === BED) {
      ctx.fillStyle = '#d9588a';
      ctx.beginPath();
      ctx.ellipse(x, y + U * 0.12, U * 0.95, U * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff9cc2';
      ctx.beginPath();
      ctx.ellipse(x, y, U * 0.92, U * 0.56, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffd1e3';
      ctx.beginPath();
      ctx.ellipse(x, y, U * 0.58, U * 0.32, 0, 0, TAU);
      ctx.fill();
      if (!inHome(c).length) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(11, U * 0.5)}px system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', x, y);
      }
    }
  }

  // ═════════════ 미리 보기 계산 (누르고 있는 동안) ═════════════
  let pv: { rec: Rec; to: Sim; c: number } | null = null;
  if (hold >= 0 && !a) {
    const key = `${s.stage}:${s.tries}:${s.used}:${hold}`, cc = PREV.get(s);
    if (cc && cc.key === key) pv = cc;
    else {
      const rec: Rec = { frames: [], evs: [], gov: [], att: [] }, to = cloneSim(s.S), c = resolve(L, to, hold, rec);
      pv = { rec, to, c };
      PREV.set(s, { key, ...pv });
    }
  }

  // ═════════════ 판 위의 것들 (뒤에서 앞으로) ═════════════
  /** 쇠붙이 i의 지금 화면 자리 (연출 중이면 칸 사이를 미끄러진다) */
  const posOf = (i: number) => {
    const cx = (c: number) => c % C, cy = (c: number) => (c / C) | 0;
    if (!a) {
      const p = s.S.p[i];
      return p >= 0 ? { x: cx(p), y: cy(p), st: 0, mv: 0, dx: 0, dy: 0 } : { x: cx(s.S.hc[i]), y: cy(s.S.hc[i]), st: p === IN ? 1 : 2, mv: 0, dx: 0, dy: 0 };
    }
    const F = a.rec.frames, n = F.length, pr = Math.max(0, prog), k = Math.min(n - 1, Math.floor(pr)), f = Math.min(1, pr - k);
    const p0 = F[k][i], p1 = F[Math.min(n - 1, k + 1)][i];
    if (p0 >= 0) {
      const q1 = p1 >= 0 ? p1 : a.to.hc[i];
      const x = cx(p0) + (cx(q1) - cx(p0)) * f, y = cy(p0) + (cy(q1) - cy(p0)) * f;
      return { x, y, st: p1 >= 0 || f < 1 ? 0 : p1 === IN ? 1 : 2, mv: p0 !== q1 ? 1 : 0, dx: cx(q1) - cx(p0), dy: cy(q1) - cy(p0) };
    }
    const hc = a.to.hc[i] >= 0 ? a.to.hc[i] : s.S.hc[i];
    return { x: cx(hc), y: cy(hc), st: p0 === IN ? 1 : 2, mv: 0, dx: 0, dy: 0 };
  };
  const items: { y: number; f: () => void }[] = [];
  for (let c = 0; c < C * Rr; c++)
    if (L.cell[c] === WALL) {
      const x = GX(c % C, (c / C) | 0), y = GY((c / C) | 0), U = Uy((c / C) | 0);
      items.push({
        y: (c / C) | 0,
        f: () => {
          shadow(ctx, x, y + U * 0.62, U * 1.0, U * 0.3, 0.3);
          ctx.fillStyle = '#7a4a26';
          ctx.beginPath();
          ctx.roundRect(x - U * 0.95, y - U * 0.5, U * 1.9, U * 1.15, U * 0.12);
          ctx.fill();
          const g = ctx.createLinearGradient(x - U, y - U, x + U, y);
          g.addColorStop(0, '#e9b67a');
          g.addColorStop(1, '#c18447');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(x - U * 0.95, y - U * 0.85, U * 1.9, U * 0.9, U * 0.12);
          ctx.fill();
          ctx.strokeStyle = 'rgba(120,70,30,.4)';
          ctx.lineWidth = 1;
          for (let k = 1; k < 4; k++) (ctx.beginPath(), ctx.moveTo(x - U * 0.95 + k * U * 0.47, y - U * 0.85), ctx.lineTo(x - U * 0.95 + k * U * 0.47, y + U * 0.05), ctx.stroke());
          ctx.fillStyle = '#ffffff';
          ctx.font = `${Math.max(12, U * 0.5)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.fillText('🧈', x, y - U * 0.4);
        },
      });
    }
  for (let c = 0; c < C * Rr; c++)
    if (L.home[c] === CUP) {
      const x = GX(c % C, (c / C) | 0), y = GY((c / C) | 0), got = inHome(c), U = Uy((c / C) | 0);
      items.push({ y: ((c / C) | 0) - 0.02, f: () => drawCup(ctx, x, y, U, got.map((i) => [L.kinds[i], L.pols[i]]), t) });
    }
  L.mags.forEach((m, j) => {
    const hop = (t - s.mt[j]) / 14;
    const pol = a && a.j === j && hop < 0.5 ? Sold.mp[j] : Snow.mp[j];
    let dir = Snow.md[j];
    if (a && a.j === j && m.turn && hop < 0.5) dir = Sold.md[j];
    items.push({ y: m.y, f: () => drawMagnet(ctx, GX(m.x, m.y), GY(m.y), Uy(m.y), pol, m.turn, dir, hop >= 0 && hop < 1 ? hop : 0, hold === j, t) });
  });
  const lookAt = (x: number, y: number) => {
    const g = governor(L, Snow, Math.round(x), Math.round(y));
    if (g < 0) return [0, 0];
    const m = L.mags[g], d = Math.hypot(m.x - x, m.y - y) || 1;
    return [(m.x - x) / d, (m.y - y) / d];
  };
  L.kinds.forEach((k, i) => {
    const q = posOf(i);
    if (q.st === 2) {
      // 개수대에 퐁당: 물보라 속에 발만 버둥 (실패는 웃음)
      items.push({
        y: q.y,
        f: () => {
          const x = GX(q.x, q.y), y = GY(q.y), U = Uy(q.y);
          ctx.fillStyle = '#ffffff';
          for (let n = 0; n < 4; n++) {
            const age = (t + n * 9) % 36;
            ctx.globalAlpha = 1 - age / 36;
            ctx.beginPath();
            ctx.arc(x + Math.sin(n * 2.3) * U * 0.5, y - age * U * 0.03, U * 0.1, 0, TAU);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
          ctx.strokeStyle = k === CAT ? '#f39a3c' : '#9aa3b0';
          ctx.lineWidth = U * 0.18;
          ctx.lineCap = 'round';
          for (const sd of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(x + sd * U * 0.15, y - U * 0.05);
            ctx.lineTo(x + sd * U * 0.3 + Math.sin(t * 0.6 + sd) * U * 0.15, y - U * 0.55);
            ctx.stroke();
          }
        },
      });
      return;
    }
    if (q.st === 1 && k !== POT && k !== CAT && k !== LADLE) return; // 수저통 안은 위에서 그렸다
    const x = GX(q.x, q.y), y = GY(q.y), U = Uy(q.y), lift = q.mv ? U * 0.12 : 0, mood = s.mood[i];
    const [lx, ly] = q.mv ? [Math.sign(q.dx) * 0.9, Math.sign(q.dy) * 0.9] : lookAt(q.x, q.y);
    const tilt = q.mv ? Math.sin(t * 0.6 + i) * 0.15 : 0;
    items.push({
      y: q.y + 0.01,
      f: () => {
        // 미끄러질 때 뒤로 바람 줄
        if (q.mv) {
          const len = Math.hypot(q.dx, q.dy) || 1, ux = q.dx / len, uy = q.dy / len;
          ctx.strokeStyle = 'rgba(255,255,255,.75)';
          ctx.lineWidth = 2;
          for (const sd of [-1, 0, 1]) {
            ctx.beginPath();
            ctx.moveTo(x - ux * U * 0.8 - uy * sd * U * 0.35, y - uy * U * 0.6 * SQ + ux * sd * U * 0.3);
            ctx.lineTo(x - ux * U * 1.6 - uy * sd * U * 0.35, y - uy * U * 1.2 * SQ + ux * sd * U * 0.3);
            ctx.stroke();
          }
        }
        const yy = y - lift;
        if (k === SPOON || k === FORK) drawCutlery(ctx, x, yy, U * 0.98, k === FORK, L.pols[i], mood, lx, ly, t, tilt);
        else if (k === POT) drawPot(ctx, x, yy - (q.st === 1 ? U * 0.1 : 0), U * 0.95, L.pols[i], q.st === 1 ? 3 : mood, lx, ly, t, q.st === 1);
        else if (k === LADLE) drawLadle(ctx, x, yy, U * 0.95, q.st === 1 ? 3 : mood, lx, ly, t, tilt);
        else if (k === BOARD) drawBoard(ctx, x, yy, U * 0.92, mood, t);
        else if (k === CAT) drawCat(ctx, x, yy, U * 1.0, L.pols[i], q.st === 1 ? 2 : q.mv ? 1 : 0, mood, lx, t);
      },
    });
  });
  items.sort((p, q) => p.y - q.y);
  for (const it of items) it.f();

  // ═════════════ 미리 보기 그리기: 점선 화살표 + 도착 자리 ═════════════
  if (pv) {
    const F = pv.rec.frames, n = F.length;
    let caught = 0;
    L.kinds.forEach((k, i) => {
      const pts: number[][] = [];
      for (let f = 0; f < n; f++) {
        const p = F[f][i];
        if (p >= 0) pts.push([p % C, (p / C) | 0]);
        else if (f > 0 && F[f - 1][i] >= 0) pts.push([pv!.to.hc[i] % C, (pv!.to.hc[i] / C) | 0]);
      }
      if (pts.length < 2 || (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1])) return;
      const end = pv!.to.p[i], col = k === BOARD ? '#ffe0b0' : k === LADLE ? '#e6d6ff' : POLE[L.pols[i]][0];
      ctx.strokeStyle = 'rgba(40,20,10,.55)';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach(([px, py], q) => (q ? ctx.lineTo(GX(px, py), GY(py)) : ctx.moveTo(GX(px, py), GY(py))));
      ctx.stroke();
      ctx.strokeStyle = col;
      ctx.lineWidth = 3;
      ctx.setLineDash([R(0.014), R(0.01)]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.stroke();
      ctx.setLineDash([]);
      const [ex, ey] = pts[pts.length - 1], [bx, by] = pts[pts.length - 2], an = Math.atan2(GY(ey) - GY(by), GX(ex, ey) - GX(bx, by));
      const hx = GX(ex, ey), hy = GY(ey);
      ctx.fillStyle = col;
      ctx.strokeStyle = 'rgba(40,20,10,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(hx + Math.cos(an) * R(0.026), hy + Math.sin(an) * R(0.026));
      ctx.lineTo(hx + Math.cos(an + 2.5) * R(0.022), hy + Math.sin(an + 2.5) * R(0.022));
      ctx.lineTo(hx + Math.cos(an - 2.5) * R(0.022), hy + Math.sin(an - 2.5) * R(0.022));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (end < 0) {
        const good = end === IN;
        if (good) caught++;
        ctx.fillStyle = good ? '#2fbf6a' : '#ff4d4d';
        ctx.beginPath();
        ctx.arc(hx, hy - R(0.045), R(0.024), 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        font(0.03, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(good ? '✓' : '✗', hx, hy - R(0.044));
      }
    });
    if (caught >= L.combo) {
      const m = L.mags[hold];
      ctx.fillStyle = '#ffd84a';
      ctx.strokeStyle = 'rgba(60,30,0,.7)';
      ctx.lineWidth = 3;
      font(0.045, 900);
      ctx.textAlign = 'center';
      ctx.strokeText(`${caught}개 한 번에! ★`, GX(m.x, m.y), GY(m.y) - R(0.08));
      ctx.fillText(`${caught}개 한 번에! ★`, GX(m.x, m.y), GY(m.y) - R(0.08));
    }
  }
  // 1판 첫 톡 전: 자석에 손가락 고리
  if (s.stage === 0 && !s.firstFlip && s.phase === 'play' && !s.down) {
    const m = L.mags[0], pulse = (t % 50) / 50;
    ctx.strokeStyle = `rgba(255,255,255,${1 - pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(GX(m.x, m.y), GY(m.y), U * (0.8 + pulse * 1.4), U * (0.5 + pulse * 0.9), 0, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.max(14, U * 0.9)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText('👆', GX(m.x, m.y) + U * 0.5, GY(m.y) + U * 1.1 + Math.sin(t * 0.15) * 3);
  }
  // 새것 스포트라이트: 처음 보는 판, 소개 카드 뒤 2초쯤
  drawSpot(ctx, s, w, GX, GY, R, font);

  // ═════════════ 사건 연출 ═════════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = GX(e.x, e.y), y = GY(e.y);
    if (e.kind === 'flip') {
      const big = (e.n ?? 0) >= 3;
      fx.memo.small = 0;
      fx.ring(x, y, '#ffffff', R(big ? 0.32 : 0.18), big ? 6 : 4);
      fx.burst(x, y, '#ffffff', big ? 22 : 12, big ? 4.5 : 3, 2.4);
      fx.kick(big ? 6 : 3);
      fx.memo.swing = 1;
      say(x, y - R(0.07), e.text!, '#ffffff', big ? 22 : 16);
      if (big) s.catT = t;
    }
    if (e.kind === 'stick') {
      fx.burst(x, y, '#cfd8e6', 8, 2, 1.8);
      // 작은 소리 글자는 한 번 뒤집을 때 둘까지만 (큰 순간의 글자가 묻히지 않게)
      if ((fx.memo.small ?? 0) < 2 || e.text !== '철컥!') (fx.memo.small = (fx.memo.small ?? 0) + 1), say(x, y - R(0.06), e.text!, '#e8f0ff', 13);
    }
    if (e.kind === 'bonk') fx.burst(x, y, '#fff0d0', 7, 2.2, 1.8), fx.kick(2), e.text !== '쿵!' && say(x, y - R(0.06), e.text!, '#ffe2b0', 14);
    if (e.kind === 'clang') fx.burst(x, y, '#ffffff', 14, 3.4, 2.2), fx.ring(x, y, '#fff6c0', R(0.07), 3), fx.kick(4), say(x, y - R(0.07), e.text!, '#fff6c0', 15), (s.catT = t);
    if (e.kind === 'knock') fx.burst(x, y, '#ffd84a', 10 + (e.n ?? 1) * 4, 3.2, 2.2), fx.ring(x, y, '#ffd84a', R(0.06 + (e.n ?? 1) * 0.02), 3), fx.kick(2 + (e.n ?? 1) * 1.5), say(x, y - R(0.07), e.text!, '#ffe066', 14 + Math.min(6, (e.n ?? 1) * 2));
    if (e.kind === 'dong') fx.ring(x, y, '#dfe4ea', R(0.09), 4), fx.kick(5), say(x, y - R(0.08), e.text!, '#e8eef6', 17), (s.catT = t);
    if (e.kind === 'meow') say(x, y - R(0.08), e.text!, '#ffd29a', 14);
    if (e.kind === 'shove') fx.burst(x, y, '#ffb066', 12, 3, 2.2), fx.kick(3), say(x, y - R(0.09), e.text!, '#ffd29a', 16);
    if (e.kind === 'home') fx.burst(x, y - R(0.02), '#ffe066', 18, 3.6, 2.4), fx.burst(x, y, '#ffffff', 10, 2.4, 2), fx.ring(x, y, '#ffe066', R(0.07), 3), say(x, y - R(0.08), e.text!, '#fff3a0', 16);
    if (e.kind === 'sink') fx.burst(x, y, '#9fe0ff', 30, 4.6, 2.8), fx.ring(x, y, '#3d9fd6', R(0.1), 5), fx.kick(8), say(x, y - R(0.08), e.text!, '#cfefff', 18);
    if (e.kind === 'combo') {
      const n = e.n ?? 2;
      fx.burst(w * 0.5, Y(0.7), '#ffd84a', 30 + n * 10, 6, 3.2);
      fx.burst(w * 0.3, Y(0.6), '#ff9a8a', 24, 5, 3);
      fx.burst(w * 0.7, Y(0.6), '#9ac4ff', 24, 5, 3);
      fx.ring(w / 2, Y(0.7), '#ffe066', R(0.45), 7);
      fx.blink('#fff6c8', 0.25);
      fx.kick(6 + n * 2);
      say(w / 2, Y(0.62), e.text!, '#ffd84a', 24 + n * 2);
    }
    if (e.kind === 'clear') fx.burst(w * 0.3, Y(0.62), '#ffe066', 40, 6, 3.2), fx.burst(w * 0.7, Y(0.62), '#ff9ec4', 40, 6, 3.2), fx.ring(w / 2, Y(0.7), '#ffe066', R(0.45), 7), fx.blink('#fff6c8', 0.22);
    if (e.kind === 'fail') fx.kick(8), fx.blink(th.hot, 0.18);
  }
  fx.memo.t = s.t;
  ctx.restore();
  drawHud(ctx, s, w, h, th, R, Y, font, fx);
}

type F = (v: number) => number;
/** 새것 스포트라이트: 처음 보는 판에서 소개 카드가 지난 뒤 2초쯤, 주변을 어둡게 하고 새것에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: PolarState, w: number, GX: (x: number, y: number) => number, GY: F, R: F, font: (sz: number, wgt?: number) => void) {
  if (!isNew(s) || s.phase !== 'play' || s.used > 0 || s.down) return;
  const age = s.t - s.startT, t0 = CARD_T - 25, t1 = CARD_T + 120;
  if (age < t0 || age > t1) return;
  const L = s.L, key = STAGES[s.stage].key;
  let x = -1, y = -1;
  const item = (k: number) => {
    const i = L.kinds.indexOf(k);
    if (i >= 0 && s.S.p[i] >= 0) (x = s.S.p[i] % L.C), (y = (s.S.p[i] / L.C) | 0);
  };
  if (key === 'fork') item(FORK);
  else if (key === 'pot') item(POT);
  else if (key === 'board') item(BOARD);
  else if (key === 'ladle') item(LADLE);
  else if (key === 'cat') item(CAT);
  else if (key === 'turn') {
    const j = L.mags.findIndex((m) => m.turn);
    if (j >= 0) (x = L.mags[j].x), (y = L.mags[j].y);
  } else if (key === 'sink') {
    const c = L.cell.indexOf(SINK);
    if (c >= 0) (x = c % L.C), (y = (c / L.C) | 0);
  }
  if (x < 0) return;
  const a = Math.min(1, (age - t0) / 10, (t1 - age) / 18), cx = GX(x, y), cy = GY(y), r = R(0.1) * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,10,20,.6)';
  ctx.beginPath();
  ctx.rect(0, R(0.075), w, R(1.135) - R(0.075));
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
  const label = STAGES[s.stage].tip;
  let fs = 0.036;
  font(fs, 900);
  while (ctx.measureText(label).width > w - R(0.1) && fs > 0.031) font((fs -= 0.001), 900);
  const tw = Math.min(w - R(0.04), ctx.measureText(label).width + R(0.05)), ly = y > 3.5 ? cy - r - R(0.06) : cy + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, cx));
  ctx.fillStyle = 'rgba(60,24,40,.96)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.032), tw, R(0.064), R(0.032));
  ctx.fill();
  ctx.strokeStyle = '#ffcf5a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1, w - R(0.08));
  font(0.03, 900);
  const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.058), nw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.037));
  ctx.restore();
}

function drawHud(ctx: CanvasRenderingContext2D, s: PolarState, w: number, h: number, th: Theme, R: F, Y: F, font: (sz: number, wgt?: number) => void, fx: ReturnType<typeof juice>) {
  const L = s.L, d = STAGES[s.stage];
  // ═════════════ 위 띠 ═════════════
  const hb = R(0.075);
  ctx.fillStyle = 'rgba(43,34,48,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.043, 900);
  const ttl = `${d.emoji} ${s.stage + 1}번째 부엌`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, R(0.03), hb * 0.52);
  font(0.034, 800);
  ctx.fillStyle = th.muted;
  ctx.fillText(` / ${STAGE_COUNT}`, R(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.04, 900);
  ctx.fillStyle = '#ffcf5a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 새것 알림 띠 (벽 위)
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.034, 900);
    ctx.textAlign = 'center';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = Y(0.29) + drop;
    ctx.fillStyle = 'rgba(43,34,48,.93)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.026), tw2, R(0.052), R(0.026));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2 + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 정리 끝 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result') {
      age = s.pt;
      if (s.ok) (head = s.won ? '부엌 대청소 끝! 🍳' : s.got === 3 ? '완벽! +100' : '부엌 정리 끝!'), (sub = `다 넣음 ✓ · 뒤집기 ${s.used}번${s.starOk[1] ? ' ✓' : ` (≤${L.par} ✗)`} · 한 번에 ${L.combo}개 ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffcf5a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 부엌 다시' : '끝 — 숟가락들이 고마워해요!'), (col = '#ffb3a8');
    } else if (s.pt < CARD_T && s.used === 0) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = `${s.again ? '다시! ' : ''}${s.stage + 1}번째 부엌 · ${d.name}`;
      sub = `쇠붙이 ${L.kinds.filter((k) => k !== BOARD).length}개 · 뒤집기 ${L.limit}번 · ★ ${L.par}번 이하`;
      nw = s.again ? '' : d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = Y(nw ? 0.17 : 0.19), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(43,34,48,.93)';
      ctx.beginPath();
      ctx.roundRect(-R(nw ? 0.46 : 0.4), -R(0.055), R(nw ? 0.92 : 0.8), R(ch), R(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.046, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = R(0.056), x0 = -(hw + R(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -R(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = s.pt - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + R(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -R(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, R(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - R(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -R(0.018), R(0.76));
      ctx.fillStyle = '#fff8ee';
      font(0.034, 800);
      ctx.fillText(sub, 0, R(0.03), R(0.76));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.034, 900);
        ctx.fillText(nw, 0, R(0.077), R(0.88));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠 ═════════════
  {
    const ty = 1.135, tb = h / w;
    const g = ctx.createLinearGradient(0, Y(ty), 0, Y(tb));
    g.addColorStop(0, 'rgba(52,38,52,.96)');
    g.addColorStop(1, 'rgba(32,24,34,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, Y(ty), w, Y(tb - ty) + 4, [R(0.03), R(0.03), 0, 0]);
    ctx.fill();
    // 뒤집기 남은 수: 작은 자석 (★선까지 쓰면 ★)
    const r1 = Y(ty + 0.042);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff0e0';
    font(0.036, 900);
    ctx.fillText('뒤집기', R(0.03), r1);
    const dx0 = R(0.19), dstep = Math.min(R(0.052), (R(0.74) - R(0.19)) / Math.max(1, L.limit));
    for (let k = 0; k < L.limit; k++) {
      const cx = dx0 + k * dstep + (k >= L.par ? R(0.016) : 0), used = k < s.used, inPar = k < L.par;
      ctx.beginPath();
      ctx.arc(cx, r1, R(0.017), 0, TAU);
      if (used) {
        ctx.strokeStyle = 'rgba(255,255,255,.3)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        const p = k % 2;
        ctx.fillStyle = inPar ? POLE[p][1] : POLE[p][2];
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath();
        ctx.arc(cx - R(0.005), r1 - R(0.006), R(0.006), 0, TAU);
        ctx.fill();
      }
    }
    const lx = dx0 + L.par * dstep - dstep / 2 + R(0.008);
    ctx.strokeStyle = '#ffcf5a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, r1 - R(0.024));
    ctx.lineTo(lx, r1 + R(0.022));
    ctx.stroke();
    ctx.fillStyle = '#ffcf5a';
    font(0.03, 900);
    ctx.textAlign = 'center';
    ctx.fillText('★', lx, r1 - R(0.034));
    ctx.textAlign = 'right';
    font(0.034, 800);
    const left = L.limit - s.used;
    ctx.fillStyle = left > 0 ? '#ffe9d6' : '#ffb3a8';
    ctx.fillText(`${left}번 남음`, w - R(0.03), r1);
    // 별 목표 셋
    const homeable = L.kinds.filter((k) => HOME_OF[k] >= 0).length, inN = (s.anim ? s.anim.to : s.S).p.filter((p, i) => p === IN && HOME_OF[L.kinds[i]] >= 0).length;
    const okk = s.phase === 'result' && s.ok ? s.starOk : [inN === homeable, s.used <= L.par, s.combo];
    const bad = [s.phase === 'result' && !s.ok, s.used > L.par, false];
    const labels = [`제자리 ${inN}/${homeable}`, `뒤집기 ≤${L.par}`, `한 번에 ${L.combo}개`];
    const r2 = Y(ty + 0.112), cw2 = R(0.3);
    for (let k = 0; k < 3; k++) {
      const cx1 = R(0.03) + k * (cw2 + R(0.017));
      ctx.fillStyle = okk[k] ? 'rgba(255,207,90,.25)' : bad[k] ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - R(0.026), cw2, R(0.052), R(0.026));
      ctx.fill();
      ctx.strokeStyle = okk[k] ? '#ffcf5a' : bad[k] ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = okk[k] ? '#ffcf5a' : bad[k] ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.038, 900);
      ctx.textAlign = 'center';
      ctx.fillText(bad[k] ? '✗' : '★', cx1 + R(0.03), r2 + R(0.002));
      ctx.fillStyle = okk[k] ? '#fff6dc' : bad[k] ? 'rgba(255,255,255,.4)' : '#ffeedd';
      font(0.034, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + R(0.056), r2 + R(0.002), cw2 - R(0.064));
    }
    // 안내 한 줄
    let hint = d.tip;
    const first = s.stage === 0 && !s.firstFlip && s.phase === 'play';
    if (first) hint = '👆 자석을 톡! 극이 뒤집히며 쇠붙이가 한꺼번에 미끄러져요';
    else if (s.down && s.phase === 'play') hint = s.hold >= 0 ? '떼면 뒤집기! 점선 = 쇠붙이가 갈 길 (자석 밖에서 떼면 취소)' : '자석 위에서 떼야 뒤집혀요';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 부엌 정리 끝! 반짝반짝' : `★ ${s.got}개! 다음 부엌엔 새것이 나와요`) : '꾹 누르면 쇠붙이가 갈 길이 보여요';
    else if (s.stage === 0) hint = '같은 색이면 밀리고, 다른 색이면 끌려와요 · 꾹 = 미리 보기';
    ctx.textAlign = 'center';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    let fs = first ? 0.04 : 0.035;
    font(fs, 900);
    while (ctx.measureText(hint).width > w - R(0.05) && fs > 0.031) font((fs -= 0.001), 900);
    ctx.fillText(hint, w / 2, Y(ty + 0.19), w - R(0.04));
  }
}
