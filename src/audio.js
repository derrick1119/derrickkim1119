/* Take Your Time — audio: everything is synthesised, no files.
   One small lullaby in F, 3/4. The player's hands play it note by note inside the memories;
   the whole tune is only heard once, at the end. From chapter 1 on, its left hand keeps
   going quietly underneath (A.bed), with a bar of the melody drifting through now and then. */
(function () {
  'use strict';
  const T = window.TYT;
  const A = (T.audio = { ctx: null, muted: false, failed: false });
  A.vol = { music: 1, fx: 1 };   /* the player's own levels, from the settings */
  let ambLevel = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* melody: [midi, beats]; one bar per row */
  const MELODY = [
    [[69, 1], [67, 1], [65, 1]],
    [[72, 3]],
    [[70, 1], [69, 1], [67, 1]],
    [[69, 3]],
    [[69, 1], [67, 1], [65, 1]],
    [[74, 2], [72, 1]],
    [[70, 1], [67, 1], [64, 1]],
    [[65, 3]],
  ];
  /* accompaniment: bass, then two soft upper notes on beats 2 and 3 */
  const CHORDS = [
    [41, 57, 60], [45, 53, 60], [46, 53, 62], [48, 53, 57],
    [38, 53, 57], [34, 53, 58], [36, 52, 58], [41, 53, 57],
  ];
  const FLAT = [];
  MELODY.forEach((bar, bi) => bar.forEach((n) => FLAT.push({ m: n[0], bar: bi })));
  A.melodyLength = FLAT.length;

  try { A.muted = window.localStorage.getItem('tyt-muted') === '1'; } catch (_) { /* storage may be unavailable */ }

  function build(ctx) {
    A.ctx = ctx;
    const master = (A.master = ctx.createGain());
    master.gain.value = A.muted ? 0 : 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
    master.connect(comp); comp.connect(ctx.destination);

    /* a soft room: decaying filtered noise as the impulse response */
    const len = Math.floor(ctx.sampleRate * 3.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    const r = T.rng(99);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const n = r() * 2 - 1;
        lp += (n - lp) * (0.5 - 0.42 * t); /* the tail gets darker as it fades */
        d[i] = lp * Math.pow(1 - t, 2.6) * (i < 400 ? i / 400 : 1);
      }
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    verb.connect(wet); wet.connect(master);
    A.send = ctx.createGain(); A.send.gain.value = 1; A.send.connect(verb);

    A.music = ctx.createGain(); A.music.gain.value = 0.34 * A.vol.music; A.music.connect(master);
    A.fx = ctx.createGain(); A.fx.gain.value = 0.3 * A.vol.fx; A.fx.connect(master);
    A.amb = ctx.createGain(); A.amb.gain.value = 0; A.amb.connect(master);

    /* looping noise, shaped into room hush and wind */
    const nlen = ctx.sampleRate * 4;
    const nb = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    let b = 0;
    for (let i = 0; i < nlen; i++) { const w = r() * 2 - 1; b = (b + 0.02 * w) / 1.02; nd[i] = b * 3.2; }
    for (let i = 0; i < 2000; i++) { const k = i / 2000; nd[i] = nd[i] * k + nd[nlen - 2000 + i] * (1 - k); } /* seamless loop */
    A.noise = nb;
    const hush = ctx.createBufferSource(); hush.buffer = nb; hush.loop = true;
    const hf = ctx.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 420;
    const hg = ctx.createGain(); hg.gain.value = 0.2;
    hush.connect(hf); hf.connect(hg); hg.connect(A.amb);
    const wind = ctx.createBufferSource(); wind.buffer = nb; wind.loop = true; wind.playbackRate.value = 1.7;
    const wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.frequency.value = 520; wf.Q.value = 0.9;
    const wg = (A.windGain = ctx.createGain()); wg.gain.value = 0.22;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 0.14;
    lfo.connect(lg); lg.connect(wg.gain);
    const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.031;
    const lg2 = ctx.createGain(); lg2.gain.value = 160;
    lfo2.connect(lg2); lg2.connect(wf.frequency);
    wind.connect(wf); wf.connect(wg); wg.connect(A.amb);
    /* the cloud sea: a slow wash that comes and goes like breathing */
    const sea = ctx.createBufferSource(); sea.buffer = nb; sea.loop = true; sea.playbackRate.value = 1.25;
    const sf = ctx.createBiquadFilter(); sf.type = 'lowpass'; sf.frequency.value = 760; sf.Q.value = 0.3;
    const sw = ctx.createGain(); sw.gain.value = 0.55;
    const sl = ctx.createOscillator(); sl.frequency.value = 0.105;
    const slg = ctx.createGain(); slg.gain.value = 0.45;
    sl.connect(slg); slg.connect(sw.gain);
    const sg2 = (A.seaGain = ctx.createGain()); sg2.gain.value = 0;
    sea.connect(sf); sf.connect(sw); sw.connect(sg2); sg2.connect(A.amb);
    hush.start(); wind.start(); lfo.start(); lfo2.start(); sea.start(1.3); sl.start();
  }

  /* Must be called from inside a user gesture; safe to call again and again. */
  A.unlock = function () {
    if (A.failed) return;
    try {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { A.failed = true; return; }
        build(new AC());
        if (wantAmb) A.ambience(wantAmb[0], wantAmb[1], wantAmb[2]);
        if (wantBed) A.bed(wantBed[0], wantBed[1], wantBed[2]);
      }
      if (A.ctx.state === 'suspended') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (_) { A.failed = true; }
  };
  let wantAmb = null;
  const ok = () => !!A.ctx && !A.failed;
  const now = () => A.ctx.currentTime;

  A.setMuted = function (m) {
    A.muted = m;
    try { window.localStorage.setItem('tyt-muted', m ? '1' : '0'); } catch (_) { /* fine */ }
    if (ok()) A.master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.08);
    const btn = document.getElementById('mute');
    if (btn) { btn.setAttribute('aria-pressed', m ? 'true' : 'false'); btn.setAttribute('aria-label', (T.tr || String)(m ? '소리 켜기' : '소리 끄기')); }
  };
  A.toggleMute = function () { A.setMuted(!A.muted); };
  A.setVolume = function (kind, v) {
    A.vol[kind] = Math.max(0, Math.min(1, v));
    if (!ok()) return;
    const t = now();
    A.music.gain.setTargetAtTime(0.34 * A.vol.music, t, 0.05); A.fx.gain.setTargetAtTime(0.3 * A.vol.fx, t, 0.05); A.amb.gain.setTargetAtTime(ambLevel * A.vol.fx, t, 0.2);
  };

  /* ---------- voices ---------- */
  function env(g, t, peak, a, hold, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * hold), t + a + d * 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function osc(type, f, t, stop, dest, gain, detune) {
    const o = A.ctx.createOscillator();
    o.type = type; o.frequency.value = f;
    if (detune) o.detune.value = detune;
    const g = A.ctx.createGain(); g.gain.value = gain;
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(stop);
    return o;
  }
  /* o: { m, at (seconds from now), vel, voice, dur } */
  A.note = function (o) {
    if (!ok() || !isFinite(o.m)) return;
    const ctx = A.ctx, t = Math.max(0, now() + 0.03 + (o.at || 0)), f = mtof(o.m), vel = o.vel == null ? 0.5 : o.vel;
    const voice = o.voice || 'felt';
    const out = ctx.createGain();
    const dry = ctx.createGain();
    out.connect(dry); dry.connect(o.dest || A.music);
    const sendG = ctx.createGain();
    out.connect(sendG); sendG.connect(o.sendDest || A.send);
    if (voice === 'felt') {
      /* a felted upright: round, quick to bloom, slow to leave */
      const dur = o.dur || 3.6;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900 + vel * 1700; lp.Q.value = 0.3;
      lp.connect(out);
      env(out, t, vel, 0.012, 0.38, dur);
      osc('sine', f, t, t + dur + 0.1, lp, 1);
      osc('sine', f * 2, t, t + dur + 0.1, lp, 0.2);
      osc('triangle', f, t, t + dur + 0.1, lp, 0.2, 5);
      osc('sine', f * 3, t, t + dur + 0.1, lp, 0.05);
      dry.gain.value = 0.8; sendG.gain.value = 0.55;
    } else if (voice === 'box') {
      /* a music box comb: bright, short, a little out of true */
      const dur = o.dur || 2.2;
      env(out, t, vel * 0.7, 0.003, 0.3, dur);
      osc('sine', f * 2, t, t + dur + 0.1, out, 1);
      osc('sine', f * 2 * 2.99, t, t + dur * 0.5, out, 0.16);
      osc('sine', f * 2 * 5.3, t, t + dur * 0.3, out, 0.06);
      dry.gain.value = 0.7; sendG.gain.value = 0.7;
    } else if (voice === 'pluck') {
      const dur = o.dur || 0.9;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
      lp.connect(out);
      env(out, t, vel * 0.8, 0.004, 0.25, dur);
      osc('triangle', f, t, t + dur + 0.1, lp, 1);
      osc('sine', f * 2, t, t + dur + 0.1, lp, 0.25);
      dry.gain.value = 0.8; sendG.gain.value = 0.4;
    } else if (voice === 'bell') {
      /* the harbour bell: a struck bronze tone, each partial dying at its own pace */
      const dur = o.dur || 8;
      out.gain.value = vel;
      [[0.5, 0.3, 1], [1, 1, 0.82], [1.19, 0.42, 0.55], [1.5, 0.22, 0.45], [2, 0.38, 0.4], [2.51, 0.16, 0.26], [3.01, 0.08, 0.18]].forEach((q) => {
        const oo = ctx.createOscillator(); oo.type = 'sine'; oo.frequency.value = f * q[0];
        const gg = ctx.createGain();
        gg.gain.setValueAtTime(0.0001, t); gg.gain.linearRampToValueAtTime(q[1], t + 0.006);
        gg.gain.exponentialRampToValueAtTime(0.0001, t + dur * q[2]);
        oo.connect(gg); gg.connect(out); oo.start(t); oo.stop(t + dur * q[2] + 0.1);
      });
      dry.gain.value = 0.55; sendG.gain.value = 0.9;
    } else { /* 'glass': a far, thin shimmer for stars */
      const dur = o.dur || 2.6;
      env(out, t, vel * 0.5, 0.02, 0.5, dur);
      osc('sine', f * 4, t, t + dur + 0.1, out, 1);
      osc('sine', f * 4 * 1.5, t, t + dur + 0.1, out, 0.12);
      dry.gain.value = 0.35; sendG.gain.value = 1;
    }
  };

  /* a held chord that can move: pad(index into CHORDS) or pad(null) to let it go */
  let padNow = null;
  A.pad = function (index, level) {
    if (!ok()) return;
    const ctx = A.ctx, t = now();
    if (padNow) {
      const p = padNow;
      p.g.gain.cancelScheduledValues(t);
      p.g.gain.setTargetAtTime(0, t, 1.1);
      p.oscs.forEach((o) => o.stop(t + 7));
      padNow = null;
    }
    if (index == null) { if (bed) A.bed(null); return; }
    const c = CHORDS[index % CHORDS.length];
    const g = ctx.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(level == null ? 0.2 : level, t, 1.6);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 640; lp.Q.value = 0.4;
    lp.connect(g); g.connect(A.music);
    const sg = ctx.createGain(); sg.gain.value = 0.7; g.connect(sg); sg.connect(A.send);
    const oscs = [];
    [c[0] + 12, c[1], c[2], c[1] + 12].forEach((m, i) => {
      [-6, 6].forEach((det) => {
        const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = mtof(m); o.detune.value = det + i;
        const og = ctx.createGain(); og.gain.value = i === 0 ? 0.3 : 0.14;
        o.connect(og); og.connect(lp); o.start(t); oscs.push(o);
      });
    });
    padNow = { g, oscs };
  };

  /* ---------- the bed ---------- */
  /* The lullaby's own harmony, one bar after another, played as softly as a hand that is
     thinking of something else. It never stops between scenes: a new call only changes where
     in the tune it is, how busy it is, and how loud. bed(null) lets it die away. */
  const MOODS = {
    walk: { beat: 1.0, arp: 0.92, high: 'box', spark: 0.3, ghost: 0.3, pad: 1, gain: 1 },         /* out of doors, going somewhere */
    home: { beat: 1.12, arp: 0.8, high: 'box', spark: 0.22, ghost: 0.26, pad: 1, gain: 0.9 },     /* a table, a lamp */
    still: { beat: 1.34, arp: 0.5, high: 'glass', spark: 0.3, ghost: 0.16, pad: 1.1, gain: 0.85 }, /* the lake; a kitchen at night */
    sea: { beat: 1.2, arp: 0.62, high: 'glass', spark: 0.5, ghost: 0.2, pad: 1.15, gain: 0.95 },   /* crossing */
    night: { beat: 1.22, arp: 0.7, high: 'glass', spark: 0.42, ghost: 0.3, pad: 1, gain: 0.9 },    /* stars */
  };
  let bed = null, wantBed = null;
  function bedBar(b, t) {
    const m = b.mood, r = b.r, B = m.beat, k = (b.base + b.bar) % CHORDS.length, c = CHORDS[k];
    const N = (o) => A.note(Object.assign({ voice: 'felt', dest: b.bus, sendDest: b.send }, o, { at: o.at - now() - 0.03 }));
    const jit = () => (r() - 0.5) * 0.03;
    /* three held tones under everything, swelling and thinning across the bar */
    const ctx = A.ctx, len = 3 * B, g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 1150; lp.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05 * m.pad, t + len * 0.45);
    g.gain.linearRampToValueAtTime(0.036 * m.pad, t + len);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 2.2);
    lp.connect(g); g.connect(b.bus); g.connect(b.send);
    [[c[0] + 12, 'sine', 0.8], [c[1], 'triangle', 0.6], [c[2], 'triangle', 0.6], [c[1] + 12, 'sine', 0.5], [c[2] + 12, 'sine', 0.4]].forEach((q, i) => {
      const o = ctx.createOscillator(); o.type = q[1]; o.frequency.value = mtof(q[0]); o.detune.value = i % 2 ? 5 : -5;
      const og = ctx.createGain(); og.gain.value = q[2];
      o.connect(og); og.connect(lp); o.start(t); o.stop(t + len + 2.3);
    });
    /* two bars of the tune itself, some of the time, as if half remembered */
    if (k % 2 === 0) b.ghost = r() < m.ghost;
    /* the left hand: a bass note, then the chord opened out, never quite the same way twice.
       It sits an octave up where a phone can still play it, and steps down when the tune is passing */
    const up = b.ghost ? 0 : 12, v = b.ghost ? 0.8 : 1;
    N({ m: c[0] + 12, at: t + jit(), vel: 0.34, dur: 5 });
    const shape = Math.floor(r() * 4), on = () => r() < m.arp;
    if (shape === 0) { if (on()) N({ m: c[1] + up, at: t + B + jit(), vel: 0.26 * v, dur: 3.4 }); if (on()) N({ m: c[2] + up, at: t + 2 * B + jit(), vel: 0.25 * v, dur: 3.4 }); }
    else if (shape === 1) { if (on()) N({ m: c[2] + up, at: t + B + jit(), vel: 0.26 * v, dur: 3.4 }); if (on()) N({ m: c[1] + 12 + up, at: t + 2 * B + jit(), vel: 0.22 * v, dur: 3.4 }); }
    else if (shape === 2) { if (on()) { N({ m: c[1] + up, at: t + B + jit(), vel: 0.22 * v, dur: 4 }); N({ m: c[2] + up, at: t + B + 0.05 + jit(), vel: 0.22 * v, dur: 4 }); } }
    else { if (on()) N({ m: c[1] + up, at: t + 2 * B + jit(), vel: 0.25 * v, dur: 3.4 }); if (on()) N({ m: c[2] + up, at: t + 2.5 * B + jit(), vel: 0.21 * v, dur: 3 }); }
    if (b.ghost) {
      let bt = t;
      MELODY[k].forEach((n) => { N({ m: n[0], at: bt + jit(), vel: n[1] >= 2 ? 0.32 : 0.29, dur: n[1] >= 2 ? 5 : 3.6 }); bt += n[1] * B; });
    } else if (r() < m.spark) {
      /* otherwise a single high note, somewhere in the bar */
      const pick = [c[1] + 12, c[2] + 12, c[1] + 24, c[2] + 12][Math.floor(r() * 4)];
      N({ m: m.high === 'glass' ? pick - 12 : pick, at: t + (1 + Math.floor(r() * 3) * 0.5) * B + jit(), vel: m.high === 'glass' ? 0.3 : 0.2, voice: m.high });
    }
    b.bar++;
    b.next = t + len;
  }
  function bedPump(until) {
    if (bed && bed.next < now() - 0.05) bed.next = now() + 0.12;   /* the page was asleep: do not play the missed bars at once */
    while (bed && bed.next < until) bedBar(bed, bed.next);
  }
  /* step aside for something that has its own harmony, then come back */
  function duck(sec, depth, at) {
    if (!bed) return;
    const t = now() + (at || 0), b = bed, to = b.gain * (depth || 0);
    [[b.bus, 1], [b.send, 0.6]].forEach((q) => {
      q[0].gain.cancelScheduledValues(t);
      q[0].gain.setTargetAtTime(to * q[1], t, 0.35);
      q[0].gain.setTargetAtTime(b.gain * q[1], t + sec, 1.4);
    });
  }
  A.bed = function (index, level, mood) {
    wantBed = index == null ? null : [index, level, mood];
    if (!ok()) return;
    const ctx = A.ctx, t = now();
    if (index == null) {
      if (!bed) return;
      const b = bed; bed = null;
      if (b.timer) clearInterval(b.timer);
      [b.bus, b.send].forEach((n) => { n.gain.cancelScheduledValues(t); n.gain.setTargetAtTime(0, t, 0.9); });
      return;
    }
    if (padNow) { const p = padNow; padNow = null; p.g.gain.cancelScheduledValues(t); p.g.gain.setTargetAtTime(0, t, 1.1); p.oscs.forEach((o) => o.stop(t + 7)); }
    const md = MOODS[mood] || MOODS.walk, gain = T.clamp((level == null ? 0.14 : level) / 0.14, 0.7, 1.05) * md.gain * 1.1;
    if (bed) {   /* already playing: keep the pulse, move on from the next bar */
      bed.base = (index - bed.bar % CHORDS.length + CHORDS.length * 64) % CHORDS.length; bed.mood = md; bed.gain = gain;
      [[bed.bus, 1], [bed.send, 0.6]].forEach((q) => { q[0].gain.cancelScheduledValues(t); q[0].gain.setTargetAtTime(gain * q[1], t, 1.2); });
      return;
    }
    const bus = ctx.createGain(), send = ctx.createGain();
    bus.gain.value = 0; bus.gain.setTargetAtTime(gain, t, 0.8); bus.connect(A.music);
    send.gain.value = 0; send.gain.setTargetAtTime(0.6 * gain, t, 0.8); send.connect(A.send);
    bed = { base: index, bar: 0, next: t + 0.5, mood: md, r: T.rng(11 + index), bus, send, gain, ghost: false, timer: null };
    if (typeof ctx.startRendering !== 'function') { bed.timer = setInterval(() => { try { if (bed && A.ctx.state === 'running') bedPump(now() + 1.5); } catch (e) { if (T.report) T.report(e, 'music'); } }, 240); bedPump(t + 1.5); }
  };
  A._bedPump = bedPump; /* test hooks: schedule ahead when rendering offline; see where it has got to */
  A._bedInfo = () => bed && { bar: bed.bar, gain: bed.gain };

  /* ---------- the tune ---------- */
  /* the four-note call: "take — your — time" */
  A.motif = function (o = {}) {
    const beat = o.beat || 0.78, voice = o.voice || 'felt', vel = o.vel || 0.5, up = o.up || 0;
    if (ok()) duck(4 * beat + 1.5, 0.3, o.at || 0);
    [[69, 0], [67, 1], [65, 2], [72, 3]].forEach((n) => A.note({ m: n[0] + up, at: (o.at || 0) + n[1] * beat, vel: n[1] === 3 ? vel * 1.1 : vel, voice, dur: n[1] === 3 ? 5 : 3 }));
    return 4 * beat + 2;
  };
  /* one note of the melody, for hands to play; i wraps */
  A.step = function (i, o = {}) {
    const n = FLAT[((i % FLAT.length) + FLAT.length) % FLAT.length];
    const at = o.at || 0;
    A.note({ m: n.m + (o.up || 0), vel: o.vel || 0.5, voice: o.voice || 'box', at });
    if (o.bass !== false && !bed && (i === 0 || FLAT[(i - 1 + FLAT.length) % FLAT.length].bar !== n.bar)) {
      const c = CHORDS[n.bar];
      A.note({ m: c[0] + 12, vel: 0.3, voice: 'felt', dur: 4, at });
      A.note({ m: c[1], at: at + 0.12, vel: 0.16, voice: 'felt', dur: 3 });
    }
    return n.bar;
  };
  /* the whole lullaby with its left hand. Returns its length in seconds. */
  A.theme = function (o = {}) {
    const beat = o.beat || 0.86, voice = o.voice || 'felt', vel = o.vel || 0.55, up = o.up || 0, at0 = o.at || 0;
    let t = at0;
    MELODY.forEach((bar, bi) => {
      const c = CHORDS[bi];
      const last = bi === MELODY.length - 1;
      const rit = last ? 1.18 : bi === MELODY.length - 2 ? 1.07 : 1;
      if (o.left !== false) {
        A.note({ m: c[0] + 12, at: t, vel: vel * 0.55, voice: 'felt', dur: 4.5 });
        A.note({ m: c[1], at: t + beat * rit, vel: vel * 0.3, voice: 'felt', dur: 3 });
        A.note({ m: c[2], at: t + beat * rit * 2, vel: vel * 0.3, voice: 'felt', dur: 3 });
      }
      let bt = t;
      bar.forEach((n) => {
        A.note({ m: n[0] + up, at: bt, vel: vel * (n[1] >= 2 ? 1.05 : 0.9), voice, dur: n[1] >= 2 ? 5 : 3.4 });
        bt += n[1] * beat * rit;
      });
      t += 3 * beat * rit;
    });
    if (o.left !== false) { /* a last soft F, rolled */
      [41, 53, 60, 65, 69].forEach((m, i) => A.note({ m, at: t + i * 0.11, vel: vel * 0.32, voice: 'felt', dur: 6 }));
    }
    if (ok()) duck(t - at0 + 2.5, 0, at0);   /* the whole tune is heard alone */
    return t - at0 + 3;
  };
  /* a stray phrase drifting through the hospital room */
  A.fragment = function (seed) {
    const r = T.rng(seed || 1);
    const bar = Math.floor(r() * 4) * 2;
    if (ok()) duck(7, 0.3);
    let t = 0;
    const beat = 1.05 + r() * 0.2;
    MELODY[bar].concat(MELODY[bar + 1]).forEach((n) => {
      A.note({ m: n[0] - (r() < 0.4 ? 12 : 0), at: t, vel: 0.22 + r() * 0.08, voice: 'felt', dur: 4.5 });
      t += n[1] * beat;
    });
  };
  /* The harbour bell tolls the same four notes, low and slow. i picks one of them. */
  A.toll = function (i, vel) {
    A.note({ m: [57, 55, 53, 60][((i % 4) + 4) % 4], vel: vel == null ? 0.34 : vel, voice: 'bell' });
  };
  /* up the scale a step at a time, for things that are counted */
  A.scaleStep = function (i, o = {}) {
    const deg = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 21, 23, 24, 26, 28, 29, 31];
    A.note({ m: 53 + deg[Math.min(deg.length - 1, i)], vel: o.vel || 0.3, voice: o.voice || 'box', at: o.at || 0, dur: 1.8 });
  };
  /* a small rising figure that says "yes, that's a promise" */
  A.promise = function () {
    if (ok()) duck(3, 0.35);
    [53, 60, 65, 69, 72, 77].forEach((m, i) => A.note({ m, at: i * 0.13, vel: 0.3 + i * 0.03, voice: i > 2 ? 'box' : 'felt', dur: 4 }));
  };

  /* ---------- ambience and small sounds ---------- */
  A.ambience = function (level, wind, sea) {
    wantAmb = [level, wind, sea];
    if (!ok()) return;
    ambLevel = level;
    A.amb.gain.setTargetAtTime(level * A.vol.fx, now(), 1.2);
    if (wind != null) A.windGain.gain.setTargetAtTime(wind, now(), 1.5);
    A.seaGain.gain.setTargetAtTime(sea || 0, now(), 2);
  };
  function burst(o) {
    if (!ok()) return;
    const ctx = A.ctx, t = now() + 0.01 + (o.at || 0);
    const s = ctx.createBufferSource(); s.buffer = A.noise; s.playbackRate.value = o.rate || 6;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vel, t + (o.attack || 0.02));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = o.verb == null ? 0.3 : o.verb; g.connect(sg); sg.connect(A.send);
    s.start(t, (o.seed || 0) % 3); s.stop(t + o.dur + 0.05);
  }
  A.sfx = function (name, k) {
    if (!ok()) return;
    if (name === 'touch') { A.note({ m: 77, vel: 0.2, voice: 'box', dur: 1.6 }); A.note({ m: 84, at: 0.09, vel: 0.16, voice: 'box', dur: 1.6 }); }
    else if (name === 'paper') burst({ f0: 2400, f1: 900, dur: 0.28, vel: 0.5, q: 0.6, rate: 9 });
    else if (name === 'page') { burst({ f0: 1500, f1: 3200, dur: 0.22, vel: 0.4, q: 0.7, rate: 8 }); burst({ at: 0.16, f0: 2600, f1: 1100, dur: 0.2, vel: 0.3, q: 0.7, rate: 8 }); }
    else if (name === 'chalk') burst({ f0: 3400 + (k || 0) * 900, f1: 2600, dur: 0.12, vel: 0.22, q: 2.2, rate: 11, verb: 0.15 });
    else if (name === 'crayon') burst({ f0: 1300, f1: 800, dur: 0.16, vel: 0.2, q: 1.2, rate: 7, verb: 0.1 });
    else if (name === 'bubble') { A.note({ m: 50 + Math.floor((k || 0) * 9), vel: 0.1, voice: 'pluck', dur: 0.25 }); }
    else if (name === 'step') burst({ type: 'lowpass', f0: 700, f1: 200, dur: 0.1, vel: 0.2, q: 0.5, rate: 3, verb: 0.2 });
    else if (name === 'whoosh') burst({ f0: 300, f1: 1400, dur: 0.7, vel: 0.3, q: 0.8, rate: 4, attack: 0.3, verb: 0.5 });
    else if (name === 'star') A.note({ m: 72 + [0, 4, 7, 9, 12, 16][((Math.floor((k || 0) * 6) % 6) + 6) % 6], vel: 0.22, voice: 'glass' });
    else if (name === 'knock') { burst({ type: 'lowpass', f0: 1400, f1: 300, dur: 0.07, vel: 0.5, q: 0.7, rate: 5, verb: 0.35 }); A.note({ m: 43 + Math.floor((k || 0) * 5), vel: 0.22, voice: 'pluck', dur: 0.2 }); }
    else if (name === 'bike') { A.note({ m: 91, vel: 0.2, voice: 'box', dur: 1.2 }); A.note({ m: 91, at: 0.16, vel: 0.16, voice: 'box', dur: 1.2 }); }
    else if (name === 'door') burst({ type: 'lowpass', f0: 420, f1: 120, dur: 0.22, vel: 0.5, q: 0.6, rate: 2.5, verb: 0.4 });
    else if (name === 'bark') { burst({ type: 'bandpass', f0: 1100, f1: 520, dur: 0.13, vel: 0.55, q: 1.6, rate: 9, verb: 0.3 }); A.note({ m: 58 + Math.floor((k || 0) * 4), vel: 0.18, voice: 'pluck', dur: 0.15 }); }
    else if (name === 'wind') burst({ type: 'bandpass', f0: 300, f1: 700, dur: 2.4, vel: 0.35, q: 0.7, rate: 1.2, attack: 0.8, verb: 0.6 });
    else if (name === 'thunder') { burst({ type: 'lowpass', f0: 260, f1: 60, dur: 2.2, vel: 0.7, q: 0.5, rate: 2, attack: 0.05, verb: 0.8 }); }
    else if (name === 'pour') burst({ type: 'bandpass', f0: 900, f1: 1600, dur: 2.2 * (k || 1), vel: 0.24, q: 0.5, rate: 14, attack: 0.15, verb: 0.3 });
    else if (name === 'creak') { burst({ type: 'bandpass', f0: 520, f1: 760, dur: 0.55, vel: 0.32, q: 6, rate: 22, attack: 0.08, verb: 0.3 }); A.note({ m: 62, vel: 0.08, voice: 'pluck', dur: 0.4 }); }
    else if (name === 'join') { A.note({ m: 72, vel: 0.26, voice: 'box' }); A.note({ m: 77, at: 0.1, vel: 0.26, voice: 'box' }); }
  };

  document.addEventListener('visibilitychange', () => {
    if (!ok()) return;
    try { if (document.hidden) A.ctx.suspend(); else A.ctx.resume(); } catch (_) { /* fine */ }
  });
  const btn = document.getElementById('mute');
  if (btn) {
    btn.addEventListener('click', () => { A.unlock(); A.toggleMute(); });
    A.setMuted(A.muted);
  }
  /* Sound is never worth stopping the story for: whatever goes wrong in here stays in here. */
  ['note', 'pad', 'bed', 'motif', 'step', 'theme', 'fragment', 'toll', 'scaleStep', 'promise', 'ambience', 'sfx'].forEach((name) => {
    const fn = A[name];
    A[name] = function () { try { return fn.apply(A, arguments); } catch (e) { if (T.report) T.report(e, 'sound ' + name); return 0; } };
  });
  A._build = build; /* test hook: render through an OfflineAudioContext */
})();
