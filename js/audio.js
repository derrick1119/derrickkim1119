// 소리: 효과음과 배경음을 모두 Web Audio 로 합성한다 (음원 파일 없음)
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// 라 단조 5음계 — 어디를 짚어도 어울린다
const SCALE = [57, 60, 62, 64, 67, 69, 72, 74, 76, 79];

export class Sound {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.last = {};
    this.combo = 0; this.comboT = 0;
    this.musicOn = false;
    this.lit = true;
    this.intensity = 0;
    this.step = 0; this.nextT = 0; this.timer = null;
  }

  // 반드시 사용자의 클릭/터치 안에서 호출
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try {
        this.ctx = new AC();
      } catch (e) { return; }
      const c = this.ctx;
      this.master = c.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.filter = c.createBiquadFilter();
      this.filter.type = 'lowpass'; this.filter.frequency.value = 9000; this.filter.Q.value = 0.4;
      this.comp = c.createDynamicsCompressor();
      this.filter.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
      this.sfx = c.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.filter);
      this.music = c.createGain(); this.music.gain.value = 0; this.music.connect(this.filter);
      this.delay = c.createDelay(1.0); this.delay.delayTime.value = 0.42;
      this.fb = c.createGain(); this.fb.gain.value = 0.36;
      this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.music);
      const len = c.sampleRate;
      this.noiseBuf = c.createBuffer(1, len, c.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  ok(name, gap) {
    if (!this.ctx || !this.enabled) return false;
    const now = this.ctx.currentTime;
    if (gap && now - (this.last[name] || 0) < gap) return false;
    this.last[name] = now;
    return true;
  }

  tone(f0, f1, dur, vol, type = 'sine', delay = 0, dest) {
    const c = this.ctx, t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || this.sfx);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }

  noise(dur, vol, f0, f1, type = 'lowpass', delay = 0) {
    const c = this.ctx, t0 = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(this.sfx);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
  }

  bell(notes, vol, dur, gap = 0) {
    notes.forEach((n, i) => {
      this.tone(NOTE(n), NOTE(n), dur, vol, 'sine', i * gap);
      this.tone(NOTE(n) * 2.01, NOTE(n) * 2.01, dur * 0.6, vol * 0.3, 'sine', i * gap);
    });
  }

  ui() { if (this.ok('ui', 0.03)) this.tone(620, 880, 0.06, 0.07, 'triangle'); }

  setLit(lit) {
    this.lit = lit;
    if (!this.ctx) return;
    this.filter.frequency.setTargetAtTime(lit ? 9000 : 620, this.ctx.currentTime, lit ? 0.03 : 0.12);
  }

  consume(g) {
    if (!this.ctx || !this.enabled) return;
    const evs = g.events;
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      switch (ev.type) {
        case 'shoot': if (this.ok('shoot', 0.07)) this.tone(900, 420, 0.05, 0.035, 'triangle'); break;
        case 'hit': if (this.ok('hit', 0.06)) this.noise(0.04, 0.05, 3200, 1400, 'bandpass'); break;
        case 'kill':
          if (ev.dawn) { if (this.ok('dk', 0.05)) this.tone(700 + Math.random() * 600, 1400, 0.12, 0.03, 'sine'); }
          else if (this.ok('kill', 0.045)) this.tone(260 + Math.random() * 60, 90, 0.09, 0.06, 'sine');
          if (ev.elite) { this.noise(0.4, 0.2, 900, 120); this.bell([64, 69, 76], 0.07, 0.6, 0.06); }
          break;
        case 'xp': {
          const now = this.ctx.currentTime;
          if (now - this.comboT > 0.5) this.combo = 0;
          this.comboT = now;
          if (this.ok('xp', 0.035)) {
            const n = SCALE[Math.min(SCALE.length - 1, this.combo % SCALE.length)] + 12;
            this.tone(NOTE(n), NOTE(n), 0.07, 0.04, 'sine');
            this.combo++;
          }
          break;
        }
        case 'oil': this.tone(520, 780, 0.12, 0.09, 'sine'); this.tone(780, 1040, 0.12, 0.06, 'sine', 0.07); break;
        case 'hurt': this.tone(170, 60, 0.22, 0.22, 'sawtooth'); this.noise(0.14, 0.18, 2400, 500, 'bandpass'); break;
        case 'dark': this.tone(480, 110, 0.28, 0.1, 'sine'); this.noise(0.3, 0.07, 1800, 200); break;
        case 'ignite': this.noise(0.18, 0.08, 400, 4000, 'bandpass'); this.tone(220, 520, 0.12, 0.06, 'triangle'); break;
        case 'flare': {
          const c = ev.charge;
          this.noise(0.35 + 0.3 * c, 0.16 + 0.2 * c, 5000, 200);
          this.tone(110, 50, 0.4, 0.2 + 0.15 * c, 'sine');
          this.bell([69, 76, 81], 0.05 + 0.05 * c, 0.5, 0.02);
          break;
        }
        case 'decoy': this.tone(660, 990, 0.1, 0.05, 'triangle'); break;
        case 'boom': this.noise(0.4, 0.3, 2600, 100); this.tone(120, 40, 0.35, 0.25, 'sine'); break;
        case 'pop': if (this.ok('pop', 0.06)) this.noise(0.1, 0.07, 1800, 300); break;
        case 'beam': if (this.ok('beam', 0.1)) { this.tone(1400, 500, 0.18, 0.06, 'sawtooth'); this.noise(0.14, 0.05, 6000, 2000, 'highpass'); } break;
        case 'lampLit': this.bell([69, 72, 76, 81], 0.11, 1.3, 0.07); this.noise(0.3, 0.07, 600, 5000, 'bandpass'); break;
        case 'lampOut': this.tone(440, 200, 0.5, 0.12, 'triangle'); this.tone(330, 150, 0.6, 0.1, 'triangle', 0.1); break;
        case 'allLit': this.bell([57, 64, 69, 72, 76, 81, 84], 0.12, 2.0, 0.09); break;
        case 'levelup': this.bell([72, 76, 79, 84], 0.09, 0.5, 0.06); break;
        case 'upgrade': this.tone(520, 1040, 0.12, 0.08, 'triangle'); break;
        case 'chest': this.bell([64, 67, 72, 76, 79], 0.08, 0.5, 0.05); break;
        case 'elite': this.tone(90, 70, 0.7, 0.16, 'sawtooth'); break;
        case 'tide': this.noise(1.6, 0.2, 90, 500); this.tone(60, 45, 1.4, 0.2, 'sawtooth'); break;
        case 'boss': this.tone(55, 41, 2.4, 0.3, 'sawtooth'); this.tone(58.3, 43, 2.4, 0.22, 'sawtooth'); this.noise(2.0, 0.14, 200, 60); break;
        case 'bossRing': this.tone(300, 140, 0.25, 0.08, 'square'); break;
        case 'summon': this.tone(140, 220, 0.3, 0.08, 'sawtooth'); break;
        case 'shield': this.tone(880, 440, 0.4, 0.08, 'square'); this.tone(1320, 660, 0.4, 0.05, 'square', 0.05); break;
        case 'shieldBreak': this.noise(0.5, 0.3, 7000, 1500, 'highpass'); this.bell([76, 81, 88], 0.12, 0.8, 0.03); break;
        case 'block': if (this.ok('block', 0.1)) this.tone(1500, 1200, 0.04, 0.04, 'square'); break;
        case 'windup': if (this.ok('windup', 0.2)) this.tone(80, 150, 0.6, 0.12, 'sawtooth'); break;
        case 'wake': if (this.ok('wake', 0.3)) this.tone(200, 320, 0.15, 0.06, 'square'); break;
        case 'spit': if (this.ok('spit', 0.08)) this.tone(420, 180, 0.12, 0.05, 'square'); break;
        case 'bossDead': this.noise(1.6, 0.3, 4000, 80); this.bell([57, 64, 69, 76, 81], 0.14, 2.2, 0.1); break;
        case 'revive': this.bell([64, 69, 76, 81], 0.14, 1.2, 0.06); break;
        case 'dawn': this.bell([60, 64, 67, 72, 76, 79, 84], 0.12, 3.0, 0.16); break;
        case 'dead': this.tone(330, 55, 1.4, 0.2, 'triangle'); this.noise(1.2, 0.12, 900, 60); break;
      }
    }
  }

  // ---------- 배경음: 느린 드론 + 드문드문 울리는 음 ----------
  startMusic() {
    if (!this.ctx || this.musicOn) return;
    this.musicOn = true;
    const c = this.ctx;
    this.music.gain.setTargetAtTime(0.5, c.currentTime, 0.8);
    this.drone = [];
    for (const [n, type, vol] of [[33, 'sine', 0.2], [45, 'triangle', 0.07], [40, 'sine', 0.08]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = NOTE(n);
      g.gain.value = vol;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 0.07 + Math.random() * 0.08; lg.gain.value = vol * 0.5;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(this.music);
      o.start(); lfo.start();
      this.drone.push(o, lfo);
    }
    this.nextT = c.currentTime + 0.1;
    this.step = 0;
    this.timer = setInterval(() => this.schedule(), 90);
  }

  stopMusic() {
    if (!this.musicOn) return;
    this.musicOn = false;
    clearInterval(this.timer);
    const c = this.ctx;
    this.music.gain.setTargetAtTime(0, c.currentTime, 0.4);
    const ds = this.drone;
    setTimeout(() => { for (const o of ds) { try { o.stop(); } catch (e) { /* 이미 멈춤 */ } } }, 1500);
  }

  schedule() {
    const c = this.ctx;
    if (!c || c.state !== 'running') return;
    if (this.nextT < c.currentTime) this.nextT = c.currentTime + 0.05;
    const beat = 0.42;
    while (this.nextT < c.currentTime + 0.3) {
      const t = this.nextT, st = this.step++;
      const p = this.lit ? 0.3 + this.intensity * 0.25 : 0.12;
      if (Math.random() < p) {
        const n = SCALE[Math.floor(Math.random() * (this.lit ? SCALE.length : 5))] + (this.lit ? 12 : 0);
        this.pluck(NOTE(n), t, 0.05 + Math.random() * 0.03);
      }
      if (this.intensity > 0.45 && st % 2 === 0) this.thump(t, 0.1 + this.intensity * 0.14);
      if (this.intensity > 0.8 && st % 2 === 1) this.thump(t, 0.06);
      this.nextT += beat;
    }
  }

  pluck(f, t, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(this.music); g.connect(this.delay);
    o.start(t); o.stop(t + 1.2);
  }

  thump(t, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.16);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(this.music);
    o.start(t); o.stop(t + 0.25);
  }
}
