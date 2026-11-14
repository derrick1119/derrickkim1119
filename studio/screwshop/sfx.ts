/**
 * 나사 풀기 공방 — 효과음·진동 (🎨 ART.md §2 손맛 v1: 오너 "쾌감이 좀 부족해" 대응).
 * 샘플 파일 없이 WebAudio로 합성한다(나무 공방 재료: 마림바·래칫·코르크 뽁·나무 쿵·끼익).
 * **첫 입력(시작 누름) 전에는 AudioContext를 만들지 않는다**, 꺼 두었으면 아예 만들지 않는다.
 * 시뮬레이션은 모른다 — 그림(draw)의 사건 루프가 cue를 부른다(결정성·봇 측정에 영향 없음).
 */
export type Cue = 'bonk' | 'shot' | 'press' | 'twist' | 'pluck' | 'in' | 'slot' | 'brk' | 'pull' | 'done' | 'swing' | 'fall' | 'thud' | 'reveal' | 'boing' | 'tick' | 'key' | 'blocked' | 'clear' | 'star' | 'jam' | 'fail';

let ac: AudioContext | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null;
const last: Partial<Record<Cue, number>> = {};
let lastBuzz = 0, woke = false;

function tone(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, out: AudioNode = master!, attack = 0.003) {
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
  return o;
}
function filt(type: BiquadFilterType, f: number, q = 1) {
  const b = ac!.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.connect(master!);
  return b;
}
function hiss(t0: number, dur: number, vol: number, out: AudioNode) {
  const src = ac!.createBufferSource(), g = ac!.createGain();
  src.buffer = noise;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g).connect(out);
  src.start(t0, Math.random() * 0.3);
  src.stop(t0 + dur + 0.02);
}
/** M(f) 마림바 톡 */
const mar = (t: number, f: number, v = 1) => (tone('sine', f, f, t, 0.22, 0.38 * v), tone('sine', f * 3.98, f * 3.98, t, 0.045, 0.12 * v), hiss(t, 0.008, 0.08 * v, filt('highpass', 4000)));
/** T(f) 나무 쿵 */
// 🧪 M0.1: 폰 스피커는 200Hz 아래가 거의 안 나온다 → 900Hz 나무 '탁' 층을 얹는다
const thud = (t: number, f: number, v = 1) => (tone('triangle', f, f * 0.45, t, 0.16, 0.5 * v, filt('lowpass', 900)), tone('triangle', 900, 600, t, 0.04, 0.22 * v), hiss(t, 0.05, 0.22 * v, filt('lowpass', 1200)));
/** K 끼익 (dur·vol 조절) */
function creak(t: number, dur = 0.38, vol = 0.22) {
  const bp = filt('bandpass', 1100, 9), lfo = ac!.createOscillator(), lg = ac!.createGain();
  lfo.frequency.value = 11;
  lg.gain.value = 250;
  lfo.connect(lg).connect(bp.frequency);
  lfo.start(t);
  lfo.stop(t + dur + 0.02);
  tone('sawtooth', 95, 70, t, dur, vol, bp, 0.04);
}
/** 연속 쏙 음계: 5음계 C5→C7 (🎨 §3) */
export const streakHz = (n: number) => {
  const k = Math.min(11, Math.max(1, n)) - 1;
  return 523.25 * Math.pow(2, (12 * Math.floor(k / 5) + [0, 2, 4, 7, 9][k % 5]) / 12);
};

