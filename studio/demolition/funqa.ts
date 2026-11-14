/**
 * FUN QA 측정 (M0): 판마다 봇 넷의 결과를 낸다 → reports/funqa.json
 *   npx tsx studio/demolition/funqa.ts
 * - best   : 모든 폭약 조합 완전 탐색(최선) — 판이 ★3 가능한지
 * - greedy : 폭약마다 '지금까지 + 이 블록'의 미리 보기가 가장 좋은 곳(미리 보기만 따라 하는 사람). 오너 기준 11: 이게 ★3이면 전략이 얕다
 * - habit  : 늘 맨 아래 가운데부터 (버릇 하나)
 * - random : 무작위 조합 2000개 중 성공·★3 비율 (아무렇게나 해도 되는가)
 * 그리고 실제 틱 시뮬레이션으로 철거 박사·아무 데나 톡 봇 한 판씩(끝까지 가는지).
 */
import { mulberry32 } from '../../engine/rng.ts';
import { NO_INPUT } from './core.ts';
import { STAGES, bestPlan, capOf, demolition as g, demolitionRandom, demolitionSmart, layoutOf, simulate, type Layout } from './game.ts';
import type { Bot } from './core.ts';
import type { DemoState } from './game.ts';
import { mkdirSync, writeFileSync } from 'node:fs';
import { essentialTaps, firstTimer, habit, look2, misreadLook2, plansOf, safetyGap, simCache } from './bots3d.ts';
import { STONE, bestReach, capOf3, feetKey3, isQuiet, layoutOf3, lostFeet, simulate3, support3, type Layout3, type StageDef3 } from './sim3d.ts';
import { aimAt, cellPx, drawOrder, faces, fitCams, MAGNET, pickAt, visibleArea, YAW0, type Cam } from './view3d.ts';
import { STAGES3 } from './stages3d.ts';
import { join } from 'node:path';

const val = (L: Layout, ch: Int8Array) => {
  const o = simulate(L, ch);
  return { v: o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - (o.hitL + o.hitR), o };
};
const starsOf = (L: Layout, plan: number[]) => {
  const ch = new Int8Array(L.blocks.length);
  for (const i of plan) ch[i]++;
  const o = simulate(L, ch);
  return o.ok ? o.stars : 0;
};

export function greedyPlan(L: Layout): number[] {
  const ch = new Int8Array(L.blocks.length), plan: number[] = [];
  for (let k = 0; k < L.charges; k++) {
    let bi = -1, bv = -1e9;
    L.blocks.forEach((b, i) => {
      if (ch[i] >= capOf(b)) return;
      ch[i]++;
      const { v } = val(L, ch);
      ch[i]--;
      if (v > bv) (bv = v), (bi = i);
    });
    if (bi < 0) break;
    ch[bi]++;
    plan.push(bi);
  }
  return plan;
}

export function habitPlan(L: Layout): number[] {
  const ch = new Int8Array(L.blocks.length), plan: number[] = [], B = L.blocks, cx = B.reduce((a, b) => a + b.x, 0) / B.length;
  for (let k = 0; k < L.charges; k++) {
    let best = -1, bv = 1e9;
    B.forEach((b, i) => {
      if (ch[i] >= capOf(b)) return;
      const v = b.y * 100 + Math.abs(b.x - cx) * 2 + b.x * 0.001;
      if (v < bv) (bv = v), (best = i);
    });
    if (best < 0) break;
    ch[best]++;
    plan.push(best);
  }
  return plan;
}

export function randomRates(L: Layout, n = 2000, seed = 7) {
  const rng = mulberry32(seed), open = L.blocks.map((_, i) => i).filter((i) => capOf(L.blocks[i]) > 0);
  let ok = 0, s3 = 0;
  for (let t = 0; t < n; t++) {
    const ch = new Int8Array(L.blocks.length);
    for (let k = 0; k < L.charges; k++) {
      const free = open.filter((i) => ch[i] < capOf(L.blocks[i]));
      if (!free.length) break;
      ch[free[Math.floor(rng() * free.length)]]++;
    }
    const o = simulate(L, ch);
    if (o.ok) ok++;
    if (o.ok && o.stars === 3) s3++;
  }
  return { clear: ok / n, star3: s3 / n };
}

