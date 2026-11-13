/**
 * FUN QA 계기: 봇 셋(잘함=양치기 박사(3수 앞) · 사람 근사=미리 보고 한 수(그리디, C003) · 처음 하는 사람 근사=아무 데나 톡)으로 결정적 시뮬을 돌려
 *   판별 통과율·별·멍멍 여유(par − 박사 멍멍, GDD §12 목표 {0,1})를 잰다 → studio/sheepdog/reports/funqa.json
 *   C002부터 판 배치가 고정이라 박사 결과는 시드와 상관없이 같다(무작위 봇만 시드마다 다름).
 *   npx tsx studio/sheepdog/funqa.ts [판 수=20]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { STAGES, jumpTo, starCount, topOf, sheepdog as g, sheepdogCareful, sheepdogGreedy, sheepdogNaive, sheepdogRandom, sheepdogSmart, type DogState } from './game.ts';
import { mulberry32 } from './rng.ts';

const N = Number(process.argv[2] ?? 20);
/** --deep: 경계 판(1-8)의 조심 막힘을 200회로 (C005 PM: 20·60회로는 0.20과 0.25를 못 가른다) */
const DEEP = process.argv.includes('--deep');
const here = import.meta.dirname;

/** 한 판(stage)만 따로: 그 판에서 시작해 통과/실패까지. 별 수와 쓴 멍멍 */
function onStage(bot: Bot<DogState>, seed: number, stage: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  jumpTo(s, stage);
  const target = s.stage;
  let t = 0;
  while (s.stage === target && !s.dead && t < 60 * 120) {
    if (s.phase === 'result') return { ok: s.ok, stars: s.ok ? starCount(s.got) : 0, mask: s.ok ? s.got : 0, used: s.S.used };
    g.step(s, bot.act(s, rng));
    t++;
  }
  return { ok: false, stars: 0, mask: 0, used: s.S.used };
}

const bots = { smart: sheepdogSmart, greedy: sheepdogGreedy, random: sheepdogRandom, naive: sheepdogNaive, careful: sheepdogCareful };
const NO = { tap: false, dir: 0 as const, pointer: null };
/** 같은 판을 실패하면 그 자리에서 다시(게임 그대로 — 풍덩 깃발도 뜬다) 하며 통과까지 몇 번? cap번 안에 못 깨면 0 */
function triesToClear(bot: Bot<DogState>, seed: number, stage: number, cap = 25) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x51ed);
  jumpTo(s, stage);
  for (let n = 1; n <= cap; n++) {
    for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) g.step(s, bot.act(s, rng));
    if (s.phase === 'result' && s.ok) return n;
    for (let t = 0; t < 400 && s.phase === 'result'; t++) g.step(s, NO); // 실패 → 같은 판 다시
  }
  return 0;
}
/** 소개 판의 새것을 첫 시도에서 실제로 겪는가: 1-4 까만 양이 강아지 쪽으로 옴 · 1-6 양이 다리를 건너거나 풍덩 */
function experiences(bot: Bot<DogState>, seed: number, stage: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x7a11), key = STAGES[stage].key;
  jumpTo(s, stage);
  for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) {
    g.step(s, bot.act(s, rng));
    if (key === 'black' && s.phase === 'flee' && s.rec?.scare.some((v, i) => v === 3 && s.F.black[i])) return true;
    if (key === 'river' && (s.S.fell.some((v) => v) || s.S.y.some((y, i) => !s.F.black[i] && y < s.F.river!.y0))) return true;
  }
  return false;
}
/** 아무 데나 봇이 같은 판을 25번 다시 해도 못 깨는가 (막힘, FUN F10) */
function stuck25(seed: number, stage: number) {
  for (let n = 0; n < 25; n++) if (onStage(bots.random, seed * 100 + n, stage).ok) return false;
  return true;
}
/**
 * 손 떨림 ±3px (390px 화면 기준, PM C011 ④ⓑ): 봇이 짖을 자리를 한 수마다 ±3px 안에서 흔든다.
 * 한 번 시도 결과와, 못 깼을 때 흰 양이 울타리 높이(울타리 옆·뒤)에 남았는지(끼임, 🧪 C011 1-5)
 */
