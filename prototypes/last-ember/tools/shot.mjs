// 실제 브라우저로 띄워 스크린샷을 찍는다:  node tools/shot.mjs [outDir]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const out = process.argv[2] || 'shots';
const server = await serve(8731);
const browser = await chromium.launch();
const errors = [];

async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8731/index.html');
  await page.waitForTimeout(1500);
  return page;
}

// 봇처럼 조금 움직여 장면을 만든다
async function play(page, seconds, fn) {
  await page.evaluate(async ({ seconds, fn }) => {
    const L = window.__lamp;
    const f = new Function('g', 't', fn || '');
    const t0 = performance.now();
    await new Promise((res) => {
      const iv = setInterval(() => {
        const g = L.game, t = (performance.now() - t0) / 1000;
        if (g.state === 'levelup') { document.querySelector('#cards .card')?.click(); }
        f(g, t);
        if (t > seconds) { clearInterval(iv); res(); }
      }, 50);
    });
  }, { seconds, fn });
}

{
  const page = await open(1280, 720);
  await page.screenshot({ path: `${out}/01-title.png` });
  await page.click('#btnHow'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/02-how.png` });
  await page.click('#screen-how [data-back]');
  await page.click('#btnWorkshop'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/03-workshop.png` });
  await page.click('#screen-workshop [data-back]');
  await page.click('#btnStart');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/04-start.png` });
  // 첫 가로등으로 걸어간다
  // 키보드로 첫 가로등까지 걸어간다
  for (let i = 0; i < 80; i++) {
    const v = await page.evaluate(() => { const g = window.__lamp.game, L = g.lamps[0]; return { dx: L.x - g.p.x, dy: L.y + 22 - g.p.y, lit: L.lit }; });
    for (const [k, on] of [['d', v.dx > 12], ['a', v.dx < -12], ['s', v.dy > 12], ['w', v.dy < -12]]) { if (on) await page.keyboard.down(k); else await page.keyboard.up(k); }
    if (v.lit) break;
    if (i === 30) await page.screenshot({ path: `${out}/05-lamp-igniting.png` });
    await page.waitForTimeout(60);
  }
  for (const k of ['w', 'a', 's', 'd']) await page.keyboard.up(k);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/05-lamp.png` });
  // 빠르게 진행시켜 중반 장면을 만든다
  await page.evaluate(() => {
    const g = window.__lamp.game;
    g.p.inv = 9999;
    for (let i = 0; i < 60 * 150; i++) {
      if (g.state === 'levelup') { g.choose(0); continue; }
      g.input.mx = Math.cos(i / 300); g.input.my = Math.sin(i / 300);
      g.update(1 / 60); g.events.length = 0;
    }
    g.p.inv = 0;
  });
  await page.waitForTimeout(700);
  if (await page.locator('#overlay-level:not(.hidden)').count()) {
    await page.screenshot({ path: `${out}/06-levelup.png` });
    await page.waitForTimeout(500);
    await page.click('#cards .card');
  }
  await page.keyboard.down('d');
  await play(page, 2.5, `g.p.inv = 1;`);
  await page.screenshot({ path: `${out}/07-mid-light.png` });
  await page.keyboard.up('d');
  await page.keyboard.down('a');
  await page.evaluate(() => { window.__lamp.game.input.toggle = true; });
  await play(page, 1.8, `g.p.inv = 1;`);
  console.log('dark?', await page.evaluate(() => !window.__lamp.game.p.lit));
  await page.screenshot({ path: `${out}/08-mid-dark.png` });
  await play(page, 1.9, `g.p.inv = 1;`);
  await page.keyboard.up('a');
  await page.keyboard.press('Space');
  await page.waitForTimeout(130);
  console.log('lit again?', await page.evaluate(() => window.__lamp.game.p.lit));
  await page.screenshot({ path: `${out}/09-flare.png` });
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/10-pause.png` });
  await page.keyboard.press('Escape');
  // 월식
  await page.evaluate(() => {
    const g = window.__lamp.game;
    g.p.inv = 9999;
    while (!g.boss && g.state !== 'dead') {
      if (g.state === 'levelup') { g.choose(0); continue; }
      g.input.mx = Math.cos(g.t / 5); g.input.my = Math.sin(g.t / 5);
      g.update(1 / 60); g.events.length = 0;
    }
    g.boss.x = g.p.x + 230; g.boss.y = g.p.y - 60; g.boss.shieldCd = 0.5;
  });
  await play(page, 2.2, `g.p.inv = 1; g.input.mx = 0; g.input.my = 0;`);
  if (await page.locator('#overlay-level:not(.hidden)').count()) { await page.waitForTimeout(450); await page.click('#cards .card'); await page.waitForTimeout(300); }
  await page.screenshot({ path: `${out}/11-boss.png` });
  // 사망 → 결과
  await page.evaluate(() => { const g = window.__lamp.game; g.p.inv = 0; g.p.revives = 0; g.p.oil = 1; });
  await play(page, 6, `g.p.inv = Math.min(g.p.inv, 0); g.input.mx = 0; g.input.my = 0; if (g.state === 'playing') g.p.oil = Math.min(g.p.oil, 1);`);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/12-result.png` });
  await page.context().close();
}

{
  // 휴대폰 세로 화면
  const page = await open(390, 844, { dsf: 2, touch: true });
  await page.screenshot({ path: `${out}/20-m-title.png` });
  await page.tap('#btnStart');
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const g = window.__lamp.game;
    g.p.inv = 9999;
    for (let i = 0; i < 60 * 120; i++) {
      if (g.state === 'levelup') { g.choose(0); continue; }
      g.input.mx = Math.cos(i / 300); g.input.my = Math.sin(i / 300);
      g.update(1 / 60); g.events.length = 0;
    }
    g.p.inv = 0;
  });
  await page.waitForTimeout(600);
  if (await page.locator('#overlay-level:not(.hidden)').count()) {
    await page.screenshot({ path: `${out}/21-m-levelup.png` });
    await page.waitForTimeout(450);
    await page.tap('#cards .card');
  }
  await play(page, 2, `g.p.inv = 1; g.input.mx = 0.5; g.input.my = -0.4;`);
  await page.screenshot({ path: `${out}/22-m-play.png` });
  await page.tap('#btnLamp');
  await play(page, 1.5, `g.p.inv = 1;`);
  await page.screenshot({ path: `${out}/23-m-dark.png` });
  await page.context().close();
}

await browser.close();
server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('screenshots ok →', out);
