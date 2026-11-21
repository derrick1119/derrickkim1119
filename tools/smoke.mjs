// 브라우저 연기 시험: 실제로 띄워서 주요 흐름을 한 바퀴 돌려 본다.
//   node tools/smoke.mjs            소스 그대로(index.html)
//   node tools/smoke.mjs --dist     빌드 결과(dist/index.html)
//   node tools/smoke.mjs --single   파일 하나짜리 판(dist/shh-ufo.html)
// Playwright 가 필요하다: npm i -D playwright && npx playwright install chromium
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startServer } from './serve.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const args = process.argv.slice(2);
const mode = args.includes('--single') ? 'single' : args.includes('--dist') ? 'dist' : 'src';
const root = mode === 'src' ? ROOT : resolve(ROOT, 'dist');
const entry = mode === 'single' ? '/shh-ufo.html' : '/index.html';
const PORT = 5186;

let chromium;
try {
  ({ chromium } = createRequire(import.meta.url)('playwright'));
} catch {
  console.error('Playwright 를 찾지 못했습니다. npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok });
  console.log(`${ok ? '  통과' : '✗ 실패'}  ${name}${ok || !detail ? '' : `  → ${detail}`}`);
}

const server = await startServer({ port: PORT, root });
const browser = await chromium.launch();
const problems = [];

async function open(viewport, locale) {
  const ctx = await browser.newContext({ viewport, locale, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`requestfailed: ${r.url()}`));
  await page.goto(`http://127.0.0.1:${PORT}${entry}?debug`);
  await page.waitForSelector('.title .start');
  return page;
}

const click = (page, sel) => page.click(sel, { force: true });
const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.__ufo.game.state)));
const fits = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/** 패널이 다 올라올 때까지 기다린다(올라오는 중에는 안의 버튼이 화면 밖에 있다). */
async function settle(page) {
  await page.waitForSelector('.sheet.open');
  await page.waitForTimeout(380);
}

async function enter(page) {
  await click(page, '.title .start');
  await page.waitForSelector('.modal-intro');
  for (let i = 0; i < 4; i++) {
    await click(page, '.modal-intro .btn.primary');
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => window.__ufo.scene.ufo.mode === 'hover', null, { timeout: 5000 });
}

async function tapSpecimen(page) {
  await page.waitForFunction(() => window.__ufo.world.specimens.some((s) => s.state === 'live' && s.age > 0.3), null, { timeout: 5000 });
  const pos = await page.evaluate(() => {
    const { world } = window.__ufo;
    const sp = world.specimens.find((s) => s.state === 'live' && s.age > 0.3);
    return { x: sp.x, y: sp.mode === 'ground' ? sp.y - 14 : sp.y };
  });
  const box = await page.locator('#scene').boundingBox();
  await page.mouse.click(box.x + pos.x, box.y + pos.y);
}

/** 모달 카드가 화면 안에 들어오고 가로로 넘치지 않는지. */
async function modalFits(page) {
  await page.waitForTimeout(450); // 등장 애니메이션이 끝난 뒤에 잰다
  return page.evaluate(() => {
    const card = document.querySelector('.modal');
    const stage = document.getElementById('stage').getBoundingClientRect();
    if (!card) return false;
    const r = card.getBoundingClientRect();
    if (r.left < stage.left - 1 || r.right > stage.right + 1) return false;
    // 비스듬히 찍힌 도장만 빼고, 안의 모든 요소가 카드 안에 있어야 한다.
    return [...card.querySelectorAll('*')].every((el) => {
      if (el.classList.contains('stamp')) return true;
      const b = el.getBoundingClientRect();
      return b.width === 0 || (b.left >= r.left - 1 && b.right <= r.right + 1);
    });
  });
}

