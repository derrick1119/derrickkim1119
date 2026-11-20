// node snap.cjs <초 목록, 예: 1,3,30,90>  → 같은 폴더의 snap.png (그 폴더에 snap.html·snap.js가 있어야 함)
const { chromium } = require('playwright');
(async () => {
  const at = process.argv[2] ?? '1,3,30,90';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1560, height: 1060 }, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + __dirname + '/snap.html?at=' + at);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: __dirname + '/snap.png' });
  console.log('errors', errs);
  await b.close();
})();
