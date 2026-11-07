/** 스튜디오 행성 수호대 (M1): 결정성 · 난수 분리 · 손맛 사건 · 봇 밸런스 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { create, randomBot, runBot, smartBot, step, type GameEvent, type State } from '../studio/planet-guardian/sim.ts';
import { createJuice, react, tick } from '../studio/planet-guardian/juice.ts';

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('행성 수호대 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 판', () => {
    const a = runBot(smartBot, 7), b = runBot(smartBot, 7);
    expect([a.score, a.sec, a.kills]).toEqual([b.score, b.sec, b.kills]);
  });

  it('카드를 다르게 골라도 운석 배치는 같다 (데일리 공정성)', () => {
    const angles = (pick: number) => {
      const s = create(42), seen = new Map<number, number>();
      while (s.t < 60 * 40 && !s.dead) {
        const inp = smartBot(s);
        step(s, { dir: inp.dir, pick: s.offer ? Math.min(pick, s.offer.length - 1) : undefined });
        for (const e of s.enemies) if (!seen.has(e.id)) seen.set(e.id, e.a);
      }
      return [...seen.entries()].slice(0, 12);
    };
    expect(angles(0)).toEqual(angles(2));
  });

  it('누른 곳으로 간다: aim 쪽으로 가장 가까운 배가 움직인다', () => {
    const s = create(1);
    const before = s.angle;
    for (let k = 0; k < 30; k++) step(s, { dir: 0, aim: 0 });
    expect(Math.abs(s.angle)).toBeLessThan(Math.abs(before));
  });

  it('시작하자마자 포탑 하나가 있다', () => {
    expect(create(1).sites.filter((x) => x.kind === '포탑')).toHaveLength(1);
  });

  it('손맛 사건이 나온다: 발사·처치·피격·카드·웨이브', () => {
    const s = create(3), seen = new Set<GameEvent['type']>();
    while (!s.dead && s.t < 60 * 600) {
      step(s, randomBot(s, Math.random));
      for (const e of s.events) seen.add(e.type);
    }
    for (const t of ['fire', 'kill', 'impact', 'offer', 'dead'] as const) expect(seen).toContain(t);
    const smart = runBot(smartBot, 3).state as State;
    expect(smart.wave).toBeGreaterThan(3);
  });

  it('손맛 층은 시뮬을 바꾸지 않고, 파티클 수에 상한이 있다', () => {
    const j = createJuice();
    for (let k = 0; k < 200; k++) react(j, { type: 'kill', x: 0.5, y: 0, big: true, combo: k, ore: 3, by: 'body' });
    expect(j.parts.length).toBeLessThanOrEqual(300);
    for (let k = 0; k < 200; k++) tick(j);
    expect(j.parts.length).toBe(0);
    expect(j.trauma).toBe(0);
  });
});

describe('행성 수호대 밸런스 (GDD §8, 봇)', () => {
  const seeds = [...Array(16).keys()].map((k) => k + 1);
  it('막누르기 봇도 첫 판 30초 이상 (프로토타입은 10초)', () => {
    expect(median(seeds.map((x) => runBot(randomBot, x).sec))).toBeGreaterThanOrEqual(30);
  });
  it('잘하는 봇은 3~9분 (88초 스폰 벽 제거)', () => {
    const m = median(seeds.map((x) => runBot(smartBot, x, 60 * 900).sec));
    expect(m).toBeGreaterThanOrEqual(180);
    expect(m).toBeLessThanOrEqual(540);
  });
});

describe('행성 수호대 플레이 빌드', () => {
  const path = 'web/public/studio/planet-guardian/index.html';
  it('빌드가 있고, 번들이 들어 있고, gzip 30KB 이하', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).toContain('행성 수호대');
    expect(gzipSync(html).length).toBeLessThanOrEqual(30 * 1024);
  });
});
