/** 스튜디오 마녀 고양이 물약 정렬 (M0~): 결정성 · 그 판부터 다시 · 규칙 · 봇 밸런스 하한(프로토타입 기준선) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/potionsort/core.ts';
import { FZ, STAGES, buildLevel, canPour, newSim, potionsort as g, potionsortSmart, pour, startStage } from '../studio/potionsort/game.ts';
import { BOTS, playStage } from '../studio/potionsort/funqa.ts';

describe('물약 정렬 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 결과', () => {
    const a = runBot(g, potionsortSmart, 11, 60 * 120), b = runBot(g, potionsortSmart, 11, 60 * 120);
    expect([a.score, a.ticks]).toEqual([b.score, b.ticks]);
  });

  it('같은 시드·같은 판이면 같은 배치', () => {
    for (let i = 0; i < STAGES.length; i++) expect(JSON.stringify(buildLevel(77, i).init)).toBe(JSON.stringify(buildLevel(77, i).init));
  });

  it('startStage: i판으로 바로 들어간다 (끝 카드의 "그 판부터 다시")', () => {
    const s = g.create(3);
    startStage(s, 4);
    expect(s.stage).toBe(4);
    expect(s.phase).toBe('play');
    startStage(s, 99);
    expect(s.stage).toBe(STAGES.length - 1);
  });

  it('맨 위 색은 같은 색 위나 빈 병에만 (💥 부글 물약만 아무 색 위에나)', () => {
    for (let i = 0; i < STAGES.length; i++) {
      const L = buildLevel(5, i), S = newSim(L);
      for (let a = 0; a < L.n; a++)
        for (let b = 0; b < L.n; b++) {
          if (!canPour(L, S, a, b)) continue;
          const src = S.b[a], dst = S.b[b], c = src[src.length - 1];
          if (dst.length && c !== FZ) expect(dst[dst.length - 1], `${i + 1}판 ${a}→${b}`).toBe(c);
        }
    }
  });

  it('붓기는 물약 칸 수를 늘리지 않는다 (💥 퐁은 두 칸이 함께 사라진다)', () => {
    const L = buildLevel(9, 1), S = newSim(L), n0 = S.b.flat().length;
    for (let a = 0; a < L.n; a++) for (let b = 0; b < L.n; b++) if (canPour(L, S, a, b)) {
      pour(L, S, a, b);
      expect(S.b.flat().length).toBeLessThanOrEqual(n0);
      return;
    }
  });

  it('물약 장인은 모든 판을 깬다 (판이 풀린다)', () => {
    for (let i = 0; i < STAGES.length; i++) expect(playStage(potionsortSmart, 1000 + i, i).ok, `${i + 1}판`).toBe(true);
  });

  it('첫 판은 거의 못 진다: 무작위 톡 1판 통과 ≥ 5/6 (오너 기준 7)', () => {
    const wins = [0, 1, 2, 3, 4, 5].filter((n) => playStage(BOTS.random, 1000 + n * 7919, 0).ok).length;
    expect(wins).toBeGreaterThanOrEqual(5);
  });

  it('버릇 하나로는 ★3이 안 나온다: 3~8판 버릇 봇 ★3 ≤ 1/6 (오너 기준 11, 프로토타입 기준선)', () => {
    for (let i = 2; i < STAGES.length; i++) {
      const n3 = [0, 1, 2, 3, 4, 5].filter((n) => playStage(BOTS.habit, 1000 + n * 7919, i).stars === 3).length;
      expect(n3, `${i + 1}판`).toBeLessThanOrEqual(1);
    }
  });
});

describe('플레이 빌드', () => {
  const f = 'web/public/studio/potionsort/index.html';
  it('index.html이 있고 번들이 들어 있으며 gzip 60KB 이하', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).toContain('마녀 고양이');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
