// 2.5D 디오라마 시안 렌더: index.html → board.png (390×844 @2x)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const dir = __dirname;
  const out = process.argv[2] || path.join(dir, 'board.png');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file://' + path.join(dir, 'index.html'));
  await page.waitForFunction(() => window.__DONE === true, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: out });
  if (errors.length) console.log('ERRORS:\n' + errors.join('\n'));
  console.log('saved', out);
  await browser.close();
})();
