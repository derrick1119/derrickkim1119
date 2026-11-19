/** 스튜디오 나사 풀기 공방 (M0~): 결정성 · 판별 시작 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/screwshop/core.ts';
import { HINT_Y, RES_BY, RETRY_Y, STAGES, apply, bodySd, jackEarly, logLate, paintStage, comOf, geometry, blockedM, bonkDead, cloneSim, freeM, newSim, peek, poseOf, retrace, setAspect, setCue, screwshop as g, screwshopSmart, shotDead, starText, startStage, tipLine, setLearn, starKinds, KB, gaugeOf, gapOf, dead3, starsOf, missGoal } from '../studio/screwshop/game.ts';
import { mulberry32 } from '../studio/screwshop/rng.ts';
import { sfx, streakHz } from '../studio/screwshop/sfx.ts';
import { f16, screwshopMash, screwshopNewbie, tryStage } from '../studio/screwshop/funqa.ts';

/** M1′ 8판의 지금 자리(✏️ S010: 판 순서가 30판 자리로 바뀌어도 M1′ 테스트는 같은 판을 본다) */
const M = ['giraffe', 'boat', 'train', 'mill', 'flower', 'dino', 'castle', 'rocket'].map((key) => STAGES.findIndex((d) => d.key === key));

describe('나사 풀기 공방 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, screwshopSmart, 7, 60 * 300), b = runBot(g, screwshopSmart, 7, 60 * 300);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('실린 판 = 30판 자리 순서(월드-판 오름차순 · 겹침 없음) · M1′ 8판은 📋 뼈대 자리 · 아무 판에서나 시작할 수 있다 (✏️ S010)', () => {
    const n = STAGES.map((d) => d.slot.split('-').reduce((a, x) => a * 100 + +x, 0));
    for (let i = 1; i < n.length; i++) expect(n[i], STAGES[i].slot).toBeGreaterThan(n[i - 1]);
    expect(M.map((i) => STAGES[i].slot)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '2-6', '3-1', '3-8']); // 📋 S018 R5: 28판 번호(🚀 3-10 → 3-8 · id · 칠 그대로)
    expect(STAGES.length).toBeGreaterThan(8);
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
});

