/** 스튜디오 풍선 팡 연쇄 (M0): 결정성 · 첫 판은 거의 못 진다 · 고민 거리(숙련 격차) · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/balloonpop/core.ts';
import { A, balloonpop as g, balloonpopRandom, balloonpopSmart, BEAT, bxAt, byAt, density, FAIL_RESULT, fitCanvas, HELP_AFTER, IRON, playTop, RETRY_CARD, STAGE_COUNT, type PopState } from '../studio/balloonpop/game.ts';
import { humanCasual, measure } from '../studio/balloonpop/funqa.ts';
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

  it(`${HELP_AFTER}번 실패하면 도움 반짝이 뜨고, 그 시도는 ★ 두 번 안에를 받을 수 없다`, () => {
    const s = g.create(5);
    expect(runUntil(s, (x) => x.tries >= HELP_AFTER && x.phase === 'play')).toBe(true);
    expect(s.helped).toBe(true);
    expect(s.help).toBeGreaterThanOrEqual(0);
    expect(runUntil(s, (x) => x.phase === 'result')).toBe(true);
    expect(s.m2).toBe(false);
  });

  it('도움 반짝은 톡마다 다음 풍선으로 옮겨 간다 (C003)', () => {
    const s = g.create(5);
    expect(runUntil(s, (x) => x.helped && x.used === 1 && x.phase === 'play' && x.help >= 0)).toBe(true);
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
