/**
 * FUN QA 측정 (봇): 판별 성공률·★3 비율 — 정류장 박사(내다봄) · 버릇쟁이(버릇 하나) · 아무 데나 톡(무작위).
 * 오너 기준 11(전략 깊이): 버릇 봇의 ★3 비율이 낮아야 한다. 오너 기준 7: 무작위가 1판은 거의 깬다.
 *   npx tsx studio/animalbus/funqa.ts [시드 수=12]  → studio/animalbus/reports/funqa.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import { runBot, type Bot } from './core.ts';
import { STAGES, animalbus as g, animalbusHabit, animalbusRandom, animalbusSmart, layoutFor, startStage, type BusState } from './game.ts';
import { firstMoveWidth, follow, greedy, habit, honestBot, runSim, type SimBot } from './bots.ts';

export const BOTS: Record<string, Bot<BusState>> = { smart: animalbusSmart, habit: animalbusHabit, random: animalbusRandom };

/** 한 판만: i판을 시작해 결과가 날 때까지(최대 4분). ok·별·톡 수·걸린 초 */
export function playStage(bot: Bot<BusState>, seed: number, i: number) {
  const s = g.create(seed);
  if (i > 0) startStage(s, i);
  const rng = mulberry32(seed ^ 0x9e3779b9);
  let t = 0;
  while (s.phase !== 'result' && t < 60 * 240) (g.step(s, bot.act(s, rng)), t++);
  return { ok: s.phase === 'result' && s.ok, stars: s.phase === 'result' && s.ok ? s.got : 0, taps: s.taps, sec: t / 60 };
}

export function measure(seeds = 12) {
  const stages = STAGES.map((d, i) => {
    const row: Record<string, unknown> = { stage: i + 1, key: d.key, name: d.name };
    for (const [k, b] of Object.entries(BOTS)) {
      const rs = Array.from({ length: seeds }, (_, n) => playStage(b, 1000 + n * 7919, i));
      row[k] = {
        win: +(rs.filter((r) => r.ok).length / seeds).toFixed(3),
        star3: +(rs.filter((r) => r.stars === 3).length / seeds).toFixed(3),
        sec: +(rs.reduce((a, r) => a + r.sec, 0) / seeds).toFixed(1),
      };
    }
    return row;
  });
  // 처음부터 끝까지 한 판(하트 3): 숙련 격차 = 박사 점수 ÷ 무작위 점수
  const full = Object.fromEntries(Object.entries(BOTS).map(([k, b]) => {
    const rs = Array.from({ length: Math.min(seeds, 6) }, (_, n) => runBot(g, b, 500 + n * 104729, 60 * 900));
    return [k, +(rs.reduce((a, r) => a + r.score, 0) / rs.length).toFixed(1)];
  }));
  // M1-1 (C002): 판 단위 봇 — 전략 깊이(오너 기준 11). 통과 / ★3 비율 + 첫 수 ★3 정답 폭
  const SIM: Record<string, SimBot> = { habit, follow, greedy, honest: honestBot() };
  const depth = STAGES.map((d, i) => {
    const Ls = Array.from({ length: seeds }, (_, n) => layoutFor(1000 + n * 7919, i));
    const row: Record<string, unknown> = { stage: i + 1, name: d.name };
    for (const [k, b] of Object.entries(SIM)) {
      const rs = Ls.map((L, n) => runSim(L, b, n + 1));
      row[k] = { win: +(rs.filter((r) => r.ok).length / seeds).toFixed(3), star3: +(rs.filter((r) => r.stars === 3).length / seeds).toFixed(3) };
    }
    row.width = +(Ls.map((L) => firstMoveWidth(L).rate).reduce((a, x) => a + x, 0) / seeds).toFixed(3);
    return row;
  });
  return { seeds, stages, depth, full, skillGap: +((full.smart as number) / Math.max(1, full.random as number)).toFixed(2) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = measure(Number(process.argv[2] ?? 12));
  const out = join(import.meta.dirname, 'reports');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'funqa.json'), JSON.stringify({ at: new Date().toISOString().slice(0, 10), ...r }, null, 1) + '\n');
  console.table(r.stages.map((x: any) => ({ 판: `${x.stage} ${x.name}`, 박사: `${x.smart.win} ★3 ${x.smart.star3}`, 버릇: `${x.habit.win} ★3 ${x.habit.star3}`, 무작위: `${x.random.win}`, 초: x.smart.sec })));
  console.table(r.depth.map((x: any) => ({ 판: `${x.stage} ${x.name}`, 버릇: `${x.habit.win}/${x.habit.star3}`, 따라하기: `${x.follow.win}/${x.follow.star3}`, 탐욕: `${x.greedy.win}/${x.greedy.star3}`, 정직박사: `${x.honest.win}/${x.honest.star3}`, 첫수폭: x.width })));
  console.log('한 판 점수', r.full, '숙련 격차', r.skillGap);
}
