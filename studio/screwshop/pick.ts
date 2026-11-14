/**
 * 판 고르기(빌드 때) — ✏️ S005 (📋 S004 '빌드 때 고르기'): 판마다 칠 번호 sub 1..SCAN을 칠해 보고
 *   v = min(가치, CAP)이 큰 순(같으면 작은 sub 먼저)으로 N개를 골라 picks.ts에 적는다. 게임은 PICKS[판][seed % N]만 칠한다
 *   (고르기 시뮬이 번들·폰에서 빠지고, funqa 시드 1..N이 실린 칠을 전부 잰다).
 *   npx tsx studio/screwshop/pick.ts  → picks.ts 다시 쓰기 (판·칠하기를 바꾸면 꼭 다시)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGES, apply, bestMove, cloneSim, freeM, habitPick, newSim, paintStage, starsOf, stuckM, visibleM, type Level, type Sim, type StageDef } from './game.ts';
import { mulberry32, type Rng } from './rng.ts';

/** 판별 칠 수 · 칠해 볼 sub 수(2판은 장인 ★3 칠이 96개 중 22개뿐이고 상한 3.9에 닿는 칠은 그 절반이라 384 — ✏️ S005) */
export const N = 24, SCAN = [96, 1536, 96, 96, 768, 96, 1536, 1536]; // ✏️ S007: 2판 384 → 1536(진자 칠이 384칠 중 21칠뿐) · 📐 S007 7·8판 1536

/** 아무 나사나 빼는 사람이 이 판을 깰 확률 */
function randomPass(L: Level, r: Rng, n: number) {
  let ok = 0;
  for (let k = 0; k < n; k++) {
    const S = newSim(L);
    while (!S.fail && S.n < L.N) {
      const f = freeM(L, S), list: number[] = [];
      for (let i = 0; i < L.N; i++) if ((f >> i) & 1) list.push(i);
      apply(L, S, list[Math.floor(r() * list.length)]);
    }
    if (!S.fail) ok++;
  }
  return ok / n;
}
/** 시뮬 한 판(그림 없이): 받은 고르기로 끝까지 — 별 수(실패 0) */
export function playOut(L: Level, d: StageDef, pick: (S: Sim) => number, first?: number) {
  const S = newSim(L);
  if (first !== undefined) apply(L, S, first);
  while (!S.fail && S.n < L.N) apply(L, S, pick(S));
  return S.fail ? 0 : starsOf(d, S);
}
/** 막 누르기: 뺄 수 있는 나사 아무거나 */
export const mashOf = (L: Level, r: Rng) => (S: Sim) => {
  const f = freeM(L, S), o: number[] = [];
  for (let i = 0; i < L.N; i++) if ((f >> i) & 1) o.push(i);
  return o[Math.floor(r() * o.length)];
};
const smartOf = (L: Level, d: StageDef) => (S: Sim) => bestMove(L, S, d);
/** 장인이 게임·funqa와 같은 눈일 때(본 나사 색 + 다음 상자 2개만 앎 — 📐 S005 · ✏️ S005) 별 수
 *  pend: 🧪 F15 '장인−진자' — 나사 둘 남은 판자(못 판자 제외)에서 짝도 뺄 수 있으면 둘 중 버릇 순서(맞는 색 → 위)로 (📐 S006) */
