/** 스튜디오 동물 군단 합체 전투 (M0~): 결정성 · 첫 톡에 쿵 · 셋이면 합체 · 손 안 대면 안전 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/petsquad/core.ts';
import { HABITS, STAGES, STAGE_COUNT, canSkip, jumpTo, lineOf, petsquad as g, petsquadHabit2, petsquadHuman, petsquadSmart, retry, setRandomShop } from '../studio/petsquad/game.ts';
import { snapshots, tryStage } from '../studio/petsquad/funqa.ts';

const A = g.aspect ?? 1.5;
/** 화면 톡 한 번(누른 한 틱 + 뗀 한 틱) — 좌표는 가로 폭 단위 */
const tapAt = (s: ReturnType<typeof g.create>, x: number, y: number) => {
  g.step(s, { tap: false, dir: 0, pointer: { x, y: y / A } });
  g.step(s, { tap: false, dir: 0, pointer: null });
};

describe('동물 군단 합체 전투 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, petsquadSmart, 5, 60 * 120), b = runBot(g, petsquadSmart, 5, 60 * 120);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('판은 7개, 판마다 이름과 별 조건이 있다', () => {
    expect(STAGE_COUNT).toBe(7);
    for (const d of STAGES) expect(d.name.length).toBeGreaterThan(0);
  });

  it('첫 톡(가게 카드)에 동물이 진영에 내려앉고 금화가 준다', () => {
    const s = g.create(1);
    // 마리 수(별 둘 = 셋 합친 것) — M1 S2부터 1-1 첫 톡은 합체라 칸 수는 줄 수 있다
    const heads = () => s.board.reduce((n, p) => n + (p ? (p.star === 1 ? 1 : p.star === 2 ? 3 : 9) : 0), 0);
    const n0 = heads(), c0 = s.coins;
    tapAt(s, 0.175, 1.07);
    expect(heads()).toBe(n0 + 1);
    expect(s.coins).toBeLessThan(c0);
    expect(s.firstTap).toBeGreaterThan(0);
  });

  it('키보드 1·2·3 = 카드 사기', () => {
    const s = g.create(1);
    const c0 = s.coins;
    g.step(s, { tap: false, dir: 0, pointer: null, pick: 0 });
    expect(s.coins).toBeLessThan(c0);
  });

  it('1판 카드 셋을 다 사면 합체가 한 번은 일어난다(첫 큰 순간)', () => {
    const s = g.create(1);
    for (let i = 0; i < 3; i++) {
      tapAt(s, [0.175, 0.5, 0.825][i], 1.07);
      for (let k = 0; k < 10; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    }
    expect(s.merges).toBeGreaterThanOrEqual(1);
  });

  it('아무것도 안 누르면 가게에서 기다릴 뿐 — 하트·금화가 그대로 (2판부터)', () => {
    const s = g.create(2);
    tapAt(s, 0.645, 1.262); // 1판은 저절로 싸움이 있으니 먼저 싸워서 넘긴다
    let t = 0;
    while (s.stage === 0 && t++ < 60 * 30) g.step(s, { tap: false, dir: 0, pointer: null });
    const h = s.hearts, c = s.coins;
    for (let k = 0; k < 60 * 10; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.phase, s.hearts, s.coins]).toEqual(['shop', h, c]);
  });

  it('밸런스 하한(작은 표본): 잘하는 봇은 끝까지 가고, 같은 동물만 모으는 버릇 봇은 못 간다', () => {
    const smart = [1, 2, 3].map((sd) => runBot(g, petsquadSmart, sd).s);
    expect(smart.filter((s) => s.won).length).toBeGreaterThanOrEqual(2);
    const habit = [1, 2, 3].map((sd) => runBot(g, petsquadHabit2, sd).s);
    expect(habit.every((s) => !s.won)).toBe(true);
  });
});

