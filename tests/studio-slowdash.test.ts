/** 스튜디오 느린 시간 닌자 (M0~): 결정성 · 판별 시작 · 취소 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/slowdash/core.ts';
import { ONBOARD, STAGES, STRIKE, TRIAL, WORLD_LOCK, measureKit, missOf, useOwl, worldStars, slowdash as g, slowdashRandom, slowdashSmart, startStage } from '../studio/slowdash/game.ts';
import { BOTS, measure, tapEvery, try3, tryStage } from '../studio/slowdash/funqa.ts';
import { chainHz, sfx } from '../studio/slowdash/sfx.ts';

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

  it('S003 헛방: 아무것도 못 벤 획은 헛방으로 세고 근처 칼잡이가 바로 칼을 든다 · 방패 바로 앞 0길이 떼기는 취소가 아니라 튕김(헛방)', () => {
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
    // 방패 바로 앞: 길이 0이어도 '튕김' 사건이 나고 헛방으로 센다
    const t = g.create(9);
    startStage(t, K('shield'));
    for (let k = 0; k < 80; k++) g.step(t, { tap: false, dir: 0, pointer: null });
    const sh = t.foes.find((f) => f.k === 'shield')!;
    sh.fa = Math.atan2(t.ny - sh.y, t.nx - sh.x);
    t.nx = sh.x + Math.cos(sh.fa) * 0.062;
    t.ny = sh.y + Math.sin(sh.fa) * 0.062;
    const w0 = t.whiffs;
    g.step(t, { tap: false, dir: 0, pointer: { x: sh.x, y: sh.y / A } });
    g.step(t, { tap: false, dir: 0, pointer: null });
    expect(t.events.some((e) => e.kind === 'bounce' && e.t === t.t)).toBe(true);
    expect(t.whiffs).toBe(w0 + 1);
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
    expect(r.ok).toBe(false);
    // S011 압박: 0.2초 안에 또 아무것도 못 벤 튕김이면 멈칫·무적이 없다(방패 앞 연타로 세상을 멈춰 버티던 구멍) — 버릇 봇은 이제 막히지 않고 진다
    expect(r.stall).toBe(false);
    const b = g.create(3);
    startStage(b, K('shield'));
    for (let k = 0; k < 400 && !b.foes.some((f) => f.k === 'shield' && f.st !== 0); k++) g.step(b, { tap: false, dir: 0, pointer: null });
    const sh = b.foes.find((f) => f.k === 'shield')!;
    (b.nx = sh.x), (b.ny = sh.y + 0.12), (sh.fa = Math.PI / 2), (b.g = 100), (b.inv = 0);
    const tap = () => (g.step(b, at(sh.x, sh.y - 0.05)), g.step(b, { tap: false, dir: 0, pointer: null }));
    tap();
    expect(b.freeze).toBeGreaterThan(0); // 한 번 튕김은 멈칫(그대로)
    for (let k = 0; k < 4; k++) g.step(b, { tap: false, dir: 0, pointer: null });
    tap();
    expect(b.freeze).toBe(0);
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
    expect(worldStars({ a: 3, b: 2 }, ['a', 'b', 'c'])).toBe(5);
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
  it('빌드가 있고 한 장으로 묶였다 (gzip ≤ 40KB)', () => {
    expect(existsSync(f)).toBe(true);
    const html = readFileSync(f, 'utf8');
    expect(html).toContain('<title>느린 시간 닌자</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(gzipSync(html).length).toBeLessThanOrEqual(40 * 1024);
  });
});
