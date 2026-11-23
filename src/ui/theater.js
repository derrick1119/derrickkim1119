// 인형극 무대: 막대 인형들이 나와 옛이야기를 한 토막씩 보여 준다.
// 프롤로그·두목의 사연·끝 이야기는 화면 가득한 무대(Play)로, 주막 이야기·길 위의 사건은 작은 무대(drawStage + puppet)로 쓴다.
//
// 한 토막(beat) = { bg, s, a }
//   bg : 걸개그림 (village·night·pass·grove·dark·dawn·shrine) — 생략하면 앞 토막의 것을 그대로 쓴다
//   s  : 이야기꾼의 한마디
//   a  : 무대에 선 것들 [[누구, 자리(0~1), 몸짓, 보는 쪽(1 = 오른쪽, -1 = 왼쪽), 크기]]
//        누구 = 병종 id, 또는 '*broom' 처럼 * 로 시작하는 소품. 같은 것이 둘이면 'goblin#2' 처럼 구분한다.
//        앞 토막에 있던 인형은 새 자리로 걸어가고, 새로 나온 인형은 가까운 쪽 날개에서 들어오고, 빠진 인형은 퇴장한다.
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, poly, line, path, clamp, easeOutBack, drawSprite } from '../render/draw.js';
import { portrait, getLook, getWeapon, leftover, LOOKS } from '../render/sprites.js';
import { stopSprite, pine, THEMES } from '../render/terrain.js';
import { backdrop } from '../scenes/title.js';
import { button, tapped, ui, hangSign, scroll } from './ui.js';
import { sfx } from '../audio.js';

const WOOD = '#7a4a2c', WOODL = '#a9753f', CLOTH = '#2f426b', CLOTHD = '#1c2948', GOLD = '#d6a640';
// 오방색: 술과 색동 단에 쓴다
const OBANG = ['#c8402f', '#2f4d7e', '#e0b23c', '#f6efdc', '#2b2a30'], SAEK = ['#c8402f', '#e0b23c', '#3f6b5c', '#f6efdc', '#2f4d7e', '#d98aa0'];
const BG = {
  village: { set: 'village' },
  night: { tint: 'rgba(22,28,70,0.58)', moon: 1, set: 'village' },
  pass: { set: 'pass' },
  eve: { tint: 'rgba(22,28,70,0.4)', moon: 1, set: 'pass' },
  grove: { tint: 'rgba(46,96,66,0.2)', set: 'grove' },
  dark: { tint: 'rgba(14,12,36,0.72)', set: 'pass' },
  shrine: { tint: 'rgba(22,28,70,0.36)', moon: 1, set: 'shrine' },
  dawn: { tint: 'rgba(255,190,110,0.2)', set: 'shrine' },
};

