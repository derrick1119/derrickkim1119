/** 스튜디오 비버 철거반 (M0~): 결정성 · 미리 보기 = 실제 · 판마다 ★3 가능 · 끝까지 깰 수 있음 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { STAGES, bestPlan, demolition as g, demolitionSmart, layoutOf, simulate } from '../studio/demolition/game.ts';
import { measure } from '../studio/demolition/funqa.ts';
import { NO_INPUT } from '../studio/demolition/core.ts';
import { mulberry32 } from '../engine/rng.ts';

const play = (seed: number) => {
  const s = g.create(seed), rng = mulberry32(seed);
  let t = 0;
  while (!g.over(s) && t < 60 * 60 * 10) g.step(s, t++ % 3 === 0 ? demolitionSmart.act(s, rng) : NO_INPUT);
  return s;
};

describe('비버 철거반 시뮬', () => {
  it('같은 시드면 같은 판 (결정적)', () => {
    const a = play(5), b = play(5);
    expect([a.pts, a.stars, a.t]).toEqual([b.pts, b.stars, b.t]);
  });

  it('미리 보기 = 실제: 같은 폭약이면 simulate 결과가 늘 같다, 좌우를 뒤집어도 같은 별', () => {
    for (const d of STAGES) {
      const L = layoutOf(d, false), F = layoutOf(d, true), plan = bestPlan(L), fplan = bestPlan(F);
      const ch = new Int8Array(L.blocks.length);
      for (const i of plan) ch[i]++;
      const o1 = simulate(L, ch), o2 = simulate(L, ch, true);
      expect([o1.ok, o1.stars, o1.height]).toEqual([o2.ok, o2.stars, o2.height]);
      const fch = new Int8Array(F.blocks.length);
      for (const i of fplan) fch[i]++;
      expect(simulate(F, fch).stars).toBe(o1.stars);
    }
  });

  it('모든 판은 ★3이 가능하고, 철거 박사 봇은 8판을 하트 하나 안 잃고 끝낸다', () => {
    const r = measure();
    expect(r.summary.allStar3Possible).toBe(true);
    for (const x of r.runs.smart) expect([x.won, x.hearts]).toEqual([true, 3]);
  });

  it('1판은 거의 못 진다 (오너 기준 7) · 버릇 하나로는 3판부터 ★3이 안 나온다 (기준 11)', () => {
    const r = measure();
    expect(r.stages[0].random.clear).toBeGreaterThanOrEqual(0.95);
    expect(r.summary.habitStar3.startsWith('0/')).toBe(true);
  });
});

describe('플레이 빌드', () => {
  it('web/public/studio/demolition/index.html 이 있고 gzip 60KB 이하', () => {
    const p = 'web/public/studio/demolition/index.html';
    expect(existsSync(p)).toBe(true);
    const html = readFileSync(p, 'utf8');
    expect(html).toContain('비버 철거반');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
