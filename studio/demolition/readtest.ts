/**
 * 판독 시험 (🧪 C005 · 3D 게이트 '판독 ≥ .85, 2D 기준선 −0.1 안'): 2D·3D 미리 보기 장면을 12장씩 찍고, 정답은 시뮬에서 뽑는다.
 *   npx tsx studio/demolition/readtest.ts <정답 파일 경로>   (먼저 build.ts)
 * 그림은 screens/read/ 에, 정답은 인자로 준 경로(풀이하는 🧪 에이전트가 못 보는 곳)에 쓴다. 문항(그림마다 셋):
 *   Q1 이대로 쾅 하면? 성공 / 실패 / 꿈쩍 안 함   Q2 조각이 울타리 밖(이웃집)에 닿나? 예/아니오   Q3 꽃밭을 덮나? 예/아니오
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGES, capOf, layoutOf, simulate } from './game.ts';
import { capOf3, layoutOf3, simulate3 } from './sim3d.ts';
import { STAGES3 } from './stages3d.ts';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, out = join(here, 'screens', 'read'), keyPath = process.argv[2];
if (!keyPath) throw new Error('정답 파일 경로를 주세요');
mkdirSync(out, { recursive: true });

type Ans = { q1: '성공' | '실패' | '꿈쩍 안 함'; q2: '예' | '아니오'; q3: '예' | '아니오' };
const ans = (moved: boolean, ok: boolean, hit: boolean, fl: boolean): Ans => ({ q1: !moved ? '꿈쩍 안 함' : ok ? '성공' : '실패', q2: hit ? '예' : '아니오', q3: fl ? '예' : '아니오' });

// 2D: 판마다 블록 하나를 꾹(폭약 없이 시작) — 결과 종류가 고르게 섞이게 고른다
const cases2: { k: number; x: number; y: number; a: Ans }[] = [];
const want = new Map<string, number>();
for (let k = 0; k < STAGES.length && cases2.length < 12; k++) {
  const L = layoutOf(STAGES[k], false);
  const pool = L.blocks.map((b, i) => ({ b, i })).filter(({ b }) => capOf(b) > 0);
  pool.sort((p, q) => ((p.b.x * 7 + p.b.y * 3 + k) % 5) - ((q.b.x * 7 + q.b.y * 3 + k) % 5));
  for (const { b, i } of pool) {
    const ch = new Int8Array(L.blocks.length);
    ch[i] = capOf(b);
    const o = simulate(L, ch), a = ans(o.moved, o.ok, o.hitL + o.hitR > 0, o.flowers > 0), key = `${a.q1}${a.q2}${a.q3}`;
    if ((want.get(key) ?? 0) >= 3) continue;
    want.set(key, (want.get(key) ?? 0) + 1);
    cases2.push({ k, x: b.x, y: b.y, a });
    if (cases2.filter((c) => c.k === k).length >= 2 || cases2.length >= 12) break;
  }
}
// 3D: 1-1 붙일 블록 · 1-2 첫 폭약 + 둘째 겨눔 조합 — 역시 결과 종류를 섞는다
const cases3: { k: number; pre: number[][]; aim: number[]; a: Ans }[] = [];
const want3 = new Map<string, number>();
STAGES3.forEach((d, k) => {
  const L = layoutOf3(d), taps = L.blocks.map((b, i) => ({ b, i })).filter(({ b }) => capOf3(b) > 0);
  const combos: { pre: number[]; aim: number }[] = d.charges === 1 ? taps.map(({ i }) => ({ pre: [], aim: i })) : taps.flatMap(({ i }) => [{ pre: [], aim: i }, ...taps.filter((t) => t.i > i).map((t) => ({ pre: [i], aim: t.i }))]);
  combos.sort((p, q) => ((p.aim * 13 + (p.pre[0] ?? 0) * 7) % 11) - ((q.aim * 13 + (q.pre[0] ?? 0) * 7) % 11));
  for (const c of combos) {
    if (cases3.length >= 12 || cases3.filter((x) => x.k === k).length >= (k === 0 ? 2 : 10)) break;
    const ch = new Int8Array(L.blocks.length);
    for (const j of [...c.pre, c.aim]) ch[j] = capOf3(L.blocks[j]);
    const o = simulate3(L, ch), a = ans(o.moved, o.ok, o.hits.some((h) => h > 0), o.flowers > 0), key = `${a.q1}${a.q2}${a.q3}`;
    if ((want3.get(key) ?? 0) >= 3) continue;
    want3.set(key, (want3.get(key) ?? 0) + 1);
    const p = (j: number) => [L.blocks[j].x, L.blocks[j].y, L.blocks[j].z];
    cases3.push({ k, pre: c.pre.map(p), aim: p(c.aim), a });
  }
});

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const key: Record<string, Ans> = {};
await page.goto('file://' + join(here, '../../web/public/studio/demolition/2d.html'));
for (const [n, c] of cases2.entries()) {
  await page.evaluate(([k, x, y]: number[]) => (window as any).__d2.preview(k, x, y), [c.k, c.x, c.y]);
  await page.waitForTimeout(80);
  const name = `2d-${String(n + 1).padStart(2, '0')}.png`;
  await page.locator('canvas').screenshot({ path: join(out, name) });
  key[name] = c.a;
}
await page.goto('file://' + join(here, '../../web/public/studio/demolition/3d.html'));
for (const [n, c] of cases3.entries()) {
  await page.evaluate(([k, pre, aim]: [number, number[][], number[]]) => (window as any).__d3.preview(k, pre, aim), [c.k, c.pre, c.aim]);
  await page.waitForTimeout(120);
  const name = `3d-${String(n + 1).padStart(2, '0')}.png`;
  await page.locator('#game').screenshot({ path: join(out, name) });
  key[name] = c.a;
}
await browser.close();
writeFileSync(keyPath, JSON.stringify(key, null, 1) + '\n');
console.log(`2D ${cases2.length}장 · 3D ${cases3.length}장 → ${out}`);
