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
  } catch (e) { ctx = null; return; }
  // 잠금 해제 전에 요청된 배경 음악이 있으면 지금 시작
  if (want) bgm(want);
}
export function setMuted(m) { audio.muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.02); try { localStorage.setItem('gogae.mute', m ? '1' : '0'); } catch (e) { /* 무시 */ } }

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

// ===================== 배경 음악: 국악풍 절차 생성 (외부 파일 없음) =====================
// 5음 음계. 도수 0 = 으뜸음, 3 = 딸림음. 평조 ≈ 솔라도레미, 계면조 ≈ 미솔라시레
const PY = [0, 2, 5, 7, 9], GM = [0, 3, 5, 7, 10];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const cls = d => ((d % 5) + 5) % 5;
const mid = (S, d) => S.root + 12 * Math.floor(d / 5) + S.mode[cls(d)];
const P = s => s.split(' ');
// 리듬 셀: 한 박을 스텝으로 나눈 모양 (12/8은 한 박 = 3스텝, 휘모리·진양조풍은 2스텝)
const C3 = [[3], [2, 1], [1, 2], [1, 1, 1], [2, 1], [3]];
const C3F = [[1, 1, 1], [2, 1], [1, 2], [1, 1, 1], [3], [2, 1]];
const C3M = [[2, 1], [1, 1, 1], [2, 1], [1, 2], [3]];
const C2S = [[2], [2], [1, 1], [2], [1, 1]];
const C2F = [[1, 1], [2], [1, 1], [1, 1], [2]];
// 음정 이동(도수): 순차 진행 위주, 살짝 하행 경향
const IVS = [-1, -1, -1, -1, 1, 1, 1, -2, 2, -2, 2, 3, -3];
// 악기 기본 세기: gy 가야금, dg 대금, hg 해금, pr 피리
const LV = { gy: 0.26, dg: 0.17, hg: 0.12, pr: 0.13 };
const MUSIC_LV = 0.18, FADE = 1.2, CAP = 8;
// sd 스텝 길이(초), bt 박당 스텝, bpb 마디당 박, mb 동기 길이(박), cb 마침음 길이(박)
// call/resp 부름·받음 악기, ro 받음 옥타브(도수), het 가야금 헤테로포니 확률, line 대금 긴 선 확률
// ost [확률, [[스텝, 도수, 세기]...]] 마디마다 낮은 가야금, jang 장구(마디별 순환), fill 홀수 프레이즈 끝마디
// buk 북(B 강, b 약), jing 몇 프레이즈마다 징, kye 계면조 시김새, vr 떨림 속도(Hz), send 울림 양
const TRACKS = {
  // 진양조풍: 느리고 넓게. 가야금 뜯음 위주, 밑에 여린 대금 선, 징은 드물게
  title: { sd: 0.4, bt: 2, bpb: 6, mb: 3, cb: 2, mode: PY, root: 55, lo: 0, hi: 9, cells: C2S, rest: 0.22, hold: 0.4, call: 'gy', resp: 'gy', line: 0.8,
    ost: [0.5, [[0, -5, 0.55], [6, -2, 0.4]]], jang: ['덩 . . . . . . . . . . .', '쿵 . . . . . . . 덕 . . .', '쿵 . . . . . . . . . . .', '쿵 . . . . . . . 덕 . 쿵 .'],
    jv: 0.3, jing: 2, jgv: 0.06, vol: 0.8, send: 0.5, vr: 4.5 },
  // 굿거리: 보통 빠르기, 가벼운 장구, 밝은 가야금 가락
  march: { sd: 0.22, bt: 3, bpb: 4, mb: 2, cb: 1, mode: PY, root: 57, lo: 0, hi: 9, cells: C3M, rest: 0.12, hold: 0.15, call: 'gy', resp: 'gy',
    ost: [0.8, [[0, -5, 0.6], [6, -2, 0.45]]], jang: ['덩 . 기덕 쿵 . 더러러러 쿵 . 기덕 쿵 . 더러러러'], jv: 0.5, vol: 0.95, send: 0.25, vr: 5.5 },
  // 자진모리: 빠른 12/8, 장구 + 북, 해금 주선율에 가야금이 따라감
  battle: { sd: 0.16, bt: 3, bpb: 4, mb: 2, cb: 1, mode: PY, root: 62, lo: 0, hi: 8, cells: C3F, rest: 0.1, hold: 0.12, call: 'hg', resp: 'hg', het: 0.55, slP: 0.3,
    jang: ['덩 . 쿵 덕 . 쿵 덕 . . 쿵 . .'], fill: '덩 . 쿵 덕 . 쿵 덕 쿵 덕 덩 . 더러러러', jv: 0.55, buk: 'B . . . . . b . . . . .', bv: 0.5, vol: 1.1, send: 0.2, vr: 6 },
  // 휘모리: 아주 빠른 4박, 무거운 북, 프레이즈 첫머리 징, 계면조 피리(떠는 소리·꺾는 소리)
  boss: { sd: 0.15, bt: 2, bpb: 4, mb: 2, cb: 2, mode: GM, root: 52, lo: 2, hi: 10, cells: C2F, rest: 0.08, hold: 0.2, kye: 1, call: 'pr', resp: 'pr', slP: 0.3,
    ost: [0.85, [[0, 0, 0.7], [3, 0, 0.45], [6, 3, 0.55]]], jang: ['덩 . 덕 . 쿵 . 덕 .', '덩 . 덕 . 쿵 덕 덕 .'], fill: '덩 덕 쿵 덕 덩 덕 더러러러 덕',
    jv: 0.55, buk: 'B . b . B . b .', bv: 0.6, jing: 1, jgv: 0.09, vol: 0.83, send: 0.2, vr: 5 },
  // 인형극 이야기: 여리고 성긴 계면조 가야금
  story: { sd: 0.38, bt: 2, bpb: 6, mb: 3, cb: 2, mode: GM, root: 57, lo: 0, hi: 8, cells: C2S, rest: 0.25, hold: 0.3, kye: 1, call: 'gy', resp: 'gy',
    ost: [0.6, [[0, -5, 0.5], [6, -2, 0.35]]], jang: ['쿵 . . . . . . . . . . .', '. . . . . . . . . . . .'], jv: 0.18, vol: 1.08, send: 0.45, vr: 4.5 },
  // 주막·장터·사건: 세마치풍 9/8, 따뜻하게. 가야금이 부르고 대금이 받는다
  rest: { sd: 0.24, bt: 3, bpb: 3, mb: 3, cb: 2, mode: PY, root: 53, lo: 0, hi: 7, cells: C3, rest: 0.2, hold: 0.25, call: 'gy', resp: 'dg', ro: 5, slP: 0.25,
    ost: [0.7, [[0, -5, 0.55], [6, -2, 0.35]]], jang: ['덩 . 덕 쿵 덕 . 쿵 덕 .', '쿵 . 덕 쿵 덕 . 쿵 . .'], jv: 0.3, vol: 0.75, send: 0.35, vr: 4.5 },
};
for (const k in TRACKS) { const S = TRACKS[k]; S.jang = S.jang.map(P); if (S.fill) S.fill = P(S.fill); if (S.buk) S.buk = P(S.buk); }
export const BGM_NAMES = Object.keys(TRACKS);

