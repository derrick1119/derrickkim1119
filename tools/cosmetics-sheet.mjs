// 꾸미기 미리보기 시트를 PNG 로 저장한다(개발용). tools/cosmetics.html 참고.
//   node tools/cosmetics-sheet.mjs <출력.png> "<쿼리>"
//   예) node tools/cosmetics-sheet.mjs /tmp/o.png "mode=icon&keys=outfit:cat,outfit:dino&moods=idle,happy,shock,hide&size=220"
//       node tools/cosmetics-sheet.mjs /tmp/u.png "mode=game&look=paint=honey,deco=wings,beam=honey&forms=0,1,2,3,4,5,6,7&moods=idle&beam=1"
// 3D 는 Playwright Chromium 의 소프트웨어 WebGL 로 찍는다(느리다: 항목 수십 개면 1~2분).
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const [out = '/tmp/cosmetics.png', query = 'mode=icon&keys=outfit:none'] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
const port = Number(process.env.SHEET_PORT) || 5000 + Math.floor(Math.random() * 900);
const server = await startServer({ port, root: ROOT });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('pageerror:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.error(`console.${m.type()}:`, m.text());
  });
  await page.goto(`http://127.0.0.1:${port}/tools/cosmetics.html?${query}`);
  await page.waitForSelector('body[data-ready]', { timeout: 600000 });
  const errors = JSON.parse(await page.evaluate(() => document.body.dataset.errors || '[]'));
  for (const e of errors) console.error('error:', e);
  const dataUrl = await page.evaluate(() => document.getElementById('sheet').toDataURL('image/png'));
  await writeFile(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  console.log('저장:', out);
} finally {
  await browser.close();
  server.close();
}
