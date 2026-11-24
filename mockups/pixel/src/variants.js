// 전투 장면의 여러 버전: 같은 싸움을 테마(노을·낮·달밤)와 꾸밈(고퀄 빛·수묵 색 바꿈·미니)만 바꿔 그린다
import { LW, LH, P, INK, Spr, css, txt, draw, bayer, rng, tinted, remap, rimlit, grade, mixc, lum } from './px.js';
import { look, jangseung, bannerCart, pine, sansuyu, rock, tuft } from './sprites.js';
import { C, fr, panel, button, dancheong, coin, ridge, mountains, cloud, stamp, UNITS, hud, useLook } from './scenes.js';

export const TH = {
  dusk: { sky: [0x2a3470, 0x3c4a94, 0x6c6cb4, 0xb884ac, 0xf0a488, 0xffd08c, 0xffeeb4], sun: { x: 470, y: 100, r: 17, c: [0xfff8d8, 0xffeeb4, 0xffe8a8] },
    clouds: [[120, 58, 120, [0xa07cb0, 0xf4b8a0, 0xffe4c0]], [300, 44, 90, [0x8470b0, 0xd89cb0, 0xffd4c0]], [560, 62, 110, [0xa07cb0, 0xf8c0a0, 0xfff0c8]], [430, 78, 60, [0xc890a8, 0xffcc98, 0xfff4d0]]],
    m1: [0x8c80c0, 0xc0a0cc, 0xe0a8b4], m2: [0x5c68a8, 0x8c8cc8, 0xb890b8, 0x4c5898], m3: [0x2e5660, 0x5a8c64, 0x7c9c8c, 0x1e4450],
    wall: [0xe4d8c0, 0x8a88a0, 0xb8b0b0, 0xd0c4b4, 0xa8a0a8, 0x3a3c5c, 0x343858, 0x4a5078, 0xffd08c, 0x9a3a3c, 0x5a2030],
    field: [0xc8d070, 0xa8c85c, 0x84b84c, 0x5c9c44, 0x3c7c40, 0x2c6440], path: [0xd4b478, 0xe8cc8c, 0xb89460, 0xc0a068, 0xf0dca0, 0x9a8468, 0xc8bca8],
    spk: [0xe0e088, 0x84b84c, 0x74b048, 0x245838, 0x94c850], bush: [0x2c6c48, 0x94c850, 0xffd24a], fence: [0x6c4630, 0xb8844a, 0x54301e, 0x84522c] },
  day: { sky: [0x3470d0, 0x4c90e4, 0x74b4f0, 0xa4d4f8, 0xd0ecfc, 0xecf8fc], sun: { x: 540, y: 56, r: 12, c: [0xffffff, 0xfffcd0, 0xe4f4fc] },
    clouds: [[110, 62, 130, [0x9cc0e8, 0xe4f0fc, 0xffffff]], [320, 46, 100, [0x9cc0e8, 0xe4f0fc, 0xffffff]], [470, 84, 90, [0xa8cceC, 0xecf6fc, 0xffffff]], [600, 50, 70, [0x9cc0e8, 0xe4f0fc, 0xffffff]]],
    m1: [0x84b8e0, 0xacd4f0, 0xc8e6f8], m2: [0x4c9c94, 0x80c4a4, 0xa8dcd0, 0x3c8480], m3: [0x2c7c54, 0x5cac5c, 0x94d0a8, 0x1c5c44],
    wall: [0xf4ecd8, 0x9098a8, 0xc8c8c4, 0xe0dccc, 0xb8b8b8, 0x3a4468, 0x3c4870, 0x586890, 0xfff8c0, 0xb84848, 0x6c2838],
    field: [0xbce478, 0x9cdc64, 0x78c854, 0x58b04c, 0x40984c, 0x2c8048], path: [0xe4cc8c, 0xf8e8b0, 0xc8a86c, 0xd0b478, 0xfff4c8, 0xa8947c, 0xdcd0bc],
    spk: [0xe4f490, 0x80cc58, 0x70c050, 0x247444, 0xa0e060], bush: [0x2c8450, 0xa0e060, 0xffe060], fence: [0x7c5438, 0xc89858, 0x5c3822, 0x94643a] },
  night: { sky: [0x060818, 0x0a1028, 0x101a40, 0x182658, 0x243674, 0x344a90], sun: { x: 470, y: 76, r: 21, c: [0xfffadc, 0xfff0b0, 0x4c64a8], moon: true },
    clouds: [[130, 60, 120, [0x101838, 0x1c2a5c, 0x4c64a8]], [330, 46, 90, [0x101838, 0x1c2a5c, 0x445898]], [560, 96, 120, [0x141c44, 0x243468, 0x6c84c0]]],
    m1: [0x243468, 0x3c5090, 0x2c3c78], m2: [0x18244c, 0x2c3c74, 0x20305c, 0x101838], m3: [0x0e2434, 0x1c4048, 0x163044, 0x081824],
    wall: [0x8c94b8, 0x343c64, 0x5c6890, 0x7480a8, 0x505c84, 0x10142c, 0x141a38, 0x2c3864, 0xffd88c, 0x6c2c44, 0x3c1830],
    field: [0x2c5c68, 0x26525e, 0x1e4654, 0x183c4a, 0x123240, 0x0e2836], path: [0x4c5674, 0x647090, 0x3a4462, 0x44506c, 0x7884a4, 0x343c58, 0x5c6884],
    spk: [0x3c7478, 0x1e4654, 0x2c6466, 0x0a2030, 0x4c8880], bush: [0x143c48, 0x3c7478, 0x8cb8d0], fence: [0x2a2c4c, 0x586088, 0x1a1c36, 0x3c4470] },
};
export const nightTint = c => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255; if (r > 215 && g > 170 && b < 150) return c; return (Math.min(255, Math.round(r * 0.5 + 10)) << 16) | (Math.min(255, Math.round(g * 0.58 + 18)) << 8) | Math.min(255, Math.round(b * 0.78 + 46)); };

