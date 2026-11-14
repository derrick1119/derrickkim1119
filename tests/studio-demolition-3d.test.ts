/** 스튜디오 비버 철거반 3D 칸 물리 (C002, 재수립 1차): 깊이 1 = 2D 회귀 · 결정성 · 미리 보기 = 실제 · 4방향 넘어짐 · 깔림 · 26칸 가스 */
import { describe, expect, it } from 'vitest';
import { STAGES, layoutOf, simulate } from '../studio/demolition/game.ts';
import { STAGES3 } from '../studio/demolition/stages3d.ts';
import { cellPx, fitCams, visibleArea, YAW0 } from '../studio/demolition/view3d.ts';
import { fingerHit, measureStage3, plansOf } from '../studio/demolition/funqa.ts';
import { GAS, STONE, bestReach, fireworksFor, capOf3, holdTags, isQuiet, resultLine, lostFeet, support3, verdict3, forEachPlan, from2D, layoutOf3, simulate3, type StageDef3 } from '../studio/demolition/sim3d.ts';

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
    // 다리 = 기둥(x,z)마다 붙일 수 있는 가장 낮은 블록(C013: 뒤오른 받침이 쇠가 되어 그 기둥은 위 칸을 끊는다) — 단언은 그대로
    const L = layoutOf3(STAGES3.find((d) => d.key === 'tip4')!);
    const id = (x: number, z: number) => L.blocks.reduce((best, b, i) => (b.x === x && b.z === z && capOf3(b) > 0 && (best < 0 || b.y < L.blocks[best].y) ? i : best), -1);
    const run = (a: [number, number], b: [number, number]) => {
      const ch = new Int8Array(L.blocks.length);
      ch[id(...a)] = capOf3(L.blocks[id(...a)]);
      ch[id(...b)] = capOf3(L.blocks[id(...b)]);
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
      // F14 v1.2 ⓓ: 4시점 모두 σ16px 적중 < .5인 '못 누르는 블록'도 없다
      expect(taps.filter((i) => cams.every((c) => fingerHit(c, L, i, 100).hit < 0.5))).toEqual([]);
      expect(cellPx(cams[0])).toBeGreaterThanOrEqual(36);
      expect(cams[0].s * Math.sin(YAW0)).toBeGreaterThanOrEqual(16);
      expect(d.goal).toBeLessThan(L.blocks.reduce((a, b) => Math.max(a, b.y + 1), 0)); // 탑이 서 있는데 '성공'이 되면 안 된다 (C004에 찾은 허점)
      let best = 0;
      plansOf(L, d, (ch) => void (best = Math.max(best, simulate3(L, ch).ok ? simulate3(L, ch).stars : 0))); // 손잡이 판은 1개~주는 수
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

  it('F4b-0(FUN v1.3): 무변화 첫 톡에는 \'변화 없음\', 움직이거나 받침을 잃는 첫 톡에는 안 뜬다 — 시점과 무관(시뮬 좌표만)', () => {
    for (const d of STAGES3) {
      const L = layoutOf3(d), none = new Int8Array(L.blocks.length), now = support3(L, none);
      L.blocks.forEach((b, i) => {
        if (!capOf3(b)) return;
        const c1 = none.slice();
        c1[i] = capOf3(b);
        const moved = simulate3(L, c1).moved, lost = lostFeet(now, support3(L, c1)).length;
        if (moved || lost) expect(isQuiet(L, none, i)).toBe(false);
      });
    }
    // 1-2 마루 안쪽(받침 그대로) = 무변화
    const L = layoutOf3(STAGES3.find((d) => d.key === 'tip4')!), none = new Int8Array(L.blocks.length);
    expect(isQuiet(L, none, L.blocks.findIndex((b) => b.x === 7 && b.y === 2 && b.z === 7))).toBe(true);
  });

  it('마지막 폭약 꾹 = 결과 꼬리표: 실패 계획엔 늘 실패 글(꿈쩍 안 함 · 이웃집 · 아직 높아요), 성공엔 별 (F4b ⓑ · 2D 판정 말풍선과 같은 정보)', () => {
    for (const d of STAGES3) {
      const L = layoutOf3(d);
      forEachPlan(L, d.charges, (ch) => {
        const o = simulate3(L, ch), v = verdict3(L, o);
        expect(v.ok).toBe(o.ok);
        if (!o.ok) expect(v.text).toMatch(/꿈쩍 안 함|이웃집|아직 높아요/);
        else expect(v.text).toContain('★'.repeat(o.stars));
      });
    }
  });

  // 판마다 따로(C010: 한 테스트에 판 넷을 몰아 재면 CI 일꾼이 오래 묶여 vitest 통신 시간 초과가 났다) · 봇 몬테카를로는 빼고 F11만
  for (const d of STAGES3)
    it(`손가락 적중(FUN v1.3 F11, σ16px · 말풍선 보고 한 번 고쳐 누름 · 가려진 시점은 ⟳) ${d.title}: 평균 ≥ .9 · 취소 ≤ .03 · 블록별 ≥ .9 (n200 — 게이트는 funqa --n1000)`, () => {
      const m = measureStage3(d, { bots: false });
      expect(m.f11, d.title).toBeGreaterThanOrEqual(0.9);
      expect(m.f11miss, d.title).toBeLessThanOrEqual(0.03);
      expect(m.f11min, `${d.title} ${m.f11minAt}`).toBeGreaterThanOrEqual(0.9);
    }, 60000);
});

