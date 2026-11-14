/**
 * 판 고르기(빌드 때) — ✏️ S005 (📋 S004 '빌드 때 고르기'): 판마다 칠 번호 sub 1..SCAN을 칠해 보고
 *   v = min(가치, CAP)이 큰 순(같으면 작은 sub 먼저)으로 N개를 골라 picks.ts에 적는다. 게임은 PICKS[판][seed % N]만 칠한다
 *   (고르기 시뮬이 번들·폰에서 빠지고, funqa 시드 1..N이 실린 칠을 전부 잰다).
 *   npx tsx studio/screwshop/pick.ts          → picks.ts · picks.sig.ts 다시 쓰기 (판·칠하기·고르기 식을 바꾸면 꼭 다시)
 *   npx tsx studio/screwshop/pick.ts --check  → 전체를 다시 골라 두 파일과 다르면 종료 코드 1 (판을 고친 사이클마다 — ✏️ S009)
 *   VALUE · CAP · SCAN · PICKS · SIG는 판 순서가 아니라 판 고유 번호 `id`로 찾는다(✏️ S009, 📋 M2 — M1′ 8판 = 0~7).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGES, apply, bestMove, cloneSim, freeM, habitPick, newSim, paintStage, starsOf, stuckM, visibleM, type Level, type Sim, type StageDef } from './game.ts';
import { mulberry32, type Rng } from './rng.ts';

/** 판별 칠 수 · 칠해 볼 sub 수(2판은 장인 ★3 칠이 96개 중 22개뿐이고 상한 3.9에 닿는 칠은 그 절반이라 384 — ✏️ S005) */
export const N = 24, SCAN = [96, 1536, 96, 768, 768, 96, 1536, 1536, 768, 768, 768, 768, 768, 768, 768, 768, 768, 700, 768, 768, 768, 768, 768, 768, 768, 768, 768]; // 📐C S014: 2-5(id 17) 700 — 카드 짝 .79 → .86 // ✏️ S007: 2판 384 → 1536(진자 칠이 384칠 중 21칠뿐) · 📐 S007 7·8판 1536

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
export function smartSeen(L: Level, d: StageDef, pend = false, onTap?: (rec: { k: string; pop?: boolean }[]) => void) {
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
    const rec: { k: string; pop?: boolean }[] = [];
    apply(L, S, m >= 0 ? m : habitPick(L, S), onTap && (rec as never));
    onTap?.(rec);
    known |= visibleM(L, S.gone);
  }
  return S.fail ? 0 : starsOf(d, S);
}
/** F20′ 대표 순간 '완전'(🧪 S010 · 📋 받음): 장인(같은 눈) 판에서 연쇄로 튄 나사가 가장 많은 톡(쾅 · 와르르 · 드르륵 · 띠용 · 쿵)이 있고, 그 톡에 빈칸으로 간 나사가 0 */
export function smartFull(L: Level, d: StageDef) {
  let bp = 0, bs = 0;
  smartSeen(L, d, false, (rec) => {
    const p = rec.filter((e) => e.k === 'out' && e.pop).length;
    if (p > bp) (bp = p), (bs = rec.filter((e) => e.k === 'slot').length);
  });
  return bp > 0 && bs === 0;
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

/** 🧪 F17 버릇 3종(📐A S012): funqa 맞는 색 · 위에서부터 · ✨ 최다 봇과 같은 눈(본 나사 + 다음 상자 2)으로 끝까지 → 별 수
 *  (봇은 난수를 안 쓰므로 칠 하나에 별 하나 — 실린 칠 120(id 8~12)에서 funqa tryStage와 같음 확인) */
export type Habit = 'habit' | 'top' | 'reveal';
const HABITS: Habit[] = ['habit', 'top', 'reveal'];
export function habit3(L: Level, d: StageDef): Record<Habit, number> {
  const kf = (S: Sim, known: number) => { const f = freeM(L, S) & known, o: number[] = []; for (let i = 0; i < L.N; i++) if ((f >> i) & 1) o.push(i); return o; };
  const run = (pick: (S: Sim, known: number) => number) => {
    const S = newSim(L);
    let known = visibleM(L, 0);
    while (!S.fail && S.n < L.N) { const m = pick(S, known); if (m < 0) return 0; apply(L, S, m); known |= visibleM(L, S.gone); }
    return S.fail ? 0 : starsOf(d, S);
  };
  return {
    habit: run((S, known) => habitPick(L, S, known)),
    top: run((S, known) => { const o = kf(S, known); return o.length ? o.reduce((a, b) => (L.py[b] < L.py[a] ? b : a)) : -1; }),
    reveal: run((S, known) => { // ✨ 새로 풀리는 나사 × 10 + 맞는 색 1 — 같으면 앞 번호
      const V = { ...L, col: L.col.map((c, i) => ((known >> i) & 1 ? c : -1)), queue: L.queue.map((c, i) => (i < S.qi + 2 ? c : -2)) }, f0 = freeM(V, S);
      let best = -1, bi = -1;
      for (const i of kf(S, known)) {
        const S2 = cloneSim(S);
        apply(V, S2, i);
        let v = S.box.includes(V.col[i]) ? 1 : 0;
        const nf = freeM(V, S2) & ~f0 & ~S2.gone;
        for (let j = 0; j < L.N; j++) if ((nf >> j) & 1) v += 10;
        if (v > best) (best = v), (bi = i);
      }
      return bi;
    }),
  };
}

/** 새 판 공통 고르기(📋 M2 · ✏️ S010): 판별 함수를 새로 쓰지 않고 목표 표 한 줄 t로 값을 낸다(M1′ 6·8판 식을 일반화).
 *  장인(같은 눈) ★3이 아니면 −9 · 버릇(맞는 색 → 위) ★3이면 −5 · t.pv면 1수 미리 보기가 3번 중 한 번이라도 ★3이면 −4
 *  + 진자 낙차(장인−진자가 ★3을 놓치면 t.pend, 기본 1) + 버릇 클리어 t.hc(기본 1, 처음 하는 사람 숨통)
 *  + (1 − 막 누르기 클리어 100판) × t.mc(기본 1) + 무작위 클리어 min(1, 무작위/t.rnd[0]) × t.rnd[1](40판) · t.full이면 대표 순간 '완전'이 아닌 칠 −3(F20′) */
/** 새 판 공통 고르기(📋 M2 · ✏️ S010): 판별 함수를 새로 쓰지 않고 목표 표 한 줄 t로 값을 낸다(M1′ 6·8판 식을 일반화).
 *  장인(같은 눈) ★3이 아니면 −9 · 버릇(맞는 색 → 위) ★3이면 −5 · t.pv면 1수 미리 보기가 3번 중 한 번이라도 ★3이면 −4
 *  + 진자 낙차(장인−진자가 ★3을 놓치면 t.pend, 기본 1) + 버릇 클리어 t.hc(기본 1, 처음 하는 사람 숨통)
 *  + (1 − 막 누르기 클리어 100판) × t.mc(기본 1) + 무작위 클리어 min(1, 무작위/t.rnd[0]) × t.rnd[1](40판) · t.full이면 대표 순간 '완전'이 아닌 칠 −3(F20′) */
export interface Gate { pend?: number; hc?: number; mc?: number; pv?: boolean; rnd?: [number, number]; /** F20′: 대표 순간 '완전'이 아니면 −3 (📋 S010: 새 22판) */ full?: boolean; /** F17 1위 버릇(📐A S012): 이 버릇은 ★2를 못 따는데 다른 버릇이 ★2 이상이면 −2 — 실린 칠 24에서 이 버릇의 ★2 이상 비율이 1위가 된다 */ lead?: Habit; /** F15ᵗ(📐B S012 · 🐹 쿵 판): 쿵을 끈 판에서도 장인(같은 눈) ★3이면 −2 — 쿵이 덤인 칠을 거른다(F19) */ thump?: boolean; /** F19(📐B S013 · 🤡 깜짝 상자 판): 뿅을 끈 판에서도 장인(같은 눈) ★3이면 −2 */ jack?: boolean; /** F17 끊기(📐C S013): 이 버릇들 중 하나라도 ★2 이상이면 −2 — 그 버릇이 1위 집합에 못 든다 */ avoid?: Habit[]; /** F14 장인 쪽(📐C S014): 장인(같은 눈) 판에서 🔨 쾅으로 튄 나사가 빈칸에 가면 −chain */ chain?: number }
export function gate(L: Level, d: StageDef, r: Rng, t: Gate = {}) {
  if (smartSeen(L, d) !== 3) return -9;
  const h = playOut(L, d, habitOf(L));
  if (h === 3) return -5;
  if (t.pv) for (let k = 0; k < 3; k++) if (playOut(L, d, pv1Of(L, r)) === 3) return -4;
  if (t.full && !smartFull(L, d)) return -3;
  if (t.thump && smartSeen({ ...L, thump: false }, d) === 3) return -2;
  if (t.jack && smartSeen({ ...L, jack: undefined }, d) === 3) return -2;
  if (t.lead || t.avoid) { const b = habit3(L, d); if (t.lead && b[t.lead] < 2 && HABITS.some((x) => x !== t.lead && b[x] >= 2)) return -2; if (t.avoid?.some((x) => b[x] >= 2)) return -2; }
  let m = 0, cs = 0;
  if (t.chain) smartSeen(L, d, false, (rec) => { let b = false; rec.forEach((e, j) => ((b ||= e.k === 'bonk'), b && e.k === 'out' && e.pop && rec.slice(j + 1).find((x) => x.k === 'box' || x.k === 'slot')?.k === 'slot' && cs++)); });
  for (let k = 0; k < 100; k++) m += playOut(L, d, mashOf(L, r)) ? 1 : 0;
  return (cs ? -t.chain! : 0) + (smartSeen(L, d, true) === 3 ? 0 : t.pend ?? 1) + (h ? t.hc ?? 1 : 0) + (1 - m / 100) * (t.mc ?? 1) + (t.rnd ? Math.min(1, randomPass(L, r, 40) / t.rnd[0]) * t.rnd[1] : 0);
}

/** 판 id별 가치(클수록 좋음)와 '이만하면 됐다' 상한 — M1′ 0~7은 예전 buildLevel의 고르기 식·멈춤 값 그대로 · 새 판(id 8~)은 gate(목표 표 한 줄) */
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
  //   📐 S008: 장인(funqa와 같은 눈)이 ★3 + 쏙 한 방 ≥ 3(날개 🔨 → 📌 🔨 연쇄)이 아니면 탈락 · 연쇄로 튄 나사가 장인 판에서 빈칸에 가면 −3(F14)
  //   · 장인−진자가 ★3을 놓치면 +0.5(F15: 왼쪽 위 날개를 끝 #7에 매달아야 🔨가 #11을 친다) · 막 누르기 연쇄 빈칸 비율 0.4까지 +1(F14) · 무작위 32판 0.65까지
  (L, d, r) => {
    const S = newSim(L);
    let known = visibleM(L, 0), cs = 0;
    while (!S.fail && S.n < L.N) {
      const m0 = bestMove({ ...L, col: L.col.map((c, i) => ((known >> i) & 1 ? c : -1)), queue: L.queue.map((c, i) => (i < S.qi + 2 ? c : -2)) }, S, d), m = m0 >= 0 ? m0 : habitPick(L, S), rec: { k: string; s?: number }[] = [];
      apply(L, S, m, rec as never);
      cs += rec.filter((e) => e.k === 'slot' && e.s !== m).length;
      known |= visibleM(L, S.gone);
    }
    if (S.fail || starsOf(d, S) !== 3) return -9;
    if (S.shot < 3) return -6 + S.shot;
    let mg = 0, pn = 0, ps = 0; // 막 누르기 ★2 이상 · 연쇄로 튄 나사 수 · 그중 빈칸 (F14)
    for (let k = 0; k < 16; k++) {
      const M = newSim(L), mash = mashOf(L, r);
      while (!M.fail && M.n < L.N) {
        const rec: { k: string; pop?: boolean }[] = [];
        apply(L, M, mash(M), rec as never);
        rec.forEach((e, j) => e.k === 'out' && e.pop && (pn++, (ps += rec.slice(j + 1).find((x) => x.k === 'box' || x.k === 'slot')?.k === 'slot' ? 1 : 0)));
      }
      mg += !M.fail && starsOf(d, M) >= 2 ? 1 : 0;
    }
    return (playOut(L, d, habitOf(L)) ? 2.65 : 0) + Math.min(1, randomPass(L, r, 32) / 0.65) - Math.max(0, mg / 16 - 0.1) * 4 - (cs ? 3 : 0) + (smartSeen(L, d, true) === 3 ? 0 : 0.5) + Math.min(1, ps / Math.max(1, pn) / 0.4);
  },
  // 📐 5판 🌻 (S005 · S008): 장인 ★3이 아니면 −9 · 버릇 ★3이면 −5 · 장인−진자가 ★3을 놓치면 +1(F15 — 양옆 꽃잎 안쪽을 남기느냐)
  //   · 버릇 클리어(처음 하는 사람 숨통) + (1 − 막 누르기 클리어, 200판). 장인은 funqa처럼 다음 상자 2개까지만 안다
  (L, d, r) => {
    if (smartSeen(L, d) !== 3) return -9;
    const h = playOut(L, d, habitOf(L));
    if (h === 3) return -5;
    let m = 0, cn = 0, cs = 0; // ✏️ S008 (🧪 F14 🪵): 막 누르기 판에서 우수수로 튄 나사 · 그중 빈칸
    for (let k = 0; k < 200; k++) {
      const M = newSim(L), mash = mashOf(L, r);
      while (!M.fail && M.n < L.N) {
        const rec: { k: string; pop?: boolean }[] = [];
        apply(L, M, mash(M), rec as never);
        let c = false;
        rec.forEach((e, j) => (e.k === 'crash' && (c = true), c && e.k === 'out' && e.pop && (cn++, (cs += rec.slice(j + 1).find((x) => x.k === 'box' || x.k === 'slot')?.k === 'slot' ? 1 : 0))));
      }
      m += M.fail ? 0 : 1;
    }
    // 장인(같은 눈) 판에서 우수수로 튄 나사가 빈칸에 가면 −0.5 (F14: 장인 쪽 비율을 0으로)
    const A = newSim(L);
    let known = visibleM(L, 0), as = 0;
    while (!A.fail && A.n < L.N) {
      const m0 = bestMove({ ...L, col: L.col.map((c, i) => ((known >> i) & 1 ? c : -1)), queue: L.queue.map((c, i) => (i < A.qi + 2 ? c : -2)) }, A, d), rec: { k: string; pop?: boolean }[] = [];
      apply(L, A, m0 >= 0 ? m0 : habitPick(L, A), rec as never);
      let c = false;
      rec.forEach((e, j) => (e.k === 'crash' && (c = true), c && e.k === 'out' && e.pop && (as += rec.slice(j + 1).find((x) => x.k === 'box' || x.k === 'slot')?.k === 'slot' ? 1 : 0)));
      known |= visibleM(L, A.gone);
    }
    return (smartSeen(L, d, true) === 3 ? 0 : 1) + (h ? 1 : 0) + 1 - m / 200 + Math.min(0.5, cs / Math.max(1, cn)) - (as ? 0.5 : 0); // + 막 누르기 우수수 빈칸 비율(0.5까지, F14)
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
  // 📐 S010 1-4 🐿️ (id 8 · 📐A): 공통 gate · 목표 표 기본
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1 }),
  // 📐 S010 🐄 (id 9): 공통 gate · 따라 하기 거름(pv) 켬 — 끄면 같은 좌표에서 따라 하기 ★3 .13 · 📐A S011: 1-7로 옮김 · F20′ full
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, pv: true, full: true, lead: 'habit' }), // 📐A S012: F17 1위 버릇 = 맞는 색(이웃 1-6 🐷 · 1-8 🐴 = ✨)
  // 📐A S011 1-5 🤖 (id 10): 공통 gate · F20′ full
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true }),
  // 📐B S011 1-6 🐷 (id 11): 공통 gate · F20′ full · 따라 하기 거름(pv) · 📐B S012: ★3 = 한 방 5(쿵 한 번에 덜컹 4) · F15ᵗ thump
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true, pv: true, thump: true, lead: 'reveal' }), // ✏️ S012(🧪 F17): 1위 버릇 ✨ — 1-5 · 1-7이 맞는 색
  // 📐C S011 1-8 🐴 (id 12): 공통 gate · F20′ full
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true }),
  // 📐C S012 1-9 🦆 (id 13): 공통 gate · F20′ full · 따라 하기 거름(pv — 끄면 같은 좌표에서 따라 하기 ★3 .54 이상)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true, pv: true }),
  // 📐B S012 1-10 🚜 (id 14): 공통 gate · F20′ full · 따라 하기 거름(pv — 끄면 따라 하기 ★3 .33) · ✏️ S012: F17 1위 버릇 맞는 색(lead — 이웃 1-8 🐴 · 1-9 🦆 = ✨)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true, pv: true, lead: 'top' }), // 📐C S013(F17): 위에서부터는 이 판에서 ★2를 못 따므로 'top' = 맞는 색 · ✨가 ★2 이상인 칠은 −2 → 1위 없음
  // 📐A S012 2-3 🐳 (id 15): 공통 gate · F20′ full · 따라 하기 거름(pv — 끄면 ★3 .29) · F17 1위 버릇 ✨ 최다(이웃 2-2 🌻 = 맞는 색)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 4, pv: true, full: true, avoid: ['habit'], chain: 0.5 }), // 📐C S014: 장인 판 🔨 쾅 나사가 빈칸에 가는 칠 −0.5 → 막 누르기 클리어 .17 → .08 // 📐C S013: 파도 · 꼬마 물고기로 N 18 · 막 누르기 클리어 mc 4 · F17 맞는 색 ★2 이상 칠 −2(2-2 맞 · 2-4 맞·✨)
  // 📐A S012 2-4 🦀 (id 16): 공통 gate · F20′ full · F17 1위 버릇 맞는 색(이웃 2-3 🐳 = ✨)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true, lead: 'habit' }),
  // 📐C S012 2-5 🐧 (id 17) · 📐C S013: 🔨 도미노 셋 · N 18 · P 0 · 막 누르기 클리어 mc 3 · 따라 하기 거름(pv)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 3, full: true, pv: true }),
  // 📐A S013 2-7 🦭 (id 18): 공통 gate · F20′ full(pv · lead를 켜면 막 누르기 클리어 .25 ✗ — 끈 채로 따라 하기 .17 · 1위 버릇 맞는 색 혼자)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true }),
  // 📐A S014 2-8 🐙 (id 19): 공통 gate · F20′ full · F17 맞는 색 ★2 이상 칠 −2(2-7 맞) · 막 누르기 mc 6(mc 4면 24시드 .17)
  (L, d, r) => gate(L, d, r, { pend: 2, hc: 1, mc: 6, full: true, avoid: ['habit'] }),
  () => -9, // id 20 자리(📐A 2-9 🐬 — S014 ❌ F16 n 8 · 마지막 톡만 .93 · 다시 짬)
  // 📐B S013 3-2 🤡 (id 21): 공통 gate · F20′ full · 따라 하기 거름(pv — 끄면 .21) · F19 jack(뿅을 끈 판에서도 ★3이면 거름)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 1, full: true, pv: true, jack: true }),
  // 📐B S014 2-10 🗼 (id 22) · 📐B S015: 🌀 문(쾅 → 띠용 → 띠용) · F20′ full · 따라 하기 거름(pv) · F17 1위 맞는 색(lead habit) · hc 2 · mc 8(카드 짝 .70 → .84)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 2, mc: 8, full: true, pv: true, lead: 'habit' }),
  () => -9, // id 23 자리(📐A 3-3)
  // 📐C S014 3-4 🎢 (id 24): 공통 gate · F20′ full(pv 꺼도 따라 하기 .04)
  (L, d, r) => gate(L, d, r, { pend: 1, hc: 1, mc: 3, full: true }),
  () => -9, // id 25 자리(📐C 3-5 🚡)
  () => -9, // id 26 자리(📐B 3-6 🤡🪟)
];
export const CAP = [Infinity, 4.5, 3.65, 5.15, 3.5, 2.95, 3.95, 2.95, Infinity, 2.95, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];

