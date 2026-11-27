// 결재함: 전장 왼쪽에 투서(전술 상소)와 장계(원군 도착)가 올라오고, '윤허'·'불허' 도장을 눌러 결재한다.
// 아래 띠 가운데에는 원군 명부(누가 올 수 있는지)와 '원군을 청한다' 단추가 있다.
import { HUD_H, BAR_Y, W } from '../config.js';
import { TAU, INK, PAPER, RED, INDIGO, FONT, FONT_B, text, rr, ell, line, poly, clamp, easeOutBack } from '../render/draw.js';
import { HAND, REFILL, TIER, tierOf, SYM_N } from '../sim/battle.js';
const SYM_N_UI = SYM_N;
import { CARDS, KIND, cardName, isUnit } from '../data/cards.js';
import { UNITS } from '../data/units.js';
import { portrait, lookOf } from '../render/sprites.js';
import { cardIcon } from '../render/icons.js';
import { panel, icon, tapped, inRect, C } from './ui.js';
import { cardText } from './cards.js';
import { sfx } from '../audio.js';

export const TRAY = { x: 0, y: HUD_H, w: 250, h: BAR_Y - HUD_H };
const LW = 236, LH = 92, LX = 7, GAP = 5, TOP = HUD_H + 50;
// 등급 빛깔
export const TIER_COL = { common: '#7a6a52', rare: '#2f6f9e', epic: '#7a3fa0', legend: '#c8901e' };
const TIER_GLOW = { epic: '190,130,255', legend: '255,206,110' };
// 투서를 올린 이 (패의 갈래마다)
const SENDER = { attack: '선봉장 아룀', support: '군관 아룀', tactic: '책사 아룀', hero: '영웅의 뜻', curse: '괴이한 투서' };
// 원군을 보내온 고을 (장계를 올린 이)
const TOWNS = ['남원 현감', '안동 부사', '전주 판관', '강릉 부사', '경주 부윤', '공주 목사', '진주 목사', '해남 현감', '청주 목사', '원주 목사', '나주 목사', '상주 목사'];
const townOf = id => TOWNS[[...String(id)].reduce((a, ch) => a + ch.charCodeAt(0), 0) % TOWNS.length];
// 두 줄로 나눈다 (넘치면 둘째 줄 끝을 자른다)
const wrap2 = (g, s, w, size) => { g.font = `400 ${size}px ${FONT}`; if (g.measureText(s).width <= w) return [s, '']; let k = 1; while (k < s.length && g.measureText(s.slice(0, k + 1)).width <= w) k++; const sp = s.lastIndexOf(' ', k); if (sp > k * 0.6) k = sp + 1; return [s.slice(0, k).trim(), fitLine(g, s.slice(k).trim(), w, size)]; };
// 정해진 폭에 맞게 글자를 자른다 (글씨를 줄이지 않는다)
const fitLine = (g, s, w, size) => { g.font = `400 ${size}px ${FONT}`; if (g.measureText(s).width <= w) return s; let t = s; while (t.length > 1 && g.measureText(t + '…').width > w) t = t.slice(0, -1); return t + '…'; };

// 결재함의 상태: 투서마다 들어온 시각, 결재해서 나가는 모습
export class Dispatch {
  constructor() { this.seen = new Map(); this.out = []; this.fan = null; this.peek = null; this.flash = 0; }
  // 싸움 사건을 받는다: 원군 장계가 오면 등급에 맞춰 환호
  event(e, view, b) {
    if (e.type === 'spin') { this.spin = { grid: e.grid, lines: e.lines, jackpot: e.jackpot, coin: e.coin, t: 0, strip: b ? b.reelSyms().map(q => ({ k: q.k, tier: q.tier, c: q.g ? q.g.c : null })) : [] }; return; }
    if (e.type === 'mail') { if (e.tier === 'epic' || e.tier === 'legend' || e.elite) { this.fan = { tier: e.tier, elite: e.elite, name: e.name || '', t: 0 }; sfx('star'); if (e.tier === 'legend') sfx('win'); } else sfx('card'); }
    else if (e.type === 'reinf' && view) { const big = e.tier === 'epic' || e.tier === 'legend' || e.elite; view.fx.ring(e.x, e.y, big ? 70 : 46, TIER_COL[e.tier], 0.6, big ? 6 : 4); if (big) { view.fx.burst(e.x, e.y - 30, 18, e.tier === 'legend' ? '#f0d264' : '#c9a0ff', 220, 5); view.fx.shake = Math.max(view.fx.shake, 5); } }
  }
  // 지금 결재함에 놓인 투서들 (원군 장계가 먼저, 그다음 전술 투서)
  letters(b) {
    const L = [];
    for (const m of b.mail) L.push({ key: m.id, kind: 'reinf', m });
    for (let n = 0; n < HAND; n++) if (b.hand[n]) L.push({ key: 'h' + b.hand[n].uid, kind: 'tactic', n, c: b.hand[n] });
    return L;
  }
}

