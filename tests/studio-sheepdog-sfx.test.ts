import { describe, expect, it } from 'vitest';
import { sfx } from '../studio/sheepdog/sfx.ts';

/** 노드만 세는 가짜 AudioContext — 합성 코드가 끝까지 도는지(예외 없이) 본다 */
let made = 0, nodes = 0, resumed = 0, inst: FakeAC | null = null;
const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} });
const node = () => (nodes++, { gain: param(), frequency: param(), Q: param(), type: '', buffer: null, connect: (x: unknown) => x, start() {}, stop() {} });
class FakeAC {
  state = 'running'; currentTime = 0; sampleRate = 8000; destination = {};
  constructor() { made++; inst = this; }
  createGain = node; createOscillator = node; createBiquadFilter = node; createBufferSource = node;
  createBuffer(_c: number, n: number) { return { getChannelData: () => new Float32Array(n) }; }
  resume() { resumed++; return Promise.resolve(); }
}

describe('효과음 (C010 M1-6 ①: 첫 입력 전 AudioContext 0, 꺼 두면 0)', () => {
  it('깨우기 전엔 소리를 불러도 AudioContext를 안 만든다 · 꺼 두면 깨워도 안 만든다 · 켜면 하나만 · 멈추면 다시 깨운다', () => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAC;
    sfx.play('bark');
    expect([made, sfx.made]).toEqual([0, false]);
    sfx.setMuted(true);
    sfx.wake();
    expect(made).toBe(0);
    sfx.setMuted(false);
    sfx.wake();
    sfx.wake();
    expect(made).toBe(1);
    for (const c of ['bark', 'baa', 'baaBlack', 'click', 'splash', 'star', 'stamp'] as const) {
      const n0 = nodes;
      sfx.play(c, c === 'click' ? 3 : 1, c === 'click');
      expect(nodes, c).toBeGreaterThan(n0);
    }
    // 앱을 오가거나 화면이 잠겨 멈추면(suspended·아이폰 interrupted) 다음 누름의 wake가 다시 깨운다 (PM C010 → M1-7 ①)
    for (const st of ['suspended', 'interrupted']) {
      inst!.state = st;
      const r0 = resumed;
      sfx.wake();
      expect(resumed, st).toBe(r0 + 1);
    }
    expect(made).toBe(1);
    sfx.setMuted(true);
    const n1 = nodes;
    sfx.play('bark');
    expect(nodes).toBe(n1);
  });
});
