/**
 * 스크린샷 (M0): 플레이 빌드를 390px 휴대폰 크기로 열어 시작 → 1판 → 꾹 누름(미리 보기) → 쾅 → 결과를 찍는다 → screens/
 *   npx tsx studio/demolition/shots.ts   (먼저 build.ts)
 */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // 사전 설치된 Playwright (개발 의존성 아님)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + join(here, '../../web/public/studio/demolition/2d.html'));
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
const bitsMax = await p3.evaluate(() => (window as any).__d3.state().bitsMax);
console.log('쾅 파편', bitsMax, bitsMax >= 8 ? '✅ (≥ 8)' : '❌');
if (bitsMax < 8) errors.push('쾅 파편 < 8');
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
const st2 = await p3.evaluate(() => (window as any).__d3.state());
// 1-4 예비 폭약 창고(C009 📐 1안): 앞오른 다리 꾹 → 붙이면 손잡이 '★☆☆ 🥀' → 뒤왼 나무 기둥 꾹 → 손잡이 톡 → ★★★ 주저앉음
await p3.click('#again');
await p3.waitForTimeout(200);
await hold(8, 0, 6, '3d-11-save-hold.png');
await p3.waitForTimeout(700); // 손잡이 통통(0.6초)이 끝난 뒤
await p3.screenshot({ path: join(out, '3d-12-handle.png') });
await hold(6, 1, 8, '3d-13-save-second.png');
const hv = await p3.evaluate(() => !(document.querySelector('.handle') as HTMLButtonElement).hidden);
if (!hv) errors.push('1-4 손잡이가 안 보임');
await p3.click('.handle');
await p3.waitForFunction(() => (window as any).__d3.state().done, null, { timeout: 8000 });
await p3.waitForTimeout(200);
await p3.screenshot({ path: join(out, '3d-14-save-result.png') });
const st4 = await p3.evaluate(() => (window as any).__d3.state());
console.log('1-4 손잡이 쾅:', JSON.stringify(st4));
console.log('1-1:', JSON.stringify(st1), '· 1-2:', JSON.stringify(st2));
const st3 = st2;
console.log('3D:', JSON.stringify(st3), scroll ? '가로 스크롤 있음 ❌' : '가로 스크롤 없음');
if (scroll || !st3.done) errors.push('3D 검사 실패');
// ── 성능(FUN v1.3: 판마다 쾅 장면과 말풍선 꾹 중 최악): DPR 3 휴대폰 · CPU 4배 느림 · 1-2 ──
const pf = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
const cdp = await pf.context().newCDPSession(pf);
await pf.goto('file://' + join(here, '../../web/public/studio/demolition/3d.html'));
const atF = (x: number, y: number, z: number) => pf.evaluate(([a, b, c]: number[]) => (window as any).__d3.screenOf(a, b, c), [x, y, z]) as Promise<[number, number]>;
const frames = async (n: number) => {
  await pf.evaluate(`window.__f = []; { let last = performance.now(); function f(t) { window.__f.push(t - last); last = t; if (window.__f.length < ${n}) requestAnimationFrame(f); } requestAnimationFrame(f); }`);
};
const p95of = async () => {
  const f: number[] = (await pf.evaluate(() => (window as any).__f)).slice(5).sort((a: number, b: number) => a - b);
  return { n: f.length, med: f[Math.floor(f.length / 2)], p95: f[Math.floor(f.length * 0.95)], top: f.slice(-8).map((x) => Math.round(x)) };
};
// 1-1을 깨고 1-2로
{ const [sx, sy] = await atF(6, 0, 6); await pf.mouse.click(sx, sy); }
await pf.waitForFunction(() => (window as any).__d3.state().done, null, { timeout: 10000 });
await pf.click('#again');
await pf.waitForTimeout(200);
{ const [sx, sy] = await atF(6, 0, 6); await pf.mouse.click(sx, sy); }
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
// ⓪ 가만히(비교용)
await frames(130);
await pf.waitForTimeout(2600);
const idleF = await p95of();
console.log('가만히 p95', idleF.p95.toFixed(1), '가장 긴', idleF.top.join(' '));
// ① 말풍선 꾹: 둘째 다리를 2.5초 누르고 있는 동안
const [hx, hy] = await atF(8, 0, 6);
await pf.mouse.move(hx, hy);
await pf.mouse.down();
await frames(130);
await pf.waitForTimeout(2600);
const holdF = await p95of();
// ② 쾅: 떼는 순간부터 결과까지
await frames(400);
await pf.mouse.up();
await pf.waitForFunction(() => (window as any).__d3.state().done, null, { timeout: 30000 });
const boom = await p95of();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
const worst = Math.max(holdF.p95, boom.p95);
console.log('꾹 프레임 가장 긴 8개', holdF.top.join(' '), '· 쾅', boom.top.join(' '));
console.log(`성능 DPR 3 · CPU ×4 · 1-2: 말풍선 꾹 p95 ${holdF.p95.toFixed(1)}ms(중앙 ${holdF.med.toFixed(1)}) · 쾅 p95 ${boom.p95.toFixed(1)}ms(중앙 ${boom.med.toFixed(1)}, ${boom.n}프레임) → 최악 ${worst.toFixed(1)} (기준 ≤ 33)`);
if (worst > 33) errors.push('성능 p95 > 33ms');
writeFileSync(join(here, 'reports', 'perf.json'), JSON.stringify({ at: 'C009', dpr: 3, cpu: 4, hold: holdF, boom, worst }, null, 1) + '\n');
await browser.close();
console.log(errors.length ? `콘솔 에러 ${errors.length}: ${errors.join(' | ')}` : '콘솔 에러 0');
