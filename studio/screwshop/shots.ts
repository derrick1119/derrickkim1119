/**
 * 스크린샷(390×844 휴대폰) — 플레이 빌드를 실제 브라우저로 열어 타이틀·첫 판·누르고 있기(미리 보기)·몇 수 뒤를 찍는다.
 *   npx tsx studio/screwshop/build.ts && npx tsx studio/screwshop/shots.ts → studio/screwshop/screens/
 * 콘솔 에러·가로 스크롤도 함께 잰다.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STAGES, screwshop as g, screwshopSmart } from './game.ts';
const STAGES_FIRST = STAGES[0].first ?? 0;
import { mulberry32 } from './rng.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(here, '../../web/public/studio/screwshop/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [];
for (const scheme of ['light', 'dark'] as const) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForTimeout(300);
  if (scheme === 'dark') continue;
  await page.screenshot({ path: join(out, '01-title.png') });
  await page.click('.g-overlay');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, '02-stage1.png') });
  // 첫 판의 나사 자리 = 시뮬 좌표 → 캔버스 좌표 (게임이 window에 노출하지 않으므로 화면 비율로 근사: 기린 몸통 나사 0.4, 0.85/1.45)
  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x * box.width, y: box.y + (y / 1.45) * box.height });
  const L1 = g.create(1).L, p = at(L1.px[STAGES_FIRST], L1.py[STAGES_FIRST]); // 1판 손가락 첫 나사(🔨 머리)를 누르고 있기 → 🎯
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, '03-hold-preview.png') });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, '04-after-tap.png') });
  // 장인 봇이 시드 42의 1판에서 누른 자리를 같은 순서로 브라우저에서 눌러 본다 (?seed=42) — 연속 쏙 숫자·상자 닫힘·판 완성 화면
  const plan: number[][] = [];
  {
    const sim = g.create(42), rng = mulberry32(1);
    let was = false;
    while (sim.stage === 0 && sim.t < 60 * 120) {
      const i = screwshopSmart.act(sim, rng);
      if (i.pointer && !was) plan.push([i.pointer.x, i.pointer.y]);
      was = !!i.pointer;
      g.step(sim, i);
    }
  }
  await page.goto(url + '?seed=42');
  await page.click('.g-overlay');
  await page.waitForTimeout(900);
  const b2 = (await page.locator('canvas').boundingBox())!;
  for (let i = 0; i < plan.length; i++) {
    await page.mouse.move(b2.x + plan[i][0] * b2.width, b2.y + plan[i][1] * b2.height);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(i === 5 ? 470 : 800);
    if (i === 5) await page.screenshot({ path: join(out, '05-streak.png') }), await page.waitForTimeout(330);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, '06-clear.png') });
  // ★3을 못 딴 결과(별 이유 + ↺ 다시 · 다음): 망치를 반대로 매다는 순서로 1판을 푼다
  await page.goto(url + '?seed=42');
  await page.click('.g-overlay');
  await page.waitForTimeout(900);
  const b3 = (await page.locator('canvas').boundingBox())!, L3 = g.create(42).L;
  for (const i of [7, 4, 3, 8, 5, 2, 6, 0, 1]) {
    await page.mouse.move(b3.x + L3.px[i] * b3.width, b3.y + (L3.py[i] / 1.45) * b3.height);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(750);
  }
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(out, '07-result-retry.png') });
  const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('가로 스크롤 px:', scrollX);
  await page.close();
}
await browser.close();
console.log('콘솔 에러:', errors.length ? errors : 0);
