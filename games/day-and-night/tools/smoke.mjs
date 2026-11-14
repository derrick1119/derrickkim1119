// 실제 브라우저에서 한 바퀴 돌려 보는 스모크 테스트:  node tools/smoke.mjs
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await serve(8742);
const browser = await chromium.launch();
const errors = [];
let failed = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failed++;
}
async function open(opts) {
  const ctx = await browser.newContext({ locale: 'ko-KR', ...opts });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8742/index.html');
  await page.waitForTimeout(1000);
  return page;
}

const page = await open({ viewport: { width: 1280, height: 720 } });
const visible = (sel) => page.locator(sel).isVisible();
const G = (expr) => page.evaluate(`(() => { const L = window.__lamp, w = L.world, b = w.bulb; return ${expr}; })()`);
// 고스트 대본으로 지금 스테이지를 끝까지 (또는 upto 번째 명령까지) 몬다
const ghost = (id, upto) => page.evaluate(async ({ id, upto }) => {
  const { runGhost } = await import('/tools/ghost-run.mjs');
  const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
  const r = runGhost(null, GHOSTS[id], { world: window.__lamp.world, upto: upto ?? Infinity });
  return r.ok;
}, { id, upto });

check('타이틀이 보인다', await visible('#screen-title'));
check('한국어로 시작한다', (await page.textContent('#btnStart')) === '시작하기');
check('타이틀 뒤에서 데모가 돈다', (await G('L.mode')) === 'menu' && (await G('w.level.id')) === '1-2');

await page.click('#btnStart'); await page.waitForTimeout(500);
check('첫 스테이지가 시작된다', (await G('L.mode')) === 'play' && (await G('w.level.id')) === '1-1' && (await visible('#hud')));
check('안내 문구가 뜬다', (await visible('#tip')) && (await page.textContent('#tip')).includes('굴러'));

const x0 = await G('b.x');
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
check('키보드로 굴러간다', (await G('b.x')) > x0 + 40);
const y0 = await G('b.y');
await page.keyboard.down('Space'); await page.waitForTimeout(200);
const yUp = await G('b.y');
await page.keyboard.up('Space'); await page.waitForTimeout(700);
check('Space 로 뛴다', yUp < y0 - 20, `${Math.round(y0 - yUp)}px`);
await page.keyboard.press('ShiftLeft'); await page.waitForTimeout(150);
check('Shift 로 불이 꺼진다', (await G('b.on')) === false);
await page.keyboard.press('KeyE'); await page.waitForTimeout(150);
check('E 로 다시 켜진다', (await G('b.on')) === true);

await page.keyboard.press('Escape'); await page.waitForTimeout(200);
check('Esc 로 멈춘다', await visible('#overlay-pause'));
const tp = await G('w.time');
await page.waitForTimeout(300);
check('멈춘 동안 시간이 흐르지 않는다', (await G('w.time')) === tp);
await page.click('#btnResume'); await page.waitForTimeout(200);
check('계속하기', !(await visible('#overlay-pause')));

// 깨짐 → 되살아남
await page.evaluate(() => { window.__lamp.world.shatter('test'); });
await page.waitForTimeout(300);
check('깨지면 조각이 난다', (await G('w.state')) === 'dead' && (await G('L.renderer.shards.length')) > 0);
await page.waitForTimeout(1300);
check('잠시 뒤 되살아난다', (await G('w.state')) === 'play' && (await G('w.breaks')) === 1);

// 다시 시작해서 고스트로 끝까지
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
await page.click('#btnRestart'); await page.waitForTimeout(300);
check('처음부터 다시', (await G('w.time')) < 1 && (await G('w.breaks')) === 0);
check('고스트가 1-1 을 깬다', await ghost('1-1'));
await page.waitForTimeout(2300);
check('클리어 화면이 뜬다', (await visible('#overlay-clear')) && (await page.textContent('#clearTitle')) === '불이 들어왔다');
check('빛꽃 세 송이', (await page.locator('#clearFlowers i.on').count()) === 3);
check('기록이 저장된다', await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('thelamp2.v1')); return s.levels['1-1'].done && s.levels['1-1'].flowers === 3 && s.levels['1-1'].flawless; }));

await page.click('#btnNext'); await page.waitForTimeout(400);
check('다음 스테이지로', (await G('w.level.id')) === '1-2' && (await G('L.mode')) === 'play');

// 낮의 돌: 불을 끄면 사라진다
await ghost('1-2', 2);
check('불을 켜면 낮의 돌이 단단하다', (await G('w.blocks.filter(k => k.kind === "day" && k.solid).length')) > 0);
await page.keyboard.press('ShiftLeft'); await page.waitForTimeout(200);
check('불을 끄면 낮의 돌이 모두 사라진다', (await G('w.blocks.filter(k => k.kind === "day" && k.solid).length')) === 0);
await page.keyboard.press('ShiftLeft'); await page.waitForTimeout(150);

