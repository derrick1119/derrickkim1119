/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤도 검사.
 *   npx tsx studio/balloonpop/shots.ts  → studio/balloonpop/screens/*.png  (에러가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
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
  // 다시 카드 · 도움 반짝(두 번 실패한 판): 확인용 훅으로 실패를 만들고 1초 뒤 같은 하늘을 다시
  await page.evaluate(() => (globalThis as any).__bp.failToHelp());
  await page.waitForTimeout(1250);
  await page.screenshot({ path: join(here, 'screens', `${name}-retry.png`) });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(here, 'screens', `${name}-help.png`) });
  const hs = await page.evaluate(() => { const s = (globalThis as any).__bp.state(); return { helped: s.helped, help: s.help, tries: s.tries }; });
  if (!hs.helped || hs.help < 0) errors.push(`${name}: 도움 반짝이 안 뜸 ${JSON.stringify(hs)}`);
  // 결과(완주) 화면: 8판을 실제로 다 하기엔 길어서 확인용 훅으로 바로 띄운다
  await page.evaluate(() => (globalThis as any).__bp.finish());
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(here, 'screens', `${name}-result.png`) });
  if (await page.evaluate(() => document.getElementById('result')!.hidden)) errors.push(`${name}: 결과 화면이 안 뜸`);
  await page.close();
}
// 레이아웃 지표 (FUN §4): 캔버스 세로 점유 · 위아래 빈 띠 · 일시정지 버튼 ∩ 캔버스 위 HUD 띠(캔버스 폭 × 0.085)
const layout: Record<string, unknown> = {};
for (const vp of [{ width: 360, height: 780 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }]) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  await page.goto(url);
  await page.click('#start');
  await page.waitForTimeout(300);
  const m = await page.evaluate(() => {
    const c = document.getElementById('game')!.getBoundingClientRect(), b = document.getElementById('pausebtn')!.getBoundingClientRect(), H = innerHeight;
    const hud = { top: c.top, bottom: c.top + c.width * 0.085, left: c.left, right: c.right };
    const hit = b.right > hud.left && b.left < hud.right && b.bottom > hud.top && b.top < hud.bottom;
    return { fill: c.height / H, topBand: c.top / H, bottomBand: (H - c.bottom) / H, pauseOverHud: hit };
  });
  const r2 = (x: number) => Math.round(x * 100) / 100;
  layout[`${vp.width}x${vp.height}`] = { fill: r2(m.fill), topBand: r2(m.topBand), bottomBand: r2(m.bottomBand), pauseOverHud: m.pauseOverHud };
  await page.close();
}
writeFileSync(join(here, 'reports', 'layout.json'), JSON.stringify(layout, null, 2) + '\n');
console.table(layout);
await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('스크린샷 OK, 콘솔 에러 0');