describe('꼬리표 규칙 holdTags (🧪 C007 ④ · 시험 빚 ③)', () => {
  it('붙인 블록 = 떼기, 결과 꼬리표 없음', () => {
    expect(holdTags(2, 2, 1, true)).toEqual({ result: false, block: '떼기' });
    expect(holdTags(2, 2, 0, false)).toEqual({ result: false, block: '떼기' });
  });
  it('마지막 폭약 = 결과 꼬리표 · 무변화여도 블록 꼬리표는 겹쳐 띄우지 않음', () => {
    expect(holdTags(2, 0, 2, true)).toEqual({ result: true, block: null });
    expect(holdTags(2, 0, 1, false)).toEqual({ result: true, block: null });
  });
  it('마지막이 아닌 무변화 = 변화 없음 · 변화 있으면 꼬리표 없음', () => {
    expect(holdTags(2, 0, 4, true)).toEqual({ result: false, block: '변화 없음' });
    expect(holdTags(2, 0, 4, false)).toEqual({ result: false, block: null });
  });
  it('판마다: 마지막 폭약 겨눔은 늘 결과 꼬리표, 첫 폭약 무변화 블록은 변화 없음(isQuiet와 같은 판단)', () => {
    for (const d of STAGES3) {
      const L = layoutOf3(d), ch = new Int8Array(L.blocks.length);
      for (let i = 0; i < L.blocks.length; i++) {
        const cap = capOf3(L.blocks[i]);
        if (!cap) continue;
        const c1 = new Int8Array(L.blocks.length);
        c1[i] = cap;
        const moved = simulate3(L, c1).moved, save = d.save !== undefined;
        const t = holdTags(cap, 0, cap * d.charges, isQuiet(L, ch, i), save, moved);
        expect(t.result, d.title).toBe(d.charges === 1 || (save && moved)); // 손잡이 판은 움직이면 결과 꼬리표(📐 C008)
        if (d.charges > 1 && !t.result) expect(t.block === '변화 없음', `${d.title} #${i}`).toBe(isQuiet(L, ch, i));
      }
    }
  });
});

describe('기폭 손잡이·아끼기 엔진 (📐 GDD §4 A안 · C008)', () => {
  const d12 = STAGES3.find((d) => d.key === 'tip4')!;
  it('아끼기 별: save 판은 ★3 = 쓴 폭약 ≤ 반장 목표 · ★2까지, save 없는 판은 ★3 = 납작 그대로', () => {
    const L0 = layoutOf3(d12), Ls = layoutOf3({ ...d12, charges: 3, save: 2 }), Lt = layoutOf3({ ...d12, charges: 3, save: 1 });
    let seen = 0;
    forEachPlan(L0, 2, (ch) => {
      const a = simulate3(L0, ch), b = simulate3(Ls, ch), c = simulate3(Lt, ch);
      expect(b.ok).toBe(a.ok); // 물리는 그대로
      expect(b.star[2]).toBe(a.ok && a.flowers === 0); // 2개 ≤ 목표 2
      expect(c.star[2]).toBe(false); // 2개 > 목표 1
      expect(a.star[2]).toBe(a.ok && a.height <= L0.flat);
      if (b.star[2]) seen++;
    });
    expect(seen).toBeGreaterThan(0);
  });
  it('손잡이 판 규칙(📐 C008): 폭약 1개 계획은 ★3 금지 · ★3은 반장 목표 이하로만 · 3개를 다 쓰면 ★3 없음', () => {
    for (const d of STAGES3.filter((x) => x.save !== undefined)) {
      const L = layoutOf3(d);
      let s3 = 0;
      for (let k = 1; k <= d.charges; k++)
        forEachPlan(L, k, (ch) => {
          const o = simulate3(L, ch);
          if (k === 1) expect(o.stars === 3, `${d.title} 단발`).toBe(false);
          if (k > d.save!) expect(o.star[2], `${d.title} ${k}개`).toBe(false);
          if (o.stars === 3) s3++;
        });
      expect(s3, d.title).toBeGreaterThan(0);
    }
    expect(STAGES3.some((d) => d.save !== undefined)).toBe(true);
  });
  it('holdTags 손잡이 판: 움직이는 겨눔이면 마지막 폭약이 아니어도 결과 꼬리표, 안 움직이면 변화 없음 그대로', () => {
    expect(holdTags(1, 0, 3, false, true, true)).toEqual({ result: true, block: null });
    expect(holdTags(1, 0, 3, true, true, false)).toEqual({ result: false, block: '변화 없음' });
    expect(holdTags(1, 0, 3, false, false, true)).toEqual({ result: false, block: null });
  });
  it('bestReach = 남은 폭약으로 갈 수 있는 최고 별(자동 쾅 판: 남은 걸 다 씀 · 손잡이 판: 아무 때나)', () => {
    const L = layoutOf3(d12), n = L.blocks.length;
    expect(bestReach(L, new Int8Array(n))).toBe(3);
    for (let i = 0; i < n; i++) {
      if (!capOf3(L.blocks[i])) continue;
      const ch = new Int8Array(n);
      ch[i] = capOf3(L.blocks[i]);
      let best = 0;
      forEachPlan(L, 2, (c2) => {
        if (!c2[i]) return;
        const o = simulate3(L, c2);
        if (o.ok) best = Math.max(best, o.stars);
      });
      expect(bestReach(L, ch), `#${i}`).toBe(best);
      expect(bestReach(L, ch, 1) > 0, `#${i} 막다른 길`).toBe(best > 0);
      // 손잡이 판이면 지금 바로 쾅(한 개)도 길에 들어간다
      const Lh = layoutOf3({ ...d12, charges: 2, save: 2 }), one = simulate3(Lh, ch);
      expect(bestReach(Lh, ch)).toBeGreaterThanOrEqual(one.ok ? one.stars : 0);
    }
  });
});

