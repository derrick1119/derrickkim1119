// 첫 화면과 여러 장면이 함께 쓰는 한지 배경
import { W, H } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, OCHRE, SUB, FONT_B, text, ell, rr, poly, line, path, st, makeCanvas, rng, clamp } from '../render/draw.js';
import { button, iconBtn, icon, panel, seal, C, ui } from '../ui/ui.js';
import { drawKeyArt, drawVista, KEY_INTRO } from '../render/keyart.js';
import { nav } from '../nav.js';
import { G, meta, save, dailyOf, BEASTS, has, deedCount } from '../state.js';
import { FEATS } from '../data/feats.js';
import { UNLOCK_PACE, MASTERY_XP, MASTERY_GIFT, masteryLv } from '../data/progress.js';
import { DAILY_RULES } from '../data/progress.js';
import { UNITS, HERO_COL } from '../data/units.js';
import { goldText, foil } from '../ui/ui.js';
import { chapterOf } from '../data/stages.js';
import { audio, setMuted, sfx, bgm } from '../audio.js';
import { portrait } from '../render/sprites.js';
import { THEMES, pine, bush, boulder, grassTuft } from '../render/terrain.js';
import { part, dk, lt, R as RC, curve } from '../render/figures.js';

let bg = null;
const rgba = (c, a) => `rgba(${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)},${a})`;
// 여러 장면이 함께 쓰는 배경: 붉은 해, 안개에 잠긴 겹산, 고갯마루의 솔
export function backdrop() {
  if (bg) return bg;
  const S = 1.5, c = makeCanvas(W * S, H * S), g = c.getContext('2d'); g.scale(S, S); const R = rng(77), T = THEMES.pass, SKY = '#ecdfc2';
  const sk = g.createLinearGradient(0, 0, 0, 520); sk.addColorStop(0, '#e6d6b4'); sk.addColorStop(0.5, SKY); sk.addColorStop(1, '#f3ead2'); g.fillStyle = sk; g.fillRect(0, 0, W, H);
  // 해와 해무리
  const halo = g.createRadialGradient(900, 250, 60, 900, 250, 210); halo.addColorStop(0, 'rgba(232,176,74,0.32)'); halo.addColorStop(1, 'rgba(232,176,74,0)'); g.fillStyle = halo; g.fillRect(690, 40, 420, 420);
  g.globalAlpha = 0.35; ell(g, 900, 250, 92, 92, '#f6dc9a'); g.globalAlpha = 1; ell(g, 900, 250, 74, 74, '#efc46a');   // 옅은 금빛 해 (붉은 원판 하나는 남의 나라 깃발처럼 읽힌다)
  // 구름
  const cloud = (x, y, w) => { const h = w * 0.15; path(g, p => { p.moveTo(x - w / 2, y); p.quadraticCurveTo(x - w * 0.5, y - h * 0.9, x - w * 0.28, y - h * 0.8); p.quadraticCurveTo(x - w * 0.2, y - h * 1.9, x + w * 0.02, y - h * 1.3); p.quadraticCurveTo(x + w * 0.16, y - h * 1.8, x + w * 0.26, y - h * 0.9); p.quadraticCurveTo(x + w * 0.5, y - h, x + w / 2, y); p.closePath(); }, 'rgba(255,252,242,0.8)', rgba(INK, 0.16), 1.2); line(g, [x - w * 0.3, y - h * 0.36, x + w * 0.22, y - h * 0.36], rgba(INK, 0.1), 1); };
  cloud(1010, 300, 210); cloud(730, 196, 150); cloud(1180, 150, 170); cloud(610, 330, 120);
  for (const [x0, y0] of [[690, 120], [1060, 96]]) for (let j = 0; j < 4; j++) { const x = x0 + j * 20 + R() * 6, y = y0 + (j % 2) * 9 + R() * 4; curve(g, p => { p.moveTo(x - 6, y - 2.6); p.quadraticCurveTo(x - 2.4, y - 4.4, x, y); p.quadraticCurveTo(x + 2.4, y - 4.4, x + 6, y - 2.6); }, rgba(INK, 0.55), 1.4); }
  // 겹산: 능선은 짙고 산허리는 안개에 풀린다
  [['#b3bcba', 330, 120, 0.004, 0.6], ['#8696a0', 392, 100, 0.006, 0.78], ['#5d707c', 452, 80, 0.008, 0.92]].forEach(([col, yb, amp, f, a], n) => {
    const fy = x => yb - Math.abs(Math.sin(x * f + n * 2.2)) * amp - Math.max(0, Math.sin(x * f * 2.3 + n * 1.3)) * amp * 0.28 - Math.sin(x * 0.03 + n) * 7 + Math.exp(-Math.pow((x - 760) / (220 - n * 36), 2)) * amp * 0.75;
    const shape = () => { g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 10) g.lineTo(x, fy(x)); g.lineTo(W, H); g.closePath(); };
    const gr = g.createLinearGradient(0, yb - amp, 0, yb + 70); gr.addColorStop(0, rgba(dk(col, 0.14), a)); gr.addColorStop(0.5, rgba(col, a * 0.9)); gr.addColorStop(1, rgba(lt(col, 0.5), a * 0.5)); shape(); g.fillStyle = gr; g.fill();
    g.save(); shape(); g.clip(); const cd = dk(col, 0.42); g.globalAlpha = 0.17;
    for (let x = 0; x < W; x += 16 + R() * 20) { const y = fy(x); line(g, [x, y + 3, x - 8 - R() * 12, y + 26 + R() * 30], cd, 1.4); if (R() < 0.6) line(g, [x + 5, y + 5, x + 14 + R() * 10, y + 24 + R() * 24], cd, 1.1); }
    g.restore();
    g.globalAlpha = 0.2 + n * 0.08; for (let x = 8; x < W; x += 5 + R() * 34) { const y = fy(x), h = 3 + R() * 4 + n * 1.5; line(g, [x, y + 1, x, y - h], cd, 1); ell(g, x - 0.6, y - h, 2.4 + R() * 1.8 + n * 0.6, 1.2 + n * 0.2, cd); if (R() < 0.5) ell(g, x + 1.6, y - h * 0.45, 2 + n * 0.6, 1, cd); }
    g.globalAlpha = 0.32; g.beginPath(); for (let x = 0; x <= W; x += 10) { if (x) g.lineTo(x, fy(x)); else g.moveTo(x, fy(x)); } st(g, INK, 1.4); g.globalAlpha = 1;
    const m = g.createLinearGradient(0, yb - 24, 0, yb + 84); m.addColorStop(0, 'rgba(240,230,205,0)'); m.addColorStop(1, 'rgba(240,230,205,0.94)'); g.fillStyle = m; g.fillRect(0, yb - 24, W, 108);
  });
  // 고갯마루: 번진 풀빛과 흙길
  for (let i = 0; i < 34; i++) { const x = R() * W, y = 510 + R() * 230, rx = 130 + R() * 170, ry = rx * (0.24 + R() * 0.2), col = R() < 0.5 ? '#a9b78f' : '#93a57f', a = 0.3 + R() * 0.2; g.save(); g.translate(x, y); g.rotate((R() - 0.5) * 0.4); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, rx * 0.2, 0, 0, rx); gr.addColorStop(0, rgba(col, a * 0.7)); gr.addColorStop(0.72, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); }
  const ry = x => 612 + Math.sin(x * 0.01) * 24 - (x - 520) * 0.12, hw = x => 30 + (1320 - x) * 0.022;
  const tp = x => Math.min(1, Math.max(0, (x - 400) / 260));   // 왼쪽 끝은 풀밭으로 스며든다
  for (let i = 0; i < 9; i++) { const gw = 24 - i * 3; g.globalAlpha = 0.085; g.fillStyle = '#f6eedb'; g.beginPath(); g.moveTo(400, ry(400)); for (let x = 420; x <= 1330; x += 20) g.lineTo(x, ry(x) - (hw(x) + gw) * tp(x)); for (let x = 1330; x >= 420; x -= 20) g.lineTo(x, ry(x) + (hw(x) + gw) * tp(x)); g.closePath(); g.fill(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 3200; i++) { const x = R() * W, y = R() * H, a = R() * TAU, l = 4 + R() * 12; g.globalAlpha = 0.13; g.strokeStyle = R() < 0.5 ? '#a89468' : '#ffffff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  for (let i = 0; i < 26; i++) { const x = R() * W, y = 520 + R() * 190; g.globalAlpha = 0.14 + R() * 0.12; for (let j = 0; j < 5; j++) ell(g, x + (R() - 0.5) * 26, y + (R() - 0.5) * 8, 2 + R() * 2, 1.1 + R() * 0.8, T.pineD, null, 0, -0.3); }
  g.globalAlpha = 1;
  for (let i = 0; i < 80; i++) grassTuft(g, R() * W, 512 + R() * 200, 0.8 + R() * 0.7, R() < 0.7 ? '#5f7a5a' : T.pine, R);
  for (let i = 0; i < 16; i++) { const x = R() * W, y = 520 + R() * 190, col = ['#f3c4c9', '#fbf7ec', '#f0d264'][(R() * 3) | 0]; line(g, [x, y + 7, x + 0.6, y], '#5f7a5a', 1.1); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU - 0.3; ell(g, x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 1.8, 1.8, col, rgba(INK, 0.45), 0.6); } ell(g, x, y, 1.2, 1.2, OCHRE); }
  // 솟대
  line(g, [1090, 520, 1090, 400], INK, 5.4); line(g, [1090, 520, 1090, 400], '#7a5a40', 3.2); line(g, [1089, 516, 1089, 404], '#a8805c', 0.9);
  part(g, p => { p.moveTo(1072, 398); p.quadraticCurveTo(1090, 384, 1112, 396); p.lineTo(1122, 390); p.lineTo(1114, 402); p.quadraticCurveTo(1090, 410, 1072, 398); p.closePath(); }, '#3a3238', RC(1060, 399, 70, 14), { k: 0.3, lw: 1.6 }); line(g, [1072, 398, 1064, 396], INK, 1.8);
  // 앞쪽 솔과 바위, 덤불
  g.globalAlpha = 0.5; pine(g, 150, 520, 1.1, T, true); pine(g, 896, 494, 0.8, T); g.globalAlpha = 1;
  const far = g.createLinearGradient(0, 440, 0, 530); far.addColorStop(0, 'rgba(240,230,205,0)'); far.addColorStop(0.6, 'rgba(240,230,205,0.5)'); far.addColorStop(1, 'rgba(240,230,205,0)'); g.fillStyle = far; g.fillRect(0, 440, W, 90);
  boulder(g, 560, 700, 30, T); bush(g, 500, 716, 2.2, T); bush(g, 1120, 712, 2.4, T); boulder(g, 1040, 716, 22, T);
  pine(g, 40, 580, 3, T); pine(g, 1252, 610, 2.8, T, true); pine(g, 1182, 742, 2.4, T);
  grassTuft(g, 96, 584, 2, '#5f7a5a', R); grassTuft(g, 1200, 616, 2, '#5f7a5a', R);
  bg = c; return c;
}
// 메뉴 화면(영웅 고르기·공적 장부)의 배경: 첫 화면과 같은 달밤 고갯마루를 어둡게 깐다
export function dimBackdrop(g, a = 0.5) { drawVista(g, performance.now() / 1000, Math.min(0.62, a * 0.7)); }

