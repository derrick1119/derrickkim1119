// 소리. 음원 파일 없이 Web Audio 로 전부 합성한다.
// 브라우저 정책상 첫 터치 뒤에만 소리가 나므로 unlock() 은 반드시 터치 핸들러 안에서 부른다.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI 번호 → Hz

/** 배경 음악의 화음 진행(MIDI). 느리고 몽글몽글한 밤하늘 분위기. */
const CHORDS = [
  [48, 55, 60, 64, 67], // C
  [45, 52, 57, 60, 64], // Am
  [41, 48, 57, 60, 65], // F
  [43, 50, 55, 59, 62], // G
];
const BELL_SCALE = [72, 74, 76, 79, 81, 84, 86, 88];
const BAR = 4.4; // 한 마디(초)

export class GameAudio {
  /** @param {{sfx: boolean, music: boolean}} settings */
  constructor(settings) {
    this.sfxOn = settings.sfx;
    this.musicOn = settings.music;
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicFilter = null;
    this.sfxGain = null;
    this.noise = null;
    this._timer = null;
    this._nextBar = 0;
    this._bar = 0;
    this._tension = 0;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running';
  }

  /** 첫 터치에서 오디오를 깨운다. 여러 번 불러도 된다. */
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        this.ctx = ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0.9;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 5;
        this.master.connect(comp).connect(ctx.destination);
        this.sfxGain = ctx.createGain();
        this.sfxGain.gain.value = 0.6;
        this.sfxGain.connect(this.master);
        this.musicFilter = ctx.createBiquadFilter();
        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 5200;
        this.musicGain = ctx.createGain();
        this.musicGain.gain.value = this.musicOn ? 0.5 : 0;
        // 메아리
        const delay = ctx.createDelay(1);
        delay.delayTime.value = 0.42;
        const fb = ctx.createGain();
        fb.gain.value = 0.34;
        const wet = ctx.createGain();
        wet.gain.value = 0.4;
        this.musicGain.connect(this.musicFilter);
        this.musicFilter.connect(this.master);
        this.musicFilter.connect(delay);
        delay.connect(fb).connect(delay);
        delay.connect(wet).connect(this.master);
        // 잡음 버퍼(바람·셔터 소리용)
        const len = ctx.sampleRate;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
        this.noise = buf;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      this._startMusic();
    } catch {
      this.ctx = null; // 소리가 안 나도 게임은 계속된다
    }
  }

  suspend() {
    this._stopMusic();
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (!this.ctx) return;
    this.ctx.resume().catch(() => {});
    this._startMusic();
  }

  setSfx(on) {
    this.sfxOn = on;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
    if (on) this._startMusic();
  }

  /** 긴장도 0..1. 누가 하늘을 보면 음악이 숨죽인 듯 먹먹해진다. */
  setTension(v) {
    if (!this.ctx || v === this._tension) return;
    this._tension = v;
    this.musicFilter.frequency.setTargetAtTime(v > 0 ? 520 : 5200, this.ctx.currentTime, 0.12);
  }

  // ───────── 합성 도구 ─────────

  _tone({ freq, to, type = 'sine', at = 0, dur = 0.15, gain = 0.3, attack = 0.005, out = this.sfxGain, vibrato = 0 }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    if (vibrato) {
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      lfo.frequency.value = 6;
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ at = 0, dur = 0.1, gain = 0.3, freq = 2000, to, q = 1, type = 'bandpass' }) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  // ───────── 효과음 ─────────

  /**
   * 효과음을 낸다.
   * @param {string} name
   * @param {{tier?: number}} [opts] tier = 표본 등급(높을수록 높은 음)
   */
  sfx(name, opts = {}) {
    if (!this.sfxOn || !this.ready) return;
    try {
      this._play(name, opts);
    } catch {
      /* 소리 하나 실패해도 무시 */
    }
  }

  _play(name, { tier = 0 }) {
    switch (name) {
      case 'collect': {
        const base = NOTE(72 + [0, 2, 4, 7, 9, 12, 14, 16, 19, 21][Math.min(tier, 9)]);
        this._tone({ freq: base * 0.5, to: base, type: 'triangle', dur: 0.09, gain: 0.3 });
        this._tone({ freq: base * 1.5, type: 'sine', at: 0.07, dur: 0.16, gain: 0.22 });
        break;
      }
      case 'auto':
        this._tone({ freq: NOTE(84), type: 'sine', dur: 0.08, gain: 0.08 });
        break;
      case 'poke':
        this._tone({ freq: 320, to: 520, type: 'square', dur: 0.07, gain: 0.1 });
        break;
      case 'click':
        this._tone({ freq: 660, to: 880, type: 'triangle', dur: 0.05, gain: 0.16 });
        break;
      case 'open':
        this._tone({ freq: 440, to: 660, type: 'triangle', dur: 0.08, gain: 0.14 });
        break;
      case 'deny':
        this._tone({ freq: 220, to: 160, type: 'square', dur: 0.12, gain: 0.12 });
        this._tone({ freq: 200, to: 140, type: 'square', at: 0.11, dur: 0.14, gain: 0.12 });
        break;
      case 'notice':
        this._tone({ freq: NOTE(79), type: 'triangle', dur: 0.09, gain: 0.26 });
        this._tone({ freq: NOTE(83), type: 'triangle', at: 0.1, dur: 0.12, gain: 0.26 });
        break;
      case 'gaze':
        this._tone({ freq: 196, to: 174, type: 'sawtooth', dur: 0.35, gain: 0.12 });
        this._tone({ freq: 98, type: 'sine', dur: 0.4, gain: 0.3 });
        break;
      case 'safe':
        this._tone({ freq: NOTE(76), to: NOTE(72), type: 'sine', dur: 0.22, gain: 0.12 });
        break;
      case 'cloakOn':
        this._noise({ dur: 0.45, gain: 0.3, freq: 400, to: 2400, q: 0.8 });
        this._tone({ freq: 300, to: 900, type: 'sine', dur: 0.35, gain: 0.14, vibrato: 14 });
        break;
      case 'cloakOff':
        this._noise({ dur: 0.3, gain: 0.2, freq: 2200, to: 500, q: 0.8 });
        break;
      case 'ready':
        this._tone({ freq: NOTE(84), type: 'sine', dur: 0.1, gain: 0.14 });
        this._tone({ freq: NOTE(88), type: 'sine', at: 0.09, dur: 0.16, gain: 0.14 });
        break;
      case 'buy':
        [84, 88, 91].forEach((n, i) => this._tone({ freq: NOTE(n), type: 'triangle', at: i * 0.06, dur: 0.14, gain: 0.22 }));
        break;
      case 'coin':
        this._tone({ freq: NOTE(88), type: 'square', dur: 0.06, gain: 0.1 });
        this._tone({ freq: NOTE(93), type: 'square', at: 0.06, dur: 0.18, gain: 0.1 });
        break;
      case 'formUp':
        [72, 76, 79, 84, 88, 91].forEach((n, i) => this._tone({ freq: NOTE(n), type: 'triangle', at: i * 0.07, dur: 0.3, gain: 0.24 }));
        this._noise({ at: 0.3, dur: 0.5, gain: 0.08, freq: 6000, q: 0.5, type: 'highpass' });
        break;
      case 'launch':
        this._tone({ freq: 180, to: 1400, type: 'sawtooth', dur: 0.5, gain: 0.12, vibrato: 20 });
        this._noise({ dur: 0.5, gain: 0.16, freq: 600, to: 3000 });
        break;
      case 'suspense':
        for (let i = 0; i < 12; i++) this._tone({ freq: 110, to: 70, type: 'sine', at: i * 0.15, dur: 0.1, gain: 0.34 - i * 0.012 });
        break;
      case 'success':
        [72, 76, 79, 84].forEach((n, i) => this._tone({ freq: NOTE(n), type: 'triangle', at: i * 0.09, dur: 0.24, gain: 0.26 }));
        [76, 79, 84, 88].forEach((n) => this._tone({ freq: NOTE(n), type: 'sine', at: 0.4, dur: 0.6, gain: 0.14 }));
        break;
      case 'spotted':
        // 찰칵, 그리고 맥 빠지는 하강음
        this._noise({ dur: 0.05, gain: 0.6, freq: 5000, q: 0.6, type: 'highpass' });
        this._noise({ at: 0.09, dur: 0.07, gain: 0.5, freq: 3000, q: 0.6, type: 'highpass' });
        this._tone({ freq: 880, type: 'square', dur: 0.08, gain: 0.16 });
        [70, 69, 68, 67].forEach((n, i) => this._tone({ freq: NOTE(n - 12), type: 'sawtooth', at: 0.32 + i * 0.2, dur: i === 3 ? 0.6 : 0.2, gain: 0.13, vibrato: i === 3 ? 10 : 0 }));
        break;
      case 'stamp':
        this._noise({ dur: 0.12, gain: 0.5, freq: 300, q: 0.7, type: 'lowpass' });
        this._tone({ freq: 120, to: 50, type: 'sine', dur: 0.16, gain: 0.5 });
        break;
      case 'arrive':
        this._tone({ freq: 1200, to: 300, type: 'sine', dur: 0.6, gain: 0.14, vibrato: 18 });
        break;
      case 'recall':
        this._tone({ freq: 300, to: 1800, type: 'sine', dur: 0.55, gain: 0.14, vibrato: 18 });
        break;
      case 'achievement':
        [79, 84, 91].forEach((n, i) => this._tone({ freq: NOTE(n), type: 'sine', at: i * 0.1, dur: 0.4, gain: 0.2 }));
        break;
      case 'ending':
        [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => this._tone({ freq: NOTE(n), type: 'triangle', at: i * 0.14, dur: 0.9, gain: 0.2 }));
        break;
    }
  }

  // ───────── 배경 음악 ─────────

  _startMusic() {
    if (!this.ctx || !this.musicOn || this._timer || this.ctx.state !== 'running') {
      // resume() 직후에는 아직 running 이 아닐 수 있으니 잠시 뒤 다시 본다.
      if (this.ctx && this.musicOn && !this._timer && this.ctx.state !== 'running') {
        setTimeout(() => this._startMusic(), 300);
      }
      return;
    }
    this._nextBar = this.ctx.currentTime + 0.1;
    this._timer = setInterval(() => this._schedule(), 400);
    this._schedule();
  }

  _stopMusic() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  _schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this._nextBar < ctx.currentTime - 1) this._nextBar = ctx.currentTime + 0.1; // 오래 멈췄다 돌아온 경우
    while (this._nextBar < ctx.currentTime + 1.2) {
      this._bar++;
      this._playBar(this._nextBar - ctx.currentTime, CHORDS[this._bar % CHORDS.length], this._bar);
      this._nextBar += BAR;
    }
  }

  _playBar(at, chord, bar) {
    const out = this.musicGain;
    // 패드: 살짝 어긋난 두 사인파가 천천히 부풀었다 꺼진다
    for (const n of chord.slice(0, 4)) {
      for (const det of [-0.06, 0.06]) {
        this._tone({ freq: NOTE(n + det), type: 'sine', at, dur: BAR * 1.15, gain: 0.05, attack: BAR * 0.4, out });
      }
    }
    // 베이스
    this._tone({ freq: NOTE(chord[0] - 12), type: 'triangle', at, dur: BAR * 0.9, gain: 0.1, attack: 0.08, out });
    // 종소리: 마디마다 다른 자리에 드문드문
    const steps = [0, 0.25, 0.5, 0.625, 0.75];
    steps.forEach((s, i) => {
      const seed = Math.sin(bar * 12.9898 + i * 78.233) * 43758.5453;
      const r = seed - Math.floor(seed);
      if (r < 0.48) return;
      const tone = chord[1 + Math.floor(r * 97) % 4] + 12;
      const n = r > 0.86 ? BELL_SCALE[Math.floor(r * 53) % BELL_SCALE.length] : tone;
      this._tone({ freq: NOTE(n), type: 'sine', at: at + s * BAR, dur: 1.4, gain: 0.07, attack: 0.008, out });
      this._tone({ freq: NOTE(n) * 2.01, type: 'sine', at: at + s * BAR, dur: 0.5, gain: 0.02, attack: 0.005, out });
    });
    // 테레민 같은 선율: 네 마디에 한 번
    if (bar % 4 === 2) {
      const a = NOTE(chord[2] + 12);
      const b = NOTE(chord[3] + 12);
      this._tone({ freq: a, to: b, type: 'sine', at: at + BAR * 0.1, dur: BAR * 0.8, gain: 0.045, attack: 0.4, vibrato: 5, out });
    }
  }
}
