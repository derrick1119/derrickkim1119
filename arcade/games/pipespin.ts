/**
 * 두더지 물길 관 돌리기 (27라운드: 전략이 깊은 검증된 캐주얼 뼈대 × 공장의 와우) — 관 돌려 잇기 × 가리키기(톡).
 * 뼈대: 요즘 잘 팔리는 '관 돌려 잇기' 퍼즐. 격자 칸마다 관 조각(일자·ㄱ자·T자·십자)이 묻혀 있고, 톡 하면 시계 방향으로 90° 돈다.
 *   우물에서 나온 물이 이어진 관을 따라 흐르고(실시간), 밭에 닿으면 새싹이 퐁. 모든 밭에 물이 닿는 순간 성공.
 * 조작(기준 9): 관을 톡 = 90° 돌기. 그게 전부. 누르고 있으면 '한 번 더 돌리면' 새로 물이 닿을 칸이 반짝(미리 보기). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적): 판마다 돌리기 한도(🔧)가 있고, 다 쓰도록 못 이으면 그 판 실패(하트 -1, 그 판을 처음부터).
 *   별 = ★ 성공 · ★ 돌리기 P번 안에 · ★ 물 안 샘(마지막 순간 물 든 관 끝이 모두 관·밭에 이어져 있음).
 * 와우(비틀기): 물은 이어지는 순간 콸콸 흐르니 '수문 관'(우물 바로 밑 관)을 마지막까지 아껴 두면, 그 한 번 톡에 밭이 한꺼번에
 *   차례로 퐁퐁퐁 — 큰 연쇄일수록 점수·연출이 커지고 두더지 농부가 밀짚모자를 하늘로 던진다.
 * 판 8개, 펼쳐짐(하는 일이 바뀐다): 1판 톡 돌리기·물 샘 → 2판 🪨 바위 관(못 돌림 — 거기서부터 거꾸로 맞춰 가기)
 *   → 3판 🐜 개미집(물이 닿으면 안 됨 — 길을 피해 돌기) → 4판 🌱 뿌리 잠긴 관(옆 밭에 물이 닿아야 풀림 — 잇는 순서)
 *   → 5판 ⚙️ 톱니 관(하나를 돌리면 짝도 같이 돎 — 둘을 한꺼번에 맞추기) → 6판 🍯 두 우물(맑은 물·꿀물, 섞이면 흙탕물)
 *   → 7판 🪣 물 한 동이(물이 관 N칸까지만 — 짧은 길 찾기) → 8판 🌕 대풍년(전부).
 * 웃음: 두더지 농부가 물이 콸콸 흐르면 눈이 동그래지고, 물이 새면 구경하던 지렁이가 물벼락 '으악 차가!',
 *   개미집에 물이 들면 개미들이 알을 이고 줄행랑, 한도가 바닥나면 식은땀, 실패하면 진흙에 꽈당 어질어질. 울타리의 병아리는 새싹마다 삐약.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.45;
export const DIRT = 0, PIPE = 1, ROCK = 2, FIELD = 3, SRC = 4, NEST = 5;
/** 방향 0~3 = 위·오른쪽·아래·왼쪽, 관의 입구는 비트(1<<방향) */
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export const rotm = (m: number, k: number) => {
  k &= 3;
  return ((m << k) | (m >> (4 - k))) & 15;
};
const opp = (d: number) => (d + 2) & 3;
const popc = (m: number) => (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1) + ((m >> 3) & 1);
const I_ = 5, L_ = 3, T_ = 7, X_ = 15;
const STAR_PTS = 100, WIN_PTS = 100, LEFT_PTS = 15, FIELD_PTS = 15;
/** 한 번 톡에 밭 n곳이 처음 물을 받으면 밭마다 이만큼 (연쇄일수록 크게) */
export const chainPts = (n: number) => (FIELD_PTS * n * (n + 1)) / 2;
const RESULT_OK = 170, RESULT_FAIL = 150, NEWS_T = 200;

// ───────────────────────────── 판 ─────────────────────────────
export interface StageDef {
  key: string; name: string; emoji: string; news: string; tip: string;
  /** 격자 · 색별 밭 수 · 빈 흙 비율(관 없는 칸) · 바위 덩이 · 개미집 · 바위 관(못 돌림) · 뿌리 잠금 · 톱니 짝 · 물 한 동이(관 칸 여유, -1 없음) */
  w: number; h: number; f: number[]; dirt: number; rocks: number; nests: number; fixed: number; locks: number; gears: number; cap: number;
  /** 미끼 관 모양 비율: T자 · 십자 */
  tr: number; xr: number;
  /** ★ 돌리기 기준 = 최소 + slack · 실패 한도 = 최소 × failK + failA */
  slack: number; failK: number; failA: number;
}
export const STAGES: StageDef[] = [
  { key: 'basic', name: '첫 물길', emoji: '🌱', news: '🔧 관을 톡 → 빙글! 물길이 이어지면 콸콸', tip: '반짝이는 관을 톡 — 우물에서 밭까지 물길을 이어요', w: 4, h: 5, f: [3], dirt: 0, rocks: 0, nests: 0, fixed: 0, locks: 0, gears: 0, cap: -1, tr: 0, xr: 0, slack: 1, failK: 3, failA: 20 },
  { key: 'rock', name: '바위 관', emoji: '🪨', news: '🪨 바위에 박힌 관은 못 돌려요 — 거기에 맞춰 이어요', tip: '🪨 바위 관부터 보고, 거기에 맞춰 이웃 관을 돌려요', w: 4, h: 5, f: [2], dirt: 0.4, rocks: 1, nests: 0, fixed: 2, locks: 0, gears: 0, cap: -1, tr: 0.15, xr: 0.04, slack: 1, failK: 3, failA: 16 },
  { key: 'nest', name: '개미집', emoji: '🐜', news: '🐜 개미집에 물이 들면 안 돼요 — 비켜서 이어요', tip: '🐜 개미집 쪽으로 관 끝이 향하면 물이 들어가요', w: 5, h: 5, f: [3], dirt: 0.25, rocks: 1, nests: 2, fixed: 1, locks: 0, gears: 0, cap: -1, tr: 0.3, xr: 0.05, slack: 1, failK: 1.6, failA: 5 },
  { key: 'lock', name: '뿌리 잠금', emoji: '🌿', news: '🌿 뿌리 감긴 관 — 바로 옆 밭에 물을 주면 풀려요', tip: '🌿 옆 밭부터 물을 줘야 뿌리 관이 풀려요', w: 5, h: 6, f: [3], dirt: 0.25, rocks: 1, nests: 0, fixed: 1, locks: 2, gears: 0, cap: -1, tr: 0.3, xr: 0.05, slack: 1, failK: 1.6, failA: 5 },
  { key: 'gear', name: '톱니 관', emoji: '⚙️', news: '⚙️ 톱니 관 — 하나를 돌리면 맞물린 짝도 같이 돌아요', tip: '⚙️ 톱니 짝은 같이 돌아요 — 둘 다 맞는 때를 찾아요', w: 5, h: 6, f: [3], dirt: 0.22, rocks: 1, nests: 0, fixed: 0, locks: 0, gears: 3, cap: -1, tr: 0.3, xr: 0.05, slack: 1, failK: 1.6, failA: 5 },
  { key: 'twin', name: '두 우물', emoji: '🍯', news: '🍯 꿀물 우물 — 깃발 색 물만 받아요, 섞이면 흙탕물!', tip: '💧 파란 깃발엔 맑은 물, 🍯 노란 깃발엔 꿀물', w: 6, h: 6, f: [2, 2], dirt: 0.22, rocks: 1, nests: 0, fixed: 1, locks: 0, gears: 0, cap: -1, tr: 0.2, xr: 0.04, slack: 1, failK: 1.6, failA: 5 },
  { key: 'cap', name: '물 한 동이', emoji: '🪣', news: '🪣 물이 관 몇 칸까지만 가요 — 짧은 길로!', tip: '🪣 물통 숫자만큼만 관을 채워요 — 돌아가는 길은 물이 모자라요', w: 5, h: 6, f: [3], dirt: 0.18, rocks: 1, nests: 1, fixed: 0, locks: 0, gears: 1, cap: 0, tr: 0.22, xr: 0.05, slack: 1, failK: 1.6, failA: 5 },
  { key: 'moon', name: '대풍년', emoji: '🌕', news: '🌕 보름달 대풍년 — 다 나와요!', tip: '🐜 🌿 ⚙️ — 어디부터 맞출지 먼저 봐요', w: 6, h: 6, f: [4], dirt: 0.18, rocks: 1, nests: 1, fixed: 1, locks: 1, gears: 2, cap: -1, tr: 0.2, xr: 0.04, slack: 1, failK: 1.6, failA: 6 },
];
export const STAGE_COUNT = STAGES.length;

export interface Level {
  w: number; h: number; n: number;
  kind: number[]; base: number[]; rot0: number[]; fixed: number[]; lock: number[]; gear: number[]; col: number[];
  /** 이웃 칸 (i*4+방향, 판 밖 -1) */
  nbr: number[];
  /** 물 한 동이: 관 칸 수 한도 (0 = 없음) */
  cap: number;
  fields: number[]; srcs: number[]; colors: number;
  /** 최소 풀이의 마지막 모습 · 톡 순서 */
  sol: number[]; par: number; P: number; limit: number; plan: number[];
  habit: { ok: boolean; stars: number; rots: number };
  medium: { ok: boolean; stars: number; rots: number };
}
export interface Sim { rot: number[]; unl: number[]; ever: number[]; rots: number; clear: boolean; fail: number; leaks: number }
export interface Flow {
  /** 칸마다 닿은 물 색 비트(1 맑은 물, 2 꿀물) · 우물에서 몇 칸째 */
  wet: number[]; dist: number[];
  /** 새는 곳 (i*4+방향) · 물이 모자라 멈춘 곳 · 물 든 개미집 */
  leak: number[]; dry: number[]; flood: number[];
  mixed: boolean; sat: boolean[]; nsat: number; ok: boolean;
}
export type RE = { k: 'sprout'; i: number } | { k: 'unlock'; i: number };

export const maskOf = (L: Level, rot: number[], i: number) => (L.kind[i] === PIPE ? rotm(L.base[i], rot[i]) : L.kind[i] === SRC ? L.base[i] : 0);

/** 지금 관 모양으로 물이 어디까지 가나 (새는 관도 그대로 흐른다) */
export function flow(L: Level, rot: number[]): Flow {
  const n = L.n, wet = new Array(n).fill(0), dist = new Array(n).fill(-1);
  const leak = new Set<number>(), dry: number[] = [], flood = new Set<number>();
  for (const s of L.srcs) {
    const bit = 1 << L.col[s], seen = new Uint8Array(n), q = [s];
    seen[s] = 1;
    wet[s] |= bit;
    if (dist[s] < 0) dist[s] = 0;
    let cnt = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], m = maskOf(L, rot, i);
      for (let d = 0; d < 4; d++) {
        if (!((m >> d) & 1)) continue;
        const j = L.nbr[i * 4 + d];
        if (j < 0) {
          leak.add(i * 4 + d);
          continue;
        }
        const kj = L.kind[j];
        if (kj === FIELD) {
          wet[j] |= bit;
          if (dist[j] < 0 || dist[j] > dist[i] + 1) dist[j] = dist[i] + 1;
        } else if (kj === NEST) flood.add(j);
        else if (kj === PIPE || kj === SRC) {
          if (!((maskOf(L, rot, j) >> opp(d)) & 1)) {
            // 우물 입구 앞 관이 안 받으면 '수문이 닫힌 것' — 새는 게 아니다
            if (L.kind[i] !== SRC) leak.add(i * 4 + d);
            continue;
          }
          if (seen[j]) continue;
          if (kj === PIPE && L.cap && cnt >= L.cap) {
            dry.push(i * 4 + d);
            continue;
          }
          seen[j] = 1;
          wet[j] |= bit;
          if (kj === PIPE) cnt++;
          if (dist[j] < 0) dist[j] = dist[i] + 1;
          q.push(j);
        } else leak.add(i * 4 + d);
      }
    }
  }
  const sat = L.fields.map((f) => wet[f] === 1 << L.col[f]);
  const nsat = sat.filter(Boolean).length, mixed = wet.some((x) => x === 3);
  return { wet, dist, leak: [...leak], dry, flood: [...flood], mixed, sat, nsat, ok: nsat === L.fields.length && !flood.size && !mixed };
}

export function newSim(L: Level): Sim {
  const S: Sim = { rot: L.rot0.slice(), unl: L.lock.map(() => 0), ever: L.kind.map(() => 0), rots: 0, clear: false, fail: 0, leaks: 0 };
  settle(L, S);
  return S;
}
export const cloneSim = (S: Sim): Sim => ({ ...S, rot: S.rot.slice(), unl: S.unl.slice(), ever: S.ever.slice() });
/** 돌릴 수 있는 관인가 (십자 관은 돌려도 같아서 안 센다) */
export const canTurn = (L: Level, S: Sim, i: number) => L.kind[i] === PIPE && !L.fixed[i] && (!L.lock[i] || S.unl[i] === 1) && L.base[i] !== X_;

function settle(L: Level, S: Sim, rec?: RE[]): Flow {
  const F = flow(L, S.rot);
  L.fields.forEach((f, k) => {
    if (F.sat[k] && !S.ever[f]) (S.ever[f] = 1), rec?.push({ k: 'sprout', i: f });
  });
  for (let i = 0; i < L.n; i++) {
    if (!L.lock[i] || S.unl[i]) continue;
    for (let d = 0; d < 4; d++) {
      const j = L.nbr[i * 4 + d];
      if (j >= 0 && L.kind[j] === FIELD && S.ever[j]) {
        S.unl[i] = 1;
        rec?.push({ k: 'unlock', i });
        break;
      }
    }
  }
  S.leaks = F.leak.length;
  S.clear = F.ok;
  return F;
}

/** 관 하나를 90° (부를 쪽이 canTurn 확인). 톱니 짝도 같이 돈다 */
export function turn(L: Level, S: Sim, i: number, rec?: RE[]): Flow {
  S.rot[i] = (S.rot[i] + 1) & 3;
  const g = L.gear[i];
  if (g >= 0) S.rot[g] = (S.rot[g] + 1) & 3;
  S.rots++;
  const F = settle(L, S, rec);
  if (!S.clear && S.rots >= L.limit) S.fail = 1;
  return F;
}

export const starsOf = (L: Level, S: Sim) => (S.clear ? 1 + (S.rots <= L.P ? 1 : 0) + (S.leaks === 0 ? 1 : 0) : 0);

// ───────────────────────────── 풀이 ─────────────────────────────
/**
 * 물 안 새는 물길 중 돌리기가 가장 적은 것 (가지치기 깊이 우선 탐색).
 * 물 든 관의 입구는 모두 관·밭과 맞물려야 한다 → 우물에서 뻗은 닫힌 물길을 칸마다 정해 간다(갈래가 가장 적은 칸부터).
 * 개미집·흙·판 밖으로 향하면 안 되고, 다른 색 물과 닿으면 안 되고, 물 한 동이 판은 관 칸 수가 한도 안.
 * 뿌리 잠긴 관을 돌려야 하는 풀이는 '옆 밭부터 물이 닿는' 순서가 있어야 한다.
 */