describe('하트 없음 · ↺ 지금 다시 (M1′ S003, 오너 기준 7)', () => {
  it('몇 번을 실패해도 게임이 끝나지 않고 그 판만 다시 (같은 칠)', () => {
    const s = g.create(9);
    startStage(s, M[7]); // 막 누르기가 늘 지는 판 (✏️ S005: 빌드 때 고르기 뒤 5판은 막 누르기 클리어 0.13이라 8판 0.00으로)
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
    expect(s.stage).toBe(M[7]);
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
  it('막 누르기가 3~8판에서 진 판은 전부 짚을 톡이 1~2개, 원인 10갈래 중 하나(✏️ S014 ③뿅 더함)', () => {
    const kinds = ['①색', '①연쇄', '①깔림', '①잠김', '②진자', '②못', '③통나무', '③허공', '③뿅', '④태엽'];
    let lost = 0;
    for (let k = 2; k < STAGES.length; k++) // ✏️ S010: 3판 뒤 모든 판(새 판 포함)
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
    const L = lvl(1000, M[3]), nail = L.pl.map((p, k) => (p.kind === 'nail' ? k : -1)).filter((k) => k >= 0);
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
    for (let k = 0; k < 100; k++) g.step(s, { tap: false, dir: 0, pointer: null });
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
    expect(gzipSync(html).length).toBeLessThan(60 * 1024); // M2′ 상한 60KB(오너 승인 2026-11-16 03:00 UTC 채팅 "60KB로 올림" · 쉬운 별 말 · 단계별 배우기 · 이전 줄: M2 상한 52KB(📋 S009 기준 개정 '낮추는 쪽' — 30판 데이터 · 실루엣 · 판 선택, 목표 50 · 오너 테스트 때 밝힘). 이전: M1′ 상한 (📋 S002: 120 → 36KB, 📋 S003 결정: 36 → 40KB — 남은 🔑·미리 보기·손맛을 자르지 않으려고. 이유는 MILESTONES 위험 ①, 오너 테스트 때 밝힘)
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
    startStage(s, M[5]);
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

describe('🚀 8판 로켓 발사 (M1′ S007 · 📐 CONTENT 8판)', () => {
  it('장인 수순: 해치를 🔑 쪽 나사만 빼 비켜 세우고 🔒 색 상자 둘이 열린 때 🔑 → 드르륵 · 🔒 다섯 · 🌀 띠용 → 💥 쏙 한 방 7 (★3)', () => {
    for (const seed of [1, 9, 17]) {
      const r = tryStage(screwshopSmart, seed, M[7]);
      expect(r.ok, `seed ${seed}`).toBe(true);
      expect(r.shot).toBe(7);
      expect(r.stars).toBe(3);
    }
  });
  it('🔑 전에는 ★3 한 방 칩이 살아 있다 (🪵 없는 한 방 판 — shotDead)', () => {
    const s = g.create(4);
    startStage(s, M[7]);
    expect(shotDead(STAGES[M[7]], s.L, s.S)).toBe(false);
  });
});

describe('🌻 5판 진자 좌표 (M1′ S008 · 📐 CONTENT 5판)', () => {
  it('왼 꽃잎: 바깥 #9를 빼면 안쪽 #8에 매달려 꽃 머리 톡에 우수수 · 안쪽 #8을 먼저 빼면 바깥 축에 매달려 안 맞고 잎 #3을 덮는다', () => {
    for (const seed of [1, 5, 42]) {
      const s = g.create(seed);
      startStage(s, M[4]);
      const L = s.L;
      let S = newSim(L);
      apply(L, S, 9);
      const r1: { k: string; p?: number }[] = [];
      apply(L, S, 14, r1 as never);
      expect(r1.some((e) => e.k === 'crash' && e.p === 4), `seed ${seed} 바른 쪽`).toBe(true);
      S = newSim(L);
      apply(L, S, 8);
      expect((blockedM(L, S.gone) >> 3) & 1).toBe(1);
      const r2: { k: string; p?: number }[] = [];
      apply(L, S, 14, r2 as never);
      expect(r2.some((e) => e.k === 'crash' && e.p === 4), `seed ${seed} 틀린 쪽`).toBe(false);
    }
  });
});

describe('🌬️ 4판 🔨 연쇄 1단 (M1′ S008 · 📐 CONTENT 4판)', () => {
  it('장인: 📌 날개 🔨가 🎯를 쾅 → 탑이 기우뚱 → 탑 🔨가 문을 쾅 — 한 톡에 3개 (쏙 한 방 ≥ 3), ★3', () => {
    for (const seed of [1, 9, 17]) {
      const r = tryStage(screwshopSmart, seed, M[3]);
      expect(r.stars, `seed ${seed}`).toBe(3);
      expect(r.shot).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('실루엣 몸통 parts (✏️ S009 · S010 🎨 ART M2 문법 — 조각 합집합 SDF, geometry에서 미리 계산)', () => {
  it('덧조각(M1′ 모드): 본체와 같은 둥근 네모를 덧대면 8판 모든 자세의 덮임 · 숨김 · 🔨 과녁이 그대로 · 아래 나사를 덮는 덧조각은 덮임을 바꾼다', () => {
    const u = (v: number) => v / 0.005;
    for (let k = 0; k < STAGES.length; k++) {
      const pl = STAGES[k].toy(), a = geometry(pl), b = geometry(pl.map((p) => ({ ...p, parts: `B 0 0 ${u(p.hx)} ${u(p.hy)} ${u(p.rr)}` })));
      expect([b.cov, b.hid, b.hamT], `${k + 1}판`).toEqual([a.cov, a.hid, a.hamT]);
    }
    const bot = { ...STAGES[0].toy()[0], cx: 0.7, cy: 0.5, a: 0, hx: 0.05, hy: 0.05, rr: 0.02, sc: [[0.7, 0.5]], kind: 'wood' as const, ham: undefined, heavy: undefined };
    const top = { ...bot, cx: 0.4, cy: 0.5, hx: 0.12, hy: 0.05, sc: [[0.3, 0.5], [0.4, 0.5]] };
    expect(geometry([bot, top]).cov[1][0] & 1, '덧조각 없음').toBe(0);
    expect(geometry([bot, { ...top, parts: 'O 60 0 14' }]).cov[1][0] & 1, '원 덧조각이 아래 나사를 덮음').toBe(1);
  });
  it('m2 판자: 몸통 = 조각만(본체 없음) · 도형 6종 · 무게중심이 조각 쪽으로 가서 매달린 자세가 그쪽으로 돈다', () => {
    const bot = { ...STAGES[0].toy()[0], cx: 0.7, cy: 0.5, a: 0, hx: 0.05, hy: 0.05, rr: 0.02, sc: [[0.7, 0.5]], kind: 'wood' as const, ham: undefined, heavy: undefined };
    const top = { ...bot, cx: 0.5, cy: 0.5, hx: 0.28, hy: 0.08, sc: [[0.3, 0.5], [0.4, 0.5]], m2: true };
    const L = geometry([bot, { ...top, parts: 'B -20 0 24 10 4;O 40 0 14' }]), L0 = geometry([bot, { ...top, parts: 'B -20 0 24 10 4' }]);
    expect([L.cov[1][0] & 1, L0.cov[1][0] & 1], '원 조각 밑 나사').toEqual([1, 0]);
    expect(L.poses[1][2].d, '#2(0.4,0.5)에 매달리면 오른쪽(원)이 아래로').toBeGreaterThan(1);
    expect(Math.abs(L0.poses[1][2].d), '조각 없이는 무게중심 = 피벗').toBe(0);
    // 도형 6종이 아래 나사 자리(0.7,0.5 = 로컬 40u)를 덮는다 · 반대쪽 조각은 덮지 않는다
    for (const [s, hit] of [['B 40 0 6 6 2', 1], ['O 40 0 6', 1], ['C 30 0 50 0 5', 1], ['E 40 0 8 5', 1], ['W 30 0 6 50 0 3', 1], ['P 1 32 -6 48 -6 40 8', 1], ['P 1 -40 -6 -24 -6 -32 8', 0], ['W -40 0 6 -20 0 3', 0]] as const)
      expect(geometry([bot, { ...top, parts: s }]).cov[1][0] & 1, s).toBe(hit);
  });
  it('M1′ 덧조각(🎨 ART M2 §5): 본체가 안 덮는 아래 나사는 덧조각에서 ≥ 0.040(회색 띠 0) · 보이는 무게중심 기울기 ≤ 12°', () => {
    let n = 0;
    for (let k = 0; k < STAGES.length; k++) {
      const pl = STAGES[k].toy(), L = geometry(pl);
      pl.forEach((P, j) => {
        if (!P.parts || P.m2) return;
        n++;
        for (const q of L.poses[j])
          for (let i = 0; i < L.N; i++)
            if (L.owner[i] < j && bodySd({ ...P, parts: undefined }, q, L.px[i], L.py[i]) >= 0.021)
              expect(bodySd({ ...P, m2: true }, q, L.px[i], L.py[i]), `${STAGES[k].slot} 판자 ${j} 나사 ${i}`).toBeGreaterThanOrEqual(0.04);
        const u = (v: number) => v / 0.005, [gx, gy] = comOf({ ...P, m2: true, parts: `B 0 0 ${u(P.hx)} ${u(P.hy)} ${u(P.rr)};${P.parts}` });
        for (const i of L.ps[j]) {
          const a = Math.atan2(gy - L.py[i], gx - L.px[i]), b = Math.atan2(P.cy - L.py[i], P.cx - L.px[i]), dd = Math.abs(((a - b + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
          if (Math.hypot(P.cx - L.px[i], P.cy - L.py[i]) > 0.012) expect((dd * 180) / Math.PI, `${STAGES[k].slot} 판자 ${j} 나사 ${i} 기울기`).toBeLessThanOrEqual(12);
        }
      });
    }
    expect(n, '덧조각 판자 수').toBeGreaterThanOrEqual(20);
  });
});

describe('🐹 쿵 (S011 📐B · GIMMICKS §4 — 판 플래그 thump)', () => {
  it('쿵 판(1-6 🐷)만 쿵: 장인 판마다 쿵 ≥ 1 · 쿵 뒤 덜컹 ≥ 1 · 톡 하나에 쿵 ≤ 1 · 쿵 톡의 연속이 6의 배수를 넘음 / 플래그 없는 판은 쿵 0', () => {
    for (let k = 0; k < STAGES.length; k++) {
      const d = STAGES[k];
      for (const seed of [1000, 1007, 1014]) {
        const { s } = tryStage(screwshopSmart, seed, k), taps = s.hist.map((h) => h.rec.filter((e) => e.k === 'thump').length);
        expect(Math.max(0, ...taps), `${d.slot} 톡 하나에 쿵`).toBeLessThanOrEqual(1);
        if (!d.thump) { expect(taps.reduce((a, b) => a + b, 0), `${d.slot} 쿵 없음`).toBe(0); continue; }
        const th = s.hist.filter((h) => h.rec.some((e) => e.k === 'thump'));
        expect(th.length, `${d.slot} 쿵`).toBeGreaterThan(0);
        expect(th.some((h) => h.rec.slice(h.rec.findIndex((e) => e.k === 'thump')).some((e) => e.k === 'fall')), `${d.slot} 쿵 뒤 덜컹`).toBe(true);
        for (const h of th) {
          const z1 = h.rec.slice(0, h.rec.findIndex((e) => e.k === 'thump')).filter((e) => e.k === 'box').map((e) => (e as { n: number }).n);
          expect(Math.max(...z1) % 6 === 0 || z1.some((n) => n % 6 === 0), `${d.slot} 쿵 톡의 연속`).toBe(true);
        }
      }
    }
  });
});

describe('💡 밤톨의 귀띔 (✏️ S012 · GDD §11 · 📋 M2 ③)', () => {
  it('같은 판을 3번 지면 실패 카드의 귀띔 단추가 귀띔을 켠다 · 켜면 손가락(장인 수)을 따라 깨도 그 판 ★ 최대 2 · 다음 판에서 꺼진다', () => {
    const s = g.create(7);
    startStage(s, M[7]);
    const k0 = s.stage, rng = mulberry32(3), A = 1.45;
    let guard = 0;
    while (s.sf < 3 && guard++ < 60 * 3000) {
      if (s.phase === 'result' && !s.ok) {
        for (let i = 0; i < 50; i++) g.step(s, { tap: false, dir: 0, pointer: null });
        g.step(s, { tap: false, dir: 0, pointer: { x: 0.02, y: 0.02 } }), g.step(s, { tap: false, dir: 0, pointer: null }); // 단추 밖 = 그냥 다시
        continue;
      }
      if (s.phase === 'result' && s.ok) { // 막 누르기가 어쩌다 깨면 ↺ 다시(진 횟수는 그대로)
        for (let i = 0; i < 35; i++) g.step(s, { tap: false, dir: 0, pointer: null });
        g.step(s, { tap: false, dir: 0, pointer: { x: 0.25, y: RES_BY / A } }), g.step(s, { tap: false, dir: 0, pointer: null });
        continue;
      }
      g.step(s, screwshopMash.act(s, rng));
    }
    expect([s.sf, s.stage, s.hint]).toEqual([3, k0, false]);
    for (let i = 0; i < 50; i++) g.step(s, { tap: false, dir: 0, pointer: null });
    g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: HINT_Y / A } }), g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.hint, s.phase]).toEqual([true, 'play']);
    while (s.phase !== 'result' && guard++ < 60 * 6000) g.step(s, screwshopSmart.act(s, rng));
    expect(s.ok).toBe(true);
    expect(s.got).toBeLessThanOrEqual(2);
    for (let i = 0; i < 260 && s.stage === k0; i++) g.step(s, { tap: false, dir: 0, pointer: i % 40 === 39 ? { x: 0.75, y: RES_BY / A } : null });
  });
  it('귀띔 봇(처음 봇이 3번 지면 귀띔을 켜고 손가락을 따름): 실린 판마다 클리어 ≥ .95 · 귀띔 쓴 판 ★3 0 (6시드)', () => {
    for (let k = 0; k < STAGES.length; k++) {
      let ok = 0;
      for (let i = 0; i < 6; i++) {
        const seed = 1000 + i * 7, tries = [0, 1, 2].map((j) => tryStage(screwshopNewbie, seed, k, 600, seed + j * 100003));
        if (tries.some((x) => x.ok)) { ok++; continue; }
        const h = tryStage(screwshopSmart, seed, k, 600, seed, true);
        ok += +h.ok;
        expect(h.s.got, `${STAGES[k].slot} 귀띔 ★`).toBeLessThanOrEqual(2);
      }
      expect(ok / 6, STAGES[k].slot).toBeGreaterThanOrEqual(0.95);
    }
  });
});

describe('🐹 쿵을 별에 · 빈 쿵 · F16 v2.1 (✏️ S012 · 📐B 1-6 · 🧪 S011 기준)', () => {
  const at = (key: string) => STAGES.findIndex((d) => d.key === key);
  it('1-6 🐷 ★3 = 한 방 5: 쿵 판은 남은 나사가 H개 이상이면 ★3 칩이 살아 있다(🪵 · 🔑 없이도) · 쿵을 끄면 장인 ★3 0(F19)', () => {
    const k = at('piggy'), d = STAGES[k], s = g.create(5);
    startStage(s, k);
    expect([d.H, d.thump]).toEqual([5, true]);
    expect(shotDead(d, s.L, s.S)).toBe(false);
    const off = { ...s.L, thump: false };
    expect(shotDead(d, off, s.S)).toBe(true); // 쿵이 없으면 처음부터 못 딴다(패치가 막는 것)
    let s3 = 0;
    for (let i = 0; i < 4; i++) {
      const t = g.create(1000 + i * 7);
      startStage(t, k);
      t.L = { ...t.L, thump: false };
      const rng = mulberry32(i), t0 = t.t;
      while (t.phase !== 'result' && t.t - t0 < 600 * 60) g.step(t, screwshopSmart.act(t, rng));
      s3 += +(t.ok && t.S.shot >= 5);
    }
    expect(s3).toBe(0);
  });
  it('빈 쿵(덜컹 0)은 작은 글자 + 한 번 귀띔 말풍선 · 덜컹이 있으면 말풍선 없음', () => {
    let empty = 0, full = 0;
    for (let i = 0; i < 8; i++) {
      const r = tryStage(screwshopNewbie, 1000 + i * 7, at('piggy')).s;
      const th = r.hist.filter((h) => h.rec.some((e) => e.k === 'thump')).map((h) => h.rec.slice(h.rec.findIndex((e) => e.k === 'thump')).filter((e) => e.k === 'fall').length);
      if (!th.length) continue;
      expect(r.tips.has('thump0'), `시드 ${i}`).toBe(th.includes(0));
      empty += +th.includes(0), (full += +th.some((n) => n > 0));
    }
    expect(empty).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(0);
  });
  it('F16 v2.1: 1-10 🚜 🔑 카드 톡에 꾹 미리 보기 "빈칸"이 뜬다(와르르가 🔒를 드르륵보다 먼저 떨궈도) · 1-4 🐿️ 망치가 매달린 뒤 과녁 톡은 ①색 · 카드 짝 ≥ .8', () => {
    const t = f16(at('tractor')), q = f16(at('squirrel')); // 막 누르기 100시드(🧪 정의 그대로)
    expect(t.by['④태엽'][0]).toBeGreaterThan(10);
    expect(t.v21!).toBeGreaterThanOrEqual(0.95);
    expect(q.v21!).toBeGreaterThanOrEqual(0.9);
    expect(q.pair!).toBeGreaterThanOrEqual(0.8);
  });
});

describe('🪵 통나무가 먼저 떨어져 → 빈칸 (✏️ S013 · 🧪 S012 F16 v2.1 ③ · 📋 경고로 푼다)', () => {
  const at = (key: string) => STAGES.findIndex((d) => d.key === key);
  it('🤡 ③뿅(✏️ S014 · 🧪 S013 카드가 뿅을 안 짚음): 뿅 전에 모자 나사를 손으로 빈칸에 보낸 실패는 카드가 그 톡을 짚고 그 톡 꾹에 \'뿅에 맡겨요\'(jackEarly) · 3-2 F16 v2.1 n ≥ 10 · ≥ .8 · 마지막 톡만 ≤ .8', () => {
    const k = at('jackbox');
    let cards = 0;
    for (let i = 0; i < 40; i++) {
      const s = tryStage(screwshopMash, 1000 + i * 7, k).s, b = s.blame;
      if (s.ok || !b || b.c !== '③뿅') continue;
      cards++;
      const h = s.hist[b.t[0]];
      expect(jackEarly(s.L, h.S0.gone, h.s, h.rec), `시드 ${i}`).toBe(true);
    }
    expect(cards).toBeGreaterThan(3);
    const f = f16(k);
    expect(f.n).toBeGreaterThanOrEqual(10);
    expect(f.v21!).toBeGreaterThanOrEqual(0.8);
    expect(f.onlyLast!).toBeLessThanOrEqual(0.8);
  });
  it('🤡 깜짝 상자(📐B S013 3-2): 상자 판자가 다 풀린 톡에 뿅 → 겨눈 모자 나사가 위에서부터 튄다 · 뿅을 끄면 장인 ★3 0(F19) · jack 플래그 없는 판엔 jack 없음', () => {
    const k = at('jackbox');
    for (const seed of [1000, 1007, 1014]) {
      const x = tryStage(screwshopSmart, seed, k), h = x.s.hist.find((e) => e.rec.some((r) => r.k === 'jack'));
      expect(x.stars, `시드 ${seed} 장인 ★3`).toBe(3);
      expect(h, `시드 ${seed} 뿅`).toBeTruthy();
      const r = h!.rec, ys = r.slice(r.findIndex((e) => e.k === 'jack')).flatMap((e) => (e.k === 'out' ? [x.s.L.py[e.s]] : []));
      expect(ys.length).toBeGreaterThan(0);
      expect(ys, '위에서부터').toEqual([...ys].sort((a, b) => a - b));
      const t = g.create(seed), rng = mulberry32(seed ^ 0x9e3779b9);
      startStage(t, k);
      t.L = { ...t.L, jack: undefined };
      for (let i = 0; i < 600 * 60 && t.phase !== 'result'; i++) g.step(t, screwshopSmart.act(t, rng));
      expect(t.hist.some((e) => e.rec.some((r) => r.k === 'jack')), '뿅 끔').toBe(false);
      expect(t.ok && t.S.shot >= 4, `시드 ${seed} 뿅 없이 ★3(F19)`).toBe(false);
    }
    // ✏️ S015: 🤡 판이 셋(3-2 · 3-3 · 3-6)이 됨 → '판 플래그 jack이 있는 판만 칠에 jack이 그대로, 없는 판은 없음'(3-2만 보던 것보다 넓게)
    STAGES.forEach((d, j) => expect(paintStage(j, 1).jack, d.slot).toEqual(d.jack));
    expect(STAGES.filter((d) => d.jack).map((d) => d.slot)).toEqual(['3-2', '3-3', '3-6']);
  });
  it('💡 귀띔은 실패 카드 단추로 켜고 끈다(✏️ S013 · 🧪 S012 \'같은 판에서 못 끔\') — 끄면 그 판 ★3이 다시 열린다', () => {
    const s = g.create(7), A = 1.45, rng = mulberry32(5);
    startStage(s, at('rocket'));
    (s.sf = 3), (s.hint = true);
    const fail = () => {
      for (let guard = 0; guard < 60 * 3000; guard++) {
        if (s.phase === 'result' && !s.ok) break;
        if (s.phase === 'result' && s.ok) { // 막 누르기가 어쩌다 깨면 ↺ 다시
          for (let i = 0; i < 35; i++) g.step(s, { tap: false, dir: 0, pointer: null });
          g.step(s, { tap: false, dir: 0, pointer: { x: 0.25, y: RES_BY / A } }), g.step(s, { tap: false, dir: 0, pointer: null });
          continue;
        }
        g.step(s, screwshopMash.act(s, rng));
      }
      for (let i = 0; i < 50; i++) g.step(s, { tap: false, dir: 0, pointer: null });
    };
    fail();
    g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: HINT_Y / A } }), g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.hint, s.phase]).toEqual([false, 'play']);
    fail();
    g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: HINT_Y / A } }), g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.hint, s.phase]).toEqual([true, 'play']);
  });
  it('💡 도구 줄 단추: 켠 뒤 톡 0이면 다시 눌러 끈다 · 톡한 뒤엔 못 끈다(✏️ S015 · 🧪 S014 ⑤ — 끄기는 실패 카드에서)', () => {
    setAspect(1.75);
    try {
      const s = g.create(7), A = 1.75, up = { tap: false, dir: 0 as const, pointer: null }, rng = mulberry32(3);
      const press = () => (g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: (A - 0.15) / A } }), g.step(s, up));
      startStage(s, at('rocket'));
      s.sf = 3;
      for (let i = 0; i < 40; i++) g.step(s, up);
      press();
      expect(s.hint, '켬').toBe(true);
      press();
      expect(s.hint, '톡 0 → 끔').toBe(false);
      press();
      for (let i = 0; i < 600 && s.S.taps === 0; i++) g.step(s, screwshopSmart.act(s, rng));
      for (let i = 0; i < 40; i++) g.step(s, up);
      expect([s.S.taps > 0, s.phase], '한 번 톡').toEqual([true, 'play']);
      press();
      expect(s.hint, '톡한 뒤엔 그대로').toBe(true);
    } finally {
      setAspect(1.45);
    }
  });
  it('실패 카드 ③통나무의 둘째 톡(와르르 없이 떨어진 통나무 밑 나사 → 빈칸)에 알약 조건 logLate가 선다 · 2-4 🦀 · 1-2 ⛵ F16 v2.1 ≥ .8', () => {
    let cards = 0;
    for (const key of ['crab', 'boat']) {
      const k = at(key);
      for (let i = 0; i < 40; i++) {
        const s = tryStage(screwshopMash, 1000 + i * 7, k).s, b = s.blame;
        if (s.ok || !b || b.c !== '③통나무') continue;
        cards++;
        const t = b.t[1];
        expect(logLate(s.L, s.hist.slice(0, t), s.hist[t].rec), `${key} 시드 ${i}`).toBe(true);
        expect(logLate(s.L, s.hist.slice(0, b.t[0]), s.hist[b.t[0]].rec), `${key} 통나무 톡은 아직 아님`).toBe(false);
      }
      expect(f16(k).v21!, key).toBeGreaterThanOrEqual(0.8);
    }
    expect(cards).toBeGreaterThan(3);
  });
  it('💡 결과 글은 판 팁에서 앞 그림만 뗀다(✏️ S023 · M2′ G1 · 🧪 S022 \'🔑는\' 잘림): tip · tip2 전부 — 앞이 그림이면 낱말 −1, 아니면 그대로', () => {
    let n = 0;
    for (const d of STAGES) for (const x of [d.tip, d.tip2].filter((v): v is string => !!v)) {
      const w = x.split(' '), pic = /^[\p{Extended_Pictographic}\u200d\ufe0f]+$/u.test(w[0]);
      expect(tipLine(x), `${d.slot} ${x}`).toBe(pic ? w.slice(1).join(' ') : x);
      n++;
    }
    expect(n).toBeGreaterThan(STAGES.length);
    for (const slot of ['1-5', '1-8', '2-3']) expect(tipLine(STAGES.find((d) => d.slot === slot)!.tip2!), slot).toMatch(/^🔑는 /);
  });

  it('별 글(✏️ S024 · 오너 "알기 쉽게"): 28판 칩 · 결과 · 배우기 줄에 기호(≥ ≤ + · a / b) 0 · 칩은 ★ 이름표 · ✏️ S067(M3″ 새 별 · 옛 톡 · 연달아 단언을 바꿈): 쾅 판 밖은 칩이 늘 \'★2 빈칸 G칸까지\' · \'★3 한 번에 H개 쏙\' · 빈칸이 G칸을 넘으면 ★3도 ✗(별 3개) · 한 번에 H는 ★2가 있어야 별 3 · 결과 줄도 같은 말', () => {
    for (const [k, d] of STAGES.entries()) {
      const s = g.create(1); if (k) startStage(s, k);
      const tx = starText(d, s.S);
      for (const x of Object.values(tx)) { expect(x, d.slot).not.toMatch(/[≥≤+]/); expect(x, d.slot).not.toMatch(/\d ?\/ ?\d+ ?\(/); }
      expect([tx.c1.slice(0, 2), tx.c2.slice(0, 2), tx.c3.slice(0, 2)], d.slot).toEqual(['★1', '★2', '★3']);
      if (d.B) continue; // 쾅 판(1-1 예외)은 아래 '1판 겹별' 단언이 본다
      const G = gapOf(d);
      expect([tx.c2, tx.c3], d.slot).toEqual([`★2 빈칸 ${G}칸까지`, `★3 한 번에 ${d.H}개 쏙`]);
      expect([missGoal(d, false), missGoal(d, true)], d.slot).toEqual([tx.c2, tx.c3]);
      expect(dead3(d, s.L, s.S), `${d.slot} 처음엔 ★3이 살아 있다`).toBe(false);
      expect(starsOf(d, { ...s.S, peak: G, shot: d.H }), `${d.slot} 빈칸 G칸 + 한 번에 H`).toBe(3);
      expect(starsOf(d, { ...s.S, peak: G + 1, shot: d.H }), `${d.slot} 빈칸이 넘친 한 번에 H는 별 2`).toBe(2);
      expect(dead3(d, s.L, { ...s.S, peak: G + 1 }), `${d.slot} 빈칸이 넘치면 ★3(별 3개)도 ✗`).toBe(true);
    }
  });

  it('F28 말 하나(📋 S023 · ✏️ S026): 별 종류마다 칩 · 결과(받음 · 놓침) · 배우기 줄이 같은 낱말 · 28판 칩 게이지가 판 중에 움직인다(진행 보임 28/28)', () => {
    const word: Record<string, string> = { bonk: '쾅', gap: '빈칸', shot: '한 번에', tap: '톡', streak: '연달아' };
    for (const [k, d] of STAGES.entries()) {
      const s = g.create(1); if (k) startStage(s, k);
      const [a, b] = starKinds(d), lo = starText(d, s.S), hi = starText(d, { ...s.S, shot: 9, taps: 99, best: 99, bonks: 9, peak: 9 });
      for (const [kd, xs] of [[a, [lo.c2, lo.r2, hi.r2, lo.l2]], [b, [lo.c3, lo.r3, hi.r3, lo.l3]]] as const) for (const x of xs) expect(x, `${d.slot} ${kd}`).toContain(word[kd]);
      expect(gaugeOf(d, { ...s.S, shot: 0, taps: 0, streak: 0, bonks: 0 }), d.slot).not.toBe(gaugeOf(d, { ...s.S, shot: 1, taps: 1, streak: 1, bonks: 1 }));
    }
  });

  it('단계별 배우기(✏️ S024 · 📐 사다리): 판마다 안 배운 가장 낮은 별 하나만 가르치고 그 위 ★3은 🔒 · 깬 판에서 배움 · 다 배우면 0 · 별 값(starsOf)은 그대로', () => {
    const at = (k: number, m: number) => { const s = g.create(1); if (k) startStage(s, k); setLearn(s, m); return s; };
    const i = (slot: string) => STAGES.findIndex((d) => d.slot === slot);
    const a = at(i('1-1'), 0);
    expect([a.teach, a.lock3]).toEqual([2, true]); // 쾅(★2) · ★3 잠금
    const b = at(i('1-2'), KB.bonk);
    expect([b.teach, b.lock3]).toEqual([2, true]); // 빈칸(★2)
    const c = at(i('1-3'), KB.bonk | KB.gap);
    expect([c.teach, c.lock3]).toEqual([3, false]); // ★3
    expect(at(i('1-2'), 31).teach).toBe(0);
    for (const [k, d] of STAGES.entries()) { const s = at(k, 0), [x, y] = starKinds(d); expect(s.teach, d.slot).toBe(2); expect(s.lock3, d.slot).toBe(x !== y); }
    const r = tryStage(screwshopSmart, 1000, i('1-1'));
    expect(r.ok && r.stars).toBe(3);
    expect(r.s.learn & KB.bonk).toBe(KB.bonk);
  });
});
