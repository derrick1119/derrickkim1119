/** 스튜디오 나사 풀기 공방 (M0~): 결정성 · 판별 시작 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/screwshop/core.ts';
import { RES_BY, RETRY_Y, STAGES, apply, bonkDead, cloneSim, freeM, newSim, retrace, setCue, screwshop as g, screwshopSmart, shotDead, startStage } from '../studio/screwshop/game.ts';
import { sfx, streakHz } from '../studio/screwshop/sfx.ts';
import { measure, measureStage, screwshopMash, tryStage } from '../studio/screwshop/funqa.ts';

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
  it('1판 겹별(📐 S003): #7 먼저 톡하면 머리 망치가 허공 → ★2(쾅 3번)를 이제 못 딴다', () => {
    const L = g.create(5).L, S = newSim(L);
    expect(bonkDead(STAGES[0], L, S)).toBe(false);
    apply(L, S, 7);
    expect(bonkDead(STAGES[0], L, S)).toBe(true);
  });
  it('1판 손가락 → 막 누르기 ★2 이상 ≤ 0.2 (100시드, 허들 ①)', async () => {
    const { screwshopFingerMash } = await import('../studio/screwshop/funqa.ts');
    const r = Array.from({ length: 100 }, (_, i) => tryStage(screwshopFingerMash, 1000 + i * 7, 0));
    expect(r.filter((x) => x.stars >= 2).length / 100).toBeLessThanOrEqual(0.2);
  });
  it('1판 ★3: 장인은 늘 ★3, 막 누르기는 깨도 ★2 이상 ≤ 0.2 (허들 ① "막 누르면 ★1")', () => {
    const seeds = Array.from({ length: 24 }, (_, i) => 1000 + i * 7);
    expect(seeds.every((sd) => tryStage(screwshopSmart, sd, 0).stars === 3)).toBe(true);
    const m = seeds.map((sd) => tryStage(screwshopMash, sd, 0));
    expect(m.filter((x) => x.ok).length / 24).toBeGreaterThanOrEqual(0.9);
    expect(m.filter((x) => x.stars >= 2).length / 24).toBeLessThanOrEqual(0.2);
  });
});

describe('🪵 통나무 · 2판 돛단배 (M1′ S002 · 📐 CONTENT 2판)', () => {
  const lvl = (seed: number) => {
    const s = g.create(seed);
    startStage(s, 1);
    return s.L;
  };
  it('돛 둘을 나사 하나씩 매단 뒤 활대(#11)를 치면 와르르 — 한 방 3, 결정적', () => {
    for (const seed of [1, 42, 777]) {
      const L = lvl(seed), S = newSim(L);
      for (const i of [4, 5, 7, 8, 9]) apply(L, S, i); // 작은 돛 #6 · 큰 돛 #10에 매달림
      const rec: { k: string }[] = [];
      apply(L, S, 11, rec as never);
      expect(rec.filter((e) => e.k === 'crash').length, `seed ${seed}`).toBe(2);
      expect(S.shot).toBe(3);
    }
  });
  it('활대를 먼저 치면 와르르 0 — 한 방 1, ★3 칩은 바로 ✗ (shotDead)', () => {
    const L = lvl(5), S = newSim(L), rec: { k: string }[] = [];
    expect(shotDead(STAGES[1], L, S)).toBe(false);
    apply(L, S, 11, rec as never);
    expect(rec.some((e) => e.k === 'crash')).toBe(false);
    expect(S.shot).toBe(1);
    expect(shotDead(STAGES[1], L, S)).toBe(true);
  });
  it('2판 목표: 장인 ★3 · 버릇 3종 ★3 ≤ 0.4 · 무작위 클리어 ≥ 0.9 (24시드)', () => {
    const r = measureStage(1, 24, ['smart', 'habit', 'top', 'reveal', 'random']);
    expect(r.smart.star3).toBeGreaterThanOrEqual(0.9);
    for (const b of ['habit', 'top', 'reveal']) expect(r[b].star3, b).toBeLessThanOrEqual(0.4);
    expect(r.random.clear).toBeGreaterThanOrEqual(0.9);
  });
});

describe('하트 없음 · ↺ 지금 다시 (M1′ S003, 오너 기준 7)', () => {
  it('몇 번을 실패해도 게임이 끝나지 않고 그 판만 다시 (같은 칠)', () => {
    const s = g.create(9);
    startStage(s, 2);
    const col0 = s.L.col.join(), rng = () => 0.5;
    let fails = 0;
    for (let k = 0; k < 60 * 400 && fails < 5; k++) {
      const was = s.phase;
      // 실패 카드는 자동으로 안 넘어간다 — 45틱 뒤 아무 데나 톡 (🎨 §2.7)
      const inp = s.phase === 'result' && !s.ok ? { tap: false, dir: 0 as const, pointer: s.pt > 50 && s.pt % 2 ? { x: 0.5, y: 0.9 } : null } : screwshopMash.act(s, rng);
      g.step(s, inp);
      if (was !== 'result' && s.phase === 'result' && !s.ok) fails++, expect(s.blame).not.toBeNull();
      if (s.phase === 'result' && s.ok) break;
    }
    expect(fails).toBeGreaterThanOrEqual(3);
    expect(g.over(s)).toBe(false);
    expect(s.stage).toBe(2);
    expect(s.L.col.join()).toBe(col0);
  });
  it('위 줄 ↺를 누르면 판 중에도 같은 판을 처음부터', () => {
    const s = g.create(4), L0 = s.L;
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    apply(s.L, s.S, STAGES[0].first!);
    expect(s.S.n).toBeGreaterThan(0);
    g.step(s, { tap: false, dir: 0, pointer: { x: 0.7, y: (RETRY_Y * 0.5) / 1.45 } });
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.S.n, s.stage, s.retries, s.phase]).toEqual([0, 0, 1, 'play']);
    expect(s.L).toBe(L0);
  });
});

describe('실패 되짚기 retrace (📐 S003)', () => {
  type H = { s: number; S0: ReturnType<typeof newSim>; known: number; rec: { k: string }[] };
  const play = (L: ReturnType<typeof g.create>['L'], S: ReturnType<typeof newSim>, H: H[], i: number) => {
    const S0 = cloneSim(S), rec: { k: string }[] = [];
    apply(L, S, i, rec as never);
    H.push({ s: i, S0, known: L.all, rec });
  };
  it('③허공: 머리 망치를 반대로 매단 뒤(#7) 과녁 목 나사(#6)를 빈칸에 → 두 톡을 짚는다', () => {
    const L = { ...g.create(5).L };
    L.col = [0, 0, 1, 1, 1, 0, 2, 2, 2];
    L.queue = [0, 1, 2];
    const S2 = newSim(L), H2: H[] = [];
    play(L, S2, H2, 7);
    play(L, S2, H2, 6);
    const b = retrace(L, H2 as never, S2);
    expect([b.c, b.t]).toEqual(['③허공', [0, 1]]);
  });
  it('③통나무: 2판 활대(#11)를 먼저 치고 막 빼다 빈칸이 넘치면 "통나무가 먼저 쿵"', () => {
    const s = g.create(1000);
    startStage(s, 1);
    const L = s.L, S = newSim(L), H: H[] = [];
    play(L, S, H, 11);
    for (let n = 0; !S.fail && n < 20; n++) {
      const f = freeM(L, S);
      let pick = -1;
      for (let i = 0; i < L.N; i++) if ((f >> i) & 1 && (pick < 0 || !S.box.includes(L.col[i]))) pick = i;
      play(L, S, H, pick);
    }
    expect(S.fail).toBe(1);
    const b = retrace(L, H as never, S);
    expect(b.c).toBe('③통나무');
    expect(b.t[0]).toBe(0);
  });
  it('막 누르기가 3~8판에서 진 판은 전부 짚을 톡이 1~2개, 원인 8갈래 중 하나', () => {
    const kinds = ['①색', '①연쇄', '①깔림', '①잠김', '②진자', '②못', '③통나무', '③허공'];
    let lost = 0;
    for (let k = 2; k < 8; k++)
      for (let i = 0; i < 6; i++) {
        const s = g.create(1000 + i * 7);
        startStage(s, k);
        const rng = () => ((i * 9301 + k * 49297 + s.t * 233) % 1000) / 1000;
        while (s.phase !== 'result' && s.t < 60 * 300) g.step(s, screwshopMash.act(s, rng));
        if (s.ok) continue;
        lost++;
        expect(kinds).toContain(s.blame!.c);
        expect(s.blame!.t.length).toBeGreaterThanOrEqual(1);
        expect(s.blame!.t.length).toBeLessThanOrEqual(2);
        for (const ti of s.blame!.t) expect(ti >= 0 && ti < s.hist.length).toBe(true);
      }
    expect(lost).toBeGreaterThan(20);
  });
});

describe('결과 화면 ↺ (S002 · 🧪 S001 "★1도 자동 다음 판")', () => {
  const toResult = (seed: number) => {
    const s = g.create(seed), rng = () => 0.37;
    while (s.phase !== 'result') g.step(s, screwshopMash.act(s, rng));
    return s;
  };
  const tapAt = (s: ReturnType<typeof g.create>, x: number, y: number) => {
    g.step(s, { tap: false, dir: 0, pointer: { x, y } });
    g.step(s, { tap: false, dir: 0, pointer: null });
  };
  it('★3을 못 따면 기다린다 · 왼쪽 ↺는 같은 판 다시(별 합계는 최고만) · 오른쪽은 다음 판', () => {
    let s = toResult(11);
    for (let sd = 12; !(s.ok && s.got < 3); sd++) s = toResult(sd);
    const stars = s.stars;
    for (let k = 0; k < 400; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.phase).toBe('result');
    tapAt(s, 0.25, 0.5); // 버튼 밖(카드 위) — 아무 일 없음 (🧪 S002)
    expect(s.phase).toBe('result');
    tapAt(s, 0.25, RES_BY / 1.45);
    expect([s.stage, s.phase, s.retries]).toEqual([0, 'play', 1]);
    expect(s.stars).toBe(stars);
    s = toResult(11);
    for (let sd = 12; !(s.ok && s.got < 3); sd++) s = toResult(sd);
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    tapAt(s, 0.75, RES_BY / 1.45);
    expect(s.stage).toBe(1);
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
    expect(gzipSync(html).length).toBeLessThan(40 * 1024); // M1′ 상한 (📋 S002: 120 → 36KB, 📋 S003 결정: 36 → 40KB — 남은 🔑·미리 보기·손맛을 자르지 않으려고. 이유는 MILESTONES 위험 ①, 오너 테스트 때 밝힘)
  });
});
