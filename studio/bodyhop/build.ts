/**
 * 플레이 빌드: main.ts를 esbuild로 묶어 index.html 한 장에 넣는다 → web/public/studio/bodyhop/index.html
 *   npx tsx studio/bodyhop/build.ts
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = import.meta.dirname, out = join(here, '../../web/public/studio/bodyhop');
mkdirSync(out, { recursive: true });
// M0′: 주소 첫 화면(index.html) = 새 3D(look) · 옛 2D 프로토타입은 2d.html(비교·기록용)
for (const [entry, page, file] of [['look.ts', 'look.html', 'index.html'], ['main.ts', 'index.html', '2d.html']]) {
  const js = (await build({ entryPoints: [join(here, entry)], bundle: true, minify: true, format: 'iife', write: false, target: 'es2022', legalComments: 'none' })).outputFiles[0].text;
  const html = readFileSync(join(here, page), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
  writeFileSync(join(out, file), html);
  console.log(`${file} ${(html.length / 1024).toFixed(1)}KB · gzip ${(gzipSync(html).length / 1024).toFixed(1)}KB`);
}
