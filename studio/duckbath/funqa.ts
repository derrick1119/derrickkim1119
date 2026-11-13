/**
 * FUN QA 계기판 — 유저군 봇으로 판별 재미 지표를 잰다. 기준과 이유는 FUN.md. 결과는 reports/funqa.json (+ 표를 콘솔에).
 *   npx tsx studio/duckbath/funqa.ts [런 수=20] [--area]
 * 유저군: 숙련 = 물결 박사(두 수 앞 탐색) · 캐주얼 = 상식으로 오리 뒤를 톡(내다보기 없음, D001) · 처음 = 아무 데나 찰박(무작위)
 *   · 배우는 처음 = 다시 할수록 캐주얼식으로 칠 확률 0.25→0.5→0.75 (FUN v1 N2·C5, D003).
 * D001: 하트가 없어져 실패하면 그 판만 다시 한다. 사람은 무한히 다시 하지 않으니, 봇은 한 판에서 RETRY번 다시 하고도 못 깨면 그만둔다
 *   (배우는 처음 봇만 RETRY_LEARN번 — 다시 횟수 분포(C5)를 보려고).
 * D003 추가: 판별 ★톡·★황금(E6, 황금 정책 0·50·75%) · 다시 횟수 중앙/p90(C5) · 실패 집중도(W1) · 여유 톡 곡선(W2) · --area 정답 면적(C4, par 1 판).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../../engine/rng.ts';
import type { Bot, Input } from './core.ts';
import { STAGES, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, failText, makeCasual, startStage, type DuckState } from './game.ts';

/** 한 판에서 다시 하기 허용 횟수 (첫 시도 + 3번) */
export const RETRY = 3;
/** 배우는 처음 봇의 다시 한도 (C5 p90을 재려고 넉넉히) */
export const RETRY_LEARN = 30;

export interface StageLog { stage: number; ok: boolean; sec: number; taps: number; stars: number; why: string; tapStar: boolean; goldStar: boolean; sucks: number; chomps: number; failKind?: string }
export interface Run { stages: StageLog[]; score: number; sec: number; reached: number; won: boolean; gaveUp: number; firstTapNest: number }

/** 배우는 처음 봇 (FUN N2): 판 시도마다 캐주얼식으로 칠 확률 0.25 → 0.5 → 0.75, 아니면 무작위 */
export function makeLearner(): Bot<DuckState> {
  const mem = new WeakMap<object, { key: string; cas: boolean }>();
  return {
    name: '배우는 처음',
    act(s, rng): Input {
      const key = `${s.stage}:${s.tries}:${s.used}`;
      let m = mem.get(s);
      if (!m || m.key !== key) mem.set(s, (m = { key, cas: rng() < [0.25, 0.5, 0.75][Math.min(2, s.stageTries)] }));
      return m.cas ? duckbathCasual.act(s, rng) : duckbathRandom.act(s, rng);
    },
  };
}

/** 봇 한 판(8판을 마치거나 한 판에서 retry번 넘게 실패할 때까지). 판이 끝날 때마다 기록 */
export function play(bot: Bot<DuckState>, seed: number, maxSec = 900, retry = RETRY): Run {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9), logs: StageLog[] = [];
  let phase = s.phase, t0 = 0, gaveUp = 0, tap1 = -1, firstTapNest = -1;
  while (!g.over(s) && s.t < maxSec * 60) {
    g.step(s, bot.act(s, rng));
    // 첫 판 첫 톡 3초 뒤 둥지에 든 오리 수 (FUN N3 · M1 허들 1)
    if (tap1 < 0 && s.used > 0) tap1 = s.t;
    if (tap1 >= 0 && firstTapNest < 0 && s.t - tap1 >= 180) firstTapNest = s.objs.filter((o) => o.k <= 1 && o.st >= 0).length;
    if (phase === 'play' && s.phase === 'result') {
      logs.push({ stage: s.stage + 1, ok: s.ok, sec: (s.t - t0) / 60, taps: s.used, stars: s.ok ? s.got : 0, why: s.why, tapStar: s.ok && s.starOk[1], goldStar: s.ok && s.starOk[2], sucks: s.sucks, chomps: s.chomps, failKind: s.ok ? undefined : failText(s).kind });
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
const pct = (xs: number[], p: number) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * p))] : NaN);
const r2 = (x: number) => Math.round(x * 100) / 100;
const rate = (xs: boolean[]) => (xs.length ? r2(xs.filter(Boolean).length / xs.length) : null);

