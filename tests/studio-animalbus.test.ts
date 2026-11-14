/** 스튜디오 동물 버스 정류장 (M0~): 결정성 · 그 판부터 다시 · 봇 밸런스 하한(프로토타입 기준선) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { mulberry32 } from '../engine/rng.ts';
import { runBot } from '../studio/animalbus/core.ts';
import { FOLLOW, STAGES, animalbus as g, animalbusSmart, followersOf, internals, layoutFor, setFollow, startStage } from '../studio/animalbus/game.ts';
import { firstMoveWidth, follow, greedy, honestBot, runSim } from '../studio/animalbus/bots.ts';
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

describe('전략 깊이 측정 봇 (M1-1, C002)', () => {
  const hidden = STAGES.findIndex((d) => d.key === 'hidden');
  it('정직 박사는 우비 숨은 색을 몰라도 우비 판을 통과한다 (추측 없이 풀린다)', () => {
    const hon = honestBot(4, 5);
    for (const n of [0, 1]) expect(runSim(layoutFor(1000 + n * 7919, hidden), hon, n + 1).ok).toBe(true);
  });
  it('정직 박사는 숨은 색을 쓰지 않는다: 아직 안 보이는 우비끼리 색을 맞바꿔도 첫 수가 같다', () => {
    const L = layoutFor(1000, hidden), S = internals.newSim(L), re = internals.reach(L, S);
    const hid = L.an.map((a, i) => (a.hidden && !internals.isOpen(L, i, re) ? i : -1)).filter((i) => i >= 0);
    const j = hid.find((i) => L.an[i].col !== L.an[hid[0]].col);
    expect(hid.length).toBeGreaterThan(1);
    expect(j).toBeDefined();
    const swapped = { ...L, an: L.an.map((a, i) => (i === hid[0] ? { ...a, col: L.an[j!].col } : i === j ? { ...a, col: L.an[hid[0]].col } : a)) };
    const ms = internals.moves(L, internals.newSim(L));
    expect(honestBot(4, 5)(swapped, internals.newSim(swapped), ms, mulberry32(9))).toBe(honestBot(4, 5)(L, internals.newSim(L), ms, mulberry32(9)));
  });
  it('따라 하기·탐욕 봇은 결정적이고 1판을 깬다', () => {
    const L = layoutFor(1000, 0);
    for (const b of [follow, greedy]) {
      const a = runSim(L, b, 1), c = runSim(L, b, 1);
      expect(a).toEqual(c);
      expect(a.ok).toBe(true);
    }
  });
  it('첫 수 정답 폭은 0~1, 1판은 어디를 먼저 눌러도 ★3 가능', () => {
    const w = firstMoveWidth(layoutFor(1000, 0));
    expect(w.open).toBeGreaterThan(0);
    expect(w.rate).toBe(1);
  });
});

describe('줄줄이 따라 타기 (C003 오너: "하나씩 눌러서 넣는 게 번거로울 때가 있어")', () => {
  const { newSim, moves, tapSim, cloneSim } = internals;
  /** 따라 탈 친구가 있는 첫 톡을 찾는다 */
  const find = () => {
    for (let n = 0; n < 12; n++) {
      const L = layoutFor(1000 + n * 7919, 2), S = newSim(L);
      for (const i of moves(L, cloneSim(S))) {
        const f = followersOf(L, S, i);
        if (f.length) return { L, S, i, f };
      }
    }
    throw new Error('따라 탈 친구가 있는 판이 없음');
  };
  it('기본으로 켜져 있다', () => expect(FOLLOW).toBe(true));
  it('톡 한 번에 맞닿은 같은 색 친구가 함께 버스에 탄다 (모두 같은 색 · 버스 자리를 넘지 않음)', () => {
    const { L, S, i, f } = find(), col = L.buses[S.bus].col, cap = L.buses[S.bus].cap;
    expect(L.an[i].col).toBe(col);
    for (const j of f) expect(L.an[j].col).toBe(col);
    expect(1 + f.length).toBeLessThanOrEqual(cap);
    const T = cloneSim(S);
    expect(tapSim(L, T, i)).toBe('bus');
    for (const j of [i, ...f]) expect(T.gone[j]).toBe(1);
    expect(T.left).toBe(S.left - 1 - f.length);
  });
  it('의자로 가는 톡은 혼자만 간다', () => {
    for (let n = 0; n < 6; n++) {
      const L = layoutFor(1000 + n * 7919, 2), S = newSim(L), col = L.buses[0].col;
      const i = moves(L, cloneSim(S)).find((j) => L.an[j].col !== col);
      if (i === undefined) continue;
      expect(followersOf(L, S, i)).toEqual([]);
      const T = cloneSim(S);
      tapSim(L, T, i);
      expect(T.gone.reduce((a, x) => a + x, 0)).toBe(1);
    }
  });
  it('끄면 프로토타입과 같다(한 마리씩) · 켜면 탐욕 봇 톡 수가 줄어든다', () => {
    const taps = () => [0, 1, 2].reduce((a, n) => a + runSim(layoutFor(1000 + n * 7919, 3), greedy, n + 1).taps, 0);
    const on = taps();
    setFollow(false);
    const off = taps();
    expect(followersOf(layoutFor(1000, 2), newSim(layoutFor(1000, 2)), 0)).toEqual([]);
    setFollow(true);
    expect(on).toBeLessThan(off);
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
