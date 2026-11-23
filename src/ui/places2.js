// 길 위의 새 장소들: 무당집 · 서당 · 투전판 · 의병 모집소 · 숨은 길.
// 장터·주막·대장간처럼 그 장소를 붓으로 칠한 한 장면으로 통째로 그린다 (정지한 그림은 한 번 굽고, 불빛·천·연기·인형만 매 장면).
// 고를 것은 오른쪽 아래 옻칠 이름판, 떠나는 단추는 왼쪽 아래, 한 일의 결과는 위쪽 두루마리에 잠깐 뜬다.
import { W, H } from '../config.js';
import { TAU, INK, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, poly, line, path, makeCanvas, rng, clamp, easeOutBack } from '../render/draw.js';
import { part, curve, P, R as RECT, E } from '../render/figures.js';
import { button, icon, panel, stamp, tapped, isDown, C, plaque, scroll, hangSign, shine } from './ui.js';
import { cardFace } from './cards.js';
import { Overlay } from './overlays.js';
import { G, save, act, place, PLACE_COST, BET_WIN, curseCount, canUp, hiddenFight } from '../state.js';
import { CARDS, cardName, isUnit } from '../data/cards.js';
import { UNITS } from '../data/units.js';
import { MAX_CAP } from '../sim/battle.js';
import { puppet } from './theater.js';
import { glow, motes, beams } from './places.js';
import { pal as PAL, mix as MIX, vgrad as VG, dab as dab0, mountain as MOUNT, cloud as PCLOUD, tuft as PTUFT, umbrellaPine as PPINE, bloomTree as PBLOOM, rock as PROCK, stroke as stroke0 } from '../render/painted.js';
import { symbol } from '../render/symbols.js';
import { sfx } from '../audio.js';
import { juice } from './juice.js';

const S = 1.5;
// 붓 자국 (칠한 뒤 투명도를 되돌린다: 뒤따르는 면이 비치지 않게)
const DAB = (g, ...a) => { dab0(g, ...a); g.globalAlpha = 1; };
const S2 = (g, ...a) => { stroke0(g, ...a); g.globalAlpha = 1; };
// 기와지붕 (앞에서 본 팔작지붕): 짧은 용마루, 끝이 들린 처마 곡선, 기왓골, 막새, 처마 밑 그늘과 서까래 끝
function giwa(g, cx, ey, w, h, o = {}) {
  const col = o.col || '#4a505e', lift = o.lift === undefined ? h * 0.3 : o.lift, rw = w * (o.ridge || 0.6), top = ey - h, hw = w / 2;
  const eave = x => { const u = (x - cx) / hw; return ey - lift * Math.pow(Math.abs(u), 4) + (o.sag || 5) * (1 - u * u); };
  const shape = () => { g.beginPath(); g.moveTo(cx - rw / 2, top); g.lineTo(cx + rw / 2, top); g.quadraticCurveTo(cx + hw * 0.86, top + h * 0.42, cx + hw, eave(cx + hw)); for (let x = cx + hw; x >= cx - hw; x -= 6) g.lineTo(x, eave(x)); g.quadraticCurveTo(cx - hw * 0.86, top + h * 0.42, cx - rw / 2, top); g.closePath(); };
  // 처마 밑 그늘과 서까래 끝
  g.globalAlpha = 1; g.fillStyle = 'rgba(14,10,12,0.55)'; g.beginPath(); for (let x = cx - hw + 10; x <= cx + hw - 10; x += 6) { const y = eave(x) + (o.under || 18); if (x === cx - hw + 10) g.moveTo(x, y); else g.lineTo(x, y); } for (let x = cx + hw - 10; x >= cx - hw + 10; x -= 6) g.lineTo(x, eave(x) - 2); g.closePath(); g.fill();
  for (let x = cx - hw + 18; x <= cx + hw - 18; x += 13) { const y = eave(x) + 7; g.fillStyle = '#6a4630'; g.beginPath(); g.arc(x, y, 3.4, 0, TAU); g.fill(); g.fillStyle = '#c8a070'; g.beginPath(); g.arc(x - 0.8, y - 0.8, 1.6, 0, TAU); g.fill(); }
  shape(); g.fillStyle = VG(g, top, ey, [[0, MIX(col, '#000000', 0.35)], [0.7, col], [1, MIX(col, '#c8d0dc', 0.18)]]); g.fill();
  g.save(); shape(); g.clip();
  // 기왓골: 용마루에서 처마로 내리긋는 골, 수키와 줄은 밝게
  for (let x = cx - hw - 20, k = 0; x <= cx + hw + 20; x += 10, k++) { const tx = cx + (x - cx) * rw / w, ex = x, eyy = eave(Math.max(cx - hw, Math.min(cx + hw, x))); g.globalAlpha = k % 2 ? 0.5 : 0.28; g.strokeStyle = k % 2 ? MIX(col, '#000000', 0.45) : MIX(col, '#e8eef4', 0.4); g.lineWidth = k % 2 ? 2.2 : 1.6; g.beginPath(); g.moveTo(tx, top); g.quadraticCurveTo(ex - (ex - cx) * 0.06, top + h * 0.55, ex, eyy + 4); g.stroke(); }
  g.globalAlpha = 0.12; for (let y = top + 10; y < ey; y += 9) { g.fillStyle = '#000'; g.fillRect(cx - hw, y, w, 1.4); }
  g.globalAlpha = 0.2; g.fillStyle = '#e8eef8'; g.beginPath(); g.ellipse(cx - w * 0.18, top + h * 0.38, w * 0.22, h * 0.16, -0.08, 0, TAU); g.fill();
  g.restore(); g.globalAlpha = 1;
  // 막새: 처마 끝의 둥근 기와 머리
  for (let x = cx - hw + 6; x <= cx + hw - 6; x += 10) { const y = eave(x) + 1; g.fillStyle = MIX(col, '#000000', 0.3); g.beginPath(); g.arc(x, y, 4.4, 0, TAU); g.fill(); g.fillStyle = MIX(col, '#e8eef4', 0.35); g.beginPath(); g.arc(x - 1, y - 1, 1.8, 0, TAU); g.fill(); }
  // 용마루와 끝을 들어 올린 장식
  const rx0 = cx - rw / 2 - 12, rx1 = cx + rw / 2 + 12; g.fillStyle = VG(g, top - 10, top + 6, [[0, MIX(col, '#000000', 0.2)], [1, MIX(col, '#000000', 0.5)]]); g.beginPath(); g.moveTo(rx0, top + 5); g.lineTo(rx0 - 6, top - 10); g.quadraticCurveTo(rx0 + 10, top - 6, rx0 + 22, top - 7); g.lineTo(rx1 - 22, top - 7); g.quadraticCurveTo(rx1 - 10, top - 6, rx1 + 6, top - 10); g.lineTo(rx1, top + 5); g.closePath(); g.fill();
  g.strokeStyle = MIX(col, '#f0f4f8', 0.4); g.lineWidth = 1.4; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(rx0 + 18, top - 6); g.lineTo(rx1 - 18, top - 6); g.stroke(); g.globalAlpha = 1;
  return eave;
}
// 붓으로 칠한 사람 그림자 (앉은 노름꾼·구경꾼): 상투 튼 머리, 둥근 어깨, 등불 쪽 가장자리에 빛 테
function sitter(g, x, y, s, lit, o = {}) {
  g.save(); g.translate(x, y); g.scale(o.flip ? -s : s, s); const c = o.col || '#1a1214';
  g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 48, 16, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-34, 2); g.quadraticCurveTo(-40, -58, -6, -70); g.quadraticCurveTo(28, -62, 32, 2); g.closePath(); g.fill();
  g.beginPath(); g.arc(-2, -88, 17, 0, TAU); g.fill(); g.beginPath(); g.ellipse(-2, -108, 6, 7, 0, 0, TAU); g.fill();
  if (o.arm) { g.beginPath(); g.moveTo(16, -50); g.quadraticCurveTo(44, -42, 56, -54); g.lineTo(58, -46); g.quadraticCurveTo(44, -32, 12, -36); g.closePath(); g.fill(); }
  if (lit) { g.strokeStyle = lit; g.lineWidth = 2.4; g.globalAlpha = 0.75; g.beginPath(); g.moveTo(31, 0); g.quadraticCurveTo(28, -58, -4, -70); g.stroke(); g.beginPath(); g.arc(-2, -88, 17, -1.6, 0.6); g.stroke(); g.beginPath(); g.arc(-2, -108, 7, -1.4, 0.6); g.stroke(); g.globalAlpha = 1; }
  g.restore();
}

const bake = fn => { const c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); fn(g); g.globalAlpha = 1; return c; };
const once = (k, fn) => { const m = once.m || (once.m = new Map()); let c = m.get(k); if (!c) { c = bake(fn); m.set(k, c); } return c; };
const OBANG = ['#c8402f', '#e0b23c', '#f6efdc', '#2f4d7e', '#3f8a6a'];
const vignette = (g, a = 0.55) => { const vg = g.createRadialGradient(W / 2, H * 0.55, 300, W / 2, H * 0.55, 820); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, `rgba(0,0,0,${a})`); g.globalAlpha = 1; g.fillStyle = vg; g.fillRect(0, 0, W, H); };

