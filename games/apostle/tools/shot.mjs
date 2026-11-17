// 실제 브라우저로 띄워 스크린샷을 찍는다:  node tools/shot.mjs <outDir> [이름 일부,...]
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const out = process.argv[2] || 'shots', only = process.argv[3] || '';
const want = (name) => !only || only.split(',').some((o) => name.includes(o));
const server = await serve(8751);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];

async function open(w, h, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: opts.dsf || 1, hasTouch: !!opts.touch, isMobile: !!opts.touch, locale: process.env.LOCALE || 'ko-KR' });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8751/index.html');
  await page.waitForFunction(() => window.__lamp, null, { timeout: 90000 });
  await page.waitForTimeout(500);
  return page;
}
// 길 i 를 열고, 대본(kind)을 cmd 가 nth 번째로 나오는 곳까지 돌린 장면. extra 는 그 뒤에 세계를 조금 더 만지는 코드.
async function scene(page, name, i, kind, cmd, nth = 1, extra = '', clip = null) {
  if (!want(name)) return;
  await page.evaluate(async ({ i, kind, cmd, nth, extra }) => {
    const G = window.__lamp;
    const { runGhost } = await import('/tools/ghost-run.mjs');
    const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
    G.startStage(i, false);
    const s = GHOSTS[G.LEVELS[i].id][kind];
    let upto = 0, k = 0; if (cmd === '*') upto = s.length; else for (let j = 0; j < s.length; j++) if (s[j] === cmd && ++k === nth) { upto = j + 1; break; }
    runGhost(null, s, { world: G.world, upto, strict: false, keepEvents: true });
    if (extra) new Function('w', 'S', 'v', extra)(G.world, G.world.S, G.world.host);
    G.scene.snap(G.world); G.noFade();
  }, { i, kind, cmd, nth, extra });
  await page.waitForTimeout(1100);
  await page.screenshot({ path: `${out}/${name}.png`, ...(clip ? { clip } : {}) });
}
const still = 'for (let n = 0; n < 60; n++) w.step({ ax: 0, ay: 0 });';

{
  const page = await open(1280, 720);
  if (want('01-title')) { await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/01-title.png` }); }
  await scene(page, '10-forest-wisp', 0, 'bright', 'R', 1);
  await scene(page, '11-forest-day', 0, 'bright', 'on', 1, 'for (let n = 0; n < 75; n++) w.step({ ax: 1, ay: 0 }); for (let n = 0; n < 20; n++) w.step({ ax: 0, ay: 0 });');
  await scene(page, '12-forest-night', 0, 'bright', '>27.2', 1, still);
  await scene(page, '13-forest-dusky', 0, 'bright', '>35.5', 1, 'for (let n = 0; n < 230; n++) w.step({ ax: 1, ay: 0 });');
  await scene(page, '14-forest-tunnel', 0, 'spare', '>71', 1, 'for (let n = 0; n < 200; n++) w.step({ ax: -1, ay: 0 });');
  await scene(page, '15-forest-goal', 0, 'spare', '>112.4', 1, still);
  await scene(page, '20-castle-rope', 1, 'bright', '>7.3', 1, still);
  await scene(page, '21-castle-climb', 1, 'bright', '>21.6', 1, 'for (let n = 0; n < 30; n++) w.step({ ax: 1, jump: true }); for (let n = 0; n < 30; n++) w.step({ ax: 1 });');
  await scene(page, '22-castle-ledge', 1, 'bright', '>60.6', 1, still);
  await scene(page, '23-castle-park', 1, 'spare', '>81.5', 1, 'for (let n = 0; n < 150; n++) w.step({ ax: -1 }); for (let n = 0; n < 20; n++) w.step({ ax: 0 });');
  await scene(page, '24-castle-guardian', 1, 'bright', '>89.2', 1, 'for (let n = 0; n < 260; n++) w.step({ ax: 1, jump: n < 40 }); for (let n = 0; n < 30; n++) w.step({ ax: 0 });');
  await scene(page, '30-cliff-crystals', 2, 'bright', '?S.crystals[1].lit', 1, still);
  await scene(page, '31-cliff-peg', 2, 'bright', '?v.ground&&v.y<13', 1, still);
  await scene(page, '32-cliff-lichen', 2, 'bright', '?S.gates[0].open', 1, still);
  await scene(page, '33-cliff-shaft', 2, 'bright', '?v.ground&&v.y<6.6', 1, still);
  await scene(page, '40-garden-start', 3, 'spare', 'F:5.5,13.65', 1, still);
  await scene(page, '41-garden-pads', 3, 'spare', '>18.8', 1, 'w.step({ ax: 1, act: true }); for (let n = 0; n < 220; n++) w.step({ ax: 1 }); for (let n = 0; n < 20; n++) w.step({ ax: 0 });');
  await scene(page, '42-garden-guardian', 3, 'spare', '>50.4', 1, still);
  if (want('45-ending')) {
    await scene(page, '45-ending-lamp', 3, 'bright', '*', 1, '');
    await page.waitForFunction(() => window.__lamp.state === 'story', null, { timeout: 120000 });
    await page.screenshot({ path: `${out}/45-ending-question.png` });
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => window.__lamp.scene.night > 0.97, null, { timeout: 120000 });
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `${out}/46-ending-sky.png` });
    await page.waitForFunction(() => { if (window.__lamp.state === 'story') document.getElementById('story').click(); return !document.getElementById('screen-end').classList.contains('hidden'); }, null, { timeout: 120000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/47-end.png` });
  }
  await page.context().close();
}
if (want('close')) {
  const page = await open(1280, 720, { dsf: 2 });
  await scene(page, '50-close-lantern', 0, 'bright', '>16.6', 1, 'w.step({ ax: 0, act: true }); ' + still, { x: 400, y: 300, width: 560, height: 360 });
  await scene(page, '51-close-sword', 1, 'bright', '>7.3', 1, still, { x: 400, y: 300, width: 560, height: 360 });
  await scene(page, '52-close-dusky', 0, 'bright', '>35.5', 1, 'for (let n = 0; n < 300; n++) w.step({ ax: 1, ay: 0 }); w.step({ ax: 0, act: true }); w.S.creatures[0].alive = true; for (let n = 0; n < 20; n++) w.step({ ax: 0 });', { x: 360, y: 300, width: 640, height: 360 });
  await page.context().close();
}
if (want('mobile')) {
  const page = await open(844, 390, { dsf: 2, touch: true });
  await scene(page, '60-mobile', 1, 'bright', '>60.6', 1, still);
  await page.context().close();
}
await browser.close(); server.close();
if (errors.length) { console.log('ERRORS:\n' + [...new Set(errors)].join('\n')); process.exit(1); }
console.log('screenshots ok →', out);
