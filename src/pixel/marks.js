// 도트 인형의 상태 표시와 띠: 발밑 테·머리 위 표식·체력·기력·두목의 끊기 칸, 표시 원과 지형의 해, 진형 줄·명령, 날아가는 것들
import { text, FONT_B, RED, INK, INDIGO } from '../render/draw.js';
import { HERO_SKILLS } from '../data/units.js';
import { VIEW } from '../config.js';
import { CALL_R } from '../data/bossalt.js';
import { LX, rect, blit, line, polyline, ring, disc, fillEll, barPx, plaque, telePx, toInt, glowPx, arrow, starSpr, plusSpr, flameSpr, ballSpr, numSpr, ICOL, CREAM } from './fx.js';
import { mixc, Spr } from './px.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// 발밑: 막기(푸른 테) · 표적(붉은 테와 네 눈금) · 느려짐(옅은 물빛) · 뿌리(풀빛 고리)
export function pxUnder(g, u, T, alpha) {
  g.save(); g.imageSmoothingEnabled = false;
  const rx = Math.max(5, Math.round(u.r * 1.3 / 2)), ry = Math.max(3, Math.round(u.r * 0.62 / 2));
  if (u.slow > 0) { g.globalAlpha = alpha * 0.55; blit(g, disc(rx - 1, ry, 0x8fd3e8, 'check'), LX(u.x), LX(u.y + 1)); g.globalAlpha = alpha; ring(g, u.x, u.y + 1, rx - 1, ry, '#4f8fb8'); }
  if (u.guard > 0) { ring(g, u.x, u.y, rx + 1, ry + 1, ICOL); ring(g, u.x, u.y, rx, ry, '#8fb6e6'); }
  if (u.mark > 0) { const mr = Math.round(u.r * 1.2 / 2), X = LX(u.x), Y = LX(u.y + 1), my = Math.round(mr * 0.46); ring(g, u.x, u.y + 1, mr, my, RED); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) line(g, X + dx * Math.round(mr * 0.7), Y + dy * Math.round(my * 0.7), X + dx * Math.round(mr * 1.25), Y + dy * Math.round(my * 1.25), RED, 1); }
  if (u.root > 0) for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + u.id, X = LX(u.x + Math.cos(a) * u.r * 0.8), Y = LX(u.y - 2 + Math.sin(a) * u.r * 0.35); for (const [dx, dy] of [[-2, 0], [-2, -1], [-1, -2], [0, -2], [1, -2], [2, -1], [2, 0]]) { rect(g, X + dx, Y + dy - 1, 1, 1, ICOL); rect(g, X + dx, Y + dy, 1, 1, '#5f9a4a'); } }
  g.restore();
}
// 머리 위와 몸 둘레: 두목 싸움의 표시, 상태, 체력·기력 띠
export function pxOver(g, u, o) {
  const { x, by, top, T, alpha, ST, L, dir } = o, X = LX(x), TOP = LX(top);
  g.save(); g.imageSmoothingEnabled = false;
  if (u.open > 0) { g.globalAlpha = alpha * (0.55 + 0.45 * Math.sin(T * 11)); const rx = Math.round(u.r * 1.7 / 2), ry = Math.round(u.r * 0.8 / 2); ring(g, u.x, u.y, rx + 1, ry + 1, ICOL); ring(g, u.x, u.y, rx, ry, '#f0d264'); ring(g, u.x, u.y, rx - 1, ry - 1, '#f0d264'); g.globalAlpha = alpha; }
  if (u.charm > 0) for (let i = 0; i < 2; i++) { const r = 3 + i * 2; ring(g, x, top - 10, r + 1, r + 1, ICOL, { sweep: 3.6, a0: T * 7 + i * 2 }); ring(g, x, top - 10, r, r, '#e07ac0', { sweep: 3.6, a0: T * 7 + i * 2 }); }
  if (u.plague > 0) for (let i = 0; i < 3; i++) { const q = (T * 0.9 + i / 3 + u.id * 0.37) % 1; g.globalAlpha = alpha * (1 - q) * 0.95; blit(g, ballSpr(q < 0.5 ? 2 : 1, 0x8ac04a, 0xd8f0a0), LX(x + Math.sin(q * 6 + i * 2) * 7), LX(by - 8 - q * (by - top))); g.globalAlpha = alpha; }
  if (u.ai) {
    const a = u.ai, gg = a.g;
    if (gg) { const w = 96, bx = X - (w >> 1), yy = LX(Math.max(top - 44, VIEW.y0 + 58)); plaque(g, bx - 5, yy - 17, w + 10, 43, toInt(RED)); text(g, gg.label, x, yy * 2 - 16, { size: 20, font: FONT_B, fill: RED }); barPx(g, bx * 2, yy * 2, w * 2, gg.acc / gg.need, '#d9a41e', { h: 7, back: 0xe3d8bd }); barPx(g, (bx + 15) * 2, (yy + 11) * 2, (w - 15) * 2, gg.t / gg.t0, RED, { h: 1, back: 0xe3d8bd }); text(g, '시간', (bx + 6) * 2, yy * 2 + 24, { size: 11, font: FONT_B, fill: RED }); text(g, gg.hint || '두목을 몰아쳐 금빛을 채운다', x, yy * 2 + 40, { size: 15, font: FONT_B, fill: '#4a4034' }); }
    if (a.grab && !a.grab.dead) { const t2 = a.grab, x0 = LX(u.x - dir * 18), y0 = LX(u.y - 34), x1 = LX(t2.x), y1 = LX(t2.y - 22); line(g, x0, y0, x1, y1, ICOL, 4); line(g, x0, y0, x1, y1, '#e9dfc4', 2); for (let i = 1; i < 6; i++) { const f = i / 6; rect(g, Math.round(x0 + (x1 - x0) * f), Math.round(y0 + (y1 - y0) * f), 1, 1, '#a08a5a'); } }
    if (a.coil) for (const e of a.coil.units) if (!e.dead) for (const dy of [-6, -16]) { const rx = Math.round(e.r * 1.25 / 2), ry = Math.round(e.r * 0.5 / 2); ring(g, e.x, e.y + dy, rx + 1, ry + 1, ICOL); ring(g, e.x, e.y + dy, rx, ry, '#7d6a3a'); }
    if (a.callSq && a.callSq.alive > 0) { g.globalAlpha = alpha * (0.6 + 0.25 * Math.sin(T * 6)); const r = LX(CALL_R); ring(g, u.x, u.y, r + 1, r + 1, ICOL, { dash: [8, 6], off: -T * 14 }); ring(g, u.x, u.y, r, r, '#d9ccff', { dash: [8, 6], off: -T * 14 }); g.globalAlpha = alpha; }
    if (a.mirror && !a.mirror.dead) { g.globalAlpha = alpha * (0.4 + 0.3 * Math.sin(T * 9)); line(g, LX(a.mirror.x), LX(a.mirror.y - 54), LX(u.x), LX(u.y - 40), '#fff3c0', 3); g.globalAlpha = alpha; }
  }
  if (u.barrier > 0) { const h = by - top; g.globalAlpha = alpha * 0.45; blit(g, disc(Math.round(u.r * 1.55 / 2), Math.round(h * 0.62 / 2), 0xa0cdeb, 'check'), X, LX(by - h * 0.45)); g.globalAlpha = alpha * 0.9; ring(g, x, by - h * 0.45, Math.round(u.r * 1.55 / 2), Math.round(h * 0.62 / 2), '#5f8fb8'); g.globalAlpha = alpha; }
  if (u.stun > 0) for (let i = 0; i < 3; i++) { const a = T * 6 + i / 3 * TAU; blit(g, starSpr(0xf0d264), LX(x + Math.cos(a) * 11), LX(top - 2 + Math.sin(a) * 4)); }
  if (u.haste > 0 && u.moving) { const c = Math.cos(u.facing), s = Math.sin(u.facing); for (let i = -1; i <= 1; i++) line(g, LX(u.x - c * (u.r + 6) + i * 5 * -s), LX(u.y - 12 - s * (u.r + 6) + i * 5 * c), LX(u.x - c * (u.r + 16) + i * 5 * -s), LX(u.y - 12 - s * (u.r + 16) + i * 5 * c), RED, 1); }
  if (u.weaken > 0) { const Y = TOP - 5; for (let i = 0; i < 3; i++) rect(g, X - 2 + i, Y + i, 5 - i * 2, 1, i ? '#6a4a9a' : '#8a6aba'); rect(g, X - 3, Y - 1, 7, 1, ICOL); }
  if (u.dmgUp > 0) { const Y = TOP - 2 + (Math.sin(T * 8 + u.id) > 0 ? -1 : 0), X2 = X + 6; rect(g, X2 - 1, Y - 4, 3, 1, RED); rect(g, X2 - 2, Y - 3, 5, 1, RED); rect(g, X2, Y - 2, 1, 4, RED); rect(g, X2 - 3, Y - 3, 1, 1, ICOL); rect(g, X2 + 3, Y - 3, 1, 1, ICOL); }
  if (u.burn > 0) blit(g, flameSpr(Math.floor(T * 10 + u.id) % 2), X - 5, TOP + 6);
  if (u.regen > 0 && Math.sin(T * 6 + u.id) > 0) blit(g, plusSpr(0x5fae6a), X - 7, TOP - 3);
  if (u.fuse > 0 && Math.sin(T * 50) > 0) { g.globalAlpha = 0.6; blit(g, disc(Math.round(u.r), Math.round(u.r), 0xffffff, 'check'), X, LX(by - 20)); g.globalAlpha = alpha; }
  // 체력 띠: 방금 맞았거나 많이 다친 인형에만
  const since = ST - (u.hitT === undefined ? -99 : u.hitT), hpk = u.hp / u.maxHp, showHp = u.hp > 0 && hpk < 0.995 && !(u.def && u.def.boss) && (since < 2.2 || hpk < 0.35 || (L.hero && hpk < 0.9));
  if (showHp) { const bw = Math.max(18, u.r * 1.9), fa = hpk < 0.35 || L.hero ? 1 : clamp((2.2 - since) / 0.6, 0, 1); g.globalAlpha = alpha * fa; barPx(g, x - bw / 2, top - 8, bw, hpk, u.team === 0 ? '#3c6cd0' : '#d8402c', { h: 1 }); g.globalAlpha = alpha; }
  if (L.hero && u.team === 0 && u.gauge !== undefined && alpha >= 1) {
    const gz = clamp(u.gauge, 0, 1), bw = 52, gy = top - (showHp ? 18 : 12) + (Math.sin(T * 3) > 0 ? 0 : 2), ready = gz > 0.9;
    barPx(g, x - bw / 2, gy, bw, gz, ready && Math.sin(T * 12) > 0 ? '#fff3b0' : '#e2b33a', { h: 2, back: 0x2a2036 });
    if (gz > 0.8 && u.def && HERO_SKILLS[u.type]) { const sk = HERO_SKILLS[u.type][u.skillI || 0]; if (sk) text(g, sk.name, x, gy - 11, { size: 15, font: FONT_B, fill: ready ? '#fff3b0' : '#f3ead2', stroke: 'rgba(20,16,24,0.9)', lw: 4 }); }
  }
  g.restore();
}

