// 도트 전장: 고개마다의 풍경을 논리 640×360 픽셀(화면의 반)로 굽는다.
// 세 겹(먼 하늘·산 / 가까운 언덕·마을 / 들판)은 가로로 끝없이 이어지고, 하늘(낮·밤·비)마다 색을 따로 굽는다.
// 날씨(비·눈·안개·낙엽·불티·반딧불·넋불)는 매 장면 굽지 않은 작은 그림을 겹쳐 그린다.
import { Spr, bayer, rng, mixc, lum } from './px.js';

const TAU = Math.PI * 2;
// 논리 픽셀 주기 (종이판 FW·BW·GW 의 반)와 겹마다의 자리
export const FAR_P = 960, BACK_P = 1280, GROUND_P = 1280;
export const FAR_Y = 0, FAR_H = 84, BACK_Y = 34, BACK_H = 50, GROUND_Y = 64, GROUND_H = 296;

// ── 주기에 맞물리는 도구: 오른쪽 끝과 왼쪽 끝이 이어지게 정수 배 사인만 쓴다 ──
const sw = (x, P, k, ph = 0) => Math.sin(TAU * k * x / P + ph);
const pridge = (x, P, base, amp, k, ph) => base - amp * (0.55 * sw(x, P, k, ph) + 0.3 * sw(x, P, Math.round(k * 2.3), ph * 1.7) + 0.15 * sw(x, P, Math.round(k * 5.1), ph * 0.6));
const wx = (x, P) => ((Math.round(x) % P) + P) % P;
function wset(s, x, y, c) { s.set(wx(x, s.w), y, c); }
function wblit(s, spr, x, y) { const X = Math.round(x) - spr.ox, Y = Math.round(y) - spr.oy; s.blit(spr, X, Y); if (X < 0) s.blit(spr, X + s.w, Y); if (X + spr.w > s.w) s.blit(spr, X - s.w, Y); }
function well(s, cx, cy, rx, ry, c) { s.ell(cx, cy, rx, ry, c); if (cx - rx < 0) s.ell(cx + s.w, cy, rx, ry, c); if (cx + rx >= s.w) s.ell(cx - s.w, cy, rx, ry, c); }
// 덩어리 하나를 굽고 왼쪽 위는 밝게, 오른쪽 아래는 어둡게 (빛은 왼쪽 위에서)
function blob(s, fn, base, lit, dark, dd = 1) {
  const t = new Spr(s.w, s.h, s.ox, s.oy); fn(t);
  for (let y = 0; y < t.h; y++) for (let x = 0; x < t.w; x++) { if (t.get(x, y) === -1) continue; let c = base;
    let dk = false; for (let k = 1; k <= dd; k++) if (t.get(x, y + k) === -1 || t.get(x + k, y) === -1) dk = true;
    if (dk) c = dark; else if (t.get(x, y - 1) === -1 || t.get(x - 1, y) === -1) c = lit; s.set(x, y, c); }
}
// 작은 둥근 덩이 하나를 제 크기 판에 굽어 이어 붙인다 (큰 판 전체를 임시로 만들지 않는다)
function blobAt(s, x, y, rx, ry, base, lit, dark, dd = 1) { const w = Math.ceil(rx) * 2 + 3, h = Math.ceil(ry) * 2 + 3, t = new Spr(w, h, w >> 1, h >> 1); blob(t, q => q.ell(w >> 1, h >> 1, rx, ry, 1), base, lit, dark, dd); wblit(s, t, x, y); }

