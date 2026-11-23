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
import { sdfMesh, sph, STRIDE } from '../studio/bodyhop/gl/mesh.ts';
import { rigOf } from '../studio/bodyhop/gl/world.ts';

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

  it('1기 기록 빌드: 3D(v1-3d) · 옛 2D(2d) 한 장씩 · 외부 스크립트 없음 · 3D는 gzip 150KB 이하(M1 한도)', async () => {
    const { gzipSync } = await import('node:zlib');
    for (const [name, lim] of [['v1-3d.html', 150], ['2d.html', 400]] as const) {
      const f = join(import.meta.dirname, '../web/public/studio/bodyhop/' + name);
      expect(existsSync(f)).toBe(true);
      const html = readFileSync(f, 'utf8');
      expect(html).not.toContain('/*BUNDLE*/');
      expect(html).not.toMatch(/<script[^>]+src=/);
      expect(gzipSync(html).length).toBeLessThan(lim * 1024);
    }
    expect(readFileSync(join(import.meta.dirname, '../web/public/studio/bodyhop/v1-3d.html'), 'utf8')).toContain('webgl2');
  });

  it('SDF 굽기: 구는 닫힌 겉면 · 꼭짓점이 반지름 위 · 법선이 바깥 · AO 0~1', () => {
    const m = sdfMesh((x, y, z) => sph(x, y, z, 0, 0, 0, 1), () => [1, 1, 1, 0.5, 0], [-1.2, -1.2, -1.2], [1.2, 1.2, 1.2], 0.1);
    const n = m.v.length / STRIDE;
    expect(n).toBeGreaterThan(500);
    expect(m.i.length % 3).toBe(0);
    for (let o = 0; o < m.v.length; o += STRIDE) {
      const r = Math.hypot(m.v[o], m.v[o + 1], m.v[o + 2]);
      expect(Math.abs(r - 1)).toBeLessThan(0.05);
      expect((m.v[o] * m.v[o + 3] + m.v[o + 1] * m.v[o + 4] + m.v[o + 2] * m.v[o + 5]) / r).toBeGreaterThan(0.9);
      expect(m.v[o + 9]).toBeGreaterThan(0);
      expect(m.v[o + 9]).toBeLessThanOrEqual(1);
    }
  });

  it('월드 1 몸 굽기: 콩알이·곰은 적/내 몸 두 얼굴, 발바닥이 바닥(y≈0)', () => {
    for (const k of ['bean', 'bear']) {
      const r = rigOf(k);
      for (const m of [r.foe, r.me]) {
        let lo = 9;
        for (let o = 1; o < m.v.length; o += STRIDE) lo = Math.min(lo, m.v[o]);
        expect(m.v.length / STRIDE).toBeGreaterThan(800);
        expect(Math.abs(lo)).toBeLessThan(0.12);
      }
    }
  });
});
