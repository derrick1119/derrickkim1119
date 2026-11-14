/**
 * 플레이 빌드: main.ts를 esbuild로 묶어 index.html 한 장에 넣는다 → web/public/studio/demolition/index.html
 * C003~: 3D 빌드 main3d.ts → 3d.html · C007 사다리 ② 통과로 index.html도 3D, 2D는 2d.html
 *   npx tsx studio/demolition/build.ts
 */
import { build } from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const here = import.meta.dirname, out = join(here, '../../web/public/studio/demolition');
mkdirSync(out, { recursive: true });
// C007: 사다리 ② 통과 → 오너 주소 index.html = 3D. 3d.html은 옛 링크용 같은 내용, 2D 프로토타입은 2d.html(판독 시험 대조군·회귀용)
for (const [entry, page, file] of [['main.ts', 'index.html', '2d.html'], ['main3d.ts', 'index3d.html', 'index.html'], ['main3d.ts', 'index3d.html', '3d.html']]) {
  const js = (await build({ entryPoints: [join(here, entry)], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' })).outputFiles[0].text;
  const html = readFileSync(join(here, page), 'utf8').replace('/*BUNDLE*/', () => js.replace(/<\/script/g, '<\\/script'));
  writeFileSync(join(out, file), html);
  console.log(`${file} ${(html.length / 1024).toFixed(1)}KB · gzip ${(gzipSync(html).length / 1024).toFixed(1)}KB`);
}