describe('결과 글 — 딴 별·잃은 별 이유 (FUN v1.4 ⓔ)', () => {
  it('손잡이 판 ★3이면 아낀 이유, ★★☆면 목표 수, 꽃밭이면 꽃밭 · 손잡이 없는 판은 납작 이유', () => {
    let saw3 = 0, saw2 = 0;
    for (const d of STAGES3) {
      const L = layoutOf3(d);
      plansOf(L, d, (ch) => {
        const o = simulate3(L, ch), used = ch.reduce((a, v) => a + v, 0), t = resultLine(L, o, used);
        expect(t.startsWith(verdict3(L, o).text)).toBe(true);
        if (!o.ok) return;
        if (o.stars === 3 && d.save !== undefined) (saw3++, expect(t, d.title).toMatch(/아(꼈어요|껴 썼어요)/));
        if (o.stars < 3 && !o.star[1]) expect(t).toContain('꽃밭을 덮었어요');
        if (o.stars < 3 && o.star[1]) (saw2++, expect(t).toContain(d.save !== undefined ? `폭약 ${d.save}개로 깨면 ★` : '더 낮게'));
      });
    }
    expect(saw3).toBeGreaterThan(0);
    expect(saw2).toBeGreaterThan(0);
  });
});

describe('새 규칙 표식이 시작 시점에 보인다 (FUN v1.6 ⓒ)', () => {
  it('새 재료(돌·가스)를 처음 쓰는 판은 그 재료 블록이 시작 시점에 면 ≥ .5장으로 1개 이상 보인다', () => {
    const seen = new Set<number>();
    let checked = 0;
    for (const d of STAGES3) {
      const L = layoutOf3(d), cams = fitCams(L.lot, L.blocks, 390, 468, 12), area = visibleArea(cams[0], L.blocks, 390, 468, 2), face = cellPx(cams[0]) ** 2;
      for (const m of [STONE, GAS]) {
        if (seen.has(m) || !L.blocks.some((b) => b.m === m)) continue;
        checked++;
        expect(L.blocks.some((b, i) => b.m === m && area[i] >= 0.5 * face), `${d.title} 재료 ${m}`).toBe(true);
      }
      L.blocks.forEach((b) => seen.add(b.m));
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('축포 (🧪 C012 ④-1)', () => {
  it('손잡이 판에서 꽃 별까지 지킨 성공(★2·★3)만 아낀 폭약 수만큼 — 꽃밭을 덮은 ★1·실패·손잡이 없는 판은 0', () => {
    let saw = 0;
    for (const d of STAGES3) {
      const L = layoutOf3(d);
      plansOf(L, d, (ch) => {
        const o = simulate3(L, ch), left = d.charges - ch.reduce((a, v) => a + v, 0), n = fireworksFor(L, o, left);
        if (d.save === undefined || !o.ok || !o.star[1]) expect(n).toBe(0);
        else (expect(n).toBe(left), (saw += n > 0 ? 1 : 0));
      });
    }
    expect(saw).toBeGreaterThan(0);
  });
});
