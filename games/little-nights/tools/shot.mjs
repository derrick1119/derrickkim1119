// 실제 브라우저(WebGL)로 띄워 스크린샷을 찍는다:  node tools/shot.mjs [outDir]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const out = process.argv[2] || 'shots';
const server = await serve(8761);
const browser = await chromium.launch();
const errors = [];
async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|GPU stall/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8761/index.html');
  await page.waitForTimeout(1500);
  return page;
}
// 스테이지를 열고 풀이의 앞 n 수를 둔 장면
async function scene(page, id, n, name) {
  await page.evaluate(({ id }) => { const L = window.__lamp; L.play(L.LEVELS.findIndex((l) => l.id === id)); }, { id });
  await page.waitForTimeout(400);
  const sol = await page.evaluate((id) => window.__lamp.LEVELS.find((l) => l.id === id).sol, id);
  for (let i = 0; i < Math.min(n, sol.length); i++) {
    await page.evaluate((a) => window.__lamp.act(a), sol[i]);
    await page.waitForTimeout(260);
  }
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${out}/${name}.png` });
}
{
  const page = await open(1280, 720);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/01-title.png` });
  await page.click('#btnStages'); await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/02-select.png` });
  await page.click('#screen-select [data-back]');
  await scene(page, '1-1', 0, '10-1-1');
  await scene(page, '1-2', 3, '11-1-2-dark');
  await scene(page, '1-4', 6, '12-1-4');
  await scene(page, '2-1', 4, '13-2-1-shadow');
  await scene(page, '2-3', 8, '14-2-3');
  await scene(page, '3-1', 4, '15-3-1-lantern');
  await scene(page, '3-2', 7, '16-3-2-crate');
  await scene(page, '4-1', 3, '17-4-1-moth');
  await scene(page, '4-2', 9, '18-4-2');
  await scene(page, '1-1', 99, '30-clear');
  await page.context().close();
}
{
  const page = await open(390, 844, { dsf: 2, touch: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/40-m-title.png` });
  await scene(page, '2-2', 5, '41-m-play');
  await page.context().close();
}
await browser.close();
server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('screenshots ok →', out);
