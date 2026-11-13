/** 스튜디오 욕조 물결 오리 (M0~): 결정성 · 하트 없는 판 다시하기 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { FAUCET, STAGES, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, startStage } from '../studio/duckbath/game.ts';
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

  it('실패해도 게임이 끝나지 않고 그 판만 다시 (D001, 오너 기준 7)', () => {
    const s = g.create(5), idle = { tap: false, dir: 0 as const, pointer: null };
    s.taps = 0; // 톡을 다 쓴 상태로 만들어 실패시킨다
    let fails = 0, prev = s.phase;
    for (let k = 0; k < 60 * 60 && fails < 4; k++) {
      g.step(s, idle);
      if (prev === 'play' && s.phase === 'result') fails++;
      if (s.phase === 'play' && s.pt === 1) s.taps = 0;
      prev = s.phase;
    }
    expect(fails).toBe(4);
    expect(g.over(s)).toBe(false);
    expect(s.stage).toBe(0);
    expect(s.stageTries).toBeGreaterThanOrEqual(4);
  });

  describe('쏙·꿀꺽 = 톡 1개 잃고 수도꼭지에서 뿅 (D002, CONTENT §0)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const drainStage = () => {
      const s = g.create(9);
      startStage(s, 2); // 3판: 배수구
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      return s;
    };
    it('배수구에 빠진 오리는 사라지지 않고 수도꼭지에서 다시 나온다, 톡 −1 · 쓴 톡 +1', () => {
      const s = drainStage(), dr = s.L.drains[0], o = s.objs[0], t0 = s.taps, u0 = s.used;
      o.x = dr.x;
      o.y = dr.y;
      g.step(s, idle);
      expect(o.st).toBe(-1);
      expect([o.x, o.y]).toEqual([FAUCET.x, FAUCET.y]);
      expect(s.taps).toBe(t0 - 1);
      expect(s.used).toBe(u0 + 1);
      expect(s.sucks).toBe(1);
    });
    it('톡이 0이면 0에서 멈춘다(음수 없음)', () => {
      const s = drainStage(), dr = s.L.drains[0], o = s.objs[1];
      s.taps = 0;
      o.x = dr.x;
      o.y = dr.y;
      g.step(s, idle);
      expect(s.taps).toBe(0);
      expect(o.st).toBe(-1);
    });
    it('수도꼭지 자리가 둥지에 닿는 판이면 판 시작 자리로 (공짜 입성 금지)', () => {
      const s = g.create(9);
      startStage(s, 0); // 1판: 뒤 가운데 둥지가 수도꼭지 앞에 있다
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      s.L.drains.push({ x: 0.5, y: 0.6, r: 0.035, pr: 0.05, pw: 0 });
      const o = s.objs[1], sx = o.sx, sy = o.sy;
      o.x = 0.5;
      o.y = 0.6;
      g.step(s, idle);
      expect([o.x, o.y]).toEqual([sx, sy]);
    });
    it('4판(색깔): 두 오리 한가운데를 한 톡 치면 둥지에 드는 오리가 0 — 가운데 톡은 틀린 답 (D003 CONTENT v0.2)', () => {
      const A = g.aspect!, PX = (x: number, y: number) => 0.5 + (x - 0.5) * (0.74 + 0.14 * (y / 1.2)), PY = (y: number) => 0.36 + y * 0.66;
      for (const seed of [1000, 1007, 1014]) {
        const s = g.create(seed);
        startStage(s, 3);
        const [a, b] = s.objs.filter((o) => o.k === 0), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        g.step(s, { tap: false, dir: 0, pointer: { x: PX(cx, cy), y: PY(cy) / A } });
        for (let k = 0; k < 600; k++) g.step(s, idle);
        expect(s.objs.filter((o) => o.k === 0 && o.st >= 0).length).toBe(0);
      }
    });
    it('판 질문 한 줄이 판 1~4에 있다 (한 판 = 한 질문)', () => {
      for (let i = 0; i < 4; i++) expect(STAGES[i].ask?.length ?? 0).toBeGreaterThan(5);
    });
  });

  it('캐주얼 봇(상식으로 톡)은 1~2판을 첫 시도에 깬다', { timeout: 60_000 }, () => {
    for (const seed of [3, 4, 5]) {
      const r = play(duckbathCasual, seed);
      expect(r.stages.find((l) => l.stage === 1)?.ok).toBe(true);
      expect(r.stages.find((l) => l.stage === 2)?.ok).toBe(true);
    }
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
