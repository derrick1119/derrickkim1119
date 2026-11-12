/**
 * 플레이 빌드: main.ts를 esbuild로 묶어 index.html 한 장에 넣는다 → web/public/studio/balloonpop/index.html
 *   npx tsx studio/balloonpop/build.ts
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = import.meta.dirname, out = join(here, '../../web/public/studio/balloonpop');
const js = (await build({ entryPoints: [join(here, 'main.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
const html = readFileSync(join(here, 'index.html'), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(1)}KB · gzip ${(gzipSync(html).length / 1024).toFixed(1)}KB`);