// ───────── 고개마다의 빛깔 (낮 기준). 밤·비는 아래 tone 으로 바꿔 굽는다 ─────────
const TM = {
  // 여우 고개: 봄날 낮, 산수유 노란 꽃
  pass: { sky: [0x5c8ad6, 0x76a2e2, 0x98bcec, 0xbcd6f2, 0xdfeaf0, 0xf4f0dc], sun: { x: 640, y: 44, r: 9, c: [0xfffef0, 0xfff6c8, 0xf6f0d4] }, clouds: [0xa8c4e8, 0xeef4fa, 0xffffff],
    m1: [0x8cb0d8, 0xb4cce6, 0xcadbe8], m2: [0x5c9a8c, 0x86bc98, 0xa8cca8, 0x3e7c6c], hill: [0x4c8c5c, 0x78b062, 0x2e6a4c], mark: 'fort',
    field: [0xb4d878, 0xa2d06a, 0x8cc45c, 0x76b452, 0x62a24c, 0x4e904a], patch: [0x6aa84e, 0xc4e08a], path: [0xe2cc92, 0xf4e4b2, 0xc6a872, 0xceb47e, 0xfaf0c8, 0xa6927a, 0xdcd0bc],
    spk: [0xe4f49a, 0x8ccc5c, 0x78bc54, 0x2c6c44, 0xa8e06c], tuft: [0x5ca448, 0x8cd060], flowers: [0xffe060, 0xfff6c0, 0xffffff], stone: [0x4a5466, 0x8a92a0, 0xb8c0c4, 0xe0e6e0],
    bush: [0x2c6c48, 0x4c8c50, 0x94c850], ink: 0x183830, trees: ['pine', 'sansuyu', 'pine', 'sansuyu', 'pine'], fence: [0x6c4630, 0xb8844a, 0x54301e], amb: 'petal' },
  // 씨름재·장승배기: 깊은 숲, 당산나무
  grove: { sky: [0x4c86c0, 0x6aa2d0, 0x90c0dc, 0xb8d8e0, 0xd8e8dc, 0xecf0d8], sun: { x: 300, y: 42, r: 9, c: [0xfffef0, 0xfff6c8, 0xeef0d0] }, clouds: [0x9cc0d8, 0xe8f2f4, 0xffffff],
    m1: [0x7aa8b8, 0xa0c4cc, 0xbcd4d0], m2: [0x3c7864, 0x5e9a74, 0x8cb89c, 0x285c4c], hill: [0x2c6448, 0x4c8a58, 0x1a4434], mark: 'forest',
    field: [0x8cbc68, 0x7cb05e, 0x6ca456, 0x5e9650, 0x50884a, 0x447a44], patch: [0x4a8048, 0x9cc874], path: [0xc8a874, 0xdcc08c, 0xa88a5c, 0xb49468, 0xe8d4a4, 0x8a7458, 0xc4b8a0],
    spk: [0xc8e488, 0x6ca456, 0x5c9650, 0x24583c, 0x94cc6c], tuft: [0x3c7c44, 0x6cac58], flowers: [0xffffff, 0xffe060, 0xc84a3c], stone: [0x44504c, 0x7c8a84, 0xaab4ac, 0xd4dcd0],
    bush: [0x1e5038, 0x2e6c48, 0x6ca456], ink: 0x10281e, trees: ['oak', 'pine', 'oak', 'pine', 'oak'], amb: 'shaft' },
  // 어스름재: 달밤
  dusk: { sky: [0x0a0e28, 0x10183e, 0x1a2656, 0x26366e, 0x344886, 0x445c98], moon: { x: 600, y: 46, r: 10 }, clouds: [0x121a40, 0x22325e, 0x4c64a0],
    m1: [0x22325e, 0x34487e, 0x2e4070], m2: [0x182448, 0x283a66, 0x22325a, 0x0e1834], hill: [0x14244a, 0x22386a, 0x0a1630], mark: 'fort',
    field: [0x2c5868, 0x285262, 0x234a5c, 0x1e4254, 0x1a3a4c, 0x163244], patch: [0x163646, 0x346676], path: [0x4c5876, 0x627090, 0x3a4462, 0x44506c, 0x7884a4, 0x343c58, 0x5c6884],
    spk: [0x4c8888, 0x1e4654, 0x2c6466, 0x0a2030, 0x5c9c94], tuft: [0x1e4c58, 0x3c7478], flowers: [0xdce8f0, 0xb8a0e0, 0x8cd0e8], stone: [0x1c2440, 0x3c4a6a, 0x5c6c8c, 0x8494b4],
    bush: [0x0e2c3a, 0x1c4450, 0x3c7478], ink: 0x060a1c, trees: ['pine', 'pine', 'pine', 'pine'], fence: [0x2a2c4c, 0x586088, 0x1a1c36], amb: 'firefly', dark: true },
  // 바위 고개: 노을 진 단풍 바윗길
  autumn: { sky: [0x4c4c94, 0x7c64a8, 0xc07ca0, 0xf09a84, 0xffbe84, 0xffdca0], sun: { x: 600, y: 56, r: 10, c: [0xfff8d8, 0xffe8a8, 0xffcc88] }, clouds: [0x9c6c98, 0xf8a88c, 0xffdcb0],
    m1: [0x9c7cac, 0xd4a0b0, 0xe8b0a8], m2: [0x8c5048, 0xc0704c, 0xd89c84, 0x6c3434], hill: [0x7c4a3c, 0xb06c48, 0x5a3028], mark: 'crag',
    field: [0xe2c272, 0xd8b064, 0xcc9e58, 0xbe8c4e, 0xae7c48, 0x9e6e44], patch: [0xa47248, 0xeed28a], path: [0xd8b88a, 0xeed4a4, 0xb49064, 0xc09c70, 0xf8e8c0, 0x947860, 0xd4c4a8],
    spk: [0xf4dc8c, 0xc89c58, 0xb08448, 0x6c4430, 0xe8c070], tuft: [0xa87c40, 0xd8b060], flowers: [0xe8642c, 0xc8402c, 0xf0b438], stone: [0x5a4448, 0x8c7c78, 0xb8aca0, 0xe0d8cc],
    bush: [0x8c3a28, 0xc85a30, 0xf0a040], ink: 0x2c1418, trees: ['maple', 'pine', 'maple', 'maple', 'pine'], amb: 'leaf', warm: true },
  // 호랑이 고개: 흐린 눈 고개 (덮어 그린 흰 칠이 아니라 처음부터 눈빛으로 굽는다)
  snow: { sky: [0x8ca4c4, 0xa4b8d2, 0xbccadc, 0xd2dce6, 0xe4eaf0, 0xf0f2f4], sun: { x: 560, y: 46, r: 8, c: [0xfdfdf8, 0xf4f6f4, 0xe6ecf0] }, clouds: [0xb0bccc, 0xe0e6ee, 0xf8fafc],
    m1: [0x9aacc4, 0xf4f8fc, 0xd0dae4], m2: [0x7c90a4, 0xe8eef4, 0xc4d0dc, 0x3c5460], hill: [0xb8c8d8, 0xf6f9fb, 0x40585c], mark: 'hut', snow: true,
    field: [0xd8e2ee, 0xe0e8f2, 0xe8eef6, 0xeef2f8, 0xf2f6fa, 0xf6f8fb], patch: [0xc8d4e6, 0xffffff], path: [0xc4bcb8, 0xd6d0cc, 0xa89c96, 0xb4aaa4, 0xe4dedA, 0x887c74, 0xcec6c2],
    spk: [0xffffff, 0xc4d0e2, 0xd0dae8, 0x7c7a66, 0xeef2f8], tuft: [0x8c8466, 0xb4a87e], flowers: [0xffffff, 0xdce6f0, 0xb8cce4], stone: [0x4c5868, 0x8090a0, 0xb4c0cc, 0xffffff],
    bush: [0x40585c, 0x6c8488, 0xf4f8fa], ink: 0x1c2a34, trees: ['snowpine', 'snowpine', 'snowpine', 'snowpine'], amb: 'snow' },
  // 옛 절터·앓는 마을: 안개 낀 새벽
  mist: { sky: [0x8c8cbc, 0xa8a0c8, 0xc4b4d0, 0xdcc8d4, 0xecd8d4, 0xf4e6dc], sun: { x: 420, y: 52, r: 9, c: [0xfff8ec, 0xfde8e0, 0xf0dcd8] }, clouds: [0xb4a8c8, 0xe8d8e0, 0xfaf0f0],
    m1: [0xb0acc8, 0xc8c0d6, 0xd8d0dc], m2: [0x8c9cb0, 0xaab4c4, 0xc8ccd4, 0x6c7c90], hill: [0x6c8c84, 0x8caa98, 0x4c6c64], mark: 'pagoda',
    field: [0xb8c4ac, 0xa8bca0, 0x98b294, 0x88a688, 0x7a9a80, 0x6c8e76], patch: [0x708e7a, 0xc6d2ba], path: [0xd4ccb8, 0xe4dcc8, 0xb8ae98, 0xc0b8a4, 0xf0e8d8, 0x9c9484, 0xd0c8b8],
    spk: [0xd8e4c8, 0x98b294, 0x88a688, 0x4c6c5c, 0xb8ccac], tuft: [0x6c8c74, 0x98b294], flowers: [0xf4f0e4, 0xd8d0e8, 0xffe8a0], stone: [0x5c6468, 0x8c9494, 0xb4bab4, 0xdcdcd4],
    bush: [0x4c6c64, 0x6c8c80, 0xa8bca8], ink: 0x24343a, haze: 0xe8e2e4, trees: ['mistpine', 'mistpine', 'mistpine', 'mistpine'], amb: 'fog' },
  // 쇠 고개: 불탄 대장간 마을의 저녁
  ember: { sky: [0x26121e, 0x401a28, 0x6c262a, 0xa03e2c, 0xd06432, 0xf09444], clouds: [0x2c1e26, 0x4c3438, 0x7c5850], noSun: true, smoke: true,
    m1: [0x4c2834, 0x6c3838, 0x8c4838], m2: [0x341c24, 0x4c2830, 0x6c3430, 0x20101c], hill: [0x2c1c20, 0x4c3028, 0x1a1014], mark: 'forge',
    field: [0x8a7254, 0x7c674c, 0x6c5c46, 0x5e5040, 0x52463a, 0x463c34], patch: [0x3a322c, 0x9c8a64], path: [0x8c7c6c, 0xa4927c, 0x6c5e52, 0x7a6c5e, 0xb8a890, 0x544a40, 0x988a7c],
    spk: [0xb09c70, 0x6c5c46, 0x5e5040, 0x2c241e, 0xa08a60], tuft: [0x5a4c38, 0x84704c], flowers: [0xff9a2e, 0xffd060, 0x8c8078], stone: [0x2c2626, 0x5c5450, 0x847c74, 0xaca49a],
    bush: [0x2c2420, 0x4c3c30, 0x7c6448], ink: 0x140c0c, trees: ['dead', 'dead', 'dead', 'dead'], amb: 'ember', warm: true },
  // 용소: 비구름 낀 날
  storm: { sky: [0x1c2834, 0x26343e, 0x34444c, 0x44545a, 0x56666a, 0x687878], clouds: [0x1a242c, 0x2c3a42, 0x4c5c64], noSun: true, overcast: true,
    m1: [0x3c4c54, 0x50606a, 0x5c6c72], m2: [0x26383c, 0x384c50, 0x4c5e60, 0x18282c], hill: [0x24383a, 0x34504c, 0x142428], mark: 'falls',
    field: [0x5c7c6c, 0x527264, 0x48685c, 0x405e54, 0x38564c, 0x304c46], patch: [0x344e48, 0x6c8c7c], path: [0x6c6c64, 0x828278, 0x56564e, 0x605e56, 0x949488, 0x46463e, 0x7c7c74],
    spk: [0x88a494, 0x527264, 0x48685c, 0x1c3430, 0x78988a], tuft: [0x2c4c44, 0x507064], flowers: [0xcfe3e6, 0x8fd3e8, 0xffffff], stone: [0x22302e, 0x4c5a58, 0x6c7a78, 0x94a2a0],
    bush: [0x1c3430, 0x2c4c44, 0x507064], ink: 0x0c1418, trees: ['pine', 'pine', 'pine', 'pine'], amb: 'rain', water: 0x7c98a4, wet: true },
  // 황천길·저승 문: 보랏빛 어둠과 푸른 넋불
  under: { sky: [0x0e0818, 0x1c0e2c, 0x2c1640, 0x3c2052, 0x4c2c60, 0x5c3c6c], moon: { x: 560, y: 44, r: 9, ghost: true }, clouds: [0x1c1030, 0x3c2454, 0x6c4c84],
    m1: [0x2c1c44, 0x44306a, 0x3c2c58], m2: [0x1c1230, 0x2c1e48, 0x342850, 0x120a20], hill: [0x1a1028, 0x2c1e40, 0x0e0818], mark: 'lights',
    field: [0x3c3458, 0x363050, 0x302a4a, 0x2a2644, 0x24223e, 0x1e1e38], patch: [0x1c1a34, 0x4c4470], path: [0x8c86a4, 0xaca6c4, 0x6c6688, 0x7a7496, 0xc8c4dc, 0x524c6c, 0x9c96b4],
    spk: [0x6c7c9c, 0x363050, 0x302a4a, 0x14122a, 0x5c6c94], tuft: [0x2c3c5c, 0x4c6488], flowers: [0x9cd8e0, 0xc8b8f0, 0xffffff], stone: [0x1c1830, 0x4c4668, 0x7c7698, 0xb4aed0],
    bush: [0x16122a, 0x2c2648, 0x4c6488], ink: 0x08040e, trees: ['ghost', 'ghost', 'ghost', 'ghost'], amb: 'soul', dark: true },
};
const themeOf = id => TM[id] || TM.pass;
// 하늘이 바뀌면: 밤은 푸르게 어둡히되 불빛은 그대로, 비는 잿빛으로 가라앉힌다
const EMIT = new Set([0xff8a2c, 0xff9a2e, 0xffd060, 0xffd88c, 0xff9a3c, 0x9ce8f0]);   // 밤에도 그대로 빛나는 것: 불티·창불·넋등
const keepLight = c => EMIT.has(c);
const night = c => { if (keepLight(c)) return c; const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; return (Math.min(255, Math.round(r * 0.42 + 8)) << 16) | (Math.min(255, Math.round(g * 0.5 + 14)) << 8) | Math.min(255, Math.round(b * 0.7 + 40)); };
const darker = c => (keepLight(c) ? c : mixc(c, 0x060818, 0.28));
const rainy = c => { if (keepLight(c)) return c; const L = lum(c) * 255, gr = (L << 16) | (L << 8) | L; const m = mixc(c, gr | 0, 0.5); return mixc(m, 0x1c2c3c, 0.3); };
function toneOf(T, sky) {
  if (sky === 'night' && T.snow) return c => mixc(c, 0x26346a, 0.5);
  if (sky === 'night') return T.dark ? darker : T.warm && T.mark === 'forge' ? c => (keepLight(c) ? c : mixc(c, 0x12060a, 0.5)) : T.overcast ? c => mixc(night(c), 0x0a1020, 0.1) : night;
  if (sky === 'rain') return T.overcast ? null : T.dark ? c => mixc(rainy(c), 0x060818, 0.35) : rainy;
  return null;
}
function retone(s, fn) { if (!fn) return s; const memo = new Map(); for (let i = 0; i < s.d.length; i++) { const c = s.d[i]; if (c === -1) continue; let v = memo.get(c); if (v === undefined) memo.set(c, v = fn(c)); s.d[i] = v; } return s; }

