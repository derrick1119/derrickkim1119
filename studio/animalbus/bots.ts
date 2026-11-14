/**
 * M1-1 측정 먼저 (C002): 판 단위(Layout·Sim)로 빨리 도는 봇들 — 화면 틱 없이 톡 순서만 둔다.
 * PM 운영 규칙 5 "정직 봇": 사람이 못 보는 정보(우비 친구의 숨은 색)를 쓰지 않는다. 버스 줄은 화면에 다 보이므로(지금 + 다음 2대 + 뒤 줄) 써도 된다.
 *   - honest  정직 박사: 숨은 색은 남은 색 수에 맞춰 K개 표본으로 채워 보고, 표본마다 내다본(빔) 첫 수의 점수 평균이 가장 좋은 톡
 *   - follow  미리 보기 따라 하기: 지금 버스 색이 트였으면 그걸, 없으면 다음 버스(1~2대) 색을 의자로, 그것도 없으면 앞줄 왼쪽
 *   - greedy  한 수 탐욕: 한 수 둬 보고 (의자 −, 태운 수 +, 트인 지금 색 +) 가장 좋은 것
 *   - habit   버릇쟁이(프로토타입 그대로)
 */
import { mulberry32, shuffle, type Rng } from '../../engine/rng.ts';
import { BENCH, internals as I, starsOf, type Layout, type Sim } from './game.ts';

// game.ts의 판 고르기(layoutFor)가 이 봇들을 쓰고, 이 파일은 game.ts의 시뮬을 쓴다(서로 부름) → 꺼내 쓰기는 늘 부를 때(I.plan 등)
const plan: typeof I.plan = (...a) => I.plan(...a), newSim: typeof I.newSim = (L) => I.newSim(L), moves: typeof I.moves = (...a) => I.moves(...a);
const tapSim: typeof I.tapSim = (...a) => I.tapSim(...a), habitPick: typeof I.habitPick = (...a) => I.habitPick(...a), cloneSim: typeof I.cloneSim = (S) => I.cloneSim(S);
const reach: typeof I.reach = (...a) => I.reach(...a), isOpen: typeof I.isOpen = (...a) => I.isOpen(...a);
export type SimBot = (L: Layout, S: Sim, ms: number[], r: Rng) => number;

/** 화면에서 보이는 색인가 (우비가 아니거나, 이미 길이 트여 색이 드러났거나) */
const seen = (L: Layout, S: Sim, re: Uint8Array, i: number) => !L.an[i].hidden || S.gone[i] === 1 || isOpen(L, i, re);
const front = (L: Layout, i: number) => -Math.max(...L.an[i].cells.map((k) => ((k / L.C) | 0) * 100 - (k % L.C)));
const firstFront = (L: Layout, pool: number[]) => pool.reduce((a, b) => (front(L, b) < front(L, a) ? b : a));

export const habit: SimBot = (L, S, ms) => habitPick(L, S, ms);

export const follow: SimBot = (L, S, ms) => {
  const re = reach(L, S), col = (i: number) => (seen(L, S, re, i) ? L.an[i].col : -1);
  const now = L.buses[S.bus]?.col ?? -1;
  const a = ms.filter((i) => col(i) === now);
  if (a.length) return firstFront(L, a);
  for (const k of [1, 2]) {
    const c = L.buses[S.bus + k]?.col;
    const b = ms.filter((i) => col(i) === c);
    if (c !== undefined && b.length) return firstFront(L, b);
  }
  return firstFront(L, ms);
};

export const greedy: SimBot = (L, S, ms) => {
  let best = ms[0], bs = -1e9;
  for (const i of ms) {
    const T = cloneSim(S);
    if (tapSim(L, T, i) === 'fail') continue;
    const now = L.buses[T.bus]?.col ?? -1;
    // 🧪 C002: 톡한 뒤 새로 트인 우비의 색은 사람이 아직 모른다 — 톡 전에 보이던 색만 센다
    const re0 = reach(L, S), open = moves(L, cloneSim(T)).filter((j) => seen(L, S, re0, j) && L.an[j].col === now).length;
    const sc = -T.used * 10 - T.left * 3 + Math.min(2, open) * 2 + T.streak - front(L, i) * 1e-3;
    if (sc > bs) (bs = sc), (best = i);
  }
  return best;
};

/** 두 수 탐욕(C003, 판 고르기에 쓰지 않는 '시험용' 봇): 한 수 둬 보고 그다음 한 수까지 탐욕 점수로 본다 — 판 고르기 봇에 맞춘 판(과적합)인지 확인 */
const gscore = (L: Layout, S: Sim, re0: Uint8Array) => {
  const now = L.buses[S.bus]?.col ?? -1;
  const open = moves(L, cloneSim(S)).filter((j) => seen(L, S, re0, j) && L.an[j].col === now).length;
  return -S.used * 10 - S.left * 3 + Math.min(2, open) * 2 + S.streak - (L.mis === 'ele' && S.eleBench ? 15 : 0);
};
export const greedy2: SimBot = (L, S, ms) => {
  let best = ms[0], bs = -1e9;
  const re0 = reach(L, S);
  for (const i of ms) {
    const T = cloneSim(S);
    if (tapSim(L, T, i) === 'fail') continue;
    let b2 = gscore(L, T, re0);
    if (T.left > 0)
      for (const j of moves(L, cloneSim(T))) {
        if (!seen(L, S, re0, j) && L.an[j].hidden) continue;
        const U = cloneSim(T);
        b2 = Math.max(b2, tapSim(L, U, j) === 'fail' ? -1e6 : gscore(L, U, re0) + (U.left === 0 ? 50 : 0));
      }
    if (b2 - front(L, i) * 1e-3 > bs) (bs = b2 - front(L, i) * 1e-3), (best = i);
  }
  return best;
};

