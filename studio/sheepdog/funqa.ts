/**
 * FUN QA 계기: 봇 셋(잘함=양치기 박사(3수 앞) · 사람 근사=미리 보고 한 수(그리디, C003) · 처음 하는 사람 근사=아무 데나 톡)으로 결정적 시뮬을 돌려
 *   판별 통과율·별·멍멍 여유(par − 박사 멍멍, GDD §12 목표 {0,1})를 잰다 → studio/sheepdog/reports/funqa.json
 *   C002부터 판 배치가 고정이라 박사 결과는 시드와 상관없이 같다(무작위 봇만 시드마다 다름).
 *   npx tsx studio/sheepdog/funqa.ts [판 수=20]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runBot, type Bot } from './core.ts';
import { STAGES, allIn, anyone, jumpTo, preview, pure, resolve, starCount, topOf, sheepdog as g, sheepdogCareful, sheepdogGreedy, sheepdogNaive, sheepdogRandom, sheepdogSmart, type DogState } from './game.ts';
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
/** 깬 시도의 보너스 별·깃발 도움도 남긴다 (📐 C015: 조심 손의 🍀는 '깃발 없이 깬 시도 중'으로 본다) */
const clears: { k: number; bonus: boolean; helped: boolean; noFlag: boolean }[] = [];
/** noFlag: 깃발을 늘 비워 둔다(측정만 — 📐 C015 '깃발 끈 조심 🍀'. 깃발을 켜면 1-7 조심 손이 깬 시도는 모두 깃발 도움이라 표본이 0) */
function triesToClear(bot: Bot<DogState>, seed: number, stage: number, cap = 25, noFlag = false) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x51ed);
  jumpTo(s, stage);
  for (let n = 1; n <= cap; n++) {
    for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) {
      if (noFlag) s.flags.length = 0;
      g.step(s, bot.act(s, rng));
    }
    if (s.phase === 'result' && s.ok) return clears.push({ k: stage, bonus: ((s.got >> 2) & 1) === 1, helped: s.helped, noFlag }), n;
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
/**
 * F11 전략 깊이 (오너 1차 "전략이 조금 단순해지는 느낌", C013 → F01-a): ① 습관 봇(미리 보기 없이 '양 뒤에서 문 쪽') 첫 시도 통과·보너스 별
 * ② 정답 폭: 첫 짖기 격자(0.04 간격, 양이 움직이는 자리만) 가운데 박사가 이어 받아 ★3 한 번에(par 안) 되는 자리 비율
 */
function habitFirst(seed: number, stage: number) {
  const r = onStage(bots.naive, seed, stage);
  return { ok: r.ok, bonus: r.ok && ((r.mask >> 2) & 1) === 1 };
}
/**
 * 📐 C015 폭: 첫 짖기 격자 0.04(양이 움직이는 자리)마다 — 박사가 바로 이어 ★3·par 안이면 통과,
 * 아니면 둘째 짖기 격자 0.04 중 '한 수 뒤 판 값' 상위 6칸만 박사가 이어 본다(1-5 전수와 같은 값). 순수 시뮬이라 결정적.
 */
/** F11을 재는 판 (📐 C013: 1-3·1-5·1-7·1-8 — 소개 판은 폭을 안 잰다, -1) */
const F11 = ['scatter', 'pull', 'narrow', 'fest'];
const GRID = (() => { const o: [number, number][] = []; for (let fy = 0.06; fy < 0.98; fy += 0.04) for (let fx = 0.06; fx < 0.96; fx += 0.04) o.push([fx, fy]); return o; })();
function width(stage: number, top = 6) {
  const s = g.create(1), d = STAGES[stage];
  jumpTo(s, stage);
  const F = s.F, { plan, ended, cloneSim, value, bonusMet } = pure;
  /** 박사(깊이 3)가 끝까지(capPar면 par까지) 이어 받아 ★3·par 안인가 */
  const star3 = (S0: typeof s.S, capPar = false) => {
    const S = cloneSim(S0);
    for (let t = 0; t < 30 && !ended(F, S, d) && !(capPar && S.used >= d.par); t++) {
      let p: [number, number];
      try { p = plan(F, S, d, 3); } catch { break; }
      if (!anyone(F, S, p[0], p[1])) break;
      resolve(F, S, p[0], p[1]);
    }
    return !S.fell.some((v) => v) && S.caught < 0 && allIn(F, S, d) && S.used <= d.par && bonusMet(F, S, d);
  };
  let moving = 0, win = 0;
  for (const [fx, fy] of GRID) {
    if (!preview(s, fx, fy).rec.scare.some((v) => v > 0)) continue;
    moving++;
    const S1 = cloneSim(s.S);
    resolve(F, S1, fx, fy);
    if (star3(S1)) { win++; continue; }
    if (ended(F, S1, d) || S1.used >= d.par) continue;
    const cand: [number, typeof S1][] = [];
    for (const [gx, gy] of GRID) {
      if (!anyone(F, S1, gx, gy)) continue;
      const S2 = cloneSim(S1);
      resolve(F, S2, gx, gy);
      let m = 0;
      for (let i = 0; i < F.n; i++) m += Math.abs(S2.x[i] - S1.x[i]) + Math.abs(S2.y[i] - S1.y[i]) + (S2.pen[i] !== S1.pen[i] ? 1 : 0);
      if (m > 0.001 && !S2.fell.some((v) => v)) cand.push([value(F, S2, d), S2]);
    }
    cand.sort((a, b) => b[0] - a[0]);
    if (cand.slice(0, top).some(([, S2]) => star3(S2, true))) win++;
  }
  return +(win / Math.max(1, moving)).toFixed(2);
}
  const avg = (xs: number[]) => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2);
