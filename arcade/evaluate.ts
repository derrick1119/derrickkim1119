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
import { mulberry32 } from '../engine/rng.ts';
import { NO_INPUT, REACT, runBot, type Bot, type GameDef } from './core.ts';
import { GAMES } from './registry.ts';

export interface ArcadeReport {
  id: string;
  name: string;
  n: number;
  dumb: { score: number; sec: number };
  smart: { score: number; sec: number; capped: number };
  skillGap: number;
  parts: { skill: number; onboarding: number; session: number; simplicity: number; unfold?: number };
  /** 잘하는 봇 판에서 30·60·120초 시점의 '새로 등장한 것' 수 (reveals가 있는 게임만) */
  reveals?: [number, number, number];
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
  // 펼쳐짐: 잘하는 봇 판을 다시 돌려 30·60·120초(또는 끝난 시점)의 reveals를 잰다
  let reveals: [number, number, number] | undefined;
  if (g.reveals) {
    const at = [0, 0, 0];
    for (const sd of seeds.slice(0, 8)) {
      const st = g.create(sd), rng = mulberry32(sd ^ 0x9e3779b9);
      let held = NO_INPUT, t = 0;
      for (; t < 60 * 120 && !g.over(st); t++) {
        const inp = t % REACT === 0 ? (held = smart.act(st, rng)) : { ...held, tap: false, move: undefined, pick: undefined };
        g.step(st, inp);
        if (t === 60 * 30 - 1) at[0] += g.reveals(st);
        if (t === 60 * 60 - 1) at[1] += g.reveals(st);
      }
      // 일찍 끝난 판은 끝난 시점 값으로 센다 (0023: 안 그러면 60초 값이 30초 값보다 작게 나왔다)
      if (t < 60 * 30) at[0] += g.reveals(st);
      if (t < 60 * 60) at[1] += g.reveals(st);
      at[2] += g.reveals(st);
    }
    reveals = at.map((x) => +(x / 8).toFixed(1)) as [number, number, number];
  }
  const parts: ArcadeReport['parts'] = {
    skill: clamp(Math.log(skillGap) / Math.log(8)), // 8배 이상이면 만점
    onboarding: clamp((dumbSec - 3) / 9), // 3초 0점 · 12초 만점
    session: clamp(smartSec / 45) * (1 - capped), // 45초 이상 만점, 3분 넘게 버티는 판 비율만큼 감점
    simplicity: clamp(1 - (g.rules.length - 2) * 0.15) * (g.controls === 'leftright' ? 0.92 : 1),
  };
  // 2분 안에 새로 등장한 것 4가지면 만점 (오너 피드백 0022). reveals 없는 옛 게임은 이 항목 없이 잰다
  if (reveals) parts.unfold = clamp(reveals[2] / 4);
  const terms = [[parts.skill, 2], [parts.onboarding, 1], [parts.session, 1], [parts.simplicity, 1], ...(parts.unfold === undefined ? [] : [[parts.unfold, 2]])] as [number, number][];
  const fun = Math.exp(terms.reduce((a, [v, w]) => a + w * Math.log(0.05 + v), 0) / terms.reduce((a, [, w]) => a + w, 0)) / 1.05;
  return {
    id: g.id, name: g.name, n,
    dumb: { score: dumbScore, sec: +dumbSec.toFixed(1) },
    smart: { score: smartScore, sec: +smartSec.toFixed(1), capped },
    skillGap: +skillGap.toFixed(2),
    reveals,
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
    console.log(`${r.name.padEnd(8)} 재미 ${r.fun.toFixed(3)}${r.reveals ? ` · 펼쳐짐 ${r.reveals.join('/')}` : ''} · 숙련격차 ${r.skillGap}× · 못함 ${r.dumb.sec}s/${r.dumb.score}점 · 잘함 ${r.smart.sec}s/${r.smart.score}점 (3분 버팀 ${Math.round(r.smart.capped * 100)}%) · ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  }
  writeFileSync(join(import.meta.dirname, 'reports', 'eval.json'), JSON.stringify(out, null, 1) + '\n');
}
