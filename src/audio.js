// WebAudio 합성 효과음 (외부 파일 없음)
let ctx = null, master = null, noiseBuf = null;
const last = {};
export const audio = { muted: false, unlocked: false };
try { audio.muted = localStorage.getItem('gogae.mute') === '1'; } catch (e) { /* 무시 */ }

export function unlockAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = audio.muted ? 0 : 0.5; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audio.unlocked = true;
  } catch (e) { ctx = null; }
}
export function setMuted(m) { audio.muted = m; if (master) master.gain.value = m ? 0 : 0.5; try { localStorage.setItem('gogae.mute', m ? '1' : '0'); } catch (e) { /* 무시 */ } }

function tone(type, f0, f1, dur, vol, delay = 0, attack = 0.005) {
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, f0, f1, q = 1, type = 'bandpass', delay = 0) {
  const t = ctx.currentTime + delay, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.02);
}
const S = {
  click() { tone('square', 520, 780, 0.06, 0.12); },
  place() { tone('sine', 180, 90, 0.12, 0.3); noise(0.06, 0.12, 900, 300); },
  hit() { noise(0.07, 0.22, 1800 + Math.random() * 900, 500, 0.8); tone('sine', 150, 70, 0.07, 0.16); },
  clang() { tone('square', 1300 + Math.random() * 300, 900, 0.09, 0.07); tone('triangle', 2100, 1500, 0.12, 0.06); },
  shoot() { noise(0.09, 0.14, 3200, 900, 1.5); },
  magic() { tone('sine', 420, 980, 0.22, 0.14); tone('triangle', 840, 1700, 0.2, 0.06, 0.03); },
  boom() { tone('sine', 130, 38, 0.38, 0.5); noise(0.34, 0.4, 900, 90, 0.6, 'lowpass'); },
  heal() { tone('sine', 660, 660, 0.14, 0.1); tone('sine', 990, 990, 0.2, 0.09, 0.07); },
  bless() { [523, 659, 784, 1047].forEach((f, i) => tone('sine', f, f, 0.35, 0.1, i * 0.07)); },
  horn() { for (const d of [0, 0.16, 0.32, 0.4]) { tone('sine', 140, 52, 0.22, 0.5, d); noise(0.08, 0.18, 700, 180, 0.7, 'lowpass', d); } },
  rain() { for (let i = 0; i < 5; i++) noise(0.12, 0.12, 4200, 1200, 2, 'bandpass', i * 0.05); },
  thud() { noise(0.05, 0.18, 1400, 400, 1); },
  death() { tone('triangle', 360, 140, 0.16, 0.12); },
  charge() { tone('sine', 110, 55, 0.22, 0.42); noise(0.2, 0.3, 500, 2600, 0.7); },
  warn() { tone('square', 740, 740, 0.09, 0.08); tone('square', 590, 590, 0.12, 0.08, 0.11); },
  leap() { noise(0.2, 0.18, 600, 3600, 2); },
  order() { tone('triangle', 520, 700, 0.08, 0.12); },
  focus() { tone('triangle', 620, 420, 0.1, 0.13); },
  coin() { tone('square', 1320, 1320, 0.06, 0.08); tone('square', 1760, 1760, 0.14, 0.08, 0.06); },
  star() { tone('triangle', 880, 1320, 0.2, 0.16); tone('sine', 1760, 1760, 0.25, 0.08, 0.05); },
  win() { [392, 523, 659, 784, 1047].forEach((f, i) => { tone('square', f, f, 0.28, 0.1, i * 0.12, 0.01); tone('triangle', f / 2, f / 2, 0.3, 0.12, i * 0.12); }); },
  lose() { [392, 349, 311, 233].forEach((f, i) => tone('sawtooth', f, f * 0.97, 0.4, 0.09, i * 0.2, 0.02)); },
  boss() { tone('sawtooth', 82, 62, 0.9, 0.2, 0, 0.05); noise(0.7, 0.2, 200, 60, 0.5, 'lowpass'); },
  card() { noise(0.08, 0.14, 2400, 5200, 1.2); tone('triangle', 660, 880, 0.1, 0.08, 0.02); },
  deny() { tone('square', 200, 150, 0.12, 0.1); },
};
const GAP = { hit: 0.05, clang: 0.07, shoot: 0.06, thud: 0.06, death: 0.08, heal: 0.12, boom: 0.08, warn: 0.5, magic: 0.1 };
export const SFX_NAMES = () => Object.keys(S);
export function sfx(name) {
  if (!ctx || audio.muted || !S[name]) return;
  const now = ctx.currentTime; if (last[name] !== undefined && now - last[name] < (GAP[name] || 0.02)) return;
  last[name] = now; try { S[name](); } catch (e) { if (!audio.warned) { audio.warned = true; console.warn('sfx 실패:', name, e); } }
}
