/**
 * 스크린샷 (M0): 플레이 빌드를 390px 휴대폰 크기로 열어 시작 → 1판 → 꾹 누름(미리 보기) → 쾅 → 결과를 찍는다 → screens/
 *   npx tsx studio/demolition/shots.ts   (먼저 build.ts)
 */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // 사전 설치된 Playwright (개발 의존성 아님)
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + join(here, '../../web/public/studio/demolition/index.html'));
await page.screenshot({ path: join(out, '0-start.png') });
await page.click('.g-overlay');
await page.waitForTimeout(600);
await page.screenshot({ path: join(out, '1-stage1.png') });
const box = (await page.locator('canvas').boundingBox())!;
// 1판 기둥: x 5칸(12칸 중) 가운데, 땅 위 2칸쯤
const px = box.x + box.width * (5.5 / 12), py = box.y + box.width * (0.95 - 2.5 / 12);
await page.mouse.move(px, py);
await page.mouse.down();
await page.waitForTimeout(500);
await page.screenshot({ path: join(out, '2-preview.png') });
await page.mouse.up();
await page.waitForTimeout(2600);
await page.screenshot({ path: join(out, '3-boom.png') });
await page.waitForTimeout(2200);
await page.screenshot({ path: join(out, '4-result.png') });
// ── 3D 실험 빌드 (C003) ──
const p3 = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
p3.on('pageerror', (e: unknown) => errors.push(String(e)));
p3.on('console', (m: { type(): string; text(): string }) => m.type() === 'error' && errors.push(m.text()));
await p3.goto('file://' + join(here, '../../web/public/studio/demolition/3d.html'));
await p3.waitForTimeout(300);
await p3.screenshot({ path: join(out, '3d-0-start.png') });
const scroll = await p3.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const at = (x: number, y: number, z: number) => p3.evaluate(([a, b, c]: number[]) => (window as any).__d3.screenOf(a, b, c), [x, y, z]) as Promise<[number, number]>;
const hold = async (x: number, y: number, z: number, shot: string) => {
  const [sx, sy] = await at(x, y, z);
  await p3.mouse.move(sx, sy);
  await p3.mouse.down();
  await p3.waitForTimeout(200);
  await p3.screenshot({ path: join(out, shot) });
  await p3.mouse.up();
  await p3.waitForTimeout(100);
};
// 1-1 물탱크 탑: 기둥 꾹 → 떼면 3·2·1 → 쾅 → 결과
await hold(6, 1, 6, '3d-1-tank-hold.png');
await p3.waitForTimeout(1000);
await p3.screenshot({ path: join(out, '3d-2-count.png') });
await p3.waitForTimeout(900);
await p3.screenshot({ path: join(out, '3d-3-boom.png') });
await p3.waitForFunction(() => (window as any).__d3.state().done, null, { timeout: 8000 });
await p3.waitForTimeout(200);
await p3.screenshot({ path: join(out, '3d-4-tank-result.png') });
const st1 = await p3.evaluate(() => (window as any).__d3.state());
await p3.click('#again'); // 다음 판: 1-2 네 다리 망루
await p3.waitForTimeout(200);
await hold(8, 2, 8, '3d-5-dead-tap.png'); // 마루 뒤 귀퉁이: '변화 없음'
await hold(8, 2, 8, '3d-6-untap.png'); // 다시 톡 = 떼기
await hold(6, 0, 6, '3d-7-first-leg.png'); // 앞왼 다리: 빠진 발 ✕
await p3.click('.rot.r');
await p3.waitForTimeout(450);
await p3.screenshot({ path: join(out, '3d-8-rotated.png') });
await p3.click('.rot.l');
await p3.waitForTimeout(450);
const [fx, fy] = await at(8, 0, 6);
await p3.mouse.move(fx, fy);
await p3.mouse.down();
await p3.waitForTimeout(200);
await p3.screenshot({ path: join(out, '3d-9-second-leg.png') }); // 앞오른 다리까지: 앞으로 넘어감 + 착지 칸
await p3.mouse.up();
await p3.waitForFunction(() => (window as any).__d3.state().done, null, { timeout: 8000 });
await p3.waitForTimeout(200);
await p3.screenshot({ path: join(out, '3d-10-result.png') });
console.log('1-1:', JSON.stringify(st1));
const st3 = await p3.evaluate(() => (window as any).__d3.state());
console.log('3D:', JSON.stringify(st3), scroll ? '가로 스크롤 있음 ❌' : '가로 스크롤 없음');
if (scroll || !st3.done) errors.push('3D 검사 실패');
await browser.close();
console.log(errors.length ? `콘솔 에러 ${errors.length}: ${errors.join(' | ')}` : '콘솔 에러 0');
