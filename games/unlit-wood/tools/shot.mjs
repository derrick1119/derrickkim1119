// 실제 브라우저로 띄워 스크린샷을 찍는다:  node tools/shot.mjs [outDir] [only]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const out = process.argv[2] || 'shots', only = process.argv[3] || '';
const server = await serve(8743);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8743/index.html');
  await page.waitForFunction(() => window.__lamp, null, { timeout: 60000 });
  await page.waitForTimeout(600);
  return page;
}

// 자동 플레이 대본을 upto 번째 명령까지 돌린 장면. extra 는 그 뒤에 세계를 조금 더 만지는 코드.
async function scene(page, upto, name, extra, wait = 900, clip = null) {
  if (only && !only.split(',').some((o) => name.includes(o))) return;
  await page.evaluate(async ({ upto, extra }) => {
    const G = window.__lamp;
    const { runGhost } = await import('/tools/ghost-run.mjs');
    const { GHOST } = await import('/tools/ghost-script.mjs');
    if (G.state !== 'play') G.begin(null);
    const { World } = await import('/js/world.js');
    G.world = new World(G.LEVEL);
    runGhost(null, GHOST, { world: G.world, upto, strict: false });
    if (extra) new Function('w', 'p', extra)(G.world, G.world.p);
    G.world.events.length = 0;
    G.scene.burst.clear(); G.scene.hero.reset(); G.scene.snap(G.world); G.noFade();
  }, { upto, extra });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${out}/${name}.png`, ...(clip ? { clip } : {}) });
}

{
  const page = await open(1280, 720);
  if (!only || only.includes('title')) { await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/01-title.png` }); }
  await scene(page, 4, '10-wake', 'p.face = 1;');
  await scene(page, 0, '11-dark', '');
  await scene(page, 9, '12-pit');
  await scene(page, 26, '13-crate');
  await scene(page, 39, '14-plateau');
  await scene(page, 44, '15-burrow-dark');
  await scene(page, 44, '16-burrow-lit', 'p.lit = true; for (let i = 0; i < 150; i++) w.step({ ax: 0, light: false });');
  await scene(page, 60, '17-hollow');
  await scene(page, 65, '18-stalker-dark', 'for (let i = 0; i < 60; i++) w.step({ ax: 0 });');
  await scene(page, 73, '19-pull');
  await scene(page, 89, '20-yard');
  await scene(page, 90, '21-yard-run', 'for (let i = 0; i < 200; i++) w.step({ ax: 1 });');
  await scene(page, 94, '22-lift', '');
  await scene(page, 103, '23-bridge');
  await scene(page, 113, '24-bridge-dark');
  await scene(page, 122, '25-tide', 'for (let i = 0; i < 150; i++) w.step({ ax: 0 });');
  await scene(page, 123, '26-lamp', 'for (let i = 0; i < 130; i++) w.step({ ax: 0 });');
  if (!only || only.includes('27-end')) { await page.waitForFunction(() => window.__lamp.state === 'end', null, { timeout: 120000 }); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/27-end.png` }); }
  await page.context().close();
}
if (only.includes('close')) {
  const page = await open(1280, 720, { dsf: 2 });
  await scene(page, 26, '50-close-hero', '', 900, { x: 440, y: 330, width: 520, height: 340 });
  await scene(page, 65, '51-close-stalker', 'for (let i = 0; i < 40; i++) w.step({ ax: 0 }); p.lit = true; for (let i = 0; i < 12; i++) w.step({ ax: 0 });', 900, { x: 380, y: 250, width: 640, height: 400 });
  await page.context().close();
}
if (!only || only.includes('mobile')) {
  const page = await open(844, 390, { dsf: 2, touch: true });
  await scene(page, 26, '40-mobile-landscape');
  await page.context().close();
  const page2 = await open(390, 844, { dsf: 2, touch: true });
  await page2.screenshot({ path: `${out}/41-mobile-title.png` });
  await scene(page2, 60, '42-mobile-portrait');
  await page2.context().close();
}
{ const page = await open(640, 360); const info = await page.evaluate(() => { const i = window.__lamp.scene.renderer.info; return { calls: i.render.calls, tris: i.render.triangles, geos: i.memory.geometries }; }); console.log('render info', JSON.stringify(info)); await page.context().close(); }
await browser.close();
server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('screenshots ok →', out);
