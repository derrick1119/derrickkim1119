/**
 * 스크린샷(390×844 휴대폰) — 플레이 빌드를 실제 브라우저로 열어 타이틀·첫 판·누르고 있기(미리 보기)·몇 수 뒤를 찍는다.
 *   npx tsx studio/screwshop/build.ts && npx tsx studio/screwshop/shots.ts → studio/screwshop/screens/
 * 콘솔 에러·가로 스크롤도 함께 잰다.
 */
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { STAGES, logLate, screwshop as g, screwshopSmart, startStage } from './game.ts';
/** M1′ 8판(0~7) + 새 판(8 1-4 🐿️ · 9 1-7 🐄 · 10 1-5 🤖 · 11 1-8 🐴)의 지금 자리(✏️ S010: 판 순서가 30판 자리로 바뀌어도 같은 판을 찍는다) */
const M = ['giraffe', 'boat', 'train', 'mill', 'flower', 'dino', 'castle', 'rocket', 'squirrel', 'cow', 'robot', 'horse', 'piggy', 'duck', 'tractor', 'whale', 'crab', 'penguin', 'seal', 'jackbox', 'coaster', 'octopus', 'lighthouse', 'dolphin', 'popcorn', 'showcase', 'range', 'cablecar'].map((key) => STAGES.findIndex((d) => d.key === key));
const STAGES_FIRST = STAGES[0].first ?? 0;
import { mulberry32 } from './rng.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: any };
const here = import.meta.dirname, out = join(here, 'screens');
mkdirSync(out, { recursive: true });
const url = pathToFileURL(join(here, '../../web/public/studio/screwshop/index.html')).href;
const browser = await chromium.launch();
const errors: string[] = [];
for (const scheme of ['light', 'dark'] as const) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: scheme, hasTouch: true });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(url);
  await page.waitForTimeout(300);
  if (scheme === 'dark') continue;
  await page.screenshot({ path: join(out, '01-title.png') });
  await page.click('.g-pickbtn'); // 판 고르기(✏️ S011)
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '25-pick.png') });
  for (let w = 0; w < 2; w++) await page.click('.g-pick nav button[data-w]:last-of-type'), await page.waitForTimeout(150); // ✏️ S020(🧪 S019): 월드 3(8칸)
  await page.screenshot({ path: join(out, '66-pick-w3.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.click('.g-overlay');
  await page.waitForTimeout(1800);
  await page.screenshot({ path: join(out, '02-stage1.png') });
  const cb = (await page.locator('canvas').boundingBox())!;
  console.log(`아래 빈 곳(390×844): ${(((844 - cb.y - cb.height) / 844) * 100).toFixed(1)}%`); // 🎨 ART §6 · 📋 M2 ≤ 10%
  // 첫 판의 나사 자리 = 시뮬 좌표 → 캔버스 좌표 (게임이 window에 노출하지 않으므로 화면 비율로 근사: 기린 몸통 나사 0.4, 0.85/1.45)
  const box = (await page.locator('canvas').boundingBox())!;
  const at = (x: number, y: number) => ({ x: box.x + x * box.width, y: box.y + y * box.width });
  const L1 = g.create(1).L, p = at(L1.px[STAGES_FIRST], L1.py[STAGES_FIRST]); // 1판 손가락 첫 나사(🔨 머리)를 누르고 있기 → 🎯
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, '03-hold-preview.png') });
  await page.mouse.up();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(out, '04-after-tap.png') });
  // 장인 봇이 시드 42의 1판에서 누른 자리를 같은 순서로 브라우저에서 눌러 본다 (?seed=42) — 연속 쏙 숫자·상자 닫힘·판 완성 화면
  const plan: number[][] = [];
  {
    const sim = g.create(42), rng = mulberry32(1);
    let was = false;
    while (sim.stage === 0 && sim.t < 60 * 120) {
      const i = screwshopSmart.act(sim, rng);
      if (i.pointer && !was) plan.push([i.pointer.x, i.pointer.y]);
      was = !!i.pointer;
      g.step(sim, i);
    }
  }
  await page.goto(url + '?seed=42');
  await page.click('.g-overlay');
  await page.waitForTimeout(900);
  const b2 = (await page.locator('canvas').boundingBox())!;
  for (let i = 0; i < plan.length; i++) {
    await page.mouse.move(b2.x + plan[i][0] * b2.width, b2.y + plan[i][1] * 1.45 * b2.width);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(i === 5 ? 470 : 800);
    if (i === 5) await page.screenshot({ path: join(out, '05-streak.png') }), await page.waitForTimeout(330);
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, '06-clear.png') });
  // 🪵 방아쇠 판: 장인 봇의 수순(시드 42)을 그대로 누르고, 방아쇠를 꾹(미리 보기) → 친 직후를 찍는다 — 2판 활대 #11 와르르 · 5판 꽃 머리 #14 우수수(✏️ S005) · 6판 꼬리뿌리 🌀 #15 띠용 띠용(✏️ S006) · 8판 🔑 #15 발사(✏️ S007) · 3판 🔑 #10 🔒 튐 · 4판 📌 #13 쾅 → 쾅(✏️ S008) · 1-4 🐿️ 꼬리 #14 쾅 → 와르르 · 1-7 🐄 꼬리 #14 쾅 → 🔑 드르륵(✏️ S010) · 1-5 🤖 🔑 #9 드르륵 · 1-8 🐴 🔑 #14 드르륵 → 와르르(✏️ S011) · 1-9 🦆 쿵 · 1-10 🚜 🔑 #11 드르륵(시드 42 칠) · 2-3 🐳 꼬리 끝 #13 유리 너머 쾅 · 2-4 🦀 등딱지 #10 와르르 · 2-5 🐧 얼음 망치 끝 #8 쾅(✏️ S012)
  for (const [m, trig, holdPng, hitPng] of [[1, 11, '09-stage2-hold.png', '08-stage2-crash.png'], [4, 14, '11-stage5-hold.png', '12-stage5-bloom.png'], [5, 15, '13-stage6-hold.png', '14-stage6-boing.png'], [7, 15, '15-stage8-hold.png', '16-stage8-launch.png'], [2, 10, '17-stage3-hold.png', '18-stage3-wind.png'], [3, 13, '19-stage4-hold.png', '20-stage4-bonk.png'], [8, 14, '21-w1-4-hold.png', '22-w1-4-crash.png'], [9, 14, '23-w1-7-hold.png', '24-w1-7-wind.png'], [10, 9, '26-w1-5-hold.png', '27-w1-5-wind.png'], [11, 14, '28-w1-8-hold.png', '29-w1-8-crash.png'], [12, -1, '30-w1-6-hold.png', '31-w1-6-thump.png'], [13, -1, '33-w1-9-hold.png', '34-w1-9-thump.png'], [14, 11, '35-w1-10-hold.png', '36-w1-10-crash.png'], [15, 16, '37-w2-3-hold.png', '38-w2-3-bonk.png'], [16, 10, '39-w2-4-hold.png', '40-w2-4-crash.png'], [17, 17, '41-w2-5-hold.png', '42-w2-5-bonk.png'], [18, 13, '44-w2-7-hold.png', '45-w2-7-bonk.png'], [19, -1, '46-w3-2-hold.png', '47-w3-2-jack.png'], [20, -1, '49-w3-4-hold.png', '50-w3-4-crash.png'], [21, 12, '51-w2-8-hold.png', '52-w2-8-wind.png'], [22, 8, '53-w2-10-hold.png', '54-w2-10-bonk.png'], [23, -1, '55-w2-9-hold.png', '56-w2-9-crash.png'], [24, -1, '57-w3-3-hold.png', '58-w3-3-jack.png'], [25, -1, '59-w3-6-hold.png', '60-w3-6-jack.png'], [26, -1, '62-w3-8-hold.png', '63-w3-8-boing.png'], [27, -1, '64-w3-5-hold.png', '65-w3-5-wind.png']] as const) {
    const k = M[m], sim = g.create(42), rng = mulberry32(1), plan2: [number, number, number][] = [];
    startStage(sim, k);
    let was = false;
    while (sim.stage === k && sim.phase !== 'result' && sim.t < 60 * 200) {
      const i = screwshopSmart.act(sim, rng);
      if (i.pointer && !was) plan2.push([i.pointer.x, i.pointer.y, sim.L.px.findIndex((x, j) => x === i.pointer!.x && sim.L.py[j] / 1.45 === i.pointer!.y)]);
      was = !!i.pointer;
      g.step(sim, i);
    }
    const tg: number = trig >= 0 ? trig : sim.hist.find((h) => h.rec.some((e) => e.k === 'thump' || e.k === 'jack' || e.k === 'crash'))?.s ?? sim.hist.reduce((b, h) => (h.rec.filter((e) => e.k === 'out' && e.pop).length > b.rec.filter((e) => e.k === 'out' && e.pop).length ? h : b), sim.hist[0])?.s ?? -2; // 🐹 쿵 · 🤡 뿅 · 🪵 와르르 판: 그 사건이 난 톡(✏️ S011 · S013 · S015 — 3-4는 ⏰ 0이 되는 톡이 칠마다 달라서)
    await page.goto(url + `?seed=42&stage=${k + 1}`);
    await page.click('.g-overlay');
    await page.waitForTimeout(900);
    const b4 = (await page.locator('canvas').boundingBox())!;
    for (const [x, y, idx] of plan2) {
      await page.mouse.move(b4.x + x * b4.width, b4.y + y * 1.45 * b4.width);
      await page.mouse.down();
      await page.waitForTimeout(60);
      if (idx === tg) await page.waitForTimeout(450), await page.screenshot({ path: join(out, holdPng) }); // 장전 끝난 방아쇠 꾹 = 미리 보기
      await page.mouse.up();
      if (idx === tg) {
        await page.waitForTimeout(620);
        await page.screenshot({ path: join(out, hitPng) });
        break;
      }
      await page.waitForTimeout(800);
    }
  }
  // 실패 카드(🎨 §2.7): 8판을 막 누르기 수순(노드에서 미리 계산, 시드 42)으로 져 본다 → 진 톡 짚기 + 카드
  {
    const { screwshopMash } = await import('./funqa.ts');
    const sim = g.create(42), rng = mulberry32(7), seq: number[] = [];
    startStage(sim, M[7]); // ✏️ S005: 5판 🌻도 막 누르기로 깰 때가 있어(0.08) 8판에서 진다
    let was = false;
    while (sim.phase !== 'result' && sim.t < 60 * 300) {
      const i = screwshopMash.act(sim, rng);
      if (i.pointer && !was) seq.push(sim.L.px.findIndex((x, j) => x === i.pointer!.x && sim.L.py[j] / 1.45 === i.pointer!.y));
      was = !!i.pointer;
      g.step(sim, i);
    }
    if (!sim.ok) {
      await page.goto(url + `?seed=42&stage=${M[7] + 1}&fails=2`); // ✏️ S012: 셋째 실패 → 💡 귀띔 단추
      await page.click('.g-overlay');
      await page.waitForTimeout(900);
      const b5 = (await page.locator('canvas').boundingBox())!;
      for (const i of seq) {
        await page.mouse.move(b5.x + sim.L.px[i] * b5.width, b5.y + sim.L.py[i] * b5.width);
        await page.mouse.down();
        await page.waitForTimeout(60);
        await page.mouse.up();
        await page.waitForTimeout(700);
      }
      await page.waitForTimeout(2600);
      await page.screenshot({ path: join(out, '10-fail.png') });
      await page.mouse.click(b5.x + 0.5 * b5.width, b5.y + 1.408 * b5.width); // 💡 귀띔 단추(셋째 실패 · ✏️ S012 · S013 자리)
      await page.waitForTimeout(1500);
      await page.screenshot({ path: join(out, '32-hint.png') });
      // ✏️ S016(🧪 S015 ⑦): 💡를 켠 뒤 아직 톡 0 → 아래 도구 줄 💡 단추로 끔(폰 화면 비율일 때만 도구 줄이 있다)
      if (b5.height / b5.width >= 1.62) {
        await page.mouse.click(b5.x + 0.5 * b5.width, b5.y + (b5.height / b5.width - 0.15) * b5.width);
        await page.waitForTimeout(700);
        await page.screenshot({ path: join(out, '61-hint-off.png') });
      }
    }
  }
  // 🪵 통나무가 먼저 떨어져 → 빈칸(✏️ S013 · 🧪 S012 F16 ③): 2-4 🦀를 막 누르기로 — 와르르 없이 등딱지가 떨어진 뒤 그 밑 나사를 꾹
  {
    const { screwshopMash } = await import('./funqa.ts');
    const k = STAGES.findIndex((d) => d.key === 'crab');
    let taps: number[] = [], at = -1;
    for (let h = 1; h < 300 && at < 0; h++) {
      const sim = g.create(42), rng = mulberry32(h);
      startStage(sim, k);
      while (sim.phase !== 'result' && sim.t < 60 * 300) g.step(sim, screwshopMash.act(sim, rng));
      taps = sim.hist.map((e) => e.s);
      at = sim.hist.findIndex((e, t) => logLate(sim.L, sim.hist.slice(0, t), e.rec));
    }
    if (at >= 0) {
      const L6 = g.create(42);
      startStage(L6, k);
      await page.goto(url + `?seed=42&stage=${k + 1}`);
      await page.click('.g-overlay');
      await page.waitForTimeout(900);
      const b6 = (await page.locator('canvas').boundingBox())!;
      for (let t = 0; t <= at; t++) {
        const i = taps[t];
        await page.mouse.move(b6.x + L6.L.px[i] * b6.width, b6.y + L6.L.py[i] * b6.width);
        await page.mouse.down();
        await page.waitForTimeout(t === at ? 500 : 60);
        if (t === at) await page.screenshot({ path: join(out, '43-log-late.png') });
        await page.mouse.up();
        await page.waitForTimeout(700);
      }
    }
  }
  // 🤡 뿅에 맡겨요(✏️ S014): 3-2 처음에 모자 맨 위 나사를 꾹 → 알약 · 나사 밖에서 떼어 취소
  {
    const k = STAGES.findIndex((d) => d.key === 'jackbox'), J = g.create(42);
    startStage(J, k);
    const L7 = J.L, hat = [...L7.ps[L7.jack![1]]].sort((a, b) => L7.py[a] - L7.py[b])[0];
    await page.goto(url + `?seed=42&stage=${k + 1}`);
    await page.click('.g-overlay');
    await page.waitForTimeout(900);
    const b7 = (await page.locator('canvas').boundingBox())!;
    await page.mouse.move(b7.x + L7.px[hat] * b7.width, b7.y + L7.py[hat] * b7.width);
    await page.mouse.down();
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(out, '48-w3-2-early.png') });
    await page.mouse.move(b7.x + 0.02 * b7.width, b7.y + 0.02 * b7.width);
    await page.mouse.up();
  }
  // ★3을 못 딴 결과(별 이유 + ↺ 다시 · 다음): 망치를 반대로 매다는 순서로 1판을 푼다
  await page.goto(url + '?seed=42');
  await page.click('.g-overlay');
  await page.waitForTimeout(900);
  const b3 = (await page.locator('canvas').boundingBox())!, L3 = g.create(42).L;
  for (const i of [7, 4, 3, 8, 5, 2, 6, 0, 1]) {
    await page.mouse.move(b3.x + L3.px[i] * b3.width, b3.y + L3.py[i] * b3.width);
    await page.mouse.down();
    await page.waitForTimeout(60);
    await page.mouse.up();
    await page.waitForTimeout(750);
  }
  await page.waitForTimeout(3200);
  await page.screenshot({ path: join(out, '07-result-retry.png') });
  const scrollX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log('가로 스크롤 px:', scrollX);
  await page.close();
}
await browser.close();
console.log('콘솔 에러:', errors.length ? errors : 0);
