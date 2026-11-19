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
    await page.waitForTimeout(1200);
    await page.screenshot({ path: join(out, '09-stage1-340.png') });
    continue;
  }
  // ✏️ M2 S3 켜자마자 1-1: 타이틀 없이 바로 판 — 켜고 누를 수 있을 때까지(ms, 페이지 열기부터)
  const ready = await page.evaluate(() => (window as unknown as { __slowdashStarted?: number }).__slowdashStarted ?? -1);
  console.log(`켜고 누를 수 있을 때까지: ${Math.round(ready)}ms`);
  await page.screenshot({ path: join(out, '01-open.png') });
  await page.waitForTimeout(1200);
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
  // 둘째 줄: 가로 넷 — 오너 피드백 '한붓 획': 꾹 누른 채 줄 왼쪽 끝으로 내려가 오른쪽으로 쭉 그은 뒤 떼기
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, '15-move-demo.png') }); // M2 S3: 1-1 둘째 웨이브 손가락 시범(옮겨 서기)
  p = at(0.12, 1.0);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) {
    const q = at(0.12 + (0.78 * i) / 12, 1.0);
    await page.mouse.move(q.x, q.y);
    await page.waitForTimeout(40);
  }
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
{
  // ✏️ S009 가시덤불: 1-3에서 덤불 쪽으로 곧게 그으면 걸리는 덤불이 빨갛게
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark', hasTouch: true });
  page.on('pageerror', (e: unknown) => errors.push(String(e)));
  await page.goto(url + '&stage=3');
  await page.waitForTimeout(3000); // S012: 판 소개 카드가 지나간 뒤(알림 줄이 보이게)
  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x * box.width, y: box.y + y * box.width });
  await page.screenshot({ path: join(out, '11-thorn-idle.png') }); // S010 누르기 전에도 덤불이 보이나
  let p = at(0.5, 1.12);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) ((p = at(0.5 - 0.2 * (i / 8), 1.12 - 0.22 * (i / 8))), await page.mouse.move(p.x, p.y), await page.waitForTimeout(30));
  await page.screenshot({ path: join(out, '10-thorn.png') });
  await page.mouse.up();
  // ✏️ S012 1-2 길잡이: 꺾은 획을 아직 안 그었으면 ㄱ자 길을 손가락이 그려 보인다
  await page.goto(url + '&stage=2');
  await page.waitForTimeout(2600);
  await page.screenshot({ path: join(out, '12-guide.png') });
  // ✏️ M2 S4 판 고르기
  await page.evaluate(() => { for (const [k, v, m] of [['dummy', 3, 3], ['bend', 2, 1], ['sword', 1, 0]] as const) (localStorage.setItem('slowdash:st:' + k, String(v)), localStorage.setItem('slowdash:sm:' + k, String(m))); }); // M2 S5 ㊳ 빠진 별이 보이는지
  await page.click('#pick');
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, '17-picker.png') });
  await page.keyboard.press('Escape');
  // ✏️ M2 S3 새것 카드: 1-6 시작 카드 한 줄
  await page.goto(url + '&stage=6');
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(out, '16-card.png') });
  // ✏️ M2 S1 🍃 시험 판: 잎 너구리를 곧게 겨누면 '휙! 꺾어요'
  await page.goto(url + '&trial=1');
  await page.waitForTimeout(3000);
  {
    const box2 = (await page.locator('canvas').boundingBox())!;
    const at2 = (x: number, y: number) => ({ x: box2.x + x * box2.width, y: box2.y + y * box2.width });
    const a = at2(0.5, 1.15), b = at2(0.62, 0.58);
    await page.mouse.move(a.x, a.y);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) (await page.mouse.move(a.x + ((b.x - a.x) * i) / 6, a.y + ((b.y - a.y) * i) / 6), await page.waitForTimeout(30));
    await page.screenshot({ path: join(out, '13-leaf.png') });
    await page.mouse.up();
    await page.waitForTimeout(1600); // M2 S2: 휙 뒤 손가락 시범
    await page.screenshot({ path: join(out, '14-leaf-demo.png') });
    // ✏️ M2 S7 🎋 2-6 첫 무리(S8 배치): 오른쪽으로 올라가 꺾어 왼쪽으로 대나무까지 — 쓰러질 줄(점선) · 떼면 쓰러져 셋
    await page.goto(url + '&trial=1&stage=16');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: join(out, '22-bamboo-idle.png') });
    {
      const pts = [[0.7, 1.02], [0.86, 0.98], [0.9, 0.92], [0.8, 0.9], [0.68, 0.9], [0.5, 0.9]].map(([x, y]) => at2(x, y)); // S8 첫 무리: 오른쪽에서 꺾어 허 둘 → 대나무 → 왼쪽 둘
      await page.mouse.move(pts[0].x, pts[0].y);
      await page.mouse.down();
      for (const p of pts.slice(1)) (await page.mouse.move(p.x, p.y, { steps: 3 }), await page.waitForTimeout(30));
      await page.screenshot({ path: join(out, '20-bamboo.png') });
      await page.mouse.up();
      await page.waitForTimeout(180);
      await page.screenshot({ path: join(out, '21-bamboo-fall.png') });
    }
    // M2 S4 부엉이: 곧게 두 번 더 휙 → 묻는 카드
    await page.goto(url + '&stage=3&owl=1');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, '18-owl.png') });
    await page.click('[data-owl="1"]');
    await page.waitForTimeout(2600);
    await page.screenshot({ path: join(out, '19-owl-guide.png') });
  }
}
await browser.close();
console.log(`콘솔 에러 ${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''} · 가로 스크롤 ${scroll.length ? scroll.join(', ') : '0'}`);
if (errors.length || scroll.length) process.exitCode = 1;