const copyS = b => { const s = new Spr(b.w, b.h, b.ox, b.oy); s.d.set(b.d); return s; };
const BASE = new Map();
const based = (k, fn) => { let v = BASE.get(k); if (!v) BASE.set(k, v = fn()); return v; };
// ───────── 먼 하늘과 산 (주기 960, 0.25 배로 흐른다) ─────────
function cloudP(s, cx, cy, w, cols, seed) {
  const R = rng(seed), t = new Spr(s.w, s.h);
  for (let k = 0; k < w / 5; k++) { const x = cx + (R() - 0.5) * w, r = 2 + R() * 6 * (1 - Math.abs(x - cx) / w * 1.6); if (r < 1) continue; well(t, x, cy - r * 0.6, r * 1.8, Math.max(2, r), 1); }
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (t.get(x, y) === -1 || y > cy) continue; s.set(x, y, t.get(x, y - 1) === -1 || t.get(x, y - 2) === -1 ? cols[2] : y >= cy - 1 ? cols[0] : (y >= cy - 3 && bayer(x, y) > 0.5) ? cols[0] : cols[1]); }
}
function mtn(s, base, amp, k, ph, col, lit, haze, yEnd, o = {}) {
  const P = s.w, R = rng((ph * 1000) | 0 || 7), mist = o.mist || 12;
  for (let x = 0; x < P; x++) {
    const r0 = pridge(x, P, base, amp, k, ph), y0 = Math.round(r0), up = pridge(x + 1, P, base, amp, k, ph) < r0 - 0.05;
    const cap = o.cap ? Math.max(0, (base - amp * 0.15 - r0) * 0.55 + 1 + sw(x, P, 37, ph) * 1.5) : 0;
    for (let y = y0; y < yEnd; y++) {
      const d = y - y0; let c = col;
      if (up && d < 6 && bayer(x, y) > d / 6) c = lit; else if (!up && d < 2 && bayer(x, y) > 0.7) c = lit;
      if (d < cap) c = up || bayer(x, y) > 0.35 ? o.cap : lit;
      const hz = (y - (yEnd - mist)) / mist; if (hz > 0 && bayer(x, y) < hz) c = haze;
      s.set(x, y, c);
    }
    if (o.trees && R() < o.trees) { const h = 2 + ((R() * 3) | 0); for (let q = 0; q < h; q++) for (let dx = -(q >> 1); dx <= q >> 1; dx++) wset(s, x + dx, y0 - h + q + 1, o.treeCol); if (o.cap && R() < 0.6) wset(s, x, y0 - h + 1, o.cap); }
  }
}
function sunDisc(s, sun) { const { x: sx, y: sy, r, c } = sun; for (let y = sy - r - 16; y < sy + r + 16; y++) for (let x = sx - r - 16; x < sx + r + 16; x++) { const d = Math.hypot(x - sx, y - sy); if (d < r) wset(s, x, y, c[0]); else if (d < r + 3) wset(s, x, y, c[1]); else if (d < r + 14 && bayer(wx(x, s.w), y) > (d - r - 3) / 11) wset(s, x, y, c[2]); } }
function moonDisc(s, m) {
  const { x: sx, y: sy, r } = m, C = m.ghost ? [0xd8f0ec, 0xa8d8d4, 0x6c8ca0, 0x4c6478] : [0xfffadc, 0xfff0b0, 0x6c84c0, 0xe8dca0];
  for (let y = sy - r - 14; y < sy + r + 14; y++) for (let x = sx - r - 14; x < sx + r + 14; x++) { const d = Math.hypot(x - sx, y - sy); if (d < r) { if (m.ghost && Math.hypot(x - sx - 4, y - sy + 2) < r - 1) continue; wset(s, x, y, !m.ghost && (Math.hypot(x - sx + 4, y - sy + 3) < 3 || Math.hypot(x - sx - 4, y - sy - 4) < 2) ? C[3] : C[0]); } else if (d < r + 2) wset(s, x, y, C[1]); else if (d < r + 12 && bayer(wx(x, s.w), y) > 0.35 + (d - r - 2) / 14) wset(s, x, y, C[2]); }
}
function stars(s, seed, n, y1, col) { const R = rng(seed); for (let i = 0; i < n; i++) { const x = (R() * s.w) | 0, y = 2 + ((R() * (y1 - 2)) | 0); s.set(x, y, R() < 0.3 ? col[0] : col[1]); if (R() < 0.08) { s.set(x - 1, y, col[1]); s.set(x + 1, y, col[1]); s.set(x, y - 1, col[1]); s.set(x, y + 1, col[1]); } } }
// 비구름: 하늘을 덮는 겹겹의 먹구름 (아래 끝이 물결친다)
function cloudBank(s, cols, y1) {
  const P = s.w;
  for (let x = 0; x < P; x++) { const e = y1 + 4 * sw(x, P, 9, 1) + 3 * sw(x, P, 23, 2) + 5 * Math.abs(sw(x, P, 4, 0.6)); for (let y = 0; y < e; y++) { const d = e - y, n = sw(x, P, 14, y * 0.18) + sw(x, P, 31, 2 - y * 0.11);
    s.set(x, y, d < 2 ? cols[0] : d < 9 && bayer(x, y) > d / 9 ? cols[0] : n > 1 ? cols[2] : n > 0.55 && bayer(x, y) > 0.5 ? cols[2] : cols[1]); } }
}
function smokeCols(s, cols, seed) { const R = rng(seed), P = s.w; for (let i = 0; i < 4; i++) { const x0 = (i + 0.3 + R() * 0.4) * P / 4; for (let y = 70; y > 0; y--) { const t = (70 - y) / 70, cx = x0 + t * t * 60 + Math.sin(y * 0.15 + i) * 3, rw = 3 + t * 16; for (let x = Math.round(cx - rw); x <= cx + rw; x++) { const d = Math.abs(x - cx) / rw; if (d < 0.7 || bayer(wx(x, P), y) > (d - 0.7) / 0.3) wset(s, x, y, d < 0.35 && bayer(wx(x, P), y) > 0.5 ? cols[2] : cols[1]); } } } }
function bakeFar(T, sky) {
  const s = new Spr(FAR_P, FAR_H), R = rng(11), dark = sky === 'rain' && !T.overcast;
  s.vgrad(0, 0, FAR_P, FAR_H, T.sky);
  if (sky === 'day' && T.sun && !T.noSun) sunDisc(s, T.sun);
  if (!T.overcast && sky !== 'rain') for (let k = 0; k < 6; k++) cloudP(s, k * FAR_P / 6 + R() * 70, 36 + R() * 14, 50 + R() * 70, T.clouds, 31 + k);
  if (T.smoke) smokeCols(s, T.clouds, 5);
  mtn(s, 52, 11, 3, 1.3, T.m1[0], T.m1[1], T.m1[2], FAR_H, { mist: 12, cap: T.snow ? 0xf8fbfd : 0 });
  mtn(s, 62, 6, 5, 4.1, T.m2[0], T.m2[1], T.m2[2], FAR_H, { mist: 9, trees: 0.14, treeCol: T.m2[3], cap: T.snow ? 0xf0f4f8 : 0 });
  if (T.haze) for (let y = 40; y < FAR_H; y++) for (let x = 0; x < FAR_P; x++) if (bayer(x, y) < (y - 40) / 44 * 0.85) s.set(x, y, T.haze);
  retone(s, toneOf(T, sky));
  // 바꾼 뒤에 얹는 것: 달·별·비구름
  const moonT = T.moon && sky !== 'rain', moonN = sky === 'night' && !T.overcast && !T.moon;
  if (moonT || moonN) { stars(s, 4, 90, 56, T.moon && T.moon.ghost ? [0xc8f0ec, 0x5c6c9c] : [0xfff6c8, 0x7c8cc8]); moonDisc(s, T.moon || { x: 600, y: 46, r: 10 }); }
  if (T.overcast || dark) cloudBank(s, T.overcast ? T.clouds : sky === 'rain' ? [0x3c4654, 0x4e5a68, 0x66707c] : T.clouds, 40);
  if (T.overcast && sky === 'night') retone(s, c => mixc(c, 0x060a18, 0.3));
  return s;
}

