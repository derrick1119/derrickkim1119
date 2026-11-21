// 배포용 빌드.
//   node tools/build.mjs
// 만들어지는 것(dist/):
//   index.html, app.js(묶고 줄인 스크립트), styles/, assets/, manifest.webmanifest, sw.js(미리 저장할 파일 목록 포함)
//   shh-ufo.html — 글꼴·스크립트·스타일을 전부 품은 파일 하나짜리 판(어디든 그대로 올리거나 보낼 수 있다)
import { build, transform } from 'esbuild';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DIST = join(ROOT, 'dist');
const read = (p) => readFile(join(ROOT, p), 'utf8');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function must(text, search, label) {
  if (!text.includes(search)) throw new Error(`빌드 실패: ${label} 에서 바꿀 자리를 찾지 못했습니다 → ${search}`);
}

async function main() {
  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, 'styles'), { recursive: true });

  // 1) 스크립트: 모듈 묶음 하나(app.js)와, 파일 하나짜리 판에 넣을 즉시 실행 묶음
  const common = { entryPoints: [join(ROOT, 'src/main.js')], bundle: true, minify: true, target: ['es2020'], legalComments: 'none', logLevel: 'warning' };
  await build({ ...common, format: 'esm', outfile: join(DIST, 'app.js') });
  const inline = await build({ ...common, format: 'iife', write: false });
  const inlineJs = inline.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

  // 2) 스타일
  const cssSource = await read('styles/main.css');
  const css = (await transform(cssSource, { loader: 'css', minify: true })).code;
  await writeFile(join(DIST, 'styles/main.css'), css);

  // 3) 그대로 옮기는 것들
  await cp(join(ROOT, 'assets'), join(DIST, 'assets'), { recursive: true });
  await cp(join(ROOT, 'manifest.webmanifest'), join(DIST, 'manifest.webmanifest'));

  // 4) index.html: 개발용 모듈 진입점을 묶음으로 바꾼다
  // 개발용 import map(three.js 위치)은 묶음에는 필요 없다
  const html = (await read('index.html')).replace(/<!-- 개발용: 묶지 않은 모듈이[^\n]*\n<script type="importmap">[^\n]*<\/script>\n/, '');
  must(html, '<script type="module" src="./src/main.js"></script>', 'index.html');
  if (html.includes('importmap')) throw new Error('빌드 실패: index.html 의 import map 을 지우지 못했습니다');
  const devScript = '<script type="module" src="./src/main.js"></script>';
  must(html, devScript, 'index.html');
  await writeFile(join(DIST, 'index.html'), html.replace(devScript, '<script type="module" src="./app.js"></script>'));

  // 5) 서비스 워커: 지금까지 만든 파일 전부를 미리 저장 목록에 넣는다
  const files = (await walk(DIST)).map((f) => relative(DIST, f).split(sep).join('/')).sort();
  const hash = createHash('sha256');
  for (const f of files) hash.update(f).update(await readFile(join(DIST, f)));
  const version = hash.digest('hex').slice(0, 12);
  const precache = ['./', ...files.filter((f) => !f.endsWith('.txt')).map((f) => `./${f}`)];
  let sw = await read('sw.js');
  must(sw, "const VERSION = 'dev';", 'sw.js');
  must(sw, 'const PRECACHE = [];', 'sw.js');
  sw = sw.replace("const VERSION = 'dev';", `const VERSION = '${version}';`).replace('const PRECACHE = [];', `const PRECACHE = ${JSON.stringify(precache)};`);
  await writeFile(join(DIST, 'sw.js'), sw);

  // 6) 파일 하나짜리 판
  const dataUri = async (path, mime) => `data:${mime};base64,${(await readFile(join(ROOT, path))).toString('base64')}`;
  let singleCss = css;
  for (const font of ['BagelFatOne', 'GowunDodum']) {
    const ref = `../assets/fonts/${font}.woff2`;
    must(singleCss, ref, 'main.css');
    singleCss = singleCss.split(ref).join(await dataUri(`assets/fonts/${font}.woff2`, 'font/woff2'));
  }
  let single = html.replace(devScript, () => `<script>${inlineJs}</script>`);
  must(single, '<link rel="stylesheet" href="./styles/main.css">', 'index.html');
  single = single.replace('<link rel="stylesheet" href="./styles/main.css">', () => `<style>${singleCss}</style>`);
  // 따로 받아 올 파일이 없도록 매니페스트·미리 받기·터치 아이콘 줄은 빼고, 파비콘만 품는다
  single = single
    .split('\n')
    .filter((line) => !/rel="(manifest|preload|apple-touch-icon)"/.test(line))
    .join('\n');
  const favicon = '<link rel="icon" type="image/png" href="./assets/icons/favicon-64.png">';
  must(single, favicon, 'index.html');
  single = single.replace(favicon, `<link rel="icon" type="image/png" href="${await dataUri('assets/icons/favicon-64.png', 'image/png')}">`);
  await writeFile(join(DIST, 'shh-ufo.html'), single);

  const kb = async (p) => `${((await stat(join(DIST, p))).size / 1024).toFixed(0)} KB`;
  console.log(`빌드 완료 (버전 ${version})`);
  console.log(`  dist/app.js          ${await kb('app.js')}`);
  console.log(`  dist/styles/main.css ${await kb('styles/main.css')}`);
  console.log(`  dist/shh-ufo.html    ${await kb('shh-ufo.html')}  (파일 하나짜리 판)`);
  console.log(`  미리 저장 목록 ${precache.length}개`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
