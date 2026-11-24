// 단일 HTML 파일로 묶기: node tools/build.mjs → dist/index.html
// (JS 번들 + CSS + 폰트를 모두 한 파일에 넣어 어디에나 올릴 수 있다)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
css = css.replace(/url\('([^']+\.woff2)'\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`).replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