function runBot(bot: Bot<DemoState>, seed: number, maxTicks = 60 * 60 * 15) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  let t = 0;
  while (!g.over(s) && t < maxTicks) g.step(s, t++ % 3 === 0 ? bot.act(s, rng) : NO_INPUT);
  return { stage: s.stage + 1, stars: s.stars, won: s.won, hearts: s.hearts, sec: Math.round(t / 60) };
}

/** 3D 판(C002~): 모든 폭약 계획 중 성공·★3 비율, 박사(최선) ★, 미리 보기 탐욕 ★, 꿈쩍 안 하는 첫 톡 비율 */
const v3 = (L: Layout3, ch: Int8Array) => {
  const o = simulate3(L, ch);
  return o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - o.hits.reduce((a, b) => a + b, 0);
};

/**
 * 떨리는 손가락(F11 v1.2): 블록 i의 가장 잘 보이는 면 가운데를 겨눠 σ 16px로 톡.
 * 꾹 누르는 동안 확대 말풍선이 겨눈 블록을 보여 주므로, 틀렸으면 **한 번만** 다시 겨눈다(σ 16px 그대로, 말풍선에 그려진 것만 보고).
 * hit = 손을 떼는 순간 적중(판정) · first = 첫 닿음 적중(보고) · miss = 빈칸 취소
 */
/** F11 표본(블록·시점마다). 게이트 판정은 n ≥ 1000 — 평소 측정은 200 */
export let F11N = 200;
export const setF11N = (n: number) => void (F11N = n);

export function fingerHit(c: Cam, L: Layout3, i: number, n = 200, sigma = 16, seed = 1) {
  const ok = (j: number) => capOf3(L.blocks[j]) > 0, order = drawOrder(c, L.blocks), rng = mulberry32(seed + i * 7919);
  const fc = faces(c, L.blocks[i]).map((f) => ({ f, cx: f.pts.reduce((a, p) => a + p[0], 0) / 4, cy: f.pts.reduce((a, p) => a + p[1], 0) / 4 }))
    .filter((q) => pickAt(c, L.blocks, q.cx, q.cy, order) === i);
  const area = (q: (typeof fc)[0]) => Math.abs(q.f.pts.reduce((a, p, k) => a + p[0] * q.f.pts[(k + 1) % 4][1] - q.f.pts[(k + 1) % 4][0] * p[1], 0) / 2);
  let t: { cx: number; cy: number } | undefined = fc.sort((a, b) => area(b) - area(a))[0];
  if (!t) {
    // 🧪 C006: 면 가운데가 다 가려져도 조각이 보이면 사람은 그 조각을 누른다 → 보이는 픽셀의 무게중심을 겨눈다(전엔 '취소 1'로 셌다)
    const pts = faces(c, L.blocks[i]).flatMap((f) => f.pts);
    const x0 = Math.min(...pts.map((p) => p[0])), x1 = Math.max(...pts.map((p) => p[0])), y0 = Math.min(...pts.map((p) => p[1])), y1 = Math.max(...pts.map((p) => p[1]));
    let sx = 0, sy = 0, m = 0;
    for (let y = y0 + 1; y < y1; y += 2) for (let x = x0 + 1; x < x1; x += 2) if (pickAt(c, L.blocks, x, y, order) === i) (sx += x), (sy += y), m++;
    if (!m) return { hit: 0, first: 0, miss: 1 };
    t = { cx: sx / m, cy: sy / m };
  }
  const touch = () => {
    const r = Math.sqrt(-2 * Math.log(1 - rng() * 0.999999)) * sigma, a = rng() * Math.PI * 2;
    return aimAt(c, L.blocks, ok, t!.cx + r * Math.cos(a), t!.cy + r * Math.sin(a), MAGNET, order);
  };
  let hit = 0, first = 0, miss = 0;
  for (let k = 0; k < n; k++) {
    let j = touch();
    if (j === i) first++;
    else j = touch(); // 말풍선을 보고 한 번 고쳐 누름
    if (j === i) hit++;
    else if (j < 0) miss++;
  }
  return { hit: hit / n, first: first / n, miss: miss / n };
}

