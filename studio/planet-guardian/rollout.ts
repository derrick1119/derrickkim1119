/**
 * 롤아웃 봇 + 판단 지표 (C007 신설, C008 개정 — FUN QA C006·C007 조건).
 *
 *   병렬 측정:  npx tsx studio/planet-guardian/rollout.ts --run eval   (평가 시드 101~124, K=64, 4프로세스)
 *              npx tsx studio/planet-guardian/rollout.ts --run tune   (튜닝 시드 1001~1008, K=32 — 최적 고정 순서를 여기서만 뽑는다)
 *              npx tsx studio/planet-guardian/rollout.ts --run evalB  (평가 시드 8판, 난수 B)
 *   한 묶음:    --seeds 101,102 --k 64 --set A --raw out.json  (병렬 실행이 내부에서 부른다)
 * → reports/rollout.json (eval), rollout-tune.json, rollout-B.json
 *
 * 카드 화면마다 선택지(카드 3장 + 광석이 되면 다시 뽑기)를 같은 미래 K개로 시험한다.
 *  - 투시 금지: 복제한 State의 seed·rngS·slotS를 롤아웃마다 새 난수로 바꾼다.
 *  - 공통 난수: j번째 미래는 모든 선택지가 같은 난수 → 쌍 차이의 SE로 판정.
 *  - 지평: 사망 또는 120초. 이어서는 BALANCED가 카드를 고른다(다시 뽑기 안 함).
 */
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString, mulberry32 } from '../../engine/rng.ts';
import { BALANCED, create, randomBot, score, smartBot, step, type CardId, type Input, type State } from './sim.ts';

const arg = (k: string, d: string) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
const K = Number(arg('k', '64')), HORIZON = 120 * 60, SET = arg('set', 'A');
const here = import.meta.dirname, reports = join(here, 'reports');

const balancedPick = (s: State) => (s.offer ? s.offer.map((c, k) => [BALANCED(c, s), k]).sort((a, b) => a[0] - b[0])[0][1] : undefined);

type Option = { kind: 'pick'; k: number } | { kind: 'reroll' };
export const optionsOf = (s: State): Option[] => [...(s.offer ?? []).map((_, k) => ({ kind: 'pick', k }) as Option), ...(s.offer && s.ore >= s.cost ? [{ kind: 'reroll' } as Option] : [])];

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

/** 한 카드 화면의 원자료 */
export interface Decision { ids: (CardId | 'reroll')[]; means: number[]; best: number; second: number; worst: number; seTop: number; seBW: number; balancedIdx: number; rerollSplit: boolean | null; ms: number }