// 걸개그림과 무대 바닥. floor = 인형이 서는 높이를 돌려준다
export function drawStage(g, x, y, w, h, o = {}) {
  const bg = BG[o.bg] || BG.pass, k = w / 1040, floor = y + h - 74 * k, b = backdrop();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  g.drawImage(b, 0, b.height * 0.06, b.width, b.height * 0.7, x, y, w, floor - y + 30 * k);
  // 무대 장치: 걸개그림 앞에 세운 종이 나무·집·서낭당
  const T = bg.set === 'grove' ? THEMES.grove : bg.tint && bg.set !== 'grove' ? THEMES.dusk : THEMES.pass;
  if (bg.set === 'village') { drawSprite(g, stopSprite('rest'), x + w * 0.14, floor + 2, 1.5 * k, 1.5 * k); pine(g, x + w * 0.93, floor, 1.9 * k, T, true); }
  else if (bg.set === 'grove') { for (const [px, s, f] of [[0.06, 2.3, false], [0.2, 1.7, true], [0.83, 1.9, false], [0.95, 2.4, true]]) pine(g, x + w * px, floor, s * k, T, f); }
  else if (bg.set === 'shrine') { drawSprite(g, stopSprite('event'), x + w * 0.82, floor + 2, 1.7 * k, 1.7 * k); pine(g, x + w * 0.05, floor, 1.9 * k, T, false); }
  else { pine(g, x + w * 0.05, floor, 2.1 * k, T, false); pine(g, x + w * 0.95, floor, 1.8 * k, T, true); }
  // 바닥: 멍석을 깐 흙마당
  const gr = g.createLinearGradient(0, floor - 6 * k, 0, y + h); gr.addColorStop(0, '#d9cba0'); gr.addColorStop(1, '#b9a878'); g.fillStyle = gr; g.fillRect(x, floor - 6 * k, w, y + h - floor + 6 * k);
  g.fillStyle = 'rgba(90,70,40,0.35)'; g.fillRect(x, floor - 6 * k, w, 2 * k);
  for (let i = 0; i < 26; i++) { const px = x + ((i * 97 + 31) % 1000) / 1000 * w, py = floor + 4 * k + ((i * 53) % 40) * k; line(g, [px, py, px + 16 * k, py], 'rgba(120,96,56,0.35)', 1.2 * k); }
  if (bg.tint) { g.fillStyle = bg.tint; g.fillRect(x, y, w, h); }
  // 밤: 걸개그림의 해가 있던 자리에 보름달이 뜬다
  if (bg.moon) { const mx = x + w * 0.703, my = y + 0.41 * (floor - y + 30 * k), mr = 66 * k; g.globalAlpha = 0.22; ell(g, mx, my, mr * 1.5, mr * 1.5, '#fff6d8'); g.globalAlpha = 1; ell(g, mx, my, mr, mr, '#fbf1cf', 'rgba(38,42,54,0.35)', 1.2); g.globalAlpha = 0.16; ell(g, mx - 18 * k, my - 12 * k, 16 * k, 12 * k, '#b9a878'); ell(g, mx + 20 * k, my + 16 * k, 10 * k, 8 * k, '#b9a878'); g.globalAlpha = 1; }
  g.restore();
  return floor;
}
// 무대의 나무틀과 막. open = 0(닫힘) → 1(활짝 열림)
export function drawFrame(g, x, y, w, h, open = 1, t = 0) {
  const k = w / 1040, e = open * open * (3 - 2 * open), cw = (w / 2 + 6) + (58 * k - (w / 2 + 6)) * e;
  g.save(); g.beginPath(); g.rect(x - 2, y - 2, w + 4, h + 4); g.clip();
  // 양옆의 포장: 쪽물 들인 무명 휘장. 걷히면 오방색 끈으로 묶인다
  for (const s of [-1, 1]) {
    const ex = s < 0 ? x : x + w, n = 7;
    path(g, p => { p.moveTo(ex, y); p.lineTo(ex - s * cw, y); for (let i = 0; i <= n; i++) { const yy = y + h * i / n, wob = Math.sin(i * 1.7 + t * 1.3 + s) * 5 * k * (0.4 + 0.6 * e), pin = e * Math.sin(i / n * Math.PI) * 16 * k; p.lineTo(ex - s * (cw - pin) + wob, yy); } p.lineTo(ex, y + h); p.closePath(); }, CLOTH, INK, 2);
    for (let j = 1; j < 5; j++) { const fx = ex - s * cw * j / 5; g.globalAlpha = 0.55; line(g, [fx, y + 4, fx + Math.sin(j + t) * 3 * k, y + h - 4], CLOTHD, 3 * k); g.globalAlpha = 0.16; line(g, [fx + 5 * k * s, y + 4, fx + 5 * k * s, y + h - 4], '#c9d6f0', 2 * k); g.globalAlpha = 1; }
    if (e > 0.6) { const ty = y + h * 0.56, tx = ex - s * (cw - 14 * k); line(g, [ex, ty - 6 * k, tx, ty], INK, 5 * k); line(g, [ex, ty - 6 * k, tx, ty], OBANG[0], 3 * k); for (let j = 0; j < 3; j++) { line(g, [tx, ty, tx + (j - 1) * 3.4 * k, ty + 20 * k], INK, 3.4 * k); line(g, [tx, ty, tx + (j - 1) * 3.4 * k, ty + 20 * k], OBANG[[2, 0, 1][j]], 2 * k); } ell(g, tx, ty, 4.2 * k, 4.2 * k, OBANG[2], INK, 1.2); }
  }
  g.restore();
  // 위의 가림막: 곧은 단에 색동 띠를 두르고 오방색 술을 달았다
  const vh = 30 * k, n = Math.round(w / (86 * k));
  rr(g, x - 8 * k, y - 8 * k, w + 16 * k, vh + 8 * k, 2 * k, CLOTH, INK, 2);
  g.fillStyle = 'rgba(201,214,240,0.14)'; g.fillRect(x - 6 * k, y - 6 * k, w + 12 * k, 5 * k);
  { const bw = 22 * k, by = y + vh - 9 * k, m = Math.ceil((w + 16 * k) / bw); g.save(); g.beginPath(); g.rect(x - 8 * k, by, w + 16 * k, 9 * k); g.clip(); for (let i = 0; i < m; i++) { g.fillStyle = SAEK[i % SAEK.length]; g.fillRect(x - 8 * k + i * bw, by, bw + 1, 9 * k); } g.restore(); line(g, [x - 8 * k, by, x + w + 8 * k, by], INK, 1.4); line(g, [x - 8 * k, by + 9 * k, x + w + 8 * k, by + 9 * k], INK, 2); }
  for (let i = 0; i < n; i++) { const cx = x + w * (i + 0.5) / n, cy = y + vh + 2 * k, col = OBANG[i % 3]; line(g, [cx, cy, cx, cy + 6 * k], INK, 2.4 * k); ell(g, cx, cy + 8 * k, 3.4 * k, 3.4 * k, col, INK, 1.1); path(g, p => { p.moveTo(cx - 3 * k, cy + 10 * k); p.lineTo(cx + 3 * k, cy + 10 * k); p.lineTo(cx + 4.4 * k, cy + 24 * k); p.lineTo(cx - 4.4 * k, cy + 24 * k); p.closePath(); }, col, INK, 1.1); line(g, [cx, cy + 12 * k, cx, cy + 23 * k], 'rgba(20,16,10,0.3)', 0.9 * k); }
  // 나무틀: 양 기둥과 아래 판 (막대 인형의 손잡이를 가린다)
  for (const ex of [x - 16 * k, x + w - 2 * k]) { rr(g, ex, y - 12 * k, 18 * k, h + 30 * k, 4 * k, WOOD, INK, 2); g.fillStyle = 'rgba(255,230,190,0.22)'; g.fillRect(ex + 3 * k, y - 8 * k, 3.4 * k, h + 22 * k); }
  const ay = y + h - 22 * k; rr(g, x - 20 * k, ay, w + 40 * k, 40 * k, 5 * k, WOOD, INK, 2.2); g.fillStyle = WOODL; g.fillRect(x - 16 * k, ay + 4 * k, w + 32 * k, 5 * k);
  for (let i = 0; i < 12; i++) { const cx = x + w * (i + 0.5) / 12; poly(g, [cx - 10 * k, ay + 26 * k, cx, ay + 15 * k, cx + 10 * k, ay + 26 * k, cx, ay + 37 * k], i % 2 ? '#3f6b5c' : '#8a2a26', 'rgba(30,20,10,0.5)', 1); ell(g, cx, ay + 26 * k, 2.6 * k, 2.6 * k, GOLD); }
}
// 소품: 헌 물건들과 길가의 것들 (* 로 시작하는 이름). 손에 드는 것들은 인형처럼 막대에 꿰어 세운다
const PROP = { broom: 'broom', bat: 'bat', sandal: 'sandal', lid: 'lid', poker: 'poker', hopae: 'hopae' };
const rod = (g, x, y, s) => { line(g, [x, y - 6 * s, x, y + 96 * s], INK, 4.4 * s); line(g, [x, y - 6 * s, x, y + 96 * s], '#9a7440', 2.4 * s); };
function prop(g, id, x, y, s, t) {
  if (PROP[id]) { rod(g, x, y - 8 * s, s); drawSprite(g, leftover(PROP[id]), x, y - 26 * s, 2.3 * s, 2.3 * s, Math.sin(t * 2 + x) * 0.06); return; }
  if (id === 'sword') { rod(g, x, y - 8 * s, s); const w = getWeapon('hwando'); if (w) drawSprite(g, w.spr, x, y - 22 * s, 1.5 * s, 1.5 * s, 0.5 + Math.sin(t * 2 + x) * 0.05); return; }
  if (id === 'jar') { rod(g, x, y - 8 * s, s); const jy = y - 14 * s; path(g, p => { p.moveTo(x - 3 * s, jy - 30 * s); p.lineTo(x + 3 * s, jy - 30 * s); p.lineTo(x + 3 * s, jy - 22 * s); p.quadraticCurveTo(x + 12 * s, jy - 16 * s, x + 10 * s, jy - 4 * s); p.quadraticCurveTo(x + 8 * s, jy + 2 * s, x, jy + 2 * s); p.quadraticCurveTo(x - 8 * s, jy + 2 * s, x - 10 * s, jy - 4 * s); p.quadraticCurveTo(x - 12 * s, jy - 16 * s, x - 3 * s, jy - 22 * s); p.closePath(); }, '#f6efdc', INK, 2); rr(g, x - 4.4 * s, jy - 33 * s, 8.8 * s, 4 * s, 1.4 * s, '#8a2a26', INK, 1.4); line(g, [x - 7 * s, jy - 9 * s, x + 7 * s, jy - 9 * s], '#2f4d7e', 1.6 * s); return; }   // 술병
  if (id === 'wisp') { for (let i = 0; i < 5; i++) { const q = (t * 0.32 + i * 0.2) % 1, wx = x + Math.sin(q * 5 + i * 2) * 16 * s + (i - 2) * 9 * s, wy = y - 54 * s - q * 96 * s; g.globalAlpha = 0.55 * Math.sin(q * Math.PI); ell(g, wx, wy, 6.4 * s, 9 * s, '#fbf7ec', 'rgba(90,96,120,0.5)', 1); } g.globalAlpha = 1; return; }   // 풀려나는 목소리들
  if (id === 'bow') { const w = getWeapon('bow'); if (w) drawSprite(g, w.spr, x, y - 66 * s, 1.25 * s, 1.25 * s, 0.35); return; }   // 나뭇가지에 걸어 둔 활
  if (id === 'chest') { drawSprite(g, stopSprite('treasure'), x, y + 4, 0.95 * s, 0.95 * s); return; }
  if (id === 'tavern') { drawSprite(g, stopSprite('rest'), x, y + 4, 1.1 * s, 1.1 * s); return; }
  if (id === 'shrine') { drawSprite(g, stopSprite('event'), x, y + 4, 1.1 * s, 1.1 * s); return; }
  if (id === 'sprout') { for (const dx of [-26, 0, 26]) { rr(g, x + dx * s - 9 * s, y - 12 * s, 18 * s, 14 * s, 3 * s, '#a0764a', INK, 1.4); line(g, [x + dx * s, y - 12 * s, x + dx * s, y - 26 * s], '#4f8a4a', 2.4 * s); ell(g, x + dx * s - 5 * s, y - 27 * s, 5.4 * s, 3 * s, '#7fbf6a', INK, 1, -0.5); ell(g, x + dx * s + 5 * s, y - 29 * s, 5.4 * s, 3 * s, '#7fbf6a', INK, 1, 0.5); } return; }
  if (id === 'lamp') { line(g, [x, y, x, y - 40 * s], INK, 3); g.globalAlpha = 0.3; ell(g, x, y - 48 * s, 24 * s, 24 * s, '#ffd98a'); g.globalAlpha = 1; rr(g, x - 8 * s, y - 58 * s, 16 * s, 20 * s, 4 * s, '#ffe9a8', INK, 1.4); }
}
// 막대 인형 하나. act = idle·talk·hop·shake·bow·fall·sleep·rise·dance·tremble·wave
// 이름 끝에 ~ 를 붙이면('hunter~') 손에 든 것 없이 빈손으로 나온다
export function puppet(g, type, x, y, s, t, o = {}) {
  const bare = type.endsWith('~'); if (bare) type = type.slice(0, -1);
  const act = o.act || 'idle', f = o.face || 1, ph = t * 1 + x * 0.013; let dx = 0, dy = 0, rot = Math.sin(ph * 1.7) * 0.025;
  // 네 발 짐승(범·해태)은 옆으로 길어서, 쓰러지거나 자거나 엎드릴 때 세우지 않고 납작 엎드린다
  const wide = type[0] !== '*' && LOOKS[type] && LOOKS[type].w > 110, pose = wide && act === 'sleep' && LOOKS[type + '_sleep'] ? '_sleep' : wide && act === 'bow' && LOOKS[type + '_lie'] ? '_lie' : '';
  const lie = wide && !pose && (act === 'sleep' || act === 'fall' || act === 'bow'), down = !wide && (act === 'fall' || act === 'sleep');   // 엎드리거나 잠든 범은 따로 그린 그림을 쓴다
  if (act === 'talk') dy = -Math.abs(Math.sin(t * 8.5)) * 7 * s;
  else if (act === 'hop') dy = -Math.abs(Math.sin(t * 6.5)) * 15 * s;
  // 떨림은 느리고 작게 (빠른 진동은 화면이 깨진 것처럼 보인다): 고개를 젓듯 좌우로 / 오들오들 천천히 움츠렸다 펴진다
  else if (act === 'shake') { dx = Math.sin(t * 9) * 3 * s; rot = Math.sin(t * 9) * 0.06; }
  else if (act === 'tremble') { const q = Math.sin(t * 5.5 + x * 0.05); rot = q * 0.035; dy = (1 - Math.abs(q)) * 1.2 * s; }
  else if (pose) rot = 0;
  else if (lie) { rot = (act === 'fall' ? -f : f) * 0.07; dy = act === 'sleep' ? Math.sin(t * 2) * 1.2 : 0; }
  else if (act === 'bow') rot = f * 0.4 * (0.6 + 0.4 * Math.sin(t * 3));
  else if (act === 'fall') { rot = -f * 1.4; dy = -22 * s; }
  else if (act === 'sleep') { rot = f * 1.5; dy = -22 * s + Math.sin(t * 2) * 1.5; }
  else if (act === 'rise') { rot = f * (0.62 + 0.1 * Math.sin(t * 2.4)); dy = -8 * s; }
  else if (act === 'dance') { dy = -Math.abs(Math.sin(t * 7.5)) * 12 * s; rot = Math.sin(t * 7.5) * 0.2; dx = Math.sin(t * 3.75) * 8 * s; }
  else if (act === 'wave') rot = Math.sin(t * 7) * 0.12;
  if (type[0] === '*') { prop(g, type.slice(1), x + dx, y + dy, s, t); return; }
  if (pose) type = type + pose; else if ((act === 'sleep' || (lie && act === 'bow') || o.calm) && LOOKS[type + '_calm']) type = type + '_calm';   // 엎드리거나 잠든 범은 입을 다문다
  const L = getLook(type), sc = (o.scale || 1), ps = s * (L.boss ? 0.62 : 1) * sc / (L.scale / 1.1);
  // 인형을 받친 막대: 무대 아래 판 뒤로 내려간다. 누운 인형은 몸 가운데를 받쳐 막대도 함께 기운다
  if (!o.noStick) { const hh = 34 * s * sc, cx = x + dx + (down || act === 'rise' ? Math.sin(rot) * hh : 0), cy = y + dy - (down || act === 'rise' ? Math.cos(rot) * hh + 4 * s : 8 * s), bx = x + dx * 0.3 + (down ? Math.sin(rot) * hh * 0.45 : 0); line(g, [cx, cy, bx, y + 96 * s], INK, 4.4 * s); line(g, [cx, cy, bx, y + 96 * s], '#9a7440', 2.4 * s); }
  const shut = act === 'sleep' || (lie && act === 'bow'), breathe = pose === '_sleep' ? 1 + Math.sin(t * 2) * 0.025 : 1;   // 잠든 범은 숨 쉬듯 부푼다
  g.save(); g.translate(x + dx, y + dy); g.rotate(rot); if (f < 0) g.scale(-1, 1); if (lie) g.scale(1.06, 0.7); if (breathe !== 1) g.scale(1, breathe); if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  portrait(g, type, 0, 0, ps * (L.scale / 1.1), shut ? 0 : t, false, bare ? 'none' : undefined, shut);
  g.restore();
  // 잠든 인형 위로 붓글씨 '쿨쿨' 이 번갈아 떠오른다
  if (act === 'sleep') { const q = (t * 0.6) % 1, zx = x + (lie ? 30 : 34) * s, zy = y - (lie ? 58 : 44) * s; g.save(); g.globalAlpha = 0.5 + 0.5 * Math.sin(q * Math.PI); text(g, '쿨', zx + q * 8 * s, zy - q * 14 * s, { size: 20 * s, font: FONT_B, fill: '#2b2a30', stroke: 'rgba(246,239,220,0.8)', lw: 3 }); g.globalAlpha = 0.5 + 0.5 * Math.sin(((q + 0.5) % 1) * Math.PI); text(g, '쿨', zx + 19 * s + ((q + 0.5) % 1) * 8 * s, zy - 14 * s - ((q + 0.5) % 1) * 14 * s, { size: 15 * s, font: FONT_B, fill: '#2b2a30', stroke: 'rgba(246,239,220,0.8)', lw: 3 }); g.restore(); }
}

