/** 스튜디오 비버 철거반 3D 화면 계산 (C003): 고르기 = 보이는 것 · 시점 4개 · 시작 시점(앞왼)에서 1-2 ★3 블록이 보인다 · 발자국 = 시뮬 첫 판정 · 실험 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { capOf3, forEachPlan, layoutOf3, simulate3, support3 } from '../studio/demolition/sim3d.ts';
import { STAGES3 } from '../studio/demolition/stages3d.ts';
import { aimAt, cellPx, drawOrder, faces, fitCams, pickAt, proj, visibleArea, yawOf } from '../studio/demolition/view3d.ts';

const L = layoutOf3(STAGES3.find((d) => d.key === 'tip4')!);
const cams = fitCams(L.lot, L.blocks, 390, 468, 12);

describe('3D 화면 계산', () => {
  it('시점 0 = 앞왼(25°), 네 번 돌리면 제자리 · 4시점 줌이 같다', () => {
    expect(yawOf(0)).toBeCloseTo((25 * Math.PI) / 180);
    expect(Math.cos(yawOf(4))).toBeCloseTo(Math.cos(yawOf(0)));
    expect(new Set(cams.map((c) => c.s.toFixed(6))).size).toBe(1);
    // 앞왼 시점: 앞면(z−)과 왼면(x−)이 보인다
    expect(faces(cams[0], { x: 0, y: 0, z: 0 }).map((f) => f.f).sort()).toEqual(['top', 'xm', 'zm']);
  });

  it('보이는 면 가운데를 누르면 그 블록이 골라진다 — 그리고 앞 블록이 뒤 블록을 가린다', () => {
    for (const c of cams) {
      const order = drawOrder(c, L.blocks);
      let checked = 0;
      L.blocks.forEach((b, i) => {
        for (const fc of faces(c, b)) {
          const mx = fc.pts.reduce((a, p) => a + p[0], 0) / 4, my = fc.pts.reduce((a, p) => a + p[1], 0) / 4;
          const hit = pickAt(c, L.blocks, mx, my, order);
          // 골라진 블록은 그 자리에서 이 블록보다 가깝거나 같은 것
          const di = proj(c, b.x + 0.5, b.y + 0.5, b.z + 0.5)[2], dh = proj(c, L.blocks[hit].x + 0.5, L.blocks[hit].y + 0.5, L.blocks[hit].z + 0.5)[2];
          expect(dh).toBeLessThanOrEqual(di + 1e-9);
          if (hit === i) checked++;
        }
      });
      expect(checked).toBeGreaterThan(10);
    }
    // 두 블록이 앞뒤로 겹치면 앞 블록이 골라진다
    const two = [{ x: 3, y: 0, z: 3 }, { x: 3, y: 0, z: 4 }];
    const c = fitCams({ x0: 0, x1: 7, z0: 0, z1: 7 }, two, 390, 468)[0];
    const p = proj(c, 3.5, 0.5, 3.0); // 앞 블록 앞면 가운데
    expect(pickAt(c, two, p[0], p[1])).toBe(0);
  });

  it('8가지 보기(시점 4 × 거울 2)에서 보이는 블록의 면 가운데를 누르면 그 블록 — 거울은 그리기·입력 변환뿐이라 시뮬은 그대로 (④ · C004)', () => {
    for (const d of STAGES3) {
      const L2 = layoutOf3(d), base = fitCams(L2.lot, L2.blocks, 390, 468, 12);
      for (const c0 of base)
        for (const mir of [false, true]) {
          const c = { ...c0, mir, ox: mir ? 390 - c0.ox : c0.ox }, order = drawOrder(c, L2.blocks);
          let self = 0;
          L2.blocks.forEach((b, i) => {
            for (const fc of faces(c, b)) {
              const mx = fc.pts.reduce((a, p) => a + p[0], 0) / 4, my = fc.pts.reduce((a, p) => a + p[1], 0) / 4;
              const hit = pickAt(c, L2.blocks, mx, my, order);
              expect(hit).toBeGreaterThanOrEqual(0);
              if (hit === i) self++;
            }
          });
          expect(self).toBeGreaterThan(L2.blocks.length / 2);
          // 화면 안에 다 들어온다
          for (const b of L2.blocks) for (const fc of faces(c, b)) for (const [x, y] of fc.pts) expect(x >= -1 && x <= 391 && y >= -1 && y <= 469).toBe(true);
        }
    }
  });

  it('자석 겨누기: 빈 땅을 눌러도 0.9칸 안의 붙일 블록에 붙는다, 멀면 -1', () => {
    const c = cams[0], i = L.blocks.findIndex((b) => b.x === 6 && b.y === 0 && b.z === 6);
    const fc = faces(c, L.blocks[i]).find((f) => f.f === 'zm')!;
    const mx = fc.pts.reduce((a, p) => a + p[0], 0) / 4, my = fc.pts.reduce((a, p) => a + p[1], 0) / 4;
    expect(aimAt(c, L.blocks, (j) => capOf3(L.blocks[j]) > 0, mx, my + c.s * 0.6)).toBeGreaterThanOrEqual(0);
    expect(aimAt(c, L.blocks, (j) => capOf3(L.blocks[j]) > 0, 2, 2)).toBe(-1);
  });

  it('시작 시점(앞왼)에서 1-2의 ★3 계획 하나는 블록마다 면 반 장 이상 보인다 (FUN F13 — 회전 없이 ★3)', () => {
    const area = visibleArea(cams[0], L.blocks, 390, 468, 2), face = cellPx(cams[0]) ** 2;
    let best = 0;
    forEachPlan(L, L.charges, (ch, plan) => {
      if (simulate3(L, ch).stars === 3) best = Math.max(best, Math.min(...plan.map((i) => area[i] / face)));
    });
    expect(best).toBeGreaterThanOrEqual(0.5);
  });

  it('발자국(support3)은 시뮬레이션의 첫 판정과 같다: 넘어짐 축·방향 · 주저앉음 · 꿈쩍 안 함 (1-2 모든 두 폭약 계획)', () => {
    let tips = 0;
    forEachPlan(L, 2, (ch) => {
      const f = support3(L, ch), o = simulate3(L, ch);
      const fTips = f.filter((x) => x.act === 'tip').map((x) => `${x.axis}${x.dir}`).sort(), fFall = f.some((x) => x.act === 'fall');
      if (!fFall) {
        expect(o.tips.slice(0, fTips.length).map((t) => `${t.axis}${t.dir}`).sort()).toEqual(fTips);
        expect(f.some((x) => x.act === 'slump')).toBe(o.slumps > 0);
      }
      if (f.every((x) => x.act === 'stand')) expect(o.moved).toBe(false);
      tips += fTips.length;
    });
    expect(tips).toBeGreaterThan(20);
  });

  it('3D 실험 빌드 3d.html이 있고 gzip 30KB 이하', () => {
    const p = 'web/public/studio/demolition/3d.html';
    expect(existsSync(p)).toBe(true);
    const html = readFileSync(p, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(30 * 1024);
  });
});