export function decide(s: State, gameSeed: number, k = K): { input: Input; d: Decision } {
  const t0 = performance.now();
  const opts = optionsOf(s);
  const vals = opts.map(() => [] as number[]);
  for (let j = 0; j < k; j++) {
    const rseed = hashString(`${SET}:${gameSeed}:${s.beatNo}:${s.handRolls}:${j}`);
    opts.forEach((o, i) => vals[i].push(future(s, o, rseed)));
  }
  const means = vals.map((v) => v.reduce((a, x) => a + x, 0) / k);
  const order = means.map((m, i) => [m, i]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  const pairSE = (i: number, j2: number) => {
    const d = vals[i].map((x, j) => x - vals[j2][j]), m = d.reduce((a, x) => a + x, 0) / k;
    return Math.sqrt(d.reduce((a, x) => a + (x - m) ** 2, 0) / Math.max(1, k - 1) / k);
  };
  const best = order[0], second = order[1] ?? -1, worst = order[order.length - 1];
  const ri = opts.findIndex((o) => o.kind === 'reroll');
  const bestCard = order.find((i) => opts[i].kind === 'pick')!;
  const ids = opts.map((o) => (o.kind === 'reroll' ? 'reroll' : s.offer![o.k].id));
  return {
    input: opts[best].kind === 'pick' ? { pick: (opts[best] as { k: number }).k } : { reroll: true },
    d: {
      ids, means, best, second, worst,
      seTop: second < 0 ? 0 : pairSE(best, second), seBW: worst === best ? 0 : pairSE(best, worst),
      balancedIdx: balancedPick(s) ?? 0,
      rerollSplit: ri < 0 ? null : Math.abs(means[ri] - means[bestCard]) > 2 * pairSE(ri, bestCard),
      ms: performance.now() - t0,
    },
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
type Game = ReturnType<typeof playRollout>;

function playWith(seed: number, bot: (s: State, r: () => number) => Input) {
  const s = create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  let guard = 0;
  while (!s.dead && s.t < 60 * 900 && guard++ < 60 * 900 * 4) step(s, bot(s, rng));
  return score(s);
}

const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? 0;
const pct = (n: number, d: number) => (d ? Math.round((1000 * n) / d) / 10 : 0);

/** 튜닝 시드에서 뽑는 '최적 고정 순서': 카드가 나왔을 때 최선이었던 비율이 높은 순 (C008, FUN QA C007 D2*) */
function bestOrder(games: Game[]): string[] {
  const seen: Record<string, number> = {}, best: Record<string, number> = {};
  for (const d of games.flatMap((g) => g.decisions)) d.ids.forEach((id, i) => ((seen[id] = (seen[id] ?? 0) + 1), i === d.best && (best[id] = (best[id] ?? 0) + 1)));
  return Object.keys(seen).filter((id) => id !== 'reroll').sort((a, b) => (best[b] ?? 0) / seen[b] - (best[a] ?? 0) / seen[a]);
}

function report(games: Game[], order: string[] | null) {
  const ds = games.flatMap((g) => g.decisions);
  const split = (d: Decision) => d.second >= 0 && d.means[d.best] - d.means[d.second] > 2 * d.seTop && d.seTop > 0;
  const a1 = (d: Decision) => d.worst !== d.best && d.means[d.best] - d.means[d.worst] > 2 * d.seBW && d.seBW > 0;
  const a2 = (d: Decision) => split(d) && d.means[d.best] - d.means[d.second] >= 0.03 * Math.max(1, d.means[d.best]);
  const fixedPick = (d: Decision) => {
    const cards = d.ids.map((id, i) => [id, i] as const).filter(([id]) => id !== 'reroll');
    return cards.sort((x, y) => order!.indexOf(x[0]) - order!.indexOf(y[0]))[0][1];
  };
  const wrongStar = (d: Decision) => split(d) && order !== null && d.best !== fixedPick(d);
  const splits = ds.filter(split);
  // 카드별 최선·최악 표 + D5 경보(한 카드가 나온 화면의 60% 이상에서 최선이거나 최악)
  const table: Record<string, { 나옴: number; 최선: number; 최악: number }> = {};
  for (const d of ds) d.ids.forEach((id, i) => {
    const r = (table[id] ??= { 나옴: 0, 최선: 0, 최악: 0 });
    r.나옴++;
    if (i === d.best) r.최선++;
    if (i === d.worst && d.worst !== d.best) r.최악++;
  });
  const cardTable = Object.fromEntries(Object.entries(table).map(([id, r]) => [id, { ...r, 최선률: pct(r.최선, r.나옴), 최악률: pct(r.최악, r.나옴) }]));
  const D5 = Object.entries(cardTable).filter(([id, r]) => id !== 'reroll' && r.나옴 >= 10 && (r.최선률 >= 60 || r.최악률 >= 60)).map(([id]) => id);
  const perGame = games.map((g) => g.decisions.filter(wrongStar).length);
  return {
    D1_갈리는결정: pct(splits.length, ds.length),
    D1a1_함정있음_최선최악2SE: pct(ds.filter(a1).length, ds.length),
    D1a2_느껴지는차_3퍼센트와2SE: pct(ds.filter(a2).length, ds.length),
    D2_BALANCED틀림_참고: pct(splits.filter((d) => d.best !== d.balancedIdx).length, splits.length),
    D2star_최적고정순서틀림: order ? pct(splits.filter(wrongStar).length, splits.length) : null,
    D1xD2star_판당횟수_중앙값: order ? med(perGame) : null,
    D3_다시뽑기갈림: pct(ds.filter((d) => d.rerollSplit).length, ds.filter((d) => d.rerollSplit !== null).length),
    다시뽑기선택: pct(ds.filter((d) => d.ids[d.best] === 'reroll').length, ds.length),
    D5_경보카드: D5,
    카드별: cardTable,
    최적고정순서: order,
    결정수: ds.length,
    결정당ms_중앙값: Math.round(med(ds.map((d) => d.ms))),
  };
}

const runPart = (seeds: number[], k: number, set: string, out: string) =>
  new Promise<void>((ok, bad) => {
    const p = spawn(process.execPath, ['--import', 'tsx', join(here, 'rollout.ts'), '--seeds', seeds.join(','), '--k', String(k), '--set', set, '--raw', out], { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('exit', (c) => (c === 0 ? ok() : bad(new Error(`part ${out} exit ${c}`))));
  });

async function parallel(seeds: number[], k: number, set: string, name: string, procs = 4): Promise<Game[]> {
  mkdirSync(join(reports, 'tmp'), { recursive: true });
  const parts = [...Array(procs).keys()].map((p) => seeds.filter((_, i) => i % procs === p)).filter((x) => x.length);
  const files = parts.map((_, i) => join(reports, 'tmp', `${name}-${i}.json`));
  await Promise.all(parts.map((ss, i) => runPart(ss, k, set, files[i])));
  return files.flatMap((f) => JSON.parse(readFileSync(f, 'utf8')) as Game[]);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const t0 = performance.now();
  if (process.argv.includes('--raw')) {
    // 한 묶음: 원자료만 쓴다
    const seeds = arg('seeds', '101').split(',').map(Number);
    const games = seeds.map((seed) => {
      const g = playRollout(seed);
      console.log(`[${SET}] seed ${seed}: ${g.sec.toFixed(0)}초 ${g.score}점, 결정 ${g.decisions.length}`);
      return g;
    });
    writeFileSync(arg('raw', 'raw.json'), JSON.stringify(games));
  } else {
    const mode = arg('run', 'eval');
    const tuneFile = join(reports, 'rollout-tune.json');
    if (mode === 'tune') {
      const games = await parallel([...Array(8).keys()].map((i) => 1001 + i), 32, 'T', 'tune');
      const order = bestOrder(games);
      const r = { at: new Date().toISOString(), seeds: '1001~1008', k: 32, ...report(games, order), 전체초: Math.round((performance.now() - t0) / 1000) };
      writeFileSync(tuneFile, JSON.stringify(r, null, 2) + '\n');
      console.log(JSON.stringify(r, null, 2));
    } else {
      let order: string[] | null = null;
      try { order = JSON.parse(readFileSync(tuneFile, 'utf8')).최적고정순서; } catch { /* 튜닝 전 */ }
      const B = mode === 'evalB', seeds = [...Array(B ? 8 : 24).keys()].map((i) => 101 + i);
      const games = await parallel(seeds, K, B ? 'B' : 'A', B ? 'evalB' : 'eval');
      const lightMed = med(seeds.map((x) => playWith(x, randomBot)));
      const mid = seeds.map((x) => playWith(x, smartBot));
      const r = {
        at: new Date().toISOString(), set: B ? 'B' : 'A', games: seeds.length, k: K, horizonSec: 120,
        ...report(games, order),
        H1r_롤아웃대아무거나: Math.round((10 * med(games.map((g) => g.score))) / Math.max(1, lightMed)) / 10,
        H1r쌍비_롤아웃대미들_중앙값: Math.round(100 * med(games.map((g, i) => g.score / Math.max(1, mid[i])))) / 100,
        롤아웃봇: { 판길이중앙값: Math.round(med(games.map((g) => g.sec))), 점수중앙값: med(games.map((g) => g.score)) },
        전체초: Math.round((performance.now() - t0) / 1000),
      };
      writeFileSync(join(reports, B ? 'rollout-B.json' : 'rollout.json'), JSON.stringify(r, null, 2) + '\n');
      console.log(JSON.stringify({ ...r, 카드별: undefined }, null, 2));
      console.log('카드별', JSON.stringify(r.카드별));
    }
  }
}