// 화면 가득한 인형극 한 편
export class Play {
  constructor(o) {
    this.beats = o.beats; this.onDone = o.onDone; this.name = o.title || ''; this.sub = null;
    this.t = 0; this.bt = 0; this.i = -1; this.bg = 'pass'; this.cast = new Map(); this.left = false; this.go(0);
  }
  go(i) {
    this.i = i; this.bt = 0; const b = this.beats[i], seen = new Set(); if (b.bg) this.bg = b.bg;
    for (const a of b.a || []) {
      const key = a[0].replace('~', ''); seen.add(key); let c = this.cast.get(key);   // 빈손(~)이 되어도 같은 인형이다
      if (!c) { c = { key, x: a[1] < 0.5 ? -0.16 : 1.16 }; this.cast.set(key, c); }
      c.type = a[0].split('#')[0]; c.tx = a[1]; c.act = a[2] || 'idle'; c.face = a[3] || (a[1] <= 0.5 ? 1 : -1); c.scale = a[4] || 1; c.out = false;
    }
    for (const c of this.cast.values()) if (!seen.has(c.key)) { c.out = true; c.tx = c.x < 0.5 ? -0.22 : 1.22; c.face = c.tx < 0 ? -1 : 1; c.act = 'idle'; }
  }
  next() { if (this.left) return; if (this.i < this.beats.length - 1) { this.go(this.i + 1); sfx('card'); } else this.finish(); }
  finish() { if (this.left) return; this.left = true; if (this.onDone) this.onDone(); }
  key(k) { if (k === ' ' || k === 'Enter') this.next(); else if (k === 'Escape') this.finish(); }
  frame(g, dt) {
    const Lr = ui.layer; ui.layer = Lr + 1;
    try {
      this.t += dt; this.bt += dt; const t = this.t, b = this.beats[this.i], X = 120, Y = 58, Wd = 1040, Hd = 456;
      // 마당에 친 무대: 어두운 밤, 무대를 비추는 두 줄기 빛과 떠도는 먼지
      g.fillStyle = 'rgba(14,12,20,0.95)'; g.fillRect(0, 0, W, H);
      { const sp = g.createRadialGradient(640, 290, 60, 640, 300, 760); sp.addColorStop(0, 'rgba(120,90,60,0.35)'); sp.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sp; g.fillRect(0, 0, W, H);
        g.save(); g.globalCompositeOperation = 'lighter'; for (const [bx, ang] of [[260, 0.95], [1020, 2.2]]) { const gr = g.createLinearGradient(bx, 0, bx + Math.cos(ang) * 520, Math.sin(ang) * 520); gr.addColorStop(0, 'rgba(255,226,170,0.1)'); gr.addColorStop(1, 'rgba(255,226,170,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(bx - 30, 0); g.lineTo(bx + 30, 0); g.lineTo(bx + 30 + Math.cos(ang) * 520 + 90, Math.sin(ang) * 520); g.lineTo(bx - 30 + Math.cos(ang) * 520 - 90, Math.sin(ang) * 520); g.closePath(); g.fill(); } g.restore();
        for (let i = 0; i < 20; i++) { const x = (i * 173 + Math.sin(t * 0.3 + i) * 30) % W, y = 40 + ((i * 89 + t * 6) % 500), a = 0.25 + 0.25 * Math.sin(t * 1.6 + i); g.globalAlpha = a; g.fillStyle = '#ffe9c0'; g.fillRect(x, y, 1.6, 1.6); } g.globalAlpha = 1; }
      if (!this.left && button(g, 'playskip', 1108, 646, 150, 50, '건너뛰기', { style: 'paper', size: 20 })) { this.finish(); return; }
      const floor = drawStage(g, X, Y, Wd, Hd, { bg: this.bg });
      g.save(); g.beginPath(); g.rect(X, Y, Wd, Hd); g.clip();
      const list = [...this.cast.values()];
      for (const c of list) { c.x += (c.tx - c.x) * Math.min(1, dt * 5); const walking = Math.abs(c.tx - c.x) > 0.012; if (c.out && !walking) this.cast.delete(c.key); c.walk = walking; }
      list.sort((p, q) => (p.type[0] === '*' ? 0 : 1) - (q.type[0] === '*' ? 0 : 1));
      for (const c of list) puppet(g, c.type, X + c.x * Wd, floor + (c.walk ? -Math.abs(Math.sin(t * 11 + c.tx * 9)) * 6 : 0), 1.95, t, { act: c.walk ? 'idle' : c.act, calm: c.act === 'sleep' || c.act === 'bow', face: c.walk ? (c.tx > c.x ? 1 : -1) : c.face, scale: c.scale });
      g.restore();
      drawFrame(g, X, Y, Wd, Hd, clamp(t / 0.8, 0, 1), t);
      // 무대 위 현판: 어느 이야기인지
      if (this.name) hangSign(g, 640, 14, this.name, { w: 360, h: 50, size: 24, rope: false });
      // 이야기꾼의 한마디
      const k = clamp(this.bt / 0.3, 0, 1);
      scroll(g, 150, 540, 980, 96);
      g.globalAlpha = k; const rows = this.rows(g, b.s); textBlock(g, b.s, 640, 588 - (rows - 1) * 19 + (1 - k) * 6, 920, 38, { size: 29, font: FONT_B }); g.globalAlpha = 1;
      for (let m = 0; m < this.beats.length; m++) ell(g, 640 + (m - (this.beats.length - 1) / 2) * 17, 660, 4.4, 4.4, m === this.i ? '#f6efdc' : 'rgba(246,239,220,0.28)');
      if (this.bt > 0.7) { g.globalAlpha = 0.8 + Math.sin(t * 5) * 0.2; text(g, this.i < this.beats.length - 1 ? '눌러서 다음 ▶' : '눌러서 마침 ▶', 1040, 620, { size: 17.5, font: FONT_B, fill: '#6a4a2c' }); g.globalAlpha = 1; }
      if (!this.left && this.bt > 0.28 && tapped('play', 0, 0, W, H)) this.next();
    } finally { ui.layer = Lr; }
  }
  rows(g, s) { g.save(); g.font = `400 29px ${FONT_B}`; let n = 0; for (const para of String(s).split('\n')) { let cur = ''; n++; for (const w of para.split(' ')) { const q = cur ? cur + ' ' + w : w; if (cur && g.measureText(q).width > 920) { n++; cur = w; } else cur = q; } } g.restore(); return n; }
}
// 작은 무대: 주막 이야기나 길 위의 사건을 인형 몇으로 보여 준다. actors = [[누구, 자리, 몸짓, 보는 쪽, 크기]]
export function miniStage(g, x, y, w, h, o) {
  const t = o.t || 0, k = w / 1040, floor = drawStage(g, x, y, w, h, { bg: o.bg });
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  for (const a of o.actors || []) puppet(g, a[0].split('#')[0], x + a[1] * w, floor, 1.95 * k * (o.zoom || 1.5), t, { act: a[2], face: a[3] || (a[1] <= 0.5 ? 1 : -1), scale: a[4] });
  g.restore();
  drawFrame(g, x, y, w, h, o.open === undefined ? 1 : o.open, t);
}
