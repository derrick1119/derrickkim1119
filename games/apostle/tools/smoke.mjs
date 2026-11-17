// 실제 브라우저에서 한 바퀴:  node tools/smoke.mjs
// 첫 화면 → 이야기 → 깃들기 · 불 켜기 · 걷기 · 뛰기 → 멈춤 → 장 끝과 별 → 다음 장 → 이어하기 · 장 고르기 → 꺼짐과 되돌아옴 → 결말 → 영어 · 터치
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await serve(8752);
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
  await page.goto('http://localhost:8752/index.html');
  await ready(page);
  return page;
}
const ready = async (page) => { await page.waitForFunction(() => window.__lamp, null, { timeout: 90000 }); await page.evaluate(() => { const s = window.__lamp.scene; s.setQuality('low'); s.locked = true; }); };
const G = (page, fn, arg) => page.evaluate(fn, arg);
const until = (page, fn, arg, timeout = 60000) => page.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const ghost = (page, kind) => page.evaluate(async (kind) => {
  const L = window.__lamp;
  const { runGhost } = await import('/tools/ghost-run.mjs');
  const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
  const r = runGhost(null, GHOSTS[L.world.L.id][kind], { world: L.world, keepEvents: true });
  return { ok: r.ok, fail: r.fail, done: r.done, alive: r.alive, total: r.total, fades: r.fades };
}, kind);
const skip = async (page) => { for (let i = 0; i < 6; i++) { if (await G(page, () => window.__lamp.state !== 'story')) break; await page.keyboard.press('Enter'); await page.waitForTimeout(120); } };

