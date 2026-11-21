/**
 * 👻 몸 갈아타기 스튜디오 — M0 기본 테스트(가볍게: 표본 작게).
 * 프로토타입을 옮긴 뒤에도 시뮬레이션이 결정적이고, 봇이 판을 깨며, 플레이 빌드가 한 장으로 나오는지.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../studio/bodyhop/rng.ts';
import { bodyhop as g, bodyhopRandom, bodyhopSmart, DEX, KD, STAGES } from '../studio/bodyhop/game.ts';
import type { Bot, Input } from '../studio/bodyhop/core.ts';

function run(bot: Bot<any>, seed: number, ticks: number) {
  const s = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
  let cleared = 0;
  for (let t = 0; t < ticks && !g.over(s); t++) {
    const inp: Input = t % 3 === 0 ? bot.act(s, rng) : { tap: false, dir: 0, pointer: null };
    g.step(s, inp);
    const c = g.cleared?.(s);
    if (c) cleared = Math.max(cleared, c.stage + 1);
  }
  return { s, cleared, score: g.score(s) };
}

describe('studio bodyhop M0', () => {
  it('콘텐츠: 판 12 · 도감 13 몸', () => {
    expect(STAGES.length).toBe(12);
    expect(DEX.length).toBe(13);
    for (const k of DEX) expect(KD[k].name.length).toBeGreaterThan(0);
  });

  it('결정적: 같은 시드 같은 봇이면 같은 점수', () => {
    const a = run(bodyhopSmart, 7, 60 * 40), b = run(bodyhopSmart, 7, 60 * 40);
    expect(a.score).toBe(b.score);
    expect(a.s.t).toBe(b.s.t);
  });

  it('잘하는 봇이 90초 안에 첫 판을 깬다', () => {
    expect(run(bodyhopSmart, 3, 60 * 90).cleared).toBeGreaterThanOrEqual(1);
  });

  it('막누르는 봇 60초: 오류 없이 돈다', () => {
    expect(() => run(bodyhopRandom, 11, 60 * 60)).not.toThrow();
  });

  it('플레이 빌드: 한 장 · 외부 스크립트 없음 · gzip 400KB 이하', async () => {
    const f = join(import.meta.dirname, '../web/public/studio/bodyhop/index.html');
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).not.toMatch(/<script[^>]+src=/);
    const { gzipSync } = await import('node:zlib');
    expect(gzipSync(html).length).toBeLessThan(400 * 1024);
  });
});