await page.keyboard.press('Escape'); await page.waitForTimeout(150);
await page.click('#btnQuit'); await page.waitForTimeout(300);
check('스테이지 선택으로', (await visible('#screen-select')) && (await G('L.mode')) === 'menu');
check('깬 스테이지만큼 열린다', (await page.locator('.stage:not(.locked)').count()) === 2);
await page.locator('.stage').nth(0).click(); await page.waitForTimeout(300);
check('스테이지를 골라 들어간다', (await G('w.level.id')) === '1-1');
await page.keyboard.press('Escape'); await page.waitForTimeout(150);
await page.click('#btnQuit'); await page.waitForTimeout(200);
await page.click('#screen-select [data-back]'); await page.waitForTimeout(200);
check('타이틀에 이어하기가 뜬다', (await page.textContent('#btnStart')).includes('1-2'));
await page.click('#btnLang'); await page.waitForTimeout(150);
check('언어를 바꾼다', (await page.textContent('#btnStages')) === 'Stages');
await page.click('#btnLang');

// 모든 스테이지를 실제 화면 루프 위에서 고스트로 깬다 (렌더링 경로 전부 통과)
const ids = await page.evaluate(async () => (await import('/js/levels.js')).LEVELS.map((l) => l.id));
let allOk = true;
for (let i = 0; i < ids.length; i++) {
  await page.evaluate((i) => window.__lamp.play(i), i);
  await page.waitForTimeout(120);
  // 중간중간 실제 프레임을 그리게 한다
  const steps = await page.evaluate(async (id) => (await import('/tools/ghost-scripts.mjs')).GHOSTS[id].length, ids[i]);
  let ok = true;
  for (let u = 6; u < steps + 6; u += 6) {
    ok = await page.evaluate(async ({ id, from, to }) => {
      const { runGhost } = await import('/tools/ghost-run.mjs');
      const { GHOSTS } = await import('/tools/ghost-scripts.mjs');
      window.__g = window.__g && window.__g.id === id ? window.__g : { id, done: 0 };
      // 이어서 실행할 수 없으므로 처음부터 to 까지 다시 몬다
      window.__lamp.play(window.__lamp.world ? (await import('/js/levels.js')).LEVELS.findIndex((l) => l.id === id) : 0);
      const r = runGhost(null, GHOSTS[id], { world: window.__lamp.world, upto: to >= GHOSTS[id].length ? Infinity : to });
      return r.ok;
    }, { id: ids[i], from: u - 6, to: u });
    await page.waitForTimeout(90);
    if (!ok) break;
  }
  const st = await G('w.state');
  if (!ok || st !== 'clear') { allOk = false; console.log(`     ${ids[i]} → ${st}`); }
}
check(`화면 위에서 ${ids.length}개 스테이지를 모두 깬다`, allOk);
await page.waitForTimeout(2300);
check('마지막 스테이지 뒤에는 엔딩 문구', (await visible('#overlay-clear')) && (await page.textContent('#clearTitle')) === '밤이 돌아왔다');
await page.context().close();

// 터치 버튼
const m = await open({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
await m.tap('#btnStart'); await m.waitForTimeout(500);
const MG = (expr) => m.evaluate(`(() => { const w = window.__lamp.world, b = w.bulb; return ${expr}; })()`);
check('터치 기기에서 화면 버튼이 보인다', await m.locator('#btnJump').isVisible());
const mx0 = await MG('b.x');
const box = await m.locator('#btnRight').boundingBox();
await m.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
const cdp = await m.context().newCDPSession(m);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }] });
await m.waitForTimeout(500);
check('▶ 버튼을 누르고 있으면 굴러간다', (await MG('b.x')) > mx0 + 40);
const jb = await m.locator('#btnJump').boundingBox();
const my0 = await MG('b.y');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 }, { x: jb.x + jb.width / 2, y: jb.y + jb.height / 2, id: 2 }] });
await m.waitForTimeout(220);
check('굴리면서 동시에 점프', (await MG('b.y')) < my0 - 20);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await m.waitForTimeout(700);
await m.tap('#btnLight'); await m.waitForTimeout(200);
check('빛 버튼으로 끈다', (await MG('b.on')) === false);
await m.context().close();

await browser.close();
server.close();
if (errors.length) { console.log('브라우저 오류:\n' + [...new Set(errors)].join('\n')); failed++; }
console.log(failed ? `\nsmoke FAILED (${failed})` : '\nsmoke OK');
process.exit(failed ? 1 : 0);