function group(bot: Bot<DuckState>, n: number, retry: number) {
  const runs = Array.from({ length: n }, (_, k) => play(bot, 1000 + k * 7, 900, retry));
  const per = STAGES.map((d, i) => {
    const byRun = runs.map((r) => r.stages.filter((l) => l.stage === i + 1)).filter((L) => L.length);
    const L = byRun.flat(), oks = L.filter((l) => l.ok), cleared = byRun.filter((B) => B.some((l) => l.ok));
    const retries = cleared.map((B) => B.findIndex((l) => l.ok));
    return {
      stage: i + 1, tried: byRun.length, cleared: cleared.length,
      clearRate: byRun.length ? r2(cleared.length / byRun.length) : null, // 다시 하기 retry번 안에
      firstTry: byRun.length ? r2(byRun.filter((B) => B[0].ok).length / byRun.length) : null,
      retryMed: med(retries), retryP90: pct(retries, 0.9), // C5
      medSec: r2(med(oks.map((l) => l.sec))), humanSec: r2(med(oks.map((l) => l.sec + 3 * l.taps))), medTaps: med(oks.map((l) => l.taps)),
      stars: r2(oks.reduce((a, l) => a + l.stars, 0) / Math.max(1, oks.length)),
      tapStar: rate(oks.map((l) => l.tapStar)), goldStar: rate(oks.map((l) => l.goldStar)), // E6 (클리어한 시도 중)
      fails: L.filter((l) => !l.ok).length, pen: r2(L.reduce((a, l) => a + l.sucks + l.chomps, 0) / Math.max(1, L.length)),
      slack: d.taps - d.par, slackRatio: r2(d.taps / d.par), // W2
    };
  });
  const fails = per.map((p) => p.fails), totalFails = fails.reduce((a, b) => a + b, 0);
  const worst = fails.indexOf(Math.max(...fails));
  // N4 (FUN v1.4): 실패 카드 제목이 맞는 비율 — 주범 제목이면 주범 몫 ≥ 25% 또는 ≥ 2톡, '톡 바닥'이면 그 밖
  const fl = runs.flatMap((r) => r.stages.filter((l) => !l.ok)), big = (l: StageLog) => l.sucks + l.chomps >= 2 || (l.taps > 0 && (l.sucks + l.chomps) / l.taps >= 0.25);
  const N4 = fl.length ? r2(fl.filter((l) => (l.failKind !== 'taps') === big(l)).length / fl.length) : null;
  return {
    N4, runs: n, retry, medScore: med(runs.map((r) => r.score)), medSec: r2(med(runs.map((r) => r.sec))), winRate: r2(runs.filter((r) => r.won).length / n),
    medReached: med(runs.map((r) => r.reached)), firstTapNest: med(runs.map((r) => r.firstTapNest)),
    failWhy: Object.entries(runs.flatMap((r) => r.stages.filter((l) => !l.ok)).reduce<Record<string, number>>((a, l) => ((a[l.why] = (a[l.why] ?? 0) + 1), a), {})),
    W1: { stage: totalFails ? worst + 1 : 0, share: totalFails ? r2(fails[worst] / totalFails) : 0 }, // 실패 집중도
    stages: per,
  };
}

export function measure(n = 20) {
  const out: Record<string, unknown> = {
    숙련: group(duckbathSmart, n, RETRY), 캐주얼: group(duckbathCasual, n, RETRY), 처음: group(duckbathRandom, n, RETRY), 배우는처음: group(makeLearner(), n, RETRY_LEARN),
  };
  // E6 황금 정책 범위: 캐주얼이 황금 오리를 맨 나중에 미는 확률 0 · 0.5 · 0.75 → 판별 ★황금
  // FUN v1.3: 판정은 황금 정책 50%(= 기본 캐주얼 봇). 0%·75%는 보고만
  out['E6황금'] = Object.fromEntries([0, 0.75].map((gl) => [String(gl), group(makeCasual(gl), n, RETRY).stages.map((p) => p.goldStar)]));
  (out['E6황금'] as Record<string, unknown>)['0.5(판정)'] = (out['캐주얼'] as ReturnType<typeof group>).stages.map((p) => p.goldStar);
  // W2 (D003): par가 사람 기준이 됐으니 여유는 '톡 ÷ 숙련 봇 톡 수'로 잰다 (판 사이 꺾임이 벽)
  out['W2'] = STAGES.map((d, i) => r2(d.taps / Math.max(1, (out['숙련'] as ReturnType<typeof group>).stages[i].medTaps)));
  const sk = out['숙련'] as { medScore: number }, cs = out['캐주얼'] as { medScore: number }, nv = out['처음'] as { medScore: number };
  out['숙련격차'] = r2(sk.medScore / Math.max(1, cs.medScore));
  out['숙련격차_처음'] = r2(sk.medScore / Math.max(1, nv.medScore));
  return out;
}

