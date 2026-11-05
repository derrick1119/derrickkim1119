/**
 * A|B 루프 (실험 0003).
 *
 *   npx tsx fusion/cli-ab.ts run          재미 지표 갱신(새 발견만) + 대기 중인 A|B가 없으면 새 B 선정
 *   npx tsx fusion/cli-ab.ts run --all    재미 지표 전부 다시 계산
 *   npx tsx fusion/cli-ab.ts choose A|B   오너의 선택 기록 → 승자가 기준선(A)이 된다
 *
 * 기준선 = 데일리 은행이 새 날짜에 쓰는 규칙. 오너가 고르기 전엔 바뀌지 않는다.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateFun, type FunReport } from './fun.ts';
import { generateFusion } from './generator.ts';
import { fusionName, parseFusionId, type FusionPuzzle } from './spec.ts';

const root = import.meta.dirname;
const abDir = join(root, 'ab');
mkdirSync(abDir, { recursive: true });
mkdirSync(join(root, 'reports'), { recursive: true });
const P = {
  baseline: join(abDir, 'baseline.json'),
  current: join(abDir, 'current.json'),
  history: join(abDir, 'history.json'),
  fun: join(root, 'reports', 'fun.json'),
};
const read = <T>(p: string, d: T): T => (existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : d);
const write = (p: string, v: unknown) => writeFileSync(p, JSON.stringify(v, null, 1) + '\n');

export interface Baseline { id: string; name: string; since: string; round: number }
export interface AbSide { id: string; name: string; fun: FunReport; puzzles: (FusionPuzzle & { tier: string })[] }
export interface AbRound { round: number; createdAt: string; status: 'pending' | 'decided'; A: AbSide; B: AbSide; diff: number; z: number; machinePick: 'A' | 'B' | '동률' }
export interface AbDecision { round: number; at: string; A: string; B: string; machinePick: string; ownerPick: 'A' | 'B' }

const today = new Date().toISOString().slice(0, 10);
const [cmd, arg] = process.argv.slice(2);
const discoveries: { id: string; name: string }[] = read(join(root, 'discoveries', 'index.json'), []);
const baseline = read<Baseline>(P.baseline, { id: 'fx-knight-rowcol-nothree', name: '도약 눈금의 물결', since: '2026-11-05', round: 0 });
const history = read<AbDecision[]>(P.history, []);
const fun = read<Record<string, FunReport>>(P.fun, {});

function side(id: string): AbSide {
  const spec = parseFusionId(id)!;
  const puzzles = (['medium', 'hard'] as const).map((tier, k) => ({
    tier,
    ...generateFusion(spec, { width: 6, height: 6, seed: 31 * (k + 1) + baseline.round * 1000 + history.length, target: tier, attempts: 60, requireAllAtoms: true })!,
  }));
  return { id, name: fusionName(spec), fun: fun[id], puzzles };
}

if (cmd === 'choose') {
  const cur = read<AbRound | null>(P.current, null);
  if (!cur || cur.status !== 'pending') throw new Error('대기 중인 A|B가 없습니다.');
  if (arg !== 'A' && arg !== 'B') throw new Error('choose A 또는 choose B');
  history.push({ round: cur.round, at: today, A: cur.A.id, B: cur.B.id, machinePick: cur.machinePick, ownerPick: arg });
  cur.status = 'decided';
  const win = arg === 'A' ? cur.A : cur.B;
  write(P.baseline, { id: win.id, name: win.name, since: today, round: cur.round } satisfies Baseline);
  write(P.history, history);
  write(P.current, cur);
  console.log(`라운드 ${cur.round}: 오너 선택 ${arg} → 기준선 ${win.id}`);
} else if (cmd === 'run') {
  const all = process.argv.includes('--all');
  const ids = [...new Set([baseline.id, ...discoveries.map((d) => d.id)])];
  const t0 = performance.now();
  for (const id of ids) {
    if (!all && fun[id]) continue;
    fun[id] = evaluateFun(parseFusionId(id)!, id);
    console.log(`${id.padEnd(34)} 재미 ${fun[id].fun.toFixed(3)} ±${fun[id].se.toFixed(3)}`);
  }
  write(P.fun, fun);
  console.log(`재미 지표 ${ids.length}개 (${((performance.now() - t0) / 1000).toFixed(0)}s)`);
  const cur = read<AbRound | null>(P.current, null);
  if (cur && cur.status === 'pending') console.log(`A|B 라운드 ${cur.round} 오너 선택 대기 중 — 새 B를 만들지 않음`);
  else {
    const seen = new Set(history.flatMap((h) => [h.A, h.B]));
    const pick = ids.filter((id) => id !== baseline.id && !seen.has(id)).sort((a, b) => fun[b].fun - fun[a].fun)[0];
    if (!pick) console.log('새 B 후보 없음 — 탐색·원자 추가로 발견을 늘려야 함');
    else {
      const A = side(baseline.id), B = side(pick);
      const diff = B.fun.fun - A.fun.fun;
      const z = diff / Math.max(1e-6, Math.hypot(A.fun.se, B.fun.se));
      const round = (cur?.round ?? 0) + 1;
      const r: AbRound = { round, createdAt: today, status: 'pending', A, B, diff: +diff.toFixed(3), z: +z.toFixed(2), machinePick: z > 1 ? 'B' : z < -1 ? 'A' : '동률' };
      write(P.current, r);
      console.log(`A|B 라운드 ${round}: A=${A.id} (${A.fun.fun}) vs B=${B.id} (${B.fun.fun}) · z=${r.z} · 기계 추천 ${r.machinePick}`);
    }
  }
} else throw new Error('usage: run [--all] | choose A|B');
