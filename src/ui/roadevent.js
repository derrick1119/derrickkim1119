// 길 위의 사건: 밤 마당에 세운 인형극 무대에서 벌어진다.
// 무대에서는 영웅 인형과 길에서 만난 이가 마주 서고, 고를 수 있는 일은 무대 앞 새끼줄에 매단 한지 쪽지로 걸린다.
// 쪽지 하나를 뜯으면 나머지는 떨어지고, 무대의 인형이 결과에 따라 기뻐 뛰거나 부르르 떤 뒤 얻은 것이 새 쪽지로 걸린다
import { W, H } from '../config.js';
import { TAU, INK, RED, TEAL, SUB, FONT_B, text, textBlock, textLines, ell, rr, line, path, makeCanvas, rng, clamp, easeOutBack } from '../render/draw.js';
import { button, icon, panel, tapped, isDown } from './ui.js';
import { Overlay, resultIcon, BAD, GOOD } from './overlays.js';
import { glow, chorong, hangSign, scroll, motes, beams } from './places.js';
import { drawStage, drawFrame, puppet } from './theater.js';
import { G, save } from '../state.js';
import { chapterOf } from '../data/stages.js';
import { portrait, getLook } from '../render/sprites.js';
import { CARDS } from '../data/cards.js';
import { sfx } from '../audio.js';
import { juice } from './juice.js';

// 무대 자리와 새끼줄
const SX = 200, SY = 66, SW = 880, SH = 360, POLE = [40, 1240];
const ropeY = x => 530 + 14 * Math.sin(Math.PI * clamp((x - POLE[0]) / (POLE[1] - POLE[0]), 0, 1));
const STAGE_BG = { pass: 'pass', autumn: 'pass', snow: 'pass', ember: 'pass', grove: 'grove', mist: 'grove', storm: 'eve', dusk: 'dark', under: 'dark' };
const GOLD_AT = [1112, 36];
// 결과 쪽지의 그림: 물건이면 그 물건, 엽전이면 엽전, 'OO N단' 이면 그 인물의 얼굴, 사기면 별
function iconFor(s) {
  const ic = resultIcon(s); if (ic) return ic;
  if (/^엽전/.test(s)) return (g, x, y) => icon.coin(g, x, y, 20);
  const m = /^(.+) \d단$/.exec(s) || /^영물 패 \[(.+?)\]/.exec(s); if (m) { const id = Object.keys(CARDS).find(k => CARDS[k].name === m[1]), u = id && (CARDS[id].unit || (id.startsWith('h_') ? id.slice(2) : null)); if (u) return (g, x, y) => { g.save(); g.beginPath(); g.arc(x, y, 27, 0, TAU); g.fillStyle = '#efe3c4'; g.fill(); g.clip(); portrait(g, u, x, y + 40, 1.0 * 1.1 / getLook(u).scale); g.restore(); ell(g, x, y, 27, 27, null, '#c9962e', 2.2); }; }
  if (/사기/.test(s)) return (g, x, y) => icon.star(g, x, y, 20);
  return null;
}

