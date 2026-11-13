/** 스튜디오 양치기 멍멍: M0 프로토타입 이전(결정성·첫 판 쉬움·플레이 빌드) · M1-1 하트 없음·그 판만 다시·판 고정·별 따로 따기 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runBot } from '../studio/sheepdog/core.ts';
import { BLACK_TIP, COME_HOLD, goalLabels, hudState, medalOf, FLAG_SNAP, LATER, SKY, STAGES, WORLD_TIME, at as atField, blackCame, comeHold, jumpTo, preview, starCount, sheepdog as g, sheepdogGreedy, sheepdogRandom, sheepdogSmart, topOf, type DogState } from '../studio/sheepdog/game.ts';
import { mulberry32 } from '../studio/sheepdog/rng.ts';

const at = (x: number, y: number) => ({ tap: false, dir: 0 as const, pointer: { x, y } });
const up = { tap: false, dir: 0 as const, pointer: null };

describe('양치기 멍멍 시뮬', () => {
  it('같은 시드·같은 봇이면 같은 판', () => {
    const a = runBot(g, sheepdogSmart, 7, 60 * 60 * 6, 1), b = runBot(g, sheepdogSmart, 7, 60 * 60 * 6, 1);
    expect(a).toEqual(b);
  });

  it('W1은 8판, 짖으면 멍멍 수가 늘고 양이 움직인다', () => {
    expect(STAGES.length).toBe(8);
    const s = g.create(3), x0 = [...s.S.x], y0 = [...s.S.y];
    // 양 무리 바로 아래(화면 가운데)를 누르고 떼기
    for (let k = 0; k < 5; k++) g.step(s, at(0.5, 0.5));
    g.step(s, up);
    for (let k = 0; k < 80; k++) g.step(s, up);
    expect(s.S.used + (s.phase === 'result' ? 1 : 0)).toBeGreaterThan(0);
    expect(s.S.x.some((v, i) => v !== x0[i]) || s.S.y.some((v, i) => v !== y0[i])).toBe(true);
  });

  it('아무도 없는 곳에서는 멍멍을 쓰지 않는다 (킁킁)', () => {
    const s = g.create(3);
    g.step(s, at(0.05, 0.7));
    g.step(s, up);
    for (let k = 0; k < 60; k++) g.step(s, up);
    expect(s.S.used).toBe(0);
  });

  it('첫 판은 아무 데나 눌러도 거의 통과 (오너 기준 7)', () => {
    let ok = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const s = g.create(seed), rng = mulberry32(seed);
      for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) g.step(s, sheepdogRandom.act(s, rng));
      if (s.ok) ok++;
    }
    expect(ok).toBeGreaterThanOrEqual(16);
  });

  it('잘하는 봇은 판마다 별 셋을 딴다, par 여유는 0~1 (GDD §12)', () => {
    for (let k = 0; k < STAGES.length; k++) {
      const s = g.create(11);
      jumpTo(s, k);
      expect(s.stage).toBe(k);
      play(s, 'smart', 11);
      expect(s.ok, `${k + 1}판`).toBe(true);
      expect(s.got, `${k + 1}판 별`).toBe(7);
      expect(STAGES[k].par - s.S.used, `${k + 1}판 par 여유`).toBeGreaterThanOrEqual(0);
      expect(STAGES[k].par - s.S.used, `${k + 1}판 par 여유`).toBeLessThanOrEqual(1);
    }
  }, 60_000);
});

describe('M1-2 W1 아침 들판 (CONTENT.md W1)', () => {
  it('W1 8판이 CONTENT 표 순서와 같고, 프로토타입 P4~P8은 다음 월드용으로 남는다', () => {
    expect(STAGES.map((d) => d.name)).toEqual(['첫 울타리', '미리 보기', '흩어진 양', '까만 양', '끌어오기', '개울과 다리', '좁은 다리', '아침 축제']);
    // 📐 C014(F01): 1-4·1-5는 까만 양까지 넣어야 통과(규칙 '양을 모두'), 🖤 보너스 대신 🌼·🍀 (1-8은 C015에)
    expect(STAGES.map((d) => d.bonus)).toEqual(['flower', 'flower', 'clover', 'flower', 'clover', 'flower', 'clover', 'black']);
    expect(STAGES.map((d) => !!d.needBlack)).toEqual([false, false, false, true, true, false, false, false]);
    expect(LATER.map((d) => d.key)).toEqual(['goat', 'wolf', 'wind', 'twopens', 'night']);
  });

  it('울타리 뒤 끼임 0: 어떤 봇·어느 판에서도 흰 양이 목장 위 경계(울타리 뒤 가로대)보다 위로 못 간다 (📐 C012 ⓐ, 🧪 C011 1-5)', () => {
    for (let k = 0; k < STAGES.length; k++)
      for (const bot of [sheepdogRandom, sheepdogGreedy, sheepdogSmart]) {
        const s = g.create(50 + k);
        jumpTo(s, k);
        const top = topOf(s.F);
        for (let t = 0; t < 60 * 90 && s.phase !== 'result'; t++) {
          g.step(s, bot.act(s, mulberry32(50 + k)));
          for (let i = 0; i < s.F.n; i++) if (!s.F.black[i] && s.S.pen[i] < 0) expect(s.S.y[i], `${k + 1}판 양 ${i} y`).toBeGreaterThanOrEqual(top - 1e-6);
        }
      }
  }, 60_000);

  it('막힘 0: 미리 보고 한 수만 두는 그리디 봇도 W1 모든 판을 깬다 (FUN F10) · 소개 판이 아니면 그리디 ≥ par+1 (📐 C003, M1-7 ② 1-3·1-5)', () => {
    const intro = ['start', 'preview', 'black', 'river'];
    for (let k = 0; k < STAGES.length; k++) {
      const s = g.create(4);
      jumpTo(s, k);
      play(s, 'greedy', 4);
      expect(s.ok, `${k + 1}판`).toBe(true);
      if (!intro.includes(STAGES[k].key)) expect(s.S.used, `${k + 1}판 그리디 멍멍`).toBeGreaterThanOrEqual(STAGES[k].par + 1);
    }
  }, 60_000);

  it('1-4 까만 양은 흰 무리 바로 옆 — 무리를 미는 첫 짖기에 까만 양도 겪는다 (C005, FUN F3)', () => {
    const s = g.create(1);
    jumpTo(s, 3);
    const b = s.F.black.indexOf(true);
    const near = Math.min(...s.S.x.map((x, i) => (s.F.black[i] ? 9 : Math.hypot(x - s.S.x[b], s.S.y[i] - s.S.y[b]))));
    expect(near).toBeLessThan(0.2);
  });

  it('🍀 클로버: 흰 양이 지나가면 보너스 별', () => {
    const s = g.create(2);
    jumpTo(s, 2); // 흩어진 양
    play(s, 'smart', 2);
    expect(s.got & 4).toBe(4);
    expect(s.S.ch.some((v) => v)).toBe(true);
  });
});

describe('M1-2a 개울 판 도움 깃발 (📐 C004)', () => {
  /** 목장 좌표에서 한 번 눌렀다 떼고, 양이 다 멈출 때까지 */
  const barkAt = (s: DogState, fx: number, fy: number) => {
    g.step(s, atField(fx, fy));
    g.step(s, up);
    for (let t = 0; t < 200 && phaseOf(s) !== 'aim' && phaseOf(s) !== 'result'; t++) g.step(s, up);
  };
  const retry = (s: DogState) => g.step(s, { ...up, retry: true });

  it('1-6은 첫 풍덩 뒤, 1-7·1-8은 두 번째 풍덩 뒤에 깃발 ①② — 개울 없는 판엔 없다 (📐 C006: 1-8 되돌림)', () => {
    const s = g.create(7);
    jumpTo(s, 5);
    expect(s.flags.length).toBe(0);
    s.splashes = 1;
    retry(s);
    expect(s.flags.length).toBe(2);
    for (const [k, need] of [[6, 2], [7, 2]]) {
      jumpTo(s, k);
      s.splashes = need - 1;
      retry(s);
      expect(s.flags.length, `${k + 1}판 ${need - 1}번`).toBe(0);
      s.splashes = need;
      retry(s);
      expect(s.flags.length, `${k + 1}판 ${need}번`).toBe(2);
    }
    jumpTo(s, 2);
    s.splashes = 9;
    retry(s);
    expect(s.flags.length).toBe(0);
  });

  it('깃발 말은 판 시작 글씨가 걷힌 뒤 할아버지 말풍선으로 — HUD 칩 문구 = 결과 카드 캡션 (🧪·🎨 C009)', () => {
    const s = g.create(7);
    jumpTo(s, 5);
    s.splashes = 1;
    retry(s);
    expect(s.flags.length).toBe(2);
    expect(hudState(s).hint).toBeNull();
    for (let t = 0; t < 100; t++) g.step(s, up);
    expect(hudState(s).hint).toContain('깃발 ①');
    expect(hudState(s).goals.map((x) => x.label)).toEqual(goalLabels(STAGES[5]));
    expect(goalLabels(STAGES[5])[1]).toBe(`멍멍 ${STAGES[5].par}번`);
  });

  it('풍덩한 짖기마다 풍덩 이벤트가 하나(빠진 양 번호·개울 근처), 안 빠진 짖기엔 없다 (🧪 C006 → C010 M1-6 ③)', () => {
    const s = g.create(11), rng = mulberry32(4), seen = new Set<number>();
    let inc = 0;
    for (const k of [5, 6, 7]) {
      jumpTo(s, k);
      let prev = s.splashes;
      for (let t = 0; t < 60 * 90; t++) {
        g.step(s, sheepdogRandom.act(s, rng));
        if (s.splashes > prev) inc++;
        prev = s.splashes;
        for (const e of s.events)
          if (e.kind === 'splash' && !seen.has(e.t)) {
            seen.add(e.t);
            expect(s.S.fell[e.v!], `${k + 1}판 빠진 양`).toBeTruthy();
            expect(Math.abs(e.y - (s.F.river!.y0 + s.F.river!.y1) / 2)).toBeLessThan(0.12);
          }
      }
    }
    expect(inc).toBeGreaterThan(2);
    expect(seen.size).toBe(inc);
  });

  it('양 수 알약은 달아나는 동안 길에서 울타리에 닿은 양만 센다 — 짖는 틱에 미리 5/5로 튀지 않는다 (🎨 C011)', () => {
    const s = g.create(1);
    jumpTo(s, 0);
    for (let t = 0; t < 300 && phaseOf(s) !== 'aim'; t++) g.step(s, up);
    const p = sheepdogSmart.act(s, mulberry32(1));
    for (let t = 0; t < 300 && phaseOf(s) !== 'flee'; t++) g.step(s, t < 3 ? p : up);
    const seen: number[] = [];
    for (let t = 0; t < 120 && phaseOf(s) === 'flee'; t++) seen.push(hudState(s).sheepIn), g.step(s, up);
    expect(seen[0]).toBe(0);
    expect(seen.at(-1)).toBe(5);
    expect(seen.every((v, k) => k === 0 || v >= seen[k - 1])).toBe(true);
  });

  it('진짜 풍덩이 셈을 올리고, 판을 깨면 0으로', () => {
    const s = g.create(5);
    jumpTo(s, 5);
    for (let n = 0; n < 30 && s.splashes === 0; n++) {
      play(s, 'random', 60 + n);
      for (let t = 0; t < 200 && phaseOf(s) === 'result'; t++) g.step(s, up);
    }
    expect(s.splashes).toBeGreaterThan(0);
    expect(s.flags.length).toBe(2);
    play(s, 'smart', 1);
    expect(s.ok).toBe(true);
    expect(s.splashes).toBe(0);
  });

  it('깃발대로 두 번 짖은 상태 = 박사가 두 번 짖은 상태 (깃발 근처면 깃발 자리로 붙는다)', () => {
    const a = g.create(7);
    jumpTo(a, 5);
    a.splashes = 1;
    retry(a);
    const [f1, f2] = a.flags;
    barkAt(a, f1[0] + FLAG_SNAP * 0.6, f1[1]); // 조금 빗나가게 눌러도
    expect(a.flags).toEqual([f2]);
    barkAt(a, f2[0], f2[1] - FLAG_SNAP * 0.6);
    expect(a.flags.length).toBe(0);
    expect(a.helped).toBe(true);
    const b = g.create(7), rng = mulberry32(7);
    jumpTo(b, 5);
    while (b.S.used < 2 || phaseOf(b) !== 'aim') g.step(b, sheepdogSmart.act(b, rng));
    expect(pos(a)).toBe(pos(b));
  });

  it('깃발 근처를 누르고 있으면 미리 보기도 깃발 자리로 붙는다 — 미리 보기 = 실제 (FUN QA C004)', () => {
    const s = g.create(7);
    jumpTo(s, 6);
    s.splashes = 2;
    retry(s);
    const [f1] = s.flags;
    g.step(s, atField(f1[0] + FLAG_SNAP * 0.7, f1[1]));
    // 화면 그리기 없이: 누른 자리 → 짖는 자리 계산이 깃발과 같다
    g.step(s, up);
    expect([s.toX, s.toY]).toEqual(f1);
  });

  it('깃발 밖에서 짖으면 그 시도의 깃발은 모두 거둔다', () => {
    const s = g.create(7);
    jumpTo(s, 5);
    s.splashes = 1;
    retry(s);
    const [f1] = s.flags;
    barkAt(s, f1[0] + 0.15, Math.min(0.95, f1[1] + 0.05));
    expect(s.flags.length).toBe(0);
    expect(s.helped).toBe(false);
  });
});

