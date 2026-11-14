/** 스튜디오 비버 철거반 3D 칸 물리 (C002, 재수립 1차): 깊이 1 = 2D 회귀 · 결정성 · 미리 보기 = 실제 · 4방향 넘어짐 · 깔림 · 26칸 가스 */
import { describe, expect, it } from 'vitest';
import { STAGES, layoutOf, simulate } from '../studio/demolition/game.ts';
import { STAGES3 } from '../studio/demolition/stages3d.ts';
import { cellPx, fitCams, visibleArea, YAW0 } from '../studio/demolition/view3d.ts';
import { GAS, capOf3, forEachPlan, from2D, layoutOf3, simulate3, type StageDef3 } from '../studio/demolition/sim3d.ts';

const stage = (layers: string[][], extra: Partial<StageDef3> = {}): StageDef3 => ({
  key: '', title: 't', news: '', hint: '', W: layers[0][0].length, D: layers[0].length, layers,
  lot: { x0: 1, x1: layers[0][0].length - 2, z0: 1, z1: layers[0].length - 2 }, goal: 9, flat: 9, flowers: [], charges: 1, ...extra,
});
const fire = (d: StageDef3, at: [number, number, number][], rec = false) => {
  const L = layoutOf3(d), ch = new Int8Array(L.blocks.length);
  for (const [x, y, z] of at) ch[L.blocks.findIndex((b) => b.x === x && b.y === y && b.z === z)]++;
  return { L, o: simulate3(L, ch, rec) };
};

