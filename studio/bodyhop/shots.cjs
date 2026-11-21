/**
 * 스크린샷·콘솔 에러·가로 스크롤 점검 (390×844 실제 브라우저) → studio/bodyhop/screens/
 *   node studio/bodyhop/shots.cjs [폭=390]
 * 01 시작 화면 · 02 첫 톡 직후 · 03 몇 번 갈아탄 뒤 · 04 10초 뒤
 */
const { chromium } = require('playwright');
const path = require('node:path'), fs = require('node:fs');
(async () => {
  const W = Number(process.argv[2] || 390), out = path.join(__dirname, 'screens');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: W, height: 844 }, deviceScaleFactor: 1 });
  const errs = [];
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + path.join(__dirname, '../../web/public/studio/bodyhop/index.html'));
  await p.waitForTimeout(500);
  await p.screenshot({ path: path.join(out, `01-title-${W}.png`) });
  await p.click('.g-overlay');
  await p.waitForTimeout(800);
  const box = await p.locator('canvas').boundingBox();
  const tap = (x, y) => p.mouse.click(box.x + x * box.width, box.y + y * box.height);
  await tap(0.5, 0.55);
  await p.waitForTimeout(250);
  await p.screenshot({ path: path.join(out, `02-first-hop-${W}.png`) });
  for (const [x, y] of [[0.3, 0.6], [0.7, 0.5], [0.4, 0.75], [0.6, 0.65]]) (await p.waitForTimeout(1300), await tap(x, y));
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(out, `03-hops-${W}.png`) });
  await p.waitForTimeout(5000);
  await p.screenshot({ path: path.join(out, `04-later-${W}.png`) });
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(JSON.stringify({ width: W, scrollWidth: sw, hscroll: sw > W, consoleErrors: errs }));
  await b.close();
  process.exit(errs.length || sw > W ? 1 : 0);
})();