/** k번째 판(순서)의 칠 sub 고르기 값 = min(가치, 상한) — 난수 씨앗은 판 id */
export function valueOf(k: number, sub: number, L = paintStage(k, sub)) {
  const d = STAGES[k];
  return Math.min(CAP[d.id], VALUE[d.id](L, d, mulberry32((sub * 0x9e3779b1 + d.id) >>> 0)));
}
/** k번째 판의 칠 sub 1..scan을 고르기 값이 큰 순(같으면 작은 sub 먼저)으로 — [값, sub] */
function scanStage(k: number, scan = SCAN[STAGES[k].id]) {
  const all: [number, number][] = [];
  for (let sub = 1; sub <= scan; sub++) all.push([valueOf(k, sub), sub]);
  return all.sort((a, b) => b[0] - a[0] || a[1] - b[1]);
}
/** k번째 판의 칠 번호 N개 */
export function pickStage(k: number, n = N, scan?: number) {
  return scanStage(k, scan).slice(0, n).map((x) => x[1]);
}

/** FNV-1a 32비트 */
function fnv(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  return h;
}
/** 판 모양 지문(✏️ S009): 시뮬이 쓰는 기하 — 나사 자리 · 주인 · 모든 자세의 덮임 · 숨김 · 🔨 과녁 · 째깍 · 🔒 · 🔑 · 못 판자.
 *  실루엣 몸통(M2)이 M1′ 판의 이 값을 바꾸면 오너가 통과시킨 판이 바뀐 것이다 */
