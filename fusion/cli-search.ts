/**
 * 조합 공간 탐색. 아직 시험하지 않은 조합을 골라 1차 선별(n=3) → 기준 통과 시 확증(n=8) →
 * 확증되면 발견 카드를 쓴다. 모든 결과는 원장(ledger.json)에 남아 다음 사이클이 이어받는다.
 *
 *   npm run fusion:search -- [--budget 20] [--max-sec 420] [--only <id>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString, mulberry32, shuffle } from '../engine/rng.ts';
import { ATOMS } from './atoms.ts';
import { evaluateFusion, type FusionReport } from './analyze.ts';
import { generateFusion } from './generator.ts';
import { allSpecs, atomsOf, fusionId, fusionName, parseFusionId, playerRules, type FusionSpec } from './spec.ts';

const args = process.argv.slice(2);
const arg = (k: string, d: string) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : d);
const budget = Number(arg('budget', '20'));
const maxSec = Number(arg('max-sec', '420'));
const only = arg('only', '');

const root = join(import.meta.dirname);
const ledgerPath = join(root, 'ledger.json');
const indexPath = join(root, 'discoveries', 'index.json');

interface Ledger { version: 1; tested: Record<string, FusionReport & { confirmed?: FusionReport; at: string; timedOut?: boolean }>; inProgress?: string }
interface Discovery {
  id: string; name: string; fitness: number; synergy: number; necessityMin: number; hitRate: number; density: number;
  ingredients: { id: string; name: string; origin: string }[]; foundAt: string;
}

const ledger: Ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { version: 1, tested: {} };
const discoveries: Discovery[] = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : [];

// 지난 실행이 한 조합에서 멈춰 강제 종료됐으면(실험 0004), 그 조합을 시간 초과로 기록하고 넘어간다
if (ledger.inProgress && !only) {
  const id = ledger.inProgress;
  ledger.tested[id] = {
    id, n: 0, known: null, atoms: atomsOf(parseFusionId(id)!).length, hitRate: 0, density: 1, synergy: 0, necessity: {}, necessityMin: 0,
    hardMs: 0, failures: 0, fitness: 0, discovery: false, at: new Date().toISOString().slice(0, 10), timedOut: true,
  };
  console.log(`${id.padEnd(34)} 지난 실행에서 시간 초과 → 건너뜀`);
}
delete ledger.inProgress;

function save() {
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n');
  discoveries.sort((a, b) => b.fitness - a.fitness);
  writeFileSync(indexPath, JSON.stringify(discoveries, null, 2) + '\n');
  writeFileSync(join(root, '..', 'web', 'public', 'fusion', 'discoveries.json'), JSON.stringify(discoveries) + '\n');
}

const all = allSpecs();
let queue: FusionSpec[];
if (only) queue = [parseFusionId(only)!];
else {
  const untested = all.filter((s) => !ledger.tested[fusionId(s)]);
  const rng = mulberry32(hashString(`queue:${Object.keys(ledger.tested).length}`));
  // 원자 2개 이상인 조합을 우선 (단일 원자는 비교 기준선)
  queue = [
    ...shuffle(untested.filter((s) => atomsOf(s).length >= 2), rng),
    ...shuffle(untested.filter((s) => atomsOf(s).length < 2), rng),
  ];
}

const t0 = performance.now();
const today = new Date().toISOString().slice(0, 10);
const found: string[] = [];
let tested = 0;
for (const spec of queue) {
  if (tested >= budget || (performance.now() - t0) / 1000 > maxSec) break;
  const id = fusionId(spec);
  if (!only) (ledger.inProgress = id), save();
  const r = evaluateFusion(spec, 3);
  tested++;
  const entry: Ledger['tested'][string] = { ...r, at: today };
  let mark = '';
  if (r.discovery) {
    const c = evaluateFusion(spec, 8, 20);
    entry.confirmed = c;
    if (c.discovery) {
      mark = ' ★ 발견';
      found.push(id);
      writeCard(spec, c);
    } else mark = ' (확증 실패)';
  }
  ledger.tested[id] = entry;
  delete ledger.inProgress;
  save();
  console.log(`${id.padEnd(34)} fit=${r.fitness.toFixed(3)} syn=${r.synergy.toFixed(2)} nec=${r.necessityMin.toFixed(2)} hit=${r.hitRate.toFixed(2)}${r.known ? ' [' + r.known + ']' : ''}${mark}`);
}

save();
const totalTested = Object.keys(ledger.tested).length;
console.log(`\n이번 탐색 ${tested}개 · 새 발견 ${found.length}개 · 누적 ${totalTested}/${all.length} 조합 시험 · 발견 총 ${discoveries.length}개 · ${Math.round((performance.now() - t0) / 1000)}s`);

function writeCard(spec: FusionSpec, r: FusionReport) {
  const id = fusionId(spec);
  const name = fusionName(spec);
  const ingredients = atomsOf(spec).map((a) => ({ id: a.id, name: a.name, origin: a.origin }));
  const d: Discovery = {
    id, name, fitness: r.fitness, synergy: r.synergy, necessityMin: r.necessityMin, hitRate: r.hitRate, density: r.density,
    ingredients, foundAt: discoveries.find((x) => x.id === id)?.foundAt ?? today,
  };
  const k = discoveries.findIndex((x) => x.id === id);
  if (k >= 0) discoveries[k] = d;
  else discoveries.push(d);

  // 갤러리용 예시 퍼즐 (6×6 쉬움/보통/어려움)
  const gallery = (['easy', 'medium', 'hard'] as const)
    .map((tier, i) => generateFusion(spec, { width: 6, height: 6, seed: hashString(`${id}:gallery:${i}`), target: tier, attempts: 30 }))
    .filter(Boolean);
  writeFileSync(join(root, '..', 'web', 'public', 'fusion', 'gallery', `${id}.json`), JSON.stringify({ id, name, puzzles: gallery }) + '\n');

  const ex = gallery[1] ?? gallery[0];
  const grid = ex
    ? [...Array(ex.height).keys()].map((y) =>
        [...Array(ex.width).keys()].map((x) => {
          const c = ex.clues[y * ex.width + x];
          return c === null ? '·' : String(c);
        }).join(' ')).join('\n')
    : '(예시 없음)';
  const md = `# 발견: ${name}

\`${id}\` · 발견일 ${d.foundAt}

## 재료
${ingredients.map((a) => `- **${a.name}** — 출처: ${a.origin}`).join('\n')}

## 규칙
${playerRules(spec).map((x, i) => `${i + 1}. ${x}`).join('\n')}

## 왜 발견인가 (n=${r.n}×4 난이도)
| 지표 | 값 | 기준 |
|---|---|---|
| 융합도 | ${r.synergy} | ≥ 0.35 — 어려운 단계 중 두 재료를 함께 써야 풀린 비율 |
| 필수성(최소) | ${r.necessityMin} | ≥ 0.7 — 재료 하나를 빼면 정답이 여러 개가 되는 비율 (${Object.entries(r.necessity).map(([k, v]) => `${ATOMS[k].name} ${v}`).join(', ')}) |
| 난이도 적중률 | ${r.hitRate} | ≥ 0.75 |
| 단서 밀도 | ${r.density} | 낮을수록 우아함 |
| fitness | ${r.fitness} | |

## 예시 (6×6, ${ex?.difficulty.tier ?? '-'})
\`\`\`
${grid}
\`\`\`
${ex?.edges ? `가로줄 숫자: ${ex.edges.rows.map((v) => v ?? '·').join(' ')} / 세로줄 숫자: ${ex.edges.cols.map((v) => v ?? '·').join(' ')}\n` : ''}
플레이: https://derrick1119.github.io/derrickkim1119/fusion.html?play=${id}
`;
  writeFileSync(join(root, 'discoveries', `${id}.md`), md);
}
