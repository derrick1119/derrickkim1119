/* Take Your Time — audio: everything is synthesised, no files.
   One small lullaby in F, 3/4. The player's hands play it note by note inside the memories;
   the whole tune is only heard once, at the end. */
(function () {
  'use strict';
  const T = window.TYT;
  const A = (T.audio = { ctx: null, muted: false, failed: false });
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

    A.music = ctx.createGain(); A.music.gain.value = 0.34; A.music.connect(master);
    A.fx = ctx.createGain(); A.fx.gain.value = 0.3; A.fx.connect(master);
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
    hush.start(); wind.start(); lfo.start(); lfo2.start();
  }

  /* Must be called from inside a user gesture; safe to call again and again. */
  A.unlock = function () {
    if (A.failed) return;
    try {
      if (!A.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { A.failed = true; return; }
        build(new AC());
      }
      if (A.ctx.state === 'suspended') { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (_) { A.failed = true; }
  };
  const ok = () => !!A.ctx && !A.failed;
  const now = () => A.ctx.currentTime;

  A.setMuted = function (m) {
    A.muted = m;
    try { window.localStorage.setItem('tyt-muted', m ? '1' : '0'); } catch (_) { /* fine */ }
    if (ok()) A.master.gain.setTargetAtTime(m ? 0 : 0.9, now(), 0.08);
    const btn = document.getElementById('mute');
    if (btn) { btn.setAttribute('aria-pressed', m ? 'true' : 'false'); btn.setAttribute('aria-label', m ? '소리 켜기' : '소리 끄기'); }
  };
  A.toggleMute = function () { A.setMuted(!A.muted); };

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
    if (!ok()) return;
    const ctx = A.ctx, t = now() + 0.03 + (o.at || 0), f = mtof(o.m), vel = o.vel == null ? 0.5 : o.vel;
    const voice = o.voice || 'felt';
    const out = ctx.createGain();
    const dry = ctx.createGain();
    out.connect(dry); dry.connect(A.music);
    const sendG = ctx.createGain();
    out.connect(sendG); sendG.connect(A.send);
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
    if (index == null) return;
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

  /* ---------- the tune ---------- */
  /* the four-note call: "take — your — time" */
  A.motif = function (o = {}) {
    const beat = o.beat || 0.78, voice = o.voice || 'felt', vel = o.vel || 0.5, up = o.up || 0;
    [[69, 0], [67, 1], [65, 2], [72, 3]].forEach((n) => A.note({ m: n[0] + up, at: (o.at || 0) + n[1] * beat, vel: n[1] === 3 ? vel * 1.1 : vel, voice, dur: n[1] === 3 ? 5 : 3 }));
    return 4 * beat + 2;
  };
  /* one note of the melody, for hands to play; i wraps */
  A.step = function (i, o = {}) {
    const n = FLAT[((i % FLAT.length) + FLAT.length) % FLAT.length];
    const at = o.at || 0;
    A.note({ m: n.m + (o.up || 0), vel: o.vel || 0.5, voice: o.voice || 'box', at });
    if (o.bass !== false && (i === 0 || FLAT[(i - 1 + FLAT.length) % FLAT.length].bar !== n.bar)) {
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
    return t - at0 + 3;
  };
  /* a stray phrase drifting through the hospital room */
  A.fragment = function (seed) {
    const r = T.rng(seed || 1);
    const bar = Math.floor(r() * 4) * 2;
    let t = 0;
    const beat = 1.05 + r() * 0.2;
    MELODY[bar].concat(MELODY[bar + 1]).forEach((n) => {
      A.note({ m: n[0] - (r() < 0.4 ? 12 : 0), at: t, vel: 0.22 + r() * 0.08, voice: 'felt', dur: 4.5 });
      t += n[1] * beat;
    });
  };
  /* a small rising figure that says "yes, that's a promise" */
  A.promise = function () {
    [53, 60, 65, 69, 72, 77].forEach((m, i) => A.note({ m, at: i * 0.13, vel: 0.3 + i * 0.03, voice: i > 2 ? 'box' : 'felt', dur: 4 }));
  };

  /* ---------- ambience and small sounds ---------- */
  A.ambience = function (level, wind) {
    if (!ok()) return;
    A.amb.gain.setTargetAtTime(level, now(), 1.2);
    if (wind != null) A.windGain.gain.setTargetAtTime(wind, now(), 1.5);
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
    else if (name === 'star') A.note({ m: 72 + [0, 4, 7, 9, 12, 16][Math.floor((k || 0) * 6) % 6], vel: 0.22, voice: 'glass' });
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
  A._build = build; /* test hook: render through an OfflineAudioContext */
})();
