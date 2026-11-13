/**
 * 양치기 멍멍 — 효과음 (C010 M1-6, 🎨 ART §8 합성 · C010 결정: W1 6종 = 멍! · 매에 · 까만 양 매에 · 딸깍(+문 닫힘 쿵) · 풍덩 · 별 띵).
 * 샘플 파일 없이 WebAudio로 합성한다. **첫 입력(시작 누름) 전에는 AudioContext를 만들지 않는다**, 꺼 두었으면 아예 만들지 않는다.
 * 시뮬레이션은 모른다 — 그림(draw)·카드가 순간에 cue를 부른다(결정성·봇 측정에 영향 없음).
 */
export type Cue = 'bark' | 'baa' | 'baaBlack' | 'click' | 'splash' | 'star' | 'stamp';

type AC = AudioContext;
let ac: AC | null = null, master: GainNode | null = null, noise: AudioBuffer | null = null, muted = false;

/** 피치 바뀌는 오실레이터 하나 (곡선: 지수) */
function tone(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, out: AudioNode) {
  const c = ac!, o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  return o;
}
function filter(type: BiquadFilterType, f: number, q = 1) {
  const b = ac!.createBiquadFilter();
  b.type = type;
  b.frequency.value = f;
  b.Q.value = q;
  b.connect(master!);
  return b;
}
function hiss(t0: number, dur: number, vol: number, out: AudioNode) {
  const c = ac!, src = c.createBufferSource(), g = c.createGain();
  src.buffer = noise;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g).connect(out);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
  return src;
}
const semi = (n: number) => Math.pow(2, n / 12);

/** 소리마다 합성 (ART §8 값) — v: 멍은 피치 배수, 딸깍은 들어간 수(최대 3)·문 닫힘, 별은 몇 번째 별 */
const SYNTH: Record<Cue, (t: number, v: number, last: boolean) => void> = {
  bark(t, v) {
    const lp = filter('lowpass', 1800);
    tone('square', 440 * v, 220 * v, t, 0.16, 0.5, lp);
    tone('sawtooth', 220 * v, 110 * v, t, 0.16, 0.15, lp);
  },
  baa(t) { baa(t + 0.06, 520, 7, 0.45); },
  baaBlack(t) { baa(t + 0.26, 340, 5, 0.5); }, // 🧪 C010: 멍!·흰 매에와 0.2초 떼기
  click(t, n, last) {
    for (let k = 0; k < Math.min(3, Math.max(1, n)); k++) {
      const tk = t + k * 0.09;
      hiss(tk, 0.03, 0.45, filter('highpass', 2500));
      tone('sine', 1800 * semi(2 * k), 1800 * semi(2 * k), tk, 0.05, 0.45, master!);
      tone('triangle', 900 * semi(2 * k), 700 * semi(2 * k), tk, 0.06, 0.3, master!);
    }
    if (last) tone('square', 260, 180, t + Math.min(3, n) * 0.09, 0.1, 0.45, filter('lowpass', 1400));
  },
  splash(t) {
    const lp = filter('lowpass', 800);
    lp.frequency.setValueAtTime(800, t);
    lp.frequency.exponentialRampToValueAtTime(200, t + 0.35);
    hiss(t, 0.35, 0.5, lp);
    tone('sine', 300, 80, t, 0.35, 0.4, master!);
    tone('sine', 420, 980, t + 0.04, 0.14, 0.4, master!); // 오르는 '퐁'
    // 허우적 물방울 퐁 셋 (🎨 C012 ⓔ): 양이 솟는 꼭대기에 맞춰 +75·+225ms, 끝에 +300ms
    for (const [d, f0, f1] of [[0.075, 1100, 1900], [0.225, 1300, 2100], [0.3, 900, 1500]]) tone('sine', f0, f1, t + d, 0.05, 0.25, master!);
  },
  // 🏅 '한 번에!' 도장 (🎨 C011): 쿵(삼각 240→70Hz) + 탁(노이즈) + 70ms 뒤 짠(G6 + 1.5배) — 별 띵 C·D·E 다음을 G로 맺는다
  stamp(t) {
    tone('triangle', 240, 70, t, 0.18, 0.6, filter('lowpass', 900));
    hiss(t, 0.04, 0.4, filter('lowpass', 1500));
    tone('sine', 1568, 1568, t + 0.07, 0.5, 0.3, master!);
    tone('sine', 2352, 2352, t + 0.07, 0.5, 0.15, master!);
  },
  star(t, k) {
    const f = 1046.5 * semi(2 * k); // C6 → D6 → E6
    tone('sine', f, f, t, 0.4, 0.35, master!);
    tone('sine', f * 1.5, f * 1.5, t, 0.4, 0.17, master!);
  },
};
function baa(t: number, f: number, lfoHz: number, dur: number) {
  const c = ac!, o = c.createOscillator(), lfo = c.createOscillator(), depth = c.createGain(), g = c.createGain(), bp = filter('bandpass', 1200, 4);
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(f, t);
  o.frequency.linearRampToValueAtTime(f * 0.9, t + dur);
  lfo.frequency.value = lfoHz;
  depth.gain.value = 25;
  lfo.connect(depth).connect(o.frequency);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
  g.gain.setValueAtTime(0.5, t + dur - 0.12);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bp);
  for (const x of [o, lfo]) x.start(t), x.stop(t + dur + 0.02);
}

export const sfx = {
  /** 사용자 입력 안에서만 부른다(시작 버튼·키). 꺼져 있으면 만들지 않는다 */
  wake() {
    if (muted) return;
    if (!ac) {
      const G = globalThis as unknown as { AudioContext?: new () => AC; webkitAudioContext?: new () => AC }, Ctor = G.AudioContext ?? G.webkitAudioContext; // 옛 사파리 (PM C010)
      if (!Ctor) return;
      ac = new Ctor();
      master = ac.createGain();
      master.gain.value = 0.6;
      master.connect(ac.destination);
      noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.4), ac.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    // 앱을 오가거나 화면이 잠기면 suspended(아이폰은 interrupted)가 된다 → 누를 때마다 다시 깨운다 (PM C010, M1-7 ①)
    if (ac.state !== 'running') {
      void ac.resume().catch(() => {});
      // 아이폰 잠금 풀기: 무음 한 샘플을 사용자 입력 안에서 튼다
      const src = ac.createBufferSource();
      src.buffer = ac.createBuffer(1, 1, ac.sampleRate);
      src.connect(ac.destination);
      src.start(0);
    }
  },
  /** 소리 하나. delay(초) 뒤에 */
  play(c: Cue, v = 1, last = false, delay = 0) {
    if (!ac || muted) return; // 막 깨어나 아직 suspended여도 예약해 두면 resume 뒤에 난다
    SYNTH[c](ac.currentTime + 0.005 + delay, v, last);
  },
  get muted() { return muted; },
  setMuted(m: boolean) {
    muted = m;
    if (master && ac) master.gain.setValueAtTime(m ? 0 : 0.6, ac.currentTime);
  },
  /** 확인용: AudioContext를 만들었나 */
  get made() { return !!ac; },
};
