// 앱 아이콘 PNG 를 만든다. tools/icon.html 이 캔버스에 그린 것을 Playwright 로 받아 저장한다.
//   node tools/gen-icons.mjs
// Playwright 가 필요하다: npm i -D playwright && npx playwright install chromium
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = resolve(ROOT, 'assets/icons');
const ICONS = [
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-192.png', size: 192 },
  { file: 'maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true }, // iOS 가 모서리를 직접 깎는다
  { file: 'favicon-64.png', size: 64 },
];

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright 를 찾지 못했습니다. npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const port = 5187;
const server = await startServer({ port, root: ROOT });
const browser = await chromium.launch();
try {
  await mkdir(OUT, { recursive: true });
  const page = await browser.newPage();
  for (const icon of ICONS) {
    await page.goto(`http://127.0.0.1:${port}/tools/icon.html?size=${icon.size}&maskable=${icon.maskable ? 1 : 0}`);
    await page.waitForSelector('body[data-ready]');
    const dataUrl = await page.evaluate(() => document.getElementById('icon').toDataURL('image/png'));
    await writeFile(resolve(OUT, icon.file), Buffer.from(dataUrl.split(',')[1], 'base64'));
    console.log('저장:', `assets/icons/${icon.file}`);
  }
} finally {
  await browser.close();
  server.close();
}
