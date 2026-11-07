/**
 * 롤아웃 봇 + 판단 지표 (C007, FUN QA C006 조건 1~6).
 *   npx tsx studio/planet-guardian/rollout.ts [--games 24] [--k 32] [--horizon 120] [--set A]
 * → reports/rollout.json (set B는 rollout-B.json)
 *
 * 카드 화면마다 선택지(카드 3장 + 광석이 되면 다시 뽑기)를 같은 미래 K개로 시험한다.
 *  - 투시 금지: 복제한 State의 seed·rngS·slotS를 롤아웃마다 새 난수로 바꾼다. 원본의 미래 운석·손패는 보지 않는다.
 *  - 공통 난수: j번째 미래는 모든 선택지가 같은 난수를 쓴다 → 선택지끼리 차이만 비교(쌍 차이의 SE).
 *  - 지평: 사망 또는 horizon초. 이어서는 BALANCED가 카드를 고른다(다시 뽑기 안 함).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString, mulberry32 } from '../../engine/rng.ts';
import { BALANCED, create, randomBot, score, step, type Input, type State } from './sim.ts';

const arg = (k: string, d: string) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const GAMES = Number(arg('games', '24')), K = Number(arg('k', '32')), HORIZON = Number(arg('horizon', '120')) * 60, SET = arg('set', 'A');
const EVAL_SEEDS = [...Array(GAMES).keys()].map((k) => k + 101);

const balancedPick = (s: State) => (s.offer ? s.offer.map((c, k) => [BALANCED(c, s), k]).sort((a, b) => a[0] - b[0])[0][1] : undefined);

type Option = { kind: 'pick'; k: number } | { kind: 'reroll' };
export const optionsOf = (s: State): Option[] => [...(s.offer ?? []).map((_, k) => ({ kind: 'pick', k }) as Option), ...(s.offer && s.ore >= s.cost ? [{ kind: 'reroll' } as Option] : [])];

/** 한 미래: 복제 → 난수 교체(투시 금지) → 선택지 적용 → BALANCED로 지평까지 */
function future(s: State, opt: Option, rseed: number): number {
  const c = structuredClone(s);
  c.seed = rseed;
  c.rngS = (rseed ^ 0x2545f491) >>> 0;
  c.slotS = (rseed ^ 0x9e3779b9) >>> 0;
  step(c, opt.kind === 'pick' ? { pick: opt.k } : { reroll: true });
  const end = s.t + HORIZON;
  let guard = 0;
  while (!c.dead && c.t < end && guard++ < HORIZON * 4) step(c, c.offer ? { pick: balancedPick(c) } : {});
  return score(c);
}

export interface Decision { means: number[]; best: number; second: number; gap: number; se: number; split: boolean; balancedIdx: number; balancedWrong: boolean; rerollSplit: boolean | null; ms: number }

/** 카드 화면 하나를 판정 */
export function decide(s: State, gameSeed: number): { input: Input; d: Decision } {
  const t0 = performance.now();
  const opts = optionsOf(s);
  const vals = opts.map(() => [] as number[]);
  for (let j = 0; j < K; j++) {
    const rseed = hashString(`${SET}:${gameSeed}:${s.beatNo}:${s.handRolls}:${j}`);
    opts.forEach((o, i) => vals[i].push(future(s, o, rseed)));
  }
  const means = vals.map((v) => v.reduce((a, x) => a + x, 0) / K);
  const order = means.map((m, i) => [m, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  const [b, b2] = order;
  const pairSE = (i: number, k: number) => {
    const d = vals[i].map((x, j) => x - vals[k][j]), m = d.reduce((a, x) => a + x, 0) / K;
    return Math.sqrt(d.reduce((a, x) => a + (x - m) ** 2, 0) / (K - 1) / K);
  };
  const se = b2 === undefined ? 0 : pairSE(b, b2), gap = b2 === undefined ? 0 : means[b] - means[b2];
  const split = b2 !== undefined && gap > 2 * se && se > 0;
  const balancedIdx = balancedPick(s) ?? 0;
  // 다시 뽑기가 갈리는가: 다시 뽑기 vs 가장 좋은 카드의 차가 2SE를 넘나
  const ri = opts.findIndex((o) => o.kind === 'reroll');
  const bestCard = order.find((i) => opts[i].kind === 'pick')!;
  const rerollSplit = ri < 0 ? null : Math.abs(means[ri] - means[bestCard]) > 2 * pairSE(ri, bestCard);
  const o = opts[b];
  return {
    input: o.kind === 'pick' ? { pick: o.k } : { reroll: true },
    d: { means, best: b, second: b2 ?? -1, gap, se, split, balancedIdx, balancedWrong: split && b !== balancedIdx, rerollSplit, ms: performance.now() - t0 },
  };
}

function playRollout(seed: number) {
  const s = create(seed), ds: Decision[] = [];
  let guard = 0;
  while (!s.dead && s.t < 60 * 900 && guard++ < 60 * 900 * 4) {
    if (s.offer) {
      const { input, d } = decide(s, seed);
      ds.push(d);
      step(s, input);
    } else step(s, {});
  }
  return { seed, sec: s.t / 60, score: score(s), decisions: ds };
}

const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const pctOf = (xs: boolean[]) => (xs.length ? Math.round((1000 * xs.filter(Boolean).length) / xs.length) / 10 : 0);

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  const games = EVAL_SEEDS.map((seed) => {
    const g = playRollout(seed);
    console.log(`seed ${seed}: ${g.sec.toFixed(0)}초 ${g.score}점, 결정 ${g.decisions.length}`);
    return g;
  });
  const ds = games.flatMap((g) => g.decisions), splits = ds.filter((d) => d.split);
  const rng = mulberry32(7);
  const light = EVAL_SEEDS.map((seed) => {
    const s = create(seed);
    let guard = 0;
    while (!s.dead && s.t < 60 * 900 && guard++ < 60 * 900 * 4) step(s, randomBot(s, rng));
    return score(s);
  });
  const report = {
    at: new Date().toISOString(), set: SET, games: GAMES, k: K, horizonSec: HORIZON / 60,
    D1_갈리는결정비율: pctOf(ds.map((d) => d.split)),
    D2_그중BALANCED틀림비율: pctOf(splits.map((d) => d.balancedWrong)),
    D3_다시뽑기갈림비율: pctOf(ds.filter((d) => d.rerollSplit !== null).map((d) => !!d.rerollSplit)),
    다시뽑기선택비율: pctOf(ds.map((d) => d.means.length > 3 && d.best === d.means.length - 1)),
    H1r_롤아웃대아무거나: Math.round((10 * med(games.map((g) => g.score))) / Math.max(1, med(light))) / 10,
    롤아웃봇: { 판길이중앙값: Math.round(med(games.map((g) => g.sec))), 점수중앙값: med(games.map((g) => g.score)) },
    결정수: ds.length, 결정당ms_중앙값: Math.round(med(ds.map((d) => d.ms))), 결정당ms_최대: Math.round(Math.max(...ds.map((d) => d.ms))),
    전체초: Math.round((performance.now() - t0) / 1000),
  };
  mkdirSync(join(import.meta.dirname, 'reports'), { recursive: true });
  writeFileSync(join(import.meta.dirname, 'reports', SET === 'A' ? 'rollout.json' : `rollout-${SET}.json`), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
