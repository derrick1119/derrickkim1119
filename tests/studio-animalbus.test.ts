/** 스튜디오 동물 버스 정류장 (M0~): 결정성 · 그 판부터 다시 · 봇 밸런스 하한(프로토타입 기준선) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/animalbus/core.ts';
import { STAGES, animalbus as g, animalbusSmart, startStage } from '../studio/animalbus/game.ts';
import { playStage, BOTS } from '../studio/animalbus/funqa.ts';

describe('동물 버스 정류장 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 결과', () => {
    const a = runBot(g, animalbusSmart, 11, 60 * 120), b = runBot(g, animalbusSmart, 11, 60 * 120);
    expect([a.score, a.ticks]).toEqual([b.score, b.ticks]);
  });

  it('startStage: i판으로 바로 들어간다 (끝 카드의 "그 판부터 다시")', () => {
    const s = g.create(3);
    startStage(s, 4);
    expect(s.stage).toBe(4);
    expect(s.phase).toBe('play');
    startStage(s, 99);
    expect(s.stage).toBe(STAGES.length - 1);
  });

  it('정류장 박사는 모든 판을 ★3으로 깬다 (판이 풀린다)', () => {
    for (let i = 0; i < STAGES.length; i++) {
      const r = playStage(animalbusSmart, 1000 + i, i);
      expect(r.ok, `${i + 1}판`).toBe(true);
      expect(r.stars, `${i + 1}판`).toBe(3);
    }
  });

  it('첫 판은 거의 못 진다: 무작위 톡 1판 통과 ≥ 5/6 (오너 기준 7)', () => {
    const wins = [0, 1, 2, 3, 4, 5].filter((n) => playStage(BOTS.random, 1000 + n * 7919, 0).ok).length;
    expect(wins).toBeGreaterThanOrEqual(5);
  });

  it('버릇 하나로는 ★3이 안 나온다: 3~8판 버릇쟁이 ★3 ≤ 1/6 (오너 기준 11)', () => {
    for (let i = 2; i < STAGES.length; i++) {
      const s3 = [0, 1, 2, 3, 4, 5].filter((n) => playStage(BOTS.habit, 1000 + n * 7919, i).stars === 3).length;
      expect(s3, `${i + 1}판`).toBeLessThanOrEqual(1);
    }
  });
});

describe('플레이 빌드', () => {
  const f = 'web/public/studio/animalbus/index.html';
  it('index.html이 있고 번들이 들어 있으며 gzip 60KB 이하', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).toContain('동물 버스 정류장');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