// ── 함께 쓰는 그림 ──
// 말풍선: (cx, y) 위에 상자, 꼬리는 tx 아래로
function bubble(g, s, cx, y, tx, k) {
  g.save(); g.globalAlpha = clamp(k / 0.25, 0, 1); g.font = `400 18px ${FONT_B}`;
  const w = Math.min(470, g.measureText(s).width + 40), two = g.measureText(s).width + 40 > 470, h = two ? 66 : 44, bx = clamp(cx - w / 2, 16, W - w - 16), by = y - (two ? 22 : 0), t0 = clamp(tx, bx + 26, bx + w - 26);
  rr(g, bx + 3, by + 4, w, h, 12, 'rgba(0,0,0,0.4)'); rr(g, bx, by, w, h, 12, '#fffaf0', INK, 2);
  poly(g, [t0 - 12, by + h - 2, t0 + 12, by + h - 2, t0 + 2, by + h + 20], '#fffaf0'); line(g, [t0 - 12, by + h - 1, t0 + 2, by + h + 20, t0 + 12, by + h - 1], INK, 2);
  if (two) textBlock(g, s, bx + w / 2, by + 21, w - 30, 24, { size: 18, font: FONT_B }); else text(g, s, bx + w / 2, by + 23, { size: 18, font: FONT_B, maxW: w - 24 });
  g.restore();
}
// 선비: 갓 쓰고 흰 도포 입은 어른 (서당 훈장 · 의병장). seated 면 책상 앞에 앉는다. hold = book · switch · sword · scroll
function seonbi(g, x, y, s, t, o = {}) {
  const robe = o.robe || '#f3eee0', robeD = '#cfc6b0', skin = '#ecc9a0', beard = o.beard === 'black' ? '#2a2420' : '#f4f2ea', nod = o.talk ? Math.sin(t * 7) * 0.8 : Math.sin(t * 1.4) * 0.5;
  g.save(); g.translate(x, y); g.scale(s, s);
  g.globalAlpha = 0.28; ell(g, 0, 2, 34, 6, '#1a1008'); g.globalAlpha = 1;
  if (o.seated) {
    part(g, p => { p.moveTo(-40, 0); p.quadraticCurveTo(-44, -22, -22, -30); p.lineTo(22, -30); p.quadraticCurveTo(44, -22, 40, 0); p.closePath(); }, robe, p => { p.moveTo(-40, 0); p.lineTo(40, 0); p.lineTo(40, -10); p.lineTo(-40, -10); p.closePath(); }, { shc: robeD, lw: 1.8 });
  } else {
    part(g, p => { p.moveTo(-17, -66); p.lineTo(17, -66); p.lineTo(24, -2); p.lineTo(-24, -2); p.closePath(); }, robe, p => { p.moveTo(4, -66); p.lineTo(17, -66); p.lineTo(24, -2); p.lineTo(8, -2); p.closePath(); }, { shc: robeD, lw: 1.8 });
    for (const sx of [-9, 9]) rr(g, sx - 5, -4, 10, 5, 2, '#3a2a22', INK, 1);   // 신
  }
  const by = o.seated ? -30 : -66;
  // 몸통과 넓은 소매
  part(g, p => { p.moveTo(-18, by - 36); p.quadraticCurveTo(0, by - 44, 18, by - 36); p.lineTo(20, by + 4); p.lineTo(-20, by + 4); p.closePath(); }, robe, p => { p.moveTo(6, by - 40); p.lineTo(18, by - 36); p.lineTo(20, by + 4); p.lineTo(8, by + 4); p.closePath(); }, { shc: robeD, lw: 1.8 });
  line(g, [-19, by - 6, 19, by - 6], '#2f4d7e', 2.4); line(g, [6, by - 6, 10, by + 18], '#2f4d7e', 1.6);   // 세조대
  for (const sx of [-1, 1]) part(g, p => { p.moveTo(sx * 16, by - 34); p.quadraticCurveTo(sx * 34, by - 22, sx * 30, by - 2); p.lineTo(sx * 14, by - 4); p.closePath(); }, robe, null, { lw: 1.6 });
  part(g, p => { p.moveTo(-6, by - 40); p.lineTo(0, by - 26); p.lineTo(6, by - 40); }, '#fbf9f2', null, { lw: 1.2 });
  // 든 것
  if (o.hold === 'book') { part(g, RECT(-16, by - 22, 32, 16), '#2f4d7e', RECT(-16, by - 9, 32, 3), { lw: 1.2 }); line(g, [0, by - 22, 0, by - 6], '#e8dcc0', 1); }
  else if (o.hold === 'switch') { const a = -0.6 + Math.sin(t * 2.2) * 0.25; g.save(); g.translate(24, by - 10); g.rotate(a); line(g, [0, 0, 0, -46], INK, 2.6); line(g, [0, 0, 0, -46], '#8a6a3a', 1.2); g.restore(); }
  else if (o.hold === 'sword') { g.save(); g.translate(-22, by + 2); g.rotate(-0.25); rr(g, -2.4, -4, 4.8, 54, 2, '#2a1a14', INK, 1.2); rr(g, -5, -6, 10, 4, 1.5, '#b8862a', INK, 1); rr(g, -2, -24, 4, 18, 1.5, '#5a3a22', INK, 1); g.restore(); }
  else if (o.hold === 'scroll') { rr(g, -22, by - 24, 44, 9, 4, '#f6efdc', INK, 1.3); for (const sx of [-1, 1]) rr(g, sx * 22 - 3, by - 26, 6, 13, 3, '#8a5a30', INK, 1); }
  // 머리와 갓
  g.save(); g.translate(0, by - 44); g.rotate(nod * 0.03);
  ell(g, 0, -14, 12, 13.5, skin, INK, 1.6);
  for (const sx of [-1, 1]) { line(g, [sx * 7, -16, sx * 2.6, -15], INK, 1.6); }
  line(g, [-6, -21, -1.6, -22], INK, 1.2); line(g, [6, -21, 1.6, -22], INK, 1.2);
  part(g, p => { p.moveTo(-9, -8); p.quadraticCurveTo(0, -4, 9, -8); p.quadraticCurveTo(10, 8 + (o.beard === 'black' ? 0 : 8), 0, 20 + (o.beard === 'black' ? 0 : 10)); p.quadraticCurveTo(-10, 8 + (o.beard === 'black' ? 0 : 8), -9, -8); p.closePath(); }, beard, null, { lw: 1.2 });
  if (o.talk) ell(g, 0, -5, 2.6, 1.4 + Math.abs(Math.sin(t * 9)) * 1.6, '#5a2a22');
  part(g, RECT(-8, -40, 16, 13), 'rgba(26,24,32,0.92)', null, { lw: 1.3 });
  g.globalAlpha = 0.85; ell(g, 0, -27, 28, 5.4, '#1a1820', INK, 1.4); g.globalAlpha = 1; line(g, [-24, -27, 24, -27], 'rgba(255,255,255,0.18)', 1);
  line(g, [-10, -26, -8, -4], 'rgba(20,18,24,0.7)', 1); line(g, [10, -26, 8, -4], 'rgba(20,18,24,0.7)', 1);
  g.restore(); g.restore();
}
// 학동: 댕기머리를 땋아 내린 아이가 책을 펴 들고 몸을 흔들며 읽는다
function child(g, x, y, s, t, ph, col) {
  const sw = Math.sin(t * 2.6 + ph) * 0.09;
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(sw);
  g.globalAlpha = 0.25; ell(g, 0, 1, 22, 4, '#1a1008'); g.globalAlpha = 1;
  part(g, p => { p.moveTo(-22, 0); p.quadraticCurveTo(-24, -14, -12, -18); p.lineTo(12, -18); p.quadraticCurveTo(24, -14, 22, 0); p.closePath(); }, '#e8e2d2', null, { lw: 1.5 });
  part(g, p => { p.moveTo(-12, -40); p.quadraticCurveTo(0, -45, 12, -40); p.lineTo(13, -16); p.lineTo(-13, -16); p.closePath(); }, col, p => { p.moveTo(4, -42); p.lineTo(12, -40); p.lineTo(13, -16); p.lineTo(6, -16); p.closePath(); }, { lw: 1.5 });
  line(g, [-5, -40, 2, -30], '#fbf7ec', 2); rr(g, 1, -32, 8, 3, 1, RED);
  part(g, RECT(-13, -28, 26, 11), '#e9d9b0', RECT(-13, -20, 26, 3), { lw: 1.1 }); line(g, [0, -28, 0, -17], '#8a6a3a', 0.8);
  ell(g, 0, -52, 9, 10, '#efcfa6', INK, 1.4);
  part(g, p => { p.moveTo(-9.5, -54); p.quadraticCurveTo(-8, -64, 0, -64); p.quadraticCurveTo(8, -64, 9.5, -54); p.quadraticCurveTo(4, -58, 0, -57); p.quadraticCurveTo(-4, -58, -9.5, -54); p.closePath(); }, '#1e1a1c', null, { lw: 1 });
  line(g, [-8, -54, -10, -30], '#1e1a1c', 3); rr(g, -13, -32, 6, 7, 2, RED, INK, 0.8);   // 댕기
  for (const sx of [-1, 1]) line(g, [sx * 5, -50, sx * 2, -49.5], INK, 1.3);
  ell(g, 0, -44.5, 2, 1.2 + Math.abs(Math.sin(t * 5 + ph)) * 1.2, '#8a3a2a');
  g.restore();
}
// 기다란 투전 한 장 (끗 수만큼 점과 획). face = 앞면이 보이는 정도(0~1)
function tujeon(g, x, y, s, n, face, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(Math.max(0.06, Math.abs(face * 2 - 1)) * s, s);
  rr(g, -12, -46, 24, 92, 4, 'rgba(0,0,0,0.35)'); rr(g, -13, -48, 26, 92, 4, face > 0.5 ? '#fbf6e6' : '#7a2a26', INK, 1.6);
  if (face > 0.5) { rr(g, -10, -45, 20, 10, 2, '#b8322a'); for (let k = 0; k < n; k++) ell(g, (k % 2 ? 4.5 : -4.5), -24 + Math.floor(k / 2) * 12, 3.4, 3.4, INK); line(g, [-7, 36, 7, 36], INK, 2); }
  else { rr(g, -9, -44, 18, 84, 2, null, 'rgba(240,210,124,0.6)', 1); for (let k = 0; k < 4; k++) poly(g, [0, -30 + k * 20, 6, -22 + k * 20, 0, -14 + k * 20, -6, -22 + k * 20], null, 'rgba(240,210,124,0.6)', 1); }
  g.restore();
}
// 오색 천 한 가닥 (바람에 날린다)
function cloth(g, x, y, l, col, t, ph, k = 1) {
  path(g, p => { const w = 5.6 * k; p.moveTo(x - w / 2, y); for (let i = 1; i <= 6; i++) { const q = i / 6; p.lineTo(x - w / 2 + Math.sin(t * 3.2 + ph + q * 3) * 9 * q * k + q * 8 * k, y + l * q); } for (let i = 6; i >= 0; i--) { const q = i / 6; p.lineTo(x + w / 2 + Math.sin(t * 3.2 + ph + q * 3) * 9 * q * k + q * 8 * k, y + l * q); } p.closePath(); }, col, 'rgba(30,20,20,0.6)', 0.8);
}
// 금줄: 새끼줄에 흰 종이 술을 듬성듬성 끼운다
function geumjul(g, x0, y0, x1, y1, sag, t, n = 6) {
  const at = q => [x0 + (x1 - x0) * q, y0 + (y1 - y0) * q + Math.sin(q * Math.PI) * sag];
  g.beginPath(); for (let i = 0; i <= 24; i++) { const [x, y] = at(i / 24); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.strokeStyle = INK; g.lineWidth = 5; g.stroke(); g.strokeStyle = '#d9bc78'; g.lineWidth = 3; g.stroke();
  for (let i = 0; i < 24; i += 2) { const [x, y] = at(i / 24); line(g, [x - 2, y - 2, x + 2, y + 2], '#8a6a3a', 1); }
  for (let i = 1; i <= n; i++) { const [x, y] = at(i / (n + 1)), sw = Math.sin(t * 2 + i) * 0.12; g.save(); g.translate(x, y); g.rotate(sw); poly(g, [-3.6, 0, 3.6, 0, 5.6, 9, 1, 12, 4.6, 21, -2, 23], '#fbf7ec', INK, 0.9); g.restore(); }
}

// ═════════════════════════ 장소의 틀 ═════════════════════════
// cfg: bg() · title · hello · bub [가운데 x, y, 꼬리 x] · leave(떠나는 말)
class PlaceScene extends Overlay {
  constructor(o, cfg) { super(); this.onDone = o.onDone; this.cfg = cfg; this.done = {}; this.line = cfg.hello; this.lineT = 0; this.res = null; this.resT = 0; this.pick = null; this.joy = 0; }
  say(s) { this.line = s; this.lineT = 0; }
  show(head, lines) { this.res = [head].concat((lines || []).filter(Boolean)); this.resT = 0; this.joy = 1.2; save(); }
  busy() { return this.left || this.sub || this.pick || this.deal; }
  acts() { return []; }
  scene() {}
  draw(g, dt) {
    const r = G.run, t = this.t, cf = this.cfg; this.lineT += dt; if (this.joy > 0) this.joy -= dt;
    g.drawImage(cf.bg(), 0, 0, W, H);
    this.scene(g, t, dt);
    if (this.line) bubble(g, this.line, cf.bub[0], cf.bub[1], cf.bub[2], this.lineT);
    hangSign(g, 640, 8, cf.title, { w: Math.max(240, cf.title.length * 30 + 80), h: 50, size: 26, rope: false });
    panel(g, 1078, 14, 186, 48, 'tag'); icon.coin(g, 1104, 38, 13); text(g, `엽전 ${r.gold}`, 1180, 39, { size: 22, font: FONT_B, maxW: 140 });
    if (!this.pick && button(g, 'plDeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
    // 고를 것: 오른쪽 아래 옻칠 이름판 (아래쪽에 붙여 세운다)
    const list = this.acts(), pw = 360, ph = 76, px = W - pw - 26;
    list.forEach((a, n) => {
      const py = 452 + (3 - list.length + n) * (ph + 10), why = a.why ? a.why() : null, on = !why && !this.busy();
      if (on && tapped('pl' + a.id, px, py, pw, ph)) { sfx('card'); a.go(); }
      const dn = on && isDown('pl' + a.id, px, py, pw, ph);
      g.save(); if (why) g.globalAlpha = 0.6;
      const yy = plaque(g, px, py, pw, ph, { down: dn, glow: on });
      text(g, a.label + (a.cost ? ` · 엽전 ${a.cost}` : ''), px + 30, yy + 31, { size: 22, font: FONT_B, align: 'left', maxW: pw - 70 });
      text(g, why || a.sub, px + 31, yy + 55, { size: 15.5, align: 'left', fill: why ? RED : '#4a3a2a', maxW: pw - 60, weight: 400 });
      if (!why) text(g, '▶', px + pw - 30, yy + ph / 2 + 1, { size: 16, fill: '#8a5a2c' });
      g.restore();
    });
    if (!this.busy() && button(g, 'plLeave', 30, 640, 280, 62, cf.leave || '길을 떠난다', { size: 26 })) { this.left = true; sfx('click'); this.onDone(); }
    // 한 일의 결과: 위쪽 두루마리에 잠깐
    if (this.res) { this.resT += dt; const n = this.res.length, life = 2.6 + n * 0.5, k = clamp(this.resT / 0.25, 0, 1) * clamp((life - this.resT) / 0.4, 0, 1); if (this.resT > life) this.res = null; else if (k > 0) { const h = 44 + n * 30; g.save(); g.globalAlpha = k; scroll(g, 380, 92, 520, h); this.res.forEach((s, i) => text(g, s, 640, 122 + i * 30, { size: i ? 17 : 19, font: FONT_B, fill: i ? (/잃|부정|-\d|잡념/.test(s) && !/씻겨|사라/.test(s) ? RED : TEAL) : INK, maxW: 480 })); g.restore(); } }
    if (this.pick) this.drawPick(g, dt);
  }
  // 고르기 창: 패 고르기(cards) · 시험(quiz)
  drawPick(g, dt) {
    const pk = this.pick; pk.t = (pk.t || 0) + dt; const k = easeOutBack(clamp(pk.t / 0.35, 0, 1));
    g.fillStyle = `rgba(10,8,18,${0.72 * clamp(pk.t / 0.2, 0, 1)})`; g.fillRect(0, 0, W, H);
    g.save(); g.translate(640, 360); g.scale(0.9 + 0.1 * k, 0.9 + 0.1 * k); g.translate(-640, -360);
    if (pk.kind === 'cards') {
      const n = pk.opts.length, many = n > 3, cols = many ? Math.min(6, n) : n, cw = many ? 128 : 216, ch = many ? 172 : 300, gap = many ? 16 : 30, rows = Math.ceil(n / cols), sh = 150 + rows * (ch + 14) + (pk.cancel ? 60 : 0), sy = clamp(360 - sh / 2, 30, 200), x0 = 640 - (cols * cw + (cols - 1) * gap) / 2;
      scroll(g, 640 - Math.max(cols * (cw + gap) + 60, 560) / 2, sy, Math.max(cols * (cw + gap) + 60, 560), sh);
      text(g, pk.title, 640, sy + 42, { size: 26, font: FONT_B }); text(g, pk.sub, 640, sy + 74, { size: 16, fill: '#5a4a3a', weight: 400, maxW: 640 });
      pk.opts.forEach((o, i) => {
        const x = x0 + (i % cols) * (cw + gap), y = sy + 100 + Math.floor(i / cols) * (ch + 14), dn = isDown('pk' + i, x, y, cw, ch);
        if (pk.t > 0.3 && tapped('pk' + i, x, y, cw, ch)) { sfx('star'); const f = pk.onPick; this.pick = null; f(i); }
        g.save(); g.translate(0, dn ? 3 : 0); if (!many) glow(g, x + cw / 2, y + ch / 2, ch * 0.7, '255,210,130', 0.12 + 0.06 * Math.sin(pk.t * 3 + i)); cardFace(g, o, x, y, cw, ch); g.restore();
      });
      if (pk.cancel && button(g, 'pkNo', 520, sy + sh - 66, 240, 52, '그만두기', { style: 'paper', size: 22 })) { this.pick = null; sfx('click'); }
    } else if (pk.kind === 'quiz') {
      scroll(g, 260, 96, 760, 470);
      text(g, '훈장의 시험', 640, 138, { size: 26, font: FONT_B, fill: '#3f5f86' });
      textBlock(g, pk.q, 640, 186, 660, 30, { size: 23, font: FONT_B });
      pk.a.forEach((s, i) => {
        const x = 360, y = 250 + i * 92, w = 560, h = 76, shown = pk.ans >= 0, right = i === pk.right, mine = i === pk.ans;
        if (!shown && pk.t > 0.3 && tapped('qz' + i, x, y, w, h)) { pk.ans = i; pk.at = 0; sfx(i === pk.right ? 'star' : 'deny'); }
        const yy = plaque(g, x, y, w, h, { down: !shown && isDown('qz' + i, x, y, w, h), glow: !shown });
        text(g, `${['ㄱ', 'ㄴ', 'ㄷ'][i]}.  ${s}`, x + 34, yy + h / 2 - 1, { size: 21, font: FONT_B, align: 'left', maxW: w - 120, fill: shown && right ? TEAL : shown && mine ? RED : INK });
        if (shown && right) stamp(g, x + w - 58, yy + h / 2 - 2, 26, 'win', TEAL, -0.12);
        else if (shown && mine) stamp(g, x + w - 58, yy + h / 2 - 2, 26, 'lose', RED, 0.1);
      });
      if (pk.ans >= 0) { pk.at += dt; if (pk.at > 1.3) { const f = pk.onDone, ok = pk.ans === pk.right; this.pick = null; f(ok); } }
    }
    g.restore();
  }
  // 덱에서 패를 하나 고르게 한다 (같은 패는 한 칸)
  deckPick(title, sub, filter, onPick, cancel = true) {
    const seen = new Set(), opts = [];
    for (const c of G.run.deck) { if (!filter(c)) continue; const key = c.id + ':' + (c.lv || 1) + ':' + (c.up ? 1 : 0) + ':' + (c.br || ''); if (seen.has(key)) continue; seen.add(key); opts.push(c); if (opts.length >= 12) break; }
    if (!opts.length) return false;
    this.pick = { kind: 'cards', title, sub, opts, cancel, onPick: i => onPick(opts[i]) }; return true;
  }
}

// ═════════════════════════ 무당집 ═════════════════════════
// 해 질 녘 무당집 마당. 금줄과 오색 천을 두른 신목, 굿상 위의 시루떡·과일·촛불, 신대 끝에서 펄럭이는 오색 천.
// 멍석 위에서 무녀가 부채와 방울을 들고 굿을 하고, 마당 양쪽 횃불이 일렁인다
const SHAMAN_TABLE = [420, 478], SHAMAN_TORCH = [[214, 318], [730, 268]];
function shamanBG() {
  return once('shaman', g => {
    const R = rng(5150);
    // 저녁 하늘: 쪽빛에서 주홍으로, 이른 별, 붉게 물든 구름
    g.fillStyle = VG(g, 0, 360, [[0, '#161430'], [0.45, '#3e2850'], [0.8, '#a6504a'], [1, '#e0915a']]); g.fillRect(0, 0, W, 370);
    for (let i = 0; i < 110; i++) DAB(g, R() * W, R() * 170, 0.5 + R(), 0.5 + R(), '#f4ecd8', 0.25 + R() * 0.5);
    { const gr = g.createRadialGradient(560, 380, 20, 560, 380, 560); gr.addColorStop(0, 'rgba(255,170,100,0.5)'); gr.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = gr; g.fillRect(0, 80, W, 320); }
    for (const [x, y, w] of [[300, 128, 300], [560, 92, 200], [1000, 112, 240]]) for (let k = 0; k < 14; k++) { DAB(g, x + (k - 7) * w * 0.07, y + Math.sin(k * 1.4) * 4, w * 0.12, w * 0.022, '#5a3050', 0.5); DAB(g, x + (k - 7) * w * 0.07, y + 4 + Math.sin(k) * 2, w * 0.09, w * 0.012, '#f0a07a', 0.45); }
    MOUNT(g, x => 296 - 66 * Math.exp(-(((x - 420) / 260) ** 2)) - 44 * Math.exp(-(((x - 1060) / 220) ** 2)) - 6 * Math.sin(x * 0.02), W, 350, '#3a2846', '#8a5260', R, { h: 110, n: 120, mist: 44 });
    // 기와 얹은 흙담
    g.fillStyle = VG(g, 300, 400, [[0, '#a88466'], [1, '#6a4c3c']]); g.fillRect(0, 320, W, 82);
    for (let i = 0; i < 300; i++) { const x = R() * W, y = 326 + R() * 72; DAB(g, x, y, 4 + R() * 10, 2 + R() * 3, R() < 0.5 ? '#8a6a50' : '#b89478', 0.45); }
    for (let y = 336; y < 398; y += 15) for (let x = ((y / 15) % 2) * 20; x < W; x += 40) DAB(g, x, y, 14, 5, '#5a4034', 0.25);
    giwa(g, 640, 322, 1400, 22, { col: '#3a3644', lift: 0, ridge: 0.98, under: 6, sag: 0 });
    // 신당: 기와지붕 아래 열린 문, 안에 오방색 천과 촛불
    { const x0 = 790, x1 = 1210, base = 408;
      g.fillStyle = '#4a3a36'; g.fillRect(x0 - 16, base - 4, x1 - x0 + 32, 22);
      for (let x = x0 - 12; x < x1 + 12;) { const w = 24 + R() * 18; PROCK(g, x + w / 2, base + 14, w, 12 + R() * 6, { rock: ['#7a6a6a', '#3a3036'], grass: ['#2e3a30', '#3e4a3c', '#1e2a22'] }, R); x += w - 2; }
      g.fillStyle = VG(g, 210, base, [[0, '#d8bf92'], [1, '#8e7052']]); g.fillRect(x0, 214, x1 - x0, base - 214);
      for (let i = 0; i < 160; i++) DAB(g, x0 + R() * (x1 - x0), 220 + R() * (base - 226), 3 + R() * 7, 1 + R() * 2, R() < 0.5 ? '#c4a87c' : '#e6d0a6', 0.35);
      // 열린 문 안: 어둑한 방, 오방색 휘장, 촛불 두 자루, 붉은 상
      const dx0 = x0 + 150, dw = x1 - x0 - 300;
      g.fillStyle = '#1a0e10'; g.fillRect(dx0, 236, dw, base - 236);
      { const gx = dx0 + dw / 2, gr = g.createRadialGradient(gx, 360, 10, gx, 330, 170); gr.addColorStop(0, 'rgba(255,170,90,0.8)'); gr.addColorStop(1, 'rgba(255,170,90,0)'); g.fillStyle = gr; g.fillRect(dx0, 236, dw, base - 236); }
      OBANG.concat(OBANG).forEach((c, k) => { const x = dx0 + 6 + k * (dw - 12) / 10; g.globalAlpha = 0.9; g.fillStyle = c; g.beginPath(); g.moveTo(x, 238); g.lineTo(x + 10, 238); g.lineTo(x + 9 + Math.sin(k) * 2, 300 + (k % 3) * 12); g.lineTo(x + 1, 296 + (k % 3) * 12); g.closePath(); g.fill(); g.globalAlpha = 0.3; g.fillStyle = '#000'; g.fillRect(x + 7, 238, 3, 60 + (k % 3) * 12); });
      g.globalAlpha = 1; rr(g, dx0 + 20, 372, dw - 40, 16, 3, '#7a2a26'); rr(g, dx0 + 20, 386, dw - 40, 6, 2, '#4a1612');
      for (const x of [dx0 + 34, dx0 + dw - 34]) { rr(g, x - 3, 344, 6, 28, 2, '#f6efdc'); }
      part(g, E(dx0 + dw / 2, 364, 18, 8), '#f6f0e2', null, { lw: 1 });   // 떡 한 접시
      // 기둥과 인방
      for (const x of [x0, x0 + 136, x1 - 150, x1 - 14]) { g.fillStyle = VG(g, 200, base, [[0, '#6a3e28'], [1, '#2e1a10']]); g.fillRect(x, 204, 14, base - 204); S2(g, [x + 4, 210, x + 4, base - 6], '#a87850', 1.2, 0.45); }
      g.fillStyle = VG(g, 226, 238, [[0, '#7a4c2e'], [1, '#3e2418']]); g.fillRect(x0, 226, x1 - x0, 12);
      // 열어 젖힌 띠살문짝
      for (const [x, w] of [[x0 + 16, 118], [x1 - 148, 132]]) { g.fillStyle = '#efe2c4'; g.fillRect(x, 240, w, base - 250); g.globalAlpha = 0.28; g.fillStyle = '#ffb070'; g.fillRect(x, 240, w, base - 250); g.globalAlpha = 1; g.strokeStyle = '#6a4428'; g.lineWidth = 1.3; for (let xx = x + 7; xx < x + w; xx += 8) { g.beginPath(); g.moveTo(xx, 242); g.lineTo(xx, base - 12); g.stroke(); } for (const yy of [262, 267, 272, 330, 335, 340]) { g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke(); } rr(g, x, 240, w, base - 250, 1, null, '#4a2c1a', 2.4); }
      // 처마 밑 금줄
      giwa(g, (x0 + x1) / 2, 214, x1 - x0 + 170, 104, { col: '#3c3a4a', under: 22 });
    }
    // 신목: 굵은 줄기에 금줄을 두르고 가지마다 오색 천을 매달았다
    { g.fillStyle = VG(g, 120, 540, [[0, '#4a362c'], [1, '#1e140f']]); g.beginPath(); g.moveTo(60, 548); g.quadraticCurveTo(104, 430, 116, 330); g.quadraticCurveTo(124, 240, 92, 150); g.lineTo(170, 140); g.quadraticCurveTo(204, 250, 198, 330); g.quadraticCurveTo(206, 440, 268, 548); g.closePath(); g.fill();
      for (let k = 0; k < 22; k++) { const yy = 530 - k * 17, xx = 104 + Math.sin(k * 1.7) * 10 + k * 1.4; S2(g, [xx, yy, xx + 30 + Math.sin(k) * 10, yy - 12], '#140c08', 1.6, 0.55); }
      S2(g, [190, 520, 192, 330, 172, 170], '#c09070', 2.2, 0.3); S2(g, [186, 460, 190, 380], '#e0a070', 3, 0.25);
      for (const [x0, y0, x1, y1, w] of [[150, 220, 20, 150, 11], [160, 190, 340, 118, 10], [140, 170, 60, 70, 8], [170, 160, 270, 40, 8], [190, 280, 390, 236, 7], [60, 70, 0, 40, 4], [340, 118, 430, 92, 4]]) S2(g, [x0, y0, (x0 + x1) / 2 + 8, (y0 + y1) / 2 - 10, x1, y1], '#22170f', w);
      for (let i = 0; i < 420; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = 180 + Math.cos(a) * 230 * d, y = 120 + Math.sin(a) * 112 * d; DAB(g, x, y, 5 + R() * 8, 3 + R() * 4, R() < 0.55 ? '#1c2620' : '#2c3a2c', 0.88, R() * 3); }
      for (let i = 0; i < 80; i++) { const a = -0.1 - R() * 3, x = 180 + Math.cos(a) * 210, y = 128 + Math.sin(a) * 96; DAB(g, x, y, 3 + R() * 5, 1.6 + R() * 2, '#b06a50', 0.45); }
      for (const y of [376, 398]) { S2(g, [100, y + 4, 150, y + 11, 210, y + 2], INK, 5.4); S2(g, [100, y + 4, 150, y + 11, 210, y + 2], '#d9bc78', 3.2); for (const x of [120, 146, 174, 198]) { const yy = y + 8; g.fillStyle = '#fbf7ec'; g.beginPath(); g.moveTo(x - 3, yy); g.lineTo(x + 3, yy); g.lineTo(x + 5, yy + 9); g.lineTo(x + 1, yy + 12); g.lineTo(x + 4, yy + 21); g.lineTo(x - 2, yy + 23); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 0.8; g.stroke(); } }
      for (const [x, y, c] of [[40, 170, OBANG[0]], [72, 150, OBANG[1]], [300, 140, OBANG[3]], [330, 128, OBANG[4]], [256, 110, OBANG[2]], [370, 242, OBANG[0]]]) { g.fillStyle = c; g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.lineTo(x + 6, y + 34); g.lineTo(x, y + 32); g.closePath(); g.fill(); }
      for (const [x, y, r] of [[250, 540, 20], [284, 544, 16], [226, 548, 16], [264, 520, 14], [242, 524, 12], [254, 502, 10]]) PROCK(g, x, y, r * 2, r * 1.3, { rock: ['#8a7e7a', '#4a4044'], grass: ['#2e3a30', '#3e4a3c', '#1e2a22'] }, R);
    }
    // 마당: 저녁빛이 고인 흙바닥, 굿판 쪽으로 따뜻한 빛
    g.fillStyle = VG(g, 410, H, [[0, '#5e4438'], [1, '#2a1c1c']]); g.fillRect(0, 414, W, H - 414);
    for (let i = 0; i < 2600; i++) { const x = R() * W, y = 418 + R() * 302; DAB(g, x, y, 3 + R() * 12, 1 + R() * 3, R() < 0.5 ? '#6e5246' : '#3a2826', 0.28); }
    for (let i = 0; i < 160; i++) { const x = R() * W, y = 430 + R() * 290; DAB(g, x + 0.8, y + 1, 2.2, 1.2, '#140e10', 0.4); DAB(g, x, y, 1.8, 1.1, '#8a6c5e', 0.7); }
    { const gr = g.createRadialGradient(600, 540, 20, 600, 540, 480); gr.addColorStop(0, 'rgba(255,170,100,0.36)'); gr.addColorStop(1, 'rgba(255,170,100,0)'); g.fillStyle = gr; g.fillRect(0, 300, W, 420); }
    for (let i = 0; i < 70; i++) { const x = R() < 0.5 ? R() * 120 : 1170 + R() * 110, y = 430 + R() * 280; PTUFT(g, x, y, 0.9 + R() * 0.7, { grass: ['#3e4a3c', '#55624a', '#2a3428'] }, R); }
    // 멍석 (춤추는 자리): 짚을 둥글게 엮은 결
    { g.save(); g.translate(640, 590); g.scale(1, 0.3); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.arc(8, 26, 240, 0, TAU); g.fill(); g.fillStyle = '#b8955a'; g.beginPath(); g.arc(0, 0, 236, 0, TAU); g.fill(); for (let r2 = 18; r2 < 236; r2 += 11) { g.strokeStyle = r2 % 22 ? '#8a6a3a' : '#d4b070'; g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, r2, 0, TAU); g.stroke(); } for (let a = 0; a < TAU; a += 0.16) { g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(Math.cos(a) * 234, Math.sin(a) * 234); g.stroke(); } g.strokeStyle = '#3a2410'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 236, 0, TAU); g.stroke(); g.restore(); }
    // 굿상: 붉은 칠 상 위에 시루떡·과일 고임·정화수·지화
    { const [tx, ty] = SHAMAN_TABLE;
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(tx, ty + 36, 178, 14, 0, 0, TAU); g.fill();
      part(g, RECT(tx - 166, ty - 6, 332, 16), '#a02c26', RECT(tx - 166, ty + 4, 332, 6), { lw: 2 }); S2(g, [tx - 160, ty - 4, tx + 160, ty - 4], '#e07060', 1.4, 0.6);
      for (const sx of [-1, 1]) part(g, P(tx + sx * 156, ty + 10, tx + sx * 142, ty + 10, tx + sx * 146, ty + 38, tx + sx * 160, ty + 38), '#6a1a16', null, { lw: 1.6 });
      part(g, P(tx - 54, ty - 6, tx + 54, ty - 6, tx + 44, ty - 56, tx - 44, ty - 56), '#8a5a3a', P(tx + 14, ty - 6, tx + 54, ty - 6, tx + 44, ty - 56, tx + 10, ty - 56), { lw: 1.8 });
      for (const y of [-20, -38]) line(g, [tx - 48, ty + y, tx + 48, ty + y], '#5a3a22', 1.4);
      part(g, E(tx, ty - 58, 48, 10), '#f6f0e2', E(tx + 10, ty - 54, 42, 8), { shc: '#e0d6c0', lw: 1.6 }); for (let k = 0; k < 16; k++) DAB(g, tx - 40 + k * 5.4, ty - 60 + Math.sin(k) * 2, 2.2, 1.6, '#b8322a', 0.85);
      const pile = (cx, col, hi) => { for (const [dx, dy] of [[-17, 0], [0, 0], [17, 0], [-8.5, -14], [8.5, -14], [0, -28]]) part(g, E(cx + dx, ty - 14 + dy, 9.5, 9.5), col, E(cx + dx + 3, ty - 11 + dy, 7, 7), { hi: E(cx + dx - 3, ty - 18 + dy, 2.6, 2), hic: hi, lw: 1.1 }); };
      pile(tx - 116, '#c83a2e', '#ffb0a0'); pile(tx + 116, '#e0a84a', '#fff0b0');
      part(g, P(tx - 82, ty - 6, tx - 60, ty - 6, tx - 64, ty - 20, tx - 78, ty - 20), '#f6efdc', null, { lw: 1.2 }); DAB(g, tx - 71, ty - 20, 7, 1.8, '#a8c8e0', 0.9);
      for (const sx of [-1, 1]) { part(g, RECT(tx + sx * 78 - 5, ty - 9, 10, 4), '#b8862a', null, { lw: 1 }); part(g, RECT(tx + sx * 78 - 3, ty - 42, 6, 33), '#fbf7ec', RECT(tx + sx * 78, ty - 42, 3, 33), { shc: '#e0d8c4', lw: 1.1 }); }
      part(g, P(tx + 146, ty - 6, tx + 168, ty - 6, tx + 172, ty - 32, tx + 142, ty - 32), '#3f5f86', null, { lw: 1.2 });
      for (const [dx, dy, c] of [[-12, -48, '#e36a8a'], [6, -56, '#f6efdc'], [18, -42, '#e0b23c'], [-2, -66, '#e36a8a'], [12, -70, '#f6efdc']]) { S2(g, [tx + 157, ty - 32, tx + 157 + dx, ty + dy], '#3f6b3a', 1.6); for (let q = 0; q < 6; q++) DAB(g, tx + 157 + dx + Math.cos(q) * 5, ty + dy + Math.sin(q) * 5, 4.2, 3.2, c, 0.95); DAB(g, tx + 157 + dx, ty + dy, 2, 2, '#f0c040', 1); }
    }
    // 장구: 허리가 잘록한 통 양쪽에 가죽 북면, 붉은 줄을 V 자로 엮었다
    { const x = 420, y = 600; g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(x, y + 18, 60, 8, 0, 0, TAU); g.fill();
      part(g, p => { p.moveTo(x - 40, y - 22); p.quadraticCurveTo(x, y - 6, x + 40, y - 22); p.lineTo(x + 40, y + 14); p.quadraticCurveTo(x, y - 2, x - 40, y + 14); p.closePath(); }, '#8a2a24', p => { p.moveTo(x - 40, y + 2); p.quadraticCurveTo(x, y - 4, x + 40, y + 2); p.lineTo(x + 40, y + 14); p.quadraticCurveTo(x, y - 2, x - 40, y + 14); p.closePath(); }, { lw: 1.6 });
      for (let k = 0; k < 7; k++) { const a = -0.9 + k * 0.3, ly = y - 2 + Math.sin(a) * 18; line(g, [x - 40, ly, x - 6, y - 4], '#e8c060', 1.2); line(g, [x + 40, ly, x + 6, y - 4], '#e8c060', 1.2); }
      for (const sx of [-1, 1]) { part(g, E(x + sx * 44, y - 4, 10, 24), '#f2e4c2', E(x + sx * 46, y - 1, 8, 20), { shc: '#d4c09a', lw: 1.6 }); ell(g, x + sx * 44, y - 4, 6, 16, null, '#b8862a', 1.4); }
      S2(g, [x + 60, y + 10, x + 96, y - 20], '#6a4428', 3); }
    vignette(g, 0.48);
  });
}
function torch(g, x, y, t, k = 1) {
  line(g, [x, y, x, y + 300], INK, 7 * k); line(g, [x, y, x, y + 300], '#5a3a22', 4.4 * k);
  rr(g, x - 13 * k, y - 8 * k, 26 * k, 14 * k, 3, '#2a2420', INK, 1.4); for (let q = -2; q <= 2; q++) line(g, [x + q * 5 * k, y - 8 * k, x + q * 6 * k, y + 6 * k], '#5a5048', 1.2);
  const f = 0.85 + 0.15 * Math.sin(t * 13 + x) * Math.sin(t * 7.3 + x); glow(g, x, y - 20, 150 * k, '255,150,60', 0.4 * f); glow(g, x, y - 20, 46 * k, '255,220,140', 0.75 * f);
  for (let q = 0; q < 4; q++) { const h = (34 + q * 6) * k * (0.8 + 0.3 * Math.sin(t * 9 + q * 1.7 + x)), dx = (q - 1.5) * 6 * k; path(g, p => { p.moveTo(x + dx - 9 * k, y - 6 * k); p.quadraticCurveTo(x + dx - 7 * k, y - 6 * k - h * 0.6, x + dx + Math.sin(t * 5 + q) * 4, y - 6 * k - h); p.quadraticCurveTo(x + dx + 7 * k, y - 6 * k - h * 0.6, x + dx + 9 * k, y - 6 * k); p.closePath(); }, ['#ff7a2e', '#ffb040', '#ffd070', '#ff9a2e'][q]); }
  for (let q = 0; q < 6; q++) { const u = ((t * 0.7 + q / 6 + x * 0.01) % 1); g.globalAlpha = 1 - u; ell(g, x + Math.sin(q * 3 + t) * 14 * u, y - 40 * k - u * 110, 1.6, 1.6, '#ffd070'); } g.globalAlpha = 1;
}
class ShamanScene extends PlaceScene {
  constructor(o) { super(o, { bg: shamanBG, title: '무당집', hello: '어서 오시오. 길에 붙은 부정, 내 씻어 드리리다.', bub: [610, 316, 630], leave: '무당집을 떠난다' }); }
  acts() {
    const r = G.run, gold = c => r.gold < c ? `엽전 ${c} 부족` : null, d = id => this.done[id] ? '이번에는 했습니다' : null;
    return [
      { id: 'gut', label: '굿을 한다', cost: PLACE_COST.gut, sub: '부정과 잡념을 모두 씻는다', why: () => d('gut') || (curseCount() ? null : '씻을 부정이 없다') || gold(PLACE_COST.gut), go: () => { const out = place.gut(); this.done.gut = 1; this.spin = 2.4; sfx('bless'); this.say('훠어이, 물러가라! 묵은 액은 다 씻겼소.'); this.show('무녀가 굿을 해 부정을 씻었습니다', out); } },
      { id: 'naerim', label: '축원을 받는다', cost: PLACE_COST.naerim, sub: '다음 싸움을 사기 +4 로 시작', why: () => d('naerim') || gold(PLACE_COST.naerim), go: () => { const out = place.naerim(); this.done.naerim = 1; this.spin = 2.4; sfx('magic'); this.say('신이 내려 기운을 실어 주시오. 다음 싸움은 든든할 게요.'); this.show('신내림으로 기운이 솟습니다', out); } },
      { id: 'charm', label: '부적을 받는다', cost: PLACE_COST.charm, sub: '수호·흑요 부적 중 없는 것 하나', why: () => d('charm') || gold(PLACE_COST.charm), go: () => { const out = place.charm(); this.done.charm = 1; sfx('star'); juice.burst(640, 320, '#e0b23c', 14); this.say('이 부적을 몸에 지니시오. 나쁜 것이 못 다가온다오.'); this.show('무녀가 부적을 써 주었습니다', out); } },
    ];
  }
  scene(g, t, dt) {
    const r = G.run; if (this.spin > 0) this.spin -= dt;
    // 신당 안 촛불과 일렁임
    { const f = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 5.3); glow(g, 1000, 330, 150, '255,160,80', 0.32 * f); for (const x of [974, 1026]) { glow(g, x, 340, 24, '255,210,120', 0.7 * f); path(g, p => { const h = 9 + Math.sin(t * 11 + x) * 2; p.moveTo(x - 3, 344); p.quadraticCurveTo(x - 3, 344 - h * 0.6, x, 344 - h); p.quadraticCurveTo(x + 3, 344 - h * 0.6, x + 3, 344); p.closePath(); }, '#ffd06a'); } }
    for (const [x, y] of SHAMAN_TORCH) torch(g, x, y, t, 0.9);
    // 굿상 촛불과 향 연기
    { const [tx, ty] = SHAMAN_TABLE; for (const sx of [-1, 1]) { const x = tx + sx * 78, y = ty - 42, h = 12 + Math.sin(t * 10 + sx) * 2.4; glow(g, x, y - 6, 40, '255,190,100', 0.55); path(g, p => { p.moveTo(x - 4, y); p.quadraticCurveTo(x - 4.5, y - h * 0.6, x + Math.sin(t * 6 + sx) * 1.5, y - h); p.quadraticCurveTo(x + 4.5, y - h * 0.6, x + 4, y); p.closePath(); }, '#ffcc5a'); ell(g, x, y - 3, 1.6, 3, '#fff6d0'); }
      for (let k = 0; k < 6; k++) { const q = ((t * 0.18 + k / 6) % 1), x = tx - 71 + Math.sin(q * 7 + k) * 14 * q, y = ty - 26 - q * 200; g.globalAlpha = 0.22 * (1 - q); ell(g, x, y, 6 + q * 22, 4 + q * 10, '#e6dcef'); } g.globalAlpha = 1; }
    // 마당을 가로지르는 금줄에 매단 오색 천 (신목에서 신당 처마까지)
    geumjul(g, 210, 270, 800, 236, 44, t, 7);
    for (let i = 0; i < 15; i++) { const q = (i + 0.5) / 15, x = 210 + (800 - 210) * q, y = 270 + (236 - 270) * q + Math.sin(q * Math.PI) * 44; cloth(g, x, y + 2, 30 + (i % 3) * 12, OBANG[i % 5], t, i * 1.3, 0.9); }
    // 신대: 대나무 장대 끝 흰 종이꽃과 오색 천
    { const x = 880, top = 150; line(g, [x, 566, x + 4, top], INK, 7); line(g, [x, 566, x + 4, top], '#9aa85a', 4.4); for (const y of [480, 400, 320, 240]) line(g, [x - 4, y, x + 6, y], '#5a6a30', 2);
      for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.3 + Math.sin(t * 2 + k) * 0.05; line(g, [x + 4, top, x + 4 + Math.cos(a) * 26, top + Math.sin(a) * 26 + 10], INK, 4.4); line(g, [x + 4, top, x + 4 + Math.cos(a) * 26, top + Math.sin(a) * 26 + 10], '#fbf7ec', 2.6); }
      OBANG.forEach((c, k) => cloth(g, x + 4, top + 10 + k * 3, 74 + k * 12, c, t, k * 0.9, 1.4)); }
    // 무녀와 영웅: 굿을 하면 무녀가 빙글빙글 돈다
    const sp = this.spin > 0;
    puppet(g, 'priest', 640, 576, 1.8, t, { act: 'dance', face: sp ? (Math.sin(t * 9) > 0 ? 1 : -1) : 1, noStick: true });
    puppet(g, r.hero, 792, 590, 1.7, t, { act: this.joy > 0 ? 'hop' : 'idle', face: -1, noStick: true });
    if (sp) for (let k = 0; k < 12; k++) { const a = t * 3 + k * TAU / 12, x = 640 + Math.cos(a) * 100, y = 480 + Math.sin(a) * 26; glow(g, x, y, 14, '255,220,140', 0.5); ell(g, x, y, 3, 2, OBANG[k % 5]); }
    // 날리는 종이 꽃잎
    for (let i = 0; i < 18; i++) { const q = ((t * 0.07 + i * 0.137) % 1), x = 120 + ((i * 97) % 1000) + Math.sin(t + i) * 30, y = 120 + q * 520; g.globalAlpha = 0.7 * Math.sin(q * Math.PI); ell(g, x, y, 3, 1.6, OBANG[i % 5]); } g.globalAlpha = 1;
    motes(g, t, 300, 260, 700, 300, 16, '255,200,140', 0.4);
  }
}

