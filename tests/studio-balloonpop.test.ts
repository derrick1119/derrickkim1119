/** 스튜디오 풍선 팡 연쇄 (M0): 결정성 · 첫 판은 거의 못 진다 · 고민 거리(숙련 격차) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/balloonpop/core.ts';
import { balloonpop as g, balloonpopRandom, balloonpopSmart, density, STAGE_COUNT } from '../studio/balloonpop/game.ts';
import { humanCasual, measure } from '../studio/balloonpop/funqa.ts';

describe('풍선 팡 연쇄 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 결과', () => {
    const a = runBot(g, balloonpopSmart, 11, 60 * 600), b = runBot(g, balloonpopSmart, 11, 60 * 600);
    expect(a).toEqual(b);
  });

  it('톡 한 번이면 연쇄가 일어난다 (첫 손짓에 큰 일)', () => {
    const s = g.create(3);
    let t = 0;
    while (s.used === 0 && t++ < 600) g.step(s, balloonpopSmart.act(s, () => 0.5));
    for (let k = 0; k < 120; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.used).toBe(1);
    expect(s.popped).toBeGreaterThanOrEqual(4);
  });

  it('판은 8개, 숙련 봇은 거의 끝까지 간다', () => {
    expect(STAGE_COUNT).toBe(8);
    const e = measure(balloonpopSmart, 12);
    expect(e.finish).toBeGreaterThanOrEqual(0.9);
  });

  it('첫 판은 아무렇게나 해도 거의 깬다, 숙련과 격차는 크다', () => {
    const c = measure(balloonpopRandom, 20), e = measure(balloonpopSmart, 20);
    expect(c.firstTry[0]).toBeGreaterThanOrEqual(0.9);
    expect(e.score / Math.max(1, c.score)).toBeGreaterThanOrEqual(2);
  });
});

describe('FUN v1 측정 (C001)', () => {
  it('사람형 캐주얼 봇은 풍선 위만 누른다 — 헛톡이 없어 처음 봇보다 1판 첫 톡 연쇄가 0이 아니다', () => {
    const h = measure(humanCasual, 12);
    expect(h.n[0]).toBe(12);
    expect(h.firstChain[0]).toBeGreaterThanOrEqual(1);
    expect(h.death.reduce((a, b) => a + b, 0)).toBeCloseTo(h.finish < 1 ? 1 : 0, 1);
  });

  it('밀도: 같은 시드·판이면 같은 값, 겹침 지수는 0~1', () => {
    const a = density(1000, 1), b = density(1000, 1);
    expect(a).toEqual(b);
    expect(a.overlap).toBeGreaterThanOrEqual(0);
    expect(a.overlap).toBeLessThanOrEqual(1);
    expect(a.n).toBeGreaterThan(3);
  });
});

describe('풍선 팡 연쇄 플레이 빌드', () => {
  const path = 'web/public/studio/balloonpop/index.html';
  it('빌드가 있고 가볍다 (gzip 60KB 이하)', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).toContain('풍선 팡 연쇄');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
