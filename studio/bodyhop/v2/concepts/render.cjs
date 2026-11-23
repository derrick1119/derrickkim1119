/**
 * 2기 그림 컨셉 시안 굽기: cN.js의 paint(ctx, W, H, seedRand)를 헤드리스 크로미움 2D 캔버스에 그려
 * 아이폰 세로(390×844 @2x) JPEG로 → web/public/studio/bodyhop/concepts/cN.jpg
 *   node studio/bodyhop/v2/concepts/render.cjs c1 [c2 c3]
 * 결과는 '그림 파일'이라 아이폰 사파리에서도 그대로 보인다(1기 3D 깨짐 위험 없음).
 */
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
const out = path.join(__dirname, '../../../../web/public/studio/bodyhop/concepts');
(async () => {
  const ids = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  for (const id of ids) {
    const src = fs.readFileSync(path.join(__dirname, id + '.js'), 'utf8');
    await page.setContent('<canvas id=c width=780 height=1688></canvas>');
    const t0 = Date.now();
    const url = await page.evaluate(`(() => {
      ${src}
      // 결정적 무작위(같은 그림이 늘 같게)
      let a = 12345; const rand = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const c = document.getElementById('c'), ctx = c.getContext('2d');
      ctx.scale(2, 2);
      paint(ctx, 390, 844, rand);
      return c.toDataURL('image/jpeg', 0.9);
    })()`);
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(out, id + '.jpg'), buf);
    console.log(`${id}.jpg ${(buf.length / 1024).toFixed(0)}KB · ${Date.now() - t0}ms`);
  }
  if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
  await browser.close();
})();
