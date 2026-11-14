/**
 * [스튜디오 M0] 공장 프로토타입 arcade/games/animalbus.ts(25라운드)를 그대로 옮겨 왔다. 이후 이 파일에서 키운다.
 * 동물 버스 정류장 (25라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우) — 줄 서서 태우기 × 분류하기 × 가리키기(톡).
 * 뼈대: 요즘 잘 팔리는 '버스 태우기' 퍼즐. 광장에 색깔 동물이 칸마다 빽빽이 서 있고, 정류장(아래)까지 길이 트인 동물만 나간다.
 * 규칙(결정적): 동물을 톡 → 빈칸을 따라 정류장으로 뒤뚱뒤뚱. 지금 서 있는 버스와 같은 색이면 타고, 아니면 대기 의자에 앉는다.
 *   버스(자리 3개, 2층 버스는 6개)가 꽉 차면 '빵빵' 떠나고 다음 버스가 온다. 의자에 앉은 동물은 맞는 버스가 오면 저절로 탄다.
 *   의자 5칸이 모자라 앉을 데가 없으면 그 판 실패(하트 -1, 그 판을 처음부터). 모두 태우면 완성.
 * 와우: 톡 한 번에 펭귄이 군중을 비집고 나와(이웃들이 우르르 비킨다) 파란 버스에 폴짝 — 꽉 차면 '빵빵!' 창문마다 손 흔들며 출발,
 *   의자의 친구가 다음 버스에 저절로 쪼르르 타면서 버스가 줄줄이 연달아 떠나기도 한다. 의자가 거의 차면 모두 땀을 뻘뻘.
 * 판 구조: ★ 모두 태우기 · ★ 의자를 정해진 칸 이하로만 쓰기 · ★ 빵빵 연속(의자에 아무도 안 앉고 버스 N대 연달아 출발).
 * 펼쳐짐(하는 일이 바뀐다): 1판 톡→버스 → 2판 대기 의자·다음 버스 미리 보기(의자를 언제 쓸지) → 3판 큰 코끼리(두 칸 막고 의자도 두 칸 — 제 버스 올 때만)
 *   → 4판 잠꾸러기(옆 친구가 떠나야 깸 — 깨울 순서) → 5판 우비 친구(옆이 트여야 색이 보임 — 살펴보며 파기)
 *   → 6판 2층 버스(여섯 자리 — 의자에 모아 뒀다 한 번에) → 7판 분수 광장(돌아가는 길) → 8판 퇴근길(모두).
 * 웃음: 막힌 동물을 톡 하면 '끙!' 제자리에서 버둥 · 잠꾸러기는 '쿨쿨' · 의자가 꽉 차 가면 땀 · 자리가 없으면 엉엉 · 손 흔드는 버스.
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from './core.ts';
import { juice } from './juice.ts';
import { firstMoveWidth, follow, greedy, habit, runSim } from './bots.ts';

const A = 1.56;
export const BENCH = 5;
/** 동물 종 = 색: 0 펭귄(파랑) · 1 돼지(분홍) · 2 병아리(노랑) · 3 개구리(초록) */
const SP = ['펭귄', '돼지', '병아리', '개구리'];
const CN = ['파랑', '분홍', '노랑', '초록'];
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 200;
const RESULT_OK = 190, RESULT_FAIL = 150, NEWS_T = 210;
/** 버스 한 대가 떠나고 다음 버스가 정류장에 설 때까지(틱) */
const BUS_GAP = 46, BUS_IN = 34;

interface Animal { col: number; big: boolean; sleep: boolean; hidden: boolean; cells: number[] }
interface Bus { col: number; cap: number }
/** 판 하나의 변하지 않는 것들 */
export interface Layout {
  C: number; R: number;
  /** -1 빈칸 · -2 분수(못 지나감) · 0 이상 동물 번호 */
  cells: number[];
  an: Animal[]; buses: Bus[];
  /** ★ 기준: 의자 최대 par칸 이하 · 빵빵 연속 combo대 */
  par: number; combo: number;
  /** ★3 미션(C003, CONTENT §1): 'combo' 빵빵 연속 combo대 · 'ele' 코끼리를 의자에 앉히지 않기 */
  mis: Mission;
  /** 판 고르기에서 끝내 못 지킨 조건(C003, funqa에 기록) */
  relax: string[];
  /** 내다보는 봇이 찾은 풀이 (톡 순서) */
  sol: number[];
  habit: { peak: number; best: number; ok: boolean };
}
/** 판의 움직이는 것들 (복사해서 내다본다) */
export type Mission = 'combo' | 'ele';
export interface Sim {
  gone: number[]; awake: number[]; bench: number[]; used: number; bus: number; fill: number;
  peak: number; streak: number; best: number; fail: number; left: number;
  /** 코끼리가 의자에 앉은 적 있나 (★3 미션 'ele') */
  eleBench: number;
}

interface StageDef {
  key: string; name: string; news: string; C: number; R: number; cols: number[];
  /** 3자리 버스 수 · 2층 버스 수 · 코끼리 · 잠꾸러기 · 우비 · 분수 */
  nb: number; nd: number; ele: number; zz: number; hid: number; rock: number;
  /** ★2 의자 기준에 더하는 여유 · ★3 빵빵 연속 기준에서 빼는 여유 */
  slack: number; cslack: number;
  /** ★3 미션 (없으면 combo) */
  mis?: Mission;
}

export const STAGES: StageDef[] = [
  // C003 (📐 CONTENT §2.2): 2판 별 조임 · 3판 🐘 미션 · 4판 버스 7→6 · 5판 3색·우비 3·여유 2 · 6판 3색 · 8판 의자 여유 2 (🚍 미션은 C005)
  { key: 'first', name: '첫 버스', news: '🐧 톡 — 같은 색 버스에 폴짝! 붙어 선 친구는 줄줄이', C: 4, R: 3, cols: [0, 1], nb: 3, nd: 0, ele: 0, zz: 0, hid: 0, rock: 0, slack: 1, cslack: 1 },
  { key: 'bench', name: '대기 의자', news: '🪑 색이 다르면 의자에서 기다려요 — 다음 버스 색을 보고!', C: 4, R: 4, cols: [0, 1, 2], nb: 4, nd: 0, ele: 0, zz: 0, hid: 0, rock: 0, slack: 0, cslack: 0 },
  { key: 'elephant', name: '큰 코끼리', news: '🐘 코끼리는 두 칸 — 의자도 두 칸 차지해요!', C: 5, R: 4, cols: [0, 1, 2], nb: 6, nd: 0, ele: 2, zz: 0, hid: 0, rock: 0, slack: 1, cslack: 0, mis: 'ele' },
  { key: 'sleep', name: '잠꾸러기', news: '💤 잠꾸러기 — 옆 친구가 떠나야 깨요', C: 6, R: 4, cols: [0, 1, 2], nb: 6, nd: 0, ele: 0, zz: 3, hid: 0, rock: 0, slack: 1, cslack: 1 },
  { key: 'hidden', name: '우비 친구', news: '🧥 우비 친구 — 길이 트여야 무슨 색인지 보여요', C: 6, R: 4, cols: [0, 1, 2], nb: 6, nd: 0, ele: 0, zz: 0, hid: 3, rock: 0, slack: 2, cslack: 2 },
  { key: 'double', name: '2층 버스', news: '🚍 2층 버스 — 여섯 자리! 의자에 모아 뒀다 한 번에', C: 6, R: 4, cols: [0, 1, 2], nb: 5, nd: 1, ele: 0, zz: 0, hid: 0, rock: 0, slack: 1, cslack: 1 },
  { key: 'fountain', name: '분수 광장', news: '⛲ 분수 — 못 지나가요, 빙 돌아서!', C: 6, R: 5, cols: [0, 1, 2, 3], nb: 8, nd: 0, ele: 1, zz: 0, hid: 0, rock: 2, slack: 1, cslack: 1 },
  { key: 'rush', name: '퇴근길', news: '🌆 퇴근길 — 코끼리·잠꾸러기·우비·2층 버스 모두!', C: 6, R: 5, cols: [0, 1, 2, 3], nb: 6, nd: 1, ele: 1, zz: 2, hid: 3, rock: 0, slack: 2, cslack: 1 },
];
export const STAGE_COUNT = STAGES.length;

// ───────── 길 찾기 ─────────
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const emptyAt = (L: Layout, S: Sim, k: number) => {
  const v = L.cells[k];
  return v === -1 || (v >= 0 && S.gone[v] === 1);
};
/** 정류장 쪽(맨 앞줄)에서 빈칸을 따라 닿는 칸 */
function reach(L: Layout, S: Sim): Uint8Array {
  const { C, R } = L, out = new Uint8Array(C * R), q: number[] = [];
  for (let c = 0; c < C; c++) {
    const k = (R - 1) * C + c;
    if (emptyAt(L, S, k)) (out[k] = 1), q.push(k);
  }
  while (q.length) {
    const k = q.pop()!, r = (k / C) | 0, c = k % C;
    for (const [dc, dr] of D4) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= C || rr >= R) continue;
      const k2 = rr * C + cc;
      if (!out[k2] && emptyAt(L, S, k2)) (out[k2] = 1), q.push(k2);
    }
  }
  return out;
}
function isOpen(L: Layout, i: number, re: Uint8Array) {
  const { C, R } = L;
  for (const k of L.an[i].cells) {
    const r = (k / C) | 0, c = k % C;
    if (r === R - 1) return true;
    for (const [dc, dr] of D4) {
      const cc = c + dc, rr = r + dr;
      if (cc >= 0 && rr >= 0 && cc < C && rr < R && re[rr * C + cc]) return true;
    }
  }
  return false;
}
const awakeOk = (L: Layout, S: Sim, i: number) => !L.an[i].sleep || S.awake[i] === 1;
/** 지금 톡 하면 나갈 수 있는 동물들. 모두 잠들어 막혔으면 깨운다(하암~) */
function moves(L: Layout, S: Sim, woke?: number[]): number[] {
  const re = reach(L, S), out: number[] = [], sleepy: number[] = [];
  for (let i = 0; i < L.an.length; i++) {
    if (S.gone[i] || !isOpen(L, i, re)) continue;
    if (awakeOk(L, S, i)) out.push(i);
    else sleepy.push(i);
  }
  if (!out.length && sleepy.length) for (const i of sleepy) (S.awake[i] = 1), out.push(i), woke?.push(i);
  return out;
}
/** 동물 칸에서 맨 앞줄까지 빈칸으로 가는 길 (칸 번호 목록, 마지막이 맨 앞줄) */
function pathOut(L: Layout, S: Sim, i: number): number[] {
  const { C, R } = L, re = reach(L, S), prev = new Map<number, number>(), q: number[] = [];
  for (const k of L.an[i].cells) {
    if (((k / C) | 0) === R - 1) return [k];
    prev.set(k, -1);
    q.push(k);
  }
  for (let h = 0; h < q.length; h++) {
    const k = q[h], r = (k / C) | 0, c = k % C;
    // 앞쪽(아래)부터 살펴 곧게 내려가는 길을 고른다
    for (const [dc, dr] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
      const cc = c + dc, rr = r + dr;
      if (cc < 0 || rr < 0 || cc >= C || rr >= R) continue;
      const k2 = rr * C + cc;
      if (prev.has(k2) || !re[k2]) continue;
      prev.set(k2, k);
      if (rr === R - 1) {
        const out = [k2];
        for (let p = k; p >= 0; p = prev.get(p)!) out.push(p);
        return out.reverse();
      }
      q.push(k2);
    }
  }
  return [L.an[i].cells[0]];
}
function adj8(L: Layout, a: number[], b: number[]) {
  for (const x of a)
    for (const y of b) {
      const dr = Math.abs(((x / L.C) | 0) - ((y / L.C) | 0)), dc = Math.abs((x % L.C) - (y % L.C));
      if (dr <= 1 && dc <= 1) return true;
    }
  return false;
}
const sizeOf = (L: Layout, i: number) => (L.an[i].big ? 2 : 1);
function hasLeft(L: Layout, S: Sim, col: number) {
  for (let i = 0; i < L.an.length; i++) if (!S.gone[i] && L.an[i].col === col) return true;
  for (const j of S.bench) if (L.an[j].col === col) return true;
  return false;
}

// ───────── 톡 한 번 (결정적, 봇이 내다볼 때도 같은 함수) ─────────
interface Hooks { depart?(b: number): void; board?(j: number, b: number, k: number): void; wake?(j: number): void; follow?(j: number, k: number): void }
/**
 * C003 오너 피드백 "하나씩 눌러서 넣는 게 좀 번거로울 때가 있어" → 줄줄이 따라 타기:
 * 같은 색 버스에 탄 친구와 맞닿은(상하좌우) 같은 색 친구가, 길이 트였고 깨어 있으면 버스 남은 자리만큼 손잡고 줄줄이 따라 탄다.
 * 의자로 가는 톡은 혼자만 간다(의자는 늘 내가 고른다).
 */
export let FOLLOW = true;
export const setFollow = (b: boolean) => ((FOLLOW = b), CACHE.clear());
function adj4(L: Layout, a: number[], b: number[]) {
  for (const x of a)
    for (const y of b) if (Math.abs(((x / L.C) | 0) - ((y / L.C) | 0)) + Math.abs((x % L.C) - (y % L.C)) === 1) return true;
  return false;
}
/** 광장에서 빠진다: 옆(8방향) 잠꾸러기가 깬다 */
function leave(L: Layout, S: Sim, i: number, H?: Hooks) {
  const a = L.an[i];
  S.gone[i] = 1;
  for (let j = 0; j < L.an.length; j++) {
    const b = L.an[j];
    if (b.sleep && !S.gone[j] && !S.awake[j] && adj8(L, a.cells, b.cells)) (S.awake[j] = 1), H?.wake?.(j);
  }
}
/** 지금 버스로 따라 탈 다음 친구: 줄의 마지막 친구부터 거슬러 맞닿은 같은 색, 그중 앞줄 */
function nextFollower(L: Layout, S: Sim, chain: number[], col: number): number {
  const re = reach(L, S);
  for (let q = chain.length - 1; q >= 0; q--) {
    let f = -1, fr = -1;
    for (let j = 0; j < L.an.length; j++) {
      const c = L.an[j];
      if (S.gone[j] || c.col !== col || !awakeOk(L, S, j) || !isOpen(L, j, re) || !adj4(L, L.an[chain[q]].cells, c.cells)) continue;
      const row = Math.max(...c.cells.map((k) => (k / L.C) | 0));
      if (row > fr) (fr = row), (f = j);
    }
    if (f >= 0) return f;
  }
  return -1;
}
/** 톡 하면 함께 나갈 친구들(미리 보기용, 판은 그대로) */
export function followersOf(L: Layout, S: Sim, i: number): number[] {
  const out: number[] = [], T = cloneSim(S);
  tapSim(L, T, i, { follow: (j) => out.push(j) });
  return out;
}
function newSim(L: Layout): Sim {
  const n = L.an.length;
  return { gone: new Array(n).fill(0), awake: new Array(n).fill(0), bench: [], used: 0, bus: 0, fill: 0, peak: 0, streak: 0, best: 0, fail: 0, left: n, eleBench: 0 };
}
const cloneSim = (a: Sim): Sim => ({ ...a, gone: a.gone.slice(), awake: a.awake.slice(), bench: a.bench.slice() });

