/** 스튜디오 나사 풀기 공방 — 판별 반증 (📋 S020 CI 대책: studio-screwshop-stages.test.ts에서 describe 그대로 옮김 · 단언 · it 수 그대로 — 공용 vitest 'Timeout calling onTaskUpdate'가 긴 파일 하나에 몰리지 않게) */
import { describe, expect, it } from 'vitest';
import { STAGES } from '../studio/screwshop/game.ts';
import { measure, measureStage, pnrHit, screwshopMash, screwshopNewbie, tryStage } from '../studio/screwshop/funqa.ts';

/** M1′ 8판의 지금 자리(✏️ S010) */
const M = ['giraffe', 'boat', 'train', 'mill', 'flower', 'dino', 'castle', 'rocket'].map((key) => STAGES.findIndex((d) => d.key === key));

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
      if (M.slice(4).includes(k)) expect(m.filter((x) => x.ok).length / 24, `${STAGES[k].slot} 클리어`).toBeLessThanOrEqual(0.15);
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
  for (const k of STAGES.map((_, i) => i).filter((i) => i >= 2)) // ✏️ S010: M1′ 3~8판 + 새 판
    it(`${k + 1}판 반증(24시드): 장인 ★3 ≥ 0.7 · 버릇 4종(✏️ S025 장치는 맨 나중 더함) ★3 ≤ 0.15 · 따라 하기 ★3 ≤ 0.25 · 4판 무작위 ≥ 0.5 · 버릇 클리어 ≥ 0.4 (S005 5판 🌻 · S006 6판 🦕 · S007 7판 🏰 · 8판 🚀 더함 · ✏️ S009 판마다 한 테스트)`, () => {
      const r = measureStage(k, 24, ['smart', 'habit', 'top', 'reveal', 'save', 'preview', 'random']); // ✏️ S025: 버릇 ④ 장치는 맨 나중(📋 A 통일 반증)
      expect(r.smart.star3, `${k + 1}판 장인`).toBeGreaterThanOrEqual(0.7);
      for (const b of ['habit', 'top', 'reveal', 'save']) expect(r[b].star3, `${k + 1}판 ${b}`).toBeLessThanOrEqual(0.15);
      expect(r.preview.star3, `${k + 1}판 따라 하기`).toBeLessThanOrEqual(0.25);
      if (k === M[3]) expect([r.random.clear >= 0.5, r.habit.clear >= 0.4]).toEqual([true, true]);
    });
  it('되짚기 F13: 처음 봇이 3·4판에서 지면 카드가 PNR(그 뒤로는 못 깨게 된 톡)을 짚는다 ≥ 0.8', () => {
    for (const k of [M[2], M[3]]) {
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
