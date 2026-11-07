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
  // 키보드만으로 시작 → 카드는 → Enter 로 고르기
  await page.keyboard.press('Enter');
  for (let k = 0; k < 14; k++) {
    await page.waitForTimeout(700);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');
  }
  await page.screenshot({ path: join(here, 'screens', `${name}-play.png`) });
  // 카드가 뜬 순간 + 전투 중 손맛 (새 판에서 카드가 뜰 때까지 버틴다)
  await page.keyboard.press('KeyP');
  await page.click('#quit');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (globalThis as any).__pg.state().offer || (globalThis as any).__pg.state().dead, null, { timeout: 60_000 });
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(here, 'screens', `${name}-cards.png`) });
  // 카드가 떠 있는 동안 게임이 멈춰 있는가 → 카드를 눌러 고르면 다시 도는가 (오너: "레벨업하면 멈추고 선택")
  await page.waitForFunction(() => (globalThis as any).__pg.state().offer || (globalThis as any).__pg.state().dead, null, { timeout: 60_000 });
  const t0 = await page.evaluate(() => (globalThis as any).__pg.state().t);
  await page.waitForTimeout(800);
  const t1 = await page.evaluate(() => (globalThis as any).__pg.state().t);
  if (t1 !== t0) errors.push(`${name}: 카드가 떠 있는데 시간이 흐름 ${t0}→${t1}`);
  await page.screenshot({ path: join(here, 'screens', `${name}-touch.png`) });
  await page.mouse.click(vp.width / 2, vp.height * 0.9);
  await page.waitForTimeout(300);
  if (await page.evaluate(() => !!(globalThis as any).__pg.state().offer && (globalThis as any).__pg.state().builds === 0)) errors.push(`${name}: 카드를 눌러도 안 골라짐`);
  await page.keyboard.press('KeyP');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(here, 'screens', `${name}-pause.png`) });
  // 결과 화면: 방어막을 1로 줄이고(확인용) 카드는 계속 1번
  await page.keyboard.press('KeyP');
  await page.evaluate(() => void ((globalThis as any).__pg.state().hp = 1));
  for (let k = 0; k < 400 && (await page.locator('#result').isHidden()); k++) {
    await page.keyboard.press('Digit1');
    await page.waitForTimeout(300);
  }
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
