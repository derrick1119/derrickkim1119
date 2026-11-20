// 사용: node render.cjs [only]  → board.png (+ shots/*.png)
const { execSync } = require('child_process');
const path = require('path');
const { chromium } = require('playwright');
const dir = __dirname;
execSync(`/home/user/derrickkim1119/node_modules/.bin/esbuild ${dir}/scene.js --bundle --format=iife --outfile=${dir}/bundle.js --log-level=warning`, { stdio: 'inherit' });
(async () => {
  const t0 = Date.now();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning' || m.type() === 'log') && !m.text().includes('GPU stall')) console.log('[console]', m.type(), m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  const q = process.argv[2] === "stats" ? "?stats=1" : process.argv[2] ? `?only=${process.argv[2]}${process.argv[3] ? "&big=1" : ""}` : "";
  await page.goto('file://' + path.join(dir, 'index.html') + q);
  await page.waitForFunction(() => window.__done === true, null, { timeout: 300000 });
  const err = await page.evaluate(() => window.__err);
  if (err) console.log('ERR', err);
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(dir, 'board.png') });
  require('fs').mkdirSync(path.join(dir, 'shots'), { recursive: true });
  for (const id of ['main', 'cut', 'close']) {
    const el = await page.$('#' + id);
    const ok = await page.evaluate((i) => !!document.getElementById(i).src, id);
    if (ok) await el.screenshot({ path: path.join(dir, 'shots', id + '.png') });
  }
  await browser.close();
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(1), 's');
})();