// ═════════════════════════ 서당 ═════════════════════════
// 볕 좋은 날의 산골 서당. 기와 얹은 글방 대청에 훈장이 서안 앞에 앉고, 학동들이 몸을 흔들며 글을 읽는다.
// 마당에는 은행나무와 돌담, 디딤돌 길, 봉숭아 꽃밭, 모이를 쪼는 닭들
function seodangBG() {
  return once('seodang', g => {
    const R = rng(7271), Pg = PAL('grove'), haze = MIX(Pg.sky[1], '#ffffff', 0.25);
    g.fillStyle = VG(g, 0, 330, [[0, '#9cc4d4'], [1, '#f2ecd6']]); g.fillRect(0, 0, W, 340);
    { const gr = g.createRadialGradient(1120, 60, 10, 1120, 60, 380); gr.addColorStop(0, 'rgba(255,246,214,0.85)'); gr.addColorStop(1, 'rgba(255,246,214,0)'); g.fillStyle = gr; g.fillRect(700, 0, 580, 400); }
    for (const [x, y, w] of [[300, 70, 220], [760, 40, 180], [1060, 120, 150]]) PCLOUD(g, x, y, w, Pg, R);
    MOUNT(g, x => 250 - 70 * Math.exp(-(((x - 240) / 200) ** 2)) - 90 * Math.exp(-(((x - 1000) / 240) ** 2)) - 8 * Math.sin(x * 0.02), W, 290, MIX(Pg.far[1], haze, 0.2), haze, R, { h: 120, n: 160, mist: 44 });
    MOUNT(g, x => 296 - 30 * Math.exp(-(((x - 640) / 300) ** 2)) - 10 * Math.sin(x * 0.012 + 2), W, 330, MIX(Pg.hill[1], haze, 0.12), haze, R, { h: 60, n: 120, mist: 26 });
    for (const [x, y, s2, f] of [[60, 300, 0.32, false], [1230, 296, 0.3, true], [330, 296, 0.22, true]]) PPINE(g, x, y, s2, Pg, R, f);
    // 돌담 (기와 얹은)
    g.fillStyle = VG(g, 300, 384, [[0, '#b8ad98'], [1, '#8a806e']]); g.fillRect(0, 312, W, 72);
    for (let y = 318; y < 382; y += 13) for (let x = -10 + ((y / 13) % 2) * 16; x < W; x += 30) PROCK(g, x, y + 10, 28, 12, { rock: ['#cac0aa', '#8a8070'], grass: Pg.grass }, R);
    giwa(g, 640, 314, 1400, 20, { col: '#4f5866', lift: 0, ridge: 0.98, under: 5, sag: 0 });
    // 서당: 큰 팔작지붕 아래 대청
    const x0 = 440, x1 = 1200, base = 404, floor = 346;
    g.fillStyle = '#8a8070'; g.fillRect(x0 - 20, floor + 4, x1 - x0 + 40, base - floor + 10);
    for (let x = x0 - 16; x < x1 + 16;) { const w = 30 + R() * 26; PROCK(g, x + w / 2, base + 4, w, 16 + R() * 8, { rock: ['#cac0aa', '#8a8070'], grass: Pg.grass }, R); x += w - 3; }
    // 안쪽 벽과 문살, 벽에 건 산수화
    g.fillStyle = VG(g, 170, floor, [[0, '#5a4636'], [1, '#33261c']]); g.fillRect(x0, 176, x1 - x0, floor - 176);
    for (const [ax, aw] of [[x0 + 26, 160], [x1 - 186, 160]]) { g.fillStyle = '#efe4c8'; g.fillRect(ax, 198, aw, 134); g.strokeStyle = '#6a4428'; g.lineWidth = 1.3; for (let xx = ax + 11; xx < ax + aw; xx += 11) { g.beginPath(); g.moveTo(xx, 198); g.lineTo(xx, 332); g.stroke(); } for (let yy = 210; yy < 332; yy += 13) { g.beginPath(); g.moveTo(ax, yy); g.lineTo(ax + aw, yy); g.stroke(); } g.globalAlpha = 0.2; g.fillStyle = '#fff6d0'; g.fillRect(ax, 198, aw, 134); g.globalAlpha = 1; rr(g, ax, 198, aw, 134, 1, null, '#4a2c1a', 2.4); }
    { const sx = 760, sy = 190; rr(g, sx - 7, sy - 7, 134, 134, 3, '#7a5a3a', '#3a2414', 1.6); g.fillStyle = '#f3ead2'; g.fillRect(sx, sy, 120, 120);
      for (let i = 0; i < 3; i++) { const cx = sx + 30 + i * 32, h = 50 + (i % 2) * 22; g.fillStyle = `rgba(60,70,80,${0.3 + i * 0.12})`; g.beginPath(); g.moveTo(cx - 34, sy + 100); g.quadraticCurveTo(cx - 8, sy + 100 - h, cx, sy + 100 - h); g.quadraticCurveTo(cx + 8, sy + 100 - h, cx + 34, sy + 100); g.closePath(); g.fill(); }
      g.fillStyle = 'rgba(90,110,120,0.4)'; g.fillRect(sx, sy + 98, 120, 22); S2(g, [sx + 84, sy + 30, sx + 92, sy + 24, sx + 100, sy + 28], '#2a2a30', 1, 0.55); S2(g, [sx + 92, sy + 22, sx + 98, sy + 17, sx + 104, sy + 20], '#2a2a30', 0.9, 0.5); S2(g, [sx + 20, sy + 108, sx + 56, sy + 106], '#2a2a30', 1.2, 0.6); S2(g, [sx + 70, sy + 104, sx + 74, sy + 112, sx + 82, sy + 108], '#2a2a30', 1, 0.5); }
    // 대청마루와 기둥
    g.fillStyle = VG(g, floor - 4, floor + 18, [[0, '#cfa068'], [1, '#7a5634']]); g.fillRect(x0 - 10, floor - 4, x1 - x0 + 20, 22);
    for (let x = x0; x < x1; x += 46) S2(g, [x, floor - 2, x, floor + 16], '#6a4a2c', 1, 0.5);
    S2(g, [x0 - 10, floor - 3, x1 + 10, floor - 3], '#f6d8a8', 1.6, 0.6);
    for (const x of [x0 - 6, x0 + 250, x1 - 262, x1 - 8]) { g.fillStyle = VG(g, 160, floor, [[0, '#6e4428'], [1, '#3a2216']]); g.fillRect(x, 160, 16, floor - 160); S2(g, [x + 4, 166, x + 4, floor - 4], '#a87850', 1.4, 0.5); }
    g.fillStyle = VG(g, 162, 180, [[0, '#7a4c2e'], [1, '#3e2418']]); g.fillRect(x0 - 24, 162, x1 - x0 + 48, 18);
    giwa(g, (x0 + x1) / 2, 166, x1 - x0 + 200, 116, { col: '#4c5464', under: 20 });
    // 디딤돌 길과 댓돌, 짚신
    for (const [x, w] of [[600, 120], [890, 110]]) PROCK(g, x, base + 12, w, 26, { rock: ['#dcd4c0', '#9a9080'], grass: Pg.grass }, R);
    for (const [x, y] of [[578, 400], [600, 402], [622, 399], [870, 400], [892, 402], [912, 400]]) part(g, E(x, y, 9, 3.6), '#d9bc78', E(x + 2, y + 1, 7, 2.6), { shc: '#a8843c', lw: 1 });
    // 마당
    g.fillStyle = VG(g, 408, H, [[0, '#dccaa0'], [1, '#a88a5a']]); g.fillRect(0, 414, W, H - 414);
    for (let i = 0; i < 2600; i++) { const x = R() * W, y = 416 + R() * 304; DAB(g, x, y, 3 + R() * 10, 1 + R() * 2.5, R() < 0.5 ? '#c8b48a' : '#ece0bc', 0.3); }
    { const gr = g.createLinearGradient(0, 410, 0, 480); gr.addColorStop(0, 'rgba(60,40,20,0.32)'); gr.addColorStop(1, 'rgba(60,40,20,0)'); g.fillStyle = gr; g.fillRect(400, 412, 880, 70); }
    for (const [x, y, w] of [[620, 470, 70], [560, 530, 74], [500, 600, 80], [450, 676, 86]]) PROCK(g, x, y, w, w * 0.32, { rock: ['#d8d0bc', '#a09684'], grass: Pg.grass }, R);
    // 은행나무 (왼쪽): 굵은 줄기와 연둣빛 부채잎
    { g.fillStyle = VG(g, 200, 600, [[0, '#6a5444'], [1, '#3a2c22']]); g.beginPath(); g.moveTo(110, 610); g.quadraticCurveTo(146, 470, 158, 360); g.quadraticCurveTo(166, 280, 148, 200); g.lineTo(208, 196); g.quadraticCurveTo(224, 300, 222, 380); g.quadraticCurveTo(232, 500, 300, 610); g.closePath(); g.fill();
      for (let k = 0; k < 22; k++) { const yy = 596 - k * 18, xx = 150 + Math.sin(k * 1.3) * 8 + k * 1.2; S2(g, [xx, yy, xx + 34, yy - 10], '#2a1e16', 1.4, 0.5); }
      S2(g, [214, 590, 214, 380, 196, 220], '#d8c0a8', 2, 0.35);
      for (const [a, b, c2, d2, w] of [[176, 280, 40, 210, 11], [190, 250, 350, 168, 10], [180, 220, 90, 110, 8], [196, 210, 290, 80, 7], [210, 330, 390, 300, 7]]) S2(g, [a, b, (a + c2) / 2 + 8, (b + d2) / 2 - 10, c2, d2], '#3a2c22', w);
      for (let i = 0; i < 560; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = 190 + Math.cos(a) * 240 * d, y = 170 + Math.sin(a) * 140 * d; DAB(g, x, y, 5 + R() * 7, 3 + R() * 4, R() < 0.35 ? '#6a8a3a' : R() < 0.7 ? '#8fae4a' : '#b8c860', 0.88, R() * 3); }
      for (let i = 0; i < 100; i++) { const a = -0.3 - R() * 2.6, x = 190 + Math.cos(a) * 210, y = 170 + Math.sin(a) * 116; DAB(g, x, y, 3 + R() * 5, 2 + R() * 2, '#eef4a8', 0.5); }
      g.fillStyle = 'rgba(60,50,20,0.25)'; g.beginPath(); g.ellipse(220, 620, 170, 24, 0, 0, TAU); g.fill(); }
    // 봉숭아 꽃밭 (왼쪽 앞)과 들꽃 (오른쪽 앞)
    { rr(g, -10, 640, 300, 90, 8, '#7a5a3a'); for (let x = 0; x < 290; x += 22) PROCK(g, x + 10, 646, 24, 10, { rock: ['#cac0aa', '#8a8070'], grass: Pg.grass }, R);
      for (let i = 0; i < 70; i++) { const x = 10 + R() * 270, y = 610 + R() * 60; S2(g, [x, y + 30, x + (R() - 0.5) * 8, y], '#4a7a3a', 2); DAB(g, x, y, 7, 4, '#5a8a44', 0.9, R() * 3); }
      for (let i = 0; i < 46; i++) { const x = 14 + R() * 266, y = 600 + R() * 56; DAB(g, x, y, 4.4, 3.6, R() < 0.6 ? '#e3507a' : '#f6a0b8', 0.95); DAB(g, x - 1, y - 1, 1.6, 1.2, '#fff0f4', 0.8); } }
    for (let i = 0; i < 70; i++) { const a = R() * TAU, d = Math.sqrt(R()); DAB(g, 1230 + Math.cos(a) * 80 * d, 690 + Math.sin(a) * 40 * d, 5 + R() * 5, 3 + R() * 3, R() < 0.5 ? '#4a6a3a' : '#6a8a4a', 0.9); }
    for (let i = 0; i < 44; i++) PTUFT(g, R() * W, 424 + R() * 286, 0.7 + R() * 0.6, Pg, R);
    vignette(g, 0.3);
  });
}
const SD_KIDS = [[842, 350, '#3f6b8a', 0], [910, 350, '#c86a4a', 1.4], [978, 350, '#5a8a4a', 2.6], [1046, 350, '#d9a441', 3.7]];
function hen(g, x, y, t, ph, face) {
  const peck = Math.sin(t * 2.2 + ph) > 0.6, by = peck ? 6 : 0;
  g.save(); g.translate(x, y); g.scale(face, 1);
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(0, 2, 16, 3.4, 0, 0, TAU); g.fill();
  for (const sx of [-4, 4]) line(g, [sx, 0, sx, -8], '#d9a441', 1.8);
  part(g, p => { p.moveTo(-16, -14); p.quadraticCurveTo(-22, -26, -12, -26); p.quadraticCurveTo(4, -22, 10, -18); p.quadraticCurveTo(8, -6, -4, -6); p.quadraticCurveTo(-14, -6, -16, -14); p.closePath(); }, '#f3ecdc', p => { p.moveTo(-16, -14); p.quadraticCurveTo(-10, -18, 4, -14); p.lineTo(4, -6); p.lineTo(-14, -6); p.closePath(); }, { shc: '#d8cdb4', lw: 1.3 });
  part(g, P(-20, -22, -16, -30, -12, -24), '#a07a4a', null, { lw: 1 });
  ell(g, 12, -24 + by, 6, 6, '#f3ecdc', INK, 1.2); part(g, P(17, -25 + by, 22, -23 + by, 17, -21 + by), '#e0a030', null, { lw: 0.8 }); part(g, P(9, -30 + by, 13, -34 + by, 15, -29 + by), '#d8322a', null, { lw: 0.8 }); ell(g, 14, -25 + by, 1, 1, INK);
  g.restore();
}
class SeodangScene extends PlaceScene {
  constructor(o) { super(o, { bg: seodangBG, title: '서당', hello: '어허, 글 읽는 소리가 좋구먼. 무얼 배우러 왔는가?', bub: [636, 160, 636], leave: '서당을 떠난다' }); }
  acts() {
    const r = G.run, gold = c => r.gold < c ? `엽전 ${c} 부족` : null, d = id => this.done[id] ? '이번에는 했습니다' : null;
    return [
      { id: 'study', label: '글을 익힌다', cost: PLACE_COST.study, sub: '전술 패 하나를 익힌다 (+)', why: () => d('study') || (r.deck.some(c => !isUnit(c) && canUp(c)) ? null : '익힐 전술 패가 없다') || gold(PLACE_COST.study),
        go: () => this.deck({ mode: 'up', title: '익힐 전술 패', filter: c => !isUnit(c), onPick: uid => { const s = place.study(uid); this.sub = null; if (!s) return; this.done.study = 1; sfx('star'); this.say('그렇지! 한 번 익힌 것은 잊지 않는 법이야.'); this.show('훈장에게 글을 배웠습니다', [s]); } }) },
      { id: 'read', label: '병법서를 읽는다', sub: '패 하나를 덜어 내고, 새 전술 패 셋 중 하나', why: () => d('read') || (r.deck.length > 6 ? null : '덱이 너무 얇다'),
        go: () => this.deck({ mode: 'burn', title: '덜어 낼 패', onPick: uid => { this.sub = null; const opts = place.readOffer(); if (!opts.length) return; this.pick = { kind: 'cards', title: '병법서에서 고른 수', sub: '셋 중 하나를 익혀 덱에 넣습니다', opts: opts.map(id => ({ id })), cancel: false, onPick: i => { const out = place.read(uid, opts[i]); if (!out) return; this.done.read = 1; this.say('옛 병법에 길이 있지. 잘 골랐네.'); this.show('병법서를 읽었습니다', out); } }; } }) },
      { id: 'quiz', label: '훈장의 시험', sub: '옛이야기 문제를 맞히면 엽전 +40, 공적 +3', why: () => d('quiz'),
        go: () => { const q = place.quiz(); this.done.quiz = 1; this.say('자, 그동안 들은 이야기를 얼마나 기억하나 보세.'); this.pick = Object.assign({ kind: 'quiz', ans: -1, onDone: ok => { if (ok) { const out = place.quizWin(); this.say('옳거니! 이야기를 귀담아들었구먼.'); this.show('훈장의 시험에 붙었습니다', out); } else { this.say('허허, 주막에서 이야기를 더 들어 보게.'); this.show('훈장의 시험에 떨어졌습니다', ['훈장이 혀를 찹니다']); } } }, q); } },
    ];
  }
  scene(g, t) {
    const r = G.run;
    beams(g, 820, 0, 560, 2.1, 6, t, '255,246,214', 0.08);
    // 훈장: 서안 앞에 앉아 회초리를 든다
    { const x = 636, y = 350; seonbi(g, x - 4, y - 8, 1.02, t, { seated: true, hold: 'switch', talk: this.lineT < 2.2 });
      part(g, RECT(x - 58, y - 26, 116, 11), '#7a4a2c', RECT(x - 58, y - 19, 116, 4), { lw: 1.6 }); for (const sx of [-1, 1]) part(g, RECT(x + sx * 50 - 4, y - 15, 8, 15), '#5a3420', null, { lw: 1.2 });
      part(g, RECT(x - 34, y - 36, 44, 10), '#e9d9b0', RECT(x - 34, y - 29, 44, 3), { lw: 1.1 }); rr(g, x + 22, y - 34, 15, 8, 2, '#2a2a30', INK, 1); line(g, [x + 42, y - 32, x + 54, y - 42], '#8a6a3a', 2); }
    for (const [x, y, col, ph] of SD_KIDS) child(g, x, y, 1, t, ph, col);
    // 글 읽는 소리가 흩날린다 (붓으로 그린 작은 물결)
    for (let i = 0; i < 4; i++) { const q = ((t * 0.3 + i * 0.25) % 1), x = 880 + i * 44 + q * 30, y = 262 - q * 70; g.globalAlpha = 0.5 * Math.sin(q * Math.PI); path(g, p => { p.moveTo(x - 10, y); p.quadraticCurveTo(x - 5, y - 6, x, y); p.quadraticCurveTo(x + 5, y + 6, x + 10, y); }, null, '#3a3a44', 1.6); } g.globalAlpha = 1;
    // 마당의 닭 두 마리
    for (const [x0, ph] of [[760, 0], [380, 2.4]]) { const wx = x0 + Math.sin(t * 0.25 + ph) * 60, face = Math.cos(t * 0.25 + ph) > 0 ? 1 : -1; hen(g, wx, 486 + ph * 6, t, ph, face); }
    puppet(g, r.hero, 470, 612, 1.7, t, { act: this.joy > 0 ? 'hop' : 'idle', face: 1, noStick: true });
    // 은행잎이 팔랑팔랑
    for (let i = 0; i < 12; i++) { const q = ((t * 0.06 + i * 0.173) % 1), x = 80 + ((i * 131) % 380) + Math.sin(t * 1.3 + i) * 30, y = 140 + q * 520, a = t * 2 + i; g.save(); g.translate(x, y); g.rotate(a); g.globalAlpha = 0.85 * Math.sin(q * Math.PI); path(g, p => { p.moveTo(0, 4); p.lineTo(-5, -3); p.quadraticCurveTo(0, -6, 5, -3); p.closePath(); }, i % 3 ? '#b8c860' : '#e8d860', 'rgba(60,60,20,0.5)', 0.6); g.restore(); } g.globalAlpha = 1;
    motes(g, t, 380, 120, 860, 300, 14, '255,248,220', 0.35);
  }
}

