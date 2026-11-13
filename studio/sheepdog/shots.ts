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
/** 완료 기준(🎨 §12-10, C009): HUD·카드·타이틀 DOM에 그림 글자(이모지) 0 */
/** Q7 스포일러: 결과 카드·끝 화면 글에 좌표·짖을 자리 같은 답이 없다 */
const noSpoiler = async (page: any, at: string) => {
  const t: string = await page.evaluate(() => ['#card', '#msg'].map((q) => document.querySelector(q)?.textContent ?? '').join(' '));
  if (/\d\.\d|자리|좌표|여기서 짖/.test(t)) errors.push(`${at}: 결과 글에 답이 보임 — ${t.slice(0, 60)}`);
};
const noEmoji = async (page: any, at: string) => {
  const bad: string = await page.evaluate(() =>
    ['#hudTop', '#hudBot', '#news', '#card', '#overlay', '#retry']
      .map((q) => [...(document.querySelector(q)?.textContent ?? '')].filter((c) => /[\p{Extended_Pictographic}☆★↺↻▶◀]/u.test(c)).join(''))
      .join(''),
  );
  if (bad) errors.push(`${at}: 이모지 ${bad}`);
};
/** AudioContext를 몇 번 만들었나 세는 스크립트 (C010: 첫 입력 전 0, 꺼 두면 0) */
const countAC = () => {
  const w = window as any, A = w.AudioContext;
  w.__acN = 0;
  if (A) w.AudioContext = class extends A { constructor(...a: any[]) { super(...a); w.__acN++; } };
};
/** 캔버스 글자에 그림 글자가 섞였나 모은다 (C010 M1-6 ②: W1 플레이 동안 0) */
const watchCanvasText = () => {
  const w = window as any, P = w.CanvasRenderingContext2D.prototype, seen = (w.__emo = new Set<string>());
  for (const k of ['fillText', 'strokeText']) {
    const f = P[k];
    P[k] = function (this: any, t: string, ...a: any[]) {
      if (/\p{Extended_Pictographic}/u.test(String(t))) seen.add(String(t));
      return f.call(this, t, ...a);
    };
  }
};
const acN = (page: any): Promise<number> => page.evaluate(() => (window as any).__acN);
const st = (page: any, expr: string) => page.evaluate(`(() => { const s = globalThis.__sd.state(); return ${expr}; })()`);
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.addInitScript(countAC);
  await page.addInitScript(watchCanvasText);
  await page.goto(url);
  await page.waitForTimeout(600);
  if ((await acN(page)) !== 0) errors.push(`${name}: 입력 전에 AudioContext를 만듦`);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  await noEmoji(page, `${name}-title`);
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  // 키보드만으로 시작
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(here, 'screens', `${name}-play.png`) });
  await noEmoji(page, `${name}-play`);
  if ((await acN(page)) !== 1) errors.push(`${name}: 시작을 눌렀는데 AudioContext ${await acN(page)}개`);
  // M으로 소리 끔 → 켬 (버튼 aria-pressed)
  await page.keyboard.press('KeyM');
  if ((await page.locator('#sound').getAttribute('aria-pressed')) !== 'false') errors.push(`${name}: M으로 소리가 안 꺼짐`);
  await page.keyboard.press('KeyM');
  if ((await page.locator('#sound').getAttribute('aria-pressed')) !== 'true') errors.push(`${name}: M으로 소리가 안 켜짐`);
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
  await noEmoji(page, `${name}-card`);
  await noSpoiler(page, `${name}-card`);
  if (!(await page.locator('#hudBot').evaluate((e: HTMLElement) => getComputedStyle(e).visibility === 'hidden'))) errors.push(`${name}: 카드가 떴는데 아래 HUD가 보임`);
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
    for (const k of [2, 4, 6, 7]) { // 1-5: 🎨 C014 까만 양 필수 알약·부제 확인
      await page.evaluate((kk: number) => (globalThis as any).__sd.jump(kk), k);
      await page.waitForTimeout(1700);
      await page.screenshot({ path: join(here, 'screens', `${name}-w1-${k + 1}.png`) });
    }
  // 1-4 까만 양이 거꾸로 와서 강아지가 뒤로 폴짝·'?!' 멈춤 순간 (모바일만, C007 → M1-7 ①)
  if (name === 'mobile') {
    await page.evaluate(() => (globalThis as any).__sd.jump(3));
    // 멈춤은 판을 끝내는 짖기(다 들고 까만 양이 거꾸로 온 짖기)에만 온다. 📐 C014부터 1-4는 까만 양까지 넣어야 통과라 그리디 한 수가 그렇다
    let held = false;
    for (let k = 0; k < 5 && !held; k++) {
      await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'aim', null, { timeout: 10_000 });
      const q = await page.evaluate(() => (globalThis as any).__sd.bot()), bb = await page.locator('#game').boundingBox();
      await page.mouse.move(bb.x + q.x * bb.width, bb.y + q.y * bb.height);
      await page.mouse.down();
      await page.waitForTimeout(80);
      await page.mouse.up();
      await page.waitForFunction(() => (globalThis as any).__sd.state().phase !== 'aim', null, { timeout: 3000 });
      const r = await page.waitForFunction(() => { const sd = (globalThis as any).__sd, ph = sd.state().phase; return sd.hold() ? 'hold' : ph === 'aim' || ph === 'result' ? ph : false; }, null, { timeout: 8000, polling: 16 });
      held = (await r.jsonValue()) === 'hold';
      if (!held && (await st(page, 's.phase')) === 'result') break;
    }
    if (held) await page.waitForTimeout(120), await page.screenshot({ path: join(here, 'screens', `${name}-w1-4-come.png`) });
    else errors.push(`${name}: 1-4에서 까만 양 멈춤(폴짝)을 못 찍음`);
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
  // ★2 결과 카드 — 진짜 플레이(PM C008): 1-2에서 첫 멍을 그리디 자리 옆 0.08로 헛짖고, 나머지는 그리디 봇 자리를 진짜로 눌러 깬다 → par 넘김 = ★2
  await page.evaluate(() => (globalThis as any).__sd.jump(1));
  const bark = async (dx: number) => {
    await page.waitForFunction(() => { const s = (globalThis as any).__sd.state(); return s.phase === 'aim' && !s.down; }, null, { timeout: 10_000 });
    const q = await page.evaluate(() => (globalThis as any).__sd.bot()), bb = await page.locator('#game').boundingBox();
    await page.mouse.move(bb.x + (q.x + dx) * bb.width, bb.y + q.y * bb.height);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForFunction(() => { const s = (globalThis as any).__sd.state(); return s.phase !== 'aim' || s.down === false; }, null, { timeout: 5000 });
    await page.waitForTimeout(100);
  };
  await bark(0.08);
  for (let k = 0; k < 8 && (await st(page, 's.phase')) !== 'result'; k++) {
    await page.waitForFunction(() => ['aim', 'result'].includes((globalThis as any).__sd.state().phase), null, { timeout: 10_000 });
    if ((await st(page, 's.phase')) === 'result') break;
    await bark(0);
  }
  await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'result', null, { timeout: 10_000 });
  await page.waitForTimeout(1900);
  if ((await st(page, 's.ok + "," + (s.got === 7)')) !== 'true,false') errors.push(`${name}: 진짜 ★2 카드를 못 만듦`);
  await page.screenshot({ path: join(here, 'screens', `${name}-card-2star.png`) });
  if (!(await page.locator('#card [data-act=retry]').textContent())?.includes('더 따기')) errors.push(`${name}: ★2인데 ☆ 더 따기가 없음`);
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(200);
  if ((await st(page, 's.stage + s.phase')) !== '1aim') errors.push(`${name}: 카드에서 R로 다시 안 됨`);
  // 회색 도장(나눠 모은 ★★★, 📐 C003): 이번엔 ★2인데 예전에 다른 별을 따 둠 → 별은 '예전'으로, 도장은 회색 점선
  await page.evaluate(() => { const sd = (globalThis as any).__sd; sd.jump(2); const s = sd.state(); s.phase = 'result'; s.ok = true; s.got = 3; s.best[2] = 7; s.clearT = s.t; s.pt = 0; });
  await page.waitForTimeout(1600);
  if (!(await page.locator('#card .medal.grey').isVisible())) errors.push(`${name}: 나눠 모은 ★★★인데 회색 도장이 없음`);
  await page.screenshot({ path: join(here, 'screens', `${name}-card-grey.png`) });
  await page.keyboard.press('KeyR');
  await page.waitForTimeout(200);
  // 끝 화면: 1-8을 깬 결과 카드(상태를 놓음)에서 진짜 '끝 ▶' 버튼을 눌러 간다 — 카드가 끝 화면 위에 남지 않는지 (FUN QA C008)
  // 1-8은 박사 봇 자리를 진짜로 눌러 깬다(상태를 놓지 않음, PM C008 → M1-7 ①)
  await page.evaluate(() => (globalThis as any).__sd.jump(7));
  await page.waitForTimeout(300);
  for (let k = 0; k < 12 && (await st(page, 's.phase')) !== 'result'; k++) {
    await page.waitForFunction(() => ['aim', 'result'].includes((globalThis as any).__sd.state().phase), null, { timeout: 15_000 });
    if ((await st(page, 's.phase')) === 'result') break;
    const q = await page.evaluate(() => (globalThis as any).__sd.bot('smart')), bb = await page.locator('#game').boundingBox();
    await page.mouse.move(bb.x + q.x * bb.width, bb.y + q.y * bb.height);
    await page.mouse.down();
    await page.waitForTimeout(80);
    await page.mouse.up();
    await page.waitForTimeout(150);
  }
  await page.waitForFunction(() => (globalThis as any).__sd.state().phase === 'result', null, { timeout: 15_000 });
  if ((await st(page, 's.ok + "," + s.won')) !== 'true,true') errors.push(`${name}: 1-8을 진짜로 못 깸`);
  await page.waitForTimeout(150);
  await page.keyboard.press('Enter'); // 카드가 막 뜬 때 누른 '다음'도 들고 있다가 넘긴다
  await page.waitForTimeout(900);
  if (await page.locator('#overlay').isHidden()) errors.push(`${name}: 끝 화면 안 뜸`);
  if (await page.locator('#card').isVisible()) errors.push(`${name}: 끝 화면 위에 결과 카드가 남음`);
  await page.screenshot({ path: join(here, 'screens', `${name}-end.png`) });
  await noEmoji(page, `${name}-end`);
  await noSpoiler(page, `${name}-end`);
  const emo: string[] = await page.evaluate(() => [...(window as any).__emo]);
  if (emo.length) errors.push(`${name}: 캔버스 글자에 그림 글자 ${emo.join(' | ')}`);
  if (await page.locator('#hudTop').isVisible()) errors.push(`${name}: 끝 화면에 HUD가 남음`);
  await page.close();
}
// 작은 폰(375×667): 타이틀·플레이·결과 카드가 잘리지 않는지 (PM C008 ④)
{
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 });
  page.on('pageerror', (e: Error) => errors.push(`se: ${e.message}`));
  await page.addInitScript(countAC);
  await page.addInitScript(() => { try { localStorage.setItem('sheepdog:mute', '1'); } catch { /* */ } });
  await page.goto(url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', 'se-title.png') });
  const fits = (q: string) => page.evaluate((qq: string) => { const r = document.querySelector(qq)!.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth; }, q);
  if (!(await fits('#start'))) errors.push('se: 시작 버튼이 화면 밖');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(here, 'screens', 'se-play.png') });
  if ((await acN(page)) !== 0) errors.push('se: 소리를 꺼 뒀는데 AudioContext를 만듦');
  if (!(await fits('#hudBot .chips'))) errors.push('se: 별 목표 칩이 화면 밖');
  await page.evaluate(() => { const s = (globalThis as any).__sd.state(); s.phase = 'result'; s.ok = true; s.got = 7; s.best[0] = 7; s.clearT = s.t; s.pt = 0; });
  await page.waitForTimeout(1900);
  await page.screenshot({ path: join(here, 'screens', 'se-card.png') });
  if (!(await fits('#card [data-act=next]'))) errors.push('se: 결과 카드 버튼이 화면 밖');
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push('se: 가로 스크롤');
  await page.close();
}
// 터치 폰(hasTouch): 타이틀 키보드 안내 줄이 숨는다 (C009 → M1-7 ①) · 다크 모드(Q2): 글자가 패널·외곽선 위라 그대로 읽히는지 샷
for (const [tag, opt] of [['touch', { hasTouch: true, isMobile: true }], ['dark', { colorScheme: 'dark' }]] as const) {
  const c = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, ...opt });
  const pg = await c.newPage();
  pg.on('pageerror', (e: Error) => errors.push(`${tag}: ${e.message}`));
  await pg.goto(url);
  await pg.waitForTimeout(500);
  await pg.screenshot({ path: join(here, 'screens', `${tag}-title.png`) });
  if (tag === 'touch' && (await pg.locator('.keys').isVisible())) errors.push('touch: 터치 폰 타이틀에 키보드 안내가 보임');
  await pg.locator('#start').click();
  await pg.waitForTimeout(1200);
  await pg.screenshot({ path: join(here, 'screens', `${tag}-play.png`) });
  await c.close();
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