// 첫 화면 '열두 고개': 달밤의 열두 겹 고갯마루, 등불 행렬과 금박 제호 (render/keyart.js)
export class TitleScene {
  constructor() { this.t = 0; this.confirm = false; }
  frame(g, dt) {
    bgm('title');
    this.t += dt; const t = this.t, intro = t < KEY_INTRO;
    // 첫 등장 연출 중에 누르면 바로 끝 장면으로
    if (intro && ui.inp && ui.inp.released && !this.confirm) this.t = KEY_INTRO;
    drawKeyArt(g, this.t);
    const r = G.run, k = clamp((this.t - 3.0) / 0.5, 0, 1);
    if (k <= 0) return;
    g.save(); g.globalAlpha = k;
    if (this.confirm) {
      g.fillStyle = 'rgba(12,10,20,0.6)'; g.fillRect(0, 0, W, H);
      panel(g, 360, 210, 560, 300);
      text(g, '새 원정을 시작할까요?', 640, 284, { size: 38, font: FONT_B });
      text(g, '진행 중인 원정은 사라집니다.', 640, 338, { size: 22, fill: SUB, weight: 400 });
      if (button(g, 'no', 390, 400, 240, 78, '그만두기', { style: 'paper', size: 30 })) this.confirm = false;
      if (button(g, 'yes', 650, 400, 240, 78, '새로 시작', { style: 'red', size: 30 })) { G.run = null; save(); nav.go('hero'); }
      g.restore(); return;
    }
    // 오늘의 원정: 날짜로 정한 영웅과 규칙 둘. 험로·숙련·공적 혜택 없이 모두 같은 조건에서 점수를 겨룬다
    if (this.day) {
      const d = this.day, best = (meta.daily || {})[d.date] || 0, col = HERO_COL[d.hero];
      g.fillStyle = 'rgba(8,6,14,0.86)'; g.fillRect(0, 0, W, H);
      panel(g, 300, 120, 680, 470);
      goldText(g, '오늘의 원정', 640, 172, { size: 40 }); text(g, `${d.date.slice(5, 7) | 0}월 ${d.date.slice(8, 10) | 0}일 · 하루 한 번 바뀌는 원정`, 640, 212, { size: 16, fill: SUB, weight: 400 });
      ell(g, 420, 318, 74, 74, '#efd9a8', INK, 2.4); ell(g, 420, 318, 68, 68, null, col, 2); g.save(); g.beginPath(); g.arc(420, 318, 72, 0, TAU); g.clip(); g.fillStyle = 'rgba(140,160,120,0.6)'; g.fillRect(340, 356, 160, 40); portrait(g, d.hero, 416, 386, 1.4, t, true); g.restore();
      text(g, UNITS[d.hero].name, 420, 414, { size: 26, font: FONT_B });
      d.rules.forEach((k, n) => { const R = DAILY_RULES[k], y = 254 + n * 86; rr(g, 520, y, 420, 74, 8, '#fbf1cf', '#8a2a26', 1.8); rr(g, 520, y, 7, 74, 3, '#8a2a26'); text(g, R.name, 542, y + 24, { size: 21, font: FONT_B, align: 'left', fill: '#8a2a26' }); text(g, R.desc, 542, y + 52, { size: 16, align: 'left', fill: '#3a2a1a', weight: 400, maxW: 386 }); });
      text(g, best ? `오늘의 최고 ${best}점` : '아직 오늘의 기록이 없습니다', 640, 462, { size: 19, font: FONT_B, fill: best ? '#8a5a10' : SUB });
      text(g, '험로·숙련·공적 혜택 없이, 모든 패와 보물이 열린 채 떠납니다', 640, 490, { size: 15, fill: '#4a4034', weight: 400 });
      if (button(g, 'dno', 340, 510, 240, 66, '닫기', { style: 'paper', size: 26 })) this.day = null;
      if (button(g, 'dgo', 700, 510, 240, 66, '떠나기', { style: 'red', size: 30 })) { const dd = d; this.day = null; nav.go('prologue', { hero: dd.hero, daily: dd.date }); }
      g.restore(); return;
    }
    if (r) {
      if (button(g, 'cont', 460, 624, 360, 70, `이어하기 · ${chapterOf(r.ch).short}`, { style: 'red', size: 30 })) nav.go('run');
      if (button(g, 'new', 250, 630, 180, 58, '새 원정', { style: 'wood', size: 24 })) this.confirm = true;
      if (button(g, 'meta', 850, 630, 180, 58, '공적 장부', { style: 'wood', size: 24 })) nav.go('meta');
    } else {
      const pulse = 1 + Math.sin(t * 4) * 0.012;
      g.save(); g.translate(640, 659); g.scale(pulse, pulse); g.translate(-640, -659);
      if (button(g, 'start', 480, 624, 320, 70, '출  정', { style: 'red', size: 44 })) nav.go('hero');
      g.restore();
      if (button(g, 'meta', 260, 630, 180, 58, '공적 장부', { style: 'wood', size: 24 })) nav.go('meta');
      // 한 번이라도 원정을 마치면 이야기책 자리에 오늘의 원정이 선다 (이야기책은 공적 장부에서)
      if ((meta.ended || 0) >= 1) { if (button(g, 'daily', 840, 630, 180, 58, '오늘의 원정', { style: 'indigo', size: 22 })) { this.day = dailyOf(); sfx('card'); }
        // 오늘 아직 떠나지 않았으면 '새' 표식
        const dd = dailyOf(); if (!(meta.daily || {})[dd.date]) { ell(g, 1014, 634, 15, 15, '#c8402f', INK, 1.6); text(g, '새', 1014, 635, { size: 14, font: FONT_B, fill: C.cream }); } text(g, `${dd.date.slice(5, 7) | 0}월 ${dd.date.slice(8, 10) | 0}일 · ${UNITS[dd.hero].name}`, 930, 702, { size: 13.5, fill: '#cbb894' }); }
      else if (button(g, 'book', 840, 630, 180, 58, '이야기책', { style: 'wood', size: 24 })) nav.go('meta', { book: true });
    }
    // 목표판: 가장 가까운 목표 셋 (원정을 한 번 마친 뒤부터)
    if ((meta.ended || 0) >= 1 && !r) { const goals = goalList().slice(0, 3); if (goals.length) { const x = 936, y = 440, h = 34 + goals.length * 34;
      rr(g, x + 2, y + 4, 310, h, 9, 'rgba(0,0,0,0.35)'); rr(g, x, y, 310, h, 9, 'rgba(22,14,18,0.78)', '#000', 1.2); rr(g, x + 3, y + 3, 304, h - 6, 7, null, 'rgba(226,184,90,0.55)', 1);
      text(g, '다음 목표', x + 16, y + 18, { size: 15, font: FONT_B, align: 'left', fill: '#f0d99a' });
      goals.forEach((q, n) => { const yy = y + 44 + n * 34; ell(g, x + 22, yy, 4, 4, '#e2b85a'); text(g, q[0], x + 34, yy - 6, { size: 14.5, font: FONT_B, align: 'left', fill: '#f3e6c4', maxW: 262 }); text(g, q[1], x + 34, yy + 10, { size: 12, align: 'left', fill: '#cbb894', maxW: 262 }); }); } }
    if (iconBtn(g, 'snd', 1204, 20, 56, 52, (gg, x, y) => icon.sound(gg, x - 3, y, !audio.muted))) { setMuted(!audio.muted); sfx('click'); }
    if (meta.best > 0) text(g, meta.clears ? `평정 ${meta.clears}회` : `최고 기록 · ${chapterOf(Math.floor((meta.best - 1) / 6)).short}`, 1262, 704, { size: 15, fill: '#cbb894', align: 'right', maxW: 240 });
    g.restore();
  }
}
// 가장 가까운 목표: 새로 열릴 것 · 전공첩 · 영물의 인연 · 영웅 숙련 ([제목, 한 줄])
function goalList() {
  const out = [], ended = meta.ended || 0, nx = UNLOCK_PACE.find(p => p.at > ended);
  if (nx) out.push([`원정 ${nx.at - ended}번 더 마치기`, '새 패와 보물이 열린다']);
  const f = FEATS.find(q => !(meta.feats || {})[q.id]); if (f) out.push([`전공첩 · ${f.name}`, `${f.how} (공적 +${f.merit})`]);
  const b = BEASTS.filter(q => !has(q.id)).sort((a, c) => deedCount(c) / c.need - deedCount(a) / a.need)[0]; if (b) out.push([`영물의 인연 · ${Math.min(b.need, deedCount(b))}/${b.need}`, b.how]);
  const hx = Object.entries(meta.heroXp || {}).filter(([, x]) => masteryLv(x) < 5).sort((a, c) => c[1] - a[1])[0];
  if (hx) { const lv = masteryLv(hx[1]); out.push([`${UNITS[hx[0]].name} 숙련 ${lv + 1}까지 ${MASTERY_XP[lv] - hx[1]}`, MASTERY_GIFT[lv + 1]]); }
  return out;
}
