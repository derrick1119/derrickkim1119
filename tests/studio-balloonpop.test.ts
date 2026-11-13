/** 스튜디오 풍선 팡 연쇄 (M0): 결정성 · 첫 판은 거의 못 진다 · 고민 거리(숙련 격차) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/balloonpop/core.ts';
import { A, balloonpop as g, balloonpopRandom, balloonpopSmart, BEAT, bxAt, byAt, density, emptyNear, FAIL_RESULT, fitCanvas, HELP_AFTER, IRON, KING, playTop, RETRY_CARD, STAGE_COUNT, STAGES, startAt, type PopState } from '../studio/balloonpop/game.ts';
import { densityTable, humanCasual, humanLate, measure } from '../studio/balloonpop/funqa.ts';
import { mulberry32 } from '../engine/rng.ts';

describe('풍선 팡 연쇄 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 결과', () => {
    const a = runBot(g, balloonpopSmart, 11, 60 * 600), b = runBot(g, balloonpopSmart, 11, 60 * 600);
    expect(a).toEqual(b);
  });

  it('톡 한 번이면 연쇄가 일어난다 (첫 손짓에 큰 일)', () => {
    const s = g.create(3);
    let t = 0;
    while (s.used === 0 && t++ < 600) g.step(s, balloonpopSmart.act(s, () => 0.5));
    for (let k = 0; k < 120; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.used).toBe(1);
    expect(s.popped).toBeGreaterThanOrEqual(4);
  });

  it('판은 8개, 숙련 봇은 거의 끝까지 간다', () => {
    expect(STAGE_COUNT).toBe(8);
    const e = measure(balloonpopSmart, 12);
    expect(e.finish).toBeGreaterThanOrEqual(0.9);
  });

  it('첫 판은 아무렇게나 해도 거의 깬다, 숙련과 격차는 크다', () => {
    const c = measure(balloonpopRandom, 20), e = measure(balloonpopSmart, 20);
    expect(c.firstTry[0]).toBeGreaterThanOrEqual(0.9);
    // 숙련 격차 (FUN v1.2: 하트가 없어 점수비 대신 시도당 별 비) — 문턱 2는 그대로
    expect(e.starsPerTry / Math.max(0.01, c.starsPerTry)).toBeGreaterThanOrEqual(2);
  });
});

describe('하트 없음 · 즉시 재도전 · 도움 반짝 (C002)', () => {
  /** 사람형 봇으로 돌리다가 cond가 참이 되는 순간에 멈춘다 */
  const runUntil = (s: PopState, cond: (s: PopState) => boolean, max = 60 * 600) => {
    const rng = mulberry32(99);
    for (let k = 0; k < max && !cond(s) && !g.over(s); k++) g.step(s, humanCasual.act(s, rng));
    return cond(s);
  };

  it('실패해도 끝나지 않고, 1초 안에 같은 하늘을 다시 한다', () => {
    const s = g.create(5);
    expect(runUntil(s, (x) => x.phase === 'result' && !x.ok)).toBe(true);
    const L = s.L, stage = s.stage, t0 = s.t;
    while (s.phase === 'result') g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.t - t0).toBeLessThanOrEqual(FAIL_RESULT + 1);
    expect(s.phase).toBe('play');
    expect(s.stage).toBe(stage);
    expect(s.L).toBe(L);
    expect(s.tries).toBe(1);
    expect(g.over(s)).toBe(false);
    expect(s).not.toHaveProperty('hearts');
  });

  /** 정해 둔 시드들 중 cond에 닿는 첫 런 (판이 쉬워져 한 시드가 두 번 실패하지 않을 수 있어서, C006) */
  const firstRun = (cond: (s: PopState) => boolean) => {
    for (let seed = 1; seed <= 60; seed++) {
      const s = g.create(seed);
      if (runUntil(s, cond)) return s;
    }
    return null;
  };

  it(`${HELP_AFTER}번 실패하면 도움 반짝이 뜨고, 그 시도는 ★ 두 번 안에를 받을 수 없다`, () => {
    const s = firstRun((x) => x.tries >= HELP_AFTER && x.phase === 'play')!;
    expect(s).not.toBeNull();
    expect(s.helped).toBe(true);
    expect(s.help).toBeGreaterThanOrEqual(0);
    expect(runUntil(s, (x) => x.phase === 'result')).toBe(true);
    expect(s.m2).toBe(false);
  });

  it('도움 반짝은 톡마다 다음 풍선으로 옮겨 간다 (C003)', () => {
    const s = firstRun((x) => x.helped && x.used === 1 && x.phase === 'play' && x.help >= 0)!;
    expect(s).not.toBeNull();
    expect(s.alive[s.help]).toBe(1);
  });

  it('숙련 봇은 모든 판·모든 시드에서 첫 시도에 ★2 이상 (배치 검증, FUN v1.3)', () => {
    const e = measure(balloonpopSmart, 12);
    expect(e.firstTry.every((x) => x === 1)).toBe(true);
    expect(e.firstStar2.every((x) => x >= 0.95)).toBe(true);
  });

  it('도움 반짝을 따르면 도움 없을 때보다 못하지 않다 (도움 시도 10번 이상인 판, FUN v1.3)', () => {
    const h = measure(humanCasual, 40);
    for (let k = 0; k < STAGE_COUNT; k++) if (h.helpN[k] >= 10) expect(h.helpAfter[k]).toBeGreaterThanOrEqual(h.helpBefore[k]);
    expect(h.stuckRate).toBeLessThanOrEqual(0.05);
  });

  it('다시 카드가 떠 있는 동안의 톡은 받지 않는다 (C004)', () => {
    const s = g.create(5);
    expect(runUntil(s, (x) => x.phase === 'result' && !x.ok)).toBe(true);
    while (s.phase === 'result') g.step(s, { tap: false, dir: 0, pointer: null });
    const i = s.L.bs.findIndex((b, k) => s.alive[k] === 1 && b.k !== IRON), b = s.L.bs[i];
    const at = () => ({ x: bxAt(b, s.st + 1), y: byAt(b, s.st + 1) / A });
    g.step(s, { tap: false, dir: 0, pointer: at() });
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.pt).toBeLessThan(RETRY_CARD);
    expect(s.taps).toBe(3);
    while (s.pt < RETRY_CARD) g.step(s, { tap: false, dir: 0, pointer: null });
    g.step(s, { tap: false, dir: 0, pointer: at() });
    expect(s.taps).toBe(2);
  });

  it('톡 → 다음 팡(연쇄 첫 박자)은 1초 안 (FUN v1.1)', () => {
    expect(BEAT).toBeLessThanOrEqual(60);
  });
});