/**
 * C4 정답 면적 (FUN v1.1, par 1 판): 물 위 20×25 격자 × 시드 3에서 한 톡으로 다 넣는 자리 비율 · 한 톡에 ★3까지.
 * par ≥ 2 판의 정의(첫 수 뒤 숙련 봇이 par 안에)는 미리 보기 봇과 함께 M2에서.
 */
export function area() {
  const A = g.aspect!, WY0 = 0.36, KY = 0.66, SB = 0.74, SF = 0.88, H = 1.2;
  const PX = (x: number, y: number) => 0.5 + (x - 0.5) * (SB + (SF - SB) * (y / H)), PY = (y: number) => WY0 + y * KY;
  const NO: Input = { tap: false, dir: 0, pointer: null };
  return STAGES.map((d, i) => {
    if (d.par !== 1) return { stage: i + 1, par: d.par, oneTap: null, oneTap3: null };
    let tot = 0, ok = 0, ok3 = 0;
    for (const seed of [1000, 1007, 1014])
      for (let gx = 0; gx < 20; gx++)
        for (let gy = 0; gy < 25; gy++) {
          const x = (gx + 0.5) / 20, y = ((gy + 0.5) / 25) * H, s = g.create(seed);
          startStage(s, i);
          if (s.L.islands.some((c) => Math.hypot(x - c.x, y - c.y) < c.r)) continue;
          g.step(s, { tap: false, dir: 0, pointer: { x: PX(x, y), y: PY(y) / A } });
          for (let k = 0; k < 700 && s.phase === 'play'; k++) g.step(s, NO);
          // 한 톡만 쓰고 끝까지 본다: 다음 톡을 치지 않으니 '톡을 다 썼어요' 전까지 물결이 다 퍼진다
          tot++;
          if (s.phase === 'result' && s.ok && s.used === 1) (ok++, s.starOk[2] && ok3++);
        }
    return { stage: i + 1, par: d.par, oneTap: r2((ok / tot) * 100), oneTap3: r2((ok3 / tot) * 100) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = Number(process.argv.find((a) => /^\d+$/.test(a)) ?? 20), res = measure(n) as Record<string, unknown>;
  if (process.argv.includes('--area')) res['C4'] = area();
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports/funqa.json'), JSON.stringify({ at: new Date().toISOString(), ...res }, null, 2) + '\n');
  for (const k of ['숙련', '캐주얼', '처음', '배우는처음'] as const) {
    const g2 = res[k] as ReturnType<typeof group>;
    console.log(`\n[${k}] 다시 한도 ${g2.retry} · 점수 중앙 ${g2.medScore} · 런 전체 ${g2.medSec}초 · 완주 ${g2.winRate} · 도달 판 중앙 ${g2.medReached} · 첫 톡 3초 뒤 둥지 ${g2.firstTapNest}마리 · W1 ${g2.W1.share}(${g2.W1.stage}판)${k === '배우는처음' ? ' ← W1 판정(FUN v1.2)' : ' (보고만)'} · N4(v1.4 문턱 일치 — 판정 아님, v1.5 환급 반사실은 미측정) ${g2.N4}`);
    console.log(`  실패 이유: ${g2.failWhy.map(([w, c]) => `${w} ${c}`).join(' · ') || '없음'}`);
    console.log('판 | 도전 | 클리어 | 첫 시도 | 다시 중앙/p90 | 사람초 | 톡 | 별 | ★톡 | ★황금 | 시도당 쏙꿀꺽');
    for (const st of g2.stages) console.log(`${st.stage} | ${st.tried} | ${st.clearRate} | ${st.firstTry} | ${st.retryMed}/${st.retryP90} | ${st.humanSec} | ${st.medTaps} | ${st.stars} | ${st.tapStar} | ${st.goldStar} | ${st.pen}`);
  }
  const s0 = (res['숙련'] as ReturnType<typeof group>).stages;
  console.log(`\nW2 톡÷숙련 톡: ${(res['W2'] as number[]).join(' · ')}  |  (참고) 톡−par: ${s0.map((p) => p.slack).join(' · ')}`);
  const e6 = res['E6황금'] as Record<string, (number | null)[]>;
  console.log(`E6 캐주얼 ★황금 (황금을 맨 나중에 미는 확률별): ${Object.entries(e6).map(([k, v]) => `${k}: ${v.join(' ')}`).join('  |  ')}`);
  if (res['C4']) console.log(`C4 (par 1 판, %): ${(res['C4'] as ReturnType<typeof area>).filter((c) => c.oneTap !== null).map((c) => `${c.stage}판 한 톡에 다 ${c.oneTap} · ★3 ${c.oneTap3}`).join('  |  ')}`);
  console.log(`숙련 격차(숙련÷캐주얼) ${res['숙련격차']}× (보고만) · 숙련÷처음 ${res['숙련격차_처음']}×`);
}
