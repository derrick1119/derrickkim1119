/**
 * 스크린샷(390×844 휴대폰) — 플레이 빌드를 실제 브라우저로 열어 타이틀·첫 판·누르고 있기(미리 보기)·몇 수 뒤를 찍는다.
 *   npx tsx studio/screwshop/build.ts && npx tsx studio/screwshop/shots.ts → studio/screwshop/screens/
 * 콘솔 에러·가로 스크롤도 함께 잰다.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

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
  const p = at(0.3, 0.89);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, '03-hold-preview.png') });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, '04-after-tap.png') });
  const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('가로 스크롤 px:', scrollX);
  await page.close();
}
await browser.close();
console.log('콘솔 에러:', errors.length ? errors : 0);
