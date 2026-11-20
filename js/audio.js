/* 데이 & 나이트 — 소리
 * 녹음 파일 없이 WebAudio 로 즉석에서 만든다: 느린 화음 위에 드문드문 떨어지는 음,
 * 낮에는 밝은 음계, 밤에는 낮고 어두운 음계. 첫 클릭 이후에만 소리가 난다.
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const A = (DN.Audio = { muted: false, ready: false });
  let ac = null, master = null, wet = null, pad = null, rumble = null;
  let mood = { tod: 0, theme: 'village', lantern: true };
  let nextNote = 0, padRoot = 0;

  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // 음계 (반음 간격)
  const SCALES = {
    day:   [0, 2, 4, 7, 9, 12, 14, 16],
    dusk:  [0, 2, 5, 7, 9, 12, 14, 17],
    night: [0, 3, 5, 7, 10, 12, 15, 17],
    dawn:  [0, 2, 4, 7, 11, 12, 14, 19],
  };
  const ROOT = { sky: 62, village: 60, harbor: 57, city: 58, cave: 53, snow: 53, realm: 51, hill: 60 };

  A.unlock = function () {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = A.muted ? 0 : 0.8;
      const comp = ac.createDynamicsCompressor();
      master.connect(comp); comp.connect(ac.destination);
      // 울림: 되먹임 지연 두 줄
      wet = ac.createGain(); wet.gain.value = 0.5;
      const mk = (time, fb) => {
        const d = ac.createDelay(1.5); d.delayTime.value = time;
        const g = ac.createGain(); g.gain.value = fb;
        const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
        wet.connect(d); d.connect(lp); lp.connect(g); g.connect(d); lp.connect(master);
      };
      mk(0.31, 0.46); mk(0.47, 0.4);
      // 깔리는 화음
      pad = { g: ac.createGain(), o: [] };
      pad.g.gain.value = 0;
      const plp = ac.createBiquadFilter(); plp.type = 'lowpass'; plp.frequency.value = 700;
      pad.g.connect(plp); plp.connect(master); plp.connect(wet);
      for (let i = 0; i < 3; i++) {
        const o = ac.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine';
        o.connect(pad.g); o.start(); pad.o.push(o);
      }
      // 언덕을 끌 때의 낮은 울림
      const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      A._noise = buf;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
      rumble = ac.createGain(); rumble.gain.value = 0;
      src.connect(f); f.connect(rumble); rumble.connect(master); src.start();
      A.ready = true;
      nextNote = ac.currentTime + 0.6;
    } catch (e) { ac = null; }
  };

  A.setMuted = function (m) {
    A.muted = m;
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.1);
  };

  function todKey(tod) { return ['day', 'dusk', 'night', 'dawn'][Math.round(((tod % 4) + 4) % 4) % 4]; }

  function pluck(freq, when, vol, dur, type) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    o.connect(g); g.connect(master); g.connect(wet);
    o.start(when); o.stop(when + dur + 0.05);
    // 맑은 배음 하나
    const o2 = ac.createOscillator(), g2 = ac.createGain();
    o2.type = 'sine'; o2.frequency.value = freq * 2.01;
    g2.gain.setValueAtTime(0, when);
    g2.gain.linearRampToValueAtTime(vol * 0.22, when + 0.008);
    g2.gain.exponentialRampToValueAtTime(0.0008, when + dur * 0.45);
    o2.connect(g2); g2.connect(wet);
    o2.start(when); o2.stop(when + dur * 0.5);
  }

  A.setMood = function (tod, theme, lantern) { mood.tod = tod; mood.theme = theme; mood.lantern = lantern; };

  A.tick = function () {
    if (!ac || ac.state !== 'running') return;
    const now = ac.currentTime;
    const key = todKey(mood.tod);
    const rootN = (ROOT[mood.theme] || 60) + (key === 'night' ? -2 : 0);
    // 화음
    if (padRoot !== rootN) {
      padRoot = rootN;
      const fs = [midi(rootN - 12), midi(rootN - 5), midi(rootN + (key === 'night' ? 3 : 4))];
      pad.o.forEach((o, i) => o.frequency.setTargetAtTime(fs[i], now, 1.5));
    }
    pad.g.gain.setTargetAtTime(key === 'night' ? 0.05 : 0.035, now, 2);
    // 떨어지는 음
    if (now >= nextNote) {
      const sc = SCALES[key];
      const dark = key === 'night';
      const n = rootN + sc[Math.floor(Math.random() * sc.length)] + (Math.random() < 0.25 ? 12 : 0) - (dark && !mood.lantern ? 12 : 0);
      pluck(midi(n), now + 0.02, dark ? 0.07 : 0.085, dark ? 3.4 : 2.6, Math.random() < 0.5 ? 'sine' : 'triangle');
      if (Math.random() < 0.3) pluck(midi(n + sc[2]), now + 0.24, 0.05, 2.4);
      nextNote = now + (dark ? 1.5 : 1.0) + Math.random() * (dark ? 2.6 : 1.8);
    }
  };

  A.rumble = function (amount) {
    if (!ac) return;
    rumble.gain.setTargetAtTime(Math.min(0.5, amount), ac.currentTime, 0.06);
  };

  function noiseBurst(when, dur, freq, vol) {
    const src = ac.createBufferSource(); src.buffer = A._noise;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.7;
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, when); g.gain.exponentialRampToValueAtTime(0.0008, when + dur);
    src.connect(f); f.connect(g); g.connect(master); g.connect(wet);
    src.start(when, Math.random()); src.stop(when + dur + 0.05);
  }

  A.sfx = function (name) {
    if (!ac || ac.state !== 'running') return;
    const t = ac.currentTime + 0.01;
    switch (name) {
      case 'pick': pluck(midi(79), t, 0.06, 0.5); break;
      case 'tap': pluck(midi(72), t, 0.03, 0.3); break;
      case 'no': pluck(midi(50), t, 0.06, 0.4, 'triangle'); break;
      case 'on': pluck(midi(72), t, 0.09, 1.6); pluck(midi(79), t + 0.09, 0.07, 1.8); break;
      case 'off': pluck(midi(60), t, 0.08, 1.8); pluck(midi(53), t + 0.12, 0.07, 2.2); break;
      case 'poof': noiseBurst(t, 0.7, 500, 0.22); pluck(midi(84), t + 0.1, 0.04, 1.2); break;
      case 'chime': [72, 76, 79, 84].forEach((n, i) => pluck(midi(n), t + i * 0.11, 0.07, 2.2)); break;
      case 'star': [88, 91, 96].forEach((n, i) => pluck(midi(n), t + i * 0.16, 0.05, 2.6)); break;
      case 'memory': [65, 72, 77, 81].forEach((n, i) => pluck(midi(n), t + i * 0.2, 0.06, 3.2, 'triangle')); break;
      case 'dark': pluck(midi(41), t, 0.12, 3, 'triangle'); noiseBurst(t, 1.6, 180, 0.18); break;
      case 'bell': pluck(midi(69), t, 0.1, 3.4); pluck(midi(81.02), t, 0.04, 2.4); break;
      case 'join': [67, 72, 76].forEach((n, i) => pluck(midi(n), t + i * 0.13, 0.07, 1.8)); break;
      case 'end': [60, 64, 67, 72, 76].forEach((n, i) => pluck(midi(n), t + i * 0.28, 0.08, 4)); break;
    }
  };

  const BLIP = { day: 76, night: 64, hari: 81, keeper: 57, narr: 0, dusk: 69, unknown: 69, child: 84 };
  A.blip = function (who) {
    if (!ac || ac.state !== 'running') return;
    const n = BLIP[who] === undefined ? 74 : BLIP[who];
    if (n) pluck(midi(n), ac.currentTime + 0.01, 0.028, 0.35);
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
