/** 스튜디오 양치기 멍멍 (M0): 프로토타입 이전 — 결정성 · 첫 판 쉬움 · 판 이동 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/sheepdog/core.ts';
import { STAGES, jumpTo, sheepdog as g, sheepdogRandom, sheepdogSmart } from '../studio/sheepdog/game.ts';
import { mulberry32 } from '../studio/sheepdog/rng.ts';

const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y } });
const up = { tap: false, dir: 0 as const, pointer: null };

describe('양치기 멍멍 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, sheepdogSmart, 7, 60 * 60 * 6, 1), b = runBot(g, sheepdogSmart, 7, 60 * 60 * 6, 1);
    expect(a).toEqual(b);
  });

  it('판은 8개, 짖으면 멍멍 수가 늘고 양이 움직인다', () => {
    expect(STAGES.length).toBe(8);
    const s = g.create(3), x0 = [...s.S.x], y0 = [...s.S.y];
    // 양 무리 바로 아래(화면 가운데)를 누르고 떼기
    for (let k = 0; k < 5; k++) g.step(s, at(0.5, 0.5));
    g.step(s, up);
    for (let k = 0; k < 80; k++) g.step(s, up);
    expect(s.S.used + (s.phase === 'result' ? 1 : 0)).toBeGreaterThan(0);
    expect(s.S.x.some((v, i) => v !== x0[i]) || s.S.y.some((v, i) => v !== y0[i])).toBe(true);
  });

  it('아무도 없는 곳에서는 멍멍을 쓰지 않는다 (킁킁)', () => {
    const s = g.create(3);
    g.step(s, at(0.05, 0.7));
    g.step(s, up);
    for (let k = 0; k < 60; k++) g.step(s, up);
    expect(s.S.used).toBe(0);
  });

  it('첫 판은 아무 데나 눌러도 거의 통과 (오너 기준 7)', () => {
    let ok = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = g.create(seed), rng = mulberry32(seed);
      for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) g.step(s, sheepdogRandom.act(s, rng));
      if (s.ok) ok++;
    }
    expect(ok).toBeGreaterThanOrEqual(16);
  });

  it('잘하는 봇은 판마다 통과한다 (판 이동 jumpTo)', () => {
    for (let k = 0; k < STAGES.length; k++) {
      const s = g.create(11), rng = mulberry32(11);
      jumpTo(s, k);
      expect(s.stage).toBe(k);
      for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) g.step(s, sheepdogSmart.act(s, rng));
      expect(s.ok, `${k + 1}판`).toBe(true);
    }
  }, 60_000);
});

describe('플레이 빌드', () => {
  const path = 'web/public/studio/sheepdog/index.html';
  it('index.html 한 장, gzip 60KB 이하, 시작 버튼과 캔버스', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
    expect(html).toContain('id="start"');
    expect(html).toContain('id="game"');
    expect(html).not.toContain('/*BUNDLE*/');
  });
});