// ───────── 가까운 언덕과 마을 (주기 1280, 0.5 배) ─────────
// 지붕 그리는 도구: 한옥 기와지붕 (가운데가 처지고 끝이 살짝 들린다)
function giwa(s, cx, y, hw, col, dk) { for (let k = 0; k < 4; k++) { const w = hw - k * 2; for (let x = -w; x <= w; x++) wset(s, cx + x, y - k + (Math.abs(x) > w - 2 ? -1 : 0), k === 0 ? dk : col); } wset(s, cx - hw - 1, y - 2, dk); wset(s, cx + hw + 1, y - 2, dk); }
function choga(s, cx, y, w, h, wall, roof, roofD, door, snow) {   // 초가: 둥근 볏짚 지붕
  for (let yy = y - h + 4; yy <= y; yy++) for (let x = -w + 2; x <= w - 2; x++) wset(s, cx + x, yy, wall);
  for (let yy = y - h + 6; yy <= y; yy++) { wset(s, cx - 2, yy, door); wset(s, cx - 1, yy, door); }
  const top = y - h; for (let k = 0; k < 7; k++) { const rw = w + 2 - Math.round(Math.pow(k / 6, 2) * (w - 1)); for (let x = -rw; x <= rw; x++) wset(s, cx + x, top + 6 - k, k === 0 ? roofD : snow && k > 3 ? snow : (x + k) % 3 === 0 ? roofD : roof); }
}
function bakeBackBase(T) {
  const s = new Spr(BACK_P, BACK_H), P = BACK_P, H = T.hill, R = rng(23), lights = [];
  const base = 27;
  if (T.mark === 'forest') {   // 숲: 둥근 나무 머리가 빽빽한 숲 벽
    for (let i = 0; i < 260; i++) { const x = (i / 260) * P + R() * 4, y = 14 + R() * 10 + 4 * sw(x, P, 5, 1); const r = 4 + R() * 4; blobAt(s, x, y, r * 1.2, r, H[0], H[1], H[2]); }
    for (let x = 0; x < P; x++) for (let y = 24 + Math.round(3 * sw(x, P, 7)); y < BACK_H; y++) s.set(x, y, bayer(x, y) > 0.5 ? H[2] : H[0]);
  } else {
    for (let x = 0; x < P; x++) { const r0 = pridge(x, P, base - 4, 5, 4, 2.2), y0 = Math.round(r0), up = pridge(x + 1, P, base - 4, 5, 4, 2.2) < r0;
      for (let y = y0; y < BACK_H; y++) { const d = y - y0; s.set(x, y, T.snow && d < 2 ? 0xf6f9fb : up && d < 4 && bayer(x, y) > d / 4 ? H[1] : H[0]); }
      if (R() < (T.mark === 'crag' ? 0.06 : 0.3)) { const h = 2 + ((R() * 4) | 0); for (let q = 0; q < h; q++) for (let dx = -(q >> 1); dx <= q >> 1; dx++) wset(s, x + dx, y0 - h + q + 1, H[2]); if (T.snow) wset(s, x, y0 - h + 1, 0xf6f9fb); }
    }
  }
  // 고개의 표지 하나 (주기마다 한 번)
  const mx = 420, my = base + 2;
  if (T.mark === 'fort') {   // 성곽과 문루
    const Wc = T.dark ? [0x8c94b8, 0x343c64, 0x5c6890, 0x7480a8, 0x505c84, 0x10142c, 0x141a38, 0x2c3864, 0x9a3a3c, 0x5a2030] : [0xf4ecd8, 0x9098a8, 0xc8c8c4, 0xe0dccc, 0xb8b8b8, 0x3a4468, 0x3c4870, 0x586890, 0xb84848, 0x6c2838];
    for (let x = mx - 70; x < mx + 80; x++) { const top = my - 4 + Math.round(Math.sin(x * 0.05) * 1.5); for (let y = top; y < top + 8; y++) wset(s, x, y, y === top ? Wc[0] : (x + y) % 5 === 0 ? Wc[1] : Wc[2]); if (x % 4 < 2) wset(s, x, top - 1, Wc[3]); }
    for (let y = my - 14; y < my + 2; y++) for (let x = mx - 9; x < mx + 13; x++) wset(s, x, y, Wc[4]);
    for (let y = my - 9; y < my + 3; y++) for (let x = mx - 1; x < mx + 6; x++) wset(s, x, y, Wc[5]);
    for (const [ry, hw] of [[my - 16, 18], [my - 23, 13]]) giwa(s, mx + 2, ry, hw, Wc[7], Wc[6]);
    for (let y = my - 22; y < my - 17; y++) for (let x = mx - 4; x < mx + 9; x++) wset(s, x, y, (x - mx) % 3 === 0 ? Wc[9] : Wc[8]);
    lights.push([mx + 1, my - 5], [mx + 4, my - 5], [mx - 30, my - 1], [mx + 40, my - 1]);
  } else if (T.mark === 'pagoda') {   // 옛 절터: 삼층 석탑과 무너진 돌담
    const st = [0xd8d4d0, 0xa8a4a8, 0x7c7884, 0x5c5864];
    for (let k = 0; k < 3; k++) { const yb = my - 2 - k * 8, bw = 5 - k; for (let y = yb - 5; y <= yb; y++) for (let x = -bw; x <= bw; x++) wset(s, mx + x, y, x < 0 ? st[1] : st[2]); for (let x = -bw - 4; x <= bw + 4; x++) { wset(s, mx + x, yb - 6, st[0]); wset(s, mx + x, yb - 7 + (Math.abs(x) > bw + 2 ? -1 : 0), st[3]); } }
    for (let y = my - 34; y < my - 26; y++) wset(s, mx, y, st[3]); wset(s, mx - 1, my - 30, st[3]); wset(s, mx + 1, my - 30, st[3]);
    for (let y = my - 2; y <= my + 2; y++) for (let x = -9; x <= 9; x++) wset(s, mx + x, y, st[1]);
    for (let x = mx + 40; x < mx + 120; x++) { const h = 3 + ((x * 7) % 5 === 0 ? 1 : 0) - (x > mx + 90 ? Math.round((x - mx - 90) / 10) : 0); for (let y = my + 1 - h; y <= my + 1; y++) wset(s, x, y, (x + y) % 4 === 0 ? st[2] : st[1]); }
    giwa(s, mx - 60, my - 4, 12, 0x6c7488, 0x4c5468); for (let y = my - 3; y <= my + 1; y++) for (let x = -9; x <= 9; x++) wset(s, mx - 60 + x, y, x % 6 === 0 ? 0x6c5848 : 0xc8bca8);
  } else if (T.mark === 'hut') {   // 눈 덮인 초가 마을
    for (const [dx, w, h] of [[-40, 11, 13], [0, 13, 15], [46, 10, 12], [210, 11, 13], [250, 9, 11]]) { choga(s, mx + dx, my + 1, w, h, 0xb8a080, 0xf4f8fa, 0x7c8c9c, 0x3c2c28, 0xffffff); lights.push([mx + dx - 2, my - 4], [mx + dx + 4, my - 4]); }
    for (let x = mx - 60; x < mx + 70; x++) if (x % 5 !== 0) { wset(s, x, my + 1, 0x8c6c50); if (x % 2) wset(s, x, my, 0xffffff); }
  } else if (T.mark === 'forge') {   // 불탄 대장간 마을: 초가 지붕 몇 채, 붉은 화덕 빛
    for (const [dx, w, h] of [[-50, 10, 12], [-12, 13, 15], [30, 11, 13], [180, 12, 14], [230, 9, 11]]) { choga(s, mx + dx, my + 1, w, h, 0x4c3a30, 0x5c4430, 0x3a2a20, 0x1a1010, 0); lights.push([mx + dx - 2, my - 3], [mx + dx - 1, my - 3], [mx + dx + 4, my - 4]); }
    for (const dx of [-12, 180]) for (let y = my - 22; y < my - 12; y++) { wset(s, mx + dx + 6, y, 0x2c2020); wset(s, mx + dx + 7, y, 0x3c2c28); }
  } else if (T.mark === 'crag') {   // 단풍 든 바위 봉우리: 넓고 들쭉날쭉한 바위, 틈마다 붉은 단풍
    for (const [dx, w, h] of [[-34, 18, 22], [-6, 14, 30], [20, 16, 19], [196, 15, 21], [222, 11, 14]]) { const cx = mx + dx;
      for (let y = my - h; y <= my + 4; y++) { const t = (y - (my - h)) / h, hw = Math.round(w * (0.22 + 0.78 * Math.sqrt(t)) * (1 + 0.12 * Math.sin(y * 1.3 + dx))), sh = Math.round(hw * 0.25 * Math.sin(y * 0.7 + dx));
        for (let x = -hw; x <= hw; x++) { const f = (x - sh) / hw; wset(s, cx + x, y, f < -0.55 ? 0xc8a490 : f > 0.35 ? 0x5c4044 : (y * 3 + x) % 11 === 0 ? 0x6c4c48 : 0x8c6a60); }
        if (y % 6 === 0) for (let x = -hw + 2; x < 0; x++) wset(s, cx + x, y, 0x6c4c48); }
      for (let k = 0; k < 10; k++) { const x = cx + Math.round((R() - 0.5) * w * 1.4), y = my - Math.round(R() * h * 0.8); wset(s, x, y, 0xe8602c); wset(s, x + 1, y, 0xc8402c); wset(s, x, y - 1, 0xf0a040); wset(s, x - 1, y, 0xb83424); } }
  } else if (T.mark === 'falls') {   // 용소: 절벽에서 떨어지는 폭포와 물보라
    const cx = mx; for (let y = 2; y <= my + 6; y++) { const hw = 26 + Math.round(y * 0.4); for (let x = -hw; x <= hw; x++) { if (Math.abs(x) < 5) continue; wset(s, cx + x, y, x < 0 ? (x < -hw + 3 ? 0x50606a : 0x34444c) : (x > hw - 3 ? 0x1c282c : 0x26343a)); } }
    for (let y = 2; y <= my + 4; y++) for (let x = -4; x <= 4; x++) wset(s, cx + x, y, (y * 3 + x * 5 + 40) % 7 < 2 ? 0x9cb8c4 : Math.abs(x) > 2 ? 0xc8dce4 : 0xeef6f8);
    for (let k = 0; k < 40; k++) { const x = cx + Math.round((R() - 0.5) * 30), y = my + 2 + Math.round(R() * 6); wset(s, x, y, R() < 0.5 ? 0xeef6f8 : 0xb8ccd4); }
  } else if (T.mark === 'lights') {   // 저승: 들쭉날쭉한 검은 바위와 능선 따라 늘어선 넋등
    for (const [dx, w, h] of [[-60, 8, 22], [-44, 6, 30], [-30, 9, 18], [150, 7, 26], [166, 9, 20], [300, 6, 24]]) { const cx = mx + dx; for (let y = my - h; y <= my + 4; y++) { const t = (y - (my - h)) / h, hw = Math.max(1, Math.round(w * t)); for (let x = -hw; x <= hw; x++) wset(s, cx + x, y, x < -hw + 2 ? 0x3c2c58 : 0x1a1028); } }
    for (let i = 0; i < 18; i++) { const x = mx - 200 + i * 26, y = Math.round(pridge(wx(x, P), P, base - 4, 5, 4, 2.2)) - 2; wset(s, x, y + 1, 0x2c1e40); lights.push([x, y - 1], [x, y]); }
  }
  // 아래 끝은 들판 먼 빛깔로 녹인다
  for (let y = BACK_H - 14; y < BACK_H; y++) for (let x = 0; x < P; x++) if (bayer(x, y) < (y - (BACK_H - 14)) / 10) s.set(x, y, T.field[0]);
  if (T.haze) for (let y = 0; y < BACK_H; y++) for (let x = 0; x < P; x++) if (s.get(x, y) !== -1 && bayer(x + 1, y + 2) < 0.38 - y / BACK_H * 0.2) s.set(x, y, T.haze);
  return { s, lights };
}
function bakeBack(T, theme, sky) {
  const b = based('b:' + theme, () => bakeBackBase(T)), s = copyS(b.s), lights = b.lights;
  retone(s, toneOf(T, sky));
  const lit = sky === 'night' || T.dark || T.mark === 'forge';
  if (lit) for (const [x, y] of lights) { const c = T.mark === 'lights' ? 0x9ce8f0 : T.mark === 'forge' ? 0xff9a3c : 0xffd88c; wset(s, x, y, c); }
  return s;
}

