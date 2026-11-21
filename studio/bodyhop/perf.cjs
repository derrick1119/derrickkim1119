/**
 * 느린 폰 흉내(공장 arcade/kit/frame-check.cjs 본뜸): CPU 4배 느리게 하고 3D 화면에서 봇이 8초 돌 때
 * 한 프레임 JS 시간(시뮬 + 그리기 명령 제출)의 중앙·p95, 그리기 호출 수, 굽기 시간. GPU 시간은 헤드리스(소프트웨어 GL)라 판정에 쓰지 않는다.
 *   node studio/bodyhop/perf.cjs [배수=4] [쿼리=seed=7]
 */
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const rate = Number(process.argv[2] || 4), q = process.argv[3] || 'seed=7';
  const b = await chromium.launch(), p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
  const t0 = Date.now();
  await p.goto('file://' + path.join(__dirname, '../../web/public/studio/bodyhop/index.html') + '?' + q);
  await p.waitForFunction(() => window.__look && window.__look.js.length > 2, null, { timeout: 60000 });
  const first = Date.now() - t0;
  await p.waitForTimeout(8000);
  const r = await p.evaluate(() => { const l = window.__look, js = l.js.slice(5).sort((a, c) => a - c); return { frames: js.length, med: +js[js.length >> 1].toFixed(2), p95: +js[Math.floor(js.length * 0.95)].toFixed(2), draws: l.draws, tris: Math.round(l.tris), bakeMs: Math.round(l.bakeMs) }; });
  console.log(JSON.stringify({ cpu: rate, firstFrameMs: first, ...r }));
  await b.close();
})();