describe('M1 S4 별 틀 · 하트 폐지 · 판 독립 (📐 GDD §5 · CONTENT §4)', () => {
  it('모든 판 별이 같은 세 가지: 이기기 · 금화 N개 남기기 · 한 마리도 안 잃기(1·2판 N 0, 3판부터 3)', () => {
    for (const d of STAGES) expect(d.stars.map((q) => q.k)).toEqual(['win', 'save', 'noloss']);
    expect(STAGES.map((d) => d.n)).toEqual([0, 0, 3, 3, 3, 3, 3]);
  });

  it('판마다 정해진 시작 진영·금화로 시작한다(앞 판 군단·금화가 넘어오지 않는다)', () => {
    for (let k = 0; k < STAGE_COUNT; k++) {
      const s = g.create(1);
      jumpTo(s, k);
      expect([k, s.coins, s.board.filter(Boolean).length]).toEqual([k, STAGES[k].coins, STAGES[k].start?.length ?? 0]);
    }
  });

  it('지면 저절로 넘어가지 않고, 처음부터는 정해진 시작 · 이 군단으로 다시는 싸움을 누른 순간으로(금화 그대로)', () => {
    const s = g.create(1);
    jumpTo(s, 6); // 곰 우두머리 판
    tapAt(s, 0.175, 1.07); // 한 장만 사고 싸움 → 진다
    const coins = s.coins, kinds = s.board.map((p) => p?.k ?? '-').join();
    tapAt(s, 0.645, 1.262);
    let t = 0;
    while (s.phase !== 'result' && t++ < 60 * 40) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.ok).toBe(false);
    expect(s.hearts).toBe(3);
    for (let k = 0; k < 600; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect([s.phase, s.stage]).toEqual(['result', 6]); // 기다린다
    retry(s, true);
    expect([s.phase, s.coins, s.board.map((p) => p?.k ?? '-').join()]).toEqual(['shop', coins, kinds]);
    retry(s, false);
    expect([s.coins, s.board.filter(Boolean).length]).toEqual([STAGES[6].coins, 0]);
  });

  it('카드 줄 판별(판 독립 출발): 잘하는 봇 7판 모두 ★3 · 버릇 봇 6종 3판부터 ★3 0 · 버릇 봇도 끝까지 간다(P5)', () => {
    for (let k = 0; k < STAGE_COUNT; k++) {
      const r = tryStage(petsquadSmart, 1, k, null);
      expect([k, r.ok, r.got]).toEqual([k, true, r.of]);
    }
    for (const h of HABITS) {
      for (let k = 2; k < STAGE_COUNT; k++) expect([h.name, k, tryStage(h, 1, k, null).got >= 3]).toEqual([h.name, k, false]);
      expect(runBot(g, h, 1).s.won).toBe(true);
    }
  });
});

