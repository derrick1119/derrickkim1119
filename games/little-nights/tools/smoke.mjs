// 실제 브라우저(WebGL)에서 한 바퀴 돌려 보는 스모크 테스트:  node tools/smoke.mjs
import { createRequire } from 'node:module';
import { serve } from './serve.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const server = await serve(8762);
const browser = await chromium.launch();
const errors = [];
let failed = 0;
function check(name, ok, extra = '') { console.log(`${ok ? '  ok ' : 'FAIL '} ${name}${extra ? '  ' + extra : ''}`); if (!ok) failed++; }
async function open(opts) {
  const ctx = await browser.newContext({ locale: 'ko-KR', ...opts });
  const page = await ctx.newPage();
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|GPU stall/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto('http://localhost:8762/index.html');
  await page.waitForTimeout(1200);
  return page;
}

const page = await open({ viewport: { width: 1280, height: 720 } });
const visible = (sel) => page.locator(sel).isVisible();
const G = (expr) => page.evaluate(`(() => { const L = window.__lamp, s = L.s; return ${expr}; })()`);
const key = async (k, wait = 260) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };

check('3D 장면이 뜬다 (WebGL)', await G('L.scene.ok') && !(await visible('#nogl')));
check('타이틀이 보인다', await visible('#screen-title'));
check('타이틀 뒤에서 풀이가 재생된다', (await G('L.mode')) === 'menu');
const t0 = await G('s.t');
await page.waitForTimeout(1800);
check('데모가 진행된다', (await G('s.t')) > t0);

await page.click('#btnStart'); await page.waitForTimeout(500);
check('첫 뜰이 시작된다', (await G('L.mode')) === 'play' && (await G('L.LEVELS[L.idx].id')) === '1-1' && (await visible('#hud')));
check('안내 문구가 뜬다', await visible('#tip'));

const p0 = await G('s.p');
await key('ArrowRight');
check('방향키로 한 칸 굴러간다', (await G('s.p')) === p0 + 1 && (await G('s.t')) === 1);
await key('ArrowUp');
check('갈 수 없는 쪽은 턴을 쓰지 않는다', (await G('s.t')) === 1);
await key('Space');
check('Space 로 불을 끈다 (한 턴)', (await G('s.on')) === false && (await G('s.t')) === 2);
await key('KeyZ'); await key('KeyZ');
check('Z 로 무른다', (await G('s.t')) === 0 && (await G('s.on')) === true && (await G('s.p')) === p0);

// 힌트는 풀이기의 다음 수와 같다
await page.click('#btnHint'); await page.waitForTimeout(500);
const hintTxt = await page.textContent('#toast');
check('힌트가 다음 수를 알려 준다', ['↑', '→', '↓', '←'].includes(hintTxt.trim()), hintTxt.trim());

// 풀이대로 두면 클리어
const sol = await G('L.LEVELS[0].sol');
for (const a of sol) await key({ U: 'ArrowUp', R: 'ArrowRight', D: 'ArrowDown', L: 'ArrowLeft', T: 'Space' }[a]);
await page.waitForTimeout(1700);
check('풀이대로 두면 깬다', (await G('L.won')) && (await visible('#overlay-clear')));
check('최소 턴 배지', (await page.textContent('#clearBadges')).includes('최소 턴으로'));
check('기록이 저장된다', await page.evaluate(() => { const v = JSON.parse(localStorage.getItem('thelamp.littlenights.v1')); return v.levels['1-1'].done && v.levels['1-1'].flowers === 3 && v.levels['1-1'].perfect; }));
await page.click('#btnNext'); await page.waitForTimeout(500);
check('다음 뜰로', (await G('L.LEVELS[L.idx].id')) === '1-2');

// 발밑이 꺼지는 스위치는 막힌다
await key('ArrowRight'); await key('ArrowRight'); await key('Space'); await key('ArrowRight');
const onNight = await G('L.L.type[s.p]');
await key('Space');
check('밤의 돌 위에서는 불을 켤 수 없다', onNight === 4 && (await G('s.on')) === false && (await visible('#toast')));

