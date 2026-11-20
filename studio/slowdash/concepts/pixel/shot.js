const { chromium } = require('playwright');
(async()=>{
  const [,, file, out, w, h] = process.argv;
  const b = await chromium.launch();
  const p = await b.newPage({viewport:{width:+w||390,height:+h||844},deviceScaleFactor:2});
  p.on('console', m=>console.log('console:', m.text()));
  p.on('pageerror', e=>console.log('pageerror:', e.message));
  await p.goto('file://'+require('path').resolve(file));
  await p.waitForTimeout(300);
  await p.screenshot({path:out});
  await b.close();
})();