function rng(seed) {
  let a = seed >>> 0;
  const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  R.pick = arr => arr[(R() * arr.length) | 0];
  return R;
}
const NBUF = new WeakMap();
function nbuf(ac) {
  let b = NBUF.get(ac);
  if (!b) { b = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; NBUF.set(ac, b); }
  return b;
}

// ---- 시김새: 미끄러져 들어가기(sl, 반음), 퉁긴 뒤 살짝 처짐(pl), 꺾는 소리(bd, 반음) ----
function pitch(p, t, f, d, o) {
  if (o.sl) { p.setValueAtTime(f * Math.pow(2, o.sl / 12), t); p.exponentialRampToValueAtTime(f, t + Math.min(0.09, d * 0.3)); }
  else if (o.pl) { p.setValueAtTime(f * 1.015, t); p.exponentialRampToValueAtTime(f, t + 0.035); }
  else p.setValueAtTime(f, t);
  if (o.bd) { p.setValueAtTime(f, t + d * 0.45); p.linearRampToValueAtTime(f * 1.025, t + d * 0.55); p.exponentialRampToValueAtTime(f * Math.pow(2, o.bd / 12), t + d * 0.78); }
}
// 농현·떠는 소리: 음 길이 동안 점점 커지는 떨림 (o.vb = [깊이(cent), 지연(초), 속도(Hz)])
function vibr(T, t, d, o, ps, e) {
  if (!o.vb) return;
  const [dep, dl, rt] = o.vb, l = T.ac.createOscillator(), g = T.ac.createGain();
  l.frequency.value = rt; g.gain.setValueAtTime(0, t); g.gain.setValueAtTime(0, t + dl); g.gain.linearRampToValueAtTime(dep, t + d);
  l.connect(g); for (const x of ps) g.connect(x);
  l.start(t); l.stop(e + 0.02);
}
// ---- 악기 ----
function gy(T, t, m, d, v, o, e) {
  const ac = T.ac, f = hz(m), a = ac.createOscillator(), b = ac.createOscillator(), g = ac.createGain(), h = ac.createGain();
  a.type = 'triangle'; pitch(a.frequency, t, f, d, o); pitch(b.frequency, t, f * 2, d, o);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(v * 0.4, t + 0.12); g.gain.exponentialRampToValueAtTime(v * 0.1, t + (e - t) * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, e);
  h.gain.setValueAtTime(0.5, t); h.gain.exponentialRampToValueAtTime(0.02, t + 0.3);
  a.connect(g); b.connect(h); h.connect(g); g.connect(T.M);
  vibr(T, t, Math.min(d, e - t), o, [a.detune, b.detune], e);
  a.start(t); b.start(t); a.stop(e + 0.02); b.stop(e + 0.02);
}
function dg(T, t, m, d, v, o, e) {
  const ac = T.ac, f = hz(m), at = Math.min(0.14, d * 0.35), a = ac.createOscillator(), b = ac.createOscillator(), w = ac.createGain(), g = ac.createGain();
  b.type = 'triangle'; pitch(a.frequency, t, f, d, o); pitch(b.frequency, t, f, d, o); w.gain.value = 0.25;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + at); g.gain.linearRampToValueAtTime(v * 0.8, t + d); g.gain.exponentialRampToValueAtTime(0.0001, e);
  a.connect(g); b.connect(w); w.connect(g); g.connect(T.M);
  // 숨소리: 띠 거른 잡음, 첫머리에 조금 세게
  const s = ac.createBufferSource(), bp = ac.createBiquadFilter(), n = ac.createGain();
  s.buffer = T.nb; s.loop = true; bp.type = 'bandpass'; bp.frequency.value = Math.min(4000, f * 3); bp.Q.value = 1.2;
  n.gain.setValueAtTime(0.0001, t); n.gain.linearRampToValueAtTime(v * 0.35, t + at * 0.6); n.gain.exponentialRampToValueAtTime(v * 0.08, t + at + 0.1); n.gain.exponentialRampToValueAtTime(0.0001, e);
  s.connect(bp); bp.connect(n); n.connect(T.M);
  vibr(T, t, d, o, [a.detune, b.detune], e);
  a.start(t); b.start(t); s.start(t, Math.random() * 0.5); a.stop(e + 0.02); b.stop(e + 0.02); s.stop(e + 0.02);
}
// 해금·피리: 톱니파를 낮게 걸러 콧소리만 남긴다
function reed(T, t, m, d, v, o, e, cut, q) {
  const ac = T.ac, f = hz(m), a = ac.createOscillator(), lp = ac.createBiquadFilter(), g = ac.createGain(), at = Math.min(0.05, d * 0.25);
  a.type = 'sawtooth'; pitch(a.frequency, t, f, d, o);
  lp.type = 'lowpass'; lp.frequency.value = Math.min(cut, f * 5); lp.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + at); g.gain.linearRampToValueAtTime(v * 0.75, t + d); g.gain.exponentialRampToValueAtTime(0.0001, e);
  a.connect(lp); lp.connect(g); g.connect(T.M);
  vibr(T, t, d, o, [a.detune], e);
  a.start(t); a.stop(e + 0.02);
}
const INS = {
  gy: [gy, d => Math.min(1.8, Math.max(0.5, d * 2))],
  dg: [dg, d => d + 0.22],
  hg: [(T, t, m, d, v, o, e) => reed(T, t, m, d, v, o, e, 2200, 1.5), d => d + 0.12],
  pr: [(T, t, m, d, v, o, e) => reed(T, t, m, d, v, o, e, 1600, 2.5), d => d + 0.12],
};
// 동시 발음 수 제한: 반주(7) < 선율(8) < 타악(10)
function room(T, t, e, lim) {
  const a = T.vo;
  for (let i = a.length - 1; i >= 0; i--) if (a[i] <= t) a.splice(i, 1);
  if (a.length >= lim) { T.drop++; return false; }
  a.push(e); return true;
}
function play(T, i, t, m, d, v, o, lim) { const [fn, tl] = INS[i], e = t + tl(d); if (room(T, t, e, lim)) fn(T, t, m, d, v, o, e); }
// ---- 타악: 장구(쿵·덕), 북, 징 ----
function nz(T, t, dur, v, type, f, q) {
  const ac = T.ac, s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = T.nb; b.type = type; b.frequency.value = f; b.Q.value = q;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(b); b.connect(g); g.connect(T.D); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
// 가죽: 낮은 사인 휩쓸기 + 작은 스피커에서도 들리게 2.4배 배음 + 짧은 잡음
function skin(T, t, v, f0, f1, dur, nf, nv) {
  const ac = T.ac, o = ac.createOscillator(), u = ac.createOscillator(), g = ac.createGain(), k = ac.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  u.frequency.setValueAtTime(f0 * 2.4, t); u.frequency.exponentialRampToValueAtTime(f1 * 2.4, t + dur * 0.4);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  k.gain.setValueAtTime(0.4, t); k.gain.exponentialRampToValueAtTime(0.01, t + dur * 0.4);
  o.connect(g); u.connect(k); k.connect(g); g.connect(T.D); o.start(t); u.start(t); o.stop(t + dur + 0.02); u.stop(t + dur + 0.02);
  nz(T, t, 0.05, v * nv, 'lowpass', nf, 1);
}
const kung = (T, t, v) => skin(T, t, v * 0.45, 95, 55, 0.3, 600, 0.35);
const deok = (T, t, v, f = 2600) => nz(T, t, 0.055, v, 'bandpass', f, 2.2);
const buk = (T, t, v) => skin(T, t, v * 0.55, 72, 40, 0.5, 320, 0.5);
function jing(T, t, v) {
  const ac = T.ac, g = ac.createGain(), e = t + 4.5;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.35, t + 0.03); g.gain.linearRampToValueAtTime(v, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, e);
  g.connect(T.M);
  for (const [f, a] of [[211, 1], [213.6, 0.8], [317, 0.35], [457, 0.22]]) {
    const o = ac.createOscillator(), w = ac.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.985, e); w.gain.value = a;
    o.connect(w); w.connect(g); o.start(t); o.stop(e + 0.02);
  }
}
const JG = {
  '덩': (T, t, v) => { kung(T, t, v); deok(T, t, v); },
  '쿵': kung,
  '덕': (T, t, v) => deok(T, t, v),
  '기덕': (T, t, v) => { deok(T, t - Math.min(0.05, T.S.sd * 0.3), v * 0.4); deok(T, t, v); },
  '더러러러': (T, t, v) => { for (let i = 0; i < 4; i++) deok(T, t + (i * T.S.sd) / 4, v * (0.3 + 0.12 * i), 2100); },
};