const SHAKE_X = 3 / 390, SHAKE_Y = 3 / (390 * 1.36), SHAKE_N = 40; // 📐 C012 ⓑ: 판당 40회, 시드 6000~6039 (20회는 ±0.11씩 흔들림)
/** mode 'shake' = 한 수마다 ±3px · 'px' = 390px 화면 정수 px로 반올림 (📐 C012 ⓒ) */
function shaky(bot: Bot<DogState>, seed: number, stage: number, mode: 'shake' | 'px' = 'shake') {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x3c6ef372), rr = mulberry32(seed * 7 + 11), jit = new Map<string, [number, number]>();
  jumpTo(s, stage);
  let behind = false, sniffs = 0, seenT = -1;
  for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) {
    for (const e of s.events) if (e.kind === 'sniff' && e.t > seenT) (sniffs++, (seenT = e.t)); // 📐 C012: 킁킁이면 같은 흔들림이 되풀이돼 맴돌던 측정 버그 → 키에 킁킁 수
    const a = bot.act(s, rng), key = `${s.tries}:${s.S.used}:${sniffs}`;
    if (a.pointer && !jit.has(key)) jit.set(key, [(rr() * 2 - 1) * SHAKE_X, (rr() * 2 - 1) * SHAKE_Y]);
    const [dx, dy] = jit.get(key) ?? [0, 0];
    const p = a.pointer && (mode === 'px' ? { x: Math.round(a.pointer.x * 390) / 390, y: Math.round(a.pointer.y * 390 * 1.36) / (390 * 1.36) } : a.pointer && { x: a.pointer.x + dx, y: a.pointer.y + dy });
    g.step(s, p ? { ...a, pointer: p } : a);
    // 뒤 끼임 (📐 C012 ⓐ): 울타리 밖 흰 양이 목장 위 경계보다 위에 있는 순간이 한 번이라도
    behind ||= s.F.black.some((b, i) => !b && s.S.pen[i] < 0 && s.S.y[i] < topOf(s.F) - 1e-9);
  }
  const done = s.phase === 'result';
  return { ok: done && s.ok, star3: done && s.ok && s.got === 7, behind, timeout: !done, parOrLess: done && s.ok && s.S.used <= STAGES[stage].par, used: s.S.used };
}
  const avg = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2);
const per: Record<string, { name: string; max: number; par: number; parGap: number; smart: { clear: number; stars: number; used: number; mask: number }; greedy: { clear: number; used: number; overPar: number }; random: { clear: number; stuck25: number }; careful: { stuck25: number; tries: number }; naiveSeesNew: number | null; shake: { smartStar3: number; greedyFail: number; greedyParOrLess: number; behindPen: number; void: number; greedyPx: number } }> = {};
for (let k = 0; k < STAGES.length; k++) {
  const d = STAGES[k];
  const sm = Array.from({ length: N }, (_, i) => onStage(bots.smart, 1000 + i, k));
  const rd = Array.from({ length: N }, (_, i) => onStage(bots.random, 1000 + i, k));
  const gr = onStage(bots.greedy, 1000, k); // 판 고정이라 그리디 결과는 한 번이면 된다
  const st = Array.from({ length: Math.min(N, 10) }, (_, i) => +stuck25(2000 + i, k));
  const care = Array.from({ length: DEEP && d.key === 'fest' ? 200 : N }, (_, i) => triesToClear(bots.careful, 3000 + i, k));
  const shS = Array.from({ length: SHAKE_N }, (_, i) => shaky(bots.smart, 6000 + i, k)), shG = Array.from({ length: SHAKE_N }, (_, i) => shaky(bots.greedy, 6000 + i, k)), px = shaky(bots.greedy, 6000, k, 'px');
  const intro = ['black', 'river'].includes(d.key) ? avg(Array.from({ length: N }, (_, i) => +experiences(bots.naive, 4000 + i, k))) : null;
  per[k + 1] = {
    name: d.name, max: d.max, par: d.par, parGap: +(d.par - Math.min(...sm.filter((r) => r.ok).map((r) => r.used))).toFixed(2),
    smart: { clear: avg(sm.map((r) => +r.ok)), stars: avg(sm.map((r) => r.stars)), used: avg(sm.filter((r) => r.ok).map((r) => r.used)), mask: sm.reduce((m, r) => m | r.mask, 0) },
    greedy: { clear: +gr.ok, used: gr.used, overPar: gr.ok ? gr.used - d.par : 99 },
    random: { clear: avg(rd.map((r) => +r.ok)), stuck25: avg(st) },
    careful: { stuck25: avg(care.map((n) => +(n === 0))), tries: care.some((n) => n) ? avg(care.filter((n) => n)) : 99 },
    naiveSeesNew: intro,
    shake: { smartStar3: avg(shS.map((r) => +r.star3)), greedyFail: avg(shG.map((r) => +(!r.ok && !r.timeout))), greedyParOrLess: avg(shG.map((r) => +r.parOrLess)), behindPen: avg([...shS, ...shG, px].map((r) => +r.behind)), void: [...shS, ...shG].filter((r) => r.timeout).length, greedyPx: px.ok ? px.used - d.par : 99 },
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
console.table(Object.entries(per).map(([k, v]) => ({ 판: k, 이름: v.name, 'par/max': `${v.par}/${v.max}`, 'par여유': v.parGap, 박사별: v.smart.stars, 박사멍멍: v.smart.used, 그리디: v.greedy.clear ? `${v.greedy.used}(par${v.greedy.overPar >= 0 ? '+' : ''}${v.greedy.overPar})` : '못 깸', 아무데나통과: v.random.clear, '조심 25번 막힘': v.careful.stuck25, '조심 평균 시도': v.careful.tries, '순진 새것 겪기': v.naiveSeesNew ?? '', '±3px 박사★3': v.shake.smartStar3, '±3px 그리디 실패': v.shake.greedyFail, '±3px 그리디 par 이하': v.shake.greedyParOrLess, 'px 그리디−par': v.shake.greedyPx, '뒤 끼임': v.shake.behindPen, 무효: v.shake.void })));
console.log('한 판 전체 점수', report.run);
