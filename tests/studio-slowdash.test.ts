/** 스튜디오 느린 시간 닌자 (M0~): 결정성 · 판별 시작 · 취소 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/slowdash/core.ts';
import { ONBOARD, SHIELD_HP, STAGES, STRIKE, TRIAL, WORLD_LOCK, measureKit, missOf, textWarm, useOwl, worldStars, slowdash as g, slowdashRandom, slowdashSmart, startStage } from '../studio/slowdash/game.ts';
import { BOTS, measure, setBambooOff, tapEvery, try3, tryStage } from '../studio/slowdash/funqa.ts';
import { chainHz, sfx } from '../studio/slowdash/sfx.ts';
import { PAL, PX, SOLDIER, bgGrid, heroGrid, soldierGrid } from '../studio/slowdash/pix.ts';

const A = g.aspect ?? 1.52;
/** 판 번호는 판이 늘면 바뀐다 — key로 찾는다(S007 10판) */
const K = (key: string) => STAGES.findIndex((d) => d.key === key);

describe('느린 시간 닌자 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, slowdashSmart, 7, 60 * 300), b = runBot(g, slowdashSmart, 7, 60 * 300);
    expect([a.score, a.ticks, a.s.stage, a.s.stars]).toEqual([b.score, b.ticks, b.s.stage, b.s.stars]);
  });

  it('아무 판에서나 시작할 수 있다 (측정·판 고르기용)', () => {
    const s = g.create(3);
    startStage(s, 5);
    expect(s.stage).toBe(5);
    expect(s.phase).toBe('play');
    expect(STAGES.length).toBe(10); // S007: 1-1~1-5 꺾기 판 + 예전 뒤 다섯
  });

  it('누르는 동안 게이지가 줄고(느린 시간), 닌자 위에서 떼면 돌진하지 않는다(취소)', () => {
    const s = g.create(4);
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const g0 = s.g, x0 = s.nx, y0 = s.ny;
    for (let k = 0; k < 20; k++) g.step(s, { tap: false, dir: 0, pointer: { x: s.nx, y: s.ny / A } });
    expect(s.down).toBe(true);
    expect(s.g).toBeLessThan(g0);
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.dashes).toBe(0);
    expect([s.nx, s.ny]).toEqual([x0, y0]);
  });

  it('1판: 허수아비 셋 너머를 꾹 → 떼면 한 번에 셋을 벤다 (첫 큰 순간)', () => {
    const s = g.create(1);
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    for (let k = 0; k < 10; k++) g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: 0.56 / A } });
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.best).toBe(3);
  });

  it('오너 피드백 한 획 싹쓸이: 한 돌진에 셋 넘게 베고 화면에 적이 안 남으면 느린 시간 게이지가 가득 · 슬로 두 배 · 하나라도 남으면 아님', () => {
    const go = (keep: number) => {
      const s = g.create(1);
      for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      if (keep) s.foes.push({ ...s.foes[0], id: 999, x: 0.15, y: 0.6 }); // 줄 밖에 하나 더
      for (let k = 0; k < 10; k++) g.step(s, { tap: false, dir: 0, pointer: { x: 0.5, y: 0.56 / A } });
      s.g = 40; // 먹을 일부러 줄여 둠(가득 차는지 보려고)
      g.step(s, { tap: false, dir: 0, pointer: null });
      return s;
    };
    const a = go(0);
    expect(a.best).toBe(3);
    expect(a.events.some((e) => e.kind === 'sweep' && e.n === 3)).toBe(true);
    expect(a.g).toBe(100);
    expect(a.slowT).toBe(60);
    expect(a.free).toBe(240); // 🧪: 다음 한 획 공짜
    const hold = (s: typeof a) => {
      for (let k = 0; k < 20; k++) g.step(s, { tap: false, dir: 0, pointer: { x: 0.2, y: 0.9 / A } });
      g.step(s, { tap: false, dir: 0, pointer: null });
    };
    for (let k = 0; k < 40; k++) g.step(a, { tap: false, dir: 0, pointer: null });
    hold(a);
    expect(a.g).toBe(100); // 꾹 해도 안 줄고 돌진에도 안 듦
    expect(a.free).toBe(0); // 한 번 쓰면 끝
    hold(a);
    expect(a.g).toBeLessThan(100);
    const b = go(1);
    expect(b.events.some((e) => e.kind === 'sweep')).toBe(false);
    expect(b.g).toBeLessThan(100);
  });


  it('S002 별 틀: 모든 판 별이 같은 세 가지(★ 지나가기 · ★★ 한 번에 N 베기 · ★★★ 한 대도 안 맞기 — S010 이름 바꿈: 하트 꼬리와 헷갈림), N만 다르다', () => {
    for (const d of STAGES) {
      expect(d.stars.map((q) => q.k)).toEqual(['multi', 'nohit']);
      expect(d.stars[0].n).toBe(d.n);
      expect(d.n).toBeGreaterThanOrEqual(3);
      expect(d.stars[1].label).toBe('한 대도 안 맞기');
    }
    expect(STAGES[0].gift3).toBe(true); // 1-1 허수아비 판은 맞을 수 없다 → 선물 별
  });

  it('S002 하트 폐지: 져도 게임이 끝나지 않고 그 판만 바로 다시 · 결과 화면은 놓친 별 이유를 쉬운 말로', () => {
    const s = g.create(5);
    startStage(s, K('sword'));
    let fails = 0;
    for (let t = 0; t < 60 * 120 && fails < 2; t++) {
      g.step(s, { tap: false, dir: 0, pointer: null }); // 가만히 서 있으면 칼잡이에게 맞아 진다
      if (s.phase === 'result' && !s.ok && s.pt === 1) fails++;
    }
    expect(fails).toBe(2);
    expect(g.over(s)).toBe(false);
    expect(s.stage).toBe(K('sword'));
    const w = g.create(7);
    w.stage = 1;
    w.best = 2;
    w.hits = 1;
    w.starOk = [true, false, false];
    expect(missOf(w)).toBe(`한 번에 2 / ${STAGES[1].n} · 맞음 1`); // S010 셋째 별 이름 바꿈
    w.starOk = [true, true, true];
    expect(missOf(w)).toBe('');
  });

  it('S003 헛방: 아무것도 못 벤 획은 헛방으로 세고 근처 칼잡이가 바로 칼을 든다 · M3 F2 방패 병정은 앞에서 베어도 안 튕기고 두 번 베면 쓰러진다', () => {
    // (경직 20틱은 S003 측정으로 뺐다 — 장인 '옮겨 서기'를 막아 5판 ★3 .92 → .04, 연타엔 효과 0. TALK S003)
    const s = g.create(4);
    startStage(s, K('sword'));
    for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const near = s.foes.find((f) => f.k === 'sword')!;
    near.cool = 99;
    s.nx = near.x;
    s.ny = Math.min(1.27, near.y + 0.32);
    g.step(s, { tap: false, dir: 0, pointer: { x: s.nx + 0.15, y: (s.ny - 0.1) / A } }); // 칼잡이 곁 빈 곳으로 꾹
    g.step(s, { tap: false, dir: 0, pointer: null }); // 떼기 → 빈 획
    expect(s.dashes).toBe(1);
    expect(s.whiffs).toBe(1);
    expect(s.events.some((e) => e.kind === 'whiffme')).toBe(true);
    // 💬 M3 F2 오너 "방패병이 부딪치면 멈추게 하지 말고 … 2번 공격해야 하는 걸로": 방패가 사무라이 쪽을 봐도 튕기지 않는다 — 첫 칼에 방패가 깨지고(쨍!) 둘째 칼에 쓰러진다
    const t = g.create(9);
    startStage(t, K('shield'));
    for (let k = 0; k < 80; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    const sh = t.foes.find((f) => f.k === 'shield')!;
    expect(sh.hp).toBe(2);
    expect(SHIELD_HP).toBe(2);
    const cut = (toY: number) => {
      sh.fa = Math.atan2(t.ny - sh.y, t.nx - sh.x); // 방패가 사무라이를 본다(앞에서 베기)
      (t.g = 100), (t.inv = 99);
      g.step(t, { tap: false, dir: 0, pointer: { x: sh.x, y: toY / A } });
      g.step(t, { tap: false, dir: 0, pointer: null });
    };
    (t.nx = sh.x), (t.ny = sh.y + 0.16);
    cut(sh.y - 0.1);
    expect(t.events.some((e) => e.kind === 'bounce')).toBe(false);
    expect(t.events.some((e) => e.kind === 'shieldbreak' && e.t === t.t)).toBe(true);
    expect(sh.hp).toBe(1);
    expect(t.foes.includes(sh)).toBe(true); // 아직 서 있다
    expect(t.ny).toBeLessThan(sh.y); // 멈추지 않고 방패를 지나갔다
    for (let k = 0; k < 4; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    cut(sh.y + 0.12);
    expect(t.foes.includes(sh)).toBe(false); // 둘째 칼에 쓰러짐
  });

  it('S004 찾아오는 위협: 일격 판에서 내린 자리에 32틱 뒤 일격 — 그 자리에 남으면 맞고, 꾹(느린 시간) 하면 비켜 갈 틈이 있다', () => {
    // S007~S008: 꺾기 판 10판 모두 고리 일격을 뺐다(📐 CONTENT v2) — 일격 장치 자체는 실험값 STRIKE.t로 켜서 확인한다
    expect(STAGES.filter((d) => d.strike).map((d) => d.key)).toEqual([]);
    STRIKE.t = 32;
    const run = (holdAfter: boolean) => {
      const s = g.create(3);
      startStage(s, K('shuri'));
      s.foes = [];
      for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      g.step(s, { tap: false, dir: 0, pointer: { x: s.nx, y: (s.ny - 0.3) / A } });
      g.step(s, { tap: false, dir: 0, pointer: null }); // 내림 → 일격 하나
      expect(s.strikes).toHaveLength(1);
      expect(s.strikes[0].t).toBeGreaterThan(30); // 32틱에서 시작(떼는 틱에 세상이 한 틱 흐름)
      // 사람 반응 0.5초(30틱) 동안 그냥 서 있기 vs 꾹 누른 채 0.5초 겨누기
      for (let k = 0; k < 30; k++) g.step(s, { tap: false, dir: 0, pointer: holdAfter ? { x: 0.2, y: (s.ny + 0.1) / A } : null });
      g.step(s, { tap: false, dir: 0, pointer: null }); // 떼기 → 옆으로 돌진(그 자리에 새 일격이 생기니 첫 일격이 터질 때까지만 본다)
      for (let k = 0; k < 6; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      return s.hits;
    };
    const stay = run(false), hold = run(true);
    STRIKE.t = 0;
    expect(stay).toBeGreaterThan(0); // 실시간 0.5초면 이미 맞았다
    expect(hold).toBe(0); // 꾹 하면 세상이 느려져 비켜 간다
    expect(STRIKE.r).toBeGreaterThan(0);
  });

  it('오너 피드백 한붓 획: 꾹 누른 채 그은 길을 따라 한 번에 돌진하며 베고, 가만히 누르면 예전처럼 한 줄', () => {
    const s = g.create(1);
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    const [a, b, c] = s.foes;
    [a.x, a.y, b.x, b.y, c.x, c.y] = [0.3, 1.0, 0.3, 0.8, 0.62, 0.78]; // 한 줄로 안 서는 셋
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    for (const [x, y] of [[0.3, 1.1], [0.3, 0.95], [0.3, 0.85], [0.3, 0.74], [0.45, 0.76], [0.6, 0.78], [0.72, 0.78]]) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
    expect(s.stroke.length).toBeGreaterThanOrEqual(3);
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.best).toBe(3); // 꺾인 획 하나로 셋
    expect(Math.hypot(s.nx - 0.72, s.ny - 0.78)).toBeLessThan(0.05);
    // 가만히 누르면 점이 안 남는다(한 줄 돌진 = 봇·예전 손맛 그대로)
    const t = g.create(1);
    for (let k = 0; k < 60; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    for (let k = 0; k < 10; k++) g.step(t, at(0.5, 0.56));
    expect(t.stroke).toHaveLength(0);
    g.step(t, { tap: false, dir: 0, pointer: null });
    expect(t.best).toBe(3);
  });

  it('S009 가시덤불: 곧은 줄이 덤불을 지나면 꼬리털만 걸리고(★★★만 놓침, 목숨은 그대로) 꺾어 돌면 안 걸린다 · 버릇은 ★★★을 못 따고 장인 한붓은 딴다', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const go = (pts: number[][]) => {
      const s = g.create(3);
      startStage(s, K('sword'));
      for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      s.foes = [];
      (s.nx = 0.5), (s.ny = 1.12), (s.g = 100), (s.inv = 0);
      s.thorns = [{ x: 0.5, y: 0.92, r: 0.05 }];
      for (const [x, y] of pts) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
      g.step(s, { tap: false, dir: 0, pointer: null });
      return s;
    };
    const straight = go([[0.5, 0.75]]);
    expect(straight.hits).toBe(1);
    expect(straight.hp).toBe(3);
    expect(straight.events.some((e) => e.kind === 'hurt')).toBe(true);
    const bent = go([[0.5, 1.12], [0.66, 1.0], [0.66, 0.85], [0.5, 0.75]]);
    expect(bent.hits).toBe(0);
    expect(STAGES.filter((d) => d.thorns?.length).map((d) => d.key)).toEqual(['sword', 'twin', 'archer', 'shield', 'mix', 'shuri']);
    const k = K('sword'), seeds = [101, 108, 115, 122];
    expect(seeds.filter((sd) => tryStage(BOTS.habit, sd, k).s3)).toHaveLength(0);
    expect(seeds.filter((sd) => tryStage(BOTS.smartStroke, sd, k).s3).length).toBeGreaterThanOrEqual(2);
  });

  it('S010 다시 그리기: 그리던 손가락을 닌자 위로 되돌리면 획이 지워진다 · 측정기는 60초 진전이 없으면 막힘으로 끝낸다(300초 고침)', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const s = g.create(3);
    startStage(s, K('sword'));
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    s.foes = [];
    (s.nx = 0.5), (s.ny = 1.12), (s.g = 100);
    for (const [x, y] of [[0.5, 0.9], [0.6, 0.85], [0.7, 0.8]]) for (let k = 0; k < 2; k++) g.step(s, at(x, y));
    expect(s.stroke.length).toBeGreaterThan(0);
    g.step(s, at(0.5, 1.12));
    expect(s.stroke.length).toBeGreaterThan(0); // 닌자를 스쳐 지나가면 안 지워진다(원을 닫을 때)
    for (let k = 0; k < 20; k++) g.step(s, at(0.5, 1.12)); // 닌자 위에 ⅓초 머물면 지워진다
    expect(s.stroke).toHaveLength(0);
    for (const [x, y] of [[0.4, 1.0], [0.4, 0.8]]) for (let k = 0; k < 2; k++) g.step(s, at(x, y));
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(Math.hypot(s.nx - 0.4, s.ny - 0.8)).toBeLessThan(0.03); // 지운 뒤 새로 그은 길로만 간다
    const r = tryStage(BOTS.habit, 101, K('shield')); // 측정기: 60초 진전 없음 = 막힘(실패)
    expect(r.sec).toBeLessThan(120);
    // (M3 F2: 방패 앞 튕김을 걷어내서 '버릇 봇이 방패 판에서 진다'와 '연달아 튕기면 멈칫 없음'은 더 이상 규칙이 아니다 — 측정기가 막힘 없이 끝나는 것만 본다)
    expect(r.stall).toBe(false);
  });

  it('S012 알림·길잡이: 꾹 누른 길이 처음 덤불에 걸리면 알림이 줄 맨 앞에 바로 뜬다 · 1-2판은 꺾은 획을 긋기 전까지 셋 넘게 베는 ㄱ자 길이 있다', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const s = g.create(3);
    startStage(s, K('sword'));
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    s.foes = [];
    (s.nx = 0.5), (s.ny = 1.12), (s.g = 100);
    s.thorns = [{ x: 0.5, y: 0.92, r: 0.05 }];
    for (let k = 0; k < 8; k++) g.step(s, at(0.5, 0.75));
    expect(s.news?.text).toContain('빨간 덤불');
    const b = g.create(3);
    startStage(b, K('bend'));
    for (let k = 0; k < 90; k++) g.step(b, { tap: false, dir: 0, pointer: null });
    expect(b.bents).toBe(0);
    const before = b.best;
    const run = BOTS.smartStroke, rng = () => 0.5;
    for (let k = 0; k < 600 && b.bents === 0; k++) g.step(b, run.act(b, rng));
    expect(b.bents).toBeGreaterThan(0); // 꺾은 획을 그으면 길잡이가 꺼진다
    expect(b.best).toBeGreaterThanOrEqual(Math.max(3, before));
  });

  it('오너 질문 "어떨 때는 원, 어떨 때는 직선": 천천히 그려도(한 틱에 판 1%씩) 그은 원대로 획이 남는다', () => {
    const s = g.create(3);
    startStage(s, K('bend'));
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    s.foes = [];
    (s.nx = 0.5), (s.ny = 1.0), (s.g = 100);
    for (let i = 0; i <= 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      g.step(s, { tap: false, dir: 0, pointer: { x: 0.5 + Math.cos(a) * 0.1, y: (0.7 + Math.sin(a) * 0.1) / A } });
    }
    expect(s.stroke.length).toBeGreaterThanOrEqual(12);
    g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.trail!.legs.length).toBeGreaterThanOrEqual(12); // 원을 따라 돌진(전엔 곧은 줄 하나)
  });

  it('M2 S1 🍃 잎 너구리: 곧게 오는 칼은 휙 피해 옆으로 비켜 서고(먹 +7), 꺾어 들어온 칼에만 베인다 · 연타로는 시험 판 2-1을 못 깬다', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const go = (pts: number[][]) => {
      const s = g.create(3);
      startStage(s, K('bend'));
      for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      const f = s.foes[0];
      s.foes = [f];
      (f.k as string) = 'leaf';
      (f.x = 0.5), (f.y = 0.75), (s.nx = 0.5), (s.ny = 1.1), (s.g = 60), (s.inv = 0);
      for (const [x, y] of pts) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
      g.step(s, { tap: false, dir: 0, pointer: null });
      return { s, f };
    };
    const a = go([[0.5, 0.65]]); // 곧게
    expect(a.s.foes).toHaveLength(1);
    expect(Math.abs(a.f.x - 0.5)).toBeGreaterThan(0.05); // 휙 옆으로
    expect(a.s.events.some((e) => e.kind === 'dodge')).toBe(true);
    const b = go([[0.5, 1.1], [0.62, 0.95], [0.66, 0.82], [0.5, 0.75], [0.4, 0.72]]); // 옆으로 올라가 꺾어 들어가기
    expect(b.s.foes).toHaveLength(0);
    // M2 S2 손가락 시범: 휙이 나면 잎 길잡이가 켜지고 손가락 시범이 보인다(measureKit.demo = 그리기와 같은 판단)
    expect(a.s.leafGuide).toBe(true);
    expect(a.s.dodgeN).toBeGreaterThanOrEqual(1);
    STAGES.push(TRIAL[0]);
    try {
      const k = STAGES.length - 1;
      for (const sd of [101, 108, 115]) expect(tryStage(BOTS.spam, sd, k).ok).toBe(false);
      expect([101, 108, 115].filter((sd) => try3(BOTS.newbieLow, sd, k).ok).length).toBeGreaterThanOrEqual(2); // 시범만 가끔 따라 하는 처음 하는 사람도 깬다
      expect(tryStage(BOTS.smartStroke, 101, k).ok).toBe(true);
    } finally {
      STAGES.pop();
    }
  });

  it('M2 S3 온보딩: 1-1 둘째 웨이브(가로 넷)에서 꺾은 획을 긋기 전까지 손가락이 줄 끝으로 가서 꺾어 긋는 길(넷 다 베는)을 보여 준다 · 스위치로 끈다 · 새것 판은 짧은 카드 한 줄', () => {
    const s = g.create(3);
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    for (const f of s.foes) f.x = -1; // 첫 웨이브를 치운 셈
    s.foes = [];
    for (let k = 0; k < 200 && s.wave < 2; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.wave).toBe(2);
    const gd = measureKit.guide(s);
    expect(gd).not.toBeNull();
    expect(measureKit.demo(s)).toBe(true);
    ONBOARD.moveDemo = false;
    try {
      expect(measureKit.guide(s)).toBeNull();
    } finally {
      ONBOARD.moveDemo = true;
    }
    for (const d of STAGES.slice(1)) expect((d.card ?? '').replace(/[^가-힣]/g, '').length, d.key).toBeLessThanOrEqual(12);
  });

  it('M2 S4 부엉이 귀띔: 같은 판을 세 번 지면 묻고, 쓰면 길을 보여 주고 그 판은 ★★★가 없다 · 거절하면 그 시도엔 다시 안 묻는다 · 월드 잠금 18', () => {
    const s = g.create(5);
    startStage(s, K('sword'));
    let fails = 0;
    for (let t = 0; t < 60 * 400 && fails < 3; t++) {
      g.step(s, { tap: false, dir: 0, pointer: null }); // 가만히 서 있으면 진다
      if (s.phase === 'result' && !s.ok && s.pt === 1) fails++;
    }
    for (let t = 0; t < 400 && s.phase !== 'play'; t++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(s.failN).toBe(3);
    expect(s.owlAsk).toBe(true);
    useOwl(s, true);
    expect(s.owl && !s.owlAsk).toBe(true);
    for (let t = 0; t < 120; t++) g.step(s, { tap: false, dir: 0, pointer: null });
    expect(measureKit.guide(s)).not.toBeNull(); // 부엉이 길
    // 귀띔을 쓰고 깨면 ★★★ 없음(맞지 않아도)
    const w = g.create(7);
    startStage(w, K('bend'));
    useOwl(w, true);
    const r = tryStage(BOTS.smartStroke, 101, K('bend'), 300, 101, { owlNow: true });
    expect(r.ok && !r.s3).toBe(true);
    const n = g.create(5);
    startStage(n, K('sword'));
    n.owlAsk = true;
    useOwl(n, false);
    expect(n.owl || n.owlAsk).toBe(false);
    // 2-1에서 한 시도에 휙 세 번이면 묻는다(㉛)
    const l = g.create(3);
    startStage(l, K('bend'));
    for (let k = 0; k < 60; k++) g.step(l, { tap: false, dir: 0, pointer: null });
    const f = l.foes[0];
    l.foes = [f, l.foes[1]];
    (f.k as string) = 'leaf';
    for (let j = 0; j < 3; j++) {
      (f.x = 0.5), (f.y = 0.75), (l.nx = 0.5), (l.ny = 1.1), (l.g = 80), (l.inv = 0);
      for (let k = 0; k < 3; k++) g.step(l, { tap: false, dir: 0, pointer: { x: 0.5, y: 0.6 / A } });
      g.step(l, { tap: false, dir: 0, pointer: null });
      for (let k = 0; k < 20; k++) g.step(l, { tap: false, dir: 0, pointer: null });
    }
    expect(l.dodgeN).toBeGreaterThanOrEqual(3);
    expect(l.owlAsk).toBe(true);
    expect(WORLD_LOCK).toBe(18);
    expect(TRIAL.map((d) => d.key)).toEqual(['leaf', 'leafWait', 'leafShuri', 'smoke', 'leafShield', 'bamboo', 'roofs', 'jars', 'moon', 'boss2']); // M2 S5 월드 2: 2-1~2-5 · S7 2-6 🎋 · S8 2-7~2-9 섞기 · S9 2-10 큰 너구리
    expect(worldStars({ a: 3, b: 2 }, ['a', 'b', 'c'])).toBe(5);
  });

  it('M2 S6 🔔 종(보류): 한 획에 종 둘레를 따로 두 번 지나가야 쩍 · 한 번이면 댕(안 깨짐) · 폐기 기준에 걸려 2-6은 판 목록에서 뺐다', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const go = (pts: number[][]) => {
      const s = g.create(3);
      startStage(s, K('bend'));
      for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      const f = s.foes[0];
      s.foes = [f, s.foes[1]];
      (f.k as string) = 'bell';
      (f.x = 0.5), (f.y = 0.75), (s.nx = 0.5), (s.ny = 1.1), (s.g = 90), (s.inv = 0);
      for (const [x, y] of pts) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
      g.step(s, { tap: false, dir: 0, pointer: null });
      return { s, f };
    };
    const one = go([[0.5, 0.6]]); // 곧게 한 번
    expect(one.s.foes.includes(one.f)).toBe(true);
    expect(one.s.events.some((e) => e.kind === 'ding')).toBe(true);
    const two = go([[0.5, 1.1], [0.5, 0.95], [0.5, 0.8], [0.5, 0.62], [0.42, 0.72], [0.36, 0.85], [0.3, 0.95]]); // 너머까지 갔다가 되돌아 V
    expect(two.s.foes.includes(two.f)).toBe(false);
    expect(TRIAL.some((d) => d.key === 'bell')).toBe(false);
  });

  it('M2 S7 🎋 대나무: 꺾어 들어간 칼에 베이면 칼 간 쪽으로 쓰러져 덤불 너머 줄을 벤다(닌자는 덤불에 안 걸림) · 곧은 칼엔 툭(안 쓰러짐 · 헛방 벌 없음) · 2-6 · 대조 봇은 안 씀', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    const go = (pts: number[][]) => {
      const s = g.create(3);
      startStage(s, K('bend'));
      for (let k = 0; k < 60; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      s.foes = s.foes.slice(0, 3);
      s.foes.forEach((f, i) => ((f.k as string) = 'dummy', (f.x = 0.33 - i * 0.08), (f.y = 0.75)));
      s.thorns = [{ x: 0.42, y: 0.75, r: 0.04 }];
      s.bamboos = [{ id: 999, x: 0.5, y: 0.75, fall: -1, dx: 0, dy: -1, wob: -99 }];
      (s.nx = 0.5), (s.ny = 1.1), (s.g = 90), (s.inv = 0), (s.hits = 0), (s.whiffs = 0);
      for (const [x, y] of pts) for (let k = 0; k < 3; k++) g.step(s, at(x, y));
      g.step(s, { tap: false, dir: 0, pointer: null });
      return s;
    };
    const bent = go([[0.5, 1.1], [0.66, 0.95], [0.7, 0.82], [0.66, 0.75], [0.5, 0.75]]); // 옆으로 올라가 꺾어 왼쪽으로 대나무까지
    expect(bent.foes).toHaveLength(0); // 쓰러진 줄이 덤불 너머 셋을 벰
    expect(bent.events.some((e) => e.kind === 'fall' && e.n === 3)).toBe(true);
    expect(bent.hits).toBe(0); // 줄은 덤불을 넘어가고 닌자는 안 걸림
    for (const pts of [[[0.5, 0.7]], [[0.5, 1.0], [0.5, 0.9], [0.5, 0.8], [0.5, 0.7]]]) { // 톡 · 곧게 그은 획
      const st = go(pts);
      expect(st.foes).toHaveLength(3);
      expect(st.bamboos[0].fall).toBe(-1);
      expect(st.events.some((e) => e.kind === 'tok')).toBe(true);
      expect(st.whiffs).toBe(0); // 툭은 헛방 벌이 없다
      expect(st.bambooGuide).toBe(true); // 첫 툭 뒤 꺾는 길잡이
    }
    expect(TRIAL.map((d) => d.key).indexOf('bamboo')).toBe(5); // 2-6
    for (const d of TRIAL) expect(d.goal && d.ease && d.card).toBeTruthy(); // 🧪 S7: 줄 끝 주석이 뒤 설정을 지우던 것(2-4 goal 빠짐)
    for (const d of TRIAL) { // 🧪 S8: 판 글(이름·알림·카드·귀띔)에 그 판에 없는 장치 이름 금지(2-4 연기를 빼고 글이 남았던 것)
      const has = (k: string) => d.waves.some((w) => w.foes.some((f) => f[0] === k));
      const txt = [d.name, d.news, d.card, d.hint].join(' ');
      if (!d.smokes?.length) expect(txt).not.toContain('연기');
      if (!has('bamboo')) expect(txt).not.toContain('대나무');
      if (!has('leaf')) expect(txt).not.toMatch(/잎/);
    }
    STAGES.push(...TRIAL);
    try {
      const k = STAGES.length - TRIAL.length + 5;
      for (const sd of [101, 108, 115]) expect(tryStage(BOTS.spam, sd, k).ok).toBe(false);
      expect([101, 108, 115].filter((sd) => try3(BOTS.newbieLow, sd, k).ok).length).toBeGreaterThanOrEqual(2);
      expect([101, 108, 115, 122].map((sd) => tryStage(BOTS.humanTap, sd, k).tapFall).every((n) => n === 0)).toBe(true); // 곧은 획 쓰러짐 0
      const s0 = g.create(101); // 🧪 S7: 처음 쓰러뜨리기 전엔 '툭' 전에도 대나무 길과 손가락 시범
      startStage(s0, k);
      for (let i = 0; i < 90; i++) g.step(s0, { tap: false, dir: 0, pointer: null });
      expect(measureKit.guide(s0)).not.toBeNull();
      expect(measureKit.demo(s0)).toBe(true);
      setBambooOff(true); // ㊾ 대조 봇은 대나무를 안 쓴다
      expect([101, 108, 115].some((sd) => tryStage(BOTS.smartStroke, sd, k).bambooUse)).toBe(false);
    } finally {
      setBambooOff(false);
      STAGES.length -= TRIAL.length;
    }
  });

  it('M2 S9 2-10 큰 너구리: 1-10 대장 + 잎 성질 — 곧은 칼은 휙(목숨 그대로), 꺾어 들어온 칼에 한 대 · 연타로는 못 깬다', () => {
    const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y: y / A } });
    STAGES.push(...TRIAL);
    try {
      const k = STAGES.length - TRIAL.length + TRIAL.findIndex((d) => d.key === 'boss2');
      const go = (pts: number[][]) => {
        const s = g.create(3);
        startStage(s, k);
        for (let i = 0; i < 60; i++) g.step(s, { tap: false, dir: 0, pointer: null });
        const f = s.foes.find((q) => q.k === 'boss')!;
        s.foes = [f];
        (f.x = 0.5), (f.y = 0.75), (s.nx = 0.5), (s.ny = 1.1), (s.g = 90), (s.inv = 0);
        for (const [x, y] of pts) for (let i = 0; i < 3; i++) g.step(s, at(x, y));
        g.step(s, { tap: false, dir: 0, pointer: null });
        return { s, f };
      };
      const a = go([[0.5, 0.65]]); // 곧게
      expect(a.f.hp).toBe(4);
      expect(a.s.events.some((e) => e.kind === 'dodge')).toBe(true);
      const b = go([[0.5, 1.1], [0.62, 0.95], [0.66, 0.82], [0.5, 0.75], [0.4, 0.72]]); // 옆으로 올라가 꺾어 들어가기
      expect(b.f.hp).toBe(3);
      for (const sd of [101, 108, 115]) expect(tryStage(BOTS.spam, sd, k).ok).toBe(false);
      expect(tryStage(BOTS.smartStroke, 101, k).ok).toBe(true);
    } finally {
      STAGES.length -= TRIAL.length;
    }
  });

  it('S005 효과음: 시뮬·봇은 소리를 모른다(헤드리스로 한 판 돌려도 AudioContext 0) · 연쇄 음계는 5음계로 오르고 8번째부터 고정', () => {
    runBot(g, slowdashSmart, 5, 60 * 120);
    expect(sfx.live).toBe(false);
    sfx.play('slash', 3); // 깨우기 전에는 아무 일도 없다
    expect(sfx.live).toBe(false);
    expect([1, 2, 3, 8, 12].map(chainHz)).toEqual([587, 659, 784, 1568, 1568]);
    const tap = tryStage(tapEvery(48), 101, 2);
    expect(tap.dashes).toBeGreaterThan(0); // 탭 스윕 대조군이 실제로 움직인다
  });

  it('S006 한붓 봇: 장인 + 한붓은 꺾인 획을 실제로 쓰고 꺾인 획이 한 줄보다 많이 벤다 · 휘젓기 봇은 꺾인 획만 긋는다', () => {
    const a = [0, 1, 2, 3].map((k) => tryStage(BOTS.smartStroke, 101, k));
    expect(a.every((x) => x.ok)).toBe(true);
    const bent = a.filter((x) => x.bent > 0);
    expect(bent.length).toBeGreaterThan(0);
    expect(Math.max(...bent.map((x) => x.bentCut))).toBeGreaterThan(Math.max(...a.map((x) => x.lineCut)));
    const sc = tryStage(BOTS.scribble, 101, 1);
    expect(sc.dashes).toBeGreaterThan(0);
    expect(sc.bent).toBeGreaterThan(0.9);
  });

  it('장인 봇은 8판을 모두 지나간다 (콘텐츠가 풀린다)', () => {
    for (let k = 0; k < STAGES.length; k++) for (const seed of [11, 22]) expect(tryStage(slowdashSmart, seed, k).ok, `${k + 1}판 시드 ${seed}`).toBe(true);
  });

  it('M0 기준선: 숙련 격차 ≥ 3 · 처음 10초에 무작위가 안 맞는다 · 버릇 봇 ★3(3판~) < 50% · 무작위 1판 클리어', () => {
    const m = measure(4, ['smart', 'habit', 'habit2', 'random']);
    expect(m.gap).toBeGreaterThanOrEqual(3);
    expect(m.firstImpression.randomHurtIn10s).toBe(0);
    expect(m.habitStar3Max3plus.habit).toBeLessThan(0.5);
    expect(m.habitStar3Max3plus.habit2).toBeLessThan(0.5);
    expect((m.stages[0].random as { clear: number }).clear).toBeGreaterThanOrEqual(0.75);
    expect(runBot(g, slowdashRandom, 3, 60 * 600).s.stars).toBeGreaterThanOrEqual(0);
  });

  it('M1 S001 측정기: 사람 반응 봇 · 연타 · 버릇 ③④ · 처음 하는 사람이 있고, F5(느린 시간 낙차)·F6(연타)을 한 번에 낸다', () => {
    for (const b of ['human', 'humanNew', 'humanPro', 'humanTap', 'spam', 'habit3', 'habit4', 'newbie']) expect(BOTS[b], b).toBeDefined();
    const m = measure(2, ['smart', 'random', 'human', 'humanTap', 'spam']);
    expect(m.F5).not.toBeNull();
    expect(m.F6!.clear).toHaveLength(STAGES.length);
    // 사람 반응 봇(꾹 판)은 실제로 누른 채 겨눈다(평균 꾹 ≈ 반응 0.5초) · 탭 판은 1틱
    expect(m.F5!.holdAvg).toBeGreaterThan(0.3);
    expect((m.stages[0].humanTap as { holdAvg: number }).holdAvg).toBeLessThan(0.05);
  });

  it('처음 하는 사람은 같은 판을 3번까지 도전하고, 사람 반응 봇은 같은 시드면 같은 결과', () => {
    const a = try3(BOTS.newbie, 5, 0), b = tryStage(BOTS.human, 9, 1), c = tryStage(BOTS.human, 9, 1);
    expect(a.tries).toBeGreaterThanOrEqual(1);
    expect(a.tries).toBeLessThanOrEqual(3);
    expect([b.ok, b.sec, b.dashes, b.best]).toEqual([c.ok, c.sec, c.dashes, c.best]);
  });
});