describe('FUN v1 측정 (C001)', () => {
  it('사람형 캐주얼 봇은 풍선 위만 누른다 — 헛톡이 없어 처음 봇보다 1판 첫 톡 연쇄가 0이 아니다', () => {
    const h = measure(humanCasual, 12);
    expect(h.n[0]).toBe(12);
    expect(h.firstChain[0]).toBeGreaterThanOrEqual(1);
    expect(h.stuck.reduce((a, b) => a + b, 0)).toBeCloseTo(h.stuckRate > 0 ? 1 : 0, 1);
    expect(h.within3[0]).toBe(1);
  });

  it('밀도: 같은 시드·판이면 같은 값, 겹침 지수는 0~1', () => {
    const a = density(1000, 1), b = density(1000, 1);
    expect(a).toEqual(b);
    expect(a.overlap).toBeGreaterThanOrEqual(0);
    expect(a.overlap).toBeLessThanOrEqual(1);
    expect(a.n).toBeGreaterThan(3);
  });
});

describe('월드 1 앞 8판 (C005, CONTENT v0.1)', () => {
  const SEEDS = [1000, 8919, 16838, 24757, 32676, 40595];
  const idx = (key: string) => STAGES.findIndex((d) => d.key === key);
  /** 그 판 처음 상태에서 풍선 i를 톡 하고 연쇄가 끝날 때까지 */
  const tapAndWait = (s: PopState, i: number) => {
    const b = s.L.bs[i];
    g.step(s, { tap: false, dir: 0, pointer: { x: bxAt(b, s.st + 1), y: byAt(b, s.st + 1) / A } });
    for (let k = 0; k < 600 && s.popT.some((v, j) => v >= 0 && s.alive[j] === 1); k++) g.step(s, { tap: false, dir: 0, pointer: null });
  };

  it('판당 풍선 ≤18, 2~7판 다른 무리끼리 겹침 ≤0.2, 1·8판 전체 겹침 ≤0.6 (FUN §4)', () => {
    const d = densityTable(40);
    expect(Math.max(...d.map((x) => x.nMax))).toBeLessThanOrEqual(18);
    for (let k = 1; k <= 6; k++) expect(d[k].overlapX).toBeLessThanOrEqual(0.2);
    expect(d[0].overlap).toBeLessThanOrEqual(0.6);
    expect(d[7].overlap).toBeLessThanOrEqual(0.6);
  });

  it('8판은 쉼 판(대왕 맛보기): 사람형 캐주얼(humanLate) 첫 시도 ≥0.85 (FUN v1.4)', () => {
    expect(STAGES[7].rest).toBe(true);
    expect(measure(humanLate, 40).firstTry[7]).toBeGreaterThanOrEqual(0.85);
  });

  it('4판 흔들 무리: 하늘이 처음 움직이고(동물 없이), 숙련은 대개 기다렸다 톡 한다 (CONTENT v0.2 판정선)', () => {
    const k = idx('sway');
    let waited = 0;
    for (let r = 0; r < 40; r++) {
      const s = startAt(1000 + r * 7919, k);
      expect(s.L.bs.some((b) => b.ax > 0)).toBe(true);
      expect(s.L.bs.every((b) => b.an < 0)).toBe(true);
      for (let q = 0; q < 600 && s.used === 0; q++) g.step(s, balloonpopSmart.act(s, () => 0.5));
      if (s.st > 1) waited++;
    }
    expect(waited / 40).toBeGreaterThanOrEqual(0.5);
    const h = measure(humanLate, 40), e = measure(balloonpopSmart, 40);
    expect(h.firstTry[k]).toBeGreaterThanOrEqual(0.65);
    expect(h.firstTry[k]).toBeLessThanOrEqual(0.85);
    expect(h.within3[k]).toBeGreaterThanOrEqual(0.9);
    expect(e.firstTry[k]).toBe(1);
    expect(e.firstStar2[k]).toBeGreaterThanOrEqual(0.95);
  });

  it('4판 카드의 약속: 모든 하늘에 두 흔들 무리가 한 톡에 이어지는 때가 ≥0.5초, 숙련 첫 톡은 대개 두 무리를 다 (FUN v1.5, 게임 시뮬로 잼)', () => {
    const k = idx('sway');
    const both = (s: PopState) => s.L.bs.every((b, j) => b.k === IRON || (b.cl !== 0 && b.cl !== 1) || s.alive[j] !== 1);
    for (const seed of SEEDS) {
      // 그 때로 판을 옮겨(톡 전엔 흔들림만 바뀐다) 흔들 무리 풍선 하나를 톡 → 연쇄가 끝날 때까지
      const s0 = startAt(seed, k), mem = s0.L.bs.map((b, j) => (b.k !== IRON && b.cl <= 1 ? j : -1)).filter((j) => j >= 0);
      let run = 0, best = 0;
      for (let T = 1; T <= 260; T += 4) {
        let ok = false;
        for (const j of mem) {
          const s = startAt(seed, k);
          s.st = T - 1;
          tapAndWait(s, j);
          if (both(s)) {
            ok = true;
            break;
          }
        }
        run = ok ? run + 4 : 0;
        best = Math.max(best, run);
      }
      expect(best).toBeGreaterThanOrEqual(30);
    }
    let hit = 0;
    for (let r = 0; r < 40; r++) {
      const s = startAt(1000 + r * 7919, k);
      for (let q = 0; q < 900 && !(s.used === 1 && !s.popT.some((v, j) => v >= 0 && s.alive[j] === 1)); q++) g.step(s, balloonpopSmart.act(s, () => 0.5));
      if (both(s)) hit++;
    }
    expect(hit / 40).toBeGreaterThanOrEqual(0.8);
  });

  it('늦은 손(humanLate)도 막히지 않는다: 막힌 런 ≤0.05, 전 판 3회 안 ≥0.9, 도움 시도 10번 이상인 판은 도움이 손해가 아님 (FUN v1.4)', () => {
    const h = measure(humanLate, 40);
    expect(h.stuckRate).toBeLessThanOrEqual(0.05);
    expect(h.within3.every((x) => x >= 0.9)).toBe(true);
    for (let k = 0; k < STAGE_COUNT; k++) if (h.helpN[k] >= 10) expect(h.helpAfter[k]).toBeGreaterThanOrEqual(h.helpBefore[k]);
  });

  it('새것이 정답에 쓰인다: 우산 고양이는 목표, 다리 한 톡에 두 무리, 대왕 한 톡에 하늘 전체, 철은 연쇄를 막는다', () => {
    for (const seed of SEEDS) {
      // 3판 ☂️: 고양이를 구해야 목표
      const c = startAt(seed, idx('cat'));
      expect(c.L.goal.save).toBe(1);
      expect(c.L.bs.some((b) => b.um)).toBe(true);
      // 5판 🌉: 다리를 톡 하면 이은 두 무리(cl 0)가 다 터진다
      const s = startAt(seed, idx('bridge')), bi = s.L.bs.findIndex((b) => b.bridge);
      expect(bi).toBeGreaterThanOrEqual(0);
      tapAndWait(s, bi);
      expect(s.L.bs.every((b, j) => b.cl !== 0 || s.alive[j] !== 1)).toBe(true);
      expect(s.L.bs.some((b, j) => b.cl !== 0 && s.alive[j] === 1)).toBe(true); // 하늘 전체는 아니다(고를 게 남는다)
      // 8판 🌈: 대왕 한 톡에 하늘 전체
      const k8 = startAt(seed, idx('king')), ki = k8.L.bs.findIndex((b) => b.k === KING);
      tapAndWait(k8, ki);
      expect(k8.L.bs.every((b, j) => b.k === IRON || k8.alive[j] !== 1)).toBe(true);
    }
    // 6·7판 🔩: 철이 있는 무리에서, 어떤 풍선을 톡 해도 무리가 다 안 터지는 경우가 있다(철이 막는다)
    for (const key of ['iron', 'iron2']) {
      let blocked = 0;
      for (const seed of SEEDS) {
        const s0 = startAt(seed, idx(key)), ic = s0.L.bs[s0.L.iron[0]].cl;
        const mem = s0.L.bs.map((b, j) => (b.cl === ic && b.k !== IRON ? j : -1)).filter((j) => j >= 0);
        for (const j of mem) {
          const s = startAt(seed, idx(key));
          tapAndWait(s, j);
          if (mem.some((m) => s.alive[m] === 1)) blocked++;
        }
      }
      expect(blocked).toBeGreaterThan(0);
    }
  });
  // CONTENT v0.3 (C008): 1판은 작은·보통 풍선만, 큰 풍선은 2판에서 처음. 1판 지표는 고친 셈(둘째 톡 풍선 안 셈)
  const RUN_SEEDS = Array.from({ length: 40 }, (_, r) => 1000 + r * 7919);
  it('1판엔 큰 풍선이 없고, 2판엔 시드마다 큰 풍선이 있다 (CONTENT v0.3)', () => {
    for (const seed of RUN_SEEDS) {
      expect(startAt(seed, 0).L.bs.every((b) => b.sz <= 1)).toBe(true);
      expect(startAt(seed, 1).L.bs.some((b) => b.sz === 2)).toBe(true);
    }
  });

  it('1판 와우·2판 문턱은 그대로 (CONTENT v0.3 가드, 고친 셈)', () => {
    const c = measure(humanLate, 40);
    expect(c.firstTry[0]).toBeGreaterThanOrEqual(0.95);
    expect(c.firstChain[0]).toBeGreaterThanOrEqual(7);
    expect(c.firstTry[1]).toBeGreaterThanOrEqual(0.85);
    expect(measure(balloonpopRandom, 40).chain3).toBeGreaterThanOrEqual(0.85);
  });

  it('2판: 큰 풍선을 톡 하면 그 무리가 다 터진다 — 다른 풍선보다 확실히 (CONTENT v0.3)', () => {
    let big = 0, bigN = 0, oth = 0, othN = 0;
    for (const seed of RUN_SEEDS) {
      const bs = startAt(seed, 1).L.bs;
      bs.forEach((b, i) => {
        if (b.k === IRON) return;
        const s = startAt(seed, 1), mem = bs.map((o, j) => (o.cl === b.cl ? j : -1)).filter((j) => j >= 0);
        tapAndWait(s, i);
        const whole = mem.every((m) => s.alive[m] === 0);
        if (b.sz === 2) (bigN++, whole && big++);
        else (othN++, whole && oth++);
      });
    }
    expect(big / bigN).toBeGreaterThanOrEqual(0.9);
    expect(big / bigN - oth / othN).toBeGreaterThanOrEqual(0.2);
  });
});

