/**
 * 깊이 사다리 (GDD §4.3 · §10.5 · FUN v1.4 ⓓ, 📋 C008 → C009): 판마다 봇 표를 단언한다. 하나라도 깨지면 그 판을 재설계한다.
 * 폭약 2개 이상 판: greedy1 ★3 ≤ 소개 판 문턱 .4 · look2 ★3 ≥ .8(소개 판) · greedy1 ≤ look2 ≤ 박사(1) — '조금만 생각하면 닿는다'.
 * 버릇 봇(F10)은 소개 판에선 보고만(1-5부터 ≤ .2 — 그 판이 들어올 때 여기에 단언을 더한다).
 */
import { describe, expect, it } from 'vitest';
import { STAGES3 } from '../studio/demolition/stages3d.ts';
import { layoutOf3 } from '../studio/demolition/sim3d.ts';
import { habit, look2, simCache } from '../studio/demolition/bots3d.ts';
import { measureStage3 } from '../studio/demolition/funqa.ts';

describe('깊이 사다리 (3D 판마다)', () => {
  for (const d of STAGES3.filter((x) => x.charges >= 2)) {
    it(`${d.title}: greedy1 ≤ .4 · look2 ≥ .8 · greedy1 ≤ look2 ≤ 1`, () => {
      const L = layoutOf3(d), c = simCache(L), m = measureStage3(d, { bots: false }), l2 = look2(L, d, c);
      expect(m.greedyStar3).toBeLessThanOrEqual(0.4);
      expect(l2).toBeGreaterThanOrEqual(0.8);
      expect(m.greedyStar3).toBeLessThanOrEqual(l2);
      expect(m.best).toBe(3);
      // 버릇 봇: 보고(소개 판) — 값이 0~1 안에서 계산되는지만
      const h = habit(L, d, c, false);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(1);
    }, 60000);
  }
});
