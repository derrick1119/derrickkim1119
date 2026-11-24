/* Take Your Time — audio.
   One small lullaby in F, 3/4. The player's hands play it note by note inside the memories;
   the whole tune is only heard once, at the end. From chapter 1 on, its left hand keeps
   going quietly underneath (A.bed), with a bar of the melody drifting through now and then.

   The instruments are recordings: a soft upright piano, glockenspiel (the music box), vibraphone
   (the celesta), harp, a tubular bell (the harbour bell) and string sections, all CC0 (see
   CREDITS.md). They are embedded in assets/audio/*.js and decoded once, after the first tap.
   Until a sound is ready — or if it never can be — the old synthesised voice plays in its place.
   Everything goes through two rooms of reverb (a small room, the open sky), a gentle compressor
   and a limiter. A.score(kind) chooses how the same tune is arranged for a kind of scene; when no
   one has chosen, the kind follows the scene and the bed's mood. */
(function () {
  'use strict';
  const T = window.TYT;
  const A = (T.audio = { ctx: null, muted: false, failed: false });
  A.vol = { music: 1, fx: 1 };   /* the player's own levels, from the settings */
  let ambLevel = 0;
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const MASTER = 0.9;

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
  A.tune = { melody: MELODY, chords: CHORDS };   /* for things done in time with it, bar by bar (the dance on the quay) */

  try { A.muted = window.localStorage.getItem('tyt-muted') === '1'; } catch (_) { /* storage may be unavailable */ }

  /* ---------- the kinds of scene ----------
     The same tune, arranged for where we are. room: a hospital room, solo piano, sparse. memory: a
     music box over a soft pad. home: piano with a cello under it. harbor: piano and soft strings,
     out of doors. lake: celesta and harp, watery and far. dream: music box and pad, very wide.
     night: piano, glass and a little string. farewell: the strings swell (a crossing). wedding:
     harp and glockenspiel, light. reunion: everything, but softly.
       room/sky: reverb sends · left: the bed's left hand · lift: octave for it · hold: held strings
       under the bed (0 = none) · tone: their low-pass · ghost: voice of the half-remembered bars ·
       spark: voice of the single high note · sparse: fewer notes · pad: level of A.pad's strings ·
       chord: strings under A.theme · dbl: [voice, octave, level] doubling the melody · roll: harp
       arpeggio on each bar of the theme */
  const KIND = {
    room: { room: 0.42, sky: 0.12, left: 'felt', lift: 0, hold: 0, tone: 900, ghost: 'felt', spark: 'box', sparse: 0.7, pad: 0.45, chord: 0, dbl: null },
    memory: { room: 0.3, sky: 0.32, left: 'felt', lift: 0, hold: 0.55, tone: 1400, ghost: 'box', spark: 'box', sparse: 0.9, pad: 0.8, chord: 0.35, dbl: null },
    home: { room: 0.36, sky: 0.18, left: 'felt', lift: 0, hold: 0.6, tone: 1300, ghost: 'felt', spark: 'box', sparse: 0.9, pad: 0.85, chord: 0.35, dbl: null },
    harbor: { room: 0.12, sky: 0.36, left: 'felt', lift: 0, hold: 0.8, tone: 2200, ghost: 'felt', spark: 'box', sparse: 1, pad: 1, chord: 0.5, dbl: null },
    lake: { room: 0.04, sky: 0.55, left: 'celesta', lift: 0, hold: 0.55, tone: 1100, ghost: 'celesta', spark: 'glass', sparse: 0.85, pad: 0.75, chord: 0.35, dbl: ['celesta', 0, 0.5] },
    dream: { room: 0.04, sky: 0.68, left: 'celesta', lift: 0, hold: 0.85, tone: 1500, ghost: 'box', spark: 'glass', sparse: 0.85, pad: 1, chord: 0.6, dbl: ['box', 0, 0.45] },
    night: { room: 0.06, sky: 0.5, left: 'felt', lift: 0, hold: 0.55, tone: 1400, ghost: 'felt', spark: 'glass', sparse: 0.9, pad: 0.85, chord: 0.35, dbl: null },
    farewell: { room: 0.04, sky: 0.6, left: 'felt', lift: 0, hold: 1.15, tone: 2600, ghost: 'strings', spark: 'glass', sparse: 1, pad: 1.2, chord: 1, dbl: ['strings', 0, 0.55] },
    wedding: { room: 0.14, sky: 0.36, left: 'pluck', lift: 0, hold: 0.55, tone: 2600, ghost: 'box', spark: 'box', sparse: 1, pad: 0.8, chord: 0.4, dbl: ['box', 0, 0.35], roll: true },
    reunion: { room: 0.08, sky: 0.5, left: 'felt', lift: 0, hold: 0.85, tone: 2400, ghost: 'felt', spark: 'glass', sparse: 1, pad: 1, chord: 0.75, dbl: ['celesta', 0, 0.32] },
  };
  A.kinds = Object.keys(KIND);
  const MOOD_KIND = { walk: 'harbor', home: 'home', still: 'lake', sea: 'farewell', night: 'night' };
  let pinned = null, pinnedFor = null, spaceKind = null;

  /* ---------- the instruments ---------- */
  const SND = () => window.TYT_SOUNDS || {};
  const BANK = {};   /* name -> { zones: [{ root, buf, off, loopStart, loopEnd }] } */
  const FOLEY = {};  /* name -> [AudioBuffer, ...] with .off on each */
  const LOOPED = { cello: 1, viola: 1, violin: 1 };
  const LOAD = ['piano', 'glock', 'foley', 'harp', 'vibes', 'bell', 'cello', 'viola', 'violin'];
  /* how loud each one sits against the others (the samples are levelled per instrument) */
  const LV = { piano: 3.3, glock: 1.24, vibes: 0.57, harp: 0.88, bell: 1.5, cello: 0.5, viola: 0.42, violin: 0.36 };
  let loading = null;
  let samplesOff = false;
  const have = (n) => !samplesOff && !!(BANK[n] && BANK[n].zones.length);

  function b64(s) {
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function decode(str) {
    return new Promise((res, rej) => {
      try {
        const p = A.ctx.decodeAudioData(b64(str), res, rej);
        if (p && p.then) p.then(res, rej);
      } catch (e) { rej(e); }
    });
  }
  /* MP3 starts with a few milliseconds of codec silence: find where the sound itself begins */
  function onset(buf) {
    const d = buf.getChannelData(0), n = Math.min(d.length, Math.floor(buf.sampleRate * 0.6));
    let pk = 0;
    for (let i = 0; i < n; i++) { const v = Math.abs(d[i]); if (v > pk) pk = v; }
    const th = pk * 0.02;
    let i = 0;
    while (i < n && Math.abs(d[i]) < th) i++;
    return Math.max(0, i - Math.floor(buf.sampleRate * 0.003)) / buf.sampleRate;
  }
  /* a held string note loops in its steady middle: cross-fade the end of the loop into its start,
     in the decoded audio itself, so the seam is sample-exact whatever the codec did */
  function makeLoop(z) {
    const buf = z.buf, sr = buf.sampleRate, d = buf.getChannelData(0);
    const a = Math.floor((z.off + 1.0) * sr), b = Math.floor((z.off + 4.05) * sr), X = Math.floor(0.45 * sr);
    if (b + X >= d.length) return;
    for (let i = 0; i < X; i++) {
      const w = (i / X) * Math.PI / 2;
      d[a + i] = d[a + i] * Math.sin(w) + d[b + i] * Math.cos(w);
    }
    z.loopStart = a / sr; z.loopEnd = b / sr;
  }
  const yieldNow = () => new Promise((res) => setTimeout(res, 0));
  async function loadAll() {
    const S = SND();
    for (const name of LOAD) {
      if (A.failed || !A.ctx) return;
      if (name === 'foley') {
        const F = S.foley || {};
        for (const k of Object.keys(F)) {
          const list = [];
          for (const s of F[k] || []) {
            try { const buf = await decode(s); buf.off = onset(buf); list.push(buf); } catch (_) { /* this one stays synthesised */ }
          }
          F[k] = null;
          if (list.length) FOLEY[k] = list;
          await yieldNow();
        }
        continue;
      }
      const src = S[name];
      if (!src || !src.zones) continue;
      /* all of one instrument at once (the browser decodes them side by side), then the next */
      const zones = [];
      await Promise.all(src.zones.map((q) => {
        if (!q[1]) return null;
        const text = q[1];
        q[1] = null;   /* the text is not needed once it is sound */
        return decode(text).then((buf) => {
          const z = { root: q[0], buf, off: onset(buf), loopStart: 0, loopEnd: 0 };
          if (LOOPED[name]) makeLoop(z);
          zones.push(z);
        }, () => { /* a zone that will not decode is simply left out */ });
      }));
      if (zones.length) BANK[name] = { zones };
      await yieldNow();
    }
  }
  function startLoading() {
    if (loading || !A.ctx) return;
    /* if the recordings cannot be had, the synthesised voices simply go on: nothing to tell anyone */
    loading = loadAll().catch((e) => { try { console.warn('[Take Your Time] sound samples: ' + (e && e.message)); } catch (_) { /* no console */ } });
  }
  /* test hook and for anyone who wants to wait: resolves when every sample that could be decoded is in */
  A.ready = () => loading || Promise.resolve();
  A._bank = BANK; A._foley = FOLEY;

  /* ---------- the mixing desk ---------- */
  /* An impulse response made of noise: a little early reflection for a room, a long bright build for
     the sky, and a tail that darkens as it fades the way air takes the top off a sound */
  function makeIR(ctx, sec, o) {
    const sr = ctx.sampleRate, len = Math.floor(sr * sec), ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const r = T.rng(o.seed + ch * 17), d = ir.getChannelData(ch);
      const pre = Math.floor(o.pre * sr), att = Math.max(1, Math.floor(o.att * sr));
      let lp = 0, lp2 = 0, a = 0.5, e = 0;
      for (let i = 0; i < len; i++) {
        if ((i & 63) === 0) { const t = i / sr, fc = o.hi * Math.exp(-t / o.damp) + o.lo; a = 1 - Math.exp(-2 * Math.PI * fc / sr); }
        const n = r() * 2 - 1;
        lp += a * (n - lp); lp2 += a * (lp - lp2);
        const t = i / sr;
        const env = i < pre ? 0 : Math.exp(-6.9 * t / sec) * Math.min(1, (i - pre) / att);
        d[i] = lp2 * env;
      }
      (o.early || []).forEach((q, j) => {
        const at = Math.floor((q[0] + (ch ? 1.3 : 0) * (j % 3)) * 0.001 * sr);
        if (at < len) d[at] += q[1] * (r() < 0.5 ? -1 : 1) * 3;
      });
      for (let i = 0; i < len; i++) e += d[i] * d[i];
      const k = 1 / Math.sqrt(e || 1);
      for (let i = 0; i < len; i++) d[i] *= k;
    }
    return ir;
  }
  function noiseBuf(ctx, sec, seed, color) {
    const n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0), r = T.rng(seed);
    let s = 0;
    for (let i = 0; i < n; i++) { const w = r() * 2 - 1; if (color) { s = (s + 0.02 * w) / 1.02; d[i] = s * 3.2; } else d[i] = w * 0.5; }
    const f = Math.min(2000, n >> 2);
    for (let i = 0; i < f; i++) { const k = i / f; d[i] = d[i] * k + d[n - f + i] * (1 - k); } /* seamless loop */
    return b;
  }
  /* rain: many small drops, a few fat ones, in stereo, one loop */
  function dropsBuf(ctx) {
    const sr = ctx.sampleRate, n = Math.floor(sr * 3.3), b = ctx.createBuffer(2, n, sr), r = T.rng(77);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      const count = 3.3 * 95;
      for (let j = 0; j < count; j++) {
        const at = Math.floor(r() * (n - sr * 0.05)), big = r() < 0.08;
        const f = big ? 700 + r() * 600 : 1800 + r() * 4200, len = Math.floor(sr * (big ? 0.03 : 0.006 + r() * 0.01));
        const amp = (big ? 0.35 : 0.12) * (0.25 + r() * r());
        let ph = 0;
        for (let i = 0; i < len; i++) {
          const k = i / len, ff = big ? f * (1 + 0.6 * k) : f;
          ph += 2 * Math.PI * ff / sr;
          d[at + i] += amp * Math.sin(ph) * Math.exp(-5 * k) * (i < 8 ? i / 8 : 1);
        }
      }
    }
    return b;
  }

  function build(ctx) {
    A.ctx = ctx;
    A.offline = typeof ctx.startRendering === 'function';
    const master = (A.master = ctx.createGain());
    master.gain.value = A.muted ? 0 : MASTER;
    /* the end of the chain: a rumble filter, a compressor that only leans on the loudest moments,
       and a limiter so nothing ever clips */
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 30; hp.Q.value = 0.6;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20; glue.knee.value = 14; glue.ratio.value = 2.4; glue.attack.value = 0.02; glue.release.value = 0.35;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.15;
    master.connect(hp); hp.connect(glue); glue.connect(lim); lim.connect(ctx.destination);

    /* two rooms of reverb, fed from one send for the music and one for the effects */
    const verbIn = ctx.createGain();
    const mk = (ir) => { const c = ctx.createConvolver(); c.normalize = false; c.buffer = ir; return c; };
    const room = mk(makeIR(ctx, 1.1, { seed: 31, pre: 0.006, att: 0.004, hi: 5200, lo: 500, damp: 0.35, early: [[7, 0.5], [11, 0.42], [16, 0.35], [23, 0.3], [29, 0.24], [37, 0.2], [46, 0.15], [58, 0.12]] }));
    const sky = mk(makeIR(ctx, 2.8, { seed: 99, pre: 0.024, att: 0.09, hi: 7000, lo: 380, damp: 0.9 }));
    A.sendRoom = ctx.createGain(); A.sendRoom.gain.value = 0.3;
    A.sendSky = ctx.createGain(); A.sendSky.gain.value = 0.3;
    verbIn.connect(A.sendRoom); A.sendRoom.connect(room); room.connect(master);
    verbIn.connect(A.sendSky); A.sendSky.connect(sky); sky.connect(master);

    /* music: its own level (the player's), and a dip while words are being written */
    A.duckG = ctx.createGain(); A.duckG.gain.value = 1; A.duckG.connect(master);
    A.music = ctx.createGain(); A.music.gain.value = 0.34 * A.vol.music; A.music.connect(A.duckG);
    A.sendM = ctx.createGain(); A.sendM.gain.value = 0.34 * A.vol.music; A.sendM.connect(verbIn);
    A.send = ctx.createGain(); A.send.gain.value = 1; A.send.connect(A.sendM);
    A.fx = ctx.createGain(); A.fx.gain.value = 0.3 * A.vol.fx; A.fx.connect(master);
    A.fxSend = ctx.createGain(); A.fxSend.gain.value = 0.3 * A.vol.fx; A.fxSend.connect(verbIn);
    A.amb = ctx.createGain(); A.amb.gain.value = 0; A.amb.connect(master);

    /* looping noise, shaped into room hush, wind and the cloud sea */
    const r = T.rng(99);
    const nb = (A.noise = noiseBuf(ctx, 4, 98, true));
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
    /* rain: a hiss and the drops, both looped; muffled when it is on a window */
    A.white = noiseBuf(ctx, 3.7, 55, false);
    const rh = ctx.createBufferSource(); rh.buffer = A.white; rh.loop = true;
    const rhp = ctx.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 500;
    const rhg = ctx.createGain(); rhg.gain.value = 0.11;
    const rd = ctx.createBufferSource(); rd.buffer = dropsBuf(ctx); rd.loop = true;
    const rdg = ctx.createGain(); rdg.gain.value = 0.9;
    const rlp = (A.rainLP = ctx.createBiquadFilter()); rlp.type = 'lowpass'; rlp.frequency.value = 7000; rlp.Q.value = 0.4;
    const rg = (A.rainG = ctx.createGain()); rg.gain.value = 0;
    rh.connect(rhp); rhp.connect(rhg); rhg.connect(rlp); rd.connect(rdg); rdg.connect(rlp); rlp.connect(rg); rg.connect(A.fx);
    hush.start(); wind.start(); lfo.start(); lfo2.start(); sea.start(1.3); sl.start(); rh.start(); rd.start(0.4);
    void r;

    applySpace(kindNow(), true);
    if (!A.offline) {
      A.watch = setInterval(() => { try { watch(); } catch (e) { if (T.report) T.report(e, 'sound watch'); } }, 500);
    }
    if (!A.muted) startLoading();
    else if (!A.offline) { try { const q = ctx.suspend(); if (q && q.catch) q.catch(() => {}); } catch (_) { /* fine */ } }   /* built while muted: rest until unmuted */
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
      if (A.ctx.state === 'suspended' && !A.muted) { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); }
    } catch (_) { A.failed = true; }
  };
  let wantAmb = null;
  const ok = () => !!A.ctx && !A.failed;
  const now = () => A.ctx.currentTime;
  /* no work at all for sound no one can hear */
  const musicOff = () => A.muted || A.vol.music <= 0.001;
  const fxOff = () => A.muted || A.vol.fx <= 0.001;

  let sleepT = null;
  A.setMuted = function (m) {
    A.muted = m;
    try { window.localStorage.setItem('tyt-muted', m ? '1' : '0'); } catch (_) { /* fine */ }
    if (ok()) {
      A.master.gain.setTargetAtTime(m ? 0 : MASTER, now(), 0.08);
      if (!A.offline) {
        clearTimeout(sleepT);
        /* once it has faded, let the whole sound engine rest; wake it when the sound comes back */
        if (m) sleepT = setTimeout(() => { try { if (A.muted && A.ctx.state === 'running') A.ctx.suspend(); } catch (_) { /* fine */ } }, 600);
        else { try { if (A.ctx.state === 'suspended' && !document.hidden) { const p = A.ctx.resume(); if (p && p.catch) p.catch(() => {}); } } catch (_) { /* fine */ } startLoading(); }
      }
    }
    const btn = document.getElementById('mute');
    if (btn) { btn.setAttribute('aria-pressed', m ? 'true' : 'false'); btn.setAttribute('aria-label', (T.tr || String)(m ? '소리 켜기' : '소리 끄기')); }
  };
  A.toggleMute = function () { A.setMuted(!A.muted); };
  A.setVolume = function (kind, v) {
    A.vol[kind] = Math.max(0, Math.min(1, v));
    if (!ok()) return;
    const t = now();
    A.music.gain.setTargetAtTime(0.34 * A.vol.music, t, 0.05); A.sendM.gain.setTargetAtTime(0.34 * A.vol.music, t, 0.05);
    A.fx.gain.setTargetAtTime(0.3 * A.vol.fx, t, 0.05); A.fxSend.gain.setTargetAtTime(0.3 * A.vol.fx, t, 0.05);
    A.amb.gain.setTargetAtTime(ambLevel * A.vol.fx, t, 0.2);
  };
  /* a line of words is being written: the music steps back a little until it has been said */
  A.talk = function (sec) {
    if (!ok() || A.muted) return;
    const t = now(), wall = Math.max(0.4, Math.min(12, (sec || 1) / ((T.pace || 1) * (T.speed || 1))));
    const g = A.duckG.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.74, t, 0.12);
    g.setTargetAtTime(1, t + wall, 0.6);
  };

  /* ---------- scene kinds: which one, and the space it brings ---------- */
  let lastCur = null, lastName = '';
  function sceneName() {
    const c = T.director && T.director.cur;
    if (!c) return '';
    if (c !== lastCur) { lastCur = c; lastName = Object.keys(T.scenes || {}).find((k) => T.scenes[k] === c) || ''; }
    return lastName;
  }
  function kindNow() {
    if (pinned) return pinned;
    const c = T.director && T.director.cur, v = c && c.view, name = sceneName(), ch = T.state ? T.state.chapter : 0;
    if (v && typeof v === 'object') {
      if ('gq' in v) return 'dream';
      if (v.lily || 'mirror' in v) return 'lake';
      if (MOOD_KIND[v.mood]) return MOOD_KIND[v.mood];   /* a place of its own, even when it is quiet */
    }
    if (name === 'room' || name === 'kitchen') return 'room';
    if (name === 'home' || name === 'stew' || name === 'swing' || name === 'walk' || name === 'ending') return 'memory';
    const mood = bed ? bed.moodName : null;
    if (ch === 7 && (mood === 'walk' || mood === 'home' || mood === 'still') && !v) return 'reunion';
    if (mood && MOOD_KIND[mood]) return MOOD_KIND[mood];
    return name === 'harbor' || /^ch\d/.test(name) ? 'harbor' : 'room';
  }
  function applySpace(kind, fast) {
    if (!ok()) return;
    const K = KIND[kind] || KIND.room, t = now(), tau = fast ? 0.01 : 1.4;
    spaceKind = kind;
    A.sendRoom.gain.setTargetAtTime(K.room, t, tau);
    A.sendSky.gain.setTargetAtTime(K.sky, t, tau);
  }
  /* A.score(kind): arrange the tune for that kind of scene from now on, until the scene changes or
     A.score(null) hands it back to the scene. A.score() just says which kind is playing. */
  A.score = function (kind) {
    if (kind === undefined) return kindNow();
    pinned = kind && KIND[kind] ? kind : null;
    pinnedFor = T.director ? T.director.cur : null;
    if (ok()) applySpace(kindNow());
    return kindNow();
  };

  /* rain: A.rain(level 0..1, { window: true } for rain heard through glass); A.rain(null) gives it
     back to the scene (the kitchen window, the rainy street in the lake, the storm) */
  let rainPinned = null, rainNow = -1, rainWin = false;
  function setRain(level, win) {
    if (!ok()) return;
    const t = now();
    rainNow = level; rainWin = win;
    A.rainG.gain.setTargetAtTime(level * 0.55, t, 1.2);
    A.rainLP.frequency.setTargetAtTime(win ? 1300 : 6500, t, 0.3);
  }
  function autoRain() {
    const c = T.director && T.director.cur, v = c && c.view, name = sceneName();
    if (name === 'kitchen') return [0.55, true];
    if (v && v.lily) return [0.6, false];
    if (c && typeof c.storm === 'number' && c.storm > 0.01) return [Math.min(1, 0.25 + c.storm * 0.8), false];
    return [0, false];
  }
  A.rain = function (level, o) {
    rainPinned = level == null ? null : [Math.max(0, Math.min(1, level)), !!(o && o.window)];
    if (ok()) { const r = rainPinned || autoRain(); setRain(r[0], r[1]); }
  };
  /* what the feet walk on: 'wood' (the pier, the quay), 'grass' (the hill), 'soft'; null = by the scene */
  let surfacePinned = null;
  A.surface = function (s) { surfacePinned = s || null; };
  function surfaceNow() {
    if (surfacePinned) return surfacePinned;
    const c = T.director && T.director.cur, name = sceneName();
    if (name === 'harbor') return 'wood';
    if (name === 'walk') return 'grass';
    if (/^ch\d/.test(name) && !(c && c.view)) return 'grass';
    return 'soft';
  }
  function watch() {
    if (!ok()) return;
    const c = T.director && T.director.cur;
    if (pinned && pinnedFor && c !== pinnedFor) pinned = null;   /* a chosen kind lasts as long as its scene */
    if (A.muted) return;
    const k = kindNow();
    if (k !== spaceKind) applySpace(k);
    const r = rainPinned || autoRain();
    if (r[0] !== rainNow || r[1] !== rainWin) setRain(r[0], r[1]);
  }

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
  /* voices sounding at once are capped: past the cap, the oldest one sounding then lets go */
  const live = [];
  const MAXV = 44;
  function track(src, g, t, end) {
    const n = now();
    for (let i = live.length - 1; i >= 0; i--) if (live[i].end < n) live.splice(i, 1);
    if (live.length > 320) live.splice(0, live.length - 320);   /* a context that is not running yet keeps its clock still */
    if (!A.offline) {
      let count = 0, old = null;
      for (const v of live) if (v.t <= t + 0.01 && v.end > t) { count++; if (!old || v.t < old.t) old = v; }
      if (count >= MAXV && old) {
        try { old.g.gain.cancelScheduledValues(t); old.g.gain.setTargetAtTime(0, t, 0.04); old.src.stop(t + 0.3); } catch (_) { /* already gone */ }
        old.end = t + 0.3;
      }
    }
    const v = { src, g, t, end };
    live.push(v);
    return v;
  }
  /* play one recorded note. o: { vel, dur (held for), rel (let go over), lp, attack, loop, env: [[dt, level]...], out } */
  function smp(inst, m, t, o) {
    const b = BANK[inst];
    if (!b || !b.zones.length || !isFinite(m)) return null;
    let z = b.zones[0], best = 1e9;
    for (const q of b.zones) { const d = Math.abs(q.root - m); if (d < best) { best = d; z = q; } }
    const ctx = A.ctx, rate = Math.pow(2, (m - z.root) / 12);
    const src = ctx.createBufferSource();
    src.buffer = z.buf; src.playbackRate.value = rate;
    const looping = !!(o.loop && z.loopEnd);
    if (looping) { src.loop = true; src.loopStart = z.loopStart; src.loopEnd = z.loopEnd; }
    const g = ctx.createGain();
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = o.q || 0.4; src.connect(f); f.connect(g); } else src.connect(g);
    const vel = Math.max(0, o.vel * (LV[inst] || 1)), att = o.attack || 0.003;
    const natural = (z.buf.duration - z.off) / rate;
    const rel = o.rel == null ? 0.4 : o.rel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + att);
    let last = t + att;
    (o.env || []).forEach((q) => { const at = t + q[0]; if (at > last) { g.gain.linearRampToValueAtTime(vel * q[1], at); last = at; } });
    let end = t + natural;
    if (looping || (o.dur != null && t + o.dur < end)) {
      const off = Math.max(last, t + (o.dur == null ? natural : o.dur));
      g.gain.setTargetAtTime(0, off, Math.max(0.02, rel / 3));
      end = off + rel * 2.4;
      if (!looping) end = Math.min(end, t + natural);
    }
    g.connect(o.out);
    src.start(t, z.off);
    src.stop(end + 0.05);
    return track(src, g, t, end);
  }
  /* the string section holding one note: cello low, viola in the middle, violins above */
  function stringFor(m) { return m < 61 && have('cello') ? 'cello' : m < 75 && have('viola') ? 'viola' : have('violin') ? 'violin' : have('viola') ? 'viola' : 'cello'; }
  const haveStrings = () => have('cello') || have('viola') || have('violin');
  /* someone humming with their mouth closed: one tone shaped like a voice saying "mm" */
  let humWaves = {}, humCtx = null;
  function humWave(m) {
    const key = Math.round(m);
    if (humCtx !== A.ctx) { humWaves = {}; humCtx = A.ctx; }   /* a wave belongs to the context that made it */
    if (humWaves[key]) return humWaves[key];
    const f = mtof(key), N = Math.max(4, Math.min(28, Math.floor(4200 / f)));
    const re = new Float32Array(N + 1), im = new Float32Array(N + 1);
    const res = (x, F, B) => 1 / Math.sqrt(1 + Math.pow((x - F) / B, 2));
    for (let k = 1; k <= N; k++) {
      const fk = k * f;
      im[k] = Math.pow(k, -1.25) * (res(fk, 260, 110) + 0.16 * res(fk, 1050, 220) + 0.1 * res(fk, 2350, 320)) * (fk > 3200 ? 0.3 : 1);
    }
    return (humWaves[key] = A.ctx.createPeriodicWave(re, im));
  }

  /* o: { m, at (seconds from now), vel, voice, dur, dest, sendDest } */
  const ALIAS = { piano: 'felt', musicbox: 'box', glock: 'box', vibes: 'celesta', harp: 'pluck', cello: 'strings', viola: 'strings', violin: 'strings' };
  A.note = function (o) {
    if (!ok() || !isFinite(o.m) || (o.fx ? fxOff() : musicOff())) return;
    const ctx = A.ctx, t = Math.max(0, now() + 0.03 + (o.at || 0)), f = mtof(o.m), vel = o.vel == null ? 0.5 : o.vel;
    const voice = ALIAS[o.voice] || o.voice || 'felt';
    const out = ctx.createGain();
    const dry = ctx.createGain();
    out.connect(dry); dry.connect(o.dest || (o.fx ? A.fx : A.music));
    const sendG = ctx.createGain();
    out.connect(sendG); sendG.connect(o.sendDest || (o.fx ? A.fxSend : A.send));
    if (voice === 'felt' && have('piano')) {
      /* the upright, played softly, a felt-like hush on the top */
      const dur = o.dur || 3.6;
      smp('piano', o.m, t, { vel, dur: dur * 0.85, rel: 0.55, lp: 1600 + vel * 6400, out });
      dry.gain.value = 0.85; sendG.gain.value = 0.6;
    } else if (voice === 'felt') {
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
    } else if (voice === 'box' && have('glock')) {
      /* the music box: small bright bars an octave up, let go of quickly */
      const dur = o.dur || 2.2;
      smp('glock', o.m + 12, t, { vel: vel * 0.9, dur: dur * 0.7, rel: 0.5, lp: 7500, out });
      dry.gain.value = 0.72; sendG.gain.value = 0.7;
    } else if (voice === 'box') {
      /* a music box comb: bright, short, a little out of true */
      const dur = o.dur || 2.2;
      env(out, t, vel * 0.7, 0.003, 0.3, dur);
      osc('sine', f * 2, t, t + dur + 0.1, out, 1);
      osc('sine', f * 2 * 2.99, t, t + dur * 0.5, out, 0.16);
      osc('sine', f * 2 * 5.3, t, t + dur * 0.3, out, 0.06);
      dry.gain.value = 0.7; sendG.gain.value = 0.7;
    } else if (voice === 'celesta' && have('vibes')) {
      /* a celesta: soft struck plates an octave up, a little glockenspiel in the strike */
      const dur = o.dur || 2.6;
      smp('vibes', o.m + 12, t, { vel, dur: dur * 0.8, rel: 0.6, lp: 6000, out });
      if (have('glock')) smp('glock', o.m + 12, t, { vel: vel * 0.06, dur: 0.5, rel: 0.4, lp: 6000, out });
      dry.gain.value = 0.75; sendG.gain.value = 0.75;
    } else if (voice === 'celesta') {
      const dur = o.dur || 2.6;
      env(out, t, vel * 0.6, 0.004, 0.4, dur);
      osc('sine', f * 2, t, t + dur + 0.1, out, 1);
      osc('sine', f * 4, t, t + dur * 0.4, out, 0.1);
      dry.gain.value = 0.75; sendG.gain.value = 0.75;
    } else if (voice === 'pluck' && have('harp')) {
      const dur = o.dur || 0.9;
      smp('harp', o.m, t, { vel, dur: Math.max(0.12, dur), rel: 0.35 + Math.min(0.6, dur * 0.3), out });
      dry.gain.value = 0.82; sendG.gain.value = 0.45;
    } else if (voice === 'pluck') {
      const dur = o.dur || 0.9;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
      lp.connect(out);
      env(out, t, vel * 0.8, 0.004, 0.25, dur);
      osc('triangle', f, t, t + dur + 0.1, lp, 1);
      osc('sine', f * 2, t, t + dur + 0.1, lp, 0.25);
      dry.gain.value = 0.8; sendG.gain.value = 0.4;
    } else if (voice === 'bell' && have('bell')) {
      /* the harbour bell: a struck tube, tuned down into a big bell, with a low hum under the strike */
      const dur = o.dur || 8;
      smp('bell', o.m, t, { vel, dur, rel: 2.2, out });
      const h = ctx.createOscillator(); h.type = 'sine'; h.frequency.value = f / 2;
      const hg = ctx.createGain(); hg.gain.setValueAtTime(0.0001, t); hg.gain.linearRampToValueAtTime(vel * 0.16, t + 0.02); hg.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.9);
      h.connect(hg); hg.connect(out); h.start(t); h.stop(t + dur);
      dry.gain.value = 0.6; sendG.gain.value = 0.85;
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
    } else if (voice === 'strings' && haveStrings()) {
      /* a held note from the section: it leans in, and lets go slowly */
      const dur = o.dur || 2.4, inst = stringFor(o.m);
      smp(inst, o.m, t, { vel, dur, rel: o.rel || 0.9, attack: o.attack || 0.18, loop: true, lp: o.lp || 3200, out });
      dry.gain.value = 0.8; sendG.gain.value = 0.6;
    } else if (voice === 'strings') {
      const dur = o.dur || 2.4;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.connect(out);
      out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(vel * 0.35, t + 0.3); out.gain.setTargetAtTime(0, t + dur, 0.3);
      [-6, 6].forEach((dt) => osc('sawtooth', f, t, t + dur + 1.6, lp, 0.25, dt));
      dry.gain.value = 0.8; sendG.gain.value = 0.6;
    } else if (voice === 'hum') {
      /* someone humming with their mouth closed: soft to begin, a little vibrato, nothing bright */
      const dur = o.dur || 1.2;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400 + vel * 1600; lp.Q.value = 0.5;
      lp.connect(out);
      out.gain.setValueAtTime(0.0001, t);
      out.gain.linearRampToValueAtTime(vel * 0.62, t + 0.1);
      out.gain.linearRampToValueAtTime(vel * 0.5, t + Math.max(0.15, dur * 0.7));
      out.gain.setTargetAtTime(0, t + dur, 0.09);
      const o1 = ctx.createOscillator(); o1.setPeriodicWave(humWave(o.m));
      o1.frequency.setValueAtTime(f * 0.985, t); o1.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      const vib = ctx.createOscillator(); vib.frequency.value = 5.1;
      const vg = ctx.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.0055, t + 0.4);
      vib.connect(vg); vg.connect(o1.frequency);
      o1.connect(lp); o1.start(t); o1.stop(t + dur + 0.6); vib.start(t); vib.stop(t + dur + 0.6);
      /* the breath at the start of it */
      const nz = ctx.createBufferSource(); nz.buffer = A.noise; nz.playbackRate.value = 3;
      const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 900; nf.Q.value = 0.8;
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.linearRampToValueAtTime(vel * 0.05, t + 0.05); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      nz.connect(nf); nf.connect(ng); ng.connect(out); nz.start(t, (o.m % 7) * 0.3); nz.stop(t + 0.35);
      dry.gain.value = 0.85; sendG.gain.value = 0.65;
    } else if (have('glock')) { /* 'glass': a far, thin shimmer for stars */
      const dur = o.dur || 2.6, up = o.m + 24 > 110 ? 12 : 24;
      smp('glock', o.m + up, t, { vel, dur: dur * 0.7, rel: 0.8, attack: 0.012, lp: 9000, out });
      dry.gain.value = 0.4; sendG.gain.value = 1;
    } else {
      const dur = o.dur || 2.6;
      env(out, t, vel * 0.5, 0.02, 0.5, dur);
      osc('sine', f * 4, t, t + dur + 0.1, out, 1);
      osc('sine', f * 4 * 1.5, t, t + dur + 0.1, out, 0.12);
      dry.gain.value = 0.35; sendG.gain.value = 1;
    }
  };

  /* strings holding a chord. notes: [[midi, level]...]; o: { t, len (held), rise (0..1 of len to the
     loudest), fall (level at the end, of the loudest), rel, tone, dest, send }. Returns the gain nodes. */
  function chord(notes, o) {
    const ctx = A.ctx, out = ctx.createGain();
    out.connect(o.dest || A.music);
    if (o.wet !== 0) { const sg = ctx.createGain(); sg.gain.value = o.wet == null ? 0.7 : o.wet; out.connect(sg); sg.connect(o.send || A.send); }
    const t = o.t, len = o.len, voices = [];
    const attack = o.rise != null ? len * o.rise : o.attack || Math.min(0.6, len * 0.12);
    const envl = o.rise != null ? [[len, o.fall == null ? 0.75 : o.fall]] : [];
    notes.forEach((q) => {
      const v = smp(q[2] || stringFor(q[0]), q[0], t, { vel: q[1], dur: len, rel: o.rel || 1.6, attack, loop: true, lp: o.tone || 2400, env: envl, out });
      if (v) voices.push(v);
    });
    return { out, voices };
  }

  /* a held chord that can move: pad(index into CHORDS) or pad(null) to let it go */
  let padNow = null;
  function padRelease(t) {
    const p = padNow;
    if (!p) return;
    padNow = null;
    p.g.gain.cancelScheduledValues(t);
    p.g.gain.setTargetAtTime(0, t, 1.1);
    if (p.oscs) p.oscs.forEach((o) => { try { o.stop(t + 7); } catch (_) { /* fine */ } });
    if (p.srcs) p.srcs.forEach((v) => { try { v.src.stop(t + 7); } catch (_) { /* fine */ } v.end = t + 7; });
  }
  A.pad = function (index, level) {
    if (!ok()) return;
    const ctx = A.ctx, t = now();
    padRelease(t);
    if (index == null) { if (bed) A.bed(null); return; }
    if (musicOff()) return;
    const c = CHORDS[index % CHORDS.length], K = KIND[kindNow()] || KIND.room, lvl = level == null ? 0.2 : level;
    const g = ctx.createGain(); g.gain.value = 0;
    if (haveStrings()) {
      /* the section, very quietly, holding until told otherwise */
      g.gain.setTargetAtTime(1, t, 1.6);
      g.connect(A.music);
      const ps = ctx.createGain(); ps.gain.value = 0.7; g.connect(ps); ps.connect(A.send);
      const k = (lvl / 0.2) * K.pad * 0.72;
      const ch = chord([[c[0] + 12, 0.9 * k], [c[1], 0.62 * k], [c[2], 0.58 * k], [c[1] + 12, 0.32 * k]], { t: t + 0.02, len: 3600, rel: 2, attack: 1.2, tone: K.tone, dest: g, wet: 0 });
      if (!ch.voices.length) g.disconnect();
      padNow = { g, srcs: ch.voices };
      if (K === KIND.memory || K === KIND.dream) [c[1] + 12, c[2] + 12, c[1] + 24].forEach((m, i) => A.note({ m: m - 12, at: 0.4 + i * 0.22, vel: 0.16 * (lvl / 0.2), voice: 'celesta', dur: 3 }));
      return;
    }
    g.gain.setTargetAtTime(lvl, t, 1.6);
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
    const K = KIND[kindNow()] || KIND.room;
    const N = (o) => A.note(Object.assign({ voice: 'felt', dest: b.bus, sendDest: b.send }, o, { at: o.at - now() - 0.03 }));
    const jit = () => (r() - 0.5) * 0.03;
    const len = 3 * B;
    if (!musicOff()) {
      if (K.hold && haveStrings()) {
        /* the section under everything, swelling and thinning across the bar */
        const h = K.hold * m.pad * 0.36;
        const notes = [[c[0] + 12, 0.85 * h], [c[1], 0.6 * h], [c[2], 0.55 * h]];
        if (K.hold > 1) notes.push([c[1] + 12, 0.3 * h]);
        chord(notes, { t, len: len + 0.1, rise: 0.45, fall: 0.72, rel: 1.6, tone: K.tone, dest: b.bus, send: b.send, wet: 0.6 });
      } else if (K.hold || !have('piano')) {
        /* (until the recordings are in) three held tones, swelling and thinning across the bar */
        const ctx = A.ctx, g = ctx.createGain(), lp = ctx.createBiquadFilter();
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
      }
    }
    /* two bars of the tune itself, some of the time, as if half remembered */
    if (k % 2 === 0) b.ghost = r() < m.ghost * K.sparse;
    /* the left hand: a bass note, then the chord opened out, never quite the same way twice.
       It sits an octave up where a phone can still play it, and steps down when the tune is passing */
    const up = b.ghost ? 0 : 12, v = b.ghost ? 0.8 : 1, lv = K.left === 'felt' ? 1 : K.left === 'pluck' ? 0.9 : 0.75;
    const L = (o) => N(Object.assign({ voice: K.left }, o, { m: o.m + K.lift, vel: o.vel * lv }));
    N({ m: c[0] + 12, at: t + jit(), vel: 0.34, dur: 5 });
    const shape = Math.floor(r() * 4), on = () => r() < m.arp * K.sparse;
    if (shape === 0) { if (on()) L({ m: c[1] + up, at: t + B + jit(), vel: 0.26 * v, dur: 3.4 }); if (on()) L({ m: c[2] + up, at: t + 2 * B + jit(), vel: 0.25 * v, dur: 3.4 }); }
    else if (shape === 1) { if (on()) L({ m: c[2] + up, at: t + B + jit(), vel: 0.26 * v, dur: 3.4 }); if (on()) L({ m: c[1] + 12 + up, at: t + 2 * B + jit(), vel: 0.22 * v, dur: 3.4 }); }
    else if (shape === 2) { if (on()) { L({ m: c[1] + up, at: t + B + jit(), vel: 0.22 * v, dur: 4 }); L({ m: c[2] + up, at: t + B + 0.05 + jit(), vel: 0.22 * v, dur: 4 }); } }
    else { if (on()) L({ m: c[1] + up, at: t + 2 * B + jit(), vel: 0.25 * v, dur: 3.4 }); if (on()) L({ m: c[2] + up, at: t + 2.5 * B + jit(), vel: 0.21 * v, dur: 3 }); }
    if (b.ghost) {
      let bt = t;
      const gv = K.ghost, gk = gv === 'felt' ? 1 : gv === 'strings' ? 0.8 : 0.85;
      MELODY[k].forEach((n) => {
        const long = n[1] >= 2;
        N({ m: n[0], at: bt + jit(), vel: (long ? 0.32 : 0.29) * gk, dur: gv === 'strings' ? n[1] * B + 0.15 : long ? 5 : 3.6, voice: gv });
        bt += n[1] * B;
      });
    } else if (r() < m.spark * K.sparse) {
      /* otherwise a single high note, somewhere in the bar */
      const high = K.spark || m.high;
      const pick = [c[1] + 12, c[2] + 12, c[1] + 24, c[2] + 12][Math.floor(r() * 4)];
      N({ m: high === 'glass' ? pick - 12 : pick, at: t + (1 + Math.floor(r() * 3) * 0.5) * B + jit(), vel: high === 'glass' ? 0.3 : 0.2, voice: high });
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
    padRelease(t);
    const md = MOODS[mood] || MOODS.walk, gain = T.clamp((level == null ? 0.14 : level) / 0.14, 0.7, 1.05) * md.gain * 1.1;
    if (bed) {   /* already playing: keep the pulse, move on from the next bar */
      bed.base = (index - bed.bar % CHORDS.length + CHORDS.length * 64) % CHORDS.length; bed.mood = md; bed.moodName = MOODS[mood] ? mood : 'walk'; bed.gain = gain;
      [[bed.bus, 1], [bed.send, 0.6]].forEach((q) => { q[0].gain.cancelScheduledValues(t); q[0].gain.setTargetAtTime(gain * q[1], t, 1.2); });
      applySpace(kindNow());
      return;
    }
    const bus = ctx.createGain(), send = ctx.createGain();
    bus.gain.value = 0; bus.gain.setTargetAtTime(gain, t, 0.8); bus.connect(A.music);
    send.gain.value = 0; send.gain.setTargetAtTime(0.6 * gain, t, 0.8); send.connect(A.send);
    bed = { base: index, bar: 0, next: t + 0.5, mood: md, moodName: MOODS[mood] ? mood : 'walk', r: T.rng(11 + index), bus, send, gain, ghost: false, timer: null };
    if (!A.offline) { bed.timer = setInterval(() => { try { if (bed && A.ctx.state === 'running' && !A.muted) bedPump(now() + 1.5); } catch (e) { if (T.report) T.report(e, 'music'); } }, 240); if (!A.muted) bedPump(t + 1.5); }
    applySpace(kindNow());
  };
  A._bedPump = bedPump; /* test hooks: schedule ahead when rendering offline; see where it has got to */
  A._bedInfo = () => bed && { bar: bed.bar, gain: bed.gain };

  /* ---------- the tune ---------- */
  /* the four-note call: "take — your — time" */
  A.motif = function (o = {}) {
    const beat = o.beat || 0.78, voice = o.voice || 'felt', vel = o.vel || 0.5, up = o.up || 0, at = o.at || 0;
    if (ok()) duck(4 * beat + 1.5, 0.3, at);
    const K = KIND[o.kind || kindNow()] || KIND.room;
    [[69, 0], [67, 1], [65, 2], [72, 3]].forEach((n) => {
      const last = n[1] === 3;
      A.note({ m: n[0] + up, at: at + n[1] * beat, vel: last ? vel * 1.1 : vel, voice, dur: last ? 5 : 3 });
      if (K.dbl && voice !== 'hum' && K.dbl[0] !== voice) A.note({ m: n[0] + up + K.dbl[1], at: at + n[1] * beat + 0.01, vel: vel * K.dbl[2] * (last ? 1.1 : 1), voice: K.dbl[0], dur: K.dbl[0] === 'strings' ? (last ? 3.2 : beat + 0.12) : last ? 4 : 2.6 });
    });
    if (ok() && K.chord && haveStrings() && !musicOff()) {
      const c = CHORDS[0], t = now() + 0.03 + at, k = K.chord * vel * 0.55;
      chord([[c[0] + 12, 0.8 * k], [c[1], 0.55 * k], [c[2], 0.5 * k]], { t, len: 4 * beat + 1.2, rise: 0.3, fall: 0.8, rel: 1.8, tone: K.tone });
    }
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
  /* the whole lullaby with its left hand. Returns its length in seconds.
     o.kind arranges it for a kind of scene other than the one playing (see A.score). */
  A.theme = function (o = {}) {
    const beat = o.beat || 0.86, voice = o.voice || 'felt', vel = o.vel || 0.55, up = o.up || 0, at0 = o.at || 0;
    const K = KIND[o.kind || kindNow()] || KIND.room;
    const strings = ok() && haveStrings() && !musicOff();
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
      if (K.roll) [c[0] + 24, c[1] + 12, c[2] + 12, c[1] + 24].forEach((m, i) => A.note({ m, at: t + i * 0.075, vel: vel * 0.32, voice: 'pluck', dur: 1.6 }));
      if (strings && K.chord) {
        const k = K.chord * vel * (voice === 'hum' ? 0.35 : 0.55);
        chord([[c[0] + 12, 0.8 * k], [c[1], 0.55 * k], [c[2], 0.5 * k]], { t: now() + 0.03 + t, len: 3 * beat * rit + 0.15, rise: 0.3, fall: 0.8, rel: 1.4, tone: K.tone });
      }
      let bt = t;
      bar.forEach((n) => {
        const long = n[1] >= 2, d = n[1] * beat * rit;
        A.note({ m: n[0] + up, at: bt, vel: vel * (long ? 1.05 : 0.9), voice, dur: long ? 5 : 3.4 });
        if (K.dbl && voice !== 'hum' && K.dbl[0] !== voice) {
          const s = K.dbl[0] === 'strings';
          A.note({ m: n[0] + up + K.dbl[1], at: bt + 0.012, vel: vel * K.dbl[2] * (long ? 1.05 : 0.9), voice: K.dbl[0], dur: s ? d + 0.12 : long ? 4 : 2.6, attack: s ? 0.12 : undefined });
        }
        bt += d;
      });
      t += 3 * beat * rit;
    });
    if (o.left !== false) { /* a last soft F, rolled */
      [41, 53, 60, 65, 69].forEach((m, i) => A.note({ m, at: t + i * 0.11, vel: vel * 0.32, voice: 'felt', dur: 6 }));
    }
    if (strings && K.chord) {
      const k = K.chord * vel * 0.5;
      chord([[53, 0.8 * k], [57, 0.5 * k], [60, 0.5 * k], [65, 0.35 * k]], { t: now() + 0.03 + t, len: 3.4, rise: 0.15, fall: 0.5, rel: 2.6, tone: K.tone });
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
  /* one long sliding call, low and far off: the cloud whale's song.
     o: { m0, m1, m2 (where it bends back to, if anywhere), dur, at, vel } */
  A.glide = function (o = {}) {
    if (!ok()) return 0;
    const dur = o.dur || 3.2;
    if (musicOff()) return dur;
    const ctx = A.ctx, t = now() + 0.03 + (o.at || 0), vel = o.vel == null ? 0.3 : o.vel;
    const f0 = mtof(o.m0), f1 = mtof(o.m1 == null ? o.m0 : o.m1), f2 = o.m2 == null ? null : mtof(o.m2);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(vel, t + dur * 0.28);
    out.gain.exponentialRampToValueAtTime(vel * 0.55, t + dur * 0.75);
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
    lp.frequency.setValueAtTime(240, t); lp.frequency.linearRampToValueAtTime(820, t + dur * 0.45); lp.frequency.linearRampToValueAtTime(300, t + dur);
    lp.connect(out);
    const dry = ctx.createGain(); dry.gain.value = 0.6; out.connect(dry); dry.connect(A.music);
    const wet = ctx.createGain(); wet.gain.value = 1.1; out.connect(wet); wet.connect(A.send);
    [['sine', 1, 1, 0], ['triangle', 1, 0.5, 7], ['sawtooth', 1, 0.08, -5], ['sine', 0.5, 0.4, 0]].forEach((q) => {
      const oo = osc(q[0], f0 * q[1], t, t + dur + 0.1, lp, q[2], q[3]);
      oo.frequency.setValueAtTime(f0 * q[1], t);
      oo.frequency.exponentialRampToValueAtTime(f1 * q[1], t + dur * (f2 ? 0.55 : 0.92));
      if (f2) oo.frequency.exponentialRampToValueAtTime(f2 * q[1], t + dur * 0.95);
    });
    return dur;
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
  /* filtered noise with a shape: the stuff wind, paper and chalk are made of */
  function burst(o) {
    const ctx = A.ctx, t = now() + 0.01 + (o.at || 0);
    const s = ctx.createBufferSource(); s.buffer = o.white ? A.white : A.noise; s.playbackRate.value = o.rate || 6;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + (o.sweep || o.dur));
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, t + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vel, t + (o.attack || 0.02));
    if (o.am) { /* a scratchy surface: the level stutters */
      const r = T.rng(o.seed || 3);
      for (let x = t + (o.attack || 0.02) + 1 / o.am; x < t + o.dur * 0.8; x += 1 / o.am) g.gain.linearRampToValueAtTime(o.vel * (0.25 + r() * 0.75), x);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let last = g;
    if (o.pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.setValueAtTime(o.pan[0], t); p.pan.linearRampToValueAtTime(o.pan[1], t + o.dur);
      g.connect(p); last = p;
    }
    s.connect(f); f.connect(g); last.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = o.verb == null ? 0.3 : o.verb; last.connect(sg); sg.connect(A.fxSend);
    s.start(t, ((o.seed || 0) * 0.37) % 3); s.stop(t + o.dur + 0.05);
  }
  /* a recorded clip. o: { at, vel, rate, lp, hp, verb, dur, pan } */
  function clip(name, o) {
    const list = !samplesOff && FOLEY[name];
    if (!list) return false;
    const ctx = A.ctx, t = now() + 0.01 + (o.at || 0);
    const buf = list[o.i == null ? Math.floor(Math.random() * list.length) : o.i % list.length];
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = o.rate || 1;
    let n = s;
    if (o.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; f.Q.value = 0.5; n.connect(f); n = f; }
    if (o.hp) { const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = o.hp; f.Q.value = 0.5; n.connect(f); n = f; }
    const g = ctx.createGain(); g.gain.value = o.vel == null ? 1 : o.vel;
    n.connect(g); n = g;
    const len = o.dur || (buf.duration - buf.off) / (o.rate || 1);
    if (o.dur) { g.gain.setValueAtTime(o.vel == null ? 1 : o.vel, t + Math.max(0, len - 0.25)); g.gain.linearRampToValueAtTime(0, t + len); }
    if (o.pan != null && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; n.connect(p); n = p; }
    n.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = o.verb == null ? 0.25 : o.verb; n.connect(sg); sg.connect(A.fxSend);
    s.start(t, buf.off); s.stop(t + len + 0.05);
    track(s, g, t, t + len);
    return true;
  }
  /* a single bubble: a tiny sphere of air ringing as it rises, its pitch climbing as it does */
  function bloop(at, f, vel, len) {
    const ctx = A.ctx, t = now() + 0.01 + at;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.7, t + len);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = 0.35; g.connect(sg); sg.connect(A.fxSend);
    o.start(t); o.stop(t + len + 0.02);
  }
  /* wood that sticks and slips: a swing's rope, a hinge, a plank under weight */
  function creak(at, k, vel) {
    const ctx = A.ctx, t = now() + 0.01 + at, r = T.rng(Math.floor(k * 1000) + 5), dur = 0.45 + r() * 0.3;
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    const f0 = 22 + r() * 14;
    src.frequency.setValueAtTime(f0, t);
    src.frequency.linearRampToValueAtTime(f0 * (2.2 + r()), t + dur * 0.45);
    src.frequency.linearRampToValueAtTime(f0 * (1.2 + r() * 0.5), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.06);
    for (let x = t + 0.07; x < t + dur - 0.05; x += 0.035) g.gain.linearRampToValueAtTime(vel * (0.45 + r() * 0.55), x);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const mix = ctx.createGain(); mix.gain.value = 1;
    [[430 + r() * 80, 9, 1], [980 + r() * 120, 12, 0.7], [1900 + r() * 200, 14, 0.35], [3100, 10, 0.12]].forEach((q) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = q[0]; f.Q.value = q[1];
      const fg = ctx.createGain(); fg.gain.value = q[2] * 2.2;
      src.connect(f); f.connect(fg); fg.connect(mix);
    });
    mix.connect(g); g.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = 0.25; g.connect(sg); sg.connect(A.fxSend);
    src.start(t); src.stop(t + dur + 0.05);
  }
  /* a dog's "woof": a rough voiced burst whose pitch jumps up and falls, through an open mouth */
  function woof(at, k, vel) {
    const ctx = A.ctx, t = now() + 0.01 + at, f0 = 300 + k * 140, dur = 0.17;
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0 * 0.75, t);
    src.frequency.linearRampToValueAtTime(f0 * 1.18, t + 0.028);
    src.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + dur);
    const nz = ctx.createBufferSource(); nz.buffer = A.white; nz.playbackRate.value = 1;
    const ng = ctx.createGain(); ng.gain.value = 0.35;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.setValueAtTime(vel, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const mix = ctx.createGain();
    [[650 + k * 120, 4, 1], [1450, 6, 0.55], [2650, 8, 0.28]].forEach((q) => {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = q[0]; f.Q.value = q[1];
      const fg = ctx.createGain(); fg.gain.value = q[2] * 2.6;
      src.connect(f); nz.connect(ng); ng.connect(f); f.connect(fg); fg.connect(mix);
    });
    mix.connect(g); g.connect(A.fx);
    const sg = ctx.createGain(); sg.gain.value = 0.3; g.connect(sg); sg.connect(A.fxSend);
    src.start(t); src.stop(t + dur + 0.02); nz.start(t, k * 2); nz.stop(t + dur + 0.02);
  }
  const box = (m, at, vel) => A.note({ m, at, vel, voice: 'box', dur: 1.6, fx: true });
  /* Names: touch · paper · page · card · chalk · crayon · bubble · step (step-wood, step-grass) ·
     whoosh · star · shoot · sparkle · knock · bike · door · bark · wind · thunder · pour · boil ·
     splash · ripple · drip · knit · creak · join. k (0..1) varies the ones that have a pitch or a size. */
  A.sfx = function (name, k) {
    if (!ok() || fxOff()) return;
    const kk = k == null ? Math.random() : k;
    if (name === 'touch') { box(77, 0, 0.2); box(84, 0.09, 0.16); }
    else if (name === 'paper') { /* a sheet picked up: a few crisp crinkles */
      for (let i = 0; i < 6; i++) burst({ at: i * 0.045 + Math.random() * 0.02, white: true, f0: 2200 + Math.random() * 2600, dur: 0.05 + Math.random() * 0.05, vel: 0.22 + Math.random() * 0.2, q: 1.6, rate: 1, attack: 0.004, verb: 0.12, seed: i });
      burst({ f0: 1800, f1: 900, dur: 0.3, vel: 0.18, q: 0.6, rate: 9, verb: 0.15 });
    } else if (name === 'page' || name === 'card') { /* lifted, turned through the air, laid down */
      const big = name === 'page';
      burst({ white: true, f0: 1300, f1: 3600, f2: 2000, sweep: 0.14, dur: big ? 0.3 : 0.16, vel: big ? 0.27 : 0.3, q: 0.9, rate: 1, attack: big ? 0.06 : 0.02, am: 34, seed: 7, verb: 0.15, pan: big ? [-0.25, 0.25] : null });
      burst({ at: big ? 0.24 : 0.12, type: 'lowpass', f0: 1100, dur: 0.09, vel: 0.19, q: 0.5, rate: 4, attack: 0.005, verb: 0.2 });
      if (big) for (let i = 0; i < 3; i++) burst({ at: 0.05 + i * 0.07, white: true, f0: 3500 + i * 600, dur: 0.03, vel: 0.12, q: 2, rate: 1, attack: 0.003, verb: 0.1, seed: i + 3 });
    } else if (name === 'chalk') { /* chalk dragged on a board: a dry, stuttering scratch */
      burst({ white: true, f0: 2600 + kk * 1100, f1: 3400 + kk * 600, dur: 0.16, vel: 0.17, q: 2, rate: 1, attack: 0.01, am: 70, seed: Math.floor(kk * 9), verb: 0.12 });
    } else if (name === 'crayon') { /* wax on paper, a few quick strokes */
      for (let i = 0; i < 3; i++) burst({ at: i * 0.11, white: true, f0: 1100 + i * 180, f1: 1600 - i * 120, dur: 0.09, vel: 0.2, q: 1.4, rate: 1, attack: 0.012, am: 48, seed: i + 11, verb: 0.08 });
    } else if (name === 'bubble') bloop(0, 330 + kk * 520, 0.32, 0.07 + (1 - kk) * 0.05);
    else if (name === 'step' || name === 'step-wood' || name === 'step-grass') {
      const s = name === 'step-wood' ? 'wood' : name === 'step-grass' ? 'grass' : surfaceNow();
      if (s === 'wood' && FOLEY.stepHard) {   /* a heel on planks: the scuff, and the hollow under it */
        clip('stepHard', { vel: 0.42, rate: 0.9 + Math.random() * 0.12, lp: 3800, verb: 0.2 });
        clip('cajon', { i: 0, vel: 0.17, rate: 0.62 + Math.random() * 0.08, lp: 900, verb: 0.2 });
      } else if (s === 'grass' && FOLEY.stepGrass) clip('stepGrass', { vel: 0.22, rate: 0.88 + Math.random() * 0.2, lp: 4200, verb: 0.12 });
      else if (FOLEY.stepGrass) clip('stepGrass', { vel: 0.14, rate: 1.1 + Math.random() * 0.15, lp: 2400, verb: 0.15 });
      else burst({ type: 'lowpass', f0: 700, f1: 200, dur: 0.1, vel: 0.2, q: 0.5, rate: 3, verb: 0.2 });
    } else if (name === 'whoosh') { /* something passing through the air, left to right */
      burst({ f0: 320, f1: 1500, f2: 700, sweep: 0.42, dur: 0.85, vel: 0.3, q: 1.1, rate: 4, attack: 0.36, verb: 0.5, pan: [-0.5, 0.5] });
      burst({ type: 'lowpass', f0: 500, f1: 1100, dur: 0.8, vel: 0.12, q: 0.4, rate: 2, attack: 0.3, verb: 0.4, seed: 2 });
    } else if (name === 'star') A.note({ m: 72 + [0, 4, 7, 9, 12, 16][((Math.floor(kk * 6) % 6) + 6) % 6], vel: 0.35, voice: 'glass', fx: true });
    else if (name === 'shoot') { /* a shooting star: a fall of chimes across the sky */
      if (!clip('chimes', { vel: 0.27, rate: 1.05, verb: 0.7, pan: 0.2 })) A.note({ m: 88, vel: 0.2, voice: 'glass', fx: true });
      burst({ white: true, f0: 4000, f1: 1800, dur: 1.4, vel: 0.07, q: 0.8, rate: 1, attack: 0.25, verb: 0.6, pan: [0.6, -0.6] });
    } else if (name === 'sparkle') { /* a gift: a shimmer of little bells */
      if (!clip('belltree', { vel: 0.18, rate: 0.95 + kk * 0.15, verb: 0.55 })) box(84, 0, 0.2);
      box(81 + Math.floor(kk * 3) * 2, 0.12, 0.12); box(88, 0.3, 0.1);
    } else if (name === 'knock') { /* a hammer on a peg, a knuckle on wood: the hit and the body of it */
      if (FOLEY.chop) {
        clip('chop', { vel: 0.34, rate: 0.85 + kk * 0.35, lp: 5200, verb: 0.3 });
        clip('cajon', { vel: 0.32, rate: 0.85 + kk * 0.4, verb: 0.3 });
      } else { burst({ type: 'lowpass', f0: 1400, f1: 300, dur: 0.07, vel: 0.5, q: 0.7, rate: 5, verb: 0.35 }); A.note({ m: 43 + Math.floor(kk * 5), vel: 0.22, voice: 'pluck', dur: 0.2, fx: true }); }
    } else if (name === 'bike') { /* a bicycle bell, twice */
      if (FOLEY.cymbal) { clip('cymbal', { vel: 0.53, rate: 1.55, dur: 0.9 }); clip('cymbal', { at: 0.17, vel: 0.42, rate: 1.55, dur: 1.2 }); }
      else { box(91, 0, 0.2); box(91, 0.16, 0.16); }
    } else if (name === 'door') {
      if (!clip('door', { vel: 0.26, lp: 5000, verb: 0.35 })) burst({ type: 'lowpass', f0: 420, f1: 120, dur: 0.22, vel: 0.5, q: 0.6, rate: 2.5, verb: 0.4 });
    } else if (name === 'bark') { woof(0, kk, 0.32); if (k == null) woof(0.2, kk * 0.7, 0.23); }
    else if (name === 'wind') { /* a gust: it rises, turns over, and goes on past */
      burst({ type: 'bandpass', f0: 260, f1: 720, f2: 330, sweep: 1.1, dur: 2.8, vel: 0.36, q: 0.8, rate: 1.2, attack: 0.9, verb: 0.6, pan: [-0.4, 0.4] });
      burst({ type: 'bandpass', f0: 1500, f1: 2100, f2: 1300, sweep: 1.2, dur: 2.4, vel: 0.05, q: 9, rate: 1.5, attack: 1, verb: 0.6, seed: 4 });
    } else if (name === 'thunder') { /* the crack, then the long roll */
      burst({ white: true, type: 'highpass', f0: 900, dur: 0.12, vel: 0.25, q: 0.5, rate: 1, attack: 0.003, verb: 0.8 });
      burst({ type: 'lowpass', f0: 300, f1: 60, dur: 3.6, vel: 0.57, q: 0.6, rate: 1.4, attack: 0.06, verb: 0.9, am: 7, seed: 13 });
    } else if (name === 'pour') {
      const d = 2.2 * (k || 1);
      if (!clip('bubbles', { i: 0, vel: 0.2, rate: 1.25, dur: Math.min(2, d), verb: 0.25 })) burst({ type: 'bandpass', f0: 900, f1: 1600, dur: d, vel: 0.24, q: 0.5, rate: 14, attack: 0.15, verb: 0.3 });
      burst({ type: 'bandpass', f0: 1200, f1: 1700, dur: d, vel: 0.05, q: 0.7, rate: 9, attack: 0.15, verb: 0.2 });
    } else if (name === 'boil') { /* a pot on the stove: bubbling, and the simmer under it */
      clip('bubbles', { i: 0, vel: 0.17, rate: 0.8, lp: 2500, verb: 0.2 });
      clip('bubbles', { i: 1, at: 0.6, vel: 0.13, rate: 0.7, lp: 2200, verb: 0.2 });
      burst({ white: true, f0: 1600, dur: 2.4, vel: 0.02, q: 0.6, rate: 1, attack: 0.4, verb: 0.15 });
    } else if (name === 'splash') { /* something into water: the slap, and the bubbles after */
      burst({ white: true, type: 'highpass', f0: 600, f1: 1800, dur: 0.32, vel: 0.3, q: 0.4, rate: 1, attack: 0.004, verb: 0.35 });
      for (let i = 0; i < 6; i++) bloop(0.04 + Math.random() * 0.35, 380 + Math.random() * 900, 0.12, 0.05 + Math.random() * 0.05);
      clip('bubbles', { i: 1, at: 0.05, vel: 0.19, rate: 1.2, dur: 0.8, verb: 0.3 });
    } else if (name === 'ripple') { bloop(0, 240 + kk * 120, 0.22, 0.14); bloop(0.09, 520 + kk * 200, 0.08, 0.08); }
    else if (name === 'drip') bloop(0, 900 + kk * 1400, 0.14, 0.03);
    else if (name === 'knit') { /* two needles meeting */
      if (FOLEY.clave) { clip('clave', { vel: 0.14, rate: 2.3 + kk * 0.3, verb: 0.1 }); clip('clave', { at: 0.12, vel: 0.1, rate: 2.5 + kk * 0.3, verb: 0.1 }); }
      else { burst({ white: true, f0: 5200, dur: 0.02, vel: 0.15, q: 4, rate: 1, attack: 0.002, verb: 0.1 }); burst({ at: 0.12, white: true, f0: 5600, dur: 0.02, vel: 0.12, q: 4, rate: 1, attack: 0.002, verb: 0.1 }); }
    } else if (name === 'creak') { creak(0, kk, 0.17); A.note({ m: 62, vel: 0.05, voice: 'pluck', dur: 0.4, fx: true }); }
    else if (name === 'join') { box(72, 0, 0.26); box(77, 0.1, 0.26); }
  };

  document.addEventListener('visibilitychange', () => {
    if (!ok() || A.offline) return;
    try { if (document.hidden) A.ctx.suspend(); else if (!A.muted) A.ctx.resume(); } catch (_) { /* fine */ }
  });
  const btn = document.getElementById('mute');
  if (btn) {
    btn.addEventListener('click', () => { A.unlock(); A.toggleMute(); });
    A.setMuted(A.muted);
  }
  /* Sound is never worth stopping the story for: whatever goes wrong in here stays in here. */
  ['note', 'pad', 'bed', 'motif', 'step', 'theme', 'fragment', 'toll', 'scaleStep', 'promise', 'glide', 'ambience', 'sfx', 'score', 'rain', 'surface', 'talk', 'setVolume'].forEach((name) => {
    const fn = A[name];
    A[name] = function () { try { return fn.apply(A, arguments); } catch (e) { if (T.report) T.report(e, 'sound ' + name); return 0; } };
  });
  A._build = build; /* test hook: render through an OfflineAudioContext */
  /* test hooks: start again from nothing on a fresh context; hear only the synthesised voices */
  A._reset = function () {
    if (bed && bed.timer) clearInterval(bed.timer);
    bed = null; wantBed = null; wantAmb = null; padNow = null; live.length = 0; pinned = null; rainNow = -1; spaceKind = null;
  };
  A._samplesOff = function (v) { samplesOff = !!v; };
})();
