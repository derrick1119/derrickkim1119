/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤도 검사.
 *   npx tsx studio/planet-guardian/shots.ts  → studio/planet-guardian/screens/*.png
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// 사전 설치된 전역 playwright (개발 의존성 추가 없이)
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/planet-guardian/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [];
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  const scroll = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (scroll) errors.push(`${name}: 가로 스크롤`);
  // 키보드만으로 시작 → 왼쪽 누르고 있기 → 카드는 1
  await page.keyboard.press('Enter');
  for (let k = 0; k < 14; k++) {
    await page.keyboard.down(k % 2 ? 'ArrowLeft' : 'ArrowUp');
    await page.waitForTimeout(700);
    await page.keyboard.up(k % 2 ? 'ArrowLeft' : 'ArrowUp');
    await page.keyboard.press('Digit1');
  }
  await page.screenshot({ path: join(here, 'screens', `${name}-play.png`) });
  // 카드가 뜬 순간 + 전투 중 손맛 (새 판에서 카드가 뜰 때까지 버틴다)
  await page.keyboard.press('KeyP');
  await page.click('#quit');
  await page.keyboard.press('Enter');
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(() => (globalThis as any).__pg.state().offer || (globalThis as any).__pg.state().dead, null, { timeout: 60_000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(here, 'screens', `${name}-cards.png`) });
  await page.keyboard.up('ArrowUp');
  if (name === 'mobile') {
    // 터치: 행성 아래쪽을 누르고 있기
    await page.mouse.move(195, 560);
    await page.mouse.down();
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(here, 'screens', `${name}-touch.png`) });
    await page.mouse.up();
  }
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(here, 'screens', `${name}-pause.png`) });
  // 결과 화면: 손 놓고 기다리기
  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => !document.getElementById('result')!.hidden, null, { timeout: 120_000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(here, 'screens', `${name}-result.png`) });
  await page.close();
}
// localStorage 막힌 환경
const ctx = await browser.newContext();
await ctx.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
const p = await ctx.newPage();
p.on('pageerror', (e: Error) => errors.push(`nostorage: ${e.message}`));
await p.goto(url);
await p.keyboard.press('Enter');
await p.waitForTimeout(1500);
if (await p.locator('#title').isVisible()) errors.push('nostorage: 시작 안 됨');
await browser.close();
console.log(errors.length ? `문제 ${errors.length}:\n${errors.join('\n')}` : '콘솔 에러 0 · 가로 스크롤 없음 · 저장소 없이 동작');
process.exitCode = errors.length ? 1 : 0;
