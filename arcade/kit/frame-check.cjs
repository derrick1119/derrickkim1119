// 0118: 느린 폰 흉내(CPU 4배 느리게)에서 게임 프레임 간격 — 390px 계기판, 게임마다 기다림 3초 + 톡·긋기 5초
// node arcade/kit/frame-check.cjs id1,id2,... [배수=4]   (먼저 npx tsx arcade/cli-dashboard.ts)
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const rate = Number(process.argv[3] ?? 4), dsf = Number(process.argv[4] ?? 3);
  const b = await chromium.launch();
  for (const id of process.argv[2].split(',')) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: dsf, hasTouch: true });
    // 게임 rAF 콜백이 실제로 쓰는 시간(자바스크립트 + 그리기 명령) — 프레임 간격과 따로 본다
    await p.addInitScript(() => { window.__cb = []; const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (f) => raf((t) => { const a = performance.now(); f(t); window.__cb.push(performance.now() - a); }); });
    await p.goto('file://' + path.resolve(__dirname, '../../web/public/arcade/index.html'));
    await p.waitForTimeout(500);
    const cdp = await p.context().newCDPSession(p);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate });
    const g = p.locator(`[data-game="${id}"]`); await g.scrollIntoViewIfNeeded();
    await g.locator('.g-overlay').click();
    await p.evaluate(() => { window.__ft = []; window.__cb.length = 0; let t0 = performance.now(); const f = (t) => { window.__ft.push(t - t0); t0 = t; requestAnimationFrame(f); }; requestAnimationFrame(f); });
    await p.waitForTimeout(3000);
    const box = await g.locator('.g-canvas').boundingBox();
    const P = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
    for (const [fx, fy] of [[0.5, 0.5], [0.3, 0.4], [0.7, 0.45]]) { const [x, y] = P(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(700); }
    const [x0, y0] = P(0.2, 0.5), [x1, y1] = P(0.8, 0.5);
    await p.mouse.move(x0, y0); await p.mouse.down();
    for (let i = 1; i <= 10; i++) { await p.mouse.move(x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); await p.waitForTimeout(30); }
    await p.mouse.up(); await p.waitForTimeout(2500);
    const ft = (await p.evaluate(() => window.__ft)).slice(2).sort((a, b) => a - b);
    const cb = (await p.evaluate(() => window.__cb)).filter((v) => v > 0.05).sort((a, b) => a - b);
    const q = (xs, k) => xs[Math.min(xs.length - 1, Math.floor(xs.length * k))] ?? 0;
    console.log(`frame ${id} x${rate} dsf${dsf} 간격 중앙 ${q(ft, 0.5).toFixed(1)}ms p95 ${q(ft, 0.95).toFixed(1)}ms 50ms넘음 ${(100 * ft.filter((v) => v > 50).length / ft.length).toFixed(1)}% · 게임 코드 중앙 ${q(cb, 0.5).toFixed(1)}ms p95 ${q(cb, 0.95).toFixed(1)}ms`);
    await p.close();
  }
  await b.close();
})();