export function measure3D() {
  return STAGES3.map((d) => measureStage3(d));
}

/** 3D 판 하나의 FUN v1.1 측정 (후보 판 비교에도 쓴다) */
export { plansOf } from './bots3d.ts';
/** opt.bots = false: 처음 봇 몬테카를로·look2·버릇·오해 봇을 건너뛴다(테스트가 F11·greedy만 볼 때 — 값은 0으로) */
export function measureStage3(d: StageDef3, opt: { bots?: boolean } = {}) {
  const bots = opt.bots !== false;
  {
    const L = layoutOf3(d);
    let plans = 0, ok = 0, s3 = 0, best = 0;
    plansOf(L, d, (ch) => {
      const o = simulate3(L, ch);
      plans++;
      if (o.ok) ok++;
      if (o.ok && o.stars === 3) s3++;
      best = Math.max(best, o.ok ? o.stars : 0);
    });
    // 미리 보기 탐욕: 폭약마다 '지금까지 + 이 블록'이 가장 좋은 곳. 동점은 무작위(🧪 C002: 첫 톡은 거의 다 '꿈쩍 안 함' 동점), 시드 20 평균
    let gStar3 = 0, gClear = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const rng = mulberry32(seed), ch = new Int8Array(L.blocks.length);
      for (let k = 0; k < d.charges; k++) {
        let bv = -1e9, ties: number[] = [];
        L.blocks.forEach((b, i) => {
          if (ch[i] >= capOf3(b)) return;
          ch[i]++;
          const v = v3(L, ch);
          ch[i]--;
          if (v > bv) (bv = v), (ties = [i]);
          else if (v === bv) ties.push(i);
        });
        ch[ties[Math.floor(rng() * ties.length)]]++;
        // greedy1(GDD §4.3): 손잡이 판이면 미리 보기가 ★1 이상이 되는 순간 바로 손잡이
        if (d.save !== undefined && simulate3(L, ch).ok) break;
      }
      const g = simulate3(L, ch);
      if (g.ok) gClear++;
      if (g.ok && g.stars === 3) gStar3++;
    }
    let still = 0, open = 0;
    L.blocks.forEach((b, i) => {
      if (!capOf3(b)) return;
      open++;
      const c1 = new Int8Array(L.blocks.length);
      c1[i] = capOf3(b);
      if (!simulate3(L, c1).moved) still++;
    });
    // ── FUN v1 (C003) ── 화면: 390×468(3d.html과 같은 맞춤), 시작 시점 = 앞왼(시점 0)
    const cams = fitCams(L.lot, L.blocks, 390, 468, 12);
    const area = cams.map((c) => visibleArea(c, L.blocks, 390, 468, 2));
    const N = L.blocks.length, can = (i: number) => capOf3(L.blocks[i]) > 0;
    /** 첫 폭약 i 뒤에 나머지를 어떻게 붙여도 실패면 '죽은 첫 톡' (돌은 톡 한 번에 −2: 첫 톡 = 그 블록을 부술 만큼) */
    const alive = L.blocks.map((b, i) => {
      if (!can(i) || capOf3(b) > d.charges) return false;
      let ok = false;
      plansOf(L, d, (ch) => {
        if (!ok && ch[i] >= capOf3(b) && simulate3(L, ch).ok) ok = true;
      });
      return ok;
    });
    const taps = L.blocks.map((_, i) => i).filter(can);
    const w0 = taps.map((i) => area[0][i]), wSum = w0.reduce((a, b) => a + b, 0);
    const deadU = taps.filter((i) => !alive[i]).length / taps.length;
    const deadW = taps.reduce((a, i, k) => a + (alive[i] ? 0 : w0[k]), 0) / Math.max(1, wSum);
    // 살아 있는 첫 톡 반응(F5): 미리 보기에서 움직이거나 발 칸이 바뀌는가
    const feetKey = (ch: Int8Array) => support3(L, ch).map((f) => `${f.act}:${f.feet.map((q) => q.join(',')).join(' ')}`).sort().join('|');
    const base = feetKey(new Int8Array(N));
    const liveIds = taps.filter((i) => alive[i]);
    const react = liveIds.filter((i) => {
      const c1 = new Int8Array(N);
      c1[i] = capOf3(L.blocks[i]);
      return simulate3(L, c1).moved || feetKey(c1) !== base;
    }).length / Math.max(1, liveIds.length);
    // 처음 봇(F2): 첫 톡은 보이는 넓이에 비례(4번에 3번 시작 시점, 1번 ⟲ 한 시점), 마지막 폭약만 미리 보기로 최선. 미리 보기 안 보는 변형도
    const wMix = L.blocks.map((_, i) => (can(i) ? 0.75 * area[0][i] + 0.25 * area[3][i] : 0));
    let pPrev = 0, pBlind = 0;
    const rec = (ch: Int8Array, left: number, prob: number) => {
      if (prob <= 0) return;
      // 손잡이 판: 꾹 꼬리표가 성공을 보여 주면 붙이고 바로 손잡이(C008)
      if (d.save !== undefined && ch.some((v) => v > 0) && simulate3(L, ch).ok) return void ((pPrev += prob), (pBlind += prob));
      const choices = L.blocks.map((_, i) => i).filter((i) => can(i) && !ch[i] && capOf3(L.blocks[i]) <= left);
      if (!choices.length || left <= 0) {
        if (simulate3(L, ch).ok) (pPrev += prob), (pBlind += prob);
        return;
      }
      const lastTap = choices.every((i) => capOf3(L.blocks[i]) >= left);
      const tw = choices.reduce((a, i) => a + wMix[i], 0);
      if (lastTap) {
        // 마지막 폭약: 미리 보기 최선(성공하는 자리가 하나라도 있으면 성공) / 안 보면 넓이 비례
        let any = false;
        for (const i of choices) {
          ch[i] = capOf3(L.blocks[i]);
          const ok = simulate3(L, ch).ok;
          ch[i] = 0;
          if (ok) (any = true), (pBlind += (prob * wMix[i]) / tw);
        }
        if (any) pPrev += prob;
        return;
      }
      for (const i of choices) {
        ch[i] = capOf3(L.blocks[i]);
        rec(ch, left - ch[i], (prob * wMix[i]) / tw);
        ch[i] = 0;
      }
    };
    rec(new Int8Array(N), d.charges, 1);
    const p1 = Math.min(pPrev, pBlind), first5 = 1 - (1 - p1) ** 5;
    // 시작 시점에서 ★3 계획 블록이 보이는 넓이(F13, 블록 앞면 한 장 = cellPx²) · 속 블록(F14)
    const face = cellPx(cams[0]) ** 2;
    // ★3 계획 중 '가장 잘 보이는 것'의 가장 덜 보이는 블록(면 장 수) — 1-1·1-2는 ≥ 0.5
    let star3Vis = -1;
    plansOf(L, d, (ch, plan) => {
      if (simulate3(L, ch).stars === 3) star3Vis = Math.max(star3Vis, Math.min(...plan.map((i) => area[0][i] / face)));
    });
    const inner = taps.filter((i) => area.every((a) => a[i] === 0)).length;
    // F4b (v1.2 ⓑ·ⓒ): 화면에 실제로 그리는 표식 기준 — 신호 = 움직임 유령 또는 빠진 받침 ✕, '변화 없음' = 둘 다 없고 받침도 그대로
    const now0 = support3(L, new Int8Array(N));
    let liveSig = 0, liveW = 0, deadQuiet = 0, deadW2 = 0, essSig = 0, essW = 0, s3Sig = 0, s3W = 0;
    // v1.4 ⓑ: 산 첫 톡 = 꼭 필요한 톡(옛 정의 '살아 있음'도 같이 보고) · ★3 계획 톡의 신호율은 따로
    const C = simCache(L), ess = essentialTaps(L, d, C), in3 = L.blocks.map(() => false);
    plansOf(L, d, (ch) => {
      if (C.sim(ch).stars === 3) ch.forEach((v, i) => void (v && (in3[i] = true)));
    });
    taps.forEach((i, k) => {
      const c1 = new Int8Array(N);
      c1[i] = capOf3(L.blocks[i]);
      const nx = support3(L, c1), moved = simulate3(L, c1).moved, lost = lostFeet(now0, nx).length, w = w0[k];
      const signal = moved || lost > 0, quiet = !moved && !lost && feetKey3(now0) === feetKey3(nx);
      if (ess[i]) (essW += w), (essSig += signal ? w : 0);
      if (in3[i]) (s3W += w), (s3Sig += signal ? w : 0);
      if (alive[i]) (liveW += w), (liveSig += signal ? w : 0);
      else (deadW2 += w), (deadQuiet += quiet ? w : 0);
    });
    const f4bLiveOld = liveW ? liveSig / liveW : 1, f4bQuietDead = deadW2 ? deadQuiet / deadW2 : 1;
    const f4bLive = essW ? essSig / essW : 1, f4bLiveStar3 = s3W ? s3Sig / s3W : 1;
    const essIds = taps.filter((i) => ess[i]);
    const reactNew = essIds.filter((i) => {
      const c1 = new Int8Array(N);
      c1[i] = capOf3(L.blocks[i]);
      return simulate3(L, c1).moved || feetKey(c1) !== base;
    }).length / Math.max(1, essIds.length);
    // v1.4 ⓐ 처음 봇(꾹 3번 · 그려진 것만 · 글은 읽음 · 막다른 길 떼기 q .5) · ⓓ look2(F9)·고정 시점 look2·버릇 봇(F10)
    const ftS3 = { star3: 0 }, ftPrev = bots ? firstTimer(L, d, wMix, 'prev', 2000, C, 20, ftS3) : 0, ftBlind = bots ? firstTimer(L, d, wMix, 'blind', 2000, C) : 0;
    const ft1 = Math.min(ftPrev, ftBlind), ft5 = 1 - (1 - ft1) ** 5;
    const habitStar3 = bots ? habit(L, d, C, false) : 0, habitFlowerStar3 = bots ? habit(L, d, C, true) : 0, mis = bots ? misreadLook2(L, d, C) : { clear: 0, star3: 0 }, safety = bots ? safetyGap(L, d, wMix, C) : 0;
    // F4b-죽음(v1.3 ⓑ): 변화가 있는 죽은 첫 톡 뒤, 둘째 꾹(마지막 폭약이면 결과 꼬리표)에서 실패 기호가 뜨는 비율.
    // 화면 규칙: 마지막 폭약을 겨누면 늘 결과 꼬리표(verdict3) — 실패 계획이면 빨간 글. 마지막이 아니면 💥/빨간 상자가 있을 때만
    let dSig = 0, dAll = 0;
    taps.forEach((i) => {
      if (alive[i]) return;
      const c1 = new Int8Array(N);
      c1[i] = capOf3(L.blocks[i]);
      if (isQuiet(L, new Int8Array(N), i)) return;
      const leftAfter = d.charges - c1[i];
      // C008: 붙이자마자 '🚧 막다른 길'(bestReach 0)이 뜨면 그것이 실패 기호(📐 C008) · 손잡이 판은 움직이는 둘째 꾹에도 결과 꼬리표
      const alert = bestReach(L, c1, 1) === 0;
      taps.forEach((j) => {
        if (j === i || capOf3(L.blocks[j]) > leftAfter) return;
        const c2 = c1.slice();
        c2[j] = capOf3(L.blocks[j]);
        const o = simulate3(L, c2);
        if (o.ok) return;
        dAll++;
        const last = capOf3(L.blocks[j]) >= leftAfter;
        const drawn = alert || last || (d.save !== undefined && o.moved) || o.hits.some((h) => h > 0) || L.blocks.some((_, k) => o.die[k] < 0 && o.fy[k] + 1 > L.goal && (o.fx[k] !== L.blocks[k].x || o.fz[k] !== L.blocks[k].z || o.fy[k] !== L.blocks[k].y));
        if (drawn) dSig++;
      });
    });
    const f4bDead = dAll ? dSig / dAll : 1;
    // F7 별 기울기: 성공 계획 안의 ★1만·★2·★3 수, 공짜 별(모든 성공 계획이 받는 꽃밭·납작 별)
    let only1 = 0, two = 0, three = 0, okN = 0, flowerAll = true, flatAll = true;
    plansOf(L, d, (ch) => {
      const o = simulate3(L, ch);
      if (!o.ok) return;
      okN++;
      if (o.stars === 1) only1++;
      else if (o.stars === 2) two++;
      else three++;
      flowerAll &&= o.star[1];
      flatAll &&= o.star[2];
    });
    const freeStars = okN ? (flowerAll ? 1 : 0) + (flatAll ? 1 : 0) : 0;
    // F11 (σ16px, 4시점 · 붙일 블록 평균) · F13 (시작 시점, ★3 계획 중 가장 누르기 쉬운 것의 가장 어려운 블록)
    // v1.3: 통째로 가려진(보이는 넓이 0) 시점에선 ⟳ 해서 보이는 가장 가까운 시점에서 누른다(회전 수 보고)
    let rotations = 0;
    const raw = taps.map((i) => cams.map((c) => fingerHit(c, L, i, F11N)));
    const hits = taps.map((i, k) => cams.map((_, v) => {
      if (area[v][i] > 0) return raw[k][v];
      for (const dv of [1, 3, 2]) {
        const w = (v + dv) % 4;
        if (area[w][i] > 0) return (rotations += dv === 2 ? 2 : 1), raw[k][w];
      }
      return raw[k][v];
    }));
    const perBlock = hits.map((h) => h.reduce((a, x) => a + x.hit, 0) / 4);
    const f11min = perBlock.length ? Math.min(...perBlock) : 1, f11minAt = taps[perBlock.indexOf(f11min)];
    const f11 = taps.length ? hits.reduce((a, h) => a + h.reduce((b, x) => b + x.hit, 0) / 4, 0) / taps.length : 0;
    const f11first = taps.length ? hits.reduce((a, h) => a + h.reduce((b, x) => b + x.first, 0) / 4, 0) / taps.length : 0;
    // F14 v1.2 ⓓ: 속 블록 = 4시점 모두 σ16 적중 < .5
    const innerHit = taps.filter((_, k) => hits[k].every((x) => x.hit < 0.5)).length;
    const f11miss = taps.length ? hits.reduce((a, h) => a + h.reduce((b, x) => b + x.miss, 0) / 4, 0) / taps.length : 0;
    // v1.5 ⓐ·ⓔ: 고정 시점 look2 = 시작 시점 σ16 적중 ≥ .5인 블록만 · 돌려 보기 가치 = look2 − 고정 시점 look2
    const look2Star3 = bots ? look2(L, d, C) : 0, look2Fixed = bots ? look2(L, d, C, (i) => taps.includes(i) && raw[taps.indexOf(i)][0].hit >= 0.5) : 0, rotateValue = look2Star3 - look2Fixed;
    // F6(v1.6 보고): ★3 계획의 눈먼 수 — 붙여도 미리 보기(움직임·받침 모양)가 그대로인 수, 가장 좋은 순서 · 가장 좋은 ★3 계획
    let f6 = -1;
    const perms = (a: number[]): number[][] => (a.length <= 1 ? [a] : a.flatMap((x, k) => perms([...a.slice(0, k), ...a.slice(k + 1)]).map((r) => [x, ...r])));
    plansOf(L, d, (ch) => {
      if (C.sim(ch).stars !== 3) return;
      const pl = [...ch.keys()].filter((i) => ch[i] > 0);
      let best = 99;
      for (const order of perms(pl)) {
        const cur = new Int8Array(N);
        let blind = 0;
        // v1.7(🧪 C011 10): 이미 움직이고 있어도 미리 보기(조각이 놓일 자리 · 넘어질 방향 · 발 칸)가 그대로면 눈먼 수
        const pv = (x: Int8Array) => {
          const o = C.sim(x);
          return `${o.moved}|${[...o.fx].join(',')}|${[...o.fy].join(',')}|${[...o.fz].join(',')}|${[...o.die].map((v) => (v >= 0 ? 1 : 0)).join('')}|${feetKey3(support3(L, x))}`;
        };
        for (const i of order) {
          const before = pv(cur);
          cur[i] = capOf3(L.blocks[i]);
          if (pv(cur) === before) blind++;
        }
        best = Math.min(best, blind);
      }
      f6 = f6 < 0 ? best : Math.min(f6, best);
    });
    let f13 = 0;
    plansOf(L, d, (ch, plan) => {
      // 시작 시점 넓이 0인 블록은 0으로(📐 C010: ⟳ 대신 값이 들어가 F13이 부풀었다)
      if (simulate3(L, ch).stars === 3) f13 = Math.max(f13, Math.min(...plan.map((i) => (area[0][i] > 0 ? raw[taps.indexOf(i)][0].hit : 0))));
    });
    return { title: d.title, blocks: L.blocks.length, charges: d.charges, plans, clear: ok / plans, star3: s3 / plans, best, greedyStar3: gStar3 / 20, greedyClear: gClear / 20, firstTapStill: still / open,
      attachable: taps.length, inner, deadFirstTap: deadU, deadFirstTapW: deadW, liveFirstTapReact: reactNew, liveFirstTapReactOld: react,
      firstTimer5: ft5, firstTimer1: ft1, firstTimerPrev: ftPrev, firstTimerBlind: ftBlind, firstTimerStar3: ftS3.star3, firstTimer5Old: first5, firstTimer1Old: p1,
      look2Star3, look2Fixed, rotateValue, misreadClear: mis.clear, misreadStar3: mis.star3, misreadNA: !L.blocks.some((b) => b.m === STONE), misreadNoDiscrim: (mis.clear === gClear / 20 && mis.star3 === gStar3 / 20) || mis.star3 === look2Star3, safetyGap: safety, f6, habitStar3, habitFlowerStar3, f4bLiveOld, f4bLiveStar3, cellPx: cellPx(cams[0]), sidePx: cams[0].s * Math.sin(YAW0), startViewStar3MinFaces: Math.max(0, star3Vis),
      stars: { only1, two, three, freeStars }, f11, f11first, f11miss, f13, innerHit, f4bLive, f4bDead, f4bQuietDead, f11min, f11minAt: f11minAt === undefined ? '' : `${L.blocks[f11minAt].x},${L.blocks[f11minAt].y},${L.blocks[f11minAt].z}`, rotations };
  }
}

