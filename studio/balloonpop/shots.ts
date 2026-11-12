/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤도 검사.
 *   npx tsx studio/balloonpop/shots.ts  → studio/balloonpop/screens/*.png  (에러가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/balloonpop/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [];
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  // 키보드만으로 시작 → 첫 풍선 쪽으로 커서를 옮겨 스페이스로 톡
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  const st0 = await page.evaluate(() => (globalThis as any).__bp.state().taps);
  await page.keyboard.press('ArrowLeft');
  await page.evaluate(() => { const b = (globalThis as any).__bp; b.aim(b.target()); });
  await page.keyboard.press('Space');
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(here, 'screens', `${name}-chain.png`) });
  const st1 = await page.evaluate(() => (globalThis as any).__bp.state());
  if (st1.taps >= st0 && st1.popped === 0) errors.push(`${name}: 키보드 톡이 먹지 않음`);
  // 마우스/터치: 살아 있는 풍선을 직접 눌러 본다
  await page.waitForTimeout(1500);
  for (let k = 0; k < 2; k++) {
    const p = await page.evaluate(() => (globalThis as any).__bp.target());
    const box = await page.locator('#game').boundingBox();
    if (p && box) await page.mouse.click(box.x + p.x * box.width, box.y + p.y * box.height);
    await page.waitForTimeout(k ? 400 : 1500);
  }
  await page.screenshot({ path: join(here, 'screens', `${name}-tap.png`) });
  if ((await page.evaluate(() => (globalThis as any).__bp.state().used)) < 2) errors.push(`${name}: 마우스 톡이 먹지 않음`);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(here, 'screens', `${name}-later.png`) });
  await page.close();
}
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('스크린샷 OK, 콘솔 에러 0');
