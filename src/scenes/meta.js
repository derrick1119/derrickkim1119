// 공적 장부: 원정에서 쌓은 공적으로 영웅·병력·출발 혜택을 연다 (가로)
import { W, H } from '../config.js';
import { INK, PAPER, RED, INDIGO, TEAL, OCHRE, SUB, FONT_B, text, textBlock, rr, ell, line, path, makeCanvas, clamp } from '../render/draw.js';
import { button, panel, brushTitle, stamp, bar, tapped, C, foil, goldText, icon } from '../ui/ui.js';
import { symbol } from '../render/symbols.js';
import { UNITS } from '../data/units.js';
import { TALES } from '../data/story.js';
import { CHAPTERS } from '../data/stages.js';
import { nav } from '../nav.js';
import { meta, save, UNLOCKS, has, buyUnlock, HARD, HARD_MAX, BEASTS, deedCount, noteDeed } from '../state.js';
import { miniStage } from '../ui/theater.js';
import { codexCount } from './codex.js';
import { dimBackdrop } from './title.js';
import { portrait, LOOKS } from '../render/sprites.js';
import { sfx, bgm } from '../audio.js';

// 영물 초상의 크기·자리 보정(칸을 고르게 채우도록)과, 아직 못 만난 영물의 먹 실루엣
const BK = { magpie: 1.42, sapsal: 1.5, samjoko: 1.22, tiger: 0.98, haetae: 0.9 }, BY = { magpie: 90, samjoko: 92, sapsal: 68, tiger: 70, haetae: 74 }, BX = { magpie: 5, tiger: -4, haetae: -2, sapsal: -3 };
const SHADES = new Map();
function shade(id) {
  let c = SHADES.get(id);
  if (!c) {
    c = makeCanvas(204, 134); const k = c.getContext('2d'), L = LOOKS[id], z = (BK[id] || 1) * (L.scale || 1) * 1.1;
    k.scale(2, 2); k.save(); k.translate(51 + (BX[id] || 0), (BY[id] || 73) - 9); k.scale(z, z); L.body(k); k.restore();
    k.globalCompositeOperation = 'source-in'; const gr = k.createLinearGradient(0, 0, 0, 67); gr.addColorStop(0, '#2b2832'); gr.addColorStop(1, '#55505e'); k.fillStyle = gr; k.fillRect(0, 0, 102, 67); SHADES.set(id, c);
  }
  return c;
}
// 출발 혜택의 그림: 옻칠 메달 안에 노잣돈(꿴 엽전) · 눈썰미(눈) · 군량(쌀가마) · 가보(보물 함)
function perkIcon(g, id, x, y, t) {
  ell(g, x + 1, y + 3, 30, 30, 'rgba(0,0,0,0.3)'); ell(g, x, y, 30, 30, foil(g, x - 30, x + 30), INK, 1.6); ell(g, x, y, 25, 25, '#2a1a20', 'rgba(40,20,8,0.8)', 1);
  if (id === 'p_gold') { line(g, [x - 14, y - 10, x + 14, y + 12], '#b8322a', 2.4); for (let k = -1; k <= 1; k++) icon.coin(g, x + k * 9, y + k * 7.5 + 1, 8); }
  else if (id === 'p_reroll') { path(g, p => { p.moveTo(x - 17, y); p.quadraticCurveTo(x, y - 15, x + 17, y); p.quadraticCurveTo(x, y + 15, x - 17, y); p.closePath(); }, '#f6efdc', INK, 1.4); ell(g, x, y, 7, 7, '#2f4d7e', INK, 1); ell(g, x, y, 3, 3, INK); ell(g, x - 2, y - 2, 1.3, 1.3, '#fff'); }
  else if (id === 'p_cap') icon.sack(g, x, y + 2, 1.35);
  else symbol(g, 'treasure', x, y, 34, '#f3d27c');
}
// 장부 한 줄: 금박 테를 두른 한지 쪽지. 연 것은 옅은 쑥빛, 왼쪽에 빛깔 띠
function slip(g, x, y, w, h, open) {
  rr(g, x + 2, y + 5, w, h, 7, 'rgba(0,0,0,0.4)');
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, open ? '#eef4e4' : '#fdf8ea'); gr.addColorStop(1, open ? '#d6e3c8' : '#ece0c2'); rr(g, x, y, w, h, 7, gr, INK, 2);
  rr(g, x + 3, y + 3, w - 6, h - 6, 5, null, foil(g, x, x + w), 1.2); rr(g, x + 3, y + 3, 6, h - 6, 3, open ? TEAL : '#b8742a');
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 12, y + 4, w - 24, 1.2);
}
export class MetaScene {
  constructor(a) { this.t = 0; this.book = !!(a && a.book); this.beasts = false; this.sel = 0; noteDeed(); }
  // 영물의 인연: 원정에서 쌓은 공으로 영물이 합류한다. 아직 못 만난 영물도 무엇을 하면 되는지 보인다
  drawBeasts(g) {
    brushTitle(g, 250, 48, 360, 66, '영물의 인연', TEAL, 38);
    goldText(g, `인연을 맺은 영물 ${BEASTS.filter(b => has(b.id)).length} / ${BEASTS.length}`, 520, 44, { size: 32, align: 'left', glow: false });
    text(g, '영물은 저마다 한 사건과 이어져 있습니다. 그 사건에서 돕는 길을 고르면 은혜를 갚으러 찾아옵니다', 520, 78, { size: 16, fill: '#d9ccae', weight: 400, align: 'left', maxW: 720 });
    BEASTS.forEach((b, n) => {
      const x = 30, y = 108 + n * 93, w = 1220, h = 85, open = has(b.id), u = UNITS[b.id];
      slip(g, x, y, w, h, open);
      // 초상: 칸을 채우는 고른 크기로. 아직 못 만난 영물은 먹 실루엣으로 보인다
      rr(g, x + 9, y + 8, 104, 69, 5, open ? '#f3ead2' : '#e6dcc2', INK, 1.2); g.save(); g.beginPath(); g.rect(x + 10, y + 9, 102, 67); g.clip();
      if (open) portrait(g, b.id, x + 61 + (BX[b.id] || 0), y + (BY[b.id] || 73), BK[b.id] || 1, this.t); else g.drawImage(shade(b.id), x + 10, y + 9, 102, 67);
      g.restore();
      text(g, u.name, x + 130, y + 29, { size: 26, font: FONT_B, align: 'left' }); text(g, `${u.role} · ${u.desc}`, x + 132, y + 60, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 330 });
      text(g, b.how, x + 480, y + 28, { size: 19, font: FONT_B, align: 'left', fill: open ? TEAL : INK, maxW: 470 }); text(g, b.lore, x + 482, y + 58, { size: 15, align: 'left', fill: SUB, weight: 400, maxW: 470 });
      if (open) stamp(g, x + w - 76, y + 42, 28, 'bond', TEAL, -0.12);
      else text(g, '아직 만나지 못함', x + w - 110, y + 43, { size: 17, font: FONT_B, fill: SUB });
    });
    if (button(g, 'beastback', 960, 584, 290, 86, '장부로', { style: 'paper', size: 32 })) this.beasts = false;
  }
  // 이야기책: 주막에서 들은 옛이야기를 다시 읽는다
  drawBook(g) {
    const got = meta.tales || [];
    brushTitle(g, 250, 48, 360, 66, '이야기책', '#2f6f5c', 38);
    goldText(g, `들은 이야기 ${got.length} / ${TALES.length}`, 520, 44, { size: 32, align: 'left', glow: false });
    text(g, '주막에서 고개의 옛이야기를 들려줍니다 — 두목을 이길 귀띔도', 520, 78, { size: 16, fill: '#d9ccae', weight: 400, align: 'left' });
    panel(g, 30, 108, 420, 574); panel(g, 470, 108, 780, 464);
    TALES.forEach((t, n) => {
      const y = 122 + n * 45, has = got.includes(t.id), on = this.sel === n;
      if (tapped('tale' + n, 46, y, 388, 41)) this.sel = n;
      rr(g, 46, y, 388, 41, 6, on ? '#f6e3a8' : has ? '#fbf3df' : '#ebe2cc', on ? '#c9962e' : 'rgba(38,42,54,0.35)', on ? 2 : 1);
      text(g, has ? t.title : '· · ·', 66, y + 21.5, { size: 20, font: FONT_B, align: 'left', fill: has ? INK : '#a9a394' }); text(g, CHAPTERS[t.ch].short, 420, y + 21.5, { size: 13.5, align: 'right', fill: SUB, weight: 400 });
    });
    const t = TALES[this.sel], has = got.includes(t.id);
    if (has) {
      // 들은 이야기는 작은 무대에서 인형 둘이 다시 들려준다
      const li = Math.floor(this.t / 3.4) % t.lines.length;
      text(g, t.title, 860, 152, { size: 34, font: FONT_B });
      miniStage(g, 610, 184, 500, 236, { t: this.t, bg: ['village', 'grove', 'night'][t.ch], actors: [[t.cast[0], 0.3, li === 0 ? 'hop' : 'idle', 1], [t.cast[1], 0.7, li === 1 ? 'talk' : 'idle', -1]], zoom: 1.5 });
      g.globalAlpha = clamp((this.t % 3.4) / 0.3, 0, 1); textBlock(g, t.lines[li], 860, 474, 700, 34, { size: 24, font: FONT_B }); g.globalAlpha = 1;
      text(g, `— ${CHAPTERS[t.ch].name}의 주막에서`, 1210, 530, { size: 15, align: 'right', fill: SUB, weight: 400 });
    } else { stamp(g, 860, 300, 46, '?', '#a9a394', -0.1); text(g, '아직 듣지 못한 이야기입니다', 860, 384, { size: 24, font: FONT_B, fill: SUB }); text(g, `${CHAPTERS[t.ch].name}의 주막에 들러 보세요`, 860, 420, { size: 17, fill: SUB, weight: 400 }); }
    // 열두 이야기를 다 모으면: 숨은 고개에 대한 귀띔
    text(g, meta.trueEnd ? '열세 번째 고개를 넘었습니다 — 이야기는 이제 당신이 들려줄 차례' : got.length >= TALES.length ? '열두 이야기를 모두 들었다. 이제 열두 고개를 평정하면…' : '열두 이야기를 모두 들은 이에게만 보이는 고개가 있다고 합니다', 708, 628, { size: 17, font: FONT_B, fill: meta.trueEnd ? '#f0d264' : '#e6d2a6', maxW: 470 });
    if (button(g, 'bookback', 960, 584, 290, 86, '장부로', { style: 'paper', size: 32 })) this.book = false;
  }
  frame(g, dt) {
    bgm('rest');
    this.t += dt; dimBackdrop(g, 0.82);
    if (this.book) { this.drawBook(g); return; }
    if (this.beasts) { this.drawBeasts(g); return; }
    if (button(g, 'book', 1100, 22, 150, 62, `이야기책 ${(meta.tales || []).length}/${TALES.length}`, { style: 'wood', size: 18 })) { this.book = true; return; }
    if (button(g, 'beasts', 942, 22, 150, 62, `영물 ${BEASTS.filter(b => has(b.id)).length}/${BEASTS.length}`, { style: 'wood', size: 19 })) { this.beasts = true; return; }
    if (button(g, 'codex', 784, 22, 150, 62, `도감 ${codexCount().got}/${codexCount().all}`, { style: 'wood', size: 18 })) { nav.go('codex'); return; }
    brushTitle(g, 250, 48, 360, 66, '공적 장부', INDIGO, 38);
    goldText(g, `쌓인 공적 ${meta.merit}`, 470, 44, { size: 30, align: 'left', glow: false, maxW: 300 });
    text(g, '원정이 끝날 때마다 공적이 쌓입니다', 470, 78, { size: 16, fill: '#d9ccae', weight: 400, align: 'left', maxW: 290 });
    UNLOCKS.forEach((u, n) => {
      const x = 30 + (n % 2) * 620, y = 108 + Math.floor(n / 2) * 90, w = 600, h = 82, open = has(u.id), afford = meta.merit >= u.cost;
      slip(g, x, y, w, h, open);
      // 지금 공적으로 열 수 있는 줄은 금테가 숨 쉬듯 빛난다
      if (!open && afford) { g.save(); g.globalAlpha = 0.55 + 0.35 * Math.sin(this.t * 3 + n); rr(g, x - 3, y - 3, w + 6, h + 6, 9, null, '#f3d27c', 2.6); g.restore(); }
      if (u.unit) { rr(g, x + 9, y + 8, 78, 66, 5, '#efe4c9', INK, 1.2); g.save(); g.beginPath(); g.rect(x + 10, y + 9, 76, 64); g.clip(); portrait(g, u.unit, x + 47, y + 72, 0.8, this.t); g.restore(); } else perkIcon(g, u.id, x + 48, y + 41, this.t);
      text(g, u.name, x + 102, y + 30, { size: 23, font: FONT_B, align: 'left' }); text(g, u.desc, x + 104, y + 58, { size: 15.5, align: 'left', fill: SUB, weight: 400, maxW: 320 });
      if (open) stamp(g, x + w - 70, y + 41, 27, 'open', TEAL, -0.12);
      else if (button(g, 'u' + n, x + w - 164, y + 15, 150, 50, `공적 ${u.cost}`, { style: afford ? 'indigo' : 'grey', size: 23 })) { if (buyUnlock(u.id)) sfx('star'); else sfx('deny'); }
    });
    const y = 572; panel(g, 30, y, 900, 110);
    if ((meta.hardMax || 0) > 0) {
      // 험로: 단계마다 규칙이 하나씩 붙는다 (아래 단계의 규칙도 모두 따라온다)
      const hv = Math.min(meta.hard || 0, meta.hardMax), hd = HARD[hv];
      text(g, hv ? `험로 ${hv}단계 · ${hd.name}` : '평탄한 길', 56, y + 28, { size: 22, font: FONT_B, align: 'left', fill: hv ? RED : INK, maxW: 276 });
      if (hv) { text(g, hd.desc, 56, y + 56, { size: 14.5, align: 'left', fill: '#4a4034', weight: 400, maxW: 276 }); text(g, `${hv > 1 ? '이전 단계 규칙 포함 · ' : ''}공적 +${hv * 20}%`, 56, y + 78, { size: 14, align: 'left', fill: '#8a2a26', maxW: 276 }); }
      else textBlock(g, '험로 규칙 없이 떠납니다. 평정할 때마다 한 단계씩 열립니다', 56, y + 54, 276, 19, { size: 14, align: 'left', fill: '#4a4034', weight: 400 });
      // 스무 단계 사다리: 붉은 점이 찍힌 칸은 평정한 길, 짙은 칸은 지금 고른 길, 흐린 칸은 아직 닫힌 길. 열한 번째부터는 붉은 칸. 칸을 눌러 고른다
      for (let lv = 0; lv <= HARD_MAX; lv++) {
        const cx = 346 + lv * 27, cy = y + 10, bw = 25, open = lv <= meta.hardMax, cleared = lv < meta.hardMax, cur = lv === hv, deep = lv > 10;
        if (open && tapped('hl' + lv, cx - 1, cy - 4, 27, 66)) { meta.hard = lv; save(); sfx('card'); }
        g.save(); if (!open) g.globalAlpha = 0.42;
        rr(g, cx, cy + 3, bw, 58, 5, '#d9cdb0', INK, 1.4); rr(g, cx, cy, bw, 58, 5, cur ? (deep ? '#7a1f1c' : '#2b3b60') : '#fbf3df', INK, cur ? 2.4 : 1.4);
        text(g, String(lv), cx + bw / 2, cy + 22, { size: lv >= 10 ? 14 : 17, font: FONT_B, fill: cur ? '#f6efdc' : INK });
        if (cleared) { ell(g, cx + bw / 2, cy + 44, 4.4, 4.4, RED, INK, 1); } else if (!open) { rr(g, cx + bw / 2 - 5, cy + 42, 10, 8, 2, '#8a8474', INK, 1); g.beginPath(); g.arc(cx + bw / 2, cy + 42, 3.4, Math.PI, 0); g.strokeStyle = INK; g.lineWidth = 1.3; g.stroke(); }
        g.restore();
      }
      text(g, `붉은 점: 넘은 단계 · 눌러서 고르기 · 열린 단계 ${meta.hardMax}/${HARD_MAX}`, 634, y + 90, { size: 15, fill: '#4a4034', weight: 400, maxW: 560 });
    } else { text(g, '험로', 64, y + 40, { size: 28, font: FONT_B, align: 'left', fill: SUB }); text(g, '열두 고개를 모두 넘으면 더 험한 길이 열립니다', 64, y + 76, { size: 17, align: 'left', fill: SUB, weight: 400 }); }
    if (button(g, 'back', 960, y + 12, 290, 86, '돌아가기', { style: 'paper', size: 32 })) nav.go('title');
  }
}
