/**
 * 2기 플레이 빌드: v2/play.ts → web/public/studio/bodyhop/index.html (한 장, 그림은 w1/ 파일)
 *   npx tsx studio/bodyhop/v2/build.ts      (그림을 바꿨으면 먼저 node studio/bodyhop/v2/w1/bake.cjs)
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = import.meta.dirname, out = join(here, '../../../web/public/studio/bodyhop');
const js = (await build({ entryPoints: [join(here, 'play.ts')], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
const html = readFileSync(join(here, 'play.html'), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
writeFileSync(join(out, 'index.html'), html);
console.log(`index.html ${(html.length / 1024).toFixed(1)}KB · gzip ${(gzipSync(html).length / 1024).toFixed(1)}KB`);
