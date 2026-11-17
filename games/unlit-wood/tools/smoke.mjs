// 실제 브라우저에서 한 바퀴:  node tools/smoke.mjs
// 첫 화면 → 시작 → 키보드로 움직이기 → 멈춤 → 등불 저장 → 깨짐과 되살아남 → 이어하기 → 끝까지 → 영어 · 터치
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await serve(8744);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
let fails = 0, n = 0;
const check = (name, ok, extra = '') => { n++; if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${name}${extra ? '  ' + extra : ''}`); };

async function open(ctxOpt = {}) {
  const ctx = await browser.newContext({ viewport: { width: 480, height: 270 }, locale: 'ko-KR', ...ctxOpt });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8744/index.html');
  await page.waitForFunction(() => window.__lamp, null, { timeout: 90000 });
  await page.evaluate(() => { const s = window.__lamp.scene; s.setQuality('low'); s.locked = true; });   // 소프트웨어 렌더러에서 빨리 돌게
  return page;
}
const G = (page, fn, arg) => page.evaluate(fn, arg);
const until = (page, fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const ghost = (page, upto) => page.evaluate(async (upto) => {
  const L = window.__lamp;
  const { runGhost } = await import('/tools/ghost-run.mjs');
  const { GHOST } = await import('/tools/ghost-script.mjs');
  const i = typeof upto === 'string' ? GHOST.indexOf(upto) + 1 : upto;
  const r = runGhost(null, GHOST, { world: L.world, upto: i, keepEvents: true });
  return { ok: r.ok, fail: r.fail, ended: r.ended, flowers: r.flowers, deaths: r.deaths, cracks: r.cracks, cp: L.world.cp };
}, upto);

{
  const page = await open();
  check('첫 화면이 뜬다', await G(page, () => window.__lamp.state === 'title' && !document.getElementById('screen-title').classList.contains('hidden')));
  check('이어하기는 아직 없다', await G(page, () => document.getElementById('btnContinue').classList.contains('hidden')));
  await page.waitForTimeout(800);
  const info = await G(page, () => { const i = window.__lamp.scene.renderer.info; return { tris: i.render.triangles, calls: i.render.calls }; });
  check('3D 장면이 그려진다', info.tris > 5000, `(삼각형 ${info.tris}, 호출 ${info.calls})`);

  await page.click('#btnStart');
  check('시작하면 불이 꺼진 채 깨어난다', await G(page, () => window.__lamp.state === 'play' && !window.__lamp.world.p.lit));
  check('불빛 버튼을 알려 준다', await until(page, () => document.getElementById('hint').dataset.k === 'light'));
  await page.keyboard.press('KeyF');
  check('F 로 불이 켜진다', await until(page, () => window.__lamp.world.p.lit));
  check('다음은 이동을 알려 준다', await until(page, () => document.getElementById('hint').dataset.k === 'move'));
  await page.keyboard.down('ArrowRight');
  check('→ 로 걷는다', await until(page, () => window.__lamp.world.p.x > 8.2));
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');
  check('Space 로 뛴다', await until(page, () => window.__lamp.world.p.y < 13.6));
  await page.keyboard.up('Space');
  await page.keyboard.press('Escape');
  check('Esc 로 멈춘다', await until(page, () => window.__lamp.state === 'pause' && !document.getElementById('screen-pause').classList.contains('hidden')));
  const t0 = await G(page, () => window.__lamp.world.t);
  await page.waitForTimeout(500);
  check('멈춘 동안 세계가 흐르지 않는다', (await G(page, () => window.__lamp.world.t)) === t0);
  await page.click('#btnResume');
  check('계속', await G(page, () => window.__lamp.state === 'play'));

  // 등불까지 자동 플레이 → 저장
  await G(page, () => window.__lamp.begin(null));
  const g1 = await ghost(page, '>33');
  check('첫 등불에 닿는다', g1.ok && g1.cp === 0, JSON.stringify(g1));
  check('등불에서 저장된다', await until(page, () => window.__lamp.save.progress && window.__lamp.save.progress.cp === 0 && window.__lamp.save.progress.flowers[0] === true));
  // 깨짐 → 되살아남
  await G(page, () => window.__lamp.world.shatter('test'));
  check('깨지면 화면이 어두워진다', await until(page, () => +document.getElementById('fx-fade').style.opacity > 0.9));
  check('등불에서 되살아난다', await until(page, () => { const w = window.__lamp.world; return !w.p.dead && w.deaths === 1 && Math.abs(w.p.x - 33.5) < 0.5 && w.p.lit; }));
  // 상자를 손으로 끌어 본다 (잡기 키)
  await G(page, () => { const w = window.__lamp.world; w.p.x = 43.3; w.p.y = 14; w.p.vx = 0; });
  await page.keyboard.down('ShiftLeft'); await page.keyboard.down('ArrowRight');
  check('Shift 로 상자를 끈다', await until(page, () => window.__lamp.world.crates[0].x > 43.2));
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ShiftLeft');

  await page.reload();
  await page.waitForFunction(() => window.__lamp, null, { timeout: 90000 });
  await G(page, () => { const s = window.__lamp.scene; s.setQuality('low'); s.locked = true; });
  check('다시 열면 이어하기가 있다', await G(page, () => !document.getElementById('btnContinue').classList.contains('hidden')));
  await page.click('#btnContinue');
  check('이어하면 등불에서 선다', await G(page, () => { const w = window.__lamp.world; return w.cp === 0 && w.p.lit && w.flowers[0].on && w.deaths === 1; }));

  // 끝까지
  await G(page, () => window.__lamp.begin(null));
  const g2 = await ghost(page, undefined);
  check('브라우저에서도 끝까지 간다', g2.ok && g2.ended && g2.flowers === 7 && g2.deaths === 0, JSON.stringify(g2));
  check('끝 화면이 뜬다', await until(page, () => window.__lamp.state === 'end' && !document.getElementById('screen-end').classList.contains('hidden'), null, 120000));
  check('끝 화면의 숫자', await G(page, () => document.getElementById('endFlowers').textContent === '7 / 7' && document.getElementById('endDeaths').textContent === '0'));
  check('끝나면 이어하기 기록이 지워진다', await G(page, () => window.__lamp.save.done === true && window.__lamp.save.progress === null));
  await page.click('#btnAgain');
  check('처음부터 다시', await G(page, () => window.__lamp.state === 'play' && window.__lamp.world.playT < 1 && window.__lamp.world.cp === -1));
  await page.context().close();
}
{
  const page = await open({ locale: 'en-US' });
  check('영어 환경에서는 영어로', await G(page, () => document.querySelector('h1').textContent === 'The Unlit Wood' && document.getElementById('btnStart').textContent === 'Begin'));
  await page.click('#screen-title [data-lang]');
  check('언어를 바꿀 수 있다', await G(page, () => document.querySelector('h1').textContent === '불 꺼진 숲'));
  await page.context().close();
}
{
  const page = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  check('터치 기기에서는 화면 버튼이 나온다', await G(page, () => document.body.classList.contains('touch')));
  await page.tap('#btnStart');
  check('터치로 시작', await G(page, () => window.__lamp.state === 'play'));
  check('버튼이 보인다', await G(page, () => ['tLeft', 'tRight', 'tJump', 'tLight', 'tGrab'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 40 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })));
  await page.tap('#tLight');
  check('불빛 버튼', await until(page, () => window.__lamp.world.p.lit));
  const box = await page.locator('#tRight').boundingBox();
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await G(page, () => document.getElementById('tRight').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', bubbles: true })));
  check('오른쪽 버튼을 누르고 있으면 걷는다', await until(page, () => window.__lamp.world.p.x > 7.6));
  await G(page, () => document.getElementById('tRight').dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', bubbles: true })));
  await page.tap('#btnPause');
  check('멈춤 버튼', await until(page, () => window.__lamp.state === 'pause'));
  await page.context().close();
}

await browser.close();
server.close();
if (errors.length) { console.log('\n오류:\n' + [...new Set(errors)].join('\n')); fails++; }
console.log(`\n${n - fails >= 0 ? n : 0}개 중 ${fails ? fails + '개 실패' : '모두 통과'}`);
process.exit(fails ? 1 : 0);
