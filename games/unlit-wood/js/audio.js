// 소리: 모두 그 자리에서 합성한다 (파일 없음). 바람, 낮은 울림, 유리와 날개 소리.
export class Sound {
  constructor() { this.ctx = null; this.muted = false; this.loops = {}; }

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC(); } catch (e) { return; }
    const c = this.ctx;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.9; this.master.connect(c.destination);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // 늘 깔리는 것: 바람, 낮은 울림
    this.loop('wind', 'lowpass', 420, 0.6, 0.05);
    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 0.09; lg.gain.value = 0.028; lfo.connect(lg); lg.connect(this.loops.wind.g.gain); lfo.start();
    for (const [f, v] of [[55, 0.05], [82.6, 0.022], [110.4, 0.012]]) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(this.master); o.start(); }
    // 상황에 따라 커지는 것: 전구의 웅웅거림, 날갯짓, 밀물, 감시자
    this.loop('moth', 'bandpass', 2600, 2.5, 0);
    const trem = c.createOscillator(), tg = c.createGain(); trem.type = 'square'; trem.frequency.value = 23; tg.gain.value = 0.5; trem.connect(tg); tg.connect(this.loops.moth.pre.gain); trem.start();
    this.loop('tide', 'lowpass', 130, 1.2, 0);
    this.loop('creep', 'bandpass', 300, 5, 0);
    const hum = c.createOscillator(), hg = c.createGain(); hum.type = 'triangle'; hum.frequency.value = 118; hg.gain.value = 0; hum.connect(hg); hg.connect(this.master); hum.start(); this.hum = hg;
    const wt = c.createOscillator(), wg = c.createGain(); wt.type = 'sawtooth'; wt.frequency.value = 196; wg.gain.value = 0;
    const wf = c.createBiquadFilter(); wf.type = 'lowpass'; wf.frequency.value = 700; wt.connect(wf); wf.connect(wg); wg.connect(this.master); wt.start(); this.watch = wg; this.watchOsc = wt;
  }

  loop(name, type, freq, q, vol) {
    const c = this.ctx, src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const pre = c.createGain(); pre.gain.value = 1; const g = c.createGain(); g.gain.value = vol;
    src.connect(f); f.connect(pre); pre.connect(g); g.connect(this.master); src.start();
    this.loops[name] = { g, f, pre };
  }

  setMuted(m) { this.muted = m; if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05); }
  suspend(on) { if (this.ctx) { try { on ? this.ctx.suspend() : this.ctx.resume(); } catch (e) { /* */ } } }

  tone(freq, dur, vol = 0.1, type = 'sine', slide = 0, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  noise(dur, vol = 0.1, type = 'lowpass', freq = 800, q = 0.8, delay = 0, slide = 0) {
    const c = this.ctx; if (!c) return;
    const t0 = c.currentTime + delay, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; s.loop = true; f.type = type; f.frequency.setValueAtTime(freq, t0); f.Q.value = q;
    if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  }
  bell(freq, vol = 0.08, delay = 0, dur = 1.6) { this.tone(freq, dur, vol, 'sine', 0, delay); this.tone(freq * 2.76, dur * 0.5, vol * 0.3, 'sine', 0, delay); this.tone(freq * 5.4, dur * 0.25, vol * 0.12, 'sine', 0, delay); }

  // 세계에서 일어난 일들을 소리로
  consume(events) {
    if (!this.ctx) return;
    for (const e of events) {
      switch (e.type) {
        case 'step': this.noise(0.07, 0.035, 'lowpass', 260 + Math.random() * 160, 0.7); break;
        case 'jump': this.noise(0.12, 0.03, 'bandpass', 500, 1, 0, 2.2); break;
        case 'land': if (e.soft) this.noise(0.3, 0.07, 'highpass', 1800, 0.5); else this.noise(0.12, Math.min(0.16, 0.04 + e.drop * 0.02), 'lowpass', 180, 0.7); break;
        case 'light': if (e.on) { this.tone(1900, 0.03, 0.05, 'square'); this.tone(660, 0.5, 0.035, 'sine', 1.5); } else { this.tone(1300, 0.03, 0.04, 'square'); this.tone(520, 0.2, 0.02, 'sine', 0.5); } break;
        case 'crack': this.tone(3100, 0.05, 0.11, 'triangle'); this.tone(2300, 0.1, 0.07, 'triangle', 0.8, 0.03); this.noise(0.08, 0.1, 'highpass', 3000, 1); break;
        case 'shatter': this.noise(0.5, 0.22, 'highpass', 2200, 0.6, 0, 0.5); for (let i = 0; i < 7; i++) this.tone(2400 + Math.random() * 3400, 0.12 + Math.random() * 0.25, 0.05, 'triangle', 0.9, Math.random() * 0.3); this.tone(70, 0.5, 0.2, 'sine', 0.5, 0.05); break;
        case 'heal': this.bell(880, 0.04, 0.15, 1.2); break;
        case 'checkpoint': this.bell(523, 0.07); this.bell(784, 0.06, 0.16); this.noise(0.6, 0.03, 'bandpass', 1200, 1, 0, 2.5); break;
        case 'bloom': [1047, 1319, 1568, 2093].forEach((f, i) => this.bell(f, 0.035, i * 0.09, 1.3)); break;
        case 'push': this.noise(0.22, 0.05, 'bandpass', 180 + Math.random() * 60, 2); break;
        case 'crateReset': this.noise(0.3, 0.05, 'lowpass', 300, 1); break;
        case 'mothStir': this.noise(0.25, 0.03, 'bandpass', 3200, 3); break;
        case 'mothAlert': this.noise(0.5, 0.07, 'bandpass', 2400, 3, 0, 1.6); this.tone(1480, 0.3, 0.02, 'sawtooth', 1.3); break;
        case 'bite': this.noise(0.1, 0.12, 'bandpass', 2000, 2); break;
        case 'recoil': this.noise(0.5, 0.06, 'bandpass', 900, 3, 0, 0.25); break;
        case 'grabbed': this.tone(92, 0.4, 0.14, 'sawtooth', 0.6); this.noise(0.3, 0.1, 'lowpass', 300, 1); break;
        case 'watchSee': this.tone(392, 0.35, 0.05, 'sawtooth', 1.5); break;
        case 'caught': this.tone(196, 0.7, 0.14, 'sawtooth', 0.5); this.tone(207, 0.7, 0.12, 'sawtooth', 0.5); this.noise(0.4, 0.12, 'bandpass', 600, 2); break;
        case 'lift': if (e.on) { this.tone(140, 0.35, 0.05, 'sawtooth', 1.25); this.noise(0.3, 0.04, 'bandpass', 700, 6); } break;
        case 'tideStart': this.tone(48, 2.2, 0.22, 'sine', 0.8); this.noise(2, 0.12, 'lowpass', 200, 1); break;
        case 'respawn': this.noise(0.5, 0.03, 'bandpass', 600, 1, 0, 2); break;
        case 'end': [262, 330, 392, 523, 659, 784].forEach((f, i) => this.bell(f, 0.06, 0.25 + i * 0.22, 4)); this.tone(65, 5, 0.12, 'sine'); break;
      }
    }
  }

  // 이어지는 소리의 크기를 상황에 맞춘다
  levels(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, set = (p, v) => p.setTargetAtTime(v, t, 0.12);
    set(this.hum.gain, o.lit ? 0.012 : 0);
    set(this.loops.moth.g.gain, o.moth * 0.09);
    set(this.loops.tide.g.gain, o.tide * 0.5);
    set(this.loops.creep.g.gain, o.creep * 0.05);
    set(this.watch.gain, o.watch * 0.035); set(this.watchOsc.frequency, 196 + o.watch * 190);
    set(this.loops.wind.f.frequency, o.inside ? 190 : 420);
  }
}
