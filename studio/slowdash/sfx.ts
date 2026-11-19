/**
 * 느린 시간 닌자 — 효과음·진동 (🎨 ART.md §4.1 합성 소리 원형 · M1 S005).
 * 샘플 파일 없이 WebAudio로 합성한다: S 슉 · C(f) 챙 · K 칼집 착 · I 먹물 퍽 · D 북 둥 · H 숨.
 * 누르는 동안(느린 시간) 마스터에 로우패스를 걸어 세상 소리가 물속처럼 먹먹해진다.
 * **첫 입력 전에는 AudioContext를 만들지 않는다.** 시뮬레이션은 소리를 모른다 — main.ts가 사건(events)을 보고 부른다.
 */
export type Cue = 'press' | 'dash' | 'slash' | 'sheath' | 'ink' | 'clink' | 'shotcut' | 'hurt' | 'fail' | 'clear' | 'star' | 'wave' | 'strike' | 'whiff';

let ac: AudioContext | null = null, master: GainNode | null = null, lp: BiquadFilterNode | null = null, noise: AudioBuffer | null = null;
const last: Partial<Record<Cue, number>> = {};

/** 연쇄 5음계(불협 없음): D5 E5 G5 A5 B5 D6 E6 G6, 이후 고정 */
const SCALE = [587, 659, 784, 880, 988, 1175, 1319, 1568];
export const chainHz = (n: number) => SCALE[Math.min(SCALE.length, Math.max(1, n)) - 1];

function tone(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, out: AudioNode = lp!, attack = 0.002) {
  const o = ac!.createOscillator(), g = ac!.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
function filt(type: BiquadFilterType, f: number, q = 1) {
  const b = ac!.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.connect(lp!);
  return b;
}
function hiss(t0: number, dur: number, vol: number, out: AudioNode, f0?: number, f1?: number) {
  const src = ac!.createBufferSource(), g = ac!.createGain();
  src.buffer = noise;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  if (f0 && f1 && out instanceof BiquadFilterNode) (out.frequency.setValueAtTime(f0, t0), out.frequency.exponentialRampToValueAtTime(f1, t0 + dur));
  src.connect(g).connect(out);
  src.start(t0, Math.random() * 0.3);
  src.stop(t0 + dur + 0.02);
}
const S = (t: number) => hiss(t, 0.09, 0.3, filt('bandpass', 1500, 2), 1500, 6000);
const C = (t: number, f: number, v = 1) => (tone('sine', f, f, t, 0.22, 0.28 * v), tone('sine', f * 1.5, f * 1.5, t, 0.16, 0.11 * v), hiss(t, 0.01, 0.1 * v, filt('highpass', 5000)));
const K = (t: number) => (hiss(t, 0.015, 0.22, filt('highpass', 3000)), tone('triangle', 900, 900, t, 0.02, 0.15));
const I = (t: number) => hiss(t, 0.07, 0.2, filt('lowpass', 600));
const D = (t: number, v = 1) => (tone('sine', 90, 50, t, 0.3, 0.45 * v), tone('triangle', 700, 500, t, 0.04, 0.15 * v), hiss(t, 0.06, 0.2 * v, filt('lowpass', 300)));
const H = (t: number) => hiss(t, 0.18, 0.08, filt('lowpass', 400), 400, 1200);

export const sfx = {
  muted: false,
  noBuzz: false,
  /** 첫 입력(시작 누름)에서 부른다 — 그 전에는 아무것도 만들지 않는다 */
  wake() {
    if (this.muted || typeof AudioContext === 'undefined') return;
    if (!ac) {
      ac = new AudioContext();
      master = ac.createGain();
      master.gain.value = 0.5;
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 12000;
      lp.connect(master).connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') void ac.resume();
  },
  sleep() {
    if (ac && ac.state === 'running') void ac.suspend();
  },
  setMuted(m: boolean) {
    this.muted = m;
    if (m) this.sleep();
    else this.wake();
  },
  /** 느린 시간: 누르는 동안 세상 소리가 먹먹해진다(6틱 ≈ 0.1초에 걸쳐) */
  slow(on: boolean) {
    if (!ac || !lp) return;
    lp.frequency.setTargetAtTime(on ? 1400 : 12000, ac.currentTime, 0.05);
  },
  buzz(ms: number | number[]) {
    if (this.noBuzz || this.muted || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try { navigator.vibrate(ms); } catch { /* 진동 없음 */ }
  },
  play(c: Cue, n = 1) {
    if (this.muted || !ac || ac.state !== 'running') return;
    const t = ac.currentTime;
    if ((last[c] ?? -1) > t - 0.025) return; // 25ms 안에 같은 소리는 합친다
    last[c] = t;
    switch (c) {
      case 'press': return void (H(t), this.buzz(8));
      case 'dash': return void (S(t), this.buzz(6)); // 🧪 S005: 진동 순서 헛돌진 < 베기 < 맞음 < 실패
      case 'slash': // 베인 적마다 3틱 간격으로 '챙' — 연쇄 음계로 올라간다
        K(t + 0.15); // 칼집 '착' 뒤에 차례로 갈라진다(🎨 §4.2)
        for (let k = 1; k <= Math.min(n, 8); k++) C(t + 0.2 + (k - 1) * 0.05, chainHz(k), 0.9);
        I(t + 0.2 + Math.min(n, 8) * 0.05);
        return void this.buzz(n >= 3 ? [20, 30, 20] : 14);
      case 'sheath': return K(t);
      case 'ink': return I(t);
      case 'clink': return void (tone('sine', 1800, 1800, t, 0.3, 0.2), tone('sine', 2700, 2700, t, 0.22, 0.1), hiss(t, 0.02, 0.15, filt('highpass', 3000)), this.buzz(20));
      case 'shotcut': return C(t, 2600, 0.6);
      case 'whiff': return tone('triangle', 300, 220, t, 0.08, 0.12);
      case 'strike': return void (D(t, 0.6), hiss(t, 0.05, 0.15, filt('highpass', 2500)));
      case 'hurt': return void (tone('sine', 520, 260, t, 0.14, 0.3), [0, 0.04, 0.08].forEach((d) => hiss(t + d, 0.03, 0.08, filt('bandpass', 4000, 3))), this.buzz([30, 40, 30]));
      case 'fail': return void (tone('triangle', 660, 330, t, 0.4, 0.25), this.buzz([60, 40, 80]));
      case 'wave': return D(t, 0.7);
      case 'clear':
        D(t);
        SCALE.slice(0, 7).forEach((f, k) => tone('triangle', f, f, t + 0.05 + k * 0.035, 0.18, 0.18));
        tone('sine', 1568, 1568, t + 0.45, 0.6, 0.12);
        tone('sine', 2349, 2349, t + 0.45, 0.6, 0.06);
        return void this.buzz([20, 40, 80]);
      case 'star': return void (D(t, 0.5), C(t + 0.02, chainHz(Math.min(8, 5 + n)), 0.8), this.buzz(n >= 3 ? 30 : 15));
    }
  },
  /** 테스트용: AudioContext가 만들어졌는가 */
  get live() {
    return !!ac;
  },
};