// 뭉게구름 (고퀄 판): 둥근 덩이를 겹치고 위는 밝게, 아래는 그늘, 해 쪽 테는 따뜻하게
function cumulus(s, cx, cy, w, h, cols, seed) {
  const R = rng(seed), t = new Spr(s.w, s.h);
  for (let k = 0; k < w / 7; k++) { const u = R(), x = cx + (u - 0.5) * w, r = (0.35 + 0.65 * Math.sin(u * Math.PI)) * h * (0.6 + R() * 0.5); t.ell(x, cy - r * 0.7, r * 1.25, r, 1); }
  for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { if (t.get(x, y) === -1 || y > cy) continue; const up = t.get(x, y - 1) === -1 || t.get(x, y - 2) === -1 || t.get(x - 1, y - 1) === -1, rt = t.get(x + 1, y) === -1 || t.get(x + 2, y) === -1, d = (cy - y) / h; s.set(x, y, up ? cols[3] : rt ? cols[4] : d < 0.22 ? cols[0] : d < 0.5 && bayer(x, y) > d * 2 ? cols[0] : d < 0.9 && bayer(x, y) > (d - 0.3) * 1.6 ? cols[1] : cols[2]); }
}
export function bake(th, o = {}) {
  const s = new Spr(LW, LH), R = rng(11), PT = th.path;
  s.vgrad(0, 0, LW, 132, th.sky);
  if (th.sun.moon) { const R2 = rng(4); for (let i = 0; i < 110; i++) { const x = (R2() * LW) | 0, y = 26 + ((R2() * 86) | 0); s.set(x, y, R2() < 0.3 ? 0xfff6c8 : 0x7c8cc8); } }
  { const { x: sx, y: sy, r, c } = th.sun; for (let y = sy - r - 20; y < 132; y++) for (let x = sx - r - 20; x < sx + r + 20; x++) { const d = Math.hypot(x - sx, y - sy); if (d < r) s.set(x, y, th.sun.moon && (Math.hypot(x - sx + 6, y - sy + 5) < 4 || Math.hypot(x - sx - 7, y - sy - 6) < 3) ? 0xe8dca0 : c[0]); else if (d < r + 4) s.set(x, y, c[1]); else if (d < r + 17 && bayer(x, y) > (d - r - 4) / 13) s.set(x, y, c[2]); } }
  if (o.rich) { cumulus(s, 130, 74, 150, 24, [0x8c70a8, 0xd898a8, 0xf8c4a8, 0xfff0d0, 0xffd89c], 3); cumulus(s, 318, 52, 90, 14, [0x7868a8, 0xc890ac, 0xf0b8b0, 0xffe4d0, 0xffd0a0], 5); cumulus(s, 580, 70, 120, 20, [0x9474a8, 0xe8a0a0, 0xffcc9c, 0xfff6d8, 0xffe8a8], 8); cumulus(s, 410, 90, 60, 9, [0xb080a8, 0xf0a890, 0xffd098, 0xfff8dc, 0xfff0b8], 9); }
  else for (const [x, y, w, cols] of th.clouds) cloud(s, x, y, w, cols, (x * 7) | 0);
  const SN = th.snow ? { snow: 4, snowCol: th.snow[0], snowSh: th.snow[1] } : {};
  mountains(s, 98, 20, 0.021, 1.3, th.m1[0], th.m1[1], th.m1[2], 132, Object.assign({ mist: 20 }, SN, th.snow ? { snow: 7 } : {}));
  mountains(s, 112, 16, 0.031, 4.1, th.m2[0], th.m2[1], th.m2[2], 136, Object.assign({ mist: 16, trees: 0.12, treeCol: th.m2[3] }, SN));
  mountains(s, 126, 10, 0.043, 2.2, th.m3[0], th.m3[1], th.m3[2], 146, Object.assign({ mist: 10, trees: 0.3, treeCol: th.m3[3] }, SN, th.snow ? { snow: 2 } : {}));
  { const wx = 300, wy = 121, Wc = th.wall; for (let x = wx - 50; x < wx + 60; x++) { const top = wy + Math.round(Math.sin(x * 0.05) * 2); for (let y = top; y < top + 9; y++) s.set(x, y, y === top ? Wc[0] : (x + y) % 5 === 0 ? Wc[1] : Wc[2]); if (x % 4 < 2) s.set(x, top - 1, Wc[3]); }
    s.rect(wx - 8, wy - 9, 22, 12, Wc[4]); s.rect(wx - 1, wy - 4, 8, 9, Wc[5]); s.hl(wx, wx + 5, wy - 5, Wc[5]);
    for (const [ry, hw] of [[wy - 12, 18], [wy - 19, 13]]) { s.hl(wx + 3 - hw, wx + 3 + hw, ry, Wc[6]); s.hl(wx + 5 - hw, wx + 1 + hw, ry - 1, Wc[7]); s.hl(wx + 7 - hw, wx - 1 + hw, ry - 2, Wc[6]); s.set(wx + 2 - hw, ry - 1, Wc[6]); s.set(wx + 4 + hw, ry - 1, Wc[6]); s.set(wx + 1 - hw, ry - 2, Wc[8]); }
    s.rect(wx - 4, wy - 17, 15, 5, Wc[9]); for (let x = wx - 3; x < wx + 11; x += 3) s.vl(x, wy - 17, wy - 13, Wc[10]); if (th.sun.moon) { s.rect(wx, wy - 2, 2, 3, Wc[8]); s.rect(wx + 4, wy - 2, 2, 3, Wc[8]); } }
  s.vgrad(0, 140, LW, 150, th.field);
  const isPath = c0 => c0 === PT[0] || c0 === PT[1] || c0 === PT[2];
  for (let x = 0; x < LW; x++) { const cy = 214 + Math.sin(x * 0.012 + 0.5) * 12, hw = 21 + Math.sin(x * 0.03) * 4; for (let y = Math.round(cy - hw - 3); y < cy + hw + 3; y++) { const d = Math.abs(y - cy) / hw; if (d < 0.8 || bayer(x, y) > (d - 0.8) / 0.3) s.set(x, y, d < 0.45 && bayer(x + 1, y) > 0.55 ? PT[1] : y > cy + hw * 0.5 ? PT[2] : PT[0]); } if (o.rich && x % 3) for (const off of [-7, 6]) s.set(x, Math.round(cy + off + Math.sin(x * 0.08) * 1.2), PT[2]); }
  for (let i = 0; i < 1500; i++) { const x = (R() * LW) | 0, y = 142 + ((R() * 140) | 0), c0 = s.get(x, y); if (isPath(c0)) { if (R() < 0.3) s.hl(x, x + 1 + ((R() * 3) | 0), y, R() < 0.5 ? PT[3] : PT[4]); } else { const up = y < 190; s.set(x, y, R() < 0.5 ? (up ? th.spk[0] : th.spk[2]) : (up ? th.spk[1] : th.spk[3])); if (R() < 0.4) s.set(x, y - 1, up ? th.spk[0] : th.spk[4]); } }
  for (let i = 0; i < 40; i++) { const x = (R() * LW) | 0, y = 150 + ((R() * 128) | 0); if (isPath(s.get(x, y))) { s.hl(x, x + 2, y, PT[5]); s.set(x + 1, y - 1, PT[6]); } }
  for (let x = -4; x < LW; x += 7 + ((R() * 6) | 0)) { const r = 4 + R() * 4, y = 141 + R() * 2; const t = new Spr(LW, LH); t.ell(x, y, r * 1.4, r, th.bush[0]); s.blit(t, 0, 0); for (let k = 0; k < 3; k++) s.set(x + ((R() - 0.5) * r * 2) | 0, y - ((R() * r) | 0), R() < 0.5 ? th.bush[1] : th.bush[2]); }
  for (let x = 6; x < LW; x += 22) { s.rect(x, 139, 2, 10, th.fence[0]); s.vl(x, 139, 148, th.fence[1]); s.set(x, 138, th.fence[2]); s.set(x + 1, 138, th.fence[2]); }
  for (const y of [141, 145]) for (let x = 0; x < LW; x++) s.set(x, y + (Math.sin(x * 0.29) > 0.8 ? 1 : 0), x % 22 < 9 ? th.fence[1] : th.fence[3]);
  const fix = sp => { const o = th.sun.moon ? remap(sp, 'night', nightTint) : sp; return th.sprFix ? th.sprFix(o) : o; };
  for (let i = 0; i < 120; i++) { const x = (R() * LW) | 0, y = 152 + ((R() * 126) | 0); if (isPath(s.get(x, y))) continue; stamp(s, fix(tuft(i)), x, y); }
  if (o.rich) for (const [fx, fy, col] of [[150, 258, 0xffffff], [200, 164, 0xffd24a], [372, 270, 0xfcb0b8], [470, 170, 0xffffff], [560, 196, 0xffd24a], [70, 190, 0xfcb0b8], [286, 160, 0xffffff]]) for (let k = 0; k < 9; k++) { const x = fx + ((R() - 0.5) * 30) | 0, y = fy + ((R() - 0.5) * 12) | 0; if (isPath(s.get(x, y))) continue; s.set(x, y, col); s.set(x, y + 1, th.spk[3]); if (k % 3 === 0) s.set(x + 1, y, mixc(col, 0xffe0a0, 0.5)); }
  for (const [x, y, w] of [[92, 170, 12], [402, 160, 10], [540, 268, 16], [26, 262, 18], [300, 276, 10], [612, 180, 12]]) stamp(s, fix(rock(w, x)), x, y);
  return s;
}
// 햇살 줄기: 해에서 퍼지는 빛을 디더로 굽는다
export function rays(th) { const s = new Spr(LW, LH), { x: sx, y: sy } = th.sun; for (let y = 26; y < 284; y++) for (let x = 0; x < LW; x++) { const dx = x - sx, dy = y - sy, d = Math.hypot(dx, dy); if (d < 26 || d > 460) continue; const a = Math.atan2(dy, dx), band = Math.sin(a * 13 + 0.6) * 0.5 + Math.sin(a * 29 + 2) * 0.3; if (band < 0.32) continue; if (bayer(x, y) < (1 - d / 460) * 1.1 * (band - 0.1)) s.set(x, y, 0xfff0b8); } return s; }
// 화면 틀: 아래쪽 풀 그림자와 오른쪽 위의 솔가지 (앞에 놓인 것은 어둡게)
function frameArt() { const s = new Spr(LW, LH), R = rng(77), D = 0x1c2440, D2 = 0x2c3a54;
  for (let x = 0; x < LW; x++) { const edge = Math.max(0, 1 - Math.min(x, LW - x) / 150), h = Math.round((3 + R() * 9) * (0.25 + edge)); if (R() < 0.75) s.vl(x, 284 - h, 284, R() < 0.3 ? D2 : D); if (R() < 0.05 * (0.4 + edge)) { const hh = h + 6; s.line(x, 284, x + (R() < 0.5 ? -3 : 3), 284 - hh, D); } }
  const pad = (cx, cy, rx, ry) => { s.ell(cx, cy, rx, ry, D); for (let k = 0; k < rx; k++) s.set(Math.round(cx - rx + R() * rx * 2), Math.round(cy - ry + 1), D2); };
  return s; }

