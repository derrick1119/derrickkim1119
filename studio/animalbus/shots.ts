/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤·터치·키보드 플레이도 검사.
 *   npx tsx studio/animalbus/shots.ts  → studio/animalbus/screens/*.png  (문제가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/animalbus/index.html')).href;
mkdirSync(join(here, 'screens'), { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];
const st = (page: any) => page.evaluate(() => { const B = (globalThis as any).__bus, s = B.state(); return { t: s.t, taps: s.taps, stage: s.stage, gone: s.S.gone.filter((x: number) => x).length, running: B.running() }; });
const shot = (page: any, f: string) => page.screenshot({ path: join(here, 'screens', f) });
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, ...(name === 'mobile' ? { hasTouch: true, isMobile: true } : {}) });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(1800);
  await shot(page, `${name}-start.png`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  if (!(await st(page)).running) errors.push(`${name}: 처음 온 사람이 바로 1판에 들어가지 않음`);
  // 박사가 고른 동물을 꾹(갈 길 미리 보기) → 떼기(톡)
  const box = await page.locator('.g-canvas').boundingBox();
  for (let k = 0; k < 4; k++) {
    const p = await page.evaluate(() => (globalThis as any).__bus.next());
    if (!p) { await page.waitForTimeout(400); continue; }
    await page.mouse.move(box.x + box.width * p.x, box.y + box.height * p.y);
    await page.mouse.down();
    await page.waitForTimeout(450);
    if (k === 0) await shot(page, `${name}-hold.png`);
    await page.mouse.up();
    await page.waitForTimeout(k === 0 ? 300 : 700);
    if (k === 0) await shot(page, `${name}-walk.png`);
  }
  await page.waitForTimeout(1200);
  await shot(page, `${name}-bus.png`);
  if ((await st(page)).gone < 1) errors.push(`${name}: 터치로 동물이 안 나감`);
  // 다른 판들 모습 (3 코끼리 · 5 우비 · 6 2층 버스 · 8 퇴근길)
  for (const i of [2, 4, 5, 7]) {
    // C003: 판 고르기(탈락 조건) 시간 — 브라우저에서 판 하나 만드는 데 걸린 ms (📋: 2초 넘으면 고정 배치)
    const ms = await page.evaluate((j: number) => { const t0 = performance.now(); (globalThis as any).__bus.jump(j); return performance.now() - t0; }, i);
    console.log(`${name}: ${i + 1}판 만들기 ${ms.toFixed(0)}ms`);
    if (ms > 2000) errors.push(`${name}: ${i + 1}판 만들기 ${ms.toFixed(0)}ms > 2초`);
    await page.waitForTimeout(1500);
    await shot(page, `${name}-stage${i + 1}.png`);
  }
  // 키보드만: 화살표로 커서를 첫 판 동물 위로 옮기고 스페이스
  if (name === 'desktop') {
    await page.evaluate(() => (globalThis as any).__bus.jump(0));
    await page.waitForTimeout(1500);
    await page.locator('.g-canvas').focus();
    const before = (await st(page)).gone, p = await page.evaluate(() => (globalThis as any).__bus.next());
    if (p) {
      const step = async (key: string, n: number) => { await page.keyboard.down(key); await page.waitForTimeout(Math.round(n * 1000 / 60)); await page.keyboard.up(key); };
      const dx = p.x - 0.5, dy = p.y - 0.6;
      await step(dx > 0 ? 'ArrowRight' : 'ArrowLeft', Math.abs(dx) / 0.012);
      await step(dy > 0 ? 'ArrowDown' : 'ArrowUp', Math.abs(dy) / 0.008);
      await page.keyboard.down(' ');
      await page.waitForTimeout(200);
      await page.keyboard.up(' ');
      await page.waitForTimeout(1500);
      await shot(page, `${name}-keyboard.png`);
      if ((await st(page)).taps < 1) errors.push(`${name}: 키보드로 톡이 안 됨`);
      else if ((await st(page)).gone <= before) console.log(`(참고) ${name}: 키보드 톡이 동물을 못 맞힘 — 커서 이동 오차`);
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
if (!(await page.evaluate(() => (globalThis as any).__bus.running()))) errors.push('저장 불가: 시작 안 됨');
await browser.close();
if (errors.length) (console.error(errors.join('\n')), process.exit(1));
console.log('스크린샷 OK — 콘솔 에러 0 · 가로 스크롤 없음 · 터치·키보드 톡 · 저장 불가에서도 시작');
