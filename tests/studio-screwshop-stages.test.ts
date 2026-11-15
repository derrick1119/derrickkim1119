/** 스튜디오 나사 풀기 공방 — 실린 칠 지문(📋 S020: 판별 반증은 studio-screwshop-stages2.test.ts로 옮김) (✏️ S009, 📋 M2 CI 대책: studio-screwshop.test.ts에서 판별 측정을 옮기고 '실린 판 = 표'를 지문으로 바꿈) */
import { describe, expect, it } from 'vitest';
import { STAGES, paintStage, screwshop as g, screwshopSmart, startStage } from '../studio/screwshop/game.ts';
import { tryStage } from '../studio/screwshop/funqa.ts';
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
  it('판 검증(✏️ S015 · 📋 M2 완료 기준): 자리는 30판 표 꼴 · 겹침 없음 · 자리 순 · M2 새 판은 N 12~18 · 색 3~6 · 상자 2 · 나사 y 0.47~1.17 · 실린 칠 24개가 다 다름', () => {
    const order = (x: string) => { const [w, b] = x.split('-').map(Number); return w * 100 + b; };
    STAGES.forEach((d, k) => {
      expect(d.slot, `${k + 1}판 자리`).toMatch(/^[1-3]-([1-9]|10)$/);
      if (k) expect(order(d.slot), `${d.slot} 자리 순`).toBeGreaterThan(order(STAGES[k - 1].slot));
      expect(new Set(PICKS[d.id]).size, `${d.slot} 실린 칠 다름`).toBe(N);
      if (d.id < 8) return; // M1′ 8판은 그대로(지문)
      const L = paintStage(k, PICKS[d.id][0]);
      expect([L.N >= 12 && L.N <= 18, d.colors >= 3 && d.colors <= 6, d.boxes], `${d.slot} N ${L.N} · 색 ${d.colors} · 상자`).toEqual([true, true, 2]);
      expect([Math.min(...L.py) >= 0.47, Math.max(...L.py) <= 1.17], `${d.slot} 나사 높이`).toEqual([true, true]);
    });
  });
  it('판 검증: 실린 판마다 실린 칠 24개 전부에 장인 ★3 수순이 있다(장인 봇이 ★3 — 📋 M2 \'판 검증 테스트\')', () => {
    for (let k = 0; k < STAGES.length; k++)
      for (let p = 0; p < N; p++) expect(tryStage(screwshopSmart, N * 50 + p, k).stars, `${STAGES[k].slot} 칠 ${PICKS[STAGES[k].id][p]}`).toBe(3);
  });
  it('게임이 싣는 칠 = PICKS[id][seed % N] (시드 1..N, 판마다)', () => {
    for (let k = 0; k < STAGES.length; k++)
      for (let seed = 1; seed <= N; seed++) {
        const s = g.create(seed);
        startStage(s, k);
        expect(paintSig(s.L), `${k + 1}판 시드 ${seed}`).toBe(SIG[STAGES[k].id].p[seed % N][2]);
      }
  });
});
