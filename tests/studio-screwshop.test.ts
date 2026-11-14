/** 스튜디오 나사 풀기 공방 (M0~): 결정성 · 판별 시작 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/screwshop/core.ts';
import { STAGES, apply, newSim, setCue, screwshop as g, screwshopSmart, startStage } from '../studio/screwshop/game.ts';
import { sfx, streakHz } from '../studio/screwshop/sfx.ts';
import { measure, screwshopMash, tryStage } from '../studio/screwshop/funqa.ts';

describe('나사 풀기 공방 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, screwshopSmart, 7, 60 * 300), b = runBot(g, screwshopSmart, 7, 60 * 300);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('판 8개, 아무 판에서나 시작할 수 있다', () => {
    expect(STAGES.length).toBe(8);
    const s = g.create(3);
    startStage(s, 5);
    expect(s.stage).toBe(5);
    expect(s.phase).toBe('play');
    expect(s.L.N).toBeGreaterThan(0);
  });

  it('나사 밖에서 떼면 아무 일도 없다(취소)', () => {
    const s = g.create(4);
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const gone = s.S.gone;
    g.step(s, { tap: false, dir: 0, pointer: { x: 0.02, y: 0.02 } });
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.S.gone).toBe(gone);
  });

  it('장인 봇은 8판을 모두 완성한다 (콘텐츠가 풀린다)', () => {
    for (let k = 0; k < STAGES.length; k++) for (const seed of [11, 22]) expect(tryStage(screwshopSmart, seed, k).ok, `${k + 1}판 시드 ${seed}`).toBe(true);
  });

  it('M0 기준선: 무작위 봇도 1판은 거의 깬다 · 장인과 무작위의 격차가 크다 (오너 기준 6·7)', () => {
    const r = measure(6).summary;
    expect(r.randomClear1).toBeGreaterThanOrEqual(0.8);
    expect(r.skillGap).toBeGreaterThanOrEqual(3);
    expect(r.smartStars).toBeGreaterThan(r.habitStars);
  });

  it('막 누르기로는 3판부터 거의 못 깬다 (오너 2026-11-14 "막 누르면 되는 게임?" — 퇴행 방지)', () => {
    const r = measure(6).summary;
    expect(r.mashClear38).toBeLessThanOrEqual(0.15);
    expect(r.mashStars).toBeLessThan(r.smartStars / 3);
  });
});

describe('🔨 망치 판자 (M1′ S001 · 📐 CONTENT 1판)', () => {
  const kinds = (seed: number, tap: number) => {
    const L = g.create(seed).L, S = newSim(L), rec: { k: string; s?: number }[] = [];
    apply(L, S, tap, rec as never);
    return { rec, S };
  };
  it('1판 손가락 첫 톡(#8 주둥이)은 머리가 끄덕 → 목 나사(#6)를 쾅 — 한 방 2, 둘 다 상자로 (오너 기준 2)', () => {
    for (const seed of [1, 7, 42, 99, 123, 2026]) {
      const { rec, S } = kinds(seed, STAGES[0].first!);
      expect(rec.some((e) => e.k === 'bonk' && e.s === 6), `seed ${seed}`).toBe(true);
      expect(S.shot).toBe(2);
      expect(rec.filter((e) => e.k === 'slot').length, `seed ${seed} 첫 톡은 쏙 + 쾅 쏙`).toBe(0);
    }
  });
  it('반대 나사(#7)를 먼저 빼면 망치는 허공 — 쾅 없음', () => {
    const { rec } = kinds(5, 7);
    expect(rec.some((e) => e.k === 'hang')).toBe(true);
    expect(rec.some((e) => e.k === 'bonk')).toBe(false);
  });
  it('1판 ★3은 톡 6 이하: 장인은 늘 ★3, 막 누르기는 깨도 ★2 이상 ≤ 0.2 (허들 ① "막 누르면 ★1")', () => {
    const seeds = Array.from({ length: 24 }, (_, i) => 1000 + i * 7);
    expect(seeds.every((sd) => tryStage(screwshopSmart, sd, 0).stars === 3)).toBe(true);
    const m = seeds.map((sd) => tryStage(screwshopMash, sd, 0));
    expect(m.filter((x) => x.ok).length / 24).toBeGreaterThanOrEqual(0.9);
    expect(m.filter((x) => x.stars >= 2).length / 24).toBeLessThanOrEqual(0.2);
  });
});

describe('손맛 (🎨 ART §2 — 오너 "쾌감이 좀 부족해")', () => {
  it('시작 전에는 AudioContext를 만들지 않고, 시뮬레이션은 소리를 부르지 않는다(봇·결정성 무관)', () => {
    let calls = 0;
    setCue(() => calls++);
    runBot(g, screwshopSmart, 5, 60 * 60);
    setCue(() => {});
    expect(calls).toBe(0);
    expect(sfx.made).toBe(false);
  });
  it('연속 쏙 음계는 C5에서 C7까지 오르고 그 위는 고정', () => {
    expect(Math.round(streakHz(1))).toBe(523);
    expect(Math.round(streakHz(6))).toBe(1047);
    expect(Math.round(streakHz(11))).toBe(2093);
    expect(streakHz(20)).toBe(streakHz(11));
    for (let n = 1; n < 11; n++) expect(streakHz(n + 1)).toBeGreaterThan(streakHz(n));
  });
});

describe('플레이 빌드', () => {
  const f = 'web/public/studio/screwshop/index.html';
  it('web/public/studio/screwshop/index.html이 있고 번들이 들어 있다', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).toContain('나사 풀기 공방');
    expect(html).toContain('id="sound"');
    expect(gzipSync(html).length).toBeLessThan(120 * 1024);
  });
});
