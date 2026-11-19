/**
 * FUN QA 측정기 (M0 기준선) — 봇 네 종류로 판별 한 번 도전 + 처음부터 끝까지 한 판을 돌려 지표를 뽑는다 → studio/slowdash/reports/funqa.json
 *   npx tsx studio/slowdash/funqa.ts [시드 수=12]
 * 봇: 장인(줄 세워 베기 — 후보 선을 다 그어 보고 고름) · 버릇①(늘 가장 가까운 적으로) · 버릇②(늘 가장 많이 꿰는 줄로 바로)
 *   · 아무 데나 번쩍(처음 하는 사람 대역)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { mulberry32 } from './rng.ts';
import { STAGES, slowdash as g, slowdashHabit, slowdashHabit2, slowdashRandom, slowdashSmart, startStage, type DashState } from './game.ts';

export interface Try { ok: boolean; stars: number; sec: number; best: number; hits: number; dashes: number; s: DashState }

/** k판을 한 번 도전(첫 결과가 나올 때까지, 하트 무관) */
export function tryStage(bot: Bot<DashState>, seed: number, k: number, maxSec = 300): Try {
  const s = g.create(seed);
  if (k) startStage(s, k);
  const rng = mulberry32(seed ^ 0x9e3779b9), t0 = s.t, d0 = s.dashes;
  while (s.phase !== 'result' && s.t - t0 < maxSec * 60) g.step(s, bot.act(s, rng));
  const ok = s.phase === 'result' && s.ok;
  return { ok, stars: ok ? s.got : 0, sec: (s.t - t0) / 60, best: s.best, hits: s.hits, dashes: s.dashes - d0, s };
}

/** 처음 10초 안에 맞은 적이 있나(첫인상 — 공장 기준 17) */
function hurtIn10(bot: Bot<DashState>, seed: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  while (s.t < 600 && !g.over(s)) g.step(s, bot.act(s, rng));
  return { hurt: s.hits > 0 || s.stage === 0 && s.phase === 'result' && !s.ok, firstPress: s.firstPress, firstBig: s.firstBig };
}

const r2 = (v: number) => Math.round(v * 100) / 100;
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const median = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : 0;
};

export const BOTS: Record<string, Bot<DashState>> = { smart: slowdashSmart, habit: slowdashHabit, habit2: slowdashHabit2, random: slowdashRandom };

export function measure(seeds = 12) {
  const stages = STAGES.map((d, k) => {
    const row: Record<string, unknown> = { k: k + 1, key: d.key, name: d.name, stars: d.stars.map((q) => q.label) };
    for (const [name, bot] of Object.entries(BOTS)) {
      const t = Array.from({ length: seeds }, (_, i) => tryStage(bot, 101 + i * 7, k));
      row[name] = {
        clear: r2(mean(t.map((x) => +x.ok))),
        star: r2(mean(t.map((x) => x.stars))),
        star3: r2(mean(t.map((x) => +(x.stars === 3)))),
        sec: r2(median(t.map((x) => x.sec))),
        best: r2(mean(t.map((x) => x.best))),
        hit: r2(mean(t.map((x) => x.hits))),
      };
    }
    return row;
  });
  const runs: Record<string, unknown> = {};
  const score: Record<string, number> = {};
  for (const [name, bot] of Object.entries(BOTS)) {
    const r = Array.from({ length: seeds }, (_, i) => runBot(g, bot, 501 + i * 13, 60 * 1500));
    score[name] = mean(r.map((x) => x.score));
    runs[name] = {
      score: Math.round(score[name]),
      stagesCleared: r2(mean(r.map((x) => (x.s.won ? STAGES.length : x.s.stage)))),
      won: r2(mean(r.map((x) => +x.s.won))),
      stars: r2(mean(r.map((x) => x.s.stars))),
      min: r2(median(r.map((x) => x.ticks / 60)) / 60),
    };
  }
  const first = Array.from({ length: seeds * 4 }, (_, i) => hurtIn10(slowdashRandom, 901 + i));
  const habit3 = (b: string) => r2(Math.max(...stages.slice(2).map((r) => (r[b] as { star3: number }).star3)));
  return {
    at: new Date().toISOString().slice(0, 10),
    seeds,
    gap: r2(score.smart / Math.max(1, score.random)),
    runs,
    firstImpression: { randomHurtIn10s: r2(mean(first.map((x) => +x.hurt))), firstPressSec: r2(median(first.map((x) => x.firstPress / 60))) },
    habitStar3Max3plus: { habit: habit3('habit'), habit2: habit3('habit2') },
    stages,
  };
}

if (process.argv[1]?.endsWith('funqa.ts')) {
  const n = Number(process.argv[2]) || 12, t0 = Date.now();
  const m = measure(n);
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify(m, null, 1) + '\n');
  console.log(`격차 ${m.gap}× · 처음 10초 맞음(무작위) ${m.firstImpression.randomHurtIn10s} · 버릇 ★3(3판~) 최대 ${m.habitStar3Max3plus.habit}/${m.habitStar3Max3plus.habit2} · ${((Date.now() - t0) / 1000).toFixed(1)}초`);
  for (const r of m.stages) {
    const f = (b: string) => { const x = r[b] as { clear: number; star: number; sec: number }; return `${b} ${x.clear}/★${x.star}/${x.sec}s`; };
    console.log(`${r.k} ${r.name}: ${Object.keys(BOTS).map(f).join(' · ')}`);
  }
  console.log(JSON.stringify(m.runs));
}