// 무대 둘레: 밤하늘, 마을 지붕 그림자, 흙마당, 양쪽 대나무 장대 (한 번 굽는다)
let HBG = null;
function hallBG() {
  if (HBG) return HBG;
  const S = 1.5, c = makeCanvas(W * S, H * S), g = c.getContext('2d'), R = rng(5150); g.scale(S, S);
  const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#121426'); sky.addColorStop(0.55, '#221e36'); sky.addColorStop(1, '#2c222c'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 110; i++) { const x = R() * W, y = R() * 420, r = 0.5 + R() * 1.3; g.globalAlpha = 0.15 + R() * 0.55; ell(g, x, y, r, r, '#f6efdc'); } g.globalAlpha = 1;
  // 먼 산과 초가 지붕 그림자
  g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, 380 - 60 * Math.exp(-(((x - 160) / 150) ** 2)) - 50 * Math.exp(-(((x - 1120) / 170) ** 2)) - 8 * Math.sin(x * 0.02)); g.lineTo(W, H); g.closePath(); g.fillStyle = '#1b1a2c'; g.fill();
  for (const [x, w] of [[10, 170], [1090, 190]]) { g.beginPath(); g.moveTo(x, 470); g.quadraticCurveTo(x + w * 0.1, 418, x + w * 0.5, 410); g.quadraticCurveTo(x + w * 0.9, 418, x + w, 470); g.closePath(); g.fillStyle = '#16141f'; g.fill(); g.fillStyle = 'rgba(255,190,110,0.22)'; g.fillRect(x + w * 0.3, 452, 24, 18); }
  // 흙마당: 무대 불빛이 앞마당까지 번진다
  const gd = g.createLinearGradient(0, 430, 0, H); gd.addColorStop(0, '#3b2e2a'); gd.addColorStop(1, '#241c1e'); g.fillStyle = gd; g.fillRect(0, 440, W, H - 440);
  const pool = g.createRadialGradient(640, 450, 20, 640, 450, 560); pool.addColorStop(0, 'rgba(255,190,110,0.24)'); pool.addColorStop(1, 'rgba(255,190,110,0)'); g.fillStyle = pool; g.fillRect(0, 300, W, H - 300);
  for (let i = 0; i < 260; i++) { const x = R() * W, y = 450 + R() * 270, l = 3 + R() * 8; g.globalAlpha = 0.12; line(g, [x, y, x + l, y + (R() - 0.5) * 2], i % 2 ? '#8a6a4a' : '#d9c09a', 0.9); } g.globalAlpha = 1;
  // 대나무 장대: 위에는 초롱을 거는 팔, 아래에는 새끼줄을 맨다
  for (const x of POLE) {
    const d = x < W / 2 ? 1 : -1;
    rr(g, x - 7, 92, 14, H - 92, 6, '#7f8a4a', INK, 1.8); for (let y = 140; y < H; y += 74) { line(g, [x - 7, y, x + 7, y], INK, 1.6); line(g, [x - 5, y - 3, x + 5, y - 3], 'rgba(255,255,220,0.35)', 1); }
    g.fillStyle = 'rgba(255,255,220,0.22)'; g.fillRect(x - 4, 96, 3, H - 100);
    line(g, [x, 104, x + d * 96, 104], INK, 5); line(g, [x, 104, x + d * 96, 104], '#9a8a52', 3);
  }
  // 무대 밑 그늘
  g.fillStyle = 'rgba(10,6,10,0.35)'; g.beginPath(); g.ellipse(640, 446, 480, 14, 0, 0, TAU); g.fill();
  HBG = c; return c;
}
// 새끼줄: 꼬인 짚 무늬
function rope(g) {
  g.beginPath(); for (let x = POLE[0]; x <= POLE[1]; x += 10) { if (x === POLE[0]) g.moveTo(x, ropeY(x)); else g.lineTo(x, ropeY(x)); } g.lineWidth = 7; g.strokeStyle = INK; g.stroke(); g.lineWidth = 4.4; g.strokeStyle = '#c9a862'; g.stroke();
  for (let x = POLE[0] + 6; x < POLE[1]; x += 9) line(g, [x - 3, ropeY(x) - 2, x + 3, ropeY(x) + 2], 'rgba(90,60,20,0.6)', 1.2);
  for (const x of POLE) { ell(g, x, ropeY(x), 9, 6, '#c9a862', INK, 1.6); line(g, [x - 5, ropeY(x) - 2, x + 5, ropeY(x) + 2], 'rgba(90,60,20,0.6)', 1.2); }
}
// 한지 쪽지 한 장: 위는 나무 집게로 줄에 물리고, 아래 끝은 손으로 찢은 듯 들쭉날쭉하다
function sheet(g, x, y, w, h, band, o = {}) {
  const jag = p => { p.moveTo(x, y); p.lineTo(x + w, y); p.lineTo(x + w, y + h - 4); for (let i = 1; i <= 12; i++) p.lineTo(x + w - w * i / 12, y + h - 4 + ((i * 7) % 3 - 1) * 3.4); p.lineTo(x, y); p.closePath(); };
  g.save(); g.shadowColor = 'rgba(6,4,10,0.55)'; g.shadowBlur = 12; g.shadowOffsetY = 6; path(g, jag, o.fill || '#fbf3df'); g.restore();
  path(g, jag, o.fill || '#fbf3df', INK, 2);
  g.save(); g.beginPath(); jag(g); g.clip(); g.fillStyle = band; g.fillRect(x, y, w, 9); g.globalAlpha = 0.08; for (let i = 0; i < 14; i++) { const fx = x + ((i * 61) % 97) / 97 * w, fy = y + 14 + ((i * 37) % 89) / 89 * (h - 24); line(g, [fx, fy, fx + 9, fy + 3], '#7a6040', 1); } g.restore();
  if (o.ring) { rr(g, x + 4, y + 12, w - 8, h - 20, 4, null, o.ring, 1.6); }
  // 나무 집게
  const cx = x + w / 2; rr(g, cx - 7, y - 20, 14, 30, 4, '#a9753f', INK, 1.6); line(g, [cx, y - 16, cx, y + 6], 'rgba(40,24,14,0.6)', 1.2); ell(g, cx, y - 4, 3, 3, '#6a5030');
}