// ---- 가락 짓기: 동기(박마다 [길이, 음정이동, 0 음/1 쉼/2 붙임]) → 4마디 부름·받음 ----
function motif(S, R) {
  const M = [];
  for (let b = 0; b < S.mb; b++) M.push(R.pick(S.cells).map((l, i) => (b || i ? [l, R.pick(IVS), R() < S.rest ? 1 : R() < S.hold ? 2 : 0] : [l, 0, 0])));
  return M;
}
function vary(M, S, R) {
  const V = M.map(b => b.map(n => n.slice())), b = (R() * V.length) | 0;
  if (R() < 0.5) { const n0 = V[b][0]; V[b] = R.pick(S.cells).map((l, i) => (i ? [l, R.pick(IVS), R() < S.rest ? 1 : 0] : [l, n0[1], n0[2]])); }
  else { const n = V[b][(R() * V[b].length) | 0]; if (n !== V[0][0]) n[1] += R() < 0.5 ? -1 : 1; }
  return V;
}
const inv = M => M.map(b => b.map(n => [n[0], -n[1], n[2]]));
const refl = (d, S) => (d > S.hi ? 2 * S.hi - d : d < S.lo ? 2 * S.lo - d : d);
function flat(M, an, S) {
  const out = []; let s = 0, d = an;
  for (const beat of M) for (const [l, iv, f] of beat) {
    d = refl(d + iv, S);
    if (f === 2 && out.length) { const p = out[out.length - 1]; p[1] = s + l - p[0]; }
    else if (f !== 1) out.push([s, l, d]);
    s += l;
  }
  return out;
}
function near(d, cs, S, R) {
  let best = d, bd = 99;
  for (let x = S.lo; x <= S.hi; x++) if (cs.includes(cls(x))) { const k = Math.abs(x - d) + R() * 0.5; if (k < bd) { bd = k; best = x; } }
  return best;
}
// 마침: 마지막 cb박을 으뜸음(끝) 또는 딸림음(반마침)으로 길게
function cad(ns, S, R, fin, sb, pd) {
  const cl = Math.min(sb, S.cb * S.bt), cs = sb - cl, k = ns.filter(x => x[0] < cs);
  for (const x of k) x[1] = Math.min(x[1], cs - x[0]);
  k.push([cs, cl, near(k.length ? k[k.length - 1][2] : pd, fin ? [0] : R() < 0.75 ? [3] : [0], S, R)]);
  return k;
}
function phrase(T) {
  const S = T.S, R = T.R, sb = S.bt * S.mb, n = (4 * S.bpb) / S.mb, half = n / 2, bs = S.bt * S.bpb;
  const ev = Array.from({ length: n * sb }, () => []), mel = [], sk = [];
  const A = T.A && R() < 0.45 ? vary(T.A, S, R) : motif(S, R), B = R() < 0.3 ? inv(A) : motif(S, R);
  T.A = A;
  const lo = S.lo + 1, hi = S.hi - 2, rnd = () => lo + ((R() * (hi - lo + 1)) | 0);
  let an = rnd(), pd = an;
  for (let k = 0; k < n; k++) {
    const call = k < half;
    if (k === half) an = rnd();
    else if (k) an = Math.max(lo, Math.min(hi, an + R.pick([-2, -1, -1, 0, 1, 1, 2])));
    let ns = flat(k % half ? vary(call ? A : B, S, R) : call ? A : B, an, S);
    if (k === half - 1 || k === n - 1) ns = cad(ns, S, R, k === n - 1, sb, pd);
    pd = ns[ns.length - 1][2]; sk.push(pd);
    for (const [s, l, d] of ns) mel.push([k * sb + s, l, d, call ? S.call : S.resp, call ? 0 : S.ro || 0]);
  }
  for (let i = 0; i < mel.length; i++) {
    const [at, l, d, ins, oc] = mel[i], nx = mel[i + 1], pv = mel[i - 1], m = mid(S, d + oc), dur = l * S.sd, o = {}, c = cls(d);
    if (ins === 'gy') o.pl = 1;
    // 계면조: 으뜸음은 크게 떨고(떠는 소리), 위 이웃음은 아래 이웃음으로 꺾어 내린다(꺾는 소리)
    if (S.kye && c === 0 && dur >= 0.28) o.vb = [55, 0.05, S.vr * 0.8];
    else if (dur >= 0.4 && (ins !== 'gy' || R() < 0.5)) o.vb = [S.kye ? 26 : 16, dur * 0.35, S.vr];
    if (S.kye && c === 3 && nx && nx[2] === d - 1 && nx[0] === at + l && dur >= 0.25) o.bd = mid(S, d - 1 + oc) - m;
    else if (pv && dur >= 0.2 && R() < (S.slP || 0.15)) o.sl = ins === 'gy' ? -1 : Math.max(-3, Math.min(3, mid(S, pv[2] + pv[4]) - m));
    const v = LV[ins] * (at % S.bt ? 0.8 : 1) * (0.88 + 0.24 * R());
    ev[at].push([ins, m, ins === 'gy' ? dur : dur * 0.92, v, o, CAP]);
    if (S.het && ins !== 'gy' && at % S.bt === 0 && R() < S.het) ev[at].push(['gy', mid(S, d + oc - 5), Math.min(l, S.bt) * S.sd, LV.gy * 0.55, { pl: 1 }, CAP - 1]);
  }
  if (S.line) for (let k = 0; k < n; k++) if (R() < S.line) {
    const dur = (sb - S.bt) * S.sd;
    ev[k * sb + S.bt].push(['dg', mid(S, cls(sk[k]) + 5), dur, LV.dg * 0.75, { vb: [22, dur * 0.4, S.vr] }, CAP - 1]);
  }
  if (S.ost) for (let b = 0; b < 4; b++) for (const [s, d, v] of S.ost[1]) if (R() < S.ost[0] || (!s && !b)) ev[b * bs + s].push(['gy', mid(S, d), S.bt * S.sd, LV.gy * v, { pl: 1 }, CAP - 1]);
  return ev;
}

