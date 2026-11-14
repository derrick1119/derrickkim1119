/**
 * FUN QA 측정기 (M0 기준선) — 봇 세 종류로 판별 한 번 도전을 돌려 지표를 뽑는다 → studio/screwshop/reports/funqa.json
 *   npx tsx studio/screwshop/funqa.ts [시드 수=12]
 * 봇: 장인(본 것만으로 몇 수 앞 탐색) · 버릇(맞는 색부터) · 아무 나사나 톡(처음 하는 사람 대역)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Bot } from './core.ts';
import { mulberry32 } from './rng.ts';
import { STAGES, screwshop as g, screwshopHabit, screwshopRandom, screwshopSmart, startStage, starsOf, type ShopState } from './game.ts';

export interface Try { ok: boolean; stars: number; sec: number; peak: number; best: number }

/** k판을 한 번 도전(첫 결과가 나올 때까지) */
export function tryStage(bot: Bot<ShopState>, seed: number, k: number, maxSec = 600): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t;
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) g.step(s, bot.act(s, rng));
  const ok = s.phase === 'result' && s.ok;
  return { ok, stars: ok ? starsOf(STAGES[k], s.S) : 0, sec: (s.t - t0) / 60, peak: s.S.peak, best: s.S.best };
}

export const BOTS = { smart: screwshopSmart, habit: screwshopHabit, random: screwshopRandom };

export function measure(seeds = 12) {
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { stage: k + 1, name: `${d.emoji} ${d.name}` };
    for (const [name, bot] of Object.entries(BOTS)) {
      const r = Array.from({ length: seeds }, (_, i) => tryStage(bot, 1000 + i * 7, k));
      row[name] = {
        clear: +(r.filter((x) => x.ok).length / seeds).toFixed(2),
        star3: +(r.filter((x) => x.stars === 3).length / seeds).toFixed(2),
        stars: +(r.reduce((a, x) => a + x.stars, 0) / seeds).toFixed(2),
        sec: +(r.reduce((a, x) => a + x.sec, 0) / seeds).toFixed(1),
      };
    }
    return row;
  });
  const avg = (bot: string, key: string) => +(stages.reduce((a, r) => a + (r[bot] as Record<string, number>)[key], 0) / stages.length).toFixed(2);
  const summary = {
    smartStars: avg('smart', 'stars'), habitStars: avg('habit', 'stars'), randomStars: avg('random', 'stars'),
    smartStar3: avg('smart', 'star3'), habitStar3: avg('habit', 'star3'),
    randomClear1: (stages[0].random as Record<string, number>).clear,
    smartSec: avg('smart', 'sec'),
    /** 숙련 격차: 장인 평균 별 / 무작위 평균 별 */
    skillGap: +(avg('smart', 'stars') / Math.max(0.05, avg('random', 'stars'))).toFixed(2),
  };
  return { seeds, summary, stages };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 12), t0 = Date.now(), rep = measure(n);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 10), build: 'M0', ...rep }, null, 1) + '\n');
  console.log(JSON.stringify(rep.summary), `${((Date.now() - t0) / 1000).toFixed(0)}s`);
  for (const r of rep.stages) console.log(r.stage, r.name, JSON.stringify(r.smart), JSON.stringify(r.habit), JSON.stringify(r.random));
}
