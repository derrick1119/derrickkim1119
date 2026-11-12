/**
 * FUN QA 계기판 — 유저군별 재미 지표를 봇으로 잰다. 기준과 이유는 FUN.md. 결과는 reports/funqa.json.
 *   npx tsx studio/balloonpop/funqa.ts [판 수=40]
 * 유저군: 처음 하는 사람/캐주얼 = 아무 데나 톡(random) · 숙련 = 내다보는 봇(smart)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import { balloonpop as g, balloonpopRandom, balloonpopSmart, STAGE_COUNT, type PopState } from './game.ts';
import type { Bot } from './core.ts';

export interface GroupStat {
  /** 판별 도착 런 수 (10 미만이면 그 판 수치는 표본 부족) */
  n: number[];
  /** 판(스테이지)별: 그 판에 도착한 런 중 첫 시도에 깬 비율 */
  firstTry: number[];
  /** 판별 평균 별(깼을 때) */
  stars: number[];
  /** 끝까지 간 비율 */
  finish: number;
  /** 평균 도달 판(1부터) */
  reach: number;
  score: number;
  /** 한 런 평균 플레이 시간(분) */
  minutes: number;
}

export function measure(bot: Bot<PopState>, runs: number): GroupStat {
  const tried = new Array(STAGE_COUNT).fill(0), first = new Array(STAGE_COUNT).fill(0), starSum = new Array(STAGE_COUNT).fill(0), cleared = new Array(STAGE_COUNT).fill(0);
  let fin = 0, reach = 0, score = 0, ticks = 0;
  for (let r = 0; r < runs; r++) {
    const seed = 1000 + r * 7919, s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
    let stage = -1, attempt = 0, t = 0, wasResult = false;
    while (!g.over(s) && t < 60 * 60 * 10) {
      if (s.stage !== stage) (stage = s.stage), (attempt = 0), tried[stage]++;
      g.step(s, bot.act(s, rng));
      t++;
      const isResult = s.phase === 'result';
      if (isResult && !wasResult) {
        if (s.ok) (cleared[stage]++, (starSum[stage] += s.got), attempt === 0 && first[stage]++);
        attempt++;
      }
      wasResult = isResult;
    }
    if (s.won) fin++;
    reach += s.stage + 1;
    score += s.pts;
    ticks += t;
  }
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return {
    n: tried,
    firstTry: tried.map((n, k) => (n ? r2(first[k] / n) : 0)),
    stars: cleared.map((n, k) => (n ? r2(starSum[k] / n) : 0)),
    finish: r2(fin / runs),
    reach: r2(reach / runs),
    score: Math.round(score / runs),
    minutes: r2(ticks / runs / 3600),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2] ?? 40), t0 = Date.now();
  const casual = measure(balloonpopRandom, runs), expert = measure(balloonpopSmart, runs);
  const out = {
    runs,
    casual,
    expert,
    /** 숙련 격차: 숙련 점수 ÷ 캐주얼 점수 (고민 거리가 있는가) */
    skillGap: Math.round((expert.score / Math.max(1, casual.score)) * 100) / 100,
    sec: Math.round((Date.now() - t0) / 100) / 10,
  };
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa.json'), JSON.stringify(out, null, 2) + '\n');
  console.table({ 캐주얼: { ...casual, n: casual.n.join(' '), firstTry: casual.firstTry.join(' '), stars: casual.stars.join(' ') }, 숙련: { ...expert, n: expert.n.join(' '), firstTry: expert.firstTry.join(' '), stars: expert.stars.join(' ') } });
  console.log(`숙련 격차 ${out.skillGap}× · ${out.sec}s`);
}