// 음악 버스: 레벨 + 함께 쓰는 되먹임 울림(저역 통과)
export function musicBus(ac, out, level = MUSIC_LV) {
  const i = ac.createGain(), w = ac.createGain(), dl = ac.createDelay(1), lp = ac.createBiquadFilter(), fb = ac.createGain(), wo = ac.createGain();
  i.gain.value = level; dl.delayTime.value = 0.26; lp.type = 'lowpass'; lp.frequency.value = 2200; fb.gain.value = 0.3; wo.gain.value = 0.35;
  w.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wo); wo.connect(i); i.connect(out);
  return { in: i, wet: w };
}
// 곡 하나를 ac/dest에 그린다. live면 100ms 타이머가 0.3초 앞까지 예약, 아니면 h.pump(끝시각)로 직접 채운다.
export function startTrack(ac, dest, name, t0, opt = {}) {
  const S = TRACKS[name]; if (!S) return null;
  const fi = opt.fade || 0, bus = dest.connect ? { in: dest } : dest, M = ac.createGain(), fades = [];
  // 페이드: 들어올 때(a)와 나갈 때(b)를 따로 둬서 자동화가 겹치지 않게
  const chain = (lv, to) => {
    const a = ac.createGain(), b = ac.createGain();
    a.gain.setValueAtTime(fi ? 0 : lv, t0); if (fi) a.gain.linearRampToValueAtTime(lv, t0 + fi);
    a.connect(b); b.connect(to); fades.push(a, b); return a;
  };
  const D = chain(S.vol, bus.in);
  M.connect(D); if (bus.wet) M.connect(chain(S.vol * S.send, bus.wet));
  const T = { ac, S, R: rng(opt.seed ?? Math.random() * 4294967296), M, D, nb: nbuf(ac), vo: [], A: null, drop: 0 };
  const R = T.R, bs = S.bt * S.bpb, N = 4 * bs;
  let st = 0, nt = t0, pi = -1, ev = null, timer = 0;
  function step(k, t) {
    const p = Math.floor(k / N), j = k % N, b = j % bs, bar = (j / bs) | 0;
    if (p !== pi) { pi = p; ev = phrase(T); }
    if (!j && S.jing && p % S.jing === 0 && room(T, t, t + 4.5, CAP + 2)) jing(T, t, S.jgv);
    // 타악은 실제로 들리는 길이만큼만 발음 수에 센다
    const pat = bar === 3 && S.fill && p % 2 ? S.fill : S.jang[bar % S.jang.length], tk = pat[b];
    if (tk !== '.' && room(T, t, t + (tk[0] === '덕' || tk[0] === '기' ? 0.06 : tk[0] === '더' ? S.sd : 0.2), CAP + 2)) JG[tk](T, t, S.jv * (b ? (b % S.bt ? 0.7 : 0.85) : 1) * (0.9 + 0.2 * R()));
    const bk = S.buk && S.buk[b];
    if (bk && bk !== '.' && room(T, t, t + 0.3, CAP + 2)) buk(T, t, S.bv * (bk === 'B' ? 1 : 0.55));
    for (const e of ev[j]) play(T, e[0], t + R() * 0.006, e[1], e[2], e[3], e[4], e[5]);
  }
  const h = {
    name, done: false, T,
    pump(until, quiet) {
      if (h.done) return;
      // 탭이 가려져 한참 밀렸으면 놓친 음은 건너뛴다 (한꺼번에 몰아 예약하지 않음)
      const now = ac.currentTime;
      if (nt < now - 0.1) { const k = Math.ceil((now + 0.02 - nt) / S.sd); nt += k * S.sd; st += k; }
      while (nt < until) { if (!quiet) step(st, nt); nt += S.sd; st++; }
    },
    stop(t = ac.currentTime, f = 0.05) {
      if (h.done) return;
      h.done = true; clearInterval(timer); timer = 0;
      for (let i = 1; i < fades.length; i += 2) { const g = fades[i].gain; g.setValueAtTime(1, t); g.linearRampToValueAtTime(0, t + f); }
      setTimeout(() => { M.disconnect(); for (const g of fades) g.disconnect(); }, (t - ac.currentTime + f + 0.5) * 1000);
    },
  };
  if (opt.live) {
    const tick = () => h.pump(ac.currentTime + 0.3, opt.quiet && opt.quiet());
    timer = setInterval(tick, 100); tick();
  }
  return h;
}
let mbus = null, cur = null, want = null;
const hush = () => audio.muted || (typeof document !== 'undefined' && document.hidden);
// 배경 음악 바꾸기 (1.2초 교차). bgm(null) = 페이드아웃 후 정지. 잠금 해제 전이면 기억했다가 unlockAudio에서 시작
export function bgm(name) {
  if (name && !TRACKS[name]) { console.warn('bgm: 없는 곡', name); return; }
  name = name || null; want = name;
  if (!ctx || (cur ? cur.name : null) === name) return;
  try {
    if (!mbus) mbus = musicBus(ctx, master);
    const t = ctx.currentTime;
    if (cur) cur.stop(t, FADE);
    cur = name ? startTrack(ctx, mbus, name, t + 0.06, { live: true, fade: FADE, quiet: hush }) : null;
  } catch (e) { cur = null; if (!audio.warned) { audio.warned = true; console.warn('bgm 실패:', name, e); } }
}
