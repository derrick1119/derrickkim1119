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
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: 'M0', ...r }, null, 1) + '\n');
}