const HAND = [{ kind: 'atk', name: '화살비', cost: 3, icon: 'arrows' }, { kind: 'unit', name: '궁수', cost: 2, spr: 'archer' }, { kind: 'sup', name: '진군의 북', cost: 2, icon: 'drum', sel: true }, { kind: 'unit', name: '무녀', cost: 2, spr: 'priest' }, { kind: 'atk', name: '벼락', cost: 2, icon: 'bolt' }];
const FOE = ['goblin', 'ogre', 'ghost', 'tiger'];
// o: { theme, rich(고퀄 빛), lut(화면 색 바꿈) }
export function makeBattle(o) {
  let B = null; const th = TH[o.theme], night = !!th.sun.moon, lutCache = new Map();
  const fix = sp => (o.fx ? o.fx(sp) : night ? remap(sp, 'night', nightTint) : o.rich ? rimlit(sp) : sp);
  const pfix = sp => (o.fxp ? o.fxp(fix(sp)) : fix(sp)), ufix = sp => (o.fxu ? o.fxu(fix(sp)) : fix(sp));   // 소품만 · 인형만 덧입히는 것
  return (g, t) => {
    if (!B) B = { bg: o.bg ? o.bg() : bake(th, o), pines: [pine(1), pine(5), pine(9)], sans: sansuyu(3), sans2: sansuyu(8), cart: bannerCart(), js: [jangseung(0), jangseung(1)], rays: o.rich ? rays(th) : null, frame: o.rich ? frameArt() : null };
    g.drawImage(B.bg.canvas(), 0, 0); if (o.mid) o.mid(g, t, B);
    const shadowCol = night ? 'rgba(4,6,24,0.4)' : o.rich ? 'rgba(52,36,96,0.34)' : 'rgba(20,24,50,0.32)';
    // 길게 눕는 그림자 (고퀄 판): 해 반대쪽으로 기울여 찍는다
    const longShadow = (sp, x, y) => { if (!o.rich) return; g.save(); g.translate(Math.round(x), Math.round(y)); g.transform(1, 0, 1.15, -0.42, 0, 0); g.globalAlpha = 0.36; g.drawImage(tinted(sp, 0x241a50).canvas(), -sp.ox, -sp.oy); g.restore(); };
    const dropSh = (sp, x, y) => { g.save(); g.globalAlpha = 0.26; draw(g, tinted(fix(sp), 0x2a2036), x + 3, y + 3); g.restore(); };
    const list = [];
    [[B.pines[0], 56, 166], [B.pines[1], 610, 158], [B.pines[2], 452, 154], [B.js[0], 590, 172], [B.js[1], 620, 280], [B.cart, 44, 232]].forEach(([sp, x, y]) => list.push({ y, sh: () => (o.drop ? dropSh(sp, x, y) : longShadow(sp, x, y)), d: () => draw(g, pfix(sp), x, y) }));
    for (const [k, x, y, ph] of UNITS) { const s0 = (o.spr || look)(k), boss = k === 'tiger', ally = !FOE.includes(k);
      list.push({ y, sh: () => { if (o.drop) dropSh(s0, x, y); else if (o.rich) longShadow(s0, x, y); else { g.fillStyle = shadowCol; const sw = boss ? 34 : 11; g.fillRect(x - sw, y - 1, sw * 2, 3); g.fillRect(x - sw + 2, y - 2, sw * 2 - 4, 5); } },
        d: () => { const bob = Math.sin(t * 3.2 + ph * 2) > 0.3 ? -1 : 0, hit = !ally && Math.floor(t * 2 + ph) % 7 === 0 && (t * 2 + ph) % 1 < 0.15; if (o.rich) { g.fillStyle = shadowCol; const sw = boss ? 30 : 9; g.fillRect(x - sw, y - 1, sw * 2, 2); } draw(g, hit ? tinted(ufix(s0), 0xffffff) : ufix(s0), x + (hit ? 1 : 0), y + bob); } }); }
    list.sort((a, b) => a.y - b.y); for (const it of list) it.sh(); for (const it of list) it.d();
    draw(g, pfix(B.sans), 22, 290); draw(g, pfix(B.sans2), 628, 292);
    // 달밤: 등불과 도깨비불
    if (night) {
      const glow = (x, y, r, col) => { g.fillStyle = col; for (const k of [1, 0.66, 0.36]) { g.beginPath(); g.arc(x, y, r * k, 0, 7); g.fill(); } };
      const fl = Math.sin(t * 9) > 0.4 ? 1 : 0;
      for (const [x, y] of [[58, 196], [262, 196], [150, 160], [330, 170]]) { glow(x, y, 26 + fl, 'rgba(255,190,110,0.10)'); fr(g, x - 1, y - 2, 3, 5, 0xffd24a); fr(g, x, y - 3 - fl, 1, 2, 0xfff6a8); fr(g, x - 1, y + 3, 3, 1, 0x8a1c30); fr(g, x, y - 8, 1, 5, 0x2a161c); }
      for (let k = 0; k < 9; k++) { const x = 390 + (k * 53) % 230 + Math.sin(t * 0.8 + k * 2) * 8, y = 150 + (k * 37) % 110 + Math.sin(t * 1.3 + k) * 5, f = Math.sin(t * 9 + k * 3) > 0 ? 1 : 0; glow(x, y, 10 + f, 'rgba(110,190,255,0.12)'); fr(g, x - 2, y - 2, 4, 5, 0x6c9ce0); fr(g, x - 1, y - 4 - f, 2, 3, 0x6c9ce0); fr(g, x - 1, y - 1, 2, 3, 0xb0dcf8); fr(g, x, y, 1, 1, 0xffffff); }
      for (let k = 0; k < 14; k++) { const x = (k * 97 + t * 6) % 640, y = 150 + (k * 53) % 120 + Math.sin(t + k) * 4; if (Math.sin(t * 2 + k * 1.7) > 0.2) fr(g, x, y, 1, 1, 0xe0f08a); }
    }
    // 화살·칼바람·불티·치유·숫자
    for (let k = 0; k < 5; k++) { const p = ((t * 0.9 + k * 0.23) % 1), x0 = 176 + k * 4, x1 = 396 + k * 9, x = x0 + (x1 - x0) * p, y = 170 + k * 5 - Math.sin(p * Math.PI) * 46, a = Math.atan2(-Math.cos(p * Math.PI) * 46 * Math.PI, x1 - x0); for (let q = 0; q < 7; q++) fr(g, x - Math.cos(a) * q, y - Math.sin(a) * q, 1, 1, q === 0 ? C('steel', 4) : q > 4 ? C('red', 3) : C('wood', 3)); if (o.rich) for (let q = 8; q < 16; q += 2) fr(g, x - Math.cos(a) * q, y - Math.sin(a) * q, 1, 1, 'rgba(255,255,255,0.35)'); }
    { const p = (t * 1.6) % 1; if (p < 0.35) for (let a = -1.1; a < 0.9; a += 0.09) { const r = 17 + p * 10; fr(g, 344 + Math.cos(a) * r, 190 + Math.sin(a) * r, 2, 1 + (Math.abs(a) < 0.5 ? 1 : 0), a > 0.5 ? C('gold', 4) : C('white', 4)); } }
    for (let k = 0; k < 6; k++) { const p = (t * 1.3 + k * 0.17) % 1, a = k * 1.05; fr(g, 384 + Math.cos(a) * p * 16, 196 + Math.sin(a) * p * 12 - p * 6, 1, 1, k % 2 ? C('gold', 4) : C('white', 4)); }
    for (let k = 0; k < 5; k++) { const p = (t * 0.6 + k * 0.2) % 1; fr(g, 108 + k * 7, 222 - p * 16, 1, 1, C('teal', 4)); if (k % 2) { fr(g, 108 + k * 7 - 1, 223 - p * 16, 3, 1, C('teal', 3)); fr(g, 108 + k * 7, 221 - p * 16, 1, 3, C('teal', 3)); } }
    if (o.rich) { // 햇살과 떠다니는 먼지, 발밑 흙먼지, 화면 틀
      g.save(); g.globalAlpha = 0.34; g.drawImage(B.rays.canvas(), 0, 0); g.restore();
      g.save(); g.globalCompositeOperation = 'lighter'; g.beginPath(); g.rect(0, 26, LW, 258); g.clip(); for (const [r, a] of [[150, 0.07], [100, 0.08], [60, 0.1]]) { g.fillStyle = `rgba(255,190,110,${a})`; g.beginPath(); g.arc(th.sun.x, th.sun.y, r, 0, 7); g.fill(); } g.restore();
      for (let k = 0; k < 26; k++) { const x = (k * 71 + t * (5 + k % 4)) % 640, y = 60 + (k * 47) % 210 + Math.sin(t * 0.7 + k) * 6; if (Math.sin(t * 1.5 + k * 2.1) > -0.2) fr(g, x, y, 1, 1, k % 3 ? 0xffe8a8 : 0xffffff); }
      for (const [x, y] of [[372, 186], [404, 252], [300, 206]]) for (let k = 0; k < 4; k++) { const p = (t * 1.1 + k * 0.25) % 1; g.fillStyle = `rgba(244,220,168,${0.5 * (1 - p)})`; g.fillRect(Math.round(x + (k - 1.5) * 6 + p * 4), Math.round(y - p * 7), 3 - (p > 0.6 ? 1 : 0), 2); }
      g.drawImage(B.frame.canvas(), 0, 0);
      const vg = g.createLinearGradient(0, 24, 0, 284); vg.addColorStop(0, 'rgba(40,30,90,0.20)'); vg.addColorStop(0.25, 'rgba(40,30,90,0)'); vg.addColorStop(0.8, 'rgba(40,30,90,0)'); vg.addColorStop(1, 'rgba(30,20,70,0.28)'); g.fillStyle = vg; g.fillRect(0, 24, LW, 260);
    }
    if (o.over) o.over(g, t, B);
    { const p = (t * 0.8) % 1, p2 = (t * 0.8 + 0.5) % 1; txt(g, '-18', 398, 160 - p * 12, { f: 'b', a: 'c', c: C('white', 4), ol: C('red', 1) }); txt(g, '-9', 428, 214 - p2 * 12, { f: 'b', a: 'c', c: C('white', 4), ol: C('red', 1) }); txt(g, '+12', 306, 152 - p2 * 10, { f: 'b', a: 'c', c: C('teal', 4), ol: C('teal', 0) }); }
    { const gy = 168 + (o.gaugeDy || 0); fr(g, 232, gy, 30, 5, INK); fr(g, 233, gy + 1, 28, 3, C('ink', 3)); fr(g, 233, gy + 1, 22, 3, C('gold', 3)); fr(g, 233, gy + 1, 22, 1, C('gold', 4)); }
    panel(g, 214, 30, 212, 25, { fill: C('ink', 1), edge: C('red', 1) }); txt(g, '고개 호랑이', 320, 34, { f: 9, a: 'c', c: C('gold', 4), sh: INK }); fr(g, 222, 46, 196, 5, INK); fr(g, 223, 47, 194, 3, C('red', 0)); fr(g, 223, 47, 138, 3, C('red', 2)); fr(g, 223, 47, 138, 1, C('red', 3)); for (const k of [0.25, 0.5, 0.75]) fr(g, 223 + 194 * k, 47, 1, 3, INK);
    panel(g, 6, 30, 112, 16, { fill: C('teal', 1), edge: C('teal', 3), corner: false }); txt(g, '학익진', 11, 33, { f: 9, c: C('gold', 4) }); txt(g, '피해 +20%', 113, 33, { f: 9, a: 'r', c: C('cream', 3) });
    panel(g, 6, 48, 112, 16, { fill: C('ink', 2), edge: C('ink', 3), corner: false }); txt(g, '방진 2단', 11, 51, { f: 9, c: C('cream', 3) }); txt(g, '방어 +10%', 113, 51, { f: 9, a: 'r', c: C('cream', 1) });
    useLook(o.fxu ? k => o.fxu(look(k)) : o.spr ? k => fix(o.spr(k)) : o.fx ? k => fix(look(k)) : null, o.cardDy || 0, o.portDy || 0); hud(g, t); useLook(null);
    if (o.lut) grade(g, o.lut, lutCache);
    if (o.after) o.after(g, t);
  };
}
// 수묵: 밝기만 남겨 먹의 농담 여섯 단으로, 붉은빛만 인주색으로 남긴다
const INKS = [0x1b1425, 0x3a3440, 0x6a6064, 0x9c9084, 0xc8bca0, 0xe9dec4, 0xf6efdc];
const sumuk = c => { const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), L = lum(c), sat = mx ? (mx - mn) / mx : 0;
  if (sat > 0.5 && r === mx && r - g > 60 && g - b < 90 && r > 120) return L < 0.3 ? 0x7a1c1c : L < 0.5 ? 0xb8322a : 0xd8604a;   // 붉은빛 → 인주
  return INKS[Math.min(6, Math.floor(Math.pow(L, 0.85) * 7.2))]; };