// ═════════════════════════ 투전판 ═════════════════════════
// 주막 뒷방의 밤. 들보에 매단 사방등 아래 돗자리 위로 투전과 엽전 꾸러미가 흩어지고,
// 담배 연기 너머 노름꾼들이 둘러앉았다. 패를 돌리는 것은 능청스러운 도깨비
const LAMP = [700, 190];
function gambleBG() {
  return once('gamble', g => {
    const R = rng(3131);
    // 벽: 등불에 물든 흙벽과 나무 뼈대
    g.fillStyle = VG(g, 0, 470, [[0, '#1a1214'], [0.55, '#3e2c26'], [1, '#5a4030']]); g.fillRect(0, 0, W, 470);
    for (let i = 0; i < 260; i++) { const x = R() * W, y = 60 + R() * 400; DAB(g, x, y, 10 + R() * 26, 4 + R() * 8, R() < 0.5 ? '#4a3630' : '#2e2220', 0.35); }
    { const gr = g.createRadialGradient(LAMP[0], LAMP[1], 30, LAMP[0], LAMP[1] + 60, 620); gr.addColorStop(0, 'rgba(255,170,90,0.42)'); gr.addColorStop(0.5, 'rgba(255,150,80,0.12)'); gr.addColorStop(1, 'rgba(255,150,80,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 720); }
    for (const x of [320, 1000]) { g.fillStyle = VG(g, 0, 470, [[0, '#1a100c'], [1, '#4a3022']]); g.fillRect(x - 12, 60, 24, 410); S2(g, [x - 5, 70, x - 5, 460], '#9a6a48', 1.2, 0.4); }
    g.fillStyle = VG(g, 40, 80, [[0, '#5a3a22'], [1, '#22140c']]); g.fillRect(0, 48, W, 30); S2(g, [0, 51, W, 51], '#a06a44', 1.2, 0.45);
    for (let x = 20; x < W; x += 60) { g.fillStyle = '#1a100a'; g.fillRect(x, 0, 14, 48); }
    // 창호지 문 (달빛, 대 그림자)
    { const ax = 40, aw = 240, ay = 130, ah = 300; g.fillStyle = '#c8cce0'; g.fillRect(ax, ay, aw, ah); const gr = g.createLinearGradient(ax, 0, ax + aw, 0); gr.addColorStop(0, 'rgba(120,140,200,0.55)'); gr.addColorStop(1, 'rgba(200,150,110,0.25)'); g.fillStyle = gr; g.fillRect(ax, ay, aw, ah);
      for (let k = 0; k < 5; k++) { const x = ax + 30 + k * 46; S2(g, [x, ay + ah, x + 6, ay], 'rgba(30,30,60,0.35)', 4); for (let j = 0; j < 4; j++) DAB(g, x + 10 + j * 4, ay + 40 + j * 60, 18, 4, 'rgba(30,30,60,0.3)', 1, -0.4); }
      g.strokeStyle = '#2a1c16'; g.lineWidth = 2.4; for (let x = ax; x <= ax + aw; x += 24) { g.beginPath(); g.moveTo(x, ay); g.lineTo(x, ay + ah); g.stroke(); } for (let y = ay; y <= ay + ah; y += 30) { g.beginPath(); g.moveTo(ax, y); g.lineTo(ax + aw, y); g.stroke(); }
      rr(g, ax - 7, ay - 7, aw + 14, ah + 14, 2, null, '#1a100c', 7); }
    // 병풍 (도깨비 뒤): 검은 테 안에 매화 가지
    { const bx = 420, by = 150, pw = 120, ph = 300; for (let k = 0; k < 4; k++) { const x = bx + k * pw; g.fillStyle = '#1e1410'; g.fillRect(x, by, pw, ph); g.fillStyle = VG(g, by, by + ph, [[0, '#e6d6b4'], [1, '#c8b48c']]); g.fillRect(x + 8, by + 8, pw - 16, ph - 16); g.globalAlpha = 0.25; g.fillStyle = '#ffb070'; g.fillRect(x + 8, by + 8, pw - 16, ph - 16); g.globalAlpha = 1; }
      S2(g, [bx + 30, by + 270, bx + 120, by + 180, bx + 210, by + 160, bx + 330, by + 90, bx + 430, by + 70], '#3a2a22', 6, 0.75); S2(g, [bx + 210, by + 160, bx + 250, by + 210], '#3a2a22', 3.6, 0.75); S2(g, [bx + 330, by + 90, bx + 350, by + 40], '#3a2a22', 3.6, 0.75);
      for (let i = 0; i < 36; i++) { const q = R(), x = bx + 60 + q * 380, y = by + 250 - q * 190 + (R() - 0.5) * 50; for (let p2 = 0; p2 < 5; p2++) DAB(g, x + Math.cos(p2 * 1.26) * 4, y + Math.sin(p2 * 1.26) * 4, 3.2, 3.2, i % 3 ? '#f6f2ea' : '#c8402f', 0.9); DAB(g, x, y, 1.6, 1.6, '#8a2a26', 1); }
      for (let k = 1; k < 4; k++) S2(g, [bx + k * pw, by, bx + k * pw, by + ph], '#0e0806', 2.4, 0.9); }
    // 장판 바닥: 기름 먹인 누런 종이, 이음매
    g.fillStyle = VG(g, 460, H, [[0, '#9a7a44'], [1, '#4a3420']]); g.fillRect(0, 456, W, H - 456);
    for (let y = 470; y < H; y += 40) S2(g, [0, y, W, y + 4], '#5a4024', 1.2, 0.5);
    for (let x = 60; x < W; x += 150) for (let y = 470; y < H; y += 80) S2(g, [x + (y % 2) * 70, y, x + (y % 2) * 70, y + 40], '#5a4024', 1, 0.4);
    for (let i = 0; i < 1000; i++) DAB(g, R() * W, 460 + R() * 260, 4 + R() * 12, 1 + R() * 2, R() < 0.5 ? '#aa8a52' : '#6a5030', 0.22);
    { const gr = g.createRadialGradient(720, 600, 20, 720, 600, 500); gr.addColorStop(0, 'rgba(255,190,110,0.35)'); gr.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = gr; g.fillRect(0, 400, W, 320); }
    // 돗자리: 붉은 천으로 가를 두른 왕골 자리
    { g.save(); g.translate(720, 590); g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.moveTo(-322, -52); g.lineTo(334, -52); g.lineTo(380, 88); g.lineTo(-368, 88); g.closePath(); g.fill();
      part(g, P(-310, -62, 310, -62, 356, 76, -356, 76), '#c8a46a', P(-356, 56, 356, 56, 356, 76, -356, 76), { shc: '#8a6a3a', lw: 2 });
      for (let k = -28; k <= 28; k++) S2(g, [k * 11, -60, k * 12.6, 74], '#a8844a', 1, 0.5); for (const y of [-34, -6, 22, 48]) S2(g, [-340, y, 340, y], '#e0c080', 1, 0.35);
      g.strokeStyle = '#8a2a24'; g.lineWidth = 9; g.beginPath(); g.moveTo(-310, -62); g.lineTo(310, -62); g.lineTo(356, 76); g.lineTo(-356, 76); g.closePath(); g.stroke(); g.strokeStyle = '#3a0e0c'; g.lineWidth = 1.6; g.stroke(); g.restore(); }
    // 엽전 꾸러미와 흩어진 투전
    for (const [x, y, n] of [[500, 560, 9], [600, 610, 6], [880, 614, 7], [960, 560, 5]]) for (let k = 0; k < n; k++) { const cx = x + (k % 3) * 12 - 12, cy = y - Math.floor(k / 3) * 5; part(g, E(cx, cy, 9, 4), '#d4a640', E(cx + 2, cy + 1, 8, 3), { shc: '#8a6a24', lw: 1 }); rr(g, cx - 2, cy - 1.4, 4, 2.8, 0.6, '#3a2a10'); }
    for (const [x, y, a] of [[548, 622, -0.4], [568, 626, 0.2], [846, 572, 0.8], [866, 576, 1.2], [990, 606, -0.9], [440, 600, 0.5]]) { g.save(); g.translate(x, y); g.rotate(a); part(g, RECT(-8, -30, 16, 60), '#f3ead2', RECT(-8, -30, 16, 8), { shc: '#b8322a', k: 0, lw: 1.2 }); g.restore(); }
    // 둘러앉은 노름꾼들 (등불 쪽에 빛 테)
    sitter(g, 300, 520, 1.05, 'rgba(255,190,120,0.9)', { arm: true, col: '#20161a' });
    sitter(g, 1130, 540, 1.1, 'rgba(255,190,120,0.9)', { flip: true, arm: true, col: '#20161a' });
    // 술상 (왼쪽 앞)
    { const x = 150, y = 640; g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(x, y + 30, 90, 12, 0, 0, TAU); g.fill(); part(g, E(x, y, 86, 22), '#7a4a2c', E(x, y + 6, 86, 18), { lw: 1.8 }); for (const sx of [-1, 1]) part(g, RECT(x + sx * 60 - 5, y + 10, 10, 24), '#5a3420', null, { lw: 1.2 });
      part(g, p => { p.moveTo(x - 26, y - 4); p.quadraticCurveTo(x - 46, y - 30, x - 34, y - 56); p.lineTo(x - 18, y - 56); p.quadraticCurveTo(x - 6, y - 30, x - 26, y - 4); p.closePath(); }, '#d8d0c0', null, { lw: 1.4 }); rr(g, x - 31, y - 66, 10, 12, 2, '#a07a4a', INK, 1);
      for (const dx of [8, 34]) part(g, E(x + dx, y - 4, 10, 4), '#f6efdc', null, { lw: 1.1 }); }
    vignette(g, 0.6);
  });
}
class GambleScene extends PlaceScene {
  constructor(o) { super(o, { bg: gambleBG, title: '투전판', hello: '헤헤, 한 판 하고 가! 끗수가 높은 쪽이 이기는 거야.', bub: [646, 290, 652], leave: '투전판을 나선다' }); this.rounds = 0; this.deal = null; }
  acts() {
    const r = G.run, d = id => this.done[id] ? '이번에는 했습니다' : null;
    return [
      { id: 'bet', label: '투전 한 판', cost: PLACE_COST.bet, sub: `이길 확률 ${Math.round(BET_WIN * 100)}% · 이기면 엽전 ${PLACE_COST.bet * 2}`, why: () => (this.rounds >= 3 ? '오늘은 세 판까지만' : null) || (r.gold < PLACE_COST.bet ? `엽전 ${PLACE_COST.bet} 부족` : null),
        go: () => { const win = place.bet(); this.rounds++; const me = win ? 4 + ((Math.random() * 6) | 0) : 1 + ((Math.random() * 5) | 0), you = win ? 1 + ((Math.random() * (me - 1)) | 0) : Math.min(9, me + 1 + ((Math.random() * (9 - me)) | 0)); this.deal = { t: 0, win, me, you }; sfx('card'); } },
      { id: 'wager', label: '도깨비와 내기', sub: '패 한 장을 건다 · 반반: 보물 하나 / 그 패를 잃는다', why: () => d('wager') || (r.deck.filter(c => CARDS[c.id].kind !== 'lead').length && r.deck.length > 6 ? null : '걸 패가 없다'),
        go: () => { this.say('뭘 걸 테야? 이기면 내 보물 하나 주지!'); this.deckPick('걸 패 고르기', '이기면 보물 하나, 지면 이 패를 도깨비가 가져갑니다 (반반)', c => CARDS[c.id].kind !== 'lead', c => { const res = place.wager(c.uid); if (!res) return; this.done.wager = 1; this.shake = 0.8; if (res.win) { sfx('star'); juice.burst(700, 360, '#f0d264', 16); this.say('에잇, 졌다! 약속은 약속이지.'); this.show('도깨비와의 내기에서 이겼습니다', res.lines); } else { sfx('deny'); this.say('헤헤헤, 이 패는 내 거야!'); this.show('도깨비와의 내기에서 졌습니다', res.lines); } }); } },
    ];
  }
  scene(g, t, dt) {
    const r = G.run; if (this.shake > 0) this.shake -= dt;
    // 들보에 매단 사방등: 흔들리는 빛 웅덩이
    { const sw = Math.sin(t * 1.2) * 5, x = LAMP[0] + sw, y = LAMP[1], f = 0.86 + 0.14 * Math.sin(t * 13) * Math.sin(t * 7.7);
      line(g, [LAMP[0], 78, x, y - 34], '#2a1a10', 2.2);
      glow(g, x, y, 330, '255,160,70', 0.4 * f); glow(g, x, y, 110, '255,210,130', 0.55 * f);
      part(g, P(x - 26, y - 34, x + 26, y - 34, x + 22, y + 26, x - 22, y + 26), '#ffe2a0', P(x + 6, y - 34, x + 26, y - 34, x + 22, y + 26, x + 4, y + 26), { shc: '#f0b860', lw: 1.6 });
      for (const sx of [-1, 1]) line(g, [x + sx * 26, y - 34, x + sx * 22, y + 26], '#4a2a18', 3); for (const yy of [-34, 26]) line(g, [x - 28, y + yy, x + 28, y + yy], '#4a2a18', 3.4);
      line(g, [x - 24, y - 4, x + 24, y - 4], 'rgba(120,60,20,0.4)', 1.4); part(g, P(x - 18, y - 34, x + 18, y - 34, x, y - 44), '#4a2a18', null, { lw: 1.2 }); line(g, [x, y + 26, x, y + 40], '#b8322a', 2); ell(g, x, y + 44, 3, 5, '#b8322a'); }
    // 담배 연기 (왼쪽 노름꾼의 곰방대에서)
    { const px = 356, py = 470; line(g, [px - 10, py + 10, px + 30, py - 4], '#3a2418', 2.6); ell(g, px + 32, py - 6, 4, 3, '#6a4428', INK, 1); glow(g, px + 32, py - 8, 8, '255,140,60', 0.6);
      for (let k = 0; k < 8; k++) { const q = ((t * 0.1 + k / 8) % 1), x = px + 34 + Math.sin(q * 6 + k) * 26 + q * 120, y = py - 10 - q * 300; g.globalAlpha = 0.16 * (1 - q); ell(g, x, y, 14 + q * 40, 8 + q * 18, '#c8bcd0'); } g.globalAlpha = 1; }
    // 도깨비 노름꾼과 영웅
    const dx = this.shake > 0 ? Math.sin(t * 50) * 3 : 0;
    puppet(g, 'orc', 640 + dx, 546, 1.8, t, { act: this.deal ? 'talk' : this.shake > 0 ? 'shake' : 'idle', face: 1, noStick: true });
    puppet(g, r.hero, 826, 600, 1.7, t, { act: this.joy > 0 ? 'hop' : 'idle', face: -1, noStick: true });
    // 투전 한 판: 도깨비와 내가 한 장씩 뽑아 뒤집는다
    if (this.deal) {
      const D = this.deal; D.t += dt; const lift = easeOutBack(clamp(D.t / 0.4, 0, 1)), flip = clamp((D.t - 0.6) / 0.35, 0, 1);
      tujeon(g, 690, 620 - lift * 130, 1.25, D.you, flip, -0.12); tujeon(g, 790, 630 - lift * 130, 1.25, D.me, flip, 0.12);
      if (flip >= 1) { rr(g, 636, 366, 108, 28, 7, 'rgba(20,10,10,0.78)', 'rgba(240,210,124,0.6)', 1); text(g, `도깨비 ${D.you}끗`, 690, 380.5, { size: 17, font: FONT_B, fill: '#f6e2b0' }); rr(g, 740, 376, 100, 28, 7, 'rgba(20,10,10,0.78)', 'rgba(240,210,124,0.6)', 1); text(g, `나 ${D.me}끗`, 790, 390.5, { size: 17, font: FONT_B, fill: D.win ? '#9fe0a0' : '#ff9a86' }); }
      if (D.t > 1.1 && !D.said) { D.said = true; if (D.win) { sfx('coin'); juice.burst(790, 480, '#f0d264', 12); this.say('에이, 운이 좋구먼! 한 판 더?'); this.show('투전 한 판 — 이겼습니다', [`엽전 +${PLACE_COST.bet}`]); } else { sfx('deny'); this.say('헤헤, 내 끗이 높지롱!'); this.show('투전 한 판 — 졌습니다', [`엽전 -${PLACE_COST.bet}`]); } }
      if (D.t > 1.9) this.deal = null;
    }
    motes(g, t, 420, 160, 620, 320, 14, '255,200,140', 0.35);
  }
}

// ═════════════════════════ 의병 모집소 ═════════════════════════
// 구름 낀 늦은 오후의 마을 마당. 토담에 붙은 격문, 느티나무 아래 모집 책상과 명부, 담에 기댄 죽창과 농기구, 군량 가마니.
// 흰 깃발 아래 장정들이 줄을 서고, 갓 쓴 의병장이 맞이한다
const MUSTER_LINE = [[930, 446], [1010, 452], [1090, 448]];
function musterBG() {
  return once('muster', g => {
    const R = rng(9393), Pp = PAL('pass'), haze = '#d8d4c8';
    g.fillStyle = VG(g, 0, 330, [[0, '#6e7a8c'], [0.6, '#b4b0a6'], [1, '#e8d8b8']]); g.fillRect(0, 0, W, 340);
    for (const [x, y, w] of [[200, 70, 320], [640, 40, 360], [1080, 90, 300], [420, 150, 220], [900, 170, 240]]) for (let k = 0; k < 16; k++) { DAB(g, x + (k - 8) * w * 0.06, y + Math.sin(k * 1.3) * 6, w * 0.1, w * 0.04, k % 3 ? '#8e909e' : '#c8c4bc', 0.5); DAB(g, x + (k - 8) * w * 0.06, y - 6, w * 0.08, w * 0.03, '#ece8e0', 0.25); }
    { const gr = g.createRadialGradient(1000, 140, 10, 1000, 140, 320); gr.addColorStop(0, 'rgba(255,230,180,0.6)'); gr.addColorStop(1, 'rgba(255,230,180,0)'); g.fillStyle = gr; g.fillRect(600, 0, 680, 400); }
    MOUNT(g, x => 260 - 60 * Math.exp(-(((x - 300) / 240) ** 2)) - 70 * Math.exp(-(((x - 900) / 220) ** 2)) - 6 * Math.sin(x * 0.02), W, 310, '#76806e', haze, R, { h: 110, n: 140, mist: 40 });
    // 비탈의 초가 마을
    for (let i = 0; i < 10; i++) { const x = 40 + i * 132 + R() * 30, y = 318 + Math.sin(i) * 6, w = 70 + R() * 30; g.fillStyle = '#d8c8a0'; g.fillRect(x - w * 0.36, y - 16, w * 0.72, 16); g.fillStyle = '#6a5038'; g.fillRect(x - 4, y - 12, 8, 12); g.fillStyle = VG(g, y - 36, y - 12, [[0, '#c8a868'], [1, '#8a6a3a']]); g.beginPath(); g.moveTo(x - w * 0.5, y - 12); g.quadraticCurveTo(x - w * 0.4, y - 34, x, y - 36); g.quadraticCurveTo(x + w * 0.4, y - 34, x + w * 0.5, y - 12); g.closePath(); g.fill(); for (let k = -3; k <= 3; k++) S2(g, [x + k * w * 0.08, y - 34 + Math.abs(k) * 2, x + k * w * 0.12, y - 13], '#a8884a', 0.8, 0.5); }
    for (let k = 0; k < 4; k++) { const x = 180 + k * 300; for (let q = 0; q < 6; q++) DAB(g, x + Math.sin(q) * 8 + q * 6, 290 - q * 22, 8 + q * 4, 5 + q * 2, '#e8e4dc', 0.12); }   // 저녁밥 짓는 연기
    // 마당
    g.fillStyle = VG(g, 330, H, [[0, '#bca47c'], [1, '#7a6444']]); g.fillRect(0, 330, W, H - 330);
    for (let i = 0; i < 2600; i++) { const x = R() * W, y = 334 + R() * 386; DAB(g, x, y, 3 + R() * 11, 1 + R() * 2.5, R() < 0.5 ? '#a08a64' : '#cab48a', 0.3); }
    // 토담과 격문 (왼쪽)
    { g.fillStyle = VG(g, 250, 446, [[0, '#c8a87a'], [1, '#8a6e4a']]); g.fillRect(0, 262, 480, 184); for (let i = 0; i < 240; i++) DAB(g, R() * 480, 270 + R() * 170, 5 + R() * 10, 2 + R() * 3, R() < 0.5 ? '#a88a5e' : '#d8bc8e', 0.4);
      for (let y = 280; y < 440; y += 22) for (let x = ((y / 22) % 2) * 30; x < 480; x += 60) DAB(g, x, y, 22, 7, '#9a7a52', 0.25);
      part(g, p => { p.moveTo(-10, 262); p.quadraticCurveTo(240, 238, 490, 262); p.lineTo(490, 276); p.quadraticCurveTo(240, 252, -10, 276); p.closePath(); }, '#c8a060', null, { lw: 1.6 }); for (let k = 0; k < 42; k++) S2(g, [k * 12, 252 - Math.sin(k / 42 * Math.PI) * 14, k * 12 + 4, 274], '#8a6a3a', 0.9, 0.6);
      // 격문: 세로로 늘어선 붓글씨 줄, 끝에 붉은 도장
      const fx = 110, fy = 292, fw = 250, fh = 136; g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(fx + 6, fy + 6, fw, fh); g.fillStyle = VG(g, fy, fy + fh, [[0, '#fbf6e6'], [1, '#e8dcbc']]); g.fillRect(fx, fy, fw, fh);
      // 한글 격문: 붓글씨로 큼직하게 '의병 모집', 아래에 두 줄
      text(g, '의병 모집', fx + 92, fy + 34, { size: 30, font: FONT_B, fill: '#1e1a1c', maxW: 160 });
      S2(g, [fx + 22, fy + 58, fx + 166, fy + 58], '#1e1a1c', 1.4, 0.6);
      text(g, '고을을 지킬 장정은', fx + 92, fy + 80, { size: 15, font: FONT_B, fill: '#2a2224', maxW: 160 });
      text(g, '이 마당으로 모이시오', fx + 92, fy + 102, { size: 15, font: FONT_B, fill: '#2a2224', maxW: 160 });
      DAB(g, fx + 176, fy + fh - 18, 9, 9, '#b8322a', 0.9); rr(g, fx + 168, fy + fh - 26, 16, 16, 2, null, '#fbe8d8', 1.1);
      for (const [x, y] of [[fx + 4, fy + 4], [fx + fw - 4, fy + 4], [fx + 4, fy + fh - 4], [fx + fw - 4, fy + fh - 4]]) DAB(g, x, y, 4, 4, '#3a2a20', 0.9); }
    // 느티나무 (가운데 뒤)
    { g.fillStyle = VG(g, 200, 470, [[0, '#5a4a3a'], [1, '#2e241c']]); g.beginPath(); g.moveTo(600, 476); g.quadraticCurveTo(630, 380, 620, 300); g.quadraticCurveTo(612, 220, 590, 160); g.lineTo(650, 156); g.quadraticCurveTo(668, 250, 668, 310); g.quadraticCurveTo(676, 400, 712, 476); g.closePath(); g.fill();
      for (let k = 0; k < 16; k++) { const yy = 466 - k * 19; S2(g, [610 + k, yy, 650 + k, yy - 8], '#1e160f', 1.3, 0.5); } S2(g, [660, 460, 660, 300, 646, 170], '#c8b090', 1.8, 0.3);
      for (const [a, b, c2, d2, w] of [[620, 230, 470, 150, 10], [640, 210, 820, 140, 10], [630, 180, 560, 70, 8], [646, 176, 720, 60, 8]]) S2(g, [a, b, (a + c2) / 2, (b + d2) / 2 - 12, c2, d2], '#3a2c22', w);
      for (let i = 0; i < 600; i++) { const a = R() * TAU, d = Math.sqrt(R()), x = 640 + Math.cos(a) * 270 * d, y = 130 + Math.sin(a) * 112 * d; DAB(g, x, y, 5 + R() * 8, 3 + R() * 4, R() < 0.5 ? '#3e5a34' : R() < 0.8 ? '#5a7a44' : '#7a9a54', 0.88, R() * 3); }
      for (let i = 0; i < 90; i++) { const a = -0.3 - R() * 2.6, x = 640 + Math.cos(a) * 236, y = 130 + Math.sin(a) * 92; DAB(g, x, y, 3 + R() * 5, 2 + R() * 2, '#c8d890', 0.45); }
      g.fillStyle = 'rgba(40,30,20,0.25)'; g.beginPath(); g.ellipse(660, 484, 200, 20, 0, 0, TAU); g.fill(); }
    // 군량 가마니 더미 (오른쪽 뒤)
    for (const [x, y] of [[1150, 430], [1220, 432], [1185, 402], [1255, 404], [1220, 376]]) { part(g, E(x, y, 38, 18), '#c8a868', E(x + 6, y + 6, 34, 14), { shc: '#8a6a3a', lw: 1.6 }); for (let k = -3; k <= 3; k++) S2(g, [x + k * 9, y - 16, x + k * 10, y + 16], '#8a6a3a', 0.8, 0.6); S2(g, [x - 34, y - 2, x + 34, y - 2], '#6a4a2a', 1.4, 0.7); }
    // 담에 기대 세운 죽창과 낫·쇠스랑
    for (let k = 0; k < 5; k++) { const x = 500 + k * 15, top = 292 + (k % 2) * 12, lean = 64; S2(g, [x, 470, x + lean, top], INK, 6.4); S2(g, [x, 470, x + lean, top], '#a8b45a', 4); for (const q of [0.25, 0.5, 0.75]) { const qx = x + lean * q, qy = 470 - (470 - top) * q; S2(g, [qx - 3, qy, qx + 3, qy], '#6a7a34', 1.4); } const tx = x + lean, ty = top; g.fillStyle = '#e8eec0'; g.beginPath(); g.moveTo(tx - 3.6, ty + 3); g.lineTo(tx + 3.6, ty - 2); g.lineTo(tx + 3, ty - 22); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); }
    S2(g, [512, 420, 600, 404], '#d9b77a', 3.4); S2(g, [512, 420, 600, 404], INK, 1, 0.5);
    { S2(g, [596, 474, 620, 352], INK, 5); S2(g, [596, 474, 620, 352], '#8a6a3a', 3); g.fillStyle = '#c8ccd4'; g.beginPath(); g.moveTo(618, 356); g.quadraticCurveTo(650, 338, 664, 366); g.quadraticCurveTo(646, 352, 620, 364); g.closePath(); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.4; g.stroke(); }   // 낫
    { S2(g, [430, 470, 446, 322], INK, 5); S2(g, [430, 470, 446, 322], '#8a6a3a', 3); S2(g, [428, 324, 466, 328], INK, 4); for (let q = 0; q < 4; q++) { S2(g, [430 + q * 12, 325, 428 + q * 12, 302], INK, 3.4); S2(g, [430 + q * 12, 325, 428 + q * 12, 302], '#a8acb4', 1.8); } }   // 쇠스랑
    for (let i = 0; i < 50; i++) PTUFT(g, R() * W, 360 + R() * 350, 0.7 + R() * 0.6, Pp, R);
    vignette(g, 0.38);
  });
}
class MusterScene extends PlaceScene {
  constructor(o) { super(o, { bg: musterBG, title: '의병 모집소', hello: '요괴에 맞설 장정들이 모였소. 데려가 주시겠소?', bub: [470, 284, 470], leave: '모집소를 떠난다' }); }
  acts() {
    const r = G.run, gold = c => r.gold < c ? `엽전 ${c} 부족` : null, d = id => this.done[id] ? '이번에는 했습니다' : null;
    return [
      { id: 'recruit', label: '장정을 고른다', sub: '병력 패 셋 중 하나를 데려간다', why: () => d('recruit'),
        go: () => { const opts = place.musterOffer(); this.pick = { kind: 'cards', title: '함께 갈 장정', sub: '셋 중 하나를 골라 병력 패로 데려갑니다', opts, cancel: true, onPick: i => { const s = place.recruit(opts[i]); this.done.recruit = 1; sfx('place'); this.say('잘 부탁하오. 저들은 물러서지 않을 게요.'); this.show('장정이 군대에 들어왔습니다', [s]); } }; } },
      { id: 'call', label: '격문을 붙인다', cost: PLACE_COST.call, sub: '의병 봉기 패 두 장', why: () => d('call') || gold(PLACE_COST.call), go: () => { const out = place.call(); this.done.call = 1; sfx('star'); this.say('격문을 보고 고을마다 장정들이 일어설 게요.'); this.show('고을에 격문을 붙였습니다', out); } },
      { id: 'feed', label: '군량을 댄다', cost: PLACE_COST.feed, sub: `부대 한도 +1 (지금 ${r.cap})`, why: () => d('feed') || (r.fed ? '이번 원정에는 이미 군량을 댔다' : null) || (r.cap >= MAX_CAP ? '부대 한도가 가득 찼다' : null) || gold(PLACE_COST.feed), go: () => { const out = place.feed(); this.done.feed = 1; sfx('coin'); this.say('배가 든든해야 싸우지요. 고맙소!'); this.show('의병들에게 군량을 댔습니다', out); } },
    ];
  }
  scene(g, t) {
    const r = G.run;
    beams(g, 900, 0, 520, 2.0, 5, t, '255,236,200', 0.08);
    // 흰 깃발 둘: 붉은 테를 두르고, 가운데에 먹으로 그린 죽창과 낫
    for (const [x, top, ph] of [[296, 150, 0], [840, 170, 1.7]]) { line(g, [x, 566, x, top], INK, 6); line(g, [x, 566, x, top], '#8a6a3a', 3.6); ell(g, x, top - 4, 5, 5, '#d8a944', INK, 1.2);
      const wv = (q, base) => base + Math.sin(t * 3 + ph + q * 4) * 8 * q;
      path(g, p => { p.moveTo(x, top + 6); for (let i = 0; i <= 8; i++) { const q = i / 8; p.lineTo(x + q * 128, wv(q, top + 6)); } for (let i = 8; i >= 0; i--) { const q = i / 8; p.lineTo(x + q * 128, wv(q, top + 92) - q * 6); } p.closePath(); }, '#f6f2e6', INK, 1.6);
      for (const yy of [top + 13, top + 85]) path(g, p => { for (let i = 0; i <= 8; i++) { const q = i / 8, y = wv(q, yy) - (yy > top + 50 ? q * 6 : 0); if (i) p.lineTo(x + q * 124, y); else p.moveTo(x + 4, y); } }, null, RED, 3.2);
      symbol(g, 'muster', x + 66, wv(0.5, top + 49), 56, '#1e1a1c', { brush: true, rot: -0.06 }); }
    // 줄을 선 장정들 (의병)
    MUSTER_LINE.forEach(([x, y], i) => puppet(g, i === 1 ? 'spear' : 'militia', x, y, 1.3, t + i, { act: 'idle', face: -1, noStick: true }));
    // 의병장 (책상 뒤): 갓 쓰고 칼을 찬 선비
    seonbi(g, 470, 534, 1.2, t, { hold: 'sword', beard: 'black', talk: this.lineT < 2.2 });
    { const x = 420, y = 556; g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, y + 32, 124, 12, 0, 0, TAU); g.fill();
      part(g, RECT(x - 112, y - 14, 224, 14), '#8a5a34', RECT(x - 112, y - 6, 224, 6), { lw: 1.8 }); for (const sx of [-1, 1]) part(g, RECT(x + sx * 98 - 5, y, 10, 30), '#5a3820', null, { lw: 1.2 });
      part(g, P(x - 62, y - 16, x - 4, y - 22, x - 4, y - 14, x - 62, y - 8), '#f6efdc', null, { lw: 1.1 }); part(g, P(x + 4, y - 22, x + 62, y - 16, x + 62, y - 8, x + 4, y - 14), '#f6efdc', null, { lw: 1.1 });
      for (let k = 0; k < 5; k++) { line(g, [x - 54 + k * 10, y - 18, x - 54 + k * 10, y - 11], '#2a2420', 1.4); line(g, [x + 12 + k * 10, y - 20, x + 12 + k * 10, y - 12], '#2a2420', 1.4); }
      rr(g, x + 72, y - 22, 20, 12, 3, '#2a2a30', INK, 1); line(g, [x + 98, y - 20, x + 114, y - 36], '#8a6a3a', 2.4); }
    puppet(g, r.hero, 720, 600, 1.7, t, { act: this.joy > 0 ? 'hop' : 'idle', face: -1, noStick: true });
    // 날리는 느티나무 잎
    for (let i = 0; i < 10; i++) { const q = ((t * 0.05 + i * 0.19) % 1), x = 440 + ((i * 97) % 420) + Math.sin(t * 1.1 + i) * 30, y = 160 + q * 460; g.globalAlpha = 0.8 * Math.sin(q * Math.PI); ell(g, x, y, 3.4, 1.8, i % 2 ? '#6a8a44' : '#a8b860'); } g.globalAlpha = 1;
  }
}

