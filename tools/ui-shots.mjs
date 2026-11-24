// UI 점검용 화면 찍기. 같은 상황(첫 화면·플레이·패널·변명·보고서·교훈 카드·설정)을 늘 똑같이 찍는다.
//   node tools/ui-shots.mjs <파일 이름 앞말> <출력 폴더> [--port 5410] [--2d] [--en]
// 3D 로 찍으려면 Playwright Chromium 의 소프트웨어 WebGL 을 쓴다(느리다).
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const id = args[0] || 'base';
const out = resolve(args[1] || `/tmp/ui-shots/${id}`);
const port = Number(args[args.indexOf('--port') + 1]) || 5410;
const force2d = args.includes('--2d');
const english = args.includes('--en');
await mkdir(out, { recursive: true });

const server = await startServer({ port, root: ROOT });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (
  await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: english ? 'en-US' : 'ko-KR', hasTouch: true })
).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `${out}/${id}-${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);
const SLOW = force2d ? 1 : 3;

try {
  await page.goto(`http://127.0.0.1:${port}/index.html?debug${force2d ? '&2d' : ''}`);
  await page.waitForSelector('.title .start');
  await wait(1200 * SLOW);
  await shot('1-title');

  await page.click('.title .start', { force: true });
  await page.waitForSelector('.modal-intro');
  for (let i = 0; i < 4; i++) {
    await page.click('.modal-intro .btn.primary', { force: true });
    await wait(80);
  }
  await page.waitForFunction(() => window.__ufo.scene.ufo.mode === 'hover', null, { timeout: 30000 });
  // 플레이 화면: 계기·목표·콤보·시선 예고·혼잣말·안내가 모두 보이는 순간
  await page.evaluate(() => {
    const { game, world, ui } = window.__ufo;
    document.querySelector('.prog-arrive')?.remove();
    const s = game.state;
    s.grant = 1240;
    for (const sp of ['firefly', 'balloon', 'kite']) s.unlocked.specimens[sp] = true;
    s.run.fuel = 64;
    s.run.size = 72;
    s.run.combo = 6;
    s.run.comboT = 60;
    const h = world.humans[0];
    h.state = 'notice';
    h.t = 60;
    h.gx = world.ufoX + 30;
    h.gw = 48;
    ui.say('나는 구름이다…', 60);
    ui.showCoach('gaze');
    game.busy = true; // 이 순간에 멈춘다
  });
  await wait(2500 * SLOW);
  await shot('2-play');

  // 표본 패널
  await page.evaluate(() => {
    window.__ufo.game.busy = false;
    window.__ufo.ui.hideCoach();
  });
  await page.locator('.tab').first().click({ force: true });
  await page.waitForSelector('.sheet.open');
  await wait(900);
  await shot('3-panel');
  await page.locator('.tab').first().click({ force: true });
  await wait(400);

  // 사건 보고서(변명 단계는 건너뛴다)
  await page.evaluate(() => {
    const { game, world } = window.__ufo;
    world.humans[0].state = 'look';
    world.humans[0].t = 60;
    world.humans[0].gx = world.ufoX;
    game.rng = () => 0;
    const sp = world.specimens.find((x) => x.state === 'live' && x.kind === 'dandelion') || world._spawn('dandelion');
    sp.age = 2;
    world.tap(sp.x, sp.y);
  });
  await page.waitForSelector('.modal-excuse, .modal-report', { timeout: 20000 * SLOW });
  await wait(600);
  if (await page.$('.modal-excuse')) {
    await shot('4-excuse');
    await page.click('.modal-excuse .ex-skip', { force: true });
  }
  await page.waitForSelector('.modal-report', { timeout: 20000 * SLOW });
  await wait(1400);
  await shot('5-report');
  await page.click('.modal-report .btn.primary', { force: true });
  // 교훈 카드
  try {
    await page.waitForSelector('.modal-lessons .lcard', { timeout: 6000 * SLOW });
    await page.waitForFunction(() => document.querySelector('.modal-lessons .lcard')?.getAttribute('aria-disabled') === 'false', null, { timeout: 8000 * SLOW });
    await wait(300);
    await shot('6-lessons');
    await page.click('.modal-lessons .lcard', { force: true });
    await page.waitForSelector('.modal-lessons', { state: 'detached', timeout: 8000 * SLOW });
  } catch {
    /* 카드가 없으면 지나간다 */
  }
  await page.waitForFunction(() => window.__ufo.game.phase === 'play' && !window.__ufo.ui.transitioning, null, { timeout: 15000 * SLOW });
  await wait(1500);
  // 설정
  await page.evaluate(() => {
    document.querySelector('.prog-arrive')?.remove();
    for (const m of document.querySelectorAll('.modal-gift .btn.primary')) m.click();
  });
  await wait(500);
  await page.click('.hud .settings-btn', { force: true });
  await page.waitForSelector('.modal-settings');
  await wait(700);
  await shot('7-settings');
} catch (err) {
  errors.push(`중단: ${err.message.split('\n')[0]}`);
  await shot('x-fail').catch(() => {});
}
console.log(errors.length ? errors.join('\n') : `완료: ${out}`);
await browser.close();
server.close();