// 구경꾼 뒷모습 (머리와 어깨). kind: 0 갓 · 1 댕기 머리 아이 · 2 수건 쓴 아낙
function audience(g, x, y, s, kind, t) {
  const ink = '#140e14', rim = 'rgba(255,200,130,0.55)', bob = Math.sin(t * 1.3 + x) * 1.2;
  g.save(); g.translate(x, y + bob); g.scale(s, s);
  g.fillStyle = ink; g.beginPath(); g.moveTo(-26, 30); g.quadraticCurveTo(-26, -6, 0, -8); g.quadraticCurveTo(26, -6, 26, 30); g.closePath(); g.fill();
  g.beginPath(); g.arc(0, -20, 12, 0, TAU); g.fill();
  if (kind === 0) { g.beginPath(); g.ellipse(0, -28, 20, 4.4, 0, 0, TAU); g.fill(); g.fillRect(-6, -40, 12, 12); }
  else if (kind === 1) { g.beginPath(); g.moveTo(-2, -12); g.quadraticCurveTo(-6, 6, -2, 18); g.lineTo(2, 18); g.quadraticCurveTo(-2, 6, 2, -12); g.closePath(); g.fill(); g.fillStyle = '#8a2a26'; g.fillRect(-4, 14, 8, 5); }
  else { g.fillStyle = '#4a4248'; g.beginPath(); g.ellipse(0, -26, 13, 7, 0, Math.PI, TAU); g.fill(); }
  g.strokeStyle = rim; g.lineWidth = 1.4; g.beginPath(); g.arc(0, -20, 12, -2.2, -0.6); g.stroke(); g.beginPath(); g.moveTo(-20, 4); g.quadraticCurveTo(0, -10, 20, 4); g.stroke();
  g.restore();
}
// 얻은 것 쪽지의 글: 한 줄에 들면 크게, 길면 '이름 — 설명' 을 두 단으로 (설명은 두 줄까지), 그래도 길면 줄여서 감싼다
function noteText(g, s, cx, cy, wa, col) {
  g.font = `400 22px ${FONT_B}`; if (g.measureText(s).width <= wa * 1.1) { text(g, s, cx, cy, { size: 22, font: FONT_B, fill: col, maxW: wa }); return; }
  const m = s.split(' — ');
  if (m.length === 2) { text(g, m[0], cx, cy - 20, { size: 19, font: FONT_B, fill: col, maxW: wa }); textBlock(g, m[1], cx, cy + 4, wa, 18, { size: 15, fill: '#4a4034', weight: 400, maxH: 36 }); return; }
  const n = textLines(g, s, wa, { size: 19, font: FONT_B }).length; textBlock(g, s, cx, cy - (Math.min(n, 3) - 1) * 11, wa, 22, { size: 19, font: FONT_B, fill: col, maxH: 66 });
}
export class EventScene extends Overlay {
  constructor(o) { super(); Object.assign(this, { title: o.title, art: o.art, after: o.after, body: o.text, choices: o.choices, onDone: o.onDone, col: o.col || '#6a5a8a', bg: o.bg || null, result: null, pickI: -1, rt: 0 }); }
  textW(g, s) { g.save(); g.font = `400 20px ${FONT_B}`; const w = Math.max(...String(s).split('\n').map(l => g.measureText(l).width)); g.restore(); return w; }
  pick(i) { const c = this.choices[i]; sfx('card'); this.pickI = i; this.result = c.pick(); this.rt = 0; save(); }
  // 무대 위 인형들: 영웅은 왼쪽 날개에서, 만난 이는 오른쪽 날개에서 걸어 들어온다
  cast(g, floor, t) {
    const r = G.run, rt = this.rt, res = this.result, bad = this.bad, enter = clamp((t - 0.3) / 0.9, 0, 1), e = 1 - (1 - enter) ** 3, walk = enter < 1;
    const other = res && this.after ? this.after : this.art;
    const list = [
      { type: r.hero, x: -0.12 + (0.3 + 0.12) * e, act: res ? (rt < 0.4 ? 'tremble' : bad ? 'shake' : 'hop') : 'idle', face: 1 },
      { type: other, x: 1.12 - (1.12 - (res && this.after ? 0.68 + Math.min(0.12, Math.max(0, rt - 0.6) * 0.2) : 0.7)) * e, act: res ? (this.after ? 'hop' : rt < 0.4 ? 'shake' : 'wave') : enter < 1 ? 'idle' : 'talk', face: res && this.after ? 1 : -1 },
    ];
    g.save(); g.beginPath(); g.rect(SX, SY, SW, SH); g.clip();
    for (const a of list) { const L = getLook(a.type), wide = L && L.w > 110; puppet(g, a.type, SX + a.x * SW, floor + (walk ? -Math.abs(Math.sin(t * 11 + a.x * 9)) * 6 : 0), wide ? 1.5 : 1.72, t, { act: walk ? 'idle' : a.act, face: a.face }); }
    g.restore();
  }
  draw(g, dt) {
    const r = G.run, t = this.t, res = this.result; if (res) this.rt += dt; const rt = this.rt;
    if (res && this.bad === undefined) this.bad = res.slice(1).some(q => BAD.test(q) && !GOOD.test(q));
    g.drawImage(hallBG(), 0, 0, W, H);
    // 장대 끝의 초롱과 불빛
    for (const [x, d] of [[POLE[0], 1], [POLE[1], -1]]) { const lx = x + d * 86, f = 0.85 + 0.15 * Math.sin(t * 2.6 + x); glow(g, lx, 150, 110, '255,180,100', 0.3 * f); line(g, [lx, 104, lx, 116], INK, 1.4); chorong(g, lx, 122, 2.6); }
    // 무대를 비추는 두 줄기 빛
    beams(g, 300, 0, 470, 1.25, 2, t, '255,226,170', 0.07); beams(g, 960, 0, 470, 1.9, 2, t, '255,226,170', 0.07);
    // 무대
    const floor = drawStage(g, SX, SY, SW, SH, { bg: this.bg || STAGE_BG[chapterOf(r.ch).theme] || 'pass' });
    this.cast(g, floor, t);
    drawFrame(g, SX, SY, SW, SH, clamp(t / 0.8, 0, 1), t);
    // 무대 위 현판
    hangSign(g, 640, 8, this.title, { w: 340, h: 50, size: 24, rope: false });
    // 이야기꾼의 한마디 (결과가 나오면 결과 이야기로 바뀌고, 오른쪽에 떠나는 단추가 선다)
    const said = res ? res[0] : this.body, nw = res ? 680 : clamp(this.textW(g, said) + 90, 460, 840), nx = res ? 214 : 640 - nw / 2, ny = 450, nh = 70, k = res ? clamp(rt / 0.3, 0, 1) : clamp((t - 0.5) / 0.3, 0, 1);
    scroll(g, nx, ny, nw, nh);
    { const s = said, n = String(s).split('\n').length; g.save(); g.globalAlpha = k; textBlock(g, s, nx + nw / 2, ny + nh / 2 - (n - 1) * 13.5 + 1 + (1 - k) * 5, nw - 40, 27, { size: 20, font: FONT_B }); g.restore(); }
    panel(g, GOLD_AT[0] - 34, 12, 190, 48, 'tag'); icon.coin(g, GOLD_AT[0] - 8, GOLD_AT[1], 13); text(g, `엽전 ${r.gold}`, GOLD_AT[0] + 66, GOLD_AT[1] + 1, { size: 22, font: FONT_B, maxW: 140 });
    if (button(g, 'evdeck', 14, 12, 220, 52, `덱 살피기 · ${r.deck.length}장`, { style: 'wood', size: 21 })) this.deck({});
    // 구경꾼: 장대 아래 앉은 마을 사람들의 뒷모습 (등불에 테두리가 밝다)
    for (const [x, s2, kind] of [[96, 1.1, 0], [150, 0.95, 1], [1130, 1.0, 2], [1188, 1.12, 0], [60, 0.85, 2], [1236, 0.9, 1]]) audience(g, x, 548, s2, kind, t);
    motes(g, t, 180, 60, 920, 380, 18, '255,236,190', 0.4);
    rope(g);
    if (!res) this.slips(g, t); else this.results(g, t, rt);
  }
  // 고를 수 있는 일: 줄에 매단 쪽지
  slips(g, t, fall) {
    const r = G.run, n = this.choices.length, gap = 20, w = Math.min(290, (1150 - (n - 1) * gap) / n), h = 126;
    this.choices.forEach((c, i) => {
      const cx = 640 + (i - (n - 1) / 2) * (w + gap), ty = ropeY(cx), lack = c.cost && r.gold < c.cost, on = !lack && !fall, app = clamp((t - 0.7 - i * 0.1) / 0.35, 0, 1);
      if (app <= 0) return;
      const x = cx - w / 2, y = ty + 18;
      if (on && !this.sub && t > 1 && tapped('ev' + i, x, y - 18, w, h + 18)) { this.pick(i); return; }
      const dn = on && isDown('ev' + i, x, y - 18, w, h + 18);
      let rot = Math.sin(t * 1.4 + i * 1.7) * 0.018, dy = (1 - easeOutBack(app)) * -30 + (dn ? 4 : 0), a = Math.min(1, app * 2);
      if (fall) { const q = fall.t; if (i === fall.i) { a = clamp(1 - (q - 0.25) / 0.25, 0, 1); dy -= q * 10; } else { dy += q * q * 900; rot += q * 1.4 * (i < fall.i ? -1 : 1); a = clamp(1 - q * 2.2, 0, 1); } }
      if (a <= 0) return;
      g.save(); g.globalAlpha = a * (lack ? 0.6 : 1); g.translate(cx, ty); g.rotate(rot); g.translate(-cx, -ty + dy);
      const band = c.hero ? '#c9962e' : c.cost ? '#b8742a' : this.col;
      sheet(g, x, y, w, h, band);
      if (c.hero) { const px = x + w - 30, py = y + 34; ell(g, px, py, 24, 24, '#efe3c4', '#c9962e', 2.4); g.save(); g.beginPath(); g.arc(px, py, 22, 0, TAU); g.clip(); portrait(g, c.hero, px, py + 34, 0.86 * 1.1 / getLook(c.hero).scale, t, false); g.restore(); }
      text(g, c.label, c.hero ? x + (w - 56) / 2 + 6 : cx, y + 40, { size: 24, font: FONT_B, maxW: c.hero ? w - 70 : w - 26, fill: c.hero ? '#6a4410' : INK });
      line(g, [x + 22, y + 63, x + w - 22, y + 63], 'rgba(122,96,64,0.35)', 1.2);
      { const d = String(c.desc).split(' · ').join('\n'), m = d.split('\n').length; textBlock(g, d, cx, y + (m > 1 ? 82 : 90), w - 32, 23, { size: 18, fill: SUB, weight: 400 }); }
      if (lack) text(g, `엽전 ${c.cost} 부족`, cx, y + h - 18, { size: 16, font: FONT_B, fill: RED });
      g.restore();
    });
  }
  // 고른 뒤: 나머지 쪽지가 떨어지고, 얻은 것(잃은 것)이 새 쪽지로 걸린다
  results(g, t, rt) {
    const res = this.result, rows = res.slice(1), n = Math.max(1, rows.length), bad = this.bad;
    if (rt < 0.6) this.slips(g, t, { i: this.pickI, t: rt });
    if (!this.said) { this.said = true; sfx(bad ? 'deny' : 'star');
      if (rows.some(q => /엽전 \+\d/.test(q))) for (let q = 0; q < 6; q++) juice.fly({ draw: (gg, x, y, s) => icon.coin(gg, x, y, 13 * s), x0: SX + 0.7 * SW + (q - 2.5) * 16, y0: 300, x1: GOLD_AT[0] - 8, y1: GOLD_AT[1], s0: 1.2, s1: 0.85, delay: 0.5 + q * 0.07, arc: 60, dur: 0.55, onArrive: q === 5 ? () => sfx('coin') : null }); }
    const gap = 26, long = rows.some(q => q && q.length > 26), w = Math.min(long ? 540 : 360, (1150 - (n - 1) * gap) / n), h = 98;   // 긴 보상(보물 설명)이 있으면 쪽지를 넓게
    for (let i = 0; i < n; i++) {
      const k = clamp((rt - 0.5 - i * 0.18) / 0.3, 0, 1); if (k <= 0) continue;
      const s = rows[i], cx = 640 + (i - (n - 1) / 2) * (w + gap), ty = ropeY(cx), x = cx - w / 2, y = ty + 18, no = s && BAD.test(s) && !GOOD.test(s), ic = s && iconFor(s), e = easeOutBack(k);
      g.save(); g.globalAlpha = Math.min(1, k * 1.8); g.translate(cx, ty); g.rotate(Math.sin(t * 1.4 + i * 2) * 0.016 + (1 - e) * 0.3); g.translate(-cx, -ty - (1 - e) * 40);
      sheet(g, x, y, w, h, !s ? '#8a7f6a' : no ? RED : TEAL, { fill: !s ? '#f3ecd9' : no ? '#f5e2d8' : '#e6eedb' });
      if (!s) text(g, '별일 없이 지나갑니다', cx, y + h / 2 + 3, { size: 20, font: FONT_B, fill: SUB });
      else if (ic) { ic(g, x + 50, y + h / 2 + 4); noteText(g, s, x + 92 + (w - 104) / 2, y + h / 2 + 4, w - 108, no ? RED : TEAL); }
      else noteText(g, s, cx, y + h / 2 + 4, w - 30, no ? RED : TEAL);
      g.restore();
      if (k < 1) for (let q = 0; q < 6; q++) { const a = q / 6 * TAU + i, d = 24 + 50 * k; ell(g, cx + Math.cos(a) * d * 2, y + h / 2 + Math.sin(a) * d * 0.5, 3 * (1 - k), 3 * (1 - k), no ? '#c8402f' : '#d9a441'); }
    }
    if (!this.left && rt > 0.6 + n * 0.15 && button(g, 'evgo', 912, 450, 300, 76, '길을 떠난다', { size: 32 })) { this.left = true; this.onDone(); }
  }
}