let page = null;
try {
  console.log(`대상: ${mode} (${entry})`);

  // ── 한국어, 보통 크기 휴대폰 ──
  page = await open({ width: 390, height: 844 }, 'ko-KR');
  check('첫 화면이 뜬다', (await page.textContent('.logo')).includes('UFO'));
  check('한국어로 시작한다', (await page.textContent('.title .start')).includes('출동'));
  await enter(page);
  check('본부 교신 뒤 플레이 화면', (await page.textContent('.hud-size')).includes('30.0'));

  await page.evaluate(() => {
    window.__ufo.game.rng = () => 0.999;
  });
  await tapSpecimen(page);
  await page.waitForFunction(() => window.__ufo.game.run.size > 30, null, { timeout: 3000 });
  check('표본을 누르면 자란다', (await state(page)).run.size > 30);

  await click(page, '.action.cloak');
  check('구름 은폐가 켜진다', await page.evaluate(() => window.__ufo.game.cloaked));

  // 임무 성공
  await page.evaluate(() => {
    window.__ufo.game.run.fuel = 100;
  });
  await click(page, '.action.mission');
  await settle(page);
  await click(page, '.sheet.open .btn.go');
  await page.waitForSelector('.mission.success', { timeout: 6000 });
  check('임무 성공 화면', (await state(page)).stats.missionsOk === 1);
  check('임무 화면이 넘치지 않는다', await modalFits(page));
  await click(page, '.mission.success .btn');
  await page.waitForFunction(() => !window.__ufo.game.busy && window.__ufo.scene.ufo.mode === 'hover', null, { timeout: 4000 });

  // 구매
  await page.evaluate(() => {
    window.__ufo.game.state.grant = 500;
  });
  await page.locator('.tab').nth(0).click({ force: true });
  await settle(page);
  await click(page, '.sheet.open .btn.buy');
  check('표본 해금', (await state(page)).unlocked.specimens.firefly === true);
  await page.locator('.tab').nth(2).click({ force: true });
  await page.waitForSelector('.sheet.open .gadget-pic');
  await click(page, '.sheet.open .btn.buy');
  check('장비 강화', (await state(page)).gadgets.beam === 1);
  await page.locator('.tab').nth(3).click({ force: true });
  await page.waitForSelector('.sheet.open .cell');
  check('도감 필터가 보인다', await page.evaluate(() => document.querySelector('.filters').getBoundingClientRect().height > 30));
  await click(page, '.sheet.open .cell');
  await page.waitForSelector('.modal-cause');
  check('미기록 사건은 단서만 보여 준다', (await page.textContent('.modal-cause')).includes('단서'));
  await click(page, '.modal-cause .icon-btn');
  await page.locator('.tab').nth(4).click({ force: true });
  await page.waitForSelector('.sheet.open .ach');
  check('기록 패널', (await page.locator('.sheet.open .ach').count()) > 20);
  await page.locator('.tab').nth(4).click({ force: true });

  // 시선 중에 빔 → 발각 → 보고서 → 다음 대원
  await page.evaluate(() => {
    const { world, game } = window.__ufo;
    game.run.cloakT = 0;
    world.humans[0].state = 'look';
    world.humans[0].t = 30;
    game.rng = () => 0;
  });
  await tapSpecimen(page);
  await page.waitForSelector('.modal-report', { timeout: 6000 });
  let s = await state(page);
  check('시선 중에 빔을 쏘면 들킨다', s.phase === 'discovered' && s.seen.gaze_farmer === 1);
  check('보고서에 사건 이름이 나온다', (await page.textContent('.modal-report h2')).includes('농부'));
  check('보고서가 넘치지 않는다', await modalFits(page));
  // 보고서를 띄운 채 새로 고침해도 보고서로 돌아온다
  await page.evaluate(() => window.__ufo.save());
  await page.reload();
  await page.waitForSelector('.title .start');
  check('이어 하기 버튼', (await page.textContent('.title .start')).includes('이어서'));
  await click(page, '.title .start');
  await page.waitForSelector('.modal-report', { timeout: 4000 });
  check('새로 고침 뒤에도 보고서가 남아 있다', true);
  await click(page, '.modal-report .btn.primary');
  await page.waitForFunction(() => window.__ufo.game.state.gen === 2 && window.__ufo.game.phase === 'play', null, { timeout: 5000 });
  s = await state(page);
  check('다음 대원이 더 큰 기체로 시작한다', s.gen === 2 && s.run.size > 30);

  // 보고서부터 다시 시작한 경우에도, 다음 대원이 도착하면 출석 보급품을 받는다
  await page.waitForSelector('.modal-gift', { timeout: 4000 });
  check('출석 보급품', (await state(page)).daily.streak === 1);
  await click(page, '.modal-gift .btn');
  await page.waitForFunction(() => !window.__ufo.ui.modals.active);

  // 설정: 저장 코드, 언어
  await click(page, '.hud .icon-btn');
  await page.waitForSelector('.modal-settings');
  await page.locator('.modal-settings .btn.ghost').nth(0).click({ force: true });
  const code = await page.inputValue('#save-export');
  check('저장 코드 내보내기', code.startsWith('SHHUFO1.') && code.length > 200);
  check('설정 화면이 넘치지 않는다', await modalFits(page));
  await page.locator('.modal-settings .seg').nth(1).click({ force: true });
  await page.waitForFunction(() => document.documentElement.lang === 'en');
  check('영어로 바꾸면 화면 글자가 바뀐다', (await page.textContent('.tabs')).includes('Archive'));
  await page.locator('.modal-settings .btn.ghost').nth(1).click({ force: true });
  await page.fill('#save-import', 'nonsense');
  await page.locator('.modal-settings .save-box:not([hidden]) .btn').click({ force: true });
  check('엉터리 저장 코드는 거절한다', (await page.locator('.modal-settings').count()) === 1);
  await page.fill('#save-import', code);
  await page.locator('.modal-settings .save-box:not([hidden]) .btn').click({ force: true });
  await page.waitForFunction(() => document.documentElement.lang === 'ko', null, { timeout: 4000 });
  s = await state(page);
  check('저장 코드를 불러오면 그 상태로 돌아간다', s.gen === 2 && s.lang === null && s.unlocked.specimens.firefly === true);


  // 엔딩
  await page.waitForFunction(() => window.__ufo.scene.ufo.mode === 'hover' && window.__ufo.game.playing, null, { timeout: 5000 });
  await page.evaluate(() => {
    const { game, world, scene } = window.__ufo;
    game.rng = () => 0.999;
    game.run.size = 1500000 - 0.5;
    game.run.form = 7;
    world.reset();
    scene.layout();
  });
  await tapSpecimen(page);
  await page.waitForSelector('.modal-ending', { timeout: 6000 });
  for (let i = 0; i < 4; i++) {
    await click(page, '.modal-ending .btn');
    await page.waitForTimeout(80);
  }
  await page.waitForFunction(() => window.__ufo.game.phase === 'play', null, { timeout: 4000 });
  s = await state(page);
  check('엔딩 뒤에 관측을 이어 간다', s.clears === 1 && s.flags.ending === true && s.gen === 3);
  await page.close();

  // ── 영어, 가장 작은 휴대폰 ──
  page = await open({ width: 320, height: 568 }, 'en-US');
  check('영어 기기에서는 영어로 시작한다', (await page.textContent('.title .start')).includes('Launch'));
  await enter(page);
  check('작은 화면에서 가로로 넘치지 않는다', await fits(page));
  const dock = await page.evaluate(() => {
    const stage = document.getElementById('stage').getBoundingClientRect();
    return [...document.querySelectorAll('.action b, .tab span')].every((el) => {
      const r = el.getBoundingClientRect();
      return r.left >= stage.left && r.right <= stage.right && el.scrollWidth <= el.clientWidth + 1;
    });
  });
  check('작은 화면에서 아래 버튼 글자가 잘리지 않는다', dock);
  await page.evaluate(() => {
    const { game, ui } = window.__ufo;
    game.rng = () => 0;
    game.run.fuel = 100;
    ui.launchMission('crop');
  });
  await page.waitForSelector('.modal-report', { timeout: 8000 });
  check('작은 화면에서 영어 보고서가 넘치지 않는다', await modalFits(page));
  await page.close();

  check('콘솔 오류·실패한 요청이 없다', problems.length === 0, problems.join(' | '));
} catch (err) {
  check('시험이 끝까지 돌았다', false, err.message.split('\n')[0]);
  if (problems.length) console.log(problems.join('\n'));
  if (page && !page.isClosed()) {
    const dump = await page
      .evaluate(() => {
        const { game, ui, world } = window.__ufo;
        const stage = document.getElementById('stage');
        return JSON.stringify({
          phase: game.phase,
          busy: game.busy,
          panel: ui.panel,
          modal: ui.modals.active,
          transitioning: ui.transitioning,
          humans: world.humans.map((h) => h.state),
          specimens: world.specimens.map((sp) => sp.state),
          scroll: [stage.scrollTop, document.documentElement.scrollTop],
        });
      })
      .catch(() => '');
    console.log('상태:', dump);
  }
  // 실패한 순간의 화면을 남긴다: SMOKE_SHOT=경로.png node tools/smoke.mjs
  if (process.env.SMOKE_SHOT && page && !page.isClosed()) await page.screenshot({ path: process.env.SMOKE_SHOT }).catch(() => {});
} finally {
  await browser.close();
  server.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} 통과`);
process.exit(failed.length ? 1 : 0);