/** 버스가 꽉 찼거나(또는 그 색 손님이 더 없으면) 떠나고, 다음 버스가 오면 의자의 같은 색 친구가 저절로 탄다 */
function settle(L: Layout, S: Sim, H?: Hooks) {
  while (S.bus < L.buses.length) {
    const b = L.buses[S.bus];
    if (S.fill < b.cap && hasLeft(L, S, b.col)) break;
    if (S.fill > 0) (S.streak++), (S.best = Math.max(S.best, S.streak));
    H?.depart?.(S.bus);
    S.bus++;
    S.fill = 0;
    const nb = L.buses[S.bus];
    if (!nb) break;
    let k = 0, n = 0;
    while (k < S.bench.length && S.fill < nb.cap) {
      const j = S.bench[k];
      if (L.an[j].col !== nb.col) {
        k++;
        continue;
      }
      S.bench.splice(k, 1);
      S.used -= sizeOf(L, j);
      S.fill = Math.min(nb.cap, S.fill + sizeOf(L, j));
      S.left--;
      H?.board?.(j, S.bus, n++);
    }
  }
}
/** 동물 i를 톡: 'bus' 탔다 · 'bench' 의자에 앉았다 · 'fail' 앉을 데가 없다 */
function tapSim(L: Layout, S: Sim, i: number, H?: Hooks): 'bus' | 'bench' | 'fail' {
  const a = L.an[i];
  leave(L, S, i, H);
  const sz = sizeOf(L, i), b = L.buses[S.bus];
  let res: 'bus' | 'bench';
  if (b && b.col === a.col) {
    S.fill = Math.min(b.cap, S.fill + sz);
    S.left--;
    res = 'bus';
    for (const chain = [i]; FOLLOW && S.fill < b.cap; ) {
      const f = nextFollower(L, S, chain, b.col);
      if (f < 0) break;
      H?.follow?.(f, chain.length - 1);
      leave(L, S, f, H);
      S.fill = Math.min(b.cap, S.fill + sizeOf(L, f));
      S.left--;
      chain.push(f);
    }
  } else {
    if (S.used + sz > BENCH) return (S.fail = 1), 'fail';
    S.bench.push(i);
    if (a.big) S.eleBench = 1;
    S.used += sz;
    S.peak = Math.max(S.peak, S.used);
    S.streak = 0;
    res = 'bench';
  }
  settle(L, S, H);
  return res;
}

/** ★3 미션을 지금까지 지켰나 (combo는 끝까지 가 봐야 확정) */
export const missionOk = (L: Layout, S: Sim) => (L.mis === 'ele' ? !S.eleBench : S.best >= L.combo);
/** 끝난 판의 별 (실패 0) */
export const starsOf = (L: Layout, S: Sim) => (S.fail || S.left > 0 ? 0 : 1 + (S.peak <= L.par ? 1 : 0) + (missionOk(L, S) ? 1 : 0));

// ───────── 내다보기 (빔 탐색): 의자를 가장 적게, 그다음 빵빵 연속을 길게 ─────────
interface Plan { seq: number[]; peak: number; best: number }
/** mode 'peak': 의자 최대를 가장 적게(같으면 빵빵 연속 길게) · 'streak': peakCap 안에서 빵빵 연속을 가장 길게 */
function plan(L: Layout, S0: Sim, width: number, peakCap = BENCH, mode: 'peak' | 'streak' = 'peak', noEle = false): Plan | null {
  const better = (a: Plan, b: Plan | null) =>
    !b || (mode === 'peak' ? a.peak < b.peak || (a.peak === b.peak && a.best > b.best) : a.best > b.best || (a.best === b.best && a.peak < b.peak));
  interface Node { S: Sim; seq: number[]; h: number }
  let beam: Node[] = [{ S: S0, seq: [], h: 0 }], best: Plan | null = null;
  while (beam.length) {
    const kids = new Map<string, Node>();
    for (const nd of beam) {
      const ms = moves(L, cloneSim(nd.S));
      const S1 = cloneSim(nd.S);
      moves(L, S1);
      for (const i of ms) {
        const S = cloneSim(S1);
        if (tapSim(L, S, i) === 'fail' || S.peak > peakCap || (noEle && S.eleBench)) continue;
        const seq = [...nd.seq, i];
        if (S.left === 0) {
          const p = { seq, peak: S.peak, best: S.best };
          if (better(p, best)) best = p;
          continue;
        }
        // 지금까지 의자 최대 · 지금 의자 · 떠난 버스 · 빵빵 연속
        let open = 0;
        const bc = L.buses[S.bus]?.col ?? -1;
        for (const j of moves(L, cloneSim(S))) if (L.an[j].col === bc) open++;
        const h =
          mode === 'peak'
            ? S.peak * 1000 + S.used * 140 - S.bus * 60 - S.fill * 18 - Math.min(2, open) * 25 - S.best * 4 - S.streak * 3
            : S.used * 140 - S.bus * 60 - S.fill * 18 - Math.min(2, open) * 25 - S.best * 150 - S.streak * 70;
        const key = S.gone.join('');
        const old = kids.get(key);
        if (!old || h < old.h) kids.set(key, { S, seq, h });
      }
    }
    beam = [...kids.values()].sort((a, b) => a.h - b.h).slice(0, width);
  }
  return best;
}

/** 버릇 하나: 지금 버스 색이 열려 있으면 그걸, 없으면 맨 앞줄 왼쪽부터 아무거나 */
function habitPick(L: Layout, S: Sim, ms: number[]): number {
  const bc = L.buses[S.bus]?.col ?? -1;
  const order = (i: number) => -Math.max(...L.an[i].cells.map((k) => ((k / L.C) | 0) * 100 - (k % L.C)));
  const m = ms.filter((i) => L.an[i].col === bc);
  const pool = m.length ? m : ms;
  return pool.reduce((a, b) => (order(b) < order(a) ? b : a));
}
function habitRun(L: Layout) {
  const S = habitSim(L);
  return { peak: S.peak, best: S.best, ok: !S.fail && S.left === 0 };
}
function habitSim(L: Layout) {
  const S = newSim(L);
  while (S.left > 0 && !S.fail) {
    const ms = moves(L, S);
    if (!ms.length) break;
    tapSim(L, S, habitPick(L, S, ms));
  }
  return S;
}

/** 아무렇게나(열린 동물 중 아무거나) 두면 몇 번에 한 번 통과하나 — 1·2판은 거의 안 지게 */
function luckRate(L: Layout, n: number) {
  const r = mulberry32(L.cells.length * 977 + L.an.length * 131 + L.buses[0].col);
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    while (S.left > 0 && !S.fail) {
      const ms = moves(L, S);
      if (!ms.length) break;
      tapSim(L, S, ms[Math.floor(r() * ms.length)]);
    }
    if (!S.fail && S.left === 0) ok++;
  }
  return ok / n;
}

// ───────── 판 만들기 ─────────
function tryBuild(d: StageDef, r: Rng, si: number): Omit<Layout, 'par' | 'combo' | 'sol' | 'habit'> | null {
  const { C, R } = d;
  // 버스: 색을 고루 나눠 섞는다. 첫 판 첫 버스는 파랑(펭귄)
  const buses: Bus[] = [];
  for (let k = 0; k < d.nb; k++) buses.push({ col: d.cols[k % d.cols.length], cap: 3 });
  shuffle(buses, r);
  for (let k = 0; k < d.nd; k++) buses.splice(1 + Math.floor(r() * (buses.length - 1)), 0, { col: d.cols[Math.floor(r() * d.cols.length)], cap: 6 });
  if (si === 0) {
    const k = buses.findIndex((b) => b.col === 0);
    [buses[0], buses[k]] = [buses[k], buses[0]];
  }
  // 같은 색이 셋 연달아 오지 않게
  for (let k = 2; k < buses.length; k++) if (buses[k].col === buses[k - 1].col && buses[k].col === buses[k - 2].col) return null;
  // 자리 수만큼 동물. 코끼리는 두 자리
  const seats = new Array(4).fill(0);
  for (const b of buses) seats[b.col] += b.cap;
  const an: Animal[] = [];
  for (let e = 0; e < d.ele; e++) {
    const cs = d.cols.filter((c) => seats[c] >= 3);
    const c = cs[Math.floor(r() * cs.length)];
    seats[c] -= 2;
    an.push({ col: c, big: true, sleep: false, hidden: false, cells: [] });
  }
  for (const c of d.cols) for (let k = 0; k < seats[c]; k++) an.push({ col: c, big: false, sleep: false, hidden: false, cells: [] });
  const need = an.reduce((a, x) => a + (x.big ? 2 : 1), 0) + d.rock;
  if (need > C * R) return null;
  const cells = new Array(C * R).fill(-1);
  // 분수: 맨 앞·맨 뒤 줄이 아닌 가운데쯤, 서로 떨어져
  for (let k = 0; k < d.rock; k++) {
    for (let tries = 0; tries < 30; tries++) {
      const rr = 1 + Math.floor(r() * (R - 2)), cc = Math.floor(r() * C), at = rr * C + cc;
      if (cells[at] !== -1 || cells.some((v, j) => v === -2 && Math.abs(((j / C) | 0) - rr) + Math.abs((j % C) - cc) < 3)) continue;
      cells[at] = -2;
      break;
    }
  }
  if (cells.filter((v) => v === -2).length !== d.rock) return null;
  // 빈칸: 뒤쪽에 조금 더 (정해진 수). 코끼리 → 나머지 동물
  const empties = C * R - need;
  const free = cells.map((v, k) => (v === -1 ? k : -1)).filter((k) => k >= 0);
  const wt = free.map((k) => ((k / C) | 0) + r() * R * 1.4);
  const ord = free.map((k, j) => [k, wt[j]] as [number, number]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const holes = new Set(ord.slice(0, empties));
  const taken = new Set<number>();
  for (let i = 0; i < an.length; i++) {
    if (!an[i].big) continue;
    const opts: number[] = [];
    for (const k of ord) {
      const c = k % C;
      if (c < C - 1 && !holes.has(k) && !holes.has(k + 1) && !taken.has(k) && !taken.has(k + 1) && cells[k] === -1 && cells[k + 1] === -1) opts.push(k);
    }
    if (!opts.length) return null;
    const k = opts[Math.floor(r() * opts.length)];
    an[i].cells = [k, k + 1];
    taken.add(k).add(k + 1);
    cells[k] = cells[k + 1] = i;
  }
  const rest = shuffle(free.filter((k) => !holes.has(k) && !taken.has(k)), r);
  let p = 0;
  for (let i = 0; i < an.length; i++) {
    if (an[i].big) continue;
    const k = rest[p++];
    if (k === undefined) return null;
    an[i].cells = [k];
    cells[k] = i;
  }
  // 분수가 길을 끊으면 안 된다: 모든 칸이 분수를 피해 맨 앞줄에 닿아야
  {
    const seen = new Uint8Array(C * R), q: number[] = [];
    for (let c = 0; c < C; c++) if (cells[(R - 1) * C + c] !== -2) (seen[(R - 1) * C + c] = 1), q.push((R - 1) * C + c);
    while (q.length) {
      const k = q.pop()!, rr = (k / C) | 0, cc = k % C;
      for (const [dc, dr] of D4) {
        const c2 = cc + dc, r2 = rr + dr;
        if (c2 < 0 || r2 < 0 || c2 >= C || r2 >= R) continue;
        const k2 = r2 * C + c2;
        if (!seen[k2] && cells[k2] !== -2) (seen[k2] = 1), q.push(k2);
      }
    }
    if (cells.some((v, k) => v !== -2 && !seen[k])) return null;
  }
  const L = { C, R, cells, an, buses } as Layout;
  const S = newSim(L), re = reach(L, S);
  // 잠꾸러기: 처음엔 열려 있지 않은 동물 중에서, 맨 앞줄엔 하나만
  const cand = shuffle(an.map((_, i) => i).filter((i) => !an[i].big), r);
  let zz = 0, front = 0;
  for (const i of cand) {
    if (zz >= d.zz) break;
    const fr = ((an[i].cells[0] / C) | 0) === R - 1;
    if (fr && front >= 1) continue;
    if (!fr && isOpen(L, i, re)) continue;
    an[i].sleep = true;
    zz++;
    if (fr) front++;
  }
  // 우비: 처음엔 길이 막힌 동물
  let hd = 0;
  for (const i of shuffle(an.map((_, i) => i), r)) {
    if (hd >= d.hid) break;
    if (an[i].big || an[i].sleep || isOpen(L, i, re)) continue;
    an[i].hidden = true;
    hd++;
  }
  // 첫 톡에 큰 일: 첫 버스 색 동물이 처음부터 열려 있어야 (첫 판은 둘 이상)
  const firstOpen = moves(L, newSim(L)).filter((i) => an[i].col === buses[0].col).length;
  if (firstOpen < (si === 0 ? 2 : 1)) return null;
  return L;
}

const CACHE = new Map<string, Layout>();
/** 3판부터 후보 몇 개 중 고른다 (측정용으로 바꿀 수 있게) */
export let PICKS = 4;
/** C003: 3판부터 후보를 몇 개까지 만들어 보나 (탈락 조건이 늘어 40 → 120) */
export let TRIES = 120;
export const setTries = (n: number) => ((TRIES = n), CACHE.clear());
export const setPicks = (n: number) => ((PICKS = n), CACHE.clear());
/** 시드·판마다 하나 (같은 시드면 같은 판). 여러 후보 중 '버릇대로 두면 별을 놓치는' 판을 고른다 */
export function layoutFor(seed: number, si: number): Layout {
  const key = `${seed}:${si}`;
  const hit = CACHE.get(key);
  if (hit) return hit;
  const d = STAGES[si], r = mulberry32((seed * 31 + si * 7919 + 17) >>> 0);
  let pick: Layout | null = null, pickScore = -1e9;
  const tries0 = PICKS;
  for (let tries = 0, good = 0; tries < (si >= 2 ? TRIES : 40) && good < (si >= 2 ? tries0 : 1); tries++) {
    const B = tryBuild(d, r, si);
    if (!B) continue;
    const L = B as Layout;
    L.mis = d.mis ?? 'combo';
    // 의자를 가장 적게 쓰는 풀이 → ★2 기준(여유 slack칸) → 그 안에서 ★3 미션을 지키는 풀이(빵빵 연속이 가장 긴) → ★3 기준
    if (si <= 1 && tries < 36 && luckRate(L, 30) < (si === 0 ? 0.97 : 0.8)) continue;
    const p1 = plan(L, newSim(L), 12, BENCH - 1);
    if (!p1) continue;
    L.par = Math.min(BENCH - 1, p1.peak + d.slack);
    const p2 = plan(L, newSim(L), 12, L.par, 'streak', L.mis === 'ele');
    if (!p2) continue; // ★3이 안 나오는 판은 버린다
    L.sol = p2.seq;
    L.combo = Math.max(2, p2.best - d.cslack);
    L.habit = habitRun(L);
    // C003 탈락 조건(📐 CONTENT §4, 📋 C002): 못 지킨 조건마다 감점 — 버릇·따라 하기·탐욕 ★3(−1000, 끝까지 지킴) › 따라 하기·탐욕 ★1 실패(−100 씩) › 2판 첫 버스 색이 처음부터 트임(−50) › 첫 수 ★3 정답 폭 10~50% 밖(−10~)
    const fails: string[] = [];
    let sc = Math.min(3, L.habit.peak - p1.peak) * 3 + Math.min(3, p2.best - L.habit.best) * 3;
    if (si === 1) {
      if (moves(L, newSim(L)).some((i) => L.an[i].col === L.buses[0].col)) fails.push('block1'), (sc -= 50);
      if (L.habit.ok && L.habit.peak <= L.par && missionOk(L, habitSim(L))) sc -= 100;
    }
    if (si >= 2) {
      const runs = [habit, follow, greedy].map((bot) => runSim(L, bot, 1));
      if (runs.some((x) => x.stars === 3)) fails.push('bot3'), (sc -= 1000);
      if (!runs[1].ok) fails.push('follow1'), (sc -= 100);
      if (!runs[2].ok) fails.push('greedy1'), (sc -= 100);
      if (!fails.includes('bot3')) {
        const w = firstMoveWidth(L, 8).rate;
        if (w < 0.1 || w > 0.5) fails.push('width'), (sc -= 10 + 40 * Math.max(0.1 - w, w - 0.5));
      }
    }
    L.relax = fails;
    if (!fails.length) good++;
    if (sc > pickScore) (pick = L), (pickScore = sc);
    // 판 고르기 시간(📋 C002: 판당 2초 넘으면 안 됨): 30번 넘게 만들었고 정답 폭만 못 지킨 후보가 있으면 거기서 멈춘다
    if (si >= 2 && tries >= 30 && pick && pick.relax.every((f) => f === 'width')) break;
  }
  if (!pick) {
    // 안전판: 아주 쉬운 판 (거의 안 나온다)
    for (let tries = 0; !pick && tries < 200; tries++) {
      const B = tryBuild({ ...d, ele: 0, zz: 0, hid: 0, rock: 0 }, r, si);
      if (!B) continue;
      const L = B as Layout, p = plan(L, newSim(L), 24);
      if (!p) continue;
      L.sol = p.seq;
      L.par = Math.min(BENCH - 1, p.peak + 1);
      L.combo = Math.max(2, p.best - 1);
      L.mis = 'combo';
      L.relax = ['fallback'];
      L.habit = habitRun(L);
      pick = L;
    }
  }
  CACHE.set(key, pick!);
  return pick!;
}

// ───────── 상태 ─────────
interface Ev { t: number; kind: string; x: number; y: number; text?: string; col?: string; v?: number }
/** 동물마다 화면에서 무엇을 하고 있나 (연출용, 시뮬레이션과 함께 결정적으로 기록) */
interface Mv {
  st: 'crowd' | 'out' | 'bench' | 'tobus' | 'fall';
  /** 나서기 시작한 틱 · 길(칸 번호) · 걸리는 틱 · 탈 버스 번호(-1 의자) · 의자에서 일어선 틱 */
  t0: number; path: number[]; dur: number; bus: number; t1: number;
  /** 끙(막힘) 톡 받은 틱 */
  nope: number;
}
interface BusT { arrive: number; depart: number; streak: number; riders: { id: number; at: number }[] }
export interface BusState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'end' | 'result'; pt: number;
  L: Layout; S: Sim; mv: Mv[]; bt: BusT[]; endAt: number;
  /** 화면의 의자 줄 (떠난 틱이 지나면 빠진다) */
  vb: { id: number; leave: number }[];
  down: boolean; ax: number; ay: number; press: number; taps: number; nopes: number; lastTap: number; tries: number;
  hearts: number; stars: number; got: number; pts: number; ok: boolean; why: string; won: boolean; dead: boolean;
  seen: Set<string>; tips: Set<string>; events: Ev[]; news: { text: string; t: number } | null; newsQ: string[]; startT: number; clearT: number;
}

