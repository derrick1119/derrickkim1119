// 펠트 시안을 한 파일로: node mockups/felt/build.mjs → mockups/felt/dist/index.html
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.join(dir, '../..');
const out = await build({ entryPoints: [path.join(dir, 'src/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'] });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let css = fs.readFileSync(path.join(root, 'style.css'), 'utf8').split('\n').filter(l => l.startsWith('@font-face')).join('\n');
css = css.replace(/url\('([^']+\.woff2)'\)/g, (m, f) => `url(data:font/woff2;base64,${fs.readFileSync(path.join(root, f)).toString('base64')})`);
css += fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
let html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`).replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
fs.mkdirSync(path.join(dir, 'dist'), { recursive: true });
fs.writeFileSync(path.join(dir, 'dist/index.html'), html);
console.log('mockups/felt/dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
