// 앱 아이콘 PNG 를 만든다:  node tools/make-icons.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="56%" r="50%">
      <stop offset="0" stop-color="#ffc878" stop-opacity=".95"/>
      <stop offset=".35" stop-color="#ff9a3c" stop-opacity=".45"/>
      <stop offset="1" stop-color="#ff7a20" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6d6"/><stop offset="1" stop-color="#ffc35e"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="#07080f"/>
  <circle cx="256" cy="286" r="250" fill="url(#g)"/>
  <path d="M256 78 a26 26 0 0 1 26 26 h-52 a26 26 0 0 1 26 -26z" fill="none" stroke="#20283a" stroke-width="14"/>
  <path d="M168 190 256 112l88 78z" fill="#20283a"/>
  <rect x="184" y="190" width="144" height="190" rx="12" fill="url(#glass)"/>
  <path d="M256 190v190M184 285h144" stroke="#20283a" stroke-width="10" opacity=".55"/>
  <path d="M256 232c26 30 34 52 34 74a34 34 0 0 1-68 0c0-22 8-44 34-74z" fill="#ff8a2a"/>
  <path d="M256 268c12 16 16 28 16 40a16 16 0 0 1-32 0c0-12 4-24 16-40z" fill="#fff3c9"/>
  <rect x="164" y="380" width="184" height="34" rx="8" fill="#20283a"/>
</svg>`;

const browser = await chromium.launch();
for (const size of [512, 192]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>html,body{margin:0;background:#07080f}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.screenshot({ path: path.join(root, 'assets', `icon-${size}.png`) });
  await page.close();
}
await browser.close();
console.log('icons written to assets/');
