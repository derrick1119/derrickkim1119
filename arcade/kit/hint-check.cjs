// 0123: 실제 계기판(390px)에서 막힘 힌트 점검 — 게임마다 시작 5초 → 전구 톡(위 띠 오른쪽 끝) → 1.2초 뒤 → 18초 가만히(반짝임). 스크린샷 셋.
// node arcade/kit/hint-check.cjs id1,id2 <폴더>   (먼저 npx tsx arcade/cli-dashboard.ts)
const { chromium } = require('playwright');
const path = require('node:path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.resolve(__dirname, '../../web/public/arcade/index.html'));
  await p.waitForTimeout(500);
  for (const id of process.argv[2].split(',')) {
    const g = p.locator(`[data-game="${id}"]`); await g.scrollIntoViewIfNeeded();
    await g.locator('.g-overlay').click();
    await p.waitForTimeout(5000);
    const c = g.locator('.g-canvas'); const box = await c.boundingBox();
    await c.screenshot({ path: `${process.argv[3]}/${id}-0before.png` });
    // 전구: 위 띠 오른쪽 끝
    await p.mouse.click(box.x + box.width * 0.93, box.y + box.width * 0.045);
    await p.waitForTimeout(1200);
    await c.screenshot({ path: `${process.argv[3]}/${id}-1hint.png` });
    // 18초 가만히 → 반짝이는지
    await p.waitForTimeout(18000);
    await c.screenshot({ path: `${process.argv[3]}/${id}-2idle.png` });
  }
  console.log('errors', errs);
  await b.close();
})();
