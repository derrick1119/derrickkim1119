/** 스튜디오 행성 수호대 (M1): 결정성 · 난수 분리 · 손맛 사건 · 봇 밸런스 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { BEAT, create, noviceBot, randomBot, runBot, smartBot, spinSpeed, step, type GameEvent, type State } from '../studio/planet-guardian/sim.ts';
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
        step(s, { pick: s.offer ? Math.min(pick, s.offer.length - 1) : undefined });
        for (const e of s.enemies) if (!seen.has(e.id)) seen.set(e.id, e.a);
      }
      return [...seen.entries()].slice(0, 12);
    };
    expect(angles(0)).toEqual(angles(2));
  });

  it('조작 없이 편대가 저절로 돈다, 궤도 가속이면 더 빨리 (오너 C002)', () => {
    const s = create(1), a0 = s.angle;
    for (let k = 0; k < 30; k++) step(s, {});
    expect(s.angle).not.toBe(a0);
    const slow = spinSpeed(s);
    s.spinLv = 2;
    expect(spinSpeed(s)).toBeGreaterThan(slow * 1.9);
  });

  it('카드가 뜨면 고를 때까지 멈춘다, 고르면 다시 흐른다 (오너 C002)', () => {
    const s = create(5);
    while (!s.offer) step(s, {});
    const t = s.t, enemies = JSON.stringify(s.enemies);
    for (let k = 0; k < 200; k++) step(s, {});
    expect(s.t).toBe(t);
    expect(JSON.stringify(s.enemies)).toBe(enemies);
    step(s, { pick: 0 });
    expect(s.offer).toBeNull();
    expect(s.builds).toBe(1);
    step(s, {});
    expect(s.t).toBe(t + 1);
  });

  it('카드는 광석이 아니라 박자로 온다, 다시 뽑기는 광석을 쓴다 (C004)', () => {
    const s = create(9);
    const at: number[] = [];
    while (at.length < 3 && !s.dead) {
      step(s, {});
      if (s.offer) (at.push(s.t), step(s, { pick: 0 }));
    }
    expect(at[1] - at[0]).toBe(BEAT);
    expect(at[2] - at[1]).toBe(BEAT);
    while (!s.offer) step(s, {});
    s.ore = 100;
    const before = s.cost;
    step(s, { reroll: true });
    expect(s.ore).toBe(100 - before);
    expect(s.cost).toBeGreaterThan(before);
    expect(s.offer).not.toBeNull();
    const raised = s.cost;
    step(s, { pick: 0 });
    expect(s.cost).toBe(raised); // C005: 카드를 골라도 다시 뽑기 비용은 그대로 (판 내내 누적)
    while (!s.offer) step(s, {});
    s.ore = 0;
    const offer = JSON.stringify(s.offer);
    step(s, { reroll: true }); // 광석이 모자라면 아무 일도 없다
    expect(JSON.stringify(s.offer)).toBe(offer);
  });

  it('시작하자마자 포탑 하나가 있다', () => {
    expect(create(1).sites.filter((x) => x.kind === '포탑')).toHaveLength(1);
  });

  it('손맛 사건이 나온다: 발사·처치·피격·카드·웨이브', () => {
    const s = create(3), seen = new Set<GameEvent['type']>();
    let g = 0;
    while (!s.dead && s.t < 60 * 600 && g++ < 1e6) {
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
  // 40시드: 아무거나 고르는 봇은 판마다 편차가 커서(28~281초) 16시드 중앙값은 흔들린다 — 목표는 그대로, 측정만 촘촘히 (C004)
  const seeds = [...Array(40).keys()].map((k) => k + 1);
  it('막누르기 봇도 첫 판 30초 이상 (프로토타입은 10초)', () => {
    expect(median(seeds.map((x) => runBot(randomBot, x).sec))).toBeGreaterThanOrEqual(30);
  });
  it('처음 하는 사람 대역(카드 아무거나) 봇은 첫 판 60~150초 (GDD §1)', () => {
    const m = median(seeds.map((x) => runBot(noviceBot, x).sec));
    expect(m).toBeGreaterThanOrEqual(60);
    expect(m).toBeLessThanOrEqual(150);
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

describe('행성 수호대 FUN QA 계기판', () => {
  it('세 유저군 지표를 모두 잰다', async () => {
    const { measure } = await import('../studio/planet-guardian/funqa.ts');
    const m = measure();
    for (const g of ['라이트', '미들코어', '하드코어'] as const) expect(m.checks.filter((c) => c.group === g).length).toBeGreaterThanOrEqual(4);
    for (const c of m.checks) expect(Number.isFinite(c.value)).toBe(true);
  });
});
