/**
 * 공용 효과음 (0109, 37라운드 폐기 이유 '손맛·첫인상이 약함' — 공장 게임은 지금까지 소리가 없었다).
 * 샘플 파일 없이 WebAudio로 합성한다. 런타임 의존성 없음.
 * - 시뮬레이션은 소리를 모른다: 게임 draw()의 사건 처리(juice와 같은 곳)에서 `juice(s).sound('pop')`으로 부른다.
 * - 첫 누름(play.ts start) 전에는 AudioContext를 만들지 않는다. Node(봇 측정·테스트)에서는 아무것도 안 한다.
 */
export type SfxName =
  | 'pop' | 'thud' | 'whoosh' | 'ding' | 'chime' | 'splash' | 'crack' | 'boing'
  | 'swell' | 'shrink' | 'rewind' | 'coin' | 'fail' | 'clear' | 'tick' | 'zap';

let ac: AudioContext | null = null, out: GainNode | null = null, noise: AudioBuffer | null = null;
const last: Partial<Record<SfxName, number>> = {};

function tone(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, attack = 0.004) {
  const o = ac!.createOscillator(), g = ac!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(Math.max(20, f0), t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out!);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

function hiss(t0: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1 = f0) {
  const src = ac!.createBufferSource(), b = ac!.createBiquadFilter(), g = ac!.createGain();
  src.buffer = noise;
  b.type = type;
  b.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) b.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(Math.max(0.0002, vol), t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(b).connect(g).connect(out!);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.03);
}

/** 소리 모양 — p: 높낮이 배수(1 = 기본), v: 크기 */
const CUES: Record<SfxName, (t: number, p: number, v: number) => void> = {
  pop: (t, p, v) => (tone('sine', 520 * p, 1100 * p, t, 0.09, 0.35 * v), hiss(t, 0.03, 0.12 * v, 'highpass', 3000)),
  thud: (t, p, v) => (tone('sine', 120 * p, 45 * p, t, 0.28, 0.6 * v), hiss(t, 0.08, 0.25 * v, 'lowpass', 500)),
  whoosh: (t, p, v) => hiss(t, 0.28, 0.22 * v, 'bandpass', 500 * p, 3200 * p),
  ding: (t, p, v) => (tone('sine', 1320 * p, 1320 * p, t, 0.5, 0.25 * v), tone('sine', 2640 * p, 2640 * p, t, 0.25, 0.08 * v)),
  chime: (t, p, v) => [0, 0.07, 0.14].forEach((d, k) => tone('triangle', [784, 988, 1175][k] * p, [784, 988, 1175][k] * p, t + d, 0.35, 0.18 * v)),
  splash: (t, p, v) => (hiss(t, 0.35, 0.3 * v, 'lowpass', 2600 * p, 500 * p), tone('sine', 300 * p, 120 * p, t, 0.12, 0.2 * v)),
  crack: (t, p, v) => (hiss(t, 0.06, 0.4 * v, 'highpass', 1800 * p), tone('square', 180 * p, 90 * p, t, 0.05, 0.12 * v), hiss(t + 0.04, 0.18, 0.15 * v, 'bandpass', 2500 * p, 900 * p)),
  boing: (t, p, v) => tone('triangle', 180 * p, 520 * p, t, 0.22, 0.35 * v),
  swell: (t, p, v) => (tone('sine', 220 * p, 660 * p, t, 0.45, 0.25 * v, 0.2), hiss(t, 0.4, 0.06 * v, 'bandpass', 400, 1600)),
  shrink: (t, p, v) => (tone('sine', 900 * p, 260 * p, t, 0.3, 0.25 * v), tone('square', 1800 * p, 520 * p, t, 0.12, 0.04 * v)),
  rewind: (t, p, v) => [0, 0.05, 0.1, 0.15, 0.2].forEach((d, k) => tone('triangle', (900 - k * 120) * p, (1100 - k * 120) * p, t + d, 0.06, 0.14 * v)),
  coin: (t, p, v) => (tone('square', 988 * p, 988 * p, t, 0.07, 0.1 * v), tone('square', 1319 * p, 1319 * p, t + 0.07, 0.2, 0.1 * v)),
  fail: (t, p, v) => (tone('triangle', 392 * p, 330 * p, t, 0.2, 0.22 * v), tone('triangle', 330 * p, 247 * p, t + 0.18, 0.35, 0.22 * v)),
  clear: (t, p, v) => [523, 659, 784, 1047].forEach((f, k) => tone('triangle', f * p, f * p, t + k * 0.09, 0.3, 0.2 * v)),
  tick: (t, p, v) => tone('square', 1800 * p, 1800 * p, t, 0.025, 0.06 * v),
  zap: (t, p, v) => (tone('sawtooth', 1400 * p, 200 * p, t, 0.18, 0.12 * v), hiss(t, 0.12, 0.15 * v, 'highpass', 4000)),
};

export const sfx = {
  muted: false,
  /** 첫 누름에서 부른다(브라우저 자동 재생 정책) — 그 전에는 아무것도 만들지 않는다 */
  wake() {
    if (this.muted || typeof AudioContext === 'undefined') return;
    if (!ac) {
      ac = new AudioContext();
      out = ac.createGain();
      out.gain.value = 0.45;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 4;
      out.connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') void ac.resume();
  },
  /** 소리 하나 — 같은 소리는 35ms 안에 겹쳐 울리지 않는다(연쇄 때 귀가 아프지 않게) */
  play(name: SfxName, pitch = 1, vol = 1) {
    if (this.muted || !ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    if ((last[name] ?? -1) > now - 0.035) return;
    last[name] = now;
    CUES[name](now + 0.005, pitch, Math.min(1.5, vol));
  },
  setMuted(m: boolean) {
    this.muted = m;
    if (m && ac) void ac.suspend();
    else if (!m) this.wake();
  },
};