describe('M1-5a 결과 카드 (C008)', () => {
  it('🏅: 한 시도에 ★★★면 gold, 깃발 도움을 받았거나 나눠 모은 ★★★면 grey, 아니면 없음', () => {
    const s = g.create(1);
    play(s, 'smart', 1);
    expect([s.got, medalOf(s)]).toEqual([7, 'gold']);
    s.helped = true;
    expect(medalOf(s)).toBe('grey');
    const r = g.create(1);
    jumpTo(r, 1);
    r.best[1] = 3;
    play(r, 'smart', 1);
    r.got = 3; // 이번 시도 ★★
    r.best[1] = 3;
    expect(medalOf(r)).toBe('none');
    r.best[1] = 7;
    expect(medalOf(r)).toBe('grey');
  });

  it('카드가 떠 있는 동안 강아지는 안 짖고, 다음은 RESULT_MIN 뒤부터 받는다', () => {
    const s = g.create(1);
    play(s, 'smart', 1);
    const used = s.S.used;
    g.step(s, { ...up, next: true }); // 너무 이르면 무시(별이 켜지는 중)
    expect(s.stage).toBe(0);
    for (let t = 0; t < 30; t++) g.step(s, atField(0.5, 0.6));
    expect([s.stage, s.S.used, s.phase]).toEqual([0, used, 'result']);
    g.step(s, { ...up, next: true });
    expect(s.stage).toBe(1);
  });
});