// 결재함 전체를 그린다. s = RunScene (aim·toast·deny 를 쓴다)
export function drawTray(s, g, b, i, live, chips) {
  const D = s.disp, T = s.T, dt = s.dt || 0.016;
  panel(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 'tray');
  // 머리: 결재함 이름과 전공 조건
  rr(g, 8, HUD_H + 6, TRAY.w - 16, 38, 8, 'rgba(14,10,16,0.55)', 'rgba(226,184,90,0.6)', 1.2);
  text(g, '결재함', 20, HUD_H + 25, { size: 20, font: FONT_B, fill: C.gilt, align: 'left' });
  if (chips) chips.forEach(([str, ok], k) => text(g, (ok ? '' : '✕ ') + str, TRAY.w - 16, HUD_H + 17 + k * 16, { size: 12.5, fill: ok ? C.cream : '#f39a82', align: 'right', weight: 400 }));
  const L = D.letters(b), now = new Set(L.map(q => q.key));
  // 새로 들어온 투서는 위에서 미끄러져 내려온다
  for (const q of L) if (!D.seen.has(q.key)) { D.seen.set(q.key, { t: 0 }); }
  for (const [k, v] of D.seen) { if (!now.has(k) && !D.out.some(o => o.key === k)) D.seen.delete(k); else v.t += dt; }
  const room = Math.floor((TRAY.h - 56) / (LH + GAP)), shown = L.slice(0, room), more = L.length - shown.length;
  if (!L.length) {
    const waiting = b.coming.length > 0;
    text(g, waiting ? '파발이 달려오는 중…' : '올라온 투서가 없습니다', TRAY.w / 2, TOP + 40, { size: 15, fill: 'rgba(240,226,196,0.75)', weight: 400 });
    if (!waiting && b.drawPile.length === 0 && !b.hand.some(Boolean)) text(g, '전술 패를 다 썼습니다', TRAY.w / 2, TOP + 64, { size: 13, fill: 'rgba(240,226,196,0.5)', weight: 400 });
  }
  shown.forEach((q, k) => {
    const st = D.seen.get(q.key), e = clamp(st.t / 0.32, 0, 1), y = TOP + k * (LH + GAP) - (1 - easeOutBack(e)) * 60;
    g.save(); g.globalAlpha = e; drawLetter(s, g, b, q, LX, y, i, live, st); g.restore();
  });
  if (more > 0) { rr(g, TRAY.w / 2 - 52, BAR_Y - 30, 104, 22, 11, 'rgba(14,10,16,0.7)', C.gilt, 1); text(g, `투서 ${more}장 더`, TRAY.w / 2, BAR_Y - 19, { size: 13.5, fill: C.cream }); }
  // 다음 전술 투서까지: 빈 칸이 있으면 작은 바늘로
  const wait = []; for (let n = 0; n < HAND; n++) if (!b.hand[n] && b.drawPile.length) wait.push(clamp(1 - b.slotT[n] / (REFILL * b.mods.drawRate), 0, 1));
  if (wait.length && L.length < room) { const f = Math.max(...wait), y = TOP + shown.length * (LH + GAP) + 14; g.beginPath(); g.arc(30, y, 9, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.lineWidth = 3; g.strokeStyle = C.gilt; g.stroke(); text(g, '다음 투서', 46, y + 1, { size: 13, fill: 'rgba(240,226,196,0.7)', align: 'left', weight: 400 }); }
  // 결재가 끝나 나가는 투서: 윤허는 전장 쪽(오른쪽)으로, 불허는 아래로 떨어진다
  D.out = D.out.filter(o => (o.t += dt) < 0.55);
  for (const o of D.out) { const k = o.t / 0.55; g.save(); g.globalAlpha = 1 - k; const dx = o.ok ? k * 220 : -k * 30, dy = o.ok ? -k * 20 : k * 140; g.translate(LX + LW / 2 + dx, o.y + LH / 2 + dy); g.rotate(o.ok ? k * 0.15 : -k * 0.5); g.translate(-(LX + LW / 2), -(o.y + LH / 2)); drawLetter(s, g, b, o.q, LX, o.y, null, false, { t: 9, stamped: o.ok ? 'yes' : 'no', st: 1 }); g.restore(); }
  // 귀한 원군이 왔을 때: 결재함에 빛살이 번지고 위쪽에 큰 이름판
  if (D.fan) { const f = D.fan; f.t += dt; if (f.t > 2.6) D.fan = null; else drawFanfare(g, b, f, T); }
}

// 투서 한 장
function drawLetter(s, g, b, q, x, y, i, live, st) {
  const reinf = q.kind === 'reinf', c = reinf ? q.m.e.c : q.c, d = CARDS[c.id], T = s.T;
  const tier = reinf ? q.m.tier : null, col = reinf ? TIER_COL[tier] : (KIND[d.kind] || KIND.attack).col;
  // 귀한 원군 장계는 빛을 두른다
  if (reinf && TIER_GLOW[tier]) { g.save(); g.globalCompositeOperation = 'lighter'; const a = 0.25 + 0.15 * Math.sin(T * 5); for (const r2 of [10, 6, 3]) { rr(g, x - r2, y - r2, LW + r2 * 2, LH + r2 * 2, 10 + r2, `rgba(${TIER_GLOW[tier]},${a / 3})`); } g.restore(); }
  rr(g, x + 2, y + 3, LW, LH, 6, 'rgba(0,0,0,0.35)');
  rr(g, x, y, LW, LH, 6, '#f6ecd2', '#3a2c20', 1.4);
  // 한지 결과 접힌 자국
  g.save(); g.globalAlpha *= 0.12; line(g, [x + LW * 0.5, y + 4, x + LW * 0.5, y + LH - 4], '#7a5a3a', 1); g.restore();
  rr(g, x, y, 7, LH, 3, col);
  if (reinf && q.m.elite) { rr(g, x + 1, y + 1, LW - 2, LH - 2, 5, null, '#d9a41e', 2.4); }
  // 첫 줄: 올린 이 · 값
  const sender = reinf ? `${townOf(q.m.id)} 장계` : (SENDER[d.kind] || '군관 아룀');
  text(g, sender, x + 15, y + 13, { size: 12.5, fill: '#6a5a44', align: 'left', weight: 400 });
  if (reinf) { const tn = TIER[tier].name; rr(g, x + LW - 98, y + 4, 46, 19, 9, col); text(g, q.m.elite ? '정예' : tn, x + LW - 75, y + 13.5, { size: 13, fill: '#fff8e6', font: FONT_B }); }
  else { const cost = b.free > 0 ? 0 : b.costOf(c), ok = b.canPlay(q.n); icon.coin(g, x + LW - 86, y + 13, 8, true); text(g, String(cost), x + LW - 72, y + 14, { size: 15, font: FONT_B, fill: ok ? INK : '#b84a3a', align: 'left' }); }
  // 둘째 줄: 그림과 이름
  if (reinf) { const u = CARDS[c.id].unit; g.save(); g.beginPath(); g.rect(x + 9, y + 22, 44, LH - 26); g.clip(); portrait(g, lookOf(u, c.br), x + 31, y + LH - 4, 0.62, T); g.restore(); }
  else cardIcon(g, c.id, x + 30, y + 46, 0.6);
  const nm = reinf ? cardName(Object.assign({}, c, { lv: (c.lv || 1) + (q.m.elite ? 3 : 0) })) : cardName(c);
  text(g, nm, x + 58, y + 40, { size: 19, font: FONT_B, align: 'left', maxW: LW - 110, fill: reinf && tier !== 'common' ? col : INK });
  // 셋째 줄: 짧은 설명
  const sub = reinf ? `${UNITS[CARDS[c.id].unit].role} · ${UNITS[CARDS[c.id].unit].desc}` : cardText(c, b.power * b.mods.cardPow);
  const dw = LW - 112, [l1, l2] = wrap2(g, sub, dw, 12), aimedNow = !reinf && s.aim && s.aim.slot === q.n;
  if (!aimedNow) { text(g, l1, x + 58, y + 63, { size: 12, fill: '#5a4a3a', align: 'left', weight: 400 }); if (l2) text(g, l2, x + 58, y + 79, { size: 12, fill: '#5a4a3a', align: 'left', weight: 400 }); }
  // 도장 둘: 윤허 · 불허
  const sx = x + LW - 44, sy = y + 6, can = reinf ? b.squadCount() < b.fieldCap() : b.canPlay(q.n);
  const aimed = !reinf && s.aim && s.aim.slot === q.n;
  const yes = stampBtn(g, 'ys' + q.key, sx, sy, '윤허', can ? RED : '#9a8a7a', i, live, aimed ? 0.5 + 0.5 * Math.sin(T * 9) : 0);
  const no = stampBtn(g, 'no' + q.key, sx, sy + 42, '불허', '#2a3354', i, live, 0);
  if (st.stamped) { g.save(); g.translate(x + LW / 2 + 10, y + LH / 2); g.rotate(-0.18); const yesS = st.stamped === 'yes'; rr(g, -44, -20, 88, 40, 6, null, yesS ? RED : '#2a3354', 4); text(g, yesS ? '윤허' : '불허', 0, 1, { size: 26, font: FONT_B, fill: yesS ? RED : '#2a3354' }); g.restore(); }
  if (aimed) { rr(g, x + 56, y + 58, 124, 30, 8, 'rgba(184,50,42,0.12)'); text(g, '전장에서 쓸 자리를', x + 118, y + 66, { size: 12, fill: RED }); text(g, '누르세요', x + 118, y + 81, { size: 12, fill: RED }); }
  if (!i) return;
  // 투서를 누르면 위쪽에 자세한 내용
  if (live && tapped('lt' + q.key, x, y, LW - 92, LH)) { s.disp.peek = { q, t: 4 }; sfx('click'); }
  if (yes) act(s, b, q, true, y); else if (no) act(s, b, q, false, y);
}
function stampBtn(g, id, x, y, ch, col, i, live, glow) {
  const hov = i && inRect(i, x - 2, y - 2, 42, 42), on = live && tapped(id, x - 2, y - 2, 42, 42);
  if (glow > 0) { rr(g, x - 4, y - 4, 44, 44, 8, `rgba(255,200,90,${0.5 * glow})`); }
  g.save(); g.translate(x + 19, y + 19); if (hov) g.scale(1.06, 1.06); g.rotate(-0.06);
  rr(g, -18, -18, 36, 36, 5, col, 'rgba(20,10,10,0.6)', 1.4); rr(g, -15, -15, 30, 30, 3, null, 'rgba(255,240,220,0.55)', 1);
  text(g, ch[0], 0, -7, { size: 14, font: FONT_B, fill: '#fff6e6' }); text(g, ch[1], 0, 8, { size: 14, font: FONT_B, fill: '#fff6e6' });
  g.restore(); return on;
}
// 결재: 윤허면 쓰거나 세우고, 불허면 물린다
function act(s, b, q, ok, y) {
  const D = s.disp;
  if (q.kind === 'reinf') {
    if (ok) { if (b.approve(q.m.id)) { D.out.push({ key: q.key, q, ok: true, y, t: 0 }); sfx('place'); s.view.fx.txt(TRAY.w + 90, y + 40, `${cardName(q.m.e.c)} 합류!`, TIER_COL[q.m.tier], 22, 1); } else { sfx('deny'); s.toast(`전장에는 병사가 ${b.fieldCap()}명까지 설 수 있습니다`, 2); } }
    else { b.decline(q.m.id); D.out.push({ key: q.key, q, ok: false, y, t: 0 }); sfx('click'); }
    return;
  }
  const n = q.n, c = q.c, d = CARDS[c.id];
  if (!ok) { if (s.aim && s.aim.slot === n) s.aim = null; if (b.shelve(n)) { D.out.push({ key: q.key, q, ok: false, y, t: 0 }); sfx('click'); } else { sfx('deny'); s.toast('부정한 투서를 물리려면 사기 1이 듭니다', 2); } return; }
  if (!b.canPlay(n)) { s.deny(n); return; }
  if (s.aim && s.aim.slot === n) { s.aim = null; return; }
  if (d.target) { s.aim = { slot: n, card: c, drag: false, armed: true, live: false }; s.order = null; sfx('click'); return; }
  if (b.play(n, 640, 340)) { D.out.push({ key: q.key, q, ok: true, y, t: 0 }); sfx('card'); }
}
// 귀한 원군: 큰 이름판과 빛살
function drawFanfare(g, b, f, T) {
  const k = clamp(f.t / 0.25, 0, 1) * clamp((2.6 - f.t) / 0.5, 0, 1), legend = f.tier === 'legend', rgb = legend ? '255,206,110' : f.tier === 'epic' ? '190,130,255' : '255,220,140';
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(TRAY.w / 2, TOP + 46); g.rotate(T * 0.6);
  for (let r = 0; r < 12; r++) { g.rotate(TAU / 12); g.fillStyle = `rgba(${rgb},${0.16 * k})`; g.beginPath(); g.moveTo(0, 0); g.lineTo(-14, -260); g.lineTo(14, -260); g.closePath(); g.fill(); }
  g.restore();
  const sc = 0.8 + 0.2 * easeOutBack(clamp(f.t / 0.35, 0, 1)), label = f.elite && f.tier !== 'legend' && f.tier !== 'epic' ? '정예 원군!' : legend ? '전설의 원군!' : '희귀한 원군!';
  g.save(); g.globalAlpha = k; g.translate(TRAY.w + (W - TRAY.w) / 2, 150); g.scale(sc, sc);
  rr(g, -220, -44, 440, 88, 12, 'rgba(14,8,10,0.82)', `rgb(${rgb})`, 2.4);
  text(g, label, 0, -10, { size: 36, font: FONT_B, fill: `rgb(${rgb})`, stroke: 'rgba(0,0,0,0.6)', lw: 5 });
  if (f.name) text(g, f.name + (f.elite ? ' · 정예' : ''), 0, 26, { size: 20, font: FONT_B, fill: '#fff4dc', maxW: 400 });
  g.restore();
  for (let k2 = 0; k2 < 10; k2++) { const a = k2 / 10 * TAU + f.t * 2, r = 30 + f.t * 120; g.globalAlpha = k * (1 - f.t / 2.6); ell(g, TRAY.w / 2 + Math.cos(a) * r, TOP + 46 + Math.sin(a) * r * 0.7, 3, 3, `rgb(${rgb})`); }
  g.globalAlpha = 1;
}

// ───── 아래 띠 가운데: 원군 슬롯 (3×3) ─────
const SYM_BG = { common: '#e9dcbc', rare: '#d6e4ef', epic: '#e6d8f0', legend: '#f6e2a8' };
// 칸 하나에 그림 하나: 병사(등급 바탕) · 군기(만능) · 엽전(사기)
function drawSym(g, q, x, y, w, h, T, lit) {
  if (!q) return;
  const bg = q.k === 'u' ? SYM_BG[q.tier] : q.k === 'wild' ? '#f3d0c4' : '#f3e7c0';
  rr(g, x, y, w, h, 5, bg, lit ? '#e2b85a' : 'rgba(40,28,20,0.6)', lit ? 2.4 : 1);
  g.save(); g.beginPath(); g.rect(x + 1, y + 1, w - 2, h - 2); g.clip();
  if (q.k === 'u') { const u = CARDS[q.c.id].unit; portrait(g, lookOf(u, q.c.br), x + w / 2, y + h + 14, 0.62, 0); if (q.tier !== 'common') rr(g, x + 2, y + 2, 6, 6, 3, TIER_COL[q.tier]); }
  else if (q.k === 'wild') { line(g, [x + w / 2 - 8, y + h - 4, x + w / 2 - 8, y + 5], '#5a3a22', 2.4); poly(g, [x + w / 2 - 7, y + 6, x + w / 2 + 13, y + 9, x + w / 2 + 8, y + 15, x + w / 2 + 14, y + 21, x + w / 2 - 7, y + 20], RED, INK, 1.2); text(g, '군기', x + w / 2 + 2, y + h - 7, { size: 10.5, font: FONT_B, fill: '#6a1f1a' }); }
  else { icon.coin(g, x + w / 2, y + h / 2 - 2, 10, true); text(g, '사기', x + w / 2, y + h - 6, { size: 10.5, font: FONT_B, fill: '#6a4a1a' }); }
  g.restore();
}
export function drawRoster(s, g, b, i, x, y, w, h, live) {
  const T = s.T, D = s.disp, dt = s.dt || 0.016;
  rr(g, x, y, w, h, 10, 'rgba(10,14,28,0.45)', 'rgba(154,166,196,0.35)', 1.2);
  text(g, '원군 슬롯', x + 12, y + 13, { size: 15, font: FONT_B, fill: C.gilt, align: 'left' });
  text(g, '가운데 칸 → 그 병사 · 맞은 줄마다 한 명 더 · 가운데 줄 정예 · 세 줄 대박', x + 86, y + 13.5, { size: 12, fill: 'rgba(240,226,196,0.7)', align: 'left', weight: 400 });
  // 기계: 단청 틀 안에 3×3 칸
  const CW = 50, CH = 34, GP = 4, mx = x + 14, my = y + 26, gw = CW * 3 + GP * 2, gh = CH * 3 + GP * 2;
  rr(g, mx - 7, my - 5, gw + 14, gh + 10, 8, '#3a1e16', '#e2b85a', 1.6); rr(g, mx - 3, my - 2, gw + 6, gh + 4, 5, '#1a1014');
  const syms = b.reelSyms().map(q => ({ k: q.k, tier: q.tier, c: q.g ? q.g.c : null })), sp = D.spin;
  if (sp) sp.t += dt;
  const fallback = (r, c) => syms.length ? syms[(r * 3 + c * 5 + 1) % syms.length] : null;
  const view = sp ? sp.grid : (b.lastSpin ? b.lastSpin.grid : null);
  for (let c = 0; c < 3; c++) {
    const stop = sp ? 0.5 + c * 0.32 : -1, rolling = sp && sp.t < stop, cx = mx + c * (CW + GP);
    if (sp && !rolling && !sp['s' + c]) { sp['s' + c] = true; sfx('click'); }
    g.save(); g.beginPath(); g.rect(cx, my, CW, gh); g.clip();
    if (rolling) { const pool = sp.strip.length ? sp.strip : syms, off = sp.t * 16 + c * 3.3, base = Math.floor(off), fr = off - base;
      for (let r = -1; r < 3; r++) { const q = pool[(base + r + c * 7 + pool.length * 4) % pool.length]; g.globalAlpha = 0.85; drawSym(g, q, cx, my + (r + fr) * (CH + GP), CW, CH, T); } g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(cx, my, CW, gh); }
    else for (let r = 0; r < 3; r++) { const q = view ? view[r][c] : fallback(r, c), bounce = sp && sp.t - stop < 0.15 ? Math.sin((sp.t - stop) / 0.15 * Math.PI) * 3 : 0; drawSym(g, q, cx, my + r * (CH + GP) + bounce, CW, CH, T, r === 1 && c === 1); }
    g.restore();
  }
  // 가운데 줄 표시
  poly(g, [mx - 12, my + CH * 1.5 + GP - 5, mx - 5, my + CH * 1.5 + GP, mx - 12, my + CH * 1.5 + GP + 5], C.gilt);
  poly(g, [mx + gw + 12, my + CH * 1.5 + GP - 5, mx + gw + 5, my + CH * 1.5 + GP, mx + gw + 12, my + CH * 1.5 + GP + 5], C.gilt);
  // 다 멈추면: 맞은 줄에 금빛 선, 대박이면 큰 글씨
  if (sp && sp.t >= 1.2) {
    if (!sp.said) { sp.said = true; if (sp.jackpot) { sfx('win'); D.fan = { tier: 'legend', jackpot: true, name: '세 줄이 맞았다', t: 0 }; } else if (sp.lines.length) sfx('star'); if (sp.coin) s.view.fx.txt(mx + gw / 2 + TRAY.w * 0, y - 20, `사기 +${sp.coin}`, C.gilt, 22, 1); }
    const k = clamp(1 - (sp.t - 3.2) / 0.6, 0, 1), pulse = 0.6 + 0.4 * Math.sin(T * 10);
    if (k > 0) for (const li of sp.lines) { const L = [[[0, 0], [0, 1], [0, 2]], [[1, 0], [1, 1], [1, 2]], [[2, 0], [2, 1], [2, 2]], [[0, 0], [1, 1], [2, 2]], [[2, 0], [1, 1], [0, 2]]][li], pts = []; for (const [r, c] of L) pts.push(mx + c * (CW + GP) + CW / 2, my + r * (CH + GP) + CH / 2); g.save(); g.globalAlpha = k * pulse; line(g, pts, 'rgba(40,20,0,0.6)', 7); line(g, pts, '#ffd76a', 3.6); g.restore(); }
    if (sp.jackpot && k > 0) { g.save(); g.globalAlpha = k; text(g, '대박!', mx + gw / 2, my + gh / 2, { size: 34, font: FONT_B, fill: '#ffd76a', stroke: '#3a1e16', lw: 6 }); g.restore(); }
    if (sp.t > 3.8) D.spin = null;
  }
  // 릴의 그림들: 병종마다 몇 칸인지, 이번 싸움에 몇 명 더 올 수 있는지
  const RANK = ['legend', 'epic', 'rare', 'common'], grp = new Map();
  for (const e of b.roster) { const k = e.c.id + '|' + (e.c.br || ''); const q = grp.get(k) || { c: e.c, left: 0, n: 0 }; q.left += e.left; q.n++; if ((e.c.lv || 1) > (q.c.lv || 1)) q.c = e.c; grp.set(k, q); }
  const list = [...grp.values()].sort((p, q) => RANK.indexOf(tierOf(p.c)) - RANK.indexOf(tierOf(q.c)) || q.left - p.left);
  const bw = 150, ax = mx + gw + 22, room = x + w - bw - 14 - ax, cwMin = 40, fit = Math.max(1, Math.floor(room / cwMin)), shown = list.slice(0, list.length > fit ? fit - 1 : fit), cw = Math.min(50, room / Math.max(1, shown.length + (list.length > shown.length ? 1 : 0))), cy = y + 26, ch = h - 48;
  shown.forEach((e, k) => {
    const cx = ax + k * cw, tier = tierOf(e.c), col = TIER_COL[tier], left = e.left;
    rr(g, cx, cy, cw - 4, ch, 6, left ? '#efe3c4' : 'rgba(239,227,196,0.3)', col, tier === 'common' ? 1.2 : 2.6); rr(g, cx, cy, cw - 4, 6, 3, col);
    g.save(); g.beginPath(); g.rect(cx + 1, cy + 6, cw - 6, ch - 7); g.clip(); g.globalAlpha = left ? 1 : 0.3; const u = CARDS[e.c.id].unit; portrait(g, lookOf(u, e.c.br), cx + (cw - 4) / 2, cy + ch - 4, 0.72, 0); g.restore();
    rr(g, cx + cw - 27, cy + 9, 23, 17, 6, left ? col : '#6a6470'); text(g, '×' + left, cx + cw - 15.5, cy + 17.5, { size: 12, fill: '#fff8e6' });
    text(g, `${left ? SYM_N_UI[tier] : 0}칸`, cx + (cw - 4) / 2, cy + ch + 9, { size: 11.5, fill: left ? 'rgba(240,226,196,0.85)' : 'rgba(240,226,196,0.4)' });
    if (live && tapped('ro' + k, cx, cy, cw - 4, ch)) s.toast(`${cardName(e.c)} · ${TIER[tier].name} · 릴에 ${left ? SYM_N_UI[tier] : 0}칸 · 이번 싸움에 ${left}명 더 올 수 있다`, 2.8);
  });
  if (list.length > shown.length) { const cx = ax + shown.length * cw, rest = list.slice(shown.length).reduce((a, q) => a + q.left, 0); rr(g, cx, cy, cw - 4, ch, 6, 'rgba(239,227,196,0.25)', 'rgba(154,166,196,0.5)', 1.2); text(g, `+${list.length - shown.length}`, cx + (cw - 4) / 2, cy + ch / 2 - 8, { size: 16, font: FONT_B, fill: C.cream }); text(g, `×${rest}`, cx + (cw - 4) / 2, cy + ch / 2 + 14, { size: 12, fill: C.cream }); }
  // 손잡이: 슬롯을 돌린다
  const bx = x + w - bw - 8, by = y + 22, bh = h - 30, why = b.whyNotReq(), spinning = !!(sp && sp.t < 1.2), ok = why === '' && !spinning, cost = b.reqCost(), hov = live && i && inRect(i, bx, by, bw, bh);
  rr(g, bx + 2, by + 4, bw, bh, 10, 'rgba(0,0,0,0.35)');
  rr(g, bx, by, bw, bh, 10, ok ? (hov ? '#c44a3a' : '#a8322a') : '#4a4654', '#1a1010', 1.6); rr(g, bx + 4, by + 4, bw - 8, bh - 8, 7, null, ok ? 'rgba(255,220,150,0.6)' : 'rgba(200,200,210,0.3)', 1.2);
  // 손잡이 막대와 구슬 (돌리면 내려갔다 올라온다)
  const pull = sp ? clamp(1 - Math.abs(sp.t - 0.15) / 0.3, 0, 1) : 0, kx = bx + bw - 18, ky = by + 16 + pull * 40;
  line(g, [kx, by + 12, kx, by + bh - 12], 'rgba(0,0,0,0.35)', 4); line(g, [kx, ky, kx, by + bh - 12], '#c9a24a', 3); ell(g, kx, ky, 8, 8, RED, INK, 1.4);
  text(g, '슬롯을 돌린다', bx + (bw - 26) / 2, by + 32, { size: 19, font: FONT_B, fill: '#fff4dc' });
  const sub = spinning ? '돌아가는 중…' : why === 'empty' ? '명부가 비었다' : why === 'cap' ? `전장 가득 (${b.fieldCap()}명)` : cost === 0 ? '사기 없이' : `사기 ${cost}`;
  text(g, sub, bx + (bw - 26) / 2, by + 60, { size: 15, fill: ok ? '#ffe2a0' : '#c8c0d0' });
  if ((b.spinN || 0) % 3 === 2 && cost > 0 && !spinning) text(g, '다음부터 +1', bx + (bw - 26) / 2, by + 82, { size: 11.5, fill: 'rgba(255,226,160,0.7)' });
  if (live && tapped('request', bx, by, bw, bh)) { if (spinning) return; if (b.spin()) sfx('horn'); else { sfx('deny'); s.toast(why === 'empty' ? '이번 싸움에 보낼 병사가 명부에 남지 않았습니다' : why === 'cap' ? `전장에는 병사가 ${b.fieldCap()}명까지 설 수 있습니다` : `사기가 ${cost} 있어야 슬롯을 돌립니다`, 2.2); } }
}
// 투서를 눌렀을 때 위쪽에 자세히
export function drawPeek(s, g, b) {
  const p = s.disp.peek; if (!p || s.aim) return; p.t -= s.dt || 0.016; if (p.t <= 0) { s.disp.peek = null; return; }
  const q = p.q, reinf = q.kind === 'reinf', c = reinf ? q.m.e.c : q.c; if (!reinf && b.hand[q.n] !== c) { s.disp.peek = null; return; } if (reinf && !b.mail.includes(q.m)) { s.disp.peek = null; return; }
  const u = reinf ? UNITS[CARDS[c.id].unit] : null, a = clamp(p.t / 0.3, 0, 1);
  g.save(); g.globalAlpha = a * 0.96; rr(g, TRAY.w + 20, 72, 760, 56, 10, PAPER, INK, 2.2); g.globalAlpha = a;
  text(g, cardName(c), TRAY.w + 38, 100, { size: 22, font: FONT_B, align: 'left', maxW: 180 });
  text(g, reinf ? `${TIER[q.m.tier].name}${q.m.elite ? ' · 정예' : ''} · ${u.tip}` : cardText(c, b.power * b.mods.cardPow), TRAY.w + 228, 100, { size: 15, align: 'left', weight: 400, maxW: 540 });
  g.restore();
}
