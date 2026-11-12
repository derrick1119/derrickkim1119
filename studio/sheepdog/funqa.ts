/**
 * FUN QA 계기: 봇 셋(잘함=양치기 박사 · 처음 하는 사람 근사=아무 데나 톡 · 판 하나씩 재는 판별 측정)으로 결정적 시뮬을 돌려
 *   판별 통과율·별·멍멍 여유를 잰다 → studio/sheepdog/reports/funqa.json
 *   npx tsx studio/sheepdog/funqa.ts [판 수=20]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { STAGES, jumpTo, sheepdog as g, sheepdogRandom, sheepdogSmart, type DogState } from './game.ts';
import { mulberry32 } from './rng.ts';

const N = Number(process.argv[2] ?? 20);
const here = import.meta.dirname;

/** 한 판(stage)만 따로: 그 판에서 시작해 통과/실패까지. 별 수와 쓴 멍멍 */
function onStage(bot: Bot<DogState>, seed: number, stage: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  jumpTo(s, stage);
  s.hearts = 1;
  const target = s.stage;
  let t = 0;
  while (s.stage === target && !s.dead && t < 60 * 120) {
    if (s.phase === 'result') return { ok: s.ok, stars: s.ok ? s.got : 0, used: s.S.used };
    g.step(s, bot.act(s, rng));
    t++;
  }
  return { ok: false, stars: 0, used: s.S.used };
}

const bots = { smart: sheepdogSmart, random: sheepdogRandom };
const per: Record<string, { name: string; max: number; par: number; smart: { clear: number; stars: number; used: number }; random: { clear: number } }> = {};
for (let k = 0; k < STAGES.length; k++) {
  const d = STAGES[k];
  const sm = Array.from({ length: N }, (_, i) => onStage(bots.smart, 1000 + i, k));
  const rd = Array.from({ length: N }, (_, i) => onStage(bots.random, 1000 + i, k));
  const avg = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2);
  per[k + 1] = {
    name: d.name, max: d.max, par: d.par,
    smart: { clear: avg(sm.map((r) => +r.ok)), stars: avg(sm.map((r) => r.stars)), used: avg(sm.filter((r) => r.ok).map((r) => r.used)) },
    random: { clear: avg(rd.map((r) => +r.ok)) },
  };
}
const full = (bot: Bot<DogState>) => Array.from({ length: N }, (_, i) => runBot(g, bot, 5000 + i, 60 * 60 * 15, 1).score);
const smartRun = full(bots.smart), randomRun = full(bots.random);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const report = {
  at: new Date().toISOString().slice(0, 10), runs: N, stages: per,
  run: { smartMean: Math.round(mean(smartRun)), randomMean: Math.round(mean(randomRun)), skillGap: +(mean(smartRun) / Math.max(1, mean(randomRun))).toFixed(1) },
};
mkdirSync(join(here, 'reports'), { recursive: true });
writeFileSync(join(here, 'reports', 'funqa.json'), JSON.stringify(report, null, 1) + '\n');
console.table(Object.entries(per).map(([k, v]) => ({ 판: k, 이름: v.name, 'par/max': `${v.par}/${v.max}`, 박사통과: v.smart.clear, 박사별: v.smart.stars, 박사멍멍: v.smart.used, 아무데나통과: v.random.clear })));
console.log('한 판 전체 점수', report.run);
