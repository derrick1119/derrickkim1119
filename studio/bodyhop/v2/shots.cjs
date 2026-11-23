/**
 * 2기 화면 찍기: 실제 브라우저(390×844)에서 플레이 빌드를 열고 정해진 틱에 찍는다 → studio/bodyhop/screens2/
 *   node studio/bodyhop/v2/shots.cjs [dpr=1]
 * 콘솔 에러·가로 스크롤도 센다. 흐름은 봇이 하므로 같은 빌드면 같은 장면.
 */
const { chromium } = require('playwright');
const path = require('node:path');
const dpr = Number(process.argv[2] || 1);
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dpr });
  const errs = [];
  p.on('pageerror', (e) => errs.push(String(e)));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.join(__dirname, '../../../web/public/studio/bodyhop/index.html'));
  await p.waitForFunction(() => window.__hop);
  await p.evaluate(() => { window.requestAnimationFrame = () => 0; });
  const out = path.join(__dirname, '../screens2');
  let at = 0;
  const shot = async (name, tick, cond) => {
    if (cond) { for (let i = 0; i < 3000 && !(await p.evaluate(cond)); i++) await p.evaluate(() => (window.__hop.step(1), 0)); }
    else await p.evaluate((k) => window.__hop.step(k), tick - at);
    at = await p.evaluate(() => window.__hop.s.t);
    await p.evaluate(() => window.__hop.draw());
    await p.screenshot({ path: path.join(out, `${name}${dpr > 1 ? '@2' : ''}.png`) });
    console.log(name, 't=' + at);
  };
  await shot('m1-a-start', 50);
  await shot('m1-b-fly', 0, '(() => { const s = window.__hop.s; return s.fly && s.t - s.fly.t >= 4; })()');
  await shot('m1-c-pop', 0, '(() => { const s = window.__hop.s; return s.corpses.some(c => c.how === 3 && s.t - c.t === 4); })()');
  await shot('m1-d-ride', 0, '(() => { const s = window.__hop.s; return !s.fly && s.me && s.t % 60 === 0 && s.hops >= 3; })()');
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(`errors ${errs.length} · scrollWidth ${sw}`);
  if (errs.length) console.log(errs.join('\n'));
  await b.close();
})();