// ───────── 단순화: 미니 도트 (320×180, 인형 16픽셀 남짓, 그늘 없는 납작한 색) ─────────
const MW = 20, MH = 24;
function mini(o) {
  const s = new Spr(MW, MH, 9, 22), sk = o.skin || 0xf8d4a8, K = INK, top = o.top || 0x3c5cae, st = o.style || 'soldier';
  if (st === 'ghost') { s.rows(14, [[6, 11], [5, 12], [5, 12], [5, 12], [5, 12], [5, 12]], top); for (const x of [5, 7, 9, 11]) s.vl(x, 20, 21, top); }
  else if (st === 'hanbok') { s.rect(6, 14, 6, 2, top); s.rows(16, [[5, 12], [5, 12], [4, 13], [4, 13], [4, 13], [4, 13]], o.robe || top); s.hl(4, 13, 21, o.hem || 0xc83232); }
  else if (st === 'robe') { s.rect(6, 14, 6, 5, top); s.rows(19, [[5, 12], [5, 12]], top); s.set(7, 21, K); s.set(10, 21, K); s.hl(6, 11, 17, o.sash || 0xe09a28); }
  else { const bare = st === 'bare'; s.rect(6, 14, 6, 5, bare ? sk : top); if (bare) s.rect(6, 17, 6, 2, 0xe4cc98); else s.hl(6, 11, 17, o.sash || 0xe09a28); s.rect(6, 19, 2, 2, bare ? sk : (o.legs || 0xf4f6f4)); s.rect(10, 19, 2, 2, bare ? sk : (o.legs || 0xf4f6f4)); s.hl(6, 7, 21, bare ? sk : K); s.hl(10, 11, 21, bare ? sk : K); }
  s.vl(5, 14, 16, st === 'bare' ? sk : (o.arm || top)); s.vl(12, 14, 16, st === 'bare' ? sk : (o.arm || top)); s.set(5, 17, sk); s.set(12, 17, sk);
  s.rows(7, [[6, 11], [5, 12], [5, 12], [5, 12], [5, 12], [5, 12], [6, 11]], sk);
  if (o.hair !== false) { s.hl(6, 11, 7, o.hair || 0x1a1826); s.hl(5, 12, 8, o.hair || 0x1a1826); if (o.long) { s.vl(4, 9, 14, o.hair || 0x1a1826); s.vl(13, 9, 13, o.hair || 0x1a1826); } }
  const blk = 0x1a1826, gold = 0xe09a28, red = 0xc83232, straw = 0xd0a040;
  ({ jeonrip() { s.hl(3, 14, 8, blk); s.rect(6, 5, 6, 3, blk); s.hl(6, 11, 7, gold); s.set(8, 4, red); s.set(7, 5, red); },
    tugu() { s.rows(4, [[7, 10], [6, 11], [5, 12], [5, 12]], 0xe09a28); s.hl(5, 12, 8, 0xa05a1c); s.rect(7, 1, 4, 3, red); s.vl(4, 9, 11, red); s.vl(13, 9, 11, red); s.set(6, 5, 0xffd24a); },
    gat() { s.hl(2, 15, 8, blk); s.rect(6, 3, 6, 5, blk); },
    gokkal() { s.rows(2, [[8, 9], [8, 9], [7, 10], [7, 10], [6, 11], [5, 12], [5, 12]], 0xf4f6f4); s.hl(5, 7, 8, red); s.hl(8, 9, 8, 0xffd24a); s.hl(10, 12, 8, 0x3c5cae); },
    topknot() { s.rect(8, 5, 2, 2, blk); s.hl(5, 12, 9, o.band || red); },
    paeraeng() { s.hl(3, 14, 8, straw); s.rect(6, 6, 6, 2, straw); s.hl(6, 11, 7, 0x3c5cae); },
    satgat() { s.rows(4, [[8, 9], [6, 11], [4, 13], [3, 14], [2, 15]], straw); },
    wild() { s.rows(6, [[6, 11], [5, 12], [4, 13]], blk); s.set(5, 5, blk); s.set(8, 5, blk); s.set(11, 5, blk); },
    jjok() { s.rect(3, 10, 2, 2, blk); s.set(2, 10, gold); } }[o.hat] || (() => 0))();
  if (o.face === 'dok') { s.set(7, 10, 0xffd24a); s.set(10, 10, 0xffd24a); s.hl(7, 10, 12, 0xffffff); } else { s.vl(8, 10, 11, o.eye || K); s.vl(11, 10, 11, o.eye || K); if (o.beard) s.rows(12, [[6, 11], [7, 10]], o.beard); }
  ({ sword() { s.line(13, 17, 16, 10, 0xccd8e4); s.set(13, 17, gold); }, woldo() { s.vl(15, 5, 21, 0x84522c); s.rect(14, 1, 3, 4, 0xccd8e4); s.set(15, 5, red); },
    spear() { s.vl(15, 4, 21, 0x84522c); s.vl(15, 1, 3, 0xccd8e4); s.set(15, 4, red); }, bow() { for (const [x, y] of [[14, 11], [15, 12], [16, 13], [16, 14], [16, 15], [15, 16], [14, 17]]) s.set(x, y, 0x8a1c30); s.vl(13, 11, 17, 0xf4f6f4); },
    shield() { s.ell(15, 17, 2.4, 2.4, straw); s.set(15, 17, red); s.line(13, 13, 15, 10, 0xccd8e4); }, club() { s.line(13, 17, 16, 10, 0x84522c, 2); },
    fan() { s.set(13, 16, red); s.set(14, 15, 0xffd24a); s.set(15, 15, 0x3c5cae); s.set(16, 16, 0xf4f6f4); s.set(14, 16, 0xffd24a); s.set(15, 16, 0x3c5cae); }, talisman() { s.rect(13, 13, 2, 4, 0xffd24a); s.set(13, 14, red); s.set(14, 16, red); } }[o.arm] || (() => 0))();
  return s.outline();
}
function miniTiger() {
  const s = new Spr(42, 26, 21, 23), O = 0xe88420, D = 0xa84818, B = 0x1a1826, Wt = 0xfffbe4;
  s.line(9, 13, 4, 10, O, 2); s.line(4, 10, 5, 5, O, 2); s.rect(5, 3, 2, 2, B);
  s.rect(15, 18, 2, 4, D); s.rect(28, 18, 2, 4, D);
  s.rows(10, [[10, 28], [9, 30], [8, 30], [8, 30], [8, 30], [8, 30], [9, 30], [10, 28]], O); s.hl(12, 26, 17, Wt);
  for (const x of [12, 16, 20, 24]) { s.vl(x, 10, 13, B); s.set(x + 1, 10, B); }
  s.rect(10, 18, 3, 4, O); s.rect(24, 18, 3, 4, O); s.hl(10, 12, 19, B); s.hl(24, 26, 19, B);
  s.ell(32, 10, 5.5, 5, O); s.rect(28, 4, 2, 2, O); s.rect(35, 4, 2, 2, O); s.rect(31, 11, 4, 3, Wt); s.set(32, 11, 0xe87090); s.set(33, 11, 0xe87090);
  s.set(30, 9, 0xffd24a); s.set(35, 9, 0xffd24a); s.set(30, 8, B); s.set(31, 8, B); s.set(34, 8, B); s.set(35, 8, B); s.set(32, 6, B); s.set(33, 6, B); s.hl(31, 34, 13, 0x8a1c30);
  return s.outline();
}
const MINI = {
  commander: { top: 0xc83232, legs: 0x2e2e44, hat: 'tugu', beard: 0x1a1826, arm: 'woldo', sash: 0xffd24a }, sword: { top: 0xc83232, hat: 'jeonrip', arm: 'sword' }, archer: { top: 0x3c5cae, hat: 'topknot', band: 0x3c5cae, arm: 'bow', sash: 0xc83232 },
  shield: { top: 0x2e8c64, hat: 'topknot', band: 0xe09a28, arm: 'shield' }, spear: { top: 0xe4cc98, hat: 'paeraeng', arm: 'spear', sash: 0xc83232 }, priest: { style: 'hanbok', top: 0xf4f6f4, robe: 0xf4f6f4, hat: 'gokkal', long: true, arm: 'fan' },
  wizard: { style: 'robe', top: 0x8c98b0, hat: 'gat', beard: 0x1a1826, arm: 'talisman', sash: 0x1a1826 },
  goblin: { style: 'bare', skin: 0xdc5c28, hat: 'paeraeng', hair: false, face: 'dok', arm: 'club' }, ogre: { style: 'bare', skin: 0x6a80c0, hat: 'wild', hair: false, face: 'dok', arm: 'club' }, ghost: { style: 'ghost', skin: 0xe4f2f4, top: 0xb8d0e0, hat: 'jeonrip', hair: false, eye: 0x22305e, arm: 'sword' },
};
const MC = new Map();
const mlook = k => { let s = MC.get(k); if (!s) { s = k === 'tiger' ? miniTiger().flipped() : mini(MINI[k]); if (['goblin', 'ogre', 'ghost'].includes(k)) s = s.flipped(); MC.set(k, s); } return s; };
function bakeMini(pale) {
  const s = new Spr(320, 180), R = rng(3);
  s.rect(0, 0, 320, 34, 0x3c4a94); s.rect(0, 34, 320, 14, 0x8c78b8); s.rect(0, 48, 320, 10, 0xf0a488); s.rect(0, 58, 320, 12, 0xffd08c);
  s.ell(236, 52, 9, 9, 0xfff8d8); for (const [x, y, w] of [[60, 30, 26], [150, 22, 20], [280, 32, 24]]) { s.ell(x, y, w / 2, 3, 0xf4b8a0); s.ell(x - 4, y - 2, w / 4, 3, 0xffe4c0); }
  for (let x = 0; x < 320; x++) { for (let y = Math.round(ridge(x * 2, 98, 20, 0.021, 1.3) / 2); y < 72; y++) s.set(x, y, 0x8c80c0); }
  for (let x = 0; x < 320; x++) { for (let y = Math.round(ridge(x * 2, 126, 10, 0.043, 2.2) / 2); y < 74; y++) s.set(x, y, 0x2e5660); }
  s.rect(126, 56, 50, 5, 0xb8b0b0); s.rect(146, 52, 10, 9, 0xa8a0a8); s.rect(149, 56, 4, 5, 0x3a3c5c); s.hl(142, 160, 51, 0x343858); s.hl(144, 158, 50, 0x343858); s.hl(145, 157, 47, 0x343858); s.rect(147, 48, 8, 2, 0x9a3a3c);
  const PA = pale ? 0xe4ecc0 : 0xd4b478, PB = pale ? 0x98b47c : 0xb89460;
  if (pale) s.rect(0, 70, 320, 110, 0xe4ecc0); else { s.rect(0, 70, 320, 110, 0x84b84c); s.rect(0, 70, 320, 12, 0xa8c85c); s.rect(0, 120, 320, 60, 0x5c9c44); }
  for (let x = 0; x < 320; x++) { const cy = 107 + Math.sin(x * 0.024 + 0.5) * 6; for (let y = Math.round(cy - 10); y < cy + 10; y++) s.set(x, y, PA); if (!pale || x % 3 < 2) { s.set(x, Math.round(cy + 9), PB); if (pale) s.set(x, Math.round(cy - 10), PB); } }
  for (let x = 3; x < 320; x += 11) s.vl(x, 69, 73, 0x84522c); s.hl(0, 319, 70, 0xb8844a); s.hl(0, 319, 72, 0xb8844a);
  for (let i = 0; i < 46; i++) { const x = (R() * 320) | 0, y = 78 + ((R() * 62) | 0); if (!pale && (s.get(x, y) === PA || s.get(x, y) === PB)) continue; s.vl(x, y - 2, y, 0x2c6440); s.set(x + 1, y - 1, 0x2c6440); if (i % 5 === 0) s.set(x - 1, y - 2, 0xffd24a); }
  const tree = (x, y) => { s.vl(x, y - 12, y, 0x54301e); s.vl(x + 1, y - 12, y, 0x54301e); const t = new Spr(320, 180); t.ell(x - 5, y - 13, 7, 3, 0x1e5a40); t.ell(x + 7, y - 17, 7, 3, 0x1e5a40); t.ell(x + 1, y - 22, 9, 3.5, 0x1e5a40); s.blit(t.outline(0x0c2430), -1, -1); s.hl(x - 5, x + 5, y - 24, 0x3a8448); s.hl(x - 9, x - 3, y - 15, 0x3a8448); s.hl(x + 3, x + 10, y - 19, 0x3a8448); };
  tree(28, 84); tree(226, 78); tree(304, 80);
  return s;
}
export function miniHud(g, lut) {
    // 위 띠
    fr(g, 0, 0, 320, 13, 0x141a3c); fr(g, 0, 13, 320, 1, 0xe09a28); txt(g, '첫째 고개', 4, 2, { f: 9, c: 0xffd24a });
    for (let i = 0; i < 6; i++) { const x = 70 + i * 14; fr(g, x, 4, 7, 6, INK); fr(g, x + 1, 5, 5, 4, i === 2 ? 0xffd24a : i < 2 ? 0x26346e : i === 5 ? 0xc83232 : 0x3c5cae); if (i < 5) fr(g, x + 7, 6, 7, 1, i < 2 ? 0xe09a28 : 0x38508c); }
    txt(g, '고개 호랑이', 160, 16, { f: 9, a: 'c', c: 0xfffbe4, ol: INK }); fr(g, 106, 28, 108, 6, INK); fr(g, 107, 29, 106, 4, 0x4a1230); fr(g, 107, 29, 74, 4, lut ? 0xe4ecc0 : 0xc83232);
    fr(g, 262, 3, 7, 7, INK); fr(g, 263, 4, 5, 5, 0xffd24a); fr(g, 265, 6, 1, 1, INK); txt(g, '150', 272, 2, { f: 9, c: 0xfffbe4 }); fr(g, 304, 3, 11, 2, 0xfffbe4); fr(g, 304, 6, 11, 2, 0xfffbe4); fr(g, 304, 9, 11, 2, 0xfffbe4);
    // 아래 띠: 사기 · 패 · 명령
    fr(g, 0, 142, 320, 38, 0x141a3c); fr(g, 0, 142, 320, 1, 0xe09a28);
    txt(g, '사기 7', 4, 146, { f: 9, c: 0xfffbe4 }); for (let i = 0; i < 10; i++) { const x = 4 + (i % 5) * 9, y = 160 + Math.floor(i / 5) * 9; fr(g, x, y, 7, 7, INK); fr(g, x + 1, y + 1, 5, 5, i < 7 ? 0xffd24a : 0x38508c); if (i >= 7) fr(g, x + 2, y + 2, 3, 3, 0x141a3c); }
    [['atk', 3, null], ['unit', 2, 'archer'], ['sup', 2, null], ['unit', 2, 'priest'], ['atk', 2, null]].forEach(([kind, cost, spr], i) => { const x = 58 + i * 34, y = 147 - (i === 2 ? 3 : 0), col = { atk: 0xc83232, unit: 0x3c5cae, sup: 0x2e8c64 }[kind];
      fr(g, x, y, 30, 30, INK); fr(g, x + 1, y + 1, 28, 28, 0xf8ecc0); fr(g, x + 1, y + 1, 28, 5, col); if (i === 2) { fr(g, x - 1, y - 1, 32, 1, 0xffd24a); fr(g, x - 1, y + 30, 32, 1, 0xffd24a); fr(g, x - 1, y, 1, 30, 0xffd24a); fr(g, x + 30, y, 1, 30, 0xffd24a); }
      if (spr) draw(g, mlook(spr), x + 14, y + 28); else if (i === 0) { for (const dx of [8, 13, 18]) { fr(g, x + dx, y + 10, 1, 12, 0x84522c); fr(g, x + dx - 1, y + 21, 3, 2, 0x8c98b0); fr(g, x + dx - 1, y + 9, 3, 2, col); } } else if (i === 2) { fr(g, x + 9, y + 11, 12, 12, INK); fr(g, x + 10, y + 12, 10, 10, col === 0x2e8c64 ? 0xc83232 : col); fr(g, x + 12, y + 14, 6, 6, 0xf8ecc0); fr(g, x + 14, y + 16, 2, 2, 0x3c5cae); } else { fr(g, x + 9, y + 10, 12, 5, 0x6a3c94); fr(g, x + 14, y + 15, 3, 4, 0xe09a28); fr(g, x + 12, y + 19, 3, 4, 0xe09a28); fr(g, x + 11, y + 23, 2, 2, 0xe09a28); }
      fr(g, x - 3, y - 3, 11, 12, INK); fr(g, x - 2, y - 2, 9, 10, 0xffd24a); txt(g, cost, x + 3, y - 2, { f: 9, a: 'c', c: INK }); });
    for (const [x, lab, col, hi] of [[236, '대기', 0x3c5cae, 0x6c9ce0], [278, '돌격', 0xc83232, 0xec6a3c]]) { fr(g, x, 150, 38, 22, INK); fr(g, x + 1, 151, 36, 20, col); fr(g, x + 1, 151, 36, 2, hi); txt(g, lab, x + 19, 156, { f: 9, a: 'c', c: 0xfffbe4, sh: INK }); }
}
function makeMini(lut) {
  let BG = null; const cache = new Map();
  return (g, t) => {
    if (!BG) BG = bakeMini(!!lut);
    g.save(); g.scale(2, 2); g.drawImage(BG.canvas(), 0, 0);
    const list = UNITS.map(([k, x, y, ph]) => ({ k, x: Math.round(x / 2), y: Math.round(y / 2), ph })).sort((a, b) => a.y - b.y);
    for (const u of list) { const sp = mlook(u.k), w = u.k === 'tiger' ? 14 : 5; fr(g, u.x - w, u.y, w * 2, 2, 'rgba(20,24,50,0.3)'); }
    for (const u of list) { const sp = mlook(u.k), foe = ['goblin', 'ogre', 'ghost', 'tiger'].includes(u.k), hit = foe && Math.floor(t * 2 + u.ph) % 7 === 0 && (t * 2 + u.ph) % 1 < 0.15; draw(g, hit ? tinted(sp, 0xffffff) : sp, u.x, u.y + (Math.sin(t * 3.2 + u.ph * 2) > 0.3 ? -1 : 0)); }
    for (let k = 0; k < 4; k++) { const p = ((t * 0.9 + k * 0.27) % 1), x = 88 + k * 2 + (110 + k * 4) * p, y = 85 + k * 3 - Math.sin(p * Math.PI) * 23; fr(g, x, y, 3, 1, 0xf4f6f4); fr(g, x + 3, y, 1, 1, 0xccd8e4); }
    { const p = (t * 0.8) % 1; txt(g, '-18', 199, 76 - p * 6, lut ? { f: 9, a: 'c', c: INK, ol: 0xffffff } : { f: 9, a: 'c', c: 0xffffff, ol: 0x8a1c30 }); txt(g, '+12', 152, 72 - ((t * 0.8 + 0.5) % 1) * 6, lut ? { f: 9, a: 'c', c: INK, ol: 0xffffff } : { f: 9, a: 'c', c: 0xc8f098, ol: 0x0e2e38 }); }
    miniHud(g, lut);
    g.restore();
    if (lut) grade(g, lut, cache);
  };
}
// 네 가지 색만: 밝기를 네 단으로 접는다 (옛 휴대 게임기 느낌)
const FOUR = [0x1c2a2c, 0x486858, 0x98b47c, 0xe4ecc0];
const four = c => { const L = lum(c); return FOUR[L < 0.2 ? 0 : L < 0.46 ? 1 : L < 0.74 ? 2 : 3]; };

export const BATTLES = {
  dusk: { name: '노을', draw: makeBattle({ theme: 'dusk' }) },
  rich: { name: '노을 · 고퀄 빛', draw: makeBattle({ theme: 'dusk', rich: true }) },
  night: { name: '달밤', draw: makeBattle({ theme: 'night' }) },
  day: { name: '밝은 낮', draw: makeBattle({ theme: 'day' }) },
  ink: { name: '수묵 한지', draw: makeBattle({ theme: 'day', lut: sumuk }) },
  mini: { name: 'G 미니 (8비트풍)', draw: makeMini(null) },
  mini4: { name: '미니 · 네 가지 색', draw: makeMini(four) },
};
