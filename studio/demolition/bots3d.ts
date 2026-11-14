/**
 * 3D 봇 (FUN v1.4, 📋 C008 → C009): 처음 봇 v1.4 ⓐ · look2(F9) · 버릇 봇(F10) · 꼭 필요한 톡(F4b ⓒ·F5 ⓑ).
 * 모두 결정적(시드 고정). 봇은 블록 번호로 움직이고, 처음 봇만 화면 넓이(시점 0 ¾ + ⟲ 한 시점 ¼)로 고른다.
 */
import { mulberry32 } from '../../engine/rng.ts';
import { bestReach, capOf3, forEachPlan, simulate3, type Layout3, type Outcome3, type StageDef3 } from './sim3d.ts';

/** 같은 폭약 상태는 한 번만 시뮬(봇들이 같은 상태를 자주 다시 본다) */
export function simCache(L: Layout3) {
  const m = new Map<string, Outcome3>(), r = new Map<string, number>();
  return {
    sim: (ch: Int8Array) => {
      const k = ch.join('');
      let o = m.get(k);
      if (!o) m.set(k, (o = simulate3(L, ch)));
      return o;
    },
    reach1: (ch: Int8Array) => {
      const k = ch.join('');
      let v = r.get(k);
      if (v === undefined) r.set(k, (v = bestReach(L, ch, 1)));
      return v;
    },
  };
}
type Cache = ReturnType<typeof simCache>;

/** 계획 모두: 손잡이 판(save)은 폭약 1개~주는 수까지, 아니면 주는 수를 다 써야 쾅 */
export function plansOf(L: Layout3, d: StageDef3, f: (ch: Int8Array, plan: number[]) => void) {
  // 돌 반쪽(폭약 1개만 붙은 돌)은 게임에서 둘 수 없는 계획이라 뺀다(📐 C010: F7·꼭 필요한 톡이 부풀었다)
  const whole = (ch: Int8Array) => ch.every((v, i) => !v || v === capOf3(L.blocks[i]));
  for (let k = d.save !== undefined ? 1 : d.charges; k <= d.charges; k++) forEachPlan(L, k, (ch, plan) => whole(ch) && f(ch, plan));
}

/**
 * 처음 봇 v1.4 ⓐ — 한 판 시도의 성공 확률(몬테카를로 n회).
 * prev(미리 보기형): 수마다 넓이 비례로 꾹 3번, 화면에 그려진 것만 본다 — 성공 결과 꼬리표가 뜬 블록 > 무엇이든 움직이는 블록(실패 꼬리표 빼고) > 나머지.
 * blind(안 보는 형): 넓이 비례로 아무 데나. 둘 다 글은 읽는다 — 손잡이 둘째 줄이 성공이면 당기고, '막다른 길'이면 q .5로 방금 붙인 것을 뗀다.
 */
export function firstTimer(L: Layout3, d: StageDef3, wMix: number[], mode: 'prev' | 'blind', n: number, c: Cache, seed = 20, out?: { star3: number }, opt: { stopAt?: number; noEarly?: boolean } = {}): number {
  const rng = mulberry32(seed), N = L.blocks.length, save = d.save !== undefined;
  const taps = L.blocks.map((_, i) => i).filter((i) => capOf3(L.blocks[i]) > 0);
  const wpick = (cs: number[]) => {
    const t = cs.reduce((a, i) => a + wMix[i], 0);
    let x = rng() * t;
    for (const i of cs) if ((x -= wMix[i]) <= 0) return i;
    return cs[cs.length - 1];
  };
  let win = 0, s3 = 0;
  for (let run = 0; run < n; run++) {
    const ch = new Int8Array(N);
    let left = d.charges, ok = false;
    for (let step = 0; step < 12; step++) {
      const cs = taps.filter((i) => !ch[i] && capOf3(L.blocks[i]) <= left && wMix[i] > 0);
      if (!cs.length) break;
      let pick = wpick(cs);
      if (mode === 'prev') {
        const seen = [pick, wpick(cs), wpick(cs)].map((i) => {
          const c2 = ch.slice();
          c2[i] = capOf3(L.blocks[i]);
          const o = c.sim(c2), tag = capOf3(L.blocks[i]) >= left || (save && o.moved);
          return { i, o, tag };
        });
        pick = (seen.find((s) => s.tag && s.o.ok) ?? seen.find((s) => s.o.moved && !s.tag) ?? seen.find((s) => !s.tag) ?? seen[0]).i;
      }
      ch[pick] = capOf3(L.blocks[pick]);
      left -= ch[pick];
      if (left <= 0 || (opt.stopAt !== undefined && d.charges - left >= opt.stopAt)) {
        ok = c.sim(ch).ok; // 다 붙였거나(자동 쾅) 정한 수에서 손잡이(v1.7 ⓕ 비교용)
        break;
      }
      if (save && !opt.noEarly && c.sim(ch).ok) {
        ok = true; // 손잡이 둘째 줄 '지금 쾅 → 성공' → 당긴다
        break;
      }
      if (c.reach1(ch) === 0 && rng() < 0.5) (left += ch[pick]), (ch[pick] = 0); // 막다른 길 → 떼기 q .5
    }
    if (ok) win++;
    if (ok && c.sim(ch).stars === 3) s3++;
  }
  if (out) out.star3 = s3 / n; // 첫 시도 ★3률(FUN v1.5 ⓓ 보고)
  return win / n;
}