describe('M1-4 아트 (C007, 🎨)', () => {
  const lum = (hex: string) => {
    const c = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  it('W1 8판은 모두 같은 아침 키, 밤 판 없음', () => {
    expect(WORLD_TIME[0]).toBe(0);
    for (let k = 0; k < STAGES.length; k++) {
      const s = g.create(1);
      jumpTo(s, k);
      expect(s.F.night, `${k + 1}판`).toBe(false);
    }
  });
  it('까만 양 털은 W1 가까운 풀과 3:1 이상 (8판에서 풀에 묻히던 문제)', () => {
    expect(contrast('#4b4549', SKY[WORLD_TIME[0]][6])).toBeGreaterThanOrEqual(3);
  });
});

describe('판 알림 (C007)', () => {
  it("1-4 까만 양 설명은 '?!' 연출이 끝난 뒤에 뜬다 — 짖은 틱에 뜨지 않는다 (📐 C007)", () => {
    const s = g.create(1), rng = mulberry32(1);
    jumpTo(s, 3);
    expect(STAGES[3].news).not.toContain('거꾸로'); // 시작 알림은 놀람을 미리 말하지 않는다
    let fleeStart = -1, tipAt = -1;
    for (let t = 0; t < 60 * 60 && tipAt < 0; t++) {
      g.step(s, sheepdogNaiveLike(s, rng));
      if (phaseOf(s) === 'flee' && fleeStart < 0 && blackCame(s)) fleeStart = s.t;
      if (s.news?.text === BLACK_TIP) tipAt = s.t;
    }
    expect(fleeStart).toBeGreaterThan(0);
    expect(tipAt - fleeStart).toBeGreaterThanOrEqual(39);
  });

  it('판을 건너뛰어도 그 판의 알림이 먼저 뜬다 — 앞 판 알림이 줄 서서 밀려 나오지 않는다', () => {
    const s = g.create(1);
    for (const k of [2, 6, 7]) {
      jumpTo(s, k);
      g.step(s, up);
      expect(s.news?.text, `${k + 1}판`).toBe(STAGES[k].news);
    }
  });
});

describe('M1-3 숨은 규칙을 보이게 (C006)', () => {
  it('미리 보기 = 실제: 누르고 있을 때 보인 도착 자리·들어감·풍덩이 떼고 난 결과와 같다 (F8, 허들 ④)', () => {
    for (const k of [0, 3, 5, 7]) {
      const s = g.create(3), rng = mulberry32(3);
      jumpTo(s, k);
      for (let n = 0; n < 3 && phaseOf(s) === 'aim'; n++) {
        const inp = sheepdogRandom.act(s, rng); // 아무 데나 — 미리 보기는 어디서든 맞아야 한다
        if (!inp.pointer) { g.step(s, inp); continue; }
        g.step(s, inp);
        g.step(s, up);
        if (phaseOf(s) !== 'run') continue; // 목장 밖·울타리 안·킁킁
        const pv = preview(s, s.toX, s.toY);
        for (let t = 0; t < 300 && (phaseOf(s) === 'run' || phaseOf(s) === 'flee'); t++) g.step(s, up);
        expect(JSON.stringify([s.S.x, s.S.y, s.S.pen, s.S.fell]), `${k + 1}판`).toBe(JSON.stringify([pv.S.x, pv.S.y, pv.S.pen, pv.S.fell]));
        if (phaseOf(s) === 'result') break;
      }
    }
  });

  it('까만 양 필수 판: 흰 양만 다 들면 할아버지 말풍선이 그동안 내내 \'까만 양도 넣어야 통과\' (📐·🧪 C014: 숨은 규칙 0)', () => {
    const s = g.create(1);
    jumpTo(s, 3);
    expect(hudState(s).blackN).toBe(1);
    for (let t = 0; t < 600 && !(phaseOf(s) === 'aim' && s.F.black.every((b, i) => b || s.S.pen[i] >= 0)); t++) {
      const ws = s.F.black.some((b, i) => !b && s.S.pen[i] < 0);
      g.step(s, ws ? sheepdogNaiveLike(s, mulberry32(1)) : up);
    }
    expect(s.F.black.some((b, i) => b && s.S.pen[i] < 0)).toBe(true);
    for (let t = 0; t < 250; t++) g.step(s, up);
    expect(hudState(s).hint).toContain('까만 양도 넣어야 통과');
    expect(hudState(s).blackIn).toBe(0);
  });

  it("1-4: 까만 양이 온 짖기는 결과를 0.5초 늦게 낸다 — '?!'가 통과 축하에 묻히지 않게 (허들 ②)", () => {
    const s = g.create(1);
    jumpTo(s, 3);
    const rng = mulberry32(1);
    // 📐 C014: 1-4부터 까만 양까지 넣어야 통과 → 판을 끝내는 짖기는 까만 양을 부르는 짖기다. 그 마지막 달아나기만 잰다(앞 짖기의 달아나기를 더하지 않음)
    let fleeTicks = 0, came = false, wasFlee = false;
    for (let t = 0; t < 60 * 60 && phaseOf(s) !== 'result'; t++) {
      g.step(s, sheepdogNaiveLike(s, rng));
      const fl = phaseOf(s) === 'flee';
      if (fl && !wasFlee) (fleeTicks = 0), (came = false);
      if (fl) (fleeTicks++, (came ||= blackCame(s) && comeHold(s)));
      wasFlee = fl;
    }
    expect(s.ok).toBe(true);
    expect(came).toBe(true);
    expect(fleeTicks).toBeGreaterThanOrEqual(40 + COME_HOLD - 1);
  });
});

/** 흰 무리 바로 아래를 누르는 순진한 손 (1-4 테스트용) */
function sheepdogNaiveLike(s: DogState, _rng: () => number) {
  if (phaseOf(s) !== 'aim' || s.down) return up;
  const ws = s.S.x.map((x, i) => [x, s.S.y[i], i] as const).filter(([, , i]) => !s.F.black[i] && s.S.pen[i] < 0);
  if (!ws.length) {
    // 흰 양이 다 들고 까만 양이 남으면(📐 C014 까만 양 필수) 까만 양과 문 사이에서 부른다
    const b = s.F.black.findIndex((bk, i) => bk && s.S.pen[i] < 0), pn = s.F.pens[0], gx = (pn.gx0 + pn.gx1) / 2, gy = pn.y1;
    if (b < 0) return up;
    const dx = gx - s.S.x[b], dy = gy - s.S.y[b], l = Math.hypot(dx, dy) || 1;
    return atField(s.S.x[b] + (dx / l) * 0.1, s.S.y[b] + (dy / l) * 0.1);
  }
  const cx = ws.reduce((a, w) => a + w[0], 0) / ws.length, cy = ws.reduce((a, w) => a + w[1], 0) / ws.length;
  return atField(cx, cy + 0.12);
}

/** 결과(통과/실패)가 나올 때까지 봇으로 한 시도 */
function play(s: DogState, who: 'smart' | 'greedy' | 'random', seed: number) {
  const rng = mulberry32(seed), bot = who === 'smart' ? sheepdogSmart : who === 'greedy' ? sheepdogGreedy : sheepdogRandom;
  for (let t = 0; t < 60 * 120 && s.phase !== 'result'; t++) g.step(s, bot.act(s, rng));
}
const phaseOf = (s: DogState) => s.phase; // 시뮬이 step 안에서 phase를 바꾸므로 TS 좁히기를 피한다
const pos = (s: DogState) => JSON.stringify([s.S.x, s.S.y]);

describe('M1-1 시스템: 실패는 벌이 아니다 (GDD §4.3~4.5, FUN F7)', () => {
  it('하트가 없다 — 몇 번을 실패해도 끝나지 않는다', () => {
    const s = g.create(5);
    expect('hearts' in s).toBe(false);
    jumpTo(s, 2); // 개울과 다리: 아무 데나 봇은 거의 못 깬다
    const start = pos(s);
    let fails = 0;
    for (let n = 0; n < 6; n++) {
      play(s, 'random', 40 + n);
      if (s.phase === 'result' && !s.ok) fails++;
      for (let t = 0; t < 400 && s.phase === 'result'; t++) g.step(s, up);
      if (!s.ok) {
        expect(s.dead).toBe(false);
        expect(s.stage).toBe(2); // 그 판만 다시
        expect(pos(s)).toBe(start); // 같은 배치로
      }
    }
    expect(fails).toBeGreaterThanOrEqual(4);
  });

  it('실패하면 1초(60틱) 안에 같은 판이 다시 시작된다 (📐 C003)', () => {
    const s = g.create(5);
    jumpTo(s, 2);
    play(s, 'random', 41);
    expect(s.ok).toBe(false);
    let t = 0;
    while (s.phase === 'result') (g.step(s, up), t++);
    expect(t).toBeLessThanOrEqual(60);
    expect([s.stage, s.S.used, s.phase]).toEqual([2, 0, 'aim']);
  });

  it('판 배치는 고정 — 시드가 달라도 같은 판 (다시 하면 배운 게 통한다)', () => {
    for (let k = 0; k < STAGES.length; k++) {
      const a = g.create(1), b = g.create(98765);
      jumpTo(a, k);
      jumpTo(b, k);
      expect(pos(a), `${k + 1}판`).toBe(pos(b));
    }
  });

  it('↺ 다시(retry)는 언제든 지금 판을 처음부터', () => {
    const s = g.create(3);
    jumpTo(s, 2); // 흩어진 양: 한 번에 안 끝나는 판
    const start = pos(s), rng = mulberry32(3);
    while (s.S.used === 0) g.step(s, sheepdogSmart.act(s, rng));
    while (s.phase !== 'aim') g.step(s, up);
    expect(pos(s)).not.toBe(start);
    g.step(s, { ...up, retry: true });
    expect([s.stage, s.S.used, s.phase, pos(s)]).toEqual([2, 0, 'aim', start]);
  });

  it('별은 판마다 셋을 따로 기록하고 최고 기록에 합친다', () => {
    const s = g.create(3);
    jumpTo(s, 1);
    s.best[1] = 4; // 지난 시도에서 보너스(까만 양)만 땄다
    play(s, 'smart', 3);
    expect([s.got, s.best[1], s.gain, s.stars]).toEqual([7, 7, 2, 3]);
    // 이미 다 딴 판을 덜 잘 깨도 별은 줄지 않는다
    for (let seed = 1; seed < 30; seed++) {
      const r = g.create(3);
      jumpTo(r, 1);
      r.best[1] = 6;
      play(r, 'random', seed);
      if (!r.ok) continue;
      expect(r.best[1]).toBe(6 | r.got);
      expect(r.stars).toBe(starCount(r.best[1]));
      return;
    }
    throw new Error('아무 데나 봇이 2판을 한 번도 못 깸');
  });

  it('통과하면 다음 판, 마지막 판을 깨면 끝', () => {
    const s = g.create(9);
    play(s, 'smart', 9);
    for (let t = 0; t < 300; t++) g.step(s, up);
    expect([s.stage, s.phase]).toEqual([0, 'result']); // C008: 통과하면 카드에서 기다린다 — 저절로 안 넘어감
    g.step(s, { ...up, next: true });
    expect(s.stage).toBe(1);
    jumpTo(s, STAGES.length - 1);
    play(s, 'smart', 9);
    for (let t = 0; t < 40 && phaseOf(s) === 'result' && !s.dead; t++) g.step(s, { ...up, next: true });
    expect([s.won, s.dead]).toEqual([true, true]);
  });
});

describe('플레이 빌드', () => {
  const path = 'web/public/studio/sheepdog/index.html';
  it('index.html 한 장, gzip 60KB 이하, 시작 버튼과 캔버스', () => {
    expect(existsSync(path)).toBe(true);
    const html = readFileSync(path, 'utf8');
    expect(gzipSync(html).length).toBeLessThan(60 * 1024);
    expect(html).toContain('id="start"');
    expect(html).toContain('id="game"');
    expect(html).not.toContain('/*BUNDLE*/');
    // 🎨 C010: ↺ 버튼 type 따옴표가 빠져 접근성 이름이 사라졌던 것 — 버튼 속성 값에 다른 속성이 섞이지 않는다
    expect(html).not.toMatch(/<button[^>]*="[^"]*\s[a-z-]+="/);
  });
});
