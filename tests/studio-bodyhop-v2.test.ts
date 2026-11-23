/**
 * 👻 몸 갈아타기 스튜디오 2기 — M0(그림부터) 테스트. 가볍게(표본 작게).
 * ① 규칙만 가져왔는가: v2/sim.ts는 그리기 코드 없이 결정적이고 봇이 판을 깬다.
 * ② 그림 컨셉 시안 3장이 concepts.html에 그림 파일로 올라가 있다 — WebGL 없음(1기 아이폰 깨짐 교훈).
 * ③ M1: 오너가 고른 1번(수채)으로 시안의 장면이 2D 캔버스에서 움직인다(주소 첫 화면).
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { mulberry32 } from '../studio/bodyhop/rng.ts';
import { bodyhop as g, bodyhopRandom, bodyhopSmart, DEX, STAGES } from '../studio/bodyhop/v2/sim.ts';
import type { Bot, Input } from '../studio/bodyhop/core.ts';

const here = import.meta.dirname, pub = join(here, '../web/public/studio/bodyhop');

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

describe('studio bodyhop 2기 M0 — 규칙만', () => {
  it('시뮬에는 그리기 코드가 없다(캔버스·그림 함수 0)', () => {
    const src = readFileSync(join(here, '../studio/bodyhop/v2/sim.ts'), 'utf8');
    expect(src).not.toMatch(/CanvasRenderingContext2D|getContext|ctx\.|juice/);
    expect(STAGES.length).toBe(12);
    expect(DEX.length).toBe(13);
  });

  it('결정적: 같은 시드 같은 봇이면 같은 점수·같은 틱', () => {
    const a = run(bodyhopSmart, 5, 60 * 30), b = run(bodyhopSmart, 5, 60 * 30);
    expect(a.score).toBe(b.score);
    expect(a.s.t).toBe(b.s.t);
  });

  it('잘하는 봇이 90초 안에 첫 판을 깨고, 막누르는 봇 40초는 오류 없이 돈다', () => {
    expect(run(bodyhopSmart, 3, 60 * 90).cleared).toBeGreaterThanOrEqual(1);
    expect(() => run(bodyhopRandom, 9, 60 * 40)).not.toThrow();
  });
});

describe('studio bodyhop 2기 M0 — 그림 컨셉 시안', () => {
  it('시안 3장: 아이폰 세로 2배(780×1688) JPEG, 장당 900KB 이하', () => {
    for (const id of ['c1', 'c2', 'c3']) {
      const f = join(pub, `concepts/${id}.jpg`);
      expect(existsSync(f)).toBe(true);
      const b = readFileSync(f);
      expect(b[0]).toBe(0xff);
      expect(b[1]).toBe(0xd8);
      expect(statSync(f).size).toBeLessThan(900 * 1024);
      // JPEG SOF0/SOF2에서 크기 읽기
      let o = 2, w = 0, h = 0;
      while (o < b.length) {
        const m = b[o + 1], len = b.readUInt16BE(o + 2);
        if (m === 0xc0 || m === 0xc2) ((h = b.readUInt16BE(o + 5)), (w = b.readUInt16BE(o + 7)));
        if (w) break;
        o += 2 + len;
      }
      expect([w, h]).toEqual([780, 1688]);
    }
  });

  it('시안 고르기 페이지(concepts.html): 세 장을 모두 보여 주고, WebGL·외부 스크립트 없음', () => {
    const html = readFileSync(join(pub, 'concepts.html'), 'utf8');
    for (const id of ['c1', 'c2', 'c3']) expect(html).toContain(`concepts/${id}.jpg`);
    expect(html).not.toMatch(/webgl|<script[^>]+src=/i);
    expect(html).toContain('name="viewport"');
  });
});

describe('studio bodyhop 2기 M1 — 움직이는 시안(오너 선택: 1 수채 동화풍)', () => {
  it('주소 첫 화면 = 2D 캔버스 플레이 한 장: WebGL·캔버스 filter 없음(아이폰 사파리 안전) · gzip 60KB 이하', async () => {
    const { gzipSync } = await import('node:zlib');
    const html = readFileSync(join(pub, 'index.html'), 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).not.toMatch(/webgl|<script[^>]+src=/i);
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
    const src = readFileSync(join(here, '../studio/bodyhop/v2/play.ts'), 'utf8');
    expect(src).not.toMatch(/\.filter\s*=|getContext\(['"]webgl/);
  });

  it('구운 수채 그림: 무대·앞줄·종이결·아틀라스가 있고, 자리표의 모든 조각이 아틀라스 안에 있다', () => {
    for (const f of ['bg.jpg', 'front.png', 'veil.jpg', 'atlas.png']) expect(existsSync(join(pub, 'w1', f))).toBe(true);
    const png = readFileSync(join(pub, 'w1/atlas.png')), aw = png.readUInt32BE(16), ah = png.readUInt32BE(20);
    const map = JSON.parse(readFileSync(join(here, '../studio/bodyhop/v2/w1/atlas.json'), 'utf8')) as Record<string, { x: number; y: number; w: number; h: number }>;
    for (const k of ['slime0_idle', 'slime0_mad', 'slime0_dizzy', 'slime_me', 'bear', 'ghost_dive', 'ghost_float', 'burst', 'heart', 'star_on', 'card']) expect(map[k]).toBeTruthy();
    for (const m of Object.values(map)) {
      expect(m.x + m.w).toBeLessThanOrEqual(aw);
      expect(m.y + m.h).toBeLessThanOrEqual(ah);
    }
  });
});
