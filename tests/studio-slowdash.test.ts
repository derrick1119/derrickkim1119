/** 스튜디오 느린 시간 닌자 (M0~): 결정성 · 판별 시작 · 취소 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/slowdash/core.ts';
import { STAGES, STRIKE, missOf, slowdash as g, slowdashRandom, slowdashSmart, startStage } from '../studio/slowdash/game.ts';
import { BOTS, measure, tapEvery, try3, tryStage } from '../studio/slowdash/funqa.ts';
import { chainHz, sfx } from '../studio/slowdash/sfx.ts';

const A = g.aspect ?? 1.52;

describe('느린 시간 닌자 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, slowdashSmart, 7, 60 * 300), b = runBot(g, slowdashSmart, 7, 60 * 300);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('아무 판에서나 시작할 수 있다 (측정·판 고르기용)', () => {
    const s = g.create(3);
    startStage(s, 5);
    expect(s.stage).toBe(5);
    expect(s.phase).toBe('play');
    expect(STAGES.length).toBe(8);
  });

  it('누르는 동안 게이지가 줄고(느린 시간), 닌자 위에서 떼면 돌진하지 않는다(취소)', () => {
    const s = g.create(4);
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const g0 = s.g, x0 = s.nx, y0 = s.ny;
    for (let k = 0; k < 20; k++) g.step(s, { tap: false, dir: 0, pointer: { x: s.nx, y: s.ny / A } });
    expect(s.down).toBe(true);
    expect(s.g).toBeLessThan(g0);
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.dashes).toBe(0);
    expect([s.nx, s.ny]).toEqual([x0, y0]);
  });

  it('1판: 허수아비 셋 너머를 꾹 → 떼면 한 번에 셋을 벤다 (첫 큰 순간)', () => {
    const s = g.create(1);
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    for (let k = 0; k < 10; k++) g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: 0.56 / A } });
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.best).toBe(3);
  });


  it('S002 별 틀: 모든 판 별이 같은 세 가지(★ 지나가기 · ★★ 한 번에 N 베기 · ★★★ 꼬리 하나도 안 잃기), N만 다르다', () => {
    for (const d of STAGES) {
      expect(d.stars.map((q) => q.k)).toEqual(['multi', 'nohit']);
      expect(d.stars[0].n).toBe(d.n);
      expect(d.n).toBeGreaterThanOrEqual(3);
      expect(d.stars[1].label).toBe('꼬리 하나도 안 잃기');
    }
    expect(STAGES[0].gift3).toBe(true); // 1-1 허수아비 판은 맞을 수 없다 → 선물 별
  });

  it('S002 하트 폐지: 져도 게임이 끝나지 않고 그 판만 바로 다시 · 결과 화면은 놓친 별 이유를 쉬운 말로', () => {
    const s = g.create(5);
    startStage(s, 1);
    let fails = 0;
    for (let t = 0; t < 60 * 120 && fails < 2; t++) {
      g.step(s, { tap: false, dir: 0, pointer: null }); // 가만히 서 있으면 칼잡이에게 맞아 진다
      if (s.phase === 'result' && !s.ok && s.pt === 1) fails++;
    }
    expect(fails).toBe(2);
    expect(g.over(s)).toBe(false);
    expect(s.stage).toBe(1);
    const w = g.create(7);
    w.stage = 1;
    w.best = 2;
    w.hits = 1;
    w.starOk = [true, false, false];
    expect(missOf(w)).toBe(`한 번에 2 / ${STAGES[1].n} · 꼬리 2 / 3`);
    w.starOk = [true, true, true];
    expect(missOf(w)).toBe('');
  });

  it('S003 헛방: 아무것도 못 벤 획은 헛방으로 세고 근처 칼잡이가 바로 칼을 든다 · 방패 바로 앞 0길이 떼기는 취소가 아니라 튕김(헛방)', () => {
    // (경직 20틱은 S003 측정으로 뺐다 — 장인 '옮겨 서기'를 막아 5판 ★3 .92 → .04, 연타엔 효과 0. TALK S003)
    const s = g.create(4);
    startStage(s, 1);
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const near = s.foes.find((f) => f.k === 'sword')!;
    near.cool = 99;
    s.nx = near.x;
    s.ny = Math.min(1.27, near.y + 0.32);
    g.step(s, { tap: false, dir: 0, pointer: { x: s.nx + 0.15, y: (s.ny - 0.1) / A } }); // 칼잡이 곁 빈 곳으로 꾹
    g.step(s, { tap: false, dir: 0, pointer: null }); // 떼기 → 빈 획
    expect(s.dashes).toBe(1);
    expect(s.whiffs).toBe(1);
    expect(s.events.some((e) => e.kind === 'whiffme')).toBe(true);
    // 방패 바로 앞: 길이 0이어도 '튕김' 사건이 나고 헛방으로 센다
    const t = g.create(9);
    startStage(t, 4);
    for (let k = 0; k < 80; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    const sh = t.foes.find((f) => f.k === 'shield')!;
    sh.fa = Math.atan2(t.ny - sh.y, t.nx - sh.x);
    t.nx = sh.x + Math.cos(sh.fa) * 0.062;
    t.ny = sh.y + Math.sin(sh.fa) * 0.062;
    const w0 = t.whiffs;
    g.step(t, { tap: false, dir: 0, pointer: { x: sh.x, y: sh.y / A } });
    g.step(t, { tap: false, dir: 0, pointer: null });
    expect(t.events.some((e) => e.kind === 'bounce' && e.t === t.t)).toBe(true);
    expect(t.whiffs).toBe(w0 + 1);
  });

  it('S004 찾아오는 위협: 일격 판에서 내린 자리에 32틱 뒤 일격 — 그 자리에 남으면 맞고, 꾹(느린 시간) 하면 비켜 갈 틈이 있다', () => {
    expect(STAGES.filter((d) => d.strike).map((d) => d.key)).toEqual(['archer', 'shuri', 'mirror', 'boss']);
    const run = (holdAfter: boolean) => {
      const s = g.create(3);
      startStage(s, 2);
      s.foes = [];
      for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      g.step(s, { tap: false, dir: 0, pointer: { x: s.nx, y: (s.ny - 0.3) / A } });
      g.step(s, { tap: false, dir: 0, pointer: null }); // 내림 → 일격 하나
      expect(s.strikes).toHaveLength(1);
      expect(s.strikes[0].t).toBeGreaterThan(30); // 32틱에서 시작(떼는 틱에 세상이 한 틱 흐름)
      // 사람 반응 0.5초(30틱) 동안 그냥 서 있기 vs 꾹 누른 채 0.5초 겨누기
      for (let k = 0; k < 30; k++) g.step(s, { tap: false, dir: 0, pointer: holdAfter ? { x: 0.2, y: (s.ny + 0.1) / A } : null });
      g.step(s, { tap: false, dir: 0, pointer: null }); // 떼기 → 옆으로 돌진(그 자리에 새 일격이 생기니 첫 일격이 터질 때까지만 본다)
      for (let k = 0; k < 6; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      return s.hits;
    };
    expect(run(false)).toBeGreaterThan(0); // 실시간 0.5초면 이미 맞았다
    expect(run(true)).toBe(0); // 꾹 하면 세상이 느려져 비켜 간다
    expect(STRIKE.r).toBeGreaterThan(0);
  });

  it('오너 피드백 한붓 획: 꾹 누른 채 그은 길을 따라 한 번에 돌진하며 베고, 가만히 누르면 예전처럼 한 줄', () => {
    const s = g.create(1);
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const [a, b, c] = s.foes;
    [a.x, a.y, b.x, b.y, c.x, c.y] = [0.3, 1.0, 0.3, 0.8, 0.62, 0.78]; // 한 줄로 안 서는 셋
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    for (const [x, y] of [[0.3, 1.1], [0.3, 0.95], [0.3, 0.85], [0.3, 0.74], [0.45, 0.76], [0.6, 0.78], [0.72, 0.78]]) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
    expect(s.stroke.length).toBeGreaterThanOrEqual(3);
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.best).toBe(3); // 꺾인 획 하나로 셋
    expect(Math.hypot(s.nx - 0.72, s.ny - 0.78)).toBeLessThan(0.05);
    // 가만히 누르면 점이 안 남는다(한 줄 돌진 = 봇·예전 손맛 그대로)
    const t = g.create(1);
    for (let k = 0; k < 60; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    for (let k = 0; k < 10; k++) g.step(t, at(0.5, 0.56));
    expect(t.stroke).toHaveLength(0);
    g.step(t, { tap: false, dir: 0, pointer: null });
    expect(t.best).toBe(3);
  });

  it('S005 효과음: 시뮬·봇은 소리를 모른다(헤드리스로 한 판 돌려도 AudioContext 0) · 연쇄 음계는 5음계로 오르고 8번째부터 고정', () => {
    runBot(g, slowdashSmart, 5, 60 * 120);
    expect(sfx.live).toBe(false);
    sfx.play('slash', 3); // 깨우기 전에는 아무 일도 없다
    expect(sfx.live).toBe(false);
    expect([1, 2, 3, 8, 12].map(chainHz)).toEqual([587, 659, 784, 1568, 1568]);
    const tap = tryStage(tapEvery(48), 101, 2);
    expect(tap.dashes).toBeGreaterThan(0); // 탭 스윕 대조군이 실제로 움직인다
  });

  it('장인 봇은 8판을 모두 지나간다 (콘텐츠가 풀린다)', () => {
    for (let k = 0; k < STAGES.length; k++) for (const seed of [11, 22]) expect(tryStage(slowdashSmart, seed, k).ok, `${k + 1}판 시드 ${seed}`).toBe(true);
  });

  it('M0 기준선: 숙련 격차 ≥ 3 · 처음 10초에 무작위가 안 맞는다 · 버릇 봇 ★3(3판~) < 50% · 무작위 1판 클리어', () => {
    const m = measure(4, ['smart', 'habit', 'habit2', 'random']);
    expect(m.gap).toBeGreaterThanOrEqual(3);
    expect(m.firstImpression.randomHurtIn10s).toBe(0);
    expect(m.habitStar3Max3plus.habit).toBeLessThan(0.5);
    expect(m.habitStar3Max3plus.habit2).toBeLessThan(0.5);
    expect((m.stages[0].random as { clear: number }).clear).toBeGreaterThanOrEqual(0.75);
    expect(runBot(g, slowdashRandom, 3, 60 * 600).s.stars).toBeGreaterThanOrEqual(0);
  });

  it('M1 S001 측정기: 사람 반응 봇 · 연타 · 버릇 ③④ · 처음 하는 사람이 있고, F5(느린 시간 낙차)·F6(연타)을 한 번에 낸다', () => {
    for (const b of ['human', 'humanNew', 'humanPro', 'humanTap', 'spam', 'habit3', 'habit4', 'newbie']) expect(BOTS[b], b).toBeDefined();
    const m = measure(2, ['smart', 'random', 'human', 'humanTap', 'spam']);
    expect(m.F5).not.toBeNull();
    expect(m.F6!.clear).toHaveLength(STAGES.length);
    // 사람 반응 봇(꾹 판)은 실제로 누른 채 겨눈다(평균 꾹 ≈ 반응 0.5초) · 탭 판은 1틱
    expect(m.F5!.holdAvg).toBeGreaterThan(0.3);
    expect((m.stages[0].humanTap as { holdAvg: number }).holdAvg).toBeLessThan(0.05);
  });

  it('처음 하는 사람은 같은 판을 3번까지 도전하고, 사람 반응 봇은 같은 시드면 같은 결과', () => {
    const a = try3(BOTS.newbie, 5, 0), b = tryStage(BOTS.human, 9, 1), c = tryStage(BOTS.human, 9, 1);
    expect(a.tries).toBeGreaterThanOrEqual(1);
    expect(a.tries).toBeLessThanOrEqual(3);
    expect([b.ok, b.sec, b.dashes, b.best]).toEqual([c.ok, c.sec, c.dashes, c.best]);
  });
});

describe('느린 시간 닌자 플레이 빌드', () => {
  const f = 'web/public/studio/slowdash/index.html';
  it('빌드가 있고 한 장으로 묶였다 (gzip ≤ 40KB)', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).toContain('<title>느린 시간 닌자</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThanOrEqual(40 * 1024);
  });
});