export function solve(L: Level, rotI: number[], unl: number[], ever: number[], budget: number, best0: number): { cost: number; rot: number[]; taps: number[] } | null {
  const n = L.n, nb = L.nbr, kind = L.kind, base = L.base;
  const asg = new Int8Array(n).fill(-1), ccol = new Int8Array(n).fill(-1), force = new Int8Array(n).fill(-1);
  const inCnt = new Int8Array(n), inCol = new Int8Array(n).fill(-1), hit = new Int8Array(n), tapK = new Int8Array(n);
  const pc = [0, 0], front: number[] = [];
  let cost = 0, best = best0, nodes = 0, bestRot: number[] | null = null, bestTaps: number[] | null = null;
  for (let i = 0; i < n; i++) if (kind[i] === PIPE && (L.fixed[i] || base[i] === X_)) force[i] = rotI[i];
  const mk = (i: number) => (kind[i] === SRC ? base[i] : rotm(base[i], asg[i]));
  const push = (t: number, c: number) => {
    const m = mk(t);
    for (let d = 0; d < 4; d++) {
      if (!((m >> d) & 1)) continue;
      const j = nb[t * 4 + d];
      if (j < 0) continue;
      if (kind[j] === FIELD) hit[j]++;
      else if (kind[j] === PIPE && asg[j] < 0) {
        if (++inCnt[j] === 1) (inCol[j] = c), front.push(j);
      }
    }
  };
  const pop = (t: number) => {
    const m = mk(t);
    for (let d = 3; d >= 0; d--) {
      if (!((m >> d) & 1)) continue;
      const j = nb[t * 4 + d];
      if (j < 0) continue;
      if (kind[j] === FIELD) hit[j]--;
      else if (kind[j] === PIPE && asg[j] < 0) {
        if (--inCnt[j] === 0) (inCol[j] = -1), front.pop();
      }
    }
  };
  /** t를 색 c로 이 모양(m)으로 정해도 되나 (gp = 톡 하나에 같이 도는 짝의 새 모양, 없으면 -1) */
  const okMask = (t: number, m: number, c: number, g: number, gm: number) => {
    for (let d = 0; d < 4; d++) {
      const j = nb[t * 4 + d], has = (m >> d) & 1;
      if (j < 0) {
        if (has) return false;
        continue;
      }
      if (asg[j] >= 0) {
        const pin = (mk(j) >> opp(d)) & 1;
        if (has !== pin) return false;
        if (has && ccol[j] !== c) return false;
        continue;
      }
      if (!has) continue;
      const kj = kind[j];
      if (kj === FIELD) {
        if (L.col[j] !== c) return false;
        continue;
      }
      if (kj !== PIPE) return false;
      if (inCnt[j] > 0 && inCol[j] !== c) return false;
      const fr = j === g ? gm : force[j] >= 0 ? rotm(base[j], force[j]) : -1;
      if (fr >= 0 && !((fr >> opp(d)) & 1)) return false;
    }
    return true;
  };
  // 갈래 목록: [회전, 돌리기 수, 짝 회전]
  const opts = (t: number, c: number, out: number[]) => {
    out.length = 0;
    const g = L.gear[t];
    if (force[t] >= 0) {
      if (okMask(t, rotm(base[t], force[t]), c, -1, -1)) out.push(force[t], 0, -1);
      return;
    }
    let seenM = 0;
    for (let k = 0; k < 4; k++) {
      const r = (rotI[t] + k) & 3, m = rotm(base[t], r);
      if (g >= 0) {
        const rg = (rotI[g] + k) & 3, gm = rotm(base[g], rg);
        if (k >= 2 && rotm(base[t], (rotI[t] + k - 2) & 3) === m && rotm(base[g], (rotI[g] + k - 2) & 3) === gm) continue;
        if (okMask(t, m, c, g, gm)) out.push(r, k, rg);
      } else {
        if ((seenM >> m) & 1) continue;
        seenM |= 1 << m;
        if (okMask(t, m, c, -1, -1)) out.push(r, k, -1);
      }
    }
  };
  // 뿌리 잠긴 관을 돌려야 하면: 나머지를 먼저 다 돌려 놓고, 옆 밭에 물이 닿는 대로 풀어 가며 끝까지 갈 수 있나
  const lockOK = () => {
    const pend: number[] = [];
    for (let i = 0; i < n; i++) if (L.lock[i] && !unl[i] && tapK[i] > 0) pend.push(i);
    if (!pend.length) return true;
    const cur = rotI.slice(), ev = ever.slice(), un = unl.slice();
    const fin = (i: number) => {
      cur[i] = asg[i];
      const g = L.gear[i];
      if (g >= 0 && force[g] >= 0) cur[g] = force[g];
    };
    for (let i = 0; i < n; i++) if (tapK[i] > 0 && !pend.includes(i)) fin(i);
    for (let guard = 0; guard < 8; guard++) {
      const F = flow(L, cur);
      L.fields.forEach((f, k) => F.sat[k] && (ev[f] = 1));
      let moved = false;
      for (const i of pend) {
        if (un[i]) continue;
        for (let d = 0; d < 4; d++) {
          const j = nb[i * 4 + d];
          if (j >= 0 && kind[j] === FIELD && ev[j]) {
            un[i] = 1;
            fin(i);
            moved = true;
            break;
          }
        }
      }
      if (!moved) break;
    }
    return pend.every((i) => un[i]);
  };
  const leaf = () => {
    for (const f of L.fields) if (!hit[f]) return;
    if (!lockOK()) return;
    best = cost;
    bestRot = rotI.map((r, i) => (asg[i] >= 0 && kind[i] === PIPE ? asg[i] : force[i] >= 0 ? force[i] : r));
    bestTaps = Array.from(tapK);
  };
  const bufs: number[][] = [];
  const dfs = (depth: number) => {
    if (++nodes > budget) return;
    const buf = (bufs[depth] ??= []);
    let bt = -1, bc = 99, lb = 0;
    const tmp = (bufs[depth + 400] ??= []);
    for (let q = 0; q < front.length; q++) {
      const t = front[q];
      if (asg[t] >= 0 || inCnt[t] === 0) continue;
      opts(t, inCol[t], tmp);
      const cnt = tmp.length / 3;
      if (!cnt) return;
      let mn = 9;
      for (let k = 0; k < tmp.length; k += 3) mn = Math.min(mn, tmp[k + 1]);
      if (L.gear[t] < 0) lb += mn;
      if (cnt < bc) {
        bc = cnt;
        bt = t;
        buf.length = 0;
        for (const x of tmp) buf.push(x);
        if (cnt === 1 && cost + lb >= best) return;
      }
    }
    if (bt < 0) return leaf();
    if (cost + lb >= best) return;
    // 싼 갈래부터
    const order = [...Array(bc).keys()].sort((a, b) => buf[a * 3 + 1] - buf[b * 3 + 1]);
    const choice = order.map((k) => [buf[k * 3], buf[k * 3 + 1], buf[k * 3 + 2]]);
    const c = inCol[bt], g = L.gear[bt];
    for (const [r, k, rg] of choice) {
      if (cost + k >= best) continue;
      asg[bt] = r;
      ccol[bt] = c;
      pc[c]++;
      cost += k;
      tapK[bt] = k;
      const prevF = g >= 0 ? force[g] : -1;
      if (g >= 0 && rg >= 0) force[g] = rg;
      if (!(L.cap && pc[c] > L.cap)) {
        push(bt, c);
        dfs(depth + 1);
        pop(bt);
      }
      if (g >= 0) force[g] = prevF;
      tapK[bt] = 0;
      cost -= k;
      pc[c]--;
      ccol[bt] = -1;
      asg[bt] = -1;
      if (nodes > budget) return;
    }
  };
  for (const s of L.srcs) (asg[s] = 0), (ccol[s] = L.col[s]);
  for (const s of L.srcs) {
    // 우물 입구가 판 밖·흙으로 향하면 풀이 없음
    const m = base[s];
    for (let d = 0; d < 4; d++) if ((m >> d) & 1 && (nb[s * 4 + d] < 0 || ![PIPE, FIELD].includes(kind[nb[s * 4 + d]]))) return null;
    push(s, L.col[s]);
  }
  // 우물끼리 바로 붙은 경우 등은 생성에서 피한다
  dfs(0);
  if (!bestRot || !bestTaps) return null;
  return { cost: best, rot: bestRot, taps: bestTaps };
}

/** 톡 순서 하나를 해 보고: 끝까지 가서 물이 안 새면 연쇄 점수, 아니면 -1 (끝나기 전에 다 이어져 버려도 -1) */
function tryOrder(L: Level, S0: Sim, seq: number[]): number {
  const S = cloneSim(S0);
  let pts = 0;
  for (let q = 0; q < seq.length; q++) {
    if (S.clear || !canTurn(L, S, seq[q])) return -1;
    const rec: RE[] = [];
    turn(L, S, seq[q], rec);
    const n = rec.filter((e) => e.k === 'sprout').length;
    pts += n * n;
  }
  return S.clear && S.leaks === 0 ? pts : -1;
}
/**
 * 톡 순서: 우물에서 먼 관부터 (수문 관을 마지막에 → 한 번에 콸콸), 뿌리 잠긴 관은 풀린 뒤에.
 * 여러 번 돌릴 관 하나는 '한 번만 남기고 먼저 돌려 두기'도 해 보고, 마지막 연쇄가 가장 큰 순서를 고른다.
 */
function orderTaps(L: Level, S0: Sim, rotF: number[], taps: number[], shallowFirst: boolean): number[] | null {
  const F = flow(L, rotF), cells: number[] = [];
  for (let i = 0; i < L.n; i++) if (taps[i] > 0) cells.push(i);
  const depth = (i: number) => (F.dist[i] < 0 ? 99 : F.dist[i]);
  cells.sort((a, b) => (shallowFirst ? depth(a) - depth(b) : depth(b) - depth(a)) || a - b);
  /** 뿌리 잠긴 관은 풀릴 때까지 미룬다 */
  const greedy = (pre: number[], cs: number[], post: number[]): number[] | null => {
    const S = cloneSim(S0), out: number[] = [];
    for (const i of pre) {
      if (!canTurn(L, S, i)) return null;
      turn(L, S, i);
      out.push(i);
    }
    const left = cs.slice();
    while (left.length) {
      const k = left.findIndex((i) => canTurn(L, S, i));
      if (k < 0) return null;
      const i = left.splice(k, 1)[0];
      for (let q = 0; q < taps[i] - (post.includes(i) ? pre.filter((x) => x === i).length + 1 : 0); q++) {
        if (S.clear) return null;
        turn(L, S, i);
        out.push(i);
      }
    }
    return out.concat(post);
  };
  let best: number[] | null = null, bv = -1;
  const consider = (seq: number[] | null) => {
    if (!seq) return;
    const v = tryOrder(L, S0, seq);
    if (v > bv) (bv = v), (best = seq);
  };
  consider(greedy([], cells, []));
  if (!shallowFirst)
    for (const g of cells) {
      const rest = cells.filter((x) => x !== g);
      consider(greedy(Array(taps[g] - 1).fill(g), rest.concat([g]), [g]));
      if (taps[g] > 1) consider(greedy([], rest.concat([g]), [g]));
    }
  return best;
}

/** 지금 상태에서 최선의 톡 순서 (못 찾으면 null) */
export function planFrom(L: Level, S: Sim, budget = 40000, best0 = 99, shallow = false): number[] | null {
  const sol = solve(L, S.rot, S.unl, S.ever, budget, best0);
  if (!sol) return null;
  const big = { ...L, limit: 999 };
  return orderTaps(big, S, sol.rot, sol.taps, shallow) ?? orderTaps(big, S, sol.rot, sol.taps, !shallow);
}

// ───────────────────────────── 버릇 · 무작위 ─────────────────────────────
/** 버릇 하나(측정용): '물이 닿은 관 끝 바로 다음 관을, 물을 받을 때까지 돌린다' — 위·왼쪽부터 훑어서 첫 번째 */
export function habitPick(L: Level, S: Sim): number {
  const F = flow(L, S.rot);
  for (let i = 0; i < L.n; i++) {
    if (!F.wet[i] || (L.kind[i] !== PIPE && L.kind[i] !== SRC)) continue;
    const m = maskOf(L, S.rot, i);
    for (let d = 0; d < 4; d++) {
      if (!((m >> d) & 1)) continue;
      const j = L.nbr[i * 4 + d];
      if (j >= 0 && canTurn(L, S, j) && !F.wet[j] && !((maskOf(L, S.rot, j) >> opp(d)) & 1)) return j;
    }
  }
  // 더 뻗을 곳이 없으면: 새는 관을 돌린다
  for (const q of F.leak) if (canTurn(L, S, q >> 2)) return q >> 2;
  for (let i = 0; i < L.n; i++) if (canTurn(L, S, i)) return i;
  return -1;
}
function habitRun(L: Level) {
  const S = newSim(L);
  while (!S.clear && !S.fail) {
    const i = habitPick(L, S);
    if (i < 0) break;
    turn(L, S, i);
  }
  return { ok: S.clear, stars: starsOf(L, S), rots: S.rots };
}
/**
 * 중간 실력(판 고르기용): 우물에서 아직 물 안 닿은 밭 하나까지 가장 싼 길(앞서 이은 길은 지키며)을 찾아 그 관들만 돌린다.
 * 새는 건 신경 쓰지 않는다 — 이 사람이 ★3을 따면 '밭마다 가까운 길'만으로 되는 판이라 고민이 얕다.
 */
function greedyPath(L: Level, S: Sim, req: number[]): number[] {
  const F = flow(L, S.rot);
  const want = new Set(L.fields.filter((_f, k) => !F.sat[k]));
  const kOf = (j: number, need: number): number => {
    if (L.kind[j] !== PIPE) return -1;
    const turnable = canTurn(L, S, j);
    for (let k = 0; k < (turnable ? 4 : 1); k++) {
      const m = rotm(L.base[j], S.rot[j] + k);
      if ((m & need) !== need) continue;
      let bad = false;
      for (let d = 0; d < 4; d++) if ((m >> d) & 1 && L.nbr[j * 4 + d] >= 0 && L.kind[L.nbr[j * 4 + d]] === NEST) bad = true;
      if (!bad) return k;
    }
    return -1;
  };
  const N = L.n * 4, dist = new Float64Array(N).fill(1e9), prev = new Int32Array(N).fill(-1), pc = new Int8Array(N), done = new Uint8Array(N);
  for (const s0 of L.srcs) {
    const m = L.base[s0];
    for (let d = 0; d < 4; d++) {
      if (!((m >> d) & 1)) continue;
      const j = L.nbr[s0 * 4 + d];
      if (j < 0) continue;
      if (L.kind[j] === FIELD && want.has(j) && L.col[j] === L.col[s0]) return [];
      if (L.kind[j] === PIPE) (dist[j * 4 + opp(d)] = 0), (pc[j * 4 + opp(d)] = L.col[s0]);
    }
  }
  let goal = -1, gd = 0;
  for (;;) {
    let u = -1, bd = 1e9;
    for (let q = 0; q < N; q++) if (!done[q] && dist[q] < bd) (bd = dist[q]), (u = q);
    if (u < 0) break;
    done[u] = 1;
    const j = u >> 2, din = u & 3;
    let found = false;
    for (let d = 0; d < 4 && !found; d++) {
      if (d === din) continue;
      const v = L.nbr[j * 4 + d];
      if (v < 0) continue;
      const k = kOf(j, req[j] | (1 << din) | (1 << d));
      if (k < 0) continue;
      if (L.kind[v] === FIELD && want.has(v) && L.col[v] === pc[u]) (goal = u), (gd = d), (found = true);
      else if (L.kind[v] === PIPE) {
        const nq = v * 4 + opp(d), nd = bd + k + 0.01;
        if (nd < dist[nq]) (dist[nq] = nd), (prev[nq] = u * 4 + d), (pc[nq] = pc[u]);
      }
    }
    if (found) break;
  }
  if (goal < 0) return [];
  const out: number[] = [];
  let u = goal, dout = gd;
  for (;;) {
    const j = u >> 2, din = u & 3, need = req[j] | (1 << din) | (1 << dout), k = kOf(j, need);
    req[j] = need;
    for (let q = 0; q < k; q++) out.push(j);
    const p = prev[u];
    if (p < 0) break;
    u = p >> 2;
    dout = p & 3;
  }
  return out.reverse();
}
export function mediumRun(L: Level) {
  const S = newSim(L), req = Array(L.n).fill(0);
  for (let guard = 0; !S.clear && !S.fail && guard < 50; guard++) {
    let p = greedyPath(L, S, req);
    if (!p.length) {
      const i = habitPick(L, S);
      if (i < 0) break;
      p = [i];
    }
    for (const i of p) {
      if (S.clear || S.fail) break;
      if (canTurn(L, S, i)) turn(L, S, i);
    }
  }
  return { ok: S.clear, stars: starsOf(L, S), rots: S.rots };
}
/** 아무 관이나 톡 하는 사람이 이 판을 깰 확률 */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    for (let guard = 0; !S.clear && !S.fail && guard < 4000; guard++) {
      const i = Math.floor(r() * L.n);
      if (r() < 0.15 || !canTurn(L, S, i)) continue;
      turn(L, S, i);
    }
    if (S.clear) ok++;
  }
  return ok / n;
}

// ───────────────────────────── 판 만들기 ─────────────────────────────
function shapeOf(mask: number): [number, number] {
  const p = popc(mask);
  const b = p === 4 ? X_ : p === 3 ? T_ : mask === 5 || mask === 10 ? I_ : L_;
  for (let k = 0; k < 4; k++) if (rotm(b, k) === mask) return [b, k];
  return [b, 0];
}
function nbrOf(w: number, h: number) {
  const out: number[] = [];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let d = 0; d < 4; d++) {
        const X = x + DX[d], Y = y + DY[d];
        out.push(X < 0 || Y < 0 || X >= w || Y >= h ? -1 : Y * w + X);
      }
  return out;
}
function finishLevel(L: Level, d: StageDef, designed: number): boolean {
  const S0 = newSim(L);
  if (S0.clear) return false;
  const sol = solve(L, L.rot0, S0.unl, S0.ever, 60000, designed + 1);
  if (!sol) return false;
  L.par = sol.cost;
  L.sol = sol.rot;
  const big = { ...L, limit: 999 };
  const plan = orderTaps(big, S0, sol.rot, sol.taps, d.key === 'basic') ?? orderTaps(big, S0, sol.rot, sol.taps, d.key !== 'basic');
  if (!plan) return false;
  L.plan = plan;
  L.P = L.par + d.slack + Math.floor(L.par / 8);
  L.limit = Math.ceil(L.par * d.failK) + d.failA;
  return true;
}

/** 1판: 첫 톡에 물이 콸콸 — 밭 둘이 한꺼번에 퐁, 남은 한 곳은 새는 관을 고쳐서 (손으로 만든 판, 좌우만 뒤집는다) */
function firstLevel(d: StageDef, r: Rng): Level {
  const w = 4, h = 5, n = w * h, flip = r() < 0.5;
  const kind = Array(n).fill(DIRT), base = Array(n).fill(0), rot0 = Array(n).fill(0);
  const mir = (m: number) => (flip ? (m & 5) | ((m & 2) << 2) | ((m & 8) >> 2) : m);
  /** 정답 입구(m)와 몇 번 톡 해야 맞는지(k)로 놓는다 — 좌우를 뒤집어도 톡 수는 같다 */
  const put = (x: number, y: number, k: number, m = 0, taps = 0) => {
    const i = y * w + (flip ? w - 1 - x : x);
    kind[i] = k;
    if (k === SRC) base[i] = 4;
    if (k === PIPE) {
      const [b, ro] = shapeOf(mir(m));
      base[i] = b;
      rot0[i] = (ro - taps) & 3;
    }
  };
  put(1, 0, SRC);
  put(1, 1, PIPE, 5, 1); // 수문 관: 한 번 톡 → 세로
  put(1, 2, PIPE, 15); // 십자: 사방으로
  put(0, 2, FIELD);
  put(1, 3, FIELD);
  put(2, 2, PIPE, 10, 1); // 일자: 한 번 더 → 가로 (처음엔 물이 샌다)
  put(3, 2, FIELD);
  put(3, 0, PIPE, 6, 2);
  put(0, 4, PIPE, 10, 1);
  put(3, 4, PIPE, 9, 3);
  put(2, 4, PIPE, 5, 1);
  put(0, 0, ROCK);
  put(3, 3, ROCK);
  const L: Level = {
    w, h, n, kind, base, rot0, fixed: Array(n).fill(0), lock: Array(n).fill(0), gear: Array(n).fill(-1), col: Array(n).fill(0), nbr: nbrOf(w, h), cap: 0,
    fields: [...Array(n).keys()].filter((i) => kind[i] === FIELD), srcs: [...Array(n).keys()].filter((i) => kind[i] === SRC), colors: 1,
    sol: [], par: 0, P: 0, limit: 99, plan: [], habit: { ok: false, stars: 0, rots: 0 }, medium: { ok: false, stars: 0, rots: 0 },
  };
  finishLevel(L, d, 9);
  return L;
}

