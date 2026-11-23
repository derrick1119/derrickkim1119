/**
 * 월드 1 수채 그림 굽기 → web/public/studio/bodyhop/w1/ (bg.jpg · front.png · veil.jpg · atlas.png) + studio/bodyhop/v2/w1/atlas.json
 *   node studio/bodyhop/v2/w1/bake.cjs
 * 시안 1(../concepts/c1.js)의 붓 함수 위에 bake-w1.js를 얹어 헤드리스 크로미움에서 그린다. 같은 씨앗이면 늘 같은 그림.
 */
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = path.join(__dirname, '../../../../web/public/studio/bodyhop/w1');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const src = fs.readFileSync(path.join(__dirname, '../concepts/c1.js'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname, 'bake-w1.js'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.setContent('<body></body>');
  const t0 = Date.now();
  const res = await page.evaluate(`(() => {
    ${src}
    let a = 20261123; R = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    return bakeAll();
  })()`);
  for (const [name, url] of Object.entries(res)) {
    if (name === 'map') continue;
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, name), buf);
    console.log(`${name} ${(buf.length / 1024).toFixed(0)}KB`);
  }
  fs.writeFileSync(path.join(__dirname, 'atlas.json'), JSON.stringify(res.map, null, 0) + '\n');
  console.log(`sprites ${Object.keys(res.map).length} · ${Date.now() - t0}ms`);
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
  await browser.close();
})();