const SYNTH: Record<Cue, (t: number, v: number) => void> = {
  // 🔨 쾅 (🎨 §2.2+): A 쇠망치 깡 + T(190) 나무 쿵, +60ms 쇠머리 떨림 2번
  bonk(t) {
    thud(t, 190);
    tone('sine', 1175, 1175, t, 0.28, 0.14, master!, 0.002), tone('sine', 3243, 3243, t, 0.12, 0.06), tone('sine', 6345, 6345, t, 0.04, 0.03);
    hiss(t, 0.025, 0.22, filt('bandpass', 3200, 1.5));
    for (const d of [0.06, 0.09]) hiss(t + d, 0.012, 0.06, filt('bandpass', 5000, 3));
  },
  // 🎨 §2.4 한 방 h: G 장난감 종이 빠르게 C7까지 (2·3·4·5+)
  shot(t, h) {
    const fs = h >= 5 ? [1047, 1175, 1319, 1568, 2093] : h === 4 ? [1175, 1319, 1568, 2093] : h === 3 ? [1319, 1568, 2093] : [1568, 2093];
    const gap = h >= 5 ? 0.025 : h === 4 ? 0.03 : h === 3 ? 0.035 : 0.04, v = h >= 5 ? 0.16 : h === 4 ? 0.14 : h === 3 ? 0.12 : 0.1;
    fs.forEach((f, k) => (tone('sine', f, f, t + k * gap, 0.3, v), tone('sine', f * 2.76, f * 2.76, t + k * gap, 0.12, v * 0.4)));
    if (h >= 4) thud(t, h >= 5 ? 120 : 140, h >= 5 ? 0.8 : 0.6), tone('sine', h >= 5 ? 4186 : 3136, h >= 5 ? 4186 : 3136, t + 0.05, h >= 5 ? 0.6 : 0.4, h >= 5 ? 0.04 : 0.05);
  },
  press: (t) => void tone('triangle', 1100, 900, t, 0.025, 0.1),
  twist(t) { for (let k = 0; k < 5; k++) hiss(t + k * 0.03, 0.012, 0.14 + k * 0.04, filt('bandpass', 2400 + 450 * k, 8)); },
  pluck: (t) => void (tone('sine', 380, 980, t, 0.07, 0.32), hiss(t, 0.02, 0.1, filt('highpass', 2000))),
  in(t, n) {
    mar(t, streakHz(n));
    if (n >= 5) tone('sine', streakHz(n) * 1.5, streakHz(n) * 1.5, t, 0.2, 0.15 * 0.38);
    if (n >= 11) mar(t, streakHz(n) / 2, 0.5);
  },
  slot: (t) => void (tone('triangle', 260, 200, t, 0.1, 0.26), tone('sine', 1320, 1320, t, 0.08, 0.05)),
  brk: (t) => void (mar(t + 0.03, 659, 0.32), mar(t + 0.1, 523, 0.32)),
  pull: (t) => void (mar(t, 784, 0.65), hiss(t, 0.06, 0.08, filt('bandpass', 3000, 2))),
  done(t) {
    thud(t, 170);
    for (const d of [0.05, 0.095]) hiss(t + d, 0.01, 0.18, filt('bandpass', 3800, 4));
    [1046, 1319, 1568].forEach((f, k) => tone('triangle', f, f, t + 0.12 + k * 0.055, 0.26, 0.2));
  },
  swing: (t, k) => creak(t, 0.38 * Math.pow(0.7, k), 0.22 * Math.pow(0.6, k)),
  fall: (t) => creak(t, 0.12, 0.14),
  thud: (t, f) => void (thud(t, f || 140), thud(t + 0.17, (f || 140) * 1.1, 0.35)),
  reveal: (t, k) => void (tone('sine', 2093 * Math.pow(2, [0, 2, 4, 7, 9][k % 5] / 12), 2093, t, 0.16, 0.12), tone('sine', 3136, 3136, t, 0.16, 0.06)),
  boing(t) {
    const o = tone('sine', 220, 660, t, 0.34, 0.3);
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(660, t + 0.04);
    o.frequency.exponentialRampToValueAtTime(330, t + 0.34);
  },
  tick: (t) => void (hiss(t, 0.08, 0.3, filt('lowpass', 2000)), tone('sine', 600, 200, t, 0.09, 0.3)),
  key(t) {
    hiss(t, 0.01, 0.2, filt('bandpass', 2500, 4));
    hiss(t + 0.06, 0.01, 0.2, filt('bandpass', 3500, 4));
    tone('sine', 1760, 1760, t + 0.1, 0.3, 0.14), tone('sine', 2640, 2640, t + 0.1, 0.3, 0.07);
  },
  blocked: (t) => void (tone('triangle', 300, 300, t, 0.035, 0.18), tone('triangle', 300, 300, t + 0.07, 0.035, 0.18)),
  clear(t) {
    for (let k = 0; k < 11; k++) mar(t + k * 0.035, streakHz(k + 1), 0.42 + k * 0.02);
    for (const f of [1568, 2349, 3136]) tone('sine', f, f, t + 0.42, 0.7, 0.22 / 2);
    hiss(t + 0.42, 0.5, 0.04, filt('highpass', 6000));
  },
  star(t, k) {
    const f = [1319, 1568, 2093][Math.max(0, Math.min(2, k))];
    mar(t, f), tone('sine', f * 2.76, f * 2.76, t, 0.3, 0.1);
  },
  jam(t) {
    const o = tone('sine', 880, 330, t, 0.42, 0.24), lfo = ac!.createOscillator(), lg = ac!.createGain();
    lfo.frequency.value = 7;
    lg.gain.value = 25;
    lfo.connect(lg).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + 0.44);
  },
  fail(t) {
    tone('sine', 500, 180, t, 0.08, 0.3);
    for (let k = 0; k < 5; k++) hiss(t + 0.1 + k * (0.04 + 0.006 * k), 0.015, 0.15, filt('bandpass', 3000, 3));
  },
};