// ── 표시 원과 땅의 해 ──
const TELE_DEF = RED;
export function pxZone(g, z, T, TELE) {
  g.save(); g.imageSmoothingEnabled = false;
  if (z.kind === 'tele') telePx(g, z, z.ally ? INDIGO : TELE[z.style] || TELE_DEF, T);
  else if (z.kind === 'mark') { blit(g, numSpr('!', toInt(RED), CREAM, 2), LX(z.x), LX(z.y - 32) + (Math.sin(T * 18) > 0 ? -1 : 0)); const r = LX(z.r * (1.6 - z.t / z.delay * 0.6)); ring(g, z.x, z.y, r + 1, r + 1, ICOL); ring(g, z.x, z.y, r, r, RED); }
  else if (z.kind === 'spawn') { const k = clamp(z.t / z.delay, 0, 1), sap = z.utype === 'sapling'; g.globalAlpha = 0.5 + k * 0.35; fillEll(g, z.x, z.y, 16 + k * 4, 9 + k * 2, sap ? '#4f8a4a' : '#3d3560'); ring(g, z.x, z.y, LX(16 + k * 4), LX(9 + k * 2), ICOL); g.globalAlpha = 1; if (z.fx !== undefined) { g.globalAlpha = 0.6 * (1 - k); line(g, LX(z.fx), LX(z.fy - 30), LX(z.x), LX(z.y), '#5a4a8a', 2); g.globalAlpha = 1; } }
  else if (z.kind === 'rain') { const col = z.fire ? 0xd9702a : toInt(INDIGO), r = LX(z.r); g.globalAlpha = 0.4; blit(g, disc(r, r, col, 'dot'), LX(z.x), LX(z.y)); g.globalAlpha = 0.9; ring(g, z.x, z.y, r, r, col, { dash: [5, 4], off: T * 16 }); g.globalAlpha = 1; }
  else if (z.kind === 'hazard') {
    const a = Math.min(1, z.t * 3, (z.dur - z.t) * 1.5), fire = z.style === 'fire', col = fire ? 0xd9702a : 0x6a5e52, r = LX(z.r), ry = Math.round(r * 0.8);
    g.globalAlpha = (fire ? 0.5 + 0.12 * Math.sin(T * 9 + z.x) : 0.5) * a; blit(g, disc(r, ry, col, 'dot'), LX(z.x), LX(z.y)); g.globalAlpha = 0.85 * a; ring(g, z.x, z.y, r, ry, col, { dash: [3, 4] });
    const n = Math.max(4, Math.round(z.r / 7));
    for (let i = 0; i < n; i++) { const an = i * 2.39 + z.x * 0.1, rr2 = z.r * (0.2 + ((i * 37) % 60) / 100), X = LX(z.x + Math.cos(an) * rr2), Y = LX(z.y + Math.sin(an) * rr2 * 0.78); g.globalAlpha = 0.95 * a;
      if (fire) blit(g, flameSpr(Math.floor(T * 9 + i) % 2), X, Y); else blit(g, rockSpr(i % 3), X, Y); }
    g.globalAlpha = 1;
  } else if (z.kind === 'caltrop') {
    const a = Math.min(1, z.t * 4, (z.dur - z.t) * 2), r = LX(z.r), ice = !!z.ice;
    g.globalAlpha = (ice ? 0.5 : 0.32) * a; blit(g, disc(r, r, ice ? 0xbfe3ee : 0x4a4a55, 'dot'), LX(z.x), LX(z.y)); g.globalAlpha = 0.85 * a; ring(g, z.x, z.y, r, r, ice ? '#4f8fb8' : '#4a4a55', { dash: [3, 4], off: ice ? T * 8 : 0 });
    g.globalAlpha = 0.95 * a; const n = ice ? 9 : 16; for (let i = 0; i < n; i++) { const an = i * (ice ? 2.1 : 2.4) + z.x + (ice ? T * 0.3 : 0), r2 = z.r * (0.2 + ((i * (ice ? 41 : 37)) % 70) / 100), X = LX(z.x + Math.cos(an) * r2), Y = LX(z.y + Math.sin(an) * r2 * 0.9);
      if (ice) { rect(g, X - 2, Y, 5, 1, '#eef8fc'); rect(g, X, Y - 2, 1, 5, '#eef8fc'); rect(g, X, Y, 1, 1, '#ffffff'); } else { rect(g, X - 1, Y, 3, 1, ICOL); rect(g, X, Y - 2, 1, 3, ICOL); rect(g, X, Y - 2, 1, 1, '#e4e8ea'); rect(g, X - 1, Y, 1, 1, '#c9cdd2'); rect(g, X + 1, Y, 1, 1, '#c9cdd2'); } }
    g.globalAlpha = 1;
  } else if (z.kind === 'grail') {
    const a = z.t > z.dur - 0.5 ? (z.dur - z.t) * 2 : 1, r = LX(z.r); g.globalAlpha = 0.5 * a; blit(g, disc(r, r, 0xf0d264, 'dot'), LX(z.x), LX(z.y)); g.globalAlpha = 0.95 * a; ring(g, z.x, z.y, r, r, '#b8862a');
    const q = Math.round(r * (0.3 + (T * 0.6) % 0.7)); g.globalAlpha = 0.55 * a; ring(g, z.x, z.y, q, q, '#b8862a'); g.globalAlpha = 1;
  }
  g.restore();
}
const ROCK = [];
function rockSpr(i) { if (!ROCK[i]) { const w = 4 + i, s = new Spr(w + 1, 4, w >> 1, 3); s.rect(0, 1, w, 3, i % 2 ? 0x9a8e80 : 0x7f7466); s.rect(1, 0, w - 2, 1, 0xb4a898); s.set(1, 1, 0xc8bcac); ROCK[i] = s.outline(ICOL); } return ROCK[i]; }

