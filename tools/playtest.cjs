#!/usr/bin/env node
/* 자동 플레이 검증 — 각 장을 정해진 풀이대로 끝까지 진행해 본다.
 *
 *   node tools/playtest.cjs            처음부터 결말까지 한 번에 + 결말 판정 표
 *   node tools/playtest.cjs ch2        한 장만
 *   node tools/playtest.cjs full       전체 여정만 / endings 결말 판정만
 *   node tools/playtest.cjs --shots=폴더   단계마다 화면을 저장
 *
 * 서버 없이 index.html 을 file:// 로 열어 Playwright(Chromium)로 돌린다.
 * 대사는 건너뛰고, 언덕 끌기와 걷기는 게임의 실제 규칙(Terrain.drag / 길찾기)을 그대로 거친다.
 */
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const shotDir = (args.find((a) => a.startsWith('--shots=')) || '').slice(8);
const only = args.filter((a) => !a.startsWith('--'));
const SOL = require('./solutions.cjs');

async function runLevel(page, id, steps, opts) {
  opts = opts || {};
  const log = [];
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const until = async (fn, arg, what, ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < (ms || 20000)) {
      if (await ev(fn, arg)) return true;
      await page.waitForTimeout(40);
    }
    const st = await ev(() => { const G = DN.Game, p = G.player; return { level: G.level.id, layer: p && p.layer.id, x: p && Math.round(p.x), busy: G.busy, path: p && p.path.length, flags: G.flags }; });
    throw new Error(`[${id}] 시간 초과: ${what} — ${JSON.stringify(st)}`);
  };
  const idle = () => until(() => DN.Game.busy === 0 && DN.Game.mode === 'play', null, '대본이 끝나기를 기다림');
  await idle();
  let n = 0;
  for (const s of steps) {
    const [op, a, b, c] = s;
    if (op === 'drag') {
      // [drag, 겹, 손잡이 번호, 값]
      const got = await ev(([L, k, v]) => {
        const G = DN.Game, ly = G.terrain.layer(L), kn = ly.knobs[k];
        const walkers = G.agents.filter((x) => !x.rides && x.visible);
        if (G.terrain.underfoot(ly, kn, walkers)) return 'underfoot';
        return G.terrain.drag(ly, kn, v, G.agents.filter((x) => x.visible && x.layer && x.kind !== 'boat'));
      }, [a, b, c]);
      if (got === 'underfoot') throw new Error(`[${id}] ${a}#${b}: 발밑이라 움직일 수 없음`);
      if (Math.abs(got - c) > 3 && !s[4]) throw new Error(`[${id}] ${a}#${b}: ${c} 까지 못 감 (실제 ${got})`);
    } else if (op === 'go') {
      // [go, 겹, x] — 그 지점을 눌러 걸어가고, 실제로 도착하는지 확인
      await idle();
      await ev(([L, x]) => { const G = DN.Game; G.tap(x, G.terrain.yAt(L, x)); }, [a, b]);
      await until(([L, x]) => { const G = DN.Game, p = G.player; return (G.busy === 0 && (!p || !p.path.length)); }, [a, b], `${a} ${b} 로 이동`);
      if (!s[3]) {
        const ok = await ev(([L, x]) => { const p = DN.Game.player; return p.layer.id === L && Math.abs(p.x - x) < 30; }, [a, b]);
        const at = await ev(() => { const p = DN.Game.player; return p.layer.id + ' ' + Math.round(p.x); });
        if (!ok) {
          const stillHere = await ev((lv) => DN.Game.level.id === lv, id);
          if (stillHere) throw new Error(`[${id}] ${a} ${b} 에 닿지 못함 (지금 ${at})`);
        }
      }
    } else if (op === 'cant') {
      // [cant, 겹, x] — 아직은 갈 수 없어야 한다 (퍼즐이 저절로 풀려 있지 않은지)
      const ok = await ev(([L, x]) => { const G = DN.Game, p = G.player; const r = G.terrain.reach(p.layer, p.x, G.modeFor(p)); return G.terrain.reachable(r, L, x); }, [a, b]);
      if (ok) throw new Error(`[${id}] ${a} ${b} 에 벌써 갈 수 있음 — 퍼즐이 비어 있다`);
    } else if (op === 'thing') {
      await idle();
      await ev((tid) => { const G = DN.Game, t = G.thing(tid); const y = t.sky ? t.y : G.terrain.yAt(t.layer, t.x) - t.dy; const x = t.sky ? t.x - G.cam.x * (t.par || 0) + G.cam.x : t.x; G.tap(x, y); }, a);
      await page.waitForTimeout(120);
      await until(() => { const G = DN.Game, p = G.player; return G.busy === 0 && !G.pendingThing && (!p || !p.path.length); }, null, `${a} 살펴보기`);
    } else if (op === 'lantern') {
      await idle();
      await ev((on) => { const G = DN.Game; if (G.lantern.on !== on) G.toggleLantern(); }, a);
      const now = await ev(() => DN.Game.lantern.on);
      if (now !== a) throw new Error(`[${id}] 등불을 ${a ? '켤' : '끌'} 수 없음`);
    } else if (op === 'wait') {
      await until(new Function('return (' + a + ')'), null, b || a, c);
    } else if (op === 'eval') {
      await ev(new Function(a));
    } else if (op === 'check') {
      const ok = await ev(new Function('return (' + a + ')'));
      if (!ok) throw new Error(`[${id}] 확인 실패: ${b || a}`);
    } else if (op === 'level') {
      await until((lv) => DN.Game.level.id === lv, a, `${a} 장으로 넘어감`);
    }
    if (shotDir && (op === 'go' || op === 'thing' || op === 'drag')) {
      await page.waitForTimeout(350);
      await page.screenshot({ path: path.join(shotDir, `${id}_${String(n++).padStart(2, '0')}_${op}.png`) });
    }
  }
  return log;
}

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  let failed = 0;
  const open = async (query, choose) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 3).join('\n')));
    page.on('console', (m) => { if (m.type() === 'error' && !/net::|Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
    await page.goto('file://' + path.join(ROOT, 'index.html') + query);
    await page.waitForFunction(() => window.DN && DN.Game && DN.Game.level && DN.Art.ready);
    if (choose) await page.evaluate((src) => { DN.AUTO.choose = new Function('opts', src); }, choose);
    return page;
  };

  const levels = only.length ? only.filter((x) => SOL.levels[x]) : [];   // 인자 없이 돌리면 '전체 여정'이 모든 장을 거친다
  for (const id of levels) {
    const page = await open(`?level=${id}&auto=1&speed=6`);
    try {
      await runLevel(page, id, SOL.levels[id]);
      console.log(`✓ ${id}`);
    } catch (e) { failed++; console.log(`✗ ${id}: ${e.message}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `${id}_FAIL.png`) }); }
    await page.close();
  }

  // 처음부터 결말까지 한 번에 (장과 장 사이의 상태가 제대로 이어지는지)
  if (!only.length || only.includes('full')) {
    const page = await open('?auto=1&speed=6');
    try {
      await page.evaluate(() => { DN.AUTO.afterEnding = 'again'; DN.Game.titleAction('new'); });
      await page.waitForFunction(() => DN.Game.level.id === 'prologue');
      for (const id of Object.keys(SOL.levels)) await runLevel(page, id, SOL.levels[id]);
      await page.waitForFunction(() => DN.Game.level.id === 'prologue' && DN.Game.S && DN.Game.S.run === 2, null, { timeout: 30000 });
      const r = await page.evaluate(() => ({ ending: DN.Game.lastEnding, meta: DN.Game.meta, run2: DN.Game.flags.run2 }));
      if (r.ending !== SOL.fullEnding) throw new Error(`기대한 결말 ${SOL.fullEnding}, 실제 ${r.ending}`);
      if (!r.run2 || r.meta.runs !== 1) throw new Error('2회차로 넘어가지 않음: ' + JSON.stringify(r));
      console.log(`✓ 전체 여정 (결말: ${r.ending}, 이어서 2회차 시작)`);
    } catch (e) { failed++; console.log(`✗ 전체 여정: ${e.message}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `full_FAIL.png`) }); }
    await page.close();
  }

  if (!only.length || only.includes('endings')) {
    const page = await open('?level=finale&auto=1&speed=6');
    const cases = Object.entries(SOL.endings || {}).concat(SOL.priority || []);
    let okN = 0;
    for (const [name, sc] of cases) {
      const got = await page.evaluate((state) => DN.Story.decide(JSON.parse(JSON.stringify(state))).id, sc.state);
      if (got !== name) { failed++; console.log(`✗ 결말 판정: 기대 ${name}, 실제 ${got} — ${JSON.stringify(sc.state)}`); } else okN++;
    }
    console.log(`✓ 결말 판정 ${okN}/${cases.length}`);
    // 결말 장면이 오류 없이 그려지는지도 하나씩 본다
    for (const E of await page.evaluate(() => DN.ENDINGS.map((e) => e.id))) {
      await page.evaluate((id) => { DN.Game.loadEnding(DN.Story.EPILOGUE[id]); }, E);
      await page.waitForTimeout(250);
      if (shotDir) await page.screenshot({ path: path.join(shotDir, `ending_${E}.png`) });
    }
    console.log('✓ 결말 장면 11개 그리기');
    await page.close();
  }
  await browser.close();
  if (errors.length) { failed++; console.log('\n스크립트 오류:\n' + [...new Set(errors)].slice(0, 10).join('\n')); }
  console.log(failed ? `\n실패 ${failed}건` : '\n모두 통과');
  process.exit(failed ? 1 : 0);
})();
