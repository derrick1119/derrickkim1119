/**
 * FUN QA 계기판 — 유저군 봇으로 판별 재미 지표를 잰다. 기준과 이유는 FUN.md. 결과는 reports/funqa.json (+ 표를 콘솔에).
 *   npx tsx studio/duckbath/funqa.ts [판수=20]
 * 유저군: 숙련 = 물결 박사(두 수 앞 탐색) · 캐주얼 = 상식으로 오리 뒤를 톡(내다보기 없음, D001) · 처음 = 아무 데나 찰박(무작위).
 * D001: 하트가 없어져 실패하면 그 판만 다시 한다. 사람은 무한히 다시 하지 않으니, 봇은 한 판에서 RETRY번 다시 하고도 못 깨면 그만둔다.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import type { Bot } from './core.ts';
import { STAGES, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, type DuckState } from './game.ts';

/** 한 판에서 다시 하기 허용 횟수 (첫 시도 + 3번) */
export const RETRY = 3;

export interface StageLog { stage: number; ok: boolean; sec: number; taps: number; stars: number; why: string }
export interface Run { stages: StageLog[]; score: number; sec: number; reached: number; won: boolean; gaveUp: number; firstTapNest: number }

/** 봇 한 판(하트 3개가 다 떨어지거나 8판을 마칠 때까지). 판이 끝날 때마다 기록 */
export function play(bot: Bot<DuckState>, seed: number, maxSec = 900, retry = RETRY): Run {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9), logs: StageLog[] = [];
  let phase = s.phase, t0 = 0, gaveUp = 0, tap1 = -1, firstTapNest = -1;
  while (!g.over(s) && s.t < maxSec * 60) {
    g.step(s, bot.act(s, rng));
    // 첫 판 첫 톡 3초 뒤 둥지에 든 오리 수 (FUN N3 · M1 허들 1)
    if (tap1 < 0 && s.used > 0) tap1 = s.t;
    if (tap1 >= 0 && firstTapNest < 0 && s.t - tap1 >= 180) firstTapNest = s.objs.filter((o) => o.k <= 1 && o.st >= 0).length;
    if (phase === 'play' && s.phase === 'result') {
      logs.push({ stage: s.stage + 1, ok: s.ok, sec: (s.t - t0) / 60, taps: s.used, stars: s.ok ? s.got : 0, why: s.why });
      if (!s.ok && s.stageTries > retry) {
        gaveUp = s.stage + 1;
        break;
      }
    }
    if (phase === 'result' && s.phase === 'play') t0 = s.t;
    phase = s.phase;
  }
  return { stages: logs, score: g.score(s), sec: s.t / 60, reached: Math.min(STAGES.length, Math.max(1, ...logs.filter((l) => l.ok).map((l) => l.stage + 1))), won: s.won, gaveUp, firstTapNest: Math.max(0, firstTapNest) };
}

const med = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
const r2 = (x: number) => Math.round(x * 100) / 100;

export function measure(n = 20) {
  const groups: Record<string, Bot<DuckState>> = { 숙련: duckbathSmart, 캐주얼: duckbathCasual, 처음: duckbathRandom };
  const out: Record<string, unknown> = {};
  for (const [name, bot] of Object.entries(groups)) {
    const runs = Array.from({ length: n }, (_, k) => play(bot, 1000 + k * 7));
    const per = STAGES.map((_, i) => {
      const L = runs.flatMap((r) => r.stages.filter((l) => l.stage === i + 1));
      const tried = runs.filter((r) => r.stages.some((l) => l.stage === i + 1)).length;
      const cleared = runs.filter((r) => r.stages.some((l) => l.stage === i + 1 && l.ok)).length;
      return {
        stage: i + 1, tried, cleared, clearRate: tried ? r2(cleared / tried) : null, // 다시 하기 RETRY번 안에
        firstTry: tried ? r2(runs.filter((r) => r.stages.find((l) => l.stage === i + 1)?.ok).length / tried) : null,
        medSec: r2(med(L.filter((l) => l.ok).map((l) => l.sec))), medTaps: med(L.filter((l) => l.ok).map((l) => l.taps)),
        stars: r2(L.filter((l) => l.ok).reduce((a, l) => a + l.stars, 0) / Math.max(1, cleared)),
        fails: Object.entries(L.filter((l) => !l.ok).reduce<Record<string, number>>((a, l) => ((a[l.why] = (a[l.why] ?? 0) + 1), a), {})),
      };
    });
    out[name] = {
      runs: n, medScore: med(runs.map((r) => r.score)), medSec: r2(med(runs.map((r) => r.sec))), winRate: r2(runs.filter((r) => r.won).length / n),
      medReached: med(runs.map((r) => r.reached)), firstTapNest: med(runs.map((r) => r.firstTapNest)),
      failWhy: Object.entries(runs.flatMap((r) => r.stages.filter((l) => !l.ok)).reduce<Record<string, number>>((a, l) => ((a[l.why] = (a[l.why] ?? 0) + 1), a), {})),
      stages: per,
    };
  }
  const sk = out['숙련'] as { medScore: number }, cs = out['캐주얼'] as { medScore: number }, nv = out['처음'] as { medScore: number };
  out['숙련격차'] = r2(sk.medScore / Math.max(1, cs.medScore));
  out['숙련격차_처음'] = r2(sk.medScore / Math.max(1, nv.medScore));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv[2] ?? 20), res = measure(n);
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa.json'), JSON.stringify({ at: new Date().toISOString(), ...res }, null, 2) + '\n');
  for (const k of ['숙련', '캐주얼', '처음'] as const) {
    const g2 = res[k] as { medScore: number; medSec: number; winRate: number; medReached: number; firstTapNest: number; failWhy: [string, number][]; stages: { stage: number; tried: number; clearRate: number | null; firstTry: number | null; medSec: number; medTaps: number; stars: number }[] };
    console.log(`\n[${k}] 점수 중앙 ${g2.medScore} · 런 전체 ${g2.medSec}초 · 완주 ${g2.winRate} · 도달 판 중앙 ${g2.medReached} · 첫 톡 3초 뒤 둥지 ${g2.firstTapNest}마리`);
    console.log(`  실패 이유: ${g2.failWhy.map(([w, n]) => `${w} ${n}`).join(' · ') || '없음'}`);
    console.log('판 | 도전 | 클리어율 | 첫 시도 | 초 | 톡 | 별');
    for (const st of g2.stages) console.log(`${st.stage} | ${st.tried} | ${st.clearRate} | ${st.firstTry} | ${st.medSec} | ${st.medTaps} | ${st.stars}`);
  }
  console.log(`\n숙련 격차(숙련÷캐주얼) ${res['숙련격차']}× · 숙련÷처음 ${res['숙련격차_처음']}×`);
}