// 병력 패를 끌 때: 세울 수 있는 곳 (옅은 점 무늬와 흐르는 점선)
export function pxDeploy(g, d, T) {
  const col = d.ok ? INDIGO : RED, X0 = LX(VIEW.x0 - 6), Y0 = LX(VIEW.y0 - 26), X1 = LX(d.maxX + 34), Y1 = LX(VIEW.y1 + 14);
  g.save(); g.globalAlpha = 0.12; rect(g, X0, Y0, X1 - X0, Y1 - Y0, col); g.globalAlpha = 0.85; const off = Math.floor(T * 15) % 10;
  for (let y = Y0 - 10 + off; y < Y1; y += 10) rect(g, X1, Math.max(Y0, y), 2, Math.max(0, Math.min(6, Y1 - Math.max(Y0, y))), col);
  g.restore();
}
// 진형: 부대들을 잇는 금빛 줄과 발밑 금빛 테
export function pxForm(g, pts, closed, hq, flash, pul) {
  g.save(); g.imageSmoothingEnabled = false; const P = pts.flatMap(([x, y]) => [x, y + 18]); if (closed && pts.length > 2) P.push(P[0], P[1]);
  g.globalAlpha = (0.25 + flash * 0.35) * pul; polyline(g, P, '#ffe6a0', 3 + Math.round(flash * 4));
  g.globalAlpha = 0.5; polyline(g, P, '#4a3014', 2); g.globalAlpha = 0.7 + flash * 0.3; polyline(g, P, '#f0c860', 1);
  for (const [x, y] of pts) { const rx = LX(40 + flash * 26), ry = LX(12 + flash * 7); g.globalAlpha = 0.25; blit(g, disc(rx, ry, 0xffe6a0, 'check'), LX(x), LX(y + 18)); g.globalAlpha = 0.45; ring(g, x, y + 18, rx + 1, ry + 1, '#4a3014'); g.globalAlpha = 0.6 * pul + 0.2; ring(g, x, y + 18, rx, ry, '#f0c860'); }
  if (hq) { g.globalAlpha = 0.7 * pul; ring(g, hq.cx, hq.cy + 18, 15, 5, '#f3d27c'); }
  g.restore();
}
// 깃발 하나 (명령: 옮겨 가기·버티기)
const FLAG = [];
export function flagPx(g, x, y, big = true) { const i = big ? 1 : 0; if (!FLAG[i]) { const s = new Spr(10, 14, 1, 13); s.vl(1, 0, 13, 0x84522c); s.rect(2, 1, 7, 5, 0xc8402f); s.rect(2, 1, 7, 1, 0xec6a3c); s.rect(4, 3, 3, 1, 0xf0d264); s.set(8, 5, -1); FLAG[i] = s.outline(ICOL); } g.save(); g.imageSmoothingEnabled = false; blit(g, FLAG[i], LX(x), LX(y)); g.restore(); }
export function pxOrders(g, b, T) {
  g.save(); g.imageSmoothingEnabled = false;
  for (const sq of b.squads) {
    if (sq.team !== 0 || sq.alive <= 0) continue; const o = sq.order;
    if (o.kind === 'move') { const dx = o.x - sq.cx, dy = o.y - sq.cy, d = Math.hypot(dx, dy) || 1, n = Math.floor(d / 16), ph = (T * 2) % 1; for (let i = 1; i < n; i++) { const f = (i + ph) / n; g.globalAlpha = 0.45 * Math.sin(Math.PI * f); rect(g, LX(sq.cx + dx * f), LX(sq.cy + dy * f + 8), 2, 1, '#20181c'); } g.globalAlpha = 1; flagPx(g, o.x, o.y + 4); }
    else if (o.kind === 'focus' && o.target && o.target.alive > 0) {
      const t = o.target, off = -T * 15; g.globalAlpha = 0.7; const x0 = LX(sq.cx), y0 = LX(sq.cy), x1 = LX(t.cx), y1 = LX(t.cy), n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2)); for (let i = 0; i < n; i++) if (((i + Math.floor(off)) % 6 + 6) % 6 < 3) rect(g, Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1, RED);
      g.globalAlpha = 0.95; const r = 11 + (Math.sin(T * 6) > 0 ? 1 : 0); ring(g, t.cx, t.cy - 14, r + 1, r + 1, ICOL); ring(g, t.cx, t.cy - 14, r, r, RED); const X = LX(t.cx), Y = LX(t.cy - 14);
      for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + T; line(g, X + Math.round(Math.cos(a) * (r - 3)), Y + Math.round(Math.sin(a) * (r - 3)), X + Math.round(Math.cos(a) * (r + 3)), Y + Math.round(Math.sin(a) * (r + 3)), RED, 1); }
      g.globalAlpha = 1;
    } else if (o.kind === 'hold') flagPx(g, sq.cx + 30, sq.cy - 46);
  }
  g.restore();
}
// 날아가는 것들
export function pxProj(g, p, T) {
  g.save(); g.imageSmoothingEnabled = false;
  if (p.lob) {
    const sh = 1 - Math.min(0.6, (p.h || 0) / 160); g.globalAlpha = 0.35; fillEll(g, p.x, p.y, 8 * sh, 4.5 * sh, '#2a2036', 'check'); g.globalAlpha = 1;
    const yy = p.y - (p.h || 0) - 10, vx = (p.tx - p.sx) / p.dur, vy = (p.ty - p.sy) / p.dur - Math.cos(clamp(p.t / p.dur, 0, 1) * Math.PI) * 120, a = Math.atan2(vy, vx);
    if (p.kind === 'fireball' || p.kind === 'iceball') { const ice = p.kind === 'iceball', c = ice ? 0x8fd3e8 : 0xff9a2e; glowPx(g, p.x, yy, 26, c, 0.6); const X = LX(p.x), Y = LX(yy);
      for (let i = 1; i < 4; i++) rect(g, X - Math.round(Math.cos(a) * i * 3), Y - Math.round(Math.sin(a) * i * 3), 2, 2, ice ? (i < 2 ? '#d6eef6' : '#8fd3e8') : i < 2 ? '#ffd860' : i < 3 ? '#ff9a2e' : '#c8402f');
      blit(g, ballSpr(4, ice ? 0xbfe6f4 : 0xff9a2e, ice ? 0xffffff : 0xfff6c8), X, Y); if (!ice) { const f = Math.floor(T * 16) % 4; rect(g, X - 2 + f, Y - 5, 1, 1, '#ffd860'); } }
    else arrow(g, LX(p.x), LX(yy), a, 11, { fire: true, T });
  } else {
    const a = p.ang || 0, X = LX(p.x), Y = LX(p.y);
    if (p.kind === 'sunfire') { glowPx(g, p.x, p.y, 22, '#ffb040', 0.7); for (let i = 1; i < 4; i++) rect(g, X - Math.round(Math.cos(a) * i * 3), Y - Math.round(Math.sin(a) * i * 3), 4 - i, 4 - i, i < 2 ? '#ff9a2e' : '#e0503f'); blit(g, ballSpr(3, 0xf0a53a, 0xfbe08a), X, Y); }
    else if (p.kind === 'dark') { for (let i = 1; i < 3; i++) rect(g, X - Math.round(Math.cos(a) * i * 4), Y - Math.round(Math.sin(a) * i * 4), 2, 2, '#8fd3e8'); blit(g, ballSpr(3, 0x3d3560, 0xb8a0e0), X, Y); }
    else if (p.kind === 'note') { for (let i = 0; i < 3; i++) { g.globalAlpha = 0.95 - i * 0.28; const r = 2 + i; ring(g, p.x - Math.cos(a) * i * 7, p.y - Math.sin(a) * i * 7, r, r, i ? '#e2b24a' : '#fff3c0', { sweep: 1.8, a0: a - 0.9 }); } g.globalAlpha = 1; }
    else if (p.kind === 'stone') blit(g, rockSpr(1), X, Y);
    else if (p.kind === 'bullet') { g.globalAlpha = 0.6; line(g, X - Math.round(Math.cos(a) * 16), Y - Math.round(Math.sin(a) * 16), X, Y, '#fbf7ec', 1); g.globalAlpha = 1; rect(g, X - 1, Y - 1, 2, 2, '#3a3a44'); rect(g, X - 1, Y - 1, 1, 1, '#9aa2c0'); }
    else if (p.kind === 'spark') { const nx = -Math.sin(a), ny = Math.cos(a), pts = []; for (let i = 0; i <= 4; i++) { const d = i * 9, o = (i % 2 ? 1 : -1) * (i === 0 || i === 4 ? 0 : 5); pts.push(p.x - Math.cos(a) * d + nx * o, p.y - Math.sin(a) * d + ny * o); } polyline(g, pts, ICOL, 3); polyline(g, pts, '#b89cf0', 1); blit(g, ballSpr(1, 0xfffbe6, 0xffffff), X, Y); }
    else { if (p.kind === 'firearrow') glowPx(g, p.x, p.y, 16, '#ff9a2e', 0.6); arrow(g, X, Y, a, 11, { fire: p.kind === 'firearrow', T }); }
  }
  g.restore();
}
