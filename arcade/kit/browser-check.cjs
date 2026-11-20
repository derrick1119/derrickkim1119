// 계기판 실제 브라우저 점검(390px): 9초 기다림 → 긋기 3번 → 톡 5번, 게임마다 스크린샷 둘·콘솔 에러
// 0112: 소리 마디 수(기다림/만짐)·AudioContext 상태, 마지막에 소리 끄기 점검(끈 뒤 새 소리 0 · 모든 단추 글자 '꺼짐')
// node arcade/kit/browser-check.cjs id1,id2,... <스크린샷 폴더>   (먼저 npx tsx arcade/cli-dashboard.ts 로 web/public/arcade/index.html 생성)
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  await p.addInitScript(() => {
    window.__snd = 0; window.__ac = [];
    const A = window.AudioContext; if (!A) return;
    const o = A.prototype.createOscillator, n = A.prototype.createBufferSource;
    A.prototype.createOscillator = function () { window.__snd++; return o.call(this); };
    A.prototype.createBufferSource = function () { window.__snd++; return n.call(this); };
    window.AudioContext = class extends A { constructor(...a) { super(...a); window.__ac.push(this); } };
  });
  const snd = () => p.evaluate(() => window.__snd), acState = () => p.evaluate(() => window.__ac.map((a) => a.state).join(',') || 'none');
  const errs = []; p.on('console', (m) => m.type() === 'error' && errs.push(m.text())); p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto('file://' + require('node:path').resolve(__dirname, '../../web/public/arcade/index.html'));
  await p.waitForTimeout(500);
  console.log('scrollWidth', await p.evaluate(() => document.documentElement.scrollWidth), await p.evaluate(() => [...document.querySelectorAll('[data-game]')].map((e) => e.dataset.game).join(',')));
  const out = process.argv[3] ?? __dirname;
  for (const id of process.argv[2].split(',')) {
    const g = p.locator(`[data-game="${id}"]`); await g.scrollIntoViewIfNeeded();
    await g.locator('.g-overlay').click();
    const s0 = await snd();
    await p.waitForTimeout(9000);
    const s1 = await snd();
    const c = g.locator('.g-canvas'); const box = await c.boundingBox();
    await c.screenshot({ path: out + `/${id}-idle.png` });
    const P = (fx, fy) => [box.x + box.width * fx, box.y + box.height * fy];
    const drags = [[[0.2,0.45],[0.8,0.55]],[[0.15,0.3],[0.7,0.7]],[[0.3,0.6],[0.75,0.4]]];
    for (const [[ax,ay],[bx,by]] of drags) {
      const [x0,y0] = P(ax,ay), [x1,y1] = P(bx,by);
      await p.mouse.move(x0,y0); await p.mouse.down();
      for (let i = 1; i <= 15; i++) { await p.mouse.move(x0 + (x1-x0)*i/15, y0 + (y1-y0)*i/15); await p.waitForTimeout(20); }
      await p.mouse.up(); await p.waitForTimeout(1800);
    }
    for (const [fx, fy] of [[0.5,0.5],[0.3,0.4],[0.7,0.45],[0.5,0.3],[0.4,0.6]]) { const [x, y] = P(fx, fy); await p.mouse.click(x, y); await p.waitForTimeout(900); }
    await p.waitForTimeout(1500);
    await c.screenshot({ path: out + `/${id}-tap.png` });
    console.log('sound', id, 'idle', s1 - s0, 'touched', (await snd()) - s1, 'ctx', await acState());
  }
  // 소리 끄기: 첫 게임 단추 → 마지막 게임에서 톡 5번 → 새 소리 0, 모든 단추 '꺼짐'
  const ids = process.argv[2].split(',');
  await p.locator(`[data-game="${ids[0]}"] .g-mute`).click();
  const last = p.locator(`[data-game="${ids.at(-1)}"]`); await last.scrollIntoViewIfNeeded();
  const lb = await last.locator('.g-canvas').boundingBox(), m0 = await snd();
  for (const fx of [0.3, 0.5, 0.7, 0.4, 0.6]) { await p.mouse.click(lb.x + lb.width * fx, lb.y + lb.height * 0.5); await p.waitForTimeout(700); }
  console.log('muted: new sounds', (await snd()) - m0, 'labels', (await p.locator('.g-mute').allTextContents()).join(' | '));
  await p.locator(`[data-game="${ids[0]}"] .g-mute`).click();
  console.log('errors', errs);
  await b.close();
})();
