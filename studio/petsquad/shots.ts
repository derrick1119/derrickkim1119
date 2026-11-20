/**
 * 스크린샷(390×844 휴대폰) — 플레이 빌드를 실제 브라우저로 열어 첫 화면·첫 톡(쿵)·합체·싸움·뒤 판을 찍는다.
 *   npx tsx studio/petsquad/build.ts && npx tsx studio/petsquad/shots.ts → studio/petsquad/screens/
 * 콘솔 에러·가로 스크롤(390 · 340)·키보드(숫자 1로 카드 사기)도 함께 잰다. 실패하면 종료 코드 1.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { snapshots } from './funqa.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const base = pathToFileURL(join(here, '../../web/public/studio/petsquad/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [], scroll: string[] = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const open = async (w: number, scheme: string, qs: string): Promise<any> => {
  const page = await browser.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme });
  page.on('pageerror', (e: unknown) => errors.push(String(e)));
  page.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(base + qs);
  await page.waitForTimeout(300);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (sw > 0) scroll.push(`${w}px: ${sw}`);
  return page;
};
// game.ts 자리(가로 폭 단위): 카드 x .175/.5/.825 · y 1.07 · 싸움! (.645, 1.262)
const page = await open(390, 'light', '?seed=1');
const box = (await page.locator('canvas').boundingBox())!;
const tap = async (x: number, y: number) => {
  await page.mouse.click(box.x + x * box.width, box.y + y * box.width);
  await page.waitForTimeout(120);
};
console.log(`아래 빈 곳(390×844): ${(((844 - box.y - box.height) / 844) * 100).toFixed(1)}%`);
await page.waitForTimeout(900);
await page.screenshot({ path: join(out, '01-open.png') });
await tap(0.175, 1.07);
await page.waitForTimeout(60);
await page.screenshot({ path: join(out, '02-first-tap.png') });
await page.waitForTimeout(500);
await tap(0.5, 1.07);
await page.waitForTimeout(150);
await page.screenshot({ path: join(out, '03-second-tap.png') });
await tap(0.825, 1.07);
await page.waitForTimeout(400);
await page.screenshot({ path: join(out, '04-shop-done.png') });
await tap(0.645, 1.262);
await page.waitForTimeout(1500);
await page.screenshot({ path: join(out, '05-fight.png') });
await page.waitForTimeout(3500);
await page.screenshot({ path: join(out, '06-after-fight.png') });
await page.close();
// 뒤 판(큰 전투): 4판 · 7판(곰 우두머리) — 잘하는 봇이 시드 2에서 그 판에 처음 닿았을 때의 군단·금화로(✏️ M1 S1 · 🧪 M0 보완점 8)
const snaps = snapshots(2);
for (const st of [4, 7]) {
  const sn = snaps[st - 1]!, bq = sn.board.map((b) => (b ? b[0] + b[1] : '-')).join(',');
  const p = await open(390, 'light', `?seed=2&stage=${st}&board=${bq}&coins=${sn.coins}`);
  const b = (await p.locator('canvas').boundingBox())!;
  await p.waitForTimeout(800);
  await p.screenshot({ path: join(out, `0${st === 4 ? 7 : 8}-stage${st}-shop.png`) });
  await p.mouse.click(b.x + 0.645 * b.width, b.y + 1.262 * b.width);
  await p.waitForTimeout(2600);
  await p.screenshot({ path: join(out, `0${st === 4 ? 7 : 8}-stage${st}-fight.png`) });
  await p.close();
}
// 340px · 다크 — 가로 스크롤 · 키보드 숫자 1
const k = await open(340, 'dark', '?seed=1');
await k.waitForTimeout(600);
await k.keyboard.press('1');
await k.waitForTimeout(300);
await k.screenshot({ path: join(out, '09-340-key1.png') });
await k.close();
await browser.close();
console.log(`콘솔 에러 ${errors.length}${errors.length ? ' — ' + errors.slice(0, 3).join(' | ') : ''} · 가로 스크롤 ${scroll.length ? scroll.join(', ') : '0'}`);
if (errors.length || scroll.length) process.exitCode = 1;
