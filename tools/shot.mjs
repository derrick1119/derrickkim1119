// 실제 브라우저로 띄워 스크린샷을 찍는다:  node tools/shot.mjs [outDir]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const out = process.argv[2] || 'shots';
const server = await serve(8741);
const browser = await chromium.launch();
const errors = [];

async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8741/index.html');
  await page.waitForTimeout(1200);
  return page;
}

// 스테이지를 열고 고스트 대본을 upto 번째 명령까지 실행한 장면
async function scene(page, id, upto, name, extra) {
  await page.evaluate(async ({ id, upto, extra }) => {
    const L = window.__lamp;
    const { LEVELS } = await import('/js/levels.js');
    const { runGhost } = await import('/tools/ghost-run.mjs');
    const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
    L.play(LEVELS.findIndex((l) => l.id === id));
    runGhost(null, GHOSTS[id], { world: L.world, upto, strict: false });
    if (extra) new Function('w', extra)(L.world);
    L.renderer.snap(L.world.bulb);
  }, { id, upto, extra });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${out}/${name}.png` });
}

{
  const page = await open(1280, 720);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/01-title.png` });
  await page.click('#btnStages'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/02-select.png` });
  await page.click('#screen-select [data-back]');
  await page.click('#btnHow'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/03-how.png` });
  await page.click('#screen-how [data-back]');
  await scene(page, '1-1', 1, '10-1-1-start');
  await scene(page, '1-1', 9, '11-1-1-ledge');
  await scene(page, '1-2', 2, '12-1-2-daybridge');
  await scene(page, '1-2', 5, '13-1-2-dark');
  await scene(page, '1-2', 13, '14-1-2-room');
  await scene(page, '1-3', 15, '15-1-3-pad');
  await scene(page, '1-4', 10, '16-1-4-stairs');
  await scene(page, '2-1', 6, '17-2-1-nightbridge', 'w.bulb.x -= 140;');
  await scene(page, '2-2', 6, '18-2-2-shadow');
  await scene(page, '2-3', 28, '19-2-3-elevator');
  await scene(page, '3-1', 2, '20-3-1-moth', 'w.input.light = true; w.step(1/120); w.input.light = false; for (let i = 0; i < 70; i++) w.step(1/120);');
  await scene(page, '3-2', 9, '21-3-2-platform');
  await scene(page, '3-3', 4, '22-3-3-boss', 'w.boss.x = w.bulb.x - 250;');
  // 클리어 화면
  await page.evaluate(async () => {
    const L = window.__lamp;
    const { runGhost } = await import('/tools/ghost-run.mjs');
    const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
    L.play(0);
    runGhost(null, GHOSTS['1-1'], { world: L.world });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/30-socket.png` });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: `${out}/31-clear.png` });
  await page.context().close();
}
{
  const page = await open(390, 844, { dsf: 2, touch: true });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/40-m-title.png` });
  await scene(page, '1-2', 2, '41-m-play');
  await page.context().close();
}
{
  const page = await open(844, 390, { dsf: 2, touch: true });
  await scene(page, '2-1', 13, '42-m-landscape');
  await page.context().close();
}
await browser.close();
server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('screenshots ok →', out);
