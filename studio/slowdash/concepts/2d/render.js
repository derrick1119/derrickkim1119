const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('file://' + __dirname + '/index.html');
  await p.waitForTimeout(400);
  await p.screenshot({ path: __dirname + '/board.png' });
  if (process.argv[2]) await p.screenshot({ path: __dirname + '/zoom.png', clip: JSON.parse(process.argv[2]) });
  console.log(errs.length ? errs.join('\n') : 'no errors');
  await b.close();
})();