const per: Record<string, { name: string; max: number; par: number; parGap: number; smart: { clear: number; stars: number; used: number; mask: number }; greedy: { clear: number; used: number; overPar: number }; random: { clear: number; stuck25: number }; careful: { stuck25: number; tries: number; bonus: number; selfN: number; bonusSelf: number; noFlag: { stuck25: number; bonus: number } | null }; naiveSeesNew: number | null; depth: { habitClear: number; habitBonus: number; width: number; greedyEqSmart: boolean }; shake: { smartStar3: number; greedyFail: number; greedyParOrLess: number; behindPen: number; void: number; greedyPx: number } }> = {};
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
    careful: (() => {
      const c = clears.filter((r) => r.k === k && !r.noFlag), self = c.filter((r) => !r.helped);
      // 📐 C015: 개울 판(깃발이 뜨는 판)만 깃발 끈 조심 손을 따로 잰다 — 깬 시도 중 보너스(1-7 ③ 선 ≤ 0.3)
      const nf = d.key === 'narrow' || d.key === 'fest' ? Array.from({ length: N }, (_, i) => triesToClear(bots.careful, 3000 + i, k, 25, true)) : null, cn = clears.filter((r) => r.k === k && r.noFlag);
      return { stuck25: avg(care.map((n) => +(n === 0))), tries: care.some((n) => n) ? avg(care.filter((n) => n)) : 99, bonus: c.length ? avg(c.map((r) => +r.bonus)) : 0, selfN: self.length, bonusSelf: self.length ? avg(self.map((r) => +r.bonus)) : -1,
        noFlag: nf && { stuck25: avg(nf.map((n) => +(n === 0))), bonus: cn.length ? avg(cn.map((r) => +r.bonus)) : 0 } };
    })(),
    naiveSeesNew: intro,
    depth: (() => { const h = Array.from({ length: N }, (_, i) => habitFirst(4000 + i, k)); return { habitClear: avg(h.map((r) => +r.ok)), habitBonus: avg(h.map((r) => +r.bonus)), width: F11.includes(d.key) ? width(k) : -1, greedyEqSmart: gr.ok && gr.used === Math.min(...sm.filter((r) => r.ok).map((r) => r.used)) }; })(),
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
console.table(Object.entries(per).map(([k, v]) => ({ 판: k, 이름: v.name, 'par/max': `${v.par}/${v.max}`, 'par여유': v.parGap, 박사별: v.smart.stars, 박사멍멍: v.smart.used, 그리디: v.greedy.clear ? `${v.greedy.used}(par${v.greedy.overPar >= 0 ? '+' : ''}${v.greedy.overPar})` : '못 깸', 아무데나통과: v.random.clear, '조심 25번 막힘': v.careful.stuck25, '조심 평균 시도': v.careful.tries, '조심 보너스': v.careful.bonus, '깃발 없이 깬 조심 보너스': v.careful.selfN ? `${v.careful.bonusSelf}(${v.careful.selfN})` : '', '깃발 끈 조심 막힘·보너스': v.careful.noFlag ? `${v.careful.noFlag.stuck25}·${v.careful.noFlag.bonus}` : '', '순진 새것 겪기': v.naiveSeesNew ?? '', '습관 통과': v.depth.habitClear, '습관 보너스': v.depth.habitBonus, '정답 폭': v.depth.width, '±3px 박사★3': v.shake.smartStar3, '±3px 그리디 실패': v.shake.greedyFail, '±3px 그리디 par 이하': v.shake.greedyParOrLess, 'px 그리디−par': v.shake.greedyPx, '뒤 끼임': v.shake.behindPen, 무효: v.shake.void })));
console.log('한 판 전체 점수', report.run);
