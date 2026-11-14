/** 스튜디오 나사 풀기 공방 — 판별 반증 · 실린 칠 지문 (✏️ S009, 📋 M2 CI 대책: studio-screwshop.test.ts에서 판별 측정을 옮기고 '실린 판 = 표'를 지문으로 바꿈) */
import { describe, expect, it } from 'vitest';
import { STAGES, paintStage, screwshop as g, startStage } from '../studio/screwshop/game.ts';
import { measure, measureStage, pnrHit, screwshopMash, screwshopNewbie, tryStage } from '../studio/screwshop/funqa.ts';
import { N, geomSig, paintSig, valueOf } from '../studio/screwshop/pick.ts';
import { PICKS } from '../studio/screwshop/picks.ts';
import { SIG } from '../studio/screwshop/picks.sig.ts';

describe('실린 칠 지문 (판·칠하기·고르기 식을 바꾸면 npx tsx studio/screwshop/pick.ts · 전체 다시 고르기 확인은 pick.ts --check)', () => {
  it('판 id는 서로 다르고 PICKS · SIG에 그 id 줄이 있다', () => {
    const ids = STAGES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect([PICKS[id]?.length, SIG[id]?.p.length], `id ${id}`).toEqual([N, N]);
  });
  STAGES.forEach((d, k) =>
    it(`실린 칠 지문 · ${k + 1}판 ${d.emoji} (id ${d.id}): 실린 ${N}칠 + 컷 칠의 판 모양 · 칠 · 고르기 값 · 순서`, () => {
      const sg = SIG[d.id], seq = [...sg.p, sg.cut];
      expect(PICKS[d.id]).toEqual(sg.p.map((x) => x[0]));
      for (const [sub, v, h] of seq) {
        const L = paintStage(k, sub);
        expect(geomSig(L), `칠 ${sub} 판 모양`).toBe(sg.g);
        expect(paintSig(L), `칠 ${sub} 칠`).toBe(h);
        expect(valueOf(k, sub, L), `칠 ${sub} 고르기 값`).toBe(v);
      }
      // 고른 순서: 값이 큰 순 · 같으면 작은 칠 먼저 — 컷(N+1위)은 마지막 실린 칠보다 뒤
      for (let i = 1; i < seq.length; i++) expect(seq[i - 1][1] > seq[i][1] || (seq[i - 1][1] === seq[i][1] && seq[i - 1][0] < seq[i][0]), `${i}위 → ${i + 1}위`).toBe(true);
    }),
  );
  it('게임이 싣는 칠 = PICKS[id][seed % N] (시드 1..N, 판마다)', () => {
    for (let k = 0; k < STAGES.length; k++)
      for (let seed = 1; seed <= N; seed++) {
        const s = g.create(seed);
        startStage(s, k);
        expect(paintSig(s.L), `${k + 1}판 시드 ${seed}`).toBe(SIG[STAGES[k].id].p[seed % N][2]);
      }
  });
});

describe('판별 반증 (옮김 — 단언 그대로)', () => {
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
  it('2판 목표: 장인 ★3 · 버릇 3종 ★3 ≤ 0.4 · 무작위 클리어 ≥ 0.9 (24시드)', () => {
    const r = measureStage(1, 24, ['smart', 'habit', 'top', 'reveal', 'random']);
    expect(r.smart.star3).toBeGreaterThanOrEqual(0.9);
    for (const b of ['habit', 'top', 'reveal']) expect(r[b].star3, b).toBeLessThanOrEqual(0.4);
    expect(r.random.clear).toBeGreaterThanOrEqual(0.9);
  });
  for (const k of [2, 3, 4, 5, 6, 7])
    it(`${k + 1}판 반증(24시드): 장인 ★3 ≥ 0.7 · 버릇 3종 ★3 ≤ 0.15 · 따라 하기 ★3 ≤ 0.25 · 4판 무작위 ≥ 0.5 · 버릇 클리어 ≥ 0.4 (S005 5판 🌻 · S006 6판 🦕 · S007 7판 🏰 · 8판 🚀 더함 · ✏️ S009 판마다 한 테스트)`, () => {
      const r = measureStage(k, 24, ['smart', 'habit', 'top', 'reveal', 'preview', 'random']);
      expect(r.smart.star3, `${k + 1}판 장인`).toBeGreaterThanOrEqual(0.7);
      for (const b of ['habit', 'top', 'reveal']) expect(r[b].star3, `${k + 1}판 ${b}`).toBeLessThanOrEqual(0.15);
      expect(r.preview.star3, `${k + 1}판 따라 하기`).toBeLessThanOrEqual(0.25);
      if (k === 3) expect([r.random.clear >= 0.5, r.habit.clear >= 0.4]).toEqual([true, true]);
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
