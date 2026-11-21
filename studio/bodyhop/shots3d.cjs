/**
 * 3D 키 프레임(M0′ · MILESTONES K1~K4): 같은 시드·틱으로 멈춘 장면 → screens/k*.png, 콘솔 에러·굽기 시간·그리기 호출
 *   node studio/bodyhop/shots3d.cjs [폭=390] [배율=1]
 */
const { chromium } = require('playwright');
const path = require('node:path'), fs = require('node:fs');
const KEYS = [['k1-arena', 'seed=7&t=40'], ['k2-hop', 'seed=7&t=150'], ['k3-pop', 'seed=7&t=330'], ['k4-crowd', 'seed=7&stage=4&t=900']];
(async () => {
  const W = Number(process.argv[2] || 390), dsf = Number(process.argv[3] || 1), out = path.join(__dirname, 'screens');
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const errs = [], rep = [];
  for (const [name, q] of (process.argv[4] ? [[process.argv[4], process.argv[5]]] : KEYS)) {
    const p = await b.newPage({ viewport: { width: W, height: Math.round(W * 844 / 390) }, deviceScaleFactor: dsf });
    p.on('console', (m) => m.type() === 'error' && errs.push(name + ': ' + m.text()));
    p.on('pageerror', (e) => errs.push(name + ': ' + String(e)));
    await p.goto('file://' + path.join(__dirname, '../../web/public/studio/bodyhop/index.html') + '?' + q);
    await p.waitForFunction(() => document.body.dataset.ready === '1', null, { timeout: 60000 }).catch(() => errs.push(name + ': not ready'));
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `${name}-${W}${dsf > 1 ? '@' + dsf : ''}.png`) });
    rep.push(await p.evaluate(() => { const l = window.__look; return l ? { bakeMs: Math.round(l.bakeMs), draws: l.draws, hdr: l.hdr, t: l.t } : null; }));
    await p.close();
  }
  console.log(JSON.stringify({ width: W, rep, consoleErrors: errs }));
  await b.close();
  process.exit(errs.length ? 1 : 0);
})();
