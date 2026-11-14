/**
 * 확인용 스크린샷 (Playwright, 사전 설치된 Chromium): 390px 모바일 · 데스크톱. 콘솔 에러·가로 스크롤·키보드 플레이도 검사.
 *   npx tsx studio/duckbath/shots.ts  → studio/duckbath/screens/*.png  (문제가 있으면 종료 코드 1)
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SLOTS, STAGES } from './game.ts';
import { OLD_IDS } from './save.ts';

const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any }; // eslint-disable-line
const here = import.meta.dirname, url = pathToFileURL(join(here, '../../web/public/studio/duckbath/index.html')).href;
mkdirSync(join(here, 'screens'), { recursive: true });
const browser = await chromium.launch();
const errors: string[] = [];
const st = (page: any) => page.evaluate(() => { const s = (globalThis as any).__duck.state(); return { t: s.t, used: s.used, stage: s.stage, running: (globalThis as any).__duck.running() }; });
const crisisShot = async (page: any, file: string, label: string) => {
  // D009 황금 꼴찌 위기(ART 12장): 보통 오리 한 마리만 남기고 둥지에 → 주황 고리·왕관·말풍선 '나 먼저!'와 칩 '👑 꼴찌 될라!'
  // 🧪 D009: 위기가 실제로 쓸모 있게 오래 나는 3-2에서 찍는다(1-1은 대개 순간)
  await page.evaluate((i: number) => (globalThis as any).__duck.jump(i), STAGES.findIndex((d) => d.id === '3-2'));
  await page.waitForTimeout(300);
  await page.evaluate(() => { const s = (globalThis as any).__duck.state(); s.objs.filter((o: any) => o.k === 0).slice(1).forEach((o: any) => (o.st = 0)); });
  await page.waitForTimeout(450);
  const cr = await page.evaluate(() => (globalThis as any).__duck.state().crisisT);
  await page.screenshot({ path: join(here, 'screens', file) });
  if (!(cr >= 0)) errors.push(`${label}: 황금 꼴찌 위기가 안 켜짐 (crisisT ${cr})`);
};
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]] as const) {
  // D001 FUN QA: 모바일은 터치 기기로 흉내 내야 시작 카드가 터치 안내를 보인다
  const page = await browser.newPage({ viewport: vp, deviceScaleFactor: 1, ...(name === 'mobile' ? { hasTouch: true, isMobile: true } : {}) });
  page.on('console', (m: any) => m.type() === 'error' && errors.push(`${name}: ${m.text()}`));
  page.on('pageerror', (e: Error) => errors.push(`${name}: ${e.message}`));
  await page.goto(url);
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-title.png`) });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) errors.push(`${name}: 가로 스크롤`);
  // 터치: 시작 → 물 가운데 아래쪽을 꾹(미리 보기) → 떼기(찰박)
  // D006: 처음 온 사람은 시작 카드 없이 바로 1판 — 카드가 있으면(다녀간 사람이 아니면 없어야 함) 누른다
  if (await page.locator('.g-overlay:not([hidden])').count()) await page.click('.g-overlay');
  if (!(await st(page)).running) errors.push(`${name}: 처음 온 사람이 바로 1판에 들어가지 않음`);
  await page.waitForTimeout(1600);
  const box = await page.locator('.g-canvas').boundingBox();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.62);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-aim.png`) });
  await page.mouse.up();
  await page.waitForTimeout(350);
  await page.screenshot({ path: join(here, 'screens', `${name}-splash.png`) });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(here, 'screens', `${name}-after.png`) });
  if ((await st(page)).used < 1) errors.push(`${name}: 터치로 찰박이 안 됨`);
  // D004 결과 카드: 1판을 처음부터 — 오리 무리 한가운데를 톡(판 질문대로) → 별 카드 → '다음 목욕'
  const D = '(globalThis as any).__duck';
  await page.evaluate(() => (globalThis as any).__duck.jump(0));
  await page.waitForTimeout(400);
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.476);
  await page.waitForSelector('.card:not([hidden])', { timeout: 20_000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(here, 'screens', `${name}-stars.png`) });
  if (!(await page.locator('.card.win').count())) errors.push(`${name}: 1판 가운데 톡이 결과 카드가 아님`);
  // D006 QC: 카드 버튼은 엄지로 눌린다(≥ 44px)
  const small = await page.evaluate(() => [...document.querySelectorAll('.card button')].map((b) => b.getBoundingClientRect()).filter((r) => r.height < 44 || r.width < 44).length);
  if (small) errors.push(`${name}: 결과 카드 버튼 ${small}개가 44px보다 작음`);
  const ch = (await page.locator('.card').boundingBox())?.height ?? 0;
  if (ch > 190) errors.push(`${name}: 결과 카드 높이 ${Math.round(ch)}px > 190 (🧪 D005 차단)`);
  else {
    await page.click('.card .btn');
    await page.waitForTimeout(200);
    if ((await st(page)).stage !== 1) errors.push(`${name}: '다음 목욕'을 눌러도 2판이 아님`);
  }
  // D005 실패 카드(실제 플레이, 연출 없음): 3판에서 배수구 바깥쪽 같은 자리만 계속 톡 → 톡을 다 쓰면 원인 카드 → R로 같은 판 다시
  await page.evaluate(() => (globalThis as any).__duck.jump(2));
  await page.waitForTimeout(300);
  for (let k = 0; k < 14 && !(await page.locator('.card:not([hidden])').count()); k++) {
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * ((0.36 + 0.3 * 0.66) / 1.52));
    await page.waitForTimeout(1500);
  }
  await page.waitForSelector('.card:not([hidden])', { timeout: 20_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(here, 'screens', `${name}-fail.png`) });
  if (!(await page.locator('.card.lose').count())) errors.push(`${name}: 3판 같은 자리 톡이 실패 카드가 아님`);
  await page.keyboard.press('r');
  await page.waitForTimeout(200);
  const af = await st(page);
  if (!af.running || af.stage !== 2 || !(await page.locator('.card').isHidden())) errors.push(`${name}: R로 같은 판 다시가 아님 ${JSON.stringify(af)}`);
  // D004 ↺2 손가락: 5판을 두 번 넘게 실패한 상태로 다시 시작
  await page.evaluate(() => { const d = (globalThis as any).__duck; d.jump(4); d.state().stageTries = 2; });
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(here, 'screens', `${name}-hint.png`) });
  void D;
  await crisisShot(page, `${name}-crisis.png`, name);
  // D013 💤 잠꾸러기(CONTENT §2 그림 단서): 감은 눈·나이트캡·Z z — 2-7 시작 직후
  if (STAGES.some((d) => d.id === '2-7')) {
    await page.evaluate((i: number) => (globalThis as any).__duck.jump(i), STAGES.findIndex((d) => d.id === '2-7'));
    await page.waitForTimeout(700);
    const zz = await page.evaluate(() => (globalThis as any).__duck.state().objs.filter((o: any) => o.zz).length);
    await page.screenshot({ path: join(here, 'screens', `${name}-sleepy.png`) });
    if (!(zz > 0)) errors.push(`${name}: 2-7에 자는 오리가 없음`);
  }
  // D015 (🧪 D014 보완 8): 2-10 큰 판 · 3-1 상어 소개 시작과 첫 톡 '퐁! 상어 깼다' · 3-5 🎈 — 모바일만
  if (name === 'mobile') {
    const scene = async (id: string, file: string) => {
      if (!STAGES.some((d) => d.id === id)) return false;
      await page.evaluate((i: number) => (globalThis as any).__duck.jump(i), STAGES.findIndex((d) => d.id === id));
      await page.waitForTimeout(700);
      await page.screenshot({ path: join(here, 'screens', file) });
      return true;
    };
    await scene('2-10', 'mobile-2-10.png');
    if (await scene('3-1', 'mobile-shark-intro.png')) {
      const cb = await page.locator('.g-canvas').boundingBox();
      await page.mouse.move(cb.x + cb.width * 0.3, cb.y + cb.height * 0.75);
      await page.mouse.down();
      await page.mouse.up();
      await page.waitForTimeout(180);
      await page.screenshot({ path: join(here, 'screens', 'mobile-pong.png') });
      if (!(await page.evaluate(() => (globalThis as any).__duck.state().awake))) errors.push('mobile: 3-1 첫 톡에 상어가 안 깸');
    }
    if (await scene('3-5', 'mobile-balloon.png') && !(await page.evaluate(() => (globalThis as any).__duck.state().L.balloons.length))) errors.push('mobile: 3-5에 물풍선이 없음');
    if (await scene('3-7', 'mobile-chicks.png') && !(await page.evaluate(() => (globalThis as any).__duck.state().objs.some((o: any) => o.lead >= 0)))) errors.push('mobile: 3-7에 아기 오리가 없음'); // D016 🐥
  }
  // D011 🎨 13장 ③: 황금을 물 위에 둔 채 깨면 결과 카드 셋째 줄이 '황금이 꼴찌였어요'
  await page.evaluate(() => (globalThis as any).__duck.jump(0));
  await page.waitForTimeout(300);
  // 🧪 D011: 카드가 판과 맞게 — 톡 1번을 쓴 뒤 보통 오리만 둥지에(황금은 물 위 = 꼴찌)
  await page.evaluate(() => { const s = (globalThis as any).__duck.state(); s.used = 1; s.taps -= 1; s.objs.filter((o: any) => o.k === 0).forEach((o: any) => (o.st = 0)); });
  await page.waitForSelector('.card:not([hidden])', { timeout: 10_000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(here, 'screens', `${name}-gold-last.png`) });
  const gl = await page.evaluate(() => document.querySelector('.card li.gold b')?.textContent ?? '');
  if (gl !== '황금이 꼴찌였어요') errors.push(`${name}: 황금 꼴찌 카드 문장이 안 뜸 (${gl})`);
  const gh = (await page.locator('.card').boundingBox())?.height ?? 0;
  if (gh > 190) errors.push(`${name}: 황금 꼴찌 결과 카드 높이 ${Math.round(gh)}px > 190`);
  // D005 판 고르기: 1판을 깼으니 2판까지 열려 있다 → 2판 누르면 2판 시작
  await page.evaluate(() => (globalThis as any).__duck.levels());
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(here, 'screens', `${name}-levels.png`) });
  const smallLv = await page.evaluate(() => [...document.querySelectorAll('.lv')].filter((b) => b.getBoundingClientRect().height < 44).length);
  if (smallLv) errors.push(`${name}: 판 칸 ${smallLv}개가 44px보다 작음`);
  const opened = await page.locator('.lv:not([disabled])').count();
  if (opened < 2) errors.push(`${name}: 1판을 깼는데 2판이 안 열림 (${opened})`);
  else {
    await page.locator('.lv:not([disabled])').nth(1).click();
    await page.waitForTimeout(200);
    const lv = await st(page);
    if (!lv.running || lv.stage !== 1) errors.push(`${name}: 판 고르기에서 2판이 안 시작됨 ${JSON.stringify(lv)}`);
  }
  // 키보드만: 새로 열어 Enter로 시작 → 화살표로 커서 → 스페이스 꾹·떼기
  await page.goto(url);
  await page.waitForTimeout(300);
  // D006: 다녀간 사람은 시작 카드 없이 판 고르기가 바로 뜬다
  if (await page.locator('.g-overlay:not([hidden])').count()) {
    await page.focus('.g-overlay');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
  }
  // D005: 판 고르기 — 포커스된 판(다음 판)을 Enter로
  if (await page.locator('.levels:not([hidden])').count()) {
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    if (!(await st(page)).running) errors.push(`${name}: 판 고르기에서 Enter로 시작 안 됨`);
  }
  await page.waitForTimeout(1300);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(250);
  await page.keyboard.up('ArrowDown');
  await page.keyboard.down(' ');
  await page.waitForTimeout(300);
  await page.keyboard.up(' ');
  await page.waitForTimeout(400);
  const k = await st(page);
  if (!k.running || k.used < 1) errors.push(`${name}: 키보드로 찰박이 안 됨 ${JSON.stringify(k)}`);
  await page.close();
}
// D007: 옛 번호 저장(ver 1)을 가진 사람 — 판 id로 옮겨져 욕실별 판 고르기에 별이 그대로 (옛 8판 비누 = 2-9)
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await mctx.addInitScript(() => { if (!sessionStorage.getItem('seeded')) (sessionStorage.setItem('seeded', '1'), localStorage.setItem('duckbath.v1', JSON.stringify({ ver: 1, best: [3, 3, 2, 3, 2, 1, 0, 2], open: 8 }))); });
const mp = await mctx.newPage();
mp.on('pageerror', (e: Error) => errors.push(`migrate: ${e.message}`));
await mp.goto(url);
await mp.waitForTimeout(400);
await mp.screenshot({ path: join(here, 'screens', 'mobile-levels-worlds.png') });
const mig = await mp.evaluate(() => ({
  worlds: document.querySelectorAll('.levels .world').length,
  tiles: document.querySelectorAll('.levels .lv').length,
  open: document.querySelectorAll('.lv:not([disabled])').length,
  soap: document.querySelector('.lv[aria-label^="할머니 댁 욕조 2-9"]')?.textContent ?? '',
  hscroll: document.documentElement.scrollWidth > innerWidth,
  saved: JSON.parse(localStorage.getItem('duckbath.v1') ?? '{}').ver,
}));
// 만든 판이 있는 줄(5칸)만 보인다 — 판이 늘면 기대값도 판 데이터에서 (D009)
const rowsShown = [1, 2, 3].reduce((a, w) => a + [0, 5].filter((r) => STAGES.some((d) => { const [dw, k] = d.id.split('-').map(Number); return dw === w && k > r && k <= r + 5; })).length, 0) * 5;
if (mig.worlds !== 3 || mig.tiles !== rowsShown) errors.push(`migrate: 욕실 3개 · 만든 판이 있는 줄만 ${rowsShown}칸이 아님 ${JSON.stringify(mig)} (SLOTS ${SLOTS})`);
// D015: 열린 판 = 옛 저장에서 깬 판(OLD_IDS 중 별 > 0) 가운데 놀이 순서로 가장 뒤 판의 다음 판까지 — 예전 '= 판 수'는 3-2가 끝에서 둘째였던 우연
const oldBest = [3, 3, 2, 3, 2, 1, 0, 2], lastOld = Math.max(...OLD_IDS.filter((_, i) => oldBest[i] > 0).map((id) => STAGES.findIndex((d) => d.id === id)));
const openWant = Math.min(STAGES.length, lastOld + 2);
if (mig.open !== openWant || !mig.soap.includes('★★☆') || mig.saved !== 2) errors.push(`migrate: 옛 저장 이전이 틀림 ${JSON.stringify(mig)} (기대 열린 판 ${openWant})`);
if (mig.hscroll) errors.push('migrate: 판 고르기 가로 스크롤');
await mp.evaluate(() => document.querySelector('.levels')!.scrollTo(0, 9999));
await mp.waitForTimeout(150);
await mp.screenshot({ path: join(here, 'screens', 'mobile-levels-worlds-bottom.png') });
// 키보드: 아래 화살표로 다음 욕실로 건너간다(잠긴 칸은 건너뜀)
await mp.focus('.lv[data-i="0"]');
await mp.keyboard.press('ArrowDown');
await mp.keyboard.press('ArrowDown');
const kf = await mp.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute('aria-label') ?? '');
if (!kf.startsWith('할머니 댁 욕조 2-1')) errors.push(`migrate: 아래 화살표가 다음 욕실로 안 감 (${kf})`);
await mctx.close();
// D009 동작 줄이기(prefers-reduced-motion): 왕관 회전 0 · 고리 알파 고정 (ART 12장 ④)
const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
const rp = await rctx.newPage();
rp.on('pageerror', (e: Error) => errors.push(`calm: ${e.message}`));
await rp.goto(url);
await rp.waitForTimeout(300);
if (!(await rp.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))) errors.push('calm: reduced-motion 흉내가 안 됨');
await crisisShot(rp, 'mobile-crisis-calm.png', 'calm');
await rctx.close();
// localStorage가 막힌 환경에서도 시작된다
const ctx = await browser.newContext();
await ctx.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } }));
const p2 = await ctx.newPage();
p2.on('pageerror', (e: Error) => errors.push(`nostorage: ${e.message}`));
await p2.goto(url);
if (await p2.locator('.g-overlay:not([hidden])').count()) await p2.click('.g-overlay');
await p2.waitForTimeout(400);
if (!(await st(p2)).running) errors.push('nostorage: 시작 안 됨');
await browser.close();
console.log(errors.length ? `문제 ${errors.length}건:\n${errors.join('\n')}` : '스크린샷 OK · 콘솔 에러 0 · 가로 스크롤 없음 · 터치·키보드·저장소 없음 모두 동작');
process.exit(errors.length ? 1 : 0);
