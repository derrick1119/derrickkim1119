/**
 * 조합 추천기 (0018). 오너: "조합 다양성이 부족해 보인다."
 * 아직 안 쓴 재료를 우선해 "핵심 놀이 둘 + 조작 + 비틀기/성장" 조합 후보를 뽑는다.
 * 운영자는 사이클마다 여기서 고르되, 말이 안 되는 짝은 건너뛰고 다음 후보를 본다.
 *
 *   npx tsx arcade/ideas.ts [--n 8] [--seed 2026-11-07]
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { hashString, mulberry32, shuffle } from '../engine/rng.ts';
import { GENES, type Gene, type GeneKind } from './core.ts';
import { GAMES } from './registry.ts';

export interface Idea { core: [string, string]; control: string; spice: string; fresh: number }

export function usage(): Record<string, number> {
  const u: Record<string, number> = Object.fromEntries(Object.keys(GENES).map((k) => [k, 0]));
  for (const e of GAMES) for (const id of e.game.genes) u[id] = (u[id] ?? 0) + 1;
  return u;
}

/** 오너가 고른 조작(지금까지 3/3 원버튼) — 원버튼 계열을 우선하되 다른 조작도 가끔 섞는다 */
const CONTROL_PREF: Record<string, number> = { onebutton: 3, hold: 3, twobutton: 1, swipe: 1, dragaim: 1, slide: 0.5 };

export function suggest(n = 8, seed = new Date().toISOString().slice(0, 10)): Idea[] {
  const u = usage();
  const rng = mulberry32(hashString(`ideas:${seed}`));
  const of = (k: GeneKind) => Object.values(GENES).filter((x) => x.kind === k);
  // 적게 쓴 순서, 같은 횟수 안에서는 무작위
  const byFresh = (xs: Gene[]) => shuffle(xs.slice(), rng).sort((a, b) => u[a.id] - u[b.id]);
  const cores = byFresh(of('core'));
  const spices = byFresh([...of('twist'), ...of('meta')]);
  const controls = of('control');
  const out: Idea[] = [];
  const usedSpice = new Map<string, number>();
  for (let i = 0; out.length < n && i < cores.length; i++) {
    const a = cores[i];
    // 짝: 이미 써 본 핵심(검증된 재미) 중 하나 + 가끔 안 써 본 것끼리
    const pool = rng() < 0.6 ? cores.filter((c) => u[c.id] > 0 && c.id !== a.id) : cores.filter((c) => c.id !== a.id);
    const b = pool[Math.floor(rng() * pool.length)];
    const total = controls.reduce((s, c) => s + (CONTROL_PREF[c.id] ?? 1), 0);
    let r = rng() * total, control = controls[0];
    for (const c of controls) if ((r -= CONTROL_PREF[c.id] ?? 1) <= 0) (control = c), (r = Infinity);
    const spice = spices.slice().sort((x, y) => (usedSpice.get(x.id) ?? 0) - (usedSpice.get(y.id) ?? 0) || u[x.id] - u[y.id])[0];
    usedSpice.set(spice.id, (usedSpice.get(spice.id) ?? 0) + 1);
    const fresh = [a, b, control, spice].filter((x) => u[x.id] === 0).length;
    out.push({ core: [a.id, b.id], control: control.id, spice: spice.id, fresh });
  }
  return out;
}

export const ideaText = (i: Idea) =>
  `${GENES[i.core[0]].from} × ${GENES[i.core[1]].from} · ${GENES[i.control].from} · ${GENES[i.spice].from}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k: string, d: string) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : d);
  const ideas = suggest(Number(arg('n', '8')), arg('seed', new Date().toISOString().slice(0, 10)));
  const u = usage();
  const unused = Object.values(GENES).filter((x) => u[x.id] === 0).length;
  writeFileSync(join(import.meta.dirname, 'reports', 'ideas.json'), JSON.stringify({ unused, total: Object.keys(GENES).length, ideas }, null, 1) + '\n');
  console.log(`재료 ${Object.keys(GENES).length}개 중 아직 안 쓴 것 ${unused}개`);
  ideas.forEach((i, k) => console.log(`${k + 1}. ${ideaText(i)}  (새 재료 ${i.fresh}개)`));
}
