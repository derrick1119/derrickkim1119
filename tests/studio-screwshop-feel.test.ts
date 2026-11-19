/** 스튜디오 나사 풀기 공방 M3 ⑥(오너 "연출이 중간에 느려지거나 렉이 걸리는 부분"): 일부러 넣는 멈춤 정책 단언 — ✏️ S059 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Juice } from '../studio/screwshop/juice.ts';
import { KB, LOCK, RES_BY, STAGES, resSlots, TRAY_WARN, hamOver, lockedW, missGoal, nextLocked, screwshop, screwshopSmart, setLearn, startStage, starKinds, starsOf, gapOf, worldStars } from '../studio/screwshop/game.ts';
import { knowE, runA, screwshopNewbie, starFloor, trayRead, tryStage } from '../studio/screwshop/funqa.ts';
import { mulberry32 } from '../studio/screwshop/rng.ts';
import { bonkSemi } from '../studio/screwshop/sfx.ts';

/** 그리기 호출을 모두 삼키는 가짜 캔버스(멈춤 · 쿨다운 틱만 본다) */
const ctx = new Proxy({}, { get: () => () => undefined, set: () => true }) as unknown as CanvasRenderingContext2D;
const src = (f: string) => readFileSync(new URL(`../studio/screwshop/${f}`, import.meta.url), 'utf8');

describe('나사 풀기 공방 멈춤(히트스톱) 정책', () => {
  it('멈춘 뒤 n + 12틱 동안 온 멈춤은 무시한다(툭툭 끊김 없음) · 0은 무시 · 줄인 움직임이면 멈추지 않는다', () => {
    const j = new Juice();
    j.hold(4);
    expect(j.stop).toBe(4);
    j.hold(6);
    expect(j.stop).toBe(4);
    j.render(ctx, 390, 740, 15);
    j.hold(6);
    expect(j.stop).toBe(4);
    j.render(ctx, 390, 740, 1);
    j.hold(5);
    expect(j.stop).toBe(5);
    const z = new Juice();
    z.hold(0);
    expect([z.stop, z.cd]).toEqual([0, 0]);
    const c = new Juice();
    c.calm = true;
    c.hold(5);
    expect(c.stop).toBe(0);
  });

  it('멈춤을 거는 곳은 쾅 · 마지막 쏙 · 큰 한 방(5개↑ · 💥7) 넷뿐이고 6틱을 넘지 않는다', () => {
    const g = src('game.ts'), calls = [...g.matchAll(/fx\.hold\(([^)]*)\)/g)].map((m) => m[1]);
    expect(calls).toEqual(['5', '[0, 3, 4, 4][lv]', '6', 'h >= 5 ? 4 : 0']);
    const lines = g.split('\n').filter((l) => l.includes('fx.hold('));
    expect(lines.map((l) => (l.includes('lastIn') ? 'last' : l.includes("cue('bonk'") ? 'bonk' : l.includes('💥') ? 'big7' : l.includes("cue('shot'") || l.includes('fx.ring(x, y, \'#8fe3ff\'') ? 'shot' : '?'))).toEqual(['last', 'bonk', 'big7', 'shot']);
  });

  it('결과 화면에서는 시뮬을 멈추지 않고, 누르면 멈춤이 바로 풀리며, 슬로모는 없다', () => {
    const m = src('main.ts');
    expect(m).toContain("if (j?.stop && s.phase !== 'result')");
    expect(m).toMatch(/const j = peek\(s\);\s*if \(j\) j\.stop = 0;/);
    expect(m).not.toMatch(/slow(mo|Mo)\b/);
  });
});

