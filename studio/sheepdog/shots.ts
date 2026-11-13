/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤·저장소 없는 환경도 검사.
 *   npx tsx studio/sheepdog/shots.ts  → studio/sheepdog/screens/*.png
 */
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/sheepdog/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [];
const st = (page: any, expr: string) => page.evaluate(`(() => { const s = globalThis.__sd.state(); return ${expr}; })()`);
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  // 키보드만으로 시작
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(here, 'screens', `${name}-play.png`) });
  // 첫 판: 양 무리 아래쪽을 꾹 누르고 있기(미리 보기) → 떼기(멍!)
  const box = await page.locator('#game').boundingBox();
  const [px, py] = [box.x + box.width * 0.5, box.y + box.height * 0.5]  // 첫 판 양 무리 바로 아래;
  await page.mouse.move(px, py);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-preview.png`) });
  await page.mouse.up();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(here, 'screens', `${name}-bark.png`) });
  if ((await st(page, 's.S.used + (s.phase === "result" ? 1 : 0)')) === 0) errors.push(`${name}: 눌렀다 떼도 안 짖음`);
  // 판 결과 카드(C008): 1-1 한 번에 ★★★ → 🏅. 저절로 안 넘어가고, 엔터(포커스된 '다음 ▶')로 다음 판
  await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'result', null, { timeout: 5000 });
  await page.waitForTimeout(1900);
  if (await page.locator('#card').isHidden()) errors.push(`${name}: 결과 카드 안 뜸`);
  await page.screenshot({ path: join(here, 'screens', `${name}-card-medal.png`) });
  await page.waitForTimeout(1500);
  if ((await st(page, 's.stage')) !== 0) errors.push(`${name}: 결과 카드에서 저절로 넘어감`);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  if ((await st(page, 's.stage + s.phase')) !== '1aim') errors.push(`${name}: 엔터로 다음 판 안 감`);
  // 키보드로도 짖기: 스페이스 누르고 떼기
  await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'aim', null, { timeout: 10_000 });
  // 스페이스를 떼면 그 자리로 달려간다(짖거나, 아무도 없으면 킁킁) — 어느 쪽이든 강아지가 움직였는지 본다
  const u0 = await st(page, 's.toX + "," + s.toY');
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(300);
  await page.keyboard.up('ArrowLeft');
  await page.keyboard.down('Space');
  await page.waitForTimeout(200);
  await page.keyboard.up('Space');
  await page.waitForTimeout(1500);
  const u1 = await st(page, 's.toX + "," + s.toY');
  if (u1 === u0) errors.push(`${name}: 키보드로 안 짖음`);
  await page.screenshot({ path: join(here, 'screens', `${name}-keyboard.png`) });
  // ↺ 다시: R 키 → 이 판 처음부터 (멍멍 0)
  await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'aim', null, { timeout: 10_000 });
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(150);
  if ((await st(page, 's.S.used')) !== 0) errors.push(`${name}: R로 다시 안 됨`);
  await page.screenshot({ path: join(here, 'screens', `${name}-retry.png`) });
  // 실패 연출: 1-6에서 진짜로 양을 개울에 빠뜨린다(상태 강제 금지, C006) → 같은 판이 1초 안에 다시
  await page.evaluate(() => (globalThis as any).__sd.jump(5));
  await page.waitForTimeout(1800);
  const sp = await page.evaluate(() => (globalThis as any).__sd.splash());
  if (!sp) errors.push(`${name}: 풍덩 자리를 못 찾음`);
  else {
    const bx = await page.locator('#game').boundingBox();
    await page.mouse.move(bx.x + sp.x * bx.width, bx.y + sp.y * bx.height);
    await page.mouse.down();
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'result', null, { timeout: 5000 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: join(here, 'screens', `${name}-fail.png`) });
    if ((await st(page, 's.ok')) !== false) errors.push(`${name}: 풍덩했는데 실패가 아님`);
    await page.waitForTimeout(1200);
    if ((await st(page, 's.phase + s.stage + s.S.used')) !== 'aim50') errors.push(`${name}: 실패 뒤 같은 판으로 안 돌아옴`);
  }
  // W1 새 판 둘러보기 (모바일만): 1-3 클로버 · 1-7 좁은 다리 · 1-8 아침 축제
  if (name === 'mobile')
    for (const k of [2, 6, 7]) {
      await page.evaluate((kk: number) => (globalThis as any).__sd.jump(kk), k);
      await page.waitForTimeout(1700);
      await page.screenshot({ path: join(here, 'screens', `${name}-w1-${k + 1}.png`) });
    }
  // 개울 판 도움 깃발 ①② (모바일만): 1-6에서 한 번 풍덩한 셈 치고 R로 다시
  if (name === 'mobile') {
    await page.evaluate(() => { const sd = (globalThis as any).__sd; sd.jump(5); sd.state().splashes = 1; });
    await page.waitForTimeout(300);
    await page.keyboard.press('KeyR');
    await page.waitForTimeout(500);
    if ((await st(page, 's.flags.length')) !== 2) errors.push(`${name}: 풍덩 뒤 깃발이 안 뜸`);
    await page.screenshot({ path: join(here, 'screens', `${name}-flags.png`) });
  }
  // ★2 결과 카드(모양 확인용 — 한 번에 '다 넣기+꽃밭 밟음'이 되는 자리가 없어 결과 상태를 직접 놓는다): ☆ 더 따기 / 다음, R로 다시
  await page.evaluate(() => { const sd = (globalThis as any).__sd; sd.jump(1); const s = sd.state(); s.phase = 'result'; s.ok = true; s.got = 5; s.best[1] = 5; s.clearT = s.t; s.pt = 0; });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(here, 'screens', `${name}-card-2star.png`) });
  if (!(await page.locator('#card [data-act=retry]').textContent())?.includes('더 따기')) errors.push(`${name}: ★2인데 ☆ 더 따기가 없음`);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(200);
  if ((await st(page, 's.stage + s.phase')) !== '1aim') errors.push(`${name}: 카드에서 R로 다시 안 됨`);
  // 끝 화면: 1-8을 깬 결과 카드(상태를 놓음)에서 진짜 '끝 ▶' 버튼을 눌러 간다 — 카드가 끝 화면 위에 남지 않는지 (FUN QA C008)
  await page.evaluate(() => { const sd = (globalThis as any).__sd; sd.jump(7); const s = sd.state(); s.phase = 'result'; s.ok = true; s.won = true; s.got = 7; s.best[7] = 7; s.clearT = s.t; s.pt = 0; });
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter'); // 카드가 막 뜬 때 누른 '다음'도 들고 있다가 넘긴다
  await page.waitForTimeout(900);
  if (await page.locator('#overlay').isHidden()) errors.push(`${name}: 끝 화면 안 뜸`);
  if (await page.locator('#card').isVisible()) errors.push(`${name}: 끝 화면 위에 결과 카드가 남음`);
  await page.screenshot({ path: join(here, 'screens', `${name}-end.png`) });
  await page.close();
}
// localStorage 막힌 환경
const ctx = await browser.newContext();
await ctx.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
const p = await ctx.newPage();
p.on('pageerror', (e: Error) => errors.push(`nostorage: ${e.message}`));
await p.goto(url);
await p.keyboard.press('Enter');
await p.waitForTimeout(800);
if (await p.locator('#overlay').isVisible()) errors.push('nostorage: 시작 안 됨');
await browser.close();
console.log(errors.length ? `문제 ${errors.length}:\n${errors.join('\n')}` : '콘솔 에러 0 · 가로 스크롤 없음 · 키보드·터치 동작 · 저장소 없이 동작');
process.exitCode = errors.length ? 1 : 0;