// ═════════════════════════ 숨은 길 ═════════════════════════
// 달빛이 겨우 드는 깊은 숲. 두 고목 사이 금줄 너머 이끼 낀 돌단에 반쯤 열린 함이 금빛을 흘리고,
// 오른쪽 바위 굴에서는 붉은 불빛과 웃음소리, 도깨비불이 떠돈다
const MOSS = { rock: ['#3a4640', '#121a16'], grass: ['#1e2a1e', '#2e3e2a', '#0e160e'] };
function hiddenBG() {
  return once('hidden', g => {
    const R = rng(1313);
    g.fillStyle = VG(g, 0, H, [[0, '#060a12'], [0.5, '#0e1a1e'], [1, '#141e1a']]); g.fillRect(0, 0, W, H);
    { const gr = g.createRadialGradient(980, -40, 20, 980, -40, 640); gr.addColorStop(0, 'rgba(170,200,230,0.38)'); gr.addColorStop(1, 'rgba(170,200,230,0)'); g.fillStyle = gr; g.fillRect(380, 0, 900, 640); }
    // 겹겹의 고목 줄기 (멀수록 옅고 가늘게, 사이사이 안개)
    const trunk = (x, w, col, hi, a) => { g.globalAlpha = a; g.fillStyle = col; g.beginPath(); g.moveTo(x - w * 0.5, -10); g.lineTo(x + w * 0.5, -10); g.quadraticCurveTo(x + w * 0.45, 300, x + w * 0.8, 540); g.lineTo(x - w * 0.8, 540); g.quadraticCurveTo(x - w * 0.45, 300, x - w * 0.5, -10); g.closePath(); g.fill(); g.globalAlpha = a * 0.5; g.strokeStyle = hi; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + w * 0.3, 0); g.quadraticCurveTo(x + w * 0.3, 300, x + w * 0.55, 520); g.stroke(); for (let k = 0; k < 8; k++) { g.globalAlpha = a * 0.35; g.strokeStyle = '#000'; g.lineWidth = 1; const yy = 40 + k * 60; g.beginPath(); g.moveTo(x - w * 0.4, yy); g.quadraticCurveTo(x, yy + 6, x + w * 0.4, yy); g.stroke(); } g.globalAlpha = 1; };
    for (const [n, a, w0, col, hi] of [[16, 0.45, 16, '#1e2a30', '#6a8aa0'], [10, 0.7, 26, '#141c20', '#5a7a90'], [5, 1, 40, '#0a1012', '#4a6a7a']]) { for (let i = 0; i < n; i++) trunk(R() * W, w0 * (0.7 + R() * 0.6), col, hi, a); g.globalAlpha = 0.3; g.fillStyle = '#2a3a42'; g.fillRect(0, 290 + n * 6, W, 70); g.globalAlpha = 1; }
    for (let i = 0; i < 300; i++) { const x = R() * W, y = R() * 220; DAB(g, x, y, 10 + R() * 24, 4 + R() * 8, R() < 0.5 ? '#0e1a14' : '#16261c', 0.82); }
    // 달빛 비친 나뭇잎 가장자리
    for (let i = 0; i < 80; i++) { const x = 600 + R() * 680, y = R() * 200; DAB(g, x, y, 6 + R() * 10, 2 + R() * 3, '#5a7a84', 0.3); }
    // 바닥: 이끼 낀 흙과 굽이진 좁은 길
    g.fillStyle = VG(g, 440, H, [[0, '#1e2a22'], [1, '#0e1610']]); g.fillRect(0, 440, W, H - 440);
    for (let i = 0; i < 2600; i++) { const x = R() * W, y = 444 + R() * 276; DAB(g, x, y, 3 + R() * 10, 1 + R() * 3, R() < 0.5 ? '#2a3a2a' : '#121c14', 0.35); }
    { g.fillStyle = VG(g, 440, H, [[0, '#3e3c30'], [1, '#6a604a']]); g.globalAlpha = 0.85; g.beginPath(); g.moveTo(540, H); g.bezierCurveTo(520, 620, 700, 560, 640, 500); g.bezierCurveTo(600, 470, 660, 450, 650, 440); g.lineTo(676, 440); g.bezierCurveTo(690, 456, 640, 480, 690, 506); g.bezierCurveTo(780, 560, 640, 630, 780, H); g.closePath(); g.fill(); g.globalAlpha = 1;
      for (let i = 0; i < 300; i++) { const y = 450 + R() * 270, q = (y - 440) / 280, x = 650 + (R() - 0.5) * (30 + q * 200); DAB(g, x, y, 2 + R() * 4, 1 + R() * 1.6, R() < 0.5 ? '#8a8068' : '#4a4436', 0.4); } }
    // 왼쪽 돌단: 이끼 낀 받침돌 셋 위에 옛 함
    { const x = 300, y = 520; for (const [dx, dy, w, h] of [[0, 22, 240, 44], [0, -6, 196, 36], [0, -32, 160, 28]]) PROCK(g, x + dx, y + dy, w, h, MOSS, R);
      for (let i = 0; i < 110; i++) DAB(g, x + (R() - 0.5) * 220, y - 36 + R() * 70, 4 + R() * 6, 2 + R() * 3, R() < 0.5 ? '#3a5a30' : '#24402a', 0.8);
      for (const sx of [-1, 1]) { PROCK(g, x + sx * 110, y - 10, 30, 70, MOSS, R); } }
    // 오른쪽 바위 굴
    { const cx = 1010, cy = 420; for (const [dx, dy, w, h] of [[-130, 70, 200, 140], [120, 60, 230, 170], [0, -70, 320, 150], [-160, -30, 150, 130], [160, -40, 170, 140]]) PROCK(g, cx + dx, cy + dy, w, h, MOSS, R);
      g.fillStyle = '#040203'; g.beginPath(); g.moveTo(cx - 96, cy + 120); g.quadraticCurveTo(cx - 108, cy - 30, cx - 10, cy - 56); g.quadraticCurveTo(cx + 96, cy - 44, cx + 96, cy + 120); g.closePath(); g.fill();
      for (let i = 0; i < 90; i++) DAB(g, cx + (R() - 0.5) * 330, cy - 120 + R() * 90, 5 + R() * 8, 3 + R() * 4, R() < 0.5 ? '#2a4626' : '#183020', 0.85);
      for (let k = 0; k < 9; k++) { const x = cx - 110 + k * 26, l = 30 + R() * 50; S2(g, [x, cy - 70 + (k % 3) * 6, x + (R() - 0.5) * 10, cy - 70 + l], '#1e3420', 2.2, 0.8); } }
    // 앞쪽 수풀과 대나무
    for (const sx of [0, 1]) for (let k = 0; k < 7; k++) { const x = sx ? 1180 + k * 16 : 20 + k * 16, h = 380 + R() * 200; S2(g, [x, H, x + (sx ? -1 : 1) * 30, H - h], '#0a140c', 7); S2(g, [x, H, x + (sx ? -1 : 1) * 30, H - h], '#2a462a', 3.4, 0.7); for (let j = 1; j < 6; j++) { const yy = H - h * j / 6; DAB(g, x + (sx ? -1 : 1) * (30 * j / 6 + 16), yy, 22, 4, '#1a3020', 0.9, sx ? 0.5 : -0.5); } }
    for (let i = 0; i < 90; i++) PTUFT(g, R() * W, 600 + R() * 120, 1 + R() * 0.8, { grass: ['#1e2a1e', '#2e3e2a', '#0e160e'] }, R);
    vignette(g, 0.7);
  });
}
// 금줄을 맨 두 고목 (앞)
function oldTree(g, x, top, w) {
  g.fillStyle = VG(g, top, 510, [[0, '#161a18'], [1, '#2a2a22']]); g.beginPath(); g.moveTo(x - w * 0.42, top); g.lineTo(x + w * 0.42, top); g.quadraticCurveTo(x + w * 0.46, 400, x + w * 0.7, 470); g.quadraticCurveTo(x + w * 1.1, 500, x + w * 1.5, 512); g.lineTo(x - w * 1.5, 512); g.quadraticCurveTo(x - w * 1.1, 500, x - w * 0.7, 470); g.quadraticCurveTo(x - w * 0.46, 400, x - w * 0.42, top); g.closePath(); g.fill();
  for (let k = 0; k < 14; k++) { const y = top + 14 + k * 26, dx = Math.sin(k * 2.3) * w * 0.12; path(g, p => { p.moveTo(x - w * 0.36 + dx, y); p.quadraticCurveTo(x + dx, y + 8, x + w * 0.3 + dx, y + 2); }, null, 'rgba(0,0,0,0.55)', 1.4); }
  for (let k = 0; k < 5; k++) { const xx = x - w * 0.3 + k * w * 0.15; path(g, p => { p.moveTo(xx, top); p.lineTo(xx + Math.sin(k) * 3, 480); }, null, 'rgba(90,110,100,0.25)', 1); }
  g.strokeStyle = 'rgba(150,180,200,0.45)'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + w * 0.3, top); g.quadraticCurveTo(x + w * 0.36, 380, x + w * 0.66, 470); g.stroke();
  for (let i = 0; i < 18; i++) { const yy = top + 40 + (i * 53) % 300, xx = x + ((i * 37) % 10 - 5) * w * 0.06; ell(g, xx, yy, 5 + (i % 3) * 2, 3, i % 2 ? 'rgba(60,100,60,0.55)' : 'rgba(40,70,40,0.6)'); }
}
class HiddenScene extends PlaceScene {
  constructor(o) { super(o, { bg: hiddenBG, title: '숨은 길', hello: '…금줄을 쳐 둔 데는 까닭이 있을 텐데.', bub: [660, 258, 650], leave: '조용히 돌아 나간다' }); this.onFight = o.onFight; }
  acts() {
    const d = () => this.done.any ? '이미 골랐다' : null;
    return [
      { id: 'loot', label: '금줄 너머 보물', sub: '보물 둘을 얻지만, 부정 하나가 따라온다', why: d, go: () => { const out = place.loot(); this.done.any = 1; this.open = 0.01; sfx('star'); juice.burst(300, 420, '#f0d264', 18); this.say('…등 뒤가 서늘하다. 무언가 따라붙었어.'); this.show('금줄 너머의 보물을 챙겼습니다', out); } },
      { id: 'fight', label: '도깨비 굴로 들어간다', sub: '강적과 싸운다 · 이기면 보물을 얻는다', why: d, go: () => { this.done.any = 1; this.left = true; sfx('boss'); if (this.onFight) this.onFight(); else this.onDone(); } },
    ];
  }
  scene(g, t, dt) {
    const r = G.run; if (this.open) this.open = Math.min(1, this.open + dt * 1.5);
    beams(g, 880, -20, 760, 2.2, 4, t, '180,210,240', 0.07);
    // 굴 안의 불빛과 눈
    { const f = 0.8 + 0.2 * Math.sin(t * 7) * Math.sin(t * 3.1); glow(g, 1010, 470, 130, '255,90,40', 0.5 * f); glow(g, 1010, 486, 56, '255,170,80', 0.5 * f);
      for (const [x, y, ph] of [[980, 438, 0], [1044, 460, 2.3]]) { const bl = (t * 0.5 + ph) % 3 < 0.12; if (!bl) for (const sx of [-1, 1]) { ell(g, x + sx * 7, y, 3.6, 2.2, '#ffd040'); glow(g, x + sx * 7, y, 10, '255,200,60', 0.6); ell(g, x + sx * 7, y, 1, 1.8, INK); } } }
    // 도깨비불
    for (let i = 0; i < 6; i++) { const ph = i * 1.9, x = 860 + Math.sin(t * 0.6 + ph) * 170 + i * 26, y = 320 + Math.sin(t * 1.1 + ph * 1.3) * 60 - i * 12; glow(g, x, y, 24, '120,200,255', 0.55); ell(g, x, y, 3.6, 4.4, '#e8f6ff'); }
    // 금줄 너머 함: 금빛이 새어 나오고, 챙기면 뚜껑이 열린다
    { const x = 300, y = 520, k = this.open || 0, lid = k * 0.9;
      glow(g, x, y - 100, 100 + k * 80, '255,210,120', 0.4 + k * 0.4);
      part(g, RECT(x - 56, y - 92, 112, 46), '#5a3a22', RECT(x - 56, y - 60, 112, 14), { lw: 2 }); for (const sx of [-1, 1]) part(g, RECT(x + sx * 40 - 5, y - 92, 10, 46), '#b8862a', null, { lw: 1.2 }); part(g, E(x, y - 70, 8, 8), '#d8a944', null, { lw: 1.2 });
      g.save(); g.translate(x - 56, y - 92); g.rotate(-0.1 - lid * 1.2); part(g, p => { p.moveTo(0, 0); p.lineTo(112, 0); p.lineTo(106, -24); p.lineTo(4, -24); p.closePath(); }, '#6a4428', null, { lw: 2 }); g.restore();
      for (let i = 0; i < 7; i++) { const q = ((t * 0.4 + i / 7) % 1); g.globalAlpha = (1 - q) * 0.85; ell(g, x - 36 + i * 12, y - 96 - q * 80, 1.8, 1.8, '#ffe7a0'); } g.globalAlpha = 1;
      for (let i = 0; i < 5; i++) { const gx = x - 30 + i * 15; ell(g, gx, y - 96, 6, 3, '#f0c840', '#8a6a24', 0.8); } }
    // 길을 가로지른 금줄 (두 고목 사이)
    oldTree(g, 116, 100, 62); oldTree(g, 572, 130, 52);
    geumjul(g, 124, 336, 560, 358, 28, t, 6);
    // 떠도는 안개
    for (let i = 0; i < 7; i++) { const x = ((t * 18 + i * 260) % (W + 400)) - 200, y = 470 + (i % 3) * 60; g.globalAlpha = 0.12; ell(g, x, y, 230, 26, '#a8c0c8'); } g.globalAlpha = 1;
    puppet(g, r.hero, 660, 620, 1.7, t, { act: this.open ? 'tremble' : 'idle', face: Math.sin(t * 0.7) > 0 ? 1 : -1, noStick: true });
    // 반딧불
    for (let i = 0; i < 14; i++) { const ph = i * 2.1, x = 80 + ((i * 113) % 1120) + Math.sin(t * 0.5 + ph) * 26, y = 380 + ((i * 53) % 240) + Math.sin(t * 0.9 + ph) * 14, a = clamp(Math.sin(t * 1.4 + ph), 0, 1); glow(g, x, y, 8, '200,255,160', a * 0.5); }
  }
}

// run.js 가 쓰는 장소 장면들
export const PLACE_SCENES = { shaman: ShamanScene, seodang: SeodangScene, gamble: GambleScene, muster: MusterScene, hidden: HiddenScene };
export { ShamanScene, SeodangScene, GambleScene, MusterScene, HiddenScene, PlaceScene };