/** 결정 밀도(F11e, C003 측정만): ★3 풀이를 따라가며, 두 마리 이상 트인 차례 중 '★3을 남기는 수가 트인 수의 절반 이하'인 차례의 비율 */
export function decisionDensity(L: Layout, width = 6) {
  const S = newSim(L);
  let steps = 0, tight = 0;
  for (const i of L.sol) {
    if (S.left === 0 || S.fail) break;
    const ms = moves(L, S);
    if (!ms.includes(i)) break;
    if (ms.length >= 2) {
      let good = 0;
      for (const m of ms) {
        const T = cloneSim(S);
        if (tapSim(L, T, m) === 'fail' || T.peak > L.par || (L.mis === 'ele' && T.eleBench)) continue;
        const p = T.left === 0 ? T : plan(L, T, width, L.par, 'streak', L.mis === 'ele');
        if (p && (L.mis === 'ele' || p.best >= L.combo)) good++;
      }
      steps++;
      if (good / ms.length <= 0.5) tight++;
    }
    tapSim(L, S, i);
  }
  return steps ? tight / steps : 0;
}

/** 숨은(아직 안 보이는) 우비 친구들의 색을 남은 색 수에 맞춰 섞은 판 */
function sampleLayout(L: Layout, S: Sim, r: Rng): Layout {
  const re = reach(L, S), idx: number[] = [];
  for (let i = 0; i < L.an.length; i++) if (!seen(L, S, re, i)) idx.push(i);
  if (!idx.length) return L;
  const cols = shuffle(idx.map((i) => L.an[i].col), r);
  return { ...L, an: L.an.map((a, i) => { const k = idx.indexOf(i); return k < 0 ? a : { ...a, col: cols[k] }; }) };
}
/** 정직 박사: 표본 K개 × 첫 수마다 내다보기. 점수 = 통과·★2(par)·★3(combo) 우선, 그다음 의자 최대 */
export function honestBot(K = 6, width = 6): SimBot {
  return (L, S, ms, r) => {
    const re = reach(L, S);
    if (ms.length === 1) return ms[0];
    const anyHidden = L.an.some((_, i) => !seen(L, S, re, i));
    const samples = anyHidden ? Array.from({ length: K }, () => sampleLayout(L, S, r)) : [L];
    let best = ms[0], bs = -1e9;
    for (const i of ms) {
      let sum = 0;
      for (const Ls of samples) {
        const T = cloneSim(S);
        if (tapSim(Ls, T, i) === 'fail') { sum -= 1000; continue; }
        if (T.left === 0) { sum += 200 + starsOf(L, T) * 100; continue; }
        const p3 = plan(Ls, T, width, L.par, 'streak', L.mis === 'ele'), p = p3 ?? plan(Ls, T, width);
        const mis = !!p3 && (L.mis === 'ele' || p3.best >= L.combo);
        sum += !p ? -1000 : 300 + (p.peak <= L.par ? 100 : 0) + (mis ? 100 : 0) - p.peak;
      }
      if (sum > bs) (bs = sum), (best = i);
    }
    return best;
  };
}

/** 판 하나를 봇으로 끝까지: 통과·별 */
export function runSim(L: Layout, bot: SimBot, seed = 1) {
  const S = newSim(L), r = mulberry32(seed);
  let taps = 0;
  while (S.left > 0 && !S.fail && taps < 200) {
    const ms = moves(L, S);
    if (!ms.length) break;
    tapSim(L, S, bot(L, S, ms, r));
    taps++;
  }
  return { ok: !S.fail && S.left === 0, stars: starsOf(L, S), peak: S.peak, taps };
}

/** 첫 수 ★3 정답 폭: 처음 트인 동물 중, 그걸 먼저 톡 해도 ★3 풀이가 남는 비율 (전지 내다보기, 상한) */
export function firstMoveWidth(L: Layout, width = 10) {
  const S0 = newSim(L), ms = moves(L, cloneSim(S0));
  let good = 0;
  for (const i of ms) {
    const T = cloneSim(S0);
    moves(L, T);
    if (tapSim(L, T, i) === 'fail' || T.peak > L.par || (L.mis === 'ele' && T.eleBench)) continue;
    const p = T.left === 0 ? { best: T.best, peak: T.peak } : plan(L, T, width, L.par, 'streak', L.mis === 'ele');
    if (p && (L.mis === 'ele' || p.best >= L.combo)) good++;
  }
  return { open: ms.length, good, rate: ms.length ? good / ms.length : 0 };
}
export { BENCH };
