/** 스튜디오 비버 철거반 3D 칸 물리 (C002, 재수립 1차): 깊이 1 = 2D 회귀 · 결정성 · 미리 보기 = 실제 · 4방향 넘어짐 · 깔림 · 26칸 가스 */
import { describe, expect, it } from 'vitest';
import { STAGES, layoutOf, simulate } from '../studio/demolition/game.ts';
import { GAS, forEachPlan, from2D, layoutOf3, simulate3, type StageDef3 } from '../studio/demolition/sim3d.ts';

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
      expect(o.diagTies).toBe(0);
    }
  });

  it('대각 동률(무게중심이 두 축으로 똑같이 넘침)은 세어 둔다 — 판 검증기가 0건으로 막을 것', () => {
    // 3×3 판을 한 귀퉁이 다리 하나가 받친다: 무게중심 (2.4, 2.4)가 받침 [1,2]×[1,2] 밖으로 x·z 똑같이 0.4 넘친다
    const d = stage([
      ['.....', '.w...', '.....', '.....', '.....'],
      ['.....', '.www.', '.www.', '.www.', '.....'],
    ], { lot: { x0: 0, x1: 4, z0: 0, z1: 4 } });
    const L = layoutOf3(d), r = simulate3(L, new Int8Array(L.blocks.length));
    expect(r.diagTies).toBe(1);
    expect(r.tips[0].axis).toBe(0);
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
});