describe('결과 카드 한 줄(✏️ S060 · 🧪 S060 🔴 · M2′ 오너 "조건을 못알아먹겠어")', () => {
  it('28판 모두 놓친 별의 조건 낱말로 시작한다(★2 빈칸 · 쾅 / ★3 빈칸 · 한 번에 · 톡 · 연달아)', () => {
    const word = { bonk: '쾅', gap: '빈칸', shot: '한 번에', tap: '톡', streak: '연달아' } as const;
    for (const d of STAGES) {
      const [k2, k3] = starKinds(d), a = missGoal(d, false), b = missGoal(d, true);
      expect(a.startsWith('★2 ') && a.includes(word[k2]), `${d.slot} ${a}`).toBe(true);
      expect(b.startsWith('★3 ') && b.includes(word[k3]), `${d.slot} ${b}`).toBe(true);
      expect(/\d+\/\d+/.test(a + b), `${d.slot} 진행 숫자 없음`).toBe(false);
    }
  });
});

describe('글자 크기 · 소리(✏️ S061 · M3 ③ 옛 ⑯ · ⑤)', () => {
  it('390 폭에서 글자 하한 12px · 칩 숫자 ≥ 17px · 도구 버튼 ≥ 19px', () => {
    const g = src('game.ts');
    expect([...g.matchAll(/const font = \(sz: number[^\n]*max\((\d+), R\(sz\)\)/g)].map((m) => +m[1]).every((v) => v >= 12)).toBe(true);
    expect(g).toMatch(/const fit = [^\n]*max\(12, \(max\(12, R\(sz\)\)/);
    const chip = g.slice(g.indexOf("font(0.038, 900);\n      ctx.fillStyle = '#ffd166';"), g.indexOf("if (hint) say('💡 ✕')"));
    expect(+(/font\((0\.\d+), 900\);\n      ctx\.fillStyle = '#fff6e0'/.exec(chip)?.[1] ?? 0) * 390).toBeGreaterThanOrEqual(17);
    const tool = g.slice(g.indexOf("btnPlank(ctx, bx, ty - bh / 2, bw, bh, gold);"));
    expect(+(/font\((0\.\d+), 900\)/.exec(tool)?.[1] ?? 0) * 390).toBeGreaterThanOrEqual(19);
  });

  it('소리 신호마다 합성이 다르다(같은 소리 둘 0) · 리빌 소리(슈욱 · 똑)도 있다', () => {
    const f = src('sfx.ts'), body = f.slice(f.indexOf('const SYNTH'), f.indexOf('\n};', f.indexOf('const SYNTH')));
    const keys = [...body.matchAll(/^  (\w+)\(t/gm)].map((m) => m[1]);
    const parts = body.split(/^  \w+\(t[^)]*\) \{$/m).slice(1).map((x) => x.replace(/\/\/.*$/gm, '').replace(/\s+/g, ''));
    expect(keys).toEqual(expect.arrayContaining(['bonk', 'star', 'clear', 'snap', 'rise', 'fail', 'jam', 'in']));
    expect(parts.length).toBeGreaterThanOrEqual(keys.length - 1);
    expect(keys.length).toBeGreaterThan(15);
    expect(new Set(parts).size).toBe(parts.length);
  });
});

describe('누르는 자리(✏️ S061 · M3 ③ 터치 ≥ 44px)', () => {
  it('3번 진 뒤 💡 귀띔 단추를 받는 띠가 390 폭에서 44px 이상이고 금 버튼 쪽으로 넘지 않는다', () => {
    const m = /s\.ay \* A - HINT_Y > -(0\.\d+) && s\.ay \* A - HINT_Y < (0\.\d+)/.exec(src('game.ts'));
    expect(m).not.toBeNull();
    const up = +m![1], down = +m![2];
    expect((up + down) * 390).toBeGreaterThanOrEqual(44);
    expect(up).toBeLessThanOrEqual(0.02);
  });
});

describe('쾅 음높이(✏️ S061 · M3 ⑤ · 오너 "망치를 잘 풀었을 때 타격감")', () => {
  it('홑 쾅은 단계마다 ≥ +2반음, 같은 톡 연쇄 쾅은 쾅마다 오른다', () => {
    expect(bonkSemi(2) - bonkSemi(1)).toBeGreaterThanOrEqual(2);
    expect(bonkSemi(3) - bonkSemi(2)).toBeGreaterThanOrEqual(2);
    for (let ci = 1; ci < 4; ci++) expect(bonkSemi(4 * (ci + 1) + 1)).toBeGreaterThan(bonkSemi(4 * ci + 1));
  });
});

describe('판 고르기 그림(✏️ S061 · 🧪 S061 🔴②)', () => {
  it('첫 그림만 남겨도 VS16을 지켜 흑백 글리프가 되지 않는다', () => {
    const m = src('main.ts');
    expect(m).toContain('/^\\p{Extended_Pictographic}\\uFE0F?/u.exec(d.emoji)');
    const first = (e: string) => /^\p{Extended_Pictographic}\uFE0F?/u.exec(e)?.[0] ?? e;
    for (const d of STAGES) if (d.emoji.includes('\uFE0F') && d.emoji.indexOf('\uFE0F') === [...d.emoji][0].length) expect(first(d.emoji).endsWith('\uFE0F'), d.slot).toBe(true);
  });

  it('배율 올려 보기는 이번 판 첫 톡 전에만(세션 톡 수가 아니라)', () => {
    expect(src('main.ts')).toContain("s.phase === 'play' && s.S.taps === 0");
  });
});

describe('햄스터가 나사를 가리지 않는다(✏️ S062 · 🧪 S062 🟡①)', () => {
  it('햄스터 몸(왼쪽 아래)에 걸리는 나사가 남아 있으면 비쳐 그리고, 다 빠지면 다시 또렷하다', () => {
    const shown: string[] = [];
    for (const [k, d] of STAGES.entries()) {
      const s = screwshop.create(7);
      if (k) startStage(s, k);
      const L = s.L;
      for (let i = 0; i < L.N; i++) if (Math.abs(L.px[i] - 0.11) < 0.1 && L.py[i] > 1.05) expect(hamOver(L, 0), `${d.slot} #${i}`).toBe(true);
      expect(hamOver(L, L.all), d.slot).toBe(false);
      if (hamOver(L, 0)) shown.push(d.slot);
    }
    expect(shown).toEqual(expect.arrayContaining(['1-8', '1-9', '2-3', '2-5', '2-7', '2-10', '3-2', '3-6']));
    expect(src('game.ts')).toMatch(/ctx\.globalAlpha = hamOver\(L, S\.gone\) \? 0\.\d+ : 1\), drawHamster\(/);
  });
});

describe('넘치는 쟁반(✏️ S064 · M3′ · 오너 "빈칸에 들어가는게 다 차면 진다는게 와닿지가 않아")', () => {
  it('쟁반은 구멍 넷 + 끝 턱이고, 4칸이면 경고 그림 · 넘치면 무더기로 쏟아진다 · 판 글 −2(🧺 띠 · 4칸 팁)', () => {
    const g = src('game.ts'), st = src('stages.ts'), tray = g.slice(g.indexOf('function drawTray('), g.indexOf('function drawBench('));
    expect(TRAY_WARN).toBe(4);
    expect(tray).toContain('for (let i = 0; i < SLOTS - 1; i++)');
    expect(tray).toMatch(/if \(warn && sp < 0\) \(ctx\.globalAlpha = 0\.\d+\), drawScrew\(/);
    expect(tray).toContain('PILE[max(0, SLOTS - 1 - i)]'); // 한 톡에 여럿이 몰려 6 · 7칸이 돼도 무더기 자리 안(✏️ S064 shots 콘솔 에러)
    expect(g + st).not.toContain('5칸 다 차면');
    expect(g).not.toContain('빈칸이 하나 남았어요');
    expect(g).toContain('`빈칸으로 (${pre.S.slots.length}/${SLOTS - 1})`');
    expect(g).toContain("(v > P ? (s.tv > P ? '' : `빈칸 ${v}칸 — ${lost}`)");
  });

  it('넘쳐서 지면 spill = 다섯째가 턱에 닿는 틱(꽉 사건과 같음) · 새 판에서 0 · 막혀서 진 판은 0', () => {
    const t = tryStage(screwshopNewbie, 7, 2, 600, 0), s = t.s;
    expect(s.S.fail).toBe(1);
    const jam = s.events.find((e) => e.kind === 'jam');
    expect(s.spill).toBeGreaterThan(0);
    if (jam) expect(s.spill).toBe(jam.v);
    startStage(s, 2);
    expect(s.spill).toBe(0);
  });

  it('한 톡에 여럿이 와도 쟁반은 다섯째까지 모두 닿은 뒤에 기운다(🧪 S064 🔴① · 꽉 사건과 같은 틱)', () => {
    let many = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = tryStage(screwshopNewbie, seed, 2, 600, seed).s;
      if (s.S.fail !== 1) continue;
      const land = Math.max(...s.vs.slice(0, 5).map((v) => v.at)), jam = s.events.find((e) => e.kind === 'jam');
      expect(s.spill, `seed ${seed}`).toBeGreaterThanOrEqual(land);
      if (jam) expect(jam.v).toBe(s.spill);
      if (s.hist[s.hist.length - 1].rec.filter((r) => r.k === 'slot').length >= 2) many++;
    }
    expect(many).toBeGreaterThan(0);
  });

  it('처음 봇 차례 길(사람 속도 · 48손): 4칸에 닿으면 늘 경고 그림이 뜨고(F31 = 4칸 도달) · 지는 톡 앞 경고 ≥ .8', () => {
    const r = trayRead(48);
    expect(r.warn).toBe(4);
    expect(r.fails).toBeGreaterThanOrEqual(40);
    expect(r.f31saw).toBe(r.reach4);
    expect(r.f31pre).toBeGreaterThanOrEqual(0.8);
    expect(r.f30).toBe(1); // ✏️ S065(M3′ A2): 처음 4칸이 된 손마다 턱 나사가 한 번 떨어져 보인다
  });

  it('처음 4칸: 턱 나사는 무늬 없는 쇠 나사로 기우뚱하고, 넷째가 닿은 뒤 켜지며, 4칸 경고 동안 띠는 안 그린다(4칸 화면 글 0 · ✏️ S065)', () => {
    const g = src('game.ts'), tray = g.slice(g.indexOf('function drawTray('), g.indexOf('function drawBench('));
    expect(g).toContain('else if (m > 4) ctx.arc(0, 0, r * 0.55, 0, TAU);');
    expect(tray).toContain("warn = s.phase === 'play' && n >= TRAY_WARN! && t >= s.w4");
    expect(tray).toMatch(/drawScrew\(ctx, vx \+ R\(0\.016\) \+ \(q < 1 \? q \* R\(0\.04\) : sw \* R\(0\.01\)\)/);
    expect(g).toContain("s.phase !== 'result' && !(s.S.slots.length >= TRAY_WARN! && t >= s.w4)) {"); // 띠 그리기 조건
    expect(g).toContain("if (e.kind === 'teach' && S.slots.length < TRAY_WARN!) say("); // ✏️ S065(🧪 S065 🟡③): 4칸이 되는 톡의 별 토스트도 안 그린다
    expect(tray).toContain('at = (SLOTS - i) * 3 - 2,'); // 다섯째는 턱에 1틱만 머문다(🧪 S065 🟡① · 첫 쟁반 밖 ≤ .6초)
  });
});

describe('별 하나로(✏️ S067 · M3″ S1 · S2 · 오너 11-19 \'바꾸기\' · 🧪 S066 🔴②)', () => {
  it('28판 ★3이 모두 \'한 번에 H\' · ★2는 빈칸 2칸(예외 1-3만 1칸 · ✏️ S068 1-1도 새 별) · 이웃 판 ★2 말이 바뀌는 쌍은 예외 판 앞뒤뿐', () => {
    const ex = STAGES.filter((d) => d.B || gapOf(d) !== 2).map((d) => d.slot);
    expect(ex).toEqual(['1-3']); // P1 ③ 예외 ≤ 2판(밝힘) · ✏️ S068: 1-1은 오너 '바꾸기'로 새 별
    for (const d of STAGES) expect([starKinds(d), d.H >= 2, d.B], d.slot).toEqual([['gap', 'shot'], true, undefined]);
    const f = starFloor(1).f38; // 손 2개라 F36 · F37 값은 안 본다 — 칩 이웃 바뀜(F38)만
    expect([f.c2, f.kind3], '바뀜은 1-2 → 1-3 · 1-3 → 1-4(★2 · 예외 앞뒤)뿐 · ★3 종류 0').toEqual([2, 0]);
  });
  it("'★3!' 알림은 별이 3개가 될 때만 — 알고 서툰 봇이 빈칸을 넘긴 뒤 한 번에 H를 따도 알림 0(F39) · 💡는 놓친 별의 것", () => {
    let alerts = 0, bad = 0;
    for (const k of [1, 4, 9, 13, 19, 24, 27]) for (let i = 0; i < 6; i++) {
      const s = screwshop.create(1000 + i * 7), d = STAGES[k];
      startStage(s, k);
      const rng = mulberry32((1000 + i * 7) ^ 0x9e3779b9), bot = knowE(0.3), t0 = s.t;
      while (s.phase !== 'result' && s.t - t0 < 600 * 60) { const sg = s.sg; screwshop.step(s, bot.act(s, rng)); if (s.sg & 8 & ~sg) (alerts++, (bad += +(starsOf(d, s.S) < 3))); }
    }
    expect(alerts, '알림이 뜬 판이 있어야 잰 것').toBeGreaterThan(5);
    expect(bad, "별 3개가 아닌데 '★3!'").toBe(0);
    const g = src('game.ts');
    expect(g).toMatch(/m2 = false, m3 = !s\.hint && starsOf\(d, S\) > 2/);
    expect(g, '★2를 놓친 결과 카드에 ★3 💡(tip2)를 붙이지 않는다').toMatch(/tp = !soon && ok2 && s\.got === 2 && d\.tip2/);
    for (const d of STAGES) expect([missGoal(d, false).startsWith('★2 빈칸'), missGoal(d, true).startsWith('★3 한 번에')], d.slot).toEqual([true, true]);
  });
  it("★2(빈칸)가 죽은 뒤엔 어떤 글도 ★3을 약속하지 않는다(🧪 S067 🔴①: 1-3 첫 톡 '한 번에 2개! 4개면 ★3' 처음 140/144) · 🔑 꾹 알약도", () => {
    const k = STAGES.findIndex((d) => d.slot === '1-3');
    let lie = 0, t3 = 0;
    for (let i = 0; i < 24; i++) { const r = runA(screwshopNewbie, 1000 + i * 7, k, 1000 + i * 7, KB.gap); (lie += r.lie), (t3 += r.t3); }
    expect(t3, '★3을 배우는 판에서 ★2가 죽은 뒤 배우기 글이 뜬 일이 있어야 잰 것').toBeGreaterThan(5);
    expect(lie).toBe(0);
    expect(src('game.ts'), '알약').toContain("all >= H ? '!' : x3 ? '' : ` · ${H}개면 ★3`");
  });
  it('사다리 2칸(✏️ S068 · 🧪 S067 🔴③): 1-1은 \'빈칸 2칸까지\'를 가르치고, 그것만 배운 채 1-1을 다시 하면 ★3 \'한 번에\'를 가르친다 · 1-2도 같다', () => {
    const at = (slot: string, m: number) => { const s = screwshop.create(1), k = STAGES.findIndex((d) => d.slot === slot); if (k) startStage(s, k); setLearn(s, m); return s; };
    expect([at('1-1', 0).teach, at('1-1', 0).lock3], '처음 1-1 = 빈칸(★2) · ★3 🔒').toEqual([2, true]);
    expect([at('1-1', KB.gap).teach, at('1-1', KB.gap).lock3], '빈칸을 배운 뒤 1-1 다시').toEqual([3, false]);
    expect(at('1-2', KB.gap).teach, '1-2는 한 번에(★3)').toBe(3);
  });
});

describe('챕터 잠금(✏️ S068 · M3″ L1 · 오너 11-19 \'매 챕터에서 토탈 별이 도달되지 않으면 다음 챕터가 안열리게\')', () => {
  const W1 = STAGES.map((d, k) => (d.slot[0] === '1' ? k : -1)).filter((k) => k >= 0), W2 = STAGES.map((d, k) => (d.slot[0] === '2' ? k : -1)).filter((k) => k >= 0);
  const with_ = (fill: (k: number) => number) => { const s = screwshop.create(1); s.saved = STAGES.map((_, k) => fill(k)); return s; };
  it('문턱은 월드마다 따로 15 · 14 · 별이 있는 월드는 열림 · 저장 별이 없으면(시뮬 · ?stage) 잠그지 않음 · 저장이 막혀도 그 세션 별로 동작', () => {
    expect(LOCK).toEqual([15, 14]);
    expect(lockedW(screwshop.create(1), 2), '시뮬(저장 별 없음)').toBe(false);
    const z = with_(() => 0);
    expect([lockedW(z, 1), lockedW(z, 2), lockedW(z, 3)]).toEqual([false, true, true]);
    const a = with_((k) => (W1.slice(0, 7).includes(k) ? 2 : W1.includes(k) ? 1 : 0)); // 14 + 3 = 17 · 월드 2는 0
    expect([worldStars(a, 1), lockedW(a, 2), lockedW(a, 3)]).toEqual([17, false, true]);
    const b = with_((k) => (W1.slice(0, 7).includes(k) ? 2 : 0)); // 14 → 하나 모자람
    expect([worldStars(b, 1), lockedW(b, 2)]).toEqual([14, true]);
    const c = with_((k) => (k === W2[0] ? 1 : 0)); // 옛 저장: 월드 2 별이 있으면 열림
    expect(lockedW(c, 2)).toBe(false);
    const d = with_((k) => (W2.includes(k) ? (W2.indexOf(k) < 7 ? 2 : 0) : W1.includes(k) ? 2 : 0)); // 월드 2 = 14 → 3 열림
    expect([worldStars(d, 2), lockedW(d, 3)]).toEqual([14, false]);
    const e = with_(() => 0); W1.forEach((k) => (e.bestSt[k] = 2)); // 저장이 막힘(saved 0) · 이 세션에 20개
    expect(lockedW(e, 2)).toBe(false);
  });
  it('월드 끝(1-10) 결과 카드: 다음 월드가 잠겼으면 ★3이어도 자동으로 안 넘어가고 \'다음 판\' 자리를 누르면 판 고르기(s.menu) · 열렸으면 2-1로', () => {
    const run = (open: boolean) => {
      const s = screwshop.create(7), k = W1[W1.length - 1], rng = mulberry32(3), A = 1.45, up = { tap: false, dir: 0 as const, pointer: null };
      startStage(s, k);
      s.saved = STAGES.map((_, j) => (open && W1.includes(j) ? 2 : 0));
      for (let i = 0; i < 600 * 60 && s.phase !== 'result'; i++) screwshop.step(s, screwshopSmart.act(s, rng));
      const got = s.got;
      for (let i = 0; i < 400; i++) screwshop.step(s, up);
      const auto = s.stage, nl = nextLocked(s);
      screwshop.step(s, { tap: false, dir: 0, pointer: { x: 0.7, y: RES_BY / A } }), screwshop.step(s, up);
      return [got, auto, s.stage, !!s.menu, nl];
    };
    expect(run(false), '잠김: 400틱 기다려도 그대로 · 누르면 판 고르기').toEqual([3, 9, 9, true, true]);
    const o = run(true);
    expect([o[0], o[2], o[3]], '열림: 2-1로').toEqual([3, 10, false]);
  });
  it('새 글 0(🔒 · 숫자 · ★만) · 새 저장 키 0 · ?stage=N은 잠금을 안 봄 · 잠긴 월드는 판 이름만 · 눌리지 않음 · 키보드 포커스는 ◀ ▶ · 3-8은 끝내기', () => {
    const g = src('game.ts'), m = src('main.ts');
    expect(g).toContain("nl ? `🔒 ${worldStars(s, w0)}/${LOCK[w0 - 1]}★` : '다음 판 ▶'");
    expect(m).toContain("lk ? `🔒&nbsp;${worldStars(s, world - 1)}/${LOCK[world - 2]}★` : `★&nbsp;${worldStars(s, world)}`");
    expect([...new Set([...m.matchAll(/store\.set\('([a-zA-Z]+)'/g)].map((x) => x[1]))].sort(), '저장 키(S067과 같음)').toEqual(['best', 'learn', 'mute', 'nobuzz', 'rs', 'rsTry', 'st', 'stars']);
    expect(m).toContain("get('stage') ? undefined : STAGES.map((d) => store.get('st' + d.id))");
    expect(m).toMatch(/if \(lk\) return `<button type="button" disabled[^`]*<small>\$\{d\.name\}<\/small><\/button>`/);
    expect(m).toContain("pick.querySelector('nav button:not([disabled])')");
    const s = screwshop.create(1); startStage(s, STAGES.length - 1); s.saved = STAGES.map(() => 0); s.won = true;
    expect(nextLocked(s), '3-8 끝내기').toBe(false);
  });
});

describe('결과 별은 조건 자리에(✏️ S068 · M3″ S4 · 🧪 S067 🟡① \'칩은 ✕✕인데 결과는 ★★\')', () => {
  it('빈칸을 놓치고 한 번에를 땄으면 ★☆★ · 빈칸만 지켰으면 ★★☆ · 둘 다면 ★★★ · 별 수는 더하기 그대로 · 판 중 ★3 칩은 흐린 ✓(0)', () => {
    expect([resSlots(false, 2), resSlots(true, 2), resSlots(true, 3), resSlots(false, 1)]).toEqual([[true, false, true], [true, true, false], [true, true, true], [true, false, false]]);
    let seen = 0;
    for (let k = 0; k < STAGES.length; k++) for (let i = 0; i < 4; i++) {
      const r = tryStage(knowE(0.3), 1000 + i * 7, k), S = r.s.S, d = STAGES[k];
      if (!r.ok) continue;
      const sl = resSlots(S.peak <= gapOf(d), r.stars);
      expect([sl.filter(Boolean).length, sl[1], sl[2]], `${d.slot} 시드 ${i}`).toEqual([r.stars, S.peak <= gapOf(d), S.shot >= d.H]);
      seen += +(S.peak > gapOf(d) && S.shot >= d.H);
    }
    expect(seen, '★☆★ 경우를 실제로 본 판').toBeGreaterThan(0);
    expect(src('game.ts')).toContain('S.shot >= d.H ? (S.peak > G ? 0 : true) : dead3(d, s.L, S) ? false : null');
  });
});

describe('잠금 · 별 숫자 맞추기(✏️ S068 · 🧪 S068 🔴 2 · 🟡 4)', () => {
  it('이 판으로 15번째 별을 따면 \'🔓 ▶\' — ★3이어도 안 넘어가고 누르면 열린 월드(2) 판 고르기 · 시뮬(저장 별 없음)에선 늘 0', () => {
    const W1 = STAGES.map((d, k) => (d.slot[0] === '1' ? k : -1)).filter((k) => k >= 0), k = W1[1], A = 1.45, up = { tap: false, dir: 0 as const, pointer: null };
    const s = screwshop.create(7), rng = mulberry32(3);
    startStage(s, k);
    s.saved = STAGES.map((_, j) => (W1.includes(j) && j !== k ? (j === W1[2] ? 0 : 2) : 0)); // 1-2 · 1-3 빼고 8판 × 2 = 16 → 1-2를 깨면 ≥ 17 · 1-3 0
    s.saved[W1[3]] = 0; s.saved[W1[4]] = 0; // 12 → 1-2 ★3이면 15
    expect(lockedW(s, 2), '시작: 잠김').toBe(true);
    for (let i = 0; i < 600 * 60 && s.phase !== 'result'; i++) screwshop.step(s, screwshopSmart.act(s, rng));
    expect([s.got, s.opened], '1-2 ★3 → 15 → 열림').toEqual([3, 2]);
    for (let i = 0; i < 400; i++) screwshop.step(s, up);
    expect(s.stage, '자동으로 안 넘어감').toBe(k);
    screwshop.step(s, { tap: false, dir: 0, pointer: { x: 0.7, y: RES_BY / A } }), screwshop.step(s, up);
    expect([!!s.menu, s.menuW], '🔓 → 월드 2 판 고르기').toEqual([true, 2]);
    expect(tryStage(screwshopSmart, 1000, k).s.opened, '시뮬').toBe(0);
  });
  it("저장이 막혀도 세션 별 · 배움이 판을 바꿔도 남는다(메모리 받침) · 위 칸 ★ = 이 월드 별 · 별 2개 이상이면 🔒이 금 · ★☆★ 셋째는 보통 별 · 1-3 첫 판 ★2 칩 금테", () => {
    const m = src('main.ts'), g = src('game.ts');
    expect(m, '저장 막힘(읽기 · 쓰기 어느 쪽이든): 이 세션 값 먼저').toContain("get(k: string) { if (mem.has(k)) return mem.get(k)!; try {");
    expect(m).toContain('set(k: string, v: number) { mem.set(k, v);');
    expect(g).toContain('hud = worldStars(s, worldOf(s.stage)), stt = `★ ${hud}');
    expect(g).not.toContain('`★ ${s.stars}');
    expect(g).toContain("lg = nl && s.got > 1");
    expect(g).toContain("k3 = k === 2 && s.got > 2, big = k3 ? 1.15 : 1");
    expect(g).toContain("(n === 2 && gapOf(d) !== GAP && !s.bestSt[s.stage] && !s.saved?.[s.stage])");
  });
});

describe('칩 금테 · 💡(✏️ S069 · 🧪 S069 🔴 2)', () => {
  it('배우는 별 칩 · 예외 판 ★2 칩 금테는 실제로 그려진다(stroke가 주석 밖) · 칩 글은 조건 밖에서 왼쪽 맞춤', () => {
    const g = src('game.ts'), line = g.split('\n').find((l) => l.includes('!s.bestSt[s.stage] && !s.saved?.[s.stage])) && s.phase'))!;
    expect(line.split('//')[0]).toContain('(ctx.lineWidth = 2.5), ctx.stroke();');
    const next = g.split('\n')[g.split('\n').indexOf(line) + 1];
    expect(next.trim()).toBe("ctx.textAlign = 'left';");
    const html = readFileSync(new URL('../web/public/studio/screwshop/index.html', import.meta.url), 'utf8');
    expect(html, '빌드에 금테 굵기').toMatch(/lineWidth=2\.5,\w+\.stroke\(\)/);
  });
  it('2-10 💡(tip2)는 ★3(한 번에 4)과 상관없는 깃발 수를 권하지 않는다 — 지움(🧪 ★3 톡 392/392가 난간 쾅 → 램프 띠용)', () => {
    const d = STAGES.find((x) => x.slot === '2-10')!;
    expect(d.tip2).toBeUndefined();
    expect(d.tip).toContain('램프');
  });
});