const ev = (s: BusState, kind: string, x: number, y: number, text?: string, col?: string, v?: number) => s.events.push({ t: s.t, kind, x, y, text, col, v });
function tip(s: BusState, key: string, text: string) {
  if (s.tips.has(key) || s.newsQ.length) return;
  s.tips.add(key);
  s.newsQ.push(text);
}
function see(s: BusState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

function newStage(s: BusState) {
  const d = STAGES[s.stage];
  s.L = layoutFor(s.seed, s.stage);
  s.S = newSim(s.L);
  s.mv = s.L.an.map(() => ({ st: 'crowd', t0: 0, path: [], dur: 0, bus: -1, t1: 0, nope: -99 }));
  s.bt = s.L.buses.map(() => ({ arrive: 1e9, depart: 1e9, streak: 0, riders: [] }));
  s.vb = [];
  s.bt[0].arrive = s.t + BUS_IN + 10;
  s.phase = 'play';
  s.pt = 0;
  s.endAt = 0;
  s.startT = s.t;
  s.got = 0;
  s.lastTap = -99;
  // 🧪 C002 ⑤: 앞 판 말풍선이 남아 새 판 안내가 늦게 뜨지 않게 비운다
  s.news = null;
  s.newsQ = [];
  see(s, d.key, d.news);
  ev(s, 'stage', 0.5, 0.5, `${s.stage + 1}판 · ${d.name}`, '#fff6d6');
}

/** [M0] 스튜디오: i번째 판부터 시작(이어 하기·확인용) */
export function startStage(s: BusState, i: number) {
  s.stage = Math.max(0, Math.min(STAGES.length - 1, i));
  newStage(s);
}

function finish(s: BusState, ok: boolean, why = '') {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  if (ok) {
    const L = s.L, S = s.S;
    const st = starsOf(L, S);
    s.got = st;
    s.stars += st;
    s.pts += st * STAR_PTS + (BENCH - S.peak) * LEFT_PTS;
    s.clearT = s.t;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 0.5, 0.5, `${s.stage + 1}판 완성! ${'★'.repeat(st)}${'☆'.repeat(3 - st)}`, '#fff1a8', st);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 0.5, 0.5, why, '#ffd0c8');
  }
}

// ───────── 화면 좌표 (캔버스 폭 = 1, 세로 0~A) ─────────
/** 광장: 맨 앞줄 가운데 y · 줄 간격 · 칸 폭 */
const FRONT_Y = 0.79, CURB_Y = 0.865;
const rowGap = (L: Layout) => Math.min(0.122, 0.6 / Math.max(1, L.R - 1));
const cellW = (L: Layout) => Math.min(0.15, 0.9 / L.C);
const rowScale = (L: Layout, r: number) => 0.84 + 0.16 * (L.R <= 1 ? 1 : r / (L.R - 1));
function cellXY(L: Layout, k: number): [number, number] {
  const r = (k / L.C) | 0, c = k % L.C, sc = rowScale(L, r);
  return [0.5 + (c - (L.C - 1) / 2) * cellW(L) * sc, FRONT_Y - (L.R - 1 - r) * rowGap(L)];
}
function animalXY(L: Layout, i: number): [number, number] {
  const cs = L.an[i].cells;
  if (cs.length === 1) return cellXY(L, cs[0]);
  const a = cellXY(L, cs[0]), b = cellXY(L, cs[1]);
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}
/** 의자 자리 · 버스 문 앞 · 정류장의 버스 */
const BENCH_Y = 0.965, BENCH_X0 = 0.065, BENCH_DX = 0.08;
const seatX = (k: number) => BENCH_X0 + k * BENCH_DX;
/** 정류장 버스 가운데 x · 바퀴가 닿는 y · 버스 길이 · 문 앞 자리 · 줄 선 다음 버스 x */
const BUS_X = 0.635, BUS_Y = 1.215, BUS_W = 0.5, DOOR_X = 0.83, DOOR_Y = 0.995, QX = -0.07;
/** 화면 점(0~1, 0~A)이 가리키는 동물 */
function pickAt(L: Layout, S: Sim, x: number, y: number): number {
  let best = -1, bd = 1e9;
  const cw = cellW(L), rg = rowGap(L);
  for (let i = 0; i < L.an.length; i++) {
    if (S.gone[i]) continue;
    for (const k of L.an[i].cells) {
      const [cx, cy] = cellXY(L, k), sc = rowScale(L, (k / L.C) | 0);
      const dx = (x - cx) / (cw * sc * 0.55), dy = (y - (cy - 0.02)) / (rg * 0.62);
      const d = dx * dx + dy * dy;
      if (d < 1 && d < bd) (bd = d), (best = i);
    }
  }
  return best;
}

/** 버스가 바뀌는 중(꽉 찬 버스가 떠나고 다음 버스가 오는 중)엔 톡을 받지 않는다 — 보이는 버스와 실제 버스가 어긋나지 않게 */
const swapping = (s: BusState) => s.t < (s.bt[s.S.bus]?.arrive ?? 0);

/** 톡 한 번을 판에 적용하고 연출 기록을 남긴다 */
function doTap(s: BusState, i: number) {
  const L = s.L, S = s.S, a = L.an[i];
  const path = pathOut(L, S, i);
  const dur = 14 + 5 * path.length;
  const bus0 = S.bus;
  const m = s.mv[i];
  m.st = 'out';
  m.t0 = s.t;
  m.path = path;
  m.dur = dur;
  m.bus = -1;
  const [x, y] = animalXY(L, i);
  // 지금 버스와 같은 색이면 탄다 — 버스가 꽉 차 떠나는 시각을 정하기 전에 먼저 적어 둔다
  if (L.buses[bus0] && L.buses[bus0].col === a.col) {
    m.bus = bus0;
    s.bt[bus0].riders.push({ id: i, at: Math.max(s.t + dur, s.bt[bus0].arrive + 6) });
  }
  const res = tapSim(L, S, i, {
    depart: (b) => {
      const bt = s.bt[b];
      const last = bt.riders.reduce((v, r) => Math.max(v, r.at), bt.arrive);
      bt.depart = Math.max(bt.arrive + 12, last + 10, b > 0 ? s.bt[b - 1].depart + BUS_GAP : 0);
      bt.streak = S.streak;
      if (s.bt[b + 1]) s.bt[b + 1].arrive = bt.depart + BUS_GAP;
    },
    board: (j, b, k) => {
      const mj = s.mv[j];
      mj.st = 'tobus';
      mj.bus = b;
      mj.t1 = Math.max(s.bt[b].arrive + 4 + k * 8, mj.t0 + mj.dur + 4);
      s.bt[b].riders.push({ id: j, at: mj.t1 + 24 });
      const v = s.vb.find((e) => e.id === j);
      if (v) v.leave = mj.t1;
    },
    wake: (j) => {
      const [wx, wy] = animalXY(L, j);
      ev(s, 'wake', wx, wy, '번쩍!', '#fff3a0');
    },
    // C003 줄줄이 따라 타기: 손잡은 같은 색 친구가 한 박자씩 늦게 뒤따라 나와 같은 버스에 탄다
    follow: (j, k) => {
      const mj = s.mv[j], pj = pathOut(L, S, j), dj = 14 + 5 * pj.length, lag = 7 * (k + 1);
      mj.st = 'out';
      mj.t0 = s.t + lag;
      mj.path = pj;
      mj.dur = dj;
      mj.bus = bus0;
      s.bt[bus0].riders.push({ id: j, at: Math.max(s.t + lag + dj, s.bt[bus0].arrive + 6) });
      const [fx, fy] = animalXY(L, j);
      ev(s, 'go', fx, fy, k === 0 ? '줄줄이!' : '', CN[a.col], j);
    },
  });
  s.taps++;
  s.lastTap = s.t;
  ev(s, 'go', x, y, '', CN[a.col], i);
  if (res === 'bench' || res === 'fail') s.vb.push({ id: i, leave: res === 'fail' ? -1 : 1e9 });
  if (res === 'bench') {
    see(s, 'sit', '🪑 의자 — 맞는 버스가 오면 저절로 타요');
    if (a.big) tip(s, 'bigbench', '🐘 코끼리가 의자 두 칸을 차지했어요!');
  }
  if (res === 'fail') {
    m.st = 'fall';
    s.phase = 'end';
    s.endAt = s.t + dur + 50;
    s.why = '의자가 꽉 차서 앉을 데가 없어요!';
    return;
  }
  // 새로 잠이 깬 친구들(모두 막혔을 때)
  const woke: number[] = [];
  moves(L, S, woke);
  for (const j of woke) {
    const [wx, wy] = animalXY(L, j);
    ev(s, 'wake', wx, wy, '하암~', '#fff3a0');
  }
  if (S.left === 0) {
    s.phase = 'end';
    const lastB = s.bt.reduce((v, b) => (b.depart < 1e9 ? Math.max(v, b.depart) : v), s.t);
    s.endAt = lastB + 60;
  }
  if (S.used >= BENCH - 1) tip(s, 'nervous', '😰 의자가 거의 꽉 찼어요 — 지금 버스 색부터!');
}