describe('M1 S3 보이는 카드 줄 (📐 CONTENT §3)', () => {
  it('가게 = 판의 줄 앞 3장, 사면 그 자리에 줄의 다음 카드가 들어온다', () => {
    const s = g.create(1), line = lineOf(0);
    expect(s.shop.map((c) => c.k)).toEqual(line.slice(0, 3));
    expect(s.queue).toEqual(line.slice(3));
    tapAt(s, 0.175, 1.07);
    expect(s.shop[0].k).toBe(line[3]);
    expect(s.queue).toEqual(line.slice(4));
  });

  it('시드가 달라도 같은 판·같은 톡이면 같은 가게와 같은 전투(퍼즐)', () => {
    const run = (seed: number) => {
      const s = g.create(seed);
      tapAt(s, 0.175, 1.07);
      tapAt(s, 0.645, 1.262);
      while (s.phase !== 'result') g.step(s, { tap: false, dir: 0, pointer: null });
      return [s.shop.map((c) => c.k).join(), s.ok, s.got, s.fight!.t];
    };
    expect(run(3)).toEqual(run(77));
  });

  it('넘기기(금화 1): 앞 카드를 줄 끝으로 보내고, 남은 카드가 3장 이하면 막힌다', () => {
    const s = g.create(1);
    jumpTo(s, 3, [['lion', 1]], 30);
    const front = s.shop.map((c) => c.k), c0 = s.coins;
    tapAt(s, 0.17, 1.262);
    expect(s.coins).toBe(c0 - 1);
    expect(s.queue.slice(-3)).toEqual(front);
    s.queue = [];
    expect(canSkip(s)).toBe(false);
    const c1 = s.coins;
    tapAt(s, 0.17, 1.262);
    expect(s.coins).toBe(c1);
  });

  it('?shop=random 끈: 예전 무작위 가게(시드마다 다름)', () => {
    setRandomShop(true);
    try {
      const shops = new Set<string>();
      for (let seed = 1; seed <= 6; seed++) {
        const a = g.create(seed);
        jumpTo(a, 3);
        expect(a.queue.length).toBe(0); // 줄이 없다
        shops.add(a.shop.map((c) => c.k).join());
      }
      expect(shops.size).toBeGreaterThan(1); // 시드마다 가게가 다르다
    } finally {
      setRandomShop(false);
    }
  });

  it('카드 줄 판별: 잘하는 봇은 7판 모두 ★3, 버릇 봇 6종은 3판부터 ★3 0 (📋 S3 관문)', () => {
    const sn = snapshots(1);
    for (let k = 0; k < STAGE_COUNT; k++) {
      const r = tryStage(petsquadSmart, 1, k, sn[k]);
      expect([k, r.ok, r.got]).toEqual([k, true, r.of]);
    }
    for (const h of HABITS) for (let k = 2; k < STAGE_COUNT; k++) {
      const r = tryStage(h, 1, k, sn[k]);
      expect([h.name, k, r.got >= r.of]).toEqual([h.name, k, false]);
    }
  });
});

describe('M1 S2 첫 30초 (📐 CONTENT §5)', () => {
  it('1-1엔 사자 둘이 미리 서 있고, 첫 톡(사자 카드)이 곧 합체다', () => {
    const s = g.create(1);
    expect(s.board.filter((p) => p?.k === 'lion').length).toBe(2);
    const i = s.shop.findIndex((c) => c.k === 'lion');
    tapAt(s, [0.175, 0.5, 0.825][i], 1.07);
    expect(s.merges).toBe(1);
    expect(s.board.some((p) => p?.k === 'lion' && p.star === 2)).toBe(true);
  });

  it('1-1에서만 4초 동안 톡이 없으면 싸움이 저절로 시작된다(2판은 아님)', () => {
    const s = g.create(1);
    for (let k = 0; k < 239; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.phase).toBe('shop');
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.phase).toBe('fight');
    let t = 0;
    while (s.stage === 0 && t++ < 60 * 30) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.stage).toBe(1); // 이기고 다음 판이 저절로 열린다
    for (let k = 0; k < 60 * 6; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.phase).toBe('shop');
  });
});

describe('M1 S1 측정 (📋 측정 먼저)', () => {
  it('버릇 봇 6종(GDD §6.3)이 있고, 1판은 버릇 봇도 깬다', () => {
    expect(HABITS.length).toBe(6);
    for (const h of HABITS) expect(tryStage(h, 1, 0, null).ok).toBe(true);
  });

  it('판별 도전은 결정적이다 (M1 S4부터 3판은 물려받은 군단이 아니라 빈 진영에서 시작 — 판 독립)', () => {
    const sn = snapshots(1);
    expect(sn[2]?.board.some(Boolean)).toBe(false);
    const a = tryStage(petsquadSmart, 1, 2, sn[2]), b = tryStage(petsquadSmart, 1, 2, sn[2]);
    expect(a).toEqual(b);
  });

  it('사람 흉내 봇(1.5초에 한 톡)도 1판을 깨고 다시 뽑기를 안 한다', () => {
    const r = tryStage(petsquadHuman, 3, 0, null);
    expect(r.ok).toBe(true);
    expect(r.rerolls).toBe(0);
  });
});

describe('동물 군단 합체 전투 플레이 빌드', () => {
  const f = 'web/public/studio/petsquad/index.html';
  it('빌드가 있고 한 장짜리 html, gzip 40KB 이하(📋 M0 상한)', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).toContain('<title>동물 군단 합체 전투</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThan(40 * 1024);
  });
});
