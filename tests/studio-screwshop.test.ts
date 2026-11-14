/** 스튜디오 나사 풀기 공방 (M0~): 결정성 · 판별 시작 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/screwshop/core.ts';
import { RES_BY, RETRY_Y, STAGES, apply, blockedM, bonkDead, cloneSim, freeM, newSim, peek, poseOf, retrace, setCue, screwshop as g, screwshopSmart, shotDead, startStage } from '../studio/screwshop/game.ts';
import { mulberry32 } from '../studio/screwshop/rng.ts';
import { sfx, streakHz } from '../studio/screwshop/sfx.ts';
import { measure, measureStage, pnrHit, screwshopMash, screwshopNewbie, tryStage } from '../studio/screwshop/funqa.ts';
import { pickStage } from '../studio/screwshop/pick.ts';
import { PICKS } from '../studio/screwshop/picks.ts';

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

  it('막 누르기로는 3판부터 ★2를 거의 못 따고 5판부터 거의 못 깬다 (오너 2026-11-14 "막 누르면 되는 게임?" — 퇴행 방지 · 📋 S004 기준 ① 개정)', () => {
    // 📋 S004: '3~8판 클리어 ≤ 0.15'(6시드 평균) → 3~8판 판별 ★2 이상 ≤ 0.2 + 5~8판 판별 클리어 ≤ 0.15 (24시드, 하트가 없어 클리어는 '몇 번 다시'라서)
    for (let k = 2; k < STAGES.length; k++) {
      const m = Array.from({ length: 24 }, (_, i) => tryStage(screwshopMash, 1000 + i * 7, k));
      expect(m.filter((x) => x.stars >= 2).length / 24, `${k + 1}판 ★2 이상`).toBeLessThanOrEqual(0.2);
      if (k >= 4) expect(m.filter((x) => x.ok).length / 24, `${k + 1}판 클리어`).toBeLessThanOrEqual(0.15);
    }
    const r = measure(6).summary;
    expect(r.mashStars).toBeLessThan(r.smartStars / 3);
  });

  it('쏙 한 방 = 톡 한 번에 상자로 바로 들어간 나사 수의 최대 (빈칸으로 간 것은 안 셈 — 📋 S004)', () => {
    for (let k = 0; k < STAGES.length; k++) {
      const s = g.create(5 + k);
      startStage(s, k);
      const L = s.L, S = newSim(L), r = (n: number) => (n * 7919 + k) % 97;
      let best = 0;
      for (let t = 0; !S.fail && S.n < L.N; t++) {
        const f = freeM(L, S), o: number[] = [];
        for (let i = 0; i < L.N; i++) if ((f >> i) & 1) o.push(i);
        const rec: { k: string }[] = [];
        apply(L, S, o[r(t) % o.length], rec as never);
        best = Math.max(best, rec.filter((e) => e.k === 'box').length);
      }
      expect(S.shot, `${k + 1}판`).toBe(best);
    }
  });

  it('실린 판 = 빌드 때 고른 표 (✏️ S005: 판·칠하기를 바꾸면 npx tsx studio/screwshop/pick.ts)', () => {
    expect(STAGES.map((_, k) => pickStage(k))).toEqual(PICKS);
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
      let ins = 0;
      for (const i of [4, 5, 7, 8, 9]) {
        const r0: { k: string }[] = [];
        apply(L, S, i, r0 as never); // 작은 돛 #6 · 큰 돛 #10에 매달림
        ins = Math.max(ins, r0.filter((e) => e.k === 'box').length);
      }
      const rec: { k: string }[] = [];
      apply(L, S, 11, rec as never);
      expect(rec.filter((e) => e.k === 'crash').length, `seed ${seed}`).toBe(2);
      expect(rec.filter((e) => e.k === 'out').length).toBe(3); // 활대 + 돛 둘
      expect(S.shot).toBe(Math.max(ins, rec.filter((e) => e.k === 'box').length)); // 쏙 한 방(📋 S004): 그중 상자로 간 것
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
    startStage(s, 7); // 막 누르기가 늘 지는 판 (✏️ S005: 빌드 때 고르기 뒤 5판은 막 누르기 클리어 0.13이라 8판 0.00으로)
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
    expect(s.stage).toBe(7);
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
  it('막 누르기가 3~8판에서 진 판은 전부 짚을 톡이 1~2개, 원인 9갈래 중 하나', () => {
    const kinds = ['①색', '①연쇄', '①깔림', '①잠김', '②진자', '②못', '③통나무', '③허공', '④태엽'];
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

describe('🔑 3판 태엽 기차 · 📌🔨 4판 풍차 (📐 S004)', () => {
  const lvl = (seed: number, k: number) => {
    const s = g.create(seed);
    startStage(s, k);
    return s.L;
  };
  it('3판: 처음(첫 두 상자)에 🔑를 빼면 🔒 넷이 왼쪽부터 튀어 셋이 빈칸 → 되짚기 ④태엽이 열쇠 톡을 짚는다', () => {
    for (const seed of [1000, 1007, 42]) {
      const L = lvl(seed, 2), S = newSim(L), H: { s: number; S0: ReturnType<typeof newSim>; known: number; rec: { k: string; s?: number }[] }[] = [];
      const key = L.px.findIndex((_, i) => (L.keyM >> i) & 1), tap = (i: number) => {
        const S0 = cloneSim(S), rec: { k: string; s?: number }[] = [];
        apply(L, S, i, rec as never);
        H.push({ s: i, S0, known: L.all, rec });
      };
      tap(key);
      const pops = H[0].rec.filter((e) => e.k === 'out').map((e) => e.s!).slice(1);
      expect(pops.length, `seed ${seed}`).toBe(4);
      expect(pops.map((i) => L.px[i])).toEqual(pops.map((i) => L.px[i]).sort((a, b) => a - b));
      expect(S.slots.length).toBe(3);
      for (let n = 0; !S.fail && n < 20; n++) {
        const f = freeM(L, S);
        let pick = -1;
        for (let i = 0; i < L.N; i++) if ((f >> i) & 1 && (pick < 0 || !S.box.includes(L.col[i]))) pick = i;
        tap(pick);
      }
      const b = retrace(L, H as never, S);
      expect([b.c, b.t[0]], `seed ${seed}`).toEqual(['④태엽', 0]);
    }
  });
  it('4판: 탑 가운데(⚠) 먼저 빼고 못 날개를 다 풀면 날개 끝 🔨가 🎯를 쾅 — 둘 다 그대로 두면 날개가 ⚠를 영영 덮는다', () => {
    const L = lvl(1000, 3), nail = L.pl.map((p, k) => (p.kind === 'nail' ? k : -1)).filter((k) => k >= 0);
    expect(nail.length).toBe(2);
    let S = newSim(L);
    apply(L, S, 0);
    for (const k of nail) {
      const rec: { k: string }[] = [];
      for (const i of L.ps[k]) apply(L, S, i, rec as never);
      expect(rec.filter((e) => e.k === 'bonk').length).toBe(1);
    }
    expect([S.bonks, S.fail]).toEqual([2, 0]);
    S = newSim(L);
    for (const i of L.ps[nail[0]]) apply(L, S, i);
    expect(S.fail).toBe(2);
  });
  it('3~6판 반증(24시드): 장인 ★3 ≥ 0.7 · 버릇 3종 ★3 ≤ 0.15 · 따라 하기 ★3 ≤ 0.25 · 4판 무작위 ≥ 0.5 · 버릇 클리어 ≥ 0.4 (S005 5판 🌻 · S006 6판 🦕 더함)', () => {
    for (const k of [2, 3, 4, 5]) {
      const r = measureStage(k, 24, ['smart', 'habit', 'top', 'reveal', 'preview', 'random']);
      expect(r.smart.star3, `${k + 1}판 장인`).toBeGreaterThanOrEqual(0.7);
      for (const b of ['habit', 'top', 'reveal']) expect(r[b].star3, `${k + 1}판 ${b}`).toBeLessThanOrEqual(0.15);
      expect(r.preview.star3, `${k + 1}판 따라 하기`).toBeLessThanOrEqual(0.25);
      if (k === 3) expect([r.random.clear >= 0.5, r.habit.clear >= 0.4]).toEqual([true, true]);
    }
  });
  it('되짚기 F13: 처음 봇이 3·4판에서 지면 카드가 PNR(그 뒤로는 못 깨게 된 톡)을 짚는다 ≥ 0.8', () => {
    for (const k of [2, 3]) {
      let n = 0, hit = 0;
      for (let i = 0; i < 12; i++)
        for (let j = 0; j < 3; j++) {
          const x = tryStage(screwshopNewbie, 1000 + i * 7, k, 600, 1000 + i * 7 + j * 100003);
          if (!x.ok && x.s.blame) (n++, (hit += +pnrHit(x.s)));
        }
      expect(n, `${k + 1}판 실패 수`).toBeGreaterThan(0);
      expect(hit / n, `${k + 1}판`).toBeGreaterThanOrEqual(0.8);
    }
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

describe('미리 보기 = 실제 결과 (✏️ S006 · 📋 S004 이월)', () => {
  it('꾹 누를 때 보이는 것(쾅·와르르·튀는 🔒·띠용·갈 곳·⚠ 덮음)이 떼었을 때 그대로 일어난다 — 8판 × 막 누르기', () => {
    let n = 0, cov = 0, chain = 0;
    for (let k = 0; k < STAGES.length; k++)
      for (const seed of [3, 8]) {
        const s = g.create(seed), rng = mulberry32(seed);
        startStage(s, k);
        let h = 0;
        for (let t = 0; t < 60 * 120 && s.phase === 'play'; t++) {
          g.step(s, screwshopMash.act(s, rng));
          if (s.hist.length === h) continue;
          const H = s.hist[(h = s.hist.length) - 1], p = peek(s.L, H.S0, H.s), L = s.L;
          expect(p.rec, `${k + 1}판 톡 ${h}`).toEqual(H.rec); // 쾅·와르르·드르륵·띠용·째깍과 나사마다 갈 곳(상자 구멍/빈칸 칸)
          expect(p.S.gone).toBe(s.S.gone);
          expect(p.S.slots).toEqual(s.S.slots);
          // ⚠ = 새로 막힌 나사 + 이 톡에 매달린 판자가 (계속) 덮는 나사 — 떼고 나면 전부 정말 막혀 있다
          const nw = blockedM(L, s.S.gone) & ~blockedM(L, H.S0.gone) & L.all & ~s.S.gone;
          expect(p.cover & nw).toBe(nw);
          expect(p.cover & ~blockedM(L, s.S.gone)).toBe(0);
          n++;
          cov += p.cover ? 1 : 0;
          chain += p.rec.filter((e) => e.k === 'out' && e.pop).length;
        }
      }
    expect(n).toBeGreaterThan(60);
    expect(cov).toBeGreaterThan(0);
    expect(chain).toBeGreaterThan(0);
  });
});

describe('🌀 → 🌀 · 6판 공룡 (M1′ S006 · 📐 CONTENT 6판)', () => {
  const lvl = (seed: number) => {
    const s = g.create(seed);
    startStage(s, 5);
    return s.L;
  };
  it('🌀 쪽 가시 나사(#16)를 빼면 가시가 비켜 꼬리뿌리 🌀(#15)가 드러나고, #15 톡 → 띠용 → 띠용 (한 톡에 3개), 결정적', () => {
    for (const seed of [1, 42, 777]) {
      const L = lvl(seed), S = newSim(L);
      expect((freeM(L, S) >> 15) & 1).toBe(0);
      apply(L, S, 16);
      expect((freeM(L, S) >> 15) & 1, `seed ${seed}`).toBe(1);
      const rec: { k: string }[] = [];
      apply(L, S, 15, rec as never);
      expect(rec.filter((e) => e.k === 'boing').length).toBe(2);
      expect(rec.filter((e) => e.k === 'out').length).toBe(3);
    }
  });
  it('#17을 먼저 빼면 가시가 #15를 계속 덮는다 — 꾹 미리 보기에 ⚠', () => {
    const L = lvl(5), S = newSim(L);
    expect((peek(L, S, 17).cover >> 15) & 1).toBe(1);
    apply(L, S, 17);
    expect((freeM(L, S) >> 15) & 1).toBe(0);
  });
});

describe('되짚기 원인별 (✏️ S007 · 📋 S004 이월 ①②)', () => {
  it('막 누르기가 진 판: ①색은 빈칸에 간 톡에 다른 맞는 색이 있었고, ②진자는 짚은 판자가 매달려 남은 나사를 덮고, 짝 💡는 정말 덜 덮고, ③허공은 망치·🌀 판자', () => {
    const seen: Record<string, number> = {};
    let pair = 0;
    for (let k = 0; k < STAGES.length; k++)
      for (let sd = 1; sd <= 10; sd++) {
        const r = tryStage(screwshopMash, 300 + sd * 11, k, 300), s = r.s, b = s.blame, L = s.L, H = s.hist;
        if (r.ok || !b) continue;
        seen[b.c] = (seen[b.c] ?? 0) + 1;
        if (b.c === '①색') {
          const ok = b.t.some((t) => {
            const { S0, known, s: i } = H[t], f = freeM(L, S0) & known;
            return H[t].rec.some((e) => e.k === 'slot' && e.s === i) && L.col.some((c, j) => j !== i && (f >> j) & 1 && S0.box.includes(c));
          });
          expect(ok, `${k + 1}판 ①색`).toBe(true);
        }
        if (b.c === '②진자') {
          expect(H[b.t[0]].rec.some((e) => e.k === 'hang' && e.p === b.k), `${k + 1}판 ②진자 매단 톡`).toBe(true);
          if (b.p !== undefined) {
            pair++;
            const { S0, s: i } = H[b.t[0]], cnt = (m: number) => { let c = 0; for (; m; m &= m - 1) c++; return c; }, live = L.all & ~S0.gone & ~(1 << i) & ~(1 << b.p);
            expect((freeM(L, S0) >> b.p) & 1).toBe(1);
            const q1 = poseOf(L, b.k, S0.gone | (1 << i)), q2 = poseOf(L, b.k, S0.gone | (1 << b.p));
            expect(cnt(L.cov[b.k][q2] & live)).toBeLessThan(cnt(L.cov[b.k][q1] & live));
          }
        }
        if (b.c === '③허공') expect(!!L.pl[b.k].ham || L.pl[b.k].kind === 'spring', `${k + 1}판 ③허공`).toBe(true);
      }
    expect(seen['①색'] ?? 0).toBeGreaterThan(0);
    expect(seen['②진자'] ?? 0).toBeGreaterThan(0);
    expect(pair).toBeGreaterThan(0);
  });
});
