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
        case 'step': this.noise(0.06, 0.03, 'lowpass', (e.kind === 'sword' ? 900 : 300) + Math.random() * 160, 0.7); break;
        case 'jump': this.noise(0.12, 0.03, 'bandpass', 500, 1, 0, 2.2); break;
        case 'land': this.noise(0.1, Math.min(0.12, 0.03 + e.v * 0.006), 'lowpass', 190, 0.7); break;
        case 'stick': this.tone(180, 0.12, 0.1, 'triangle', 0.6); this.noise(0.08, 0.08, 'bandpass', 1400, 2); break;
        case 'light': if (e.on) { this.tone(1900, 0.03, 0.05, 'square'); this.tone(660, 0.5, 0.035, 'sine', 1.5); } else { this.tone(1300, 0.03, 0.04, 'square'); this.tone(520, 0.2, 0.02, 'sine', 0.5); } break;
        case 'flash': this.noise(0.25, 0.06, 'highpass', 2500, 0.7, 0, 0.4); break;
        case 'slash': this.noise(0.16, 0.09, 'bandpass', 2600, 1.2, 0, 0.35); this.tone(1320, 0.14, 0.03, 'sine', 1.6); break;
        case 'shoot': this.tone(240, 0.12, 0.08, 'triangle', 2.4); this.noise(0.1, 0.05, 'highpass', 3000, 1); break;
        case 'arrowBreak': this.tone(2100, 0.08, 0.03, 'triangle', 0.7); break;
        case 'peg': this.tone(310, 0.1, 0.09, 'triangle', 0.7); this.bell(1568, 0.02, 0.02, 0.6); break;
        case 'crystal': [784, 988, 1175].forEach((f, i) => this.bell(f, 0.05, i * 0.07, 1.4)); break;
        case 'gate': this.noise(0.6, 0.07, 'lowpass', 160, 1.2); this.tone(70, 0.6, 0.1, 'sine', 0.8); break;
        case 'lichen': [1319, 1568, 1760, 2093].forEach((f, i) => this.bell(f, 0.03, i * 0.12, 1.2)); break;
        case 'ropeCut': this.tone(520, 0.08, 0.08, 'sawtooth', 0.4); break;
        case 'slabLand': this.noise(0.3, 0.16, 'lowpass', 140, 0.8); this.tone(55, 0.4, 0.16, 'sine', 0.7); break;
        case 'hurt': this.tone(196, 0.3, 0.12, 'triangle', 0.6); this.noise(0.15, 0.08, 'lowpass', 400, 1); break;
        case 'fade': this.tone(330, 1.1, 0.1, 'sine', 0.3); break;
        case 'respawn': this.noise(0.5, 0.03, 'bandpass', 600, 1, 0, 2); break;
        case 'enter': this.tone(520, 0.18, 0.06, 'sine', 1.6); this.bell(1047, 0.03, 0.06, 0.8); break;
        case 'exit': this.tone(830, 0.18, 0.05, 'sine', 0.62); break;
        case 'nope': this.tone(220, 0.08, 0.03, 'sine'); break;
        // 꺼지는 소리: 터지는 소리가 아니라 작은 한숨. 뒤로 갈수록 더 조용하고 길다.
        case 'putOut': if (e.kind === 'moth') { this.noise(0.25, 0.05, 'highpass', 4000, 1, 0, 0.5); } else { const f = e.kind === 'guardian' ? 196 : e.kind === 'little' ? 523 : 330; this.tone(f, 0.9, 0.07, 'sine', 0.55); this.tone(f * 1.5, 0.7, 0.03, 'sine', 0.55, 0.05); this.noise(0.5, 0.025, 'bandpass', 700, 1, 0, 0.4); } break;
        case 'guardHit': this.tone(147, 0.45, 0.09, 'sine', 0.8); this.tone(155, 0.45, 0.06, 'sine', 0.8); break;
        case 'cower': this.tone(880 + Math.random() * 200, 0.07, 0.012, 'sine', 1.3); break;
        case 'touch': this.noise(0.12, 0.06, 'lowpass', 300, 1); break;
        case 'mothStir': this.noise(0.25, 0.03, 'bandpass', 3200, 3); break;
        case 'shrine': this.bell(523, 0.07); this.bell(784, 0.06, 0.16); break;
        case 'heal': this.bell(880, 0.04, 0.1, 1.2); break;
        case 'pit': this.tone(300, 0.3, 0.05, 'sine', 0.4); break;
        case 'goal': [262, 330, 392, 523, 659].forEach((f, i) => this.bell(f, 0.06, i * 0.18, 3)); break;
      }
    }
  }

  // 나이트의 자장가: 아이들이 꺼질수록 음이 빠진다
  lullaby(dt, ratio, on) {
    if (!this.ctx || !on) return;
    this.beat = (this.beat || 0) + dt;
    if (this.beat < 0.62) return;
    this.beat = 0; this.note = ((this.note || 0) + 1) % 16;
    const mel = [392, 0, 440, 494, 0, 440, 392, 0, 330, 0, 392, 440, 0, 392, 330, 294], f = mel[this.note];
    const keep = ((this.note * 7 + 3) % 16) / 16 < ratio;        // 남은 아이들의 비율만큼만 들린다
    if (f && keep) this.bell(f * 0.5, 0.028, 0, 2.2);
  }

  levels(o) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime, set = (p, v) => p.setTargetAtTime(v, t, 0.12);
    set(this.hum.gain, o.lit ? 0.01 : 0);
    set(this.loops.moth.g.gain, o.moth * 0.07);
    set(this.loops.tide.g.gain, 0); set(this.loops.creep.g.gain, o.creep * 0.035); set(this.watch.gain, 0);
    set(this.loops.wind.f.frequency, o.inside ? 200 : 420);
  }
}
