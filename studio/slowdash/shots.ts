/**
 * 스크린샷(390×844 휴대폰) — 플레이 빌드를 실제 브라우저로 열어 타이틀·첫 판·꾹(느린 시간)·떼는 순간·베고 난 뒤·결과를 찍는다.
 *   npx tsx studio/slowdash/build.ts && npx tsx studio/slowdash/shots.ts → studio/slowdash/screens/
 * 콘솔 에러·가로 스크롤(390 · 340)도 함께 잰다. ?seed=1이면 1판은 뒤집히지 않아 허수아비 자리가 정해져 있다.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(here, '../../web/public/studio/slowdash/index.html')).href + '?seed=1';
const browser = await chromium.launch();
const errors: string[] = [], scroll: string[] = [];
for (const [w, scheme] of [[390, 'dark'], [340, 'light']] as const) {
  const page = await browser.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true });
  page.on('pageerror', (e: unknown) => errors.push(String(e)));
  page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForTimeout(300);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sw > 0) scroll.push(`${w}px: ${sw}`);
  if (w !== 390) {
    await page.click('.g-overlay');
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, '09-stage1-340.png') });
    continue;
  }
  await page.screenshot({ path: join(out, '01-title.png') });
  await page.click('.g-overlay');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, '02-stage1.png') });
  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x * box.width, y: box.y + y * box.width });
  const cb = box.y + box.height;
  console.log(`아래 빈 곳(390×844): ${(((844 - cb) / 844) * 100).toFixed(1)}%`);
  // 1판 첫 줄: 허수아비 셋이 닌자 위로 한 줄(0.5, 0.95 · 0.79 · 0.63) → 그 너머를 꾹
  let p = at(0.5, 0.56);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, '03-hold-slow.png') });
  await page.mouse.up();
  await page.waitForTimeout(60);
  await page.screenshot({ path: join(out, '04-release-flash.png') });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, '05-after-cut.png') });
  // 둘째 줄: 가로 넷(0.24~0.76, 1.0) — 닌자는 위쪽에 있으니 아래로 내려가 옆으로 긋기는 두 번에 나눠서
  await page.waitForTimeout(1500);
  p = at(0.12, 1.0);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(300);
  await page.mouse.up();
  await page.waitForTimeout(900);
  p = at(0.9, 1.0);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, '06-hold-row.png') });
  await page.mouse.up();
  await page.waitForTimeout(120);
  await page.screenshot({ path: join(out, '07-row-cut.png') });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(out, '08-later.png') });
  // 키보드만으로: 스페이스 눌렀다 떼기
  await page.locator('canvas').focus();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowUp');
  await page.keyboard.down(' ');
  await page.waitForTimeout(300);
  await page.keyboard.up(' ');
  await page.waitForTimeout(300);
}
await browser.close();
console.log(`콘솔 에러 ${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''} · 가로 스크롤 ${scroll.length ? scroll.join(', ') : '0'}`);
if (errors.length || scroll.length) process.exitCode = 1;