/**
 * look2(F9, GDD §4.3): 폭약 두 개 조합까지 미리 보고 고른다 — 지금 상태에서 하나 또는 둘을 더 붙인 끝을 점수로 비교해 가장 좋은 조합을 붙인다.
 * 손잡이 판은 하나·둘 뒤 바로 쾅도 끝으로 친다. 동점은 무작위(시드 20개 평균). only = 쓸 수 있는 블록(고정 시점 변형).
 */
export function look2(L: Layout3, d: StageDef3, c: Cache, only?: (i: number) => boolean): number {
  const N = L.blocks.length, save = d.save !== undefined;
  const score = (o: Outcome3) => o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - o.hits.reduce((a, b) => a + b, 0);
  const taps = L.blocks.map((_, i) => i).filter((i) => capOf3(L.blocks[i]) > 0 && (!only || only(i)));
  let s3 = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed), ch = new Int8Array(N);
    let left = d.charges, done = false;
    while (!done && left > 0) {
      let bv = -1e9, ties: number[][] = [];
      const cs = taps.filter((i) => !ch[i] && capOf3(L.blocks[i]) <= left);
      const consider = (pl: number[], end: boolean) => {
        if (!end) return;
        const c2 = ch.slice();
        for (const i of pl) c2[i] = capOf3(L.blocks[i]);
        const v = score(c.sim(c2));
        if (v > bv) (bv = v), (ties = [pl]);
        else if (v === bv) ties.push(pl);
      };
      for (const i of cs) {
        const k = capOf3(L.blocks[i]);
        consider([i], save || k === left);
        for (const j of cs) if (j > i && k + capOf3(L.blocks[j]) <= left) consider([i, j], save || k + capOf3(L.blocks[j]) === left);
      }
      let end = true;
      if (!ties.length) {
        // 두 수 안에 끝이 안 나는 판(폭약 ≥ 3, 자동 쾅) — v1.5 ⓑ: 무작위 첫 수 금지, 두 수의 미리 보기(지금 쾅이라면) 점수로 고른다
        end = false;
        for (const i of cs) for (const j of cs) if (j > i && capOf3(L.blocks[i]) + capOf3(L.blocks[j]) <= left) consider([i, j], true);
        if (!ties.length) break;
      }
      const pl = ties[Math.floor(rng() * ties.length)];
      for (const i of pl) (ch[i] = capOf3(L.blocks[i])), (left -= ch[i]);
      done = end; // 고른 끝까지 붙였으면 쾅(손잡이 또는 자동), 아니면 이어서
    }
    if (c.sim(ch).ok && c.sim(ch).stars === 3) s3++;
  }
  return s3 / 20;
}

/**
 * 버릇 봇(F10, 🧪 C008 정의 · v1.5 ⓒ): '같은 쪽 다리 둘' 버릇 — 울타리까지 빈 땅이 가장 넓은 쪽(동점은 고르게)의 다리(기둥마다 붙일 수 있는 가장 낮은 블록)를 끊고,
 * 손잡이 판이면 그 쪽 다리를 다 붙인 뒤 바로 쾅. flowerAvoid = 꽃밭 있는 쪽은 빼는 변형. ★3률(동점 쪽 평균)
 */