// ───────── 들판 (주기 1280, 1 배). 인형들이 서는 곳: 너무 어지럽지 않게 ─────────
function tuft(c0, c1, k, dry) { const s = new Spr(9, 7, 4, 6); for (const [x, y0] of [[1, 3], [3, 1], [4, 0], [6, 2], [7, 4]]) s.vl(x, y0, 6, c0); s.set(4, 0, c1); s.set(3, 1, c1); if (dry) { s.set(1, 3, c1); s.set(7, 4, c1); } return s; }
function rockS(w, st, cap) { const s = new Spr(w + 4, w, (w + 4) >> 1, w - 2); blob(s, t => { t.ell(w / 2 + 1, w * 0.62, w / 2, w * 0.34, 1); t.ell(w * 0.4, w * 0.5, w * 0.3, w * 0.3, 1); }, st[1], st[2], st[0]); s.set((w * 0.4) | 0, (w * 0.4) | 0, st[3]); if (cap) for (let x = 0; x < s.w; x++) for (let y = 0; y < s.h; y++) if (s.get(x, y) !== -1) { s.set(x, y, cap); if (s.get(x, y + 1) !== -1) s.set(x, y + 1, x % 3 ? cap : st[2]); break; } return s.outline(st[0]); }
// 길 한가운데 줄 (화면 MID_Y 341 → 논리 170 → 들판 안에서 106 언저리)
const PCY = new Float32Array(GROUND_P), PHW = new Float32Array(GROUND_P); for (let x = 0; x < GROUND_P; x++) { PCY[x] = 104 + 7 * sw(x, GROUND_P, 2, 0.5) + 3 * sw(x, GROUND_P, 5, 1.3); PHW[x] = 15 + 2.5 * sw(x, GROUND_P, 9, 0.2); }
const pathCY = x => PCY[wx(x, GROUND_P)], pathHW = x => PHW[wx(x, GROUND_P)];
function bakeGroundBase(T) {
  const s = new Spr(GROUND_P, GROUND_H), P = GROUND_P, R = rng(41), PT = T.path, F = T.field;
  // 위 끝: 덤불 줄 (그 위는 비워 뒷겹이 보인다)
  const edge = x => 4 + Math.round(1.5 * sw(x, P, 13, 0.3) + sw(x, P, 41, 1));
  for (let x = 0; x < P; x++) for (let y = edge(x); y < GROUND_H; y++) s.set(x, y, F[0]);
  s.vgrad(0, 6, P, 214, F); for (let x = 0; x < P; x++) { for (let y = edge(x); y < 6; y++) s.set(x, y, F[0]); for (let y = 220; y < GROUND_H; y++) s.set(x, y, F[5]); }
  // 덤불 (위 끝을 따라)
  for (let x = -4; x < P; x += 6 + ((R() * 7) | 0)) { const r = 3 + R() * 3.5, y = edge(wx(x, P)) + 1; blobAt(s, x, y, r * 1.4, r, T.bush[0], T.bush[1], T.bush[0]); for (let k = 0; k < 2; k++) wset(s, x + ((R() - 0.5) * r * 2) | 0, y - ((R() * r) | 0), T.bush[2]); }
  if (T.fence) { for (let x = 6; x < P; x += 22) for (let y = 3; y < 13; y++) { s.set(x, y, T.fence[0]); s.set(x + 1, y, y === 3 ? T.fence[2] : T.fence[1]); } for (const y of [5, 9]) for (let x = 0; x < P; x++) s.set(x, y + (sw(x, P, 128, 0) > 0.8 ? 1 : 0), x % 22 < 9 ? T.fence[1] : T.fence[0]); }
  // 풀빛 얼룩: 가로로 길쭉한 큰 덩이를 반만 덮는 점무늬로 (들판 빛에서 한 걸음만 벗어난 빛깔)
  const pd = mixc(F[4], T.ink, T.snow ? 0.1 : 0.14), pl = mixc(F[1], 0xffffff, T.snow ? 0.6 : 0.14);
  const A = new Float32Array(P), B2 = new Float32Array(P); for (let x = 0; x < P; x++) { A[x] = 0.65 * sw(x, P, 5, 0.7); B2[x] = 0.35 * sw(x, P, 11, 2.1); }
  for (let y = 8; y < 220; y++) { const ya = Math.sin(y * 0.105 + 1.3), yb = Math.sin(y * 0.17 + 0.4); for (let x = 0; x < P; x++) { const n = A[x] * ya + B2[x] * yb;
    if (n > 0.3) { if (bayer(x, y) < Math.min(0.5, (n - 0.3) * 2.4)) s.set(x, y, pd); } else if (n < -0.34) { if (bayer(x + 2, y) < Math.min(0.5, (-0.34 - n) * 2.4)) s.set(x, y, pl); } } }
  // 흙길 (눈 고개는 다져진 눈길, 저승은 디딤돌 길)
  const isPath = c => c === PT[0] || c === PT[1] || c === PT[2] || c === PT[3] || c === PT[4];
  for (let x = 0; x < P; x++) { const cy = pathCY(x), hw = pathHW(x); for (let y = Math.round(cy - hw - 3); y < cy + hw + 3; y++) { const d = Math.abs(y - cy) / hw; if (d < 0.8 || bayer(x, y) > (d - 0.8) / 0.3) s.set(x, y, d < 0.45 && bayer(x + 1, y) > 0.55 ? PT[1] : y > cy + hw * 0.5 ? PT[2] : PT[0]); }
    if (x % 3) for (const off of [-6, 5]) s.set(x, Math.round(cy + off + sw(x, P, 101, 0) * 1.2), PT[2]); }
  if (T.mark === 'lights') for (let i = 0; i < 70; i++) { const x = (i + 0.5) * P / 70 + (R() - 0.5) * 6, cy = pathCY(wx(x, P)) + (R() - 0.5) * 16, rw = 4 + R() * 3; blobAt(s, x, cy, rw, rw * 0.45, PT[1], PT[4], PT[5]); }
  // 자잘한 결: 풀잎 끝, 길의 자갈
  const spk = T.spk;
  for (let i = 0; i < (T.snow ? 900 : 2600); i++) { const x = (R() * P) | 0, y = 8 + ((R() * 214) | 0), c0 = s.get(x, y); if (isPath(c0)) { if (R() < 0.3) s.hl(x, Math.min(P - 1, x + 1 + ((R() * 3) | 0)), y, R() < 0.5 ? PT[3] : PT[4]); continue; } const up = y < 70; s.set(x, y, R() < 0.5 ? (up ? spk[0] : spk[2]) : (up ? spk[1] : spk[3])); if (R() < 0.4) s.set(x, y - 1, up ? spk[0] : spk[4]); }
  for (let i = 0; i < 60; i++) { const x = (R() * P) | 0, y = 12 + ((R() * 206) | 0); if (isPath(s.get(x, y))) { s.hl(x, Math.min(P - 1, x + 2), y, PT[5]); s.set(x + 1, y - 1, PT[6]); } }
  // 풀포기 (가까울수록 많이)
  const tf = [0, 1, 2].map(k => tuft(T.tuft[0], T.tuft[1], k, T.snow || T.mark === 'forge'));
  for (let i = 0; i < (T.snow ? 60 : 230); i++) { const y = (T.snow ? 90 : 10) + Math.round(Math.sqrt(R()) * (T.snow ? 128 : 208)), x = R() * P; if (isPath(s.get(wx(x, P), y))) continue; wblit(s, tf[i % 3], x, y); }
  // 꽃·낙엽·불티·별꽃 무리
  for (let k = 0; k < 26; k++) { const fx = R() * P, fy = 20 + R() * 196; for (let q = 0; q < 10; q++) { const x = fx + (R() - 0.5) * 30, y = Math.round(fy + (R() - 0.5) * 12); if (isPath(s.get(wx(x, P), y))) continue; const col = T.flowers[(k + q) % 3]; wset(s, x, y, col); if (!T.snow) wset(s, x, y + 1, spk[3]); if (q % 3 === 0) wset(s, x + 1, y, mixc(col, 0xffffff, 0.4)); } }
  if (T.amb === 'leaf') for (let i = 0; i < 520; i++) { const x = R() * P, y = 10 + ((R() * 210) | 0); const c = T.flowers[i % 3]; wset(s, x, y, c); if (i % 2) wset(s, x + 1, y, mixc(c, 0x5a2020, 0.3)); }
  if (T.mark === 'forge') for (let i = 0; i < 40; i++) { const x = R() * P, y = 14 + R() * 200, r = 4 + R() * 7; for (let yy = -r * 0.45; yy < r * 0.45; yy++) for (let xx = -r; xx < r; xx++) if ((xx / r) ** 2 + (yy / (r * 0.45)) ** 2 < 1 && bayer(wx(x + xx, P), Math.round(y + yy)) < 0.6) wset(s, x + xx, Math.round(y + yy), (xx + yy) % 5 === 0 ? 0x6c5c50 : 0x2c2420); if (i % 3 === 0) wset(s, x, y, 0xff8a2c); }
  if (T.snow) { const sh = mixc(F[2], 0x5c7494, 0.32), sh2 = mixc(F[2], 0x5c7494, 0.16);
    for (let i = 0; i < 46; i++) { const y0 = 12 + (i % 14) * 15 + R() * 8, amp = 1.5 + R() * 2.5, k1 = 2 + ((R() * 5) | 0), ph = R() * 6, x0 = R() * P, len = 90 + R() * 240;
      for (let t = 0; t < len; t++) { const x = wx(x0 + t, P), y = Math.round(y0 + amp * sw(x, P, k1, ph)), fade = Math.min(t, len - t) / 30; if (isPath(s.get(x, y))) continue;
        s.set(x, y, 0xffffff); if (fade > 0.3 || bayer(x, y) < fade) { s.set(x, y + 1, sh); if (bayer(x, y + 2) < 0.6) s.set(x, y + 2, sh2); if (bayer(x, y + 3) < 0.25) s.set(x, y + 3, sh2); } } }
    for (let i = 0; i < 90; i++) { const x = (R() * P) | 0, cy = pathCY(x) + (R() - 0.5) * 12, y = Math.round(cy); if (isPath(s.get(x, y))) { s.set(x, y, PT[2]); s.set(x + 2, y + 1, PT[2]); } } }
  // 바위
  for (let i = 0; i < 9; i++) { const w = 8 + ((R() * 9) | 0), x = (i + R() * 0.6) * P / 9, y = 18 + R() * 196; if (isPath(s.get(wx(x, P), Math.round(y)))) continue; wblit(s, rockS(w, T.stone, T.snow ? 0xffffff : 0), x, y); }
  // 맨 아래: 가까운 풀 그림자 (아래 패 띠에 거의 가린다)
  const D = mixc(F[5], T.ink, 0.45);
  for (let x = 0; x < P; x++) { const h = Math.round(4 + 3 * sw(x, P, 37, 1) + 2 * sw(x, P, 91, 2)) + ((x * 7) % 5 === 0 ? 3 : 0); for (let y = 222 - h; y < GROUND_H; y++) s.set(x, y, y < 222 - h + 1 && x % 2 ? F[5] : D); }
  return s;
}
function bakeGround(T, theme, sky) {
  const s = copyS(based('g:' + theme, () => bakeGroundBase(T))), P = GROUND_P, R = rng(77);
  // 물웅덩이 (비 오는 날·용소)
  if (T.wet || sky === 'rain') { const W = T.water || 0x8ca0b8; for (let i = 0; i < 12; i++) { const x = (i + 0.5) * P / 12 + (R() - 0.5) * 40, cy = pathCY(wx(x, P)) + (R() - 0.5) * 14, rw = 6 + R() * 8; well(s, x, cy, rw, rw * 0.32, mixc(W, 0x1c2c3c, 0.25)); well(s, x, cy - 0.5, rw - 1.5, rw * 0.22, W); for (let k = 0; k < rw - 3; k++) wset(s, x - rw + 3 + k, Math.round(cy - rw * 0.15), 0xd8e8f0); } }
  return retone(s, toneOf(T, sky));
}

