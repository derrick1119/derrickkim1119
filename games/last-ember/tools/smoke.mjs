// 실제 브라우저에서 한 바퀴 돌려 보는 스모크 테스트:  node tools/smoke.mjs
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await serve(8732);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ko-KR' });
const page = await ctx.newPage();
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });

let failed = 0;
function check(name, ok, extra = '') {
  console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${extra ? '  ' + extra : ''}`);
  if (!ok) failed++;
}
const visible = (sel) => page.locator(sel).isVisible();
const G = (expr) => page.evaluate(`(() => { const L = window.__lamp, g = L.game; return ${expr}; })()`);

// 게임을 빠르게 돌린다 (화면과 무관하게 로직만). until 이 참이 되면 멈춘다.
async function fast(until, { invincible = true, max = 60 * 600 } = {}) {
  return page.evaluate(({ until, invincible, max }) => {
    const g = window.__lamp.game, stop = new Function('g', 'return ' + until);
    let n = 0;
    while (n++ < max && !stop(g)) {
      if (g.state !== 'playing' && g.state !== 'dawn') break;
      if (invincible) g.p.inv = 1;
      g.input.mx = Math.cos(g.t / 4); g.input.my = Math.sin(g.t / 4);
      g.update(1 / 60);
      g.events.length = 0;
    }
    return { state: g.state, t: g.t };
  }, { until, invincible, max });
}

await page.goto('http://localhost:8732/index.html');
await page.waitForTimeout(1200);
check('타이틀이 보인다', await visible('#screen-title'));
check('한국어로 시작한다', (await page.textContent('#btnStart')) === '밤으로 나서기');

await page.click('#btnStart');
await page.waitForTimeout(600);
check('게임이 시작된다', (await G('L.mode')) === 'run' && (await visible('#hud')));

const x0 = await G('g.p.x');
await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
check('키보드로 움직인다', (await G('g.p.x')) > x0 + 40);

await page.keyboard.press('Space'); await page.waitForTimeout(150);
check('Space 로 램프가 꺼진다', (await G('g.p.lit')) === false);
await page.waitForTimeout(1300);
await page.keyboard.press('Space'); await page.waitForTimeout(150);
check('다시 켜면 섬광이 터진다', (await G('g.p.lit')) === true && (await G('g.flares')) >= 1);

await fast('g.pending > 0 || g.state !== "playing"');
await page.waitForTimeout(300);
check('레벨업 화면이 뜬다', (await G('g.state')) === 'levelup' && (await visible('#overlay-level')));
check('카드가 세 장이다', (await page.locator('#cards .card').count()) === 3);
await page.waitForTimeout(450);
const before = await G('JSON.stringify(g.up)');
await page.keyboard.press('Digit1'); await page.waitForTimeout(250);
check('숫자 키로 고른다', (await G('JSON.stringify(g.up)')) !== before);
// 연달아 레벨업이 남아 있으면 마저 고른다
for (let i = 0; i < 6 && (await G('g.state')) === 'levelup'; i++) { await page.waitForTimeout(420); await page.keyboard.press('Digit1'); await page.waitForTimeout(120); }
check('게임으로 돌아온다', (await G('g.state')) === 'playing' && !(await visible('#overlay-level')));

await page.keyboard.press('Escape'); await page.waitForTimeout(200);
check('Esc 로 멈춘다', await visible('#overlay-pause'));
const tPaused = await G('g.t');
await page.waitForTimeout(400);
check('멈춘 동안 시간이 흐르지 않는다', (await G('g.t')) === tPaused);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);

// 죽음 → 결과
await page.evaluate(() => { const g = window.__lamp.game; g.p.revives = 0; g.p.inv = 0; g.hurtPlayer(99999, 'test'); });
await page.waitForTimeout(2600);
check('죽으면 결과 화면이 뜬다', await visible('#overlay-result'));
check('루멘이 저장된다', (await page.evaluate(() => JSON.parse(localStorage.getItem('thelamp.lastember.v1')).lumen)) > 0);

// 공방
await page.evaluate(() => { window.__lamp.save.lumen = 100; });
await page.click('#btnResWorkshop'); await page.waitForTimeout(250);
check('공방이 열린다', await visible('#screen-workshop'));
await page.locator('#metaGrid .buy').first().click(); await page.waitForTimeout(150);
check('강화를 살 수 있다', (await G('L.save.meta.glass')) === 1 && (await G('L.save.lumen')) === 70);
await page.click('#screen-workshop [data-back]'); await page.waitForTimeout(200);
check('결과 화면으로 돌아온다', await visible('#overlay-result'));

// 다시 도전 → 새벽까지
await page.click('#btnRetry'); await page.waitForTimeout(400);
check('다시 도전', (await G('L.mode')) === 'run' && (await G('g.t')) < 2 && (await G('g.stat.maxOil')) === 110);
for (let i = 0; i < 80; i++) {
  const r = await fast('g.pending > 0 || g.state === "dawn"');
  if (r.state === 'dawn' || r.state === 'won' || r.state === 'dead') break;
  await page.waitForTimeout(40);
  if ((await G('g.state')) === 'levelup') { await page.waitForTimeout(430); await page.keyboard.press('Digit' + (1 + (i % 3))); await page.waitForTimeout(60); }
}
check('새벽이 온다', ['dawn', 'won'].includes(await G('g.state')), await G('g.state + " t=" + Math.round(g.t)'));
await page.waitForTimeout(6500);
check('승리 결과 화면', (await visible('#overlay-result')) && (await page.textContent('#resTitle')) === '새벽을 맞았다');
check('다음 밤이 열린다', (await G('L.save.unlocked')) === 2 && (await visible('#btnNext')));

await page.click('#btnMenu'); await page.waitForTimeout(300);
check('처음으로 돌아간다', (await visible('#screen-title')) && (await G('L.mode')) === 'menu');
await page.click('#btnLang'); await page.waitForTimeout(150);
check('언어를 바꾼다', (await page.textContent('#btnStart')) === 'Step into the night');
await page.click('#btnLang');

// 터치: 조이스틱과 램프 버튼
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'ko-KR' });
const m = await mctx.newPage();
await m.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
m.on('pageerror', (e) => errors.push('mobile pageerror: ' + e.message));
await m.goto('http://localhost:8732/index.html');
await m.waitForTimeout(900);
await m.tap('#btnStart'); await m.waitForTimeout(500);
const cdp = await mctx.newCDPSession(m);
const mx0 = await m.evaluate(() => window.__lamp.game.p.x);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 120, y: 600, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 190, y: 600, id: 1 }] });
await m.waitForTimeout(500);
const mx1 = await m.evaluate(() => window.__lamp.game.p.x);
check('터치 조이스틱으로 움직인다', mx1 > mx0 + 30, `dx=${Math.round(mx1 - mx0)}`);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await m.tap('#btnLamp'); await m.waitForTimeout(150);
check('램프 버튼으로 끈다', (await m.evaluate(() => window.__lamp.game.p.lit)) === false);
await mctx.close();

await browser.close();
server.close();
if (errors.length) { console.log('브라우저 오류:\n' + [...new Set(errors)].join('\n')); failed++; }
console.log(failed ? `\nsmoke FAILED (${failed})` : '\nsmoke OK');
process.exit(failed ? 1 : 0);