export function habit(L: Layout3, d: StageDef3, c: Cache, flowerAvoid: boolean): number {
  const bl = L.blocks, x0 = Math.min(...bl.map((b) => b.x)), x1 = Math.max(...bl.map((b) => b.x)), z0 = Math.min(...bl.map((b) => b.z)), z1 = Math.max(...bl.map((b) => b.z));
  const sides = [
    { room: x0 - L.lot.x0, face: (b: { x: number }) => b.x === x0, fl: L.flowers.some(([fx]) => fx < x0) },
    { room: L.lot.x1 - x1, face: (b: { x: number }) => b.x === x1, fl: L.flowers.some(([fx]) => fx > x1) },
    { room: z0 - L.lot.z0, face: (b: { z: number }) => b.z === z0, fl: L.flowers.some(([, fz]) => fz < z0) },
    { room: L.lot.z1 - z1, face: (b: { z: number }) => b.z === z1, fl: L.flowers.some(([, fz]) => fz > z1) },
  ].filter((s) => !(flowerAvoid && s.fl));
  if (!sides.length) return 0;
  const top = Math.max(...sides.map((s) => s.room)), pick = sides.filter((s) => s.room === top);
  let s3 = 0;
  for (const s of pick) {
    const ch = new Int8Array(bl.length);
    let left = d.charges;
    // v1.5 ⓒ: 다리 = 기둥(x,z)마다 붙일 수 있는 가장 낮은 블록(쇠 받침 위 나무 다리도)
    const low = new Map<string, number>();
    bl.forEach((b, i) => {
      if (!capOf3(b) || !s.face(b as never)) return;
      const k = `${b.x},${b.z}`, j = low.get(k);
      if (j === undefined || bl[j].y > b.y) low.set(k, i);
    });
    for (const i of low.values()) {
      const k = capOf3(bl[i]);
      if (k <= left) (ch[i] = k), (left -= k);
    }
    const o = c.sim(ch);
    if (o.ok && o.stars === 3) s3++;
  }
  return s3 / pick.length;
}

/** 꼭 필요한 톡(F4b ⓒ·F5 v1.4 ⓑ): 그 톡을 빼면 성공이나 꽃 별을 잃는 성공 계획에 드는 톡 */
export function essentialTaps(L: Layout3, d: StageDef3, c: Cache): boolean[] {
  const ess = L.blocks.map(() => false);
  plansOf(L, d, (ch) => {
    const o = c.sim(ch);
    if (!o.ok) return;
    for (let i = 0; i < ch.length; i++) {
      if (!ch[i] || ess[i]) continue;
      const q = ch.slice();
      q[i] = 0;
      if (!q.some((v) => v > 0)) {
        ess[i] = true;
        continue;
      }
      const p = c.sim(q);
      if (!p.ok || (o.star[1] && !p.star[1])) ess[i] = true;
    }
  });
  return ess;
}

/**
 * 오해 봇(FUN.md 봇 표 · MILESTONES R3 c): 돌을 폭약 1개짜리로 믿고 greedy1처럼 한다 — 미리 보기는 진짜(그려진 대로)지만
 * '몇 개 남았나'를 잘못 세어, 돌을 붙인 뒤 남은 폭약이 생각보다 적다. 게임은 남은 수보다 비싼 블록을 못 붙이게 하므로 그다음 좋은 곳으로.
 * 반환 = 성공률·★3률(시드 20, 동점 무작위)
 */
export function misread(L: Layout3, d: StageDef3, c: Cache): { clear: number; star3: number } {
  const save = d.save !== undefined;
  const score = (o: Outcome3) => o.stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - o.hits.reduce((a, b) => a + b, 0);
  let ok = 0, s3 = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed), ch = new Int8Array(L.blocks.length);
    let left = d.charges, believed = d.charges;
    while (left > 0 && believed > 0) {
      let bv = -1e9, ties: number[] = [];
      L.blocks.forEach((b, i) => {
        const k = capOf3(b);
        if (!k || ch[i] || k > left) return; // 게임이 막는다
        const c2 = ch.slice();
        c2[i] = k;
        // 믿음: 이것이 마지막 폭약이라고 생각할 때만 '결과'로 본다 — 그 밖엔 미리 보기 점수 그대로
        const v = score(c.sim(c2));
        if (v > bv) (bv = v), (ties = [i]);
        else if (v === bv) ties.push(i);
      });
      if (!ties.length) break;
      const i = ties[Math.floor(rng() * ties.length)];
      ch[i] = capOf3(L.blocks[i]);
      left -= ch[i];
      believed -= 1;
      if (save && c.sim(ch).ok) break; // greedy1: 성공이 뜨면 손잡이
    }
    const o = c.sim(ch);
    if (o.ok) ok++;
    if (o.ok && o.stars === 3) s3++;
  }
  return { clear: ok / 20, star3: s3 / 20 };
}