export function measure() {
  const stages = STAGES.map((d, k) => {
    const L = layoutOf(d, false);
    return { n: k + 1, title: d.title, charges: d.charges, best: starsOf(L, bestPlan(L)), greedy: starsOf(L, greedyPlan(L)), habit: starsOf(L, habitPlan(L)), random: randomRates(L) };
  });
  const greedy3 = stages.filter((x) => x.n >= 2 && x.greedy === 3).length;
  return {
    stages,
    summary: {
      allStar3Possible: stages.every((x) => x.best === 3),
      greedyStar3: `${greedy3}/${stages.length - 1} (2판~)`,
      habitStar3: `${stages.filter((x) => x.n >= 3 && x.habit === 3).length}/${stages.length - 2} (3판~)`,
      randomClear1: stages[0].random.clear,
    },
    runs: { smart: [1, 2, 3].map((sd) => runBot(demolitionSmart, sd)), random: [1, 2, 3].map((sd) => runBot(demolitionRandom, sd)) },
  };
}

if (process.argv[1]?.endsWith('funqa.ts')) {
  if (process.argv.includes('--n1000')) setF11N(1000);
  const r = measure();
  for (const x of r.stages) console.log(`${x.n} ${x.title.padEnd(10)} 폭약${x.charges} 최선★${x.best} 미리보기★${x.greedy} 버릇★${x.habit} 무작위 성공${(x.random.clear * 100).toFixed(0)}% ★3 ${(x.random.star3 * 100).toFixed(0)}%`);
  console.log(r.summary, r.runs);
  const r3 = measure3D();
  for (const x of r3) console.log(`3D ${x.title} 블록${x.blocks} 폭약${x.charges} 계획${x.plans} 성공${(x.clear * 100).toFixed(1)}% ★3 ${(x.star3 * 100).toFixed(1)}% 최선★${x.best} 미리보기탐욕(동점 무작위) ★3 ${x.greedyStar3} 성공 ${x.greedyClear} 첫 톡 꿈쩍 안 함 ${(x.firstTapStill * 100).toFixed(0)}%`);
  for (const x of r3) console.log(`   v1.1: 별 기울기 ★1만 ${x.stars.only1} ★2 ${x.stars.two} ★3 ${x.stars.three} 공짜 별 ${x.stars.freeStars} · F11 σ16px 떼는 순간 ${x.f11.toFixed(3)}(첫 닿음 ${x.f11first.toFixed(2)}) 취소 ${x.f11miss.toFixed(3)} 블록별 최저 ${x.f11min.toFixed(3)}@${x.f11minAt} ⟳${x.rotations} · 속(σ16 < .5) ${x.innerHit} · F4b 살아 있는 첫 톡 신호 ${x.f4bLive.toFixed(2)} F4b-죽음(둘째 꾹 실패 기호) ${x.f4bDead.toFixed(2)} · (옛 v1.2 '변화 없음' ${x.f4bQuietDead.toFixed(2)}) · F13 ${x.f13.toFixed(2)} · 옆면 ${x.sidePx.toFixed(1)}px`);
  for (const x of r3) console.log(`   FUN v1.7: 처음 봇(꾹 3번) 미리 보기형 ${x.firstTimerPrev.toFixed(2)} · 안 보는 형 ${x.firstTimerBlind.toFixed(2)} → 5회 ${x.firstTimer5.toFixed(2)} · 첫 시도 ★3 ${x.firstTimerStar3.toFixed(2)} (옛 ${x.firstTimer5Old.toFixed(2)}) · look2 ★3 ${x.look2Star3.toFixed(2)} · 고정 시점 look2 ${x.look2Fixed.toFixed(2)} · 돌려 보기 가치 ${x.rotateValue.toFixed(2)} · 오해 봇(look2 깊이) 성공 ${x.misreadClear.toFixed(2)} ★3 ${x.misreadStar3.toFixed(2)}${x.misreadNA ? ' (해당 없음 — 돌 없음)' : x.misreadNoDiscrim ? ' (판별력 0 — greedy1 또는 look2와 같음)' : ''} · ⓕ 안전 차이 ${x.safetyGap.toFixed(2)} · F6 눈먼 수 ${x.f6} · 버릇 ${x.habitStar3.toFixed(2)} · 꽃 피함 버릇 ${x.habitFlowerStar3.toFixed(2)} · F4b ⓒ 꼭 필요한 톡 ${x.f4bLive.toFixed(2)} (옛 ${x.f4bLiveOld.toFixed(2)} · ★3 톡 ${x.f4bLiveStar3.toFixed(2)}) · F5 ${x.liveFirstTapReact.toFixed(2)} (옛 ${x.liveFirstTapReactOld.toFixed(2)})`);
  for (const x of r3) console.log(`   FUN v1: 붙일 블록 ${x.attachable}(≤24) 속 ${x.inner}(0) · 죽은 첫 톡 ${x.deadFirstTap.toFixed(2)} 가중 ${x.deadFirstTapW.toFixed(2)} · 살아 있는 첫 톡 반응 ${x.liveFirstTapReact.toFixed(2)} · 처음 봇 1회 ${x.firstTimer1.toFixed(2)} 5회 ${x.firstTimer5.toFixed(2)} · 칸 ${x.cellPx.toFixed(1)}px(≥36) · 시작 시점 ★3 블록 최소 ${x.startViewStar3MinFaces.toFixed(2)}면`);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: 'C014', f11n: F11N, ...r, stages3d: measure3D() }, null, 1) + '\n');
}
