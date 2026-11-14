/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤·터치·키보드 플레이도 검사.
 *   npx tsx studio/potionsort/shots.ts  → studio/potionsort/screens/*.png  (문제가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/potionsort/index.html')).href;
mkdirSync(join(here, 'screens'), { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];
const st = (page: any) => page.evaluate(() => { const P = (globalThis as any).__potion, s = P.state(); return { taps: s.taps, pours: s.S.pours, sel: s.sel, stage: s.stage, running: P.running() }; });
const shot = (page: any, f: string) => page.screenshot({ path: join(here, 'screens', f) });
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, ...(name === 'mobile' ? { hasTouch: true, isMobile: true } : {}) });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(1500);
  await shot(page, `${name}-start.png`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  if (!(await st(page)).running) errors.push(`${name}: 처음 온 사람이 바로 1판에 들어가지 않음`);
  // 장인이 고른 병을 톡(들어 올림) → 받는 병을 톡(콸콸)
  const box = await page.locator('.g-canvas').boundingBox();
  for (let k = 0; k < 4; k++) {
    const p = await page.evaluate(() => (globalThis as any).__potion.next());
    if (!p) { await page.waitForTimeout(400); continue; }
    await page.mouse.click(box.x + box.width * p.x, box.y + box.height * p.y);
    await page.waitForTimeout(k === 0 ? 350 : 700);
    if (k === 0) await shot(page, `${name}-lift.png`);
    if (k === 1) await shot(page, `${name}-pour.png`);
  }
  await page.waitForTimeout(1000);
  await shot(page, `${name}-after.png`);
  if ((await st(page)).pours < 1) errors.push(`${name}: 터치로 붓기가 안 됨`);
  // 다른 판들 모습 (2 부글 · 4 얼음 · 6 가마솥 · 8 보름달)
  for (const i of [1, 3, 5, 7]) {
    const ms = await page.evaluate((j: number) => { const t0 = performance.now(); (globalThis as any).__potion.jump(j); return performance.now() - t0; }, i);
    console.log(`${name}: ${i + 1}판 만들기 ${ms.toFixed(0)}ms`);
    if (ms > 2000) errors.push(`${name}: ${i + 1}판 만들기 ${ms.toFixed(0)}ms > 2초`);
    await page.waitForTimeout(1200);
    await shot(page, `${name}-stage${i + 1}.png`);
  }
  // 키보드만: 화살표로 커서를 병 위로 옮기고 스페이스
  if (name === 'desktop') {
    await page.evaluate(() => (globalThis as any).__potion.jump(0));
    await page.waitForTimeout(1200);
    await page.locator('.g-canvas').focus();
    const p = await page.evaluate(() => (globalThis as any).__potion.next());
    if (p) {
      const step = async (key: string, n: number) => { await page.keyboard.down(key); await page.waitForTimeout(Math.round(n * 1000 / 60)); await page.keyboard.up(key); };
      const dx = p.x - 0.5, dy = p.y - 0.6;
      await step(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(dx) / 0.012);
      await step(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy) / 0.008);
      await page.keyboard.down(' ');
      await page.waitForTimeout(120);
      await page.keyboard.up(' ');
      await page.waitForTimeout(600);
      await shot(page, `${name}-keyboard.png`);
      if ((await st(page)).taps < 1) errors.push(`${name}: 키보드로 톡이 안 됨`);
    }
  }
  await page.close();
}
// localStorage가 막힌 환경에서도 동작
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('막힘'); } }));
page.on('pageerror', (e: Error) => errors.push(`저장 불가: ${e.message}`));
await page.goto(url);
await page.waitForTimeout(800);
if (!(await page.evaluate(() => (globalThis as any).__potion.running()))) errors.push('저장 불가: 시작 안 됨');
await browser.close();
if (errors.length) (console.error(errors.join('\n')), process.exit(1));
console.log('스크린샷 OK — 콘솔 에러 0 · 가로 스크롤 없음 · 터치·키보드 톡 · 저장 불가에서도 시작');