/** 진동 패턴 (🎨 §2 — 안드로이드만, 지원 안 되면 무시) */
const BUZZ: Partial<Record<Cue, number | number[]>> = {
  bonk: [35, 25, 15],
  press: 8, twist: [6, 28, 6, 28, 6], pluck: 10, slot: 20, pull: 10, done: [25, 30, 15], swing: [10, 70, 10], thud: 40,
  boing: [15, 30, 15], tick: 25, key: [10, 40, 20], blocked: [10, 40, 10], clear: [20, 40, 20, 40, 80], star: 15, jam: [40, 60, 30], fail: [30, 60, 30],
};

export const sfx = {
  muted: false,
  noBuzz: false,
  /** AudioContext를 만들었는가 (테스트: 시작 전엔 false) */
  get made() { return !!ac; },
  /** 사용자 입력 안에서 부른다: 처음이면 만들고, 멈춰 있으면 깨운다 */
  wake() {
    woke = true; // 진동은 첫 사용자 입력 뒤에만 (소리를 꺼 둬도 진동은 따로)
    if (this.muted || typeof window === 'undefined') return;
    if (!ac) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return;
      try { (navigator as unknown as { audioSession?: { type: string } }).audioSession!.type = 'ambient'; } catch { /* 없음 */ }
      ac = new C();
      const comp = ac.createDynamicsCompressor();
      comp.threshold.value = -14, comp.knee.value = 6, comp.ratio.value = 4, comp.attack.value = 0.003, comp.release.value = 0.12;
      master = ac.createGain();
      master.gain.value = 0.5;
      master.connect(comp).connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate / 2, ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state !== 'running') void ac.resume().catch(() => {});
  },
  sleep() { if (ac && ac.state === 'running') void ac.suspend().catch(() => {}); },
  setMuted(m: boolean) { this.muted = m; if (m) this.sleep(); },
  play(c: Cue, v = 0) {
    this.buzz(c);
    if (this.muted || !ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    if (c !== 'in' && c !== 'reveal' && now - (last[c] ?? -1) < 0.025) return; // 같은 소리 25ms 안은 하나로
    last[c] = now;
    try { SYNTH[c](now + 0.005, v); } catch { /* 소리 실패가 게임을 멈추지 않게 */ }
  },
  buzz(c: Cue) {
    const p = c === 'in' ? 12 : c === 'shot' ? undefined : BUZZ[c];
    if (p === undefined || this.noBuzz || !woke || typeof navigator === 'undefined' || !navigator.vibrate) return;
    const now = performance.now();
    if (now - lastBuzz < 45) return;
    lastBuzz = now;
    try { navigator.vibrate(p); } catch { /* 무시 */ }
  },
};