// ───────── 큰 나무 (인형들과 앞뒤를 맞춘다) ─────────
function pineT(seed, leaf, trunk, ink, snow) {
  const R = rng(seed), s = new Spr(72, 74, 35, 70);
  const br = (x0, y0, x1, y1, th) => s.line(x0, y0, x1, y1, trunk[0], th);
  br(35, 69, 33, 48, 4); br(33, 48, 39, 33, 3); br(39, 33, 35, 20, 3); br(34, 50, 20, 40, 2); br(38, 37, 52, 31, 2); br(36, 26, 26, 22, 1);
  s.vl(34, 52, 67, trunk[1]); s.set(37, 41, trunk[1]); s.set(36, 27, trunk[1]);
  for (const [cx, cy, rx, ry] of [[18, 38, 13, 5], [54, 29, 13, 5], [35, 16, 17, 6], [24, 24, 11, 4], [48, 19, 9, 4]]) {
    blob(s, t => { t.ell(cx, cy, rx, ry, 1); t.ell(cx - rx * 0.4, cy - 1, rx * 0.5, ry * 0.85, 1); }, leaf[1], leaf[2], leaf[0], 2);
    for (let k = 0; k < rx * 1.3; k++) { const x = Math.round(cx - rx + R() * rx * 2), y = Math.round(cy - ry + R() * ry); if (s.get(x, y) !== -1 && s.get(x, y - 1) !== -1) s.set(x, y, leaf[R() < 0.5 ? 3 : 2]); }
    if (snow) for (let x = Math.round(cx - rx); x <= cx + rx; x++) for (let y = Math.round(cy - ry - 1); y < cy + ry; y++) if (s.get(x, y) !== -1) { s.set(x, y, snow[0]); if (s.get(x, y + 1) !== -1 && (x + y) % 3) s.set(x, y + 1, snow[1]); break; }
  }
  return s.outline(ink);
}
function oakT(seed, leaf, trunk, ink) {   // 당산나무: 굵은 밑동, 넓고 둥근 머리
  const R = rng(seed), s = new Spr(84, 78, 41, 74);
  for (let y = 44; y < 74; y++) { const hw = 3 + (y > 66 ? (y - 66) * 0.8 : 0); for (let x = -hw; x <= hw; x++) s.set(41 + Math.round(x), y, x < -hw + 1.5 ? trunk[1] : trunk[0]); }
  s.line(40, 50, 26, 36, trunk[0], 2); s.line(43, 48, 58, 34, trunk[0], 2);
  for (const [cx, cy, r] of [[41, 26, 18], [22, 34, 13], [60, 32, 14], [30, 18, 12], [53, 17, 12], [41, 40, 12]]) blob(s, t => t.ell(cx, cy, r, r * 0.78, 1), leaf[1], leaf[2], leaf[0], 2);
  for (let k = 0; k < 110; k++) { const x = (R() * 84) | 0, y = (R() * 56) | 0; if (s.get(x, y) !== -1 && s.get(x, y - 1) !== -1 && s.get(x, y + 1) !== -1) s.set(x, y, R() < 0.5 ? leaf[3] : leaf[0]); }
  return s.outline(ink);
}
function mapleT(seed, ink) {   // 단풍나무: 붉고 노란 둥근 잎 무리
  const R = rng(seed), s = new Spr(72, 70, 35, 66);
  s.line(35, 65, 34, 40, 0x5a3020, 3); s.line(34, 44, 22, 30, 0x5a3020, 2); s.line(35, 42, 48, 28, 0x5a3020, 2); s.vl(34, 46, 63, 0x7c4a2c);
  const L = [[0xb83424, 0xe8602c, 0x8a2420, 0xf8a040], [0xd85a28, 0xf89a3c, 0xa83a24, 0xffd060]];
  for (const [cx, cy, r, k] of [[35, 24, 15, 0], [20, 31, 11, 1], [51, 29, 12, 0], [27, 15, 9, 1], [45, 14, 10, 1]]) { const l = L[k]; blob(s, t => t.ell(cx, cy, r, r * 0.75, 1), l[0], l[1], l[2], 2); for (let q = 0; q < r * 2; q++) { const x = Math.round(cx + (R() - 0.5) * r * 1.8), y = Math.round(cy + (R() - 0.5) * r * 1.3); if (s.get(x, y) !== -1 && s.get(x, y + 1) !== -1) s.set(x, y, R() < 0.5 ? l[3] : l[1]); } }
  return s.outline(ink);
}
function sansuyuT(seed, ink) {   // 산수유: 가는 가지에 노란 꽃 무리 (분홍 꽃은 쓰지 않는다)
  const R = rng(seed), s = new Spr(60, 56, 30, 54), wd = 0x54301e;
  const br = (x0, y0, x1, y1, th) => s.line(x0, y0, x1, y1, wd, th);
  br(30, 54, 29, 38, 3); br(29, 38, 18, 24, 2); br(29, 40, 42, 24, 2); br(18, 24, 10, 14, 1); br(18, 24, 22, 10, 1); br(42, 24, 50, 14, 1); br(42, 24, 38, 10, 1); br(30, 44, 30, 20, 1); br(24, 31, 14, 30, 1); br(36, 31, 48, 32, 1);
  s.vl(29, 42, 52, 0x84522c);
  for (const [x, y] of [[10, 14], [22, 10], [50, 14], [38, 10], [30, 20], [14, 30], [48, 32], [16, 20], [44, 18], [26, 16], [34, 14], [20, 28], [40, 28], [8, 20], [53, 22]]) for (let k = 0; k < 8; k++) { const px = x + Math.round((R() - 0.5) * 7), py = y + Math.round((R() - 0.5) * 6); s.set(px, py, R() < 0.35 ? 0xfff6a8 : 0xffd24a); if (R() < 0.3) s.set(px + 1, py + 1, 0xe09a28); }
  return s.outline(ink);
}
function deadT(seed, bark, ink, leaves) {   // 불탄 나무 / 저승의 마른 나무
  const R = rng(seed), s = new Spr(64, 70, 31, 66);
  const br = (x0, y0, x1, y1, th) => s.line(x0, y0, x1, y1, bark[0], th);
  br(31, 65, 30, 40, 4); br(30, 42, 18, 26, 2); br(30, 40, 44, 22, 3); br(18, 26, 10, 20, 1); br(18, 26, 20, 12, 1); br(44, 22, 54, 18, 2); br(44, 22, 40, 8, 1); br(30, 36, 32, 18, 2); br(32, 18, 26, 8, 1); br(54, 18, 58, 10, 1);
  for (let y = 44; y < 64; y++) s.set(30, y, bark[1]);
  if (leaves) for (const [x, y] of [[10, 20], [20, 12], [54, 18], [40, 8], [26, 8], [58, 10], [32, 18]]) for (let k = 0; k < 6; k++) { const px = x + Math.round((R() - 0.5) * 7), py = y + Math.round((R() - 0.5) * 5); s.set(px, py, R() < 0.4 ? leaves[1] : leaves[0]); }
  return s.outline(ink);
}
function treeImg(T, kind, i, sky) {
  const tone = toneOf(T, sky);
  let s;
  if (kind === 'pine') s = pineT(1 + i * 4, T.dark ? [0x0e2c3a, 0x1c4450, 0x3c7478, 0x4c8c88] : T.wet ? [0x1c3a38, 0x2c5450, 0x4c7468, 0x6c9080] : [0x143c38, 0x1e5a40, 0x3a8448, 0x74b454], T.dark ? [0x101828, 0x283850] : [0x54301e, 0x8a5a34], T.ink);
  else if (kind === 'snowpine') s = pineT(2 + i * 4, [0x203c40, 0x2e5650, 0x4c7468, 0x6c9080], [0x3c2c28, 0x6c5040], T.ink, [0xffffff, 0xdce6f0]);
  else if (kind === 'mistpine') s = pineT(3 + i * 4, [0x4c6c68, 0x6c8c84, 0x8caa9c, 0xa8c0b0], [0x5c4c44, 0x7c6c5c], 0x3c5054);
  else if (kind === 'oak') s = oakT(5 + i, [0x1a4c34, 0x2c6c44, 0x4c9050, 0x84bc60], [0x4a3020, 0x7a5434], T.ink);
  else if (kind === 'maple') s = mapleT(7 + i, T.ink);
  else if (kind === 'sansuyu') s = sansuyuT(3 + i * 5, T.ink);
  else if (kind === 'dead') s = deadT(9 + i, [0x1a1210, 0x3c2c24], 0x0a0606);
  else s = deadT(11 + i, [0x1c1630, 0x3c3458], 0x06040c, [0x5cc8d0, 0xb8f0f0]);
  if (tone) { const o = new Spr(s.w, s.h, s.ox, s.oy); o.d.set(s.d); s = retone(o, kind === 'ghost' ? null : tone); }
  return s;
}