describe('3D 칸 물리', () => {
  it('깊이 1짜리 판은 2D와 모든 폭약 계획에서 똑같이 무너진다 (8판 전부)', () => {
    let plans = 0;
    for (const d of STAGES) {
      const L2 = layoutOf(d, false), L3 = layoutOf3(from2D(d));
      expect(L3.blocks.map((b) => [b.x, b.y, b.m])).toEqual(L2.blocks.map((b) => [b.x, b.y, b.m]));
      forEachPlan(L3, d.charges, (ch) => {
        const a = simulate(L2, ch), b = simulate3(L3, ch);
        plans++;
        expect([b.ok, b.stars, b.height, b.flowers, b.falls, b.crushes, b.hits[0], b.hits[1], b.moved]).toEqual([a.ok, a.stars, a.height, a.flowers, a.falls, a.crushes, a.hitL, a.hitR, a.moved]);
        expect(Array.from(b.fx)).toEqual(Array.from(a.fx));
        expect(Array.from(b.fy)).toEqual(Array.from(a.fy));
        expect(Array.from(b.die)).toEqual(Array.from(a.die));
        expect(b.end).toBe(a.end);
      });
    }
    expect(plans).toBeGreaterThan(400);
  });

  // 가운데 x=3에 2×2 다리 넷 위로 판(2층)과 탑, 앞뒤좌우로 넘어질 수 있는 망루
  const tower = (): StageDef3 => stage([
    ['.......', '.......', '..w.w..', '.......', '..w.w..', '.......', '.......'],
    ['.......', '.......', '..w.w..', '.......', '..w.w..', '.......', '.......'],
    ['.......', '.......', '..ppp..', '..ppp..', '..ppp..', '.......', '.......'],
    ['.......', '.......', '..ppp..', '..ppp..', '..ppp..', '.......', '.......'],
  ], { lot: { x0: 0, x1: 6, z0: 0, z1: 6 } });

  it('네 다리 망루: 앞·뒤·좌·우 다리 둘을 끊으면 그쪽으로 넘어진다 (4방향)', () => {
    const cases: [[number, number, number][], number, number][] = [
      [[[4, 0, 2], [4, 0, 4]], 0, 1], // 오른쪽(x+) 다리 둘 → x+
      [[[2, 0, 2], [2, 0, 4]], 0, -1], // 왼쪽 → x−
      [[[2, 0, 4], [4, 0, 4]], 1, 1], // 뒤(z+) → z+
      [[[2, 0, 2], [4, 0, 2]], 1, -1], // 앞 → z−
    ];
    for (const [at, axis, dir] of cases) {
      const { o } = fire(tower(), at);
      expect(o.tips.length).toBe(1);
      expect([o.tips[0].axis, o.tips[0].dir]).toEqual([axis, dir]);
      expect(o.slumps).toBe(0);
    }
  });

  it('모서리 하나로 서면(무게중심이 두 축으로 다 넘침) 넘어지지 않고 제자리에서 주저앉는다 (📐 §10.1)', () => {
    // 3×3 판을 한 귀퉁이 다리 하나가 받친다: 무게중심 (2.4, 2.4)가 받침 [1,2]×[1,2] 밖으로 x·z 둘 다 넘친다
    const d = stage([
      ['.....', '.w...', '.....', '.....', '.....'],
      ['.....', '.www.', '.www.', '.www.', '.....'],
    ], { lot: { x0: 0, x1: 4, z0: 0, z1: 4 } });
    const L = layoutOf3(d), r = simulate3(L, new Int8Array(L.blocks.length));
    expect([r.slumps, r.tips.length, r.moved]).toEqual([1, 0, true]);
    expect(r.hits).toEqual([0, 0, 0, 0]);
  });

  it('같은 폭약이면 rec 유무와 상관없이 결과가 같다 (미리 보기 = 실제) · 두 번 돌려도 같다', () => {
    const at: [number, number, number][] = [[4, 0, 2], [4, 0, 4]];
    const a = fire(tower(), at).o, b = fire(tower(), at, true).o, c = fire(tower(), at).o;
    for (const o of [b, c]) expect([o.ok, o.stars, o.height, Array.from(o.fx), Array.from(o.fz), Array.from(o.fy)]).toEqual([a.ok, a.stars, a.height, Array.from(a.fx), Array.from(a.fz), Array.from(a.fy)]);
    expect(b.segs!.some((s) => s.some((g) => g.k === 1 && g.axis === 0))).toBe(true);
  });

  it('뒤로 넘어진 탑이 빨간 선 뒤(z+) 밖으로 나가면 그 면이 맞았다고 센다', () => {
    const d = tower();
    d.lot = { x0: 0, x1: 6, z0: 0, z1: 5 };
    const { o } = fire(d, [[2, 0, 4], [4, 0, 4]]);
    expect(o.hits[3]).toBeGreaterThan(0);
    expect(o.ok).toBe(false);
  });

  it('가스통은 둘레 26칸(앞뒤 층 포함)에 폭약 하나씩', () => {
    const full = ['www', 'www', 'www'];
    const d = stage([full, ['www', 'wGw', 'www'], full], { lot: { x0: 0, x1: 2, z0: 0, z1: 2 } });
    const L = layoutOf3(d), ch = new Int8Array(L.blocks.length);
    ch[L.blocks.findIndex((b) => b.m === GAS)] = 1;
    const o = simulate3(L, ch);
    expect(Array.from(o.die).filter((t, i) => t >= 0 && t <= 10 && !o.dust[i]).length).toBe(27); // 가스 0틱 + 둘레 26칸 10틱
    expect(o.height).toBe(0);
  });

  it('무거운 탑이 넘어져 옆 집(가볍거나 같음)을 치면 같이 와르르 (깔림)', () => {
    const dom = stage([
      ['........', '.ww..yy.', '........'],
      ['........', '.ww..yy.', '........'],
      ['........', '.pp..yy.', '........'],
      ['........', '.pp.....', '........'],
      ['........', '.ppp....', '........'],
      ['........', '.pppp...', '........'],
    ], { lot: { x0: 0, x1: 7, z0: 0, z1: 2 } });
    const { o } = fire(dom, [[2, 0, 1], [2, 1, 1]]);
    expect(o.tips.length).toBeGreaterThan(0);
    expect([o.tips[0].axis, o.tips[0].dir]).toEqual([0, 1]);
    expect(o.crushes).toBeGreaterThan(0);
  });

  it('1-2 네 다리 망루(C004 5×5판): 앞 두 다리 = ★3 · 왼쪽 = 꽃밭(★2) · 오른쪽·뒤 = 이웃집 · 대각 = 꿈쩍 안 함', () => {
    const L = layoutOf3(STAGES3.find((d) => d.key === 'tip4')!), id = (x: number, z: number) => L.blocks.findIndex((b) => b.x === x && b.y === 0 && b.z === z);
    const run = (a: [number, number], b: [number, number]) => {
      const ch = new Int8Array(L.blocks.length);
      ch[id(...a)]++;
      ch[id(...b)]++;
      return simulate3(L, ch);
    };
    const front = run([6, 6], [8, 6]), left = run([6, 6], [6, 8]), right = run([8, 6], [8, 8]), back = run([6, 8], [8, 8]);
    expect([front.stars, front.tips[0].axis, front.tips[0].dir]).toEqual([3, 1, -1]);
    expect([left.ok, left.flowers > 0, left.stars, left.tips[0].axis, left.tips[0].dir]).toEqual([true, true, 2, 0, -1]);
    expect([right.ok, right.hits[1] > 0, back.ok, back.hits[3] > 0]).toEqual([false, true, false, true]);
    expect([run([6, 6], [8, 8]).moved, run([8, 6], [6, 8]).moved]).toEqual([false, false]);
  });

  it('판 검증(FUN F14·F12 · 📋 C003): 울타리 ≤ 6×6 · 붙일 블록 ≤ 24 · 속 블록 0 · 칸 ≥ 36px · 옆면 ≥ 16px · 목표 높이 < 건물 높이 · 박사 ★3 가능', () => {
    for (const d of STAGES3) {
      const L = layoutOf3(d);
      expect(L.lot.x1 - L.lot.x0 + 1).toBeLessThanOrEqual(6);
      expect(L.lot.z1 - L.lot.z0 + 1).toBeLessThanOrEqual(6);
      const taps = L.blocks.map((_, i) => i).filter((i) => capOf3(L.blocks[i]) > 0);
      expect(taps.length).toBeLessThanOrEqual(24);
      const cams = fitCams(L.lot, L.blocks, 390, 468, 12), area = cams.map((c) => visibleArea(c, L.blocks, 390, 468, 2));
      expect(taps.filter((i) => area.every((a) => a[i] === 0))).toEqual([]);
      expect(cellPx(cams[0])).toBeGreaterThanOrEqual(36);
      expect(cams[0].s * Math.sin(YAW0)).toBeGreaterThanOrEqual(16);
      expect(d.goal).toBeLessThan(L.blocks.reduce((a, b) => Math.max(a, b.y + 1), 0)); // 탑이 서 있는데 '성공'이 되면 안 된다 (C004에 찾은 허점)
      let best = 0;
      forEachPlan(L, d.charges, (ch) => void (best = Math.max(best, simulate3(L, ch).ok ? simulate3(L, ch).stars : 0)));
      expect(best).toBe(3);
    }
  });

  it('1-1 물탱크 탑: 기둥 어디를 톡 해도 성공한다 (못 지는 판, FUN F3)', () => {
    const d = STAGES3[0], L = layoutOf3(d);
    expect(d.charges).toBe(1);
    for (let i = 0; i < L.blocks.length; i++) {
      if (!capOf3(L.blocks[i])) continue;
      const ch = new Int8Array(L.blocks.length);
      ch[i] = capOf3(L.blocks[i]);
      expect(simulate3(L, ch).ok).toBe(true);
    }
  });
});
