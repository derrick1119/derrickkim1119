/** 스튜디오 느린 시간 닌자 (M0~): 결정성 · 판별 시작 · 취소 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/slowdash/core.ts';
import { STAGES, slowdash as g, slowdashRandom, slowdashSmart, startStage } from '../studio/slowdash/game.ts';
import { measure, tryStage } from '../studio/slowdash/funqa.ts';

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

  it('장인 봇은 8판을 모두 지나간다 (콘텐츠가 풀린다)', () => {
    for (let k = 0; k < STAGES.length; k++) for (const seed of [11, 22]) expect(tryStage(slowdashSmart, seed, k).ok, `${k + 1}판 시드 ${seed}`).toBe(true);
  });

  it('M0 기준선: 숙련 격차 ≥ 3 · 처음 10초에 무작위가 안 맞는다 · 버릇 봇 ★3(3판~) < 50% · 무작위 1판 클리어', () => {
    const m = measure(4);
    expect(m.gap).toBeGreaterThanOrEqual(3);
    expect(m.firstImpression.randomHurtIn10s).toBe(0);
    expect(m.habitStar3Max3plus.habit).toBeLessThan(0.5);
    expect(m.habitStar3Max3plus.habit2).toBeLessThan(0.5);
    expect((m.stages[0].random as { clear: number }).clear).toBeGreaterThanOrEqual(0.75);
    expect(runBot(g, slowdashRandom, 3, 60 * 600).s.stars).toBeGreaterThanOrEqual(0);
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