export function smartSeen(L: Level, d: StageDef, pend = false) {
  const S = newSim(L);
  let known = visibleM(L, 0);
  while (!S.fail && S.n < L.N) {
    let m = bestMove({ ...L, col: L.col.map((c, i) => ((known >> i) & 1 ? c : -1)), queue: L.queue.map((c, i) => (i < S.qi + 2 ? c : -2)) }, S, d);
    if (pend && m >= 0 && L.pl[L.owner[m]].kind !== 'nail') {
      const rem = L.pm[L.owner[m]] & ~S.gone, p = 31 - Math.clz32(rem & ~(1 << m));
      const x = rem & (rem - 1);
      if (x && !(x & (x - 1)) && (freeM(L, S) >> p) & 1 && (known >> p) & 1) { // 딱 둘 남았고 짝도 뺄 수 있고 본 적 있음
        const v = (i: number) => (S.box.includes(L.col[i]) ? 0 : 10) + L.py[i];
        if (v(p) < v(m)) m = p;
      }
    }
    apply(L, S, m >= 0 ? m : habitPick(L, S));
    known |= visibleM(L, S.gone);
  }
  return S.fail ? 0 : starsOf(d, S);
}
const habitOf = (L: Level) => (S: Sim) => habitPick(L, S);
/** 1수 미리 보기(funqa 따라 하기와 같은 점수, 동점은 난수) — 📐 S006·S007 7판 */
const pv1Of = (L: Level, r: Rng) => (S: Sim) => {
  const f = freeM(L, S);
  let best = -1e9, pick: number[] = [];
  for (let i = 0; i < L.N; i++) {
    if (!((f >> i) & 1)) continue;
    const S2 = cloneSim(S), rec: { k: string }[] = [];
    apply(L, S2, i, rec as never);
    let v = S2.fail ? -1e6 : rec.filter((e) => e.k === 'box').length * 10 - rec.filter((e) => e.k === 'slot').length * 12 + rec.filter((e) => e.k === 'done').length * 4 - (stuckM(L, S2.gone) ? 60 : 0) + (S2.n === L.N ? 1000 : 0);
    const nf = freeM(L, S2) & ~f & ~S2.gone;
    for (let j = 0; j < L.N; j++) if ((nf >> j) & 1) v += 2;
    if (v > best + 1e-9) (best = v), (pick = [i]);
    else if (Math.abs(v - best) < 1e-9) pick.push(i);
  }
  return pick[Math.floor(r() * pick.length)];
};

