/** 스튜디오 행성 수호대 (M1): 결정성 · 난수 분리 · 손맛 사건 · 봇 밸런스 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { ALLY_MAX, FIRST_CARD, available, create, mineRate, noviceBot, planetOf, randomBot, runBot, smartBot, spinSpeed, step, waveKind, type GameEvent, type State } from '../studio/planet-guardian/sim.ts';
import { createJuice, react, tick } from '../studio/planet-guardian/juice.ts';

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

describe('행성 수호대 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 판', () => {
    const a = runBot(smartBot, 7), b = runBot(smartBot, 7);
    expect([a.score, a.sec, a.kills]).toEqual([b.score, b.sec, b.kills]);
  });

  it('카드를 다르게 골라도 운석 배치는 같다 (데일리 공정성)', () => {
    const angles = (pick: number) => {
      const s = create(42), seen = new Map<number, number>();
      while (s.t < 60 * 40 && !s.dead) {
        step(s, { pick: s.offer ? Math.min(pick, s.offer.length - 1) : undefined });
        for (const e of s.enemies) if (!seen.has(e.id)) seen.set(e.id, e.a);
      }
      return [...seen.entries()].slice(0, 12);
    };
    expect(angles(0)).toEqual(angles(2));
  });

  it('조작 없이 편대가 저절로 돈다, 궤도 가속이면 더 빨리 (오너 C002)', () => {
    const s = create(1), a0 = s.angle;
    for (let k = 0; k < 30; k++) step(s, {});
    expect(s.angle).not.toBe(a0);
    const slow = spinSpeed(s);
    s.spinLv = 2;
    expect(spinSpeed(s)).toBeGreaterThan(slow * 1.9);
  });

  it('카드가 뜨면 고를 때까지 멈춘다, 고르면 다시 흐른다 (오너 C002)', () => {
    const s = create(5);
    while (!s.offer) step(s, {});
    const t = s.t, enemies = JSON.stringify(s.enemies);
    for (let k = 0; k < 200; k++) step(s, {});
    expect(s.t).toBe(t);
    expect(JSON.stringify(s.enemies)).toBe(enemies);
    step(s, { pick: 0 });
    expect(s.offer).toBeNull();
    expect(s.builds).toBe(1);
    step(s, {});
    expect(s.t).toBe(t + 1);
  });

  it('카드는 광석이 아니라 첫 카드(8초) 뒤로 웨이브를 막을 때마다 온다, 다시 뽑기는 광석을 쓴다 (C004 → F01 오너)', () => {
    const s = create(9);
    const at: number[] = [], clears: number[] = [];
    while (at.length < 4 && !s.dead) {
      step(s, {});
      if (s.events.some((e) => e.type === 'clear')) clears.push(s.t);
      // F01: 카드가 뜨는 틱은 첫 카드(FIRST_CARD) 아니면 웨이브를 막은 바로 그 틱뿐이다
      if (s.offer) (at.push(s.t), step(s, { pick: 0 }));
    }
    expect(at[0]).toBe(FIRST_CARD);
    expect(at.slice(1)).toEqual(clears.slice(0, 3));
    // 광석이 아무리 많아도 첫 카드 전엔, 그리고 웨이브를 막기 전엔 카드가 오지 않는다
    const q = create(9);
    q.ore = 999;
    for (let k = 0; k < FIRST_CARD - 1; k++) step(q, {});
    expect(q.offer).toBeNull();
    step(q, {});
    expect(q.offer).not.toBeNull();
    step(q, { pick: 0 });
    while (!q.dead && !q.events.some((e) => e.type === 'clear')) {
      expect(q.offer).toBeNull();
      step(q, {});
    }
    expect(q.offer).not.toBeNull();
    while (!s.offer) step(s, {});
    s.ore = 100;
    const before = s.cost;
    step(s, { reroll: true });
    expect(s.ore).toBe(100 - before);
    expect(s.cost).toBeGreaterThan(before);
    expect(s.offer).not.toBeNull();
    const raised = s.cost;
    step(s, { pick: 0 });
    expect(s.cost).toBe(raised); // C005: 카드를 골라도 다시 뽑기 비용은 그대로 (판 내내 누적)
    while (!s.offer) step(s, {});
    s.ore = 0;
    const offer = JSON.stringify(s.offer);
    step(s, { reroll: true }); // 광석이 모자라면 아무 일도 없다
    expect(JSON.stringify(s.offer)).toBe(offer);
  });

  it('State를 통째로 복제하면 같은 입력에 같은 미래 (C006: 롤아웃 봇 선결 조건)', () => {
    const s = create(21);
    for (let k = 0; k < 2000; k++) step(s, s.offer ? { pick: 0 } : {});
    const c = structuredClone(s);
    for (let k = 0; k < 3000; k++) {
      const inp = s.offer ? { pick: k % 3 } : {};
      step(s, inp);
      step(c, inp);
    }
    expect(JSON.stringify(c)).toBe(JSON.stringify(s));
  });

  it('다시 뽑기는 손패만 바꾼다 — 운석·건물 자리 난수는 그대로 (C006)', () => {
    const s = create(33);
    while (!s.offer) step(s, {});
    const a = structuredClone(s), b = structuredClone(s);
    b.ore = a.ore = 50;
    step(b, { reroll: true });
    expect(b.rngS).toBe(a.rngS);
    expect(b.slotS).toBe(a.slotS);
    // 같은 박자에서 다시 뽑기 횟수가 같으면 같은 손패
    const c = structuredClone(s);
    c.ore = 50;
    step(c, { reroll: true });
    expect(JSON.stringify(c.offer)).toBe(JSON.stringify(b.offer));
  });

  it('광산은 광석만 준다(단계마다 +0.3/초) — 카드가 오는 때는 바꾸지 않고, 문구가 사실과 같다 (C008 박자 단축 → F01)', () => {
    const s = create(1);
    expect(mineRate(s)).toBe(0);
    s.sites.push({ kind: '광산', slot: 0, level: 2, cool: 0, aim: 0, born: 0 });
    expect(mineRate(s)).toBeCloseTo(0.6, 10);
    for (const c of available(s).filter((c) => c.id.endsWith('mine'))) expect(c.detail).toBe('광석 +0.3/초');
    // 광산 3단계 2개를 더해도 카드가 뜨는 틱은 광산 없는 판과 똑같다
    const offers = (q: State) => {
      const at: number[] = [];
      // 짓지 않고 손패만 치운다 — 두 판의 기지를 같게 두고 카드 시각만 비교
      while (at.length < 5 && !q.dead) (step(q, {}), q.offer && (at.push(q.t), (q.offer = null)));
      return at;
    };
    const a = create(17), b = create(17);
    b.sites.push({ kind: '광산', slot: 0, level: 3, cool: 0, aim: 0, born: 0 }, { kind: '광산', slot: 1, level: 3, cool: 0, aim: 0, born: 0 });
    const oa = offers(a);
    expect(oa.length).toBeGreaterThanOrEqual(3); // 짓지 않으면 3웨이브쯤 끝난다 — 끝날 때까지의 카드 시각 전부
    expect(new Set(oa).size).toBe(oa.length);
    expect(offers(b)).toEqual(oa);
  });

  it('다음 웨이브 예고는 (시드·웨이브 번호)로만 정해지고 그대로 온다, 행성 성격과 반대 위협은 오지 않는다 (F01)', () => {
    for (const pick of [0, 2]) {
      const s = create(31);
      while (s.wave < 8 && !s.dead) {
        step(s, s.offer ? { pick: Math.min(pick, s.offer.length - 1) } : {});
        if (s.offer) expect(s.nextKind).toBe(waveKind(31, s.wave + 1));
        if (s.events.some((e) => e.type === 'wave')) expect(s.kind).toBe(waveKind(31, s.wave));
      }
    }
    for (let seed = 1; seed <= 60; seed++) {
      expect(waveKind(seed, 1)).toBe('보통');
      expect(waveKind(seed, 2)).toBe('보통');
      const other = planetOf(seed) === '떼' ? '거대' : '떼';
      for (let n = 3; n <= 40; n++) expect(waveKind(seed, n)).not.toBe(other);
    }
  });

  it('위성은 6기까지, 몸막기는 체력 1만큼 (F01 오너 "성장이 금방 끝나")', () => {
    const s = create(1);
    s.allies = ALLY_MAX - 1;
    expect(available(s).some((c) => c.id === 'ally')).toBe(true);
    s.allies = ALLY_MAX;
    expect(available(s).some((c) => c.id === 'ally')).toBe(false);
    expect(ALLY_MAX).toBe(6);
    // 첫 위성 바로 앞에 체력 3 운석: 한 번 닿으면 2가 되고, 같은 운석은 곧바로 다시 맞지 않는다
    const q = create(2);
    q.spawnIn = 9999;
    const a = q.angle + 0.0001;
    q.enemies.push({ id: 999, a, r: 0.43 + 0.0001, v: 0, hp: 3, maxHp: 3, big: false, flash: -99 });
    q.cool[0] = 9999;
    q.sites = [];
    step(q, {});
    expect(q.enemies.find((e) => e.id === 999)?.hp).toBe(2);
    step(q, {});
    expect(q.enemies.find((e) => e.id === 999)?.hp).toBe(2);
  });

  it('손패에 같은 카드 두 장은 없다 (C010)', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = create(seed);
      for (let k = 0; k < 600 && !s.dead; k++) {
        if (s.offer) {
          const ids = s.offer.map((c) => c.id);
          expect(new Set(ids).size).toBe(ids.length);
        }
        step(s, s.offer ? { pick: 0 } : {});
      }
    }
  });

  it('다시 뽑기는 지금 손패를 빼고 뽑는다, 광산 문구는 사실대로 (C009)', () => {
    const s = create(12);
    while (!s.offer) step(s, {});
    const before = s.offer!.map((c) => c.id);
    s.ore = 50;
    step(s, { reroll: true });
    const after = s.offer!.map((c) => c.id);
    if (available(s).filter((c) => !before.includes(c.id)).length) expect(after.some((id) => before.includes(id))).toBe(false);
    // 광산 문구는 늘 실제 효과와 같다 (F01: 박자 단축이 없어져 하한 구분도 없다)
    const q = create(1);
    q.sites.push({ kind: '광산', slot: 0, level: 3, cool: 0, aim: 0, born: 0 }, { kind: '광산', slot: 1, level: 2, cool: 0, aim: 0, born: 0 });
    for (const c of available(q).filter((c) => c.id.endsWith('mine'))) expect(c.detail).toBe('광석 +0.3/초');
    // F01: 광산은 3웨이브부터 (초반 카드는 모두 방어 — L8)
    const early = create(1);
    for (const w of [1, 2]) (early.wave = w), expect(available(early).some((c) => c.id === 'new-mine')).toBe(false);
    early.wave = 3;
    expect(available(early).find((c) => c.id === 'new-mine')!.detail).toBe('광석 +0.3/초');
  });

  it('시작하자마자 포탑 하나가 있다', () => {
    expect(create(1).sites.filter((x) => x.kind === '포탑')).toHaveLength(1);
  });

  it('손맛 사건이 나온다: 발사·처치·피격·카드·웨이브', () => {
    const s = create(3), seen = new Set<GameEvent['type']>();
    let g = 0;
    while (!s.dead && s.t < 60 * 600 && g++ < 1e6) {
      step(s, randomBot(s, Math.random));
      for (const e of s.events) seen.add(e.type);
    }
    for (const t of ['fire', 'kill', 'impact', 'offer', 'dead'] as const) expect(seen).toContain(t);
    const smart = runBot(smartBot, 3).state as State;
    expect(smart.wave).toBeGreaterThan(3);
  });

  it('손맛 층은 시뮬을 바꾸지 않고, 파티클 수에 상한이 있다', () => {
    const j = createJuice();
    for (let k = 0; k < 200; k++) react(j, { type: 'kill', x: 0.5, y: 0, big: true, combo: k, ore: 3, by: 'body' });
    expect(j.parts.length).toBeLessThanOrEqual(300);
    for (let k = 0; k < 200; k++) tick(j);
    expect(j.parts.length).toBe(0);
    expect(j.trauma).toBe(0);
  });
});

describe('행성 수호대 롤아웃 봇 (C007)', () => {
  it('원본 State를 건드리지 않고(투시 금지 복제), 같은 입력엔 같은 판정', async () => {
    const { decide } = await import('../studio/planet-guardian/rollout.ts');
    const s = create(44);
    while (!s.offer) step(s, {});
    s.ore = 30;
    const before = JSON.stringify(s);
    const a = decide(s, 44), b = decide(s, 44);
    expect(JSON.stringify(s)).toBe(before);
    expect(a.d.means).toEqual(b.d.means);
    expect(a.d.means.length).toBe(s.offer!.length + 1); // 카드 + 다시 뽑기
  });
});

describe('행성 수호대 밸런스 (GDD §8, 봇)', () => {
  // 40시드: 아무거나 고르는 봇은 판마다 편차가 커서(28~281초) 16시드 중앙값은 흔들린다 — 목표는 그대로, 측정만 촘촘히 (C004)
  const seeds = [...Array(40).keys()].map((k) => k + 1);
  it('막누르기 봇도 첫 판 30초 이상 (프로토타입은 10초)', () => {
    expect(median(seeds.map((x) => runBot(randomBot, x).sec))).toBeGreaterThanOrEqual(30);
  });
  it('처음 하는 사람 대역(카드 아무거나) 봇은 첫 판 60~150초 (GDD §1)', () => {
    const m = median(seeds.map((x) => runBot(noviceBot, x).sec));
    expect(m).toBeGreaterThanOrEqual(60);
    expect(m).toBeLessThanOrEqual(150);
  });
  it('잘하는 봇은 3~9분 (88초 스폰 벽 제거)', () => {
    const m = median(seeds.map((x) => runBot(smartBot, x, 60 * 900).sec));
    expect(m).toBeGreaterThanOrEqual(180);
    expect(m).toBeLessThanOrEqual(540);
  });
});

describe('행성 수호대 플레이 빌드', () => {
  const path = 'web/public/studio/planet-guardian/index.html';
  it('빌드가 있고, 번들이 들어 있고, gzip 30KB 이하', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).toContain('행성 수호대');
    expect(gzipSync(html).length).toBeLessThanOrEqual(30 * 1024);
  });
});

describe('행성 수호대 FUN QA 계기판', () => {
  it('세 유저군 지표를 모두 잰다', async () => {
    const { measure } = await import('../studio/planet-guardian/funqa.ts');
    const m = measure();
    for (const g of ['라이트', '미들코어', '하드코어'] as const) expect(m.checks.filter((c) => c.group === g).length).toBeGreaterThanOrEqual(4);
    for (const c of m.checks) expect(Number.isFinite(c.value)).toBe(true);
  });
});
