/** 스튜디오 욕조 물결 오리 (M0): 결정성 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { STAGES, duckbath as g, duckbathRandom, duckbathSmart } from '../studio/duckbath/game.ts';
import { play } from '../studio/duckbath/funqa.ts';

describe('욕조 물결 오리 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 판', () => {
    const a = play(duckbathSmart, 7), b = play(duckbathSmart, 7);
    expect([a.score, a.sec, a.stages.length]).toEqual([b.score, b.sec, b.stages.length]);
  });

  it('같은 자리를 치면 같은 결과 (물결 규칙이 읽힌다 = 결정적)', () => {
    const run = () => {
      const s = g.create(3);
      for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: k < 5 ? { x: 0.5, y: 0.6 } : null });
      for (let k = 0; k < 200; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      return s.objs.map((o) => [o.x.toFixed(5), o.y.toFixed(5), o.st]);
    };
    expect(run()).toEqual(run());
  });

  it('숙련 봇은 8판을 모두 깬다 (모든 판이 풀린다)', { timeout: 60_000 }, () => {
    for (const seed of [11, 22, 33]) {
      const r = play(duckbathSmart, seed);
      expect(r.won).toBe(true);
      expect(r.stages.filter((l) => l.ok).length).toBe(STAGES.length);
    }
  });

  it('첫 판은 아무렇게나 해도 대부분 깬다 (오너 기준 7)', { timeout: 60_000 }, () => {
    const runs = Array.from({ length: 10 }, (_, k) => play(duckbathRandom, 500 + k));
    const cleared = runs.filter((r) => r.stages.some((l) => l.stage === 1 && l.ok)).length;
    expect(cleared).toBeGreaterThanOrEqual(8);
  });

  it('잘하는 사람이 확실히 더 높다 (고민 거리, 오너 기준 6)', { timeout: 60_000 }, () => {
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const smart = med([1, 2, 3, 4, 5].map((k) => play(duckbathSmart, 900 + k).score));
    const rnd = med([1, 2, 3, 4, 5].map((k) => play(duckbathRandom, 900 + k).score));
    expect(smart).toBeGreaterThan(rnd * 3);
  });
});

describe('플레이 빌드', () => {
  const path = 'web/public/studio/duckbath/index.html';
  it('빌드가 있고 한 장짜리 HTML, gzip 60KB 이하', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).toContain('<title>욕조 물결 오리</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
