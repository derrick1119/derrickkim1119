// 시안 세 장: 타이틀 · 전투 · 인형 시트
import { sheet, felt, stitch, tone, rng } from './felt.js';
import { W, H, sky, mountain, cloud, water, waterfall, rock, pine, moss, flowers, fern, azalea, rays, grade, layer, wash } from './scene.js';
import { place, unit } from './units.js';
import { palisade, banner, drum, jangseung, cairn, arrows, shield, scorch, wisp, deadTree, smoke, fortWall, brokenSpear, club, fire, mud } from './props.js';

let BG = false;
export function setBgOnly(v) { BG = v; }
const put = (...a) => { if (!BG) place(...a); };
const TAU = Math.PI * 2, FB = "'Yeon Sung', 'Gowun Batang', serif", FN = "'Gowun Batang', serif";
const RR = (x0, y0, w, h, r) => x => x.roundRect(x0, y0, w, h, r);

function txt(g, s, x, y, o = {}) {
  g.save(); g.font = `${o.w || 400} ${o.size || 20}px ${o.font || FB}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  if (o.shadow) { g.shadowColor = o.shadow; g.shadowBlur = o.sb ?? 8; g.shadowOffsetY = o.sy ?? 2; }
  if (o.stroke) { g.lineJoin = 'round'; g.strokeStyle = o.stroke; g.lineWidth = o.sw || 4; g.strokeText(s, x, y); }
  g.fillStyle = o.fill || '#2a211b'; g.fillText(s, x, y); g.restore();
}
// 펠트 천 조각 판 (x,y 왼위)
function feltPanel(g, x, y, w, h, col, r = 8, o = {}) {
  const S = sheet(w + 16, h + 16, o.res || 2, 1); S.ox = (w / 2 + 8) * S.res; S.oy = (h + 8) * S.res;
  felt(S, RR(-w / 2, -h, w, h, r), col, { fuzz: 0.6, dens: 0.035, ...o });
  if (o.stitch !== false) { const i = 4; stitch(S, [[-w / 2 + i + r / 2, -h + i], [w / 2 - i - r / 2, -h + i], [w / 2 - i, -h + i + r / 2], [w / 2 - i, -i - r / 2], [w / 2 - i - r / 2, -i], [-w / 2 + i + r / 2, -i], [-w / 2 + i, -i - r / 2], [-w / 2 + i, -h + i + r / 2], [-w / 2 + i + r / 2, -h + i]], o.thread || 'rgba(255,240,210,0.75)', 0.9, 3); }
  g.drawImage(S.c, x - 8, y - 8, w + 16, h + 16);
}
// 한지 판 + 금테 청록 띠
function paperPanel(g, x, y, w, h, r = 12) {
  g.save(); g.shadowColor = 'rgba(20,12,4,0.45)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
  const fr = g.createLinearGradient(0, y, 0, y + h); fr.addColorStop(0, '#2d6283'); fr.addColorStop(0.5, '#3c7a72'); fr.addColorStop(1, '#25506f');
  g.fillStyle = fr; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); g.restore();
  const gl = g.createLinearGradient(x, y, x + w, y + h); gl.addColorStop(0, '#f6dc94'); gl.addColorStop(0.4, '#c9993c'); gl.addColorStop(0.7, '#f0cf7c'); gl.addColorStop(1, '#a87a2a');
  g.save(); g.strokeStyle = gl; g.lineWidth = 2; g.beginPath(); g.roundRect(x + 1, y + 1, w - 2, h - 2, r); g.stroke();
  const pg = g.createLinearGradient(0, y, 0, y + h); pg.addColorStop(0, '#f6ecda'); pg.addColorStop(1, '#ecdcc0');
  g.fillStyle = pg; g.shadowColor = 'rgba(10,30,40,0.5)'; g.shadowBlur = 6; g.shadowOffsetY = 2; g.beginPath(); g.roundRect(x + 7, y + 7, w - 14, h - 14, r - 4); g.fill();
  g.shadowColor = 'transparent'; g.strokeStyle = gl; g.lineWidth = 1.2; g.stroke(); g.restore();
}
function portrait(g, kind, cx, cy, rad, flip = false) {
  const S = unit(kind, 4), head = { hero: [0, -82], spear: [2, -76], archer: [2, -76], dok: [6, -72], dokR: [6, -72], tiger: [28, -42] }[kind], k = rad / 26;
  g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.clip();
  const bg = g.createRadialGradient(cx, cy - rad * 0.4, 0, cx, cy, rad); bg.addColorStop(0, '#fbf3e2'); bg.addColorStop(1, '#e6d3b0'); g.fillStyle = bg; g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  g.translate(cx, cy); if (flip) g.scale(-1, 1); const s = k / S.res * 1.15;
  g.drawImage(S.c, -(S.ox + head[0] * S.res) * s, -(S.oy + head[1] * S.res) * s + rad * 0.2, S.c.width * s, S.c.height * s);
  g.restore();
}
function bead(g, x, y, r, col, on = true) {
  if (!on) { g.save(); g.fillStyle = 'rgba(80,60,40,0.25)'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.strokeStyle = 'rgba(80,60,40,0.4)'; g.setLineDash([2, 2]); g.lineWidth = 1; g.stroke(); g.restore(); return; }
  const S = sheet(r * 2 + 10, r * 2 + 10, 3, 1); S.ox = (r + 5) * 3; S.oy = (r * 2 + 5) * 3;
  felt(S, x2 => x2.arc(0, -r, r, 0, TAU), col, { fuzz: 1, dens: 0.08, lx: 0.3, ly: 0.25 });
  g.drawImage(S.c, x - r - 5, y - r - 5, r * 2 + 10, r * 2 + 10);
}

// 뒤 무대(하늘·산·구름) 공통
function backdrop(g, o) {
  sky(g, o.sky);
  layer(g, o.farBlur ?? 2.6, x => {
    wash(x, 640, o.farBase - 40, 760, 90, '#9cb6c6', 0.5, 31);
    for (const m of o.far) mountain(x, ...m, { bands: 3, gold: 1.6 });
  });
  layer(g, o.cloudBlur ?? 1.3, x => { for (const c of o.clouds) cloud(x, ...c); });
  if (o.mid) layer(g, o.midBlur ?? 1.6, o.mid);
  layer(g, o.nearBlur ?? 1.4, x => { for (const m of o.near) mountain(x, ...m, { bands: 4 }); });
}

export function titleBoard(g) {
  backdrop(g, {
    sky: { sunX: 330, sunY: 118, sunR: 54 }, farBase: 420,
    far: [[-40, 300, 440, 120, 200, 1], [200, 560, 450, 360, 240, 2], [760, 1080, 440, 930, 215, 3], [1000, 1340, 450, 1200, 170, 0]],
    clouds: [[90, 340, 1.5, false], [960, 310, 1.6, true, { gold: true }], [520, 262, 0.9, false], [1200, 392, 1.1, false], [300, 410, 1.0, true]],
    near: [[-80, 330, 480, 70, 250, 5], [1000, 1360, 480, 1230, 230, 6]],
  });
  layer(g, 0.9, x => {
    moss(x, [[-20, 448], [200, 440], [420, 452], [700, 446], [980, 452], [1300, 444]], 51, { n: 6000, back: '#a3b26a' });
    for (const [px, s, sd] of [[470, 0.55, 2], [760, 0.5, 3], [880, 0.45, 4]]) pine(x, px, 450, s, sd);
    water(x, [[-20, 470], [300, 462], [640, 474], [980, 466], [1300, 472]], [[-20, 530], [320, 520], [640, 536], [980, 524], [1300, 532]], 61);
  });
  // 앞 둑
  moss(g, [[-20, 520], [180, 512], [380, 526], [560, 540], [760, 534], [960, 520], [1300, 514]], 71, { n: 16000 });
  rock(g, 245, 500, 150, 70, 81, { moss: true }); rock(g, 345, 512, 90, 46, 82);
  waterfall(g, 262, 456, 40, 52, 83);
  rock(g, 1010, 600, 300, 330, 84, { moss: true, col: '#8c8a86', facet: true });
  rock(g, 860, 606, 110, 60, 85); rock(g, 1160, 612, 130, 70, 86, { moss: true });
  pine(g, 170, 560, 1.35, 91); pine(g, 1200, 580, 1.25, 92);
  azalea(g, 110, 600, 1.3, 93); azalea(g, 1235, 640, 1.2, 94);
  fern(g, 60, 660, 1.1, 95); fern(g, 1250, 690, 1, 96, -1);
  flowers(g, 420, 600, 1.2, 97); flowers(g, 760, 640, 1.1, 98, 'yellow');
  put(g, 'hero', 560, 625, 1.55, false, 4);
  put(g, 'tiger', 680, 630, 1.45, false, 4);
  layer(g, 5, x => { rock(x, 80, 760, 230, 120, 101); fern(x, 360, 735, 1.8, 102); rock(x, 1260, 770, 220, 110, 103); });
  rays(g, 330, 120, 0.95, 7, 111, 0.14);
  grade(g, { vig: 0.38 });
  if (BG) return;
  txt(g, '열두 고개', 640, 300, { size: 132, fill: '#fffdf6', shadow: 'rgba(40,24,10,0.55)', sb: 22, sy: 5 });
  txt(g, '옛이야기 인형극', 640, 384, { size: 28, fill: '#fff6e2', shadow: 'rgba(40,24,10,0.6)', sb: 10 });
  feltPanel(g, 560, 650, 160, 46, '#a33a2e', 14);
  txt(g, '길을 떠난다', 640, 673, { size: 24, fill: '#fff4dd', shadow: 'rgba(0,0,0,0.35)', sb: 3, sy: 1 });
}

export function battleBoard(g) {
  backdrop(g, {
    sky: { sunX: 210, sunY: 120, sunR: 40 }, farBase: 300,
    far: [[-60, 260, 300, 90, 120, 1], [170, 470, 300, 330, 150, 2], [820, 1100, 300, 960, 130, 3], [1040, 1340, 300, 1200, 110, 0]],
    clouds: [[90, 245, 1.2, false], [1060, 225, 1.3, true, { gold: true }], [600, 190, 0.8, false], [330, 280, 0.8, true], [870, 290, 0.9, false]],
    near: [[-90, 260, 340, 60, 170, 5], [1050, 1370, 340, 1250, 160, 6]], farBlur: 3, nearBlur: 1.8, cloudBlur: 0.9,
    // 도깨비 쪽 하늘은 연기로 어둑하다
    mid: x => { wash(x, 1120, 170, 480, 240, '#6e6474', 0.5, 77, 0, 'multiply'); },
  });
  layer(g, 1.1, x => { smoke(x, 1000, 320, 260, 1.05, 3); smoke(x, 1180, 318, 230, 0.9, 4); smoke(x, 860, 326, 170, 0.7, 5); smoke(x, 250, 318, 150, 0.55, 6, 0.6); });
  layer(g, 1, x => {
    moss(x, [[-20, 322], [300, 316], [640, 324], [980, 314], [1300, 320]], 52, { n: 5000, back: '#a3b26a' });
    fortWall(x, 170, 330, 326, 18, 5);
    banner(x, 200, 312, 0.26, '#2c5578', '#e8c25a', 'ring', 1, 0.5); banner(x, 300, 312, 0.26, '#b8352d', '#e8c25a', 'flame', 2, 1.4);
    for (const [px, s, sd] of [[420, 0.42, 12], [520, 0.36, 13], [760, 0.4, 14], [880, 0.34, 15]]) pine(x, px, 326, s, sd);
    water(x, [[-20, 340], [320, 336], [640, 344], [980, 336], [1300, 342]], [[-20, 376], [320, 372], [640, 382], [980, 372], [1300, 378]], 62);
    rock(x, 120, 344, 120, 50, 121, { moss: true }); waterfall(x, 140, 312, 30, 36, 122);
    rock(x, 1150, 346, 140, 56, 123, { moss: true });
  });
  moss(g, [[-20, 372], [200, 368], [460, 376], [700, 370], [960, 378], [1300, 370]], 72, { n: 26000,
    path: [[-20, 520], [300, 470], [640, 452], [980, 470], [1300, 520], [1300, 600], [980, 548], [640, 528], [300, 548], [-20, 600]] });
  // 도깨비 쪽 들판은 그늘지고 그을렸다
  wash(g, 1140, 510, 380, 170, '#4e4660', 0.42, 78, 0, 'multiply');
  // 짓밟힌 진흙: 두 진영이 맞부딪친 가운데
  mud(g, 640, 500, 170, 50, 21); mud(g, 520, 580, 110, 30, 22); mud(g, 820, 430, 90, 22, 23);
  scorch(g, 800, 512, 60, 18, 1); scorch(g, 960, 590, 70, 22, 2); scorch(g, 1075, 470, 44, 14, 3); scorch(g, 600, 430, 34, 10, 4);
  rock(g, 1220, 460, 130, 70, 132, { moss: true });
  deadTree(g, 1190, 462, 0.95, 7); fern(g, 1180, 520, 0.8, 138, -1);
  // 가운데: 경계를 지키는 장승 한 쌍과 돌탑
  jangseung(g, 594, 404, 0.82, '천하대장군'); cairn(g, 640, 406, 0.95, 9); jangseung(g, 688, 406, 0.82, '지하여장군', '#2c4a72');
  // 아군 진지: 군기, 북, 목책
  banner(g, 30, 424, 0.95, '#2c5578', '#e8c25a', 'ring', 3, 0.3); banner(g, 96, 460, 1.0, '#b8352d', '#e8c25a', 'flame', 4, 1.2); banner(g, 158, 410, 0.85, '#d8a93c', '#b8352d', 'ring', 5, 2.1);
  drum(g, 222, 474, 1.15);
  fire(g, 300, 420, 0.9, 1);
  palisade(g, [[-10, 432], [52, 456], [96, 512], [118, 600]], 6, 0.95);
  pine(g, 40, 640, 0.95, 134);
  // 싸움의 흔적
  arrows(g, 560, 474, 8, 1.35, 11, -0.5); arrows(g, 728, 548, 7, 1.4, 12, -0.45); arrows(g, 880, 452, 6, 1.2, 13, -0.5); arrows(g, 640, 620, 6, 1.55, 14, -0.4); arrows(g, 1000, 520, 5, 1.3, 15, -0.5);
  brokenSpear(g, 470, 520, 60, 0.2, 1); brokenSpear(g, 780, 600, 70, -0.15, 2); brokenSpear(g, 900, 500, 54, 2.9, 3);
  club(g, 690, 470, 1.1, 0.4); club(g, 560, 650, 1.3, -0.3);
  shield(g, 700, 590, 22, 0.3, 1); shield(g, 520, 548, 18, -0.4, 2); shield(g, 860, 560, 16, 0.9, 3);
  fire(g, 1110, 610, 1.1, 2);
  for (const [wx, wy, ws, sd] of [[1105, 420, 1.2, 1], [1210, 540, 1.1, 2], [1010, 560, 0.9, 3], [1240, 640, 1.0, 4]]) wisp(g, wx, wy, ws, sd);
  if (!BG) {
  // 붓으로 그은 자리(먹 자국) — 병사를 세울 때 남는 흔적
  g.save(); g.globalAlpha = 0.28; g.strokeStyle = '#1c1612'; g.lineCap = 'round'; g.lineWidth = 9; g.filter = 'blur(0.8px)'; g.beginPath(); g.moveTo(452, 420); g.bezierCurveTo(470, 470, 440, 520, 470, 590); g.stroke(); g.restore();
  }
  const sc = y => 0.82 + (y - 400) / 200 * 0.42;
  const units = [
    ['archer', 300, 438, false], ['archer', 250, 520, false], ['hero', 360, 560, false],
    ['spear', 458, 432, false], ['spear', 470, 500, false], ['spear', 462, 578, false], ['tiger', 560, 560, false],
    ['dok', 790, 440, true], ['dokR', 900, 420, true], ['dok', 820, 520, true], ['dokR', 960, 520, true], ['dok', 760, 592, true],
  ].sort((a, b) => a[2] - b[2]);
  for (const [k, x, y, f] of units) put(g, k, x, y, sc(y) * (k === 'hero' ? 1.08 : 1), f, 3);
  if (!BG) {
  // 화살과 솜먼지
  for (const [x0, y0, x1, y1] of [[330, 360, 420, 340], [300, 410, 380, 396]]) { g.save(); g.translate(x1 + 300, y1 + 20); g.rotate(Math.atan2(y1 - y0, x1 - x0) * 0.2); g.strokeStyle = '#6a4a2a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-36, 0); g.lineTo(0, 0); g.stroke(); g.fillStyle = '#9aa2a8'; g.beginPath(); g.moveTo(0, -3); g.lineTo(7, 0); g.lineTo(0, 3); g.fill(); g.fillStyle = '#f4efe2'; g.beginPath(); g.moveTo(-36, 0); g.lineTo(-44, -4); g.lineTo(-40, 0); g.lineTo(-44, 4); g.fill(); g.restore(); }
  const R = rng(5);
  for (const [cx, cy] of [[640, 470], [660, 548]]) for (let k = 0; k < 7; k++) { const x = cx + (R() - 0.5) * 50, y = cy + (R() - 0.5) * 24, r = 6 + R() * 10; const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r); gr.addColorStop(0, 'rgba(255,252,244,0.95)'); gr.addColorStop(0.7, 'rgba(240,232,216,0.8)'); gr.addColorStop(1, 'rgba(230,220,200,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  }
  rays(g, 210, 120, 0.75, 6, 112, 0.12);
  grade(g, { vig: 0.34 });
  if (!BG) hud(g);
}

function hud(g) {
  // 위: 열두 고개를 꿴 실 (지나온 고개는 붉은 구슬)
  feltPanel(g, 16, 14, 250, 52, '#2c5578', 12);
  txt(g, '첫째 고개', 70, 33, { size: 22, fill: '#fff3d6', shadow: 'rgba(0,0,0,0.4)', sb: 3, sy: 1 });
  txt(g, '돌팔매질', 70, 53, { size: 14, font: FN, fill: '#e8dcc0' });
  for (let i = 0; i < 4; i++) bead(g, 148 + i * 28, 40, 8, i === 0 ? '#c33a2f' : '#e9dcc0', true);
  g.save(); g.strokeStyle = 'rgba(200,58,47,0.8)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(140, 40); g.lineTo(250, 40); g.stroke(); g.restore();
  for (let i = 0; i < 4; i++) bead(g, 148 + i * 28, 40, 8, i === 0 ? '#c33a2f' : '#e9dcc0', true);
  feltPanel(g, 1100, 14, 164, 52, '#e8dcc2', 12, { thread: 'rgba(120,80,40,0.6)' });
  g.save(); const cg = g.createRadialGradient(1128, 36, 0, 1132, 40, 15); cg.addColorStop(0, '#f8de8e'); cg.addColorStop(1, '#a87a2a'); g.fillStyle = cg; g.beginPath(); g.arc(1132, 40, 14, 0, TAU); g.fill(); g.fillStyle = '#5a3e14'; g.fillRect(1127, 35, 10, 10); g.restore();
  txt(g, '엽전 150', 1200, 41, { size: 22, fill: '#3a2a1c' });
  // 아래: 한지 판
  paperPanel(g, 12, 600, 1256, 112, 14);
  txt(g, '사기', 60, 628, { size: 22, fill: '#3a2a1c' });
  for (let i = 0; i < 8; i++) bead(g, 44 + (i % 4) * 30, 660 + Math.floor(i / 4) * 28, 10, '#c33a2f', i < 5);
  g.save(); g.strokeStyle = 'rgba(120,90,60,0.35)'; g.beginPath(); g.moveTo(178, 620); g.lineTo(178, 696); g.stroke(); g.restore();
  txt(g, '붓에 먹을 묻힌다', 198, 626, { size: 18, align: 'left', fill: '#6a3a1c' });
  txt(g, '대기 병사를 고르고 전장에 그으면, 그은 자리에 한 명씩 선다', 352, 626, { size: 13.5, font: FN, align: 'left', fill: '#6e6250' });
  const chips = [['spear', '창병', 2], ['archer', '궁수', 1], ['hero', '장수', 0], ['tiger', '호랑이', 1]];
  chips.forEach(([k, n, c], i) => {
    const x = 214 + i * 112, y = 646, on = i === 0;
    feltPanel(g, x, y - 4, 98, 58, on ? '#f6e3a8' : '#efe3c8', 10, { thread: on ? 'rgba(170,110,30,0.8)' : 'rgba(120,90,60,0.5)' });
    portrait(g, k, x + 26, y + 25, 21);
    txt(g, n, x + 68, y + 16, { size: 17, fill: '#2a211b' });
    txt(g, '×' + c, x + 68, y + 38, { size: 15, font: FN, w: 700, fill: c ? '#a33a2e' : '#9a8f7c' });
  });
  feltPanel(g, 790, 632, 200, 64, '#2c5578', 14); txt(g, '진군 대기', 890, 664, { size: 26, fill: '#fff3d6', shadow: 'rgba(0,0,0,0.4)', sb: 3, sy: 1 });
  feltPanel(g, 1010, 632, 236, 64, '#a33a2e', 14); txt(g, '전군 돌격', 1128, 664, { size: 26, fill: '#fff3d6', shadow: 'rgba(0,0,0,0.4)', sb: 3, sy: 1 });
}

export function puppetBoard(g) {
  backdrop(g, {
    sky: { sunX: 1080, sunY: 120, sunR: 46 }, farBase: 380, farBlur: 5, cloudBlur: 3.5, nearBlur: 4,
    far: [[-40, 320, 400, 140, 170, 1], [260, 620, 400, 430, 190, 2], [640, 1000, 400, 820, 160, 3], [960, 1340, 400, 1160, 150, 0]],
    clouds: [[160, 260, 1.1, false], [760, 240, 1.0, true, { gold: true }]],
    near: [[-80, 300, 470, 90, 250, 5], [1020, 1370, 470, 1240, 240, 6]],
  });
  moss(g, [[-20, 500], [260, 492], [640, 500], [1000, 490], [1300, 498]], 73, { n: 22000 });
  rock(g, 40, 560, 110, 60, 151, { moss: true }); rock(g, 1250, 556, 120, 64, 152, { moss: true });
  flowers(g, 300, 650, 1, 153); flowers(g, 920, 660, 1, 154, 'yellow'); fern(g, 1220, 700, 1, 155, -1); fern(g, 40, 700, 1, 156);
  const row = [['hero', 170, '장수', false], ['spear', 365, '창병', false], ['archer', 545, '궁수', false], ['tiger', 760, '호랑이', false], ['dok', 975, '도깨비', true], ['dokR', 1160, '붉은 도깨비', true]];
  for (const [k, x, n, f] of row) {
    put(g, k, x, 612, k === 'tiger' ? 2.5 : k === 'hero' ? 2.65 : 2.5, f, 6);
  }
  rays(g, 1080, 120, 2.2, 6, 113, 0.12);
  grade(g, { vig: 0.32 });
  if (BG) return;
  for (const [k, x, n] of row) { const w = 22 + n.length * 20; feltPanel(g, x - w / 2, 640, w, 40, '#f1e5cb', 10, { thread: 'rgba(140,100,60,0.6)' }); txt(g, n, x, 661, { size: 22, fill: '#2a211b' }); }
  txt(g, '인형 시트', 40, 44, { size: 30, align: 'left', fill: '#fffaf0', shadow: 'rgba(40,24,10,0.6)', sb: 10 });
  txt(g, '양모 펠트 · 유리구슬 눈 · 바느질 땀 · 나무와 쇠 소품', 40, 78, { size: 16, font: FN, align: 'left', fill: '#fff6e4', shadow: 'rgba(40,24,10,0.7)', sb: 8 });
}