// ───────── 밖으로 내놓는 것 ─────────
const CACHE = new Map();
// 나무 자리 (화면 픽셀, 바닥 한 장 2560 안): 인형들 뒷줄에 서고 몇 그루는 들판 가운데 옆에
const TREE_AT = [{ wx: 260, y: 208 }, { wx: 880, y: 196 }, { wx: 1240, y: 214 }, { wx: 1760, y: 200 }, { wx: 2280, y: 210 }];
export function pxField(theme, sky = 'day') {
  if (sky !== 'night' && sky !== 'rain') sky = 'day';
  const key = theme + ':' + sky; let f = CACHE.get(key); if (f) return f;
  const T = themeOf(theme);
  const far = bakeFar(T, sky), back = bakeBack(T, theme, sky), ground = bakeGround(T, theme, sky);
  const trees = TREE_AT.map((p, i) => { const kind = T.trees[i % T.trees.length], spr = treeImg(T, kind, i, sky); return { wx: p.wx, y: p.y, hw: Math.round(spr.w * 0.85), h: spr.oy * 2, img: spr.canvas(), ox: spr.ox, oy: spr.oy, kind }; });
  f = { layers: [{ img: far.canvas(), period: FAR_P, speed: 0.25, y: FAR_Y }, { img: back.canvas(), period: BACK_P, speed: 0.5, y: BACK_Y }, { img: ground.canvas(), period: GROUND_P, speed: 1, y: GROUND_Y }], trees, period: GROUND_P * 2 };
  CACHE.set(key, f); return f;
}

// 싸움 도중 하늘이 바뀔 때 멈칫하지 않게, 남는 틈에 세 하늘을 미리 굽는다
export function prewarmPxField(theme) { const idle = window.requestIdleCallback || (f => setTimeout(f, 30)); for (const sky of ['day', 'night', 'rain']) idle(() => pxField(theme, sky)); }

// ───────── 날씨 ─────────
const hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
const Y0 = 32, Y1 = 283, FH = Y1 - Y0;   // 날씨가 그려지는 띠 (위 띠와 아래 패 띠 사이)
const rect = (g, x, y, w, h) => g.fillRect(Math.round(x), Math.round(y), w, h);
// 안개 둑: 둥근 덩이를 겹친 띠, 가장자리는 점무늬로 흐린다 (두 빛: 몸과 윗빛)
function fogBank(w, h, col, top, seed, puff = 1, rx0 = 10, rxv = 18, ryk = 0.26) {
  const s = new Spr(w, h), R = rng(seed), V = new Float32Array(w * h);
  for (let i = 0; i < w / 14 * puff; i++) { const cx = (i + R() * 0.8) * 14 / puff, cy = h * (0.45 + R() * 0.35), rx = rx0 + R() * rxv, ry = 2 + R() * h * ryk;
    for (let y = Math.max(0, Math.floor(cy - ry)); y < Math.min(h, cy + ry + 1); y++) for (let dx = -Math.ceil(rx); dx <= rx; dx++) { const q = 1 - (dx / rx) ** 2 - ((y - cy) / ry) ** 2; if (q <= 0) continue; const x = wx(cx + dx, w), k = y * w + x; if (q > V[k]) V[k] = q; } }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = V[y * w + x] * Math.min(1, (h - y) / (h * 0.3)); if (v > 0.55 || (v > 0.06 && bayer(x, y) < (v - 0.06) / 0.49)) s.set(x, y, col); }
  for (let y = 1; y < h; y++) for (let x = 0; x < w; x++) if (s.get(x, y) === col && s.get(x, y - 1) === -1 && V[y * w + x] > 0.3) s.set(x, y, top);
  return s.canvas();
}
// 빛살: 왼쪽 위에서 비스듬히 내리는 숲 속 햇살
function shafts(col) { const s = new Spr(640, FH); for (let y = 0; y < FH; y++) for (let x = 0; x < 640; x++) { const u = x + y * 0.55, b = Math.sin(u * 0.045) + Math.sin(u * 0.017 + 1); if (b < 1.05) continue; if (bayer(x, y) < (b - 1.05) * 0.9 * (1 - y / FH * 0.8)) s.set(x, y, col); } return s.canvas(); }
// 1비트처럼 덮는 엷은 점무늬 (안개 높이·저승 바닥 안개)
function hazeBand(w, h, col, k) { const s = new Spr(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const d = 1 - Math.abs(y - h / 2) / (h / 2); if (bayer(x, y) < d * k) s.set(x, y, col); } return s.canvas(); }
const WX = new Map();
function wx_(key, fn) { let v = WX.get(key); if (!v) WX.set(key, v = fn()); return v; }
const FOGC = { mist: [0xe8e4e8, 0xfaf6f6], day: [0xe2e8ea, 0xf6f9fa], night: [0x56689a, 0x7486b8], rain: [0x8c98a4, 0xa8b2bc], under: [0x4c6c84, 0x6c94a8] };

