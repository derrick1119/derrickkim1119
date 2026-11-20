/** 스튜디오 동물 군단 합체 전투 (M0~): 결정성 · 첫 톡에 쿵 · 셋이면 합체 · 손 안 대면 안전 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/petsquad/core.ts';
import { STAGES, STAGE_COUNT, petsquad as g, petsquadHabit2, petsquadSmart } from '../studio/petsquad/game.ts';

const A = g.aspect ?? 1.5;
/** 화면 톡 한 번(누른 한 틱 + 뗀 한 틱) — 좌표는 가로 폭 단위 */
const tapAt = (s: ReturnType<typeof g.create>, x: number, y: number) => {
  g.step(s, { tap: false, dir: 0, pointer: { x, y: y / A } });
  g.step(s, { tap: false, dir: 0, pointer: null });
};

describe('동물 군단 합체 전투 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, petsquadSmart, 5, 60 * 120), b = runBot(g, petsquadSmart, 5, 60 * 120);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('판은 7개, 판마다 이름과 별 조건이 있다', () => {
    expect(STAGE_COUNT).toBe(7);
    for (const d of STAGES) expect(d.name.length).toBeGreaterThan(0);
  });

  it('첫 톡(가게 카드)에 동물이 진영에 내려앉고 금화가 준다', () => {
    const s = g.create(1);
    const n0 = s.board.filter(Boolean).length, c0 = s.coins;
    tapAt(s, 0.175, 1.07);
    expect(s.board.filter(Boolean).length + s.merges).toBeGreaterThan(n0);
    expect(s.coins).toBeLessThan(c0);
    expect(s.firstTap).toBeGreaterThan(0);
  });

  it('키보드 1·2·3 = 카드 사기', () => {
    const s = g.create(1);
    const c0 = s.coins;
    g.step(s, { tap: false, dir: 0, pointer: null, pick: 0 });
    expect(s.coins).toBeLessThan(c0);
  });

  it('1판 카드 셋을 다 사면 합체가 한 번은 일어난다(첫 큰 순간)', () => {
    const s = g.create(1);
    for (let i = 0; i < 3; i++) {
      tapAt(s, [0.175, 0.5, 0.825][i], 1.07);
      for (let k = 0; k < 10; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    }
    expect(s.merges).toBeGreaterThanOrEqual(1);
  });

  it('아무것도 안 누르면 가게에서 기다릴 뿐 — 하트·금화가 그대로', () => {
    const s = g.create(2);
    const h = s.hearts, c = s.coins;
    for (let k = 0; k < 60 * 10; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.phase, s.hearts, s.coins]).toEqual(['shop', h, c]);
  });

  it('밸런스 하한(작은 표본): 잘하는 봇은 끝까지 가고, 같은 동물만 모으는 버릇 봇은 못 간다', () => {
    const smart = [1, 2, 3].map((sd) => runBot(g, petsquadSmart, sd).s);
    expect(smart.filter((s) => s.won).length).toBeGreaterThanOrEqual(2);
    const habit = [1, 2, 3].map((sd) => runBot(g, petsquadHabit2, sd).s);
    expect(habit.every((s) => !s.won)).toBe(true);
  });
});

describe('동물 군단 합체 전투 플레이 빌드', () => {
  const f = 'web/public/studio/petsquad/index.html';
  it('빌드가 있고 한 장짜리 html, gzip 60KB 이하', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).toContain('<title>동물 군단 합체 전투</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