/** 판별 가치(클수록 좋음)와 '이만하면 됐다' 상한 — 예전 buildLevel의 고르기 식·멈춤 값 그대로 */
export const VALUE: ((L: Level, d: StageDef, r: Rng) => number)[] = [
  // 📐 1판: 장인(손가락 첫 톡) ★3 ×2 + 장인 스스로 ★3 + 무작위 클리어 − 막 누르기(손가락 첫 톡 뒤) ★2 이상 ×2 (📋 S002 표본 100)
  (L, d, r) => {
    let mg = 0;
    for (let k = 0; k < 100; k++) mg += playOut(L, d, mashOf(L, r), d.first) >= 2 ? 1 : 0;
    const rp = randomPass(L, r, 30);
    return (playOut(L, d, smartOf(L, d), d.first) === 3 ? 2 : 0) + (playOut(L, d, smartOf(L, d)) === 3 ? 1 : 0) + Math.min(1, rp / 0.95) - (mg / 100) * 2;
  },
  // 📐 2판: 장인 ★3이 안 되면 탈락 · 버릇①이 ★3이면 탈락 · 무작위 클리어(0.92까지) − 막 누르기 ★2 이상(0.1 넘는 만큼)
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9 + randomPass(L, r, 10); // ✏️ S005: 게임과 같은 눈의 장인으로 (장전 가치가 바뀌자 다 아는 장인은 ★3인데 funqa 장인은 아닌 판이 0.08 섞여서)
    if (playOut(L, d, habitOf(L)) === 3) return -3;
    let mg = 0;
    for (let k = 0; k < 12; k++) mg += playOut(L, d, mashOf(L, r)) >= 2 ? 1 : 0;
    const v = Math.min(4, 2 + 2 * Math.min(1, randomPass(L, r, 100) / 0.95) - Math.max(0, mg / 12 - 0.1) * 4); // ✏️ S005: 표본 20 → 100 · 0.92 → 0.95 · 상한 4 (상위 24로 바꾸자 20판 잡음 + 고른 쪽 쏠림으로 실린 칠의 무작위가 0.92에 걸쳐서)
    // ✏️ S007 (📋 S006 · 🧪 F15): 위 기준을 넘는 칠(≥ 3.9) 중 장인−진자가 ★3을 놓치는 칠을 먼저 — 진자 매달기가 ★3을 가르는 2판
    return v + (v >= 3.9 && smartSeen(L, d, true) !== 3 ? 0.5 : 0);
  },
  // 📐 3판 🔑: 막 누르기 클리어가 낮을수록 (장인 ★3 필수)
  (L, d, r) => {
    let m = 0;
    for (let k = 0; k < 16; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
    return playOut(L, d, smartOf(L, d)) === 3 ? 3.95 - m / 16 : -9;
  },
  // 📐 4판 📌🔨: 버릇 클리어 + 무작위 클리어 0.6까지(첫 못 판 숨통) (장인 ★3 필수)
  //   ✏️ S005: − 막 누르기 ★2 이상(0.1 넘는 만큼, 2판과 같은 꼴) — 후보 중 최고 → 상위 24로 바꾸자 0.17 → 0.21로 올라서
  (L, d, r) => {
    if (playOut(L, d, smartOf(L, d)) !== 3) return -9;
    let mg = 0;
    for (let k = 0; k < 16; k++) mg += playOut(L, d, mashOf(L, r)) >= 2 ? 1 : 0;
    return (playOut(L, d, habitOf(L)) ? 2.65 : 0) + Math.min(1, randomPass(L, r, 16) / 0.6) - Math.max(0, mg / 16 - 0.1) * 4;
  },
  // 📐 5판 🌻 (S005 · S008): 장인 ★3이 아니면 −9 · 버릇 ★3이면 −5 · 장인−진자가 ★3을 놓치면 +1(F15 — 양옆 꽃잎 안쪽을 남기느냐)
  //   · 버릇 클리어(처음 하는 사람 숨통) + (1 − 막 누르기 클리어, 200판). 장인은 funqa처럼 다음 상자 2개까지만 안다
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9;
    const h = playOut(L, d, habitOf(L));
    if (h === 3) return -5;
    let m = 0;
    for (let k = 0; k < 200; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
    return (smartSeen(L, d, true) === 3 ? 0 : 1) + (h ? 1 : 0) + 1 - m / 200;
  },
  // 📐 6판 🦕 (S006): 장인 ★3이 아니거나 버릇 ★3이면 탈락 · 장인−진자가 ★3을 놓치면 +1(F15) · 버릇 클리어(처음 하는 사람 숨통) + (1 − 막 누르기 클리어, 100판)
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9;
    const h = playOut(L, d, habitOf(L));
    if (h === 3) return -5;
    let m = 0;
    for (let k = 0; k < 100; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
    return (smartSeen(L, d, true) === 3 ? 0 : 1) + (h ? 1 : 0) + 1 - m / 100;
  },
  // 📐 7판 🏰 (S007): 장인 ★3이 아니면 −9 · 버릇 ★3이면 −5 · 1수 미리 보기 ★3(3번 중 한 번이라도)이면 −4
  //   · 장인−진자가 ★3을 놓치면 +2(F15) + 버릇 클리어 +1 + (1 − 막 누르기 클리어, 100판)
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9;
    const h = playOut(L, d, habitOf(L));
    if (h === 3) return -5;
    for (let k = 0; k < 3; k++) if (playOut(L, d, pv1Of(L, r)) === 3) return -4;
    let m = 0;
    for (let k = 0; k < 100; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
    return (smartSeen(L, d, true) === 3 ? 0 : 2) + (h ? 1 : 0) + 1 - m / 100;
  },
  // 📐 8판 🚀 (S007): 장인 ★3이 아니거나 버릇 ★3이면 탈락 · 장인−진자가 ★3을 놓치면 +1(F15) · 버릇 클리어(처음 하는 사람 숨통) + (1 − 막 누르기 클리어, 100판)
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9;
    const h = playOut(L, d, habitOf(L));
    if (h === 3) return -5;
    let m = 0;
    for (let k = 0; k < 100; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
    return (smartSeen(L, d, true) === 3 ? 0 : 1) + (h ? 1 : 0) + 1 - m / 100;
  },
];
export const CAP = [Infinity, 4.5, 3.65, 3.5, 3, 2.95, 3.95, 2.95];

/** k판의 칠 번호 N개 */
export function pickStage(k: number, n = N, scan = SCAN[k]) {
  const d = STAGES[k], all: [number, number][] = [];
  for (let sub = 1; sub <= scan; sub++) all.push([Math.min(CAP[k], VALUE[k](paintStage(k, sub), d, mulberry32((sub * 0x9e3779b1 + k) >>> 0))), sub]);
  return all.sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, n).map((x) => x[1]);
}

if (process.argv[1]?.endsWith('pick.ts')) {
  const t0 = Date.now(), rows = STAGES.map((_, k) => pickStage(k));
  writeFileSync(join(import.meta.dirname, 'picks.ts'), `/** 자동 생성 — npx tsx studio/screwshop/pick.ts (판별 칠 번호 ${N}개, 게임은 seed % ${N}로 고른다) */\nexport const PICKS: number[][] = [\n${rows.map((r) => `  [${r.join(',')}],`).join('\n')}\n];\n`);
  console.log(`picks.ts ${rows.length}판 × ${N} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
}
