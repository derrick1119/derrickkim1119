#!/usr/bin/env node
/* 자동 플레이 검증 — 각 장을 정해진 풀이대로 끝까지 진행해 본다.
 *
 *   node tools/playtest.cjs            처음부터 결말까지 한 번에 + 결말 판정 표
 *   node tools/playtest.cjs ch2        한 장만
 *   node tools/playtest.cjs full       전체 여정만 / run2 2회차 단서만 / endings 결말 판정만
 *   node tools/playtest.cjs full --pick=1 --expect=repeat   선택지마다 둘째 것을 골라 다른 갈래를 지나 본다
 *   node tools/playtest.cjs --shots=폴더   단계마다 화면을 저장
 *
 * 서버 없이 index.html 을 file:// 로 열어 Playwright(Chromium)로 돌린다.
 * 대사는 건너뛰고, 걷기와 등불 다루기는 게임의 실제 규칙(길찾기, 구역 판정)을 그대로 거친다.
 */
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const shotDir = (args.find((a) => a.startsWith('--shots=')) || '').slice(8);
const only = args.filter((a) => !a.startsWith('--'));
const pick = parseInt((args.find((a) => a.startsWith('--pick=')) || '').slice(7) || '0', 10);   // 선택지에서 몇 번째를 고를지
const expect = (args.find((a) => a.startsWith('--expect=')) || '').slice(9);
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
    if (op === 'hang') {
      // [hang, 고리] — 등불을 고리에 건다
      await idle();
      const ok = await ev((h) => DN.Game.hangAt(DN.Game.thing(h)), a);
      if (!ok && !b) throw new Error(`[${id}] ${a} 에 등불을 걸 수 없음`);
      await until(() => DN.Game.lan.mode !== 'fly', null, '등불이 날아감');
    } else if (op === 'canthang') {
      await idle();
      const ok = await ev((h) => DN.Game.hangAt(DN.Game.thing(h)), a);
      if (ok) throw new Error(`[${id}] ${a} 에 걸 수 있으면 안 됨`);
    } else if (op === 'recall') {
      await idle();
      const ok = await ev(() => DN.Game.recall());
      if (!ok && !a) throw new Error(`[${id}] 등불을 불러올 수 없음`);
      await until(() => DN.Game.lan.mode !== 'fly', null, '등불이 돌아옴');
    } else if (op === 'rimto') {
      // [rimto, 사물] — 빛의 가장자리가 그 사물을 지나도록 크기를 맞춘다
      await idle();
      const ok = await ev((tid) => { const G = DN.Game, p = G.thingPoint(G.thing(tid)); return G.setRadius(Math.hypot(p.x - G.lan.x, p.y - G.lan.y), true); }, a);
      if (!ok) throw new Error(`[${id}] 빛의 가장자리를 ${a} 에 맞출 수 없음`);
    } else if (op === 'r') {
      // [r, 반지름] — 빛의 크기 (0 = 끔)
      await idle();
      const ok = await ev((v) => DN.Game.setRadius(v, true), a);
      if (!ok && !b) throw new Error(`[${id}] 빛을 ${a} 로 바꿀 수 없음`);
      if (ok && b === 'refuse') throw new Error(`[${id}] 빛을 ${a} 로 바꿀 수 있으면 안 됨 (발밑이 사라져야 한다)`);
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
    } else if (op === 'cantgo') {
      // [cantgo, 겹, x] — 걸어가 봐도 닿지 못해야 한다 (들고 있는 빛이 함께 움직이는 경우)
      await idle();
      await ev(([L, x]) => { const G = DN.Game; G.tap(x, G.terrain.yAt(L, x)); }, [a, b]);
      await page.waitForTimeout(150);
      await until(() => { const G = DN.Game, p = G.player; return G.busy === 0 && !p.path.length; }, null, `${a} ${b} 쪽으로 가 봄`);
      const got = await ev(([L, x]) => { const p = DN.Game.player; return p.layer.id === L && Math.abs(p.x - x) < 30; }, [a, b]);
      if (got) throw new Error(`[${id}] ${a} ${b} 에 닿아 버림 — 퍼즐이 비어 있다`);
      await ev(() => { DN.Game.player.goal = null; });
    } else if (op === 'cant') {
      // [cant, 겹, x] — 아직은 갈 수 없어야 한다 (퍼즐이 저절로 풀려 있지 않은지)
      const ok = await ev(([L, x]) => { const G = DN.Game, p = G.player; const r = G.terrain.reach(p.layer, p.x, G.modeFor(p)); return G.terrain.reachable(r, L, x); }, [a, b]);
      if (ok) throw new Error(`[${id}] ${a} ${b} 에 벌써 갈 수 있음 — 퍼즐이 비어 있다`);
    } else if (op === 'thing') {
      await idle();
      const ok = await ev((tid) => {
        const G = DN.Game, t = G.thing(tid);
        if (!t || !G.present(t)) return false;
        const pt = t.sky ? { x: t.x - G.cam.x * (t.par || 0) + G.cam.x, y: t.y } : G.thingPoint(t);
        G.tap(pt.x, pt.y);
        return true;
      }, a);
      if (!ok) throw new Error(`[${id}] ${a} 가 지금은 보이지 않음`);
      await page.waitForTimeout(120);
      await until(() => { const G = DN.Game, p = G.player; return G.busy === 0 && !G.pendingThing && (!p || !p.path.length); }, null, `${a} 살펴보기`);
    } else if (op === 'absent') {
      // [absent, 사물] — 지금은 보이지 않아야 한다
      const ok = await ev((tid) => { const G = DN.Game, t = G.thing(tid); return !!t && G.present(t); }, a);
      if (ok) throw new Error(`[${id}] ${a} 가 벌써 보임`);
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
    if (shotDir && (op === 'go' || op === 'thing' || op === 'hang' || op === 'r')) {
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
      await page.evaluate((n) => { DN.AUTO.afterEnding = 'again'; if (n) DN.AUTO.choose = (o) => o[Math.min(n, o.length - 1)]; DN.Game.titleAction('new'); }, pick);
      await page.waitForFunction(() => DN.Game.level.id === 'prologue');
      for (const id of Object.keys(SOL.levels)) await runLevel(page, id, SOL.levels[id]);
      await page.waitForFunction(() => DN.Game.level.id === 'prologue' && DN.Game.S && DN.Game.S.run === 2, null, { timeout: 30000 });
      const r = await page.evaluate(() => ({ ending: DN.Game.lastEnding, meta: DN.Game.meta, run2: DN.Game.flags.run2 }));
      const want = expect || SOL.fullEnding;
      if (r.ending !== want) throw new Error(`기대한 결말 ${want}, 실제 ${r.ending}`);
      if (!r.run2 || r.meta.runs !== 1) throw new Error('2회차로 넘어가지 않음: ' + JSON.stringify(r));
      console.log(`✓ 전체 여정 (결말: ${r.ending}, 이어서 2회차 시작)`);
    } catch (e) { failed++; console.log(`✗ 전체 여정: ${e.message}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `full_FAIL.png`) }); }
    await page.close();
  }

  // 2회차에만 닿는 단서
  if (!only.length || only.includes('run2')) {
    for (const [id, steps] of Object.entries(SOL.run2 || {})) {
      const page = await open(`?level=${id}&run=2&auto=1&speed=6`);
      try { await runLevel(page, id + '(2회차)', steps); console.log(`✓ 2회차 단서 ${id}`); }
      catch (e) { failed++; console.log(`✗ 2회차 단서 ${id}: ${e.message}`); if (shotDir) await page.screenshot({ path: path.join(shotDir, `run2_${id}_FAIL.png`) }); }
      await page.close();
    }
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
