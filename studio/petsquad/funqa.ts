/**
 * FUN QA 측정(M0 기준선) — 봇 넷(잘하는·버릇 둘·무작위)이 처음부터 끝까지 한 판씩, 시드 여럿.
 *   npx tsx studio/petsquad/funqa.ts → studio/petsquad/reports/funqa.json
 * 잰다: 끝까지 간 비율 · 평균 도달 판 · 평균 별 · 하트 · 한 판 시간(초) · 첫 톡 → 첫 '와'(초) · 큰 순간 수 · 판당 톡 수.
 * 판별 측정(판마다 ★3 비율·버릇 격차)은 M1에서 판 고르기와 함께 붙인다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { STAGE_COUNT, petsquad as g, petsquadHabit, petsquadHabit2, petsquadRandom, petsquadSmart, type PetState } from './game.ts';

export const BOTS: Bot<PetState>[] = [petsquadSmart, petsquadHabit, petsquadHabit2, petsquadRandom];
const r2 = (x: number) => Math.round(x * 100) / 100;

export function measure(seeds: number[]) {
  const out: Record<string, unknown> = {};
  for (const b of BOTS) {
    let won = 0, stage = 0, stars = 0, hearts = 0, sec = 0, wows = 0, taps = 0, firstBig = 0, nBig = 0;
    for (const seed of seeds) {
      const r = runBot(g, b, seed);
      const s = r.s;
      won += s.won ? 1 : 0;
      stage += s.won ? STAGE_COUNT : s.stage;
      stars += Math.max(0, s.stars);
      hearts += s.hearts;
      sec += r.ticks / 60;
      wows += g.wows(s);
      taps += s.buys + s.rerolls + s.swaps + s.sells;
      if (s.firstBig >= 0 && s.firstTap >= 0) (firstBig += (s.firstBig - s.firstTap) / 60), nBig++;
    }
    const n = seeds.length;
    out[b.name] = {
      끝까지: r2(won / n), 도달판: r2(stage / n), 별: r2(stars / n), 남은하트: r2(hearts / n), 한판초: Math.round(sec / n),
      큰순간: r2(wows / n), 톡: r2(taps / n), 첫톡에서첫와초: nBig ? r2(firstBig / nBig) : null,
    };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seeds = Array.from({ length: 12 }, (_, i) => i + 1);
  const res = { 날짜: new Date().toISOString().slice(0, 10), 판수: STAGE_COUNT, 시드: seeds.length, 봇: measure(seeds) };
  const dir = join(import.meta.dirname, 'reports');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'funqa.json'), JSON.stringify(res, null, 2) + '\n');
  console.log(JSON.stringify(res, null, 2));
}