/**
 * 오해 봇 v1.7(🧪 C011 1·9): look2 깊이 — 돌을 1개짜리로 **믿고** 남은 수와 ★3(아끼기)을 센다. 고르는 점수는 진짜 미리 보기(성공·높이·꽃·이웃집)지만
 * 손잡이 판의 ★3은 '믿은 쓴 수 ≤ 목표'로 셈. 게임은 진짜 남은 수보다 비싼 블록을 막는다(그러면 그다음 좋은 조합).
 * 반환 = 성공률·★3률(진짜 결과, 시드 20, 동점 무작위)
 */
export function misreadLook2(L: Layout3, d: StageDef3, c: Cache): { clear: number; star3: number } {
  const N = L.blocks.length, save = d.save !== undefined;
  const taps = L.blocks.map((_, i) => i).filter((i) => capOf3(L.blocks[i]) > 0);
  const believedScore = (o: Outcome3, believedUsed: number) => {
    const s3 = save ? o.ok && o.flowers === 0 && believedUsed <= d.save! : o.star[2];
    const stars = (o.ok ? 1 : 0) + (o.ok && o.flowers === 0 ? 1 : 0) + (s3 ? 1 : 0);
    return stars * 1000 + (o.ok ? 0 : -5000) - o.height * 10 - o.flowers * 30 - o.hits.reduce((a, b) => a + b, 0);
  };
  let ok = 0, s3 = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const rng = mulberry32(seed), ch = new Int8Array(N);
    let left = d.charges, believed = d.charges, guard = 0;
    while (left > 0 && believed > 0 && guard++ < 8) {
      const cs = taps.filter((i) => !ch[i]);
      let bv = -1e9, ties: number[][] = [];
      const consider = (pl: number[]) => {
        let real = 0;
        for (const i of pl) real += capOf3(L.blocks[i]);
        if (real > left) return; // 게임이 막는다
        const c2 = ch.slice();
        for (const i of pl) c2[i] = capOf3(L.blocks[i]);
        const v = believedScore(c.sim(c2), d.charges - believed + pl.length);
        if (v > bv) (bv = v), (ties = [pl]);
        else if (v === bv) ties.push(pl);
      };
      // 끝 = 손잡이 판은 아무 때나, 아니면 믿는 남은 수를 다 쓸 때(진짜로는 돌 때문에 일찍 자동 쾅이 날 수 있다)
      for (const i of cs) {
        if (save || believed === 1) consider([i]);
        for (const j of cs) if (j > i && believed >= 2 && (save || believed === 2)) consider([i, j]);
      }
      if (!ties.length) for (const i of cs) for (const j of cs) if (j > i) consider([i, j]);
      if (!ties.length) for (const i of cs) consider([i]);
      if (!ties.length) break;
      const pl = ties[Math.floor(rng() * ties.length)];
      for (const i of pl) if (capOf3(L.blocks[i]) <= left) (ch[i] = capOf3(L.blocks[i])), (left -= ch[i]), (believed -= 1);
      if (save) break; // 손잡이 판: 고른 끝에서 당긴다
    }
    const o = c.sim(ch);
    if (o.ok) ok++;
    if (o.ok && o.stars === 3) s3++;
  }
  return { clear: ok / 20, star3: s3 / 20 };
}

/**
 * ⓕ 안전 v1.7(🧪 C011 10): 손잡이 판에서 '폭약을 다 쓰는 처음 봇'(성공이 떠도 안 당기고 끝까지) 성공률 − '목표 수에서 멈추는 처음 봇'(목표 수만큼 붙이면 당김) 성공률.
 * 처음 봇은 F2와 같이 두 형(미리 보기형·안 보는 형) 모두 재고 차이의 작은 쪽. > 0이면 더 쓰는 쪽이 더 안전.
 */
export function safetyGap(L: Layout3, d: StageDef3, wMix: number[], c: Cache, n = 2000, seed = 31): number {
  if (d.save === undefined) return 0;
  const gap = (mode: 'prev' | 'blind') => firstTimer(L, d, wMix, mode, n, c, seed, undefined, { noEarly: true }) - firstTimer(L, d, wMix, mode, n, c, seed, undefined, { stopAt: d.save, noEarly: true });
  return Math.min(gap('prev'), gap('blind'));
}