function makeLevel(d: StageDef, r: Rng): Level | null {
  const w = d.w, h = d.h, n = w * h, nbr = nbrOf(w, h);
  const kind = Array(n).fill(PIPE), base = Array(n).fill(0), rot0 = Array(n).fill(0), fixed = Array(n).fill(0), lock = Array(n).fill(0), gear = Array(n).fill(-1), col = Array(n).fill(0);
  const tree = new Int8Array(n).fill(-1), conn = Array(n).fill(0);
  const id = (x: number, y: number) => y * w + x;
  const mdist = (a: number, b: number) => Math.abs((a % w) - (b % w)) + Math.abs(Math.floor(a / w) - Math.floor(b / w));
  const srcs: number[] = [], c0s: number[] = [];
  const nc = d.f.length;
  for (let c = 0; c < nc; c++) {
    const x = 1 + Math.floor(r() * (w - 2)), y = c === 0 ? 0 : h - 1, s = id(x, y);
    kind[s] = SRC;
    base[s] = c === 0 ? 4 : 1;
    col[s] = c;
    srcs.push(s);
    const c0 = id(x, c === 0 ? 1 : h - 2);
    c0s.push(c0);
    tree[c0] = c;
    conn[c0] = 1 << (c === 0 ? 0 : 2);
  }
  // 우물 양옆은 흙 (우물이 판 가장자리에서 튀어나와 보이게)
  for (const s of srcs) for (const dd of [1, 3]) if (nbr[s * 4 + dd] >= 0 && kind[nbr[s * 4 + dd]] === PIPE) kind[nbr[s * 4 + dd]] = DIRT;
  // 밭
  const fields: number[] = [];
  for (let c = 0; c < nc; c++) {
    for (let k = 0; k < d.f[c]; k++) {
      let pick = -1;
      for (let tries = 0; tries < 80 && pick < 0; tries++) {
        const i = Math.floor(r() * n);
        if (kind[i] !== PIPE || tree[i] >= 0) continue;
        if (fields.some((f) => mdist(f, i) < 2) || srcs.some((s) => mdist(s, i) < 3)) continue;
        if (c0s.some((q) => mdist(q, i) < 2)) continue;
        pick = i;
      }
      if (pick < 0) return null;
      kind[pick] = FIELD;
      col[pick] = c;
      fields.push(pick);
    }
  }
  // 바위 덩이
  for (let k = 0; k < d.rocks; k++) {
    const i = Math.floor(r() * n);
    if (kind[i] === PIPE && tree[i] < 0 && !c0s.some((q) => mdist(q, i) < 2)) kind[i] = ROCK;
  }
  // 물길 나무: 밭마다 지금 나무(갈래 3 미만)에서 그 밭 옆 칸까지 무작위 가중 최단 길
  for (let c = 0; c < nc; c++) {
    const mine = fields.filter((f) => col[f] === c);
    shuffle(mine, r);
    for (const f of mine) {
      const dist = new Float64Array(n).fill(1e9), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
      const wgt = new Float64Array(n);
      for (let i = 0; i < n; i++) wgt[i] = 1 + r() * 1.6;
      // 수문 관(우물 바로 밑)은 갈래 없이 두 입구만 — 마지막 한 톡에 물이 한꺼번에 가게
      for (let i = 0; i < n; i++) if (tree[i] === c && popc(conn[i]) < (c0s.includes(i) ? 2 : 3)) dist[i] = 0;
      let goal = -1;
      for (;;) {
        let u = -1, bd = 1e9;
        for (let i = 0; i < n; i++) if (!done[i] && dist[i] < bd) (bd = dist[i]), (u = i);
        if (u < 0) break;
        done[u] = 1;
        // u가 밭 옆이면 끝 (나무 칸이면 갈래가 남아 있어야)
        let adj = false;
        for (let dd = 0; dd < 4; dd++) if (nbr[u * 4 + dd] === f) adj = true;
        if (adj && (tree[u] < 0 || popc(conn[u]) < (c0s.includes(u) ? 2 : 3))) {
          goal = u;
          break;
        }
        for (let dd = 0; dd < 4; dd++) {
          const v = nbr[u * 4 + dd];
          if (v < 0 || done[v] || kind[v] !== PIPE || tree[v] >= 0) continue;
          // 다른 색 나무 바로 옆은 피한다 (섞이기 쉬운 길은 만들지 않음)
          const nd = bd + wgt[v];
          if (nd < dist[v]) (dist[v] = nd), (prev[v] = u);
        }
      }
      if (goal < 0) return null;
      // 길을 나무에 붙인다
      const path: number[] = [];
      for (let x = goal; x >= 0 && tree[x] < 0; x = prev[x]) path.push(x);
      path.reverse();
      let from = path.length ? prev[path[0]] : goal;
      for (const p of path) {
        const dd = [0, 1, 2, 3].find((q) => nbr[from * 4 + q] === p)!;
        conn[from] |= 1 << dd;
        conn[p] |= 1 << opp(dd);
        tree[p] = c;
        from = p;
      }
      const df = [0, 1, 2, 3].find((q) => nbr[goal * 4 + q] === f)!;
      conn[goal] |= 1 << df;
    }
  }
  for (let i = 0; i < n; i++) if (tree[i] >= 0 && popc(conn[i]) < 2) return null;
  // 모양 · 정답 회전
  const solR = Array(n).fill(0);
  let treeN = 0;
  for (let i = 0; i < n; i++) {
    if (tree[i] < 0) continue;
    const [b, k] = shapeOf(conn[i]);
    base[i] = b;
    solR[i] = k;
    col[i] = tree[i];
    treeN++;
  }
  // 나머지: 미끼 관 또는 흙
  for (let i = 0; i < n; i++) {
    if (kind[i] !== PIPE || tree[i] >= 0) continue;
    if (r() < d.dirt) {
      kind[i] = DIRT;
      continue;
    }
    const q = r();
    base[i] = q < d.xr ? X_ : q < d.xr + d.tr ? T_ : q < d.xr + d.tr + (1 - d.xr - d.tr) * 0.45 ? I_ : L_;
    solR[i] = Math.floor(r() * 4);
  }
  // 개미집: 나무 옆 빈 칸 (나무에 많이 닿는 곳)
  if (d.nests) {
    const cand: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      if (tree[i] >= 0 || (kind[i] !== PIPE && kind[i] !== DIRT)) continue;
      if (srcs.some((s) => mdist(s, i) < 2)) continue;
      let k = 0;
      for (let dd = 0; dd < 4; dd++) if (nbr[i * 4 + dd] >= 0 && tree[nbr[i * 4 + dd]] >= 0) k++;
      if (k) cand.push([i, k + r()]);
    }
    cand.sort((a, b) => b[1] - a[1]);
    const put: number[] = [];
    for (const [i] of cand) {
      if (put.length >= d.nests) break;
      if (put.some((j) => mdist(i, j) < 2)) continue;
      kind[i] = NEST;
      put.push(i);
    }
    if (put.length < d.nests) return null;
  }
  // 나무 부모 (뿌리 잠금 자리 고르기용)
  const par = new Int32Array(n).fill(-1), order: number[] = [];
  for (const c0 of c0s) {
    par[c0] = -2;
    order.push(c0);
  }
  for (let qi = 0; qi < order.length; qi++) {
    const u = order[qi];
    for (let dd = 0; dd < 4; dd++) {
      if (!((conn[u] >> dd) & 1)) continue;
      const v = nbr[u * 4 + dd];
      if (v >= 0 && tree[v] >= 0 && par[v] === -1) (par[v] = u), order.push(v);
    }
  }
  const isC0 = (i: number) => c0s.includes(i);
  // 바위 관 (정답 그대로 박혀 있다)
  const treeCells = order.filter((i) => !isC0(i));
  shuffle(treeCells, r);
  let fx = 0;
  for (const i of treeCells) {
    if (fx >= d.fixed) break;
    if (base[i] === X_) continue;
    fixed[i] = 1;
    fx++;
  }
  if (d.fixed && fx < d.fixed) return null;
  if (d.fixed) {
    // 미끼 바위 관도 하나
    const dec = [...Array(n).keys()].filter((i) => kind[i] === PIPE && tree[i] < 0 && base[i] !== X_);
    if (dec.length) fixed[dec[Math.floor(r() * dec.length)]] = 1;
  }
  // 뿌리 잠금: 밭 옆 나무 칸인데, 우물→그 밭 길 위에 있지 않은 칸
  let lk = 0;
  if (d.locks) {
    const attach = new Map<number, number>();
    for (const i of order) for (let dd = 0; dd < 4; dd++) if ((conn[i] >> dd) & 1 && kind[nbr[i * 4 + dd]] === FIELD) attach.set(nbr[i * 4 + dd], i);
    const cand: number[] = [];
    for (const i of order) {
      if (isC0(i) || fixed[i] || base[i] === X_) continue;
      for (let dd = 0; dd < 4; dd++) {
        const f = nbr[i * 4 + dd];
        if (f < 0 || kind[f] !== FIELD || col[f] !== tree[i]) continue;
        const a = attach.get(f);
        if (a === undefined) continue;
        let onPath = false;
        for (let x = a; x >= 0; x = par[x]) if (x === i) onPath = true;
        if (!onPath) cand.push(i);
      }
    }
    shuffle(cand, r);
    for (const i of cand) {
      if (lk >= d.locks || lock[i]) continue;
      lock[i] = 1;
      lk++;
    }
    if (lk < 1) return null;
  }
  // 톱니 짝: 나무 칸 + 이웃 관 (둘 다 나무면 더 좋다)
  let gk = 0;
  if (d.gears) {
    const cand: [number, number, number][] = [];
    for (const a of order) {
      if (isC0(a) || fixed[a] || lock[a] || base[a] === X_) continue;
      for (let dd = 1; dd <= 2; dd++) {
        const b = nbr[a * 4 + dd];
        if (b < 0 || kind[b] !== PIPE || fixed[b] || lock[b] || base[b] === X_ || isC0(b)) continue;
        cand.push([a, b, (tree[b] >= 0 ? 1 : 0) + r() * 0.8]);
      }
    }
    cand.sort((x, y) => y[2] - x[2]);
    for (const [a, b] of cand) {
      if (gk >= d.gears) break;
      if (gear[a] >= 0 || gear[b] >= 0) continue;
      gear[a] = b;
      gear[b] = a;
      gk++;
    }
    if (gk < d.gears) return null;
  }
  // 섞기: 정답에서 무작위로 돌려 놓는다 (수문 관·뿌리 관은 반드시 틀리게)
  let designed = 0;
  const wrong = (i: number, k: number) => rotm(base[i], (solR[i] - k) & 3) !== rotm(base[i], solR[i]);
  for (let i = 0; i < n; i++) {
    if (kind[i] !== PIPE) continue;
    if (fixed[i] || base[i] === X_) {
      rot0[i] = solR[i];
      continue;
    }
    const g = gear[i];
    if (g >= 0) {
      if (g < i) continue;
      let k = 1 + Math.floor(r() * 3);
      if (!wrong(i, k) && !wrong(g, k)) k = k === 2 ? 1 : 2;
      rot0[i] = (solR[i] - k) & 3;
      rot0[g] = (solR[g] - k) & 3;
      if (tree[i] >= 0 || tree[g] >= 0) designed += k;
      continue;
    }
    let k = Math.floor(r() * 4);
    if (tree[i] >= 0 && (lock[i] || r() < 0.85)) while (!wrong(i, k)) k = (k + 1) & 3;
    if (tree[i] < 0) k = Math.floor(r() * 4);
    if (isC0(i)) {
      // 수문 관: 처음엔 우물 쪽이 막혀 있고, 되도록 '마지막 한 톡'에 열리게
      const sb = 1 << (tree[i] === 0 ? 0 : 2), shut = (q: number) => !(rotm(base[i], (solR[i] - q) & 3) & sb);
      const good = [1, 2, 3].filter((q) => shut(q) && [...Array(q - 1).keys()].every((z) => shut(z + 1)));
      const ok = [1, 2, 3].filter(shut);
      k = good.length ? good[Math.floor(r() * good.length)] : ok.length ? ok[Math.floor(r() * ok.length)] : 1;
    }
    rot0[i] = (solR[i] - k) & 3;
    if (tree[i] >= 0) for (let q = 0; q < 4; q++) if (rotm(base[i], (rot0[i] + q) & 3) === rotm(base[i], solR[i])) (designed += q), (q = 9);
  }
  const L: Level = {
    w, h, n, kind, base, rot0, fixed, lock, gear, col, nbr, cap: d.cap >= 0 ? treeN + d.cap : 0,
    fields: fields.slice().sort((a, b) => a - b), srcs, colors: nc, sol: [], par: 0, P: 0, limit: 99, plan: [], habit: { ok: false, stars: 0, rots: 0 }, medium: { ok: false, stars: 0, rots: 0 },
  };
  if (!finishLevel(L, d, designed)) return null;
  return L;
}

const levelCache = new Map<string, Level>();
export function buildLevel(seed: number, stage: number): Level {
  const ck = `${seed}:${stage}`, hit = levelCache.get(ck);
  if (hit) return hit;
  const d = STAGES[stage], r = mulberry32((seed * 31 + stage * 7919 + 17) >>> 0);
  let pick: Level | null = null, bv = -1e9;
  if (stage === 0) pick = firstLevel(d, r);
  else {
    const K = stage === 1 ? 6 : 16;
    for (let tries = 0, c = 0; c < K && tries < 120; tries++) {
      const L = makeLevel(d, r);
      if (!L) continue;
      c++;
      L.habit = habitRun(L);
      L.medium = mediumRun(L);
      let v: number;
      if (stage === 1) v = -Math.abs(randomPass(L, r, 24) - 0.72) + (L.habit.stars < 3 ? 0.05 : 0);
      else {
        // 버릇대로 두면 ★3이 안 나오고, '밭마다 가까운 길'로는 깨지지만 ★3은 안 되는 판 (무엇을 먼저·어떻게 닫을지가 수가 되게)
        v = (L.habit.stars < 3 ? 2 : 0) + (L.medium.ok ? 1 : 0) + (L.medium.stars < 3 ? 1 : 0) - Math.abs(L.par - (stage >= 5 ? 13 : 10)) * 0.08;
      }
      if (v > bv) (bv = v), (pick = L);
      if (stage >= 2 && bv >= 3.9) break;
    }
  }
  if (!pick) pick = firstLevel(STAGES[0], r);
  if (!pick.habit.rots) pick.habit = habitRun(pick);
  if (levelCache.size > 400) levelCache.clear();
  levelCache.set(ck, pick);
  return pick;
}

// ───────────────────────────── 상태 ─────────────────────────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number; n?: number }
export interface PipeState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'settle' | 'result'; pt: number; settleUntil: number;
  L: Level; S: Sim; F: Flow; lastTurn: number;
  down: boolean; ax: number; ay: number; lastTap: number; taps: number; pending: { x: number; y: number } | null;
  /** 누르고 있는 관 · 누른 때 (미리 보기용) */
  press: number; pressT: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean; tries: number;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
  mood: string; moodT: number; chick: string; chickT: number; wormT: number; antT: number;
  /** 그리기: 관의 보이는 회전(4분의 1 바퀴 단위)·목표·속도 · 물이 든 때 · 새싹 난 때 · 뿌리 풀린 때 · 톡 흔들림 */
  ang: number[]; tgt: number[]; av: number[]; wetT: number[]; sproutT: number[]; unlT: number[]; bump: number[];
  /** 되돌리기(판마다 1번) */
  undo: number; prev: Sim | null; prevPts: number; undoT: number;
  /** 연쇄: 이번 톡에 새로 물이 닿은 밭 수 · 밭 점수 준 것 · 빛줄기 · 모자 던진 때 */
  chain: number; given: number[]; rays: { x: number; y: number; t0: number; n: number }[]; hatT: number; slowT: number;
  retry: boolean;
}

const ev = (s: PipeState, kind: string, x: number, y: number, text?: string, col?: string, v?: number, n?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v, n });
function tip(s: PipeState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: PipeState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}
const setMood = (s: PipeState, m: string) => ((s.mood = m), (s.moodT = s.t));
const setChick = (s: PipeState, m: string) => ((s.chick = m), (s.chickT = s.t));

// 화면 배치 (가로 0~1, 세로 0~A): 판은 3/4 시점 — 세로를 SQ만큼 눌러 그린다
const SQ = 0.86, BY0 = 0.415, BH = 0.8;
export interface Geo { cs: number; x0: number; y0: number }
export function geo(L: Level): Geo {
  const cs = Math.min(0.9 / L.w, BH / (L.h * SQ));
  return { cs, x0: 0.5 - (L.w * cs) / 2, y0: BY0 + (BH - L.h * cs * SQ) / 2 };
}
export const cellXY = (L: Level, i: number) => {
  const g = geo(L);
  return { x: g.x0 + ((i % L.w) + 0.5) * g.cs, y: g.y0 + (Math.floor(i / L.w) + 0.5) * g.cs * SQ };
};
/** 되돌리기 단추 */
const UX = 0.925, UY = 0.098, UR = 0.036;
export const UNDO = 1;