export const animalbus: GameDef<BusState> = {
  id: 'animalbus',
  name: '동물 버스 정류장',
  genes: ['boarding', 'sort', 'pointer'],
  twist: '톡 한 번에 펭귄이 빽빽한 군중을 비집고 나와(이웃들이 우르르 비킨다) 뒤뚱뒤뚱 같은 색 버스에 폴짝 — 꽉 차면 빵빵! 창문마다 손 흔들며 떠나고, 의자에서 기다리던 친구가 다음 버스에 저절로 쪼르르 타서 버스가 줄줄이 연달아 떠나기도 한다',
  rules: ['길이 트인 동물을 톡 → 같은 색 버스면 타요, 붙어 선 같은 색 친구도 줄줄이! (아니면 대기 의자)', '의자 5칸이 모자라면 실패, 모두 태우면 완성! 다음 버스 색을 보고 순서를 정해요'],
  controls: 'touch',
  hint: '동물을 톡(누르면 갈 길이 보여요) / 화살표로 고르고 스페이스',
  aspect: A,
  art: {
    concept: '동물 마을 광장 버스 정류장 디오라마',
    mood: '해 질 녘 작은 동물 마을 — 돌 깔린 광장에 색색 동물이 옹기종기, 빨간 지붕 집들과 가로등, 정류장 지붕 위 고양이가 꼬리를 흔들고 장난감 같은 버스가 빵빵 오간다.',
    palette: { bg: '#2d2a3e', ink: '#fffaf0', muted: '#cfc6e0', accent: '#ffc857', hot: '#ff6b6b', soft: '#f3e3c0' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s = {
      rng: mulberry32(seed), seed, t: 0, stage: 0, phase: 'play', pt: 0, endAt: 0,
      down: false, ax: 0, ay: 0, press: -1, taps: 0, nopes: 0, lastTap: -99, tries: 0,
      hearts: 3, stars: 0, got: 0, pts: 0, ok: false, why: '', won: false, dead: false,
      seen: new Set<string>(), tips: new Set<string>(), events: [], news: null, newsQ: [], startT: 0, clearT: 0,
    } as unknown as BusState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    const p = inp.pointer ?? null, release = !p && s.down;
    if (p) (s.ax = p.x), (s.ay = p.y * A);
    if (p && !s.down) s.press = s.phase === 'play' ? pickAt(s.L, s.S, s.ax, s.ay) : -1;
    s.down = !!p;
    s.t++;
    s.pt++;
    if (s.newsQ.length && (!s.news || s.t - s.news.t > NEWS_T)) s.news = { text: s.newsQ.shift()!, t: s.t };
    if (s.vb.length > 8) s.vb = s.vb.filter((e) => e.leave > s.t - 60);
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
    if (s.phase === 'end') {
      if (s.t >= s.endAt) finish(s, s.S.left === 0, s.why);
      return;
    }
    // 2판부터 다음 버스 미리 보기 안내
    if (s.stage >= 1 && s.t - s.startT === 100) see(s, 'preview', '🚌 다음 버스 색이 왼쪽에 보여요 — 순서를 짜요');
    if (!release) return;
    // 뗀 자리의 동물 (누른 동물에서 손가락이 멀리 가면 그 자리 동물)
    const at = pickAt(s.L, s.S, s.ax, s.ay);
    const i = at >= 0 ? at : -1;
    s.press = -1;
    if (i < 0) return;
    const L = s.L, S = s.S, ms = moves(L, S);
    if (swapping(s)) {
      const [x, y] = animalXY(L, i);
      ev(s, 'nope', x, y, '잠깐! 버스가 와요', '#e8f4ff');
      return;
    }
    if (!ms.includes(i)) {
      // 끙! (막힘·잠) — 벌이 아니라 웃음, 톡 수만 센다
      s.nopes++;
      s.taps++;
      s.mv[i].nope = s.t;
      const [x, y] = animalXY(L, i);
      const sleepy = L.an[i].sleep && !S.awake[i] && isOpen(L, i, reach(L, S));
      ev(s, 'nope', x, y, sleepy ? '쿨쿨…' : '끙!', sleepy ? '#d8e4ff' : '#ffe3d6');
      if (sleepy) tip(s, 'sleepy', '💤 옆 친구가 떠나야 깨요');
      else tip(s, 'stuck', '앞이 막혔어요 — 빈칸으로 이어진 동물만 나가요');
      return;
    }
    doTap(s, i);
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const at = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
const tapPoint = (L: Layout, i: number): Input => {
  const [x, y] = cellXY(L, L.an[i].cells[0]);
  return at(x, y - 0.02);
};
/** 사람처럼: 버스가 서 있고 방금 톡 한 동물이 빠져나간 뒤에 다음 톡 */
const calm = (s: BusState) => s.phase === 'play' && !swapping(s) && s.t - s.lastTap >= 16;

/** 봇: 판 전체를 내다본 풀이(빔 탐색)를 따른다. 어긋나면 그 자리에서 다시 내다본다 */
const brain = new WeakMap<object, { key: string; seq: number[] }>();
export const animalbusSmart: Bot<BusState> = {
  name: '정류장 박사',
  act(s) {
    if (s.down || !calm(s)) return NO;
    const L = s.L, S = s.S;
    const key = `${s.stage}:${s.tries}`;
    let m = brain.get(s);
    if (!m || m.key !== key) brain.set(s, (m = { key, seq: L.sol.slice() }));
    const ms = moves(L, S);
    if (!m.seq.length || !ms.includes(m.seq[0])) {
      const p = plan(L, S, 8);
      m.seq = p ? p.seq : [ms[0]];
    }
    const i = m.seq.shift()!;
    return tapPoint(L, i);
  },
};

/** 봇: 버릇 하나 — 지금 버스 색이 열려 있으면 그걸, 없으면 맨 앞줄 왼쪽부터 (전략 깊이 측정용) */
export const animalbusHabit: Bot<BusState> = {
  name: '버릇쟁이',
  act(s) {
    if (s.down || !calm(s)) return NO;
    const ms = moves(s.L, s.S);
    if (!ms.length) return NO;
    return tapPoint(s.L, habitPick(s.L, s.S, ms));
  },
};

const dumbAt = new WeakMap<object, { next: number; until: number; p: { x: number; y: number } }>();
/** 봇: 아무 때나 광장 아무 데나 톡 (가끔 화면 아무 데나) */
export const animalbusRandom: Bot<BusState> = {
  name: '아무 데나 톡',
  act(s, rng) {
    let m = dumbAt.get(s);
    if (!m) dumbAt.set(s, (m = { next: 20 + Math.floor(rng() * 50), until: -1, p: { x: 0, y: 0 } }));
    if (s.t < m.until) return { tap: false, dir: 0, pointer: m.p };
    if (s.t < m.next) return NO;
    m.next = s.t + 24 + Math.floor(rng() * 70);
    m.until = s.t + 2 + Math.floor(rng() * 5);
    if (rng() < 0.15) m.p = { x: rng(), y: rng() };
    else {
      const L = s.L, k = Math.floor(rng() * L.C * L.R), [x, y] = cellXY(L, k);
      m.p = { x: x + (rng() - 0.5) * 0.06, y: (y - 0.02 + (rng() - 0.5) * 0.05) / A };
    }
    return { tap: false, dir: 0, pointer: m.p };
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const TAU = Math.PI * 2;
const ease = (q: number) => (q <= 0 ? 0 : q >= 1 ? 1 : q * q * (3 - 2 * q));
const lerp = (a: number, b: number, q: number) => a + (b - a) * q;
const hsh2 = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 종마다 [밝은, 몸, 어두운] */
const BODY = [
  ['#a9d0ff', '#3f82e4', '#1d4c9c'],
  ['#ffd6e5', '#f68fb4', '#c4527f'],
  ['#fff4a8', '#ffd23a', '#d39500'],
  ['#c0f3b0', '#4fc566', '#227d38'],
];
const BUSC = [
  ['#8cbcff', '#2f70d8', '#173f86'],
  ['#ffb8d2', '#ea6b9b', '#9e3762'],
  ['#ffeb8f', '#f4bf16', '#a87b00'],
  ['#a4eba2', '#37af55', '#1b6f32'],
];
const ELE = ['#e3e6ee', '#aab0c0', '#6e7588'];
const COLHEX = ['#4d8ff0', '#f57aa8', '#ffcf2e', '#4cc767'];

/** 표정: 0 보통 · 1 신남 · 2 초조(땀) · 3 끙(힘줌) · 4 쿨쿨 · 5 엉엉 · 6 손 흔들기 · 7 깜짝 */
type Mood = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
interface CritOpt { hood?: boolean; cap?: boolean; walk?: number; tilt?: number; dim?: number; seed?: number; head?: boolean }

function eyes(ctx: CanvasRenderingContext2D, ex: number, ey: number, er: number, mood: Mood, t: number, seed: number) {
  ctx.lineCap = 'round';
  for (const sx of [-1, 1]) {
    const x = sx * ex, y = ey;
    if (mood === 1 || mood === 6) {
      ctx.strokeStyle = '#2a1f2e';
      ctx.lineWidth = er * 0.75;
      ctx.beginPath();
      ctx.arc(x, y + er * 0.5, er * 0.9, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (mood === 3) {
      ctx.strokeStyle = '#2a1f2e';
      ctx.lineWidth = er * 0.7;
      ctx.beginPath();
      ctx.moveTo(x - er * 0.9 * sx, y - er * 0.7);
      ctx.lineTo(x + er * 0.6 * sx, y);
      ctx.lineTo(x - er * 0.9 * sx, y + er * 0.7);
      ctx.stroke();
    } else if (mood === 4 || mood === 5) {
      ctx.strokeStyle = '#2a1f2e';
      ctx.lineWidth = er * 0.6;
      ctx.beginPath();
      ctx.arc(x, y - er * 0.3, er * 0.85, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      if (mood === 5) {
        ctx.fillStyle = 'rgba(120,190,255,.9)';
        const k = ((t * 0.08 + (sx > 0 ? 0.5 : 0)) % 1) * er * 3;
        ctx.beginPath();
        ctx.ellipse(x + sx * er * 0.6, y + er * 0.8 + k, er * 0.32, er * 0.5, 0, 0, TAU);
        ctx.fill();
      }
    } else {
      const big = mood === 2 || mood === 7 ? 1.35 : 1;
      ctx.fillStyle = '#ffffff';
      if (big > 1) {
        ctx.beginPath();
        ctx.arc(x, y, er * big, 0, TAU);
        ctx.fill();
      }
      // 깜빡
      const blink = (t + seed * 37) % 190 < 6;
      ctx.fillStyle = '#2a1f2e';
      if (blink) ctx.fillRect(x - er * 0.8, y - er * 0.12, er * 1.6, er * 0.24);
      else {
        ctx.beginPath();
        ctx.arc(x, y, big > 1 ? er * 0.55 : er, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x - er * 0.3, y - er * 0.35, er * 0.33, 0, TAU);
        ctx.fill();
      }
    }
  }
}
function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mood: Mood) {
  ctx.strokeStyle = '#3a2228';
  ctx.lineWidth = Math.max(1.2, r * 0.35);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (mood === 1 || mood === 6) {
    ctx.fillStyle = '#c2374f';
    ctx.arc(x, y - r * 0.2, r * 1.1, 0.1, Math.PI - 0.1);
    ctx.fill();
  } else if (mood === 2) {
    ctx.moveTo(x - r, y);
    for (let k = 1; k <= 4; k++) ctx.lineTo(x - r + (k * r) / 2, y + (k % 2 ? -r * 0.35 : 0));
    ctx.stroke();
  } else if (mood === 3) {
    ctx.moveTo(x - r * 0.8, y);
    ctx.lineTo(x + r * 0.8, y);
    ctx.stroke();
  } else if (mood === 5 || mood === 7) {
    ctx.fillStyle = '#5a2030';
    ctx.ellipse(x, y + r * 0.2, r * 0.55, r * (mood === 5 ? 0.6 : 0.75), 0, 0, TAU);
    ctx.fill();
  } else if (mood === 4) {
    ctx.arc(x, y, r * 0.4, 0, TAU);
    ctx.stroke();
  } else {
    ctx.arc(x, y - r * 0.4, r * 0.8, 0.35, Math.PI - 0.35);
    ctx.stroke();
  }
}
function sweat(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, t: number) {
  const k = (t * 0.05) % 1;
  ctx.globalAlpha = 1 - k * 0.6;
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath();
  ctx.moveTo(x, y - r + k * r * 2);
  ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.3 + k * r * 2, x, y + r * 0.7 + k * r * 2);
  ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.3 + k * r * 2, x, y - r + k * r * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** 작은 동물 하나 (x,y = 발이 닿는 자리, u = 몸 반지름 px) */
function critter(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, sp: number, mood: Mood, t: number, o: CritOpt = {}) {
  const k = o.seed ?? 0;
  const bob = o.walk !== undefined ? Math.abs(Math.sin(o.walk)) * u * 0.28 : Math.sin(t * 0.06 + k) * u * 0.04;
  const tilt = (o.tilt ?? 0) + (o.walk !== undefined ? Math.sin(o.walk) * 0.2 : 0);
  if (!o.head) {
    ctx.fillStyle = 'rgba(28,18,40,.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, u * 0.95, u * 0.3, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(tilt);
  const c = BODY[sp], by = -u * 0.98;
  // 발 (걸을 땐 번갈아 들썩)
  if (!o.head) {
    ctx.fillStyle = o.hood ? '#6f6a8e' : sp === 0 || sp === 2 ? '#ff9b3d' : sp === 1 ? '#d96a92' : '#2f9a48';
    for (const sx of [-1, 1]) {
      const lift = o.walk !== undefined ? Math.max(0, Math.sin(o.walk + (sx > 0 ? 0 : Math.PI))) * u * 0.2 : 0;
      ctx.beginPath();
      ctx.ellipse(sx * u * 0.4, -lift - u * 0.04, u * 0.27, u * 0.14, 0, 0, TAU);
      ctx.fill();
    }
  }
  if (o.hood) {
    // 우비: 색을 감춘다 — 후드 사이로 눈만
    const g = ctx.createLinearGradient(-u, by - u, u, by + u);
    g.addColorStop(0, '#eef0fb');
    g.addColorStop(1, '#9196b8');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, by - u * 1.25);
    ctx.quadraticCurveTo(u * 1.05, by - u * 0.9, u * 0.98, by + u * 0.75);
    ctx.lineTo(-u * 0.98, by + u * 0.75);
    ctx.quadraticCurveTo(-u * 1.05, by - u * 0.9, 0, by - u * 1.25);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80,80,120,.5)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#2d2a44';
    ctx.beginPath();
    ctx.ellipse(0, by - u * 0.2, u * 0.55, u * 0.42, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * u * 0.2, by - u * 0.22, u * 0.09, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#5b5f8a';
    ctx.font = `900 ${u * 0.8}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 0, by + u * 0.48);
    ctx.restore();
    return;
  }
  // 날개·지느러미 (뒤)
  const wave = mood === 6 ? Math.sin(t * 0.4 + k) : 0;
  if (sp === 0 || sp === 2) {
    ctx.fillStyle = sp === 0 ? c[2] : '#f0b400';
    for (const sx of [-1, 1]) {
      ctx.save();
      ctx.translate(sx * u * 0.82, by + u * 0.15);
      ctx.rotate(sx * (0.35 + (sx > 0 && mood === 6 ? -1.9 + wave * 0.5 : 0) + (mood === 2 ? Math.sin(t * 0.5) * 0.3 : 0)));
      ctx.beginPath();
      ctx.ellipse(0, u * 0.18, u * 0.2, u * 0.42, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }
  // 몸
  const g = ctx.createRadialGradient(-u * 0.35, by - u * 0.45, u * 0.1, 0, by, u * 1.15);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.55, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  // 개구리·돼지: 귀·눈 혹이 먼저
  if (sp === 1) {
    ctx.fillStyle = c[2];
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * u * 0.22, by - u * 0.82);
      ctx.lineTo(sx * u * 0.7, by - u * 1.12);
      ctx.lineTo(sx * u * 0.72, by - u * 0.55);
      ctx.fill();
    }
    ctx.fillStyle = g;
  }
  if (sp === 3) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * u * 0.42, by - u * 0.78, u * 0.32, 0, TAU);
      ctx.fill();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, by, u * 0.92, u * 0.98, 0, 0, TAU);
  ctx.fill();
  if (o.dim) {
    ctx.fillStyle = `rgba(70,62,92,${o.dim})`;
    ctx.beginPath();
    ctx.ellipse(0, by, u * 0.92, u * 0.98, 0, 0, TAU);
    ctx.fill();
  }
  // 배·얼굴
  let eyeY = by - u * 0.25, eyeX = u * 0.28, mouthY = by + u * 0.2;
  const er = u * 0.11;
  if (sp === 0) {
    ctx.fillStyle = '#f5f8ff';
    ctx.beginPath();
    ctx.ellipse(0, by + u * 0.28, u * 0.58, u * 0.62, 0, 0, TAU);
    ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * u * 0.25, by - u * 0.22, u * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ff9b3d';
    ctx.beginPath();
    ctx.moveTo(-u * 0.15, by - u * 0.04);
    ctx.lineTo(u * 0.15, by - u * 0.04);
    ctx.lineTo(0, by + u * 0.14);
    ctx.fill();
    mouthY = by + u * 0.3;
  } else if (sp === 1) {
    ctx.fillStyle = '#ffb4ce';
    ctx.strokeStyle = c[2];
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, by + u * 0.02, u * 0.3, u * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#9b3b62';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * u * 0.1, by + u * 0.02, u * 0.05, u * 0.08, 0, 0, TAU);
      ctx.fill();
    }
    mouthY = by + u * 0.38;
  } else if (sp === 2) {
    ctx.strokeStyle = '#e0a000';
    ctx.lineWidth = Math.max(1.2, u * 0.08);
    ctx.lineCap = 'round';
    for (const a of [-0.35, 0, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(a * u * 0.4, by - u * 0.95);
      ctx.quadraticCurveTo(a * u * 0.9, by - u * 1.35, a * u * 1.1 + u * 0.08, by - u * 1.3);
      ctx.stroke();
    }
    ctx.fillStyle = '#ff8a2a';
    ctx.beginPath();
    ctx.moveTo(-u * 0.13, by - u * 0.02);
    ctx.lineTo(0, by - u * 0.14);
    ctx.lineTo(u * 0.13, by - u * 0.02);
    ctx.lineTo(0, by + u * 0.1);
    ctx.fill();
    mouthY = by + u * 0.25;
  } else {
    ctx.fillStyle = 'rgba(230,255,200,.55)';
    ctx.beginPath();
    ctx.ellipse(0, by + u * 0.35, u * 0.6, u * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * u * 0.42, by - u * 0.8, u * 0.22, 0, TAU);
      ctx.fill();
    }
    eyeY = by - u * 0.8;
    eyeX = u * 0.42;
    mouthY = by + u * 0.05;
  }
  // 볼
  if (sp !== 3 || mood === 3) {
    ctx.fillStyle = mood === 3 ? 'rgba(255,70,70,.55)' : 'rgba(255,120,150,.4)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * u * 0.55, by + u * 0.06, u * 0.15, u * 0.1, 0, 0, TAU);
      ctx.fill();
    }
  }
  eyes(ctx, eyeX, eyeY, er * (sp === 3 ? 1.2 : 1), mood, t, k);
  if (sp === 3) {
    ctx.strokeStyle = '#1d5e2c';
    ctx.lineWidth = Math.max(1.2, u * 0.07);
    ctx.beginPath();
    if (mood === 1 || mood === 6 || mood === 0) ctx.arc(0, mouthY - u * 0.3, u * 0.45, 0.45, Math.PI - 0.45);
    else ctx.moveTo(-u * 0.3, mouthY), ctx.lineTo(u * 0.3, mouthY);
    ctx.stroke();
  } else if (sp !== 0 || mood !== 0) mouth(ctx, 0, mouthY, u * 0.1, mood);
  // 잠꾸러기 수면 모자
  if (o.cap) {
    ctx.fillStyle = '#7d8bd8';
    ctx.beginPath();
    ctx.moveTo(-u * 0.75, by - u * 0.55);
    ctx.quadraticCurveTo(0, by - u * 1.45, u * 0.95, by - u * 0.9);
    ctx.quadraticCurveTo(u * 0.4, by - u * 0.7, u * 0.75, by - u * 0.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-u * 0.78, by - u * 0.62, u * 1.56, u * 0.14);
    ctx.beginPath();
    ctx.arc(u * 0.98, by - u * 0.88, u * 0.14, 0, TAU);
    ctx.fill();
  }
  if (mood === 2) sweat(ctx, u * 0.75, by - u * 0.6, u * 0.16, t + k * 13);
  ctx.restore();
}

/** 코끼리 (두 칸): 회색 몸에 탈 버스 색 모자·목도리 */
function elephant(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, col: number, mood: Mood, t: number, o: CritOpt = {}) {
  const bob = o.walk !== undefined ? Math.abs(Math.sin(o.walk * 0.7)) * u * 0.18 : Math.sin(t * 0.04) * u * 0.03;
  if (!o.head) {
    ctx.fillStyle = 'rgba(28,18,40,.32)';
    ctx.beginPath();
    ctx.ellipse(x, y, u * 1.75, u * 0.36, 0, 0, TAU);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate((o.tilt ?? 0) + (o.walk !== undefined ? Math.sin(o.walk * 0.7) * 0.08 : 0));
  const by = -u * 1.1;
  if (!o.head) {
    ctx.fillStyle = ELE[2];
    for (const sx of [-1, 1]) for (const fx2 of [0.55, 1.15]) ctx.fillRect(sx * u * fx2 - u * 0.17, -u * 0.45, u * 0.34, u * 0.45);
  }
  const g = ctx.createRadialGradient(-u * 0.5, by - u * 0.6, u * 0.2, 0, by, u * 1.8);
  g.addColorStop(0, ELE[0]);
  g.addColorStop(0.6, ELE[1]);
  g.addColorStop(1, ELE[2]);
  // 귀
  for (const sx of [-1, 1]) {
    ctx.fillStyle = ELE[1];
    ctx.beginPath();
    ctx.ellipse(sx * u * 1.15, by - u * 0.2, u * 0.62, u * 0.75, sx * 0.3, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8b4c4';
    ctx.beginPath();
    ctx.ellipse(sx * u * 1.18, by - u * 0.18, u * 0.4, u * 0.52, sx * 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, by, u * 1.2, u * 1.08, 0, 0, TAU);
  ctx.fill();
  if (o.dim) {
    ctx.fillStyle = `rgba(70,62,92,${o.dim})`;
    ctx.beginPath();
    ctx.ellipse(0, by, u * 1.2, u * 1.08, 0, 0, TAU);
    ctx.fill();
  }
  // 목도리 (버스 색)
  const bc = BUSC[col];
  ctx.fillStyle = bc[1];
  ctx.beginPath();
  ctx.ellipse(0, by + u * 0.72, u * 0.95, u * 0.2, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(u * 0.35, by + u * 0.72, u * 0.22, u * 0.5);
  // 코
  ctx.strokeStyle = ELE[1];
  ctx.lineWidth = u * 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const sw = mood === 6 ? Math.sin(t * 0.3) * 0.5 : Math.sin(t * 0.05) * 0.2;
  ctx.moveTo(0, by);
  ctx.quadraticCurveTo(u * (0.1 + sw * 0.3), by + u * 0.6, u * (0.35 + sw), by + u * (mood === 6 ? 0.2 : 0.75));
  ctx.stroke();
  eyes(ctx, u * 0.42, by - u * 0.25, u * 0.11, mood, t, 3);
  if (mood === 2) sweat(ctx, u * 0.95, by - u * 0.7, u * 0.18, t);
  // 모자 (버스 색)
  ctx.fillStyle = bc[1];
  ctx.beginPath();
  ctx.ellipse(-u * 0.1, by - u * 0.95, u * 0.55, u * 0.14, -0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = bc[0];
  ctx.beginPath();
  ctx.moveTo(-u * 0.45, by - u * 0.98);
  ctx.lineTo(-u * 0.3, by - u * 1.5);
  ctx.lineTo(u * 0.22, by - u * 1.5);
  ctx.lineTo(u * 0.3, by - u * 1.02);
  ctx.fill();
  ctx.fillStyle = bc[2];
  ctx.fillRect(-u * 0.42, by - u * 1.15, u * 0.7, u * 0.12);
  if (o.cap) {
    ctx.fillStyle = '#7d8bd8';
    ctx.beginPath();
    ctx.arc(u * 0.3, by - u * 1.55, u * 0.15, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/** 버스 (오른쪽을 본다). x = 가운데, yb = 바퀴가 닿는 곳, len = 길이(px) */
function bus(ctx: CanvasRenderingContext2D, x: number, yb: number, len: number, col: number, cap: number, riders: { sp: number; big: boolean; at: number }[], t: number, move: number, wave: boolean) {
  const c = BUSC[col], dbl = cap > 3, hgt = len * (dbl ? 0.44 : 0.31), x0 = x - len / 2, x1 = x + len / 2, top = yb - len * 0.06 - hgt;
  const sq = wave ? 1 + Math.sin(t * 0.5) * 0.015 : 1;
  ctx.fillStyle = 'rgba(15,10,25,.4)';
  ctx.beginPath();
  ctx.ellipse(x, yb, len * 0.55, len * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, yb);
  ctx.scale(1, sq);
  ctx.translate(-x, -yb);
  // 지붕 두께 (3/4 시점)
  const d = len * 0.045;
  ctx.fillStyle = c[0];
  ctx.beginPath();
  ctx.roundRect(x0 + d * 0.6, top - d, len - d * 0.6, d * 1.6, d);
  ctx.fill();
  // 몸통
  const g = ctx.createLinearGradient(0, top, 0, yb);
  g.addColorStop(0, c[0]);
  g.addColorStop(0.3, c[1]);
  g.addColorStop(1, c[2]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x0, top, len, hgt + len * 0.03, [len * 0.05, len * 0.09, len * 0.03, len * 0.03]);
  ctx.fill();
  // 흰 띠
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.fillRect(x0 + len * 0.02, top + hgt * (dbl ? 0.86 : 0.72), len * 0.96, len * 0.022);
  // 창문 + 탄 동물
  const rows = dbl ? 2 : 1, per = 3, ww = len * 0.19, wh = hgt * (dbl ? 0.32 : 0.46);
  let seat = 0;
  const slots: { wx: number; wy: number; n: number; r: (typeof riders)[number] }[] = [];
  for (const r of riders) {
    const n = r.big ? Math.min(2, cap - seat) : 1;
    if (seat >= cap) break;
    const row = Math.floor(seat / per), cl = seat % per;
    const span = r.big && n === 2 && cl < per - 1 ? 2 : 1;
    slots.push({ wx: x0 + len * 0.06 + (cl + (span - 1) / 2) * (ww + len * 0.02) + ww / 2, wy: top + hgt * (dbl ? 0.08 + row * 0.42 : 0.12) + wh, n: span, r });
    seat += n;
  }
  for (let row = 0; row < rows; row++)
    for (let cl = 0; cl < per; cl++) {
      const wx = x0 + len * 0.06 + cl * (ww + len * 0.02), wy = top + hgt * (dbl ? 0.08 + row * 0.42 : 0.12);
      const wg = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
      wg.addColorStop(0, '#2b3756');
      wg.addColorStop(1, '#4a5d86');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.roundRect(wx, wy, ww, wh, len * 0.02);
      ctx.fill();
    }
  for (const sl of slots) {
    ctx.save();
    ctx.beginPath();
    const half = (sl.n * ww + (sl.n - 1) * len * 0.02) / 2;
    ctx.rect(sl.wx - half, sl.wy - wh - len * 0.06, half * 2, wh + len * 0.06);
    ctx.clip();
    const hop = Math.max(0, 1 - (t - sl.r.at) / 10);
    const yy = sl.wy + wh * 0.45 + hop * wh * 0.6;
    if (sl.r.big) elephant(ctx, sl.wx, yy + wh * 0.25, ww * 0.34, col, wave ? 6 : 1, t, { head: true });
    else critter(ctx, sl.wx, yy, ww * 0.38, sl.r.sp, wave ? 6 : 1, t, { head: true, seed: sl.r.at });
    ctx.restore();
    // 떠날 때: 창밖으로 손을 흔든다
    if (wave) {
      const ph = Math.sin(t * 0.45 + sl.r.at);
      ctx.fillStyle = sl.r.big ? ELE[1] : BODY[sl.r.sp][1];
      ctx.strokeStyle = 'rgba(0,0,0,.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sl.wx + ww * (0.32 + ph * 0.1), sl.wy - wh - len * 0.012 - Math.abs(ph) * len * 0.012, ww * 0.12, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }
  // 창문 반짝
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  for (let row = 0; row < rows; row++) {
    const wy = top + hgt * (dbl ? 0.08 + row * 0.42 : 0.12);
    ctx.beginPath();
    ctx.moveTo(x0 + len * 0.06, wy + wh);
    ctx.lineTo(x0 + len * 0.06 + ww * 0.5, wy);
    ctx.lineTo(x0 + len * 0.06 + ww * 0.8, wy);
    ctx.lineTo(x0 + len * 0.06 + ww * 0.3, wy + wh);
    ctx.fill();
  }
  // 앞유리 + 운전사 곰
  const fx0 = x1 - len * 0.2, fy = top + hgt * (dbl ? 0.5 : 0.12), fw = len * 0.17, fh = hgt * (dbl ? 0.32 : 0.48);
  ctx.fillStyle = '#3c4a70';
  ctx.beginPath();
  ctx.roundRect(fx0, fy, fw, fh, [len * 0.02, len * 0.06, len * 0.01, len * 0.01]);
  ctx.fill();
  {
    const bx = fx0 + fw * 0.45, byy = fy + fh * 0.75, br = fw * 0.3;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(fx0, fy, fw, fh, len * 0.02);
    ctx.clip();
    ctx.fillStyle = '#a0704a';
    ctx.beginPath();
    ctx.arc(bx, byy, br, 0, TAU);
    ctx.arc(bx - br * 0.75, byy - br * 0.75, br * 0.32, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8cfa8';
    ctx.beginPath();
    ctx.ellipse(bx + br * 0.3, byy + br * 0.2, br * 0.42, br * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1f2e';
    ctx.beginPath();
    ctx.arc(bx + br * 0.15, byy - br * 0.2, br * 0.12, 0, TAU);
    ctx.arc(bx + br * 0.5, byy + br * 0.05, br * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2b2b5c';
    ctx.fillRect(bx - br * 1.05, byy - br * 1.1, br * 1.9, br * 0.42);
    ctx.fillRect(bx + br * 0.4, byy - br * 0.78, br * 0.7, br * 0.15);
    ctx.restore();
  }
  // 문 (앞쪽)
  const dx0 = x1 - len * 0.36, dw = len * 0.13;
  ctx.fillStyle = 'rgba(30,40,70,.75)';
  ctx.beginPath();
  ctx.roundRect(dx0, top + hgt * (dbl ? 0.52 : 0.14), dw, hgt * (dbl ? 0.46 : 0.82), len * 0.012);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(dx0 + dw / 2, top + hgt * (dbl ? 0.54 : 0.16));
  ctx.lineTo(dx0 + dw / 2, top + hgt * 0.96);
  ctx.stroke();
  // 옆구리 동물 표시 (색을 못 봐도 읽히게)
  {
    const ex = x0 + len * 0.36, ey = top + hgt * (dbl ? 0.93 : 0.88), er = len * 0.055;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, TAU);
    ctx.fill();
    critter(ctx, ex, ey + er * 0.85, er * 0.72, col, 1, t, { head: true, seed: 5 });
  }
  // 헤드라이트·범퍼
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath();
  ctx.ellipse(x1 - len * 0.012, yb - len * 0.1, len * 0.012, len * 0.022, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#3a3346';
  ctx.fillRect(x0 - len * 0.01, yb - len * 0.06, len * 1.02, len * 0.03);
  // 바퀴
  for (const wx of [x0 + len * 0.2, x1 - len * 0.2]) {
    const wr = len * 0.068;
    ctx.fillStyle = '#1e1b26';
    ctx.beginPath();
    ctx.arc(wx, yb - wr * 0.85, wr, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9c4d6';
    ctx.beginPath();
    ctx.arc(wx, yb - wr * 0.85, wr * 0.45, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#6e6880';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    const a = move * 0.3;
    ctx.moveTo(wx + Math.cos(a) * wr * 0.4, yb - wr * 0.85 + Math.sin(a) * wr * 0.4);
    ctx.lineTo(wx - Math.cos(a) * wr * 0.4, yb - wr * 0.85 - Math.sin(a) * wr * 0.4);
    ctx.stroke();
  }
  ctx.restore();
}

/** 작은 버스 아이콘 (다음 버스 미리 보기) */
function miniBus(ctx: CanvasRenderingContext2D, x: number, y: number, ww: number, col: number, cap: number, t: number) {
  const c = BUSC[col], hh = ww * (cap > 3 ? 0.62 : 0.45);
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.beginPath();
  ctx.roundRect(x - ww / 2 + 2, y - hh / 2 + 3, ww, hh, ww * 0.12);
  ctx.fill();
  ctx.fillStyle = c[1];
  ctx.beginPath();
  ctx.roundRect(x - ww / 2, y - hh / 2, ww, hh, [ww * 0.08, ww * 0.16, ww * 0.06, ww * 0.06]);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(x - ww / 2 + 2, y - hh / 2 + 2, ww - 4, hh * 0.2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - ww * 0.12, y + hh * 0.02, hh * 0.32, 0, TAU);
  ctx.fill();
  critter(ctx, x - ww * 0.12, y + hh * 0.3, hh * 0.24, col, 1, t, { head: true, seed: 9 });
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.max(12, hh * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${cap}`, x + ww * 0.28, y + hh * 0.04);
  ctx.fillStyle = '#1e1b26';
  for (const wx of [x - ww * 0.28, x + ww * 0.28]) {
    ctx.beginPath();
    ctx.arc(wx, y + hh / 2, hh * 0.15, 0, TAU);
    ctx.fill();
  }
}

/** 화면에서 지금 동물 i가 어디서 무엇을 하나 */
interface Where { x: number; y: number; kind: 'crowd' | 'walk' | 'wait' | 'seat' | 'hop' | 'fall' | 'bus'; walk?: number; q: number; line?: number }
function seatOf(s: BusState, i: number, t: number): number {
  let acc = 0;
  for (const e of s.vb) {
    if (e.leave >= 0 && e.leave <= t && e.id !== i) continue;
    if (e.leave < 0) continue;
    if (e.id === i) return seatX(acc) + (s.L.an[i].big ? BENCH_DX / 2 : 0);
    acc += sizeOf(s.L, e.id);
  }
  return seatX(Math.min(BENCH - 1, acc));
}
function along(pts: number[], q: number): [number, number] {
  let tot = 0;
  for (let k = 2; k < pts.length; k += 2) tot += Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
  let want = tot * Math.max(0, Math.min(1, q));
  for (let k = 2; k < pts.length; k += 2) {
    const sl = Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
    if (want <= sl || k === pts.length - 2) {
      const f = sl > 0 ? Math.min(1, want / sl) : 1;
      return [lerp(pts[k - 2], pts[k], f), lerp(pts[k - 1], pts[k + 1], f)];
    }
    want -= sl;
  }
  return [pts[0], pts[1]];
}
function route(s: BusState, i: number, t: number): number[] {
  const L = s.L, m = s.mv[i], pts: number[] = [];
  const [ax, ay] = animalXY(L, i);
  pts.push(ax, ay);
  for (let k = 1; k < m.path.length; k++) pts.push(...cellXY(L, m.path[k]));
  const [lx] = cellXY(L, m.path[m.path.length - 1]);
  pts.push(L.an[i].big ? ax : lx, CURB_Y + 0.035);
  if (m.st === 'fall') pts.push(0.27, BENCH_Y + 0.05);
  else if (m.bus >= 0) pts.push(DOOR_X, DOOR_Y);
  else pts.push(seatOf(s, i, t), BENCH_Y);
  return pts;
}
function riderAt(s: BusState, i: number): number {
  const m = s.mv[i];
  if (m.bus < 0) return 1e9;
  return s.bt[m.bus].riders.find((r) => r.id === i)?.at ?? 1e9;
}
function where(s: BusState, i: number, t: number, waitIdx: Map<number, number>): Where {
  const m = s.mv[i];
  if (m.st === 'crowd') {
    const [x, y] = animalXY(s.L, i);
    return { x, y, kind: 'crowd', q: 0 };
  }
  // C003 줄줄이: 뒤따라 나올 친구는 제 차례(한 박자 뒤)까지 제자리
  if (t < m.t0) {
    const [x, y] = animalXY(s.L, i);
    return { x, y, kind: 'crowd', q: 0 };
  }
  const arr = m.t0 + m.dur;
  if (t < arr) {
    const q = (t - m.t0) / m.dur;
    const [x, y] = along(route(s, i, t), ease(q * 1.05));
    return { x, y, kind: 'walk', walk: (t - m.t0) * 0.45, q };
  }
  if (m.st === 'fall') return { x: 0.27, y: BENCH_Y + 0.05, kind: 'fall', q: 1 };
  if (m.st === 'out' && m.bus >= 0) {
    const at = riderAt(s, i);
    if (t >= at) return { x: DOOR_X, y: DOOR_Y, kind: 'bus', q: 1 };
    const line = waitIdx.get(i) ?? 0;
    const wx = DOOR_X - line * 0.07;
    if (t >= at - 10) {
      const q = (t - (at - 10)) / 10;
      return { x: lerp(wx, DOOR_X - 0.05, q), y: DOOR_Y - Math.sin(q * Math.PI) * 0.07 + q * 0.06, kind: 'hop', q };
    }
    return { x: wx, y: DOOR_Y, kind: 'wait', q: 0, line };
  }
  if (m.st === 'tobus') {
    const at = riderAt(s, i);
    if (t >= at) return { x: DOOR_X, y: DOOR_Y, kind: 'bus', q: 1 };
    if (t < m.t1) return { x: seatOf(s, i, t), y: BENCH_Y, kind: 'seat', q: 0 };
    const sx = seatOf(s, i, m.t1 - 1);
    if (t >= at - 10) {
      const q = (t - (at - 10)) / 10;
      return { x: lerp(DOOR_X, DOOR_X - 0.05, q), y: DOOR_Y - Math.sin(q * Math.PI) * 0.07 + q * 0.06, kind: 'hop', q };
    }
    const q = (t - m.t1) / Math.max(1, at - 10 - m.t1);
    return { x: lerp(sx, DOOR_X, ease(q)), y: lerp(BENCH_Y, DOOR_Y, ease(q)) - Math.abs(Math.sin(q * 6)) * 0.008, kind: 'walk', walk: (t - m.t1) * 0.5, q };
  }
  return { x: seatOf(s, i, t), y: BENCH_Y, kind: 'seat', q: 0 };
}
/** 버스 b의 화면 x (안 보이면 null) */
function busX(s: BusState, b: number, t: number): number | null {
  const T = s.bt[b];
  if (!T) return null;
  if (t >= T.depart) {
    const q = (t - T.depart) / 40;
    return q > 1.2 ? null : BUS_X + q * q * 0.9;
  }
  if (t >= T.arrive) return BUS_X;
  const inStart = T.arrive - BUS_IN;
  if (t >= inStart) return lerp(QX, BUS_X, ease((t - inStart) / BUS_IN));
  const qStart = b === 0 ? s.startT - 30 : s.bt[b - 1].arrive - BUS_IN;
  if (t < qStart) return null;
  return lerp(-0.75, QX, ease((t - qStart) / 30));
}
/** 그리기용: 지금 톡 하면 나갈 수 있나 (상태를 바꾸지 않는다) */
function tappable(L: Layout, S: Sim): boolean[] {
  const re = reach(L, S);
  return L.an.map((_, i) => !S.gone[i] && isOpen(L, i, re) && awakeOk(L, S, i));
}

function drawAll(ctx: CanvasRenderingContext2D, s: BusState, w: number, h: number, th: Theme) {
  const fx = juice(s), L = s.L, S = s.S, t = s.t, d = STAGES[s.stage];
  const X = (u: number) => u * w, Y = (v: number) => v * w, R = (v: number) => v * w;
  const re = reach(L, S), can = tappable(L, S), bus0 = L.buses[S.bus];
  const say = (x: number, y: number, text: string, col: string, size = 16) => fx.pop(x, y, text, col, Math.max(12, R(size / 340)));
  const sk = s.startT;
  const once = (key: string) => {
    const k2 = `${sk}|${key}`;
    if (fx.memo[k2]) return false;
    fx.memo[k2] = 1;
    return true;
  };
  ctx.save();
  fx.begin(ctx);
  // ═════════ 하늘·마을 ═════════
  const sky = ctx.createLinearGradient(0, 0, 0, Y(0.26));
  sky.addColorStop(0, '#2c2550');
  sky.addColorStop(0.5, '#8a4f80');
  sky.addColorStop(1, '#f5a463');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, Y(0.27));
  // 해
  ctx.fillStyle = 'rgba(255,214,140,.85)';
  ctx.beginPath();
  ctx.arc(X(0.78), Y(0.215), R(0.06), 0, TAU);
  ctx.fill();
  // 먼 언덕
  ctx.fillStyle = '#6d4a78';
  ctx.beginPath();
  ctx.moveTo(0, Y(0.25));
  for (let k = 0; k <= 20; k++) ctx.lineTo(X(k / 20), Y(0.2 + 0.02 * Math.sin(k * 0.9) + 0.01 * Math.sin(k * 2.3)));
  ctx.lineTo(w, Y(0.27));
  ctx.lineTo(0, Y(0.27));
  ctx.fill();
  // 집들
  const houses = [
    [0.02, 0.15, 0.085, '#f6d7b0', '#c8463c'],
    [0.19, 0.12, 0.11, '#f2e6cf', '#2f8f8a'],
    [0.36, 0.16, 0.075, '#ffd9c2', '#a8553a'],
    [0.56, 0.13, 0.1, '#eee0f5', '#6c4fa8'],
    [0.74, 0.15, 0.08, '#f8e3b8', '#c8463c'],
    [0.88, 0.11, 0.12, '#e6f0dd', '#3a7f4f'],
  ] as const;
  houses.forEach(([hx, hw, hh, wall, roof], k) => {
    const base = Y(0.262), x0 = X(hx), ww = R(hw), hgt = R(hh);
    ctx.fillStyle = wall;
    ctx.fillRect(x0, base - hgt, ww, hgt);
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(x0 + ww * 0.82, base - hgt, ww * 0.18, hgt);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x0 - ww * 0.08, base - hgt);
    ctx.lineTo(x0 + ww / 2, base - hgt - ww * 0.42);
    ctx.lineTo(x0 + ww * 1.08, base - hgt);
    ctx.fill();
    // 창문 불빛
    const lit = 0.75 + 0.25 * Math.sin(t * 0.03 + k * 2);
    ctx.fillStyle = `rgba(255,214,110,${lit})`;
    for (let j = 0; j < 2; j++) ctx.fillRect(x0 + ww * (0.18 + j * 0.42), base - hgt * 0.72, ww * 0.22, hgt * 0.3);
    // 굴뚝 연기
    if (k % 2 === 0) {
      ctx.fillStyle = '#8c5a48';
      ctx.fillRect(x0 + ww * 0.7, base - hgt - ww * 0.32, ww * 0.12, ww * 0.2);
      for (let p = 0; p < 3; p++) {
        const a = ((t * 0.008 + p / 3 + k * 0.17) % 1);
        ctx.fillStyle = `rgba(240,230,240,${0.45 * (1 - a)})`;
        ctx.beginPath();
        ctx.arc(x0 + ww * 0.76 + a * R(0.03), base - hgt - ww * 0.35 - a * R(0.07), R(0.008 + a * 0.012), 0, TAU);
        ctx.fill();
      }
    }
  });
  // 할머니 개가 창밖으로 (버스가 떠날 때 손 흔들기)
  const departing = s.bt.some((b) => t >= b.depart && t < b.depart + 50);
  {
    const hx = X(0.56 + 0.05), hy = Y(0.262 - 0.13 * 0.72 + 0.03);
    ctx.fillStyle = '#c99a6a';
    ctx.beginPath();
    ctx.arc(hx, hy - R(0.01), R(0.016), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a5434';
    ctx.beginPath();
    ctx.ellipse(hx - R(0.014), hy - R(0.008), R(0.006), R(0.012), 0.3, 0, TAU);
    ctx.ellipse(hx + R(0.014), hy - R(0.008), R(0.006), R(0.012), -0.3, 0, TAU);
    ctx.fill();
    if (departing) {
      ctx.fillStyle = '#c99a6a';
      ctx.beginPath();
      ctx.arc(hx + R(0.022), hy - R(0.03) + Math.sin(t * 0.5) * R(0.006), R(0.006), 0, TAU);
      ctx.fill();
    }
  }
  // 전깃줄과 새
  ctx.strokeStyle = 'rgba(40,25,50,.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Y(0.11));
  ctx.quadraticCurveTo(X(0.5), Y(0.15), w, Y(0.105));
  ctx.stroke();
  for (let k = 0; k < 3; k++) {
    const bx = 0.18 + k * 0.08 + (k === 2 ? 0.35 : 0), by = 0.11 + 0.04 * (1 - Math.pow((bx - 0.5) / 0.5, 2)) - 0.012;
    const peck = Math.sin(t * 0.07 + k * 2) > 0.85 ? 0.004 : 0;
    ctx.fillStyle = '#3c3350';
    ctx.beginPath();
    ctx.ellipse(X(bx), Y(by), R(0.012), R(0.009), 0, 0, TAU);
    ctx.arc(X(bx + 0.01), Y(by - 0.008 + peck), R(0.006), 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffb347';
    ctx.fillRect(X(bx + 0.015), Y(by - 0.009 + peck), R(0.006), R(0.003));
  }
  // 줄 전구
  for (let k = 0; k < 14; k++) {
    const bx = (k + 0.5) / 14, by = 0.255 + 0.025 * Math.sin((bx * Math.PI));
    const on = 0.55 + 0.45 * Math.sin(t * 0.08 + k * 1.7);
    ctx.fillStyle = ['#ffd166', '#ff8fb1', '#8fd3ff', '#a8f0a0'][k % 4];
    ctx.globalAlpha = on;
    ctx.beginPath();
    ctx.arc(X(bx), Y(by), R(0.007), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // ═════════ 광장 ═════════
  const PB = 0.262;
  {
    const g = ctx.createLinearGradient(0, Y(PB), 0, Y(CURB_Y));
    g.addColorStop(0, '#6e5c58');
    g.addColorStop(1, '#a08a76');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(X(0.03), Y(PB));
    ctx.lineTo(X(0.97), Y(PB));
    ctx.lineTo(X(1.02), Y(CURB_Y));
    ctx.lineTo(X(-0.02), Y(CURB_Y));
    ctx.fill();
    ctx.save();
    ctx.clip();
    // 돌바닥: 앞으로 올수록 커지는 둥근 돌 (원근)
    const N = 13, persp = (u: number) => Math.pow(u, 1.3);
    for (let r = 0; r < N; r++) {
      const ya = PB + (CURB_Y - PB) * persp(r / N), yb2 = PB + (CURB_Y - PB) * persp((r + 1) / N);
      const wq = 0.94 + 0.1 * ((ya + yb2) / 2 - PB) / (CURB_Y - PB), n = 9 + Math.round(r * 0.25);
      for (let c = -1; c <= n; c++) {
        const xa = 0.5 + ((c + (r % 2) * 0.5) / n - 0.5) * wq, xb = 0.5 + ((c + 1 + (r % 2) * 0.5) / n - 0.5) * wq;
        const v = hsh2(r * 31 + c);
        ctx.fillStyle = `rgba(${200 + v * 30},${180 + v * 26},${150 + v * 24},${0.32 + 0.4 * (r / N)})`;
        ctx.beginPath();
        ctx.roundRect(X(xa) + 1.5, Y(ya) + 1, X(xb) - X(xa) - 3, Y(yb2) - Y(ya) - 2, Math.min(6, (Y(yb2) - Y(ya)) * 0.4));
        ctx.fill();
      }
    }
    // 가로등 불빛 웅덩이
    for (const lx of [0.06, 0.94]) {
      const gl = ctx.createRadialGradient(X(lx), Y(0.34), 2, X(lx), Y(0.34), R(0.22));
      gl.addColorStop(0, 'rgba(255,214,140,.35)');
      gl.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(X(lx - 0.22), Y(0.2), R(0.44), R(0.3));
    }
    ctx.restore();
    // 광장 뒤쪽 꾸밈: 화분 · 가로등 · (자리가 남으면) 가운데 꽃밭과 나무
    const backY = FRONT_Y - (L.R - 1) * rowGap(L);
    const planter = (px: number, py: number, pw: number) => {
      ctx.fillStyle = 'rgba(28,18,40,.3)';
      ctx.fillRect(X(px - pw / 2) + 2, Y(py) + 2, R(pw), R(0.025));
      ctx.fillStyle = '#a0603a';
      ctx.fillRect(X(px - pw / 2), Y(py - 0.012), R(pw), R(0.03));
      ctx.fillStyle = '#c47a4a';
      ctx.fillRect(X(px - pw / 2), Y(py - 0.016), R(pw), R(0.008));
      for (let k = 0; k < 6; k++) {
        const fx2 = px - pw / 2 + (pw * (k + 0.5)) / 6, sway = Math.sin(t * 0.04 + k + px * 9) * 0.003;
        ctx.fillStyle = '#4f9a4a';
        ctx.beginPath();
        ctx.arc(X(fx2 + sway), Y(py - 0.025), R(0.013), 0, TAU);
        ctx.fill();
        ctx.fillStyle = ['#ff8fb1', '#ffd166', '#ffffff', '#c39bff'][(k + Math.round(px * 10)) % 4];
        ctx.beginPath();
        ctx.arc(X(fx2 + sway), Y(py - 0.033), R(0.0075), 0, TAU);
        ctx.fill();
      }
    };
    for (const px of [0.22, 0.5, 0.78]) planter(px, 0.292, 0.13);
    if (backY > 0.47) {
      const cx = X(0.5), cy = Y(0.39);
      ctx.fillStyle = 'rgba(28,18,40,.3)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + R(0.012), R(0.17), R(0.05), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a8296';
      ctx.beginPath();
      ctx.ellipse(cx, cy, R(0.16), R(0.045), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#5aa356';
      ctx.beginPath();
      ctx.ellipse(cx, cy - R(0.006), R(0.145), R(0.036), 0, 0, TAU);
      ctx.fill();
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        ctx.fillStyle = ['#ff8fb1', '#ffd166', '#ffffff', '#c39bff'][k % 4];
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * R(0.12), cy - R(0.006) + Math.sin(a) * R(0.026), R(0.008), 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#7a5434';
      ctx.fillRect(cx - R(0.008), cy - R(0.08), R(0.016), R(0.075));
      const sw = Math.sin(t * 0.03) * R(0.004);
      for (const [ox, oy, rr, col] of [[-0.035, -0.1, 0.045, '#3f8a46'], [0.035, -0.105, 0.045, '#3f8a46'], [0, -0.135, 0.05, '#4fa152'], [-0.012, -0.145, 0.025, '#6cc06a']] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(cx + R(ox) + sw, cy + R(oy), R(rr), 0, TAU);
        ctx.fill();
      }
    }
    for (const lx of [0.055, 0.945]) {
      const bx = X(lx), b0 = Y(0.345), b1 = Y(0.19);
      ctx.fillStyle = 'rgba(28,18,40,.3)';
      ctx.beginPath();
      ctx.ellipse(bx, b0, R(0.02), R(0.007), 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3d3650';
      ctx.fillRect(bx - R(0.005), b1, R(0.01), b0 - b1);
      ctx.fillRect(bx - R(0.012), b0 - R(0.012), R(0.024), R(0.012));
      const gl = ctx.createRadialGradient(bx, b1, 1, bx, b1, R(0.06));
      gl.addColorStop(0, 'rgba(255,230,160,.95)');
      gl.addColorStop(0.3, 'rgba(255,214,140,.45)');
      gl.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.fillStyle = gl;
      ctx.beginPath();
      ctx.arc(bx, b1, R(0.06), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(bx, b1, R(0.013), 0, TAU);
      ctx.fill();
    }
  }
  // 칸: 길(정류장까지 이어진 빈칸)은 환하게
  const cw = cellW(L), rg = rowGap(L);
  for (let k = 0; k < L.C * L.R; k++) {
    const [cx, cy] = cellXY(L, k), sc = rowScale(L, (k / L.C) | 0);
    const tw = cw * sc * 0.9, thh = rg * 0.66;
    const v = L.cells[k];
    ctx.fillStyle = re[k] ? 'rgba(255,236,170,.75)' : v === -2 ? 'rgba(0,0,0,0)' : 'rgba(120,96,84,.32)';
    ctx.beginPath();
    ctx.roundRect(X(cx - tw / 2), Y(cy - thh / 2), R(tw), R(thh), R(0.016));
    ctx.fill();
    if (re[k]) {
      ctx.strokeStyle = 'rgba(255,255,255,.5)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }
  // 앞줄 출구 화살표 (정류장 쪽)
  for (let c = 0; c < L.C; c++) {
    const [cx] = cellXY(L, (L.R - 1) * L.C + c);
    ctx.fillStyle = 'rgba(255,240,200,.45)';
    ctx.beginPath();
    ctx.moveTo(X(cx - 0.015), Y(CURB_Y - 0.022));
    ctx.lineTo(X(cx + 0.015), Y(CURB_Y - 0.022));
    ctx.lineTo(X(cx), Y(CURB_Y - 0.008));
    ctx.fill();
  }
  // 연석·인도
  {
    ctx.fillStyle = '#ece4d8';
    ctx.fillRect(0, Y(CURB_Y), w, R(0.012));
    ctx.fillStyle = '#9c9286';
    ctx.fillRect(0, Y(CURB_Y + 0.012), w, R(0.01));
    const g = ctx.createLinearGradient(0, Y(CURB_Y + 0.022), 0, Y(1.04));
    g.addColorStop(0, '#cfc3b4');
    g.addColorStop(1, '#e3d9cb');
    ctx.fillStyle = g;
    ctx.fillRect(0, Y(CURB_Y + 0.022), w, Y(1.04 - CURB_Y - 0.022));
    ctx.strokeStyle = 'rgba(120,100,80,.2)';
    for (let k = 0; k < 14; k++) {
      ctx.beginPath();
      ctx.moveTo(X(k / 14), Y(CURB_Y + 0.022));
      ctx.lineTo(X(k / 14 - 0.02), Y(1.04));
      ctx.stroke();
    }
    // 문 앞 줄 서는 자리 (발자국)
    ctx.fillStyle = 'rgba(255,255,255,.4)';
    ctx.beginPath();
    ctx.ellipse(X(DOOR_X), Y(DOOR_Y), R(0.04), R(0.014), 0, 0, TAU);
    ctx.fill();
  }
  // 의자 (등받이 · 자리 5칸)
  const used = S.used, nerv = used >= BENCH - 1;
  {
    const x0 = X(seatX(0) - BENCH_DX * 0.55), x1 = X(seatX(BENCH - 1) + BENCH_DX * 0.55);
    ctx.fillStyle = '#7a4b2c';
    ctx.fillRect(x0, Y(BENCH_Y - 0.075), x1 - x0, R(0.02));
    ctx.fillStyle = '#9a6238';
    ctx.fillRect(x0, Y(BENCH_Y - 0.05), x1 - x0, R(0.016));
    for (const lx of [x0 + R(0.01), x1 - R(0.02)]) {
      ctx.fillStyle = '#4b3a3a';
      ctx.fillRect(lx, Y(BENCH_Y - 0.075), R(0.01), R(0.085));
    }
    for (let k = 0; k < BENCH; k++) {
      const sx = X(seatX(k)), full = k < used;
      ctx.fillStyle = full ? (nerv ? '#e8735a' : '#c98a4f') : '#b97c47';
      ctx.beginPath();
      ctx.roundRect(sx - R(BENCH_DX * 0.46), Y(BENCH_Y - 0.018), R(BENCH_DX * 0.92), R(0.026), R(0.006));
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.font = `800 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (!full) ctx.fillText(`${k + 1}`, sx, Y(BENCH_Y + 0.025));
    }
  }
  // ═════════ 동물들 (뒤에서 앞으로) ═════════
  const walkers: [number, number][] = [];
  const waitIdx = new Map<number, number>();
  {
    const waiting = s.mv
      .map((m, i) => [m, i] as const)
      .filter(([m, i]) => m.st === 'out' && m.bus >= 0 && t >= m.t0 + m.dur && t < riderAt(s, i) - 10)
      .sort((a, b) => riderAt(s, a[1]) - riderAt(s, b[1]));
    waiting.forEach(([, i], k) => waitIdx.set(i, k));
  }
  const W: { i: number; p: Where }[] = [];
  for (let i = 0; i < L.an.length; i++) {
    const p = where(s, i, t, waitIdx);
    if (p.kind === 'bus') continue;
    W.push({ i, p });
    if (p.kind === 'walk' && s.mv[i].st === 'out' && p.y < CURB_Y + 0.01) walkers.push([p.x, p.y]);
  }
  // 분수
  const items: { y: number; f: () => void }[] = [];
  for (let k = 0; k < L.cells.length; k++) {
    if (L.cells[k] !== -2) continue;
    const [cx, cy] = cellXY(L, k);
    items.push({
      y: cy,
      f: () => {
        const x = X(cx), y = Y(cy), rr = R(cw * 0.42);
        ctx.fillStyle = 'rgba(28,18,40,.3)';
        ctx.beginPath();
        ctx.ellipse(x, y + rr * 0.1, rr * 1.05, rr * 0.4, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#b8b2c4';
        ctx.beginPath();
        ctx.ellipse(x, y - rr * 0.1, rr, rr * 0.42, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#8c86a0';
        ctx.fillRect(x - rr, y - rr * 0.1, rr * 2, rr * 0.2);
        ctx.fillStyle = '#5fb6e8';
        ctx.beginPath();
        ctx.ellipse(x, y - rr * 0.18, rr * 0.8, rr * 0.3, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#d7d2e2';
        ctx.fillRect(x - rr * 0.1, y - rr * 0.9, rr * 0.2, rr * 0.75);
        for (let j = 0; j < 6; j++) {
          const a = ((t * 0.03 + j / 6) % 1), sx = (j % 2 ? 1 : -1) * (0.2 + 0.5 * a);
          ctx.fillStyle = `rgba(190,235,255,${0.9 - a * 0.7})`;
          ctx.beginPath();
          ctx.arc(x + sx * rr, y - rr * 0.9 - Math.sin(a * Math.PI) * rr * 0.5 + a * rr * 0.6, rr * 0.08, 0, TAU);
          ctx.fill();
        }
      },
    });
  }
  const pressed = s.down && s.phase === 'play' ? pickAt(L, S, s.ax, s.ay) : -1;
  for (const { i, p } of W) {
    const a = L.an[i], m = s.mv[i];
    items.push({
      y: p.y + (p.kind === 'crowd' ? 0 : 0.001),
      f: () => {
        let x = p.x, y = p.y, tilt = 0;
        let mood: Mood = 0;
        const asleep = a.sleep && !S.awake[i] && m.st === 'crowd';
        const hood = a.hidden && m.st === 'crowd' && !isOpen(L, i, re);
        if (p.kind === 'crowd') {
          // 지나가는 친구에게 우르르 길을 비킨다
          for (const [wx, wy] of walkers) {
            const dx = x - wx, dy = (y - wy) * 1.3, dd = Math.hypot(dx, dy);
            if (dd < 0.15 && dd > 1e-4) {
              const f = (1 - dd / 0.15) * 0.03;
              x += (dx / dd) * f;
              y += (dy / dd) * f * 0.4;
              tilt += (dx / dd) * f * 6;
            }
          }
          if (t - m.nope < 30) (x += Math.sin(t * 1.3) * 0.006), (mood = 3);
          else if (asleep) mood = 4;
          else if (nerv) mood = 2;
          else if (can[i] && bus0 && a.col === bus0.col) mood = 1;
          else if (walkers.some(([wx, wy]) => Math.hypot(wx - x, wy - y) < 0.1)) mood = 7;
        } else if (p.kind === 'fall') mood = 5;
        else if (p.kind === 'seat') mood = nerv ? 2 : L.buses[S.bus] && L.buses[S.bus].col === a.col ? 1 : 0;
        else if (p.kind === 'wait' || p.kind === 'hop') mood = 1;
        else mood = p.kind === 'walk' ? 0 : 1;
        const crowdU = cw * 0.36 * (p.kind === 'crowd' ? rowScale(L, (a.cells[0] / L.C) | 0) : 0.95);
        const uu = p.kind === 'crowd' ? crowdU : lerp(crowdU, 0.046, ease((y - (CURB_Y - 0.06)) / 0.09));
        const u = R(uu) * (p.kind === 'hop' ? 1 - p.q * 0.3 : 1);
        // 톡 할 수 있는 동물: 발밑에 색 고리
        if (p.kind === 'crowd' && can[i] && s.phase === 'play') {
          ctx.strokeStyle = hood ? 'rgba(255,255,255,.8)' : COLHEX[a.col];
          ctx.lineWidth = 2.5;
          ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.12 + i);
          ctx.beginPath();
          ctx.ellipse(X(x), Y(y), u * (a.big ? 1.95 : 1.1), u * 0.4, 0, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (i === pressed) {
          ctx.fillStyle = 'rgba(255,255,255,.35)';
          ctx.beginPath();
          ctx.ellipse(X(x), Y(y), u * (a.big ? 2.1 : 1.3), u * 0.5, 0, 0, TAU);
          ctx.fill();
        }
        const dim = p.kind === 'crowd' && !can[i] && s.phase === 'play' ? 0.11 : 0;
        const walk = p.kind === 'walk' ? p.walk : p.kind === 'wait' ? Math.sin(t * 0.2) * 0.3 + t * 0.0 : undefined;
        if (a.big) elephant(ctx, X(x), Y(y), u, a.col, mood, t, { walk, tilt, dim, cap: asleep });
        else critter(ctx, X(x), Y(y), u, a.col, mood, t, { walk, tilt, dim, hood, cap: asleep, seed: i });
        if (asleep) {
          ctx.fillStyle = '#e8eeff';
          ctx.font = `900 ${Math.max(12, u * 0.7)}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          const zq = (t * 0.02 + i * 0.3) % 1;
          ctx.globalAlpha = 1 - zq;
          ctx.fillText('z', X(x) + u * (0.8 + zq * 0.5), Y(y) - u * (2 + zq * 1.2));
          ctx.globalAlpha = 1;
        }
      },
    });
  }
  // 정류장 표지판 + 고양이 구경꾼
  items.push({
    y: 0.99,
    f: () => {
      const px = X(0.962), py0 = Y(1.03), py1 = Y(0.915);
      ctx.fillStyle = '#5b5670';
      ctx.fillRect(px - R(0.006), py1, R(0.012), py0 - py1);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py1, R(0.035), 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#2f70d8';
      ctx.lineWidth = R(0.008);
      ctx.stroke();
      ctx.fillStyle = '#2f70d8';
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🚌', px, py1 + 1);
      // 고양이: 꼬리 살랑, 실패하면 눈을 감는다
      const cx = px, cy = py1 - R(0.035);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1.5, 1.5);
      ctx.translate(-cx, -cy);
      const tail = Math.sin(t * 0.06) * 0.6;
      ctx.strokeStyle = '#e88a3a';
      ctx.lineWidth = R(0.009);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx + R(0.012), cy - R(0.01));
      ctx.quadraticCurveTo(cx + R(0.04), cy - R(0.02), cx + R(0.03 + 0.015 * tail), cy - R(0.05));
      ctx.stroke();
      ctx.fillStyle = '#f39c4a';
      ctx.beginPath();
      ctx.ellipse(cx, cy - R(0.018), R(0.02), R(0.022), 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - R(0.004), cy - R(0.047), R(0.016), 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - R(0.018), cy - R(0.052));
      ctx.lineTo(cx - R(0.016), cy - R(0.072));
      ctx.lineTo(cx - R(0.004), cy - R(0.06));
      ctx.moveTo(cx + R(0.01), cy - R(0.052));
      ctx.lineTo(cx + R(0.008), cy - R(0.072));
      ctx.lineTo(cx - R(0.002), cy - R(0.06));
      ctx.fill();
      const sad = s.phase === 'end' && S.fail;
      ctx.fillStyle = '#2a1f2e';
      if (sad) {
        ctx.fillStyle = '#f39c4a';
        ctx.beginPath();
        ctx.ellipse(cx - R(0.004), cy - R(0.047), R(0.016), R(0.006), 0, 0, TAU);
        ctx.fill();
      } else {
        const look = departing ? 0.004 : busX(s, S.bus, t) !== BUS_X ? -0.004 : 0;
        for (const ex of [-0.01, 0.003]) {
          ctx.beginPath();
          ctx.arc(cx + R(ex + look), cy - R(0.048), R(0.0032), 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
    },
  });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.f();
  // ═════════ 길 ═════════
  {
    const y0 = Y(1.04), y1 = Y(1.275);
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#47435a');
    g.addColorStop(1, '#2f2c3d');
    ctx.fillStyle = g;
    ctx.fillRect(0, y0, w, y1 - y0);
    ctx.fillStyle = 'rgba(255,240,200,.55)';
    for (let k = 0; k < 8; k++) ctx.fillRect(X(k / 8 + 0.02), Y(1.252), R(0.06), R(0.008));
    ctx.fillStyle = '#7e7890';
    ctx.fillRect(0, y0, w, R(0.008));
  }
  // 버스들 (줄 선 다음 버스 → 정류장 버스 → 떠나는 버스)
  for (let b = Math.max(0, S.bus - 3); b < Math.min(L.buses.length, S.bus + 3); b++) {
    const bx = busX(s, b, t);
    if (bx === null) continue;
    const T = s.bt[b], dep = t >= T.depart;
    const riders = T.riders.filter((r) => r.at <= t).sort((p, q) => p.at - q.at).map((r) => ({ sp: L.an[r.id].col, big: L.an[r.id].big, at: r.at }));
    const moving = bx !== BUS_X ? t : 0;
    bus(ctx, X(bx), Y(BUS_Y), R(BUS_W), L.buses[b].col, L.buses[b].cap, riders, t, moving, dep);
    if (dep) {
      // 배기 연기
      for (let p = 0; p < 4; p++) {
        const a = ((t - T.depart) * 0.03 + p * 0.25) % 1;
        ctx.fillStyle = `rgba(220,215,230,${0.5 * (1 - a)})`;
        ctx.beginPath();
        ctx.arc(X(bx - BUS_W / 2 - a * 0.08), Y(BUS_Y - 0.03 - a * 0.03), R(0.01 + a * 0.02), 0, TAU);
        ctx.fill();
      }
    }
    if (bx < 0.1 && !dep && t < T.arrive - BUS_IN) {
      ctx.fillStyle = 'rgba(30,24,44,.85)';
      ctx.beginPath();
      ctx.roundRect(X(0.01), Y(1.045), R(0.12), R(0.04), R(0.02));
      ctx.fill();
      ctx.fillStyle = '#ffe9b0';
      ctx.font = `900 ${Math.max(12, R(0.034))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('다음 ▸', X(0.07), Y(1.066));
    }
  }
  // 버스에 뛰어드는 동물은 버스 위에 다시 그린다
  for (const { i, p } of W) {
    if (p.kind !== 'hop') continue;
    const a = L.an[i];
    if (a.big) elephant(ctx, X(p.x), Y(p.y), R(0.034), a.col, 1, t, { tilt: 0.3 });
    else critter(ctx, X(p.x), Y(p.y), R(0.034) * (1 - p.q * 0.3), a.col, 1, t, { tilt: -0.3, seed: i });
  }
  // ═════════ 누르는 동안: 갈 길과 갈 곳 ═════════
  if (pressed >= 0 && s.phase === 'play') {
    const a = L.an[pressed], [ax, ay] = animalXY(L, pressed);
    if (swapping(s)) {
      const lab = '🚌 잠깐! 다음 버스가 와요';
      ctx.font = `900 ${Math.max(12, R(0.04))}px system-ui, sans-serif`;
      const tw = ctx.measureText(lab).width + R(0.04), lx2 = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(ax))), ly2 = Y(ay) - R(cw * 0.95) - R(0.02);
      ctx.fillStyle = 'rgba(30,24,44,.9)';
      ctx.beginPath();
      ctx.roundRect(lx2 - tw / 2, ly2 - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx2, ly2 + 1);
    } else if (can[pressed]) {
      const path = pathOut(L, S, pressed), pts: number[] = [ax, ay];
      for (let k = 1; k < path.length; k++) pts.push(...cellXY(L, path[k]));
      const [lx] = cellXY(L, path[path.length - 1]);
      pts.push(a.big ? ax : lx, CURB_Y + 0.035);
      const toBus = !!bus0 && bus0.col === a.col, sz = a.big ? 2 : 1, full = !toBus && S.used + sz > BENCH;
      // C003 줄줄이: 함께 따라 탈 친구들에 흰 고리
      const fol = toBus ? followersOf(L, S, pressed) : [];
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      for (const j of fol) {
        const [fx2, fy2] = animalXY(L, j);
        ctx.beginPath();
        ctx.ellipse(X(fx2), Y(fy2) - R(0.005), R(cw * 0.42), R(cw * 0.2), 0, 0, TAU);
        ctx.stroke();
      }
      const dest: [number, number] = toBus ? [DOOR_X, DOOR_Y] : full ? [0.27, BENCH_Y + 0.05] : [seatX(S.used) + (sz > 1 ? BENCH_DX / 2 : 0), BENCH_Y];
      pts.push(...dest);
      ctx.strokeStyle = full ? '#ff6b6b' : toBus ? '#ffffff' : '#ffe08a';
      ctx.lineWidth = R(0.012);
      ctx.setLineDash([R(0.016), R(0.014)]);
      ctx.lineDashOffset = -t * 0.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(X(pts[0]), Y(pts[1]));
      for (let k = 2; k < pts.length; k += 2) ctx.lineTo(X(pts[k]), Y(pts[k + 1]));
      ctx.stroke();
      ctx.setLineDash([]);
      // 갈 곳 표시
      ctx.strokeStyle = full ? '#ff6b6b' : toBus ? '#ffffff' : '#ffe08a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(X(dest[0]), Y(dest[1]), R(0.04 * (sz > 1 ? 1.8 : 1)), R(0.018), 0, 0, TAU);
      ctx.stroke();
      const lab = toBus ? `🚌 ${CN[a.col]} 버스 탑승!${fol.length ? ` 줄줄이 +${fol.length}` : ''}` : full ? '😱 의자 자리가 없어요!' : `🪑 의자로 (${S.used + sz}/${BENCH})`;
      ctx.font = `900 ${Math.max(12, R(0.04))}px system-ui, sans-serif`;
      const tw = ctx.measureText(lab).width + R(0.04), lx2 = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, X(ax))), ly2 = Y(ay) - R(cw * 0.95) - R(0.02);
      ctx.fillStyle = full ? 'rgba(120,20,30,.92)' : 'rgba(30,24,44,.9)';
      ctx.beginPath();
      ctx.roundRect(lx2 - tw / 2, ly2 - R(0.026), tw, R(0.052), R(0.026));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lab, lx2, ly2 + 1);
    } else {
      ctx.strokeStyle = '#ff6b6b';
      ctx.lineWidth = 3;
      const xx = X(ax), yy = Y(ay) - R(0.04);
      ctx.beginPath();
      ctx.moveTo(xx - R(0.02), yy - R(0.02));
      ctx.lineTo(xx + R(0.02), yy + R(0.02));
      ctx.moveTo(xx + R(0.02), yy - R(0.02));
      ctx.lineTo(xx - R(0.02), yy + R(0.02));
      ctx.stroke();
    }
  }
  // 첫 3초: 톡 할 펭귄을 가리키는 손
  if (s.stage === 0 && s.taps === 0 && s.phase === 'play' && !s.down) {
    const i = L.an.findIndex((a, j) => can[j] && bus0 && a.col === bus0.col);
    if (i >= 0) {
      const [x, y] = animalXY(L, i), bob = Math.abs(Math.sin(t * 0.12)) * R(0.02);
      ctx.fillStyle = '#ffffff';
      ctx.font = `${Math.max(14, R(0.075))}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', X(x) + R(0.02), Y(y) + R(0.045) + bob);
    }
  }
  // ═════════ 사건 연출 ═════════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = X(e.x), y = Y(e.y);
    if (e.kind === 'go') {
      const a = L.an[e.v!];
      fx.burst(x, y - R(0.04), COLHEX[a.col], 12, 3, 2.4), fx.ring(x, y - R(0.03), '#ffffff', R(0.07), 3), fx.kick(1.5);
      if (a.big) say(x, y - R(0.1), '쿵쿵!', '#ffffff', 16);
      else if (e.text) say(x, y - R(0.1), e.text, '#ffffff', 16);
    }
    if (e.kind === 'nope') say(x, y - R(0.1), e.text!, e.col!, 18), fx.kick(1.2);
    if (e.kind === 'wake') fx.burst(x, y - R(0.06), '#fff3a0', 10, 2.4, 2), say(x, y - R(0.1), e.text!, e.col!, 15);
    if (e.kind === 'stage') fx.blink('#fff6d6', 0.18);
    if (e.kind === 'clear') {
      fx.burst(X(0.5), Y(0.55), '#ffe066', 46, 6, 3.2), fx.burst(X(0.5), Y(0.55), '#ff8fb1', 30, 5, 3), fx.ring(X(0.5), Y(0.55), '#ffe066', R(0.35), 6), fx.blink('#fff6c8', 0.25);
    }
    if (e.kind === 'fail') fx.kick(9), fx.blink(th.hot, 0.22);
  }
  fx.memo.t = t;
  // 정해진 시각의 사건: 폴짝 탑승 · 털썩 앉기 · 빵빵 출발
  for (let b = Math.max(0, S.bus - 3); b <= Math.min(L.buses.length - 1, S.bus); b++) {
    const T = s.bt[b];
    T.riders.forEach((r, k) => {
      if (t >= r.at && t - r.at < 20 && once(`in${r.id}`)) {
        const bx = (busX(s, b, t) ?? BUS_X) - BUS_W / 2 + 0.1 + (k % 3) * 0.105;
        fx.burst(X(bx), Y(BUS_Y - 0.12), COLHEX[L.an[r.id].col], 10, 2.6, 2.2);
        say(X(bx), Y(BUS_Y - 0.19), k === L.buses[b].cap - 1 ? '꽉!' : '폴짝!', '#ffffff', 15);
      }
    });
    if (t >= T.depart && t - T.depart < 20 && once(`dep${b}`)) {
      fx.kick(4), fx.ring(X(BUS_X + 0.2), Y(BUS_Y - 0.1), '#ffffff', R(0.14), 4), fx.burst(X(BUS_X - 0.25), Y(BUS_Y - 0.04), '#e8e0f0', 16, 3, 3);
      say(X(BUS_X + 0.12), Y(BUS_Y - 0.21), T.streak >= 2 ? `빵빵! ×${T.streak} 연속` : '빵빵!', T.streak >= 2 ? '#ffe066' : '#ffffff', T.streak >= 2 ? 20 : 18);
    }
  }
  for (let i = 0; i < L.an.length; i++) {
    const m = s.mv[i];
    if (L.an[i].hidden && m.st === 'crowd' && isOpen(L, i, re) && once(`rev${i}`)) {
      const [x, y] = animalXY(L, i);
      fx.burst(X(x), Y(y) - R(0.05), COLHEX[L.an[i].col], 14, 2.8, 2.4), fx.ring(X(x), Y(y) - R(0.04), '#ffffff', R(0.06), 3);
      say(X(x), Y(y) - R(0.12), `짠! ${SP[L.an[i].col]}!`, '#ffffff', 15);
    }
    if (m.st === 'out' && m.bus < 0 && t >= m.t0 + m.dur && t - m.t0 - m.dur < 20 && once(`sit${i}`)) {
      const sx = seatOf(s, i, t);
      fx.burst(X(sx), Y(BENCH_Y), '#e6d6c0', 8, 2, 2);
      say(X(sx), Y(BENCH_Y - 0.09), '털썩', '#fff2d0', 13);
    }
    if (m.st === 'fall' && t >= m.t0 + m.dur && once(`fall${i}`)) {
      fx.kick(7), fx.burst(X(0.27), Y(BENCH_Y), '#9fd8ff', 20, 3.5, 2.6);
      say(X(0.27), Y(BENCH_Y - 0.12), '엉엉… 자리가 없어!', '#ffd0c8', 16);
    }
  }
  ctx.restore();

  // ═════════ HUD ═════════
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${Math.max(12, R(sz))}px system-ui, sans-serif`);
  const hb = R(0.082);
  ctx.fillStyle = 'rgba(30,24,48,.9)';
  ctx.fillRect(0, 0, w, hb);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = th.ink;
  font(0.045, 900);
  const ttl = `🚌 ${s.stage + 1}판`, tw1 = ctx.measureText(ttl).width;
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
    const age = s.t - s.news.t, al = Math.min(1, age / 10, (NEWS_T + 20 - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = al;
    font(0.036, 900);
    ctx.textAlign = 'center';
    const tx = `✨ ${s.news.text}`;
    const tw2 = Math.min(w - 8, ctx.measureText(tx).width + 22), by2 = hb + R(0.04) - drop;
    ctx.fillStyle = 'rgba(30,24,48,.92)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - R(0.027), tw2, R(0.054), R(0.027));
    ctx.fill();
    ctx.fillStyle = '#fff6d6';
    ctx.fillText(tx, w / 2, by2 + 1, w - 16);
    ctx.globalAlpha = 1;
  }
  // 판 시작 큰 글씨
  {
    const age = t - s.startT;
    if (age < 90 && s.phase === 'play') {
      const al = Math.min(1, age / 8, (90 - age) / 20), sc = 1 + Math.max(0, 8 - age) * 0.04;
      ctx.globalAlpha = al;
      ctx.save();
      ctx.translate(w / 2, Y(0.36));
      ctx.scale(sc, sc);
      font(0.075, 900);
      ctx.textAlign = 'center';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(30,20,40,.75)';
      const big = `${s.stage + 1}판 · ${d.name}`;
      ctx.strokeText(big, 0, 0);
      ctx.fillStyle = '#fff6d6';
      ctx.fillText(big, 0, 0);
      font(0.042, 800);
      const sub = `동물 ${L.an.length}마리 · 버스 ${L.buses.length}대`;
      ctx.strokeText(sub, 0, R(0.065));
      ctx.fillText(sub, 0, R(0.065));
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
  // 결과
  if (s.phase === 'result') {
    const age = s.pt, al = Math.min(1, age / 10);
    ctx.globalAlpha = al;
    ctx.fillStyle = s.ok ? 'rgba(40,30,70,.72)' : 'rgba(80,20,30,.72)';
    ctx.fillRect(0, Y(0.42), w, R(0.22));
    ctx.textAlign = 'center';
    font(s.ok ? 0.06 : 0.048, 900);
    ctx.fillStyle = s.ok ? '#fff1a8' : '#ffd0c8';
    ctx.fillText(s.ok ? (s.won ? '마을 버스 완성! 🎉' : `${s.stage + 1}판 완성!`) : s.why, w / 2, Y(0.475));
    if (s.ok) {
      for (let k = 0; k < 3; k++) {
        const ag = age - 14 - k * 10, got = k < s.got;
        if (ag < 0) continue;
        const sc2 = got ? 1 + Math.max(0, 1 - ag / 8) * 0.8 : 1;
        font(0.08 * sc2, 900);
        ctx.fillStyle = got ? '#ffd166' : 'rgba(255,255,255,.35)';
        ctx.fillText(got ? '★' : '☆', w / 2 + (k - 1) * R(0.1), Y(0.56));
        if (got && (fx.memo['star' + k] ?? -1) < s.clearT) (fx.memo['star' + k] = s.clearT), fx.burst(w / 2 + (k - 1) * R(0.1), Y(0.56), '#ffe066', 14, 3, 2.4);
      }
      font(0.036, 800);
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.fillText(`의자 최대 ${S.peak}칸 · 빵빵 연속 ${S.best}대 · 톡 ${s.taps}번`, w / 2, Y(0.62));
    } else {
      font(0.042, 800);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(s.hearts > 0 ? '♥ -1 · 이 판을 처음부터 다시' : '하트를 다 썼어요 — 끝', w / 2, Y(0.56));
    }
    ctx.globalAlpha = 1;
  }
  // ═════════ 아래 띠: 다음 버스 · 별 목표 · 안내 ═════════
  const by = Y(1.275);
  ctx.fillStyle = 'rgba(30,24,48,.94)';
  ctx.fillRect(0, by, w, h - by + 2);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, by, w, 1.5);
  {
    const y1 = by + R(0.05);
    ctx.textAlign = 'left';
    font(0.036, 900);
    ctx.fillStyle = '#fff6d6';
    ctx.fillText('다음 버스', R(0.03), y1);
    const x0 = R(0.03) + ctx.measureText('다음 버스 ').width;
    for (let k = 1; k <= 3; k++) {
      const b = L.buses[S.bus + k];
      const mx = x0 + R(0.06) + (k - 1) * R(0.13);
      if (!b) {
        if (k === 1) {
          ctx.fillStyle = 'rgba(255,255,255,.5)';
          ctx.fillText('— 마지막 버스!', x0, y1);
        }
        break;
      }
      ctx.globalAlpha = k === 3 ? 0.45 : 1;
      miniBus(ctx, mx, y1, R(0.105), b.col, b.cap, t);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'right';
    font(0.036, 900);
    ctx.fillStyle = nerv ? '#ff9b8a' : '#e8ffd0';
    const boarded = L.an.length - S.left;
    ctx.fillText(`태움 ${boarded}/${L.an.length}`, w - R(0.03), y1);
  }
  {
    const y2 = by + R(0.135), gw = (w - R(0.04)) / 3;
    const done = s.phase === 'result' && s.ok;
    const goals: [string, boolean | null][] = [
      ['모두 태우기', done ? true : null],
      [`의자 ${L.par}칸까지`, S.peak > L.par ? false : done ? true : null],
      L.mis === 'ele' ? ['🐘 의자에 안 앉히기', S.eleBench ? false : done ? true : null] : [`빵빵 연속 ${L.combo}대`, S.best >= L.combo ? true : done ? false : null],
    ];
    goals.forEach(([txt, st], k) => {
      const gx = R(0.02) + k * gw;
      ctx.fillStyle = st === true ? 'rgba(255,209,102,.3)' : st === false ? 'rgba(120,120,120,.25)' : 'rgba(255,255,255,.08)';
      ctx.strokeStyle = st === true ? '#ffd166' : st === false ? 'rgba(200,200,200,.4)' : 'rgba(255,230,180,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(gx + 2, y2 - R(0.028), gw - 4, R(0.056), R(0.028));
      ctx.fill();
      ctx.stroke();
      ctx.textAlign = 'center';
      font(0.036, 800);
      ctx.fillStyle = st === false ? 'rgba(255,255,255,.45)' : '#fff6e0';
      ctx.fillText(`${st === true ? '★' : st === false ? '✗' : '☆'} ${txt}`, gx + gw / 2, y2 + 1, gw - 8);
    });
  }
  {
    const y3 = by + R(0.222);
    let tp = '👆 누르면 갈 길이 보여요 — 다음 버스 색을 보고 순서를 짜요';
    const busName = bus0 ? `${CN[bus0.col]} ${SP[bus0.col]}` : '';
    if (s.stage === 0 && s.taps === 0) tp = `👆 ${busName}을 톡! ${CN[bus0?.col ?? 0]} 버스에 폴짝`;
    else if (s.phase === 'result') tp = s.ok ? (s.got < 3 ? '의자를 덜 쓰면 버스가 줄줄이 빵빵!' : '완벽해요!') : '같은 판을 다시 — 이번엔 길을 먼저 열어요';
    else if (pressed >= 0 && !can[pressed]) tp = L.an[pressed].sleep && !S.awake[pressed] && isOpen(L, pressed, re) ? '💤 옆 친구가 떠나야 깨요' : '앞이 막혔어요 — 환한 길과 이어진 동물만 나가요';
    else if (nerv) tp = `😰 의자가 거의 꽉! 지금은 ${busName}부터`;
    else if (d.key === 'elephant') tp = '🐘 코끼리는 의자 두 칸 — 모자 색 버스가 올 때 내보내요';
    else if (d.key === 'sleep') tp = '💤 잠꾸러기 옆 친구를 먼저 보내 깨워요';
    else if (d.key === 'hidden') tp = '🧥 우비 친구 옆을 비우면 색이 보여요';
    else if (d.key === 'double') tp = '🚍 2층 버스가 오기 전에 그 색을 의자에 모아요';
    else if (d.key === 'fountain') tp = '⛲ 분수는 못 지나가요 — 빙 돌아가는 길을 열어요';
    ctx.textAlign = 'center';
    font(0.036, 800);
    ctx.fillStyle = 'rgba(255,246,214,.92)';
    ctx.fillText(tp, w / 2, y3, w - R(0.04));
  }
}

/** 측정 스크립트용 */
export const internals = { plan, newSim, moves, tapSim, habitPick, cloneSim, reach, isOpen };
