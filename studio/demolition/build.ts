/**
 * 플레이 빌드: main.ts를 esbuild로 묶어 index.html 한 장에 넣는다 → web/public/studio/demolition/index.html
 * C003~: 3D 실험 빌드 main3d.ts → 3d.html (3D 게이트를 통과하면 index.html이 3D가 된다)
 *   npx tsx studio/demolition/build.ts
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = import.meta.dirname, out = join(here, '../../web/public/studio/demolition');
mkdirSync(out, { recursive: true });
for (const [entry, page, file] of [['main.ts', 'index.html', 'index.html'], ['main3d.ts', 'index3d.html', '3d.html']]) {
  const js = (await build({ entryPoints: [join(here, entry)], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
  const html = readFileSync(join(here, page), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
  writeFileSync(join(out, file), html);
  console.log(`${file} ${(html.length / 1024).toFixed(1)}KB · gzip ${(gzipSync(html).length / 1024).toFixed(1)}KB`);
}
