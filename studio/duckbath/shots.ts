/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤·키보드 플레이도 검사.
 *   npx tsx studio/duckbath/shots.ts  → studio/duckbath/screens/*.png  (문제가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/duckbath/index.html')).href;
mkdirSync(join(here, 'screens'), { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];
const st = (page: any) => page.evaluate(() => { const s = (globalThis as any).__duck.state(); return { t: s.t, used: s.used, stage: s.stage, running: (globalThis as any).__duck.running() }; });
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  // 터치: 시작 → 물 가운데 아래쪽을 꾹(미리 보기) → 떼기(찰박)
  await page.click('.g-overlay');
  await page.waitForTimeout(1600);
  const box = await page.locator('.g-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.62);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-aim.png`) });
  await page.mouse.up();
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(here, 'screens', `${name}-splash.png`) });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(here, 'screens', `${name}-after.png`) });
  if ((await st(page)).used < 1) errors.push(`${name}: 터치로 찰박이 안 됨`);
  // 실패 카드(D001: 하트 없이 같은 판 다시) — 확인용으로 톡을 0으로 만들어 실패시킨다
  await page.waitForFunction(() => (globalThis as any).__duck.state().phase === 'play' && (globalThis as any).__duck.state().pt > 200, null, { timeout: 15_000 });
  const stage0 = (await st(page)).stage;
  await page.evaluate(() => ((globalThis as any).__duck.state().taps = 0));
  await page.waitForFunction(() => (globalThis as any).__duck.state().phase === 'result', null, { timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(here, 'screens', `${name}-fail.png`) });
  await page.waitForFunction(() => (globalThis as any).__duck.state().phase === 'play', null, { timeout: 15_000 });
  const af = await st(page);
  if (!af.running || af.stage !== stage0) errors.push(`${name}: 실패 뒤 같은 판 다시가 아님 ${JSON.stringify(af)}`);
  // 키보드만: 새로 열어 Enter로 시작 → 화살표로 커서 → 스페이스 꾹·떼기
  await page.goto(url);
  await page.waitForTimeout(300);
  await page.focus('.g-overlay');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down(' ');
  await page.waitForTimeout(300);
  await page.keyboard.up(' ');
  await page.waitForTimeout(400);
  const k = await st(page);
  if (!k.running || k.used < 1) errors.push(`${name}: 키보드로 찰박이 안 됨 ${JSON.stringify(k)}`);
  await page.close();
}
// localStorage가 막힌 환경에서도 시작된다
const ctx = await browser.newContext();
await ctx.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
const p2 = await ctx.newPage();
p2.on('pageerror', (e: Error) => errors.push(`nostorage: ${e.message}`));
await p2.goto(url);
await p2.click('.g-overlay');
await p2.waitForTimeout(400);
if (!(await st(p2)).running) errors.push('nostorage: 시작 안 됨');
await browser.close();
console.log(errors.length ? `문제 ${errors.length}건:\n${errors.join('\n')}` : '스크린샷 OK · 콘솔 에러 0 · 가로 스크롤 없음 · 터치·키보드·저장소 없음 모두 동작');
process.exit(errors.length ? 1 : 0);