function rain(g, T, heavy, front) {
  if (!front) {   // 땅에 튀는 빗방울과 퍼지는 물결
    for (let k = 0; k < (heavy ? 34 : 22); k++) { const ph = T * 2.4 + k * 0.37, i = Math.floor(ph), p = ph - i, x = hash(k, i) * 640, y = 70 + hash(i, k + 9) * 206; if (p > 0.55) continue; const r = 1 + p * 7;
      g.fillStyle = `rgba(220,234,246,${0.75 * (1 - p / 0.55)})`; rect(g, x - r, y, 2, 1); rect(g, x + r - 1, y, 2, 1); rect(g, x - r * 0.5, y + 1, Math.max(1, r), 1); rect(g, x - r * 0.5, y - 1, Math.max(1, r), 1); }
    return;
  }
  g.fillStyle = heavy ? 'rgba(16,22,44,0.22)' : 'rgba(30,44,70,0.12)'; g.fillRect(0, Y0, 640, FH);
  const n = heavy ? 300 : 180, sl = heavy ? 2 : 1;
  for (let layer = 0; layer < 2; layer++) { g.fillStyle = layer ? 'rgba(214,228,248,0.62)' : 'rgba(170,190,220,0.38)'; const ln = layer ? 4 : 3;
    for (let k = 0; k < n / 2; k++) { const kk = k * 2 + layer, sp = (layer ? 460 : 340) + (kk % 5) * 50, y = (kk * 37 + T * sp) % (FH + 20) + Y0 - 10, x = ((kk * 53.7 - (y - Y0) * sl * 0.34 - T * (heavy ? 90 : 24)) % 680 + 680) % 680 - 20; rect(g, x, y, 1, ln); rect(g, x - sl, y + ln, 1, ln); } }
  for (let k = 0; k < (heavy ? 40 : 24); k++) { const ph = T * 3.1 + k * 0.29, i = Math.floor(ph), p = ph - i; if (p > 0.3) continue; const x = hash(k + 3, i) * 640, y = 80 + hash(i, k) * 200; g.fillStyle = `rgba(236,244,255,${0.9 - p * 3})`; rect(g, x - 1 - p * 8, y - p * 6, 1, 1); rect(g, x + 1 + p * 8, y - p * 6, 1, 1); rect(g, x, y - 2 - p * 10, 1, 1); }
}
function lightning(g, T, period) {
  const c = T % period, i = Math.floor(T / period);
  if (c < 0.08 || (c > 0.15 && c < 0.21)) { g.fillStyle = 'rgba(226,236,255,0.38)'; g.fillRect(0, Y0, 640, FH); }
  if (c < 0.32) { let x = 80 + hash(i, 3) * 480, y = Y0; g.fillStyle = c < 0.21 ? '#ffffff' : 'rgba(210,224,255,0.6)';
    for (let j = 0; y < 66; j++) { const nx = x + (hash(i, j) - 0.5) * 12, ny = y + 4 + hash(j, i) * 4, st = Math.ceil(ny - y); for (let q = 0; q < st; q++) rect(g, x + (nx - x) * q / st, y + q, 2, 1); if (j === 2 || j === 5) { let bx = nx, by = ny; for (let q = 0; q < 9; q++) { bx += j === 2 ? 1.3 : -1.1; by += 1; rect(g, bx, by, 1, 1); } } x = nx; y = ny; } }
}
function snow(g, T, front, nightC) {
  const W = nightC ? '#c8d4f4' : '#ffffff', W2 = nightC ? '#8c9cd0' : '#dce6f2';
  if (!front) { for (let k = 0; k < 60; k++) { const y = (k * 23 + T * (10 + (k % 4) * 3)) % FH + Y0, x = ((k * 71.3 + Math.sin(T * 0.7 + k) * 6 - T * 4) % 640 + 640) % 640; g.fillStyle = W2; rect(g, x, y, 1, 1); } return; }
  for (let k = 0; k < 140; k++) { const big = k % 5 === 0, mid = k % 5 === 1, sp = big ? 30 : mid ? 22 : 15, y = (k * 29 + T * (sp + (k % 3) * 4)) % (FH + 6) + Y0 - 3, x = ((k * 61.3 + Math.sin(T * (0.8 + (k % 3) * 0.2) + k) * (big ? 10 : 6) - T * (big ? 9 : 5)) % 640 + 640) % 640;
    g.fillStyle = k % 4 === 3 ? W2 : W; if (big) { rect(g, x, y, 2, 2); g.fillStyle = W2; rect(g, x + 1, y + 1, 1, 1); } else rect(g, x, y, 1, 1); }
}
function leaves(g, T, cols) {
  for (let k = 0; k < 46; k++) { const x = ((k * 83 + T * (34 + (k % 4) * 11) + Math.sin(T * 1.7 + k) * 12) % 660) - 10, y = (k * 47 + T * (20 + (k % 3) * 8) + Math.sin(T * 2.3 + k * 1.3) * 7) % FH + Y0, f = Math.floor(T * 5 + k) % 4, X = Math.round(x), Y = Math.round(y), big = k % 3 === 0;
    g.fillStyle = cols[k % cols.length][0]; if (f === 0) { rect(g, X, Y, big ? 4 : 3, 2); rect(g, X + 1, Y - 1, 2, 1); } else if (f === 1) { rect(g, X, Y, 2, big ? 4 : 3); rect(g, X + 2, Y + 1, 1, 2); } else if (f === 2) { rect(g, X, Y + 1, big ? 4 : 3, 1); rect(g, X + 1, Y, 2, 3); } else rect(g, X, Y, 2, 2);
    g.fillStyle = cols[k % cols.length][1]; rect(g, X + 1, Y + 1, 1, 1); }
}
function embers(g, T) {
  for (let k = 0; k < 44; k++) { const sp = 18 + (k % 5) * 6, y = Y1 - ((k * 41 + T * sp) % (FH + 10)), x = ((k * 67 + Math.sin(T * 1.3 + k) * 10 + T * 8) % 640 + 640) % 640, f = Math.sin(T * 9 + k * 2.1); if (f < -0.5) continue;
    g.fillStyle = f > 0.6 ? '#fff0a0' : k % 3 ? '#ff9a2e' : '#ff5a1e'; rect(g, x, y, k % 6 === 0 ? 2 : 1, k % 6 === 0 ? 2 : 1); }
  for (let k = 0; k < 24; k++) { const y = (k * 37 + T * (8 + (k % 3) * 3)) % FH + Y0, x = ((k * 97 - T * 12 + Math.sin(T + k) * 8) % 640 + 640) % 640; g.fillStyle = k % 2 ? 'rgba(140,128,120,0.8)' : 'rgba(90,80,76,0.8)'; rect(g, x, y, 2, 1); }
}
function fireflies(g, T, col, n = 16) { for (let k = 0; k < n; k++) { const x = (k * 97 + T * (3 + k % 3) + Math.sin(T * 0.8 + k * 2) * 14) % 640, y = 80 + (k * 53) % 190 + Math.sin(T * 1.3 + k) * 6, b = Math.sin(T * 2.2 + k * 1.7); if (b < 0) continue; g.fillStyle = col; rect(g, x, y, 1, 1); if (b > 0.75) { g.globalAlpha = 0.35; rect(g, x - 1, y, 3, 1); rect(g, x, y - 1, 1, 3); g.globalAlpha = 1; } } }
function souls(g, T, front) {   // 넋불: 푸른 불꽃이 둥실 떠다닌다
  const n = front ? 7 : 10;
  for (let k = 0; k < n; k++) { const kk = k + (front ? 40 : 0), x = (kk * 89 + T * (4 + kk % 3) + Math.sin(T * 0.6 + kk) * 18) % 660 - 10, y = (front ? 170 : 80) + (kk * 37) % (front ? 100 : 110) + Math.sin(T * 1.1 + kk * 2) * 6, f = Math.sin(T * 8 + kk) > 0.2 ? 1 : 0, X = Math.round(x), Y = Math.round(y);
    g.fillStyle = 'rgba(108,224,240,0.22)'; for (let dy = -7; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) if (Math.abs(dx) + Math.abs(dy) * 0.8 < 6 && ((dx + dy) & 1) === 0) rect(g, X + dx, Y + dy, 1, 1);
    g.fillStyle = '#2c6cb0'; rect(g, X, Y - 6 - f, 1, 2); rect(g, X - 1, Y - 4, 3, 2); rect(g, X - 2, Y - 2, 5, 3); rect(g, X - 1, Y + 1, 3, 1);
    g.fillStyle = '#6cc8e8'; rect(g, X, Y - 4, 1, 2); rect(g, X - 1, Y - 2, 3, 3);
    g.fillStyle = '#e8ffff'; rect(g, X, Y - 1, 1, 2); }
}
function petals(g, T) { for (let k = 0; k < 22; k++) { const x = ((k * 83 + T * (22 + (k % 3) * 8) + Math.sin(T * 1.6 + k) * 10) % 660) - 10, y = (k * 47 + T * (12 + (k % 4) * 4) + Math.sin(T * 2 + k) * 5) % FH + Y0, f = Math.floor(T * 4 + k) % 2; g.fillStyle = k % 3 ? '#ffd24a' : '#fff6a8'; rect(g, x, y, f ? 2 : 1, f ? 1 : 2); } }
function motes(g, T, col, n = 18) { for (let k = 0; k < n; k++) { const x = (k * 71 + T * (4 + k % 4)) % 640, y = 60 + (k * 47) % 200 + Math.sin(T * 0.7 + k) * 6; if (Math.sin(T * 1.5 + k * 2.1) > -0.2) { g.fillStyle = col; rect(g, x, y, 1, 1); } } }
// 안개: 지평선의 짙은 둑(인형 뒤) + 들판을 흐르는 엷은 둑(인형 앞), 모두 점무늬로 가장자리를 흐린다
function fog(g, T, cols, key, front, k = 1) {
  const bank = wx_('fogB' + key, () => fogBank(640, 44, cols[0], cols[1], 3)), hz = wx_('fogH' + key, () => hazeBand(640, 64, cols[0], 0.55));
  const w1 = wx_('fogW1' + key, () => fogBank(640, 16, cols[0], cols[1], 7, 0.45, 34, 50, 0.22)), w2 = wx_('fogW2' + key, () => fogBank(640, 14, cols[0], cols[1], 13, 0.4, 40, 60, 0.2));
  const scroll = (img, sp, y, a) => { const o = ((T * sp) % 640 + 640) % 640; g.globalAlpha = a; g.drawImage(img, Math.round(o - 640), y); g.drawImage(img, Math.round(o), y); g.globalAlpha = 1; };
  if (!front) { g.globalAlpha = 0.6 * k; g.drawImage(hz, 0, 36); g.globalAlpha = 1; scroll(bank, 3, 40, 0.85 * k); scroll(w1, -6, 96, 0.55 * k); scroll(w2, 8, 142, 0.45 * k); return; }
  scroll(w1, 9, 196, 0.32 * k); scroll(w2, -7, 244, 0.28 * k);
}

export function drawPxWeather(g, theme, sky, T, front) {
  const th = themeOf(theme), nt = sky === 'night' || th.dark, wet = sky === 'rain' || th.amb === 'rain';
  if (!front) {
    if (th.amb === 'fog') fog(g, T, sky === 'night' ? FOGC.night : sky === 'rain' ? FOGC.rain : FOGC.mist, theme + sky, false);
    if (th.amb === 'soul') { fog(g, T, FOGC.under, 'under' + sky, false, 0.5); souls(g, T, false); }
    if (th.amb === 'shaft' && sky === 'day') { const sh = wx_('shaft', () => shafts(0xfff8c8)); g.globalAlpha = 0.32 + 0.08 * Math.sin(T * 0.6); g.drawImage(sh, 0, Y0); g.globalAlpha = 1; }
    if (th.amb === 'snow') snow(g, T, false, nt);
    if (th.amb === 'ember') { g.fillStyle = 'rgba(255,110,40,0.07)'; g.fillRect(0, 200, 640, 83); }
    if (wet) rain(g, T, th.amb === 'rain', false);
    return;
  }
  if (wet) { if (th.amb === 'snow') { snow(g, T, true, nt); rain(g, T, false, true); } else rain(g, T, th.amb === 'rain', true); if (th.amb === 'rain') lightning(g, T, 5.3); }
  else if (th.amb === 'snow') snow(g, T, true, nt);
  else if (th.amb === 'leaf') leaves(g, T, [['#e8642c', '#8a2420'], ['#c8402c', '#5a1a18'], ['#f0b438', '#a06818'], ['#d8702c', '#7c3410']]);
  else if (th.amb === 'ember') embers(g, T);
  else if (th.amb === 'petal') { if (nt) fireflies(g, T, '#e0f08a'); else { petals(g, T); motes(g, T, '#fff8d0', 10); } }
  else if (th.amb === 'shaft') { if (nt) fireflies(g, T, '#e0f08a'); else { leaves(g, T, [['#6ca456', '#2c5c3c'], ['#9cc874', '#4a7c44']].slice(0)); } }
  else if (th.amb === 'firefly') fireflies(g, T, '#e0f08a', 22);
  if (th.amb === 'fog') fog(g, T, sky === 'night' ? FOGC.night : wet ? FOGC.rain : FOGC.mist, theme + sky, true);
  if (th.amb === 'soul') { souls(g, T, true); fog(g, T, FOGC.under, 'under' + sky, true, 0.6); }
}
