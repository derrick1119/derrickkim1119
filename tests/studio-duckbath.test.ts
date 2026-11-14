/** 스튜디오 욕조 물결 오리 (M0~): 결정성 · 하트 없는 판 다시하기 · 봇 밸런스 하한 · 플레이 빌드 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { CRISIS_DELAY, FAUCET, SLOTS, STAGES, WORLDS, advance, crisisShown, jitFor, starChips, duckbath as g, duckbathCasual, duckbathRandom, duckbathSmart, failText, hintPoint, previewPaths, startStage } from '../studio/duckbath/game.ts';
import { OLD_IDS, SAVE_KEY, makeStore } from '../studio/duckbath/save.ts';
import { mulberry32 } from '../engine/rng.ts';
import { play } from '../studio/duckbath/funqa.ts';

describe('욕조 물결 오리 시뮬', () => {
  it('같은 시드·같은 입력이면 같은 판', () => {
    const a = play(duckbathSmart, 7), b = play(duckbathSmart, 7);
    expect([a.score, a.sec, a.stages.length]).toEqual([b.score, b.sec, b.stages.length]);
  });

  it('같은 자리를 치면 같은 결과 (물결 규칙이 읽힌다 = 결정적)', () => {
    const run = () => {
      const s = g.create(3);
      for (let k = 0; k < 40; k++) g.step(s, { tap: false, dir: 0, pointer: k < 5 ? { x: 0.5, y: 0.6 } : null });
      for (let k = 0; k < 200; k++) g.step(s, { tap: false, dir: 0, pointer: null });
      return s.objs.map((o) => [o.x.toFixed(5), o.y.toFixed(5), o.st]);
    };
    expect(run()).toEqual(run());
  });

  it('실패해도 게임이 끝나지 않고 그 판만 다시 (D001, 오너 기준 7)', () => {
    const s = g.create(5), idle = { tap: false, dir: 0 as const, pointer: null };
    s.taps = 0; // 톡을 다 쓴 상태로 만들어 실패시킨다
    let fails = 0, prev = s.phase;
    for (let k = 0; k < 60 * 60 && fails < 4; k++) {
      g.step(s, idle);
      if (prev === 'play' && s.phase === 'result') fails++;
      if (s.phase === 'play' && s.pt === 1) s.taps = 0;
      prev = s.phase;
    }
    expect(fails).toBe(4);
    expect(g.over(s)).toBe(false);
    expect(s.stage).toBe(0);
    expect(s.stageTries).toBeGreaterThanOrEqual(4);
  });

  describe('쏙·꿀꺽 = 톡 1개 잃고 수도꼭지에서 뿅 (D002, CONTENT §0)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const drainStage = () => {
      const s = g.create(9);
      startStage(s, 2); // 3판: 배수구
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      return s;
    };
    it('배수구에 빠진 오리는 사라지지 않고 수도꼭지에서 다시 나온다, 톡 −1 · 쓴 톡 +1', () => {
      const s = drainStage(), dr = s.L.drains[0], o = s.objs[0], t0 = s.taps, u0 = s.used;
      o.x = dr.x;
      o.y = dr.y;
      g.step(s, idle);
      expect(o.st).toBe(-1);
      expect([o.x, o.y]).toEqual([FAUCET.x, FAUCET.y]);
      expect(s.taps).toBe(t0 - 1);
      expect(s.used).toBe(u0 + 1);
      expect(s.sucks).toBe(1);
    });
    it('톡이 0이면 0에서 멈춘다(음수 없음)', () => {
      const s = drainStage(), dr = s.L.drains[0], o = s.objs[1];
      s.taps = 0;
      o.x = dr.x;
      o.y = dr.y;
      g.step(s, idle);
      expect(s.taps).toBe(0);
      expect(o.st).toBe(-1);
    });
    it('수도꼭지 자리가 둥지에 닿는 판이면 판 시작 자리로 (공짜 입성 금지)', () => {
      const s = g.create(9);
      startStage(s, 0); // 1판: 뒤 가운데 둥지가 수도꼭지 앞에 있다
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      s.L.drains.push({ x: 0.5, y: 0.6, r: 0.035, pr: 0.05, pw: 0 });
      const o = s.objs[1], sx = o.sx, sy = o.sy;
      o.x = 0.5;
      o.y = 0.6;
      g.step(s, idle);
      expect([o.x, o.y]).toEqual([sx, sy]);
    });
    it('2-1(색깔): 두 오리 한가운데를 한 톡 치면 둥지에 드는 오리가 0 — 가운데 톡은 틀린 답 (D003 CONTENT v0.2)', () => {
      const A = g.aspect!, PX = (x: number, y: number) => 0.5 + (x - 0.5) * (0.74 + 0.14 * (y / 1.2)), PY = (y: number) => 0.36 + y * 0.66;
      for (const seed of [1000, 1007, 1014]) {
        const s = g.create(seed);
        startStage(s, STAGES.findIndex((d) => d.id === '2-1')); // D009: 판이 늘어 인덱스 대신 판 id
        const [a, b] = s.objs.filter((o) => o.k === 0), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
        g.step(s, { tap: false, dir: 0, pointer: { x: PX(cx, cy), y: PY(cy) / A } });
        for (let k = 0; k < 600; k++) g.step(s, idle);
        expect(s.objs.filter((o) => o.k === 0 && o.st >= 0).length).toBe(0);
      }
    });
    it('판 질문 한 줄이 판 1~4에 있다 (한 판 = 한 질문)', () => {
      for (let i = 0; i < 4; i++) expect(STAGES[i].ask?.length ?? 0).toBeGreaterThan(5);
    });
  });

  it('황금 꼴찌 위기(D009, ART 12장): 남은 보통 오리 1 + 황금이 물 위면 켜지고, 황금이 둥지에 들면 바로 꺼진다', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const s = g.create(3);
    startStage(s, 0);
    while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
    g.step(s, idle);
    expect(s.crisisT).toBe(-1);
    const ducks = s.objs.filter((o) => o.k === 0), gold = s.objs.find((o) => o.k === 1)!;
    for (const o of ducks.slice(1)) o.st = 0; // 확인용: 한 마리만 남기고 둥지에
    g.step(s, idle);
    expect(s.crisisT).toBeGreaterThanOrEqual(0);
    expect(crisisShown(s)).toBe(false); // 🧪 D009: 순간 번쩍임은 안 보인다
    const on = s.crisisT;
    for (let k = 0; k < CRISIS_DELAY; k++) g.step(s, idle);
    expect(s.crisisT).toBe(on); // 켜진 틱을 기억(말풍선 90틱)
    expect(crisisShown(s)).toBe(true);
    gold.st = 0;
    g.step(s, idle);
    expect(s.crisisT).toBe(-1);
  });

  describe('💤 잠꾸러기 (D013, CONTENT §2: 처음 맞은 물결엔 깨기만 · 자는 동안 꼼짝 안 함)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const ready = () => {
      const s = g.create(3);
      startStage(s, 0);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      const [a, b, c] = s.objs.filter((o) => o.k === 0), gold = s.objs.find((o) => o.k === 1)!;
      c.st = gold.st = 0; // 확인용: 두 마리만 물 위에
      Object.assign(a, { zz: 1, x: 0.5, y: 0.6, vx: 0, vy: 0 });
      Object.assign(b, { x: 0.62, y: 0.6, vx: 0, vy: 0 });
      return { s, a, b };
    };
    it('자는 오리는 다른 오리가 부딪혀도 그 자리 그대로 — 부딪힌 쪽이 튕긴다', () => {
      const { s, a, b } = ready();
      b.vx = -0.012;
      for (let k = 0; k < 30; k++) g.step(s, idle);
      expect([a.x, a.y, a.zz]).toEqual([0.5, 0.6, 1]);
      expect(b.x).toBeGreaterThan(0.55);
      expect(b.vx).toBeGreaterThanOrEqual(0);
    });
    it('처음 닿은 물결엔 깨기만(안 밀림), 깬 뒤 다음 물결엔 밀린다', () => {
      const { s, a } = ready();
      s.rings.push({ id: s.rid++, x: 0.4, y: 0.6, r: 0, hit: [0, 0, 0, 0, 0] });
      let k = 0;
      while (a.zz && k++ < 60) g.step(s, idle);
      expect(a.zz).toBe(0);
      expect([a.x, a.y, a.vx, a.vy]).toEqual([0.5, 0.6, 0, 0]);
      s.rings = [{ id: s.rid++, x: 0.4, y: 0.6, r: 0, hit: [0, 0, 0, 0, 0] }];
      for (k = 0; k < 20; k++) g.step(s, idle);
      expect(a.x).toBeGreaterThan(0.5);
    });
    it('자는 오리는 배수구에도 안 끌린다', () => {
      const s = g.create(9);
      startStage(s, 2);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      const dr = s.L.drains[0], o = s.objs[0];
      Object.assign(o, { zz: 1, x: dr.x + dr.pr * 0.5, y: dr.y, vx: 0, vy: 0 });
      for (let k = 0; k < 30; k++) g.step(s, idle);
      expect([o.x, o.y, o.st]).toEqual([dr.x + dr.pr * 0.5, dr.y, -1]);
    });
  });

  describe('🎈 물풍선 (D015, CONTENT §2: 진짜 물결 앞머리가 지나가면 팡 · 그 자리에서 찰박 · 그늘이면 안 터짐 · 한 번만 · 연쇄)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const ready = (i: number) => {
      const s = g.create(3);
      startStage(s, i);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      return s;
    };
    it('물결이 닿으면 한 번 터져 그 자리에서 새 물결이 생기고, 다시는 안 터진다', () => {
      const s = ready(0);
      s.L.balloons = [{ x: 0.5, y: 0.25 }];
      s.rings = [{ id: s.rid++, x: 0.5, y: 0.45, r: 0, hit: [0, 0, 0, 0, 0] }];
      let k = 0;
      while (!(s.popped & 1) && k++ < 80) g.step(s, idle);
      expect(s.popped & 1).toBe(1);
      expect(s.rings.some((r) => r.x === 0.5 && r.y === 0.25)).toBe(true);
      const n = s.rings.length;
      s.rings.push({ id: s.rid++, x: 0.5, y: 0.45, r: 0, hit: [0, 0, 0, 0, 0] });
      for (k = 0; k < 40; k++) g.step(s, idle);
      expect(s.rings.filter((r) => r.x === 0.5 && r.y === 0.25).length).toBeLessThanOrEqual(1);
      expect(n).toBeGreaterThan(0);
    });
    it('풍선 물결이 다른 풍선을 터뜨린다(연쇄) — 첫 물결이 닿지 않는 풍선도', () => {
      const s = ready(0);
      s.L.balloons = [{ x: 0.3, y: 0.6 }, { x: 0.3, y: 0.2 }];
      s.rings = [{ id: s.rid++, x: 0.9, y: 0.6, r: 0.25, hit: [0, 0, 0, 0, 0] }];
      for (let k = 0; k < 150; k++) g.step(s, idle);
      expect(s.popped).toBe(3);
    });
    it('섬 그늘에 있는 풍선은 안 터진다', () => {
      const s = ready(0);
      s.L.islands = [{ x: 0.5, y: 0.5, r: 0.09 }];
      s.L.balloons = [{ x: 0.5, y: 0.66 }];
      s.rings = [{ id: s.rid++, x: 0.5, y: 0.3, r: 0, hit: [0, 0, 0, 0, 0] }];
      for (let k = 0; k < 60; k++) g.step(s, idle);
      expect(s.popped).toBe(0);
    });
  });

  describe('🐥 오리 가족 줄 · 상어 여럿 (D016, CONTENT §2: 아기는 물결에 안 밀리고 앞을 졸졸 · 앞이 둥지에 들면 따라 들어감)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const withStage = (patch: Record<string, unknown>, f: (s: ReturnType<typeof g.create>) => void) => {
      const keep = { ...STAGES[0] };
      Object.assign(STAGES[0], patch);
      try {
        const s = g.create(3);
        startStage(s, 0);
        while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
        f(s);
      } finally {
        for (const k of Object.keys(patch)) delete (STAGES[0] as unknown as Record<string, unknown>)[k];
        Object.assign(STAGES[0], keep);
      }
    };
    it('아기는 앞 오리 뒤에 줄지어 나오고, 물결에 안 밀린다', () =>
      withStage({ chicks: [[0, 2]] }, (s) => {
        const kids = s.objs.filter((o) => o.lead >= 0), lead = s.objs[0];
        expect(kids.length).toBe(2);
        expect(Math.hypot(kids[0].x - lead.x, kids[0].y - lead.y)).toBeCloseTo(0.06, 5);
        s.L.nests = [];
        for (const o of s.objs) if (o.lead < 0 && o !== lead) o.st = 0; // 확인용: 다른 것은 치움
        lead.zz = 1; // 앞 오리는 자게 해서(첫 물결엔 안 밀림) 아기가 따라 움직일 일이 없게
        Object.assign(lead, { x: 0.3, y: 0.6, st: -1 });
        Object.assign(kids[0], { x: 0.36, y: 0.6, st: -1 });
        Object.assign(kids[1], { x: 0.42, y: 0.6, st: -1 });
        const [x0, y0] = [kids[1].x, kids[1].y];
        s.rings = [{ id: s.rid++, x: kids[1].x - 0.05, y: kids[1].y, r: 0, hit: [0, 0, 0, 0, 0] }];
        for (let k = 0; k < 10; k++) g.step(s, idle);
        expect(Math.hypot(kids[1].x - x0, kids[1].y - y0)).toBeLessThan(1e-6);
      }));
    it('앞 오리가 밀려 가면 0.06 간격으로 졸졸 따라온다', () =>
      withStage({ chicks: [[0, 2]] }, (s) => {
        const kids = s.objs.filter((o) => o.lead >= 0), lead = s.objs[0];
        s.L.nests = [];
        for (const o of s.objs) if (o.lead < 0 && o !== lead) o.st = 0;
        Object.assign(lead, { x: 0.3, y: 0.6, st: -1 });
        Object.assign(kids[0], { x: 0.36, y: 0.6, st: -1 });
        Object.assign(kids[1], { x: 0.42, y: 0.6, st: -1 });
        lead.y = 0.3; // 앞 오리가 0.3 밀려 감
        for (let k = 0; k < 200; k++) g.step(s, idle);
        expect(Math.hypot(kids[0].x - lead.x, kids[0].y - lead.y)).toBeLessThan(0.07);
        expect(Math.hypot(kids[1].x - kids[0].x, kids[1].y - kids[0].y)).toBeLessThan(0.07);
      }));
    it('앞 오리가 둥지에 들면 아기도 따라 들어가 판을 깰 수 있다(오리 수에 셈)', () =>
      withStage({ chicks: [[0, 1]] }, (s) => {
        const kid = s.objs.find((o) => o.lead >= 0)!, lead = s.objs[0];
        lead.st = 0;
        for (let k = 0; k < 400 && kid.st < 0; k++) g.step(s, idle);
        expect(kid.st).toBe(0);
        expect(starChips(s).ducksAll).toBe(s.objs.filter((o) => o.k === 0).length);
      }));
    it('🧪 D016 차단: 앞 오리가 다 들고 톡이 0이어도 아기가 걷는 동안은 실패가 아니다 — 걸어 들어가 깬다', () => {
      const i = STAGES.findIndex((d) => d.chicks?.length);
      const s = g.create(3);
      startStage(s, i);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      s.objs.filter((o) => o.k === 0 && o.lead < 0).forEach((o, j) => Object.assign(o, { st: j % s.L.nests.length, x: s.L.nests[j % s.L.nests.length].x, y: s.L.nests[j % s.L.nests.length].y }));
      Object.assign(s, { taps: 0, used: 3, lastTap: s.t - 40 });
      for (let k = 0; k < 2000 && s.phase === 'play'; k++) g.step(s, idle);
      expect([s.phase, s.ok]).toEqual(['result', true]);
    });
    it('🧪 D016 차단: 숙련 봇의 내다보기가 아기 입성까지 본다 — 아기 판에서도 ★★★(황금 꼴찌 아님)', { timeout: 30_000 }, () => {
      const i = STAGES.findIndex((d) => d.chicks?.length);
      let gold = 0;
      for (let k = 0; k < 3; k++) {
        const s = g.create(1000 + 7 * k), rng = mulberry32(k + 1);
        startStage(s, i);
        for (let f = 0; f < 60 * 120 && s.phase === 'play'; f++) g.step(s, duckbathSmart.act(s, rng));
        if (s.ok && s.starOk[2]) gold++;
      }
      expect(gold).toBe(3); // 🧪 D017: '3시드 중 ≥ 1'은 약함 → 3시드 다 ★3 (n300 탐침 3-7 숙련 ★3 299/300)
    });
    it('🧪 D017 조건부 해제(테스트 3): 화면 미리 보기 경로가 아기 입성까지 간다 — 앞 오리가 든 뒤 걷는 아기의 끝이 둥지', () => {
      const i = STAGES.findIndex((d) => d.chicks?.length);
      const s = g.create(3);
      startStage(s, i);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      s.objs.filter((o) => o.k === 0 && o.lead < 0).forEach((o, j) => Object.assign(o, { st: j % s.L.nests.length, x: s.L.nests[j % s.L.nests.length].x, y: s.L.nests[j % s.L.nests.length].y }));
      const kids = s.objs.flatMap((o, j) => (o.lead >= 0 ? [j] : []));
      expect(kids.length).toBeGreaterThan(0);
      const paths = previewPaths(s, 0.5, 1.1);
      for (const j of kids) expect(paths[j].end).toBeGreaterThanOrEqual(0);
    });
    it('📋 D018 기록 ①: 다 깨고 결과 카드에서 상한에 걸린 런은 잘림이 아니다 (funqa v1.17 b — 완주 1.02 버그)', { timeout: 60_000 }, () => {
      const full = play(duckbathSmart, 1000);
      expect(full.won).toBe(true);
      const r = play(duckbathSmart, 1000, full.sec - 2 / 60); // 끝(dead) 2틱 전에 상한 — 이미 다 깼고 결과 카드 중
      expect([r.won, r.cut]).toEqual([true, false]);
      expect(play(duckbathSmart, 1000, 60).cut).toBe(true); // 1분 상한이면 판 중간에 잘림
    });
    it('상어 여럿(sharks[])이 다 나온다', () =>
      withStage({ sharks: [[0.2, 0.9], [0.8, 0.9]] }, (s) => {
        expect(s.objs.filter((o) => o.k === 3).length).toBe(2);
      }));
  });

  it('판 흔들기는 (시드, 판 id)로만 정해진다 — 판을 끼워 넣어도 다른 판의 흔들림·뒤집힘이 그대로 (D010)', () => {
    const s = g.create(1007);
    STAGES.forEach((d, i) => expect(s.jit[i]).toEqual(jitFor(1007, d.id)));
    const before = jitFor(1007, '2-9');
    STAGES.splice(3, 0, { ...STAGES[0], id: '1-9' }); // 가짜 판을 앞에 끼운다
    try {
      const t = g.create(1007);
      expect(t.jit[STAGES.findIndex((d) => d.id === '2-9')]).toEqual(before);
    } finally {
      STAGES.splice(3, 1);
    }
    expect(jitFor(1007, '2-9')).not.toEqual(jitFor(1007, '3-2'));
  });

  it('셋째 별 칩: 깼는데 황금이 물 위면 꺼짐(bad), 황금이 먼저 들면 켜짐 (D009 goldLost 정리)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    for (const goldIn of [false, true]) {
      const s = g.create(3);
      startStage(s, 0);
      while (s.phase !== 'play' || s.pt < 2) g.step(s, idle);
      const gold = s.objs.find((o) => o.k === 1)!;
      if (goldIn) gold.st = 0;
      for (const o of s.objs.filter((o) => o.k === 0)) o.st = 0; // 확인용: 보통 오리를 모두 둥지에 → 판 끝
      for (let k = 0; k < 3 && s.phase === 'play'; k++) g.step(s, idle);
      expect(s.phase).toBe('result');
      const c = starChips(s);
      expect([c.okk[2], c.bad[2]]).toEqual(goldIn ? [true, false] : [false, true]);
    }
  });

  describe('결과·실패 카드 버튼 (D004)', () => {
    const idle = { tap: false, dir: 0 as const, pointer: null };
    const clear1 = (s: ReturnType<typeof g.create>) => {
      for (const o of s.objs) if (o.k === 0 || o.k === 1) o.st = 0; // 확인용: 오리를 모두 둥지에
      for (let k = 0; k < 5 && s.phase === 'play'; k++) g.step(s, idle);
    };
    it('브라우저(manual)는 결과에서 버튼을 기다린다 — 저절로 넘어가지 않는다', () => {
      const s = g.create(4);
      s.manual = true;
      clear1(s);
      expect(s.phase).toBe('result');
      for (let k = 0; k < 600; k++) g.step(s, idle);
      expect([s.phase, s.stage]).toEqual(['result', 0]);
      advance(s, 'next');
      expect([s.phase, s.stage]).toEqual(['play', 1]);
    });
    it("같은 판을 '다시' 깨도 별은 판별 최고만 센다 (두 번 쌓이지 않음)", () => {
      const s = g.create(4);
      s.manual = true;
      clear1(s);
      const once = s.stars;
      advance(s, 'retry');
      expect([s.phase, s.stage]).toEqual(['play', 0]);
      clear1(s);
      expect(s.stars).toBe(once);
    });
    it('↺2 손가락: 같은 판을 두 번 넘게 실패하면 첫 톡 자리를 보여 준다(그 전엔 없음)', () => {
      const s = g.create(4);
      startStage(s, STAGES.findIndex((d) => d.id === '2-4')); // D009: 판 id로 (옛 5판)
      expect(hintPoint(s)).toBeNull();
      s.stageTries = 2;
      const p = hintPoint(s)!;
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    });
    it("깬 판을 '다시' 하면 ↺2 손가락은 안 뜬다 (별 사냥의 첫 수를 공짜로 주지 않음)", () => {
      const s = g.create(4);
      s.manual = true;
      s.stageTries = 3;
      clear1(s);
      advance(s, 'retry');
      expect(hintPoint(s)).toBeNull();
    });
  });

  it('캐주얼 봇(상식으로 톡)은 1~2판을 첫 시도에 깬다', { timeout: 60_000 }, () => {
    for (const seed of [3, 4, 5]) {
      const r = play(duckbathCasual, seed);
      expect(r.stages.find((l) => l.stage === 1)?.ok).toBe(true);
      expect(r.stages.find((l) => l.stage === 2)?.ok).toBe(true);
    }
  });

  it('숙련 봇은 모든 판을 깬다 (모든 판이 풀린다)', { timeout: 60_000 }, () => {
    for (const seed of [11, 22, 33]) {
      const r = play(duckbathSmart, seed);
      expect(r.won).toBe(true);
      expect(r.stages.filter((l) => l.ok).length).toBe(STAGES.length);
    }
  });

  it('첫 판은 아무렇게나 해도 대부분 깬다 (오너 기준 7)', { timeout: 60_000 }, () => {
    const runs = Array.from({ length: 10 }, (_, k) => play(duckbathRandom, 500 + k));
    const cleared = runs.filter((r) => r.stages.some((l) => l.stage === 1 && l.ok)).length;
    expect(cleared).toBeGreaterThanOrEqual(8);
  });

  it('잘하는 사람이 확실히 더 높다 (고민 거리, 오너 기준 6)', { timeout: 60_000 }, () => {
    const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const smart = med([1, 2, 3, 4, 5].map((k) => play(duckbathSmart, 900 + k).score));
    const rnd = med([1, 2, 3, 4, 5].map((k) => play(duckbathRandom, 900 + k).score));
    expect(smart).toBeGreaterThan(rnd * 3);
  });
});

describe('저장·판 고르기 (D005 → D007 판 id)', () => {
  const IDS = STAGES.map((d) => d.id);
  const fake = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m } as unknown as Storage & { m: Map<string, string> };
  };
  it('판을 깨면 다음 판이 열리고, 다시 열어도 남아 있다 (최고 별만)', () => {
    const ls = fake(), a = makeStore(IDS, () => ls);
    expect(a.persistent).toBe(true);
    expect(a.open).toBe(1);
    a.clear('1-1', 2);
    a.clear('1-1', 1); // 낮은 별로 다시 깨도 최고 별 유지
    expect([a.stars('1-1'), a.open]).toEqual([2, 2]);
    const b = makeStore(IDS, () => ls);
    expect([b.stars('1-1'), b.open]).toEqual([2, 2]);
    b.clear(IDS[IDS.length - 1], 3);
    expect(b.open).toBe(IDS.length); // 마지막 판 너머로 열리지 않는다
  });
  it('옛 번호 저장(ver 1)은 판 id로 옮긴다 — 판 순서가 바뀌어도 별이 그 판에 남는다 (CONTENT v0.3 §5)', () => {
    expect(OLD_IDS.every((id) => IDS.includes(id))).toBe(true);
    const ls = fake();
    ls.m.set(SAVE_KEY, JSON.stringify({ ver: 1, best: [3, 2, 1, 3, 2, 1, 0, 2], open: 8 }));
    const a = makeStore(IDS, () => ls);
    expect(OLD_IDS.map((id) => a.stars(id))).toEqual([3, 2, 1, 3, 2, 1, 0, 2]); // 옛 8판(비누) = 2-9, 옛 7판(물줄기) = 3-4
    expect(a.open).toBe(IDS.indexOf('3-2') + 2); // 깬 판 중 가장 뒤(3-2)의 다음 판까지
    expect(JSON.parse(ls.m.get(SAVE_KEY)!)).toMatchObject({ ver: 2, best: { '1-1': 3, '2-9': 2, '3-2': 1 } }); // 새 모양으로 고쳐 쓴다
    ls.m.set(SAVE_KEY, JSON.stringify({ ver: 2, best: { '1-1': 9, '9-9': 3, '1-2': -1, '2-1': 'x' } }));
    expect(makeStore(IDS, () => ls).data.best).toEqual({ '1-1': 3 }); // 모르는 판·이상한 별은 버리거나 깎는다
  });
  it('localStorage가 막혀도(접근 예외·쓰기 예외·깨진 데이터) 메모리로 계속 간다', () => {
    const thrower = makeStore(IDS, () => { throw new Error('SecurityError'); });
    expect(thrower.persistent).toBe(false);
    expect(() => thrower.clear('1-1', 3)).not.toThrow();
    expect(thrower.open).toBe(2);
    const full = fake();
    full.setItem = () => { throw new Error('QuotaExceeded'); };
    const q = makeStore(IDS, () => full);
    expect(() => q.clear('1-2', 1)).not.toThrow();
    const bad = fake();
    bad.m.set(SAVE_KEY, '{not json');
    expect(makeStore(IDS, () => bad).open).toBe(1);
  });
  it('실패 카드: 주범이 쓴 톡의 25% 미만이면 톡 바닥 + 그 판의 교훈, 이상이면 주범 제목 (테스트로 옮긴 v1.4 N4)', () => {
    const s = g.create(2), i = IDS.indexOf('2-9'); // 옛 8판(비누) — D007부터 2-9
    startStage(s, i);
    Object.assign(s, { used: 12, sucks: 1, chomps: 0 });
    expect(failText(s)).toMatchObject({ kind: 'taps', tip: STAGES[i].hint });
    Object.assign(s, { sucks: 2 }); // 12톡 중 2톡 = 17% → 아직 '톡 바닥' (🧪 D005: 2톡 조항 뺌)
    expect(failText(s).kind).toBe('taps');
    Object.assign(s, { sucks: 3 }); // 25%
    expect(failText(s).kind).toBe('suck');
    Object.assign(s, { used: 4, sucks: 0, chomps: 1 });
    expect(failText(s).kind).toBe('chomp');
    // D011 N6-a → D012: 실패할 때마다(런 전체) 제목이 돌아간다(팁은 그대로)
    Object.assign(s, { used: 12, sucks: 0, chomps: 0 });
    const titles = [1, 2, 3, 4].map((k) => (Object.assign(s, { tries: k }), failText(s))); // D012: 런 전체 실패 수로 돌림
    expect(new Set(titles.slice(0, 3).map((f) => f.title)).size).toBe(3);
    expect(titles[3].title).toBe(titles[0].title);
    expect(new Set(titles.map((f) => f.tip)).size).toBe(1);
  });
});


describe('판 데이터 검증 (D007 뼈대, CONTENT v0.3 §5 — 판이 늘 때마다 같이 돈다)', () => {
  const idle = { tap: false, dir: 0 as const, pointer: null };
  const num = (id: string) => id.split('-').map(Number);
  it('판 id는 겹치지 않고 욕실 × 칸 안, 놀이 순서 = 욕실 순서', () => {
    const ids = STAGES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[1-9]\d*-[1-9]\d*$/);
      const [w, k] = num(id);
      expect(w).toBeLessThanOrEqual(WORLDS.length);
      expect(k).toBeLessThanOrEqual(SLOTS);
    }
    const order = ids.map((id) => num(id)[0] * 100 + num(id)[1]);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
  it('새것 간격 ≤ 4판 — 1번 칸부터 빈 칸 없이 이어진 만든 판 구간에서 (CONTENT v0.3 §1, D011 1욕실 완성)', () => {
    const slot = (id: string) => { const [w, k] = num(id); return (w - 1) * SLOTS + k; };
    const built = new Map(STAGES.map((d) => [slot(d.id), d]));
    let n = 1;
    while (built.has(n + 1)) n++;
    expect(n).toBeGreaterThanOrEqual(SLOTS); // 1욕실 10판이 다 있다
    const seen = new Set<string>();
    let last = 1;
    for (let k = 1; k <= n; k++) {
      const d = built.get(k)!;
      if (d.key && !seen.has(d.key)) {
        seen.add(d.key);
        expect(k - last, `${d.id} 새것 '${d.key}'`).toBeLessThanOrEqual(4);
        last = k;
      }
    }
  });
  it('들 수 없는 둥지·갈 곳 없는 오리가 없다 — 색 둥지엔 그 색 오리, 부두엔 배 (D011 도달 불가 둥지 검사)', () => {
    for (const d of STAGES) {
      for (const n of d.nests) {
        if (n[4]) expect(!!d.boat, `${d.id} 부두`).toBe(true);
        else if (n[3] >= 0) expect(d.ducks.some((q) => q[2] === n[3]), `${d.id} 색 ${n[3]} 둥지`).toBe(true);
      }
      for (const q of d.ducks) expect(d.nests.some((n) => !n[4] && (n[3] < 0 || n[3] === q[2])), `${d.id} 오리 색 ${q[2]}`).toBe(true);
      if (d.boat) expect(d.nests.some((n) => n[4]), `${d.id} 배`).toBe(true);
    }
  });
  it('모든 판에 판 질문(ask)과 교훈(hint) 한 줄', () => {
    for (const d of STAGES) {
      expect(d.ask?.length ?? 0, d.id).toBeGreaterThan(5);
      expect(d.hint.length, d.id).toBeGreaterThan(5);
    }
  });
  it('시작 자리: 오리·황금·배·상어가 둥지·섬·배수구 안에서 시작하지 않는다 (뒤집기·흔들기 뒤, 시드 8개)', () => {
    for (let seed = 1; seed <= 8; seed++)
      for (let i = 0; i < STAGES.length; i++) {
        const s = g.create(seed);
        startStage(s, i);
        for (const o of s.objs) {
          const at = `${STAGES[i].id} 시드 ${seed} (${o.x.toFixed(2)}, ${o.y.toFixed(2)})`;
          for (const n of s.L.nests) expect(Math.hypot(o.x - n.x, o.y - n.y), `둥지 ${at}`).toBeGreaterThan(n.r);
          for (const l of s.L.islands) expect(Math.hypot(o.x - l.x, o.y - l.y), `섬 ${at}`).toBeGreaterThan(l.r);
          for (const dr of s.L.drains) expect(Math.hypot(o.x - dr.x, o.y - dr.y), `배수구 ${at}`).toBeGreaterThan(dr.r);
        }
      }
  });
  it('가만히 두면 아무 일도 없다 — 저절로 깨지거나 쏙 빠지는 판 없음 (4초, 시드 8 — 흔들기·뒤집기로 둥지 입성 거리에 닿는 자리를 잡는다, D009)', () => {
    for (let i = 0; i < STAGES.length; i++)
    for (let seed = 1; seed <= 8; seed++) {
      const s = g.create(seed);
      startStage(s, i);
      for (let k = 0; k < 240; k++) g.step(s, idle);
      expect(s.phase, `${STAGES[i].id} 시드 ${seed}`).toBe('play');
      expect(s.objs.filter((o) => o.k !== 3 && o.st !== -1).length, `${STAGES[i].id} 시드 ${seed}`).toBe(0);
    }
  });
});
describe('플레이 빌드', () => {
  const path = 'web/public/studio/duckbath/index.html';
  it('빌드가 있고 한 장짜리 HTML, gzip 60KB 이하', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(html).toContain('<title>욕조 물결 오리</title>');
    expect(html).not.toContain('/*BUNDLE*/');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
  });
});
