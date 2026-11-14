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
import { capOf3, forEachPlan, layoutOf3, simulate3, type Layout3 } from './sim3d.ts';
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
export function measure3D() {
  const v3 = (L: Layout3, ch: Int8Array) => {
    const o = simulate3(L, ch);
    return o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - o.hits.reduce((a, b) => a + b, 0);
  };
  return STAGES3.map((d) => {
    const L = layoutOf3(d);
    let plans = 0, ok = 0, s3 = 0, best = 0;
    forEachPlan(L, d.charges, (ch) => {
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
    return { title: d.title, blocks: L.blocks.length, charges: d.charges, plans, clear: ok / plans, star3: s3 / plans, best, greedyStar3: gStar3 / 20, greedyClear: gClear / 20, firstTapStill: still / open };
  });
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
  const r = measure();
  for (const x of r.stages) console.log(`${x.n} ${x.title.padEnd(10)} 폭약${x.charges} 최선★${x.best} 미리보기★${x.greedy} 버릇★${x.habit} 무작위 성공${(x.random.clear * 100).toFixed(0)}% ★3 ${(x.random.star3 * 100).toFixed(0)}%`);
  console.log(r.summary, r.runs);
  const r3 = measure3D();
  for (const x of r3) console.log(`3D ${x.title} 블록${x.blocks} 폭약${x.charges} 계획${x.plans} 성공${(x.clear * 100).toFixed(1)}% ★3 ${(x.star3 * 100).toFixed(1)}% 최선★${x.best} 미리보기탐욕(동점 무작위) ★3 ${x.greedyStar3} 성공 ${x.greedyClear} 첫 톡 꿈쩍 안 함 ${(x.firstTapStill * 100).toFixed(0)}%`);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: 'C002', ...r, stages3d: measure3D() }, null, 1) + '\n');
}
