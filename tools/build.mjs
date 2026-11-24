// 단일 HTML 파일로 묶기: node tools/build.mjs → dist/index.html
// (JS 번들 + CSS + 폰트를 모두 한 파일에 넣어 어디에나 올릴 수 있다)
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = await build({ entryPoints: [path.join(root, 'src/main.js')], bundle: true, format: 'iife', minify: true, write: false, target: ['es2020'], legalComments: 'none' });
const js = out.outputFiles[0].text.replace(/<\/script/g, '<\\/script');
let css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
// 도트 글꼴(갈무리)은 한글 전부를 담아 크다: 게임 글에 실제로 나오는 글자만 남긴다 (OFL, 예약 글꼴 이름 없음)
const chars = new Set(' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~·…→←↑↓×÷−–—「」『』〈〉《》“”‘’★☆●○◆◇■□▲△▼▽♥♡');
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(js|html)$/.test(e.name)) for (const ch of fs.readFileSync(f, 'utf8')) if (ch.codePointAt(0) > 126) chars.add(ch); } };
walk(path.join(root, 'src')); for (const ch of fs.readFileSync(path.join(root, 'index.html'), 'utf8')) chars.add(ch);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'galmuri-')), txt = path.join(tmp, 'chars.txt'); fs.writeFileSync(txt, [...chars].join(''));
const fontData = f => {
  const src = path.join(root, f); if (!/Galmuri/.test(f)) return fs.readFileSync(src);
  const dst = path.join(tmp, path.basename(f));
  try { execFileSync('python3', ['-m', 'fontTools.subset', src, `--text-file=${txt}`, '--flavor=woff2', `--output-file=${dst}`, '--layout-features=*', '--no-hinting'], { stdio: 'pipe' }); return fs.readFileSync(dst); }
  catch (e) { console.warn('글꼴 줄이기 실패, 통째로 넣는다:', f); return fs.readFileSync(src); }
};
css = css.replace(/url\('([^']+\.woff2)'\)/g, (m, f) => `url(data:font/woff2;base64,${fontData(f).toString('base64')})`);
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${css}</style>`).replace('<script type="module" src="src/main.js"></script>', () => `<script>${js}</script>`);
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
