const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const which = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', (e) => errs.push(String(e)));
  for (const n of which) {
    await p.goto('file://' + path.join(__dirname, `cast${n}.html`));
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(__dirname, `cast${n}.png`) });
    console.log('rendered', n);
  }
  if (errs.length) console.log('ERRORS', errs);
  await b.close();
})();