function newStage(s: PipeState) {
  const d = STAGES[s.stage];
  s.L = buildLevel(s.seed, s.stage);
  s.S = newSim(s.L);
  s.F = flow(s.L, s.S.rot);
  const n = s.L.n;
  s.ang = s.S.rot.slice();
  s.tgt = s.S.rot.slice();
  s.av = Array(n).fill(0);
  s.wetT = s.F.wet.map((x) => (x ? 0 : -1));
  s.sproutT = Array(n).fill(-1);
  s.unlT = Array(n).fill(-1);
  s.bump = Array(n).fill(0);
  s.lastTurn = -1;
  s.pending = null;
  s.press = -1;
  s.undo = UNDO;
  s.prev = null;
  s.undoT = -99;
  s.chain = 0;
  s.given = Array(n).fill(0);
  s.rays = [];
  s.hatT = -99;
  s.slowT = -99;
  s.retry = s.tips.has('try:' + s.stage);
  s.tips.add('try:' + s.stage);
  s.phase = 'play';
  s.pt = 0;
  s.startT = s.t;
  s.got = 0;
  setMood(s, 'idle');
  setChick(s, 'idle');
  if (!s.seen.has(d.key)) {
    s.seen.add(d.key);
    s.newsQ.unshift(d.news);
    s.news = null;
  }
  ev(s, 'stage', 0.5, 0.6, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

function finish(s: PipeState) {
  s.phase = 'result';
  s.pt = 0;
  const L = s.L, S = s.S;
  if (s.ok) {
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    // 아낀 돌리기 보너스: ★ 기준(P)보다 덜 돌린 만큼
    s.pts += st * STAR_PTS + Math.min(30, Math.max(0, L.P - S.rots) * LEFT_PTS);
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.62, `${STAGES[s.stage].emoji} 풍년! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
    setMood(s, 'proud');
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.62, s.why, '#ffd0c8');
    setMood(s, 'dizzy');
    setChick(s, 'sad');
  }
}

/** 손가락 자리의 칸 (판 밖 -1) */
export function pickCell(L: Level, x: number, y: number) {
  const g = geo(L), cx = Math.floor((x - g.x0) / g.cs), cy = Math.floor((y - g.y0) / (g.cs * SQ));
  if (cx < 0 || cy < 0 || cx >= L.w || cy >= L.h) return -1;
  return cy * L.w + cx;
}

function tapAt(s: PipeState, x: number, y: number) {
  s.taps++;
  s.lastTap = s.t;
  if (Math.hypot(x - UX, y - UY) < UR * 1.35) return undoTurn(s);
  const L = s.L, S = s.S, i = pickCell(L, x, y);
  if (i < 0) {
    if (y > 0.4 && y < 1.28) ev(s, 'miss', x, y, '관을 톡!', '#fff3df');
    return;
  }
  const c = cellXY(L, i), k = L.kind[i];
  s.press = i;
  s.pressT = s.t;
  if (k === PIPE && L.fixed[i]) {
    s.bump[i] = 1;
    ev(s, 'nope', c.x, c.y - 0.05, '🪨 바위에 꽉 박혔어요', '#e8e2d8');
    tip(s, 'fixedTap', '🪨 바위 관은 못 돌려요 — 거기에 맞춰 이웃 관을 돌려요');
    return setMood(s, 'huh');
  }
  if (k === PIPE && L.lock[i] && !S.unl[i]) {
    s.bump[i] = 1;
    ev(s, 'nope', c.x, c.y - 0.05, '🌿 뿌리가 꽉! 옆 밭에 물부터', '#d8f5c8');
    tip(s, 'lockTap', '🌿 뿌리 관은 바로 옆 밭에 물이 닿으면 풀려요');
    return setMood(s, 'huh');
  }
  if (k === PIPE && L.base[i] === X_) {
    s.tgt[i]++;
    ev(s, 'nope', c.x, c.y - 0.05, '빙글~ 십자는 그대로!', '#e8f4ff');
    see(s, 'cross', '➕ 십자 관은 돌려도 똑같아요 (돌리기 안 셈)');
    return setMood(s, 'huh');
  }
  if (k !== PIPE) {
    const why = k === FIELD ? '🥕 밭 — 관을 돌려 물을 대요' : k === SRC ? (L.col[i] ? '🍯 꿀물 우물' : '💧 우물 — 여기서 물이 나와요') : k === NEST ? '🐜 개미집 — 물 금지!' : '흙이에요';
    ev(s, 'nope', c.x, c.y - 0.05, why, '#fff3df');
    return;
  }
  doTurn(s, i);
}

/** 되돌리기: 바로 전 톡 하나를 없던 일로 (돌리기 수도 돌아온다) */
function undoTurn(s: PipeState) {
  if (!s.prev || s.undo <= 0 || s.lastTurn < 0) {
    ev(s, 'say', UX - 0.12, UY + 0.06, s.undo <= 0 ? '되돌리기를 다 썼어요' : '되돌릴 톡이 없어요', '#ffe9c4');
    return;
  }
  const L = s.L, i = s.lastTurn;
  s.S = s.prev;
  s.prev = null;
  s.undo--;
  s.undoT = s.t;
  s.tgt[i]--;
  if (L.gear[i] >= 0) s.tgt[L.gear[i]]--;
  s.lastTurn = -1;
  s.F = flow(L, s.S.rot);
  for (let j = 0; j < L.n; j++) if (!s.F.wet[j]) s.wetT[j] = -1;
  ev(s, 'undo', UX, UY, '슝~ 되돌렸어요', '#e6dcff');
  setMood(s, 'wow');
}

function doTurn(s: PipeState, i: number) {
  const L = s.L, S = s.S, rec: RE[] = [], before = s.F;
  s.prev = cloneSim(S);
  const leaks0 = new Set(before.leak), flood0 = before.flood.length, mixed0 = before.mixed;
  const F = turn(L, S, i, rec);
  s.F = F;
  s.lastTurn = i;
  s.tgt[i]++;
  s.av[i] += 0.05;
  const g = L.gear[i];
  if (g >= 0) (s.tgt[g]++, (s.av[g] += 0.05));
  const t0 = s.t, c = cellXY(L, i);
  ev(s, 'turn', c.x, c.y, undefined, '#e8d2b0', t0, g >= 0 ? 2 : 1);
  if (g >= 0) {
    const cg = cellXY(L, g);
    ev(s, 'gear', (c.x + cg.x) / 2, (c.y + cg.y) / 2, '딸깍딸깍!', '#ffe7a8', t0 + 4);
    see(s, 'gearUse', '⚙️ 맞물린 짝이 같이 돌았어요 — 둘 다 맞는 때를 찾아요');
  }
  // 새로 물이 든 칸: 톡 한 칸에서 가까운 순서로 차례차례 (끝내는 톡이면 천천히 — 큰 순간)
  const fresh: number[] = [];
  for (let j = 0; j < L.n; j++) {
    if (F.wet[j] && !before.wet[j]) fresh.push(j);
    if (!F.wet[j]) s.wetT[j] = -1;
  }
  const big = S.clear && L.fields.length >= 2;
  if (fresh.length) {
    const dmin = Math.min(...fresh.map((j) => F.dist[j]));
    const step = big ? 6 : 3;
    for (const j of fresh) s.wetT[j] = t0 + 5 + (F.dist[j] - dmin) * step;
    const far = fresh.reduce((a, j) => (F.dist[j] > F.dist[a] ? j : a), fresh[0]), cf = cellXY(L, far);
    if (fresh.length >= 3) ev(s, 'glug', c.x, c.y - 0.06, fresh.length >= 7 ? '콸콸콸!' : '콸콸!', '#e8f4ff', t0 + 5, Math.min(4, Math.floor(fresh.length / 3)));
    void cf;
    setMood(s, 'wow');
  }
  // 새싹: 이번 톡으로 처음 물이 닿은 밭 (한 번에 여럿이면 연쇄 — 점수가 커진다)
  const sprouts = rec.filter((e) => e.k === 'sprout').map((e) => e.i).sort((a, b) => s.wetT[a] - s.wetT[b]);
  const nNew = sprouts.filter((f) => !s.given[f]).length;
  s.chain = sprouts.length;
  let k = 0;
  for (const f of sprouts) {
    k++;
    const cf = cellXY(L, f), due = Math.max(t0 + 6, s.wetT[f] + 2);
    s.sproutT[f] = due;
    const pts = s.given[f] ? 0 : chainPts(nNew);
    s.given[f] = 1;
    s.pts += pts;
    ev(s, 'sprout', cf.x, cf.y, k >= 3 ? '와르르 퐁!' : k === 2 ? '퐁퐁!' : '퐁!', '#eaffd0', due, k);
    if (pts) ev(s, 'num', cf.x, cf.y - 0.07, `+${pts}`, '#ffe066', due + 6, nNew);
    s.rays.push({ x: cf.x, y: cf.y, t0: due, n: k });
  }
  if (sprouts.length) {
    see(s, 'sprout', '🌱 밭에 물이 닿으면 새싹이 퐁!');
    if (sprouts.length >= 2) see(s, 'chain', '✨ 한 번 톡에 밭 여럿 — 연쇄 퐁퐁! 점수가 커져요');
    setChick(s, 'happy');
    s.chickT = s.wetT[sprouts[0]];
  }
  for (const e of rec) {
    if (e.k !== 'unlock') continue;
    const cu = cellXY(L, e.i);
    s.unlT[e.i] = t0 + 18;
    ev(s, 'unlock', cu.x, cu.y - 0.04, '쭈욱~ 뿌리가 풀렸다!', '#d8ffc8', t0 + 18);
    see(s, 'unlockSeen', '🌿 옆 밭이 물을 마시자 뿌리가 풀렸어요 — 이제 돌릴 수 있어요');
  }
  // 새는 곳 · 개미집 · 흙탕물
  const newLeaks = F.leak.filter((q) => !leaks0.has(q) && F.wet[q >> 2]);
  if (newLeaks.length && !S.clear) {
    const q = newLeaks[0], cq = cellXY(L, q >> 2);
    ev(s, 'leak', cq.x + DX[q & 3] * 0.05, cq.y + DY[q & 3] * 0.04, '쉬익~ 물이 새요!', '#cfeeff', t0 + 8);
    see(s, 'leak', '💧 관 끝이 막힌 곳으로 향하면 물이 새요 — 새지 않게 이으면 ★');
    s.wormT = t0 + 10;
    if (!sprouts.length) setMood(s, 'oops');
  }
  if (F.flood.length > flood0) {
    const cn = cellXY(L, F.flood[0]);
    ev(s, 'flood', cn.x, cn.y - 0.04, '개미 대피! 물 잠가요!', '#ffd8b0', t0 + 10);
    see(s, 'flood', '🐜 개미집에 물이 들었어요! 물이 들어가는 동안엔 끝낼 수 없어요');
    s.antT = t0 + 10;
    setMood(s, 'panic');
  }
  if (F.mixed && !mixed0) {
    ev(s, 'mix', c.x, c.y - 0.05, '앗 흙탕물!', '#e0c8a0', t0 + 10);
    see(s, 'mix', '🟤 맑은 물과 꿀물이 섞이면 흙탕물 — 길을 따로따로!');
    setMood(s, 'panic');
  }
  if (F.dry.length && L.cap) see(s, 'dry', '🪣 물이 모자라 멈췄어요 — 더 짧은 길로!');
  if (S.clear) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = true;
    const last = Math.max(t0, ...L.fields.map((f) => s.sproutT[f]));
    s.settleUntil = last + 46;
    s.hatT = last + 4;
    if (big) s.slowT = t0;
  } else if (S.fail) {
    s.phase = 'settle';
    s.pt = 0;
    s.ok = false;
    s.settleUntil = t0 + 44;
    s.why = '🔧 돌리기를 다 썼어요!';
    ev(s, 'jam', 0.5, 0.62, '힘이 쭉…', '#ffb4a8', t0 + 26);
  } else if (L.limit - S.rots <= 3) {
    setMood(s, 'worry');
    tip(s, 'low', '🔧 돌리기가 얼마 안 남았어요 — 꼭 필요한 관만!');
  }
}

function animate(s: PipeState) {
  for (let i = 0; i < s.L.n; i++) {
    const dlt = s.tgt[i] - s.ang[i];
    if (Math.abs(dlt) < 0.002 && Math.abs(s.av[i]) < 0.002) {
      s.ang[i] = s.tgt[i];
      s.av[i] = 0;
    } else {
      s.av[i] = s.av[i] * 0.55 + dlt * 0.32;
      s.ang[i] += s.av[i];
    }
    if (s.bump[i] > 0) s.bump[i] = Math.max(0, s.bump[i] - 0.06);
  }
  if (s.rays.length && s.t - s.rays[0].t0 > 50) s.rays = s.rays.filter((m) => s.t - m.t0 <= 50);
}

export const pipespin: GameDef<PipeState> = {
  id: 'pipespin',
  name: '두더지 물길 관 돌리기',
  genes: ['pipes', 'pointer', 'chain'],
  twist: '물은 이어지는 순간 콸콸 흐르니 우물 바로 밑 수문 관을 마지막까지 아껴 두면 — 그 한 번 톡에 물이 판 끝까지 내달리며 밭마다 차례로 새싹이 퐁퐁퐁 터진다(두더지 농부는 밀짚모자를 하늘로)',
  rules: ['관을 톡 → 90° 돈다.', '우물에서 모든 밭까지 물길을 이으면 성공 — 돌리기 횟수엔 한도가 있다.'],
  controls: 'touch',
  hint: '관을 톡 → 빙글 90°! (누르고 있으면 한 번 더 돌릴 때 미리 보기) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '두더지 농부의 텃밭 디오라마',
    mood: '햇살 내리쬐는 언덕 텃밭을 잘라 낸 흙 덩이 — 단면엔 흙켜와 조약돌, 윗면엔 황토 관이 묻힌 고랑과 초록 밭. 돌 우물에서 물이 퐁퐁, 이어진 관엔 물이 반짝이며 흐르고, 밀짚모자 두더지 농부가 삽을 짚고 서 있고, 울타리 위 병아리와 흙 속 지렁이가 구경한다.',
    palette: { bg: '#2c2117', ink: '#fff8ec', muted: '#d9c6a8', accent: '#5cc8ff', hot: '#ff6b5a', soft: '#eaf7d8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, settleUntil: 0, lastTurn: -1,
      down: false, ax: 0, ay: 0, lastTap: -99, taps: 0, pending: null, press: -1, pressT: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false, tries: 0,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
      mood: 'idle', moodT: 0, chick: 'idle', chickT: 0, wormT: -99, antT: -99,
      undo: UNDO, prev: null, prevPts: 0, undoT: -99, chain: 0, given: [], rays: [], hatT: -99, slowT: -99, retry: false,
    } as unknown as PipeState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, press = !!p && !s.down;
    if (p) (s.ax = p.x), (s.ay = p.y);
    s.down = !!p;
    if (!p) s.press = -1;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.events.length > 60 || (s.events.length && s.t - s.events[0].t > 240)) s.events = s.events.filter((e) => s.t - e.t < 240);
    animate(s);
    if (s.mood !== 'idle' && s.t - s.moodT > (s.mood === 'dizzy' || s.mood === 'proud' ? 120 : 70)) s.mood = s.phase === 'play' && s.L.limit - s.S.rots <= 3 ? 'worry' : 'idle';
    if (s.chick !== 'idle' && s.t - s.chickT > 90 && s.phase === 'play') s.chick = 'idle';
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
    if (s.phase === 'settle') {
      if (s.t >= s.settleUntil) finish(s);
      return;
    }
    if (s.down && s.press >= 0 && s.t - s.pressT === 14 && s.L.kind[s.press] === PIPE) see(s, 'hold', '👀 누르고 있으면 — 한 번 더 돌렸을 때 물이 어디까지 가는지 반짝');
    if (press) {
      if (s.t - s.startT < 10) s.pending = { x: s.ax, y: s.ay * A };
      else tapAt(s, s.ax, s.ay * A);
    } else if (s.pending && s.t - s.startT >= 10) {
      const q = s.pending;
      s.pending = null;
      tapAt(s, q.x, q.y);
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const brain = new WeakMap<object, { key: string; list: number[]; i: number; rots: number }>();
/** 다음에 톡 할 관: 처음엔 판의 최소 풀이(먼 관부터, 수문 관은 마지막), 어긋나면 지금 모습에서 다시 푼다 */
export function planMove(s: PipeState): number {
  const S = s.S, key = `${s.stage}:${s.tries}`;
  let b = brain.get(s);
  if (b && b.key === key && S.rots === b.rots + 1 && b.list[b.i] === s.lastTurn) (b.i++, (b.rots = S.rots));
  if (!b || b.key !== key || b.rots !== S.rots || b.i >= b.list.length) {
    const list = S.rots === 0 ? s.L.plan.slice() : planFrom(s.L, S) ?? [habitPick(s.L, S)];
    brain.set(s, (b = { key, list, i: 0, rots: S.rots }));
  }
  return b.list[b.i] ?? -1;
}
const NO: Input = { tap: false, dir: 0, pointer: null };
function at(s: PipeState, i: number): Input {
  const c = cellXY(s.L, i);
  return { tap: false, dir: 0, pointer: { x: c.x, y: c.y / A } };
}
const ready = (s: PipeState, gap: number) => s.phase === 'play' && !s.down && !s.pending && s.t - s.lastTap >= gap && s.t - s.startT >= 40;
/** 봇: 판 전체를 보고 물 안 새는 최소 물길을 찾아, 먼 관부터 맞추고 수문 관은 마지막에 (사람처럼 한 번 톡 하고 조금 지켜본다) */
export const pipespinSmart: Bot<PipeState> = {
  name: '물길 장인',
  act(s) {
    if (!ready(s, 12)) return NO;
    const i = planMove(s);
    if (i < 0) return NO;
    if (i !== s.lastTurn && s.t - s.lastTap < 24) return NO;
    return at(s, i);
  },
};
/** 버릇 봇(측정용): '물이 닿은 관 끝 바로 다음 관을, 물을 받을 때까지 돌린다' */
export const pipespinHabit: Bot<PipeState> = {
  name: '버릇: 물 끝 다음 관 돌리기',
  act(s) {
    if (!ready(s, 16)) return NO;
    const i = habitPick(s.L, s.S);
    return i < 0 ? NO : at(s, i);
  },
};
const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 아무 칸이나 톡 (가끔 화면 아무 데나) */
export const pipespinRandom: Bot<PipeState> = {
  name: '아무 관이나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 4);
    if (rng() < 0.15) m.p = { x: rng(), y: rng() };
    else {
      const q = at(s, Math.floor(rng() * s.L.n)).pointer!;
      m.p = { x: q.x + (rng() - 0.5) * 0.03, y: q.y + (rng() - 0.5) * 0.03 };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const WATER = ['#3fb4ff', '#ffbf2e'], WATERL = ['#c8eeff', '#fff1b8'], MUD = '#9a7348', MUDL = '#d8bd92';
const PIPE_C = '#e0965a', PIPE_L = '#ffe0bc', DRY_IN = '#4b2914';
const CROPS = ['🥕', '🥬', '🍅', '🌽', '🍆', '🥔'];
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const hex = (c: string) => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const p = hex(a), q = hex(b);
  return '#' + p.map((v, i) => Math.round(v + (q[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const shade = (c: string, k: number) => (k >= 0 ? mix(c, '#ffffff', k) : mix(c, '#000000', -k));
const cl01 = (q: number) => Math.max(0, Math.min(1, q));
const ease = (q: number) => 1 - Math.pow(1 - cl01(q), 2.4);
/** 튀어 오르며 커지기 (0 → 1.2 → 1) */
const popS = (q: number) => (q <= 0 ? 0 : q < 0.6 ? ease(q / 0.6) * 1.22 : 1.22 - 0.22 * ease((q - 0.6) / 0.4));
type F = (v: number) => number;
const waterOf = (bits: number) => (bits === 3 ? MUD : WATER[bits === 2 ? 1 : 0]);
const waterLOf = (bits: number) => (bits === 3 ? MUDL : WATERL[bits === 2 ? 1 : 0]);

/** 판의 화면 자리 (px) */
interface BG { x0: number; y0: number; cw: number; ch: number; W: number; H: number }
function bgeo(s: PipeState, R: F): BG {
  const g = geo(s.L);
  return { x0: R(g.x0), y0: R(g.y0), cw: R(g.cs), ch: R(g.cs) * SQ, W: R(g.cs) * s.L.w, H: R(g.cs) * SQ * s.L.h };
}
const cpx = (B: BG, L: Level, i: number) => ({ x: B.x0 + ((i % L.w) + 0.5) * B.cw, y: B.y0 + (Math.floor(i / L.w) + 0.5) * B.ch });

const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();
function drawAll(ctx: CanvasRenderingContext2D, s: PipeState, w: number, h: number, th: Theme) {
  const fx = juice(s), t = s.t, L = s.L, d = STAGES[s.stage];
  const X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const B = bgeo(s, R);
  ctx.save();
  fx.begin(ctx);
  // 새싹 순간 화면이 그 밭 쪽으로 살짝 당겨진다 (연쇄일수록 크게)
  const pr = s.rays.length ? s.rays[s.rays.length - 1] : null;
  if (pr && t >= pr.t0 && t - pr.t0 < 16) {
    const k = 1 + 0.02 * Math.min(4, pr.n + 0.5) * (1 - (t - pr.t0) / 16);
    ctx.translate(X(pr.x), Y(pr.y));
    ctx.scale(k, k);
    ctx.translate(-X(pr.x), -Y(pr.y));
  }
  drawScene(ctx, s, w, h, X, Y, R, t);
  drawBoard(ctx, s, B, X, Y, R, t);
  drawMole(ctx, X(0.115), Y(0.402), R(0.16), s, t);
  // 가장자리 살짝 어둡게
  const vg = ctx.createRadialGradient(w / 2, h * 0.55, R(0.45), w / 2, h * 0.55, R(1.05));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(30,14,0,.35)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  // ═════════ 사건 연출 ═════════
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    // 같은 말을 0.7초 안에 또 하지 않는다 (마구 톡 해도 글자가 쌓이지 않게)
    const lk = 'say:' + text;
    if (t - (fx.memo[lk] ?? -99) < 42) return;
    fx.memo[lk] = t;
    y = Math.max(Y(0.2), Math.min(Y(1.24), y));
    for (let k = 0; k < 6 && rec.some((q) => t - q.t < 45 && Math.abs(q.x - x) < w * 0.32 && Math.abs(q.y - y) < size + 5); k++) y -= size + 6;
    if (y < Y(0.19)) y += (size + 6) * 3;
    rec.push({ x, y, t });
    if (rec.length > 12) rec.shift();
    ctx.font = `800 ${size}px system-ui, sans-serif`;
    const hw = ctx.measureText(text).width / 2 + 6;
    fx.pop(Math.max(hw, Math.min(w - hw, x)), y, text, col, size);
  };
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    const due = e.v !== undefined && e.kind !== 'clear' ? e.v : e.t;
    if (due <= seenT || due > t) continue;
    const x = X(e.x), y = Y(e.y), n = e.n ?? 1;
    if (e.kind === 'turn') fx.burst(x, y, '#d9b98a', 5 + 3 * n, 1.6, 1.6), fx.ring(x, y, 'rgba(255,240,210,.8)', R(0.05), 2), fx.kick(0.8);
    if (e.kind === 'gear') fx.burst(x, y, '#ffd66b', 10, 2.6, 1.6), say(x, y - R(0.05), e.text!, e.col!, 14);
    if (e.kind === 'glug') say(x, y, e.text!, e.col!, 15 + 3 * n), fx.kick(1.5 + n), fx.burst(x, y + R(0.05), '#9fe0ff', 8 + 4 * n, 2.4, 2);
    if (e.kind === 'sprout') {
      const c = Math.min(5, n);
      fx.burst(x, y, '#8be35a', 16 + 8 * c, 3 + c * 0.7, 2.6), fx.burst(x, y, '#c8f0ff', 10 + 4 * c, 3, 2), fx.ring(x, y, '#d8ffb0', R(0.08 + 0.03 * c), 4 + c);
      fx.kick(2 + 1.5 * c);
      if (c >= 2) fx.blink('#f4ffd8', 0.06 + 0.04 * c);
      if (c >= 3) for (const col of ['#ff9a3d', '#ffd23f', '#ff6b8a', '#8be35a']) fx.burst(x, y, col, 8, 5, 2.4);
      say(x, y - R(0.08), e.text!, '#f4ffe0', 18 + 3 * c);
    }
    if (e.kind === 'num') say(x + R(0.05), y, e.text!, n >= 3 ? '#ffb3e6' : e.col!, 16 + 3 * Math.min(4, n)), n >= 2 && n >= (fx.memo.chainSaid ?? 0) && ((fx.memo.chainSaid = n + 0.5), fx.pop(X(0.5), Y(0.95), n >= 4 ? `🔥 ${n}연쇄 대풍년!!` : n >= 3 ? `✨ ${n}연쇄 퐁퐁퐁!` : '✨ 2연쇄!', '#ffe9a8', 24 + 3 * n));
    if (e.kind === 'leak') fx.burst(x, y, '#9fe0ff', 18, 3.2, 2.2), say(x, y - R(0.04), e.text!, e.col!, 14), fx.kick(1.5);
    if (e.kind === 'flood') fx.burst(x, y, '#3a2a1a', 16, 3, 1.6), fx.burst(x, y, '#9fe0ff', 12, 2.6, 2), say(x, y - R(0.04), e.text!, e.col!, 15), fx.kick(3);
    if (e.kind === 'mix') fx.burst(x, y, MUD, 22, 3, 2.4), say(x, y - R(0.04), e.text!, e.col!, 16), fx.kick(3);
    if (e.kind === 'unlock') fx.burst(x, y, '#7ccf4a', 22, 3.2, 2.4), fx.burst(x, y, '#c9a06a', 10, 2.6, 2), fx.ring(x, y, '#d8ffc8', R(0.08), 4), say(x, y - R(0.04), e.text!, e.col!, 15);
    if (e.kind === 'nope') say(x, y, e.text!, e.col!, 14), fx.kick(1.2);
    if (e.kind === 'miss' || e.kind === 'say') say(x, y, e.text!, e.col!, 14);
    if (e.kind === 'undo') fx.ring(x, y, '#e6dcff', R(0.07), 4), fx.burst(x, y, '#e6dcff', 12, 3, 2), say(x - R(0.1), y + R(0.07), e.text!, e.col!, 14);
    if (e.kind === 'jam') fx.kick(7), fx.blink(th.hot, 0.22), say(X(0.5), Y(0.62), e.text!, e.col!, 20);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.16), (fx.memo.chainSaid = 0);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.62), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.62), '#8be35a', 30, 5, 3), fx.ring(X(0.5), Y(0.62), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.28), fx.kick(6);
      for (const f of L.fields) {
        const c = cpx(B, L, f);
        fx.burst(c.x, c.y - R(0.03), '#b8f07a', 12, 4, 2.4);
      }
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.2);
  }
  fx.memo.t = t;
  // 병아리 삐약 · 지렁이 비명
  if (s.chick === 'happy' && t >= s.chickT && (fx.memo.chick ?? -1) !== s.chickT) (fx.memo.chick = s.chickT), say(X(0.87), Y(0.255), '삐약!', '#fff3a0', 14);
  if (s.wormT >= 0 && t >= s.wormT && (fx.memo.worm ?? -1) !== s.wormT) (fx.memo.worm = s.wormT), say(X(0.78), Y(1.2), '으악 차가!', '#ffd8e8', 14);
  if (s.antT >= 0 && t >= s.antT + 20 && (fx.memo.ant ?? -1) !== s.antT) (fx.memo.ant = s.antT), fx.kick(2);
  ctx.restore();
  drawHud(ctx, s, d, w, h, B, X, Y, R, font, th);
}

// ═════════ 배경: 하늘 · 언덕 · 풀밭 · 두더지 집 · 울타리 ═════════
function drawScene(ctx: CanvasRenderingContext2D, s: PipeState, w: number, h: number, X: F, Y: F, R: F, t: number) {
  const moon = STAGES[s.stage].key === 'moon';
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.36));
  sky.addColorStop(0, moon ? '#1b2350' : '#7cc8f0');
  sky.addColorStop(0.7, moon ? '#4a3f7a' : '#cdeefa');
  sky.addColorStop(1, moon ? '#7a5a8a' : '#fff2cc');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Y(0.36));
  // 해(또는 보름달)
  const sx = X(0.74), sy = Y(0.17);
  const sg = ctx.createRadialGradient(sx, sy, R(0.01), sx, sy, R(0.12));
  sg.addColorStop(0, moon ? 'rgba(255,250,220,.95)' : 'rgba(255,250,200,1)');
  sg.addColorStop(0.35, moon ? 'rgba(255,240,190,.5)' : 'rgba(255,230,120,.55)');
  sg.addColorStop(1, 'rgba(255,230,150,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - R(0.12), sy - R(0.12), R(0.24), R(0.24));
  ctx.fillStyle = moon ? '#fff6d8' : '#fff0a0';
  ctx.beginPath();
  ctx.arc(sx, sy, R(0.034), 0, TAU);
  ctx.fill();
  if (moon)
    for (let k = 0; k < 18; k++) {
      ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.5 * Math.abs(Math.sin(t * 0.03 + k))})`;
      ctx.fillRect(X(hsh(k) * 0.95), Y(0.07 + hsh(k + 9) * 0.15), 1.6, 1.6);
    }
  // 구름
  for (let k = 0; k < 3; k++) {
    const cx = ((X(0.2 + k * 0.38) + t * (0.12 + k * 0.05)) % (w + R(0.3))) - R(0.15), cy = Y(0.105 + k * 0.045);
    ctx.fillStyle = moon ? 'rgba(200,190,240,.25)' : 'rgba(255,255,255,.85)';
    for (const [dx, dy, r] of [[0, 0, 0.032], [0.035, -0.012, 0.028], [0.068, 0.002, 0.024], [-0.032, 0.006, 0.022]]) {
      ctx.beginPath();
      ctx.arc(cx + R(dx), cy + R(dy), R(r), 0, TAU);
      ctx.fill();
    }
  }
  // 먼 언덕 두 겹
  for (const [y0, col, amp, ph] of [[0.25, moon ? '#3d5a5a' : '#9fd38a', 0.03, 0.4], [0.29, moon ? '#2f4a3e' : '#7cc06a', 0.025, 2.1]] as [number, string, number, number][]) {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, Y(0.4));
    for (let k = 0; k <= 20; k++) ctx.lineTo(X(k / 20), Y(y0) - R(amp) * (0.5 + 0.5 * Math.sin(k * 0.7 + ph)));
    ctx.lineTo(w, Y(0.4));
    ctx.fill();
  }
  // 풀밭 (판 둘레 땅)
  const gr = ctx.createLinearGradient(0, Y(0.3), 0, h);
  gr.addColorStop(0, moon ? '#3f6a3a' : '#86c95c');
  gr.addColorStop(0.3, moon ? '#355a30' : '#6db347');
  gr.addColorStop(1, moon ? '#2a4824' : '#4f8f33');
  ctx.fillStyle = gr;
  ctx.fillRect(0, Y(0.31), w, h - Y(0.31));
  // 풀잎·꽃 (판 양옆)
  for (let k = 0; k < 40; k++) {
    const x = X(hsh(k * 3) * 1), y = Y(0.33 + hsh(k * 5 + 1) * 1.0);
    const sw = Math.sin(t * 0.04 + k) * R(0.004);
    ctx.strokeStyle = moon ? 'rgba(120,180,110,.5)' : 'rgba(60,120,40,.55)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - R(0.006) + sw, y - R(0.016));
    ctx.moveTo(x, y);
    ctx.lineTo(x + R(0.006) + sw, y - R(0.014));
    ctx.stroke();
    if (k % 5 === 0) {
      ctx.fillStyle = ['#ffffff', '#ffd6e8', '#fff2a0'][k % 3];
      ctx.beginPath();
      ctx.arc(x + sw, y - R(0.017), R(0.005), 0, TAU);
      ctx.fill();
    }
  }
  // 두더지 집 (흙 둔덕 + 둥근 문) · 울타리 · 병아리
  {
    const hx = X(0.66), hy = Y(0.385);
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath();
    ctx.ellipse(hx, hy, R(0.09), R(0.014), 0, 0, TAU);
    ctx.fill();
    const mg = ctx.createRadialGradient(hx - R(0.03), hy - R(0.07), R(0.01), hx, hy - R(0.03), R(0.1));
    mg.addColorStop(0, '#b07a4a');
    mg.addColorStop(1, '#6e4426');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.ellipse(hx, hy, R(0.085), R(0.07), 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#5a9a3a';
    ctx.beginPath();
    ctx.ellipse(hx - R(0.02), hy - R(0.064), R(0.04), R(0.012), -0.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2412';
    ctx.beginPath();
    ctx.ellipse(hx + R(0.01), hy - R(0.002), R(0.026), R(0.034), 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#8a5a2e';
    ctx.beginPath();
    ctx.ellipse(hx + R(0.01), hy - R(0.002), R(0.02), R(0.028), 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath();
    ctx.arc(hx + R(0.022), hy - R(0.014), R(0.003), 0, TAU);
    ctx.fill();
    // 굴뚝 연기 대신 흙 굴뚝에서 김
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.01 + k / 3) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.35 * (1 - ph)})`;
      ctx.beginPath();
      ctx.arc(hx - R(0.05) + Math.sin(ph * 6 + k) * R(0.006), hy - R(0.07) - ph * R(0.06), R(0.008 + ph * 0.01), 0, TAU);
      ctx.fill();
    }
  }
  // 울타리
  {
    const y = Y(0.375);
    for (let k = 0; k < 4; k++) {
      const x = X(0.8 + k * 0.055);
      ctx.fillStyle = '#c9965a';
      ctx.fillRect(x - R(0.006), y - R(0.05), R(0.012), R(0.052));
      ctx.fillStyle = '#e8b878';
      ctx.fillRect(x - R(0.006), y - R(0.05), R(0.004), R(0.052));
    }
    ctx.fillStyle = '#b27c42';
    ctx.fillRect(X(0.78), y - R(0.04), X(1) - X(0.78), R(0.009));
    ctx.fillRect(X(0.78), y - R(0.018), X(1) - X(0.78), R(0.008));
    drawChick(ctx, X(0.87), y - R(0.05), R(0.055), s, t);
  }
}

function drawChick(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PipeState, t: number) {
  const happy = s.chick === 'happy' && t >= s.chickT, sad = s.chick === 'sad', age = t - s.chickT;
  const hop = happy ? Math.abs(Math.sin(age * 0.25)) * u * 0.5 * Math.max(0, 1 - age / 60) : Math.abs(Math.sin(t * 0.02)) < 0.05 ? u * 0.08 : 0;
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.fillStyle = '#ffd93a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.45, u * 0.5, u * 0.45, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffe98a';
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.6, u * 0.22, u * 0.15, -0.4, 0, TAU);
  ctx.fill();
  // 날개
  const fl = happy ? Math.sin(age * 0.8) * 0.6 : 0;
  ctx.fillStyle = '#f2c020';
  ctx.save();
  ctx.translate(u * 0.32, -u * 0.42);
  ctx.rotate(-0.4 - fl);
  ctx.beginPath();
  ctx.ellipse(u * 0.1, 0, u * 0.22, u * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 눈 · 부리
  ctx.fillStyle = '#2a1a0a';
  if (happy) {
    ctx.strokeStyle = '#2a1a0a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-u * 0.18, -u * 0.55, u * 0.07, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-u * 0.18, -u * (sad ? 0.5 : 0.56), u * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ff8a2a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.42, -u * 0.48);
  ctx.lineTo(-u * 0.62, -u * (happy ? 0.52 : 0.44));
  ctx.lineTo(-u * 0.4, -u * 0.38);
  ctx.fill();
  ctx.strokeStyle = '#ff8a2a';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-u * 0.1, -u * 0.02);
  ctx.lineTo(-u * 0.1, u * 0.08);
  ctx.moveTo(u * 0.1, -u * 0.02);
  ctx.lineTo(u * 0.1, u * 0.08);
  ctx.stroke();
  ctx.restore();
}

// ═════════ 판: 흙 덩이 · 칸 · 관 · 물 ═════════
function drawBoard(ctx: CanvasRenderingContext2D, s: PipeState, B: BG, X: F, Y: F, R: F, t: number) {
  const L = s.L, S = s.S, Fl = s.F, pad = R(0.022), th = R(0.05);
  const bx = B.x0 - pad, by = B.y0 - pad * SQ, bw = B.W + pad * 2, bh = B.H + pad * 2 * SQ;
  void X;
  void Y;
  // 땅 그림자
  ctx.fillStyle = 'rgba(20,30,0,.35)';
  ctx.beginPath();
  ctx.ellipse(bx + bw / 2, by + bh + th + R(0.012), bw * 0.56, R(0.03), 0, 0, TAU);
  ctx.fill();
  // 앞면 (흙켜 단면)
  {
    const fy = by + bh - R(0.01);
    const fg = ctx.createLinearGradient(0, fy, 0, fy + th);
    fg.addColorStop(0, '#7a4a26');
    fg.addColorStop(0.35, '#6a3e1e');
    fg.addColorStop(0.36, '#8f6036');
    fg.addColorStop(0.7, '#7d5230');
    fg.addColorStop(0.71, '#5c3a20');
    fg.addColorStop(1, '#4a2c16');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.roundRect(bx, fy, bw, th + R(0.01), [0, 0, R(0.02), R(0.02)]);
    ctx.fill();
    for (let k = 0; k < 14; k++) {
      ctx.fillStyle = k % 3 ? 'rgba(160,150,140,.55)' : 'rgba(210,200,180,.5)';
      ctx.beginPath();
      ctx.ellipse(bx + hsh(k * 7) * bw, fy + R(0.012) + hsh(k * 11) * (th - R(0.012)), R(0.006 + hsh(k) * 0.006), R(0.004), 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(230,200,150,.35)';
    ctx.lineWidth = 1;
    for (let k = 0; k < 5; k++) {
      const x0 = bx + hsh(k * 13 + 2) * bw;
      ctx.beginPath();
      ctx.moveTo(x0, fy + R(0.004));
      ctx.quadraticCurveTo(x0 + R(0.01), fy + th * 0.5, x0 - R(0.006), fy + th * 0.9);
      ctx.stroke();
    }
    drawWorm(ctx, bx + bw * 0.78, fy + th * 0.55, R(0.05), s, t);
  }
  // 윗면 테두리 (풀 언저리)
  ctx.fillStyle = '#5f9e3c';
  ctx.beginPath();
  ctx.roundRect(bx - R(0.004), by - R(0.004), bw + R(0.008), bh + R(0.004), R(0.022));
  ctx.fill();
  ctx.fillStyle = '#7fc455';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh - R(0.006), R(0.02));
  ctx.fill();
  // 칸 바닥 (흙)
  for (let i = 0; i < L.n; i++) {
    const c = cpx(B, L, i), k = L.kind[i];
    const base = k === FIELD ? '#6e4a2a' : (i + Math.floor(i / L.w)) % 2 ? '#8d5c36' : '#976640';
    ctx.fillStyle = base;
    ctx.fillRect(c.x - B.cw / 2, c.y - B.ch / 2, B.cw + 0.5, B.ch + 0.5);
    ctx.fillStyle = 'rgba(255,230,190,.07)';
    ctx.fillRect(c.x - B.cw / 2, c.y - B.ch / 2, B.cw, R(0.004));
    for (let q = 0; q < 3; q++) {
      ctx.fillStyle = 'rgba(60,35,15,.35)';
      ctx.beginPath();
      ctx.arc(c.x + (hsh(i * 7 + q) - 0.5) * B.cw * 0.8, c.y + (hsh(i * 13 + q) - 0.5) * B.ch * 0.8, R(0.0025), 0, TAU);
      ctx.fill();
    }
  }
  // 이어진 이음매 (마른 관도 맞물리면 놋쇠 고리)
  const settled = (i: number) => Math.abs(s.ang[i] - s.tgt[i]) < 0.04;
  // 칸 내용 (위 줄부터 — 아래 줄이 앞이라 겹쳐 그린다)
  const wellRoof: number[] = [];
  for (let y = 0; y < L.h; y++) {
    for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x, k = L.kind[i], c = cpx(B, L, i);
      if (k === PIPE) drawPipe(ctx, s, i, c.x, c.y, B, R);
      else if (k === FIELD) drawField(ctx, s, i, c.x, c.y, B, R, t);
      else if (k === SRC) (drawWell(ctx, s, i, c.x, c.y, B, R, t), wellRoof.push(i));
      else if (k === NEST) drawNest(ctx, s, i, c.x, c.y, B, R, t);
      else if (k === ROCK) drawBoulder(ctx, c.x, c.y, B, R, i);
      else drawDirt(ctx, c.x, c.y, B, R, i, t);
    }
    // 이 줄과 아랫줄 사이 이음매
    for (let x = 0; x < L.w; x++) {
      const i = y * L.w + x;
      for (const dd of [1, 2]) {
        const j = L.nbr[i * 4 + dd];
        if (j < 0 || !settled(i) || !settled(j)) continue;
        if ((L.kind[i] !== PIPE && L.kind[i] !== SRC) || (L.kind[j] !== PIPE && L.kind[j] !== SRC)) continue;
        if (!((maskOf(L, S.rot, i) >> dd) & 1) || !((maskOf(L, S.rot, j) >> opp(dd)) & 1)) continue;
        const c = cpx(B, L, i), ex = c.x + DX[dd] * B.cw * 0.5, ey = c.y + DY[dd] * B.ch * 0.5, wet = Fl.wet[i] && Fl.wet[j];
        ctx.fillStyle = wet ? '#ffe08a' : '#d4a64a';
        ctx.strokeStyle = '#6a4416';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (dd === 1) ctx.roundRect(ex - R(0.006), ey - B.cw * 0.2 * SQ, R(0.012), B.cw * 0.4 * SQ, R(0.004));
        else ctx.roundRect(ex - B.cw * 0.2, ey - R(0.006), B.cw * 0.4, R(0.012), R(0.004));
        ctx.fill();
        ctx.stroke();
      }
    }
  }
  // 톱니 짝: 맞닿은 곳에 놋쇠 톱니
  for (let i = 0; i < L.n; i++) {
    const g = L.gear[i];
    if (g < i) continue;
    const a = cpx(B, L, i), b = cpx(B, L, g);
    drawGear(ctx, (a.x + b.x) / 2, (a.y + b.y) / 2, B.cw * 0.2, s.ang[i] * (Math.PI / 2), t);
  }
  // 새는 곳: 물보라 · 물이 모자라 멈춘 곳: 뚝뚝
  for (const q of Fl.leak) {
    const i = q >> 2, dd = q & 3;
    if (!Fl.wet[i] || !settled(i) || s.wetT[i] < 0 || t < s.wetT[i]) continue;
    const c = cpx(B, L, i);
    drawSpray(ctx, c.x + DX[dd] * B.cw * 0.47, c.y + DY[dd] * B.ch * 0.47, DX[dd], DY[dd] * SQ, B.cw, waterOf(Fl.wet[i]), t, i * 4 + dd);
  }
  for (const q of Fl.dry) {
    const i = q >> 2, dd = q & 3, c = cpx(B, L, i);
    if (!settled(i)) continue;
    const ph = (t * 0.03 + i * 0.3) % 1, ex = c.x + DX[dd] * B.cw * 0.42, ey = c.y + DY[dd] * B.ch * 0.42;
    ctx.fillStyle = waterOf(Fl.wet[i]);
    ctx.globalAlpha = 1 - ph;
    ctx.beginPath();
    ctx.ellipse(ex, ey + ph * R(0.02), R(0.006), R(0.009), 0, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // 우물 지붕 (판 위로 솟는다 — 맨 나중에)
  for (const i of wellRoof) if (Math.floor(i / L.w) === 0) drawWellRoof(ctx, s, i, cpx(B, L, i).x, cpx(B, L, i).y, B, R, t);
  // 누르고 있으면: 한 번 더 돌릴 때 미리 보기
  drawPreview(ctx, s, B, R, t);
}

/** 관 하나 (cx,cy = 칸 가운데 px). 관과 고랑은 같이 돈다 */
function drawPipe(ctx: CanvasRenderingContext2D, s: PipeState, i: number, cx: number, cy: number, B: BG, R: F) {
  const L = s.L, Fl = s.F, cw = B.cw, r = cw / 2, m0 = L.base[i];
  const ang = s.ang[i] * (Math.PI / 2), fixed = L.fixed[i] === 1, gear = L.gear[i] >= 0, locked = L.lock[i] === 1 && !s.S.unl[i];
  const wetBits = Fl.wet[i], wq = wetBits && s.wetT[i] >= 0 ? cl01((s.t - s.wetT[i]) / 6) : 0;
  const bump = s.bump[i] > 0 ? Math.sin(s.bump[i] * 14) * 0.08 * s.bump[i] : 0;
  const isGate = L.srcs.some((q) => [0, 1, 2, 3].some((dd) => (L.base[q] >> dd) & 1 && L.nbr[q * 4 + dd] === i));
  // 바위 관: 돌 판
  if (fixed) {
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.86, cy - r * 0.86 * SQ + R(0.006), r * 1.72, r * 1.72 * SQ, R(0.012));
    ctx.fill();
    const sg = ctx.createLinearGradient(cx - r, cy - r * SQ, cx + r, cy + r * SQ);
    sg.addColorStop(0, '#b8b4ac');
    sg.addColorStop(1, '#7c776e');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.roundRect(cx - r * 0.86, cy - r * 0.86 * SQ, r * 1.72, r * 1.72 * SQ, R(0.012));
    ctx.fill();
    ctx.strokeStyle = 'rgba(60,55,50,.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.6, cy - r * 0.5 * SQ);
    ctx.lineTo(cx - r * 0.3, cy - r * 0.2 * SQ);
    ctx.lineTo(cx - r * 0.42, cy + r * 0.3 * SQ);
    ctx.moveTo(cx + r * 0.5, cy + r * 0.6 * SQ);
    ctx.lineTo(cx + r * 0.25, cy + r * 0.35 * SQ);
    ctx.stroke();
  }
  const local = (dy: number, f: () => void) => {
    ctx.save();
    ctx.translate(cx, cy + dy);
    ctx.scale(1, SQ);
    ctx.rotate(ang + bump);
    f();
    ctx.restore();
  };
  const arms = (lw: number, col: string, from = 0, to = 1) => {
    ctx.strokeStyle = col;
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let dd = 0; dd < 4; dd++) {
      if (!((m0 >> dd) & 1)) continue;
      ctx.moveTo(DX[dd] * r * from, DY[dd] * r * from);
      ctx.lineTo(DX[dd] * r * to, DY[dd] * r * to);
    }
    ctx.stroke();
  };
  ctx.lineCap = 'butt';
  const lw0 = cw * 0.26;
  /** 팔 + 가운데 둥근 이음 (ㄱ자도 매끈하게) */
  const tube = (lw: number, col: string, to = 1) => {
    arms(lw, col, 0, to);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, lw / 2, 0, TAU);
    ctx.fill();
  };
  // 고랑
  if (!fixed) local(0, () => tube(cw * 0.4, 'rgba(45,24,10,.5)', 0.99));
  // 그림자 · 관 몸통 · 빛
  local(R(0.008), () => tube(lw0 + 2, 'rgba(25,10,0,.45)'));
  local(0, () => {
    tube(lw0 + 3, '#6a3416');
    tube(lw0, fixed ? '#c08a5e' : PIPE_C);
    // 안쪽 물길 (마른 관은 어두운 홈)
    tube(cw * 0.11, DRY_IN, 1);
    if (wq > 0) {
      ctx.globalAlpha = wq;
      tube(cw * 0.12, waterOf(wetBits), 1);
      ctx.setLineDash([cw * 0.07, cw * 0.11]);
      ctx.lineDashOffset = -s.t * 0.9;
      arms(cw * 0.04, waterLOf(wetBits), 0.1, 0.99);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
    // 이음 테 (칸 끝): 몸통보다 살짝 굵은 고리
    for (let dd = 0; dd < 4; dd++) {
      if (!((m0 >> dd) & 1)) continue;
      const seg = (lw: number, col: string, a0: number, a1: number) => {
        ctx.strokeStyle = col;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(DX[dd] * r * a0, DY[dd] * r * a0);
        ctx.lineTo(DX[dd] * r * a1, DY[dd] * r * a1);
        ctx.stroke();
      };
      seg(lw0 + 6, '#6a3416', 0.82, 0.97);
      seg(lw0 + 3, shade(PIPE_C, 0.18), 0.83, 0.96);
      seg(cw * 0.12, wq > 0 ? waterOf(wetBits) : DRY_IN, 0.8, 1);
    }
    // 위쪽 빛 (원통 느낌)
    ctx.globalAlpha = 0.5;
    ctx.save();
    ctx.translate(-lw0 * 0.22, -lw0 * 0.22);
    arms(cw * 0.035, PIPE_L, 0.25, 0.78);
    ctx.restore();
    ctx.globalAlpha = 1;
    if (gear) {
      const hr = lw0 * 0.75;
      ctx.fillStyle = '#d9b040';
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, rr = k % 2 ? hr * 1.25 : hr;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7a5a12';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = wq > 0 ? waterOf(wetBits) : DRY_IN;
      ctx.beginPath();
      ctx.arc(0, 0, cw * 0.06, 0, TAU);
      ctx.fill();
    } else if (popc(m0) >= 3) {
      // T자·십자: 가운데 이음통 볼트
      ctx.strokeStyle = '#6a3416';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, lw0 * 0.62, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#6a3416';
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * lw0 * 0.62, Math.sin(a) * lw0 * 0.62, 1.4, 0, TAU);
        ctx.fill();
      }
    }
    if (wq > 0) {
      ctx.fillStyle = waterLOf(wetBits);
      ctx.globalAlpha = wq * (0.5 + 0.4 * Math.sin(s.t * 0.2 + i));
      ctx.beginPath();
      ctx.arc(-cw * 0.015, -cw * 0.015, cw * 0.025, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  });
  // 물이 막 든 순간 반짝
  if (wetBits && s.wetT[i] >= 0 && s.t - s.wetT[i] >= 0 && s.t - s.wetT[i] < 10) {
    const q = (s.t - s.wetT[i]) / 10;
    ctx.fillStyle = `rgba(220,245,255,${0.55 * (1 - q)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * (0.4 + q * 0.5), r * (0.4 + q * 0.5) * SQ, 0, 0, TAU);
    ctx.fill();
  }
  // 수문 관: 빨간 밸브 손잡이
  if (isGate && !gear) {
    ctx.save();
    ctx.translate(cx + r * 0.42, cy - r * 0.4 * SQ);
    ctx.rotate(ang * 0.5);
    ctx.strokeStyle = '#d8332a';
    ctx.lineWidth = Math.max(2, cw * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, cw * 0.1, 0, TAU);
    ctx.moveTo(-cw * 0.1, 0);
    ctx.lineTo(cw * 0.1, 0);
    ctx.moveTo(0, -cw * 0.1);
    ctx.lineTo(0, cw * 0.1);
    ctx.stroke();
    ctx.fillStyle = '#ff6a5a';
    ctx.beginPath();
    ctx.arc(0, 0, cw * 0.035, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  // 바위 관: 돌 쐐기
  if (fixed) {
    for (const [dx, dy] of [[-0.42, -0.42], [0.42, 0.42], [0.42, -0.42], [-0.42, 0.42]]) {
      ctx.fillStyle = '#9a958c';
      ctx.beginPath();
      ctx.ellipse(cx + dx * r * 1.3, cy + dy * r * 1.3 * SQ, r * 0.2, r * 0.16, 0.3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.25)';
      ctx.beginPath();
      ctx.ellipse(cx + dx * r * 1.3 - r * 0.05, cy + dy * r * 1.3 * SQ - r * 0.05, r * 0.08, r * 0.05, 0.3, 0, TAU);
      ctx.fill();
    }
  }
  // 뿌리 잠금: 감긴 뿌리 + 잎 (풀리면 오그라들며 사라짐)
  const ut = s.unlT[i];
  if (L.lock[i] && (locked || (ut >= 0 && s.t < ut + 26))) {
    const q = locked ? (s.t < ut ? 0 : 0) : cl01((s.t - ut) / 26);
    ctx.save();
    ctx.globalAlpha = 1 - q;
    ctx.translate(cx, cy);
    ctx.scale(1 - q * 0.4, (1 - q * 0.4) * SQ);
    ctx.strokeStyle = '#6a4a22';
    ctx.lineWidth = Math.max(2, cw * 0.06);
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k++) {
      const a0 = k * 2.1 + 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a0) * r * 0.95, Math.sin(a0) * r * 0.95);
      ctx.bezierCurveTo(Math.cos(a0 + 1.2) * r * 0.2, Math.sin(a0 + 1.2) * r * 0.2, Math.cos(a0 + 2.4) * r * 0.5, Math.sin(a0 + 2.4) * r * 0.5, Math.cos(a0 + 3.1) * r * 0.9, Math.sin(a0 + 3.1) * r * 0.9);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    for (let k = 0; k < 4; k++) {
      const a0 = k * 1.6 + 0.7, lx = Math.cos(a0) * r * 0.55, ly = Math.sin(a0) * r * 0.55;
      ctx.fillStyle = k % 2 ? '#5fb83a' : '#7ad04a';
      ctx.beginPath();
      ctx.ellipse(lx, ly, r * 0.17, r * 0.08, a0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    if (locked) {
      ctx.font = `${Math.max(12, cw * 0.28)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('🔒', cx + r * 0.55, cy - r * 0.55 * SQ);
    }
  }
}

function drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number, t: number) {
  void t;
  ctx.save();
  ctx.translate(x, y + 2);
  ctx.scale(1, SQ);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 1.2, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, SQ);
  ctx.rotate(a);
  ctx.fillStyle = '#e0b84a';
  ctx.beginPath();
  for (let k = 0; k < 20; k++) {
    const q = (k / 20) * TAU, rr = k % 2 ? r * 1.2 : r * 0.95;
    ctx.lineTo(Math.cos(q) * rr, Math.sin(q) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#7a5a12';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.fillStyle = '#b48a26';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff0b0';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5a400c';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSpray(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, cw: number, col: string, t: number, k: number) {
  // 물안개
  ctx.fillStyle = 'rgba(200,235,255,.35)';
  ctx.beginPath();
  ctx.ellipse(x + dx * cw * 0.15, y + dy * cw * 0.15, cw * 0.16, cw * 0.1, 0, 0, TAU);
  ctx.fill();
  for (let q = 0; q < 6; q++) {
    const ph = (t * 0.045 + q / 6 + hsh(k) * 0.3) % 1, spread = (hsh(q * 7 + k) - 0.5) * 0.9;
    const px = x + (dx * (0.15 + ph * 0.35) - dy * spread * ph * 0.3) * cw;
    const py = y + (dy * (0.15 + ph * 0.35) + dx * spread * ph * 0.3) * cw - Math.sin(ph * Math.PI) * cw * 0.18;
    ctx.globalAlpha = 1 - ph * 0.8;
    ctx.fillStyle = q % 2 ? col : '#e8f7ff';
    ctx.beginPath();
    ctx.arc(px, py, cw * (0.035 - ph * 0.015), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** 밭: 돋운 이랑 + 작물 (물이 닿으면 새싹이 퐁 → 자란다) */
function drawField(ctx: CanvasRenderingContext2D, s: PipeState, i: number, cx: number, cy: number, B: BG, R: F, t: number) {
  const L = s.L, cw = B.cw, ch = B.ch, k = L.fields.indexOf(i), sat = s.F.sat[k], wet = s.F.wet[i];
  const st = s.sproutT[i], grown = st >= 0 && t >= st, age = grown ? t - st : 0;
  const bw = cw * 0.84, bh = ch * 0.78, lift = R(0.008);
  // 이랑 옆면 + 윗면
  ctx.fillStyle = '#4a2e16';
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2 + lift, bw, bh, R(0.012));
  ctx.fill();
  const top = wet && sat ? '#5a3a1e' : '#7a5230';
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.roundRect(cx - bw / 2, cy - bh / 2 - lift, bw, bh, R(0.012));
  ctx.fill();
  ctx.strokeStyle = '#6cb043';
  ctx.lineWidth = Math.max(2, cw * 0.05);
  ctx.stroke();
  // 고랑 줄
  ctx.strokeStyle = 'rgba(40,20,5,.45)';
  ctx.lineWidth = 1.5;
  for (let q = 1; q <= 2; q++) {
    const yy = cy - bh / 2 - lift + (bh * q) / 3;
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.4, yy);
    ctx.lineTo(cx + bw * 0.4, yy);
    ctx.stroke();
  }
  if (wet && sat) {
    ctx.fillStyle = `rgba(120,200,255,${0.18 + 0.08 * Math.sin(t * 0.08 + i)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bw * 0.38, bh * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  // 두 우물 판: 깃발
  if (L.colors > 1) {
    const fx0 = cx - bw * 0.36, fy0 = cy - bh * 0.15;
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fx0, fy0);
    ctx.lineTo(fx0, fy0 - cw * 0.42);
    ctx.stroke();
    const wv = Math.sin(t * 0.12 + i) * cw * 0.03;
    ctx.fillStyle = L.col[i] ? '#ffbf2e' : '#3fb4ff';
    ctx.beginPath();
    ctx.moveTo(fx0, fy0 - cw * 0.42);
    ctx.quadraticCurveTo(fx0 + cw * 0.14, fy0 - cw * 0.38 + wv, fx0 + cw * 0.26, fy0 - cw * 0.34);
    ctx.lineTo(fx0, fy0 - cw * 0.24);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 작물
  const emo = CROPS[k % CROPS.length];
  if (grown) {
    const sc = popS(age / 22) * (1 + Math.min(0.18, age / 900)), wilt = sat ? 0 : 0.5;
    ctx.save();
    ctx.translate(cx, cy + ch * 0.12);
    ctx.rotate(wilt * 0.5 + Math.sin(t * 0.05 + i) * 0.04);
    ctx.font = `${Math.max(14, cw * 0.56 * sc)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    if (wilt) ctx.globalAlpha = 0.65;
    ctx.fillText(age < 14 ? '🌱' : emo, 0, 0);
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    // 마른 싹 + 희미한 작물 그림자 (무엇이 자랄지)
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.font = `${Math.max(14, cw * 0.48)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emo, cx, cy + ch * 0.12);
    ctx.restore();
    ctx.strokeStyle = '#9a7a3a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy + ch * 0.12);
    ctx.quadraticCurveTo(cx + cw * 0.02, cy, cx + cw * 0.08, cy + ch * 0.02);
    ctx.stroke();
    // 목마름 물방울 표시
    const bob = Math.sin(t * 0.1 + i) * R(0.004);
    ctx.font = `${Math.max(12, cw * 0.22)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillText(L.colors > 1 && L.col[i] ? '🍯' : '💧', cx + bw * 0.32, cy - bh * 0.3 + bob);
    ctx.globalAlpha = 1;
  }
}

function drawWell(ctx: CanvasRenderingContext2D, s: PipeState, i: number, cx: number, cy: number, B: BG, R: F, t: number) {
  const L = s.L, cw = B.cw, r = cw / 2, hon = L.col[i] === 1, m = L.base[i];
  // 물 나가는 관 토막
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, SQ);
  for (let dd = 0; dd < 4; dd++) {
    if (!((m >> dd) & 1)) continue;
    ctx.strokeStyle = '#6e6a62';
    ctx.lineWidth = cw * 0.36;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(DX[dd] * r, DY[dd] * r);
    ctx.stroke();
    ctx.strokeStyle = WATER[hon ? 1 : 0];
    ctx.lineWidth = cw * 0.14;
    ctx.stroke();
    ctx.setLineDash([cw * 0.07, cw * 0.1]);
    ctx.lineDashOffset = -t * 0.9;
    ctx.strokeStyle = WATERL[hon ? 1 : 0];
    ctx.lineWidth = cw * 0.05;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
  // 돌 둘레
  const rr = r * 0.78;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.01), rr * 1.05, rr * SQ * 1.0, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#8f8a80';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.006), rr, rr * SQ * 0.95, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#b6b0a4';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rr, rr * SQ * 0.9, 0, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU;
    ctx.strokeStyle = 'rgba(90,85,78,.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * rr * 0.62, cy + Math.sin(a) * rr * 0.62 * SQ * 0.9);
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * SQ * 0.9);
    ctx.stroke();
  }
  // 물 (출렁)
  const wg = ctx.createRadialGradient(cx - rr * 0.2, cy - rr * 0.2 * SQ, rr * 0.05, cx, cy, rr * 0.62);
  wg.addColorStop(0, WATERL[hon ? 1 : 0]);
  wg.addColorStop(1, WATER[hon ? 1 : 0]);
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rr * 0.6, rr * 0.6 * SQ * 0.9, 0, 0, TAU);
  ctx.fill();
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.02 + k * 0.5) % 1;
    ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - ph)})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rr * 0.55 * ph, rr * 0.55 * ph * SQ * 0.9, 0, 0, TAU);
    ctx.stroke();
  }
  // 퐁퐁 솟는 물방울
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.035 + k / 3) % 1;
    ctx.fillStyle = hon ? `rgba(255,225,120,${1 - ph})` : `rgba(200,240,255,${1 - ph})`;
    ctx.beginPath();
    ctx.arc(cx + Math.sin(k * 2.3) * rr * 0.25, cy - ph * R(0.03), R(0.004), 0, TAU);
    ctx.fill();
  }
  if (hon) {
    // 꿀벌
    const bx = cx + Math.cos(t * 0.06) * rr * 1.1, by = cy - rr * 0.8 + Math.sin(t * 0.13) * rr * 0.3;
    ctx.font = `${Math.max(12, cw * 0.26)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🐝', bx, by);
  }
  // 물 한 동이: 남은 칸 (우물 왼쪽 위 딱지)
  if (L.cap) {
    const used = s.F.wet.filter((x, j) => x && L.kind[j] === PIPE).length, left = Math.max(0, L.cap - used);
    const txt = `🪣 물 ${left}칸`, tx = cx - r * 1.05, ty = cy - r * 1.25;
    ctx.font = `800 ${Math.max(13, R(0.034))}px system-ui`;
    const tw = ctx.measureText(txt).width + R(0.03);
    ctx.fillStyle = left ? 'rgba(20,60,100,.9)' : 'rgba(120,40,30,.92)';
    ctx.beginPath();
    ctx.roundRect(tx - tw, ty - R(0.024), tw, R(0.048), R(0.024));
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, tx - R(0.015), ty + 1);
  }
}

function drawWellRoof(ctx: CanvasRenderingContext2D, s: PipeState, i: number, cx: number, cy: number, B: BG, R: F, t: number) {
  const r = B.cw / 2, hon = s.L.col[i] === 1, sway = Math.sin(t * 0.04) * 0.04;
  void R;
  // 기둥
  ctx.fillStyle = '#7a4e26';
  ctx.fillRect(cx - r * 0.78, cy - r * 1.35, r * 0.1, r * 1.25);
  ctx.fillRect(cx + r * 0.68, cy - r * 1.35, r * 0.1, r * 1.25);
  // 도르래 줄 · 두레박
  ctx.strokeStyle = '#d8c090';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy - r * 1.25);
  ctx.lineTo(cx + sway * r * 3, cy - r * 0.62);
  ctx.stroke();
  ctx.fillStyle = '#9a6a3a';
  ctx.beginPath();
  ctx.roundRect(cx - r * 0.14 + sway * r * 3, cy - r * 0.64, r * 0.28, r * 0.22, 2);
  ctx.fill();
  ctx.fillStyle = WATER[hon ? 1 : 0];
  ctx.fillRect(cx - r * 0.11 + sway * r * 3, cy - r * 0.62, r * 0.22, r * 0.05);
  // 지붕
  const rg = ctx.createLinearGradient(cx, cy - r * 1.75, cx, cy - r * 1.25);
  rg.addColorStop(0, '#d0563a');
  rg.addColorStop(1, '#9a3424');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.0, cy - r * 1.25);
  ctx.lineTo(cx, cy - r * 1.78);
  ctx.lineTo(cx + r * 1.0, cy - r * 1.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6a2014';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.85, cy - r * 1.28);
  ctx.lineTo(cx, cy - r * 1.7);
  ctx.lineTo(cx - r * 0.1, cy - r * 1.28);
  ctx.fill();
  ctx.font = `800 ${Math.max(12, r * 0.42)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hon ? '🍯' : '💧', cx, cy - r * 1.42);
}

function drawNest(ctx: CanvasRenderingContext2D, s: PipeState, i: number, cx: number, cy: number, B: BG, R: F, t: number) {
  const cw = B.cw, r = cw / 2, flood = s.F.flood.includes(i);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + R(0.008), r * 0.8, r * 0.5 * SQ, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.5, r * 0.05, cx, cy - r * 0.1, r * 0.8);
  g.addColorStop(0, '#c08a52');
  g.addColorStop(1, '#7a4c24');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.78, cy + r * 0.25);
  ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.75, cx, cy - r * 0.72);
  ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.75, cx + r * 0.78, cy + r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a160a';
  ctx.beginPath();
  ctx.ellipse(cx, cy - r * 0.6, r * 0.13, r * 0.07, 0, 0, TAU);
  ctx.fill();
  if (flood) {
    ctx.fillStyle = `rgba(90,180,255,${0.6 + 0.15 * Math.sin(t * 0.2)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.1, r * 0.75, r * 0.35 * SQ, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,80,60,${0.6 + 0.4 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.1, r * 0.95, r * 0.85 * SQ, 0, 0, TAU);
    ctx.stroke();
  }
  // 개미 (물이 들면 알을 이고 사방으로)
  for (let k = 0; k < 5; k++) {
    let ax: number, ay: number;
    if (flood) {
      const ph = (t * 0.02 + k / 5) % 1, a = k * 1.3 + 0.4;
      ax = cx + Math.cos(a) * r * (0.3 + ph * 0.8);
      ay = cy + Math.sin(a) * r * (0.3 + ph * 0.8) * SQ - Math.abs(Math.sin(t * 0.5 + k)) * 2;
    } else {
      const a = t * 0.03 + (k / 5) * TAU;
      ax = cx + Math.cos(a) * r * 0.62;
      ay = cy + r * 0.1 + Math.sin(a) * r * 0.3 * SQ;
    }
    ctx.fillStyle = '#1a0d06';
    ctx.beginPath();
    ctx.arc(ax, ay, Math.max(1.3, cw * 0.025), 0, TAU);
    ctx.arc(ax + cw * 0.035, ay, Math.max(1.1, cw * 0.02), 0, TAU);
    ctx.fill();
    if (flood) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ax, ay - cw * 0.04, Math.max(1.2, cw * 0.022), 0, TAU);
      ctx.fill();
    }
  }
  if (flood) {
    ctx.font = `900 ${Math.max(13, cw * 0.3)}px system-ui`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff5a4a';
    ctx.fillText('!', cx + r * 0.6, cy - r * 0.8 + Math.sin(t * 0.3) * 2);
  }
}

function drawBoulder(ctx: CanvasRenderingContext2D, cx: number, cy: number, B: BG, R: F, i: number) {
  const r = B.cw / 2;
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.ellipse(cx, cy + r * 0.3, r * 0.75, r * 0.32, 0, 0, TAU);
  ctx.fill();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.5, r * 0.1, cx, cy - r * 0.1, r * 0.9);
  g.addColorStop(0, '#d4d0c6');
  g.addColorStop(1, '#7a756c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.72, cy + r * 0.3);
  ctx.quadraticCurveTo(cx - r * 0.8, cy - r * 0.5, cx - r * 0.1, cy - r * 0.68);
  ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 0.62, cx + r * 0.74, cy + r * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6fae48';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.15, cy - r * 0.6, r * 0.32, r * 0.1, -0.2, 0, TAU);
  ctx.fill();
  void R;
  void i;
}

function drawDirt(ctx: CanvasRenderingContext2D, cx: number, cy: number, B: BG, R: F, i: number, t: number) {
  const r = B.cw / 2, h = hsh(i * 3.7);
  if (h < 0.4) {
    // 풀 포기
    const sw = Math.sin(t * 0.05 + i) * r * 0.05;
    ctx.strokeStyle = '#5fa63a';
    ctx.lineWidth = 2;
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(cx + k * r * 0.08, cy + r * 0.2);
      ctx.quadraticCurveTo(cx + k * r * 0.15, cy - r * 0.1, cx + k * r * 0.22 + sw, cy - r * 0.3);
      ctx.stroke();
    }
  } else if (h < 0.6) {
    // 조약돌
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k % 2 ? '#a8a296' : '#c4beb2';
      ctx.beginPath();
      ctx.ellipse(cx + (hsh(i + k) - 0.5) * r, cy + (hsh(i * 2 + k) - 0.5) * r * 0.6, r * 0.12, r * 0.08, 0, 0, TAU);
      ctx.fill();
    }
  } else if (h < 0.75) {
    // 버섯
    ctx.fillStyle = '#f4ead8';
    ctx.fillRect(cx - r * 0.04, cy - r * 0.15, r * 0.08, r * 0.2);
    ctx.fillStyle = '#e0483a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - r * 0.16, r * 0.18, r * 0.12, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.06, cy - r * 0.2, r * 0.03, 0, TAU);
    ctx.arc(cx + r * 0.07, cy - r * 0.22, r * 0.025, 0, TAU);
    ctx.fill();
  } else {
    // 꽃
    ctx.strokeStyle = '#5fa63a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.15);
    ctx.lineTo(cx, cy - r * 0.2);
    ctx.stroke();
    ctx.fillStyle = ['#ffd6e8', '#fff2a0', '#d8e8ff'][i % 3];
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * TAU;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r * 0.09, cy - r * 0.22 + Math.sin(a) * r * 0.09, r * 0.07, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.arc(cx, cy - r * 0.22, r * 0.05, 0, TAU);
    ctx.fill();
  }
  void R;
}

function drawWorm(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PipeState, t: number) {
  const age = t - s.wormT, hit = s.wormT >= 0 && age >= 0 && age < 70;
  const out = hit ? (age < 8 ? 1 : Math.max(0, 1 - (age - 8) / 30)) : 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.015));
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#3a2210';
  ctx.beginPath();
  ctx.ellipse(0, u * 0.1, u * 0.22, u * 0.1, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.rect(-u * 0.4, -u * 1.2, u * 0.8, u * 1.3);
  ctx.clip();
  const ty = u * 0.1 - out * u * 0.7, wig = Math.sin(t * 0.15) * u * 0.06 * (hit ? 3 : 1);
  ctx.strokeStyle = '#f08aa0';
  ctx.lineWidth = u * 0.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, u * 0.3);
  ctx.quadraticCurveTo(wig, (u * 0.3 + ty) / 2, wig * 0.5, ty);
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#1a0a05';
  ctx.beginPath();
  ctx.arc(wig * 0.5 - u * 0.04, ty - u * 0.02, u * 0.025, 0, TAU);
  ctx.arc(wig * 0.5 + u * 0.04, ty - u * 0.02, u * 0.025, 0, TAU);
  ctx.fill();
  if (hit && age < 40) {
    for (let k = 0; k < 4; k++) {
      ctx.fillStyle = '#9fe0ff';
      ctx.beginPath();
      ctx.arc(wig * 0.5 + (k - 1.5) * u * 0.12, ty - u * 0.2 - ((age + k * 5) % 20) * u * 0.02, u * 0.035, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** 누르고 있는 관: 한 번 더 돌리면 물이 새로 닿는 칸(반짝 +)과 끊기는 칸(✕), 다음 모양 그림자 */
function drawPreview(ctx: CanvasRenderingContext2D, s: PipeState, B: BG, R: F, t: number) {
  const i = s.press;
  if (i < 0 || !s.down || s.phase !== 'play' || t - s.pressT < 12 || !canTurn(s.L, s.S, i)) return;
  const L = s.L, rot = s.S.rot.slice();
  rot[i] = (rot[i] + 1) & 3;
  if (L.gear[i] >= 0) rot[L.gear[i]] = (rot[L.gear[i]] + 1) & 3;
  const F2 = flow(L, rot), F = s.F;
  let gain = 0;
  for (let j = 0; j < L.n; j++) {
    const c = cpx(B, L, j);
    if (F2.wet[j] && !F.wet[j]) {
      gain++;
      ctx.fillStyle = `rgba(140,230,255,${0.35 + 0.2 * Math.sin(t * 0.3 + j)})`;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, B.cw * 0.4, B.ch * 0.4, 0, 0, TAU);
      ctx.fill();
      ctx.font = `900 ${Math.max(13, B.cw * 0.28)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(L.kind[j] === FIELD ? '🌱' : '+', c.x, c.y);
    } else if (F.wet[j] && !F2.wet[j]) {
      ctx.strokeStyle = 'rgba(255,90,70,.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c.x - B.cw * 0.18, c.y - B.ch * 0.18);
      ctx.lineTo(c.x + B.cw * 0.18, c.y + B.ch * 0.18);
      ctx.moveTo(c.x + B.cw * 0.18, c.y - B.ch * 0.18);
      ctx.lineTo(c.x - B.cw * 0.18, c.y + B.ch * 0.18);
      ctx.stroke();
    }
  }
  // 다음 모양 (점선)
  for (const j of L.gear[i] >= 0 ? [i, L.gear[i]] : [i]) {
    const c = cpx(B, L, j), m = rotm(L.base[j], rot[j]);
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(1, SQ);
    ctx.strokeStyle = 'rgba(255,255,255,.9)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.lineDashOffset = -t * 0.5;
    ctx.beginPath();
    for (let dd = 0; dd < 4; dd++) if ((m >> dd) & 1) (ctx.moveTo(0, 0), ctx.lineTo(DX[dd] * B.cw * 0.48, DY[dd] * B.cw * 0.48));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  const c = cpx(B, L, i), lbl = gain ? `한 번 더 톡 → 💧 +${gain}칸` : '한 번 더 톡해도 물은 그대로';
  ctx.font = `800 ${Math.max(12, R(0.032))}px system-ui`;
  const tw = ctx.measureText(lbl).width + R(0.04), ly = c.y - B.ch * 0.9, lx = Math.max(tw / 2 + 4, Math.min(R(1) - tw / 2 - 4, c.x));
  ctx.fillStyle = 'rgba(20,40,60,.88)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.024), tw, R(0.048), R(0.024));
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8f8ff';
  ctx.fillText(lbl, lx, ly + 1);
}

// ═════════ 두더지 농부 ═════════
function drawMole(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, s: PipeState, t: number) {
  const m = s.mood, age = t - s.moodT;
  const proud = m === 'proud', dizzy = m === 'dizzy', wow = m === 'wow', oops = m === 'oops' || m === 'panic', worry = m === 'worry', huh = m === 'huh';
  const fur = '#6b5242', fur2 = '#8a6c58', belly = '#c9a88a';
  const jump = proud ? Math.abs(Math.sin(age * 0.2)) * u * 0.12 * Math.max(0, 1 - age / 80) : wow ? Math.max(0, Math.sin(Math.min(age, 12) / 12 * Math.PI)) * u * 0.08 : 0;
  const tilt = dizzy ? -0.9 * ease(age / 18) : huh ? 0.12 : 0;
  // 그림자
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath();
  ctx.ellipse(x, y, u * 0.42, u * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - jump);
  ctx.rotate(tilt);
  // 삽 (뒤)
  if (!dizzy) {
    ctx.save();
    ctx.translate(u * 0.36, -u * 0.2);
    ctx.rotate(0.2 + (wow ? Math.sin(age * 0.4) * 0.15 : 0));
    ctx.fillStyle = '#9a6a3a';
    ctx.fillRect(-u * 0.025, -u * 0.95, u * 0.05, u * 0.9);
    ctx.fillStyle = '#b8bcc4';
    ctx.beginPath();
    ctx.moveTo(-u * 0.1, -u * 0.02);
    ctx.lineTo(u * 0.1, -u * 0.02);
    ctx.quadraticCurveTo(u * 0.1, u * 0.18, 0, u * 0.22);
    ctx.quadraticCurveTo(-u * 0.1, u * 0.18, -u * 0.1, -u * 0.02);
    ctx.fill();
    ctx.restore();
  }
  // 몸 (멜빵바지)
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.36, u * 0.34, u * 0.38, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3d6fb0';
  ctx.beginPath();
  ctx.moveTo(-u * 0.3, -u * 0.3);
  ctx.lineTo(u * 0.3, -u * 0.3);
  ctx.quadraticCurveTo(u * 0.34, u * 0.0, 0, u * 0.02);
  ctx.quadraticCurveTo(-u * 0.34, 0, -u * 0.3, -u * 0.3);
  ctx.fill();
  ctx.fillStyle = '#2f5a94';
  ctx.fillRect(-u * 0.2, -u * 0.5, u * 0.06, u * 0.22);
  ctx.fillRect(u * 0.14, -u * 0.5, u * 0.06, u * 0.22);
  ctx.fillStyle = '#ffd36a';
  ctx.beginPath();
  ctx.arc(-u * 0.17, -u * 0.3, u * 0.025, 0, TAU);
  ctx.arc(u * 0.17, -u * 0.3, u * 0.025, 0, TAU);
  ctx.fill();
  // 발
  ctx.fillStyle = '#e8a8a0';
  ctx.beginPath();
  ctx.ellipse(-u * 0.16, u * 0.0, u * 0.11, u * 0.05, 0, 0, TAU);
  ctx.ellipse(u * 0.16, u * 0.0, u * 0.11, u * 0.05, 0, 0, TAU);
  ctx.fill();
  // 머리
  const hy = -u * 0.78;
  ctx.fillStyle = fur;
  ctx.beginPath();
  ctx.ellipse(0, hy, u * 0.3, u * 0.26, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = fur2;
  ctx.beginPath();
  ctx.ellipse(-u * 0.08, hy - u * 0.1, u * 0.14, u * 0.08, -0.3, 0, TAU);
  ctx.fill();
  // 주둥이 + 분홍 별코
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-u * 0.04, hy + u * 0.09, u * 0.16, u * 0.11, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff7a9a';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * TAU, rr = k % 2 ? u * 0.035 : u * 0.07;
    ctx.lineTo(-u * 0.06 + Math.cos(a) * rr, hy + u * 0.04 + Math.sin(a) * rr);
  }
  ctx.fill();
  // 눈
  ctx.fillStyle = '#1a0d06';
  ctx.strokeStyle = '#1a0d06';
  ctx.lineWidth = Math.max(1.5, u * 0.025);
  const ex = [-u * 0.16, u * 0.08], ey = hy - u * 0.05;
  const blink = Math.sin(t * 0.045) > 0.985;
  for (const e of ex) {
    if (dizzy) {
      ctx.beginPath();
      ctx.moveTo(e - u * 0.035, ey - u * 0.035);
      ctx.lineTo(e + u * 0.035, ey + u * 0.035);
      ctx.moveTo(e + u * 0.035, ey - u * 0.035);
      ctx.lineTo(e - u * 0.035, ey + u * 0.035);
      ctx.stroke();
    } else if (proud) {
      ctx.beginPath();
      ctx.arc(e, ey + u * 0.02, u * 0.04, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (wow || oops) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(e, ey, u * 0.055, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#1a0d06';
      ctx.beginPath();
      ctx.arc(e + u * 0.01, ey, u * 0.028, 0, TAU);
      ctx.fill();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(e - u * 0.03, ey);
      ctx.lineTo(e + u * 0.03, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(e, ey, u * 0.028, 0, TAU);
      ctx.fill();
    }
  }
  // 입
  ctx.strokeStyle = '#3a1a10';
  ctx.lineWidth = Math.max(1.4, u * 0.02);
  ctx.beginPath();
  if (proud) ctx.arc(-u * 0.04, hy + u * 0.12, u * 0.06, 0.1 * Math.PI, 0.9 * Math.PI);
  else if (wow || oops) (ctx.fillStyle = '#5a1a20'), ctx.ellipse(-u * 0.04, hy + u * 0.15, u * 0.03, u * 0.04, 0, 0, TAU), ctx.fill();
  else if (worry) (ctx.moveTo(-u * 0.1, hy + u * 0.16), ctx.quadraticCurveTo(-u * 0.04, hy + u * 0.12, u * 0.02, hy + u * 0.16));
  else (ctx.moveTo(-u * 0.09, hy + u * 0.14), ctx.quadraticCurveTo(-u * 0.04, hy + u * 0.17, u * 0.01, hy + u * 0.14));
  ctx.stroke();
  // 팔 (환호하면 번쩍)
  const up = proud || (oops && m === 'panic');
  ctx.strokeStyle = fur;
  ctx.lineWidth = u * 0.1;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-u * 0.28, -u * 0.45);
  ctx.lineTo(-u * (up ? 0.46 : 0.38), -u * (up ? 0.9 : 0.25));
  ctx.moveTo(u * 0.28, -u * 0.45);
  ctx.lineTo(u * (up ? 0.46 : 0.4), -u * (up ? 0.9 : 0.32));
  ctx.stroke();
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#e8a8a0';
  ctx.beginPath();
  ctx.arc(-u * (up ? 0.46 : 0.38), -u * (up ? 0.92 : 0.24), u * 0.06, 0, TAU);
  ctx.arc(u * (up ? 0.46 : 0.4), -u * (up ? 0.92 : 0.31), u * 0.06, 0, TAU);
  ctx.fill();
  ctx.restore();
  // 밀짚모자 (끝내면 하늘로 던졌다가 다시 쏙)
  {
    const ht = t - s.hatT, fly = s.hatT >= 0 && ht >= 0 && ht < 64;
    let hx = x - u * 0.02 * Math.cos(tilt), hy2 = y - jump - u * 1.0, hr = tilt * 0.8;
    if (dizzy) (hx = x - u * 0.75), (hy2 = y - u * 0.35), (hr = -0.6);
    if (fly) {
      const q = ht / 64, arc = Math.sin(q * Math.PI);
      hy2 -= arc * u * 0.85;
      hx += Math.sin(q * Math.PI * 2) * u * 0.25;
      hr = q * TAU * 2;
    }
    ctx.save();
    ctx.translate(hx, hy2);
    ctx.rotate(hr);
    ctx.fillStyle = '#c99a3a';
    ctx.beginPath();
    ctx.ellipse(0, u * 0.04, u * 0.42, u * 0.09, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0cc6a';
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.4, u * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -u * 0.06, u * 0.22, u * 0.14, 0, Math.PI, TAU);
    ctx.fill();
    ctx.fillStyle = '#d8402a';
    ctx.fillRect(-u * 0.22, -u * 0.08, u * 0.44, u * 0.05);
    ctx.strokeStyle = 'rgba(140,100,30,.6)';
    ctx.lineWidth = 1;
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath();
      ctx.moveTo(k * u * 0.05, -u * 0.18);
      ctx.lineTo(k * u * 0.07, -u * 0.08);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 땀 · 물음표 · 어질 별
  ctx.font = `${Math.max(13, u * 0.26)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  if (worry || oops) ctx.fillText('💦', x + u * 0.32, y - u * 1.0 + Math.sin(t * 0.2) * 2);
  if (huh) ctx.fillText('❓', x + u * 0.3, y - u * 1.25);
  if (dizzy) for (let k = 0; k < 3; k++) {
    const a = t * 0.12 + (k / 3) * TAU;
    ctx.fillText('⭐', x - u * 0.55 + Math.cos(a) * u * 0.3, y - u * 0.75 + Math.sin(a) * u * 0.1);
  }
}

// ═════════ HUD ═════════
function drawHud(ctx: CanvasRenderingContext2D, s: PipeState, d: StageDef, w: number, h: number, B: BG, X: F, Y: F, R: F, font: (sz: number, w?: number) => void, th: Theme) {
  const t = s.t, S = s.S, L = s.L;
  void h;
  const hb = R(0.066);
  ctx.fillStyle = 'rgba(40,24,10,.9)';
  ctx.fillRect(0, 0, w, hb);
  font(0.04, 900);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff3dc';
  ctx.fillText(`${s.stage + 1}/${STAGES.length}판 · ${d.emoji} ${d.name}`, R(0.03), hb * 0.52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffd166';
  const stt = `★ ${s.stars}`;
  ctx.fillText(stt, w - R(0.03), hb * 0.52);
  ctx.fillStyle = th.hot;
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - R(0.06) - ctx.measureText(stt).width, hb * 0.52);
  // 돌리기 막대 (🔧)
  {
    const y = Y(UY), x0 = X(0.1), x1 = X(0.56), bh = R(0.024), used = Math.min(S.rots, L.limit), q = used / L.limit, pq = Math.min(1, L.P / L.limit);
    ctx.fillStyle = 'rgba(40,24,10,.72)';
    ctx.beginPath();
    ctx.roundRect(X(0.015), y - R(0.028), X(0.86) - X(0.015), R(0.056), R(0.028));
    ctx.fill();
    ctx.font = `${Math.max(15, R(0.042))}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('🔧', X(0.055), y + 1);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.beginPath();
    ctx.roundRect(x0, y - bh / 2, x1 - x0, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(140,230,120,.22)';
    ctx.beginPath();
    ctx.roundRect(x0, y - bh / 2, (x1 - x0) * pq, bh, bh / 2);
    ctx.fill();
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, '#5cc8ff');
    g.addColorStop(pq, '#7ad8ff');
    g.addColorStop(Math.min(1, pq + 0.01), '#ffb05a');
    g.addColorStop(1, '#ff5a4e');
    ctx.fillStyle = g;
    if (q > 0) (ctx.beginPath(), ctx.roundRect(x0, y - bh / 2, Math.max(bh, (x1 - x0) * q), bh, bh / 2), ctx.fill());
    const sx = x0 + (x1 - x0) * pq;
    ctx.fillStyle = S.rots <= L.P ? '#ffd166' : 'rgba(255,255,255,.35)';
    ctx.fillRect(sx - 1, y - bh * 0.85, 2, bh * 1.7);
    font(0.026, 900);
    ctx.fillText('★', sx, y - bh * 1.05);
    font(0.033, 900);
    ctx.textAlign = 'left';
    ctx.fillStyle = L.limit - S.rots <= 3 ? '#ff9a8a' : '#fff3dc';
    ctx.fillText(`돌리기 ${S.rots}/${L.limit}`, X(0.585), y + 1);
    // 되돌리기
    const ux = X(UX), uy = Y(UY), on = s.undo > 0 && !!s.prev && s.phase === 'play';
    ctx.fillStyle = on ? '#7a5ac8' : 'rgba(90,70,60,.75)';
    ctx.beginPath();
    ctx.arc(ux, uy, R(UR), 0, TAU);
    ctx.fill();
    ctx.strokeStyle = on ? '#e6dcff' : 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    font(0.036, 900);
    ctx.textAlign = 'center';
    ctx.fillStyle = on ? '#ffffff' : 'rgba(255,255,255,.45)';
    ctx.fillText('↩', ux, uy + 1);
    if (s.undo > 0) {
      ctx.fillStyle = '#ff5a6e';
      ctx.beginPath();
      ctx.arc(ux + R(0.026), uy - R(0.024), R(0.014), 0, TAU);
      ctx.fill();
      font(0.022, 900);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(String(s.undo), ux + R(0.026), uy - R(0.023));
    }
  }
  // 새것 알림
  if (s.news && t - s.news.t < NEWS_T + 20) {
    const age = t - s.news.t, a = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    const tx = `✨ ${s.news.text}`;
    let fs = 0.036;
    font(fs, 900);
    while (ctx.measureText(tx).width > w - R(0.05) && fs > 0.03) font((fs -= 0.001), 900);
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = Y(0.168) - drop;
    ctx.fillStyle = 'rgba(50,30,12,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,210,140,.6)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff4e0';
    ctx.fillText(tx, w / 2, by2 + 1);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play') {
      const a = Math.min(1, age / 8, (90 - age) / 18), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(50,28,8,.6)';
      ctx.fillRect(0, Y(0.205), w, R(0.13));
      ctx.save();
      ctx.translate(w / 2, Y(0.262));
      ctx.scale(sc, sc);
      font(0.068, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(50,28,8,.85)';
      const big = `${d.emoji} ${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.036, 800);
      const sub = L.colors > 1 ? `밭 ${L.fields.length}곳 — 깃발 색 물로` : `밭 ${L.fields.length}곳에 물을 대요`;
      ctx.strokeText(sub, 0, R(0.05));
      ctx.fillText(sub, 0, R(0.05));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  drawSpot(ctx, s, w, B, X, Y, R, font);
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, a = Math.min(1, age / 10);
    ctx.globalAlpha = a;
    ctx.fillStyle = s.ok ? 'rgba(40,60,20,.74)' : 'rgba(80,30,20,.74)';
    ctx.fillRect(0, Y(0.5), w, R(0.27));
    ctx.textAlign = 'center';
    font(s.ok ? 0.056 : 0.05, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '대풍년 텃밭 완성! 🎉' : `${d.emoji} ${d.name} 풍년!`) : s.why, w / 2, Y(0.56));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.65));
        if (got && (juice(s).memo['star' + k] ?? -1) < s.clearT) (juice(s).memo['star' + k] = s.clearT), juice(s).burst(w / 2 + (k - 1) * R(0.1), Y(0.65), '#ffe066', 14, 3, 2.4);
      }
      font(0.033, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`돌리기 ${S.rots}번 (★ ${L.P}번 안에) · ${S.leaks ? `💧 ${S.leaks}곳 샘` : '💧 안 샘 ✓'}`, w / 2, Y(0.725));
    } else {
      font(0.04, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 밭을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.65));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 별 목표 · 안내 ═════════
  {
    const y0 = Y(1.282);
    const bg = ctx.createLinearGradient(0, y0, 0, Y(A));
    bg.addColorStop(0, 'rgba(40,24,10,.0)');
    bg.addColorStop(0.22, 'rgba(40,24,10,.84)');
    bg.addColorStop(1, 'rgba(40,24,10,.94)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, y0, w, Y(A) - y0);
    const y2 = Y(1.328), res = s.phase === 'result' && s.ok, leaks = s.F.leak.filter((q) => s.F.wet[q >> 2]).length;
    const chips = [
      { txt: `밭 ${s.F.nsat}/${L.fields.length}`, st: res ? true : null },
      { txt: `돌리기 ${L.P}번 안에`, st: S.rots > L.P ? false : res ? true : null },
      { txt: leaks ? `💧 ${leaks}곳 샘` : '💧 안 샘', st: res ? S.leaks === 0 : leaks ? false : null },
    ];
    const gx0 = R(0.02), gw = (w - R(0.04)) / 3;
    chips.forEach(({ txt, st }, k) => {
      const gx = gx0 + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.32)' : st === false ? 'rgba(0,0,0,.35)' : 'rgba(255,240,220,.13)';
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.027), gw - 4, R(0.054), R(0.027));
      ctx.fill();
      font(0.031, 800);
      ctx.textAlign = 'center';
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.55)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1);
    });
    const y3 = Y(1.405);
    let tp = '👆 관을 톡 → 빙글! 우물에서 밭까지 물길을 이어요';
    if (s.phase === 'result') tp = s.ok ? '다음 밭으로 가요!' : '같은 밭을 다시 — 이번엔 돌릴 관을 골라서';
    else if (s.down && s.press >= 0 && canTurn(L, S, s.press) && t - s.pressT >= 12) tp = '👀 반짝 = 한 번 더 돌리면 물이 닿는 칸 · ✕ = 끊기는 칸';
    else if (L.limit - S.rots <= 3) tp = '⚠ 돌리기가 얼마 안 남았어요 — ↩ 되돌리기도 있어요';
    else if (s.stage === 1 && S.rots === 0) tp = '💡 우물 밑 수문 관(🔴)을 마지막에 — 한 번에 퐁퐁 연쇄!';
    else if (s.stage > 0) tp = d.tip;
    ctx.textAlign = 'center';
    let fs = 0.033;
    font(fs, 800);
    while (ctx.measureText(tp).width > w - R(0.04) && fs > 0.028) font((fs -= 0.001), 800);
    ctx.fillStyle = 'rgba(255,240,220,.93)';
    ctx.fillText(tp, w / 2, y3);
  }
  // 첫 판: 손가락으로 톡 할 관 가리키기
  if (s.stage === 0 && s.phase === 'play' && t - s.startT > 30 && !s.S.clear) {
    const i = L.plan[S.rots];
    if (i !== undefined && S.rots < L.plan.length && t - s.lastTap > 20) {
      const c = cpx(B, L, i), bob = Math.sin(t * 0.15) * R(0.012);
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, B.cw * 0.52 + Math.sin(t * 0.15) * 2, B.ch * 0.52 + Math.sin(t * 0.15) * 2, 0, 0, TAU);
      ctx.stroke();
      ctx.font = `${Math.max(18, R(0.075))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('👆', c.x + B.cw * 0.25, c.y + B.ch * 0.55 + bob);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

/** 새 장치 스포트라이트: 그 판을 처음 할 때, 판 소개 뒤 2초쯤 주변을 어둡게 하고 장치에 빛을 비춘다 */
function drawSpot(ctx: CanvasRenderingContext2D, s: PipeState, w: number, B: BG, X: F, Y: F, R: F, font: (sz: number, w?: number) => void) {
  if (s.retry || s.phase !== 'play') return;
  const age = s.t - s.startT;
  if (age < 88 || age > 225) return;
  const L = s.L, key = STAGES[s.stage].key;
  let x = -1, y = -1, rr = B.cw * 0.75, label = '';
  const at = (i: number) => {
    const c = cpx(B, L, i);
    x = c.x;
    y = c.y;
  };
  const find = (f: (i: number) => boolean) => [...Array(L.n).keys()].find(f);
  if (key === 'rock') {
    const i = find((j) => L.kind[j] === PIPE && L.fixed[j] === 1);
    if (i !== undefined) at(i), (label = '🪨 바위 관 — 못 돌려요, 여기에 맞춰 이어요');
  } else if (key === 'nest') {
    const i = find((j) => L.kind[j] === NEST);
    if (i !== undefined) at(i), (label = '🐜 개미집 — 관 끝이 향하면 물이 들어가요');
  } else if (key === 'lock') {
    const i = find((j) => L.lock[j] === 1);
    if (i !== undefined) at(i), (label = '🌿 뿌리 관 — 옆 밭에 물이 닿으면 풀려요');
  } else if (key === 'gear') {
    const i = find((j) => L.gear[j] > j);
    if (i !== undefined) {
      const a = cpx(B, L, i), b = cpx(B, L, L.gear[i]);
      x = (a.x + b.x) / 2;
      y = (a.y + b.y) / 2;
      rr = B.cw * 1.15;
      label = '⚙️ 톱니 짝 — 하나를 톡 하면 둘 다 돌아요';
    }
  } else if (key === 'twin') {
    const i = L.srcs.find((j) => L.col[j] === 1);
    if (i !== undefined) at(i), (label = '🍯 꿀물 우물 — 노란 깃발 밭으로만!');
  } else if (key === 'cap') {
    at(L.srcs[0]);
    label = `🪣 물 한 동이 — 관 ${L.cap}칸까지만 가요`;
  }
  if (x < 0 || !label) return;
  const a = Math.min(1, (age - 88) / 10, (225 - age) / 18), r = rr * (1 + 0.05 * Math.sin(age * 0.2));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(20,10,0,.6)';
  ctx.beginPath();
  ctx.rect(0, Y(0.13), w, Y(1.282) - Y(0.13));
  ctx.arc(x, y, r, 0, TAU, true);
  ctx.fill('evenodd');
  ctx.strokeStyle = '#fff1a8';
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 6]);
  ctx.lineDashOffset = -age;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  font(0.034, 900);
  let fs = 0.034;
  while (ctx.measureText(label).width > w - R(0.08) && fs > 0.028) font((fs -= 0.001), 900);
  const tw = ctx.measureText(label).width + R(0.05), ly = y > Y(0.8) ? y - r - R(0.06) : y + r + R(0.06), lx = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x));
  ctx.fillStyle = 'rgba(70,40,10,.96)';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2, ly - R(0.03), tw, R(0.06), R(0.03));
  ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff6e0';
  ctx.fillText(label, lx, ly + 1);
  font(0.03, 900);
  const nb = 'NEW!', nw2 = ctx.measureText(nb).width + R(0.03);
  ctx.fillStyle = '#ff5a6e';
  ctx.beginPath();
  ctx.roundRect(lx - tw / 2 - R(0.01), ly - R(0.055), nw2, R(0.04), R(0.02));
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.fillText(nb, lx - tw / 2 - R(0.01) + nw2 / 2, ly - R(0.034));
  ctx.restore();
  void X;
}
