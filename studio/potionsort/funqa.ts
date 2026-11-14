/**
 * FUN QA 측정 (봇): 판별 통과율·★3 비율 — 물약 장인(내다봄) · 버릇(부을 수 있는 첫 수) · 아무 병이나 톡(무작위).
 * 오너 기준 11(전략 깊이): 버릇 봇의 ★3 비율이 낮아야 한다. 오너 기준 7: 무작위가 1판은 거의 깬다.
 *   npx tsx studio/potionsort/funqa.ts [시드 수=12]  → studio/potionsort/reports/funqa.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import { runBot, type Bot } from './core.ts';
import { STAGES, potionsort as g, potionsortHabit, potionsortRandom, potionsortSmart, startStage, type PotionState } from './game.ts';

export const BOTS: Record<string, Bot<PotionState>> = { smart: potionsortSmart, habit: potionsortHabit, random: potionsortRandom };

/** 한 판만: i판을 시작해 결과가 날 때까지(최대 3분). ok·별·붓기 수·걸린 초 */
export function playStage(bot: Bot<PotionState>, seed: number, i: number) {
  const s = g.create(seed);
  if (i > 0) startStage(s, i);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let t = 0;
  while (s.phase !== 'result' && t < 60 * 180) (g.step(s, bot.act(s, rng)), t++);
  const ok = s.phase === 'result' && s.ok;
  return { ok, stars: ok ? s.got : 0, pours: s.S.pours, par: s.L.par, limit: s.L.limit, sec: t / 60 };
}

export function measure(seeds = 12) {
  const stages = STAGES.map((d, i) => {
    const row: Record<string, unknown> = { stage: i + 1, key: d.key, name: d.name };
    for (const [k, b] of Object.entries(BOTS)) {
      const rs = Array.from({ length: seeds }, (_, n) => playStage(b, 1000 + n * 7919, i));
      row[k] = {
        win: +(rs.filter((r) => r.ok).length / seeds).toFixed(3),
        star3: +(rs.filter((r) => r.stars === 3).length / seeds).toFixed(3),
        pours: +(rs.reduce((a, r) => a + r.pours, 0) / seeds).toFixed(1),
        sec: +(rs.reduce((a, r) => a + r.sec, 0) / seeds).toFixed(1),
      };
    }
    const r0 = playStage(potionsortSmart, 1000, i);
    row.par = r0.par;
    row.limit = r0.limit;
    return row;
  });
  // 처음부터 끝까지 한 판(하트 3): 숙련 격차 = 장인 점수 ÷ 무작위 점수
  const full = Object.fromEntries(Object.entries(BOTS).map(([k, b]) => {
    const rs = Array.from({ length: Math.min(seeds, 6) }, (_, n) => runBot(g, b, 500 + n * 104729, 60 * 900));
    return [k, +(rs.reduce((a, r) => a + r.score, 0) / rs.length).toFixed(1)];
  }));
  return { seeds, stages, full, skillGap: +((full.smart as number) / Math.max(1, full.random as number)).toFixed(2) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure(Number(process.argv[2] ?? 12));
  const out = join(import.meta.dirname, 'reports');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'funqa.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 10), build: 'M0', ...r }, null, 1) + '\n');
  console.table(r.stages.map((x: any) => ({ 판: `${x.stage} ${x.name}`, 장인: `${x.smart.win} ★3 ${x.smart.star3}`, 버릇: `${x.habit.win} ★3 ${x.habit.star3}`, 무작위: `${x.random.win}`, '붓기 장인/기준/한도': `${x.smart.pours}/${x.par}/${x.limit}`, 초: x.smart.sec })));
  console.log('한 판 점수', r.full, '숙련 격차', r.skillGap);
}