// 깨짐 → 무르기: 나방 곁에서 불을 켠 채 서성이면 두 번 물린다
await page.evaluate(() => { const L = window.__lamp; L.play(L.LEVELS.findIndex((l) => l.id === '4-1')); });
await page.waitForTimeout(400);
for (let i = 0; i < 24 && !(await G('L.failed')); i++) await key(i % 2 ? 'ArrowLeft' : 'ArrowRight', 230);
check('두 번 물리면 깨진다', await G('L.failed'));
check('깨진 뒤에는 움직일 수 없다', await (async () => { const t = await G('s.t'); await key('ArrowRight'); return (await G('s.t')) === t; })());
await key('KeyZ');
check('깨져도 무를 수 있다', !(await G('L.failed')));

// 모든 뜰을 화면 위에서 풀이대로 깬다
const n = await G('L.LEVELS.length');
let all = true;
for (let i = 0; i < n; i++) {
  const r = await page.evaluate(async (i) => {
    const L = window.__lamp;
    L.play(i);
    await new Promise((res) => setTimeout(res, 60));
    for (const a of L.LEVELS[i].sol) {
      L.act(a);
      for (let k = 0; k < 60 && L.scene.busy; k++) await new Promise((res) => setTimeout(res, 16));
    }
    // 클리어 화면이 뜨고 기록이 저장될 때까지 기다린다
    for (let k = 0; k < 150 && document.getElementById('overlay-clear').classList.contains('hidden'); k++) await new Promise((res) => setTimeout(res, 16));
    return { won: L.won, t: L.s.t, par: L.LEVELS[i].par, fl: L.s.fl, saved: !!(L.save.levels[L.LEVELS[i].id] && L.save.levels[L.LEVELS[i].id].perfect) };
  }, i);
  if (!r.won || r.t !== r.par || r.fl !== 7 || !r.saved) { all = false; console.log(`     ${i}: ${JSON.stringify(r)}`); }
}
check(`화면 위에서 ${n}개 뜰을 모두 최소 턴으로 깬다`, all);
await page.waitForTimeout(300);
check('마지막 뜰 뒤에는 맺음말', (await page.textContent('#clearTitle')) === '모든 뜰에 불이 들어왔다');
await page.click('#btnClearStages'); await page.waitForTimeout(300);
check('뜰 고르기가 열리고 모두 풀려 있다', (await visible('#screen-select')) && (await page.locator('.stage.locked').count()) === 0);
await page.click('#screen-select [data-back]'); await page.waitForTimeout(200);
await page.click('#btnLang'); await page.waitForTimeout(150);
check('언어를 바꾼다', (await page.textContent('#btnHow')) === 'How to play');
await page.context().close();

// 터치: 밀어서 굴리기
const m = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await m.tap('#btnStart'); await m.waitForTimeout(500);
const MG = (expr) => m.evaluate(`(() => { const L = window.__lamp, s = L.s; return ${expr}; })()`);
const mp0 = await MG('s.p');
const cdp = await m.context().newCDPSession(m);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 150, y: 400, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 230, y: 404, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await m.waitForTimeout(400);
check('오른쪽으로 밀면 굴러간다', (await MG('s.p')) === mp0 + 1);
await m.tap('#btnLight'); await m.waitForTimeout(300);
check('빛 버튼으로 끈다', (await MG('s.on')) === false);
await m.tap('#btnUndo'); await m.waitForTimeout(200);
check('무르기 버튼', (await MG('s.on')) === true);
await m.context().close();

await browser.close();
server.close();
if (errors.length) { console.log('브라우저 오류:\n' + [...new Set(errors)].join('\n')); failed++; }
console.log(failed ? `\nsmoke FAILED (${failed})` : '\nsmoke OK');
process.exit(failed ? 1 : 0);