export function geomSig(L: Level) {
  return fnv(JSON.stringify([L.N, L.px.map((x) => x.toFixed(5)), L.py.map((y) => y.toFixed(5)), L.owner, L.ps, L.cov, L.hid, L.hamT, L.tmr, L.lockM, L.keyM, L.pl.map((p) => p.kind ?? ''), !!L.wind]));
}
/** 칠 지문(✏️ S009): 나사 색 · 상자 줄 · 상자 수 · 팔레트 */
export function paintSig(L: Level) {
  return fnv(JSON.stringify([L.col, L.queue, L.boxes, L.pal]));
}
/** 판 id별 실린 칠 지문: g 판 모양 · p 실린 칠 [sub, 고르기 값, 칠 지문] N개 · cut 컷 바로 아래(N+1위) 칠 */
export interface Sig { g: number; p: [number, number, number][]; cut: [number, number, number] }
const row = (k: number, v: number, sub: number): [number, number, number] => [sub, v, paintSig(paintStage(k, sub))];

if (process.argv[1]?.endsWith('pick.ts')) {
  const t0 = Date.now(), check = process.argv.includes('--check'), rows: number[][] = [], sig: Sig[] = [];
  STAGES.forEach((d, k) => {
    const all = scanStage(k);
    rows[d.id] = all.slice(0, N).map((x) => x[1]);
    sig[d.id] = { g: geomSig(paintStage(k, all[0][1])), p: all.slice(0, N).map(([v, s]) => row(k, v, s)), cut: row(k, all[N][0], all[N][1]) };
  });
  const out: [string, string][] = [
    ['picks.ts', `/** 자동 생성 — npx tsx studio/screwshop/pick.ts (판 id별 칠 번호 ${N}개, 게임은 seed % ${N}로 고른다) */\nexport const PICKS: number[][] = [\n${Array.from(rows, (r) => `  [${(r ?? []).join(',')}],`).join('\n')}\n];\n`],
    ['picks.sig.ts', `/** 자동 생성 — npx tsx studio/screwshop/pick.ts (판 id별 실린 칠 지문 — 테스트가 이 25칠만 다시 칠해 본다 · 게임은 읽지 않는다) */\nimport type { Sig } from './pick.ts';\nexport const SIG: Sig[] = [\n${Array.from(sig, (s) => (s ? `  { g: ${s.g}, p: ${JSON.stringify(s.p)}, cut: ${JSON.stringify(s.cut)} },` : '  { g: 0, p: [], cut: [0, 0, 0] }, // 빈 id')).join('\n')}\n];\n`],
  ];
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  if (check) {
    const bad = out.filter(([f, s]) => { try { return readFileSync(join(import.meta.dirname, f), 'utf8') !== s; } catch { return true; } }).map(([f]) => f);
    console.log(bad.length ? `✗ ${bad.join(' · ')}가 다시 고른 것과 다르다 — npx tsx studio/screwshop/pick.ts 로 다시 쓰고 funqa로 재요 (${sec}초)` : `✓ picks.ts · picks.sig.ts = 다시 고른 것 (${rows.length}판 × ${N} · ${sec}초)`);
    process.exit(bad.length ? 1 : 0);
  }
  for (const [f, s] of out) writeFileSync(join(import.meta.dirname, f), s);
  console.log(`picks.ts · picks.sig.ts ${rows.length}판 × ${N} · ${sec}초`);
}
