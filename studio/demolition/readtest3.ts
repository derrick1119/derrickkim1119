/**
 * 판독 시험 v3 (FUN v1.3 · 📋 C006 — 3D는 글자표를 다 끄고 그림만, 높이 실패는 '목표선 위에 남는 블록 빨간 테'): 3D 24장(시점 4개 고루 · 부류: 성공 · 이웃집 · 높이 실패 · 꽃밭 · 꿈쩍 안 함 · 대각 두 다리) + 2D 대조군 12장(결과 배너를 가림).
 *   npx tsx studio/demolition/readtest2.ts <정답 파일 경로>   (먼저 build.ts) — 그림은 screens/read2/, 정답은 응시자가 못 보는 경로에.
 * 문항: Q1 이대로 쾅 하면? 성공 / 이웃집 실패 / 높이 실패 / 꿈쩍 안 함
 *       Q2 덩어리가 넘어지는 쪽(화면 기준)? 왼쪽 아래 / 오른쪽 아래 / 왼쪽 위 / 오른쪽 위 / 안 넘어짐  (2D: 왼쪽 / 오른쪽 / 안 넘어짐)
 *       Q3 (3D만) 노란 테 블록은? 아래 다리 칸 / 위 다리 칸 / 마루 / 가운데 기둥
 * 3D는 글자표(결과 꼬리표·'변화 없음'·'떼기')를 다 끄고, 2D 판정 말풍선은 가린다 — 글이 아니라 그림을 읽는지 잰다.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { STAGES, capOf, layoutOf, simulate } from './game.ts';
import { capOf3, layoutOf3, simulate3, support3 } from './sim3d.ts';
import { STAGES3 } from './stages3d.ts';
import { fitCams, proj, visibleArea } from './view3d.ts';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, out = join(here, 'screens', 'read3'), keyPath = process.argv[2];
if (!keyPath) throw new Error('정답 파일 경로를 주세요');
mkdirSync(out, { recursive: true });

type Key = { q1: string; q2: string; q3?: string; cls: string };
const q1Of = (moved: boolean, ok: boolean, hit: boolean) => (!moved ? '꿈쩍 안 함' : hit ? '이웃집 실패' : ok ? '성공' : '높이 실패');

// ── 3D 후보: 1-1 단발 · 1-2 단발 + (첫 폭약, 둘째 겨눔) ──
type C3 = { k: number; pre: number[][]; aim: number[]; view: number; key: Key };
const pool: C3[] = [];
STAGES3.forEach((d, k) => {
  const L = layoutOf3(d), cams = fitCams(L.lot, L.blocks, 390, 468, 12), area = cams.map((c) => visibleArea(c, L.blocks, 390, 468, 3));
  const taps = L.blocks.map((_, i) => i).filter((i) => capOf3(L.blocks[i]) > 0);
  const combos = d.charges === 1 ? taps.map((i) => ({ pre: [] as number[], aim: i })) : taps.flatMap((i) => taps.filter((j) => j !== i).map((j) => ({ pre: [i], aim: j })));
  for (const c of combos) {
    const ch = new Int8Array(L.blocks.length);
    for (const j of [...c.pre, c.aim]) ch[j] = capOf3(L.blocks[j]);
    const o = simulate3(L, ch), f = support3(L, ch).find((x) => x.act === 'tip');
    for (let view = 0; view < 4; view++) {
      if (area[view][c.aim] < 150) continue; // 겨눈 블록이 그 시점에서 보여야 한다
      let q2 = '안 넘어짐';
      if (f && o.tips.length) {
        const cm = cams[view], cx = (f.rect!.x0 + f.rect!.x1) / 2, cz = (f.rect!.z0 + f.rect!.z1) / 2;
        const a = proj(cm, cx, 0, cz), b = proj(cm, cx + (f.axis === 0 ? f.dir : 0), 0, cz + (f.axis === 1 ? f.dir : 0));
        q2 = `${b[0] < a[0] ? '왼쪽' : '오른쪽'} ${b[1] > a[1] ? '아래' : '위'}`;
      }
      const ab = L.blocks[c.aim];
      const q3 = d.charges === 1 ? '가운데 기둥' : ab.y === 0 ? '아래 다리 칸' : ab.y === 1 ? '위 다리 칸' : '마루';
      const diag = c.pre.length === 1 && L.blocks[c.pre[0]].y === 0 && ab.y === 0 && L.blocks[c.pre[0]].x !== ab.x && L.blocks[c.pre[0]].z !== ab.z;
      const q1 = q1Of(o.moved, o.ok, o.hits.some((h) => h > 0));
      const cls = diag ? '대각 두 다리' : q1 === '성공' && o.flowers > 0 ? '꽃밭' : q1;
      const p = (j: number) => [L.blocks[j].x, L.blocks[j].y, L.blocks[j].z];
      pool.push({ k, pre: c.pre.map(p), aim: p(c.aim), view, key: { q1, q2, q3, cls } });
    }
  }
});
// 부류마다 4장, 시점은 고루 (결정적으로 고른다)
const want: Record<string, number> = { 성공: 4, 꽃밭: 4, '이웃집 실패': 4, '높이 실패': 4, '꿈쩍 안 함': 4, '대각 두 다리': 4 };
const pick3: C3[] = [];
for (const cls of Object.keys(want)) {
  const cand = pool.filter((c) => c.key.cls === cls);
  const used = new Set<string>();
  for (let n = 0, v = 0; n < want[cls] && cand.length; v++) {
    const viewWant = v % 4, c = cand.find((x) => x.view === viewWant && !used.has(JSON.stringify([x.pre, x.aim]))) ?? cand.find((x) => !used.has(JSON.stringify([x.pre, x.aim])));
    if (!c) break;
    used.add(JSON.stringify([c.pre, c.aim]));
    pick3.push(c);
    n++;
    if (v > 40) break;
  }
}
// ── 2D 대조군 12장 ──
const pick2: { k: number; x: number; y: number; key: Key }[] = [];
const seen2 = new Map<string, number>();
for (let k = 0; k < STAGES.length; k++) {
  const L = layoutOf(STAGES[k], false);
  for (const [i, b] of L.blocks.entries()) {
    if (!capOf(b) || pick2.length >= 12) continue;
    const ch = new Int8Array(L.blocks.length);
    ch[i] = capOf(b);
    const o = simulate(L, ch), q1 = q1Of(o.moved, o.ok, o.hitL + o.hitR > 0);
    if ((seen2.get(q1) ?? 0) >= 3 || (b.x * 5 + b.y + k) % 3) continue;
    seen2.set(q1, (seen2.get(q1) ?? 0) + 1);
    pick2.push({ k, x: b.x, y: b.y, key: { q1, q2: o.tips.length ? (o.tips[0].dir > 0 ? '오른쪽' : '왼쪽') : '안 넘어짐', cls: `2D ${q1}` } });
  }
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const key: Record<string, Key> = {};
const mask = (sel: string, h: number) => page.evaluate(([s, hh]: [string, number]) => {
  const g = document.querySelector(s) as HTMLElement, m = document.createElement('div');
  m.id = 'mask';
  m.style.cssText = `position:absolute;left:0;top:0;width:100%;height:${hh}px;background:#3a2a3f;z-index:9`;
  g.style.position = 'relative';
  document.getElementById('mask')?.remove();
  g.appendChild(m);
}, [sel, h]);
await page.goto('file://' + join(here, '../../web/public/studio/demolition/2d.html'));
for (const [n, c] of pick2.entries()) {
  await page.evaluate(([k, x, y]: number[]) => (window as any).__d2.preview(k, x, y), [c.k, c.x, c.y]);
  await mask('#game', 112); // 판정 말풍선 가림
  await page.waitForTimeout(60);
  const name = `2d-${String(n + 1).padStart(2, '0')}.png`;
  await page.locator('#game').screenshot({ path: join(out, name) });
  key[name] = c.key;
}
await page.goto('file://' + join(here, '../../web/public/studio/demolition/3d.html'));
const order = pick3.map((_, i) => i).sort((a, b) => ((a * 7) % 24) - ((b * 7) % 24));
for (const [n, idx] of order.entries()) {
  const c = pick3[idx];
  await page.evaluate(([k, pre, aim, v]: [number, number[][], number[], number]) => {
    (window as any).__d3.setNoText(true);
    (window as any).__d3.preview(k, pre, aim);
    (window as any).__d3.setView(v);
  }, [c.k, c.pre, c.aim, c.view]);
  await page.evaluate(() => document.getElementById('mask')?.remove());
  await page.waitForTimeout(120);
  const name = `3d-${String(n + 1).padStart(2, '0')}.png`;
  await page.locator('#game').screenshot({ path: join(out, name) });
  key[name] = c.key;
}
await browser.close();
writeFileSync(keyPath, JSON.stringify(key, null, 1) + '\n');
const forms = new Set(pick3.filter((c) => c.key.cls === '높이 실패').map((c) => JSON.stringify([...c.pre, c.aim].map((p) => p[1]).sort())));
console.log('높이 실패 장면 꼴(블록 높이 조합)', forms.size);
console.log(`2D ${pick2.length}장 · 3D ${pick3.length}장 → ${out}`, Object.entries(want).map(([k]) => `${k} ${pick3.filter((c) => c.key.cls === k).length}`).join(' · '));