{
  const page = await open();
  check('첫 화면이 뜬다', await G(page, () => window.__lamp.state === 'title' && !document.getElementById('screen-title').classList.contains('hidden')));
  check('이어하기 · 장 고르기는 아직 없다', await G(page, () => document.getElementById('btnContinue').classList.contains('hidden') && document.getElementById('btnChapters').classList.contains('hidden')));
  await page.waitForTimeout(800);
  const info = await G(page, () => { const i = window.__lamp.scene.renderer.info; return { tris: i.render.triangles, calls: i.render.calls }; });
  check('3D 장면이 그려진다', info.tris > 5000, `(삼각형 ${info.tris}, 호출 ${info.calls})`);

  await page.click('#btnStart');
  check('시작하면 이야기가 먼저 나온다', await G(page, () => window.__lamp.state === 'story' && document.getElementById('story').classList.contains('on') && document.getElementById('storyText').textContent.length > 10));
  await page.keyboard.press('Enter'); await page.waitForTimeout(150); await page.keyboard.press('Enter');
  check('이야기를 넘기면 빛 알갱이로 시작한다', await until(page, () => window.__lamp.state === 'play' && window.__lamp.world.S.host === -1));
  await page.keyboard.down('ArrowRight'); await page.keyboard.down('ArrowDown');
  check('방향키로 날아 등불 곁으로', await until(page, () => { const a = window.__lamp.world.pos(); return Math.hypot(a.x - 6.5, a.y - 13.65) < 0.9; }));
  await page.keyboard.up('ArrowRight'); await page.keyboard.up('ArrowDown');
  check('깃들 수 있다고 알려 준다', await until(page, () => document.getElementById('hint').classList.contains('on') && document.getElementById('hintKey').textContent === 'E'));
  await page.keyboard.press('KeyE');
  check('E 로 등불에 깃든다', await until(page, () => window.__lamp.world.host && window.__lamp.world.host.kind === 'lantern'));
  check('깃든 것의 쓰임새를 한 줄로 알려 준다', await until(page, () => document.getElementById('tip').classList.contains('on') && document.getElementById('tip').textContent.length > 5));
  await page.keyboard.press('KeyX');
  check('X 로 불을 켠다', await until(page, () => window.__lamp.world.host.on));
  await page.keyboard.down('ArrowRight');
  check('→ 로 걷는다', await until(page, () => window.__lamp.world.host.x > 8.5));
  await page.keyboard.up('ArrowRight');
  await page.keyboard.down('Space');
  check('Space 로 뛴다', await until(page, () => window.__lamp.world.host.y < 13.6));
  await page.keyboard.up('Space');
  await page.keyboard.press('KeyE');
  check('E 로 다시 빛 알갱이가 된다', await until(page, () => window.__lamp.world.S.host === -1));
  await page.keyboard.press('Escape');
  check('Esc 로 멈춘다', await until(page, () => window.__lamp.state === 'pause'));
  const t0 = await G(page, () => window.__lamp.world.S.t);
  await page.waitForTimeout(400);
  check('멈춘 동안 세계가 흐르지 않는다', (await G(page, () => window.__lamp.world.S.t)) === t0);
  await page.click('#btnResume');

  // 꺼짐 → 제단의 순간으로
  await G(page, () => { const L = window.__lamp; L.startStage(0, false); });
  const g0 = await page.evaluate(async () => { const L = window.__lamp; const { runGhost } = await import('/tools/ghost-run.mjs'); const { GHOSTS } = await import('/tools/ghost-scripts.mjs'); const s = GHOSTS.forest.bright; const r = runGhost(null, s, { world: L.world, upto: s.indexOf('>35.5') + 1, keepEvents: true }); return { ok: r.ok, cp: L.world.S.cp, x: L.world.pos().x }; });
  check('제단에 닿는다', g0.ok && g0.cp === 0, JSON.stringify(g0));
  await G(page, () => { const w = window.__lamp.world; w.S.inv = 0; w.damage(3); });
  check('빛이 다 꺼지면 화면이 어두워진다', await until(page, () => +document.getElementById('fx-fade').style.opacity > 0.9));
  check('제단의 순간으로 되돌아온다', await until(page, () => { const w = window.__lamp.world; return w.S.fade <= 0 && w.S.pips === 3 && w.fades === 1 && Math.abs(w.pos().x - 36.5) < 1.3; }));

  // 첫 장을 끝까지
  await G(page, () => window.__lamp.startStage(0, false));
  const g1 = await ghost(page, 'bright');
  check('첫 장을 끝까지 간다 (꺼뜨리며)', g1.ok && g1.done && g1.alive < g1.total, JSON.stringify(g1));
  check('장 끝 화면이 뜬다', await until(page, () => window.__lamp.state === 'clear' && !document.getElementById('screen-clear').classList.contains('hidden')));
  check('남은 아이만큼 별이 켜져 있다', await G(page, (g) => { const st = document.querySelectorAll('#clearStars .star'); return st.length === g.total && document.querySelectorAll('#clearStars .star.on').length === g.alive; }, g1));
  check('결과가 저장되고 다음 장이 열린다', await G(page, (g) => { const s = window.__lamp.save; return s.stage === 1 && s.results[0] && s.results[0].alive === g.alive; }, g1));
  await page.click('#btnNext');
  check('장 사이의 이야기', await until(page, () => window.__lamp.state === 'story'));
  await skip(page);
  check('둘째 장이 시작된다', await until(page, () => window.__lamp.state === 'play' && window.__lamp.stage === 1 && window.__lamp.world.L.id === 'castle'));
  const g2 = await ghost(page, 'spare');
  check('둘째 장을 하나도 꺼뜨리지 않고', g2.ok && g2.done && g2.alive === g2.total, JSON.stringify(g2));
  check('별이 모두 켜진 장 끝 화면', await until(page, () => window.__lamp.state === 'clear' && document.querySelectorAll('#clearStars .star.on').length === document.querySelectorAll('#clearStars .star').length));

  await page.reload(); await ready(page);
  check('다시 열면 이어하기 · 장 고르기가 있다', await G(page, () => !document.getElementById('btnContinue').classList.contains('hidden') && !document.getElementById('btnChapters').classList.contains('hidden')));
  await page.click('#btnChapters');
  check('장 고르기: 열린 장만 고를 수 있다', await G(page, () => { const b = [...document.querySelectorAll('#chapterList .chapter')]; return b.length === 4 && !b[0].disabled && !b[2].disabled && b[3].disabled && /★/.test(b[0].textContent); }));
  await page.click('#chapterList .chapter[data-i="2"]');
  await skip(page);
  check('셋째 장으로', await until(page, () => window.__lamp.state === 'play' && window.__lamp.world.L.id === 'cliff'));
  const g3 = await ghost(page, 'bright');
  check('셋째 장을 끝까지', g3.ok && g3.done, JSON.stringify(g3));
  await until(page, () => window.__lamp.state === 'clear');
  await page.click('#btnNext'); await skip(page); await skip(page);
  check('마지막 장으로', await until(page, () => window.__lamp.state === 'play' && window.__lamp.world.L.id === 'garden'));
  const g4 = await ghost(page, 'gentle');
  check('마지막 장: 검으로도 아무도 꺼뜨리지 않고', g4.ok && g4.done && g4.alive === g4.total, JSON.stringify(g4));
  check('결말의 이야기가 시작된다', await until(page, () => window.__lamp.state === 'story' && document.getElementById('storyText').textContent.length > 10, null, 90000));
  await page.keyboard.press('Enter');
  check('불빛을 낮추면 별이 뜬다', await until(page, () => window.__lamp.scene.starList && window.__lamp.scene.starList.length === 34 && window.__lamp.scene.night > 0.5, null, 90000));
  check('결말 화면', await until(page, () => { if (window.__lamp.state === 'story') document.getElementById('story').click(); return !document.getElementById('screen-end').classList.contains('hidden'); }, null, 120000));
  const want = g1.alive + g2.alive + g3.alive + g4.alive;
  check('뜬 별의 수 = 네 장에서 남긴 아이들의 수', await G(page, (w) => document.getElementById('endCount').textContent === `${w} / 34` && document.querySelectorAll('#endStars .star.on').length === w, want), `(기대 ${want} / 34, 화면 ${await G(page, () => document.getElementById('endCount').textContent + ' · 켜진 별 ' + document.querySelectorAll('#endStars .star.on').length + ' · 저장 ' + JSON.stringify(window.__lamp.save.results.map((r) => r && r.alive)))})`);
  await page.context().close();
}
{
  const page = await open({ locale: 'en-US' });
  check('영어 환경에서는 영어로', await G(page, () => document.querySelector('h1').textContent === 'Apostle of Light' && document.getElementById('btnStart').textContent === 'Begin'));
  await page.click('#screen-title [data-lang]');
  check('언어를 바꿀 수 있다', await G(page, () => document.querySelector('h1').textContent === '빛의 사도'));
  await page.context().close();
}
{
  const page = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  check('터치 기기에서는 화면 버튼이 나온다', await G(page, () => document.body.classList.contains('touch')));
  await page.tap('#btnStart'); await page.waitForTimeout(200); await page.tap('#story'); await page.waitForTimeout(200); await page.tap('#story');
  check('터치로 이야기를 넘기고 시작', await until(page, () => window.__lamp.state === 'play'));
  check('버튼 일곱 개가 화면 안에 있다', await G(page, () => ['tLeft', 'tRight', 'tUp', 'tDown', 'tJump', 'tAct', 'tPos'].every((id) => { const r = document.getElementById(id).getBoundingClientRect(); return r.width > 40 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight; })));
  await G(page, () => { for (const id of ['tRight', 'tDown']) document.getElementById(id).dispatchEvent(new PointerEvent('pointerdown', { pointerId: id === 'tRight' ? 7 : 8, pointerType: 'touch', bubbles: true })); });
  check('버튼으로 날아간다', await until(page, () => { const a = window.__lamp.world.pos(); return Math.hypot(a.x - 6.5, a.y - 13.65) < 0.9; }));
  await G(page, () => { for (const id of ['tRight', 'tDown']) document.getElementById(id).dispatchEvent(new PointerEvent('pointerup', { pointerId: id === 'tRight' ? 7 : 8, pointerType: 'touch', bubbles: true })); });
  await page.tap('#tPos');
  check('깃들기 버튼', await until(page, () => window.__lamp.world.host && window.__lamp.world.host.kind === 'lantern'));
  await page.tap('#tAct');
  check('하는 일 버튼', await until(page, () => window.__lamp.world.host.on));
  await page.tap('#btnPause');
  check('멈춤 버튼', await until(page, () => window.__lamp.state === 'pause'));
  await page.context().close();
}

await browser.close(); server.close();
if (errors.length) { console.log('\n오류:\n' + [...new Set(errors)].join('\n')); fails++; }
console.log(`\n${n}개 중 ${fails ? fails + '개 실패' : '모두 통과'}`);
process.exit(fails ? 1 : 0);