describe('휴대폰 살펴보기 — 빈 하늘 톡 (C007, 오너 답 없음 → ①)', () => {
  it('빈 하늘을 톡 하면 톡은 그대로, 가까운 풍선 미리 보기가 켜진다', () => {
    const s = startAt(1000, 1), i = s.L.bs.findIndex((b) => b.k !== IRON), p = emptyNear(s, i)!;
    expect(p).not.toBeNull();
    g.step(s, { tap: false, dir: 0, pointer: { x: p.x, y: p.y / A } });
    expect(s.taps).toBe(3);
    expect(s.used).toBe(0);
    expect(s.peek).toBeGreaterThanOrEqual(0);
    expect(s.alive[s.peek]).toBe(1);
  });

  it('모든 판에서 빈 하늘 자리가 있다 — 가장 빽빽한 판도 풍선의 절반 이상 곁에서 살펴볼 수 있다', () => {
    for (let k = 0; k < STAGE_COUNT; k++) {
      const s = startAt(1000, k), live = s.L.bs.map((b, j) => (b.k !== IRON ? j : -1)).filter((j) => j >= 0);
      const ok = live.filter((j) => emptyNear(s, j)).length;
      expect(ok / live.length).toBeGreaterThanOrEqual(0.5);
    }
  });
});

describe('세로 화면 채우기 (C004, M1-3)', () => {
  it('휴대폰·태블릿·데스크톱에서 캔버스가 세로 ≥75%, 위·아래 빈 띠 각 ≤10% (FUN §4)', () => {
    for (const [cw, ch] of [[360, 780], [390, 844], [768, 1024], [1280, 800]]) {
      const { W, H, TOP } = fitCanvas(cw, ch);
      expect(H / ch).toBeGreaterThanOrEqual(0.75);
      expect((ch - H) / 2 / ch).toBeLessThanOrEqual(0.1);
      expect(W).toBeLessThanOrEqual(cw);
      // 놀이 세계(가로 1 × 세로 A)는 늘 통째로 들어가고, 남는 높이는 위 하늘·아래 광장으로
      expect(H).toBeGreaterThanOrEqual(W * A - 1e-9);
      expect(TOP).toBe(playTop(W, H));
      expect(TOP).toBeLessThanOrEqual(H - W * A + 1e-9);
    }
  });
});

describe('풍선 팡 연쇄 플레이 빌드', () => {
  const path = 'web/public/studio/balloonpop/index.html';
  it('빌드가 있고 가볍다 (gzip 60KB 이하)', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).toContain('풍선 팡 연쇄');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
