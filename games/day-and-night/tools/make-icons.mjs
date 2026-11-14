// 앱 아이콘 PNG 를 만든다:  node tools/make-icons.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="halo" cx="50%" cy="44%" r="52%">
      <stop offset="0" stop-color="#ffc878" stop-opacity=".9"/>
      <stop offset=".4" stop-color="#ff9a3c" stop-opacity=".35"/>
      <stop offset="1" stop-color="#ff7a20" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glass" cx="40%" cy="34%" r="70%">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fff3c9"/><stop offset="1" stop-color="#ffcf70"/>
    </radialGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a1024"/><stop offset="1" stop-color="#1c2748"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#sky)"/>
  <path d="M0 512V300l512 0v212z" fill="#0b1226" opacity=".0"/>
  <path d="M256 0v512h256V0z" fill="#05060d" opacity=".55"/>
  <circle cx="256" cy="226" r="250" fill="url(#halo)"/>
  <circle cx="256" cy="216" r="118" fill="url(#glass)"/>
  <path d="M214 250v-34l22-40 20 40 20-40 22 40v34" fill="none" stroke="#ff8a2a" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>
  <ellipse cx="212" cy="164" rx="26" ry="14" transform="rotate(-38 212 164)" fill="#fff" opacity=".75"/>
  <rect x="204" y="322" width="104" height="78" rx="18" fill="#7d8799"/>
  <path d="M204 348h104M204 372h104" stroke="#4b5567" stroke-width="10"/>
  <rect x="230" y="396" width="52" height="24" rx="10" fill="#2f3644"/>
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
