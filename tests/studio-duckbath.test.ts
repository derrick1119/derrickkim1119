/** 스튜디오 욕조 물결 오리 (M0~): 결정성 · 하트 없는 판 다시하기 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { FAUCET, STAGES, advance, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, failText, hintPoint, startStage } from '../studio/duckbath/game.ts';
import { SAVE_KEY, makeStore } from '../studio/duckbath/save.ts';
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

  describe('결과·실패 카드 버튼 (D004)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const clear1 = (s: ReturnType<typeof g.create>) => {
      for (const o of s.objs) if (o.k === 0 || o.k === 1) o.st = 0; // 확인용: 오리를 모두 둥지에
      for (let k = 0; k < 5 && s.phase === 'play'; k++) g.step(s, idle);
    };
    it('브라우저(manual)는 결과에서 버튼을 기다린다 — 저절로 넘어가지 않는다', () => {
      const s = g.create(4);
      s.manual = true;
      clear1(s);
      expect(s.phase).toBe('result');
      for (let k = 0; k < 600; k++) g.step(s, idle);
      expect([s.phase, s.stage]).toEqual(['result', 0]);
      advance(s, 'next');
      expect([s.phase, s.stage]).toEqual(['play', 1]);
    });
    it("같은 판을 '다시' 깨도 별은 판별 최고만 센다 (두 번 쌓이지 않음)", () => {
      const s = g.create(4);
      s.manual = true;
      clear1(s);
      const once = s.stars;
      advance(s, 'retry');
      expect([s.phase, s.stage]).toEqual(['play', 0]);
      clear1(s);
      expect(s.stars).toBe(once);
    });
    it('↺2 손가락: 같은 판을 두 번 넘게 실패하면 첫 톡 자리를 보여 준다(그 전엔 없음)', () => {
      const s = g.create(4);
      startStage(s, 4);
      expect(hintPoint(s)).toBeNull();
      s.stageTries = 2;
      const p = hintPoint(s)!;
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    });
    it("깬 판을 '다시' 하면 ↺2 손가락은 안 뜬다 (별 사냥의 첫 수를 공짜로 주지 않음)", () => {
      const s = g.create(4);
      s.manual = true;
      s.stageTries = 3;
      clear1(s);
      advance(s, 'retry');
      expect(hintPoint(s)).toBeNull();
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

describe('저장·판 고르기 (D005)', () => {
  const fake = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } as unknown as Storage & { m: Map<string, string> };
  };
  it('판을 깨면 다음 판이 열리고, 다시 열어도 남아 있다 (최고 별만)', () => {
    const ls = fake(), a = makeStore(8, () => ls);
    expect(a.persistent).toBe(true);
    expect(a.data.open).toBe(1);
    a.clear(0, 2);
    a.clear(0, 1); // 낮은 별로 다시 깨도 최고 별 유지
    expect([a.data.best[0], a.data.open]).toEqual([2, 2]);
    const b = makeStore(8, () => ls);
    expect([b.data.best[0], b.data.open]).toEqual([2, 2]);
    b.clear(7, 3);
    expect(b.data.open).toBe(8); // 마지막 판 너머로 열리지 않는다
  });
  it('localStorage가 막혀도(접근 예외·쓰기 예외·깨진 데이터) 메모리로 계속 간다', () => {
    const thrower = makeStore(8, () => { throw new Error('SecurityError'); });
    expect(thrower.persistent).toBe(false);
    expect(() => thrower.clear(0, 3)).not.toThrow();
    expect(thrower.data.open).toBe(2);
    const full = fake();
    full.setItem = () => { throw new Error('QuotaExceeded'); };
    const q = makeStore(8, () => full);
    expect(() => q.clear(1, 1)).not.toThrow();
    const bad = fake();
    bad.m.set(SAVE_KEY, '{not json');
    expect(makeStore(8, () => bad).data.open).toBe(1);
  });
  it('실패 카드: 주범이 쓴 톡의 25% 미만이면 톡 바닥 + 그 판의 교훈, 이상이면 주범 제목 (테스트로 옮긴 v1.4 N4)', () => {
    const s = g.create(2);
    startStage(s, 7);
    Object.assign(s, { used: 12, sucks: 1, chomps: 0 });
    expect(failText(s)).toMatchObject({ kind: 'taps', tip: STAGES[7].hint });
    Object.assign(s, { sucks: 2 }); // 12톡 중 2톡 = 17% → 아직 '톡 바닥' (🧪 D005: 2톡 조항 뺌)
    expect(failText(s).kind).toBe('taps');
    Object.assign(s, { sucks: 3 }); // 25%
    expect(failText(s).kind).toBe('suck');
    Object.assign(s, { used: 4, sucks: 0, chomps: 1 });
    expect(failText(s).kind).toBe('chomp');
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
