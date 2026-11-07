/**
 * 아케이드 계기판 (실험 0011). 봇 두 종류(못하는 사람·잘하는 사람)로 같은 게임을 여러 판 돌려
 * 기계가 잴 수 있는 재미의 그림자를 잰다. 진짜 재미는 오너가 A|B로 정한다.
 *
 *  숙련 격차   잘하는 봇 점수 ÷ 못하는 봇 점수 — 실력이 결과를 바꾸는가 (작으면 운 게임)
 *  첫 판 여유  못하는 봇이 버틴 시간 — 처음 해도 바로 죽지 않는가 (5초 미만이면 좌절)
 *  한 판 길이  잘하는 봇이 버틴 시간 — 30초~3분이면 "한 판 더"에 좋다 (3분 넘게 버티면 긴장 부족)
 *  단순함      규칙 줄 수·버튼 수
 *
 *   npx tsx arcade/evaluate.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REACT, runBot, type Bot, type GameDef } from './core.ts';
import { GAMES } from './registry.ts';

export interface ArcadeReport {
  id: string;
  name: string;
  n: number;
  dumb: { score: number; sec: number };
  smart: { score: number; sec: number; capped: number };
  skillGap: number;
  parts: { skill: number; onboarding: number; session: number; simplicity: number };
  fun: number;
}

const median = (a: number[]) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2;
};
const clamp = (x: number) => Math.max(0, Math.min(1, x));

export function evaluateGame<S>(g: GameDef<S>, dumb: Bot<S>, smart: Bot<S>, n = 24): ArcadeReport {
  const seeds = [...Array(n).keys()].map((i) => 1000 + i * 7919);
  const d = seeds.map((sd) => runBot(g, dumb, sd));
  const m = seeds.map((sd) => runBot(g, smart, sd, 60 * 180, REACT));
  const cap = 60 * 180;
  const dumbScore = median(d.map((r) => r.score)), smartScore = median(m.map((r) => r.score));
  const dumbSec = median(d.map((r) => r.ticks)) / 60, smartSec = median(m.map((r) => r.ticks)) / 60;
  const capped = m.filter((r) => r.ticks >= cap).length / n;
  const skillGap = (smartScore + 1) / (dumbScore + 1);
  const parts = {
    skill: clamp(Math.log(skillGap) / Math.log(8)), // 8배 이상이면 만점
    onboarding: clamp((dumbSec - 3) / 9), // 3초 0점 · 12초 만점
    session: clamp(smartSec / 45) * (1 - capped), // 45초 이상 만점, 3분 넘게 버티는 판 비율만큼 감점
    simplicity: clamp(1 - (g.rules.length - 2) * 0.15) * (g.controls === 'leftright' ? 0.92 : 1),
  };
  const fun = Math.exp((Math.log(0.05 + parts.skill) * 2 + Math.log(0.05 + parts.onboarding) + Math.log(0.05 + parts.session) + Math.log(0.05 + parts.simplicity)) / 5) / 1.05;
  return {
    id: g.id, name: g.name, n,
    dumb: { score: dumbScore, sec: +dumbSec.toFixed(1) },
    smart: { score: smartScore, sec: +smartSec.toFixed(1), capped },
    skillGap: +skillGap.toFixed(2),
    parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, +v.toFixed(3)])) as ArcadeReport['parts'],
    fun: +fun.toFixed(3),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out: Record<string, ArcadeReport> = {};
  for (const e of GAMES) {
    const t0 = performance.now();
    const r = evaluateGame(e.game as GameDef<unknown>, e.dumb as Bot<unknown>, e.smart as Bot<unknown>);
    out[r.id] = r;
    console.log(`${r.name.padEnd(8)} 재미 ${r.fun.toFixed(3)} · 숙련격차 ${r.skillGap}× · 못함 ${r.dumb.sec}s/${r.dumb.score}점 · 잘함 ${r.smart.sec}s/${r.smart.score}점 (3분 버팀 ${Math.round(r.smart.capped * 100)}%) · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  }
  writeFileSync(join(import.meta.dirname, 'reports', 'eval.json'), JSON.stringify(out, null, 1) + '\n');
}