describe('느린 시간 닌자 플레이 빌드', () => {
  const f = 'web/public/studio/slowdash/index.html';
  it('M2 S9 크기: 어느 판에도 없는 장치(🔔 종 · 거울 · 연기)는 플레이 빌드에서만 빠진다 — 판(월드 1 · 월드 2)에 그 장치가 하나라도 있으면 실패', () => {
    for (const d of [...STAGES, ...TRIAL]) {
      expect(d.mirrors?.length ?? 0).toBe(0);
      expect(d.smokes?.length ?? 0).toBe(0);
      expect(d.waves.some((w) => w.foes.some((q) => q[0] === 'bell'))).toBe(false);
    }
    const html = readFileSync(f, 'utf8');
    expect(html).not.toContain('__SHIP__'); // define가 먹었다
    expect(html).not.toContain('종은 두 번'); // 종 코드가 빠졌다
  });
  it('빌드가 있고 한 장으로 묶였다 (gzip ≤ 40KB)', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).toContain('<title>벽력일섬</title>'); // 💬 오너 11-20 "게임 제목은 벽력일섬으로 해줘"
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThanOrEqual(40 * 1024);
  });
  it('M3 S1 렉 막기(오너 "렉이 좀 걸리는거 같고"): 매 프레임 그림자 흐림·화면 채도 합성을 쓰지 않고, 느리면 해상도를 낮추는 장치가 있다', () => {
    const src = readFileSync('studio/slowdash/game.ts', 'utf8');
    expect(src).not.toMatch(/shadowBlur\s*=\s*(?!0\b)/); // 흐림 0이 아닌 값 금지
    expect(src).not.toMatch(/globalCompositeOperation\s*=\s*'saturation'/);
    const main = readFileSync('studio/slowdash/main.ts', 'utf8');
    expect(main).toMatch(/dprCap/);
  });
  it('M3 S2 도트(오너 "도트로 가자"): 주인공·태엽 병정 스프라이트는 32색 팔레트 글자만 쓰고, 위험 빨강(D)을 쓰지 않으며, 폰에서 크게 보인다', () => {
    expect(new Set(Object.values(PAL)).size).toBeLessThanOrEqual(32); // 색 32개(외곽선 k는 0과 같은 색)
    const grids = [0, 1, 2].map(heroGrid).concat([...SOLDIER].map(soldierGrid));
    for (const g of grids) for (const r of g) for (const c of r) {
      expect(c === '.' || c in PAL).toBe(true);
      expect(c).not.toBe('D'); // 빨강은 위험 표시에만
    }
    expect(heroGrid(0).length * PX).toBeGreaterThanOrEqual(0.19 * 390); // 주인공 키 ≈ 화면 폭 20%
    for (const k of ['dummy', 'sword', 'archer', 'shield']) expect(SOLDIER.has(k)).toBe(true);
    expect(readFileSync('studio/slowdash/game.ts', 'utf8')).toMatch(/loLayer\(LW, LH\)/); // 세상은 도트 캔버스에(렉 F13)
  });
  it('M3 S3 도트 배경(🧪 🔴1): 판 배경 세 곳 모두 32색 팔레트 글자만 쓰고(후광·그라데이션 0), 멈춘 시계탑 초침(청록)과 불 켜진 창이 있다', () => {
    for (const [place, v] of [[0, 0], [1, 0], [1, 1], [1, 2], [1, 3], [2, 0]]) { // M3 S7: 지붕 셋(푸른 · 갈색+굴뚝 · 밤+빨랫줄)
      const g = bgGrid(130, 198, place, 54, 170, v), all = g.flat();
      expect(all.length).toBe(130 * 198);
      expect(all.every((c) => c in PAL && c !== 'D')).toBe(true);
      expect(all).toContain('t'); // 시계탑 초침
      expect(all).toContain('o'); // 창 불빛
    }
    const src = readFileSync('studio/slowdash/game.ts', 'utf8');
    expect(src).not.toMatch(/function getBg|createRadialGradient/); // 옛 벡터 배경 굽기 · 매 프레임 원형 그라데이션 없음
  });
  it('M3 S11 렉(🧪 첫 떼기): 사건 글·알림 글은 표에서만 나오고, 그 표 전부를 (?twarm=1이면) 켠 뒤 틈틈이 같은 글꼴·같은 선 굵기로 화면 밖에 미리 그린다', () => {
    const src = readFileSync('studio/slowdash/game.ts', 'utf8'), main = readFileSync('studio/slowdash/main.ts', 'utf8');
    expect(src).not.toMatch(/\bsay\([^;]*, '[^']+', '#/); // say(…, '글', '#색', 크기) 같은 따로 쓴 글 없음 → POP 표
    expect(src).not.toMatch(/\bsee\(s, '\w+', '[^']/); // 알림 글은 TIP 표
    const wm = textWarm(390), has = (f: string, t: string, lw: number) => wm.some((q) => q.f === f && q.t === t && q.lw === lw);
    expect(has('800 18px system-ui, sans-serif', '아얏!', 3)).toBe(true); // 떠오르는 글(juice: 800 · 선 3)
    expect(has(`900 ${0.036 * 390}px system-ui, sans-serif`, '부엉!', 3)).toBe(true); // 부엉이(🧪 첫 떼기 4.2ms)
    expect(wm.some((q) => q.t === '싹쓸이!' && q.f.startsWith('900 24px') && q.lw === 6 && q.lj === 'round')).toBe(true); // 큰 순간 띠
    expect(wm.some((q) => q.t === '싹쓸이! 다음 한 획은 느린 시간이 안 줄어요' && q.mw)).toBe(true); // 알림 글(🧪 첫 떼기 9.1ms)
    expect(main).toMatch(/warmText\(warmC, /); // 화면 밖 캔버스에(판 캔버스엔 안 그림)
    expect(main).toMatch(/dt > Math\.max\(20, frameAvg \* 1\.1\)\) return/); // 그 기기의 평소 프레임보다 늦지 않은 프레임에만 · 한 조각씩(🧪 S11 1차: 켠 뒤 프레임이 길어짐)
    expect(main).toMatch(/if \(s\.down\) warmRest = 60;/); // 꾹·뗀 뒤 1초는 쉰다(🧪 S11: 켜자마자 떼기 켬 1/10 · 끔 6/10)
    expect(main).toMatch(/q\.get\('twarm'\) === '1'/); // M3 S12(📋 (92)): 켬/끔 잡음 안 · 켠 뒤 3초가 끔보다 낮음 → 기본 끔
  });
  it('M3 S12 꾹 글(🧪 S10 허들 2 숙련 ❌ · 오너 \'연출 과도\'): \'N명 한 줄!\' · \'스으…\' · \'휙! 꺾어요\' · \'방패에 튕겨요!\'는 위 하늘 두 줄에서만 그린다', () => {
    const src = readFileSync('studio/slowdash/game.ts', 'utf8');
    expect(src.match(/명 한 줄!`/g)?.length).toBe(1); // holdCap 한 곳
    expect(src).not.toMatch(/fillText\('스으…'|'휙! 꺾어요' :|fillText\('방패에 튕겨요!'/); // 닌자·적 옆에 따로 쓰던 것 없음
    expect(src).toMatch(/cy = Math\.max\(R\(0\.26\), s\.stage === 0 \? dy \+ Y\(HZ\) - R\(0\.13\) : dy \* 0\.75\) - dy/); // HUD·싹쓸이 칩 아래, 판 위 하늘(1-1은 지평선 바로 위)
    expect(readFileSync('studio/slowdash/index.html', 'utf8')).not.toMatch(/font-size:(\d|1[01])px/); // QC 4: 글자 12px 이상(🧪 S12: 판 고르기 별 이유 11px)
  });
  it('M3 F3 일섬(💬 오너 "한번에 베기 성공하면 … 화려한 연출"): 셋 이상 한 획만 · 시뮬은 안 건드림 · 움직임 줄이기를 따름 · 어둠·덮기는 늘어난 하늘까지', () => {
    const src = readFileSync('studio/slowdash/game.ts', 'utf8'), juice = readFileSync('studio/slowdash/juice.ts', 'utf8');
    expect(src).toMatch(/ISSEN = \{ n: 3,/); // 셋 이상만
    expect(src).toMatch(/prefers-reduced-motion: reduce/);
    expect(src).toMatch(/peak && since < ISSEN\.dark && !REDUCED/); // 어둠 컷은 정점(넷 이상·싹쓸이)에만 · 움직임 줄이기면 안 함
    expect(src.match(/fillRect\(-20, -20 - dy, w \+ 40, h \+ 40 \+ dy\)/g)?.length).toBeGreaterThanOrEqual(3); // 느린 시간 덮기 둘 + 일섬 어둠
    expect(src).not.toMatch(/fillRect\(-20, -20, w \+ 40, h \+ 40\)/); // 하늘에 경계선 남던 덮기 없음
    expect(juice).toMatch(/fillRect\(-w, -h, w \* 3, h \* 3\)/); // 번쩍도 화면 전체
  });
  it('M3 F3 \'AI 티\' ①(💬 오너 "AI로 제작된 티" → "계속 이어서 해"): 판 글은 도트 글 · 작게 굽는 글은 가늘게(🧪 겹획 메움) · 머리말 단추 글은 밝게 · 월드 2 번호는 패 · ★♥는 도트 맵', () => {
    const src = readFileSync('studio/slowdash/game.ts', 'utf8'), pix = readFileSync('studio/slowdash/pix.ts', 'utf8'), main = readFileSync('studio/slowdash/main.ts', 'utf8'), html = readFileSync('studio/slowdash/index.html', 'utf8');
    expect(main).toMatch(/pixelText\(ctx\)/); // 판 캔버스의 fillText·strokeText를 도트 글로
    expect(pix).toMatch(/cap = sz < 18 \? 500 : sz < 22 \? 600 : 800/); // '싹▇이'·'끝▇' 막기: 작게 구울수록 가늘게
    expect(pix).toMatch(/q = px >= 44 \? 2 : 1/); // 37px 제목도 2칸이면 '벽'이 메워졌음
    expect(html).toMatch(/\.tg button\{[^}]*color:#dfe6ff/); // 단추 글이 검정(바탕과 1.3:1)이던 것
    expect(main).toMatch(/pxLabel\(soundBtn,/);
    expect(src).toMatch(/pw = Math\.max\(R\(0\.07\), ctx\.measureText\(lab\)\.width \+ R\(0\.03\)\)/); // '2-10'이 동전 밖으로 삐져나오던 것
    expect(src).toMatch(/function starPath\(ctx: C2, x: number, y: number, r: number\) \{\n  iconAt\(/); // ★♥는 도트 맵(세상 캔버스에서는 한 칸 = 도트 한 칸) · 세상 속 arc는 아직 남음(② 다음 일)
    expect(src).toMatch(/function heartPath\(ctx: C2, x: number, y: number, r: number\) \{\n  iconAt\(/);
  });
  it('M3 S1 시안 모음: 스타일 넷(도트·3D·2.5D·2D)과 캐릭터 셋 그림이 있고, 모음 페이지가 일곱 장을 모두 가리킨다', () => {
    const dir = 'web/public/studio/slowdash/concepts/', page = readFileSync(dir + 'index.html', 'utf8');
    for (const img of ['a-pixel.png', 'b-3d.webp', 'c-2_5d.webp', 'd-2d.webp', 'cast1.webp', 'cast2.webp', 'cast3.webp']) {
      expect(existsSync(dir + img)).toBe(true);
      expect(page).toContain(`src="${img}"`);
    }
  });
});
