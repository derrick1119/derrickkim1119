/** 스튜디오 나사 풀기 공방 M3 ⑥(오너 "연출이 중간에 느려지거나 렉이 걸리는 부분"): 일부러 넣는 멈춤 정책 단언 — ✏️ S059 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { Juice } from '../studio/screwshop/juice.ts';
import { STAGES, missGoal, starKinds } from '../studio/screwshop/game.ts';
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

